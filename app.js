/* ============================================================
   Ritesh Mamidi — portfolio interactions & generative graphics
   ============================================================ */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- FLAGSHIP ARCHITECTURE VISUALS (SVG) ---------- */
/* language: ink strokes + single teal accent, on light cards */
const INK='#12151b', GRY='#c8ccd2', SUB='#7b8090', AC='#12b98f', ACF='rgba(18,185,143,.12)';
const flow=(id)=>`<animateMotion dur="2.4s" repeatCount="indefinite" begin="${(Math.random()*2).toFixed(2)}s"><mpath href="#${id}"/></animateMotion>`;

function node(x,y,w,h,label,sub){
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
    <text x="${x+w/2}" y="${y+(sub?h/2-2:h/2+4)}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="12.5" font-weight="600" fill="${INK}">${label}</text>
    ${sub?`<text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="${SUB}">${sub}</text>`:''}</g>`;
}
const svg=(inner,vb='0 0 400 300')=>`<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="architecture diagram"><defs>
  <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="${SUB}"/></marker>
  </defs>${inner}</svg>`;

const GFX={
  /* streaming: sources -> kafka -> spark(window) -> cassandra, flowing dots */
  stream(){
    let s=node(14,120,74,54,'Sources','events');
    s+=node(120,120,74,54,'Kafka','topics');
    s+=node(226,120,74,54,'Spark','window');
    s+=node(320,120,66,54,'Store','Cassandra');
    // connectors
    const conns=[['p1',88,147,120,147],['p2',194,147,226,147],['p3',300,147,320,147]];
    let paths='',dots='';
    conns.forEach(([id,x1,y1,x2,y2])=>{
      paths+=`<path id="${id}" d="M${x1} ${y1} H${x2}" fill="none" stroke="${SUB}" stroke-width="1.4" marker-end="url(#ar)" opacity=".5"/>`;
      for(let k=0;k<2;k++) dots+=`<circle r="3" fill="${AC}"><animateMotion dur="1.9s" repeatCount="indefinite" begin="${(k*.9).toFixed(2)}s"><mpath href="#${id}"/></animateMotion></circle>`;
    });
    // kafka partition lanes
    let lanes='';[0,1,2].forEach(i=>lanes+=`<rect x="128" y="${128+i*13}" width="58" height="6" rx="3" fill="${ACF}" stroke="${AC}" stroke-width=".8"/>`);
    // spark window pulse
    const win=`<rect x="234" y="128" width="58" height="38" rx="6" fill="none" stroke="${AC}" stroke-width="1.2" stroke-dasharray="4 4"><animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.2s" repeatCount="indefinite"/></rect>`;
    // incoming event dots on left
    let ev='';[0,1,2,3].forEach(i=>ev+=`<circle cx="${20+i*4}" cy="${128+i*11}" r="2.4" fill="${INK}" opacity=".55"><animate attributeName="opacity" values=".2;.7;.2" dur="1.6s" begin="${i*.3}s" repeatCount="indefinite"/></circle>`);
    const cap=`<text x="200" y="215" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">event-time · watermarks · exactly-once intent</text>`;
    return svg(paths+lanes+win+s+dots+ev+cap);
  },
  /* lakehouse: bronze/silver/gold bars filling */
  lake(){
    const rows=[['Bronze','#b06a3a',.55],['Silver','#9aa0aa',.78],['Gold',AC,.96]];
    let out='';
    rows.forEach(([lbl,col,w],i)=>{
      const y=70+i*58;
      out+=`<text x="30" y="${y-8}" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${INK}">${lbl}</text>`;
      out+=`<rect x="30" y="${y}" width="330" height="30" rx="7" fill="#eef0f2" stroke="${GRY}" stroke-width="1"/>`;
      out+=`<rect x="30" y="${y}" width="0" height="30" rx="7" fill="${i===2?ACF:'#f4f0ec'}" stroke="${col}" stroke-width="1.4"><animate attributeName="width" from="0" to="${Math.round(330*w)}" dur="1.4s" begin="${.2+i*.35}s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1" values="0;${Math.round(330*w)}"/></rect>`;
      out+=`<circle cx="34" cy="${y+15}" r="3.5" fill="${col}"/>`;
    });
    // quality gate check marks between
    out+=`<text x="30" y="248" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">✓ dedup ✓ enrich ✓ quality gates ✓ partitioned Parquet</text>`;
    return svg(out);
  },
  /* llm eval: score bars + judge */
  eval(){
    const bars=[['Faithfulness',.92,AC],['Hallucination',.08,'#c65b5b'],['Refusal',.71,'#5b83c6']];
    let out=`<text x="30" y="52" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${INK}">LLM-as-judge · rubric scores</text>`;
    bars.forEach(([lbl,v,col],i)=>{
      const y=78+i*46;
      out+=`<text x="30" y="${y-6}" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">${lbl}</text>`;
      out+=`<rect x="30" y="${y}" width="270" height="18" rx="9" fill="#eef0f2" stroke="${GRY}" stroke-width="1"/>`;
      out+=`<rect x="30" y="${y}" width="0" height="18" rx="9" fill="${col}"><animate attributeName="width" from="0" to="${Math.round(270*v)}" dur="1.3s" begin="${.3+i*.3}s" fill="freeze"/></rect>`;
      out+=`<text x="312" y="${y+13}" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${col}">${Math.round(v*100)}</text>`;
    });
    // score badge
    out+=`<circle cx="345" cy="70" r="26" fill="none" stroke="${GRY}" stroke-width="3"/>
      <circle cx="345" cy="70" r="26" fill="none" stroke="${AC}" stroke-width="3" stroke-linecap="round" stroke-dasharray="163" stroke-dashoffset="163" transform="rotate(-90 345 70)"><animate attributeName="stroke-dashoffset" from="163" to="41" dur="1.4s" begin=".4s" fill="freeze"/></circle>
      <text x="345" y="66" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="13" font-weight="700" fill="${INK}">A</text>
      <text x="345" y="79" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7.5" fill="${SUB}">GRADE</text>`;
    out+=`<text x="30" y="242" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">REST API · runs in CI · interactive dashboard</text>`;
    return svg(out);
  },
  /* rag: query -> retriever -> chunks -> llm -> cited answer */
  rag(){
    let out=node(14,128,58,44,'Query','');
    // retriever
    out+=node(96,128,58,44,'Retrieve','top-k');
    // chunks
    const chunks=[[178,86],[178,128],[178,170]];
    chunks.forEach(([x,y],i)=>{
      const hot=i===1;
      out+=`<rect x="${x}" y="${y}" width="54" height="34" rx="7" fill="${hot?ACF:'#f2f3f5'}" stroke="${hot?AC:GRY}" stroke-width="${hot?1.5:1}"/>`;
      out+=`<line x1="${x+8}" y1="${y+12}" x2="${x+40}" y2="${y+12}" stroke="${hot?AC:SUB}" stroke-width="1.4" opacity=".7"/>`;
      out+=`<line x1="${x+8}" y1="${y+20}" x2="${x+30}" y2="${y+20}" stroke="${hot?AC:SUB}" stroke-width="1.4" opacity=".45"/>`;
      // retriever fan lines
      out+=`<path id="rg${i}" d="M154 150 C168 150 168 ${y+17} ${x} ${y+17}" fill="none" stroke="${hot?AC:GRY}" stroke-width="1.2" opacity="${hot?'.9':'.4'}"/>`;
      if(hot) out+=`<circle r="2.6" fill="${AC}"><animateMotion dur="1.6s" repeatCount="indefinite"><mpath href="#rg${i}"/></animateMotion></circle>`;
    });
    // llm
    out+=node(258,128,52,44,'LLM','');
    out+=`<path id="rgl" d="M232 150 H258" fill="none" stroke="${SUB}" stroke-width="1.3" marker-end="url(#ar)" opacity=".5"/>`;
    // answer with streaming lines + citation
    out+=`<rect x="322" y="112" width="66" height="76" rx="8" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
    [0,1,2].forEach(i=>out+=`<line x1="330" y1="${126+i*12}" x2="330" y2="${126+i*12}" stroke="${AC}" stroke-width="2.4" stroke-linecap="round"><animate attributeName="x2" from="330" to="${378-i*8}" dur=".7s" begin="${1+i*.35}s" fill="freeze"/></line>`);
    out+=`<rect x="330" y="168" width="30" height="12" rx="6" fill="${ACF}" stroke="${AC}" stroke-width="1"/><text x="345" y="177" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7.5" fill="${AC}">[1]</text>`;
    out+=`<path id="rga" d="M310 150 H322" fill="none" stroke="${SUB}" stroke-width="1.3" marker-end="url(#ar)" opacity=".5"/>`;
    out+=`<text x="200" y="238" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">grounded · cited · streamed</text>`;
    return svg(out);
  },
  /* mlops: lifecycle ring + drift gauge */
  mlops(){
    const cx=200,cy=140,R=78;
    const stages=['Train','Registry','Serve','Monitor'];
    let out=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${GRY}" stroke-width="1.4" stroke-dasharray="3 5"/>`;
    stages.forEach((s,i)=>{
      const a=(-90+i*90)*Math.PI/180, x=cx+R*Math.cos(a), y=cy+R*Math.sin(a);
      out+=`<circle cx="${x}" cy="${y}" r="26" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
      out+=`<text x="${x}" y="${y+4}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" font-weight="600" fill="${INK}">${s}</text>`;
    });
    // traveling highlight dot around ring
    out+=`<circle r="5" fill="${AC}"><animateMotion dur="5s" repeatCount="indefinite" path="M${cx} ${cy-R} A ${R} ${R} 0 1 1 ${cx-0.01} ${cy-R} Z"/></circle>`;
    // center drift gauge
    out+=`<text x="${cx}" y="${cy-6}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="${SUB}">DRIFT (PSI)</text>`;
    out+=`<path d="M${cx-26} ${cy+14} A 26 26 0 0 1 ${cx+26} ${cy+14}" fill="none" stroke="${GRY}" stroke-width="3"/>`;
    out+=`<line x1="${cx}" y1="${cy+14}" x2="${cx-18}" y2="${cy-4}" stroke="${AC}" stroke-width="2.4" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy+14}; 46 ${cx} ${cy+14}; 12 ${cx} ${cy+14}" dur="3.4s" repeatCount="indefinite"/></line>`;
    out+=`<circle cx="${cx}" cy="${cy+14}" r="3" fill="${INK}"/>`;
    return svg(out);
  },
  /* experimentation: A/B + two curves + scorecard */
  exp(){
    let out=`<text x="30" y="50" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${INK}">A / B · CUPED-adjusted</text>`;
    // two overlapping bell curves
    const bell=(cx,col,dash)=>{
      let d=`M40 190`;
      for(let x=0;x<=300;x+=6){const y=190-95*Math.exp(-Math.pow((x-cx)/48,2));d+=` L${40+x} ${y.toFixed(1)}`;}
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" ${dash?`stroke-dasharray="4 4"`:''} stroke-linecap="round" pathLength="1" stroke-dashoffset="1" style="stroke-dasharray:1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.6s" begin=".3s" fill="freeze"/></path>`;
    };
    out+=`<line x1="40" y1="190" x2="360" y2="190" stroke="${GRY}" stroke-width="1"/>`;
    out+=bell(120,SUB,true)+bell(190,AC,false);
    out+=`<text x="120" y="205" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="${SUB}">control</text>`;
    out+=`<text x="230" y="205" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="${AC}">variant ✓</text>`;
    // scorecard badge
    out+=`<rect x="286" y="60" width="80" height="52" rx="9" fill="${ACF}" stroke="${AC}" stroke-width="1.3"/>`;
    out+=`<text x="326" y="80" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="${SUB}">DECISION</text>`;
    out+=`<text x="326" y="98" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="14" font-weight="700" fill="${AC}">SHIP</text>`;
    out+=`<text x="30" y="238" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">power · guardrails · FDR control</text>`;
    return svg(out);
  }
};

/* ---------- RENDER FLAGSHIPS ---------- */
function renderFlagships(){
  const host=$('#flagships'); if(!host)return;
  FLAG.forEach((f,idx)=>{
    const rev=idx%2===1;
    const dm=f.dm?`<a class="dm" href="${f.dm}" target="_blank" rel="noopener">▶ Live demo <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`:'';
    const csid='cs'+idx;
    const arch=f.cs.arch.map((a,i)=>`<span class="b">${a}</span>${i<f.cs.arch.length-1?'<span class="ar">→</span>':''}`).join('');
    const row=document.createElement('div');
    row.className='flagw rv';
    row.innerHTML=`
      <div class="flag${rev?' rev':''}">
      <div class="flag-txt">
        <span class="flag-num">${f.num} / Flagship</span>
        <h3>${f.n}</h3>
        <p class="one">${f.one}</p>
        <div class="impact">▸ <span>${f.impact}</span></div>
        <div class="fstack">${f.tech.join('  ·  ')}</div>
        <div class="flinks">
          <a class="cs" href="#" data-cs="${csid}">Case study <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M6 9l6 6 6-6"/></svg></a>
          <a class="gh" href="${GH}${f.r}" target="_blank" rel="noopener">GitHub <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          ${dm}
        </div>
      </div>
      <div class="flag-visual" aria-hidden="true">${GFX[f.gfx]()}</div>
      </div>
      <div class="cs-panel" id="${csid}"><div class="cs-inner">
        <div class="cs-block"><h4>The problem</h4><p>${f.cs.problem}</p></div>
        <div class="cs-block"><h4>My approach</h4><p>${f.cs.approach}</p></div>
        <div class="cs-block arch"><h4>Architecture</h4><div class="cs-arch">${arch}</div></div>
        <div class="cs-block"><h4>Technology</h4><p>${f.cs.tech}</p></div>
        <div class="cs-block"><h4>Result</h4><p>${f.cs.result}</p></div>
        <div class="cs-block"><h4>What I'd improve</h4><p>${f.cs.lessons}</p></div>
        <div class="cs-block"><h4>Inspect it</h4><p><a href="${GH}${f.r}" target="_blank" rel="noopener" style="color:var(--ac-x);font-weight:600">Repository ↗</a>${f.dm?` &nbsp;·&nbsp; <a href="${f.dm}" target="_blank" rel="noopener" style="color:var(--tx);font-weight:600">Live demo ↗</a>`:''}</p></div>
      </div></div>`;
    host.appendChild(row);
  });
  // case study toggles
  $$('[data-cs]').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    const p=$('#'+a.dataset.cs); if(!p)return;
    const open=p.classList.toggle('open');
    a.querySelector('svg').style.transform=open?'rotate(180deg)':'';
    a.firstChild.textContent=open?'Hide case study ':'Case study ';
  }));
}

/* ---------- RENDER PROJECT SHELF ---------- */
function renderProjects(f){
  const g=$('#pgrid'); if(!g)return;
  g.innerHTML='';
  P.filter(p=>f==='all'||p.c===f).forEach(p=>{
    const demo=p.dm?`<a class="demo" href="${p.dm}" target="_blank" rel="noopener">▶ Demo</a>`:'';
    const el=document.createElement('div'); el.className='pcard';
    el.innerHTML=`<div class="cat">${CATLABEL[p.c]}</div><h4>${p.n}</h4><p>${p.d}</p>
      <div class="tt">${p.t.map(x=>`<span>${x}</span>`).join('')}</div>
      <div class="links"><a class="code" href="${GH}${p.r}" target="_blank" rel="noopener">⟨/⟩ Code</a>${demo}</div>`;
    g.appendChild(el);
  });
}
const filters=$('#filters');
if(filters) filters.addEventListener('click',e=>{
  const b=e.target.closest('.fbtn'); if(!b)return;
  $$('.fbtn').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  renderProjects(b.dataset.f);
});

/* ---------- REVEAL ---------- */
let io;
function scan(){
  const els=$$('.rv:not(.in)');
  if(RM||!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('in'));return;}
  if(!io){io=new IntersectionObserver(en=>{en.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.08});}
  els.forEach(e=>io.observe(e));
}
function forceVisible(){$$('.rv:not(.in)').forEach(e=>{const r=e.getBoundingClientRect();if(r.top<innerHeight*.95&&r.bottom>0)e.classList.add('in');});}

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
const spy=['work','system','impact','experience','about','contact'];
function onScroll(){
  const y=scrollY, h=document.body.scrollHeight-innerHeight;
  bar.style.width=(h>0?y/h*100:0)+'%';
  nav.classList.toggle('scrolled',y>36);
  // hero parallax
  const hw=$('#hero .wrap');
  if(hw){const hy=Math.min(y,720);hw.style.transform=`translateY(${(hy*.12).toFixed(1)}px)`;hw.style.opacity=String(Math.max(0,1-hy/640));}
  // scrollspy
  let cur=spy[0];
  for(const id of spy){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=innerHeight*.4)cur=id;}
  $$('#nlinks a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+cur));
  systemScroll();
}

/* ---------- COUNTERS (DOM keeps real value; animate on view) ---------- */
function animateCounts(){
  if(RM)return;
  $$('[data-count]').forEach(el=>{
    const to=+el.dataset.count, suf=el.dataset.suffix||'';
    let n=0; const steps=34, inc=Math.max(1,Math.ceil(to/steps));
    el.textContent='0'+suf;
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
$$('#nlinks a').forEach(a=>a.addEventListener('click',()=>{nlinks.classList.remove('open');burger.classList.remove('x');}));

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

/* ---------- LIVE GITHUB ---------- */
async function ghData(){
  try{const r=await fetch('https://api.github.com/users/riteshmamidi0905-lab');
    if(r.ok){const j=await r.json();if(j.public_repos){
      const rc=$('#repoCount');if(rc){rc.dataset.count=j.public_repos;if(!counted)rc.textContent=j.public_repos+'+';}
      const ln=$('#liveNote');if(ln)ln.textContent='● '+j.public_repos+' public repos · live from GitHub';
    }}}catch(e){}
}

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
  document.addEventListener('visibilitychange',()=>{run=!document.hidden;if(run&&!raf)draw();else{cancelAnimationFrame(raf);raf=null;}});
}

/* ---------- INIT ---------- */
function init(){
  renderFlagships();
  renderProjects('all');
  scan();
  const yr=$('#yr');if(yr)yr.textContent=new Date().getFullYear();
  tick();setInterval(tick,20000);
  heroField();
  watchCounts();
  ghData();
  addEventListener('scroll',onScroll,{passive:true});
  onScroll();
  addEventListener('load',()=>{forceVisible();setTimeout(forceVisible,400);scan();});
  setTimeout(()=>{forceVisible();scan();},1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
