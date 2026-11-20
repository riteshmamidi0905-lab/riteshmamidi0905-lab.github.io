import {defaults,districts,fields,profiles,scenarios,tiers,validateIdea} from './idea-profiles.js';
import {examples,normalizeHours,parseIdea} from './idea-parser.js';
import {assess,runIdea,stressComparison,summarize} from './idea-analysis.js';
import {recallIdea,rememberIdea,replayLink} from './idea-replay.js';
import {assumptionDetails,calibrationTables,baselineText,chart,dollars,ledgerRows,num,reportView,sourceLink,table} from './idea-report.js';
import {esc} from './views.js';

const root=document.querySelector('#workspace'),message=document.querySelector('#message');
let draft=null,assessment=null,id=null,prompt='',selected=[];
const buttons=(label,ident,quiet=false)=>`<button type="button" id="${ident}" class="${quiet?'quiet':''}">${esc(label)}</button>`;
const action=(key,fn)=>{document.getElementById(key).onclick=fn;};
function stage(index,html,focus=true){
 root.innerHTML=html;
 document.querySelectorAll('.steps li').forEach((node,i)=>{if(i===index)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');});
 if(focus){const h=root.querySelector('h1');h.tabIndex=-1;h.focus();}
 message.textContent='';
}
function fail(error){const p=root.querySelector('[role="alert"]');if(p){p.textContent=error.message;p.focus();}else message.textContent=error.message;}
function entry(focus=true){
 const sample=defaults('coffee'),example=summarize(runIdea(sample));
 stage(0,`<div class="spread"><section><p class="kicker">Business simulator</p><h1 class="entry-title">Describe your business idea.</h1><p class="lead">See what four weeks of trading could look like. Start with a sentence, then adjust the assumptions before you run it.</p>
 <form class="idea-entry" id="idea-form"><label class="sr-only" for="pitch">Describe your business idea.</label><textarea id="pitch" maxlength="1000" required placeholder="A neighborhood café in Austin, with 36 seats and three baristas…">${esc(prompt)}</textarea>
 <div class="examples"><label for="example">Try an example<select id="example"><option value="">Choose one of ten ideas</option>${examples.map((v,i)=>`<option value="${i}">${esc(['Neighborhood salon','Austin brewpub','Downtown coffee roaster','Bread bakery','Taco truck','Retail boutique','Suburban barbershop','Café or bakery?','Microbrewery','Gift shop'][i])}</option>`).join('')}</select></label></div>
 <p role="alert" tabindex="-1" class="error"></p><button>Review my idea →</button></form></section>
 <aside class="night-card"><p class="kicker">Example forecast · Synthetic</p><h2>Neighborhood café</h2><p>Four opening weeks with 36 seats and three baristas.</p>${chart(example.weeks,'visits',true)}<div class="mini-row"><span>28-day net sales</span><b>${dollars(example.numbers.revenue)}</b></div><div class="mini-row"><span>Opening cash</span><b>${dollars(sample.budget*100)}</b></div><p class="micro">Edit your own assumptions to see a different projection.</p></aside></div>`,focus);
 document.querySelector('#example').onchange=e=>{if(e.target.value!==''){document.querySelector('#pitch').value=examples[Number(e.target.value)];const pitch=document.querySelector('#pitch');pitch.focus();pitch.setSelectionRange(0,0);pitch.scrollTop=0;}};
 document.querySelector('#idea-form').onsubmit=e=>{e.preventDefault();try{prompt=document.querySelector('#pitch').value;draft=parseIdea(prompt);confirmIdea();}catch(error){fail(error);}};
}
const options={type:Object.fromEntries(Object.entries(profiles).map(([k,p])=>[k,p.label])),tier:Object.fromEntries(Object.keys(tiers).map(k=>[k,k])),neighborhood:Object.fromEntries(Object.keys(districts).map(k=>[k,k]))};
function field(k){
 const v=draft.values[k],question=draft.questions[k];
 const attrs=`id="f-${k}" data-field="${k}" required aria-describedby="src-${k}${question?' q-'+k:''}"`;
 const input=Object.hasOwn(options,k)?`<select ${attrs}>${k==='type'?'<option value="">Choose a format</option>':''}${Object.entries(options[k]).map(([value,label])=>`<option value="${value}" ${value===v?'selected':''}>${esc(label)}</option>`).join('')}</select>`:
 `<input ${attrs} value="${esc(v)}" ${k==='staff'?'type="number" min="1" max="12" step="1"':k==='budget'?'type="number" min="500" max="1000000" step="1"':'type="text"'}>`;
 return `<div class="field"><label for="f-${k}">${esc(fields[k])}<span aria-hidden="true" id="badge-${k}" class="origin">${draft.status[k]}</span></label>
 <span id="src-${k}" class="sr-only">Source: ${draft.status[k]}</span>${input}${question?`<p class="question" id="q-${k}">${esc(question)} ${v===''?'':'<button class="quiet keep" type="button" data-keep="'+k+'">Use displayed value</button>'}</p>`:''}</div>`;
}
function confirmIdea(focus=true){
 stage(1,`<p class="kicker">Confirm your assumptions</p><h1>Here’s what I understood</h1><p class="lead">Edit any field. Parsed values came from your sentence. Defaults are synthetic planning inputs.</p><form id="confirm"><div class="form-grid">${Object.keys(fields).map(field).join('')}</div>
 <p role="alert" class="error" tabindex="-1"></p><div class="actions"><button>Simulate four weeks →</button>${buttons('Edit description','edit-pitch',true)}</div></form>`,focus);
 const mark=k=>{draft.status[k]='user-set';delete draft.questions[k];document.querySelector('#badge-'+k).textContent='user-set';document.querySelector('#src-'+k).textContent='Source: user-set';document.querySelector('#q-'+k)?.remove();document.querySelector('#f-'+k).setAttribute('aria-describedby','src-'+k);};
 for(const input of root.querySelectorAll('[data-field]')){
   const k=input.dataset.field;
   input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{
     draft.values[k]=['budget','staff'].includes(k)?Number(input.value):input.value;
     mark(k);
     if(k==='type'){
       const replacement=defaults(input.value);for(const field of Object.keys(fields))if(draft.status[field]==='defaulted')draft.values[field]=replacement[field];
       confirmIdea(false);document.querySelector('#f-type').focus();
     }
   });
 }
 for(const keep of root.querySelectorAll('[data-keep]'))keep.onclick=()=>{const k=keep.dataset.keep;document.querySelector('#f-'+k).focus();if(draft.values[k]!=='')mark(k);};
 action('edit-pitch',()=>entry());
 document.querySelector('#confirm').onsubmit=async e=>{e.preventDefault();
   try{
     const unresolved=Object.keys(draft.questions);if(unresolved.length){document.querySelector('#f-'+unresolved[0]).focus();throw Error('Answer or confirm the highlighted question for '+fields[unresolved[0]]+'.');}
     draft.values.hours=normalizeHours(draft.values.hours)||draft.values.hours;
     draft.values.size=draft.values.size.trim().toLowerCase().replace(/square feet|sqft/,'sq ft');
     validateIdea(draft.values);id=rememberIdea(draft.values);sessionStorage.setItem('pavilion-origins-'+id,JSON.stringify(draft.status));
     const submit=e.submitter;submit.disabled=true;submit.textContent='Running the four-week ledger…';message.textContent=submit.textContent;
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     assessment=assess(draft.values);selected=[];sessionStorage.setItem('pavilion-last-idea',id);projection();
   }catch(error){if(e.submitter){e.submitter.disabled=false;e.submitter.textContent='Simulate four weeks →';}fail(error);}
 };
}
function metric(label,value){return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;}
function projection(){
 const idea=draft.values,b=assessment.baseline,unit=profiles[idea.type].unit;
 stage(2,`<p class="kicker">Four-week projection · Synthetic</p><h1>${esc(idea.concept)}</h1><p class="lead">${esc(profiles[idea.type].label)} · ${esc(idea.city)} · ${esc(idea.size)} · ${idea.staff} staff</p>
 <div class="metrics">${metric('Net sales',dollars(b.numbers.revenue))}${metric('Operating income',dollars(b.numbers.income))}${metric('Closing cash',dollars(b.numbers.cash))}</div>
 <div class="actions">${buttons('Run a stress test','stress')}${buttons('Launch readiness report','report',true)}<a class="btn quiet" href="${esc(replayLink('hq',id,[],7,{beat:4}))}">Replay this business in HQ</a></div>
 <div class="spread"><section class="sheet"><p class="kicker">Source ledger</p><h2>Four weekly closes</h2>${ledgerRows(b,id,[],unit)}<p class="source-line">Open a week to inspect its posted daily closes.</p></section><section class="sheet"><h2>${esc(unit[0].toUpperCase()+unit.slice(1))} served</h2>${chart(b.weeks,unit)}</section></div>
 <details class="sheet"><summary>Model assumptions · synthetic</summary>${assumptionDetails(idea)}${calibrationTables()}</details><div class="secondary-actions">${buttons('Edit assumptions','edit',true)}${buttons('Describe another idea','restart',true)}</div>`);
 action('stress',()=>stress(selected.length?selected:['slow']));action('report',report);action('edit',()=>confirmIdea());action('restart',()=>{prompt='';entry();});
}
function stress(keys,focus=true){
 selected=keys;const idea=draft.values,unit=profiles[idea.type].unit,c=stressComparison(idea,assessment,keys),b=assessment.baseline,a=c.result;
 const leverRows=Object.entries(c.effects).map(([k,e])=>[esc(k==='interaction'?'Interaction':scenarios[k].label),dollars(e.revenue),dollars(e.income),dollars(e.cash)]);
 const delta=a.numbers.income-b.numbers.income, labels=keys.map(k=>scenarios[k].label);
 const cashReason=a.numbers.revenue<b.numbers.revenue&&a.numbers.cash>b.numbers.cash?'<p>Sales fell while closing cash rose. The cash bridge below separates stock payments, operating payments and tax timing.</p>':'';
 stage(3,`<p class="kicker">Stress tests · Four weeks</p><h1>Test the plan.</h1><p class="lead">${esc(idea.concept)} · Compare one change against the same opening cash, prices and seed.</p>
 <div class="stress-nav" aria-label="Choose a stress test">${Object.entries(scenarios).map(([k,s])=>`<button type="button" class="quiet" data-stress="${k}" aria-pressed="${keys.includes(k)}">${s.label}</button>`).join('')}<button type="button" class="quiet" id="combined" aria-pressed="${keys.length>1}">Combine all six</button></div>
 <section class="sheet" id="impact" tabindex="-1"><p class="kicker">${keys.length===1?scenarios[keys[0]].value:'Six simultaneous levers'}</p><h2>${keys.length===1?labels[0]:'Combined stress'}</h2>${keys.map(k=>'<p>'+esc(scenarios[k].reason)+'</p>').join('')}
 ${table(['28-day measure','Baseline','Stress','Change'],[['Net sales',dollars(b.numbers.revenue),dollars(a.numbers.revenue),dollars(a.numbers.revenue-b.numbers.revenue)],['Operating income',dollars(b.numbers.income),dollars(a.numbers.income),dollars(delta)],['Closing cash',dollars(b.numbers.cash),dollars(a.numbers.cash),dollars(a.numbers.cash-b.numbers.cash)],[esc(unit),num(b.numbers.meals),num(a.numbers.meals),num(a.numbers.meals-b.numbers.meals)]])}</section>
 <section class="sheet"><h2>Where the change came from</h2>${table(['Lever','Net sales','Income','Cash'],leverRows)}<p class="note">Interaction is the combined change left after adding each lever in isolation.</p>${cashReason}
 <details><summary>Cash bridge and source closes</summary>${table(['Posted cash movement','Baseline','Stress'],['opening','revenue','stock','operating','tax'].map(k=>[esc(k),dollars(b.cashBridge[k]),dollars(a.cashBridge[k])]))}</details><p class="source-line">Baseline · ${b.weeks.map(w=>sourceLink(id,[],w)).join(' · ')}<br>Stress · ${a.weeks.map(w=>sourceLink(id,keys,w)).join(' · ')}</p></section>
 <div class="actions">${buttons('Launch readiness report','report')}${buttons('Back to projection','back-results',true)}</div>`,focus);
 for(const el of root.querySelectorAll('[data-stress]'))el.onclick=()=>{stress([el.dataset.stress],false);document.querySelector('[data-stress="'+el.dataset.stress+'"]').focus();message.textContent=scenarios[el.dataset.stress].label+' results updated.';};
 action('combined',()=>{stress(Object.keys(scenarios),false);document.querySelector('#combined').focus();message.textContent='Combined stress results updated.';});
 action('back-results',projection);action('report',report);
}
function report(){stage(4,reportView(draft.values,draft.status,assessment,id));action('print',()=>window.print());action('back-results',projection);}
try{
 const nav=performance.getEntriesByType('navigation')[0]?.type;
 const key=new URLSearchParams(location.hash.slice(1)).get('sim')||(['back_forward','reload'].includes(nav)?sessionStorage.getItem('pavilion-last-idea'):null);
 if(key){id=key;draft={values:recallIdea(id),status:JSON.parse(sessionStorage.getItem('pavilion-origins-'+id)||'{}'),questions:{}};assessment=assess(draft.values);projection();}
 else entry(false);
}catch(error){entry(false);fail(error);}
