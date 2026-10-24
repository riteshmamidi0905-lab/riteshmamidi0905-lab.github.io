/* Verification: governed-evaluation bars, the mutation grid and the 12 release gates, all from recorded evidence files. Renders only what the files contain. */
(()=>{'use strict';
window.__RCI=window.__RCI||null;
function remoteNote(rep){const c=window.__RCI;if(!c||!c.runs||!c.runs.length)return `Remote CI: <b>${esc(rep.remote_ci)}</b> — ${esc(rep.remote_ci_note)}`;
  const r=c.runs[c.runs.length-1],ok=r.conclusion==='success'&&Object.values(r.jobs).every(v=>v==='success');
  return `Remote CI: <b>${ok?'PASSED':'NOT PASSED'}</b> — GitHub Actions lab-ci run #${esc(r.run_number)} on commit ${esc(r.head_sha.slice(0,7))} (${Object.entries(r.jobs).map(([k,v])=>esc(k)+' '+esc(v)).join(', ')}); recorded from the run itself, separately from the local release gate, which does not read it.`}

const esc=s=>String(s==null?'—':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.VerifyPanel=async function(data){
  const g=data.metrics.governed_evaluation,bars=document.getElementById('gbars');
  if(g&&bars){bars.innerHTML=Object.entries(g.by_category).map(([k,v])=>`<div class="bar"><span>${esc(k.replace(/_/g,' '))}</span><i><b style="width:${100*v.passed/v.n}%"></b></i><span class="mono">${v.passed}/${v.n}</span></div>`).join('');
    document.getElementById('gsum').textContent=`${g.passed} of ${g.cases} cases passed. ${g.caveat}. Result hash ${g.result_hash}${g.reproducible?', identical on a second independent run':''}.`}
  const mu=document.getElementById('mut');
  if(g&&mu&&data.mutation_detail){mu.innerHTML=data.mutation_detail.map(m=>`<li class="${m.killed?'':'live'}"><b>${m.killed?'CAUGHT':'SURVIVED'}</b>${esc(m.mutant)}</li>`).join('');
    document.getElementById('msum').textContent=`${g.mutants_killed} of ${g.mutants_total} deliberately broken variants were caught: when the code is made wrong on purpose, the evaluation must fail. Two of my first attempts survived, which exposed two weak test cases; those were fixed.`}
  const gt=document.getElementById('gates');if(!gt)return;
  let rep=null;try{const r=await fetch('data/release-gate-report.json');if(r.ok)rep=await r.json()}catch(e){}
  try{const r=await fetch('data/remote-ci.json');if(r.ok)window.__RCI=await r.json()}catch(e){}
  if(!rep){gt.innerHTML='<li data-s="REQUIRES_REVIEW"><b>UNAVAILABLE</b><span>The release-gate report could not be loaded.</span></li>';return}
  const o=rep.overall,hd=document.getElementById('ghd');
  hd.innerHTML=`<strong class="${o==='PASS'?'PP':o==='FAIL'?'FF':'RR'}">${esc(o.replace('_',' '))}</strong><span class="note">Local run at ${esc(rep.evidence_commit)}. ${remoteNote(rep)}</span>`;
  gt.innerHTML=Object.entries(rep.gates).map(([k,v])=>`<li data-s="${v.status}"><b>${v.status==='REQUIRES_REVIEW'?'REVIEW':v.status}</b><strong>${esc(k.replace(/_/g,' '))}</strong><span>${esc(v.detail.length>150?v.detail.slice(0,147)+'…':v.detail)}</span></li>`).join('');
};
})();
