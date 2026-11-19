import {simulateOperatingPeriod} from './engine.js';
import {brewpub} from './brewpub.js';
import {defaultStaff} from './business-settings.js';
export const measures={revenue:'Net revenue',margin:'Net margin',shortages:'Unfilled items',cash:'Closing cash'};
const labels={price:'Price',staff:'Staffing',lead:'Supplier lead time',interaction:'Interaction'};
export const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
export function weekFigures(model,week){
  const w=model.records[model.weeks[week-1]], net=w.salesCents-w.refundCents;
  const closes=w.dailyCloseIds.map(id=>model.records[id]);
  const journals=closes.flatMap(d=>d.journalIds.map(id=>model.records[id]));
  const fulfillment=model.events.filter(e=>e.day>=w.from&&e.day<=w.through&&e.action==='Check fulfillment against plan').map(e=>model.records[e.outputs[0]]);
  const inventoryPaid=journals.filter(j=>j.debit==='stock'&&j.credit==='cash').reduce((n,j)=>n+j.cents,0);
  const cashBridge={opening:w.openingCashCents,revenue:net,tax:w.taxCollectedCents-w.taxRefundedCents-w.taxRemittedCents,stock:-inventoryPaid,operating:-w.operatingCostsPaidCents};
  if(Object.values(cashBridge).reduce((a,b)=>a+b,0)!==w.closingCashCents)throw Error('Cash movement must reconcile to the seven source closes.');
  return {numbers:{revenue:net,margin:net?Math.round(10000*w.netIncomeCents/net):null,shortages:fulfillment.reduce((n,r)=>n+r.unfilledUnits,0),cash:w.closingCashCents},
    cashBridge,meals:fulfillment.reduce((n,r)=>n+(r.mealsServed||0),0),capacityLoss:fulfillment.reduce((n,r)=>n+(r.potentialCovers||0)-(r.staffedCovers||0),0),w};
}
export function compareWeek(model,week,change){
  if(!Number.isInteger(week)||week<1||week>4)throw Error('Choose a week from 1 to 4.');
  if(!Number.isInteger(change.staffCount)||change.staffCount<1||change.staffCount>5)throw Error('Choose 1–5 staff.');
  const {decisions,humanReview,...original}=model.config;
  const staff=original.staff|| (original.edition===3?brewpub.crew:defaultStaff);
  const names=[...new Set([...staff,...brewpub.crew,'Ash','Lee'])].slice(0,change.staffCount);
  const price={pricePercent:change.pricePercent}, roster={staff:names}, lead={leadDays:change.leadDays};
  const run=changes=>simulateOperatingPeriod({...original,...changes});
  const base=run({}), variant=run({...price,...roster,...lead}), first=weekFigures(base,week),last=weekFigures(variant,week);
  const singles={price:weekFigures(run(price),week),staff:weekFigures(run(roster),week),lead:weekFigures(run(lead),week)};
  const effect=(x,y)=>x===null||y===null?null:x-y;
  const effects={};for(const [k,s] of Object.entries(singles))effects[k]=Object.fromEntries(Object.keys(measures).map(m=>[m,effect(s.numbers[m],first.numbers[m])]));
  effects.interaction={};
  for(const m of Object.keys(measures)){
    const individual=Object.values(singles).map(s=>effect(s.numbers[m],first.numbers[m]));
    const total=effect(last.numbers[m],first.numbers[m]);
    effects.interaction[m]=total===null||individual.includes(null)?null:total-individual.reduce((a,b)=>a+b,0);
  }
  const pct=change.pricePercent, from=original.pricePercent||0;
  const reasons={
    price:'The menu adjustment changes from '+from+'% to '+pct+'%.'+(original.edition===3?' Demand responds by 0.45% per percentage point.':' This archived scenario holds requested units fixed.'),
    staff:names.length+' staffed positions versus '+staff.length+'. '+(original.edition===3?singles.staff.capacityLoss+' potential covers exceed staffed capacity. ':'')+'Weekly payroll changes by '+usd(singles.staff.w.payrollCents-first.w.payrollCents)+'.',
    lead:'Receipts arrive '+change.leadDays+' days after approval versus '+(original.leadDays||0)+'. Cash paid for ingredients changes by '+usd(first.cashBridge.stock-singles.lead.cashBridge.stock)+'.',
    interaction:'Shared limits on ingredients and service capacity change which orders the combined run can fulfill. This row reconciles the combined result to the three isolated trials.'};
  for(const [k,s] of Object.entries(singles)){
    if(s.numbers.revenue<first.numbers.revenue&&s.numbers.cash>first.numbers.cash){
      const purchases=s.cashBridge.stock-first.cashBridge.stock,bills=s.cashBridge.operating-first.cashBridge.operating;
      reasons[k]+=' Revenue falls while closing cash rises. Compared with baseline, ingredient payments release '+usd(purchases)+' and operating payments release '+usd(bills)+' (signed cash effects).';
    }
  }
  return {base,variant,before:first.numbers,after:last.numbers,effects,reasons,first,last};
}
export function formatMetric(key,n,delta=false){
  if(n===null)return '—';if(key==='margin')return (n/100).toFixed(2)+(delta?' pp':'%');
  return key==='shortages'?String(n):usd(n);
}
export function attribution(result){
  const {effects,reasons,first,last}=result;
  const headers=Object.values(measures).map(k=>'<th scope="col">'+k+'</th>').join('');
  const rows=Object.entries(effects).map(([k,row])=>'<tr><th scope="row">'+labels[k]+'</th>'+Object.keys(measures).map(m=>'<td>'+formatMetric(m,row[m],true)+'</td>').join('')+'<td>'+reasons[k]+'</td></tr>').join('');
  const diff=k=>last.cashBridge[k]-first.cashBridge[k];
  const cash=last.numbers.cash-first.numbers.cash, rev=last.numbers.revenue-first.numbers.revenue;
  const direction=n=>n>0?'rose':n<0?'fell':'was flat';
  const cashRows=Object.entries({opening:'Opening cash carried in',revenue:'Net sales and refunds',stock:'Cash used for ingredient receipts',operating:'Cash used to settle operating bills',tax:'Tax collected, refunded and remitted'}).map(([k,label])=>'<tr><th scope="row">'+label+'</th><td>'+usd(diff(k))+'</td></tr>').join('');
  const drivers=['stock','operating','tax','opening'].filter(k=>diff(k)>0).map(k=>({stock:'lower cash payments for received ingredients',operating:'lower operating payments',tax:'net tax timing',opening:'a higher opening cash balance'})[k]+' ('+usd(diff(k))+')');
  const why=rev<0&&cash>0?' The cash increase comes from '+drivers.join(' and ')+', which outweighed the lost revenue.':'';
  return '<h3>Which change drove the result?</h3><div class="scroll-table" tabindex="0" role="region" aria-label="Weekly lever attribution"><table><caption>Each lever alone against the same baseline</caption><thead><tr><th scope="col">Lever</th>'+headers+'<th scope="col">Reason</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<h3>Cash reconciliation</h3><p>Net revenue '+direction(rev)+' by '+usd(Math.abs(rev))+'. Closing cash '+direction(cash)+' by '+usd(Math.abs(cash))+'.'+why+'</p><table><caption>What-if minus baseline · signed weekly cash movements</caption><tbody>'+cashRows+'<tr><th>Change in closing cash</th><td>'+usd(cash)+'</td></tr></tbody></table>';
}
