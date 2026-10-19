/* NASHA AI Command Center isolated-preview acceptance, five responsive widths. */
"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {serveLocal,base}=require("./local-preview");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:["--no-sandbox","--disable-dev-shm-usage"]});
 for(const [label,width,height] of [["desktop",1440,900],["laptop",1180,760],["tablet",820,1180],["mobile",390,844],["small-mobile",320,740]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
  const page=await context.newPage();await serveLocal(page);
  const errors=[],bad=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("response",r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url())});
  await page.goto((base.endsWith("/") ? base : base + "/")+"nasha-ai-preview.html",{waitUntil:"load"});
  assert.equal(await page.locator("#roles article").count(),12,label+" roles");
  assert.equal(await page.locator("#roles article button").count(),12);
  assert.match(await page.locator("#workflows .evidence-note").innerText(),/ILLUSTRATIVE REPLAY/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(overflow>1){const offenders=await page.evaluate(()=>[...document.querySelectorAll("body *")].map(e=>({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,70),right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})).filter(e=>e.right>innerWidth+1||e.scrollWidth>e.clientWidth+1).sort((a,b)=>b.right-a.right).slice(0,12));console.error("OVERFLOW DIAGNOSTIC",label,width,JSON.stringify(offenders));}
  assert.ok(overflow<=1,label+" overflow "+overflow);
  const imgs=await page.locator("img").evaluateAll(a=>a.filter(x=>x.complete&&x.naturalWidth===0).map(x=>x.src));
  assert.deepEqual(imgs,[],label+" images");
  for(const href of await page.locator('a[href^="#"]').evaluateAll(a=>a.map(x=>x.getAttribute("href")).filter(h=>h.length>1))){
   assert.equal(await page.locator(`[id="${href.slice(1)}"]`).count(),1,label+" anchor "+href);
  }
  const btn=page.locator("#roles article button").first();
  await btn.focus();await page.keyboard.press("Enter");
  assert.equal(await page.locator("#agent-dialog").evaluate(x=>x.open),true,label+" keyboard dialog");
  assert.ok(await page.locator("#agent-dialog").evaluate(x=>x.contains(document.activeElement)),label+" dialog focus");
  assert.match(await page.locator("#profile-title").innerText(),/AETHON/);
  assert.match(await page.locator("#profile-code").getAttribute("href"),/specialists.py/);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#agent-dialog").evaluate(x=>x.open),false);
  assert.ok(await btn.evaluate(x=>x===document.activeElement),label+" focus restored");
  await page.locator('[data-workflow="inventory"]').click();
  assert.equal(await page.locator('[data-workflow="inventory"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator("#trace-steps button").count(),5);
  await page.locator("#replay-next").click();
  assert.match(await page.locator("#trace-role").innerText(),/QUANTIX/);
  await page.locator("#replay-toggle").click();
  assert.match(await page.locator("#replay-toggle").innerText(),/Pause/);
  await page.locator("#replay-toggle").click();
  assert.match(await page.locator("#replay-toggle").innerText(),/Play/);
  assert.deepEqual(errors,[],label+" JS errors");
  assert.deepEqual(bad,[],label+" failed requests");
  await context.close();
 }
 await browser.close();
 console.log("PASS: NASHA AI Command Center five viewport sizes, interactive profiles, keyboard, replay, disclosure, assets, links, reduced motion");
})().catch(e=>{console.error(e);process.exit(1)});
