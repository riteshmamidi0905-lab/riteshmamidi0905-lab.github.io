'use strict';
// Additional isolated-review gate. Existing production-page thresholds remain unchanged.
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const run=(exe,args,options={})=>new Promise((resolve,reject)=>{const child=cp.spawn(exe,args,{stdio:'inherit',...options});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(exe+' exited '+code)));});
(async()=>{
  fs.mkdirSync('work',{recursive:true});const folder=fs.mkdtempSync(path.resolve('work/registry-performance-'));
  await run('python3',['scripts/build-agent-registry.py','--out',folder+'/site']);
  const server=http.createServer((req,res)=>{
    const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(folder+'/site','.'+rel+(rel.endsWith('/')?'index.html':''));
    if(!file.startsWith(folder+'/site/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const scores=[];
  try{
    for(const profile of ['mobile-1','mobile-2','mobile-3','desktop']){
      const file=folder+'/'+profile+'.json';
      await run('npx',['--yes','lighthouse@13.5.0','http://127.0.0.1:'+server.address().port+'/',...(profile==='desktop'?['--preset=desktop']:[]),'--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage','--output=json','--output-path='+file,'--quiet']);
      const report=JSON.parse(fs.readFileSync(file));
      const result={profile,scores:Object.fromEntries(['performance','accessibility','best-practices','seo'].map(k=>[k,report.categories[k].score])),measured:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift'].map(k=>[k,report.audits[k].numericValue]))};
      scores.push(result);console.log(JSON.stringify({scope:'isolated registry; noindex review, not production/device certification',...result}));
      assert.ok(result.scores.accessibility>=.95);assert.ok(result.scores['best-practices']>=.95);
    }
    const mobile=scores.slice(0,3).map(r=>r.scores.performance).sort((a,b)=>a-b),median=mobile[1];
    fs.writeFileSync(folder+'/summary.json',JSON.stringify({lighthouse:'13.5.0',method:'Three sequential mobile simulated-throttling runs and one desktop; default settings; no parallel browser suite in this job',mobileMedian:median,scores},null,2));
    assert.ok(median>=.90,'Isolated registry mobile median must meet the new 90 target; all three results retained');
    assert.ok(scores[3].scores.performance>=.90,'Desktop review target');
    console.log(JSON.stringify({registryPerformanceGate:'PASS',mobileMedian:median,allMobile:mobile,desktop:scores[3].scores.performance,reportFolder:folder,physicalSafari:false}));
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
