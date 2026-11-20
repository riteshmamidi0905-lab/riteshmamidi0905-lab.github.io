import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseIdea,examples} from '../pavilion/idea-parser.js';
import {defaults,fields,profiles,scenarios,validateIdea} from '../pavilion/idea-profiles.js';
import {assess,runIdea,summarize,stressComparison} from '../pavilion/idea-analysis.js';

const corpus=readFileSync(new URL('./business-idea-corpus.jsonl',import.meta.url),'utf8').trim().split('\n').map(line=>JSON.parse(line));
test('independently annotated parser corpus: values, origin labels and explicit questions',()=>{
 assert.ok(corpus.length>=60);assert.equal(examples.length,10);
 for(const {s,e,q=[]} of corpus){
   const parsed=parseIdea(s);
   assert.deepEqual(parsed.values,{...defaults(e.type),...e},s);
   for(const k of Object.keys(fields))assert.equal(parsed.status[k],Object.hasOwn(e,k)?'parsed':'defaulted',s+' / '+k);
   assert.deepEqual(Object.keys(parsed.questions).sort(),[...q].sort(),s);
 }
});
for(const type of Object.keys(profiles)){
 test(type+': reproducible baseline, six shocks, daily reconciliation and source IDs',()=>{
   const idea=defaults(type),base=runIdea(idea);
   const digest=m=>createHash('sha256').update(JSON.stringify(m)).digest('hex');
   assert.equal(digest(base),digest(runIdea(idea)));
   for(const keys of [[],...Object.keys(scenarios).map(k=>[k]),Object.keys(scenarios)]){
     const m=keys.length?runIdea(idea,keys):base;
     assert.equal(m.days.length,29);assert.equal(m.weeks.length,4);
     const totals={};for(const id of m.days){
       const close=m.records[id];assert.equal(close.trialBalanceCents,0);
       for(const j of close.journalIds){const p=m.records[j];assert.ok(m.records[p.source]);totals[p.debit]=(totals[p.debit]||0)+p.cents;totals[p.credit]=(totals[p.credit]||0)-p.cents;}
       for(const [key,value] of Object.entries(close.accounts))assert.equal(totals[key]||0,value);
       assert.equal(close.inventoryValueCents,close.accounts.stock);
     }
     assert.ok(m.events.every(e=>[...e.inputs,...e.outputs].every(id=>m.records[id].scenario===m.scenario)));
     const figures=summarize(m);assert.equal(figures.weeks.reduce((sum,w)=>sum+w.income,0),m.records[m.days[28]].incomeCents);
     if(type==='salon'){assert.equal(m.records.TERMS.unit,'appointments');assert.ok(m.events.every(e=>e.owner!=='ZYBREW'&&e.owner!=='PYRIX'));}
   }
 });
 test(type+': all levers and interaction sum to exact combined deltas',()=>{
   const idea=defaults(type),assessment=assess(idea);
   assert.equal(assessment.sweep.length,12);
   for(const keys of [['war'],Object.keys(scenarios)]){
     const c=stressComparison(idea,assessment,keys);
     for(const [metric,before] of Object.entries(c.before)){
       if(before===null||c.after[metric]===null)continue;
       assert.equal(Object.values(c.effects).reduce((sum,row)=>sum+row[metric],0),c.after[metric]-before);
     }
   }
 });
 test(type+': added demand serves at least as many customers when labor, inventory and cash allow',()=>{
   const idea={...defaults(type),staff:12,budget:1000000};
   const get=m=>m.events.filter(e=>e.action==='Check fulfillment against plan').map(e=>m.records[e.outputs[0]]);
   const a=get(runIdea(idea)),b=get(runIdea(idea,['viral']));
   for(let i=0;i<28;i++){assert.equal(b[i].stockoutCovers,0);assert.equal(b[i].walkouts,0);assert.equal(b[i].capacityRefusals,0);
     assert.ok(b[i].mealsServed>=a[i].mealsServed);}
   assert.ok(b.slice(7,14).some((v,i)=>v.mealsServed>a[i+7].mealsServed));
 });
}
test('Solo owner absence produces zero appointments and reconciles without dividing by zero',()=>{
 const m=runIdea({...defaults('salon'),staff:1},['shortage']);assert.equal(summarize(m).numbers.meals,0);
 assert.ok(m.days.every(id=>m.records[id].trialBalanceCents===0));
});
test('Configuration validation rejects markup, invalid ranges and unsupported levers',()=>{
 const idea=defaults('coffee');assert.throws(()=>validateIdea({...idea,city:'<Austin>'}));
 assert.throws(()=>runIdea({...idea,staff:55}));assert.throws(()=>runIdea(idea,['unknown']));
 assert.ok(parseIdea('a bakery with 22 staff').questions.staff);
});


for(const type of Object.keys(profiles)){
 test(type+': the Austin default matches a profitable interior optimum with ordered demand and auditable closes',()=>{
   const idea=defaults(type);
   let previous=null,best=null;
   for(let staff=1;staff<=12;staff++){
     const m=runIdea(idea,[],staff), summary=summarize(m);
     const walkouts=m.events.filter(e=>e.action==='Check fulfillment against plan')
       .reduce((total,e)=>total+m.records[e.outputs[0]].walkouts,0);
     const row={staff,served:summary.numbers.meals,income:summary.numbers.income,walkouts};
     assert.ok(m.days.every(id=>{const r=m.records[id];return r.trialBalanceCents===0&&r.accounts.stock===r.inventoryValueCents;}));
     const repeat=runIdea(idea,[],staff);
     assert.deepEqual(m.weeks.map(id=>m.records[id]),repeat.weeks.map(id=>repeat.records[id]));
     if(previous){assert.ok(row.served>=previous.served);assert.ok(row.walkouts<=previous.walkouts);}
     previous=row;if(!best||row.income>best.income)best=row;
   }
   assert.equal(best.staff,idea.staff);assert.ok(best.staff>1&&best.staff<12&&best.income>0);
 });
}

test('workstation captions and idle bays follow source owners across all six formats',async()=>{
  const {taskTitle,unusedStation,stationTitle}=await import('../pavilion/station-context.js');
  const {floorSvg,floorOrder}=await import('../pavilion/iso-geometry.js');
  const registry=floorOrder.map(name=>({name,slug:name.toLowerCase()}));
  for(const type of Object.keys(profiles)){
    const m=runIdea(defaults(type)),signature=JSON.stringify(m.events);
    const svg=floorSvg(registry,m);
    const supply=m.events.find(e=>e.owner==='VECTRA'&&m.records[e.outputs[0]].kind==='Availability check');
    if(type==='brewery'){assert.equal(taskTitle(m,supply),supply.action);assert.ok(svg.includes('fill="url(#copper)"'));}
    else{
      assert.ok(!svg.includes('fill="url(#copper)"'));assert.ok(svg.includes('data-bay="idle"'));
      assert.equal(stationTitle(m,'ZYBREW'),'Production bay');
      const names=m.ingredients.map(id=>m.records[id].name);
      assert.ok(names.some(label=>taskTitle(m,supply).includes(label)));
      for(const who of ['ZYBREW','PYRIX'])assert.equal(unusedStation(m,who),!m.events.some(e=>e.owner===who));
    }
    assert.equal(JSON.stringify(m.events),signature);
  }
});
