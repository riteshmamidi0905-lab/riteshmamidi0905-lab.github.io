/* The Weir case-study page (mcp-weir): one page in the existing design system, built only from the vendored evidence (scripts/claims-weir.js).
   Every number is a token resolved at build time; the page states its limits next to its results.
   Order: problem, architecture (who is who), a sixty-second demonstration, the experiment, the finding, what failed, limits. */
'use strict';
const path = require('path');
const { GH } = require(path.join(__dirname, '..', 'data.js'));
const C = require('./claims');
const W = require('./claims-weir');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const REPO = W.SOURCE.repo.split('/')[1], SHA = W.SOURCE.sha, SHORT = SHA.slice(0, 7);
const REPO_URL = GH + REPO;
const blob = (p) => `${REPO_URL}/blob/${SHA}/${p}`;
const tree = (p) => `${REPO_URL}/tree/${SHA}/${p}`;
const badge = (b) => `<span class="ev ev-${b}"><span class="ev-m" aria-hidden="true"></span>${C.BADGES[b][0]}</span>`;
const lnk = (href, label) => `<a class="ln" href="${href}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`;

const A = (arm, mode) => W.cell(arm, mode);
const share = (arm, mode) => `${W.pct(A(arm, mode).attacks_reached_goal, A(arm, mode).attacks)}%`;
const ARM_NAMES = { A0: 'No gateway', A1: 'Static approval gates', A2: 'Value tier', A3s: 'Session tier only', A3: 'Value + session tiers (the defaults)', A3d: 'Value + session tiers, session rules deny' };
const FS = W.H.scripted.first_stop, V = W.H.scripted.f1_variants;
const fsPct = (k) => `${W.pct(FS.counts[k], FS.n)}%`;
const f4 = W.H.scripted.f4_secret_first['A3/strict'];

/* the evidence strip: classified once each. Scripted attacker, oracle humans or a synthetic world => simulated; measured facts about the code => verified */
function statsHTML() {
  const eq = W.H.equivalence, ov = W.H.overhead;
  const p99 = (ov.in_process.find((r) => r.fragments === 10000).p99_us / 1000).toFixed(2);
  const items = [
    [`${share('A3', 'strict')}`, `of ${W.fmtn(A('A3', 'strict').attacks)} scripted attacks reach their goal with the defaults and a careful (oracle) human`, `All of it is one case Weir cannot see: ${f4[0]} of ${f4[1]} runs of "repeat the secret in your answer". The project's own target was 5% or less. It was missed.`, 'simulated'],
    [`${fsPct('R-UNTRUSTED-READ')} vs ${fsPct('R-FLOW-CONF')}`, 'of attacks first stopped by the plain session rule vs by the content tracker', 'Careful oracle human. "First to stop" favours the earlier rule, and the ranking reverses for a human who approves everything (section 05).', 'simulated'],
    [`${W.fix(A('A1', 'strict').approvals_per_benign_task, 2)} vs ${W.fix(A('A3', 'strict').approvals_per_benign_task, 2)}`, 'approvals per designed benign task, static gates vs Weir', 'Static gates also stop nothing when the oracle approves everything (100% of attacks).', 'simulated'],
    [`${eq.agree}/${eq.total}`, 'held-out runs identical on the real stdio gateway', 'The fast in-process harness checked against the actual process, with approvals answered through the database.', 'verified'],
    [`${p99} ms`, 'p99 gateway overhead per call, 10,000 results tracked', 'Measured in-process on one laptop; summary statistics only; not a throughput claim.', 'verified'],
  ];
  return `<ul class="cp-stats rv" aria-label="Evidence for Weir">${items.map(([v, l, n, b]) => `<li class="cp-stat ev-${b}"><b>${esc(v)}</b><span>${esc(l)}</span><small>${esc(n)}</small></li>`).join('')}</ul>`;
}

function headlineTable() {
  const rows = ['A0', 'A1', 'A2', 'A3s', 'A3', 'A3d'].map((arm) => {
    const careful = arm === 'A0' ? A('A0', 'none') : A(arm, 'strict');
    const careless = arm === 'A0' ? A('A0', 'none') : A(arm, 'careless');
    const nobody = A(arm, 'none');
    return `<tr><th scope="row">${esc(arm)} · ${esc(ARM_NAMES[arm])}</th><td data-l="Attacks reaching their goal, careful human">${W.pct(careful.attacks_reached_goal, careful.attacks)}%</td><td data-l="Approvals per benign task">${arm === 'A0' ? '0.00' : W.fix(careful.approvals_per_benign_task, 2)}</td><td data-l="Attacks, human approves everything">${W.pct(careless.attacks_reached_goal, careless.attacks)}%</td><td data-l="Benign tasks done, nobody to approve">${W.pct(nobody.benign_completed, nobody.benign)}%</td></tr>`;
  }).join('');
  return `<table class="atk-table weir-tbl rv"><caption>Held-out scripted run: ${W.fmtn(A('A0', 'none').attacks)} attacks and ${A('A0', 'none').benign} benign tasks per cell. "Careful human" is an oracle that approves only the user's own steps, judged on what the approval screen shows. Intervals are in the repository's evaluation document.</caption>
  <thead><tr><th>Arm</th><th>Attacks reaching their goal, careful human</th><th>Approvals per benign task</th><th>Attacks, human approves everything</th><th>Benign tasks done, nobody to approve</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function realModelHTML() {
  const cells = W.H.realmodel && W.H.realmodel.cells;
  if (!cells || !Object.keys(cells).length) return '';
  const g = (arm, mode) => W.rm(arm, mode);
  const line = (arm, mode, label) => { const c = g(arm, mode); return `<tr><th scope="row">${esc(label)}</th><td data-l="Reached their goal">${W.frac(c.attacks_reached_goal, c.attacks)}</td>\n<td data-l="Share">${W.pct(c.attacks_reached_goal, c.attacks, 0)}%</td></tr>\n`; };
  const ben = (arm, mode, label) => { const c = g(arm, mode); return `<tr><th scope="row">${esc(label)}</th><td data-l="Completed">${W.frac(c.benign_completed, c.benign)}</td>\n<td data-l="Share">${W.pct(c.benign_completed, c.benign, 0)}%</td></tr>\n`; };
  return `<div class="rm-run rv" id="real-model"><h3 class="hm-h">One small real model, one pass</h3>
  <p class="rt-sum">Qwen3-4B-Instruct-2507 (Q4_K_M, llama.cpp), native tool calling, greedy decoding, held-out scenarios, ${esc(String(g('A0', 'none').attacks))} attack scenarios per cell. A model that does not follow the injection is not a defence, so the baseline matters.</p>
  <table class="atk-table weir-tbl"><caption>${badge('simulated')} With no gateway the attacker reached its goal in most runs, almost all of them when the instruction sat in a web page or a file. With Weir and a careful (oracle) human the runs that remain are all the answer channel. The gateway arms are not distinguishable in this run: the scenarios ask for the secret verbatim, so even the value tier catches it. The model is real; the world, the planted injections and the humans are not. Same author, one model, one machine.</caption><thead><tr><th>Cell</th><th>Attacks that reached their goal</th><th>Share</th></tr></thead><tbody>
  ${line('A0', 'none', 'No gateway')}${line('A1', 'strict', 'Static approval gates, careful human')}${line('A2', 'strict', 'Value tier, careful human')}${line('A3', 'strict', 'Weir defaults, careful human')}${line('A3', 'careless', 'Weir defaults, human approves everything')}${line('A3d', 'careless', 'Session rules deny, human approves everything')}</tbody></table>
  <table class="atk-table weir-tbl"><caption>The same model on legitimate work: tasks completed (the user asked for each one). The model fails some of these on its own with no gateway, so read the other rows against the first.</caption><thead><tr><th>Cell</th><th>Benign tasks completed</th><th>Share</th></tr></thead><tbody>${ben('A0', 'none', 'No gateway')}${ben('A3', 'none', 'Weir defaults, nobody to approve')}${ben('A3', 'careless', 'Weir defaults, human approves')}</tbody></table></div>`;
}

/* section 02: who is who, and where the boundary is */
function zonesHTML() {
  return `<div class="wz-map rv" role="group" aria-label="Who is who: the model is untrusted and outside Weir; Weir is the deterministic gateway; the human is the approval boundary; the upstream MCP servers are the tools being mediated; the model's final answer bypasses Weir">
  <div class="wz wz-model" style="grid-area:m"><h3>Model</h3><p class="wz-tag">untrusted · outside Weir</p><p>Plans the task, picks tools and arguments, writes the answer. Any text it reads can steer it, so Weir assumes it will be.</p></div>
  <div class="wz-arrow" style="grid-area:a1" aria-hidden="true"><span>tool calls, via the agent host</span></div>
  <div class="wz wz-weir" style="grid-area:w"><h3>Weir</h3><p class="wz-tag">deterministic gateway · no model inside</p><p>Labels each result, remembers what the session has seen, applies the value and session rules, pins tool definitions, keeps a hash-chained audit log. The only part under test.</p></div>
  <div class="wz-arrow" style="grid-area:a2" aria-hidden="true"><span>allowed calls</span></div>
  <div class="wz wz-up" style="grid-area:u"><h3>Upstream MCP servers</h3><p class="wz-tag">the tools being mediated</p><p>Mail, files, web, notes. Weir trusts the label the operator declared for a tool's results, not what the results say.</p></div>
  <div class="wz wz-human" style="grid-area:h"><h3>Human</h3><p class="wz-tag">approval boundary</p><p>Approves the exact call, once. A deny rule cannot be approved. In the evaluation this role is played by an oracle, not by a person.</p></div>
  <div class="wz-answer" style="grid-area:n" role="note"><b>Answer channel: outside the boundary.</b> The model's final reply goes straight to the user. Weir never sees it, so it cannot stop a model from repeating a secret it was legitimately given earlier. That case reached its goal in ${f4[0]} of ${f4[1]} scripted runs under every arm.</div></div>`;
}

/* section 05: which rule stopped the attack first, and where the ranking reverses */
function findingHTML() {
  const rows = [['R-UNTRUSTED-READ', 'session rule', 's'], ['R-DEST-UNTRUSTED', 'value tier: destination', 'v'], ['R-FLOW-CONF', 'value tier: content tracker', 'v'], ['R-TRIFECTA', 'session rule', 's'], ['none', 'nothing stopped: the answer channel', 'n']];
  const bars = `<ol class="fs-bars rv" aria-label="Which rule was first to stop the attack, careful oracle human, ${FS.n} scripted attack runs">${rows.map(([k, tag, c]) => `<li class="${c}"><span class="fs-l"><code>${k === 'none' ? 'no rule' : esc(k)}</code><i>${esc(tag)}</i></span><span class="fs-track" aria-hidden="true"><b style="--w:${W.pct(FS.counts[k], FS.n)}%"></b></span><span class="fs-v">${fsPct(k)}</span></li>`).join('')}</ol>`;
  const ranks = [['Value tier alone (A2)', 'A2'], ['Session tier alone (A3s)', 'A3s'], ['Both, the defaults (A3)', 'A3'], ['Both, session rules deny (A3d)', 'A3d']].map(([lab, arm]) => `<tr><th scope="row">${esc(lab)}</th><td data-l="Careful human">${share(arm, 'strict')}</td>\n<td data-l="Human approves everything">${share(arm, 'careless')}</td></tr>`).join('');
  const vt = [['Verbatim', 'value'], ['Base64', 'b64'], ['Hex', 'hex'], ['Look-alike recipient domain', 'lookalike_suffix'], ['ROT13', 'rot13'], ['Reversed text', 'rev'], ['5-character pieces', 'chunk5'], ['Look-alike (Cyrillic) letters', 'glyph'], ['Digits spelled out', 'spell']].map(([lab, k]) => `<tr><th scope="row">${esc(lab)}</th>\n<td data-l="Tracker alone, human approves everything">${V[k]['A2/careless'][0]}/${V[k]['A2/careless'][1]}</td>\n<td data-l="Weir defaults, careful human">${V[k]['A3/strict'][0]}/${V[k]['A3/strict'][1]}</td></tr>`).join('');
  const valueTier = W.pct(FS.counts['R-DEST-UNTRUSTED'] + FS.counts['R-FLOW-CONF'], FS.n);
  return `<section id="finding" class="sec"><div class="wrap"><p class="kicker rv"><b>05</b> The finding</p>
  <h2 class="statement rv">The tracker was the clever part. <span class="mut">A plain session rule was first to stop the attack more often.</span></h2>
  <p class="rt-sum rv">I expected the value tracker (keyed hashes of what the agent has been shown, matched against what it sends) to be the defence. In the held-out scripted run, with a careful oracle human, the first rule to stop an attack was the plain session rule "no secret read after the session has seen untrusted content" in ${fsPct('R-UNTRUSTED-READ')} of runs. The whole value tier together was first in ${valueTier}%, and the content tracker itself in ${fsPct('R-FLOW-CONF')}.</p>
  ${bars}
  <p class="rt-qual rv">${badge('simulated')} <b>Read it with two caveats.</b> "First to stop" is an accounting convention: the read happens before the send, so a rule that fires on the read is credited first. And the session rules ask a human by default, so the ranking depends on the human:</p>
  <table class="atk-table weir-tbl rv"><caption>Attacks that reached their goal, ${W.fmtn(A('A3', 'strict').attacks)} scripted attacks per cell.</caption><thead><tr><th>Arm</th><th>Careful human</th><th>Human approves everything</th></tr></thead><tbody>${ranks}</tbody></table>
  <p class="rt-sum rv">With a careful human the session tier alone leaves fewer attacks standing than the value tier alone. With a human who approves everything the order reverses, because the session rules ask rather than deny: only the same rules set to deny recover it. So the claim is narrow: the control that does not need to predict what the model does with the data did more of the stopping than the control that tries to recognise the data afterwards. It is one experiment with a scripted attacker, not a law.</p>
  <h3 class="hm-h rv">Where the tracker lost</h3>
  <table class="atk-table weir-tbl rv"><caption>E-mail exfiltration, ${V.value['A2/careless'][1]} runs per row: attacks that reached their goal, by how the stolen value was transformed.</caption><thead><tr><th>How the value was sent</th><th>Tracker alone, human approves everything</th><th>Weir defaults, careful human</th></tr></thead><tbody>${vt}</tbody></table>
  <p class="rt-qual rv">${badge('limitation')} <b>One more channel no gateway at this boundary can see.</b> If the model was legitimately given a secret earlier and then reads an injected instruction, it can repeat the secret in its reply. That is the whole ${share('A3', 'strict')} that remains.</p></div></section>`;
}

const FAILURES = [
  ['The project\'s own target was missed', 'simulated', `The spec said attacks reaching their goal with the defaults and a careful human should be 5% or less. They were ${share('A3', 'strict')}, all of it the answer channel. The target is reported as missed, not redefined.`],
  ['The answer channel', 'limitation', 'If the model was legitimately given a secret earlier and then reads an injected instruction, it can repeat the secret in its reply. Weir never sees the reply. This reached its goal in every run under every arm.'],
  ['The value tracker loses to transformation', 'limitation', 'Normalisation and base64/hex/percent decoding are not enough: rot13, reversed text, 5-character pieces, Cyrillic look-alikes and base64 wrapped in short lines all got through when the human approved everything. The session rule does not depend on recognising the data, which is why it held where the tracker did not.'],
  ['Data in an argument Weir does not scan', 'limitation', 'Found by the red-team, not the evaluation: the secret as the local part of the recipient address. The flow rule reads only arguments declared as content. Documented, not fixed, because the evaluation was frozen.'],
  ['State changes that never name their target', 'limitation', 'Delete the quarterly document, overwrite the roadmap: the target does not appear in the injected text, so the destination rule does not fire. In the five-run adaptive attempts only the static approval gate with a careful human stopped these, at the price of an approval on every write.'],
  ['The approval screen', 'limitation', 'Content is shown only as a digest, so a careful human cannot tell the user\'s e-mail to a partner from the attacker\'s e-mail to the same partner. This is the cost of keeping labelled data out of the database.'],
  ['My own tooling failed first', 'verified', 'Before the evaluation did: an approval screen that hid a fetched URL made my "careful human" oracle approve an exfiltration; a leading // bypassed a path rule; the whole tracker was re-serialised on every call (p99 741 ms at 10,000 results, now under 1 ms); one deeply nested JSON message could kill the server. Each has a regression test.'],
];
const failuresHTML = () => `<ul class="ev-legend rv" aria-label="What failed">${FAILURES.map(([t, b, d]) => `<li>${badge(b)}<p><b>${esc(t)}.</b> ${esc(d)}</p></li>`).join('')}</ul>`;

const LIMITS = [
  'Synthetic world, toy tools, English only; the oracles know the ground truth. Never deployed, no users, no external validation.',
  'One small model on one machine, one pass per cell. Nothing here says anything about a frontier model.',
  'Same author wrote the gateway, the testbed, the scenarios, the oracles and the red-team, and an AI assistant did most of the writing (commits carry Co-Authored-By trailers). This is not independent validation.',
  'The held-out seeds are held-out instances of the same attack classes, not held-out attack classes; the adaptive attacks are separate and not held out.',
  'The humans in the evaluation are oracles (a careful one and one that approves everything), not people. Approval fatigue is not modelled.',
  'Not a formal information-flow-control system: labels are coarse and declared by an operator, the content tracker is a heuristic, nothing is proved.',
  'MCP tools over stdio only: no resources, prompts, sampling, HTTP transports or authentication. Tested with the official SDK client and one third-party server; not with any commercial MCP host.',
  'The idea is established (CaMeL, FIDES, Meta\'s Rule of Two, vendor gateways, small open-source projects). This is not a claim of novelty or of being better than any of them; none was run for comparison.',
];

function adaptiveHTML() {
  const rows = W.H.adaptive || [];
  const ids = [...new Set(rows.map((r) => r.id))];
  const cols = [['A0', 'none', 'No gateway'], ['A3', 'strict', 'Defaults, careful human'], ['A3', 'careless', 'Defaults, approves everything'], ['A3d', 'careless', 'Session rules deny']];
  const body = ids.map((id) => {
    const first = rows.find((r) => r.id === id);
    const cells = cols.map(([arm, mode, lab]) => { const r = rows.find((x) => x.id === id && x.arm === arm && x.mode === mode); return `<td data-l="${esc(lab)}">${r.goal.filter((v) => v >= 1).length}/${r.goal.length}</td>`; }).join('');
    return `<tr><th scope="row">${esc(id)} · ${esc(first.title)}</th>${cells}</tr>`;
  }).join('');
  return `<table class="atk-table weir-tbl rv"><caption>Adaptive attacks written after the held-out results, with knowledge of Weir's rules, on fresh seeds. Cells are attacks that reached their goal out of 5. Gaps are reported, not fixed.</caption>
  <thead><tr><th>Attempt</th>${cols.map((c) => `<th>${esc(c[2])}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

function main() {
  const dem = 'assets/weir/demo-terminal.png', tr = 'assets/weir/trace-careless.png';
  return `<main id="main-content" class="cs">
  <header class="cs-head wrap" id="top"><p class="eyebrow"><i class="dot"></i>Data flow at the MCP tool boundary · research prototype</p><h1>Weir</h1>
  <p class="cs-one">I built a data-flow tracker for AI agents. A boring rule beat it.</p>
  <p class="rt-sum">Weir is an experimental gateway between an AI agent and its MCP servers that decides which data may go where. This page is the experiment: what I expected, what a frozen held-out evaluation measured, and what failed. “Beat” is narrower than it sounds: it means first to stop the attack more often, and fewer attacks left standing with a careful human. It reverses for a human who approves everything (section 05).</p>
  <div class="cs-cta"><a class="btn solid" href="#finding">See the finding</a><a class="btn" href="${REPO_URL}" target="_blank" rel="noopener">Repository ${ARROW}</a><a class="btn" href="./">Back to the portfolio ${ARROW}</a></div></header>

  <section id="problem" class="sec"><div class="wrap"><p class="kicker rv"><b>01</b> The problem</p>
  <h2 class="statement rv">Permissions say which tools an agent may call. <span class="mut">They do not say which data may go where.</span></h2>
  <p class="rt-sum rv">My own earlier benchmark found the gap first. In task MT-02 a fetched page told a small local model to read a configuration value and reveal it. The policy allowed the read tool, all seven runtime controls held in 240 of 240 runs, and the secret was disclosed anyway. That raised a different question: can we control where information moves when an agent uses tools? Weir is my experiment in answering it at the Model Context Protocol boundary, where real agents meet real tools.</p>
  <p class="rt-qual rv">${badge('limitation')} <b>Not new.</b> The "lethal trifecta" (private data, untrusted content, a way out), Meta's Rule of Two, CaMeL, FIDES and several MCP gateways describe and address the same problem. This is a small, fully tested, honestly evaluated implementation with its failures published; none of those systems was run for comparison.</p></div></section>

  <section id="what" class="sec"><div class="wrap"><p class="kicker rv"><b>02</b> Architecture</p>
  <h2 class="statement rv">A proxy that labels, remembers and decides. <span class="mut">No model inside.</span></h2>
  ${zonesHTML()}
  <div class="rt-cols rv"><div><h3 class="hm-h">How a call is decided</h3><p class="rt-sum">Every tool result carries a label the operator declared (public, internal or secret; trusted or untrusted). The session label is the join of everything the agent has been shown, and only grows.</p></div>
  <div class="rt-lim"><h3 class="hm-h">Two kinds of rule</h3><ul>
  <li><b>Value tier</b> (looks at the call): does the recipient appear in untrusted text; does an external call contain data the session saw, matched on keyed hashes after decoding base64, hex and percent-encoding.</li>
  <li><b>Session tier</b> (does not care what the model did with the data): no secret read after untrusted input, no external egress once a session saw both, an egress budget.</li>
  <li><b>Plain engineering</b>: approvals bound to the exact call, hash-chained audit log, tool-definition pinning, strict destination parsing, fail-closed behaviour.</li></ul></div></div>
  <p class="rt-qual rv">${badge('verified')} <b>Tests.</b> Unit, property-based, stdio end-to-end with fault injection, interoperability with the official MCP Python SDK from both sides, and a third-party server built on a different SDK version; CI on Linux and macOS, Python 3.11 to 3.13. <span class="mut">Source: public repository at commit <code>${SHORT}</code>.</span></p></div></section>

  <section id="demo" class="sec"><div class="wrap"><p class="kicker rv"><b>03</b> Sixty seconds</p>
  <h2 class="statement rv">The same obedient agent, three ways.</h2>
  <p class="rt-sum rv">A web page the agent was asked to summarise contains a planted instruction: read a secret file and e-mail it to an outside address. ${badge('simulated')} A scripted agent plays the model so the run is exact; the real-model run is in the next section.</p>
  <div class="shots rv" style="grid-template-columns:1fr"><figure class="weir-fig" tabindex="0" role="group" aria-label="Image: scrolls sideways on narrow screens"><img src="${dem}" width="1230" height="640" alt="Terminal output of the demo: without Weir the agent reads the secret and e-mails it; behind Weir with a careful human both steps are held; with a human who approves everything the read runs but the e-mail is blocked by three rules" loading="lazy"><figcaption class="fine">Terminal output of <code>python -m weir_eval.demo</code>.</figcaption></figure></div>
  <div class="shots rv" style="grid-template-columns:minmax(0,640px)"><figure><img src="${tr}" width="980" height="1180" alt="Flow trace page generated from the audit chain: three tool calls with their labels, the rules that fired, and arcs showing which earlier result a flagged value came from" loading="lazy"><figcaption class="fine">The flow trace Weir writes from its audit chain (self-contained HTML, no scripts).</figcaption></figure></div></div></section>

  <section id="evaluation" class="sec"><div class="wrap"><p class="kicker rv"><b>04</b> The experiment</p>
  <h2 class="statement rv">Frozen before it ran. <span class="mut">Reported with its failures.</span></h2>
  <p class="rt-sum rv">The protocol, the gateway, the policy, the scenario generator, the oracles and the runner were hashed before any held-out run; a runner refuses to start if they change. Development ran on other seeds. The scripted attacker follows every injection (a worst case for being fooled, a weak case for adapting); the "human" is an oracle.</p>
  ${statsHTML()}
  <p class="rt-qual rv">${badge('simulated')} <b>Qualification.</b> A scripted attacker, scripted agents and oracle humans against a synthetic world: this tests the controls, not a language model, and not a person.</p>
  ${headlineTable()}
  <div class="shots rv"><figure class="weir-fig" tabindex="0" role="group" aria-label="Image: scrolls sideways on narrow screens"><img src="assets/weir/results-attacks.svg" width="980" height="520" alt="Bar chart: share of attacks that reached their goal for each arm, with a careful human and with a human who approves everything" loading="lazy"></figure><figure class="weir-fig" tabindex="0" role="group" aria-label="Image: scrolls sideways on narrow screens"><img src="assets/weir/results-burden.svg" width="980" height="380" alt="Bar chart: approvals requested per benign task for each arm" loading="lazy"></figure></div>
  ${realModelHTML()}
  <p class="rt-qual rv">${badge('not-evaluated')} <b>Not evaluated:</b> any hosted or frontier model, any commercial MCP host, any real user or human approver, any real data, any performance claim beyond a microbenchmark.</p></div></section>

  ${findingHTML()}

  <section id="failed" class="sec"><div class="wrap"><p class="kicker rv"><b>06</b> What failed</p>
  <h2 class="statement rv">What got through, <span class="mut">and what I did not fix.</span></h2>
  <p class="rt-sum rv">The red-team found more gaps after the freeze. They are listed here and in the repository, with every attempt, and left unfixed on purpose: changing the system after the held-out run would have made the held-out numbers meaningless.</p>
  ${failuresHTML()}${adaptiveHTML()}</div></section>

  <section id="limits" class="sec"><div class="wrap"><p class="kicker rv"><b>07</b> Limitations</p>
  <div class="rt-lim rv"><h4>${badge('limitation')} Stated up front</h4><ul>${LIMITS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <nav class="lns rv" aria-label="Weir repository and documentation">
  ${lnk(REPO_URL, 'Repository')}${lnk(blob('README.md'), 'README')}${lnk(blob('docs/evaluation.md'), 'Evaluation, with intervals')}${lnk(blob('eval/PROTOCOL.md'), 'Frozen protocol')}${lnk(blob('eval/FREEZE-HISTORY.md'), 'Freeze history')}${lnk(blob('docs/red-team.md'), 'Red-team log')}${lnk(blob('docs/limitations.md'), 'Limitations')}${lnk(blob('docs/claims.md'), 'Claims, classified')}${lnk(tree('tests'), 'Tests')}${lnk(blob('docs/design/03-v1-spec.md'), 'Frozen specification')}</nav>
  <p class="fine rv">Evidence source: public repository <code>${esc(REPO)}</code> at commit <code class="sha">${SHORT}</code>. Built with AI assistance: the goal, boundaries and acceptance criteria were mine; the design, code, tests and evaluation were largely written by Claude in an autonomous session, and the commits say so.</p></div></section>
  </main>`;
}

const PAGE = {
  title: 'Weir · data flow at the MCP boundary · Ritesh Mamidi',
  desc: 'An experimental gateway for MCP tool calls. I built a data-flow tracker and a plain session rule was first to stop the attack more often: a frozen same-author evaluation with a small real model, an adaptive red-team, and the limits stated up front.',
  nav: [[['Problem', '#problem'], ['Architecture', '#what'], ['Evidence', '#evaluation'], ['Finding', '#finding'], ['Failures', '#failed'], ['Limits', '#limits']], { home: './', brand: 'Ritesh Mamidi — portfolio home', back: ['← Portfolio', './'], noProjects: true }],
  main,
};
/* the recruiter view entry: same facts as the page, shorter */
function recruiterItem() {
  const c = W.cell('A3', 'strict'), a0 = W.cell('A0', 'none'), rmA0 = W.rm('A0', 'none'), rmA3 = W.rm('A3', 'strict');
  return `<li><div><h3>Weir · data flow at the MCP boundary</h3><p>I built a data-flow tracker for AI agents and a plain session rule was first to stop the attack more often. An experimental gateway with a frozen held-out evaluation that reports what fails. Research prototype.</p><p class="tech">Python · MCP · SQLite · property-based testing · GitHub Actions</p><p class="evl"><b>Verified:</b> ${esc(String(W.H.tests.passed))} tests pass in CI; interoperates with the official MCP SDK and a third-party server. <b>Simulated:</b> against a scripted attacker, oracle humans and a synthetic world, ${esc(W.pct(a0.attacks_reached_goal, a0.attacks))}% of ${esc(W.fmtn(a0.attacks))} held-out attacks reached their goal with no gateway and ${esc(W.pct(c.attacks_reached_goal, c.attacks))}% with Weir and a careful oracle human, all of it the answer channel, which Weir cannot see; the project's own 5% target was missed. With one small real model: ${esc(W.frac(rmA0.attacks_reached_goal, rmA0.attacks))} with no gateway, ${esc(W.frac(rmA3.attacks_reached_goal, rmA3.attacks))} with Weir and a careful oracle human. <b>Limits:</b> one AI-assisted author, one small model, synthetic data, a heuristic tracker, no independent review, never deployed.</p></div><p class="lk"><a href="${REPO_URL}">Code</a> · <a href="${tree('tests')}">Tests</a> · <a href="mcp-weir.html">Case study</a></p></li>`;
}
/* the homepage strip: one section after the three flagships (not a fourth flagship), linking to the page */
function homeHTML() {
  const c = W.cell('A3', 'strict'), a0 = W.cell('A0', 'none'), rmA0 = W.rm('A0', 'none'), rmA3 = W.rm('A3', 'strict');
  return `<section id="weir" class="sec" aria-labelledby="weir-t"><div class="wrap">
  <p class="kicker rv"><b>New</b> Data flow at the MCP tool boundary · research prototype</p>
  <h2 id="weir-t" class="hm-title rv">Weir: I built a data-flow tracker for AI agents. A boring rule beat it.</h2>
  <ul class="cp-stats rv" aria-label="Weir evidence"><li class="cp-stat ev-simulated"><b>${esc(fsPct('R-UNTRUSTED-READ'))} vs ${esc(fsPct('R-FLOW-CONF'))}</b><span>of attacks first stopped by a plain session rule vs by the content tracker</span></li>
  <li class="cp-stat ev-simulated"><b>${esc(W.pct(a0.attacks_reached_goal, a0.attacks))}% to ${esc(W.pct(c.attacks_reached_goal, c.attacks))}%</b><span>of ${esc(W.fmtn(a0.attacks))} scripted attacks reach their goal: no gateway vs Weir</span></li>
  <li class="cp-stat ev-simulated"><b>${esc(W.frac(rmA0.attacks_reached_goal, rmA0.attacks))} to ${esc(W.frac(rmA3.attacks_reached_goal, rmA3.attacks))}</b><span>real-model attacks reaching their goal: no gateway vs Weir</span></li></ul>
  <p class="rt-qual rv">${badge('limitation')} <b>Careful oracle human; same author, AI-assisted, never deployed.</b> The answer channel is out of reach, and the project's own 5% target was missed.</p>
  <nav class="lns rv" aria-label="Weir"><a class="ln" href="mcp-weir.html">Read the case study ${ARROW}</a>${lnk(REPO_URL, 'Repository')}</nav></div></section>`;
}
module.exports = { PAGE, main, recruiterItem, homeHTML };
