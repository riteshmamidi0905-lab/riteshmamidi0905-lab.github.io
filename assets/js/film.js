/* film.js — the portfolio launch film, as a deterministic director page (?capture=film).
   Every frame is a pure function of time: window.__film.seek(t) must be called with non-decreasing t
   (the streaming scene advances a seeded simulation). A driver (scripts/render-film.js) seeks, screenshots
   and hands the frames to ffmpeg. Scenes are the site's own canvas worlds and lab demos, so nothing in the
   film is a mock-up; illustrative scenes carry the same labels they carry on the page. */
(async () => {
  'use strict';
  while (!(window.__rm && window.RMLab && window.RMLab.agentCore)) await new Promise((r) => setTimeout(r, 30));
  const RM = window.__rm, L0 = window.RMLab, W = innerWidth, H = innerHeight, DPR = devicePixelRatio || 1, FADE = 0.3;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (t) => t * t * (3 - 2 * t);
  const manifest = await fetch('assets/avatar/manifest.json').then((r) => r.json()).catch(() => null);
  const imgFor = (p) => { const m = manifest && manifest.personas[p], f = manifest && manifest.fallback; return (m && m.file) || (f && (f.file2x || f.file)) || 'assets/avatar/ritesh-cutout-1020.webp'; };
  const rimFor = (p) => (manifest && manifest.personas[p] && manifest.personas[p].rim) || '#22d3a6';
  const labelFor = (p) => (manifest && manifest.personas[p] && manifest.personas[p].label) || 'RITESH';
  const el = (cls, html, tag = 'div') => { const e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const stage = el('', null); stage.id = 'film-stage'; document.body.append(stage);
  await Promise.all(['assets/avatar/ritesh-cutout-1020.webp'].map((s) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = s; })));
  if (document.fonts) await document.fonts.ready;

  /* ---------- script ---------- */
  const SEGS = [
    { id: 'hero', d: 3.4, kind: 'hero', persona: 'hero', caps: [[0.7, 'Hi, I’m Ritesh. Let me show you how I build reliable AI.']] },
    { id: 'agents', d: 6.4, kind: 'world', scene: 'agents', persona: 'ai', kick: '01 / AI AGENTS', title: 'From task to evaluated action.', s: [0, 6], note: 'Real ReAct loop · runs in the portfolio lab · no model calls',
      caps: [[0, 'A task comes in. The planner picks a tool.'], [2.1, 'Each observation feeds the next step.'], [4.2, 'Deterministic checks verify the trace before the answer.']] },
    { id: 'data', d: 5.6, kind: 'world', scene: 'data', persona: 'data', kick: '02 / DATA ENGINEERING', title: 'Signals become systems.', s: [0, 4], note: 'Synthetic events · simulated in the browser',
      caps: [[0, 'Synthetic events stream through the pipeline.'], [1.9, 'Rules flag fraud. A watermark drops very late events.'], [3.8, 'Same logic as my Kafka, Spark and Cassandra project.']] },
    { id: 'maref', d: 5.6, kind: 'world', scene: 'maref', persona: 'research', kick: '03 / MAREF · RESEARCH PROTOTYPE', title: 'Reliability needs more than one score.', s: [0, 7], note: 'Explanatory visualization · not experimental results',
      caps: [[0, 'MAREF: six reliability dimensions, not one score.'], [1.9, 'Accuracy, grounding, hallucination, instructions, consistency, completion.'], [3.9, 'In development: no results are claimed.']] },
    { id: 'rag', d: 4.6, kind: 'lab', lab: 'rag', persona: 'ai', note: 'Fixed sample corpus · real retrieval · no language model',
      caps: [[0, 'RAG: real retrieval over a sample corpus.'], [2.4, 'Chunks, scores and citations are all inspectable.']] },
    { id: 'exp', d: 3.6, kind: 'lab', lab: 'experiment', persona: 'product', note: 'Real statistics · computed from the inputs shown',
      caps: [[0, 'Experimentation: real statistics decide ship or keep running.']] },
    { id: 'product', d: 3.6, kind: 'world', scene: 'product', persona: 'product', kick: '04 / PRODUCT ANALYTICS', title: 'Behavior becomes a decision.', s: [0, 4], note: 'Illustrative · adjustable assumptions, not measured data',
      caps: [[0, 'Funnels, retention and experiments.'], [1.9, 'Every rate is an assumption you can change.']] },
    { id: 'flags', d: 5.4, kind: 'flags' },
    { id: 'contact', d: 4.4, kind: 'contact', persona: 'contact', caps: [[0.8, 'Let’s talk.']] },
  ];
  let t0 = 0; SEGS.forEach((s, i) => { s.t0 = t0; t0 += s.d - FADE; }); const DURATION = SEGS[SEGS.length - 1].t0 + SEGS[SEGS.length - 1].d;
  const flags = [...document.querySelectorAll('.flagw')].map((a) => ({ name: a.querySelector('h3').textContent, one: a.querySelector('.one').textContent, persona: (a.querySelector('.ex') || { dataset: {} }).dataset.persona || 'builder', tech: a.querySelector('.fstack').textContent.replace(/\s{2,}·?\s*/g, ' · ').trim() }));
  const flagCaps = flags.map((f, i) => [i * 0.9, f.name]);

  /* ---------- build segments ---------- */
  function mkCanvas(seg) { const c = document.createElement('canvas'); c.width = W * DPR; c.height = H * DPR; const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); seg.canvas = c; seg.ctx = x; seg.root.append(c); }
  function mkAvatar(seg, h) {
    const rim = rimFor(seg.persona), f = document.createElement('figure'); f.className = 'f-av'; f.style.setProperty('--rim', rim); f.style.height = (h || 46) + '%'; f.innerHTML = `<img src="${imgFor(seg.persona)}" alt="">`; seg.root.append(f); seg.avEl = f;
    const ar = 510 / 694, ah = H * (h || 46) / 100, aw = ah * ar; seg.av = { x: W - aw + 6, y: H - ah, w: aw, h: ah, cx: W - aw / 2 + 6 };
  }
  function mkCap(seg) { const c = el('f-cap', `<div class="f-who"></div><div class="f-text"></div>`); c.style.setProperty('--rim', rimFor(seg.persona)); c.querySelector('.f-who').textContent = labelFor(seg.persona) + ' says'; seg.root.append(c); seg.capEl = c; }
  SEGS.forEach((seg, i) => {
    seg.root = el('fseg'); stage.append(seg.root);
    seg.parts = Array.from({ length: 64 }, ((r) => () => ({ x: r(), y: r(), z: 0.2 + r() * 0.8, p: r() * 6.28 }))(RM.rand(30 + i)));
    seg.state = {}; seg.simT = 0; seg.primed = false;
    if (seg.kind === 'world') {
      mkCanvas(seg); seg.root.append(el('f-vig')); seg.root.append(el('f-kick', esc(seg.kick))); seg.root.append(el('f-title', esc(seg.title))); mkAvatar(seg, 44); mkCap(seg);
      seg.root.append(el('f-note', esc(seg.note))); const sc = RM.SCENES[seg.scene]; seg.sc = sc; sc.init({ state: seg.state });
      seg.L = { W, H, mobile: true, film: true, low: false, av: seg.av, band: { y0: H * 0.3, y1: H * 0.55 } };
    } else if (seg.kind === 'hero') {
      mkCanvas(seg); seg.root.append(el('f-vig')); seg.root.append(el('f-kick', 'RITESH MAMIDI')); seg.root.append(el('f-big', 'Reliable AI.<br>Useful data.<em>Better decisions.</em>')); seg.root.append(el('f-sub', 'AI/ML · DATA ENGINEERING<br>PRODUCT ANALYTICS')); mkAvatar(seg, 52); mkCap(seg);
      seg.sc = RM.SCENES.hero; seg.sc.init({ state: seg.state }); seg.L = { W, H, mobile: true, low: false, av: seg.av, band: { y0: H * 0.2, y1: H * 0.4 } };
    } else if (seg.kind === 'contact') {
      mkCanvas(seg); seg.root.append(el('f-vig')); seg.root.append(el('f-kick', 'CONTACT')); seg.root.append(el('f-big', 'LET’S BUILD<em>SOMETHING RELIABLE.</em>')); seg.root.append(el('f-sub', 'riteshmamidi0905-lab.github.io<br>LinkedIn · GitHub · Résumé')); mkAvatar(seg, 50); mkCap(seg);
      seg.sc = RM.SCENES.contact; seg.sc.init({ state: seg.state }); seg.L = { W, H, mobile: true, low: false, av: seg.av, band: { y0: H * 0.2, y1: H * 0.4 } };
      seg.root.querySelector('.f-sub').style.top = '372px';
    } else if (seg.kind === 'flags') {
      mkCanvas(seg); seg.root.append(el('f-vig')); seg.kickEl = el('f-kick', ''); seg.titleEl = el('f-title', ''); seg.titleEl.style.cssText += ';font-size:44px;top:70px'; seg.subEl = el('f-sub', ''); seg.subEl.style.cssText += ';top:250px;font-size:17px;right:28px;font-family:Inter,system-ui,sans-serif;letter-spacing:0;color:#d6dbe3;line-height:1.45;font-weight:500'; seg.techEl = el('f-sub', ''); seg.techEl.style.cssText += ';top:340px;color:#79edc5;font-size:12.5px;right:28px';
      seg.root.append(seg.kickEl, seg.titleEl, seg.subEl, seg.techEl); seg.persona = 'builder'; mkAvatar(seg, 46); seg.root.append(el('f-note', 'Six open-source builds · code, tests and limitations on GitHub'));
      seg.sc = RM.SCENES.hero; seg.sc.init({ state: seg.state }); seg.L = { W, H, mobile: true, low: false, av: seg.av, band: { y0: H * 0.2, y1: H * 0.4 } };
    } else if (seg.kind === 'lab') {
      seg.root.classList.add('lab'); seg.panel = document.querySelector('#lab-' + seg.lab); seg.panel.hidden = false; seg.root.append(seg.panel); seg.panel.classList.add('rm-cap-keep'); mkCap(seg); seg.root.append(el('f-note', esc(seg.note)));
      const vg = el('f-vig'); vg.style.background = 'linear-gradient(to top,#05070a 0,rgba(5,7,10,.92) 24%,transparent 42%)'; seg.root.append(vg); seg.capEl.style.bottom = '40px'; seg.root.append(seg.capEl);
    }
  });
  /* lab segments need the demo code mounted */
  while (!(L0.mountLab)) await new Promise((r) => setTimeout(r, 30));
  L0.mountLab(); await new Promise((r) => setTimeout(r, 200));
  const rag = SEGS.find((s) => s.id === 'rag'), exp = SEGS.find((s) => s.id === 'exp');
  const ragIn = rag.panel.querySelector('#rag-q'); ragIn.closest('.lab-row').classList.add('keep'); ragIn.style.fontSize = '17px';
  const kS = rag.panel.querySelector('input[type=range]'); kS.value = 2; kS.dispatchEvent(new Event('input'));
  const expIn = [...exp.panel.querySelectorAll('input[type=number]')]; const varConv = expIn[3]; varConv.closest('.lab-row').classList.add('keep');
  const setVal = (inp, v) => { if (inp.value !== String(v)) { inp.value = v; inp.dispatchEvent(new Event('input')); } };
  const QUESTION = 'How much does the Pro tier cost?';

  /* ---------- per-frame ---------- */
  function capAt(seg, lt) { if (!seg.caps || !seg.capEl) return; let cur = null; seg.caps.forEach((c) => { if (lt >= c[0]) cur = c; }); const e = seg.capEl; if (!cur) { e.style.opacity = 0; return; } const age = lt - cur[0]; e.style.opacity = clamp(age / 0.25); e.querySelector('.f-text').textContent = cur[1]; e.style.transform = `translateY(${(1 - ease(clamp(age / 0.3))) * 10}px)`; }
  function drawSeg(seg, lt) {
    if (seg.kind === 'lab') {
      if (seg.id === 'rag') setVal(ragIn, QUESTION.slice(0, Math.max(0, Math.min(QUESTION.length, Math.floor((lt - 0.5) * 24)))) || '');
      if (seg.id === 'exp') setVal(varConv, Math.round(500 + 100 * ease(clamp((lt - 0.4) / 2.2))));
      capAt(seg, lt); return;
    }
    const c = seg.ctx, L = seg.L, tt = lt + seg.t0 * 0.37;
    let s = 0;
    if (seg.kind === 'world') s = seg.s[0] + (seg.s[1] - seg.s[0]) * clamp(lt / (seg.d - 0.7));
    if (seg.scene === 'data') {
      if (!seg.primed) { for (let i = 0; i < 70; i++) seg.sc.advance({ state: seg.state }, 0.1); seg.primed = true; seg.simT = lt; }
      let dt = lt - seg.simT; while (dt > 1e-6) { const d = Math.min(0.05, dt); seg.sc.advance({ state: seg.state }, d); dt -= d; } seg.simT = lt;
    }
    if (seg.kind === 'hero') seg.state.pointer = { x: 0.62 + 0.04 * Math.sin(lt), y: 0.4 };
    c.save(); RM.backdrop(c, L, tt, s, seg.sc.tint || RM.HEX.ac, seg.parts); if (seg.kind !== 'flags') seg.sc.draw(c, L, tt, s, seg.state); c.restore();
    if (seg.kind === 'flags') { const i = Math.min(flags.length - 1, Math.floor(lt / 0.9)), f = flags[i]; seg.kickEl.textContent = `FLAGSHIP ${String(i + 1).padStart(2, '0')} / 06`; seg.titleEl.textContent = f.name; seg.subEl.textContent = f.one; seg.techEl.textContent = f.tech; const rim = rimFor(f.persona); seg.avEl.style.setProperty('--rim', rim); seg.avEl.style.opacity = 1; const k = (lt / 0.9) % 1; seg.titleEl.style.opacity = clamp(k / 0.12); seg.subEl.style.opacity = clamp(k / 0.2); seg.techEl.style.opacity = clamp(k / 0.25); }
    capAt(seg, lt);
  }
  function seek(t) {
    SEGS.forEach((seg) => {
      const lt = t - seg.t0, on = lt > -0.001 && lt < seg.d + 0.001;
      if (!on) { seg.root.style.opacity = 0; return; }
      const FIO = 0.15, op = Math.min(clamp(lt / FIO), clamp((seg.d - lt) / FIO)); seg.root.style.opacity = seg.id === 'hero' ? clamp((seg.d - lt) / FIO) : op;
      drawSeg(seg, clamp(lt, 0, seg.d));
    });
    return true;
  }
  /* caption timeline for sidecar subtitle files */
  const cues = []; SEGS.forEach((seg) => { const list = seg.kind === 'flags' ? flagCaps : seg.caps; if (!list) return; list.forEach((c, i) => { const end = list[i + 1] ? list[i + 1][0] : seg.d - 0.15; cues.push({ start: seg.t0 + c[0], end: seg.t0 + end, text: c[1] }); }); });
  window.__film = { duration: DURATION, fps: 30, seek, cues, size: [W, H], segments: SEGS.map((s) => ({ id: s.id, t0: s.t0, d: s.d })) };
  seek(0); document.documentElement.dataset.filmReady = '1';
})();
