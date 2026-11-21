import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCurrentPeriod} from '../pavilion/engine.js';
import {askFloor} from '../pavilion/floor-questions.js';

const model=simulateCurrentPeriod(),cases=[];
function add(q,intent,expected){cases.push({q,intent,expected});}
for(const [day,id] of [[7,'D7-393'],[9,'D9-505'],[11,'D11-618']])for(const q of [
 'Explain cash on day N','Why did the bank balance drop on day N?','Cashflow, day #N','Day N: where did the cash go?',
 'Trace receipts and cash payments for day N','What changed the cash balance on day N?'])add(q.replace(/N/g,day),'cash',[id]);
for(const [threshold,ids] of [[900,['D19-1032']],[750,['D19-1032','D26-1431']],[740,['D19-1032','D26-1431','D13-691']]])for(const q of [
 'Show every purchase over $N','Find orders above N dollars','Procurement greater than $N.00','Which proposals were more than N?',
 'List POs higher than $N','Show purchases exceeding $N'])add(q.replace('N',threshold),'purchases',ids);
for(const [who,id] of [['VECTRA','D3-116'],['ZYBREW','D3-132'],['AEGIS','D3-118'],['ECHON','D3-155'],['SYNAPSE','D3-111']])for(const q of [
 'What did X do on day 3?','Day #3, trace X please','Show X activity on the 3rd day','Inspect the records for X on day 3'])add(q.replace('X',who),'agent',[id]);
for(const a of ['most','highest','peak','worst','largest','greatest','biggest','maximum'])for(const b of ['walkouts','walkaways'])add('Which day had the '+a+' '+b+'?','walkouts',['D27-1472']);
for(const q of ['Follow a stock shortage','Trace the first shortage','Track a shortfall','Show low stock','Find the first stockout','Where did we run out of stock?','Show the first shortage on day 2','Follow a shortage on day #2','Show a stock shortfall please','First shortage in stock','Find a material shortage','Follow the first shortage please'])add(q,'shortage',['D2-061']);
for(const q of ['Follow the malt shortage','Trace a malt shortage','Show the malt shortfall','Find low stock of malt'])add(q,'shortage',['MAT-1','MAT-2','MAT-3']);
for(const q of ['Write a poem','Cash on day 99','Tell me the weather','Who won the game?'])add(q,'unknown',[]);
test('Ledger questions classify and cite independently pinned records on the released opening scenario',()=>{
 const counts={};for(const {q,intent,expected} of cases){
   const answer=askFloor(model,q);assert.equal(answer.intent,intent,q);
   for(const id of expected)assert.ok(answer.ids.includes(id),q+' missing '+id);
   for(const id of answer.ids)assert.ok(Object.hasOwn(model.records,id),q+' invalid '+id);
   for(const stop of answer.flight)assert.ok(model.events.some(e=>e.id===stop.event&&e.day===stop.day&&e.owner===stop.agent&&e.outputs.some(id=>answer.ids.includes(id))));
   counts[intent]=(counts[intent]||0)+1;
 }
 assert.ok(cases.length>=80);console.log(JSON.stringify({tested:cases.length,passed:cases.length,byIntent:counts}));
 assert.match(askFloor(model,'cash on day 9').message,/rose by \$1,431\.16/);
 assert.match(askFloor(model,'orders over $900').message,/^0 of /);
 assert.match(askFloor(model,'follow the malt shortage').message,/no matching material/);
});

import {suggestQuestions} from '../pavilion/floor-questions.js';
import {defaults,profiles} from '../pavilion/idea-profiles.js';
import {simulateOperatingPeriod} from '../pavilion/engine.js';
import {simulateStadium} from '../pavilion/stadium-model.js';

test('Every offered question is witnessed by the active ledger on seven templates and five seeds',()=>{
 const stats={},seeds=[13,27,41,63,89];
 for(const type of [...Object.keys(profiles),'stadium']){
  const counts={seeds:[],offered:0,byIntent:{}};
  for(const seed of seeds){
   const venue=type==='stadium';
   const idea=venue?null:defaults(type);
   const model=venue?simulateStadium({seed}):simulateOperatingPeriod({
    template:type,edition:7,name:idea.concept,location:'Austin',size:'Studio',budget:idea.budget,
    seed,idea,positions:idea.staff,shocks:[]
   });
   assert.equal(venue?model.seed:model.config.seed,seed);
   counts.seeds.push(seed);
   const rows=Object.values(model.records);
   const moves=Array.from({length:28},(_,i)=>{
    if(venue){
     const r=model.records[model.days[i].close];return r.closingCash-r.openingCash;
    }
    return model.records[model.days[i+1]].accounts.cash-model.records[model.days[i]].accounts.cash;
   });
   // Challenge each independent ledger with the opposite of an observed movement.
   const observed=moves.findIndex(move=>move!==0);
   const wrong=moves[observed]>0?'drop':'rise';
   const correction=askFloor(model,'Why did cash '+wrong+' on day '+(observed+1)+'?');
   assert.ok(correction.message.startsWith((venue?'Venue cash':'Cash')+" didn't "+wrong));
   assert.ok(correction.ids.includes(venue?model.days[observed].close:model.days[observed+1]));
   for(const day of [1,3,9,20,28]){
    const questions=suggestQuestions(model,day);
    assert.deepEqual(questions,suggestQuestions(model,day));
    assert.equal(new Set(questions).size,questions.length);
    const intents=[];
    for(const q of questions){
     const answer=askFloor(model,q,day);
     assert.ok(answer.ids.length>0,q);
     answer.ids.forEach(id=>assert.ok(model.records[id],q+' cites missing '+id));
     assert.ok(answer.flight.length>0,q);
     answer.flight.forEach(stop=>assert.ok(model.events.some(e=>e.id===stop.event&&e.owner===stop.agent&&e.day===stop.day&&e.outputs.some(id=>answer.ids.includes(id))),q));
     const dayInText=Number(q.match(/day (\d+)/i)?.[1]);
     switch(answer.intent){
      case 'cash': {
       const move=moves[dayInText-1];
       assert.equal(move,Math.min(...moves));
       if(q.includes('drop'))assert.ok(move<0,q);
       else if(q.includes('rise'))assert.ok(move>0,q);
       else assert.equal(move,0,q);
       assert.ok(answer.ids.includes(venue?model.days[dayInText-1].close:model.days[dayInText]));
       break;
      }
      case 'agent':{
       const agent=q.match(/What did ([A-Z]+) do/)[1];
       assert.ok(model.events.some(e=>e.owner===agent&&e.day===dayInText&&e.outputs.some(id=>answer.ids.includes(id))),q);
       break;
      }
      case 'purchases':{
       const cents=Math.round(Number(q.match(/over \$([\d,.]+)/)[1].replaceAll(',',''))*100);
       const expected=rows.filter(r=>r.kind==='Purchase proposal'&&r.cents>cents).map(r=>r.id);
       assert.ok(expected.length);assert.deepEqual(new Set(answer.ids),new Set(expected));break;
      }
      case 'walkouts': {
       const daily=venue?model.days.map(d=>({day:d.day,n:d.closes.reduce((v,id)=>v+model.records[id].walkaways,0),ids:d.closes})):
        model.events.filter(e=>e.action==='Forecast demand'&&e.day>0).map(e=>({day:e.day,n:model.records[e.outputs[0]].walkouts,ids:e.outputs}));
       const peak=Math.max(...daily.map(d=>d.n));assert.ok(peak>0);
       const ids=daily.filter(d=>d.n===peak).flatMap(d=>d.ids);
       assert.deepEqual(new Set(answer.ids),new Set(ids));break;
      }
      case 'shortage':
       assert.ok(model.events.some(e=>e.day===dayInText&&e.outputs.some(id=>{
        const r=model.records[id];
        return answer.ids.includes(id)&&r.kind==='Availability check'&&Object.keys(r.shortage).some(m=>r.required[m]>r.available[m]);
       })),q);break;
      default:assert.fail('Unrecognized chip '+q);
     }
     intents.push(answer.intent);counts.byIntent[answer.intent]=(counts.byIntent[answer.intent]||0)+1;counts.offered++;
    }
    assert.ok(intents.includes('cash')&&intents.includes('agent'),type+' must offer meaningful questions');
   }
  }
  stats[type]=counts;
 }
 assert.equal(Object.keys(stats).length,7);
 console.log(JSON.stringify({suggestionMatrix:stats}));
});

test('Typed false premises are explicitly corrected and cited; neutral and true questions are answered directly',()=>{
 const closes=model.days.map(id=>model.records[id]),moves=closes.map((r,i)=>i?r.accounts.cash-closes[i-1].accounts.cash:0);
 const down=moves.findIndex((n,i)=>i>0&&n<0),up=9;
 assert.ok(down>0);assert.equal(moves[up],143116);
 const corrections=[];
 const alternate=[
  ['Why did cash drop on day 9?',up,'drop'],['Why was there a cash decline on day 9?',up,'drop'],
  ['Did the bank balance fall on the 9th day?',up,'drop'],['Where did cash go down on day #9?',up,'drop'],
  ['Cash decreased on day 9?',up,'drop'],['Explain the cashflow drop on day 9',up,'drop'],
  ['Why did cash rise on day '+down+'?',down,'rise'],['Did cash increase on day '+down+'?',down,'rise'],
  ['Why did the bank balance grow on day '+down+'?',down,'rise'],['Explain the cash gain on day '+down,down,'rise'],
  ['Cash went up on day '+down+'?',down,'rise'],['Did cash go up on the '+down+'th day?',down,'rise']
 ];
 for(const [question,day,premise] of alternate){
  const result=askFloor(model,question),movement=day===up?'rose':'fell';
  const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Math.abs(moves[day])/100);
  assert.ok(result.message.startsWith("Cash didn't "+premise+' on day '+day+' — it '+movement+' by '+amount+'.'),question);
  for(const close of [closes[day],closes[day-1]])assert.ok(result.ids.includes(close.id));
  corrections.push(question);
 }
 const denied=[["Why didn't cash rise on day 9?",up,'rise'],['Why did cash not drop on day '+down+'?',down,'drop']];
 for(const [q,day,direction] of denied){
  const result=askFloor(model,q);
  assert.ok(result.message.startsWith('Cash did '+direction+' on day '+day+' — it '));
  assert.ok(result.ids.includes(closes[day].id));
 }
 const flatClaim=askFloor(model,'Why was cash flat on day 9?');
 assert.match(flatClaim.message,/^Cash didn't stay flat on day 9 — it rose by \$1,431\.16/);
 assert.ok(flatClaim.ids.includes(closes[9].id));
 const noChange=askFloor(model,"Why didn't the balance change on day 9?");
 assert.match(noChange.message,/^Cash did change on day 9 — it rose by \$1,431\.16/);
 assert.ok(noChange.ids.includes(closes[9].id));
 const flat={records:{OPEN:{id:'OPEN',accounts:{cash:20000},journalIds:[]},CLOSE:{id:'CLOSE',accounts:{cash:20000},journalIds:[]}},days:['OPEN','CLOSE'],events:[],ingredients:[]};
 for(const direction of ['rise','drop']){
  const r=askFloor(flat,'Why did cash '+direction+' on day 1?');
  assert.ok(r.message.startsWith("Cash didn't "+direction+' on day 1 — it stayed at $200.00.'));assert.deepEqual(r.ids,['OPEN','CLOSE']);
 }
 assert.equal(suggestQuestions(flat)[0],'What happened to cash on day 1?');
 assert.match(askFloor(model,'Cash on day 0?').message,/opening cash.*no preceding daily close/);
 for(const q of ['Cash on day 9?','Why did cash rise on day 9?'])assert.match(askFloor(model,q).message,/^Cash rose by \$1,431\.16 on day 9/);
 const peak=askFloor(model,'Which day had the most walkouts?');
 const wrong=askFloor(model,'Why were walkouts highest on day 1?');
 assert.match(wrong.message,/Walkouts didn.t peak on day 1/);assert.ok(peak.ids.every(id=>wrong.ids.includes(id)));
 const v=simulateStadium();const silent=askFloor(v,'What did ZYBREW do on day 3?');
 assert.match(silent.message,/ZYBREW had no recorded tasks on day 3/);assert.ok(silent.ids.includes(v.days[2].close));
 const missing=askFloor(model,'Follow the malt shortage');assert.ok(missing.ids.length);assert.match(missing.message,/no matching material/);
 console.log(JSON.stringify({falseCashQuestions:corrections.length+denied.length+2,unchangedCashCases:2,additionalCorrections:['incorrect walkout peak','idle specialist','unregistered material']}));
});
