/* worlds.js — scroll-scrubbed cinematic scenes (agents · data · MAREF · product · hero · contact).
   Each scene is a pure function of (time, step) drawn on one canvas, so it is also fully deterministic
   for capture mode (?capture=…). Only the scene on screen renders; all others are stopped.
   Scene content is data (content/worlds.json). Illustrative visuals are labelled as such on the page;
   the agents scene runs the real agent-core loop and the data scene runs the real stream-core simulation. */
(() => {
  'use strict';
  const RM = (window.RMLab = window.RMLab || {});
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  const capture = params.get('capture');
  const mobileMQ = matchMedia('(max-width: 760px)');
  const lowPower = () => mobileMQ.matches || (navigator.hardwareConcurrency || 8) <= 4;
  const STATIC = () => reduceMQ.matches || !!capture;           // no scroll-pinning, no continuous loop
  const TAU = Math.PI * 2, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => t * t * (3 - 2 * t);
  const HEX = { ac: '#22d3a6', ac2: '#79edc5', blue: '#6aa7ff', amber: '#f5b94a', red: '#ff6b6b', violet: '#9b8cff', tx: '#f3f5f7', mut: '#9aa1ad' };
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const FONT = '"JetBrains Mono",ui-monospace,Menlo,monospace', SANS = 'Inter,system-ui,sans-serif';
  const rand = (seed) => { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---------- drawing helpers ---------- */
  function glow(c, x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function text(c, s, x, y, o) { o = o || {}; c.font = `${o.w || 500} ${o.size || 12}px ${o.sans ? SANS : FONT}`; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic'; c.fillStyle = o.col || HEX.tx; if (o.ls) c.letterSpacing = o.ls + 'px'; c.fillText(s, x, y); if (o.ls) c.letterSpacing = '0px'; }
  function card(c, x, y, w, lines, col, a) {
    const h = 20 + lines.length * 17; x = clamp(x, 10, c.canvas.clientWidth - w - 10);
    c.save(); c.globalAlpha = a; rrect(c, x, y, w, h, 10); c.fillStyle = 'rgba(8,12,14,.86)'; c.fill(); c.strokeStyle = rgba(col, .6); c.lineWidth = 1; c.stroke();
    lines.forEach((l, i) => text(c, l, x + 12, y + 22 + i * 17, { size: i ? 11 : 10, col: i ? HEX.tx : col, w: i ? 500 : 600, ls: i ? 0 : 1.2 }));
    c.restore();
  }
  function backdrop(c, L, t, s, tint, seedParts) {
    const { W, H } = L;
    c.fillStyle = '#05070a'; c.fillRect(0, 0, W, H);
    glow(c, L.av.cx, L.av.y + L.av.h * 0.35, L.av.h * 0.95, tint, 0.17);
    glow(c, W * 0.2, H * 0.1, Math.max(W, H) * 0.5, tint, 0.05);
    // perspective floor
    const hy = H * 0.6, vx = W * 0.5, off = ((t * 0.12 + s * 0.35) % 1);
    c.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const f = (i + off) / 12, y = hy + (H - hy) * f * f * f; c.strokeStyle = rgba(tint, 0.05 + 0.1 * f); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let k = -12; k <= 12; k++) { c.strokeStyle = rgba(tint, 0.06); c.beginPath(); c.moveTo(vx + k * 22, hy); c.lineTo(vx + k * W * 0.13, H); c.stroke(); }
    // drifting depth particles
    const n = L.low ? 26 : 60;
    for (let i = 0; i < n; i++) { const r = seedParts[i], z = r.z; const x = ((r.x * W + t * 6 * z + s * 40 * z) % (W + 20) + W + 20) % (W + 20) - 10, y = (r.y * H + Math.sin(t * 0.3 + r.p) * 6 * z) % H; c.fillStyle = rgba(i % 9 === 0 ? HEX.tx : tint, 0.12 + 0.4 * z); c.fillRect(x, y, 0.8 + 1.8 * z, 0.8 + 1.8 * z); }
  }

  /* ---------- scene renderers: (ctx, L, t, s, state) ---------- */
  const SCENES = {};

  /* AGENTS — an arc of seven stages; a task packet travels it while the host points at the active node */
  const agentRun = () => (RM.agentCore ? RM.agentCore.run('Convert 5 km to mi then multiply by 2') : null);
  SCENES.agents = {
    tint: HEX.ac,
    init(w) {
      const run = agentRun(), h = run ? run.history : [{ input: '5 km to mi', observation: '3.107 mi' }, { input: '3.107 * 2.0', observation: '6.214' }];
      w.state.nodes = [
        ['OBJECTIVE', 'INTAKE', ['USER TASK', '“Convert 5 km to mi then multiply by 2”']],
        ['PLANNING', 'ROUTE', ['PLANNER', run ? `${run.plan.kind} → ${run.plan.tool}, then calculator ${run.plan.op} ${run.plan.operand}` : 'compose → unit_convert, then calculator * 2']],
        ['TOOLS', 'SELECT', ['TOOL CHOICE', `unit_convert('${h[0].input}')`]],
        ['RETRIEVAL', 'CONTEXT', ['KNOWLEDGE BASE', 'keyword overlap ≥ 2, else “unknown”']],
        ['EXECUTION', 'OBSERVE', ['OBSERVATION', `${h[0].observation} → calculator('${h[1] ? h[1].input : '3.107 * 2.0'}')`]],
        ['EVALUATION', 'CHECK', ['DETERMINISTIC CHECKS', 'finished ✓  no tool error ✓  re-derived ✓']],
        ['RESULT', 'ANSWER', ['ANSWER', run ? run.answer : '6.214']],
      ];
    },
    draw(c, L, t, s, st) {
      const { W, H } = L, N = st.nodes.length, cx = L.mobile ? W / 2 : W * 0.42, cy = L.film ? H * 0.5 : L.mobile ? H * 0.38 : H * 0.56, rx = W * (L.film ? 0.4 : L.mobile ? 0.4 : 0.36), ry = L.film ? H * 0.24 : L.mobile ? H * 0.17 : H * 0.36;
      const pos = (u) => { const a = Math.PI * (0.94 - 0.88 * u); return [cx + rx * Math.cos(a), cy - ry * Math.sin(a)]; };
      // track
      c.lineWidth = 1.2; c.strokeStyle = rgba(HEX.ac, 0.16); c.beginPath(); for (let i = 0; i <= 80; i++) { const p = pos(i / 80); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
      const head = clamp(s / (N - 1));
      c.lineWidth = 2.4; c.strokeStyle = rgba(HEX.ac2, 0.85); c.shadowColor = HEX.ac; c.shadowBlur = 14; c.beginPath(); for (let i = 0; i <= 80; i++) { const u = (i / 80) * head, p = pos(u); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); c.shadowBlur = 0;
      // packet + trail
      for (let k = 0; k < 14; k++) { const u = clamp(head - k * 0.006), p = pos(u); glow(c, p[0], p[1], 14 - k, HEX.ac2, 0.5 * (1 - k / 14)); }
      const pk = pos(head); c.fillStyle = '#eafff7'; c.beginPath(); c.arc(pk[0], pk[1], 4.5, 0, TAU); c.fill();
      // nodes
      st.nodes.forEach((n, i) => {
        const p = pos(i / (N - 1)), d = Math.abs(s - i), act = clamp(1 - d), past = s >= i - 0.01;
        glow(c, p[0], p[1], 34 + 22 * act, HEX.ac, 0.05 + 0.3 * act);
        c.lineWidth = 1.4; c.strokeStyle = past ? HEX.ac2 : rgba(HEX.tx, 0.3); c.fillStyle = '#05070a'; c.beginPath(); c.arc(p[0], p[1], 9 + 5 * act, 0, TAU); c.fill(); c.stroke();
        if (past) { c.fillStyle = HEX.ac2; c.beginPath(); c.arc(p[0], p[1], 3 + 2 * act, 0, TAU); c.fill(); }
        if (act > 0.5) { c.strokeStyle = rgba(HEX.ac2, 0.5 * (1 - ((t * 0.8) % 1))); c.beginPath(); c.arc(p[0], p[1], 14 + ((t * 0.8) % 1) * 26, 0, TAU); c.stroke(); }
        const lab = L.mobile ? 9 : 11;
        text(c, n[0], p[0], p[1] - 20 - 4 * act, { size: lab + act, align: 'center', col: past ? HEX.tx : HEX.mut, w: 600, ls: 1.4 });
        if (!L.mobile) text(c, n[1], p[0], p[1] + 28, { size: 9.5, align: 'center', col: rgba(HEX.mut, 0.85), ls: 1.6 });
      });
      // host attention beam: avatar → active node
      const ai = clamp(Math.round(s), 0, N - 1), tp = pos(ai / (N - 1)), sx = L.av.x + L.av.w * 0.52, sy = L.av.y + L.av.h * 0.1;
      if (L.av.w) { c.save(); c.setLineDash([2, 7]); c.lineDashOffset = -t * 18; c.strokeStyle = rgba(HEX.ac2, 0.5); c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + tp[0]) / 2, Math.min(sy, tp[1]) - 30, tp[0], tp[1] + 12); c.stroke(); c.restore(); }
      const a = clamp(1 - Math.abs(s - ai) * 2.2);
      if (!L.mobile) card(c, tp[0] - 150, tp[1] + 42, 300, st.nodes[ai][2], HEX.ac2, a);
    },
  };

  /* DATA — five stages; events come from the real seeded stream simulation */
  SCENES.data = {
    tint: HEX.blue,
    init(w) {
      const st = w.state; st.parts = new Map(); st.simNow = 0;
      st.sim = RM.streamCore.createPipeline({ seed: 21, rate: 22, capacity: 30, lateShare: 0.07,
        onProduce: (e) => { if (st.parts.size < 220) st.parts.set(e.txn_id, { e, state: 'toKafka', t0: st.simNow, jy: Math.random() * 2 - 1, x: 0 }); },
        onProcess: (e) => { const p = st.parts.get(e.txn_id); if (p) { p.state = e.stage === 'dropped' ? 'dropped' : 'proc'; p.t0 = st.simNow; } } });
    },
    advance(w, dt) { const st = w.state; st.sim.step(dt); st.simNow += dt; },
    draw(c, L, t, s, st) {
      const { W, H } = L, y0 = L.band.y0, y1 = L.band.y1, mid = (y0 + y1) / 2, X = (i) => W * (0.1 + 0.2 * i), snap = st.sim.snapshot();
      const names = ['SOURCES', 'INGEST', 'PROCESS', 'STORE', 'ANALYTICS'], subs = [`${snap.produced} events`, `lag ${snap.lag}`, `${snap.flagged} flagged`, `${snap.openWindows} open windows`, `${snap.merchants.length} merchants`];
      // rails
      for (let i = 0; i < 4; i++) { c.strokeStyle = rgba(HEX.blue, 0.2); c.lineWidth = 1; c.beginPath(); c.moveTo(X(i) + 14, mid); c.lineTo(X(i + 1) - 14, mid); c.stroke(); }
      // stage gates
      for (let i = 0; i < 5; i++) {
        const act = clamp(1 - Math.abs(s - i)), x = X(i), gw = L.mobile ? 34 : 64, gh = y1 - y0;
        glow(c, x, mid, 90 + 60 * act, HEX.blue, 0.05 + 0.22 * act);
        rrect(c, x - gw / 2, y0, gw, gh, 12); c.fillStyle = `rgba(106,167,255,${0.05 + 0.1 * act})`; c.fill(); c.strokeStyle = rgba(act > 0.4 ? HEX.ac2 : HEX.blue, 0.35 + 0.55 * act); c.lineWidth = 1.2; c.stroke();
        text(c, names[i], x, y0 - 14, { size: L.mobile ? 8.5 : 11, align: 'center', w: 600, col: act > 0.4 ? HEX.ac2 : HEX.mut, ls: 1.5 });
        text(c, subs[i], x, y1 + 20, { size: L.mobile ? 8.5 : 10.5, align: 'center', col: rgba(act > 0.4 ? HEX.tx : HEX.mut, 0.95) });
      }
      // watermark / store detail
      const sx = X(3); const wm = clamp(snap.watermarkLagSec / 130);
      c.strokeStyle = rgba(HEX.amber, 0.7); c.setLineDash([4, 4]); c.beginPath(); c.moveTo(sx - 38, y1 - (y1 - y0) * wm); c.lineTo(sx + 38, y1 - (y1 - y0) * wm); c.stroke(); c.setLineDash([]);
      if (!L.mobile) text(c, 'watermark', sx + 42, y1 - (y1 - y0) * wm + 4, { size: 9, col: HEX.amber });
      // analytics bars
      const ax = X(4), maxc = Math.max(1, ...snap.merchants.map((m) => m.txn_count));
      snap.merchants.slice(0, 7).forEach((m, i) => { const bh = (y1 - y0) / 8, by = y0 + 8 + i * bh * 1.07, bw = (L.mobile ? 26 : 52) * (m.txn_count / maxc); c.fillStyle = rgba(m.fraud_count ? HEX.amber : HEX.ac, 0.75); c.fillRect(ax - (L.mobile ? 13 : 26), by, Math.max(2, bw), Math.max(3, bh * 0.5)); });
      // particles
      let drawn = 0;
      st.parts.forEach((p, id) => {
        const age = st.simNow - p.t0; let x, y = mid + p.jy * (y1 - y0) * 0.32, col = HEX.ac2, a = 1;
        if (p.state === 'toKafka') { const f = clamp(age / 0.9); x = lerp(X(0), X(1) - 8, ease(f)); if (f >= 1) { p.state = 'queued'; p.t0 = st.simNow; } }
        else if (p.state === 'queued') { x = X(1) + 4 + (id.length % 3) * 3; y = mid + p.jy * (y1 - y0) * 0.4; if (age > 30) { st.parts.delete(id); return; } }
        else if (p.state === 'proc') { const f = clamp(age / 1.4); x = lerp(X(1), X(3), ease(f)); if (p.e.is_fraud) { col = HEX.amber; if (f > 0.4) y = lerp(y, y1 - 14, ease((f - 0.4) / 0.6)); } if (f >= 1) { p.state = 'out'; p.t0 = st.simNow; } }
        else if (p.state === 'out') { const f = clamp(age / 0.9); x = lerp(X(3), X(4), ease(f)); a = 1 - f; col = p.e.is_fraud ? HEX.amber : HEX.ac2; if (f >= 1) { st.parts.delete(id); return; } }
        else if (p.state === 'dropped') { const f = clamp(age / 0.8); x = X(2); y = mid + f * 60; col = HEX.red; a = 1 - f; if (f >= 1) { st.parts.delete(id); return; } }
        if (drawn++ > (L.low ? 90 : 220)) return;
        c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, y, p.e.is_fraud ? 3.4 : 2.2, 0, TAU); c.fill();
        if (p.e.is_fraud) glow(c, x, y, 9, HEX.amber, 0.5);
      });
      c.globalAlpha = 1;
      // host beam
      const ai = clamp(Math.round(s), 0, 4), ax2 = X(ai), sx2 = L.av.x + L.av.w * 0.52, sy2 = L.av.y + L.av.h * 0.1;
      if (L.av.w) { c.save(); c.setLineDash([2, 7]); c.lineDashOffset = -t * 18; c.strokeStyle = rgba(HEX.ac2, 0.45); c.beginPath(); c.moveTo(sx2, sy2); c.quadraticCurveTo((sx2 + ax2) / 2, y1 + 40, ax2, y1 + 34); c.stroke(); c.restore(); }
    },
  };

  /* MAREF — six-axis evaluation surface; no values are drawn because there are no results */
  SCENES.maref = {
    tint: HEX.violet,
    init(w) { w.state.dims = ['TASK ACCURACY', 'GROUNDEDNESS', 'HALLUCINATION RESISTANCE', 'INSTRUCTION ADHERENCE', 'CONSISTENCY', 'TASK COMPLETION']; w.state.short = ['ACCURACY', 'GROUNDING', 'HALLUC.', 'INSTRUCT.', 'CONSIST.', 'COMPLETE']; },
    draw(c, L, t, s, st) {
      const { W, H } = L, cx = L.mobile ? W * 0.5 : W * 0.5, cy = L.film ? H * 0.47 : L.mobile ? H * 0.29 : H * 0.4, R = Math.min(L.film ? W * 0.27 : L.mobile ? W * 0.25 : H * 0.265, W * 0.31);
      const vtx = (k, r) => { const a = -Math.PI / 2 + k * TAU / 6; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
      glow(c, cx, cy, R * 1.5, HEX.violet, 0.12);
      for (let ring = 1; ring <= 4; ring++) { c.strokeStyle = rgba(HEX.violet, 0.1 + 0.04 * ring); c.lineWidth = 1; c.beginPath(); for (let k = 0; k <= 6; k++) { const p = vtx(k % 6, R * ring / 4); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); }
      const active = s - 1;   // step 1..6 → dimension 0..5
      for (let k = 0; k < 6; k++) {
        const a = s >= 7 ? 1 : clamp(1 - Math.abs(active - k)), p = vtx(k, R);
        c.strokeStyle = rgba(a > 0.3 ? HEX.ac2 : HEX.violet, 0.2 + 0.7 * a); c.lineWidth = 1 + 2.2 * a; c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.stroke();
        glow(c, p[0], p[1], 26 + 24 * a, HEX.violet, 0.1 + 0.4 * a); c.fillStyle = a > 0.3 ? HEX.ac2 : '#05070a'; c.strokeStyle = rgba(HEX.ac2, 0.8); c.beginPath(); c.arc(p[0], p[1], 5 + 3 * a, 0, TAU); c.fill(); c.stroke();
        const lp = vtx(k, R + (L.mobile ? 20 : 32)), al = Math.abs(lp[0] - cx) < 4 ? 'center' : lp[0] > cx ? 'left' : 'right';
        text(c, (L.mobile ? st.short : st.dims)[k], lp[0], lp[1] + 4, { size: L.mobile ? 8.5 : 11, align: al, w: 600, ls: 1.2, col: a > 0.3 ? HEX.tx : HEX.mut });
      }
      // the agent execution trace passes through the surface
      const steps = ['task', 'retrieve', 'tool', 'answer'], tr = clamp((s + 0.3) / 7);
      c.lineWidth = 1.6; c.strokeStyle = rgba(HEX.tx, 0.5); c.beginPath();
      steps.forEach((n, i) => { const x = lerp(cx - R * 1.05, cx + R * 1.05, i / 3), y = cy + Math.sin(i * 1.7 + 0.4) * R * 0.28; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      steps.forEach((n, i) => { const x = lerp(cx - R * 1.05, cx + R * 1.05, i / 3), y = cy + Math.sin(i * 1.7 + 0.4) * R * 0.28, on = tr * 3.2 >= i; c.fillStyle = on ? HEX.tx : '#05070a'; c.strokeStyle = rgba(HEX.tx, 0.7); c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill(); c.stroke(); if (!L.mobile) text(c, n, x, y + 20, { size: 9.5, align: 'center', col: rgba(HEX.mut, 0.9) }); });
      const pt = (t * 0.35) % 1, seg = pt * 3, i0 = Math.min(2, Math.floor(seg)), f = seg - i0, P = (i) => [lerp(cx - R * 1.05, cx + R * 1.05, i / 3), cy + Math.sin(i * 1.7 + 0.4) * R * 0.28];
      const a0 = P(i0), a1 = P(i0 + 1); glow(c, lerp(a0[0], a1[0], f), lerp(a0[1], a1[1], f), 16, HEX.tx, 0.6);
      // host attention beam to the active axis
      if (L.av.w && s >= 0.5 && s < 7) { const k = clamp(Math.round(active), 0, 5), p = vtx(k, R), sx = L.av.x + L.av.w * 0.5, sy = L.av.y + L.av.h * 0.1; c.save(); c.setLineDash([2, 7]); c.lineDashOffset = -t * 18; c.strokeStyle = rgba(HEX.ac2, 0.45); c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + p[0]) / 2, Math.min(sy, p[1]) - 20, p[0], p[1]); c.stroke(); c.restore(); }
      if (s >= 6.5) { const a = clamp((s - 6.5) * 2); c.save(); c.globalAlpha = a; rrect(c, cx - 118, cy - 18, 236, 36, 10); c.fillStyle = 'rgba(8,10,16,.9)'; c.fill(); c.strokeStyle = rgba(HEX.amber, 0.8); c.stroke(); text(c, 'NO RESULTS · IN DEVELOPMENT', cx, cy + 4, { size: 10.5, align: 'center', col: HEX.amber, w: 600, ls: 1.3 }); c.restore(); }
    },
  };

  /* PRODUCT — a funnel river; widths follow adjustable (illustrative) assumptions */
  SCENES.product = {
    tint: HEX.amber,
    init(w) { const F = RM.funnelCore; w.state.f = F.run({}); w.state.ls = ['ACQUISITION', 'ACTIVATION', 'RETENTION', 'REVENUE']; },
    draw(c, L, t, s, st) {
      const { W, H } = L, y0 = L.band.y0, y1 = L.band.y1, mid = (y0 + y1) / 2, f = st.f, xs = [0.06, 0.3, 0.54, 0.78].map((v) => W * v), x1 = W * 0.96, hMax = (y1 - y0) * 0.92;
      const hs = f.counts.map((n) => Math.max(10, hMax * Math.pow(n / f.counts[0], 0.27)));
      const forkAmt = clamp(s - 2.6);   // experiment step: the river forks in two
      const edge = (u, side) => { // piecewise smooth width
        const seg = clamp(u * 3, 0, 2.999), i = Math.floor(seg), k = ease(seg - i), h = lerp(hs[i], hs[i + 1], k); return mid + side * h / 2;
      };
      c.beginPath(); for (let i = 0; i <= 60; i++) { const u = i / 60, x = lerp(xs[0], xs[3], u); i ? c.lineTo(x, edge(u, -1)) : c.moveTo(x, edge(u, -1)); }
      for (let i = 60; i >= 0; i--) { const u = i / 60; c.lineTo(lerp(xs[0], xs[3], u), edge(u, 1)); } c.closePath();
      const g = c.createLinearGradient(xs[0], 0, xs[3], 0); g.addColorStop(0, rgba(HEX.amber, 0.28)); g.addColorStop(1, rgba(HEX.ac, 0.4)); c.fillStyle = g; c.fill(); c.strokeStyle = rgba(HEX.amber, 0.55); c.lineWidth = 1.2; c.stroke();
      // users flowing and leaking
      const rr = rand(5); for (let i = 0; i < (L.low ? 60 : 140); i++) {
        const u0 = rr(), sp = 0.05 + rr() * 0.05, u = (u0 + t * sp) % 1, lane = rr() * 2 - 1, seg = u * 3, idx = Math.floor(seg), x = lerp(xs[0], xs[3], u), keep = f.counts[Math.min(3, idx + 1)] / f.counts[idx];
        const drops = rr() > Math.pow(keep, 0.6) && seg - idx > 0.55, h = lerp(hs[idx], hs[Math.min(3, idx + 1)], ease(seg - idx));
        const y = mid + lane * h * 0.42 + (drops ? (seg - idx - 0.55) * 140 * (lane > 0 ? 1 : -1) : 0), al = drops ? 1 - (seg - idx - 0.55) * 2.2 : 1;
        c.fillStyle = rgba(drops ? HEX.red : HEX.tx, 0.7 * clamp(al)); c.fillRect(x, y, 1.8, 1.8);
      }
      // stage markers
      st.ls.forEach((n, i) => { const a = clamp(1 - Math.abs(s - i)), x = xs[i]; c.strokeStyle = rgba(a > 0.4 ? HEX.ac2 : HEX.mut, 0.3 + 0.6 * a); c.setLineDash([3, 5]); c.beginPath(); c.moveTo(x, y0 - 6); c.lineTo(x, y1 + 6); c.stroke(); c.setLineDash([]);
        text(c, n, x, y0 - 16, { size: L.mobile ? 8.5 : 11, w: 600, ls: 1.4, col: a > 0.4 ? HEX.ac2 : HEX.mut });
        text(c, Math.round(f.counts[i]).toLocaleString('en-US'), x, y1 + 26, { size: L.mobile ? 12 : 18, w: 700, col: rgba(HEX.tx, 0.6 + 0.4 * a), sans: true }); });
      if (!L.mobile) text(c, 'users at each stage under the default assumptions', xs[0], y1 + 44, { size: 9.5, col: rgba(HEX.mut, 0.9) });
      // retention decay (step 2)
      const ra = clamp(1 - Math.abs(s - 2) * 1.4);
      if (ra > 0.02 && !L.mobile) { c.save(); c.globalAlpha = ra; const gx = xs[2] - 10, gw = W * 0.34, gy = y1 + 66, gh = L.mobile ? 50 : 70; c.strokeStyle = rgba(HEX.mut, 0.4); c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx, gy + gh); c.lineTo(gx + gw, gy + gh); c.stroke(); c.strokeStyle = HEX.ac2; c.lineWidth = 2; c.beginPath(); f.ret.curve.forEach((v, i) => { const x = gx + gw * i / 59, y = gy + gh * (1 - v / 0.5); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); text(c, 'RETENTION BY DAY · D1 → D30 · modelled decay', gx, gy - 6, { size: 9.5, col: HEX.mut }); c.restore(); }
      // experiment fork (step 4)
      if (forkAmt > 0.01) { c.save(); c.globalAlpha = forkAmt; const fx = xs[3], fy = mid; ['A', 'B'].forEach((v, i) => { const dy = (i ? 1 : -1) * 34 * forkAmt; c.strokeStyle = rgba(i ? HEX.ac2 : HEX.mut, 0.9); c.lineWidth = i ? 3 : 2; c.beginPath(); c.moveTo(fx, fy); c.bezierCurveTo(fx + 60, fy, x1 - 120, fy + dy, x1 - 20, fy + dy); c.stroke(); text(c, 'VARIANT ' + v, x1 - 24, fy + dy + (i ? 20 : -10), { size: 10, w: 600, col: i ? HEX.ac2 : HEX.mut, align: 'right' }); }); text(c, 'power · MDE · guardrails', fx + 20, fy - 54, { size: 10, col: HEX.amber, w: 600, ls: 1 }); const dd = clamp(s - 3.4); if (dd > 0) { c.globalAlpha = dd; rrect(c, x1 - 300, fy + 70, 300, 34, 10); c.fillStyle = 'rgba(8,10,12,.9)'; c.fill(); c.strokeStyle = rgba(HEX.amber, 0.8); c.stroke(); text(c, 'DECISION RULE · SHIP · KILL · KEEP RUNNING', x1 - 150, fy + 91, { size: 8.5, align: 'center', col: HEX.amber, w: 600, ls: 0.8 }); } c.restore(); }
      const ai = clamp(Math.round(s), 0, 4), ax = xs[Math.min(3, ai)], sx = L.av.x + L.av.w * 0.52, sy = L.av.y + L.av.h * 0.1;
      if (L.av.w) { c.save(); c.setLineDash([2, 7]); c.lineDashOffset = -t * 18; c.strokeStyle = rgba(HEX.ac2, 0.45); c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + ax) / 2, y1 + 60, ax, y1 + 8); c.stroke(); c.restore(); }
    },
  };

  /* HERO — an environment for the host: grid, agent network, streams, light cone */
  SCENES.hero = {
    tint: HEX.ac, noBand: true,
    init(w) { const r = rand(9); w.state.net = Array.from({ length: 46 }, () => ({ x: r(), y: r() * 0.7, p: r() * 6.28, v: 0.4 + r() })); w.state.pointer = { x: 0.5, y: 0.4 }; },
    draw(c, L, t, s, st) {
      const { W, H } = L, ptr = st.pointer, n = st.net;
      // light cone behind the host
      const g = c.createLinearGradient(L.av.cx, 0, L.av.cx, H); g.addColorStop(0, rgba(HEX.ac, 0)); g.addColorStop(0.5, rgba(HEX.ac, 0.1)); g.addColorStop(1, rgba(HEX.ac, 0.02));
      c.fillStyle = g; c.beginPath(); c.moveTo(L.av.cx - 30, 0); c.lineTo(L.av.cx + 30, 0); c.lineTo(L.av.cx + L.av.w * 0.95, H); c.lineTo(L.av.cx - L.av.w * 0.95, H); c.closePath(); c.fill();
      // data streams
      const sx0 = L.mobile ? 0 : W * 0.52, sw = L.mobile ? W * 0.62 : W * 0.48;      // keep the streams clear of the headline
      for (let i = 0; i < 7; i++) { const y = H * ((L.mobile ? 0.7 : 0.1) + i * (L.mobile ? 0.03 : 0.045)), sp = 40 + i * 14; c.strokeStyle = rgba(HEX.blue, 0.1); c.beginPath(); c.moveTo(sx0, y); c.lineTo(sx0 + sw, y); c.stroke(); for (let k = 0; k < 4; k++) { const x = sx0 + ((t * sp + k * sw * 0.3 + i * 90) % sw); c.fillStyle = rgba(i % 3 ? HEX.ac2 : HEX.blue, 0.8); c.fillRect(x, y - 1, 10 + i * 2, 2); } }
      // agent network
      c.lineWidth = 0.8; const pts = n.map((q) => [q.x * W + Math.sin(t * 0.3 * q.v + q.p) * 14 + (ptr.x - 0.5) * 18 * q.v, q.y * H + Math.cos(t * 0.25 * q.v + q.p) * 12 + (ptr.y - 0.4) * 12 * q.v]);
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = dx * dx + dy * dy, lim = (W * 0.13) ** 2; if (d < lim) { c.strokeStyle = rgba(HEX.ac, 0.22 * (1 - d / lim)); c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); c.stroke(); } }
      pts.forEach((p, i) => { c.fillStyle = i % 6 === 0 ? '#eafff7' : rgba(HEX.ac2, 0.8); c.beginPath(); c.arc(p[0], p[1], i % 6 === 0 ? 2.4 : 1.4, 0, TAU); c.fill(); });
    },
  };

  /* CONTACT — the earlier motifs converge behind the presenter */
  SCENES.contact = {
    tint: HEX.ac, noBand: true,
    init(w) { },
    draw(c, L, t, s, st) {
      const { W, H } = L, cx = L.av.cx, cy = L.av.y + L.av.h * 0.4, R = Math.min(W, H) * 0.42;
      c.lineWidth = 1;
      for (let k = 0; k < 3; k++) { c.strokeStyle = rgba(HEX.ac, 0.09 + 0.03 * k); c.beginPath(); c.ellipse(cx, cy, R * (1 + k * 0.42), R * (0.5 + k * 0.22), t * 0.03 * (k % 2 ? -1 : 1), 0, TAU); c.stroke(); }
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * TAU / 6 + t * 0.02, x = cx + Math.cos(a) * R * 1.1, y = cy + Math.sin(a) * R * 0.6; c.strokeStyle = rgba(HEX.violet, 0.2); c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); glow(c, x, y, 18, HEX.violet, 0.35); c.fillStyle = HEX.ac2; c.fillRect(x - 2, y - 2, 4, 4); }
      for (let i = 0; i < 6; i++) { const y = H * (0.18 + i * 0.12); const x = ((t * (50 + i * 12) + i * 200) % W); c.fillStyle = rgba(HEX.blue, 0.7); c.fillRect(x, y, 14, 2); c.strokeStyle = rgba(HEX.blue, 0.08); c.beginPath(); c.moveTo(0, y + 1); c.lineTo(W, y + 1); c.stroke(); }
    },
  };

  /* ---------- World controller ---------- */
  const worlds = [];
  class World {
    constructor(el, cfg) {
      this.el = el; this.id = el.dataset.world; this.cfg = cfg; this.N = cfg ? cfg.steps.length : 1; this.scene = SCENES[this.id];
      this.canvas = el.querySelector('.world-canvas'); this.ctx = this.canvas.getContext('2d'); this.av = el.querySelector('.world-av, [data-av]');
      this.s = 0; this.target = 0; this.t = 0; this.visible = false; this.state = {}; this.manual = null; this.curStep = -1; this.L = null;
      const r = rand(11 + this.id.length); this.parts = Array.from({ length: 64 }, () => ({ x: r(), y: r(), z: 0.2 + r() * 0.8, p: r() * 6.28 }));
      this.cap = el.querySelector('.world-cap'); this.nav = [...el.querySelectorAll('.world-nav [data-step]')];
      this.scene.init(this);
      this.resize(); this.bindUI(); this.setStep(0, true);
      new ResizeObserver(() => { this.resize(); this.once(); }).observe(el);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, lowPower() ? 1.5 : 2); this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width, H = r.height, mobile = W < 700, a = this.av ? this.av.getBoundingClientRect() : { left: W * 0.7, top: H * 0.5, width: 100, height: 200 };
      const av = this.av ? { x: a.left - r.left, y: a.top - r.top, w: a.width, h: a.height } : { x: W, y: H, w: 0, h: 0 }; av.cx = av.x + av.w / 2;
      this.L = { W, H, mobile, low: lowPower(), av, band: mobile ? { y0: H * 0.21, y1: H * 0.37 } : { y0: H * 0.2, y1: H * 0.46 } };
    }
    bindUI() {
      this.nav.forEach((b) => b.addEventListener('click', () => this.goto(+b.dataset.step)));
      this.el.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (e.target.closest('.world-nav')) { e.preventDefault(); this.goto(Math.min(this.N - 1, this.curStep + 1)); } } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (e.target.closest('.world-nav')) { e.preventDefault(); this.goto(Math.max(0, this.curStep - 1)); } } });
      if (this.id === 'hero') window.addEventListener('pointermove', (e) => { this.state.pointer = { x: e.clientX / innerWidth, y: e.clientY / innerHeight }; }, { passive: true });
    }
    goto(i) {
      if (STATIC() || !this.el.classList.contains('is-pinned')) { this.setStep(i, false); this.target = i; this.s = i; this.once(); return; }
      const top = this.el.getBoundingClientRect().top + scrollY, span = this.el.offsetHeight - innerHeight;
      window.scrollTo({ top: top + span * ((i + 0.5) / this.N), behavior: 'smooth' });
    }
    setStep(i, force) {
      if (i === this.curStep && !force) return; this.curStep = i;
      if (!this.cfg) return; const step = this.cfg.steps[i];
      this.nav.forEach((b) => { const on = +b.dataset.step === i; b.setAttribute('aria-current', on ? 'step' : 'false'); b.classList.toggle('on', on); });
      if (this.cap) { this.cap.classList.remove('in'); void this.cap.offsetWidth; this.cap.querySelector('.cap-label').textContent = step[0]; this.cap.querySelector('.cap-text').textContent = step[1]; this.cap.classList.add('in'); }
      this.el.dataset.step = i;
    }
    progress() {
      if (!this.el.classList.contains('is-pinned')) return this.target;
      const r = this.el.getBoundingClientRect(), span = this.el.offsetHeight - innerHeight;
      return clamp(clamp(-r.top / span) * this.N - 0.5, 0, this.N - 1);
    }
    frame(dt) {
      if (!this.L) return;
      if (this.manual === null) {
        const p = this.progress();
        this.target = this.el.classList.contains('is-pinned') ? clamp(p, 0, this.N - 1) : this.target;
        this.s += (this.target - this.s) * Math.min(1, dt * 7);
        this.t += dt;
      }
      this.setStep(clamp(Math.round(this.s), 0, this.N - 1), false);
      this.draw(dt);
    }
    draw(dt) {
      const c = this.ctx, L = this.L; if (this.scene.advance && dt) this.scene.advance(this, Math.min(dt, 0.1));
      c.save(); backdrop(c, L, this.t, this.s, this.scene.tint, this.parts); this.scene.draw(c, L, this.t, this.s, this.state); c.restore();
    }
    once() { if (this.L) { if (this.scene.advance && this.state.sim && this.t === 0) { for (let i = 0; i < 60; i++) this.scene.advance(this, 0.1); } this.draw(0); } }
    /* deterministic render for capture / film: absolute time and (fractional) step */
    renderAt(t, s) { this.manual = t; this.t = t; this.s = s; this.setStep(clamp(Math.round(s), 0, this.N - 1), false); this.resize(); this.draw(0); }
  }

  /* ---------- master loop: only visible scenes tick ---------- */
  let last = 0, raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016); const gap = lowPower() ? 1 / 30 : 0; if (gap && now - last < gap * 1000) return; last = now;
    worlds.forEach((w) => { if (w.visible) w.frame(dt); });
  }
  function start() {
    const io = new IntersectionObserver((es) => es.forEach((e) => { const w = worlds.find((x) => x.el === e.target); if (w) { w.visible = e.isIntersecting; if (e.isIntersecting && STATIC()) w.once(); } }), { rootMargin: '10% 0px' });
    worlds.forEach((w) => io.observe(w.el));
    if (!STATIC()) raf = requestAnimationFrame(loop);
    reduceMQ.addEventListener('change', () => location.reload());
  }

  function init() {
    const content = JSON.parse(document.getElementById('rm-worlds')?.textContent || '{}');
    document.querySelectorAll('[data-world]').forEach((el) => {
      const id = el.dataset.world; if (!SCENES[id]) return;
      if (!STATIC() && content[id]) el.classList.add('is-pinned');
      el.classList.add('js-world'); el.style.setProperty('--n', content[id] ? content[id].steps.length : 1);
      const w = new World(el, content[id] || null); worlds.push(w); w.once();
    });
    window.__rm = { worlds, SCENES, backdrop, rand, HEX, params, capture };
    start();
  }
  const ready = () => (RM.agentCore && RM.streamCore && RM.funnelCore) ? init() : setTimeout(ready, 30);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
