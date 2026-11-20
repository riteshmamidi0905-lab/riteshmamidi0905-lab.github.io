import {operatingProfile,hoursLong,tiers} from './idea-profiles.js';
import {runIdea} from './idea-analysis.js';
import {booths,recommended,simulateStadium} from './stadium-model.js';
import {checkPlan} from './builder-plan.js';

export const sum=(rows,pick)=>rows.reduce((n,row)=>n+pick(row),0);
export function createBusiness(plan){
 const v=checkPlan(structuredClone(plan.values)),venue=v.type==='stadium',p=venue?null:operatingProfile(v);
 const items=venue?booths.filter(b=>v.mix.includes(b.id)).map(b=>({id:b.id,name:b.name,price:Math.round(b.price*tiers[v.tier]),cost:b.cost})):
   p.names.map((name,i)=>({id:'SKU-'+(i+1),name,price:p.prices[i],cost:p.costs[i]}));
 return {values:v,status:{...plan.status},items,lead:0,stock:100,campaigns:[],
   site:{theme:'garden',accent:'#315842',title:v.concept,story:'An independent '+(venue?'venue':v.type==='salon'?'studio':'business')+' taking shape in '+v.city+'.',sections:['offers','hours','story']}};
}
function retailDays(b,arrivals){
 const v=b.values, idea={...v,builderOps:{items:b.items,lead:b.lead,stock:b.stock,...(arrivals?{arrivals}: {})}};
 const model=runIdea(idea), byDay=new Map(model.events.filter(e=>e.action==='Check fulfillment against plan').map(e=>[e.day,model.records[e.outputs[0]]]));
 const days=model.days.slice(1).map((id,i)=>{
   const close=model.records[id],prior=model.records[model.days[i]],a=close.accounts,p=prior.accounts,ful=byDay.get(i+1),forecast=model.records[ful.forecastId];
   return {day:i+1,id,served:ful.mealsServed,walks:ful.unservedCovers,lost:forecast.lostGuestCovers,
     gross:p.sales-a.sales-(a.refunds-p.refunds),cost:a.cost-p.cost,fixed:a.payroll-p.payroll+a.rent-p.rent+a.utilities-p.utilities,
     income:close.incomeCents-prior.incomeCents,cash:a.cash,available:a.cash+a.operatingPayable+a.salesTaxPayable,
     inventory:close.closingStock,ids:[id,ful.id,forecast.id],saleUnits:Object.fromEntries(ful.lotIds.map(k=>{const lot=model.records[k];return [lot.productId,lot.completed];})),variance:close.trialBalanceCents};
 });
 return {records:model.records,days,idea,model};
}
function venueDays(b,arrivals){
 const v=b.values,ids=v.mix,menu=Object.fromEntries(b.items.map(item=>[item.id,{price:item.price,cost:item.cost}]));
 const staff=Object.fromEntries(ids.map((id,i)=>[id,Math.min(12,Math.max(1,recommended[id]+v.staff-recommended[ids[0]]))]));
 const model=simulateStadium({mix:ids,staff,operations:{menu,stock:b.stock,lead:b.lead,seats:parseInt(v.size),minutes:Math.round(hoursLong(v.hours)*60),capital:v.budget*100,arrivals}});
 let priorIncome=0;
 const days=model.days.map(d=>{
   const rec=id=>model.records[id],venue=rec(d.close),vendors=d.closes.map(rec),books=[venue,...vendors];
   const net=sum(books,c=>c.incomeCents),income=net-priorIncome;priorIncome=net;
   const gross=venue.admissionsCents+sum(vendors,c=>rec(c.settlementId).grossSalesCents);
   const cost=sum(vendors,c=>sum(c.postings.filter(p=>p.debit==='cost'),p=>p.cents));
   return {day:d.day,id:d.close,served:sum(vendors,c=>c.served),walks:sum(vendors,c=>c.walkaways),lost:0,
     gross,cost,fixed:gross-cost-income,income,cash:sum(books,c=>c.closingCash),available:sum(books,c=>c.closingCash),
     inventory:Object.fromEntries(vendors.map(c=>[c.vendor,c.stockUnits])),ids:[d.close,d.audit,...d.closes],
     saleUnits:Object.fromEntries(vendors.map(c=>[c.vendor,c.served])),variance:sum(books,c=>Math.abs(c.variance)),event:rec(d.eventId).type};
 });
 return {records:model.records,days,model};
}
export function operatingLedger(b,arrivals=null){
 checkPlan(b.values);
 if(!Number.isInteger(b.lead)||b.lead<0||b.lead>7||!Number.isInteger(b.stock)||b.stock<25||b.stock>200)throw Error('Check the supplier lead time and stock target.');
 if(b.values.type==='stadium')return venueDays(b,arrivals);
 return retailDays(b,arrivals);
}
export function totals(days){
 const sumKey=k=>sum(days,r=>r[k]),gross=sumKey('gross'),cost=sumKey('cost'),income=sumKey('income'),fixed=gross-cost-income;
 const available=days.at(-1).available,burn=(days.at(-8)?.available??days[0].available)-available;
 return {gross,cost,fixed,income,cash:days.at(-1).cash,available,served:sumKey('served'),walks:sumKey('walks'),lost:sumKey('lost'),
   breakEven:gross>cost?Math.ceil(fixed*gross/(gross-cost)):null,runway:available<=0?0:burn>0?available/burn:null};
}
