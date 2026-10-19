/* Local, silent 48-second review cut from the actual page. No generation credits. */
'use strict';
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawnSync} = require('node:child_process');
const {serveLocal,base} = require('./local-preview');
const ix = process.argv.indexOf('--out');
const out = path.resolve(ix>=0 ? process.argv[ix+1] : 'deliverables/nasha-ecosystem');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const shots = [
 {id:'hero',target:'header',title:'NASHA AI / Engineering with visible boundaries',caption:'Independent project by Ritesh Mamidi. Synthetic hospitality concept.'},
 {id:'specialists',target:'#team',title:'Twelve specialists. Clear contracts.',caption:'Deterministic callable services, not twelve independent LLMs.'},
 {id:'twin',target:'#twin',title:'Explore a connected courtyard.',caption:'ILLUSTRATIVE Digital Twin. Invented stock, demand and financial inputs.'},
 {id:'workflow',target:'#workflows',title:'Follow the handoff.',caption:'ILLUSTRATIVE role-sequence replay, not a captured execution trace.'},
 {id:'weir',target:'#weir-lab',title:'A proposal is not permission.',caption:'ILLUSTRATIVE approval and audit. THE WEIR is a separate gateway.'},
 {id:'evidence',target:'#evidence',title:'Inspect the evidence. Understand the limits.',caption:'Backend CI #132 at 2fc1000: 368 passed, 1 skipped; 15/15 workflow checks.'}
];
const stamp = n => '00:00:'+String(n).padStart(2,'0')+'.000';
(async()=>{
 fs.mkdirSync(out,{recursive:true}); const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nasha-film-'));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(); await serveLocal(page); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base.replace(/\/?$/,'/')+'nasha-ai-preview.html',{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('img').forEach(i=>i.loading='eager');});
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
 for(const [i,shot] of shots.entries()){
  if(shot.id==='twin'){await page.selectOption('#twin-scenario','shortage'); await page.click('[data-zone="stock"]');}
  if(shot.id==='workflow'){await page.click('[data-workflow="inventory"]'); await page.click('#replay-next');}
  if(shot.id==='weir'){await page.selectOption('#weir-request','draft');await page.click('#weir-evaluate');await page.click('#weir-approve');}
  await page.evaluate(selector=>{const r=document.querySelector(selector).getBoundingClientRect();scrollTo(0,r.top+scrollY);},shot.target);
  const capture=path.join(out,`capture-${shot.id}.png`); await page.screenshot({path:capture});
  const image=fs.readFileSync(capture).toString('base64');
  const frame=await context.newPage();
  await frame.setViewportSize({width:1600,height:900});
  await frame.setContent(`<html lang="en"><head><style>*{box-sizing:border-box}body{margin:0;background:#080d19;color:#eaf5ff;font:18px system-ui}header{height:130px;padding:22px 52px;border-bottom:1px solid #3d6485}small{color:#88dbea;letter-spacing:3px;font-size:12px}h1{font-size:30px;margin:12px 0}main{height:610px;padding:18px 52px;overflow:hidden}img{width:100%;height:100%;object-fit:cover;object-position:top;border:1px solid #47637f;border-radius:10px}footer{height:160px;padding:18px 52px;border-top:1px solid #3d6485}p{font-size:21px;margin:10px 0;color:#d2e1ef}.meta{font-size:13px;color:#96d5df}</style></head><body><header><small>NASHA AI / LOCAL REVIEW CUT / ${String(i+1).padStart(2,'0')}—06</small><h1></h1></header><main><img alt="Development page capture" src="data:image/png;base64,${image}"></main><footer><p></p><div class="meta">SYNTHETIC DATA · BROWSER ILLUSTRATIONS · NOT A PRODUCTION DEPLOYMENT</div></footer></body></html>`);
  await frame.locator('h1').evaluate((e,v)=>e.textContent=v,shot.title); await frame.locator('footer p').evaluate((e,v)=>e.textContent=v,shot.caption);
  await frame.screenshot({path:path.join(temp,`shot-${i}.png`)}); await frame.close();
 }
 const social=await context.newPage(); await social.setViewportSize({width:1200,height:627});
 await social.setContent('<html lang="en"><body style="margin:0;padding:58px;background:radial-gradient(ellipse at 90% 20%,#153d56,transparent 60%),#080d19;color:#eaf5ff;font:20px system-ui"><p style="color:#91dfed;letter-spacing:5px">INDEPENDENT ENGINEERING / RITESH MAMIDI</p><h1 style="font-size:92px;line-height:1;margin:40px 0">NASHA AI.</h1><p style="font-size:32px;max-width:900px">Twelve specialist services.<br>A separate security gateway.<br>Evidence you can inspect.</p><p style="color:#d4c098;font-size:17px;margin-top:40px">SYNTHETIC DATA · ILLUSTRATIVE BROWSER EXPERIENCE · REVIEW DRAFT</p></body></html>');
 await social.screenshot({path:path.join(out,'linkedin-cover.png')}); await social.close(); await browser.close();
 if(errors.length)throw Error(errors.join('\n'));
 if(!process.argv.includes('--stills')){
  for(let i=0;i<shots.length;i++){
   const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-loop','1','-i',path.join(temp,`shot-${i}.png`),'-vf',"scale=1280:720,zoompan=z='min(zoom+0.00012,1.025)':d=192:s=1280x720:fps=24",'-t','8','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-an',path.join(temp,`clip-${i}.mp4`)],{encoding:'utf8'});
   if(r.status!==0)throw Error(r.stderr||'FFmpeg render failed');
  }
  const concat=path.join(temp,'clips.txt');fs.writeFileSync(concat,shots.map((s,i)=>`file '${path.join(temp,`clip-${i}.mp4`)}'`).join('\n'));
  const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',path.join(out,'nasha-launch-review.mp4')],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);
 }
 fs.copyFileSync(path.join(temp,'shot-0.png'),path.join(out,'launch-poster.png'));
 fs.writeFileSync(path.join(out,'nasha-launch-review.vtt'),'WEBVTT\n\n'+shots.map((s,i)=>`${stamp(i*8)} --> ${stamp((i+1)*8)}\n${s.title}\n${s.caption}\n`).join('\n'));
 fs.writeFileSync(path.join(out,'media-manifest.json'),JSON.stringify({status:'IMPLEMENTED',type:'Local capture-based silent review cut',durationSeconds:48,sourcePage:'nasha-ai-preview.html',externalActions:0,generationCreditsConsumed:0,shots},null,2)+'\n');
 fs.rmSync(temp,{recursive:true}); console.log('Rendered NASHA review assets:',out);
})().catch(e=>{console.error(e);process.exit(1)});
