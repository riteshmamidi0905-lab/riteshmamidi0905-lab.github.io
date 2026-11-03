"""Safety rules for the production deployment (pages.yml) and rollback (rollback.yml) workflows, evaluated on a PARSED workflow.

Two users share these rules so they cannot drift apart:
  * scripts/test-workflows.py applies them to the workflows in the repository and proves each rule bites with unsafe variants;
  * scripts/verify-release-record.py applies check_pages() to the pages.yml that existed at a release commit, because things like continue-on-error
    are invisible in the Actions API: a rollback may only restore a release that was deployed by a workflow that satisfied these rules.

YAML is parsed with a real parser (Ruby's Psych, which the GitHub runner image provides; there is no PyYAML). If Ruby is missing the parse FAILS."""
import json
import re
import shutil
import subprocess

SITE_REPO = "riteshmamidi0905-lab/riteshmamidi0905-lab.github.io"
MAIN_ONLY = "github.ref == 'refs/heads/main'"
GUARD_IF = "github.repository == '%s' && github.ref == 'refs/heads/main'" % SITE_REPO
PINS = {"actions/checkout": "11d5960a326750d5838078e36cf38b85af677262", "actions/setup-node": "49933ea5288caeca8642d1e84afbd3f7d6820020",
        "actions/upload-pages-artifact": "56afc609e74202658d3ffba0e8f6dda462b719fa", "actions/deploy-pages": "d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e",
        "actions/upload-artifact": "ea165f8d65b6e75b540449e92b4886f43607fa02"}
FORBIDDEN_TRIGGERS = {"pull_request", "pull_request_target", "workflow_run", "schedule", "issue_comment", "issues", "repository_dispatch", "release", "create", "delete", "fork",
                      "pull_request_review", "pull_request_review_comment", "watch", "page_build", "deployment", "deployment_status", "status", "check_run", "check_suite"}

# The production deployment: job names are part of the evidence (the rollback gate matches them in the Actions API), so they are fixed here.
PAGES_NEEDS = {"guard": [], "build": ["guard"], "deploy": ["build"], "verify-live": ["build", "deploy"], "record-release": ["build", "deploy", "verify-live"]}
REQUIRED_STEPS = {
    "guard": ["Refuse to run unless Pages is set to deploy from GitHub Actions"],
    "build": ["Source validation", "Build and verify the publication artifact", "Record the release tree digest", "Upload the Pages artifact"],
    "deploy": ["Deploy to GitHub Pages"],
    "verify-live": ["Verify the live site"],
    "record-release": ["Compose the release record", "Upload the release record"],
}
RELEASE_RECORD_NAME = "release-record-${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}"
ROLLBACK_RECORD_NAME = "rollback-record-${{ github.run_id }}-${{ github.run_attempt }}"
ROLLBACK_NEEDS = {"guard": [], "verify-release-evidence": ["guard"], "rebuild-exact-release": ["verify-release-evidence"], "deploy": ["rebuild-exact-release"],
                  "verify-live": ["verify-release-evidence", "deploy"], "record-rollback": ["verify-release-evidence", "rebuild-exact-release", "deploy", "verify-live"]}
TRUSTED_DIGEST = "${{ needs.verify-release-evidence.outputs.tree_digest }}"


def parse(path):
    """Parse one workflow file with a real YAML parser. YAML 1.1 reads the key `on` as boolean true, which is normalised back."""
    if shutil.which("ruby") is None:
        raise SystemExit("FAILED: ruby is required to parse workflow YAML and was not found (this never skips)")
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


def needs_of(job):
    n = job.get("needs", [])
    return [n] if isinstance(n, str) else list(n)


def reaches(jobs, name, target):
    return target in needs_of(jobs[name]) or any(reaches(jobs, n, target) for n in needs_of(jobs[name]))


def walk(node):
    """Every dict/list/scalar node of a parsed document."""
    yield node
    if isinstance(node, dict):
        for v in node.values():
            yield from walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk(v)


def norm(s):
    return re.sub(r"\s+", " ", str(s)).strip()


def common(wf, needs_spec, job_names_equal_ids):
    """Rules every production workflow must satisfy. Returns a list of violations."""
    v, jobs = [], wf.get("jobs", {})
    bad = triggers(wf) & FORBIDDEN_TRIGGERS
    if bad:
        v.append("forbidden trigger(s): %s" % sorted(bad))
    if wf.get("permissions") != {}:
        v.append("top-level permissions must be empty")
    if set(jobs) != set(needs_spec):
        v.append("unexpected job set: %s" % sorted(set(jobs) ^ set(needs_spec)))
    for node in walk(wf):
        if isinstance(node, dict) and "continue-on-error" in node:
            v.append("continue-on-error is forbidden in deployment workflows (it can hide a failed deployment or verification)")
            break
    for jn, job in jobs.items():
        if needs_spec.get(jn) is not None and sorted(needs_of(job)) != sorted(needs_spec[jn]):
            v.append("%s: must need exactly %s (found %s)" % (jn, needs_spec[jn], needs_of(job)))
        if job_names_equal_ids and job.get("name") != jn:
            v.append("%s: the job name must equal its id (the rollback evidence gate matches job names)" % jn)
        perms = job.get("permissions")
        if not isinstance(perms, dict) or not perms:
            v.append("%s: must declare its own minimal permissions" % jn)
        else:
            for k, val in perms.items():
                if val not in ("read", "write") or (val == "write" and not (jn == "deploy" and k in ("pages", "id-token"))):
                    v.append("%s: permission %s: %s is not allowed here" % (jn, k, val))
            if jn == "deploy" and perms != {"pages": "write", "id-token": "write"}:
                v.append("deploy: permissions must be exactly pages: write and id-token: write")
        want_if = GUARD_IF if jn == "guard" else MAIN_ONLY
        if norm(job.get("if", "")) != want_if:
            v.append("%s: its condition must be exactly %r (extra conditions can silently skip it)" % (jn, want_if))
        if "timeout-minutes" not in job:
            v.append("%s: needs a timeout" % jn)
        env = job.get("environment")
        has_env = (env.get("name") if isinstance(env, dict) else env) if env else None
        if jn == "deploy" and has_env != "github-pages":
            v.append("deploy: must run in the github-pages environment")
        if jn != "deploy" and has_env:
            v.append("%s: only the deploy job may use an environment" % jn)
        for st in steps(job):
            if "if" in st:
                v.append("%s: step %r has a condition (steps in deployment workflows must always run)" % (jn, st.get("name")))
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
                             (r"build_type\s*=\s*legacy|source\[branch\]", "switching Pages to branch publishing"), (r"secrets\.", "a secret"), (r"status=success", "eligibility based on a workflow-level success filter"),
                             (r"deployments\?", "a Deployments API lookup (deployment records carry the run's commit, not the content deployed)")):
                if re.search(pat, run):
                    v.append("%s: %s" % (jn, why))
            if jn == "deploy" and run:
                v.append("deploy: must contain no scripts")
    for node in walk(wf):
        if isinstance(node, dict) and "if" in node and re.search(r"\b(always|failure|cancelled)\s*\(", str(node["if"])):
            v.append("a condition uses always(), failure() or cancelled() (jobs could run after a failure)")
            break
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
        for jn in jobs:
            if jn != "guard" and not reaches(jobs, jn, "guard"):
                v.append("%s: does not depend on the guard job" % jn)
    return v


def step_named(job, name):
    return next((s for s in steps(job) if s.get("name") == name), None)


def check_pages(wf):
    v = common(wf, PAGES_NEEDS, True)
    jobs = wf.get("jobs", {})
    on = wf.get("on")
    if not (isinstance(on, dict) and set(on) == {"push", "workflow_dispatch"} and on["push"] == {"branches": ["main"]}):
        v.append("pages: triggers must be exactly a push to main and a manual run")
    if set(jobs) != set(PAGES_NEEDS):
        return v
    for jn, names in REQUIRED_STEPS.items():
        for n in names:
            if step_named(jobs[jn], n) is None:
                v.append("%s: missing the required step %r (the rollback evidence gate checks it)" % (jn, n))
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
    if (build.get("outputs") or {}).get("tree_digest") != "${{ steps.digest.outputs.tree_digest }}":
        v.append("pages build: must output the tree digest of the verified artifact")
    dep = jobs["deploy"]
    if len(steps(dep)) != 1 or "deploy-pages" not in steps(dep)[0].get("uses", ""):
        v.append("pages deploy: must consist of the single deploy step")
    vl = jobs["verify-live"]
    if any((st.get("with") or {}).get("ref") for st in steps(vl) if "checkout" in st.get("uses", "")):
        v.append("pages verify-live: must check out the deployed commit (no ref override)")
    cmd = " ".join(st.get("run", "") for st in steps(vl))
    if "verify-live-site.py" not in cmd or "--manifest scripts/publish-manifest.json" not in cmd or "--expect-digest" not in cmd:
        v.append("pages verify-live: must verify the live site against this commit's manifest and recorded digest")
    if not any((st.get("env") or {}).get("EXPECTED_DIGEST") == "${{ needs.build.outputs.tree_digest }}" for st in steps(vl)):
        v.append("pages verify-live: the expected digest must be the one the build recorded")
    rr = jobs["record-release"]
    compose = step_named(rr, "Compose the release record") or {}
    cenv = compose.get("env") or {}
    if cenv.get("TREE_DIGEST") != "${{ needs.build.outputs.tree_digest }}" or cenv.get("DEPLOY_RESULT") != "${{ needs.deploy.result }}" or cenv.get("VERIFY_RESULT") != "${{ needs.verify-live.result }}":
        v.append("pages record-release: the record must be composed from the build digest and the deploy and live-verification results")
    if "scripts/release_record.py create" not in compose.get("run", "") or '--deploy-result "$DEPLOY_RESULT"' not in compose.get("run", "") or '--verify-result "$VERIFY_RESULT"' not in compose.get("run", ""):
        v.append("pages record-release: must create the record with release_record.py from the recorded results")
    up = step_named(rr, "Upload the release record") or {}
    w = up.get("with") or {}
    if "upload-artifact" not in up.get("uses", "") or w.get("name") != RELEASE_RECORD_NAME or w.get("path") != "release-record.json" or w.get("retention-days") != 90 or w.get("if-no-files-found") != "error":
        v.append("pages record-release: must upload release-record.json as %s, kept 90 days, failing if it is missing" % RELEASE_RECORD_NAME)
    for jn, job in jobs.items():
        for st in steps(job):
            if "upload-artifact" in st.get("uses", "") and jn != "record-release":
                v.append("%s: only the record-release job may upload a release record" % jn)
    return v


def check_rollback(wf):
    v = common(wf, ROLLBACK_NEEDS, False)
    jobs = wf.get("jobs", {})
    on = wf.get("on")
    ins = (on.get("workflow_dispatch") or {}).get("inputs", {}) if isinstance(on, dict) else {}
    if not (isinstance(on, dict) and set(on) == {"workflow_dispatch"}):
        v.append("rollback: must be manual only")
    for name in ("release_sha", "expected_tree_digest"):
        if not (ins.get(name, {}).get("required") is True and ins[name].get("type") == "string"):
            v.append("rollback: input %s must be required text" % name)
    if set(jobs) != set(ROLLBACK_NEEDS):
        return v
    g = " ".join(st.get("run", "") for st in steps(jobs["guard"]))
    for needle, why in (("[0-9a-f]{40}", "a full 40-character SHA"), ("[0-9a-f]{64}", "a full 64-character digest"), ('"$SHA" != "$GITHUB_SHA"', "refusing the current main"),
                        ("compare/$SHA...main", "proof the commit was released from main"),
                        ('grep -q "HTTP 404"', "a distinct diagnosis for a commit that does not exist"),
                        ("API call failed", "a distinct diagnosis for GitHub API failures"), ("behind | diverged", "a diagnosis for a commit that is not an ancestor of main")):
        if needle not in g:
            v.append("rollback guard: must require %s" % why)
    ev = jobs["verify-release-evidence"]
    ecos = {(st.get("with") or {}).get("path"): (st.get("with") or {}).get("ref") for st in steps(ev) if "actions/checkout" in st.get("uses", "")}
    if ecos != {"release": "${{ inputs.release_sha }}", "tools": None}:
        v.append("rollback evidence: must check out the requested release (to judge its workflow and manifest) and the verifier from main (no ref)")
    es = step_named(ev, "Verify the release evidence") or {}
    erun = es.get("run", "")
    for needle in ("tools/scripts/verify-release-record.py", '--sha "$SHA"', '--digest "$DIGEST"', "--release-dir release", '--github-output "$GITHUB_OUTPUT"'):
        if needle not in erun:
            v.append("rollback evidence: the evidence step must run %s" % needle)
    if es.get("id") != "evidence" or (ev.get("outputs") or {}).get("tree_digest") != "${{ steps.evidence.outputs.tree_digest }}":
        v.append("rollback evidence: must output the digest from the verified release record")
    if (ev.get("permissions") or {}) != {"contents": "read", "actions": "read"}:
        v.append("rollback evidence: needs exactly contents: read and actions: read")
    rb = jobs["rebuild-exact-release"]
    cos = [st for st in steps(rb) if "actions/checkout" in st.get("uses", "")]
    if len(cos) != 1 or (cos[0].get("with") or {}).get("ref") != "${{ inputs.release_sha }}" or (cos[0].get("with") or {}).get("path") != "release":
        v.append("rollback rebuild: must check out exactly inputs.release_sha into release/")
    for st in steps(rb):
        if st.get("run") and st.get("working-directory") != "release":
            v.append("rollback rebuild: every script must run in release/ (found %r)" % st.get("name"))
    r = " ".join(st.get("run", "") for st in steps(rb))
    for needle, why in (("git rev-parse HEAD", "proof HEAD is the request"), ("merge-base --is-ancestor", "proof the commit is an ancestor of main"), ('[ "$d" = "$EXPECTED" ]', "the digest equality check"),
                        ("refusing to deploy", "refusal on digest mismatch"), ("npm run build:pages", "an artifact build at that commit")):
        if needle not in r:
            v.append("rollback rebuild: must contain %s" % why)
    if not any((st.get("env") or {}).get("EXPECTED") == TRUSTED_DIGEST for st in steps(rb)):
        v.append("rollback rebuild: the digest to match must be the one from the verified release record, never the operator-supplied input")
    if re.search(r"completed|complete\b", r, re.I):
        v.append("rollback rebuild: must not claim the rollback is complete (only record-rollback may)")
    blob = json.dumps(wf)
    if '"ref": "main"' in blob or "ref: main" in blob:
        v.append("rollback: nothing may check out main for building")
    ups = [st for st in steps(rb) if "upload-pages-artifact" in st.get("uses", "")]
    if len(ups) != 1 or (ups[0].get("with") or {}).get("path") != "release/dist":
        v.append("rollback rebuild: must upload exactly release/dist")
    if len(steps(jobs["deploy"])) != 1:
        v.append("rollback deploy: must consist of the single deploy step")
    vl = jobs["verify-live"]
    cos = {(st.get("with") or {}).get("path"): (st.get("with") or {}).get("ref") for st in steps(vl) if "actions/checkout" in st.get("uses", "")}
    if cos != {"release": "${{ inputs.release_sha }}", "tools": None}:
        v.append("rollback verify-live: must check out the restored release (for its manifest) and the verifier from main (no ref)")
    cmd = " ".join(st.get("run", "") for st in steps(vl))
    if "tools/scripts/verify-live-site.py" not in cmd or "--manifest release/scripts/publish-manifest.json" not in cmd or "--expect-digest" not in cmd:
        v.append("rollback verify-live: must compare the live site with the RESTORED release's manifest and recorded digest")
    if not any((st.get("env") or {}).get("EXPECTED_DIGEST") == TRUSTED_DIGEST for st in steps(vl)):
        v.append("rollback verify-live: the expected digest must be the one from the verified release record")
    rr = jobs["record-rollback"]
    compose = step_named(rr, "Compose the rollback record") or {}
    cenv = compose.get("env") or {}
    if cenv.get("TREE_DIGEST") != TRUSTED_DIGEST or cenv.get("DEPLOY_RESULT") != "${{ needs.deploy.result }}" or cenv.get("VERIFY_RESULT") != "${{ needs.verify-live.result }}":
        v.append("rollback record: must be composed from the verified digest and the deploy and live-verification results")
    if "release_record.py create-rollback" not in compose.get("run", "") or "COMPLETED" not in compose.get("run", ""):
        v.append("rollback record: must create the rollback record and be the only place that reports the rollback as COMPLETED")
    up = step_named(rr, "Upload the rollback record") or {}
    w = up.get("with") or {}
    if "upload-artifact" not in up.get("uses", "") or w.get("name") != ROLLBACK_RECORD_NAME or w.get("path") != "rollback-record.json" or w.get("if-no-files-found") != "error":
        v.append("rollback record: must upload rollback-record.json as %s, failing if it is missing" % ROLLBACK_RECORD_NAME)
    for jn, job in jobs.items():
        for st in steps(job):
            if "upload-artifact" in st.get("uses", "") and jn != "record-rollback":
                v.append("%s: only the record-rollback job may upload a record" % jn)
    return v


def check_repo(files, parsed, allowed_files):
    """Rules across all workflows."""
    v = []
    if set(files) != set(allowed_files):
        v.append("unreviewed workflow files present or missing: %s" % sorted(set(files) ^ set(allowed_files)))
    for name, wf in parsed.items():
        if name not in ("pages.yml", "rollback.yml") and re.search(r"deploy-pages|upload-pages-artifact|upload-artifact|pages.{0,5}write|id-token", json.dumps(wf)):
            v.append("%s: only the deployment workflows may touch Pages deployment or upload records" % name)
    if "pages.yml" in parsed and "rollback.yml" in parsed and parsed["pages.yml"].get("concurrency") != parsed["rollback.yml"].get("concurrency"):
        v.append("deployment and rollback must share one concurrency group")
    if "validate.yml" in parsed and parsed["validate.yml"].get("permissions") != {"contents": "read"}:
        v.append("validate.yml: must keep read-only contents permission")
    return v
