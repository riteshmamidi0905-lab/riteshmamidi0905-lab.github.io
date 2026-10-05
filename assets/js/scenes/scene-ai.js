/* scene-ai.js — AI chapter, two acts on one pinned stage.
   Act 1 (steps 0–6): the real ai-agent-toolkit loop (agent-core.js) runs once; every payload on screen is that run's own output.
   Act 2 (steps 7–10): the real RAG pipeline (rag-core.js over the fixed Acme sample corpus) retrieves for one question; the
   chunks, scores, ranking, citations and answer text are computed by that code, not scripted. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, easeOut, HEX, rgba, glow, text, wrap, line, curve, bez } = H;
  const RM = window.RMLab;
  const TASK = 'Convert 5 km to mi then multiply by 2';
  const fit = (c, s, w, font) => { c.font = font; if (c.measureText(s).width <= w) return s; while (s.length > 4 && c.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };

  function build(st) {
    const A = RM.agentCore, run = A.run(TASK), ev = A.evaluate(TASK, run), h = run.history;
    st.run = run;
    st.stations = [
      { n: 'OBJECTIVE', sub: 'intake', lines: ['“' + TASK + '”'] },
      { n: 'PLANNING', sub: 'route', lines: [`${run.plan.kind} → ${run.plan.tool},`, `then calculator ${run.plan.op} ${run.plan.operand}`] },
      { n: 'TOOLS', sub: 'select', lines: [`${h[0].tool}("${h[0].input}")`] },
      { n: 'RETRIEVAL', sub: 'context', lines: ['knowledge_base: not called', 'planner routed to ' + run.plan.tool] },
      { n: 'EXECUTION', sub: 'observe', lines: [`observation: ${h[0].observation}`, `${h[1].tool}("${h[1].input}")`, `observation: ${h[1].observation}`] },
      { n: 'EVALUATION', sub: 'check', lines: ev.checks.map((k) => (k.pass ? '✓ ' : '✗ ') + k.name) },
      { n: 'RESULT', sub: 'answer', lines: [String(run.answer)] },
    ];
    st.edges = ['task text', 'compose', h[0].tool, 'skipped', run.answer, 'pass'];
    const R = window.RMLab.ragCore, corp = R.corpus; st.rag = (() => {
      const index = R.buildIndex(corp.docs), q = corp.cases[0].question, all = R.retrieve(index, q, index.chunks.length, true).slice(0, 8), top = all.slice(0, 4), ans = R.answer(q, top);
      const pos = new Map(index.chunks.map((c, i) => [c.chunk_id, i])), base = all.map((h) => h.chunk.chunk_id).sort((a, b) => pos.get(a) - pos.get(b)); const vecBars = R.embed(q).slice(0, 56);
      return { q, all, top, ans, order0: base, vec: Array.from(vecBars), index };
    })();
  }

  scenes.agents = {
    tint: HEX.ac,
    init(w) { build(w.state); },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile, a1 = 1 - clamp((s - 6.1) / 0.9), a2 = clamp((s - 6.5) / 0.9);
      if (a1 > 0.01) agents(c, L, B, mob, t, s, st, a1);
      if (a2 > 0.01) rag(c, L, B, mob, t, s, st, a2);
      if (a1 > a2) { const k = clamp(Math.round(Math.min(s, 6))); const p = st.pos[k]; if (p) st.cam = { x: p[0], y: p[1], z: 1.07 }; } else st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
    },
  };

  function agents(c, L, B, mob, t, s, st, A) {
    c.save(); c.globalAlpha = A; const N = 7, S = st.stations, R = mob ? Math.min(B.w / 9, 30) : Math.min(B.w / 30, B.h / 9);
    const pos = (st.pos = S.map((_, i) => mob ? [B.x + B.w * (i % 2 ? 0.74 : 0.26), B.y + B.h * (0.05 + 0.9 * i / (N - 1))] : [B.x + B.w * (0.045 + 0.91 * i / (N - 1)), B.y + B.h * (0.36 + (i % 2 ? 0.2 : 0))]));
    const ctrl = (i) => { const p = pos[i], q = pos[i + 1]; return mob ? [[p[0], p[1] + (q[1] - p[1]) * 0.6], [q[0], q[1] - (q[1] - p[1]) * 0.6]] : [[p[0] + (q[0] - p[0]) * 0.55, p[1]], [q[0] - (q[0] - p[0]) * 0.55, q[1]]]; };
    const head = clamp(s, 0, N - 1);
    for (let i = 0; i < N - 1; i++) {
      const [c1, c2] = ctrl(i), done = clamp(head - i), p0 = pos[i], p3 = pos[i + 1];
      curve(c, p0, c1, c2, p3, HEX.dim, 1.2, 0.5, [3, 6], -t * 12);
      if (done > 0) { c.save(); c.shadowColor = HEX.ac; c.shadowBlur = 16; c.strokeStyle = rgba(HEX.ac2, 0.95); c.lineWidth = 3; c.beginPath(); c.moveTo(p0[0], p0[1]); for (let k = 1; k <= 40; k++) { const q = bez(p0, c1, c2, p3, (k / 40) * done); c.lineTo(q[0], q[1]); } c.stroke(); c.restore(); }
      if (done > 0.5 && !mob) { const m = bez(p0, c1, c2, p3, 0.5), lab = S === null ? '' : st.edges[i]; text(c, fit(c, lab, mob ? 90 : 150, '500 12px ' + H.FONT), m[0], m[1] + (mob ? 0 : (i % 2 ? 18 : -12)), { size: mob ? 11 : 12, align: 'center', col: rgba(HEX.ac2, 0.9), w: 600 }); }
    }
    const pk = head < N - 1 ? bez(pos[Math.floor(head)], ...ctrl(Math.floor(head)), pos[Math.floor(head) + 1], head - Math.floor(head)) : pos[N - 1];
    for (let k = 0; k < 14; k++) { const hh = head - k * 0.012, i = clamp(Math.floor(hh), 0, N - 2), q = bez(pos[i], ...ctrl(i), pos[i + 1], clamp(hh - i)); glow(c, q[0], q[1], 16 - k, HEX.ac2, 0.5 * (1 - k / 14)); }
    c.fillStyle = '#eafff7'; c.beginPath(); c.arc(pk[0], pk[1], 5, 0, TAU); c.fill();
    S.forEach((n, i) => {
      const [x, y] = pos[i], act = clamp(1 - Math.abs(s - i)), done = s > i + 0.4 ? 1 : 0, state = act > 0.5 ? 'ACTIVE' : done ? 'DONE' : 'IDLE';
      glow(c, x, y, R * 2.6, HEX.ac, 0.04 + 0.28 * act);
      c.strokeStyle = rgba(act > 0.5 ? HEX.ac2 : done ? HEX.ac : HEX.tx, act > 0.5 ? 0.95 : done ? 0.7 : 0.28); c.lineWidth = 1.5 + act * 1.5; c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke();
      c.save(); c.setLineDash([2, 7]); c.lineDashOffset = -t * (act > 0.5 ? 20 : 0); c.strokeStyle = rgba(HEX.ac2, 0.25 + 0.4 * act); c.beginPath(); c.arc(x, y, R * 1.32, 0, TAU); c.stroke(); c.restore();
      if (done || act > 0.5) { c.fillStyle = rgba(HEX.ac2, act > 0.5 ? 0.9 : 0.5); c.beginPath(); c.arc(x, y, R * (0.22 + 0.1 * act), 0, TAU); c.fill(); }
      text(c, String(i + 1).padStart(2, '0'), x, y + 4, { size: mob ? 10 : 13, align: 'center', col: done || act > 0.5 ? '#04110d' : HEX.dim, w: 700 });
      const up = false, ty = mob ? y : up ? y - R * 1.7 : y + R * 1.7 + 14, tx = mob ? (i % 2 ? x - R * 1.5 : x + R * 1.5) : x, al = mob ? (i % 2 ? 'right' : 'left') : 'center';
      const nameY = mob ? y - 3 : up ? y - R * 1.5 - (n.lines.length * 17 + 8) : y + R * 1.5 + 22;
      text(c, n.n, tx, mob ? y - 4 : nameY, { size: mob ? 11 : 15, align: al, col: act > 0.5 ? HEX.tx : rgba(HEX.tx, done ? 0.85 : 0.5), w: 700, ls: 2 });
      text(c, state, tx, (mob ? y - 4 : nameY) + (mob ? 14 : 17), { size: mob ? 8.5 : 10.5, align: al, col: act > 0.5 ? HEX.ac2 : done ? HEX.ac : HEX.dim, w: 600, ls: 1.6 });
      const show = clamp((s - i + 0.3) * 2);
      if (show > 0.02) { c.save(); c.globalAlpha = A * show; const lw = mob ? 130 : Math.min(300, B.w / 6.4); n.lines.forEach((l, k) => text(c, fit(c, l, lw, '500 12.5px ' + H.FONT), tx, (mob ? y + 12 : nameY + (up ? -0 : 0) + (up ? -(0) : 18) + 17 * (k + 1)) + (up ? 0 : 6), { size: mob ? 10.5 : 12.5, align: al, col: act > 0.5 ? HEX.tx : rgba(HEX.mut, 0.9) })); c.restore(); }
    });
    c.restore();
  }

  /* ---- act 2: the real RAG pipeline ---- */
  function rag(c, L, B, mob, t, s, st, A) {
    const Rg = st.rag, k = s - 7;                  // 0 question · 1 chunks · 2 retrieval · 3 citations
    c.save(); c.globalAlpha = A;
    const n = Rg.all.length, rowH = mob ? Math.min(34, B.h / 9.5) : Math.min(54, B.h / 10.4), colX = B.x, colW = mob ? B.w : B.w * 0.56, y0 = mob ? B.y + B.h * 0.18 : B.y + B.h * 0.02;
    // the question, typed as the step arrives
    const qs = Rg.q, typed = qs.slice(0, Math.floor(qs.length * clamp(k + 0.6) * 1.4)), qx = mob ? B.x : B.x + B.w * 0.62;
    text(c, 'QUESTION', qx, mob ? B.y + 6 : y0 + 14, { size: 11, col: HEX.ac2, w: 700, ls: 2 });
    wrap(c, typed + (Math.floor(t * 2) % 2 && k < 1 ? '▍' : ''), qx, mob ? B.y + 28 : y0 + 46, mob ? B.w : B.w * 0.38, mob ? 22 : 34, { size: mob ? 17 : 27, w: 600, sans: true, col: HEX.tx });
    // query embedding as a real vector (first 56 of 1024 hashed dimensions)
    if (!mob) { const vx = qx, vy = y0 + 150, bw = (B.w * 0.38) / 56; text(c, 'EMBEDDING · 56 of 1024 dims', vx, vy - 10, { size: 10.5, col: HEX.dim, ls: 1.4 }); Rg.vec.forEach((v, i) => { const hh = Math.abs(v) * 260 * clamp(k * 2 + 0.2); c.fillStyle = rgba(v >= 0 ? HEX.ac2 : HEX.blue, 0.8); c.fillRect(vx + i * bw, vy + 22 - (v >= 0 ? hh : 0), bw - 1.5, Math.max(1, hh)); }); }
    // chunk strips: unranked (index order) → ranked by the real fused score
    const rankOf = (id) => Rg.all.findIndex((h) => h.chunk.chunk_id === id), rk = ease(clamp(k - 1.1, 0, 1));
    Rg.order0.forEach((id, i0) => {
      const h = Rg.all[rankOf(id)], r = rankOf(id), pos = lerp(i0, r, rk), y = y0 + pos * (rowH + (mob ? 4 : 8)), appear = clamp((k - 0.2 - i0 * 0.06) * 3), isTop = r < 4;
      if (appear <= 0) return; const dimmed = k > 1.5 && !isTop ? 0.28 : 1; c.save(); c.globalAlpha = A * appear * dimmed;
      const hot = k > 1.5 && isTop; line(c, colX, y, colX, y + rowH, hot ? HEX.ac2 : HEX.dim, hot ? 3 : 1.5, 1);
      const tx = colX + 16; text(c, h.chunk.chunk_id.replace('::', ' · '), tx, y + (mob ? 13 : 17), { size: mob ? 10 : 11.5, col: hot ? HEX.ac2 : HEX.dim, w: 700, ls: 0.6 });
      const body = h.chunk.text.replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' '); text(c, fit(c, body, colW - 160, '500 ' + (mob ? 11 : 13) + 'px ' + H.SANS), tx, y + (mob ? 28 : 37), { size: mob ? 11 : 13, sans: true, col: rgba(HEX.tx, hot ? 0.95 : 0.7) });
      if (k > 1.1) { const sx = colX + colW - 104; const bar = (label, v, yy, col) => { text(c, label, sx - 4, yy + 4, { size: 9.5, align: 'right', col: HEX.dim, ls: 1 }); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(sx, yy - 3, 92, 5); c.fillStyle = rgba(col, 0.9); c.fillRect(sx, yy - 3, 92 * clamp(v) * clamp((k - 1.1) * 2), 5); }; if (!mob) { bar('VEC', h.vector * 2.2, y + 12, HEX.blue); bar('KEY', h.keyword, y + 26, HEX.amber); bar('FUSED', h.score * 1.6, y + 40, HEX.ac2); } text(c, '#' + (r + 1), colX + colW + 6, y + rowH * 0.6, { size: mob ? 13 : 20, w: 700, col: hot ? HEX.ac2 : HEX.dim, align: 'left' }); }
      c.restore();
    });
    // citations: lines from cited chunks to the extractive answer, whose text comes from the real reader
    if (k > 2.0) {
      const ca = clamp((k - 2.0) * 1.6), ax = mob ? B.x : qx, ay = mob ? B.y + B.h * 0.74 : y0 + 230, aw = mob ? B.w : B.w * 0.38; c.save(); c.globalAlpha = A * ca;
      text(c, 'ANSWER · EXTRACTIVE · CITED', ax, ay - 14, { size: 11, col: HEX.ac2, w: 700, ls: 2 });
      const sentences = Rg.ans.chosen.map((x) => x.sentence); let yy = ay + 8; sentences.slice(0, mob ? 2 : 3).forEach((sn, i) => { const lines = wrap(c, sn + ' ', ax, yy + 6, aw - 36, mob ? 16 : 23, { size: mob ? 12 : 17, sans: true, col: HEX.tx, w: 500 }); const cite = Rg.ans.chosen[i].cite; text(c, `[${cite}]`, ax + aw - 26, yy + 6 + (lines - 1) * (mob ? 16 : 23), { size: mob ? 11 : 13, w: 700, col: HEX.ac2 }); if (!mob) { const r = Rg.all.findIndex((h) => h.chunk.chunk_id === Rg.top[cite - 1].chunk.chunk_id), cy = y0 + r * (rowH + 8) + rowH / 2; curve(c, [colX + colW + 36, cy], [colX + colW + 90, cy], [ax - 40, yy], [ax - 8, yy + 2], HEX.ac2, 1.2, 0.6, [2, 5], -t * 10); } yy += lines * (mob ? 16 : 23) + 12; }); c.restore();
    }
    c.restore();
  }
  window.RMW.register('agents', scenes.agents);
})();
