/* ============================================================
   Ritesh Mamidi — portfolio interactions & generative graphics
   ============================================================ */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- FILTERS (progressive enhancement — static cards already in the DOM) ---------- */
function enhanceFilters(){
  const filters=$('#filters'); if(!filters)return;
  const cards=$$('#pgrid .pcard');
  filters.setAttribute('role','group');
  filters.setAttribute('aria-label','Filter projects by area');
  $$('.fbtn',filters).forEach(b=>b.setAttribute('aria-pressed', b.classList.contains('on')?'true':'false'));
  filters.addEventListener('click',e=>{
    const b=e.target.closest('.fbtn'); if(!b)return;
    const f=b.dataset.f;
    $$('.fbtn',filters).forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});
    cards.forEach(c=>c.classList.toggle('hide', !(f==='all'||c.dataset.cat===f)));
  });
}

/* ---------- REVEAL ---------- */
let io;
function scan(){
  const els=$$('.rv:not(.in)');
  if(RM||!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('in'));return;}
  if(!io){io=new IntersectionObserver(en=>{en.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.08});}
  els.forEach(e=>io.observe(e));
}
function forceVisible(){$$('.rv:not(.in)').forEach(e=>{const r=e.getBoundingClientRect();if(r.top<innerHeight*.95&&r.bottom>0)e.classList.add('in');});}
/* scroll-driven reveal — robust fallback so no section can stay hidden if the observer misses it */
function revealInView(){if(RM)return;const vh=innerHeight;$$('.rv:not(.in)').forEach(e=>{const r=e.getBoundingClientRect();if(r.top<vh*.92&&r.bottom>0)e.classList.add('in');});}

/* ---------- THE SYSTEM scroll activation ---------- */
function systemScroll(){
  const flowEl=$('#sysflow'), fill=$('#sysfill'); if(!flowEl||!fill)return;
  const stages=$$('.stage',flowEl);
  const r=flowEl.getBoundingClientRect();
  const vh=innerHeight;
  // progress: 0 when top hits 70% viewport, 1 when bottom hits 40%
  const start=vh*.72, end=vh*.32;
  let prog=(start-r.top)/((r.height)+(start-end));
  prog=Math.max(0,Math.min(1,prog));
  fill.style.height=(prog*100)+'%';
  const fillPx=r.top+prog*r.height;
  stages.forEach(st=>{
    const nr=st.querySelector('.node').getBoundingClientRect();
    st.classList.toggle('on', nr.top+8 <= fillPx || RM);
  });
}

/* ---------- NAV: scrolled + scrollspy + bar ---------- */
const nav=$('#nav'), bar=$('#bar');
const spy=['work','research','watch','system','impact','experience','about','contact'];
function onScroll(){
  const y=scrollY, h=document.body.scrollHeight-innerHeight;
  bar.style.width=(h>0?y/h*100:0)+'%';
  nav.classList.toggle('scrolled',y>36);
  // hero parallax
  const hw=$('#hero .wrap');
  if(hw&&!RM){const hy=Math.min(y,720);hw.style.transform=`translateY(${(hy*.12).toFixed(1)}px)`;hw.style.opacity=String(Math.max(0,1-hy/640));}
  // scrollspy
  let cur=spy[0];
  for(const id of spy){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=innerHeight*.4)cur=id;}
  $$('#nlinks a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+cur));
  revealInView();
  systemScroll();
}

/* ---------- COUNTERS (DOM keeps real value; animate on view) ---------- */
function animateCounts(){
  if(RM)return;
  $$('[data-count]').forEach(el=>{
    const to=+el.dataset.count, suf=el.dataset.suffix||'';
    let n=0; const steps=34, inc=Math.max(1,Math.ceil(to/steps));
    // Keep the readable final value until the short count animation starts.
    const iv=setInterval(()=>{n+=inc;if(n>=to){n=to;clearInterval(iv);}el.textContent=n+suf;},24);
  });
}
let counted=false;
function watchCounts(){
  const zones=[$('#hero .hmeta'),$('#impact')].filter(Boolean);
  if(!('IntersectionObserver'in window)){animateCounts();return;}
  const co=new IntersectionObserver(en=>{en.forEach(x=>{if(x.isIntersecting&&!counted){counted=true;animateCounts();co.disconnect();}});},{threshold:.25});
  zones.forEach(z=>co.observe(z));
  setTimeout(()=>{if(!counted){counted=true;animateCounts();}},2800);
}

/* ---------- COPY EMAIL ---------- */
const cm=$('#copymail');
if(cm) cm.addEventListener('click',async()=>{
  const mail=cm.dataset.mail;
  try{await navigator.clipboard.writeText(mail);}catch(e){
    const t=document.createElement('textarea');t.value=mail;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(_){}t.remove();
  }
  cm.classList.add('ok');$('#cptext').textContent='copied ✓';
  const toast=$('#toast');toast.classList.add('show');
  setTimeout(()=>{cm.classList.remove('ok');$('#cptext').textContent='click to copy';toast.classList.remove('show');},2000);
});

/* ---------- BURGER ---------- */
const burger=$('#burger'),nlinks=$('#nlinks');
if(burger) burger.addEventListener('click',()=>{
  const open=nlinks.classList.toggle('open');burger.classList.toggle('x',open);burger.setAttribute('aria-expanded',open);
});
$$('#nlinks a').forEach(a=>a.addEventListener('click',()=>{nlinks.classList.remove('open');burger.classList.remove('x');burger.setAttribute('aria-expanded','false');}));

/* ---------- TYPEWRITER ---------- */
function typewriter(){
  const el=$('.hrole'); if(!el||RM)return;
  const html=el.innerHTML; const text=el.textContent;
  el.textContent='';el.classList.add('typing','blink');
  let i=0;
  (function t(){if(i<=text.length){el.textContent=text.slice(0,i);i++;setTimeout(t,26);}else{el.innerHTML=html;el.classList.remove('typing');setTimeout(()=>el.classList.remove('blink'),1400);}})();
}

/* ---------- LIVE CLOCK ---------- */
function tick(){try{const t=new Date().toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'});const el=$('#locClock');if(el)el.textContent='Austin · '+t;}catch(e){}}

/* ---------- HERO FIELD (subtle embedding space) ---------- */
function heroField(){
  const cv=$('#field'); if(!cv||RM)return;
  const ctx=cv.getContext('2d'); let W,H,pts,raf=null,run=true;
  function size(){const r=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.max(30,Math.min(64,Math.floor(W*H*.00006)));
    pts=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22}));}
  function draw(){if(!run)return;ctx.clearRect(0,0,W,H);
    for(let i=0;i<pts.length;i++){const p=pts[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
      for(let j=i+1;j<pts.length;j++){const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,dd=dx*dx+dy*dy;
        if(dd<17000){const a=(1-dd/17000)*.32;ctx.strokeStyle='rgba(34,211,166,'+a+')';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}}
    for(const p of pts){ctx.fillStyle='rgba(180,200,220,.5)';ctx.beginPath();ctx.arc(p.x,p.y,1.3,0,7);ctx.fill();}
    raf=requestAnimationFrame(draw);}
  size();draw();
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(size,180);});
  let inView=true,paused=false;function syncRun(){run=inView&&!document.hidden&&!paused;if(run&&!raf)draw();else if(!run){cancelAnimationFrame(raf);raf=null;}}
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncRun();}).observe(cv);
  document.addEventListener('portfolio-motion',e=>{paused=e.detail.paused;syncRun();});
  document.addEventListener('visibilitychange',()=>{run=inView&&!document.hidden&&!paused;if(run&&!raf)draw();else{cancelAnimationFrame(raf);raf=null;}});
}

/* ---------- INIT ---------- */
function init(){
  window.__enh=true;
  enhanceFilters();
  scan();
  const yr=$('#yr');if(yr)yr.textContent=new Date().getFullYear();
  tick();setInterval(tick,20000);
  heroField();
  watchCounts();
  const liveNote=$('#liveNote');if(liveNote)liveNote.textContent='22 project builds · Code & tests on GitHub';
  addEventListener('scroll',onScroll,{passive:true});
  onScroll();
  addEventListener('load',()=>{forceVisible();setTimeout(forceVisible,400);scan();});
  setTimeout(()=>{forceVisible();scan();},1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
