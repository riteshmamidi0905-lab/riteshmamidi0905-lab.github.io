/* Shared deterministic scenario. No model inference, external actions or authentication. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engineering/inventory-model.js'),require('../demo/engine.js'));
  else root.NashaLiving=factory(root.NashaInventory,root.NashaEngine);
})(typeof self!=='undefined'?self:this,function(M,E){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x)), KEY='living-mango-day1';
  const agents=['aethon','zybrew','pyrix','vectra','nexora','quantix','echon','novara','synapse','aegis','cortex','veritas'];
  const steps=[
    ['echon','RECEIVING TASK','Receive a synthetic service ticket','intake'],
    ['novara','ANALYZING','Aggregate the demand signal','demand'],
    ['pyrix','EXECUTING','Account for day-one service','service'],
    ['vectra','ANALYZING','Detect the ingredient shortfall','shortage'],
    ['cortex','ANALYZING','Retrieve the replenishment policy','policy'],
    ['aethon','RECOMMENDING','Recommend a bounded quantity','recommend'],
    ['quantix','VERIFYING','Validate synthetic cost exposure','cost'],
    ['nexora','RECOMMENDING','Persist a replenishment proposal','request'],
    ['aegis','AWAITING APPROVAL','Hold for a human reviewer','gate'],
    ['aegis','VERIFYING','Approve the exact pending request','approve'],
    ['synapse','FAILED','Simulate a receiver outage','outage'],
    ['synapse','ESCALATED','Refuse receipt while unavailable','blocked'],
    ['synapse','RECOVERING','Recover the receiver','recover'],
    ['vectra','EXECUTING','Receive the approved request once','receive'],
    ['vectra','RETRYING','Retry the same receipt key','retry'],
    ['zybrew','EXECUTING','Account for day-two service','day2'],
    ['pyrix','EXECUTING','Account for day-three service','day3'],
    ['veritas','COMPLETE','Verify the ledger and audit','verify']
  ].map(([agent,state,title,tool],index)=>({number:index+1,agent,state,title,tool}));
  function seed(){return {version:1,inventory:M.seed(),events:[],ledger:[],day:0,recommendation:null,policy:null};}
  function item(s,id){return s.inventory.items.find(x=>x.id===id);}
  function post(s,action){s.inventory=M.apply(s.inventory,action);}
  function day(s,n,rows){
    for(const [id,consumption,waste,adjustments]of rows){
      if(![consumption,waste].every(x=>Number.isSafeInteger(x)&&x>=0)||!Number.isSafeInteger(adjustments))throw Error('Invalid daily movement');
      const opening=item(s,id).qty,closing=opening-consumption-waste+adjustments;
      if(closing<0)throw Error('Insufficient stock for the simulated service');
      post(s,{type:'quantity',actor:'operator',item:id,qty:closing});
      s.ledger.push({day:n,item:id,unit:id==='mango'?'mango stock units':'beer serving units',opening,receipts:0,consumption,waste,adjustments,closing});
    }
    s.day=n;
  }
  function ledgerOK(s){return s.ledger.every(r=>Number.isSafeInteger(r.closing)&&r.closing>=0&&r.opening+r.receipts-r.consumption-r.waste+r.adjustments===r.closing)&&['mango','hefe'].every(id=>{const rows=s.ledger.filter(r=>r.item===id);return !rows.length||rows[rows.length-1].closing===item(s,id).qty;});}
  function advance(state,command,actor){
    let step=state.inventory.requests.some(r=>r.status==='rejected')?null:steps[state.events.length];
    if(!step)throw Error('Mission complete; reset to start another isolated run');
    const required=step.tool==='approve'?'reviewer':'operator';
    if(actor!==required)throw Error(required==='reviewer'?'An explicit reviewer approval is required':'Operator role required');
    if(step.tool==='approve'?!['approve','reject'].includes(command):command!=='advance')throw Error('Command does not match the current workflow stage');
    if(command==='reject')step={...step,tool:'reject',state:'COMPLETE',title:'Reject the pending request; no receipt authorized'};
    const s=copy(state),before={mango:item(s,'mango').qty,beer:item(s,'hefe').qty,inventoryEvents:s.inventory.events.length};
    let input={},output={};
    switch(step.tool){
      case 'intake':input={ticket:'SYNTHETIC-SERVICE-001',source:'authored fixture'};output={orders:20,baselineOrders:10,classification:'synthetic demand signal'};break;
      case 'demand':input={orders:20,baselineOrders:10};post(s,{type:'demand',actor,value:2});output={multiplier:2,method:'orders / baseline; deterministic daily-rate heuristic'};break;
      case 'service':input={day:1,mango:{consumption:8,waste:1,adjustment:-1},beer:{consumption:6,waste:0,adjustment:0}};day(s,1,[['mango',8,1,-1],['hefe',6,0,0]]);output={mango:item(s,'mango').qty,beer:item(s,'hefe').qty,ledgerBalanced:ledgerOK(s)};break;
      case 'shortage':{const r=M.view(s.inventory).find(x=>x.id==='mango');input={onHand:r.qty,dailyRate:r.daily,multiplier:2,horizonDays:3};output={requirement:r.forecast,shortfall:r.shortfall};break;}
      case 'policy':s.policy={id:'NASHA-REPLENISHMENT',version:1,source:'authored scenario policy',rule:'Retain a stable request key; independent reviewer role before receipt; no receipt during an outage.'};output=copy(s.policy);break;
      case 'recommend':{const r=M.view(s.inventory).find(x=>x.id==='mango');if(!s.policy||r.shortfall<1)throw Error('Verified policy and positive shortfall required');s.recommendation={item:'mango',qty:r.shortfall,key:KEY};input={requirement:r.forecast,onHand:r.qty,policy:s.policy.id};output=copy(s.recommendation);break;}
      case 'cost':input={quantity:s.recommendation.qty,unitCostCents:item(s,'mango').cents};output={syntheticCostCents:input.quantity*input.unitCostCents,currency:'USD',commercialSpend:false};break;
      case 'request':input=copy(s.recommendation);post(s,{type:'request',actor,...input});output={key:KEY,status:'pending',stockUnchanged:true};break;
      case 'gate':input={key:KEY};output={status:'AWAITING APPROVAL',automaticApproval:false,roleSelectorIsAuthentication:false};break;
      case 'approve':input={key:KEY};post(s,{type:'approve',actor,key:KEY});output={status:'approved',stockUnchanged:true};break;
      case 'reject':input={key:KEY};post(s,{type:'reject',actor,key:KEY});output={status:'rejected',stockUnchanged:true,terminal:true};break;
      case 'outage':post(s,{type:'incident',actor});output={receiver:'unavailable',approvedIntentRetained:true};break;
      case 'blocked':input={key:KEY};try{M.apply(s.inventory,{type:'receive',actor,key:KEY});throw Error('Expected refusal did not occur');}catch(e){if(!s.inventory.incident||!/Receiver unavailable/.test(e.message))throw e;output={error:e.message,stockUnchanged:true,inventoryAuditUnchanged:true};}break;
      case 'recover':post(s,{type:'recover',actor});output={receiver:'ready',sameRequestKey:KEY};break;
      case 'receive':input={key:KEY};post(s,{type:'receive',actor,key:KEY});{const row=s.ledger.find(r=>r.day===1&&r.item==='mango');row.receipts+=s.recommendation.qty;row.closing=item(s,'mango').qty;}output={mango:item(s,'mango').qty,received:s.recommendation.qty,ledgerBalanced:ledgerOK(s)};break;
      case 'retry':{const prior=JSON.stringify(s.inventory);post(s,{type:'receive',actor,key:KEY});if(JSON.stringify(s.inventory)!==prior)throw Error('Duplicate receipt changed stock or audit');output={sameKey:KEY,stockAndInventoryAuditUnchanged:true};break;}
      case 'day2':day(s,2,[['mango',12,2,0],['hefe',8,1,0]]);output={day:2,mango:item(s,'mango').qty,beer:item(s,'hefe').qty};break;
      case 'day3':day(s,3,[['mango',20,1,1],['hefe',6,0,0]]);output={day:3,mango:item(s,'mango').qty,beer:item(s,'hefe').qty};break;
      case 'verify':output={ledgerBalanced:ledgerOK(s),inventoryAudit:M.verify(s.inventory),days:s.day,duplicateReceiptDidNotMutateStock:true};if(!output.ledgerBalanced||!output.inventoryAudit)throw Error('Verification failed');break;
    }
    if(!ledgerOK(s)||!M.verify(s.inventory))throw Error('State failed reconciliation');
    const event={seq:s.events.length+1,command,actor,agent:step.agent,stage:step.state,tool:step.tool,title:step.title,input,output,before,after:{mango:item(s,'mango').qty,beer:item(s,'hefe').qty,inventoryEvents:s.inventory.events.length},previous:s.events.length?s.events[s.events.length-1].hash:'GENESIS'};
    event.hash=E.sha256(JSON.stringify(event));s.events.push(event);return s;
  }
  function replay(commands){if(!Array.isArray(commands)||commands.length>steps.length)throw Error('Invalid command history');let s=seed();for(const c of commands){if(!c||Object.keys(c).sort().join(',')!=='actor,command')throw Error('Malformed command');s=advance(s,c.command,c.actor);}return s;}
  function commands(s){return s.events.map(e=>({command:e.command,actor:e.actor}));}
  function verify(s){try{return JSON.stringify(replay(commands(s)))===JSON.stringify(s);}catch(_){return false;}}
  function encode(s,cursor){if(!verify(s)||!Number.isInteger(cursor)||cursor<0||cursor>s.events.length)throw Error('Invalid replay state');return JSON.stringify({version:1,commands:commands(s),hashes:s.events.map(e=>e.hash),cursor});}
  function decode(text){if(typeof text!=='string'||text.length>30000)throw Error('Stored scenario too large');const d=JSON.parse(text);if(d.version!==1||!Array.isArray(d.hashes)||!Number.isInteger(d.cursor))throw Error('Invalid stored scenario');const s=replay(d.commands);if(JSON.stringify(s.events.map(e=>e.hash))!==JSON.stringify(d.hashes)||d.cursor<0||d.cursor>s.events.length)throw Error('Stored scenario integrity mismatch');return {state:s,cursor:d.cursor};}
  function activity(s){return agents.map(id=>{const es=s.events.filter(e=>e.agent===id),e=es[es.length-1];let status=e?'COMPLETE':'IDLE';if(e&&e.seq===s.events.length)status=e.stage;if(id==='aegis'&&s.events.length===9)status='AWAITING APPROVAL';return {id,status,event:e||null};});}
  return {seed,advance,replay,commands,verify,encode,decode,activity,steps,agents,ledgerOK};
});
