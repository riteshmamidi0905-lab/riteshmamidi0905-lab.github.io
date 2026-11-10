'use strict';
// Browser tests for the Enterprise Demo (Playwright + axe, system Chrome via CHROMIUM_PATH). Run after starting a static server on port 8000: npm run test:demo
const pw = require('playwright'), engineName = process.env.BROWSER || 'chromium', chromium = pw[engineName], { AxeBuilder } = require('@axe-core/playwright'), assert = require('assert/strict'), fs = require('fs');
const BASE = 'http://127.0.0.1:8000/demo/', ROUTES = ['dashboard', 'guide', 'technical', 'sales', 'inventory', 'finance', 'departments', 'departments/finance', 'hr', 'marketing', 'support', 'bi', 'agents', 'governance', 'infra'];
const report = { scope: (process.env.BROWSER || 'chromium') + ' over local HTTP; Enterprise Demo only', checks: [], axe: [], errors: [], external: [] };
const ok = (name, cond, extra) => { report.checks.push({ name, pass: !!cond, extra }); assert.ok(cond, name + (extra ? ' ' + JSON.stringify(extra) : '')); };
(async () => {
  const browser = await chromium.launch(engineName === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
  const watch = page => { page.on('pageerror', e => report.errors.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error') report.errors.push('console ' + m.text()); }); page.on('request', r => { const u = r.url(); if (!u.startsWith('http://127.0.0.1:8000/') && !u.startsWith('data:')) report.external.push(u); }); page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); }); };
  const fresh = async (ctx) => { const p = await ctx.newPage(); watch(p); await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.goto(BASE + '#/dashboard'); await p.reload(); await p.waitForSelector('#view h1'); return p; };
  try {
    // responsive + accessibility on every module
    for (const width of [1440, 820, 390, 320]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }), p = await fresh(ctx);
      for (const r of ROUTES) {
        await p.goto(BASE + '#/' + r); await p.waitForSelector('#view h1');
        ok(`h1 count 1 on ${r} @${width}`, (await p.locator('h1').count()) === 1);
        ok(`no horizontal overflow on ${r} @${width}`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
        if ([1440, 390].includes(width) || r === 'dashboard') { const axe = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); report.axe.push({ route: r, width, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map(n => n.target) })) }); }
      }
      ok(`reduced motion honoured @${width}`, await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
      if (width <= 860) { await p.goto(BASE + '#/dashboard'); await p.waitForSelector('#view h1'); ok('menu button visible on small screens', await p.locator('#menu-btn').isVisible()); await p.click('#menu-btn'); ok('module list opens', await p.locator('#side').isVisible()); }
      await ctx.close();
    }
    // keyboard: skip link, tabbing, form activation
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }), p = await fresh(ctx);
      await p.keyboard.press(engineName === 'webkit' ? 'Alt+Tab' : 'Tab'); /* Safari/WebKit does not Tab to links or buttons by default; Option+Tab is the platform equivalent */ ok('first Tab reaches the skip link', await p.locator('.skip').evaluate(e => e === document.activeElement)); await p.keyboard.press('Enter'); ok('skip link moves focus to the main view', await p.locator('#view').evaluate(e => e === document.activeElement));
      await p.goto(BASE + '#/sales'); await p.waitForSelector('#view h1'); await p.fill('#q-wit', '1'); await p.focus('#q-wit'); await p.keyboard.press('Enter'); await p.waitForSelector('#toast:not([hidden])');
      ok('order can be submitted from the keyboard', /accepted/.test(await p.locator('#toast').innerText())); await ctx.close(); }
    // end-to-end workflow through the real UI
    { const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), p = await fresh(ctx); const kpi = async (label) => (await p.locator('.kpi', { hasText: label }).first().locator('.v').innerText());
      const ordersBefore = await kpi('Orders'), revBefore = await kpi('Booked revenue'); ok('seed orders KPI', ordersBefore === '92', ordersBefore);
      await p.goto(BASE + '#/sales'); await p.waitForSelector('#view h1'); await p.selectOption('#cust', 'C3'); await p.fill('#q-wings', '3'); ok('total updates live', (await p.locator('#total').innerText()) === '$42.00');
      await p.click('button[type=submit]'); await p.waitForSelector('#toast:not([hidden])'); ok('order accepted toast', /ORD-1001 accepted/.test(await p.locator('#toast').innerText()));
      ok('order appears in history', (await p.locator('table', { hasText: 'ORD-1001' }).count()) >= 1);
      await p.click('[data-act=replay]'); await p.waitForTimeout(100); ok('duplicate replay creates no second order', /Duplicate/.test(await p.locator('#toast').innerText()) && (await p.locator('td', { hasText: /^ORD-100\d$/ }).count()) === 1);
      await p.fill('#q-hefe', '25'); await p.click('button[type=submit]'); await p.waitForTimeout(100); ok('invalid quantity is refused with a message', /whole number from 1 to 20/.test(await p.locator('#toast').innerText()));
      await p.goto(BASE + '#/inventory'); await p.waitForSelector('#view h1'); ok('chicken is flagged LOW', (await p.locator('tr', { hasText: 'Chicken thigh' }).first().innerText()).includes('LOW')); ok('purchase request proposed, not ordered', (await p.locator('tr', { hasText: 'PUR-1' }).innerText()).includes('PROPOSED'));
      await p.goto(BASE + '#/governance'); await p.waitForSelector('#view h1'); ok('one approval pending', (await p.locator('.kpi', { hasText: 'Pending approvals' }).locator('.v').innerText()) === '1');
      await p.click('[data-act=approve]'); await p.waitForTimeout(100); ok('unauthorised role is refused', /may not decide/.test(await p.locator('#toast').innerText())); ok('refusal is in the audit log', (await p.locator('td', { hasText: 'ACTION_DENIED' }).count()) >= 1);
      await p.selectOption('#role', 'FINANCE_APPROVER'); await p.click('[data-act=approve]'); await p.waitForTimeout(100); ok('authorised approval accepted', /approved/.test(await p.locator('#toast').innerText()));
      await p.goto(BASE + '#/inventory'); await p.waitForSelector('#view h1'); await p.selectOption('#role', 'OPS_MANAGER'); await p.click('[data-act=receive]'); await p.waitForTimeout(100); ok('delivery received (simulated)', (await p.locator('tr', { hasText: 'PUR-1' }).innerText()).includes('RECEIVED'));
      await p.goto(BASE + '#/finance'); await p.waitForSelector('#view h1'); ok('finance shows receivables from the invoiced order', (await p.locator('tr', { hasText: 'Receivables outstanding' }).innerText()).includes('$'));
      await p.goto(BASE + '#/governance'); await p.waitForSelector('#view h1'); await p.click('[data-act=verify]'); ok('audit hash chain verifies in the UI', /verified/.test(await p.locator('.note.ok').first().innerText())); await p.click('[data-act=tamper]'); ok('tamper test detects the edit', /was detected/.test(await p.locator('.note.ok').first().innerText()));
      await p.goto(BASE + '#/dashboard'); await p.waitForSelector('#view h1'); ok('orders KPI increased by one', (await kpi('Orders')) === '93'); ok('revenue KPI changed', (await kpi('Booked revenue')) !== revBefore);
      await p.reload(); await p.waitForSelector('#view h1'); ok('state persists in local storage after reload', (await kpi('Orders')) === '93');
      await p.click('#reset-btn'); await p.waitForTimeout(150); ok('reset restores the deterministic seed', (await kpi('Orders')) === '92');
      // guided scenario drives real state
      await p.goto(BASE + '#/guide'); await p.waitForSelector('#view h1'); for (let i = 0; i < 8; i++) { await p.click('[data-act=guide-next]'); await p.waitForTimeout(120); }
      const g = await p.locator('#view').evaluate(e => e.textContent); ok('walkthrough: unauthorised attempt refused and logged', /Refused and logged: Decision on APR-1 denied/.test(g)); ok('walkthrough: low stock detected', /Chicken thigh: .* reorder point/.test(g)); ok('walkthrough: states what is implemented and simulated and not an AI model', /Implemented/.test(g) && /Simulated/.test(g) && /Not an AI model/.test(g)); ok('walkthrough: audit chain verified and consistent', /Hash chain: verified/.test(g) && /Consistency check: passed/.test(g)); ok('walkthrough: reaches the technical view link', (await p.locator('#view a[href="#/technical"]').count()) >= 1);
      await p.goto(BASE + '#/governance'); await p.waitForSelector('#view h1'); await p.click('[data-act=consistency]'); ok('guided scenario leaves a consistent state', /Consistency check passed/.test(await p.locator('.note.ok').first().innerText()));
      await ctx.close(); }
    // auto-play can be paused and stops on navigation
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }), p = await fresh(ctx);
      await p.goto(BASE + '#/guide'); await p.waitForSelector('#view h1'); await p.click('[data-act=guide-play]'); await p.waitForTimeout(300); ok('auto-play runs the first step immediately', /Step 2 of 8/.test(await p.locator('[role=status]').first().innerText()) || /Step 2 of 8/.test(await p.locator('#view').innerText()));
      ok('auto-play offers Pause', /Pause auto-play/.test(await p.locator('[data-act=guide-play]').innerText())); await p.click('[data-act=guide-play]'); await p.waitForTimeout(200); ok('auto-play pauses', /Auto-play/.test(await p.locator('[data-act=guide-play]').innerText()) && !/auto-playing/.test(await p.locator('#view').innerText()));
      await p.goto(BASE + '#/technical'); await p.waitForSelector('#view h1'); const tx = await p.locator('#view').innerText(); ok('technical view covers architecture, rules, approvals, audit, tests, limitations', ['State-engine architecture', 'Business rules', 'Approval logic', 'Audit design', 'Test coverage', 'Known limitations', 'Supporting engineering projects'].every(s => tx.includes(s)));
      ok('technical view links all six case studies', (await p.locator('#view a[href^="../case-"]').count()) >= 6); ok('technical view makes no production claim', /not production-validated/.test(tx)); await ctx.close(); }
    // agents and support
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }), p = await fresh(ctx);
      await p.goto(BASE + '#/agents'); await p.waitForSelector('#view h1'); ok('agents labelled rule-based and not an LLM', /No language model runs/.test(await p.locator('#view').innerText())); await p.click('[data-act=agent][data-id=compliance]'); await p.waitForTimeout(100); ok('agent run shows its mode', /rule-based demo/.test(await p.locator('.note.ok').first().innerText()));
      await p.goto(BASE + '#/support'); await p.waitForSelector('#view h1'); await p.fill('#ts', 'Possible allergy reaction'); await p.fill('#tb', 'Guest felt sick after eating'); await p.click('button[type=submit]'); await p.waitForTimeout(100); ok('safety ticket classified by rule', /SAFETY\/CRITICAL/.test(await p.locator('#toast').innerText())); ok('ticket has history', (await p.locator('details li', { hasText: 'CREATED' }).count()) === 1);
      await p.selectOption('#role', 'READ_ONLY'); await p.goto(BASE + '#/sales'); await p.waitForSelector('#view h1'); await p.fill('#q-hefe', '1'); await p.click('button[type=submit]'); await p.waitForTimeout(100); ok('read-only role cannot create orders', /may not perform ORDER_SUBMIT/.test(await p.locator('#toast').innerText()));
      await ctx.close(); }
  } catch (e) { report.failure = String(e.message || e).slice(0, 500); } finally { await browser.close(); }
  const viol = report.axe.reduce((n, x) => n + x.violations.length, 0);
  report.summary = { checks: report.checks.length, passed: report.checks.filter(c => c.pass).length, axeScans: report.axe.length, axeViolations: viol, consoleOrHttpErrors: report.errors.length, externalRequests: report.external.length, failure: report.failure || null };
  fs.mkdirSync('work', { recursive: true }); fs.writeFileSync('work/demo-browser-results.json', JSON.stringify(report, null, 1)); console.log(JSON.stringify(report.summary));
  if (report.failure || viol || report.errors.length || report.external.length) { if (viol) console.log(JSON.stringify(report.axe.filter(a => a.violations.length).slice(0, 6))); if (report.errors.length) console.log(report.errors.slice(0, 5)); process.exit(1); }
})();
