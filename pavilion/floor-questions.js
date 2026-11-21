import {floorOrder} from './iso-geometry.js';

const currency = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});
const money = cents => currency.format(cents / 100);
const indexes = new WeakMap();

function askedDirection(q) {
  if (/\b(?:drop(?:ped|s)?|fell|fall(?:ing)?|decreas(?:e|ed)|declin(?:e|ed)|went down|go down|shrank|shrink)\b/.test(q)) return 'drop';
  if (/\b(?:rise|rose|increase(?:d)?|grew|grow|went up|go up|gain(?:ed)?)\b/.test(q)) return 'rise';
  if (/\b(?:flat|unchanged|steady|the same)\b/.test(q)) return 'stay flat';
  if (/\b(?:change|changed|move|moved)\b/.test(q)) return 'change';
  return null;
}

export function parseQuestion(raw,day=1){
  const q=String(raw).slice(0,240).toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
  const d=q.match(/\bday\s*#?\s*(\d+)\b|\b(\d+)(?:st|nd|rd|th)\s+day\b/);
  day=d?Number(d[1]||d[2]):day;
  if(day<0||day>28)return {intent:'unknown'};
  if(/\b(cash|cashflow|balance|bank)\b/.test(q))return {intent:'cash',day,direction:askedDirection(q),negated:/\b(didnt|did not|never|no|not)\b/.test(q)};
  if(/\b(purchases?|orders?|procurement|proposals?|pos)\b/.test(q)){
    const val=q.match(/(?:over|above|greater than|exceed(?:s|ing)?|more than|higher than|>)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/);
    if(val)return {intent:'purchases',threshold:Math.round(Number(val[1].replaceAll(',',''))*100),day:d?day:null};
  }
  if(/walk\s*(?:outs?|aways?)|walked (?:out|away)|unserved guests/.test(q)&&/most|worst|highest|peak|maximum|busiest|largest|greatest|top|biggest/.test(q))return {intent:'walkouts',day:d?day:null};
  if(/shortage|stockout|stock out|shortfall|ran short|out of stock|low stock|ran out|short supply/.test(q))return {intent:'shortage',day:d?day:null,query:q};
  const agent=floorOrder.find(n=>new RegExp('\\b'+n.toLowerCase()+'\\b').test(q));
  if(agent)return {intent:'agent',agent,day};
  return {intent:'unknown'};
}

// Both operating models are immutable for the lifetime of a replay. The stadium has
// separate vendor and operator books: its cash question is always the operator's cash.
function ledgerIndex(model) {
  if (indexes.has(model)) return indexes.get(model);
  const {records,events}=model;
  const byOutput=new Map();
  for (const e of events) for (const id of e.outputs) byOutput.set(id,e);
  const cash=new Map(), walkouts=[], shortages=[], purchases=[];
  const venue=Array.isArray(model.mix);
  if (venue) {
    for (const day of model.days) {
      const close=records[day.close];
      cash.set(day.day,{id:close.id,prior:model.days[day.day-2]?.close,open:close.openingCash,closing:close.closingCash,postings:close.postings});
      walkouts.push({day:day.day,count:day.closes.reduce((sum,id)=>sum+records[id].walkaways,0),ids:day.closes});
    }
  } else {
    model.days.forEach((id,day)=>{
      const close=records[id], prior=model.days[day-1];
      cash.set(day,{id,prior,open:prior?records[prior].accounts.cash:0,closing:close.accounts.cash,postings:close.journalIds.map(id=>records[id])});
    });
    for (const e of events) for (const id of e.outputs) {
      const record=records[id];
      if (record.kind==='Demand forecast' && Number.isFinite(record.walkouts)) walkouts.push({day:e.day,count:record.walkouts,ids:[id]});
      if (record.kind==='Purchase proposal') purchases.push({day:e.day,record});
      if (record.kind==='Availability check') {
        for (const id of model.ingredients) {
          if (record.shortage[id]>0) shortages.push({day:e.day,record,material:records[id]});
        }
      }
    }
  }
  const index={byOutput,cash,walkouts,shortages,purchases,venue};
  indexes.set(model,index);
  return index;
}

export function suggestQuestions(model,currentDay=1) {
  const {cash,walkouts,purchases,shortages,byOutput}=ledgerIndex(model);
  const suggestions=[];
  const tradingDays=[...cash].filter(([day])=>day>0);
  if (tradingDays.length) {
    const lowest=tradingDays.reduce((a,b)=>b[1].closing-b[1].open<a[1].closing-a[1].open?b:a);
    const [day,close]=lowest;
    suggestions.push(close.closing<close.open?'Why did cash drop on day '+day+'?':
      close.closing>close.open?'Why did cash rise on day '+day+'?':'What happened to cash on day '+day+'?');
  }
  if (purchases.length) {
    const largest=purchases.reduce((n,p)=>Math.max(n,p.record.cents),0);
    if (largest>0) {
      const step=[10000,1000,100,1].find(cents=>cents<largest)||1;
      const threshold=Math.floor((largest-1)/step)*step/100;
      suggestions.push('Show purchase proposals over $'+threshold.toLocaleString('en-US'));
    }
  }
  const work=model.events.filter(e=>floorOrder.includes(e.owner)&&e.outputs.length);
  const short=shortages.find(s=>s.day===currentDay), purchase=purchases.find(p=>p.day===currentDay);
  const cited=short?.record.id ?? purchase?.record.id;
  const event=byOutput.get(cited) || work.find(e=>e.day===currentDay) || work[0];
  if (event) suggestions.push('What did '+event.owner+' do on day '+event.day+'?');
  if (walkouts.some(row=>row.count>0)) suggestions.push('Which day had the most walkouts?');
  if (shortages.length) suggestions.push('Follow a stock shortage on day '+shortages[0].day);
  return suggestions;
}

function cashAnswer(index,question) {
  const {day,direction,negated}=question, close=index.cash.get(day);
  if (!close) return {message:'That day is outside this replay.',ids:[]};
  if (day===0) return {message:'Day 0 records opening cash of '+money(close.closing)+'. There is no preceding daily close to compare.',ids:[...close.postings.map(j=>j.id),close.id]};
  const change=close.closing-close.open;
  const credits=close.postings.filter(j=>j.credit==='cash'),debits=close.postings.filter(j=>j.debit==='cash');
  const total=entries=>entries.reduce((n,j)=>n+j.cents,0);
  const movement=change<0?'fell by '+money(-change):change>0?'rose by '+money(change):'stayed at '+money(close.closing);
  const subject=index.venue?'Venue cash':'Cash';
  const movedAsAsked={drop:change<0,rise:change>0,'stay flat':change===0,change:change!==0}[direction];
  let start=subject+' '+movement+' on day '+day;
  if (direction && (negated ? movedAsAsked : !movedAsAsked)) {
    start=subject+(negated?' did ':" didn't ")+direction+' on day '+day+' — it '+movement;
  }
  const message=start+'. Receipts totaled '+money(total(debits))+', payments '+money(total(credits))+', and closing cash '+money(close.closing)+'.';
  const ids=[close.prior,...[...debits,...credits].map(j=>j.id || j.source),close.id].filter(Boolean);
  return {message,ids};
}

export function askFloor(model,text,currentDay=1){
 const p=parseQuestion(text,currentDay),{events,records}=model,index=ledgerIndex(model),{byOutput}=index;
 let message='',ids=[];
 if(p.day!=null&&!index.cash.has(p.day))return {intent:p.intent,message:'That day is outside this replay.',ids:[],flight:[]};
 if(p.intent==='cash'){
   ({message,ids}=cashAnswer(index,p));
 }else if(p.intent==='purchases'){
   const all=index.purchases.filter(row=>p.day===null||row.day===p.day).map(row=>row.record);
   const matches=all.filter(r=>r.cents>p.threshold);
   message=matches.length+' of '+all.length+' purchase proposals exceeded '+money(p.threshold)+(p.day===null?' in this replay.':' on day '+p.day+'.');
   ids=matches.map(r=>r.id);
   if(!matches.length&&all.length){const peak=all.reduce((a,b)=>a.cents>=b.cents?a:b);message+=' The largest was '+money(peak.cents)+'.';ids=[peak.id];}
   if(!all.length){
     if(index.venue)message='This venue ledger records vendor supply and settlements. It contains no purchase proposals.';
     ids=[index.cash.get(p.day??currentDay)?.id].filter(Boolean);
   }
 }else if(p.intent==='agent'){
   const active=events.filter(e=>e.day===p.day&&e.owner===p.agent);
   message=active.length?p.agent+' has '+active.length+' recorded '+(active.length===1?'task':'tasks')+' on day '+p.day+'. '+[...new Set(active.map(e=>e.action))].join(' · '):
     p.agent+' had no recorded tasks on day '+p.day+'.';
   ids=active.length?active.flatMap(e=>e.outputs):[index.cash.get(p.day)?.id].filter(Boolean);
 }else if(p.intent==='walkouts'){
   const high=Math.max(...index.walkouts.map(r=>r.count)), tied=index.walkouts.filter(r=>r.count===high);
   if (high>0) {
     const incorrect=p.day!==null&&!tied.some(r=>r.day===p.day);
     message=(incorrect?"Walkouts didn't peak on day "+p.day+'. ':'')+'Peak walkouts were '+high+' on '+tied.map(r=>'day '+r.day).join(', ')+'.';
     message+=index.venue?' This sums walkaways from the independent vendor closes.':' Each forecast records arrivals, service capacity and wait time.';
     const queried=incorrect?index.walkouts.find(r=>r.day===p.day):null;
     ids=[...(queried?.ids||[]),...tied.flatMap(r=>r.ids)];
   }else{
     message=tied.length?'No walkouts were recorded on any day in this replay.':'This replay records no walkout measurements.';
     ids=tied.flatMap(r=>r.ids);
   }
 }else if(p.intent==='shortage'&&index.venue){
   message='The venue records vendor stock, deliveries and queues separately. Its ledger contains no business-floor availability checks.';
   const day=model.days.find(d=>d.day===(p.day??currentDay));
   ids=day?.closes||[];
 }else if(p.intent==='shortage'){
   const ingredients=model.ingredients.map(id=>records[id]),terms=p.query.replace(/\b(follow|trace|show|a|an|the|me|on|day|for|of|was|were|there|where|did|we|stock|stockout|shortage|shortages|shortfall|out|low|ran|run|short|supply|in|please|happen|any|first|material|find|track)\b|[\d?!.,#]/g,' ').trim().split(/\s+/).filter(Boolean);
   const mats=ingredients.filter(r=>!terms.length||terms.every(t=>r.name.toLowerCase().includes(t)||r.id.toLowerCase()===t));
   const short=index.shortages.find(s=>(p.day===null||p.day===s.day)&&mats.includes(s.material));
   if(short){const {material:mat,record:first,day:d}=short;
     message='On day '+d+', '+mat.name+' was short by '+first.shortage[mat.id]+' units ('+first.available[mat.id]+' available, '+first.required[mat.id]+' required).';
     const requests=events.filter(e=>e.day===d&&e.inputs.includes(first.id)).flatMap(e=>e.outputs).filter(id=>records[id].kind==='Purchase proposal'&&records[id].materialId===mat.id);
     const chain=new Set([first.id,...requests]);for(const e of events.filter(e=>e.day===d))for(const id of e.outputs){const r=records[id];if(requests.includes(r.purchaseId))chain.add(id);}
     ids=[...chain];
   }else{message=mats.length?'The availability checks show no shortage for that selection.':'This business has no matching material. Its inventory lists '+ingredients.map(r=>r.name).join(', ')+'.';
     ids=mats.length?events.filter(e=>p.day===null||e.day===p.day).flatMap(e=>e.outputs).filter(id=>records[id].kind==='Availability check'):model.ingredients;}
 }else message='Here’s what I can answer. '+suggestQuestions(model,currentDay).join(' · ');
 const ordered=new Map();for(const id of ids){const e=byOutput.get(id);if(e)ordered.set(e.id,e);}
 const minute=e=>e.startMinute??e.minute??0;
 const flight=[...ordered.values()].sort((a,b)=>a.day-b.day||minute(a)-minute(b)).map(e=>({agent:e.owner,day:e.day,event:e.id,minute:minute(e)}));
 return {intent:p.intent,message,ids:[...new Set(ids)],flight};
}
