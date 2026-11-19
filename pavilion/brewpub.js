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
export function pubTerms(scale,record,names=brewpub.crew) {
  const staffIds=names.map((name,i)=>record('STAFF-'+(i+1),'Fictional employee',{
    name,role:brewpub.roles[i],hourlyRateCents:brewpub.wages[i],scheduledMinutes:brewpub.shiftMinutes*scale,
    basis:'Rotating position coverage, aggregated across relief staff'}));
  return record('TERMS','Synthetic operating terms',{
    staffIds,handlingCentsPerMinute:4,salesTaxBasisPoints:brewpub.taxBasisPoints,
    dailyRentCents:brewpub.dailyRent*scale,dailyUtilityBaseCents:brewpub.dailyUtilities*scale,
    utilitiesPerCompletedUnitCents:brewpub.utilityPerUnit,
    fullWeekCovers:brewpub.weekdayCovers.map(n=>n*scale),weeklyRampPercent:[...brewpub.ramp],
    coversPerPosition:brewpub.coversPerPosition*scale,unitsPerHundredCovers:[...brewpub.drinksPerHundred,100],
    priceElasticity:brewpub.priceElasticity,returnPolicy:'One sold item refunded every third day. Consumed food and drink do not return to stock.',
    settlement:'Accrue operating costs daily. Apply weekly cash to sales tax and operating payables after reserving committed stock purchases.'});
}
export function pubDemand(day,terms,pricePercent,draw) {
  const weekday=(day-1)%7,rampPercent=terms.weeklyRampPercent[Math.floor((day-1)/7)];
  const noisePercent=96+draw(9);
  const factor=Math.max(0,1-terms.priceElasticity*pricePercent/100);
  const potentialCovers=Math.round(terms.fullWeekCovers[weekday]*rampPercent/100*noisePercent/100*factor);
  const capacityCovers=terms.staffIds.length*terms.coversPerPosition, staffedCovers=Math.min(potentialCovers,capacityCovers);
  const items=covers=>Object.fromEntries(terms.unitsPerHundredCovers.map((count,i)=>['SKU-'+(i+1),Math.round(covers*count/100)]));
  return {weekday,rampPercent,noisePercent,potentialCovers,capacityCovers,staffedCovers,units:items(potentialCovers),orderable:items(staffedCovers)};
}
export function openingUnits(index,scale,budgetCents){
  const desired=[75,18,60];
  const cost=desired.reduce((sum,units,i)=>sum+units*brewpub.ingredientCents[i],0)*scale;
  return Math.floor(desired[index]*scale*Math.min(1,.25*budgetCents/cost));
}
