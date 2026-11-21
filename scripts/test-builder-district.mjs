import test from 'node:test';
import assert from 'node:assert/strict';
import {createBusiness} from '../pavilion/builder-ledger.js';
import {newPlan} from '../pavilion/builder-plan.js';
import {calculate,sourceFor} from '../pavilion/builder-results.js';
import {activePromotions} from '../pavilion/builder-promotions.js';
import {askFloor,suggestQuestions} from '../pavilion/floor-questions.js';
import {replayForEntry} from '../pavilion/builder-replay.js';

for(const type of ['stadium','coffee']){
 test(type+' promotions cite the correct workspace, cash basis and four-week comparison',()=>{
  const business=createBusiness(newPlan(type));
  const stadium=type==='stadium', item=business.items[0].id;
  const campaign={id:'C-1',offer:'Game-day combo',start:1,end:21,budget:30000,discount:15,item,
    channel:stadium?'venue':'social',audience:'local',...(stadium?{vendor:item}:{})};
  business.campaigns=[campaign,{...campaign,id:'C-2',offer:'Weekend special',start:3,discount:8}];
  const {model,result}=replayForEntry({id:'unit-workspace',business});
  const full=result.total.income;
  for(const offer of business.campaigns){
   const without=calculate({...business,campaigns:business.campaigns.filter(c=>c.id!==offer.id)});
   const answer=askFloor(model,'What did the '+offer.offer+' earn?');
   assert.equal(answer.intent,'campaign');assert.deepEqual(answer.ids,['B-EFFECT-'+offer.id]);
   const row=sourceFor(result,answer.ids[0]);
   assert.equal(row.netCents,full-without.total.income);
   assert.equal(row.withoutIncomeCents,without.total.income);
   const side=sourceFor(result,row.sources[1]);
   assert.equal(side.income,without.total.income);
   for(const week of side.sources)for(const day of sourceFor(result,week).sources)
    assert.ok(sourceFor(result,day),day);
   assert.ok(row.sources.every(id=>sourceFor(result,id)));
  }
  const rank=askFloor(model,'Which promotion paid off?');
  assert.equal(rank.ids.length,2);assert.ok(rank.ids.every(id=>sourceFor(result,id)));
  assert.ok(suggestQuestions(model,3).includes('Compare recorded promotions'));
  assert.equal(activePromotions(business,result,1).length,stadium?0:1);
  assert.equal(activePromotions(business,result,3).length,2);
  assert.equal(activePromotions(business,result,22).length,0);
  assert.equal(askFloor(model,'What did the missing combo earn?').ids.length,0);
  assert.equal(askFloor(result.operatingModel,'Which promotion paid off?').ids.length,0);
  const aliases={...business,campaigns:business.campaigns.map(c=>({...c,offer:'Same offer'}))};
  const duplicate=replayForEntry({id:'other-workspace',business:aliases});
  assert.match(askFloor(duplicate.model,'What did Same offer earn?').message,/campaign ID/);
  assert.deepEqual(askFloor(duplicate.model,'What did Same offer (C-2) earn?').ids,['B-EFFECT-C-2']);
 });
}
