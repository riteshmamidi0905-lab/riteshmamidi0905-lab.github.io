import {esc,url} from './views.js';
import {taskTitle,idleMessage,unusedStation} from './station-context.js';

const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
const units = values => Object.values(values).reduce((sum,n)=>sum+n,0);
export function incoming(events,cursor){
  const e=events[cursor];
  for(let i=cursor-1;i>=0;i--){
    const producer=events[i];
    if(producer.owner===e.owner)continue;
    const id=producer.outputs.find(id=>e.inputs.includes(id));
    if(id)return {sender:producer.owner,receiver:e.owner,recordId:id,producerId:producer.id};
  }
  return null;
}
export function instrumentReading(m,e){
  const r=m.records[e.outputs[0]], name=id=>m.records[id].name, sector=m.config.template!=='brewery';
  switch(r.kind){
    case 'Shift': return [r.staff.length+' on shift','Day '+r.day];
    case 'Campaign plan': return [name(r.featuredProductId),r.channel];
    case 'Demand forecast': return [units(r.units)+' units',Object.entries(r.units).map(([k,n])=>name(k)+' '+n).join(' · ')];
    case 'Recipe evidence': return [r.productIds.length+(sector?' offerings':' recipes'),r.materialIds.length+(sector?' supply records':' ingredient records')];
    case 'Ingredient requirement': return [units(r.required)+' measures',Object.keys(r.required).length+(sector?' supplies':' ingredients')];
    case 'Availability check': return [units(r.shortage)+' units short',Object.entries(r.required).map(([id,n])=>name(id)+' '+r.available[id]+'/'+n).join(' · ')];
    case 'Purchase proposal': return [r.units+' units · '+money(r.cents),name(r.materialId)];
    case 'Approval record': return [r.approved?'Approved':'Declined',r.budgetId?r.reason:'Synthetic purchase limit '+money(r.limitCents)];
    case 'Receiving': return ['+'+r.units+' units',name(r.materialId)+' · '+r.approvalId];
    case 'Appointment fulfillment': return [r.completed+' of '+r.requested+' service units',name(r.productId)];
    case 'Brewing batch':
    case 'Production lot': return [r.completed+' of '+r.requested+' units',name(r.productId)];
    case 'Sale': return [r.quantity+' sold',name(r.productId)+' · '+money(r.unitPriceCents)+' each'];
    case 'Fulfillment check': return [r.actualUnits+' / '+r.plannedUnits+' units',r.state];
    case 'Campaign attribution': return [money(r.paidCents),r.orderIds.length+' attributed orders'];
    case 'Customer case': return [r.classification,r.orderId];
    case 'Refund': return [money(r.cents),r.paymentId];
    case 'Balance sheet': return [money(r.trialBalanceCents)+' variance',money(r.accounts.cash)+' cash at close'];
    case 'Evaluation': return [r.passed?'Check passed':'Check failed',r.sold+' units sold'];
    case 'Operating expenses': return [money(r.totalCents),r.shiftIds.length+' accrued shifts · rent and utilities'];
    case 'Weekly settlement': return [money(r.costsPaidCents+r.taxPaidCents),'Paid toward operating costs and sales tax'];
    case 'Weekly close': return [money(r.netIncomeCents),'Week '+r.week+' net income'];
    default: return [r.kind,r.id];
  }
}
const ref=(m,d,id,label)=>`<a href="${url('inspector',m,d,{id})}">${esc(label)}</a>`;
export function readout(m,d,e,agent,handoff){
  const active=agent.name===e.owner;
  if(!active&&unusedStation(m,agent.name))return '<h2>Idle</h2><p>'+esc(idleMessage(m,agent.name))+'</p>';
  if(!active)return `<div class="live-heading"><p class="kicker">${agent.name} · ${esc(agent.role)}</p><h2>Between tasks</h2></div><p>Idle at this event. ${e.owner} owns the selected record.</p>`;
  const [value,detail]=instrumentReading(m,e);
  return `<div class="live-heading"><p class="kicker">${e.owner} · ${esc(agent.role)}</p><h2>${esc(taskTitle(m,e))}</h2><small>${esc(e.id)}</small></div>
    <div class="live-data"><strong>${ref(m,d,e.outputs[0],value)}</strong><p>${esc(detail)}</p>
    <div class="source-links">${e.outputs.map(id=>ref(m,d,id,m.records[id].kind+' ↗')).join(' ')}</div>
    ${handoff?`<p class="handoff-note">From ${handoff.sender} · ${ref(m,d,handoff.recordId,handoff.recordId)}</p>`:''}</div>`;
}
