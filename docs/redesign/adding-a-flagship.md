# Adding a flagship

A project becomes a flagship only when its repository is public, builds, has tests, contains only independently created, synthetic or open-source material, and every claim has been signed off. The page is data-driven, so a new flagship needs no layout work:

1. **`data.js` → `FLAG`**: add the entry (`n`, `r`, `one`, `tech`, `cs.arch` = the architecture nodes in order, plus `cs.problem/approach/decision/evaluation/limit/lessons/result`). Add it to `P` as well so it appears in the library.
2. **`content/explainers.json`**: add `beats` (what it is, problem, how it works, why this architecture, how it is evaluated, tradeoffs, limitations, what's next) and `arch` (one factual sentence per node, same order as `cs.arch`). The build fails if the counts differ.
3. **`content/site.json` → `explains`**: the two-sentence "Ritesh explains" quote. Keep it to what the project demonstrably does.
4. **`content/project-evidence.json`** (reviewed commit SHA) and **`content/project-links.json`** (does `tests/` exist? `docs/architecture.md`?). Links are generated only from these; a "Tests" or "Architecture" button never appears for a destination that was not verified.
5. Optional: a live demo → add `dm` to its `P` entry; a lab panel → add it to `LAB`/`CHAPTERS` in `scripts/render.js` and a core in `assets/js/lab/` with unit tests; films → `content/videos.json` + `site.json → videos`.
6. `npm run build && npm test && npm run test:browser`. The static checks assert story order, link validity and evidence honesty.

For a flagship that deserves a full "world" (like the agent or data chapters), add a scene to `assets/js/worlds.js` (`SCENES.<name>`, one pure function of time and step) and its script to `content/worlds.json`; capture mode (`?capture=<name>`) and the film director pick it up automatically.
