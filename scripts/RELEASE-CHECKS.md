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
`scripts/test-workflows.py` parses all three with a real YAML parser and enforces everything below (it also proves each rule bites with 65 unsafe variants).

### Why adding the workflows to a branch or pull request cannot deploy anything
* `pages.yml` triggers only on a push to `main` and on a manual run. `rollback.yml` is manual only. Neither has a `pull_request`, `pull_request_target`, `workflow_run`
  or `schedule` trigger, so a pull request, a branch push or a comment never starts them.
* Every job in both files requires `github.ref == 'refs/heads/main'`; a manual run started from any other branch skips every job.
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
3. Merge. The push to `main` runs `pages.yml`: guard, build and verify, deploy, live verification.
4. Confirm `verify-live` passed: every manifest file served byte-identical, the manifest's tree digest equal to the recorded one, every excluded development URL unavailable.

### Deployment (`pages.yml`)
* Permissions start empty. `contents: read` for builds, `pages: read` for checks, `pages: write` and `id-token: write` only in the deploy job. No secrets. Actions are pinned to commit SHAs.
* `build` runs source validation, `npm audit`, then `npm run build:pages` (build the allowlisted `dist/` and verify it independently), records the commit and tree digest in the
  "Release record" and uploads only `dist/` (kept 90 days). `deploy` is the single deploy step. `verify-live` checks out the deployed commit and compares the live site with its
  `scripts/publish-manifest.json` and the digest the build recorded.
* `deploy` and `rollback` share the concurrency group `pages-production` (never cancelled), so they can never run at the same time.

### Rollback (`rollback.yml`)
It restores a previous release by its exact commit and never builds or deploys the current `main`.
1. Take `release_sha` and the tree digest from that release's "Release record" (job summary of its `pages.yml` run) and start the workflow from `main`.
2. `guard` requires a full 40-character SHA and a full 64-character digest, refuses the current `main`, requires Pages to be artifact-deployed, requires the commit to be an ancestor of
   `main`, and requires a successful `pages.yml` run for that commit on `main` (built, deployed and verified live). Deployment records are not used for this: they carry the commit
   of the workflow run, which for a rollback would be the current `main`, not the content deployed.
3. `rebuild-exact-release` checks out that commit alone into `release/`, proves `HEAD` equals the request and that it is an ancestor of `main`, runs source validation, builds and
   verifies the artifact there, and refuses to continue unless the rebuilt tree digest equals the supplied one. It writes a "Rollback record" (restored commit and digest, run, actor, and
   the current `main`, which is not built). Builds are deterministic, so this reproduces the original artifact without depending on artifact retention.
4. `deploy` uses the same environment-gated step. `verify-live` then compares the live site with the RESTORED release's manifest and recorded digest, using the verifier from `main`
   so it exists even for an older release, and re-checks that Pages is still artifact-deployed.
5. A rollback never changes the Pages source. Never roll back by switching the source to a branch: that republishes the repository root. If the workflows themselves are unusable, revert the
   offending change with a pull request and let the normal deployment run.
Not covered: a release made before the publication boundary existed has no manifest and cannot be restored this way; the first release has nothing to roll back to.
