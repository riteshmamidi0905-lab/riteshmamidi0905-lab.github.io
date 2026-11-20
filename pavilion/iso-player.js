import {mountQuestions} from './ask-floor.js';
import {homeCamera,cameraFrame,stationCamera,cameraControls} from './free-camera.js';
import {aislePath,home,point,roomView,nameplates} from './iso-geometry.js';
import {overview,lightAt,placeTokens,recentEvents} from './floor-staging.js';
import {stampTasks,scheduleDay,visibleHandoffs} from './shift-schedule.js';
import {floorSurfaces} from './floor-surfaces.js';
import {shiftControls} from './shift-controls.js';
import {stationTitle,taskTitle,unusedStation} from './station-context.js';
import {url,esc,timeline,dayNav} from './views.js';
import {instrumentReading} from './shift-display.js';

function pathFor(a,b) {
  const pts=aislePath(a,b).map(p=>point(...p));
  let total=0; const segments=[];
  for(let i=1;i<pts.length;i++) {
    const [x,y]=pts[i-1], dx=pts[i][0]-x, dy=pts[i][1]-y, length=Math.hypot(dx,dy);
    if(length){segments.push({x,y,dx,dy,length,start:total});total+=length;}
  }
  return t=>{
    const distance=Math.max(0,Math.min(1,t))*total;
    const s=segments.find(s=>distance<=s.start+s.length)||segments.at(-1);
    const f=(distance-s.start)/s.length;
    return [s.x+f*s.dx,s.y+f*s.dy,s.dx/s.length,s.dy/s.length];
  };
}
export async function mountFloor(model,day,params) {
  const $=s=>document.querySelector(s), svg=$('#floor'),drawing=$('.drawing'),world=$('.camera-world'),list=$('#depth-list');
  let schedule=scheduleDay(model,day);
  let events=model.events.filter(e=>e.day===day);
  if(events.some(e=>e.startMinute===undefined)){events=events.map(e=>({...e}));stampTasks(events);}
  const event=events[Number(params.get('event')||0)]||events[0];
  let slot=Math.max(0,schedule.findIndex(s=>s.starts.some(e=>e.id===event.id)));
  if(params.has('beat'))slot=Math.min(schedule.length-1,Math.max(0,parseInt(params.get('beat'),10)||0));
  const people=new Map([...list.querySelectorAll('.person')].map(n=>[n.dataset.person,n]));
  const homes=new Map([...people.keys()].map(n=>[n,point(...home(n))]));
  const tags=new Map([...svg.querySelectorAll('[data-room]')].map(g=>[g.dataset.room,g]));
  const playButton=$('#play');
  playButton.disabled=true;
  let deck;
  try{deck=await floorSurfaces(drawing,people);}catch{
    $('#load').textContent='Static floor · use the shift transcript below';
    return;
  }
  const panel=shiftControls($('#task'),$('#ticker'),model,()=>day);
  let history=schedule.map(beat=>recentEvents(events,beat.minute));
  const compact=matchMedia('(max-width:480px)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'), travels=new Map();
  let play=false,elapsed=0,frame=0,previous=0,visible=true,packets=[],zoom=1,unit=1,clearance=47,follow=null;
  const speedControl=$('#speed');
  const duration=()=>Math.max(1350,5300/Number(speedControl.value));
  const screens=new Map([...svg.querySelectorAll('[data-reading]')].map(n=>[n.dataset.reading,n]));
  const stations=new Map([...svg.querySelectorAll('[data-station]')].map(n=>[n.dataset.station,n]));
  const titles=new Map([...people].map(([name,n])=>[name,n.querySelector('title')]));
  const priorReadings=new Map();
  let cameraKey='',width=drawing.clientWidth,height=drawing.clientHeight;
  let stillPeople=[],visibleLabels=nameplates,busy=new Set(),featured=new Set();
  const smallMap=()=>compact.matches&&!follow;
  function setText(node,value){if(node.textContent!==value){if(node.firstChild?.nodeType===3)node.firstChild.data=value;else node.textContent=value;}}
  let manual=null, inspected=null, returnFocus=null;
  const controls=cameraControls(drawing,freeMove,fit,select);
  function camera(){
    const w=width,h=height;
    if(!w||!h)return;
    const state=manual||(follow?stationCamera(follow,w,h):homeCamera());
    const key=[w,h,follow,state.x,state.y,state.zoom,compact.matches].join('|');
    if(key===cameraKey)return;
    cameraKey=key;
    const f=cameraFrame(w,h,state),{dx,dy,ox,oy}=f;
    unit=f.unit;zoom=f.zoom;controls.frame(f);
    world.style.transform='translate('+dx+'px,'+dy+'px) scale('+zoom+')';
    visibleLabels=w<=720?[]:follow?nameplates.filter(p=>p.name===follow):nameplates;
    const smallMap=compact.matches&&!follow;
    const diameter=follow?100:smallMap?26:44;
    drawing.style.setProperty('--marker-scale',1/(unit*zoom));
    drawing.style.setProperty('--token-scale',diameter/(40*unit*zoom));
    clearance=(diameter*1.12+2)/(unit*zoom);
    deck.resize(w,h,unit,ox,oy,zoom,diameter,smallMap,dx,dy);
  }
  function freeMove(state){
    manual=state;world.classList.add('manual');
    if(follow){$('#camera').value='overview';update();}
    camera();paint(elapsed/duration());
  }
  function fit(){
    manual=null;$('#camera').value='overview';world.classList.remove('manual');closeInspect();update();
  }
  function closeInspect(){
    inspected=null;$('#agent-inspect').hidden=true;
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    returnFocus=null;
  }
  function details(){
    if(!inspected)return;
    const beat=schedule[slot],current=beat.active.find(e=>e.owner===inspected);
    const refs=ids=>ids.map(id=>'<a href="'+url('inspector',model,day,{id})+'">'+esc(id)+'</a>').join(' · ');
    const detail=current?'<h3>'+esc(taskTitle(model,current))+'</h3><p>'+esc(current.id)+' · minute '+current.startMinute+'</p><dl><dt>Trigger rule</dt><dd>Start when the input records are ready and the specialist is available.</dd><dt>Inputs</dt><dd>'+(refs(current.inputs)||'Shift opening')+'</dd><dt>Outputs and source</dt><dd>'+refs(current.outputs)+'</dd></dl>':'<p>Idle at this minute. No active rule, inputs or output.</p>';
    const key=inspected+'/'+(current?.id||'idle');
    if($('#inspected-record').dataset.key!==key){
      $('#inspected-record').dataset.key=key;
      $('#inspected-record').innerHTML='<p class="kicker">'+esc(stationTitle(model,inspected))+'</p><h2>'+esc(inspected)+'</h2>'+detail;
    }
  }
  function inspect(name){
    enter();inspected=name;returnFocus=document.activeElement;
    $('#agent-inspect').hidden=false;details();$('#close-inspect').focus({preventScroll:true});
  }
  $('#close-inspect').onclick=closeInspect;
  $('#follow-inspected').onclick=()=>{const name=inspected;closeInspect();select(name);};
  $('#agent-inspect').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeInspect();}});
  const pathCache=new Map();
  function stationPath(from,to){
    const key=from+'/'+to;
    if(!pathCache.has(key))pathCache.set(key,pathFor(from,to));
    return pathCache.get(key);
  }
  // Five reusable packet slots. No per-person or per-packet compositor surfaces.
  const pool=Array.from({length:5},()=>({path:null,lane:0}));
  function prepare(edges){
    travels.clear();
    packets=pool.slice(0,edges.length);
    for(const [i,packet] of pool.entries()){
      const edge=edges[i];
      if(!edge)continue;
      packet.path=stationPath(edge.from,edge.to);packet.lane=(i-2)*3.4;
      if(!travels.has(edge.from))travels.set(edge.from,packet.path);
    }
    stillPeople=[...homes].filter(([name])=>!travels.has(name)||reduced.matches)
      .map(([name,[x,y]])=>({name,x,y}));
  }
  function paint(t){
    const f=t<=.51?t/.51:t<.64?1:(1-t)/.36;
    const desired=stillPeople.slice();
    if(!reduced.matches&&!(compact.matches&&!follow))for(const [name,path] of travels){
      const [x,y,dx]=path(f);desired.push({name,x,y,direction:dx<0?-1:1});
    }
    const placed=compact.matches&&!follow?homes:placeTokens(desired,clearance,visibleLabels);
    deck.begin();
    const bob=play&&!reduced.matches&&!smallMap()?-.85*(1-Math.cos(elapsed*2*Math.PI/900)):0;
    // Keep the original visual ordering: portraits first, transfer trails above them.
    for(const name of people.keys()){
      const pos=placed.get(name);if(pos)deck.token(name,pos[0],pos[1],busy.has(name),featured.has(name),travels.has(name)?bob:0);
    }
    for(const {path,lane} of packets){
      const [x,y,dx,dy]=path(reduced.matches?.51:t);
      deck.packet(x-dy*lane,y+dx*lane-6,dx,dy);
    }
  }
  function update(){
    const beat=schedule[slot],active=new Map(beat.active.map(e=>[e.owner,e]));
    busy=new Set(active.keys());featured=new Set([...busy].slice(0,3));
    const mode=$('#camera').value;
    follow=mode==='station'?beat.starts[0].owner:mode.startsWith('who-')?mode.slice(4):null;
    drawing.toggleAttribute('data-follow',Boolean(follow));camera();
    panel(beat,follow,history[slot]);controls.active(busy);details();
    const light=lightAt(slot,schedule.length);if(drawing.dataset.light!==light){setText($('#sun'),light);drawing.dataset.light=light;deck.light(light);}
    const edges=visibleHandoffs(beat,follow).batch;
    const activity=follow?(active.has(follow)?'Working':'Idle'):active.size+' working';
    setText($('#load'),activity+' · '+edges.length+' in transfer');
    setText($('#floor-caption'),follow?stationTitle(model,follow):'Specialist studios');
    for(const [name,tag] of tags){
      const current=active.get(name);
      const display=screens.get(name);
      const person=people.get(name);person.toggleAttribute('data-busy',Boolean(current));person.toggleAttribute('data-featured',featured.has(name));
      const pressed=String(name===follow);
      if(person.getAttribute('aria-pressed')!==pressed)person.setAttribute('aria-pressed',pressed);
      if(!priorReadings.has(name)||priorReadings.get(name)!==current){
        priorReadings.set(name,current);
        const resting=unusedStation(model,name)?'Not used · idle':'Idle · queue';
        const value=current?instrumentReading(model,current)[0]:resting;
        person.setAttribute('aria-label','Inspect '+name+' · '+(current?taskTitle(model,current):resting));
        setText(titles.get(name),name+' · '+value);
        setText(display,value.slice(0,22));display.setAttribute('fill',current?'#fff0aa':'#d1d9c9');
        stations.get(name).toggleAttribute('data-working',Boolean(current));
      }
      tag.toggleAttribute('data-busy',Boolean(current));const displayMode=follow&&follow!==name?'none':'';if(tag.style.display!==displayMode)tag.style.display=displayMode;
    }
    $('#seek').value=String(slot);setText($('#minute'),'Minute '+beat.minute);drawing.dataset.beat=slot;
    prepare(edges);paint(0);
  }
  function tick(now){
    frame=0;if(!play||!visible||document.hidden)return;
    if(previous)elapsed+=Math.min(now-previous,250);
    previous=now;
    if(elapsed>=duration()){if(slot===schedule.length-1){pause();return;}slot++;elapsed=0;update();}
    if(!reduced.matches&&packets.length)paint(elapsed/duration());
    frame=requestAnimationFrame(tick);
  }
  function pause(){play=false;previous=0;cancelAnimationFrame(frame);drawing.removeAttribute('data-playing');$('#play').textContent='Play shift';}
  function start(){if(slot===schedule.length-1){slot=0;elapsed=0;update();}play=true;previous=0;$('#play').textContent='Pause shift';visibility();}
  const intro=$('#establish');let introTimer;
  function enter(){clearTimeout(introTimer);if(intro)intro.hidden=true;}
  if(intro&&!params.has('event')&&!params.has('beat')&&!reduced.matches){intro.hidden=false;introTimer=setTimeout(enter,2400);$('#enter-floor').onclick=enter;}
  $('#play').onclick=()=>{enter();if(play)pause();else start();};
  $('#seek').oninput=e=>{enter();pause();slot=Number(e.target.value);elapsed=0;update();};
  $('#camera').onchange=()=>{enter();manual=null;world.classList.remove('manual');update();};
  $('#day').onchange=e=>location.assign(url('hq',model,Number(e.target.value)).replaceAll('&amp;','&'));
  function select(name){manual=null;world.classList.remove('manual');$('#camera').value='who-'+name;enter();update();}
  for(const button of document.querySelectorAll('[data-sector-station]')){
    button.onclick=()=>{
      const name=button.dataset.sectorStation;
      const beat=schedule.findIndex(b=>b.starts.some(e=>e.owner===name&&
        (name!=='VECTRA'||model.records[e.outputs[0]].kind==='Availability check')));
      pause();if(beat>=0)slot=beat;
      elapsed=0;select(name);
    };
  }
  deck.interactions(inspect,()=>paint(elapsed/duration()));
  for(const [name,node] of people){
    node.addEventListener('click',()=>inspect(name));
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(name);}});
    tags.get(name).addEventListener('click',()=>inspect(name));
  }
  document.querySelectorAll('[data-agent]').forEach(a=>a.onclick=e=>{e.preventDefault();inspect(a.dataset.agent);});
  function visibility(){cancelAnimationFrame(frame);frame=0;previous=0;const running=play&&visible&&!document.hidden;drawing.toggleAttribute('data-playing',running);if(running)frame=requestAnimationFrame(tick);}
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();}).observe(drawing);
  new ResizeObserver(([entry])=>{width=entry.contentRect.width;height=entry.contentRect.height;camera();paint(elapsed/duration());}).observe(drawing);
  document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',()=>{pause();enter();update();});
  function visit(data){
    if(data.agent&&!people.has(data.agent))return;
    pause();enter();
    if(Number.isInteger(data.day)&&day!==data.day){
      day=data.day;schedule=scheduleDay(model,day);events=schedule.flatMap(s=>s.starts).filter((e,i,a)=>a.findIndex(n=>n.id===e.id)===i);
      history=schedule.map(beat=>recentEvents(events,beat.minute));$('#seek').max=schedule.length-1;$('#day').value=day;
      const list=$('#fallback .timeline');if(list)list.outerHTML=timeline(model,day);
      const nav=$('nav.tabs'),days=$('nav.days');if(nav&&days){days.remove();nav.outerHTML=dayNav(model,day,'hq');}
      const u=new URL(location.href),part=u.hash.includes('sim=')?new URLSearchParams(u.hash.slice(1)):u.searchParams;
      part.set('day',day);if(u.hash.includes('sim='))u.hash=part.toString();window.history.replaceState(null,'',u);
      const disclosure=document.querySelector('.iso-page > .disclose');if(disclosure)disclosure.textContent=disclosure.textContent.replace(/day \d+/i,'day '+day);
    }
    const eventSlot=data.event?schedule.findIndex(s=>s.starts.some(e=>e.id===data.event)):data.slot;
    slot=Number.isInteger(eventSlot)?Math.max(0,Math.min(schedule.length-1,eventSlot)):0;elapsed=0;
    if(data.agent)select(data.agent);else update();
  }
  document.addEventListener('floor-visit',e=>visit(e.detail));
  mountQuestions(model,()=>day,visit);
  $('#branch-here').onclick=async()=>{const {branchState,encodeBranch}=await import('./branch-ledger.js');location.assign('branch.html#'+encodeBranch(branchState(model.config,day,schedule[slot].minute)));};
  compact.addEventListener('change',update);
  if(matchMedia('(max-width:720px)').matches)$('.directory').open=true;
  update();playButton.disabled=false;if(!reduced.matches&&(params.get('play')==='1'||!params.has('beat')&&!params.has('event')))start();document.documentElement.classList.add('replay-ready');
}
