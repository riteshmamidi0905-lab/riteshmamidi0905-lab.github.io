import {builder,header,url,esc,shell} from './views.js';
import {operations} from './ops.js';
import {readWizard} from './business-settings.js';
import {templates} from './engine.js';
import {headquarters} from './floor.js';
import {preset,simulate,simulateCurrentPeriod,simulateOperatingPeriod} from './engine.js';
export const routes=['index','create','overview','timeline','ledger','ops','agents','inspector','hq','bridge'];
const art=['arrival','atrium','brewery'];
const registry=[{"name":"AETHON","slug":"aethon","role":"Strategy Intelligence"},{"name":"ZYBREW","slug":"zybrew","role":"Brewing Intelligence"},{"name":"PYRIX","slug":"pyrix","role":"Culinary Innovation"},{"name":"VECTRA","slug":"vectra","role":"Inventory Intelligence"},{"name":"NEXORA","slug":"nexora","role":"Procurement Intelligence"},{"name":"QUANTIX","slug":"quantix","role":"Financial Analytics"},{"name":"ECHON","slug":"echon","role":"Customer Intelligence"},{"name":"NOVARA","slug":"novara","role":"Marketing Intelligence"},{"name":"SYNAPSE","slug":"synapse","role":"Workflow Orchestration"},{"name":"AEGIS","slug":"aegis","role":"Quality & Compliance"},{"name":"CORTEX","slug":"cortex","role":"Knowledge & Research"},{"name":"VERITAS","slug":"veritas","role":"AI Evaluation"}];
function plate(art,key,alt){return '<picture><source media="(max-width:700px)" srcset="../assets/img/pavilion/'+key+'-small.webp"><img class="plate" src="../assets/img/pavilion/'+key+'.webp" alt="'+esc(alt)+'"></picture>';}
const presetMonth=simulateCurrentPeriod();
export function context(params){
 let config=preset;
 if(params.has('business'))config=JSON.parse(params.get('business'));
 else if(params.has('template')){config=Object.fromEntries(Object.keys(preset).map(k=>[k,params.get(k)]));config.seed=Number(config.seed);config.budget=Number(config.budget);readWizard(params,config,templates);}
 const legacy=params.get('v')==='1'||(!params.has('v')&&(params.has('id')||params.has('event')));
 const archived=params.get('v')==='2'||(!params.has('v')&&params.has('business')&&!config.edition);
 const cycle5=params.get('v')==='3'||(!params.has('v')&&config.edition===3);
 const cycle6=params.get('v')==='4'||(!params.has('v')&&config.edition===4);
 const cycle7=params.get('v')==='5'||(!params.has('v')&&config.edition===5);
 const m=legacy?simulate(config):cycle5?simulateOperatingPeriod({...config,edition:3}):cycle6?simulateOperatingPeriod({...config,edition:4}):cycle7?simulateOperatingPeriod({...config,edition:5}):archived?simulateOperatingPeriod({...config,edition:2}):config===preset?presetMonth:simulateCurrentPeriod(config),d=Number(params.get('day')??1);
 if(!Number.isSafeInteger(d)||d<0||d>=m.days.length)throw Error('Day outside this operating period.');
 return {m,d};
}
export function render(page,params){
 const {m,d}=context(params);let body;
 if(page==='index'){
 body=header(m,d)+'<main id="content" class="arrival"><section class="hero">'+plate(art,'arrival','Evening arrival at a limestone and bronze research pavilion')+'<div class="hero-copy"><p class="kicker">NASHA AI Universe</p><h1>The working<br><em>pavilion.</em></h1><p>Follow a business from its opening ledger to the studios where each decision takes shape.</p><div class="actions"><a class="button light" href="'+url('hq',m,d)+'">Enter headquarters →</a><a href="'+url('create',m,d)+'">Create a business</a></div></div><small class="credit">'+(art.includes('arrival')?'AI-generated concept art':'Existing architectural illustration')+'</small></section><div class="entry-grid"><a href="'+url('overview',m,d)+'"><small>Enterprise</small><h2>Business Builder</h2><p>Open the synthetic operating week.</p></a><a href="'+url('bridge',m,d)+'"><small>Hospitality</small><h2>The brewery</h2><p>Step into the original NASHA concept.</p></a><a href="../recruiter.html"><small>Engineering</small><h2>Meet Ritesh</h2><p>Engineering evidence and résumé.</p></a></div><footer><a href="../index.html">Return to portfolio</a><a href="engineering-case.html">Recruiter case study · Auditable business simulation</a></footer></main>';
 }else if(page==='bridge'){
 body=header(m,d)+'<main id="content" class="arrival"><section class="hero bridge">'+plate(art,'brewery','Warm dining terrace beside copper brewing tanks')+'<div class="hero-copy"><p class="kicker">Hospitality · Founder vision</p><h1>At the court.</h1><p>Explore the brewery founder vision or return to the selected operating day.</p><div class="actions"><a class="button light" rel="noreferrer" href="../lab-explorer.html#concept">Brewery founder vision</a><a href="'+url('overview',m,d)+'">Return to '+esc(m.config.name)+' · Day '+d+'</a></div></div>'+(art.includes('brewery')?'<small class="credit">AI-generated concept art</small>':'')+'</section></main>';
 }else if(page==='hq'){
 body=headquarters(m,d,registry,art);
 }else if(page==='ops'){body=operations(m.weeks?m:simulateOperatingPeriod(m.config),d,registry);
 }else body=builder(page,m,d,registry,params.get('id'));
 const html=shell(page==='index'?'The working pavilion':page,body.replace('</main>','<noscript><p>Read <a href="source-book.html">all 28 days and source records</a> with scripts disabled.</p></noscript></main>'));
 return ['hq','ops'].includes(page)?html.replace('</head>','<link rel="stylesheet" href="iso.css"><noscript><style>.floor-page .hq-stage{height:170px;min-height:0}</style></noscript></head>'):html;
}
