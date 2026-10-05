/* axe (WCAG 2.0/2.1 A + AA) on: the page with reduced motion, the page with the lab demos mounted, and the open project dialog; plus the recruiter view. */
'use strict';
const { chromium } = require('playwright'), AxeBuilder = require('@axe-core/playwright').default, assert = require('node:assert/strict');
const { serveLocal, base } = require('./local-preview');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const scan = async (page, label) => { const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); console.log(JSON.stringify({ label, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 4).map((n) => n.target) })) })); assert.deepEqual(r.violations, [], label); };
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height: 1000 } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base);
    await scan(page, `reduced-motion ${width}`); await ctx.close();
  }
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } }); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('#ai .demo').scrollIntoView(); }); await page.waitForSelector('#lab-agent .trace');
    for (const t of ['#tab-rag', '#tab-funnel']) { await page.evaluate((t) => document.querySelector(t).scrollIntoView(), t); await page.click(t); await page.waitForTimeout(300); await scan(page, 'lab ' + t); }
    await page.evaluate(() => document.querySelector('#psearch').scrollIntoView()); await page.click('.pr-main[data-repo="llm-eval-framework"]'); await scan(page, 'project dialog open'); await ctx.close(); }
  { const ctx = await browser.newContext(); const page = await ctx.newPage(); await serveLocal(page); await page.goto(base.replace(/\/?$/, '/') + 'recruiter.html'); await scan(page, 'recruiter view'); await ctx.close(); }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
