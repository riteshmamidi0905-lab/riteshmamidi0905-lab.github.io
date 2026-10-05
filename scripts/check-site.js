/* Static checks on the generated site: structure, links, evidence honesty, determinism. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { P, FLAG } = require('../data');
const plinks = require('../content/project-links.json');
const read = (f) => fs.readFileSync(f, 'utf8');
const { document } = parseHTML(read('index.html'));
const rec = parseHTML(read('recruiter.html')).document;

/* inventory */
assert.equal(document.querySelectorAll('.prow').length, P.length, 'all projects present');
assert.equal(document.querySelectorAll('article.flag').length, FLAG.length, 'six flagships');
assert.equal(document.querySelectorAll('h1').length, 1); assert.equal(document.querySelectorAll('main').length, 1);
assert.equal(document.querySelectorAll('.dimension').length, 6);
assert.equal(document.querySelectorAll('video').length, 5); assert.equal(document.querySelectorAll('track[kind="captions"]').length, 5);
assert.equal(document.querySelectorAll('[data-world]').length, 6, 'hero + 4 worlds + contact');
const order = [...document.querySelectorAll('main > section, main > .chapter, main > header')].map((s) => s.id);
assert.deepEqual(order, ['hero', 'build', 'ai', 'data', 'product', 'flagships', 'maref', 'experience', 'projects', 'about', 'contact'], 'story order');

/* ids unique; internal anchors + local assets resolve (incl. srcset) */
const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); assert.equal(new Set(ids).size, ids.length, 'duplicate ids: ' + ids.filter((x, i) => ids.indexOf(x) !== i));
for (const [doc, label] of [[document, 'index'], [rec, 'recruiter']]) {
  for (const el of doc.querySelectorAll('[href],[src],[srcset]')) for (const attr of ['href', 'src', 'srcset']) {
    const raw = el.getAttribute(attr); if (!raw) continue;
    for (const url of (attr === 'srcset' ? raw.split(',').map((x) => x.trim().split(/\s+/)[0]) : [raw])) {
      if (!url || /^(https?:|mailto:|data:)/.test(url)) continue;
      if (url.startsWith('#')) assert.ok(doc.getElementById(url.slice(1)), `${label}: dead anchor ${url}`);
      else if (url.startsWith('./#')) assert.ok(document.getElementById(url.slice(3)), `${label}: dead anchor ${url}`);
      else assert.ok(fs.existsSync(path.join(process.cwd(), url.split('?')[0].split('#')[0])) || url === './', `${label}: missing file ${url}`);
    }
  }
}
for (const img of document.querySelectorAll('img')) { assert.ok(img.hasAttribute('alt')); assert.ok(img.hasAttribute('width') && img.hasAttribute('height')); }

/* evidence honesty: tests/architecture links only where the destination was verified to exist */
for (const a of document.querySelectorAll('a[href*="/tree/"][href$="/tests"],a[href*="/tree/"][href$="/backend/tests"]')) {
  const repo = a.href.split('/')[4]; assert.ok(plinks[repo] && plinks[repo].tests, 'tests link without a verified tests dir: ' + a.href);
}
for (const a of document.querySelectorAll('a[href$="/docs/architecture.md"]')) { const repo = a.href.split('/')[4]; assert.ok(plinks[repo].architecture, 'architecture link not verified: ' + a.href); }
for (const f of FLAG) assert.ok(!plinks[f.r] || plinks[f.r].tests === !!plinks[f.r].testsPath);

/* integrity of research claims */
assert.ok(document.querySelector('#research').textContent.includes('Illustrative Example — Not Experimental Results'));
assert.ok(/Research \/ framework in development/.test(document.querySelector('.paper-status').textContent));
assert.ok(!document.querySelector('.hero-av').textContent.includes('AI generated'));

/* one design system: no leftovers of the previous generations */
assert.equal(document.querySelectorAll('.paper:not(article),.dark,[class*="cine-"],.pcard,.flagw,.cs-panel').length, 0, 'old design remnants present');
for (const f of ['app.js', 'assets/js/portfolio.js', 'assets/css/base.css', 'assets/css/portfolio.css', 'assets/css/cinematic.css']) assert.ok(!fs.existsSync(f), 'obsolete file still present: ' + f);

/* recruiter view is script-free and complete */
assert.equal(rec.querySelectorAll('script').length, 0); assert.ok(rec.querySelector('h1').textContent.includes('Ritesh Mamidi'));
for (const k of ['Experience', 'Top projects', 'Core technologies', 'Research', 'Contact']) assert.ok([...rec.querySelectorAll('h2')].some((h) => h.textContent === k), 'recruiter section ' + k);
assert.equal(rec.querySelectorAll('.proj > li').length, FLAG.length);

/* deterministic build */
const before = [read('index.html'), read('recruiter.html')];
delete require.cache[require.resolve('../build')]; require('../build');
assert.deepEqual([read('index.html'), read('recruiter.html')], before, 'generated HTML is stale');
console.log('PASS: inventory, story order, links/anchors/assets, evidence honesty, research labels, no old-design remnants, recruiter view, deterministic build');
