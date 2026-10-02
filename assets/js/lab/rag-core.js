/* rag-core.js — the offline RAG path of genai-doc-assistant, ported to the browser.
   Mirrors backend/app/rag/{chunking,embeddings,retriever}.py and backend/app/llm/extractive.py:
   sentence-aware chunks (target 480 chars, 1-sentence overlap) → signed feature-hashing embedder
   (words + char trigrams, dim 1024) → cosine search over 3×k candidates → 0.7·vector + 0.3·keyword
   re-rank → extractive, citation-bearing, abstaining reader.
   Differences from the Python original: the token hash is FNV-1a instead of MD5 (so bucket
   assignments differ), and the corpus is the fixed 4-document Acme Cloud sample. It is NOT a
   generative model and makes no network calls. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./rag-corpus.js') : root.RMLab && root.RMLab.ragCorpus);
  if (isNode) module.exports = api;
  else (root.RMLab = root.RMLab || {}).ragCore = api;
})(typeof self !== 'undefined' ? self : this, function (corpusFromGlobal) {
  'use strict';
  const DIM = 1024;
  const STOP = new Set('the a an and or of to in is are was were be been being for with on at by this that it as from what which who whom how why when where do does did can could would should will'.split(' '));
  const words = (t) => String(t).toLowerCase().match(/[a-z0-9]+/g) || [];
  const contentWords = (t) => new Set(words(t).filter((w) => !STOP.has(w)));
  const splitSentences = (t) => String(t).trim().split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

  function chunkText(text, docId, target = 480, overlap = 1) {
    const sents = splitSentences(text), chunks = [];
    let cur = [], curLen = 0, ord = 0;
    for (const s of sents) {
      if (cur.length && curLen + s.length > target) {
        chunks.push({ doc_id: docId, chunk_id: docId + '::' + ord, text: cur.join(' '), ordinal: ord++ });
        cur = overlap ? cur.slice(-overlap) : [];
        curLen = cur.reduce((a, x) => a + x.length, 0);
      }
      cur.push(s); curLen += s.length;
    }
    if (cur.length) chunks.push({ doc_id: docId, chunk_id: docId + '::' + ord, text: cur.join(' '), ordinal: ord });
    return chunks;
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function embed(text) {
    const lower = String(text).toLowerCase(), v = new Float32Array(DIM);
    const toks = words(lower);
    for (let i = 0; i < lower.length - 2; i++) toks.push('#' + lower.slice(i, i + 3));
    for (const tk of toks) { const h = fnv1a(tk); v[h % DIM] += (h >>> 31) & 1 ? 1 : -1; }
    let n = 0; for (let i = 0; i < DIM; i++) n += v[i] * v[i];
    n = Math.sqrt(n);
    if (n > 0) for (let i = 0; i < DIM; i++) v[i] /= n;
    return v;
  }
  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

  function buildIndex(docs) {
    const chunks = [];
    Object.keys(docs).forEach((id) => chunkText(docs[id], id).forEach((c) => { c.vec = embed(c.text); chunks.push(c); }));
    return { chunks };
  }
  function keywordOverlap(q, d) {
    const a = new Set(words(q)), b = new Set(words(d));
    let n = 0; a.forEach((w) => { if (b.has(w)) n++; });
    return n / (a.size + 1e-9);
  }
  function retrieve(index, query, k = 4, rerank = true) {
    const qv = embed(query);
    let hits = index.chunks.map((c) => ({ chunk: c, vector: dot(qv, c.vec), keyword: keywordOverlap(query, c.text) }));
    hits.forEach((h) => { h.score = h.vector; });
    hits.sort((a, b) => b.score - a.score);
    hits = hits.slice(0, k * 3);
    if (rerank) { hits.forEach((h) => { h.score = 0.7 * h.vector + 0.3 * h.keyword; }); hits.sort((a, b) => b.score - a.score); }
    return hits.slice(0, k);
  }
  /* ExtractiveLLM.complete — rank context sentences by content-word overlap, abstain when none overlap */
  function answer(query, hits, minOverlap = 1, maxSentences = 3) {
    const q = contentWords(query), pool = [];
    hits.forEach((h, i) => splitSentences(h.chunk.text).forEach((s) => {
      const overlap = [...q].filter((w) => contentWords(s).has(w)).length;
      if (overlap >= minOverlap) pool.push({ overlap, cite: i + 1, sentence: s, chunk_id: h.chunk.chunk_id });
    }));
    pool.sort((a, b) => b.overlap - a.overlap);   // Array.sort is stable: ties keep retrieval order, like Python
    if (!pool.length) return { grounded: false, text: "I don't have enough information in the provided documents to answer that.", chosen: [], citations: [] };
    const chosen = pool.slice(0, maxSentences);
    const citations = []; chosen.forEach((c) => { if (citations.indexOf(c.cite) < 0) citations.push(c.cite); });
    return { grounded: true, text: chosen.map((c) => c.sentence).join(' '), chosen, citations };
  }
  /* run the repository's retrieval eval set: does the expected document appear in the top-k? */
  function evalRetrieval(index, cases, k = 4) {
    const rows = cases.map((c) => {
      const hits = retrieve(index, c.question, k);
      const rank = hits.findIndex((h) => h.chunk.doc_id === c.relevant_doc);
      return { question: c.question, relevant_doc: c.relevant_doc, rank: rank < 0 ? null : rank + 1, top: hits[0] && hits[0].chunk.doc_id };
    });
    const hit = rows.filter((r) => r.rank !== null).length;
    const mrr = rows.reduce((a, r) => a + (r.rank ? 1 / r.rank : 0), 0) / rows.length;
    return { rows, hitAtK: hit / rows.length, mrr, k };
  }
  return { chunkText, embed, buildIndex, retrieve, answer, evalRetrieval, splitSentences, DIM, corpus: corpusFromGlobal };
});
