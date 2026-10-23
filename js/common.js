/* shared behaviour: nav, reveal, world switching, evidence loading. No dependencies. */
(()=>{'use strict';
document.documentElement.classList.add('js');
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const menu=$('.menu'),nav=$('#nav');
if(menu&&nav){menu.addEventListener('click',()=>{const o=nav.classList.toggle('open');menu.setAttribute('aria-expanded',o)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.focus()}})}
const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08}):null;
$$('.reveal').forEach(el=>io?io.observe(el):el.classList.add('in'));
/* worlds: the section in view sets body[data-world] and the sticky navigation */
const worlds=$$('.world');
if(worlds.length&&'IntersectionObserver'in window){
  const wnav=$$('.wnav a');
  const wo=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const w=e.target.dataset.w;document.body.dataset.world=w;wnav.forEach(a=>a.setAttribute('aria-current',String(a.dataset.w===w)))}})},{rootMargin:'-45% 0px -45% 0px'});
  worlds.forEach(w=>wo.observe(w));
  const ws=$('#worlds');if(ws)new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)document.body.dataset.world='ai'})).observe(ws);
}
/* evidence: one JSON file produced by lab/tools/export_portfolio_evidence.py */
window.loadEvidence=async()=>{try{const r=await fetch('data/nasha-governed-evidence.json');if(!r.ok)throw new Error(r.status);return await r.json()}catch(e){return null}};
window.$=$;window.$$=$$;
})();
