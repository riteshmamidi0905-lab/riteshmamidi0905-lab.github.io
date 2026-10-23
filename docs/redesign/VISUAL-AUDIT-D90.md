# Visual audit of the current portfolio (D-90)

## What was and was not inspected
* **Inspected:** a headless-Chromium render (Playwright, Chromium 1194) of the repository at `origin/main` **783ba64** ("Merge pull request #4 … release/cinematic-portfolio-20261021"), served locally, at desktop 1440×900, laptop 1280×720, tablet 820×1180 and mobile 390×844. Full-page and first-screen captures of all five pages were opened and examined.
* **Not inspected:** the deployed site at `https://riteshmamidi0905-lab.github.io/`. The sandbox proxy returns 403 for that host, so the live render could not be compared with the repository render. Claude in Chrome was not available in this session; headless Playwright was used instead. Nothing below claims a live-site observation.

## Finding that changes the brief: a cinematic release is already merged
`origin/main` already contains the "sanitized cinematic portfolio" (PR #4, 2026-10-21). Remote branches that still hold earlier work (all fetched and preserved, none modified): `release/cinematic-portfolio-20261021` (merged), `wip/cinematic-worlds-lab` (58 commits not in main), `wip/nasha-ai-command-center` (16), `weir-control-center` (90), `deployment-bundle-339adc5` (36), `wip/v2-art-direction`, `wip/nasha-ecosystem-20261019`, `feat/mcp-weir-case-study`, tag `pre-v2-rollback`. The merged release is deliberately small (26 reviewed files, about 129 KB, no media: its validator forbids `<video>`, `<audio>`, and anything under `assets/media` or `assets/nasha`) because restricted historical assets were removed. **No portrait/avatar is in main**; the earlier branches hold older avatar/profile assets whose approval status was not re-verified here, so none was reused.

## What the current main does well
* Disciplined dark/mint system, strong type scale ("Intelligence, with intention."), readable hero, clear primary actions.
* Honest copy: limits, "independent builds", "synthetic data" are stated. This candidate keeps that standard.
* Tight and fast: no build step, local fonts, one small script.

## Why it falls short of the goal (evidence from the renders)
1. **Static and abstract.** The hero is a decorative orbit labelled "RM / HUMAN INTENT"; it does not show anything I built. Motion is limited to small reveals.
2. **One palette for everything.** AI, data, systems and product work all share the mint accent, so there is no sense of moving between "worlds".
3. **Project-card sameness.** Six identical glyph cards ("EVENT → STREAM → VERDICT") read as a template grid, the pattern the brief asks to avoid.
4. **The flagship is a picture, not an experience.** The NASHA section is a static boxed "system map" with the line "No operating brewery or live enterprise deployment"; a visitor cannot inspect a single real run or see what is tested versus designed.
5. **Defects visible in the render:** a clipped orbit label ("02 / EVALUA" cut at the right edge at 1440 px); 8–10 px mono labels (hard to read); the page is mostly text blocks below the hero.
6. **No recruiter fast path on the home page** beyond a nav link; role targets and the three strongest builds are not visible on the first screen.
7. **Mobile length:** the old homepage is 7.4 screens at 390 px; contact is far from the top.

## What was kept
Fonts and licences (Inter, JetBrains Mono), the six project catalog entries and their anchors, the professional-experience text verbatim, the résumé PDF, the legacy pages (`projects.html`, `ai-engineering.html`, `nasha-lab.html`) untouched, the honesty rules.
