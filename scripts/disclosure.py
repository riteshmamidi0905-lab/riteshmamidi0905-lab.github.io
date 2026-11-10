"""Disclosure rules for the public repository and for the publication artifact.

The public rules are stored as salted SHA-256 hashes (scripts/disclosure-rules.json), so this public source does not spell out the
private terms it protects. Text is split into identifier-like tokens (letters, digits, '_', '-', '.') and into words; every token,
every run of its separator-delimited parts and every window of up to three words is hashed and looked up. Matching is case-insensitive.

What this is, and is not:
  * It keeps private terms out of readable public source and lets CI detect them without any secret.
  * It is not secrecy: a short term can be recovered by guessing and hashing. Never put a credential or a long private value in a rule.
  * A failure names the rule id, the file and the line, never the matched text, because CI logs are public.

Optional maintainer rules (never committed) are read from the file named by PORTFOLIO_PRIVATE_RULES:
  {"literals": ["..."], "regexes": ["..."], "withheld_files": ["assets/img/..."]}
Fail-closed: if the variable is set, the file must exist, parse and define at least one rule; if REQUIRE_PRIVATE_RULES=1 and the
variable is unset the check fails. CI sets neither and runs the public hashed rules, which always run and cannot be skipped.

Adding a rule without writing the term in source:  python3 scripts/disclosure.py hash TERM [TERM ...]   (prints the hash to paste)
"""
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

SALT = "portfolio-disclosure-v1:"
RULES_PATH = Path(__file__).with_name("disclosure-rules.json")
MIN_PUBLIC_RULES = 10
KINDS = ("term", "prefix-digit", "phrase")
_TOKEN = re.compile(r"[A-Za-z0-9_.\-]+")
_SEP = re.compile(r"([_.\-])")
_TAGS = re.compile(r"<[^>]*>")
_WORD = re.compile(r"[^\s<>\"'()\[\]{},;:!?]+")
_HEX64 = re.compile(r"^[0-9a-f]{64}$")


# Which repository files the source scan covers. Exclusions are decided from REPOSITORY-RELATIVE paths only: the name of the directory the
# repository happens to be checked out into must never matter (GitHub runners check out under /home/runner/work/...).
TEXT_SUFFIX = (".html", ".js", ".css", ".json", ".py", ".cjs", ".sh", ".xml", ".yml", ".yaml", ".md", ".txt", ".svg", ".proposed")
SKIP_ANYWHERE = {"node_modules", ".git", "__pycache__"}        # directory names skipped at any depth
SKIP_TOP_LEVEL = {"work", "dist"}                               # build output, skipped only directly under the repository root
MIN_SOURCE_FILES = 40                                           # a floor far below today's count, far above an empty or truncated scan


class CoverageError(Exception):
    """The scan did not cover what it must. Callers must treat this as a failed check."""


def source_files(root):
    """Sorted repository-relative POSIX paths of every text file the source scan covers."""
    root, out = Path(root), []
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        rel_dir = Path(dirpath).relative_to(root)
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_ANYWHERE and not (rel_dir == Path(".") and d in SKIP_TOP_LEVEL))
        out += [(rel_dir / f).as_posix() for f in filenames if f.lower().endswith(TEXT_SUFFIX)]
    return sorted(out)


def expected_files(root):
    """Files that MUST be scanned, listed WITHOUT source_files(), so a bug in the enumeration cannot hide itself.
    Returns (set of relative paths, short description of where they came from)."""
    root, want, parts = Path(root), set(), []
    for manifest, label in (("release-files.json", "reviewed release files"), ("scripts/publish-manifest.json", "publication manifest")):
        try:
            data = json.loads((root / manifest).read_text(encoding="utf-8"))
            entries = data["files"] if isinstance(data, dict) else data
            got = {e["path"] for e in entries if e["path"].lower().endswith(TEXT_SUFFIX)}
        except (OSError, ValueError, KeyError, TypeError):
            raise CoverageError("%s unreadable: the required-file list cannot be built" % manifest)
        want |= got
        parts.append("%d %s" % (len(got), label))
    tool = {f for d in ("scripts", ".github/workflows") if (root / d).is_dir() for f in (d + "/" + n for n in os.listdir(root / d) if n.lower().endswith(TEXT_SUFFIX))}
    want |= tool
    parts.append("%d tooling files" % len(tool))
    if (root / ".git").exists():
        try:
            tracked = subprocess.run(["git", "ls-files", "-z"], cwd=root, capture_output=True, check=True).stdout.decode("utf-8").split("\0")
            tracked = {t for t in tracked if t and t.lower().endswith(TEXT_SUFFIX) and t.split("/")[0] not in SKIP_TOP_LEVEL and not (set(t.split("/")) & SKIP_ANYWHERE)}
            want |= tracked
            parts.append("%d git-tracked text files" % len(tracked))
        except (OSError, ValueError, subprocess.CalledProcessError):
            parts.append("git index unavailable")
    return want, ", ".join(parts)


def check_coverage(scanned, expected, minimum=MIN_SOURCE_FILES):
    """Raise CoverageError unless the scan was non-empty, above the floor, and included every expected file. Returns the number scanned."""
    scanned = set(scanned)
    if not scanned:
        raise CoverageError("the disclosure scan covered 0 files")
    if len(scanned) < minimum:
        raise CoverageError("the disclosure scan covered only %d files (floor %d)" % (len(scanned), minimum))
    missing = sorted(set(expected) - scanned)
    if missing:
        raise CoverageError("the disclosure scan skipped %d required file(s), first: %s" % (len(missing), ", ".join(missing[:5])))
    return len(scanned)


class RulesError(Exception):
    """The rules cannot be loaded or are unusable: callers must treat this as a failed check, never as 'no findings'."""


def digest(key):
    return hashlib.sha256((SALT + key.lower()).encode("utf-8")).hexdigest()


class Rules:
    def __init__(self, public, allow, private=None):
        self.term = {r["hash"]: r["id"] for r in public if r["kind"] == "term"}
        self.prefix_digit = {r["hash"]: r["id"] for r in public if r["kind"] == "prefix-digit"}
        self.phrase = {r["hash"]: r["id"] for r in public if r["kind"] == "phrase"}
        self.allow = {(a["rule"], a["path"]) for a in allow}
        self.public_count = len(public)
        self.private = private

    def private_summary(self):
        if not self.private:
            return "public hashed rules only"
        return "public hashed rules + %d private literal(s), %d private regex(es), %d withheld file(s)" % (
            len(self.private["literals"]), len(self.private["regexes"]), len(self.private["withheld_files"]))


def load(require_private=None):
    """Load the public hashed rules and, when configured, the private rules. Raises RulesError on any problem."""
    try:
        data = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RulesError("public disclosure rules unreadable: %s" % type(exc).__name__)
    if not isinstance(data, dict) or data.get("version") != 1 or not isinstance(data.get("rules"), list):
        raise RulesError("public disclosure rules malformed")
    rules, seen = data["rules"], set()
    if len(rules) < MIN_PUBLIC_RULES:
        raise RulesError("public disclosure rules incomplete: %d rule(s), expected at least %d" % (len(rules), MIN_PUBLIC_RULES))
    for r in rules:
        if not (isinstance(r, dict) and r.get("kind") in KINDS and isinstance(r.get("id"), str) and _HEX64.match(str(r.get("hash", "")))):
            raise RulesError("public disclosure rule malformed")
        if r["id"] in seen:
            raise RulesError("duplicate disclosure rule id")
        seen.add(r["id"])
    allow = data.get("allow", [])
    if not all(isinstance(a, dict) and a.get("rule") in seen and isinstance(a.get("path"), str) for a in allow):
        raise RulesError("disclosure allow-list malformed")
    private = None
    path = os.environ.get("PORTFOLIO_PRIVATE_RULES")
    if require_private is None:
        require_private = os.environ.get("REQUIRE_PRIVATE_RULES") == "1"
    if path:
        try:
            raw = json.loads(Path(path).read_text(encoding="utf-8"))
            private = {"literals": [str(x) for x in raw.get("literals", [])], "regexes": [re.compile(str(x)) for x in raw.get("regexes", [])],
                       "withheld_files": [str(x) for x in raw.get("withheld_files", [])]}
        except (OSError, ValueError, re.error, AttributeError) as exc:
            raise RulesError("private disclosure rules configured but unusable: %s" % type(exc).__name__)
        if not (private["literals"] or private["regexes"] or private["withheld_files"]):
            raise RulesError("private disclosure rules configured but empty")
    elif require_private:
        raise RulesError("private disclosure rules required (REQUIRE_PRIVATE_RULES=1) but PORTFOLIO_PRIVATE_RULES is not set")
    return Rules(rules, allow, private)


def _runs(token):
    """Yield (key, next_part_starts_with_digit) for every run of separator-delimited parts of a token, with and without the
    separators that surround the run."""
    pieces = _SEP.split(token.lower().strip("."))
    parts, seps = pieces[0::2], pieces[1::2]
    k = len(parts)
    for i in range(k):
        for j in range(i, k):
            core = parts[i]
            for m in range(i, j):
                core += seps[m] + parts[m + 1]
            lead = seps[i - 1] if i > 0 else ""
            trail = seps[j] if j < k - 1 else ""
            nxt = j < k - 1 and parts[j + 1][:1].isdigit()
            yield core, False
            if lead:
                yield lead + core, False
            if trail:
                yield core + trail, nxt
                if lead:
                    yield lead + core + trail, nxt


def scan(rules, text, rel=""):
    """Return a list of {'rule': id, 'line': n} findings for one text. Never returns the matched text."""
    found = []
    for m in _TOKEN.finditer(text):
        line = None
        for key, nxt_digit in _runs(m.group(0)):
            h = digest(key)
            rid = rules.term.get(h) or (rules.prefix_digit.get(h) if nxt_digit else None)
            if rid and (rid, rel) not in rules.allow:
                line = line or text.count("\n", 0, m.start()) + 1
                found.append({"rule": rid, "line": line})
    plain = _TAGS.sub(lambda t: " " * len(t.group(0)), text)
    words = [(w.group(0).lower().strip("."), w.start()) for w in _WORD.finditer(plain)]
    for n in (2, 3):
        for i in range(len(words) - n + 1):
            rid = rules.phrase.get(digest(" ".join(w for w, _ in words[i:i + n])))
            if rid and (rid, rel) not in rules.allow:
                found.append({"rule": rid, "line": plain.count("\n", 0, words[i][1]) + 1})
    if rules.private:
        low = text.lower()
        for idx, lit in enumerate(rules.private["literals"]):
            pos = low.find(lit.lower())
            if lit and pos >= 0:
                found.append({"rule": "private-literal-%d" % (idx + 1), "line": text.count("\n", 0, pos) + 1})
        for idx, rx in enumerate(rules.private["regexes"]):
            m2 = rx.search(text)
            if m2:
                found.append({"rule": "private-regex-%d" % (idx + 1), "line": text.count("\n", 0, m2.start()) + 1})
    uniq, out = set(), []
    for f in found:
        k = (f["rule"], f["line"])
        if k not in uniq:
            uniq.add(k)
            out.append(f)
    return out


def check_files(rules, root, rels, label="file"):
    """Scan text files under root. Returns a list of problems ('rel:line rule', or an unreadable file); empty means clean."""
    problems = []
    for rel in rels:
        p = Path(root) / rel
        try:
            text = p.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            problems.append("%s: could not be read as UTF-8 text, so it could not be scanned" % rel)       # never skip silently
            continue
        for f in scan(rules, text, rel):
            problems.append("%s:%d disclosure rule %s" % (rel, f["line"], f["rule"]))
    if rules.private:
        for rel in rules.private["withheld_files"]:
            if (Path(root) / rel).exists():
                problems.append("%s: withheld %s is present" % (rel, label))
    return problems


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3 and sys.argv[1] == "hash":
        for t in sys.argv[2:]:
            print(digest(t), "<-", len(t), "chars")
    else:
        print(__doc__)
