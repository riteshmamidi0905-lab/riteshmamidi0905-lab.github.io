# NASHA AI recruiter launch package

Prepared 2026-10-19. Development review only. No production deployment or social publication.

## Review journey

1. Open `deliverables/nasha-ecosystem/nasha-preview.html#recruiter-mode` locally. Read what runs, what was tested and the limits, then follow the six-discipline evidence map.
2. Explore the Digital Twin's inventory-pressure scenario: 2 units on hand, demand 10, shortfall 8. These are editable browser fixtures; changing them does not rerun Python.
3. Inspect service evidence. The inventory workflow's separate Python fixture records shortfall 8, scenario revenue 96, cost 64, margin 32 and a synthetic quoted price of 22. Do not combine the independent browser and Python finance assumptions.
4. Explore specialists and their pinned implementation contracts. Twelve deterministic callable services are implemented; twelve autonomous LLMs are not claimed.
5. Inspect recorded THE WEIR evidence, then try the separately labelled browser walkthrough. Return to the technical case study and original source.

The existing preview supports this journey without a redesign or new runtime capabilities. The standalone file embeds the same existing artwork and code. Its links to broader portfolio pages and GitHub require network access when selected.

## Package inventory

| Deliverable | Location and status |
| --- | --- |
| Final ecosystem preview | `deliverables/nasha-ecosystem/nasha-preview.html`; existing standalone source, rebuilt with the demonstrated favicon fix |
| Cinematic launch film | Ignored `work/launch-package/nasha-launch-final.mp4`; unpublished 48-second portrait review edit, 1080×1350, 24 fps, H.264, silent |
| Film review player / transcript | Ignored `work/launch-package/review-film.html`; native controls, no autoplay, optional English VTT and text transcript |
| Captions | Ignored `work/launch-package/nasha-launch-final.vtt`; eight continuous cues covering 0–48 seconds |
| Technical architecture case study | `ARCHITECTURE.md`, plus the implementation/provenance detail in `INTEGRATION-AND-VISUAL-REVIEW.md` |
| Verified engineering evidence | `content/nasha-integration-evidence.json`, `content/nasha-integration-sources.json`, historical CI links in the existing ledger, current acceptance evidence |
| Security explanation | Below and in the architecture case study; real offline synthetic test distinguished from browser state |
| LinkedIn visual assets | Ignored `work/launch-package/linkedin-cover.png` (1200×627) and `launch-poster.png` (1080×1350); original existing SVG artwork and page captures |
| LinkedIn caption | Unpublished draft below; do not imply that development source is a deployed public experience |
| Deployment and rollback | Specific controlled procedures below; execution requires separate approval |

The attachment environment cannot create the designated chat `output/` directory: default execution reports a read-only parent and the approved retry reports permission denied. Media remain in ignored local storage. They have not been uploaded to GitHub, an asset service or social media. Source and documentation remain reviewable on the development branch. Local workspace retention is not guaranteed after the session.

To review the local package, serve the repository with `python3 -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/work/launch-package/review-film.html`. Do not expose this server publicly. Reproduce the film with `CHROMIUM_PATH=/usr/bin/chromium node scripts/render-nasha-final.js`; it reads actual local page sections and existing specialist SVGs, then uses local FFmpeg. No model API, paid tool, music or narration is used.

## Six disciplines, with evidence boundaries

| Discipline | Implemented evidence | Limit |
| --- | --- | --- |
| AI Engineering | Pinned Python specialist interfaces, three workflow sequences and 22 serialized handoffs | Deterministic services; no live model calls in the preview |
| AI Evaluation | Contract checks and negative input checks; VERITAS/LUMEN recorded output | No model-accuracy, benchmark-generalization or commercial impact claim |
| AI Governance | Actual independent gateway test: policy, explicit synthetic operator approval, scoped single use, expiry and tamper checks | No production reviewer authentication or operational deployment |
| Product Analytics | Editable stock/demand what-if, visible assumptions and synthetic financial arithmetic | No observed product experiment, forecast or realized profit |
| Business Systems | Role contracts, procurement draft, workflow status and explicit review checkpoint | No real purchase order or operating restaurant |
| Data Engineering | Provenance manifest, pinned source hashes, repeatable serialized fixtures and quality/evidence-presence checks; existing lab source links | No live ingestion pipeline or production data-quality SLA added here |

## THE WEIR, in plain language

The specialist can propose a draft; it cannot give itself authority to execute a protected action. The actual offline gateway test first denies an out-of-policy request. A protected request returns APPROVE and has no effect while pending. A separate explicit synthetic test operator approves the exact request. Only then does ALLOW permit one in-memory synthetic note write. Changed arguments, another session, consumed-grant replay and expiry are rejected. Reconstruction verifies the audit chain and rejects a tampered chain. External actions remain zero.

That is real execution of pinned gateway code using a disposable local test store and synthetic upstream. It is not a production authorization system operated from the portfolio. The browser walkthrough separately illustrates the same concepts in resettable JavaScript state and provides no security boundary. The film displays recorded evidence; it is not a recording of live AI reasoning or a real purchasing operation.

## LinkedIn draft — unpublished

What happens when inventory is eight units short—and a recommendation still needs a person to decide?

I built NASHA AI as an independent engineering project around a synthetic hospitality concept: twelve deterministic specialist services, three reproducible workflows and a separate security gateway, THE WEIR.

The portfolio review makes the boundaries visible: an illustrative Digital Twin, inspectable recorded Python outputs, explicit review states and pinned source. The controlled synthetic integration executes 22 handoffs across all twelve roles. THE WEIR's offline test checks approval binding, single use, expiry and audit reconstruction, with zero external actions.

The attached silent film uses existing artwork and actual portfolio captures. It contains synthetic data and recorded tests—not live AI execution footage. The browser does not call a model or operate a restaurant.

This project brings together AI engineering, evaluation, governance, product analytics, business systems and data engineering. My focus: clear contracts, reproducible evidence and human authority at the action boundary.

Inspect the engineering source:
https://github.com/riteshmamidi0905-lab/INDO-MEX-BREWERY/tree/2fc100070025cfee8d40216c25326ad3a6040cb0

The ecosystem preview is currently a development review, not a production launch. Add an approved public preview link only after a separately authorized release. Keep the synthetic-data disclosure with any approved film or still. Verify native LinkedIn captions and phone playback in an unpublished draft before posting.

## Controlled deployment plan — prepared, not executed

1. Resolve the human review gates in `FINAL-ACCEPTANCE.md`: assistive technology, real-device readability and owner film review. Establish an authorized remote preview if real-network measurements are required; current Lighthouse results are local lab evidence only.
2. At approval time, fetch and record the exact current production branch SHA, its deployed artifact/build identifier and current CI. Do not reuse an old production SHA from a prior session. Confirm the hosting configuration and preview destination without changing it.
3. Create a review branch from that production SHA. Prepare a specific promotion diff for `nasha-ai-preview.html`, its existing CSS/JS/SVGs, the recorded-evidence JSON/bundle and only the build/recruiter-navigation changes actually needed. Review the diff against the current production tree; do not wholesale replace unrelated portfolio work. The current candidate remains on `wip/nasha-ecosystem-20261019`.
4. Keep `work/`, rendered media, private package, source checkouts and performance tooling outside the release tree. Review whether the isolated noindex preview should remain noindex; changing indexing requires an explicit product decision. Do not add the film to the website by inference.
5. Run the full existing checks on the exact proposed promotion commit. Review generated-file reproducibility, source/evidence links, responsive states, keyboard flow and disclosures. Obtain explicit owner approval for that exact commit, hosting destination and deployment method. The present task does not grant this approval.
6. Only after approval, use the established hosting pipeline for that reviewed commit. Smoke-test the preview/recruiter journey, assets, captions if separately approved, and evidence links. Record the production URL, deployed SHA and observation time. Do not claim local Lighthouse numbers as production measurements.
7. Obtain separate approval for exact LinkedIn caption/media. Posting is independent of deployment approval. No publication action is part of this continuation.

## Rollback procedure — prepared, not executed

- Before release, preserve the pre-release production SHA and artifact ID in the release record and verify the last known good build exists. Use the existing host's documented restore method if artifact rollback is supported.
- Trigger rollback for broken navigation, missing assets, a material accessibility regression, incorrect disclosures or an operational/security issue. Pause social publication while investigating.
- For a normal reviewed merge or squash, create a revert commit for the recorded release commit on a separate rollback branch, run the build and critical smoke checks, and seek the required release approval. For a merge commit, explicitly identify the correct mainline parent before a revert; do not guess. Never force-push production or reset shared history.
- If the host supports restoration of the recorded last known good artifact, use it only under the separately approved incident procedure. Otherwise deploy the tested revert through the established pipeline.
- Recheck the restored production URL, recruiter link, assets, evidence and keyboard entry. Record the restored SHA/artifact and incident details. The current development branch and ignored film are not production rollback targets.
