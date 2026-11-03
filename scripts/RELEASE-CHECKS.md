# Release checks: source validation vs publication validation

This file is maintainer documentation. It lives under `scripts/`, which the publication policy never deploys.

## Two layers, two manifests

| Layer | Question | Command | Manifest |
|---|---|---|---|
| Source validation | Are the reviewed site files unchanged, linked correctly and free of prohibited text? | `npm run build && npm test` | `release-files.json` (hash-pinned reviewed files) |
| Publication validation | Does the artifact that would be deployed contain exactly the approved files, and nothing else? | `npm run build:pages` | `scripts/publish-manifest.json` (explicit allowlist) |

`scripts/build-pages-artifact.py` copies only what the publication manifest lists into `dist/` (which must not exist yet; nothing is ever deleted).
It fails if the manifest is not exactly the reviewed release files plus `.nojekyll`, if any listed file differs from its pin or fails the path policy
(`scripts/pages_policy.py`: no scripts, tests, configuration, self-test pages, hidden or secret-like files), or if the output differs from the manifest.
`scripts/verify-pages-artifact.py dist` then re-checks the output independently: exact inventory, cleared screenshots only, every link, stylesheet url()
and fetched file resolves, no prohibited identifier, required pages and honest-status text present, and, served over HTTP, every published file returns
200 while the excluded tooling URLs return 404. `scripts/test-pages-artifact.py` proves the checks fail on tampering (run by `npm test`).

After the reviewed files change: regenerate the pages (`sh scripts/build-all.sh`), then `python3 scripts/build-pages-artifact.py --write-manifest`.

## Disclosure rules (fail-closed, no secrets in Git)

Public rules are salted hashes in `scripts/disclosure-rules.json`, evaluated by `scripts/disclosure.py` over every text file in the repository and in the
artifact. They always run; if the file is missing, malformed or incomplete the release fails. Failures print a rule id, file and line, never the text.

The scan list is built from repository-relative paths only (the checkout directory's name never matters; GitHub runners check out under `.../work/...`).
The run also fails closed on coverage: zero files, fewer than a floor, any file named by an independent list (reviewed release files, publication
manifest, tooling, and the git index when present) that was not scanned, or any file that cannot be read as UTF-8. The validator prints how many files
it scanned; `scripts/test-scan-coverage.py` pins all of this, including a checkout under a path containing `work`.

Optional private rules (kept outside the repository) add literals, regexes and withheld file paths:

```json
{"literals": ["..."], "regexes": ["..."], "withheld_files": ["assets/img/..."], "preview_spec": "/path/to/private-figure-list.json"}
```

* Local: `PORTFOLIO_PRIVATE_RULES=/path/to/private-rules.json npm run build` (add `REQUIRE_PRIVATE_RULES=1` to fail when it is not configured).
  If the variable is set the file must exist, parse and define at least one rule, otherwise the check fails.
* CI: neither variable is set. CI runs the public hashed rules only. No secret is used, so pull requests from forks get the same check.
* Add a public rule without writing the term in source: `python3 scripts/disclosure.py hash "TERM"`, then add an entry to the rules file.
  Hashes are not secrecy; never put a credential or a long private value in a rule.

## GitHub Pages deployment and rollback

Workflows: `.github/workflows/pages.yml` (production deployment) and `.github/workflows/rollback.yml` (manual rollback). `validate.yml` is the pull-request CI and only reads.
`scripts/test-workflows.py` parses all three with a real YAML parser and enforces everything below, and proves each rule bites with unsafe variants (continue-on-error, extra skip
conditions, a record created before live verification, a rollback that trusts a workflow-level success or the operator's digest, ...). The rollback evidence gate and the release
record are tested in `scripts/test-release-evidence.py` against a fake `gh` and against deliberately weakened gates. The shared rules are in `scripts/workflow_rules.py`.

### Why adding the workflows to a branch or pull request cannot deploy anything
* `pages.yml` triggers only on a push to `main` and on a manual run. `rollback.yml` is manual only. Neither has a `pull_request`, `pull_request_target`, `workflow_run`
  or `schedule` trigger, so a pull request, a branch push or a comment never starts them.
* Every job requires exactly `github.ref == 'refs/heads/main'`; a manual run started from any other branch skips every job.
* The first job (`guard`) fails unless the repository's Pages source is "GitHub Actions". While Pages is still the legacy branch build, a push to `main` runs the guard,
  the guard fails, and nothing is built or deployed.
* The deploy job runs in the `github-pages` environment, which is restricted to the `main` branch (and can add required reviewers).

### Repository setting required (not changed by this work; needs separate authorization)
Pages is currently a legacy build from `main` at `/`, which publishes the whole repository root. The allowlisted artifact takes effect only after the source is switched to
**GitHub Actions** (Settings > Pages > Build and deployment > Source; API: `PUT /repos/{owner}/{repo}/pages` with `build_type=workflow`). Recommended at the same time: required
reviewers on the `github-pages` environment, and branch protection on `main` requiring the pull-request check, with `.github/**` under code-owner review.

Order of operations (the live site keeps serving the last deployment when the source is switched):
1. Review and approve the pull request that contains these workflows.
2. Switch the Pages source to GitHub Actions; add environment reviewers.
3. Merge. The push to `main` runs `pages.yml`: guard, build and verify, deploy, live verification, release record.
4. Confirm `record-release` succeeded: that run now has a release record and is a restorable release.

### Deployment (`pages.yml`) and the release record
* Permissions start empty. `contents: read` for builds, `pages: read` for checks, `pages: write` and `id-token: write` only in the deploy job. No secrets. Actions are pinned to commit SHAs.
* Jobs, in order: `guard` -> `build` (source validation, `npm audit`, build and verify the allowlisted `dist/`, record its tree digest, upload only `dist/`) -> `deploy` (the single deploy step) ->
  `verify-live` (compare the live site with this commit's `scripts/publish-manifest.json` and the digest the build recorded) -> `record-release`.
* The job names and the names of the required steps are fixed: the rollback evidence gate matches them. Nothing in these workflows may hide a failure: no `continue-on-error`, no step conditions,
  no job condition other than the main-only one, no `always()`/`failure()`/`cancelled()`; the tests enforce this.
* `record-release` depends on `build`, `deploy` AND `verify-live`, so it cannot run (and a record cannot exist) unless the site was deployed and verified live. `scripts/release_record.py` additionally
  refuses to write a record unless both results are literally `success`, the run is on `refs/heads/main`, and the digest equals the digest derived from `scripts/publish-manifest.json`.
  The record (artifact `release-record-<sha>-<run id>-<attempt>`, kept 90 days) holds: repository, commit, ref, workflow ref, event, run id and attempt, tree digest, manifest path and SHA-256, file count,
  the deploy and live-verification results, and the jobs it was recorded after. Artifacts are immutable per name, so each attempt has its own.
* `deploy` and `rollback` share the concurrency group `pages-production`, so they can never run at the same time.

### Rollback eligibility (`scripts/verify-release-record.py`, run by `rollback.yml`)
A successful workflow conclusion alone is never accepted: a run can be green with skipped jobs or steps, and `continue-on-error` is invisible in the API. A commit may be restored only if ALL hold:
1. The input is a full 40-character SHA, it is not the current `main`, and it is an ancestor of `main`.
2. The workflow definition at that commit satisfies today's deployment safety rules (`scripts/workflow_rules.py`): no `continue-on-error`, no extra conditions that could skip a job, no missing dependency.
3. A run of the production deploy workflow (matched by workflow id and file, so an unrelated workflow cannot qualify) exists for that exact commit on `main`, from a push or a manual run, in this repository (not a fork),
   whose latest attempt completed successfully.
4. That attempt's jobs are exactly `guard`, `build`, `deploy`, `verify-live`, `record-release`, each completed with conclusion success (none skipped), and every required step (the deploy step, the live
   verification step, the record upload, ...) succeeded.
5. Exactly one non-expired release-record artifact exists for that attempt and belongs to that run.
6. Every field of the record matches what was established independently (repository, commit, run id, attempt, event, workflow, manifest SHA-256 at that commit, file count, results) and its tree digest equals the digest
   derived from the manifest at that commit.
7. The operator-supplied digest equals the recorded digest. It is a claim that is checked, never evidence.
Anything missing, expired, ambiguous, inconsistent or unverifiable refuses the rollback (fail closed). Deployment records from the Deployments API are not used: they carry the commit of the workflow run, which for a rollback is the current `main`.

### Rollback request validation diagnostics
The guard step "The commit was released from main" separates four outcomes and always fails closed: no such commit (GitHub answers HTTP 404: "no commit … in this repository"), a GitHub API, authentication, rate-limit
or network failure (reported as a failed check, explicitly not a verdict on the commit), a commit that exists but is not an ancestor of main (`behind`, `diverged`) or is main itself (`identical`), and an unrecognised answer.
Only compare status `ahead` passes. A commit that passes this step still needs valid release evidence (a later, separate job). `scripts/test-rollback-guard.py` runs the real step against a fake `gh` and proves that
unsafe variants (the old raw-404 step, blaming every failure on a missing commit, ignoring API failures, accepting any status) are caught.

### Rollback (`rollback.yml`)
1. Take `release_sha` and the tree digest from that release's "Release record" (job summary of its `pages.yml` run) and start the workflow from `main`.
2. `guard` checks the inputs, that Pages is artifact-deployed, and that the commit is an ancestor of `main`. `verify-release-evidence` checks out the release commit and the verifier from `main` and applies the eligibility rules above.
3. `rebuild-exact-release` checks out that commit alone, proves `HEAD` equals the request, runs source validation, builds and verifies the artifact there, and refuses to continue unless the rebuilt tree digest equals the digest in the
   verified release record. Builds are deterministic, so this reproduces the original artifact without depending on artifact retention. Its summary says the rollback is IN PROGRESS and that nothing is deployed yet.
4. `deploy` uses the same environment-gated step. `verify-live` compares the live site with the RESTORED release's manifest and recorded digest, using the verifier from `main`.
5. `record-rollback` runs only if all of that succeeded and writes the rollback record (artifact `rollback-record-<run id>-<attempt>`, summary "Rollback COMPLETED and verified live"). It is the only place that reports completion.
6. A rollback never changes the Pages source. Never roll back by switching the source to a branch: that republishes the repository root.

### Limits and operations
* Retention: release records, Pages artifacts and run logs are kept 90 days (the maximum on a public repository). After that the record is expired and a rollback to that release fails closed; restore it by reverting the
  offending change on `main` with a pull request and letting the normal deployment run. The first release has nothing to roll back to, and a release made before the publication boundary has no record.
* Integrity: a release record is an Actions artifact, not a signature. Its trust rests on the run it came from, which the gate cross-checks, and on who can change workflows or delete artifacts (repository write and
  administration access); deletion makes a rollback fail closed. Cryptographic artifact attestations would add tamper evidence and are a possible upgrade.
* Concurrency: `cancel-in-progress: false` does NOT guarantee that every queued run executes. GitHub keeps at most one running and one pending run per group; when another run queues, the previously pending run is
  cancelled. A rollback queued behind a running deployment can therefore be cancelled by a later push or run, and a queued deployment can be dropped when a newer push queues behind it. A cancelled, superseded or
  failed rollback has no `record-rollback` job and no rollback record, and its "IN PROGRESS" summary is explicit that nothing was deployed by that step: it must never be read as a completed rollback. Check the site with
  `python3 scripts/verify-live-site.py https://riteshmamidi0905-lab.github.io --manifest <that release's scripts/publish-manifest.json> --expect-digest <digest>` before assuming anything.
* A rollback restores an old release; it does not change `main`. The next push to `main` deploys `main` again and replaces it, so revert or fix `main` straight after rolling back. A rollback record proves the
  rollback finished at that time, not that the site still serves it.
