// Scenario inputs for a single fictional Austin dining room. All money is USD cents.
export const brewpub = Object.freeze({
  weekdayCovers:Object.freeze([70,82,96,112,155,175,120]),
  ramp:Object.freeze([60,74,88,100]),
  drinksPerHundred:Object.freeze([115,22]),
  menuCents:Object.freeze([850,625,1950]),
  ingredientCents:Object.freeze([200,135,615]),
  wages:Object.freeze([2700,2400,2200,1900,1800]),
  roles:Object.freeze(['Shift lead','Kitchen lead','Brewhouse','Dining room','Service']),
  crew:Object.freeze(['Rowan','Mika','Sol','Ari','Lou']),
  shiftMinutes:540,coversPerPosition:35,dailyRent:44000,dailyUtilities:7400,utilityPerUnit:12,
  taxBasisPoints:825,approvalLimit:92000,bufferPercent:18,priceElasticity:.45
});
// Edition five models the peak seating queue separately from a full shift.
export const servicePolicy=Object.freeze({
  coversPerPosition:30, peakSharePercent:60, peakMinutes:180, peakMinutesPerCover:10,
  baseWaitMinutes:4, patienceMinutes:10, walkoutPercentPerMinute:2, maxWalkoutPercent:60,
  unhappyPercentPerMinute:2, newGuestSharePercent:50, demandLossPerRatingPointPercent:12
});
export const shiftRoster=Object.freeze([...brewpub.crew,'Ash','Lee']);
export const baselinePositions=4;
export const defaultCrew=edition=>edition>=5?shiftRoster.slice(0,baselinePositions):brewpub.crew;

export function serviceQueue(covers,positions,scale,policy=servicePolicy){
  const peakArrivals=Math.round(covers*policy.peakSharePercent/100);
  if(positions===0)return {peakArrivals,peakCapacity:0,waitMinutes:policy.peakMinutes,walkoutRate:100,walkouts:peakArrivals};
  const peakCapacity=positions*scale*policy.peakMinutes/policy.peakMinutesPerCover;
  const overflow=Math.max(0,peakArrivals-peakCapacity);
  const waitMinutes=policy.baseWaitMinutes+Math.round(policy.peakMinutes*overflow/(2*peakCapacity));
  const extra=Math.max(0,waitMinutes-policy.patienceMinutes);
  const walkoutRate=Math.min(policy.maxWalkoutPercent,extra*policy.walkoutPercentPerMinute);
  return {peakArrivals,peakCapacity,waitMinutes,walkoutRate,walkouts:Math.round(peakArrivals*walkoutRate/100)};
}
export function serviceRating(fulfillments,policy=servicePolicy){
  const sum=key=>fulfillments.reduce((total,r)=>total+r[key],0);
  const potential=sum('potentialCovers'),served=sum('mealsServed');
  const disappointed=fulfillments.reduce((total,r)=>{
    const late=Math.max(0,r.waitMinutes-policy.patienceMinutes);
    const seatedPeak=Math.min(r.mealsServed,r.peakArrivals-r.walkouts);
    return total+seatedPeak*Math.min(100,late*policy.unhappyPercentPerMinute)/100;
  },0);
  const ratingHundredths=potential?100+Math.round(400*(served-disappointed)/potential):500;
  return {potential,served,walkouts:sum('walkouts'),ratingHundredths,fulfillmentIds:fulfillments.map(r=>r.id)};
}
export function pubTerms(scale,record,names,edition=3) {
  names??=defaultCrew(edition);
  const staffIds=names.map((name,i)=>record('STAFF-'+(i+1),'Fictional employee',{
    name,role:brewpub.roles[i]||['Prep cook','Food runner'][i-5],hourlyRateCents:brewpub.wages[i]||1800,scheduledMinutes:brewpub.shiftMinutes*scale,
    basis:'Rotating position coverage, aggregated across relief staff'}));
  return record('TERMS','Synthetic operating terms',{
    staffIds,handlingCentsPerMinute:4,salesTaxBasisPoints:brewpub.taxBasisPoints,
    dailyRentCents:brewpub.dailyRent*scale,dailyUtilityBaseCents:brewpub.dailyUtilities*scale,
    utilitiesPerCompletedUnitCents:brewpub.utilityPerUnit,
    fullWeekCovers:brewpub.weekdayCovers.map(n=>n*scale),weeklyRampPercent:[...brewpub.ramp],
    coversPerPosition:(edition>=5?servicePolicy.coversPerPosition:brewpub.coversPerPosition)*scale,unitsPerHundredCovers:[...brewpub.drinksPerHundred,100],
    ...(edition>=4?{lostGuestPercent:50,lostGuestTiming:[50,30,20]}:{}),
    ...(edition>=5?{servicePolicy,scale,baselinePositions}:{}),
    priceElasticity:brewpub.priceElasticity,returnPolicy:'One sold item refunded every third day. Consumed food and drink do not return to stock.',
    settlement:'Accrue operating costs daily. Apply weekly cash to sales tax and operating payables after reserving committed stock purchases.'});
}
// One unserved dining cover can forgo at most one later visit. Cumulative rounding
// assigns whole visits across the lags without rounding the same guest twice.
export function missingVisits(unserved,percent,timing) {
  const lost=Math.round(unserved*percent/100);
  let cumulative=0,allocated=0;
  return timing.map(share=>{
    cumulative+=share;
    const through=Math.round(lost*cumulative/100), quantity=through-allocated;
    allocated=through;
    return quantity;
  });
}
export function pubDemand(day,terms,pricePercent,draw,lostGuestSources,priorWeek) {
  const weekday=(day-1)%7,rampPercent=terms.weeklyRampPercent[Math.floor((day-1)/7)];
  const noisePercent=96+draw(9);
  const factor=Math.max(0,1-terms.priceElasticity*pricePercent/100);
  const expectedCovers=Math.round(terms.fullWeekCovers[weekday]*rampPercent/100*noisePercent/100*factor*(terms.demandFactors?.[day-1]??1));
  const policy=terms.servicePolicy;
  const newProspects=policy?Math.round(expectedCovers*policy.newGuestSharePercent/100):0;
  const rating=priorWeek?.serviceQuality?.ratingHundredths??500;
  const reputationCovers=policy?Math.round(newProspects*(500-rating)*policy.demandLossPerRatingPointPercent/10000):0;
  const lostGuestCovers=Math.min(expectedCovers-newProspects,(lostGuestSources||[]).reduce((sum,s)=>sum+s.covers,0));
  const potentialCovers=expectedCovers-reputationCovers-lostGuestCovers;
  const queue=policy?serviceQueue(potentialCovers,terms.staffIds.length,terms.scale,policy):null;
  const capacityCovers=terms.staffIds.length*terms.coversPerPosition;
  const staffedCovers=Math.min(potentialCovers-(queue?.walkouts||0),capacityCovers);
  const items=covers=>Object.fromEntries(terms.unitsPerHundredCovers.map((count,i)=>['SKU-'+(i+1),Math.round(covers*count/100)]));
  return {weekday,rampPercent,noisePercent,...(lostGuestSources?{expectedCovers,lostGuestCovers,lostGuestSources:[...lostGuestSources]}:{}),...(queue?{...queue,newProspects,ratingHundredths:rating,ratingSourceId:priorWeek?.id??null,reputationCovers}:{}),potentialCovers,capacityCovers,staffedCovers,units:items(potentialCovers),orderable:items(staffedCovers)};
}
export function openingUnits(index,scale,budgetCents){
  const desired=[75,18,60];
  const cost=desired.reduce((sum,units,i)=>sum+units*brewpub.ingredientCents[i],0)*scale;
  return Math.floor(desired[index]*scale*Math.min(1,.25*budgetCents/cost));
}

// Fix the envelope before service opens. Use forecast demand before staffing,
// reputation or actual sales so all rosters face the same purchasing policy.
export function purchaseBudget(startDay,terms,pricePercent,products,records,ceilingCents){
  const week=Math.floor((startDay-1)/7);
  const forecastCovers=terms.fullWeekCovers.map((n,i)=>Math.round(n*(terms.demandFactors?.[startDay-1+i]??1)*terms.weeklyRampPercent[week]/100*
    Math.max(0,1-terms.priceElasticity*pricePercent/100)));
  const items=products.map((productId,i)=>{
    const recipe=records[productId].recipe;
    const unitCostCents=Object.entries(recipe).reduce((sum,[mat,count])=>sum+records[mat].unitCostCents*count,0);
    const units=forecastCovers.reduce((sum,n)=>sum+Math.round(n*terms.unitsPerHundredCovers[i]/100),0);
    return {productId,units,unitCostCents};
  });
  const forecastCostCents=items.reduce((sum,item)=>sum+item.units*item.unitCostCents,0);
  const forecastBudgetCents=Math.ceil(forecastCostCents*(100+brewpub.bufferPercent)/100);
  return {startDay,endDay:startDay+6,forecastCovers,items,forecastCostCents,forecastBudgetCents,
    ...(ceilingCents===undefined?{}:{ceilingCents}),
    reservePercent:brewpub.bufferPercent,budgetCents:Math.min(ceilingCents??forecastBudgetCents,forecastBudgetCents)};
}
