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
npm run test:a11y
```

Always regenerate `index.html` after changing source or project data. CI checks that generated output is committed and tests responsive layouts, interactions, images, reduced motion and keyboard entry.

The site remains compatible with GitHub Pages publishing from `main` at the repository root. The validation workflow does not change account settings or the existing Pages publishing source.

## Video production

`scripts/narrate-videos.py` uses kokoro-onnx 0.6.1 and the upstream Kokoro v1.0 stock `am_michael` voice. Set `KOKORO_MODEL`, `KOKORO_VOICES` and `NARRATION_CACHE` to local paths; models and intermediate WAVs are kept outside the repository. Then run `NARRATION_CACHE=/your/cache python scripts/render-videos.py` (Pillow, FFmpeg and DejaVu fonts required). It renders diagram-led films from verified descriptions, with speech-aligned captions and AAC narration normalized toward −16 LUFS / −1.5 dBTP. `content/video-timings.json` records the spoken script and segment boundaries. No paid API is required. No cloned voice or generated footage of Ritesh is used. Videos load only when requested; the page does not autoplay them.

## Credibility

Professional results are reported from the existing résumé. Open-source demonstrations use synthetic or controlled inputs where noted. Research examples are explicitly labeled illustrative and do not imply measured model comparisons. Snapshot links let readers inspect the evidence supporting each featured project.

Narrator provenance: [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0 weights) and [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). Stock synthetic narration is explicitly disclosed on the site. Runway speech tools required an upgrade during production; no credits were purchased.
