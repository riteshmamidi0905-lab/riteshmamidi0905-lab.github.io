import test from 'node:test';
import assert from 'node:assert/strict';
import {booths,phases,simulateStadium,stadiumStress,staffingSweep,recommended} from '../pavilion/stadium-model.js';
import {parseIdea} from '../pavilion/idea-parser.js';
test('The six stand books and the venue reconcile daily, with matching transfer IDs, cash, stock and guests',()=>{
 for(const stress of ['',...Object.keys(stadiumStress)]){
 const m=simulateStadium({stress});assert.deepEqual(simulateStadium({stress}),m);assert.equal(m.days.length,28);
 for(const d of m.days){const op=m.records[d.close],balances=d.closes.map(id=>m.records[id]);assert.equal(op.variance,0);
  for(const r of balances){assert.equal(r.variance,0);const tr=m.records[r.settlementId];
   assert.equal(tr.grossSalesCents,r.intervalIds.reduce((n,id)=>n+m.records[id].revenueCents,0));
   for(const [acct,cents] of [['share',tr.shareCents],['fees',tr.boothFeeCents]]){
    assert.equal(r.postings.filter(p=>p.debit===acct&&p.source===tr.id).reduce((n,p)=>n+p.cents,0),cents);
    assert.equal(op.postings.filter(p=>p.credit===acct&&p.source===tr.id).reduce((n,p)=>n+p.cents,0),cents);
   }
   let demand=0;for(const id of r.intervalIds){const p=m.records[id];assert.equal(p.arrivals+p.queueIn,p.served+p.queueOut+p.walkaways);demand+=p.arrivals;}
   assert.equal(demand,r.served+r.walkaways);
  }
  assert.equal(op.sharesCents,balances.reduce((n,r)=>n+m.records[r.settlementId].shareCents,0));assert.equal(m.records[d.audit].feeVarianceCents,0);
 }
 for(const e of m.events)for(const id of [...e.inputs,...e.outputs])assert.ok(m.records[id]);
 if(stress==='rain')assert.equal(m.records['D13-EVENT'].attendance,0);
 if(stress==='sellout')assert.equal(m.records['D20-EVENT'].attendance,8200);
 if(stress==='halftime')assert.equal(m.records['D20-FOOD-A-HALF'].onDuty,recommended['FOOD-A']-1);
 if(stress==='delay')assert.equal(m.records['D20-FOOD-A-SUPPLY'].delivered,0);
 if(stress==='cap')assert.equal(m.records['D20-MERCH-PRE'].unitPriceCents,700);
 }
});
test('Vendor staffing has interior optima, increasing service and decreasing walkaways across five seeds',()=>{
 for(const seed of [13,27,41,63,89])for(const sweep of staffingSweep(seed)){
  assert.ok(sweep.best.positions>1&&sweep.best.positions<10);assert.ok(sweep.best.income>0);
  sweep.rows.slice(1).forEach((v,i)=>{assert.ok(v.served>=sweep.rows[i].served);assert.ok(v.walkaways<=sweep.rows[i].walkaways);});
  if(seed===27)assert.equal(recommended[sweep.id],sweep.best.positions);
 }
 const m=simulateStadium();assert.ok(m.records[m.days[27].close].incomeCents>0);
});
test('Venue parser recognizes 36 pitches and asks for every unspecified vendor mix',()=>{
 const locations=['a baseball stadium','a basketball arena','a community ballpark','an event venue','a concession operation','a vendor business'];
 const pitches=[['I want LOCATION',[]],['Open LOCATION with two food stands',['FOOD-A','FOOD-B']],['Build LOCATION with a craft beer cart and merch booth',['BEER','MERCH']],['Plan LOCATION with a coffee kiosk and local snack vendor',['SNACK','COFFEE']],['Manage LOCATION with a taco stand',['FOOD-B']],['Start LOCATION for the next season',[]]];
 let n=0;for(const location of locations)for(const [input,expected] of pitches){const d=parseIdea(input.replace('LOCATION',location));assert.equal(d.values.type,'stadium');assert.deepEqual(d.values.mix,expected);assert.equal(Boolean(d.questions.mix),!expected.length);n++;}assert.equal(n,36);
});
