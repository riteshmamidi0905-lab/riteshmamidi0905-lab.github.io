// Fictional planning inputs, in USD cents. These are scenario assumptions, never market estimates.
const make = (label, unit, size, seats, staff, budget, hours, prices, costs, mix, visits, capacity, wage, rent, products) =>
  ({label,unit,size,seats,staff,budget,hours,prices,costs,mix,visits,capacity,wage,rent,products});
export const profiles = {
  brewery:make('Brewpub','covers','60 seats',60,4,85000,'11:00–21:00',[850,625,1950],[200,135,615],[115,22,100],[70,82,96,112,155,175,120],30,2200,44000,['Kitchen plate','House lager','Lime spritz']),
  coffee:make('Café / coffee roaster','visits','36 seats',36,3,45000,'07:00–16:00',[460,1250,625],[115,410,155],[38,8,100],[92,98,103,110,131,150,123],56,1850,16500,['House espresso','Morning pastry','Roasted beans']),
  bakery:make('Bakery','visits','24 seats',24,3,52000,'06:00–15:00',[460,895,750],[125,260,215],[44,16,100],[64,68,71,82,103,126,86],44,1900,17200,['Morning loaf','Butter bun','Seasonal cake']),
  truck:make('Food truck','orders','180 sq ft',12,2,42000,'11:00–19:00',[350,425,1350],[90,110,415],[40,31,100],[44,54,59,70,95,112,65],43,1800,8000,['Lunch tacos','Citrus drink','Side of chips']),
  retail:make('Retail boutique','transactions','900 sq ft',30,2,65000,'10:00–18:00',[1200,2200,4800],[530,910,2070],[35,12,100],[16,18,22,25,38,54,31],23,1950,18500,['Studio goods','Small accessory','Gift set']),
  salon:make('Hair / beauty salon','appointments','800 sq ft',8,3,55000,'09:00–17:00',[1550,2400,6500],[300,900,850],[25,15,100],[15,18,19,22,28,31,18],8,2550,17000,['Signature cut','Finishing treatment','Care product'])
};
export const tiers={value:.82,standard:1,premium:1.35};
export const districts={neighborhood:1,downtown:1.18,suburban:.88,campus:1.06,industrial:.8};
export const scenarios={
  slow:{label:'Slow month',value:'−25% demand',reason:'A quieter month reduces expected arrivals to 75% on all 28 days.'},
  delay:{label:'Supplier delay',value:'+3 lead days',reason:'Supplies arrive three days later. Existing stock must cover the gap.'},
  war:{label:'Price war',value:'Competitor −15%',reason:'At a synthetic diversion rate of 0.6, a competitor’s 15% price cut diverts 9% of arrivals. Your prices stay fixed.'},
  shortage:{label:'Staff shortage',value:'−1 position',reason:'One fewer position lowers payroll and reduces service capacity every day.'},
  rent:{label:'Rent increase',value:'+20% rent',reason:'Daily rent accrual rises by one fifth, including on quiet days.'},
  viral:{label:'Viral week',value:'+60% in week 2',reason:'Arrivals rise 60% on days 8–14. Capacity, inventory and approval rules still apply.'}
};
export const fields={type:'Business type',concept:'Concept or trading name',city:'City',neighborhood:'Neighborhood type',size:'Size (seats or sq ft)',tier:'Price tier',hours:'Daily opening hours',staff:'Staff positions',budget:'Opening budget (USD)',products:'Signature products or services'};
export function defaults(type){
  const p=profiles[type]||profiles.coffee;
  return {type:type||'',concept:type?p.label:'',city:'Unspecified',neighborhood:'neighborhood',size:p.size,tier:'standard',hours:p.hours,staff:p.staff,budget:p.budget,products:p.products.join(', ')};
}
export function hoursLong(value){
  const parts=/^(\d\d):(\d\d)–(\d\d):(\d\d)$/.exec(value);
  if(!parts)return 0;
  const [h,m,j,n]=parts.slice(1).map(Number);
  if(h>23||j>23||m>59||n>59)return 0;
  return ((60*j+n-60*h-m+1440)%1440||1440)/60;
}
export function validateIdea(idea){
  if(!Object.hasOwn(profiles,idea.type))throw Error('Choose a business type.');
  for(const key of ['concept','city','products']){
    if(typeof idea[key]!=='string'||!idea[key].trim()||idea[key].length>(key==='products'?146:56)||/[<>\x00-\x1f]/.test(idea[key]))throw Error('Check '+fields[key]+'. Use plain text.');
  }
  if(!Object.hasOwn(districts,idea.neighborhood)||!Object.hasOwn(tiers,idea.tier))throw Error('Choose a listed neighborhood and price tier.');
  const size=/^([1-9]\d{0,4}) (seats|sq ft)$/.exec(idea.size);
  if(!size||Number(size[1])>(size[2]==='seats'?400:20000))throw Error('Enter 1–400 seats or 1–20,000 sq ft.');
  if(!hoursLong(idea.hours))throw Error('Use a daily interval such as 09:00–17:00.');
  if(!Number.isInteger(idea.staff)||idea.staff<1||idea.staff>12)throw Error('Choose 1–12 staff positions.');
  if(!Number.isInteger(idea.budget)||idea.budget<500||idea.budget>1000000)throw Error('Enter an opening budget from $500 to $1,000,000.');
  const names=idea.products.split(',').map(x=>x.trim());
  if(names.length>3||names.some(x=>!x||x.length>48)||new Set(names.map(x=>x.toLowerCase())).size!==names.length)throw Error('Enter one to three distinct offerings, separated by commas (48 characters each).');
  return idea;
}
export function operatingProfile(idea, selected=[], positions=idea.staff){
  validateIdea(idea);
  const p=profiles[idea.type], size=Number.parseInt(idea.size),unit=idea.size.endsWith('seats')?'seats':'sq ft';
  const typical=unit==='seats'?p.seats:(p.size.endsWith('sq ft')?parseInt(p.size):p.seats*25);
  const footprint=size/typical, hours=hoursLong(idea.hours);
  const traffic=districts[idea.neighborhood]*Math.sqrt(footprint)*Math.sqrt(hours/hoursLong(p.hours));
  const byDay=Array.from({length:28},(_,i)=>(selected.includes('slow')?.75:1)*(selected.includes('war')?.91:1)*(selected.includes('viral')&&i>=7&&i<14?1.6:1));
  const supplied=idea.products.split(',').map(x=>x.trim());
  const names=[...new Set([...supplied,...p.products])].slice(0,3);
  return {unit:p.unit,positions:Math.max(0,positions-(selected.includes('shortage')?1:0)),hours,
    names:[names[1],names[2],names[0]],prices:p.prices.map(x=>Math.round(x*tiers[idea.tier])),costs:p.costs,
    mix:p.mix,weekday:p.visits.map(x=>Math.max(1,Math.round(x*traffic))),byDay,capacity:Math.max(1,Math.round(p.capacity*hours/hoursLong(p.hours))),
    dailyRent:Math.round(p.rent*Math.max(.25,footprint)*(selected.includes('rent')?1.2:1)),wage:p.wage,
    utilities:Math.round(2100+900*Math.sqrt(footprint)),leadDays:selected.includes('delay')?3:0};
}
