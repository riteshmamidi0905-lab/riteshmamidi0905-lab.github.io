# Ritesh Mamidi — portfolio

Static GitHub Pages portfolio: three flagship AI systems with their evidence attached (Support Escalation Copilot, AI Agent Runtime, LLM evaluation), then supporting data and analytics work and the career story. Positioning, claims and limits are governed as data; see "Claim governance" below.

## Source structure

- `data.js` — canonical project library and the six supporting case studies. `content/*.json` — site copy, explainers, world scripts, research, verified evidence links.
- `index.src.html` and `copilot.src.html` — page skeletons + SEO heads. `build.js` + `scripts/render.js` + `scripts/render-copilot.js` + `scripts/worlds-html.js` — static generation of `index.html`, `support-escalation-copilot.html` and `recruiter.html`; `scripts/render-profile.js` generates `profile/README.md` (the GitHub profile README, copied by hand into the profile repository). Nothing is hand-duplicated.
- `assets/css/site.css` (the one design system), `assets/css/worlds.css` (scenes, avatar, demos), `assets/css/recruiter.css` (inlined into the recruiter page).
- `assets/js/site.js` (page behaviour), `worlds.js` (scroll-scrubbed canvas scenes), `host.js` (intro, demo tabs, capture mode), `film.js` (launch-film director), `lab/` (real logic behind the demos, unit-tested, plus the UI).
- `assets/avatar/` — avatar manifest, cut-outs and the spec for generated persona art. `deliverables/` — LinkedIn avatar crop and the launch film.
- `docs/redesign/` — visual audit, before/after, motion and performance rules, how to add a flagship.

## Develop and verify

```sh
npm ci --ignore-scripts
npm run build
npm test
npx playwright install chromium
python3 -m http.server 8000
# In another terminal:
npm run test:browser
npm run test:experience   # scenes, intro, in-chapter demos, capture mode, reduced motion
npm run test:budget       # first-visit performance budgets
npm run test:a11y
npm run verify:evidence:online   # re-fetch the vendored evidence from the pinned public commit
```

`npm test` runs the static checks and the Node unit tests for the lab cores (`scripts/test-lab.js`).

Always regenerate `index.html` after changing source or project data. CI checks that generated output is committed and tests responsive layouts, interactions, images, reduced motion and keyboard entry.

The site remains compatible with GitHub Pages publishing from `main` at the repository root. The validation workflow does not change account settings or the existing Pages publishing source.

## Capture mode and the launch film

Any scene can be captured cleanly: `?capture=hero|agents|data|maref|product|contact|rag|stream|experiment|funnel|maref-lab|agent|<flagship-repo-id>`, optionally with `&step=N&t=SECONDS` for a fixed frame. Size the browser viewport to the format you need (16:9, 1:1, 4:5).

`?capture=film` is a deterministic director page for the launch film: `window.__film.seek(t)` renders any frame from the site's own scenes and lab demos. `scripts/render-film.js` seeks, screenshots at 1080×1350 (30 fps) and encodes with FFmpeg, and writes SRT/VTT captions next to the video:

```sh
python3 -m http.server 8000 &
FFMPEG=/path/to/ffmpeg node scripts/render-film.js --out deliverables/film
```

## Video production

`scripts/narrate-videos.py` uses kokoro-onnx 0.6.1 and the upstream Kokoro v1.0 stock `am_michael` voice. Set `KOKORO_MODEL`, `KOKORO_VOICES` and `NARRATION_CACHE` to local paths; models and intermediate WAVs are kept outside the repository. Then run `NARRATION_CACHE=/your/cache python scripts/render-videos.py` (Pillow, FFmpeg and DejaVu fonts required). It renders diagram-led films from verified descriptions, with speech-aligned captions and AAC narration normalized toward −16 LUFS / −1.5 dBTP. `content/video-timings.json` records the spoken script and segment boundaries. No paid API is required. No cloned voice or generated footage of Ritesh is used. Videos load only when requested; the page does not autoplay them.

## Claim governance

Numbers about the Support Escalation Copilot are never typed into this repository. They come from the source repository's own `content/public-claims.json`, vendored byte for byte in `content/evidence/support-escalation-copilot/` (plus three of its reports, the three screenshots in `assets/copilot/`) at one pinned commit, recorded with sha256 hashes in each `SOURCE.json`.

- `scripts/claims.js` is the only way copy gets a number: `{{claim-id.path}}` tokens in `content/support-escalation-copilot.json` resolve against the vendored manifest at build time. A token that does not resolve, or that points at a claim the source repository did not mark `suitable_for.portfolio`, fails the build. The withheld 280/315 stand-in outcome figure cannot be rendered.
- `npm run verify:evidence` re-hashes every vendored file (part of `npm test`); `npm run verify:evidence:online` also re-fetches each file at the pinned commit (CI). Update to a new release with `npm run sync:evidence -- <40-char sha> [tag]`, then rebuild, review the diff and run the tests.
- `scripts/check-site.js` asserts, among much else: every `data-claim` is portfolio-eligible; every number in the Copilot narrative appears in an eligible claim (a stray figure fails); the evidence table contains every eligible claim verbatim, with its qualification; the attack replay and the draft examples are rows of the repository's own reports; the evidence labels (Verified / Simulated / Limitation / Not evaluated) are derived from the manifest's own fields; the hero positioning is truthful; and one banned token is absent from every text file (checked by hash).
- The AI Agent Runtime stays pinned in `content/agent-runtime.json` (commit `231b186`) and llmeval in `content/llm-eval-framework.json` (commit `99e6121`, re-run and dated).

## Credibility

Professional results are reported from the existing résumé. Open-source demonstrations use synthetic or controlled inputs where noted. Research examples are explicitly labeled illustrative and do not imply measured model comparisons. Snapshot links let readers inspect the evidence supporting each featured project.

Narrator provenance: [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0 weights) and [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). Stock synthetic narration is explicitly disclosed on the site. Runway speech tools required an upgrade during production; no credits were purchased.
