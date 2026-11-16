# Design research — 100 verifiable sources, bounded visual evidence

This is an evidence benchmark, **not a definitive global ranking**. `references.json` and the compact `references.csv` account for 100 distinct, successfully fetched public HTML sources across ten categories. Every row records its source/final URL, timestamp, HTTP status, source hash, actual headings/element observations, technical feasibility, accessibility implications and NASHA relevance.

Source inspection does not establish how a dynamic page looks or moves. The initial native Chromium attempts failed certificate verification and were not counted as visual evidence. Rendering was retried using a separate API request transport through the configured proxy with the installed system CA bundle: HTTPS chain/hostname validation remains enabled, HTTP downgrades are refused, no `ignoreHTTPSErrors` or insecure flags are used. Media, non-GET and resources above 8 MB are refused; captures therefore cannot certify complete WebGL/media tours. No login, consent/access challenge, purchase or generation action was performed.

31 successful initial-viewport files were available at compilation; the other 69 references have no visual conclusion. Some captured initial frames show loaders, blank areas or consent overlays. They are not promoted to finished-site visual evaluations. The JSON gives exact per-reference availability and runtime observations. Source failures and duplicate redirects were excluded before selecting the 100; a site can be source-accessible at one timestamp yet challenged/unavailable on a later attempt. Third-party screenshots stay in local research output, never the public site or a repository media bundle.

## Findings grounded in the inspected examples

| Reference | Observed evidence | NASHA decision |
|---|---|---|
| [Apple MacBook Pro](https://www.apple.com/macbook-pro/) | Captured dark product panels, restrained navigation and immediately visible product actions | Use one dominant focal composition and direct engineering/resume actions; no copied product art or claimed Apple design affiliation |
| [Apple Vision Pro](https://www.apple.com/apple-vision-pro/) | Captured light, isolated product portrait with clear Learn/Buy actions | Preserve clean subject separation and immediate navigation; do not borrow likeness/media |
| [Stripe](https://stripe.com/) | Captured editorial headline and clear two-action hierarchy beside a colorful visual field | Keep the engineering proposition legible before an optional cinematic environment; use NASHA's own palette/layout |
| [Vercel](https://vercel.com/) | Captured sparse hero, two clear actions and a simple graphic focus | Reduce competing panels at arrival; do not make cinematic exploration a professional-information prerequisite |
| [Snøhetta](https://www.snohetta.com/) | Captured large editorial statement with project imagery in a restrained composition | Treat architectural views as authored compositions with captions, coherent scale and useful detail |
| [Foster + Partners](https://www.fosterandpartners.com/) | Captured an image-led architectural project with a restrained title overlay | Establish spatial identity and landscape with one strong, licensed/original architectural view |
| [Three.js skinning/blending example](https://threejs.org/examples/webgl_animation_skinning_blending.html) | Captured an articulated sample character with inspectable animation controls | Test clips, transitions and rig behavior on actual accepted NASHA assets; do not copy this unrelated character |
| [Three.js](https://threejs.org/) and [Spline examples](https://spline.design/examples) | Captured image-based project/example discovery and clear entry controls | Discoverability can be lightweight before optional 3D. An engine/gallery does not supply faithful NASHA assets |
| [Hugging Face Spaces](https://huggingface.co/spaces) | Captured navigable example cards and categories | Organize engineering demos by actual capability and expose source/evidence limits; no implication that catalog examples ran locally |
| [Bruno Simon](https://bruno-simon.com/) | Source explicitly lists movement, quality, audio, reset and renderer controls; our timed viewport remained a loading/blank field | Learn from explicit controls, while ensuring NASHA never hides recruiter access behind a loading world. No complete visual assessment claimed |
| [WCAG animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | Source/documentation references for control and reduced-motion requirements | Keep motion optional, pauseable and nonessential; implement actual tests rather than infer conformance from inspiration |

## Recommendations

1. Design one coherent architectural arrival and one faithful specialist, rather than adding geometric rooms. The bottleneck is approved art/model production, not missing WebGPU or React.
2. Use a direct editorial recruiter path, with optional world exploration. Existing-source loaders and overlays demonstrate why initial availability matters; their presence is not a quality endorsement.
3. Make each state transition inspectable: task, tool, input/output, authorization and ledger effect. Keep dense JSON in expandable evidence panels with keyboard access.
4. Use the original brewery's specific tank/court/material language and controlled marigold details. Keep approved character palettes intact; avoid making every surface cyan/neon.
5. Continue deferred scene/recording loading and measure both arrival and activated workflows. A passing initial Lighthouse score cannot certify animation smoothness, mobile GPU behavior or physical Safari.
6. Require side-by-side character fidelity review before animation-system expansion. Static artwork, reference video and a usable rig are different asset classes.

This research supports the proposed direction in `DESIGN-SYSTEM.md` and the bounded pilot in `PILOT.md`. It does not close owner visual acceptance, full interactive benchmarking or the missing faithful VECTRA asset gate.
