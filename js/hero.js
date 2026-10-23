/* Hero: an ILLUSTRATIVE animation of the verified NASHA workflow. Packets travel orders -> pipeline -> forecast -> agent -> THE WEIR -> human -> ledger;
   some are blocked at the gate. It is a picture of the architecture, not a live system (the label on screen says so). 30 fps cap, paused off-screen/hidden, one static frame under reduced motion. */
(()=>{'use strict';
const c=document.getElementById('hero-canvas');if(!c)return;
const ctx=c.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const NODES=[['ORDERS','#62c9ff'],['PIPELINE','#62c9ff'],['FORECAST','#62c9ff'],['AGENT','#7ce8bd'],['THE WEIR','#ffb85c'],['HUMAN','#ffb85c'],['LEDGER','#7ce8bd']];
let W=0,H=0,dpr=1,px=0,py=0,tx=0,ty=0,run=false,last=0,packets=[],pts=[];
function size(){const r=c.getBoundingClientRect();dpr=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;c.width=W*dpr;c.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);layout()}
function layout(){pts=NODES.map((n,i)=>{const t=i/(NODES.length-1);return{x:W*(.07+.86*t),y:H*(.5+.3*Math.sin(t*Math.PI*1.6-.6)),z:Math.cos(t*Math.PI*2)*60,n:n[0],col:n[1]}})}
function proj(p){const f=500/(500+p.z+py*40);return{x:W/2+(p.x-W/2)*f+px*22*(p.z/60),y:H/2+(p.y-H/2)*f+py*14*(p.z/60),f}}
function lane(a,b,t){const A=proj(a),B=proj(b),mx=(A.x+B.x)/2,my=Math.min(A.y,B.y)-H*.07;const u=1-t;return{x:u*u*A.x+2*u*t*mx+t*t*B.x,y:u*u*A.y+2*u*t*my+t*t*B.y}}
function spawn(){packets.push({i:0,t:0,v:.35+Math.random()*.25,blocked:Math.random()<.26,hold:0,alive:1})}
function draw(dt){ctx.clearRect(0,0,W,H);
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];ctx.beginPath();for(let k=0;k<=24;k++){const q=lane(a,b,k/24);k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.strokeStyle='rgba(190,210,204,.34)';ctx.lineWidth=1.6;ctx.stroke()}
  for(const p of packets){const a=pts[p.i],b=pts[p.i+1];if(!b)continue;const q=lane(a,b,p.t);const col=p.blocked&&p.i>=3?'#ff7a7a':a.col;
    ctx.beginPath();ctx.arc(q.x,q.y,4.6*proj(a).f,0,6.283);ctx.fillStyle=col;ctx.globalAlpha=p.alive;ctx.shadowColor=col;ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1}
  pts.forEach(p=>{const q=proj(p);ctx.beginPath();ctx.arc(q.x,q.y,10*q.f,0,6.283);ctx.fillStyle='#0a1113';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(q.x,q.y,3.2*q.f,0,6.283);ctx.fillStyle=p.col;ctx.fill();
    ctx.font='12px Mono,monospace';ctx.fillStyle='#cfdcd7';ctx.textAlign='center';ctx.fillText(p.n,q.x,q.y+(q.y>H*.55?27:-19))})}
function step(dt){for(const p of packets){if(p.hold>0){p.hold-=dt;continue}p.t+=p.v*dt;if(p.t>=1){p.i++;p.t=0;if(p.i===4&&p.blocked){p.alive=.999}if(p.i===5&&!p.blocked)p.hold=.5}
    if(p.blocked&&p.i===4&&p.t>.5)p.alive=Math.max(0,p.alive-dt*1.6);if(p.i>=pts.length-1||p.alive<=0)p.dead=1}
  packets=packets.filter(p=>!p.dead)}
function frame(now){if(!run)return;requestAnimationFrame(frame);if(now-last<33)return;const dt=Math.min(.06,(now-last)/1000);last=now;px+=(tx-px)*.06;py+=(ty-py)*.06;if(Math.random()<dt*2.4&&packets.length<26)spawn();step(dt);draw(dt)}
function start(){if(run||reduce)return;run=true;last=performance.now();requestAnimationFrame(frame)}function stop(){run=false}
size();addEventListener('resize',()=>{size();if(reduce)staticFrame()});
function staticFrame(){packets=[{i:0,t:.5,v:0,blocked:0,hold:0,alive:1},{i:1,t:.4,v:0,blocked:0,hold:0,alive:1},{i:2,t:.6,v:0,blocked:0,hold:0,alive:1},{i:3,t:.7,v:0,blocked:0,hold:0,alive:1},{i:4,t:.7,v:0,blocked:1,hold:0,alive:.8},{i:5,t:.5,v:0,blocked:0,hold:0,alive:1}];draw(0)}
if(reduce){staticFrame()}else{
  new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?start():stop())).observe(c);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  const st=c.parentElement;st.addEventListener('pointermove',e=>{const r=st.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*2;ty=((e.clientY-r.top)/r.height-.5)*2});st.addEventListener('pointerleave',()=>{tx=ty=0})}
})();
