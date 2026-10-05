/* scene-flag-lake.js — Spark Data Lakehouse. Personality: data movement, transformation, layers, query path.
   96 seeded SYNTHETIC events physically flow raw → bronze → silver → gold → SQL. The silver rules are the repo's own (dedupe on event id,
   drop null user, drop non-positive quantity, enum-check the event type); rejected rows peel off and stay visible with their reason;
   the gold bars and the SQL result are aggregated from the rows that survived. */
(() => {
  'use strict';
  const { H, scenes, kit } = window.RMW; const { clamp, lerp, ease, HEX, rgba, text, rand } = H;
  const ENUM = ['view', 'cart', 'purchase', 'refund'], CATS = ['books', 'audio', 'home', 'sport'];
  const LAYERS = ['RAW', 'BRONZE', 'SILVER', 'GOLD', 'BI / SQL'];

  scenes['flag-lake'] = {
    tint: HEX.amber, still: 4,
    init(w) {
      const r = rand(21), rows = [], st = w.state; for (let i = 0; i < 96; i++) rows.push({ id: i, user: 1 + Math.floor(r() * 400), type: ENUM[Math.floor(r() * 4)], qty: 1 + Math.floor(r() * 4), price: 5 + Math.floor(r() * 90), cat: CATS[Math.floor(r() * 4)] });
      rows[7].user = null; rows[19].user = null; rows[31].qty = -1; rows[44].qty = 0; rows[58].type = 'purchse'; rows[71].type = 'PURCHASE'; rows[83].type = null;
      [5, 22, 40, 66, 90].forEach((d) => { rows[d + 1] = Object.assign({}, rows[d], { id: d + 1, dupOf: d }); });
      st.rows = rows; st.why = rows.map((x) => x.dupOf != null ? 'duplicate' : x.user == null ? 'null user_id' : x.qty <= 0 ? 'qty ≤ 0' : ENUM.indexOf(x.type) < 0 ? 'bad event_type' : null);
      st.reasons = {}; st.why.forEach((x) => { if (x) st.reasons[x] = (st.reasons[x] || 0) + 1; });
      const gold = {}; rows.forEach((x, i) => { if (!st.why[i] && x.type === 'purchase') gold[x.cat] = (gold[x.cat] || 0) + x.qty * x.price; });
      st.gold = CATS.map((k) => [k, gold[k] || 0]).sort((a, b) => b[1] - a[1]);
      st.pass = []; st.rej = []; st.cnt = {}; st.stack = {}; rows.forEach((x, i) => { if (st.why[i]) st.rej.push(i); else st.pass.push(i); });
      st.pass.forEach((i) => { if (rows[i].type === 'purchase') { const k = rows[i].cat; st.stack[i] = (st.cnt[k] = (st.cnt[k] || 0) + 1) - 1; } });
    },
    draw(c, L, t, s, st) {
      const A = kit.rail(c, L, LAYERS.map((x, i) => ['Raw events', 'Bronze', 'Silver', 'Gold marts', 'BI / SQL'][i]), s, HEX.amber), mob = L.mobile, rows = st.rows, why = st.why, n = rows.length;
      const f = clamp(s, 0, 4), fl = Math.min(3, Math.floor(f)), fr = f - fl;
      // layout
      const cols = mob ? 24 : 8, gr = Math.ceil(n / cols);
      const cell = mob ? Math.min(A.w / 24, 14) : Math.min(A.w * 0.145 / cols, (A.h - 110) / (gr + 2.8));
      const bandH = mob ? (A.h - 170) / 4 : 0, cx = (j) => A.x + A.w * (0.04 + 0.2 * j);
      const orig = (j) => mob ? [A.x, A.y + j * bandH + 18] : [cx(j), A.y + 64];
      const gridPos = (j, g) => { const o = orig(j); return [o[0] + (g % cols) * cell, o[1] + Math.floor(g / cols) * cell]; };
      const passIdx = {}; st.pass.forEach((i, k) => { passIdx[i] = k; }); const rejIdx = {}; st.rej.forEach((i, k) => { rejIdx[i] = k; });
      const goldBase = (k) => mob ? [A.x + 118, A.y + 3 * bandH + 30 + CATS.indexOf(k) * 13] : [cx(3) + CATS.indexOf(k) * (cell * 3.2), A.y + 26 + (gr + 2) * cell];
      const P = (l, i) => {
        if (l <= 1) return gridPos(l, i);
        const bad = why[i];
        if (l === 2) { if (bad) { if (mob) return gridPos(2, st.pass.length + rejIdx[i]); const o = orig(2); return [o[0] + (rejIdx[i] % cols) * cell, o[1] + (gr + 1.4) * cell + Math.floor(rejIdx[i] / cols) * cell]; } return gridPos(2, i); }
        if (bad || rows[i].type !== 'purchase') return P(2, i);
        const b = goldBase(rows[i].cat), k = st.stack[i]; return mob ? [b[0] + k * 12, b[1]] : [b[0], b[1] - k * (cell * 0.5)];
      };
      const reasonCol = (r) => r === 'duplicate' ? HEX.violet : HEX.red;
      for (let j = 0; j < 5; j++) { // layer headers
        const o = orig(j), on = Math.abs(s - j) < 0.6, a = on ? 1 : 0.4; if (j > 3) continue;
        text(c, LAYERS[j], o[0], o[1] - (mob ? 6 : 50), { size: mob ? 11 : 13, w: 700, ls: 2, col: rgba(HEX.tx, a) });
        const cap = ['96 events as emitted', 'append-only · ingest time added', mob ? `${st.pass.length} pass · ` + Object.entries(st.reasons).map(([k, v]) => v + ' ' + ({ duplicate: 'dup', 'null user_id': 'null', 'qty ≤ 0': 'qty', 'bad event_type': 'enum' })[k]).join(' · ') : `${st.pass.length} rows survive the rules`, 'revenue by category'][j]; text(c, cap, o[0] + (mob ? 74 : 0), o[1] - (mob ? 6 : 33), { size: mob ? 10.5 : 11.5, col: rgba(HEX.mut, a) }); if (!mob) { /* second line */ }
      }
      rows.forEach((x, i) => { const stg = Math.min(3, Math.round(f)); for (let j = 0; j < Math.min(stg, 3); j++) { if (j === 2 && stg >= 3) { /* silver persists */ } const g = P(j, i); c.fillStyle = rgba(j === 2 && why[i] ? (why[i] === 'duplicate' ? HEX.violet : HEX.red) : HEX.amber, 0.16); c.fillRect(g[0], g[1], cell - 2, cell - 2); } });
      rows.forEach((x, i) => {
        const l = Math.min(3, fl), u = ease(clamp(fr * 1.1 - 0.1 * (i / n))), fin = f >= 4, a = P(Math.min(3, fin ? 3 : l), i), b = P(Math.min(3, fin ? 3 : l + 1), i);
        const base = f >= 3 ? P(3, i) : null; const pos = fin ? P(3, i) : [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
        const bad = why[i], stage = fin ? 3 : l + (u > 0.5 ? 1 : 0);
        let col = HEX.mut, al = 0.8; if (stage >= 1) col = HEX.amber; if (stage >= 2 && bad) { col = reasonCol(bad); } if (stage >= 3 && !bad && x.type !== 'purchase') al = 0.25; if (stage >= 3 && !bad && x.type === 'purchase') col = HEX.ac2;
        c.fillStyle = rgba(col, al); c.fillRect(pos[0], pos[1], cell - 2, cell - 2);
      });
      // silver: the reasons, as they happen
      if (s > 1.6 && !mob) { const o = orig(2), a = clamp((s - 1.6) * 1.5); text(c, 'rejected: ' + Object.entries(st.reasons).map(([k, v]) => v + ' ' + k).join(' · '), o[0], o[1] - 14, { size: 11, col: rgba(HEX.red, a) }); const ry = mob ? o[1] + gr * cell + 4 : o[1] + (gr + 1.4) * cell + 3 * cell; const lines = []; lines.forEach(([k, v], q) => text(c, `${v} × ${k}`, mob ? o[0] + (q % 2) * A.w * 0.5 : o[0], mob ? ry + Math.floor(q / 2) * 13 : ry + q * 17, { size: mob ? 10 : 12, col: rgba(reasonCol(k), a) })); }
      // gold labels + totals
      if (s > 2.4) { const a = clamp((s - 2.4) * 1.6); st.gold.forEach(([k, v]) => { const b = goldBase(k); if (mob) text(c, `${k} ${v}`, A.x, b[1] + 9, { size: 10.5, col: rgba(HEX.tx, a), w: 600 }); else { text(c, k, b[0], b[1] + 20, { size: 12, col: rgba(HEX.tx, a), w: 600 }); text(c, String(v), b[0], b[1] + 36, { size: 12, col: rgba(HEX.mut, a) }); } }); }
      // BI / SQL: the query path
      if (s > 3.2) {
        const a = clamp((s - 3.2) * 1.6), qx = mob ? A.x : cx(4) - A.w * 0.02, qy = mob ? A.y + 4 * bandH + 44 : A.y + 26;
        text(c, 'BI / SQL', qx, qy - (mob ? 4 : 10), { size: mob ? 11 : 13, w: 700, ls: 2, col: rgba(HEX.tx, a) });
        const q = mob ? ['SELECT category,', 'SUM(qty*price)', 'FROM gold.sales', 'GROUP BY category', 'ORDER BY 2 DESC;'] : ['SELECT category,', '  SUM(qty*price) AS revenue', 'FROM gold.sales', 'GROUP BY category', 'ORDER BY revenue DESC;'];
        q.forEach((ln, k) => text(c, ln, qx, qy + 16 + k * (mob ? 14 : 20), { size: mob ? 10 : 12.5, col: rgba(HEX.ac2, a) }));
        st.gold.forEach(([k, v], i) => { const y = mob ? qy + 16 + i * 14 : qy + 128 + i * 26, rx0 = mob ? qx + A.w * 0.5 : qx; text(c, k, rx0, y, { size: mob ? 11 : 14, col: rgba(HEX.tx, a) }); text(c, String(v), rx0 + (mob ? 110 : A.w * 0.17), y, { size: mob ? 11 : 14, w: 700, align: 'right', col: rgba(i ? HEX.mut : HEX.ac2, a) }); });
      }
      kit.tag(c, L, 'SEEDED SYNTHETIC ROWS · THE SAME DEDUPE / NULL / QUANTITY / ENUM RULES AS THE REPO’S SILVER LAYER', 'SEEDED SYNTHETIC ROWS · THE REPO’S SILVER RULES'); kit.cam(st, L);
    },
  };
  window.RMW.register('flag-lake', scenes['flag-lake']);
})();
