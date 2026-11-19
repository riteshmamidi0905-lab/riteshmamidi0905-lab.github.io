import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {simulateOperatingPeriod,preset} from '../pavilion/engine.js';
import {compareWeek,staffingSweep,periodFigures,mealBridge} from '../pavilion/week-comparison.js';
import {baselinePositions,serviceQueue,serviceRating} from '../pavilion/brewpub.js';
const simulateCurrentPeriod=(config=preset)=>simulateOperatingPeriod({...config,edition:5});
const model=simulateCurrentPeriod(),sweep=staffingSweep(model);
const cut=compareWeek(model,4,{pricePercent:0,staffCount:2,leadDays:0});
test('the standard roster is the unique interior income maximum in the independently closed staffing sweep',()=>{
 assert.deepEqual(sweep.map(s=>s.positions),[2,3,4,5,6,7]);const best=sweep.reduce((a,b)=>a.income>b.income?a:b);
 assert.ok(best.positions>2&&best.positions<7);assert.equal(best.positions,baselinePositions);assert.equal(model.records.TERMS.staffIds.length,best.positions);
 assert.equal(best.income,periodFigures(model,4).numbers.income);assert.ok(sweep.every(x=>x===best||x.income<best.income));
 assert.ok(cut.period.after.income<cut.period.before.income);assert.ok(cut.period.last.periods.every((p,i)=>p.meals<cut.period.first.periods[i].meals));
});
test('the archived v4 ledger replays byte-for-byte and the current run is deterministic',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(simulateOperatingPeriod({...preset,edition:4}))).digest('hex'),'08b302d56794363c1431a2119a54a7371d377ccccfd6d3d536772e1bcfbfdcb8');
 assert.deepEqual(simulateCurrentPeriod(),model);
});
test('waits drive walkouts; weekly ratings reference prior fulfillment and reduce only new prospects',()=>{
 assert.equal(serviceQueue(30,4,1).walkouts,0);assert.ok(serviceQueue(130,2,1).walkouts>serviceQueue(130,4,1).walkouts);
 const m=cut.variant;
 for(const id of m.weeks){const w=m.records[id],q=w.serviceQuality;assert.equal(q.fulfillmentIds.length,7);assert.deepEqual(q,serviceRating(q.fulfillmentIds.map(k=>m.records[k])));for(const k of q.fulfillmentIds)assert.ok(m.events.find(e=>e.outputs.includes(id)).inputs.includes(k));}
 for(const day of Array.from({length:28},(_,i)=>i+1)){const events=m.events.filter(e=>e.day===day),f=m.records[events.find(e=>e.action==='Forecast demand').outputs[0]],s=m.records[events.find(e=>e.action==='Check fulfillment against plan').outputs[0]];
 assert.equal(s.forecastId,f.id);assert.equal(s.unservedCovers,s.walkouts+s.capacityRefusals+s.stockoutCovers);assert.equal(f.potentialCovers,f.expectedCovers-f.reputationCovers-f.lostGuestCovers);
 assert.ok(f.lostGuestCovers<=f.expectedCovers-f.newProspects);assert.equal(f.ratingSourceId,day<=7?null:m.weeks[Math.floor((day-1)/7)-1]);if(day>7)assert.ok(f.reputationCovers>0);
 }
});
test('every daily trial balance and weekly cash bridge closes at every roster; each lever reconciles',()=>{
 for(const row of sweep){const run=simulateCurrentPeriod({...preset,staff:['Rowan','Mika','Sol','Ari','Lou','Ash','Lee'].slice(0,row.positions)}),p=periodFigures(run,4);assert.equal(p.numbers.income,row.income);
 for(const {w} of p.periods){assert.equal(w.trialBalanceCents,0);for(const id of w.dailyCloseIds)assert.equal(run.records[id].trialBalanceCents,0);}}
 const trial=compareWeek(model,4,{pricePercent:12,staffCount:2,leadDays:2});
 for(const horizon of [trial.opening,trial.period])for(const [k,v] of Object.entries(horizon.before)){assert.equal(Object.values(horizon.effects).reduce((sum,e)=>sum+e[k],0),horizon.after[k]-v);}
});

import {floorOrder,aislePath,point,nameplates} from '../pavilion/iso-geometry.js';
test('every transfer lane clears all twelve plates including the longest rotating packet trail',()=>{
 const pointDist=([x,y],[a,b],[c,d])=>{const dx=c-a,dy=d-b;
  const f=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a-f*dx,y-b-f*dy);};
 // Endpoint-to-box and corner-to-segment distances plus segment intersection cover the whole polyline.
 for(const a of floorOrder)for(const b of floorOrder){const pts=aislePath(a,b).map(p=>point(...p));
 for(let i=1;i<pts.length;i++){const [s,e]=pts.slice(i-1,i+1);for(const box of nameplates){
 const {left:l,right:r,top:t,bottom:d}=box,corners=[[l,t],[r,t],[r,d],[l,d]];
 const toBox=([x,y])=>Math.hypot(Math.max(l-x,0,x-r),Math.max(t-y,0,y-d));
 const [dx,dy]=[e[0]-s[0],e[1]-s[1]];
 const cut=(origin,delta,min,max)=>delta?[(min-origin)/delta,(max-origin)/delta].sort((a,b)=>a-b):origin>=min&&origin<=max?[-Infinity,Infinity]:[Infinity,-Infinity];
 const x=cut(s[0],dx,l,r),y=cut(s[1],dy,t,d);
 assert.ok(Math.max(0,x[0],y[0])>Math.min(1,x[1],y[1]));
 const distance=Math.min(toBox(s),toBox(e),...corners.map(c=>pointDist(c,s,e)));
 assert.ok(distance>17.5+6.8+6+3,'Full trail, stroke, five lane offsets and three units of clearance');
 }}}
});

test('unexpected upward weekly meal changes resolve to signed components and paired source IDs',()=>{
 const variant=compareWeek(model,2,{pricePercent:0,staffCount:5,leadDays:0});
 const b=mealBridge(model,variant.variant,2);assert.equal(b.change,19);assert.equal(Object.values(b.effects).reduce((x,y)=>x+y,0),b.change);
 for(const row of b.rows){assert.equal(model.records[row.baseline.id].forecastId,row.baseline.forecastId);assert.equal(variant.variant.records[row.variant.id].forecastId,row.variant.forecastId);}
});
