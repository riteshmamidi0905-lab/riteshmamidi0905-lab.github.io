'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process'),pw=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
(async()=>{
 const engine=process.env.BROWSER||'chromium',out=path.resolve('work/proof-browser-'+engine+'-'+Date.now());
 execFileSync('python3',['scripts/build-cinematic-proof.py','--out',out],{stdio:'pipe'});
 const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.glb':'model/gltf-binary','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.txt':'text/plain'};
 const server=http.createServer((req,res)=>{
  try{
   const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(out,'.'+rel+(rel.endsWith('/')?'index.html':''));
   if(!target.startsWith(out+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('Not found');return;}
   res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));
  }catch(_){res.writeHead(404);res.end('Not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,launch={headless:true};
 if(engine==='chromium'){if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;launch.args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];}
 const browser=await pw[engine].launch(launch),report={engine,physicalSafari:false,source:'isolated proof artifact',widths:[],axeScans:0,errors:[],threeD:[]};
 fs.mkdirSync('work/proof-renders',{recursive:true});
 const snapshot=page=>page.evaluate(()=>JSON.stringify(NashaProofState.state));
 const action=async(page,id,keyboard=false)=>{if(keyboard){await page.locator(id).focus();await page.keyboard.press('Enter');}else await page.locator(id).click();};
 async function enter(page){await page.locator('#enter').click();await page.waitForFunction(()=>window.NashaProof3D?.ready||document.querySelector('#load-status').textContent.includes('3D unavailable'),{},{timeout:90000});return page.evaluate(()=>!!window.NashaProof3D?.ready);}
 try{
  for(const denied of ['/scripts/cinematic-proof/scene.glb','/.git/config','/baseline/scripts/cinematic-proof/scene.glb','/baseline/scripts/start-safari-preview.py'])assert.equal((await fetch(base+denied)).status,404);
  for(const width of [1440,768,390,320]){
   console.log('Proof width '+width);
   const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:width===1440?'no-preference':'reduce'}),page=await context.newPage(),requests=[];
   page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>requests.push(r.url()));
   await page.goto(base);await page.waitForFunction(()=>window.NashaProofControls);
   assert.ok(!requests.some(u=>u.endsWith('/scene.glb')||u.endsWith('/graphics.js')),'3D assets wait for explicit intent');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow at '+width);
   await page.locator('#role').selectOption('observer');const untouched=await snapshot(page);
   assert.equal(await page.locator('#step').isDisabled(),true);await page.evaluate(()=>NashaProofControls.step());assert.equal(await snapshot(page),untouched);
   await page.locator('#role').selectOption('operator');
   if(width===1440||width===390){
    if(await enter(page)){
     for(const name of ['atrium','workroom','brewery','courtyard']){
      await page.locator('[data-view='+name+']').click();await page.waitForFunction(name=>NashaProofVisual?.view===name,name);
      await page.locator('#viewport').screenshot({path:`work/proof-renders/${engine}-${name}-${width}.png`});
     }
     if(width===1440){
      for(let i=0;i<4;i++)await page.locator('#step').click();await page.locator('#motion').click();await page.locator('#event-motion').click();
     }else{await page.locator('#motion').click();assert.equal(await page.locator('#motion').getAttribute('aria-pressed'),'false');}
     const held=await snapshot(page);await page.locator('#show-plan').click();assert.equal(await page.locator('#scene').isVisible(),false);
     assert.equal(await page.locator('#motion').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#event-motion').isDisabled(),true);
     assert.ok(await page.locator('#enter').isEnabled());await page.locator('#enter').click();assert.ok(await page.locator('#scene').isVisible());assert.equal(await snapshot(page),held);
     report.twoDReturn='PASS';assert.equal(requests.filter(u=>u.endsWith('/scene.glb')).length,1);const visibleAxe=await new AxeBuilder({page}).analyze();assert.deepEqual(visibleAxe.violations.map(v=>v.id),[]);report.axeScans++;await page.locator('#show-plan').click();await page.waitForTimeout(100);const noRender=await page.evaluate(()=>NashaProofRender.frames);await page.locator('#reset').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>NashaProofRender.frames),noRender);report.twoDNoHiddenRender='PASS';
     assert.ok(await page.evaluate(()=>NashaProofRender.calls<200));assert.ok(await page.evaluate(()=>NashaProofRender.triangles<200000));
     report.threeD.push({width,result:'RENDERED',...await page.evaluate(()=>NashaProofRender)});
    }else report.threeD.push({width,result:'UNAVAILABLE; 2D fallback verified'});
   }
   for(let i=0;i<9;i++)await page.locator('#step').click();
   assert.ok(await page.locator('#review').isVisible());assert.match(await page.locator('#review-reason').textContent(),/Only Reviewer/);
   assert.ok(await page.locator('#approve').isDisabled());assert.ok(await page.locator('#play').isDisabled());
   const held=await snapshot(page);await action(page,'#reviewer',width===320);assert.equal(await snapshot(page),held);
   await action(page,'#approve',width===320);assert.equal(await page.locator('#mango').textContent(),'2');await action(page,'#resume',width===320);
   await page.waitForFunction(()=>NashaProofState.state.events.length===18,{},{timeout:45000});
   assert.equal(await page.locator('#mango').textContent(),'26');assert.equal(await page.locator('#beer').textContent(),'27');assert.equal(await page.locator('#verified').textContent(),'verified');
   const final=await snapshot(page);await page.locator('#replay').evaluate(el=>{el.value='9';el.dispatchEvent(new Event('input',{bubbles:true}));});
   assert.ok(await page.locator('#approve').isDisabled());assert.ok(await page.locator('#step').isDisabled());assert.equal(await snapshot(page),final);await page.locator('#latest').click();
   const axe=await new AxeBuilder({page}).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);report.axeScans++;
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow at '+width);
   await page.locator('#reset').click();for(let i=0;i<9;i++)await page.locator('#step').click();await action(page,'#reviewer',width===320);await action(page,'#reject',width===320);
   assert.equal(await page.locator('#request').textContent(),'rejected');assert.equal(await page.locator('#mango').textContent(),'2');assert.ok(await page.locator('#step').isDisabled());
   assert.ok(await page.evaluate(()=>NashaProofState.modelVerified&&NashaProofState.ledgerVerified));assert.ok(requests.every(u=>u.startsWith(base)),'proof made an external request');
   report.widths.push({width,approvalRecovery:'PASS',roleSwitchPreservesState:'PASS',rejection:'PASS',replay:'PASS'});await context.close();
  }
  // A separate clock-controlled context verifies poses, without contaminating real UI/timer tests.
  const motionContext=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'no-preference'}),mp=await motionContext.newPage();
  mp.on('pageerror',e=>report.errors.push(e.message));await mp.clock.install();await mp.goto(base);await mp.waitForFunction(()=>window.NashaProofControls);
  if(await enter(mp)){
   console.log('Controlled motion poses');await mp.locator('[data-view=workroom]').click();await mp.waitForFunction(()=>NashaProofVisual.view==='workroom');
   await mp.clock.pauseAt(new Date(await mp.evaluate(()=>Date.now()+1000)));
   await mp.locator('#motion').evaluate(el=>el.click());for(let i=0;i<4;i++)await mp.locator('#step').evaluate(el=>el.click());await mp.locator('#event-motion').evaluate(el=>el.click());
   await mp.clock.fastForward(300);await mp.locator('#motion').evaluate(el=>el.click());await mp.clock.runFor(34);
   const a=await mp.evaluate(()=>({state:JSON.stringify(NashaProofState.state),arm:NashaProofVisual.armAngle}));await mp.clock.resume();
   await mp.locator('#viewport').screenshot({path:'work/proof-renders/working-agent-frame-a.png'});
   await mp.clock.pauseAt(new Date(await mp.evaluate(()=>Date.now()+1000)));await mp.locator('#motion').evaluate(el=>el.click());await mp.clock.fastForward(2900);
   await mp.locator('#motion').evaluate(el=>el.click());await mp.clock.runFor(34);
   const z=await mp.evaluate(()=>({state:JSON.stringify(NashaProofState.state),arm:NashaProofVisual.armAngle}));await mp.clock.resume();
   assert.equal(a.state,z.state);assert.notDeepEqual(a.arm,z.arm);await mp.locator('#viewport').screenshot({path:'work/proof-renders/working-agent-frame-b.png'});
   assert.notDeepEqual(fs.readFileSync('work/proof-renders/working-agent-frame-a.png'),fs.readFileSync('work/proof-renders/working-agent-frame-b.png'));
   report.articulatedMotionWithoutStateMutation='PASS';
  }else report.articulatedMotionWithoutStateMutation='UNAVAILABLE in this engine; fallback verified';
  report.motionEvidence='Controlled browser clock in a separate context; no smoothness or physical-device certification';await motionContext.close();
  const failContext=await browser.newContext(),fp=await failContext.newPage();await fp.route('**/graphics.js',r=>r.abort());await fp.goto(base);await fp.waitForFunction(()=>window.NashaProofControls);
  await fp.locator('#enter').click();await fp.waitForFunction(()=>document.querySelector('#load-status').textContent.includes('3D unavailable'));await fp.locator('#step').click();assert.equal(await fp.evaluate(()=>NashaProofState.state.events.length),1);
  await failContext.close();report.loadFailureFallback='PASS';report.keyboardReviewFlow='Enter activation at 320px; physical Safari and VoiceOver pending';
  assert.deepEqual(report.errors,[]);fs.writeFileSync('work/proof-renders/results-'+engine+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
