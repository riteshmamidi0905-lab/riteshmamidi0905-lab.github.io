/* Static checks on the generated site: structure, links, evidence honesty, determinism. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { P, FLAG } = require('../data');
const plinks = require('../content/project-links.json');
const read = (f) => fs.readFileSync(f, 'utf8');
const { document } = parseHTML(read('index.html'));
const rec = parseHTML(read('recruiter.html')).document;

const txt = (el) => el.textContent.replace(/\s+/g, ' ');
const vis = (b) => { const c = b.cloneNode(true); c.querySelectorAll('script,style').forEach((e) => e.remove()); return c.textContent; };   // what a visitor can read: scene data embedded as JSON is not page copy
const page = (f) => parseHTML(read(f)).document;
const rtd = page('agent-runtime.html'), evd = page('evaluation.html'), prd = page('projects.html'), csd = page('support-escalation-copilot.html');
const PAGES = [[document, 'index'], [rec, 'recruiter'], [csd, 'case study'], [rtd, 'runtime page'], [evd, 'evaluation page'], [prd, 'projects page']];

/* inventory: the homepage is compact; the material it points to lives on its own pages */
assert.equal(prd.querySelectorAll('.prow').length, P.length, 'all projects present on the projects page'); assert.equal(document.querySelectorAll('.prow').length, 0, 'the project list is not on the homepage');
assert.equal(prd.querySelectorAll('article.flag').length + evd.querySelectorAll('article.flag').length, FLAG.length, 'six supporting builds: five on the projects page, llmeval on the evaluation page');
for (const [d, label] of PAGES) { assert.equal(d.querySelectorAll('h1').length, 1, label + ': one h1'); assert.equal(d.querySelectorAll('main').length, 1, label + ': one main'); }
assert.equal(evd.querySelectorAll('.dimension').length, 6); assert.equal(document.querySelectorAll('.dimension').length, 0);
assert.equal(evd.querySelectorAll('video').length + prd.querySelectorAll('video').length, 5); assert.equal(document.querySelectorAll('video').length, 0, 'no film on the homepage');
assert.equal(evd.querySelectorAll('track[kind="captions"]').length + prd.querySelectorAll('track[kind="captions"]').length, 5);
assert.equal(document.querySelectorAll('[data-world]').length, 4, 'homepage: hero + copilot + runtime + contact');
assert.equal(document.querySelectorAll('[data-world][data-compact]').length, 2, 'the two flagship scenes on the homepage are compact (one screen, not pinned)');
assert.equal(rtd.querySelectorAll('[data-world]').length, 1); assert.equal(evd.querySelectorAll('[data-world]').length, 2, 'llmeval scene + MAREF scene'); assert.equal(prd.querySelectorAll('[data-world]').length, 8, '3 chapter worlds + 5 build scenes');
const sectionIds = (d) => [...d.querySelectorAll('main > section, main > .chapter, main > header')].map((x) => x.id);
assert.deepEqual(sectionIds(document), ['hero', 'key', 'copilot', 'runtime', 'evaluation', 'also-built', 'experience', 'about', 'contact'], 'homepage story order: hero, evidence key, the three flagships (agents, infrastructure, evaluation), also built, experience, about, contact');
assert.deepEqual(sectionIds(prd), ['top', 'projects', 'supporting', 'ai', 'data', 'product', 'flagships', 'progression'], 'projects page: library, explorers, builds, path');
assert.ok(document.querySelector('#evaluation #maref') && evd.querySelector('#evaluation #maref'), 'MAREF sits inside Flagship 03, after the tested metric suite, on the homepage and on the evaluation page');

/* ids unique per page; internal anchors, cross-page anchors and local assets resolve (incl. srcset) */
const byFile = { 'index.html': document, 'recruiter.html': rec, 'support-escalation-copilot.html': csd, 'agent-runtime.html': rtd, 'evaluation.html': evd, 'projects.html': prd };
for (const [d, label] of PAGES) { const ids = [...d.querySelectorAll('[id]')].map((e) => e.id); assert.equal(new Set(ids).size, ids.length, `${label}: duplicate ids: ` + ids.filter((x, i) => ids.indexOf(x) !== i)); }
for (const [doc, label] of PAGES) {
  for (const el of doc.querySelectorAll('[href],[src],[srcset]')) for (const attr of ['href', 'src', 'srcset']) {
    const raw = el.getAttribute(attr); if (!raw) continue;
    for (const url of (attr === 'srcset' ? raw.split(',').map((x) => x.trim().split(/\s+/)[0]) : [raw])) {
      if (!url || /^(https?:|mailto:|data:)/.test(url)) continue;
      if (url.startsWith('#')) assert.ok(doc.getElementById(url.slice(1)), `${label}: dead anchor ${url}`);
      else if (url.startsWith('./#')) assert.ok(document.getElementById(url.slice(3)), `${label}: dead anchor ${url}`);
      else { const [f, hash] = url.split('?').join('#').split('#').length > 1 ? [url.split('?')[0].split('#')[0], url.split('#')[1]] : [url, null]; assert.ok(fs.existsSync(path.join(process.cwd(), f)) || url === './', `${label}: missing file ${url}`); if (hash && byFile[f]) assert.ok(byFile[f].getElementById(hash), `${label}: dead cross-page anchor ${url}`); }
    }
  }
}
for (const [d] of PAGES) for (const img of d.querySelectorAll('img')) { assert.ok(img.hasAttribute('alt')); assert.ok(img.hasAttribute('width') && img.hasAttribute('height')); }

/* evidence honesty: tests/architecture links only where the destination was verified to exist */
for (const a of [document, evd, prd, rtd].flatMap((d) => [...d.querySelectorAll('a[href*="/tree/"][href$="/tests"],a[href*="/tree/"][href$="/backend/tests"]')])) {
  const repo = a.href.split('/')[4]; assert.ok(plinks[repo] && plinks[repo].tests, 'tests link without a verified tests dir: ' + a.href);
}
for (const a of [document, evd, prd, rtd].flatMap((d) => [...d.querySelectorAll('a[href$="/docs/architecture.md"]')])) { const repo = a.href.split('/')[4]; assert.ok(plinks[repo].architecture, 'architecture link not verified: ' + a.href); }
for (const f of FLAG) assert.ok(!plinks[f.r] || plinks[f.r].tests === !!plinks[f.r].testsPath);

/* integrity of research claims */
assert.ok(evd.querySelector('#research').textContent.includes('Illustrative Example — Not Experimental Results'));
assert.ok(/not independent validation/i.test(evd.querySelector('#research .paper-status').textContent), 'MAREF is presented with the same-author, not-independent-validation disclosure');
assert.ok(/not independent validation/i.test(document.querySelector('#maref .paper-status').textContent), 'the homepage MAREF block carries the same disclosure');
assert.ok(!document.querySelector('.hero-av').textContent.includes('AI generated'));

/* one design system: no leftovers of the previous generations */
for (const [d] of PAGES) assert.equal(d.querySelectorAll('.paper:not(article),.dark,[class*="cine-"],.pcard,.flagw,.cs-panel').length, 0, 'old design remnants present');
for (const f of ['app.js', 'assets/js/portfolio.js', 'assets/css/base.css', 'assets/css/portfolio.css', 'assets/css/cinematic.css']) assert.ok(!fs.existsSync(f), 'obsolete file still present: ' + f);

/* recruiter view is script-free and complete */
assert.equal(rec.querySelectorAll('script').length, 0); assert.ok(rec.querySelector('h1').textContent.includes('Ritesh Mamidi'));
for (const k of ['Experience', 'Top projects', 'Core technologies', 'Research', 'Contact']) assert.ok([...rec.querySelectorAll('h2')].some((h) => h.textContent === k), 'recruiter section ' + k);
assert.equal(rec.querySelectorAll('.proj > li').length, FLAG.length + 2, 'the Copilot + the agent runtime + the six supporting builds');
assert.match(rec.querySelector('.proj > li').textContent, /Support Escalation Copilot/, 'the Copilot leads the recruiter view');

/* AI Agent Runtime: every claim is bound to the pinned public-repo evidence and its limits are stated (full page), and the homepage version carries the same qualifiers */
const RT = require('../content/agent-runtime.json');
const rtText = rtd.querySelector('#agent-runtime').textContent;
assert.equal(RT.sha.length, 40); assert.equal(plinks[RT.repo].sha, RT.sha); assert.equal(require('../content/project-evidence.json')[RT.repo], RT.sha);
for (const must of ['89', '3.9', '3.12', 'PostgreSQL 16', 'Docker Compose', '13 / 13', '100%']) assert.ok(rtText.includes(must), 'runtime evidence missing: ' + must);
assert.ok(rtText.includes('Runtime evaluation using deterministic stand-in and scripted models; not a benchmark of LLM quality.'), 'mandatory evaluation qualifier');
const qIdx = rtText.indexOf('not a benchmark of LLM quality'), sIdx = rtText.indexOf('13 / 13'); assert.ok(qIdx > sIdx && qIdx - sIdx < 800, 'qualifier must sit right after the numbers');
const prom = [...rtd.querySelectorAll('.rt-stats, #world-runtime .world-top, #world-runtime .world-steps, #world-runtime .world-cap')].map((e) => e.textContent).join(' ');
assert.ok(!/61\.5/.test(prom), 'final-answer rate must not be prominent'); assert.ok(/61\.5%/.test(rtd.querySelector('.rt-det').textContent), 'appears only inside the detailed explanation, with context');
assert.ok(rtd.querySelector('.rt-det').textContent.includes('by design'));
const lim = rtd.querySelector('.rt-lim').textContent; for (const k of ['use scripted models', 'agent-runtime-bench', 'not a safety claim about the runtime', 'a secret was disclosed through a permitted read tool', 'verified in CI only', 'Not deployed as a live service', 'No run-cancellation', 'cannot be killed', 'estimates', 'heuristics']) assert.ok(lim.includes(k), 'limitation missing: ' + k);
assert.ok(!/production[- ]deployed|deployed to production|live in production/i.test(rtText), 'must not claim a production deployment');
assert.ok(!/real[- ]model[^.]*(was|were) (run|executed)|verified (locally )?with docker/i.test(rtText));
for (const a of rtd.querySelectorAll('#agent-runtime a[href^="https://github.com/"]')) { if (a.href === 'https://github.com/riteshmamidi0905-lab/agent-runtime-bench') continue; assert.ok(a.href.includes('/' + RT.repo), a.href); if (!/\/ai-agent-from-scratch$/.test(a.href)) assert.ok(a.href.includes(RT.sha), 'doc links are pinned to the commit: ' + a.href); }
assert.ok(prd.querySelector('#projects').textContent.includes(RT.title));
assert.equal(P[0].r, 'support-escalation-copilot', 'the Copilot leads the library'); assert.equal(P[1].r, RT.repo, 'the agent runtime is second');

/* Agent Runtime Benchmark: every figure is in the vendored results document at the pinned commit; the failure and its lesson are shown wherever the controls result is shown */
{
  const A = RT.arb, ARBSRC = require('../content/evidence/agent-runtime-bench/SOURCE.json'), RES = read('content/evidence/agent-runtime-bench/RESULTS.md');
  assert.equal(ARBSRC.sha, A.sha); assert.equal(ARBSRC.repo, 'riteshmamidi0905-lab/' + A.repo); assert.match(A.sha, /^[0-9a-f]{40}$/);
  for (const must of ['Tasks passed **43/48', 'adversarial/negative **20/25', 'All seven controls held in **240/240 agent-mode runs**', '**MT-02:**', 'get_config', 'TANGERINE-42', 'not *information flow through permitted read tools*', 'same AI that wrote the oracle']) assert.ok(RES.includes(must), 'vendored ARB results do not contain: ' + must);
  assert.deepEqual(A.results.map((x) => x[0]), ['43/48', '7/7', 'MT-02']); assert.ok(A.results[0][2].includes('20/25') && A.results[1][2].includes('240/240'));
  assert.ok(A.lessonTitle === 'Action safety ≠ information-flow safety');
  for (const [d, sel, label] of [[document, '#runtime', 'homepage'], [rtd, '#arb', 'runtime page']]) {
    const t = txt(d.querySelector(sel)); for (const must of ['43/48', '7/7', '240/240', 'MT-02', 'Action safety ≠ information-flow safety', 'get_config', 'not a safety claim about the runtime', 'same AI author', 'scripted approver']) assert.ok(t.includes(must), `${label}: ARB statement missing: ${must}`);
    for (let k = t.indexOf('7/7'); k >= 0; k = t.indexOf('7/7', k + 1)) assert.ok(/MT-02/.test(t.slice(Math.max(0, k - 500), k + 700)), `${label}: 7/7 controls shown without the MT-02 failure beside it`);
    for (let k = t.indexOf('43/48'); k >= 0; k = t.indexOf('43/48', k + 1)) assert.ok(/one (small|4B)|frozen oracles/.test(t.slice(Math.max(0, k - 200), k + 400)), `${label}: 43/48 shown without its qualification`);
    for (const a of d.querySelectorAll(`${sel} a[href*="${A.repo}"]`)) { const h = a.getAttribute('href'); assert.ok(h === `https://github.com/riteshmamidi0905-lab/${A.repo}` || h.includes(A.sha), `${label}: unpinned ARB link ${h}`); }
  }
  const homeRt = txt(document.querySelector('#runtime'));
  for (const must of ['Runtime evaluation using deterministic stand-in and scripted models; not a benchmark of LLM quality.', '13 / 13']) assert.ok(homeRt.includes(must), 'homepage runtime: ' + must);
  assert.ok(!/61\.5/.test(homeRt), 'final-answer rate must not appear on the homepage');
  assert.ok(!/(?<![\d.])100%/.test(homeRt.replace(/100% credit request[^.]*\./g, '')), 'no near-100% scripted-model metric is advertised on the homepage');
  assert.ok(!/production[- ]deployed|deployed to production|live in production|safe against injection|injection[- ]proof/i.test(homeRt), 'no production or safety claim');
}

/* ================= M7 claim governance: Support Escalation Copilot, positioning, evidence labels, confidentiality ================= */
const { execFileSync } = require('child_process'), crypto = require('crypto');
const C = require('./claims'); const CP = require('../content/support-escalation-copilot.json'); const EVAL = require('../content/llm-eval-framework.json');
const csDoc = parseHTML(read('support-escalation-copilot.html')).document, SLUG = 'support-escalation-copilot';

/* 1 · the vendored evidence is byte-identical to the pinned public commit (offline hash check; CI also re-fetches it) and the pins agree everywhere */
execFileSync(process.execPath, ['scripts/verify-evidence.js'], { stdio: 'pipe' });
assert.match(C.SOURCE.sha, /^[0-9a-f]{40}$/); assert.equal(C.SOURCE.repo.split('/')[1], SLUG);
assert.equal(plinks[SLUG].sha, C.SOURCE.sha); assert.equal(require('../content/project-evidence.json')[SLUG], C.SOURCE.sha); assert.equal(C.MANIFEST.repository && true, true);
assert.equal(plinks['llm-eval-framework'].sha, EVAL.sha); assert.equal(require('../content/project-evidence.json')['llm-eval-framework'], EVAL.sha);

/* 2 · every claim reference resolves to a claim the source repository marked portfolio-eligible; withheld claims never appear in any form */
for (const [doc, label] of [[document, 'index'], [csDoc, 'case study'], [evd, 'evaluation page'], [rtd, 'runtime page'], [prd, 'projects page']]) for (const el of doc.querySelectorAll('[data-claim]')) for (const id of el.getAttribute('data-claim').split(/\s+/)) { assert.ok(C.BY_ID[id], `${label}: unknown claim ${id}`); assert.ok(C.BY_ID[id].suitable_for.portfolio, `${label}: ${id} is not portfolio-eligible`); }
const ALLFILES = ['index.html', 'recruiter.html', 'support-escalation-copilot.html', 'agent-runtime.html', 'evaluation.html', 'projects.html'];
const allHtml = ALLFILES.map(read);
for (const c of C.MANIFEST.claims.filter((x) => !x.suitable_for.portfolio)) for (const h of allHtml) { assert.ok(!h.includes(c.id), 'withheld claim id on the site: ' + c.id); assert.ok(!h.includes(c.claim.slice(0, 50)), 'withheld claim text on the site: ' + c.id); }
for (const h of [...allHtml, read('profile/README.md')]) assert.ok(!/\/undefined\b|\/null\b|\[object Object\]|\bNaN\b|>\s*undefined\s*<|\$\{/.test(h), 'a template placeholder leaked into generated output');
for (const h of allHtml) { const t = h.replace(/<[^>]+>/g, ' '); assert.ok(!/\b280\b/.test(t) && !/outcome[- ]match/i.test(t), 'the 280/315 stand-in outcome figure must never appear'); }
assert.equal(csDoc.querySelectorAll('.ev-row').length, C.MANIFEST.claims.filter((c) => c.suitable_for.portfolio).length, 'the evidence table lists every portfolio-eligible claim, once');
for (const row of csDoc.querySelectorAll('.ev-row')) { const c = C.BY_ID[row.dataset.claim]; assert.equal(row.dataset.b, C.badgeOf(c)); assert.ok(txt(row).includes(c.claim.slice(0, 60).replace(/\s+/g, ' ')), 'table row is the manifest text, verbatim'); assert.ok(txt(row).includes(c.qualification.slice(0, 40)), 'qualification is shown with its claim'); }

/* 3 · numbers: every figure in the Copilot narrative is one the manifest contains (or one of the few listed, with their source) */
const SKIP = '.world-nav,.cap-n,.world-kicker,code.sha,.cp-prov,.ev-table,.ev-ctl,.kicker b,.eyebrow,.world-note,[data-nonclaim]';
const allowed = new Set([...C.allowedNumbers(), ...CP.allowNumbers, String(CP.attackRows.length)]);
/* ids such as S03, R02, I1 and tokens such as v0.6.0 are not claims */
const strays = (el) => { const c = el.cloneNode(true); c.querySelectorAll(SKIP).forEach((e) => e.remove()); const t = c.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/v\d+\.\d+\.\d+/g, ' ').replace(/[A-Za-z]+-\d+/g, ' ').replace(/\b[A-Z]{1,2}\d{1,2}\b/g, ' '); return [...new Set(t.match(/\d+(?:\.\d+)?/g) || [])].filter((n) => !allowed.has(n)); };
assert.deepEqual(strays(document.querySelector('#copilot')), [], 'homepage Copilot section: numbers the manifest does not contain');
assert.deepEqual(strays(csDoc.querySelector('main')), [], 'case study: numbers the manifest does not contain');
const cpText = txt(document.querySelector('#copilot')) + ' ' + txt(csDoc.querySelector('main'));
for (const must of ['not an LLM', 'fictional', 'synthetic', 'never been deployed', 'Amendment A1', 'not accuracy', 'scripted', 'v0.6.0', 'v0.7.0', 'frozen expected outcome', 'simulated']) assert.ok(cpText.includes(must), 'Copilot mandatory qualifier missing: ' + must);
assert.ok(!/(evaluated|tested|benchmarked|measured) (with|on|against) (an? )?(real )?(LLM|language model)/i.test(cpText.replace(/not (an? )?(real )?(LLM|language model)/gi, '')), 'must not imply an LLM was evaluated');
assert.ok(!/\b(production users?|paying customers?|saved \$|revenue|cost saving|in production)\b/i.test(txt(document.querySelector('#copilot').cloneNode(true)).replace(/never been deployed[^.]*\./, '')), 'no production, user, revenue or savings claim');

CP.steps.filter((st) => st.badge === 'simulated').forEach((st) => assert.match(st.text, /stand-in|scripted/i, 'a simulated step must say what stood in for the model: ' + st.label));
CP.stats.filter((st) => st.badge === 'simulated').forEach((st) => assert.match(st.note, /stand-in|scripted/i, 'a simulated figure must say what was scripted: ' + st.label));

/* 4 · the evidence layer: one vocabulary, defined once, used consistently */
const labels = Object.values(C.BADGES).map((b) => b[0]);
assert.deepEqual([...document.querySelectorAll('#key .ev-legend .ev')].map((e) => txt(e).trim()), labels, 'legend on the homepage'); assert.deepEqual([...csDoc.querySelectorAll('.cs-head .ev-legend .ev')].map((e) => txt(e).trim()), labels, 'legend on the case study');
for (const doc of [document, csDoc, rtd, evd, prd]) for (const e of doc.querySelectorAll('.ev')) { const k = [...e.classList].find((c) => c.startsWith('ev-') && c !== 'ev-m'); if (!k) continue; const key = k.slice(3); if (!C.BADGES[key]) continue; const t = txt(e).trim(); assert.ok(t === C.BADGES[key][0] || e.classList.contains('cap-ev') || t === '', `label text ${t} does not match ${key}`); }
for (const [k, [name]] of Object.entries(C.BADGES)) assert.ok(read('assets/js/worlds.js').includes(`'${k}': '${name}'`) || read('assets/js/worlds.js').includes(`${k}: '${name}'`), 'worlds.js label vocabulary differs from claims.js: ' + k);
assert.ok(evd.querySelector('#research .paper-status .ev-limitation') && document.querySelector('#maref .paper-status .ev-limitation'), 'MAREF carries the limitation label'); for (const d of [document, evd]) { assert.ok(d.querySelector('#llmeval-evidence').textContent.includes(EVAL.qualifier), 'llmeval qualifier'); for (const [n] of EVAL.stats) assert.ok(d.querySelector('#llmeval-evidence').textContent.includes(n), 'llmeval figure ' + n); }

/* 5 · the scene is drawn from the same claims: what the canvas will show equals the manifest */
const W = JSON.parse(document.querySelector('#rm-worlds').textContent), CD = W['copilot-data'];
assert.equal(W.copilot.steps.length, 10); W.copilot.steps.forEach((st, i) => assert.equal(st[2], CP.steps[i].badge));
assert.equal(CD.n.tests, C.claim('test-suite').value.passed); assert.equal(CD.n.attacks, C.claim('threat-catalogue').value.executable); assert.equal(CD.actions.total, C.claim('typed-actions-no-email').value.actions); assert.equal(CD.actions.gated.length, 3);
for (const r of CD.retrieval) { const v = C.claim('retrieval-vector-beat-hybrid').value.strategies[r.key]; assert.equal(r.hit, v['hit@1']); assert.equal(r.mrr, v['mrr@10']); }
assert.deepEqual(CP.retrieval.strategies.map((x) => x[0]).sort(), Object.keys(C.claim('retrieval-vector-beat-hybrid').value.strategies).sort(), 'every retrieval strategy is drawn exactly once');
for (const [k, label] of CP.retrieval.strategies) assert.match(label, { lexical: /lexical/i, vector: /pgvector/i, hybrid: /^hybrid \(/i, rerank: /rerank/i }[k], 'strategy label matches its key: ' + k);
assert.deepEqual(csDoc.querySelectorAll('#rm-worlds').length, 1);

/* 6 · the attack and draft stories are rows of the repository's own reports, not retellings */
const inj = C.injectionRows(); assert.equal(inj.length, 32 - 20 + 20, 'the report lists the 32 attack runs'); assert.equal(inj.length, C.claim('invariants-held-in-scenario-runs').value.injection_runs);
assert.ok(inj.every((r) => r.inv.every((x) => x === '✔')), 'every invariant held in every run');
for (const r of CP.attackRows) { const m = inj.find((x) => x.attack === r.attack && x.model === 'obedient' && x.detectors === 'on'); assert.ok(m, 'attack not in the report: ' + r.attack); assert.equal(m.contained, r.contained, r.attack); assert.equal(m.final, r.state, r.attack); }
assert.equal(csDoc.querySelectorAll('.atk-table tbody tr').length, CP.attackRows.length);
const steer = read('content/evidence/support-escalation-copilot/m5-draft-steering.md');
for (const e of CP.examples) { const line = steer.split('\n').find((l) => l.startsWith(`| ${e.id} |`)); assert.ok(line, 'draft id not in the report: ' + e.id); if (e.text) assert.ok(line.includes(e.text), 'draft text differs from the report: ' + e.id); assert.equal(e.result === 'flagged', line.includes('✔') && !line.includes('**missed**'), 'recorded result differs: ' + e.id); if (e.result === 'flagged') assert.ok(line.includes('claims an effect (trigger_resync)'), 'rule text'); }
const demos = read('content/evidence/support-escalation-copilot/m5-demos.md'); for (const must of ['FORBIDDEN_ACTION', 'CREDIT_ABOVE_AGENT_THRESHOLD', 'refund 100%']) assert.ok(demos.includes(must) && cpText.includes(must.replace('refund 100%', 'refund 100%')), 'demo C detail not backed by the report: ' + must);

/* 7 · positioning is truthful and the current professional role stays visible */
const jl = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
assert.equal(jl.jobTitle, 'Data & AI Analyst'); for (const h of allHtml) assert.ok(!/AI\s*\/\s*ML\s+(engineer)|\bAI Engineer\b(?! roles)/i.test(h.replace(/<[^>]+>/g, ' ')) || /Open to[^.]*AI Engineer/i.test(h), 'must not title him an engineer');
assert.ok(!/AI\s*\/\s*ML\s+Engineer/i.test(document.title + document.querySelector('meta[name=description]').content), 'title and description');
const heroPro = txt(document.querySelector('.hero .proof .pro')); assert.match(heroPro, /^Professional · Data & AI Analyst\s*Apple \(client engagement\) · AI\/ML quality, data and operational analysis$/, 'the hero names the professional role with the client-engagement boundary'); assert.ok(!/\bat Apple\b|\bApple (employee|engineer)\b/i.test(txt(document.querySelector('.hero'))), 'the hero never implies direct Apple employment');
assert.match(txt(document.querySelector('.hero .proof-k')), /Independent open-source projects/, 'the hero says the projects are independent and open source'); assert.ok(document.querySelector('.hero a[href="#copilot"]') && document.querySelector('.hero a[href="#runtime"]') && document.querySelector('.hero a[href^="https://github.com/riteshmamidi0905-lab"]') && document.querySelector('.hero a[href="ritesh_mamidi_resume.pdf"]') && document.querySelector('.hero a[href="recruiter.html"]'), 'first screen links the flagships, the recruiter view, GitHub and the résumé');
assert.ok(document.querySelector('.hero .tagline').textContent.includes('Product-minded AI builder'));
assert.equal(prd.querySelectorAll('.prog-list li').length, 5, 'career progression (projects page)'); assert.equal(document.querySelectorAll('.prog-list').length, 0); assert.ok([...prd.querySelectorAll('.prog-k')].map((e) => e.textContent).join() === 'Professional,Professional,Independent build,Independent build,Independent build', 'professional vs independent work is labelled');
assert.ok(txt(document.querySelector('#experience .exp-lead')).includes('independent, open-source work'));
assert.deepEqual([...document.querySelectorAll('#experience .role-co')].map((e) => txt(e)), ['Apple (client engagement)', 'Heart Hospitality LLC', 'Liberated Monks Pvt. Ltd.'], 'company-first, scannable experience');
assert.ok(document.querySelector('#experience .exp-bridge') && /independent agent systems/.test(txt(document.querySelector('#experience .exp-bridge'))), 'one bridge to the independent work'); assert.ok(!/(built|developed|created|shipped)[^.]{0,60}(for|at) (Apple|my employer|a client)/i.test(txt(document.querySelector('#experience'))), 'no independent project is presented as employer or client work');

/* 8 · links from the Copilot surfaces are pinned or point at the repository root / release */
for (const doc of [document.querySelector('#copilot'), csDoc.querySelector('main')]) for (const a of doc.querySelectorAll(`a[href*="${SLUG}"]`)) { const h = a.getAttribute('href'); if (!h.startsWith('https://github.com/')) continue; assert.ok(h === `https://github.com/riteshmamidi0905-lab/${SLUG}` || h.endsWith('/releases/tag/' + C.SOURCE.release) || h.includes(C.SOURCE.sha), 'unpinned evidence link: ' + h); }
assert.equal(csDoc.querySelectorAll('h1').length, 1); assert.equal(csDoc.querySelectorAll('main').length, 1); assert.ok(csDoc.querySelector('.skip')); assert.equal(csDoc.querySelectorAll('.shots img').length, CP.screens.length);
for (const img of csDoc.querySelectorAll('img')) assert.ok(img.getAttribute('alt') && img.getAttribute('loading') === 'lazy', 'case-study screenshots have alt text and load lazily');
const csIds = [...csDoc.querySelectorAll('[id]')].map((e) => e.id); assert.equal(new Set(csIds).size, csIds.length, 'duplicate ids on the case study');
for (const f of ['assets/js/copilot.js', 'assets/js/scenes/scene-copilot.js', 'assets/copilot/SOURCE.json']) assert.ok(fs.existsSync(f), f);

/* 9 · confidentiality: a token that must never appear anywhere in the repository (checked by hash, so this file does not contain it) */
/* the employer is referred to as "Apple" and nothing more specific, anywhere in public text (patterns built from pieces so this file does not trip itself) */
const PROGRAM = new RegExp('Apple' + '\\s+' + 'Maps|hundreds' + ' of millions', 'i');
const BANNED = ['1c9d9e5648838d40234ae03a44342f02402ebe6593f96fde05fb72b10699206d'], seen = new Map();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { if (['node_modules', '.git'].includes(e.name)) return; const f = path.join(d, e.name); if (e.isDirectory()) return walk(f); if (!/\.(html|js|json|md|css|txt|xml|yml|yaml|svg|vtt)$/.test(e.name)) return; const raw = fs.readFileSync(f, 'utf8'); if (PROGRAM.test(raw)) assert.fail('the employer is named "Apple" only: a specific Apple programme is identified in ' + f);
    for (const t of new Set(raw.toLowerCase().split(/[^a-z0-9]+/))) { if (t.length < 4) continue; if (!seen.has(t)) seen.set(t, crypto.createHash('sha256').update(t).digest('hex')); if (BANNED.includes(seen.get(t))) assert.fail('a token that must never appear is present in ' + f); } });
walk(process.cwd());

/* the GitHub profile README is generated from the same claims and must be committed fresh */
const prof = require('./render-profile'); assert.equal(read('profile/README.md'), prof.md, 'profile/README.md is stale: run npm run profile');
assert.ok(!/AI\s*\/\s*ML\s+Engineer/i.test(prof.md) && prof.md.includes('not an LLM') && prof.md.includes('NOT EVALUATED'), 'profile README: truthful title and the same labels');
{ const t = prof.md.replace(/<[^>]+>/g, ' ').replace(/\(https?:[^)]*\)/g, ' ').replace(/`[^`]*`/g, ' ').replace(/v\d+\.\d+\.\d+/g, ' ').replace(/[A-Za-z]+-\d+/g, ' ').replace(/\d{4}-\d{2}-\d{2}/g, ' '); const ok = new Set([...C.allowedNumbers(), ...CP.allowNumbers, ...JSON.stringify(require('../content/agent-runtime.json')).match(/\d+(?:\.\d+)?/g), ...JSON.stringify(EVAL).match(/\d+(?:\.\d+)?/g)]);
  const head = t.slice(0, t.indexOf('## Also built')); const bad = [...new Set(head.match(/\d+(?:\.\d+)?/g))].filter((n) => !ok.has(n) && !['1', '2', '3'].includes(n)); assert.deepEqual(bad, [], 'profile README flagship section: numbers outside the claims'); }

/* ================= M10: the MAREF card, its evidence and the three-layer hierarchy ================= */
{
  const M = EVAL.maref, MC = M.card, MS = require('../content/evidence/maref/SOURCE.json');
  const mclaim = read('content/evidence/maref/CLAIM.md'), mres = JSON.parse(read('content/evidence/maref/results.json'));
  const norm = (t) => t.replace(/[`*>]/g, '').replace(/\s+/g, ' ');
  /* 1 · the card is exactly the approved wording, and every line of it is in the vendored canonical claim */
  assert.equal(MC.title, 'MAREF · Research prototype · MIXED');
  assert.equal(MC.numbers, '33/33 labelled failures detected · 36/154 clean runs flagged · 151/187 overall agreement');
  assert.equal(MC.claim, 'Pre-registered advantage vs shipped llmeval gates; no demonstrated advantage over stronger baselines or for trajectory-specific failures.');
  assert.equal(MC.link, 'Full evaluation →');
  for (const line of [MC.title, MC.numbers, MC.claim]) assert.ok(norm(mclaim).includes(line), 'card line is not in the canonical claim: ' + line);
  assert.ok(mclaim.includes('MIXED: agreement and false alarms hold, no trajectory-only failure mode qualifies'), 'the verbatim verdict is in the canonical claim');
  /* 2 · the numbers are the recorded, frozen-primary-label test-split numbers of the pinned commit */
  assert.equal(MS.sha, M.sha); assert.equal(MS.repo, M.repo); assert.match(M.sha, /^[0-9a-f]{40}$/);
  const ra = mres.by_source.all.detectors['MAREF-RA'];
  assert.equal(mres.labels, 'frozen'); assert.equal(mres.split, 'test'); assert.equal(ra.recall.split(' ')[0], '33/33'); assert.equal(ra.false_alarm.split(' ')[0], '36/154'); assert.equal(ra.agreement_with_labels.split(' ')[0], '151/187');
  assert.ok(mres.distinctness_decision.verdict.startsWith('MIXED'), 'recorded verdict is MIXED');
  /* 3 · the card on the page and in the recruiter view: same lines, and the evaluation link is the pinned public canonical evaluation */
  const EVAL_URL = `https://github.com/${M.repo}/blob/${M.sha}/docs/EVALUATION.md`;
  for (const [doc, id, label] of [[document, '#maref-card', 'index'], [rec, '#maref-card-r', 'recruiter'], [evd, '#maref-card', 'evaluation page']]) {
    const card = doc.querySelector(id); assert.ok(card, label + ': MAREF card present');
    assert.deepEqual([...card.querySelectorAll('p')].slice(0, 3).map((p) => p.textContent.replace(/\s+/g, ' ').trim()), [MC.title, MC.numbers, MC.claim], label + ': card lines');
    const a = card.querySelector('a'); assert.equal(a.textContent.trim(), MC.link, label + ': link text'); assert.equal(a.getAttribute('href'), EVAL_URL, label + ': the link points to the public canonical evaluation at the pinned commit');
  }
  /* 4 · 33/33 never stands alone, and the banned wording never appears, on any public surface */
  for (const [label, raw] of [['index', vis(document.body)], ['recruiter', vis(rec.body)], ['case study', vis(csDoc.body)], ['runtime page', vis(rtd.body)], ['evaluation page', vis(evd.body)], ['projects page', vis(prd.body)], ['profile README', prof.md.replace(/<[^>]+>/g, ' ')]]) {
    const t = raw.replace(/\s+/g, ' ');
    for (let i = t.indexOf('33/33'); i >= 0; i = t.indexOf('33/33', i + 1)) { const w = t.slice(Math.max(0, i - 220), i + 280); assert.ok(w.includes('36/154') && w.includes('151/187'), `${label}: 33/33 shown without 36/154 and 151/187 beside it`); }
    for (const re of [/independently validated/i, /production[- ]ready/i, /MAREF (outperforms|beats|is better than)/i, /MAREF does not beat/i, /better than (the )?baselines/i, /MAREF[^.]{0,40}\b(is|as) an? (AI |LLM )?agent\b/i])
      assert.ok(!re.test(t), `${label}: banned wording ${re}`);
    for (let i = t.indexOf('MAREF'); i >= 0; i = t.indexOf('MAREF', i + 1)) assert.ok(!/\bvalidated\b/i.test(t.slice(Math.max(0, i - 160), i + 240).replace(/not independent validation/gi, '')), `${label}: "validated" next to MAREF`);
    if (label !== 'case study' && /MAREF/.test(t)) assert.ok(/not independent validation/i.test(t), label + ': carries the not-independent-validation disclosure');
  }
  /* 5 · the three-layer hierarchy is stated the same way in the hero, the flagship list and the recruiter story; MAREF is an evaluator, not an agent */
  const LAYERS = ['I build AI agents', 'I build the infrastructure they run on', 'I evaluate how they fail'];
  assert.deepEqual([...document.querySelectorAll('.hero .proof .layer')].map((e) => e.textContent.trim()), LAYERS);
  assert.deepEqual(['#copilot', '#runtime', '#evaluation'].map((id) => txt(document.querySelector(id + ' .layer-l .layer')).trim()), LAYERS, 'each flagship section opens with its layer');
  assert.deepEqual([CP.title, RT.title, 'LLM evaluation: llmeval and MAREF'], [txt(document.querySelector('#copilot .world-title')), txt(document.querySelector('#runtime .world-title')), txt(document.querySelector('#evaluation .hm-title'))], 'flagship order and titles');
  assert.ok(/not an agent/.test(txt(evd.querySelector('#research'))) && /not an agent/.test(txt(document.querySelector('#maref'))), 'MAREF is described as an evaluator, not an agent');
  for (const d of [document, evd]) assert.ok(d.querySelector('#maref a[href="https://github.com/riteshmamidi0905-lab/agent-runtime-bench"]') && d.querySelector('#maref a[href="https://github.com/riteshmamidi0905-lab/maref"]'));
  assert.ok(/Research prototype/.test(txt(document.querySelector('.hero .proof'))), 'the hero chip says research prototype');
  assert.ok(!/in development|still on paper|no repository, no experiment/i.test(txt(document.querySelector('#evaluation'))), 'no stale "MAREF is only a proposal" wording');
  assert.ok(txt(document.querySelector('.hero .tagline')).includes('Product-minded AI builder'), 'the product / data / quality bridge stays in the hero');
}

/* ================= M11: the public surface after the real-model release (v0.7.0) ================= */
{
  const RMC = ['real-model-evaluation-status', 'real-model-expected-outcomes', 'real-model-controls-held', 'real-model-failure-classes', 'real-model-protocol-history'];
  assert.match(C.SOURCE.release, /^v0\.7\.\d+$/, 'the pinned Copilot release is a v0.7.x release (the first to carry the real-model run)'); assert.equal(C.MANIFEST.project_status.real_model_evaluation, 'executed');
  for (const id of RMC) { const c = C.BY_ID[id]; assert.ok(c && c.suitable_for.portfolio && !c.suitable_for.resume && c.model === 'real_llm' && c.evidence_class === 'real_model_single_run', 'real-model claim governed as a portfolio-only single-run claim: ' + id); }
  assert.deepEqual(RMC.slice(1).filter((id) => !csDoc.querySelector(`.ev-row[data-claim="${id}"]`)), [], 'the evidence table carries every real-model claim, with its qualification');
  const seen = new Set([...document.querySelectorAll('#copilot [data-claim]')].flatMap((e) => e.dataset.claim.split(/\s+/))); for (const id of ['real-model-expected-outcomes', 'real-model-controls-held', 'real-model-failure-classes']) assert.ok(seen.has(id), 'the homepage Copilot section cites ' + id);
  /* the historical distinction is kept: v0.6.0 had no real-model run, v0.7.0 did; the pages say so and none says the run never happened */
  assert.ok(txt(csDoc.querySelector('#real-model')).includes('v0.6.0') && txt(document.querySelector('#copilot')).includes('v0.6.0'), 'v0.6.0 is named as the release that predates the run');
  const surfaces = [['index', document.body], ['recruiter', rec.body], ['case study', csDoc.body], ['runtime page', rtd.body], ['evaluation page', evd.body], ['projects page', prd.body]].map(([l, b]) => [l, vis(b).replace(/\s+/g, ' ')]).concat([['profile README', prof.md.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')]]);
  const clean = (t) => t.replace(/not (an? )?(model |LLM |production )?(accuracy|success rate)|nor (an? )?(accuracy|success rate)/gi, ' ');
  for (const [label, t] of surfaces) {
    for (const m of t.matchAll(/(real-model evaluation[^.]{0,60}(was|has been|is|still needs)[^.]{0,40}not (been )?(executed|run)|which has not been run|not executed|no real[- ]model (run|evaluation|result)|has no real[- ]model)/gi)) assert.ok(/v0\.6\.0|predates|earlier release/i.test(t.slice(Math.max(0, m.index - 200), m.index + 120)), `${label}: says the real-model run never happened, outside the v0.6.0 distinction: "${m[0]}"`);
    for (const m of t.matchAll(/\b10 ?(\/|of) ?22\b/g)) { const w = t.slice(Math.max(0, m.index - 280), m.index + 360); assert.ok(/frozen expected outcome|expected-outcome attainment|as expected/i.test(w), `${label}: 10/22 without "frozen expected outcome" beside it`); assert.ok(!/\b(accuracy|success rate|customer quality|production quality)\b/i.test(clean(w)), `${label}: 10/22 described as accuracy, a success rate or quality`); }
    for (const re of [/prompt[- ]injection (is |was |has been )?solved/i, /secure against (prompt[- ]injection|injection)/i, /\bsafe LLM\b/i, /validated for production/i, /(?<!not )\bproduction[- ]ready\b/i, /injection[- ]proof/i, /(is|are|was) (now )?(fully |completely )?(secure|safe) (against|from) (attack|injection)/i]) assert.ok(!re.test(t), `${label}: banned claim ${re}`);
    for (const m of t.matchAll(/\b(4\s*\/\s*4|all four) (deterministic )?invariants?/gi)) assert.ok(!/\b(model|LLM)\b[^.]{0,40}\b(is|was) safe\b/i.test(t.slice(m.index - 100, m.index + 200)), label + ': invariants held is not a claim that the model is safe');
  }
  /* failures are as prominent as the result: the failure card sits beside the result card, and the four classes are all on the case study */
  assert.match(txt(document.querySelector('#copilot .hm-trio')), /10 \/ 22[\s\S]*frozen expected outcome[\s\S]*not accuracy/, '10/22 stays visible in the homepage Copilot section with its qualification'); assert.match(txt(csDoc.querySelector('#real-model')), /10 of 22 cases reached the frozen expected outcome[\s\S]*not accuracy/, '10/22 stays visible in the case study with its qualification');
  assert.ok(!/\b(489|92\/92|10\/22|43\/48)\b/.test(txt(document.querySelector('.hero .proof'))), 'the hero carries architecture and evidence language; raw counts live in the technical sections');
  assert.equal(document.querySelectorAll('#copilot .hm-trio .hm-card').length, 3); assert.ok(document.querySelector('#copilot .hm-fail .hm-list').children.length === 4, 'four failure classes on the homepage');
  assert.equal(csDoc.querySelectorAll('#real-model .rm-class').length, 4); assert.match(txt(csDoc.querySelector('#real-model')), /Amendment A1[\s\S]*replay[\s\S]*cumulatively/i);
  assert.ok(!/accuracy/i.test(clean(txt(document.querySelector('#copilot .hm-trio')))), 'no accuracy wording in the homepage result cards');
  /* the employer wording holds on every page (the hash-based token check above covers the whole repository; this covers wording) */
  for (const [label, t] of surfaces) assert.ok(!/Apple\s+Maps/i.test(t), label + ': the employer is "Apple"');
}

/* deterministic build */
const before = ALLFILES.map(read);
delete require.cache[require.resolve('../build')]; require('../build');
assert.deepEqual(ALLFILES.map(read), before, 'generated HTML is stale');
console.log('PASS: inventory, story order, links/anchors/assets, evidence honesty, research labels, no old-design remnants, recruiter view, claim governance (pinned evidence, portfolio-eligible claims only, number guard, labels, attack/draft stories vs reports, positioning, confidentiality), deterministic build');
