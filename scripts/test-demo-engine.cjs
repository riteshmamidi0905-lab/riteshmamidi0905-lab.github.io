'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../demo/engine.js'), D = require('../demo/data.js');
const ops = (s, a) => E.run(s, Object.assign({ role: 'OPS_MANAGER', actor: 'tester' }, a));
const order = (s, lines, key, cust) => ops(s, { type: 'ORDER_SUBMIT', idempotencyKey: key || 'key-' + Math.random().toString(36).slice(2, 10), customerId: cust || 'C1', lines });
const seed = () => E.createSeed();
const onHand = (s, id) => s.ingredients.find(i => i.id === id).onHand;

test('seed is deterministic and internally consistent', () => {
  const a = seed(), b = seed(); assert.deepEqual(a, b);
  assert.ok(E.consistency(a).ok); assert.ok(E.verifyAudit(a).ok); assert.equal(E.kpis(a).pendingApprovals, 0);
  const f = E.finance(a); assert.equal(f.grossProfitCents, f.revenueCents - f.cogsCents); assert.equal(f.operatingResultCents, f.grossProfitCents - f.opexCents);
});
test('order creation: accepted, totals correct, status ACCEPTED, history lists it', () => {
  const s = seed(), r = order(s, [{ productId: 'hefe', qty: 2 }, { productId: 'wit', qty: 1 }]);
  assert.ok(r.ok); const o = r.state.orders.find(x => x.id === r.result.orderId);
  assert.equal(o.status, 'ACCEPTED'); assert.equal(o.revenueCents, 2 * 700 + 750); assert.equal(r.state.orders.length, s.orders.length + 1);
});
test('invalid orders are rejected without changing state', () => {
  const s = seed();
  for (const lines of [[], [{ productId: 'hefe', qty: 0 }], [{ productId: 'hefe', qty: -1 }], [{ productId: 'hefe', qty: 1.5 }], [{ productId: 'hefe', qty: 21 }], [{ productId: 'nope', qty: 1 }], [{ productId: 'hefe', qty: '2' }], [{ productId: 'hefe', qty: 1 }, { productId: 'hefe', qty: 1 }]]) {
    const r = order(s, lines); assert.equal(r.ok, false, JSON.stringify(lines)); assert.deepEqual(r.state, s);
  }
  assert.equal(ops(s, { type: 'ORDER_SUBMIT', idempotencyKey: 'x', customerId: 'C1', lines: [{ productId: 'hefe', qty: 1 }] }).ok, false, 'short key rejected');
  assert.equal(order(s, [{ productId: 'hefe', qty: 1 }], 'valid-key-1', 'C99').ok, false, 'unknown customer');
});
test('insufficient inventory refuses the whole order and never goes negative', () => {
  const s = seed(); const r = order(s, [{ productId: 'wings', qty: 20 }]);
  assert.equal(r.ok, false); assert.equal(r.error.code, 'INSUFFICIENT_STOCK'); assert.deepEqual(r.state, s); assert.ok(r.error.shortages.length >= 1);
  let cur = s; for (let i = 0; i < 40; i++) { const x = order(cur, [{ productId: 'birria', qty: 10 }], 'loop-key-' + i); if (!x.ok) break; cur = x.state; }
  assert.ok(cur.ingredients.every(i => i.onHand >= 0));
});
test('a failed multi-line order leaves no partial deduction', () => {
  const s = seed(), before = onHand(s, 'beerH'), r = order(s, [{ productId: 'hefe', qty: 2 }, { productId: 'wings', qty: 20 }]);
  assert.equal(r.ok, false); assert.equal(r.error.code, 'INSUFFICIENT_STOCK'); assert.equal(onHand(r.state, 'beerH'), before); assert.deepEqual(r.state, s);
});
test('inventory deduction matches the recipes exactly', () => {
  const s = seed(), r = order(s, [{ productId: 'wings', qty: 2 }, { productId: 'hefe', qty: 3 }]);
  assert.equal(onHand(r.state, 'chicken'), onHand(s, 'chicken') - 900); assert.equal(onHand(r.state, 'tamarind'), onHand(s, 'tamarind') - 120); assert.equal(onHand(r.state, 'beerH'), onHand(s, 'beerH') - 3 * 473); assert.equal(onHand(r.state, 'pack'), onHand(s, 'pack') - 2);
});
test('revenue and gross margin follow the ledger by formula', () => {
  const s = seed(), f0 = E.finance(s), r = order(s, [{ productId: 'hefe', qty: 2 }]), f1 = E.finance(r.state);
  const o = r.state.orders.find(x => x.id === r.result.orderId);
  assert.equal(f1.revenueCents, f0.revenueCents + 1400); assert.equal(f1.cogsCents, f0.cogsCents + o.cogsCents);
  assert.equal(f1.grossProfitCents, f1.revenueCents - f1.cogsCents); assert.equal(f1.grossMarginPct, Math.round(f1.grossProfitCents / f1.revenueCents * 1000) / 10);
  assert.equal(o.cogsCents, Math.round(2 * 473 * D.ingredients.find(i => i.id === 'beerH').packCostCents / 30000));
  assert.notEqual(f1.grossProfitCents, f1.operatingResultCents, 'gross profit is not net profit');
});
test('revenue is separate from cash: immediate-pay vs invoiced customers', () => {
  const s = seed(), a = order(s, [{ productId: 'hefe', qty: 1 }], 'pay-key-0001', 'C1'), b = order(a.state, [{ productId: 'hefe', qty: 1 }], 'pay-key-0002', 'C3');
  const f0 = E.finance(s), f2 = E.finance(b.state); assert.equal(f2.revenueCents - f0.revenueCents, 1400); assert.equal(f2.cashReceivedCents - f0.cashReceivedCents, 700); assert.equal(f2.receivablesCents - f0.receivablesCents, 700);
  const invoiced = b.state.orders.find(o => o.id === b.result.orderId), p = E.run(b.state, { type: 'ORDER_MARK_PAID', role: 'FINANCE_APPROVER', actor: 't', orderId: invoiced.id }); assert.ok(p.ok); assert.equal(E.finance(p.state).cashReceivedCents - f0.cashReceivedCents, 1400);
  assert.equal(E.run(p.state, { type: 'ORDER_MARK_PAID', role: 'FINANCE_APPROVER', actor: 't', orderId: invoiced.id }).ok, false, 'cannot pay twice');
});
test('duplicate submission is idempotent: no double counting', () => {
  const s = seed(), a = order(s, [{ productId: 'wings', qty: 1 }], 'same-key-0001'), b = order(a.state, [{ productId: 'wings', qty: 1 }], 'same-key-0001');
  assert.ok(b.ok && b.result.duplicate); assert.deepEqual(b.state, a.state); assert.equal(a.state.orders.length, s.orders.length + 1);
});
test('low stock raises an alert event and one replenishment approval, not duplicates', () => {
  const s = seed(), r = order(s, [{ productId: 'wings', qty: 3 }]);
  assert.ok(r.state.audit.some(e => e.type === 'LOW_STOCK_ALERT')); assert.equal(r.state.approvals.filter(a => a.status === 'PENDING' && a.type === 'PURCHASE_REQUEST').length, 1);
  const r2 = order(r.state, [{ productId: 'wings', qty: 1 }], 'second-key-01'); assert.equal(r2.state.approvals.filter(a => a.type === 'PURCHASE_REQUEST').length, 1, 'no duplicate request while one is open');
});
test('approval workflow: nothing changes before approval; approve then receive increases stock and posts the ledger', () => {
  let s = order(seed(), [{ productId: 'wings', qty: 3 }]).state; const ap = s.approvals[0], pur = s.purchases[0], before = onHand(s, 'chicken');
  assert.equal(pur.status, 'PROPOSED'); assert.equal(E.run(s, { type: 'PURCHASE_RECEIVE', role: 'OPS_MANAGER', actor: 't', purchaseId: pur.id }).ok, false, 'cannot receive before approval');
  const denied = E.decide(s, { approvalId: ap.id, decision: 'APPROVE', role: 'OPS_MANAGER', actor: 't' }); assert.equal(denied.error.code, 'UNAUTHORIZED'); assert.equal(denied.state.purchases[0].status, 'PROPOSED'); assert.ok(denied.state.audit.some(e => e.type === 'ACTION_DENIED'));
  s = E.decide(s, { approvalId: ap.id, decision: 'APPROVE', role: 'FINANCE_APPROVER', actor: 'fin' }).state; assert.equal(s.purchases[0].status, 'APPROVED'); assert.equal(onHand(s, 'chicken'), before);
  assert.equal(E.decide(s, { approvalId: ap.id, decision: 'REJECT', role: 'OWNER', actor: 'x' }).error.code, 'INVALID_TRANSITION', 'cannot decide twice');
  const rec = E.run(s, { type: 'PURCHASE_RECEIVE', role: 'OPS_MANAGER', actor: 'ops', purchaseId: pur.id }); assert.ok(rec.ok); assert.equal(onHand(rec.state, 'chicken'), before + pur.packs * 5000);
  assert.equal(E.finance(rec.state).purchasesReceivedCents, pur.totalCents); assert.equal(E.finance(rec.state).grossProfitCents, E.finance(s).grossProfitCents, 'a purchase is not an expense or revenue');
});
test('rejected request stays rejected and does not touch stock or money', () => {
  const s = order(seed(), [{ productId: 'wings', qty: 3 }]).state, ap = s.approvals[0], f = E.finance(s), r = E.decide(s, { approvalId: ap.id, decision: 'REJECT', role: 'OWNER', actor: 'o', note: 'not now' });
  assert.equal(r.state.purchases[0].status, 'REJECTED'); assert.deepEqual(E.finance(r.state), f); assert.equal(E.run(r.state, { type: 'PURCHASE_RECEIVE', role: 'OWNER', actor: 'o', purchaseId: r.state.purchases[0].id }).ok, false);
});
test('cancel restores stock and reverses money exactly once', () => {
  const s = seed(), a = order(s, [{ productId: 'birria', qty: 2 }, { productId: 'hefe', qty: 1 }], 'cancel-key-01'), id = a.result.orderId, c = E.run(a.state, { type: 'ORDER_CANCEL', role: 'OPS_MANAGER', actor: 't', orderId: id });
  assert.ok(c.ok); assert.deepEqual(c.state.ingredients, s.ingredients); assert.deepEqual(E.finance(c.state).revenueCents, E.finance(s).revenueCents); assert.deepEqual(E.finance(c.state).cashReceivedCents, E.finance(s).cashReceivedCents);
  assert.equal(E.run(c.state, { type: 'ORDER_CANCEL', role: 'OPS_MANAGER', actor: 't', orderId: id }).ok, false, 'second cancel refused'); assert.ok(E.consistency(c.state).ok);
  const f = E.run(a.state, { type: 'ORDER_FULFIL', role: 'OPS_MANAGER', actor: 't', orderId: id }); assert.ok(f.ok); assert.equal(E.run(f.state, { type: 'ORDER_CANCEL', role: 'OPS_MANAGER', actor: 't', orderId: id }).ok, false, 'fulfilled cannot be cancelled');
});
test('roles are enforced and denials are audited (demonstration boundary)', () => {
  const s = seed(), r = E.run(s, { type: 'ORDER_SUBMIT', role: 'READ_ONLY', actor: 'v', idempotencyKey: 'ro-key-0001', customerId: 'C1', lines: [{ productId: 'hefe', qty: 1 }] });
  assert.equal(r.error.code, 'UNAUTHORIZED'); assert.equal(r.state.orders.length, s.orders.length); assert.equal(r.state.audit[r.state.audit.length - 1].type, 'ACTION_DENIED');
});
test('support ticket lifecycle, classification, escalation and credit approval', () => {
  const sup = (s, a) => E.run(s, Object.assign({ role: 'SUPPORT_LEAD', actor: 'lead' }, a));
  let s = seed(); const c = sup(s, { type: 'TICKET_CREATE', customerId: 'C1', subject: 'Possible allergy reaction', body: 'Guest felt sick after the paneer taco' });
  assert.equal(c.state.tickets[0].category, 'SAFETY'); assert.equal(c.state.tickets[0].priority, 'CRITICAL'); assert.ok(c.state.tickets[0].classifier.needsHuman); s = c.state;
  const id = s.tickets[0].id; assert.equal(sup(s, { type: 'TICKET_UPDATE', ticketId: id, status: 'CLOSED' }).error.code, 'INVALID_TRANSITION');
  for (const st of ['OPEN', 'PENDING_CUSTOMER', 'OPEN', 'RESOLVED', 'CLOSED']) { const r = sup(s, { type: 'TICKET_UPDATE', ticketId: id, status: st }); assert.ok(r.ok, st); s = r.state; }
  assert.equal(s.tickets[0].status, 'CLOSED'); assert.ok(s.tickets[0].history.length >= 6); assert.equal(sup(s, { type: 'TICKET_ESCALATE', ticketId: id }).ok, false);
  const b = sup(s, { type: 'TICKET_CREATE', customerId: 'C3', subject: 'Overcharged invoice', body: 'Please refund the extra charge' }); assert.equal(b.state.tickets[1].category, 'BILLING'); s = b.state; const bid = s.tickets[1].id;
  const e = sup(s, { type: 'TICKET_ESCALATE', ticketId: bid }); assert.equal(e.state.tickets[1].status, 'ESCALATED'); assert.equal(e.state.tickets[1].priority, 'CRITICAL'); s = e.state;
  assert.equal(sup(s, { type: 'TICKET_PROPOSE_CREDIT', ticketId: bid, amountCents: 99999 }).ok, false); const p = sup(s, { type: 'TICKET_PROPOSE_CREDIT', ticketId: bid, amountCents: 1500 }); s = p.state; const rev0 = E.finance(s).revenueCents;
  assert.equal(E.decide(s, { approvalId: p.result.approvalId, decision: 'APPROVE', role: 'OPS_MANAGER', actor: 'x' }).error.code, 'UNAUTHORIZED'); assert.equal(E.finance(s).revenueCents, rev0);
  const ok = E.decide(s, { approvalId: p.result.approvalId, decision: 'APPROVE', role: 'SUPPORT_LEAD', actor: 'lead' }); assert.equal(E.finance(ok.state).revenueCents, rev0 - 1500); assert.ok(E.consistency(ok.state).ok);
});
test('onboarding needs the access approval before the hire becomes active', () => {
  const hr = (s, a) => E.run(s, Object.assign({ role: 'HR_MANAGER', actor: 'hr' }, a)); let s = seed(); const r = hr(s, { type: 'ONBOARD_START', employeeId: 'E17' }); s = r.state; assert.equal(s.employees.find(e => e.id === 'E17').status, 'ONBOARDING');
  assert.equal(hr(s, { type: 'ONBOARD_START', employeeId: 'E17' }).ok, false);
  for (const t of ['paperwork', 'food', 'rbs', 'equip']) s = hr(s, { type: 'ONBOARD_TASK', employeeId: 'E17', taskId: t }).state;
  assert.equal(hr(s, { type: 'ONBOARD_TASK', employeeId: 'E17', taskId: 'access' }).error.code, 'APPROVAL_REQUIRED'); assert.equal(s.employees.find(e => e.id === 'E17').status, 'ONBOARDING');
  s = E.decide(s, { approvalId: r.result.approvalId, decision: 'APPROVE', role: 'HR_MANAGER', actor: 'hr' }).state; assert.equal(s.employees.find(e => e.id === 'E17').status, 'ACTIVE');
});
test('agents: only the inventory agent creates approvals, nothing executes; all are labelled rule-based', () => {
  let s = seed(); for (const id of ['executive', 'finance', 'marketing', 'support', 'operations', 'hr', 'compliance', 'bi']) { const r = E.run(s, { type: 'AGENT_RUN', role: 'OWNER', actor: 't', agentId: id }); assert.ok(r.ok); assert.match(r.result.mode, /rule-based/); assert.equal(r.state.approvals.length, 0); }
  const o = order(seed(), [{ productId: 'wings', qty: 3 }]).state, before = o.approvals.length, r = E.run(o, { type: 'AGENT_RUN', role: 'OWNER', actor: 't', agentId: 'inventory' }); assert.equal(r.state.approvals.length, before, 'no duplicate proposal'); assert.equal(E.run(seed(), { type: 'AGENT_RUN', role: 'OWNER', actor: 't', agentId: 'nope' }).ok, false);
});
test('audit chain verifies and detects tampering', () => {
  let s = seed(); s = order(s, [{ productId: 'hefe', qty: 1 }]).state; assert.ok(E.verifyAudit(s).ok);
  const t = JSON.parse(JSON.stringify(s)); t.audit[2].detail = 'edited'; assert.equal(E.verifyAudit(t).ok, false); assert.equal(E.verifyAudit(t).brokenAt, t.audit[2].seq); assert.equal(E.consistency(t).ok, false);
  assert.equal(E.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  s = order(s, [{ productId: 'hefe', qty: 1 }], 'again-key-01').state; for (const e of s.audit) assert.ok(e.hash && e.prev);
});
test('cross-module consistency holds after a long mixed sequence', () => {
  let s = seed(), n = 0; const prods = D.products.map(p => p.id), cust = D.customers.map(c => c.id);
  for (let i = 0; i < 60; i++) { const r = order(s, [{ productId: prods[i % prods.length], qty: 1 + (i % 4) }], 'mix-key-' + i, cust[i % cust.length]); if (r.ok) { s = r.state; n++; if (i % 5 === 0) s = E.run(s, { type: 'ORDER_CANCEL', role: 'OPS_MANAGER', actor: 't', orderId: r.result.orderId }).state; } for (const a of s.approvals.filter(a => a.status === 'PENDING' && a.type === 'PURCHASE_REQUEST').slice(0, 1)) { s = E.decide(s, { approvalId: a.id, decision: i % 2 ? 'APPROVE' : 'REJECT', role: 'OWNER', actor: 'o' }).state; } for (const p of s.purchases.filter(p => p.status === 'APPROVED')) s = E.run(s, { type: 'PURCHASE_RECEIVE', role: 'OWNER', actor: 'o', purchaseId: p.id }).state; }
  assert.ok(n > 10); const c = E.consistency(s); assert.ok(c.ok, c.issues.join()); assert.ok(s.ingredients.every(i => i.onHand >= 0));
  const k = E.kpis(s), f = E.finance(s); assert.equal(k.revenueCents, f.revenueCents); assert.equal(k.grossProfitCents, f.revenueCents - f.cogsCents);
});
test('reset returns exactly the deterministic seed; the engine never mutates its input', () => {
  const s = seed(), snap = JSON.stringify(s); order(s, [{ productId: 'hefe', qty: 1 }], 'immut-key-01'); assert.equal(JSON.stringify(s), snap); assert.deepEqual(seed(), s);
});
test('marketing scenario is deterministic, validated and labelled a simulation', () => {
  const a = E.campaignScenario({ budgetCents: 50000, channel: 'email', segment: 'lunch' }), b = E.campaignScenario({ budgetCents: 50000, channel: 'email', segment: 'lunch' }); assert.deepEqual(a, b); assert.match(a.label, /SIMULATION/); assert.ok(a.orders > 0);
  for (const bad of [{ budgetCents: 5, channel: 'email', segment: 'lunch' }, { budgetCents: 50000, channel: 'x', segment: 'lunch' }, { budgetCents: 50000.5, channel: 'email', segment: 'lunch' }]) assert.equal(E.campaignScenario(bad).ok, false);
});
test('the demo code makes no network calls and collects nothing', () => {
  const fs = require('fs'), path = require('path'); for (const f of ['engine.js', 'data.js', 'app.js', 'index.html']) { const p = path.join(__dirname, '../demo', f); if (!fs.existsSync(p)) continue; const t = fs.readFileSync(p, 'utf8').replace(/<link rel="canonical"[^>]*>/g, ''); assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|document\.cookie|EventSource|importScripts|https?:\/\//.test(t.replace(/\/\*[\s\S]*?\*\//g, '')), f + ' contains a network or tracking construct'); }
});
