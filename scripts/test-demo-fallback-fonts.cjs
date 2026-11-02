'use strict';
// Regression test for font-dependent layout in the Enterprise Demo. The demo asks for Inter but ships no web font, so every browser uses a
// platform fallback whose width differs (macOS system font, Ubuntu DejaVu/Liberation, Windows Segoe). Defects that only appear at some text
// widths (a table label leaking out of its scroll wrapper, a link that wraps onto a line below a button) pass on one machine and fail on another.
// This test therefore re-runs every route at five viewport widths under several deterministic text-width variants and checks, with the
// same axe rule the main suite uses (target-size, WCAG 2.5.8), that there is no horizontal page overflow and no undersized target.
//   BROWSER=chromium|firefox|webkit  (default chromium)      DEMO_BASE=http://127.0.0.1:8000/demo/
//   FONT_FILE=/path/to/font.ttf       optional: also run a variant that forces that real font (for example DejaVu Sans)
//   FONT_VARIANTS=system,monospace     optional: run only variants whose name starts with one of these
//   FONT_TEST_REPORT=/path/report.json  optional: write every measurement (computed font family, platform font, dimensions)
const pw = require('playwright'), engineName = process.env.BROWSER || 'chromium', engine = pw[engineName], { AxeBuilder } = require('@axe-core/playwright'), fs = require('fs');
const BASE = process.env.DEMO_BASE || 'http://127.0.0.1:8000/demo/';
const ROUTES = ['dashboard', 'guide', 'technical', 'sales', 'inventory', 'finance', 'departments', 'departments/finance', 'hr', 'marketing', 'support', 'bi', 'agents', 'governance', 'infra'];
const WIDTHS = [320, 375, 390, 768, 1440];
const VARIANTS = [
  { name: 'system', css: '' },
  { name: 'monospace', css: 'html,body,body *{font-family:monospace !important}' },
  { name: 'tracking+0.04em', css: '*{letter-spacing:.04em !important}' },
  { name: 'tracking+0.08em', css: '*{letter-spacing:.08em !important}' },
];
if (process.env.FONT_FILE) {
  const face = '@font-face{font-family:RegressionFont;src:url(/__regression-font)}html,body,body *{font-family:RegressionFont,sans-serif !important}', name = require('path').basename(process.env.FONT_FILE);
  VARIANTS.push({ name: 'font-file:' + name, css: face, file: process.env.FONT_FILE }, { name: 'font-file+0.08em:' + name, css: face + '*{letter-spacing:.08em !important}', file: process.env.FONT_FILE });
}
// closing can hang in headless WebKit when many pages were opened; never let that block the run
const safeClose = x => Promise.race([Promise.resolve().then(() => x.close()).catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
if (process.env.FONT_VARIANTS) { const keep = process.env.FONT_VARIANTS.split(','); for (let i = VARIANTS.length - 1; i >= 0; i--) if (!keep.some(k => VARIANTS[i].name.startsWith(k))) VARIANTS.splice(i, 1); }   // optional: run a subset (comma-separated name prefixes)
const report = { engine: engineName, base: BASE, cases: 0, failures: [], fonts: [], samples: [] };
(async () => {
  const launch = () => engine.launch(engineName === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
  let browser = null;   // a fresh browser per variant: WebKit stalls when many contexts are opened and closed in one process
  try {
    for (const v of VARIANTS) {
      // one context per variant, resized between widths (fewer browser processes than a context per width)
      browser = await launch();
      const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 }, reducedMotion: 'reduce' });
      if (v.file) { const body = fs.readFileSync(v.file); await ctx.route('**/__regression-font', r => r.fulfill({ body, contentType: 'font/ttf' })); }
      const p = await ctx.newPage();
      await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.goto(BASE + '#/dashboard'); await p.reload(); await p.waitForSelector('#view h1');
      if (v.css) await p.addStyleTag({ content: v.css });
      await p.evaluate(() => document.fonts.ready);
      for (const width of WIDTHS) {
        if (process.env.FONT_TEST_VERBOSE) console.error(`start ${v.name} @${width}`);
        await p.setViewportSize({ width, height: 900 }); await p.waitForTimeout(80);
        for (const r of ROUTES) {
          if (process.env.FONT_TEST_VERBOSE) console.error(`  route ${r}`);
          await p.goto(BASE + '#/' + r); await p.waitForSelector('#view h1'); await p.waitForTimeout(60);
          const m = await p.evaluate(() => {
            const tw = [...document.querySelectorAll('.tw')].map(w => ({ client: w.clientWidth, scroll: w.scrollWidth, table: w.querySelector('table') ? Math.round(w.querySelector('table').getBoundingClientRect().width) : 0 }));
            return { family: getComputedStyle(document.querySelector('#view p, #view h1')).fontFamily, scrollWidth: document.documentElement.scrollWidth, innerWidth, tw };
          });
          const axe = await new AxeBuilder({ page: p }).withRules(['target-size']).analyze();
          const targets = axe.violations.flatMap(x => x.nodes.map(n => n.target.join(' ')));
          const smallLinks = await p.evaluate(() => [...document.querySelectorAll('#view button ~ a')].filter(a => a.getClientRects().length).map(a => ({ link: a.textContent.slice(0, 40), minLineHeightPx: Math.min(...[...a.getClientRects()].map(r => Math.round(r.height * 10) / 10)) })).filter(x => x.minLineHeightPx < 24));
          report.cases++;
          const here = `${v.name} ${r} @${width}`;
          if (m.scrollWidth > m.innerWidth) report.failures.push({ case: here, kind: 'horizontal-page-overflow', scrollWidth: m.scrollWidth, innerWidth: m.innerWidth, overflowPx: m.scrollWidth - m.innerWidth, family: m.family });
          if (targets.length) report.failures.push({ case: here, kind: 'target-size', targets, family: m.family });
          if (smallLinks.length) report.failures.push({ case: here, kind: 'link-after-button-under-24px', links: smallLinks.slice(0, 3), count: smallLinks.length });
          // a wide table must stay inside its own scroll wrapper, which must still be able to scroll
          for (const t of m.tw) if (t.table > t.client && t.scroll < t.table) report.failures.push({ case: here, kind: 'table-clipped-without-scroll', ...t });
          if (r === 'sales' && [320, 375].includes(width)) report.samples.push({ variant: v.name, width, family: m.family, scrollWidth: m.scrollWidth, innerWidth: m.innerWidth, tw: m.tw });
          if (r === 'sales') {
            // visually hidden labels must stay associated with their inputs, and the scroll wrapper must stay keyboard-operable
            const assoc = await p.evaluate(() => [...document.querySelectorAll('label.sr[for]')].map(l => { const i = document.getElementById(l.htmlFor); return !!(i && i.labels && i.labels[0] === l && l.textContent.trim()); }));
            if (!assoc.length || assoc.includes(false)) report.failures.push({ case: here, kind: 'hidden-label-association-broken', labels: assoc.length });
            if (m.tw.length && m.tw[0].scroll > m.tw[0].client) {
              // Headless WebKit ignores arrow keys on every focused scroller (checked on a bare page: ArrowDown does not scroll a focused vertical one either),
              // so there the key press is not asserted; focusability and real scrollability still are.
              const st = await p.evaluate(() => { const w = document.querySelector('.tw'); w.scrollLeft = 0; w.focus(); const focused = w === document.activeElement; w.scrollLeft = 40; const programmatic = w.scrollLeft; w.scrollLeft = 0; return { focused, programmatic }; });
              let left = null;
              if (engineName !== 'webkit') { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(60); left = await p.evaluate(() => document.querySelector('.tw').scrollLeft); }
              if (!st.focused || st.programmatic <= 0 || (left !== null && left <= 0)) report.failures.push({ case: here, kind: 'scroll-wrapper-not-operable', ...st, keyboardScrollLeft: left });
            }
          }
        }
        // Shared header: the Demo role select. Its longest option ("Owner (all demo permissions)") must stay fully visible and inside the page,
        // the label must stack above it on narrow screens, its name and description must survive, and the keyboard must still change the role.
        await p.goto(BASE + '#/dashboard'); await p.waitForSelector('#view h1'); await p.waitForTimeout(60);
        const hdr = await p.evaluate(() => {
          const s = document.getElementById('role'), l = s.labels && s.labels[0], c = s.getBoundingClientRect(), vw = document.documentElement.clientWidth;
          const probe = s.cloneNode(true); probe.removeAttribute('id'); probe.style.cssText = 'position:absolute;visibility:hidden;width:auto;min-width:0;max-width:none;left:0;top:0'; s.parentElement.appendChild(probe);
          const needed = probe.getBoundingClientRect().width; probe.remove();   // the width at which the longest option shows in full
          const d = document.getElementById(s.getAttribute('aria-describedby') || '');
          return { left: Math.round(c.left), right: Math.round(c.right), vw, width: Math.round(c.width), needed: Math.round(needed), labelText: l ? l.textContent.trim().replace(/\s+/g, ' ') : null, described: !!(d && d.textContent.trim()), labelAbove: l && l.querySelector('span') ? l.querySelector('span').getBoundingClientRect().bottom <= c.top + 1 : null, longest: [...s.options].map(o => o.text).sort((a, b) => b.length - a.length)[0] };
        });
        report.cases++;
        const hhere = `${v.name} role-select @${width}`;
        if (hdr.left < 0 || hdr.right > hdr.vw + 0.5) report.failures.push({ case: hhere, kind: 'role-select-outside-viewport', ...hdr });
        if (hdr.width < hdr.needed - 1) report.failures.push({ case: hhere, kind: 'role-select-longest-option-clipped', width: hdr.width, needed: hdr.needed, longest: hdr.longest });
        if (!hdr.labelText || !/Demo role/.test(hdr.labelText) || !hdr.described) report.failures.push({ case: hhere, kind: 'role-select-name-or-description-missing', labelText: hdr.labelText, described: hdr.described });
        if (width <= 480 && hdr.labelAbove !== true) report.failures.push({ case: hhere, kind: 'role-label-not-stacked-on-narrow-screen', labelAbove: hdr.labelAbove });
        if (width === 320 || width === 1440) {
          const before = await p.evaluate(() => { const s = document.getElementById('role'); s.focus(); return { focused: document.activeElement === s, value: s.value }; });
          await p.keyboard.type('F'); await p.waitForTimeout(150);
          const after = await p.evaluate(() => ({ value: document.getElementById('role').value, toast: (document.getElementById('toast') && !document.getElementById('toast').hidden) ? document.getElementById('toast').textContent : '', over: document.documentElement.scrollWidth - innerWidth }));
          if (!before.focused || after.value !== 'FINANCE_APPROVER' || !/Finance Approver/.test(after.toast) || after.over > 0) report.failures.push({ case: hhere, kind: 'role-select-keyboard', before, after });
          await p.selectOption('#role', 'OPS_MANAGER');
        }
        report.samples.push({ variant: v.name, width, roleSelect: { width: hdr.width, needed: hdr.needed } });
        if (engineName === 'chromium' && width === 390) {   // the font the engine actually painted with (not just the CSS stack)
          const cdp = await ctx.newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
          const doc = await cdp.send('DOM.getDocument'), node = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#view p' });
          const f = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
          report.fonts.push({ variant: v.name, platformFonts: f.fonts.map(x => x.familyName + ' x' + x.glyphCount) });
        }
      }
      await safeClose(ctx); await safeClose(browser); browser = null;
    }
    // Forced wrap: whether a link lands beneath its button depends on the font, and the gap then depends on its vertical metrics (2px fails
    // axe's spacing rule, 3px passes), so a natural font can pass by luck. Making every agent Run button full-width puts each link on the line
    // below in every font, which is the worst case this layout must survive.
    { browser = await launch(); const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage();
      await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.goto(BASE + '#/agents'); await p.reload(); await p.waitForSelector('#view h1');
      for (const width of WIDTHS) {
        await p.setViewportSize({ width, height: 900 }); await p.waitForTimeout(80);
      for (const v of VARIANTS) {
        await p.evaluate(({ css, id }) => { let s = document.getElementById(id); if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); } s.textContent = css; }, { css: v.css + '#view p > button.btn{display:block;width:100%}', id: 'forced-wrap' });
        await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(60);
        const axe = await new AxeBuilder({ page: p }).withRules(['target-size']).analyze(), targets = axe.violations.flatMap(x => x.nodes.map(n => n.target.join(' ')));
        const small = await p.evaluate(() => [...document.querySelectorAll('#view button ~ a')].filter(a => a.getClientRects().length).map(a => ({ link: a.textContent.slice(0, 40), minLineHeightPx: Math.min(...[...a.getClientRects()].map(r => Math.round(r.height * 10) / 10)) })).filter(x => x.minLineHeightPx < 24));
        report.cases++;
        if (targets.length) report.failures.push({ case: `forced-wrap ${v.name} agents @${width}`, kind: 'target-size', targets });
        if (small.length) report.failures.push({ case: `forced-wrap ${v.name} agents @${width}`, kind: 'link-after-button-under-24px', links: small.slice(0, 3), count: small.length });
      }
      }
      await safeClose(ctx); }
  } finally { if (browser) await safeClose(browser); }
  const summary = { engine: engineName, variants: VARIANTS.map(v => v.name), cases: report.cases, failures: report.failures.length };
  if (process.env.FONT_TEST_REPORT) fs.writeFileSync(process.env.FONT_TEST_REPORT, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(summary));
  if (engineName === 'chromium') console.log(JSON.stringify(report.fonts));
  if (report.failures.length) { for (const f of report.failures.slice(0, 40)) console.log(JSON.stringify(f)); if (report.failures.length > 40) console.log(`... and ${report.failures.length - 40} more`); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
