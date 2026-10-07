/* axe (WCAG 2.0/2.1 A + AA) on: the homepage and the three deep pages with reduced motion, the homepage with a compact scene stepped, the projects page with the lab demos mounted and the project dialog open, the evaluation page with the playground; plus the recruiter view and the case study. */
'use strict';
const { chromium } = require('playwright'), AxeBuilder = require('@axe-core/playwright').default, assert = require('node:assert/strict');
const { serveLocal, base } = require('./local-preview');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const scan = async (page, label) => { const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); console.log(JSON.stringify({ label, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 4).map((n) => n.target) })) })); assert.deepEqual(r.violations, [], label); };
  const here = (f) => base.replace(/\/?$/, '/') + f;
  for (const f of ['', 'agent-runtime.html', 'evaluation.html', 'projects.html']) for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height: 1000 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(here(f));
    await scan(page, `${f || 'home'} reduced-motion ${width}`); await ctx.close();
  }
  /* the homepage with motion on: the compact scenes, after a step change and with every section revealed */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base);
    await page.locator('#world-copilot .world-nav button').nth(3).scrollIntoViewIfNeeded(); await page.locator('#world-copilot .world-nav button').nth(3).click(); await page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in'))); await page.waitForTimeout(1200); await scan(page, 'home, compact scene stepped'); await ctx.close(); }
  /* the projects page with the lab demos mounted, and the open project dialog */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(here('projects.html'));
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('#ai .demo').scrollIntoView(); }); await page.waitForSelector('#lab-agent .trace');
    for (const t of ['#tab-rag', '#tab-funnel']) { await page.evaluate((t) => document.querySelector(t).scrollIntoView(), t); await page.click(t); await page.waitForTimeout(300); await scan(page, 'lab ' + t); }
    await page.evaluate(() => document.querySelector('#psearch').scrollIntoView()); await page.click('.pr-main[data-repo="llm-eval-framework"]'); await scan(page, 'project dialog open'); await ctx.close(); }
  /* the evaluation page with the MAREF playground mounted */
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(here('evaluation.html'));
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('#maref .demo').scrollIntoView(); }); await page.waitForSelector('#lab-maref .chips'); await page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in'))); await page.waitForTimeout(1200); await scan(page, 'evaluation page, playground mounted'); await ctx.close(); }
  { const ctx = await browser.newContext(); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + 'recruiter.html'); await scan(page, 'recruiter view'); await ctx.close(); }
  /* the Copilot case study: reduced motion at two widths, then with the replay, a recorded check and the evidence filter exercised */
  for (const width of [1440, 390]) { const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height: 1000 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + 'support-escalation-copilot.html'); await scan(page, `case study reduced-motion ${width}`); await ctx.close(); }
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + 'support-escalation-copilot.html');
    await page.locator('.replay-pick button', { hasText: 'resync_no_approval' }).scrollIntoViewIfNeeded(); await page.locator('.replay-pick button', { hasText: 'resync_no_approval' }).click(); await page.waitForTimeout(2800);
    await page.locator('.ex-run').first().click(); await page.locator('.ev-ctl button[data-f="simulated"]').click(); await page.evaluate(() => document.querySelectorAll('.rv').forEach((e) => e.classList.add('in'))); await page.waitForTimeout(1200); /* reveal transitions finished: axe reads mid-fade opacity as low contrast */ await scan(page, 'case study, interacted'); await ctx.close(); }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
