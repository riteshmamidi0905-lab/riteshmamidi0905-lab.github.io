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
   basis:venue?'Illustrative 25% repeat attendance. No customer tracking or lost-return model between events.':'Planning mix uses the service policy’s new-guest share. Lost returns derive from daily demand records.',sources:venue?weeks.map(w=>w.id):['TERMS',...days.flatMap(d=>d.ids.slice(-1))]};
 return {days,total,weeks,records,idea:base.idea};
}
export function calculate(b){
 const base=operatingLedger(b);return summarizeBuilder(b,base,base.days);
}
