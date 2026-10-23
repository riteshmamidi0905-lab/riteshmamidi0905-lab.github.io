/* Pipeline film: the eight stages of one RECORDED synthetic run, driven by data/nasha-governed-evidence.json (scenario "approved_draft_po" + the "story" block).
   It replays recorded values; it executes nothing and calls no backend. Scroll, buttons, arrow keys and the rail all move the same index. */
(()=>{'use strict';
const esc=s=>String(s==null?'—':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>typeof n==='number'?n.toLocaleString('en-US'):esc(n);
const STAGES=[
 {n:'Synthetic orders',w:'data',h:'A simulator invents a restaurant’s sales.',ev:'enterprise_sim.py · test_enterprise_sim.py',
  t:d=>`${fmt(d.orders.order_lines)} order lines and ${fmt(d.orders.recipes)} recipes, generated from a seed, so a rebuild is byte-identical. None of it is a real business.`,
  v:d=>`<div class="big-n">${fmt(d.orders.orders)}<small>synthetic orders</small></div>`},
 {n:'Inventory',w:'data',h:'Recipes turn sales into expected stock use.',ev:'scenario.py · depletion recomputed independently in test_scenario_d87.py',
  t:d=>`${esc(d.ingredient_name)} at ${esc(d.site)}, week ${esc(d.week)}. The counted stock says more left the shelf than the recipes and sales explain.`,
  v:d=>{const i=d.inventory,m=Math.max(i.theoretical_use,i.measured_use);return`<div class="duel"><div><span>Expected use (recipes × sales)</span><i><b style="width:${100*i.theoretical_use/m}%"></b></i><em>${fmt(i.theoretical_use)} ${esc(d.unit)}</em></div><div><span>Measured use (opening + receipts − count)</span><i><b class="hot" style="width:${100*i.measured_use/m}%"></b></i><em>${fmt(i.measured_use)} ${esc(d.unit)}</em></div><p class="flag">+${esc(d.variance.variance_pct)}% vs expected · ${esc(d.variance.excess_pct)} points above this site’s own baseline (${esc(d.variance.pattern)}, severity ${esc(d.variance.severity)})</p></div>`}},
 {n:'Forecasting',w:'data',h:'A forecast says how much will be needed.',ev:'forecast.py · test_scenario_d87.py',
  t:d=>`${fmt(d.forecast.next_horizon_total)} ${esc(d.unit)} over ${fmt(d.forecast.days)} days (${esc(d.forecast.method)}); the agent cites the first 7 days: ${fmt(d.forecast.first_7_days)} ${esc(d.unit)}. Backtested with a rolling origin; never negative.`,
  v:d=>{const s=d.forecast.series,m=Math.max(...s,1);return`<div class="spark" role="img" aria-label="Forecast quantity per day for ${s.length} days">${s.map((v,i)=>`<b class="${i<7?'c':''}" style="height:${Math.max(4,100*v/m)}%"></b>`).join('')}</div><p class="note">Bright bars: the 7 days the agent cites.</p>`}},
 {n:'AI planner',w:'ai',h:'The agent explains, with every claim tied to evidence.',ev:'governed/agent.py · validation-gate tests',
  t:d=>`Planner: ${esc(d.planner.name)} (rule-based; no language model ran). Every number must match the evidence it cites or the claim is dropped. Supplier-written text is labelled untrusted.`,
  v:d=>`<ul class="claims">${d.planner.claims.map(c=>`<li>${esc(c.text)}<code>${c.evidence.map(esc).join(' · ')}</code></li>`).join('')}</ul>`},
 {n:'THE WEIR',w:'sys',h:'A default-deny gateway meets the write.',ev:'weir_bridge.py · mcp-weir gateway (separate repository, pinned)',
  t:d=>`The buyer’s role may <em>propose</em>, not <em>commit</em>. The write waits as ${fmt(d.weir.approvals_created)} approval, bound to this exact call: supplier, quote, quantity and amount.`,
  v:d=>`<div class="verdict"><b>HELD</b><span>${esc(d.weir.policy_decision)}</span></div><ul class="facts"><li>Default-deny policy per role</li><li>Write tool carries effect = write, gate = approve</li><li>Approval bound to the session and the call hash</li><li>Supplier-written text keeps its untrusted label</li></ul>`},
 {n:'Human approval',w:'sys',h:'A different person decides.',ev:'workflow.py · maker-checker, expiry, replay and tamper tests',
  t:d=>`Maker-checker: the requester cannot approve their own request. The approval expires, works once, and any change to quantity, supplier, quote or amount needs a new one.`,
  v:d=>`<div class="people"><div><span>Requested by</span><b>${esc(d.approval.requester_role)}</b></div><div class="arr" aria-hidden="true">→</div><div><span>Approved by</span><b>${esc(d.approval.approver_role)}</b></div></div><ul class="facts"><li>Requester ≠ approver (maker-checker)</li><li>Approval has an expiry and works once</li><li>Bound fields: supplier, quote, quantity, estimated cost</li></ul>`},
 {n:'Draft procurement',w:'prod',h:'The output is a draft, never a sent order.',ev:'ledger.py · CHECK constraint test',
  t:d=>{const p=d.planner.proposal||{};return`${fmt(p.qty)} ${esc(p.unit||d.unit)} from supplier ${esc(p.supplier_id)}, estimated $${fmt(p.est_cost_usd)} (synthetic quote). External transmissions: <strong>${fmt(d.draft.external_transmissions)}</strong>. The ledger schema cannot represent a sent order.`},
  v:d=>{const p=d.planner.proposal||{};return`<div class="po"><span>${esc(d.draft.po_id)}</span><b>${esc(d.draft.state)}</b></div><dl class="kv2"><div><dt>Supplier</dt><dd>${esc(p.supplier_id)}</dd></div><div><dt>Quote</dt><dd>${esc(p.quote_id)}</dd></div><div><dt>Quantity</dt><dd>${fmt(p.qty)} ${esc(p.unit)}</dd></div><div><dt>Estimated</dt><dd>$${fmt(p.est_cost_usd)}</dd></div><div><dt>Price class</dt><dd>${esc(p.price_class)}</dd></div><div><dt>Transmitted</dt><dd>${fmt(d.draft.external_transmissions)}</dd></div></dl>`}},
 {n:'Audit trail',w:'sys',h:'Every step is on the record.',ev:'ledger.py · test_audit_trail_is_tamper_evident',
  t:(d,s)=>`Hash-chained: editing any row breaks the chain. Chain verified: ${esc(s.audit_chain_valid)}.`,
  v:(d,s)=>`<div class="big-n">${fmt(d.audit.ledger_rows)}<small>ledger audit rows</small></div><ol class="aud">${s.audit.map(a=>`<li>${esc(a.action)}${a.role?` · ${esc(a.role)}`:''}</li>`).join('')}</ol>`}];
window.PipelineFilm=function(root,data){
  const st=data.story,sc=data.scenarios.find(x=>x.id==='approved_draft_po');if(!st||!sc){root.querySelector('.film-body').textContent='Recorded story data unavailable.';return}
  const body=root.querySelector('.film-body'),rail=root.querySelector('.rail'),live=root.querySelector('.film-live');
  rail.innerHTML=STAGES.map((s,i)=>`<li><button class="rn" data-i="${i}" data-w="${s.w}" aria-label="Stage ${i+1}: ${s.n}"><i>${String(i+1).padStart(2,'0')}</i><span>${s.n}</span></button></li>`).join('');
  body.innerHTML=STAGES.map((s,i)=>`<article class="fp" id="fp-${i}" data-i="${i}" data-w="${s.w}" aria-labelledby="fh-${i}"><div class="fl"><p class="mono eyebrow"><span class="dot"></span>Stage ${i+1} of ${STAGES.length} · ${s.n}</p><h3 id="fh-${i}">${s.h}</h3><p class="lead">${s.t(st,sc)}</p><p class="note ev">Evidence: ${s.ev}</p></div><div class="fr"><span class="ghost" aria-hidden="true">${String(i+1).padStart(2,'0')}</span>${s.v(st,sc)}</div></article>`).join('');
  const nodes=[...rail.querySelectorAll('.rn')],panels=[...body.querySelectorAll('.fp')];
  const mq=matchMedia('(min-width:900px) and (prefers-reduced-motion:no-preference)');
  let cur=0,pinned=false;
  function show(i,fromScroll){cur=Math.max(0,Math.min(STAGES.length-1,i));
    nodes.forEach((n,j)=>{n.classList.toggle('done',j<cur);n.classList.toggle('on',j===cur);n.setAttribute('aria-current',j===cur?'step':'false')});
    panels.forEach((p,j)=>{p.classList.toggle('on',j===cur);if(pinned)p.hidden=j!==cur});
    root.style.setProperty('--p',cur/(STAGES.length-1));root.dataset.world=STAGES[cur].w;
    live.textContent=`Stage ${cur+1} of ${STAGES.length}: ${STAGES[cur].n}`;
    root.querySelector('[data-act=prev]').disabled=cur===0;root.querySelector('[data-act=next]').disabled=cur===STAGES.length-1;
    if(!pinned&&!fromScroll){} }
  function setMode(){pinned=mq.matches;root.classList.toggle('pinned',pinned);panels.forEach(p=>p.hidden=pinned&&!p.classList.contains('on'));if(!pinned)panels.forEach(p=>p.hidden=false);show(cur,true)}
  function goto(i){if(pinned){const top=root.getBoundingClientRect().top+scrollY,span=root.offsetHeight-innerHeight;scrollTo({top:top+span*(i/(STAGES.length-1)+.001),behavior:'auto'})}else{panels[i].scrollIntoView({block:'center'})}show(i,true)}
  nodes.forEach(n=>n.addEventListener('click',()=>goto(+n.dataset.i)));
  root.querySelector('[data-act=prev]').addEventListener('click',()=>goto(cur-1));root.querySelector('[data-act=next]').addEventListener('click',()=>goto(cur+1));
  root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowDown'&&pinned){e.preventDefault();goto(cur+1)}else if(e.key==='ArrowLeft'||e.key==='ArrowUp'&&pinned){e.preventDefault();goto(cur-1)}});
  let tick=0;addEventListener('scroll',()=>{if(!pinned||tick)return;tick=requestAnimationFrame(()=>{tick=0;const r=root.getBoundingClientRect(),span=root.offsetHeight-innerHeight;if(r.top>innerHeight||r.bottom<0)return;const p=Math.max(0,Math.min(1,-r.top/span));const i=Math.round(p*(STAGES.length-1));if(i!==cur)show(i,true)})},{passive:true});
  mq.addEventListener('change',setMode);setMode();
};
})();
