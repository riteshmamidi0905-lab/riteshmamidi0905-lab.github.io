/* Local browser regression test; run with an HTTP server on PORT (default 8000). */
'use strict';
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];const {serveLocal,base}=require('./local-preview');
for(const [label,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844],['small-mobile',320,740]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];const bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.status()+' '+r.url())});
 await serveLocal(page);await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.pcard').count(),22);assert.equal(await page.locator('.flagw').count(),6);
 await page.locator('#research').scrollIntoViewIfNeeded();await page.getByRole('button',{name:/Groundedness/}).click();assert.equal(await page.locator('#dimensionTitle').textContent(),'Groundedness');
 await page.locator('[data-f="genai"]').click();assert.equal(await page.locator('.pcard:not(.hide)').count(),5);assert.match(await page.locator('#filterStatus').textContent(),/^5 projects/);
 await page.locator('[data-f="all"]').click();assert.equal(await page.locator('.pcard:not(.hide)').count(),22);
 await page.locator('.cs-summary').first().click();assert.equal(await page.locator('details[open]').count(),1);
 await page.locator('#motionToggle').click();assert.equal(await page.locator('#motionToggle').getAttribute('aria-pressed'),'true');await page.locator('#motionToggle').click();
 if(width<=1000){await page.locator('#burger').click();assert.equal(await page.locator('#burger').getAttribute('aria-expanded'),'true');await page.locator('#nlinks a[href="#research"]').click();assert.equal(await page.locator('#burger').getAttribute('aria-expanded'),'false');}
 await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
 const layout=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src),ids:[...document.querySelectorAll('[id]')].map(i=>i.id)}));
 assert.ok(layout.body<=width+1,`${label}: overflow ${layout.body}`);assert.deepEqual(layout.broken,[]);assert.equal(new Set(layout.ids).size,layout.ids.length,'duplicate SVG/HTML IDs');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`../qa-${label}-hero.png`,animations:'disabled'});
 await page.locator('#research').scrollIntoViewIfNeeded();await page.screenshot({path:`../qa-${label}-research.png`,animations:'disabled'});
 results.push({label,width,overflow:false,images:'pass',filters:'pass',research:'pass',navigation:'pass',consoleErrors:errors,failedLocalRequests:bad});await page.close();
}
const reduced=await browser.newPage({reducedMotion:'reduce'});await serveLocal(reduced);await reduced.goto(base,{waitUntil:'networkidle'});await reduced.locator('#pgrid').scrollIntoViewIfNeeded();await reduced.locator('img[data-motion]').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));await reduced.waitForFunction(()=>[...document.querySelectorAll('img[data-motion]')].every(i=>i.complete&&i.naturalWidth>0));assert.ok(await reduced.locator('img[data-motion]').evaluateAll(imgs=>imgs.every(i=>i.currentSrc.endsWith('-still.svg'))));assert.equal(await reduced.locator('.hero-rise').first().evaluate(el=>getComputedStyle(el).animationName),'none');await reduced.close();
const keyboard=await browser.newPage();await serveLocal(keyboard);await keyboard.goto(base);await keyboard.keyboard.press('Tab');assert.equal(await keyboard.locator('.skip').evaluate(el=>el===document.activeElement),true);await keyboard.close();
console.log(JSON.stringify({responsive:results,reducedMotion:'pass',keyboardSkip:'pass'},null,2));await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
