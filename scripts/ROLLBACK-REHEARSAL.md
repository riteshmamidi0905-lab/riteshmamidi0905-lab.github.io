# Rehearsal of the deployment and rollback workflows in a disposable repository

Purpose: exercise, on real GitHub Actions, the paths that local tests can only simulate (the Pages deployment, the release record upload, `gh run download`, the Actions
runs/jobs/artifacts API shapes, and the rollback). Nothing here is done by the repository tooling: creating the disposable repository and every step below needs the
operator's separate authorisation. A passing local test or fake-`gh` run does NOT prove production behaviour; only this rehearsal and the first real release do.

## Setup (operator)
1. Create a new, empty, **public** repository named `ORG/ORG.github.io` in a **separate** account or a free organisation (recommended: a new organisation, so the production
   account and its token are never involved). A user or organisation site repository is unique per account, so the production account cannot host a second one, and
   `make-rehearsal-tree.py` refuses the production account. Public so the 90-day artifact and API behaviour match production (Pages on a private repository needs a paid plan).
   Use `gh` authenticated as the rehearsal account only; never set a remote to the production repository.
2. Locally, from the release candidate: `python3 scripts/make-rehearsal-tree.py --repo OWNER/OWNER.github.io --out <dir> --variant a`. It copies the committed files, points the
   two deployment workflows and the safety rules at the rehearsal repository, and re-runs the workflow, evidence and publication-boundary tests there. The content is the
   already-approved public site (so the real verifier and the pinned digest are exercised); nothing private is added. The tree has no history: `git init` it yourself.
3. In the rehearsal repository: Settings > Pages > Source = GitHub Actions; create the environment `github-pages` limited to `main` (add yourself as reviewer to rehearse approval).
4. Push the tree to `main` as release **A**.

## Safety properties
* The rewritten workflows run only where `github.repository` is the rehearsal repository; pushed anywhere else (including by mistake to production) every job skips.
* The tree contains tracked files only: no history, no credentials, no secrets (the workflows use none; the default token is scoped per job).
* The published pages still contain the production site's canonical and sitemap URLs and the author's real profile links, because the content is deliberately unchanged
  (changing it would change the digest and the verifier's expectations). The rehearsal site is therefore a public duplicate: delete the repository or unpublish it when done.

## Scenarios (record run IDs and conclusions for each)
| # | Do | Expect |
|---|---|---|
| 1 | Push A to `main`; approve the environment | `guard`, `build`, `deploy`, `verify-live`, `record-release` all `success`; artifact `release-record-<sha>-<run>-<attempt>`; summary shows 49 files and the digest |
| 2 | `python3 scripts/verify-live-site.py https://OWNER.github.io --manifest scripts/publish-manifest.json --expect-digest <digest>` | 48 files identical, excluded URLs 404, non-allowlisted paths 404 |
| 3 | `gh run download <run> -n release-record-…` and `python3 scripts/verify-release-record.py --repo OWNER/OWNER.github.io --sha <A> --digest <digest> --release-dir <checkout of A>` | `RELEASE EVIDENCE VERIFIED` (first proof of the real API path) |
| 4 | Make release **B**: `make-rehearsal-tree.py … --variant b`, copy the changed files over A, commit, push, approve | A new record for B; the live site now has a different digest |
| 5 | Run `rollback.yml` with `release_sha=<A>`, `expected_tree_digest=<A digest>` | evidence job verifies A; rebuild reproduces the recorded digest; deploy, live verification and `record-rollback` succeed; artifact `rollback-record-…`; site back to A's digest |
| 6 | Run the rollback with a wrong digest | refused at the evidence job; nothing deployed |
| 7 | Run the rollback for a commit with no run (e.g. an unreleased commit) and for a commit older than 90 days if available | refused: no run / expired record |
| 8 | Re-run only `record-release` or only `verify-live` of a finished run and delete its record artifact in the UI, then roll back to it | refused: record missing, no completion claimed |
| 9 | Push a change that makes `verify-live` fail (e.g. temporarily point `SITE_URL` at an unrelated host in a throw-away branch of the rehearsal repo, merged to rehearsal `main`) | `deploy` may succeed, `verify-live` fails, `record-release` is skipped, **no record exists**, and rollback to that commit is refused |
| 10 | Make `deploy` fail (reject the environment approval) | later jobs skipped, no record |
| 11 | Start a rollback and push a new commit while it waits or runs; then another | at most one running and one pending run; the superseded rollback is cancelled and leaves no `record-rollback`; its summary says nothing was deployed |
| 12 | Switch the rehearsal Pages source back to legacy and push | `guard` fails and nothing is deployed |

## What to capture
Run IDs, job and step conclusions (check that nothing is `skipped` where success is claimed), the artifact list for each run, the exact refusal messages, and any difference between
the real API responses and `scripts/test-release-evidence.py`'s fake `gh` shapes. If real responses differ, fix the fake first, then the gate, and re-run the local suite.

## Not covered by a rehearsal
Production-only settings (the production environment reviewers, rulesets, the real site's cache and CDN behaviour), a real release older than a few days, and anything about the
production repository's history. Re-verify those during the first production release using `scripts/FIRST-DEPLOYMENT.md`.

## Results log (fill in; keep failures as carefully as successes)
| # | Date | Run ID(s) | Jobs and conclusions (note any `skipped`) | Matched expectation? | Notes / API differences |
|---|---|---|---|---|---|

## Cost and account limits
No charge expected: public repositories get free standard-runner minutes, free Pages and free artifact storage (retention up to 90 days). A free organisation can hold the
site repository and the `github-pages` environment with required reviewers. Limits to confirm during setup: reviewer rules on the free plan, and that a sole member may
approve their own deployment (leave "prevent self-review" off).
