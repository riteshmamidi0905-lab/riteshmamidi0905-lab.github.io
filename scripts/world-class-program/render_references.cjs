'use strict';
// Public-page research only: no login, purchases, consent bypass or copied production assets.
const fs=require('node:fs'),path=require('node:path'),{chromium,request}=require('playwright');
(async()=>{
  const out=path.resolve('work/design-research'),raw=JSON.parse(fs.readFileSync(out+'/source-observations.json'));
  const seen=new Set(),references=raw.filter(r=>r.accessible&&!seen.has(r.final_url)&&seen.add(r.final_url)).slice(0,100);
  if(references.length!==100)throw Error('Need 100 distinct accessible source pages');
  fs.mkdirSync(out+'/screenshots',{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--mute-audio']});
  let next=0;const results=fs.existsSync(out+'/render-observations.json')?JSON.parse(fs.readFileSync(out+'/render-observations.json')).filter(r=>r.screenshot&&fs.existsSync(out+'/'+r.screenshot)&&!r.runtime_error):[];
  try{
    await Promise.all([0,1,2].map(async()=>{
      while(next<references.length){
        const index=next++,source=references[index];if(results.some(r=>r.id===index+1))continue;
        const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'}),page=await context.newPage();
        const proxy=process.env.HTTPS_PROXY||process.env.https_proxy,transport=await request.newContext(proxy?{proxy:{server:proxy}}:{});
        let refusedResources=0;
        await context.route('**/*',async route=>{
          const req=route.request();
          if(!req.url().startsWith('https://')||req.method()!=='GET'||req.resourceType()==='media'){refusedResources++;await route.abort();return;}
          try{
            let url=req.url(),response;
            for(let redirects=0;redirects<6;redirects++){
              response=await transport.get(url,{timeout:10000,maxRedirects:0});
              if(response.status()>=300&&response.status()<400&&response.headers().location){url=new URL(response.headers().location,url).href;if(!url.startsWith('https://'))throw Error('Non-HTTPS redirect refused');}
              else break;
            }
            if((await response.body()).length>8000000)throw Error('Review resource exceeds 8 MB');
            await route.fulfill({response});
          }catch{refusedResources++;await route.abort().catch(()=>{});}
        });
        const result={id:index+1,...source,runtime_method:'Headless Chromium 1280×800; verified-TLS APIRequestContext supplies GET resources through configured proxy using system CA bundle; no ignoreHTTPSErrors. DOMContentLoaded + 1.2 s; no clicks/login. Media, non-GET and >8 MB resources refused. Not full motion/performance/a11y certification.'};
        try{
          const response=await page.goto(source.final_url,{waitUntil:'domcontentloaded',timeout:18000});
          await page.waitForTimeout(1200);
          result.runtime_status=response?.status();result.runtime_url=page.url();
          result.runtime=await page.evaluate(()=>{
            const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
            const heading=[...document.querySelectorAll('h1,h2')].find(visible),style=getComputedStyle(heading||document.body);
            return {title:document.title,first_visible_heading:heading?.textContent.trim().slice(0,160)||null,font_family:style.fontFamily,font_size:style.fontSize,body_background:getComputedStyle(document.body).backgroundColor,body_color:getComputedStyle(document.body).color,visible_canvases:[...document.querySelectorAll('canvas')].filter(visible).length,visible_videos:[...document.querySelectorAll('video')].filter(visible).length,autoplay_video_elements:document.querySelectorAll('video[autoplay]').length,navigation_landmarks:document.querySelectorAll('nav,[role=navigation]').length,buttons:document.querySelectorAll('button').length,links:document.querySelectorAll('a[href]').length,viewport_overflow:document.documentElement.scrollWidth>innerWidth,visible_dialogs:[...document.querySelectorAll('[role=dialog],dialog')].filter(visible).length,visible_text_characters:document.body.innerText.length};
          });
          if(result.runtime_status>=400||/just a moment|access denied|attention required|security check/i.test(result.runtime.title))result.runtime_review='Blocked or challenged; no visual conclusion';
          else{
            const client=await context.newCDPSession(page),capture=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
            result.screenshot='screenshots/'+String(index+1).padStart(3,'0')+'.png';fs.writeFileSync(out+'/'+result.screenshot,Buffer.from(capture.data,'base64'));await client.detach();
            result.runtime_review='Timed initial viewport captured; fonts/resources may still be loading. No motion or owner/design acceptance implied.';
          }
        }catch(error){result.runtime_error=error.message.slice(0,240);}
        finally{result.refused_resources=refusedResources;await context.close();await transport.dispose();results.push(result);fs.writeFileSync(out+'/render-observations.json',JSON.stringify(results.sort((a,b)=>a.id-b.id),null,2));}
      }
    }));
  }finally{await browser.close();}
  console.log(JSON.stringify({references:results.length,captured:results.filter(r=>r.screenshot).length,runtime_unavailable:results.filter(r=>!r.screenshot).length}));
})().catch(e=>{console.error(e);process.exit(1);});
