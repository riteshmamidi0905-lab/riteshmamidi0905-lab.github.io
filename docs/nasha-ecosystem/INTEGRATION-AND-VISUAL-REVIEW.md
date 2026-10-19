# NASHA AI integration and visual review

Reviewed 2026-10-19. Development branch: `wip/nasha-ecosystem-20261019`.
Starting commit: `97edab6b789dadcac2d22cea3de3da12343edb58`.

## Preserved baseline

Read `SESSION-RECEIPT.md` and `EXECUTION-LEDGER.md` before editing. GitHub confirmed the starting branch head and [Validate portfolio #70 success](https://github.com/riteshmamidi0905-lab/riteshmamidi0905-lab.github.io/actions/runs/39301998238) for that exact SHA. The initial workspace remained on `work` at `f63f8db`. Restored development source in `/workspace/work/nasha-ecosystem`; its initial Git tree matched remote `30ff4d7e276730f95f57ef2fb7a9b3827be5c153`. Imported commit records were hash checked; a subsequent proxy-aware Git fetch restored complete reachable objects.

Kept the existing Digital Twin, three illustrative workflow replays, THE WEIR walkthrough, twelve SVG specialist identities, recruiter journey and all existing tests. No production branch, deployment or social publication was changed.

## Demonstrated visual findings

Actual Chromium screenshots cover the whole page and individual sections at 1440, 820 and 390 CSS pixels. Files remain in ignored `work/review-*-full.png`, `work/review-*-twin.png`, `work/review-*-team.png`, `work/review-*-weir-lab.png`, `work/review-*-recruiter-mode.png` and `work/review-*-service-evidence.png`. These are local review captures, not published assets.

| Area | Finding and action |
| --- | --- |
| Hierarchy | Hero, courtyard, specialists, workflows and independent security boundary remain legible. Added a clearly titled service-evidence section and direct navigation from the twin; no redesign of passing components. |
| Typography | Existing heading scale and system fonts are consistent. Long identifiers wrap on mobile. JSON evidence remains in labelled, keyboard-focusable scrollers. |
| Identity | Tablet cards used `object-fit: cover`, cropping the left edge of SVG names and instrument labels. Changed to `contain` on the existing dark canvas; post-fix captures preserve the full portrait at every width. All twelve assets and public/internal role names are retained. |
| Cinematic consistency | Navy surfaces, cyan navigation, amber evidence notes and specialist accent colors remain coherent. Restrained native hover motion is appropriate for a technical portfolio. |
| Navigation | Existing section links, dialog focus/escape, keyboard skip link, recruiter links and workflow controls retained. New service and security evidence link to actual source and reproducible outputs. |
| Recruiter comprehension | Recorded Python execution is explicitly distinguished from editable browser arithmetic, historical CI, the independent gateway and future production work. No employment or commercial outcomes invented. |
| Responsive behavior | Reviewed desktop, tablet and mobile captures; automated coverage additionally includes 1180 and 320 pixels. No horizontal overflow or broken portraits in acceptance. |
| Motion and accessibility | Existing reduced-motion handling retained. Original cinematic interaction suite retained. Automated axe scope is recorded separately from manual assistive-technology review. |

The screenshot review is a technical/editorial assessment, not a recruiter user study or screen-reader certification.

## Controlled integration

`scripts/run-nasha-integration.py` executes **actual pinned engineering source**, not a JavaScript reimplementation. It verifies Git blob hashes for every supplied source file before import. There is no automatic download, package installation, running web service, credential requirement or network call. It uses synthetic built-in fixtures, an in-process synthetic notes upstream and a temporary SQLite audit store deleted at completion.

Source pins:

- NASHA: `2fc100070025cfee8d40216c25326ad3a6040cb0` in `INDO-MEX-BREWERY`.
- THE WEIR: `5df274563a4a73ebbd31a6380e3a7d829b6bf4a2` in `mcp-weir`, matching the engineering CI dependency.
- Per-file identities: `content/nasha-integration-sources.json`.

| Workflow | Actual handoffs | Outcome |
| --- | --- | --- |
| Seasonal brewing | 10 | Unbrewed plan, ingredient-to-stock handoff, synthetic quote, financial calculation, pairing, quality, evaluation and orchestration; human approval required. |
| Inventory and procurement | 5 | Stock shortfall 8; scenario revenue 96, cost 64, margin 32; recommended synthetic supplier price 22; draft only. |
| Customer intelligence | 7 | Keyword feedback labels, sample-based metrics, strategy, campaign draft, quality, evaluation and orchestration; no publication. |

Together these execute all twelve specialist roles across 22 handoffs. Three negative contract checks cover negative inventory, absent quotes and nonfinite finance. All workflows stop at review with zero external actions. The customer classifier is simple keyword logic; the financial output is synthetic scenario arithmetic, not a forecast.

The recorded output is `content/nasha-integration-evidence.json`; the build generates its browser bundle. The UI displays these outputs with provenance. Changing the courtyard what-if inputs **does not rerun Python**, and the page says so. The built-in Python workflows use their own documented fixtures; their units and finance assumptions need not equal the independent browser model.

THE WEIR run proves actual policy DENY, pending APPROVE with no effect, a separate explicit synthetic operator decision, and subsequent ALLOW for exactly one **in-memory synthetic note**. It checks argument binding, session binding, consumed-grant replay, expiry, complete cross-system reconstruction and audit-tamper rejection. It does not place an order, authenticate a real reviewer or publish anything. The twelve specialists do not grant themselves permissions. Browser walkthrough records remain disposable illustrations.

Reproduce from the pinned repositories, using Python 3.11+ and no added packages:

```sh
python3 scripts/run-nasha-integration.py \
  --engineering-root /path/to/INDO-MEX-BREWERY \
  --weir-root /path/to/mcp-weir --check
```

Three repeated local checks reproduced the serialized evidence byte for byte. Timing, random IDs, raw audit payloads and credentials are not serialized. CI now checks out the two exact source pins under ignored `work/` and verifies the same output. This is scoped integration acceptance, not a rerun of all 368 historical backend tests.

## Film review — exact prior cut

The original local media directory was missing after environment restoration. Reproduced the cut using the **unchanged starting commit's page and renderer**, outside the development source tree. The resulting film SHA-256 is `95476132f973427bad0b31dee72b1513592cb80c6babf5add7c588fd346ffa18`, exactly matching the prior receipt's media manifest. This establishes byte identity with the recorded original, not merely a similar reconstruction.

Local path: ignored `work/film-baseline/nasha-launch-review.mp4`. H.264, 1280×720, 24 fps, exactly 48 seconds; no audio stream. Complete FFmpeg decode succeeds. Six contiguous VTT cues cover 0–48 seconds. Reviewed all six chapter captures and rendered film frames at chapter starts; motion judgment also uses the renderer's slow zoom expression. This is not a claim of a real-time human playback session.

| Criterion | Review |
| --- | --- |
| Story | Six eight-second chapters progress from identity to specialists, courtyard, workflow, gateway and evidence. Technically coherent, but the recruiter value arrives late. A future editorial cut should lead with one concrete inventory question and end with a clear source-code invitation. |
| Accuracy | Correctly labels synthetic data and illustrative traces; identifies THE WEIR as separate. CI #132 is historical evidence. The film predates the new recorded-output panel and must not imply it depicts that integration. |
| Visuals | Same navy/cyan/amber system as the site. The specialist frame shows only the upper card row, and several captures crop important lower controls or output. Focused detail crops would explain the system better than showing an entire dense page. |
| Motion | Gentle deterministic zoom and hard chapter cuts; no interaction is actually recorded in motion. Suitable for a review cut, limited as a polished launch film. |
| Typography | Chapter titles and footer captions are clearer than the embedded interface text. At 390-pixel playback width the 21-pixel source footer scales to about 5 pixels; a dedicated mobile composition or player-rendered captions is needed before public release. |
| Captions | Sidecar VTT has six correctly ordered continuous cues. It is not automatically attached to an external video player. Timing coverage passes; platform-specific caption presentation remains unverified. |
| Audio | Silent by design, confirmed by ffprobe. No narration, music, licensing or audio mix has been delivered. |
| Recruiter appeal | Honest technical evidence and ownership are strengths. Future cut should show the 8-unit shortage, draft comparison and explicit review outcome in close-up, then offer the engineering evidence. No claim of recruiter conversion or user testing. |

No film, poster, cover, captions or captures were committed or uploaded. The current cut remains a local review artifact; no new media release is implied.

## Media history and tool audit

Compared accidental commit `9adf0ad4fb3a7e12ebdb6d2b6d60f1ef49ddddb9` with all 11 branch refs, the one tag and three pull refs returned by GitHub. It is not an ancestor of any returned ref. The current development tree contains only the allowed standalone HTML under `deliverables/nasha-ecosystem/`. The complete locally reachable object listing does not contain the known unreleased media blob IDs. Exact remote observations are in `evidence/media-history-review.json`.

Accidental commit metadata remains retrievable through GitHub. **No complete GitHub storage, cache, CDN, fork or hidden-ref erasure is claimed.** Added a CI guard against tracking the four known rendered assets, adding rendered files under the deliverables directory or linking unreleased media in the preview. Generated captures and source checkouts stay under ignored `work/`.

Read-only current Runway audit: authenticated workspace; nine listed image models (nano-banana variants, seedream variants, muse-image, gen-4 and gen-4-image-turbo); no available video model. Native image generation is callable, but cost is not established. No model invoked, media uploaded, trial started or generation credit consumed. Any future generation needs a current model-specific quote and explicit approval. Existing local Chromium/SVG/FFmpeg tools suffice for this review.

## Acceptance and continuation

Exact local command results are in `evidence/integration-verification.json`; responsive/axe measurements are in `evidence/browser-acceptance.json`. The online evidence checker initially failed because Node did not use the session proxy; `NODE_USE_ENV_PROXY=1 npm run verify:evidence:online` then passed all 28 files. No evidence hash or existing test was weakened.

| Local acceptance | Exact result |
| --- | --- |
| Existing suites | Build, Node tests, evidence hashes, Command Center, portfolio browser, cinematic experience, budget, accessibility, THE WEIR and NASHA browser checks all exit 0. |
| Added integration | Three pinned Python workflows, all 12 roles / 22 handoffs; real gateway lifecycle and negative contracts pass; changed source rejected before import. |
| Responsive / navigation | 1440, 1180, 820, 390, 320 pixels; valid section anchors, dialogs, scenarios and recorded workflow selection; no overflow or broken images. |
| Accessibility | Existing 36 axe scans plus 15 ecosystem scans: zero violations, including expanded recorded-security evidence. |
| Preview performance | 26,892 gzip bytes across 20 local resource requests; CLS 0 at all five widths; zero external resource requests. Local routing measurements, not Lighthouse or real network timings. |
| Media | Exact original film hash, complete 48-second decode, six contiguous caption cues; no audio stream. Rendered media remain ignored and untracked. |

Known limits: no new Lighthouse run or real-network load test; no manual assistive-technology session; no full local Python/Postgres/Docker regression suite; no production authentication or operational connection. Output-folder creation is blocked by the attached filesystem (`/codex` is read-only), so this report is preserved on the development branch instead of a local chat-output link.

Next continuation: inspect the final development commit and its CI run recorded in the ledger, review the new service-evidence panel, then decide whether a focused local film edit is worthwhile. A future authenticated backend endpoint is a separate implementation scope. Do not infer deployment, publication or generation authorization.
