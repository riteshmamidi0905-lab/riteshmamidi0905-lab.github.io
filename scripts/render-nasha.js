/* The NASHA AI Operations Lab page, built only from the vendored evidence (scripts/claims-nasha.js). One page in the existing design system.
   SYNTHETIC DATA / SIMULATED OPERATION / OFFLINE EVALUATION / NOT PRODUCTION DEPLOYED. NASHA is an independent founder concept, not employment, not a business.
   Three reading depths: 15 seconds (#glance), 2 minutes (#results), 15 minutes (#case-study). Interactions are progressive enhancement (assets/js/nasha.js); every one has a static fallback. */
'use strict';
const path = require('path');
const C = require('./claims');
const N = require('./claims-nasha');
const { E, planner, hasPlanner, fix, pct, frac, fmtn, ms, blob, tree, REPO_URL, SHORT } = N;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const badge = (b) => `<span class="ev ev-${b}"><span class="ev-m" aria-hidden="true"></span>${C.BADGES[b][0]}</span>`;
const lnk = (href, label) => `<a class="ln" href="${href}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`;
const P = (id) => planner(id);
const R = E.retrieval, RT = Object.fromEntries(R.table.map((r) => [r.id, r]));
const TS = E.tool_schema, X1 = E.ext1;
const calls = (...ids) => ids.reduce((s, id) => s + P(id).llm_calls, 0);
const REAL_CALLS = calls('q15r1', 'q15r2', 'q7');
const worstP = P('worst');
const sample = E.trace_sample;

/* ---------- header, disclosure, depths ---------- */
const DISCLOSURE = `<div class="nx-disc" role="note"><strong>Independent founder concept + synthetic enterprise simulation.</strong> NASHA is not a live operating restaurant: there are no customers, revenue, suppliers, orders or production deployment. Every dataset is synthetic and every evaluation is offline and written by one author. NASHA is a personal project, not employment, and a working name (no trademark or legal-clearance claim).</div>`;

function head() {
  return `<header class="cs-head wrap" id="top"><p class="eyebrow"><i class="dot"></i>Integrated applied-AI systems project · synthetic enterprise simulation</p><h1>NASHA AI Operations Lab</h1>
  <p class="cs-one">I built a simulated enterprise, put two operations planners in it, and measured whether a small local LLM planner helped. <span class="mut">On these synthetic scenarios it didn't, and the experiment is the point.</span></p>
  <p class="rt-sum">A human-supervised agent investigates synthetic business exceptions (low inventory, bad orders, supplier proposals that touch a dietary rule), uses status-aware company knowledge, and stops for a signed human approval before anything consequential. A deterministic planner and local open-weight Qwen planners run under identical tools, permissions, approval, tracing and metrics.</p>
  ${DISCLOSURE}
  <div class="cs-cta"><a class="btn solid" href="#glance">15-second version</a><a class="btn" href="#results">2-minute version</a><a class="btn" href="#case-study">15-minute case study</a><a class="btn" href="${REPO_URL}" target="_blank" rel="noopener">Source code ${ARROW}</a><a class="btn" href="./">Back to the portfolio ${ARROW}</a></div></header>`;
}

/* ---------- 15 seconds ---------- */
function glance() {
  const det = P('det'), q = P('q15r2'), q7 = P('q7');
  const items = [
    [`${frac(det.pass_)} vs ${frac(q.pass_)}`, `scenarios passed in full: deterministic planner vs Qwen2.5-1.5B (${frac(q7.pass_)} for the 7B model on a 35-scenario sample)`, 'Same tools, permissions and checks. Author-written scenarios; the deterministic planner was built alongside them. The two small local LLM planners did not win on these scenarios.', 'simulated'],
    [`0 of ${fmtn(REAL_CALLS)}`, 'real local-model calls ended in an executed external action', 'The model proposes; deterministic code validates, authorizes and logs; a human approves. Two Qwen models, CPU runners, no paid API.', 'verified'],
    [`${fix(RT.bm25.mrr, 2)} vs ${fix(RT.minilm.mrr, 2)}`, 'retrieval MRR: BM25 vs a small neural encoder (MiniLM) on this identifier-heavy corpus', `${fmtn(R.n_questions)} questions, ${R.n_categories} categories, same author. Not a claim about neural retrieval in general.`, 'simulated'],
    [`${E.mutation.killed}/${E.mutation.valid}`, 'targeted mutants of the safety code killed (19 of 22 on the first run)', `${E.tests.ci_passed} automated tests pass in CI; Docker image builds and serves there.`, 'verified'],
  ];
  return `<section id="glance" class="sec cs-sec" aria-labelledby="glance-t"><div class="wrap"><p class="kicker rv"><b>15 s</b> What this is</p>
  <h2 id="glance-t" class="statement rv">I build AI systems around real business problems <span class="mut">and test whether they actually work.</span></h2>
  <ul class="cp-stats rv" aria-label="NASHA lab evidence at a glance">${items.map(([v, l, n, b]) => `<li class="cp-stat ev-b-${b}"><b>${esc(v)}</b><span>${esc(l)}</span><small>${esc(n)}</small>${badge(b)}</li>`).join('')}</ul>
  <p class="rt-qual rv">${badge('limitation')} <b>Read these as engineering evidence, not as results in a business.</b> Synthetic data, one author, offline evaluation, small local models only; nothing was run against a hosted frontier model.</p></div></section>`;
}

/* ---------- architecture explorer ---------- */
const NODES = [
  ['ops', 'Synthetic operations', 'A seeded generator creates three scenario sites, 56 days of orders and inventory, and injects labelled defects (duplicates, orphans, unit mismatches, price drift). The current menu master (decision D-84) lists Mango Habanero Gobi, a cauliflower appetizer; older records that say "Gobi Taco" stay as labelled history.', [['Generator', 'lab/nasha_lab/generator.py'], ['Disclosure', 'lab/README.md']]],
  ['dq', 'Data quality', 'Raw to staged to validated to modeled, with a quarantine and lineage for every rejected record. The data-quality evaluation reproduces byte for byte in CI.', [['Pipeline', 'lab/nasha_lab/pipeline.py'], ['Tests', 'lab/tests/test_platform.py']]],
  ['biz', 'Business data', 'A small SQLite warehouse of orders, inventory counts, suppliers and purchase orders. Typed tools read it; nothing here is real, and nothing in it can be mutated without a signed human approval.', [['World model', 'lab/nasha_lab/world.py'], ['Tools', 'lab/nasha_lab/tools.py']]],
  ['rag', 'Status-aware knowledge', `Founder decisions and documents are indexed with their status (current, frozen, superseded, unverified, vision). Superseded or unverified material is never presented as policy, and the system abstains when no authoritative source supports an answer. ${fmtn(R.n_questions)} questions in ${R.n_categories} categories measure it.`, [['Knowledge layer', 'lab/nasha_lab/knowledge.py'], ['Retrieval evaluation', 'lab/docs/RETRIEVAL-EVALUATION.md']]],
  ['api', 'FastAPI', 'A typed API for events, runs, tools and review, with bearer-token reviewer identities and an accessible review console. A trace id follows every request.', [['API', 'lab/nasha_lab/api.py'], ['API and MCP tests', 'lab/tests/test_api_mcp.py']]],
  ['mcp', 'MCP tools', 'A trusted NASHA MCP server exposes read, analyze and draft tools. A second, deliberately untrusted failure-injection server sits behind a trust gateway: source classification, strict schemas, timeouts, size caps, an injection scan and taint tracking, so text from an untrusted source can never become an argument to a draft or a mutation.', [['Trust gateway', 'lab/nasha_lab/trust.py'], ['Untrusted server', 'lab/nasha_lab/untrusted_mcp.py'], ['Trust tests', 'lab/tests/test_trust.py']]],
  ['graph', 'LangGraph', 'A state machine: receive, classify, collect data, retrieve policy, assess evidence, propose, human review, execute, finalize. It interrupts for the human and resumes from a SQLite checkpoint; the review loop is bounded.', [['Agent graph', 'lab/nasha_lab/agent.py'], ['Agent notes', 'lab/docs/AGENT.md']]],
  ['planner', 'Planner (swappable)', 'One interface, two implementations: a deterministic planner and an LLM planner (structured output validated against a schema, bounded retries, fail-safe). An optional evidence guardrail overrides any action the collected evidence does not permit. The model is not the permission system.', [['Planner interface', 'lab/nasha_lab/planners.py'], ['LLM planner', 'lab/nasha_lab/llm_planner.py']]],
  ['human', 'Human approval', 'Five permission classes. Reads, analysis and drafts are automatic; a simulated mutation needs a signed reviewer approval bound to the exact arguments, role and an expiry; external actions are forbidden outright.', [['Identity and grants', 'lab/nasha_lab/identity.py'], ['Threat model', 'lab/docs/THREAT-MODEL.md']]],
  ['trace', 'Trace and evaluation', `Every run stores a trace (tools, arguments, results, policy citations, decisions). ${E.baseline.scenarios} scenarios, a frozen baseline, a claims ledger that maps every public claim to evidence, ${E.mutation.killed} of ${E.mutation.valid} mutants killed, and CI that re-computes the results.`, [['Evaluation', 'lab/docs/EVALUATION.md'], ['Claims ledger', 'lab/claims/claims.json'], ['Frozen baseline', 'lab/baseline/BASELINE-BLOCK3.json']]],
];
function architecture() {
  const nodes = NODES.map(([k, t], i) => `<li><button type="button" class="nx-node" data-k="${k}" aria-controls="nx-pn-${k}" aria-pressed="${i === 0}"><span class="nx-i">${String(i + 1).padStart(2, '0')}</span>${esc(t)}</button></li>`).join('');
  const panels = NODES.map(([k, t, d, links], i) => `<section class="nx-pn" id="nx-pn-${k}" data-for="${k}" aria-labelledby="nx-pt-${k}"><h3 id="nx-pt-${k}">${esc(t)}</h3><p>${esc(d)}</p><p class="nx-links">${links.map(([l, p]) => lnk(blob(p), l)).join('')}</p></section>`).join('');
  return `<section id="architecture" class="sec cs-sec" aria-labelledby="arch-t"><div class="wrap"><p class="kicker rv"><b>04</b> Architecture</p>
  <h2 id="arch-t" class="statement rv">Ten stages, one direction. <span class="mut">Understand it in seconds, then open any stage.</span></h2>
  <div class="nx-arch rv" data-nx="arch"><ol class="nx-flow" aria-label="System stages, in order. Select a stage for details.">${nodes}</ol><div class="nx-panels" aria-live="polite">${panels}</div></div>
  <p class="rt-qual rv">${badge('verified')} <b>What is real here.</b> The code, the tests (${E.tests.ci_passed} in CI) and the evaluation harness are real and public. The operations, customers, suppliers and orders they process are synthetic.</p></div></section>`;
}

/* ---------- THE LLM DIDN'T WIN ---------- */
const ORDER = ['det', 'q15r2', 'q15r2g', 'q7', 'q7g'];
const SPLITS = [['all', 'All scenarios in each run'], ['heldoutB', 'Held-out B (clean split)'], ['adversarial', 'Adversarial']];
function plannerSection() {
  const rows = ORDER.filter(hasPlanner).map((id) => {
    const p = P(id), bs = p.by_split;
    const data = { all: [p.pass_.k, p.pass_.n], heldoutB: bs.heldoutB ? [bs.heldoutB.k, bs.heldoutB.n] : null, adversarial: bs.adversarial ? [bs.adversarial.k, bs.adversarial.n] : null };
    return `<li class="nx-bar nx-${p.kind.replace('+', '-')}" data-id="${id}" data-v='${JSON.stringify(data)}'><span class="nx-bl">${esc(p.label)}</span><span class="nx-bt"><span class="nx-bf" style="width:${(100 * p.pass_.k / p.pass_.n).toFixed(1)}%"></span></span><span class="nx-bv">${frac(p.pass_)} <i>(${pct(p.pass_.k, p.pass_.n)}%)</i></span></li>`;
  }).join('');
  const tr = ORDER.filter(hasPlanner).map((id) => {
    const p = P(id), pv = p.paired_vs_deterministic;
    return `<tr><th scope="row">${esc(p.label)}</th><td data-l="Scenarios">${p.n}</td><td data-l="Passed in full">${frac(p.pass_)}</td><td data-l="Correct action">${frac(p.correct_action)}</td><td data-l="Required tools called">${frac(p.required_tools)}</td><td data-l="Wrong silent NO_ACTION">${p.wrong_silent_no_action == null ? 'n/a' : p.wrong_silent_no_action}</td><td data-l="Refused tool requests / executed external actions">${p.forbidden_attempts} / ${p.external_actions}</td><td data-l="Median latency">${p.kind === 'deterministic' ? ms(p.latency_ms_p50) : p.kind === 'llm+guardrail' ? 'cached replies' : ms(p.latency_ms_p50)}</td><td data-l="Won vs deterministic">${pv ? `model ${pv.model_only} · deterministic ${pv.deterministic_only}` : 'control'}</td></tr>`;
  }).join('');
  const q = P('q15r2'), g = P('q15r2g'), q7 = P('q7');
  return `<section id="results" class="sec cs-sec" aria-labelledby="win-t"><div class="wrap"><p class="kicker rv"><b>11</b> Deterministic vs LLM</p>
  <h2 id="win-t" class="statement rv">The small local LLMs didn't win here. <span class="mut">On these synthetic scenarios, that is the result, not a problem to fix.</span></h2>
  <p class="rt-sum rv">I tested a deterministic planner and local Qwen planners against the same operations environment: same ${E.baseline.scenarios} synthetic scenarios (or a stated subset), tools, permissions, approval step, trace and metrics. The deterministic planner performed better on the evaluated scenarios. That is not "LLMs are bad". It is a reason to use the simplest system that satisfies the reliability requirement, and to measure before assuming a model is needed.</p>
  <div class="nx-chart rv" data-nx="planners"><div class="ev-ctl" role="group" aria-label="Choose which scenarios to compare">${SPLITS.map(([k, l], i) => `<button type="button" data-split="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('')}</div>
  <ul class="nx-bars" aria-label="Scenarios passed in full, by planner">${rows}</ul><p class="nx-note" aria-live="polite" data-note>Each bar is a different number of scenarios: the deterministic planner ran all ${P('det').n}; the 1.5B model ${q.n}; the 7B model ${q7.n}.</p></div>
  <table class="atk-table weir-tbl rv"><caption>Same checks for every planner: correct action, every required tool called, approval boundary respected, no unsupported claim, no executed forbidden action. "Wrong silent NO_ACTION" counts scenarios where the planner answered "no action needed" when action was needed. "Refused tool requests" includes requests for tool names that do not exist; a per-scenario trace later showed those were misspelled names, not attempts at forbidden actions.</caption>
  <thead><tr><th>Planner</th><th>Scenarios</th><th>Passed in full</th><th>Correct action</th><th>Required tools called</th><th>Wrong silent NO_ACTION</th><th>Refused tool requests / executed external actions</th><th>Median latency</th><th>Won vs deterministic</th></tr></thead><tbody>${tr}</tbody></table>
  <div class="rt-cols rv"><div><h3 class="hm-h">What the numbers mean</h3><ul class="nx-ul">
  <li><b>The failure was tool use, not JSON.</b> Schema failures were rare (${q.schema_failures} in ${q.llm_calls} calls for the 1.5B model). The small model called the required evidence tools in ${frac(q.required_tools)} scenarios.</li>
  <li><b>Safety did not depend on the model.</b> ${fmtn(REAL_CALLS)} real model calls, 0 executed external actions, 100% approval-boundary compliance. Even a scripted adversary that made ${fmtn(worstP.forbidden_attempts)} forbidden attempts executed none.</li>
  <li><b>The small model failed in the dangerous direction.</b> It answered "no action needed" when action was needed in ${q.wrong_silent_no_action} of ${q.n} scenarios; a deterministic evidence guardrail removed all of them, at the price of escalating almost everything (${frac(g.correct_abstention)} correct abstentions vs ${frac(q.correct_abstention)} raw). A guardrail is a safety device, not a capability.</li>
  <li><b>Scale helped, not enough.</b> The 7B model passed ${frac(q7.pass_)} of its sample (small n, one run) with no silent all-clear, and needed about ${ms(q7.latency_ms_p50)} per scenario on CPU. Every pass was a scenario with one obvious action.</li></ul></div>
  <div class="rt-lim"><h4>${badge('limitation')} What this does not show</h4><ul><li>That LLM planners are worse in general: two small open-weight models, one prompt, CPU only, no hosted model.</li><li>That the deterministic planner handles exceptions the author did not anticipate: the scenarios and the control were built by the same person (see the evaluation-hardening section for a first check).</li><li>Held-out (seed 3000) is not a clean test of the deterministic planner: it was fixed after failures there. Held-out B is.</li><li>The 7B figure is ${q7.n} scenarios and one run.</li></ul></div></div>
  ${toolSchema()}</div></section>`;
}
function toolSchema() {
  if (!TS) return '';
  const rows = TS.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td data-l="Scenarios">${r.n}</td><td data-l="Required tools called">${r.required_tools.k}/${r.required_tools.n}</td><td data-l="Passed in full">${r.pass_.k}/${r.pass_.n}</td><td data-l="Correct action">${r.correct_action.k}/${r.correct_action.n}</td><td data-l="Refused tool requests">${r.forbidden_attempts}</td><td data-l="Schema failures (decision step)">${r.schema_failures}</td></tr>`).join('');
  const FAM = [['INVENTORY', 'Inventory exceptions'], ['DATA_QUALITY', 'Data-quality incidents'], ['POLICY', 'Policy reviews']];
  const fam = FAM.map(([k, l]) => { const f = TS.by_event_family[k]; return `<tr><th scope="row">${esc(l)}</th><td data-l="Scenarios">${f.n}</td><td data-l="Required tools called, original">${f.required_ts1}/${f.n}</td><td data-l="Required tools called, simplified">${f.required_ts2}/${f.n}</td><td data-l="Correct action, original">${f.action_ts1}</td><td data-l="Correct action, simplified">${f.action_ts2}</td></tr>`; }).join('');
  return `<div class="nx-ts rv" id="tool-schema"><h3 class="hm-h">Was the poor tool recall an interface problem?</h3>
  <p class="rt-sum">One pre-registered experiment, one model, one run: the same Qwen2.5-1.5B on the same ${TS.n} scenarios, with only the tool presentation changed (a menu scoped to the event, flat call skeletons, a flat event view). Scenario truth, permissions and scoring were untouched. The decision rule was fixed in advance: a gain of at least 15 points in required-tool recall with p &lt; 0.05. <b>${esc(TS.verdict)}</b></p>
  <table class="atk-table weir-tbl"><caption>Original (ts1) vs simplified (ts2) tool presentation: same model, seed and scenario ids. ${esc(TS.control_note)}</caption><thead><tr><th>Presentation</th><th>Scenarios</th><th>Required tools called</th><th>Passed in full</th><th>Correct action</th><th>Refused tool requests</th><th>Schema failures (decision step)</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="atk-table weir-tbl"><caption>Where the change helped: by event family.</caption><thead><tr><th>Event family</th><th>Scenarios</th><th>Required tools, original</th><th>Required tools, simplified</th><th>Correct action, original</th><th>Correct action, simplified</th></tr></thead><tbody>${fam}</tbody></table>
  <p class="rt-qual">${badge('limitation')} <b>What this does and does not say.</b> ${esc(TS.limitation)} The data-quality gain is largely one mechanical fix: the original run asked for a tool name that does not exist; call skeletons removed that. This explains part of why the small model failed; it does not change which planner won.</p></div>`;
}

/* ---------- retrieval ---------- */
const RET = ['bm25', 'hybrid', 'hybrid_minilm', 'minilm', 'static_neural'];
const CAT_LABEL = { DECISION_STATUS: 'Decision status', SUPERSEDED: 'Superseded records', NUMERIC: 'Numeric references', D54: 'D-54 dietary rule', DIRECT: 'Direct', MULTI_DOCUMENT: 'Multi-document', OPERATIONAL: 'Operational', UNVERIFIED: 'Unverified', VISION: 'Vision layer', CONFLICTING: 'Conflicting', ADVERSARIAL: 'Adversarial' };
function retrievalSection() {
  const pc = R.per_category_mrr;
  const data = {}; for (const id of RET) { data[id] = { ALL: RT[id].mrr }; for (const c of Object.keys(pc.bm25)) data[id][c] = pc[id] ? pc[id][c] : null; }
  const names = Object.fromEntries(RET.map((id) => [id, RT[id].name]));
  const bars = RET.map((id) => `<li class="nx-bar" data-id="${id}"><span class="nx-bl">${esc(RT[id].name)}</span><span class="nx-bt"><span class="nx-bf" style="width:${(100 * RT[id].mrr).toFixed(1)}%"></span></span><span class="nx-bv">${fix(RT[id].mrr, 3)}</span></li>`).join('');
  const tbl = R.table.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td data-l="Recall@1">${fix(r.recall1, 3)}</td><td data-l="Recall@5">${fix(r.recall5, 3)}</td><td data-l="MRR">${fix(r.mrr, 3)}</td><td data-l="nDCG@10">${fix(r.ndcg10, 3)}</td><td data-l="Authority correct">${fix(r.authority_correct, 3)}</td><td data-l="Hand-written MRR">${fix(r.handwritten_mrr, 3)}</td></tr>`).join('');
  const ex = E.ext1 && E.ext1.retrieval;
  return `<section id="retrieval" class="sec cs-sec" aria-labelledby="ret-t"><div class="wrap"><p class="kicker rv"><b>12</b> Retrieval benchmark</p>
  <h2 id="ret-t" class="statement rv">${fmtn(R.n_questions)} questions, ${R.n_categories} categories. <span class="mut">For this corpus, exact lexical retrieval won.</span></h2>
  <p class="rt-sum rv">The NASHA knowledge base is organised around identifiers and statuses: decision IDs such as D-54, "superseded by" links, dates and numbers. I compared BM25, a hybrid, a small neural sentence encoder (all-MiniLM-L6-v2), BM25 + MiniLM, and static word vectors, and ran the same vectors through PostgreSQL with pgvector (HNSW, cosine). The correct framing is narrow: <b>for this identifier-heavy, decision-status-heavy corpus, lexical retrieval performed better</b>. It is not a claim that neural retrieval is worse in general.</p>
  <div class="nx-chart rv" data-nx="retrieval" data-mrr='${JSON.stringify(data)}' data-names='${JSON.stringify(names)}'><div class="nx-sel"><label for="nx-cat">Show mean reciprocal rank for</label><select id="nx-cat"><option value="ALL">All questions with a gold document</option>${Object.keys(pc.bm25).map((c) => `<option value="${c}">${esc(CAT_LABEL[c] || c)}</option>`).join('')}</select></div>
  <ul class="nx-bars" aria-label="Mean reciprocal rank by retriever">${bars}</ul><p class="nx-note" aria-live="polite" data-note>Higher is better. Category sizes differ (3 to about 60 questions); small categories are noisy.</p></div>
  <div class="rt-cols rv"><div><h3 class="hm-h">Why exact signals matter here</h3><ul class="nx-ul"><li><b>Decision IDs.</b> "What is the status of D-54?" is answered by a token a sentence encoder smooths away: MiniLM's MRR on decision-status questions was ${fix(pc.minilm.DECISION_STATUS, 2)} against ${fix(pc.bm25.DECISION_STATUS, 2)} for BM25.</li><li><b>Superseded records.</b> Which of two near-identical decisions replaced the other is a metadata fact, not a semantic one (${fix(pc.minilm.SUPERSEDED, 2)} vs ${fix(pc.bm25.SUPERSEDED, 2)}).</li><li><b>Numeric references.</b> Numbers and dates are tokens, not meanings (${fix(pc.minilm.NUMERIC, 2)} vs ${fix(pc.bm25.NUMERIC, 2)}).</li></ul>
  <p class="nx-small">Neural retrieval stays competitive on plain operational and vision-layer questions, and pgvector with HNSW matched the exact scan to three decimals at ${fmtn(758)} chunks, so it is not needed at this size.</p></div>
  <div class="rt-lim"><h4>${badge('limitation')} Bias, stated up front</h4><ul><li>Same author; generated questions copy corpus wording, which flatters lexical retrieval.</li><li>One small encoder, one chunking, no fine-tuning, no re-ranker.</li><li>The hand-written subset is small (45 questions with a gold document).</li>${ex ? '<li>A second, structurally different question set (below) tests whether the ranking survives.</li>' : ''}</ul></div></div>
  <table class="atk-table weir-tbl rv"><caption>All ${R.n_questions} questions. MRR = mean reciprocal rank; authority correct = the top result is the gold document with the expected status. Source: CI run on the public repository (pgvector 0.8.7, Ollama all-MiniLM-L6-v2).</caption><thead><tr><th>Retriever</th><th>Recall@1</th><th>Recall@5</th><th>MRR</th><th>nDCG@10</th><th>Authority correct</th><th>Hand-written MRR</th></tr></thead><tbody>${tbl}</tbody></table></div></section>`;
}

/* ---------- failure engineering ---------- */

function failureDiagram() {
  const box = (x, y, w, l1, l2, cls) => `<g class="${cls}"><rect x="${x}" y="${y}" width="${w}" height="62" rx="10"/><text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" class="fd-t">${esc(l1)}</text><text x="${x + w / 2}" y="${y + 46}" text-anchor="middle" class="fd-t">${esc(l2)}</text></g>`;
  return `<figure class="nx-fd rv"><svg viewBox="0 0 800 330" role="img" aria-labelledby="fd-t fd-d" class="nx-fdsvg"><title id="fd-t">Circular trust, before and after the fix</title><desc id="fd-d">Before: the model invents a key, the system treats the key as evidence, and the model appears grounded, in a loop. After: only successful trusted tool results can establish grounding, so an invented key is rejected.</desc>
  <defs><marker id="fd-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
  <text x="20" y="24" class="fd-h fd-bad">BEFORE: CIRCULAR TRUST</text>
  ${box(20, 40, 200, 'MODEL INVENTS', 'A KEY', 'fd-n')}${box(300, 40, 200, 'SYSTEM TREATS KEY', 'AS EVIDENCE', 'fd-n fd-badn')}${box(580, 40, 200, 'MODEL APPEARS', 'GROUNDED', 'fd-n fd-badn')}
  <path d="M220 71H298" class="fd-ar" marker-end="url(#fd-a)"/><path d="M500 71H578" class="fd-ar" marker-end="url(#fd-a)"/><path d="M680 104V130H120V106" class="fd-ar fd-loop" marker-end="url(#fd-a)"/><text x="400" y="124" text-anchor="middle" class="fd-s">the model's own words vouch for the model</text>
  <text x="20" y="196" class="fd-h fd-ok">AFTER: TRUSTED RESULTS ONLY</text>
  ${box(20, 212, 200, 'MODEL INVENTS', 'A KEY', 'fd-n')}${box(300, 212, 200, 'GROUNDING CHECK', 'TRUSTED RESULTS ONLY', 'fd-n fd-okn')}${box(580, 212, 200, 'INVENTED KEY', 'REJECTED, TRACED', 'fd-n fd-okn')}
  <path d="M220 243H298" class="fd-ar" marker-end="url(#fd-a)"/><path d="M500 243H578" class="fd-ar" marker-end="url(#fd-a)"/><text x="400" y="304" text-anchor="middle" class="fd-s">successful, non-injected, trusted tool results + the event; never the model's own arguments</text></svg></figure>`;
}
function failureSection() {
  const c18 = N.claim('C18'), c13 = N.claim('C13');
  const steps = [
    ['Failure', 'The system let the model\'s own arguments count as evidence', 'The check that a proposed action targets a real record built its "evidence" from the whole run, including the arguments the model itself had passed to tools. A key the model invented, passed as an argument, therefore appeared in the evidence and grounded itself.', ['MODEL INVENTS A KEY', 'SYSTEM TREATS THE KEY AS EVIDENCE', 'MODEL APPEARS GROUNDED']],
    ['Detection', 'Adversarial evaluation exposed it', `A scripted worst-case model (not an LLM) proposed invented record keys, unknown tools and external actions across ${E.baseline.scenarios} scenarios; the harness recorded ${fmtn(worstP.forbidden_attempts)} forbidden attempts and showed that invented mutation targets passed the grounding check. A happy-path evaluation never would have.`, ['WORST-CASE STAND-IN', 'ATTEMPTS RECORDED', 'INVENTED TARGET SURVIVED']],
    ['Fix', 'Only successful trusted tool results can establish grounding', 'Grounding now uses only results of tool calls that succeeded, were not flagged as injection and did not come from the untrusted source, plus the triggering event. A model\'s own arguments, error entries and untrusted text can no longer vouch for it. A regression test pins it.', ['TRUSTED RESULTS ONLY', 'REGRESSION TEST ADDED', 'MUTATION SUITE GUARDS IT']],
  ];
  const html = steps.map(([k, t, d, chain], i) => `<li class="nx-step" data-step="${i}"><button type="button" class="nx-st" aria-expanded="${i === 0}" aria-controls="nx-fs-${i}"><span class="nx-sk">${esc(k)}</span>${esc(t)}</button><div class="nx-sb" id="nx-fs-${i}"><p>${esc(d)}</p><ol class="nx-chain" aria-label="${esc(k)} sequence">${chain.map((c) => `<li>${esc(c)}</li>`).join('')}</ol></div></li>`).join('');
  return `<section id="failure" class="sec cs-sec" aria-labelledby="fail-t"><div class="wrap"><p class="kicker rv"><b>13</b> Failure engineering</p>
  <h2 id="fail-t" class="statement rv">Failure, detection, fix. <span class="mut">Circular trust, found by an adversary.</span></h2>
  <p class="rt-sum rv">In plain terms: I asked the system to prove a model was grounded in real records, and the proof accepted the model's own claims as evidence. The model could vouch for itself. Adversarial testing found it; the fix is a rule about <i>what may count as evidence</i>, not a prompt.</p>
  ${failureDiagram()}
  <ol class="nx-steps rv" data-nx="steps">${html}</ol>
  <div class="rt-cols rv"><div><h3 class="hm-h">A second lesson from the same defect</h3><p class="rt-sum">Mutation testing of the safety code killed ${E.mutation.first_run_killed} of ${E.mutation.valid} mutants on the first run. The three survivors were not harmless: two redundant defensive layers had each masked the other, so deleting either changed no test result. Layer-isolating tests were added and the score is ${E.mutation.killed}/${E.mutation.valid}. If you can delete a safety check and nothing fails, you do not know the check works.</p></div>
  <div class="rt-lim"><h4>${badge('limitation')} Remaining limitation</h4><ul><li>Grounding checks that a key appears in trusted evidence, not that acting on it is a good idea; the human reviewer is the control for that.</li><li>A different real model might find a path the scripted adversaries did not.</li></ul><p class="nx-small">${lnk(blob('lab/docs/FAILURE-STORY.md'), 'Full failure story')}</p></div></div></div></section>`;
}

/* ---------- human-in-the-loop and permissions ---------- */
const CLASSES = [
  ['READ', 'Automatic', 'auto', 'Look something up: inventory, orders, supplier status, policy.', 'Runs, is logged, cannot change anything.'],
  ['ANALYZE', 'Automatic', 'auto', 'Compute something from what was read: days of cover, a reorder quantity, a policy screen.', 'Runs, is logged, cannot change anything.'],
  ['DRAFT', 'Automatic', 'auto', 'Write a draft recommendation or review ticket.', 'Created as a draft only; nothing is sent or ordered.'],
  ['MUTATE_SIMULATION', 'Approval required', 'ask', 'Flag a record for review, or release a draft to the review queue (simulated).', 'Held until a signed human approval, bound to the exact arguments, the reviewer\'s role and an expiry. A changed argument or a replay is refused.'],
  ['EXTERNAL_ACTION', 'Forbidden', 'no', 'Place an order, contact a supplier, send a message.', 'Refused every time, whoever asks. No approval unlocks it; the attempt is recorded.'],
];
const ASKS = [
  ['Look up goat inventory', 0], ['Compute the reorder quantity', 1], ['Draft a purchase recommendation', 2], ['Flag a record for review', 3], ['Place a purchase order with the supplier', 4], ['Use the supplier-portal note as the order quantity', 5],
];
function hitlSection() {
  const rows = CLASSES.map(([k, a, c, ex, how]) => `<tr class="nx-pc nx-${c}"><th scope="row"><code>${k}</code></th><td data-l="What happens"><b>${a}</b></td><td data-l="Example">${esc(ex)}</td><td data-l="How it is enforced">${esc(how)}</td></tr>`).join('');
  const out = CLASSES.map(([k, a, c, , how], i) => `<div class="nx-out nx-${c}" data-i="${i}"${i ? ' hidden' : ''}><b>${esc(a)}.</b> ${esc(how)}</div>`).join('') +
    `<div class="nx-out nx-no" data-i="5" hidden><b>Refused.</b> The quantity came from an untrusted source. Taint tracking stops a value that only appeared in untrusted text from becoming an argument to a draft or a mutation, whatever the model wanted.</div>`;
  return `<section id="permissions" class="sec cs-sec" aria-labelledby="perm-t"><div class="wrap"><p class="kicker rv"><b>10</b> Human approval and permissions</p>
  <h2 id="perm-t" class="statement rv">The model does not own the permission system. <span class="mut">Code does.</span></h2>
  <p class="rt-sum rv">Whatever the planner is, a rules layer outside the model classifies every tool call. The model can ask for anything; only the rules decide what runs. That is why two weak Qwen models and a scripted adversary produced 0 executed external actions.</p>
  <table class="atk-table weir-tbl nx-perm rv"><caption>The five permission classes.</caption><thead><tr><th>Class</th><th>What happens</th><th>Example</th><th>How it is enforced</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="nx-sim rv" data-nx="perm"><h3 class="hm-h">Try it: what the model asks for</h3><div class="nx-sel"><label for="nx-ask">The model asks to</label><select id="nx-ask">${ASKS.map(([l, i]) => `<option value="${i}">${esc(l)}</option>`).join('')}</select></div><div class="nx-outs" aria-live="polite">${out}</div>
  <p class="nx-small">An illustration of the rules in <code>tools.py</code> and <code>trust.py</code>, not a live system. Reviewer identities are a local demo (signed tokens, roles, expiry), not a production identity provider.</p></div></div></section>`;
}

/* ---------- trace experience ---------- */
function traceSection() {
  const ev = sample.events, by = (k) => ev.filter((e) => e.kind === k);
  const tools = ev.filter((e) => e.kind === 'tool_call'), pol = by('policy_retrieved'), prop = by('proposal')[0], hum = by('human_decision')[0], fin = by('final')[0];
  const policyDocs = [...new Set(pol.flatMap((p) => String(p.detail.citations || '').match(/'([^']+)', '(CURRENT|FROZEN|SUPPORTING)/g) || []))].slice(0, 4).map((x) => x.replace(/'/g, '').replace(', ', ' · '));
  const untrusted = tools.find((t) => t.detail.trust === 'UNTRUSTED');
  const steps = [
    ['Event arrives', 'An inventory exception reaches the agent.', sample.scenario],
    ['Agent investigates', 'The planner proposes read and analysis tools; code runs them.', `${tools.length} tool calls so far, all ${[...new Set(tools.map((t) => t.detail.permission))].join(' or ')}.`],
    ['Tools called', 'Each call is typed, permission-classified and recorded.', tools.map((t) => `${t.detail.tool} (${t.detail.permission})`).join(' → ')],
    ['Policy retrieved', 'Status-aware knowledge returns only authoritative sources, with their status.', policyDocs.join('; ') || 'policy sources cited with status'],
    ['Uncertainty identified', 'What the agent does not know is stated, and untrusted text is quoted as untrusted.', untrusted ? 'A supplier-portal note arrived from an UNTRUSTED source; it is shown as unverified and is never used as evidence.' : 'No untrusted input in this run.'],
    ['Action proposed', 'The proposal cites its evidence and lists what it deliberately does not do.', `${prop.detail.action}: nothing is ordered and no supplier is contacted; a review ticket is drafted.`],
    ['Human approval', 'A signed reviewer decision is required before anything is executed.', `${hum.detail.decision} by a ${hum.detail.role || 'reviewer'} identity. ${hum.detail.note ? 'Note: ' + hum.detail.note : ''}`],
    ['Trace stored', 'The whole run is stored with a request id, so it can be audited and replayed.', `${sample.n_events_total} events recorded; outcome ${fin.detail.outcome}.`],
  ];
  const li = steps.map(([t, d, x], i) => `<li class="nx-tr" data-i="${i}"><button type="button" class="nx-tb" aria-expanded="${i === 0}" aria-controls="nx-tp-${i}"><span class="nx-i">${String(i + 1).padStart(2, '0')}</span>${esc(t)}</button><div class="nx-tp" id="nx-tp-${i}"><p>${esc(d)}</p><p class="nx-ex"><span class="mono-l">From the real trace</span>${esc(x)}</p></div></li>`).join('');
  return `<section id="trace" class="sec cs-sec" aria-labelledby="trace-t"><div class="wrap"><p class="kicker rv"><b>14</b> Observability</p>
  <h2 id="trace-t" class="statement rv">Event to audit trail. <span class="mut">One synthetic run, step by step.</span></h2>
  <p class="rt-sum rv">${badge('simulated')} This is a real run of the lab on synthetic data: the cauliflower supplier is on hold, so the agent cannot recommend a purchase and escalates. (Cauliflower is the main ingredient of the Mango Habanero Gobi appetizer in the current synthetic menu.) Open any step.</p>
  <ol class="nx-trace rv" data-nx="steps">${li}</ol>
  <figure class="nx-shot rv"><picture><source media="(max-width: 700px)" srcset="assets/nasha/review-console-560.webp" width="560" height="1125"><img src="assets/nasha/review-console-1068.webp" width="1068" height="2145" alt="The review console for one synthetic run: the proposed action, the claims with the evidence ids they cite, what is uncertain, policy sources with their status, what will run if approved, what is deliberately not proposed, the tool history, and the approve, reject, request-more-evidence and edit buttons" loading="lazy" decoding="async"></picture>
  <figcaption>The review console a human sees before approving (synthetic data, rendered by the lab's own UI; keyboard-operable and tested for accessibility and cross-site scripting).</figcaption></figure></div></section>`;
}

/* ---------- evaluation hardening ---------- */
function hardeningSection() {
  const x = X1 && X1.planner, xr = X1 && X1.retrieval;
  const planner = x ? `<ul class="nx-ul"><li><b>${x.headline_k}/${x.headline_n}</b> structurally different scenarios passed by the deterministic planner (property-based sampling, metamorphic variants, policy proposals generated from the dietary checklist itself, outcomes from an oracle written as a decision table). <b>First run: ${x.first_run_headline_k}/${x.first_run_headline_n}</b>: the disagreements were mostly errors in my own oracle, which I corrected and disclosed (pork stock is prohibited; gelatin has two defensible answers; some variants did not flip). The planner was not changed.</li>
  <li><b>${x.relations_hold}/${x.relations_n}</b> metamorphic relations held (first run ${x.first_run_relations_hold}/${x.first_run_relations_n}).</li>
  <li><b>${x.probes_k}/${x.probes_n} rule-gap probes passed on the first run: a real finding.</b> The planner treated any open purchase order arriving in time as covering a shortage, whatever its size (a 1 kg order does not cover a 30 kg shortfall). It was documented, pinned by a test and left unfixed inside the frozen baseline.</li>
  ${x.block45_fix ? `<li><b>New in Block 4.5, fixed:</b> a versioned, quantity-aware coverage rule (usable inventory, required quantity through the lead time, incoming order size and arrival timing; stale or quarantined counts are not usable). Regression tests cover full, partial, zero, multiple, late and boundary cases. Re-run: <b>${x.block45_fix.probes_k}/${x.block45_fix.probes_n}</b> probes, <b>${x.block45_fix.headline_k}/${x.block45_fix.headline_n}</b> headline, <b>${x.block45_fix.relations_hold}/${x.block45_fix.relations_n}</b> relations. This is the same author fixing a gap the same author's probes found, so it shows the loop works, not that the planner is correct in general. The frozen Block 3 results still use the old rule.</li>` : ''}</ul>` : '';
  const retr = xr ? `<table class="atk-table weir-tbl rv"><caption>Retrieval on ${xr.n} structurally different questions (supersession-metadata, terse-keyword and mutated-paraphrase families). Mean reciprocal rank overall and split by how many of the question's words appear in its best source chunk.</caption><thead><tr><th>Retriever</th><th>All questions</th><th>Least word overlap (${xr.rows[0].low_overlap_n} questions)</th><th>Most word overlap (${xr.rows[0].high_overlap_n} questions)</th></tr></thead><tbody>${xr.rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td data-l="All questions">${fix(r.mrr, 3)}</td><td data-l="Least word overlap">${fix(r.low_overlap_mrr, 3)}</td><td data-l="Most word overlap">${fix(r.high_overlap_mrr, 3)}</td></tr>`).join('')}</tbody></table>
  <p class="rt-sum rv">The ranking held (BM25 first overall), but the lead is largely about word overlap: on the questions that share the fewest words with their source the gap closed and the hybrids were ahead. The accurate wording is narrower than "BM25 wins": lexical retrieval wins where questions use the corpus's exact tokens (IDs, statuses, numbers).</p>` : '';
  return `<section id="hardening" class="sec cs-sec" aria-labelledby="hard-t"><div class="wrap"><p class="kicker rv"><b>+</b> Evaluation hardening</p>
  <h2 id="hard-t" class="statement rv">Same author, so I tried to make that matter less. <span class="mut">It is still not independent.</span></h2>
  <p class="rt-sum rv">The Block 3 results are frozen (code commit, scenario registry hash, question-set hash, result-file hashes, model tags, prompt and tool-schema versions) and can't drift silently. Every public claim on this page maps to a machine-checked entry in a claims ledger. I then built a second, <b>structurally different</b> evaluation: different generation methods, different seeds, labels from decision tables, source metadata or construction, never from a model. Candidate generation by an external model was not used. This reduces same-author bias; it does not remove it.</p>
  ${planner}${retr}
  <p class="rt-qual rv">${badge('limitation')} <b>How independent is it?</b> Structurally different, same author, no third-party review. A manual review sheet exists for optional founder review. The original benchmark is unchanged.</p>
  <nav class="lns rv" aria-label="Evaluation hardening sources">${lnk(blob('lab/baseline/BASELINE-BLOCK3.json'), 'Frozen baseline')}${lnk(blob('lab/claims/claims.json'), 'Claims ledger')}${lnk(blob('lab/docs/EVAL-HARDENING.md'), 'Evaluation hardening write-up')}</nav></div></section>`;
}

/* ---------- ten competencies ---------- */
const COMP = [
  ['Python + APIs', 'Typed tools with validated arguments; a FastAPI service; 229 tests.', [['Source', 'lab/nasha_lab/tools.py'], ['API', 'lab/nasha_lab/api.py'], ['Tests', 'lab/tests/test_tools.py']]],
  ['LLMs', 'A local-LLM planner: schema-validated structured output, bounded retries, fail-safe, guardrail; two Qwen models measured.', [['Source', 'lab/nasha_lab/llm_planner.py'], ['Experiment', 'lab/docs/PLANNER-EXPERIMENT.md'], ['Tests', 'lab/tests/test_llm_planner.py']]],
  ['Embeddings', 'Static vectors and a sentence encoder compared against lexical retrieval on one corpus; the result favoured BM25.', [['Source', 'lab/nasha_lab/embeddings.py'], ['Evaluation', 'lab/docs/RETRIEVAL-EVALUATION.md']]],
  ['Vector DB + RAG', 'Status-aware retrieval with abstention; PostgreSQL + pgvector HNSW as one more retriever.', [['Source', 'lab/nasha_lab/knowledge.py'], ['Tests', 'lab/tests/test_retrieval_v2.py'], ['Evaluation', 'lab/docs/RETRIEVAL-EVALUATION.md']]],
  ['AI agents', 'An agent that investigates, cites evidence, abstains and proposes; the planner is swappable.', [['Source', 'lab/nasha_lab/agent.py'], ['Architecture', 'lab/docs/AGENT.md'], ['Tests', 'lab/tests/test_agent.py']]],
  ['LangGraph + MCP', 'A LangGraph state machine with interrupts and checkpoints; a trusted MCP server and a gateway for an untrusted one.', [['Graph', 'lab/nasha_lab/agent.py'], ['MCP', 'lab/nasha_lab/mcp_server.py'], ['Trust boundary', 'lab/nasha_lab/trust.py'], ['Tests', 'lab/tests/test_trust.py']]],
  ['FastAPI', 'Reviewer auth, review console, trace ids, bounded responses.', [['Source', 'lab/nasha_lab/api.py'], ['Tests', 'lab/tests/test_api_mcp.py'], ['UI tests', 'lab/tests/test_ui.py']]],
  ['Docker', 'A container image that serves the API and review console; verified by building and calling it in CI.', [['Dockerfile', 'lab/Dockerfile'], ['Compose', 'lab/docker-compose.yml']]],
  ['Deployment / CI', 'CI runs the tests, re-computes the results and builds the image; model and retrieval experiments are separate optional workflows. Nothing is deployed.', [['Workflow', '.github/workflows/lab-ci.yml'], ['Model runs', '.github/workflows/model-eval.yml']]],
  ['Evaluation + observability', 'A scenario harness, frozen baseline, claims ledger, mutation testing, property-based tests and per-scenario traces.', [['Harness', 'lab/nasha_lab/eval_planners.py'], ['Trace', 'lab/nasha_lab/trace.py'], ['Mutation', 'lab/nasha_lab/mutation_check.py'], ['Case study', 'lab/docs/CASE-STUDY.md']]],
];
function competencies() {
  const rows = COMP.map(([n, what, ls], i) => `<tr><th scope="row"><span class="nx-i">${String(i + 1).padStart(2, '0')}</span> ${esc(n)}</th><td data-l="What was built">${esc(what)}</td><td data-l="Evidence">${ls.map(([l, p]) => lnk(blob(p), l)).join(' ')}</td></tr>`).join('');
  return `<section id="competencies" class="sec cs-sec" aria-labelledby="comp-t"><div class="wrap"><p class="kicker rv"><b>+</b> Competency map</p>
  <h2 id="comp-t" class="statement rv">Ten competencies, <span class="mut">each linked to the code, tests and evaluation that show it.</span></h2>
  <table class="atk-table weir-tbl nx-comp rv"><caption>Not badges: each row names what was built here and links to it at the pinned commit.</caption><thead><tr><th>Competency</th><th>What was built</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

/* ---------- other flagships ---------- */
const OTHERS = [
  ['Support Escalation Copilot', 'support-escalation-copilot.html', 'A customer-scenario workflow with deterministic controls, approvals bound to the exact action, and a one-pass real-model run that exposed interface failures. It proves: approval-gated agent design and claim governance.'],
  ['AI Agent Runtime + Agent Runtime Benchmark', 'agent-runtime.html', 'An agent runtime written from first principles and a benchmark that ran a small local model through it. It proves: agent infrastructure and benchmarking, including a gap the controls did not cover.'],
  ['llmeval + MAREF', 'evaluation.html', 'A tested LLM-evaluation metric suite with hard gates, and a research prototype with a mixed pre-registered result. It proves: evaluation methodology.'],
  ['Production AI Agent Platform', 'https://github.com/riteshmamidi0905-lab/production-ai-agent-platform/tree/7acb14706bdb5b4eb1246336a4c4c3371f78ccc1', 'A research/analysis agent built as a platform: async API with streaming, MCP server and client, hybrid search on PostgreSQL + pgvector, approval-gated writes, an eval gate. It proves: serving and platform concerns. Described from its README at the linked commit only. The README reports 78 tests; they need an embedded PostgreSQL, were not run for this page or for NASHA, and no CI result is cited here.'],
  ['Weir', 'mcp-weir.html', 'A data-flow gateway at the MCP tool boundary, evaluated against a frozen protocol, with its red-team failures listed. It proves: security thinking at the tool boundary.'],
];
function others() {
  return `<section id="others" class="sec cs-sec" aria-labelledby="oth-t"><div class="wrap"><p class="kicker rv"><b>+</b> The rest of the portfolio</p>
  <h2 id="oth-t" class="statement rv">Different projects prove different things. <span class="mut">NASHA integrates them.</span></h2>
  <ul class="nx-others rv">${OTHERS.map(([t, h, d]) => `<li><h3><a href="${h}"${/^https/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${esc(t)}</a></h3><p>${esc(d)}</p></li>`).join('')}<li class="nx-this"><h3>NASHA AI Operations Lab (this page)</h3><p>Integrated systems engineering: a synthetic data platform, status-aware knowledge, MCP tools, a LangGraph agent, human approval, an experiment that compared two planners, and a frozen, claim-checked evaluation. It proves: how the pieces fit together and whether they work.</p></li></ul>
  <p class="rt-qual rv"><b>Professional experience is separate.</b> My employment (Data &amp; AI Analyst, Apple client engagement; earlier analyst roles) is on the <a href="./#experience">homepage</a>. NASHA is an independent personal project: it is not employment, and none of its numbers are employer or business results.</p></div></section>`;
}

/* ---------- full case study (progressive disclosure) ---------- */
function caseStudy() {
  const det = P('det'), q = P('q15r2'), q7 = P('q7');
  const S = [
    ['Business problem', 'An operations assistant is only useful if it does not act on bad data, does not treat a draft or superseded document as policy, says "insufficient verified evidence" when that is true, and cannot spend money or message a supplier. The domain adds a founder rule (D-54: no beef, no pork, and no halal claim) where "probably fine" is the wrong answer.'],
    ['Why this system exists', 'To find out, with measurements, whether adding an LLM to such an agent actually helps, and whether neural embeddings and a vector database earn their complexity. The deterministic planner and lexical retrieval stay as baselines.'],
    ['Synthetic enterprise', 'No restaurant, customers or sales exist. A seeded generator produces orders, inventory, suppliers and defects with ground-truth labels; menu prices are placeholders. Every page and artifact carries the disclosure.'],
    ['Architecture', 'Ten stages from synthetic operations to trace and evaluation (see the explorer above). A planner interface lets a deterministic planner and an LLM planner run on identical state, tools, permissions, approval and traces.'],
    ['Data quality', 'A raw-to-modeled pipeline with twelve injected defect types, quarantine and lineage. Detection is scored against the injected truth, and the evaluation reproduces byte for byte in CI.'],
    ['Knowledge / RAG', `Decisions and documents are indexed with status. Superseded or unverified material is never offered as policy; when a founder decision changed an item (the Gobi dish is now an appetizer), the older direction is kept as labelled history and cannot be retrieved as the current menu direction. ${fmtn(R.n_questions)} questions measure retrieval and abstention.`],
    ['FastAPI', 'Typed endpoints for events, runs, tools and review; bearer-token reviewer identity; an accessible review console; bounded responses and a trace id on every request.'],
    ['MCP', 'A trusted NASHA MCP server and an untrusted failure-injection server behind a gateway (source classification, schema validation, timeouts, taint tracking). Ideas follow my Weir work; Weir itself is not imported.'],
    ['LangGraph', 'A state machine with interrupt and resume, SQLite checkpoints and a bounded review loop.'],
    ['Human approval', 'Five permission classes; signed reviewer grants bound to the exact arguments, role and expiry; wrong role, replay, changed arguments and expiry are tested.'],
    ['Deterministic vs LLM experiment', `Deterministic ${frac(det.pass_)}; Qwen2.5-1.5B ${frac(q.pass_)}; Qwen2.5-7B ${frac(q7.pass_)} on a small sample. The two small local LLM planners did not win on these scenarios; the safety architecture held; the small model's dangerous failure was a silent "no action". See the comparison above.`],
    ['Retrieval benchmark', 'BM25 beat a small neural encoder on this identifier-heavy corpus; hybrids and pgvector measured; abstention improved but is not solved (false answers on held-out questions fell from about 29% to 15%).'],
    ['Failure engineering', 'Circular trust in the grounding check, found by an adversarial stand-in and fixed; mutation testing found two layers masking each other.'],
    ['Observability', 'A per-scenario trace records requested tools, arguments, results, schema failures, retries, recommendation, abstention, approval requirement, latency, tokens, guardrail interventions and final outcome.'],
    ['Testing / CI', `${E.tests.ci_passed} tests in CI (unit, API, MCP, trust boundary, LangGraph, identity, UI accessibility and XSS, property-based), mutation testing, reproduction of the evaluations, and a Docker build. Model and retrieval experiments run in separate optional free workflows.`],
    ['Security', 'Prompt-injection and retrieval-poisoning tests on both planners; permissions stay safe even if a model follows malicious text; untrusted text is quoted and taint-tracked; the review UI is tested for cross-site scripting.'],
    ['Limitations', 'Synthetic data; same author; small local models only; no hosted model; local demo identities; scenarios built alongside the control planner; the 7B result is one small run.'],
    ['What changes in real production', 'Real data and real suppliers; an identity provider; externally written and independently reviewed evaluation sets; monitoring and drift checks; model evaluation on the actual workload including larger and hosted models; a decision about which exceptions deserve an LLM at all.'],
    ['Source code', 'Everything is public in the repository at the pinned commit; start with the README and the case study.'],
  ];
  return `<section id="case-study" class="sec cs-sec" aria-labelledby="case-t"><div class="wrap"><p class="kicker rv"><b>15 min</b> The full case study</p>
  <h2 id="case-t" class="statement rv">Nineteen short chapters. <span class="mut">Open what you need.</span></h2>
  <div class="nx-acc rv" data-nx="acc">${S.map(([t, d], i) => `<details${i < 1 ? ' open' : ''}><summary><span class="nx-i">${String(i + 1).padStart(2, '0')}</span>${esc(t)}</summary><p>${esc(d)}</p></details>`).join('')}</div>
  <nav class="lns rv" aria-label="NASHA lab sources">${lnk(REPO_URL, 'Repository')}${lnk(blob('lab/README.md'), 'README')}${lnk(blob('lab/docs/CASE-STUDY.md'), 'Case study')}${lnk(blob('lab/docs/PLANNER-EXPERIMENT.md'), 'Planner experiment')}${lnk(blob('lab/docs/RETRIEVAL-EVALUATION.md'), 'Retrieval evaluation')}${lnk(blob('lab/docs/FAILURE-STORY.md'), 'Failure story')}${lnk(blob('lab/docs/THREAT-MODEL.md'), 'Threat model')}${lnk(tree('lab'), 'Source directory')}</nav>
  <p class="fine rv">Evidence source: public repository <code>${esc(N.REPO)}</code> at commit <code class="sha">${SHORT}</code>; numbers are vendored byte for byte and hash-checked. Built with AI assistance: the goal, boundaries and acceptance criteria were mine; the design, code, tests and evaluation were largely written by Claude in autonomous sessions (commits carry Co-Authored-By trailers). Not independent validation.</p></div></section>`;
}

function main() {
  return `<main id="main-content" class="cs nx"><link rel="stylesheet" href="assets/css/nasha.css">${head()}${glance()}${architecture()}${plannerSection()}${failureSection()}${retrievalSection()}${hitlSection()}${traceSection()}${hardeningSection()}${competencies()}${others()}${caseStudy()}<script src="assets/js/nasha.js" defer></script></main>`;
}

const PAGE = {
  title: 'NASHA AI Operations Lab · applied AI systems and evaluation · Ritesh Mamidi',
  desc: 'A simulated enterprise (synthetic data, no business) with a human-supervised AI operations agent. A deterministic planner and local Qwen planners were compared under identical tools, permissions and checks: the LLM did not win. Retrieval benchmark, failure engineering, human approval and a trace walkthrough.',
  nav: [[['At a glance', '#glance'], ['Architecture', '#architecture'], ['LLM vs deterministic', '#results'], ['Failure', '#failure'], ['Retrieval', '#retrieval'], ['Permissions', '#permissions'], ['Trace', '#trace'], ['Competencies', '#competencies']], { home: './', brand: 'Ritesh Mamidi — portfolio home', back: ['← Portfolio', './'], noProjects: true }],
  main,
};

function recruiterItem() {
  const det = P('det'), q = P('q15r2');
  return `<li><div><h3>NASHA AI Operations Lab · integrated applied-AI project</h3><p>An independent project, not employment: a synthetic enterprise simulation (no real business, customers or revenue) with a human-supervised AI operations agent, status-aware retrieval, MCP tools, LangGraph and signed human approval. I compared a deterministic planner with local Qwen planners under identical checks: the deterministic planner passed ${esc(frac(det.pass_))} scenarios, the small LLM ${esc(frac(q.pass_))}, with 0 executed external actions across about ${esc(fmtn(REAL_CALLS))} real model calls. BM25 beat a small neural encoder on this corpus (MRR ${esc(fix(RT.bm25.mrr, 2))} vs ${esc(fix(RT.minilm.mrr, 2))}).</p><p class="tech">Python · FastAPI · LangGraph · MCP · RAG · pgvector · Ollama (Qwen2.5) · pytest · Docker · GitHub Actions</p><p class="evl"><b>Verified:</b> ${esc(String(E.tests.ci_passed))} tests pass in CI; ${esc(String(E.mutation.killed))} of ${esc(String(E.mutation.valid))} targeted mutants killed. <b>Simulated:</b> all data and scenarios; same-author evaluation. <b>Not evaluated:</b> any real user, hosted model or production deployment.</p><p class="lk"><a href="nasha-lab.html">15-minute case study</a> · <a href="${REPO_URL}">Repository</a></p></div></li>`;
}

function homeHTML() {
  const det = P('det'), q = P('q15r2');
  return `<section id="nasha-lab" class="sec nx-home" aria-labelledby="nasha-t"><div class="wrap">
  <p class="kicker rv"><b>Integrated project</b> Synthetic enterprise · applied AI</p>
  <h2 id="nasha-t" class="hm-title rv">NASHA AI Operations Lab: a deterministic planner beat small local LLMs on synthetic scenarios.</h2>
  <ul class="cp-stats rv" aria-label="NASHA lab evidence"><li class="cp-stat ev-simulated"><b>${esc(frac(det.pass_))} vs ${esc(frac(q.pass_))}</b><span>scenarios passed in full: deterministic planner vs Qwen2.5-1.5B, same tools, permissions and checks</span></li>
  <li class="cp-stat ev-verified"><b>0 of ${esc(fmtn(REAL_CALLS))}</b><span>real local-model calls ended in an executed external action</span></li></ul>
  <p class="rt-qual rv">${badge('limitation')} <b>Independent founder concept, synthetic data.</b> Not a live restaurant: no customers, revenue or deployment. A personal project, not employment; same-author evaluation.</p>
  <nav class="lns rv" aria-label="NASHA lab"><a class="ln" href="nasha-lab.html">Read the case study ${ARROW}</a>${lnk(REPO_URL, 'Repository')}</nav></div></section>`;
}
module.exports = { PAGE, main, recruiterItem, homeHTML };
