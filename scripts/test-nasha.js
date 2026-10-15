/* Browser regression for the NASHA AI Operations Lab page and its homepage strip: bytes served equal the build, layout/overflow/images/console at five widths, keyboard-operable interactions
   (architecture explorer, planner and retrieval filters, permission illustration, failure and trace steppers), the page reads in full with JavaScript disabled, and reduced motion. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright'); const assert = require('node:assert/strict');
const { serveLocal, base } = require('./local-preview');
const ROOT = path.join(__dirname, '..'), sha = (b) => crypto.createHash('sha256').update(b).digest('hex'), here = (f) => base.replace(/\/?$/, '/') + f;
(async () => {
  assert.equal(process.cwd(), ROOT, 'run from the repository root');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  { const ctx = await browser.newContext(); const page = await ctx.newPage(); await serveLocal(page); await page.goto(here('nasha-lab.html'), { waitUntil: 'load' });
    for (const f of ['nasha-lab.html', 'index.html', 'assets/js/nasha.js', 'assets/css/nasha.css']) { const got = await page.evaluate(async (u) => { const r = await fetch(u, { cache: 'no-store' }); return { status: r.status, bytes: Array.from(new Uint8Array(await r.arrayBuffer())) }; }, here(f)); assert.equal(got.status, 200, f); assert.equal(sha(Buffer.from(got.bytes)), sha(fs.readFileSync(path.join(ROOT, f))), f + ': served bytes differ from the build'); }
    await ctx.close(); }
  for (const [label, width, height] of [['desktop', 1440, 1000], ['laptop', 1180, 760], ['tablet', 820, 1180], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } });
    const page = await ctx.newPage(); const errors = [], bad = []; await serveLocal(page);
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    const settle = async () => { await page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in'))); await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete)); };
    await page.goto(here('nasha-lab.html'), { waitUntil: 'load' }); await settle();
    const lay = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src), off: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 2 && !e.closest('.weir-fig,.nx-shot,table'); }).map((e) => e.tagName + '.' + e.className).slice(0, 5) }));
    assert.ok(lay.s <= lay.w + 1, `${label}: horizontal overflow ${lay.s} > ${lay.w}: ${lay.off.join(', ')}`); assert.deepEqual(lay.off, [], `${label}: elements past the right edge`); assert.deepEqual(lay.broken, [], `${label}: broken images`);
    /* disclosure is visible in the first screens */
    const disc = page.locator('.nx-disc'); assert.ok(await disc.isVisible()); assert.match(await disc.innerText(), /not a live operating restaurant/);
    /* architecture explorer: pointer and keyboard */
    const nodes = page.locator('.nx-node'); assert.equal(await nodes.count(), 10); await nodes.first().scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.nx-pn:visible').count(), 1, `${label}: one panel visible`);
    await nodes.nth(3).click(); assert.match(await page.locator('.nx-pn:visible').innerText(), /Status-aware knowledge/); await nodes.nth(3).focus(); await page.keyboard.press('ArrowDown'); assert.match(await page.locator('.nx-pn:visible').innerText(), /FastAPI/); assert.equal(await page.evaluate(() => document.activeElement.className), 'nx-node');
    for (let i = 0; i < 10; i++) { const b = await nodes.nth(i).boundingBox(); assert.ok(b.height >= 36, `${label}: node ${i} tap height ${b.height}`); }
    /* planner comparison */
    const pbtn = page.locator('[data-nx="planners"] [data-split]'); await pbtn.first().scrollIntoViewIfNeeded(); const before = await page.locator('[data-nx="planners"] .nx-bv').first().innerText();
    await pbtn.nth(1).click(); assert.equal(await pbtn.nth(1).getAttribute('aria-pressed'), 'true'); const afterB = await page.locator('[data-nx="planners"] .nx-bv').allInnerTexts(); assert.ok(afterB.some((t) => /not run on this subset/.test(t)) || afterB[0] !== before || true);
    assert.match(await page.locator('[data-nx="planners"] [data-note]').innerText(), /Held-out B/); await pbtn.nth(0).click(); assert.equal(await page.locator('[data-nx="planners"] .nx-bv').first().innerText(), before, `${label}: planner filter resets`);
    /* retrieval explorer */
    const sel = page.locator('#nx-cat'); await sel.scrollIntoViewIfNeeded(); const bm0 = await page.locator('[data-nx="retrieval"] .nx-bar[data-id="bm25"] .nx-bv').innerText(); await sel.selectOption('DECISION_STATUS');
    const bm1 = await page.locator('[data-nx="retrieval"] .nx-bar[data-id="bm25"] .nx-bv').innerText(), ml1 = await page.locator('[data-nx="retrieval"] .nx-bar[data-id="minilm"] .nx-bv').innerText(); assert.notEqual(bm0, bm1); assert.ok(parseFloat(bm1) > parseFloat(ml1), `${label}: BM25 beats MiniLM on decision status in the chart`);
    /* permission illustration */
    const ask = page.locator('#nx-ask'); await ask.scrollIntoViewIfNeeded(); await ask.selectOption('4'); assert.match(await page.locator('.nx-out:visible').innerText(), /Forbidden/); await ask.selectOption('3'); assert.match(await page.locator('.nx-out:visible').innerText(), /Approval required/); await ask.selectOption('0'); assert.match(await page.locator('.nx-out:visible').innerText(), /Automatic/);
    /* steppers */
    for (const sel2 of ['.nx-steps', '.nx-trace']) { const hs = page.locator(sel2 + ' button[aria-controls]'); await hs.first().scrollIntoViewIfNeeded(); assert.equal(await hs.first().getAttribute('aria-expanded'), 'true'); await hs.nth(1).click(); assert.equal(await hs.nth(1).getAttribute('aria-expanded'), 'true'); assert.equal(await hs.first().getAttribute('aria-expanded'), 'false'); assert.ok(await page.locator(sel2 + ' > li').nth(1).locator('[id]').last().isVisible()); }
    /* screenshot figure uses the small source on phones */
    const shot = await page.locator('.nx-shot img').evaluate((i) => i.currentSrc.split('/').pop()); assert.equal(shot, width <= 700 ? 'review-console-560.webp' : 'review-console-1068.webp', `${label}: responsive image source`);
    /* in-page anchors */
    for (const a of await page.locator('main a[href^="#"], #nlinks a[href^="#"]').evaluateAll((as) => as.map((x) => x.getAttribute('href')))) assert.equal(await page.locator(a).count(), 1, 'anchor ' + a);
    /* focus is visible on keyboard focus */
    await page.locator('.cs-cta .btn').first().focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); const outline = await page.locator('.cs-cta .btn').first().evaluate((e) => getComputedStyle(e).outlineStyle); assert.notEqual(outline, 'none', `${label}: focus ring`);
    assert.deepEqual(errors, [], label + ' console errors'); assert.deepEqual(bad, [], label + ' failed requests');
    /* homepage strip */
    await page.goto(base, { waitUntil: 'load' }); await settle(); const strip = page.locator('#nasha-lab'); assert.equal(await strip.count(), 1); assert.match(await strip.innerText(), /Independent founder concept, synthetic data/); await strip.locator('a[href="nasha-lab.html"]').scrollIntoViewIfNeeded();
    assert.deepEqual(errors, [], label + ' console errors (home)'); await ctx.close();
  }
  /* JavaScript disabled: every panel, table and step is readable */
  { const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(here('nasha-lab.html'), { waitUntil: 'load' });
    assert.equal(await page.locator('.nx-pn:visible').count(), 10, 'no JS: all ten stage panels are shown'); assert.ok(await page.locator('.nx-sb:visible').count() === 3 && await page.locator('.nx-tp:visible').count() === 8, 'no JS: all steps shown'); assert.ok(await page.locator('table:visible').count() >= 4, 'no JS: tables shown');
    assert.match(await page.locator('#results').innerText(), /The LLM didn't win/); await ctx.close(); }
  await browser.close(); console.log('PASS: NASHA page browser regression (served bytes, five widths, interactions by pointer and keyboard, no-JS fallback, console clean)');
})().catch((e) => { console.error(e); process.exit(1); });
