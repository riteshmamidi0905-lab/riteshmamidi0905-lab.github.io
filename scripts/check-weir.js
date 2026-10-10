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
for (const s of ['problem', 'what', 'demo', 'control-center', 'evaluation', 'failed', 'limits']) assert.ok(document.getElementById(s), 'section ' + s);

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
/* the Control Center section: screenshots only, qualified, never a launch link, answer-channel limitation beside it, no stale framing */
const html = read('mcp-weir.html'), cc = document.getElementById('control-center'); assert.ok(cc, 'Control Center section exists');
const ccText = vis(cc), order = [...document.querySelectorAll('main > section')].map((x) => x.id);
assert.ok(order.indexOf('control-center') > order.indexOf('demo') && order.indexOf('control-center') < order.indexOf('evaluation'), 'the Control Center follows the demo and precedes the experiment: ' + order.join(','));
for (const [re, why] of [[/Synthetic world, real gateway/, 'synthetic qualification'], [/Localhost-only/, 'localhost-only qualification'], [/experimental/i, 'experimental qualification'], [/not hosted anywhere/, 'not hosted'], [/does not change the frozen evaluation/, 'frozen evaluation unchanged'], [/none of it is real data/, 'no real data'], [/for inspecting sessions, tool-call decisions, provenance, approvals and audit-chain verification/, 'what it does']]) assert.ok(re.test(ccText), 'Control Center copy missing: ' + why);
assert.ok(ccText.includes("Weir mediates MCP tool calls and results. It does not inspect the model's final answer."), 'the answer-channel limitation sits in the Control Center section');
assert.ok(!/launch (the )?(dash|control)|open (the )?dashboard|live demo|try it (live|online)|sign in|log in/i.test(text), 'no launch call to action');
assert.ok(!/production (dashboard|observability|monitoring)|control plane|security (console|dashboard)|real-time (production )?monitoring|enterprise|saas|monitoring platform/i.test(ccText), 'no production, security-console or hosted-product wording');
assert.ok(!/what I expected|\bI expected\b|surprise/i.test(text) && /what the frozen protocol predicted, what the held-out evaluation measured, and what still got through/.test(text), 'the hero says what the frozen protocol predicted (no stale expectation framing)');
assert.ok(!/\/private\/tmp|\/Users\/|claude-501|weir-token|X-Weir|\bap_[0-9a-f]{8}\b/.test(html), 'no local path, run token or approval id in the page');
const ccLinks = [...cc.querySelectorAll('a[href^="http"]')].map((a) => [a.textContent.replace(/\s+/g, ' ').trim(), a.getAttribute('href')]);
assert.deepEqual(ccLinks.map((l) => l[0]), ['View Control Center source', 'How to run locally'], 'exactly the two source and docs links');
assert.equal(ccLinks[0][1], `https://github.com/riteshmamidi0905-lab/mcp-weir/tree/${W.SOURCE.sha}/src/weir_dashboard`); assert.equal(ccLinks[1][1], `https://github.com/riteshmamidi0905-lab/mcp-weir/blob/${W.SOURCE.sha}/docs/dashboard.md`);
const vendored = JSON.parse(read('assets/weir/SOURCE.json')).files, ccImgs = [...cc.querySelectorAll('img')], ccSrcs = [...ccImgs.map((i) => i.getAttribute('src')), ...[...cc.querySelectorAll('source')].map((x) => x.getAttribute('srcset'))];
assert.equal(ccImgs.length, 5, 'one primary image and four walk-through images'); assert.equal(ccSrcs.length, 6, 'plus the phone-width source of the primary image');
for (const src of ccSrcs) { assert.match(src, /^assets\/weir\/control-center-[a-z-]+\.png$/); assert.ok(vendored[path.basename(src)], 'screenshot is vendored from the pinned commit: ' + src); }
for (const img of ccImgs) assert.ok(img.getAttribute('alt').length > 60, 'Control Center screenshots have descriptive alt text');
assert.equal(cc.querySelectorAll('[data-cc-walk] .cc-step').length, 4, 'four steps in the walk-through'); for (const f of cc.querySelectorAll('.cc-fig')) assert.equal(f.getAttribute('tabindex'), '0');
assert.ok(cc.querySelector('script[src="assets/js/weir-gallery.js"]') && fs.existsSync(path.join(__dirname, '..', 'assets/js/weir-gallery.js')), 'gallery script is the one local file');
assert.ok(/does not inspect the model/.test(ccText) && /Not new|not hosted/.test(ccText + text));
assert.ok([...document.querySelectorAll('.lns a')].every((a) => !/launch/i.test(a.textContent)), 'no link is labelled as a launch');
assert.ok(text.includes('The Control Center is a local, experimental viewer') && /not in the hash chain/.test(text), 'the Control Center limitation is in the limits list');

console.log('PASS: Weir page (structure, labels, disclosures, wording, numbers traced to the pinned evidence, links, Control Center section)');
