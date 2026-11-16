# Phase B production-quality and character-fidelity audit

**Verdict: NO-GO for expanding to the other eleven agents. Phase B remains open; Phase C is on hold.**

This is an audit and production specification, not a new cinematic proof or a visual acceptance claim. No new preview, character animation, architectural asset, or production release has been created. The owner expressly instructed: “If the approved artwork cannot be faithfully animated, stop and report the fidelity gap.” That stop condition applies to the available assets and the animation quality I can presently demonstrate. It does not establish that faithful reconstruction is impossible for a character artist.

## Verified starting state

Live GitHub PR metadata and remote refs were checked on November 16, 2026 before changes. All four PRs are open drafts and unmerged:

| Reference | Exact head |
|---|---|
| main | `b78d2a93bceb16ea753ebcd5338021fc903631c0` |
| PR #10 | `3dbd5f38a960b2bf840cdbe6900b9dcf9d8eb655` |
| PR #11 | `4d8843272f97390e30370965e59ac37a3afa3722` |
| PR #12 | `418c9f33b7f2c484e37e690e03cac0f7a5e5d83d` |
| PR #13 | `a9ab5700c512e0541719c63a2d9f278392cbba13` |

This separate branch, `visual/phase-b-fidelity-audit`, starts at PR #13 and changes documentation only. It preserves the existing viewer and pinned PR #13 preview as an explicitly unaccepted technical experiment. No prior preview is relabeled as a new production-quality candidate.

Production Main Protection ruleset `26504713` remains active: PR required, strict `validate`, no force pushes/deletion and no bypass actors. The `github-pages` environment retains its required owner reviewer and custom branch policy. No workflow or protection was edited.

## Why the current visuals fall short

The approved reference was inspected directly: [`vectra.webp`](../../assets/img/agents/vectra.webp). Its hash matches the approval register. It is one opaque RGB 768 × 1024 image, one frame, not a layered character source. The register explicitly calls it an AI-generated 2D illustration, not a rigged model. See [machine-readable inspection](asset-audit.json).

VECTRA's identity includes a broad, three-optic camera head, side head hardware, exposed neck, asymmetric detailed chest/shoulder armor, cyan light strips, mechanical waist, articulated humanoid legs, joint assemblies and fingered grippers. PR #13 retains some colors and head cues but substitutes much simpler shapes and tracked feet. That silhouette mismatch is material; lighting or more joint movement cannot correct it.

The tracked repository contains no approved character `.blend`, FBX, layered PSD/ORA/KRA, alternate-view model, or additional GLB/glTF. The only GLB is PR #13's experimental scene. This statement is limited to available repository evidence; no inaccessible private source collection is presumed absent.

Direct GLB inspection found 13 materials, zero image textures, zero skins and zero embedded animation clips. Runtime object-transform animation does exist; absence of clips does not mean the viewer is static. It does mean this file is not a recovered faithful character rig.

Architecture is primarily repeated generated boxes/cylinders with uniform PBR material values. The labels “limestone,” “walnut,” and “terrazzo” do not supply the surface grain, variation, normal detail or wear implied by those names. The scene has no image textures or baked GI maps. A procedural RoomEnvironment, real shadow maps and camera controls are useful technical foundations, but do not establish architectural visualization quality. Brewery fixtures, furniture, landscaping and exterior detail remain simplified. The approved brewery image offers a useful atmosphere reference; it is not geometry, a complete interior/exterior design or evidence of an operating venue.

## Production-path decision

The selected path is an original, reference-matched Blender asset production stage followed by a glTF delivery and animation test. Keep the existing Three.js viewer, opt-in loading, deterministic state and 2D fallback. The missing work is principally asset authorship and art approval; adding React Three Fiber or changing render APIs would not supply it.

I cannot currently demonstrate a faithful reconstruction with the available source assets. I therefore stopped before another replacement model or expanded architecture. A flattened illustration can support a faithful still, but translating the whole image, adding glow, or pivoting cut-out limbs would not demonstrate the required approach, hand contact, turns and inventory observation. Limbs conceal surfaces that the image does not contain. Repainting those surfaces requires a separately reviewed character-art step. No cut-out animation is being presented as completed production animation.

The minimum asset needed to resume is one reference-matched VECTRA model or a reviewed layered/multiview character source suitable for the required fixed-camera motions. Its proportions, head, armor, legs, grippers and materials must first pass side-by-side silhouette and detail review. A paid service is not presumed necessary or authorized; no purchase, generation service, paid credits or third-party character was used.

See [production specification](PRODUCTION-SPEC.md) for tools, asset requirements, event mapping and measurable acceptance gates. No acquisition-specific license has been verified because no external asset was selected or acquired.

## Fresh checks and limits

Run in the separate worktree against the unchanged PR #13 runtime:

- `python3 scripts/validate-release.py`: PASS; 169 reviewed files, hashes, media/secret signatures, links/fragments and reduced-motion stylesheet.
- `node --test scripts/test-model.cjs scripts/test-demo-engine.cjs scripts/test-inventory.cjs scripts/test-console.cjs scripts/test-living-enterprise.cjs`: PASS, five test-file entries, zero failures. This invocation's reporter counts files; it is not reported as 43 new individual tests.
- `python3 scripts/test-cinematic-proof-launcher.py`: PASS, 12 checks including digest mismatch, extraction refusal, symlinks, unexpected files, wrong PR head and verified macOS curl selection.
- All 41 approved image files and four PDF files are byte-identical to PR #10. The publication manifest, release file inventory and workflows are unchanged.

PR #13's earlier full CI, Chromium/WebKit renders, Axe and Lighthouse results remain evidence only for that preserved technical experiment. They are not new-proof measurements. No new browser, performance, animation-fidelity or physical Safari PASS is claimed. New-proof measurements and all exact-candidate physical checks remain NOT_RUN. There is no new preview checksum to supply because there is no new visual candidate.

## Unfinished deliverables

Faithful animated VECTRA, production-quality connected architecture, a new synchronized cinematic proof, its new accessibility/performance measurements and checksum-verified preview are not delivered. Existing inventory/workflow code and review/rejection fixes remain intact. No new source-of-truth counter, live AI execution, trained forecast, production customer, operating brewery, personal likeness or professional experience claim was introduced.

Phase B must stay open until the asset fidelity gap is resolved and the resulting single-character proof actually passes owner visual acceptance. No merge, deployment, public launch or eleven-character expansion is recommended.
