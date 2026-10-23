/* Architecture explorer built from the evidence manifest's `architecture` section. Statuses are never colour-only: dashed = blocked, dotted = designed only, text badge on every node. */
(()=>{'use strict';
const POS={orders:[10,20],pipeline:[10,120],postgres:[10,220],scenario:[290,120],forecast:[290,20],opsai:[290,220],retrieval:[290,320],trace:[570,20],agent:[570,220],llm:[570,320],agentplatform:[570,420],weir:[850,120],approval:[850,220],ledger:[850,320],tenants:[850,420],webui:[290,420],incident:[850,20],evaluation:[10,320],releasegate:[10,420]};
const COL={data:'#62c9ff',ai:'#7ce8bd',systems:'#ffb85c',product:'#ff94a8'};
const BADGE={implemented_and_tested:'IMPLEMENTED · TESTED',integrated_real_separate_repository:'REAL · OTHER REPO',separate_repository_not_integrated:'SEPARATE · NOT INTEGRATED',blocked:'BLOCKED',designed_only:'DESIGNED ONLY'};
const W=220,H=62;const SHORT={forecast:'Demand forecast',scenario:'Recipes · BOM · variance',trace:'Run traces · correlation',agent:'Governed agent',retrieval:'Retrieval · pgvector',ledger:'Procurement ledger',agentplatform:'Agent Platform (repo)',llm:'Language-model runtime',opsai:'Ops AI tool layer',tenants:'Tenant isolation',postgres:'PostgreSQL variant',evaluation:'Evaluation · mutation',releasegate:'Release gate',incident:'Incident investigation'};
window.ArchExplorer=function(root,arch){
  const svg=root.querySelector('svg'),panel=root.querySelector('.panel'),filters=root.querySelector('.filters');let sel=null,flt='all';
  const byId=Object.fromEntries(arch.nodes.map(n=>[n.id,n]));
  const NS='http://www.w3.org/2000/svg';
  function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
  const edgeG=el('g',{},svg),nodeG=el('g',{},svg);
  const edges=arch.edges.map(([a,b])=>{const A=POS[a],B=POS[b];if(!A||!B)return null;const x1=A[0]+W,y1=A[1]+H/2,x2=B[0],y2=B[1]+H/2;let d;
    if(B[0]>A[0]+W-1)d=`M${x1},${y1} C${x1+40},${y1} ${x2-40},${y2} ${x2},${y2}`;else if(B[0]<A[0])d=`M${A[0]},${y1} C${A[0]-40},${y1} ${B[0]+W+40},${y2} ${B[0]+W},${y2}`;else if(Math.abs(B[1]-A[1])>H*2.2){const xr=A[0]+W,ya=A[1]+H/2,yb=B[1]+H/2;d=`M${xr},${ya} C${xr+60},${ya} ${xr+60},${yb} ${xr},${yb}`}else{const yy=B[1]>A[1]?A[1]+H:A[1];const yb=B[1]>A[1]?B[1]:B[1]+H;d=`M${A[0]+W/2},${yy} L${B[0]+W/2},${yb}`}
    return{a,b,p:el('path',{d,class:'gedge','marker-end':'url(#ah)'},edgeG)}}).filter(Boolean);
  const nodes=arch.nodes.map(n=>{const [x,y]=POS[n.id];const g=el('g',{class:'gnode',tabindex:0,role:'button','aria-pressed':'false','aria-label':`${SHORT[n.id]||n.name} ${BADGE[n.status]}`,transform:`translate(${x},${y})`},nodeG);g.style.setProperty('--c',COL[n.world]);
    const r=el('rect',{width:W,height:H,rx:7},g);if(n.status==='blocked')r.setAttribute('stroke-dasharray','6 4');if(n.status==='designed_only')r.setAttribute('stroke-dasharray','2 4');
    el('rect',{width:5,height:H,x:0,rx:2,fill:COL[n.world]},g).setAttribute('style','fill:'+COL[n.world]+';stroke:none');
    const t=el('text',{x:16,y:26},g);t.textContent=SHORT[n.id]||n.name;const s=el('text',{x:16,y:47,class:'sub'},g);s.textContent=BADGE[n.status];
    g.addEventListener('click',()=>pick(n.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(n.id)}});return{n,g}});
  const defs=el('defs',{},svg);const m=el('marker',{id:'ah',viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:7,markerHeight:7,orient:'auto'},defs);el('path',{d:'M0,0 L8,4 L0,8 z',fill:'#2b4044'},m);
  function pick(id){sel=id;nodes.forEach(({n,g})=>g.setAttribute('aria-pressed',String(n.id===id)));edges.forEach(e=>e.p.classList.toggle('hl',e.a===id||e.b===id));
    const n=byId[id];panel.innerHTML=`<div><span class="chip t" style="--c:${COL[n.world]}">${BADGE[n.status]}</span><h3 style="margin-top:12px">${n.name}</h3><p class="muted">${n.note}</p></div>`+
      `<div><p class="mono dim" style="margin:0 0 6px">Code</p>${n.evidence.length?`<ul>${n.evidence.map(p=>`<li><code>${p}</code></li>`).join('')}</ul>`:'<p class="note">No code: not built.</p>'}</div>`+
      `<div><p class="mono dim" style="margin:0 0 6px">Tests</p>${n.tests.length?`<ul>${n.tests.map(p=>`<li><code>${p}</code></li>`).join('')}</ul>`:'<p class="note">No tests.</p>'}<p class="note" style="margin-top:14px">Connected to: ${arch.edges.filter(e=>e[0]===id||e[1]===id).map(e=>byId[e[0]===id?e[1]:e[0]].name).join(' · ')||'—'}</p></div>`}
  filters.innerHTML=[['all','All'],['implemented_and_tested','Implemented · tested'],['integrated_real_separate_repository','Real, separate repo'],['separate_repository_not_integrated','Not integrated'],['blocked','Blocked'],['designed_only','Designed only']].map(([k,l])=>`<button class="fbtn" aria-pressed="${k==='all'}" data-k="${k}">${l}</button>`).join('');
  filters.addEventListener('click',e=>{const b=e.target.closest('.fbtn');if(!b)return;flt=b.dataset.k;filters.querySelectorAll('.fbtn').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));nodes.forEach(({n,g})=>g.style.opacity=flt==='all'||n.status===flt?1:.18)});
  pick('agent');
};
})();
