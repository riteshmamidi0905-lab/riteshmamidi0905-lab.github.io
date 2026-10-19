/* Keyboard-driven Chromium checks; not a human screen-reader session. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {base}=require('./local-preview');
(async()=>{
 fs.mkdirSync('work/qa',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
 try{for(const width of [1440,820,390]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();
 await page.goto(base.replace(/\/?$/,'/')+'nasha-ai-preview.html',{waitUntil:'networkidle'});
 const tabTo=async selector=>{for(let i=0;i<250;i++){if(await page.locator(selector).first().evaluate(e=>e===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Unreachable by Tab: '+selector);};
 await page.keyboard.press('Tab');assert.equal(await page.locator('.ecosystem-skip').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');
 await tabTo('#twin-scenario');await page.keyboard.press('End');await page.keyboard.press('Enter');await tabTo('[data-zone="stock"]');await page.keyboard.press('Space');assert.match(await page.locator('#zone-metrics').innerText(),/8 units/);
 await tabTo('#twin-stock');await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('0');await tabTo('#twin-demand');await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('20');await tabTo('#twin-apply');await page.keyboard.press('Enter');assert.match(await page.locator('#twin-summary').innerText(),/20 units short/);
 await tabTo('#service-workflow');await page.keyboard.press('End');await page.keyboard.press('Enter');assert.equal(await page.locator('#service-results article').count(),7);
 await tabTo('#service-evidence summary');await page.keyboard.press('Space');assert.equal(await page.locator('#service-evidence details').getAttribute('open'),'');
 await tabTo('#roles button');await page.keyboard.press('Enter');assert.equal(await page.locator('#agent-dialog').evaluate(e=>e.open),true);
 const trap=[];for(let i=0;i<5;i++){trap.push(await page.evaluate(()=>document.activeElement.id));assert.equal(await page.evaluate(()=>document.activeElement===document.body || document.querySelector('#agent-dialog').contains(document.activeElement)),true);await page.keyboard.press('Tab');}
 await page.keyboard.press('Escape');assert.equal(await page.locator('#roles button').first().evaluate(e=>e===document.activeElement),true);
 await tabTo('[data-workflow="inventory"]');await page.keyboard.press('Space');await tabTo('#replay-next');await page.keyboard.press('Enter');assert.match(await page.locator('#trace-counter').innerText(),/2/);
 await tabTo('#weir-request');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await tabTo('#weir-evaluate');await page.keyboard.press('Enter');assert.equal(await page.locator('#weir-decision').innerText(),'APPROVE');assert.equal(await page.locator('#weir-execute').isDisabled(),true);
 await tabTo('#weir-approve');await page.keyboard.press('Space');assert.match(await page.locator('#weir-outcome').innerText(),/has not executed/);await tabTo('#weir-execute');await page.keyboard.press('Space');assert.match(await page.locator('#weir-outcome').innerText(),/grant consumed/);
 const session=await context.newCDPSession(page);const ax=await session.send('Accessibility.getFullAXTree');const nodes=ax.nodes.filter(n=>!n.ignored);assert.ok(nodes.some(n=>n.role?.value==='main'));assert.ok(nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Simulate human approval'));
 const captures=[];for(const selector of ['header','#twin','#team','#weir-lab','#service-evidence','#recruiter-mode']){const name=selector.replace(/[#.]/g,'');await page.locator(selector).screenshot({path:`work/qa/review-${width}-${name}.png`});captures.push(`work/qa/review-${width}-${name}.png`);}
 results.push({width,keyboardOnlyInteraction:true,skipLink:true,twinWhatIf:true,recordedWorkflow:true,detailsToggle:true,dialogTrap:trap,escapeRestoresFocus:true,workflowStep:true,separateApprovalAndExecution:true,accessibilityTree:{exposedNodes:nodes.length,mainLandmark:true,namedControls:true},captures});await context.close();
 }
 // Check the existing recruiter entry at each acceptance width.
 for(const width of [1440,820,390]){const page=await browser.newPage({viewport:{width,height:900}});await page.goto(base.replace(/\/?$/,'/')+'recruiter.html');assert.equal(await page.locator('a[href="nasha-ai-preview.html#recruiter-mode"]').count(),1);await page.screenshot({path:`work/qa/recruiter-${width}.png`,fullPage:true});await page.close();}
 fs.writeFileSync('work/qa/keyboard-review.json',JSON.stringify({scope:'Scripted key presses in Chromium over local HTTP. No pointer/focus API used for interaction. Accessibility tree inspected; no speech output tested.',results,humanVerificationRequired:['NVDA with Firefox or Chrome on Windows','VoiceOver with Safari on macOS and iOS','Announcement order and verbosity for live regions','Touch exploration, captions and real-device usability']},null,2)+'\n');console.log('PASS: keyboard-driven flows, dialog containment/return, accessibility tree and recruiter entry at 3 widths');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
