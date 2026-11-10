'use strict';
// Integration checks for the NASHA AI Universe inside the portfolio: node scripts/test-universe-integration.cjs <base url ending in />   BROWSER=chromium|firefox|webkit
const pw = require('playwright'), { AxeBuilder } = require('@axe-core/playwright');
const base = process.argv[2] || 'http://127.0.0.1:8000/', engine = process.env.BROWSER || 'chromium';
const launch = engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const results = [], check = (name, ok, extra) => { results.push({ name, ok: !!ok }); console.log(ok ? 'ok  ' : 'FAIL', name.slice(0, 90), ok || extra === undefined ? '' : JSON.stringify(extra).slice(0, 300)); };
(async () => {
  const b = await pw[engine].launch(launch), origin = new URL(base).origin;
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage(), errs = [], bad = [], foreign = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 160))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
    p.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) foreign.push(r.url()); }); p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto(base + 'index.html');
    check('home: the main navigation offers NASHA Universe, and the resume, experience, projects, GitHub, LinkedIn and email stay on the home page', await p.evaluate(() => { const h = s => document.querySelector(s); return !!h('nav#navigation a[href="nasha-universe/living-hq/index.html"]') && !!h('a[href$="ritesh_mamidi_resume.pdf"]') && !!h('#experience') && !!h('a[href^="https://github.com/"]') && !!h('a[href^="https://linkedin.com/"]') && !!h('a[href^="mailto:"]') && !!h('a[href="verified-projects.html"]'); }));
    check('home: the flagship section leads with a primary Enter button, states what is recorded and synthetic, and both screenshots load', await p.evaluate(async () => { const s = document.querySelector('#universe'); s.scrollIntoView(); await Promise.race([Promise.all([...s.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => i.addEventListener('load', r)))), new Promise(r => setTimeout(r, 10000))]); return !!s && /Replayed recordings, not a live system/.test(s.textContent) && /not an operating business/.test(s.textContent) && [...s.querySelectorAll('img')].length === 2 && [...s.querySelectorAll('img')].every(i => i.naturalWidth > 0 && i.alt.length > 30) && !!document.querySelector('.hero a.button.primary[href="nasha-universe/living-hq/index.html"]'); }));
    await p.click('.hero a.button.primary'); await p.waitForURL('**/nasha-universe/living-hq/index.html'); await p.waitForFunction(() => window.HQApp && window.HQApp.ready && window.HQApp.frames >= 1, null, { timeout: 30000 });
    check('universe: opens from the home page and loads its twelve agents', await p.evaluate(() => window.HQApp.A.data.agents.length === 12));
    await p.evaluate(async () => { window.HQApp.go('control', { noFocus: true }); await window.HQApp.loadRec('mission-f-surge-approved.json'); window.HQApp.seek(9999); });
    check('universe: a recording loads from the portfolio origin and its SHA-256 chain verifies in the browser', await p.evaluate(() => window.HQApp.A.verified && window.HQApp.A.verified.ok === true && window.HQApp.A.events.length === 88));
    check('universe: the atrium states plainly that the live model evaluation failed its acceptance criteria (the hashed disclosure rules scan every shipped file for the private terms)', await p.evaluate(async () => { await window.HQApp.go('atrium', { noFocus: true }); return /has not met its acceptance criteria \(failed\)/.test(document.body.innerText); }));
    check('universe: every request stayed on the portfolio origin and none failed', foreign.length === 0 && bad.length === 0 && errs.length === 0, { foreign, bad, errs });
    const hrefs = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h.startsWith('../')));
    check('universe: the header links back to the portfolio home and the recruiter summary', hrefs.includes('../../index.html') && hrefs.includes('../../recruiter.html'), hrefs);
    await p.evaluate(() => window.HQApp.go('tour', { noFocus: true })); const links = new Set(); for (let i = 1; i <= 9; i++) { await p.click(`#panel ol li:nth-child(${i}) button`); await p.waitForTimeout(150); (await p.evaluate(() => [...document.querySelectorAll('#tour-body a[href]')].map(a => a.getAttribute('href')))).forEach(h => links.add(h)); }
    const dead = []; for (const h of links) { if (h.startsWith('http')) continue; const u = new URL(h, p.url()).href; const r = await ctx.request.get(u); if (r.status() >= 400) dead.push(h + ' ' + r.status()); }
    check('universe: every link on the nine journey scenes resolves (external links excluded)', links.size >= 4 && dead.length === 0, dead);
    const ax = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze(); check('axe: no violations on the Universe inside the portfolio', ax.violations.length === 0, ax.violations.map(v => v.id));
    await p.click('a[href="../../index.html"]'); await p.waitForURL('**/index.html'); check('universe: Portfolio home returns to the home page', /Overview|NASHA Universe/.test(await p.textContent('nav#navigation')));
    await p.goto(base + 'recruiter.html'); check('recruiter page: links to the guided journey and still offers the resume and email', await p.evaluate(() => !!document.querySelector('a[href="nasha-universe/living-hq/index.html"]') && !!document.querySelector('a[href$="ritesh_mamidi_resume.pdf"]') && !!document.querySelector('a[href^="mailto:"]')));
    await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' }), p = await ctx.newPage();
    for (const u of ['index.html', 'nasha-universe/living-hq/index.html', 'recruiter.html']) { await p.goto(base + u); await p.waitForTimeout(500); check('mobile: no sideways scrolling on ' + u, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    await p.goto(base + 'index.html'); const ax = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze(); check('axe: no violations on the mobile home page with the flagship section', ax.violations.length === 0, ax.violations.map(v => v.id)); await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false }), p = await ctx.newPage(); await p.goto(base + 'nasha-universe/living-hq/index.html');
    check('without JavaScript: the Universe says so and offers the recruiter summary, which opens', /JavaScript is required/.test(await p.textContent('noscript, body')) && (await p.click('a[href="../../recruiter.html"]').then(() => true, () => false)) ); await ctx.close(); }
  await b.close(); const failed = results.filter(r => !r.ok);
  console.log(JSON.stringify({ engine, checks: results.length, failed: failed.length, failures: failed.map(f => f.name) })); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.log(JSON.stringify({ engine, crashed: String(e).slice(0, 400) })); process.exit(1); });
