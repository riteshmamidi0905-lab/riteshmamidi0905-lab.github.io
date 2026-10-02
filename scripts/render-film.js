/* Renders the launch film: scripts/render-film.js [--stills] [--out dir]
   Drives ?capture=film frame by frame (30 fps, 1080×1350 = 540×675 CSS px @2×), then encodes with ffmpeg.
   Needs: playwright (devDependency) and an ffmpeg binary (FFMPEG env var, or `ffmpeg` on PATH). */
'use strict';
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const stills = process.argv.includes('--stills'); const out = path.resolve(arg('--out', 'deliverables/film')); const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const base = process.env.BASE || 'http://127.0.0.1:8000/';
const ts = (s, sep) => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + x.toFixed(3).padStart(6, '0').replace('.', sep); };
(async () => {
  fs.mkdirSync(out, { recursive: true }); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'film-'));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--force-color-profile=srgb'] });
  const ctx = await browser.newContext({ viewport: { width: 540, height: 675 }, deviceScaleFactor: 2 }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(base + '?capture=film', { waitUntil: 'load' }); await page.waitForFunction(() => document.documentElement.dataset.filmReady === '1', null, { timeout: 60000 });
  const info = await page.evaluate(() => ({ d: __film.duration, fps: __film.fps, cues: __film.cues, segs: __film.segments })); const N = Math.ceil(info.d * info.fps);
  if (stills) { const pts = process.argv.includes('--at') ? arg('--at', '').split(',').map(Number) : info.segs.map((s) => s.t0 + Math.min(s.d - 0.5, s.d * 0.7));
    pts.sort((a, b) => a - b); for (const t of pts) { await page.evaluate((x) => __film.seek(x), t); await page.waitForTimeout(60); await page.screenshot({ path: path.join(out, `still-${t.toFixed(1)}.png`) }); } console.log('stills', pts, errs); await browser.close(); return; }
  console.log(`rendering ${N} frames (${info.d.toFixed(1)}s)`);
  for (let f = 0; f < N; f++) { await page.evaluate((t) => __film.seek(t), f / info.fps); await page.screenshot({ path: path.join(tmp, `f${String(f).padStart(5, '0')}.png`) }); if (f % 150 === 0) console.log(' frame', f); }
  await browser.close(); if (errs.length) console.log('page errors:', errs);
  const mp4 = path.join(out, 'ritesh-portfolio-launch-1080x1350.mp4');
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(info.fps), '-i', path.join(tmp, 'f%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  fs.copyFileSync(path.join(tmp, 'f00045.png'), path.join(out, 'launch-film-poster.png'));
  const cues = info.cues; fs.writeFileSync(path.join(out, 'ritesh-portfolio-launch.srt'), cues.map((c, i) => `${i + 1}\n${ts(c.start, ',')} --> ${ts(c.end, ',')}\n${c.text}\n`).join('\n'));
  fs.writeFileSync(path.join(out, 'ritesh-portfolio-launch.vtt'), 'WEBVTT\n\n' + cues.map((c) => `${ts(c.start, '.')} --> ${ts(c.end, '.')}\n${c.text}\n`).join('\n'));
  fs.rmSync(tmp, { recursive: true, force: true }); console.log('done', mp4);
})().catch((e) => { console.error(e); process.exit(1); });
