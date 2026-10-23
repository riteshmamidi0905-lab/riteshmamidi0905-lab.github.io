/* Audit-chain incident panel: numbers come from data/growth-os-evidence.json -> incident (recorded test runs); the two timelines are an explanatory model of the code path, not a measurement. */
(()=>{'use strict';
const esc=s=>String(s==null?'—':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SRC='data/growth-os-evidence.json#incident.';
const tot=s=>{const f=/(\d+) failed/.exec(s),p=/(\d+) passed/.exec(s);return{failed:f?+f[1]:0,passed:p?+p[1]:0}};
const mv=(v,p)=>`<span class="mv" data-src="${SRC}${p}">${esc(v)}</span>`;
async function go(){
  const box=document.getElementById('inc-kpis');if(!box)return;
  let d=null;try{const r=await fetch('data/growth-os-evidence.json');if(r.ok)d=(await r.json()).incident}catch(e){}
  if(!d){box.innerHTML='<p class="note">Incident evidence did not load.</p>';return}
  const b=d.before_fix.runs.map(r=>tot(r.summary)),a=d.after_fix;
  const per=b[0].failed+b[0].passed,bf=b.filter(x=>x.failed>0).length;
  box.innerHTML=
   `<div class="kpi"><div class="big-n">${mv(b[0].failed+' of '+per,'before_fix.runs[0].summary')}</div><p class="note">tests failed with the pre-fix audit write, in ${mv(bf+' of '+b.length,'before_fix.runs')} repeat runs</p></div>`+
   `<div class="kpi"><div class="big-n">${mv(a.passed_runs+' of '+a.repeats,'after_fix.passed_runs')}</div><p class="note">repeat runs fully passing after the fix (same tests, unhandled-thread warnings treated as errors)</p></div>`+
   `<div class="kpi"><div class="big-n">${mv(d.original_failure.threads_failed+' of '+d.original_failure.threads_total,'original_failure.threads_failed')}</div><p class="note">racing requests that could not write their refusal record in the original run</p></div>`;
  const ev=document.getElementById('inc-evid');if(ev)ev.innerHTML=`Recorded at engineering commit ${mv(d.commit,'commit')}; service.py sha256 ${mv(d.file_sha256['nasha_lab/growth/service.py'].slice(0,16)+'…','file_sha256')}. Reproduce: <code>python tools/audit_concurrency_incident.py</code>.`;
}
addEventListener('DOMContentLoaded',go);
})();
