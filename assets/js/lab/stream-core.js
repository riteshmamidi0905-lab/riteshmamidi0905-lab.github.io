/* stream-core.js — a runnable, seeded simulation of the Real-Time Streaming Pipeline design.
   Event generation mirrors producer/producer.py; the fraud rules and the windowing parameters
   mirror streaming/transforms.py (HIGH_AMOUNT 2000, risky countries XX/ZZ/AN, one-minute tumbling
   event-time windows, two-minute watermark). Everything runs in the browser on a simulated clock:
   these are SYNTHETIC events, not real traffic, and no Kafka/Spark/Cassandra process is involved. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RMLab = root.RMLab || {}).streamCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MERCHANTS = ['amazon', 'walmart', 'apple', 'steam', 'uber', 'netflix', 'shady_llc'];
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];
  const COUNTRIES = ['US', 'CA', 'GB', 'DE', 'IN', 'BR'];
  const HIGH_RISK = ['XX', 'ZZ', 'AN'];
  const HIGH_AMOUNT = 2000;
  const WINDOW_MS = 60000, WATERMARK_MS = 120000;

  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const uniform = (rng, a, b) => a + rng() * (b - a);
  const round2 = (x) => Math.round(x * 100) / 100;

  /* producer.make_txn — ~2% high-amount fraud, ~1% high-risk-country fraud, otherwise normal */
  function makeTxn(rng, id, eventTs) {
    const roll = rng();
    let amount, country;
    if (roll < 0.02) { amount = round2(uniform(rng, 2000, 9000)); country = pick(rng, COUNTRIES); }
    else if (roll < 0.03) { amount = round2(uniform(rng, 10, 500)); country = pick(rng, HIGH_RISK); }
    else { amount = round2(uniform(rng, 1, 500)); country = pick(rng, COUNTRIES); }
    return { txn_id: 'txn_' + id, account_id: 'acct_' + (1 + Math.floor(rng() * 10000)), amount, currency: pick(rng, CURRENCIES), merchant: pick(rng, MERCHANTS), country, event_ts: eventTs };
  }
  /* transforms.flag_fraud — first matching rule wins, as in the Spark F.when chain */
  function flagFraud(t) {
    if (t.amount > HIGH_AMOUNT) return 'high_amount';
    if (HIGH_RISK.indexOf(t.country) >= 0) return 'high_risk_country';
    if (t.amount <= 0) return 'non_positive_amount';
    return null;
  }

  function createPipeline(opts) {
    const o = Object.assign({ seed: 7, rate: 40, capacity: 60, lateShare: 0.08, onProduce: null, onProcess: null }, opts || {});
    let rng, S;
    function reset() {
      rng = mulberry32(o.seed);
      S = { now: 0, nextId: 1, carry: 0, procCarry: 0, queue: [], maxEventTs: 0, watermark: 0,
        produced: 0, processed: 0, flagged: 0, droppedLate: 0, lateAccepted: 0,
        windows: new Map(), verdicts: [], recent: [], reasons: { high_amount: 0, high_risk_country: 0, non_positive_amount: 0 }, history: [] };
    }
    reset();

    function windowKey(ts, merchant) { return Math.floor(ts / WINDOW_MS) * WINDOW_MS + '|' + merchant; }

    function process(txn) {
      S.processed++;
      const reason = flagFraud(txn);
      txn.fraud_reason = reason; txn.is_fraud = !!reason;
      if (reason) { S.flagged++; S.reasons[reason]++; }
      S.maxEventTs = Math.max(S.maxEventTs, txn.event_ts);
      S.watermark = S.maxEventTs - WATERMARK_MS;
      const wStart = Math.floor(txn.event_ts / WINDOW_MS) * WINDOW_MS;
      // Spark drops events whose window closed before the watermark (state for it is gone)
      if (wStart + WINDOW_MS <= S.watermark) { txn.stage = 'dropped'; S.droppedLate++; }
      else {
        if (txn.event_ts < S.now - 1000) S.lateAccepted++;
        const k = windowKey(txn.event_ts, txn.merchant);
        let w = S.windows.get(k);
        if (!w) { w = { window_start: wStart, window_end: wStart + WINDOW_MS, merchant: txn.merchant, txn_count: 0, total_amount: 0, fraud_count: 0 }; S.windows.set(k, w); }
        w.txn_count++; w.total_amount = round2(w.total_amount + txn.amount); if (reason) w.fraud_count++;
        txn.stage = 'stored';
      }
      S.verdicts.push(txn);
      if (S.verdicts.length > 400) S.verdicts.shift();
      S.recent.push(txn); if (S.recent.length > 14) S.recent.shift();
      if (o.onProcess) o.onProcess(txn);
    }

    /* advance simulated time by dt seconds */
    function step(dt) {
      S.now += dt * 1000;
      S.carry += o.rate * dt;
      while (S.carry >= 1) {
        S.carry -= 1;
        let ts = S.now;
        if (rng() < o.lateShare) ts = S.now - uniform(rng, 15000, 200000);   // out-of-order / late arrivals
        const t = makeTxn(rng, S.nextId++, Math.max(0, ts));
        t.stage = 'queued'; t.produced_at = S.now;
        S.queue.push(t); S.produced++;
        if (o.onProduce) o.onProduce(t);
      }
      S.procCarry += o.capacity * dt;
      let n = Math.floor(S.procCarry); S.procCarry -= n;
      while (n-- > 0 && S.queue.length) process(S.queue.shift());
      if (S.history.length === 0 || S.now - S.history[S.history.length - 1].t >= 500) {
        S.history.push({ t: S.now, lag: S.queue.length, flagged: S.flagged });
        if (S.history.length > 120) S.history.shift();
      }
    }
    function snapshot() {
      const open = [...S.windows.values()].filter((w) => w.window_end > S.watermark);
      const closed = S.windows.size - open.length;
      const byMerchant = {};
      S.windows.forEach((w) => { const m = byMerchant[w.merchant] || (byMerchant[w.merchant] = { merchant: w.merchant, txn_count: 0, total_amount: 0, fraud_count: 0 }); m.txn_count += w.txn_count; m.total_amount = round2(m.total_amount + w.total_amount); m.fraud_count += w.fraud_count; });
      return { simSeconds: S.now / 1000, produced: S.produced, lag: S.queue.length, processed: S.processed, flagged: S.flagged, droppedLate: S.droppedLate, lateAccepted: S.lateAccepted,
        watermarkLagSec: S.maxEventTs ? (S.maxEventTs - S.watermark) / 1000 : 0, openWindows: open.length, closedWindows: closed, reasons: Object.assign({}, S.reasons),
        merchants: Object.values(byMerchant).sort((a, b) => b.txn_count - a.txn_count), recent: S.recent.slice(), history: S.history.slice(), queuePreview: S.queue.slice(0, 12) };
    }
    return { step, snapshot, reset, options: o, setRate: (v) => { o.rate = v; }, setCapacity: (v) => { o.capacity = v; }, setLateShare: (v) => { o.lateShare = v; } };
  }
  return { makeTxn, flagFraud, createPipeline, mulberry32, HIGH_AMOUNT, HIGH_RISK, WINDOW_MS, WATERMARK_MS, MERCHANTS };
});
