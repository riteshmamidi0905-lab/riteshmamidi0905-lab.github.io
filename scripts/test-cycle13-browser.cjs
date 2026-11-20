'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{AxeBuilder}=require('@axe-core/playwright');
const base=process.argv[2]||'http://127.0.0.1:8000/',out=process.env.CYCLE13_EVIDENCE;
const report={views:[],accessibility:[],keyboard:[],errors:[]};
const save=(file,data)=>{if(out)fs.writeFileSync(path.join(out,'checks',file),JSON.stringify(data,null,2)+'\n');};
async function exercise(browser,width){
 const height=width===390?844:900,ctx=await browser.newContext({viewport:{width,height},hasTouch:width===390,reducedMotion:'no-preference'});
 const p=await ctx.newPage();p.setDefaultTimeout(12000);
 const cdp=await ctx.newCDPSession(p),ax=[];
 p.on('pageerror',e=>report.errors.push(e.message));
 p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))report.errors.push(r.status()+' '+new URL(r.url()).pathname);});
 const go=async name=>{await p.goto(base+name);await p.evaluate(()=>document.fonts.ready);};
 const snap=async(name,anchor)=>{
   if(anchor)await p.locator(anchor).first().evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
   else await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await p.waitForTimeout(120);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+name+' at '+width);
   report.views.push({width,height,name});
   if(out)await p.screenshot({path:path.join(out,'screenshots',name+'-'+width+'.png')});
 };
 const tree=async(name)=>{
   if(out){const {nodes}=await cdp.send('Accessibility.getFullAXTree');ax.push({state:name,nodes:nodes.filter(n=>!n.ignored&&n.name?.value).map(n=>[n.role.value,n.name.value])});}
   const result=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   const violations=result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));report.accessibility.push({width,state:name,violations});
   console.log(width,name,JSON.stringify(violations));save('feature-browser.json',report);
 };
 const activate=async(selector)=>{
   const el=p.locator(selector).first();await el.focus();await p.keyboard.press('Enter');
   report.keyboard.push({width,action:'Enter',target:selector});};
 const ready=()=>p.waitForFunction(()=>document.documentElement.classList.contains('replay-ready'));
 try{
   await go('pavilion/hq.html');await ready();await p.waitForFunction(()=>document.querySelector('#establish')?.hidden!==false);
   assert.equal(await p.locator('#play').textContent(),'Pause shift');assert.equal(await p.locator('#speed').inputValue(),'1');assert.equal(await p.evaluate(()=>window.scrollY),0);
   assert.equal(Number(await p.locator('.drawing').getAttribute('data-zoom')),.9);
   await snap('hq-overview','.iso-heading');
   const lens=p.locator('.map-lens'),box=await lens.boundingBox();await p.mouse.move(box.x+box.width*.55,Math.min(height-30,box.y+box.height*.5));
   const y=await p.evaluate(()=>scrollY);await p.mouse.wheel(0,120);await p.waitForTimeout(240);assert.ok(await p.evaluate(()=>scrollY)>y,'native scrolling over floor');
   if(width===390){
     const bbox=await lens.boundingBox(),x=Math.round(bbox.x+bbox.width*.5),y=Math.min(height-20,Math.round(bbox.y+bbox.height*.7));
     const before=await p.evaluate(()=>scrollY);
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
     for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-15*i}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(240);assert.ok(await p.evaluate(()=>scrollY)>before,'native touch scroll');
   }
   await lens.focus();const center=await p.locator('.drawing').getAttribute('data-center');
   await p.keyboard.press('ArrowRight');assert.notEqual(await p.locator('.drawing').getAttribute('data-center'),center);
   await p.keyboard.press('+');assert.ok(Number(await p.locator('.drawing').getAttribute('data-zoom'))>.9);await p.keyboard.press('Escape');
   assert.equal(Number(await p.locator('.drawing').getAttribute('data-zoom')),.9);await activate('#mini-jump');
   if(width===1440){
     const plaque=p.locator('[data-room="VECTRA"] rect').first();await plaque.dblclick();
     assert.equal(await p.locator('#camera').inputValue(),'who-VECTRA');assert.equal(await p.locator('#agent-inspect').isVisible(),false);
     await activate('#fit-floor');
   }
   if(!await p.locator('.directory').evaluate(n=>n.open))await activate('.directory summary');await activate('.directory [data-agent="VECTRA"]');assert.ok(await p.locator('#agent-inspect').isVisible());await snap('agent-inspector',width===390?'#agent-inspect':'.iso-heading');
   await activate('#follow-inspected');assert.equal(await p.locator('#camera').inputValue(),'who-VECTRA');await activate('#fit-floor');
   await tree('HQ free camera and activity list');
   await p.keyboard.press('/');assert.equal(await p.evaluate(()=>document.activeElement.id),'floor-question');
   await p.locator('#floor-question').fill('why did cash drop on day 9?');await p.keyboard.press('Enter');assert.match(await p.locator('.answer').textContent(),/rose|increase/i);
   await activate('.flight .next');assert.match(await p.locator('.flight output').textContent(),/Day 9/);await snap('ask-floor','#ask-floor');await tree('Ask the floor and source flight');
   await p.keyboard.press('Escape');await activate('#branch-here');await p.waitForURL('**/branch.html#**');
   await p.waitForFunction(()=>document.querySelectorAll('iframe').length===2&&[...document.querySelectorAll('iframe')].every(f=>f.contentDocument?.documentElement.classList.contains('replay-ready')));
   await activate('#next-day');await activate('#next-day');await snap('branch-comparison','.twin');
   const original=await p.locator('#difference-strip').innerText(),shared=p.url();
   await p.reload();await p.waitForFunction(()=>document.querySelector('#branch-position')?.textContent);assert.equal(await p.locator('#difference-strip').innerText(),original);assert.equal(p.url(),shared);
   await p.locator('#levers select').selectOption('purchase');await activate('#levers button');await activate('#next-review');
   assert.ok(await p.locator('#decision-list button[data-choice=rejected]').count()>0);await snap('founder-queue','#founder');await activate('#decision-list button[data-choice=rejected]');
   await tree('Branch comparison and founder queue');
   await go('pavilion/district.html');await p.locator('[data-door=stadium] small').waitFor();await p.locator('#district-day').selectOption('3');
   assert.ok(await p.locator('[data-lot=stadium]').evaluate(e=>e.hasAttribute('data-game')));
   await snap('district','.atlas-frame');await tree('District business directory');
   await activate('[data-door=stadium]');await p.waitForURL('**/stadium.html**');await p.locator('#vendor-results tbody tr').first().waitFor();
   await p.locator('#venue-phase').selectOption('2');assert.equal(await p.locator('#vendor-results tbody tr').count(),6);
   await snap('stadium-game','#venue-event');await activate('#venue-close a');assert.ok(await p.locator('#venue-record').isVisible());
   await snap('stadium-settlement','#venue-record');await activate('#hide-record');
   await p.locator('#venue-stress').selectOption('rain');assert.match(await p.locator('#venue-event').textContent(),/0 attending/);
   await activate('#print-report summary');assert.equal(await p.locator('#venue-report .print-section').count(),7);await tree('Stadium settlement and per-vendor report');
   await go('pavilion/simulator.html');await p.locator('#pitch').fill('A local stadium');await p.locator('#pitch').press('Tab');await activate('#idea-form button');
   await p.waitForURL('**/stadium.html#**');assert.ok(await p.locator('#mix-question').isVisible());await activate('#venue-mix button');assert.ok(await p.locator('#venue-operation').isVisible());
   await go('pavilion/district.html');await activate('[data-lot=brewery]');await p.waitForURL('**/brewing/index.html');
   await snap('brewing-home');await tree('Brewing home and original concept link');
   for(const slug of ['menu','brewhouse','space','story','visit']){
     await activate('#navigation a[href="'+slug+'.html"]');await p.waitForURL('**/brewing/'+slug+'.html');await snap('brewing-'+slug);assert.equal(await p.locator('.concept-note').innerText(),'Concept in development — not yet open');
   }
   await activate('footer a[href*="template=brewery"]');await p.waitForSelector('#f-type');
   assert.equal(await p.locator('#f-type').inputValue(),'brewery');assert.equal(await p.locator('#f-city').inputValue(),'Austin');
   await p.emulateMedia({reducedMotion:'reduce'});await go('pavilion/hq.html');await ready();assert.equal(await p.locator('#play').textContent(),'Play shift');
   save('ax-'+width+'.json',ax);
 }finally{await ctx.close();}
}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});try{
 for(const w of [1440,390])await exercise(b,w);
 save('feature-browser.json',report);
 assert.deepEqual(report.errors,[]);assert.equal(report.accessibility.flatMap(a=>a.violations).length,0,'axe findings');
 console.log(report.views.length+' captured states, '+report.keyboard.length+' keyboard actions, '+report.accessibility.length+' axe scans passed');
}finally{await b.close();}})().catch(e=>{save('feature-browser.json',report);console.error(e);process.exitCode=1;});
