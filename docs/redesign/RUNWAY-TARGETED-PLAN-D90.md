# Targeted Runway production plan (D-90) — NOTHING PURCHASED, NOTHING GENERATED

Supersedes the shot list in `RUNWAY-PLAN.md` for the pages that now exist (home, flagship film, reliability and security dashboards). **No subscription was bought and no paid asset was generated.** Prices and credit rates below are carried over from the earlier snippet-level research and are **unverified**; confirm on Runway's own pages before any approval.

## Principle
The strongest material on this site is recorded and real: the replayed run, the architecture, the dashboards. Generated footage cannot show those and must never imply working functionality. Footage is allowed only as **abstract, labelled atmosphere**. Everything that carries meaning stays code-drawn (canvas, SVG, CSS), which already ships at roughly 15 KB of JavaScript, no video, and keeps the validator's no-video guard intact.

## Where footage would materially help (ranked)
| # | Sequence | Where | Why it might help | Why it might not | Code-only alternative (exists) |
|---|---|---|---|---|---|
| 1 | **Ambient signal field** (6 s seamless loop, abstract lines and nodes in the four world hues) | behind the hero canvas, desktop only | adds depth and colour grading the 2D canvas lacks | the canvas already reads as cinematic; a loop adds weight on the most performance-critical view | the existing `hero.js` canvas |
| 2 | **World hand-off wipes** (3 × 4 s: AI→Data, Data→Systems, Systems→Product) | between world panels on the home page | smoother storytelling between the four worlds | the world panels already change accent and diagrams; transitions are decorative | CSS accent cross-fade (shipped) |
| 3 | **Audit-seal moment** (3 s, abstract hash chain closing into a ring) | end of the flagship film, stage 8 | a memorable finishing beat for the audit trail | risks implying a real system recording; must be labelled illustrative | the CSS-drawn chain of ledger rows (shipped) |

Not planned: any "system dashboard in motion", screen-recording lookalike, product footage or people. Those would be fabricated evidence.

## Production spec (only if approved)
* **Look:** matte black background `#06090a`, thin luminous lines, one world hue per clip (AI `#7ce8bd`, data `#62c9ff`, systems `#ffb85c`, product `#ff94a8`); no text, no logos, no UI, no faces.
* **Prompts (abstract):** “slow drifting field of thin luminous lines connecting small glowing nodes on near-black, shallow depth, seamless loop, no text” (1); “two coloured line fields dissolving into each other, left to right, near-black background, no text” (2); “a chain of small glowing squares closing into a ring, near-black, calm, no text” (3).
* **Budget (unverified):** about 5 credits per second reported; roughly 30 credits per attempt for the 6 s loop and 20 per 4 s clip; about 300 credits if all three are approved with a few iterations each. The earlier plan suggested starting with the free credit tier to test only clip 1.
* **Delivery budget:** ≤ 1.2 MB per clip (H.264 and AV1 via ffmpeg), poster frame, `preload="none"`, lazy-loaded below the fold, disabled for `prefers-reduced-motion` and `Save-Data`, hidden on mobile. Add an “Illustrative” caption on every clip.
* **Acceptance (all must hold):** Lighthouse mobile performance not worse than the current candidate (97–100 reported earlier); no CLS; LCP unchanged; clip never plays on the reduced-motion path; the page reads identically with the clip removed.
* **Guard change:** `scripts/validate-release.py` forbids video today. Adopting any clip means adding a deliberate allow-list entry for that one file and its hash in the reviewed manifest.

## Decision
**Recommendation: do not spend for this release.** Ship the code-drawn motion, which now covers the hero, the scroll-pinned pipeline film and the dashboards. If you want footage later, approve only clip 1 on the free tier and judge it against the acceptance list above. Nothing proceeds without your explicit approval.
