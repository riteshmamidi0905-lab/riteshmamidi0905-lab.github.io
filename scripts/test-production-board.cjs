'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict'),pw=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
(async()=>{
  fs.mkdirSync('work',{recursive:true});const root=fs.mkdtempSync(path.resolve('work/production-board-'));
  cp.execFileSync('python3',['scripts/build-production-board.py','--out',root+'/site'],{stdio:'pipe'});
  const server=http.createServer((req,res)=>{
    const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root+'/site','.'+rel+(rel.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+'/site/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  let browser;const report={scope:'direction/storyboard only; no character/environment or owner acceptance',engine:process.env.BROWSER||'chromium',physicalSafari:false,widths:[],axeScans:0,errors:[]};
  try{
    browser=await pw[report.engine].launch({headless:true,...(report.engine==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
    for(const width of [1440,768,390,320]){
      const c=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
      await p.goto(base);assert.match(await p.locator('h1').textContent(),/One coherent world/);assert.match(await p.locator('.hero').textContent(),/NO-GO/);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const axe=await new AxeBuilder({page:p}).analyze();assert.deepEqual(axe.violations.map(x=>({id:x.id,targets:x.nodes.map(n=>n.target)})),[]);report.axeScans++;
      const links=await p.locator('a[href]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')).filter(h=>!h.startsWith('#')))]);
      for(const href of links){const response=await p.request.get(new URL(href,base).href);assert.equal(response.status(),200,href);}
      await p.screenshot({path:root+'/'+report.engine+'-'+width+'.png',fullPage:true});
      await p.getByRole('link',{name:'Inspect the twelve agents',exact:false}).click();await p.waitForFunction(()=>document.querySelector('#load-status').textContent.includes('All twelve'));
      assert.equal(await p.locator('.station').count(),12);await p.getByRole('button',{name:'Inspect VECTRA',exact:true}).click();assert.match(await p.locator('#profile-title').textContent(),/VECTRA/);
      report.widths.push(width);await c.close();
    }
    assert.deepEqual(report.errors,[]);report.output=root;fs.writeFileSync(root+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exit(1);});
