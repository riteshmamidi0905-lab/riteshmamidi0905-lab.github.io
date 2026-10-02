/* stats-core.js — A/B statistics ported from experimentation-toolkit/expkit/stats.py + experiment.py.
   proportions_ztest (pooled z, Wald CI on the lift), sample_size_proportion, power_proportion,
   mde_proportion and the SHIP / KILL / INCONCLUSIVE decision rule. All computed in the browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RMLab = root.RMLab || {}).statsCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* erfc via Numerical Recipes Chebyshev fit (|error| < 1.2e-7) */
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const normCdf = (x) => 0.5 * erfc(-x / Math.SQRT2);
  const normPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  /* inverse normal CDF: Acklam's rational approximation + one Halley refinement */
  function normPpf(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    let x;
    if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    const e = normCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  }

  function proportionsZTest(xc, nc, xt, nt, alpha = 0.05) {
    if (nc <= 0 || nt <= 0) throw new Error('group sizes must be positive');
    const pc = xc / nc, pt = xt / nt, pool = (xc + xt) / (nc + nt);
    const sePool = Math.sqrt(pool * (1 - pool) * (1 / nc + 1 / nt));
    const z = sePool === 0 ? 0 : (pt - pc) / sePool;
    const p = 2 * (1 - normCdf(Math.abs(z)));
    const seDiff = Math.sqrt(pc * (1 - pc) / nc + pt * (1 - pt) / nt), zc = normPpf(1 - alpha / 2), diff = pt - pc;
    return { control: pc, treatment: pt, absEffect: diff, relEffect: pc ? diff / pc : NaN, ciLow: diff - zc * seDiff, ciHigh: diff + zc * seDiff, z, pValue: p, alpha, significant: p < alpha };
  }
  function sampleSizeProportion(baseline, mdeAbs, alpha = 0.05, power = 0.8) {
    if (!(baseline > 0 && baseline < 1)) throw new Error('baseline must be in (0, 1)');
    const p1 = baseline, p2 = baseline + mdeAbs, za = normPpf(1 - alpha / 2), zb = normPpf(power);
    const num = Math.pow(za * Math.sqrt(2 * baseline * (1 - baseline)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    return Math.ceil(num / (mdeAbs * mdeAbs));
  }
  function powerProportion(baseline, mdeAbs, nPerGroup, alpha = 0.05) {
    const p1 = baseline, p2 = baseline + mdeAbs, se = Math.sqrt(p1 * (1 - p1) / nPerGroup + p2 * (1 - p2) / nPerGroup), za = normPpf(1 - alpha / 2);
    return 1 - normCdf(za - Math.abs(mdeAbs) / se) + normCdf(-za - Math.abs(mdeAbs) / se);
  }
  function mdeProportion(baseline, nPerGroup, alpha = 0.05, power = 0.8) {
    return (normPpf(1 - alpha / 2) + normPpf(power)) * Math.sqrt(2 * baseline * (1 - baseline) / nPerGroup);
  }
  /* Experiment.decide — primary metric (higher is better) plus optional guardrails.
     A guardrail "regresses" when it moves the wrong way significantly (expkit's regressed()). */
  function decide(primary, guardrails, alpha = 0.05) {
    const flags = (guardrails || []).filter((g) => g.result.significant && (g.higherIsBetter ? g.result.absEffect < 0 : g.result.absEffect > 0))
      .map((g) => `${g.name} regressed (${(g.result.relEffect * 100).toFixed(1)}%, p=${g.result.pValue.toFixed(3)})`);
    const sig = primary.pValue < alpha, good = primary.absEffect > 0, rel = (primary.relEffect * 100).toFixed(1), pv = primary.pValue.toFixed(4);
    if (sig && good && !flags.length) return { verdict: 'SHIP', reason: `Primary metric moved +${rel}% (p=${pv}); no guardrail regressions.`, flags };
    if (sig && good) return { verdict: 'INCONCLUSIVE', reason: `Primary metric improved ${rel}% but ${flags.length} guardrail(s) regressed — needs review before shipping.`, flags };
    if (sig) return { verdict: 'KILL', reason: `Primary metric moved the wrong way (${rel}%, p=${pv}).`, flags };
    return { verdict: 'INCONCLUSIVE', reason: `No significant effect on the primary metric (${rel}%, p=${pv}); keep running or revisit the hypothesis.`, flags };
  }
  /* seeded binomial draw (exact Bernoulli sum for n ≤ 4000, normal approximation above) */
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gaussian(rng) { return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng()); }
  function binomial(rng, n, p) {
    if (n <= 4000) { let k = 0; for (let i = 0; i < n; i++) if (rng() < p) k++; return k; }
    return Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * gaussian(rng))));
  }
  /* simulate users arriving in batches and record the p-value after each peek —
     illustrates why repeatedly checking a fixed-horizon test inflates false positives */
  function simulatePeeking(trueC, trueT, perArmTotal, peeks, seed) {
    const rng = mulberry32(seed || 1), out = [];
    let xc = 0, xt = 0, n = 0;
    const batch = Math.max(1, Math.floor(perArmTotal / peeks));
    for (let i = 0; i < peeks; i++) {
      xc += binomial(rng, batch, trueC); xt += binomial(rng, batch, trueT); n += batch;
      out.push({ n, p: proportionsZTest(xc, n, xt, n).pValue, lift: (xt / n) - (xc / n) });
    }
    return out;
  }
  return { normCdf, normPpf, proportionsZTest, sampleSizeProportion, powerProportion, mdeProportion, decide, simulatePeeking, mulberry32 };
});
