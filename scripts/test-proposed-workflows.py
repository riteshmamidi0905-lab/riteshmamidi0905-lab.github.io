#!/usr/bin/env python3
"""Safety lint for the PROPOSED (not installed) deployment and rollback workflows in scripts/proposed-workflows/.
It is a text-level check, not a YAML engine: it fails if a property the deployment design depends on is removed. Run: python3 scripts/test-proposed-workflows.py"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIR = HERE / "proposed-workflows"
PINS = {"actions/checkout": "11d5960a326750d5838078e36cf38b85af677262", "actions/setup-node": "49933ea5288caeca8642d1e84afbd3f7d6820020",
        "actions/upload-pages-artifact": "56afc609e74202658d3ffba0e8f6dda462b719fa", "actions/deploy-pages": "d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e"}
checks = 0


def ok(cond, name):
    global checks
    assert cond, "FAILED: " + name
    checks += 1


def strip_comments(t):
    return "\n".join(re.sub(r"\s+#.*$", "", l) if not l.lstrip().startswith("#") else "" for l in t.split("\n"))


def jobs(text):
    """{job name: job text} from the 'jobs:' block (jobs sit at two-space indentation)."""
    body = text.split("\njobs:\n", 1)[1]
    parts = re.split(r"\n  ([A-Za-z0-9_-]+):\n", "\n" + body)
    return {parts[i]: parts[i + 1] for i in range(1, len(parts) - 1, 2)}


for name in ("pages.yml.proposed", "rollback.yml.proposed"):
    raw = (DIR / name).read_text(encoding="utf-8")
    t = strip_comments(raw)
    J = jobs(t)
    ok(not (DIR.parent.parent / ".github" / "workflows" / name.replace(".proposed", "")).exists(), name + " is not installed in .github/workflows")
    for trig in ("pull_request", "pull_request_target", "workflow_run", "schedule", "issue_comment", "repository_dispatch"):
        ok(trig not in t, "%s has no %s trigger (a pull request or comment can never deploy)" % (name, trig))
    ok(re.search(r"^permissions: \{\}$", t, re.M), name + " starts from empty permissions")
    ok("secrets." not in t and "pull-requests: write" not in t and "contents: write" not in t and "actions: write" not in t, name + " uses no secrets and requests no broad write permission")
    uses = re.findall(r"uses:\s*(\S+)", t)
    ok(uses and all("@" in u and u.split("@")[0] in PINS and u.split("@")[1] == PINS[u.split("@")[0]] for u in uses), name + ": every action is pinned to the verified commit SHA")
    ok(all(re.search(r"^\s+if: .*github\.ref == 'refs/heads/main'", j, re.M) for j in J.values()), name + ": every job requires refs/heads/main")
    writers = [n for n, j in J.items() if re.search(r"(pages|id-token): write", j)]
    ok(writers == ["deploy"], name + ": only the deploy job can write to Pages (found %s)" % writers)
    ok("environment:" in J["deploy"] and "name: github-pages" in J["deploy"], name + ": deploy runs in the restricted github-pages environment")
    ok(all(re.search(r"permissions:\n\s+(contents|pages|deployments): read", j) or "pages: write" in j for j in J.values()), name + ": every job declares its own minimal permissions")
    ok('build_type' in t and '"workflow"' in t, name + ": checks that Pages is artifact-deployed (no legacy root publication)")
    ok("verify-live-site.py" in J["verify-live"] and "--manifest" in J["verify-live"], name + ": verifies the live site against an explicit manifest")
    ok("concurrency:" in t and "group: pages-production" in t and "cancel-in-progress: false" in t, name + ": deploys and rollbacks share one non-cancelling queue")
    ok("upload-pages-artifact" in t and ("path: dist" in t or "path: release/dist" in t), name + ": deploys only the dist/ artifact")
    ok(not re.search(r"path:\s*(\.|\./|/)\s*$", t, re.M), name + ": never uploads the repository root")
    ok(not any("${{ inputs." in blk for blk in re.findall(r"run: \|\n((?:\s{10,}.*\n)+)", t + "\n")) and not re.search(r"run: [^|\n]*\$\{\{ inputs\.", t), name + ": workflow inputs never appear inside a run script (no script injection)")

p = strip_comments((DIR / "pages.yml.proposed").read_text(encoding="utf-8"))
ok(re.search(r"on:\n  push:\n    branches: \[main\]", p) and "workflow_dispatch" in p, "pages: triggers are exactly a push to main plus a manual run")
ok("npm run build:pages" in p and "npm run build && npm test" in p and "npm audit" in p, "pages: validates the source and builds and verifies the artifact before deploying")
ok("retention-days: 90" in p and "tree_digest" in p and "GITHUB_STEP_SUMMARY" in p, "pages: records the commit and tree digest a rollback needs and keeps the artifact 90 days")
ok(re.search(r"needs: \[build, deploy\]", p), "pages: post-deployment verification runs after the deploy")

r = strip_comments((DIR / "rollback.yml.proposed").read_text(encoding="utf-8"))
RJ = jobs(r)
ok("workflow_dispatch:" in r and "release_sha" in r and "expected_tree_digest" in r, "rollback: manual only, with the exact commit and the recorded digest as inputs")
ok("[0-9a-f]{40}" in RJ["guard"] and "[0-9a-f]{64}" in RJ["guard"], "rollback: inputs must be a full commit SHA and a full digest (no branch names)")
ok('[ "$SHA" != "$GITHUB_SHA" ]' in RJ["guard"], "rollback: refuses to 'roll back' to the current main")
ok("deployments?environment=github-pages" in RJ["guard"] and '"success"' in RJ["guard"], "rollback: the target must have a recorded successful production deployment")
rb = RJ["rebuild-exact-release"]
ok("ref: ${{ inputs.release_sha }}" in rb and "path: release" in rb, "rollback: builds from a checkout of the requested commit, in its own directory")
ok('git rev-parse HEAD' in rb and "merge-base --is-ancestor" in rb, "rollback: proves the checkout is the requested commit and that it was released from main")
ok(rb.count("working-directory: release") >= 5 and "ref: main" not in r and "git checkout main" not in r, "rollback: every build step runs in the release checkout; nothing checks out the current main for building")
ok('[ "$d" = "$EXPECTED" ]' in rb and "refusing to deploy" in rb, "rollback: the rebuilt tree digest must equal the recorded digest or nothing is deployed")
rv = RJ["verify-live"]
ok("ref: ${{ inputs.release_sha }}" in rv and "--manifest release/scripts/publish-manifest.json" in rv, "rollback: the live site is compared with the RESTORED release's manifest")
ok("path: tools" in rv and "tools/scripts/verify-live-site.py" in rv, "rollback: the verifier comes from main so it exists even for an older release")
ok(not re.search(r"\bpages\b.*\bPUT\b|build_type.*legacy|source:\s*branch", r), "rollback: nothing changes Pages settings or switches back to branch publication")

print("proposed workflows: %d checks passed" % checks)
