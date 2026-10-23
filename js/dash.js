/* Reliability and security dashboards. Every number comes from data.dashboards.metrics (claims with a recorded source); this script renders only those and, in "show sources" mode, prints each source pointer.
   It computes nothing about the system: ratios are formatted, never derived. Recorded SYNTHETIC scenarios, not real incidents. */
(()=>{'use strict';
const esc=s=>String(s==null?'—':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let MAP={};
const V=id=>{const m=MAP[id];if(!m)throw new Error('missing metric '+id);return m.value};
const S=id=>{const m=MAP[id];return m?`${m.source.file}#${m.source.pointer}`:''};
const N=(id,fmt)=>{const m=MAP[id];if(!m)return'<span class="mv bad">missing</span>';const v=m.value;const t=fmt?fmt(v):typeof v==='number'?v.toLocaleString('en-US'):esc(v);return`<span class="mv" data-src="${esc(S(id))}">${t}</span>`};
const pct=v=>(100*v).toFixed(v===1||v===0?0:1)+'%';
const cat=k=>k.replace(/_/g,' ');
const bars=(cats,prefix)=>cats.map(k=>{const n=V(`eval.cat.${k}.n`),p=V(`eval.cat.${k}.passed`);return`<div class="bar"><span>${esc(cat(k))}</span><i><b style="width:${100*p/n}%"></b></i><span class="mono">${N(`eval.cat.${k}.passed`)}/${N(`eval.cat.${k}.n`)}</span></div>`}).join('');
const tests=g=>`<ul class="tl2">${g.map(t=>`<li data-ok="${t.outcome==='passed'}"><b>${t.outcome==='passed'?'PASS':esc(t.outcome.toUpperCase())}</b><code>${esc(t.test.split('::')[1])}</code></li>`).join('')}</ul>`;
const caseTable=(d,cats)=>{
  return`<table class="ev"><thead><tr><th>Case</th><th>Category</th><th>Result</th><th>Orders created</th></tr></thead><tbody>${d.dashboards.reliability.cases.filter(c=>cats.includes(c.category)).map(c=>`<tr><td><code>${esc(c.id)}</code></td><td>${esc(cat(c.category))}</td><td>${c.passed?'<span class="chip t">passed</span>':'<span class="chip" style="color:var(--bad)">FAILED</span>'}</td><td>${c.purchase_orders==null?'—':c.purchase_orders}</td></tr>`).join('')}</tbody></table>`};
function srcToggle(){const b=document.getElementById('srcbtn');if(!b)return;b.addEventListener('click',()=>{const on=document.body.classList.toggle('show-src');b.setAttribute('aria-pressed',on);b.textContent=on?'Hide sources':'Show sources'})}
function reliability(d,gate){
  const R=d.dashboards.reliability,$=id=>document.getElementById(id),h=(id,html)=>{const e=$(id);if(e)e.innerHTML=html};
  h('k-pass',`${N('eval.pass_rate',pct)}<small>evaluation pass rate</small>`);
  h('k-cases',`${N('eval.passed')}<small>of ${N('eval.cases')} cases passed</small>`);
  h('k-mut',`${N('mut.killed')}<small>of ${N('mut.total')} mutants caught</small>`);
  h('k-tests',`${N('suite.passed')}<small>tests passed · ${N('suite.failed')} failed · ${N('suite.skipped')} skipped</small>`);
  h('cat-bars',bars(R.categories));
  h('mut-grid',D.metrics.filter(m=>/^mut\.\d+$/.test(m.id)).map(m=>`<li class="${m.value?'':'live'}" data-src="${esc(S(m.id))}"><b>${m.value?'CAUGHT':'SURVIVED'}</b>${esc(m.text.replace('mutant caught: ',''))}</li>`).join(''));
  h('tool-tests',tests(R.test_groups.tool_failures));
  const toolc=['tool_failure'];h('tool-bars',bars(toolc)+`<p class="note">${N('eval.tool_failure_safety',pct)} tool-failure safety in the evaluation. Failure classes recorded in the replayed scenarios: ${d.scenarios.filter(s=>s.failure_class).map(s=>`<code data-src="${esc(S('scn.'+s.id+'.failure_class'))}">${esc(s.failure_class)}</code>`).join(' ')}</p>`);
  h('auth-bars',bars(['authorization_failure','approval_bypass','cross_tenant'])+`<p class="note">Unauthorized-action rate: <strong>${N('eval.unauthorized_action_rate',pct)}</strong> · false-authorization rate ${N('eval.false_authorization_rate',pct)}</p>`);
  h('auth-cases',caseTable(d,['authorization_failure','approval_bypass','cross_tenant']));
  h('abst-bars',bars(['abstention','missing_data','contradictory_evidence','retrieval_failure'])+`<p class="note">Abstention quality: ${N('eval.abstention_quality',pct)}</p>`);
  h('abst-cases',caseTable(d,['abstention','missing_data','contradictory_evidence','retrieval_failure']));
  h('ground-bars',bars(['hallucination_detection','source_attribution','unsafe_proposal','prompt_injection'])+`<p class="note">Hallucination-detection rate ${N('eval.hallucination_detection_rate',pct)} · answer correctness ${N('eval.answer_correctness',pct)}</p>`);
  h('ground-tests',tests(R.test_groups.grounding));
  const cov=D.metrics.filter(m=>/^cov\.file\./.test(m.id));
  h('cov',cov.length?`<div class="big-n">${N('cov.percent',v=>v+'%')}<small>line coverage of the governed package (${N('cov.statements')} statements)</small></div><div class="bars" style="margin-top:20px">${cov.map(m=>`<div class="bar"><span>${esc(m.text.split('/').pop())}</span><i><b style="width:${m.value}%"></b></i><span class="mono" data-src="${esc(S(m.id))}">${m.value}%</span></div>`).join('')}</div>`:'<p class="note">No coverage measurement is present in the evidence bundle.</p>');
  h('mods',`<table class="ev"><thead><tr><th>Test module</th><th>Passed</th></tr></thead><tbody>${D.metrics.filter(m=>/^mod\./.test(m.id)).map(m=>`<tr><td><code>${esc(m.id.slice(4))}</code></td><td>${N(m.id)}</td></tr>`).join('')}</tbody></table>`);
  h('limits',R.limitations.map(x=>`<li><span class="chip">Limit</span><span>${esc(x)}</span></li>`).join(''));
  renderGate(gate);
}
function renderGate(rep){const gt=document.getElementById('gates'),hd=document.getElementById('ghd');if(!gt)return;
  if(!rep){gt.innerHTML='<li data-s="REQUIRES_REVIEW"><b>UNAVAILABLE</b><span>Release-gate report not loaded.</span></li>';return}
  hd.innerHTML=`<strong class="${rep.overall==='PASS'?'PP':rep.overall==='FAIL'?'FF':'RR'}">${esc(rep.overall.replace('_',' '))}</strong><span class="note">Local run at ${esc(rep.evidence_commit)}. Remote CI: <b>${esc(rep.remote_ci)}</b> — ${esc(rep.remote_ci_note)}</span>`;
  gt.innerHTML=Object.entries(rep.gates).map(([k,v])=>`<li data-s="${v.status}"><b>${v.status==='REQUIRES_REVIEW'?'REVIEW':v.status}</b><strong>${esc(k.replace(/_/g,' '))}</strong><span>${esc(v.detail.length>170?v.detail.slice(0,167)+'…':v.detail)}</span></li>`).join('')}
const LAYER={unauthorised_role_blocked:'THE WEIR policy (role has no write tool)',cross_tenant_blocked:'Identity: another tenant’s signature',expired_approval:'Approval expiry',modified_after_approval:'Call-bound approval (hash mismatch)',replayed_approval_and_duplicate_request:'Single-use approval + idempotency',malformed_agent_output:'Validation gate (abstain)',prompt_injection_in_supplier_note:'Untrusted label + validation gate',approved_draft_po:'Allowed path: human approval, draft only'};
function security(d){
  const Sx=d.dashboards.security,$=id=>document.getElementById(id),h=(id,html)=>{const e=$(id);if(e)e.innerHTML=html};
  const sc=Sx.scenarios,po=d.scenarios.reduce((a,s)=>a+s.purchase_orders_created,0);
  h('k-scn',`${sc.length}<small>recorded synthetic scenarios</small>`);
  h('k-den',`${sc.filter(s=>s.denied).length}<small>denied or blocked</small>`);
  h('k-appr',`${sc.reduce((a,s)=>a+s.approvals_requested,0)}<small>approval requests held</small>`);
  h('k-exp',`${sc.filter(s=>s.expired).length}<small>expired approval refused</small>`);
  h('k-tx',`${d.scenarios.reduce((a,s)=>a+s.external_transmissions,0)}<small>external transmissions</small>`);
  h('scn-table',`<table class="ev"><thead><tr><th>Scenario</th><th>Stopped by</th><th>Outcome</th><th>Failure class</th><th>Draft POs</th><th>Sent</th><th>Audit chain</th></tr></thead><tbody>${sc.map(s=>`<tr><td>${esc(s.title)}</td><td>${esc(LAYER[s.id]||'')}</td><td>${N('scn.'+s.id+'.outcome')}</td><td>${N('scn.'+s.id+'.failure_class')}</td><td>${N('scn.'+s.id+'.purchase_orders_created')}</td><td>${N('scn.'+s.id+'.external_transmissions')}</td><td>${N('scn.'+s.id+'.audit_chain_valid',v=>v?'valid':'BROKEN')}</td></tr>`).join('')}</tbody></table><p class="note" style="margin-top:12px">Draft POs: the approved scenario creates one by design; the replay scenario shows 1 because the original approval was consumed once and the duplicate was refused.</p>`);
  const grp=(id,g,title,extra='')=>h(id,`<h3>${title}</h3>${extra}${tests(Sx.test_groups[g])}`);
  grp('g-auth','authorization_enforcement','Authorization enforcement tests');
  grp('g-tenant','tenant_isolation','Cross-tenant isolation tests',bars_for(d,['cross_tenant']));
  grp('g-exp','expired_approvals','Expired-approval tests');
  grp('g-audit','audit_completeness','Audit completeness tests');
  grp('g-sec','security_regression','Security regression tests');
  const sel=$('inc-pick');if(sel){sel.innerHTML=sc.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('');const show=()=>{const i=Sx.incidents[sel.value];
    $('inc-out').innerHTML=`<dl class="qa">${Object.entries(i.answers).map(([q,a])=>`<div><dt>${esc(q)}</dt><dd>${Array.isArray(a)?a.map(x=>`<span class="chip">${esc(x)}</span>`).join(' ')||'—':typeof a==='object'&&a?esc(JSON.stringify(a)):esc(a)}</dd></div>`).join('')}</dl>
      <h4>Authorization events</h4><ol class="aud">${i.authorization.map(e=>`<li>${esc(e.decision||'')} ${esc(e.code||'')} ${esc(e.role||'')}</li>`).join('')||'<li>none recorded</li>'}</ol>
      <h4>Audit trail (${i.audit_rows.length} rows, hash-chained)</h4><ol class="aud">${i.audit_rows.map(a=>`<li>${esc(a.action)}${a.role?' · '+esc(a.role):''}</li>`).join('')}</ol>
      <p class="note">Recorded synthetic scenario; produced by <code>governed/incident.py</code> from the run’s trace, ledger and approval store. No secrets appear in the report (tested).</p>`};sel.addEventListener('change',show);show()}
}
function bars_for(d,cats){return`<div class="bars" style="margin:10px 0 16px">${bars(cats)}</div>`}
let D=null;
window.Dashboards=async function(kind){
  D=await loadEvidence();if(!D||!D.dashboards){document.querySelector('main').insertAdjacentHTML('afterbegin','<p class="wrap note">Evidence file unavailable. Serve the folder over http.</p>');return}
  MAP=Object.fromEntries(D.dashboards.metrics.map(m=>[m.id,m]));
  let gate=null;try{const r=await fetch('data/release-gate-report.json');if(r.ok)gate=await r.json()}catch(e){}
  srcToggle();(kind==='security'?security:reliability)(D,gate);
};
})();
