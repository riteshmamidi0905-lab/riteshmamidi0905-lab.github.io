#!/usr/bin/env python3
"""Safety tests for the GitHub Actions workflows, in particular the production deployment (pages.yml) and rollback (rollback.yml).

The real files in .github/workflows/ are parsed with a real YAML parser (scripts/workflow_rules.py, Ruby's Psych; if Ruby is missing the test FAILS, it never skips) and the shared
rules are checked against the parsed structure. Each rule is then proven to bite: unsafe variants of the parsed workflows are generated (continue-on-error on a deployment or
verification job, an extra condition that can skip it, a record created before live verification, a rollback that trusts a workflow-level success or the operator's digest, ...) and
every variant must be reported. The rollback evidence gate itself is tested in scripts/test-release-evidence.py. Run:  python3 scripts/test-workflows.py"""
import copy
import json
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import workflow_rules as W

ROOT = HERE.parent
WF = ROOT / ".github" / "workflows"
ALLOWED_FILES = {"validate.yml", "pages.yml", "rollback.yml"}
checks = 0
unsafe_variants = 0


def ok(cond, name):
    global checks
    assert cond, "FAILED: " + name
    checks += 1


files = sorted(p.name for p in WF.glob("*.y*ml"))
parsed = {n: W.parse(WF / n) for n in files}
pages, rollback = parsed["pages.yml"], parsed["rollback.yml"]

# --- the real files pass every rule
ok(not W.check_repo(files, parsed, ALLOWED_FILES), "the repository's workflows pass the cross-workflow rules: %s" % W.check_repo(files, parsed, ALLOWED_FILES))
ok(not W.check_pages(pages), "pages.yml passes: %s" % W.check_pages(pages))
ok(not W.check_rollback(rollback), "rollback.yml passes: %s" % W.check_rollback(rollback))
ok("pull_request" in W.triggers(parsed["validate.yml"]), "validate.yml still runs on pull requests (it only reads)")
ok(set(files) == ALLOWED_FILES, "exactly the reviewed workflow files exist")

# --- named properties, stated directly on the parsed files
MAIN = W.MAIN_ONLY
ok(W.triggers(pages) == {"push", "workflow_dispatch"} and pages["on"]["push"]["branches"] == ["main"], "PR branches cannot deploy: pages.yml runs only on pushes to main and manual runs")
ok(W.triggers(rollback) == {"workflow_dispatch"}, "the rollback can only be started by hand")
for n, wf in (("pages.yml", pages), ("rollback.yml", rollback)):
    ok(all(W.MAIN_ONLY in j["if"] for j in wf["jobs"].values()), "%s: every job requires refs/heads/main (a run started from a pull-request branch skips everything)" % n)
    ok(wf["permissions"] == {} and [j for j, d in wf["jobs"].items() if "write" in d["permissions"].values()] == ["deploy"], "%s: only the deploy job has write permissions" % n)
    ok(W.reaches(wf["jobs"], "deploy", "guard"), "%s: deploying requires passing the guard that refuses legacy publishing" % n)
    ok(not any(isinstance(x, dict) and "continue-on-error" in x for x in W.walk(wf)), "%s: nothing uses continue-on-error" % n)
    ok(not any("if" in s for j in wf["jobs"].values() for s in j["steps"]), "%s: no step has a condition" % n)
    ok(all(norm == (W.GUARD_IF if j == "guard" else MAIN) for j, norm in ((j, W.norm(d["if"])) for j, d in wf["jobs"].items())), "%s: every job condition is exactly the main-only condition (nothing can silently skip a job)" % n)
ok(pages["concurrency"] == rollback["concurrency"] and pages["concurrency"]["cancel-in-progress"] is False, "deployment and rollback share one non-cancelling concurrency group")
ok(all(W.PINS.get(s["uses"].split("@")[0]) == s["uses"].split("@")[1] for w in (pages, rollback) for j in w["jobs"].values() for s in j["steps"] if "uses" in s), "every third-party action is pinned to a verified commit SHA")
ok(W.needs_of(pages["jobs"]["record-release"]) == ["build", "deploy", "verify-live"], "the release record is created only after the deploy AND the live verification (it depends on both)")
ok(pages["jobs"]["record-release"]["steps"][-1]["with"]["name"] == W.RELEASE_RECORD_NAME, "the release record is named after the commit, run and attempt")
ok(all(pages["jobs"][j]["name"] == j for j in pages["jobs"]), "pages.yml job names equal their ids (the rollback evidence gate matches them)")
ok(not any(("upload-artifact" in s.get("uses", "")) for j, d in pages["jobs"].items() if j != "record-release" for s in d["steps"]), "only the record-release job uploads a release record")
ok(rollback["jobs"]["rebuild-exact-release"]["steps"][0]["with"]["ref"] == "${{ inputs.release_sha }}", "the rollback builds the requested immutable commit")
ok(any((s.get("env") or {}).get("EXPECTED") == W.TRUSTED_DIGEST for s in rollback["jobs"]["rebuild-exact-release"]["steps"]), "the rollback must reproduce the digest from the verified release record, not the operator's input")
ok(not any("inputs.expected_tree_digest" in json.dumps(j["steps"]) for n, j in rollback["jobs"].items() if n not in ("guard", "verify-release-evidence")), "the operator-supplied digest is read only by the guard (format check) and the evidence gate (which checks it against the release record)")
ok("--manifest release/scripts/publish-manifest.json" in rollback["jobs"]["verify-live"]["steps"][-1]["run"] and "--manifest scripts/publish-manifest.json" in pages["jobs"]["verify-live"]["steps"][-1]["run"], "live verification uses the manifest of the release being checked")
ok(W.needs_of(rollback["jobs"]["record-rollback"]) == ["verify-release-evidence", "rebuild-exact-release", "deploy", "verify-live"], "only a rollback whose live verification succeeded gets a completion record")


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
    found = W.check_repo(f, p, ALLOWED_FILES)
    ok(any(expect in x for x in found), "unsafe variant is caught: %s (expected %r, got %s)" % (label, expect, found[:2]))


P, R = pages, rollback
named = lambda n: (lambda s: s.get("name") == n)
is_checkout = lambda s: "checkout" in s.get("uses", "")
CP = W.check_pages
CR = W.check_rollback

# triggers, permissions, pins, environment, concurrency (as before)
mut(P, CP, "a pull_request trigger", lambda w: w["on"].update({"pull_request": {}}), "forbidden trigger")
mut(P, CP, "a schedule trigger", lambda w: w["on"].update({"schedule": [{"cron": "0 0 * * *"}]}), "forbidden trigger")
mut(P, CP, "pushes to release branches too", lambda w: w["on"]["push"].update({"branches": ["main", "release/**"]}), "exactly a push to main")
mut(P, CP, "the deploy job loses its main-only condition", lambda w: w["jobs"]["deploy"].pop("if"), "its condition must be exactly")
mut(P, CP, "the build job gets pages: write", lambda w: w["jobs"]["build"]["permissions"].update({"pages": "write"}), "not allowed here")
mut(P, CP, "the record job gets contents: write", lambda w: w["jobs"]["record-release"]["permissions"].update({"contents": "write"}), "not allowed here")
mut(P, CP, "workflow-level permissions are broad", lambda w: w.update({"permissions": {"contents": "read"}}), "top-level permissions")
mut(P, CP, "an action is unpinned", lambda w: jobstep(w, "build", is_checkout).update({"uses": "actions/checkout@v4"}), "not pinned")
mut(P, CP, "the record upload action is pinned to the wrong commit", lambda w: jobstep(w, "record-release", named("Upload the release record")).update({"uses": "actions/upload-artifact@" + "a" * 40}), "not pinned")
mut(P, CP, "an unreviewed third-party action", lambda w: w["jobs"]["build"]["steps"].append({"uses": "someone/else@" + "b" * 40}), "not pinned")
mut(P, CP, "the deploy environment is removed", lambda w: w["jobs"]["deploy"].pop("environment"), "github-pages environment")
mut(P, CP, "the deploy environment is renamed", lambda w: w["jobs"]["deploy"]["environment"].update({"name": "production"}), "github-pages environment")
mut(P, CP, "another job uses an environment", lambda w: w["jobs"]["build"].update({"environment": "github-pages"}), "only the deploy job may use an environment")
mut(P, CP, "deployments can be cancelled mid-way", lambda w: w["concurrency"].update({"cancel-in-progress": True}), "concurrency")
mut(P, CP, "a different concurrency group", lambda w: w["concurrency"].update({"group": "other"}), "concurrency")
mut(P, CP, "the whole repository root is uploaded", lambda w: jobstep(w, "build", named("Upload the Pages artifact"))["with"].update({"path": "."}), "exactly dist/")
mut(P, CP, "the build no longer runs the artifact verifier", lambda w: jobstep(w, "build", named("Build and verify the publication artifact")).update({"run": "true"}), "npm run build:pages")
mut(P, CP, "the build checks out another ref", lambda w: jobstep(w, "build", is_checkout)["with"].update({"ref": "main"}), "no ref override")
mut(P, CP, "the guard stops checking the Pages source", lambda w: jobstep(w, "guard", lambda s: "run" in s).update({"run": "true"}), "build_type")
mut(P, CP, "the guard accepts legacy publishing", lambda w: jobstep(w, "guard", lambda s: "run" in s).update({"run": 'test "$(gh api x -q .build_type)" = "legacy"'}), "build_type")
mut(P, CP, "the guard is not limited to this repository", lambda w: w["jobs"]["guard"].update({"if": W.MAIN_ONLY}), "its condition must be exactly")
mut(P, CP, "a secret is used", lambda w: w["jobs"]["build"]["steps"].append({"run": "echo ${{ secrets.TOKEN }}"}), "secret")
mut(P, CP, "a run script interpolates a workflow input", lambda w: w["jobs"]["build"]["steps"].append({"run": "echo ${{ inputs.x }}"}), "script injection")
mut(P, CP, "a script switches Pages back to legacy", lambda w: w["jobs"]["build"]["steps"].append({"run": "gh api -X PUT repos/x/y/pages -f build_type=legacy"}), "changes repository state")
mut(P, CP, "a script changes settings with fields", lambda w: w["jobs"]["build"]["steps"].append({"run": "gh api repos/x/y/pages -f source[branch]=main"}), "sends fields")
mut(P, CP, "a script pushes", lambda w: w["jobs"]["build"]["steps"].append({"run": "git push origin HEAD"}), "git push")
mut(P, CP, "the deploy job runs scripts", lambda w: w["jobs"]["deploy"]["steps"].append({"run": "echo hi"}), "no scripts")
mut(P, CP, "a build job deploys", lambda w: w["jobs"]["build"]["steps"].append({"uses": "actions/deploy-pages@" + W.PINS["actions/deploy-pages"]}), "only the deploy job may deploy")
mut(P, CP, "checkout persists credentials", lambda w: jobstep(w, "build", is_checkout)["with"].update({"persist-credentials": True}), "persist credentials")
mut(P, CP, "a job without a timeout", lambda w: w["jobs"]["build"].pop("timeout-minutes"), "timeout")

# continue-on-error can hide a failed deployment or verification: forbidden anywhere
mut(P, CP, "continue-on-error on the deploy job", lambda w: w["jobs"]["deploy"].update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(P, CP, "continue-on-error on the deploy step", lambda w: jobstep(w, "deploy", named("Deploy to GitHub Pages")).update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(P, CP, "continue-on-error on the live verification job", lambda w: w["jobs"]["verify-live"].update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(P, CP, "continue-on-error on the live verification step", lambda w: jobstep(w, "verify-live", named("Verify the live site")).update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(P, CP, "continue-on-error as an expression", lambda w: w["jobs"]["verify-live"].update({"continue-on-error": "${{ vars.LENIENT == 'yes' }}"}), "continue-on-error is forbidden")
mut(P, CP, "continue-on-error on the record job", lambda w: w["jobs"]["record-release"].update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(P, CP, "continue-on-error on the build job", lambda w: w["jobs"]["build"].update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(R, CR, "continue-on-error on the rollback evidence job", lambda w: w["jobs"]["verify-release-evidence"].update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(R, CR, "continue-on-error on the rollback live verification", lambda w: w["jobs"]["verify-live"].update({"continue-on-error": True}), "continue-on-error is forbidden")
mut(R, CR, "continue-on-error on the rollback deploy step", lambda w: w["jobs"]["deploy"]["steps"][0].update({"continue-on-error": True}), "continue-on-error is forbidden")

# extra conditions can silently skip a job (a skipped job still leaves a green run)
mut(P, CP, "an extra condition that can skip the deploy job", lambda w: w["jobs"]["deploy"].update({"if": W.MAIN_ONLY + " && vars.DEPLOY_ENABLED == 'true'"}), "extra conditions can silently skip it")
mut(P, CP, "an extra condition that can skip live verification", lambda w: w["jobs"]["verify-live"].update({"if": W.MAIN_ONLY + " && github.event_name == 'push'"}), "extra conditions can silently skip it")
mut(P, CP, "an extra condition that can skip the release record", lambda w: w["jobs"]["record-release"].update({"if": W.MAIN_ONLY + " && vars.RECORD == 'yes'"}), "extra conditions can silently skip it")
mut(P, CP, "an extra condition that can skip the build", lambda w: w["jobs"]["build"].update({"if": W.MAIN_ONLY + " && vars.BUILD == 'yes'"}), "extra conditions can silently skip it")
mut(P, CP, "a condition using always()", lambda w: w["jobs"]["record-release"].update({"if": "always() && " + W.MAIN_ONLY}), "always(), failure() or cancelled()")
mut(P, CP, "a condition using failure()", lambda w: w["jobs"]["verify-live"].update({"if": "failure() && " + W.MAIN_ONLY}), "always(), failure() or cancelled()")
mut(P, CP, "a condition on the deploy step", lambda w: jobstep(w, "deploy", named("Deploy to GitHub Pages")).update({"if": "vars.DEPLOY == 'yes'"}), "has a condition")
mut(P, CP, "a condition on the live verification step", lambda w: jobstep(w, "verify-live", named("Verify the live site")).update({"if": "github.event_name == 'push'"}), "has a condition")
mut(R, CR, "a condition on a rollback evidence step", lambda w: jobstep(w, "verify-release-evidence", named("Verify the release evidence")).update({"if": "vars.SKIP != 'yes'"}), "has a condition")
mut(R, CR, "an extra condition that can skip the rollback evidence job", lambda w: w["jobs"]["verify-release-evidence"].update({"if": W.MAIN_ONLY + " && vars.EVIDENCE == 'yes'"}), "extra conditions can silently skip it")

# dependencies: nothing may be bypassed
mut(P, CP, "deploy no longer depends on the build", lambda w: w["jobs"]["deploy"].update({"needs": "guard"}), "must need exactly")
mut(P, CP, "deploy no longer depends on anything", lambda w: w["jobs"]["deploy"].pop("needs"), "must need exactly")
mut(P, CP, "live verification no longer waits for the deploy", lambda w: w["jobs"]["verify-live"].update({"needs": ["build"]}), "must need exactly")
mut(P, CP, "the guard is bypassed by the build", lambda w: w["jobs"]["build"].pop("needs"), "must need exactly")
mut(P, CP, "an unexpected extra job", lambda w: w["jobs"].update({"extra": copy.deepcopy(w["jobs"]["build"])}), "unexpected job set")
mut(P, CP, "a job name that differs from its id", lambda w: w["jobs"]["deploy"].update({"name": "Deploy the site"}), "job name must equal its id")

# the release record
mut(P, CP, "no release record job", lambda w: w["jobs"].pop("record-release"), "unexpected job set")
mut(P, CP, "no release record upload step", lambda w: w["jobs"]["record-release"].update({"steps": [s for s in w["jobs"]["record-release"]["steps"] if s.get("name") != "Upload the release record"]}), "missing the required step")
mut(P, CP, "the record is created before live verification (does not wait for it)", lambda w: w["jobs"]["record-release"].update({"needs": ["build", "deploy"]}), "must need exactly")
mut(P, CP, "the record only waits for the build", lambda w: w["jobs"]["record-release"].update({"needs": "build"}), "must need exactly")
mut(P, CP, "the record is uploaded from the build job (before anything is deployed)", lambda w: w["jobs"]["build"]["steps"].append(copy.deepcopy(jobstep(w, "record-release", named("Upload the release record")))), "only the record-release job may upload")
mut(P, CP, "the record claims success without the real results", lambda w: jobstep(w, "record-release", named("Compose the release record"))["env"].update({"VERIFY_RESULT": "success"}), "composed from the build digest and the deploy and live-verification results")
mut(P, CP, "the record ignores the deploy result", lambda w: jobstep(w, "record-release", named("Compose the release record"))["env"].update({"DEPLOY_RESULT": "success"}), "composed from the build digest and the deploy and live-verification results")
mut(P, CP, "the record uses a digest that is not the build's", lambda w: jobstep(w, "record-release", named("Compose the release record"))["env"].update({"TREE_DIGEST": "0" * 64}), "composed from the build digest and the deploy and live-verification results")
mut(P, CP, "the record is not written by release_record.py", lambda w: jobstep(w, "record-release", named("Compose the release record")).update({"run": 'echo {} > release-record.json'}), "create the record with release_record.py")
mut(P, CP, "the record artifact has another name", lambda w: jobstep(w, "record-release", named("Upload the release record"))["with"].update({"name": "release-record"}), "must upload release-record.json as")
mut(P, CP, "the record artifact is kept for less than 90 days", lambda w: jobstep(w, "record-release", named("Upload the release record"))["with"].update({"retention-days": 1}), "must upload release-record.json as")
mut(P, CP, "a missing record file is tolerated", lambda w: jobstep(w, "record-release", named("Upload the release record"))["with"].update({"if-no-files-found": "ignore"}), "must upload release-record.json as")
mut(P, CP, "a required step is renamed (the evidence gate matches it)", lambda w: jobstep(w, "deploy", named("Deploy to GitHub Pages")).update({"name": "Deploy"}), "missing the required step")
mut(P, CP, "live verification no longer checks the recorded digest", lambda w: jobstep(w, "verify-live", named("Verify the live site")).update({"run": 'python3 scripts/verify-live-site.py "$SITE_URL" --manifest scripts/publish-manifest.json'}), "recorded digest")
mut(P, CP, "live verification uses another manifest", lambda w: jobstep(w, "verify-live", named("Verify the live site")).update({"run": 'python3 scripts/verify-live-site.py "$SITE_URL" --manifest tools/scripts/publish-manifest.json --expect-digest "$EXPECTED_DIGEST"'}), "this commit's manifest")
mut(P, CP, "live verification trusts a different digest", lambda w: jobstep(w, "verify-live", named("Verify the live site"))["env"].update({"EXPECTED_DIGEST": "0" * 64}), "the build recorded")
mut(P, CP, "live verification checks out another release", lambda w: jobstep(w, "verify-live", is_checkout)["with"].update({"ref": "main"}), "no ref override")

# rollback: eligibility must come from evidence, not from a successful workflow run or an operator-supplied digest
mut(R, CR, "a pull_request trigger", lambda w: w["on"].update({"pull_request": {}}), "forbidden trigger")
mut(R, CR, "a push trigger", lambda w: w["on"].update({"push": {"branches": ["main"]}}), "manual only")
mut(R, CR, "the release SHA input is optional", lambda w: w["on"]["workflow_dispatch"]["inputs"]["release_sha"].update({"required": False}), "required text")
mut(R, CR, "the digest input is optional", lambda w: w["on"]["workflow_dispatch"]["inputs"]["expected_tree_digest"].update({"required": False}), "required text")
mut(R, CR, "eligibility based only on a workflow-level success filter", lambda w: w["jobs"]["guard"]["steps"].append({"name": "x", "run": 'gh api "repos/$GITHUB_REPOSITORY/actions/workflows/pages.yml/runs?head_sha=$SHA&status=success" -q .total_count'}), "workflow-level success filter")
mut(R, CR, "the evidence gate is removed", lambda w: w["jobs"]["verify-release-evidence"].update({"steps": [s for s in w["jobs"]["verify-release-evidence"]["steps"] if s.get("id") != "evidence"]}), "must output the digest from the verified release record")
mut(R, CR, "the evidence gate no longer receives the operator's digest to check", lambda w: jobstep(w, "verify-release-evidence", named("Verify the release evidence")).update({"run": jobstep(w, "verify-release-evidence", named("Verify the release evidence"))["run"].replace(' --digest "$DIGEST"', "")}), "the evidence step must run")
mut(R, CR, "the evidence gate does not judge the release commit's workflow", lambda w: jobstep(w, "verify-release-evidence", named("Verify the release evidence")).update({"run": jobstep(w, "verify-release-evidence", named("Verify the release evidence"))["run"].replace(" --release-dir release", "")}), "the evidence step must run")
mut(R, CR, "the rebuild trusts the operator-supplied digest instead of the release record", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "EXPECTED" in (s.get("env") or {}))["env"].update({"EXPECTED": "${{ inputs.expected_tree_digest }}"}), "never the operator-supplied input")
mut(R, CR, "the live verification trusts the operator-supplied digest", lambda w: jobstep(w, "verify-live", lambda s: "EXPECTED_DIGEST" in (s.get("env") or {}))["env"].update({"EXPECTED_DIGEST": "${{ inputs.expected_tree_digest }}"}), "the one from the verified release record")
mut(R, CR, "the rebuild can start without the evidence gate", lambda w: w["jobs"]["rebuild-exact-release"].update({"needs": "guard"}), "must need exactly")
mut(R, CR, "the deploy can start without the digest-checked rebuild", lambda w: w["jobs"]["deploy"].update({"needs": "guard"}), "must need exactly")
mut(R, CR, "the evidence job is bypassed", lambda w: w["jobs"]["verify-release-evidence"].pop("needs"), "must need exactly")
mut(R, CR, "eligibility uses deployment records (from any workflow) instead of the workflow's own runs", lambda w: w["jobs"]["guard"]["steps"].append({"name": "x", "run": 'gh api "repos/$GITHUB_REPOSITORY/deployments?environment=github-pages&sha=$SHA" -q length'}), "Deployments API lookup")
mut(R, CR, "the evidence job gets broader permissions", lambda w: w["jobs"]["verify-release-evidence"]["permissions"].update({"pull-requests": "write"}), "not allowed here")
mut(R, CR, "the evidence job loses its read permissions", lambda w: w["jobs"]["verify-release-evidence"].update({"permissions": {"contents": "read"}}), "exactly contents: read and actions: read")
mut(R, CR, "the evidence job judges main instead of the release commit", lambda w: [s for s in w["jobs"]["verify-release-evidence"]["steps"] if (s.get("with") or {}).get("path") == "release"][0]["with"].update({"ref": "main"}), "must check out the requested release")
mut(R, CR, "the evidence gate is taken from the old release", lambda w: [s for s in w["jobs"]["verify-release-evidence"]["steps"] if (s.get("with") or {}).get("path") == "tools"][0]["with"].update({"ref": "${{ inputs.release_sha }}"}), "must check out the requested release")
mut(R, CR, "the rebuild checks out main", lambda w: jobstep(w, "rebuild-exact-release", is_checkout)["with"].update({"ref": "main"}), "exactly inputs.release_sha")
mut(R, CR, "the rebuild checks out into the repository root", lambda w: jobstep(w, "rebuild-exact-release", is_checkout)["with"].pop("path"), "exactly inputs.release_sha")
mut(R, CR, "a rebuild script runs outside the release checkout", lambda w: jobstep(w, "rebuild-exact-release", lambda s: s.get("run") == "npm ci --ignore-scripts").pop("working-directory"), "must run in release/")
mut(R, CR, "the digest check is removed", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "refusing to deploy" in s.get("run", "")).update({"run": "true"}), "digest equality")
mut(R, CR, "the ancestor check is removed", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "merge-base" in s.get("run", "")).update({"run": '[ "$(git rev-parse HEAD)" = "$SHA" ]'}), "ancestor of main")
mut(R, CR, "the guard stops requiring a main-released commit", lambda w: jobstep(w, "guard", lambda s: "compare/" in s.get("run", "")).update({"run": "true"}), "released from main")
mut(R, CR, "the guard reverts to the raw compare call (a missing commit shows only a bare 404)", lambda w: jobstep(w, "guard", lambda s: "compare/" in s.get("run", "")).update({"run": 'status=$(gh api "repos/$GITHUB_REPOSITORY/compare/$SHA...main" -q .status)\\n[ "$status" = "ahead" ] || exit 1\\n'}), "distinct diagnosis for a commit that does not exist")
mut(R, CR, "the guard no longer separates API failures from a missing commit", lambda w: jobstep(w, "guard", lambda s: "compare/" in s.get("run", "")).update({"run": jobstep(w, "guard", lambda s: "compare/" in s.get("run", ""))["run"].replace("API call failed", "commit missing")}), "distinct diagnosis for GitHub API failures")
mut(R, CR, "the guard stops requiring a full SHA", lambda w: jobstep(w, "guard", lambda s: "[0-9a-f]{40}" in s.get("run", "")).update({"run": "true"}), "40-character SHA")
mut(R, CR, "the guard allows rolling back to the current main", lambda w: jobstep(w, "guard", lambda s: "[0-9a-f]{40}" in s.get("run", "")).update({"run": "[[ $SHA =~ ^[0-9a-f]{40}$ ]]; [[ $D =~ ^[0-9a-f]{64}$ ]]; echo compare/$SHA...main"}), "current main")
mut(R, CR, "the rollback uploads the repository root", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "upload-pages" in s.get("uses", ""))["with"].update({"path": "."}), "exactly release/dist")
mut(R, CR, "live verification uses the current main's manifest", lambda w: jobstep(w, "verify-live", lambda s: "verify-live-site" in s.get("run", "")).update({"run": 'python3 tools/scripts/verify-live-site.py "$SITE_URL" --manifest tools/scripts/publish-manifest.json --expect-digest "$EXPECTED_DIGEST"'}), "RESTORED release's manifest")
mut(R, CR, "live verification checks out main as the release", lambda w: [s for s in w["jobs"]["verify-live"]["steps"] if (s.get("with") or {}).get("path") == "release"][0]["with"].update({"ref": "main"}), "restored release")
mut(R, CR, "the verifier is taken from the old release", lambda w: [s for s in w["jobs"]["verify-live"]["steps"] if (s.get("with") or {}).get("path") == "tools"][0]["with"].update({"ref": "${{ inputs.release_sha }}"}), "verifier from main")
mut(R, CR, "a script switches Pages back to legacy", lambda w: w["jobs"]["guard"]["steps"].append({"run": "gh api --method PATCH repos/x/y/pages -f build_type=legacy"}), "changes repository state")
mut(R, CR, "a run script interpolates the SHA input", lambda w: w["jobs"]["guard"]["steps"].append({"run": "echo ${{ inputs.release_sha }}"}), "script injection")
mut(R, CR, "a rollback job is not main-only", lambda w: w["jobs"]["verify-release-evidence"].pop("if"), "its condition must be exactly")
# an interrupted or superseded rollback must not be mistaken for a completed one
mut(R, CR, "no rollback completion record job", lambda w: w["jobs"].pop("record-rollback"), "unexpected job set")
mut(R, CR, "the completion record does not wait for live verification", lambda w: w["jobs"]["record-rollback"].update({"needs": ["verify-release-evidence", "rebuild-exact-release", "deploy"]}), "must need exactly")
mut(R, CR, "the completion record ignores the real results", lambda w: jobstep(w, "record-rollback", named("Compose the rollback record"))["env"].update({"VERIFY_RESULT": "success"}), "composed from the verified digest")
mut(R, CR, "the rebuild job claims the rollback is complete", lambda w: jobstep(w, "rebuild-exact-release", lambda s: "refusing to deploy" in s.get("run", "")).update({"run": jobstep(w, "rebuild-exact-release", lambda s: "refusing to deploy" in s.get("run", ""))["run"] + '\necho "Rollback completed" >> "$GITHUB_STEP_SUMMARY"'}), "must not claim the rollback is complete")
mut(R, CR, "the rollback record is not uploaded", lambda w: w["jobs"]["record-rollback"].update({"steps": [s for s in w["jobs"]["record-rollback"]["steps"] if s.get("name") != "Upload the rollback record"]}), "must upload rollback-record.json as")
mut(R, CR, "a rollback record is uploaded from another job", lambda w: w["jobs"]["deploy"]["steps"].append(copy.deepcopy(jobstep(w, "record-rollback", named("Upload the rollback record")))), "only the record-rollback job may upload")
mut(R, CR, "a rollback can run concurrently with a deployment", lambda w: w["concurrency"].update({"group": "rollback-only"}), "concurrency")

cross("an extra, unreviewed workflow", lambda f: f.append("deploy2.yml"), lambda p: None, "unreviewed workflow")
cross("a reviewed workflow is missing", lambda f: f.remove("rollback.yml"), lambda p: p.pop("rollback.yml"), "unreviewed workflow")
cross("the CI workflow gains Pages deployment rights", lambda f: None, lambda p: p["validate.yml"]["jobs"]["validate"].update({"permissions": {"pages": "write"}}), "only the deployment workflows")
cross("the CI workflow uploads records", lambda f: None, lambda p: p["validate.yml"]["jobs"]["validate"]["steps"].append({"uses": "actions/upload-artifact@" + W.PINS["actions/upload-artifact"]}), "only the deployment workflows")
cross("the CI workflow gains write access", lambda f: None, lambda p: p["validate.yml"].update({"permissions": {"contents": "write"}}), "read-only")
cross("deployment and rollback stop sharing a concurrency group", lambda f: None, lambda p: p["rollback.yml"]["concurrency"].update({"group": "elsewhere"}), "one concurrency group")

# a malformed YAML file is a failure, never a skip
with tempfile.TemporaryDirectory() as td:
    bad = Path(td) / "bad.yml"
    bad.write_text("jobs: [unclosed\n")
    try:
        W.parse(bad)
    except SystemExit as e:
        ok("not valid YAML" in str(e), "a malformed workflow file fails the test instead of being skipped")
    else:
        ok(False, "a malformed workflow file fails the test")

print("workflow safety: %d checks passed (%d unsafe variants proven to be caught)" % (checks, unsafe_variants))
