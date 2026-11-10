#!/usr/bin/env python3
"""Tests for the rollback request validation step "The commit was released from main" in .github/workflows/rollback.yml.

The REAL step script is extracted from the workflow (parsed as YAML) and run with bash -e against a fake `gh` that reproduces the messages and exit codes of the GitHub CLI:
a commit that exists on main's history (compare status "ahead"), is main itself ("identical"), is not an ancestor ("behind", "diverged"), does not exist (HTTP 404), or cannot be
checked because of an API, authentication, rate-limit or network failure (HTTP 401/403/500/502 or no connection), plus malformed answers. Each scenario must be refused with the
right diagnosis: a missing commit must say so, an API failure must NOT be reported as a missing commit, and nothing but "ahead" may pass.

To prove the tests are not vacuous, the same scenarios run against deliberately unsafe versions of the step (the old one with the raw 404, one that blames every failure on a missing
commit, one that ignores API failures, one that accepts any answer, one that passes a diverged commit, one that lets an empty status through); each must fail at least one scenario.
Run:  python3 scripts/test-rollback-guard.py"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import workflow_rules as W

STEP = "The commit was released from main"
SHA = "50580ceeee838716701880e29e8734c4682ec08e"
FAKE_GH = r'''#!/bin/bash
# fake gh: behaviour chosen by $FAKE_MODE
case "$FAKE_MODE" in
  ahead|identical|behind|diverged) echo "$FAKE_MODE" ;;
  empty) ;;
  garbage) echo "<html>maintenance</html>" ;;
  notfound) echo "gh: Not Found (HTTP 404)" >&2; exit 1 ;;
  unauth) echo "gh: Bad credentials (HTTP 401)" >&2; exit 1 ;;
  forbidden) echo "gh: Resource not accessible by integration (HTTP 403)" >&2; exit 1 ;;
  ratelimit) echo "gh: API rate limit exceeded (HTTP 403)" >&2; exit 1 ;;
  server) echo "gh: Bad Gateway (HTTP 502)" >&2; exit 1 ;;
  network) echo "error connecting to api.github.com" >&2; exit 1 ;;
  silentfail) exit 1 ;;
esac
'''
# mode -> (must pass?, text that must appear, text that must not appear)
SCENARIOS = {
    "ahead":      (True,  None, "REFUSED"),
    "identical":  (False, "current main", "not found"),
    "behind":     (False, "not an ancestor", "no commit"),
    "diverged":   (False, "not an ancestor", "no commit"),
    "notfound":   (False, "no commit", "API call failed"),
    "unauth":     (False, "API call failed", "no commit"),
    "forbidden":  (False, "API call failed", "no commit"),
    "ratelimit":  (False, "API call failed", "no commit"),
    "server":     (False, "API call failed", "no commit"),
    "network":    (False, "API call failed", "no commit"),
    "silentfail": (False, "API call failed", "no commit"),
    "empty":      (False, "unexpected compare status", "no commit"),
    "garbage":    (False, "unexpected compare status", "no commit"),
}


def real_script():
    wf = W.parse(ROOT / ".github" / "workflows" / "rollback.yml")
    for st in wf["jobs"]["guard"]["steps"]:
        if st.get("name") == STEP:
            return st["run"]
    raise SystemExit("the rollback guard has no step named %r" % STEP)


def run(script, mode):
    with tempfile.TemporaryDirectory() as td:
        bindir = Path(td) / "bin"
        bindir.mkdir()
        (bindir / "gh").write_text(FAKE_GH)
        (bindir / "gh").chmod(0o755)
        env = {"PATH": "%s:/usr/bin:/bin" % bindir, "FAKE_MODE": mode, "RUNNER_TEMP": td, "GITHUB_REPOSITORY": "owner/repo", "SHA": SHA, "GH_TOKEN": "x"}
        r = subprocess.run(["bash", "-e", "-c", script], env=env, capture_output=True, text=True, timeout=30)
        return r.returncode, (r.stdout + r.stderr)


def failures(script):
    bad = []
    for mode, (passes, want, forbid) in SCENARIOS.items():
        code, out = run(script, mode)
        low = out.lower()
        if passes:
            if code != 0:
                bad.append("%s: an eligible commit was refused: %s" % (mode, out.strip()[:100]))
            continue
        if code == 0:
            bad.append("%s: PASSED but must be refused" % mode)
        elif "refused" not in low:
            bad.append("%s: refused without a clear REFUSED message: %r" % (mode, out.strip()[:100]))
        elif want and want.lower() not in low:
            bad.append("%s: message lacks %r: %r" % (mode, want, out.strip()[:120]))
        elif forbid and forbid.lower() in low:
            bad.append("%s: message wrongly says %r: %r" % (mode, forbid, out.strip()[:120]))
    return bad


def unsafe_variants(good):
    old = '''status=$(gh api "repos/$GITHUB_REPOSITORY/compare/$SHA...main" -q .status)
[ "$status" = "ahead" ] || { echo "that commit is not an ancestor of main (compare status: $status)"; exit 1; }
'''
    blame_all = good.replace('if grep -q "HTTP 404" "$err"; then', 'if true; then')
    ignore_api = good.replace('if [ "$rc" -ne 0 ]; then', 'if false; then')
    accept_any = good.replace("ahead) ;;", "ahead | behind | diverged | identical | *) ;;")
    diverged_ok = good.replace("behind | diverged) echo", "behind) echo").replace("ahead) ;;", "ahead | diverged) ;;")
    empty_ok = good.replace("*) echo \"REFUSED: unexpected", "'') ;;\n  *) echo \"REFUSED: unexpected")
    return {"the old step (raw 404, no diagnosis)": old, "every failure blamed on a missing commit": blame_all, "API failures ignored": ignore_api,
            "any answer accepted": accept_any, "a diverged commit accepted": diverged_ok, "an empty status accepted": empty_ok}


def main():
    good = real_script()
    n = 0
    bad = failures(good)
    for b in bad:
        print("FAIL (real step):", b)
    n += len(SCENARIOS)
    for label, script in unsafe_variants(good).items():
        assert script != good, "the unsafe variant %r did not change the step" % label
        caught = failures(script)
        if not caught:
            print("FAIL: the unsafe variant %r passes every scenario, so the tests do not guard against it" % label)
            bad.append(label)
        n += 1
    if bad:
        sys.exit(1)
    print("rollback guard: %d checks passed (%d scenarios against the real step; %d unsafe variants proven to be caught)" % (n, len(SCENARIOS), len(unsafe_variants(good))))


if __name__ == "__main__":
    main()
