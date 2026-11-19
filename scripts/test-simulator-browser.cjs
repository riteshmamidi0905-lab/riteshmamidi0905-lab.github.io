// Keyboard drives the complete flow. When SIM_EVIDENCE is set, save the actual browser and print output.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const origin=process.env.SIM_ORIGIN||'http://127.0.0.1:8000',out=process.env.SIM_EVIDENCE;
function save(name,body){if(out)fs.writeFileSync(path.join(out,name),body);}
async function visitor(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),cdp=await context.newCDPSession(page);
 const label=width+'x'+height, errors=[], requests=[],results=[],transcript=[],steps=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 const focus=()=>page.locator(':focus').evaluate(el=>[el.tagName,el.id||'',el.getAttribute('aria-label')||el.innerText||el.value||''].join(' ').slice(0,120));
 async function tabTo(selector){
   for(let i=0;i<90;i++){
     if(await page.evaluate(s=>document.activeElement?.matches(s),selector)){steps.push('Tab → '+await focus());return;}
     await page.keyboard.press('Tab');
   }
   throw Error('Keyboard could not reach '+selector);
 }
 async function snapshot(name,ax=true){
   await page.evaluate(()=>document.fonts.ready);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+name);
   if(out)await page.screenshot({path:path.join(out,'screens',label+'-'+name+'.png'),animations:'disabled'});
   if(!ax)return;
   const tree=(await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored&&n.role?.value!=='InlineTextBox');
   transcript.push('\n## '+name+'\n\n'+tree.map(n=>[n.role?.value,n.name?.value].filter(Boolean).join(' · ')).join('\n'));
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
   results.push({stage:name,rulesPassed:result.passes.length,violations:result.violations.map(v=>({id:v.id,elements:v.nodes.map(n=>n.target)}))});
 }
 await page.goto(origin+'/pavilion/index.html');await page.getByRole('link',{name:'Simulate your idea'}).click();
 await page.waitForSelector('#pitch');await tabTo('#example');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('#pitch').value.includes('Iris Studio'));
 await page.evaluate(()=>window.scrollTo(0,0));await snapshot('idea');
 // Runtime must remain usable without any network after its same-origin static modules have loaded.
 await context.setOffline(true);const startRequests=requests.length;
 await tabTo('#idea-form button');await page.keyboard.press('Enter');
 await page.getByRole('heading',{name:'Here’s what I understood'}).waitFor();assert.equal(await page.locator('#f-type').inputValue(),'salon');
 await tabTo('#f-city');await page.keyboard.press('Control+a');await page.keyboard.type('Austin');assert.equal(await page.locator('#badge-city').textContent(),'user-set');
 await page.evaluate(()=>window.scrollTo(0,0));await snapshot('confirmation');
 await tabTo('#confirm button:not([type=button])');await page.keyboard.press('Enter');await page.waitForSelector('#stress');
 await snapshot('projection');const runHash=new URL(page.url()).hash;
 await tabTo('#stress');await page.keyboard.press('Enter');await page.locator('#impact').waitFor();
 for(const key of ['slow','delay','war','shortage','rent','viral']){
   await tabTo('[data-stress="'+key+'"]');await page.keyboard.press('Enter');assert.equal(await page.locator('[data-stress="'+key+'"]').getAttribute('aria-pressed'),'true');
   await page.evaluate(()=>window.scrollTo(0,0));await snapshot('stress-'+key,key==='slow');
 }
 await tabTo('#combined');await page.keyboard.press('Enter');await snapshot('stress-combined',false);
 await tabTo('#report');await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Your report'}).waitFor();
 assert.equal(await page.locator('.report-sheet').count(),7);await snapshot('report');
 if(out){await page.emulateMedia({media:'print'});await page.pdf({path:path.join(out,'print','launch-readiness-'+label+'.pdf'),preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});}
 const offlineRequests=requests.slice(startRequests);assert.deepEqual(offlineRequests,[],'Expected offline flow to make zero requests');
 await context.setOffline(false);await tabTo('#back-results');await page.keyboard.press('Enter');
 const hq=page.getByRole('link',{name:'Replay this business in HQ'});await tabTo('a[href^="hq.html#sim="]');await page.keyboard.press('Enter');
 await page.waitForSelector('.replay-ready');assert.match(await page.locator('.iso-heading+p').innerText(),/Iris Studio.*salon/i);
 await page.selectOption('#speed','4');await page.locator('#play').click();const beat=await page.locator('#seek').inputValue();
 await page.waitForFunction(previous=>document.querySelector('#seek').value!==previous,beat);await page.locator('#play').click();await page.evaluate(()=>scrollTo(0,0));
 await snapshot('hq-salon',false);
 const href=await page.locator('#task > a[href]').getAttribute('href');assert.ok(href.includes('#sim='));
 await page.locator('#task > a[href]').click();await page.locator('main .paper').first().waitFor();assert.match(await page.locator('main').innerText(),/Event provenance/);
 assert.ok(requests.every(u=>!u.toLowerCase().includes('iris')&&!u.includes('scalp')&&!u.includes('business=')));
 await page.goto(origin+'/pavilion/simulator.html'+runHash);await page.waitForSelector('#stress');
 await page.goto(origin+'/pavilion/overview.html');await page.getByRole('link',{name:'Simulate your idea'}).waitFor();
 save('ax/'+label+'.md','# Chromium keyboard and accessibility-tree walkthrough\n\n'+steps.join('\n')+'\n'+transcript.join('\n')+'\n');
 save('ax/'+label+'.json',JSON.stringify({width,height,browser:browser.version(),reducedMotion:true,engine:'Chromium',offlineRequests,errors,scans:results,keyboardSteps:steps},null,2)+'\n');
 assert.deepEqual(errors,[]);assert.equal(results.reduce((s,r)=>s+r.violations.length,0),0,JSON.stringify(results));
 await context.close();console.log(label+': keyboard, offline idea-to-report flow, six scenarios, seven print sections, HQ source replay, '+results.length+' WCAG scans passed');
}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{await visitor(browser,1440,900);await visitor(browser,390,844);}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
