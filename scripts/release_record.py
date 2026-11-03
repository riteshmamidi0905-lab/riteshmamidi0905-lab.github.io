#!/usr/bin/env python3
"""Release records: the auditable evidence that a production release was deployed AND verified live.

  python3 scripts/release_record.py create          --out FILE --tree-digest HEX --deploy-result R --verify-result R --manifest PATH      (pages.yml, record-release job)
  python3 scripts/release_record.py create-rollback --out FILE --release-sha SHA --tree-digest HEX --deploy-result R --verify-result R   (rollback.yml, record-rollback job)

A record is composed by a job that depends on the deploy job AND the live-verification job, so it cannot exist unless both succeeded; this script
also refuses to write one unless both results are literally "success", unless the digest equals the digest derived from the publication manifest,
and unless the run is on refs/heads/main. The rollback gate (scripts/verify-release-record.py) re-validates every field against facts it gets
independently from the Actions API, so a record is evidence only together with the run it came from.

Integrity limits (see scripts/RELEASE-CHECKS.md): a record is an Actions artifact, not a signature. Anyone with write access to the repository's
workflows could change what a future run writes, and an administrator can delete artifacts; deletion and expiry make a rollback fail closed."""
import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pages_policy as P

SCHEMA = 1
HEX64 = re.compile(r"^[0-9a-f]{64}$")
SHA40 = re.compile(r"^[0-9a-f]{40}$")
WORKFLOW_PATH = ".github/workflows/pages.yml"
RELEASE_FIELDS = ("schema", "kind", "repository", "commit", "ref", "workflow_ref", "event", "run_id", "run_attempt", "tree_digest", "manifest_path", "manifest_sha256", "file_count",
                  "deploy_result", "live_verification_result", "recorded_after_jobs")


def manifest_identity(manifest_path):
    raw = Path(manifest_path).read_bytes()
    m = json.loads(raw.decode("utf-8"))
    return P.sha256_bytes(raw), len(m["files"]), P.tree_digest({e["path"]: (e["bytes"], e["sha256"]) for e in m["files"]})


def env(name):
    v = os.environ.get(name, "")
    if not v:
        raise SystemExit("required environment variable %s is not set" % name)
    return v


def build_release_record(tree_digest, deploy_result, verify_result, manifest_path):
    if deploy_result != "success" or verify_result != "success":
        raise SystemExit("refusing to write a release record: deploy=%r, live verification=%r (both must be 'success')" % (deploy_result, verify_result))
    if not HEX64.match(tree_digest or ""):
        raise SystemExit("refusing to write a release record: the tree digest is not 64 hex characters")
    if env("GITHUB_REF") != "refs/heads/main":
        raise SystemExit("refusing to write a release record outside refs/heads/main")
    sha, count, derived = manifest_identity(manifest_path)
    if derived != tree_digest:
        raise SystemExit("refusing to write a release record: the digest does not equal the one derived from the publication manifest")
    return {"schema": SCHEMA, "kind": "release", "repository": env("GITHUB_REPOSITORY"), "commit": env("GITHUB_SHA"), "ref": env("GITHUB_REF"),
            "workflow_ref": env("GITHUB_WORKFLOW_REF"), "event": env("GITHUB_EVENT_NAME"), "run_id": int(env("GITHUB_RUN_ID")), "run_attempt": int(env("GITHUB_RUN_ATTEMPT")),
            "tree_digest": tree_digest, "manifest_path": "scripts/publish-manifest.json", "manifest_sha256": sha, "file_count": count,
            "deploy_result": deploy_result, "live_verification_result": verify_result, "recorded_after_jobs": ["deploy", "verify-live"]}


def record_errors(rec, expect):
    """Problems with a release record against what the caller established independently. `expect` keys: repository, commit, run_id, run_attempt, event,
    digest, manifest_sha256, file_count, tree_digest_from_manifest. Empty list means the record matches in every field."""
    if not isinstance(rec, dict):
        return ["the record is not a JSON object"]
    errs = []
    if set(rec) != set(RELEASE_FIELDS):
        errs.append("the record has unexpected or missing fields: %s" % sorted(set(rec) ^ set(RELEASE_FIELDS)))
    checks = (("schema", SCHEMA), ("kind", "release"), ("repository", expect["repository"]), ("commit", expect["commit"]), ("ref", "refs/heads/main"),
              ("event", expect["event"]), ("run_id", expect["run_id"]), ("run_attempt", expect["run_attempt"]), ("manifest_path", "scripts/publish-manifest.json"),
              ("manifest_sha256", expect["manifest_sha256"]), ("file_count", expect["file_count"]), ("deploy_result", "success"), ("live_verification_result", "success"),
              ("recorded_after_jobs", ["deploy", "verify-live"]))
    for k, want in checks:
        if rec.get(k) != want or type(rec.get(k)) is not type(want):
            errs.append("record field %s does not match (expected the value established from the run)" % k)
    wf = rec.get("workflow_ref", "")
    if not (isinstance(wf, str) and wf == "%s/%s@refs/heads/main" % (expect["repository"], WORKFLOW_PATH)):
        errs.append("record field workflow_ref is not the production deploy workflow on main")
    td = rec.get("tree_digest")
    if not (isinstance(td, str) and HEX64.match(td)):
        errs.append("record tree_digest is malformed")
    else:
        if td != expect["tree_digest_from_manifest"]:
            errs.append("the recorded tree digest is not the digest of the publication manifest at that commit")
        if expect.get("digest") is not None and td != expect["digest"]:
            errs.append("the supplied digest does not equal the digest in the release record")
    return errs


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create")
    c.add_argument("--out", required=True)
    c.add_argument("--tree-digest", required=True)
    c.add_argument("--deploy-result", required=True)
    c.add_argument("--verify-result", required=True)
    c.add_argument("--manifest", required=True)
    r = sub.add_parser("create-rollback")
    r.add_argument("--out", required=True)
    r.add_argument("--release-sha", required=True)
    r.add_argument("--tree-digest", required=True)
    r.add_argument("--deploy-result", required=True)
    r.add_argument("--verify-result", required=True)
    a = ap.parse_args(argv)
    if a.cmd == "create":
        rec = build_release_record(a.tree_digest, a.deploy_result, a.verify_result, a.manifest)
    else:
        if a.deploy_result != "success" or a.verify_result != "success":
            raise SystemExit("refusing to write a rollback record: deploy=%r, live verification=%r" % (a.deploy_result, a.verify_result))
        if not SHA40.match(a.release_sha) or not HEX64.match(a.tree_digest):
            raise SystemExit("refusing to write a rollback record: malformed release SHA or digest")
        rec = {"schema": SCHEMA, "kind": "rollback", "repository": env("GITHUB_REPOSITORY"), "restored_commit": a.release_sha, "tree_digest": a.tree_digest,
               "rollback_run_id": int(env("GITHUB_RUN_ID")), "rollback_run_attempt": int(env("GITHUB_RUN_ATTEMPT")), "actor": env("GITHUB_ACTOR"),
               "main_at_rollback": env("GITHUB_SHA"), "deploy_result": "success", "live_verification_result": "success", "status": "COMPLETED"}
    Path(a.out).write_text(json.dumps(rec, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(rec, indent=1, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
