/* lab-ui.js — interface for the six interactive demos. All logic lives in the *-core.js modules
   (unit-tested in Node); this file only builds the DOM and wires controls. User text is only ever
   assigned through textContent, never innerHTML. */
(() => {
  'use strict';
  const L = window.RMLab, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (v == null || v === false) return; if (k === 'class') e.className = v; else if (k === 'on') Object.entries(v).forEach(([ev, fn]) => e.addEventListener(ev, fn)); else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v); });
    kids.flat().forEach((k) => { if (k == null || k === false) return; e.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return e;
  }
  let uid = 0;
  function slider(label, min, max, step, val, show, onInput) {
    const id = 'lab-in-' + (++uid), out = h('output', { for: id }, show(val)), inp = h('input', { type: 'range', id, min, max, step, value: val });
    inp.addEventListener('input', () => { out.textContent = show(+inp.value); onInput(+inp.value); });
    return { el: h('div', { class: 'lab-row' }, h('label', { for: id }, h('span', null, label), out), inp), set: (v) => { inp.value = v; out.textContent = show(v); } };
  }
  function numField(label, val, min, onInput) {
    const id = 'lab-in-' + (++uid), inp = h('input', { type: 'number', id, min, step: 1, value: val });
    inp.addEventListener('input', () => onInput(Math.max(min, Math.floor(+inp.value || 0))));
    return { el: h('div', { class: 'lab-row' }, h('label', { for: id }, h('span', null, label)), inp), inp };
  }
  const kv = (items) => h('div', { class: 'kv' }, items.map(([v, k, cls]) => h('div', { class: cls || '' }, h('b', null, v), h('span', null, k))));
  function chips(items, current, onPick) {
    const wrap = h('div', { class: 'chips', role: 'group' });
    items.forEach(([id, label]) => { const b = h('button', { type: 'button', 'aria-pressed': id === current }, label); b.addEventListener('click', () => { [...wrap.children].forEach((c) => c.setAttribute('aria-pressed', c === b)); onPick(id); }); wrap.append(b); });
    return wrap;
  }
  function setupCanvas(cv, w, hgt) { const dpr = Math.min(devicePixelRatio || 1, 2); cv.style.height = hgt + 'px'; const r = cv.getBoundingClientRect(), W = r.width || w; cv.width = W * dpr; cv.height = hgt * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, W, H: hgt }; }

  /* =============== 1. AGENT WORKFLOW EXPLORER =============== */
  function agentUI(root) {
    const A = L.agentCore; let task = A.EXAMPLES[0], events = [], shown = 0, timer = 0;
    const input = h('input', { type: 'text', id: 'agent-task', value: task, 'aria-label': 'Agent task', maxlength: 160 });
    const stages = ['Objective', 'Planning', 'Tools', 'Execution', 'Evaluation', 'Result'];
    const pipe = h('div', { class: 'pipe', 'aria-label': 'Workflow stages' }), trace = h('ol', { class: 'trace', 'aria-live': 'polite' }), ans = h('div', { class: 'ans', hidden: true });
    function build() {
      clearInterval(timer); const res = A.run(task), ev = A.evaluate(task, res); events = [];
      events.push(['Objective', 'objective', `“${task}”`]);
      events.push(['Planning', 'plan', res.plan.kind === 'compose' ? `compose → ${res.plan.tool}, then calculator ${res.plan.op} ${res.plan.operand}` : `simple → ${res.plan.tool}`]);
      res.history.forEach((s, i) => { events.push(['Tools', `thought ${i + 1}`, s.thought]); events.push(['Tools', 'action', `${s.tool}(${JSON.stringify(s.input)})`]); events.push(['Execution', 'observation', s.observation, s.observation.indexOf('error:') === 0]); });
      if (!res.finished) events.push(['Execution', 'stopped', 'step limit reached with no answer', true]);
      ev.checks.forEach((c) => events.push(['Evaluation', c.pass ? 'check ✓' : 'check ✗', c.name, !c.pass]));
      events.push(['Result', 'answer', String(res.answer), !ev.pass]); state.res = res; state.ev = ev; shown = 0; render();
    }
    const state = {};
    function render() {
      trace.replaceChildren(...events.slice(0, shown).map((e) => h('li', { class: e[3] ? 'err' : '' }, h('b', null, e[1]), h('span', null, e[2]))));
      if (!shown) trace.append(h('li', { class: 'dim' }, h('b', null, 'idle'), h('span', null, 'Press “Step” or “Run all”.')));
      const cur = shown ? stages.indexOf(events[shown - 1][0]) : -1;
      pipe.replaceChildren(...stages.flatMap((s, i) => [h('span', { class: i < cur ? 'done' : i === cur ? 'on' : '' }, s), i < stages.length - 1 ? h('i', { 'aria-hidden': 'true' }, '→') : null]).filter(Boolean));
      const done = shown >= events.length; ans.hidden = !done;
      if (done) { ans.replaceChildren(h('small', null, state.ev.pass ? 'Final answer · all deterministic checks passed' : 'Final answer · a check failed'), String(state.res.answer)); }
    }
    const stepBtn = h('button', { class: 'lb p', type: 'button', on: { click: () => { shown = Math.min(events.length, shown + 1); render(); } } }, 'Step ›');
    const runAll = h('button', { class: 'lb', type: 'button', on: { click: () => { clearInterval(timer); if (reduce) { shown = events.length; return render(); } timer = setInterval(() => { shown++; render(); if (shown >= events.length) clearInterval(timer); }, 520); } } }, '▶ Run all');
    const reset = h('button', { class: 'lb', type: 'button', on: { click: build } }, 'Reset');
    input.addEventListener('input', () => { task = input.value; build(); });
    const ex = chips(A.EXAMPLES.map((t) => [t, t.length > 34 ? t.slice(0, 32) + '…' : t]), task, (t) => { task = t; input.value = t; build(); });
    root.append(h('div', { class: 'lab-grid' },
      h('div', { class: 'lab-col' }, h('h4', null, 'Objective'), h('div', { class: 'lab-row' }, h('label', { for: 'agent-task' }, h('span', null, 'Give the agent an objective')), input), ex, h('div', { class: 'btn-row' }, stepBtn, runAll, reset),
        h('h4', { style: 'margin-top:22px' }, 'Tools available'), h('table', { class: 'lt' }, h('tbody', null, Object.entries(A.TOOLS).map(([k, t]) => h('tr', null, h('td', null, k), h('td', null, t.description))))),
        h('p', { class: 'lab-note' }, 'The planner is the repository’s rule-based offline policy, so it handles conversions, arithmetic, a few facts and text counts. Anything else ends in “unknown”, and the evaluation stage flags it rather than guessing.')),
      h('div', { class: 'lab-col' }, pipe, trace, ans)));
    build();
  }

  /* =============== 2. RAG EXPLORER =============== */
  function ragUI(root) {
    const R = L.ragCore, corp = R.corpus; let index = R.buildIndex(corp.docs), q = corp.cases[0].question, k = 4, rerank = true, custom = '';
    const input = h('input', { type: 'text', id: 'rag-q', value: q, maxlength: 160, 'aria-label': 'Question' }), out = h('div', { class: 'lab-col' }), evalOut = h('div', { style: 'margin-top:18px' });
    const customArea = h('textarea', { id: 'rag-custom', placeholder: 'Optional: paste your own text. It is chunked and indexed in this page only, never uploaded.', 'aria-label': 'Your own text to add to the corpus', maxlength: 4000 });
    function rebuild() { const docs = Object.assign({}, corp.docs); if (custom.trim()) docs.your_text = custom.trim(); index = R.buildIndex(docs); run(); }
    function highlight(text, query) {
      const STOPW = new Set('the a an and or of to in is are was were be for with on at by this that it as from what which who how why when where do does did can i my your'.split(' ')); const ws = new Set((query.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !STOPW.has(w))); const frag = document.createDocumentFragment();
      text.split(/(\b[a-zA-Z0-9]+\b)/).forEach((t) => (ws.has(t.toLowerCase()) ? frag.append(h('mark', null, t)) : frag.append(t))); return frag;
    }
    function run() {
      q = input.value; const hits = R.retrieve(index, q, k, rerank), a = R.answer(q, hits), used = new Set(a.citations);
      const maxS = Math.max(0.0001, ...hits.map((x) => x.score));
      out.replaceChildren(
        h('div', { class: 'pipe' }, ['Chunk', 'Embed', 'Retrieve', 'Re-rank', 'Read', 'Cite'].flatMap((s, i, arr) => [h('span', { class: 'done' }, s), i < arr.length - 1 ? h('i', null, '→') : null])),
        kv([[index.chunks.length, 'chunks indexed'], [R.DIM, 'vector dimensions'], [hits.length, 'retrieved (top-k)']]),
        h('h4', null, 'Retrieved chunks'),
        ...hits.map((x, i) => h('div', { class: 'chunk' + (used.has(i + 1) ? ' used' : '') }, h('div', { class: 'meta' }, h('span', null, `[${i + 1}] `, h('b', null, x.chunk.chunk_id)), h('span', null, `vector ${x.vector.toFixed(3)} · keyword ${x.keyword.toFixed(2)} · score ${x.score.toFixed(3)}`)), highlight(x.chunk.text, q), h('div', { class: 'sc' }, h('i', { style: `width:${clamp(x.score / maxS) * 100}%` })))),
        h('h4', { style: 'margin-top:16px' }, 'Answer construction'),
        h('div', { class: 'ans' }, h('small', null, a.grounded ? 'Extractive reader · answers only from retrieved text' : 'Reader abstains · nothing in the retrieved context overlaps the question'), a.text, a.citations.length ? h('div', { style: 'margin-top:8px;font:600 12px var(--mono);color:#79edc5' }, 'Citations: ' + a.citations.map((c) => `[${c}] ${hits[c - 1].chunk.chunk_id}`).join(' · ')) : null),
        h('p', { class: 'lab-note' }, 'Sentences are picked by content-word overlap with the question. The reader is extractive (it quotes, it does not paraphrase) and returns “not enough information” instead of inventing an answer.'));
    }
    input.addEventListener('input', run);
    const sample = chips(corp.cases.map((c) => [c.question, c.question.length > 32 ? c.question.slice(0, 30) + '…' : c.question]).concat([['What is the weather on Mars?', 'Out of scope: weather on Mars']]), q, (v) => { input.value = v; run(); });
    const kS = slider('Chunks retrieved (k)', 1, 6, 1, 4, (v) => v, (v) => { k = v; run(); });
    const rr = h('button', { class: 'lb', type: 'button', 'aria-pressed': 'true', on: { click: (e) => { rerank = !rerank; e.target.setAttribute('aria-pressed', rerank); run(); } } }, 'Keyword re-rank');
    customArea.addEventListener('change', () => { custom = customArea.value; rebuild(); });
    const evalBtn = h('button', { class: 'lb p', type: 'button', on: { click: () => {
      const r = R.evalRetrieval(index, corp.cases, k);
      evalOut.replaceChildren(h('h4', null, `Repository retrieval eval · ${corp.cases.length} questions · top-${k}`), kv([[pct(r.hitAtK, 0), 'hit rate', r.hitAtK >= 0.85 ? 'good' : 'warn'], [r.mrr.toFixed(2), 'mean reciprocal rank']]),
        h('table', { class: 'lt' }, h('thead', null, h('tr', null, ['Question', 'Expected', 'Rank'].map((x) => h('th', null, x)))), h('tbody', null, r.rows.map((x) => h('tr', null, h('td', null, x.question), h('td', null, x.relevant_doc), h('td', null, x.rank ? '#' + x.rank : 'miss'))))));
    } } }, 'Run the repo’s eval set');
    root.append(h('div', { class: 'lab-grid' }, h('div', { class: 'lab-col' }, h('div', { class: 'lab-row' }, h('label', { for: 'rag-q' }, h('span', null, 'Ask the corpus a question')), input), sample, kS.el, h('div', { class: 'btn-row' }, rr, evalBtn),
      h('details', { style: 'margin-top:10px' }, h('summary', { style: 'cursor:pointer;font:600 12px var(--mono);color:#aab2be' }, 'Corpus: 4 fixed documents (+ add your own text)'), h('div', { style: 'margin-top:10px' }, h('label', { for: 'rag-custom', class: 'vh' }, 'Your own text'), customArea)), evalOut,
      h('p', { class: 'lab-note' }, 'Ported from the repository’s chunker, hashing embedder, retriever and extractive reader. One difference: tokens are hashed with FNV-1a here instead of MD5, so exact bucket assignments differ from the Python version.')), out));
    run();
  }

  /* =============== 3. STREAMING PIPELINE =============== */
  function streamUI(root) {
    const T = L.streamCore; let sim = T.createPipeline({ seed: 7, rate: 80, capacity: 60, lateShare: 0.08 }), running = false, speed = 1, last = 0, raf = 0, visible = false;
    const cv = h('canvas', { class: 'lab-canvas', role: 'img', 'aria-label': 'Chart of consumer lag and flagged transactions over simulated time' }), stats = h('div'), log = h('div'), merch = h('div');
    const rateS = slider('Event rate (events/s)', 5, 400, 5, 80, (v) => v, (v) => sim.setRate(v)), capS = slider('Processing capacity (events/s)', 5, 400, 5, 60, (v) => v, (v) => sim.setCapacity(v)), lateS = slider('Late / out-of-order events', 0, 40, 1, 8, (v) => v + '%', (v) => sim.setLateShare(v / 100)), spdS = slider('Simulation speed', 0.25, 6, 0.25, 1, (v) => v + '×', (v) => { speed = v; });
    const toggle = h('button', { class: 'lb p', type: 'button', on: { click: () => { running = !running; toggle.textContent = running ? '❚❚ Pause' : '▶ Start'; if (running) { last = performance.now(); loop(); } } } }, '▶ Start');
    const resetB = h('button', { class: 'lb', type: 'button', on: { click: () => { sim.reset(); draw(); } } }, 'Reset');
    const burst = h('button', { class: 'lb', type: 'button', on: { click: () => { sim.setRate(300); rateS.set(300); } } }, 'Burst to 300/s');
    function draw() {
      const s = sim.snapshot(); const bad = s.lag > 200;
      stats.replaceChildren(kv([[fmt(s.produced), 'produced'], [fmt(s.lag), 'consumer lag (queued)', bad ? 'bad' : ''], [fmt(s.processed), 'processed'], [fmt(s.flagged), 'flagged as fraud', 'warn'], [fmt(s.droppedLate), 'dropped by watermark', s.droppedLate ? 'bad' : ''], [s.openWindows, 'open windows'], [fmt(s.simSeconds, 0) + 's', 'simulated time']]));
      const { c, W, H } = setupCanvas(cv, 600, 190); c.fillStyle = '#05080a'; c.fillRect(0, 0, W, H);
      const hs = s.history, maxL = Math.max(20, ...hs.map((p) => p.lag)); c.strokeStyle = 'rgba(255,255,255,.07)'; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(0, (H * i) / 4); c.lineTo(W, (H * i) / 4); c.stroke(); }
      c.strokeStyle = '#6aa7ff'; c.lineWidth = 2; c.beginPath(); hs.forEach((p, i) => { const x = (i / 119) * W, y = H - 14 - (p.lag / maxL) * (H - 34); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      c.font = '11px JetBrains Mono,monospace'; c.fillStyle = '#9aa1ad'; c.fillText('consumer lag over time (max ' + fmt(maxL) + ')', 10, 16);
      log.replaceChildren(h('h4', null, 'Latest processed transactions'), h('table', { class: 'lt' }, h('thead', null, h('tr', null, ['txn', 'merchant', 'amount', 'country', 'verdict'].map((x) => h('th', null, x)))), h('tbody', null, s.recent.slice().reverse().slice(0, 9).map((e) => h('tr', null, h('td', null, e.txn_id), h('td', null, e.merchant), h('td', null, e.amount.toFixed(2)), h('td', null, e.country), h('td', { style: e.stage === 'dropped' ? 'color:#ff8f8f' : e.is_fraud ? 'color:#f5b94a' : '' }, e.stage === 'dropped' ? 'dropped (late)' : e.fraud_reason || 'ok'))))));
      merch.replaceChildren(h('h4', null, 'Per-merchant window metrics (the “analytics” sink)'), h('table', { class: 'lt' }, h('thead', null, h('tr', null, ['merchant', 'txns', 'total', 'fraud'].map((x) => h('th', null, x)))), h('tbody', null, s.merchants.map((m) => h('tr', null, h('td', null, m.merchant), h('td', null, fmt(m.txn_count)), h('td', null, fmt(m.total_amount, 2)), h('td', null, m.fraud_count))))));
    }
    function loop() { cancelAnimationFrame(raf); if (!running || !visible) return; raf = requestAnimationFrame((now) => { let dt = Math.min(0.1, (now - last) / 1000) * speed; last = now; while (dt > 0) { const d = Math.min(0.05, dt); sim.step(d); dt -= d; } draw(); loop(); }); }
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); loop(); } }, { threshold: 0.05 }).observe(root);
    root.append(h('div', { class: 'lab-grid' }, h('div', { class: 'lab-col' }, h('div', { class: 'btn-row' }, toggle, resetB, burst), rateS.el, capS.el, lateS.el, spdS.el,
      h('p', { class: 'lab-note' }, 'Fraud rules (first match wins): amount > 2,000 → ', h('code', null, 'high_amount'), '; country in XX / ZZ / AN → ', h('code', null, 'high_risk_country'), '; amount ≤ 0 → ', h('code', null, 'non_positive_amount'), '. Windows are one-minute tumbling event-time windows; the watermark is two minutes behind the newest event, and events for windows older than that are dropped. Everything is generated and processed here, with a seeded random generator.'), merch), h('div', { class: 'lab-col' }, stats, cv, log)));
    for (let i = 0; i < 40; i++) sim.step(0.1); draw();
    if (reduce) { /* paused by default; user starts it */ }
    window.addEventListener('resize', draw);
  }

  /* =============== 4. MAREF PLAYGROUND =============== */
  function marefUI(root) {
    const E = L.evalCore; let sc = E.SCENARIOS[0], beh = sc.behaviours[0], custom = null, th = 0.6, open = null;
    const outTa = h('textarea', { id: 'maref-out', 'aria-label': 'Agent output to evaluate' }), summary = h('div'), dims = h('div', { class: 'dims' }), ctx = h('div'), traceEl = h('div');
    function evaluate() {
      const out = outTa.value, runs = [out].concat(beh.runs.slice(1)), res = E.evaluate(sc, out, beh.trace, runs);
      const thr = {}; E.DIMENSIONS.forEach(([k]) => { thr[k] = th; }); const g = E.gate(res, thr);
      summary.replaceChildren(h('div', { class: 'verdict ' + (g.pass ? 'pass' : 'fail') }, h('b', null, g.pass ? 'ALL GATES PASS' : `${g.failing.length} GATE${g.failing.length > 1 ? 'S' : ''} FAILED`), h('span', null, g.pass ? 'Every dimension clears the threshold.' : 'Failing: ' + g.failing.join(', ') + '.'), g.pass ? null : h('span', { style: 'margin-left:auto' }, `A plain average would say ${g.mean.toFixed(2)} and hide that.`)));
      dims.replaceChildren(...E.DIMENSIONS.map(([k, label]) => {
        const r = res[k], s = r.score, cls = s == null ? 'na' : s >= th ? 'pass' : 'fail', ex = open === k;
        const why = h('ul', { class: 'why' }, r.notes.map((n) => h('li', null, n)), r.claims ? r.claims.map((c) => h('li', { style: c.supported ? '' : 'color:#ff8f8f' }, `${c.supported ? '✓' : '✗'} “${c.text}” (support ${c.support.toFixed(2)})`)) : null, r.checks ? r.checks.map((c) => h('li', { style: c.pass ? '' : 'color:#ff8f8f' }, `${c.pass ? '✓' : '✗'} ${c.name}${c.detail ? ' · ' + c.detail : ''}`)) : null, r.steps ? r.steps.map((c) => h('li', { style: c.done ? '' : 'color:#ff8f8f' }, `${c.done ? '✓' : '✗'} step: ${c.step}`)) : null, r.flagged && (r.flagged.numbers.length || r.flagged.terms.length) ? h('li', { style: 'color:#ff8f8f' }, 'unsupported: ' + r.flagged.numbers.concat(r.flagged.terms).join(', ')) : null);
        const b = h('button', { type: 'button', class: 'dim ' + cls, 'aria-expanded': ex }, h('div', { class: 'top' }, h('span', null, label), h('output', null, s == null ? 'n/a' : s.toFixed(2))), h('div', { class: 'track' }, h('i', { style: `width:${s == null ? 0 : s * 100}%` }), h('u', { style: `left:${th * 100}%` })), why);
        b.addEventListener('click', () => { open = open === k ? null : k; evaluate(); }); return b;
      }));
    }
    function load() {
      outTa.value = beh.runs[0]; ctx.replaceChildren(h('h4', null, 'The task'), h('div', { class: 'chunk' }, h('div', { class: 'meta' }, h('span', null, 'prompt')), sc.prompt), h('div', { class: 'chunk' }, h('div', { class: 'meta' }, h('span', null, 'evidence (the only allowed source)')), sc.context), h('div', { class: 'chunk' }, h('div', { class: 'meta' }, h('span', null, 'reference answer')), sc.reference));
      traceEl.replaceChildren(h('h4', null, 'Recorded agent trace'), h('div', { class: 'pipe' }, beh.trace.length ? beh.trace.flatMap((s, i) => [h('span', { class: 'done' }, s), i < beh.trace.length - 1 ? h('i', null, '→') : null]) : h('span', null, 'no steps recorded')), h('p', { class: 'lab-note', style: 'margin:0' }, 'Required: ' + sc.requiredSteps.join(' → ')));
      evaluate();
    }
    const scChips = () => chips(E.SCENARIOS.map((s) => [s.id, s.title]), sc.id, (id) => { sc = E.SCENARIOS.find((s) => s.id === id); beh = sc.behaviours[0]; behHost.replaceChildren(behChips()); load(); });
    const behHost = h('div'); const behChips = () => chips(sc.behaviours.map((b) => [b.id, b.label]), beh.id, (id) => { beh = sc.behaviours.find((b) => b.id === id); load(); });
    behHost.append(behChips());
    const thS = slider('Gate threshold (every dimension)', 0.3, 0.95, 0.05, 0.6, (v) => v.toFixed(2), (v) => { th = v; evaluate(); });
    outTa.addEventListener('input', evaluate);
    const scHost = h('div'); scHost.append(scChips());
    root.append(h('div', { class: 'lab-grid' }, h('div', { class: 'lab-col' }, h('h4', null, 'Scenario'), scHost, h('h4', null, 'Recorded sample run'), behHost, ctx, traceEl,
      h('div', { class: 'lab-row', style: 'margin-top:12px' }, h('label', { for: 'maref-out' }, h('span', null, 'Output being evaluated (editable)')), outTa),
      h('p', { class: 'lab-note' }, 'These are authored sample executions, not live model calls. Consistency compares your text with the other two recorded runs of the same behaviour.')),
      h('div', { class: 'lab-col' }, summary, thS.el, dims, h('p', { class: 'lab-note' }, 'Dimension scores are deterministic proxies from ', h('code', null, 'token_f1'), ', ', h('code', null, 'faithfulness'), ', ', h('code', null, 'number_match'), ' and explicit constraint checks. They illustrate how the framework separates failure modes. They are not MAREF results, not a benchmark, and not a model judge. Click a dimension to see exactly why it scored as it did.'))));
    load();
  }

  /* =============== 5. EXPERIMENTATION LAB =============== */
  function experimentUI(root) {
    const S = L.statsCore; const st = { nc: 5000, xc: 500, nt: 5000, xt: 560, alpha: 0.05, gc: 40, gt: 41, guard: false, mde: 0.01, pw: 0.8, trueRate: 0.1 };
    const results = h('div'), design = h('div'), peek = h('div'), cv = h('canvas', { class: 'lab-canvas', role: 'img', 'aria-label': 'Confidence interval for the difference in conversion rate' }), peekCv = h('canvas', { class: 'lab-canvas', role: 'img', 'aria-label': 'P-value after each peek in an experiment with no true effect' });
    const f = { nc: numField('Control visitors', st.nc, 1, (v) => { st.nc = v; fix(); }), xc: numField('Control conversions', st.xc, 0, (v) => { st.xc = v; fix(); }), nt: numField('Variant visitors', st.nt, 1, (v) => { st.nt = v; fix(); }), xt: numField('Variant conversions', st.xt, 0, (v) => { st.xt = v; fix(); }) };
    function fix() { st.xc = Math.min(st.xc, st.nc); st.xt = Math.min(st.xt, st.nt); f.xc.inp.value = st.xc; f.xt.inp.value = st.xt; calc(); }
    const alphaSel = h('select', { id: 'exp-alpha', 'aria-label': 'Significance level' }, [0.01, 0.05, 0.1].map((a) => h('option', { value: a, selected: a === st.alpha }, 'α = ' + a))); alphaSel.addEventListener('change', () => { st.alpha = +alphaSel.value; calc(); });
    const guard = h('button', { class: 'lb', type: 'button', 'aria-pressed': 'false', on: { click: (e) => { st.guard = !st.guard; e.target.setAttribute('aria-pressed', st.guard); gBox.hidden = !st.guard; calc(); } } }, 'Add a guardrail metric');
    const gc = numField('Control support tickets', st.gc, 0, (v) => { st.gc = v; calc(); }), gt = numField('Variant support tickets', st.gt, 0, (v) => { st.gt = v; calc(); }), gBox = h('div', { hidden: true }, gc.el, gt.el, h('p', { class: 'lab-note', style: 'margin-top:0' }, 'Lower is better. A significant increase flags a regression and downgrades SHIP to INCONCLUSIVE.'));
    function calc() {
      const r = S.proportionsZTest(st.xc, st.nc, st.xt, st.nt, st.alpha); const guards = st.guard ? [{ name: 'support tickets', higherIsBetter: false, result: S.proportionsZTest(Math.min(st.gc, st.nc), st.nc, Math.min(st.gt, st.nt), st.nt, st.alpha) }] : [];
      const d = S.decide(r, guards, st.alpha), cls = d.verdict === 'SHIP' ? 'pass' : d.verdict === 'KILL' ? 'fail' : 'mid';
      const obsPower = r.control > 0 && r.control < 1 ? S.powerProportion(r.control, Math.abs(r.absEffect) || 1e-6, Math.min(st.nc, st.nt), st.alpha) : 0;
      results.replaceChildren(h('div', { class: 'verdict ' + cls }, h('b', null, d.verdict), h('span', null, d.reason + (d.flags.length ? ' ' + d.flags.join('; ') : ''))),
        kv([[pct(r.control, 2), 'control rate'], [pct(r.treatment, 2), 'variant rate'], [(r.absEffect >= 0 ? '+' : '') + (r.absEffect * 100).toFixed(2) + ' pp', 'absolute lift'], [(r.relEffect >= 0 ? '+' : '') + (r.relEffect * 100).toFixed(1) + '%', 'relative lift'], [r.z.toFixed(2), 'z statistic'], [r.pValue < 0.0001 ? '<0.0001' : r.pValue.toFixed(4), 'p-value', r.significant ? 'good' : 'warn'], [pct(obsPower, 0), 'power at the observed effect']]),
        h('p', { class: 'stat-line' }, `${pct(1 - st.alpha, 0)} CI for the lift: ${(r.ciLow * 100).toFixed(2)} pp to ${(r.ciHigh * 100).toFixed(2)} pp`));
      const { c, W, H } = setupCanvas(cv, 600, 90); c.fillStyle = '#05080a'; c.fillRect(0, 0, W, H); const span = Math.max(Math.abs(r.ciLow), Math.abs(r.ciHigh), 0.004) * 1.4, X = (v) => W / 2 + (v / span) * (W / 2 - 24);
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(X(0), 8); c.lineTo(X(0), H - 8); c.stroke(); c.setLineDash([]); c.strokeStyle = r.significant ? '#22d3a6' : '#f5b94a'; c.lineWidth = 4; c.beginPath(); c.moveTo(X(r.ciLow), H / 2); c.lineTo(X(r.ciHigh), H / 2); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(X(r.absEffect), H / 2, 6, 0, 6.283); c.fill(); c.font = '11px JetBrains Mono,monospace'; c.fillStyle = '#9aa1ad'; c.textAlign = 'center'; c.fillText('0 (no effect)', X(0), H - 4);
      // design
      const base = r.control > 0 && r.control < 1 ? r.control : 0.1, n = S.sampleSizeProportion(base, st.mde, st.alpha, st.pw);
      design.replaceChildren(kv([[fmt(n), 'visitors needed per arm'], [pct(st.mde, 2), 'MDE (absolute)'], [pct(S.mdeProportion(base, Math.min(st.nc, st.nt), st.alpha, st.pw), 2), 'MDE your current n can detect']]), h('p', { class: 'lab-note', style: 'margin-top:0' }, `Sample size to detect a ${(st.mde * 100).toFixed(2)} pp lift on a ${pct(base)} baseline at ${pct(st.pw, 0)} power. Power and sample size use slightly different variance approximations, as in the repository.`));
    }
    const mdeS = slider('Minimum detectable effect (pp)', 0.002, 0.05, 0.001, st.mde, (v) => (v * 100).toFixed(1) + ' pp', (v) => { st.mde = v; calc(); }), pwS = slider('Target power', 0.6, 0.95, 0.05, st.pw, (v) => pct(v, 0), (v) => { st.pw = v; calc(); });
    const trS = slider('True conversion rate (both arms: no real effect)', 0.02, 0.4, 0.01, st.trueRate, (v) => pct(v, 0), (v) => { st.trueRate = v; });
    const peekBtn = h('button', { class: 'lb p', type: 'button', on: { click: () => {
      const looks = 10, perArm = 2000, sims = 400; let fixedFP = 0, peekFP = 0;
      for (let i = 0; i < sims; i++) { const path = S.simulatePeeking(st.trueRate, st.trueRate, perArm, looks, 1000 + i); if (path[looks - 1].p < 0.05) fixedFP++; if (path.some((p) => p.p < 0.05)) peekFP++; }
      const ex = S.simulatePeeking(st.trueRate, st.trueRate, perArm, 40, 7), { c, W, H } = setupCanvas(peekCv, 600, 170); c.fillStyle = '#05080a'; c.fillRect(0, 0, W, H); const Y = (p) => H - 18 - clamp(p) * (H - 36);
      c.strokeStyle = '#ff8f8f'; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(0, Y(0.05)); c.lineTo(W, Y(0.05)); c.stroke(); c.setLineDash([]); c.strokeStyle = '#6aa7ff'; c.lineWidth = 2; c.beginPath(); ex.forEach((p, i) => { const x = (i / (ex.length - 1)) * (W - 20) + 10; i ? c.lineTo(x, Y(p.p)) : c.moveTo(x, Y(p.p)); }); c.stroke(); c.font = '11px JetBrains Mono,monospace'; c.fillStyle = '#9aa1ad'; c.fillText('p-value after each look (no real effect exists) · red line = p 0.05', 10, 14);
      peek.replaceChildren(kv([[pct(fixedFP / sims, 1), 'false positives: one look at the end', 'good'], [pct(peekFP / sims, 1), `false positives: stop at the first p < 0.05 over ${looks} looks`, 'bad']]), peekCv, h('p', { class: 'lab-note' }, `${sims} seeded A/A experiments (identical true rates, ${fmt(perArm)} users per arm, ${looks} looks each). The repository's fixed-horizon tests assume you look once; this is why sequential testing is on my “what I'd build next” list.`));
    } } }, 'Simulate 400 A/A experiments');
    root.append(h('div', { class: 'lab-grid' }, h('div', { class: 'lab-col' }, h('h4', null, 'Experiment results'), f.nc.el, f.xc.el, f.nt.el, f.xt.el, h('div', { class: 'lab-row' }, h('label', { for: 'exp-alpha' }, h('span', null, 'Significance level')), alphaSel), guard, gBox,
      h('h4', { style: 'margin-top:22px' }, 'Design a test first'), mdeS.el, pwS.el, design),
      h('div', { class: 'lab-col' }, results, cv, h('h4', { style: 'margin-top:24px' }, 'Why not just peek?'), trS.el, h('div', { class: 'btn-row' }, peekBtn), peek)));
    calc(); window.addEventListener('resize', calc);
  }

  /* =============== 6. PRODUCT FUNNEL EXPLORER =============== */
  function funnelUI(root) {
    const F = L.funnelCore; const v = Object.assign({}, F.DEFAULTS); let lever = 'activation';
    const out = h('div'), cv = h('canvas', { class: 'lab-canvas', role: 'img', 'aria-label': 'Modelled retention curve' }), heat = h('div');
    const S = {};
    const defs = [['visitors', 'Visitors per month', 1000, 1000000, 1000, (x) => fmt(x)], ['signup', 'Visitor → signup', 0.01, 0.5, 0.01, (x) => pct(x, 0)], ['activation', 'Signup → activated', 0.05, 0.95, 0.01, (x) => pct(x, 0)], ['d1', 'Day-1 retention', 0.1, 0.9, 0.01, (x) => pct(x, 0)], ['d30', 'Day-30 retention', 0.02, 0.5, 0.01, (x) => pct(x, 0)], ['paid', 'Retained → paying', 0.005, 0.3, 0.005, (x) => pct(x, 1)], ['arpu', 'Revenue per paying user / month ($)', 5, 200, 1, (x) => '$' + x], ['churn', 'Monthly churn of paying users', 0.01, 0.2, 0.005, (x) => pct(x, 1)]];
    const sliders = defs.map(([k, label, a, b, s, show]) => { S[k] = slider(label, a, b, s, v[k], show, (x) => { v[k] = k === 'd30' ? Math.min(x, v.d1) : x; if (k === 'd1' && v.d30 > x) { v.d30 = x; S.d30.set(x); } calc(); }); return S[k].el; });
    function calc() {
      const r = F.run(v), cohort = F.cohorts(v, 8); const max = r.counts[0], labels = ['Visitors', 'Activated', 'Retained (D30)', 'Paying'];
      const bars = r.counts.map((n, i) => h('div', { style: 'display:grid;grid-template-columns:130px 1fr 90px;gap:12px;align-items:center;margin:8px 0' }, h('span', { style: 'font:600 12px var(--mono);color:#c7ced8' }, labels[i]), h('div', { style: 'height:26px;background:rgba(255,255,255,.05);border-radius:8px;overflow:hidden' }, h('div', { style: `height:100%;width:${Math.max(0.6, Math.pow(n / max, 0.45) * 100)}%;background:linear-gradient(90deg,#f5b94a,#22d3a6);border-radius:8px;transition:width .4s` })), h('span', { style: 'font:700 15px var(--mono);text-align:right' }, fmt(n))));
      const wi = F.whatIf(v, lever, 0.05);
      out.replaceChildren(kv([[fmt(r.counts[3]), 'paying users / month'], [pct(r.overall, 2), 'visitor → paying'], ['$' + fmt(r.revenue), 'monthly revenue (model)'], ['$' + fmt(r.ltv), 'LTV per payer (ARPU ÷ churn)'], [r.leak.replace('Acquisition', 'Acq.').replace('Activation', 'Activ.').replace('Retention', 'Retain').replace('Revenue', 'Rev.'), 'largest absolute leak', 'warn long']]), h('h4', null, 'Funnel (bar length is compressed so small stages stay visible)'), ...bars,
        h('h4', { style: 'margin-top:20px' }, 'What if one stage improves by 5 points?'), chips([['signup', 'Signup'], ['activation', 'Activation'], ['d30', 'D30 retention'], ['paid', 'Paying']], lever, (k) => { lever = k; calc(); }), h('p', { class: 'stat-line' }, `Lift ${lever === 'paid' ? 'paying' : lever} by +5 pp → revenue ${wi.deltaPct >= 0 ? '+' : ''}${(wi.deltaPct * 100).toFixed(1)}% ($${fmt(wi.baseRevenue)} → $${fmt(wi.newRevenue)}). Revenue is the product of every stage rate, so the same absolute lift matters most where the rate is lowest.`));
      const { c, W, H } = setupCanvas(cv, 600, 150); c.fillStyle = '#05080a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#22d3a6'; c.lineWidth = 2; c.beginPath(); r.ret.curve.forEach((p, i) => { const x = 10 + (i / 59) * (W - 20), y = H - 22 - clamp(p / v.d1) * (H - 44); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.font = '11px JetBrains Mono,monospace'; c.fillStyle = '#9aa1ad'; c.fillText(`modelled retention by day · decay exponent ${r.ret.alpha.toFixed(2)}`, 10, 14); c.fillText('day 1', 10, H - 6); c.textAlign = 'right'; c.fillText('day 60', W - 10, H - 6);
      const rgbOf = (x) => [Math.round(20 + 14 * (1 - x)), Math.round(60 + 150 * x), Math.round(60 + 90 * x)];
      const col = (x) => `rgb(${rgbOf(x).join(',')})`;
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const ink = (x) => { const L = lum(rgbOf(x)); return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#ffffff' : '#000000'; };   // whichever of white / near-black contrasts more
      heat.replaceChildren(h('h4', null, 'Weekly cohorts · retention at day…'), h('div', { class: 'heat' }, h('div', { class: 'heat', style: `grid-template-columns:70px repeat(${cohort.days.length},1fr)` }, [h('span', { class: 'h' }, 'cohort'), ...cohort.days.map((d) => h('span', { class: 'h' }, 'D' + d))]), ...cohort.rows.map((row, i) => h('div', { class: 'heat', style: `grid-template-columns:70px repeat(${cohort.days.length},1fr)` }, [h('span', { class: 'h' }, 'Week ' + (i + 1)), ...row.map((x) => (x == null ? h('span', { class: 'h' }, '·') : h('span', { style: `background:${col(x)};color:${ink(x)}` }, Math.round(x * 100) + '%')))]))), h('p', { class: 'lab-note' }, 'Every cohort follows the same modelled curve; recent cohorts simply have not aged enough to show later days. Real cohort tables vary. This is a model for exploring assumptions, not data.'));
    }
    root.append(h('div', { class: 'lab-grid' }, h('div', { class: 'lab-col' }, h('h4', null, 'Assumptions'), ...sliders), h('div', { class: 'lab-col' }, out, cv, heat)));
    calc(); window.addEventListener('resize', calc);
  }

  L.mountLab = function () {
    const map = { agent: agentUI, rag: ragUI, stream: streamUI, maref: marefUI, experiment: experimentUI, funnel: funnelUI };
    document.querySelectorAll('.lab-ui').forEach((root) => { const fn = map[root.dataset.ui]; if (fn && !root.dataset.mounted) { root.dataset.mounted = '1'; root.textContent = ''; try { fn(root); } catch (e) { root.textContent = 'This demo failed to start: ' + e.message; console.error(e); } } });
  };
})();
