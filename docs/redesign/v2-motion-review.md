# V2 motion review

Method: desktop (1280×720, 2:07) and mobile (390×844, 1:54) Playwright recordings of the real scroll interactions, frame-sampled
every 2–3 s and read in full, plus per-step screenshots of every scene at 1920, 1440, 1280, 1024, 768, 430, 390 and 375 wide.
An automated overlap audit (text rectangles recorded while drawing; text vs text, text vs DOM caption/nav/title, canvas bounds)
runs on every step of every scene and now reports no issues.

## Problems found and fixed
| Problem | Fix |
|---|---|
| Scenes drew at a fixed pixel scale, so mobile was a shrunken desktop and 1920 had empty space | Engine renders in design pixels and scales the whole canvas; the drawing box is measured from the real title/caption position, so diagrams fill the space between them |
| Caption height changed per step, shifting the box | Caption block reserves its tallest step's height |
| Flagship scenes shared one layout | Rewritten: event-time field (streaming), layered data flow (lakehouse), parallel-coordinate gates (eval), retrieval space (RAG), lifecycle loop + drift (MLOps), distributions (experimentation) |
| MAREF looked like a dashboard | Chain INPUT → OUTPUT → DIMENSIONS → ASSESSMENT, hairlines, one accent, labelled illustrative |
| Agent/RAG/data text collisions at 1024 and 375 | Wrapped/ellipsised text, per-width layouts, mobile recomposed as vertical traces |
| Old photo fallback made compositions look unfinished | Empty avatar slots render nothing; hero shows the evaluation instrument |
| Boxed lab tiles | Rules, scale and alignment instead of cards |
| Reduced-motion stills were arbitrary frames | Each scene defines `still` (the step that tells the whole story) |

## Remaining observations (not blocking)
- Scene entry shows the first step at once; scenes that load lazily can flash an empty stage for a frame on a fast fling.
- Product chapter crossfades funnel → retention → experiment over ~0.4 of a step; briefly both are faint at once by design.
- The lakehouse rows glide between layers; mid-glide frames look compressed for ~0.3 s.
