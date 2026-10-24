/* One architecture, two businesses. Renders data/growth-os-evidence.json -> m5 (output of tools/m5_evidence.py in the engineering repository: a real run of the HTTP API for a fresh fitness-studio project, the evaluations, the authorisation matrix and a
   comparison of what the two tenants share). Nothing is calculated, simulated or fetched from a backend in the browser. */
(()=>{'use strict';
const esc=s=>String(s==null?'—':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=(s,r=document)=>r.querySelector(s);
const tbl=(head,rows)=>`<div class="tablewrap" tabindex="0" role="region" aria-label="Data table (scrollable)"><table class="ev"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const kpi=(a,b)=>`<div class="kpi"><div class="big-n">${esc(a)}</div><p class="note">${esc(b)}</p></div>`;
const pct=x=>(x*100).toFixed(0)+'%';
const TIER={primary_page_read:'Official page opened and read',official_domain_snippet:'Official domain in a search result (page not opened)',secondary_only:'Directory, press or encyclopedia mention only'};
function render(m){
  const A=m.architecture,J=m.journey,S=m.supplier_research,E=m.evaluations,Z=m.authorization,M=m.model;
  $('#k-m5').innerHTML=[kpi(A.tables_used_by_both_businesses+' of '+A.tables_in_schema,'tables used by both businesses (same schema, same row-level security)'),kpi(J.steps.filter(s=>s.ok).length+'/'+J.steps.length,'studio launch steps recorded through the same API'),kpi(Z.summary.correct+'/'+Z.summary.checks,'role × operation checks correct in both businesses'),kpi(S.verified_from_primary_page+' of '+S.suppliers,'real suppliers verified from a page read (not claimed)')].join('');
  $('#bz-shared').innerHTML=`<ul class="proofs"><li><span class="chip t">Shared</span><span>${A.code_paths_shared.map(esc).join(' · ')}</span></li><li><span class="chip">Differs</span><span>Only configuration: ${A.configuration_that_differs.map(k=>'<code>'+esc(k)+'</code>').join(', ')} in the industry profile, the seed data and the supplier classification vocabulary. Hospitality derives needs from <b>${esc(A.profile_keys.hospitality.join(' and '))}</b>; the studio from <b>${esc(A.profile_keys.fitness.join(' and '))}</b>.</span></li></ul>`
    +tbl(['Table','NASHA rows','Meridian rows'],A.tables_both.slice(0,14).map(t=>[`<code>${esc(t)}</code>`,esc(A.row_counts[t]['tenant-nasha']),esc(A.row_counts[t]['tenant-fit'])]))+`<p class="note">${esc(A.note)} First 14 of ${A.tables_both.length} shared tables shown; ${A.rls_policies} row-level-security policies are active in the schema.</p>`;
  const list=$('#bz-steps'),panel=$('#bz-panel');
  list.innerHTML=J.steps.map((s,i)=>`<li><button data-i="${i}" aria-pressed="${i===0}"><b>${String(s.n).padStart(2,'0')}</b><span>${esc(s.label)}</span></button></li>`).join('');
  const show=i=>{const s=J.steps[i];list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));
    panel.innerHTML=`<p class="mono dim" style="margin:0 0 6px">Step ${s.n} of ${J.steps.length} · acting role: ${esc(s.role)}</p><h3>${esc(s.label)}</h3><p><span class="chip ${s.ok?'t':''}">${s.ok?'Recorded and checked':'DID NOT PASS'}</span></p><p>${esc(s.result)}</p>${s.needs_from?`<p class="note">Needs derived from: <b>${esc([].concat(s.needs_from).join(', '))}</b>. No recipe is used.</p>`:''}`};
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(+b.dataset.i)});show(0);
  $('#bz-jnote').textContent=J.project+'. Synthetic: a recorded recommendation places no order and contacts no supplier.';
  const tiers=Object.keys(TIER).map(k=>[esc(TIER[k]),esc(S.evidence_tiers[k]||0)]);
  $('#bz-suppliers').innerHTML=`<div class="kpis">${kpi(S.suppliers,'real businesses researched on '+S.researched_on)+kpi(S.shortlisted,'shortlisted as leads')+kpi(S.verified_from_primary_page,'verified from a primary page')+kpi(S.blocked_host_count,'hosts the network refused')}</div>`
    +tbl(['Evidence tier','Businesses'],tiers)+tbl(['Business','Category','Area','Sources seen'],S.records.map(r=>[esc(r.name)+(r.shortlisted?' <span class="chip">shortlisted</span>':''),esc(r.category),esc(r.service_area),esc(r.sources.map(x=>x.kind.replace(/_/g,' ')).join(', '))]))+`<p class="note">${esc(S.note)}</p>`;
  const sh=E.supplier.held_out,sd=E.supplier.development,fd=E.financial,g=E.generalisation;
  const row=(n,dev,ho)=>[esc(n),dev,ho];
  $('#bz-eval').innerHTML=tbl(['Measure','Development set (rules tuned on it)','Held-out set (written after the rules were frozen)'],[
    row('Duplicate-supplier detection precision',sd.dedupe.precision.toFixed(2)+' ('+sd.dedupe.cases+' pairs)',sh.dedupe.precision.toFixed(2)+' ('+sh.dedupe.cases+' pairs)'),
    row('Duplicate-supplier detection recall',sd.dedupe.recall.toFixed(2),'<b>'+sh.dedupe.recall.toFixed(2)+'</b> ('+sh.dedupe.false_negative+' missed)'),
    row('Supplier classification',sd.classification.correct+'/'+sd.classification.cases,'<b>'+sh.classification.correct+'/'+sh.classification.cases+'</b>'),
    row('Service-area match',sd.service_area.correct+'/'+sd.service_area.cases,sh.service_area.correct+'/'+sh.service_area.cases),
    row('Financial model, hand-worked cases',fd.development.correct+'/'+fd.development.cases,fd.held_out.correct+'/'+fd.held_out.cases+' ('+fd.held_out.fields_checked+' fields)'),
    row('Second-industry generalisation cases','—',g.correct+'/'+g.cases+' hand-worked')])
    +`<details class="tech"><summary>Held-out misses, left unfixed so the figures stay honest</summary><ul class="limits">${sh.dedupe.misses.map(x=>`<li>Not detected as the same business: ${esc(x)}</li>`).join('')}${sh.classification.misses.map(x=>`<li>Misclassified: ${esc(x)}</li>`).join('')}</ul></details>`
    +`<details class="tech"><summary>${g.mutants.filter(x=>x.killed).length} of ${g.mutants.length} generalisation mutants caught</summary><ul class="limits">${g.mutants.map(x=>`<li><b>${x.killed?'CAUGHT':'SURVIVED'}</b> ${esc(x.name)}: ${esc(x.removes)}</li>`).join('')}</ul></details><p class="note">${esc(E.supplier.note)}</p>`;
  $('#bz-authz').innerHTML=`<div class="kpis">${kpi(Z.summary.allowed_checked,'allowed actions exercised')+kpi(Z.summary.denied_checked,'forbidden actions exercised (all refused)')+kpi(Z.mutants.filter(x=>x.killed).length+'/'+Z.mutants.length,'policy-widening mutants caught')}</div>`
    +`<details class="tech"><summary>What each mutant quietly allows</summary><ul class="limits">${Z.mutants.map(x=>`<li><b>${x.killed?'CAUGHT':'SURVIVED'}</b> ${esc(x.name)}: ${esc(x.widens)}<br><span class="note">${esc(x.first_catch||'')}</span></li>`).join('')}</ul></details><p class="note">${esc(Z.note)}</p>`;
  $('#bz-model').innerHTML=`<ul class="proofs"><li><span class="chip">${M.model_execution_recorded?'Recorded':'Not run'}</span><span><b>${M.model_execution_recorded?'A model run is recorded.':'No language model has run in this project.'}</b> ${esc(M.note)}</span></li><li><span class="chip">Decision</span><span>${esc(M.decision_needed||'None outstanding.')}</span></li><li><span class="chip">Harness</span><span><code>${esc(M.harness)}</code>; ${esc(M.live_test)}</span></li></ul>`;
  const ph=[['m5-fit-requirements','Meridian Fitness: stated equipment and service requirements, and the recorded project history.'],['m5-fit-procurement','Meridian Fitness: a procurement recommendation from requirements and supplier quotes, no recipes.'],['m5-nasha-suppliers','NASHA: real research leads with their evidence tiers.']];
  $('#bz-shots').innerHTML=ph.map(([f,c])=>`<figure class="shot"><img src="assets/growth/${f}.webp" width="1440" height="900" loading="lazy" alt="${esc(c)} Screenshot of the running application."><figcaption class="note">${esc(c)}</figcaption></figure>`).join('')}
window.TwoBusinessCase=async function(){let d=null;try{const r=await fetch('data/growth-os-evidence.json');if(r.ok)d=await r.json()}catch(e){}
  if(!d||!d.m5){const n=$('#bz-jnote');if(n)n.textContent='Milestone 5 evidence did not load.';return}render(d.m5)};
})();
