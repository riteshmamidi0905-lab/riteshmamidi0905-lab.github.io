/* render.js — every piece of page markup, generated from data (data.js, content/*.json). One authored system:
   nothing here is hand-copied between the site and the recruiter view. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const { GH, CATLABEL, FLAG, P } = require(path.join(root, 'data.js'));
const site = require(path.join(root, 'content/site.json'));
const explainers = require(path.join(root, 'content/explainers.json'));
const research = require(path.join(root, 'content/research.json'));
const videos = require(path.join(root, 'content/videos.json'));
const timings = require(path.join(root, 'content/video-timings.json'));
const evidence = require(path.join(root, 'content/project-evidence.json'));
const RT = require(path.join(root, 'content/agent-runtime.json'));
const plinks = require(path.join(root, 'content/project-links.json'));
const { avatarHTML, worldHTML, stageHTML } = require('./worlds-html');
const CPR = require('./render-copilot');
const CP = CPR.CP;
const EVAL = require(path.join(root, 'content/llm-eval-framework.json'));
const MAREF = EVAL.maref, MAREF_GH = 'https://github.com/' + MAREF.repo, MAREF_PIN = (f) => `${MAREF_GH}/blob/${MAREF.sha}/${f}`;

const unesc = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const esc = (s) => unesc(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
const P_BY = Object.fromEntries(P.map((p) => [p.r, p]));
const mediaURL = (f) => 'assets/media/' + f + '?v=' + crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/media', f))).digest('hex').slice(0, 10);
const NUM = (i) => String(i + 1).padStart(2, '0');

/* ---------- evidence links: only destinations that verifiably exist ---------- */
function evidenceLinks(r) {
  const l = plinks[r] || {}, sha = evidence[r], out = [];
  out.push({ label: 'Repository', href: GH + r, kind: 'repo' });
  if (sha) out.push({ label: 'Reviewed snapshot', href: `${GH}${r}/tree/${sha}`, kind: 'snapshot' });
  if (l.tests) out.push({ label: 'Tests', href: `${GH}${r}/tree/${sha}/${l.testsPath || 'tests'}`, kind: 'tests' });
  if (l.architecture) out.push({ label: 'Architecture doc', href: `${GH}${r}/blob/${sha}/docs/architecture.md`, kind: 'architecture' });
  const p = P_BY[r];
  if (p && p.dm) out.push({ label: 'Live demo', href: p.dm, kind: 'demo' });
  return out;
}

/* ---------- navigation ---------- */
const NAV_LINKS = [['Copilot', '#copilot'], ['Agent runtime', '#runtime'], ['Evaluation', '#evaluation'], ['Also built', '#also-built'], ['Experience', '#experience'], ['About', '#about']];
function navHTML(links, o) {
  o = o || {}; links = links || NAV_LINKS;
  return `<header class="nav" id="nav"><div class="nav-in">
  <a class="brand" href="${o.home || '#hero'}" aria-label="${esc(o.brand || site.person.name + ' — top')}"><span class="mk">RM</span><span class="bn">${esc(site.person.name)}</span></a>
  <nav class="nl" id="nlinks" aria-label="Sections">${links.map(([n, h]) => `<a href="${h}">${n}</a>`).join('')}${o.noProjects ? '' : '<a href="projects.html">All projects</a>'}<a class="nl-rec" href="${o.back ? o.back[1] : 'recruiter.html'}">${o.back ? o.back[0] : 'Recruiter view'}</a><a class="nl-cta" href="${o.home ? o.home + '#contact' : '#contact'}">Contact</a></nav>
  <button class="burger" id="burger" aria-label="Menu" aria-expanded="false" aria-controls="nlinks"><span></span><span></span></button>
</div><div class="nav-bar" id="bar" aria-hidden="true"></div></header>`;
}

/* ---------- 01 hero ---------- */
const RT_STAT = (k) => RT.stats.find((x) => x[1].startsWith(k));
function proofHTML() {
  const cs = Object.fromEntries(CP.stats.map((x) => [x.claim, x])), tk = (e) => CPR.C.token(e);
  const tests = RT_STAT('tests')[0], scen = RT_STAT('scenarios reached')[0].replace(/\s/g, ''), A = RT.arb;
  return `<ul class="proof" aria-label="Flagship evidence at a glance">
    <li><a href="#copilot"><i class="layer">I build AI agents</i><b>Support Escalation Copilot</b><span>${CPR.badge('verified')} ${esc(cs['test-suite'].value)} tests · ${esc(cs['threat-catalogue'].value.replace(/\s/g, ''))} attacks executable</span><span>${CPR.badge('verified')} one real-model run: ${esc(tk('real-model-expected-outcomes.expected_outcome_attained'))}/${esc(tk('real-model-expected-outcomes.cases'))} cases reached the frozen expected outcome</span><span>${CPR.badge('simulated')} default model: stand-in, not an LLM</span></a></li>
    <li><a href="#runtime"><i class="layer">I build the infrastructure they run on</i><b>AI Agent Runtime · Agent Runtime Benchmark</b><span>${CPR.badge('verified')} ${esc(tests)} tests · ${esc(scen)} scenarios (scripted models)</span><span>${CPR.badge('verified')} ARB-1: ${esc(A.results[0][0])} tasks · ${esc(A.results[1][0])} controls held · ${esc(A.results[2][0])} information-flow gap</span></a></li>
    <li><a href="#evaluation"><i class="layer">I evaluate how they fail</i><b>llmeval · MAREF</b><span>${CPR.badge('verified')} ${esc(EVAL.stats[0][0])} tests · llmeval metric suite</span><span>${CPR.badge('limitation')} MAREF: Research prototype · ${esc(EVAL.maref.card.title.split(' · ').pop())}</span></a></li>
    <li><a href="#experience"><b>Now · Data &amp; AI Analyst</b><span>Apple: validating LLM and ML outputs against quality rubrics</span></a></li>
  </ul>`;
}
function heroHTML() {
  const pr = site.person;
  return `<section id="hero" class="hero" data-world="hero" aria-labelledby="hero-title">
  <canvas class="world-canvas" aria-hidden="true"></canvas>
  <div class="hero-vig" aria-hidden="true"></div>
  ${avatarHTML('hero', { cls: 'hero-av', tag: false, eager: true, alt: pr.name, sizes: '(max-width:900px) 27svh, min(560px, 57svh)' })}
  <div class="hero-copy">
    <p class="eyebrow"><i class="dot"></i>${esc(pr.location)} · open to roles</p>
    <h1 id="hero-title" class="hero-name">Ritesh<br>Mamidi</h1>
    <p class="tagline">${site.hero.tagline.map((l, i, a) => (i === a.length - 1 ? `<em>${esc(l)}</em>` : esc(l))).join('<br>')}</p>
    <p class="hero-sub">${esc(site.hero.sub)}</p>
    ${proofHTML()}
    <div class="hero-cta"><a class="btn solid" href="#copilot">See the flagship systems ${DOWN}</a><a class="btn" href="recruiter.html">Recruiter view ${ARROW}</a><a class="btn" href="${pr.resume}" target="_blank" rel="noopener">Résumé ${ARROW}</a><a class="btn" href="${pr.github}" target="_blank" rel="noopener">GitHub ${ARROW}</a></div>
  </div>
  <a class="scue" href="#key" aria-label="Scroll to the next section"><span></span>Scroll</a>
</section>`;
}

/* ---------- the evidence key: the four labels, defined once, directly under the hero ---------- */
const keyHTML = () => `<section id="key" class="keyband" aria-labelledby="key-t"><div class="wrap"><p class="mono-l rv" id="key-t">How to read the evidence · three separate pieces of work, not one deployed system</p>${CPR.legendHTML()}</div></section>`;
const layerHTML = (t) => `<p class="layer-l rv"><span class="layer">${esc(t)}</span></p>`;

/* ---------- labs (real demos), grouped under the chapter they belong to ---------- */
const LAB = {
  agent: ['Agent trace explorer', 'Type an objective and step through Objective → Planning → Tools → Execution → Evaluation → Result. This runs the ReAct loop from <b>ai-agent-toolkit</b> in your browser: a rule-based planner, four safe tools (the calculator never uses <code>eval</code>), and a structured trace. It shows execution state, not model reasoning.', 'Real deterministic code · no language model · offline', ''],
  rag: ['RAG explorer', 'Ask a question over a <b>fixed sample corpus</b> (four fictional “Acme Cloud” documents from <b>genai-doc-assistant</b>). See the chunks, the hashed-embedding retrieval and keyword re-rank, and how the extractive reader builds a cited answer, or abstains. Then run the repository’s own retrieval eval set.', 'Fixed sample corpus · deterministic · no language model', ''],
  stream: ['Streaming pipeline', 'A producer generates <b>synthetic transactions</b> with the same logic as <b>realtime-streaming-pipeline</b>: fraud rules, one-minute event-time windows and a two-minute watermark. Capacity starts below the event rate, so the lag builds; raise capacity to drain it. Add late events and watch the watermark drop them.', 'Synthetic events · simulated clock · no Kafka, Spark or Cassandra involved', ''],
  maref: ['Proxy-metric playground', 'Score recorded sample agent runs on six proxy dimensions. The scores are <b>deterministic proxy heuristics</b> built from metrics in <b>llm-eval-framework</b> (token F1, faithfulness, number match). Edit the output text and watch each dimension react. Gates are per dimension, so a good average cannot hide a bad answer. <b>This is an illustration of the idea, not the MAREF implementation.</b>', 'Proxy heuristics · not an LLM judge · not MAREF and not its results (see the evaluation above)', 'warn'],
  experiment: ['Experimentation lab', 'Set visitors and conversions for each arm. The pooled two-proportion z-test, confidence interval, power, sample size and decision rule from <b>experimentation-toolkit</b> run live on your inputs. Then see why peeking at a test early produces false positives.', 'Real statistics · computed from your inputs', ''],
  funnel: ['Funnel explorer', 'Change acquisition, activation, retention and conversion assumptions and watch counts, leaks and revenue update. The defaults are <b>placeholders, not data from any real product</b>, and retention follows a simple modelled decay curve.', 'Your assumptions · modelled retention · not measured data', 'warn'],
};
const labPanel = (id, first) => `<div class="lab-panel" id="lab-${id}" role="tabpanel" aria-labelledby="tab-${id}" data-lab="${id}"${first ? '' : ' hidden'}>
    <div class="lab-head"><h3>${LAB[id][0]}</h3><p class="lab-what">${LAB[id][1]}</p><span class="lab-label ${LAB[id][3]}">${id === 'experiment' ? '' : CPR.badge('simulated') + ' '}${LAB[id][2]}</span></div>
    <div class="lab-ui" data-ui="${id}"></div></div>`;
function demoHTML(group, ids, label) {
  const tabs = ids.map((id, i) => `<button role="tab" id="tab-${id}" aria-controls="lab-${id}" aria-selected="${i === 0}" data-lab="${id}"${i ? ' tabindex="-1"' : ''}>${LAB[id][0]}</button>`).join('');
  return `<div class="demo" data-group="${group}"><div class="demo-head"><p class="kicker"><b>Run it</b> ${esc(label)}</p>${ids.length > 1 ? `<div class="seg" role="tablist" aria-label="${esc(label)} demos">${tabs}</div>` : `<div class="seg one" role="tablist"><button role="tab" id="tab-${ids[0]}" aria-controls="lab-${ids[0]}" aria-selected="true" data-lab="${ids[0]}">${LAB[ids[0]][0]}</button></div>`}</div>
  ${ids.map((id, i) => labPanel(id, i === 0)).join('\n  ')}</div>`;
}
const explainsHTML = (key, persona, label) => `<aside class="explains rv" aria-label="Ritesh explains">
  <div class="ex-av">${avatarHTML(persona, { cls: 'ex-face', tag: false, sizes: '88px' })}</div>
  <div><p class="eyebrow">Ritesh explains</p><p class="quote">${esc(site.explains[key])}</p>${label ? `<p class="ex-more">${label}</p>` : ''}</div></aside>`;

const CHAPTERS = {
  ai: { world: 'agents', persona: 'ai', demos: ['agent', 'rag'], label: 'in your browser' },
  data: { world: 'data', persona: 'data', demos: ['stream'], label: 'in your browser' },
  product: { world: 'product', persona: 'product', demos: ['experiment', 'funnel'], label: 'in your browser' },
};
/* ---------- Flagship 02: AI Agent Runtime + Agent Runtime Benchmark ---------- */
const rtLink = ([label, p, kind]) => { const href = kind === 'repo' ? GH + RT.repo : kind === 'ext' ? p : `${GH}${RT.repo}/${kind}/${RT.sha}/${p}`; return `<a class="ln" href="${href}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`; };
const arbLink = ([label, p, kind]) => { const href = kind === 'repo' ? GH + RT.arb.repo : `${GH}${RT.arb.repo}/${kind}/${RT.arb.sha}/${p}`; return `<a class="ln" href="${href}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`; };
const ARB_BADGE = ['verified', 'verified', 'limitation'];
const arbStatsHTML = () => `<ul class="rt-stats arb-stats rv" aria-label="Agent Runtime Benchmark results">${RT.arb.results.map((x, i) => `<li class="${i === 2 ? 'arb-gap' : ''}">${CPR.badge(ARB_BADGE[i])}<b>${esc(x[0])}</b><span>${esc(x[1])}</span><small>${esc(x[2])}</small></li>`).join('')}</ul>`;
const lessonHTML = () => `<aside class="lesson rv" id="arb-lesson" aria-labelledby="arb-lesson-t"><p class="mono-l">${CPR.badge('limitation')} The lesson from the failure</p><h3 id="arb-lesson-t">${esc(RT.arb.lessonTitle)}</h3><p>${esc(RT.arb.lesson)}</p></aside>`;
const arbQualHTML = () => `<p class="rt-qual rv" id="arb-qual"><b>Qualification.</b> ${esc(RT.arb.qualifier)} <span class="mut">Source: public benchmark repository at commit <code>${RT.arb.sha.slice(0, 7)}</code>.</span></p>`;
function runtimeHTML(o) {      /* the full page: pinned scene, evidence, evaluation detail, limitations, documentation */
  o = o || {};
  const stage = stageHTML({ id: 'world-runtime', scene: 'runtime', key: 'runtime', kicker: 'Flagship 02 · Agent engineering', title: RT.title, h: o.h || 2, note: RT.tech.join(' · '), sub: RT.oneLine, steps: RT.steps, cta: [GH + RT.repo, 'Read the repository'], cls: 'runtimestage' });
  return `<section id="runtime" class="flagsec" aria-label="Flagship 02: ${esc(RT.short)}">${stage}
  <div class="wrap rt-after" id="agent-runtime">
    <p class="rt-sum rv">${esc(RT.summary)}</p>
    <ul class="rt-stats rv" aria-label="Verified evidence">${RT.stats.map((x) => `<li><b>${esc(x[0])}</b><span>${esc(x[1])}</span><small>${esc(x[2])}</small></li>`).join('')}</ul>
    <p class="rt-qual rv">${CPR.badge('simulated')} <b>Qualification.</b> ${esc(RT.qualifier)} <span class="mut">Source: public repository at commit <code>${RT.sha.slice(0, 7)}</code>.</span></p>
    <div class="rt-cols rv">
      <details class="rt-det"><summary>Evaluation in detail</summary><p>${esc(RT.evalDetail)}</p><p><a class="ln" href="${GH}${RT.repo}/blob/${RT.sha}/docs/eval-report.md" target="_blank" rel="noopener">Full evaluation report ${ARROW}</a></p></details>
      <div class="rt-lim"><h4>${CPR.badge('limitation')} Limitations</h4><ul>${RT.limitations.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <nav class="lns rv" aria-label="${esc(RT.short)} repository and documentation">${RT.docs.map(rtLink).join('')}</nav>
  </div></section>
  <section id="arb" class="sec arb-sec" aria-labelledby="arb-t"><div class="wrap">
    <p class="kicker rv"><b>ARB-1</b> Agent Runtime Benchmark</p>
    <h2 id="arb-t" class="statement rv">One real model through the unmodified runtime. <span class="mut">The controls held. The benchmark still found a hole.</span></h2>
    <p class="rt-sum rv">${esc(RT.arb.line)}</p>
    ${arbStatsHTML()}${lessonHTML()}${arbQualHTML()}
    <p class="mc-rel rv">The recorded runs of this benchmark are what MAREF, a separate research prototype, evaluates. MAREF is an evaluator of agent runs, not an agent; its result is mixed and its evaluation is same-author, <b>not independent validation</b>. <a class="tl" href="evaluation.html#maref">Read the MAREF result</a>.</p>
    <nav class="lns rv" aria-label="Agent Runtime Benchmark repository and documentation">${RT.arb.docs.map(arbLink).join('')}</nav>
  </div></section>`;
}
function runtimeHomeHTML() {   /* the homepage version: one screen of scene, then the architecture, the two results and the lesson */
  const stage = stageHTML({ id: 'world-runtime', scene: 'runtime', key: 'runtime', kicker: 'Flagship 02 · Agent engineering', title: RT.title, h: 2, note: RT.tech.join(' · '), sub: RT.oneLine, steps: RT.steps, cta: ['agent-runtime.html', 'Read the runtime and the benchmark in full'], cls: 'runtimestage', compact: true });
  const pick = (k) => RT_STAT(k), keep = ['tests', 'scenarios reached', 'integration tests'].map(pick);
  return `<section id="runtime" class="flagsec" aria-label="Flagship 02: ${esc(RT.short)} and the Agent Runtime Benchmark">${stage}
  <div class="wrap rt-after rt-home" id="agent-runtime-home">
    ${layerHTML('I build the infrastructure they run on')}
    <p class="rt-sum rv">${esc(RT.summary)}</p>
    <h3 class="hm-h rv">The runtime, tested with scripted models</h3>
    <ul class="rt-stats rv" aria-label="Verified evidence for the runtime">${keep.map((x) => `<li><b>${esc(x[0])}</b><span>${esc(x[1])}</span><small>${esc(x[2])}</small></li>`).join('')}</ul>
    <p class="rt-qual rv">${CPR.badge('simulated')} <b>Qualification.</b> ${esc(RT.qualifier)} <span class="mut">Source: public repository at commit <code>${RT.sha.slice(0, 7)}</code>.</span></p>
    <h3 class="hm-h rv">${esc(RT.arb.title)}: one real model through the unmodified runtime</h3>
    ${arbStatsHTML()}${lessonHTML()}${arbQualHTML()}
    <nav class="lns rv" aria-label="Runtime and benchmark links"><a class="ln" href="agent-runtime.html">Runtime and benchmark in full ${ARROW}</a><a class="ln" href="${GH}${RT.repo}" target="_blank" rel="noopener">Runtime repository ${ARROW}</a>${RT.arb.docs.map(arbLink).join('')}</nav>
  </div></section>`;
}

function chapterHTML(id) {
  const c = CHAPTERS[id];
  return `<section id="${id}" class="chapter">
  ${worldHTML(c.world)}
  <div class="wrap chapter-body">
    ${explainsHTML(id, c.persona)}
    ${demoHTML(id, c.demos, c.label)}
  </div></section>`;
}

/* ---------- 06 flagships: each is a full-screen pinned scene; the architecture IS the scene ---------- */
const FLAG_SCENE = { 'realtime-streaming-pipeline': 'flag-stream', 'spark-data-lakehouse': 'flag-lake', 'llm-eval-framework': 'flag-eval', 'genai-doc-assistant': 'flag-rag', 'mlops-platform': 'flag-drift', 'experimentation-toolkit': 'flag-ab' };
const flagSteps = (f) => f.cs.arch.map((n, i) => [n, explainers[f.r].arch[i]]);
const flagStepsConfig = () => Object.assign(Object.fromEntries(FLAG.map((f) => ['flag:' + f.r, { steps: flagSteps(f) }])), Object.assign({ runtime: { steps: RT.steps }, 'runtime-data': { ladder: RT.ladder, arch: RT.arch, sse: RT.sse, gates: RT.gates, guards: RT.guards, stats: RT.stats, qualifier: RT.qualifier, sha: RT.sha.slice(0, 7) } }, CPR.stepsConfig()));

const SPEC = [['What it is', 0], ['How it works', 2], ['Engineering decisions', 3], ['Tradeoffs', 5], ['Limitations', 6], ['Evaluation', 4], ['What I would build next', 7]];
function videoHTML(vid) {
  const v = videos.find((x) => x.id === vid), t = timings[vid], dur = v.duration;
  return `<figure class="film"><video controls preload="none" playsinline data-poster="${mediaURL(v.poster + '-poster.webp')}" aria-label="${esc(v.title)}"><source src="${mediaURL(vid + '.mp4')}" type="video/mp4"><track kind="captions" src="${mediaURL(vid + '.vtt')}" srclang="en" label="English captions" default></video>
  <figcaption><b>${esc(v.title)}</b><span>${esc(v.format)} · captioned · synthetic narrator · illustrative workflow, not live telemetry</span></figcaption></figure>`;
}
function flagshipHTML(f, i, kicker, level) {
  const x = explainers[f.r], persona = x.persona, lab = site.labFor[f.r], vids = site.videos[f.r] || [];
  const ev = evidenceLinks(f.r);
  if (x.arch.length !== f.cs.arch.length) throw new Error('arch mismatch ' + f.r);
  const spec = SPEC.map(([label, idx]) => `<div class="sp"><dt>${label}</dt><dd>${esc(x.beats[idx][1])}</dd></div>`).join('');
  const links = ev.map((e) => `<a class="ln" href="${e.href}" target="_blank" rel="noopener">${e.label} ${ARROW}</a>`).join('') + (lab ? `<a class="ln run" href="#${lab}">Run it ${DOWN}</a>` : '');
  const accent = { data: 'var(--blue)', research: 'var(--violet)', ai: 'var(--ac)', product: 'var(--amber)', builder: 'var(--ac)' }[persona];
  const stage = stageHTML({ id: 'flag-' + f.r, cls: 'flagstage', scene: FLAG_SCENE[f.r], key: 'flag:' + f.r, kicker: kicker || `Supporting build ${NUM(i)} · ${CATLABEL[f.c]}`, title: f.n, h: level || 3, note: f.tech.join(' · '), sub: f.one, steps: flagSteps(f) });
  return `<article class="flag" data-repo="${f.r}" style="--fa:${accent}">
  ${stage}
  <div class="flag-after wrap">
    <div class="flag-body">
      ${explainsHTML(f.r, persona)}
      <dl class="spec rv">${spec}</dl>
    </div>
    <div class="flag-foot rv"><nav class="lns" aria-label="${esc(f.n)} evidence and links">${links}</nav></div>
    ${vids.length ? `<details class="filmbox"><summary>Watch ${vids.length > 1 ? 'the films' : 'the film'} <span>captioned · loads on demand</span></summary><div class="films">${vids.map(videoHTML).join('')}</div></details>` : ''}
  </div>
</article>`;
}
const EVAL_REPO = 'llm-eval-framework';
const SUPPORTING = FLAG.filter((f) => f.r !== EVAL_REPO);
const supportingIntroHTML = () => `<section id="supporting" class="sec supp" aria-labelledby="supp-t"><div class="wrap">
  <p class="kicker rv"><b>Run it</b> Explorers</p>
  <h2 id="supp-t" class="statement rv">The same habits in other domains. <span class="mut">Explorers you can run, and five more systems built end to end.</span></h2>
  <p class="supp-note rv">These are smaller or older than the flagships and are labelled that way: tests and limits are public, and several run entirely in your browser on synthetic data.</p>
</div></section>`;
const flagshipsHTML = () => `<section id="flagships" class="sec flags" aria-labelledby="flags-t"><div class="wrap flags-intro">
  <p class="kicker rv"><b>Built</b> Supporting builds</p>
  <h2 id="flags-t" class="statement rv">Five more systems, built end to end. <span class="mut">Code, tests, decisions and limitations are public.</span></h2>
  </div>
  ${SUPPORTING.map((f, i) => flagshipHTML(f, i)).join('\n')}
  </section>`;

/* ---------- Flagship 03: evaluation. llmeval is tested; MAREF is a research prototype with a mixed result and says so ---------- */
const llmevalEvidenceHTML = (bridge) => `<div class="wrap eval-ev" id="llmeval-evidence">
    <ul class="rt-stats rv" aria-label="Verified evidence for llmeval">${EVAL.stats.map((x) => `<li>${CPR.badge('verified')}<b>${esc(x[0])}</b><span>${esc(x[1])}</span><small>${esc(x[2])}</small></li>`).join('')}</ul>
    <p class="rt-qual rv"><b>Qualification.</b> ${esc(EVAL.qualifier)} <span class="mut">Source: public repository at commit <code>${EVAL.sha.slice(0, 7)}</code>, re-run ${esc(EVAL.verifiedOn)}.</span></p>
    ${bridge ? `<p class="eval-bridge rv">${esc(EVAL.bridge)} <a class="ln" href="${esc(CP.caseStudy)}#retrieval">See the retrieval evaluation ${ARROW}</a></p>` : ''}
  </div>`;
function evaluationHTML() {    /* the full page */
  const f = FLAG.find((x) => x.r === EVAL_REPO);
  return `<section id="evaluation" class="flagsec" aria-label="Flagship 03: LLM evaluation">
  ${flagshipHTML(f, 0, 'Flagship 03 · AI evaluation', 1)}
  ${llmevalEvidenceHTML(true)}
  ${marefHTML()}
  </section>`;
}
const marefCardHTML = (id) => `<div class="maref-card" id="${id}" role="group" aria-label="MAREF result summary">
        <p class="mc-title">${esc(MAREF.card.title)}</p>
        <p class="mc-nums">${esc(MAREF.card.numbers)}</p>
        <p class="mc-claim">${esc(MAREF.card.claim)}</p>
        <p class="mc-go"><a class="ln" id="maref-eval-link" href="${MAREF_PIN('docs/EVALUATION.md')}" target="_blank" rel="noopener">${esc(MAREF.card.link)}</a></p>
      </div>`;
function evaluationHomeHTML() {   /* the homepage version: llmeval in one block, MAREF as a compact card */
  const f = FLAG.find((x) => x.r === EVAL_REPO);
  return `<section id="evaluation" class="sec flagsec evalhome" aria-labelledby="eval-t"><div class="wrap">
    ${layerHTML('I evaluate how they fail')}
    <p class="kicker rv"><b>Flagship 03</b> AI evaluation</p>
    <h2 id="eval-t" class="hm-title rv">LLM evaluation: llmeval and MAREF</h2>
    <p class="rt-sum rv">${esc(f.one)} <span class="mut">llmeval keeps weighted scores and hard thresholds separate, so a good average cannot hide a failed grounding check.</span></p>
    ${llmevalEvidenceHTML(false)}
    <div id="maref" class="maref-home">
      <h3 class="hm-h rv">MAREF: evaluating agent runs, not an agent</h3>
      <p class="paper-status rv">${CPR.badge('limitation')} <b>${esc(MAREF.disclosure)}</b> The canonical wording is <a class="tl" href="${MAREF_PIN('docs/CLAIM.md')}" target="_blank" rel="noopener">CLAIM.md</a>.</p>
      ${marefCardHTML('maref-card')}
      <p class="mc-rel">MAREF is an <b>evaluator of agent runs, not an agent</b>. It evaluates the runs recorded by the Agent Runtime Benchmark (<a class="tl" href="${GH}agent-runtime-bench" target="_blank" rel="noopener">ARB-1</a>), which exercises the AI Agent Runtime above. <a class="tl" href="${MAREF_GH}" target="_blank" rel="noopener">MAREF repository</a>.</p>
    </div>
    <nav class="lns rv" aria-label="Evaluation links"><a class="ln" href="evaluation.html">llmeval and the MAREF research page ${ARROW}</a><a class="ln" href="${GH}${EVAL_REPO}" target="_blank" rel="noopener">llmeval repository ${ARROW}</a></nav>
  </div></section>`;
}

/* ---------- 07 MAREF: research tone ---------- */
function marefHTML() {
  const d = research.dimensions;
  const dims = d.map((x, i) => `<button class="dimension" type="button" aria-pressed="${i === 0}" data-i="${i}" data-name="${esc(x.name)}"><span class="dn">${NUM(i)}</span><span class="dq">${esc(x.name)}</span></button>`).join('');
  return `<section id="maref" class="chapter research-ch">
  ${worldHTML('maref')}
  <div class="wrap chapter-body">
    ${explainsHTML('maref', 'research')}
    <article class="paper" id="research" aria-labelledby="paper-t">
      <p class="paper-status">${CPR.badge('limitation')} <b>${esc(MAREF.disclosure)}</b> The canonical wording is <a class="tl" href="${MAREF_PIN('docs/CLAIM.md')}" target="_blank" rel="noopener">CLAIM.md</a>.</p>
      ${marefCardHTML('maref-card')}
      <p class="mc-rel">MAREF is an <b>evaluator of agent runs, not an agent</b>. It evaluates the runs recorded by the Agent Runtime Benchmark (<a class="tl" href="https://github.com/riteshmamidi0905-lab/agent-runtime-bench" target="_blank" rel="noopener">ARB-1</a>), which exercises the AI Agent Runtime above. <a class="tl" href="${MAREF_GH}" target="_blank" rel="noopener">MAREF repository</a>.</p>
      <h3 id="paper-t" class="paper-title">MAREF: ${esc(research.expansion)}</h3>
      <p class="paper-sub"><em>Evaluating the Reliability of Large Language Model Agents: A Multi-Metric Framework for Accuracy, Hallucination, Consistency, and Task Completion.</em></p>
      <p class="paper-abs"><b>Abstract.</b> An agent can answer correctly and still be unreliable: ungrounded, inconsistent, or unfinished. MAREF evaluates a whole agent run (its tool calls, side effects and ending, not only the final text) on eight dimensions so each failure mode can be inspected on its own instead of being averaged into one score. The explorer below walks through six of them with illustrative examples; the other two are action correctness and policy and injection safety. The measured result is in the card above.</p>
      <div class="paper-grid">
        <div class="dims-col" role="group" aria-label="MAREF dimensions">${dims}</div>
        <div class="dim-panel" aria-live="polite"><p class="mono-l" id="dimensionNum">Dimension 01</p><h4 id="dimensionTitle">${esc(d[0].name)}</h4><p class="dim-q" id="dimensionQ">${esc(d[0].question)}</p>
          <p><b>Method.</b> <span id="dimensionMethod">${esc(d[0].method)}</span></p>
          <p class="dim-ex"><b>Illustrative example (not an experimental result).</b> <span id="dimensionEx">${esc(d[0].example)}</span></p>
          <ol class="dim-flow" id="dimensionFlow">${d[0].flow.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
      </div>
      <p class="paper-note">Illustrative Example — Not Experimental Results. The explorer and the playground below are illustrations: the playground scores <em>recorded sample runs</em> with deterministic proxies built from llmeval metrics. They are not MAREF's implementation and measure no model; MAREF's measured results are in the full evaluation linked above.</p>
    </article>
    ${demoHTML('maref', ['maref'], 'on recorded sample runs')}
  </div></section>
<script type="application/json" id="rm-maref">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`;
}

/* ---------- 05 experience: the career story, in the order it happened ---------- */
function progressionHTML(prefix) {
  prefix = prefix || '';
  return `<div class="prog rv"><p class="mono-l">How the work progressed</p><ol class="prog-list">${site.progression.map((p, i) => `<li class="${p.kind === 'Professional' ? 'pro' : 'ind'}"><span class="prog-n">${NUM(i)}</span><div><p class="prog-k ${p.kind === 'Professional' ? 'pro' : 'ind'}">${esc(p.kind)}</p><h3>${esc(p.stage)}</h3><p>${esc(p.text)}</p>${p.href ? `<a class="ln" href="${p.href[0] === '#' ? prefix + p.href : p.href}">${esc(p.link)} ${p.href[0] === '#' ? DOWN : ARROW}</a>` : ''}</div></li>`).join('')}</ol></div>`;
}
function experienceHTML() {
  const items = site.experience.map((e) => `<li class="role rv"><div class="role-when"><span>${esc(e.when)}</span>${e.current ? '<i class="cur">current</i>' : ''}</div>
    <div><h3>${esc(e.role)}</h3><p class="role-org">${esc(e.org)} · ${esc(e.where)}</p><ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></li>`).join('');
  return `<section id="experience" class="sec" aria-labelledby="exp-t"><div class="wrap">
  <p class="kicker rv"><b>Experience</b> Professional work</p>
  <h2 id="exp-t" class="hm-title rv">${esc(site.experienceHeading)}</h2>
  <p class="exp-lead rv">${esc(site.experienceLead)}</p>
  <ol class="timeline">${items}</ol>
  <p class="fine rv">${esc(site.experienceNote)}</p>
</div></section>`;
}

/* ---------- also built: product, analytics and data engineering as compact cards; the full list lives on projects.html ---------- */
function alsoBuiltHTML() {
  const card = (r, line) => {
    const p = P_BY[r], fl = FLAG.some((f) => f.r === r);
    return `<li class="ab-card rv"><h4>${esc(p.n)}</h4><p>${esc(line)}</p><p class="ab-t">${p.t.map((t) => `<i>${esc(t)}</i>`).join('')}</p>
      <p class="ab-l"><a href="${GH}${r}" target="_blank" rel="noopener" aria-label="${esc(p.n)} on GitHub">Code ${ARROW}</a>${fl ? `<a href="projects.html#flag-${r}" aria-label="${esc(p.n)} case study">Case study</a>` : ''}</p></li>`;
  };
  return `<section id="also-built" class="sec alsob" aria-labelledby="ab-t"><div class="wrap">
  <p class="kicker rv"><b>Also built</b> Product, analytics and data engineering</p>
  <h2 id="ab-t" class="hm-title rv">${esc(site.alsoBuilt.heading)}</h2>
  ${site.alsoBuilt.groups.map((g) => `<h3 class="hm-h rv">${esc(g.title)}</h3><ul class="ab-grid">${g.items.map(([r, line]) => card(r, line)).join('')}</ul>`).join('')}
  <p class="fine rv">${esc(site.alsoBuilt.note)} <a href="projects.html#projects">All ${P.length} projects ${ARROW}</a></p>
</div></section>`;
}

const flagHref = (r) => (r === 'support-escalation-copilot' ? CP.caseStudy : r === RT.repo ? 'agent-runtime.html' : r === EVAL_REPO ? 'evaluation.html#flag-' + r : FLAG.some((f) => f.r === r) ? '#flag-' + r : '');
/* ---------- 09 all projects: compact, searchable, late ---------- */
function projectsHTML() {
  const cats = Object.entries(CATLABEL);
  const rows = P.map((p) => {
    const fl = FLAG.some((f) => f.r === p.r) || !!p.feat;
    return `<li class="prow" data-cat="${p.c}" data-q="${esc((p.n + ' ' + p.d + ' ' + p.t.join(' ') + ' ' + CATLABEL[p.c]).toLowerCase())}">
    <button class="pr-main" type="button" data-repo="${p.r}" aria-haspopup="dialog"><span class="pn">${esc(p.n)}${fl ? '<i class="fl">flagship</i>' : ''}</span><span class="pd">${esc(p.d)}</span></button>
    <span class="pt">${p.t.map((t) => `<i>${esc(t)}</i>`).join('')}</span>
    <span class="pl"><a href="${GH}${p.r}" target="_blank" rel="noopener" aria-label="${esc(p.n)} on GitHub">Code ${ARROW}</a>${p.dm ? `<a href="${p.dm}" target="_blank" rel="noopener" aria-label="${esc(p.n)} live demo">Demo ${ARROW}</a>` : ''}</span></li>`;
  }).join('');
  const data = Object.fromEntries(P.map((p) => [p.r, { n: p.n, d: p.d, t: p.t, c: CATLABEL[p.c], flag: FLAG.some((f) => f.r === p.r) || !!p.feat, fh: flagHref(p.r), ev: evidenceLinks(p.r), visual: fs.existsSync(path.join(root, 'project-visuals', p.r + '.svg')) }]));
  return `<section id="projects" class="sec lib" aria-labelledby="proj-t"><div class="wrap">
  <p class="kicker rv"><b>Library</b> All projects</p>
  <h2 id="proj-t" class="statement rv">${P.length} projects. <span class="mut">The three flagships on the homepage are the ones to read first.</span></h2>
  <div class="lib-ctl rv"><label class="vh" for="psearch">Search projects</label><input id="psearch" type="search" placeholder="Search ${P.length} projects, e.g. kafka, rag, churn" autocomplete="off">
    <div class="chips" role="group" aria-label="Filter by area"><button type="button" data-f="all" aria-pressed="true">All</button>${cats.map(([k, v]) => `<button type="button" data-f="${k}" aria-pressed="false">${esc(v)}</button>`).join('')}</div>
    <p class="fine" id="filterStatus" role="status">${P.length} projects</p></div>
  <ul class="plist" id="pgrid">${rows}</ul>
  <p class="empty" id="pempty" hidden>No project matches. Try a different word.</p>
</div></section>
<script type="application/json" id="rm-projects">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
const progressionSectionHTML = () => `<section id="progression" class="sec" aria-labelledby="prog-t"><div class="wrap"><p class="kicker rv"><b>Path</b> How the work progressed</p><h2 id="prog-t" class="statement rv">From professional quality work to independent AI systems.</h2>${progressionHTML('./')}</div></section>`;
const detailDialog = () => `<dialog class="pd-dlg" id="pdetail" aria-labelledby="pd-title"><form method="dialog" class="pd-x"><button aria-label="Close">&#10005;</button></form>
  <p class="eyebrow" id="pd-cat"></p><h3 id="pd-title"></h3><p class="pd-what" id="pd-what"></p>
  <div class="pd-grid"><div><h4>Technology</h4><p class="pd-tech" id="pd-tech"></p><h4>Evidence</h4><ul class="pd-ev" id="pd-ev"></ul><p class="fine" id="pd-flag"></p></div>
  <figure class="pd-vis" id="pd-vis" hidden><figcaption>Illustrative workflow, not live telemetry</figcaption></figure></div></dialog>`;

/* ---------- 10 about: short ---------- */
function aboutHTML() {
  const pr = site.person;
  return `<section id="about" class="sec aboutc" aria-labelledby="about-t"><div class="wrap about-grid">
  <div><p class="kicker rv"><b>About</b> How I work</p><h2 id="about-t" class="hm-title rv">How I work.</h2>
    <ol class="princ">${site.principles.map((p, i) => `<li class="rv"><span>${NUM(i)}</span><div><h3>${esc(p[0])}</h3><p>${esc(p[1])}</p></div></li>`).join('')}</ol></div>
  <aside class="facts rv"><dl><div><dt>Based in</dt><dd>${esc(pr.location)}</dd></div><div><dt>Now</dt><dd>${esc(pr.now)}</dd></div><div><dt>Focus</dt><dd>${esc(pr.focus)}</dd></div></dl>
    <h4>Education</h4><ul>${site.education.map((e) => `<li><b>${esc(e[0])}</b><span>${esc(e[1])}</span></li>`).join('')}</ul>
    <h4>Certifications</h4><ul>${site.certs.map((e) => `<li><b>${esc(e[0])}</b><span>${esc(e[1])} · <a href="${e[2]}" target="_blank" rel="noopener">Verify ${ARROW}</a></span></li>`).join('')}</ul></aside>
</div></section>`;
}

/* ---------- 11 contact ---------- */
function contactHTML() {
  const pr = site.person;
  return `<section id="contact" class="contact" data-world="contact" aria-labelledby="contact-title">
  <canvas class="world-canvas" aria-hidden="true"></canvas><div class="contact-vig" aria-hidden="true"></div>
  ${avatarHTML('contact', { cls: 'contact-av', tag: false, sizes: '(max-width:900px) 28svh, min(540px, 54svh)' })}
  <div class="contact-copy"><p class="kicker rv"><b>Contact</b> Get in touch</p>
    <h2 id="contact-title" class="rv">Let’s build<span>something reliable.</span></h2>
    <p class="rv">${esc(pr.contactLine)} Email is fastest.</p>
    <button class="copymail rv" id="copymail" data-mail="${pr.email}"><span>${pr.email}</span><i id="cptext">copy</i></button>
    <div class="csoc rv"><a class="btn" href="${pr.linkedin}" target="_blank" rel="noopener">LinkedIn ${ARROW}</a><a class="btn" href="${pr.github}" target="_blank" rel="noopener">GitHub ${ARROW}</a><a class="btn" href="${pr.resume}" target="_blank" rel="noopener">Résumé ${ARROW}</a><a class="btn" href="recruiter.html">Recruiter view ${ARROW}</a></div></div>
</section>`;
}
const footerHTML = () => `<footer class="foot"><div class="wrap"><span>© <span id="yr">2026</span> ${esc(site.person.name)} · ${esc(site.person.location)}</span><span><a href="${site.person.github}" target="_blank" rel="noopener">GitHub</a><a href="${site.person.linkedin}" target="_blank" rel="noopener">LinkedIn</a><a href="${site.person.resume}" target="_blank" rel="noopener">Résumé</a><a href="recruiter.html">Recruiter view</a></span></div></footer><div class="toast" id="toast" role="status">Email copied to clipboard</div>`;

/* ---------- deep pages: the material the homepage points to. Same design system, their own skeleton (page.src.html). ---------- */
const csHead = (eyebrow, h1, one, cta) => `<header class="cs-head wrap" id="top"><p class="eyebrow"><i class="dot"></i>${esc(eyebrow)}</p><h1>${esc(h1)}</h1><p class="cs-one">${esc(one)}</p><div class="cs-cta">${cta}</div></header>`;
const PAGES = {
  'agent-runtime.html': {
    title: 'AI Agent Runtime and Agent Runtime Benchmark · Ritesh Mamidi',
    desc: 'An agent runtime written from first principles in standard-library Python, served with FastAPI and PostgreSQL, and the Agent Runtime Benchmark that runs one small local model through it: results, the failure it found, and the limits.',
    nav: [[['Runtime', '#runtime'], ['Benchmark', '#arb']], { home: './', brand: 'Ritesh Mamidi — portfolio home', back: ['← Portfolio', './'], noProjects: true }],
    main: () => `<main id="main-content" class="cs">${runtimeHTML({ h: 1 })}</main>`,
  },
  'evaluation.html': {
    title: 'llmeval and MAREF · LLM evaluation · Ritesh Mamidi',
    desc: 'llmeval, a tested LLM-evaluation metric suite, and MAREF, a research prototype that evaluates agent runs, with its mixed pre-registered result, its disclosure and an explorer of its eight dimensions.',
    nav: [[['llmeval', '#evaluation'], ['MAREF', '#maref']], { home: './', brand: 'Ritesh Mamidi — portfolio home', back: ['← Portfolio', './'], noProjects: true }],
    main: () => `<main id="main-content" class="cs">${evaluationHTML()}</main>`,
  },
  'projects.html': {
    title: 'All projects · Ritesh Mamidi',
    desc: `All ${P.length} projects: a searchable library, browser explorers that run real logic on synthetic data, and the supporting systems built end to end, each with its code, tests and limits in public.`,
    nav: [[['Library', '#projects'], ['Explorers', '#supporting'], ['Builds', '#flagships'], ['Path', '#progression']], { home: './', brand: 'Ritesh Mamidi — portfolio home', back: ['← Portfolio', './'], noProjects: true }],
    main: () => `<main id="main-content" class="cs">${csHead('Library · all projects', `${P.length} projects and the explorers that run them`, 'Everything built in public, with code, tests and limits: a searchable library, browser explorers that run real logic on synthetic data, and the supporting systems built end to end. The three flagships are on the homepage.', `<a class="btn solid" href="#projects">Search the library</a><a class="btn" href="#supporting">Run an explorer</a><a class="btn" href="./">Back to the portfolio ${ARROW}</a>`)}${projectsHTML()}${supportingIntroHTML()}${chapterHTML('ai')}${chapterHTML('data')}${chapterHTML('product')}${flagshipsHTML()}${progressionSectionHTML()}</main>`,
    dialog: true,
  },
};

/* ---------- recruiter view: one fast, script-free, print-friendly page ---------- */
function recruiterHTML(headExtra) {
  const pr = site.person;
  const tech = {};
  P.forEach((p) => p.t.forEach((t) => { tech[t] = (tech[t] || 0) + 1; }));
  FLAG.forEach((f) => f.tech.forEach((t) => { tech[t] = (tech[t] || 0) + 3; }));
  const top = Object.entries(tech).sort((a, b) => b[1] - a[1]).slice(0, 18).map((x) => x[0]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ritesh Mamidi — Recruiter view</title>
<meta name="description" content="Ritesh Mamidi, Data &amp; AI Analyst in Austin, TX who builds AI agent systems and evaluation harnesses: experience, flagship projects with labelled evidence, core technologies, résumé and contact on one page.">
<link rel="canonical" href="https://riteshmamidi0905-lab.github.io/recruiter.html">${headExtra || ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%2307080a'/%3E%3Ctext x='50' y='68' font-family='sans-serif' font-size='52' font-weight='800' fill='%2322d3a6' text-anchor='middle'%3ER%3C/text%3E%3C/svg%3E">
<style>${fs.readFileSync(path.join(root, 'assets/css/recruiter.css'), 'utf8')}</style></head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="rh"><div class="in"><a class="back" href="./">← Full experience</a><nav aria-label="Contact"><a href="${pr.resume}">Résumé</a><a href="${pr.github}">GitHub</a><a href="${pr.linkedin}">LinkedIn</a><a class="cta" href="mailto:${pr.email}">Email</a></nav></div></header>
<main id="main"><section class="top"><p class="mono">Recruiter view · 60-second read</p><h1>${esc(pr.name)}</h1><p class="lead">${esc(pr.role)}. ${esc(pr.location)}.</p>
<p>Professionally I validate LLM and ML outputs against quality rubrics (Apple) and build QA and reporting in Python and SQL. On my own time, in public, I build AI agents (an approval-gated support workflow), the infrastructure they run on (an agent runtime) and the evaluation of how they fail (llmeval, and MAREF, a research prototype with a mixed result), each with its evidence attached, plus data engineering, MLOps and experimentation projects.</p>
<p class="status">${esc(pr.status)}.</p></section>
<section aria-labelledby="r-exp"><h2 id="r-exp">Experience</h2>${site.experience.map((e) => `<div class="job"><div class="when">${esc(e.when)}${e.current ? ' · current' : ''}</div><div><h3>${esc(e.role)}</h3><p class="org">${esc(e.org)} · ${esc(e.where)}</p><ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></div>`).join('')}<p class="fine">${esc(site.experienceNote)}</p></section>
<section aria-labelledby="r-proj"><h2 id="r-proj">Top projects</h2><ol class="proj"><li><div><h3>${esc(CP.title)}</h3><p>${esc(CP.oneLine)}</p><p class="tech">${CP.tech.map(esc).join(' · ')}</p><p class="evl"><b>Verified:</b> ${esc(CP.stats[0].value)} tests pass; ${esc(CP.stats[1].value)} catalogued attacks have executable tests. <b>One real-model run</b> (a small local model, one pass): ${esc(CPR.C.token('real-model-expected-outcomes.expected_outcome_attained'))} of ${esc(CPR.C.token('real-model-expected-outcomes.cases'))} cases reached the frozen expected outcome (not accuracy); it failed at the interface (schema, evidence handles, action parameters, drafts) while the four deterministic invariants held. <b>Simulated:</b> the default model is a rule-based stand-in, not an LLM; approvers are simulated. Fictional customer, synthetic data, never deployed.</p></div><p class="lk"><a href="${GH}${CPR.REPO}">Code</a> · <a href="${GH}${CPR.REPO}/tree/${CPR.SHA}/tests">Tests</a> · <a href="${CPR.pinned('docs/architecture.md')}">Architecture</a> · <a href="${esc(CP.caseStudy)}">Case study</a></p></li><li><div><h3>${esc(RT.title)}</h3><p>${esc(RT.oneLine)}</p><p class="tech">${RT.tech.map(esc).join(' · ')}</p><p class="evl"><b>Verified:</b> ${esc(RT.stats[0][0])} tests, ${esc(RT.stats[4][0])} scenarios reached the expected status. <b>Simulated:</b> scripted models, not a benchmark of LLM quality. <b>Agent Runtime Benchmark (one small model):</b> ${esc(RT.arb.results[0][0])} tasks passed the frozen oracles; the runtime's ${esc(RT.arb.results[1][0])} controls held ${esc(RT.arb.results[1][2])}; <b>${esc(RT.arb.results[2][0])}</b>, a secret disclosed through a permitted read tool, was not covered by them. ${esc(RT.arb.lessonTitle)}.</p></div><p class="lk"><a href="${GH}${RT.repo}">Code</a> · <a href="${GH}${RT.repo}/tree/${RT.sha}/tests">Tests</a> · <a href="${GH}${RT.repo}/blob/${RT.sha}/docs/architecture.md">Architecture</a> · <a href="agent-runtime.html">Case study</a></p></li>${FLAG.map((f) => `<li><div><h3>${esc(f.n)}</h3><p>${esc(f.one)}</p><p class="tech">${f.tech.map(esc).join(' · ')}</p></div><p class="lk"><a href="${GH}${f.r}">Code</a>${plinks[f.r] && plinks[f.r].tests ? ` · <a href="${GH}${f.r}/tree/${evidence[f.r]}/${plinks[f.r].testsPath}">Tests</a>` : ''}${P_BY[f.r].dm ? ` · <a href="${P_BY[f.r].dm}">Demo</a>` : ''} · <a href="${f.r === EVAL_REPO ? 'evaluation.html' : 'projects.html'}#flag-${f.r}">Case study</a></p></li>`).join('')}</ol><p class="fine">${P.length} projects in total; the full list is on the <a href="projects.html#projects">projects page</a>. All are public repositories. The first three are the flagships; the rest are supporting work.</p></section>
<section aria-labelledby="r-tech"><h2 id="r-tech">Core technologies</h2><p class="tags">${top.map((t) => `<span>${esc(t)}</span>`).join('')}</p></section>
<section aria-labelledby="r-res"><h2 id="r-res">Research</h2><div class="maref-card" id="maref-card-r"><p class="mc-title"><b>${esc(MAREF.card.title)}</b></p><p class="mc-nums">${esc(MAREF.card.numbers)}</p><p class="mc-claim">${esc(MAREF.card.claim)}</p><p class="mc-go"><a href="${MAREF_PIN('docs/EVALUATION.md')}">${esc(MAREF.card.link)}</a></p></div><p class="fine">MAREF — ${esc(research.expansion)} — evaluates agent runs; it is not an agent. ${esc(MAREF.disclosure)} <a href="${MAREF_PIN('docs/CLAIM.md')}">Canonical wording</a> · <a href="${MAREF_GH}">Repository</a></p></section>
<section aria-labelledby="r-edu"><h2 id="r-edu">Education and certifications</h2><ul class="plain">${site.education.map((e) => `<li><b>${esc(e[0])}</b> — ${esc(e[1])}</li>`).join('')}${site.certs.map((e) => `<li><b>${esc(e[0])}</b> — ${esc(e[1])} (<a href="${e[2]}">verify</a>)</li>`).join('')}</ul></section>
<section aria-labelledby="r-con"><h2 id="r-con">Contact</h2><p><a href="mailto:${pr.email}">${pr.email}</a> · <a href="${pr.linkedin}">LinkedIn</a> · <a href="${pr.github}">GitHub</a> · <a href="${pr.resume}">Résumé (PDF)</a></p></section></main>
<footer class="rf">© ${new Date().getFullYear()} ${esc(pr.name)} · <a href="./">Full experience</a></footer></body></html>`;
}

module.exports = { CPR, esc, ARROW, PAGES, flagStepsConfig, navHTML, heroHTML, keyHTML, chapterHTML, copilotHTML: CPR.homeHTML, runtimeHTML, runtimeHomeHTML, evaluationHTML, evaluationHomeHTML, alsoBuiltHTML, supportingIntroHTML, flagshipsHTML, marefHTML, experienceHTML, projectsHTML, detailDialog, aboutHTML, contactHTML, footerHTML, recruiterHTML, evidenceLinks };
