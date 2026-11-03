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

## GitHub Pages settings (requires separate authorization)

Pages is currently a legacy build from `main` at `/`. A legacy build publishes the whole repository root as it is, so a workflow change alone cannot
exclude files. The allowlisted artifact takes effect only after the Pages source is switched to **GitHub Actions** (Settings > Pages > Build and
deployment > Source; API: `PUT /repos/{owner}/{repo}/pages` with `build_type=workflow`). Until then, merging publishes everything at the root.

Order of operations (the live site keeps serving the last deployment when the source is switched):
1. Add `scripts/proposed-workflows/pages.yml.proposed` as `.github/workflows/pages.yml` (in the pull request, so it is reviewed). It cannot deploy while the source is legacy.
2. Switch the Pages source to GitHub Actions. Add required reviewers to the `github-pages` environment (a human approval before every deploy).
3. Merge. The push to `main` runs the workflow, which deploys only the verified `dist/` artifact. No legacy build happens.
4. Confirm the `verify-live` job passed: every manifest file is served byte-identical and every excluded development URL is unavailable.

### Deployment design (`scripts/proposed-workflows/pages.yml.proposed`, not installed)
* Triggers: push to `main` and a manual run of `main`. No pull request, comment or schedule trigger exists; every job also requires `refs/heads/main`, and the
  `github-pages` environment is already restricted to `main`.
* Token permissions start empty; `contents: read` for builds, `pages: read` for checks, and `pages: write` plus `id-token: write` only in the deploy job.
  No secrets. Third-party actions are pinned to commit SHAs (`scripts/test-proposed-workflows.py` enforces the pins and these properties).
* It fails before building if Pages is not set to "workflow", so it can never silently fall back to repository-root publication, and it checks again after deploying.
* The deploy job publishes the artifact built by the same run from `npm run build:pages` (exactly the publication manifest). The build job records the commit and
  tree digest in the job summary ("Release record") and keeps the artifact 90 days.
* After deploying, `scripts/verify-live-site.py` compares the live site with the manifest of the deployed commit (byte-identical, SHA-256) and requires the excluded URLs to be unavailable.

### Rollback (`scripts/proposed-workflows/rollback.yml.proposed`, not installed)
Rollback restores a previous verified release by its exact commit; it never builds the current `main`.
1. Find the release to restore: a deploy run's "Release record" gives its `release_sha` and `tree digest`.
2. Run the "Roll back GitHub Pages to a verified release" workflow from `main` with both values. The guard job requires a full 40-character SHA and a full digest, refuses the
   current `main`, requires Pages to be artifact-deployed, and requires a recorded successful production deployment of that commit.
3. The workflow checks out that commit alone, proves `HEAD` equals the request and that it was released from `main`, runs source validation, builds and verifies the artifact there,
   and refuses to continue unless the rebuilt tree digest equals the recorded one. Builds are deterministic, so this reproduces the original artifact without depending on artifact retention.
4. The restored artifact goes through the same environment-gated deploy job. Then the verifier (taken from `main`, so it exists for older releases) compares the live site with
   THAT release's manifest and confirms the excluded development URLs are unavailable.
5. Never roll back by switching the Pages source back to a branch: that republishes the repository root. If the workflows themselves are unusable, revert the offending change
   with a pull request and let the normal deploy run.
Not covered: a release made before the publication boundary existed has no manifest and cannot be restored this way.
