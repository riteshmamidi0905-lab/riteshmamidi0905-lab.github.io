'use strict';
(() => {
  const C = window.NashaEcosystem, $ = s => document.querySelector(s);
  const text = (parent, tag, value) => { const el = document.createElement(tag); el.textContent = value; parent.append(el); return el; };
  let scenario = 'courtyard', zone = 'brew', model = C.twin(scenario);
  const money = x => '$' + x.toFixed(2);
  function renderTwin() {
    const zones = {
      brew: { role: 'ZYBREW / BREWMASTER', title: 'An unbrewed idea.', description: 'A synthetic batch plan, presented beside the tank hall concept.', metrics: [['Concept batch', model.batch + ' L'], ['Production', 'Not brewed']], limit: 'No fermentation, recipe or safety validation. The courtyard visual is conceptual.' },
      stock: { role: 'VECTRA / SENTINEL', title: 'Make the shortfall visible.', description: 'A simple stock-to-demand comparison signals whether a replenishment draft needs review.', metrics: [['On hand', model.stock + ' units'], ['Demand', model.demand + ' units'], ['Shortfall', model.shortfall + ' units'], ['After demand', model.remaining + ' units']], limit: 'Single-item fixture; no live stock movements, forecasts or purchase orders.' },
      court: { role: 'ECHON / ECHO', title: 'Listen, then inspect.', description: 'Three invented feedback snippets classified with simple keyword rules.', metrics: model.feedback.map((s, i) => [s, model.labels[i]]), limit: 'Small synthetic fixture. Positive keywords take precedence. No model accuracy or actual customer sentiment claim.' },
      finance: { role: 'QUANTIX / PULSE', title: 'Expose the assumptions.', description: 'A what-if contribution scenario assuming all demand is fulfilled, independent of stock.', metrics: [['Units', String(model.demand)], ['Unit price / cost', money(model.price) + ' / ' + money(model.cost)], ['Revenue', money(model.revenue)], ['Variable cost', money(model.costTotal)], ['Contribution', money(model.margin)]], limit: 'Illustrative USD. Excludes taxes, labor, overhead and capacity; not realized profit or a business forecast.' }
    };
    const z = zones[zone]; $('#zone-role').textContent = z.role; $('#zone-title').textContent = z.title;
    $('#zone-description').textContent = z.description; $('#zone-limit').textContent = z.limit;
    const dl = $('#zone-metrics'); dl.replaceChildren(); z.metrics.forEach(([k,v]) => { text(dl,'dt',k); text(dl,'dd',v); });
    document.querySelectorAll('[data-zone]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zone === zone)));
    $('#twin-summary').textContent = `${model.title}: ${model.shortfall ? model.shortfall + ' units short; replenishment draft needs review.' : 'No stock shortfall in this fixture.'} Human review required. External actions: 0.`;
  }
  function resetTwin() { scenario = $('#twin-scenario').value; model = C.twin(scenario); $('#twin-stock').value = model.stock; $('#twin-demand').value = model.demand; $('#twin-error').textContent = ''; renderTwin(); }
  $('#twin-scenario').addEventListener('change',resetTwin); $('#twin-reset').addEventListener('click',resetTwin);
  document.querySelectorAll('[data-zone]').forEach(b => b.addEventListener('click', () => { zone = b.dataset.zone; renderTwin(); }));
  $('#twin-apply').addEventListener('click', () => {
    const stock = $('#twin-stock'), demand = $('#twin-demand');
    if (!stock.value.trim() || !demand.value.trim() || !stock.checkValidity() || !demand.checkValidity()) { $('#twin-error').textContent = 'Enter whole values between 0 and 1,000,000. The last valid scenario is still shown.'; return; }
    try { model = C.twin(scenario, { stock: Number(stock.value), demand: Number(demand.value) }); $('#twin-error').textContent = ''; renderTwin(); }
    catch { $('#twin-error').textContent = 'Invalid scenario values. The last valid scenario is still shown.'; }
  });
  let gateway = C.createGateway(), activeRequest = null;
  function audit() {
    const state = gateway.snapshot(), list = $('#weir-audit'); list.replaceChildren();
    for (const e of state.audit) { const li = text(list, 'li', ''); text(li,'b',`${String(e.sequence).padStart(2,'0')} / ${e.kind}`); text(li,'span',`${e.correlation} · ${e.detail}`); }
    $('#weir-approve').disabled = !state.pending; $('#weir-execute').disabled = !state.approved; $('#weir-tamper').disabled = !state.approved;
  }
  $('#weir-evaluate').addEventListener('click', () => {
    activeRequest = { ...C.REQUESTS[$('#weir-request').value] };
    const decision = gateway.submit(activeRequest); $('#weir-decision').textContent = decision;
    $('#weir-reason').textContent = { ALLOW: 'The illustrative read-only request is forwarded.', APPROVE: 'Paused before forwarding. A separate human decision is required.', DENY: 'Outside this illustrative policy. No request is forwarded.' }[decision];
    $('#weir-payload').textContent = JSON.stringify(activeRequest, null, 2);
    $('#weir-outcome').textContent = 'Illustrative result: ' + decision + '. External actions: 0.'; audit();
  });
  $('#weir-approve').addEventListener('click', () => { if (gateway.approve()) $('#weir-outcome').textContent = 'Synthetic reviewer approved this exact request. It has not executed. External actions: 0.'; audit(); });
  $('#weir-execute').addEventListener('click', () => { const ok = gateway.execute(); $('#weir-outcome').textContent = ok ? 'Simulated execution recorded; illustrative grant consumed. External actions: 0.' : 'Execution denied. External actions: 0.'; audit(); });
  $('#weir-tamper').addEventListener('click', () => { gateway.execute({ ...activeRequest, amount: activeRequest.amount + 1 }); $('#weir-outcome').textContent = 'Changed arguments denied. Original request remains separately approved. External actions: 0.'; audit(); });
  $('#weir-reset').addEventListener('click', () => { gateway = C.createGateway(); activeRequest = null; $('#weir-decision').textContent = 'Awaiting request'; $('#weir-reason').textContent = 'Choose a request and evaluate it.'; $('#weir-payload').textContent = 'No request submitted'; $('#weir-outcome').textContent = 'External actions: 0'; audit(); });
  renderTwin(); audit();
})();
