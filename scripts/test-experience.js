/* Browser tests for the cinematic layer: scenes, intro, lab demos, explainers, capture mode, reduced motion, overflow. */
'use strict';
const { chromium } = require('playwright'); const assert = require('node:assert/strict');
const { serveLocal, base } = require('./local-preview');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const newPage = async (opts, seen = true) => {
    const ctx = await browser.newContext(opts); if (seen) await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } });
    const page = await ctx.newPage(); const errors = [], bad = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await serveLocal(page); return { ctx, page, errors, bad };
  };
  const inked = (page, sel) => page.evaluate((s) => { const c = document.querySelector(s); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n; }, sel);
  const jump = (page, sel, f) => page.evaluate(([s, f]) => { document.documentElement.style.scrollBehavior = 'auto'; const e = document.querySelector(s), top = e.getBoundingClientRect().top + scrollY; scrollTo(0, top - 80 + Math.max(0, e.offsetHeight - innerHeight) * f); }, [sel, f]);

  for (const [label, width, height] of [['desktop', 1440, 900], ['tablet', 820, 1180], ['mobile', 390, 844], ['small-mobile', 320, 700]]) {
    const { ctx, page, errors, bad } = await newPage({ viewport: { width, height } });
    await page.goto(base, { waitUntil: 'load' }); await page.waitForFunction(() => window.__rm && window.__rm.worlds.length === 6);
    /* scenes draw real pixels and respond to step navigation */
    for (const id of ['agents', 'data', 'maref', 'product']) {
      await jump(page, '#world-' + id, 0.5); await page.waitForTimeout(700);
      assert.ok(await inked(page, `#world-${id} .world-canvas`) > 15, `${label}: ${id} scene is blank`);
      const want = await page.locator(`#world-${id} .world-nav button`).nth(1).getAttribute('aria-label');
      await page.locator(`#world-${id} .world-nav button`).nth(1).click({ force: true });
      await page.waitForFunction(([i]) => document.querySelector(`#world-${i}`).dataset.step === '1', [id], { timeout: 6000 }).catch(() => { throw new Error(`${label}: ${id} did not reach step 2 (${want})`); });
      assert.match(want, /Step 2 of/); assert.equal(await page.locator(`#world-${id} .world-nav button[aria-current=step]`).getAttribute('data-step'), '1');
    }
    await jump(page, '#hero', 0); await page.waitForTimeout(500); assert.ok(await inked(page, '#hero .world-canvas') > 15, label + ': hero blank');
    /* lab demos live inside the chapters they belong to */
    await jump(page, '#ai .demo', 0); await page.waitForSelector('#lab-agent .trace');
    for (let i = 0; i < 16; i++) await page.locator('#lab-agent button:has-text("Step")').click();
    assert.match(await page.locator('#lab-agent .ans').textContent(), /6\.214/, label + ': agent answer');
    await page.click('#tab-rag'); await page.click('#lab-rag button:has-text("Run the repo")'); assert.match(await page.locator('#lab-rag .kv', { hasText: 'hit rate' }).textContent(), /100%/, label + ': RAG hit rate');
    await jump(page, '#data .demo', 0); const p0 = await page.locator('#lab-stream .kv b').first().textContent(); await page.click('#lab-stream button:has-text("Start")'); await page.waitForTimeout(1500);
    assert.ok(+(await page.locator('#lab-stream .kv b').first().textContent()).replace(/,/g, '') > +p0.replace(/,/g, ''), label + ': stream produced events');
    await jump(page, '#maref .demo', 0); await page.waitForSelector('#lab-maref .chips'); await page.locator('#lab-maref .chips button', { hasText: 'Fluent but invented' }).click(); assert.match(await page.locator('#lab-maref .verdict').textContent(), /FAILED/, label + ': MAREF gate should fail');
    await jump(page, '#product .demo', 0); assert.match(await page.locator('#lab-experiment .verdict').textContent(), /INCONCLUSIVE|SHIP|KILL/);
    await page.click('#tab-funnel'); assert.match(await page.locator('#lab-funnel .kv').first().textContent(), /paying users/);
    /* layout */
    const ov = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src) }));
    assert.ok(ov.s <= ov.w + 1, `${label}: horizontal overflow ${ov.s} > ${ov.w}`); assert.deepEqual(ov.broken, []);
    assert.equal(errors.join(' | '), '', label + ' console errors'); assert.equal(bad.join(' | '), '', label + ' failed requests'); await ctx.close();
  }
  /* intro: shown once, skippable, not replayed */
  { const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, false); await page.goto(base); await page.waitForSelector('.rm-intro:not(.done)');
    assert.equal(await page.locator('.rm-intro').isVisible(), true); await page.click('.intro-skip'); await page.waitForSelector('.rm-intro.done', { state: 'attached' });
    await page.reload(); await page.waitForTimeout(500); assert.equal(await page.locator('.rm-intro').isVisible(), false, 'intro must not replay'); await ctx.close(); }
  /* reduced motion: no intro, no pinning, scenes still usable via step buttons */
  { const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, false); await page.goto(base); await page.waitForFunction(() => window.__rm);
    assert.equal(await page.locator('.rm-intro').isVisible(), false); assert.equal(await page.locator('.world.is-pinned').count(), 0);
    await page.locator('#world-agents .world-nav button').nth(3).scrollIntoViewIfNeeded(); await page.locator('#world-agents .world-nav button').nth(3).click();
    assert.match(await page.locator('#world-agents .cap-label').textContent(), /Retrieval/); assert.ok(await inked(page, '#world-agents .world-canvas') > 15, 'static frame drawn'); await ctx.close(); }
  /* capture mode */
  { const { ctx, page, errors } = await newPage({ viewport: { width: 1080, height: 1350 } }); await page.goto(base + '?capture=maref&step=3'); await page.waitForFunction(() => document.documentElement.dataset.captureReady === '1');
    assert.equal(await page.locator('#world-maref').isVisible(), true); assert.equal(await page.locator('#nav').isVisible(), false); assert.equal(await page.locator('#world-agents').isVisible(), false); assert.equal(errors.join(' | '), '', 'capture console errors'); await ctx.close(); }
  console.log('PASS: scenes, intro, in-chapter lab demos, capture mode, reduced motion, overflow at 4 viewports');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
