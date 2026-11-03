#!/usr/bin/env python3
"""Safety tests for the GitHub Actions workflows, in particular the production deployment (pages.yml) and rollback (rollback.yml).

The real files in .github/workflows/ are parsed with a real YAML parser (Ruby's Psych, run as a subprocess: the GitHub runner image documents Ruby and no
PyYAML; if Ruby is missing the test FAILS, it never skips), and the rules below are checked against the parsed structure. Each rule is then proven to bite:
unsafe variants of the parsed workflows (a pull_request trigger, an unpinned action, a write permission outside the deploy job, a rollback that checks out
main, ...) are generated and every one must be reported. Run:  python3 scripts/test-workflows.py"""
import copy
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WF = ROOT / ".github" / "workflows"
SITE_REPO = "riteshmamidi0905-lab/riteshmamidi0905-lab.github.io"
ALLOWED_FILES = {"validate.yml", "pages.yml", "rollback.yml"}
MAIN_ONLY = "github.ref == 'refs/heads/main'"
PINS = {"actions/checkout": "11d5960a326750d5838078e36cf38b85af677262", "actions/setup-node": "49933ea5288caeca8642d1e84afbd3f7d6820020",
        "actions/upload-pages-artifact": "56afc609e74202658d3ffba0e8f6dda462b719fa", "actions/deploy-pages": "d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e"}
FORBIDDEN_TRIGGERS = {"pull_request", "pull_request_target", "workflow_run", "schedule", "issue_comment", "issues", "repository_dispatch", "release", "create", "delete", "fork",
                      "pull_request_review", "pull_request_review_comment", "watch", "page_build", "deployment", "deployment_status", "status", "check_run", "check_suite"}
checks = 0
unsafe_variants = 0


def ok(cond, name):
    global checks
    assert cond, "FAILED: " + name
    checks += 1


def parse(path):
    """Parse one workflow file with a real YAML parser. YAML 1.1 reads the key `on` as boolean true, which is normalised back."""
    if shutil.which("ruby") is None:
        raise SystemExit("FAILED: ruby is required to parse workflow YAML and was not found (this test never skips)")
    r = subprocess.run(["ruby", "-ryaml", "-rjson", "-e", "puts JSON.generate(YAML.load_file(ARGV[0]))", str(path)], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("FAILED: %s is not valid YAML: %s" % (path, r.stderr.strip()[:200]))
    d = json.loads(r.stdout)
    if "true" in d and "on" not in d:
        d["on"] = d.pop("true")
    return d


def triggers(wf):
    on = wf.get("on")
    return set(on) if isinstance(on, (dict, list)) else {on}


def steps(job):
    return job.get("steps", [])


def reaches(jobs, name, target):
    needs = jobs[name].get("needs", [])
    needs = [needs] if isinstance(needs, str) else needs
    return target in needs or any(reaches(jobs, n, target) for n in needs)


def common(wf):
    """Rules every production workflow must satisfy. Returns a list of violations."""
    v, jobs = [], wf.get("jobs", {})
    bad = triggers(wf) & FORBIDDEN_TRIGGERS
    if bad:
        v.append("forbidden trigger(s): %s" % sorted(bad))
    if wf.get("permissions") != {}:
        v.append("top-level permissions must be empty")
    for jn, job in jobs.items():
        perms = job.get("permissions")
        if not isinstance(perms, dict) or not perms:
            v.append("%s: must declare its own minimal permissions" % jn)
        else:
            for k, val in perms.items():
                if val not in ("read", "write") or (val == "write" and not (jn == "deploy" and k in ("pages", "id-token"))):
                    v.append("%s: permission %s: %s is not allowed here" % (jn, k, val))
            if jn == "deploy" and perms != {"pages": "write", "id-token": "write"}:
                v.append("deploy: permissions must be exactly pages: write and id-token: write")
        if MAIN_ONLY not in str(job.get("if", "")):
            v.append("%s: must require refs/heads/main" % jn)
        if "timeout-minutes" not in job:
            v.append("%s: needs a timeout" % jn)
        env = job.get("environment")
        has_env = (env.get("name") if isinstance(env, dict) else env) if env else None
        if jn == "deploy" and has_env != "github-pages":
            v.append("deploy: must run in the github-pages environment")
        if jn != "deploy" and has_env:
            v.append("%s: only the deploy job may use an environment" % jn)
        for st in steps(job):
            u = st.get("uses")
            if u:
                m = re.fullmatch(r"([\w.-]+/[\w.-]+)@([0-9a-f]{40})", u)
                if not m or PINS.get(m.group(1)) != m.group(2):
                    v.append("%s: action %s is not pinned to the verified commit SHA" % (jn, u))
                if "deploy-pages" in u and jn != "deploy":
                    v.append("%s: only the deploy job may deploy" % jn)
                if "upload-pages-artifact" in u and jn == "deploy":
                    v.append("deploy: must deploy the artifact built earlier, not upload one")
                if "actions/checkout" in u and (st.get("with") or {}).get("persist-credentials") is not False:
                    v.append("%s: checkout must not persist credentials" % jn)
            run = st.get("run", "")
            for pat, why in ((r"\$\{\{\s*(inputs|github\.event|github\.head_ref)", "workflow input or event data inside a run script (script injection)"), (r"git\s+push", "git push"),
                             (r"gh\s+api[^\n]*(-X|--method)\s*(PUT|POST|PATCH|DELETE)", "a gh api call that changes repository state"), (r"gh\s+api[^\n]*\s(-f|-F|--field|--raw-field)\s", "a gh api call that sends fields"),
                             (r"build_type\s*=\s*legacy|source\[branch\]", "switching Pages to branch publishing"), (r"secrets\.", "a secret")):
                if re.search(pat, run):
                    v.append("%s: %s" % (jn, why))
            if jn == "deploy" and run:
                v.append("deploy: must contain no scripts")
    if "secrets." in json.dumps(wf):
        v.append("secrets are used")
    c = wf.get("concurrency") or {}
    if c.get("group") != "pages-production" or c.get("cancel-in-progress") is not False:
        v.append("concurrency must be group pages-production with cancel-in-progress false")
    if "guard" not in jobs:
        v.append("missing the guard job")
    else:
        if not any("build_type" in st.get("run", "") and '"workflow"' in st.get("run", "") for st in steps(jobs["guard"])):
            v.append("guard: must require Pages build_type to be workflow")
        if SITE_REPO not in str(jobs["guard"].get("if", "")):
            v.append("guard: must be limited to this repository")
        for jn in jobs:
            if jn != "guard" and not reaches(jobs, jn, "guard"):
                v.append("%s: does not depend on the guard job" % jn)
    return v


def check_pages(wf):
    v = common(wf)
    jobs = wf.get("jobs", {})
    on = wf.get("on")
    if not (isinstance(on, dict) and set(on) == {"push", "workflow_dispatch"} and on["push"] == {"branches": ["main"]}):
        v.append("pages: triggers must be exactly a push to main and a manual run")
    if set(jobs) != {"guard", "build", "deploy", "verify-live"}:
        v.append("pages: unexpected job set")
        return v
    build = jobs["build"]
    runs = " ".join(st.get("run", "") for st in steps(build))
    for needed in ("npm run build && npm test", "npm audit", "npm run build:pages"):
        if needed not in runs:
            v.append("pages build: must run %r" % needed)
    ups = [st for st in steps(build) if "upload-pages-artifact" in st.get("uses", "")]
    if len(ups) != 1 or (ups[0].get("with") or {}).get("path") != "dist":
        v.append("pages build: must upload exactly dist/")
    if any((st.get("with") or {}).get("ref") for st in steps(build) if "checkout" in st.get("uses", "")):
        v.append("pages build: must build the pushed commit (no ref override)")
    if "tree_digest" not in (build.get("outputs") or {}):
        v.append("pages build: must output the tree digest")
    if jobs["deploy"].get("needs") != "build" or len(steps(jobs["deploy"])) != 1:
        v.append("pages deploy: must need build and consist of the single deploy step")
    vl = jobs["verify-live"]
    if set(vl.get("needs", [])) != {"build", "deploy"}:
        v.append("pages verify-live: must need build and deploy")
    if any((st.get("with") or {}).get("ref") for st in steps(vl) if "checkout" in st.get("uses", "")):
        v.append("pages verify-live: must check out the deployed commit (no ref override)")
    cmd = " ".join(st.get("run", "") for st in steps(vl))
    if "verify-live-site.py" not in cmd or "--manifest scripts/publish-manifest.json" not in cmd or "--expect-digest" not in cmd:
        v.append("pages verify-live: must verify the live site against this commit's manifest and recorded digest")
    if not any((st.get("env") or {}).get("EXPECTED_DIGEST") == "${{ needs.build.outputs.tree_digest }}" for st in steps(vl)):
        v.append("pages verify-live: the expected digest must be the one the build recorded")
    return v


def check_rollback(wf):
    v = common(wf)
    jobs = wf.get("jobs", {})
    on = wf.get("on")
    ins = (on.get("workflow_dispatch") or {}).get("inputs", {}) if isinstance(on, dict) else {}
    if not (isinstance(on, dict) and set(on) == {"workflow_dispatch"}):
        v.append("rollback: must be manual only")
    for name in ("release_sha", "expected_tree_digest"):
        if not (ins.get(name, {}).get("required") is True and ins[name].get("type") == "string"):
            v.append("rollback: input %s must be required text" % name)
    if set(jobs) != {"guard", "rebuild-exact-release", "deploy", "verify-live"}:
        v.append("rollback: unexpected job set")
        return v
    g = " ".join(st.get("run", "") for st in steps(jobs["guard"]))
    for needle, why in (("[0-9a-f]{40}", "a full 40-character SHA"), ("[0-9a-f]{64}", "a full 64-character digest"), ('"$SHA" != "$GITHUB_SHA"', "refusing the current main"),
                        ("compare/$SHA...main", "proof the commit was released from main"), ("workflows/pages.yml/runs?head_sha=$SHA", "a successful production deploy run for that commit")):
        if needle not in g:
            v.append("rollback guard: must require %s" % why)
    rb = jobs["rebuild-exact-release"]
    cos = [st for st in steps(rb) if "actions/checkout" in st.get("uses", "")]
    if len(cos) != 1 or (cos[0].get("with") or {}).get("ref") != "${{ inputs.release_sha }}" or (cos[0].get("with") or {}).get("path") != "release":
        v.append("rollback rebuild: must check out exactly inputs.release_sha into release/")
    for st in steps(rb):
        if st.get("run") and st.get("working-directory") != "release":
            v.append("rollback rebuild: every script must run in release/ (found %r)" % st.get("name"))
    r = " ".join(st.get("run", "") for st in steps(rb))
    for needle, why in (("git rev-parse HEAD", "proof HEAD is the request"), ("merge-base --is-ancestor", "proof the commit is an ancestor of main"), ('[ "$d" = "$EXPECTED" ]', "the digest equality check"),
                        ("refusing to deploy", "refusal on digest mismatch"), ("npm run build:pages", "an artifact build at that commit"), ("Rollback record", "a rollback record")):
        if needle not in r:
            v.append("rollback rebuild: must contain %s" % why)
    blob = json.dumps(wf)
    if '"ref": "main"' in blob or "ref: main" in blob:
        v.append("rollback: nothing may check out main for building")
    ups = [st for st in steps(rb) if "upload-pages-artifact" in st.get("uses", "")]
    if len(ups) != 1 or (ups[0].get("with") or {}).get("path") != "release/dist":
        v.append("rollback rebuild: must upload exactly release/dist")
    if jobs["deploy"].get("needs") != "rebuild-exact-release" or len(steps(jobs["deploy"])) != 1:
        v.append("rollback deploy: must need the digest-checked rebuild and consist of the single deploy step")
    vl = jobs["verify-live"]
    cos = {(st.get("with") or {}).get("path"): (st.get("with") or {}).get("ref") for st in steps(vl) if "actions/checkout" in st.get("uses", "")}
    if cos != {"release": "${{ inputs.release_sha }}", "tools": None}:
        v.append("rollback verify-live: must check out the restored release (for its manifest) and the verifier from main (no ref)")
    cmd = " ".join(st.get("run", "") for st in steps(vl))
    if "tools/scripts/verify-live-site.py" not in cmd or "--manifest release/scripts/publish-manifest.json" not in cmd or "--expect-digest" not in cmd:
        v.append("rollback verify-live: must compare the live site with the RESTORED release's manifest and recorded digest")
    if not any((st.get("env") or {}).get("EXPECTED_DIGEST") == "${{ inputs.expected_tree_digest }}" for st in steps(vl)):
        v.append("rollback verify-live: the expected digest must be the recorded one that was supplied")
    return v


def check_repo(files, parsed):
    """Rules across all workflows."""
    v = []
    if set(files) != ALLOWED_FILES:
        v.append("unreviewed workflow files present or missing: %s" % sorted(set(files) ^ ALLOWED_FILES))
    for name, wf in parsed.items():
        if name not in ("pages.yml", "rollback.yml") and re.search(r"deploy-pages|upload-pages-artifact|pages.{0,5}write|id-token", json.dumps(wf)):
            v.append("%s: only the deployment workflows may touch Pages deployment" % name)
    if "pages.yml" in parsed and "rollback.yml" in parsed and parsed["pages.yml"].get("concurrency") != parsed["rollback.yml"].get("concurrency"):
        v.append("deployment and rollback must share one concurrency group")
    if "validate.yml" in parsed and parsed["validate.yml"].get("permissions") != {"contents": "read"}:
        v.append("validate.yml: must keep read-only contents permission")
    return v


files = sorted(p.name for p in WF.glob("*.y*ml"))
parsed = {n: parse(WF / n) for n in files}
pages, rollback = parsed["pages.yml"], parsed["rollback.yml"]

# --- the real files pass every rule
ok(not check_repo(files, parsed), "the repository's workflows pass the cross-workflow rules: %s" % check_repo(files, parsed))
ok(not check_pages(pages), "pages.yml passes: %s" % check_pages(pages))
ok(not check_rollback(rollback), "rollback.yml passes: %s" % check_rollback(rollback))
ok("pull_request" in triggers(parsed["validate.yml"]), "validate.yml still runs on pull requests (it only reads)")
ok(set(files) == ALLOWED_FILES, "exactly the reviewed workflow files exist")

# --- named properties, stated directly on the parsed files
ok(triggers(pages) == {"push", "workflow_dispatch"} and pages["on"]["push"]["branches"] == ["main"], "PR branches cannot deploy: pages.yml runs only on pushes to main and manual runs")
ok(triggers(rollback) == {"workflow_dispatch"}, "the rollback can only be started by hand")
for n, wf in (("pages.yml", pages), ("rollback.yml", rollback)):
    ok(all(MAIN_ONLY in j["if"] for j in wf["jobs"].values()), "%s: every job requires refs/heads/main (a run started from a pull-request branch skips everything)" % n)
    ok(wf["permissions"] == {} and [j for j, d in wf["jobs"].items() if "write" in d["permissions"].values()] == ["deploy"], "%s: only the deploy job has write permissions" % n)
    ok(reaches(wf["jobs"], "deploy", "guard"), "%s: deploying requires passing the guard that refuses legacy publishing" % n)
ok(pages["concurrency"] == rollback["concurrency"] and pages["concurrency"]["cancel-in-progress"] is False, "deployment and rollback share one non-cancelling concurrency group")
ok(all(PINS.get(s["uses"].split("@")[0]) == s["uses"].split("@")[1] for w in (pages, rollback) for j in w["jobs"].values() for s in j["steps"] if "uses" in s), "every third-party action is pinned to a verified commit SHA")
ok(rollback["jobs"]["rebuild-exact-release"]["steps"][0]["with"]["ref"] == "${{ inputs.release_sha }}", "the rollback builds the requested immutable commit")
ok("--manifest release/scripts/publish-manifest.json" in rollback["jobs"]["verify-live"]["steps"][-1]["run"] and "--manifest scripts/publish-manifest.json" in pages["jobs"]["verify-live"]["steps"][-1]["run"], "live verification uses the manifest of the release being checked")


# --- mutation tests: every unsafe variant of the parsed workflows must be reported
def jobstep(wf, job, pred):
    return next(s for s in wf["jobs"][job]["steps"] if pred(s))


def mut(base, check, label, change, expect):
    global unsafe_variants
    unsafe_variants += 1
    bad = copy.deepcopy(base)
    change(bad)
    found = check(bad)
    ok(any(expect in x for x in found), "unsafe variant is caught: %s (expected %r, got %s)" % (label, expect, found[:2]))


def cross(label, change_files, change_parsed, expect):
    global unsafe_variants
    unsafe_variants += 1
    f, p = list(files), copy.deepcopy(parsed)
    change_files(f)
    change_parsed(p)
    found = check_repo(f, p)
    ok(any(expect in x for x in found), "unsafe variant is caught: %s (expected %r, got %s)" % (label, expect, found[:2]))


P, R = pages, rollback
is_checkout = lambda s: "checkout" in s.get("uses", "")
mut(P, check_pages, "a pull_request trigger", lambda w: w["on"].update({"pull_request": {}}), "forbidden trigger")
mut(P, check_pages, "a schedule trigger", lambda w: w["on"].update({"schedule": [{"cron": "0 0 * * *"}]}), "forbidden trigger")
mut(P, check_pages, "pushes to release branches too", lambda w: w["on"]["push"].update({"branches": ["main", "release/**"]}), "exactly a push to main")
mut(P, check_pages, "the deploy job loses its main-only condition", lambda w: w["jobs"]["deploy"].pop("if"), "refs/heads/main")
mut(P, check_pages, "the build job gets pages: write", lambda w: w["jobs"]["build"]["permissions"].update({"pages": "write"}), "not allowed here")
mut(P, check_pages, "the build job gets contents: write", lambda w: w["jobs"]["build"]["permissions"].update({"contents": "write"}), "not allowed here")
mut(P, check_pages, "workflow-level permissions are broad", lambda w: w.update({"permissions": {"contents": "read"}}), "top-level permissions")
mut(P, check_pages, "an action is unpinned", lambda w: jobstep(w, "build", is_checkout).update({"uses": "actions/checkout@v4"}), "not pinned")
mut(P, check_pages, "an action is pinned to the wrong commit", lambda w: jobstep(w, "build", lambda s: "setup-node" in s.get("uses", "")).update({"uses": "actions/setup-node@" + "a" * 40}), "not pinned")
mut(P, check_pages, "an unreviewed third-party action", lambda w: w["jobs"]["build"]["steps"].append({"uses": "someone/else@" + "b" * 40}), "not pinned")
mut(P, check_pages, "the deploy environment is removed", lambda w: w["jobs"]["deploy"].pop("environment"), "github-pages environment")
mut(P, check_pages, "the deploy environment is renamed", lambda w: w["jobs"]["deploy"]["environment"].update({"name": "production"}), "github-pages environment")
mut(P, check_pages, "another job uses an environment", lambda w: w["jobs"]["build"].update({"environment": "github-pages"}), "only the deploy job may use an environment")
mut(P, check_pages, "deployments can be cancelled mid-way", lambda w: w["concurrency"].update({"cancel-in-progress": True}), "concurrency")
mut(P, check_pages, "a different concurrency group", lambda w: w["concurrency"].update({"group": "other"}), "concurrency")
mut(P, check_pages, "the whole repository root is uploaded", lambda w: jobstep(w, "build", lambda s: "upload-pages" in s.get("uses", ""))["with"].update({"path": "."}), "exactly dist/")
mut(P, check_pages, "the build no longer runs the artifact verifier", lambda w: jobstep(w, "build", lambda s: s.get("run", "").startswith("npm run build:pages")).update({"run": "true"}), "npm run build:pages")
mut(P, check_pages, "the build checks out another ref", lambda w: jobstep(w, "build", is_checkout)["with"].update({"ref": "main"}), "no ref override")
mut(P, check_pages, "deploy no longer depends on the guard", lambda w: (w["jobs"]["build"].pop("needs"), w["jobs"]["deploy"].update({"needs": "build"})), "does not depend on the guard")
mut(P, check_pages, "the guard stops checking the Pages source", lambda w: jobstep(w, "guard", lambda s: "run" in s).update({"run": "true"}), "build_type")
mut(P, check_pages, "the guard accepts legacy publishing", lambda w: jobstep(w, "guard", lambda s: "run" in s).update({"run": 'test "$(gh api x -q .build_type)" = "legacy"'}), "build_type")
mut(P, check_pages, "live verification uses a different manifest", lambda w: jobstep(w, "verify-live", lambda s: "verify-live-site" in s.get("run", "")).update({"run": 'python3 scripts/verify-live-site.py "$SITE_URL" --manifest tools/scripts/publish-manifest.json --expect-digest "$EXPECTED_DIGEST"'}), "this commit's manifest")
mut(P, check_pages, "live verification checks out another release", lambda w: jobstep(w, "verify-live", is_checkout)["with"].update({"ref": "main"}), "no ref override")
mut(P, check_pages, "live verification drops the recorded digest", lambda w: jobstep(w, "verify-live", lambda s: "verify-live-site" in s.get("run", "")).update({"run": 'python3 scripts/verify-live-site.py "$SITE_URL" --manifest scripts/publish-manifest.json'}), "recorded digest")
mut(P, check_pages, "live verification trusts a different digest", lambda w: jobstep(w, "verify-live", lambda s: "env" in s and "EXPECTED_DIGEST" in s["env"])["env"].update({"EXPECTED_DIGEST": "0" * 64}), "the build recorded")
mut(P, check_pages, "a secret is used", lambda w: w["jobs"]["build"]["steps"].append({"run": "echo ${{ secrets.TOKEN }}"}), "secret")
mut(P, check_pages, "a run script interpolates a workflow input", lambda w: w["jobs"]["build"]["steps"].append({"run": "echo ${{ inputs.x }}"}), "script injection")
mut(P, check_pages, "a script switches Pages back to legacy", lambda w: w["jobs"]["build"]["steps"].append({"run": "gh api -X PUT repos/x/y/pages -f build_type=legacy"}), "changes repository state")
mut(P, check_pages, "a script changes settings with fields", lambda w: w["jobs"]["build"]["steps"].append({"run": "gh api repos/x/y/pages -f source[branch]=main"}), "sends fields")
mut(P, check_pages, "a script pushes", lambda w: w["jobs"]["build"]["steps"].append({"run": "git push origin HEAD"}), "git push")
mut(P, check_pages, "the deploy job runs scripts", lambda w: w["jobs"]["deploy"]["steps"].append({"run": "echo hi"}), "no scripts")
mut(P, check_pages, "a build job deploys", lambda w: w["jobs"]["build"]["steps"].append({"uses": "actions/deploy-pages@" + PINS["actions/deploy-pages"]}), "only the deploy job may deploy")
mut(P, check_pages, "checkout persists credentials", lambda w: jobstep(w, "build", is_checkout)["with"].update({"persist-credentials": True}), "persist credentials")
mut(P, check_pages, "a job without a timeout", lambda w: w["jobs"]["build"].pop("timeout-minutes"), "timeout")
mut(P, check_pages, "the guard is not limited to this repository", lambda w: w["jobs"]["guard"].update({"if": MAIN_ONLY}), "limited to this repository")

mut(R, check_rollback, "a pull_request trigger", lambda w: w["on"].update({"pull_request": {}}), "forbidden trigger")
mut(R, check_rollback, "a push trigger", lambda w: w["on"].update({"push": {"branches": ["main"]}}), "manual only")
mut(R, check_rollback, "the release SHA input is optional", lambda w: w["on"]["workflow_dispatch"]["inputs"]["release_sha"].update({"required": False}), "required text")
mut(R, check_rollback, "the digest input is optional", lambda w: w["on"]["workflow_dispatch"]["inputs"]["expected_tree_digest"].update({"required": False}), "required text")
mut(R, check_rollback, "the rebuild checks out main", lambda w: jobstep(w, "rebuild-exact-release", is_checkout)["with"].update({"ref": "main"}), "exactly inputs.release_sha")
mut(R, check_rollback, "the rebuild checks out the wrong input", lambda w: jobstep(w, "rebuild-exact-release", is_checkout)["with"].update({"ref": "${{ github.event.inputs.release_sha }}"}), "exactly inputs.release_sha")
mut(R, check_rollback, "the rebuild checks out into the repository root", lambda w: jobstep(w, "rebuild-exact-release", is_checkout)["with"].pop("path"), "exactly inputs.release_sha")
mut(R, check_rollback, "a rebuild script runs outside the release checkout", lambda w: jobstep(w, "rebuild-exact-release", lambda s: s.get("run") == "npm ci --ignore-scripts").pop("working-directory"), "must run in release/")
mut(R, check_rollback, "the digest check is removed", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "refusing to deploy" in s.get("run", "")).update({"run": "true"}), "digest equality")
mut(R, check_rollback, "the ancestor check is removed", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "merge-base" in s.get("run", "")).update({"run": '[ "$(git rev-parse HEAD)" = "$SHA" ]'}), "ancestor of main")
mut(R, check_rollback, "the guard stops requiring a previous release", lambda w: jobstep(w, "guard", lambda s: "workflows/pages.yml/runs" in s.get("run", "")).update({"run": "true"}), "successful production deploy run")
mut(R, check_rollback, "the guard stops requiring a full SHA", lambda w: jobstep(w, "guard", lambda s: "[0-9a-f]{40}" in s.get("run", "")).update({"run": "true"}), "40-character SHA")
mut(R, check_rollback, "the guard allows rolling back to the current main", lambda w: jobstep(w, "guard", lambda s: "[0-9a-f]{40}" in s.get("run", "")).update({"run": "[[ $SHA =~ ^[0-9a-f]{40}$ ]]; [[ $D =~ ^[0-9a-f]{64}$ ]]; echo compare/$SHA...main workflows/pages.yml/runs?head_sha=$SHA"}), "current main")
mut(R, check_rollback, "the guard stops requiring a main-released commit", lambda w: jobstep(w, "guard", lambda s: "compare/" in s.get("run", "")).update({"run": "true"}), "released from main")
mut(R, check_rollback, "the rollback deploys without the digest-checked rebuild", lambda w: w["jobs"]["deploy"].update({"needs": "guard"}), "digest-checked rebuild")
mut(R, check_rollback, "the rollback uploads the repository root", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "upload-pages" in s.get("uses", ""))["with"].update({"path": "."}), "exactly release/dist")
mut(R, check_rollback, "live verification uses the current main's manifest", lambda w: jobstep(w, "verify-live", lambda s: "verify-live-site" in s.get("run", "")).update({"run": 'python3 tools/scripts/verify-live-site.py "$SITE_URL" --manifest tools/scripts/publish-manifest.json --expect-digest "$EXPECTED_DIGEST"'}), "RESTORED release's manifest")
mut(R, check_rollback, "live verification checks out main as the release", lambda w: [s for s in w["jobs"]["verify-live"]["steps"] if (s.get("with") or {}).get("path") == "release"][0]["with"].update({"ref": "main"}), "restored release")
mut(R, check_rollback, "the verifier is taken from the old release", lambda w: [s for s in w["jobs"]["verify-live"]["steps"] if (s.get("with") or {}).get("path") == "tools"][0]["with"].update({"ref": "${{ inputs.release_sha }}"}), "verifier from main")
mut(R, check_rollback, "live verification trusts a different digest", lambda w: jobstep(w, "verify-live", lambda s: "env" in s and "EXPECTED_DIGEST" in s["env"])["env"].update({"EXPECTED_DIGEST": "0" * 64}), "recorded one")
mut(R, check_rollback, "the rebuild no longer builds the artifact", lambda w: jobstep(w, "rebuild-exact-release", lambda s: s.get("run") == "npm run build:pages").update({"run": "true"}), "artifact build")
mut(R, check_rollback, "no rollback record is written", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "refusing to deploy" in s.get("run", "")).update({"run": '[ "$d" = "$EXPECTED" ] || { echo refusing to deploy; exit 1; }'}), "rollback record")
mut(R, check_rollback, "a script switches Pages back to legacy", lambda w: w["jobs"]["guard"]["steps"].append({"run": "gh api --method PATCH repos/x/y/pages -f build_type=legacy"}), "changes repository state")
mut(R, check_rollback, "a run script interpolates the SHA input", lambda w: w["jobs"]["guard"]["steps"].append({"run": "echo ${{ inputs.release_sha }}"}), "script injection")
mut(R, check_rollback, "the guard job is bypassed", lambda w: w["jobs"]["rebuild-exact-release"].pop("needs"), "does not depend on the guard")

cross("an extra, unreviewed workflow", lambda f: f.append("deploy2.yml"), lambda p: None, "unreviewed workflow")
cross("a reviewed workflow is missing", lambda f: f.remove("rollback.yml"), lambda p: p.pop("rollback.yml"), "unreviewed workflow")
cross("the CI workflow gains Pages deployment rights", lambda f: None, lambda p: p["validate.yml"]["jobs"]["validate"].update({"permissions": {"pages": "write"}}), "only the deployment workflows")
cross("the CI workflow gains write access", lambda f: None, lambda p: p["validate.yml"].update({"permissions": {"contents": "write"}}), "read-only")
cross("deployment and rollback stop sharing a concurrency group", lambda f: None, lambda p: p["rollback.yml"]["concurrency"].update({"group": "elsewhere"}), "one concurrency group")

# a malformed YAML file is a failure, never a skip
with tempfile.TemporaryDirectory() as td:
    bad = Path(td) / "bad.yml"
    bad.write_text("jobs: [unclosed\n")
    try:
        parse(bad)
    except SystemExit as e:
        ok("not valid YAML" in str(e), "a malformed workflow file fails the test instead of being skipped")
    else:
        ok(False, "a malformed workflow file fails the test")

print("workflow safety: %d checks passed (%d unsafe variants proven to be caught)" % (checks, unsafe_variants))
