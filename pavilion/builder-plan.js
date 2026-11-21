import {defaults, profiles, fields, validateIdea} from './idea-profiles.js';
import {parseIdea} from './idea-parser.js';
import {parseStadiumIdea} from './stadium-idea.js';
import {booths} from './stadium-model.js';
import {readSchedule} from './idea-hours.js';

export const types = {...Object.fromEntries(Object.entries(profiles).map(([id,p])=>[id,p.label])),stadium:'Stadium & vendors'};
export const sectors = {
  food:{label:'Food & drink',types:['brewery','coffee','bakery','truck'],sample:'Court Coffee'},
  beauty:{label:'Beauty',types:['salon'],sample:'Iris Studio'},
  retail:{label:'Retail',types:['retail'],sample:'Pavilion Goods'},
  sports:{label:'Sports & venues',types:['stadium'],sample:'District Field'}
};
export const labels={...fields,goals:'What you want to learn',mix:'Independent vendors'};
export const allVendors=booths.map(b=>b.id);
export const goalOptions=['Test the concept','Find a sustainable margin','Compare offers','Plan staffing'];
export const groups=[
  {title:'What will you sell?',keys:['type','products']},
  {title:'Where will you operate?',keys:['city','neighborhood']},
  {title:'How big is the business?',keys:['size','staff']},
  {title:'What price feels right?',keys:['tier']},
  {title:'When will you open?',keys:['hours']},
  {title:'What is your opening budget?',keys:['budget']},
  {title:'What would you like to learn?',keys:['concept','goals']}
];
export function newPlan(type='coffee'){
  if(!Object.hasOwn(types,type))throw Error('Choose an industry from the gallery.');
  const values={...defaults(type==='stadium'?'coffee':type),type,goals:goalOptions[0]};
  if(type==='stadium')Object.assign(values,{concept:'District Field',size:'8200 seats',staff:5,budget:120000,products:'Game-day concessions',hours:'12:00–17:30',mix:[...allVendors]});
  const status=Object.fromEntries(Object.keys(labels).map(k=>[k,'defaulted']));
  return {values,status,questions:{}};
}
export function inferPlan(text){
  if(!text.trim())throw Error('Describe the business in one sentence.');
  // Read city, budget and hours even when the venue parser supplies the industry and vendor mix.
  const venue=parseStadiumIdea(text),parsed=parseIdea(text,{detectVenue:false});
  const plan=newPlan(venue?'stadium':parsed.values.type||'coffee');
  for(const [k,v] of Object.entries(parsed.values)){
    if(parsed.status[k]==='parsed'&&!(venue&&k==='type')){plan.values[k]=v;plan.status[k]='parsed';}
  }
  plan.questions={...parsed.questions};
  if(venue){
    delete plan.questions.type;
    plan.values.type='stadium';plan.status.type='parsed';
    if(venue.values.mix.length){plan.values.mix=venue.values.mix;plan.status.mix='parsed';}
    Object.assign(plan.questions,venue.questions);
    if(/^\d+ seats$/.test(parsed.values.size)&&parseInt(parsed.values.size)>400)delete plan.questions.size;
    const seats=/\b([0-9][0-9,]*)[ -]+seats?\b/i.exec(text);
    if(seats){plan.values.size=Number(seats[1].replaceAll(',',''))+' seats';plan.status.size='parsed';delete plan.questions.size;}
  }
  return plan;
}
export function changeType(plan,type){
  if(plan.values.type===type)return;
  const fresh=newPlan(type);
  for(const k of ['city','neighborhood','concept','goals','budget','hours','tier']){
    if(plan.status[k]!=='defaulted'){fresh.values[k]=plan.values[k];fresh.status[k]=plan.status[k];}
  }
  Object.assign(plan,fresh);plan.status.type='user-set';
}
export function checkPlan(values){
  const safeText=(s,n)=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=n&&!/[<>\x00-\x1f]/.test(s);
  if(values.type!=='stadium')validateIdea(values);
  else{
    if(!safeText(values.concept,56)||!safeText(values.city,56)||!safeText(values.products,146))throw Error('Enter plain text for name, city and offering.');
    if(!/^[1-9]\d{1,4} seats$/.test(values.size)||parseInt(values.size)>30000)throw Error('Choose a venue with 10–30,000 seats.');
    if(!Number.isInteger(values.staff)||values.staff<1||values.staff>12)throw Error('Choose 1–12 positions for the lead stand.');
    if(!Number.isInteger(values.budget)||values.budget<500||values.budget>1000000||!readSchedule(values.hours))throw Error('Check the opening hours and the budget ($500–$1,000,000).');
    if(!Array.isArray(values.mix)||!values.mix.length||new Set(values.mix).size!==values.mix.length||values.mix.some(id=>!allVendors.includes(id)))throw Error('Choose one or more independent vendors.');
    if(!['value','standard','premium'].includes(values.tier)||!['neighborhood','downtown','suburban','campus','industrial'].includes(values.neighborhood))throw Error('Choose a listed location and price tier.');
  }
  if(!goalOptions.includes(values.goals))throw Error('Choose a planning goal.');
  return values;
}
