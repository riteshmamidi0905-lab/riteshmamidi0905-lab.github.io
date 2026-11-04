# Rehearsal of the deployment and rollback workflows in a disposable repository

## Verification checkpoint — 2026-11-04

The historical Stage 1 table below records observations at that time. Its `NOT RUN` entries are not claims that newer tests were performed; the continuation table here is authoritative for the later work. `FIRST-DEPLOYMENT.md` uses the same coverage and blockers. No production content or authorized release-candidate file was changed by these rehearsals.

| Scenario | Run / attempt | Observed outcome | Scope / remaining limitation |
|---|---|---|---|
| Partial retry queued behind active workflow | `41760318679`, attempt 2 | Pending retry was cancelled when a newer pending run arrived; no jobs or release record | Real GitHub concurrency observation; this attempt did not reach deployment |
| Workflow supersession | Active `41883714882`; pending `41884085828`, then `41884178351` | Active workflow stayed at reviewer gate; older pending run was cancelled without jobs or release record | Real GitHub; pending runs were explicitly cancelled after evidence capture |
| Current-attempt deploy-only rerun | `41883714882`, attempt 2 | Successful build reused; deploy waited at a fresh required reviewer gate; cancelled without approval | Proves that rerunning deploy does not bypass the environment gate |
| Old-attempt job rerun | Job `126346802358` | HTTP 403: `Only jobs from the current attempt can be re-run` | GitHub API refusal; not a successful rerun |
| Live legacy-source configuration | No guard run under legacy source | Pages settings PUT returned HTTP 403; readback stayed `workflow` | BLOCKED by integration permission; no production setting changed |
| Exact production legacy-source guard | Local controlled `gh` responses | `workflow` exit 0; `legacy`, empty and unexpected values exit 1 | Local command execution only; does not prove live source-switch behavior |
| Non-main ref | `41885965137`, branch `guard-nonmain-fixture` | Workflow completed skipped; all five jobs skipped; no approval or artifact | PASS: main-only conditions prevent off-main deployment |
| Missing release-record artifact (historical run, reverified) | Run `41737099573`, evidence job `126269037835` | Job log explicitly says `ROLLBACK REFUSED (fail closed): no run of the production deploy workflow qualifies for that commit. run 41731687806: the release record artifact is missing`; later jobs skipped; no deployment or record | Existing evidence inspected; no artifact deleted in this continuation |
| First-release Git recovery | Local isolated squash then revert | Tree exactly equals `783ba6464e20ebf064da4448c94d5461fb358ab4`; original validator passed | No previous production Actions release fabricated; live restoration not attempted |
| Physical Safari | No run | No accessible physical Apple hardware or device service | BLOCKED; no emulator or WebKit result is presented as real-device coverage |
| Failed live verification on GitHub | `41884575264`, attempt 1, commit `f605d04b347c4f8961d500658ce7e4d9a414d039` | Guard and build succeeded; deploy waited for reviewer; reviewer-decision POST returned HTTP 403; cancelled with deploy, verify-live and record-release cancelled; no release record | BLOCKED before deployment, not a passed failed-verification scenario. Environment protections were not weakened. |
| Downloaded Actions artifact | Run `41884575264`, artifact `13351220954` | ZIP and contained tar inspected independently: 49 exact manifest files, 1,791,138 bytes, pinned tree digest `fc71be319008b783e8e72a0ad6857975cc50b9eb4322d7f3d13f8a19b122b056`; no symlinks, extra files or duplicate paths | Build-artifact evidence only, not deployment evidence |
| Failed live verification locally | Real candidate verifier; isolated HTTP server | Missing file, corrupt bytes and reachable excluded tooling each returned exit 1; real record writer refused each failed verification, created no file, and also refused skipped/cancelled results | PASS for local failure propagation. Successful deploy is a controlled local input, not a deployment claim. |
| Partial rerun after failed live verification / direct retry of record job | No remote execution | Cannot reach the failed-live-verification state without the blocked deployment-review operation | BLOCKED; exact release-evidence and rollback-guard tests already passed in the prior checkpoint, but do not establish this live GitHub scenario |
| Rehearsal cleanup | Restore commit `021e9a9bfabee707d4b021076620665b283d933e` | Normal revert restores the exact tree of `6d8fd1984b1845610024490e84404fdaac1db2a8`; source remains workflow; follow-up workflow runs cancelled; no production mutation | Test fixture branch retained as evidence; no release evidence deleted |

The source-switch continuity scenario remains unverified. Remote tests blocked by HTTP 403 require access that can administer Pages and submit deployment reviewer decisions in the disposable repository. Do not change production protections to work around this restriction. Real-device Safari requires physical Apple hardware or a physical-device service that is not currently available. Production deployment remains separately authorized and gated.


Purpose: exercise, on real GitHub Actions, the paths that local tests can only simulate: the Pages deployment, the release record upload, `gh run download`, the real
runs/jobs/artifacts API shapes, and the rollback. A passing local test or fake-`gh` run does NOT prove production behaviour; only this rehearsal and the first real release do.
Nothing in this file is done by the repository tooling. Steps marked **[APPROVAL]** need the repository owner's explicit go-ahead; steps marked [local] touch nothing on GitHub.

## Feasibility and the simplest safe configuration

| Question | Finding |
|---|---|
| Pages | Free for public repositories. A **project site** is served at `https://OWNER.github.io/NAME`; the live verifier works under that path (tested locally against a subpath: 48 files identical, 15 excluded URLs unavailable). A user/organisation site (`OWNER.github.io`) is unique per account, so a second one would need another account or organisation. |
| Environment reviewers | GitHub documents required reviewers, wait timers and deployment-branch restrictions as available for **public** repositories on Free, Pro and Team (up to six reviewers). |
| Self-review | The "prevent self-review" option, when on, stops the person who started the deployment from approving it. A sole owner therefore needs it **off**. (Environment settings can only be confirmed by trying them.) |
| Admin bypass | On by default; can be disabled for public repositories on Free. Turn it off for the rehearsal to match the intended production setting. |
| Repository permissions | The rehearsal workflows use the repository's own `GITHUB_TOKEN` with the per-job permissions in the files (top level `{}`; only `deploy` has `pages: write` and `id-token: write`). No secrets, no personal tokens. |
| Artifacts and logs | Retention is up to 90 days on public repositories. The rehearsal's records and logs vanish after that or when the repository is deleted. |
| Public-site duplication | The rehearsal site is a public duplicate of the portfolio (canonical and sitemap URLs still name the production host, because the content is deliberately unchanged so the pinned digest is exercised). Mitigation: short-lived repository, deleted at the end (step 10). |
| Is a second account or organisation necessary? | **No.** The procedure below uses a project-site repository under the existing account. (A user-site repository `ORG/ORG.github.io` in another account is also supported by the generator, but is not used here.) |

Residual risk of the same-account option: the `gh` login that creates the repository also has admin on the production repository. Mitigations: always pass `-R "$REH"`, never add a
remote for the production repository to the rehearsal directory, and note that the rewritten workflows only run where `github.repository` equals the rehearsal repository (pushed
anywhere else, every job skips). `make-rehearsal-tree.py` refuses the production repository itself.

Repository: `riteshmamidi0905-lab/nasha-pages-rehearsal`. Site: `https://riteshmamidi0905-lab.github.io/nasha-pages-rehearsal`.

## Execution plan

Set variables once (shell): `REH=riteshmamidi0905-lab/nasha-pages-rehearsal`, `SITE=https://riteshmamidi0905-lab.github.io/nasha-pages-rehearsal`, `PROD=riteshmamidi0905-lab/riteshmamidi0905-lab.github.io`, `WORK=<an empty scratch directory outside the repository>`.

Status: steps 1 and 3 were completed and read back before any content was pushed (see the results log); nothing has been deployed.

1. **Create the disposable repository [APPROVAL].** `gh repo create "$REH" --public --description "Disposable rehearsal of release workflows. Delete after use."` (no README, no clone: the repository stays empty and no remote is configured anywhere). Stop and inspect instead if it already exists.
2. **Generate variants A and B [local].** From a checkout of the clean release candidate:
   `python3 scripts/make-rehearsal-tree.py --repo "$REH" --out "$WORK/a" --variant a` and `… --out "$WORK/b" --variant b`. Each run re-runs the workflow, evidence and publication-boundary
   tests inside the tree and builds its artifact. Expected digests: A `fc71be31…b122b056` (the pinned digest), B `94ebd0f4…` (differs on purpose). `git init` inside `$WORK/a`; B is applied later as a second commit
   (`cp -R "$WORK/b/." "$WORK/a/"`; only `404.html`, `release-files.json` and `scripts/publish-manifest.json` differ).
3. **Configure Pages and the environment [APPROVAL].**
   - Pages: `gh api -X POST repos/$REH/pages -f build_type=workflow` (accepted on the empty repository; reads back `build_type: workflow`). This also creates the `github-pages` environment with the single deployment branch policy `main`.
   - Environment: `printf '{"can_admins_bypass":false,"prevent_self_review":false,"reviewers":[{"type":"User","id":%s}],"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' "$(gh api user -q .id)" | gh api -X PUT repos/$REH/environments/github-pages --input -`.
   - Read back: `gh api repos/$REH/pages -q .build_type` is `workflow`; `gh api repos/$REH/environments/github-pages` shows `can_admins_bypass: false`, a `required_reviewers` rule with `prevent_self_review: false` and the owner as the only reviewer, and `custom_branch_policies: true`; `gh api repos/$REH/environments/github-pages/deployment-branch-policies` lists exactly `main`.
4. **Deploy A [APPROVAL: push, then approval of the deployment].** In `$WORK/a`: `git add -A && git commit -m "release A" && git branch -M main && git remote add origin https://github.com/$REH.git && git push -u origin main`. Approve the `github-pages`
   deployment when the run waits (UI, or `gh api -X POST repos/$REH/actions/runs/<run>/pending_deployments` with `environment_ids`, `state=approved`, `comment`). Record the run ID: `gh run list -R "$REH" --workflow pages.yml --json databaseId,conclusion,event,headSha`.
   Expect `guard`, `build`, `deploy`, `verify-live`, `record-release` all `success`, none skipped (`gh api repos/$REH/actions/runs/<run>/jobs`).
5. **Verify the release record [local, read-only].** `gh run download <run> -R "$REH" -n release-record-<A sha>-<run>-1 -D "$WORK/rec"`; `python3 scripts/verify-live-site.py "$SITE" --manifest scripts/publish-manifest.json --expect-digest <A digest>`;
   `python3 scripts/verify-release-record.py --repo "$REH" --sha <A sha> --digest <A digest> --release-dir "$WORK/a"` must print `RELEASE EVIDENCE VERIFIED`. This is the first proof of the real API path; compare every response shape with
   `scripts/test-release-evidence.py`'s fake and fix the fake first if they differ.
6. **Deploy B [APPROVAL: push and deployment approval].** Copy variant B over A, commit "release B", push, approve. Expect a second record and the live digest to change to B's.
7. **Roll back to A [APPROVAL: workflow run and deployment approval].** `gh workflow run rollback.yml -R "$REH" -f release_sha=<A sha> -f expected_tree_digest=<A digest>`; approve the deployment. Expect the evidence job to verify A, the rebuild to reproduce A's recorded digest,
   `deploy`, `verify-live` and `record-rollback` all `success`, a `rollback-record-<run>-<attempt>` artifact, and the live digest back to A's.
8. **Invalid and missing evidence [APPROVAL for each run; none of 8a-8c deploys].**
   a. Rollback with a wrong digest → refused at `verify-release-evidence`, later jobs skipped.
   b. Rollback to a commit with no production run (a full SHA that was never pushed to `main`) → refused: no run.
   c. Delete the record artifact of release B (`gh api -X DELETE repos/$REH/actions/artifacts/<id>`), then roll back to B → refused: record missing.
   d. Failed verification: on rehearsal `main` change `SITE_URL` in `pages.yml` to a wrong path and push; approve. Expect `deploy` success, `verify-live` failure, `record-release` skipped, **no record**; roll back to that commit → refused. Then restore the file in a new commit.
   e. Failed deployment: reject the environment approval of a push → later jobs skipped, no record.
   f. Supersession: start a rollback and queue two further runs while it waits; confirm at most one running plus one pending, the superseded run is cancelled with no `record-rollback` job and its summary says nothing was deployed.
   g. Legacy guard: set the Pages source back to legacy and push → `guard` fails, nothing deployed; switch back to Actions.
9. **Record everything.** For each scenario keep the run ID(s), every job and step conclusion (flag any `skipped`), the artifact list and the exact refusal message, in the log below. Keep failures as carefully as successes.
10. **Remove the temporary public site [APPROVAL].** `gh auth refresh -s delete_repo` (the owner), then `gh repo delete "$REH" --yes`. Deleting the repository unpublishes the site and removes its runs, artifacts and records. Confirm `curl -sI "$SITE/" | head -1` returns 404 after a few minutes, and delete `$WORK`.

## Pass criteria
Every "expect" above held, and no job was `skipped` where success was claimed. Any deviation (especially a refusal that did not happen, or a completion claimed without `record-rollback`) blocks production use and is fixed first in `scripts/` with a new failing test, then re-rehearsed.

## Results log
Stage 1 negative controls were run against the live rehearsal repository on 2026-11-03 with release A live. After all eight negative runs: 8 new runs (13 total), 3 deployments (unchanged), 0 pending approvals, 1 rollback-record artifact (the successful rollback's), the live site still matches `fc71be31…b122b056` and the live `404.html` has no release-B marker.

| Scenario | Run ID | Expected | Actual | Deployment attempted? | Record created? | Live site changed? | Result |
|---|---|---|---|---|---|---|---|
| Setup (2026-11-03) | none | Repository empty and public; Pages `workflow`; environment: admin bypass off, owner sole reviewer, self-review allowed, branch `main` only | As expected; no secrets, no variables, token default read | No | No | No | PASS |
| Release A deploy (step 4) | 41719092937 (validate 41719092946) | guard, build, deploy, verify-live, record-release success after approval; record artifact; digest `fc71be31…` | All five jobs success, none skipped; artifact `release-record-<A>-41719092937-1` (13272915136); live matches; 12 dev paths 404 | Yes (approved) | Release record only | Yes (first release) | PASS |
| Verify record (step 5) | local, real API | `RELEASE EVIDENCE VERIFIED`; wrong digest, unknown SHA, other repository refused | As expected | No | No | No | PASS |
| Release B deploy (step 6) | 41721443867 (validate 41721444197) | Same five jobs; digest `94ebd0f4…` | As expected; one transient 503 in a local check, runner check passed first time | Yes (approved) | Release record only | Yes (A to B) | PASS |
| Rollback to A (step 7) | 41722856847 | Evidence accepted, rebuild reproduces `fc71be31…`, deploy, live check, rollback record `COMPLETED` | As expected; artifact `rollback-record-41722856847-1` (13273138266); B marker gone; A's file hash restored | Yes (approved) | Yes | Yes (B to A) | PASS |
| 8a Wrong digest (zeros) | 41724221837 | Refused at evidence job; later jobs skipped | `ROLLBACK REFUSED (fail closed): … the supplied digest does not equal the digest in the release record`; evidence job failed, 4 later jobs skipped | No | No | No | PASS |
| 8a' Wrong digest (B's real digest) | 41724322339 | Same refusal | Same message | No | No | No | PASS |
| 8b Unreleased full SHA (`1111…`) | 41724434213 | Refused before any evidence or build | Request validation failed at 'The commit was released from main'; message is the raw `gh: Not Found (HTTP 404)` (the friendly 'not an ancestor' text is not reached). Fails closed; message quality is a discrepancy | No | No | No | PASS (message discrepancy) |
| 8-input Short SHA `50580ce` | 41724502014 | Refused by input validation | `release_sha must be a full 40-character commit SHA` | No | No | No | PASS |
| 8-input Uppercase SHA | 41724580259 | Refused by input validation | Same message | No | No | No | PASS |
| 8-input Digest of 63 characters | 41724629500 | Refused by input validation | `expected_tree_digest must be 64 hex characters` | No | No | No | PASS |
| 8-input Branch name `main` as SHA | 41724676663 | Refused by input validation | `release_sha must be a full 40-character commit SHA` | No | No | No | PASS |
| 8-input Current main as target (B) | 41724719576 | Refused: not a previous release | `refusing: that is the current main, not a previous release` | No | No | No | PASS |
| 8-input Unsupported ref | not run | Every job requires `refs/heads/main` | Needs a non-main branch in the rehearsal repository, which was not created; covered statically by `scripts/test-workflows.py` only | n/a | n/a | n/a | NOT RUN |
| 8c-8g Deleted record, failing verify-live, rejected deploy, supersession, legacy source | historical Stage 1 status | Stage 2 (destructive) | Not executed at Stage 1; see the 2026-11-04 continuation table for newer observations and explicit blockers | n/a | n/a | n/a | HISTORICAL; see continuation |

## Not covered by the rehearsal
Production-only settings (production environment reviewers, rulesets), the real site's cache behaviour, a release older than a few days, and anything about the production repository's history. Re-verify those in
the first production release using `scripts/FIRST-DEPLOYMENT.md`. Costs: none expected (public repository standard runners, Pages and artifact storage are free).
