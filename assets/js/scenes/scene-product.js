/* scene-product.js — Product intelligence chapter. funnel-core.js (funnel, what-if, retention model) and stats-core.js
   (two-proportion z-test, guardrail decision rule) compute everything shown. The experiment's users are a seeded SYNTHETIC
   sample (labelled on screen); the statistics applied to it are the real ones and update as the sample grows with scroll.
   Causality: traffic → activation lever → retention shape → experiment evidence → decision rule. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line, rand } = H;
  const F = () => window.RMLab.funnelCore, T = () => window.RMLab.statsCore;
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n));
  const NMAX = 24000, PC = 0.1, PT = 0.116, GC = 0.04, GT = 0.041;

  scenes.product = {
    tint: HEX.amber, still: 4,
    init(w) {
      const r = rand(5), st = w.state, mk = (p, n) => { const a = new Uint32Array(n + 1); for (let i = 0; i < n; i++) a[i + 1] = a[i] + (r() < p ? 1 : 0); return a; };
      st.xc = mk(PC, NMAX); st.xt = mk(PT, NMAX); st.gc = mk(GC, NMAX); st.gt = mk(GT, NMAX); st.base = F().run({});
    },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile;
      const aF = 1 - clamp((s - 1.5) / 0.2), aR = clamp((s - 1.7) / 0.2) * (1 - clamp((s - 2.5) / 0.2)), aE = clamp((s - 2.7) / 0.2);
      if (aF > 0.01) funnel(c, L, B, mob, t, s, st, aF);
      if (aR > 0.01) retention(c, L, B, mob, t, s, st, aR);
      if (aE > 0.01) experiment(c, L, B, mob, t, s, st, aE);
      st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
    },
  };

  function funnel(c, L, B, mob, t, s, st, A) {
    c.save(); c.globalAlpha = A;
    const lift = ease(clamp((s - 0.7) / 0.9)) * 0.1, base = st.base, run = F().run({ activation: base.params.activation + lift }), wi = F().whatIf({}, 'activation', lift);
    const stages = F().STAGES, n = 4, show = clamp(s + 1.0, 0, 4), P = run.params;
    const names = ['VISITORS', 'ACTIVATED', 'RETAINED · D30', 'PAYING'];
    if (mob) {
      const rowH = B.h * 0.17, x0 = B.x, maxW = B.w;
      for (let i = 0; i < n; i++) {
        const k = clamp(show - i), y = B.y + 8 + i * rowH, w = Math.max(6, maxW * Math.pow(run.counts[i] / run.counts[0], 0.42));
        c.fillStyle = rgba(i === run.leakIdx + 1 ? HEX.amber : HEX.ac, 0.1 + 0.2 * k); c.strokeStyle = rgba(HEX.ac2, 0.7 * k); c.lineWidth = 1.4; c.fillRect(x0, y + 16, w * k, rowH - 30); c.strokeRect(x0, y + 16, w * k, rowH - 30);
        text(c, names[i], x0, y + 10, { size: 10.5, w: 700, ls: 1.4, col: rgba(HEX.tx, 0.4 + 0.6 * k) }); text(c, fmt(run.counts[i]), x0 + 8, y + rowH - 16, { size: 20, w: 700, col: rgba(HEX.tx, k) });
        if (i < 3) text(c, (run.stepRates[i] * 100).toFixed(1) + '% continue', x0 + maxW, y + 10, { size: 10.5, align: 'right', col: rgba(HEX.mut, k) });
      }
      const y = B.y + 4 * rowH + 6; text(c, `WHAT-IF · activation ${(P.activation * 100).toFixed(1)}%  (+${(lift * 100).toFixed(1)} pp)`, B.x, y + 10, { size: 12, w: 700, col: HEX.ac2 }); text(c, `revenue ${wi.deltaPct >= 0 ? '+' : ''}${(wi.deltaPct * 100).toFixed(1)}%`, B.x, y + 32, { size: 19, w: 700, col: HEX.tx });
    } else {
      const W = B.w * 0.64, colW = W / n, maxH = B.h * 0.74, cy = B.y + B.h * 0.5;
      const hs = run.counts.map((v) => Math.max(5, maxH * Math.pow(v / run.counts[0], 0.42)));
      for (let i = 0; i < n; i++) {
        const k = clamp(show - i), xL = B.x + i * colW, xR = xL + colW, h0 = hs[i], h1 = i < n - 1 ? hs[i + 1] : hs[i] * 0.82, leak = i === run.leakIdx;
        c.fillStyle = rgba(leak ? HEX.amber : HEX.ac, 0.06 + 0.2 * k); c.strokeStyle = rgba(leak ? HEX.amber : HEX.ac2, 0.25 + 0.6 * k); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(xL, cy - h0 / 2); c.lineTo(xR - 8, cy - h1 / 2); c.lineTo(xR - 8, cy + h1 / 2); c.lineTo(xL, cy + h0 / 2); c.closePath(); c.fill(); c.stroke();
        for (let q = 0; q < 9; q++) { const u = (t * 0.28 + q / 9 + i * 0.13) % 1, yy = cy + (((q * 0.37) % 1) - 0.5) * h0 * 0.7; c.fillStyle = rgba(HEX.ac2, 0.55 * k); c.fillRect(lerp(xL + 8, xR - 14, u), yy, 2.4, 2.4); }
        text(c, names[i], xL + 8, B.y + 14, { size: 13, w: 700, ls: 1.6, col: rgba(HEX.tx, 0.4 + 0.6 * k) });
        text(c, fmt(run.counts[i]), xL + 8, cy + 14, { size: 38, w: 700, col: rgba(HEX.tx, k) });
        if (i < 3) text(c, (run.stepRates[i] * 100).toFixed(1) + '% continue', xL + 8, B.y + B.h - 8, { size: 12.5, col: rgba(i === run.leakIdx ? HEX.amber : HEX.mut, k) });
      }
      const rx = B.x + B.w * 0.7;
      text(c, 'WHAT-IF · LIFT ACTIVATION', rx, B.y + 36, { size: 12, w: 700, ls: 1.6, col: HEX.dim });
      text(c, (P.activation * 100).toFixed(1) + '%', rx, B.y + 112, { size: 76, w: 700, col: HEX.ac2 });
      text(c, `+${(lift * 100).toFixed(1)} pp activation`, rx, B.y + 148, { size: 18, w: 600, col: HEX.tx });
      text(c, `revenue ${wi.deltaPct >= 0 ? '+' : ''}${(wi.deltaPct * 100).toFixed(1)}%`, rx, B.y + 182, { size: 26, w: 700, col: wi.deltaPct > 0 ? HEX.ac2 : HEX.tx });
      text(c, `${fmt(run.revenue)} per period · funnel-core model`, rx, B.y + 210, { size: 12, col: HEX.mut });
      text(c, `biggest leak: ${run.leak}`, rx, B.y + 262, { size: 14, w: 700, col: HEX.amber });
      text(c, 'Adjustable assumptions, not measured data.', rx, B.y + 284, { size: 12, col: HEX.dim });
    }
    c.restore();
  }

  function retention(c, L, B, mob, t, s, st, A) {
    c.save(); c.globalAlpha = A; const base = st.base, curve = base.ret.curve, k = ease(clamp((s - 1.5) / 0.7));
    const gx = B.x + 46, gy = B.y + 10, gw = B.w * (mob ? 0.9 : 0.62) - 30, gh = B.h * (mob ? 0.56 : 0.8);
    line(c, gx, gy + gh, gx + gw, gy + gh, HEX.tx, 1, 0.3); line(c, gx, gy, gx, gy + gh, HEX.tx, 1, 0.3);
    [0.25, 0.5, 0.75, 1].forEach((v) => { line(c, gx, gy + gh * (1 - v), gx + gw, gy + gh * (1 - v), HEX.tx, 1, 0.07); text(c, (v * 100) + '%', gx - 8, gy + gh * (1 - v) + 4, { size: 11.5, align: 'right', col: HEX.dim }); });
    [1, 7, 14, 30, 60].forEach((d) => text(c, 'D' + d, gx + gw * (d - 1) / 59, gy + gh + 20, { size: 11.5, align: 'center', col: HEX.dim }));
    const nShow = Math.floor(curve.length * k), grad = c.createLinearGradient(0, gy, 0, gy + gh); grad.addColorStop(0, rgba(HEX.amber, 0.3)); grad.addColorStop(1, rgba(HEX.amber, 0));
    c.beginPath(); c.moveTo(gx, gy + gh); for (let d = 0; d < nShow; d++) c.lineTo(gx + gw * d / 59, gy + gh * (1 - curve[d])); c.lineTo(gx + gw * Math.max(0, nShow - 1) / 59, gy + gh); c.closePath(); c.fillStyle = grad; c.fill();
    c.strokeStyle = HEX.amber; c.lineWidth = 3; c.beginPath(); for (let d = 0; d < nShow; d++) { const x = gx + gw * d / 59, y = gy + gh * (1 - curve[d]); d ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    [[1, 'D1'], [30, 'D30']].forEach(([d, lab]) => { if (nShow >= d) { const x = gx + gw * (d - 1) / 59, y = gy + gh * (1 - curve[d - 1]); glow(c, x, y, 20, HEX.amber, 0.5); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill(); text(c, `${lab}  ${(curve[d - 1] * 100).toFixed(0)}%`, x + 12, y - 12, { size: mob ? 13 : 16, w: 700, col: HEX.tx }); } });
    const rx = mob ? B.x : B.x + B.w * 0.7, ry = mob ? B.y + gh + 52 : B.y + 36;
    text(c, 'POWER-LAW FIT · D1 + D30', rx, ry, { size: 12, w: 700, ls: 1.4, col: HEX.dim });
    text(c, `α = ${base.ret.alpha.toFixed(2)}`, rx, ry + (mob ? 34 : 70), { size: mob ? 30 : 60, w: 700, col: HEX.tx });
    text(c, 'a flatter curve means users who stay, stay', rx, ry + (mob ? 56 : 108), { size: mob ? 11.5 : 13.5, col: HEX.mut });
    text(c, `LTV ≈ ${base.ltv.toFixed(0)} per payer (ARPU ÷ churn)`, rx, ry + (mob ? 76 : 134), { size: mob ? 11.5 : 13.5, col: HEX.mut });
    c.restore();
  }

  function experiment(c, L, B, mob, t, s, st, A) {
    c.save(); c.globalAlpha = A; const S_ = T(), k = ease(clamp((s - 2.55) / 0.9)), n = Math.max(200, Math.round(NMAX * k));
    const r = S_.proportionsZTest(st.xc[n], n, st.xt[n], n), g = S_.proportionsZTest(st.gc[n], n, st.gt[n], n), d = S_.decide(r, [{ name: 'refund rate', higherIsBetter: false, result: g }]);
    const gx = B.x, gw = B.w * (mob ? 1 : 0.64), gy = B.y + 28, gh = B.h * (mob ? 0.3 : 0.42);
    text(c, mob ? `TRAFFIC · ${n.toLocaleString()} synthetic users / arm` : `TRAFFIC · ${n.toLocaleString()} synthetic users per arm · seeded, not real`, gx, B.y + 8, { size: mob ? 9.5 : 11.5, w: 700, ls: 1, col: HEX.dim });
    const cols = mob ? 36 : 80, rows = mob ? 8 : 12, cell = Math.min(gw / cols, gh / rows), shown = Math.round(cols * rows * k);
    for (let i = 0; i < cols * rows; i++) { const q = Math.floor(i * NMAX / (cols * rows)), on = i < shown, hit = st.xt[Math.min(NMAX, q + 20)] - st.xt[q] > 0; c.fillStyle = on ? rgba(hit ? HEX.ac2 : HEX.tx, hit ? 0.92 : 0.2) : rgba(HEX.tx, 0.05); c.fillRect(gx + (i % cols) * cell, gy + Math.floor(i / cols) * cell, cell - 1.6, cell - 1.6); }
    // estimate: the running interval of the conversion difference, against "no effect"
    const iy = gy + gh + (mob ? 74 : 110), rng = 0.03, ix = (v) => gx + gw * (0.5 + v / (2 * rng)), col = r.significant ? HEX.ac2 : HEX.amber;
    text(c, '95% INTERVAL · treatment − control conversion', gx, iy - 40, { size: mob ? 9.5 : 11.5, w: 700, ls: 1, col: HEX.dim });
    [-0.02, -0.01, 0, 0.01, 0.02].forEach((v) => { line(c, ix(v), iy - 8, ix(v), iy + 8, HEX.tx, 1, v ? 0.2 : 0); text(c, (v > 0 ? '+' : '') + (v * 100).toFixed(0) + ' pp', ix(v), iy + 28, { size: 10.5, align: 'center', col: HEX.dim }); });
    line(c, gx, iy, gx + gw, iy, HEX.tx, 1, 0.2); line(c, ix(0), iy - 24, ix(0), iy + 24, HEX.red, 2, 0.85); text(c, 'no effect', ix(0), iy - 30, { size: 11.5, align: 'center', col: HEX.red, w: 600 });
    c.strokeStyle = col; c.lineWidth = mob ? 5 : 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(clamp(ix(r.ciLow), gx, gx + gw), iy); c.lineTo(clamp(ix(r.ciHigh), gx, gx + gw), iy); c.stroke(); c.lineCap = 'butt';
    glow(c, ix(r.absEffect), iy, 22, col, 0.45); c.fillStyle = '#fff'; c.beginPath(); c.arc(ix(r.absEffect), iy, 5, 0, TAU); c.fill();
    // numbers + the decision rule
    const rx = mob ? B.x : B.x + B.w * 0.7, ry = mob ? iy + 58 : B.y + 30;
    const rows2 = [['control', (r.control * 100).toFixed(2) + '%'], ['treatment', (r.treatment * 100).toFixed(2) + '%'], ['z', r.z.toFixed(2)], ['p-value', r.pValue < 1e-4 ? '< 0.0001' : r.pValue.toFixed(4)], ['guardrail p', g.pValue.toFixed(3)]];
    const step = mob ? 19 : 31, colw = mob ? B.w / 2 : 0;
    rows2.forEach((rw, i) => { const px = mob ? B.x + (i % 2) * colw : rx, py = ry + (mob ? Math.floor(i / 2) * step : i * step); text(c, rw[0], px, py, { size: mob ? 11 : 13.5, col: HEX.mut }); text(c, rw[1], px + (mob ? 78 : 130), py, { size: mob ? 13 : 18, w: 700, col: HEX.tx }); });
    const dec = clamp((s - 3.3) / 0.6), vy = mob ? ry + 3 * step + 38 : ry + 5 * step + 46;
    text(c, 'DECISION RULE', rx, vy - (mob ? 24 : 36), { size: mob ? 9.5 : 11.5, w: 700, ls: 1.4, col: HEX.dim });
    text(c, dec > 0.1 ? d.verdict : '· · ·', rx, vy + (mob ? 4 : 18), { size: mob ? 28 : 54, w: 700, col: rgba(d.verdict === 'SHIP' ? HEX.ac2 : d.verdict === 'KILL' ? HEX.red : HEX.amber, 0.3 + 0.7 * dec) });
    if (dec > 0.3) wrap(c, d.reason, mob ? B.x + B.w * 0.42 : rx, mob ? vy - 12 : vy + 44, mob ? B.w * 0.56 : B.w * 0.3, mob ? 14 : 18, { size: mob ? 11 : 13.5, col: rgba(HEX.mut, dec), sans: true });
    c.restore();
  }
  window.RMW.register('product', scenes.product);
})();
