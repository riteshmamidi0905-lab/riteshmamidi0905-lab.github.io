/* scene-maref.js — MAREF chapter. eval-core.js scores two recorded sample outputs (authored fixtures, not live model calls) on the six
   dimensions with deterministic proxy heuristics. Scroll activates one dimension at a time and shows what each proxy found.
   Nothing here is an experimental MAREF result; the last step says so on screen. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line, FONT } = H;
  const GATE = 0.6;

  function build(st) {
    const E = window.RMLab.evalCore, sc = E.SCENARIOS[0], pick = (id) => sc.behaviours.find((b) => b.id === id);
    st.sc = sc; st.cands = [{ b: pick('grounded'), col: HEX.ac2 }, { b: pick('hallucinated'), col: HEX.red }].map((o) => {
      const res = E.evaluate(sc, o.b.runs[0], o.b.trace, o.b.runs), g = E.gate(res);
      return { ...o, res, gate: g };
    });
    st.dims = E.DIMENSIONS;
  }

  scenes.maref = {
    tint: HEX.violet,
    init(w) { build(w.state); },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile, cands = st.cands, dims = st.dims;
      const cx = B.x + B.w * (mob ? 0.5 : 0.66), cy = B.y + B.h * (mob ? 0.74 : 0.5), R = Math.min(mob ? B.w * 0.27 : B.w * 0.26, B.h * (mob ? 0.25 : 0.46));
      const vis = 1 - clamp((s - 6.6) / 0.6), cur = clamp(Math.round(s) - 1, -1, 5), prog = clamp(s - 0.5, 0, 6);
      const ang = (k) => -Math.PI / 2 + k * TAU / 6, pt = (k, v) => [cx + Math.cos(ang(k)) * R * v, cy + Math.sin(ang(k)) * R * v];
      c.save(); c.globalAlpha = 0.25 + 0.75 * vis;
      // axes and gate ring
      for (let r = 1; r <= 4; r++) { c.strokeStyle = rgba(HEX.tx, 0.06); c.lineWidth = 1; c.beginPath(); for (let k = 0; k <= 6; k++) { const p = pt(k % 6, r / 4); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); }
      c.setLineDash([5, 5]); c.strokeStyle = rgba(HEX.amber, 0.7); c.lineWidth = 1.2; c.beginPath(); for (let k = 0; k <= 6; k++) { const p = pt(k % 6, GATE); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); c.setLineDash([]);
      text(c, `gate ${GATE}`, cx + 8, cy - R * GATE - 6, { size: 10, col: HEX.amber, w: 700 });
      for (let k = 0; k < 6; k++) {
        const on = k === cur, p = pt(k, 1), lit = clamp(1 - Math.abs(prog - k - 0.5) * 1.6);
        line(c, cx, cy, p[0], p[1], on ? HEX.violet : HEX.tx, on ? 2 : 1, on ? 0.9 : 0.12);
        if (on) glow(c, p[0], p[1], 36, HEX.violet, 0.45);
        const lp = pt(k, 1.14), side = Math.cos(ang(k)) > 0.2 ? 'left' : Math.cos(ang(k)) < -0.2 ? 'right' : 'center';
        text(c, dims[k][1].toUpperCase(), lp[0], lp[1] + (Math.abs(Math.cos(ang(k))) < 0.2 ? (Math.sin(ang(k)) < 0 ? -4 : 12) : 4), { size: mob ? 9 : 11, w: 700, ls: 1.2, align: mob && side !== 'center' ? (side === 'left' ? 'right' : 'left') : side, col: on ? HEX.tx : rgba(HEX.tx, 0.4 + 0.3 * lit) });
      }
      // polygons: dimension k appears when the scroll reaches it
      cands.forEach((cd) => {
        const vals = dims.map((d) => { const v = cd.res[d[0]].score; return v == null ? 0 : v; });
        const n = Math.min(6, prog + 0.4), full = Math.floor(n), part = n - full;
        const verts = []; for (let k = 0; k < 6; k++) { const v = k < full ? vals[k] : k === full ? vals[k] * part : 0; verts.push(pt(k, Math.max(0.02, v))); }
        if (s > 0.5) { c.beginPath(); verts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = rgba(cd.col, 0.12); c.fill(); c.strokeStyle = rgba(cd.col, 0.95); c.lineWidth = 2.2; c.stroke(); }
        verts.forEach((p, k) => { if (k <= Math.min(full, 5) && s > 0.5) { c.fillStyle = k === cur ? '#fff' : cd.col; c.beginPath(); c.arc(p[0], p[1], k === cur ? 5 : 3, 0, TAU); c.fill(); } });
      });
      c.restore();
      // left column: the two recorded outputs
      const lx = B.x, lw = B.w * (mob ? 0.92 : 0.4), ly = B.y + (mob ? 0 : B.h * 0.06), fs = mob ? 11 : 13;
      text(c, 'SAME QUESTION · TWO RECORDED OUTPUTS', lx, ly, { size: 10, w: 700, ls: 1.2, col: HEX.dim });
      wrap(c, `“${st.sc.prompt}”`, lx, ly + 24, lw, fs + 6, { size: fs + 1, w: 600, col: HEX.tx, sans: true });
      cands.forEach((cd, i) => {
        const y = ly + (mob ? 60 : 84) + i * (mob ? 62 : 118), res = cd.res;
        c.fillStyle = cd.col; c.fillRect(lx, y - 10, 3, mob ? 46 : 80);
        text(c, cd.b.label.toUpperCase(), lx + 12, y, { size: 10, w: 700, ls: 1.2, col: cd.col });
        wrap(c, cd.b.runs[0], lx + 12, y + 18, lw - 14, fs + 4, { size: fs, col: HEX.mut });
        const k = cur;
        if (k >= 0 && s < 6.6) { const d = dims[k], r = res[d[0]], sc = r.score; text(c, `${d[1]}  ${sc == null ? '—' : sc.toFixed(2)}`, lx + 12, y + (mob ? 46 : 62), { size: mob ? 12 : 14, w: 700, col: sc != null && sc < GATE ? HEX.red : cd.col }); if (!mob) wrap(c, r.notes[0], lx + 12, y + 80, lw - 14, 15, { size: 11, col: HEX.mut }); }
      });
      // average vs gate
      if (s < 0.6 || s > 6.5) {
        const a = clamp(s < 0.6 ? 1 - s / 0.6 : (s - 6.5) / 0.5), y = B.y + B.h * (mob ? 0.42 : 0.88);
        if (s < 0.6) cands.forEach((cd, i) => text(c, `mean ${cd.gate.mean.toFixed(2)}`, cx + (i ? 90 : -90), cy + 6, { size: mob ? 20 : 30, w: 700, align: 'center', col: rgba(cd.col, a) }));
        if (s > 6.5) { text(c, 'NO SCORES HERE', cx, cy - 4, { size: mob ? 14 : 22, w: 700, ls: 2, align: 'center', col: rgba(HEX.tx, a) }); text(c, 'sample · deterministic proxies · not MAREF results', cx, cy + 22, { size: mob ? 10 : 12, align: 'center', col: rgba(HEX.mut, a) }); }
      }
      text(c, 'ILLUSTRATIVE EXAMPLE · NOT EXPERIMENTAL RESULTS', mob ? B.x : B.x + B.w, mob ? B.y + B.h + 18 : L.H - 118, { size: mob ? 9 : 10, w: 700, ls: 1.3, align: mob ? 'left' : 'right', col: rgba(HEX.violet, 0.95) });
      st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
    },
  };
  window.RMW.register('maref', scenes.maref);
})();
