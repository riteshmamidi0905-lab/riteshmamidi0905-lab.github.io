/* Growth OS case study: renders data/growth-os-evidence.json (recorded probes executed against PostgreSQL + the capability tracker). Executes nothing and calls no backend. */
(()=>{'use strict';
const esc=s=>String(s==null?'—':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SLUG=s=>s.toLowerCase().replace(/ /g,'-');
async function load(){try{const r=await fetch('data/growth-os-evidence.json');if(!r.ok)throw 0;return await r.json()}catch(e){return null}}
function board(d){
  const caps=d.capabilities,counts={};caps.forEach(c=>counts[c.status]=(counts[c.status]||0)+1);
  const order=['TESTED','IMPLEMENTED','DESIGNED','NOT STARTED'];
  document.getElementById('k-board').innerHTML=order.map(s=>`<div class="kpi"><div class="big-n">${counts[s]||0}<small>${s.toLowerCase()}</small></div></div>`).join('');
  const grid=document.getElementById('caps'),panel=document.getElementById('cap-panel'),filt=document.getElementById('cap-filter');
  grid.innerHTML=caps.map(c=>`<button class="cap" data-n="${c.n}" data-s="${SLUG(c.status)}" aria-pressed="false"><span class="mono">${String(c.n).padStart(2,'0')}</span><strong>${esc(c.capability)}</strong><em>${esc(c.status)}</em></button>`).join('');
  filt.innerHTML=['all',...order].map(s=>`<button class="fbtn" data-k="${s}" aria-pressed="${s==='all'}">${s==='all'?'All 25':s.toLowerCase()+' '+(counts[s]||0)}</button>`).join('');
  function show(n){const c=caps.find(x=>x.n===n);grid.querySelectorAll('.cap').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.n===n)));
    panel.innerHTML=`<p class="mono dim" style="margin:0 0 8px">Capability ${c.n} · ${esc(c.implementation)}</p><h3>${esc(c.capability)}</h3><p><span class="chip ${c.status==='TESTED'?'t':''}">${esc(c.status)}</span></p>
      <h4>What exists</h4><p class="muted">${esc(c.done||'Nothing yet.')}</p><h4>What is missing</h4><p class="muted">${esc(c.missing||'—')}</p>
      <h4>Evidence</h4>${c.tests.length?`<ul class="tl2">${c.tests.map(t=>`<li data-ok="true"><b>TEST</b><code>${esc(t.split('/').pop())}</code></li>`).join('')}</ul>`:'<p class="note">No automated test cites this capability yet.</p>'}`}
  grid.addEventListener('click',e=>{const b=e.target.closest('.cap');if(b)show(+b.dataset.n)});
  filt.addEventListener('click',e=>{const b=e.target.closest('.fbtn');if(!b)return;filt.querySelectorAll('.fbtn').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    grid.querySelectorAll('.cap').forEach(t=>t.hidden=!(b.dataset.k==='all'||SLUG(b.dataset.k)===t.dataset.s))});
  show(14)}
function stages(d){
  const S=['new','qualified','proposal','negotiation','won','lost'],M={};d.stage_matrix.forEach(m=>M[m.frm+'>'+m.to]=m);
  const root=document.getElementById('stage-grid'),out=document.getElementById('stage-out');
  root.innerHTML=`<div class="sg" role="group" aria-label="From stage"><span class="sg-h">From</span>${S.map(s=>`<button class="fbtn" data-s="${s}" aria-pressed="${s==='new'}">${s}</button>`).join('')}</div>`;
  function show(f){root.querySelectorAll('.fbtn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s===f)));
    out.innerHTML=S.filter(t=>t!==f).map(t=>{const m=M[f+'>'+t];return`<li class="${m.allowed?'ok':'no'}"><b>${f} → ${t}</b><span>${m.allowed?'accepted by PostgreSQL':'rejected by PostgreSQL'}</span>${m.allowed?'':`<code>${esc(m.database_message)}</code>`}</li>`}).join('')}
  root.addEventListener('click',e=>{const b=e.target.closest('.fbtn');if(b)show(b.dataset.s)});show('new')}
function isolation(d){
  document.getElementById('iso').innerHTML=`<table class="ev"><thead><tr><th>Table</th><th>Tenant A rows</th><th>Tenant B rows</th><th>A sees B's rows</th><th>Session with no tenant sees</th></tr></thead><tbody>${d.isolation_probes.map(p=>`<tr><td><code>${esc(p.table)}</code></td><td>${p.tenant_a_rows}</td><td>${p.tenant_b_rows}</td><td><strong>${p.a_sees_b_rows}</strong></td><td><strong>${p.no_tenant_setting_rows}</strong></td></tr>`).join('')}</tbody></table>`;
  document.getElementById('priv').innerHTML=d.privilege_attempts.map(a=>`<li><b>REFUSED</b><span>${esc(a.attempt)}</span><code>${esc(a.result)}</code></li>`).join('')}
function mutants(d){
  document.getElementById('mut').innerHTML=d.mutants.map(m=>`<li class="${m.killed?'':'live'}"><b>${m.killed?'CAUGHT':'SURVIVED'}</b>${esc(m.mutant)}</li>`).join('');
  document.getElementById('msum').textContent=`${d.mutants.filter(m=>m.killed).length} of ${d.mutants.length} deliberately removed controls were detected by the probes. Audit chains valid at export: ${d.audit_chains_valid.nasha&&d.audit_chains_valid.fit}.`}
window.GrowthCase=async function(){const d=await load();if(!d){document.getElementById('main').insertAdjacentHTML('afterbegin','<p class="wrap note">Evidence unavailable. Serve the folder over http.</p>');return}
  document.getElementById('commit').textContent=`Recorded at NASHA local commit ${d.commit} (not pushed), PostgreSQL ${d.postgres}.`;
  board(d);stages(d);isolation(d);mutants(d)};
})();
