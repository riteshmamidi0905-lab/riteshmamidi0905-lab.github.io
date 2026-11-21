import {simulateOperatingPeriod} from './engine.js';
import {scheduleDay} from './shift-schedule.js';
import {validateIdea} from './idea-profiles.js';

const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const limits={price:[-35,60],staff:[1,12],lead:[0,5],purchase:[0,0]};
export function branchState(config,day,minute,lever='staff',value=2){
 return {version:1,config,day,minute,lever,value,choices:[],viewDay:day,viewMinute:minute};
}
export function validateBranch(s){
 if(!s||s.version!==1||!s.config||!integer(s.day,0,28)||!integer(s.minute,0,10000)||!Object.hasOwn(limits,s.lever)||!integer(s.value,...limits[s.lever]))throw Error('Invalid branch settings.');
 if(!integer(s.viewDay,s.day,28)||!integer(s.viewMinute,0,10000)||s.viewDay===s.day&&s.viewMinute<s.minute)throw Error('Invalid replay moment.');
 if(!Array.isArray(s.choices)||s.choices.length>84||s.choices.some(pair=>!Array.isArray(pair)||pair.length!==2||!/^D\d{1,2}-MAT-[1-3]-\d+-\d+$/.test(pair[0])||!['approved','rejected'].includes(pair[1]))||new Set(s.choices.map(x=>x[0])).size!==s.choices.length)throw Error('Invalid purchase choices.');
 if(s.config.edition===7)validateIdea(s.config.idea);
 return s;
}
export function encodeBranch(state){return new URLSearchParams({branch:JSON.stringify(validateBranch(state))}).toString();}
export function decodeBranch(fragment){
 if(fragment.length>24000)throw Error('Scenario link is too long.');
 return validateBranch(JSON.parse(new URLSearchParams(fragment.replace(/^#/, '')).get('branch')||'null'));
}
export function compareBranch(state){
 const s=validateBranch(state),original=simulateOperatingPeriod(s.config),moments=scheduleDay(original,s.day);
 if(!moments.some(x=>x.minute===s.minute))throw Error('Choose a recorded branch moment.');
 const eligible=original.events.filter(e=>e.day===s.day&&e.startMinute>s.minute).flatMap(e=>e.outputs.map(id=>original.records[id])).filter(r=>r.kind==='Purchase proposal').map(r=>r.decisionKey);
 const alternate=simulateOperatingPeriod(s.config,{day:s.day,lever:s.lever,value:s.value,choices:s.choices,eligible});
 return {original,alternate};
}
// Apply each posted journal once at its originating event, including receipt journals
// whose ID only appears explicitly in the closing balance's list.
export function replayIndex(m){
 const events=m.events,byOutput=new Map();for(const e of events)for(const id of e.outputs)byOutput.set(id,e);
 const closeEvents=new Map();for(const id of m.days){const balance=m.records[id];for(const journal of balance.journalIds)closeEvents.set(journal,byOutput.get(id));}
 const changes=new Map();
 for(const r of Object.values(m.records)){
   const e=byOutput.get(r.id)||byOutput.get(r.source)||closeEvents.get(r.id);if(!e)continue;
   const key=e.day+'/'+e.startMinute;
   if(!changes.has(key))changes.set(key,{cash:0,served:0,walkouts:0,rating:null});
   const z=changes.get(key);
   if(r.kind==='Journal'){if(r.debit==='cash')z.cash+=r.cents;if(r.credit==='cash')z.cash-=r.cents;}
   if(r.kind==='Fulfillment check')z.served+=r.mealsServed??r.actualUnits;
   if(r.kind==='Demand forecast')z.walkouts+=r.walkouts??0;
   if(r.kind==='Weekly close'&&r.serviceQuality)z.rating=r.serviceQuality.ratingHundredths;
 }
 const snapshots=[],clock=[...new Set(events.map(e=>e.day+'/'+e.startMinute))].map(k=>k.split('/').map(Number)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 let cash=0,served=0,walkouts=0,rating=500;
 for(const [day,minute] of clock){const v=changes.get(day+'/'+minute);if(v){cash+=v.cash;served+=v.served;walkouts+=v.walkouts;rating=v.rating??rating;}snapshots.push({day,minute,cash,served,walkouts,rating});}
 return snapshots;
}
export function frameAt(index,day,minute){return index.findLast(r=>r.day<day||r.day===day&&r.minute<=minute)||{cash:0,served:0,walkouts:0,rating:500};}
export function availableReviews(model,day,minute){
 const rows=Object.values(model.records),decided=new Set(rows.filter(r=>r.kind==='Approval record').map(r=>r.reviewId));
 return model.events.filter(e=>e.day<day||e.day===day&&e.startMinute<=minute).flatMap(e=>e.outputs.map(id=>model.records[id])).filter(r=>r.kind==='Pending purchase review'&&r.trigger==='Founder review requested'&&!decided.has(r.id));
}
