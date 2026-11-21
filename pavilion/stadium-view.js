import {questionBox,mountQuestions} from './ask-floor.js';
import {booths,calendar,phases,simulateStadium,stadiumPolicy,stadiumStress,staffingSweep} from './stadium-model.js';
import {concourseMap} from './concourse.js';
import {registry} from './site.js';
import {esc} from './views.js';
const $=s=>document.querySelector(s),dollars=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
let q=new URLSearchParams(location.hash.slice(1)),mix=booths.filter(b=>!q.has('mix')||q.get('mix').split(',').includes(b.id)).map(b=>b.id);
let day=Math.min(28,Math.max(1,Number(q.get('day'))||Number(new URLSearchParams(location.search).get('day'))||3)),slot=Math.max(0,Math.min(3,Number(q.get('phase'))||0));
let stress=Object.hasOwn(stadiumStress,q.get('stress'))?q.get('stress'):'',model,choosing=q.has('confirm'),replay=null;
const scans=staffingSweep(),best=Object.fromEntries(scans.map(v=>[v.id,v.best.positions]));
const number=n=>n.toLocaleString('en-US'),params=extra=>new URLSearchParams({...Object.fromEntries(q),day,phase:slot,mix:mix.join(','),stress,...extra}).toString();
const link=(id,label=id)=>'<a href="#'+esc(params({r:id}))+'" data-record="'+esc(id)+'">'+esc(label)+'</a>';
const row=(...cells)=>'<tr>'+cells.map(x=>'<td>'+x+'</td>').join('')+'</tr>';
function table(caption,cols,rows){return '<div class="table-wrap"><table><caption>'+esc(caption)+'</caption><thead><tr>'+cols.map(c=>'<th scope="col">'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';}
function status(msg){$('#venue-status').textContent=msg;}
let questionEvent=null;
function build(){questionEvent=null;model=simulateStadium({mix,stress,staff:best});refreshQuestions();}
function save(){q=new URLSearchParams(params());history.replaceState(null,'','#'+q);}
function inspect(id,focus=true){
 const record=model?.records[id];if(!record){$('#venue-record').hidden=true;return;}
 const dest=$('#venue-record');dest.hidden=false;dest.innerHTML='<button id="hide-record">Close record</button><p class="eyebrow">'+esc(record.id)+'</p><h2 tabindex="-1">'+esc(record.kind)+'</h2><dl>'+Object.entries(record).filter(([k])=>!['id','kind'].includes(k)).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</dd>').join('')+'</dl>';
 $('#hide-record').onclick=()=>{q.delete('r');save();dest.hidden=true;$('#venue-day').focus();};if(focus)dest.querySelector('h2').focus();
}
function ledgerReport(){
 const last=model.days[27],venue=model.records[last.close];
 const page=(title,html)=>'<section class="print-section"><h2>'+esc(title)+'</h2>'+html+'</section>';
 return model.mix.map(id=>{const b=booths.find(x=>x.id===id),rec=model.records[last.closes.find(k=>model.records[k].vendor===id)];
   const totals=[1,2,3,4].map(week=>{const days=model.days.slice((week-1)*7,week*7),r=model.records[days.at(-1).closes.find(k=>model.records[k].vendor===id)],prev=week===1?0:model.records[model.days[(week-1)*7-1].closes.find(k=>model.records[k].vendor===id)].incomeCents;
     return row(week,number(days.reduce((n,d)=>n+model.records[d.closes.find(k=>model.records[k].vendor===id)].served,0)),dollars(r.incomeCents-prev),link(r.id));});
   return page(b.name,'<p>'+best[id]+' staffing positions · Four-week income '+dollars(rec.incomeCents)+'</p>'+table('Weekly stand ledger',['Week','Served','Operating income','Close'],totals));}).join('')+
   page('Venue settlement','<p>Four-week venue operating income '+dollars(venue.incomeCents)+'. All concession shares and fixed booth fees have matching vendor and venue postings.</p>'+table('Weekly operator receipts',['Week','Revenue share','Booth fees','Reconciliation'],[1,2,3,4].map(w=>{const ds=model.days.slice((w-1)*7,w*7);return row(w,dollars(ds.reduce((n,d)=>n+model.records[d.close].sharesCents,0)),dollars(ds.reduce((n,d)=>n+model.records[d.close].feesCents,0)),link(ds.at(-1).audit));})));
}
function render(){
 if(!model)return;const date=model.days[day-1],event=model.records[date.eventId],operator=model.records[date.close],phase=phases[slot];
 $('#venue-day').value=day;$('#venue-phase').value=slot;$('#venue-stress').value=stress;
 $('#venue-event').textContent=event.type+' · '+number(event.attendance)+' attending';
 $('#concourse').innerHTML=concourseMap(model,day,slot);
 $('#vendor-results').innerHTML=table('Stand activity at '+phase.label,['Stand','Demand + queue','Served','Walkaways','Source'],mix.map(id=>{const b=booths.find(x=>x.id===id),r=model.records['D'+String(day).padStart(2,'0')+'-'+id+'-'+phase.id];return row(esc(b.name),number(r.arrivals+r.queueIn),number(r.served),number(r.walkaways),link(r.id));}));
 const minutes=[20,58,90,114],moment=questionEvent?.minute??minutes[slot],bucket=model.events.filter(e=>e.day===day&&e.minute===moment);
 $('#venue-agents').innerHTML=registry.map(a=>{const source=bucket.find(e=>e.owner===a.name),daily=model.events.filter(e=>e.day===day&&e.owner===a.name);
   return '<li><b>'+a.name+'</b><span>'+esc(source?source.action:daily.length?'Idle at this minute':'Not used — idle')+'</span>'+(source?link(source.outputs[0]):daily.length?link(daily[0].outputs[0],'Day record'):'')+'</li>';}).join('');
 $('#venue-log').innerHTML=model.events.filter(e=>e.day===day).map(e=>'<li><b>'+e.minute+' m · '+e.owner+'</b> '+esc(e.action)+' '+e.outputs.map(id=>link(id)).join(' ')+'</li>').join('');
 $('#venue-close').innerHTML='<strong>'+dollars(operator.sharesCents)+'</strong> vendor revenue share · <strong>'+dollars(operator.feesCents)+'</strong> booth fees · '+link(date.audit,'Inspect daily tie-out');
 $('#venue-report').innerHTML=ledgerReport();
 const venuePeriod=model.records[model.days[27].close],base=stress?simulateStadium({mix,staff:best}):model,original=base.records[base.days[27].close];
 $('#stress-effect').textContent=(stress?stadiumStress[stress]:'Baseline')+' · 28-day venue income '+dollars(venuePeriod.incomeCents)+' · change '+dollars(venuePeriod.incomeCents-original.incomeCents)+'.';
 inspect(q.get('r'),false);
}
const controls=$('#venue-operation .controls');
controls.insertAdjacentHTML('afterend',questionBox);
controls.insertAdjacentHTML('beforeend','<button id="ask-open" type="button" aria-controls="ask-floor" aria-expanded="false">Ask the floor <kbd>/</kbd></button>');
const refreshQuestions=mountQuestions(()=>model,()=>day,step=>{
 stop();day=step.day;
 questionEvent=model.events.find(e=>e.id===step.event);
 slot=step.minute>=114?3:step.minute>=90?2:step.minute>=58?1:0;
 if(questionEvent?.outputs[0])q.set('r',questionEvent.outputs[0]);
 save();render();
},(_model,id)=>link(id));
function stop(){clearInterval(replay);replay=null;$('#venue-play').textContent='Play game day';}
$('#venue-play').onclick=()=>{questionEvent=null;if(replay){stop();return;}$('#venue-play').textContent='Pause game day';replay=setInterval(()=>{if(slot===3){stop();return;}slot++;save();render();},2200);};
$('#venue-day').onchange=e=>{stop();questionEvent=null;day=Number(e.target.value);q.delete('r');save();render();};
$('#venue-phase').onchange=e=>{stop();questionEvent=null;slot=Number(e.target.value);save();render();};
$('#venue-stress').onchange=e=>{stop();stress=e.target.value;if(stress)day=stress==='rain'?13:20;q.delete('r');build();save();render();};
document.addEventListener('click',e=>{const a=e.target.closest('[data-record]');if(a&&!e.ctrlKey&&!e.metaKey){e.preventDefault();q.set('r',a.dataset.record);save();inspect(a.dataset.record);}});
$('#mix-fields').innerHTML=booths.map(b=>'<label><input type="checkbox" name="booth" value="'+b.id+'" '+(mix.includes(b.id)?'checked':'')+'> '+esc(b.name)+'</label>').join('');
$('#venue-mix').onsubmit=e=>{e.preventDefault();const chosen=new FormData(e.target).getAll('booth');if(!chosen.length){status('Select at least one vendor.');return;}mix=chosen;choosing=false;q.delete('confirm');q.delete('r');$('#mix-question').hidden=true;build();save();$('#venue-operation').hidden=false;render();$('#venue-mix details').open=false;$('#venue-day').focus();status('Vendor mix confirmed.');};
$('#assumption-table').innerHTML=table('Synthetic concession assumptions',['Vendor','Sales price','Unit cost','Orders / 1,000 fans','Units / worker-hour','Hourly wage','Booth fee / event','Best staff','28-day income'],booths.map(b=>row(esc(b.name),dollars(b.price),dollars(b.cost),b.share,b.rate,dollars(b.wage),dollars(b.fee),best[b.id],dollars(scans.find(s=>s.id===b.id).best.income))));
$('#assumption-table').insertAdjacentHTML('beforeend',scans.map(s=>'<details><summary>'+esc(s.name)+' staffing sweep</summary>'+table('Four-week staffing sensitivity',['Positions','Served','Walkaways','Income'],s.rows.map(r=>row(r.positions,number(r.served),number(r.walkaways),dollars(r.income))))+'</details>').join(''));
$('#venue-print').onclick=()=>window.print();
$('#venue-mix details').open=choosing;$('#mix-question').hidden=!choosing;$('#venue-operation').hidden=choosing;
if(!choosing&&mix.length){build();render();}else if(!mix.length){$('#mix-question').hidden=false;$('#venue-operation').hidden=true;}
