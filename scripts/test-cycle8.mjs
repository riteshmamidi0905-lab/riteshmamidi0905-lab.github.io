import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preset,simulateCurrentPeriod,simulateOperatingPeriod} from '../pavilion/engine.js';
import {compareWeek,staffingSweep} from '../pavilion/week-comparison.js';
import {shiftRoster} from '../pavilion/brewpub.js';
import {decide,pendingRequests} from '../pavilion/ops.js';

const seedModel = {...preset,staff:[...shiftRoster]};
const recordsOf = (m,kind) => Object.values(m.records).filter(r=>r.kind===kind);
for (const seed of [25,26,27,28,29]) {
  test('Posted meals, walkouts, ratings and staffing optimum over 28 days, seed '+seed,()=>{
    const model=simulateCurrentPeriod({...preset,seed});
    const sweep=staffingSweep(model);
    assert.deepEqual(sweep.map(r=>r.positions),[2,3,4,5,6,7]);
    for (let i=1;i<sweep.length;i++) {
      const a=sweep[i-1],b=sweep[i];
      assert.ok(b.meals>=a.meals);
      assert.ok(b.weeks.reduce((n,w)=>n+w.walkouts,0)<=a.weeks.reduce((n,w)=>n+w.walkouts,0));
      assert.ok(b.weeks.every((w,j)=>w.rating>=a.weeks[j].rating));
    }
    const top=sweep.reduce((a,b)=>a.income>b.income?a:b);
    assert.equal(top.positions,model.records.TERMS.baselinePositions);
    assert.ok(sweep.every(r=>r===top||r.income<top.income));
  });
}
test('over-cap order passes through recorded review before goods can be received',()=>{
  const m=simulateCurrentPeriod(seedModel);
  const approvals=recordsOf(m,'Approval record'), budgets=recordsOf(m,'Weekly purchase budget');
  assert.equal(budgets.length,4);
  for (const b of budgets) {
    let committed=0;
    for (const d of approvals.filter(r=>r.budgetId===b.id)){
      assert.equal(d.committedBeforeCents,committed);
      assert.equal(d.remainingBudgetCents,b.budgetCents-committed);
      if(d.approved)committed+=d.cents;
      assert.ok(committed<=b.budgetCents);
    }
  }
  const over=approvals.filter(d=>d.cents>d.limitCents);
  assert.ok(over.length>0);
  for(const d of over){
    const review=m.records[d.reviewId];assert.equal(review.kind,'Pending purchase review');
    assert.equal(review.purchaseId,d.purchaseId);assert.equal(review.budgetId,d.budgetId);
    assert.equal(d.authority,'Synthetic owner-policy replay');assert.equal(d.approved,true);
    const event=m.events.find(e=>e.outputs.includes(d.id));assert.ok(event.inputs.includes(review.id));
    assert.ok(recordsOf(m,'Receiving').some(x=>x.approvalId===d.id&&x.purchaseId===d.purchaseId));
  }
  const interactive=simulateCurrentPeriod({...seedModel,humanReview:true});
  const first=pendingRequests(interactive)[0];assert.ok(first);
  assert.ok(!recordsOf(interactive,'Receiving').some(r=>r.purchaseId===first.purchaseId));
  const clicked=decide(interactive,first.decisionKey,'approved');
  assert.equal(recordsOf(clicked,'Approval record').find(r=>r.reviewId===first.id).authority,'Builder visitor');
});
test('an exhausted weekly envelope declines and records the shortfall, including in the decision workspace',()=>{
  const config={...seedModel,weeklyPurchaseCeilingCents:60000};
  const m=simulateCurrentPeriod(config);
  const declines=recordsOf(m,'Approval record').filter(r=>r.reason==='Weekly purchasing budget exceeded');
  assert.ok(declines.length);
  for (const d of declines){
    assert.ok(d.cents>d.remainingBudgetCents);assert.equal(d.approved,false);assert.ok(m.records[d.reviewId]);
    assert.ok(!recordsOf(m,'Receiving').some(r=>r.purchaseId===d.purchaseId));
  }
  const interactive=simulateCurrentPeriod({...config,humanReview:true});
  assert.throws(()=>decide(interactive,pendingRequests(interactive)[0].decisionKey,'approved'),/budget/);
});
test('edition six is deterministic, closes daily, reconciles attribution and preserves the archived ledger',()=>{
  const m=simulateCurrentPeriod();
  assert.equal(createHash('sha256').update(JSON.stringify(simulateOperatingPeriod({...preset,edition:5}))).digest('hex'),'17564b48024de498f76791571bd719e45fbf953975ad2681cb6f2e9ce7b9c9d5');
  assert.deepEqual(simulateCurrentPeriod(),m);
  for(const n of [2,3,4,5,6,7]){
    const run=simulateCurrentPeriod({...preset,staff:shiftRoster.slice(0,n)});
    assert.equal(run.days.length,29);
    for(const id of run.days)assert.equal(run.records[id].trialBalanceCents,0);
  }
  const trial=compareWeek(m,4,{pricePercent:12,staffCount:2,leadDays:2});
  for(const horizon of [trial.opening,trial.period])for(const [k,v] of Object.entries(horizon.before))
    assert.equal(Object.values(horizon.effects).reduce((n,row)=>n+row[k],0),horizon.after[k]-v);
});
