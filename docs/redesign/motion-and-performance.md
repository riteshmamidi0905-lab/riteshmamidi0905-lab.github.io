# Motion language and performance budgets

## Motion rules (one system)
| Where | Rule |
|---|---|
| Scroll | Headings and blocks reveal once (opacity + 18 px, 0.8 s, one easing). No parallax on text, no scroll-jacking outside the four chapter worlds. |
| Chapter worlds | The only pinned scroll: each world is a pure function of (time, step); the scroll position scrubs the step. Step buttons and arrow keys do the same without scrolling. |
| Systems | Motion carries meaning: nodes light as state advances, packets travel edges, events move through stages. Nothing floats for decoration. |
| Avatar | Appears in the hero, as a small "Ritesh explains" signature, in the AI and MAREF worlds, and in the contact scene. A 7 s breathing scale of 0.6 %; otherwise still. |
| Typography | No letter-by-letter animation. Hero/display type is static; captions fade in once per step. |
| Diagrams | Flowing dots (SMIL) run only while on screen and only with motion allowed (`pauseAnimations`). |
| UI | State changes ≤ 250 ms, one easing curve; focus rings are never animated away. |
| Reduced motion | No intro, no pinning, no flowing dots, no reveal. Worlds render one composed frame and are driven by step buttons. Tested. |
| Not used | constant floating, bouncing, glow stacks, cursor effects, every-element fade-up. |

## Performance budgets (enforced by `npm run test:budget`, gzip, first visit, no scrolling)
| Budget | Limit | Measured (desktop / mobile) |
|---|---|---|
| HTML | 48 KB | 27.9 / 27.9 KB |
| CSS | 26 KB | 11.1 / 11.1 KB |
| JS | 40 KB | 24.8 / 24.8 KB |
| Fonts | 100 KB | 86.6 / 86.6 KB |
| Images | 260 KB | 181 / 52 KB |
| Total | 440 KB | 334 / 205 KB |
| Requests | 24 | 18 / 17 |
| CLS | 0.1 | 0.002 / 0.001 |

Lazy by construction (asserted): lab code and the evaluation/RAG/stats cores (loaded when a demo is within 900 px), videos and their posters (on open), project visuals (when a project dialog opens). Only the scene on screen renders; the loop stops offscreen and pauses on hidden tabs; at ≤ 4 cores or on phones the particle count and canvas resolution drop and the frame rate is capped at 30 fps. No WebGL is used.
