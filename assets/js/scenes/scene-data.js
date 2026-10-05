/* scene-data.js — Data systems chapter. The real stream-core.js simulation (the producer, fraud rules, event-time windows and
   watermark from the realtime-streaming-pipeline repo, ported to JS) runs live; every number, particle and bar is its state.
   Scroll changes the simulation's parameters (producer rate, late share) and the system visibly responds: lag builds, late events drop. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, HEX, rgba, glow, text, line, rrect } = H;
  const SC = () => window.RMLab.streamCore;
  /* per-step producer settings; capacity stays 60 events/s throughout */
  const CFG = [{ rate: 24, late: 0.04 }, { rate: 110, late: 0.04 }, { rate: 45, late: 0.3 }, { rate: 45, late: 0.1 }, { rate: 45, late: 0.1 }];
  const NAMES = ['SOURCES', 'INGESTION', 'PROCESSING', 'STORAGE', 'ANALYTICS'];
  const SUBS = ['synthetic producer', 'bounded queue', 'rules · windows · watermark', 'event-time windows', 'merchant aggregates'];

  function mk(w) {
    const st = w.state, S = SC();
    st.parts = []; st.fx = { pad: 0 };
    st.pipe = S.createPipeline({ seed: 7, rate: CFG[0].rate, capacity: 60, lateShare: CFG[0].late,
      onProduce() { if (st.parts.length < 90) st.parts.push({ k: 'in', age: 0 }); },
      onProcess(t) { if (st.parts.length < 90) st.parts.push({ k: 'out', age: 0, st: t.stage, bad: t.is_fraud }); } });
    st.snap = st.pipe.snapshot();
  }
  const cfgAt = (s) => CFG[clamp(Math.round(s), 0, CFG.length - 1)];

  scenes.data = {
    tint: HEX.blue,
    init(w) { mk(w); },
    prime(w) { const st = w.state, c = cfgAt(w.s); st.pipe.setRate(c.rate); st.pipe.setLateShare(c.late); for (let i = 0; i < 600; i++) st.pipe.step(0.05); st.snap = st.pipe.snapshot(); st.parts = []; },
    advance(w, dt) {
      const st = w.state, c = cfgAt(w.s); st.pipe.setRate(c.rate); st.pipe.setLateShare(c.late);
      st.pipe.step(dt); st.snap = st.pipe.snapshot();
      st.parts.forEach((p) => { p.age += dt; }); st.parts = st.parts.filter((p) => p.age < (p.k === 'in' ? 0.6 : 1.0));
    },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile, sn = st.snap, N = 5;
      const P = (i) => mob ? [B.x + B.w * 0.16, B.y + B.h * (0.06 + 0.88 * i / (N - 1))] : [B.x + B.w * (0.07 + 0.86 * i / (N - 1)), B.y + B.h * 0.3];
      const pts = NAMES.map((_, i) => P(i)), R = mob ? 12 : Math.min(B.w / 40, 26);
      // lanes
      for (let i = 0; i < N - 1; i++) { line(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], HEX.blue, 1.4, 0.35, [4, 6]); }
      const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
      st.parts.forEach((p) => {
        if (p.k === 'in') { const q = lerp2(pts[0], pts[1], p.age / 0.6); c.fillStyle = rgba(HEX.ac2, 0.9); c.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); return; }
        const a = p.age;
        if (a < 0.4) { const q = lerp2(pts[1], pts[2], a / 0.4); c.fillStyle = rgba(HEX.ac2, 0.9); c.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); return; }
        const k = (a - 0.4) / 0.6;
        if (p.st === 'dropped') { const q = [pts[2][0], pts[2][1] + k * (mob ? 30 : 70)]; c.fillStyle = rgba(HEX.red, 1 - k); c.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
        else { const q = lerp2(pts[2], pts[3], k); c.fillStyle = rgba(p.bad ? HEX.amber : HEX.ac2, 0.95); c.fillRect(q[0] - (p.bad ? 2.5 : 1.5), q[1] - (p.bad ? 2.5 : 1.5), p.bad ? 5 : 3, p.bad ? 5 : 3); }
      });
      // nodes + readouts
      const fs = mob ? 11 : 12;
      for (let i = 0; i < N; i++) {
        const [x, y] = pts[i], act = clamp(1 - Math.abs(s - i)), al = 0.4 + 0.6 * act;
        glow(c, x, y, R * 3, HEX.blue, 0.05 + 0.3 * act);
        c.strokeStyle = rgba(act > 0.5 ? HEX.ac2 : HEX.tx, act > 0.5 ? 0.95 : 0.35); c.lineWidth = 1.5 + act * 1.5; c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke();
        const tx = mob ? x + R + 14 : x, ty = mob ? y - 4 : y - R - 16, al2 = al, ax = mob ? 'left' : 'center';
        text(c, NAMES[i], tx, ty, { size: fs, w: 700, ls: 1.6, align: ax, col: rgba(HEX.tx, al2) });
        if (mob) text(c, SUBS[i], tx, ty + 14, { size: 10, align: ax, col: rgba(HEX.mut, al2) });
        const lines = this.lines(i, st, sn, mob);
        const bx = mob ? tx : x, by = mob ? ty + 30 : y + R + 26;
        lines.forEach((ln, k) => text(c, ln[0], bx, by + k * (mob ? 14 : 18), { size: mob ? 10 : 12, align: ax, col: rgba(ln[1] || HEX.mut, al2), w: ln[2] || 500 }));
        if (!mob && i === 1) { // queue grid: lag as filled cells
          const cols = 20, cw = Math.min(10, B.w / 60), gx = x - cols * cw / 2, gy = by + 4 * 18 + 8;
          for (let k = 0; k < 60; k++) { const on = k < sn.lag, cx = gx + (k % cols) * cw, cy = gy + Math.floor(k / cols) * cw; c.fillStyle = on ? rgba(sn.lag > 45 ? HEX.red : HEX.amber, 0.9) : rgba(HEX.tx, 0.1); c.fillRect(cx, cy, cw - 2, cw - 2); }
        }
        if (!mob && i === 3) { // merchant window bars
          const top = sn.merchants.slice(0, 5), mx = Math.max(1, ...top.map((m) => m.txn_count)), gy = by + 4 * 18 + 4, bw = Math.min(B.w * 0.14, 150);
          top.forEach((m, k) => { const yy = gy + k * 16; text(c, m.merchant, x - bw / 2 - 6, yy + 9, { size: 10, align: 'right', col: HEX.mut }); c.fillStyle = rgba(HEX.blue, 0.8); c.fillRect(x - bw / 2, yy, bw * m.txn_count / mx, 9); if (m.fraud_count) { c.fillStyle = HEX.amber; c.fillRect(x - bw / 2, yy, bw * m.fraud_count / mx, 9); } });
        }
      }
      // lag history sparkline across the bottom of the box (real history array)
      if (!mob) {
        const hx = B.x + B.w * 0.07, hw = B.w * 0.86, hy = B.y + B.h, hh = B.h * 0.14, hist = sn.history, mxl = Math.max(30, ...hist.map((h) => h.lag));
        text(c, `CONSUMER LAG · queue length over the last ${Math.round(hist.length / 2)} s (sim)`, hx, hy - hh - 8, { size: 10, col: HEX.dim, ls: 1.2, w: 600 });
        line(c, hx, hy, hx + hw, hy, HEX.tx, 1, 0.15);
        c.strokeStyle = rgba(HEX.amber, 0.9); c.lineWidth = 1.6; c.beginPath(); hist.forEach((h, k) => { const px = hx + hw * k / 119, py = hy - hh * h.lag / mxl; k ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
      }
      st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
    },
    lines(i, st, sn, mob) {
      const c = cfgAt(st.s || 0);
      if (i === 0) { const r = sn.recent.slice(-3).reverse(); return [[`${st.pipe.options.rate} events/s`, HEX.ac2, 700], ...r.map((x) => [`${x.txn_id} $${x.amount} ${x.country}`, HEX.mut])]; }
      if (i === 1) return [[`lag ${sn.lag} events`, sn.lag > 30 ? HEX.red : HEX.ac2, 700], ['capacity 60/s', HEX.mut], [`${sn.produced} produced`, HEX.mut]];
      if (i === 2) return [[`${sn.processed} processed`, HEX.tx, 700], [`flagged ${sn.flagged}`, HEX.amber], [`dropped late ${sn.droppedLate}`, sn.droppedLate ? HEX.red : HEX.mut], [`watermark −${sn.watermarkLagSec.toFixed(0)}s`, HEX.mut]];
      if (i === 3) return [[`${sn.openWindows} open · ${sn.closedWindows} closed`, HEX.tx, 700], ['60 s windows by merchant', HEX.mut], [`late accepted ${sn.lateAccepted}`, HEX.mut]];
      const rate = sn.processed ? (100 * sn.flagged / sn.processed).toFixed(1) : '0.0';
      return [[`${rate}% flagged`, HEX.amber, 700], [`high_amount ${sn.reasons.high_amount}`, HEX.mut], [`high_risk_country ${sn.reasons.high_risk_country}`, HEX.mut]];
    },
  };
  const orig = scenes.data.draw; scenes.data.draw = function (c, L, t, s, st) { st.s = s; return orig.call(this, c, L, t, s, st); };
  window.RMW.register('data', scenes.data);
})();
