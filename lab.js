(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
// status filter for node cards, register rows and project cards
const bar=$('[data-filter-bar]');
if(bar){const targets=$$('.node[data-status],.proj[data-status]');const note=$('[data-filter-count]');
 const apply=v=>{let n=0;targets.forEach(t=>{const show=v==='ALL'||t.dataset.status===v;t.hidden=!show;if(show)n++});$$('button',bar).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===v)));if(note)note.textContent=n+' shown'};
 bar.addEventListener('click',e=>{const b=e.target.closest('button');if(b)apply(b.dataset.value)});apply('ALL');}
// text search on the projects page
const q=$('#project-search');
if(q){const items=$$('.proj');const note=$('[data-filter-count]');q.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();let n=0;items.forEach(p=>{const hit=!v||p.textContent.toLowerCase().includes(v);p.hidden=!hit;if(hit)n++});if(note)note.textContent=n+' shown'})}
// scenario tabs (progressive enhancement: without JS every scenario is visible)
const list=$('[data-scenarios]');
if(list){const panels=$$('.scenario',list);const tabs=document.createElement('div');tabs.className='tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Business scenarios');
 panels.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.id='tab-'+i;b.setAttribute('aria-controls',p.id);b.textContent=p.dataset.name;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby','tab-'+i);tabs.appendChild(b)});
 list.parentNode.insertBefore(tabs,list);
 const show=i=>{panels.forEach((p,j)=>{p.hidden=i!==j});$$('button',tabs).forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1})};
 tabs.addEventListener('click',e=>{const b=e.target.closest('button');if(b)show($$('button',tabs).indexOf(b))});
 tabs.addEventListener('keydown',e=>{const bs=$$('button',tabs);let i=bs.indexOf(document.activeElement);if(i<0)return;if(e.key==='ArrowRight')i=(i+1)%bs.length;else if(e.key==='ArrowLeft')i=(i-1+bs.length)%bs.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=bs.length-1;else return;e.preventDefault();show(i);bs[i].focus()});
 show(0);}
// open a node when linked by anchor
const openHash=()=>{const t=location.hash&&$(location.hash);if(t&&t.tagName==='DETAILS')t.open=true};addEventListener('hashchange',openHash);openHash();
// expand/collapse all
$$('[data-toggle-all]').forEach(b=>b.addEventListener('click',()=>{const open=b.dataset.toggleAll==='open';$$('details.node').forEach(d=>{if(!d.hidden)d.open=open})}));
// homepage ecosystem selector: buttons are the real controls; the SVG only mirrors the choice
const eco=$('[data-eco-root]');
if(eco){const btns=$$('.eco-btn',eco),panels=$$('[data-eco-panel]',eco),nodes=$$('[data-eco-node]',eco);
 const pick=i=>{btns.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));panels.forEach((p,j)=>{p.hidden=i!==j});nodes.forEach((n,j)=>n.classList.toggle('on',i===j))};
 btns.forEach((b,i)=>b.addEventListener('click',()=>pick(i)));nodes.forEach((n,i)=>n.addEventListener('click',()=>pick(i)));pick(0);}
// case-study diagram: steps highlight nodes and edges; the text version stays available
const sr=$('[data-steps-root]');
if(sr){const svg=$('svg.dg',sr),btns=$$('.step',sr),texts=$$('.step-text',sr);
 const pick=i=>{const ids=(btns[i].dataset.nodes||'').split(',').filter(Boolean);svg.classList.add('has-hl');
  $$('.dg-n',svg).forEach(n=>n.classList.toggle('hl',ids.includes(n.dataset.node)));
  $$('.dg-e',svg).forEach(e=>e.classList.toggle('hl',ids.includes(e.dataset.from)&&ids.includes(e.dataset.to)||ids.includes(e.dataset.from)&&ids.length===1||ids.includes(e.dataset.to)&&ids.length===1));
  btns.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));texts.forEach((p,j)=>{p.hidden=i!==j})};
 btns.forEach((b,i)=>b.addEventListener('click',()=>pick(i)));pick(0);if(innerWidth<640){const pl=$('details.plain',sr);if(pl)pl.open=true}}
// depth and progress: skipped entirely for reduced motion
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const orb=$('.orbital'),bar=document.createElement('div');bar.className='progress';bar.setAttribute('aria-hidden','true');document.body.appendChild(bar);let tick=false;
 const upd=()=>{tick=false;const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;bar.style.width=(h>0?Math.min(100,y/h*100):0)+'%';if(orb&&innerWidth>760&&y<innerHeight*1.2)orb.style.transform='translate3d(0,'+(y*0.07).toFixed(1)+'px,0)'};
 addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});upd();}
// gentle reveal, skipped for reduced motion
if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});$$('.reveal').forEach(el=>io.observe(el))}else{$$('.reveal').forEach(el=>el.classList.add('in'))}
})();
