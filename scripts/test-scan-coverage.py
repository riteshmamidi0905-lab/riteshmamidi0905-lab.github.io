#!/usr/bin/env python3
"""Regression and negative tests for the source disclosure scan (scripts/disclosure.py, run by scripts/validate-release.py).

The defect these tests pin: the directory filter once looked at ABSOLUTE path components, and GitHub runners check the repository out under
/home/runner/work/..., so every file was skipped and the scan passed while covering 0 files. The scan must (1) look at repository-relative paths
only, (2) fail when it covers nothing or skips a required file, (3) never skip an unreadable file silently, and (4) still fail on prohibited text
without ever printing that text. Sensitive samples are built from character codes. Run:  python3 scripts/test-scan-coverage.py"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import disclosure as D

dec = lambda *c: "".join(map(chr, c))
checks = 0


def ok(cond, name):
    global checks
    assert cond, "FAILED: " + name
    checks += 1


def raises(fn, exc, name):
    try:
        fn()
    except exc:
        ok(True, name)
        return
    ok(False, name)


def checkout(dest, with_git=False):
    """A copy of the working tree at dest (so dest can be given any path), without build output or caches."""
    shutil.copytree(ROOT, dest, ignore=shutil.ignore_patterns("node_modules", ".git", "dist", "__pycache__", "work"))
    if with_git:
        env = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t", GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@t")
        subprocess.run(["git", "init", "-q"], cwd=dest, check=True, env=env)
        subprocess.run(["git", "add", "-A"], cwd=dest, check=True, env=env)


def validate(dest):
    r = subprocess.run([sys.executable, str(Path(dest) / "scripts" / "validate-release.py")], capture_output=True, text=True, cwd=dest)
    return r.returncode, r.stdout + r.stderr


def count(out):
    m = re.search(r"disclosure scan: (\d+) text files scanned", out)
    return int(m.group(1)) if m else None


# --- the old defect, reproduced as arithmetic, then the fix under the same conditions
here = D.source_files(ROOT)
ok(len(here) >= D.MIN_SOURCE_FILES, "the real repository scan covers %d files (floor %d)" % (len(here), D.MIN_SOURCE_FILES))
old_filter = lambda root: [p for p in Path(root).rglob("*") if p.is_file() and p.suffix in D.TEXT_SUFFIX and not any(x in p.parts for x in ("node_modules", ".git", "work", "dist", "__pycache__"))]
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    runner_like, plain = td / "home" / "runner" / "work" / "repo" / "repo", td / "home" / "dev" / "portfolio" / "repo"
    checkout(runner_like, with_git=True)
    checkout(plain, with_git=True)
    ok(len(old_filter(runner_like)) == 0 and len(old_filter(plain)) > 0, "the old absolute-path filter scanned 0 files under a runner-style path (the defect)")
    a, b = D.source_files(runner_like), D.source_files(plain)
    ok(a == b == here and len(a) > 0, "the fixed enumeration is identical under a runner-style path, a plain path and the repository itself (%d files)" % len(a))
    ok(all(not p.startswith(("work/", "dist/", "node_modules/", ".git/")) and "__pycache__" not in p for p in a), "exclusions apply to relative paths only")
    ok(len(a) > 0 and any(p == ".github/workflows/validate.yml" for p in a) and any(p.startswith("recovered/") for p in a), "hidden directories and recovered/ are covered")

    # --- the real validator, run from the runner-style checkout
    code, out = validate(runner_like)
    n = count(out)
    ok(code == 0 and n == len(a) and n >= D.MIN_SOURCE_FILES, "the validator passes from a path containing 'work' and reports %s scanned files" % n)
    ok("every required file covered" in out, "the validator reports the coverage check")
    code2, out2 = validate(plain)
    ok(code2 == 0 and count(out2) == n, "the validator reports the same count from a plain path")

    # --- negative tests: prohibited identifiers fail the validation, with a rule id and a line, never the text
    samples = {"programme identifier": dec(77, 45, 79, 80, 83, 45, 51), "status word": "x_" + dec(78, 79, 95, 71, 79) + "_y", "private repository": "see " + dec(73, 78, 68, 79, 45, 77, 69, 88, 45, 66, 82, 69, 87, 69, 82, 89),
               "phrase": dec(67, 108, 111, 117, 100) + " " + dec(115, 109, 111, 107, 101), "variable name": dec(78, 65, 83, 72, 65, 95, 80, 82, 73, 86, 65, 84, 69, 95, 68, 73, 82)}
    for label, text in samples.items():
        for rel in ("scripts/notes.py", "scripts/RELEASE-CHECKS.md", ".github/workflows/validate.yml"):
            tgt = runner_like / rel
            before = tgt.read_text(encoding="utf-8") if tgt.exists() else None
            tgt.write_text((before or "") + "\n# " + text + "\n", encoding="utf-8")
            code, out = validate(runner_like)
            rid = re.search(r"%s:\d+ disclosure rule D\d+" % re.escape(rel), out)
            ok(code != 0 and rid is not None, "prohibited %s in %s fails the validator and names the file, line and rule" % (label, rel))
            ok(text not in out and text.lower() not in out.lower(), "the failure output never echoes the %s" % label)
            if before is None:
                tgt.unlink()
            else:
                tgt.write_text(before, encoding="utf-8")
    code, out = validate(runner_like)
    ok(code == 0, "the checkout passes again after the negative cases are reverted")

    # --- a file that cannot be read is never skipped silently
    (runner_like / "scripts" / "unreadable.py").write_bytes(b"\xff\xfe\x00bad")
    code, out = validate(runner_like)
    ok(code != 0 and "could not be read as UTF-8 text" in out and "scripts/unreadable.py" in out, "an undecodable source file fails the validator instead of being skipped")
    (runner_like / "scripts" / "unreadable.py").unlink()

    # --- an enumeration that silently drops a required file is caught, with and without the git cross-check
    dropped = [p for p in a if p != "scripts/disclosure.py"]
    raises(lambda: D.check_coverage(dropped, D.expected_files(runner_like)[0]), D.CoverageError, "a scan that skips a required tooling file fails the coverage check")
    raises(lambda: D.check_coverage([p for p in a if p != "index.html"], D.expected_files(runner_like)[0]), D.CoverageError, "a scan that skips a reviewed page fails the coverage check")
    (runner_like / "scripts" / "added-later.py").write_text("print(1)\n")
    subprocess.run(["git", "add", "-A"], cwd=runner_like, check=True)
    raises(lambda: D.check_coverage(a, D.expected_files(runner_like)[0]), D.CoverageError, "a tracked file the enumeration did not return fails the coverage check")

# --- the coverage function itself
raises(lambda: D.check_coverage([], set()), D.CoverageError, "zero files scanned fails, even when nothing was expected")
raises(lambda: D.check_coverage([], {"a.py"}), D.CoverageError, "zero files scanned fails when files were expected")
raises(lambda: D.check_coverage(["a.py"] * 3, set(), minimum=5), D.CoverageError, "a scan below the floor fails")
raises(lambda: D.check_coverage(["a.py", "b.py"], {"a.py", "b.py", "c.py"}, minimum=1), D.CoverageError, "a missing required file fails")
ok(D.check_coverage(["a.py", "b.py", "c.py"], {"a.py", "b.py"}, minimum=1) == 3, "extra scanned files are fine; the count is returned")
with tempfile.TemporaryDirectory() as td:
    raises(lambda: D.expected_files(td), D.CoverageError, "an unreadable manifest fails closed instead of producing an empty expectation")

print("source scan coverage: %d checks passed (%d files scanned in the real repository)" % (checks, len(here)))
