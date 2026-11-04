# First production deployment from GitHub Actions: preservation and recovery

## Verification checkpoint — 2026-11-04

This supplement supersedes historical configuration statements below; the numbered first-deployment and recovery steps remain procedures, not evidence that an action occurred.

* Authorized release candidate: `6391698c738cab21bc60771b1035240a0c9cbd61`. Production baseline and recovery tag target: `783ba6464e20ebf064da4448c94d5461fb358ab4`.
* Production Pages is already `workflow`; do not switch it back merely to repeat the initial source-switch procedure. A fresh baseline check found 28 files byte-identical to production Git and the workflow file unavailable (404).
* Production main has an active ruleset requiring a pull request and current `validate`, blocking deletion and force pushes, with no bypass actors. The deployment environment requires the owner reviewer, permits only main, and disables admin bypass. Self-review is allowed for the sole owner.
* The owner accepted the existing public preview history for this release. This does not remove cached content or authorize publishing private material.
* Independent artifact verification: 49 files, 1,791,138 bytes, tree SHA-256 `fc71be319008b783e8e72a0ad6857975cc50b9eb4322d7f3d13f8a19b122b056`. All 98 candidate source files match the authorized commit.
* A local isolated squash-and-revert rehearsal restored the production tree exactly, and the restored tree's original validator passed. This proves Git tree recovery, not a previous successful production Actions release.
* Remote supersession and a current-attempt deploy rerun were exercised in the disposable repository. The rerun reached a fresh reviewer gate; no deployment was approved for that rerun. See the rehearsal table for run IDs, attempts and limitations.
* Non-main dispatch `41885965137` skipped every job without deployment or artifacts. The existing missing-record rollback run `41737099573` was independently checked through its job log: it explicitly refused the missing artifact and skipped deployment.
* The live legacy-source scenario is BLOCKED: the Pages settings PUT returned HTTP 403 (`Resource not accessible by integration`). Readback remained `workflow`. The exact production guard command was tested locally with controlled API responses: only `workflow` passed; legacy, empty and unexpected values failed. This does not establish GitHub's live source-transition behavior.
* The isolated failed-live-verification run `41884575264` built successfully and waited at the reviewer gate. Submitting a rehearsal reviewer decision returned HTTP 403, so deploy and live verification were not exercised; the run was cancelled and no release record exists. Do not mark this remote scenario passed.
* Independently downloaded Actions artifact `13351220954` from that run matches all 49 authorized files, 1,791,138 bytes and the pinned tree digest. Its archive SHA-256 is `83bc5629c0fc284c88c8d6312185719f241915769e9da8e5ae5e6c77e7191cb8`; this archive digest is distinct from the publication tree digest.
* Local HTTP fault tests used the real verifier: missing file, corrupted file and exposed tooling each failed. The real record writer refused failed, skipped and cancelled verification, and created no record. These local tests do not substitute for the blocked remote deployment/failure path.
* Real-device Safari remains BLOCKED: no physical Apple device, Safari installation, device bridge or physical-device browser service is available. Chromium/WebKit/emulation cannot close that coverage gap.
* Source-switch serving continuity, partial-rerun provenance, failed live verification and concurrency must be judged only from the detailed evidence in the rehearsal log. Do not treat a green workflow alone as proof of deployment or rollback eligibility.
* Production deployment approval remains a separate owner action. Nothing in this supplement authorizes deployment or changes the approved candidate.


Historical procedure for the move from the legacy branch build (before the source migration) to the workflow deployment in `.github/workflows/pages.yml`. The first release has no release record, so the
rollback workflow cannot help; this procedure replaces it for that one release. Nothing here is done by the build tooling: every step marked **[OPERATOR]** changes repository
settings or production and needs explicit approval from the repository owner.

## Fixed reference points

| Item | Value |
|---|---|
| Last known-good production commit (legacy-published) | `783ba6464e20ebf064da4448c94d5461fb358ab4` |
| Recovery tag (annotated, pushed) | `legacy-pages-783ba64` (the tag object resolves to the commit above; check with `git ls-remote origin 'refs/tags/legacy-pages-783ba64*'`, the peeled `^{}` line must show the full SHA) |
| Pinned publication digest of the release | `fc71be319008b783e8e72a0ad6857975cc50b9eb4322d7f3d13f8a19b122b056` (49 files) |
| Not a recovery point | the older tag `pre-v2-rollback` (it points at an earlier commit, `86ae4a4`) |

## Why the order matters

* Before the source migration, Pages used a **legacy build of `main` at `/`**: it publishes every file on `main` that is not in a dot-directory. Merging the release pull request while the source is still legacy publishes
  the whole repository root, including tooling, tests and runbooks. The allowlisted 49-file artifact only applies after the source is **GitHub Actions**.
* `pages.yml` runs a guard that fails while the source is legacy, so a merge in that state deploys nothing through Actions but still triggers the legacy build.
* Therefore: switch the source first, merge second. Never merge first.

## What is live today (legacy), so that a comparison is not misread

Measured read-only before the migration: `main` has 29 files; **28 are served byte-identically** by the legacy build, and **1 returns 404**: `.github/workflows/validate.yml` (dot-directories are not
served by the legacy build). Legacy publishing therefore already serves development files today (for example `package.json`, `release-files.json`, `README.md` and `scripts/*`). After the
migration those return 404; that change is intended and is not a regression. Anything under a dot-directory returning 404 before or after is also expected.

## 1. Preserve the current live site (before any change)

1. Confirm the recovery tag exists on the remote and peels to `783ba6464e20ebf064da4448c94d5461fb358ab4`, that `git rev-parse origin/main` equals that SHA, and that
   `gh api repos/<owner>/<repo>/pages` shows `build_type: workflow` at the current checkpoint. This source migration is already complete; do not revert to legacy just to repeat baseline capture. Stop if the recovery tag or production commit differs.
2. Save a byte-level baseline of what is live: for every path in `git ls-tree -r --name-only legacy-pages-783ba64` fetch `https://<site>/<path>` and store its SHA-256 (record the 404 for dot-directory files
   as expected). Keep it outside the repository. Expected result today: 28 identical, 1 not served.
3. Confirm the known-good tree is reproducible from Git alone: `git diff --stat legacy-pages-783ba64 origin/main` is empty until the merge.
4. Do not delete the tag, the preview branch, `main`, or the baseline until the first release is verified and recorded.

## 2. Rehearsal status

The workflows were exercised on real GitHub Actions in a disposable repository (`scripts/ROLLBACK-REHEARSAL.md` has the results log): deployment with a protected reviewer gate, authentic release
records, rollback to a verified release, refusals for wrong digest, malformed input, a never-released commit, and the additional scenarios itemized in `ROLLBACK-REHEARSAL.md`. Coverage is established by that results table; planned scenarios are not completed tests. **Not covered by that
rehearsal, and still unverified:** (a) whether the site keeps serving between the Pages source switch and the first Actions deployment (GitHub's documentation does not say, and the rehearsal never had a
legacy site to switch from); (b) behaviour of a partial re-run of a failed deployment with respect to the release record. Treat the interruption window as possible downtime, and prefer re-running **all**
jobs over re-running only the failed ones.

## 3. Pre-conditions for the switch **[OPERATOR]**

* Protection first: required reviewer on the `github-pages` environment (prevent self-review off for a sole owner, admin bypass off); deployment branches limited to `main` (already `main`); a ruleset on `main`
  requiring a pull request (0 approvals for a sole owner) and the `validate` check, with deletion and force-push blocked and no bypass actors.
* The history decision about the early preview commits has been made (the squashed release branch only brings what is on that branch).
* The release pull request is approved but **not merged**; `main` is still the known-good SHA.

## 4. Cut over **[OPERATOR, each step separately approved]**

1. If Pages is still legacy, switch the source to GitHub Actions (`PUT /repos/<owner>/<repo>/pages` with `build_type=workflow`). If it is already `workflow`, verify that read-only and do not repeat the source change. Immediately run `verify-live-site.py` against the baseline: the
   live site should be unchanged. If the site is down or different, revert the source to legacy (section 6a) before anything else.
2. Merge the pull request through the ruleset (a normal pull request merge). The push to `main` starts `pages.yml`; approve the `github-pages` deployment in the environment when prompted, after checking the build
   job's summary shows 49 files and the pinned digest. Confirm `git diff` between the merged `main` and the tested pull request head is empty (a squash merge gives different SHAs but the same tree).
3. Watch all five jobs. Success means `guard`, `build`, `deploy`, `verify-live` and `record-release` are all `success` (not skipped) and the release record artifact exists.

## 5. Verify

* `python3 scripts/verify-live-site.py https://<site> --manifest scripts/publish-manifest.json --expect-digest <digest>`: 48 files byte-identical, 15 excluded URLs unavailable.
* Probe that development files are no longer exposed: `/scripts/`, `/work/`, `/package.json`, `/release-files.json`, `/README.md`, `/dist/`, `/.github/` must return 404 (several of these are 200 today by design of the legacy build).
* The release record artifact downloads, and `verify-release-record.py` accepts it for the new commit (this proves the rollback path for the next release).
* Compare against the baseline: only the intended changes differ (new pages appear; development files disappear).

## 6. Recover from a failed initial deployment

Decide by what failed. Never "fix forward" without first stabilising the site. Throughout, the recovery target is the tree of `legacy-pages-783ba64`.

**Rule that prevents an unsafe combination:** the Pages source may be switched back to legacy **only while the tree of `main` equals the tree of `legacy-pages-783ba64`**
(`git diff --quiet legacy-pages-783ba64 origin/main` succeeds). If the release is merged, revert it through a pull request first.

a. **Source switched, site wrong or down, or the first run failed before `deploy`, and the release is NOT merged**: `main` still equals the tag, so set the Pages source back to legacy `main` `/` **[OPERATOR]**. This restores
   the known-good site exactly. Verify with section 6 checks below.
b. **Release merged, deployment failed or verification failed:** the live site may be the previous content or the new one. First run the verifier against the baseline. Then either
   re-run **all** jobs (same commit; the record is written only after live verification; another reviewer approval is needed) or recover:
   1. Open a revert pull request for the release on a branch (`git revert` of the merge or squash commit). The ruleset applies: it needs the `validate` check to pass (the pre-release `validate.yml` also defines a
      job named `validate` and runs on pull requests, so the check exists), and no direct push to `main` is possible. Merge it.
   2. Verify `git diff --quiet legacy-pages-783ba64 origin/main`. Merging the revert starts no deployment, because the reverted tree has no `pages.yml`.
   3. Only then set the Pages source back to legacy **[OPERATOR]**; the legacy build republishes exactly the known-good tree.
c. **Deployed but `verify-live` failed:** the site may be serving the new release without a record. Treat it as unverified. Inspect the differences; revert as in (b) or fix and push a new commit through a pull request. Do not run the rollback workflow: no record exists for any release yet.
d. **Anything exposing a non-allowlisted file:** switch the source to Actions (if not already), redeploy, and treat the file as published: cached copies and search indexes cannot be recalled; rotate anything sensitive.

### Risk: restoring legacy publishing while the release tree is on `main`
A legacy build publishes every non-dot-directory file on `main`. With the release tree on `main` that is the previously served set **plus 38 additional files under `scripts/`** (verification and build tooling, tests, the
rehearsal and protection runbooks) that the Actions artifact deliberately excludes, on top of the tooling already exposed today. They scanned clean, but they describe the deployment and rollback controls. Hence the
rule above: never leave the source on legacy with the release merged.

### Recovery verification checks (after any recovery)
1. `git diff --quiet legacy-pages-783ba64 origin/main` succeeds (the tree equals the known-good tree) and `git rev-parse origin/main` is recorded.
2. `gh api repos/<owner>/<repo>/pages -q '.build_type'` is `legacy`, source `main` `/`, and the latest Pages build is `built` on the current `main` commit.
3. Baseline comparison: the 28 baseline files are byte-identical and the dot-directory file returns 404, exactly as before the migration.
4. No page introduced by the release is served (for example `/data-lab.html` and `/lab-explorer.html` return 404; they do not exist on the known-good tree).
5. The `github-pages` environment still requires its reviewer, the ruleset on `main` is still active, and no workflow is running or waiting.

## 7. Approval matrix

| Step | Who |
|---|---|
| Baseline capture, read-only verification | agent or operator |
| Recovery tag (already created and pushed) | done; do not move or delete it |
| Environment reviewers, ruleset on `main` | **operator** |
| Pages source switch (either direction) | **operator** |
| Merge the pull request (or the revert pull request) | **operator** |
| Approve the `github-pages` deployment | **operator** (the reviewer) |
| Re-running jobs | **operator** |
| Any history replacement | **operator** |
