import {esc,input,select,money,options,disclosure} from './builder-common.js';
import {siteDesign,publicSite,encodeSite,decodeSite,staticFile,storefront,domainSearch,sections,themes,fonts,siteCSS,defaultAccent} from './studio-site.js';
export const tools={site:'Site editor'};
const ui={area:'site',page:0,device:'desktop',query:'',preview:null};
const button=(action,label,extra='')=>'<button type="button" data-studio="'+action+'" '+extra+'>'+esc(label)+'</button>';
const choose=(name,label,values,chosen)=>select(name,label,values,chosen);
const entries=xs=>Object.fromEntries(xs.map(x=>[x,x]));
function saveFile(html){const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download='simulated-storefront.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function siteEditor(b){
 const s=publicSite(b);ui.page=Math.min(ui.page,s.pages.length-1);const p=s.pages[ui.page];
 return '<div class="studio-columns"><section><h2>Pages and sections</h2><label>Editing page <select name="studio-page">'+options(Object.fromEntries(s.pages.map((p,i)=>[i,p.name])),ui.page)+'</select></label>'+
 '<form data-sform="page">'+input('name','New page name','','required maxlength="48"')+'<button>Add page</button></form>'+button('remove-page','Remove current page',s.pages.length===1?'disabled':'')+
 '<ol class="section-sequence">'+p.sections.map((k,i)=>'<li>'+esc(sections[k])+' <span>'+button('move-up','Up','data-i="'+i+'" aria-label="Move '+sections[k]+' up" '+(i===0?'disabled':''))+button('move-down','Down','data-i="'+i+'" aria-label="Move '+sections[k]+' down" '+(i===p.sections.length-1?'disabled':''))+button('remove-section','Remove','data-i="'+i+'" aria-label="Remove '+sections[k]+'"')+'</span></li>').join('')+'</ol>'+
 '<form data-sform="section">'+choose('section','Section to add',sections,'gallery')+'<button>Add section</button></form><h2>Appearance</h2>'+choose('studio-theme','Theme',themes,s.theme)+choose('studio-font','Typeface',entries(Object.keys(fonts)),s.font)+input('studio-color','Accent',s.accent,'type="color"')+
 '</section><section><h2>Live preview</h2>'+choose('studio-device','Preview width',entries(['desktop','tablet','mobile']),ui.device)+'<div class="studio-frame '+ui.device+'">'+storefront(s,ui.page)+'</div><div class="studio-actions">'+button('publish','Publish (simulated)')+button('export-site','Export static HTML/CSS')+'</div></section></div>'+
 '<h2>Domain search</h2><form data-sform="domain">'+input('domain','Domain idea',ui.query||b.values.concept,'required maxlength="64"')+'<button>Check simulated availability</button></form><p>Simulated — not registered. Results use a fixed spelling rule.</p><ul>'+domainSearch(ui.query||b.values.concept).map(r=>'<li>'+esc(r.domain)+' · '+(r.available?'available in simulation':'unavailable in simulation')+'</li>').join('')+'</ul>';
}
export function studioView(b,r){
 const tabs=Object.entries(tools).map(([key,label])=>button('area',label,'data-area="'+key+'" '+(ui.area===key?'aria-current="page"':''))).join('');
 return '<div class="studio"><style>'+siteCSS+'</style><header class="screen-head"><p class="kicker">'+esc(b.values.concept)+'</p><h1 tabindex="-1">Commerce studio</h1></header><nav class="studio-tabs" aria-label="Studio areas">'+tabs+'</nav><section aria-label="'+esc(tools[ui.area])+'">'+areaBody(b,r)+'</section></div>';
}
function areaBody(b,r){return siteEditor(b);}
export function studioEvent(e,{business:b,apply,render,notice,result}){
 const target=e.target,control=target.closest('[data-studio]'),form=target.closest('form[data-sform]');
 const previewPage=target.closest('[data-shop-page]');
 if(e.type==='click'&&previewPage){ui.page=Number(previewPage.dataset.shopPage);render();return true;}
 const kind=e.type==='click'?control?.dataset.studio:e.type==='submit'?form?.dataset.sform:e.type==='change'&&target.name?.startsWith('studio-')?target.name:null;
 if(!kind)return false;
 e.preventDefault();
 const copy=structuredClone(b);copy.studio??={};
 const d=structuredClone(siteDesign(b));const p=d.pages[ui.page];const i=Number(control?.dataset.i);
 const fields=form?Object.fromEntries(new FormData(form)):{};let changed=true;
 if(kind==='area'){ui.area=control.dataset.area;changed=false;}
 else if(kind==='studio-page'){ui.page=Number(target.value);changed=false;}
 else if(kind==='studio-device'){ui.device=target.value;changed=false;}
 else if(kind==='domain'){ui.query=fields.domain;changed=false;}
 else if(kind==='page'){if(d.pages.length===8)throw Error('Up to eight pages fit in a shareable preview.');d.pages.push({name:fields.name.trim(),sections:['hero']});ui.page=d.pages.length-1;}
 else if(kind==='remove-page'){if(d.pages.length===1)return true;d.pages.splice(ui.page,1);ui.page=0;}
 else if(kind==='section'){if(p.sections.length===12)throw Error('Use up to twelve sections per page.');p.sections.push(fields.section);}
 else if(kind==='remove-section')p.sections.splice(i,1);
 else if(kind==='move-up'||kind==='move-down'){const j=kind==='move-up'?i-1:i+1;if(j>=0&&j<p.sections.length)[p.sections[i],p.sections[j]]=[p.sections[j],p.sections[i]];}
 else if(kind==='studio-font')d.font=target.value;
 else if(kind==='studio-theme'){d.theme=target.value;d.accent=defaultAccent(d.theme);}
 else if(kind==='studio-color')d.accent=target.value;
 else if(kind==='export-site'){saveFile(staticFile(publicSite(b)));return true;}
 else if(kind==='publish'){const token=encodeSite(publicSite(b));history.pushState(null,'',location.pathname+'#preview='+token);openPreview(token);return true;}
 else return false;
 if(changed){copy.studio.design=d;encodeSite(publicSite(copy));apply(copy);}
 render();
 return true;
}
export function openPreview(token){
 const root=document.querySelector('#builder');root.dataset.screen='published';
 try{const site=decodeSite(token);
 const draw=i=>{root.innerHTML='<div class="studio"><style>'+siteCSS+'</style><header class="screen-head"><p class="kicker">Simulated publication</p><h1 tabindex="-1">'+esc(site.name)+'</h1></header><div class="studio-actions"><button id="return-studio">Return to Builder</button></div><label>Shareable preview URL <input readonly value="'+esc(location.href)+'"></label>'+storefront(site,i)+'</div>';
 root.querySelector('#return-studio').onclick=()=>{location.hash='studio';};
 root.querySelectorAll('[data-shop-page]').forEach(el=>el.onclick=e=>{e.stopPropagation();draw(Number(el.dataset.shopPage));});};
 draw(0);
 }catch{root.innerHTML='<h1>Preview unavailable</h1><p>Open a valid simulated publication link.</p><a href="start.html">Return to Builder</a>';}
}
