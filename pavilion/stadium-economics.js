// Fictional facility-service contract for the reference 8,200-seat venue. Rates are USD cents.
export const facilityTerms = {
  staffing: {label:'Event staffing', guestsPerWorker:160, hourly:2200, gameHours:6, concertHours:8},
  security: {label:'Security', guestsPerWorker:300, hourly:3100, gameHours:7, concertHours:9},
  cleaning: {label:'Cleaning', guestsPerWorker:400, hourly:2300, gameHours:4, concertHours:6},
  utilities: {label:'Utilities', daily:25000, perGuest:20},
  maintenance: {label:'Maintenance', daily:31000},
  insurance: {label:'Insurance', daily:18000}
};
export const referenceMargin = {min:8,max:18};
export function facilityCosts(event, capacity) {
  const costs = {};
  for (const [category, term] of Object.entries(facilityTerms)) {
    if (term.guestsPerWorker) {
      const crew = Math.ceil((event.attendance || event.forecast) / term.guestsPerWorker);
      const hours = event.type === 'Concert' ? term.concertHours : term.gameHours;
      costs[category] = Math.round(crew * hours * term.hourly * (event.attendance ? 1 : 0.25));
    } else {
      costs[category] = Math.round(term.daily * capacity / 8200) + event.attendance * (term.perGuest || 0);
    }
  }
  return costs;
}

// Closing balances accumulate across 28 days. Campaign journals are posted to the promoted vendor.
// Internal fee/share debits and credits are eliminated from both sides of the combined statement.
export function venueStatements(model, journals=[], items=[]) {
  const last = model.days.at(-1);
  const final = model.records[last.close];
  const a = final.balances;
  const share = -a.share, fees = -a.fees, transfers = share + fees;
  const costs = Object.fromEntries(Object.keys(facilityTerms).map(key => [key,0]));
  for (const day of model.days) {
    const detail = model.records[model.records[day.close].costId];
    for (const key of Object.keys(costs)) costs[key] += detail.costs[key];
  }
  const statement = (entity, revenue, expense, sources, detail={}) =>
    ({entity,revenue,expense,income:revenue-expense,margin:revenue?(revenue-expense)/revenue:null,sources,...detail});
  const operator=statement('Venue operator', -a.admissions+transfers, a.operations,
    model.days.map(d=>d.close), {admissions:-a.admissions,share,fees,costs});
  const vendors=last.closes.map(id=>{
    const v=model.records[id], balances=v.balances;
    const campaigns=journals.filter(j=>j.entity===v.vendor);
    const spend=campaigns.reduce((n,j)=>n+j.debits.adExpense,0);
    const rebates=campaigns.reduce((n,j)=>n+j.debits.promotionalDiscount,0);
    const entity=items.find(i=>i.id===v.vendor)?.name || v.vendor;
    const sources=[...model.days.map(d=>d.closes.find(close=>model.records[close].vendor===v.vendor)),...campaigns.map(j=>j.id)];
    return {...statement(entity,-balances.sales-rebates,balances.cost+balances.wages+balances.operations+
      balances.share+balances.fees+spend,sources,{sales:-balances.sales,rebates,spend,goods:balances.cost,wages:balances.wages,
      overhead:balances.operations,share:balances.share,fees:balances.fees}),vendor:v.vendor};
  });
  const combined=statement('All businesses in the venue',
    operator.revenue+vendors.reduce((n,v)=>n+v.revenue,0)-transfers,
    operator.expense+vendors.reduce((n,v)=>n+v.expense,0)-transfers,
    ['PL-OPERATOR',...vendors.map(v=>'PL-'+v.vendor)],{transfers});
  if(operator.income!==final.incomeCents || vendors.reduce((n,v)=>n+v.share+v.fees,0)!==transfers ||
    combined.income!==operator.income+vendors.reduce((n,v)=>n+v.income,0))throw Error('Venue entity statements do not reconcile.');
  return {operator,vendors,combined,transfers};
}
