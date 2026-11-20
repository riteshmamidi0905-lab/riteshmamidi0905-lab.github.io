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
