"""Shared policy for the GitHub Pages publication artifact.

Two different questions are answered by two different manifests, on purpose:
  * release-files.json   SOURCE validation: the reviewed, hash-pinned files that make up the website (scripts/validate-release.py).
  * scripts/publish-manifest.json   PUBLICATION: the exact allowlist of files that may appear in the deployed artifact.
The builder (build-pages-artifact.py) copies only what the publication manifest lists; the verifier (verify-pages-artifact.py) re-checks an
output directory against it independently. Nothing in the source tree is published unless it is listed, hashed and passes this policy.
"""
import hashlib
import json
import os
import re
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "scripts" / "publish-manifest.json"
RELEASE_PATH = ROOT / "release-files.json"
EXTRA_FILES = {".nojekyll": 0}            # published although not hash-pinned in release-files.json: path -> required size in bytes
DENY_PARTS = {"scripts", "node_modules", ".github", ".git", "work", "review", "dist", "tests", "__pycache__", "pending-assets", "private"}
DENY_NAMES = {"package.json", "package-lock.json", "release-files.json", "publish-manifest.json", "disclosure-rules.json", "README.md", ".gitignore", ".gitattributes"}
DENY_SUFFIX = (".py", ".cjs", ".mjs", ".sh", ".map", ".log", ".bak", ".orig", ".env", ".pem", ".key", ".yml", ".yaml", ".ts", ".ipynb", ".zip", ".mp4", ".webm", ".mov")
DENY_SUBSTR = ("selftest", ".private", ".local", "secret", "credential")
ALLOWED_SUFFIX = {".html", ".css", ".js", ".json", ".xml", ".txt", ".svg", ".pdf", ".woff2", ".jpg", ".png", ".webp", ".md"}
MD_ONLY_UNDER = ("recovered/",)           # the one pre-existing published document type that is not a page; everywhere else .md is documentation
EXCLUDED_URLS = ("/scripts/validate-release.py", "/scripts/selftest-lab.html", "/scripts/selftest-overflow.html", "/package.json", "/package-lock.json",
                 "/release-files.json", "/README.md", "/.gitignore", "/.github/workflows/validate.yml", "/scripts/disclosure-rules.json", "/scripts/publish-manifest.json", "/scripts/verify-live-site.py", "/scripts/RELEASE-CHECKS.md", "/scripts/disclosure.py", "/scripts/pages_policy.py")
_HEX64 = re.compile(r"^[0-9a-f]{64}$")


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def path_errors(rel):
    """Why a path may never be published (an empty list means it passes the policy)."""
    if not isinstance(rel, str) or not rel:
        return ["empty or non-string path"]
    errs = []
    if "\\" in rel or rel.startswith("/") or PurePosixPath(rel).as_posix() != rel or any(p in ("", ".", "..") for p in rel.split("/")):
        errs.append("%s: not a normalised relative path" % rel)
        return errs
    parts = rel.split("/")
    low = rel.lower()
    name = parts[-1]
    if name in EXTRA_FILES:
        return errs
    if any(p in DENY_PARTS for p in parts[:-1]):
        errs.append("%s: lives in a directory that is never published" % rel)
    if name in DENY_NAMES:
        errs.append("%s: development or configuration file" % rel)
    if low.endswith(DENY_SUFFIX):
        errs.append("%s: tooling, source or secret-like file type" % rel)
    if any(s in low for s in DENY_SUBSTR):
        errs.append("%s: name marks it as a self-test, private or secret file" % rel)
    if name.startswith("."):
        errs.append("%s: hidden file" % rel)
    suffix = PurePosixPath(rel).suffix.lower()
    if suffix not in ALLOWED_SUFFIX:
        errs.append("%s: file type %r is not publishable" % (rel, suffix))
    elif suffix == ".md" and not rel.startswith(MD_ONLY_UNDER):
        errs.append("%s: markdown is documentation, not site content" % rel)
    return errs


def load_release(path=RELEASE_PATH):
    items = json.loads(Path(path).read_text(encoding="utf-8"))
    return {i["path"]: {"bytes": i["bytes"], "sha256": i["sha256"]} for i in items}


def load_manifest(path=MANIFEST_PATH):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def manifest_errors(manifest, release, root=ROOT):
    """Check a publication manifest against the reviewed release pins and the source files. Returns a list of problems."""
    errs = []
    if not isinstance(manifest, dict) or manifest.get("version") != 1 or not isinstance(manifest.get("files"), list):
        return ["publication manifest malformed (expected version 1 and a files list)"]
    entries = manifest["files"]
    paths = [e.get("path") if isinstance(e, dict) else None for e in entries]
    if paths != sorted(p for p in paths if isinstance(p, str)) or len(set(paths)) != len(paths):
        errs.append("publication manifest paths must be unique and sorted")
    published = set()
    for e in entries:
        if not isinstance(e, dict) or not isinstance(e.get("path"), str):
            errs.append("publication manifest entry malformed")
            continue
        rel = e["path"]
        published.add(rel)
        errs += path_errors(rel)
        if not isinstance(e.get("bytes"), int) or not _HEX64.match(str(e.get("sha256", ""))):
            errs.append("%s: bytes or sha256 malformed" % rel)
            continue
        if rel not in release and rel not in EXTRA_FILES:
            errs.append("%s: listed for publication but not a reviewed release file" % rel)
        if rel in release and (release[rel]["bytes"] != e["bytes"] or release[rel]["sha256"] != e["sha256"]):
            errs.append("%s: differs from the reviewed pin in release-files.json" % rel)
        if rel in EXTRA_FILES and e["bytes"] != EXTRA_FILES[rel]:
            errs.append("%s: must be %d bytes" % (rel, EXTRA_FILES[rel]))
        src = Path(root) / rel
        if src.is_symlink() or not src.is_file():
            errs.append("%s: source is missing, a symlink or not a regular file" % rel)
        else:
            b = src.read_bytes()
            if len(b) != e["bytes"] or sha256_bytes(b) != e["sha256"]:
                errs.append("%s: source file differs from the publication manifest" % rel)
    for rel in sorted(set(release) - published):
        errs.append("%s: reviewed release file missing from the publication manifest" % rel)
    return errs


def derive_manifest(release, root=ROOT):
    files = [{"path": p, "bytes": v["bytes"], "sha256": v["sha256"]} for p, v in release.items()]
    for p in EXTRA_FILES:
        b = (Path(root) / p).read_bytes()
        files.append({"path": p, "bytes": len(b), "sha256": sha256_bytes(b)})
    files.sort(key=lambda e: e["path"])
    return {"version": 1, "description": "Exact allowlist of files published to GitHub Pages. Regenerate with: python3 scripts/build-pages-artifact.py --write-manifest", "files": files}


def inventory(directory):
    """Every entry under directory: {relative path: (bytes, sha256)} plus errors for symlinks, empty directories and special files."""
    inv, errs = {}, []
    base = Path(directory)
    for dirpath, dirnames, filenames in os.walk(base, followlinks=False):
        dp = Path(dirpath)
        for d in list(dirnames):
            if (dp / d).is_symlink():
                errs.append("%s: symbolic link" % (dp / d).relative_to(base).as_posix())
                dirnames.remove(d)
        if not filenames and not dirnames and dp != base:
            errs.append("%s: empty directory" % dp.relative_to(base).as_posix())
        for f in filenames:
            p = dp / f
            rel = p.relative_to(base).as_posix()
            if p.is_symlink() or not p.is_file():
                errs.append("%s: symbolic link or special file" % rel)
                continue
            b = p.read_bytes()
            inv[rel] = (len(b), sha256_bytes(b))
    return inv, errs


def compare(inv, manifest):
    """Differences between an inventory and the publication manifest. Empty means they agree exactly."""
    want = {e["path"]: (e["bytes"], e["sha256"]) for e in manifest["files"]}
    errs = []
    for rel in sorted(set(inv) - set(want)):
        errs.append("%s: present in the output but not in the publication manifest" % rel)
    for rel in sorted(set(want) - set(inv)):
        errs.append("%s: in the publication manifest but missing from the output" % rel)
    for rel in sorted(set(inv) & set(want)):
        if inv[rel] != want[rel]:
            errs.append("%s: content differs from the publication manifest" % rel)
        errs += path_errors(rel)
    return errs


def tree_digest(inv):
    """One hash for the whole artifact: identical inputs give an identical value on every machine."""
    return sha256_bytes("".join("%s\t%s\n" % (p, inv[p][1]) for p in sorted(inv)).encode("utf-8"))
