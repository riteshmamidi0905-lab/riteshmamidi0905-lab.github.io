import test from 'node:test';
import assert from 'node:assert/strict';
import {preset} from '../pavilion/engine.js';
import {branchState,encodeBranch,decodeBranch,compareBranch,replayIndex,frameAt,availableReviews} from '../pavilion/branch-ledger.js';
const config={...preset,edition:6};
for(const [lever,value] of [['price',12],['lead',2],['staff',2],['purchase',0]])test(lever+' fork preserves the prefix, shares the complete scenario and reconciles',()=>{
 const state=branchState(config,3,20,lever,value),{original,alternate}=compareBranch(state);
 assert.deepEqual(decodeBranch(encodeBranch(state)),state);
 assert.deepEqual(compareBranch(decodeBranch(encodeBranch(state))).alternate,alternate);
 const before=m=>m.events.filter(e=>e.day<state.day||e.day===state.day&&e.startMinute<=state.minute);
 // Independent tasks can run in parallel at the fork. Match by event and exact source output.
 for(const e of before(original)){const other=before(alternate).find(x=>x.id===e.id);assert.deepEqual(other,e);for(const id of e.outputs)assert.deepEqual(alternate.records[id],original.records[id]);}
 for(const m of [original,alternate]){const idx=replayIndex(m);m.days.forEach((id,day)=>{assert.equal(m.records[id].trialBalanceCents,0);assert.equal(frameAt(idx,day,9999).cash,m.records[id].accounts.cash,'day '+day);});}
 assert.notEqual(alternate.records[alternate.days.at(-1)].accounts.cash,original.records[original.days.at(-1)].accounts.cash);
 if(lever==='purchase'){
   const q=availableReviews(alternate,3,999)[0];assert.ok(q);
   for(const choice of ['approved','rejected']){const s={...state,choices:[[q.decisionKey,choice]]},after=compareBranch(s).alternate;
     assert.ok(Object.values(after.records).some(r=>r.kind==='Approval record'&&r.decisionKey===q.decisionKey&&r.approved===(choice==='approved')&&r.authority==='Builder visitor'));
     assert.equal(availableReviews(after,3,999).some(r=>r.decisionKey===q.decisionKey),false);
   }
 }
});
test('Reject malformed shared state and an unrecorded moment',()=>{assert.throws(()=>decodeBranch('branch=no'));assert.throws(()=>compareBranch(branchState(config,2,9000)));});
