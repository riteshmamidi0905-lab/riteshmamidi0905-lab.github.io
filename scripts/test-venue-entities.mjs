import assert from 'node:assert/strict';
import test from 'node:test';
import {createBusiness} from '../pavilion/builder-ledger.js';
import {newPlan} from '../pavilion/builder-plan.js';
import {calculate,sourceFor} from '../pavilion/builder-results.js';
import {facilityTerms,referenceMargin} from '../pavilion/stadium-economics.js';

const make=seed=>({...createBusiness(newPlan('stadium')),seed});
function check(result){
  const {operator,vendors,combined,transfers}=result.entities;
  const books=result.operatingModel;
  const add=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
  assert.equal(operator.revenue,operator.admissions+operator.share+operator.fees);
  assert.equal(operator.expense,Object.values(operator.costs).reduce((n,v)=>n+v,0));
  for(const entry of [operator,...vendors,combined]){
    assert.equal(entry.revenue-entry.expense,entry.income);
    assert.ok(entry.sources.every(id=>sourceFor(result,id)));
  }
  assert.equal(add(vendors,'share')+add(vendors,'fees'),transfers);
  assert.equal(combined.revenue,operator.revenue+add(vendors,'revenue')-transfers);
  assert.equal(combined.expense,operator.expense+add(vendors,'expense')-transfers);
  assert.equal(combined.income,operator.income+add(vendors,'income'));
  assert.equal(combined.revenue,result.total.gross);
  assert.equal(combined.income,result.total.income);
  for(const vendor of vendors){
    assert.ok(vendor.sources.every(id=>{const rec=sourceFor(result,id);return (rec.vendor??rec.entity)===vendor.vendor;}));
    assert.equal(vendor.sales-vendor.rebates,vendor.revenue);
    assert.equal(vendor.goods+vendor.wages+vendor.overhead+vendor.share+vendor.fees+vendor.spend,vendor.expense);
  }
  for(const [key,term] of Object.entries(facilityTerms)){
    let expected=0;
    for(const d of books.days){
      const close=books.records[d.close],event=books.records[d.eventId],rec=books.records[close.costId];
      const cost=term.guestsPerWorker?Math.round(Math.ceil((event.attendance||event.forecast)/term.guestsPerWorker)*
        (event.type==='Concert'?term.concertHours:term.gameHours)*term.hourly*(event.attendance?1:0.25)):
        Math.round(term.daily*event.capacity/8200)+event.attendance*(term.perGuest||0);
      assert.equal(rec.costs[key],cost);expected+=cost;
    }
    assert.equal(operator.costs[key],expected);
  }
}
for(const seed of [13,27,41,63,89])test('Reference venue P&Ls reconcile and operator margin is in the planning band, seed '+seed,()=>{
  const r=calculate(make(seed));check(r);const m=r.entities.operator.margin*100;
  assert.ok(m>=referenceMargin.min && m<=referenceMargin.max,String(m));
});
test('Promoted vendors bear their own spend and rebates, including with a reduced vendor mix',()=>{
 const b=make(41);b.values.mix=['BEER','FOOD-A'];b.items=b.items.filter(i=>b.values.mix.includes(i.id));
 b.campaigns=b.items.map((item,i)=>({id:'C-'+(i+1),channel:'venue',item:item.id,vendor:item.id,
   audience:'local',offer:'Home offer '+i,start:3,end:20,budget:28000+10000*i,discount:15}));
 for(const mode of ['normal','fatigue','overload']){
   const r=calculate(b,mode);check(r);
   for(const c of b.campaigns){
     const v=r.entities.vendors.find(v=>v.vendor===c.vendor);assert.equal(v.spend,c.budget);assert.ok(v.rebates>0);
     const rec=sourceFor(r,'B-EFFECT-'+c.id);assert.ok(rec.sources.every(id=>sourceFor(r,id)));
   }
 }
});
