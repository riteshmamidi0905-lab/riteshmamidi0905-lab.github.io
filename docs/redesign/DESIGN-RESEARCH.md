# Design research (D-90) — source quality statement
Primary sites (Apple, Active Theory, Awwwards winners) could not be fetched here; the search tool returns snippet-level secondary sources only. The findings below are therefore **patterns reported by secondary sources, to be treated as hypotheses**, and none was copied. Where a number is quoted it is from the cited snippet and unverified.

| Technique reported | Source (snippet level) | What this candidate does with it |
|---|---|---|
| Most recent Awwwards Site-of-the-Day winners are scrollytelling; winners respect `prefers-reduced-motion` and show a static fallback when WebGL is absent | [svilenkovic.com 2026 notes](https://svilenkovic.com/3d/awwwards-2026-3d), [Awwwards inspiration pages](https://www.awwwards.com/inspiration/scrollytelling-experience-creativcurrent) | Scroll-driven *world* sections; every animation has a reduced-motion state; the hero canvas draws one static frame instead. |
| 3D is viable on mobile only with progressive loading and cheap draws; Lighthouse mobile 90+ is a common benchmark among winners | same blog | No WebGL library: a 2D canvas with a 30 fps cap, paused off-screen. Measured Lighthouse mobile performance 97–100. |
| GSAP + ScrollTrigger (+ Lenis) are the usual tools | developer resource cited in the search result | Not used: the needed effects (sticky world switching, reveals) are an IntersectionObserver and CSS; total JavaScript about 15 KB. A library would add weight without a measurable benefit here. Scroll-jacking (Lenis) is avoided on purpose. |
| Apple-style scroll-scrub: image sequences or scrubbed video, frames loaded progressively; scroll position (not timers) must drive the frame; keep the page usable without motion | [GSAP forum thread](https://gsap.com/community/forums/topic/31234-scrolltrigger-image-sequence-performance/), scroll-scrub guides in the same search | Not adopted. There is no honest footage of the systems to scrub, and generated footage must not misrepresent functionality. The "scene" is the replay of real recorded runs, driven by user input. |

## Principles derived (original to this project)
1. **The hero must be a diagram of something real.** The animated lanes are the actual workflow (orders → pipeline → forecast → agent → gate → human → ledger), labelled *illustrative*, linking to the real replay.
2. **Worlds, not sections.** Four hue identities (AI mint, Data blue, Systems amber, Product rose) switch with scroll; shared type, spacing and component language keep it one site.
3. **Interactive evidence beats screenshots.** The flagship page replays eight recorded scenarios and lets a visitor filter the architecture by implementation status.
4. **Say what is not claimed, in the component.** Status badges use text and outline style, not colour alone.
5. **Performance is a feature:** no frameworks, no video, local fonts, measured.
