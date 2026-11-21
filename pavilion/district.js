import {venueStatements} from './stadium-economics.js';
import {simulateStadium} from './stadium-model.js';
import {lots,mapDrawing} from './district-map.js';
import {districtBusiness,activity,customLot} from './district-state.js';
import {runIdea} from './idea-analysis.js';
import {recallIdea} from './idea-replay.js';
import {taskTitle} from './station-context.js';
import {browserLibrary} from './builder-library.js';
import {workspaceLot} from './builder-district-map.js';
import {replayForEntry} from './builder-replay.js';
import {activePromotions} from './builder-promotions.js';
import {esc} from './views.js';

const $=s=>document.querySelector(s),items=[...lots],models=new Map(),key='nasha-district-buildings';
let saved=[];try{saved=JSON.parse(sessionStorage.getItem(key)||'[]');if(!Array.isArray(saved))saved=[];}catch{saved=[];}
const add=new URLSearchParams(location.hash.slice(1)).get('add');
if(add&&!saved.includes(add)){try{recallIdea(add);saved.push(add);sessionStorage.setItem(key,JSON.stringify(saved));}catch{$('#district-status').textContent='This business is unavailable in this tab.';}}
for(const id of saved){try{const idea=recallIdea(id),lot=customLot(idea,id,items.length-lots.length);items.push(lot);models.set(lot.id,runIdea(idea));}catch{/* Expired tab-local ideas have no replay. */}}
for(const lot of lots)if(lot.id!=='stadium')models.set(lot.id,districtBusiness(lot.id));
const workspaces=new Map();
for(const entry of browserLibrary().entries.values()){
 try{
  const lot=workspaceLot(entry,items.length-lots.length), replay=replayForEntry(entry);
  items.push(lot);models.set(lot.id,replay.model);workspaces.set(lot.id,replay);
 }catch{const status=$('#district-status');status.textContent='A saved business could not be opened. Review its plan in the Builder.';}
}
const stadium=simulateStadium();
models.set('stadium',stadium);
$('#district-atlas').innerHTML=mapDrawing(items);
const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const stadiumTotals=venueStatements(stadium);
function venueCard(lot){
 const pl=lot.id==='stadium'?stadiumTotals:workspaces.get(lot.id)?.result.entities;
 if(!pl)return '';
 return '<span class="district-finance">Four-week operating income<br>Venue operator · '+currency.format(pl.operator.income/100)+'<br>All businesses in the venue · '+currency.format(pl.combined.income/100)+'</span>';
}
$('#district-list').innerHTML=items.map(l=>'<a '+(l.workspace?'id="lot-'+esc(l.workspace)+'" ':'')+'data-door="'+esc(l.id)+'" href="'+esc(l.link||'hq.html?district='+l.id)+'"><span>'+esc(l.use)+'</span><b>'+esc(l.name)+'</b><small class="district-work"></small>'+(l.workspace?'<small class="district-offer"></small>':'')+venueCard(l)+'</a>').join('');
const clockQuery=new URLSearchParams(location.search);
for(const [key,value] of new URLSearchParams(location.hash.slice(1)))clockQuery.set(key,value);
function requestedNumber(name,min,max,fallback){
 const raw=clockQuery.get(name),n=Number(raw);
 return raw!==null && /^\d+$/.test(raw) && n>=min && n<=max ? n : fallback;
}
const lastMinutes=new Map();
for(const model of models.values()){
 for(const event of model.events){
  const minute=event.minute??event.endMinute;
  lastMinutes.set(event.day,Math.max(lastMinutes.get(event.day)??0,minute));
 }
}
const initialDay=requestedNumber('day',1,28,Number($('#district-day').value));
$('#district-day').value=initialDay;
let minute=requestedNumber('minute',0,lastMinutes.get(initialDay),Number($('#district-minute').value)),timer=null;

function describeWork(model,status,venue){
 const prefix=venue?'<span>'+venue.attendance.toLocaleString()+' fans</span>':'';
 if(!status.owners.length)return prefix+'<span>Idle at this minute</span>';
 return prefix+status.owners.map(owner=>{
  const tasks=status.events.filter(event=>event.owner===owner);
  const titles=[...new Set(tasks.map(event=>venue?event.action:taskTitle(model,event)))];
  const refs=tasks.flatMap(event=>event.outputs);
  return '<span data-agent="'+esc(owner)+'" data-events="'+esc(tasks.map(e=>e.id).join(' '))+
   '" data-sources="'+esc(refs.join(' '))+'" title="'+esc(refs.join(' · '))+'"><strong>'+esc(owner)+'</strong> · '+
   esc(titles.join(' · '))+'</span>';
 }).join('');
}
function refresh(){
 const day=Number($('#district-day').value);
 const limit=lastMinutes.get(day);
 minute=Math.min(minute,limit);
 $('#district-minute').max=limit;$('#district-minute').value=minute;
 $('#district-clock').textContent='Day '+day+' · minute '+minute;
 for(const lot of items){
  const model=models.get(lot.id),venue=model.mix?model.records[model.days[day-1].eventId]:null;
  const status=activity(model,day,minute);
  const a=document.querySelector('[data-lot="'+lot.id+'"]'),door=document.querySelector('[data-door="'+lot.id+'"]');
  const dest=venue?(lot.link||'stadium.html')+'#day='+day+'&phase='+(minute<58?0:minute<90?1:minute<114?2:3):
    (lot.link||'hq.html?district='+lot.id)+'&day='+day+'&beat='+status.slot+'&play=1';
  const mapLink=lot.id==='brewery'?'../brewing/index.html':dest;
  a.toggleAttribute('data-game',Boolean(venue?.attendance));a.setAttribute('href',mapLink);
  for(const label of document.querySelectorAll('[data-label-lot="'+lot.id+'"]'))label.setAttribute('href',mapLink);
  door.href=dest;a.toggleAttribute('data-working',Boolean(status.events.length));
  a.querySelector('title').textContent=lot.name+' · '+status.owners.length+' working';
  const workspace=workspaces.get(lot.id);
  if(workspace && door.dataset.offersDay!==String(day)){
   const offers=activePromotions(workspace.entry.business,workspace.result,day);
   const text=offers.map(c=>c.offer+' · '+c.discount+'% off').join(' · ');
   door.querySelector('.district-offer').textContent=text;
   const badge=a.querySelector('.promotion-marker');
   badge.setAttribute('visibility',offers.length?'visible':'hidden');
   badge.querySelector('text').textContent=offers.length===1?offers[0].discount+'%':offers.length+' ads';
   for(const label of document.querySelectorAll('[data-label-lot="'+lot.id+'"]')){
    label.setAttribute('aria-label','Enter '+lot.name+(text?' · '+text:''));
    label.querySelector('title').textContent=lot.name+(text?' · '+text:'');
   }
   door.dataset.offersDay=day;
  }
  const work=door.querySelector('.district-work'),revision=[day,...status.ids].join('/');
  if(work.dataset.revision!==revision){work.innerHTML=describeWork(model,status,venue);work.dataset.revision=revision;}
 }
}
function pause(){clearInterval(timer);timer=null;$('#district-play').textContent='Play district';}
function play(){timer=setInterval(()=>{minute++;if(minute>Number($('#district-minute').max)){minute=0;$('#district-day').value=Number($('#district-day').value)%28+1;}refresh();},1600);$('#district-play').textContent='Pause district';}
$('#district-day').onchange=refresh;$('#district-minute').oninput=e=>{pause();minute=Number(e.target.value);refresh();};
$('#district-play').onclick=()=>timer?pause():play();refresh();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)play();
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
