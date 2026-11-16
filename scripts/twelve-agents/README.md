# Meet the Twelve — review experience

**Phase B open. Phase C and production release on hold.** This is a functional, accessible 2D registry and recorded coordination inspector, not a new cinematic headquarters or a completed animation pipeline. The approved images are static identity references. No new character model, artwork, voice, likeness or paid asset was created.

## Where are the agents?

All twelve approved portraits are preserved under `assets/img/agents/`. Existing HQ data, recordings and the synthetic operating day already account for all twelve. The new isolated review makes responsibilities, status, tools, source availability and animation gaps directly inspectable. It does not publish a new production route.

| Agent | Documented specialty | Primary recorded responsibility | Recording families |
|---|---|---|---|
| AETHON | Strategy Intelligence | Demand requirements, root-cause options, demand surge | A, B, C, D, F |
| ZYBREW | Brewing Intelligence | Batch planning and fermenter scheduling | D, F |
| PYRIX | Culinary Innovation | Recipes, derived allergens, draft test packs | E |
| VECTRA | Inventory Intelligence | Inventory availability/discrepancy, stock evidence | A, C, D, F |
| NEXORA | Procurement Intelligence | Procurement alternatives and draft order preparation | A |
| QUANTIX | Financial Analytics | Financial exposure, cost and operational metrics | A, C, D, F |
| ECHON | Customer Intelligence | Ingest/classify feedback and assess customer impact | C, F |
| NOVARA | Marketing Intelligence | Draft response release and outreach preparation | B, C |
| SYNAPSE | Workflow Orchestration | Open/coordinate missions and assemble the response | A–F |
| AEGIS | Quality & Compliance | Policy review and proposals held for a person | A–F |
| CORTEX | Knowledge & Research | Retrieve knowledge evidence | B |
| VERITAS | AI Evaluation | Claim/evidence, formula, schedule and consistency checks | A–E |

These assignments come from `hq-data.json` and the recording assignment/events, not the names. All recorded backend functions are classified **Recorded**, not independently rerun here. The inherited aggregate's `IMPLEMENTED` labels are not promoted to current hosted-service readiness.

## Eight requested deliverables

1. `registry.json`: identity, artwork, responsibilities, classified capabilities, tool names/counts, representative input/output contracts, dependencies, authorization, evaluation, recordings/hashes, source availability, maturity and missing components for each agent.
2. `asset-readiness.json`: separate twelve-agent artwork and animation-readiness report.
3. `ARCHITECTURE.md`: systems architecture, supported interactions and evidence map.
4. `BLUEPRINT.md`: proposed connected headquarters layout and all twelve station briefs.
5. `ANIMATION.md`: production plan and asset/licensing strategy.
6. `ANIMATION.md`: explicit VECTRA prerequisites and technically feasible next steps.
7. `ARCHITECTURE.md` plus per-agent registry links: implementation, tests, recordings and limitations.
8. `ROADMAP.md`: dependencies, acceptance gates and scope boundaries.

## Reproduce and review

```sh
python3 scripts/twelve-agents/build_registry.py
python3 scripts/test-agent-registry.py
python3 scripts/build-agent-registry.py --out work/twelve-review
```

The builder derives/compares the registry, verifies every recording hash and artwork approval/hash, checks the unchanged publication inventory, then independently verifies the existing baseline site before copying the named review files. It refuses an existing output. The registry renderer uses text nodes, not HTML injection. The recording selector is populated from the registry catalog; arbitrary paths are not accepted. Complete recorded files are hashed again before display, including on private-LAN HTTP without relying on secure-context-only browser crypto.

For a Mac handoff, use the exact committed source archive, launcher and externally supplied hashes from the final handoff. `start-cinematic-proof.py --experience registry` selects this builder and retains verified TLS, safe extraction, independently pinned file inventory, current PR-head checks, loopback default and explicit private-LAN mode. It does not expose the repository. No owner device result is implied by launcher or automated-browser tests.

The generated review artifact includes `baseline/`, preserving direct access to experience, projects, resumes, concept menu and the existing deterministic operating day. These links do not require watching a recording. No publication allowlist, main protection, GitHub environment or approved image/PDF changed.

Recording files load only when their section is visible or a scenario is chosen. Offscreen sections/cards use content visibility, portrait decoding is asynchronous, and private-LAN checksum fallback runs in a worker. These changes retain the same hashes and event data; they do not skip verification. Loading measurements do not replace measurements after interaction or actual-device evidence.
