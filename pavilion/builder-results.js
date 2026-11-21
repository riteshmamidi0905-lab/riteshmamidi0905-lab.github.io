import {campaignRun} from './builder-market.js';
import {operatingLedger,totals} from './builder-ledger.js';
export function summarizeBuilder(b,base,days,extra={}){
 const total=totals(days),records={...base.records,...extra},weeks=[];
 for(let i=0;i<4;i++){
   const slice=days.slice(i*7,i*7+7),id='B-WEEK-'+(i+1);
   const record={id,kind:'Seven daily operating closes',week:i+1,...totals(slice),sources:slice.map(d=>d.id)};
   records[id]=record;weeks.push(record);
 }
 records['B-RESULT']={id:'B-RESULT',kind:'Four-week operating summary',...total,
   basis:'Integer cents. Revenue is net of refunds and promotional discounts. Internal venue shares and fees cancel in consolidated figures. Days use actual operating closes.',
   breakEvenBasis:'fixed costs × revenue / (revenue less goods cost); rounded up to cents',runwayBasis:'Available closing cash / last seven days’ net burn. No net burn gives no finite estimate.',sources:weeks.map(w=>w.id)};
 const venue=b.values.type==='stadium',repeatPercent=venue?25:100-base.records.TERMS.servicePolicy.newGuestSharePercent;
 records['B-AUDIENCE']={id:'B-AUDIENCE',kind:'Synthetic audience assumptions',repeatPercent,lostFutureVisits:total.lost,
   basis:venue?'Illustrative 25% repeat attendance. No customer tracking or lost-return model between events.':'Planning mix uses the service policy’s new-guest share. Lost returns derive from daily demand records.',sources:venue?weeks.map(w=>w.id):['TERMS',...base.days.flatMap(d=>d.ids.slice(-1))]};
 return {days,total,weeks,records,idea:base.idea};
}
function evaluatePlan(b,baseline,mode){
 const run=campaignRun(b,baseline,mode);
 const result=summarizeBuilder(b,run.operated,run.days,run.extra);
 return {...result,events:run.events,attribution:run.a,baseline:baseline.records,operatingModel:run.operated.model,mode};
}
export function calculate(b,mode='normal'){
 const baseline=operatingLedger(b);
 const result=evaluatePlan(b,baseline,mode);
 const comparisons=new Map();
 function without(id){
   if(!b.campaigns.some(c=>c.id===id))return null;
   if(!comparisons.has(id)) comparisons.set(id,evaluatePlan({...b,campaigns:b.campaigns.filter(c=>c.id!==id)},baseline,mode));
   return comparisons.get(id);
 }
 result.promotionBook={offers:b.campaigns,without,effect(id){
   const campaign=b.campaigns.find(c=>c.id===id);
   if(!campaign)return null;
   const key='B-EFFECT-'+id;
   if(!result.records[key]){
     const other=without(id);
     const sources=result.days.map(d=>'B-D'+String(d.day).padStart(2,'0')+'-'+id).filter(k=>result.records[k]);
     result.records[key]={id:key,kind:'Four-week promotion comparison',campaign:id,offer:campaign.offer,
       netCents:result.total.income-other.total.income,withIncomeCents:result.total.income,withoutIncomeCents:other.total.income,
       comparison:'Same business, seed, calendar, staff and other campaigns. Includes spend, discounts and downstream service effects. Marginal effects of overlapping offers may not add to total campaign income.',
       sources:['B-RESULT','WITHOUT/'+id+'/B-RESULT',...sources]};
   }
   return result.records[key];
 }};
 return result;
}
export function sourceFor(result,id){
 if(id.startsWith('B-EFFECT-'))return result.promotionBook?.effect(id.slice(9))??null;
 if(id.startsWith('WITHOUT/')){
   const [,campaign,...parts]=id.split('/');
   const alternate=result.promotionBook?.without(campaign);
   if(!alternate)return null;
   const r=sourceFor(alternate,parts.join('/'));
   if(!r)return null;
   const prefix=v=>typeof v==='string'&&sourceFor(alternate,v)?'WITHOUT/'+campaign+'/'+v:Array.isArray(v)?v.map(prefix):v;
   return {...Object.fromEntries(Object.entries(r).map(([k,v])=>[k,prefix(v)])),id,excludedCampaign:campaign};
 }
 if(!id.startsWith('BASE/'))return Object.hasOwn(result.records,id)?result.records[id]:null;
 const record=result.baseline[id.slice(5)];if(!record)return null;
 function prefix(value){
   if(typeof value==='string'&&Object.hasOwn(result.baseline,value))return 'BASE/'+value;
   if(Array.isArray(value))return value.map(prefix);
   return value;
 }
 return Object.fromEntries(Object.entries(record).map(([key,v])=>[key,prefix(v)]));
}
