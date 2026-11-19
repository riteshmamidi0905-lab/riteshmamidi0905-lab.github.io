import {aislePath,home,point,roomView} from './iso-geometry.js';
import {overview,lightAt,placeTokens,recentEvents} from './floor-staging.js';
import {stampTasks,scheduleDay} from './shift-schedule.js';
import {shiftPanel,eventTicker} from './floor.js';
import {studios} from './studios.js';
import {url} from './views.js';
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
export function mountFloor(model,day,params) {
  const $=s=>document.querySelector(s), svg=$('#floor'),drawing=$('.drawing'),world=$('.camera-world'),list=$('#depth-list');
  const schedule=scheduleDay(model,day);
  let events=model.events.filter(e=>e.day===day);
  if(events.some(e=>e.startMinute===undefined)){events=events.map(e=>({...e}));stampTasks(events);}
  const event=events[Number(params.get('event')||0)]||events[0];
  let slot=Math.max(0,schedule.findIndex(s=>s.starts.some(e=>e.id===event.id)));
  if(params.has('beat'))slot=Math.min(schedule.length-1,Math.max(0,parseInt(params.get('beat'),10)||0));
  const people=new Map([...list.querySelectorAll('.person')].map(n=>[n.dataset.person,n]));
  const homes=new Map([...people.keys()].map(n=>[n,point(...home(n))]));
  const stationary=[...list.children].filter(g=>!g.querySelector('.person')).map(g=>[Number(g.dataset.depth),g]);
  const tags=new Map([...svg.querySelectorAll('[data-room]')].map(g=>[g.dataset.room,g]));
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'), layers=new Map(), coordinates=new Map(), travels=new Map();
  let play=false,elapsed=0,frame=0,previous=0,visible=true,packets=[],zoom=1,unit=1,clearance=47,follow=null;
  const duration=()=>Math.max(1350,5300/Number($('#speed').value));
  function camera(){
    const w=drawing.clientWidth,h=drawing.clientHeight,[left,top,bw,bh]=overview;
    if(!w||!h)return;
    unit=Math.min(w/bw,h/bh);
    let dx=0,dy=0;zoom=1;
    if(follow){
      const [x,y,rw,rh]=roomView(follow).split(' ').map(Number);
      zoom=Math.min(w/(rw*unit),h/(rh*unit))*.96;
      const cx=(w-bw*unit)/2+(x+rw/2-left)*unit,cy=(h-bh*unit)/2+(y+rh/2-top)*unit;
      dx=w/2-cx*zoom;dy=h/2-cy*zoom;
    }
    world.style.transform='translate('+dx+'px,'+dy+'px) scale('+zoom+')';
    const diameter=follow?100:44;
    drawing.style.setProperty('--token-scale',diameter/(40*unit*zoom));
    clearance=(diameter*1.12+2)/(unit*zoom);
  }
  function position(node,x,y,depth){
    const key=x.toFixed(2)+' '+y.toFixed(2);
    if(coordinates.get(node)===key)return;
    coordinates.set(node,key);node.setAttribute('transform','translate('+key+')');
    const next=stationary.find(([d])=>d>depth)?.[1]||null;
    if(layers.get(node)!==next&&document.activeElement!==node){list.insertBefore(node.parentNode,next);layers.set(node,next);}
  }
  function prepare(){
    for(const {node} of packets){coordinates.delete(node);layers.delete(node);node.parentNode.remove();}
    travels.clear();
    packets=schedule[slot].batch.map((edge,i)=>{
      const group=document.createElementNS(svg.namespaceURI,'g'),node=document.createElementNS(svg.namespaceURI,'g');
      group.setAttribute('aria-hidden','true');group.append(node);list.append(group);
      const bearing=document.createElementNS(svg.namespaceURI,'g');
      bearing.innerHTML='<path d="M-16 0H-7" stroke="#fff2c6" stroke-width="2" stroke-linecap="round"/><path d="M-7 0H0" stroke="#ad6737" stroke-width="3"/><circle r="3.9" fill="#ffe5a0" stroke="#734d32" stroke-width="1.4"/>';
      node.append(bearing);
      const path=pathFor(edge.from,edge.to);
      if(!travels.has(edge.from))travels.set(edge.from,path);
      return {node,bearing,path,lane:(i-2)*3.4};
    });
    for(const [name,p] of people)p.toggleAttribute('data-walking',travels.has(name));
  }
  function paint(t){
    const f=t<=.51?t/.51:t<.64?1:(1-t)/.36;
    const desired=[];
    for(const [name,[x,y]] of homes)if(!travels.has(name)||reduced.matches)desired.push({name,x,y});
    if(!reduced.matches)for(const [name,path] of travels){
      const [x,y,dx]=path(f);desired.push({name,x,y,direction:dx<0?-1:1});
    }
    const placed=placeTokens(desired,clearance);
    for(const [n,[x,y]] of placed)position(people.get(n),x,y,(y-48)/6.5);
    for(const {node,bearing,path,lane} of packets){
      const [x,y,dx,dy]=path(reduced.matches?.51:t);
      position(node,x-dy*lane,y+dx*lane-6,(y-48)/6.5+.08);
      bearing.setAttribute('transform','rotate('+(Math.atan2(dy,dx)*180/Math.PI).toFixed(1)+')');
    }
  }
  function update(){
    const beat=schedule[slot],active=new Map(beat.active.map(e=>[e.owner,e]));
    const mode=$('#camera').value;
    follow=mode==='station'?beat.starts[0].owner:mode.startsWith('who-')?mode.slice(4):null;
    drawing.toggleAttribute('data-follow',Boolean(follow));camera();
    $('#task').innerHTML=shiftPanel(model,day,beat,follow);
    const light=lightAt(slot,schedule.length);$('#sun').textContent=light;drawing.dataset.light=light;
    $('#load').textContent=active.size+' working · '+beat.batch.length+' in transfer';
    $('#floor-caption').textContent=follow?studios[follow].title:'Specialist studios';
    for(const [name,tag] of tags){
      const current=active.get(name),value=current?instrumentReading(model,current)[0]:'Idle · queue';
      const display=svg.querySelector('[data-reading="'+name+'"]');
      const person=people.get(name);person.toggleAttribute('data-busy',Boolean(current));
      person.setAttribute('aria-label','Follow '+name+' · '+(current?current.action:'Idle, reviewing queue'));
      person.querySelector('title').textContent=name+' · '+(current?value:'Idle · reviewing queue');
      display.textContent=value.slice(0,22);display.setAttribute('fill',current?'#fff0aa':'#d1d9c9');
      svg.querySelector('[data-station="'+name+'"]').toggleAttribute('data-working',Boolean(current));
      tag.toggleAttribute('data-busy',Boolean(current));tag.style.display=follow&&follow!==name?'none':'';
    }
    $('#ticker').innerHTML=eventTicker(model,day,recentEvents(events,beat.minute));
    $('#seek').value=String(slot);$('#minute').textContent='Minute '+beat.minute;drawing.dataset.beat=slot;
    prepare();paint(0);
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
  if(intro&&!params.has('event')&&!params.has('beat')&&!reduced.matches){intro.hidden=false;introTimer=setTimeout(enter,4000);$('#enter-floor').onclick=enter;}
  $('#play').onclick=()=>{enter();if(play)pause();else start();};
  $('#seek').oninput=e=>{enter();pause();slot=Number(e.target.value);elapsed=0;update();};
  $('#camera').onchange=()=>{enter();update();};
  $('#day').onchange=e=>location.assign(url('hq',model,Number(e.target.value)).replaceAll('&amp;','&'));
  function select(name){$('#camera').value='who-'+name;enter();update();}
  for(const [name,node] of people){
    node.addEventListener('click',()=>select(name));
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(name);}});
    tags.get(name).addEventListener('click',()=>select(name));
  }
  document.querySelectorAll('[data-agent]').forEach(a=>a.onclick=e=>{e.preventDefault();select(a.dataset.agent);svg.scrollIntoView({block:'nearest'});});
  function visibility(){cancelAnimationFrame(frame);frame=0;previous=0;const running=play&&visible&&!document.hidden;drawing.toggleAttribute('data-playing',running);if(running)frame=requestAnimationFrame(tick);}
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();}).observe(drawing);
  new ResizeObserver(()=>{camera();paint(elapsed/duration());}).observe(drawing);
  document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',()=>{pause();enter();update();});
  if(matchMedia('(max-width:720px)').matches)$('.directory').open=true;
  update();document.documentElement.classList.add('replay-ready');
}
