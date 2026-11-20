import {simulateOperatingPeriod} from './engine.js';
import {changesFor,periodFigures} from './week-comparison.js';
import {scenarios,validateIdea} from './idea-profiles.js';

export function runIdea(idea,shocks=[],positions=idea.staff){
  validateIdea(idea);
  return simulateOperatingPeriod({template:idea.type,edition:7,name:idea.concept,location:idea.city,
    size:'Studio',budget:idea.budget,seed:27,idea,shocks,positions});
}
export function summarize(model){
  const period=periodFigures(model,4), weeks=period.periods.map(({w,numbers,meals})=>({id:w.id,week:w.week,served:meals,
    income:w.netIncomeCents,revenue:numbers.revenue,cash:w.closingCashCents,cost:w.ingredientCostCents,payroll:w.payrollCents,rent:w.rentCents,utilities:w.utilitiesCents,
    operatingDue:w.operatingDueCents,taxDue:w.taxDueCents}));
  const terms=model.records.TERMS;
  const units=model.events.filter(e=>e.action==='Check fulfillment against plan').reduce((n,e)=>n+model.records[e.outputs[0]].actualUnits,0);
  const total=k=>weeks.reduce((n,w)=>n+w[k],0);
  const variableCost=total('cost')+units*terms.utilitiesPerCompletedUnitCents;
  const contribution=period.numbers.revenue-variableCost;
  const fixed=total('payroll')+total('rent')+total('utilities')-units*terms.utilitiesPerCompletedUnitCents;
  const breakEven=contribution>0?Math.ceil(fixed*period.numbers.revenue/contribution):null;
  const available=w=>w.cash-w.operatingDue-w.taxDue;
  const free=available(weeks[3]),burn=available(weeks[2])-free;
  return {numbers:period.numbers,weeks,cashBridge:period.cashBridge,breakEven,free,burn,
    runway:free<=0?0:burn>0?free/burn:null,fixed,variableCost};
}
export function assess(idea){
  const baseline=summarize(runIdea(idea));
  const singles=Object.fromEntries(Object.keys(scenarios).map(k=>[k,summarize(runIdea(idea,[k]))]));
  const sweep=Array.from({length:12},(_,i)=>{
    const staff=i+1, data=staff===idea.staff?baseline:summarize(runIdea(idea,[],staff));
    return {staff,income:data.numbers.income,served:data.numbers.meals,closeIds:data.weeks.map(w=>w.id)};
  });
  const recommended=sweep.reduce((best,row)=>row.income>best.income?row:best);
  const risks=Object.keys(singles).sort((a,b)=>singles[a].numbers.income-singles[b].numbers.income).slice(0,3);
  return {baseline,singles,sweep,recommended,risks};
}
export function stressComparison(idea,assessment,keys){
  const selected=[...new Set(keys)];
  const after=selected.length===1?assessment.singles[selected[0]]:selected.length?summarize(runIdea(idea,selected)):assessment.baseline;
  const singles=Object.fromEntries(selected.map(k=>[k,assessment.singles[k]]));
  return {...changesFor({baseline:assessment.baseline,combined:after,...singles}),result:after,selected};
}
