import {replayLink} from './idea-replay.js';
import {preset,templates} from './engine.js';
export const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
const pageNames={overview:'Overview',ops:'Agent Ops',timeline:'Operations timeline',agents:'Agent activity',ledger:'Ledger',inspector:'Source inspector'};
export function url(page,model,day=1,extra={}){
 if(model.config.edition===7){
   const id=new URLSearchParams(location.hash.slice(1)).get('sim');
   return esc(replayLink(page,id,model.config.shocks,day,{positions:model.config.positions,...extra}));
 }
 const q=new URLSearchParams({day,...extra});
 q.set('v',model.config.edition|| (model.weeks?2:1));
 if(Object.keys(model.config).some(k=>k!=='edition'&&model.config[k]!==preset[k]))q.set('business',JSON.stringify(model.config));
 return page+'.html?'+esc(q);
}
const ref=(m,d,id,label=id)=>'<a class="ref" href="'+url('inspector',m,d,{id})+'">'+esc(label)+'</a>';

export function shell(title,body){
return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><title>'+esc(title)+' · NASHA</title><link rel="icon" href="../mark.svg"><link rel="stylesheet" href="style.css"><script type="module" src="app.js"></script></head><body><a class="skip" href="#content">Skip to content</a><div id="app">'+body.replace('<main id="content"','<main id="content" tabindex="-1"')+'</div></body></html>';
}
export function header(m,d){
 const sections = '<nav class="workspace-links" aria-label="Workspace"><a href="'+url('hq',m,d)+'">Headquarters</a><a href="'+url('overview',m,d)+'">Builder</a></nav>';
 return "<header class=\"portfolio-head\"><a class=\"folio-mark\" href=\"../index.html\" aria-label=\"Ritesh Mamidi, home\">Ritesh Mamidi<span aria-hidden=\"true\">.</span></a><button type=\"button\" class=\"menu-button\" aria-controls=\"navigation\" aria-expanded=\"false\" hidden>Menu</button><nav id=\"navigation\" aria-label=\"Portfolio\"><a href=\"../index.html\">Home</a><a href=\"../pavilion/index.html\">NASHA</a><a href=\"../pavilion/simulator.html\">Simulator</a><a href=\"../projects.html\">Projects</a><a href=\"../skills.html\">Skills</a><a href=\"../case-studies.html\">Case studies</a><a href=\"../recruiter.html\">Recruiters</a><a href=\"../recruiter.html#resumes\">R\u00e9sum\u00e9</a></nav></header>" + sections;
}
export function tabs(m,d,active){return '<nav class="tabs" aria-label="Business views">'+Object.entries(pageNames).map(([p,n])=>'<a '+(p===active?'aria-current="page" ':'')+'href="'+url(p,m,d)+'">'+n+'</a>').join('')+'</nav>';}
export function dayNav(m,d,page){
 const week=Math.max(1,Math.ceil(d/7));
 const weeks=m.weeks?'<nav class="tabs" aria-label="Choose operating week">'+m.weeks.map((_,i)=>'<a href="'+url(page,m,7*(i+1))+'" '+(i+1===week?'aria-current="true"':'')+'>Week '+(i+1)+'</a>').join('')+'</nav>':'';
 const days=m.days.flatMap((_,i)=>!i||!m.weeks||Math.ceil(i/7)===week?[i]:[]);
 return weeks+'<nav class="days" aria-label="Choose operating day">'+days.map(i=>'<a href="'+url(page,m,i)+'" '+(i===d?'aria-current="date"':'')+'>'+(i?'Day '+i:'Opening')+'</a>').join('')+'</nav>';
}
function weekView(m,d){
 const id=m.weeks?.[d/7-1];if(!id)return '';
 const w=m.records[id];
 const rows=[['Sales',w.salesCents],['Refunds',-w.refundCents],['Ingredients consumed',-w.ingredientCostCents],['Payroll',-w.payrollCents],['Rent',-w.rentCents],['Utilities',-w.utilitiesCents],['Net income',w.netIncomeCents]];
 return '<section class="paper week-close" id="week-close"><p class="kicker">Days '+w.from+'–'+w.through+' · synthetic operating statement</p><h2>Week '+w.week+' close</h2><div class="columns"><div>'+rows.map(([k,n])=>'<div class="row"><span>'+k+'</span>'+ref(m,d,id,money(n))+'</div>').join('')+'</div><div><h3>Cash &amp; obligations</h3><p>Closing cash '+ref(m,d,id,money(w.closingCashCents))+'</p><p>Sales tax collected '+ref(m,d,id,money(w.taxCollectedCents))+', refunded '+ref(m,d,id,money(w.taxRefundedCents))+', remitted '+ref(m,d,id,money(w.taxRemittedCents))+'.</p><p>Operating liabilities '+ref(m,d,id,money(w.operatingDueCents))+' · tax payable '+ref(m,d,id,money(w.taxDueCents))+'</p>'+ref(m,d,id,'Inspect all seven daily closes →')+'</div></div></section>';
}
const heading=(k,t,detail='')=>'<div class="section-head"><div><p class="kicker">'+esc(k)+'</p><h1>'+esc(t)+'</h1></div>'+detail+'</div>';
export function timeline(m,d){return '<ol class="timeline">'+m.events.filter(e=>e.day===d).map(e=>'<li><div><strong>'+esc(e.owner)+'</strong><small>'+e.id+'</small></div><div><h3>'+esc(e.action)+'</h3>'+e.outputs.map(id=>ref(m,d,id,m.records[id].kind)).join(' ')+'</div></li>').join('')+'</ol>';}
function recordView(m,d,id){
 if(id!==null&&id!==undefined&&!Object.hasOwn(m.records,id))return '<section class="paper"><h2>Source unavailable</h2><p>This record ID does not exist in the selected business.</p></section>';
 const r=m.records[id??m.days[d]];
 function value(v){if(Array.isArray(v))return v.map(value).join(' · ');if(v&&typeof v==='object')return '<dl>'+Object.entries(v).map(([k,x])=>'<dt>'+(Object.hasOwn(m.records,k)?ref(m,d,k):esc(k))+'</dt><dd>'+value(x)+'</dd>').join('')+'</dl>';return typeof v==='string'&&Object.hasOwn(m.records,v)?ref(m,d,v):esc(v);}
 const linked=m.events.filter(e=>e.outputs.includes(r.id)||e.inputs.includes(r.id));
 return '<section class="paper"><p class="kicker">'+esc(r.id)+'</p><h2>'+esc(r.kind)+'</h2><dl>'+Object.entries(r).filter(([k])=>!['id','kind'].includes(k)).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+value(v)+'</dd>').join('')+'</dl></section><h2>Event provenance</h2>'+linked.map(e=>'<article class="row"><strong>'+e.owner+' · '+esc(e.action)+'</strong><small>'+e.id+'</small><p>Inputs '+e.inputs.map(id=>ref(m,d,id)).join(' ')+'</p><p>Outputs '+e.outputs.map(id=>ref(m,d,id)).join(' ')+'</p></article>').join('');
}
function wizard(){return '<form id="create" class="paper" action="overview.html"><input type="hidden" name="day" value="0"><fieldset><legend>Choose a business</legend><div class="presets">'+Object.entries(templates).map(([k,v])=>'<label><input required type="radio" name="template" value="'+k+'" '+(k==='brewery'?'checked':'')+'> '+esc(v[0])+'</label>').join('')+'</div></fieldset><fieldset><legend>Opening assumptions</legend><div class="fields">'+[['name','Business name','NASHA Brewery'],['location','Fictional location','Limestone Court'],['budget','Opening budget · USD','15000'],['seed','Scenario seed','27']].map(([n,l,v])=>'<label>'+l+'<input required name="'+n+'" value="'+v+'" '+(['budget','seed'].includes(n)?'type="number" min="'+(n==='budget'?500:1)+'" max="'+(n==='budget'?1000000:999999)+'" step="1"':'maxlength="56"')+'></label>').join('')+'<label>Operating size<select name="size"><option>Studio</option><option>House</option><option>Campus</option></select></label></div></fieldset><fieldset><legend>Menu and staffing</legend><div class="fields">'+[1,2,3].map(i=>'<label data-recipe-row="'+i+'">Recipe '+i+' name<input name="menu'+i+'" maxlength="48" placeholder="Use template name"></label><label data-recipe-row="'+i+'">Price · USD<input name="price'+i+'" type="number" min="0.01" max="1000" step="0.01" placeholder="Use template price"></label>').join('')+'<label>Staff names, comma-separated<input required name="staffNames" maxlength="184" value="Rowan, Mika, Sol, Ari"></label></div></fieldset><p id="error" role="alert"></p><button>Create business</button></form>';}
export function builder(page,m,d,registry,id){
 const balance=m.records[m.days[d]], a=balance.accounts,ev=m.events.filter(e=>e.day===d);
 let html=header(m,d)+'<main id="content"><div class="app-intro"><p class="kicker">NASHA AI Business Builder</p><p class="disclose">Simulation — rule-based, synthetic data</p></div>'+heading(m.config.location,page==='create'?'Start a business':m.config.name,page==='create'?'':'<a class="button secondary" href="create.html">New business</a>')+tabs(m,d,page);
 if(page==='create'||page==='overview')html+='<p><a href="simulator.html">Simulate your idea</a></p>';
 if(page==='create')return html+wizard()+'</main>';
 html+=dayNav(m,d,page);
 if(page==='overview'){
 if(m.config.edition>=3&&m.config.edition!==7)html+='<p><a href="'+url('ops',m,d)+'#model-assumptions">Brewpub model assumptions and four-week performance →</a></p>';
 html+='<div class="stats">'+[['Cash',a.cash],['Inventory at cost',a.stock],[m.weeks?'Net income to date':'Trading profit to date',balance.incomeCents]].map(([k,v])=>'<article><small>'+k+'</small>'+ref(m,d,balance.id,money(v))+'</article>').join('')+'</div><div class="columns"><section class="paper"><p class="kicker">Product book</p><h2>On the counter</h2>'+m.products.map(k=>'<div class="row">'+ref(m,d,k,m.records[k].name)+'<span>'+ref(m,d,k,money(m.records[k].priceCents))+'</span></div>').join('')+'<h3>Ingredient inventory</h3>'+m.ingredients.map(k=>'<div class="row">'+ref(m,d,k,m.records[k].name)+ref(m,d,balance.id,balance.closingStock[k]+' units')+'</div>').join('')+'</section><section class="paper dark"><p class="kicker">Opening file</p><h2>From scratch</h2><p>'+esc(m.config.size)+' operation in fictional '+esc(m.config.location)+'.</p>'+ref(m,d,'PLAN','Budget, suppliers, staff & marketing plan')+(d<m.days.length-1?'<hr><a href="'+url('overview',m,d+1)+'">Next operating day →</a>':'')+'<hr><a href="'+url('hq',m,d)+'">Enter headquarters →</a><hr><a href="'+url('bridge',m,d)+'">Visit the brewery →</a></section></div>';
 }else if(page==='timeline'){html+='<h2>Shift log</h2>'+timeline(m,d);}
 else if(page==='ledger'){
 html+=weekView(m,d)+'<div class="paper"><p class="kicker">Daily close</p><h2>Balance sheet</h2><div class="accounts">'+Object.entries(a).map(([k,v])=>'<div><small>'+esc(k)+' · '+(v<0?'credit':'debit')+'</small>'+ref(m,d,balance.id,money(Math.abs(v)))+'</div>').join('')+'</div><p>Debit less credit '+ref(m,d,balance.id,money(balance.trialBalanceCents))+' · Stock ties to ingredient movements.</p><small>'+(m.weeks?'Net income includes refunds, ingredient cost, accrued payroll, rent and utilities. Sales tax is payable until remitted. '+ref(m,d,'TERMS','Inspect rates and settlement rules'):'Trading profit includes sales, refunds and consumed ingredients. Payroll, rent and tax are outside this model.')+'</small></div><h2>Journal entries</h2>'+balance.journalIds.map(id=>{const j=m.records[id];return '<div class="row"><div>'+ref(m,d,id,j.debit+' / '+j.credit)+'<small>Source '+ref(m,d,j.source)+'</small></div>'+ref(m,d,id,money(j.cents))+'</div>';}).join('');
 }else if(page==='agents'){html+='<h2>Specialist activity</h2><p><span>AI-generated concept art</span> · Canonical portraits</p><div class="agent-list">'+registry.map(g=>'<article class="paper"><img class="avatar" src="../assets/img/agents/'+g.slug+'.webp" alt=""><h3>'+g.name+'</h3><small>'+g.role+'</small>'+ (ev.filter(e=>e.owner===g.name).map(e=>'<p>'+ref(m,d,e.outputs[0],e.action)+'</p>').join('')||'<p>Idle this shift</p>')+'</article>').join('')+'</div>';}
 else if(page==='inspector'){html+=recordView(m,d,id);}
 return html+'</main>';
}
