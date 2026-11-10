/* NASHA AI Enterprise Demo: state engine. Pure functions over a plain-JSON state; no DOM, no network, no storage (the UI owns persistence).
   Every business action goes through run(state, action): it validates, applies all effects on a CLONE, and either returns the new state or the old one with an error (transaction-like: a failed action leaves no partial change).
   All money is integer cents. Dates and clocks are deterministic (a demo clock, never the real time). Roles are a DEMONSTRATION of access boundaries, not backend authorization. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js')); else root.NashaEngine = factory(root.NashaData); })(typeof self !== 'undefined' ? self : this, function (D) {
'use strict';
const clone = o => JSON.parse(JSON.stringify(o));
// ---- SHA-256 (synchronous, for the tamper-evident audit chain)
function sha256(str) {
  const K = [], H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let c = 2, n = 0; n < 64; c++) { let p = true; for (let d = 2; d * d <= c; d++) if (c % d === 0) { p = false; break; } if (p) K[n++] = (Math.pow(c, 1 / 3) * 4294967296) | 0; }
  const bytes = []; for (const ch of unescape(encodeURIComponent(str))) bytes.push(ch.charCodeAt(0));
  const l = bytes.length * 8; bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    const w = []; for (let i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) { const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) | 0, S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
// ---- deterministic PRNG for seed history
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// ---- helpers
const costPerBase = ing => ing.packCostCents / ing.packSize;
const ingById = (s, id) => s.ingredients.find(i => i.id === id);
const prodById = id => D.products.find(p => p.id === id);
const baseCost = id => costPerBase(D.ingredients.find(i => i.id === id));
const lineCogs = (s, productId, qty) => { const p = prodById(productId); return Math.round(p.recipe.reduce((sum, r) => sum + r.qty * qty * baseCost(r.ing), 0)); };
const need = (productId, qty) => prodById(productId).recipe.map(r => ({ ing: r.ing, qty: r.qty * qty }));
function tick(s) { s.clock.tick++; const m = 9 * 60 + s.clock.tick * 7; return `${s.clock.day}T${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`; }
function audit(s, type, actor, detail, refs) {
  const prev = s.audit.length ? s.audit[s.audit.length - 1].hash : 'GENESIS';
  const ev = { seq: s.audit.length + 1, at: tick(s), type, actor, detail, refs: refs || {}, prev };
  ev.hash = sha256(prev + '|' + ev.seq + '|' + ev.at + '|' + type + '|' + actor + '|' + detail + '|' + JSON.stringify(ev.refs));
  s.audit.push(ev); return ev;
}
function verifyAudit(s) {
  let prev = 'GENESIS';
  for (const ev of s.audit) { const h = sha256(prev + '|' + ev.seq + '|' + ev.at + '|' + ev.type + '|' + ev.actor + '|' + ev.detail + '|' + JSON.stringify(ev.refs)); if (ev.prev !== prev || ev.hash !== h) return { ok: false, brokenAt: ev.seq }; prev = ev.hash; }
  return { ok: true, events: s.audit.length };
}
const err = (code, message, extra) => ({ ok: false, error: Object.assign({ code, message }, extra || {}) });
const ROLE_RULES = { ORDER_SUBMIT: ['OWNER', 'OPS_MANAGER', 'SALES_LEAD'], ORDER_FULFIL: ['OWNER', 'OPS_MANAGER'], ORDER_CANCEL: ['OWNER', 'OPS_MANAGER', 'SALES_LEAD'], ORDER_MARK_PAID: ['OWNER', 'FINANCE_APPROVER'], AGENT_RUN: ['OWNER', 'OPS_MANAGER', 'FINANCE_APPROVER', 'SALES_LEAD', 'SUPPORT_LEAD', 'HR_MANAGER'], PURCHASE_RECEIVE: ['OWNER', 'OPS_MANAGER'], TICKET_CREATE: ['OWNER', 'SUPPORT_LEAD', 'OPS_MANAGER', 'SALES_LEAD'], TICKET_UPDATE: ['OWNER', 'SUPPORT_LEAD'], TICKET_ESCALATE: ['OWNER', 'SUPPORT_LEAD', 'OPS_MANAGER'], TICKET_PROPOSE_CREDIT: ['OWNER', 'SUPPORT_LEAD'], ONBOARD_START: ['OWNER', 'HR_MANAGER'], ONBOARD_TASK: ['OWNER', 'HR_MANAGER'] };
const APPROVAL_ROLES = { PURCHASE_REQUEST: ['OWNER', 'FINANCE_APPROVER'], ACCESS_GRANT: ['OWNER', 'HR_MANAGER'], TICKET_CREDIT: ['OWNER', 'SUPPORT_LEAD'] };
// ---- seed
function createSeed() {
  const s = { v: 1, clock: { day: D.demoDay, tick: 0 }, ingredients: D.ingredients.map(i => ({ id: i.id, onHand: i.onHand })), employees: D.employees.map(e => ({ id: e.id, status: e.status, tasks: [] })), orders: [], ledger: [], tickets: [], approvals: [], purchases: [], audit: [], idem: {}, counters: { order: 1000, ledger: 0, ticket: 100, approval: 0, purchase: 0 }, agentRuns: 0 };
  const rnd = mulberry32(20261102); let n = 0;
  for (let d = 0; d < D.historyDays.length; d++) {
    const day = D.historyDays[d], count = 5 + Math.floor(rnd() * 5);
    for (let k = 0; k < count; k++) {
      const cust = D.customers[Math.floor(rnd() * D.customers.length)], lines = [], used = new Set(); const nl = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < nl; j++) { const p = D.products[Math.floor(rnd() * D.products.length)]; if (used.has(p.id)) continue; used.add(p.id); lines.push({ productId: p.id, qty: 1 + Math.floor(rnd() * 4) }); }
      const id = `ORD-H${String(++n).padStart(3, '0')}`; const rev = lines.reduce((a, l) => a + prodById(l.productId).priceCents * l.qty, 0), cogs = lines.reduce((a, l) => a + lineCogs(s, l.productId, l.qty), 0);
      s.orders.push({ id, at: `${day}T12:00:00`, customerId: cust.id, lines, revenueCents: rev, cogsCents: cogs, status: 'FULFILLED', payment: cust.terms === 'IMMEDIATE' ? 'PAID' : (d < 8 ? 'PAID' : 'INVOICED'), seed: true, consumption: [] });
      post(s, 'REVENUE', rev, id, day); post(s, 'COGS', cogs, id, day); if (s.orders[s.orders.length - 1].payment === 'PAID') post(s, 'CASH_IN', rev, id, day);
    }
    for (const [cat, perDay] of Object.entries(D.opexPerDay)) post(s, 'EXPENSE', perDay, cat, day);
  }
  audit(s, 'SYSTEM_SEED', 'system', 'Deterministic synthetic seed loaded (no real data)', { orders: s.orders.length });
  return s;
}
function post(s, type, amountCents, ref, day) { s.ledger.push({ id: 'L' + String(++s.counters.ledger).padStart(5, '0'), type, amountCents, ref, day: day || s.clock.day }); }
// ---- derived views (single source of truth: orders, ledger, inventory)
const sum = (s, t) => s.ledger.filter(l => l.type === t).reduce((a, l) => a + l.amountCents, 0);
function finance(s) {
  const revenue = sum(s, 'REVENUE') - sum(s, 'REVENUE_REVERSAL') - sum(s, 'CREDIT_ISSUED'), cogs = sum(s, 'COGS') - sum(s, 'COGS_REVERSAL'), opex = sum(s, 'EXPENSE');
  const cashIn = sum(s, 'CASH_IN') - sum(s, 'CASH_REVERSAL'), gp = revenue - cogs;
  const byProduct = {}; for (const o of s.orders) { if (o.status === 'CANCELLED') continue; for (const l of o.lines) { const b = byProduct[l.productId] || (byProduct[l.productId] = { productId: l.productId, units: 0, revenueCents: 0, cogsCents: 0 }); b.units += l.qty; b.revenueCents += prodById(l.productId).priceCents * l.qty; b.cogsCents += lineCogs(s, l.productId, l.qty); } }
  return { revenueCents: revenue, cogsCents: cogs, grossProfitCents: gp, grossMarginPct: revenue ? Math.round(gp / revenue * 1000) / 10 : 0, opexCents: opex, operatingResultCents: gp - opex, cashReceivedCents: cashIn, receivablesCents: Math.max(0, revenue - cashIn), purchasesReceivedCents: sum(s, 'PURCHASE_RECEIVED'), creditsIssuedCents: sum(s, 'CREDIT_ISSUED'), byProduct: Object.values(byProduct) };
}
function inventoryView(s) {
  return s.ingredients.map(x => { const d = D.ingredients.find(i => i.id === x.id); const open = s.purchases.some(p => p.ingredientId === x.id && (p.status === 'PROPOSED' || p.status === 'APPROVED')); return Object.assign({}, d, { onHand: x.onHand, valueCents: Math.round(x.onHand * costPerBase(d)), low: x.onHand <= d.reorderPoint, openRequest: open }); });
}
function kpis(s) {
  const f = finance(s), inv = inventoryView(s), liveOrders = s.orders.filter(o => o.status !== 'CANCELLED');
  return { revenueCents: f.revenueCents, orders: liveOrders.length, inventoryValueCents: inv.reduce((a, i) => a + i.valueCents, 0), opexCents: f.opexCents, grossMarginPct: f.grossMarginPct, grossProfitCents: f.grossProfitCents, operatingResultCents: f.operatingResultCents, cashReceivedCents: f.cashReceivedCents, receivablesCents: f.receivablesCents, lowStock: inv.filter(i => i.low).length, openTickets: s.tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length, pendingApprovals: s.approvals.filter(a => a.status === 'PENDING').length, customersActive: new Set(liveOrders.map(o => o.customerId)).size, headcountActive: s.employees.filter(e => e.status === 'ACTIVE').length };
}
function dailyRevenue(s) {
  const days = D.historyDays.concat([s.clock.day]), m = Object.fromEntries(days.map(d => [d, 0]));
  for (const l of s.ledger) { if (l.type === 'REVENUE') m[l.day] = (m[l.day] || 0) + l.amountCents; else if (l.type === 'REVENUE_REVERSAL' || l.type === 'CREDIT_ISSUED') m[l.day] = (m[l.day] || 0) - l.amountCents; }
  return days.map(d => ({ day: d, revenueCents: m[d] || 0 }));
}
// ---- actions
function run(prev, action) {
  const s = clone(prev), actor = action.actor || 'visitor', role = action.role || 'READ_ONLY';
  const allowed = ROLE_RULES[action.type];
  if (!allowed) return { ok: false, state: prev, error: { code: 'UNKNOWN_ACTION', message: 'Unknown action ' + action.type } };
  if (!allowed.includes(role)) { audit(s, 'ACTION_DENIED', actor, `${action.type} denied for role ${role} (demonstration boundary)`, { action: action.type, role }); return { ok: false, state: s, error: { code: 'UNAUTHORIZED', message: `Role ${role} may not perform ${action.type} in this demonstration.` } }; }
  const fn = HANDLERS[action.type], r = fn(s, action, actor, role);
  if (!r.ok) return r.audited ? { ok: false, state: s, error: r.error } : { ok: false, state: prev, error: r.error };
  return Object.assign({ ok: true, state: s }, r.result ? { result: r.result } : {});
}
function decide(prev, action) {
  const s = clone(prev), actor = action.actor || 'visitor', role = action.role || 'READ_ONLY', a = s.approvals.find(x => x.id === action.approvalId);
  if (!a) return { ok: false, state: prev, error: { code: 'NOT_FOUND', message: 'Approval not found.' } };
  if (!['APPROVE', 'REJECT'].includes(action.decision)) return { ok: false, state: prev, error: { code: 'INVALID_INPUT', message: 'Decision must be APPROVE or REJECT.' } };
  if (a.status !== 'PENDING') { audit(s, 'INVALID_TRANSITION', actor, `Approval ${a.id} is already ${a.status}`, { approval: a.id }); return { ok: false, state: s, error: { code: 'INVALID_TRANSITION', message: `Approval ${a.id} is already ${a.status}.` } }; }
  if (!(APPROVAL_ROLES[a.type] || []).includes(role)) { audit(s, 'ACTION_DENIED', actor, `Decision on ${a.id} denied for role ${role} (demonstration boundary)`, { approval: a.id, role }); return { ok: false, state: s, error: { code: 'UNAUTHORIZED', message: `Role ${role} may not decide ${a.type} approvals in this demonstration.` } }; }
  a.status = action.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'; a.decidedBy = actor + ' (' + role + ')'; a.note = String(action.note || '').slice(0, 200); a.decidedAt = tick(s);
  audit(s, action.decision === 'APPROVE' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED', actor, `${a.type} ${a.id} ${a.status.toLowerCase()} by ${role}`, { approval: a.id, subject: a.subjectId });
  if (a.type === 'PURCHASE_REQUEST') { const p = s.purchases.find(x => x.id === a.subjectId); p.status = action.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'; audit(s, 'PURCHASE_' + p.status, actor, `Purchase request ${p.id} ${p.status.toLowerCase()} (simulated; no supplier was contacted)`, { purchase: p.id }); }
  if (a.type === 'ACCESS_GRANT') { const e = s.employees.find(x => x.id === a.subjectId); const t = e.tasks.find(x => x.id === 'access'); if (action.decision === 'APPROVE') { t.done = true; t.approved = true; } else { t.rejected = true; } finish(s, e, actor); }
  if (a.type === 'TICKET_CREDIT') { const t = s.tickets.find(x => x.id === a.subjectId); if (action.decision === 'APPROVE') { post(s, 'CREDIT_ISSUED', a.amountCents, t.id); t.history.push({ at: tick(s), actor, event: 'CREDIT_APPROVED', note: 'Credit of $' + (a.amountCents / 100).toFixed(2) + ' (simulated)' }); audit(s, 'LEDGER_POSTED', actor, `Credit ${t.id} posted as a reduction of revenue`, { ticket: t.id, cents: a.amountCents }); } else t.history.push({ at: tick(s), actor, event: 'CREDIT_REJECTED', note: a.note }); }
  return { ok: true, state: s };
}
const HANDLERS = {
  ORDER_SUBMIT(s, a, actor) {
    const key = a.idempotencyKey; if (typeof key !== 'string' || key.length < 6 || key.length > 80) return { ok: false, error: { code: 'INVALID_INPUT', message: 'A submission key of 6 to 80 characters is required.' } };
    if (s.idem[key]) return { ok: true, result: { duplicate: true, orderId: s.idem[key] } };
    const cust = D.customers.find(c => c.id === a.customerId); if (!cust) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Choose a customer.' } };
    const lines = a.lines; if (!Array.isArray(lines) || lines.length < 1 || lines.length > 10) return { ok: false, error: { code: 'INVALID_INPUT', message: 'An order needs 1 to 10 lines.' } };
    const seen = new Set();
    for (const l of lines) { if (!prodById(l.productId)) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Unknown product.' } }; if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) return { ok: false, error: { code: 'INVALID_QUANTITY', message: 'Quantity must be a whole number from 1 to 20.' } }; if (seen.has(l.productId)) return { ok: false, error: { code: 'DUPLICATE_LINE', message: 'List each product once.' } }; seen.add(l.productId); }
    const needs = {}; for (const l of lines) for (const n of need(l.productId, l.qty)) needs[n.ing] = (needs[n.ing] || 0) + n.qty;
    const short = Object.entries(needs).filter(([id, q]) => ingById(s, id).onHand < q).map(([id, q]) => ({ ingredient: D.ingredients.find(i => i.id === id).name, needed: q, onHand: ingById(s, id).onHand, unit: D.ingredients.find(i => i.id === id).unit }));
    if (short.length) return { ok: false, error: { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock: ' + short.map(x => `${x.ingredient} (need ${x.needed}${x.unit}, have ${x.onHand}${x.unit})`).join('; '), shortages: short } };
    const before = Object.fromEntries(s.ingredients.map(i => [i.id, i.onHand]));
    const id = 'ORD-' + (++s.counters.order), revenue = lines.reduce((t, l) => t + prodById(l.productId).priceCents * l.qty, 0), cogs = lines.reduce((t, l) => t + lineCogs(s, l.productId, l.qty), 0), at = tick(s);
    const consumption = Object.entries(needs).map(([ing, qty]) => ({ ing, qty })); for (const c of consumption) ingById(s, c.ing).onHand -= c.qty;
    s.orders.push({ id, at, customerId: cust.id, lines: lines.map(l => ({ productId: l.productId, qty: l.qty })), revenueCents: revenue, cogsCents: cogs, status: 'ACCEPTED', payment: cust.terms === 'IMMEDIATE' ? 'PAID' : 'INVOICED', consumption }); s.idem[key] = id;
    audit(s, 'ORDER_ACCEPTED', actor, `${id} accepted for ${cust.name}: $${(revenue / 100).toFixed(2)}`, { order: id });
    audit(s, 'INVENTORY_DEDUCTED', actor, `${consumption.length} ingredient lines deducted for ${id}`, { order: id });
    post(s, 'REVENUE', revenue, id); post(s, 'COGS', cogs, id); if (cust.terms === 'IMMEDIATE') post(s, 'CASH_IN', revenue, id);
    audit(s, 'LEDGER_POSTED', actor, `${id}: revenue $${(revenue / 100).toFixed(2)}, cost of goods $${(cogs / 100).toFixed(2)}`, { order: id });
    for (const c of consumption) { const d = D.ingredients.find(i => i.id === c.ing); if (before[c.ing] > d.reorderPoint && ingById(s, c.ing).onHand <= d.reorderPoint) audit(s, 'LOW_STOCK_ALERT', 'system', `${d.name} is at ${ingById(s, c.ing).onHand}${d.unit}, at or below its reorder point (${d.reorderPoint}${d.unit})`, { ingredient: d.id }); }
    const rec = inventoryAgent(s, 'agent:inventory', true); return { ok: true, result: { orderId: id, revenueCents: revenue, cogsCents: cogs, recommendations: rec.created } };
  },
  ORDER_FULFIL(s, a, actor) { const o = s.orders.find(x => x.id === a.orderId); if (!o) return { ok: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } }; if (o.status !== 'ACCEPTED') { audit(s, 'INVALID_TRANSITION', actor, `${o.id} cannot be fulfilled from ${o.status}`, { order: o.id }); return { ok: false, audited: true, error: { code: 'INVALID_TRANSITION', message: `${o.id} is ${o.status}; only ACCEPTED orders can be fulfilled.` } }; } o.status = 'FULFILLED'; audit(s, 'ORDER_FULFILLED', actor, `${o.id} fulfilled`, { order: o.id }); return { ok: true }; },
  ORDER_CANCEL(s, a, actor) {
    const o = s.orders.find(x => x.id === a.orderId); if (!o) return { ok: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } };
    if (o.status !== 'ACCEPTED') { audit(s, 'INVALID_TRANSITION', actor, `${o.id} cannot be cancelled from ${o.status}`, { order: o.id }); return { ok: false, audited: true, error: { code: 'INVALID_TRANSITION', message: `${o.id} is ${o.status}; only ACCEPTED orders can be cancelled.` } }; }
    for (const c of o.consumption) ingById(s, c.ing).onHand += c.qty; o.status = 'CANCELLED';
    post(s, 'REVENUE_REVERSAL', o.revenueCents, o.id); post(s, 'COGS_REVERSAL', o.cogsCents, o.id); if (o.payment === 'PAID') post(s, 'CASH_REVERSAL', o.revenueCents, o.id);
    audit(s, 'ORDER_CANCELLED', actor, `${o.id} cancelled; stock restored and revenue and cost reversed`, { order: o.id }); return { ok: true };
  },
  ORDER_MARK_PAID(s, a, actor) { const o = s.orders.find(x => x.id === a.orderId); if (!o) return { ok: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } }; if (o.status === 'CANCELLED' || o.payment !== 'INVOICED') { audit(s, 'INVALID_TRANSITION', actor, `${o.id} cannot be marked paid (${o.status}/${o.payment})`, { order: o.id }); return { ok: false, audited: true, error: { code: 'INVALID_TRANSITION', message: `${o.id} is not an open invoice.` } }; } o.payment = 'PAID'; post(s, 'CASH_IN', o.revenueCents, o.id); audit(s, 'PAYMENT_RECORDED', actor, `${o.id} payment recorded (cash received)`, { order: o.id }); return { ok: true }; },
  AGENT_RUN(s, a, actor) { const f = AGENTS[a.agentId]; if (!f) return { ok: false, error: { code: 'NOT_FOUND', message: 'Unknown agent.' } }; s.agentRuns++; const res = f(s, 'agent:' + a.agentId); audit(s, 'AGENT_RUN', actor, `${a.agentId} agent run (rule-based demo, no LLM): ${res.findings.length} findings, ${(res.created || []).length} approval requests`, { agent: a.agentId }); return { ok: true, result: res }; },
  PURCHASE_RECEIVE(s, a, actor) {
    const p = s.purchases.find(x => x.id === a.purchaseId); if (!p) return { ok: false, error: { code: 'NOT_FOUND', message: 'Purchase request not found.' } };
    if (p.status !== 'APPROVED') { audit(s, 'INVALID_TRANSITION', actor, `${p.id} cannot be received from ${p.status}`, { purchase: p.id }); return { ok: false, audited: true, error: { code: 'INVALID_TRANSITION', message: `${p.id} is ${p.status}; only APPROVED requests can be received.` } }; }
    const d = D.ingredients.find(i => i.id === p.ingredientId); ingById(s, p.ingredientId).onHand += p.packs * d.packSize; p.status = 'RECEIVED';
    post(s, 'PURCHASE_RECEIVED', p.totalCents, p.id); post(s, 'CASH_OUT', p.totalCents, p.id);
    audit(s, 'PURCHASE_RECEIVED', actor, `${p.id}: ${p.packs} x ${d.name} received (simulated delivery); inventory increased`, { purchase: p.id }); return { ok: true };
  },
  TICKET_CREATE(s, a, actor) {
    const subject = String(a.subject || '').trim(), body = String(a.body || '').trim(); if (subject.length < 3 || subject.length > 100 || body.length < 3 || body.length > 600) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Subject (3-100) and details (3-600 characters) are required.' } };
    const cust = D.customers.find(c => c.id === a.customerId); if (!cust) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Choose a customer.' } };
    if (a.orderId && !s.orders.find(o => o.id === a.orderId)) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Unknown order.' } };
    const cl = classify(subject + ' ' + body); const category = D.ticketCategories.includes(a.category) ? a.category : cl.category, priority = D.ticketPriorities.includes(a.priority) ? a.priority : cl.priority;
    const id = 'TKT-' + (++s.counters.ticket), at = tick(s); s.tickets.push({ id, customerId: cust.id, orderId: a.orderId || null, subject, body, category, priority, status: 'NEW', classifier: cl, history: [{ at, actor, event: 'CREATED', note: `${category}/${priority}${cl.needsHuman ? ' (safety keywords: human review required)' : ''}` }] });
    audit(s, 'TICKET_CREATED', actor, `${id} created (${category}, ${priority})`, { ticket: id }); return { ok: true, result: { ticketId: id, classifier: cl } };
  },
  TICKET_UPDATE(s, a, actor) {
    const t = s.tickets.find(x => x.id === a.ticketId); if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found.' } };
    const ok = (D.ticketTransitions[t.status] || []).includes(a.status); if (!ok) { audit(s, 'INVALID_TRANSITION', actor, `${t.id}: ${t.status} to ${a.status} is not allowed`, { ticket: t.id }); return { ok: false, audited: true, error: { code: 'INVALID_TRANSITION', message: `${t.status} cannot move to ${a.status}.` } }; }
    t.history.push({ at: tick(s), actor, event: 'STATUS', note: `${t.status} to ${a.status}` }); audit(s, 'TICKET_STATUS', actor, `${t.id} ${t.status} to ${a.status}`, { ticket: t.id }); t.status = a.status; return { ok: true };
  },
  TICKET_ESCALATE(s, a, actor) {
    const t = s.tickets.find(x => x.id === a.ticketId); if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found.' } };
    if (t.status === 'CLOSED' || t.status === 'ESCALATED') { audit(s, 'INVALID_TRANSITION', actor, `${t.id} cannot be escalated from ${t.status}`, { ticket: t.id }); return { ok: false, audited: true, error: { code: 'INVALID_TRANSITION', message: `${t.id} is ${t.status}.` } }; }
    const i = D.ticketPriorities.indexOf(t.priority); t.priority = D.ticketPriorities[Math.min(i + 1, D.ticketPriorities.length - 1)]; t.history.push({ at: tick(s), actor, event: 'ESCALATED', note: `${t.status} to ESCALATED; priority ${t.priority}` }); t.status = 'ESCALATED'; audit(s, 'TICKET_ESCALATED', actor, `${t.id} escalated (priority ${t.priority})`, { ticket: t.id }); return { ok: true };
  },
  TICKET_PROPOSE_CREDIT(s, a, actor) {
    const t = s.tickets.find(x => x.id === a.ticketId); if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Ticket not found.' } };
    const cents = a.amountCents; if (!Number.isInteger(cents) || cents < 100 || cents > 5000) return { ok: false, error: { code: 'INVALID_INPUT', message: 'A credit must be a whole number of cents from $1.00 to $50.00.' } };
    if (s.approvals.some(x => x.type === 'TICKET_CREDIT' && x.subjectId === t.id && x.status === 'PENDING')) return { ok: false, error: { code: 'DUPLICATE', message: 'A credit for this ticket is already awaiting approval.' } };
    const id = 'APR-' + (++s.counters.approval); s.approvals.push({ id, type: 'TICKET_CREDIT', subjectId: t.id, amountCents: cents, status: 'PENDING', proposedBy: actor, createdAt: tick(s), summary: `Credit $${(cents / 100).toFixed(2)} on ${t.id}` }); t.history.push({ at: tick(s), actor, event: 'CREDIT_PROPOSED', note: `$${(cents / 100).toFixed(2)} awaiting approval` }); audit(s, 'APPROVAL_REQUESTED', actor, `Credit proposal ${id} for ${t.id}`, { approval: id }); return { ok: true, result: { approvalId: id } };
  },
  ONBOARD_START(s, a, actor) {
    const e = s.employees.find(x => x.id === a.employeeId); if (!e) return { ok: false, error: { code: 'NOT_FOUND', message: 'Employee not found.' } };
    if (e.status !== 'PROPOSED') { audit(s, 'INVALID_TRANSITION', actor, `${e.id} cannot start onboarding from ${e.status}`, { employee: e.id }); return { ok: false, audited: true, error: { code: 'INVALID_TRANSITION', message: `${e.id} is ${e.status}; only PROPOSED roles can start onboarding.` } }; }
    e.status = 'ONBOARDING'; e.tasks = D.onboardingTasks.map(t => ({ id: t.id, label: t.label, done: false, requiresApproval: !!t.requiresApproval }));
    const id = 'APR-' + (++s.counters.approval); s.approvals.push({ id, type: 'ACCESS_GRANT', subjectId: e.id, status: 'PENDING', proposedBy: actor, createdAt: tick(s), summary: `Simulated system access for fictional hire ${D.employees.find(x => x.id === e.id).name}` });
    audit(s, 'ONBOARDING_STARTED', actor, `${e.id} onboarding started (fictional)`, { employee: e.id }); audit(s, 'APPROVAL_REQUESTED', actor, `Access approval ${id} for ${e.id}`, { approval: id }); return { ok: true, result: { approvalId: id } };
  },
  ONBOARD_TASK(s, a, actor) {
    const e = s.employees.find(x => x.id === a.employeeId); if (!e || e.status !== 'ONBOARDING') return { ok: false, error: { code: 'INVALID_TRANSITION', message: 'Employee is not in onboarding.' } };
    const t = e.tasks.find(x => x.id === a.taskId); if (!t) return { ok: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } };
    if (t.requiresApproval) { audit(s, 'INVALID_TRANSITION', actor, `${e.id}: task ${t.id} needs an approval, not a checkbox`, { employee: e.id }); return { ok: false, audited: true, error: { code: 'APPROVAL_REQUIRED', message: 'This task completes only through an approval in the Governance Center.' } }; }
    if (t.done) return { ok: false, error: { code: 'INVALID_TRANSITION', message: 'Task already complete.' } };
    t.done = true; audit(s, 'ONBOARDING_TASK', actor, `${e.id}: ${t.label} complete`, { employee: e.id }); finish(s, e, actor); return { ok: true };
  }
};
function finish(s, e, actor) { if (e.status === 'ONBOARDING' && e.tasks.every(t => t.done)) { e.status = 'ACTIVE'; audit(s, 'ONBOARDING_COMPLETE', actor, `${e.id} onboarding complete (fictional hire is now active)`, { employee: e.id }); } }
function classify(text) {
  const t = text.toLowerCase(), hit = list => list.filter(k => t.includes(k));
  const safety = hit(D.keywords.safety), billing = hit(D.keywords.billing), order = hit(D.keywords.order), tech = hit(D.keywords.tech);
  if (safety.length) return { category: 'SAFETY', priority: 'CRITICAL', matched: safety, needsHuman: true, mode: 'rule-based demo (keywords), not an LLM' };
  if (billing.length) return { category: 'BILLING', priority: 'HIGH', matched: billing, needsHuman: false, mode: 'rule-based demo (keywords), not an LLM' };
  if (order.length) return { category: 'ORDER_ISSUE', priority: 'MEDIUM', matched: order, needsHuman: false, mode: 'rule-based demo (keywords), not an LLM' };
  if (tech.length) return { category: 'TECHNICAL', priority: 'LOW', matched: tech, needsHuman: false, mode: 'rule-based demo (keywords), not an LLM' };
  return { category: 'GENERAL', priority: 'LOW', matched: [], needsHuman: false, mode: 'rule-based demo (keywords), not an LLM' };
}
// ---- deterministic, rule-based demo agents (no model); only the inventory agent creates approval requests
function inventoryAgent(s, who, silent) {
  const created = [], findings = [];
  for (const x of inventoryView(s)) {
    if (!x.low) continue; findings.push(`${x.name}: ${x.onHand}${x.unit} on hand, reorder point ${x.reorderPoint}${x.unit}`);
    if (x.openRequest) continue;
    const packs = Math.max(1, Math.ceil((x.par - x.onHand) / x.packSize)), total = Math.round(packs * x.packCostCents), pid = 'PUR-' + (++s.counters.purchase), aid = 'APR-' + (++s.counters.approval);
    s.purchases.push({ id: pid, ingredientId: x.id, supplierId: x.supplierId, packs, totalCents: total, status: 'PROPOSED', approvalId: aid });
    s.approvals.push({ id: aid, type: 'PURCHASE_REQUEST', subjectId: pid, status: 'PENDING', proposedBy: who, createdAt: tick(s), amountCents: total, summary: `Order ${packs} x ${x.packSize}${x.unit} of ${x.name} from ${D.suppliers.find(q => q.id === x.supplierId).name} ($${(total / 100).toFixed(2)})`, reasoning: `On hand ${x.onHand}${x.unit} is at or below the reorder point ${x.reorderPoint}${x.unit}; target level ${x.par}${x.unit}. Rule: packs = ceil((target - on hand) / pack size).` });
    audit(s, 'AGENT_RECOMMENDATION', who, `Replenishment proposed for ${x.name}: ${packs} pack(s), $${(total / 100).toFixed(2)}`, { purchase: pid, approval: aid }); audit(s, 'APPROVAL_REQUESTED', who, `Approval ${aid} awaits a human decision (nothing is ordered)`, { approval: aid }); created.push({ approvalId: aid, purchaseId: pid, ingredient: x.name, packs, totalCents: total });
  }
  return { agent: 'inventory', mode: 'rule-based demo, no LLM', findings, created };
}
const AGENTS = {
  inventory: (s, who) => inventoryAgent(s, who),
  finance(s) { const f = finance(s), rows = f.byProduct.map(b => ({ name: prodById(b.productId).name, marginPct: b.revenueCents ? Math.round((b.revenueCents - b.cogsCents) / b.revenueCents * 1000) / 10 : 0, units: b.units })).sort((a, b) => a.marginPct - b.marginPct); return { agent: 'finance', mode: 'rule-based demo, no LLM', findings: [`Gross margin ${f.grossMarginPct}% (gross profit is not net profit; operating costs are shown separately).`, rows.length ? `Lowest product margin: ${rows[0].name} at ${rows[0].marginPct}%.` : 'No orders.', rows.length ? `Highest product margin: ${rows[rows.length - 1].name} at ${rows[rows.length - 1].marginPct}%.` : ''].filter(Boolean), created: [] }; },
  marketing(s) { const r = D.campaigns.map(c => ({ name: c.name, roas: c.spendCents ? Math.round(c.revenueCents / c.spendCents * 100) / 100 : 0 })).sort((a, b) => b.roas - a.roas); return { agent: 'marketing', mode: 'rule-based demo, no LLM', findings: r.map(x => `${x.name}: return on ad spend ${x.roas} (synthetic campaign data)`), created: [] }; },
  support(s) { const open = s.tickets.filter(t => ['NEW', 'OPEN', 'ESCALATED'].includes(t.status)); return { agent: 'support', mode: 'rule-based demo, no LLM', findings: open.length ? open.map(t => `${t.id}: ${t.category}/${t.priority}${t.classifier && t.classifier.needsHuman ? ' (safety keywords: human review required)' : ''}`) : ['No open tickets.'], created: [] }; },
  executive(s) { const k = kpis(s); return { agent: 'executive', mode: 'rule-based demo, no LLM', findings: [`Booked revenue $${(k.revenueCents / 100).toFixed(2)} across ${k.orders} orders; gross margin ${k.grossMarginPct}%.`, `${k.lowStock} ingredients at or below reorder point; ${k.pendingApprovals} approvals pending.`, `${k.openTickets} support tickets open; receivables $${(k.receivablesCents / 100).toFixed(2)} outstanding.`], created: [] }; },
  compliance(s) { const v = verifyAudit(s), f = finance(s), bookedOrders = s.orders.filter(o => o.status !== 'CANCELLED').reduce((a, o) => a + o.revenueCents, 0), credits = f.creditsIssuedCents; const consistent = f.revenueCents === bookedOrders - credits; const neg = s.ingredients.filter(i => i.onHand < 0).length; return { agent: 'compliance', mode: 'rule-based demo, no LLM', findings: [`Audit hash chain: ${v.ok ? 'verified (' + v.events + ' events)' : 'BROKEN at event ' + v.brokenAt}`, `Revenue in the ledger ${consistent ? 'equals' : 'DIFFERS from'} the sum of live orders less credits.`, `Negative inventory lines: ${neg}`, `Pending approvals: ${s.approvals.filter(a => a.status === 'PENDING').length}`], created: [] }; },
  operations(s) { const acc = s.orders.filter(o => o.status === 'ACCEPTED'); const need = {}; for (const o of acc) for (const c of o.consumption) need[c.ing] = (need[c.ing] || 0) + c.qty; return { agent: 'operations', mode: 'rule-based demo, no LLM', findings: acc.length ? [`${acc.length} accepted orders await fulfilment.`, ...Object.entries(need).map(([id, q]) => `Prep ${q}${D.ingredients.find(i => i.id === id).unit} ${D.ingredients.find(i => i.id === id).name}`)] : ['No accepted orders to prepare.'], created: [] }; },
  hr(s) { const o = s.employees.filter(e => e.status === 'ONBOARDING'); return { agent: 'hr', mode: 'rule-based demo, no LLM', findings: o.length ? o.map(e => `${e.id}: ${e.tasks.filter(t => t.done).length}/${e.tasks.length} onboarding tasks done`) : ['No one is onboarding. Proposed roles can be started from Human Resources.'], created: [] }; },
  bi(s) { const f = finance(s), top = f.byProduct.slice().sort((a, b) => b.revenueCents - a.revenueCents)[0]; return { agent: 'bi', mode: 'rule-based demo, no LLM', findings: top ? [`Largest revenue product: ${prodById(top.productId).name} (${(top.revenueCents / Math.max(1, f.revenueCents) * 100).toFixed(1)}% of revenue).`, `Orders drive cost of goods; every accepted order deducts stock, so inventory value, cost of goods and gross margin move together.`] : ['No data.'], created: [] };}
};
function campaignScenario(p) {
  const ch = D.channels.find(c => c.id === p.channel), seg = D.segments.find(x => x.id === p.segment);
  if (!ch || !seg || !Number.isInteger(p.budgetCents) || p.budgetCents < 10000 || p.budgetCents > 1000000) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Choose a channel, a segment and a budget from $100 to $10,000.' } };
  const impressions = Math.round(p.budgetCents / 100 / ch.cpm * 1000), clicks = Math.round(impressions * ch.ctr * seg.engage), visits = Math.round(clicks * 0.8), orders = Math.round(visits * ch.cvr * seg.convert), revenueCents = orders * seg.aovCents;
  return { ok: true, label: 'SIMULATION from fixed assumptions; no campaign was run', impressions, clicks, visits, orders, revenueCents, roas: Math.round(revenueCents / p.budgetCents * 100) / 100, assumptions: { cpm: ch.cpm, ctr: ch.ctr, cvr: ch.cvr, engage: seg.engage, convert: seg.convert, aovCents: seg.aovCents } };
}
function consistency(s) {
  const f = finance(s), live = s.orders.filter(o => o.status !== 'CANCELLED'), issues = [];
  if (f.revenueCents !== live.reduce((a, o) => a + o.revenueCents, 0) - f.creditsIssuedCents) issues.push('ledger revenue differs from live orders');
  if (f.cogsCents !== live.reduce((a, o) => a + o.cogsCents, 0)) issues.push('ledger cost of goods differs from live orders');
  if (s.ingredients.some(i => i.onHand < 0)) issues.push('negative inventory');
  if (!verifyAudit(s).ok) issues.push('audit chain broken');
  return { ok: !issues.length, issues };
}
function preview(s, id) { const c = clone(s); return AGENTS[id](c, 'preview'); }
return { preview, createSeed, run, decide, kpis, finance, inventoryView, dailyRevenue, verifyAudit, classify, campaignScenario, consistency, sha256, ROLE_RULES, APPROVAL_ROLES, costPerBase };
});
