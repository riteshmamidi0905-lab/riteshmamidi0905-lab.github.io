/* Guards for the Weir case-study page: numbers only from the vendored evidence, honest labels, no confidential or inflated wording. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const W = require('./claims-weir');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const { document } = parseHTML(read('mcp-weir.html'));
const vis = (b) => { const c = b.cloneNode(true); c.querySelectorAll('script,style').forEach((e) => e.remove()); return c.textContent.replace(/\s+/g, ' '); };
const main = document.querySelector('main'), text = vis(main);

/* structure */
assert.equal(document.querySelectorAll('h1').length, 1, 'one h1'); assert.equal(document.querySelectorAll('main').length, 1, 'one main');
const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); assert.equal(new Set(ids).size, ids.length, 'unique ids');
for (const a of document.querySelectorAll('a[href^="#"]')) assert.ok(document.getElementById(a.getAttribute('href').slice(1)), 'dead anchor ' + a.getAttribute('href'));
for (const img of document.querySelectorAll('img')) { assert.ok(img.hasAttribute('alt') && img.getAttribute('alt').length > 20, 'descriptive alt'); assert.ok(img.hasAttribute('width') && img.hasAttribute('height')); assert.ok(fs.existsSync(path.join(__dirname, '..', img.getAttribute('src'))), 'image exists: ' + img.getAttribute('src')); }
for (const s of ['problem', 'what', 'demo', 'evaluation', 'failed', 'limits']) assert.ok(document.getElementById(s), 'section ' + s);

/* the evidence labels: all four classes appear, and the page never shows a result without a qualification near it */
for (const b of ['verified', 'simulated', 'limitation', 'not-evaluated']) assert.ok(document.querySelector('.ev-' + b), 'badge ' + b);
for (const must of [/same author/i, /not independent validation/i, /synthetic/i, /one small model/i, /never deployed/i, /oracle/i, /Not new/, /not a claim of novelty/i]) assert.ok(must.test(text), 'disclosure missing: ' + must);
assert.ok(document.querySelector('#limits .rt-lim'), 'limitations block');

/* wording: nothing the evidence does not support, nothing confidential */
const banned = /production[- ]ready|enterprise[- ]grade|\bsecure\b|\bsolved\b|\brobust\b|state[- ]of[- ]the[- ]art|unbreakable|bulletproof|guarantee|protects against prompt injection|100% (safe|secure)/i;
assert.ok(!banned.test(text), 'inflated wording: ' + (text.match(banned) || [''])[0]);
assert.ok(!/apple|movate|heart|monks|employer|client engagement/i.test(text), 'the page must not touch employer or client material');
assert.ok(!/novel|first[- ]ever|breakthrough|revolution/i.test(text.replace(/not a claim of novelty|Not new/gi, '')), 'no novelty claim');

/* numbers: every figure with 3+ digits, a decimal point or a percent sign must be derivable from the vendored headline file */
const allowed = W.allowedNumbers();
const stripped = text.replace(/[0-9a-f]{7,40}/g, ' ').replace(/\bMT-\d+|\bAD\d+|\bF\d\b|\bA\d[a-z]?\b|\bB\d\d\b|\bE\d+\b|v?\d+\.\d+\.\d+|Python 3\.1\d to 3\.1\d|Python 3\.1\d|Qwen3-4B-Instruct-2507|SHA-256|Qwen3-4B|Q4_K_M|b11476|4B\b|k-grams?|5-character|8-character|base64/gi, ' ');
const bad = [];
for (const m of stripped.matchAll(/\d[\d,]*(?:\.\d+)?%?/g)) {
  const raw = m[0].replace(/%$/, ''), n = raw.replace(/,/g, '');
  if (/^\d{1,2}$/.test(n) && !m[0].endsWith('%')) continue;           /* small counts and list numbers */
  if (!allowed.has(raw) && !allowed.has(n)) bad.push(m[0]);
}
assert.deepEqual([...new Set(bad)], [], 'numbers on the page that are not in the vendored evidence: ' + [...new Set(bad)].join(', '));

/* the cited numbers agree with the vendored files */
const c = W.cell('A3', 'strict');
assert.ok(text.includes(W.pct(c.attacks_reached_goal, c.attacks) + '%'), 'headline cell shown');
assert.ok(W.H.scripted.f4_secret_first['A3/strict'][0] === W.H.scripted.f4_secret_first['A3/strict'][1], 'the residual is the whole F4/secret_first set');
assert.equal(W.H.equivalence.agree, W.H.equivalence.total, 'equivalence is complete');

/* links: the repository only, at the pinned commit or default branch; external prior-art links are not used */
for (const a of document.querySelectorAll('main a[href^="http"]')) assert.ok(a.href.startsWith('https://github.com/riteshmamidi0905-lab/mcp-weir'), 'unexpected external link ' + a.href);
assert.match(W.SOURCE.sha, /^[0-9a-f]{40}$/); assert.notEqual(W.SOURCE.sha, '0'.repeat(40), 'evidence is pinned to a real commit');
console.log('PASS: Weir page (structure, labels, disclosures, wording, numbers traced to the pinned evidence, links)');
