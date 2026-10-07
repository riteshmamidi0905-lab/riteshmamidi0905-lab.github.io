/* Homepage length in mobile screens: document height at 375×812 divided by 812, after fonts and images have settled. Prints the figure for the full page and for each top-level section.
   Run with TEST_FILE=1 (route-intercepted local serving) or against a server on PORT. Use --max N to fail above N screens, --json for machine output. */
'use strict';
const { chromium } = require('playwright'); const { serveLocal, base } = require('./local-preview');
const W = 375, H = 812, args = process.argv.slice(2), max = args.includes('--max') ? Number(args[args.indexOf('--max') + 1]) : null, page_ = args.find((a) => /\.html$/.test(a)) || '';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const out = {};
  for (const [label, reduce] of [['motion', 'no-preference'], ['reduced-motion', 'reduce']]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: reduce, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } });
    const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + page_, { waitUntil: 'load' });
    await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete)); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600);
    const m = await page.evaluate((H) => { const h = document.documentElement.scrollHeight; const secs = [...document.querySelectorAll('main > section, main > article, main > div')].map((s) => ({ id: s.id || s.className.split(' ')[0], h: Math.round(s.getBoundingClientRect().height) })); return { total: h, screens: Math.round(h / H * 10) / 10, sections: secs.map((s) => ({ id: s.id, screens: Math.round(s.h / H * 10) / 10 })) }; }, H);
    out[label] = m; await ctx.close();
  }
  await browser.close();
  if (args.includes('--json')) console.log(JSON.stringify(out, null, 1));
  else { for (const [k, v] of Object.entries(out)) { console.log(`${k}: ${v.screens} screens of ${W}×${H} (${v.total}px)`); console.log(v.sections.map((s) => `  ${String(s.id).padEnd(14)} ${s.screens}`).join('\n')); } }
  if (max != null && out.motion.screens > max) { console.error(`homepage is ${out.motion.screens} screens, above the ${max}-screen limit`); process.exit(1); }
})().catch((e) => { console.error(e.message); process.exit(1); });
