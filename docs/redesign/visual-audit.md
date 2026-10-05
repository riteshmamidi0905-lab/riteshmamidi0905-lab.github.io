# Visual audit — before the rebuild

Captured 2026-10-05 at 1440×900 and 390×844 from the live production site (`main`, 86ae4a4) and from the first redesign pass on `wip/cinematic-worlds-lab`. Evidence: `before-after/before/`.

## What is wrong
| # | Finding | Where |
|---|---|---|
| 1 | **Three design generations stacked.** Light "paper" sections (flagships, library, experience, education) alternate with dark cinematic ones; two type scales, two card styles, two accent treatments. Reads as half-edited. | whole page |
| 2 | **Flagships are small old cards.** A 380px light SVG diagram beside paragraph text, then a dark "explainer" box bolted underneath. Diagrams are tiny and low-contrast; the explainer duplicates the card's content. | `#work` |
| 3 | **22-card grid is the loudest thing on the page** and sits where the strongest work should be. All 22 compete equally. | `#pgrid` |
| 4 | **Story is fragmented.** Hero → 4 worlds → lab → work → research → watch → impact → experience → about → education → contact. MAREF, Watch, Impact and Education are islands with their own styles. | order |
| 5 | **Avatar repeated everywhere** (hero, 4 worlds, 6 explainers, 22 tour dialogs, lab chips) as the same small photo; it stops meaning "host". | many |
| 6 | **Hero carries too much**: eyebrow, name, 3-line headline, paragraph, role line, 4 buttons, 4 stat counters. Avatar competes with copy. | hero |
| 7 | **Demos are quarantined** in a tabbed "lab" far from the worlds they belong to; flagship cards do not link into them. | `#lab` |
| 8 | **"Impact in numbers" band** repeats résumé claims as marketing tiles; weakest, most template-like section. | impact |
| 9 | **Copy**: several generic phrases ("Engineer's hands. Analyst's rigor."), repeated disclaimers, long paragraphs under diagrams. | many |
| 10 | **Mobile**: worlds were recomposed, but the paper sections were only shrunk; 50k px page height; filter chips and cards stack for screens. | mobile |
| 11 | **Dead weight**: `base.css`/`portfolio.css`/`app.js`/`portfolio.js` carry the old system (≈45 KB) and fight the new one. | assets |
| 12 | MAREF has the same visual tone as everything else (no research feel). | `#research` |

## What the rebuild does about it
One dark system, one type scale; the story order from the brief (hero → what I build → AI → data → product → flagships → MAREF → experience → all projects → about → contact); demos live inside their worlds; flagships become full-width chapters whose architecture diagram *is* the interactive explorer; the library is a compact searchable list placed late; MAREF gets a restrained, serif, paper-like treatment; a separate fast Recruiter view; all obsolete CSS/JS removed.
