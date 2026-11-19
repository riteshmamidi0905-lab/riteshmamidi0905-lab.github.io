import {servicePolicy} from './brewpub.js';
import {operatingProfile, profiles, scenarios} from './idea-profiles.js';

// Edition seven supplies sector-specific terms to the existing journal, procurement and settlement engine.
export function ideaTerms(input, record) {
  const {idea,shocks=[],positions=idea.staff}=input;
  if(!Array.isArray(shocks)||shocks.some(s=>!Object.hasOwn(scenarios,s))||!Number.isInteger(positions)||positions<1||positions>12)throw Error('Invalid scenario levers.');
  const p=operatingProfile(idea,shocks,positions);
  const role=idea.type==='salon'?'Stylist':idea.type==='truck'?'Truck crew':'Shift team';
  const staffIds=Array.from({length:p.positions},(_,i)=>record('STAFF-'+(i+1),'Fictional employee',{
    name:role+' '+(i+1),role,hourlyRateCents:p.wage,scheduledMinutes:Math.round(60*p.hours),
    basis:'Position coverage per open day; relief coverage is aggregated.'}));
  return record('TERMS','Synthetic operating terms',{
    unit:p.unit,staffIds,handlingCentsPerMinute:4,salesTaxBasisPoints:idea.type==='salon'?0:800,
    dailyRentCents:p.dailyRent,dailyUtilityBaseCents:p.utilities,utilitiesPerCompletedUnitCents:12,
    fullWeekCovers:p.weekday,weeklyRampPercent:[70,80,90,100],unitsPerHundredCovers:p.mix,
    coversPerPosition:p.capacity,demandFactors:p.byDay,priceElasticity:.45,
    lostGuestPercent:50,lostGuestTiming:[50,30,20],scale:1,baselinePositions:idea.staff,
    servicePolicy:{...servicePolicy,peakMinutesPerCover:180/(p.capacity*.60)},
    sector:profiles[idea.type].label,openingHours:idea.hours,footprint:idea.size,priceTier:idea.tier,
    shifts:'One shift of position coverage per day for 28 days. Geography is a label; district and floor area scale demand.',
    settlement:'Weekly tax and operating payables are settled from available cash after reserving stock commitments.'});
}
export function openingStock(profile,budget){
  const initial=profile.mix.map(q=>Math.ceil(q*profile.weekday[0]/100));
  const total=initial.reduce((sum,n,i)=>sum+n*profile.costs[i],0);
  return initial.map(n=>Math.floor(n*Math.min(1,budget*.25/Math.max(total,1))));
}
