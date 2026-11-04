#!/usr/bin/env python3
"""Rollback eligibility gate: decide whether a commit may be restored, from evidence, and fail closed on anything missing, expired, ambiguous or inconsistent.

  python3 scripts/verify-release-record.py --repo OWNER/REPO --sha FULL_SHA --digest HEX64 --release-dir DIR [--github-output FILE]

A successful workflow run alone is NOT accepted (a run that concluded "success" can contain skipped jobs and steps). A commit qualifies only if ALL of this holds:
  1. the workflow definition at that commit (DIR/.github/workflows/pages.yml) satisfies today's deployment safety rules (scripts/workflow_rules.py): no continue-on-error, no
     extra conditions that can skip a job, no missing dependency; these are invisible in the Actions API, so the definition itself is judged;
  2. a run of THAT workflow (matched by workflow id and file, not by name) exists for that exact commit on main, triggered by a push or a manual run, in this repository (not a fork),
     whose latest attempt completed with conclusion success;
  3. that attempt's jobs are exactly guard, build, deploy, verify-live and record-release, every one completed with conclusion success (none skipped), and each required step
     (the deploy step, the live verification step, the record upload ...) succeeded;
  4. exactly one non-expired release-record artifact exists for that attempt, and it belongs to that run;
  5. every field of the record matches what was established independently: repository, commit, run id, attempt, event, workflow, manifest identity (SHA-256 of the manifest at that
     commit), file count, deploy and live-verification results, and a tree digest equal to the digest derived from that manifest;
  6. the operator-supplied digest equals the recorded digest (the supplied digest is a claim to be checked, never evidence).
If several runs qualify, their recorded digests must agree. On success it writes tree_digest (and release_run_id) to --github-output; the rollback then rebuilds the commit and must
reproduce that recorded digest. Exit 0 only on success."""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import release_record as RR
import workflow_rules as W

WORKFLOW_FILE = ".github/workflows/pages.yml"
EVENTS = ("push", "workflow_dispatch")
REQUIRED_JOBS = list(W.PAGES_NEEDS)


class Reject(Exception):
    """The evidence is missing, expired, ambiguous, inconsistent or unverifiable: the rollback must not proceed."""


def gh(args):
    r = subprocess.run(["gh"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        raise Reject("the GitHub API call failed (gh %s): %s" % (" ".join(args[:2]), r.stderr.strip()[:160]))
    return r.stdout


def gh_json(path):
    try:
        return json.loads(gh(["api", path]))
    except ValueError:
        raise Reject("the GitHub API returned unreadable JSON for %s" % path.split("?")[0])


def check_workflow_identity(repo):
    wf = gh_json("repos/%s/actions/workflows/pages.yml" % repo)
    if wf.get("path") != WORKFLOW_FILE or wf.get("state") != "active" or not isinstance(wf.get("id"), int):
        raise Reject("the production deploy workflow is not an active %s" % WORKFLOW_FILE)
    return wf["id"]


def candidate_runs(repo, wf_id, sha):
    d = gh_json("repos/%s/actions/workflows/%d/runs?head_sha=%s&branch=main&per_page=100" % (repo, wf_id, sha))
    runs = d.get("workflow_runs") or []
    if d.get("total_count", 0) != len(runs):
        raise Reject("too many runs for that commit to evaluate completely")
    return runs


def check_run(run, repo, wf_id, sha):
    e = []
    if run.get("workflow_id") != wf_id:
        e.append("the run belongs to a different workflow")
    if str(run.get("path", "")).split("@")[0] != WORKFLOW_FILE:
        e.append("the run's workflow file is not the production deploy workflow")
    if run.get("head_sha") != sha:
        e.append("the run is for a different commit")
    if run.get("head_branch") != "main":
        e.append("the run was not on main")
    if run.get("event") not in EVENTS:
        e.append("the run was triggered by %r, not a push or a manual run" % run.get("event"))
    if run.get("status") != "completed" or run.get("conclusion") != "success":
        e.append("the run did not complete successfully (status %r, conclusion %r)" % (run.get("status"), run.get("conclusion")))
    if (run.get("repository") or {}).get("full_name") != repo or (run.get("head_repository") or {}).get("full_name") != repo:
        e.append("the run is not from this repository")
    if not isinstance(run.get("run_attempt"), int) or run["run_attempt"] < 1 or not isinstance(run.get("id"), int):
        e.append("the run has no valid id or attempt")
    return e


def check_jobs(repo, run):
    d = gh_json("repos/%s/actions/runs/%d/attempts/%d/jobs?per_page=100" % (repo, run["id"], run["run_attempt"]))
    jobs = d.get("jobs") or []
    e = []
    if d.get("total_count") != len(jobs):
        e.append("the job list is incomplete")
    if sorted(j.get("name") for j in jobs) != sorted(REQUIRED_JOBS):
        e.append("the run's jobs are not exactly %s (found %s)" % (REQUIRED_JOBS, sorted(str(j.get("name")) for j in jobs)))
    for j in jobs:
        nm = j.get("name")
        if j.get("status") != "completed" or j.get("conclusion") != "success":
            e.append("job %s did not succeed (status %r, conclusion %r)" % (nm, j.get("status"), j.get("conclusion")))
        by = {s.get("name"): s for s in j.get("steps") or []}
        for sn in W.REQUIRED_STEPS.get(nm, []):
            s = by.get(sn)
            if s is None:
                e.append("job %s: the required step %r is missing" % (nm, sn))
            elif s.get("status") != "completed" or s.get("conclusion") != "success":
                e.append("job %s: the required step %r did not succeed (conclusion %r)" % (nm, sn, s.get("conclusion")))
    return e


def find_artifact(repo, run, sha):
    name = "release-record-%s-%d-%d" % (sha, run["id"], run["run_attempt"])
    d = gh_json("repos/%s/actions/runs/%d/artifacts?per_page=100" % (repo, run["id"]))
    arts = d.get("artifacts") or []
    if d.get("total_count") != len(arts):
        raise Reject("the artifact list is incomplete")
    mine = [a for a in arts if a.get("name") == name]
    if not mine:
        raise Reject("the release record artifact is missing")
    if len(mine) > 1:
        raise Reject("more than one release record artifact has that name (ambiguous)")
    a = mine[0]
    if a.get("expired") is not False:
        raise Reject("the release record artifact has expired")
    wr = a.get("workflow_run") or {}
    if wr.get("id") != run["id"] or wr.get("head_sha") != sha or wr.get("head_branch") != "main":
        raise Reject("the release record artifact does not belong to that run")
    return name


def fetch_record(repo, run, name):
    with tempfile.TemporaryDirectory() as td:
        gh(["run", "download", str(run["id"]), "-R", repo, "-n", name, "-D", td])
        files = [p for p in Path(td).rglob("*") if p.is_file()]
        if [p.name for p in files] != ["release-record.json"]:
            raise Reject("the release record artifact does not contain exactly release-record.json")
        try:
            return json.loads(files[0].read_text(encoding="utf-8"))
        except ValueError:
            raise Reject("the release record is not valid JSON")


def check_definition(release_dir):
    p = Path(release_dir) / WORKFLOW_FILE
    if not p.is_file():
        raise Reject("that commit has no production deploy workflow")
    try:
        return W.check_pages(W.parse(p))
    except SystemExit as exc:
        raise Reject("the workflow definition at that commit could not be parsed: %s" % str(exc)[:120])


def evaluate(repo, sha, digest, release_dir):
    """Return (record, run). Raises Reject with every reason when the commit does not qualify."""
    defn = check_definition(release_dir)
    if defn:
        raise Reject("the deploy workflow at that commit does not satisfy the deployment safety rules: " + "; ".join(defn[:4]))
    mpath = Path(release_dir) / "scripts" / "publish-manifest.json"
    if not mpath.is_file():
        raise Reject("that commit has no publication manifest")
    msha, mcount, mderived = RR.manifest_identity(mpath)
    wf_id = check_workflow_identity(repo)
    runs = candidate_runs(repo, wf_id, sha)
    if not runs:
        raise Reject("no production deploy run exists for that commit")
    valid, why = [], []
    for run in runs:
        try:
            errs = check_run(run, repo, wf_id, sha)
            if not errs:
                errs = check_jobs(repo, run)
            if not errs:
                name = find_artifact(repo, run, sha)
                rec = fetch_record(repo, run, name)
                errs = RR.record_errors(rec, {"repository": repo, "commit": sha, "run_id": run["id"], "run_attempt": run["run_attempt"], "event": run["event"], "digest": digest,
                                              "manifest_sha256": msha, "file_count": mcount, "tree_digest_from_manifest": mderived})
        except Reject as exc:
            errs = [str(exc)]
        if errs:
            why.append("run %s: %s" % (run.get("id"), "; ".join(errs[:5])))
        else:
            valid.append((run, rec))
    if not valid:
        raise Reject("no run of the production deploy workflow qualifies for that commit. " + " | ".join(why[:5]))
    if len({rec["tree_digest"] for _, rec in valid}) != 1:
        raise Reject("qualifying runs disagree about the release digest (inconsistent evidence)")
    return max(valid, key=lambda x: x[0]["id"])[1], max(valid, key=lambda x: x[0]["id"])[0]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo", required=True)
    ap.add_argument("--sha", required=True)
    ap.add_argument("--digest", required=True)
    ap.add_argument("--release-dir", required=True)
    ap.add_argument("--github-output", default=None)
    a = ap.parse_args(argv)
    try:
        if not re.fullmatch(r"[0-9a-f]{40}", a.sha) or not re.fullmatch(r"[0-9a-f]{64}", a.digest) or not re.fullmatch(r"[\w.-]+/[\w.-]+", a.repo):
            raise Reject("the repository, the full 40-character commit SHA or the 64-character digest is malformed")
        rec, run = evaluate(a.repo, a.sha, a.digest, a.release_dir)
    except Reject as exc:
        print("ROLLBACK REFUSED (fail closed): %s" % exc)
        return 1
    except Exception as exc:                                    # anything unexpected is a refusal, never a pass
        print("ROLLBACK REFUSED (fail closed): unexpected %s while verifying the evidence" % type(exc).__name__)
        return 1
    print("RELEASE EVIDENCE VERIFIED: commit %s was deployed and verified live by run %d (attempt %d, %s); recorded tree digest %s equals the supplied digest and the manifest at that commit"
          % (a.sha, run["id"], run["run_attempt"], run["event"], rec["tree_digest"]))
    if a.github_output:
        with open(a.github_output, "a", encoding="utf-8") as fh:
            fh.write("tree_digest=%s\nrelease_run_id=%d\n" % (rec["tree_digest"], run["id"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
