import {esc} from './views.js';

export const lots=[
 {id:'stadium',name:'District Field',link:'stadium.html',use:'Stadium & vendors',u:1,v:1,w:6.7,d:4.1,h:1.1,wall:'#bda77d',roof:'#617c6a'},
 {id:'brewery',name:'NASHA Brewing',use:'Brewpub',u:10,v:1.6,w:4.1,d:3,h:1.9,wall:'#d1ba87',roof:'#7b785d'},
 {id:'coffee',name:'Court Coffee',use:'Coffee roaster',u:1.3,v:7,w:3.5,d:2.7,h:1.45,wall:'#c7a67c',roof:'#6b8172'},
 {id:'bakery',name:'Arcade Bakery',use:'Bakery',u:6.4,v:7,w:3.6,d:2.7,h:1.65,wall:'#d3b78c',roof:'#ac7456'},
 {id:'retail',name:'Pavilion Goods',use:'Retail boutique',u:12,v:7,w:3.5,d:2.55,h:1.55,wall:'#b9b7a0',roof:'#5f716a'},
 {id:'salon',name:'Iris Studio',use:'Salon',u:4.5,v:12,w:3.5,d:2.7,h:1.45,wall:'#bea494',roof:'#7c776c'},
 {id:'truck',name:'Market Truck',use:'Food truck',u:11.6,v:12.6,w:2.5,d:1.2,h:1,wall:'#cba469',roof:'#697b65'}
];
const p=(u,v,h=0)=>[445+(u-v)*25,43+(u+v)*12.5-h*25];
const pts=points=>points.map(x=>p(...x).map(n=>n.toFixed(1)).join(',')).join(' ');
const poly=(points,fill,stroke='none')=>'<polygon points="'+pts(points)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width=".8"/>';
const line=(a,b,color,width=1)=>'<polyline points="'+pts([a,b])+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"/>';
function box(u,v,w,d,h,top,side,front,base=0){
 const z=base+h;
 return poly([[u,v+d,base],[u+w,v+d,base],[u+w,v+d,z],[u,v+d,z]],front)+poly([[u+w,v,base],[u+w,v+d,base],[u+w,v+d,z],[u+w,v,z]],side)+poly([[u,v,z],[u+w,v,z],[u+w,v+d,z],[u,v+d,z]],top);
}
function tree(u,v,size=1){
 const [x,y]=p(u,v);
 return '<g transform="translate('+x+' '+y+') scale('+size+')"><ellipse cx="6" cy="2" rx="14" ry="4.5" fill="#4a5b42" opacity=".22"/><path d="M0 2v-15" stroke="#71593e" stroke-width="3"/><path d="M-10-10Q-17-18-10-25Q-9-34 0-34Q10-37 13-27Q20-20 11-13Q4-8-3-10Z" fill="#637959"/><path d="M-11-19Q-10-34 1-34L6-32Q-1-29-2-21Z" fill="#82936e"/></g>';
}
function facade(l){
 const {u,v,w,d,h,wall,roof}=l;
 let out=poly([[u+.3,v+.15],[u+w+.9,v+.35],[u+w+1,v+d+.55],[u+.6,v+d+.4]],'#9d997f')+box(u-.12,v-.12,w+.24,d+.24,.13,'#d1bfa1','#ada083','#baa989');
 out+=box(u,v,w,d,h,roof,'#978a71',wall,.13);
 for(let i=.22;i<w-.25;i+=.68){
   out+=poly([[u+i,v+d+.008,.35],[u+i+.45,v+d+.008,.35],[u+i+.45,v+d+.008,h-.10],[u+i,v+d+.008,h-.10]],'#526b61');
   out+=line([u+i+.1,v+d+.015,.38],[u+i+.1,v+d+.015,h-.13],'#a6b6a0',1.3);
 }
 for(let j=.2;j<d-.3;j+=.63)out+=poly([[u+w+.008,v+j,.4],[u+w+.008,v+j+.36,.4],[u+w+.008,v+j+.36,h-.1],[u+w+.008,v+j,h-.1]],'#465e53');
 out+=box(u-.11,v-.11,w+.22,d+.22,.12,roof,'#685f51','#e6d9b5',h+.13);
 if(l.id==='brewery'){
   for(let i=0;i<3;i++){const [x,y]=p(u+.7+i*.75,v+.75,h+.25);
     out+='<g fill="#b68e63" stroke="#796448" stroke-width="1"><path d="M'+(x-6)+' '+y+'v-14q6-9 12 0v14q-6 5-12 0"/><ellipse cx="'+x+'" cy="'+(y-13)+'" rx="6" ry="2.5"/></g>';}
 }else if(l.id==='bakery'){out+=box(u+.65,v+.6,.58,.55,.75,'#cfa27d','#915f46','#b77b53',h+.23);}
 else if(l.id==='retail'||l.id==='salon'||l.id==='coffee'){
   for(let a=.12;a<w-.2;a+=.49)out+=poly([[u+a,v+d,h*.84],[u+a+.48,v+d,h*.84],[u+a+.48,v+d+.5,h*.67],[u+a,v+d+.5,h*.67]],Math.round((a-.12)/.49)%2?'#e4d5ae':roof);
 }
 return out;
}
function stadium(l){
 const {u,v,w,d}=l;let out=box(u-.3,v-.3,w+.6,d+.6,.18,'#b7aa8b','#a49a7e','#ccc0a2');
 out+=box(u,v,w,d,.85,'#c2b092','#928770','#c2a881');
 for(let i=.2;i<w;i+=.42)out+=line([u+i,v+d,.1],[u+i,v+d,.87],'#7d735b',2);
 for(let j=.15;j<d;j+=.42)out+=line([u+w,v+j,.1],[u+w,v+j,.87],'#706c58',2);
 for(const [inset,z,color] of [[0,.98,'#e4d7b9'],[.28,1,'#435e53'],[.57,.95,'#beab85'],[.73,.95,'#59765a']])
   out+=poly([[u+inset,v+inset,z],[u+w-inset,v+inset,z],[u+w-inset,v+d-inset,z],[u+inset,v+d-inset,z]],color);
 for(let a=1;a<w-1;a+=.6)out+=line([u+a,v+.82,.98],[u+a,v+d-.82,.98],'#a4b58b',1);
 out+='<g class="stadium-crowd">';
 for(const side of [.35,d-.35])for(let a=.5,i=0;a<w-.4;a+=.19,i++){
   const [x,y]=p(u+a,v+side+(i%2)*.08,1.035);out+='<circle cx="'+x+'" cy="'+y+'" r="1.3" fill="'+['#e5ce8c','#c27652','#f4e9cc'][i%3]+'"/>';
 }
 out+='</g>';
 for(const a of [.3,w-.3])for(const b of [.25,d-.25]){out+=line([u+a,v+b,.95],[u+a,v+b,2.15],'#586553',2);const [x,y]=p(u+a,v+b,2.15);out+='<rect x="'+(x-6)+'" y="'+(y-2)+'" width="13" height="4" fill="#f6d99c"/>';}return out;
}
function vehicle(l){
 let out=box(l.u,l.v,l.w,l.d,.95,'#76856c','#866b47','#bd9459',.25)+box(l.u+l.w,l.v+.03,.65,l.d-.06,.66,'#77866a','#6f694d','#c4a26d',.25);
 for(const dx of [.45,2.5]){const [x,y]=p(l.u+dx,l.v+l.d,.24);out+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="#41483c"/>';}
 return out+poly([[l.u+.3,l.v+l.d,1.02],[l.u+1.9,l.v+l.d,1.02],[l.u+1.9,l.v+l.d+.5,.86],[l.u+.3,l.v+l.d+.5,.86]],'#e6cba0');
}
function lotDestination(lot) {
 return lot.id === 'brewery' ? '../brewing/index.html' : lot.link || 'hq.html?district=' + encodeURIComponent(lot.id);
}

function labelLayers(buildings, left, right, top, bottom, compact) {
 const font = compact ? 33 : 16, height = compact ? 49 : 28;
 const inset = compact ? 8 : 18, gap = compact ? 8 : 6;
 const middle = (left + right) / 2;
 const labels = buildings.map(lot => {
  const [x,y] = p(lot.u + lot.w / 2, lot.v + lot.d / 2, lot.h);
  const limit = compact ? 15 : 22, chars = Array.from(lot.name);
  const text = chars.length <= limit ? lot.name : chars.slice(0,limit-1).join('')+'…';
  const textWidth = Array.from(text).reduce((n,c) => n + (/[ilI'., ]/.test(c) ? .31 : /[MWmw@]/.test(c) ? .84 : /[A-Z]/.test(c) ? .68 : .56),0)*font;
  const width = Math.ceil(textWidth + font*.9);
  const side = x < middle ? 'left' : 'right';
  const desiredY = y - (compact ? 38 : 25);
  const boxX = side === 'left' ? left+inset : right-inset-width;
  return {lot,x,y,side,boxX,boxY:desiredY,width,text,textWidth};
 });

 // Vertical sweeps allocate disjoint rows in each margin. The two margins never
 // meet; all leaders are painted before all label plates, after the scenery.
 for (const side of ['left','right']) {
  const ordered = labels.filter(l => l.side === side).sort((a,b) => a.y-b.y);
  let next = top + gap;
  for (const l of ordered) {
   l.boxY = Math.max(next,l.boxY);
   next = l.boxY + height + gap;
  }
  let end = bottom - gap;
  for (const l of ordered.reverse()) {
   l.boxY = Math.min(l.boxY,end-height);
   end = l.boxY-gap;
  }
 }
 const leaders = labels.map(({x,y,boxX,boxY,width,side}) => {
  const endX = side === 'left' ? boxX+width : boxX, endY = boxY+height/2;
  const elbow = x + (endX-x)*.42;
  return '<path d="M'+x+','+y+' L'+elbow+','+endY+' H'+endX+'"/><circle cx="'+x+'" cy="'+y+'" r="'+(compact?4.1:2.8)+'"/>';
 }).join('');
 const plates = labels.map(({lot,boxX,boxY,width,text,textWidth}) =>
  '<a data-label-lot="'+esc(lot.id)+'" href="'+esc(lotDestination(lot))+'" aria-label="Enter '+esc(lot.name)+'">'+
  '<title>'+esc(lot.name)+'</title><rect x="'+boxX+'" y="'+boxY+'" width="'+width+'" height="'+height+'" rx="3"/>'+
  '<text class="lot-name" x="'+(boxX+font*.45)+'" y="'+(boxY+height/2+font*.34)+'" textLength="'+textWidth.toFixed(1)+'" lengthAdjust="spacingAndGlyphs">'+esc(text)+'</text>'+
  '<line class="lot-link-underline" aria-hidden="true" x1="'+(boxX+font*.45)+'" x2="'+(boxX+font*.45+textWidth)+'" y1="'+(boxY+height/2+font*.56)+'" y2="'+(boxY+height/2+font*.56)+'"/></a>'
 ).join('');
 return '<g class="district-labels '+(compact?'compact-labels':'wide-labels')+'"><g class="lot-leaders" aria-hidden="true">'+leaders+'</g>'+plates+'</g>';
}

export function mapDrawing(buildings=lots){
 const end=Math.max(17,...buildings.map(l=>l.v+l.d+1.4)),bottom=Math.ceil(p(18,end)[1]+43),left=Math.min(-10,p(0,end)[0]-25);
 let ground=poly([[-1,-1],[18,-1],[18,end],[-1,end]],'#d4ccb1','#aba78c');
 for(const [v,width] of [[5.3,1.2],[10.45,1.1],[15.5,1.15]]){ground+=poly([[-.8,v],[17.9,v],[17.9,v+width],[-.8,v+width]],'#aaa99a');for(let i=0;i<18;i+=1.1)ground+=line([i,v+.56],[i+.53,v+.56],'#e5dfc6',1.7);}
 for(const u of [8.45,15.8])ground+=poly([[u,-1],[u+1,-1],[u+1,end],[u,end]],'#aaa99a');
 const details=[];for(let u=1;u<17;u+=1.45)for(const v of [.0,5.08,10.2,15.28])if(Math.abs(u-8.9)>.8)details.push({z:u+v,svg:tree(u,v,.63+(u%1)*.18)});
 for(const l of buildings){const [x,y]=p(l.u+l.w*.55,l.v+l.d+.38);
   const dest=lotDestination(l);
   const building=l.id==='stadium'?stadium(l):l.id==='truck'?vehicle(l):facade(l);
   details.push({z:l.u+l.v+l.w*.4+l.d*.4,svg:'<a href="'+esc(dest)+'" data-lot="'+esc(l.id)+'" tabindex="-1" aria-hidden="true" aria-label="Enter '+esc(l.name)+'"><title>'+esc(l.name)+'</title>'+building+'<g class="lot-light" transform="translate('+x+' '+y+')"><circle r="5"/></g></a>'});}
 return '<svg class="district-map" viewBox="'+left+' -43 '+(935-left)+' '+(bottom+43)+'" role="group" aria-label="Interactive isometric district. A text list follows."><g>'+ground+details.sort((a,b)=>a.z-b.z).map(v=>v.svg).join('')+'</g>'+labelLayers(buildings,left,935,-43,bottom,false)+labelLayers(buildings,left,935,-43,bottom,true)+'</svg>';
}
