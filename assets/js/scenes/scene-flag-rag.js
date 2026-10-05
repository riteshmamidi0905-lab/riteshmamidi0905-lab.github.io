/* scene-flag-rag.js — GenAI Document Assistant. Personality: retrieval space, chunks, ranking, provenance and citations.
   The real rag-core.js retrieval runs over the fixed Acme sample corpus. Every chunk is a point whose DISTANCE from the query is its real
   hybrid score (0.7 × vector + 0.3 × keyword) and whose COLOUR is the document it came from; the answer is the extractive reader's
   own output, with each [n] tied back to its chunk. No language model is involved. */
(() => {
  'use strict';
  const { H, scenes, kit } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line, curve } = H;
  const DOC = [HEX.blue, HEX.amber, HEX.violet, HEX.ac2, HEX.red];

  scenes['flag-rag'] = {
    tint: HEX.ac, still: 4,
    init(w) {
      const R = window.RMLab.ragCore, cp = R.corpus, st = w.state, q = cp.cases[1].question, idx = R.buildIndex(cp.docs), hits = R.retrieve(idx, q, idx.chunks.length, true);
      st.tt = 0; st.q = q; st.hits = hits; st.top = hits.slice(0, 4); st.ans = R.answer(q, st.top); st.vec = Array.from(R.embed(q).slice(0, 64));
      const docs = []; idx.chunks.forEach((c) => { if (docs.indexOf(c.doc_id) < 0) docs.push(c.doc_id); }); st.docs = docs;
      const mx = hits[0].score, mn = hits[hits.length - 1].score; st.norm = (h) => (h.score - mn) / Math.max(1e-6, mx - mn);
      st.ang = {}; docs.forEach((d, di) => { const mem = idx.chunks.filter((c) => c.doc_id === d); mem.forEach((c, k) => { st.ang[c.chunk_id] = -Math.PI / 2 + (di + (k + 0.5) / mem.length) * TAU / docs.length; }); });
    },
    prime(w) { w.state.tt = 99; },
    advance(w, dt) { const st = w.state; if (w.s < 0.5) st.tt += dt; else if (w.s > 1.5) st.tt = 0; },
    draw(c, L, t, s, st) {
      const A = kit.rail(c, L, ['Query', 'Retriever', 'Relevant chunks', 'LLM', 'Cited answer'], s, HEX.ac), mob = L.mobile, hits = st.hits;
      const R = mob ? Math.min(A.w * 0.28, A.h * 0.22) : Math.min(A.h * 0.46, A.w * 0.23), cx = mob ? A.x + A.w / 2 : A.x + A.w * 0.27, cy = mob ? A.y + 18 + R : A.y + A.h * 0.5;
      const mv = ease(clamp(s - 0.45, 0, 1)), pos = (h) => { const a = st.ang[h.chunk.chunk_id], r = lerp(R * 0.97, R * (0.1 + 0.8 * (1 - st.norm(h))), mv); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
      // the space: rings are score levels, sectors are documents
      for (let k = 1; k <= 4; k++) { c.strokeStyle = rgba(HEX.tx, 0.06 + 0.02 * k); c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R * k / 4, 0, TAU); c.stroke(); }
      st.docs.forEach((d, di) => { const a0 = -Math.PI / 2 + di * TAU / st.docs.length; line(c, cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, HEX.tx, 1, 0.1); const am = a0 + TAU / st.docs.length / 2, lp = [cx + Math.cos(am) * (R + 16), cy + Math.sin(am) * (R + 16)]; text(c, (mob ? d.split('_')[1] : d.replace('_', ' ')).toUpperCase(), lp[0], lp[1] + 4, { size: mob ? 8.5 : 11, w: 700, ls: 1.2, align: Math.cos(am) > 0.25 ? 'left' : Math.cos(am) < -0.25 ? 'right' : 'center', col: rgba(DOC[di % 5], 0.9) }); });
      glow(c, cx, cy, R * 0.35, HEX.ac, 0.22); c.fillStyle = HEX.ac2; c.beginPath(); c.arc(cx, cy, 6, 0, TAU); c.fill(); text(c, 'QUERY', cx, cy - 14, { size: 10.5, w: 700, ls: 1.5, align: 'center', col: HEX.ac2 });
      const topSet = new Set(st.top.map((h) => h.chunk.chunk_id)), focus = s >= 1.6;
      hits.forEach((h, i) => {
        const p = pos(h), top = topSet.has(h.chunk.chunk_id), col = DOC[st.docs.indexOf(h.chunk.doc_id) % 5], a = focus && !top ? 0.25 : 1, rad = (mob ? 4 : 6) + (top ? 3 : 0) * mv + 8 * st.norm(h) * mv * (mob ? 0.6 : 1);
        if (s > 0.6 && top) line(c, cx, cy, p[0], p[1], col, 1, 0.35 * clamp((s - 0.6) * 1.2));
        glow(c, p[0], p[1], rad * 2.6, col, 0.2 * a); c.fillStyle = rgba(col, 0.9 * a); c.beginPath(); c.arc(p[0], p[1], rad, 0, TAU); c.fill();
        if (top && s > 0.9) { const ai = st.top.findIndex((q) => q.chunk.chunk_id === h.chunk.chunk_id) + 1; text(c, String(ai), p[0], p[1] + 4, { size: mob ? 9.5 : 12, w: 700, align: 'center', col: '#04110d' }); }
      });
      // right column: the stage's own reading
      const rx = mob ? A.x : A.x + A.w * 0.58, rw = mob ? A.w : A.w * 0.42, ry = mob ? cy + R + 38 : A.y + 6, fs = mob ? 12 : 15;
      const a0 = D(s, 0), a1 = D(s, 1), a2 = D(s, 2), a3 = D(s, 3), a4 = D(s, 4);
      function D(ss, i) { return clamp(1 - Math.abs(ss - i) * 1.6); }
      c.save(); c.globalAlpha = a0; if (a0 > 0.01) { kit.label(c, 'QUESTION', rx, ry); const typed = st.q.slice(0, Math.floor(st.q.length * clamp(st.tt * 1.4))); wrap(c, typed + (st.tt < 1.2 && Math.floor(t * 2) % 2 ? '▍' : ''), rx, ry + (mob ? 28 : 46), rw, mob ? 24 : 38, { size: mob ? 20 : 32, w: 600, sans: true, col: HEX.tx }); if (!mob) { const bw = rw / 64; kit.label(c, 'QUERY EMBEDDING · 64 of 1024 hashed dimensions', rx, ry + 190); line(c, rx, ry + 290, rx + rw, ry + 290, HEX.tx, 1, 0.15); st.vec.forEach((v, i) => { const hh = Math.min(86, Math.abs(v) * 700); c.fillStyle = rgba(v >= 0 ? HEX.ac2 : HEX.blue, 0.85); c.fillRect(rx + i * bw, ry + 290 - (v >= 0 ? hh : 0), bw - 1.5, Math.max(1, hh)); }); } } c.restore();
      c.save(); c.globalAlpha = a1; if (a1 > 0.01) { kit.label(c, 'HYBRID SCORE · 0.7 × vector + 0.3 × keyword', rx, ry); const rowH = mob ? 18 : 36, n = mob ? 6 : hits.length, bw = rw * (mob ? 0.34 : 0.3), prog = clamp(s - 0.8, 0, 1) * 1.4; hits.slice(0, n).forEach((h, i) => { const y = ry + 24 + i * rowH, col = DOC[st.docs.indexOf(h.chunk.doc_id) % 5]; text(c, String(i + 1), rx, y + 12, { size: fs, w: 700, col: i < 4 ? HEX.ac2 : HEX.dim }); text(c, kit.fit(c, h.chunk.chunk_id.replace('::', ' · '), rw * 0.34, '500 ' + (mob ? 10 : 12) + 'px ' + H.FONT), rx + 22, y + 12, { size: mob ? 10 : 12, col }); const bx = rx + rw * (mob ? 0.5 : 0.4); c.fillStyle = rgba(HEX.tx, 0.07); c.fillRect(bx, y + 3, bw, 6); c.fillRect(bx, y + 12, bw, 6); c.fillStyle = HEX.blue; c.fillRect(bx, y + 3, bw * clamp(h.vector * 2.2) * prog, 6); c.fillStyle = HEX.amber; c.fillRect(bx, y + 12, bw * clamp(h.keyword) * prog, 6); text(c, h.score.toFixed(3), rx + rw, y + 14, { size: mob ? 11 : 13, w: 700, align: 'right', col: i < 4 ? HEX.ac2 : HEX.mut }); }); } c.restore();
      c.save(); c.globalAlpha = a2; if (a2 > 0.01) { kit.label(c, 'TOP 4 CHUNKS → CONTEXT', rx, ry); st.top.slice(0, mob ? 2 : 4).forEach((h, i) => { const y = ry + 30 + i * (mob ? 52 : Math.min(100, (A.h - 50) / 4)), col = DOC[st.docs.indexOf(h.chunk.doc_id) % 5]; text(c, `${i + 1}`, rx, y + 4, { size: mob ? 14 : 22, w: 700, col }); text(c, h.chunk.chunk_id.replace('::', ' · '), rx + 26, y, { size: 11, w: 700, col }); kit.wrapN(c, h.chunk.text.replace(/^\[[^\]]*\]\s*/, ''), rx + 26, y + 18, rw - 30, mob ? 14 : 17, { size: mob ? 11 : 13.5, col: i ? HEX.mut : HEX.tx, sans: true }, mob ? 2 : 3); }); } c.restore();
      c.save(); c.globalAlpha = a3; if (a3 > 0.01) { kit.label(c, 'EXTRACTIVE READER · ranks sentences by question-word overlap', rx, ry); st.ans.chosen.slice(0, mob ? 2 : 3).forEach((x, i) => { const y = ry + 34 + i * (mob ? 60 : 98); text(c, `overlap ${x.overlap}  ·  from chunk ${x.cite}`, rx, y, { size: 11, w: 700, col: HEX.ac2 }); kit.wrapN(c, x.sentence, rx, y + 22, rw, mob ? 15 : 20, { size: mob ? 12 : 16, col: HEX.tx, sans: true }, mob ? 2 : 3); }); if (!mob && A.h > 430) text(c, 'if no sentence overlaps the question, it abstains', rx, ry + 330, { size: mob ? 11 : 13, col: HEX.mut }); } c.restore();
      c.save(); c.globalAlpha = a4; if (a4 > 0.01) { kit.label(c, 'CITED ANSWER', rx, ry); let y = ry + 34; st.ans.chosen.slice(0, mob ? 2 : 3).forEach((x) => { const n = kit.wrapN(c, x.sentence + ' ', rx, y, rw - 34, mob ? 16 : 24, { size: mob ? 13 : 18, col: HEX.tx, sans: true, w: 500 }, mob ? 2 : 3); const ly = y + (n - 1) * (mob ? 16 : 24); text(c, `[${x.cite}]`, rx + rw, ly, { size: mob ? 12 : 14, w: 700, align: 'right', col: HEX.ac2 }); const h = st.top[x.cite - 1], p = pos(h); curve(c, p, [p[0] + (rx - p[0]) * 0.5, p[1]], [rx - 30, ly - 6], [rx - 8, ly - 5], DOC[st.docs.indexOf(h.chunk.doc_id) % 5], 1.3, 0.7 * a4, [3, 5], -t * 12); y += n * (mob ? 16 : 24) + (mob ? 14 : 22); }); text(c, 'sources: ' + [...new Set(st.ans.chosen.map((x) => st.top[x.cite - 1].chunk.doc_id))].join(' · '), rx, y + 4, { size: mob ? 10.5 : 12.5, col: HEX.mut }); } c.restore();
      kit.tag(c, L, 'REAL RETRIEVAL + EXTRACTIVE ANSWER OVER A FIXED SAMPLE CORPUS · NO LANGUAGE MODEL', 'FIXED SAMPLE CORPUS · REAL RETRIEVAL · NO LANGUAGE MODEL'); kit.cam(st, L);
    },
  };
  window.RMW.register('flag-rag', scenes['flag-rag']);
})();
