import {simulateStadium} from './stadium-model.js';
import {lots,mapDrawing} from './district-map.js';
import {districtBusiness,activity,customLot} from './district-state.js';
import {runIdea} from './idea-analysis.js';
import {recallIdea} from './idea-replay.js';
import {esc} from './views.js';

const $=s=>document.querySelector(s),items=[...lots],models=new Map(),key='nasha-district-buildings';
let saved=[];try{saved=JSON.parse(sessionStorage.getItem(key)||'[]');if(!Array.isArray(saved))saved=[];}catch{saved=[];}
const add=new URLSearchParams(location.hash.slice(1)).get('add');
if(add&&!saved.includes(add)){try{recallIdea(add);saved.push(add);sessionStorage.setItem(key,JSON.stringify(saved));}catch{$('#district-status').textContent='This business is unavailable in this tab.';}}
for(const id of saved){try{const idea=recallIdea(id),lot=customLot(idea,id,items.length-lots.length);items.push(lot);models.set(lot.id,runIdea(idea));}catch{/* Expired tab-local ideas have no replay. */}}
for(const lot of lots)if(lot.id!=='stadium')models.set(lot.id,districtBusiness(lot.id));
const stadium=simulateStadium();
$('#district-atlas').innerHTML=mapDrawing(items);
$('#district-list').innerHTML=items.map(l=>'<a data-door="'+esc(l.id)+'" href="'+esc(l.link||'hq.html?district='+l.id)+'"><span>'+esc(l.use)+'</span><b>'+esc(l.name)+'</b><small></small></a>').join('');
let minute=Number($('#district-minute').value),timer=null;
function refresh(){
 const day=Number($('#district-day').value);$('#district-clock').textContent='Day '+day+' · minute '+minute;$('#district-minute').value=minute;
 for(const lot of items){
   const model=models.get(lot.id),venue=lot.id==='stadium',atGame=venue&&stadium.records[stadium.days[day-1].eventId].attendance>0;
   const recent=venue?stadium.events.filter(e=>e.day===day&&e.minute<=minute&&e.minute+8>minute):[];
   const status=model?activity(model,day,minute):{owners:[...new Set(recent.map(e=>e.owner))],ids:recent.map(e=>e.id),slot:0};
   const a=document.querySelector('[data-lot="'+lot.id+'"]'),door=document.querySelector('[data-door="'+lot.id+'"]');
   const dest=venue?'stadium.html#day='+day+'&phase='+(minute<58?0:minute<90?1:minute<114?2:3):lot.link?lot.link+'&day='+day+'&beat='+status.slot:'hq.html?district='+lot.id+'&day='+day+'&beat='+status.slot;
   a.toggleAttribute('data-game',Boolean(atGame));a.setAttribute('href',dest);door.href=dest;a.toggleAttribute('data-working',status.owners.length>0);
   a.querySelector('title').textContent=lot.name+' · '+status.owners.length+' working';
   door.querySelector('small').textContent=venue?stadium.records[stadium.days[day-1].eventId].attendance.toLocaleString()+' fans · '+(status.owners.join(' · ')||'between events'):status.owners.length?status.owners.join(' · '):'Idle at this minute';
 }
}
function pause(){clearInterval(timer);timer=null;$('#district-play').textContent='Play district';}
function play(){timer=setInterval(()=>{minute++;if(minute>120){minute=0;$('#district-day').value=Number($('#district-day').value)%28+1;}refresh();},1600);$('#district-play').textContent='Pause district';}
$('#district-day').onchange=refresh;$('#district-minute').oninput=e=>{pause();minute=Number(e.target.value);refresh();};
$('#district-play').onclick=()=>timer?pause():play();refresh();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)play();
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
