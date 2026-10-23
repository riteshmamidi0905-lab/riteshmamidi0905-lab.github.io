/* Trace player: replays REAL recorded scenario timelines (data/nasha-governed-evidence.json). Nothing here executes a workflow. */
(()=>{'use strict';
const FRIENDLY={request_received:'Request received (correlation id assigned)',dataset_provenance:'Dataset provenance recorded',recipes_to_consumption:'Recipes become expected consumption',inventory_movement:'Inventory movement read',discrepancy_detected:'Discrepancy detected by the variance detector',discrepancy_quantified:'Discrepancy quantified',demand_forecast:'Demand forecast available',retrieval_complete:'Evidence assembled (trust labels applied)',explanation:'Agent explanation produced and validated',proposal:'Proposal stored in the ledger',held_for_approval:'Write held: waiting for a human',draft_po_created:'Draft purchase order created (DRAFT_NOT_SENT)',no_external_transmission:'No external transmission',weir_denied:'THE WEIR denied the write'};
const PROC='procurement__create_draft_purchase_order';
function describe(s){
  if(s.kind==='stage')return{t:FRIENDLY[s.label]||s.label,tag:s.stage};
  if(s.kind==='tool'){
    if(s.label===PROC){
      if(s.held_for_approval)return{t:'THE WEIR holds the write for approval',tag:s.stage,ms:s.ms};
      if(s.forwarded===false)return{t:'THE WEIR blocks the call: tool not in this role’s policy',tag:s.stage,ms:s.ms,bad:1};
      if(s.forwarded)return{t:'THE WEIR forwards the approved call; ledger writes the draft',tag:s.stage,ms:s.ms};
    }
    return{t:'Read tool: '+String(s.label).replace('warehouse__',''),tag:s.stage,ms:s.ms,bad:!!s.failure};
  }
  if(s.kind==='auth')return{t:'Identity check: '+s.label+(s.detail&&s.detail.role?' ('+s.detail.role+')':''),tag:'AUTH',bad:s.label!=='allow'};
  if(s.kind==='approval_decision')return{t:'Human decision: '+s.label+(s.detail&&s.detail.by?' by '+s.detail.by.replace(/^tenant-[ab]-/,''):''),tag:'HUMAN',bad:!['approve'].includes(s.label)};
  if(s.kind==='failure')return{t:'Failure classified: '+s.label,tag:'FAIL',bad:1};
  if(s.kind==='injection_flagged')return{t:'Instruction-like text flagged in untrusted evidence',tag:'GUARD',bad:1};
  if(s.kind==='validation')return{t:'Validation gate: '+((s.detail&&s.detail.violations)||[]).join(', '),tag:'GATE',bad:1};
  if(s.kind==='recovery')return{t:'Recovery: '+s.label,tag:'RECOV'};
  return{t:s.kind+': '+s.label,tag:s.kind.toUpperCase()};
}
window.TracePlayer=function(root,data,opts={}){
  const sc=data.scenarios;let cur=0,idx=-1,timer=null;
  const $=s=>root.querySelector(s);
  const tabs=$('.tabs'),list=$('.steps'),live=$('#live'),out=$('.outcome'),po=$('.po'),aud=$('.audit'),claim=$('.claim');
  const SHORT={approved_draft_po:'Approved draft PO',unauthorised_role_blocked:'Unauthorised role',expired_approval:'Expired approval',modified_after_approval:'Modified after approval',prompt_injection_in_supplier_note:'Prompt injection',replayed_approval_and_duplicate_request:'Replay & duplicate',malformed_agent_output:'Malformed model output',cross_tenant_blocked:'Wrong tenant'};
  tabs.innerHTML=sc.map((s,i)=>`<button class="tab" role="tab" id="tab-${i}" aria-selected="${i===cur}" aria-controls="steps" tabindex="${i===cur?0:-1}" data-i="${i}" title="${s.title.replace(/"/g,'')}">${SHORT[s.id]||s.title}</button>`).join('');
  function render(){
    const s=sc[cur],steps=s.steps.map(describe);
    list.innerHTML=steps.map((d,i)=>`<li class="step fut${d.bad?' bad':''}" data-i="${i}"><span class="st">${d.tag||''}</span><span>${d.t}</span><span class="ms">${d.ms!=null?d.ms.toFixed(1)+' ms':''}</span></li>`).join('');
    claim.textContent=s.claim;
    aud.innerHTML=s.audit.map(a=>`<li class="fut">${a.action}${a.role?' · '+a.role:''}${a.ref?' · '+a.ref:''}</li>`).join('');
    idx=-1;update(true);
  }
  function update(initial){
    const s=sc[cur],steps=$$('.step');steps.forEach((el,i)=>{el.classList.toggle('on',i===idx);el.classList.toggle('fut',i>idx)});
    if(idx>=0&&steps[idx]){steps[idx].scrollIntoView({block:'nearest'});live.textContent=steps[idx].textContent}
    const made=s.steps.some((x,i)=>i<=idx&&x.kind==='stage'&&x.label==='draft_po_created');
    po.textContent=made?'1':'0';po.className='big '+(made?'one':'zero');
    const done=idx>=s.steps.length-1;
    $$('.audit li').forEach((li,i)=>li.classList.toggle('fut',!done&&idx<s.steps.length-1?true:false));
    out.className='outcome '+(done?(s.purchase_orders_created>0&&s.outcome==='EXECUTED'?'good':'block'):'');
    out.innerHTML=done?`<strong>${s.outcome}</strong>${s.failure_class?' · '+s.failure_class:''}<br><span class="note">Draft purchase orders in the ledger: ${s.purchase_orders_created} · externally transmitted: ${s.external_transmissions} · audit chain valid: ${s.audit_chain_valid}</span>`:'<span class="note">Press Play or Step to replay this recorded run.</span>';
    if(!initial&&done)stop();
  }
  function stop(){clearInterval(timer);timer=null;$('#play').textContent='Play'}
  function play(){if(timer){stop();return}if(idx>=sc[cur].steps.length-1)idx=-1;$('#play').textContent='Pause';timer=setInterval(()=>{idx++;update();},opts.speed||650)}
  $('#play').addEventListener('click',play);
  $('#step').addEventListener('click',()=>{stop();if(idx<sc[cur].steps.length-1){idx++;update()}});
  $('#reset').addEventListener('click',()=>{stop();idx=-1;update(true)});
  tabs.addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;select(+b.dataset.i)});
  tabs.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?sc.length-1:(cur+(e.key==='ArrowRight'?1:-1)+sc.length)%sc.length;select(n);$('#tab-'+n).focus()});
  function select(i){stop();cur=i;$$('.tab').forEach((b,j)=>{b.setAttribute('aria-selected',j===i);b.tabIndex=j===i?0:-1});render()}
  function $$(s){return[...root.querySelectorAll(s)]}
  render();
};
})();
