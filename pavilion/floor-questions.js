import {floorOrder} from './iso-geometry.js';

export const examples=['Why did cash drop on day 9?','Show every purchase over $900','What did VECTRA do on day 3?','Which day had the most walkouts?','Follow a stock shortage'];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
export function parseQuestion(raw,day=1){
  const q=String(raw).slice(0,240).toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
  const d=q.match(/\bday\s*#?\s*(\d+)\b|\b(\d+)(?:st|nd|rd|th)\s+day\b/);
  day=d?Number(d[1]||d[2]):day;
  if(day<0||day>28)return {intent:'unknown'};
  if(/\b(cash|cashflow|balance|bank)\b/.test(q))return {intent:'cash',day};
  if(/\b(purchases?|orders?|procurement|proposals?|pos)\b/.test(q)){
    const val=q.match(/(?:over|above|greater than|exceed(?:s|ing)?|more than|higher than|>)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/);
    if(val)return {intent:'purchases',threshold:Math.round(Number(val[1].replaceAll(',',''))*100),day:d?day:null};
  }
  if(/walk\s*(?:outs?|aways?)|walked (?:out|away)|unserved guests/.test(q)&&/most|worst|highest|peak|maximum|busiest|largest|greatest|top|biggest/.test(q))return {intent:'walkouts'};
  if(/shortage|stockout|stock out|shortfall|ran short|out of stock|low stock|ran out|short supply/.test(q))return {intent:'shortage',day:d?day:null,query:q};
  const agent=floorOrder.find(n=>new RegExp('\\b'+n.toLowerCase()+'\\b').test(q));
  if(agent)return {intent:'agent',agent,day};
  return {intent:'unknown'};
}
export function askFloor(model,text,currentDay=1){
 const p=parseQuestion(text,currentDay),events=model.events,records=model.records,rows=Object.values(records);
 const byOutput=new Map();for(const e of events)for(const id of e.outputs)byOutput.set(id,e);
 let message='',ids=[];
 if(p.intent==='cash'){
   const close=records[model.days[p.day]],prior=p.day?records[model.days[p.day-1]]:null;
   if(!close)return {intent:p.intent,message:'That day is outside this replay.',ids:[],flight:[]};
   const debit=[],credit=[];
   for(const id of close.journalIds){const j=records[id];if(j.debit==='cash')debit.push(j);if(j.credit==='cash')credit.push(j);}
   const sum=x=>x.reduce((n,v)=>n+v.cents,0),change=close.accounts.cash-(prior?.accounts.cash||0);
   message='Day '+p.day+' cash '+(change<0?'fell by ':change>0?'rose by ':'was unchanged at ')+money(Math.abs(change)||close.accounts.cash)+'. Receipts totaled '+money(sum(debit))+', payments '+money(sum(credit))+', and closing cash '+money(close.accounts.cash)+'.';
   ids=[...(prior?[prior.id]:[]),...debit.map(j=>j.id),...credit.map(j=>j.id),close.id];
 }else if(p.intent==='purchases'){
   const all=rows.filter(r=>r.kind==='Purchase proposal'&&(p.day===null||byOutput.get(r.id)?.day===p.day)),matches=all.filter(r=>r.cents>p.threshold);
   message=matches.length+' of '+all.length+' purchase proposals exceeded '+money(p.threshold)+(p.day===null?' in this replay.':' on day '+p.day+'.');
   ids=matches.map(r=>r.id);
   if(!ids.length&&all.length){const peak=all.reduce((a,b)=>a.cents>=b.cents?a:b);message+=' The largest was '+money(peak.cents)+'.';ids=[peak.id];}
 }else if(p.intent==='agent'){
   const active=events.filter(e=>e.day===p.day&&e.owner===p.agent);
   message=p.agent+' has '+active.length+' recorded '+(active.length===1?'task':'tasks')+' on day '+p.day+'. '+[...new Set(active.map(e=>e.action))].join(' · ');
   ids=active.flatMap(e=>e.outputs);
 }else if(p.intent==='walkouts'){
   const forecasts=rows.filter(r=>r.kind==='Demand forecast'&&Number.isFinite(r.walkouts)),high=Math.max(...forecasts.map(r=>r.walkouts));
   const tied=forecasts.filter(r=>r.walkouts===high);
   message=tied.length?'Peak walkouts were '+high+' on '+tied.map(r=>'day '+byOutput.get(r.id).day).join(', ')+'. Each forecast records arrivals, service capacity and wait time.':'This replay records no walkout measurements.';
   ids=tied.map(r=>r.id);
 }else if(p.intent==='shortage'){
   const ingredients=model.ingredients.map(id=>records[id]),terms=p.query.replace(/\b(follow|trace|show|a|an|the|me|on|day|for|of|was|where|did|we|stock|stockout|shortage|shortages|shortfall|out|low|ran|run|short|supply|in|please|happen|any|first|material|find|track)\b|[\d?!.,#]/g,' ').trim().split(/\s+/).filter(Boolean);
   const mats=ingredients.filter(r=>!terms.length||terms.every(t=>r.name.toLowerCase().includes(t)||r.id.toLowerCase()===t));
   const checks=rows.filter(r=>r.kind==='Availability check'&&(p.day===null||byOutput.get(r.id)?.day===p.day)),first=checks.find(r=>mats.some(mat=>r.shortage[mat.id]>0));
   if(first){const mat=mats.find(k=>first.shortage[k.id]>0),d=byOutput.get(first.id).day;
     message='On day '+d+', '+mat.name+' was short by '+first.shortage[mat.id]+' units ('+first.available[mat.id]+' available, '+first.required[mat.id]+' required).';
     const requests=events.filter(e=>e.day===d&&e.inputs.includes(first.id)).flatMap(e=>e.outputs).filter(id=>records[id].kind==='Purchase proposal'&&records[id].materialId===mat.id);
     const chain=new Set([first.id,...requests]);for(const e of events.filter(e=>e.day===d))for(const id of e.outputs){const r=records[id];if(requests.includes(r.purchaseId))chain.add(id);}
     ids=[...chain];
   }else{message=mats.length?'The availability checks show no shortage for that selection.':'This business has no matching material. Its inventory lists '+ingredients.map(r=>r.name).join(', ')+'.';ids=mats.length?checks.map(r=>r.id):ingredients.map(r=>r.id);}
 }else message='Here’s what I can answer. Choose a cash movement, purchase threshold, specialist, walkout peak or inventory shortage.';
 const ordered=new Map();for(const id of ids){const e=byOutput.get(id);if(e)ordered.set(e.id,e);}
 const flight=[...ordered.values()].sort((a,b)=>a.day-b.day||a.startMinute-b.startMinute).map(e=>({agent:e.owner,day:e.day,event:e.id,minute:e.startMinute??0}));
 return {intent:p.intent,message,ids:[...new Set(ids)],flight};
}
