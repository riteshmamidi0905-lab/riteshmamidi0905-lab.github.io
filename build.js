/* ============================================================
   build.js — static site generation
   Pipeline:  data.js (canonical source)  ->  static HTML  ->  index.html
   Run:  node build.js
   Reads index.src.html (template with empty #flagships / #pgrid),
   injects generated markup, writes index.html. app.js then ENHANCES
   this static DOM (filters, animation, case-study caret, counters …).
   No project content is hand-duplicated anywhere.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { GH, CATLABEL, FLAG, P } = require('./data.js');
const { researchHTML, watchHTML } = require('./scripts/sections');
const evidence = require('./content/project-evidence.json');
const { avatarHTML, worldHTML, worldsJSON, explainerHTML } = require('./scripts/worlds-html');

/* ---------- SVG architecture visuals (presentation, generated from nothing but layout) ---------- */
const INK='#12151b', GRY='#c8ccd2', SUB='#7b8090', AC='#12b98f', ACF='rgba(18,185,143,.12)';
function node(x,y,w,h,label,sub){
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`
    +`<text x="${x+w/2}" y="${y+(sub?h/2-2:h/2+4)}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="12.5" font-weight="600" fill="${INK}">${label}</text>`
    +(sub?`<text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="${SUB}">${sub}</text>`:'')+`</g>`;
}
const svg=(inner,vb='0 0 400 300')=>`<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="architecture diagram"><defs>`
  +`<marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="${SUB}"/></marker></defs>${inner}</svg>`;

const GFX={
  stream(){
    let s=node(14,120,74,54,'Sources','events')+node(120,120,74,54,'Kafka','topics')+node(226,120,74,54,'Spark','window')+node(320,120,66,54,'Store','Cassandra');
    const conns=[['p1',88,147,120,147],['p2',194,147,226,147],['p3',300,147,320,147]];
    let paths='',dots='';
    conns.forEach(([id,x1,y1,x2,y2])=>{
      paths+=`<path id="${id}" d="M${x1} ${y1} H${x2}" fill="none" stroke="${SUB}" stroke-width="1.4" marker-end="url(#ar)" opacity=".5"/>`;
      for(let k=0;k<2;k++) dots+=`<circle r="3" fill="${AC}"><animateMotion dur="1.9s" repeatCount="indefinite" begin="${(k*.9).toFixed(2)}s"><mpath href="#${id}"/></animateMotion></circle>`;
    });
    let lanes='';[0,1,2].forEach(i=>lanes+=`<rect x="128" y="${128+i*13}" width="58" height="6" rx="3" fill="${ACF}" stroke="${AC}" stroke-width=".8"/>`);
    const win=`<rect x="234" y="128" width="58" height="38" rx="6" fill="none" stroke="${AC}" stroke-width="1.2" stroke-dasharray="4 4"><animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.2s" repeatCount="indefinite"/></rect>`;
    let ev='';[0,1,2,3].forEach(i=>ev+=`<circle cx="${20+i*4}" cy="${128+i*11}" r="2.4" fill="${INK}" opacity=".55"><animate attributeName="opacity" values=".2;.7;.2" dur="1.6s" begin="${i*.3}s" repeatCount="indefinite"/></circle>`);
    const cap=`<text x="200" y="215" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">event-time &#183; watermarks &#183; checkpointed sinks</text>`;
    return svg(paths+lanes+win+s+dots+ev+cap);
  },
  lake(){
    const rows=[['Bronze','#b06a3a',.55],['Silver','#9aa0aa',.78],['Gold',AC,.96]]; let out='';
    rows.forEach(([lbl,col,w],i)=>{const y=70+i*58;
      out+=`<text x="30" y="${y-8}" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${INK}">${lbl}</text>`;
      out+=`<rect x="30" y="${y}" width="330" height="30" rx="7" fill="#eef0f2" stroke="${GRY}" stroke-width="1"/>`;
      out+=`<rect x="30" y="${y}" width="0" height="30" rx="7" fill="${i===2?ACF:'#f4f0ec'}" stroke="${col}" stroke-width="1.4"><animate attributeName="width" from="0" to="${Math.round(330*w)}" dur="1.4s" begin="${(.2+i*.35).toFixed(2)}s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1" values="0;${Math.round(330*w)}"/></rect>`;
      out+=`<circle cx="34" cy="${y+15}" r="3.5" fill="${col}"/>`;});
    out+=`<text x="30" y="248" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">&#10003; dedup &#10003; enrich &#10003; quality gates &#10003; partitioned Parquet</text>`;
    return svg(out);
  },
  eval(){
    const bars=[['Faithfulness',.92,AC],['Hallucination',.08,'#c65b5b'],['Refusal',.71,'#5b83c6']];
    let out=`<text x="30" y="52" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${INK}">LLM-as-judge &#183; rubric scores</text>`;
    bars.forEach(([lbl,v,col],i)=>{const y=78+i*46;
      out+=`<text x="30" y="${y-6}" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">${lbl}</text>`;
      out+=`<rect x="30" y="${y}" width="270" height="18" rx="9" fill="#eef0f2" stroke="${GRY}" stroke-width="1"/>`;
      out+=`<rect x="30" y="${y}" width="0" height="18" rx="9" fill="${col}"><animate attributeName="width" from="0" to="${Math.round(270*v)}" dur="1.3s" begin="${(.3+i*.3).toFixed(2)}s" fill="freeze"/></rect>`;
      out+=`<text x="312" y="${y+13}" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${col}">${Math.round(v*100)}</text>`;});
    out+=`<circle cx="345" cy="70" r="26" fill="none" stroke="${GRY}" stroke-width="3"/>`
      +`<circle cx="345" cy="70" r="26" fill="none" stroke="${AC}" stroke-width="3" stroke-linecap="round" stroke-dasharray="163" stroke-dashoffset="163" transform="rotate(-90 345 70)"><animate attributeName="stroke-dashoffset" from="163" to="41" dur="1.4s" begin=".4s" fill="freeze"/></circle>`
      +`<text x="345" y="66" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="13" font-weight="700" fill="${INK}">A</text>`
      +`<text x="345" y="79" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7.5" fill="${SUB}">GRADE</text>`;
    out+=`<text x="30" y="242" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">REST API &#183; runs in CI &#183; interactive dashboard</text>`;
    return svg(out);
  },
  rag(){
    let out=node(14,128,58,44,'Query','')+node(96,128,58,44,'Retrieve','top-k');
    const chunks=[[178,86],[178,128],[178,170]];
    chunks.forEach(([x,y],i)=>{const hot=i===1;
      out+=`<rect x="${x}" y="${y}" width="54" height="34" rx="7" fill="${hot?ACF:'#f2f3f5'}" stroke="${hot?AC:GRY}" stroke-width="${hot?1.5:1}"/>`;
      out+=`<line x1="${x+8}" y1="${y+12}" x2="${x+40}" y2="${y+12}" stroke="${hot?AC:SUB}" stroke-width="1.4" opacity=".7"/>`;
      out+=`<line x1="${x+8}" y1="${y+20}" x2="${x+30}" y2="${y+20}" stroke="${hot?AC:SUB}" stroke-width="1.4" opacity=".45"/>`;
      out+=`<path id="rg${i}" d="M154 150 C168 150 168 ${y+17} ${x} ${y+17}" fill="none" stroke="${hot?AC:GRY}" stroke-width="1.2" opacity="${hot?'.9':'.4'}"/>`;
      if(hot) out+=`<circle r="2.6" fill="${AC}"><animateMotion dur="1.6s" repeatCount="indefinite"><mpath href="#rg${i}"/></animateMotion></circle>`;});
    out+=node(258,128,52,44,'LLM','');
    out+=`<path id="rgl" d="M232 150 H258" fill="none" stroke="${SUB}" stroke-width="1.3" marker-end="url(#ar)" opacity=".5"/>`;
    out+=`<rect x="322" y="112" width="66" height="76" rx="8" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
    [0,1,2].forEach(i=>out+=`<line x1="330" y1="${126+i*12}" x2="330" y2="${126+i*12}" stroke="${AC}" stroke-width="2.4" stroke-linecap="round"><animate attributeName="x2" from="330" to="${378-i*8}" dur=".7s" begin="${(1+i*.35).toFixed(2)}s" fill="freeze"/></line>`);
    out+=`<rect x="330" y="168" width="30" height="12" rx="6" fill="${ACF}" stroke="${AC}" stroke-width="1"/><text x="345" y="177" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7.5" fill="${AC}">[1]</text>`;
    out+=`<path id="rga" d="M310 150 H322" fill="none" stroke="${SUB}" stroke-width="1.3" marker-end="url(#ar)" opacity=".5"/>`;
    out+=`<text x="200" y="238" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">grounded &#183; cited &#183; streamed</text>`;
    return svg(out);
  },
  mlops(){
    const cx=200,cy=140,R=78; const stages=['Train','Registry','Serve','Monitor'];
    let out=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${GRY}" stroke-width="1.4" stroke-dasharray="3 5"/>`;
    stages.forEach((s,i)=>{const a=(-90+i*90)*Math.PI/180,x=cx+R*Math.cos(a),y=cy+R*Math.sin(a);
      out+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
      out+=`<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" font-weight="600" fill="${INK}">${s}</text>`;});
    out+=`<circle r="5" fill="${AC}"><animateMotion dur="5s" repeatCount="indefinite" path="M${cx} ${cy-R} A ${R} ${R} 0 1 1 ${cx-0.01} ${cy-R} Z"/></circle>`;
    out+=`<text x="${cx}" y="${cy-6}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="${SUB}">DRIFT (PSI)</text>`;
    out+=`<path d="M${cx-26} ${cy+14} A 26 26 0 0 1 ${cx+26} ${cy+14}" fill="none" stroke="${GRY}" stroke-width="3"/>`;
    out+=`<line x1="${cx}" y1="${cy+14}" x2="${cx-18}" y2="${cy-4}" stroke="${AC}" stroke-width="2.4" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy+14}; 46 ${cx} ${cy+14}; 12 ${cx} ${cy+14}" dur="3.4s" repeatCount="indefinite"/></line>`;
    out+=`<circle cx="${cx}" cy="${cy+14}" r="3" fill="${INK}"/>`;
    return svg(out);
  },
  exp(){
    let out=`<text x="30" y="50" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600" fill="${INK}">A / B &#183; CUPED-adjusted</text>`;
    const bell=(cx,col,dash)=>{let d=`M40 190`;for(let x=0;x<=300;x+=6){const y=190-95*Math.exp(-Math.pow((x-cx)/48,2));d+=` L${40+x} ${y.toFixed(1)}`;}
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" ${dash?`stroke-dasharray="4 4"`:''} stroke-linecap="round"/>`;};
    out+=`<line x1="40" y1="190" x2="360" y2="190" stroke="${GRY}" stroke-width="1"/>`;
    out+=bell(120,SUB,true)+bell(190,AC,false);
    out+=`<text x="120" y="205" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="${SUB}">control</text>`;
    out+=`<text x="230" y="205" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="${AC}">variant &#10003;</text>`;
    out+=`<rect x="286" y="60" width="80" height="52" rx="9" fill="${ACF}" stroke="${AC}" stroke-width="1.3"/>`;
    out+=`<text x="326" y="80" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="${SUB}">DECISION</text>`;
    out+=`<text x="326" y="98" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="14" font-weight="700" fill="${AC}">SHIP</text>`;
    out+=`<text x="30" y="238" font-family="JetBrains Mono,monospace" font-size="10.5" fill="${SUB}">power &#183; guardrails &#183; FDR control</text>`;
    return svg(out);
  }
};

const arrow=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const caret=`<svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;

/* ---------- generate flagship articles ---------- */
function flagshipHTML(){
  return FLAG.map((f,idx)=>{
    const rev=idx%2===1;
    const dm=f.dm?`\n          <a class="dm" href="${f.dm}" target="_blank" rel="noopener">&#9654; Live demo ${arrow}</a>`:'';
    const arch=f.cs.arch.map((a,i)=>`<span class="b">${a}</span>${i<f.cs.arch.length-1?'<span class="ar">&#8594;</span>':''}`).join('');
    const demoInspect=f.dm?` &nbsp;&#183;&nbsp; <a href="${f.dm}" target="_blank" rel="noopener" style="color:var(--tx);font-weight:600">Live demo &#8599;</a>`:'';
    return `<article class="flagw rv">
      <div class="flag${rev?' rev':''}">
        <div class="flag-txt">
          <span class="flag-num">${f.num} / Flagship</span>
          <h3>${f.n}</h3>
          <p class="one">${f.one}</p>
          <div class="impact">&#9656; <span>${f.impact}</span></div>
          <div class="fstack">${f.tech.join('  &#183;  ')}</div>
          <div class="flinks">
            <a class="gh" href="${GH}${f.r}" target="_blank" rel="noopener">GitHub ${arrow}</a>${dm}
          </div>
        </div>
        <div class="flag-visual" aria-hidden="true">${GFX[f.gfx]().replace(/id="([^"]+)"/g,`id="${f.r}-$1"`).replace(/href="#([^"]+)"/g,`href="#${f.r}-$1"`).replace(/url\(#([^)]*)\)/g,`url(#${f.r}-$1)`)}<div class="visual-note">Illustrative Example — Not Experimental Results</div></div>
      </div>
      ${explainerHTML(f)}
      <details class="cs-panel">
        <summary class="cs-summary">Case study ${caret}</summary>
        <div class="cs-inner">
          <div class="cs-evidence"><a href="${GH}${f.r}/tree/${evidence[f.r]}">Reviewed code snapshot ↗</a><a href="${GH}${f.r}/tree/${evidence[f.r]}/tests">Inspect tests ↗</a></div>
          <div class="cs-block"><h4>The problem</h4><p>${f.cs.problem}</p></div>
          <div class="cs-block"><h4>My approach</h4><p>${f.cs.approach}</p></div>
          <div class="cs-block arch"><h4>Architecture</h4><div class="cs-arch">${arch}</div></div>
          <div class="cs-block"><h4>Technology</h4><p>${f.cs.tech}</p></div>
          <div class="cs-block"><h4>Evaluation</h4><p>${f.cs.evaluation}</p></div>
          <div class="cs-block"><h4>Engineering decision</h4><p>${f.cs.decision}</p></div>
          <div class="cs-block"><h4>Outcome</h4><p>${f.cs.result}</p></div>
          <div class="cs-block"><h4>Scope &amp; limitations</h4><p>${f.cs.limit}</p></div>
          <div class="cs-block"><h4>What I'd improve</h4><p>${f.cs.lessons}</p></div>
          <div class="cs-block"><h4>Inspect it</h4><p><a href="${GH}${f.r}" target="_blank" rel="noopener" style="color:var(--ac-x);font-weight:600">Repository &#8599;</a>${demoInspect}</p></div>
        </div>
      </details>
    </article>`;
  }).join('\n    ');
}

/* ---------- generate project shelf articles ---------- */
function projectHTML(){
  return P.map(p=>{
    const demo=p.dm?`<a class="demo" href="${p.dm}" target="_blank" rel="noopener">&#9654; Demo</a>`:'';
    const faceRepos=new Set(['llm-eval-framework','genai-doc-assistant','ai-agent-toolkit']);
    const face=faceRepos.has(p.r)?`<img class="pv-face" src="linkedin-avatar.webp" alt="" loading="lazy">`:'';
    const flows={
      'spark-data-lakehouse':['Bronze','Silver','Gold'],
      'realtime-streaming-pipeline':['Kafka','Spark','Cassandra'],
      'sql-analytics-warehouse':['Raw','SQL','Insights'],
      'genai-doc-assistant':['Docs','Retrieve','Cite'],
      'llm-eval-framework':['Output','Judge','Score'],
      'rag-doc-qa':['Chunk','Retrieve','Answer'],
      'ai-agent-toolkit':['Plan','Tool','Act'],
      'ai-skills-platform':['Gateway','Skills','Response'],
      'mlops-platform':['Train','Serve','Monitor'],
      'vision-inference-api':['Image','Model','HITL'],
      'product-analytics-funnel-retention':['Acquire','Activate','Retain'],
      'experimentation-toolkit':['A','Test','B'],
      'saas-kpi-dashboard':['MRR','NRR','Churn'],
      'customer-churn-prediction':['Users','Model','Risk'],
      'neural-machine-translation':['Encode','Attend','Decode'],
      'sign-language-recognition':['Gesture','CNN','Sign'],
      'video-intelligence':['Frames','Detect','Scenes'],
      'speech-intelligence':['Audio','Model','Intent'],
      'nlp-text-intelligence':['Text','Model','Insight'],
      'document-ocr-vision':['Scan','OCR','JSON'],
      'face-recognition-biometrics':['Face','Embed','Match'],
      'bird-deterrent-signal-intelligence':['Signal','Detect','Respond']
    };
    const ns=flows[p.r]||['Input','Model','Output'];
    const inlineVisual=`<div class="pv pv-inline pv-${p.r}" aria-label="${p.n} animated system visual">
      <div class="pv-grid"></div><div class="pv-scan"></div>
      <div class="pv-title">${CATLABEL[p.c]}</div>
      <div class="pv-flow">${ns.map((n,i)=>`<span class="pv-node">${n}</span>${i<ns.length-1?`<span class="pv-link"><i></i></span>`:''}`).join('')}</div>
      <div class="pv-live"><b></b> DEMO</div>${face}</div>`;
    const visualDir=path.join(__dirname,'project-visuals');
    const hasSVG=fs.existsSync(path.join(visualDir,`${p.r}.svg`));
    // SVG assets avoid decoding heavy animated GIFs on the project shelf.
    const visual=hasSVG?`<div class="pv"><picture>
      <source media="(prefers-reduced-motion: reduce)" srcset="project-visuals/${p.r}-still.svg">
      <img data-motion="${p.r}" src="project-visuals/${p.r}.svg" alt="${p.n} system visual" width="640" height="360" loading="lazy" decoding="async">
    </picture><span class="demo-label">ILLUSTRATIVE WORKFLOW</span></div>`:inlineVisual;
    const persona={data:'data',genai:'ai',mlops:'builder',analytics:'product',vision:'builder'}[p.c]||'builder';
    return `<article class="pcard" data-cat="${p.c}" data-repo="${p.r}" data-persona="${persona}" data-flow="${ns.join('|')}">
        ${visual}
        <div class="cat">${CATLABEL[p.c]}</div>
        <h4>${p.n}</h4>
        <p>${p.d}</p>
        <div class="tt">${p.t.map(x=>`<span>${x}</span>`).join('')}</div>
        <div class="links"><a class="code" href="${GH}${p.r}" target="_blank" rel="noopener">&#10216;/&#10217; Code</a>${demo}<button type="button" class="pc-tour" aria-haspopup="dialog">&#9654; 10-second tour</button></div>
      </article>`;
  }).join('\n      ');
}

/* ---------- inject into template ---------- */
const SITE=__dirname;
let tpl=fs.readFileSync(path.join(SITE,'index.src.html'),'utf8');
if(!tpl.includes('<div id="flagships"></div>')) throw new Error('flagships container not found');
if(!tpl.includes('<div class="pgrid" id="pgrid"></div>')) throw new Error('pgrid container not found');
tpl=tpl.replace('<div id="flagships"></div>', `<div id="flagships">\n    ${flagshipHTML()}\n    </div>`);
tpl=tpl.replace('<div class="pgrid" id="pgrid"></div>', `<div class="pgrid" id="pgrid">\n      ${projectHTML()}\n      </div>`);
tpl=tpl.replace('<div id="research-content"></div>',researchHTML());
tpl=tpl.replace('<div id="watch-content"></div>',watchHTML());
tpl=tpl.replace(/<!--AV:(\w+):([\w-]+)(?::(\w+))?-->/g,(m,persona,cls,flag)=>avatarHTML(persona,{cls,eager:flag==='eager',tag:flag!=='notag',alt:persona==='hero'?'Ritesh Mamidi':'',sizes:persona==='hero'||persona==='contact'?'(max-width:900px) 50vw, 640px':'80px'}));
tpl=tpl.replace(/<!--WORLD:(\w+)-->/g,(m,id)=>worldHTML(id));
tpl=tpl.replace('<!--WORLDS-JSON-->',worldsJSON());
tpl=tpl.replace('<!--TOUR-->',`<dialog class="tour" id="tour" aria-labelledby="tour-title"><form method="dialog" class="tour-close"><button aria-label="Close tour">&#10005;</button></form><div class="tour-host">${avatarHTML('presenter',{cls:'tour-av',tag:false,sizes:'160px'})}</div><div class="tour-body"><div class="tour-kicker"></div><h3 id="tour-title"></h3><div class="tour-flow" aria-label="Project flow"></div><p class="tour-line" aria-live="polite"></p><div class="tour-tech"></div><div class="tour-links"></div><p class="tour-note">Illustrative workflow · summarised from the project’s repository description</p></div></dialog>`);
if(/<!--(AV|WORLD)/.test(tpl)) throw new Error('unreplaced build placeholder');
fs.writeFileSync(path.join(SITE,'index.html'),tpl);
console.log(`Built index.html — ${FLAG.length} flagships, ${P.length} project cards, ${tpl.length} bytes.`);
