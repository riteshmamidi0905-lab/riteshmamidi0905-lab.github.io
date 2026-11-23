'use strict';
// Integration checks for the NASHA AI Universe inside the portfolio: node scripts/test-universe-integration.cjs <base url ending in />   BROWSER=chromium|firefox|webkit
const pw = require('playwright'), { AxeBuilder } = require('@axe-core/playwright');
const base = process.argv[2] || 'http://127.0.0.1:8000/', engine = process.env.BROWSER || 'chromium';
const launch = engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const { createHash } = require('node:crypto');
const results = [], check = (name, ok, extra) => { results.push({ name, ok: !!ok }); console.log(ok ? 'ok  ' : 'FAIL', name.slice(0, 90), ok || extra === undefined ? '' : JSON.stringify(extra).slice(0, 300)); };
(async () => {
  const b = await pw[engine].launch(launch), origin = new URL(base).origin;
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage(), errs = [], bad = [], foreign = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 160))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
    p.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) foreign.push(r.url()); }); p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto(base + 'index.html');
    check('portfolio navigation and direct recruiter, résumé and contact paths', await p.evaluate(() => [...document.querySelectorAll('nav#navigation a')].map(x=>x.textContent).join('|')==='Home|NASHA|Simulator|Projects|Skills|Case studies|Recruiters|Résumé' && ['a[href="recruiter.html#resumes"]','a[href="projects.html"]','a[href^="https://github.com/"]','a[href^="https://linkedin.com/"]','a[href^="mailto:"]'].every(s=>document.querySelector(s))));
    check('home: current routes and labeled, decoded arrival art', await p.evaluate(async()=>{const art=document.querySelector('.entry img');await art.decode();return art.naturalWidth>0 && /AI-generated concept art/.test(document.querySelector('.entry').textContent) && document.querySelectorAll('.entry-paths a').length===4;}));
    await p.getByRole('link',{name:'Enter NASHA',exact:true}).click();await p.waitForURL('**/pavilion/index.html');check('arrival labels its concept art and has a simulator',await p.getByRole('link',{name:'Simulate your idea'}).count()===1);await p.goto(base+'case-nasha-ai-lab-architecture.html#archive');await p.getByRole('link',{name:'Living HQ and verified recordings'}).click();await p.waitForFunction(()=>window.HQApp&&window.HQApp.ready&&window.HQApp.frames>=1,null,{timeout:30000});
    check('universe: opens from its archived case study and loads its twelve agents', await p.evaluate(() => window.HQApp.A.data.agents.length === 12));
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
    await p.click('a[href="../../index.html"]'); await p.waitForURL('**/index.html'); check('universe: Portfolio home returns to the home page', /Home.*NASHA/.test(await p.textContent('nav#navigation')));
    await p.goto(base + 'recruiter.html');
    check('recruiter page: guided journey and contact links', await p.evaluate(() => !!document.querySelector('a[href="pavilion/index.html"]') && !!document.querySelector('a[href^="mailto:"]')));
    const professional = new URL('/ritesh_mamidi_resume.pdf', base).href;
    for (const name of [/^Download résumé/, 'Professional résumé (PDF)']) {
      const link = p.getByRole('link', { name, exact: typeof name === 'string' });
      check('main résumé action resolves to the designed file: ' + name, await link.count() === 1 && await link.evaluate(a => a.href) === professional);
    }
    const pdfResponse = await ctx.request.get(professional);
    const pdfBytes = await pdfResponse.body();
    check('both professional actions serve the owner-approved designed résumé', pdfResponse.status() === 200 && pdfBytes.length === 97071 && createHash('sha256').update(pdfBytes).digest('hex') === 'eb706d9dfd93e914b506eb52e783ab30505136630818ca2fd80dfa82f3972d92');
    const roleLinks = await p.locator('#resumes a[href^="resumes/"]').evaluateAll(links => links.map(a => a.pathname).sort());
    check('all three role-specific downloads remain available from résumé choices', JSON.stringify(roleLinks) === JSON.stringify(['/resumes/Ritesh-Mamidi-AI-Solutions-Engineer.pdf', '/resumes/Ritesh-Mamidi-Applied-AI-Engineer.pdf', '/resumes/Ritesh-Mamidi-FDE.pdf']));
    await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' }), p = await ctx.newPage();
    for (const u of ['index.html', 'pavilion/hq.html','nasha-universe/living-hq/archive.html','recruiter.html']) { await p.goto(base + u); await p.waitForTimeout(500); check('mobile: no sideways scrolling on ' + u, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    await p.goto(base + 'index.html'); const ax = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze(); check('axe: no violations on the mobile home page with the flagship section', ax.violations.length === 0, ax.violations.map(v => v.id)); await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false }), p = await ctx.newPage(); await p.goto(base + 'nasha-universe/living-hq/archive.html');
    check('without JavaScript: the Universe says so and offers the recruiter summary, which opens', /JavaScript is required/.test(await p.textContent('noscript, body')) && (await p.click('a[href="../../recruiter.html"]').then(() => true, () => false)) ); await ctx.close(); }
  {
    const ctx = await b.newContext();
    const page = await ctx.newPage();
    let startEngine;
    const allowEngine = new Promise(resolve => { startEngine = resolve; });
    let requests = 0;
    await page.route('**/pavilion/app.js', async route => {
      requests++;
      await allowEngine;
      await route.continue();
    });
    await page.goto(base + 'pavilion/ops.html', {waitUntil: 'networkidle'});
    check('the initial Agent Ops console can be read before the replay engine starts', requests === 0 && await page.locator('#queue').isVisible());
    await page.locator('#compare input[name=staffCount]').fill('2');
    await page.locator('#compare button').press('Enter');
    startEngine();
    await page.locator('#delta table').first().waitFor();
    check('a first keyboard submission during loading runs the staffing comparison once', requests === 1 && await page.locator('#compare input[name=staffCount]').inputValue() === '2');
    await page.goto(base + 'pavilion/ops.html?day=2');
    await page.waitForFunction(() => typeof document.querySelector('#compare')?.onsubmit === 'function');
    check('an Agent Ops replay URL activates its own day immediately', requests === 2);
    await ctx.close();
  }
  await b.close(); const failed = results.filter(r => !r.ok);
  console.log(JSON.stringify({ engine, checks: results.length, failed: failed.length, failures: failed.map(f => f.name) })); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.log(JSON.stringify({ engine, crashed: String(e).slice(0, 400) })); process.exit(1); });
