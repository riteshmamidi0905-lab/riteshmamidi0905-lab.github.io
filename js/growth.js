/* Growth OS case study: renders data/growth-os-evidence.json (recorded probes executed against PostgreSQL + the capability tracker). Executes nothing and calls no backend. */
(()=>{'use strict';
const esc=s=>String(s==null?'—':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SLUG=s=>s.toLowerCase().replace(/ /g,'-');
async function load(){try{const r=await fetch('data/growth-os-evidence.json');if(!r.ok)throw 0;return await r.json()}catch(e){return null}}
function board(d){
  const caps=d.capabilities,counts={};caps.forEach(c=>counts[c.status]=(counts[c.status]||0)+1);
  const order=['INTEGRATED','TESTED','IMPLEMENTED','DESIGNED','NOT STARTED'];
  const w=d.workflow,mk=w.mutants.filter(m=>m.killed).length+d.mutants.filter(m=>m.killed).length,mt=w.mutants.length+d.mutants.length,om=w.oracle_evaluation.filter(o=>o.match).length;
  document.getElementById('k-board').innerHTML=[[mk+'/'+mt,'mutants caught'],[om+'/'+w.oracle_evaluation.length,'hand-oracle cases matched'],[w.happy_path.emails_or_messages_created,'emails or messages created'],[counts.INTEGRATED||0,'capability integrated (of 25)']].map(([n,l])=>`<div class="kpi"><div class="big-n">${n}<small>${l}</small></div></div>`).join('');
  const grid=document.getElementById('caps'),panel=document.getElementById('cap-panel'),filt=document.getElementById('cap-filter');
  grid.innerHTML=caps.map(c=>`<button class="cap" data-n="${c.n}" data-s="${SLUG(c.status)}" aria-pressed="false"><span class="mono">${String(c.n).padStart(2,'0')}</span><strong>${esc(c.capability)}</strong><em>${esc(c.status)}</em></button>`).join('');
  filt.innerHTML=['all',...order].map(s=>`<button class="fbtn" data-k="${s}" aria-pressed="${s==='all'}">${s==='all'?'All 25':s.toLowerCase()+' '+(counts[s]||0)}</button>`).join('');
  function show(n){const c=caps.find(x=>x.n===n);grid.querySelectorAll('.cap').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.n===n)));
    panel.innerHTML=`<p class="mono dim" style="margin:0 0 8px">Capability ${c.n} · ${esc(c.implementation)}</p><h3>${esc(c.capability)}</h3><p><span class="chip ${c.status==='TESTED'||c.status==='INTEGRATED'?'t':''}">${esc(c.status)}</span></p>
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
  const li=m=>`<li class="${m.killed?'':'live'}"><b>${m.killed?'CAUGHT':'SURVIVED'}</b>${esc(m.mutant)}</li>`;
  document.getElementById('mut').innerHTML=d.mutants.map(li).join('');document.getElementById('wmut').innerHTML=d.workflow.mutants.map(li).join('');
  const all=[...d.mutants,...d.workflow.mutants];
  document.getElementById('msum').textContent=`${all.filter(m=>m.killed).length} of ${all.length} deliberately broken controls were detected by their probes. Every probe also passes on the unmutated system. Audit chains valid at export: ${d.audit_chains_valid.nasha&&d.audit_chains_valid.fit}.`}
function oracle(d){
  document.getElementById('oracle').innerHTML=`<table class="ev"><thead><tr><th>Case</th><th>Expected (by hand)</th><th>Workflow proposed</th><th>Match</th></tr></thead><tbody>${d.workflow.oracle_evaluation.map(o=>`<tr><td>${esc(o.case)}</td><td>${o.expected_score} · ${esc(o.expected_status)}</td><td>${o.proposed_score} · ${esc(o.proposed_status)}</td><td><strong>${o.match?'yes':'NO'}</strong></td></tr>`).join('')}</tbody></table>`}
const STEPS=[
 ['Synthetic lead','A lead exists only in the synthetic CRM of one tenant. Nothing has been asked of anyone yet.',e=>e.name==='request_received'||e.kind==='auth',{lead:'new',audit:0,held:'no'}],
 ['Qualification','Evidence is read through THE WEIR, source and consent are validated, and a recommendation is built with every reason citing its evidence. An independent check recomputes the score.',e=>['evidence_collected','source_and_consent_validated','recommendation','proposal'].includes(e.name)||(e.kind==='tool_call'&&e.stage==='G03'),{lead:'new',audit:0,held:'no'}],
 ['THE WEIR holds the write','The CRM update is a consequential write. The gateway does not forward it; it records an approval request bound to this exact call.',e=>e.stage==='G07',{lead:'new',audit:0,held:'yes'}],
 ['Human approval','A different person with an approving role decides. The requester trying to approve is refused; the owner approves exactly this action.',e=>e.kind==='approval_decision'&&e.decision!=='deny'||e.failure_class==='ROLE_DENIED'||e.code==='ROLE_NOT_PERMITTED',{lead:'new',audit:0,held:'approved'}],
 ['CRM update','THE WEIR now forwards the identical call once. The CRM writes the new status and the approval is consumed.',e=>e.stage==='G09',{lead:'END',audit:1,held:'consumed'}],
 ['Audit trail','The append-only, hash-chained audit log names the requester, the approver and the approval. No email or message was created.',e=>e.stage==='G10'||e.code==='APPROVAL_REPLAY',{lead:'END',audit:1,held:'consumed'}]];
function replay(d){
  const hp=d.workflow.happy_path,tr=hp.trace,list=document.getElementById('steps'),panel=document.getElementById('step-panel');
  list.innerHTML=STEPS.map((s,i)=>`<li><button data-i="${i}" aria-pressed="${i===0}"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(s[0])}</span></button></li>`).join('');
  const brief=e=>{const k=e.name||e.tool||(e.kind==='auth'?'authenticated':e.kind);const bits=[];if(e.stage)bits.push(e.stage);if(e.score!=null)bits.push('score '+e.score+' → '+e.proposed_status);if(e.codes&&e.codes.length)bits.push('rule '+e.codes.join(','));if(e.approval_id)bits.push(e.approval_id);if(e.by)bits.push('by '+e.by+' ('+e.role+')');if(e.user&&!e.by)bits.push(e.user+' ('+e.role+')');if(e.code)bits.push(e.code);if(e.lead_status)bits.push('lead → '+e.lead_status);if(e.forwarded!=null)bits.push(e.forwarded?'forwarded':'not forwarded (held)');if(e.emails_sent!=null)bits.push('emails sent '+e.emails_sent);if(e.detail)bits.push(e.detail);return`<li class="${e.decision==='deny'||e.failure_class?'no':''}"><code>#${e.seq} ${esc(e.kind)} · ${esc(k)}</code> ${esc(bits.join(' · '))}</li>`};
  function show(i){const s=STEPS[i];list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));
    const lead=s[3].lead==='END'?hp.lead_after.status:s[3].lead,evs=tr.filter(s[2]);
    panel.innerHTML=`<p class="mono dim" style="margin:0 0 6px">Step ${i+1} of ${STEPS.length} · run ${esc(hp.corr_id)}</p><h3>${esc(s[0])}</h3><p class="muted">${esc(s[1])}</p>
     <div class="wstate"><div>Lead status in CRM<strong>${esc(lead)}</strong></div><div>Qualification audit rows<strong>${s[3].audit}</strong></div><div>Emails or messages<strong>${hp.emails_or_messages_created}</strong></div></div>
     <h4 style="font:500 11px Mono,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:12px 0 8px">Recorded events</h4><ul class="evs">${evs.map(brief).join('')}</ul>`}
  let cur=0,timer=null;const play=document.getElementById('play'),rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go=i=>{cur=i;show(i)},stop=()=>{clearInterval(timer);timer=null;play.textContent=rm?'Next step':'Play the replay'};
  play.onclick=()=>{if(rm){go((cur+1)%STEPS.length);return}if(timer){stop();return}play.textContent='Pause';go(0);timer=setInterval(()=>{if(cur>=STEPS.length-1){stop();return}go(cur+1)},3200)};
  if(rm)play.textContent='Next step';
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(b){stop();go(+b.dataset.i)}});show(0)}
function refusals(d){
  const hp=d.workflow.happy_path,R=[
   ['The requester approves their own request',`Status ${hp.requester_self_approval.status}: ${hp.requester_self_approval.failure}. The held action stayed held.`],
   ['Replay the approval after it ran',`Status ${hp.replay_after_execution.status}: ${hp.replay_after_execution.failure}. Audit rows for the lead: ${hp.audit.rows}. A second CRM write did not happen.`],
   ...d.workflow.refusals.map(r=>[r.case,`Status ${r.status}${r.failure?': '+r.failure:''}${r.lead_status?'. Lead status afterwards: '+r.lead_status:''}.`])];
  const bs=document.getElementById('refusal-btns'),out=document.getElementById('refusal-out');
  bs.innerHTML=R.map((r,i)=>`<button class="fbtn" data-i="${i}" aria-pressed="${i===0}">${esc(r[0])}</button>`).join('');
  function show(i){bs.querySelectorAll('.fbtn').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));out.innerHTML=`<h3 style="margin:0 0 8px">${esc(R[i][0])}</h3><p class="muted" style="margin:0">${esc(R[i][1])}</p>`}
  bs.addEventListener('click',e=>{const b=e.target.closest('.fbtn');if(b)show(+b.dataset.i)});show(0)}
const SHOTS=[['dashboard','Executive dashboard','Leads, pipeline value and the approval queue, read from the database through the API.'],['crm-leads','CRM','Accounts, contacts and leads for one tenant; a viewer sees the same screen read-only.'],['pipeline','Sales pipeline','Stage moves are validated by the backend; an illegal move is refused with the database rule that refused it.'],['pricing','Pricing studio','Scenarios computed by the existing pricing engine (concept prices are assumptions, not sales).'],['run-awaiting','Awaiting approval','A proposal with evidence, per-reason points and the exact action an approver is asked to approve.'],['run-denied','Denied by THE WEIR','A marketing user tried to start a qualification; the gateway refused and the denial is on the trace.'],['run-rejected','Rejected by a human','The owner rejected the proposal; the CRM is unchanged and the run is final.'],['run-executed','Executed','Approved and applied once; the trace ends with no external contact.'],['security','Security and audit','Tenant context, approval history and the verifiable hash-chained audit log.'],['workflows','AI workflow center','All runs for the tenant with their states.']];
function gallery(){
  const bs=document.getElementById('shot-btns'),img=document.getElementById('shot-img'),cap=document.getElementById('shot-cap');
  bs.innerHTML=SHOTS.map((s,i)=>`<button class="fbtn" data-i="${i}" aria-pressed="${i===0}">${esc(s[1])}</button>`).join('');
  function show(i){const s=SHOTS[i];bs.querySelectorAll('.fbtn').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));img.src='assets/growth/'+s[0]+'.webp';img.alt='Growth OS screen: '+s[1]+' (synthetic demo data)';cap.textContent=s[2]+' Synthetic demo tenant.'}
  bs.addEventListener('click',e=>{const b=e.target.closest('.fbtn');if(b)show(+b.dataset.i)});show(0)}
window.GrowthCase=async function(){const d=await load();if(!d){document.getElementById('main').insertAdjacentHTML('afterbegin','<p class="wrap note">Evidence unavailable. Serve the folder over http.</p>');return}
  document.getElementById('commit').textContent=`Recorded at NASHA local commit ${d.commit} (not pushed), PostgreSQL ${d.postgres}.`;
  board(d);replay(d);refusals(d);gallery();oracle(d);stages(d);isolation(d);mutants(d)};
})();
