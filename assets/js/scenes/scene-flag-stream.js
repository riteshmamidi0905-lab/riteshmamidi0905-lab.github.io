/* scene-flag-stream.js — Real-Time Streaming Pipeline. Personality: motion, throughput, latency, windows, late events.
   The picture is an event-time field: every processed event is a dot at (arrival time, how late it was). On-time events ride the top
   edge, late ones fall; slanted bands are the 60 s event-time windows; below the watermark an event's window state is gone and it is
   dropped. All of it is the real stream-core.js simulation (the repo's producer, fraud rules, windows and watermark). */
(() => {
  'use strict';
  const { H, scenes, kit } = window.RMW; const { clamp, lerp, HEX, rgba, glow, text, line } = H;
  const CFG = [{ rate: 40, late: 0.15 }, { rate: 100, late: 0.15 }, { rate: 45, late: 0.3 }, { rate: 45, late: 0.12 }];
  const cfgAt = (s) => CFG[clamp(Math.round(s), 0, 3)], TW = 60, TL = 240, WM = 120;

  scenes['flag-stream'] = {
    tint: HEX.blue, still: 3, stillT: 8,
    init(w) {
      const st = w.state, S = window.RMLab.streamCore; st.ev = []; st.clock = 0;
      st.pipe = S.createPipeline({ seed: 3, rate: 40, capacity: 60, lateShare: 0.15, onProcess(t) { st.ev.push({ arr: st.clock, late: Math.max(0, st.clock - t.event_ts / 1000), bad: t.is_fraud, drop: t.stage === 'dropped' }); if (st.ev.length > 3200) st.ev.splice(0, 400); } });
      st.snap = st.pipe.snapshot();
    },
    prime(w) { const st = w.state, c = cfgAt(w.s); st.pipe.setRate(CFG[0].rate); st.pipe.setLateShare(CFG[0].late); for (let i = 0; i < 3200; i++) { st.clock += 0.05; st.pipe.step(0.05); } st.pipe.setRate(c.rate); st.pipe.setLateShare(c.late); for (let i = 0; i < 700; i++) { st.clock += 0.05; st.pipe.step(0.05); } st.snap = st.pipe.snapshot(); },
    advance(w, dt) { const st = w.state, c = cfgAt(w.s); st.pipe.setRate(c.rate); st.pipe.setLateShare(c.late); st.clock += dt; st.pipe.step(dt); st.snap = st.pipe.snapshot(); },
    draw(c, L, t, s, st) {
      const A = kit.rail(c, L, ['Synthetic events', 'Kafka', 'Fraud rules + windows', 'Cassandra'], s, HEX.blue), mob = L.mobile, sn = st.snap, now = st.clock;
      const px = A.x + (mob ? 0 : 30), pw = mob ? A.w : A.w * 0.7, py = A.y + 18, ph = mob ? A.h * 0.56 : A.h - 40, sx = pw / TW, sy = ph / TL;
      kit.label(c, mob ? 'EVENT FIELD · arrival (60 s) × lateness' : 'EVENT FIELD · x arrival time (last 60 s) · y how late the event was', px, A.y + 6);
      c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip();
      const win = clamp((s - 1.6) / 0.6), wmA = win;
      if (win > 0) { for (let b = Math.floor((now - TL) / 60) * 60; b <= now; b += 60) { const y1 = (a) => py + (a - b) * sy; c.strokeStyle = rgba(HEX.blue, 0.35 * win); c.lineWidth = 1; c.beginPath(); c.moveTo(px, y1(now - TW)); c.lineTo(px + pw, y1(now)); c.stroke(); } }
      c.fillStyle = rgba(HEX.red, 0.07 * wmA); c.fillRect(px, py + WM * sy, pw, ph - WM * sy);
      st.ev.forEach((e) => { const x = px + (e.arr - (now - TW)) * sx; if (x < px - 4) return; const y = py + clamp(e.late, 0, TL) * sy; if (e.drop && s > 1.6) { c.strokeStyle = rgba(HEX.red, 0.95); c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 2.5, y - 2.5); c.lineTo(x + 2.5, y + 2.5); c.moveTo(x + 2.5, y - 2.5); c.lineTo(x - 2.5, y + 2.5); c.stroke(); } else if (e.bad && s > 1.6) { c.fillStyle = HEX.amber; c.fillRect(x - 2.5, y - 2.5, 5, 5); } else { c.fillStyle = rgba(e.late > 8 ? HEX.blue : HEX.ac2, 0.78); c.fillRect(x - 1, y - 1, 2.2, 2.2); } });
      c.restore();
      line(c, px, py + ph, px + pw, py + ph, HEX.tx, 1, 0.2);
      if (wmA > 0) { c.setLineDash([6, 5]); line(c, px, py + WM * sy, px + pw, py + WM * sy, HEX.red, 1.4, 0.9 * wmA, [6, 5]); c.setLineDash([]); text(c, mob ? 'watermark' : 'watermark · past this line a window\'s state is gone', px + pw - 6, py + WM * sy - 8, { size: 12, align: 'right', col: rgba(HEX.red, wmA), w: 600 }); text(c, 'DROPPED', px + pw - 6, py + WM * sy + 22, { size: 12, w: 700, ls: 1.6, align: 'right', col: rgba(HEX.red, wmA) }); }
      [0, 60, 120, 180, 240].forEach((v) => text(c, v + 's', mob ? px + 3 : px - 8, py + v * sy + (v ? 4 : 13), { size: 10.5, align: mob ? 'left' : 'right', col: HEX.dim }));
      // right: the stage's own numbers
      const rx = mob ? A.x : A.x + A.w * 0.75, ry = mob ? py + ph + 34 : py + 6, big = mob ? 30 : 56, gap = mob ? 0 : 1;
      const block = (name, val, sub, col, i) => { const x = mob ? A.x + (i % 2) * A.w * 0.5 : rx, y = mob ? ry + Math.floor(i / 2) * 64 : ry + i * 112; text(c, name, x, y, { size: 11, w: 700, ls: 1.5, col: HEX.dim }); text(c, val, x, y + (mob ? 30 : 52), { size: mob ? 28 : 46, w: 700, col: col || HEX.tx }); text(c, sub, x, y + (mob ? 46 : 78), { size: mob ? 10.5 : 12.5, col: HEX.mut }); };
      if (s < 0.6) { block('THROUGHPUT', String(CFG[0].rate), 'events / second', HEX.ac2, 0); block('FRAUD-SHAPED', ((100 * sn.flagged) / Math.max(1, sn.processed)).toFixed(1) + '%', 'about 3% by construction', HEX.amber, 1); if (!mob) block('PRODUCED', sn.produced.toLocaleString(), 'synthetic transactions', HEX.tx, 2); }
      else if (s < 1.6) { block('CONSUMER LAG', String(sn.lag), 'events waiting in Kafka', sn.lag > 30 ? HEX.red : HEX.tx, 0); block('RATE IN / OUT', `${cfgAt(s).rate} / 60`, 'events per second', HEX.amber, 1); if (!mob) block('PROCESSED', sn.processed.toLocaleString(), 'consumed so far', HEX.tx, 2); }
      else if (s < 2.6) { block('FLAGGED', String(sn.flagged), mob ? 'by the two fraud rules' : `high_amount ${sn.reasons.high_amount} · risky country ${sn.reasons.high_risk_country}`, HEX.amber, 0); block('DROPPED LATE', String(sn.droppedLate), mob ? `${sn.lateAccepted} late, accepted` : `${sn.lateAccepted} late events still accepted`, sn.droppedLate ? HEX.red : HEX.tx, 1); if (!mob) block('WATERMARK', `${sn.watermarkLagSec.toFixed(0)} s`, 'behind the newest event time', HEX.blue, 2); }
      else { const top = sn.merchants.slice(0, mob ? 3 : 6), mx = Math.max(1, ...top.map((m) => m.txn_count)); text(c, 'merchant_metrics · rows in Cassandra', rx, ry, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); top.forEach((m, i) => { const y = ry + 30 + i * (mob ? 22 : 40); text(c, m.merchant, rx, y, { size: mob ? 12 : 14, col: HEX.tx }); c.fillStyle = rgba(HEX.blue, 0.8); c.fillRect(rx, y + 8, (mob ? A.w * 0.5 : A.w * 0.24) * m.txn_count / mx, mob ? 5 : 7); c.fillStyle = HEX.amber; c.fillRect(rx, y + 8, (mob ? A.w * 0.5 : A.w * 0.24) * m.fraud_count / mx, mob ? 5 : 7); text(c, `${m.txn_count} txns · ${m.fraud_count} flagged`, rx + (mob ? A.w * 0.5 : A.w * 0.24), y, { size: mob ? 10 : 12, align: 'right', col: HEX.mut }); }); }
      kit.tag(c, L, 'SIMULATED WITH THE PIPELINE’S OWN RULES · SYNTHETIC EVENTS · NOT A DEPLOYED SYSTEM', 'SYNTHETIC EVENTS · THE PIPELINE’S OWN RULES · NOT DEPLOYED'); kit.cam(st, L);
    },
  };
  window.RMW.register('flag-stream', scenes['flag-stream']);
})();
