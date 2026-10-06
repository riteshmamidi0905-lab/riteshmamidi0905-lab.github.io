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
    if (width <= 1180) { await page.locator('#burger').click(); assert.equal(await page.locator('#burger').getAttribute('aria-expanded'), 'true'); await page.locator('#nlinks a[href="#evaluation"]').click(); assert.equal(await page.locator('#burger').getAttribute('aria-expanded'), 'false'); }
    /* flagship scene: step buttons drive the stage and caption, keyboard reachable */
    const flag = page.locator('#flag-llm-eval-framework'); await flag.scrollIntoViewIfNeeded();
    const before = await flag.locator('.cap-label').textContent();
    const tgt = (await flag.locator('.world-nav [aria-current=step]').getAttribute('data-step')) === '0' ? 1 : 0; await flag.locator('.world-nav [data-step]').nth(tgt).focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#flag-llm-eval-framework').dataset.step === '2' || true);
    await page.waitForTimeout(900);
    assert.notEqual(await flag.locator('.cap-label').textContent(), before); assert.equal(await flag.locator('.world-nav [data-step]').nth(tgt).getAttribute('aria-current'), 'step');
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
    if (lay.s > lay.w + 1) { const off = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => !e.closest('.hero,.world,.contact,.nl,dialog,table.lt') && e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0).slice(0, 8).map((e) => `${e.tagName}.${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || ''} right=${Math.round(e.getBoundingClientRect().right)}`)); assert.fail(`${label}: horizontal overflow ${lay.s} > ${lay.w}: ${off.join(' | ')}`); } assert.deepEqual(lay.broken, []);
    assert.deepEqual(errors, [], label + ' console errors'); assert.deepEqual(bad, [], label + ' failed requests');
    /* case-study page: no overflow, no console errors, no failed requests, readable tables */
    await page.goto(base.replace(/\/?$/, '/') + 'support-escalation-copilot.html', { waitUntil: 'load' });
    await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const cs = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src), rows: document.querySelectorAll('.ev-row').length, h1: document.querySelectorAll('h1').length }));
    if (cs.s > cs.w + 1) { const off = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => !e.closest('.world,dialog') && e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0).slice(0, 8).map((e) => `${e.tagName}.${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || ''} right=${Math.round(e.getBoundingClientRect().right)}`)); assert.fail(`${label}: case study overflows ${cs.s} > ${cs.w}: ${off.join(' | ')}`); }
    assert.deepEqual(cs.broken, []); assert.equal(cs.h1, 1); assert.ok(cs.rows >= 27, 'evidence table rendered');
    assert.deepEqual(errors, [], label + ' console errors (case study)'); assert.deepEqual(bad, [], label + ' failed requests (case study)');
    results.push({ label, width, overflow: false }); await ctx.close();
  }
  /* recruiter view */
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + 'recruiter.html');
    assert.match(await page.locator('h1').textContent(), /Ritesh Mamidi/); assert.equal(await page.locator('.proj > li').count(), FLAG.length + 2);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await ctx.close(); }
  /* keyboard: first Tab lands on the skip link */
  { const kb = await browser.newPage(); await serveLocal(kb); await kb.goto(base); await kb.keyboard.press('Tab'); assert.equal(await kb.locator('.skip').evaluate((el) => el === document.activeElement), true); await kb.close(); }
  console.log(JSON.stringify({ responsive: results, recruiterView: 'pass', keyboardSkip: 'pass' }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
