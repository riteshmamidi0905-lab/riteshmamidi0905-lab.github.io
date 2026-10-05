/* scene-ai.js — AI chapter, two acts on one pinned stage.
   Act 1 (steps 0–6): the real ai-agent-toolkit loop (agent-core.js) runs once; every payload on screen is that run's own output.
   Act 2 (steps 7–10): the real RAG pipeline (rag-core.js over the fixed Acme sample corpus) retrieves for one question; the
   chunks, scores, ranking, citations and answer text are computed by that code, not scripted.
   Drawn in design pixels: the engine scales the whole canvas, so sizes here are for a ~1440-wide desktop or a ~390-wide phone. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, easeOut, HEX, rgba, glow, text, wrap, line, curve, bez } = H;
  const RM = window.RMLab;
  const TASK = 'Convert 5 km to mi then multiply by 2';
  const fit = (c, s, w, font) => { c.font = font; if (c.measureText(s).width <= w) return s; while (s.length > 4 && c.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };

  function build(st) {
    const A = RM.agentCore, run = A.run(TASK), ev = A.evaluate(TASK, run), h = run.history;
    st.stations = [
      { n: 'OBJECTIVE', lines: ['“' + TASK + '”'] },
      { n: 'PLAN', lines: [`${run.plan.kind} → ${run.plan.tool}`, `then calculator ${run.plan.op} ${run.plan.operand}`] },
      { n: 'TOOL', lines: [`${h[0].tool}("${h[0].input}")`] },
      { n: 'EVIDENCE', lines: ['knowledge_base: not called', 'planner routed to ' + run.plan.tool] },
      { n: 'EXECUTION', lines: [`obs: ${h[0].observation}`, `${h[1].tool}("${h[1].input}")`, `obs: ${h[1].observation}`] },
      { n: 'EVALUATION', lines: ev.checks.map((k) => (k.pass ? '✓ ' : '✗ ') + k.name) },
      { n: 'RESULT', lines: [String(run.answer)] },
    ];
    st.edges = ['task text', 'compose', h[0].tool, 'skipped', String(run.answer), 'pass'];
    const R = RM.ragCore, corp = R.corpus, index = R.buildIndex(corp.docs), q = corp.cases[0].question;
    const all = R.retrieve(index, q, index.chunks.length, true).slice(0, 8), top = all.slice(0, 4), ans = R.answer(q, top);
    const pos = new Map(index.chunks.map((c, i) => [c.chunk_id, i]));
    st.rag = { q, all, top, ans, order0: all.map((h2) => h2.chunk.chunk_id).sort((a, b) => pos.get(a) - pos.get(b)), vec: Array.from(R.embed(q).slice(0, 64)) };
  }

  scenes.agents = {
    tint: HEX.ac, still: 6,
    init(w) { build(w.state); },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile, a1 = 1 - clamp((s - 6.15) / 0.7), a2 = clamp((s - 6.55) / 0.7);
      if (a1 > 0.01) agents(c, L, B, mob, t, s, st, a1);
      if (a2 > 0.01) rag(c, L, B, mob, t, s, st, a2);
      st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
    },
  };

  const STATE = (s, i) => { const act = clamp(1 - Math.abs(s - i)); return { act, done: s > i + 0.4, state: act > 0.5 ? 'ACTIVE' : s > i + 0.4 ? 'DONE' : 'IDLE' }; };

  function agents(c, L, B, mob, t, s, st, A) {
    c.save(); c.globalAlpha = A; const N = 7, S = st.stations, head = clamp(s, 0, N - 1);
    const R = mob ? 17 : Math.min(B.w / 22, B.h / 8.5);
    const pos = S.map((_, i) => mob ? [B.x + 28, B.y + 30 + (B.h - 60) * i / (N - 1)] : [B.x + B.w * (0.06 + 0.88 * i / (N - 1)), B.y + B.h * (0.15 + (i % 2 ? 0.37 : 0))]);
    const ctrl = (i) => { const p = pos[i], q = pos[i + 1]; return mob ? [[p[0], lerp(p[1], q[1], 0.5)], [q[0], lerp(p[1], q[1], 0.5)]] : [[lerp(p[0], q[0], 0.55), p[1]], [lerp(p[0], q[0], 0.45), q[1]]]; };
    for (let i = 0; i < N - 1; i++) {
      const [c1, c2] = ctrl(i), done = clamp(head - i), p0 = pos[i], p3 = pos[i + 1];
      curve(c, p0, c1, c2, p3, HEX.dim, 1.4, 0.55, [3, 7], -t * 10);
      if (done > 0) { c.save(); c.shadowColor = HEX.ac; c.shadowBlur = 18; c.strokeStyle = rgba(HEX.ac2, 0.95); c.lineWidth = 3.4; c.beginPath(); c.moveTo(p0[0], p0[1]); for (let k = 1; k <= 48; k++) { const q = bez(p0, c1, c2, p3, easeOut(done) * k / 48); c.lineTo(q[0], q[1]); } c.stroke(); c.restore(); }
      if (done > 0.6 && !mob) { const m = bez(p0, c1, c2, p3, 0.5); text(c, fit(c, st.edges[i], 150, '600 13px ' + H.FONT), m[0], m[1] + (i % 2 ? 26 : -18), { size: 13, align: 'center', col: rgba(HEX.ac2, 0.95), w: 600 }); }
    }
    const fi = Math.min(Math.floor(head), N - 2), pk = head < N - 1 ? bez(pos[fi], ...ctrl(fi), pos[fi + 1], easeOut(head - fi)) : pos[N - 1];
    for (let k = 0; k < 14; k++) { const hh = Math.max(0, head - k * 0.014), i = clamp(Math.floor(hh), 0, N - 2), q = bez(pos[i], ...ctrl(i), pos[i + 1], clamp(hh - i)); glow(c, q[0], q[1], 20 - k, HEX.ac2, 0.5 * (1 - k / 14)); }
    c.fillStyle = '#eafff7'; c.beginPath(); c.arc(pk[0], pk[1], 5, 0, TAU); c.fill();
    S.forEach((n, i) => {
      const [x, y] = pos[i], { act, done, state } = STATE(s, i);
      glow(c, x, y, R * 3, HEX.ac, 0.04 + 0.3 * act);
      c.fillStyle = '#05070a'; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
      c.strokeStyle = rgba(act > 0.5 ? HEX.ac2 : done ? HEX.ac : HEX.tx, act > 0.5 ? 1 : done ? 0.75 : 0.3); c.lineWidth = 1.8 + act * 1.8; c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke();
      c.save(); c.setLineDash([2, 7]); c.lineDashOffset = -t * (act > 0.5 ? 20 : 0); c.strokeStyle = rgba(HEX.ac2, 0.2 + 0.45 * act); c.beginPath(); c.arc(x, y, R * 1.3, 0, TAU); c.stroke(); c.restore();
      if (done || act > 0.5) { c.fillStyle = rgba(HEX.ac2, act > 0.5 ? 0.95 : 0.55); c.beginPath(); c.arc(x, y, R * (0.28 + 0.1 * act), 0, TAU); c.fill(); }
      text(c, String(i + 1), x, y + (mob ? 4 : 5), { size: mob ? 11 : 14, align: 'center', col: done || act > 0.5 ? '#04110d' : HEX.dim, w: 700 });
      const al = 0.4 + 0.6 * Math.max(act, done ? 0.55 : 0), show = clamp((s - i + 0.35) * 2.2);
      if (mob) {
        const tx = x + R + 16, mw = B.w - 28 - R - 24;
        text(c, n.n, tx, y - 3, { size: 12.5, w: 700, ls: 1.6, col: rgba(HEX.tx, al) }); text(c, state, tx + 104, y - 3, { size: 9.5, w: 600, ls: 1.4, col: act > 0.5 ? HEX.ac2 : done ? HEX.ac : HEX.dim });
        c.save(); c.globalAlpha = A * show; n.lines.slice(0, 2).forEach((l, k) => text(c, fit(c, l, mw, '500 11.5px ' + H.FONT), tx, y + 13 + k * 14, { size: 11.5, col: act > 0.5 ? HEX.tx : rgba(HEX.mut, 0.95) })); c.restore();
      } else {
        const ty = y + R * 1.3 + 22;
        text(c, n.n, x, ty, { size: 15, align: 'center', w: 700, ls: 2, col: rgba(HEX.tx, al) }); text(c, state, x, ty + 17, { size: 11, align: 'center', w: 600, ls: 1.6, col: act > 0.5 ? HEX.ac2 : done ? HEX.ac : HEX.dim });
        c.save(); c.globalAlpha = A * show; let yy = ty + 44; n.lines.forEach((l) => { const parts = []; let cur = ''; l.split(' ').forEach((wd) => { if ((cur + ' ' + wd).trim().length > 26 && cur) { parts.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); }); parts.push(cur); parts.slice(0, 2).forEach((pt) => { text(c, pt, x, yy, { size: 14.5, align: 'center', col: act > 0.5 ? HEX.tx : rgba(HEX.mut, 0.95) }); yy += 20; }); }); c.restore();
      }
    });
    c.restore();
  }

  /* ---- act 2: the real RAG pipeline. 0 question · 1 chunks · 2 retrieval · 3 citations ---- */
  function rag(c, L, B, mob, t, s, st, A) {
    const Rg = st.rag, k = s - 7, n = Rg.all.length; c.save(); c.globalAlpha = A;
    const colX = B.x, colW = mob ? B.w : B.w * 0.6, rx = B.x + B.w * 0.66, rw = B.w * 0.34;
    const rowH = mob ? 37 : Math.min(62, B.h / 8.3), y0 = mob ? B.y + (k > 0.4 ? 64 : 0) : B.y + 4;
    const rankOf = (id) => Rg.all.findIndex((h) => h.chunk.chunk_id === id), rk = ease(clamp(k - 1.1, 0, 1)), cites = k > 2.1;
    // question + embedding
    const qs = Rg.q, typed = qs.slice(0, Math.floor(qs.length * clamp(k + 0.7) * 1.3));
    if (mob) {
      text(c, 'QUESTION', B.x, B.y + 12, { size: 10.5, col: HEX.ac2, w: 700, ls: 2 });
      text(c, fit(c, typed + (Math.floor(t * 2) % 2 && k < 1 ? '▍' : ''), B.w, '600 17px ' + H.SANS), B.x, B.y + 36, { size: 17, w: 600, sans: true, col: HEX.tx });
      if (k < 0.7) { const bw = B.w / 64; text(c, 'EMBEDDING · 64 of 1024 dims', B.x, B.y + 70, { size: 10, col: HEX.dim, ls: 1.2 }); Rg.vec.forEach((v, i) => { const hh = Math.min(110, Math.abs(v) * 800) * clamp(k * 2 + 0.3) * (1 - clamp((k - 0.4) / 0.3)); c.fillStyle = rgba(v >= 0 ? HEX.ac2 : HEX.blue, 0.85); c.fillRect(B.x + i * bw, B.y + 190 - (v >= 0 ? hh : 0), bw - 1.2, Math.max(1, hh)); }); }
    } else {
      text(c, 'QUESTION', rx, y0 + 14, { size: 12, col: HEX.ac2, w: 700, ls: 2 });
      wrap(c, typed + (Math.floor(t * 2) % 2 && k < 1 ? '▍' : ''), rx, y0 + 50, rw, 36, { size: 29, w: 600, sans: true, col: HEX.tx });
      const vy = y0 + 250, bw = rw / 64; text(c, 'QUERY EMBEDDING · 64 of 1024 dimensions', rx, vy - 100, { size: 11, col: HEX.dim, ls: 1.3 }); line(c, rx, vy, rx + rw, vy, HEX.tx, 1, 0.15);
      Rg.vec.forEach((v, i) => { const hh = Math.min(100, Math.abs(v) * 700) * clamp(k * 2 + 0.25); c.fillStyle = rgba(v >= 0 ? HEX.ac2 : HEX.blue, 0.85); c.fillRect(rx + i * bw, vy - (v >= 0 ? hh : 0), bw - 1.5, Math.max(1, hh)); });
    }
    // chunk strips: index order → real ranked order
    Rg.order0.forEach((id, i0) => {
      const h = Rg.all[rankOf(id)], r = rankOf(id), pos = lerp(i0, r, rk), y = y0 + pos * rowH, appear = 1, isTop = r < 4;
      if (mob && cites && !isTop) return; if (mob && k < 0.4) return;
      const dimmed = k < 0.5 ? 0.28 : k > 1.5 && !isTop ? 0.3 : 1; c.save(); c.globalAlpha = A * appear * dimmed;
      const hot = k > 1.5 && isTop; c.fillStyle = hot ? HEX.ac2 : rgba(HEX.dim, 0.9); c.fillRect(colX, y + 2, hot ? 3 : 2, rowH - 8);
      const tx = colX + 16, body = h.chunk.text.replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' '), bars = mob ? 78 : 150;
      text(c, h.chunk.chunk_id.replace('::', ' · '), tx, y + (mob ? 12 : 16), { size: mob ? 10 : 11.5, col: hot ? HEX.ac2 : HEX.dim, w: 700, ls: 0.6 });
      text(c, fit(c, body, colW - bars - 120, '500 ' + (mob ? 12 : 14.5) + 'px ' + H.SANS), tx, y + (mob ? 27 : 38), { size: mob ? 12 : 14.5, sans: true, col: rgba(HEX.tx, hot ? 0.96 : 0.72) });
      if (k > 1.1) {
        const sx = colX + colW - bars - 36, a = clamp((k - 1.1) * 2), bar = (label, v, yy, col, bw) => { if (!mob) text(c, label, sx - 6, yy + 5, { size: 9.5, align: 'right', col: HEX.dim, ls: 1 }); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(sx, yy - 2, bw, 5); c.fillStyle = rgba(col, 0.92); c.fillRect(sx, yy - 2, bw * clamp(v) * a, 5); };
        if (mob) bar('', h.score * 1.7, y + 18, HEX.ac2, bars); else { bar('VEC', h.vector * 2.2, y + 14, HEX.blue, bars); bar('KEY', h.keyword, y + 28, HEX.amber, bars); bar('FUSED', h.score * 1.7, y + 42, HEX.ac2, bars); }
        text(c, '#' + (r + 1), colX + colW - 6, y + (mob ? 22 : 32), { size: mob ? 14 : 26, w: 700, col: hot ? HEX.ac2 : HEX.dim, align: 'right' });
      }
      c.restore();
    });
    // citations → the extractive answer (text from the real reader)
    if (cites) {
      const ca = clamp((k - 2.1) * 1.8), ax = mob ? B.x : rx, aw = mob ? B.w : rw, ay = mob ? y0 + 4 * rowH + 40 : y0 + 318; c.save(); c.globalAlpha = A * ca;
      text(c, 'ANSWER · EXTRACTIVE · CITED', ax, ay - 12, { size: mob ? 10.5 : 12, col: HEX.ac2, w: 700, ls: 2 });
      let yy = ay + 14; const fs = mob ? 13 : 17, lh = mob ? 17 : 23;
      Rg.ans.chosen.slice(0, mob ? 2 : 3).forEach((x) => {
        const nl = wrap(c, x.sentence + ' ', ax, yy + 4, aw - 34, lh, { size: fs, sans: true, col: HEX.tx, w: 500 });
        text(c, `[${x.cite}]`, ax + aw - 2, yy + 4 + (nl - 1) * lh, { size: mob ? 11.5 : 13, w: 700, col: HEX.ac2, align: 'right' });
        if (!mob) { const r = Rg.all.findIndex((h) => h.chunk.chunk_id === Rg.top[x.cite - 1].chunk.chunk_id), cy = y0 + r * rowH + rowH / 2 - 4; curve(c, [colX + colW + 4, cy], [colX + colW + 34, cy], [ax - 40, yy], [ax - 10, yy + 2], HEX.ac2, 1.3, 0.65, [2, 5], -t * 10); }
        yy += nl * lh + 14;
      });
      c.restore();
    }
    c.restore();
  }
  window.RMW.register('agents', scenes.agents);
})();
