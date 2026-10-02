/* eval-core.js — deterministic evaluation logic (no DOM, no network, no model calls).
   token_f1, faithfulness, number_match, conciseness, no_refusal are direct ports of
   llm-eval-framework/llmeval/metrics.py. The six "MAREF dimension" scores below are
   PROXY HEURISTICS built from those primitives for this demo. MAREF itself is in
   development: these are not its final metrics, not benchmark results, not an LLM judge. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RMLab = root.RMLab || {}).evalCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STOP = new Set(('a an the and or but if then else of to in on at for with without by from is are was were be been being ' +
    'this that these those it its as into over under i you he she they we me him her them my your our their').split(' '));
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const tokens = (t, drop) => {
    const m = String(t || '').toLowerCase().match(/[a-z0-9']+/g) || [];
    return drop ? m.filter((w) => !STOP.has(w)) : m;
  };
  const bag = (arr) => arr.reduce((m, w) => (m.set(w, (m.get(w) || 0) + 1), m), new Map());
  const NUM = /-?\d+(?:\.\d+)?/g;
  const numbers = (t) => new Set(String(t || '').match(NUM) || []);

  function tokenF1(output, reference) {
    if (!reference) return 0;
    const p = bag(tokens(output, true)), g = bag(tokens(reference, true));
    let overlap = 0;
    p.forEach((c, w) => { overlap += Math.min(c, g.get(w) || 0); });
    const ps = [...p.values()].reduce((a, b) => a + b, 0), gs = [...g.values()].reduce((a, b) => a + b, 0);
    if (!ps || !gs || !overlap) return 0;
    const pr = overlap / ps, rc = overlap / gs;
    return clamp((2 * pr * rc) / (pr + rc));
  }
  function numberMatch(output, reference) {
    const ref = numbers(reference);
    if (!ref.size) return 1;
    const out = numbers(output);
    let hit = 0; ref.forEach((n) => { if (out.has(n)) hit++; });
    return clamp(hit / ref.size);
  }
  function faithfulness(output, context) {
    if (!context) return 1;
    const out = tokens(output, true);
    if (!out.length) return 0;
    const ctx = new Set(tokens(context, true));
    return clamp(out.filter((t) => ctx.has(t)).length / out.length);
  }
  function conciseness(output, reference, target = 1.5) {
    if (!reference) return 1;
    const ratio = tokens(output).length / Math.max(1, tokens(reference).length);
    return ratio <= target ? 1 : clamp(1 - (ratio - target) / (2 * target));
  }
  const REFUSAL = [/\bi (?:can(?:no|')t|am unable to|won'?t) (?:help|assist|do that)/, /\bi'?m sorry,? but i can(?:no|')t/, /\bas an ai (?:language )?model,? i (?:can(?:no|')t|am unable)/];
  const noRefusal = (output) => (REFUSAL.some((r) => r.test(String(output || '').toLowerCase())) ? 0 : 1);

  const sentences = (t) => String(t || '').trim().split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const stripCites = (s) => s.replace(/\[\d+\]/g, '').trim();

  /* ---------- six dimension proxies; each returns {score, parts, notes[]} ---------- */
  function taskAccuracy(sc, out) {
    const f1 = tokenF1(out, sc.reference), nm = numberMatch(out, sc.reference);
    const hasNums = numbers(sc.reference).size > 0;
    return { score: clamp(hasNums ? 0.5 * f1 + 0.5 * nm : f1), parts: { token_f1: f1, number_match: nm },
      notes: [`token F1 vs reference ${f1.toFixed(2)}`, hasNums ? `reference figures matched ${(nm * 100).toFixed(0)}%` : 'reference has no figures'] };
  }
  function groundedness(sc, out) {
    const ctxSents = sentences(sc.context).map((s) => new Set(tokens(s, true)));
    const claims = sentences(stripCites(out)).map((s) => {
      const tk = tokens(s, true);
      let best = 0;
      ctxSents.forEach((cs) => { if (tk.length) best = Math.max(best, tk.filter((t) => cs.has(t)).length / tk.length); });
      return { text: s, support: best, supported: best >= 0.6 };
    });
    const sentSupport = claims.length ? claims.filter((c) => c.supported).length / claims.length : 0;
    const f = faithfulness(stripCites(out), sc.context);
    return { score: clamp(0.5 * f + 0.5 * sentSupport), parts: { faithfulness: f, claims_supported: sentSupport }, claims,
      notes: [`${claims.filter((c) => c.supported).length}/${claims.length} claims supported by a context sentence (≥60% token support)`, `llmeval faithfulness ${f.toFixed(2)}`] };
  }
  function hallucinationResistance(sc, out) {
    const text = stripCites(out);
    const ctxNums = numbers(sc.context), ctxTokens = new Set(tokens(sc.context));
    const outNums = [...numbers(text)];
    const badNums = outNums.filter((n) => !ctxNums.has(n));
    const ents = (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).map((w) => w.toLowerCase()).filter((w, i, a) => a.indexOf(w) === i && !STOP.has(w));
    const promptT = new Set(tokens(sc.prompt));
    const badEnts = ents.filter((w) => !ctxTokens.has(w) && !promptT.has(w) && !['well', 'honestly', 'sorry', 'that'].includes(w));
    // invented content words that are neither in the context nor the question
    const content = tokens(text, true).filter((w) => w.length > 3 && !/\d/.test(w));
    const invented = [...new Set(content.filter((w) => !ctxTokens.has(w) && !promptT.has(w)))];
    const numShare = outNums.length ? badNums.length / outNums.length : 0;
    const invShare = content.length ? Math.min(1, invented.length / Math.max(1, new Set(content).size)) : 0;
    const entShare = ents.length ? badEnts.length / ents.length : 0;
    const risk = 0.5 * numShare + 0.3 * invShare + 0.2 * entShare;
    return { score: clamp(1 - risk), parts: { unsupported_figures: numShare, invented_terms: invShare, unsupported_entities: entShare }, flagged: { numbers: badNums, terms: invented.slice(0, 8), entities: badEnts },
      notes: [badNums.length ? `figures not found in evidence: ${badNums.join(', ')}` : 'every figure appears in the evidence', invented.length ? `${invented.length} content word(s) absent from evidence and question` : 'no invented content words detected'] };
  }
  function instructionAdherence(sc, out) {
    const c = sc.constraints || {}, checks = [];
    const words = String(out || '').trim().split(/\s+/).filter(Boolean).length;
    if (c.maxWords) checks.push({ name: `≤ ${c.maxWords} words`, pass: words <= c.maxWords, detail: `${words} words` });
    (c.mustInclude || []).forEach((k) => checks.push({ name: `mentions “${k}”`, pass: String(out).toLowerCase().includes(String(k).toLowerCase()) }));
    if (c.mustCite) checks.push({ name: 'cites evidence as [n]', pass: /\[\d+\]/.test(out) });
    if (c.noRefusal !== false) checks.push({ name: 'does not refuse a benign request', pass: noRefusal(out) === 1 });
    const pass = checks.filter((k) => k.pass).length;
    return { score: checks.length ? pass / checks.length : 1, parts: {}, checks, notes: [`${pass}/${checks.length} explicit constraints satisfied`] };
  }
  function consistency(sc, runs) {
    if (!runs || runs.length < 2) return { score: null, parts: {}, notes: ['needs at least two runs of the same task'] };
    let sum = 0, n = 0;
    for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
      sum += tokenF1(runs[i], runs[j]); n++;
    }
    const f1 = sum / n;
    const sets = runs.map((r) => [...numbers(stripCites(r))].sort().join('|'));
    const numAgree = sets.every((s) => s === sets[0]) ? 1 : 0;
    return { score: clamp(0.6 * f1 + 0.4 * numAgree), parts: { pairwise_token_f1: f1, figures_agree: numAgree },
      notes: [`mean pairwise token F1 across ${runs.length} runs ${f1.toFixed(2)}`, numAgree ? 'the same figures appear in every run' : 'figures differ between runs'] };
  }
  function taskCompletion(sc, trace) {
    const req = sc.requiredSteps || [];
    if (!req.length) return { score: 1, parts: {}, steps: [], notes: ['no required steps defined'] };
    let idx = -1;
    const steps = req.map((s) => { const at = trace.indexOf(s, idx + 1); if (at > idx) idx = at; return { step: s, done: at >= 0 && at === idx }; });
    const done = steps.filter((s) => s.done).length;
    return { score: done / req.length, parts: {}, steps, notes: [`${done}/${req.length} required steps completed in order`] };
  }

  const DIMENSIONS = [
    ['task_accuracy', 'Task Accuracy'], ['groundedness', 'Groundedness'], ['hallucination_resistance', 'Hallucination Resistance'],
    ['instruction_adherence', 'Instruction Adherence'], ['consistency', 'Consistency'], ['task_completion', 'Task Completion'],
  ];
  /* evaluate one candidate. `runs` = recorded repeat outputs of the same task (for consistency). */
  function evaluate(sc, output, trace, runs) {
    return {
      task_accuracy: taskAccuracy(sc, output), groundedness: groundedness(sc, output),
      hallucination_resistance: hallucinationResistance(sc, output), instruction_adherence: instructionAdherence(sc, output),
      consistency: consistency(sc, runs), task_completion: taskCompletion(sc, trace || []),
    };
  }
  /* hard gate: every measurable dimension must clear its own threshold — no averaging away a failure */
  function gate(result, thresholds) {
    const t = thresholds || {};
    const rows = DIMENSIONS.map(([k, label]) => {
      const s = result[k].score, th = t[k] == null ? 0.6 : t[k];
      return { key: k, label, score: s, threshold: th, pass: s == null ? null : s >= th };
    });
    const measured = rows.filter((r) => r.pass !== null);
    const failing = measured.filter((r) => !r.pass);
    const mean = measured.length ? measured.reduce((a, r) => a + r.score, 0) / measured.length : 0;
    return { rows, pass: failing.length === 0, failing: failing.map((r) => r.label), mean, weakest: measured.slice().sort((a, b) => a.score - b.score)[0] };
  }

  /* ---------- sample executions: AUTHORED FIXTURES, recorded outputs, not live model calls ---------- */
  const SCENARIOS = [
    {
      id: 'hours', title: 'Branch hours (RAG question)', prompt: 'What time does the branch open on Saturdays?',
      context: 'The downtown branch opens at 9am on weekdays and 10am on Saturdays. It is closed on Sundays.',
      reference: 'It opens at 10am on Saturdays.', constraints: { maxWords: 30, mustInclude: ['10am'], mustCite: true },
      requiredSteps: ['retrieve', 'answer', 'cite'],
      behaviours: [
        { id: 'grounded', label: 'Grounded answer', trace: ['retrieve', 'answer', 'cite'], runs: ['The downtown branch opens at 10am on Saturdays. [1]', 'It opens at 10am on Saturdays. [1]', 'On Saturdays the downtown branch opens at 10am. [1]'] },
        { id: 'hallucinated', label: 'Fluent but invented', trace: ['answer'], runs: ['The branch opens at 6am on Saturdays and stays open 24 hours.', 'Saturday hours begin at 8am and there is a free parking lot.', 'It opens at 6am on Saturdays.'] },
        { id: 'verbose', label: 'Correct but off-format', trace: ['retrieve', 'answer'], runs: ['Well, that is a great question and honestly it depends on a lot of things, but I believe the downtown branch opens at 10am on Saturdays, although you may want to double check the branch page, call ahead, or visit in person to be completely sure about the exact timing.', 'It opens at 10am.', 'The branch opens at 10am on Saturdays, I think.'] },
      ],
    },
    {
      id: 'price', title: 'Shipping price (figures matter)', prompt: 'How much is express shipping?',
      context: 'Express shipping costs 15 dollars and delivers in 1 to 2 business days.',
      reference: 'It costs 15 dollars, 1 to 2 business days.', constraints: { maxWords: 25, mustInclude: ['15'], mustCite: true },
      requiredSteps: ['retrieve', 'answer', 'cite'],
      behaviours: [
        { id: 'grounded', label: 'Grounded answer', trace: ['retrieve', 'answer', 'cite'], runs: ['Express shipping costs 15 dollars and arrives in 1 to 2 business days. [1]', 'It costs 15 dollars with delivery in 1 to 2 business days. [1]', 'Express shipping is 15 dollars, 1 to 2 business days. [1]'] },
        { id: 'wrongnum', label: 'Plausible wrong figure', trace: ['retrieve', 'answer', 'cite'], runs: ['Express shipping costs 50 dollars. [1]', 'Express shipping costs 15 dollars. [1]', 'Express shipping costs 25 dollars and takes 3 days. [1]'] },
        { id: 'refusal', label: 'Spurious refusal', trace: ['answer'], runs: ["I'm sorry, but I can't help with that.", "I'm sorry, but I can't help with that request.", "As an AI language model, I cannot help with shipping."] },
      ],
    },
    {
      id: 'agent', title: 'Agent task: convert, then double', prompt: 'Convert 5 km to mi then multiply by 2',
      context: 'unit_convert: 5 km to mi returned 3.107 mi. calculator: 3.107 * 2 returned 6.214.',
      reference: '6.214 mi', constraints: { maxWords: 20, mustInclude: ['6.214'], noRefusal: true },
      requiredSteps: ['unit_convert', 'calculator', 'answer'],
      behaviours: [
        { id: 'complete', label: 'Both tools, correct order', trace: ['unit_convert', 'calculator', 'answer'], runs: ['6.214 mi', 'The result is 6.214 mi.', '6.214 mi'] },
        { id: 'skipped', label: 'Skipped the second tool', trace: ['unit_convert', 'answer'], runs: ['3.107 mi', '3.107 mi', 'About 3.107 mi.'] },
        { id: 'guess', label: 'Answered without tools', trace: ['answer'], runs: ['About 6 miles.', 'It is roughly 6.5 mi.', '6.2 miles, I think.'] },
      ],
    },
  ];

  return { tokens, tokenF1, numberMatch, faithfulness, conciseness, noRefusal, sentences, DIMENSIONS, evaluate, gate, SCENARIOS };
});
