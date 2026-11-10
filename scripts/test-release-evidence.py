#!/usr/bin/env python3
"""Tests for the rollback eligibility gate (scripts/verify-release-record.py) and the release record (scripts/release_record.py).

The REAL gate script runs against a fake `gh` that serves GitHub-API-shaped responses (the field names were checked against real responses from the Actions API). A baseline
world passes; then dozens of ways the evidence can be missing, wrong, expired, ambiguous or forged are applied one at a time and each must be REFUSED, with a reason.
To prove the negative tests are not vacuous, the same scenarios are also run against deliberately weakened implementations of the gate (it trusts the run conclusion only, skips the
job check, the artifact, the record fields, the digest comparison, the run identity or the workflow definition); each weakened gate must wrongly ACCEPT the scenarios it no longer
guards against. Run:  python3 scripts/test-release-evidence.py"""
import contextlib
import copy
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import release_record as RR
import workflow_rules as W

GATE = HERE / "verify-release-record.py"
REPO = "riteshmamidi0905-lab/riteshmamidi0905-lab.github.io"
SHA = "c" * 40
RUN, ATT, WFID = 222, 1, 111
checks = 0
dec = lambda *c: "".join(map(chr, c))


def ok(cond, name):
    global checks
    assert cond, "FAILED: " + name
    checks += 1


FAKE_GH = '''#!/usr/bin/env python3
import json, os, re, shutil, sys
w = json.load(open(os.environ["FAKE_GH_WORLD"]))
a = sys.argv[1:]
if w.get("gh_down"):
    sys.stderr.write("HTTP 500: server error"); sys.exit(1)
if a[0] == "api":
    path = a[1]; base = path.split("?")[0]
    if re.fullmatch(r"repos/[^/]+/[^/]+/actions/workflows/pages\\.yml", base):
        print(json.dumps(w["wf"])); sys.exit(0)
    m = re.fullmatch(r"repos/[^/]+/[^/]+/actions/workflows/(\\d+)/runs", base)
    if m:
        runs = w["runs"]; print(json.dumps({"total_count": w.get("runs_total", len(runs)), "workflow_runs": runs})); sys.exit(0)
    m = re.fullmatch(r"repos/[^/]+/[^/]+/actions/runs/(\\d+)/attempts/(\\d+)/jobs", base)
    if m:
        jobs = w["jobs"].get(m.group(1) + "/" + m.group(2))
        if jobs is None: sys.stderr.write("HTTP 404"); sys.exit(1)
        print(json.dumps({"total_count": len(jobs), "jobs": jobs})); sys.exit(0)
    m = re.fullmatch(r"repos/[^/]+/[^/]+/actions/runs/(\\d+)/artifacts", base)
    if m:
        arts = w["artifacts"].get(m.group(1), []); print(json.dumps({"total_count": len(arts), "artifacts": arts})); sys.exit(0)
    sys.stderr.write("HTTP 404 " + base); sys.exit(1)
if a[:2] == ["run", "download"]:
    rid = a[2]; name = a[a.index("-n") + 1]; dest = a[a.index("-D") + 1]
    key = rid + "/" + name
    if key not in w["records"]: sys.stderr.write("no such artifact"); sys.exit(1)
    os.makedirs(dest, exist_ok=True)
    raw = w["records"][key]
    open(os.path.join(dest, "release-record.json"), "w").write(raw if isinstance(raw, str) else json.dumps(raw))
    for extra in w.get("extra_files", []): open(os.path.join(dest, extra), "w").write("x")
    sys.exit(0)
sys.exit(1)
'''


def make_release_dir(base, name="release", mutate_workflow=None, drop=()):
    d = Path(base) / name
    (d / ".github" / "workflows").mkdir(parents=True)
    (d / "scripts").mkdir()
    if "workflow" not in drop:
        shutil.copy(ROOT / ".github" / "workflows" / "pages.yml", d / ".github" / "workflows" / "pages.yml")
        if mutate_workflow:
            p = d / ".github" / "workflows" / "pages.yml"
            p.write_text(mutate_workflow(p.read_text()))
    if "manifest" not in drop:
        shutil.copy(HERE / "publish-manifest.json", d / "scripts" / "publish-manifest.json")
    return d


MSHA, MCOUNT, MDIGEST = RR.manifest_identity(HERE / "publish-manifest.json")


def good_world():
    rec = {"schema": 1, "kind": "release", "repository": REPO, "commit": SHA, "ref": "refs/heads/main", "workflow_ref": "%s/.github/workflows/pages.yml@refs/heads/main" % REPO,
           "event": "push", "run_id": RUN, "run_attempt": ATT, "tree_digest": MDIGEST, "manifest_path": "scripts/publish-manifest.json", "manifest_sha256": MSHA, "file_count": MCOUNT,
           "deploy_result": "success", "live_verification_result": "success", "recorded_after_jobs": ["deploy", "verify-live"]}
    run = {"id": RUN, "workflow_id": WFID, "path": ".github/workflows/pages.yml", "head_sha": SHA, "head_branch": "main", "event": "push", "status": "completed", "conclusion": "success",
           "run_attempt": ATT, "repository": {"full_name": REPO}, "head_repository": {"full_name": REPO}}
    jobs = []
    for jn in W.PAGES_NEEDS:
        steps = [{"name": "Set up job", "status": "completed", "conclusion": "success"}] + [{"name": s, "status": "completed", "conclusion": "success"} for s in W.REQUIRED_STEPS[jn]] + \
                [{"name": "Complete job", "status": "completed", "conclusion": "success"}]
        jobs.append({"name": jn, "status": "completed", "conclusion": "success", "steps": steps})
    name = "release-record-%s-%d-%d" % (SHA, RUN, ATT)
    art = {"name": name, "expired": False, "workflow_run": {"id": RUN, "head_sha": SHA, "head_branch": "main"}}
    return {"wf": {"id": WFID, "path": ".github/workflows/pages.yml", "state": "active"}, "runs": [run], "jobs": {"%d/%d" % (RUN, ATT): jobs}, "artifacts": {str(RUN): [art]},
            "records": {"%d/%s" % (RUN, name): rec}}


class Env:
    def __init__(self, td):
        self.td = Path(td)
        (self.td / "bin").mkdir()
        gh = self.td / "bin" / "gh"
        gh.write_text(FAKE_GH)
        gh.chmod(0o755)
        self.n = 0

    def run(self, world, digest=MDIGEST, release_dir=None, sha=SHA, repo=REPO, extra_args=()):
        self.n += 1
        wf = self.td / ("world%d.json" % self.n)
        wf.write_text(json.dumps(world))
        out = self.td / ("gho%d.txt" % self.n)
        env = dict(os.environ, PATH=str(self.td / "bin") + os.pathsep + os.environ["PATH"], FAKE_GH_WORLD=str(wf))
        r = subprocess.run([sys.executable, str(GATE), "--repo", repo, "--sha", sha, "--digest", digest, "--release-dir", str(release_dir or self.good_release), "--github-output", str(out), *extra_args],
                           capture_output=True, text=True, env=env)
        return r.returncode, r.stdout + r.stderr, (out.read_text() if out.exists() else "")

    def inprocess(self, mod, world, digest=MDIGEST, release_dir=None):
        self.n += 1
        wf = self.td / ("world%d.json" % self.n)
        wf.write_text(json.dumps(world))
        old = dict(os.environ)
        os.environ["PATH"] = str(self.td / "bin") + os.pathsep + old["PATH"]
        os.environ["FAKE_GH_WORLD"] = str(wf)
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                code = mod.main(["--repo", REPO, "--sha", SHA, "--digest", digest, "--release-dir", str(release_dir or self.good_release)])
        finally:
            os.environ.clear()
            os.environ.update(old)
        return code, buf.getvalue()


def load_gate():
    """A fresh copy of the gate with its own copy of the record module, so weakening one never leaks into another test."""
    import types
    spec = importlib.util.spec_from_file_location("verify_release_record_under_test", GATE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    private = types.ModuleType("release_record_copy")
    private.__dict__.update(RR.__dict__)
    mod.RR = private
    return mod


def M(**kw):
    return kw


with tempfile.TemporaryDirectory() as td:
    E = Env(td)
    E.good_release = make_release_dir(td)

    # ---- baseline and positives
    code, out, gho = E.run(good_world())
    ok(code == 0 and "RELEASE EVIDENCE VERIFIED" in out and ("tree_digest=%s" % MDIGEST) in gho and "release_run_id=%d" % RUN in gho, "baseline: a deployed, verified release with a matching record qualifies")
    w = good_world()
    other = copy.deepcopy(w["runs"][0])
    other.update(id=333, event="workflow_dispatch", conclusion="failure")
    w["runs"].insert(0, other)
    code, out, gho = E.run(w)
    ok(code == 0, "a failed run for the same commit is ignored when another run qualifies")
    w = good_world()
    second = copy.deepcopy(w["runs"][0])
    second.update(id=444, event="workflow_dispatch")
    w["runs"].append(second)
    jobs2 = copy.deepcopy(w["jobs"]["%d/%d" % (RUN, ATT)])
    w["jobs"]["444/1"] = jobs2
    n2 = "release-record-%s-444-1" % SHA
    art2 = copy.deepcopy(w["artifacts"][str(RUN)][0])
    art2.update(name=n2, workflow_run={"id": 444, "head_sha": SHA, "head_branch": "main"})
    w["artifacts"]["444"] = [art2]
    rec2 = copy.deepcopy(w["records"]["%d/%s" % (RUN, w["artifacts"][str(RUN)][0]["name"])])
    rec2.update(run_id=444, event="workflow_dispatch")
    w["records"]["444/" + n2] = rec2
    code, out, gho = E.run(w)
    ok(code == 0 and "release_run_id=444" in gho, "a manual redeploy of the same commit also qualifies; the latest qualifying run is used")

    # ---- negative scenarios: each must be refused, with a reason. (label, world mutator, expected text)
    def jobs_of(w):
        return w["jobs"]["%d/%d" % (RUN, ATT)]

    def job(w, name):
        return next(j for j in jobs_of(w) if j["name"] == name)

    def rec_of(w):
        return next(iter(w["records"].values()))

    def set_rec(**kw):
        return lambda w: rec_of(w).update(kw)

    NEG = []
    def neg(label, mutator, expect, group, **kw):
        NEG.append((label, mutator, expect, group, kw))

    neg("no run exists for the commit", lambda w: w.update(runs=[]), "no production deploy run exists", "norun")
    neg("the run belongs to another workflow id", lambda w: w["runs"][0].update(workflow_id=999), "different workflow", "identity")
    neg("the run's workflow file is validate.yml (an unrelated workflow)", lambda w: w["runs"][0].update(path=".github/workflows/validate.yml"), "not the production deploy workflow", "identity")
    neg("the run is for a different commit", lambda w: w["runs"][0].update(head_sha="d" * 40), "different commit", "identity")
    neg("the run was on a feature branch", lambda w: w["runs"][0].update(head_branch="feature"), "not on main", "identity")
    neg("the run was a pull_request", lambda w: w["runs"][0].update(event="pull_request"), "not a push or a manual run", "event")
    neg("the run was a schedule", lambda w: w["runs"][0].update(event="schedule"), "not a push or a manual run", "event")
    neg("the run failed", lambda w: w["runs"][0].update(conclusion="failure"), "did not complete successfully", "conclusion")
    neg("the run was cancelled", lambda w: w["runs"][0].update(conclusion="cancelled"), "did not complete successfully", "conclusion")
    neg("the run was skipped", lambda w: w["runs"][0].update(conclusion="skipped"), "did not complete successfully", "conclusion")
    neg("the run is still in progress", lambda w: w["runs"][0].update(status="in_progress", conclusion=None), "did not complete successfully", "conclusion")
    neg("the run came from a fork", lambda w: w["runs"][0].update(head_repository={"full_name": "someone/fork"}), "not from this repository", "identity")
    neg("the run is in another repository", lambda w: w["runs"][0].update(repository={"full_name": "someone/other"}), "not from this repository", "identity")
    neg("the deploy job was SKIPPED although the run succeeded", lambda w: job(w, "deploy").update(conclusion="skipped"), "job deploy did not succeed", "jobs")
    neg("the live verification job was skipped", lambda w: job(w, "verify-live").update(conclusion="skipped"), "job verify-live did not succeed", "jobs")
    neg("the live verification job failed (run still green)", lambda w: job(w, "verify-live").update(conclusion="failure"), "job verify-live did not succeed", "jobs")
    neg("the record job was skipped", lambda w: job(w, "record-release").update(conclusion="skipped"), "job record-release did not succeed", "jobs")
    neg("the deploy job was cancelled", lambda w: job(w, "deploy").update(conclusion="cancelled"), "job deploy did not succeed", "jobs")
    neg("the deploy step itself was skipped inside a successful job", lambda w: next(s for s in job(w, "deploy")["steps"] if s["name"] == "Deploy to GitHub Pages").update(conclusion="skipped"), "required step 'Deploy to GitHub Pages' did not succeed", "jobs")
    neg("the live verification step was skipped inside a successful job", lambda w: next(s for s in job(w, "verify-live")["steps"] if s["name"] == "Verify the live site").update(conclusion="skipped"), "required step 'Verify the live site' did not succeed", "jobs")
    neg("the required deploy step is missing from the job", lambda w: job(w, "deploy").update(steps=[s for s in job(w, "deploy")["steps"] if s["name"] != "Deploy to GitHub Pages"]), "required step 'Deploy to GitHub Pages' is missing", "jobs")
    neg("the record upload step failed", lambda w: next(s for s in job(w, "record-release")["steps"] if s["name"] == "Upload the release record").update(conclusion="failure"), "required step 'Upload the release record' did not succeed", "jobs")
    neg("an extra, unexpected job ran", lambda w: jobs_of(w).append({"name": "extra", "status": "completed", "conclusion": "success", "steps": []}), "not exactly", "jobs")
    neg("the verify-live job is missing", lambda w: w["jobs"].update({"%d/%d" % (RUN, ATT): [j for j in jobs_of(w) if j["name"] != "verify-live"]}), "not exactly", "jobs")
    neg("the jobs of that attempt cannot be read", lambda w: w["jobs"].clear(), "GitHub API call failed", "jobs")
    neg("no release record artifact exists", lambda w: w["artifacts"].update({str(RUN): []}), "artifact is missing", "artifact")
    neg("the release record artifact has expired", lambda w: w["artifacts"][str(RUN)][0].update(expired=True), "has expired", "artifact")
    neg("two artifacts share the record's name (ambiguous)", lambda w: w["artifacts"][str(RUN)].append(copy.deepcopy(w["artifacts"][str(RUN)][0])), "ambiguous", "artifact")
    neg("the artifact belongs to another run", lambda w: w["artifacts"][str(RUN)][0].update(workflow_run={"id": 999, "head_sha": SHA, "head_branch": "main"}), "does not belong to that run", "artifact")
    neg("the artifact was produced for another commit", lambda w: w["artifacts"][str(RUN)][0].update(workflow_run={"id": RUN, "head_sha": "e" * 40, "head_branch": "main"}), "does not belong to that run", "artifact")
    neg("the artifact was produced on another branch", lambda w: w["artifacts"][str(RUN)][0].update(workflow_run={"id": RUN, "head_sha": SHA, "head_branch": "x"}), "does not belong to that run", "artifact")
    neg("the artifact name is for an earlier attempt only", lambda w: (w["runs"][0].update(run_attempt=2), w["jobs"].update({"%d/2" % RUN: copy.deepcopy(jobs_of(w))})), "artifact is missing", "attempt")
    neg("the artifact cannot be downloaded", lambda w: w["records"].clear(), "GitHub API call failed", "artifact")
    neg("the artifact holds extra files", lambda w: w.update(extra_files=["notes.txt"]), "exactly release-record.json", "artifact")
    neg("the record is not valid JSON", lambda w: w["records"].update({k: "{broken" for k in w["records"]}), "not valid JSON", "artifact")
    neg("the record is for another commit", set_rec(commit="d" * 40), "field commit does not match", "record")
    neg("the record is for another repository", set_rec(repository="someone/other"), "field repository does not match", "record")
    neg("the record names another run", set_rec(run_id=999), "field run_id does not match", "record")
    neg("the record names another attempt", set_rec(run_attempt=5), "field run_attempt does not match", "record")
    neg("the record names another event", set_rec(event="workflow_dispatch"), "field event does not match", "record")
    neg("the record names another workflow", set_rec(workflow_ref="%s/.github/workflows/rollback.yml@refs/heads/main" % REPO), "workflow_ref is not the production deploy workflow", "record")
    neg("the record names another ref", set_rec(ref="refs/heads/feature"), "field ref does not match", "record")
    neg("the record claims the deploy failed", set_rec(deploy_result="failure"), "field deploy_result does not match", "record")
    neg("the record claims verification is pending", set_rec(live_verification_result="pending"), "field live_verification_result does not match", "record")
    neg("the record lists other jobs", set_rec(recorded_after_jobs=["deploy"]), "field recorded_after_jobs does not match", "record")
    neg("the record has another manifest hash", set_rec(manifest_sha256="0" * 64), "field manifest_sha256 does not match", "record")
    neg("the record has another file count", set_rec(file_count=7), "field file_count does not match", "record")
    neg("the record has another schema", set_rec(schema=2), "field schema does not match", "record")
    neg("the record is a rollback record", set_rec(kind="rollback"), "field kind does not match", "record")
    neg("the record has an extra field", set_rec(extra="x"), "unexpected or missing fields", "record")
    neg("the recorded digest is not the manifest's digest", set_rec(tree_digest="1" * 64), "not the digest of the publication manifest", "record")
    neg("the recorded digest is malformed", set_rec(tree_digest="xyz"), "tree_digest is malformed", "record")
    neg("the record is a JSON array", lambda w: w["records"].update({k: [1] for k in w["records"]}), "not a JSON object", "shape")   # also caught by the fail-closed catch-all: no weakened variant can accept it
    neg("the workflow identity is not pages.yml", lambda w: w["wf"].update(path=".github/workflows/other.yml"), "not an active", "wfidentity")
    neg("the production deploy workflow is disabled", lambda w: w["wf"].update(state="disabled_manually"), "not an active", "wfidentity")
    neg("too many runs to evaluate", lambda w: w.update(runs_total=300), "too many runs", "toomany")
    neg("the GitHub API is down", lambda w: w.update(gh_down=True), "GitHub API call failed", "api")

    results = {}
    for label, mutator, expect, group, kw in NEG:
        w = good_world()
        mutator(w)
        code, out, gho = E.run(w)
        ok(code == 1 and "ROLLBACK REFUSED" in out and expect in out and not gho, "refused: %s (expected %r; got %r)" % (label, expect, out.strip()[:160]))
        results[label] = (group, w)

    # ---- inputs and the operator-supplied digest are claims, not evidence
    code, out, gho = E.run(good_world(), digest="2" * 64)
    ok(code == 1 and "supplied digest does not equal the digest in the release record" in out and not gho, "refused: a supplied digest that differs from the release record (the operator's digest is not evidence)")
    ok(E.run(good_world(), digest=MDIGEST.upper())[0] == 1, "refused: an upper-case digest")
    ok(E.run(good_world(), digest="abc")[0] == 1, "refused: a short digest")
    ok(E.run(good_world(), sha="abc123")[0] == 1, "refused: a short commit SHA")
    ok(E.run(good_world(), sha="C" * 40)[0] == 1, "refused: an upper-case commit SHA")
    ok(E.run(good_world(), repo="not-a-repo")[0] == 1, "refused: a malformed repository name")

    # ---- the workflow definition at the release commit is judged too (continue-on-error is invisible in the API)
    def defn(label, mutate, expect, **kw):
        rd = make_release_dir(td, "rel%d" % checks, mutate_workflow=mutate, **kw)
        code, out, gho = E.run(good_world(), release_dir=rd)
        ok(code == 1 and "ROLLBACK REFUSED" in out and expect in out, "refused: %s (got %r)" % (label, out.strip()[:140]))
    defn("the deploy job at that commit used continue-on-error", lambda t: t.replace("    name: deploy\n    needs: build\n", "    name: deploy\n    needs: build\n    continue-on-error: true\n"), "continue-on-error")
    defn("the live verification job at that commit used continue-on-error", lambda t: t.replace("    name: verify-live\n    needs: [build, deploy]\n", "    name: verify-live\n    needs: [build, deploy]\n    continue-on-error: true\n"), "continue-on-error")
    defn("the deploy job at that commit had an extra skip condition", lambda t: t.replace("  deploy:\n    name: deploy\n    needs: build\n    if: github.ref == 'refs/heads/main'", "  deploy:\n    name: deploy\n    needs: build\n    if: github.ref == 'refs/heads/main' && vars.DEPLOY == 'yes'"), "condition must be exactly")
    defn("the record job at that commit ran without waiting for live verification", lambda t: t.replace("needs: [build, deploy, verify-live]       # runs only", "needs: [build, deploy]       # runs only"), "must need exactly")
    defn("the deploy workflow at that commit had no record job", lambda t: t[:t.index("  record-release:")], "unexpected job set")
    defn("the deploy workflow at that commit was triggered by pull requests", lambda t: t.replace("  workflow_dispatch: {}\npermissions", "  workflow_dispatch: {}\n  pull_request:\npermissions"), "forbidden trigger")
    defn("that commit has no deploy workflow file", None, "no production deploy workflow", drop=("workflow",))
    defn("that commit has no publication manifest", None, "no publication manifest", drop=("manifest",))
    defn("the deploy workflow at that commit is not valid YAML", lambda t: "jobs: [unclosed\n", "could not be parsed")

    # ---- every negative test must FAIL against an intentionally unsafe gate: each weakened implementation wrongly accepts what it no longer guards
    def accepts(label, patch, groups, extra_defn=False):
        """Run every scenario of the given groups against the weakened gate; at least one must now be ACCEPTED, and each group's scenarios must all be accepted if only that check guarded them."""
        accepted, total = 0, 0
        for lab, (grp, w) in results.items():
            if grp not in groups:
                continue
            mod = load_gate()
            patch(mod)
            code, out = E.inprocess(mod, w)
            total += 1
            accepted += (code == 0)
        ok(total > 0 and accepted == total, "weakened gate [%s] wrongly ACCEPTS all %d scenarios it no longer guards (%d accepted): the negative tests detect it" % (label, total, accepted))

    good_rec = rec_of(good_world())
    good_run = good_world()["runs"][0]

    def trust_run_only(m):                       # (a) the run conclusion is all that is checked
        m.check_jobs = lambda repo, run: []
        m.find_artifact = lambda repo, run, sha: "x"
        m.fetch_record = lambda repo, run, name: {"tree_digest": MDIGEST}
        m.RR.record_errors = lambda rec, expect: []
    for grp in ("jobs", "artifact", "record", "shape", "attempt"):
        accepts("workflow-level success only (%s scenarios)" % grp, trust_run_only, {grp})
    accepts("job and step results ignored", lambda m: setattr(m, "check_jobs", lambda repo, run: []), {"jobs"})
    accepts("release record artifact not required", lambda m: (setattr(m, "find_artifact", lambda repo, run, sha: "x"), setattr(m, "fetch_record", lambda repo, run, name: copy.deepcopy(good_rec))), {"artifact"})
    accepts("record fields not validated", lambda m: setattr(m.RR, "record_errors", lambda rec, expect: []), {"record"})
    accepts("run identity not checked (workflow, commit, branch, fork, repository)", lambda m: setattr(m, "check_run", lambda run, repo, wf_id, sha: []), {"identity"})
    accepts("run conclusion not checked", lambda m: setattr(m, "check_run", lambda run, repo, wf_id, sha: []), {"conclusion"})
    accepts("run trigger not checked by the run or the record", lambda m: (setattr(m, "check_run", lambda run, repo, wf_id, sha: []), setattr(m.RR, "record_errors", lambda rec, expect: [])), {"event"})
    accepts("workflow identity not checked", lambda m: setattr(m, "check_workflow_identity", lambda repo: WFID), {"wfidentity"})
    accepts("a missing run is replaced by an assumed one", lambda m: setattr(m, "candidate_runs", (lambda orig: (lambda repo, wf_id, sha: orig(repo, wf_id, sha) or [copy.deepcopy(good_run)]))(m.candidate_runs)), {"norun"})
    accepts("the run-count bound is ignored", lambda m: setattr(m, "candidate_runs", lambda repo, wf_id, sha: m.gh_json("repos/%s/actions/workflows/%d/runs?head_sha=%s&branch=main&per_page=100" % (repo, wf_id, sha)).get("workflow_runs") or []), {"toomany"})

    def swallow_api_errors(m):                   # an unreachable API is treated as "fine"
        orig_eval = m.evaluate
        def lenient(repo, sha, digest, release_dir):
            try:
                return orig_eval(repo, sha, digest, release_dir)
            except m.Reject as exc:
                if "GitHub API call failed" in str(exc):
                    return copy.deepcopy(good_rec), copy.deepcopy(good_run)
                raise
        m.evaluate = lenient
    accepts("GitHub API failures are swallowed", swallow_api_errors, {"api"})
    # (f) operator-supplied digest trusted without comparing it with the record
    orig = RR.record_errors
    mod = load_gate()
    mod.RR.record_errors = lambda rec, expect: orig(rec, dict(expect, digest=None))
    code, out = E.inprocess(mod, good_world(), digest="2" * 64)
    ok(code == 0, "weakened gate [operator-supplied digest never compared with the record] wrongly ACCEPTS a digest that differs from the release record: the negative test detects it")
    # (g) the workflow definition at the release commit is not judged: every definition scenario below is then wrongly accepted
    DEFN_SCENARIOS = [
        ("continue-on-error on the deploy job", lambda t: t.replace("    name: deploy\n    needs: build\n", "    name: deploy\n    needs: build\n    continue-on-error: true\n")),
        ("continue-on-error on the live verification job", lambda t: t.replace("    name: verify-live\n    needs: [build, deploy]\n", "    name: verify-live\n    needs: [build, deploy]\n    continue-on-error: true\n")),
        ("an extra skip condition on the deploy job", lambda t: t.replace("  deploy:\n    name: deploy\n    needs: build\n    if: github.ref == 'refs/heads/main'", "  deploy:\n    name: deploy\n    needs: build\n    if: github.ref == 'refs/heads/main' && vars.DEPLOY == 'yes'")),
        ("a record job that does not wait for live verification", lambda t: t.replace("needs: [build, deploy, verify-live]       # runs only", "needs: [build, deploy]       # runs only")),
        ("a deploy workflow with no record job", lambda t: t[:t.index("  record-release:")]),
        ("a deploy workflow triggered by pull requests", lambda t: t.replace("  workflow_dispatch: {}\npermissions", "  workflow_dispatch: {}\n  pull_request:\npermissions")),
    ]
    for label, mutate in DEFN_SCENARIOS:
        rd = make_release_dir(td, "weak%d" % checks, mutate_workflow=mutate)
        mod = load_gate()
        mod.check_definition = lambda release_dir: []
        code, out = E.inprocess(mod, good_world(), release_dir=rd)
        ok(code == 0, "weakened gate [workflow definition not judged] wrongly ACCEPTS: %s" % label)
        code, out, gho = E.run(good_world(), release_dir=rd)
        ok(code == 1, "...while the real gate refuses it: %s" % label)

# ---- the release record itself
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    envs = {"GITHUB_REPOSITORY": REPO, "GITHUB_SHA": SHA, "GITHUB_REF": "refs/heads/main", "GITHUB_WORKFLOW_REF": "%s/.github/workflows/pages.yml@refs/heads/main" % REPO,
            "GITHUB_EVENT_NAME": "push", "GITHUB_RUN_ID": str(RUN), "GITHUB_RUN_ATTEMPT": "1", "GITHUB_ACTOR": "someone"}

    def create(*extra, env_over=None, cmd="create"):
        env = dict(os.environ, **envs)
        env.update(env_over or {})
        args = [sys.executable, str(HERE / "release_record.py"), cmd, "--out", str(td / "rec.json")] + list(extra)
        return subprocess.run(args, capture_output=True, text=True, env=env)
    base = ["--tree-digest", MDIGEST, "--deploy-result", "success", "--verify-result", "success", "--manifest", str(HERE / "publish-manifest.json")]
    r = create(*base)
    rec = json.loads((td / "rec.json").read_text())
    ok(r.returncode == 0 and rec["commit"] == SHA and rec["run_id"] == RUN and rec["tree_digest"] == MDIGEST and rec["manifest_sha256"] == MSHA and rec["file_count"] == MCOUNT, "a release record is composed from the run, the manifest and the recorded digest")
    ok(RR.record_errors(rec, {"repository": REPO, "commit": SHA, "run_id": RUN, "run_attempt": 1, "event": "push", "digest": MDIGEST, "manifest_sha256": MSHA, "file_count": MCOUNT, "tree_digest_from_manifest": MDIGEST}) == [], "a freshly composed record validates against the facts of its run")
    (td / "rec.json").unlink()
    for label, extra, over in (("the deploy did not succeed", ["--tree-digest", MDIGEST, "--deploy-result", "failure", "--verify-result", "success", "--manifest", str(HERE / "publish-manifest.json")], None),
                               ("live verification did not succeed", ["--tree-digest", MDIGEST, "--deploy-result", "success", "--verify-result", "failure", "--manifest", str(HERE / "publish-manifest.json")], None),
                               ("live verification was skipped", ["--tree-digest", MDIGEST, "--deploy-result", "success", "--verify-result", "skipped", "--manifest", str(HERE / "publish-manifest.json")], None),
                               ("live verification has not run (empty result)", ["--tree-digest", MDIGEST, "--deploy-result", "success", "--verify-result", "", "--manifest", str(HERE / "publish-manifest.json")], None),
                               ("the digest is not the manifest's digest", ["--tree-digest", "1" * 64, "--deploy-result", "success", "--verify-result", "success", "--manifest", str(HERE / "publish-manifest.json")], None),
                               ("the digest is malformed", ["--tree-digest", "xyz", "--deploy-result", "success", "--verify-result", "success", "--manifest", str(HERE / "publish-manifest.json")], None),
                               ("the run is not on main", base, {"GITHUB_REF": "refs/heads/feature"}),
                               ("a required environment variable is missing", base, {"GITHUB_RUN_ID": ""})):
        r = create(*extra, env_over=over)
        ok(r.returncode != 0 and not (td / "rec.json").exists(), "no release record is written when %s" % label)
    rr = [sys.executable, str(HERE / "release_record.py"), "create-rollback", "--out", str(td / "rb.json"), "--release-sha", SHA, "--tree-digest", MDIGEST, "--deploy-result", "success", "--verify-result", "success"]
    r = subprocess.run(rr, capture_output=True, text=True, env=dict(os.environ, **envs))
    rb = json.loads((td / "rb.json").read_text())
    ok(r.returncode == 0 and rb["kind"] == "rollback" and rb["status"] == "COMPLETED" and rb["restored_commit"] == SHA and rb["rollback_run_id"] == RUN, "a rollback record names the restored commit, digest and run, and is the only thing that says COMPLETED")
    (td / "rb.json").unlink()
    r = subprocess.run(rr[:-1] + ["failure"], capture_output=True, text=True, env=dict(os.environ, **envs))
    ok(r.returncode != 0 and not (td / "rb.json").exists(), "no rollback record is written unless the deploy and the live verification both succeeded")

print("release evidence: %d checks passed (%d evidence scenarios and %d workflow-definition scenarios refused by the real gate, each also shown to be accepted by a weakened gate)" % (checks, len(NEG), 6))
