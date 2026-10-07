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
assert.equal(document.querySelectorAll('[data-world]').length, 14, 'hero + copilot + runtime + 4 chapter worlds + contact + 6 flagship scenes');
const order = [...document.querySelectorAll('main > section, main > .chapter, main > header')].map((s) => s.id);
assert.deepEqual(order, ['hero', 'build', 'copilot', 'runtime', 'evaluation', 'supporting', 'ai', 'data', 'product', 'flagships', 'experience', 'projects', 'about', 'contact'], 'story order: three flagships first, then the supporting evidence, then the career story');
assert.ok(document.querySelector('#evaluation #maref'), 'MAREF sits inside Flagship 03, after the tested metric suite');

/* ids unique; internal anchors + local assets resolve (incl. srcset) */
const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); assert.equal(new Set(ids).size, ids.length, 'duplicate ids: ' + ids.filter((x, i) => ids.indexOf(x) !== i));
for (const [doc, label] of [[document, 'index'], [rec, 'recruiter'], [parseHTML(read('support-escalation-copilot.html')).document, 'case study']]) {
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
assert.equal(rec.querySelectorAll('.proj > li').length, FLAG.length + 2, 'the Copilot + the agent runtime + the six supporting builds');
assert.match(rec.querySelector('.proj > li').textContent, /Support Escalation Copilot/, 'the Copilot leads the recruiter view');

/* AI Agent Runtime: every claim is bound to the pinned public-repo evidence and its limits are stated */
const RT = require('../content/agent-runtime.json');
const rtText = document.querySelector('#agent-runtime').textContent, all = document.body.textContent;
assert.equal(RT.sha.length, 40); assert.equal(plinks[RT.repo].sha, RT.sha); assert.equal(require('../content/project-evidence.json')[RT.repo], RT.sha);
for (const must of ['89', '3.9', '3.12', 'PostgreSQL 16', 'Docker Compose', '13 / 13', '100%']) assert.ok(rtText.includes(must), 'runtime evidence missing: ' + must);
assert.ok(rtText.includes('Runtime evaluation using deterministic stand-in and scripted models; not a benchmark of LLM quality.'), 'mandatory evaluation qualifier');
const qIdx = rtText.indexOf('not a benchmark of LLM quality'), sIdx = rtText.indexOf('13 / 13'); assert.ok(qIdx > sIdx && qIdx - sIdx < 800, 'qualifier must sit right after the numbers');
const prom = [...document.querySelectorAll('.rt-stats, #world-runtime .world-top, #world-runtime .world-steps, #world-runtime .world-cap')].map((e) => e.textContent).join(' ');
assert.ok(!/61\.5/.test(prom), 'final-answer rate must not be prominent'); assert.ok(/61\.5%/.test(document.querySelector('.rt-det').textContent), 'appears only inside the detailed explanation, with context');
assert.ok(document.querySelector('.rt-det').textContent.includes('by design'));
const lim = document.querySelector('.rt-lim').textContent; for (const k of ['No real language model has been exercised', 'verified in CI only', 'Not deployed as a live service', 'No run-cancellation', 'cannot be killed', 'estimates', 'heuristics']) assert.ok(lim.includes(k), 'limitation missing: ' + k);
assert.ok(!/production[- ]deployed|deployed to production|live in production/i.test(rtText), 'must not claim a production deployment');
assert.ok(!/real[- ]model[^.]*(was|were) (run|executed)|verified (locally )?with docker/i.test(rtText));
for (const a of document.querySelectorAll('#agent-runtime a[href^="https://github.com/"]')) { assert.ok(a.href.includes('/' + RT.repo), a.href); if (!/\/ai-agent-from-scratch$/.test(a.href)) assert.ok(a.href.includes(RT.sha), 'doc links are pinned to the commit: ' + a.href); }
assert.ok(document.querySelector('#projects').textContent.includes(RT.title));
assert.equal(P[0].r, 'support-escalation-copilot', 'the Copilot leads the library'); assert.equal(P[1].r, RT.repo, 'the agent runtime is second');

/* ================= M7 claim governance: Support Escalation Copilot, positioning, evidence labels, confidentiality ================= */
const { execFileSync } = require('child_process'), crypto = require('crypto');
const C = require('./claims'); const CP = require('../content/support-escalation-copilot.json'); const EVAL = require('../content/llm-eval-framework.json');
const csDoc = parseHTML(read('support-escalation-copilot.html')).document, SLUG = 'support-escalation-copilot';
const txt = (el) => el.textContent.replace(/\s+/g, ' ');

/* 1 · the vendored evidence is byte-identical to the pinned public commit (offline hash check; CI also re-fetches it) and the pins agree everywhere */
execFileSync(process.execPath, ['scripts/verify-evidence.js'], { stdio: 'pipe' });
assert.match(C.SOURCE.sha, /^[0-9a-f]{40}$/); assert.equal(C.SOURCE.repo.split('/')[1], SLUG);
assert.equal(plinks[SLUG].sha, C.SOURCE.sha); assert.equal(require('../content/project-evidence.json')[SLUG], C.SOURCE.sha); assert.equal(C.MANIFEST.repository && true, true);
assert.equal(plinks['llm-eval-framework'].sha, EVAL.sha); assert.equal(require('../content/project-evidence.json')['llm-eval-framework'], EVAL.sha);

/* 2 · every claim reference resolves to a claim the source repository marked portfolio-eligible; withheld claims never appear in any form */
for (const [doc, label] of [[document, 'index'], [csDoc, 'case study']]) for (const el of doc.querySelectorAll('[data-claim]')) for (const id of el.getAttribute('data-claim').split(/\s+/)) { assert.ok(C.BY_ID[id], `${label}: unknown claim ${id}`); assert.ok(C.BY_ID[id].suitable_for.portfolio, `${label}: ${id} is not portfolio-eligible`); }
const allHtml = [read('index.html'), read('recruiter.html'), read('support-escalation-copilot.html')];
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
for (const must of ['not an LLM', 'fictional', 'synthetic', 'never been deployed', 'Real-model evaluation was not executed', 'scripted']) assert.ok(cpText.includes(must), 'Copilot mandatory qualifier missing: ' + must);
assert.ok(!/(evaluated|tested|benchmarked|measured) (with|on|against) (an? )?(real )?(LLM|language model)/i.test(cpText.replace(/not (an? )?(real )?(LLM|language model)/gi, '')), 'must not imply an LLM was evaluated');
assert.ok(!/\b(production users?|paying customers?|saved \$|revenue|cost saving|in production)\b/i.test(txt(document.querySelector('#copilot').cloneNode(true)).replace(/never been deployed[^.]*\./, '')), 'no production, user, revenue or savings claim');

CP.steps.filter((st) => st.badge === 'simulated').forEach((st) => assert.match(st.text, /stand-in|scripted/i, 'a simulated step must say what stood in for the model: ' + st.label));
CP.stats.filter((st) => st.badge === 'simulated').forEach((st) => assert.match(st.note, /stand-in|scripted/i, 'a simulated figure must say what was scripted: ' + st.label));

/* 4 · the evidence layer: one vocabulary, defined once, used consistently */
const labels = Object.values(C.BADGES).map((b) => b[0]);
assert.deepEqual([...document.querySelectorAll('#build .ev-legend .ev')].map((e) => txt(e).trim()), labels, 'legend on the homepage'); assert.deepEqual([...csDoc.querySelectorAll('.cs-head .ev-legend .ev')].map((e) => txt(e).trim()), labels, 'legend on the case study');
for (const doc of [document, csDoc]) for (const e of doc.querySelectorAll('.ev')) { const k = [...e.classList].find((c) => c.startsWith('ev-') && c !== 'ev-m'); if (!k) continue; const key = k.slice(3); if (!C.BADGES[key]) continue; const t = txt(e).trim(); assert.ok(t === C.BADGES[key][0] || e.classList.contains('cap-ev') || t === '', `label text ${t} does not match ${key}`); }
for (const [k, [name]] of Object.entries(C.BADGES)) assert.ok(read('assets/js/worlds.js').includes(`'${k}': '${name}'`) || read('assets/js/worlds.js').includes(`${k}: '${name}'`), 'worlds.js label vocabulary differs from claims.js: ' + k);
assert.ok(document.querySelector('.paper-status .ev-not-evaluated'), 'MAREF is labelled not evaluated'); assert.ok(document.querySelector('#llmeval-evidence').textContent.includes(EVAL.qualifier), 'llmeval qualifier'); for (const [n] of EVAL.stats) assert.ok(document.querySelector('#llmeval-evidence').textContent.includes(n), 'llmeval figure ' + n);

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
assert.match(txt(document.querySelector('.hero .proof')), /Data & AI Analyst[\s\S]*Apple: validating/); assert.ok(document.querySelector('.hero a[href="#copilot"]') && document.querySelector('.hero a[href="#runtime"]') && document.querySelector('.hero a[href^="https://github.com/riteshmamidi0905-lab"]') && document.querySelector('.hero a[href="ritesh_mamidi_resume.pdf"]'), 'first screen links the flagships, GitHub and the résumé');
assert.ok(document.querySelector('.hero .tagline').textContent.includes('Product-minded AI builder'));
assert.equal(document.querySelectorAll('.prog-list li').length, 5, 'career progression'); assert.ok([...document.querySelectorAll('.prog-k')].map((e) => e.textContent).join() === 'Professional,Professional,Independent build,Independent build,Independent build', 'professional vs independent work is labelled');
assert.ok(txt(document.querySelector('#experience .exp-lead')).includes('independent, open-source work'));

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
{ const t = prof.md.replace(/<[^>]+>/g, ' ').replace(/\(https?:[^)]*\)/g, ' ').replace(/`[^`]*`/g, ' ').replace(/[A-Za-z]+-\d+/g, ' ').replace(/\d{4}-\d{2}-\d{2}/g, ' '); const ok = new Set([...C.allowedNumbers(), ...CP.allowNumbers, ...JSON.stringify(require('../content/agent-runtime.json')).match(/\d+(?:\.\d+)?/g), ...JSON.stringify(EVAL).match(/\d+(?:\.\d+)?/g)]);
  const head = t.slice(0, t.indexOf('## Supporting work')); const bad = [...new Set(head.match(/\d+(?:\.\d+)?/g))].filter((n) => !ok.has(n) && !['1', '2', '3'].includes(n)); assert.deepEqual(bad, [], 'profile README flagship section: numbers outside the claims'); }

/* deterministic build */
const before = [read('index.html'), read('recruiter.html'), read('support-escalation-copilot.html')];
delete require.cache[require.resolve('../build')]; require('../build');
assert.deepEqual([read('index.html'), read('recruiter.html'), read('support-escalation-copilot.html')], before, 'generated HTML is stale');
console.log('PASS: inventory, story order, links/anchors/assets, evidence honesty, research labels, no old-design remnants, recruiter view, claim governance (pinned evidence, portfolio-eligible claims only, number guard, labels, attack/draft stories vs reports, positioning, confidentiality), deterministic build');
