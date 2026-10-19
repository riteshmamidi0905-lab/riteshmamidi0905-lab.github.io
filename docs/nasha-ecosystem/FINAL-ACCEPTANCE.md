# Cinematic finalization and launch acceptance

Review date: 2026-10-19. Candidate branch: `wip/nasha-ecosystem-20261019`.
Starting HEAD: `1629b3a6c6d0a22c54d083fc6cda5531f93123b5`.
Starting exact-head CI: [Validate portfolio #72 SUCCESS](https://github.com/riteshmamidi0905-lab/riteshmamidi0905-lab.github.io/actions/runs/39307175827).
The latest commit on this branch is the finalization candidate; its exact-head Actions result is reported separately at handoff, without treating #72 as CI for new work.

## Decision

**Ready for controlled owner review; hold public launch.** Engineering and the recruiter journey are inspectable and existing automated acceptance is retained. A local silent film and social stills are prepared. Human screen-reader testing, real-device/film acceptance and separate production/social approval remain open. No full WCAG conformance, production readiness of an operational AI service, recruiter conversion result or real-network performance result is claimed.

## Changes and preserved scope

The existing Command Center, Digital Twin, illustrative workflow controls, THE WEIR walkthrough, twelve SVG specialist identities, recorded Python outputs and recruiter evidence map are preserved. The only demonstrated product correction is reusing the existing portfolio inline favicon: local HTTP revealed a missing `/favicon.ico` request and console error that routed-file tests had not exposed. The standalone preview was rebuilt. No engineering contract or test was weakened.

New source tools render the local film, review keyboard flows and reproduce local Lighthouse measurements. The keyboard review is appended to development CI; all existing CI checks remain. Documentation, evidence metadata and the ledger are updated. Rendered film, captions, posters, social stills, screenshots, source checkouts, raw Lighthouse reports and installed tools remain under ignored `work/`.

## Film acceptance

- 48 seconds; 1080×1350 portrait; 24 fps; H.264; 1,152 frames; silent; complete FFmpeg decode passes. About 1.3 MB. Exact hashes and scope: `evidence/film-finalization.json`.
- Eight chapters replace equal-length wide shots with a concrete inventory opening, three consistent existing specialist close-ups, recorded service/gateway evidence and a source/evidence invitation. Durations are 6, 5, 5, 5, 8, 8, 5 and 6 seconds; 0.2-second fades provide restrained transitions. These are edited still captures, not filmed live interactions.
- Primary burned-in captions are 42 source pixels, about 15.2 pixels at a 390-pixel video width. Embedded interface text is supporting evidence and is not all phone-readable; larger editorial captions carry the narrative. The review player offers the full transcript and links to inspect the actual evidence.
- Eight continuous VTT cues span 0–48 seconds. Native controls, no autoplay and caption loading were checked at 1440, 820 and 390 CSS pixels. Mobile player chrome can cover the bottom disclosure while controls are shown; synthetic/recorded labels also appear above the primary captions. Native LinkedIn caption presentation and real-device playback remain unverified.
- Actual existing portfolio captures and unchanged specialist art are used. The Python/gateway evidence is explicitly recorded, synthetic and not live. No fabricated model reasoning, photoreal character generation, audio imitation, music or paid service is used.
- The original local film was absent after restoration. Its unchanged source at `97edab6` was rendered for comparison; the current runtime did not match the prior receipt's film SHA-256. This increment does not claim byte identity with the previously reviewed original. Reviewed original-source chapter frames, all new chapter stills, the contact sheet and encoded player captures; this is not a human real-time playback sign-off.

## Visual and recruiter acceptance

Inspected actual page-section captures at desktop 1440, tablet 820 and mobile 390 pixels, including header, courtyard, specialist grid, recorded evidence, THE WEIR and recruiter mode. Existing five-width acceptance also includes 1180 and 320 pixels. Layouts remain consistent, complete specialist SVGs are contained, long source/evidence identifiers wrap and no horizontal overflow or broken images is observed. Existing motion-on/reduced-motion suites pass; no new product animation or dependency was added.

The recruiter entry reaches the six-discipline map and distinguishes implemented deterministic Python code, recorded synthetic integration, editable browser illustrations and planned production functionality. Source and evidence links remain pinned. This is an engineering/editorial review, not a recruiter user study. The standalone file is an offline preview; external evidence/portfolio links require network access when selected.

## Accessibility scope

The existing 36-scan accessibility suite and the 15 ecosystem scans are retained and rerun with zero axe violations. Scopes include desktop/mobile pages, selected workflows, specialist dialogs and expanded recorded-security evidence; see `evidence/browser-acceptance.json` and `evidence/final-verification.json`.

Keyboard-only event walkthroughs at 1440, 820 and 390 pixels cover skip entry, native selects, what-if inputs, recorded workflow choice, details, specialist dialog, Escape/focus return, replay step and separate approval/execution. Chromium's accessibility tree exposes the main landmark and named controls. Native dialog background controls remain inert; Chromium has an intermediate browser-chrome stop represented by body. Exact observations: `evidence/keyboard-review.json`.

These are scripted key events and inspected captures, not an independent human manual session or spoken screen-reader test. No screen reader is installed in the environment. Before public release, a human tester must check:

1. NVDA with Firefox or Chrome on Windows, and VoiceOver with Safari on macOS/iOS: landmarks, headings, select state, dialog title/close/return and source-link names.
2. Live-region announcement order and verbosity for scenario changes, invalid input, workflow changes, approval outcomes and audit records. Ensure the atomic inspector does not become excessively verbose.
3. Keyboard use at 200%/400% zoom, high-contrast/forced-colors modes, focus visibility during long-page navigation, touch exploration and real-device text/caption readability.
4. A real-time watch of the silent film, optional captions and transcript in the intended player, including an unpublished LinkedIn draft if that is the chosen channel.

The scan results and accessibility-tree checks do not establish full WCAG conformance.

## Performance scope

No authorized remote preview was available, and none was deployed. Measurements use `http://127.0.0.1:8000/nasha-ai-preview.html` served by Python's local HTTP server, Lighthouse 13.5.0, system Chromium and default simulated mobile/desktop throttling. Three sequential cold Lighthouse runs per mode are taken after regression activity finishes. The initial concurrent warm-up and interrupted pre-favicon measurements are excluded from reported results.

These are local lab measurements, not an Internet/CDN measurement or real-user data. The server has no gzip or production cache headers. First-load request counts include only resources Lighthouse loads, not every lazy specialist image or later interaction. Exact configuration, per-run warnings, timing, environment, raw-report hashes, tested page hash and medians are in `evidence/lighthouse-local.json`. Reproduce with `scripts/measure-nasha-local.sh` while the local server is running. Installed tooling and raw reports stay ignored.

| Mode (median of 3) | Performance | Accessibility | LCP | CLS | TBT | Transfer | Requests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile | 100 | 100 | 1.266 s | 0 | 3 ms | 58,181 bytes | 8 |
| Desktop | 100 | 100 | 0.345 s | 0 | 0 ms | 58,181 bytes | 8 |

Lighthouse run warnings: none


## Verification and release limits

All existing portfolio checks were executed, including build reproducibility, Node/claim guards, offline/online evidence hashes, original browser suite, cinematic experience, budgets, accessibility, THE WEIR, NASHA, Command Center, ecosystem/standalone and avatar checks. The original HTTP Command Center failure is preserved in the evidence along with its favicon diagnosis and passing rerun. The pinned Python integration reproduces recorded evidence byte for byte; the complete historical 368-test backend/Docker suite was not rerun or modified in this finalization.

The final development commit must have its own successful CI. A successful historical run is not substituted. Production branches are not merged and no website, asset service or social channel is published. No model calls or paid costs occur. The chat output directory is unavailable even after an approved filesystem retry; film and social assets remain local and are not presented as downloadable chat attachments.

The controlled deployment plan, rollback procedure, unpublished caption, security explanation and package paths are in `LAUNCH-PACKAGE.md`. The preserved execution ledger records this continuation. No background continuation is configured.
