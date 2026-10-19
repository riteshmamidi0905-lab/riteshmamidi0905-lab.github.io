'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const html=fs.readFileSync('deliverables/nasha-ecosystem/nasha-preview.html','utf8');
 assert.ok(!/<script src=|<link rel="stylesheet"/.test(html),'runtime resources must be embedded');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 for(const width of [1440,320]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
  // setContent tests the exact exported bytes; managed Chromium blocks file:// navigation.
  await page.setContent(html,{waitUntil:'networkidle'});
  assert.equal(await page.locator('#roles article').count(),12);
  await page.selectOption('#twin-scenario','shortage');assert.match(await page.locator('#twin-summary').innerText(),/8 units short/);
  await page.selectOption('#weir-request','draft');await page.click('#weir-evaluate');await page.click('#weir-approve');await page.click('#weir-execute');
  assert.match(await page.locator('#weir-outcome').innerText(),/grant consumed/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await page.close();
 }
 await browser.close();console.log('PASS: standalone embedded bytes, desktop and 320px, twin/approval interactions, zero external resource requests');
})().catch(e=>{console.error(e);process.exit(1)});
