// The building has one lossless plate per lighting state. A single transparent
// canvas carries the moving ink. DOM controls and the vector fallback stay accessible.
const phases=['Morning','Midday','Dusk','Night'];
function decoded(src){
  const img=new Image();img.src=src;return img.decode().then(()=>img);
}
// Rasterize the already-shipped vector scene before enabling playback. All four
// palettes use the actual cascade. The cached bitmaps never contain labels or agents.
async function lightingPlates(drawing,original){
  const initial=drawing.dataset.light,doc=original.cloneNode(true);
  doc.setAttribute('xmlns','http://www.w3.org/2000/svg');doc.removeAttribute('class');
  const scale=Math.min(3,Math.max(2,Math.ceil(drawing.clientWidth*(devicePixelRatio||1)/1080)));
  const width=1080*scale,height=625*scale;
  doc.setAttribute('width',width);doc.setAttribute('height',height);
  const style=document.createElementNS('http://www.w3.org/2000/svg','style');
  style.textContent='.cast-shadow{fill:url(#cast-fade);opacity:var(--shade);transform:rotate(var(--sun-angle)) scaleX(var(--shadow-stretch))}.lamp-pool{opacity:var(--lamp-power)}';
  doc.prepend(style);
  const variables=['sky-top','sky-mid','sky-low','stone-top','stone-side','stone-lip','bay','lamp','lamp-power','sun-angle','shadow-stretch','shade'];
  const documents=phases.map(phase=>{
    drawing.dataset.light=phase;
    const css=getComputedStyle(drawing);
    for(const name of variables)doc.style.setProperty('--'+name,css.getPropertyValue('--'+name));
    return new XMLSerializer().serializeToString(doc);
  });
  drawing.dataset.light=initial;
  const images=new Map();
  for(const [index,svg] of documents.entries()){
    const src=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    try{
      const image=await decoded(src);
      const raster=document.createElement('canvas');raster.width=width;raster.height=height;
      raster.getContext('2d').drawImage(image,0,0,width,height);
      images.set(phases[index],await createImageBitmap(raster));
      raster.width=raster.height=1;
    }finally{URL.revokeObjectURL(src);}
  }
  const visible=document.createElement('canvas');visible.width=width;visible.height=height;
  visible.className='architecture-plane';visible.setAttribute('aria-hidden','true');
  const ctx=visible.getContext('2d');ctx.globalCompositeOperation='copy';
  let current;
  function light(phase){
    if(current===phase)return;
    ctx.drawImage(images.get(phase),0,0);current=phase;
  }
  light(initial);return {visible,light};
}
function portraitStamp(image,busy){
  const stamp=document.createElement('canvas'), scale=3;
  stamp.width=48*scale;stamp.height=48*scale;
  const g=stamp.getContext('2d');g.scale(scale,scale);g.translate(24,45);
  g.fillStyle='#705535';g.beginPath();g.moveTo(-4,-6);g.lineTo(0,0);g.lineTo(4,-6);g.fill();
  g.fillStyle='#273c33';g.strokeStyle='#dcc18c';g.lineWidth=1.6;
  g.beginPath();g.arc(0,-22,21.5,0,2*Math.PI);g.fill();g.stroke();
  g.save();g.beginPath();g.arc(0,-22,20,0,2*Math.PI);g.clip();
  const fit=Math.min(40/image.naturalWidth,40/image.naturalHeight),w=image.naturalWidth*fit,h=image.naturalHeight*fit;
  g.drawImage(image,-w/2,-22-h/2,w,h);g.restore();
  g.fillStyle=busy?'#98efbd':'#a69f85';g.strokeStyle='#233a31';g.lineWidth=1.5;
  g.beginPath();g.arc(15,-8,3.6,0,2*Math.PI);g.fill();g.stroke();return stamp;
}
export async function floorSurfaces(drawing,people){
  const floor=drawing.querySelector('#floor'),original=drawing.querySelector('svg.architecture-plane');
  const canvas=document.createElement('canvas');canvas.className='actor-layer';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
  const portraits=[...people].map(async ([name,g])=>{
    const img=await decoded(g.querySelector('image').getAttribute('href'));
    return [name,[portraitStamp(img,false),portraitStamp(img,true)]];
  });
  const [plates,stamps]=await Promise.all([
    lightingPlates(drawing,original),
    Promise.all(portraits),Promise.all([...document.images].map(img=>img.decode())),document.fonts.ready
  ]);
  const faces=new Map(stamps),positions=new Map();
  const clip=original.querySelector('#portrait-cut');
  if(clip){const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.append(clip);floor.querySelector('.instrument-plane').prepend(defs);}
  original.replaceWith(plates.visible);floor.insertBefore(canvas,floor.querySelector('.label-plane'));
  // Keyboard focus stays on each named SVG control. A geometry-only focus box
  // lets Chromium discard duplicate portrait art while the canvas is playing.
  for(const node of people.values()){
    const box=document.createElementNS('http://www.w3.org/2000/svg','rect');
    for(const [key,value] of Object.entries({x:-22,y:-43,width:44,height:44,fill:'none'}))box.setAttribute(key,value);
    node.append(box);
  }
  drawing.classList.add('bitmap-floor');
  let unit=1,ox=0,oy=0,dpr=1,diameter=44,zoom=1,small=false,hover=null,focus=null;
  let hit=null,lastDirty=[],thumbnail=false;
  function resize(w,h,u,left,top,z,diam,mini,dx,dy){
    unit=u;zoom=z;diameter=diam;small=mini;
    thumbnail=w<=260&&document.body.classList.contains('embedded-floor');
    // In follow view allocate only the visible crop at native device resolution.
    const margin=z>1?32:0;
    const x=-dx/z-margin,y=-dy/z-margin,cw=w/z+2*margin,ch=h/z+2*margin;
    dpr=Math.min(devicePixelRatio||1,2)*z;
    ox=left-x;oy=top-y;
    Object.assign(canvas.style,{left:x+'px',top:y+'px',width:cw+'px',height:ch+'px'});
    const pixelsW=Math.max(1,Math.round(cw*dpr)),pixelsH=Math.max(1,Math.round(ch*dpr));
    if(canvas.width!==pixelsW||canvas.height!==pixelsH){canvas.width=pixelsW;canvas.height=pixelsH;}else{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}
    lastDirty=[];
  }
  function badge(name,x,y,width,height){
    ctx.fillStyle='#1d352c';ctx.beginPath();ctx.roundRect(x,y,width,height,4);ctx.fill();
    ctx.textAlign='center';ctx.fillStyle='#fff4df';ctx.fillText(name,x+width/2,y+height*.71);
  }
  function begin(){
    // Damage is bounded by the previous decals. Clear in device pixels, including AA.
    ctx.setTransform(1,0,0,1,0,0);
    for(const [x,y,w,h] of lastDirty)ctx.clearRect(x,y,w,h);
    lastDirty.length=0;positions.clear();
    ctx.setTransform(unit*dpr,0,0,unit*dpr,ox*dpr,oy*dpr);
  }
  function damage(x,y,w,h){
    const left=Math.floor((ox+x*unit)*dpr)-2,top=Math.floor((oy+y*unit)*dpr)-2;
    lastDirty.push([left,top,Math.ceil(w*unit*dpr)+5,Math.ceil(h*unit*dpr)+5]);
  }
  function token(name,x,y,busy,featured,bob){
    const k=diameter/(40*unit*zoom),m=1/(unit*zoom);
    positions.set(name,{x,y,mini:small,r:small?22*m:22*k,cy:small?y-8*m:y-22*k});
    damage(x-44*Math.max(k,m),y-64*Math.max(k,m),88*Math.max(k,m),82*Math.max(k,m));
    ctx.save();ctx.translate(x,y);
    if(thumbnail){
      // The adjacent task captions identify activity on these narrow, paired views.
      ctx.scale(m,m);ctx.fillStyle=busy?'#f6c46c':'#516b58';ctx.strokeStyle='#283e31';ctx.lineWidth=.75;
      ctx.beginPath();ctx.arc(0,0,busy?3.3:1.8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();return;
    }
    if(small){
      ctx.save();ctx.scale(m,m);ctx.font='700 12px Inter,Arial,sans-serif';
      badge('',-18,-5,36,15);ctx.fillStyle=busy?'#9aefb6':'#c5c5a9';ctx.beginPath();ctx.arc(-12,2.5,3.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff4df';ctx.fillText(name.slice(0,3),2,6.5);ctx.restore();
    }
    if(!small||featured){
      ctx.scale(k,k);ctx.fillStyle='rgba(38,45,37,.38)';ctx.beginPath();ctx.ellipse(0,0,16,4.3,0,0,2*Math.PI);ctx.fill();
      ctx.translate(0,bob);ctx.drawImage(faces.get(name)[Number(busy)],-24,-45,48,48);
      if(focus===name){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-22,21.5,0,2*Math.PI);ctx.stroke();}
      if(!small&&(hover===name||focus===name)){ctx.font='bold 9px Inter,Arial,sans-serif';badge(name,-39,-58,78,15);}
    }else if(focus===name){ctx.strokeStyle='#ffe8a6';ctx.lineWidth=2*m;ctx.strokeRect(-18*m,-5*m,36*m,15*m);}
    ctx.restore();
  }
  function packet(x,y,dx,dy){
    damage(x-20,y-20,40,40);ctx.save();ctx.transform(dx,dy,-dy,dx,x,y);
    ctx.lineCap='round';ctx.strokeStyle='#fff2c6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-7,0);ctx.stroke();
    ctx.strokeStyle='#ad6737';ctx.lineWidth=3;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(0,0);ctx.stroke();
    ctx.fillStyle='#ffe5a0';ctx.strokeStyle='#734d32';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,3.9,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.restore();
  }
  function at(ev){
    const rect=canvas.getBoundingClientRect();
    const x=((ev.clientX-rect.left)*canvas.width/rect.width/dpr-ox)/unit,y=((ev.clientY-rect.top)*canvas.height/rect.height/dpr-oy)/unit;
    for(const [name,p] of positions)if(Math.abs(x-p.x)<=p.r&&Math.abs(y-p.cy)<=p.r)return name;
    return null;
  }
  return {begin,token,packet,resize,light:plates.light,
    interactions(select,repaint){
      canvas.addEventListener('pointermove',ev=>{hit=at(ev);if(hit!==hover){hover=hit;canvas.style.cursor=hit?'pointer':'';repaint();}});
      canvas.addEventListener('pointerleave',()=>{if(hover){hover=null;repaint();}});
      canvas.addEventListener('click',ev=>{const n=at(ev);if(n)select(n,ev);});
      for(const [name,node] of people){
        node.addEventListener('focus',()=>{focus=name;repaint();});
        node.addEventListener('blur',()=>{focus=null;repaint();});
      }
    }};
}
