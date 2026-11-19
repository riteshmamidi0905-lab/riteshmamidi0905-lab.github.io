import {simulateOperatingPeriod} from './engine.js';
import {compareWeek,attribution,mealBridge} from './week-comparison.js';
import {assumptions} from './model-assumptions.js';
export {compareWeek};
import {header,tabs,esc,url} from './views.js';
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
const pct=(n,d)=>d?(100*n/d).toFixed(1)+'%':'—';
const source=(m,d,id,label=id,accessibleName)=>'<a href="'+url('inspector',m,d,{id})+'"'+
  (accessibleName?' aria-label="'+esc(accessibleName)+'"':'')+'>'+esc(label)+'</a>';
function incident(r) {
 if(r.kind==='Availability check' && Object.values(r.shortage).some(x=>x>0))return 'Ingredient shortage';
 if(r.kind==='Fulfillment check' && r.unfilledUnits)return 'Unfilled production';
 if(r.kind==='Approval record'&&!r.approved)return 'Purchase declined';
 if(r.kind==='Pending purchase review')return 'Purchase escalated';
 if(r.kind==='Evaluation'&&!r.passed)return 'Evaluation exception';
 if(r.kind==='Balance sheet'&&r.trialBalanceCents!==0)return 'Reconciliation exception';
 return '';
}
export function weekMetrics(m,week,names){
 const first=(week-1)*7+1,last=week*7,events=m.events.filter(e=>e.day>=first&&e.day<=last), incidents=[],evaluations=[];
 const rows=Object.fromEntries(names.map(name=>[name,{tasks:0,exceptions:0,minutes:0,costCents:0,escalations:0,requested:0,approved:0,rejected:0,sources:[]}]));
 for(const e of events){
   const row=rows[e.owner], output=e.outputs.map(id=>m.records[id]);row.tasks++;
   row.minutes+=e.endMinute-e.startMinute;row.sources.push(e.outputs[0]);
   if(output.some(incident))row.exceptions++;
   for(const r of output){const label=incident(r);if(label)incidents.push({label,id:r.id,day:e.day,owner:e.owner});
     if(r.kind==='Purchase proposal')row.requested++;
     if(r.kind==='Pending purchase review')row.escalations++;
     if(r.kind==='Approval record')row[r.approved?'approved':'rejected']++;
     if(r.kind==='Evaluation')evaluations.push({id:r.id,passed:r.passed,day:e.day});
   }
 }
 for(const row of Object.values(rows))row.costCents=row.minutes*m.records.TERMS.handlingCentsPerMinute;
 return {rows,incidents,evaluations};
}
export function pendingRequests(m){
 const resolved=new Set(Object.values(m.records).filter(r=>r.kind==='Approval record'&&r.reviewId).map(r=>r.reviewId));
 return m.events.map(e=>m.records[e.outputs[0]]).filter(r=>r.kind==='Pending purchase review'&&!resolved.has(r.id));
}
export function decide(m,key,choice){
 const pending=pendingRequests(m)[0];
 if(!pending||pending.decisionKey!==key||!['approved','rejected'].includes(choice))throw Error('Select the oldest pending purchase request.');
 if(choice==='approved'&&pending.cents>pending.availableCashCents)throw Error('Approval exceeds available cash.');
 if(choice==='approved'&&pending.cents>pending.remainingBudgetCents)throw Error('Approval exceeds the remaining weekly purchasing budget.');
 return simulateOperatingPeriod({...m.config,decisions:[...(m.config.decisions||[]),{key,choice}]});
}
const operatingMeasures={revenue:'Net revenue',income:'Operating income',cash:'Closing cash',meals:'Meals served',unserved:'Unserved covers',lost:'Return visits lost',margin:'Operating margin'};
function metric(key,n,delta=false){
  if(n===null)return '—';
  const prefix=delta&&n>0?'+':'';
  if(key==='margin')return prefix+(n/100).toFixed(2)+(delta?' pp':'%');
  return prefix+(['revenue','income','cash'].includes(key)?usd(n):n.toLocaleString('en-US'));
}
function periodCard(title,summary){
  const rows=Object.entries(operatingMeasures).map(([key,label])=>{
    const a=summary.before[key],b=summary.after[key];
    return '<tr><th scope="row">'+label+'</th><td>'+metric(key,a)+'</td><td>'+metric(key,b)+'</td><td>'+metric(key,a===null||b===null?null:b-a,true)+'</td></tr>';
  }).join('');
  return '<article class="period-card"><h3>'+title+'</h3><table><thead><tr><th scope="col">Measure</th><th scope="col">Baseline</th><th scope="col">What-if</th><th scope="col">Change</th></tr></thead><tbody>'+rows+'</tbody></table></article>';
}
function extraMeals(base,variant,week){
  const b=mealBridge(base,variant,week),terms={expected:'price-adjusted forecast',returns:'return visits retained',reputation:'first-time guests retained',walkouts:'fewer walkouts',capacity:'fewer capacity refusals',stock:'fewer unavailable meals'};
  const signed=n=>n>0?'+'+n:String(n);
  const factors=Object.entries(b.effects).filter(([,n])=>n).map(([k,n])=>terms[k]+' '+signed(n)).join(' · ');
  const links=b.rows.filter(r=>r.change).map(r=>'Day '+r.baseline.day+' ('+signed(r.change)+') '+source(base,r.baseline.day,r.baseline.id)+' / '+source(variant,r.variant.day,r.variant.id)).join(' · ');
  return '<details><summary>Why '+b.change+' more meals?</summary><p>Signed contributions to the weekly difference: '+factors+'.</p><p>Daily fulfillment checks, baseline / what-if: '+links+'. Each check identifies its demand forecast.</p></details>';
}

function openingAndMonth({base,variant,opening,period}){
  const before=period.before,after=period.after;
  const cardRow='<div class="period-cards">'+periodCard('Week 1',opening)+periodCard('Four weeks',period)+'</div>';
  const rows=period.first.periods.map((group,i)=>{
    const sibling=period.last.periods[i],day=7*(i+1);
    return '<tr><th scope="row">Week '+(i+1)+'</th><td>'+group.meals+' / '+sibling.meals+'</td><td>'+usd(group.numbers.revenue)+' / '+usd(sibling.numbers.revenue)+'</td><td>'+source(base,day,group.w.id,'Baseline','Baseline week '+(i+1)+' close record '+group.w.id)+' · '+source(variant,day,sibling.w.id,'What-if','What-if week '+(i+1)+' close record '+sibling.w.id)+(base.config.edition>=5&&sibling.meals>group.meals?extraMeals(base,variant,i+1):'')+'</td></tr>';
  }).join('');
  const leverLabels={price:'Price',staff:'Staffing',lead:'Supplier lead time',interaction:'Interaction'};
  const attrRows=Object.entries(leverLabels).map(([k,label])=>{
    const e=period.effects[k];
    return '<tr><th scope="row">'+label+'</th>'+['revenue','income','cash','unserved','lost'].map(key=>'<td>'+metric(key,e[key],true)+'</td>').join('')+'</tr>';
  }).join('');
  const guests='The replay serves '+after.meals.toLocaleString('en-US')+' meals against '+before.meals.toLocaleString('en-US')+' in the baseline. Missed meals reduce later demand by '+after.lost+' visits in the replay and '+before.lost+' in the baseline.';
  const payroll=rows=>rows.reduce((sum,r)=>sum+r.w.payrollCents,0);
  const costs=' Over four weeks the payroll change is '+metric('income',payroll(period.last.periods)-payroll(period.first.periods),true)+' and the operating income change is '+metric('income',after.income-before.income,true)+'.';
  return '<h2>Operating impact</h2>'+cardRow+'<section id="four-week"><h3>Four-week service record</h3><p>'+guests+costs+'</p><div class="scroll-table" tabindex="0" role="region" aria-label="Four-week close evidence"><table><caption>Baseline / what-if · source closes</caption><thead><tr><th>Close</th><th>Meals served</th><th>Net revenue</th><th>Records</th></tr></thead><tbody>'+rows+'</tbody></table></div><h3>Four-week attribution</h3><div class="scroll-table" tabindex="0" role="region" aria-label="Four-week lever attribution"><table><caption>Change from the same opening balance and seed</caption><thead><tr><th>Lever</th><th>Net revenue</th><th>Operating income</th><th>Closing cash</th><th>Unserved covers</th><th>Return visits lost</th></tr></thead><tbody>'+attrRows+'</tbody></table></div></section>';
}

export function compareTable(result,week){
 const {base,variant,before,after}=result;
 const cell=(k,n)=>n===null?'—':k==='margin'?(n/100).toFixed(2)+'%':k==='shortages'?String(n):usd(n);
 return (result.period?openingAndMonth(result):'')+'<table><caption>Week '+week+' · policy replay</caption><thead><tr><th>Measure</th><th>Baseline</th><th>What-if</th><th>Change</th></tr></thead><tbody>'+Object.entries({revenue:'Net revenue',margin:'Net margin',shortages:'Unfilled units',cash:'Closing cash'}).map(([k,l])=>'<tr><th>'+l+'</th><td>'+cell(k,before[k])+'</td><td>'+cell(k,after[k])+'</td><td>'+(before[k]===null||after[k]===null?'—':k==='margin'?((after[k]-before[k])/100).toFixed(2)+' pp':cell(k,after[k]-before[k]))+'</td></tr>').join('')+'</tbody></table><p>'+source(base,week*7,base.weeks[week-1],'Baseline close')+' · '+source(variant,week*7,variant.weeks[week-1],'What-if close')+'</p>'+attribution(result);
}
export function operations(m,d,registry){
 const week=Math.max(1,Math.ceil(d/7)),names=registry.map(a=>a.name);
 const {rows,incidents,evaluations}=weekMetrics(m,week,names), pending=pendingRequests(m),first=pending[0];
 const pass=evaluations.filter(e=>e.passed).length,total=Object.values(rows).reduce((n,r)=>n+r.tasks,0);
 const manualUrl='ops.html?'+esc(new URLSearchParams({day:d,business:JSON.stringify({...m.config,humanReview:true})}));
 const queue= !m.config.humanReview?'<p>The running ledger uses the synthetic purchase policy. Open a human-reviewed copy to decide requests that exceed its limit.</p><a class="button" href="'+manualUrl+'#queue">Open decision workspace →</a>':first?
 '<p>'+pending.length+' pending across this run · oldest first</p><h3>'+esc(m.records[m.records[first.purchaseId].materialId].name)+' · '+usd(first.cents)+'</h3><p>'+source(m,d,first.purchaseId,'Purchase '+first.purchaseId)+' · '+source(m,d,first.id,'Escalation '+first.id)+'</p><form id="decide" data-key="'+esc(first.decisionKey)+'"><button name="choice" value="approved" '+(first.cents>first.availableCashCents||first.cents>first.remainingBudgetCents?'disabled':'')+'>Approve purchase</button> <button name="choice" value="rejected">Reject purchase</button></form>':'<p>The queue is empty.</p>';
 const decisions=Object.values(m.records).filter(r=>r.kind==='Approval record'&&r.authority==='Builder visitor');
 const latest=decisions.at(-1);
 return header(m,d)+'<main id="content" class="ops-page"><div class="iso-heading"><div><p class="kicker">'+esc(m.config.name)+' · Business Builder</p><h1>Agent Ops console</h1></div><a href="'+url('hq',m,d)+'">Working floor ↗</a></div>'+tabs(m,d,'ops')+
 '<nav class="tabs" aria-label="Metric week">'+m.weeks.map((_,i)=>'<a '+(week===i+1?'aria-current="true"':'')+' href="'+url('ops',m,7*(i+1))+'">Week '+(i+1)+'</a>').join('')+'</nav>'+
 '<div class="stats"><article><small>Completed tasks</small><strong>'+total+'</strong></article><article><small>VERITAS checks passed</small><strong>'+pass+' / '+evaluations.length+'</strong></article><article><small>Source-linked incidents</small><strong>'+incidents.length+'</strong></article></div>'+
 '<div class="ops-columns"><section class="paper" id="queue"><p class="kicker">Human approval queue</p><h2>Purchase decisions</h2>'+queue+(latest?'<p role="status">Decision recorded · '+source(m,d,latest.id,latest.approved?'Approved':'Rejected')+' · '+source(m,d,latest.purchaseId)+'</p>':'')+'<noscript><p>Decision entry requires JavaScript. Every recorded decision is available in the ledger.</p></noscript></section>'+
 '<section class="paper" id="what-if"><p class="kicker">Scenario comparison</p><h2>What if?</h2><form id="compare"><label>Menu price adjustment (%) <input name="pricePercent" type="number" min="-50" max="100" value="'+(m.config.pricePercent||0)+'" required></label><label>Staff on shift <input name="staffCount" type="number" min="1" max="'+(m.config.edition>=5?7:5)+'" value="'+m.records.TERMS.staffIds.length+'" required></label><label>Supplier lead time (days) <input name="leadDays" type="number" min="0" max="5" value="'+(m.config.leadDays||0)+'" required></label><button>Compare week '+week+'</button></form><small>Both scenarios start from the same seed and use the automatic purchase policy. Visitor decisions belong to their original run.</small></section></div><section id="delta" class="paper" aria-label="What-if comparison results"></section><p role="alert" id="ops-error"></p>'+
 assumptions(m,d)+'<section class="paper"><h2>Specialist performance</h2><p>Success means a task completed without a recorded exception. Handling time is scheduled simulation time. Synthetic handling cost uses '+usd(m.records.TERMS.handlingCentsPerMinute)+' per minute and is excluded from the financial ledger.</p><div class="scroll-table"><table><caption>Week '+week+' · synthetic activity</caption><thead><tr>'+['Specialist','Tasks','Success','Exception','Escalations','Requested','Approved','Rejected','Mean minutes','Cost / task'].map(s=>'<th>'+s+'</th>').join('')+'</tr></thead><tbody>'+Object.entries(rows).map(([n,r])=>'<tr><th>'+ (r.tasks?source(m,d,r.sources[0],n):esc(n))+'</th>'+[r.tasks,pct(r.tasks-r.exceptions,r.tasks),pct(r.exceptions,r.tasks),r.escalations,r.requested,r.approved,r.rejected,r.tasks?(r.minutes/r.tasks).toFixed(1):'—',r.tasks?usd(Math.round(r.costCents/r.tasks)):'—'].map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>'+
 '<div class="ops-columns"><section class="paper"><h2>Incident log</h2><details open><summary>'+incidents.length+' source records</summary><ul>'+incidents.map(x=>'<li>Day '+x.day+' · '+esc(x.label)+' · '+source(m,x.day,x.id)+'</li>').join('')+'</ul></details></section><section class="paper"><h2>Evaluation evidence</h2><p>'+pct(pass,evaluations.length)+' of recorded checks passed.</p>'+evaluations.map(x=>'<p>Day '+x.day+' · '+source(m,x.day,x.id,x.passed?'Passed':'Failed')+'</p>').join('')+'</section></div></main>';
}
export function mountOps(m,d){
 const queue=document.querySelector('#decide'),compare=document.querySelector('#compare'),error=document.querySelector('#ops-error');
 if(queue)queue.onsubmit=e=>{e.preventDefault();try{const result=decide(m,queue.dataset.key,e.submitter.value);location.assign(url('ops',result,d).replaceAll('&amp;','&')+'#queue');}catch(ex){error.textContent=ex.message;}};
 if(compare)compare.onsubmit=e=>{
   e.preventDefault();
   try{
     const changes=Object.fromEntries([...new FormData(compare)].map(([k,v])=>[k,Number(v)]));
     const week=Math.max(1,Math.ceil(d/7)),result=document.querySelector('#delta');
     result.innerHTML=compareTable(compareWeek(m,week,changes),week);
     error.textContent='';
     // Start reading at the new comparison. Older replay editions contain a table without a heading.
     const start=result.querySelector('h2')||result;
     start.tabIndex=-1;start.focus();
   }catch(ex){error.textContent=ex.message;}
 };
}
