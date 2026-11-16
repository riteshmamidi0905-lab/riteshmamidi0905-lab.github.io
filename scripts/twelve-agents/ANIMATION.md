# Animation production plan and VECTRA strategy

All twelve approved designs are preserved. The asset-readiness report documents static art and missing production sources separately for each identity. No faithful new rig is delivered here. PR #13's simplified VECTRA is an unaccepted technical experiment, not a reusable identity template.

## Phase B1: one faithful VECTRA

Available: approved opaque RGB 768 × 1024 single-frame image, its provenance/hash and the local Blender/Three.js toolchain. Missing: approved multiview or layered source, faithful articulated model, usable rig/contact constraints, clips and owner fidelity acceptance. The original humanoid leg/foot/gripper/head/armor silhouette must be preserved; tracked feet or a generic robot are not acceptable substitutes.

Credible next steps: obtain or author a reference-matched front/side/back character sheet with owner fidelity review; hand-model one VECTRA in Blender; match silhouette/proportions first; author armor surfaces, mechanical joints, materials/UVs and actual grippers; build constrained joint controls; validate console contact/feet and export glTF; capture neutral comparisons and normal-speed motions for acceptance before wider animation work. A single image does not provide hidden surfaces; their reconstruction is an art task requiring review, not automatic source recovery.

An approved layered 2.5D character is a possible fixed-camera alternative only if occluded surfaces and articulation are reviewed and the required approach/inspect/interact motions are actually credible. Whole-portrait translation, glow or cut-out pivots are not evidence that these motions have been achieved. Until then, preserve static artwork and explicitly label animation pending, as the registry does.

No paid services, generation credits, licensed-model purchases or new likenesses are authorized by this plan. If external assets become necessary, identify exact author/source/hash, license and redistribution/derivative/attribution terms, compatibility and cost before acquisition. No external model or texture was acquired. Existing Artlist artwork approval does not establish a license for an unrelated third-party 3D asset.

## Phase B2: shared infrastructure only after acceptance

Define semantic actions Idle, Walk, Inspect, Interact, Analyze, Communicate, Alert, Recover and Complete. Character adapters map semantic actions to each accepted model's own clip names, joint hierarchy, body proportions and contact targets. Do not assume all characters share one skeleton. Rigid mechanical parts can use transform tracks; deforming surfaces may require skinning. Morph targets are optional, not a requirement or a reason to alter the approved face.

An event adapter accepts an authoritative displayed snapshot and read-only event ID. It selects presentation actions, blends clips, cancels stale transitions on reset/replay and pauses when hidden, explicitly paused or reduced motion is enabled. Animation completion never executes a tool, approves a request or updates stock. Pending approval has no automatic transition. Error/refusal and rejection poses never show an inventory receipt. Reduced motion uses a stable pose plus complete readable event/status information.

Separate tests for semantic mapping, transition cancellation, repeated event IDs, replay, pause/resume, normal/reduced motion and model-state immutability are required once the infrastructure exists. Visual contact quality and identity cannot be certified by automated tests alone.

## Phase C

Only after explicit owner acceptance of VECTRA may the pipeline be applied to eleven more identities. Each retains its own art, proportions, rig validation and acceptance evidence. No Phase C modeling or shared simplified-model rollout is started by this registry work.
