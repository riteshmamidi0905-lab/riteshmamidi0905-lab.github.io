# Ritesh Mamidi — portfolio (redesign candidate, branch `redesign/d90-systems-worlds`)

> **Candidate only.** Branched from production `main` 783ba64. Not pushed, merged or deployed. `main` and every earlier branch are untouched.

Static GitHub Pages site, no build step, no framework, no video. New in this branch: `index.html` (home: hero, four worlds, flagship replay, build index), `nasha.html` (flagship case study: architecture explorer, replay of 8 recorded runs, security design, evaluation, limits, evidence table), `recruiter.html` (rebuilt in the new design system, experience text verbatim), `css/system.css`, `js/*.js` (about 15 KB), `data/nasha-governed-evidence.json` (real recorded evidence from the NASHA repository). The legacy pages `projects.html`, `ai-engineering.html` and `nasha-lab.html` are unchanged and still use `cinematic.css`.

## Preview locally
```
python3 -m http.server 8011        # the evidence JSON is fetched, so file:// will not work
open http://127.0.0.1:8011/
```

## Checks
```
python3 scripts/validate-release.py              # manifest hashes, secret/media signatures, links, 24 projects, evidence-file invariants
python3 scripts/qa-redesign.py                   # Playwright: overflow, clipping, axe, keyboard, reduced motion, slow network
python3 scripts/summarize-qa.py                  # writes docs/redesign/QA-AND-PERFORMANCE.md (Lighthouse JSON in docs/redesign/lighthouse)
python3 scripts/build-manifest.py                # after an intentional change: regenerate release-files.json (the diff is the review record)
```
The legacy Node tests (`scripts/test-model.cjs`, `scripts/test-browser.cjs`) target the previous homepage and were **not** run or updated here (their npm dependencies are not installed offline).

## Evidence honesty rules
Every number on the pages is read from `data/nasha-governed-evidence.json`, produced by `lab/tools/export_portfolio_evidence.py` in the NASHA repository by actually executing the scenarios. The file records the NASHA commit it came from and that the commit was **not pushed**. Components are labelled implemented/tested, real-but-separate-repo, not-integrated, blocked or designed-only; the site makes no claim beyond that.

## Documents
`docs/redesign/`: `VISUAL-AUDIT-D90.md`, `DESIGN-RESEARCH.md`, `CREATIVE-DIRECTION-AND-DESIGN-SYSTEM.md`, `RUNWAY-PLAN.md` (nothing purchased), `QA-AND-PERFORMANCE.md`, `screenshots/` (desktop, tablet, mobile; webp).

## Remaining before this could be considered for release
Restyle `projects.html`, `ai-engineering.html`, `nasha-lab.html` and `404.html`; update or replace the legacy Node tests; decide on portrait/avatar assets (none are in `main`; older branches hold unreviewed ones); cross-browser and screen-reader testing; your review of every claim and screenshot; explicit approval before any push or deploy.

(Original release notes: GitHub Pages publishes `main` from the repository root; revert releases through a normal PR; never restore restricted historical assets.)
