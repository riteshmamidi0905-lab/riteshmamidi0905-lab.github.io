'use strict';
const assert = require('node:assert/strict');
const C = require('../assets/js/nasha-ecosystem-core');
for (const id of Object.keys(C.SCENARIOS)) {
  const x = C.twin(id);
  assert.equal(x.externalActions, 0); assert.equal(x.reviewRequired, true);
  assert.equal(x.revenue - x.costTotal, x.margin);
  assert.equal(x.labels.length, x.feedback.length);
}
assert.equal(C.twin('shortage').shortfall, 8);
assert.equal(C.twin('courtyard', {stock:0,demand:0}).shortfall, 0);
assert.equal(C.twin('courtyard', {stock:1,demand:10}).shortfall, 9);
assert.equal(C.twin('courtyard', {stock:10,demand:1}).remaining, 9);
for (const stock of [-1, NaN, Infinity, '2', null, true, 1000001]) assert.throws(() => C.twin('courtyard',{stock}));
assert.throws(() => C.twin('__proto__'));
assert.equal(C.evaluate(null),'DENY'); assert.equal(C.evaluate({tool:'read_inventory'}),'DENY');
for (const field of ['tool','scope','amount']) {
  const r = {...C.REQUESTS.draft, [field]: field === 'amount' ? 23 : 'changed'};
  assert.equal(C.evaluate(r),'DENY');
}
const g = C.createGateway();
assert.equal(g.execute(),false); assert.equal(g.approve(),false);
assert.equal(g.submit(C.REQUESTS.draft),'APPROVE'); assert.equal(g.snapshot().forwarded,false);
assert.equal(g.execute(),false); assert.equal(g.approve(),true); assert.equal(g.snapshot().forwarded,false);
assert.equal(g.execute({...C.REQUESTS.draft,amount:23}),false);
assert.equal(g.execute(),true); assert.equal(g.execute(),false,'grant cannot be replayed');
assert.equal(g.submit(C.REQUESTS.blocked),'DENY'); assert.equal(g.approve(),false); assert.equal(g.execute(),false);
assert.equal(g.snapshot().forwarded,false);
assert.equal(g.submit(C.REQUESTS.read),'ALLOW'); assert.equal(g.snapshot().forwarded,true);
g.submit(C.REQUESTS.draft); g.approve(); g.submit(C.REQUESTS.blocked); assert.equal(g.execute(C.REQUESTS.draft),false,'a new request invalidates the grant');
const snapshot = g.snapshot(); snapshot.audit[0].detail='changed'; assert.notEqual(g.snapshot().audit[0].detail,'changed');
assert.deepEqual(g.snapshot().audit.map(x=>x.sequence),Array.from({length:g.snapshot().audit.length},(_,i)=>i+1));
console.log('PASS: synthetic model arithmetic, invalid inputs, fail-closed policy, approval separation, changed arguments, grant replay and ordered audit');
