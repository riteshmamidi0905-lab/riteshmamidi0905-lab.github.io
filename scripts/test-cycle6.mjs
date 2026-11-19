import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preset,simulateOperatingPeriod} from '../pavilion/engine.js';
import {missingVisits} from '../pavilion/brewpub.js';
import {compareWeek,periodFigures} from '../pavilion/week-comparison.js';

const simulateCurrentPeriod=(config=preset)=>simulateOperatingPeriod({...config,edition:4});
const model=simulateCurrentPeriod(), staff={pricePercent:0,staffCount:2,leadDays:0};
const forecasts=m=>m.events.filter(e=>e.action==='Forecast demand').map(e=>m.records[e.outputs[0]]);
const quality=m=>m.events.filter(e=>e.action==='Check fulfillment against plan').map(e=>m.records[e.outputs[0]]);
test('the archived Cycle 5 ledger keeps its complete digest and current forecasts replay deterministically',()=>{
 const old=simulateOperatingPeriod({...preset,edition:3});
 assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'d376b01028a0b5b4f5279025908838b0a890cabfa1600eb8ccc4eabe64f206da');
 assert.equal(model.config.edition,4);assert.deepEqual(simulateCurrentPeriod(),model);
});
test('a large share of unserved dining covers lowers future demand and expires after three days',()=>{
 const thin=simulateCurrentPeriod({...preset,staff:['Rowan']}), forecast=forecasts(thin), checks=quality(thin);
 assert.ok(checks.some(r=>r.unservedCovers>r.potentialCovers*.5));
 assert.deepEqual(missingVisits(20,50,[50,30,20]),[5,3,2]);assert.deepEqual(missingVisits(0,50,[50,30,20]),[0,0,0]);
 const normal=forecasts(model);
 assert.equal(forecast[0].potentialCovers,normal[0].potentialCovers);
 assert.ok(forecast.some((f,i)=>f.expectedCovers===normal[i].expectedCovers&&f.potentialCovers<normal[i].potentialCovers&&f.lostGuestCovers>0));
 for(const [i,f] of forecast.entries()){
  const q=checks[i],sources=[];
  for(let lag=1;lag<=3&&i>=lag;lag++){
   const prior=checks[i-lag],covers=prior.lostVisitsByLag[lag-1];
   if(covers)sources.push({fulfillmentId:prior.id,covers});
  }
  assert.deepEqual(f.lostGuestSources,[...sources].reverse());
  assert.equal(f.lostGuestCovers,Math.min(f.expectedCovers,sources.reduce((a,x)=>a+x.covers,0)));
  assert.equal(f.potentialCovers,f.expectedCovers-f.lostGuestCovers);assert.ok(f.potentialCovers>=0);
  assert.equal(q.unservedCovers,q.potentialCovers-q.mealsServed);
  assert.equal(q.lostVisitsByLag.reduce((a,b)=>a+b,0),Math.round(q.unservedCovers*.5));
 }
});
test('all four weekly and full-period effects reconcile to independent same-seed runs and posted daily balances',()=>{
 for(const changes of [staff,{pricePercent:12,staffCount:2,leadDays:2},{pricePercent:0,staffCount:5,leadDays:0}]){
  const c=compareWeek(model,1,changes), forecastsAfter=forecasts(c.variant),checks=quality(c.variant);
  for(const [scope,n] of [[c.opening,1],[c.period,4]]){
   assert.deepEqual(scope.after,periodFigures(c.variant,n).numbers);
   const through=7*n,last=c.variant.records[c.variant.days[through]];
   assert.equal(scope.after.cash,last.accounts.cash);assert.equal(scope.after.income,last.incomeCents);
   assert.equal(scope.after.revenue,-last.accounts.sales-last.accounts.refunds);
   assert.equal(scope.after.lost,forecastsAfter.slice(0,through).reduce((s,r)=>s+r.lostGuestCovers,0));
   assert.equal(scope.after.unserved,checks.slice(0,through).reduce((s,r)=>s+r.unservedCovers,0));
   assert.equal(Object.values(scope.last.cashBridge).reduce((s,v)=>s+v,0),scope.after.cash);
   for(const metric of Object.keys(scope.before))assert.equal(Object.values(scope.effects).reduce((s,v)=>s+v[metric],0),scope.after[metric]-scope.before[metric]);
   for(const [name,settings] of Object.entries({price:{pricePercent:changes.pricePercent},staff:{staff:c.variant.config.staff},lead:{leadDays:changes.leadDays}})){
    const one=periodFigures(simulateCurrentPeriod({...preset,...settings}),n);
    assert.equal(scope.effects[name].revenue,one.numbers.revenue-scope.before.revenue);
    assert.equal(scope.effects[name].lost,one.numbers.lost-scope.before.lost);
   }
  }
  const totals={},stock={};
  for(const closeId of c.variant.days){
   const d=c.variant.records[closeId];
   for(const id of d.journalIds){const j=c.variant.records[id];assert.ok(c.variant.records[j.source]);totals[j.debit]=(totals[j.debit]||0)+j.cents;totals[j.credit]=(totals[j.credit]||0)-j.cents;}
   for(const id of d.movementIds){const m=c.variant.records[id];stock[m.materialId]=(stock[m.materialId]||0)+m.units;}
   for(const [k,val] of Object.entries(d.accounts))assert.equal(totals[k]||0,val);
   assert.deepEqual(stock,d.closingStock);assert.equal(d.trialBalanceCents,0);
  }
 }
 const cut=compareWeek(model,1,staff).period;
 assert.ok(cut.after.lost>cut.before.lost&&cut.after.meals<cut.before.meals&&cut.after.revenue<cut.before.revenue);
});