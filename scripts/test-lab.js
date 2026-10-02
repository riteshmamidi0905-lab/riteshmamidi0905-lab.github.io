/* Unit tests for the interactive-lab cores (assets/js/lab/*). Pure Node, no browser. */
'use strict';
const assert = require('node:assert/strict');
const L = (n) => require('../assets/js/lab/' + n + '.js');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}±${tol}, got ${a}`);

/* statistics — values cross-checked against Python statistics.NormalDist and the hand formulas in expkit/stats.py */
const S = L('stats-core');
near(S.normPpf(0.975), 1.959964, 1e-5, 'z(0.975)'); near(S.normPpf(0.8), 0.841621, 1e-5, 'z(0.8)'); near(S.normCdf(1.96), 0.975002, 1e-5, 'cdf');
const z = S.proportionsZTest(100, 1000, 130, 1000);
near(z.z, 2.10274, 1e-4, 'z stat'); near(z.pValue, 0.035488, 1e-4, 'p value'); assert.ok(z.significant);
assert.equal(S.sampleSizeProportion(0.1, 0.02), 3623);
/* expkit's power uses the unpooled SE while sample_size uses the pooled-null form, so they agree only approximately */
near(S.powerProportion(0.1, 0.02, 3623), 0.777, 0.002, 'power at planned n (unpooled SE, as in expkit)');
assert.equal(S.decide(z, []).verdict, 'SHIP');
assert.equal(S.decide(S.proportionsZTest(130, 1000, 100, 1000), []).verdict, 'KILL');
assert.equal(S.decide(S.proportionsZTest(100, 1000, 104, 1000), []).verdict, 'INCONCLUSIVE');
const guard = { name: 'support tickets', higherIsBetter: false, result: S.proportionsZTest(50, 1000, 90, 1000) };
assert.equal(S.decide(z, [guard]).verdict, 'INCONCLUSIVE');
assert.deepEqual(S.simulatePeeking(0.1, 0.1, 2000, 10, 3), S.simulatePeeking(0.1, 0.1, 2000, 10, 3), 'seeded simulation is reproducible');

/* agent — traces from the ai-agent-toolkit README */
const A = L('agent-core');
const r = A.run('Convert 5 km to mi then multiply by 2');
assert.deepEqual(r.history.map((h) => h.tool), ['unit_convert', 'calculator']);
assert.equal(r.history[0].observation, '3.107 mi'); assert.equal(r.answer, '6.214'); assert.ok(A.evaluate('', r).pass);
assert.equal(A.run('What is the capital of France?').answer, 'Paris');
assert.equal(A.calculator('2*(3+4)'), '14'); assert.equal(A.calculator('-2**2'), '-4');
assert.throws(() => A.calculator("__import__('os').system('ls')"), 'no eval');
assert.equal(A.run('Tell me a joke').answer, 'unknown'); assert.equal(A.fmtG4(0.00001234), '1.234e-05'); assert.equal(A.fmtG4(123456), '1.235e+05');

/* streaming — same inputs, same outputs; invariants hold */
const T = L('stream-core');
assert.equal(T.flagFraud({ amount: 2500, country: 'US' }), 'high_amount'); assert.equal(T.flagFraud({ amount: 20, country: 'ZZ' }), 'high_risk_country');
assert.equal(T.flagFraud({ amount: 0, country: 'US' }), 'non_positive_amount'); assert.equal(T.flagFraud({ amount: 20, country: 'US' }), null);
const run = () => { const p = T.createPipeline({ seed: 11, rate: 80, capacity: 50, lateShare: 0.1 }); for (let i = 0; i < 3000; i++) p.step(0.1); return p.snapshot(); };
const a = run(), b = run();
assert.deepEqual([a.produced, a.flagged, a.droppedLate], [b.produced, b.flagged, b.droppedLate], 'deterministic');
assert.equal(a.produced, a.processed + a.lag); assert.ok(a.lag > 0, 'capacity < rate builds lag'); assert.ok(a.droppedLate > 0, 'watermark drops very late events');

/* RAG — runs the repository's own retrieval eval set */
const R = L('rag-core'); const idx = R.buildIndex(R.corpus.docs);
const ev = R.evalRetrieval(idx, R.corpus.cases, 4); assert.ok(ev.hitAtK >= 0.85, 'hit@4 ' + ev.hitAtK);
assert.match(R.answer('How much does the Pro tier cost?', R.retrieve(idx, 'How much does the Pro tier cost?')).text, /twenty dollars/);
assert.equal(R.answer('zzzz qqqq', R.retrieve(idx, 'zzzz qqqq')).grounded, false);

/* evaluation — grounded sample beats invented sample on the dimensions that should differ */
const E = L('eval-core');
for (const sc of E.SCENARIOS) {
  const [good, ...bad] = sc.behaviours; const g = E.gate(E.evaluate(sc, good.runs[0], good.trace, good.runs));
  assert.ok(g.pass, sc.id + ' grounded sample should clear every gate');
  bad.forEach((x) => assert.ok(!E.gate(E.evaluate(sc, x.runs[0], x.trace, x.runs)).pass, sc.id + '/' + x.id + ' should fail a gate'));
}
const sc0 = E.SCENARIOS[0]; assert.equal(E.evaluate(sc0, 'x', [], ['x']).consistency.score, null, 'consistency needs ≥2 runs');
near(E.tokenF1('It opens at 10am on Saturdays.', 'It opens at 10am on Saturdays.'), 1, 1e-9);

/* funnel */
const F = L('funnel-core'); const f = F.run({});
near(f.counts[1], 100000 * F.DEFAULTS.signup * F.DEFAULTS.activation, 1e-6); assert.ok(F.whatIf({}, 'activation', 0.05).newRevenue > f.revenue);
console.log('PASS: lab cores (stats, agent, streaming, RAG, evaluation, funnel)');
