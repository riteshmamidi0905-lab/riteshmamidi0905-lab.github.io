/* Project index: filter by discipline and search text. All 24 projects are in the HTML; this only hides rows. */
(()=>{'use strict';
const rows=[...document.querySelectorAll('.prow')],groups=[...document.querySelectorAll('.pgroup')],q=document.getElementById('q'),count=document.getElementById('count'),none=document.getElementById('none'),btns=[...document.querySelectorAll('.pfilter .fbtn')];
let cat='all';
function apply(){const t=(q.value||'').trim().toLowerCase();let n=0;
  rows.forEach(r=>{const ok=(cat==='all'||r.dataset.category===cat)&&(!t||r.dataset.text.includes(t));r.hidden=!ok;if(ok)n++});
  groups.forEach(g=>{g.hidden=!g.querySelector('.prow:not([hidden])')});
  count.textContent=`${n} of ${rows.length} projects`;none.hidden=n>0}
btns.forEach(b=>b.addEventListener('click',()=>{cat=b.dataset.k;btns.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));apply()}));
q.addEventListener('input',apply);
const h=location.hash.slice(1);if(h){const el=document.getElementById(h);if(el)el.scrollIntoView()}
})();
