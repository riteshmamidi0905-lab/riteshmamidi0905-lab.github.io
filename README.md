# Ritesh Mamidi — portfolio

Static GitHub Pages portfolio for AI/ML, GenAI/LLM evaluation, data engineering and product analytics.

## Source structure

- `data.js`: canonical project library and six case studies.
- `index.src.html`: authored page template; `index.html` is the synchronized build output.
- `build.js` / `scripts/sections.js`: static generation; no framework runtime.
- `assets/css/`: layout and portfolio identity; `app.js` and `assets/js/portfolio.js`: progressive enhancement.
- `project-visuals/`: animated SVG project explanations and nonanimated `-still.svg` variants. Prior GIF assets are retained for compatibility but are not requested by the page.
- `assets/media/`: captioned diagram films, posters and WebVTT captions.
- `demos/`: preserved project dashboards. Dashboard values come from bundled demo data, not live portfolio telemetry.
- `content/worlds.json`, `content/explainers.json`: the scroll-scrubbed scene scripts and the host's project explanations (data, rendered to static HTML by `scripts/worlds-html.js`).
- `assets/js/worlds.js`: the cinematic scenes (canvas, one pure function of time and step each; only the visible scene renders). `assets/js/host.js`: intro, explainers, lab loading, micro-tours, capture mode. `assets/js/film.js`: the launch-film director (see below).
- `assets/js/lab/*-core.js`: the real logic behind the interactive lab (agent loop, RAG, streaming simulation, A/B statistics, funnel model, evaluation proxies), ported from the repositories and unit-tested in Node. `lab-ui.js` only builds the DOM.
- `assets/avatar/`: avatar manifest, cut-outs and the production spec for generated persona art (`README.md` there explains how to drop it in).
- `deliverables/`: LinkedIn avatar crop and preview, and the rendered launch film with captions.
- `content/research.json`: proposed MAREF dimensions; no experimental result claims.
- `content/project-evidence.json`: exact reviewed source revisions for all 22 projects.
- `content/videos.json` / `content/linkedin-drafts.md`: explainer scripts and social drafts. Publishing each social post requires specific approval.

## Develop and verify

```sh
npm ci --ignore-scripts
npm run build
npm test
npx playwright install chromium
python3 -m http.server 8000
# In another terminal:
npm run test:browser
npm run test:experience   # scenes, intro, lab demos, explainers, capture mode, reduced motion
npm run test:a11y
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

## Credibility

Professional results are reported from the existing résumé. Open-source demonstrations use synthetic or controlled inputs where noted. Research examples are explicitly labeled illustrative and do not imply measured model comparisons. Snapshot links let readers inspect the evidence supporting each featured project.

Narrator provenance: [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0 weights) and [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). Stock synthetic narration is explicitly disclosed on the site. Runway speech tools required an upgrade during production; no credits were purchased.
