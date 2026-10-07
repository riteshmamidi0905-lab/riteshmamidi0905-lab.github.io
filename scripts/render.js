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
const NAV_LINKS = [['Copilot', '#copilot'], ['Agent runtime', '#runtime'], ['Evaluation', '#evaluation'], ['Supporting', '#supporting'], ['Experience', '#experience'], ['Projects', '#projects'], ['About', '#about']];
function navHTML(links, o) {
  o = o || {}; links = links || NAV_LINKS;
  return `<header class="nav" id="nav"><div class="nav-in">
  <a class="brand" href="${o.home || '#hero'}" aria-label="${esc(o.brand || site.person.name + ' — top')}"><span class="mk">RM</span><span class="bn">${esc(site.person.name)}</span></a>
  <nav class="nl" id="nlinks" aria-label="Sections">${links.map(([n, h]) => `<a href="${h}">${n}</a>`).join('')}<a class="nl-rec" href="${o.back ? o.back[1] : 'recruiter.html'}">${o.back ? o.back[0] : 'Recruiter view'}</a><a class="nl-cta" href="${o.home ? o.home + '#contact' : '#contact'}">Contact</a></nav>
  <button class="burger" id="burger" aria-label="Menu" aria-expanded="false" aria-controls="nlinks"><span></span><span></span></button>
</div><div class="nav-bar" id="bar" aria-hidden="true"></div></header>`;
}

/* ---------- 01 hero ---------- */
const RT_STAT = (k) => RT.stats.find((x) => x[1].startsWith(k));
function proofHTML() {
  const cs = Object.fromEntries(CP.stats.map((x) => [x.claim, x]));
  const tests = RT_STAT('tests')[0], scen = RT_STAT('scenarios reached')[0].replace(/\s/g, '');
  return `<ul class="proof" aria-label="Flagship evidence at a glance">
    <li><a href="#copilot"><b>Support Escalation Copilot</b><span>${CPR.badge('verified')} ${esc(cs['test-suite'].value)} tests · ${esc(cs['threat-catalogue'].value.replace(/\s/g, ''))} attacks executable</span><span>${CPR.badge('simulated')} stand-in model, not an LLM</span><span>${CPR.badge('not-evaluated')} real-model evaluation</span></a></li>
    <li><a href="#runtime"><b>AI Agent Runtime</b><span>${CPR.badge('verified')} ${esc(tests)} tests · ${esc(scen)} scenarios</span><span>${CPR.badge('simulated')} scripted models</span></a></li>
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
    <div class="hero-cta"><a class="btn solid" href="#build">See the flagship systems ${DOWN}</a><a class="btn" href="${pr.github}" target="_blank" rel="noopener">GitHub ${ARROW}</a><a class="btn" href="${pr.resume}" target="_blank" rel="noopener">Résumé ${ARROW}</a></div>
  </div>
  <a class="scue" href="#build" aria-label="Scroll to the next section"><span></span>Scroll</a>
</section>`;
}

/* ---------- 02 flagship systems: the hierarchy, with the evidence labels explained once ---------- */
const FLAGSHIPS = [
  { href: '#copilot', title: CP.title, line: 'An approval-gated AI case workflow: the model reads and drafts; deterministic code and people decide.', tag: 'Reference implementation · fictional customer', badges: ['verified', 'simulated', 'not-evaluated'] },
  { href: '#runtime', title: RT.title, line: 'The agent loop, tools, memory, permissions and persistence, built from first principles and then served.', tag: 'Open-source build · scripted models', badges: ['verified', 'simulated'] },
  { href: '#evaluation', title: 'LLM evaluation: llmeval and MAREF', line: 'Rubrics with hard gates and inspectable failures; MAREF, a reliability framework still on paper.', tag: 'Tested metric suite · framework not evaluated', badges: ['verified', 'not-evaluated'] },
];
function buildHTML() {
  const rows = FLAGSHIPS.map((b, i) => `<li class="brow rv"><a href="${b.href}" class="brow-a"><span class="bidx">${NUM(i)}</span><span class="bt">${esc(b.title)}</span><span class="bl">${esc(b.line)}</span>
    <span class="bp">${esc(b.tag)}<span class="bbadges">${b.badges.map((x) => CPR.badge(x)).join('')}</span></span><span class="bgo" aria-hidden="true">${DOWN}</span></a></li>`).join('');
  return `<section id="build" class="sec build" aria-labelledby="build-t"><div class="wrap">
  <p class="kicker rv"><b>02</b> Flagship systems</p>
  <h2 id="build-t" class="statement rv">Three systems, each with its evidence attached. <span class="mut">Next to every claim: what was verified, what was simulated, and what was not evaluated.</span></h2>
  <ol class="brows">${rows}</ol>
  <div class="rv build-legend"><p class="mono-l">How to read the evidence</p>${CPR.legendHTML()}</div>
</div></section>`;
}

/* ---------- labs (real demos), grouped under the chapter they belong to ---------- */
const LAB = {
  agent: ['Agent trace explorer', 'Type an objective and step through Objective → Planning → Tools → Execution → Evaluation → Result. This runs the ReAct loop from <b>ai-agent-toolkit</b> in your browser: a rule-based planner, four safe tools (the calculator never uses <code>eval</code>), and a structured trace. It shows execution state, not model reasoning.', 'Real deterministic code · no language model · offline', ''],
  rag: ['RAG explorer', 'Ask a question over a <b>fixed sample corpus</b> (four fictional “Acme Cloud” documents from <b>genai-doc-assistant</b>). See the chunks, the hashed-embedding retrieval and keyword re-rank, and how the extractive reader builds a cited answer, or abstains. Then run the repository’s own retrieval eval set.', 'Fixed sample corpus · deterministic · no language model', ''],
  stream: ['Streaming pipeline', 'A producer generates <b>synthetic transactions</b> with the same logic as <b>realtime-streaming-pipeline</b>: fraud rules, one-minute event-time windows and a two-minute watermark. Capacity starts below the event rate, so the lag builds; raise capacity to drain it. Add late events and watch the watermark drop them.', 'Synthetic events · simulated clock · no Kafka, Spark or Cassandra involved', ''],
  maref: ['MAREF playground', 'Score recorded sample agent runs on the six MAREF dimensions. The scores are <b>deterministic proxy heuristics</b> built from metrics in <b>llm-eval-framework</b> (token F1, faithfulness, number match). Edit the output text and watch each dimension react. Gates are per dimension, so a good average cannot hide a bad answer.', 'Proxy heuristics · not an LLM judge · not MAREF results (MAREF is in development)', 'warn'],
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
/* ---------- Flagship 02: AI Agent Runtime — scene + inspectable evidence ---------- */
const rtLink = ([label, p, kind]) => { const href = kind === 'repo' ? GH + RT.repo : `${GH}${RT.repo}/${kind}/${RT.sha}/${p}`; return `<a class="ln" href="${href}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`; };
function runtimeHTML() {
  const stage = stageHTML({ id: 'world-runtime', scene: 'runtime', key: 'runtime', kicker: 'Flagship 02 · Agent engineering', title: RT.title, h: 2, note: RT.tech.join(' · '), sub: RT.oneLine, steps: RT.steps, cta: [GH + RT.repo, 'Read the repository'], cls: 'runtimestage' });
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
  <p class="kicker rv"><b>03</b> Supporting evidence</p>
  <h2 id="supp-t" class="statement rv">The same habits in other domains. <span class="mut">Explorers you can run, and five more systems built end to end.</span></h2>
  <p class="supp-note rv">These are smaller or older than the flagships and are labelled that way: tests and limits are public, and several run entirely in your browser on synthetic data.</p>
</div></section>`;
const flagshipsHTML = () => `<section id="flagships" class="sec flags" aria-labelledby="flags-t"><div class="wrap flags-intro">
  <p class="kicker rv"><b>04</b> Supporting builds</p>
  <h2 id="flags-t" class="statement rv">Five more systems, built end to end. <span class="mut">Code, tests, decisions and limitations are public.</span></h2>
  </div>
  ${SUPPORTING.map((f, i) => flagshipHTML(f, i)).join('\n')}
  </section>`;

/* ---------- Flagship 03: evaluation. llmeval is tested; MAREF is a proposal and says so ---------- */
function evaluationHTML() {
  const f = FLAG.find((x) => x.r === EVAL_REPO);
  return `<section id="evaluation" class="flagsec" aria-label="Flagship 03: LLM evaluation">
  ${flagshipHTML(f, 0, 'Flagship 03 · AI evaluation', 2)}
  <div class="wrap eval-ev" id="llmeval-evidence">
    <ul class="rt-stats rv" aria-label="Verified evidence for llmeval">${EVAL.stats.map((x) => `<li>${CPR.badge('verified')}<b>${esc(x[0])}</b><span>${esc(x[1])}</span><small>${esc(x[2])}</small></li>`).join('')}</ul>
    <p class="rt-qual rv"><b>Qualification.</b> ${esc(EVAL.qualifier)} <span class="mut">Source: public repository at commit <code>${EVAL.sha.slice(0, 7)}</code>, re-run ${esc(EVAL.verifiedOn)}.</span></p>
    <p class="eval-bridge rv">${esc(EVAL.bridge)} <a class="ln" href="${esc(CP.caseStudy)}#retrieval">See the retrieval evaluation ${ARROW}</a></p>
  </div>
  ${marefHTML()}
  </section>`;
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
      <p class="paper-status">${CPR.badge('not-evaluated')} <b>Research / framework in development.</b> No experimental results are claimed on this page.</p>
      <h3 id="paper-t" class="paper-title">MAREF: ${esc(research.expansion)}</h3>
      <p class="paper-sub"><em>Evaluating the Reliability of Large Language Model Agents: A Multi-Metric Framework for Accuracy, Hallucination, Consistency, and Task Completion.</em></p>
      <p class="paper-abs"><b>Abstract.</b> An agent can answer correctly and still be unreliable: ungrounded, inconsistent, or unfinished. MAREF proposes six dimensions so each failure mode can be inspected on its own instead of being averaged into one score.</p>
      <div class="paper-grid">
        <div class="dims-col" role="group" aria-label="MAREF dimensions">${dims}</div>
        <div class="dim-panel" aria-live="polite"><p class="mono-l" id="dimensionNum">Dimension 01</p><h4 id="dimensionTitle">${esc(d[0].name)}</h4><p class="dim-q" id="dimensionQ">${esc(d[0].question)}</p>
          <p><b>Method.</b> <span id="dimensionMethod">${esc(d[0].method)}</span></p>
          <p class="dim-ex"><b>Illustrative example (not an experimental result).</b> <span id="dimensionEx">${esc(d[0].example)}</span></p>
          <ol class="dim-flow" id="dimensionFlow">${d[0].flow.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
      </div>
      <p class="paper-note">Illustrative Example — Not Experimental Results. The playground below scores <em>recorded sample runs</em> with deterministic proxies; it demonstrates the idea, it does not measure any model.</p>
    </article>
    ${demoHTML('maref', ['maref'], 'on recorded sample runs')}
  </div></section>
<script type="application/json" id="rm-maref">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`;
}

/* ---------- 05 experience: the career story, in the order it happened ---------- */
function progressionHTML() {
  return `<div class="prog rv"><p class="mono-l">How the work progressed</p><ol class="prog-list">${site.progression.map((p, i) => `<li class="${p.kind === 'Professional' ? 'pro' : 'ind'}"><span class="prog-n">${NUM(i)}</span><div><p class="prog-k ${p.kind === 'Professional' ? 'pro' : 'ind'}">${esc(p.kind)}</p><h3>${esc(p.stage)}</h3><p>${esc(p.text)}</p>${p.href ? `<a class="ln" href="${p.href}">${esc(p.link)} ${p.href[0] === '#' ? DOWN : ARROW}</a>` : ''}</div></li>`).join('')}</ol></div>`;
}
function experienceHTML() {
  const items = site.experience.map((e) => `<li class="role rv"><div class="role-when"><span>${esc(e.when)}</span>${e.current ? '<i class="cur">current</i>' : ''}</div>
    <div><h3>${esc(e.role)}</h3><p class="role-org">${esc(e.org)} · ${esc(e.where)}</p><ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></li>`).join('');
  return `<section id="experience" class="sec" aria-labelledby="exp-t"><div class="wrap">
  <p class="kicker rv"><b>05</b> Experience</p>
  <h2 id="exp-t" class="statement rv">${esc(site.experienceHeading)}</h2>
  <p class="exp-lead rv">${esc(site.experienceLead)}</p>
  ${progressionHTML()}
  <ol class="timeline">${items}</ol>
  <p class="fine rv">${esc(site.experienceNote)}</p>
</div></section>`;
}

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
  const data = Object.fromEntries(P.map((p) => [p.r, { n: p.n, d: p.d, t: p.t, c: CATLABEL[p.c], flag: FLAG.some((f) => f.r === p.r) || !!p.feat, ev: evidenceLinks(p.r), visual: fs.existsSync(path.join(root, 'project-visuals', p.r + '.svg')) }]));
  return `<section id="projects" class="sec lib" aria-labelledby="proj-t"><div class="wrap">
  <p class="kicker rv"><b>06</b> All projects</p>
  <h2 id="proj-t" class="statement rv">${P.length} projects. <span class="mut">The three flagships above are the ones to read first.</span></h2>
  <div class="lib-ctl rv"><label class="vh" for="psearch">Search projects</label><input id="psearch" type="search" placeholder="Search ${P.length} projects, e.g. kafka, rag, churn" autocomplete="off">
    <div class="chips" role="group" aria-label="Filter by area"><button type="button" data-f="all" aria-pressed="true">All</button>${cats.map(([k, v]) => `<button type="button" data-f="${k}" aria-pressed="false">${esc(v)}</button>`).join('')}</div>
    <p class="fine" id="filterStatus" role="status">${P.length} projects</p></div>
  <ul class="plist" id="pgrid">${rows}</ul>
  <p class="empty" id="pempty" hidden>No project matches. Try a different word.</p>
</div></section>
<script type="application/json" id="rm-projects">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
const detailDialog = () => `<dialog class="pd-dlg" id="pdetail" aria-labelledby="pd-title"><form method="dialog" class="pd-x"><button aria-label="Close">&#10005;</button></form>
  <p class="eyebrow" id="pd-cat"></p><h3 id="pd-title"></h3><p class="pd-what" id="pd-what"></p>
  <div class="pd-grid"><div><h4>Technology</h4><p class="pd-tech" id="pd-tech"></p><h4>Evidence</h4><ul class="pd-ev" id="pd-ev"></ul><p class="fine" id="pd-flag"></p></div>
  <figure class="pd-vis" id="pd-vis" hidden><figcaption>Illustrative workflow, not live telemetry</figcaption></figure></div></dialog>`;

/* ---------- 10 about ---------- */
function aboutHTML() {
  const pr = site.person;
  return `<section id="about" class="sec" aria-labelledby="about-t"><div class="wrap about-grid">
  <div><p class="kicker rv"><b>07</b> About</p><h2 id="about-t" class="statement rv">How I work.</h2>
    <ol class="princ">${site.principles.map((p, i) => `<li class="rv"><span>${NUM(i)}</span><div><h3>${esc(p[0])}</h3><p>${esc(p[1])}</p></div></li>`).join('')}</ol></div>
  <aside class="facts rv"><dl><div><dt>Based in</dt><dd>${esc(pr.location)}</dd></div><div><dt>Now</dt><dd>${esc(pr.now)}</dd></div><div><dt>Focus</dt><dd>${esc(pr.focus)}</dd></div><div><dt>Status</dt><dd>${esc(pr.status)}</dd></div></dl>
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
  <div class="contact-copy"><p class="kicker rv"><b>08</b> Contact</p>
    <h2 id="contact-title" class="rv">Let’s build<span>something reliable.</span></h2>
    <p class="rv">${esc(pr.contactLine)} Email is fastest.</p>
    <button class="copymail rv" id="copymail" data-mail="${pr.email}"><span>${pr.email}</span><i id="cptext">copy</i></button>
    <div class="csoc rv"><a class="btn" href="${pr.linkedin}" target="_blank" rel="noopener">LinkedIn ${ARROW}</a><a class="btn" href="${pr.github}" target="_blank" rel="noopener">GitHub ${ARROW}</a><a class="btn" href="${pr.resume}" target="_blank" rel="noopener">Résumé ${ARROW}</a><a class="btn" href="recruiter.html">Recruiter view ${ARROW}</a></div></div>
</section>`;
}
const footerHTML = () => `<footer class="foot"><div class="wrap"><span>© <span id="yr">2026</span> ${esc(site.person.name)} · ${esc(site.person.location)}</span><span><a href="${site.person.github}" target="_blank" rel="noopener">GitHub</a><a href="${site.person.linkedin}" target="_blank" rel="noopener">LinkedIn</a><a href="${site.person.resume}" target="_blank" rel="noopener">Résumé</a><a href="recruiter.html">Recruiter view</a></span></div></footer><div class="toast" id="toast" role="status">Email copied to clipboard</div>`;

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
<p>Professionally I validate LLM and ML outputs against quality rubrics (Apple) and build QA and reporting in Python and SQL. On my own time, in public, I build AI systems with their evidence attached: an approval-gated support workflow, an agent runtime and an evaluation framework, plus data engineering, MLOps and experimentation projects.</p>
<p class="status">${esc(pr.status)}.</p></section>
<section aria-labelledby="r-exp"><h2 id="r-exp">Experience</h2>${site.experience.map((e) => `<div class="job"><div class="when">${esc(e.when)}${e.current ? ' · current' : ''}</div><div><h3>${esc(e.role)}</h3><p class="org">${esc(e.org)} · ${esc(e.where)}</p><ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></div>`).join('')}<p class="fine">${esc(site.experienceNote)}</p></section>
<section aria-labelledby="r-proj"><h2 id="r-proj">Top projects</h2><ol class="proj"><li><div><h3>${esc(CP.title)}</h3><p>${esc(CP.oneLine)}</p><p class="tech">${CP.tech.map(esc).join(' · ')}</p><p class="evl"><b>Verified:</b> ${esc(CP.stats[0].value)} tests pass; ${esc(CP.stats[1].value)} catalogued attacks have executable tests. <b>Simulated:</b> the model is a rule-based stand-in, not an LLM. <b>Not evaluated:</b> real-model behaviour. Fictional customer, synthetic data, never deployed.</p></div><p class="lk"><a href="${GH}${CPR.REPO}">Code</a> · <a href="${GH}${CPR.REPO}/tree/${CPR.SHA}/tests">Tests</a> · <a href="${CPR.pinned('docs/architecture.md')}">Architecture</a> · <a href="${esc(CP.caseStudy)}">Case study</a></p></li><li><div><h3>${esc(RT.title)}</h3><p>${esc(RT.oneLine)}</p><p class="tech">${RT.tech.map(esc).join(' · ')}</p><p class="evl"><b>Verified:</b> ${esc(RT.stats[0][0])} tests, ${esc(RT.stats[4][0])} scenarios reached the expected status. <b>Simulated:</b> scripted models, not a benchmark of LLM quality.</p></div><p class="lk"><a href="${GH}${RT.repo}">Code</a> · <a href="${GH}${RT.repo}/tree/${RT.sha}/tests">Tests</a> · <a href="${GH}${RT.repo}/blob/${RT.sha}/docs/architecture.md">Architecture</a> · <a href="./#agent-runtime">Case study</a></p></li>${FLAG.map((f) => `<li><div><h3>${esc(f.n)}</h3><p>${esc(f.one)}</p><p class="tech">${f.tech.map(esc).join(' · ')}</p></div><p class="lk"><a href="${GH}${f.r}">Code</a>${plinks[f.r] && plinks[f.r].tests ? ` · <a href="${GH}${f.r}/tree/${evidence[f.r]}/${plinks[f.r].testsPath}">Tests</a>` : ''}${P_BY[f.r].dm ? ` · <a href="${P_BY[f.r].dm}">Demo</a>` : ''} · <a href="./#flag-${f.r}">Case study</a></p></li>`).join('')}</ol><p class="fine">${P.length} projects in total; the full list is on the <a href="./#projects">main site</a>. All are public repositories. The first three are the flagships; the rest are supporting work.</p></section>
<section aria-labelledby="r-tech"><h2 id="r-tech">Core technologies</h2><p class="tags">${top.map((t) => `<span>${esc(t)}</span>`).join('')}</p></section>
<section aria-labelledby="r-res"><h2 id="r-res">Research</h2><p><b>MAREF</b> — ${esc(research.expansion)}. <b>Research / framework in development;</b> no experimental results are claimed. Six proposed dimensions: ${research.dimensions.map((d) => esc(d.name)).join(', ')}.</p></section>
<section aria-labelledby="r-edu"><h2 id="r-edu">Education and certifications</h2><ul class="plain">${site.education.map((e) => `<li><b>${esc(e[0])}</b> — ${esc(e[1])}</li>`).join('')}${site.certs.map((e) => `<li><b>${esc(e[0])}</b> — ${esc(e[1])} (<a href="${e[2]}">verify</a>)</li>`).join('')}</ul></section>
<section aria-labelledby="r-con"><h2 id="r-con">Contact</h2><p><a href="mailto:${pr.email}">${pr.email}</a> · <a href="${pr.linkedin}">LinkedIn</a> · <a href="${pr.github}">GitHub</a> · <a href="${pr.resume}">Résumé (PDF)</a></p></section></main>
<footer class="rf">© ${new Date().getFullYear()} ${esc(pr.name)} · <a href="./">Full experience</a></footer></body></html>`;
}

module.exports = { CPR, esc, ARROW, flagStepsConfig, navHTML, heroHTML, buildHTML, chapterHTML, copilotHTML: CPR.homeHTML, runtimeHTML, evaluationHTML, supportingIntroHTML, flagshipsHTML, marefHTML, experienceHTML, projectsHTML, detailDialog, aboutHTML, contactHTML, footerHTML, recruiterHTML, evidenceLinks };
