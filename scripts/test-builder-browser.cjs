'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{AxeBuilder}=require('@axe-core/playwright');
const base=process.argv[2]||'http://127.0.0.1:8000/',dir=process.env.BUILDER_EVIDENCE;
const summary={views:[],axe:[],keyboard:[],offline:[],errors:[],exports:[]};
function save(name,v){if(dir)fs.writeFileSync(path.join(dir,'checks',name),JSON.stringify(v,null,2)+'\n');}
async function walk(browser,width){
 const height=width===390?844:900,ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await ctx.newPage();
 const errors=[],requests=[],ax=[];let offline=false;
 p.on('pageerror',err=>errors.push(err.message));
 ctx.on('request',req=>{if(offline&&/^https?:/.test(req.url()))requests.push({url:req.url(),method:req.method()});});
 p.setDefaultTimeout(12000);
 try{
  async function view(name,selector='h1',scan=true){
    const pos=p.locator(selector).first();await pos.waitFor();
    const starts=['review','overview','website','products','operations','campaign-planner','simulation','customers','finance','report'];
    if(name==='gallery')await p.evaluate(()=>window.scrollTo(0,0));
    else if(starts.includes(name)||name.startsWith('guided-'))await p.locator('#builder h1').evaluate(el=>el.closest('.screen-head')?.scrollIntoView({block:'start',behavior:'instant'}));
    else await pos.evaluate(el=>el.scrollIntoView({block:el.clientHeight>innerHeight?'start':'center',behavior:'instant'}));
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow: '+name);
    assert.ok(await p.locator('.stat strong .source').evaluateAll(nodes=>nodes.every(node=>{const range=document.createRange();range.selectNodeContents(node);return range.getClientRects().length<=1&&node.getBoundingClientRect().right<=innerWidth+1;})),'Currency or count wraps inside a summary metric: '+name);
    if(dir){await p.screenshot({path:path.join(dir,'screenshots',name+'-'+width+'.png')});ax.push({name,tree:await p.locator('#builder').ariaSnapshot()});}
    if(scan){const q=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
      const violations=q.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));summary.axe.push({width,name,violations});assert.deepEqual(violations,[],name+' accessibility');}
    summary.views.push({name,width,height});
  }
  async function tabTo(selector,action='Enter'){
    const l=p.locator(selector).first();await l.waitFor();
    for(let i=0;i<190;i++){
      if(await l.evaluate(el=>document.activeElement===el)){summary.keyboard.push({width,target:selector,tabs:i,key:action});if(action)await p.keyboard.press(action);return;}
      await p.keyboard.press('Tab');
    }throw Error('Unreachable by Tab: '+selector);
  }
  async function section(name){
    if(width===390){await tabTo('[name=section]',null);const l=p.locator('[name=section]');await l.press('Home');const keys=['overview','website','products','operations','marketing','customers','finance','simulation','report'];for(let j=0;j<keys.indexOf(name);j++)await l.press('ArrowDown');await l.press('Enter');await tabTo('#section-jump button');}
    else await tabTo('.side nav a[href="#'+name+'"]');
    await p.waitForFunction(id=>document.querySelector('#builder').dataset.screen===id,name);
  }
  await p.goto(base+'pavilion/start.html',{waitUntil:'networkidle'});await p.locator('.industry').first().waitFor();
  await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  offline=true;await ctx.setOffline(true);
  await view('gallery','.entry-lead');
  await tabTo('[data-act="pick:sports"]');
  for(let i=0;i<7;i++){await p.locator('#guide-form[data-step="'+i+'"]').waitFor();if(i===1){await tabTo('[name=city]',null);await p.keyboard.press('ControlOrMeta+a');await p.keyboard.type('Austin');}
    await view('guided-'+(i+1),'#guide-form',i===0||i===6);
    await tabTo('#guide-form button[type=submit],#guide-form button:not([type])');}
  await view('review','#review-form');await tabTo('#review-form button:not([type])');await p.waitForSelector('[data-screen=overview]');
  await view('overview','.overview-hero');
  await section('website');await view('website','#website-form');
  await p.locator('[name=title]').fill('District Field on game day');await p.locator('[name=theme]').selectOption('night');
  await p.locator('#website-form button').click();await p.locator('[data-act=device]').click();await view('website-mobile-preview','.site-preview',false);
  const nextDownload=p.waitForEvent('download');await p.locator('[data-act=export]').click();const dl=await nextDownload;
  const src=fs.readFileSync(await dl.path(),'utf8');assert.match(src,/District Field on game day/);assert.ok(!/<form\b|<script\b/i.test(src));summary.exports.push({width,bytes:Buffer.byteLength(src),filename:dl.suggestedFilename()});
  await section('products');await view('products','#products-form');await p.locator('[name="price-FOOD-A"]').fill('13.00');await p.locator('#products-form button').click();
  await section('operations');await view('operations','#operations-form');
  await section('marketing');await view('campaign-planner','#campaign-form');await tabTo('#campaign-form button');
  await view('campaign-creative','.creative-pair',false);
  await tabTo('[data-act=run]');await p.waitForSelector('[data-screen=simulation]');await view('simulation','h1');await view('campaign-roi','.roi-card');
  for(const s of ['fatigue','overload','normal']){await p.locator('[name=stress]').selectOption(s);if(s!=='normal')await view('stress-'+s,'.roi-card',false);}
  await p.locator('a[href="#hq"]').click();await view('headquarters','.active-task');assert.match(await p.locator('.active-task').innerText(),/NOVARA/);
  await tabTo('.active-task [data-record]');await p.locator('dialog[open]').waitFor();await view('source-record','dialog[open]',false);await p.keyboard.press('Escape');
  await p.locator('[data-act=play-handoffs]').click();await p.waitForFunction(()=>document.querySelector('.active-task .kicker')?.textContent.includes('ECHON'));await p.locator('[data-act=play-handoffs]').click();
  await p.locator('a[href="#simulation"]').last().click();await p.locator('a[href="#district"]').click();await view('district','.district-figure');await p.locator('[data-builder-lot="stadium"]').click();assert.match(await p.locator('#lot-stadium').innerText(),/Game-day combo/);
  await section('customers');await view('customers','h1');await section('finance');await view('finance','h1');
  await section('report');await view('report','h1');assert.match(await p.locator('.panel').innerText(),/not financial, legal or tax advice/);
  await section('overview');await p.locator('.manage summary').click();await p.locator('[data-act=duplicate]').click();await p.locator('.manage summary').click();assert.equal(await p.locator('[name=workspace] option').count(),2);
  await p.locator('[data-act=reset]').click();await p.locator('[data-act=confirm-reset]').click();await p.locator('.manage summary').click();await p.locator('[data-act=undo]').click();await p.locator('.manage summary').click();await p.locator('[data-act=redo]').click();
  assert.deepEqual(requests,[],'HTTP requests while exercising the builder offline');assert.deepEqual(errors,[]);
  summary.offline.push({width,initialAssetsLoaded:true,browserOffline:true,subsequentHttpRequests:requests});save('ax-'+width+'.json',ax);
  offline=false;await ctx.setOffline(false);await p.reload();await p.locator('.side-name').waitFor();assert.match(await p.locator('.panel').innerText(),/District Field/);
 }finally{summary.errors.push(...errors);await ctx.close();}
}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});try{for(const w of [1440,390])await walk(b,w);}finally{save('builder-browser.json',summary);await b.close();}console.log(JSON.stringify({viewChecks:summary.views.length,axeScans:summary.axe.length,violations:summary.axe.flatMap(s=>s.violations).length,keyboardPaths:summary.keyboard.length,offline:summary.offline,exports:summary.exports}));})().catch(e=>{console.error(e);process.exitCode=1});
