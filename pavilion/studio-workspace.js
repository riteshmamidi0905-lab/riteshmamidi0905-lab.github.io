import {domainIdeas} from './builder-site.js';
import {esc,input,select,money,options} from './builder-common.js';
import {siteDesign,publicSite,encodeSite,decodeSite,staticFile,storefront,domainSearch,sections,themes,fonts,storefrontCSS as siteCSS,focusOffering,defaultAccent} from './studio-site.js';
import {storeTabs,storeBody,paymentsBody,storeEvent} from './studio-store.js';
import {paymentBook,catalog,cartQuote,placeOrder,events} from './studio-ledger.js';
import {sourceFor} from './builder-results.js';
import {recordHTML} from './builder-dashboard.js';
import {growthBody,growthEvent,growRecords} from './studio-growth.js';
import {analytics,analyticsBody} from './studio-insights.js';
import {operationsBody,operationsEvent,operationsRecords} from './studio-operations.js';
import {copyBody,copyEvent} from './studio-copy.js';
import {launchCase,launchBody} from './studio-launch.js';
export const tools={site:'Site editor',...storeTabs,growth:'Marketing',analytics:'Analytics',ops:'Operations',copy:'Copy assistant',launch:'Launch day'};
const fresh=()=>({area:'site',page:0,device:'desktop',query:'',cart:[]});
let ui=fresh(),workspaceKey;
const button=(action,label,extra='')=>'<button type="button" data-studio="'+action+'" '+extra+'>'+esc(label)+'</button>';
const choose=(name,label,values,chosen)=>select(name,label,values,chosen);
const entries=xs=>Object.fromEntries(xs.map(x=>[x,x]));
function saveFile(html,name){const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download=domainIdeas(name)[0].split('.')[0]+'-preview.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function siteEditor(b){
 const s=publicSite(b);ui.page=Math.min(ui.page,s.pages.length-1);const p=s.pages[ui.page];
 return '<div class="studio-columns"><section><h2>Pages and sections</h2><label>Editing page <select name="studio-page">'+options(Object.fromEntries(s.pages.map((p,i)=>[i,p.name])),ui.page)+'</select></label>'+
 '<form data-sform="page">'+input('name','New page name','','required maxlength="48"')+'<button>Add page</button></form>'+button('remove-page','Remove current page',s.pages.length===1?'disabled':'')+
 '<ol class="section-sequence">'+p.sections.map((k,i)=>'<li>'+esc(sections[k])+' <span>'+button('move-up','Up','data-i="'+i+'" aria-label="Move '+sections[k]+' up" '+(i===0?'disabled':''))+button('move-down','Down','data-i="'+i+'" aria-label="Move '+sections[k]+' down" '+(i===p.sections.length-1?'disabled':''))+button('remove-section','Remove','data-i="'+i+'" aria-label="Remove '+sections[k]+'"')+'</span></li>').join('')+'</ol>'+
 '<form data-sform="section">'+choose('section','Section to add',sections,'gallery')+'<button>Add section</button></form>'+
 (p.sections.length?'<details><summary>Edit section copy</summary><form data-sform="section-copy">'+choose('position','Section',Object.fromEntries(p.sections.map((k,i)=>[i,(i+1)+'. '+sections[k]])),0)+input('title','Section heading',p.notes?.[0]?.title||'','maxlength="72"')+input('body','Section text',p.notes?.[0]?.body||'','maxlength="200"')+'<button>Save section copy</button></form></details>':'')+'<h2>Appearance</h2>'+choose('studio-theme','Theme',themes,s.theme)+choose('studio-font','Typeface',entries(Object.keys(fonts)),s.font)+input('studio-color','Accent',s.accent,'type="color"')+
 '</section><section><h2>Live preview</h2>'+choose('studio-device','Preview width',entries(['desktop','tablet','mobile']),ui.device)+'<div class="studio-frame '+ui.device+'">'+storefront(s,ui.page)+'</div><div class="studio-actions">'+button('publish','Publish (simulated)')+button('export-site','Export static HTML/CSS')+'</div></section></div>'+
 '<h2>Domain search</h2><form data-sform="domain">'+input('domain','Domain idea',ui.query||b.values.concept,'required maxlength="64"')+'<button>Check simulated availability</button></form><p>Simulated — not registered. Results use a fixed spelling rule.</p><ul>'+domainSearch(ui.query||b.values.concept).map(r=>'<li>'+esc(r.domain)+' · '+(r.available?'available in simulation':'unavailable in simulation')+'</li>').join('')+'</ul>';
}
export function studioView(b,r,key){
 if(key!==workspaceKey){ui=fresh();workspaceKey=key;}
 const tabs=Object.entries(tools).map(([key,label])=>button('area',label,'data-area="'+key+'" '+(ui.area===key?'aria-current="page"':''))).join('');
 return '<div class="studio"><style>'+siteCSS+'</style><header class="screen-head"><p class="kicker">'+esc(b.values.concept)+'</p><h1 tabindex="-1">Commerce studio</h1></header><nav class="studio-tabs" aria-label="Studio areas">'+tabs+'</nav><section aria-label="'+esc(tools[ui.area])+'">'+areaBody(b,r)+'</section></div>';
}
function areaBody(b,r){if(ui.area==='launch')return launchBody(b,r);if(ui.area==='copy')return copyBody(b,ui);if(ui.area==='ops')return operationsBody(b,r);if(ui.area==='analytics')return analyticsBody(b,r);if(ui.area==='growth')return growthBody(b,r);if(ui.area==='store')return storeBody(b,ui);if(ui.area==='payments')return paymentsBody(b,r);return siteEditor(b);}
export function studioEvent(e,{business:b,apply,render,notice,result}){
 const target=e.target,control=target.closest('[data-studio]'),form=target.closest('form[data-sform]');
 const cta=target.closest('[data-shop-cta]');
 if(e.type==='click'&&cta){const page=Number(cta.dataset.shopCta);if(page>=0)ui.page=page;render();focusOffering(document.querySelector('.studio-frame'),page);return true;}
 const previewPage=target.closest('[data-shop-page]');
 if(e.type==='click'&&previewPage){ui.page=Number(previewPage.dataset.shopPage);render();return true;}
 if(e.type==='change'&&target.name==='position'&&form?.dataset.sform==='section-copy'){
   const value=siteDesign(b).pages[ui.page].notes?.[Number(target.value)];
   form.elements.title.value=value?.title||'';form.elements.body.value=value?.body||'';return true;
 }
 if(e.type==='change'&&target.name==='template'&&form?.dataset.sform==='outreach'){
   const item=b.items.find(i=>i.id===form.elements.item.value)||b.items[0];
   const lines={opening:'Welcome to '+b.values.concept,returning:'Return for '+item.name,feature:'In focus: '+item.name};
   form.elements.offer.value=lines[target.value].slice(0,72);
   form.elements.audience.value=target.value==='returning'?'returning':target.value==='opening'?'new':'local';
   return true;
 }
 const kind=e.type==='click'?control?.dataset.studio:e.type==='submit'?form?.dataset.sform:e.type==='change'&&(target.name?.startsWith('studio-')||['method','code'].includes(target.name))?target.name:null;
 if(!kind)return false;
 e.preventDefault();
 const copy=structuredClone(b);copy.studio??={};
 const d=structuredClone(siteDesign(b));const p=d.pages[ui.page];const i=Number(control?.dataset.i);
 const fields=form?Object.fromEntries(new FormData(form)):{};let changed=true;
 if(kind==='source'){
   const id=control.dataset.id,records=studioRecords(b,result),row=records[id]||sourceFor(result,id);
   if(!row)return false;
   const dialog=document.querySelector('#record'),body=dialog.querySelector('#source-body');
   body.innerHTML=recordHTML(row,id=>Boolean(records[id]||sourceFor(result,id)));
   for(const anchor of body.querySelectorAll('[data-record]')){anchor.dataset.studio='source';anchor.dataset.id=anchor.dataset.record;delete anchor.dataset.record;}
   if(!dialog.open)dialog.showModal();dialog.querySelector('button').focus();return true;
 }
 const handled=storeEvent(kind,control||target,fields,copy,ui)||growthEvent(kind,fields,copy)||operationsEvent(kind,fields,copy,result)||copyEvent(kind,fields,copy,ui);
 if(handled){if(handled==='save'){paymentBook(copy);apply(copy);}render();if(handled==='save')notice.textContent='Saved in this simulation.';return true;}
 if(kind==='area'){ui.area=control.dataset.area;changed=false;}
 else if(kind==='studio-page'){ui.page=Number(target.value);changed=false;}
 else if(kind==='studio-device'){ui.device=target.value;changed=false;}
 else if(kind==='domain'){ui.query=fields.domain;changed=false;}
 else if(kind==='page'){if(d.pages.length===8)throw Error('Up to eight pages fit in a shareable preview.');d.pages.push({name:fields.name.trim(),sections:['hero']});ui.page=d.pages.length-1;}
 else if(kind==='remove-page'){if(d.pages.length===1)return true;d.pages.splice(ui.page,1);ui.page=0;}
 else if(kind==='section'){if(p.sections.length===12)throw Error('Use up to twelve sections per page.');p.sections.push(fields.section);if(p.notes)p.notes.push(null);}
 else if(kind==='section-copy'){p.notes??=p.sections.map(()=>null);p.notes[Number(fields.position)]={title:fields.title.trim(),body:fields.body.trim()};}
 else if(kind==='remove-section'){p.sections.splice(i,1);p.notes?.splice(i,1);}
 else if(kind==='move-up'||kind==='move-down'){const j=kind==='move-up'?i-1:i+1;if(j>=0&&j<p.sections.length){[p.sections[i],p.sections[j]]=[p.sections[j],p.sections[i]];if(p.notes)[p.notes[i],p.notes[j]]=[p.notes[j],p.notes[i]];}}
 else if(kind==='studio-font')d.font=target.value;
 else if(kind==='studio-theme'){d.theme=target.value;d.accent=defaultAccent(d.theme);}
 else if(kind==='studio-color')d.accent=target.value;
 else if(kind==='export-site'){saveFile(staticFile(publicSite(b)),b.values.concept);return true;}
 else if(kind==='publish'){const token=encodeSite(publicSite(b));history.pushState({builderSection:'preview='+token},'',location.pathname+'#preview='+token);
   openPreview(token,{business:b,save:apply,back:()=>{ui.area='payments';history.pushState({builderSection:'studio'},'',location.pathname+'#studio');render();}});return true;}
 else return false;
 if(changed){copy.studio.design=d;encodeSite(publicSite(copy));apply(copy);}
 render();
 return true;
}
export function openPreview(token,owner){
 const root=document.querySelector('#builder');root.dataset.screen='published';
 try{
   const site=decodeSite(token);
   let b=owner?.business??{values:{concept:site.name},items:site.items.map(i=>({...i,cost:Math.round(i.price*.5)})),studio:{catalog:Object.fromEntries(site.catalog.map(v=>[v.id,{price:v.price,collection:v.collection}]))}};
   let page=0,cart=[],method='pickup',code='',message='';
   const draw=()=>{
     const variants=catalog(b),q=cart.length?cartQuote(b,cart,method,code):null;
     root.innerHTML='<div class="studio"><style>'+siteCSS+'</style><header class="screen-head"><p class="kicker">Simulated publication</p><h1 tabindex="-1">'+esc(site.name)+'</h1></header>'+
      storefront(site,page)+'<details><summary>Share this simulated storefront</summary><label>Shareable preview URL <input readonly value="'+esc(location.href)+'"></label></details>'+
      '<section><h2>Customer checkout</h2><p>'+ (owner?'Orders post to this local business.':'This shared preview uses an isolated session cart and its own synthetic stock.')+'</p>'+
      '<form id="preview-cart">'+select('variant','Variant',Object.fromEntries(variants.map(v=>[v.id,v.name+' · '+v.variant+' · '+money(v.price)])),variants[0].id)+'<button>Add to cart</button></form>'+
      (q?'<form id="preview-order">'+select('method','Fulfillment',{pickup:'Pickup',shipping:'Shipping'},method)+select('code','Discount code',{'':'None',WELCOME10:'WELCOME10',LOCAL5:'LOCAL5'},code)+
      '<p>'+q.items.reduce((n,i)=>n+i.units,0)+' units · discounts '+money(q.rebate)+' · shipping '+money(q.shipping)+' · tax '+money(q.tax)+' · total '+money(q.total)+'</p><button class="primary">Place simulated order</button></form>':'')+
      '<p role="status">'+esc(message)+'</p><button id="return-studio">'+(owner?'Open payments ledger':'Return to Builder')+'</button></section></div>';
     for(const cta of root.querySelectorAll('[data-shop-cta]'))cta.onclick=e=>{e.stopPropagation();const n=Number(cta.dataset.shopCta);if(n>=0)page=n;draw();focusOffering(root,n);};
     root.querySelector('#return-studio').onclick=()=>{if(owner)owner.back();else{history.pushState({builderSection:'studio'},'',location.pathname+'#studio');dispatchEvent(new PopStateEvent('popstate'));}};
     root.querySelectorAll('[data-shop-page]').forEach(el=>el.onclick=e=>{e.stopPropagation();page=Number(el.dataset.shopPage);draw();});
     root.querySelector('#preview-cart').onsubmit=e=>{
       e.preventDefault();e.stopPropagation();const id=new FormData(e.target).get('variant'),line=cart.find(x=>x.id===id);
       if((line?.units||0)<paymentBook(b).days[(events(b).at(-1)?.day||1)-1].inventory[id]){
         if(line)line.units++;else cart.push({id,units:1});message='Added to the simulated cart.';
       }else message='Available stock is already in the cart.';draw();
     };
     const order=root.querySelector('#preview-order');
     if(order){
       order.onchange=e=>{e.stopPropagation();if(e.target.name==='method')method=e.target.value;else code=e.target.value;draw();};
       order.onsubmit=e=>{e.preventDefault();e.stopPropagation();try{
         const next=structuredClone(b),id=placeOrder(next,cart,events(next).at(-1)?.day||1,method,code);
         if(owner)owner.save(next);b=next;cart=[];message='Simulated order '+id+' recorded.';
       }catch(err){message=err.message;}draw();};
     }
   };draw();
 }catch{root.innerHTML='<h1>Preview unavailable</h1><p>Open a valid simulated publication link.</p><a href="start.html">Return to Builder</a>';}
}
export function studioRecords(b,r){const book=paymentBook(b,r),a=analytics(b,r,book);return {...book.records,...growRecords(b,r),...a.records,...operationsRecords(b,a,book).records,...launchCase(b,r,true,a,book).records,...launchCase(b,r,false,a,book).records,...launchCase(b,r,'recovered',a,book).records};}
