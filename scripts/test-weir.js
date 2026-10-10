/* Browser regression for the Weir case study and its homepage strip, built so that it cannot pass against a stale or wrong server.
   Every page is fetched through the same route the other browser tests use (TEST_FILE routing, or a server on PORT) and its bytes must equal the freshly built file on disk;
   a request for a page that does not exist must come back 404 (proves the detector works); then layout, overflow, images, console and focus are checked at five widths. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright'); const assert = require('node:assert/strict');
const { serveLocal, base } = require('./local-preview');
const ROOT = path.join(__dirname, '..'), sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const here = (f) => base.replace(/\/?$/, '/') + f;
const BUILT = ['index.html', 'recruiter.html', 'mcp-weir.html', 'projects.html', 'evaluation.html', 'agent-runtime.html', 'support-escalation-copilot.html', 'assets/css/site.css'];
(async () => {
  assert.equal(process.cwd(), ROOT, 'run from the repository root: the test routes the working directory');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const mode = process.env.TEST_FILE ? 'TEST_FILE routing of ' + ROOT : 'server at ' + base;
  /* 1. what the browser is served is what the build produced */
  { const ctx = await browser.newContext(); const page = await ctx.newPage(); await serveLocal(page);
    await page.goto(here('mcp-weir.html'), { waitUntil: 'load' });
    for (const f of BUILT) { const got = await page.evaluate(async (u) => { const r = await fetch(u, { cache: 'no-store' }); return { status: r.status, bytes: Array.from(new Uint8Array(await r.arrayBuffer())) }; }, here(f)); assert.equal(got.status, 200, f + ' status'); const disk = fs.readFileSync(path.join(ROOT, f)); assert.equal(got.bytes.length, disk.length, f + ': served length differs from the built file (stale server or stale build)'); assert.equal(sha(Buffer.from(got.bytes)), sha(disk), f + ': served bytes differ from the built file (stale server or stale build)'); }
    const miss = await page.evaluate(async (u) => (await fetch(u, { cache: 'no-store' })).status, here('this-page-does-not-exist.html')); assert.equal(miss, 404, 'a missing page must be a 404 (the detector works)');
    await ctx.close(); }
  const built = fs.readFileSync(path.join(ROOT, 'mcp-weir.html'), 'utf8');
  assert.ok(/<title>[^<]*Weir/.test(built) && !/not found/i.test(built.slice(0, 2000)), 'the built page is the Weir page');
  /* 2. layout, content and focus at five widths */
  for (const [label, width, height] of [['desktop', 1440, 1000], ['laptop', 1180, 760], ['tablet', 820, 1180], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } });
    const page = await ctx.newPage(); const errors = [], bad = []; await serveLocal(page);
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    const settle = async () => { await page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in'))); await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete)); };
    const noOverflow = async (name) => { await settle(); const lay = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src), off: [...document.querySelectorAll('body *')].filter((e) => !e.closest('.weir-fig,.hero,.world,.contact,.nl,dialog,table.lt') && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map((e) => e.tagName + '.' + (e.className.baseVal !== undefined ? e.className.baseVal : e.className)) }));
      assert.ok(lay.s <= lay.w + 1, `${label} ${name}: horizontal overflow ${lay.s} > ${lay.w}: ${lay.off.join(', ')}`); assert.deepEqual(lay.off, [], `${label} ${name}: elements past the right edge`); assert.deepEqual(lay.broken, [], `${label} ${name}: broken images`); };
    await page.goto(here('mcp-weir.html'), { waitUntil: 'load' });
    assert.equal(await page.locator('h1').count(), 1); assert.match(await page.locator('h1').first().innerText(), /Weir/);
    for (const id of ['problem', 'what', 'demo', 'control-center', 'evaluation', 'real-model', 'failed', 'limits']) assert.equal(await page.locator('#' + id).count(), 1, 'section #' + id);
    await noOverflow('weir page');
    /* the Control Center section: readable primary image (the phone-width capture on phones), a tabbed walk-through that works by mouse and by keyboard, and the qualifications in view */
    { await settle(); const cc = page.locator('#control-center'); await cc.scrollIntoViewIfNeeded();
      const prim = await cc.locator('.cc-main img').evaluate((i) => ({ src: i.currentSrc.split('/').pop(), w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height), nat: i.naturalWidth }));
      assert.equal(prim.src, width <= 640 ? 'control-center-flow-mobile.png' : 'control-center-flow.png', `${label}: primary image source`); assert.ok(prim.nat > 0 && prim.w >= Math.min(width - 2 * 20 - 8, 300), `${label}: primary image is readable (${prim.w}px wide)`);
      if (width >= 1180) assert.ok(prim.w >= 700, `${label}: primary image is large enough to read (${prim.w}px)`);
      const secH = await cc.evaluate((e) => e.getBoundingClientRect().height); assert.ok(secH <= height * (width <= 640 ? 5.2 : 3.4), `${label}: the Control Center section (${Math.round(secH)}px) must not dominate the page`);
      assert.match(await cc.innerText(), /Synthetic world, real gateway/); assert.match(await cc.innerText(), /Localhost-only and experimental/); assert.match(await cc.innerText(), /Weir mediates MCP tool calls and results\. It does not inspect the model's final answer\./);
      const tabs = cc.locator('[role="tab"]'); assert.equal(await tabs.count(), 4, `${label}: four tabs`); const panels = cc.locator('.cc-step');
      const state = async () => ({ sel: await tabs.evaluateAll((t) => t.map((x) => x.getAttribute('aria-selected'))), vis: await panels.evaluateAll((p) => p.map((x) => !x.hidden && getComputedStyle(x).display !== 'none')) });
      assert.deepEqual(await state(), { sel: ['true', 'false', 'false', 'false'], vis: [true, false, false, false] }, `${label}: first tab selected`);
      for (let i = 1; i < 4; i++) { const box = await tabs.nth(i).boundingBox(); assert.ok(box.height >= 43.5, `${label}: tab ${i} is at least 44px tall (${box.height})`); await tabs.nth(i).click(); const st = await state(); assert.equal(st.vis.filter(Boolean).length, 1); assert.ok(st.vis[i] && st.sel[i] === 'true', `${label}: clicking tab ${i} shows its panel`);
        await settle(); assert.ok(await panels.nth(i).locator('img').evaluate((m) => m.complete && m.naturalWidth > 0), `${label}: panel ${i} image loads`); }
      await tabs.nth(0).click(); await tabs.nth(0).focus(); await page.keyboard.press('ArrowRight'); assert.ok((await state()).vis[1], `${label}: ArrowRight`); assert.equal(await page.evaluate(() => document.activeElement.id), 'cc-tab-1');
      await page.keyboard.press('End'); assert.ok((await state()).vis[3], `${label}: End`); await page.keyboard.press('ArrowRight'); assert.ok((await state()).vis[0], `${label}: ArrowRight wraps`); await page.keyboard.press('ArrowLeft'); assert.ok((await state()).vis[3], `${label}: ArrowLeft wraps`); await page.keyboard.press('Home'); assert.ok((await state()).vis[0], `${label}: Home`);
      assert.equal(await page.locator('.cc-tab[aria-selected="false"]').first().getAttribute('tabindex'), '-1', 'roving tabindex');
      await tabs.nth(0).focus(); await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('.cc-step') || document.activeElement.classList.contains('cc-fig')), `${label}: Tab from the selected tab reaches the visible screenshot`);
      await tabs.nth(0).click(); }
    /* wide screenshots scroll sideways on narrow screens and can be reached by keyboard; tables read as stacked cards */
    if (width <= 860) { const figs = page.locator('.weir-fig'); const n = await figs.count(); assert.ok(n >= 2, 'wide figures are scrollable'); for (let i = 0; i < n; i++) { assert.equal(await figs.nth(i).getAttribute('tabindex'), '0'); } const cap = await page.locator('.weir-tbl caption').first().boundingBox(); assert.ok(cap.width > width * 0.6, `${label}: table caption is squeezed to ${cap.width}px`); }
    /* anchors in the page navigation land on their sections */
    for (const a of await page.locator('main a[href^="#"]').evaluateAll((as) => as.map((x) => x.getAttribute('href')).slice(0, 12))) assert.equal(await page.locator(a).count(), 1, 'anchor ' + a);
    assert.deepEqual(errors, [], label + ' console errors (weir page)'); assert.deepEqual(bad, [], label + ' failed requests (weir page)');
    /* the homepage strip */
    await page.goto(base, { waitUntil: 'load' });
    assert.equal(await page.locator('#weir').count(), 1, 'homepage strip'); assert.ok(await page.locator('#weir a[href="mcp-weir.html"]').count() >= 1, 'strip links to the case study');
    await noOverflow('home'); assert.deepEqual(errors, [], label + ' console errors (home)'); assert.deepEqual(bad, [], label + ' failed requests (home)');
    /* the recruiter view lists it */
    await page.goto(here('recruiter.html'), { waitUntil: 'load' }); assert.ok(await page.locator('a[href="mcp-weir.html"]').count() >= 1, 'recruiter view links the case study');
    /* the Weir entry on its own must fit at every width; the whole page must fit from 360 px up. At 320 px the Copilot and runtime entries (unchanged, already on the live site) overflow by 14 px because of their nowrap link row, so the page-level check starts at 360 */
    const alone = await page.evaluate(() => { const lis = [...document.querySelectorAll('.proj > li')], mine = lis.find((l) => l.querySelector('a[href="mcp-weir.html"]')); lis.forEach((l) => { l.style.display = l === mine ? '' : 'none'; }); const r = { sw: document.documentElement.scrollWidth, w: innerWidth }; lis.forEach((l) => { l.style.display = ''; }); return r; });
    assert.ok(alone.sw <= alone.w + 1, `${label}: the Weir recruiter entry alone overflows (${alone.sw} > ${alone.w})`);
    if (width >= 360) await noOverflow('recruiter');
    await ctx.close();
  }
  /* without JavaScript the walk-through is a plain list: all four screenshots are visible and there are no tabs */
  { const ctx = await browser.newContext({ viewport: { width: 1180, height: 760 }, javaScriptEnabled: false }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(here('mcp-weir.html'), { waitUntil: 'load' });
    assert.equal(await page.locator('#control-center [role="tab"]').count(), 0); assert.equal(await page.locator('#control-center .cc-step:visible').count(), 4, 'all four screenshots are listed without JavaScript');
    assert.equal(await page.locator('#control-center .cc-step[hidden]').count(), 0); await ctx.close(); }
  await browser.close();
  console.log('PASS: Weir browser checks (' + mode + '; served bytes = built bytes for ' + BUILT.length + ' files; 404 detector; 5 widths: layout, overflow, images, console, focus, anchors, Control Center section and gallery by mouse and keyboard, no-JavaScript fallback, homepage strip, recruiter view)');
})().catch((e) => { console.error(e); process.exit(1); });
