import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateOperatingPeriod,preset} from '../pavilion/engine.js';
import {weekFigures,compareWeek,attribution} from '../pavilion/week-comparison.js';
import {lightAt,placeTokens,recentEvents} from '../pavilion/floor-staging.js';
import {scheduleDay} from '../pavilion/shift-schedule.js';
const cycle5=(config=preset)=>simulateOperatingPeriod({...config,edition:3});
const standard=cycle5(), change={pricePercent:12,staffCount:2,leadDays:2};
test('the calibrated brewpub has a plausible check, COGS, service volume and working-capital bridge',()=>{
  assert.equal(standard.config.edition,3);
  assert.deepEqual(standard,cycle5({...preset}));
  const t=standard.records.TERMS;
  const check=standard.products.reduce((sum,k,i)=>sum+standard.records[k].priceCents*t.unitsPerHundredCovers[i]/100,0);
  assert.ok(check>=2800&&check<=3600);assert.equal(t.salesTaxBasisPoints,825);assert.equal(t.staffIds.length,5);
  for(let i=1;i<=4;i++){
    const w=weekFigures(standard,i);
    assert.ok(w.numbers.revenue>=1200000&&w.numbers.revenue<=3000000);
    assert.ok(w.meals>=400&&w.meals<=1050);
    assert.ok(w.w.ingredientCostCents/w.w.salesCents>=.24&&w.w.ingredientCostCents/w.w.salesCents<=.33);
    assert.ok(w.numbers.margin>=-1200&&w.numbers.margin<=2800);
    assert.equal(Object.values(w.cashBridge).reduce((s,n)=>s+n,0),w.numbers.cash);
  }
  assert.ok(weekFigures(standard,4).numbers.revenue>weekFigures(standard,1).numbers.revenue);
});
test('each lever is an independent same-seed run and the interaction reconciles all four deltas',()=>{
  for(const week of [1,2,3,4]){
    const result=compareWeek(standard,week,change);
    for(const metric of Object.keys(result.before)){
      const total=Object.values(result.effects).reduce((n,e)=>n+e[metric],0);
      assert.equal(total,result.after[metric]-result.before[metric]);
    }
    const baseline=weekFigures(standard,week);
    for(const [name,config] of Object.entries({price:{pricePercent:12},staff:{staff:['Rowan','Mika']},lead:{leadDays:2}})){
      const standAlone=weekFigures(cycle5({...preset,...config}),week);
      assert.equal(result.effects[name].revenue,standAlone.numbers.revenue-baseline.numbers.revenue);
    }
    assert.deepEqual(result.after,compareWeek(standard,week,change).after);
  }
  const r=compareWeek(standard,1,change);
  assert.ok(r.after.revenue<r.before.revenue&&r.after.cash>r.before.cash);
  assert.match(attribution(r),/lower operating payments/);
  assert.match(attribution(r),/tabindex="0" role="region" aria-label="Weekly lever attribution"/);
  const noChange=compareWeek(standard,1,{pricePercent:0,staffCount:5,leadDays:0});
  assert.deepEqual(noChange.before,noChange.after);
});
test('daily journals and ingredient movements independently reconstruct the calibrated closes',()=>{
  for(const config of [{}, {budget:500,leadDays:3,staff:['Ada']},{pricePercent:100,seed:879,leadDays:5},{humanReview:true}]){
    const m=cycle5({...preset,...config}),totals={},stock={};
    for(const day of m.days){
      const d=m.records[day];
      for(const id of d.journalIds){const j=m.records[id];assert.ok(m.records[j.source]);totals[j.debit]=(totals[j.debit]||0)+j.cents;totals[j.credit]=(totals[j.credit]||0)-j.cents;}
      for(const id of d.movementIds){const x=m.records[id];stock[x.materialId]=(stock[x.materialId]||0)+x.units;}
      for(const [k,val] of Object.entries(d.accounts))assert.equal(totals[k]||0,val);
      assert.deepEqual(stock,d.closingStock);assert.ok(Object.values(stock).every(x=>x>=0));assert.equal(d.trialBalanceCents,0);
    }
  }
});
test('shared-aisle markers separate at converging stations and lighting/shift wire use the simulated beat',()=>{
 const incoming=[{name:'resident',x:80,y:60},...Array.from({length:11},(_,i)=>({name:'agent'+i,x:80+(i%3),y:60,direction:i%2?1:-1}))];
 const laid=placeTokens(incoming,46);
 for(const [name,[x,y]] of laid)for(const [other,[a,b]] of laid)if(name!==other)assert.ok(Math.abs(x-a)>=46||Math.abs(y-b)>=46);
 assert.deepEqual(laid.get('resident'),[80,60]);
 assert.deepEqual([0,4,7,9].map(n=>lightAt(n,11)),['Morning','Midday','Dusk','Night']);
 const schedule=scheduleDay(standard,1),events=standard.events.filter(e=>e.day===1);
 const busy=schedule.find(s=>s.batch.length>=3); assert.ok(busy);
 const wire=recentEvents(events,busy.minute);assert.equal(wire.length,5);
 assert.ok(wire.every(e=>events.includes(e)&&e.startMinute<=busy.minute));
});
