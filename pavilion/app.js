import {render,routes} from './site.js';
const page=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'');
if(routes.includes(page)&&location.search){
 try {const d=new DOMParser().parseFromString(render(page,new URLSearchParams(location.search)),'text/html');document.querySelector('#app').replaceChildren(...d.querySelector('#app').childNodes);}
 catch(error){const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=error.message;document.querySelector('#app').replaceChildren(p);}
}
if(document.querySelector('#floor')){
 const [{context},{mountFloor}]=await Promise.all([import('./site.js'),import('./iso-player.js')]);
 const params=new URLSearchParams(location.search);
 const {m,d}=context(params);
 mountFloor(m,d,params);
}
if(document.querySelector('.ops-page')){
 const [{context},{mountOps}]=await Promise.all([import('./site.js'),import('./ops.js')]);const {m,d}=context(new URLSearchParams(location.search));mountOps(m,d);
}
const form=document.querySelector('#create');
if(form){
 const defaults={brewery:'NASHA Brewery',coffee:'Court Coffee',bakery:'Arcade Bakery',retail:'Pavilion Goods'};
 form.onchange=e=>{
  if(e.target.name==='template'&&['Rowan, Mika, Sol','Rowan, Mika, Sol, Ari'].includes(form.elements.staffNames.value))form.elements.staffNames.value=e.target.value==='brewery'?'Rowan, Mika, Sol, Ari':'Rowan, Mika, Sol';
  if(e.target.name==='template')for(const row of form.querySelectorAll('[data-recipe-row="3"]')){row.hidden=e.target.value!=='brewery';row.querySelector('input').disabled=row.hidden;}
  if(e.target.name==='template'&&Object.values(defaults).includes(form.elements.name.value))form.elements.name.value=defaults[e.target.value];
 };
 form.onsubmit=async ev=>{
  ev.preventDefault();
  try{
    const {context}=await import('./site.js');
    const {m}=context(new URLSearchParams(new FormData(form)));
    const u=new URL('overview.html',location.href);
    u.searchParams.set('business',JSON.stringify(m.config));u.searchParams.set('day',0);location.assign(u);
  }catch(error){document.querySelector('#error').textContent=error.message;}
 };
}
