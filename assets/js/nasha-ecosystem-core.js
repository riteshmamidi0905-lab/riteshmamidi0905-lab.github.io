/* Offline browser models. Illustrative only; never an authorization service. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NashaEcosystem = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const ENGINEERING = 'https://github.com/riteshmamidi0905-lab/INDO-MEX-BREWERY/blob/2fc100070025cfee8d40216c25326ad3a6040cb0/';
  const SCENARIOS = Object.freeze({
    courtyard: { title: 'Courtyard service', stock: 10, demand: 4, price: 12, cost: 8, batch: 20, feedback: ['great service', 'good food', 'slow service'] },
    seasonal: { title: 'Seasonal concept', stock: 1, demand: 2, price: 9, cost: 4, batch: 20, feedback: ['good food', 'wheat beer concept', 'slow service'] },
    shortage: { title: 'Inventory pressure', stock: 2, demand: 10, price: 12, cost: 8, batch: 20, feedback: ['slow service', 'poor availability', 'great service'] }
  });
  function number(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000000) throw new TypeError('Use a finite nonnegative scenario value.');
    return value;
  }
  function twin(id, overrides = {}) {
    if (!Object.hasOwn(SCENARIOS, id)) throw new TypeError('Unknown scenario.');
    const x = { ...SCENARIOS[id], ...overrides };
    for (const k of ['stock', 'demand', 'price', 'cost', 'batch']) number(x[k]);
    const shortfall = Math.max(0, x.demand - x.stock);
    const units = x.demand;
    const labels = x.feedback.map(s => /\b(good|great|love|excellent)\b/i.test(s) ? 'positive' : /\b(bad|slow|poor|dislike)\b/i.test(s) ? 'negative' : 'neutral');
    return { ...x, shortfall, remaining: Math.max(0, x.stock - x.demand), revenue: Math.round(units * x.price * 100) / 100,
      costTotal: Math.round(units * x.cost * 100) / 100, margin: Math.round(units * (x.price - x.cost) * 100) / 100,
      labels, reviewRequired: true, externalActions: 0, status: 'ILLUSTRATIVE • SYNTHETIC DATA' };
  }
  const REQUESTS = Object.freeze({
    read: { tool: 'read_inventory', amount: 0, scope: 'synthetic-inventory' },
    draft: { tool: 'release_draft', amount: 22, scope: 'synthetic-proposal-a' },
    blocked: { tool: 'publish_campaign', amount: 0, scope: 'external-publication' }
  });
  function key(r) { return JSON.stringify([r.tool, r.amount, r.scope]); }
  function evaluate(r) {
    if (!r || typeof r.tool !== 'string' || typeof r.scope !== 'string' || typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount < 0) return 'DENY';
    if (key(r) === key(REQUESTS.read)) return 'ALLOW';
    if (key(r) === key(REQUESTS.draft)) return 'APPROVE';
    return 'DENY';
  }
  function createGateway() {
    let sequence = 0, request = null, pending = null, grant = null, forwarded = false;
    const audit = [];
    const record = (kind, detail) => audit.push(Object.freeze({ sequence: ++sequence, correlation: 'illustration-001', kind, detail }));
    function snapshot() { return { request: request && { ...request }, pending: !!pending, approved: !!grant, forwarded, audit: audit.map(x => ({ ...x })) }; }
    return {
      submit(r) {
        request = r && { tool: r.tool, amount: r.amount, scope: r.scope }; pending = null; grant = null; forwarded = false;
        record('tool_request', request ? key(request) : 'invalid');
        const decision = evaluate(request); record('policy_decision', decision);
        if (decision === 'ALLOW') { forwarded = true; record('simulated_forward', 'read only'); }
        else if (decision === 'APPROVE') { pending = key(request); record('approval_pending', 'No forwarding before review'); }
        else record('blocked', 'No forwarding');
        return decision;
      },
      approve() {
        if (!pending) return false;
        grant = pending; pending = null; record('human_approval', 'Synthetic reviewer; exact request only'); return true;
      },
      execute(r) {
        const proposed = r || request;
        if (!grant || !proposed || grant !== key(proposed) || evaluate(proposed) !== 'APPROVE') {
          record('execution_denied', 'Missing, changed or consumed illustrative grant'); return false;
        }
        grant = null; forwarded = true; record('simulated_forward', 'Single use grant consumed; no external action'); return true;
      },
      snapshot
    };
  }
  return Object.freeze({ ENGINEERING, SCENARIOS, REQUESTS, twin, evaluate, createGateway });
});
