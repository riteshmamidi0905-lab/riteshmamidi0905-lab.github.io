/* Browser regression test for the page system; run with an HTTP server on PORT (default 8000). */
'use strict';
const { chromium } = require('playwright'); const assert = require('node:assert/strict');
const { serveLocal, base } = require('./local-preview'); const { P, FLAG } = require('../data');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const results = [];
  for (const [label, width, height] of [['desktop', 1440, 1000], ['laptop', 1180, 760], ['tablet', 820, 1180], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
    const ctx = await browser.newContext({ viewport: { width, height } }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } });
    const page = await ctx.newPage(); const errors = [], bad = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await serveLocal(page); await page.goto(base, { waitUntil: 'load' });
    assert.equal(await page.locator('.prow').count(), P.length); assert.equal(await page.locator('article.flag').count(), FLAG.length);
    /* nav */
    if (width <= 1180) { await page.locator('#burger').click(); assert.equal(await page.locator('#burger').getAttribute('aria-expanded'), 'true'); await page.locator('#nlinks a[href="#maref"]').click(); assert.equal(await page.locator('#burger').getAttribute('aria-expanded'), 'false'); }
    /* architecture explorer: the diagram is interactive and keyboard reachable */
    const flag = page.locator('#flag-llm-eval-framework'); await flag.scrollIntoViewIfNeeded();
    const svg = flag.locator(`.arch-svg.${width <= 860 ? 'v' : 'h'}`); const before = await flag.locator('.arch-detail span').textContent();
    await svg.locator('.an').nth(2).focus(); await page.keyboard.press('Enter');
    assert.notEqual(await flag.locator('.arch-detail span').textContent(), before); assert.equal(await svg.locator('.an').nth(2).getAttribute('aria-pressed'), 'true');
    /* MAREF dimensions */
    await page.locator('#research').scrollIntoViewIfNeeded(); await page.locator('button.dimension[data-name="Groundedness"]').click();
    assert.equal(await page.locator('#dimensionTitle').textContent(), 'Groundedness');
    /* library: search, filter, detail dialog */
    await page.locator('#psearch').scrollIntoViewIfNeeded(); await page.fill('#psearch', 'kafka'); const kafka = await page.locator('.prow:not(.hide)').count(); assert.ok(kafka >= 1 && kafka < P.length, 'search narrows');
    await page.fill('#psearch', ''); await page.locator('[data-f="genai"]').click();
    assert.equal(await page.locator('.prow:not(.hide)').count(), P.filter((p) => p.c === 'genai').length); assert.match(await page.locator('#filterStatus').textContent(), /^\d+ projects?/);
    await page.locator('[data-f="all"]').click(); assert.equal(await page.locator('.prow:not(.hide)').count(), P.length);
    await page.locator('.pr-main[data-repo="rag-doc-qa"]').click(); assert.equal(await page.locator('#pdetail').evaluate((d) => d.open), true);
    assert.ok((await page.locator('#pd-ev a').count()) >= 2); assert.match(await page.locator('#pd-title').textContent(), /RAG/); await page.keyboard.press('Escape'); assert.equal(await page.locator('#pdetail').evaluate((d) => d.open), false);
    /* layout + assets */
    await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const lay = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src) }));
    assert.ok(lay.s <= lay.w + 1, `${label}: horizontal overflow ${lay.s} > ${lay.w}`); assert.deepEqual(lay.broken, []);
    assert.deepEqual(errors, [], label + ' console errors'); assert.deepEqual(bad, [], label + ' failed requests');
    results.push({ label, width, overflow: false }); await ctx.close();
  }
  /* recruiter view */
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + 'recruiter.html');
    assert.match(await page.locator('h1').textContent(), /Ritesh Mamidi/); assert.equal(await page.locator('.proj > li').count(), FLAG.length);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await ctx.close(); }
  /* keyboard: first Tab lands on the skip link */
  { const kb = await browser.newPage(); await serveLocal(kb); await kb.goto(base); await kb.keyboard.press('Tab'); assert.equal(await kb.locator('.skip').evaluate((el) => el === document.activeElement), true); await kb.close(); }
  console.log(JSON.stringify({ responsive: results, recruiterView: 'pass', keyboardSkip: 'pass' }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
