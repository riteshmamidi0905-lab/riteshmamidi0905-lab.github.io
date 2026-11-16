'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),cp=require('node:child_process');
const pw=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
(async()=>{
  fs.mkdirSync('work',{recursive:true});
  const root=fs.mkdtempSync(path.resolve('work/agent-review-'));
  cp.execFileSync('python3',['scripts/build-agent-registry.py','--out',root+'/site'],{stdio:'pipe'});
  const server=http.createServer((req,res)=>{
    const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),p=path.resolve(root+'/site','.'+rel+(rel.endsWith('/')?'index.html':''));
    if(!p.startsWith(root+'/site/')||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'})[path.extname(p)]||'text/plain');res.end(fs.readFileSync(p));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  let browser;const report={engine:process.env.BROWSER||'chromium',physicalSafari:false,widths:[],axeScans:0,errors:[]};
  try{
    browser=await pw[report.engine].launch({headless:true,...(report.engine==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
    for(const width of [1440,768,390,320]){
      const c=await browser.newContext({viewport:{width,height:950},reducedMotion:width===1440?'no-preference':'reduce'}),p=await c.newPage();
      p.on('pageerror',e=>report.errors.push(e.message));
      await p.goto(base);await p.waitForFunction(()=>document.querySelector('#load-status').textContent.includes('All twelve'));
      await p.waitForFunction(()=>document.querySelector('#event-status').textContent.startsWith('Recorded event'));
      assert.equal(await p.locator('.station').count(),12);assert.equal(await p.locator('#network-stations li').count(),12);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      for(const name of ['AETHON','ZYBREW','PYRIX','VECTRA','NEXORA','QUANTIX','ECHON','NOVARA','SYNAPSE','AEGIS','CORTEX','VERITAS']){
        await p.getByRole('button',{name:'Inspect '+name,exact:true}).click();
        assert.match(await p.locator('#profile-title').textContent(),new RegExp(name));
        assert.match(await p.locator('#profile').textContent(),/Recorded prototype/);
        assert.equal(await p.locator('#profile .badge').count(),5);
      }
      let axe=await new AxeBuilder({page:p}).analyze();assert.deepEqual(axe.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})),[]);report.axeScans++;
      await p.getByRole('button',{name:'Start guided tour',exact:true}).click();assert.match(await p.locator('#profile-title').textContent(),/AETHON/);
      await p.getByRole('button',{name:'Next specialist',exact:true}).click();assert.match(await p.locator('#profile-title').textContent(),/ZYBREW/);
      await p.getByRole('button',{name:'Next recorded event',exact:true}).click();assert.match(await p.locator('#event-status').textContent(),/Recorded event 2 /);
      await p.getByRole('button',{name:'Previous event',exact:true}).click();assert.match(await p.locator('#event-status').textContent(),/Recorded event 1 /);
      await p.locator('#recording').selectOption('mission-e-pack-approved.json');await p.waitForFunction(()=>document.querySelector('#timeline').options.length===46&&!document.querySelector('#timeline').disabled);
      const pyrix=await p.locator('#timeline option').evaluateAll(nodes=>nodes.findIndex(n=>n.textContent.includes('pyrix'.toUpperCase())));
      await p.locator('#timeline').selectOption(String(pyrix));assert.match(await p.locator('#event-title').textContent(),/PYRIX/);
      assert.match(await p.locator('[data-agent=nexora]').textContent(),/not assigned/);
      await p.locator('#timeline').selectOption('45');assert.ok(await p.locator('#next').isDisabled());await p.locator('#reset').click();assert.ok(await p.locator('#previous').isDisabled());
      await p.screenshot({path:root+'/'+report.engine+'-'+width+'.png',fullPage:true});
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(width===1440){
        const targets=await p.locator('a[href]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')).filter(h=>!h.startsWith('#')&&!h.startsWith('https:')&&!h.startsWith('mailto:')))]);
        for(const href of targets){const response=await p.request.get(new URL(href,base).href);assert.equal(response.status(),200,href);}
      }
      await c.close();report.widths.push(width);
    }
    const c=await browser.newContext(),p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
    await p.route('**/mission-f-surge-approved.json',route=>route.fulfill({body:'{"events":[]}',contentType:'application/json'}));
    await p.goto(base);await p.waitForFunction(()=>document.querySelector('#event-status').textContent.includes('checksum differs'));
    assert.ok(await p.locator('#next').isDisabled());assert.equal(await p.locator('.station').count(),12);
    await p.locator('#recording').selectOption('mission-a-approved.json');await p.waitForFunction(()=>document.querySelector('#event-status').textContent.startsWith('Recorded event'));
    await p.getByRole('button',{name:'Inspect VECTRA',exact:true}).click();await p.reload();await p.waitForFunction(()=>!document.querySelector('#profile').hidden);assert.match(await p.locator('#profile-title').textContent(),/VECTRA/);
    await c.close();
    const failed=await browser.newContext(),f=await failed.newPage();await f.route('**/registry.json',route=>route.abort());await f.goto(base);await f.waitForFunction(()=>document.querySelector('#load-status').textContent.includes('could not load'));
    assert.ok(await f.getByRole('link',{name:'Résumé',exact:true}).isVisible());assert.ok(await f.locator('#tour').isDisabled());await failed.close();
    assert.deepEqual(report.errors,[]);report.hashFailureAndRecovery='PASS';report.registryFailure='PASS';report.output=root;
    fs.writeFileSync(root+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
