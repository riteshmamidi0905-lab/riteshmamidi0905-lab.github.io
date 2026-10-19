/* Unpublished, silent portrait edit. Existing artwork and actual page captures only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const {serveLocal,base}=require('./local-preview');
const ix=process.argv.indexOf('--out');
const out=path.resolve(ix<0?'work/film-final':process.argv[ix+1]);
const workRoot=path.resolve('work');
if(out!==workRoot&&!out.startsWith(workRoot+path.sep))throw Error('Render unreleased media under the repository ignored work/ directory');
const esc=s=>s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shots=[
 {id:'question',seconds:6,kicker:'NASHA AI / RITESH MAMIDI',title:'Eight units short.\nWho decides next?',caption:'A synthetic inventory question.\nEvery protected action needs a boundary.',kind:'BROWSER WHAT-IF · SYNTHETIC DATA',selector:'.twin-inspector'},
 {id:'vectra',seconds:5,kicker:'01 / INVENTORY INTELLIGENCE',title:'VECTRA spots\nthe shortfall.',caption:'SENTINEL is a deterministic service.\nNo autonomous purchasing.',kind:'EXISTING SPECIALIST ART · ILLUSTRATIVE',art:'vectra'},
 {id:'quantix',seconds:5,kicker:'02 / FINANCIAL ANALYTICS',title:'QUANTIX exposes\nthe assumptions.',caption:'Scenario arithmetic, not a forecast.\nRevenue 96 · Cost 64 · Margin 32.',kind:'SYNTHETIC PYTHON FIXTURE · RECORDED',art:'quantix'},
 {id:'nexora',seconds:5,kicker:'03 / PROCUREMENT INTELLIGENCE',title:'NEXORA compares.\nA person reviews.',caption:'A synthetic supplier quote of 22.\nA recommendation; no order placed.',kind:'SYNTHETIC PYTHON FIXTURE · RECORDED',art:'nexora'},
 {id:'execution',seconds:8,kicker:'04 / INSPECTABLE ENGINEERING',title:'Real service code.\nSynthetic inputs.',caption:'Five inventory workflow handoffs.\nRecorded output; no live AI footage.',kind:'PINNED PYTHON OUTPUT · NOT LIVE',selector:'#service-results'},
 {id:'gateway',seconds:8,kicker:'05 / THE WEIR · INDEPENDENT GATEWAY',title:'Approval is a state.\nExecution is another.',caption:'DENY → APPROVE → ALLOW.\nOne in-memory test note; zero external actions.',kind:'RECORDED SYNTHETIC GATEWAY TEST',selector:'#service-evidence details'},
 {id:'contracts',seconds:5,kicker:'06 / CONTRACTS, NOT MODEL ACCURACY',title:'Twelve services.\nTwenty-two handoffs.',caption:'Three reproducible synthetic workflows.\nHistorical CI #132: 368 passed, 1 skipped.',kind:'SCOPED INTEGRATION + HISTORICAL CI',selector:'#recruiter-mode .grid'},
 {id:'invitation',seconds:6,kicker:'RITESH MAMIDI / INDEPENDENT PROJECT',title:'Inspect the source.\nFollow the evidence.',caption:'Open the preview and technical case study.\nExplore AI engineering, evaluation and governance.',kind:'REVIEW DRAFT · NO PRODUCTION DEPLOYMENT',selector:'#recruiter-mode .competency-map'}
];
const clock=n=>`00:${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}.000`;
function ff(args){const r=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
 const context=await browser.newContext({viewport:{width:1100,height:1000},reducedMotion:'reduce',deviceScaleFactor:1});
 const page=await context.newPage();await serveLocal(page);
 await page.goto(base.replace(/\/?$/,'/')+'nasha-ai-preview.html',{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('img').forEach(i=>i.loading='eager');});
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
 await page.selectOption('#twin-scenario','shortage');await page.click('[data-zone="stock"]');
 await page.selectOption('#service-workflow','inventory_procurement');await page.locator('#service-evidence summary').click();
 const film=await context.newPage();await film.setViewportSize({width:1080,height:1350});
 for(const [i,s] of shots.entries()){
  let bytes;
  if(s.art)bytes=fs.readFileSync(`assets/nasha/specialists/${s.art}.svg`);
  else bytes=await page.locator(s.selector).screenshot({path:path.join(out,`capture-${s.id}.png`)});
  const src=`data:image/${s.art?'svg+xml':'png'};base64,${bytes.toString('base64')}`;
  await film.setContent(`<html lang="en"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1080px;height:1350px;background:radial-gradient(ellipse at 95% 25%,#153d56,transparent 65%),#080d19;color:#eaf5ff;font-family:system-ui,sans-serif;padding:58px 54px 48px;display:flex;flex-direction:column}
  .kicker{font-size:27px;letter-spacing:3px;color:#a4deeb;margin:0 0 20px}h1{font-size:76px;line-height:1.06;letter-spacing:-3px;margin:0 0 28px;white-space:pre-line;height:172px}
  main{height:560px;border:1px solid #4b6582;border-radius:20px;background:#091425;overflow:hidden;display:flex;align-items:center;justify-content:center}img{display:block;width:100%;height:100%;object-fit:contain}.art{padding:20px}
  .kind{font-size:29px;color:#f0d6a7;letter-spacing:1px;margin:22px 0 8px}.caption{font-size:42px;line-height:1.26;white-space:pre-line;margin:0;letter-spacing:-.7px}footer{margin-top:auto;border-top:1px solid #4b6582;padding-top:16px;font-size:36px;line-height:1.3;color:#d0e0ed}.progress{height:5px;background:#263e54;margin-top:15px}.progress span{display:block;height:100%;background:#92e2df;width:${(i+1)/shots.length*100}%}.count{float:right;color:#92e2df}
  </style></head><body><p class="kicker">${esc(s.kicker)}</p><h1>${esc(s.title)}</h1><main class="${s.art?'art':''}"><img alt="${s.art?'Existing specialist instrument artwork':'Actual development interface capture'}" src="${src}"></main><p class="kind">${esc(s.kind)}</p><p class="caption">${esc(s.caption)}</p><footer>SYNTHETIC DATA · SILENT REVIEW CUT<span class="count">${i+1}/8</span><div class="progress"><span></span></div></footer></body></html>`);
  await film.waitForFunction(()=>[...document.images].every(i=>i.complete));
  const overflow=await film.evaluate(()=>document.body.scrollHeight>1350||document.body.scrollWidth>1080);if(overflow)throw Error('Frame overflow: '+s.id);
  const still=path.join(out,`frame-${i}.png`);await film.screenshot({path:still});
  if(!process.argv.includes('--stills'))ff(['-loop','1','-i',still,'-vf',`fps=24,fade=t=in:st=0:d=0.2,fade=t=out:st=${s.seconds-.2}:d=0.2`,'-t',String(s.seconds),'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-an',path.join(out,`clip-${i}.mp4`)]);
 }
 if(!process.argv.includes('--stills')){
  fs.writeFileSync(path.join(out,'clips.txt'),shots.map((_,i)=>`file 'clip-${i}.mp4'`).join('\n'));
  ff(['-f','concat','-safe','0','-i',path.join(out,'clips.txt'),'-c','copy','-movflags','+faststart',path.join(out,'nasha-launch-final.mp4')]);
 }
 let t=0;fs.writeFileSync(path.join(out,'nasha-launch-final.vtt'),'WEBVTT\n\n'+shots.map(s=>{const start=t;t+=s.seconds;return `${clock(start)} --> ${clock(t)}\n${s.title.replace(/\n/g,' ')}\n${s.caption}\n`}).join('\n'));
 fs.copyFileSync(path.join(out,'frame-0.png'),path.join(out,'launch-poster.png'));
 // Social stills preserve the exact three existing character assets.
 await film.setViewportSize({width:1200,height:627});
 const arts=['vectra','quantix','nexora'].map(n=>`<img width="310" height="168" alt="${n}" src="data:image/svg+xml;base64,${fs.readFileSync(`assets/nasha/specialists/${n}.svg`).toString('base64')}">`).join('');
 await film.setContent(`<html lang="en"><body style="margin:0;padding:40px 55px;background:#080d19;color:#eaf5ff;font:24px system-ui"><p style="color:#a4deeb;margin:0">RITESH MAMIDI / INDEPENDENT ENGINEERING</p><h1 style="font-size:68px;margin:20px 0">NASHA AI. Evidence before action.</h1><p style="font-size:29px">12 deterministic services · 3 synthetic workflows · A separate gateway</p><div style="display:flex;gap:30px;margin:25px 0">${arts}</div><p style="font-size:26px;color:#f0d6a7">SYNTHETIC DATA · RECORDED TESTS + BROWSER ILLUSTRATIONS</p><p style="color:#a4deeb">UNPUBLISHED REVIEW DRAFT · NOT A LIVE AI DEMO</p></body></html>`);
 await film.screenshot({path:path.join(out,'linkedin-cover.png')});
 fs.writeFileSync(path.join(out,'media-manifest.json'),JSON.stringify({status:'UNPUBLISHED REVIEW DRAFT',durationSeconds:t,width:1080,height:1350,fps:24,audio:false,sourcePage:'nasha-ai-preview.html',sourceCommit:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),generationCreditsConsumed:0,shots},null,2)+'\n');
 console.log('Rendered unpublished portrait assets:',out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
