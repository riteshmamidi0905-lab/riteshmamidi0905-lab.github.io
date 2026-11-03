# Operator checklist: repository protection before the first Actions deployment

Every item changes repository settings and needs the owner's explicit action. None of it is done by the tooling. "Read-only check" shows what can be confirmed without changing
anything; items marked UNCONFIRMABLE can only be confirmed by trying them (ideally in the rehearsal repository first).

State observed read-only on 2026-11-03: Pages source legacy (`main`, `/`); `main` not protected, no rulesets; one environment `github-pages` restricted to branch `main`, no
reviewers, administrators can bypass; repository is public and user-owned; the owner is the only collaborator; workflow token default `read`; no Actions secrets or variables.

## 1. Ruleset on `main` (Settings > Rules > Rulesets > New branch ruleset; target `main`; enforcement Active)
- [ ] Restrict deletions; block force pushes.
- [ ] Require a pull request before merging. Required approvals: **0** (the sole owner cannot approve their own pull request; 1 would block every merge).
- [ ] Require status checks to pass: add the check named **validate** (job `validate` of workflow "Validate cinematic portfolio"). It appears in the picker only after it has run on the repository; it has. "Require branches to be up to date": on.
- [ ] Bypass list: empty (or the owner role only if an emergency path is wanted; every bypass should be noticed).
- Read-only check: `gh api repos/<owner>/<repo>/rulesets` (expect one active ruleset) and `gh api repos/<owner>/<repo>/rules/branches/main`.
- UNCONFIRMABLE read-only: whether the free plan applies the ruleset to a public user repository exactly as expected (it should); confirm by opening a test pull request that fails the check.

## 2. Required CI checks
- [ ] The required check is `validate` only; `pages.yml` and `rollback.yml` must NOT be required checks (they do not run on pull requests).
- [ ] Settings > Actions > General: workflow permissions "Read repository contents" (already), "Allow GitHub Actions to create and approve pull requests" off (already).
- [ ] Actions permissions: allow only actions the workflows use (all are pinned by SHA), or turn on "Require actions to be pinned to a full-length commit SHA". Read-only: `gh api repos/<owner>/<repo>/actions/permissions` (`sha_pinning_required` is currently false).
- [ ] Fork pull request workflows: keep approval required for first-time contributors or stricter.

## 3. `github-pages` environment (Settings > Environments > github-pages)
- [ ] Deployment branches: "Selected branches", only `main` (already so). Read-only: `gh api repos/<owner>/<repo>/environments/github-pages/deployment-branch-policies`.
- [ ] Required reviewers: the owner. **Prevent self-review: OFF** (with it on, a sole owner could never approve). UNCONFIRMABLE read-only: whether the plan and visibility allow reviewers on this environment (public repositories on free plans generally do) and whether the owner can be their own reviewer; test in the rehearsal repository first.
- [ ] "Allow administrators to bypass configured protection rules": **off** if available (currently on).
- [ ] No environment secrets are needed (the workflows use none).

## 4. Pages publishing source (last, after sections 1-3 and the history decision)
- [ ] Settings > Pages > Build and deployment > Source: **GitHub Actions** (API `PUT /repos/<owner>/<repo>/pages` with `build_type=workflow`). Read-only: `gh api repos/<owner>/<repo>/pages -q .build_type` must change from `legacy` to `workflow`.
- [ ] Enforce HTTPS stays on (already). Custom domain: none.
- [ ] Do this BEFORE merging the release pull request (see `scripts/FIRST-DEPLOYMENT.md`); never leave the release merged with a legacy source.
- UNCONFIRMABLE read-only: that the site keeps serving the last legacy content between the switch and the first Actions deployment; rehearse it.

## 5. After the first release
- [ ] The five jobs succeeded (none skipped), the release record exists, `verify-release-record.py` accepts it, and the live site verifier passes.
- [ ] Revisit: artifact attestations, shorter reviewer lists, dependabot for the pinned actions.
