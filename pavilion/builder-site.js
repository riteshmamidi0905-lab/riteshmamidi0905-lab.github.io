import {esc,money} from './builder-common.js';
export const themes={garden:'Courtyard',broadsheet:'Editorial',night:'Evening'};
export const accents={garden:'#315842',broadsheet:'#885136',night:'#c7ad74'};
const color=s=>/^#[0-9a-f]{6}$/i.test(s)?s:'#315842';
export function domainIdeas(name){
 const stem=name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,40)||'mystudio';
 return [stem+'.com',stem+'studio.com','visit'+stem+'.com'];
}
function storefrontStyle(site){
  const theme=Object.hasOwn(themes,site.theme)?site.theme:'garden';
  const dark=theme==='night',accent=color(site.accent);
  return `
    *{box-sizing:border-box}
    .storefront{margin:0;container-type:inline-size;background:${dark?'#1d3329':'#f6f1e4'};color:${dark?'#fcf4dc':'#253a2e'};font:16px/1.5 system-ui,sans-serif}
    .site-content,.site-name,.site-footer{max-width:1000px;margin:auto;padding:1.2rem 6%}
    .site-name{border-bottom:1px solid currentColor;font-weight:650;letter-spacing:.045em}
    .site-title,.site-heading{font:${theme==='broadsheet'?'bold':'normal'} clamp(2.45rem,7cqw,5.1rem)/1 Georgia,serif;letter-spacing:-.045em;margin:.3em 0;overflow-wrap:anywhere}
    .site-heading{font-size:1.8rem}
    .hero{display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:1.5rem;padding:2rem 0;border-bottom:2px solid ${accent}}
    .facade{width:100%;height:168px;background:repeating-linear-gradient(100deg,${accent} 0 12%,transparent 12% 16%),linear-gradient(25deg,#b8aa84,#d5c99e);border:12px solid ${accent};border-radius:${theme==='garden'?'90px 90px 0 0':'0'}}
    small{font-size:.8rem}
    .menu{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:.7rem}
    .menu article{padding:1rem 0;border-top:1px solid currentColor}
    .promo{border-left:4px solid ${accent};padding-left:1rem}
    .site-footer{font-size:.8rem;border-top:1px solid currentColor}
    @container (max-width:480px){.hero{grid-template-columns:1fr}.facade{height:78px}.site-name,.site-content,.site-footer{padding:1rem}}
  `;
}
const pageTags={name:'header',content:'main',footer:'footer',title:'h1',heading:'h2'};
const previewTags={name:'div',content:'div',footer:'div',title:'h3',heading:'h4'};

function storefrontContent(b,day,tags){
  const v=b.values,s=b.site;
  const heading=text=>`<${tags.heading} class="site-heading">${esc(text)}</${tags.heading}>`;
  const active=b.campaigns.filter(c=>c.start<=day&&c.end>=day);
  const offers=active.map(c=>{
    const vendor=c.vendor?b.items.find(i=>i.id===c.vendor)?.name||c.vendor:'';
    return '<p>'+esc(c.offer)+(vendor?' · '+esc(vendor):'')+' · '+esc(c.discount)+'% off</p>';
  }).join('');
  const menu=b.items.map(i=>'<article><strong>'+esc(i.name)+'</strong><br>'+money(i.price)+'</article>').join('');
  return `<${tags.name} class="site-name">${esc(v.concept)}</${tags.name}>
    <${tags.content} class="site-content">
    <section class="hero"><div><small>${esc(v.city)} · ${esc(v.type==='stadium'?'Independent venue':v.type)}</small><${tags.title} class="site-title">${esc(s.title)}</${tags.title}></div><div class="facade" aria-hidden="true"></div></section>
    ${active.length?'<section class="promo">'+heading('Current offers')+offers+'</section>':''}
    ${s.sections.includes('offers')?'<section>'+heading('Our offerings')+'<div class="menu">'+menu+'</div></section>':''}
    ${s.sections.includes('hours')?'<section>'+heading('Visit')+'<p>'+esc(v.hours)+' · '+esc(v.city)+'</p><p>Street location to be confirmed.</p></section>':''}
    ${s.sections.includes('story')?'<section>'+heading('Our story')+'<p>'+esc(s.story)+'</p></section>':''}
    </${tags.content}>
    <${tags.footer} class="site-footer">Simulation — synthetic data · nothing is published, charged or sent.</${tags.footer}>`;
}

export function websiteHTML(b,day=1){
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>'+esc(b.site.title)+'</title><style>'+storefrontStyle(b.site)+'</style></head><body class="storefront">'+storefrontContent(b,day,pageTags)+'</body></html>';
}

export function mountWebsitePreview(host,b,day){
  // The preview only renders our template. Visitor input is text, and the accent is a validated color.
  const shadow=host.shadowRoot||host.attachShadow({mode:'open'});
  shadow.innerHTML='<style>'+storefrontStyle(b.site)+'</style><div class="storefront">'+storefrontContent(b,day,previewTags)+'</div>';
}

export function downloadWebsite(b,day){
 const blob=new Blob([websiteHTML(b,day)],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.download=(domainIdeas(b.values.concept)[0].split('.')[0]||'business')+'-preview.html';a.href=url;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
