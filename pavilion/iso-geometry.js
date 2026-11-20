import {unusedStation} from './station-context.js';
import {studios} from './studios.js';
import {esc} from './views.js';

export const floorOrder = ['CORTEX','AETHON','NOVARA','ECHON','VECTRA','ZYBREW','PYRIX','NEXORA','AEGIS','VERITAS','SYNAPSE','QUANTIX'];
export const overviewBox = '-18 -28 1080 625';
export const rooms = Object.fromEntries(floorOrder.map((name,i)=>[name,{u:2+(i%4)*11,v:2+Math.floor(i/4)*11}]));
export const point=(u,v,h=0)=>[450+(u-v)*13,48+(u+v)*6.5-h*13];
const coord=(...p)=>point(...p).map(n=>Math.round(n*10)/10).join(',');
const poly=(p,fill,more='')=>'<polygon points="'+p.map(row=>coord(...row)).join(' ')+'" fill="'+fill+'" '+more+'/>';
const slab=(u,v,w,d,h,tone)=>box(u,v,0,w,d,h,tone);
const stone=['var(--stone-top,#e2d6b7)','var(--stone-side,#b4a486)','var(--stone-lip,#c7b99a)'],wood=['#ba9064','#825f47','#a47753'],dark=['#687773','#324540','#4d6159'],brass=['#d7b775','#856741','#b6945c'],sage=['#94a28b','#526c61','#728777'],paper=['#ead9af','#beb18d','#d6c69e'];
function box(u,v,z,w,d,h,c){
  const a=u+w,b=v+d,t=z+h;
  return poly([[a,v,z],[a,b,z],[a,b,t],[a,v,t]],c[2])+poly([[u,b,z],[a,b,z],[a,b,t],[u,b,t]],c[1])+poly([[u,v,t],[a,v,t],[a,b,t],[u,b,t]],c[0]);
}
const line=(a,b,color,width=1)=>'<path d="M'+coord(...a)+'L'+coord(...b)+'" stroke="'+color+'" stroke-width="'+width+'" fill="none"/>';
function ellipse(u,v,z,rx,ry,color){const [x,y]=point(u,v,z);return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+color+'"/>';}
function cylinder(u,v,z,r,h,top,wall){
  const [x,y]=point(u,v,z+h),bottom=y+h*13;
  return '<path d="M'+(x-r)+' '+y+'v'+(h*13)+'a'+r+' '+r/2+' 0 0 0 '+2*r+' 0V'+y+'Z" fill="'+wall+'"/>'+ellipse(u,v,z+h,r,r/2,top);
}
function plant(u,v,scale=1){
  const [x,y]=point(u,v,1.15*scale);
  return ellipse(u+.32,v+.12,0,11*scale,4*scale,'#a49b80')+cylinder(u,v,0,6.5*scale,1.15*scale,'#c7af88','#936d50')+
    '<g transform="translate('+x+' '+y+') scale('+scale+')">'+[-67,-35,-9,22,56,82].map((a,i)=>'<path transform="rotate('+a+')" d="M0 0Q-10 -10 -4 -23Q3 -19 0 0" fill="'+['#657b53','#526e58','#879267'][i%3]+'"/>').join('')+'</g>';
}
function desk(u,v,w=4,d=1.5,finish=wood){
  return box(u+.15,v+.15,0,.3,d-.3,1.65,dark)+box(u+w-.48,v+.15,0,.3,d-.3,1.65,dark)+box(u,v,1.65,w,d,.28,finish);
}
function display(u,v,z=1.95,w=2.5){
  return box(u+.4,v,z,.25,.4,.35,brass)+box(u,v,z+.35,w,.18,1.3,dark)+[.25,.48,.7].map((h,i)=>line([u+.18,v+.19,z+.45+h],[u+w*(.48+i*.12),v+.19,z+.45+h],i===1?'#e2b771':'#a9c0a7',1.7)).join('');
}
function shelf(u,v,w=4.6,books=true){
  let s=slab(u,v,.27,1,3.75,wood)+slab(u+w-.26,v,.26,1,3.75,wood);
  for(let i=0;i<3;i++){
    s+=box(u,v,.35+i*1.4,w,1,.14,wood);
    for(let j=0;j<(books?7:3);j++)s+=box(u+.35+j*(books?.52:1.32),v+.15,.5+i*1.4,books?.36:.94,.7,books?.75+(j%3)*.19:.65,[sage,paper,brass,wood][(i+j)%4]);
  }return s;
}
function panel(u,v,w=4.5,h=2.5){
  return slab(u+.2,v,.33,.5,1.3,dark)+slab(u+w-.5,v,.33,.5,1.3,dark)+box(u,v,1.1,w,.19,h,dark);
}
function board(u,v,w=4.5,ledger=false){
  let s=panel(u,v,w);
  for(let i=0;i<4;i++)s+=line([u+.2,v+.2,1.48+i*.5],[u+w-.25,v+.2,1.48+i*.5],ledger?'#e3ce9b':'#96b1a0',1);
  for(let j=0;j<4;j++)s+=line([u+.5+j,v+.21,1.3],[u+.5+j,v+.21,3.4],'#afa685',.7);
  return s;
}
function bench(u,v){return slab(u,v,1.35,1.35,.6,dark)+box(u-.15,v-.15,.6,1.75,1.65,.35,sage)+box(u-.14,v-.14,.85,1.75,.24,1,sage);}
function light(u,v){return slab(u,v,.25,.25,3.15,brass)+'<g class="lamp-head">'+cylinder(u+.12,v+.12,3.12,5,.3,'var(--lamp,#f2ddad)','#ad8551')+'</g>';}
function kit(name,u,v,model){
  const U=u+1,V=v+1, items=[];
  const add=(du,dv,svg)=>items.push({depth:U+V+du+dv,svg,shadow:point(U+du+.65,V+dv+.55)});
  if(model&&model.config.template!=='brewery'&&(name==='ZYBREW'||unusedStation(model,name))){
    const idle=unusedStation(model,name);
    const rack=shelf(U+.4,V+.2,4.8,false),worktop=desk(U+.7,V+3.6,4.5,1.55,wood);
    add(2,1,'<g data-bay="'+(idle?'idle':'production')+'">'+(idle?panel(U+.5,V+.2,4.5):rack)+'</g>');
    add(2,4,worktop+(idle?'':display(U+1,V+3.8)));
    return items;
  }
  switch(name){
    case 'ZYBREW':
      for(let i=0;i<3;i++){let x=U+.6+i*2.1;add(i*2.1+1,1,cylinder(x,V+.9,.2,12,2.8,'#d5ac83','url(#copper)')+cylinder(x,V+.9,3,5,.4,'#dbc7a5','#896d55')+[.45,2.45].map(z=>{const [cx,cy]=point(x,V+.9,z);return '<path d="M'+(cx-12)+' '+cy+'a12 6 0 0 0 24 0" fill="none" stroke="#d9b492" stroke-width="1.1"/>';}).join('')+ellipse(x+.48,V+1.38,1.62,2.1,2.1,'#e8d9ae')+line([x,V+.9,3.4],[x,V+2.7,3.4],'#95724a',3));}
      add(1,4,desk(U,V+4,3.3,1.1,dark)+display(U+.25,V+4.2));break;
    case 'CORTEX': add(0,1,shelf(U,V,6,true));add(3,4,desk(U+2,V+3.2,3)+box(U+2.5,V+3.4,1.95,1.2,.75,.18,paper));break;
    case 'VECTRA': add(0,1,shelf(U,V,5.6,false));add(2,4,slab(U+1,V+3.5,2,1.5,1.2,wood)+box(U+1.2,V+3.6,1.2,1.6,1.2,.85,paper));break;
    case 'PYRIX': add(1,1,slab(U,V,5.6,1.15,1.8,stone)+box(U+.2,V,1.8,1.6,1.05,.22,dark));add(2,4,slab(U+1,V+3,4.2,1.55,1.6,wood)+box(U+.85,V+2.9,1.6,4.5,1.76,.25,stone)+cylinder(U+2,V+3.6,1.85,5,.55,'#b3b5a4','#717c71'));break;
    case 'AETHON': add(0,1,board(U,V,5));add(2,3,desk(U+1,V+3,4.5,2.3)+box(U+1.5,V+3.25,1.94,3.1,1.45,.08,paper));break;
    case 'NOVARA': for(let i=0;i<3;i++)add(i*1.8,1,slab(U+i*2,V,.25,.7,1,dark)+box(U+i*2,V,1,1.65,.18,2.6,[wood,sage,paper][i]));add(2,4,desk(U+1,V+3.5,4)+cylinder(U+2,V+4,1.94,4,.55,'#d2b89d','#a16c52'));break;
    case 'ECHON': add(1,1,bench(U,V)+bench(U+2.4,V));add(3,4,desk(U+1,V+3.1,2.7,1.4,wood)+display(U+1.25,V+3.4,1.94,1.5));break;
    case 'NEXORA': add(1,1,board(U,V,4.8));add(2,3,desk(U+.7,V+3.2,4.8)+[0,1,2].map(i=>box(U+1+i*1.2,V+3.5,1.95,.8,.6,.38,paper)).join(''));break;
    case 'AEGIS': add(1,1,panel(U,V,4)+[0,1,2].map(i=>box(U+.4+i*1.1,V+.21,1.55,.68,.06,1.4,paper)).join(''));add(2,3,desk(U+1,V+3.2,4,1.7,dark)+display(U+2,V+3.2));break;
    case 'VERITAS': add(1,1,slab(U,V,4.8,1,1.4,dark)+[0,1,2].map(i=>display(U+i*1.6,V+.25,1.4,1.3)).join(''));add(2,4,desk(U+.8,V+3.3,3.7,1.5,stone)+box(U+1.6,V+3.6,1.94,1.5,.8,.5,brass));break;
    case 'SYNAPSE': add(1,1,board(U,V,5));add(2,3,desk(U+.7,V+3,5,1.7,dark)+display(U+1,V+3.2,1.94,2)+display(U+3.6,V+3.2,1.94,1.55));break;
    case 'QUANTIX': add(0,1,board(U,V,5.3,true));add(2,4,desk(U+.8,V+3,4.9,1.75,wood)+[0,1,2].map(i=>box(U+1.3+i,V+3.3,1.94,.8,.95,.22,paper)).join(''));break;
  }
  if(!['ECHON','VECTRA','ZYBREW'].includes(name))add(4,5,bench(U+4.6,V+4.55));
  return items;
}
export function home(name){const r=rooms[name];return [r.u+2.4,r.v+6.35];}
// Nameplates sit inside each bay. The projected aisle network is at least
// 36 world units from their ink, including at corners and handoff endpoints.
export const nameplates=Object.entries(rooms).map(([name,{u,v}])=>{
  const [x,y]=point(u+3.5,v+2.5);
  return {name,x,y,left:x-29,right:x+29,top:y-4,bottom:y+8};
});
export function aislePath(a,b){
  const A=rooms[a],B=rooms[b],s=home(a),e=home(b);
  return [s,[s[0],A.v+8.8],[A.u+8.8,A.v+8.8],[A.u+8.8,B.v+8.8],[e[0],B.v+8.8],e];
}
export function roomView(name){const r=rooms[name],[x,y]=point(r.u+4,r.v+4);return [x-126,y-88,252,160].join(' ');}
export function floorSvg(registry,model,architectureOnly=false) {
  const sorted=[], objects=[], actors=[], instruments=[], edge='#b09f83';
  let ground=box(-1,-1,-1.4,46,35,1.4,stone);
  for(let i=-1;i<=45;i+=2)ground+=line([i,-1,0],[i,34,0],'#c6b99d',.65);
  for(let j=-1;j<=34;j+=2)ground+=line([-1,j,0],[45,j,0],'#c6b99d',.65);
  for(let u=0;u<44;u+=4){
    ground+=poly([[u,-.8,0],[u+3.75,-.8,0],[u+3.75,-.8,4.35],[u,-.8,4.35]],'url(#window)')+line([u,-.8,0],[u,-.8,4.6],'#8b765a',3);
  }
  ground+=line([0,-.8,4.5],[44,-.8,4.5],edge,3);
  for(let v=0;v<33;v+=4)ground+=poly([[-.7,v,0],[-.7,v+3.7,0],[-.7,v+3.7,3.4],[-.7,v,3.4]],'url(#window)')+line([-.7,v,0],[-.7,v,3.5],edge,2.5);
  for(const [name,r] of Object.entries(rooms)){
    const {u,v}=r, accent=studios[name].color,agent=registry.find(a=>a.name===name);
    ground+=poly([[u,v,.02],[u+8,v,.02],[u+8,v+7.7,.02],[u,v+7.7,.02]],'var(--bay,#d5c6a8)')+
      line([u,v+7.75,.03],[u+8,v+7.75,.03],'#a4865d',1.5);
    objects.push({depth:u+v+.3,svg:box(u,v,0,7.9,.22,2.5,[accent,'#ac9c7f','#958569'])+box(u,v,0,.22,3.2,2.25,stone)+line([u,v+.23,2.4],[u+7.9,v+.23,2.4],'#f1d59f',2)});
    const furniture=kit(name,u,v,model);
    for(const {shadow:[x,y]} of furniture) ground+='<g transform="translate('+x+' '+y+')"><path class="cast-shadow" d="M-4 -3 Q6 -5 38 -2 L44 2 Q16 5.5 -4 3Z"/></g>';
    const [lampX,lampY]=point(u+7.6,v+.75);
    ground+='<ellipse class="lamp-pool" cx="'+lampX+'" cy="'+lampY+'" rx="46" ry="22" fill="url(#warm-lamp)"/>';
    objects.push(...furniture,{depth:u+v+9,svg:light(u+7.6,v+.75)},{depth:u+v+13,svg:plant(u+7.4,v+5.6,.78)});
    const [sx,sy]=point(u+4.45,v+.4,2.12);
    instruments.push('<ellipse class="station-pulse" data-station="'+name+'" cx="'+sx+'" cy="'+(sy+33)+'" rx="28" ry="13" fill="none" stroke="#4a7663" stroke-width="3"/>');
    instruments.push('<g transform="translate('+sx+' '+sy+') matrix(1 .5 0 1 0 0)"><rect x="-15" y="-4" width="32" height="6" rx=".6" fill="#30463d"/><text data-reading="'+name+'" x=".5" text-anchor="middle" font-size="2.45" fill="#bcc7b7">Standby</text></g>');
    const [x,y]=point(...home(name));const id=agent.slug;
    actors.push('<g class="person" data-person="'+name+'" transform="translate('+x+' '+y+')" tabindex="0" role="button" aria-label="Follow '+esc(name)+'"><title>'+esc(name)+'</title><g class="mini-marker"><rect class="tap-area" x="-22" y="-30" width="44" height="44" fill="transparent"/><rect x="-18" y="-5" width="36" height="15" rx="6" fill="#1d352c"/><circle cx="-12" cy="2.5" r="3.2"/><text x="2" y="6.5" text-anchor="middle">'+esc(name.slice(0,3))+'</text></g><g class="portrait-size"><ellipse rx="16" ry="4.3" fill="#262d25" opacity=".38"/><g class="walker"><path d="m-4 -6 4 6 4-6" fill="#705535"/><circle cy="-22" r="21.5" fill="#273c33" stroke="#dcc18c" stroke-width="1.6"/><image href="../assets/img/agents/'+id+'.webp" x="-20" y="-42" width="40" height="40" clip-path="url(#portrait-cut)" preserveAspectRatio="xMidYMid meet"/><circle class="duty-dot" cx="15" cy="-8" r="3.6" stroke="#233a31" stroke-width="1.5"/><g class="portrait-name"><rect x="-39" y="-58" width="78" height="15" rx="4" fill="#172f26"/><text y="-47" text-anchor="middle">'+esc(name)+'</text></g></g></g></g>');
    const {x:lx,y:ly}=nameplates.find(p=>p.name===name);
    sorted.push('<g class="room-tag" data-room="'+name+'" transform="translate('+lx+' '+ly+')"><rect x="-29" y="-4" width="58" height="12" rx="4" fill="#2b3c33"/><circle cx="-23" cy="2" r="2.1" fill="#a39779"/><text x="2.3" y="4.7" text-anchor="middle">'+esc(name)+'</text></g>');
  }
  for(const [u,v] of [[0,8],[0,20],[11,33],[31,33],[44,6],[44,28]])objects.push({depth:u+v,svg:plant(u,v,1.15)});
  objects.sort((a,b)=>a.depth-b.depth);
  const architecture='<svg class="architecture-plane" viewBox="'+overviewBox+'" aria-hidden="true"><defs><linearGradient id="cast-fade"><stop stop-color="#302c30" stop-opacity=".92"/><stop offset=".58" stop-color="#504651" stop-opacity=".56"/><stop offset="1" stop-color="#655a63" stop-opacity="0"/></linearGradient><clipPath id="portrait-cut"><circle cy="-22" r="20"/></clipPath><radialGradient id="warm-lamp"><stop stop-color="#fff1a8" stop-opacity=".92"/><stop offset="1" stop-color="#f4bd60" stop-opacity="0"/></radialGradient><linearGradient id="copper"><stop stop-color="#815b46"/><stop offset=".27" stop-color="#ac7959"/><stop offset=".51" stop-color="#c49973"/><stop offset=".77" stop-color="#9a6950"/><stop offset="1" stop-color="#825a46"/></linearGradient><linearGradient id="window" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="var(--sky-top,#bed2c6)"/><stop offset=".64" stop-color="var(--sky-mid,#e0ddc7)"/><stop offset="1" stop-color="var(--sky-low,#adbdad)"/></linearGradient></defs><g id="floor-plate">'+ground+'</g><g>'+objects.map(o=>o.svg).join('')+'</g></svg>';
  // The architecture is a retained paint surface. Only the instruments and map
  // symbols above it change as the source clock advances.
  if(architectureOnly)return architecture;
  return architecture+'<div id="floor" role="group" aria-label="Isometric cutaway of twelve specialist studios"><svg class="instrument-plane" viewBox="'+overviewBox+'"><g>'+instruments.join('')+'</g><g id="depth-list">'+actors.join('')+'</g></svg><div class="sprite-plane"><div id="packet-layer" aria-hidden="true"></div></div><svg class="label-plane" aria-hidden="true" viewBox="'+overviewBox+'"><g class="tags">'+sorted.join('')+'</g></svg></div>';
}
