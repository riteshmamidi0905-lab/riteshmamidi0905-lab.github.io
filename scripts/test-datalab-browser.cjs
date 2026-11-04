'use strict';
// Browser tests for the Data & Product Intelligence Lab page (Playwright + axe). Start a static server on 8000 first: npm run test:datalab. BROWSER=chromium|firefox|webkit
const pw = require('playwright'), { AxeBuilder } = require('@axe-core/playwright'), assert = require('assert/strict'), fs = require('fs');
const engine = process.env.BROWSER || 'chromium', BASE = 'http://127.0.0.1:8000/', report = { scope: engine + ' over local HTTP; data-lab.html', checks: [], axe: [], errors: [], external: [] };
const ok = (n, c, x) => { report.checks.push({ name: n, pass: !!c, extra: x }); assert.ok(c, n + (x ? ' ' + JSON.stringify(x) : '')); };
(async () => {
  const browser = await pw[engine].launch(engine === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
  const watch = p => { p.on('pageerror', e => report.errors.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') report.errors.push('console ' + m.text()); }); p.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) report.external.push(u); }); p.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); }); };
  try {
    for (const width of [1440, 820, 390, 320]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage(); watch(p);
      await p.goto(BASE + 'data-lab.html'); await p.locator('#sql-explorer').scrollIntoViewIfNeeded(); await p.waitForSelector('#q-panel h3');
      ok(`one h1 @${width}`, (await p.locator('h1').count()) === 1);
      ok(`no horizontal overflow @${width}`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
      const axe = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); report.axe.push({ width, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map(n => n.target) })) });
      await ctx.close();
    }
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true }), p = await ctx.newPage(); watch(p);
    await p.goto(BASE + 'data-lab.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.locator('#sql-explorer').scrollIntoViewIfNeeded(); await p.waitForSelector('#q-panel h3');
    const txt = () => p.locator('main').evaluate(e => e.textContent);
    let t = await txt();
    ok('status shows PASS WITH SKIPS, not plain PASS', /PASS WITH SKIPS/.test(t) && /12 tests were/.test(t));
    ok('twelve skipped tests listed with the reason', (await p.locator('table[aria-label], div[aria-label="Skipped analytics tests (scrollable)"] tbody tr').count()) >= 12 && /private answer keys not available \(kept private\)/.test(t));
    ok('states synthetic data and not production', /Every number comes from synthetic data/.test(t) && /none of this is production-deployed/.test(t));
    ok('states dbt and Airflow are not implemented', /Not implemented:<\/strong> dbt, Airflow|Not implemented: dbt, Airflow/.test(t));
    ok('no private answer-key content shown', !/solution\.sql|expected\.json/.test(t));
    ok('all 24 queries selectable', (await p.locator('#q-pick option').count()) === 24);
    await p.selectOption('#q-pick', 'Q09'); ok('Q09 shows cohort business question', /first seen in week c/.test(await p.locator('#q-panel').innerText()));
    ok('Q09 shows an executed result table', (await p.locator('#q-panel table tbody tr').count()) >= 10);
    await p.selectOption('#q-feat', 'recursive CTE'); ok('technique filter narrows to the recursive query', (await p.locator('#q-pick option').count()) === 1 && /Q15/.test(await p.locator('#q-pick').inputValue()));
    ok('SQL text is in a focusable scrollable region', (await p.locator('#q-panel .codebox[tabindex="0"][role="region"]').count()) === 1 && /RECURSIVE/i.test(await p.locator('#q-panel .codebox').innerText()));
    await p.selectOption('#q-feat', ''); await p.focus('#q-pick'); await p.keyboard.press('ArrowDown'); ok('query list changes from the keyboard', (await p.locator('#q-panel h3').innerText()).startsWith('Q'));
    ok('retention table has heat cells', (await p.locator('.heat').count()) > 10);
    ok('forecast and experiment charts have text alternatives', (await p.locator('svg.chart[role="img"][aria-label]').count()) >= 3);
    ok('reproducibility finding: 14 of 15 identical, not claimed byte-identical', /14 of 15 regenerated result files are byte-identical/.test(t) && /NOT demonstrated/.test(t));
    ok('demo panel empty before a session', /No Enterprise Demo orders in this browser yet/.test(await p.locator('#demo-live').innerText()));
    await p.goto(BASE + 'demo/index.html#/guide'); await p.waitForSelector('#view h1'); for (let i = 0; i < 2; i++) { await p.click('[data-act=guide-next]'); await p.waitForTimeout(120); }
    await p.goto(BASE + 'data-lab.html#arch'); await p.waitForSelector('#demo-live dl');
    ok('demo panel reads the real session (orders created)', /Orders created\s*1/.test((await p.locator('#demo-live').innerText()).replace(/\n/g, '')));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#demo-live button')]); const path = await dl.path(); const csv = fs.readFileSync(path, 'utf8');
    ok('session CSV has a header and one order', csv.split('\n')[0] === 'order_id,customer_id,status,payment,revenue_usd' && csv.trim().split('\n').length === 2, csv.slice(0, 120));
    await ctx.close();
  } catch (e) { report.failure = String(e.message || e).slice(0, 600); } finally { await browser.close(); }
  const viol = report.axe.reduce((n, x) => n + x.violations.length, 0);
  report.summary = { checks: report.checks.length, passed: report.checks.filter(c => c.pass).length, axeScans: report.axe.length, axeViolations: viol, consoleOrHttpErrors: report.errors.length, externalRequests: report.external.length, failure: report.failure || null };
  fs.mkdirSync('work', { recursive: true }); fs.writeFileSync(`work/datalab-browser-results-${engine}.json`, JSON.stringify(report, null, 1)); console.log(JSON.stringify(report.summary));
  if (report.failure || viol || report.errors.length || report.external.length) { if (viol) console.log(JSON.stringify(report.axe.filter(a => a.violations.length))); if (report.errors.length) console.log(report.errors.slice(0, 5)); process.exit(1); }
})();
