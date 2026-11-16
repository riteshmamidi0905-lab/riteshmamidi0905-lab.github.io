# Production specification — conditional on faithful source assets

This is a specification, not implemented functionality or an authorization to buy assets. The character stop decision is in [REVIEW.md](REVIEW.md).

## Asset and renderer strategy

| Technique | Decision and trade-off |
|---|---|
| Blender 4.3.2 | Available locally. Hand-author one character and architectural scene with controlled proportions, bevels, UVs and materials. The existing primitive generator is not the fidelity baseline. No finished replacement asset is claimed. |
| glTF/GLB | Retain the existing loader. Export original assets with scale, hierarchy, material and clip validation. Prefer rigid-part mechanical joints where appropriate; a skin is useful only for deforming parts. |
| Three.js 0.180.0 | Retain the pinned MIT renderer and existing notices. No dependency change needed for this audit. |
| React Three Fiber / WebGPU | Defer. Neither solves missing art. WebGL compatibility and the complete 2D path remain required. |
| PBR / baked light / environment maps | Author or obtain separately cleared material textures and lighting. Bake indirect illumination where useful; avoid double lighting. A public-domain asset still needs exact provenance, license/version and reviewed bytes before use. No external HDRI or texture acquired. |
| Rig / clips / blending | One faithful VECTRA with constrained joints, contact targets and clips for approach, inspect, control interaction, analysis, hold, decision acknowledgement and monitoring. Blend only presentation; never write business state from animation completion. Morph targets are unnecessary unless a justified deformation is approved. |
| 2.5D | Viable only with approved separated layers and reconstructed occluded surfaces, fixed camera and motion tests that meet the actual requirements. Existing flat-image motion alone is insufficient. |
| Instancing / compression | Instance repeated architecture. Evaluate meshopt/Draco and KTX2 only after measuring actual payload, decoder cost and mobile compatibility; acquire no new dependency without review. No speculative performance improvement claimed. |
| Progressive loading | Keep explicit entry, fallback and low-power path. Load architecture before optional character detail; expose useful text/portfolio links immediately. No mandatory audio or automatic camera travel. |

Original new art requires review. Existing imagery stays byte-identical and keeps its concept disclosures. Any future external asset record must include exact URL/creator, download hash, license text/version, attribution, derivative/redistribution conditions, compatibility, cost and approval. Do not generalize a portal's license to an individual model. A generic free robot cannot replace VECTRA merely because it is licensed.

## Architectural asset brief

Build one physically coherent floor plan: courtyard and signed entrance → arrival atrium → workroom/receiving → brewery bar, dining and visible open kitchen. Maintain consistent scale, doors, glazing, structure and circulation through every camera view. Establish focal length, human-scale reference and composition before detailing.

HQ: limestone with real surface variation, refined metal, plausible glass thickness, finished junctions, skylight depth and useful operations displays. Brewery: crafted bar/furniture, brewing pipework and vessels, task lighting, material variation, open-kitchen details and curated Indo-Mex references. Exterior: legible entrance, credible facade and landscape, warm evening fixtures and inviting seating. Detail must survive the actual desktop/mobile framing, not just exist off camera.

Preserve all menu classifications, including Mango Habanero Gobi as an appetizer. Label the entire brewery a proposed business/architectural concept; no venue address, booking or operating-business implication. Existing approved images can supply references or clearly labeled stills, not falsely represent a newly built coherent 3D environment.

## Authoritative event-to-animation contract

Use `NashaLiving` and its immutable state/history. An animation never increments stock, advances a command, grants a role or completes approval. Read the actual displayed replay snapshot; replay is read-only. Use simulation sequence as time, not invented wall-clock timestamps.

| Existing event | Specialist / state | Allowed visible response |
|---|---|---|
| 1–2 intake/demand | ECHON, NOVARA | Signal received; approach/ready presentation may establish the work position without claiming a new inventory transaction. |
| 3 service | PYRIX | Render actual day-one consumption: mango 12 → 2; show 8 consumption, 1 waste, −1 adjustment. |
| 4 shortage | VECTRA | Inspect actual on-hand/requirement; show shortfall analysis and purposeful console interaction. |
| 5–8 policy/recommend/cost/request | CORTEX, AETHON, QUANTIX, NEXORA | Show real handoffs and active specialist. VECTRA monitors; do not attribute all decisions to VECTRA. Recommendation/pending request is 58 units with the stable key. |
| 9 gate | AEGIS | Hold. Clearly require Reviewer; role switch does not change stock/state history. |
| 10 approve OR reject | AEGIS / human Reviewer | Acknowledge the actual decision. Approval leaves stock unchanged; rejection ends the run without a receipt. Never autoplay the human choice. |
| 11–13 outage/refuse/recover | SYNAPSE | Show actual failure and recovery. Refusal changes neither stock nor inventory audit. |
| 14 receive | VECTRA | Only the real receive command produces +58, mango 2 → 60 and ledger effect. |
| 15 retry | VECTRA | Show duplicate-safe acknowledgement; no second delivery or stock motion. |
| 16–17 day two/three | ZYBREW, PYRIX | Render actual ledger snapshots; mango closes at 46 then 26. |
| 18 verify | VERITAS | Show actual reconciliation/audit results; VECTRA returns to monitoring. |

Each inspectable event should expose existing `seq`, agent, actor, input, command/decision, before/after quantities, inventory-event counts, previous/hash and the applicable ledger rows. Authorization is a demonstrative browser role, not server authentication. The scenario has an initial seeded opening balance, not a newly implemented initial-receipt event; do not invent one to fit a visual story. Formula: opening + receipts − consumption − waste + adjustments = closing. A rejection branch must never show a delivery.

## Engineering and portfolio connection

Use the existing deterministic mission, inventory tests, engineering diagrams and recorded project evidence. Narrative: synthetic hospitality problem → requirements and data contract → architecture → implementation → evaluation → deployment considerations → observability → synthetic outcome. Link the rendered review/outage/retry events to their actual code and tests.

Retain explicit implemented/simulated/recorded/proposed labels. Scripted policy lookup is not live RAG; the demand multiplier is not a trained predictor. Existing recorded model runs are not newly executed inference. No hosted integrations, professional deployments or employer metrics are added.

Recruiter navigation should remain immediately available: Ritesh Mamidi — Applied AI & Product Analytics; independent FDE, AI systems, enterprise automation and data engineering positioning; projects, four unchanged resumes, GitHub, LinkedIn and contact. The approved silent avatar may remain optional. No new likeness, facial motion or audio is needed for this single-character fidelity gate.

## Required acceptance sequence

1. Compare a neutral VECTRA render side-by-side with approved art: head/optics, proportions, silhouette, leg/foot structure, grippers, armor detail and colors. Reject generic substitutes before environment integration.
2. Review approach, console contact and return clips at normal speed plus pauses. No sliding feet, penetrating hands, discontinuous pose changes or decorative loops during human review. This is owner visual review, not a pixel-difference test.
3. Review four coherent architectural views and an actual motion recording with conspicuous concept labels. If the quality bar is missed, hold rather than expand eleven characters.
4. Re-run deterministic model/replay/role/rejection/idempotency tests. Test animation-state mapping without allowing animation to mutate the model; test reset/replay/pause/hidden-tab behavior.
5. Run Chromium and automated WebKit at 1440/768/390/320, keyboard, Axe, screen-reader alternatives, load/WebGL failure, reduced motion and 2D/3D restoration. Reduced motion must not require animation to reveal the decision/state.
6. Measure initial and activated downloads, memory/resource counts, draw calls/triangles, loading Lighthouse and frame timings on stated hardware. Report software/headless results separately from actual device smoothness. Preserve existing production Lighthouse gates and publication boundaries.
7. Build the isolated artifact, independently verify file inventory/digests, and provide an exact-head TLS-verified preview launcher. No new checksum or candidate is available at this audit stage.
8. Obtain owner visual acceptance, then exact-candidate physical Mac/iPhone evidence and protected GitHub approvals before any release integration. No old device PASS transfers. A green automated suite is insufficient.
