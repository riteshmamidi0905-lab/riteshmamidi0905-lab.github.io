import {overview} from './floor-staging.js';
import {home,point,floorOrder,roomView} from './iso-geometry.js';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const [left,top,span,rise]=overview;
const midpoint=[left+span/2,top+rise/2];

export function cameraFrame(width,height,state){
  const unit=Math.min(width/span,height/rise);
  const zoom=clamp(state.zoom,.84,8);
  const x=clamp(state.x,left,left+span),y=clamp(state.y,top,top+rise);
  const ox=(width-span*unit)/2-left*unit,oy=(height-rise*unit)/2-top*unit;
  return {x,y,zoom,unit,ox,oy,dx:width/2-(ox+x*unit)*zoom,dy:height/2-(oy+y*unit)*zoom,
    visibleWidth:width/(unit*zoom),visibleHeight:height/(unit*zoom)};
}
export const homeCamera=()=>({x:midpoint[0],y:midpoint[1],zoom:.90});
export function stationCamera(name,w,h){
  const [x,y,rw,rh]=roomView(name).split(' ').map(Number),u=Math.min(w/span,h/rise);
  return {x:x+rw/2,y:y+rh/2,zoom:Math.min(w/(rw*u),h/(rh*u))*.93};
}
export function cameraControls(drawing,onMove,reset,fly){
  const lens=drawing.querySelector('.map-lens'),mini=document.querySelector('#minimap'),touch=document.querySelector('#touch-roam');
  const dotLayer=mini.querySelector('g'),view=mini.querySelector('.mini-view');
  for(const name of floorOrder){
    const [x,y]=point(...home(name)),dot=document.createElementNS(mini.namespaceURI,'circle');
    dot.dataset.name=name;dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',14);dotLayer.append(dot);
  }
  let frame,pointers=new Map(),pinch=null,start=null,moved=false,engaged=false;
  function state(){return {x:frame.x,y:frame.y,zoom:frame.zoom};}
  function pan(x,y){onMove({...state(),x:frame.x-x/(frame.unit*frame.zoom),y:frame.y-y/(frame.unit*frame.zoom)});}
  function scale(factor,cx,cy){
    const box=lens.getBoundingClientRect(),px=cx-box.left-box.width/2,py=cy-box.top-box.height/2;
    const zoom=clamp(frame.zoom*factor,.84,8),shift=(1/frame.zoom-1/zoom)/frame.unit;
    onMove({x:frame.x+px*shift,y:frame.y+py*shift,zoom});
  }
  function centerZoom(factor){const b=lens.getBoundingClientRect();scale(factor,b.left+b.width/2,b.top+b.height/2);}
  function engage(value){engaged=value;touch.setAttribute('aria-pressed',String(value));touch.textContent=value?'Scroll page':'Explore by touch';lens.classList.toggle('engaged',value);}
  touch.onclick=()=>engage(!engaged);
  function exit(){engage(false);reset();}
  const coords=e=>[e.clientX,e.clientY];
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  lens.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    pointers.set(e.pointerId,coords(e));moved=false;
    if(pointers.size===1){start=coords(e);if(e.pointerType==='mouse')lens.focus({preventScroll:true});}
    else if(pointers.size===2){const [a,b]=pointers.values();pinch=distance(a,b);}
  });
  lens.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    const prev=pointers.get(e.pointerId),now=coords(e);pointers.set(e.pointerId,now);
    if(pointers.size===2){
      const [a,b]=pointers.values(),next=distance(a,b);
      if(pinch>0&&next>0)scale(next/pinch,(a[0]+b[0])/2,(a[1]+b[1])/2);
      pinch=next;moved=true;
    }else if(start&&(moved||distance(now,start)>5)){
      const horizontal=Math.abs(now[0]-start[0])>Math.abs(now[1]-start[1]);
      if(e.pointerType==='touch'&&!engaged&&!horizontal)return;
      moved=true;pan(now[0]-prev[0],now[1]-prev[1]);
    }
    if(moved&&!lens.hasPointerCapture(e.pointerId))lens.setPointerCapture(e.pointerId);
  });
  function end(e){pointers.delete(e.pointerId);pinch=null;start=pointers.size?[...pointers.values()][0]:null;}
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])lens.addEventListener(kind,end);
  lens.addEventListener('click',e=>{if(moved){e.stopImmediatePropagation();e.preventDefault();moved=false;}},true);
  lens.addEventListener('wheel',e=>{
    if(!frame||(!e.ctrlKey&&!e.metaKey&&!engaged&&document.activeElement!==lens))return;
    const factor=Math.exp(-clamp(e.deltaY,-100,100)*.007);
    if((frame.zoom>=8&&factor>1)||(frame.zoom<=.84&&factor<1))return;
    e.preventDefault();scale(factor,e.clientX,e.clientY);
  },{passive:false});
  lens.addEventListener('dblclick',e=>{
    const box=lens.getBoundingClientRect(),x=frame.x+(e.clientX-box.left-box.width/2)/(frame.zoom*frame.unit),y=frame.y+(e.clientY-box.top-box.height/2)/(frame.zoom*frame.unit);
    let nearest=floorOrder[0],dist=Infinity;
    for(const name of floorOrder){const s=stationCamera(name,box.width,box.height),score=Math.hypot(x-s.x,y-s.y);if(score<dist){nearest=name;dist=score;}}
    fly(nearest);
  });
  const full=document.querySelector('#fullscreen');
  full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#content').requestFullscreen();}catch{full.textContent='Fullscreen unavailable';}};
  document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'Exit fullscreen':'Fullscreen';});
  lens.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    const key=e.key.toLowerCase(),delta={arrowleft:[75,0],a:[75,0],arrowright:[-75,0],d:[-75,0],arrowup:[0,75],w:[0,75],arrowdown:[0,-75],s:[0,-75]}[key];
    if(delta)pan(...delta);else if(key==='+'||key==='=')centerZoom(1.3);else if(key==='-')centerZoom(1/1.3);else if(key==='f')full.click();else if(key==='escape'){e.stopPropagation();exit();}else return;
    e.preventDefault();
  });
  document.querySelector('#zoom-in').onclick=()=>centerZoom(1.35);
  document.querySelector('#zoom-out').onclick=()=>centerZoom(1/1.35);
  document.querySelector('#fit-floor').onclick=exit;
  document.querySelector('#mini-jump').onclick=e=>{
    if(e.detail===0){exit();return;}
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(mini.getScreenCTM().inverse());
    onMove({x:p.x,y:p.y,zoom:Math.max(frame.zoom,1.65)});
  };
  return {frame(f){frame=f;for(const [key,n] of Object.entries({x:f.x-f.visibleWidth/2,y:f.y-f.visibleHeight/2,width:f.visibleWidth,height:f.visibleHeight}))view.setAttribute(key,n);
    drawing.dataset.zoom=f.zoom.toFixed(3);drawing.dataset.center=[f.x,f.y].map(Math.round).join(',');},
    active(names){for(const dot of dotLayer.children)dot.classList.toggle('working',names.has(dot.dataset.name));},exit};
}
