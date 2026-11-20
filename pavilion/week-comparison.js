import {simulateOperatingPeriod} from './engine.js';
import {brewpub,defaultCrew,shiftRoster} from './brewpub.js';
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
// Aggregate flows over the chosen closes. Cash and margin use the final balance
// and total operating income divided by total net sales, respectively.
export function periodFigures(model,weeks) {
  const periods=Array.from({length:weeks},(_,i)=>weekFigures(model,i+1));
  const sum=get=>periods.reduce((n,x)=>n+get(x),0);
  const last=periods.at(-1),revenue=sum(r=>r.numbers.revenue),income=sum(r=>r.w.netIncomeCents);
  const records=model.events.filter(e=>e.day>=1&&e.day<=weeks*7)
    .filter(e=>e.action==='Check fulfillment against plan'||e.action==='Forecast demand')
    .map(e=>model.records[e.outputs[0]]);
  const total=key=>records.reduce((n,x)=>n+(x[key]||0),0);
  const cashBridge={opening:periods[0].cashBridge.opening};
  for(const key of ['revenue','tax','stock','operating'])cashBridge[key]=sum(row=>row.cashBridge[key]);
  const numbers={revenue,income,cash:last.numbers.cash,meals:sum(r=>r.meals),unserved:total('unservedCovers'),lost:total('lostGuestCovers'),shortages:sum(r=>r.numbers.shortages),margin:revenue?Math.round(10000*income/revenue):null};
  if(Object.values(cashBridge).reduce((a,b)=>a+b,0)!==numbers.cash)throw Error('Operating period cash does not reconcile.');
  return {numbers,cashBridge,periods};
}

export function changesFor(figures) {
  const {baseline:first,combined:last,...singles}=figures;
  const effects=Object.fromEntries([...Object.keys(singles),'interaction'].map(key=>[key,{}]));
  for(const key of Object.keys(first.numbers)){
    const original=first.numbers[key];
    const delta=n=>original===null||n===null?null:n-original;
    const total=delta(last.numbers[key]);
    for(const [lever,s] of Object.entries(singles))effects[lever][key]=delta(s.numbers[key]);
    const individual=Object.keys(singles).map(lever=>effects[lever][key]);
    effects.interaction[key]=total===null||individual.includes(null)?null:total-individual.reduce((a,b)=>a+b,0);
  }
  return {first,last,before:first.numbers,after:last.numbers,effects};
}

// Re-run the same automatic policy at each staffing level. Each row comes from
// four posted closes and their fulfillment records, including declined purchases.
// Decompose realized entrées from each day's recorded arrivals and service losses.
export function mealBridge(base,variant,week){
  const collect=m=>{
    const w=m.records[m.weeks[week-1]];
    return w.serviceQuality.fulfillmentIds.map((id,i)=>{
      const check=m.records[id],forecast=m.records[check.forecastId];
      return {day:w.from+i,id,forecastId:forecast.id,
        expected:forecast.expectedCovers,returns:forecast.lostGuestCovers,reputation:forecast.reputationCovers,
        walkouts:check.walkouts,capacity:check.capacityRefusals,stock:check.stockoutCovers,served:check.mealsServed};
    });
  };
  const left=collect(base),right=collect(variant);
  const rows=left.map((row,i)=>{
    const other=right[i],effects={expected:other.expected-row.expected};
    for(const key of ['returns','reputation','walkouts','capacity','stock'])effects[key]=row[key]-other[key];
    const change=other.served-row.served;
    if(Object.values(effects).reduce((a,b)=>a+b,0)!==change)throw Error('Meal change must trace to the daily fulfillment records.');
    return {baseline:row,variant:other,change,effects};
  });
  const effects=Object.fromEntries(Object.keys(rows[0].effects).map(key=>[key,rows.reduce((n,row)=>n+row.effects[key],0)]));
  return {effects,rows,change:rows.reduce((n,row)=>n+row.change,0)};
}

export function staffingSweep(model){
  const {decisions,humanReview,staff,...config}=model.config;
  if(!(config.edition>=5) || config.template!=='brewery')return [];
  const names=[...new Set([...(staff||[]),...shiftRoster])];
  return Array.from({length:6},(_,i)=>{
    const positions=i+2;
    const run=simulateOperatingPeriod({...config,staff:names.slice(0,positions)});
    const period=periodFigures(run,4);
    const weeks=period.periods.map(({w,meals})=>({closeId:w.id,meals,walkouts:w.serviceQuality.walkouts,rating:w.serviceQuality.ratingHundredths}));
    return {positions,...period.numbers,weeks,payroll:period.periods.reduce((n,{w})=>n+w.payrollCents,0)};
  });
}

export function compareWeek(model,week,change){
  if(!Number.isInteger(week)||week<1||week>4)throw Error('Choose a week from 1 to 4.');
  const maxStaff=model.config.edition>=5?7:5;
 if(!Number.isInteger(change.staffCount)||change.staffCount<1||change.staffCount>maxStaff)throw Error('Choose 1–'+maxStaff+' staff.');
  const {decisions,humanReview,...original}=model.config;
  const staff=original.staff|| (original.edition>=3?defaultCrew(original.edition):defaultStaff);
  const names=[...new Set([...staff,...shiftRoster])].slice(0,change.staffCount);
  const price={pricePercent:change.pricePercent}, roster={staff:names}, lead={leadDays:change.leadDays};
  const run=changes=>simulateOperatingPeriod({...original,...changes});
  const models={baseline:run({}),combined:run({...price,...roster,...lead}),price:run(price),staff:run(roster),lead:run(lead)};
  const project=extract=>Object.fromEntries(Object.entries(models).map(([key,m])=>[key,extract(m)]));
  const singles=project(m=>weekFigures(m,week)), {baseline:first,combined:last}=singles;
  const weekly=changesFor(singles);
  const opening=original.edition>=4?changesFor(project(m=>periodFigures(m,1))):null;
  const period=original.edition>=4?changesFor(project(m=>periodFigures(m,4))):null;
  const pct=change.pricePercent, from=original.pricePercent||0;
  const reasons={
    price:'The menu adjustment changes from '+from+'% to '+pct+'%.'+(original.edition>=3?' Demand responds by 0.45% per percentage point.':' This archived scenario holds requested units fixed.'),
    staff:names.length+' staffed positions versus '+staff.length+'. '+(original.edition>=3?singles.staff.capacityLoss+' potential covers exceed staffed capacity. ':'')+'Weekly payroll changes by '+usd(singles.staff.w.payrollCents-first.w.payrollCents)+'.',
    lead:'Receipts arrive '+change.leadDays+' days after approval versus '+(original.leadDays||0)+'. Cash paid for ingredients changes by '+usd(first.cashBridge.stock-singles.lead.cashBridge.stock)+'.',
    interaction:'Shared limits on ingredients and service capacity change which orders the combined run can fulfill. This row reconciles the combined result to the three isolated trials.'};
  for(const k of ['price','staff','lead']){
    const s=singles[k];
    if(s.numbers.revenue<first.numbers.revenue&&s.numbers.cash>first.numbers.cash){
      const purchases=s.cashBridge.stock-first.cashBridge.stock,bills=s.cashBridge.operating-first.cashBridge.operating;
      reasons[k]+=' Revenue falls while closing cash rises. Compared with baseline, ingredient payments release '+usd(purchases)+' and operating payments release '+usd(bills)+' (signed cash effects).';
    }
  }
  return {base:models.baseline,variant:models.combined,...weekly,reasons,opening,period};
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
