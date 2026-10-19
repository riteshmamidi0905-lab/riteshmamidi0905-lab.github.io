'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const {chromium} = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const {serveLocal,base} = require('./local-preview');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results = [];
 for (const width of [1440,1180,820,390,320]) {
  const ctx = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await ctx.addInitScript(() => { window.__cls=0; new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__cls+=e.value})).observe({type:'layout-shift',buffered:true}); });
  const page = await ctx.newPage(); await serveLocal(page);
  const errors=[], failed=[], requests=[], responses=[];
  page.on('pageerror',e=>errors.push(e.message)); page.on('response',r=>{if(r.status()>=400)failed.push(r.url()); if(r.url().startsWith(base))responses.push(r);});
  page.on('request',r=>requests.push(r.url()));
  await page.goto(base.replace(/\/?$/,'/')+'nasha-ai-preview.html',{waitUntil:'networkidle'});
  await page.keyboard.press('Tab'); assert.equal(await page.locator('.ecosystem-skip').evaluate(e=>e===document.activeElement),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.selectOption('#twin-scenario','shortage'); await page.click('[data-zone="stock"]');
  assert.match(await page.locator('#zone-metrics').innerText(),/8 units/);
  await page.fill('#twin-stock','0'); await page.fill('#twin-demand','20'); await page.click('#twin-apply');
  assert.match(await page.locator('#twin-summary').innerText(),/20 units short/);
  await page.fill('#twin-stock','-1'); await page.click('#twin-apply'); assert.match(await page.locator('#twin-error').innerText(),/Enter whole values/);
  assert.match(await page.locator('#twin-summary').innerText(),/20 units short/,'invalid input preserves last valid state');
  await page.click('#twin-reset'); await page.click('[data-zone="finance"]'); assert.match(await page.locator('#zone-metrics').innerText(),/\$120.00/);
  await page.click('[data-zone="court"]'); assert.match(await page.locator('#zone-metrics').innerText(),/negative/);
  await page.selectOption('#weir-request','draft'); await page.click('#weir-evaluate');
  assert.equal(await page.locator('#weir-decision').innerText(),'APPROVE'); assert.equal(await page.locator('#weir-execute').isDisabled(),true);
  await page.click('#weir-approve'); assert.match(await page.locator('#weir-outcome').innerText(),/has not executed/);
  await page.click('#weir-tamper'); assert.match(await page.locator('#weir-outcome').innerText(),/Changed arguments denied/);
  await page.click('#weir-execute'); assert.equal(await page.locator('#weir-execute').isDisabled(),true);
  assert.match(await page.locator('#weir-audit').innerText(),/grant consumed/);
  await page.selectOption('#weir-request','blocked'); await page.click('#weir-evaluate'); assert.equal(await page.locator('#weir-decision').innerText(),'DENY');
  await page.selectOption('#weir-request','read'); await page.click('#weir-evaluate'); assert.equal(await page.locator('#weir-decision').innerText(),'ALLOW');
  const scans=[];
  for(const state of ['interacted','profile']) {
   if(state==='profile') await page.locator('#roles button').first().click();
   const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
   assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],width+' '+state+' accessibility'); scans.push({state,violations:axe.violations.length});
   if(state==='profile') await page.keyboard.press('Escape');
  }
  for (const [workflow,count] of [['inventory_procurement',5],['seasonal_beer',10],['customer_marketing',7]]) {
   await page.selectOption('#service-workflow',workflow);
   assert.equal(await page.locator('#service-results article').count(),count);
   assert.match(await page.locator('#service-status').innerText(),/REQUIRES_HUMAN_APPROVAL.*External actions: 0/);
  }
  await page.locator('#service-evidence summary').click();
  assert.match(await page.locator('#recorded-security-summary').innerText(),/DENY → APPROVE → ALLOW/);
  assert.match(await page.locator('#recorded-security-events').innerText(),/approval.consumed/);
  const recordedAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  assert.deepEqual(recordedAxe.violations.map(v=>v.id),[],width+' expanded recorded security accessibility');
  scans.push({state:'recorded-security-expanded',violations:recordedAxe.violations.length});
  for (const href of await page.locator('a[href^="#"]').evaluateAll(a=>a.map(x=>x.getAttribute('href')).filter(x=>x.length>1))) {
   assert.equal(await page.locator(href).count(),1,'unique navigation target '+href);
  }
  await page.click('#weir-reset'); assert.equal(await page.locator('#weir-audit li').count(),0);
  await page.locator('footer').scrollIntoViewIfNeeded(); await page.locator('img').evaluateAll(a=>a.forEach(i=>i.loading='eager')); await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
  assert.equal(await page.locator('#roles img').count(),12); assert.equal(await page.locator('img').evaluateAll(a=>a.filter(i=>i.complete&&i.naturalWidth===0).length),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const bytes=(await Promise.all(responses.map(async r=>{try {return zlib.gzipSync(await r.body()).length;}catch{return 0;}}))).reduce((a,b)=>a+b,0);
  assert.ok(bytes<100*1024,'complete page exceeds 100 KiB gzip');
  assert.ok(requests.every(u=>u.startsWith(base)),'no external network requests');
  const cls=await page.evaluate(()=>window.__cls); assert.ok(cls<0.1,'layout shift budget');
  assert.deepEqual(errors,[]); assert.deepEqual(failed,[]);
  results.push({width,scans,gzipBytes:bytes,requests:requests.length,cls,overflow:false,externalRequests:0});
  await ctx.close();
 }
 const ctx=await browser.newContext({javaScriptEnabled:false}); const page=await ctx.newPage(); await serveLocal(page);
 await page.goto(base.replace(/\/?$/,'/')+'nasha-ai-preview.html'); assert.match(await page.locator('noscript').innerText(),/require JavaScript/); assert.equal(await page.locator('#recruiter-mode').isVisible(),true); await ctx.close();
 await browser.close();
 const report={status:'TESTED',scope:'Local Chromium and axe; browser illustrations only',viewports:results,noJavaScriptFallback:true};
 fs.mkdirSync('docs/nasha-ecosystem/evidence',{recursive:true}); fs.writeFileSync('docs/nasha-ecosystem/evidence/browser-acceptance.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
