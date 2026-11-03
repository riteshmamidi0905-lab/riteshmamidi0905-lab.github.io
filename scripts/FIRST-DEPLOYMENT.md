# First production deployment from GitHub Actions: preservation and recovery

Applies once, to the move from the legacy branch build (today) to the workflow deployment in `.github/workflows/pages.yml`. The first release has no release record, so the
rollback workflow cannot help; this procedure replaces it for that one release. Nothing here is done by the build tooling: every step marked **[OPERATOR]** changes repository
settings or production and needs explicit approval from the repository owner.

## Why the order matters

* Today Pages is a **legacy build of `main` at `/`**: it publishes every file on `main`. Merging the release pull request while the source is still legacy publishes the
  whole repository root, including tooling and test files. The allowlisted 49-file artifact only applies after the source is **GitHub Actions**.
* `pages.yml` runs a guard that fails while the source is legacy, so a merge in that state deploys nothing through Actions but still triggers the legacy build.
* Therefore: switch the source first, merge second. Never merge first.

## 1. Preserve the current live site (before any change)

1. Record the last known-good state: `git rev-parse origin/main` (expected `783ba64…`, full SHA to be written down), the tag `pre-v2-ro`, and the Pages settings
   (`gh api repos/<owner>/<repo>/pages` must show `build_type: legacy`, source `main` `/`).
2. Save a byte-level baseline of what is live: for every path in `git ls-tree -r --name-only <known-good SHA>` fetch `https://<site>/<path>` and store its SHA-256 (404s recorded
   too). Keep it outside the repository.
3. Confirm the known-good tree is reproducible from Git alone: `git diff --stat <known-good SHA> origin/main` is empty until the merge.
4. Do not delete the preview branch, `main`, or the baseline until the first release is verified and recorded.

## 2. Rehearse (recommended before touching production) **[OPERATOR]**

Switching sources cannot be tried on the production repository without affecting it. Rehearse the identical workflows in a disposable repository owned by the operator
(copy of the tree, Pages source Actions, `github-pages` environment restricted to `main`). Confirm: the guard passes, the artifact is the 49 files with the pinned digest,
`verify-live` passes, `record-release` uploads `release-record-<sha>-<run>-<attempt>`, and a rollback to that release succeeds. This is the only way to test the
unrun production paths (`gh run download`, record artifact lookup) before they matter. Until it has been done, treat the workflows as unproven.

## 3. Pre-conditions for the switch **[OPERATOR]**

* Protection first: required reviewer(s) on the `github-pages` environment; deployment branches limited to `main` (already `main`); branch protection or a ruleset on `main`
  requiring the `validate` check and a pull request (see the readiness report for exact settings).
* The history decision about the early preview commits has been made (merge commits only bring what is on the branch).
* The release pull request is approved but **not merged**; `main` is still the known-good SHA.

## 4. Cut over **[OPERATOR, each step separately approved]**

1. Switch the Pages source to GitHub Actions (`PUT /repos/<owner>/<repo>/pages` with `build_type=workflow`). Immediately run `verify-live-site.py` against the baseline: the
   live site should be unchanged. If the site is down or different, revert the source to legacy (step 6a) before anything else.
2. Merge the pull request. The push to `main` starts `pages.yml`; approve the `github-pages` deployment in the environment when prompted, after checking the build job's
   summary shows 49 files and the pinned digest.
3. Watch all five jobs. Success means `guard`, `build`, `deploy`, `verify-live` and `record-release` are all `success` (not skipped) and the release record artifact exists.

## 5. Verify

* `python3 scripts/verify-live-site.py https://<site> --manifest scripts/publish-manifest.json --expect-digest <digest>`: 48 files byte-identical, excluded URLs unavailable.
* Probe that development files are not exposed: `/scripts/`, `/work/`, `/recovered/`, `/package.json`, `/release-files.json`, `/dist/`, `/.github/` must return 404.
* The release record artifact downloads, and `verify-release-record.py` accepts it for the new commit (this proves the rollback path for the next release).
* Compare against the baseline: only intended files differ.

## 6. Recover from a failed initial deployment

Decide by what failed. Never "fix forward" without first stabilising the site.

a. **Source switched, site wrong or down, or the first run failed before `deploy`**: set the Pages source back to legacy `main` `/` **[OPERATOR]**. If `main` has not been merged this
   restores the known-good site exactly. Verify with the baseline.
b. **Merged, deployment failed or verification failed**: the live site may be the previous content or the new. First run the verifier against the baseline. Then
   either re-run the failed jobs (same commit; the record is written only after live verification) or open a revert pull request of the merge commit; the tree after the
   revert equals the known-good tree (`git diff <known-good SHA> main` is empty), so a legacy source then republishes exactly the known-good content. Do not leave the source on
   legacy with the release merged: that publishes the whole root.
c. **Deployed but `verify-live` failed**: the site may be serving the new release without a record. Treat as unverified. Inspect the differences; revert as in (b) or fix and push a new
   commit; do not run the rollback workflow (no record exists for any release yet).
d. **Anything exposing a non-allowlisted file**: switch the source to Actions (if not already), redeploy, and treat the file as published: cached copies and search indexes
   cannot be recalled; rotate anything sensitive.

## 7. Approval matrix

| Step | Who |
|---|---|
| Baseline capture, rehearsal planning, read-only verification | agent or operator |
| Environment reviewers, branch protection or ruleset | **operator** |
| Pages source switch (either direction) | **operator** |
| Merge the pull request | **operator** |
| Approve the `github-pages` deployment | **operator** (the reviewer) |
| Revert pull request, re-running jobs | **operator** |
| Any history replacement | **operator** |

Unverified assumptions to confirm during the rehearsal: that the site keeps serving the last legacy content between the switch and the first Actions deployment, and the
exact behaviour of the record download on a real run.
