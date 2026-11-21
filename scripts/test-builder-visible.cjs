'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:8000/';
const invalid=/\b(?:unspecified|undefined|null|nan)\b/i;
let views=0;
async function inspect(page,label){
  const display=await page.evaluate(()=>{
    function content(root){
      const visible=el=>el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden';
      const chunks=[root.innerText];
      for(const el of root.querySelectorAll('*')){
        if(!visible(el))continue;
        if(el.shadowRoot)for(const child of el.shadowRoot.children)if(visible(child))chunks.push(...content(child));
        if(el.matches('input:not([type=hidden]), textarea'))chunks.push(el.value,el.placeholder);
        if(el.matches('select'))chunks.push(el.selectedOptions[0]?.textContent);
      }
      return chunks;
    }
    return content(document.body).filter(Boolean).join('\n');
  });
  assert.doesNotMatch(display,invalid,label);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' viewport overflow');views++;
}
async function run(browser,type,width){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'pavilion/start.html');await page.locator('.industry').first().waitFor();
    await inspect(page,'Builder gallery');
    if(type==='stadium'){
      await page.locator('[data-act="pick:sports"]').click();
      for(let i=0;i<7;i++){
        const form=page.locator('#guide-form[data-step="'+i+'"]');await form.waitFor();await inspect(page,'guide '+i);
        if(i===1)assert.equal(await form.locator('[name=city]').inputValue(),'');
        await form.getByRole('button',{name:i===6?'Review my assumptions':'Continue'}).click();
      }
      await inspect(page,'review');await page.locator('#review-form button:not([type])').click();await page.locator('[data-screen=overview]').waitFor();
    }
    // Exercise stored plans from the earlier release too, including their generated story.
    const id=await page.evaluate(async type=>{
      const {newPlan}=await import('./builder-plan.js'),{createBusiness}=await import('./builder-ledger.js');
      const {browserLibrary}=await import('./builder-library.js');const plan=newPlan(type);
      const b=createBusiness(plan);b.site.story='An independent '+(type==='stadium'?'venue':type==='salon'?'studio':'business')+' taking shape in Unspecified.';
      const c={id:'C-1',offer:'First week',item:b.items[0].id,channel:type==='stadium'?'venue':'social',start:1,end:7,budget:12500,discount:5,audience:'local'};
      if(type==='stadium')c.vendor=c.item;b.campaigns=[c];const lib=browserLibrary();lib.add(b);
      return lib.current;
    },type);
    const enter=async tab=>{
      await page.goto(base+'pavilion/start.html?workspace='+id+'#'+tab);
      await page.locator('[data-screen="'+tab+'"]').waitFor();
    };
    for(const tab of ['overview','products','operations','marketing','customers','finance','simulation','report','hq','district','website']){
      await enter(tab);await inspect(page,type+' '+tab);
      if(tab==='marketing'){
        assert.equal(await page.locator('[name=start] option').count(),28);
        assert.equal(await page.locator('[name=end] option:checked').textContent(),'Day 28');
        assert.match(await page.locator('.offers').innerText(),/Day 1–7/);
        assert.equal(await page.locator('input[type=date]').count(),0);
      }
      if(tab==='finance'){
        await page.locator('.stat [data-record]').first().click();await page.locator('dialog[open]').waitFor();await inspect(page,'finance record');
      }
      if(tab==='report'){
        await page.locator('details').evaluateAll(ds=>ds.forEach(d=>d.open=true));await page.emulateMedia({media:'print'});
        await inspect(page,'printed report');await page.emulateMedia({media:'screen'});
      }
      if(tab==='website'){
        const file=page.waitForEvent('download');await page.locator('[data-act=export]').click();
        const exported=await context.newPage();const doc=await file;const stream=await doc.createReadStream(),chunks=[];
        for await(const chunk of stream)chunks.push(chunk);await exported.setContent(Buffer.concat(chunks).toString('utf8'));
        await inspect(exported,'exported storefront');await exported.close();
      }
    }
    await page.goto(base+'pavilion/district.html?day=3');const card=page.locator('[data-door="workspace-'+id+'"]');await card.waitFor();
    await inspect(page,'District');if(type==='stadium'){
      assert.match(await card.innerText(),/Venue operator/);
      await card.click();await page.locator('#venue-report [data-entity-statement]').waitFor({state:'attached'});
      await page.locator('#print-report summary').first().click();await inspect(page,'venue readiness report');
    }
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{for(const type of ['stadium','coffee','brewery','truck','retail','salon','bakery'])
   await run(b,type,type==='stadium'||type==='salon'?390:1440);
 }finally{await b.close();}
 console.log(JSON.stringify({templates:7,renderedViews:views,placeholderHits:0}));
})().catch(e=>{console.error(e);process.exitCode=1});
