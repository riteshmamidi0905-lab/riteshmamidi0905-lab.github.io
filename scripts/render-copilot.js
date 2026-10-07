/* render-copilot.js — Support Escalation Copilot: the homepage flagship section and the full case-study page.
   Every number reaches this file through scripts/claims.js (tokens resolved from the vendored public-claims manifest at the pinned commit);
   a claim the source repository did not mark portfolio-eligible cannot be rendered. Nothing here is typed from memory. */
'use strict';
const path = require('path');
const { GH } = require(path.join(__dirname, '..', 'data.js'));
const C = require('./claims');
const { stageHTML } = require('./worlds-html');
const RAW = require('../content/support-escalation-copilot.json');
const CP = C.deepFill(RAW);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const REPO = C.SOURCE.repo.split('/')[1], SHA = C.SOURCE.sha, REL = C.SOURCE.release, SHORT = SHA.slice(0, 7);
const REPO_URL = GH + REPO;
const pinned = (p) => `${REPO_URL}/blob/${SHA}/${p}`;

/* every claim id used anywhere must exist and be portfolio-eligible: throws at build time otherwise */
const used = new Set();
[].concat(CP.steps.flatMap((s) => s.claims), CP.stats.map((s) => s.claim), CP.attackStory.claims, CP.residualStory.claims, CP.retrieval.claims, CP.evidenceGroups.flatMap((g) => g.claims), CP.home.result.claims, CP.home.controls.claims, CP.home.failure.claims).forEach((id) => { C.claim(id); used.add(id); });
CP.steps.forEach((s) => { if (s.badge !== C.badgeOf(C.claim(s.claims[0]))) throw new Error(`step "${s.label}": badge ${s.badge} does not match its first claim (${C.badgeOf(C.claim(s.claims[0]))})`); });
CP.stats.forEach((s) => { if (s.badge !== C.badgeOf(C.claim(s.claim))) throw new Error(`stat "${s.label}": badge ${s.badge} does not match claim ${s.claim}`); });
const ONOFF = C.detectorsOnOff(); if (ONOFF.pairs !== ONOFF.same || ONOFF.same !== 10) throw new Error('the injection report no longer shows ten ticket attacks with identical outcomes on and off: update the copy');
const eligible = C.MANIFEST.claims.filter((c) => c.suitable_for.portfolio).map((c) => c.id);
const inTable = new Set(CP.evidenceGroups.flatMap((g) => g.claims));
eligible.forEach((id) => { if (!inTable.has(id)) throw new Error('portfolio-eligible claim missing from the evidence table: ' + id); });

const badge = (b) => `<span class="ev ev-${b}"><span class="ev-m" aria-hidden="true"></span>${C.BADGES[b][0]}</span>`;
const legendHTML = () => `<ul class="ev-legend" aria-label="Evidence labels">${Object.entries(C.BADGES).map(([k, [, def]]) => `<li>${badge(k)}<p>${esc(def)}</p></li>`).join('')}</ul>`;

/* ---------- stage (pinned 10-step scene) ---------- */
const steps = CP.steps.map((s) => [s.label, s.text, s.badge]);
function stage(h, cta, compact) {
  return stageHTML({ id: 'world-copilot', cls: 'copilotstage', scene: 'copilot', key: 'copilot', kicker: CP.kicker, title: CP.title, h, note: CP.tech.join(' · '), sub: CP.oneLine, steps, compact: !!compact,
    cta: cta === undefined ? ['support-escalation-copilot.html', 'Read the full case study'] : cta });
}
/* data the canvas scene draws from: numbers come from the claims, never from the scene file */
function sceneData() {
  const rv = C.claim('retrieval-vector-beat-hybrid').value.strategies, ta = C.claim('typed-actions-no-email').value;
  return {
    steps: CP.steps.map((s) => s.label), short: CP.steps.map((s) => s.short), badges: CP.steps.map((s) => s.badge),
    retrieval: CP.retrieval.strategies.map(([k, , label]) => ({ key: k, label, hit: rv[k]['hit@1'], mrr: rv[k]['mrr@10'] })),
    actions: { total: ta.actions, gated: ta.gated, forbiddenNames: ta.forbidden_names },
    n: { tests: C.claim('test-suite').value.passed, attacks: C.claim('threat-catalogue').value.executable, injection: C.claim('invariants-held-in-scenario-runs').value.injection_runs },
  };
}
const stepsConfig = () => ({ copilot: { steps }, 'copilot-data': sceneData() });

/* ---------- evidence strip ---------- */
const statsHTML = () => `<ul class="cp-stats rv" aria-label="Evidence for Support Escalation Copilot">${CP.stats.map((s) => `<li class="cp-stat ev-b-${s.badge}" data-claim="${s.claim}">${badge(s.badge)}<b>${esc(s.value)}</b><span>${esc(s.label)}</span><small>${esc(s.note)}</small></li>`).join('')}</ul>`;

/* ---------- the two stories ---------- */
const AS = CP.attackStory, RS = CP.residualStory;
const attackHTML = () => `<article class="cp-story cp-attack rv" id="attack-story" data-claim="${AS.claims.join(' ')}" aria-labelledby="atk-t">
  <p class="mono-l">Adversarial story · scripted model</p><h3 id="atk-t">${esc(AS.title)}</h3><p class="cp-lead">${esc(AS.lead)}</p>
  <ol class="cp-beats">${AS.beats.map((b, i) => `<li class="beat-${i}"><span class="who">${esc(b.who)}</span><span>${esc(b.text)}</span></li>`).join('')}</ol>
  <p class="cp-close">${esc(AS.closing)}</p></article>`;
const pct = (f, n) => Math.round((100 * Number(f)) / Number(n));
const residualHTML = () => `<article class="cp-story cp-residual rv" id="residual-story" data-claim="${RS.claims.join(' ')}" aria-labelledby="res-t">
  <p class="mono-l">What the controls cannot catch</p><h3 id="res-t">${esc(RS.title)}</h3><p class="cp-lead">${esc(RS.lead)}</p>
  <figure class="cp-draft"><blockquote>${esc(RS.draft.text)}</blockquote><figcaption>${esc(RS.draft.note)}</figcaption></figure>
  <div class="cp-bars" role="list">${RS.bars.map((b) => `<div class="cp-bar tone-${b.tone}" role="listitem"><div class="cp-bar-h"><span>${esc(b.label)}</span><b>${b.flagged} / ${b.n} flagged</b></div><div class="cp-bar-t" aria-hidden="true"><i style="width:${pct(b.flagged, b.n)}%"></i></div><small>${esc(b.want)}</small></div>`).join('')}</div>
  <p class="cp-close">${esc(RS.closing)}</p></article>`;

const links = () => CP.links.map(([label, kind, p]) => { const href = kind === 'repo' ? REPO_URL : kind === 'release' ? `${REPO_URL}/releases/tag/${REL}` : pinned(p); return `<a class="ln" href="${href}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`; }).join('');
const provenance = () => `<p class="fine cp-prov">Evidence source: public repository <code>${esc(REPO)}</code> at commit <code class="sha">${SHORT}</code> (release ${esc(REL)}). Claims, qualifications and numbers are rendered from the repository's own <a href="${pinned('content/public-claims.json')}" target="_blank" rel="noopener">public claims manifest</a>, vendored byte for byte and re-verified by hash on every build.</p>`;

/* ---------- homepage flagship section: one screen of scene, then the result, the control result and the failure ---------- */
const H = CP.home;
const hmCard = (c, tone) => `<article class="hm-card tone-${tone} rv" data-claim="${c.claims.join(' ')}"><p class="mono-l">${badge(tone)} ${esc(c.kicker)}</p><p class="hm-big">${esc(c.big)}</p><p class="hm-lab">${esc(c.label)}</p><p class="hm-note">${esc(c.text)}</p></article>`;
function homeHTML() {
  return `<section id="copilot" class="flagsec" aria-label="Flagship 01: ${esc(CP.title)}">
  ${stage(2, ['support-escalation-copilot.html', 'Read the full case study'], true)}
  <div class="cp-after wrap cp-home">
    <p class="layer-l rv"><span class="layer">I build AI agents</span></p>
    <p class="rt-sum rv">${esc(H.problem)} ${esc(H.architecture)}</p>
    <div class="hm-trio">
      ${hmCard(H.result, 'verified')}
      ${hmCard(H.controls, 'verified')}
      <article class="hm-card hm-fail tone-limitation rv" data-claim="${H.failure.claims.join(' ')}"><p class="mono-l">${badge('limitation')} ${esc(H.failure.kicker)}</p><h3 class="hm-fh">${esc(H.failure.title)}</h3>
        <ul class="hm-list">${H.failure.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="hm-lesson"><b>Lesson.</b> ${esc(H.failure.lesson)}</p></article>
    </div>
    <p class="rt-qual rv"><b>Qualification.</b> ${esc(H.qualifier)}</p>
    <div class="cp-foot rv"><a class="btn solid" href="${esc(CP.caseStudy)}">Read the full case study ${ARROW}</a><nav class="lns" aria-label="${esc(CP.title)} repository and evidence">${links()}</nav></div>
    ${provenance()}
  </div></section>`;
}

/* ---------- case-study page ---------- */
const CLASS_LABEL = (c) => String(c).replace(/_/g, ' ');
function claimRow(id) {
  const c = C.claim(id), b = C.badgeOf(c);
  return `<tr class="ev-row" data-b="${b}" data-claim="${id}"><td class="c-b">${badge(b)}</td><td class="c-t"><p>${esc(c.claim)}</p><p class="c-q"><b>Qualification.</b> ${esc(c.qualification)}</p></td><td class="c-e"><span>${esc(CLASS_LABEL(c.evidence_class))}</span>${c.model && c.model !== 'none' ? `<span>model: ${esc(CLASS_LABEL(c.model))}</span>` : ''}<code>${esc(id)}</code></td></tr>`;
}
function evidenceTable() {
  const counts = Object.fromEntries(Object.keys(C.BADGES).map((k) => [k, 0]));
  CP.evidenceGroups.forEach((g) => g.claims.forEach((id) => { counts[C.badgeOf(C.claim(id))]++; }));
  return `<div class="ev-ctl" role="group" aria-label="Filter claims by label"><button type="button" data-f="all" aria-pressed="true">All <i>${Object.values(counts).reduce((a, b) => a + b, 0)}</i></button>${Object.keys(C.BADGES).map((k) => `<button type="button" data-f="${k}" aria-pressed="false">${C.BADGES[k][0]} <i>${counts[k]}</i></button>`).join('')}</div>
  <p class="fine" id="ev-status" role="status"></p>
  ${CP.evidenceGroups.map((g) => `<div class="ev-group" data-g="${g.id}"><h3>${esc(g.title)}</h3><p class="ev-blurb">${esc(g.blurb)}</p><table class="ev-table"><caption class="vh">${esc(g.title)}</caption><thead><tr><th scope="col">Label</th><th scope="col">Claim and qualification</th><th scope="col">Evidence</th></tr></thead><tbody>${g.claims.map(claimRow).join('')}</tbody></table></div>`).join('')}`;
}
function retrievalChart() {
  const rv = C.claim('retrieval-vector-beat-hybrid').value.strategies, dv = C.claim('synthetic-dev-set-flatters-retrieval').value, su = C.claim('similarity-is-not-sufficiency').value;
  const bar = (v, cls) => `<span class="rb-t" aria-hidden="true"><i class="${cls || ''}" style="--v:${v}"></i></span>`;
  const rows = CP.retrieval.strategies.map(([k, label]) => `<tr${k === 'vector' ? ' class="pick"' : ''}><th scope="row">${esc(label)}${k === 'vector' ? ' <em>chosen</em>' : ''}</th><td data-l="Hit@1 held-out">${bar(rv[k]['hit@1'])}<b>${rv[k]['hit@1'].toFixed(2)}</b></td><td data-l="MRR@10 held-out">${bar(rv[k]['mrr@10'], 'm')}<b>${rv[k]['mrr@10'].toFixed(2)}</b></td><td data-l="Hit@1 on the dev set">${bar(dv['dev_hit@1'][k], 'd')}<b>${dv['dev_hit@1'][k].toFixed(2)}</b></td><td data-l="Look-alikes returned when none existed"><b class="sf">${Math.round(su[k] * 100)}%</b></td></tr>`).join('');
  return `<figure class="cp-chart" data-claim="${CP.retrieval.claims.join(' ')}"><table><caption>Retrieval strategies on a frozen held-out set. Bars run from 0 to 1.</caption><thead><tr><th scope="col">Strategy</th><th scope="col">Hit@1 held-out</th><th scope="col">MRR@10 held-out</th><th scope="col">Hit@1 on the synthetic dev set</th><th scope="col">Look-alike evidence returned when none existed (n=11)</th></tr></thead><tbody>${rows}</tbody></table>
  <figcaption>${esc(CP.retrieval.caption)} The development set is templated and labelled by the generator itself, so it flatters every strategy. The cross-encoder reranker was not adopted: no ranking gain for about ${esc(C.token('reranker-not-justified.rerank_ms_median_20_passages').replace(/\.\d+$/, ''))} ms of extra CPU per query.</figcaption></figure>`;
}
const attackTable = () => `<table class="atk-table"><caption>Every injection attack type in the repository's end-to-end containment report, run against the deliberately obedient scripted model. All four invariants held in every row.</caption>
  <thead><tr><th scope="col">Hostile input</th><th scope="col">What the obedient model was told to do</th><th scope="col">What stopped it</th><th scope="col">Case ended as</th></tr></thead><tbody>${CP.attackRows.map((r) => `<tr data-attack="${esc(r.attack)}"><th scope="row"><code>${esc(r.attack)}</code></th><td data-l="Told to">${esc(r.ask)}</td><td data-l="Stopped by">${esc(r.contained)}</td><td data-l="Ended as"><code>${esc(r.state)}</code></td></tr>`).join('')}</tbody></table>`;
const LAYERS = [['Hostile input', 'in'], ['Model, obedient', 'model'], ['Deterministic layer', 'layer'], ['Case ends as', 'end']];
const replayHTML = () => `<div class="replay" id="replay" aria-label="Attack replay" hidden>
  <div class="replay-pick" role="group" aria-label="Choose an attack">${CP.attackRows.map((r, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${esc(r.attack)}</button>`).join('')}</div>
  <ol class="replay-lanes" aria-live="polite">${LAYERS.map(([n, k]) => `<li data-k="${k}"><span class="mono-l">${n}</span><b></b><p></p></li>`).join('')}</ol>
  <div class="replay-foot"><button type="button" class="btn" id="replay-play">Replay</button><ul class="replay-inv" aria-label="Invariants checked"><li>I1 no gated action without approval</li><li>I2 no cross-tenant exposure</li><li>I3 no customer e-mail</li><li>I4 no secret in logs or audit</li></ul></div></div>`;
const exampleHTML = () => `<ul class="cp-examples">${CP.examples.map((e) => `<li data-set="${e.set}" data-result="${e.result}"><p class="mono-l">${esc(e.id)} · ${esc(e.setLabel)}</p><p class="ex-draft">${e.text ? '“' + esc(e.text) + '”' : esc(e.category)}</p><button type="button" class="btn ex-run" aria-expanded="false">Run the recorded check</button><p class="ex-res" hidden><span class="ex-pill ${e.result === 'flagged' ? 'ok' : 'miss'}">${e.result === 'flagged' ? 'Flagged' : 'Not flagged'}</span> ${esc(e.resultText)}</p></li>`).join('')}</ul>`;
const screensHTML = () => `<div class="shots">${CP.screens.map((s) => `<figure><img src="assets/copilot/${s.file}" width="${s.w}" height="${s.h}" loading="lazy" decoding="async" alt="${esc(s.alt)}"><figcaption>${esc(s.caption)}</figcaption></figure>`).join('')}</div><p class="fine">Screenshots are from the repository at the pinned commit. Synthetic data, simulated sign-in, scripted model.</p>`;


/* ---------- the real-model run (case study) ---------- */
const RM = CP.realModel;
const realModelHTML = () => `<div class="rm-run">
  <p class="rt-sum rv">${esc(RM.lead)}</p>
  <ul class="rm-classes" aria-label="The four failure classes">${RM.classes.map((c) => `<li class="rm-class rv"><b>${esc(c.count)}</b><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></li>`).join('')}</ul>
  <div class="rm-split">${[RM.split.completion, RM.split.controls].map((x, i) => `<article class="rm-half rv" data-claim="${i ? 'real-model-controls-held' : 'real-model-expected-outcomes'}"><p class="mono-l">${badge('verified')} ${esc(x.title)}</p><p>${esc(x.text)}</p></article>`).join('')}</div>
  <h3 class="hm-h rv">What happened to the protocol</h3>
  <ol class="cp-beats rm-history rv" data-claim="real-model-protocol-history">${RM.history.map((b, i) => `<li class="beat-${i}"><span class="who">${esc(b.who)}</span><span>${esc(b.text)}</span></li>`).join('')}</ol>
  <p class="rt-qual rv">${badge('limitation')} <b>Disclosed.</b> ${esc(RM.disclosure)}</p>
  <nav class="lns rv" aria-label="Real-model run documentation">${RM.links.map(([label, , p]) => `<a class="ln" href="${pinned(p)}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`).join('')}</nav>
</div>`;

function pageJSON() {
  return `<script type="application/json" id="rm-copilot">${JSON.stringify({ attacks: CP.attackRows }).replace(/</g, '\\u003c')}</script>`;
}
const pageNavArgs = () => [[['Story', '#story'], ['Real model', '#real-model'], ['Attack', '#attack'], ['Residual', '#residual'], ['Retrieval', '#retrieval'], ['Evidence', '#evidence']], { home: './', brand: 'Ritesh Mamidi — portfolio home', back: ['← Portfolio', './'] }];
function pageMain() {
  const factsRow = ['Fictional customer', 'Synthetic data', 'Stand-in model by default', 'One real-model run (v0.7.0)', 'Never deployed'];
  return `<main id="main-content" class="cs">
  <header class="cs-head wrap" id="top"><p class="eyebrow"><i class="dot"></i>Case study · Flagship 01</p><h1>${esc(CP.title)}</h1><p class="cs-one">${esc(CP.oneLine)}</p>
    <ul class="cs-facts" aria-label="Status">${factsRow.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <div class="cs-cta"><a class="btn solid" href="#story">Follow one ticket through it</a><a class="btn" href="${REPO_URL}" target="_blank" rel="noopener">Repository ${ARROW}</a><a class="btn" href="#evidence">The evidence, labelled</a></div>
    <p class="rt-sum">${esc(CP.summary)}</p>${legendHTML()}</header>
  <section id="story" aria-label="Story: one ticket, ten steps">${stage(2, ['#evidence', 'See the evidence behind every step'])}</section>
  <section id="why" class="sec cs-sec" aria-labelledby="why-t"><div class="wrap"><p class="kicker rv"><b>01</b> The headline numbers</p><h2 id="why-t" class="statement rv">What was verified, what was simulated, and what one real-model run showed.</h2>${statsHTML()}</div></section>
  <section id="real-model" class="sec cs-sec" aria-labelledby="rm-h"><div class="wrap"><p class="kicker rv"><b>02</b> ${esc(RM.kicker)}</p><h2 id="rm-h" class="statement rv">${esc(RM.title)}</h2>${realModelHTML()}</div></section>
  <section id="attack" class="sec cs-sec" aria-labelledby="attack-h"><div class="wrap"><p class="kicker rv"><b>03</b> Adversarial story</p><h2 id="attack-h" class="statement rv">A malicious instruction reaches the model. The model may misbehave. The controls do not depend on it behaving.</h2>
    <div class="cs-two">${attackHTML()}<div class="cs-replay rv"><h3>Replay all ${CP.attackRows.length} attack types</h3><p class="cs-note">Recorded results from the repository's containment report. The obedient model is a scripted wrapper, not an LLM, and for the ${ONOFF.same} hostile-ticket attacks the outcomes were the same with the injection detectors switched off: containment does not depend on spotting the attack.</p>${replayHTML()}${attackTable()}</div></div></div></section>
  <section id="residual" class="sec cs-sec" aria-labelledby="res-h"><div class="wrap"><p class="kicker rv"><b>04</b> The residual risk</p><h2 id="res-h" class="statement rv">The weakness that stays: a convincing draft that is grounded and wrong.</h2>
    <div class="cs-two">${residualHTML()}<div class="cs-replay rv"><h3>Try the recorded checks</h3><p class="cs-note">Each result below was recorded when the repository's evaluation ran. Nothing is computed in your browser.</p>${exampleHTML()}</div></div></div></section>
  <section id="retrieval" class="sec cs-sec" aria-labelledby="ret-h"><div class="wrap"><p class="kicker rv"><b>05</b> Retrieval evaluation</p><h2 id="ret-h" class="statement rv">Vector search beat the alternatives on held-out tickets. The synthetic dev set flattered every strategy.</h2>${retrievalChart()}</div></section>
  <section id="screens" class="sec cs-sec" aria-labelledby="scr-h"><div class="wrap"><p class="kicker rv"><b>06</b> The operator surface</p><h2 id="scr-h" class="statement rv">What a person actually sees before they approve.</h2>${screensHTML()}</div></section>
  <section id="evidence" class="sec cs-sec" aria-labelledby="evd-h"><div class="wrap"><p class="kicker rv"><b>07</b> Evidence, labelled</p><h2 id="evd-h" class="statement rv">Every public claim, in the repository's own words.</h2><p class="cs-note">Generated from the public claims manifest. Only claims the repository marked suitable for a portfolio appear; claims it withheld are not shown here in any form.</p>${legendHTML()}${evidenceTable()}</div></section>
  <section id="next" class="sec cs-sec" aria-labelledby="nxt-h"><div class="wrap"><p class="kicker rv"><b>08</b> What comes next</p><h2 id="nxt-h" class="statement rv">What I would do to close the gaps.</h2><ol class="cs-next">${CP.next.map((n) => `<li>${esc(n)}</li>`).join('')}</ol><nav class="lns" aria-label="Repository and documentation">${links()}</nav>${provenance()}</div></section>
  </main>${pageJSON()}`;
}
const attackSummary = () => CP.attackRows;

module.exports = { C, CP, homeHTML, pageMain, pageNavArgs, stepsConfig, sceneData, badge, legendHTML, statsHTML, attackSummary, REPO, REPO_URL, SHA, SHORT, REL, pinned };
