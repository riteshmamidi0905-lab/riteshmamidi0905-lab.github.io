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

  /* lab demos load as their chapter nears the viewport and grow the page: wait for the layout to settle, then jump again */
  const settle = async (page, sel, f) => { let h = -1; for (let i = 0; i < 14; i++) { const n = await page.evaluate(() => document.documentElement.scrollHeight); if (n === h) break; h = n; await page.waitForTimeout(500); } await jump(page, sel, f); await page.waitForTimeout(300); };
  for (const [label, width, height] of [['desktop', 1440, 900], ['tablet', 820, 1180], ['mobile', 390, 844], ['small-mobile', 320, 700]]) {
    const { ctx, page, errors, bad } = await newPage({ viewport: { width, height } });
    await page.goto(base, { waitUntil: 'load' }); await page.waitForFunction(() => window.__rm && window.__rm.worlds.length === 14);
    /* the lab demos mount once, when the first one nears the viewport, and grow the page; mount them first so scene positions stay put */
    await jump(page, '#ai .demo', 0); await page.waitForSelector('#lab-agent .trace'); await settle(page, '#ai .demo', 0);
    /* scenes draw real pixels and respond to step navigation */
    for (const id of ['world-copilot', 'world-agents', 'world-runtime', 'world-data', 'world-maref', 'world-product', ...['realtime-streaming-pipeline', 'spark-data-lakehouse', 'llm-eval-framework', 'genai-doc-assistant', 'mlops-platform', 'experimentation-toolkit'].map((r) => 'flag-' + r)]) {
      await jump(page, '#' + id, 0.5); await page.waitForTimeout(1500); await settle(page, '#' + id, 0.5);
      assert.ok(await inked(page, `#${id} .world-canvas`) > 15, `${label}: ${id} scene is blank`);
      const want = await page.locator(`#${id} .world-nav button`).nth(1).getAttribute('aria-label');
      await page.locator(`#${id} .world-nav button`).nth(1).click({ force: true });
      await page.waitForFunction(([i]) => document.querySelector(`#${i}`).dataset.step === '1', [id], { timeout: 6000 }).catch(() => { throw new Error(`${label}: ${id} did not reach step 2 (${want})`); });
      assert.match(want, /Step 2 of/); assert.equal(await page.locator(`#${id} .world-nav button[aria-current=step]`).getAttribute('data-step'), '1');
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
  /* the Copilot case-study page: scene, attack replay, recorded draft checks, evidence filter, keyboard */
  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const { ctx, page, errors, bad } = await newPage({ viewport: { width, height } }); const url = base.replace(/\/?$/, '/') + 'support-escalation-copilot.html';
    await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction(() => window.__rm && window.__rm.worlds.length === 1);
    await jump(page, '#world-copilot', 0.5); await page.waitForTimeout(1500); assert.ok(await inked(page, '#world-copilot .world-canvas') > 15, label + ': case-study scene blank');
    for (let i = 1; i < 10; i++) { await page.locator('#world-copilot .world-nav button').nth(i).click({ force: true }); await page.waitForFunction(([n]) => document.querySelector('#world-copilot').dataset.step === String(n), [i], { timeout: 6000 }); }
    assert.match(await page.locator('#world-copilot .cap-label').textContent(), /Audit/); assert.equal((await page.locator('#world-copilot .cap-ev').textContent()).trim(), 'Verified'); assert.equal(await page.locator('#world-copilot .cap-ev').isVisible(), true);
    await page.locator('#world-copilot .world-nav button').nth(4).click({ force: true }); await page.waitForFunction(() => document.querySelector('#world-copilot').dataset.step === '4'); assert.equal((await page.locator('#world-copilot .cap-ev').textContent()).trim(), 'Simulated');
    await jump(page, '#attack', 0.1); assert.equal(await page.locator('#replay').isVisible(), true, label + ': replay enabled with JS');
    await page.locator('.replay-pick button', { hasText: 'execute_sql' }).click(); await page.waitForFunction(() => document.querySelectorAll('.replay-lanes li.on').length === 4, null, { timeout: 5000 });
    assert.match(await page.locator('.replay-lanes [data-k=layer] b').textContent(), /trust boundary/); assert.match(await page.locator('.replay-lanes [data-k=end] b').textContent(), /REVIEW/);
    assert.equal(await page.locator('.replay-pick button[aria-pressed=true]').textContent(), 'execute_sql');
    await page.locator('.ex-run').nth(1).scrollIntoViewIfNeeded(); await page.locator('.ex-run').nth(1).click(); assert.equal(await page.locator('.ex-run').nth(1).getAttribute('aria-expanded'), 'true'); assert.match(await page.locator('.cp-examples li').nth(1).locator('.ex-res').textContent(), /Not flagged/);
    await page.locator('.ev-ctl button[data-f="limitation"]').scrollIntoViewIfNeeded(); await page.locator('.ev-ctl button[data-f="limitation"]').click(); assert.equal(await page.locator('.ev-row:not([hidden])').count(), 7); assert.match(await page.locator('#ev-status').textContent(), /7 of 27/);
    assert.equal(await page.locator('.ev-row:not([hidden]) .ev-limitation').count(), 7); await page.locator('.ev-ctl button[data-f="all"]').click(); assert.equal(await page.locator('.ev-row:not([hidden])').count(), 27);
    const ov = await page.evaluate(() => ({ w: innerWidth, s: document.documentElement.scrollWidth })); assert.ok(ov.s <= ov.w + 1, `${label}: case study overflow ${ov.s} > ${ov.w}`);
    assert.equal(errors.join(' | '), '', label + ' console errors (case study)'); assert.equal(bad.join(' | '), '', label + ' failed requests (case study)'); await ctx.close();
  }
  /* reduced motion on the case study: static frame, no pinning, replay shows its final state immediately */
  { const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, false); await page.goto(base.replace(/\/?$/, '/') + 'support-escalation-copilot.html'); await page.waitForFunction(() => window.__rm);
    assert.equal(await page.locator('.world.is-pinned').count(), 0); await page.locator('#world-copilot .world-nav button').nth(5).scrollIntoViewIfNeeded(); await page.evaluate(() => window.__rm.worlds.find((w) => w.id === 'copilot').ready); await page.locator('#world-copilot .world-nav button').nth(5).click();
    assert.match(await page.locator('#world-copilot .cap-label').textContent(), /Typed action/); assert.ok(await inked(page, '#world-copilot .world-canvas') > 15, 'static copilot frame drawn');
    await page.locator('.replay-pick button', { hasText: 'send_email' }).scrollIntoViewIfNeeded(); await page.locator('.replay-pick button', { hasText: 'send_email' }).click(); assert.equal(await page.locator('.replay-lanes li.on').count(), 4, 'replay jumps to its end state'); await ctx.close(); }
  /* intro: shown once, skippable, not replayed */
  { const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, false); await page.goto(base); await page.waitForSelector('.rm-intro:not(.done)');
    assert.equal(await page.locator('.rm-intro').isVisible(), true); await page.click('.intro-skip'); await page.waitForSelector('.rm-intro.done', { state: 'attached' });
    await page.reload(); await page.waitForTimeout(500); assert.equal(await page.locator('.rm-intro').isVisible(), false, 'intro must not replay'); await ctx.close(); }
  /* reduced motion: no intro, no pinning, scenes still usable via step buttons */
  { const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, false); await page.goto(base); await page.waitForFunction(() => window.__rm);
    assert.equal(await page.locator('.rm-intro').isVisible(), false); assert.equal(await page.locator('.world.is-pinned').count(), 0);
    await page.locator('#world-agents .world-nav button').nth(3).scrollIntoViewIfNeeded(); await page.evaluate(() => window.__rm.worlds.find((w) => w.id === 'agents').ready); /* the scene loads as it nears the viewport and then shows its static frame */ await page.locator('#world-agents .world-nav button').nth(3).click();
    assert.match(await page.locator('#world-agents .cap-label').textContent(), /Retrieval/); assert.ok(await inked(page, '#world-agents .world-canvas') > 15, 'static frame drawn'); await ctx.close(); }
  /* capture mode */
  { const { ctx, page, errors } = await newPage({ viewport: { width: 1080, height: 1350 } }); await page.goto(base + '?capture=maref&step=3'); await page.waitForFunction(() => document.documentElement.dataset.captureReady === '1');
    assert.equal(await page.locator('#world-maref').isVisible(), true); assert.equal(await page.locator('#nav').isVisible(), false); assert.equal(await page.locator('#world-agents').isVisible(), false); assert.equal(errors.join(' | '), '', 'capture console errors'); await ctx.close(); }
  console.log('PASS: scenes, intro, in-chapter lab demos, capture mode, reduced motion, overflow at 4 viewports');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
