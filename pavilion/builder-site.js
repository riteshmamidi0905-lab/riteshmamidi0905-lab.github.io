import {esc,money} from './builder-common.js';
export const themes={garden:'Courtyard',broadsheet:'Editorial',night:'Evening'};
export const accents={garden:'#315842',broadsheet:'#885136',night:'#c7ad74'};
const color=s=>/^#[0-9a-f]{6}$/i.test(s)?s:'#315842';
export function domainIdeas(name){
 const stem=name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,40)||'mystudio';
 return [stem+'.com',stem+'studio.com','visit'+stem+'.com'];
}
export function websiteHTML(b,day=1){
 const v=b.values,s=b.site,theme=Object.hasOwn(themes,s.theme)?s.theme:'garden',dark=theme==='night',t=esc;
 const active=b.campaigns.filter(c=>c.start<=day&&c.end>=day);
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>'+t(s.title)+'</title><style>*{box-sizing:border-box}body{margin:0;background:'+(dark?'#1d3329':'#f6f1e4')+';color:'+(dark?'#fcf4dc':'#253a2e')+';font:16px/1.5 system-ui,sans-serif}main,header,footer{max-width:1000px;margin:auto;padding:1.2rem 6%}header{border-bottom:1px solid currentColor;font-weight:650;letter-spacing:.045em}h1,h2{font:'+(theme==='broadsheet'?'bold ':'normal ')+'clamp(2.45rem,7vw,5.1rem)/1 Georgia,serif;letter-spacing:-.045em;margin:.3em 0;overflow-wrap:anywhere}h2{font-size:1.8rem}.hero{display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:1.5rem;padding:2rem 0;border-bottom:2px solid '+color(s.accent)+'}.facade{width:100%;height:168px;background:repeating-linear-gradient(100deg,'+color(s.accent)+' 0 12%,transparent 12% 16%),linear-gradient(25deg,#b8aa84,#d5c99e);border:12px solid '+color(s.accent)+';border-radius:'+(theme==='garden'?'90px 90px 0 0':'0')+'}small{font-size:.8rem}.menu{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:.7rem}.menu article{padding:1rem 0;border-top:1px solid currentColor}.promo{border-left:4px solid '+color(s.accent)+';padding-left:1rem}footer{font-size:.8rem;border-top:1px solid currentColor}@media(max-width:480px){.hero{grid-template-columns:1fr}.facade{height:78px}header,main,footer{padding:1rem}}</style></head><body><header>'+t(v.concept)+'</header><main><section class="hero"><div><small>'+t(v.city)+' · '+t(v.type==='stadium'?'Independent venue':v.type)+'</small><h1>'+t(s.title)+'</h1></div><div class="facade" aria-hidden="true"></div></section>'+
 (active.length?'<aside class="promo"><h2>Current offers</h2>'+active.map(c=>'<p>'+t(c.offer)+(c.vendor?' · '+t(b.items.find(i=>i.id===c.vendor)?.name||c.vendor):'')+' · '+c.discount+'% off</p>').join('')+'</aside>':'')+
 (s.sections.includes('offers')?'<section><h2>Our offerings</h2><div class="menu">'+b.items.map(i=>'<article><strong>'+t(i.name)+'</strong><br>'+money(i.price)+'</article>').join('')+'</div></section>':'')+
 (s.sections.includes('hours')?'<section><h2>Visit</h2><p>'+t(v.hours)+' · '+t(v.city)+'</p><p>Street location to be confirmed.</p></section>':'')+
 (s.sections.includes('story')?'<section><h2>Our story</h2><p>'+t(s.story)+'</p></section>':'')+
 '</main><footer>Simulation — synthetic data · nothing is published, charged or sent.</footer></body></html>';
}
export function downloadWebsite(b,day){
 const blob=new Blob([websiteHTML(b,day)],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.download=(domainIdeas(b.values.concept)[0].split('.')[0]||'business')+'-preview.html';a.href=url;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
