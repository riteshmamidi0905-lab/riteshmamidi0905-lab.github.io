/* scene-flag-ab.js — Experimentation Toolkit. Personality: traffic allocation, distributions, uncertainty, decisions.
   Real stats-core.js maths on a seeded SYNTHETIC sample of 6,000 users: hash-based assignment splits traffic, each arm's estimate is
   drawn as a distribution that narrows as users accumulate, the z-test measures how far apart they are, CUPED (implemented here on a
   synthetic pre-experiment covariate) narrows the interval further, and the decision rule weighs the primary metric against a guardrail. */
(() => {
  'use strict';
  const { H, scenes, kit } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line, rand } = H;
  const NAMES = ['Design + power', 'Assignment', 'z / Welch / bootstrap', 'CUPED + guardrails', 'Scorecard'], BLUE = HEX.blue, GRN = HEX.ac2;
  const pdf = (x, m, sd) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(TAU));

  scenes['flag-ab'] = {
    tint: HEX.amber, still: 4,
    init(w) {
      const st = w.state, r = rand(8), N = 6000; st.N = N;
      st.users = Array.from({ length: N }, (_, i) => { const u = { arm: kit.hash('exp1:u' + i) < 0.5 ? 0 : 1, x: kit.gauss(r) }; u.pre = 20 + 3.2 * u.x + kit.gauss(r) * 1.5; u.y = u.pre + (u.arm ? 0.5 : 0) + kit.gauss(r) * 2; u.conv = r() < (u.arm ? 0.116 : 0.1) ? 1 : 0; u.ref = r() < (u.arm ? 0.041 : 0.04) ? 1 : 0; return u; });
      let mx = 0, my = 0; st.users.forEach((u) => { mx += u.pre; my += u.y; }); mx /= N; my /= N; let cv = 0, vx = 0; st.users.forEach((u) => { cv += (u.pre - mx) * (u.y - my); vx += (u.pre - mx) ** 2; });
      st.theta = cv / vx; st.mx = mx;
      const eff = (f) => { const g = (arm) => { let m = 0, n = 0; st.users.forEach((u) => { if (u.arm === arm) { m += f(u); n++; } }); m /= n; let v = 0; st.users.forEach((u) => { if (u.arm === arm) v += (f(u) - m) ** 2; }); return { m, se2: v / (n - 1) / n }; }; const a = g(0), b = g(1); return { d: b.m - a.m, se: Math.sqrt(a.se2 + b.se2) }; };
      st.raw = eff((u) => u.y); st.cup = eff((u) => u.y - st.theta * (u.pre - st.mx));
    },
    draw(c, L, t, s, st) {
      const A = kit.rail(c, L, NAMES, s, HEX.amber), mob = L.mobile, S = window.RMLab.statsCore, U = st.users, N = st.N, fs = mob ? 12 : 15;
      const stats = (n) => { n = Math.min(n, N); let xc = 0, nc = 0, xt = 0, nt = 0, gc = 0, gt = 0; for (let i = 0; i < n; i++) { const u = U[i]; if (u.arm) { nt++; xt += u.conv; gt += u.ref; } else { nc++; xc += u.conv; gc += u.ref; } } return { r: S.proportionsZTest(xc, nc, xt, nt), g: S.proportionsZTest(gc, nc, gt, nt), nc, nt }; };
      const stage = (i, f) => { const a = clamp(1 - Math.abs(s - i) * 1.5); if (a > 0.02) { c.save(); c.globalAlpha = a; f(); c.restore(); } };
      const cx = A.x + (mob ? 4 : 10), cw = A.w * (mob ? 0.93 : 0.64), cy = A.y + 24, ch = mob ? A.h * 0.5 : A.h * 0.82;
      const side = (i, lines) => { const rx = mob ? A.x : A.x + A.w * 0.7, ry = mob ? cy + ch + (i === 0 ? 40 : 42) : cy + 4; lines.forEach((ln, k) => { const y = mob ? ry + k * 38 : ry + k * 86; kit.label(c, ln[0], mob ? A.x + (k % 2) * A.w * 0.5 : rx, mob ? ry + Math.floor(k / 2) * 52 : y); text(c, ln[1], mob ? A.x + (k % 2) * A.w * 0.5 : rx, mob ? ry + Math.floor(k / 2) * 52 + 28 : y + 44, { size: mob ? 24 : 40, w: 700, col: ln[2] || HEX.tx }); if (ln[3]) text(c, ln[3], mob ? A.x + (k % 2) * A.w * 0.5 : rx, mob ? ry + Math.floor(k / 2) * 52 + 42 : y + 66, { size: mob ? 10 : 12.5, col: HEX.mut }); }); };
      const axis = (lo, hi, ticks, fmt, y) => { line(c, cx, y, cx + cw, y, HEX.tx, 1, 0.25); ticks.forEach((v) => { const x = cx + cw * (v - lo) / (hi - lo); line(c, x, y, x, y + 5, HEX.tx, 1, 0.3); text(c, fmt(v), x, y + 20, { size: 10.5, align: 'center', col: HEX.dim }); }); };
      const bell = (m, sd, lo, hi, peak, col, fill, lw) => { const base = cy + ch; c.beginPath(); for (let k = 0; k <= 120; k++) { const v = lo + (hi - lo) * k / 120, x = cx + cw * k / 120, y = base - ch * Math.min(1, pdf(v, m, sd) / peak); k ? c.lineTo(x, y) : c.moveTo(x, y); } if (fill) { c.lineTo(cx + cw, base); c.lineTo(cx, base); c.closePath(); c.fillStyle = rgba(col, fill); c.fill(); c.beginPath(); for (let k = 0; k <= 120; k++) { const v = lo + (hi - lo) * k / 120, x = cx + cw * k / 120, y = base - ch * Math.min(1, pdf(v, m, sd) / peak); k ? c.lineTo(x, y) : c.moveTo(x, y); } } c.strokeStyle = rgba(col, 0.95); c.lineWidth = lw || 2.4; c.stroke(); };
      stage(0, () => {
        kit.label(c, 'DESIGN · users needed per arm to detect an effect, at 80% power', cx, A.y + 6);
        const base = 0.1, pts = []; for (let m = 0.008; m <= 0.04; m += 0.001) pts.push([m, S.sampleSizeProportion(base, m)]); const mxn = pts[0][1], X = (m) => cx + cw * (m - 0.008) / 0.032, Y = (n) => cy + ch * (1 - n / mxn);
        line(c, cx, cy + ch, cx + cw, cy + ch, HEX.tx, 1, 0.25); line(c, cx, cy, cx, cy + ch, HEX.tx, 1, 0.25);
        c.strokeStyle = HEX.amber; c.lineWidth = 3; c.beginPath(); pts.forEach(([m, n], i) => { i ? c.lineTo(X(m), Y(n)) : c.moveTo(X(m), Y(n)); }); c.stroke();
        const pick = 0.016, n = S.sampleSizeProportion(base, pick); glow(c, X(pick), Y(n), 24, HEX.amber, 0.5); c.fillStyle = '#fff'; c.beginPath(); c.arc(X(pick), Y(n), 5, 0, TAU); c.fill(); line(c, X(pick), Y(n), X(pick), cy + ch, HEX.amber, 1, 0.5, [4, 4]);
        [0.01, 0.02, 0.03, 0.04].forEach((m) => text(c, '+' + (m * 100).toFixed(0) + ' pp', X(m), cy + ch + 20, { size: 10.5, align: 'center', col: HEX.dim })); if (!mob) text(c, 'smallest effect worth detecting →', cx + cw, cy + ch + 40, { size: 11, align: 'right', col: HEX.dim }); text(c, 'users per arm', cx + 8, cy + 12, { size: 11, col: HEX.dim });
        side(0, [['BASELINE · POWER', `${base * 100}% · 0.8`, HEX.tx, 'α = 0.05, two-sided'], ['REQUIRED', n.toLocaleString(), HEX.amber, `per arm, to detect +${(pick * 100).toFixed(1)} pp`]]);
      });
      stage(1, () => {
        kit.label(c, 'ASSIGNMENT · hash(experiment, user) → arm — deterministic and sticky', cx, A.y + 6);
        const shown = Math.round(N * ease(clamp((s - 0.7) / 1.0))), a = stats(Math.max(60, shown)), mid = cx + cw / 2, fall = ch, n = mob ? 220 : 520;
        text(c, 'TRAFFIC', mid, cy + 8, { size: 11, w: 700, ls: 1.5, align: 'center', col: HEX.dim });
        for (let i = 0; i < n; i++) { const u = U[Math.floor(i * N / n)], k = i / n, vis = k < shown / N, ph = (t * 0.35 + k * 7) % 1, y = cy + 24 + ph * (fall - 40), spread = ease(clamp((ph - 0.3) / 0.5)), tx = cx + cw * (u.arm ? 0.78 : 0.22) + Math.sin(i * 12.9) * cw * 0.1 * spread, x = lerp(mid + Math.sin(i * 7.1) * 22, tx, spread); if (vis) { c.fillStyle = rgba(u.arm ? GRN : BLUE, 0.2 + 0.7 * spread); c.fillRect(x - 1.5, y - 1.5, 3, 3); } }
        text(c, 'CONTROL', cx + cw * 0.22, cy + ch + 18, { size: 12, w: 700, ls: 1.5, align: 'center', col: BLUE }); text(c, 'TREATMENT', cx + cw * 0.78, cy + ch + 18, { size: 12, w: 700, ls: 1.5, align: 'center', col: GRN });
        side(1, [['CONTROL', a.nc.toLocaleString(), BLUE, 'users'], ['TREATMENT', a.nt.toLocaleString(), GRN, 'users']]);
      });
      stage(2, () => {
        const n = Math.min(N, Math.round(300 + (N - 300) * ease(clamp((s - 1.55) / 0.9)))), a = stats(n), r = a.r, lo = 0.05, hi = 0.16, sdc = Math.sqrt(r.control * (1 - r.control) / a.nc), sdt = Math.sqrt(r.treatment * (1 - r.treatment) / a.nt), peak = pdf(0, 0, Math.sqrt(0.108 * 0.892 / N) * 0.9);
        kit.label(c, `SAMPLING DISTRIBUTION OF EACH ARM'S CONVERSION · ${n.toLocaleString()} synthetic users`, cx, A.y + 6);
        bell(r.control, sdc, lo, hi, peak, BLUE, 0.16); bell(r.treatment, sdt, lo, hi, peak, GRN, 0.16);
        [r.control, r.treatment].forEach((m, k) => { const x = cx + cw * (m - lo) / (hi - lo); line(c, x, cy + 14 + k * 0, x, cy + ch, k ? GRN : BLUE, 1, 0.5, [3, 4]); });
        axis(lo, hi, [0.06, 0.08, 0.1, 0.12, 0.14], (v) => (v * 100).toFixed(0) + '%', cy + ch);
        text(c, 'control ' + (r.control * 100).toFixed(2) + '%', cx + cw * (r.control - lo) / (hi - lo) - 10, cy + 12, { size: 12.5, w: 700, align: 'right', col: BLUE }); text(c, 'treatment ' + (r.treatment * 100).toFixed(2) + '%', cx + cw * (r.treatment - lo) / (hi - lo) + 10, cy + 12, { size: 12.5, w: 700, col: GRN });
        side(2, [['z', r.z.toFixed(2), HEX.tx, 'distance in standard errors'], ['p-value', r.pValue < 1e-4 ? '< 0.0001' : r.pValue.toFixed(4), r.significant ? GRN : HEX.amber, r.significant ? 'unlikely to be noise' : 'could be noise'], ['95% interval', `${(r.ciLow * 100).toFixed(1)} to ${(r.ciHigh * 100).toFixed(1)} pp`, HEX.tx, 'treatment − control']].slice(0, mob ? 2 : 3));
      });
      stage(3, () => {
        const w2 = ease(clamp((s - 2.6) / 0.7)), raw = st.raw, cup = st.cup, lo = raw.d - 3.6 * raw.se, hi = raw.d + 3.6 * raw.se, peak = pdf(0, 0, cup.se);
        kit.label(c, 'CUPED · adjust the outcome with a pre-experiment covariate (synthetic)', cx, A.y + 6);
        bell(raw.d, raw.se, lo, hi, peak, HEX.amber, 0.12); if (w2 > 0.02) { c.save(); c.globalAlpha = w2; bell(cup.d, cup.se, lo, hi, peak, GRN, 0.2, 3); c.restore(); }
        const zx = cx + cw * (0 - lo) / (hi - lo); line(c, zx, cy + 10, zx, cy + ch, HEX.red, 1.6, 0.85); text(c, 'no effect', clamp(zx, cx + 30, cx + cw - 30), cy + 6, { size: 11.5, align: 'center', col: HEX.red, w: 600 });
        axis(lo, hi, [raw.d - 2 * raw.se, raw.d, raw.d + 2 * raw.se], (v) => (v >= 0 ? '+' : '') + v.toFixed(2), cy + ch);
        text(c, 'raw difference', cx + 8, cy + 30, { size: 12.5, w: 700, col: HEX.amber }); text(c, 'CUPED-adjusted', cx + 8, cy + 50, { size: 12.5, w: 700, col: rgba(GRN, 0.3 + 0.7 * w2) });
        const gd = stats(N).g; side(3, [['VARIANCE REDUCED', `${((1 - (cup.se / raw.se) ** 2) * 100 * w2).toFixed(0)}%`, GRN, mob ? `θ = ${st.theta.toFixed(2)}` : `θ = ${st.theta.toFixed(2)} · same data, narrower`], ['GUARDRAIL · refunds', `p ${gd.pValue.toFixed(2)}`, HEX.tx, `${(gd.control * 100).toFixed(2)}% → ${(gd.treatment * 100).toFixed(2)}%`]]);
      });
      stage(4, () => {
        const a = stats(N), d = S.decide(a.r, [{ name: 'refund rate', higherIsBetter: false, result: a.g }]), col = d.verdict === 'SHIP' ? GRN : d.verdict === 'KILL' ? HEX.red : HEX.amber;
        kit.label(c, 'SCORECARD · primary metric + guardrail → decision', cx, A.y + 6);
        glow(c, cx + (mob ? 90 : 190), cy + (mob ? 36 : 86), 190, col, 0.1); text(c, d.verdict, cx, cy + (mob ? 60 : 130), { size: mob ? 52 : 120, w: 700, col });
        wrap(c, d.reason, cx, cy + (mob ? 96 : 190), A.w * (mob ? 0.96 : 0.58), mob ? 18 : 27, { size: mob ? 13 : 20, col: HEX.tx, sans: true });
        const rows = [['PRIMARY · conversion', `${(a.r.control * 100).toFixed(2)}% → ${(a.r.treatment * 100).toFixed(2)}%`, `p = ${a.r.pValue.toFixed(4)}`], ['GUARDRAIL · refunds', `${(a.g.control * 100).toFixed(2)}% → ${(a.g.treatment * 100).toFixed(2)}%`, `p = ${a.g.pValue.toFixed(3)}`]];
        rows.forEach((r, i) => { const x = mob ? A.x : A.x + A.w * 0.66, y = mob ? cy + 150 + i * 56 : cy + 20 + i * 120; line(c, x, y - 20, x + (mob ? A.w : A.w * 0.34), y - 20, HEX.tx, 1, 0.12); kit.label(c, r[0], x, y); text(c, r[1], x, y + (mob ? 24 : 38), { size: mob ? 17 : 28, w: 700, col: HEX.tx }); text(c, r[2], x, y + (mob ? 40 : 62), { size: mob ? 11 : 13, col: HEX.mut }); });
      });
      kit.tag(c, L, 'REAL stats-core CALCULATIONS ON A SEEDED SYNTHETIC SAMPLE · NOT A PRODUCTION EXPERIMENT', 'SEEDED SYNTHETIC SAMPLE · REAL stats-core MATHS'); kit.cam(st, L);
    },
  };
  window.RMW.register('flag-ab', scenes['flag-ab']);
})();
