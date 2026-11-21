import {render,routes} from './site.js';
const page=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'');
const localReplay=()=>new URLSearchParams(location.hash.slice(1)).has('sim');
const routeParams=()=>new URLSearchParams(localReplay()?location.hash.slice(1):location.search);
addEventListener('hashchange',e=>{if(localReplay()||new URL(e.oldURL).hash.startsWith('#sim='))location.reload();});
let workspaceContext;
if(routeParams().has('workspace')){
 try{
   const {savedReplay}=await import('./builder-replay.js');
   const params=routeParams(), replay=savedReplay(params.get('workspace'));
   const d=Number(params.get('day')??1);
   if(replay.model.mix || !Number.isInteger(d)||d<0||d>28)throw Error('Choose an operating day and a supported business floor.');
   workspaceContext={m:replay.model,d};
 }catch(error){workspaceContext={error};}
}
if(routes.includes(page)&&(location.search||localReplay())){
 document.querySelector('meta[name="robots"]')?.setAttribute('content','noindex,nofollow');
 try {if(workspaceContext?.error)throw workspaceContext.error;const d=new DOMParser().parseFromString(render(page,routeParams(),workspaceContext),'text/html');document.querySelector('#app').replaceChildren(...d.querySelector('#app').childNodes);document.dispatchEvent(new Event('portfolio-navigation-ready'));}
 catch(error){const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=error.message;const a=document.createElement('a');a.href='simulator.html';a.textContent='Simulate your idea';document.querySelector('#app').replaceChildren(p,a);}
}
if(document.querySelector('#floor')){
 const [{context},{mountFloor}]=await Promise.all([import('./site.js'),import('./iso-player.js')]);
 const params=routeParams();
 const {m,d}=workspaceContext??context(params);
 mountFloor(m,d,params);
}
if(document.querySelector('.ops-page')){
 const [{context},{mountOps}]=await Promise.all([import('./site.js'),import('./ops.js')]);const {m,d}=workspaceContext??context(routeParams());mountOps(m,d);
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
