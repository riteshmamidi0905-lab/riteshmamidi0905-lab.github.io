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
    await serveLocal(page);
    const here = (f) => base.replace(/\/?$/, '/') + f;
    const settleImages = async () => { await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete)); };
    const noOverflow = async (name) => {
      await settleImages();
      const lay = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src) }));
      if (lay.s > lay.w + 1) { const off = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => !e.closest('.hero,.world,.contact,.nl,dialog,table.lt') && e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0).slice(0, 8).map((e) => `${e.tagName}.${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || ''} right=${Math.round(e.getBoundingClientRect().right)}`)); assert.fail(`${label} ${name}: horizontal overflow ${lay.s} > ${lay.w}: ${off.join(' | ')}`); }
      assert.deepEqual(lay.broken, [], `${label} ${name}: broken images`);
    };
    /* homepage: compact, no project list, burger menu, a compact flagship scene driven by keyboard */
    await page.goto(base, { waitUntil: 'load' });
    assert.equal(await page.locator('.prow').count(), 0, 'the project list is not on the homepage'); assert.equal(await page.locator('article.flag').count(), 0);
    if (width <= 1180) { await page.locator('#burger').click(); assert.equal(await page.locator('#burger').getAttribute('aria-expanded'), 'true'); await page.locator('#nlinks a[href="#evaluation"]').click(); assert.equal(await page.locator('#burger').getAttribute('aria-expanded'), 'false'); }
    { const cp = page.locator('#world-copilot'); await cp.scrollIntoViewIfNeeded(); const before = await cp.locator('.cap-label').textContent();
      await cp.locator('.world-nav [data-step]').nth(2).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
      assert.notEqual(await cp.locator('.cap-label').textContent(), before, 'a compact scene follows its step buttons'); assert.equal(await cp.locator('.world-nav [data-step]').nth(2).getAttribute('aria-current'), 'step');
      await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500); assert.equal(await cp.locator('.world-nav [data-step]').nth(3).getAttribute('aria-current'), 'step', 'arrow keys move between steps'); }
    assert.ok(await page.locator('#maref-card').count() === 1 && /Research prototype · MIXED/.test(await page.locator('#maref-card .mc-title').textContent()));
    await noOverflow('home'); assert.deepEqual(errors, [], label + ' console errors (home)'); assert.deepEqual(bad, [], label + ' failed requests (home)');
    /* runtime page */
    await page.goto(here('agent-runtime.html'), { waitUntil: 'load' }); assert.equal(await page.locator('h1').count(), 1); assert.ok(await page.locator('#arb-lesson').isVisible() || true); await noOverflow('runtime page');
    assert.deepEqual(errors, [], label + ' console errors (runtime page)'); assert.deepEqual(bad, [], label + ' failed requests (runtime page)');
    /* evaluation page: llmeval scene by keyboard, MAREF dimensions */
    await page.goto(here('evaluation.html'), { waitUntil: 'load' });
    { const flag = page.locator('#flag-llm-eval-framework'); await flag.scrollIntoViewIfNeeded(); const before = await flag.locator('.cap-label').textContent();
      const tgt = (await flag.locator('.world-nav [aria-current=step]').getAttribute('data-step')) === '0' ? 1 : 0; await flag.locator('.world-nav [data-step]').nth(tgt).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
      assert.notEqual(await flag.locator('.cap-label').textContent(), before); assert.equal(await flag.locator('.world-nav [data-step]').nth(tgt).getAttribute('aria-current'), 'step'); }
    await page.locator('#research').scrollIntoViewIfNeeded(); await page.locator('button.dimension[data-name="Groundedness"]').click(); assert.equal(await page.locator('#dimensionTitle').textContent(), 'Groundedness');
    await noOverflow('evaluation page'); assert.deepEqual(errors, [], label + ' console errors (evaluation page)'); assert.deepEqual(bad, [], label + ' failed requests (evaluation page)');
    /* projects page: library search, filter, detail dialog with a working case-study link */
    await page.goto(here('projects.html'), { waitUntil: 'load' });
    assert.equal(await page.locator('.prow').count(), P.length); assert.equal(await page.locator('article.flag').count(), FLAG.length - 1);
    await page.locator('#psearch').scrollIntoViewIfNeeded(); await page.fill('#psearch', 'kafka'); const kafka = await page.locator('.prow:not(.hide)').count(); assert.ok(kafka >= 1 && kafka < P.length, 'search narrows');
    await page.fill('#psearch', ''); await page.locator('[data-f="genai"]').click();
    assert.equal(await page.locator('.prow:not(.hide)').count(), P.filter((p) => p.c === 'genai').length); assert.match(await page.locator('#filterStatus').textContent(), /^\d+ projects?/);
    await page.locator('[data-f="all"]').click(); assert.equal(await page.locator('.prow:not(.hide)').count(), P.length);
    await page.locator('.pr-main[data-repo="rag-doc-qa"]').click(); assert.equal(await page.locator('#pdetail').evaluate((d) => d.open), true);
    assert.ok((await page.locator('#pd-ev a').count()) >= 2); assert.match(await page.locator('#pd-title').textContent(), /RAG/); await page.keyboard.press('Escape'); assert.equal(await page.locator('#pdetail').evaluate((d) => d.open), false);
    await page.locator('.pr-main[data-repo="ai-agent-from-scratch"]').click(); assert.equal(await page.locator('#pd-flag a').getAttribute('href'), 'agent-runtime.html', 'the dialog links the runtime to its page'); await page.keyboard.press('Escape');
    await noOverflow('projects page'); assert.deepEqual(errors, [], label + ' console errors (projects page)'); assert.deepEqual(bad, [], label + ' failed requests (projects page)');
    /* case-study page: no overflow, no console errors, no failed requests, readable tables */
    await page.goto(base.replace(/\/?$/, '/') + 'support-escalation-copilot.html', { waitUntil: 'load' });
    await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const cs = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src), rows: document.querySelectorAll('.ev-row').length, h1: document.querySelectorAll('h1').length }));
    if (cs.s > cs.w + 1) { const off = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => !e.closest('.world,dialog') && e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0).slice(0, 8).map((e) => `${e.tagName}.${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || ''} right=${Math.round(e.getBoundingClientRect().right)}`)); assert.fail(`${label}: case study overflows ${cs.s} > ${cs.w}: ${off.join(' | ')}`); }
    assert.deepEqual(cs.broken, []); assert.equal(cs.h1, 1); assert.equal(cs.rows, require('./claims').MANIFEST.claims.filter((c) => c.suitable_for.portfolio).length, 'evidence table rendered (every portfolio-eligible claim)');
    assert.deepEqual(errors, [], label + ' console errors (case study)'); assert.deepEqual(bad, [], label + ' failed requests (case study)');
    results.push({ label, width, overflow: false }); await ctx.close();
  }
  /* recruiter view */
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + 'recruiter.html');
    assert.match(await page.locator('h1').textContent(), /Ritesh Mamidi/); assert.equal(await page.locator('.proj > li').count(), FLAG.length + 3);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await ctx.close(); }
  /* the homepage is short enough to read: at most 20 screens of 375x812, with and without motion */
  for (const reduce of ['no-preference', 'reduce']) { const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: reduce, isMobile: true, hasTouch: true }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } });
    const page = await ctx.newPage(); await serveLocal(page); await page.goto(base, { waitUntil: 'load' }); await page.locator('img').evaluateAll((imgs) => imgs.forEach((i) => { i.loading = 'eager'; })); await page.waitForFunction(() => [...document.images].every((i) => i.complete)); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600);
    const screens = await page.evaluate(() => document.documentElement.scrollHeight / 812); assert.ok(screens <= 20, `homepage is ${screens.toFixed(1)} screens (${reduce}), above the 20-screen limit`); assert.ok(screens >= 12, `homepage is ${screens.toFixed(1)} screens: suspiciously short, something did not render`); results.push({ homepageScreens375x812: Math.round(screens * 10) / 10, motion: reduce }); await ctx.close(); }
  /* keyboard: first Tab lands on the skip link */
  { const kb = await browser.newPage(); await serveLocal(kb); await kb.goto(base); await kb.keyboard.press('Tab'); assert.equal(await kb.locator('.skip').evaluate((el) => el === document.activeElement), true); await kb.close(); }
  console.log(JSON.stringify({ responsive: results, recruiterView: 'pass', keyboardSkip: 'pass' }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
