/* scene-maref.js — MAREF chapter. An evaluation instrument, not a dashboard: INPUT → AGENT OUTPUT → EVALUATION DIMENSIONS → ASSESSMENT.
   eval-core.js scores two recorded sample outputs (authored fixtures, not live model calls) on the six dimensions with deterministic
   proxy heuristics. Scroll activates one dimension at a time and shows what each proxy found.
   Nothing here is an experimental MAREF result; the last step says so on screen. Restrained: hairlines, small caps, one accent. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line } = H;
  const GATE = 0.6, VIO = HEX.violet;

  function build(st) {
    const E = window.RMLab.evalCore, sc = E.SCENARIOS[0], pick = (id) => sc.behaviours.find((b) => b.id === id);
    st.sc = sc; st.cands = [{ b: pick('grounded'), col: HEX.ac2, tag: 'A' }, { b: pick('hallucinated'), col: HEX.red, tag: 'B' }].map((o) => {
      const res = E.evaluate(sc, o.b.runs[0], o.b.trace, o.b.runs);
      return { ...o, res, gate: E.gate(res) };
    });
    st.dims = E.DIMENSIONS;
  }

  scenes.maref = {
    tint: VIO, still: 6,
    init(w) { build(w.state); },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile, cands = st.cands, dims = st.dims;
      const vis = 1 - clamp((s - 6.55) / 0.45), cur = clamp(Math.round(s) - 1, -1, 5), prog = clamp(s - 0.5, 0, 6), stage = s < 0.5 ? 0 : s < 6.5 ? 2 : 3;
      st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
      // the chain: input → output → dimensions → assessment (the active link brightens with the scroll)
      const chain = mob ? ['INPUT', 'OUTPUT', 'DIMENSIONS', 'ASSESSMENT'] : ['INPUT', 'AGENT OUTPUT', 'EVALUATION DIMENSIONS', 'ASSESSMENT'], cx0 = B.x;
      let xx = cx0; chain.forEach((n, i) => { const on = i === stage || (stage === 0 && i === 1) || (stage === 2 && i === 2), a = on ? 1 : 0.32; text(c, n, xx, B.y + 10, { size: mob ? 8.5 : 11.5, w: 700, ls: mob ? 1 : 1.8, col: rgba(i === stage || on ? VIO : HEX.tx, a * (on ? 1 : 0.8)) }); const w = n.length * (mob ? 6.2 : 8.6) + (mob ? 8 : 14); if (i < 3) text(c, '→', xx + w, B.y + 10, { size: mob ? 9 : 12, col: rgba(HEX.dim, 0.9) }); xx += w + (mob ? 14 : 28); });
      line(c, B.x, B.y + 20, B.x + B.w, B.y + 20, HEX.tx, 1, 0.1);
      // radar
      const cx = mob ? B.x + B.w * 0.5 : B.x + B.w * 0.585, cy = mob ? B.y + B.h * 0.66 : B.y + B.h * 0.55, R = mob ? Math.min(B.w * 0.24, B.h * 0.19) : Math.min(B.w * 0.19, B.h * 0.4);
      const ang = (k) => -Math.PI / 2 + k * TAU / 6, pt = (k, v) => [cx + Math.cos(ang(k)) * R * v, cy + Math.sin(ang(k)) * R * v];
      c.save(); c.globalAlpha = 0.3 + 0.7 * vis;
      for (let r = 1; r <= 4; r++) { c.strokeStyle = rgba(HEX.tx, r === 4 ? 0.16 : 0.07); c.lineWidth = 1; c.beginPath(); for (let k = 0; k <= 6; k++) { const p = pt(k % 6, r / 4); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); }
      c.setLineDash([4, 5]); c.strokeStyle = rgba(HEX.amber, 0.75); c.lineWidth = 1.2; c.beginPath(); for (let k = 0; k <= 6; k++) { const p = pt(k % 6, GATE); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); c.setLineDash([]);
      text(c, 'gate 0.6', cx + 6, cy - R * GATE - 5, { size: mob ? 9.5 : 11, col: HEX.amber, w: 600 });
      for (let k = 0; k < 6; k++) {
        const on = k === cur, p = pt(k, 1), lit = clamp(1 - Math.abs(prog - k - 0.5) * 1.6);
        line(c, cx, cy, p[0], p[1], on ? VIO : HEX.tx, on ? 2 : 1, on ? 0.95 : 0.12);
        if (on) glow(c, p[0], p[1], 34, VIO, 0.5);
        const lp = pt(k, 1.13), cs = Math.cos(ang(k)), side = cs > 0.2 ? 'left' : cs < -0.2 ? 'right' : 'center', nm = dims[k][1].toUpperCase();
        const words = nm.split(' '); const lines = mob && words.length > 1 && nm.length > 12 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [nm];
        lines.forEach((ln, q) => text(c, ln, lp[0], lp[1] + (Math.abs(cs) < 0.2 ? (Math.sin(ang(k)) < 0 ? -6 - (lines.length - 1 - q) * 12 : 14 + q * 12) : 4 + q * 12), { size: mob ? 8.5 : 11.5, w: 700, ls: mob ? 0.6 : 1.3, align: side, col: on ? HEX.tx : rgba(HEX.tx, 0.42 + 0.3 * lit) }));
      }
      cands.forEach((cd) => {
        const vals = dims.map((d) => { const v = cd.res[d[0]].score; return v == null ? 0 : v; });
        const n = Math.min(6, prog + 0.4), full = Math.floor(n), part = n - full, verts = [];
        for (let k = 0; k < 6; k++) { const v = k < full ? vals[k] : k === full ? vals[k] * part : 0; verts.push(pt(k, Math.max(0.02, v))); }
        if (s > 0.5) { c.beginPath(); verts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = rgba(cd.col, 0.1); c.fill(); c.strokeStyle = rgba(cd.col, 0.95); c.lineWidth = 2; c.stroke(); }
        verts.forEach((p, k) => { if (k <= Math.min(full, 5) && s > 0.5) { c.fillStyle = k === cur ? '#fff' : cd.col; c.beginPath(); c.arc(p[0], p[1], k === cur ? 5.5 : 3.2, 0, TAU); c.fill(); } });
      });
      c.restore();
      // INPUT + OUTPUTS (left column on desktop, stacked above the instrument on mobile)
      const lx = B.x, lw = mob ? B.w : B.w * 0.33, fs = mob ? 12 : 15, y1 = B.y + (mob ? 38 : 56);
      text(c, '“' + st.sc.prompt + '”', lx, y1, { size: mob ? 14 : 19, w: 600, sans: true, col: HEX.tx });
      if (!mob) wrap(c, 'Evidence: ' + st.sc.context, lx, y1 + 26, lw, 16, { size: 12, col: HEX.dim });
      cands.forEach((cd, i) => {
        const per = Math.min(150, (B.h - 56 - 100) / 2), y = y1 + (mob ? 28 + i * 54 : 100 + i * per), res = cd.res;
        c.fillStyle = cd.col; c.fillRect(lx, y - 12, 2, mob ? 44 : Math.min(130, per - 14));
        text(c, `${cd.tag} · ${cd.b.label.toUpperCase()}`, lx + 12, y, { size: mob ? 9.5 : 11, w: 700, ls: 1.2, col: cd.col });
        wrap(c, cd.b.runs[0], lx + 12, y + (mob ? 16 : 22), lw - 14, mob ? 14 : 19, { size: fs, col: HEX.tx, sans: true });
        if (cur >= 0 && s < 6.5 && !mob && per > 118) { const d = dims[cur], r = res[d[0]], v = r.score; text(c, v == null ? '—' : v.toFixed(2), lx + 12, y + 94, { size: 34, w: 700, col: v != null && v < GATE ? HEX.red : cd.col }); text(c, v != null && v < GATE ? 'below the 0.6 gate' : 'clears the 0.6 gate', lx + 12 + 70, y + 94, { size: 12, col: HEX.mut }); }
      });
      // ASSESSMENT column
      if (!mob) {
        const ax = B.x + B.w * 0.83, aw = B.w * 0.17;
        if (s < 0.5) { text(c, 'ONE AVERAGE', ax, B.y + 70, { size: 11.5, w: 700, ls: 1.6, col: HEX.dim }); cands.forEach((cd, i) => text(c, cd.gate.mean.toFixed(2), ax, B.y + 130 + i * 62, { size: 46, w: 700, col: cd.col })); wrap(c, 'hides which way each output failed', ax, B.y + 270, aw, 18, { size: 13.5, col: HEX.mut, sans: true }); }
        else if (s < 6.5) { const d = dims[cur], a = clamp(1 - Math.abs(s - 1 - cur) * 0.9); text(c, 'ASSESSING', ax, B.y + 70, { size: 11.5, w: 700, ls: 1.6, col: HEX.dim }); wrap(c, d[1], ax, B.y + 104, aw, 28, { size: 24, w: 700, sans: true, col: rgba(HEX.tx, 0.4 + 0.6 * a) }); cands.forEach((cd, i) => wrap(c, `${cd.tag}: ${cd.res[d[0]].notes[0]}`, ax, B.y + 190 + i * 100, aw, 17, { size: 12.5, col: rgba(cd.col, 0.4 + 0.6 * a) })); }
        else { text(c, 'ASSESSMENT', ax, B.y + 70, { size: 11.5, w: 700, ls: 1.6, col: HEX.dim }); text(c, '—', ax, B.y + 130, { size: 46, w: 700, col: HEX.dim }); wrap(c, 'No experimental results exist yet.', ax, B.y + 170, aw, 18, { size: 13.5, col: HEX.mut, sans: true }); }
      } else if (cur >= 0 && s < 6.5) {
        const d = dims[cur]; text(c, `${d[1].toUpperCase()}   ${cands.map((cd) => cd.tag + ' ' + (cd.res[d[0]].score == null ? '—' : cd.res[d[0]].score.toFixed(2))).join('   ')}`, B.x, B.y + B.h - 4, { size: 11.5, w: 700, ls: 0.8, col: HEX.tx });
      }
      if (s >= 6.5) { const a = clamp((s - 6.55) / 0.45); text(c, 'NO SCORES HERE', cx, cy - 4, { size: mob ? 15 : 24, w: 700, ls: 2.4, align: 'center', col: rgba(HEX.tx, a) }); text(c, 'sample · deterministic proxies · not MAREF results', cx, cy + (mob ? 18 : 28), { size: mob ? 9.5 : 12.5, align: 'center', col: rgba(HEX.mut, a) }); }
      text(c, 'ILLUSTRATIVE EXAMPLE — NOT EXPERIMENTAL RESULTS', mob ? B.x : B.x + B.w, B.y + B.h + (mob ? 10 : 22), { size: mob ? 8.5 : 10.5, w: 700, ls: mob ? 0.8 : 1.4, align: mob ? 'left' : 'right', col: rgba(VIO, 0.95) });
    },
  };
  window.RMW.register('maref', scenes.maref);
})();
