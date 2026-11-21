'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {AxeBuilder}=require('@axe-core/playwright');
const base=process.argv[2]||'http://127.0.0.1:8000/',output=process.env.INTEGRATION_EVIDENCE;
async function journey(browser,width,type){
 const height=width===390?844:900,context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await context.newPage();
 const venue=type==='stadium',name=venue?'Cedar Field':'Juniper Coffee',offer=venue?'Game-day combo':'Morning flight',errors=[];
 p.on('pageerror',err=>errors.push(err.message));p.setDefaultTimeout(15000);
 async function shot(label,selector){
  await p.locator(selector).first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' overflow');
  if(output)await p.screenshot({path:path.join(output,'screenshots',type+'-'+label+'-'+width+'.png')});
 }
 try{
  await p.goto(base+'pavilion/start.html');await p.locator('.industry').first().waitFor();
  await shot('entry','.entry-lead');
  await p.locator('[data-act="pick:'+(venue?'sports':'food')+'"]').click();
  if(!venue)await p.locator('[name=type]').selectOption('coffee');
  for(let i=0;i<7;i++){
   const form=p.locator('#guide-form[data-step="'+i+'"]');await form.waitFor();
   if(i===6)await form.locator('[name=concept]').fill(name);
   await form.locator('button:not([type]),button[type=submit]').click();
  }
  await shot('confirmation','#review-form');await p.locator('#review-form button:not([type])').click();
  await p.locator('[data-screen=overview]').waitFor();await shot('dashboard','.overview-hero');
  if(width===390){await p.locator('[name=section]').selectOption('marketing');await p.locator('#section-jump button').click();}
  else await p.locator('.side a[href="#marketing"]').click();
  await p.locator('#campaign-form [name=offer]').fill(offer);await p.locator('#campaign-form button').click();
  await p.getByText('Campaign added to the simulation.').waitFor();
  await shot('promotions','.offers');
  await p.getByRole('link',{name:'Open the district map'}).click();
  const card=p.locator('#district-list [data-door^=workspace-]').filter({hasText:name});
  await card.waitFor();const id=(await card.getAttribute('data-door')).slice('workspace-'.length);
  await p.locator('#district-day').selectOption('3');
  await p.waitForFunction(([id,name])=>document.querySelector('[data-door="workspace-'+id+'"] .district-offer')?.textContent.includes(name),[id,offer]);
  const label=p.locator('.district-labels:visible [data-label-lot="workspace-'+id+'"]');
  const badge=p.locator('[data-lot="workspace-'+id+'"] .promotion-marker');
  assert.equal(await badge.getAttribute('visibility'),'visible');assert.equal(await badge.innerText().catch(()=>badge.textContent()),'15%');
  await shot('district-map','#district-atlas');await shot('district-card','[data-door="workspace-'+id+'"]');
  assert.ok(await label.evaluate(el=>{const r=el.querySelector('rect').getBoundingClientRect();el.scrollIntoView({block:'center',behavior:'instant'});const b=el.querySelector('rect').getBoundingClientRect();return r.width>0&&document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('[data-label-lot]')===el;}));
  if(venue){await p.locator('#district-day').selectOption('2');assert.equal(await badge.getAttribute('visibility'),'hidden');await p.locator('#district-day').selectOption('3');}
  await label.click();await p.locator('#ask-open').click();await p.getByRole('button',{name:'Compare recorded promotions'}).click();
  const input=p.locator('#floor-question');await input.fill('What did the '+offer+' earn?');await input.press('Enter');
  const answer=await p.locator('.answer').innerText();assert.ok(answer.includes(offer),answer);
  await p.locator('.citations summary').click();
  const record=p.locator('.citations a').filter({hasText:'B-EFFECT-C-1'});await record.waitFor();
  await shot('ask','#ask-floor');
  const issues=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  assert.deepEqual(issues.violations.map(v=>[v.id,v.nodes.map(n=>n.target)]),[]);
  await record.click();const dialog=p.locator('dialog[open]');await dialog.waitFor();
  assert.equal(await dialog.locator('h2').innerText(),'Four-week promotion comparison');
  assert.equal(new URL(p.url()).searchParams.get('workspace'),id);
  await shot('source','dialog[open]');
  await dialog.getByRole('button',{name:'WITHOUT/C-1/B-RESULT',exact:true}).click();
  assert.match(await dialog.innerText(),/excludedCampaign/);
  await dialog.getByRole('button',{name:'WITHOUT/C-1/B-WEEK-1',exact:true}).click();
  assert.match(await dialog.innerText(),/Seven daily operating closes/);assert.deepEqual(errors,[]);
  return {width,height,type,business:name,offer,answer,source:'B-EFFECT-C-1',counterfactualWeek:'WITHOUT/C-1/B-WEEK-1',violations:0,errors};
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 const rows=[];
 try{for(const width of [1440,390])for(const type of ['stadium','coffee'])rows.push(await journey(browser,width,type));}
 finally{await browser.close();}
 if(output)fs.writeFileSync(path.join(output,'checks','integrated-journeys.json'),JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
