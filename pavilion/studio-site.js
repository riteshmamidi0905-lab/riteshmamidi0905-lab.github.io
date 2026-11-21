// The share fragment contains storefront content only. Orders and operating assumptions stay local.
import {esc,disclosure,money} from './builder-common.js';
import {domainIdeas} from './builder-site.js';
import {optionalText,storyText} from './builder-copy.js';

export const sections={hero:'Hero',gallery:'Gallery',products:'Products and menu',booking:'Booking',about:'About',faq:'FAQ',contact:'Contact',map:'Map placeholder'};
export const fonts={editorial:'Georgia,serif',modern:'system-ui,sans-serif',technical:'ui-monospace,monospace'};
export const themes={garden:'Courtyard',night:'Evening',broadsheet:'Editorial'};
const accents={garden:'#315842',night:'#cfb47b',broadsheet:'#8a5238'};
const clean=(v,max)=>typeof v==='string'&&v.length<=max&&!/[<>\u0000-\u001f]/u.test(v);
export function siteDesign(b){
 return b.studio?.design??{theme:b.site.theme,font:'editorial',accent:b.site.accent,pages:[
   {name:'Home',sections:['hero','gallery','about']},{name:'Visit',sections:['products',b.values.type==='salon'?'booking':'contact','map']} ]};
}
export function publicSite(b){
 const d=siteDesign(b);
 return {version:1,name:b.values.concept,headline:b.site.title,city:optionalText(b.values.city),hours:b.values.hours,story:storyText(b),
   ...d,meta:b.studio?.seo??{title:b.site.title,description:storyText(b),image:'Gallery'},
   items:b.items.map(i=>({id:i.id,name:i.name,price:i.price,description:b.studio?.descriptions?.[i.id]||''}))};
}
function validate(s){
 if(!s||s.version!==1||!clean(s.name,72)||!clean(s.headline,96)||!clean(s.city,56)||!clean(s.hours,220)||!clean(s.story,240)||
 !Object.hasOwn(themes,s.theme)||!Object.hasOwn(fonts,s.font)||!/^#[0-9a-f]{6}$/i.test(s.accent)||
 !Array.isArray(s.pages)||s.pages.length<1||s.pages.length>8||s.pages.some(p=>!p||!clean(p.name,48)||!p.name.trim()||!Array.isArray(p.sections)||p.sections.length>12||p.sections.some(k=>!Object.hasOwn(sections,k)))||
 !Array.isArray(s.items)||s.items.length<1||s.items.length>24||s.items.some(i=>!i||!clean(i.id,48)||!clean(i.name,72)||!clean(i.description??'',240)||!Number.isSafeInteger(i.price)||i.price<1||i.price>100000)||
 !s.meta||!clean(s.meta.title,96)||!clean(s.meta.description,240)||!['Gallery','Storefront','Products'].includes(s.meta.image))throw Error('This simulated storefront link is invalid.');
 return s;
}
export function encodeSite(site){
 const bytes=new TextEncoder().encode(JSON.stringify(validate(site)));
 return btoa(Array.from(bytes,n=>String.fromCharCode(n)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeSite(token){
 if(!/^[\w-]{1,30000}$/.test(token))throw Error('Invalid preview link.');
 return validate(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)))));
}
export function domainSearch(name){
 return domainIdeas(name).map(domain=>({domain,available:[...domain].reduce((n,c)=>n+c.charCodeAt(0),0)%4!==0}));
}
export const siteCSS=`
.shop{--paper:#f5efdf;--ink:#213a2d;background:var(--paper);color:var(--ink);font:16px/1.55 system-ui,sans-serif;text-align:left;overflow-wrap:anywhere}
.shop.night{--paper:#22392e;--ink:#fff4d9}.shop.broadsheet{--paper:#fffaf0;--ink:#33261d}
.shop *{box-sizing:border-box}.shop header,.shop section,.shop footer{padding:1rem clamp(1rem,4%,3rem)}.shop header,.shop footer{border-block:1px solid currentColor}
.shop nav,.shop .goods{display:flex;flex-wrap:wrap;gap:.6rem 1rem}.shop nav a,.shop button{font:inherit;color:inherit}
.shop h2,.shop h3{font-family:var(--face);font-weight:500;line-height:1.1;margin:.5em 0}.shop h2{font-size:clamp(2rem,5vw,4.2rem)}
.shop p{max-width:65ch}.shop .display-art{display:flex;align-items:end;gap:10%;height:6rem;border-bottom:4px solid var(--tone);color:var(--tone);padding-inline:8%;background:linear-gradient(110deg,#d9cdb0,#f4ead5 58%,#c2ad8a)}
.shop .display-art i{display:block;background:currentColor;width:17%;height:74%;border-radius:44% 44% 10% 10%;border-bottom:8px solid #977450}
.shop .display-art i:nth-child(2){height:49%;border-radius:20% 20% 45% 45%}.shop .display-art i:nth-child(3){height:89%;width:12%}.shop article{padding:.5rem 1rem;border-left:3px solid var(--tone)}
.shop .map-tile{padding:1rem;border:1px dashed currentColor}.shop a:focus-visible,.shop button:focus-visible{outline:3px solid currentColor;outline-offset:2px}`;
export const art='<div class="display-art" role="img" aria-label="Original illustrated still life of three display objects"><i></i><i></i><i></i></div>';
export function pageBody(site,index){
 const parts={hero:'<h2>'+esc(site.headline)+'</h2>',gallery:art,products:'<h3>Our offerings</h3><div class="goods">'+site.items.map(i=>'<article>'+esc(i.name)+'<br>'+money(i.price)+(i.description?'<p>'+esc(i.description)+'</p>':'')+'</article>').join('')+'</div>',
 booking:'<h3>Appointments</h3><p>Explore a simulated appointment during '+esc(site.hours)+'.</p>',about:'<h3>Our story</h3><p>'+esc(site.story||site.name)+'</p>',
 faq:'<h3>Frequently asked questions</h3><details><summary>When can I visit?</summary><p>'+esc(site.hours)+'</p></details>',
 contact:'<h3>Visit us</h3><p>'+esc([site.city,site.hours].filter(Boolean).join(' · '))+'</p>',
 map:'<h3>Find us</h3><div class="map-tile">Illustrative map placeholder'+(site.city?' · '+esc(site.city):'')+'</div>'};
 return site.pages[index].sections.map(k=>'<section>'+parts[k]+'</section>').join('');
}
export function storefront(site,page=0,exported=false){
 validate(site);
 const nav=site.pages.map((p,i)=>exported?'<a href="#page-'+(i+1)+'">'+esc(p.name)+'</a>':'<button type="button" data-shop-page="'+i+'"'+(i===page?' aria-current="page"':'')+'>'+esc(p.name)+'</button>').join('');
 return '<div class="shop '+site.theme+'" style="--tone:'+site.accent+';--face:'+fonts[site.font]+'"><header><strong>'+esc(site.name)+'</strong><nav aria-label="Storefront pages">'+nav+'</nav></header>'+
 (exported?site.pages.map((p,i)=>'<section id="page-'+(i+1)+'"><h2>'+esc(p.name)+'</h2>'+pageBody(site,i)+'</section>').join(''):pageBody(site,page))+'<footer>'+esc(disclosure)+'</footer></div>';
}
export function staticFile(s){
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(s.meta.title)+'</title><meta name="description" content="'+esc(s.meta.description)+'"><style>body{margin:0}'+siteCSS+'</style></head><body><main>'+storefront(s,0,true)+'</main></body></html>';
}
export function defaultAccent(theme){return accents[theme];}
