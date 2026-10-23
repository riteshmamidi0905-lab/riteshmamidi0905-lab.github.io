# Creative direction and design system (D-90)
**Idea:** *the engineer who builds intelligent systems* — a visitor explores the systems themselves. Dark environments, one disciplined type system, four world hues, motion that always explains something.

## Tokens (`css/system.css`)
| Token | Value | Use |
|---|---|---|
| `--bg / --bg2 / --surface` | `#06090a / #0a1113 / #0e1719` | page, alternate band, cards |
| `--text / --muted / --dim` | `#eef4f1 / #a6b7b2 / #8aa09a` | body, secondary, tertiary (all ≥ 4.5:1 on `--bg`) |
| `--ai / --data / --sys / --prod` | `#7ce8bd / #62c9ff / #ffb85c / #ff94a8` | world accents (text, borders, diagram strokes) |
| Type | Inter (local, variable weights 300–650), JetBrains Mono for labels at ≥ 11–12 px | display 350 weight, tracking −0.05em |
| Spacing / radius | fluid `clamp()` gaps, 6 px controls, 10–12 px panels | |

## Components
Header (sticky, blurred), buttons (primary/secondary), eyebrow, status chips (text + outline), proof strip, world panel + diagram, replay player (tabs, steps, side summary), architecture graph + detail panel, bars, evidence table, mobile quick-action bar.

## Motion and accessibility system
* Everything is visible without JavaScript or animation; `.js` adds reveals.
* `prefers-reduced-motion`: CSS animation/transition off, reveals shown, hero canvas draws one static frame.
* Pointer parallax is ≤ 22 px and eased; no scroll-jacking; smooth scroll is disabled under reduced motion.
* Keyboard: skip link, visible focus ring, tablist arrow/Home/End keys, architecture nodes are buttons; scrollable regions are focusable.
* Replay announces each step through a polite live region.

## Information architecture (recruiter first)
Home: role targets, two actions and the 60-second brief link above the fold; proof strip with measured numbers; four worlds; flagship replay; six builds as an index (not cards); contact. A fixed bottom bar on phones keeps *Recruiter brief* one tap away. `recruiter.html` is rebuilt in the new system with the original experience text verbatim and employment kept separate from independent projects.
