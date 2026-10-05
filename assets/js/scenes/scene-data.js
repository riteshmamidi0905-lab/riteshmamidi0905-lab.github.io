/* scene-data.js — Data systems chapter. The real stream-core.js simulation (the producer, fraud rules, event-time windows and
   watermark from the realtime-streaming-pipeline repo, ported to JS) runs live; every number, particle and bar is its state.
   Scroll changes the simulation's parameters (producer rate, late share) and the system visibly responds: lag builds, late events drop.
   Desktop: five columns, one per stage, each drawn as its own instrument. Mobile: the same five stages as a vertical trace. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, HEX, rgba, glow, text, line } = H;
  const SC = () => window.RMLab.streamCore;
  /* per-step producer settings; consumer capacity stays 60 events/s throughout */
  const CFG = [{ rate: 24, late: 0.04 }, { rate: 110, late: 0.04 }, { rate: 45, late: 0.3 }, { rate: 45, late: 0.1 }, { rate: 45, late: 0.1 }];
  const NAMES = ['SOURCES', 'INGESTION', 'PROCESSING', 'STORAGE', 'ANALYTICS'];
  const SUBS = ['synthetic producer', 'bounded queue', 'rules · watermark', 'event-time windows', 'merchant aggregates'];
  const cfgAt = (s) => CFG[clamp(Math.round(s), 0, CFG.length - 1)];

  function mk(w) {
    const st = w.state, S = SC();
    st.parts = [];
    st.pipe = S.createPipeline({ seed: 7, rate: CFG[0].rate, capacity: 60, lateShare: CFG[0].late,
      onProduce() { if (st.parts.length < 90) st.parts.push({ k: 'in', age: 0 }); },
      onProcess(t) { if (st.parts.length < 90) st.parts.push({ k: 'out', age: 0, st: t.stage, bad: t.is_fraud }); } });
    st.snap = st.pipe.snapshot();
  }

  scenes.data = {
    tint: HEX.blue, still: 2, stillT: 8,
    init(w) { mk(w); },
    prime(w) { const st = w.state, c = cfgAt(w.s); st.pipe.setRate(c.rate); st.pipe.setLateShare(c.late); st.pipe.setRate(CFG[0].rate); st.pipe.setLateShare(CFG[0].late); for (let i = 0; i < 3200; i++) st.pipe.step(0.05); st.pipe.setRate(c.rate); st.pipe.setLateShare(c.late); for (let i = 0; i < 500; i++) st.pipe.step(0.05); st.snap = st.pipe.snapshot(); st.parts = []; },
    advance(w, dt) {
      const st = w.state, c = cfgAt(w.s); st.pipe.setRate(c.rate); st.pipe.setLateShare(c.late);
      st.pipe.step(dt); st.snap = st.pipe.snapshot();
      st.parts.forEach((p) => { p.age += dt; }); st.parts = st.parts.filter((p) => p.age < (p.k === 'in' ? 0.6 : 1.0));
    },
    draw(c, L, t, s, st) { st.cam = { x: L.box.x + L.box.w / 2, y: L.box.y + L.box.h / 2, z: 1 }; (L.mobile ? mobile : desktop)(c, L, t, s, st); },
  };

  const act = (s, i) => clamp(1 - Math.abs(s - i) * 0.9);

  function desktop(c, L, t, s, st) {
    const B = L.box, sn = st.snap, N = 5, cw = B.w / N, lane = B.y + 74, cx = (i) => B.x + cw * (i + 0.5);
    // lane + packets: events flow left to right through the real stages
    line(c, cx(0), lane, cx(N - 1), lane, HEX.blue, 1.5, 0.35, [4, 7]);
    const at = (a, b, k) => [lerp(cx(a), cx(b), k), lane];
    st.parts.forEach((p) => {
      if (p.k === 'in') { const q = at(0, 1, p.age / 0.6); c.fillStyle = rgba(HEX.ac2, 0.9); c.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); return; }
      const a = p.age;
      if (a < 0.4) { const q = at(1, 2, a / 0.4); c.fillStyle = rgba(HEX.ac2, 0.9); c.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); return; }
      const k = (a - 0.4) / 0.6;
      if (p.st === 'dropped') { c.fillStyle = rgba(HEX.red, 1 - k); c.fillRect(cx(2) - 2, lane + k * 46, 4, 4); }
      else { const q = at(2, 3, k); c.fillStyle = rgba(p.bad ? HEX.amber : HEX.ac2, 0.95); c.fillRect(q[0] - (p.bad ? 3 : 1.5), q[1] - (p.bad ? 3 : 1.5), p.bad ? 6 : 3, p.bad ? 6 : 3); }
    });
    for (let i = 0; i < N; i++) {
      const a = act(s, i), x = cx(i), al = 0.42 + 0.58 * a, y0 = lane + 44;
      if (i) line(c, B.x + cw * i, B.y, B.x + cw * i, B.y + B.h, HEX.tx, 1, 0.07);
      glow(c, x, lane, 34, HEX.blue, 0.05 + 0.3 * a); c.fillStyle = '#05070a'; c.strokeStyle = rgba(a > 0.5 ? HEX.ac2 : HEX.tx, a > 0.5 ? 1 : 0.4); c.lineWidth = 1.6 + a * 1.6; c.beginPath(); c.arc(x, lane, 11, 0, TAU); c.fill(); c.stroke();
      text(c, NAMES[i], x, B.y + 14, { size: 14, w: 700, ls: 2.2, align: 'center', col: rgba(HEX.tx, al) });
      text(c, SUBS[i], x, B.y + 34, { size: 11.5, align: 'center', col: rgba(HEX.mut, al) });
      c.save(); c.globalAlpha = al; const left = B.x + cw * i + 22, wid = cw - 44;
      if (i === 0) {
        text(c, `${st.pipe.options.rate}`, left, y0 + 36, { size: 46, w: 700, col: HEX.tx }); text(c, 'events / second', left, y0 + 58, { size: 12.5, col: HEX.mut });
        sn.recent.slice(-7).reverse().forEach((x2, k) => text(c, `${x2.txn_id.replace('txn_', '#')}  $${x2.amount}  ${x2.country}`, left, y0 + 98 + k * 25, { size: 13.5, col: x2.is_fraud ? HEX.amber : HEX.mut }));
      } else if (i === 1) {
        text(c, String(sn.lag), left, y0 + 36, { size: 46, w: 700, col: sn.lag > 30 ? HEX.red : HEX.tx }); text(c, 'events waiting · drains 60 / s', left, y0 + 58, { size: 12.5, col: HEX.mut });
        const cols = 12, cell = wid / cols, gy = y0 + 84; for (let k = 0; k < 60; k++) { c.fillStyle = k < sn.lag ? rgba(sn.lag > 45 ? HEX.red : HEX.amber, 0.92) : rgba(HEX.tx, 0.09); c.fillRect(left + (k % cols) * cell, gy + Math.floor(k / cols) * cell, cell - 2.5, cell - 2.5); }
        const hy = gy + 5 * cell + 56, hist = sn.history, mx = Math.max(30, ...hist.map((h) => h.lag)); text(c, 'LAG OVER TIME', left, hy - 46, { size: 10.5, ls: 1.4, w: 600, col: HEX.dim }); line(c, left, hy, left + wid, hy, HEX.tx, 1, 0.15);
        c.strokeStyle = rgba(HEX.amber, 0.95); c.lineWidth = 1.8; c.beginPath(); hist.forEach((h, k) => { const px = left + wid * k / 119, py = hy - 38 * h.lag / mx; k ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
      } else if (i === 2) {
        text(c, sn.processed.toLocaleString(), left, y0 + 36, { size: 46, w: 700, col: HEX.tx }); text(c, 'events processed', left, y0 + 58, { size: 12.5, col: HEX.mut });
        const rows = [['flagged', sn.flagged, HEX.amber], ['dropped late', sn.droppedLate, HEX.red], ['late, accepted', sn.lateAccepted, HEX.blue]], mxr = Math.max(1, sn.flagged, sn.droppedLate, sn.lateAccepted);
        rows.forEach((r, k) => { const yy = y0 + 96 + k * 50; text(c, r[0], left, yy, { size: 13, col: HEX.mut }); text(c, String(r[1]), left + wid, yy, { size: 20, w: 700, align: 'right', col: r[1] ? r[2] : HEX.dim }); c.fillStyle = rgba(HEX.tx, 0.08); c.fillRect(left, yy + 10, wid, 4); c.fillStyle = r[2]; c.fillRect(left, yy + 10, wid * r[1] / mxr, 4); });
        text(c, 'watermark = newest', left, y0 + 268, { size: 12, col: HEX.mut }); text(c, `event time − 120 s`, left, y0 + 286, { size: 12, col: HEX.mut }); text(c, `now ${sn.watermarkLagSec.toFixed(0)} s behind`, left, y0 + 304, { size: 12, col: HEX.dim });
      } else if (i === 3) {
        text(c, String(sn.openWindows), left, y0 + 36, { size: 46, w: 700, col: HEX.tx }); text(c, `open windows · ${sn.closedWindows} closed`, left, y0 + 58, { size: 12.5, col: HEX.mut });
        const top = sn.merchants.slice(0, 6), mxm = Math.max(1, ...top.map((m) => m.txn_count));
        top.forEach((m, k) => { const yy = y0 + 96 + k * 36; text(c, m.merchant, left, yy, { size: 13, col: HEX.tx }); c.fillStyle = rgba(HEX.blue, 0.8); c.fillRect(left, yy + 8, wid * m.txn_count / mxm, 8); c.fillStyle = HEX.amber; c.fillRect(left, yy + 8, wid * m.fraud_count / mxm, 8); text(c, String(m.txn_count), left + wid, yy, { size: 13, align: 'right', col: HEX.mut }); });
      } else {
        const rate = sn.processed ? (100 * sn.flagged / sn.processed) : 0;
        text(c, rate.toFixed(1) + '%', left, y0 + 36, { size: 46, w: 700, col: HEX.amber }); text(c, 'of events flagged', left, y0 + 58, { size: 12.5, col: HEX.mut });
        [['high_amount', sn.reasons.high_amount, 'amount > 2000'], ['high_risk_country', sn.reasons.high_risk_country, 'country ∈ XX · ZZ · AN'], ['non_positive_amount', sn.reasons.non_positive_amount, 'amount ≤ 0']].forEach((r, k) => { const yy = y0 + 104 + k * 62; text(c, r[0], left, yy, { size: 13, w: 600, col: HEX.tx }); text(c, r[2], left, yy + 18, { size: 11.5, col: HEX.dim }); text(c, String(r[1]), left + wid, yy + 6, { size: 26, w: 700, align: 'right', col: r[1] ? HEX.amber : HEX.dim }); });
      }
      c.restore();
    }
  }

  function mobile(c, L, t, s, st) {
    const B = L.box, sn = st.snap, N = 5, gap = B.h / N, x0 = B.x + 20, R = 14;
    const pts = NAMES.map((_, i) => [x0, B.y + 18 + (B.h - 66) * i / (N - 1)]);
    for (let i = 0; i < N - 1; i++) line(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], HEX.blue, 1.5, 0.4, [3, 6]);
    st.parts.forEach((p) => { const a = p.age; let seg, k; if (p.k === 'in') { seg = 0; k = a / 0.6; } else if (a < 0.4) { seg = 1; k = a / 0.4; } else { seg = 2; k = (a - 0.4) / 0.6; if (p.st === 'dropped') { c.fillStyle = rgba(HEX.red, 1 - k); c.fillRect(pts[2][0] + 8 + k * 24, pts[2][1] + k * 14, 4, 4); return; } } const q = [x0, lerp(pts[seg][1], pts[seg + 1][1], k)]; c.fillStyle = rgba(p.bad ? HEX.amber : HEX.ac2, 0.95); c.fillRect(q[0] - 2, q[1] - 2, 4, 4); });
    const lines = [
      [`${st.pipe.options.rate} events / s`, sn.recent.slice(-1).map((x) => `latest ${x.txn_id.replace('txn_', '#')}  $${x.amount}  ${x.country}`)[0] || ''],
      [`lag ${sn.lag} events`, `producer ${st.pipe.options.rate}/s · consumer 60/s`],
      [`${sn.processed} processed · ${sn.flagged} flagged`, `dropped late ${sn.droppedLate} · late accepted ${sn.lateAccepted}`],
      [`${sn.openWindows} open · ${sn.closedWindows} closed windows`, `watermark ${sn.watermarkLagSec.toFixed(0)} s behind max event time`],
      [`${sn.processed ? (100 * sn.flagged / sn.processed).toFixed(1) : '0.0'}% flagged`, `high_amount ${sn.reasons.high_amount} · high_risk_country ${sn.reasons.high_risk_country}`],
    ];
    for (let i = 0; i < N; i++) {
      const [x, y] = pts[i], a = act(s, i), al = 0.45 + 0.55 * a, tx = x + R + 16;
      glow(c, x, y, R * 2.6, HEX.blue, 0.05 + 0.3 * a); c.fillStyle = '#05070a'; c.strokeStyle = rgba(a > 0.5 ? HEX.ac2 : HEX.tx, a > 0.5 ? 1 : 0.4); c.lineWidth = 1.6 + a * 1.6; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); c.stroke();
      text(c, NAMES[i], tx, y - 8, { size: 12.5, w: 700, ls: 1.8, col: rgba(HEX.tx, al) }); text(c, SUBS[i], tx + 112, y - 8, { size: 10, col: rgba(HEX.dim, al) });
      text(c, lines[i][0], tx, y + 12, { size: 14, w: 700, col: rgba(i === 1 && sn.lag > 30 ? HEX.red : i === 4 ? HEX.amber : HEX.tx, al) });
      text(c, lines[i][1], tx, y + 30, { size: 11, col: rgba(HEX.mut, al) });
    }
    // lag gauge sits in the ingestion row
    const gx = B.x + B.w - 70, gy = pts[1][1] - 12; for (let k = 0; k < 30; k++) { c.fillStyle = k * 2 < sn.lag ? rgba(sn.lag > 45 ? HEX.red : HEX.amber, 0.9) : rgba(HEX.tx, 0.1); c.fillRect(gx + (k % 10) * 7, gy + Math.floor(k / 10) * 7, 5, 5); }
  }
  window.RMW.register('data', scenes.data);
})();
