/* Static checks for the NASHA AI Operations Lab page: structure, disclosure, number guard (every number traces to the vendored evidence), wording bans, link paths at the pinned commit,
   and that the headline results on the page equal the evidence. SYNTHETIC DATA / OFFLINE EVALUATION / same author: the page may never imply a business, employment or independent validation. */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const N = require('./claims-nasha');
const { E, SOURCE } = N;
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('nasha-lab.html'), spaced = html.replace(/<\/(td|th|li|p|h\d|span|b|i|small|button|summary|div|a|code|label|option|caption|figcaption)>/g, '$& '), doc = parseHTML(html).document, sdoc = parseHTML(spaced).document, home = parseHTML(read('index.html')).document, rec = parseHTML(read('recruiter.html')).document;
const main = doc.querySelector('main'); main.querySelectorAll('script,style,link').forEach((e) => e.remove());
const smain = sdoc.querySelector('main'); smain.querySelectorAll('script,style,link,code.sha,.nx-i,.kicker b').forEach((e) => e.remove());
const text = (n) => n.textContent.replace(/\s+/g, ' ').trim(), T = text(main), TS = text(smain);

/* 1 · evidence is pinned and complete */
assert.match(SOURCE.sha, /^[0-9a-f]{40}$/); assert.equal(SOURCE.repo, 'riteshmamidi0905-lab/INDO-MEX-BREWERY');
assert.equal(E.baseline.scenarios, 259); assert.equal(E.retrieval.n_questions, 467); assert.equal(E.retrieval.n_categories, 13);
for (const id of ['det', 'q15r2', 'q15r2g', 'q7', 'q7g']) assert.ok(N.hasPlanner(id), 'planner evidence ' + id);
assert.equal(N.LEDGER.claims.length, E.claims.length, 'the vendored ledger and the exported claims agree');

/* 2 · structure */
assert.equal(doc.querySelectorAll('h1').length, 1); assert.match(text(doc.querySelector('h1')), /NASHA AI Operations Lab/);
for (const id of ['glance', 'architecture', 'results', 'failure', 'retrieval', 'permissions', 'trace', 'hardening', 'competencies', 'others', 'case-study']) assert.equal(doc.querySelectorAll('#' + id).length, 1, 'section #' + id);
const ids = [...doc.querySelectorAll('[id]')].map((e) => e.id); assert.equal(new Set(ids).size, ids.length, 'duplicate ids: ' + ids.filter((x, i) => ids.indexOf(x) !== i));
assert.equal(doc.querySelectorAll('.nx-node').length, 10, 'ten architecture stages'); assert.equal(doc.querySelectorAll('.nx-pn').length, 10);
assert.equal(doc.querySelectorAll('.nx-acc details').length, 19, 'nineteen case-study chapters'); assert.equal(doc.querySelectorAll('.nx-comp tbody tr').length, 10, 'ten competencies');
assert.equal(doc.querySelectorAll('.nx-perm tbody tr').length, 5, 'five permission classes');
assert.deepEqual([...doc.querySelectorAll('.nx-perm tbody th code')].map((c) => c.textContent), ['READ', 'ANALYZE', 'DRAFT', 'MUTATE_SIMULATION', 'EXTERNAL_ACTION']);
assert.equal(doc.querySelectorAll('.nx-trace > li').length, 8, 'eight trace steps'); assert.equal(doc.querySelectorAll('.nx-steps > li').length, 3, 'failure, detection, fix');
for (const img of doc.querySelectorAll('main img')) { assert.ok(img.getAttribute('alt') && img.getAttribute('alt').length > 40, 'meaningful alt text'); assert.ok(img.getAttribute('width') && img.getAttribute('height'), 'intrinsic size (no layout shift)'); }
assert.ok(doc.querySelectorAll('main a[href^="http"]').length >= 20); for (const a of doc.querySelectorAll('main a[target="_blank"]')) assert.match(a.getAttribute('rel') || '', /noopener/);
assert.equal(doc.querySelectorAll('main [style*="font-size"]').length, 0);

/* 3 · disclosure and what the page must not imply */
assert.match(T, /Independent founder concept \+ synthetic enterprise simulation/); assert.match(T, /not a live operating restaurant/); assert.match(T, /no customers, revenue, suppliers, orders or production deployment/i);
assert.match(T, /not employment/i); assert.match(T, /same author|one author/i); assert.match(T, /not independent/i); assert.match(T, /working name/);
const BAN = [/independently validated/i, /production[- ]ready/i, /deployed (in|to) production/i, /our customers|real customers|paying customers|serves customers/i, /\brevenue of\b/i, /LLMs? (are|is) (worse|inferior|bad) (than|in general)/i, /neural retrieval is (worse|inferior)/i, /beats? (all )?(GPT|Claude|frontier)/i, /™|®/, /\bwe (built|ran|tested)\b/i,
  /(Principal|Staff|Senior) (Engineer|AI)/i, /employer|client results/i];
const TB = T.replace(/not a claim that neural retrieval is worse in general/gi, '').replace(/not a claim about LLMs in general/gi, '');
for (const re of BAN) if (re.test(TB) && !(re.source === 'employer|client results' && /not (employer|employment)/i.test(T))) assert.ok(false, 'banned wording on the NASHA page: ' + re);
for (let i = T.search(/halal/i); i >= 0 && i < T.length; i = T.indexOf('halal', i + 1)) { if (i < 0) break; assert.ok(/no halal/i.test(T.slice(Math.max(0, i - 14), i + 5)), 'halal appears only as "no halal claim"'); }
for (let i = T.indexOf('Gobi Taco'); i >= 0; i = T.indexOf('Gobi Taco', i + 1)) assert.ok(/history|historical|older|superseded/i.test(T.slice(Math.max(0, i - 140), i + 140)), '"Gobi Taco" only as labelled history');
assert.ok(!/Mango Habanero Gobi[^.]{0,60}\btaco\b/i.test(T.replace(/not a taco/gi, '').replace(/"Gobi Taco"/g, '')), 'Mango Habanero Gobi is not described as a taco');
for (const p of N.LEDGER.prohibited_claims) assert.ok(typeof p === 'string' && p.length > 10);
/* the page states the key framing and limits */
assert.match(T, /The LLM didn't win/); assert.match(T, /simplest system that satisfies the reliability requirement/); assert.match(T, /not a claim that neural retrieval is worse in general/i);
assert.match(T, /The model does not own the permission system/i); assert.match(T, /MODEL INVENTS A KEY/); assert.match(T, /MODEL APPEARS GROUNDED/); assert.match(T, /Only successful trusted tool results can establish grounding/);

/* 4 · numbers: every figure traces to the vendored evidence or a small structural allow-list */
const ALLOW = new Set([...N.allowedNumbers(), '2.5', '0.8.7', '56', '758', '12', '45', '60', '29', '15', '1,820', '000', '78', '35', '30', '50', '48', '440']);
const stray = []; const clean = TS.replace(/\bD-\d+\b/g, ' ').replace(/Qwen2\.5-\d(\.\d)?B/g, ' ').replace(/all-MiniLM-L6-v2/g, ' ').replace(/\b(ts|p)[12]\b/g, ' ').replace(/\bpg\d+\b/g, ' ');
for (const m of clean.matchAll(/\d[\d,]*(?:\.\d+)*/g)) { const t = m[0].replace(/[.,]+$/, ''); if (!ALLOW.has(t) && !ALLOW.has(t.replace(/,/g, ''))) stray.push(t); }
assert.deepEqual([...new Set(stray)], [], 'numbers on the NASHA page that trace to no evidence: ' + [...new Set(stray)].join(', '));
/* the headline results on the page equal the evidence */
for (const id of ['det', 'q15r2', 'q15r2g', 'q7']) { const p = N.planner(id); assert.ok(T.includes(`${p.pass_.k}/${p.pass_.n}`), id + ' pass count on the page'); }
const rt = Object.fromEntries(E.retrieval.table.map((r) => [r.id, r])); assert.ok(rt.bm25.mrr > rt.minilm.mrr && rt.bm25.mrr > rt.hybrid_minilm.mrr, 'the page claims BM25 won; the evidence must agree');
assert.ok(N.planner('det').pass_.k > N.planner('q15r2').pass_.k && N.planner('det').pass_.k > N.planner('q7').pass_.k / N.planner('q7').pass_.n * N.planner('det').pass_.n, 'the page claims the deterministic planner won; the evidence must agree');
for (const p of E.planners.filter((x) => x.kind !== 'deterministic' && x.kind !== 'stand-in')) assert.equal(p.external_actions, 0, 'zero executed external actions claim');
if (E.tool_schema) { assert.ok(T.includes(E.tool_schema.verdict.slice(0, 40)), 'tool-schema verdict is shown'); }

/* 5 · link targets exist at the pinned commit (needs the NASHA checkout; CI re-checks through verify:evidence --online and the external-link check) */
const clone = process.env.NASHA_CLONE || '/home/user/INDO-MEX-BREWERY'; let checked = 0, skipped = false;
if (fs.existsSync(path.join(clone, '.git'))) {
  for (const a of doc.querySelectorAll('main a[href^="https://github.com/' + SOURCE.repo + '/"]')) {
    const m = a.getAttribute('href').match(/\/(blob|tree)\/([0-9a-f]{40})\/(.+)$/); if (!m) continue; assert.equal(m[2], SOURCE.sha, 'links are pinned to the evidence commit');
    const r = cp.spawnSync('git', ['-C', clone, 'cat-file', '-e', `${m[2]}:${m[3]}`]); assert.equal(r.status, 0, 'path does not exist at the pinned commit: ' + m[3]); checked++;
  }
} else skipped = true;

/* 6 · the homepage strip, the hero and the recruiter view carry the same framing */
assert.ok(home.querySelector('#nasha-lab a[href="nasha-lab.html"]')); assert.match(text(home.querySelector('#nasha-lab')), /Independent founder concept, synthetic data/); assert.match(text(home.querySelector('#nasha-lab')), /not employment/i);
assert.ok(home.querySelector('.hero a[href="#nasha-lab"]')); assert.ok(home.querySelector('#nlinks a[href="#nasha-lab"]'));
const recText = text(rec.querySelector('.proj')); assert.match(recText, /NASHA AI Operations Lab/); assert.match(recText, /not employment/i); assert.match(recText, /same-author evaluation/i);
assert.ok(!/NASHA/.test(text(home.querySelector('#experience'))), 'NASHA is not in the experience section');
assert.ok(!/NASHA/.test(JSON.stringify(require('../content/site.json').experience)), 'NASHA is not in the experience data');
console.log(`PASS: NASHA page (structure, disclosure, wording bans, number guard, headline results vs evidence, ${checked} link paths at the pinned commit${skipped ? ' [skipped: no NASHA checkout]' : ''}, homepage and recruiter framing, not employment)`);
