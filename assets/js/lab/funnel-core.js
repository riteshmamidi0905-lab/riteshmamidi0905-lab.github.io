/* funnel-core.js — product-funnel and retention arithmetic for the Funnel Explorer.
   Every number is computed from the visitor's own input assumptions; no dataset is bundled and the
   defaults are placeholders, not measurements of any real product. Retention follows a simple
   power-law decay r(d) = r1 · d^(−α) fitted to the user-chosen D1 and D30 values — a modelling
   assumption for exploration, not an empirical claim. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RMLab = root.RMLab || {}).funnelCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STAGES = ['Acquisition', 'Activation', 'Retention', 'Revenue'];
  const DEFAULTS = { visitors: 100000, signup: 0.15, activation: 0.5, d1: 0.6, d30: 0.35, paid: 0.12, arpu: 24, churn: 0.05 };

  function retentionCurve(d1, d30, days) {
    const alpha = d1 > 0 && d30 > 0 ? Math.log(d1 / d30) / Math.log(30) : 1;
    const out = [];
    for (let d = 1; d <= days; d++) out.push(Math.min(1, d1 * Math.pow(d, -alpha)));
    return { alpha, curve: out };
  }
  function run(a) {
    const p = Object.assign({}, DEFAULTS, a);
    const visitors = p.visitors, signups = visitors * p.signup, activated = signups * p.activation;
    const retained = activated * p.d30, payers = retained * p.paid;
    const counts = [visitors, activated, retained, payers];
    const stepRates = [p.signup * p.activation, p.d30, p.paid];
    const losses = stepRates.map((r, i) => counts[i] * (1 - r));
    const leakIdx = losses.indexOf(Math.max.apply(null, losses));
    const revenue = payers * p.arpu;
    return { params: p, counts, stepRates, losses, leak: STAGES[leakIdx] + ' → ' + STAGES[leakIdx + 1], leakIdx, revenue,
      overall: payers / visitors, ret: retentionCurve(p.d1, p.d30, 60),
      ltv: p.arpu / Math.max(0.005, p.churn) };
  }
  /* what-if: lift one stage by `pp` percentage points and report the downstream effect */
  function whatIf(a, key, pp) {
    const base = run(a), changed = run(Object.assign({}, a, { [key]: Math.min(1, (Object.assign({}, DEFAULTS, a)[key]) + pp) }));
    return { baseRevenue: base.revenue, newRevenue: changed.revenue, deltaPct: base.revenue ? (changed.revenue / base.revenue - 1) : 0, basePayers: base.counts[3], newPayers: changed.counts[3] };
  }
  /* cohort retention heat-map: weekly cohorts × checkpoint days, all following the modelled curve; recent cohorts have not aged enough to show later days */
  const COHORT_DAYS = [0, 1, 3, 7, 14, 21, 28];
  function cohorts(a, weeks) {
    const p = Object.assign({}, DEFAULTS, a), { curve } = retentionCurve(p.d1, p.d30, 30);
    const rows = [];
    for (let w = 0; w < weeks; w++) {
      const age = (weeks - w) * 7;
      rows.push(COHORT_DAYS.map((d) => d === 0 ? 1 : d > age ? null : curve[d - 1]));
    }
    return { days: COHORT_DAYS, rows };
  }
  return { STAGES, DEFAULTS, run, whatIf, retentionCurve, cohorts };
});
