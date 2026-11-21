import {branchState,compareBranch,replayIndex,frameAt,availableReviews,encodeBranch,decodeBranch} from './branch-ledger.js';
import {preset} from './engine.js';
import {scheduleDay} from './shift-schedule.js';
import {esc} from './views.js';

const $=s=>document.querySelector(s),panel=$('#levers'),sides=['original','alternate'],frames=[...document.querySelectorAll('.twin iframe')];
const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
let state,pair,indexes,clock,cursor=0,timer,revision=0,ready=new Set(),schedules=new Map();
function displayControls(){
 const k=panel.elements.lever.value,ranges={staff:[1,12,2],price:[-35,60,12],lead:[0,5,2],purchase:[0,0,0]},[min,max,normal]=ranges[k];
 $('#lever-value').hidden=k==='purchase';Object.assign(panel.elements.value,{min,max,value:k===state.lever?state.value:normal});
}
function stop(){clearInterval(timer);timer=null;$('#together').textContent='Play together';}
function showError(error){$('#branch-error').textContent=error.message;}
function rebuild(next){
 const data=compareBranch(next);stop();state=next;pair=data;
 indexes=Object.fromEntries(sides.map(k=>[k,replayIndex(pair[k])]));
 const keys=new Set(sides.flatMap(k=>indexes[k].filter(x=>x.day>state.day||x.day===state.day&&x.minute>=state.minute).map(x=>x.day*10000+x.minute)));
 clock=[...keys].sort((a,b)=>a-b).map(n=>({day:Math.floor(n/10000),minute:n%10000}));
 cursor=Math.max(0,clock.findLastIndex(x=>x.day<state.viewDay||x.day===state.viewDay&&x.minute<=state.viewMinute));
 schedules.clear();ready.clear();revision++;
 window.readFloorBranch=side=>({model:pair[side],day:state.viewDay});
 window.floorBranchReady=side=>{ready.add(side);drawFloor(side);};
 frames.forEach((f,i)=>{f.dataset.side=sides[i];f.src='floor-window.html?view='+revision;});
 panel.elements.lever.value=state.lever;displayControls();$('#branch-seek').max=clock.length-1;
 $('#fork-note').textContent='Forked on day '+state.day+' at minute '+state.minute+'. '+(state.lever==='purchase'?'Future purchase requests enter your branch’s founder queue. The original follows its recorded policy.':'The new '+({staff:'staffing level',price:'price',lead:'supplier lead time'}[state.lever])+' takes effect at the next shift opening. Earlier transactions are preserved.');
 $('#founder').hidden=state.lever!=='purchase';$('#next-review').hidden=state.lever!=='purchase';$('#branch-error').textContent='';draw();
}
function drawFloor(side){
 const {day,minute}=clock[cursor],key=side+'/'+day;
 if(!schedules.has(key))schedules.set(key,scheduleDay(pair[side],day));const beats=schedules.get(key);
 const slot=Math.max(0,beats.findLastIndex(b=>b.minute<=minute)),b=beats[slot];
 $('#'+side+'-task').textContent=b.active.map(e=>e.owner+' · '+e.action).join(' / ');
 if(ready.has(side))frames[sides.indexOf(side)].contentDocument.dispatchEvent(new CustomEvent('floor-visit',{detail:{day,slot}}));
}
function decisions(){
 const pending=availableReviews(pair.alternate,state.viewDay,state.viewMinute);
 $('#decision-list').innerHTML=pending.map(q=>'<article><b>'+esc(q.id)+'</b> · '+cash(q.cents)+' · '+esc(pair.alternate.records[q.purchaseId].materialId)+' <button data-choice="approved" data-key="'+esc(q.decisionKey)+'" '+(q.cents>Math.min(q.availableCashCents,q.remainingBudgetCents)?'disabled':'')+'>Approve</button> <button data-choice="rejected" data-key="'+esc(q.decisionKey)+'">Reject</button></article>').join('')||'<p>No open purchase review at this moment.</p>';
 return pending.length;
}
function draw(){
 const {day,minute}=clock[cursor];state.viewDay=day;state.viewMinute=minute;
 $('#branch-seek').value=cursor;$('#branch-position').textContent='Day '+day+' · minute '+minute;
 const a=frameAt(indexes.original,day,minute),b=frameAt(indexes.alternate,day,minute);
 $('#difference-strip').innerHTML=[['cash','Cash',cash],['served','Served',String],['walkouts','Walkouts',String],['rating','Rating',n=>(n/100).toFixed(2)]].map(([key,label,fmt])=>'<article><span>'+label+'</span><strong>'+fmt(b[key]-a[key])+'</strong><small>'+fmt(a[key])+' → '+fmt(b[key])+'</small></article>').join('');
 for(const k of sides)drawFloor(k);
 if(state.lever==='purchase'&&decisions())stop();
 history.replaceState(null,'','#'+encodeBranch(state));
}
function next(){if(cursor>=clock.length-1)stop();else{cursor++;draw();}}
$('#next-beat').onclick=()=>{stop();next();};
$('#next-day').onclick=()=>{stop();const i=clock.findIndex(x=>x.day>state.viewDay);cursor=i<0?clock.length-1:i;draw();};
$('#next-review').onclick=()=>{
 stop();const future=pair.alternate.events.find(e=>(e.day>state.viewDay||e.day===state.viewDay&&e.startMinute>state.viewMinute)&&e.outputs.some(id=>pair.alternate.records[id].trigger==='Founder review requested'));
 if(!future){$('#branch-error').textContent='No further queued purchases in this replay.';return;}
 cursor=clock.findIndex(x=>x.day===future.day&&x.minute===future.startMinute);draw();
};
$('#together').onclick=()=>{if(timer)stop();else{if(cursor===clock.length-1)cursor=0;$('#together').textContent='Pause both';timer=setInterval(next,750);}};
$('#branch-seek').oninput=e=>{stop();cursor=Number(e.target.value);draw();};
panel.elements.lever.onchange=displayControls;
panel.onsubmit=e=>{e.preventDefault();try{rebuild({...state,lever:panel.elements.lever.value,value:Number(panel.elements.value.value),choices:[],viewDay:state.day,viewMinute:state.minute});}catch(err){showError(err);}};
$('#decision-list').onclick=e=>{if(!e.target.dataset.key)return;try{rebuild({...state,choices:[...state.choices,[e.target.dataset.key,e.target.dataset.choice]]});}catch(err){showError(err);}};
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#share-status').textContent='Scenario link copied.';}catch{$('#manual-share').hidden=false;const input=$('#manual-share input');input.value=location.href;input.focus();input.select();}};
try{rebuild(location.hash?decodeBranch(location.hash):branchState({...preset,edition:6},1,0));}catch(error){showError(error);panel.hidden=true;}
