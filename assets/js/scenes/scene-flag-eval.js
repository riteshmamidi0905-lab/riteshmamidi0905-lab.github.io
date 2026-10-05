/* scene-flag-eval.js — LLM Evaluation Framework. Personality: outputs travelling through evaluation dimensions and gates.
   Nine recorded sample outputs (3 test cases × 3 behaviours — authored fixtures, not live model calls) are scored by the real
   eval-core.js proxies on six dimensions and drawn as parallel lines through six axes with the 0.6 gate. Hard gates, no averaging:
   an output passes only if every measurable dimension clears its own threshold. */
(() => {
  'use strict';
  const { H, scenes, kit } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line } = H;
  const COL = [HEX.ac2, HEX.red, HEX.amber], GATE = 0.6;
  const SHORT = ['TASK ACC.', 'GROUNDED', 'HALLUC.', 'INSTRUCT.', 'CONSIST.', 'COMPLETE'];

  scenes['flag-eval'] = {
    tint: HEX.violet, still: 3,
    init(w) {
      const E = window.RMLab.evalCore, st = w.state; st.dims = E.DIMENSIONS; st.C = [];
      E.SCENARIOS.forEach((sc, ci) => sc.behaviours.forEach((b, bi) => { const res = E.evaluate(sc, b.runs[0], b.trace, b.runs); st.C.push({ ci, bi, sc, b, res, g: E.gate(res), col: COL[bi] }); }));
      st.cases = E.SCENARIOS;
    },
    draw(c, L, t, s, st) {
      const A = kit.rail(c, L, ['Test cases', 'Model outputs', 'Rubric judge', 'Scores', 'Dashboard'], s, HEX.violet), mob = L.mobile, C = st.C, dims = st.dims;
      const chartA = clamp((s - 1.3) / 0.3) * (1 - clamp((s - 3.6) / 0.4)), matA = clamp((s - 3.7) / 0.4), caseA = 1 - clamp((s - 0.3) / 0.3), outA = clamp((s - 0.7) / 0.3) * (1 - clamp((s - 1.3) / 0.3));
      const cx = A.x + (mob ? 36 : 54), cw = mob ? A.w - 36 - 34 : A.w * 0.76 - 54, cy = A.y + (mob ? 40 : 60), ch = A.h * (mob ? 0.62 : 0.9) - (mob ? 40 : 60);
      const X = (k) => cx + cw * k / 5, Y = (v) => cy + ch * (1 - v), prog = clamp((s - 1.7) / 1.3) * 5;
      // axes + gate
      if (chartA > 0) {
        c.save(); c.globalAlpha = chartA * (0.3 + 0.7 * clamp((s - 0.5) / 0.6));
        for (let k = 0; k < 6; k++) { const on = prog >= k - 0.01 && s > 1.7; line(c, X(k), cy, X(k), cy + ch, on ? HEX.violet : HEX.tx, on ? 1.6 : 1, on ? 0.8 : 0.16); const nm = dims[k][1].toUpperCase(); if (mob) text(c, SHORT[k], X(k), cy - 10, { size: 8.5, w: 700, ls: 0.3, align: 'center', col: on ? HEX.tx : HEX.dim }); else { const parts = nm.length > 14 ? [nm.split(' ')[0], nm.split(' ').slice(1).join(' ')] : [nm]; parts.forEach((pt, q) => text(c, pt, X(k), cy - 26 + q * 14 - (parts.length - 1) * 14 + 14, { size: 11.5, w: 700, ls: 1.3, align: 'center', col: on ? HEX.tx : HEX.dim })); } }
        [0, 0.25, 0.5, 0.75, 1].forEach((v) => text(c, v.toFixed(2).replace('0.00', '0').replace('1.00', '1'), cx - 10, Y(v) + 4, { size: 10.5, align: 'right', col: HEX.dim }));
        c.setLineDash([6, 5]); line(c, cx, Y(GATE), cx + cw, Y(GATE), HEX.amber, 1.4, 0.85, [6, 5]); c.setLineDash([]); text(c, 'gate 0.6', mob ? cx + cw : cx + cw + 8, mob ? Y(GATE) - 6 : Y(GATE) + 4, { size: 11.5, w: 700, align: mob ? 'right' : 'left', col: HEX.amber });
        // polylines drawn left → right as the judge reaches each axis
        if (s > 1.6) C.forEach((cd) => {
          const vals = dims.map((d) => { const v = cd.res[d[0]].score; return v == null ? 0 : v; }), last = Math.min(5, prog);
          c.lineWidth = mob ? 1.8 : 2.4; c.lineJoin = 'round';
          for (let k = 0; k < 5; k++) { const a = clamp(last - k); if (a <= 0) break; const x1 = X(k), y1 = Y(vals[k]), x2 = lerp(X(k), X(k + 1), a), y2 = lerp(y1, Y(vals[k + 1]), a), bad = vals[k] < GATE || (a >= 1 && vals[k + 1] < GATE); c.strokeStyle = rgba(s > 2.9 && bad ? HEX.red : cd.col, s > 2.9 ? (bad ? 0.95 : 0.55) : 0.8); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
          for (let k = 0; k <= Math.min(5, Math.floor(last)); k++) { c.fillStyle = vals[k] < GATE && s > 2.9 ? HEX.red : cd.col; c.beginPath(); c.arc(X(k), Y(vals[k]), mob ? 2.4 : 3.4, 0, TAU); c.fill(); }
        });
        // the judge's cursor
        if (s > 1.6 && s < 3.1) { const k = clamp(Math.floor(prog + 0.01), 0, 5); glow(c, X(prog), cy + ch / 2, 70, HEX.violet, 0.1); }
        c.restore();
      }
      // right rail: what the judge is doing
      const rx = mob ? A.x : A.x + A.w * 0.84, rw = mob ? A.w : A.w * 0.16, ry = mob ? cy + ch + 34 : cy;
      if (chartA > 0.05) {
        c.save(); c.globalAlpha = chartA;
        if (s >= 1.6 && s < 3.2) { const k = clamp(Math.floor(prog + 0.01), 0, 5), d = dims[k]; kit.label(c, 'JUDGING', rx, ry - (mob ? 0 : 0)); wrap(c, d[1], rx, ry + (mob ? 26 : 34), rw, mob ? 22 : 26, { size: mob ? 19 : 22, w: 700, sans: true, col: HEX.tx }); const failing = C.filter((cd) => (cd.res[d[0]].score == null ? 1 : cd.res[d[0]].score) < GATE).length; text(c, `${failing} of ${C.length} outputs below the gate`, rx, ry + (mob ? 70 : 100), { size: mob ? 11 : 12.5, col: failing ? HEX.red : HEX.ac2 }); }
        else if (s >= 3.2) { kit.label(c, 'READING', rx, ry); [['A grounded answer', COL[0]], ['B fluent but invented', COL[1]], ['C correct but off-format', COL[2]]].forEach((q, i) => { const yy = ry + 26 + i * (mob ? 18 : 28); c.fillStyle = q[1]; c.fillRect(rx, yy - 8, 14, 3); text(c, q[0], rx + 22, yy - 3, { size: mob ? 11 : 12.5, col: HEX.mut }); }); text(c, 'red = below the gate', rx, ry + 26 + 3 * (mob ? 18 : 28), { size: mob ? 11 : 12.5, col: HEX.red }); }
        c.restore();
      }
      // step 0: the test cases themselves
      if (caseA > 0.01) { c.save(); c.globalAlpha = caseA; const y0 = cy + 6, per = mob ? 66 : Math.min(112, (A.h - 40) / 3); st.cases.forEach((cs, i) => { const y = y0 + i * per, x = A.x + (mob ? 0 : A.w * 0.3);
        text(c, String(i + 1).padStart(2, '0'), x, y + 4, { size: mob ? 12 : 14, w: 700, col: HEX.violet }); text(c, cs.title, x + 40, y + 4, { size: mob ? 14 : 22, w: 700, sans: true, col: HEX.tx }); wrap(c, '“' + cs.prompt + '”', x + 40, y + (mob ? 22 : 30), A.w * (mob ? 0.8 : 0.4), 17, { size: mob ? 11.5 : 13.5, col: HEX.mut, sans: true }); text(c, `must include ${(cs.constraints.mustInclude || []).join(', ')} · ≤ ${cs.constraints.maxWords} words · cite evidence`, x + 40, y + (mob ? 44 : 56), { size: mob ? 10 : 11.5, col: HEX.dim }); }); c.restore(); }
      // step 1: the three behaviours recorded for each case
      if (outA > 0.01) { c.save(); c.globalAlpha = outA; const per = mob ? 66 : Math.min(112, (A.h - 40) / 3); st.cases.forEach((cs, i) => { const y = cy + 6 + i * per; text(c, cs.title.toUpperCase(), A.x + (mob ? 0 : A.w * 0.3), y, { size: mob ? 10 : 11.5, w: 700, ls: 1.2, col: HEX.dim }); cs.behaviours.forEach((b, j) => { const bx = A.x + (mob ? 0 : A.w * 0.3) + (mob ? 0 : j * A.w * 0.23), by = y + (mob ? 14 + j * 17 : 24); text(c, b.label, bx, by, { size: mob ? 10 : 12, w: 700, col: COL[j] }); if (!mob) kit.wrapN(c, b.runs[0], bx, by + 20, A.w * 0.21, 16, { size: 12, col: HEX.mut, sans: true }, 3); }); }); c.restore(); }
      // step 4: the verdict matrix — typography and rules, not tiles
      if (matA > 0.01) { c.save(); c.globalAlpha = matA; const per = mob ? 78 : Math.min(120, (A.h - 56) / 3), x0 = A.x, cwid = mob ? A.w / 3 : A.w * 0.8 / 3, y0 = A.y + 32;
        kit.label(c, mob ? 'GATE · every dimension must clear' : 'GATE · every dimension must clear its own threshold', A.x, A.y + 8);
        st.cases.forEach((cs, i) => { const y = y0 + i * per; line(c, x0, y - 8, x0 + A.w, y - 8, HEX.tx, 1, 0.12); if (!mob) text(c, cs.title, x0, y + 20, { size: 15, w: 700, sans: true, col: HEX.tx }); C.filter((q) => q.ci === i).forEach((cd, j) => { const bx = (mob ? x0 : x0 + A.w * 0.22) + j * cwid * (mob ? 1 : 1.0), ok = cd.g.pass; text(c, ok ? 'PASS' : 'FAIL', bx, y + (mob ? 28 : 36), { size: mob ? 22 : 38, w: 700, col: ok ? HEX.ac2 : HEX.red }); text(c, kit.fit(c, cd.b.label, cwid - 10, '600 ' + (mob ? 10 : 12) + 'px ' + H.FONT), bx, y + (mob ? 46 : 58), { size: mob ? 10 : 12, w: 600, col: COL[cd.bi] }); text(c, kit.fit(c, ok ? 'all dimensions clear' : 'weakest: ' + cd.g.weakest.label, cwid - 10, '500 ' + (mob ? 9.5 : 11.5) + 'px ' + H.FONT), bx, y + (mob ? 60 : 76), { size: mob ? 9.5 : 11.5, col: ok ? HEX.mut : HEX.red }); }); });
        c.restore(); }
      kit.tag(c, L, 'RECORDED SAMPLE OUTPUTS · DETERMINISTIC PROXY METRICS · NOT LIVE MODEL CALLS', 'RECORDED SAMPLES · DETERMINISTIC PROXIES · NOT LIVE MODEL CALLS'); kit.cam(st, L);
    },
  };
  window.RMW.register('flag-eval', scenes['flag-eval']);
})();
