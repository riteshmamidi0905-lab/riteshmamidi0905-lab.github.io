/* Living Headquarters application: data loading, recorded-mission playback with browser-side hash-chain verification, the 3D view (hq-gl/hq-scene), the always-complete accessible panel, the 2D plan, camera and input.
   Mode is always RECORDED here: nothing in this page executes a mission. Every number shown comes from site/living-hq/hq-data.json, the replays or the research artifacts. */
(function () {
  'use strict';
  // a conditional section that is absent is passed as null/false: DOM insertion must skip it, never print the word "null"
  ['replaceChildren', 'append'].forEach(m => { const orig = Element.prototype[m]; Element.prototype[m] = function (...k) { return orig.apply(this, k.flat().filter(c => c != null && c !== false)); }; });
  const T0 = performance.now(), $ = s => document.querySelector(s), HQ = window.HQEvents, SC = window.HQScene, V = window.NASHA_VERIFY;
  const h = (tag, attrs, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); } kids.flat().forEach(c => { if (c != null && c !== false) n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); }); return n; };
  const jget = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
  const jopt = u => jget(u).catch(() => null);
  const safe = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* storage may be unavailable */ } } };
  const mq = q => window.matchMedia && matchMedia(q).matches;
  const A = { data: null, r: {}, room: 'atrium', agent: 'veritas', mission: 'F', recFile: null, events: [], verified: null, st: HQ.fresh(), playing: false, speed: 1, timer: 0, calm: mq('(prefers-reduced-motion: reduce)'), low: !!(navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2), view2d: false, gl: null, scene: [], layout: null, cam: null, camAnim: null, dirty: true, perf: { transitions: [] }, sel: null, netMission: '', netAgent: '', tour: { i: 0, elapsed: 0, playing: false, timer: 0 }, tourNet: false };
  const NAMES = { atrium: 'Arrival atrium', control: 'Mission Theater', chamber: 'Agent campus', network: 'Agent network', twin: 'Digital twin', tour: 'Recruiter journey', weir: 'THE WEIR', lab: 'Research Laboratory' };
  const ORDER = ['atrium', 'control', 'chamber', 'network', 'weir', 'lab', 'twin', 'tour'];
  const ROOM3D = { network: 'campus', tour: 'atrium' };
  const KEYS = { 1: 'atrium', 2: 'control', 3: 'chamber', 4: 'network', 5: 'weir', 6: 'lab', 7: 'twin', 8: 'tour' };
  let lastSay = 0, lastText = '';
  const say = t => { const now = performance.now(); $('#live').textContent = (now - lastSay < 1500 && lastText ? lastText + ' ' : '') + t; lastSay = now; lastText = t; };
  const agentBy = s => A.data.agents.find(a => a.slug === s);

  /* ---------------- recorded mission playback ---------------- */
  async function loadRec(file) {
    const my = A.loadSeq = (A.loadSeq || 0) + 1;                       // a slower earlier load must never overwrite a later one
    file = file.replace(/^.*\//, ''); A.recFile = file; A.task = null; A.th = null; stop(); A.st = HQ.fresh(); A.events = []; A.verified = null;
    try { const j = await jget('../replays/' + file); if (my !== A.loadSeq) return; const v = V.verifyAll(j.events); if (!v.ok) { A.verified = { ok: false, why: v.why }; say('The recording failed its integrity check and was not used.'); A.dirty = true; renderLive(); updateStatus(); return; }
      A.events = j.events; A.verified = { ok: true, n: v.n, title: j.recording.title, note: j.recording.note, real: !!j.recording.model_provenance, prov: j.recording.model_provenance || null }; A.st = HQ.fresh(); say('Recording verified: ' + v.n + ' events.');
    } catch (e) { if (my !== A.loadSeq) return; A.verified = { ok: false, why: e.message }; }
    A.dirty = true; renderLive(); updateStatus(); renderPlan();
  }
  function step() { if (A.st.pos >= (A.events.length ? A.events[A.events.length - 1].seq : 0)) { stop(); return false; } const e = A.events.find(x => x.seq > A.st.pos); if (!e) { stop(); return false; } A.st = HQ.reduce(A.st, e); A.dirty = true; say(A.st.announce); renderLive(); return A.st.outcome == null; }
  function play() { if (!A.events.length) return; if (A.st.outcome) restart(); A.playing = true; A.timer = setInterval(() => { if (!step()) stop(); }, Math.max(60, 650 / A.speed)); renderLive(); }
  function stop() { A.playing = false; clearInterval(A.timer); A.timer = 0; if ($('#b-play')) $('#b-play').textContent = 'Play'; }
  function restart() { stop(); A.st = HQ.fresh(); A.dirty = true; renderLive(); }
  function seek(seq) { stop(); A.st = HQ.replay(A.events, seq); A.dirty = true; renderLive(); }

  /* ---------------- panels (accessible, complete without the canvas) ---------------- */
  const chip = (k, t) => h('span', { class: 'chip', 'data-k': k }, t);
  const banner = (k, ...c) => h('p', { class: 'banner', 'data-k': k }, ...c);
  function table(heads, rows, label) {
    const thead = h('thead', {}, h('tr', {}, heads.map(x => h('th', {}, x)))), tbody = h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', {}, c)))));
    return h('div', { style: 'overflow:auto', tabindex: '0', role: 'region', 'aria-label': label }, h('table', {}, thead, tbody));
  }
  function go(room, opts) {
    opts = opts || {}; const t0 = performance.now(); if (room !== 'tour' && A.tour.playing) tourStop(); if (room !== 'tour') A.tourNet = false; A.room = room; if (opts.agent) { if (opts.agent !== A.agent || !A.ex) A.ex = null; A.agent = opts.agent; } if (opts.dept) A.dept = opts.dept; if (opts.station != null) A.station = opts.station;
    document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', String(b.dataset.room === room) === 'true' ? 'page' : 'false'));
    flyTo(ROOM3D[room] || room, () => { A.perf.transitions.push({ room, ms: Math.round(performance.now() - t0), animated: !A.calm }); perfUpdate(); });
    renderPanel(); const hd = $('#panel h2'); if (hd) { hd.tabIndex = -1; if (!opts.noFocus) hd.focus({ preventScroll: true }); } say('Moved to ' + NAMES[room]); renderPlan(); setLocation(); if (!opts.noPush) { try { history.pushState({ room, agent: A.agent, dept: A.dept }, '', '#' + room + (room === 'chamber' ? '/' + A.agent : room === 'twin' && A.dept ? '/' + A.dept : '')); } catch (e) { /* history may be unavailable */ } }
  }
  function setLocation() { const it = A.room === 'chamber' ? ' › ' + A.agent.toUpperCase() : A.room === 'twin' && A.dept ? ' › ' + A.dept : ''; $('#loc').textContent = 'Location: ' + NAMES[A.room] + it; }
  function renderPanel() { const p = $('#panel'); p.replaceChildren(); ({ atrium: pAtrium, control: pControl, chamber: pChamber, network: pNetwork, weir: pWeir, lab: pLab, twin: pTwin, tour: pTour })[A.room](p); renderLive(); }
  function pAtrium(p) {
    const d = A.data, n = d.missions.reduce((a, m) => a + m.recordings.length, 0), real = d.missions.some(m => m.recordings.some(r => r.real_model));
    p.append(h('h2', {}, 'Arrival atrium'), h('p', {}, 'NASHA is a concept brewery-and-kitchen business used as a stage for engineering work on governed AI workflows. This headquarters shows that work: twelve named agents, six missions, an evaluation laboratory and the governance gate, all drawn from ' + n + ' recorded runs.'),
      banner('rec', h('b', {}, 'RECORDED. '), 'Nothing here is executing now. Each light you see is an event from a real, hash-verified recording, replayed. Live missions need the local backend and are not part of this static site; see the ', h('a', { href: '../../nasha-lab.html' }, 'NASHA AI Lab explorer'), ' for the project.'),
      h('h3', {}, 'System status'), h('ul', { class: 'l' }, h('li', {}, d.agents.length + ' agents (' + d.agents.filter(a => a.participates).length + ' appear in recordings; ' + d.agents.filter(a => a.implementation === 'model_assisted').length + ' also asked a local model in the experiment)'), h('li', {}, d.missions.length + ' missions, ' + n + ' recordings; the chain of the one you open is verified in this browser'), h('li', {}, real ? 'One recording used a REAL local model; it never approved or executed anything.' : 'No real-model recording.'), h('li', {}, 'This page changes no production system. Evaluation outcomes are shown as they ended and none is presented as a success: the live model evaluation has not met its acceptance criteria (failed), and the remaining evaluation and cloud work is unfinished or not approved.')),
      h('h3', {}, 'Where to go'), h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => { go('control', { noFocus: true }); loadRec(A.recFile || '../replays/mission-f-surge-approved.json'); } }, 'Watch a recorded mission'), h('button', { type: 'button', onclick: () => go('chamber') }, 'Visit an agent chamber'), h('button', { type: 'button', onclick: () => go('lab') }, 'Inspect the evaluations'), h('a', { class: 'btn', href: '../../recruiter.html' }, 'Recruiter summary')),
      h('h3', {}, 'What the labels mean'), h('ul', { class: 'l' }, h('li', {}, chip('ok', 'VERIFIED'), ' produced by running code or tests here'), h('li', {}, chip('syn', 'SYNTHETIC'), ' synthetic data or a scripted fixture'), h('li', {}, chip('rec', 'RECORDED'), ' a recording of a real run, replayed'), h('li', {}, chip('plan', 'PLANNED'), ' not built; ', chip('notrun', 'NOT_RUN'), ' built but not run')),
      h('p', { class: 'mut' }, 'Controls: drag or arrow keys to orbit, wheel or +/- to zoom, Home resets, keys 1 to 6 move between spaces. The panel beside the scene contains everything the scene shows.'));
  }
  function recOptions(m) { return (A.data.missions.find(x => x.letter === m) || { recordings: [] }).recordings; }

  /* ---------------- Mission Theater: tasks, dependencies, tool use, holds, failures and approvals read from the verified recording up to the replay position ---------------- */
  A.task = null; A.thAgent = ''; A.th = null;
  const BADOUT = ['rejected', 'stopped', 'timed_out'];
  const inTheater = () => A.room === 'control' || (A.room === 'tour' && A.tour && tourScenes()[A.tour.i] && tourScenes()[A.tour.i].room === 'control');
  function thModel() {
    const key = A.recFile + '|' + A.st.pos + '|' + A.events.length; if (A.th && A.thKey === key) return A.th; A.thKey = key;
    const ev = A.events, pos = A.st.pos, g = A.st.graph; let nodes = [], declared = !!g;
    if (g) nodes = g.order.map(id => { const n = g.nodes[id], ts = ev.filter(e => e.seq <= pos && e.kind === 'task_state' && e.payload.node === id), r = ts.find(e => e.payload.state === 'running'), end = r ? ts.find(e => e.seq > r.seq && e.payload.state !== 'running') : null; return { id, title: n.title, agent: n.agent, deps: n.deps, state: n.state, seq: n.seq, start: r ? r.seq : null, end: r ? (end ? end.seq : pos) : null }; });
    else { const starts = ev.filter(e => e.kind === 'agent_started'); nodes = starts.map((e, i) => { const next = starts[i + 1], end = next ? next.seq - 1 : ev.length ? ev[ev.length - 1].seq : 0, cur = e.seq <= pos, done = cur && ev.find(x => x.kind === 'agent_completed' && x.agent === e.agent && x.seq > e.seq && x.seq <= Math.min(end, pos)), bad = done && BADOUT.includes(done.payload.outcome);
      return { id: 's' + e.seq, title: e.payload.task || e.agent, agent: e.agent, deps: i ? ['s' + starts[i - 1].seq] : [], state: !cur ? 'queued' : done ? (bad ? 'failed' : 'completed') : 'running', seq: done ? done.seq : e.seq, start: e.seq, end }; }); }
    nodes.forEach(n => { n.evs = n.start == null ? [] : ev.filter(e => e.seq >= n.start && e.seq <= Math.min(n.end == null ? pos : n.end, pos)); const mine = n.evs.filter(e => e.agent === n.agent);
      n.tools = mine.filter(e => e.kind === 'tool_called').length; n.fail = mine.some(e => (e.kind === 'evaluation' && !e.payload.passed) || (e.kind === 'tool_result' && e.payload.ok === false && !e.payload.held_for_approval) || (e.kind === 'model_validation' && !e.payload.passed));
      n.hold = n.evs.some(e => e.kind === 'approval_requested' || (e.kind === 'policy_decision' && e.payload.decision === 'hold_for_approval') || (e.kind === 'tool_result' && e.payload.held_for_approval));
      n.fb = n.evs.some(e => e.kind === 'policy_decision' && e.payload.decision === 'fallback_deterministic'); n.human = n.evs.some(e => e.kind === 'approval_decided'); });
    return (A.th = { nodes, declared, pos: window.HQScene.theaterLayout(nodes) });
  }
  const evLine = e => { const p = e.payload || {}, t = (A.st.trace || []).find(x => x.seq === e.seq); return t ? t.effect : e.kind.replace(/_/g, ' ') + (p.tool ? ': ' + p.tool : p.task ? ': ' + p.task : p.decision ? ': ' + p.decision : p.name ? ': ' + p.name : ''); };
  function theaterBox() {
    const m = thModel(), box = h('div', { id: 'theater' }); if (!m.nodes.length) return box.appendChild(h('p', { class: 'mut' }, 'Open a recording to see its tasks.')) && box;
    const sel = m.nodes.find(n => n.id === A.task);
    box.append(h('h3', {}, 'Mission Theater: tasks and dependencies'), h('p', { class: 'mut' }, m.declared ? 'Task dependencies are the graph declared in the recording; arrows run from a task to the task that depends on it.' : 'This mission has no declared dependency graph; the stage shows the recorded execution order (each step follows the previous one). Nothing is inferred beyond that.'),
      h('div', { class: 'row' }, h('label', {}, 'Focus an agent', h('select', { id: 's-th-agent', onchange: e => { A.thAgent = e.target.value; A.dirty = true; } }, h('option', { value: '' }, 'All agents'), [...new Set(m.nodes.map(n => n.agent))].map(a => h('option', { value: a, selected: a === A.thAgent }, a.toUpperCase())))), btn('Mission overview', () => { A.task = null; A.thAgent = ''; A.dirty = true; resetCam(); renderLive(); }, true)),
      table(['Task', 'Agent', 'Depends on', 'State', 'Tools', 'Marks', 'Inspect'], m.nodes.map(n => [n.title.slice(0, 44), n.agent.toUpperCase(), n.deps.map(d => (m.nodes.find(x => x.id === d) || { title: d }).title.slice(0, 18)).join(', ') || 'none', n.state, n.tools, [n.hold ? 'hold' : '', n.fail ? 'failure' : '', n.fb ? 'fallback' : '', n.human ? 'human' : ''].filter(Boolean).join(' ') || '–', h('button', { type: 'button', 'aria-pressed': String(n.id === A.task), style: 'min-height:32px;padding:2px 8px;font-size:12px', onclick: () => { A.task = n.id === A.task ? null : n.id; A.dirty = true; renderLive(); } }, n.id === A.task ? 'selected' : 'inspect')]), 'Mission tasks'));
    if (sel) box.append(h('h3', {}, 'Task inspector: ' + sel.title), h('p', { class: 'kv' }, 'Agent ' + sel.agent.toUpperCase() + ' · state ' + sel.state + (sel.start != null ? ' · events #' + sel.start + ' to #' + (sel.end == null ? A.st.pos : Math.min(sel.end, A.st.pos)) : ' · not started at this position')),
      sel.evs.length ? table(['Event', 'Kind', 'What happened', ''], sel.evs.slice(0, 40).map(e => ['#' + e.seq, e.kind.replace(/_/g, ' '), evLine(e).slice(0, 110), btn('Replay to #' + e.seq, () => seek(e.seq), true)]), 'Task events') : h('p', { class: 'mut' }, 'No events yet at this replay position.'),
      h('p', { class: 'mut' }, 'Provenance: ' + (A.recFile || '').replace('.json', '') + ' · hash chain ' + (A.verified && A.verified.ok ? 'verified in this browser' : 'not verified') + ' · RECORDED, not live.'), h('div', { class: 'row' }, btn('Open ' + sel.agent.toUpperCase() + ' chamber', () => go('chamber', { agent: sel.agent }), true)));
    return box;
  }
  function pControl(p) {
    const d = A.data;
    p.append(h('h2', {}, 'Mission Control · Mission Theater'), banner('rec', h('b', {}, 'RECORDED. '), 'Choose any of the six missions and replay a real run of it. Replay is deterministic: the same recording always produces the same states. Nothing here is executing now.'),
      h('div', { class: 'row' }, h('label', {}, 'Mission', h('select', { id: 's-mission', onchange: e => { A.mission = e.target.value; const r = recOptions(A.mission)[0]; fillRecs(); loadRec(r.file); } }, d.missions.map(m => h('option', { value: m.letter, selected: m.letter === A.mission }, m.letter + ' ' + m.title)))),
        h('label', {}, 'Recording', h('select', { id: 's-rec', onchange: e => loadRec(e.target.value) }))),
      h('div', { class: 'row' }, h('button', { type: 'button', id: 'b-play', onclick: () => A.playing ? (stop(), renderLive()) : play() }, 'Play'), h('button', { type: 'button', onclick: () => { stop(); step(); } }, 'Step'), h('button', { type: 'button', onclick: restart }, 'Restart'),
        h('label', {}, 'Speed', h('select', { id: 's-speed', onchange: e => { A.speed = Number(e.target.value); if (A.playing) { stop(); play(); } } }, [0.5, 1, 2, 4].map(x => h('option', { value: x, selected: x === A.speed }, x + '×'))))),
      h('label', { class: 'mut' }, 'Position', h('input', { type: 'range', id: 'r-pos', min: 0, max: 0, value: 0, 'aria-label': 'Replay position', oninput: e => { const ev = A.events[Number(e.target.value) - 1]; if (Number(e.target.value) === 0) restart(); else if (ev) seek(ev.seq); } })), h('div', { id: 'live' + 'State' }));
    fillRecs(); if (!A.events.length && A.recFile) loadRec(A.recFile); else if (!A.recFile) loadRec(recOptions(A.mission)[0].file);
  }
  function fillRecs() { const s = $('#s-rec'); if (!s) return; s.replaceChildren(...recOptions(A.mission).map(r => h('option', { value: r.file, selected: r.file === A.recFile }, r.title.replace(/^[^:]+: ?/, '') + (r.real_model ? ' [REAL local model]' : '')))); if (!recOptions(A.mission).some(r => r.file === A.recFile)) A.recFile = null; }
  function govBlocks(st) {
    return h('div', {}, h('h3', {}, 'Governance (THE WEIR)'),
      h('ul', { class: 'l' }, h('li', {}, 'Holds for a person: ' + st.holds.length + (st.holds.length ? ' — ' + st.holds.map(x => '#' + x.seq + ' ' + (x.decided ? 'decided ' + x.decided.decision : 'WAITING')).join(', ') : '')), h('li', {}, 'Blocked actions: ' + st.blocks.length), h('li', {}, 'Human decisions: ' + (st.humans.length ? st.humans.map(x => '#' + x.seq + ' ' + x.decision).join(', ') : 'none yet'))),
      st.blocks.length ? h('ul', { class: 'l' }, st.blocks.slice(-4).map(b => h('li', {}, h('b', {}, '#' + b.seq + ' BLOCKED '), (b.tool || '') + ' ' + b.reason.slice(0, 160) + (b.probe ? ' (a deliberate probe)' : '')))) : null);
  }
  function modelLine(m) {
    let t;
    if (m.kind === 'request') t = 'model asked (' + m.purpose + ')' + (m.real ? ' - REAL local inference' : m.double ? ' - test double' : '');
    else if (m.kind === 'response') t = 'reply ' + (m.ok ? 'received' : 'FAILED') + ' in ' + Math.round(m.ms || 0) + ' ms';
    else t = 'validation ' + (m.passed ? 'PASSED' : 'FAILED: ' + (m.violations || []).join('; '));
    return h('li', {}, '#' + m.seq + ' ' + t);
  }
  function renderLive() {
    renderPlan();
    if (window.NashaCharacters) window.NashaCharacters.update(A.st);
    const st = A.st, el = $('#liveState'); const sl = $('#r-pos'); if (sl) { sl.max = A.events.length; sl.value = A.events.filter(e => e.seq <= st.pos).length; }
    if (A.room === 'weir') return fillWeir();
    if (A.room !== 'control' || !el) return;
    const last = A.events.length ? A.events[A.events.length - 1].seq : 0, v = A.verified;
    el.replaceChildren(
      banner(v && v.ok ? 'ok' : v ? 'bad' : 'plan', v ? (v.ok ? '✓ Event chain verified in this browser (' + v.n + ' events, SHA-256). ' + (v.real ? 'This run used REAL local inference (' + (v.prov ? v.prov.model : '') + ').' : 'No language model was used in this run.') : 'INTEGRITY CHECK FAILED: ' + v.why + '. Nothing is shown.') : 'Loading recording…'),
      v && v.ok ? h('p', { class: 'mut' }, v.note) : null,
      h('h3', {}, 'Mission'), h('p', { class: 'kv' }, h('b', {}, 'State: '), (st.mission.title || 'not started') + ' · ' + st.mission.status + ' · event ' + st.pos + ' of ' + last + (st.mission.scenario ? ' · scenario ' + st.mission.scenario : '')),
      st.outcome ? banner(/BLOCKED|FAILED|CANCELLED|REJECTED|EXPIRED|TIMED/.test(st.outcome.status) ? 'gold' : 'ok', h('b', {}, 'Recorded outcome: ' + st.outcome.status + '. '), st.outcome.side_effects ? st.outcome.side_effects.actions_executed + ' actions executed, ' + st.outcome.side_effects.purchases_made + ' purchases, ' + st.outcome.side_effects.external_transmissions + ' external transmissions. ' : '', st.outcome.recommendation) : null,
      h('h3', {}, 'Agents'), table(['Agent', 'State', 'Task', 'Tool', 'Event'], A.data.agents.map(a => { const s = st.agents[a.slug]; return [h('button', { type: 'button', class: 'lnk', style: 'min-height:32px;padding:2px 8px;font-size:12px', onclick: () => go('chamber', { agent: a.slug }) }, a.name), h('span', { class: 'st', 'data-s': s.state }, s.state.toUpperCase() + (s.alert ? ' ⚠' : '')), s.task ? s.task.slice(0, 60) : '', s.tool, s.seq ? '#' + s.seq : '']; }), 'Agent states'),
      A.verified && A.verified.ok ? theaterBox() : null,
      st.graph ? h('details', {}, h('summary', {}, 'Task graph as plain table'), table(['Task', 'Depends on', 'State', 'Event'], st.graph.order.map(n => [st.graph.nodes[n].title, st.graph.nodes[n].deps.join(', ') || 'nothing', st.graph.nodes[n].state, '#' + st.graph.nodes[n].seq]), 'Task graph')) : null,
      govBlocks(st),
      st.validations.length || st.fallbacks.length || st.model.length ? h('div', {}, h('h3', {}, 'Validation, model and fallback'),
        st.model.length ? h('ul', { class: 'l' }, st.model.filter(m => m.kind !== 'recommendation').map(modelLine)) : null,
        st.fallbacks.length ? banner('gold', h('b', {}, 'DETERMINISTIC FALLBACK. '), st.fallbacks.map(f => '#' + f.seq + ' ' + f.scope + ': ' + f.reason).join('; '), ' — the model output was not used.') : null,
        st.validations.length ? h('p', {}, st.validations.length + ' validation failure(s): ', h('button', { type: 'button', onclick: () => go('lab') }, 'See the supporting evidence in the Research Laboratory')) : null) : null,
      h('h3', {}, 'Event timeline (each line is one recorded event)'), h('ol', { class: 'l tl', tabindex: '0', 'aria-label': 'Event timeline' }, st.trace.slice(-14).reverse().map(t => h('li', {}, h('b', {}, '#' + t.seq), t.effect))));
    if ($('#b-play')) $('#b-play').textContent = A.playing ? 'Pause' : 'Play';
  }

  /* ---------------- Governance Fortress: four chambers over the recorded evidence; THE WEIR's backend remains the authority ---------------- */
  A.fort = 'auth';
  const CHAMBERS = [['auth', 'Authorization Chamber'], ['appr', 'Approval Chamber'], ['audit', 'Audit Corridor'], ['fail', 'Failure and Recovery Chamber']];
  function fortressBox() {
    const F = A.data.fortress, sel = A.fort, re = () => { const old = $('#fortress'); if (old) old.replaceWith(fortressBox()); A.dirty = true; };
    const out = [h('div', { class: 'row', role: 'group', 'aria-label': 'Fortress chamber' }, CHAMBERS.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': String(k === sel), onclick: () => { A.fort = k; re(); } }, t))), h('p', { class: 'mut' }, F.note)];
    if (sel === 'auth') out.push(h('h3', {}, 'Tool permission boundaries'), h('p', {}, 'Every tool call the recordings made passed the policy. Allowed, denied and held-for-a-person counts are recorded results; a denied call is a tool outside the policy (denied by default).'),
      table(['Tool', 'Allowed', 'Denied', 'Held', 'Rule codes', 'Example'], F.tools.map(t => [t.tool, t.allowed, t.denied, t.held, t.codes.join(', ') || 'none', (t.denied_example || t.held_example || t.allowed_example) ? btn('Replay', () => { const x = t.denied_example || t.held_example || t.allowed_example; replayAt(x.file, x.seq); }, true) : '']), 'Tool permissions'));
    else if (sel === 'appr') out.push(h('h3', {}, 'Recorded human approvals (' + F.approvals.length + ')'), h('p', {}, 'A person decided each of these; the system never approves its own consequential action. A rejection stops the action.'),
      table(['Mission', 'Action', 'Requires', 'Decision', 'Recorded decider', 'Event'], F.approvals.map(a => [a.mission, a.action, a.requires, a.decision || 'pending in recording', a.by || 'n/a', btn('Replay #' + a.seq, () => replayAt(a.file, a.seq), true)]), 'Approvals'));
    else if (sel === 'audit') out.push(h('h3', {}, 'Audit corridor: one hash chain per recording'), h('p', {}, 'Each recording is a SHA-256 hash chain; opening one verifies the chain in your browser, and a tampered recording refuses to load. Ledger rows are counted from the recording.'),
      table(['Mission', 'Recording', 'Events', 'Head hash', 'Ledger rows', 'Ledger chain', 'Open'], F.audit.map(a => [a.mission, a.file.replace('.json', '').replace('mission-', ''), a.events, a.head_hash.slice(0, 12), a.ledger_rows, a.ledger_chain_ok === null ? 'n/a' : a.ledger_chain_ok ? 'intact' : 'BROKEN', btn('Verify and open', () => replayAt(a.file, a.events), true)]), 'Audit chains'));
    else out.push(h('h3', {}, 'Failures the system caught'), h('p', {}, Object.entries(F.failure_counts).map(([k, n]) => n + ' ' + k).join(' · ')), h('p', { class: 'mut' }, 'Counts are over all 36 recordings; the list shows up to five examples per type, each replayable to the exact event. Failing closed, falling back to the deterministic path and retrying are recorded outcomes, not hidden.'),
      table(['Type', 'Mission', 'What', 'Event'], F.failures.map(f => [f.type, f.mission, f.text, btn('Replay #' + f.seq, () => replayAt(f.file, f.seq), true)]), 'Failures'));
    return h('div', { id: 'fortress' }, out);
  }
  function pWeir(p) { p.append(h('h2', {}, 'THE WEIR: governance fortress'), banner('rec', h('b', {}, 'RECORDED. '), 'Holds, blocks and decisions come from the recording open in Mission Control.'), h('p', {}, 'THE WEIR is the gateway every tool call passes. It denies any tool outside the policy by default, holds consequential writes for a person, and records an audit trail. In the scene the gate turns red when an action is blocked, gold while a person must decide, and teal otherwise.'), h('div', { id: 'weirLive' }), fortressBox(), h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => { go('control', { noFocus: true }); loadRec(recOptions('B')[0].file); } }, 'Open Mission B (blocks a probe)'), h('a', { class: 'btn', href: '../../case-mcp-weir.html' }, 'THE WEIR case study'))); fillWeir(); }
  function fillWeir() { const el = $('#weirLive'); if (!el) return; const st = A.st; el.replaceChildren(h('p', { class: 'mut' }, A.events.length ? 'Recording: ' + (A.verified && A.verified.title) + ' — event ' + st.pos : 'No recording loaded: open one in Mission Control.'), govBlocks(st), st.holds.length ? h('ul', { class: 'l' }, st.holds.map(x => h('li', {}, '#' + x.seq + ' Hold: ' + x.action + (x.decided ? ' → ' + x.decided.decision : ' → waiting for a person')))) : null); }
  function pChamber(p) {
    const a = agentBy(A.agent), d = A.data;
    p.append(h('h2', {}, 'Agent chamber: ' + a.name), window.NashaCharacters ? window.NashaCharacters.card(a.slug,A.st.agents[a.slug].state,'Recorded mission state · '+(A.st.agents[a.slug].task||'not yet assigned')) : null, h('div', { class: 'row' }, h('label', {}, 'Agent', h('select', { id: 's-agent', onchange: e => go('chamber', { agent: e.target.value }) }, d.agents.map(x => h('option', { value: x.slug, selected: x.slug === a.slug }, x.name + ' · ' + x.specialty))))),
      h('p', { class: 'kv' }, h('b', {}, 'Role: '), a.specialty + ' · ', chip(a.implementation === 'deterministic' ? 'ok' : 'plan', a.implementation === 'deterministic' ? 'RULE-BASED' : 'MODEL-ASSISTED (experimental)'), ' ', chip('syn', 'IDENTITY ' + a.visual_status)),
      banner('rec', h('b', {}, 'Derived from recordings. '), a.events + ' events across ' + Object.keys(a.missions).length + ' mission(s). The visual identity of an agent is illustrative; the behaviour below is counted from events.'),
      h('h3', {}, 'Assigned tasks by mission'), Object.keys(a.assignments).length ? h('ul', { class: 'l' }, Object.entries(a.assignments).map(([m, t]) => h('li', {}, h('b', {}, 'Mission ' + m + ': '), t))) : h('p', { class: 'mut' }, 'No task assignment in any recording.'),
      h('h3', {}, 'Tools it called (in recordings)'), a.tools.length ? table(['Tool', 'Kind', 'Calls', 'Failures'], a.tools.map(t => [t.tool, t.kind, t.calls, t.failures]), 'Tools') : h('p', { class: 'mut' }, 'None.'),
      h('h3', {}, 'What it did (event categories)'), h('div', {}, Object.entries(a.categories).sort((x, y) => y[1] - x[1]).map(([k, v]) => h('div', { class: 'kv' }, k + ' · ' + v, h('div', { class: 'bar2' }, h('i', { style: 'width:' + Math.round(100 * v / Math.max(...Object.values(a.categories))) + '%' }))))),
      h('h3', {}, 'Governance boundaries'), h('ul', { class: 'l' }, h('li', {}, 'Policy decisions it made or triggered: ' + (Object.keys(a.governance.policy_decisions).length ? Object.entries(a.governance.policy_decisions).map(([k, v]) => k.replace(/_/g, ' ') + ' ×' + v).join(', ') : 'none')), h('li', {}, 'Approvals requested: ' + a.governance.approvals_requested), h('li', {}, 'Validations run: ' + a.validations.passed + ' passed, ' + a.validations.failed + ' failed'), h('li', {}, 'Every consequential action it proposes waits for a person; nothing it does sends, orders or publishes.')),
      h('h3', {}, 'Participation'), a.model_requests ? banner('plan', 'Asked a local model ' + a.model_requests + ' time(s) in the experimental mission; see the Research Laboratory for how those outputs fared.') : null,
      h('p', { class: 'kv' }, 'Hands work to: ' + (Object.entries(a.handoffs_to).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => k.toUpperCase() + ' ×' + v).join(', ') || 'nobody') + ' · receives from: ' + (Object.entries(a.handoffs_from).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => k.toUpperCase() + ' ×' + v).join(', ') || 'nobody')),
      h('h3', {}, 'Evidence (recordings)'), h('div', { class: 'row' }, a.evidence.slice(0, 6).map(f => h('button', { type: 'button', style: 'font-size:11px;padding:4px 8px;min-height:36px', onclick: () => { const m = d.missions.find(x => x.recordings.some(r => r.file === f)); A.mission = m.letter; go('control', { noFocus: true }); loadRec(f); } }, f.replace('.json', '').replace('mission-', '')))),
      exhibit(a), h('h3', {}, 'Limitations'), h('p', {}, a.limits));
  }

  function replayAt(file, seq) { go('control', { noFocus: true }); loadRec(file).then(() => { if (A.verified && A.verified.ok) seek(seq); }); }
  async function replayNode(node) { go('control', { noFocus: true }); await loadRec('../replays/mission-f-surge-approved.json'); if (!(A.verified && A.verified.ok)) return; const e = A.events.find(x => x.kind === 'task_state' && x.payload.node === node && x.payload.state === 'running') || A.events.find(x => x.kind === 'task_state' && x.payload.node === node); if (e) seek(e.seq); }
  const btn = (label, f, small) => h('button', { type: 'button', class: small ? 'lnk' : null, style: small ? 'min-height:36px;padding:3px 10px;font-size:12px' : null, onclick: f }, label);

  /* ---------------- Nine bespoke exhibits: an agent-specific lens plus a provenance-first browser of the agent's recorded results ---------------- */
  const NINE = ['aethon', 'zybrew', 'pyrix', 'vectra', 'nexora', 'quantix', 'echon', 'novara', 'cortex'];
  A.exSel = {}; A.ex = null;
  const setEx = (slug, p) => { A.ex = { slug, p }; A.dirty = true; };
  const bar = (label, v, mx, note) => h('div', { class: 'kv' }, label + (note ? ' · ' + note : ''), h('div', { class: 'bar2' }, h('i', { style: 'width:' + Math.round(100 * Math.min(1, Math.abs(v) / Math.max(Math.abs(mx), 1e-9))) + '%' })));
  const prov = (file, seq, syn) => { const sh = (A.data.recordings_sha256 || {})[file]; return h('p', { class: 'mut' }, 'Provenance: ' + file.replace('.json', '') + ' · event #' + seq + ' · SHA-256 ' + (sh ? sh.slice(0, 12) : 'n/a') + ' · ' + (syn ? 'SYNTHETIC data' : 'recorded result') + '. The recording is hash-verified in your browser when replayed.'); };
  const choose = (opts, cur, f, label) => h('div', { class: 'row', role: 'group', 'aria-label': label }, opts.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': String(k === cur), style: 'min-height:40px;padding:4px 10px;font-size:12px', onclick: () => f(k) }, t)));
  const kvTable = rows => table(['Field', 'Value'], rows, 'Recorded fields');
  function exhibit9(a) {
    const L = A.data.lenses[a.slug], S = (A.exSel[a.slug] = A.exSel[a.slug] || {}), re = () => { const old = $('#exhibit'); if (old) old.replaceWith(exhibit(a)); };
    const pick = (k, v) => { S[k] = v; re(); };
    const out = [h('h3', {}, 'Exhibit: ' + L.title), h('p', { class: 'mut' }, L.note)];
    if (a.slug === 'aethon') { const sc = S.scn || 'baseline', sy = L.synthetic, v = sy[sc], mx = k => Math.max(sy.baseline[k], sy.surge[k]); setEx('aethon', { demand: sc === 'surge' ? sy.surge.demand_portions / sy.baseline.demand_portions : 1 });
      out.push(h('p', {}, chip('syn', 'SYNTHETIC'), ' ' + sy.label), choose([['baseline', 'Baseline'], ['surge', '+80% demand']], sc, k => pick('scn', k), 'Scenario'), ...sy.keys.map(k => bar(k.replace(/_/g, ' '), v[k], mx(k), String(v[k]))), h('p', { class: 'mut' }, 'The gold ring in the observatory scales with the selected scenario\'s demand ratio (' + (sy.surge.demand_portions / sy.baseline.demand_portions).toFixed(2) + '× at +80%).')); }
    else if (a.slug === 'zybrew') { const i = Math.min(S.i || 0, L.plans.length - 1), pl = L.plans[i]; setEx('zybrew', { util: pl.utilisation });
      out.push(h('div', { class: 'row' }, h('label', {}, 'Recorded plan', h('select', { id: 's-plan', onchange: e => pick('i', Number(e.target.value)) }, L.plans.map((x, k) => h('option', { value: k, selected: k === i }, x.scenario + ' · ' + x.file.replace('.json', '').replace('mission-', '')))))), ...Object.entries(pl.batches).map(([b, n]) => bar(b, n, Math.max(...Object.values(pl.batches)), n + ' batches')), bar('fermenter utilisation', pl.utilisation, 1, Math.round(pl.utilisation * 100) + '%'), h('p', {}, 'Schedule violations: ' + pl.violations + '. ', btn('Replay this plan', () => replayAt(pl.file, pl.seq), true)), prov(pl.file, pl.seq, true), h('p', { class: 'mut' }, 'The copper kettle glows with the selected plan\'s utilisation.')); }
    else if (a.slug === 'pyrix') { const m = L.matrix, al = S.al || Object.entries(m.per_allergen).sort((x, y) => y[1] - x[1])[0][0]; setEx('pyrix', { allergens: m.per_allergen[al] });
      out.push(h('p', {}, 'Dishes: ' + m.dishes + ' · method: ' + m.method), choose(Object.keys(m.per_allergen).map(k => [k, k.replace('_', ' ')]), al, k => pick('al', k), 'Allergen'), ...Object.entries(m.per_allergen).map(([k, n]) => bar(k.replace('_', ' '), n, m.dishes, n + ' of ' + m.dishes + ' dishes' + (k === al ? ' (selected)' : ''))), btn('Replay the derivation', () => replayAt(m.file, m.seq), true), prov(m.file, m.seq, true),
        L.revisions.length ? h('p', {}, 'Recorded revision: removed ' + L.revisions.map(r => r.removed.join(', ') || 'nothing').join('; ') + ' ', btn('Replay', () => replayAt(L.revisions[0].file, L.revisions[0].seq), true)) : null, h('p', { class: 'mut' }, 'The forge flames grow with the number of dishes declaring the selected allergen.')); }
    else if (a.slug === 'vectra') { const i = Math.min(S.i || 0, L.shortages.length - 1), sh = L.shortages[i]; setEx('vectra', { short: Object.keys(sh.short).length });
      out.push(h('div', { class: 'row' }, h('label', {}, 'Recorded check', h('select', { id: 's-short', onchange: e => pick('i', Number(e.target.value)) }, L.shortages.map((x, k) => h('option', { value: k, selected: k === i }, x.scenario + ' · ' + x.file.replace('.json', '').replace('mission-', '')))))), Object.keys(sh.short).length ? h('div', {}, ...Object.entries(sh.short).map(([k, v]) => bar(k, v, Math.max(...Object.values(sh.short)), v + ' short'))) : h('p', {}, 'No shortage in this recording.'), h('p', {}, sh.items + ' ingredients checked. ', btn('Replay this check', () => replayAt(sh.file, sh.seq), true)), prov(sh.file, sh.seq, true), L.reorders.length ? h('div', {}, h('h3', {}, 'Recorded inventory analysis (Mission F)'), kvTable(L.reorders[0].fields)) : null, h('p', { class: 'mut' }, 'Red markers over the stock grid count the shortages in the selected check.')); }
    else if (a.slug === 'nexora') { const by = S.by || 'order', ord = L.suppliers.map((x, k) => Object.assign({ k }, x)); if (by === 'price') ord.sort((x, y) => x.unit_price - y.unit_price); if (by === 'lead') ord.sort((x, y) => x.lead_days - y.lead_days); const sel = S.sup == null ? 0 : S.sup; setEx('nexora', { bay: sel });
      out.push(h('p', {}, chip('syn', 'SYNTHETIC'), ' quotes from the twin\'s dataset'), choose([['order', 'As listed'], ['price', 'By unit price'], ['lead', 'By lead time']], by, k => pick('by', k), 'Sort suppliers'), table(['', 'Supplier', 'Unit price', 'Pack', 'Lead days', 'Pack cost'], ord.map(x => [btn(x.k === sel ? 'selected' : 'view', () => pick('sup', x.k), true), x.id, '$' + x.unit_price, x.pack_qty + ' kg', x.lead_days, '$' + (x.unit_price * x.pack_qty).toFixed(2)]), 'Suppliers'),
        L.draft ? h('div', {}, h('h3', {}, 'Recorded draft purchase order (Mission A)'), kvTable(L.draft.fields), btn('Replay the draft', () => replayAt(L.draft.file, L.draft.seq), true), prov(L.draft.file, L.draft.seq, false), banner('gold', h('b', {}, 'Draft only. '), 'The order is never sent; THE WEIR holds it for a person and the state is DRAFT_NOT_SENT.')) : null, h('p', { class: 'mut' }, 'The crane\'s gold ring marks the supplier bay you selected.')); }
    else if (a.slug === 'quantix') { const sc = S.sc == null ? 0 : S.sc, v = L.scenarios[sc].values, mx = Math.max(...L.scenarios.flatMap(x => Object.values(x.values).map(Math.abs))); setEx('quantix', { scn: sc });
      out.push(h('p', {}, chip('syn', 'SYNTHETIC'), ' twin reference model'), choose(L.scenarios.map((x, k) => [k, x.label]), sc, k => pick('sc', Number(k)), 'Scenario'), ...Object.entries(v).map(([k, n]) => bar(k.replace(/_/g, ' '), n, mx, '$' + fmt(n))), h('p', { class: 'mut' }, 'Gold caps on the skyline mark the selected scenario\'s revenue and gross-profit towers. Values come from the model, not a forecast.'), a.artifacts.filter(x => /exposure/i.test(x.label)).slice(0, 1).map(x => h('div', {}, h('h3', {}, 'Recorded financial exposure'), kvTable(x.fields), btn('Replay', () => replayAt(x.file, x.seq), true), prov(x.file, x.seq, x.synthetic)))); }
    else if (a.slug === 'echon') { const c = L.classification, tot = c.negative + c.neutral + c.positive, is = S.is || Object.keys(c.issues)[0]; setEx('echon', { neg: c.negative / tot });
      out.push(h('p', {}, chip('syn', 'SYNTHETIC'), ' a constructed feedback batch'), bar('negative', c.negative, tot, c.negative + ' of ' + tot), bar('neutral', c.neutral, tot, String(c.neutral)), bar('positive', c.positive, tot, String(c.positive)), h('h3', {}, 'Issues'), choose(Object.keys(c.issues).map(k => [k, k.replace('_', ' ')]), is, k => pick('is', k), 'Issue'), ...Object.entries(c.issues).map(([k, n]) => bar(k.replace('_', ' '), n, Math.max(...Object.values(c.issues)), n + ' complaints' + (k === is ? ' (selected)' : ''))), btn('Replay the classification', () => replayAt(c.file, c.seq), true), prov(c.file, c.seq, true), L.impact ? h('div', {}, h('h3', {}, 'Projected impact (Mission F)'), kvTable(L.impact.fields)) : null, h('p', { class: 'mut' }, 'The resonance core reddens with the share of negative feedback.')); }
    else if (a.slug === 'novara') { const i = Math.min(S.i || 0, L.drafts.length - 1), d = L.drafts[i]; setEx('novara', { beams: Math.min(3, i + 1), removed: d.removed.length > 0 });
      out.push(h('p', {}, 'Draft versions recorded across Missions B and C. Select one:'), h('div', { class: 'row' }, h('label', {}, 'Recorded draft (' + L.drafts.length + ')', h('select', { id: 's-draft', onchange: e => pick('i', Number(e.target.value)) }, L.drafts.map((x, k) => h('option', { value: k, selected: k === i }, x.label + ' · ' + x.file.replace('.json', '').replace('mission-', '') + (x.removed.length ? ' · rule applied' : '')))))), kvTable(d.fields), d.removed.length ? banner('gold', h('b', {}, 'Rule applied: '), 'removed ' + d.removed.join(', ') + ' (the policy forbids promising money to guests).') : null, btn('Replay this draft', () => replayAt(d.file, d.seq), true), prov(d.file, d.seq, false), banner('gold', h('b', {}, 'Never sent. '), 'Drafts stay DRAFT_NOT_RELEASED; a person approves, and nothing is published.'), h('p', { class: 'mut' }, 'Beams from the mast show the draft version; the red beacon appears when a rule removed text.')); }
    else if (a.slug === 'cortex') { const i = Math.min(S.i || 0, L.retrievals.length - 1), rt = L.retrievals[i]; setEx('cortex', { cites: rt.citations.length, flagged: rt.flagged.length > 0 });
      out.push(h('div', { class: 'row' }, h('label', {}, 'Recorded retrieval', h('select', { id: 's-ret', onchange: e => pick('i', Number(e.target.value)) }, L.retrievals.map((x, k) => h('option', { value: k, selected: k === i }, 'claim ' + x.claim + ' · #' + x.seq + ' · ' + x.file.replace('.json', '').replace('mission-b-', ''))))), ), rt.abstained ? banner('gold', h('b', {}, 'ABSTAINED. '), 'The knowledge base would not answer without authoritative evidence.') : table(['Passage', 'Status'], rt.citations.map(c => [c.chunk_id, c.status]), 'Cited passages'), rt.flagged.length ? banner('bad', h('b', {}, 'Instruction-like text flagged and quarantined: '), rt.flagged.join(', ')) : null, btn('Replay this retrieval', () => replayAt(rt.file, rt.seq), true), prov(rt.file, rt.seq, false), h('p', { class: 'mut' }, 'Gold markers on the stacks count the passages cited; they turn red if poisoned text was flagged.')); }
    // provenance-first browser of everything this agent produced in the recordings
    const files = [...new Set(a.artifacts.map(x => x.file))], f = S.f && files.includes(S.f) ? S.f : files[0], list = a.artifacts.filter(x => x.file === f), cur = list[Math.min(S.ai || 0, list.length - 1)];
    if (cur) { setEx(a.slug, Object.assign({}, A.ex.p, { mission: cur.mission }));
      out.push(h('h3', {}, 'Every result this agent recorded (' + a.artifacts.length + ')'), h('div', { class: 'row' }, h('label', {}, 'Recording', h('select', { id: 's-art-file', onchange: e => { S.f = e.target.value; S.ai = 0; re(); } }, files.map(x => h('option', { value: x, selected: x === f }, x.replace('.json', '').replace('mission-', ''))))), ),
        h('div', { class: 'row', role: 'group', 'aria-label': 'Recorded results' }, list.map((x, k) => h('button', { type: 'button', 'aria-pressed': String(x === cur), style: 'min-height:36px;padding:3px 9px;font-size:12px', onclick: () => pick('ai', k) }, x.label.slice(0, 30)))),
        h('p', { class: 'kv' }, h('b', {}, cur.label + ' · ' + cur.kind + ' · Mission ' + cur.mission + ' · ' + cur.scenario)), kvTable(cur.fields), h('div', { class: 'row' }, btn('Replay to this event', () => replayAt(cur.file, cur.seq), true)), prov(cur.file, cur.seq, cur.synthetic)); }
    return out;
  }
  function exhibit(a) {
    const ex = A.data.exhibits[a.slug], box = h('div', { id: 'exhibit' });
    if (a.slug === 'aegis') box.append(h('h3', {}, 'Exhibit: ' + ex.title), h('p', { class: 'mut' }, ex.note), table(['Decision', 'Times'], Object.entries(ex.decisions).map(([k, v]) => [k.replace(/_/g, ' '), v]), 'Governance decisions'));
    else if (a.slug === 'veritas') box.append(h('h3', {}, 'Exhibit: ' + ex.title), h('p', { class: 'mut' }, ex.note), table(['Check', 'Passed', 'Failed', 'First failure'], Object.entries(ex.checks).map(([k, v]) => [k, v.passed, v.failed, v.first_failure ? btn('Replay #' + v.first_failure.seq, () => replayAt(v.first_failure.file, v.first_failure.seq), true) : 'none']), 'Validation bench'));
    else if (a.slug === 'synapse') box.append(h('h3', {}, 'Exhibit: ' + ex.title), h('p', { class: 'mut' }, ex.note), table(['Task', 'Agent', 'Depends on', 'Replay'], ex.graph.map(n => [n.title, n.agent.toUpperCase(), n.depends_on.join(', ') || 'nothing', btn('Replay this task', () => replayNode(n.node), true)]), 'Orchestration graph'));
    else box.append(...exhibit9(a));
    box.append(h('h3', {}, 'Recorded moments (replay any)'), a.moments.length ? h('ul', { class: 'l' }, a.moments.map(m => h('li', {}, btn('Replay #' + m.seq, () => replayAt(m.file, m.seq), true), ' ', h('b', {}, m.kind + ': '), m.text, h('span', { class: 'mut' }, ' (' + m.file.replace('.json', '').replace('mission-', '') + ')')))) : h('p', { class: 'mut' }, 'No notable moments recorded.'));
    return box;
  }
  const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : String(v)) : String(v);
  function pTwin(p) {
    const T = A.data.twin, dp = T.departments.find(d => d.id === (A.dept || 'inventory')), ag = A.data.agents.find(a => a.slug === dp.agent);
    const keys = [...new Set([...Object.keys(dp.baseline), ...Object.keys(dp.surge), ...Object.keys(dp.surge_with_reorder)])];
    const node = dp.mission_f_node ? T.workflow_edges.nodes.find(n => n.node === dp.mission_f_node) : null, edges = T.edges.filter(e => e.src === dp.id || e.dst === dp.id), se = e => T.surge_edges.find(x => x.src === e.src && x.dst === e.dst && x.label === e.label);
    A.dept = dp.id;
    p.append(h('h2', {}, 'Digital twin district'), banner('syn', h('b', {}, 'SYNTHETIC. '), T.note), h('div', { class: 'row' }, h('label', {}, 'Department', h('select', { id: 's-dept', onchange: e => go('twin', { dept: e.target.value }) }, T.departments.map(d => h('option', { value: d.id, selected: d.id === dp.id }, d.id))))),
      h('h3', {}, 'Participating agent'), h('p', { class: 'kv' }, btn(ag.name, () => go('chamber', { agent: ag.slug }), true), ' ' + ag.specialty + ' · ' + dp.agent_mapping + '. Recorded participation: ' + ag.events + ' events in missions ' + Object.keys(ag.missions).join(', ') + '. The building light follows that agent\'s state in the open recording, never invented activity.'),
      h('h3', {}, 'State in the synthetic model (' + dp.id + ')'), table(['Value', 'Baseline', '+80% demand', '+80%, reorder approved'], keys.map(k => [k.replace(/_/g, ' '), fmt(dp.baseline[k] ?? '–'), fmt(dp.surge[k] ?? '–'), fmt(dp.surge_with_reorder[k] ?? '–')]), 'Twin values'),
      h('h3', {}, 'Dependencies (edges of the twin model)'), edges.length ? h('ul', { class: 'l' }, edges.map(e => { const x = se(e); return h('li', {}, e.src + ' → ' + e.dst + ': ' + e.label + ' ' + fmt(e.baseline) + ' ' + e.unit + (x ? ' (+80% demand: ' + fmt(x.value) + ')' : '')); })) : h('p', { class: 'mut' }, 'No edge touches this department in the model.'),
      node ? h('div', {}, h('h3', {}, 'Recorded workflow link'), h('p', { class: 'kv' }, 'Mission F task "' + node.title + '" by ' + node.agent.toUpperCase() + ', depends on ' + (node.depends_on.join(', ') || 'nothing') + '. ', btn('Replay this task', () => replayNode(node.node), true))) : h('p', { class: 'mut' }, 'No Mission F task maps to this department; see the agent\'s recorded moments below.'),
      h('h3', {}, 'Governance boundary'), h('p', {}, 'Every proposal that touches this department is a DRAFT. Consequential actions are held by THE WEIR for a person, and the twin plans against a synthetic cap of $' + T.planning_cap_usd + '. Nothing is ordered, sent or executed.'),
      h('h3', {}, 'Evidence and provenance'), h('p', { class: 'mut' }, 'Produced by ' + T.provenance.tools.join(', ') + ' at lab commit ' + String(T.provenance.lab_commit).slice(0, 10) + ' on ' + T.provenance.generated_at + '. ' + T.provenance.concept),
      h('h3', {}, 'Recorded moments of ' + ag.name), ag.moments.length ? h('ul', { class: 'l' }, ag.moments.slice(0, 5).map(m => h('li', {}, btn('Replay #' + m.seq, () => replayAt(m.file, m.seq), true), ' ' + m.kind + ': ' + m.text))) : h('p', { class: 'mut' }, 'none'),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: '../../nasha-lab.html' }, 'NASHA AI Lab explorer')));
  }
  function netEdges() {
    const part = A.netMission ? A.data.missions.find(x => x.letter === A.netMission).agents : null, out = [];
    const all = A.data.agents.flatMap(a => Object.entries(a.handoffs_to).map(([b, n]) => ({ from: a.slug, to: b, n }))), top = all.map(e => e.n).sort((x, y) => y - x)[Math.floor(all.length / 3)] || 1, ag = A.netAgent;
    all.forEach(e => out.push(Object.assign(e, { dim: (!!part && !(part[e.from] && part[e.to])) || (!!ag && e.from !== ag && e.to !== ag), hot: !!ag && (e.from === ag || e.to === ag), hide: !!A.netSimple && e.n < top && !(ag && (e.from === ag || e.to === ag)) })));
    return out;
  }

  /* ---------------- Cinematic recruiter journey: nine scenes, about three minutes. Every figure is read from stored artifacts; every recording is hash-verified before use ---------------- */
  const SCENE_S = 20;
  function tourScenes() {
    const r = A.r, d = A.data, ih = r.cc && [...r.cc.runs].reverse().find(x => x.system.startsWith('improved') && x.dataset.role === 'holdout'), a = r.p7 && r.p7.sets[1], b = r.p7b && r.p7b.sets[1], pe = r.pe, tr = r.tests, n = d.missions.reduce((x, m) => x + m.recordings.length, 0);
    return [
      { id: 'welcome', title: 'Welcome to NASHA', room: 'atrium', chips: [['syn', 'SYNTHETIC'], ['ok', 'VERIFIED']], text: 'NASHA is a concept brewery-and-kitchen business used as a stage for engineering governed AI workflows. Twelve named agents, six missions and ' + n + ' hash-verified recorded runs stand behind everything you see: nothing in this headquarters is mock activity, and nothing is live. Skip any scene with Next, or leave at any time.' },
      { id: 'agents', title: 'The twelve-agent ecosystem', room: 'campus', net: true, chips: [['rec', 'RECORDED'], ['ok', 'VERIFIED']], text: 'Twelve named agents, each with its own district: ' + d.agents.map(a => a.name + ' (' + a.specialty + ')').join('; ') + '. Beams are hand-offs counted from the recordings. Only ' + d.agents.filter(a => a.implementation !== 'deterministic').map(a => a.name).join(', ') + ' ever asked a language model, and the others are rule-based.' },
      { id: 'mission', title: 'Mission Control: a real recorded mission', room: 'control', act: 'playF', chips: [['rec', 'RECORDED']], text: 'Mission F, Demand Surge Response: eight dependent tasks across inventory, demand, brewery, finance, customer experience, a proposal, governance and a report. Replayed from a hash-verified recording; a person approves a draft and nothing is executed.' },
      { id: 'collab', title: 'Agent collaboration: the real task dependencies', room: 'control', act: 'collabF', chips: [['rec', 'RECORDED'], ['ok', 'VERIFIED']], text: 'The same recorded Mission F as a dependency stage: each arrow runs from a task to the task that needs its result (finance waits for inventory and demand; the proposal waits for inventory, brewery and finance; governance waits for the proposal). The selected task shows its recorded events. The agents do not converse: a fixed, validated graph hands results from one rule-based task to the next.' },
      { id: 'research', title: 'AI research: what was measured', room: 'lab', chips: [['ok', 'VERIFIED']], text: ih && a && b && pe ? 'On a 37-item holdout (author-written labels) the improved deterministic checker scored ' + ih.metrics.accuracy + ' accuracy and meets its thresholds. The tested 1.5B local model did not: prompt A declared ' + r.p7.sets.reduce((x, s) => x + s.per_item.filter(i => i.predicted === 'SUPPORTED').length, 0) + ' of 57 claims supported, and prompt B reached ' + b.metrics.false_acceptance_rate + ' false acceptance. The model planner reproduced the fixed graph in ' + pe.planner_identity_check.identical_to_fixed_graph + ' of ' + pe.planner_identity_check.valid + ' plans, and only ' + pe.explainer.valid_first_try + ' of ' + pe.explainer.requests + ' explanations passed the grounding check. Same-author labels: not independent validation.' : 'The evaluation results are not available.' },
      { id: 'governance', title: 'Governance: a recorded blocked action', room: 'weir', act: 'playB', chips: [['rec', 'RECORDED']], text: 'THE WEIR denies any tool outside the policy by default and holds consequential writes for a person. In this recording of Mission B a deliberate out-of-policy probe is blocked, the release is blocked, and a person approves a draft that can never be sent.' },
      { id: 'twin', title: 'The digital twin: a synthetic business', room: 'twin', dept: 'inventory', chips: [['syn', 'SYNTHETIC']], text: 'Eight departments from the twin\'s reference model, linked by its real dependency edges (for example inventory to restaurant on availability). Every value is synthetic; NASHA is a concept and a simulation, not an operating business. Select a building to inspect it.' },
      { id: 'engineering', title: 'Engineering architecture', room: 'atrium', chips: [['ok', 'VERIFIED']], text: 'A static front end with a raw-WebGL scene engine and a complete 2D fallback; a loopback-only Python backend with operator tokens, tool allowlists and human approval gates; a versioned event contract with a SHA-256 hash chain verified in your browser; governed missions on the lab\'s real components' + (tr ? '; ' + tr.total_checks + ' automated checks across ' + tr.suites.length + ' suites (' + tr.total_failed + ' failed, ' + tr.skipped_suites + ' suites skipped) in Chromium, WebKit and Firefox.' : '.') + ' Physical Safari and iPhone testing has not been done.' },
      { id: 'portfolio', title: 'Professional portfolio (owner-stated)', room: 'atrium', chips: [['exp', 'EXPERIENCE'], ['plan', 'UNVERIFIED']], text: 'As stated by the owner and not evidenced by this project: an Apple Maps — Client Engagement in Product and GenAI Operations (a client assignment, not direct Apple employment); Business and Operations Analytics at Heart Hospitality; Data and Business Analytics at Liberated Monks; a Master\'s in Business Analytics; an Integrated M.Tech in Software Engineering; working skills in Python, SQL, analytics, automation and AI evaluation. No dates, metrics or responsibilities are claimed. NASHA is an independent project, separate from this list. Public repositories you can judge directly, and the guided summaries, are linked below.', links: true }
    ];
  }
  function tourEnter(i) {
    const T = A.tour, sc = tourScenes()[i]; T.i = i; A.dept = sc.dept || A.dept; A.tourNet = !!sc.net;
    flyTo(sc.room, () => {}); A.dirty = true;
    if (sc.act === 'playF') { loadRec('../replays/mission-f-surge-approved.json').then(() => { if (A.verified && A.verified.ok && T.i === i) { A.speed = 4; play(); } }); }
    else if (sc.act === 'collabF') { loadRec('../replays/mission-f-surge-approved.json').then(() => { if (A.verified && A.verified.ok && T.i === i) { seek(9999); A.task = 'finance'; A.thAgent = ''; A.dirty = true; renderLive(); renderTourPanel(); } }); }
    else if (sc.act === 'playB') { loadRec('../replays/mission-b-incident-approved.json').then(() => { if (A.verified && A.verified.ok && T.i === i) { for (let n = 0; n < 400; n++) if (!step()) break; } }); }
    else { stop(); }
    say('Scene ' + (i + 1) + ' of ' + tourScenes().length + ': ' + sc.title); renderTourPanel();
  }
  function tourTick() { const T = A.tour; if (!T.playing) return; T.elapsed += 0.25; const n = tourScenes().length, want = Math.min(n - 1, Math.floor(T.elapsed / SCENE_S)); if (T.elapsed >= n * SCENE_S) { tourStop(); T.elapsed = n * SCENE_S; renderTourPanel(); return; } if (want !== T.i) tourEnter(want); else renderTourClock(); }
  function tourPlay() { const T = A.tour; if (T.elapsed >= tourScenes().length * SCENE_S) { T.elapsed = 0; tourEnter(0); } T.playing = true; clearInterval(T.timer); T.timer = setInterval(tourTick, 250); if ($('#tour-play')) $('#tour-play').textContent = 'Pause'; renderTourClock(); }
  function tourStop() { const T = A.tour; T.playing = false; clearInterval(T.timer); T.timer = 0; if ($('#tour-play')) $('#tour-play').textContent = 'Play'; }
  function tourJump(i) { const T = A.tour; T.elapsed = i * SCENE_S; tourEnter(i); }
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function renderTourClock() { const T = A.tour, n = tourScenes().length; if ($('#tour-clock')) { $('#tour-clock').textContent = mmss(T.elapsed) + ' / ' + mmss(n * SCENE_S); $('#tour-bar').value = T.elapsed; } }
  function renderTourPanel() {
    const sc = tourScenes()[A.tour.i], box = $('#tour-body'); if (!box) return; const ch = k => h('span', { class: 'chip', 'data-k': k[0] === 'exp' ? 'syn' : k[0] }, k[1]);
    box.replaceChildren(h('h3', {}, 'Scene ' + (A.tour.i + 1) + ' of ' + tourScenes().length), h('h2', { style: 'font-size:19px' }, sc.title), h('p', {}, sc.chips.map(ch)), h('p', {}, sc.text),
      sc.links ? h('div', {}, h('ul', { class: 'l' }, ((A.r.steps && A.r.steps.repos) || []).map(rp => h('li', {}, h('a', { href: rp.url, target: '_blank', rel: 'noopener noreferrer' }, rp.name), ': ' + rp.about))), h('div', { class: 'row' }, h('a', { class: 'btn', href: '../../recruiter.html' }, 'Recruiter page (no scripts)'), h('a', { class: 'btn', href: '../../index.html' }, 'Portfolio home'), h('a', { class: 'btn', href: '../../nasha-lab.html' }, 'NASHA AI Lab explorer'), h('a', { class: 'btn', href: '../../projects.html' }, 'All projects'))) : null,
      sc.act === 'collabF' && A.verified && A.verified.ok ? theaterBox() : null,
      sc.act ? h('p', { class: 'mut' }, 'The scene is driven by a recording that was verified in this browser; the Mission Theater has the full controls.') : null);
    renderTourClock();
  }
  function pTour(p) {
    const T = A.tour, n = tourScenes().length;
    p.append(h('h2', {}, 'Recruiter journey'), banner('rec', h('b', {}, 'About three minutes, nine scenes. '), 'Every statement carries its evidence label. You can pause, step through, jump to any scene, or skip the camera flights, and nothing here runs live.'),
      h('div', { class: 'row' }, h('button', { type: 'button', id: 'tour-play', onclick: () => T.playing ? tourStop() : tourPlay() }, T.playing ? 'Pause' : 'Play'), btn('Previous', () => { tourStop(); tourJump(Math.max(0, T.i - 1)); }), btn('Next', () => { tourStop(); tourJump(Math.min(n - 1, T.i + 1)); }), btn('Restart', () => { tourStop(); T.elapsed = 0; tourJump(0); })),
      h('label', { class: 'mut' }, 'Progress', h('input', { type: 'range', id: 'tour-bar', min: 0, max: n * SCENE_S, step: 0.25, value: T.elapsed, 'aria-label': 'Journey progress', oninput: e => { tourStop(); T.elapsed = Number(e.target.value); const w = Math.min(n - 1, Math.floor(T.elapsed / SCENE_S)); if (w !== T.i) tourEnter(w); else renderTourClock(); } })), h('p', { id: 'tour-clock', class: 'kv', 'aria-live': 'off' }),
      h('div', { id: 'tour-body' }), h('h3', {}, 'Scenes'), h('ol', { class: 'l' }, tourScenes().map((s, i) => h('li', {}, btn(s.title, () => { tourStop(); tourJump(i); }, true)))));
    if (!A.tourStarted) { A.tourStarted = true; tourEnter(0); } else renderTourPanel();
  }
  function pNetwork(p) {
    const d = A.data, m = A.netMission, ag = A.netAgent;
    p.append(h('h2', {}, 'Agent operations network'), banner('rec', h('b', {}, 'Derived. '), 'Edges are counted hand-offs between agents (consecutive agent starts) in the recordings. Nothing is assumed.'),
      h('div', { class: 'row' }, h('label', {}, 'Highlight a mission', h('select', { id: 's-nm', onchange: e => { A.netMission = e.target.value; renderPanel(); renderPlan(); } }, h('option', { value: '' }, 'All missions'), d.missions.map(x => h('option', { value: x.letter, selected: x.letter === m }, x.letter + ' ' + x.title))))),
      h('div', { class: 'row' }, h('label', {}, 'Highlight an agent', h('select', { id: 's-na', onchange: e => { A.netAgent = e.target.value; renderPanel(); renderPlan(); A.dirty = true; } }, h('option', { value: '' }, 'No agent'), d.agents.map(x => h('option', { value: x.slug, selected: x.slug === ag }, x.name)))), h('label', { style: 'display:flex;gap:8px;align-items:center' }, h('input', { type: 'checkbox', id: 'c-simple', checked: !!A.netSimple, onchange: e => { A.netSimple = e.target.checked; renderPanel(); renderPlan(); A.dirty = true; } }), 'Simplified view (the busiest third of hand-offs)')),
      h('p', { class: 'mut' }, 'Arrows point from the agent that handed over to the agent that took over; thicker means more hand-offs. In the 3D view a moving dot travels the same direction.'),
      h('div', { id: 'netsvg' }), h('details', { open: !!ag }, h('summary', {}, 'Hand-offs as a list (equivalent to the diagram)'), table(['From', 'To', 'Hand-offs'], netEdges().filter(e => !e.hide && (!ag || e.hot) && !(m && e.dim && !e.hot)).sort((x, y) => y.n - x.n).map(e => [e.from.toUpperCase(), e.to.toUpperCase(), e.n]), 'Recorded hand-offs')), h('h3', {}, 'Participation by category (events)'),
      table(['Agent', 'Rule-based', 'Retrieval', 'Tool exec.', 'Validation', 'Governance', 'Human', 'Model'], d.agents.map(a => [h('button', { type: 'button', style: 'min-height:32px;padding:2px 8px;font-size:12px', onclick: () => go('chamber', { agent: a.slug }) }, a.name), a.categories['rule-based processing'] || 0, a.categories['data retrieval'] || 0, a.categories['tool execution'] || 0, a.categories.validation || 0, a.categories.governance || 0, a.categories['human decision'] || 0, a.categories['model-assisted'] || 0]), 'Participation by category'),
      m ? h('p', { class: 'kv' }, 'Mission ' + m + ' agents: ' + Object.entries(d.missions.find(x => x.letter === m).agents).sort((x, y) => y[1] - x[1]).map(([k, v]) => k.toUpperCase() + ' (' + v + ' events)').join(', ')) : null);
    $('#netsvg').appendChild(netSvg(260));
  }
  function netSvg(size) {
    const d = A.data, ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), c = size / 2, R = size * 0.38; svg.setAttribute('viewBox', `0 0 ${size} ${size}`); svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', 'Agent hand-off network');
    const part = A.netMission ? d.missions.find(x => x.letter === A.netMission).agents : null, pos = {}; d.agents.forEach((a, i) => { const t = i / d.agents.length * Math.PI * 2 - Math.PI / 2; pos[a.slug] = [c + Math.cos(t) * R, c + Math.sin(t) * R]; });
    const mk = (t, at) => { const n = document.createElementNS(ns, t); Object.entries(at).forEach(([k, v]) => n.setAttribute(k, v)); return n; }; const max = Math.max(1, ...d.agents.flatMap(a => Object.values(a.handoffs_to)));
    netEdges().forEach(e => { if ((part && !(part[e.from] && part[e.to])) || e.hide) return; const n = e.n, p1 = pos[e.from], p2 = pos[e.to], dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, hot = e.hot, op = e.dim ? 0.07 : 0.15 + 0.6 * n / max + (hot ? 0.25 : 0), col = hot ? '#fff3c4' : '#f0c680', tx = p2[0] - ux * 13, ty = p2[1] - uy * 13;
      svg.appendChild(mk('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: col, 'stroke-opacity': op, 'stroke-width': 0.6 + 2.6 * n / max + (hot ? 0.8 : 0) }));
      svg.appendChild(mk('polygon', { points: `${tx + ux * 5},${ty + uy * 5} ${tx - uy * 3},${ty + ux * 3} ${tx + uy * 3},${ty - ux * 3}`, fill: col, 'fill-opacity': Math.min(1, op + 0.2), 'aria-hidden': 'true' })); });
    d.agents.forEach(a => { const on = !part || part[a.slug], g = mk('g', { transform: `translate(${pos[a.slug][0]},${pos[a.slug][1]})`, tabindex: 0, role: 'button', 'aria-label': a.name + ': open its chamber', style: 'cursor:pointer' }); g.appendChild(mk('circle', { r: 11, fill: a.color, 'fill-opacity': on ? 0.9 : 0.15, stroke: A.agent === a.slug ? '#fff' : '#05090a', 'stroke-width': 2 })); const t = mk('text', { y: 24, 'text-anchor': 'middle', fill: on ? '#e8f0ec' : '#667', 'font-size': 8, 'font-family': 'ui-monospace,monospace' }); t.textContent = a.name; g.appendChild(t); g.addEventListener('click', () => go('chamber', { agent: a.slug })); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('chamber', { agent: a.slug }); } }); svg.appendChild(g); });
    return svg;
  }
  function p8Section(p8) {
    if (!p8) return null;
    const cr = p8.compound_regression.rows, fa = p8.failure_analysis, out = Object.entries(cr.reduce((a, r) => (a[r.improved_outcome] = (a[r.improved_outcome] || 0) + 1, a), {}));
    return h('div', { id: 'p8' }, h('h3', {}, 'Claim-checker reliability (Phase 8)'),
      h('ul', { class: 'l' }, h('li', {}, h('b', {}, 'Original compound claims, restored as a regression case: '), cr.length + ' rows; improved checker ' + out.map(([k, v]) => k + ' ' + v).join(', ') + '. The two true but compound claims are rejected, not silently accepted (a measured false rejection).'),
        h('li', {}, h('b', {}, 'False rejections categorised: '), fa.total + ' = ' + Object.entries(fa.counts).filter(([, v]) => v).map(([k, v]) => k.replace(/_/g, ' ') + ' ' + v).join(', ') + '.'),
        h('li', {}, h('b', {}, 'Candidate fixes (development set only): '), p8.candidates.variants.map(v => v.variant.split(':')[0] + ' changed ' + v.change_from_frozen_checker.length + ' outcomes').join('; ') + '. None adopted; the holdout was not used.'),
        h('li', {}, h('b', {}, 'Independent labelling package: '), A.r.pk ? A.r.pk.items + ' claims, status UNLABELLED: no independent validation exists until a reviewer other than the author returns validated labels.' : 'not available.')));
  }

  /* ---------------- Research Institute stations: six exhibits over the stored evaluation artifacts ---------------- */
  const STATIONS = ['Claim verification', 'RAG evidence inspection', 'Agent reliability', 'Model comparison', 'Regression analysis', 'Evidence vault'];
  const stationPos = i => { const a = (i / 6) * Math.PI * 1.25 + Math.PI * 0.375 + Math.PI, R = SC.ROOMS.lab; return [R[0] + Math.cos(a) * 6.4, 2.6, R[2] + Math.sin(a) * 6.4]; };
  async function ensureTraces() { if (!A.r.traces) A.r.traces = await jopt('../research/rag-traces.json'); return A.r.traces; }
  function stationExhibit() {
    const i = A.station || 0, r = A.r, box = h('div', { id: 'station' }), head = h('h3', {}, 'Station ' + (i + 1) + ': ' + STATIONS[i]);
    const nav = h('div', { class: 'row', role: 'group', 'aria-label': 'Research stations' }, STATIONS.map((n, k) => h('button', { type: 'button', 'aria-pressed': String(k === i), style: 'min-height:40px;padding:4px 10px;font-size:12px', onclick: () => go('lab', { station: k, noFocus: true }) }, (k + 1) + ' ' + n)));
    box.append(head, nav);
    const ih = r.cc && [...r.cc.runs].reverse().find(x => x.system.startsWith('improved') && x.dataset.role === 'holdout'), bh = r.cc && [...r.cc.runs].reverse().find(x => x.system.startsWith('baseline') && x.dataset.role === 'holdout');
    const add = (...c) => box.append(...c);
    if (i === 0) add(h('p', {}, chip('ok', 'VERIFIED'), ' Holdout (37 author-written items): original checker accuracy ' + bh.metrics.accuracy + ' (false-acceptance ' + bh.metrics.false_acceptance_rate + '), improved deterministic checker ' + ih.metrics.accuracy + ' (false-acceptance ' + ih.metrics.false_acceptance_rate + ', false-rejection ' + ih.metrics.false_rejection_rate + ').'), r.p8 ? h('p', {}, 'Compound-claim regression: ' + r.p8.compound_regression.rows.length + ' original claims restored; improved checker ' + [...new Set(r.p8.compound_regression.rows.map(x => x.improved_outcome))].join('/') + ' them all, including two true ones (a measured false rejection).') : null);
    else if (i === 1) { const t = r.traces; if (!t) { add(h('p', { class: 'mut' }, 'Loading the stored retrieval traces…')); ensureTraces().then(() => { if (A.room === 'lab' && (A.station || 0) === 1) renderPanel(); }); } else { const ab = t.items.filter(x => x.kb_answer.abstained), ex = ab[0]; add(h('p', {}, chip('ok', 'VERIFIED'), ' ' + t.items.length + ' stored investigations on the frozen corpus; the real knowledge base abstained on ' + ab.length + ' of them (it does not answer without authoritative evidence).'), ex ? h('p', { class: 'kv' }, h('b', {}, 'Example abstention: '), '"' + ex.claim.slice(0, 90) + '" — ' + ex.kb_answer.reason.slice(0, 140)) : null); } }
    else if (i === 2) { const rows = r.rel ? r.rel.rows : []; add(h('p', {}, chip('rec', 'RECORDED'), ' Across ' + rows.length + ' recordings: ' + rows.filter(x => x.retries > 0).length + ' with retries, ' + rows.filter(x => x.fail_closed).length + ' that failed closed, ' + rows.filter(x => x.fallbacks > 0).length + ' with a deterministic fallback, ' + rows.filter(x => x.model_validations_failed > 0).length + ' with a rejected model output, ' + rows.filter(x => x.approval_holds > 0).length + ' with a human approval hold. Counted from the events.')); }
    else if (i === 3) { const a = r.p7 && r.p7.sets[1], b = r.p7b && r.p7b.sets[1]; add(h('p', {}, chip('ok', 'VERIFIED'), ' Real local inference (' + (r.p7 ? r.p7.runtime.model : 'model') + ', loopback), holdout: prompt A accuracy ' + (a && a.metrics.accuracy) + ', declared no claim supported; prompt B false-acceptance ' + (b && b.metrics.false_acceptance_rate) + '. Neither meets the pre-registered thresholds; the deterministic checker does (' + ih.metrics.accuracy + ').'), r.pe ? h('p', {}, 'Model-assisted planner: ' + r.pe.planner.valid_first_try + '/' + r.pe.planner.requests + ' valid plans, all identical to the fixed graph; ' + r.pe.explainer.valid_first_try + '/' + r.pe.explainer.requests + ' explanations passed grounding.') : null); }
    else if (i === 4) { const t = r.traces; if (!t) { add(h('p', { class: 'mut' }, 'Loading the stored per-item results…')); ensureTraces().then(() => { if (A.room === 'lab' && (A.station || 0) === 4) renderPanel(); }); } else { const it = t.items.filter(x => x.reference), imp = it.filter(x => x.outcome.baseline !== 'correct' && x.outcome.improved === 'correct').length, reg = it.filter(x => x.outcome.baseline === 'correct' && x.outcome.improved !== 'correct').length; add(h('p', {}, chip('ok', 'VERIFIED'), ' Original vs improved checker over ' + it.length + ' labelled items: ' + imp + ' improved, ' + reg + ' regressed, ' + it.filter(x => x.outcome.baseline === 'correct' && x.outcome.improved === 'correct').length + ' correct in both, ' + it.filter(x => x.outcome.baseline !== 'correct' && x.outcome.improved !== 'correct').length + ' wrong in both.')); } }
    else { const v = r.vault, c = {}; (v ? v.artifacts : []).forEach(x => { c[x.label] = (c[x.label] || 0) + 1; }); add(h('p', {}, chip('ok', 'VERIFIED'), ' ' + (v ? v.artifacts.length : 0) + ' hashed artifacts: ' + Object.entries(c).map(([k, n]) => k + ' ' + n).join(', ') + '. ' + (v ? v.limitations[0] : '')), r.pk ? h('p', {}, chip('plan', 'PLANNED'), ' Independent labelling package: ' + r.pk.items + ' claims, UNLABELLED. No independent validation exists yet.') : null); }
    add(h('div', { class: 'row' }, h('a', { class: 'btn', href: '../../nasha-lab.html' }, 'Open the NASHA AI Lab explorer')));
    return box;
  }
  function pLab(p) {
    const r = A.r, cc = r.cc, ih = cc && [...cc.runs].reverse().find(x => x.system.startsWith('improved') && x.dataset.role === 'holdout'), bh = cc && [...cc.runs].reverse().find(x => x.system.startsWith('baseline') && x.dataset.role === 'holdout'), a = r.p7 && r.p7.sets[1], b = r.p7b && r.p7b.sets[1], pe = r.pe;
    const rows = [['Original checker', bh], ['Improved deterministic checker', ih]].filter(x => x[1]).map(([n, x]) => [n, x.metrics.false_acceptance_rate, x.metrics.false_rejection_rate, x.metrics.accuracy, x.meets_acceptance ? 'meets' : 'does NOT meet']);
    if (a) rows.push(['Local model, prompt A (real inference)', a.metrics.false_acceptance_rate, a.metrics.false_rejection_rate, a.metrics.accuracy, a.meets_preregistered_holdout_thresholds ? 'meets' : 'does NOT meet']);
    if (b) rows.push(['Local model, prompt B (holdout reused)', b.metrics.false_acceptance_rate, b.metrics.false_rejection_rate, b.metrics.accuracy, b.meets_preregistered_holdout_thresholds ? 'meets' : 'does NOT meet']);
    p.append(h('h2', {}, 'AI Research Laboratory'), banner('ok', h('b', {}, 'VERIFIED results. '), 'Stored artifacts from real runs; the full six-station laboratory is one click away.'),
      h('h3', {}, 'Holdout results (37 items, author-written labels)'), table(['System', 'False accept.', 'False reject.', 'Accuracy', 'Pre-registered thresholds'], rows, 'Holdout results'),
      h('h3', {}, 'Findings, stated plainly'), h('ul', { class: 'l' }, a ? h('li', {}, 'Prompt A declared ' + r.p7.sets.reduce((n, s) => n + s.per_item.filter(x => x.predicted === 'SUPPORTED').length, 0) + ' of 57 claims SUPPORTED: it behaves like an always-UNSUPPORTED control.') : null, b ? h('li', {}, 'Prompt B, tuned on the development set, reached false-acceptance ' + b.metrics.false_acceptance_rate + ' on the holdout.') : null,
        pe ? h('li', {}, 'Model-assisted planner: ' + pe.planner.valid_first_try + ' of ' + pe.planner.requests + ' valid plans, and ' + pe.planner_identity_check.identical_to_fixed_graph + ' of ' + pe.planner_identity_check.valid + ' were identical to the fixed graph: no benefit shown.') : null, pe ? h('li', {}, 'Model explanations: ' + pe.explainer.valid_first_try + ' of ' + pe.explainer.requests + ' passed the grounding check; the rest fell back to the deterministic summary.') : null,
        h('li', {}, 'Limits: labels share an author with the checker; the sets are small; this is not independent validation.')),
      p8Section(r.p8),
      h('h3', {}, 'Research stations (select one, or pick a station pylon in the scene)'), stationExhibit(),
      h('h3', {}, 'Stations'), h('ul', { class: 'l' }, ['Claim verification (lit by failed claim checks)', 'RAG evidence inspection (lit by validation failures)', 'Agent reliability (lit by retries, fallbacks, blocks)', 'Model comparison (lit by model events)', 'Regression analysis', 'Evidence vault'].map(x => h('li', {}, x))),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: '../../nasha-lab.html' }, 'Open the NASHA AI Lab explorer'), h('button', { type: 'button', onclick: () => { go('control', { noFocus: true }); loadRec('../replays/mission-f-model-assisted-real.json'); } }, 'Replay the real-model run')),
      A.st.validations.length ? banner('bad', h('b', {}, 'From the open recording: '), A.st.validations.length + ' validation failure(s): ' + A.st.validations.slice(-3).map(v => '#' + v.seq + ' ' + v.name).join(', ')) : null);
  }

  /* ---------------- 2D plan (a complete alternative view) ---------------- */
  function renderPlan() {
    const pl = $('#plan'); if (pl.hidden) return; pl.replaceChildren(); const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 600 600'); svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', '2D plan of the headquarters');
    const mk = (t, at, txt) => { const n = document.createElementNS(ns, t); Object.entries(at).forEach(([k, v]) => n.setAttribute(k, v)); if (txt) n.textContent = txt; return n; };
    const rooms = { atrium: [300, 300, 150], control: [90, 300, 70], lab: [510, 300, 70], weir: [300, 80, 70], twin: [300, 520, 70] };
    Object.entries(rooms).forEach(([k, [x, y, r]]) => { const g = mk('g', { tabindex: 0, role: 'button', 'aria-label': 'Go to ' + NAMES[k], style: 'cursor:pointer' }); g.appendChild(mk('circle', { cx: x, cy: y, r, fill: '#0a1415', stroke: A.room === k ? '#f0c680' : '#233a37', 'stroke-width': 2 })); g.appendChild(mk('text', { x, y: k === 'atrium' ? y + 3 : y + 4, 'text-anchor': 'middle', fill: '#f0c680', 'font-size': 11, 'font-family': 'ui-monospace,monospace' }, k === 'atrium' ? '' : NAMES[k].toUpperCase())); g.addEventListener('click', () => go(k)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(k); } }); svg.appendChild(g); });
    A.data.agents.forEach((a, i) => { const t = i / 12 * Math.PI * 2 + 0.26, x = 300 + Math.cos(t) * 105, y = 300 + Math.sin(t) * 105, s = A.st.agents[a.slug], col = s.state === 'blocked' ? '#ee6a55' : s.state === 'awaiting' ? '#f0c680' : a.color, g = mk('g', { tabindex: 0, role: 'button', 'aria-label': a.name + ' is ' + s.state + (s.seq ? ' (event ' + s.seq + ')' : '') + '. Open its chamber.', style: 'cursor:pointer' });
      g.appendChild(mk('circle', { cx: x, cy: y, r: s.state === 'active' ? 15 : 11, fill: col, 'fill-opacity': s.state === 'idle' ? 0.35 : 0.95, stroke: s.alert ? '#ee6a55' : '#05090a', 'stroke-width': 2 })); g.appendChild(mk('text', { x, y: y + 24, 'text-anchor': 'middle', fill: '#e8f0ec', 'font-size': 8, 'font-family': 'ui-monospace,monospace' }, a.name)); g.addEventListener('click', () => go('chamber', { agent: a.slug })); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('chamber', { agent: a.slug }); } }); svg.appendChild(g); });
    svg.appendChild(mk('text', { x: 300, y: 296, 'text-anchor': 'middle', fill: '#e8f0ec', 'font-size': 12, 'font-family': 'Georgia,serif' }, 'NASHA')); svg.appendChild(mk('text', { x: 300, y: 312, 'text-anchor': 'middle', fill: '#a3b8ae', 'font-size': 8, 'font-family': 'ui-monospace,monospace' }, A.st.mission.status.toUpperCase()));
    pl.appendChild(svg);
  }

  /* ---------------- 3D ---------------- */
  function camEye(c) { return [c.target[0] + c.dist * Math.sin(c.yaw) * Math.cos(c.pitch), c.target[1] + c.dist * Math.sin(c.pitch), c.target[2] + c.dist * Math.cos(c.yaw) * Math.cos(c.pitch)]; }
  function flyTo(room, done) {
    if (!A.gl) { done && done(); return; } const pre = room === 'chamber' ? SC.agentPreset(A.data.agents.findIndex(a => a.slug === A.agent)) : SC.PRESETS[room], to = Object.assign({}, pre, { target: pre.target.slice() }); A.lastRoom3D = room;
    { const cv = $('#gl'), asp = cv && cv.clientHeight ? cv.clientWidth / cv.clientHeight : 1.6; if (asp < 1.1) to.dist = Math.min(70, to.dist * Math.min(1.9, 1.15 / asp)); }   // a narrow (portrait) stage frames wider so nothing is clipped at the sides
    if (A.calm) { A.cam = to; A.camAnim = null; A.dirty = true; done && done(); return; }
    let dy = to.yaw - A.cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); A.camAnim = { from: JSON.parse(JSON.stringify(A.cam)), to, dy, t0: performance.now(), dur: 1100, done };
  }
  function stepCam(now) {
    const a = A.camAnim; document.getElementById('skip-intro').hidden = !a || A.calm; if (!a) return; const k = Math.min(1, (now - a.t0) / a.dur), e = SC.ease(k), l = (x, y) => x + (y - x) * e;
    A.cam = { target: a.from.target.map((v, i) => l(v, a.to.target[i])), yaw: a.from.yaw + a.dy * e, pitch: l(a.from.pitch, a.to.pitch), dist: l(a.from.dist, a.to.dist) }; A.dirty = true; if (k >= 1) { A.camAnim = null; a.done && a.done(); }
  }
  function startGL() {
    const cv = $('#gl'); let g = null; try { g = window.HQGL.create(cv, { preserve: new URLSearchParams(location.search).has('preserve') }); } catch (e) { g = null; }
    if (!g) { $('#gl-msg').hidden = false; $('#gl-msg').textContent = 'WebGL is not available in this browser, so the 2D plan is shown. Everything else works the same.'; setView2d(true); $('#t-2d').disabled = true; return; }
    A.gl = g; A.layout = SC.buildStatic(A.data.agents, A.data); A.picks = SC.pickTargets(A.layout); A.cam = JSON.parse(JSON.stringify(SC.PRESETS.atrium));
    const first = !safe.get('hq-intro'); if (!A.calm) { A.cam = JSON.parse(JSON.stringify(SC.INTRO)); $('#skip-intro').hidden = false; A.introT = performance.now(); A.camAnim = { from: JSON.parse(JSON.stringify(SC.INTRO)), to: JSON.parse(JSON.stringify(SC.PRESETS.atrium)), dy: Math.atan2(Math.sin(SC.PRESETS.atrium.yaw - SC.INTRO.yaw), Math.cos(SC.PRESETS.atrium.yaw - SC.INTRO.yaw)), t0: performance.now(), dur: first ? 3600 : 1400, done: () => { $('#skip-intro').hidden = true; safe.set('hq-intro', '1'); } }; }
    buildLabels(); requestAnimationFrame(frame);
  }
  function buildLabels() {
    const box = $('#labels'); box.replaceChildren(); A.labels = [];
    const mk = (id, text, kind, onclick) => { const b = h('span', { class: 'lbl', ...(kind === 'room' ? { 'data-room': '1' } : {}), onclick }, text); box.appendChild(b); A.labels.push({ id, el: b, kind }); };
    [['atrium', 'ARRIVAL ATRIUM', [0, 8, 0]], ['control', 'MISSION CONTROL', [-34, 7.2, 0]], ['lab', 'RESEARCH LAB', [34, 6, 0]], ['weir', 'THE WEIR', [0, 11, -34]], ['twin', 'DIGITAL TWIN', [0, 6.2, 34]], ['chamber', 'CHAMBER · VERITAS', [0, 12.5, 66]]].forEach(([r, t, p]) => { mk('room:' + r, t, 'room', () => go(r, {})); A.labels[A.labels.length - 1].pos = p; });
    A.layout.worlds.forEach(w => { mk('world:' + w.slug, w.slug.toUpperCase(), 'world', () => go('chamber', { agent: w.slug })); A.labels[A.labels.length - 1].pos = [w.c[0], 11.5, w.c[2]]; A.labels[A.labels.length - 1].slug2 = w.slug; });
    STATIONS.forEach((n, i) => { mk('station:' + i, (i + 1) + ' ' + n.toUpperCase(), 'station', () => go('lab', { station: i })); A.labels[A.labels.length - 1].pos = stationPos(i).map((v, j) => j === 1 ? 3.4 : v); A.labels[A.labels.length - 1].kind2 = 'station'; });
    A.layout.pylons.forEach(pl => { mk('agent:' + pl.slug, pl.name, 'agent', () => go('chamber', { agent: pl.slug })); A.labels[A.labels.length - 1].pos = [pl.pos[0], 5.4, pl.pos[2]]; A.labels[A.labels.length - 1].slug = pl.slug; });
  }
  let lastDraw = 0;
  function syncNodeLabels() {
    const m = A.verified && A.verified.ok ? thModel() : { nodes: [], pos: {} }, sig = m.nodes.map(n => n.id).join('|') + '|' + A.recFile, box = $('#labels');
    if (A.nodeSig === sig) return; A.nodeSig = sig; (A.nodeLabels || []).forEach(l => l.el.remove()); A.nodeLabels = [];
    m.nodes.forEach(n => { const p = m.pos[n.id], el = h('span', { class: 'lbl', 'data-node': n.id }, m.declared ? n.id.toUpperCase() : n.agent.toUpperCase()); box.appendChild(el); A.nodeLabels.push({ id: 'node:' + n.id, el, kind: 'node', node: n.id, pos: [p[0], 2.9, p[1]] }); });
  }
  function updateLabels(eye) {
    syncNodeLabels();
    const cv = $('#gl'), cs = { eye, target: A.cam.target };
    A.labels.concat(A.nodeLabels || []).forEach(l => {
      if (l.node) { const nd = thModel().nodes.find(x => x.id === l.node); if (nd) { l.el.dataset.st = nd.state; l.el.title = nd.title + ': ' + nd.state + ' (event #' + nd.seq + ')'; } }        // data first: it must be right even when the label is off-screen
      if (l.slug) { const st = A.st.agents[l.slug]; l.el.dataset.st = st.state; l.el.dataset.sel = String(A.room === 'chamber' && A.agent === l.slug); }
      if (l.id === 'room:chamber') { const w = A.layout.worlds.find(x => x.slug === A.agent); l.pos = [w.c[0], 12.8, w.c[2]]; l.el.textContent = 'CHAMBER · ' + A.agent.toUpperCase(); }
      const wr = l.kind === 'world' && (!(A.room === 'chamber' || A.room === 'network') || (A.room === 'chamber' && l.slug2 === A.agent));
      const p = A.gl.project(l.pos, cs), hideNode = (l.node && !inTheater()) || wr || (l.id === 'room:chamber' && A.room !== 'chamber') || (l.kind === 'station' && A.room !== 'lab');
      if (hideNode || !p || !(p[0] > -40 && p[0] < cv.clientWidth + 40 && p[1] > 0 && p[1] < cv.clientHeight)) { l.el.style.display = 'none'; return; }
      l.el.style.display = ''; l.el.style.left = p[0].toFixed(1) + 'px'; l.el.style.top = p[1].toFixed(1) + 'px'; l.el.style.opacity = l.kind === 'agent' && p[2] > 70 ? 0 : 1;
    });
  }
  function frame(now) {
    requestAnimationFrame(frame); if (!A.gl || A.view2d || document.hidden || A.visible === false) return;
    stepCam(now); const animating = !A.calm && !A.low, minGap = A.low ? 33 : 0; if (now - lastDraw < minGap) return;
    if (!animating && !A.dirty && !A.camAnim) return; lastDraw = now;
    A.gl.resize(A.low ? 1 : 1.5); const eye = camEye(A.cam), flags = { calm: A.calm || A.low, agent: A.agent, t0: now, theater: inTheater() && A.verified && A.verified.ok ? Object.assign({}, thModel(), { sel: A.task, agent: A.thAgent }) : null, ex: A.ex, fort: A.room === 'weir' ? A.fort : null, eye, room: A.room, twin: A.data.twin, dept: A.room === 'twin' ? A.dept : null, station: A.room === 'lab' ? (A.station || 0) : null, net: (A.room === 'network' || (A.room === 'tour' && A.tourNet)) ? netEdges() : null };
    const scene = A.layout.statics.concat(SC.buildDynamic(A.layout, A.data.agents, A.st, now, flags)); A.gl.render(scene, { eye, target: A.cam.target }, now, { particles: !A.low, calm: A.calm || A.low, lowQuality: A.low }); A.dirty = false;
    updateLabels(eye);
    if (A.gl.stats.frames % 20 === 0) perfUpdate();
  }
  function perfUpdate() {
    const g = A.gl, dl = $('#perf-dl'); if (!dl || !g) return; const w = g.stats.win, ms = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0, heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB JS heap' : 'not exposed by this browser';
    const rows = [['first frame', A.firstFrame ? Math.round(A.firstFrame) + ' ms after load' : 'n/a'], ['frame time', ms ? ms.toFixed(1) + ' ms (' + (1000 / ms).toFixed(0) + ' fps while animating)' : 'n/a (renders on demand)'], ['draw calls / triangles', g.stats.draws + ' / ' + Math.round(g.stats.tris)], ['memory', heap], ['renderer', g.info()],
      ['mode', (A.calm ? 'reduced motion' : 'full motion') + (A.low ? ', low-power' : '')], ['space changes', A.perf.transitions.slice(-3).map(t => NAMES[t.room] + ' ' + t.ms + ' ms' + (t.animated ? '' : ' (instant)')).join('; ') || 'none yet']];
    dl.replaceChildren(...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
  }
  function pick(cx, cy) {
    const cv = $('#gl'), r = cv.getBoundingClientRect(), nx = (cx - r.left) / r.width * 2 - 1, ny = 1 - (cy - r.top) / r.height * 2, e = camEye(A.cam), t = A.cam.target, V3 = window.HQGL.V;
    const f = V3.norm(V3.sub(t, e)), rt = V3.norm(V3.cross(f, [0, 1, 0])), u = V3.cross(rt, f), tn = Math.tan(0.45), asp = cv.clientWidth / cv.clientHeight, d = V3.norm([f[0] + rt[0] * nx * tn * asp + u[0] * ny * tn, f[1] + rt[1] * nx * tn * asp + u[1] * ny * tn, f[2] + rt[2] * nx * tn * asp + u[2] * ny * tn]);
    let best = null, bt = 1e9; A.picks.concat(taskPicks()).forEach(b => { let t0 = 0, t1 = 1e9; for (let a = 0; a < 3; a++) { const lo = b.c[a] - b.h[a], hi = b.c[a] + b.h[a]; if (Math.abs(d[a]) < 1e-6) { if (e[a] < lo || e[a] > hi) return; } else { let a0 = (lo - e[a]) / d[a], a1 = (hi - e[a]) / d[a]; if (a0 > a1) [a0, a1] = [a1, a0]; t0 = Math.max(t0, a0); t1 = Math.min(t1, a1); if (t0 > t1) return; } } if (t0 < bt) { bt = t0; best = b; } });
    return best;
  }
  function taskPicks() { if (!inTheater() || !A.verified || !A.verified.ok) return []; const m = thModel(); return m.nodes.map(n => ({ id: 'task:' + n.id, c: [m.pos[n.id][0], 1.6, m.pos[n.id][1]], h: [0.7, 1.0, 0.7] })); }
  function openTarget(id) { if (!id) return; const [k, v] = id.split(':'); if (k === 'task') { A.task = id.slice(5); A.dirty = true; renderLive(); say('Task selected: ' + ((thModel().nodes.find(n => n.id === A.task) || {}).title || A.task)); return; } if (k === 'agent' || k === 'world') go('chamber', { agent: v }); else if (k === 'dept') go('twin', { dept: v }); else if (k === 'station') go('lab', { station: Number(v) }); else go(v, {}); }
  function bindInput() {
    const cv = $('#gl'), ptrs = new Map(); let last = 0, down = null;
    const clamp = () => { A.cam.pitch = Math.max(0.1, Math.min(1.4, A.cam.pitch)); A.cam.dist = Math.max(8, Math.min(70, A.cam.dist)); A.dirty = true; };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, e); down = { x: e.clientX, y: e.clientY, moved: false }; A.camAnim = null; });
    cv.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId); ptrs.set(e.pointerId, e); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], dd = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (last) A.cam.dist *= last / dd; last = dd; clamp(); return; } A.cam.yaw -= (e.clientX - p.clientX) * 0.008; A.cam.pitch += (e.clientY - p.clientY) * 0.006; clamp(); if (down) down.moved = down.moved || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5; });
    const up = e => { ptrs.delete(e.pointerId); last = 0; if (down && !down.moved && e.type === 'pointerup') openTarget((pick(e.clientX, e.clientY) || {}).id); down = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); A.cam.dist *= e.deltaY > 0 ? 1.08 : 0.92; clamp(); }, { passive: false });
    cv.addEventListener('keydown', e => { const m = { ArrowLeft: () => A.cam.yaw += 0.12, ArrowRight: () => A.cam.yaw -= 0.12, ArrowUp: () => A.cam.pitch += 0.06, ArrowDown: () => A.cam.pitch -= 0.06, '+': () => A.cam.dist *= 0.9, '=': () => A.cam.dist *= 0.9, '-': () => A.cam.dist *= 1.1, Home: resetCam, Escape: resetCam, Enter: () => { const t = A.sel; openTarget(t || 'room:' + (A.room === 'network' ? 'atrium' : A.room)); } }[e.key]; const rooms = KEYS; if (rooms[e.key]) { e.preventDefault(); go(rooms[e.key]); return; } if (m) { e.preventDefault(); A.camAnim = null; m(); clamp(); } });
  }
  function resetCam() { A.camAnim = null; flyTo(ROOM3D[A.room] || A.room); }
  function setView2d(on) { A.view2d = on; $('#plan').hidden = !on; $('#gl').hidden = on; $('#labels').hidden = on; $('#t-2d').setAttribute('aria-pressed', String(on)); $('#t-2d').textContent = on ? '3D view' : '2D plan view'; if (on) renderPlan(); A.dirty = true; }
  function updateStatus() { const n = A.data.missions.reduce((a, m) => a + m.recordings.length, 0); $('#status-text').textContent = n + ' recordings · ' + (A.verified ? (A.verified.ok ? 'chain verified (' + A.verified.n + ' events)' : 'integrity check FAILED') : 'no recording open') + ' · mode: recorded, not live'; }

  async function boot() {
    try {
      const [data, cc, p7, p7b, pe, p8, pk, tests, steps, rel, vault] = await Promise.all([jget('hq-data.json'), jopt('../research/claimcheck-eval.json'), jopt('../research/model-eval-phase7.json'), jopt('../research/model-eval-phase7-promptB.json'), jopt('../research/model-plan-eval.json'), jopt('../research/claimcheck-p8.json'), jopt('../research/independent-package.json'), jopt('../evidence/test-results.json'), jopt('../recruiter/steps.json'), jopt('../research/reliability-index.json'), jopt('../research/evidence-index.json')]);
      A.data = data; A.r = { cc, p7, p7b, pe, p8, pk, tests, steps, rel, vault };
    } catch (e) { $('#panel').textContent = 'The headquarters data could not be loaded: ' + e.message; return; }
    $('#nav').replaceChildren(...ORDER.map((r, i) => h('button', { type: 'button', 'data-room': r, 'aria-keyshortcuts': String(i + 1), onclick: () => go(r) }, (i + 1) + ' ' + NAMES[r])));
    $('#t-anim').addEventListener('click', () => { A.calm = !A.calm; if(window.NashaCharacters) window.NashaCharacters.setPaused(A.calm); $('#t-anim').setAttribute('aria-pressed', String(!A.calm)); $('#t-anim').textContent = 'Animations: ' + (A.calm ? 'off' : 'on'); A.dirty = true; if (A.calm) { A.camAnim = null; $('#skip-intro').hidden = true; } perfUpdate(); });
    $('#t-low').addEventListener('click', () => { A.low = !A.low; $('#t-low').setAttribute('aria-pressed', String(A.low)); $('#t-low').textContent = 'Low-power: ' + (A.low ? 'on' : 'off'); A.dirty = true; perfUpdate(); });
    $('#t-2d').addEventListener('click', () => setView2d(!A.view2d)); $('#cam-reset').addEventListener('click', resetCam); $('#b-home').addEventListener('click', () => go('atrium'));
    $('#skip-intro').addEventListener('click', () => { if (A.camAnim) { A.cam = A.camAnim.to; const d = A.camAnim.done; A.camAnim = null; d && d(); A.dirty = true; } });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { if(e.matches){A.calm=true; A.camAnim=null; A.dirty=true; $('#t-anim').setAttribute('aria-pressed','false'); $('#t-anim').textContent='Animations: off'; if(window.NashaCharacters) window.NashaCharacters.setPaused(true);} });
    $('#t-anim').setAttribute('aria-pressed', String(!A.calm)); $('#t-anim').textContent = 'Animations: ' + (A.calm ? 'off' : 'on'); $('#t-low').setAttribute('aria-pressed', String(A.low)); $('#t-low').textContent = 'Low-power: ' + (A.low ? 'on' : 'off');
    startGL(); bindInput(); window.addEventListener('keydown', e => { if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; const rooms = KEYS; if (rooms[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey && e.target !== $('#gl')) go(rooms[e.key]); });
    window.addEventListener('resize', () => { A.dirty = true; });
    const hp = (location.hash || '').slice(1).split('/'), start = hp[0]; if (A.data.agents.some(a => a.slug === hp[1])) A.agent = hp[1]; if (start === 'twin' && A.data.twin.departments.some(d => d.id === hp[1])) A.dept = hp[1];
    go(ORDER.includes(start) ? start : 'atrium', { noFocus: true, noPush: true }); updateStatus();
    window.addEventListener('popstate', ev => { const st = ev.state || {}, q = (location.hash || '').slice(1).split('/'), room = st.room || q[0]; if (ORDER.includes(room)) go(room, { noFocus: true, noPush: true, agent: st.agent || (A.data.agents.some(a => a.slug === q[1]) ? q[1] : null), dept: st.dept || (room === 'twin' ? q[1] : null) }); });
    requestAnimationFrame(() => { A.firstFrame = performance.now() - T0; perfUpdate(); });
    if ('IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => { A.visible = entries[0].isIntersecting; if(A.visible) A.dirty = true; }); observer.observe($('#gl')); }
    window.HQApp = { A, go, loadRec, step, play, stop, restart, seek, setView2d, resetCam, pick, camEye, ready: true, get frames() { return A.gl ? A.gl.stats.frames : 0; } };
  }
  boot();
})();
