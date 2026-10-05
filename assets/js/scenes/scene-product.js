/* scene-product.js — Product intelligence chapter. funnel-core.js (funnel, what-if, retention model) and stats-core.js
   (two-proportion z-test, guardrail decision rule) compute everything shown. The experiment's users are a seeded SYNTHETIC
   sample (labelled on screen); the statistics applied to it are the real ones and update as the sample grows with scroll. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, line, rand } = H;
  const F = () => window.RMLab.funnelCore, T = () => window.RMLab.statsCore;
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n));
  const NMAX = 24000, PC = 0.1, PT = 0.116, GC = 0.04, GT = 0.041;

  scenes.product = {
    tint: HEX.amber,
    init(w) {
      const r = rand(5), st = w.state, mk = (p, n) => { const a = new Uint32Array(n + 1); for (let i = 0; i < n; i++) a[i + 1] = a[i] + (r() < p ? 1 : 0); return a; };
      st.xc = mk(PC, NMAX); st.xt = mk(PT, NMAX); st.gc = mk(GC, NMAX); st.gt = mk(GT, NMAX); st.base = F().run({});
    },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile, base = st.base;
      const aF = 1 - clamp((s - 1.2) / 0.4), aR = clamp((s - 1.3) / 0.4) * (1 - clamp((s - 2.3) / 0.4)), aE = clamp((s - 2.4) / 0.4);
      if (aF > 0.01) this.funnel(c, L, B, mob, t, s, st, aF);
      if (aR > 0.01) this.retention(c, L, B, mob, t, s, st, aR);
      if (aE > 0.01) this.experiment(c, L, B, mob, t, s, st, aE);
      st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
    },
    funnel(c, L, B, mob, t, s, st, A) {
      c.save(); c.globalAlpha = A;
      const lift = ease(clamp(s - 0.9, 0, 1)) * 0.1, p = { activation: st.base.params.activation + lift }, run = F().run(p), wi = F().whatIf({}, 'activation', lift);
      const n = 4, stages = F().STAGES, show = clamp(s + 1.0, 0, 4);
      const x0 = B.x, W = B.w * (mob ? 1 : 0.62), colW = W / n, maxH = B.h * (mob ? 0.62 : 0.78), cy = B.y + B.h * (mob ? 0.34 : 0.5);
      const hs = run.counts.map((v) => Math.max(4, maxH * Math.pow(v / run.counts[0], 0.42)));
      for (let i = 0; i < n; i++) {
        const k = clamp(show - i), xL = x0 + i * colW, xR = xL + colW, h0 = hs[i], h1 = i < n - 1 ? hs[i + 1] : hs[i] * 0.8;
        c.fillStyle = rgba(i === run.leakIdx || i - 1 === run.leakIdx ? HEX.amber : HEX.ac, 0.1 + 0.2 * k); c.strokeStyle = rgba(HEX.ac2, 0.7 * k); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(xL, cy - h0 / 2 * k); c.lineTo(xR - 6, cy - h1 / 2 * k); c.lineTo(xR - 6, cy + h1 / 2 * k); c.lineTo(xL, cy + h0 / 2 * k); c.closePath(); c.fill(); c.stroke();
        for (let q = 0; q < 8; q++) { const u = ((t * 0.3 + q / 8 + i * 0.13) % 1), yy = cy + (((q * 0.37) % 1) - 0.5) * h0 * 0.8 * k; c.fillStyle = rgba(HEX.ac2, 0.5 * k); c.fillRect(lerp(xL, xR - 6, u), yy * 1, 2, 2); }
        text(c, stages[i].toUpperCase(), xL + 6, cy - maxH / 2 - 18, { size: mob ? 10 : 12, w: 700, ls: 1.4, col: rgba(HEX.tx, 0.4 + 0.6 * k) });
        text(c, fmt(run.counts[i]), xL + 6, cy + 5, { size: mob ? 16 : 24, w: 700, col: rgba(HEX.tx, k) });
        if (i < 3) text(c, (run.stepRates[i] * 100).toFixed(1) + '% continue', xL + 6, cy + maxH / 2 + 24, { size: mob ? 10 : 12, col: rgba(HEX.mut, k) });
      }
      text(c, `biggest leak: ${run.leak}`, x0 + 6, cy + maxH / 2 + (mob ? 44 : 48), { size: mob ? 11 : 13, w: 700, col: HEX.amber });
      const rx = mob ? B.x : B.x + B.w * 0.68, ry = mob ? B.y + B.h * 0.8 : B.y + B.h * 0.22, fs = mob ? 12 : 14;
      text(c, 'WHAT-IF · lift activation', rx, ry, { size: 11, w: 700, ls: 1.4, col: HEX.dim });
      text(c, `${(p.activation * 100).toFixed(1)}%`, rx, ry + (mob ? 26 : 42), { size: mob ? 22 : 36, w: 700, col: HEX.ac2 });
      text(c, `+${(lift * 100).toFixed(1)} pp → revenue ${wi.deltaPct >= 0 ? '+' : ''}${(wi.deltaPct * 100).toFixed(1)}%`, rx, ry + (mob ? 46 : 70), { size: fs, w: 600, col: HEX.tx });
      text(c, `${fmt(run.revenue)} / period · model ${'funnel-core'}`, rx, ry + (mob ? 62 : 92), { size: 11, col: HEX.mut });
      c.restore();
    },
    retention(c, L, B, mob, t, s, st, A) {
      c.save(); c.globalAlpha = A; const base = st.base, curve = base.ret.curve, k = ease(clamp((s - 1.5) / 0.7));
      const gx = B.x + (mob ? 30 : 70), gy = B.y + B.h * 0.08, gw = B.w * (mob ? 0.9 : 0.62) - 40, gh = B.h * (mob ? 0.62 : 0.74);
      line(c, gx, gy + gh, gx + gw, gy + gh, HEX.tx, 1, 0.3); line(c, gx, gy, gx, gy + gh, HEX.tx, 1, 0.3);
      [0.25, 0.5, 0.75, 1].forEach((v) => { line(c, gx, gy + gh * (1 - v), gx + gw, gy + gh * (1 - v), HEX.tx, 1, 0.07); text(c, (v * 100) + '%', gx - 8, gy + gh * (1 - v) + 4, { size: 10, align: 'right', col: HEX.dim }); });
      const nShow = Math.floor(curve.length * k), grad = c.createLinearGradient(0, gy, 0, gy + gh); grad.addColorStop(0, rgba(HEX.amber, 0.28)); grad.addColorStop(1, rgba(HEX.amber, 0));
      c.beginPath(); c.moveTo(gx, gy + gh); for (let d = 0; d < nShow; d++) c.lineTo(gx + gw * d / 59, gy + gh * (1 - curve[d])); c.lineTo(gx + gw * Math.max(0, nShow - 1) / 59, gy + gh); c.closePath(); c.fillStyle = grad; c.fill();
      c.strokeStyle = HEX.amber; c.lineWidth = 2.4; c.beginPath(); for (let d = 0; d < nShow; d++) { const x = gx + gw * d / 59, y = gy + gh * (1 - curve[d]); d ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      [[1, 'D1'], [30, 'D30']].forEach(([d, lab]) => { if (nShow >= d) { const x = gx + gw * (d - 1) / 59, y = gy + gh * (1 - curve[d - 1]); glow(c, x, y, 16, HEX.amber, 0.5); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); text(c, `${lab} ${(curve[d - 1] * 100).toFixed(0)}%`, x + 10, y - 10, { size: 12, w: 700, col: HEX.tx }); } });
      text(c, 'DAYS SINCE SIGNUP', gx + gw, gy + gh + 22, { size: 10, align: 'right', ls: 1.4, col: HEX.dim });
      const rx = mob ? B.x : B.x + B.w * 0.7, ry = mob ? B.y + B.h * 0.86 : B.y + B.h * 0.2;
      text(c, 'POWER-LAW FIT FROM D1 + D30', rx, ry, { size: 11, w: 700, ls: 1.2, col: HEX.dim });
      text(c, `decay α = ${base.ret.alpha.toFixed(2)}`, rx, ry + (mob ? 20 : 34), { size: mob ? 14 : 22, w: 700, col: HEX.tx });
      text(c, `LTV ≈ ${base.ltv.toFixed(0)} per payer (ARPU ÷ churn)`, rx, ry + (mob ? 38 : 62), { size: 12, col: HEX.mut });
      c.restore();
    },
    experiment(c, L, B, mob, t, s, st, A) {
      c.save(); c.globalAlpha = A; const T_ = T(), k = ease(clamp((s - 2.5) / 1.0)), n = Math.max(200, Math.round(NMAX * k));
      const r = T_.proportionsZTest(st.xc[n], n, st.xt[n], n), g = T_.proportionsZTest(st.gc[n], n, st.gt[n], n);
      const gx = B.x + 20, gw = B.w * (mob ? 0.92 : 0.58), gy = B.y + B.h * 0.1, gh = B.h * (mob ? 0.34 : 0.5);
      // sample accumulation: dots grid of the assigned users, converting ones lit
      const cols = mob ? 40 : 90, rows = mob ? 8 : 12, cell = Math.min(gw / cols, gh / rows), shown = Math.round(cols * rows * k);
      for (let i = 0; i < cols * rows; i++) { const q = Math.floor(i * NMAX / (cols * rows)), on = i < shown, hit = st.xt[Math.min(NMAX, q + 20)] - st.xt[q] > 0; c.fillStyle = on ? rgba(hit ? HEX.ac2 : HEX.tx, hit ? 0.9 : 0.22) : rgba(HEX.tx, 0.05); c.fillRect(gx + (i % cols) * cell, gy + Math.floor(i / cols) * cell, cell - 1.5, cell - 1.5); }
      text(c, `SYNTHETIC SAMPLE · ${n.toLocaleString()} users per arm · seeded, not real traffic`, gx, gy - 12, { size: 10, w: 700, ls: 1.1, col: HEX.dim });
      // CI interval vs zero (running, real z-test)
      const iy = gy + gh + (mob ? 48 : 70), lo = r.ciLow, hi = r.ciHigh, rng = 0.03, ix = (v) => gx + gw * (0.5 + v / (2 * rng));
      line(c, gx, iy, gx + gw, iy, HEX.tx, 1, 0.2); line(c, ix(0), iy - 18, ix(0), iy + 18, HEX.red, 1.5, 0.8);
      text(c, 'no effect', ix(0), iy + 34, { size: 10, align: 'center', col: HEX.red });
      const col = r.significant ? HEX.ac2 : HEX.amber; c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.moveTo(clamp(ix(lo), gx, gx + gw), iy); c.lineTo(clamp(ix(hi), gx, gx + gw), iy); c.stroke(); glow(c, ix(r.absEffect), iy, 16, col, 0.4); c.fillStyle = '#fff'; c.beginPath(); c.arc(ix(r.absEffect), iy, 4, 0, TAU); c.fill();
      text(c, '95% CI of the conversion difference (treatment − control)', gx, iy - 28, { size: 10, w: 700, ls: 1.1, col: HEX.dim });
      const rx = mob ? B.x : B.x + B.w * 0.66, ry = mob ? iy + 70 : B.y + B.h * 0.12, fs = mob ? 12 : 14, d = T_.decide(r, [{ name: 'refund rate', higherIsBetter: false, result: g }]);
      const rows2 = [['control', (r.control * 100).toFixed(2) + '%'], ['treatment', (r.treatment * 100).toFixed(2) + '%'], ['z', r.z.toFixed(2)], ['p-value', r.pValue < 0.0001 ? '<0.0001' : r.pValue.toFixed(4)], ['guardrail p', g.pValue.toFixed(3)]];
      rows2.forEach((rw, i) => { text(c, rw[0], rx, ry + i * (mob ? 18 : 26), { size: fs - 1, col: HEX.mut }); text(c, rw[1], rx + (mob ? 100 : 130), ry + i * (mob ? 18 : 26), { size: fs, w: 700, col: HEX.tx }); });
      const dec = clamp((s - 3.3) / 0.6), vy = ry + 5 * (mob ? 18 : 26) + (mob ? 22 : 36);
      text(c, 'DECISION RULE · stats-core decide()', rx, vy - (mob ? 8 : 12), { size: 10, w: 700, ls: 1.1, col: rgba(HEX.dim, 1) });
      text(c, dec > 0.1 ? d.verdict : '…', rx, vy + (mob ? 18 : 30), { size: mob ? 22 : 36, w: 700, col: rgba(d.verdict === 'SHIP' ? HEX.ac2 : d.verdict === 'KILL' ? HEX.red : HEX.amber, 0.3 + 0.7 * dec) });
      if (dec > 0.3 && !mob) { const lines = []; let ln = ''; d.reason.split(' ').forEach((wd) => { if ((ln + ' ' + wd).length > 36) { lines.push(ln); ln = wd; } else ln = ln ? ln + ' ' + wd : wd; }); lines.push(ln); lines.forEach((l, i) => text(c, l, rx, vy + 56 + i * 16, { size: 12, col: rgba(HEX.mut, dec) })); }
      c.restore();
    },
  };
  window.RMW.register('product', scenes.product);
})();
