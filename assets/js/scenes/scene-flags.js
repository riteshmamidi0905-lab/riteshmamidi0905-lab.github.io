/* scene-flags.js — the six flagship projects. Each scene IS the project's architecture: a rail of its real stages across the top,
   and the stage that scroll has reached unfolds below it, running the project's real logic where this site holds it
   (stream-core, eval-core, rag-core, stats-core). Where a scene uses seeded synthetic data it says so on screen. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line, rand, rrect } = H;
  const RM = () => window.RMLab;
  const fit = (c, s, w, font) => { c.font = font; if (c.measureText(s).width <= w) return s; while (s.length > 4 && c.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };

  /* the architecture rail: stage nodes joined by a lane, a packet travelling to the active stage */
  function rail(c, L, labels, s, tint, t) {
    const B = L.box, mob = L.mobile, N = labels.length, y = B.y + (mob ? 14 : 22), x0 = B.x + 10, x1 = B.x + B.w - 10;
    const xs = labels.map((_, i) => lerp(x0, x1, N === 1 ? 0 : i / (N - 1)));
    line(c, x0, y, x1, y, HEX.tx, 1.2, 0.18);
    const hx = lerp(x0, x1, clamp(s / (N - 1))); c.strokeStyle = rgba(tint, 0.9); c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0, y); c.lineTo(hx, y); c.stroke();
    glow(c, hx, y, 22, tint, 0.5); c.fillStyle = '#fff'; c.fillRect(hx - 2, y - 2, 4, 4);
    labels.forEach((lb, i) => {
      const act = clamp(1 - Math.abs(s - i)), x = xs[i];
      c.fillStyle = '#05070a'; c.strokeStyle = rgba(act > 0.5 ? tint : HEX.tx, act > 0.5 ? 1 : 0.4); c.lineWidth = 1.5 + act * 1.5; c.beginPath(); c.arc(x, y, 6 + act * 3, 0, TAU); c.fill(); c.stroke();
      if (!mob) text(c, fit(c, lb.toUpperCase(), (x1 - x0) / N - 8, '700 11px ' + H.FONT), x, y + 30, { size: 11, w: 700, ls: 1.2, align: i === 0 ? 'left' : i === N - 1 ? 'right' : 'center', col: rgba(HEX.tx, 0.35 + 0.65 * act) });
      if (!mob) c.textAlign = 'left';
    });
    if (mob) text(c, labels[clamp(Math.round(s), 0, N - 1)].toUpperCase(), B.x + 10, y + 30, { size: 12, w: 700, ls: 1.4, col: HEX.tx });
    return { x: B.x, y: B.y + (mob ? 52 : 70), w: B.w, h: B.h - (mob ? 52 : 70) };
  }
  const D = (st, s, i) => clamp(1 - Math.abs(s - i) * 1.4);   // fade-in/out weight of stage i
  const tag = (c, L, str, col) => L.mobile ? wrap(c, str, L.box.x, L.box.y + L.box.h + 16, L.box.w, 11, { size: 9, w: 700, col: col || rgba(HEX.mut, 0.9) }) : text(c, str, L.box.x + L.box.w, L.H - 118, { size: 10, w: 700, ls: 1.3, align: 'right', col: col || rgba(HEX.mut, 0.9) });
  const cam = (st, L) => { st.cam = L.mobile ? { x: L.box.x + L.box.w / 2, y: L.box.y, z: 1 } : { x: L.box.x + L.box.w / 2, y: L.box.y, z: 1.1 }; };

  /* ============ 1 · real-time streaming pipeline ============ */
  scenes['flag-stream'] = {
    tint: HEX.blue,
    init(w) { const st = w.state, S = RM().streamCore; st.parts = []; st.pipe = S.createPipeline({ seed: 3, rate: 40, capacity: 60, lateShare: 0.15, onProcess(t) { if (st.parts.length < 80) st.parts.push({ age: 0, bad: t.is_fraud, drop: t.stage === 'dropped' }); } }); st.snap = st.pipe.snapshot(); },
    prime(w) { for (let i = 0; i < 500; i++) w.state.pipe.step(0.05); w.state.snap = w.state.pipe.snapshot(); w.state.parts = []; },
    advance(w, dt) { const st = w.state; st.pipe.step(dt); st.snap = st.pipe.snapshot(); st.parts.forEach((p) => { p.age += dt; }); st.parts = st.parts.filter((p) => p.age < 1.2); },
    draw(c, L, t, s, st) {
      const A = rail(c, L, ['Synthetic events', 'Kafka', 'Fraud rules + windows', 'Cassandra'], s, HEX.blue, t), sn = st.snap, mob = L.mobile, fs = mob ? 11 : 13;
      // live lane: events moving left→right through the stages
      const ly = A.y + A.h * 0.1;
      line(c, A.x + 10, ly, A.x + A.w - 10, ly, HEX.blue, 1, 0.2, [3, 5]);
      st.parts.forEach((p) => { const k = p.age / 1.2, x = A.x + 10 + (A.w - 20) * k; c.fillStyle = rgba(p.drop ? HEX.red : p.bad ? HEX.amber : HEX.ac2, 0.9 * (1 - k * 0.3)); c.fillRect(x - 2, ly - (p.drop ? -k * 30 : 2) - 2, p.bad ? 5 : 3, p.bad ? 5 : 3); });
      const y0 = A.y + A.h * 0.24;
      if (s < 0.7) { text(c, 'PRODUCER · seeded synthetic transactions (~3% fraud-shaped)', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); sn.recent.slice(-9).reverse().forEach((x, i) => text(c, `${x.txn_id}  ${x.account_id}  $${String(x.amount).padStart(7)}  ${x.currency}  ${x.merchant.padEnd(8)} ${x.country}  ${x.is_fraud ? '⚑ ' + x.fraud_reason : ''}`, A.x, y0 + 28 + i * (mob ? 18 : 28), { size: mob ? 10 : fs + 1, col: x.is_fraud ? HEX.amber : HEX.mut })); }
      if (s >= 0.7 && s < 1.7) { const a = D(st, s, 1); c.globalAlpha = a; text(c, `TOPIC transactions · consumer lag ${sn.lag} events`, A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); const cols = mob ? 24 : 60, cw = Math.min(A.w / cols, mob ? 12 : 18); for (let k = 0; k < 180; k++) { c.fillStyle = k < sn.queuePreview.length * 4 || k < sn.lag ? rgba(HEX.amber, 0.9) : rgba(HEX.tx, 0.08); c.fillRect(A.x + (k % cols) * cw, y0 + 20 + Math.floor(k / cols) * cw, cw - 2, cw - 2); } text(c, `${sn.produced} produced · ${sn.processed} consumed · 40/s in, 60/s capacity`, A.x, y0 + 40 + Math.ceil(180 / cols) * cw, { size: fs, col: HEX.mut }); c.globalAlpha = 1; }
      if (s >= 1.7 && s < 2.7) { const a = D(st, s, 2); c.globalAlpha = a; text(c, 'RULES · first match wins · explainable', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); [['high_amount', 'amount > 2000', sn.reasons.high_amount], ['high_risk_country', 'country ∈ {XX, ZZ, AN}', sn.reasons.high_risk_country], ['non_positive_amount', 'amount ≤ 0', sn.reasons.non_positive_amount]].forEach((r, i) => { const yy = y0 + 36 + i * (mob ? 40 : 56); text(c, r[0], A.x, yy, { size: mob ? 13 : 18, w: 700, col: HEX.amber }); text(c, r[1], A.x, yy + 18, { size: 11, col: HEX.mut }); text(c, String(r[2]), A.x + A.w * 0.5, yy + 6, { size: mob ? 22 : 34, w: 700, align: 'right', col: HEX.tx }); }); const yy = y0 + 36 + 3 * (mob ? 40 : 56) + 10; text(c, `watermark = max event time − 120 s (now −${sn.watermarkLagSec.toFixed(0)} s) · ${sn.droppedLate} too-late events dropped · ${sn.lateAccepted} late accepted`, A.x, yy, { size: fs, col: HEX.mut }); c.globalAlpha = 1; }
      if (s >= 2.7) { const a = D(st, s, 3); c.globalAlpha = a; text(c, 'CASSANDRA · merchant_metrics · 60 s event-time windows', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); const top = sn.merchants.slice(0, 7), mx = Math.max(1, ...top.map((m) => m.txn_count)), bw = A.w * (mob ? 0.5 : 0.55); top.forEach((m, i) => { const yy = y0 + 22 + i * (mob ? 24 : 34); text(c, m.merchant, A.x, yy + 14, { size: fs, col: HEX.tx }); c.fillStyle = rgba(HEX.blue, 0.75); c.fillRect(A.x + 100, yy, bw * m.txn_count / mx, mob ? 14 : 20); c.fillStyle = HEX.amber; c.fillRect(A.x + 100, yy, bw * m.fraud_count / mx, mob ? 14 : 20); text(c, `${m.txn_count} txn · ${m.fraud_count} flagged · $${Math.round(m.total_amount)}`, A.x + 108 + bw * m.txn_count / mx, yy + 14, { size: mob ? 9 : 11, col: HEX.mut }); }); c.globalAlpha = 1; }
      tag(c, L, 'SIMULATED WITH THE PIPELINE’S OWN RULES · SYNTHETIC EVENTS · NOT A DEPLOYED SYSTEM'); cam(st, L);
    },
  };

  /* ============ 2 · Spark lakehouse: raw → bronze → silver → gold → SQL (seeded synthetic rows, real rules) ============ */
  const ENUM = ['view', 'cart', 'purchase', 'refund'], CATS = ['books', 'audio', 'home', 'sport'];
  scenes['flag-lake'] = {
    tint: HEX.amber,
    init(w) {
      const r = rand(21), rows = []; for (let i = 0; i < 96; i++) rows.push({ id: i, user: 1 + Math.floor(r() * 400), type: ENUM[Math.floor(r() * 4)], qty: 1 + Math.floor(r() * 4), price: 5 + Math.floor(r() * 90), cat: CATS[Math.floor(r() * 4)] });
      rows[7].user = null; rows[19].user = null; rows[31].qty = -1; rows[44].qty = 0; rows[58].type = 'purchse'; rows[71].type = 'PURCHASE'; rows[83].type = null;
      const dups = [5, 22, 40, 66, 90]; dups.forEach((d, i) => { rows[d + 1] = Object.assign({}, rows[d], { id: d + 1, dupOf: d }); });
      const seen = new Set(), why = rows.map((x) => { if (x.dupOf != null) { return 'duplicate'; } if (x.user == null) return 'null user_id'; if (x.qty <= 0) return 'qty ≤ 0'; if (ENUM.indexOf(x.type) < 0) return 'bad event_type'; return null; });
      w.state.rows = rows; w.state.why = why;
      const gold = {}; rows.forEach((x, i) => { if (!why[i] && x.type === 'purchase') gold[x.cat] = (gold[x.cat] || 0) + x.qty * x.price; }); w.state.gold = CATS.map((k) => [k, gold[k] || 0]).sort((a, b) => b[1] - a[1]); w.state.reasons = {}; why.forEach((x) => { if (x) w.state.reasons[x] = (w.state.reasons[x] || 0) + 1; });
    },
    draw(c, L, t, s, st) {
      const A = rail(c, L, ['Raw events', 'Bronze', 'Silver', 'Gold marts', 'BI / SQL'], s, HEX.amber, t), mob = L.mobile, rows = st.rows, why = st.why, n = rows.length, cols = mob ? 12 : 16, rowsN = Math.ceil(n / cols);
      const cell = Math.min((A.w * (mob ? 1 : 0.55)) / cols, (A.h * (mob ? 0.4 : 0.9)) / rowsN), gx = A.x, gy = A.y + 14, silver = ease(clamp(s - 1.5, 0, 1)), gold = ease(clamp(s - 2.5, 0, 1)), sql = clamp(s - 3.3, 0, 1);
      rows.forEach((x, i) => {
        const bad = why[i], cx = gx + (i % cols) * cell, cy = gy + Math.floor(i / cols) * cell, fall = bad ? silver : 0;
        const col = bad && silver > 0.05 ? (bad === 'duplicate' ? HEX.violet : HEX.red) : s > 0.6 ? HEX.amber : HEX.mut; const aa = bad ? 1 - fall * 0.85 : (s > 2.5 ? 1 - gold * 0.55 : 1);
        c.fillStyle = rgba(col, 0.25 + 0.65 * aa); c.fillRect(cx, cy + fall * cell * 2.2, cell - 2, cell - 2);
      });
      const tx = mob ? A.x : A.x + A.w * 0.6, ty = mob ? gy + rowsN * cell + 26 : A.y + 18, fs = mob ? 11 : 13;
      const lab = (str, i, col) => text(c, str, tx, ty + i * (mob ? 17 : 24), { size: fs, w: i ? 500 : 700, col: col || HEX.mut });
      if (s < 1.5) { lab(s < 0.6 ? 'RAW · 96 synthetic events as emitted' : 'BRONZE · appended unchanged, ingest time added', 0, HEX.dim); lab('some are duplicated, missing a user or malformed', 1); }
      else if (s < 2.5) { lab('SILVER · rules applied', 0, HEX.dim); Object.entries(st.reasons).forEach(([k, v], i) => lab(`${v} × ${k}`, i + 1, k === 'duplicate' ? HEX.violet : HEX.red)); lab(`${n - why.filter(Boolean).length} rows pass`, Object.keys(st.reasons).length + 2, HEX.ac2); }
      else {
        lab('GOLD · revenue by category (purchases only)', 0, HEX.dim); const mx = Math.max(...st.gold.map((g) => g[1]), 1);
        st.gold.forEach((g, i) => { const yy = ty + 20 + i * (mob ? 26 : 38), bw = (mob ? A.w * 0.5 : A.w * 0.3) * gold * g[1] / mx; text(c, g[0], tx, yy + 14, { size: fs, col: HEX.tx }); c.fillStyle = rgba(HEX.amber, 0.85); c.fillRect(tx + 60, yy, bw, mob ? 16 : 24); text(c, String(g[1]), tx + 66 + bw, yy + (mob ? 13 : 17), { size: fs, col: HEX.mut }); });
        if (sql > 0.05) { const sy = ty + 40 + st.gold.length * (mob ? 26 : 38); c.globalAlpha = sql; text(c, 'SELECT category, SUM(qty*price) AS revenue', tx, sy, { size: fs - 1, col: HEX.ac2 }); text(c, 'FROM gold.sales GROUP BY category ORDER BY 2 DESC;', tx, sy + 17, { size: fs - 1, col: HEX.ac2 }); text(c, `→ ${st.gold[0][0]} leads with ${st.gold[0][1]}`, tx, sy + 40, { size: fs, w: 700, col: HEX.tx }); c.globalAlpha = 1; }
      }
      tag(c, L, 'SEEDED SYNTHETIC ROWS · THE SAME DEDUPE / NULL / QUANTITY / ENUM RULES AS THE REPO’S SILVER LAYER'); cam(st, L);
    },
  };

  /* ============ 3 · LLM eval framework: cases → outputs → rubric → scores → gate dashboard (eval-core, recorded fixtures) ============ */
  scenes['flag-eval'] = {
    tint: HEX.violet,
    init(w) { const E = RM().evalCore, st = w.state; st.grid = E.SCENARIOS.map((sc) => ({ sc, rows: sc.behaviours.map((b) => { const res = E.evaluate(sc, b.runs[0], b.trace, b.runs); return { b, res, g: E.gate(res) }; }) })); st.dims = E.DIMENSIONS; },
    draw(c, L, t, s, st) {
      const A = rail(c, L, ['Test cases', 'Model outputs', 'Rubric judge', 'Scores', 'Dashboard'], s, HEX.violet, t), mob = L.mobile, fs = mob ? 11 : 13, G = st.grid, sc0 = G[0], y0 = A.y + 14;
      if (s < 1.5) { const a = s < 1 ? 1 : 1 - (s - 1) * 2; c.globalAlpha = clamp(a); text(c, 'TEST CASES · each has a prompt, evidence, a reference and constraints', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); G.forEach((g, i) => { const yy = y0 + 30 + i * (mob ? 80 : 118); text(c, g.sc.title, A.x, yy, { size: mob ? 13 : 20, w: 700, col: HEX.tx }); wrap(c, '“' + g.sc.prompt + '”', A.x, yy + 22, A.w * 0.8, 16, { size: fs, col: HEX.mut, sans: true }); text(c, `must include ${(g.sc.constraints.mustInclude || []).join(', ')} · ≤ ${g.sc.constraints.maxWords} words · cite evidence`, A.x, yy + (mob ? 56 : 62), { size: mob ? 10 : 11, col: HEX.dim }); }); c.globalAlpha = 1; }
      if (s >= 0.6 && s < 2.5) { const a = clamp((s - 0.6) * 2) * (s < 1.6 ? 1 : 1 - clamp((s - 1.6) * 2)); if (a > 0) { c.globalAlpha = a; text(c, 'RECORDED OUTPUTS · same question, three behaviours', A.x, y0 + (mob ? 0 : 0), { size: 11, w: 700, ls: 1.2, col: HEX.dim }); sc0.rows.forEach((r, i) => { const yy = y0 + 30 + i * (mob ? 90 : 118); c.fillStyle = [HEX.ac2, HEX.red, HEX.amber][i]; c.fillRect(A.x, yy - 12, 3, mob ? 70 : 84); text(c, r.b.label.toUpperCase(), A.x + 14, yy, { size: 10, w: 700, ls: 1.2, col: [HEX.ac2, HEX.red, HEX.amber][i] }); wrap(c, r.b.runs[0], A.x + 14, yy + 22, A.w * 0.8, 17, { size: fs, col: HEX.tx }); }); c.globalAlpha = 1; } }
      if (s >= 1.5 && s < 3.5) { const a = clamp((s - 1.5) * 2) * (s < 2.5 ? 1 : 1 - clamp((s - 2.5) * 2)); if (a > 0) { c.globalAlpha = a; text(c, 'RUBRIC · instruction adherence checks, run against each output', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); sc0.rows.forEach((r, i) => { const xx = A.x + (mob ? 0 : i * A.w / 3), yy = y0 + 34 + (mob ? i * 92 : 0), cw = mob ? A.w : A.w / 3 - 20; text(c, r.b.label, xx, yy, { size: fs, w: 700, col: [HEX.ac2, HEX.red, HEX.amber][i] }); r.res.instruction_adherence.checks.forEach((k, j) => text(c, (k.pass ? '✓ ' : '✗ ') + fit(c, k.name, cw - 20, '500 ' + (mob ? 10 : 12) + 'px ' + H.FONT), xx, yy + 22 + j * (mob ? 16 : 24), { size: mob ? 10 : 12, col: k.pass ? HEX.ac2 : HEX.red })); }); c.globalAlpha = 1; } }
      if (s >= 2.5 && s < 4.5) { const a = clamp((s - 2.5) * 2) * (s < 3.5 ? 1 : 1 - clamp((s - 3.5) * 2)); if (a > 0) { c.globalAlpha = a; text(c, 'SCORES · six dimensions, 0–1, each with its own gate (0.6)', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); const bw = A.w * (mob ? 0.4 : 0.14); st.dims.forEach((d, k) => { const yy = y0 + 28 + k * (mob ? 22 : 34); text(c, d[1], A.x, yy + 12, { size: mob ? 10 : 12, col: HEX.mut }); sc0.rows.forEach((r, i) => { const v = r.res[d[0]].score || 0, bx = A.x + (mob ? 120 : 220) + i * (bw + 14); c.fillStyle = rgba(HEX.tx, 0.07); c.fillRect(bx, yy, bw, mob ? 12 : 16); c.fillStyle = v < 0.6 ? HEX.red : [HEX.ac2, HEX.red, HEX.amber][i]; c.fillRect(bx, yy, bw * v, mob ? 12 : 16); }); }); line(c, A.x + (mob ? 120 : 220) + 0.6 * bw, y0 + 20, A.x + (mob ? 120 : 220) + 0.6 * bw, y0 + 28 + 6 * (mob ? 22 : 34), HEX.amber, 1, 0.8, [3, 4]); c.globalAlpha = 1; } }
      if (s >= 3.5) { const a = clamp((s - 3.5) * 2); c.globalAlpha = a; text(c, 'GATE DASHBOARD · pass requires every dimension ≥ threshold, no averaging', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); G.forEach((g, i) => g.rows.forEach((r, j) => { const bw = A.w / 3 - 12, xx = A.x + j * (bw + 12), yy = y0 + 28 + i * (mob ? 84 : Math.min(112, (A.h - 56) / 3.1)); text(c, g.sc.title, A.x, yy - 6 + (j ? 0 : 0), { size: 10, col: HEX.dim, w: 700 }); if (j === 0) { } const ok = r.g.pass; c.fillStyle = rgba(ok ? HEX.ac : HEX.red, 0.14); c.fillRect(xx, yy + 4, bw, mob ? 58 : 72); c.fillStyle = ok ? HEX.ac2 : HEX.red; c.fillRect(xx, yy + 4, 3, mob ? 58 : 72); text(c, ok ? 'PASS' : 'FAIL', xx + 12, yy + 28, { size: mob ? 14 : 20, w: 700, col: ok ? HEX.ac2 : HEX.red }); text(c, fit(c, r.b.label, bw - 16, '500 11px ' + H.FONT), xx + 12, yy + 46, { size: 11, col: HEX.mut }); if (!ok && !mob) text(c, fit(c, 'weakest: ' + r.g.weakest.label, bw - 16, '500 10px ' + H.FONT), xx + 12, yy + 64, { size: 10, col: HEX.red }); })); c.globalAlpha = 1; }
      tag(c, L, 'RECORDED SAMPLE OUTPUTS · DETERMINISTIC PROXY METRICS · NOT LIVE MODEL CALLS'); cam(st, L);
    },
  };

  /* ============ 4 · GenAI doc assistant: real retrieval + extractive answer (rag-core) ============ */
  scenes['flag-rag'] = {
    tint: HEX.ac,
    init(w) { const R = RM().ragCore, cp = R.corpus, st = w.state, q = cp.cases[1].question, idx = R.buildIndex(cp.docs), hits = R.retrieve(idx, q, 6, true); st.q = q; st.hits = hits; st.top = hits.slice(0, 4); st.ans = R.answer(q, st.top); },
    draw(c, L, t, s, st) {
      const A = rail(c, L, ['Query', 'Retriever', 'Relevant chunks', 'LLM', 'Cited answer'], s, HEX.ac, t), mob = L.mobile, fs = mob ? 11 : 13, y0 = A.y + 14, hits = st.hits;
      const qs = Math.round(clamp(s / 0.8) * st.q.length); text(c, 'QUERY', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); text(c, '“' + st.q.slice(0, qs) + (s < 0.8 && (t * 2 | 0) % 2 ? '▌' : '') + '”', A.x, y0 + (mob ? 26 : 44), { size: mob ? 16 : 28, w: 600, sans: true, col: HEX.tx });
      const ry = y0 + (mob ? 56 : 84), a1 = clamp((s - 0.7) * 2);
      if (a1 > 0) { text(c, 'HYBRID SCORE · 0.7 × vector + 0.3 × keyword, per chunk', A.x, ry, { size: 11, w: 700, ls: 1.2, col: rgba(HEX.dim, a1) }); const rowH = mob ? 28 : Math.min(52, A.h / 7), bw = A.w * (mob ? 0.34 : 0.28), prog = clamp(s - 1, 0, 1);
        hits.forEach((h, i) => { const yy = ry + 14 + i * rowH, top = i < 4, on = s >= 2 && !top ? 0.35 : 1; c.globalAlpha = a1 * on; text(c, String(i + 1), A.x, yy + 13, { size: mob ? 12 : 16, w: 700, col: top ? HEX.ac2 : HEX.dim }); text(c, fit(c, h.chunk.chunk_id || h.chunk.id || '', mob ? 90 : 170, '500 11px ' + H.FONT), A.x + 24, yy + 13, { size: 11, col: HEX.mut });
          const bx = A.x + (mob ? 124 : 210); c.fillStyle = rgba(HEX.tx, 0.07); c.fillRect(bx, yy + 2, bw, 8); c.fillStyle = rgba(HEX.blue, 0.9); c.fillRect(bx, yy + 2, bw * clamp(h.vector) * prog, 8); c.fillStyle = rgba(HEX.tx, 0.07); c.fillRect(bx, yy + 14, bw, 8); c.fillStyle = rgba(HEX.amber, 0.9); c.fillRect(bx, yy + 14, bw * clamp(h.keyword) * prog, 8); text(c, h.score.toFixed(3), bx + bw + 10, yy + 18, { size: 11, w: 700, col: top ? HEX.ac2 : HEX.mut }); }); c.globalAlpha = 1; }
      if (s >= 2) { const a = clamp((s - 2) * 1.6), tx = mob ? A.x : A.x + A.w * 0.62, ty = mob ? ry + 14 + 6 * (mob ? 28 : 40) + 12 : ry; c.globalAlpha = a; text(c, s < 3.3 ? 'TOP CHUNKS → CONTEXT' : 'EXTRACTIVE “LLM” · no language model', tx, ty, { size: 11, w: 700, ls: 1.2, col: HEX.dim });
        if (s < 3.3) st.top.forEach((h, i) => wrap(c, `[${i + 1}] ${h.chunk.text}`, tx, ty + 22 + i * (mob ? 36 : 62), A.w * (mob ? 1 : 0.37), mob ? 14 : 17, { size: mob ? 10 : 12, col: i === 0 ? HEX.tx : HEX.mut }));
        else { const b = clamp((s - 3.3) * 1.2); c.globalAlpha = b; let yy = ty + 26; st.ans.chosen.forEach((x) => { const n = wrap(c, x.sentence + ' ', tx, yy, A.w * (mob ? 1 : 0.37), mob ? 16 : 22, { size: mob ? 12 : 16, col: HEX.tx, sans: true }); text(c, `[${x.cite}]`, tx, yy + n * (mob ? 16 : 22) + 2, { size: 11, w: 700, col: HEX.ac2 }); yy += n * (mob ? 16 : 22) + 22; }); text(c, 'cited chunks: ' + st.ans.citations.map((x) => '[' + x + ']').join(' '), tx, yy + 6, { size: 11, col: HEX.mut }); }
        c.globalAlpha = 1; }
      tag(c, L, 'REAL RETRIEVAL + EXTRACTIVE ANSWER OVER A FIXED SAMPLE CORPUS · NO LANGUAGE MODEL'); cam(st, L);
    },
  };

  /* ============ 5 · MLOps platform: structural stages + real PSI / KS on a synthetic feature that scroll shifts ============ */
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(TAU * r());
  function psi(ref, live, bins) { const s = ref.slice().sort((a, b) => a - b), e = []; for (let i = 1; i < bins; i++) e.push(s[Math.floor(s.length * i / bins)]); const cnt = (x) => { const c = new Array(bins).fill(0); x.forEach((v) => { let b = 0; while (b < e.length && v > e[b]) b++; c[b]++; }); return c.map((v) => Math.max(v / x.length, 1e-4)); }; const a = cnt(ref), b = cnt(live); return a.reduce((m, p, i) => m + (b[i] - p) * Math.log(b[i] / p), 0); }
  function ks(a, b) { const x = a.slice().sort((p, q) => p - q), y = b.slice().sort((p, q) => p - q); let i = 0, j = 0, d = 0; while (i < x.length && j < y.length) { if (x[i] <= y[j]) i++; else j++; d = Math.max(d, Math.abs(i / x.length - j / y.length)); } return d; }
  scenes['flag-drift'] = {
    tint: HEX.ac,
    init(w) { const r = rand(33), st = w.state; st.ref = Array.from({ length: 1500 }, () => gauss(r)); st.z = Array.from({ length: 1500 }, () => gauss(r)); },
    draw(c, L, t, s, st) {
      const A = rail(c, L, ['Feature store', 'Experiments', 'Registry', 'Serving', 'Drift monitor'], s, HEX.ac, t), mob = L.mobile, fs = mob ? 11 : 13, y0 = A.y + 14, cx = A.x + A.w * 0.5;
      const stage = (i, f) => { const a = D(st, s, i); if (a > 0.02) { c.globalAlpha = a; f(); c.globalAlpha = 1; } };
      const box = (x, y, w, h, lab, col, sub) => { c.strokeStyle = rgba(col, 0.8); c.lineWidth = 1.5; rrect(c, x, y, w, h, 6); c.stroke(); c.fillStyle = rgba(col, 0.08); c.fill(); text(c, lab, x + w / 2, y + h / 2 + (sub ? -2 : 4), { size: fs, w: 700, align: 'center', col: HEX.tx }); if (sub) text(c, sub, x + w / 2, y + h / 2 + 14, { size: 10, align: 'center', col: HEX.mut }); };
      const arrow = (x1, y1, x2, y2, col) => { line(c, x1, y1, x2, y2, col || HEX.ac2, 1.6, 0.8); const a = Math.atan2(y2 - y1, x2 - x1); c.fillStyle = rgba(col || HEX.ac2, 0.9); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 9 * Math.cos(a - 0.4), y2 - 9 * Math.sin(a - 0.4)); c.lineTo(x2 - 9 * Math.cos(a + 0.4), y2 - 9 * Math.sin(a + 0.4)); c.closePath(); c.fill(); };
      const bw = A.w * (mob ? 0.4 : 0.22), bh = mob ? 44 : 64, m = A.h * 0.12;
      stage(0, () => { text(c, 'ONE DEFINITION → TWO STORES', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); box(cx - bw / 2, y0 + 30, bw, bh, 'feature definition', HEX.ac, 'compute once'); box(A.x + A.w * 0.08, y0 + 30 + bh + m * 2, bw, bh, 'offline store', HEX.blue, 'training · point-in-time'); box(A.x + A.w * 0.92 - bw, y0 + 30 + bh + m * 2, bw, bh, 'online store', HEX.amber, 'serving · low latency'); arrow(cx - bw / 4, y0 + 30 + bh, A.x + A.w * 0.08 + bw / 2, y0 + 30 + bh + m * 2); arrow(cx + bw / 4, y0 + 30 + bh, A.x + A.w * 0.92 - bw / 2, y0 + 30 + bh + m * 2); text(c, 'the same code path feeds both, so training and serving cannot silently diverge', cx, y0 + 30 + 2 * bh + m * 2 + 36, { size: fs, align: 'center', col: HEX.mut }); });
      stage(1, () => { text(c, 'EVERY RUN RECORDED · params → metrics → artifact', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); const r = rand(77); for (let i = 0; i < 4; i++) { const yy = y0 + 30 + i * (mob ? 54 : 74); box(A.x, yy, bw * 1.1, bh * 0.8, 'run ' + (i + 1), HEX.violet, 'params logged'); arrow(A.x + bw * 1.1, yy + bh * 0.4, A.x + bw * 1.5, yy + bh * 0.4, HEX.violet); box(A.x + bw * 1.5, yy, bw * 1.1, bh * 0.8, 'metrics', HEX.ac, 'compared'); arrow(A.x + bw * 2.6, yy + bh * 0.4, A.x + bw * 3.0, yy + bh * 0.4, HEX.ac); if (!mob) box(A.x + bw * 3.0, yy, bw * 1.1, bh * 0.8, 'artifact', HEX.blue, 'model file'); } text(c, 'no numbers shown: this stage is the structure, not a result', A.x, y0 + 30 + 4 * (mob ? 54 : 74) + 10, { size: fs, col: HEX.mut }); });
      stage(2, () => { text(c, 'MODEL LIFECYCLE · versions move through stages', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); ['None', 'Staging', 'Production', 'Archived'].forEach((n, i) => { const x = A.x + i * A.w / 4, col = [HEX.mut, HEX.amber, HEX.ac, HEX.dim][i]; box(x, y0 + 50, A.w / 4 - 28, bh, n, col, 'v' + (i + 1)); if (i < 3) arrow(x + A.w / 4 - 28, y0 + 50 + bh / 2, x + A.w / 4 - 2, y0 + 50 + bh / 2, col); }); text(c, 'only one version is served as Production; promotion and rollback are explicit transitions', A.x, y0 + 50 + bh + 40, { size: fs, col: HEX.mut }); });
      stage(3, () => { text(c, 'SERVING · load the Production model, predict on online features', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); const xs = [0.04, 0.34, 0.64]; ['request', 'online features + model', 'prediction'].forEach((n, i) => { box(A.x + A.w * xs[i], y0 + 40, A.w * 0.26, bh, n, [HEX.blue, HEX.ac, HEX.amber][i]); if (i < 2) arrow(A.x + A.w * (xs[i] + 0.26), y0 + 40 + bh / 2, A.x + A.w * xs[i + 1], y0 + 40 + bh / 2); }); for (let k = 0; k < 6; k++) { const u = ((t * 0.4 + k / 6) % 1), x = A.x + A.w * (0.04 + 0.86 * u); c.fillStyle = rgba(HEX.ac2, 0.9); c.fillRect(x, y0 + 40 + bh + 18, 3, 3); } line(c, A.x, y0 + 40 + bh + 19, A.x + A.w, y0 + 40 + bh + 19, HEX.ac, 1, 0.15); });
      stage(4, () => {
        const shift = clamp(s - 3.4, 0, 1) * 1.5, live = st.z.map((v) => v + shift), P = psi(st.ref, live, 10), K = ks(st.ref, live), hx = A.x, hw = A.w * (mob ? 1 : 0.62), hy = y0 + 36, hh = A.h * (mob ? 0.4 : 0.66), bins = 36, lo = -4, hi = 5.5;
        const hist = (x) => { const h = new Array(bins).fill(0); x.forEach((v) => { const b = Math.floor((v - lo) / (hi - lo) * bins); if (b >= 0 && b < bins) h[b]++; }); return h; }, hr = hist(st.ref), hl = hist(live), mx = Math.max(...hr, ...hl);
        text(c, 'SYNTHETIC FEATURE · reference (training) vs live (serving)', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim });
        line(c, hx, hy + hh, hx + hw, hy + hh, HEX.tx, 1, 0.2);
        [[hr, HEX.blue], [hl, P > 0.2 ? HEX.red : HEX.amber]].forEach(([h, col]) => { c.beginPath(); h.forEach((v, i) => { const x = hx + hw * (i + 0.5) / bins, y = hy + hh * (1 - v / mx); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.lineTo(hx + hw, hy + hh); c.lineTo(hx, hy + hh); c.closePath(); c.fillStyle = rgba(col, 0.2); c.fill(); c.strokeStyle = rgba(col, 0.95); c.lineWidth = 2; c.stroke(); });
        const tx = mob ? A.x : A.x + A.w * 0.68, ty = mob ? hy + hh + 28 : hy + 10; text(c, 'PSI', tx, ty, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); text(c, P.toFixed(3), tx, ty + (mob ? 28 : 46), { size: mob ? 26 : 44, w: 700, col: P > 0.2 ? HEX.red : P > 0.1 ? HEX.amber : HEX.ac2 }); text(c, P > 0.2 ? 'DRIFT · retraining alert' : P > 0.1 ? 'moderate shift' : 'stable', tx, ty + (mob ? 48 : 74), { size: fs, w: 700, col: P > 0.2 ? HEX.red : HEX.mut });
        text(c, `KS statistic ${K.toFixed(3)}  ·  thresholds 0.1 / 0.2`, tx, ty + (mob ? 66 : 100), { size: 11, col: HEX.mut }); text(c, `live mean shift +${shift.toFixed(2)} σ (scroll-driven)`, tx, ty + (mob ? 82 : 122), { size: 11, col: HEX.mut });
      });
      tag(c, L, 'PSI AND KS COMPUTED LIVE ON SEEDED SYNTHETIC DATA · STRUCTURAL STAGES CARRY NO NUMBERS'); cam(st, L);
    },
  };

  /* ============ 6 · experimentation toolkit: power → assignment → test → CUPED/guardrails → scorecard (stats-core + seeded synthetic) ============ */
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  scenes['flag-ab'] = {
    tint: HEX.amber,
    init(w) {
      const st = w.state, r = rand(8), N = 6000; st.N = N; st.users = Array.from({ length: N }, (_, i) => ({ arm: hash('exp1:u' + i) < 0.5 ? 0 : 1, x: gauss(r) }));
      st.users.forEach((u) => { const base = 0.5 * u.x + gauss(r); u.y = 20 + 4 * base + (u.arm ? 0.6 : 0) ; u.pre = 20 + 4 * (0.5 * u.x + 0 * base) + gauss(r) * 1; u.pre = 20 + 4 * u.x * 0.8 + gauss(r) * 1.5; u.y = u.pre + (u.arm ? 0.5 : 0) + gauss(r) * 2; u.conv = r() < (u.arm ? 0.116 : 0.1) ? 1 : 0; u.ref = r() < (u.arm ? 0.041 : 0.04) ? 1 : 0; });
    },
    draw(c, L, t, s, st) {
      const A = rail(c, L, ['Design + power', 'Assignment', 'z / Welch / bootstrap', 'CUPED + guardrails', 'Scorecard'], s, HEX.amber, t), mob = L.mobile, fs = mob ? 11 : 13, y0 = A.y + 14, S = RM().statsCore, N = st.N, U = st.users;
      const stage = (i, f) => { const a = D(st, s, i); if (a > 0.02) { c.globalAlpha = a; f(); c.globalAlpha = 1; } };
      const stats = (n) => { n = Math.min(n, N); let xc = 0, nc = 0, xt = 0, nt = 0, gc = 0, gt = 0; for (let i = 0; i < n; i++) { const u = U[i]; if (u.arm) { nt++; xt += u.conv; gt += u.ref; } else { nc++; xc += u.conv; gc += u.ref; } } return { r: S.proportionsZTest(xc, nc, xt, nt), g: S.proportionsZTest(gc, nc, gt, nt), nc, nt }; };
      stage(0, () => { text(c, 'DESIGN · how many users per arm before the result can mean anything?', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); const gx = A.x + 40, gy = y0 + 36, gw = A.w * (mob ? 0.9 : 0.55), gh = A.h * 0.55, base = 0.1; line(c, gx, gy + gh, gx + gw, gy + gh, HEX.tx, 1, 0.25); line(c, gx, gy, gx, gy + gh, HEX.tx, 1, 0.25);
        const pts = []; for (let m = 0.008; m <= 0.04; m += 0.001) pts.push([m, S.sampleSizeProportion(base, m)]); const mx = pts[0][1]; c.strokeStyle = HEX.amber; c.lineWidth = 2.4; c.beginPath(); pts.forEach(([m, n], i) => { const x = gx + gw * (m - 0.008) / 0.032, y = gy + gh * (1 - n / mx); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
        const pick = 0.016, n = S.sampleSizeProportion(base, pick), px = gx + gw * (pick - 0.008) / 0.032, py = gy + gh * (1 - n / mx); glow(c, px, py, 20, HEX.amber, 0.5); c.fillStyle = '#fff'; c.beginPath(); c.arc(px, py, 4, 0, TAU); c.fill();
        text(c, 'minimum detectable effect (abs.)  →', gx + gw, gy + gh + 20, { size: 10, align: 'right', col: HEX.dim }); text(c, 'users per arm', gx - 6, gy - 8, { size: 10, col: HEX.dim });
        const tx = mob ? A.x : A.x + A.w * 0.66; text(c, `baseline ${base * 100}% · α 0.05 · power 0.8`, tx, mob ? gy + gh + 44 : gy + 10, { size: fs, col: HEX.mut }); text(c, `${n.toLocaleString()} per arm`, tx, (mob ? gy + gh + 72 : gy + 52), { size: mob ? 20 : 34, w: 700, col: HEX.tx }); text(c, `to detect +${(pick * 100).toFixed(1)} pp`, tx, (mob ? gy + gh + 92 : gy + 80), { size: fs, col: HEX.mut }); });
      stage(1, () => { text(c, 'ASSIGNMENT · hash(experiment, user) → arm, deterministic and sticky', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); const cols = mob ? 30 : 70, rows = mob ? 10 : 14, cell = Math.min(A.w * (mob ? 1 : 0.62) / cols, A.h * 0.6 / rows), reveal = clamp(s - 0.7, 0, 1) * 1.1, split = ease(clamp((s - 0.9) / 0.5)); for (let i = 0; i < cols * rows; i++) { const u = U[i], on = i / (cols * rows) < reveal, x = A.x + (i % cols) * cell + (u.arm ? split * 40 : 0), y = A.y + 40 + Math.floor(i / cols) * cell + (u.arm ? split * 20 : 0); c.fillStyle = on ? rgba(u.arm ? HEX.ac2 : HEX.blue, 0.85) : rgba(HEX.tx, 0.06); c.fillRect(x, y, cell - 1.5, cell - 1.5); }
        const tx = mob ? A.x : A.x + A.w * 0.68, ty = mob ? A.y + 60 + rows * cell : A.y + 50, a = stats(cols * rows * 8); text(c, 'control', tx, ty, { size: fs, col: HEX.blue, w: 700 }); text(c, 'treatment', tx, ty + 24, { size: fs, col: HEX.ac2, w: 700 }); text(c, `split ${a.nc} / ${a.nt} of ${a.nc + a.nt}`, tx, ty + 56, { size: fs, col: HEX.mut }); text(c, 'same user, same arm, every time', tx, ty + 76, { size: fs, col: HEX.mut }); });
      stage(2, () => { const n = Math.min(N, Math.round(N * ease(clamp((s - 1.6) / 0.9)) + 300)), a = stats(n), r = a.r, rng = 0.03, ix = (v) => A.x + 20 + (A.w * (mob ? 0.9 : 0.6)) * (0.5 + v / (2 * rng)), iy = y0 + A.h * 0.35; text(c, `TWO-PROPORTION z-TEST · running, ${n.toLocaleString()} synthetic users`, A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim }); line(c, ix(-rng), iy, ix(rng), iy, HEX.tx, 1, 0.2); line(c, ix(0), iy - 22, ix(0), iy + 22, HEX.red, 1.5, 0.8); const col = r.significant ? HEX.ac2 : HEX.amber; c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.moveTo(clamp(ix(r.ciLow), A.x, A.x + A.w), iy); c.lineTo(clamp(ix(r.ciHigh), A.x, A.x + A.w), iy); c.stroke(); glow(c, ix(r.absEffect), iy, 18, col, 0.45); c.fillStyle = '#fff'; c.beginPath(); c.arc(ix(r.absEffect), iy, 4.5, 0, TAU); c.fill(); text(c, 'no effect', ix(0), iy + 40, { size: 10, align: 'center', col: HEX.red });
        [['control', (r.control * 100).toFixed(2) + '%'], ['treatment', (r.treatment * 100).toFixed(2) + '%'], ['z', r.z.toFixed(2)], ['p', r.pValue < 1e-4 ? '<0.0001' : r.pValue.toFixed(4)]].forEach((x, i) => { const px = A.x + (mob ? (i % 2) * A.w * 0.5 : i * A.w * 0.2), py = iy + 80 + (mob ? Math.floor(i / 2) * 50 : 0); text(c, x[0], px, py, { size: 11, col: HEX.mut }); text(c, x[1], px, py + 26, { size: mob ? 18 : 26, w: 700, col: HEX.tx }); }); });
      stage(3, () => { const w2 = clamp((s - 2.6) / 0.8); text(c, 'CUPED · adjust the outcome with a pre-experiment covariate', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim });
        let mx = 0, my = 0; U.forEach((u) => { mx += u.pre; my += u.y; }); mx /= N; my /= N; let cv = 0, vx = 0; U.forEach((u) => { cv += (u.pre - mx) * (u.y - my); vx += (u.pre - mx) ** 2; }); const th = cv / vx, ad = (u) => u.y - th * (u.pre - mx);
        const sd = (f, arm) => { let m = 0, n = 0; U.forEach((u) => { if (u.arm === arm) { m += f(u); n++; } }); m /= n; let v = 0; U.forEach((u) => { if (u.arm === arm) v += (f(u) - m) ** 2; }); return { m, se: Math.sqrt(v / (n - 1) / n) }; };
        const eff = (f) => { const a = sd(f, 0), b = sd(f, 1); return { d: b.m - a.m, se: Math.sqrt(a.se ** 2 + b.se ** 2) }; }, raw = eff((u) => u.y), cup = eff(ad), rngv = 3 * raw.se, ix = (v) => A.x + 20 + A.w * (mob ? 0.9 : 0.6) * (0.5 + (v - raw.d) / (2 * rngv)), iy = y0 + A.h * 0.3;
        [[raw, 'raw mean difference', HEX.amber, 0], [cup, 'CUPED-adjusted', HEX.ac2, 1]].forEach(([e, lab, col, k]) => { const yy = iy + k * 70 * w2 + (k ? 0 : 0), a = k ? w2 : 1; c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.moveTo(ix(e.d - 1.96 * e.se), yy); c.lineTo(ix(e.d + 1.96 * e.se), yy); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ix(e.d), yy, 4, 0, TAU); c.fill(); text(c, `${lab}  ±${(1.96 * e.se).toFixed(2)}`, ix(e.d - 1.96 * e.se), yy - 14, { size: fs, w: 700, col }); c.globalAlpha /= a; });
        const tx = mob ? A.x : A.x + A.w * 0.7, ty = mob ? iy + 130 : iy - 20; text(c, `variance reduced`, tx, ty, { size: 11, col: HEX.mut }); text(c, `${((1 - (cup.se / raw.se) ** 2) * 100).toFixed(0)}%`, tx, ty + (mob ? 28 : 46), { size: mob ? 24 : 40, w: 700, col: HEX.ac2 }); text(c, `θ = ${th.toFixed(2)} · same data, narrower interval`, tx, ty + (mob ? 46 : 70), { size: 11, col: HEX.mut }); });
      stage(4, () => { const a = stats(N), d = S.decide(a.r, [{ name: 'refund rate', higherIsBetter: false, result: a.g }]), col = d.verdict === 'SHIP' ? HEX.ac2 : d.verdict === 'KILL' ? HEX.red : HEX.amber; text(c, 'SCORECARD · primary metric + guardrail → decision', A.x, y0, { size: 11, w: 700, ls: 1.2, col: HEX.dim });
        text(c, d.verdict, A.x, y0 + (mob ? 64 : 120), { size: mob ? 48 : 96, w: 700, col }); glow(c, A.x + 80, y0 + (mob ? 48 : 90), 120, col, 0.12); wrap(c, d.reason, A.x, y0 + (mob ? 90 : 160), A.w * (mob ? 1 : 0.6), mob ? 17 : 22, { size: mob ? 12 : 16, col: HEX.tx, sans: true });
        [['primary · conversion', `${(a.r.control * 100).toFixed(2)}% → ${(a.r.treatment * 100).toFixed(2)}%  p=${a.r.pValue.toFixed(4)}`], ['guardrail · refunds', `${(a.g.control * 100).toFixed(2)}% → ${(a.g.treatment * 100).toFixed(2)}%  p=${a.g.pValue.toFixed(3)}`]].forEach((x, i) => { const yy = y0 + (mob ? 150 : 250) + i * (mob ? 40 : 52); text(c, x[0], A.x, yy, { size: 11, col: HEX.dim, w: 700 }); text(c, x[1], A.x, yy + 20, { size: fs + 1, col: HEX.tx }); }); });
      tag(c, L, 'REAL stats-core CALCULATIONS ON A SEEDED SYNTHETIC SAMPLE · NOT A PRODUCTION EXPERIMENT'); cam(st, L);
    },
  };
  Object.keys(scenes).filter((k) => k.indexOf('flag-') === 0).forEach((k) => window.RMW.register(k, scenes[k]));
})();
