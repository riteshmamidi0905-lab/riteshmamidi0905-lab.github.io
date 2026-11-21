'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{AxeBuilder}=require('@axe-core/playwright');
const base=process.argv[2]||'http://127.0.0.1:8000/';
const dest=process.env.STUDIO_EVIDENCE;
const summary={views:[],keyboard:[],accessibility:[],offline:[],exports:[],errors:[]};
const safeFields=/\b(?:card|cvv|cvc|expiry|iban|routing|account number)\b/i;
const save=(f,v)=>{if(dest){fs.mkdirSync(path.dirname(path.join(dest,f)),{recursive:true});fs.writeFileSync(path.join(dest,f),JSON.stringify(v,null,2)+'\n');}};
async function exercise(browser,width,height){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true}),p=await ctx.newPage();
 p.setDefaultTimeout(10000);let offline=false;const http=[];
 ctx.on('request',q=>{if(offline&&/^https?:/.test(q.url()))http.push(q.url());});p.on('pageerror',e=>summary.errors.push(e.message));
 const el=s=>p.locator(s);
 async function activate(s){
   const wanted=el(s).first();await wanted.waitFor({state:'visible'});
   // Enter the area's tab order from its preceding keyboard position.
   await wanted.focus();await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');
   assert.ok(await wanted.evaluate(e=>e===document.activeElement),'keyboard path '+s);await p.keyboard.press('Enter');summary.keyboard.push([width,s]);
 }
 async function shot(k){
   await p.evaluate(()=>document.fonts.ready);
   const h=el('#builder .studio h2').first();if(await h.count())await h.evaluate(e=>{e.scrollIntoView({block:'start'});window.scrollBy(0,-80);});
   if(dest)await p.screenshot({path:path.join(dest,'screenshots',k+'-'+width+'.png')});
   const ax=await el('#builder').ariaSnapshot();if(dest)save('ax/'+k+'-'+width+'.json',{view:k,width,tree:ax});
   const analysis=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
   const violations=analysis.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));summary.accessibility.push({k,width,violations});
   assert.deepEqual(violations,[],k+' axe');
   for(const label of await p.locator('#builder input,#builder select,#builder textarea').evaluateAll(es=>es.map(e=>[e.name,...Array.from(e.labels||[]).map(l=>l.innerText)].join(' '))))assert.doesNotMatch(label,safeFields);
   const text=(await el('#builder').innerText()).replaceAll('nothing is published, charged or sent.','').replace(/not registered/gi,'');
   assert.doesNotMatch(text,/\b(?:registered|sent|charged|Unspecified|undefined|NaN|null)\b/i,k);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),k+' overflow');summary.views.push({k,width,height});
 }
 async function area(k){await activate('[data-area="'+k+'"]');}
 try{
   await p.goto(base+'pavilion/start.html');await el('#builder .industry').first().waitFor();
   // Use the same confirmed business and persistence API as the guided entry; the existing suite walks all seven guide screens.
   const id=await p.evaluate(async()=>{const{newPlan}=await import('./builder-plan.js'),{createBusiness}=await import('./builder-ledger.js'),{browserLibrary}=await import('./builder-library.js');
    const plan=newPlan('salon');plan.values.concept='Walnut Studio';plan.values.city='Austin';const lib=browserLibrary();lib.add(createBusiness(plan));return lib.current;});
   await p.goto(base+'pavilion/start.html?workspace='+id+'#studio');await el('.studio-tabs').waitFor();await p.waitForLoadState('networkidle');
   await ctx.setOffline(true);offline=true;
   await el('[data-sform=page] [name=name]').fill('The collection');await activate('[data-sform=page] button');
   await el('[data-sform=section] select').selectOption('products');await activate('[data-sform=section] button');
   await activate('[data-studio=move-up][data-i="1"]');await el('[name=studio-page]').selectOption('0');
   await shot('site');
   const getFile=p.waitForEvent('download');await el('[data-studio=export-site]').click();const file=await getFile,stream=await file.createReadStream(),chunks=[];
   for await(const c of stream)chunks.push(c);const html=Buffer.concat(chunks).toString('utf8');assert.match(html,/The collection/);assert.doesNotMatch(html,/<script|<input/i);summary.exports.push({width,bytes:Buffer.byteLength(html)});
   await activate('[data-studio=publish]');await el('#preview-cart').waitFor();const url=p.url();assert.ok(url.includes('#preview='));
   await shot('published');await activate('#preview-cart button');await activate('#preview-cart button');
   await el('#preview-order [name=method]').selectOption('shipping');await el('#preview-order [name=code]').selectOption('WELCOME10');await activate('#preview-order button');
   assert.match(await el('#builder [role=status]').innerText(),/SHOP-0001/);await activate('#return-studio');await el('[data-sform=adjust]').waitFor();
   await activate('[data-sform=adjust] button');await shot('payments');await activate('button[data-id="SHOP-0001"]');await el('dialog[open]').waitFor();await p.keyboard.press('Escape');
   await area('store');await activate('button[data-studio=add-item]');await shot('store');
   await area('growth');await el('[data-sform=outreach] [name=offer]').fill('Neighborhood opening');await activate('[data-sform=outreach] button');await shot('marketing');
   await activate('[data-id="REVIEW-C-1"]');assert.match(await el('dialog').innerText(),/Attribution reconciled/);await p.keyboard.press('Escape');
   await area('analytics');await shot('analytics');await activate('[data-id="FORECAST-W5"]');assert.match(await el('dialog').innerText(),/TRAFFIC-D22/);await p.keyboard.press('Escape');
   await area('ops');await activate('[data-sform=booking] button');await shot('operations');await activate('[data-sform=settle] button');
   await area('copy');await el('[name=tone]').selectOption('editorial');await activate('[data-sform=compose] button');await shot('copy');await activate('[data-studio=apply-copy]');
   await area('launch');await shot('launch');await activate('[data-id="LAUNCH-SPIKE"]');await el('dialog[open]').waitFor();await p.keyboard.press('Escape');
   assert.deepEqual(http,[],'Network activity after initial load');summary.offline.push({width,requests:http});
   offline=false;await ctx.setOffline(false);const foreign=await browser.newContext(),fresh=await foreign.newPage();await fresh.goto(url);await fresh.locator('#preview-cart').waitFor();
   assert.match(await fresh.locator('#builder').innerText(),/The collection/);await fresh.locator('#preview-cart button').click();await fresh.locator('#preview-order button').click();
   assert.match(await fresh.locator('#builder [role=status]').innerText(),/SHOP-0001/);assert.equal(await fresh.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('nasha.builder.v1.business.')).length),0);await foreign.close();
 }finally{await ctx.close();}
}
(async()=>{if(dest)fs.mkdirSync(path.join(dest,'screenshots'),{recursive:true});const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{for(const [w,h] of [[1440,900],[390,844]])await exercise(b,w,h);assert.deepEqual(summary.errors,[]);}
 finally{save('checks/studio-browser.json',summary);await b.close();}
 console.log(JSON.stringify({screens:summary.views.length,keyboard:summary.keyboard.length,axe:summary.accessibility.length,offline:summary.offline,exports:summary.exports}));})().catch(e=>{console.error(e);process.exitCode=1;});
