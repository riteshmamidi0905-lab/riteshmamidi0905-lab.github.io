'use strict';
// First-paint regression test. Runs with motion ENABLED (the other browser tests run with reduced motion, which switches the page entrance animation off).
// Guards against the page-in entrance starting fully transparent: that intermittently prevented any first paint in headless Chrome (18 of 80 loads; 0 of 80 after the fix).
// Two layers: (1) structural: the running entrance animation's first keyframe must not be fully transparent; (2) empirical: every fresh load must report a first-contentful-paint.
// Usage: static server on port 8000, then npm run test:paint   (BROWSER=chromium|firefox|webkit, LOADS=12 per page)
const pw = require('playwright'), fs = require('fs'), engine = process.env.BROWSER || 'chromium', BASE = process.env.BASE || 'http://127.0.0.1:8000/', LOADS = +(process.env.LOADS || 12), TIMEOUT = 5000;
const PAGES = ['index.html', 'data-lab.html', 'lab-explorer.html', 'verified-projects.html', 'case-studies.html', 'case-production-ai-agent-platform.html'];
(async () => {
  const b = await pw[engine].launch(engine === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
  const report = { engine, loads_per_page: LOADS, motion: 'no-preference', pages: {} }; let failures = 0;
  for (const page of PAGES) {
    const r = { loads: 0, fcp_missing: 0, fcp_max_ms: 0, first_keyframe_transparent: 0, animation_found: 0, body_visible_after_load: 0 };
    for (let i = 0; i < LOADS; i++) {
      const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, reducedMotion: 'no-preference' }), p = await ctx.newPage();
      try {
        await p.addInitScript(() => { window.__anim = null; document.addEventListener('DOMContentLoaded', () => { const a = document.body.getAnimations().find(x => x.animationName === 'page-in'); if (a) window.__anim = a.effect.getKeyframes()[0].opacity; }); });
        await p.goto(BASE + page, { waitUntil: 'load', timeout: 20000 }); r.loads++;
        const m = await p.evaluate((t) => new Promise(res => { const t0 = performance.now(), poll = () => { const e = performance.getEntriesByName('first-contentful-paint')[0]; if (e) res({ fcp: Math.round(e.startTime), anim: window.__anim }); else if (performance.now() - t0 > t) res({ fcp: null, anim: window.__anim }); else setTimeout(poll, 25); }; poll(); }), TIMEOUT);
        if (m.fcp === null) r.fcp_missing++; else r.fcp_max_ms = Math.max(r.fcp_max_ms, m.fcp);
        if (m.anim !== null && m.anim !== undefined) { r.animation_found++; if (parseFloat(m.anim) < 0.005) r.first_keyframe_transparent++; }
        await p.waitForTimeout(700); const op = await p.evaluate(() => parseFloat(getComputedStyle(document.body).opacity)); if (op >= 0.99) r.body_visible_after_load++;
      } catch (e) { r.fcp_missing++; }
      await ctx.close();
    }
    r.pass = r.fcp_missing === 0 && r.first_keyframe_transparent === 0 && r.body_visible_after_load === r.loads && r.loads === LOADS; if (!r.pass) failures++; report.pages[page] = r;
  }
  await b.close(); report.failures = failures; fs.mkdirSync('work', { recursive: true }); fs.writeFileSync(`work/first-paint-results-${engine}.json`, JSON.stringify(report, null, 1));
  const total = Object.values(report.pages).reduce((a, x) => ({ loads: a.loads + x.loads, missing: a.missing + x.fcp_missing, transparent: a.transparent + x.first_keyframe_transparent }), { loads: 0, missing: 0, transparent: 0 });
  console.log(JSON.stringify({ engine, pages: PAGES.length, loads: total.loads, fcp_missing: total.missing, transparent_first_keyframes: total.transparent, pages_failed: failures }));
  process.exit(failures ? 1 : 0);
})();
