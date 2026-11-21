'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const base=process.argv[2]||'http://127.0.0.1:8000/';
const receipts={labelViews:[],cardViews:[]};

// Test browser hit targets on the painted plates. Label DOM order by itself
// cannot establish that a visitor can see and select the whole label.
async function inspectLabels(page,width,js){
 const atlas=page.locator('.district-map');
 await atlas.evaluate(svg=>svg.scrollIntoView({block:'center',behavior:'instant'}));
 const results=await atlas.evaluate(svg=>{
  const group=[...svg.querySelectorAll('.district-labels')].find(g=>getComputedStyle(g).display!=='none');
  const plates=[...group.querySelectorAll('a')],bounds=svg.getBoundingClientRect();
  return plates.map(link=>{
   const label=link.dataset.labelLot,rect=link.querySelector('rect').getBoundingClientRect();
   const text=link.querySelector('text').getBoundingClientRect();
   const distinct=plates.every(other=>{
    if(other===link)return true;
    const b=other.querySelector('rect').getBoundingClientRect();
    return rect.right<=b.left || rect.left>=b.right || rect.bottom<=b.top || rect.top>=b.bottom;
   });
   const obstructed=[];
   for(const v of [.15,.5,.85]) for(const u of [.06,.25,.5,.75,.94]){
    const x=rect.left+rect.width*u,y=rect.top+rect.height*v;
    if(document.elementFromPoint(x,y)?.closest('[data-label-lot]')!==link)obstructed.push([u,v]);
   }
   const scale=link.getScreenCTM().a;
   return {label,paintSamples:15,obstructed,distinct,
    textPixels:Math.round(parseFloat(getComputedStyle(link.querySelector('text')).fontSize)*scale*10)/10,
    contained:rect.left>=bounds.left && rect.right<=bounds.right && rect.top>=bounds.top && rect.bottom<=bounds.bottom &&
     text.left>=rect.left-.5 && text.right<=rect.right+.5 && text.top>=rect.top-.5 && text.bottom<=rect.bottom+.5,
    leaders:group.querySelectorAll('.lot-leaders path').length,
    destination:link.getAttribute('href'),building:svg.querySelector('[data-lot="'+label+'"]').getAttribute('href')};
  });
 });
 assert.equal(results.length,7);
 for(const l of results){
  assert.deepEqual(l.obstructed,[],l.label+' paint obstruction');
  assert.ok(l.distinct && l.contained && l.textPixels>=12,JSON.stringify(l));
  assert.equal(l.leaders,results.length);
  assert.equal(l.destination,l.building);
 }
 receipts.labelViews.push({width,js,buildings:results});
}

(async()=>{
 const {lots}=await import('../pavilion/district-map.js');
 const {districtBusiness}=await import('../pavilion/district-state.js');
 const {simulateStadium}=await import('../pavilion/stadium-model.js');
 const models=new Map(lots.map(l=>[l.id,l.id==='stadium'?simulateStadium():districtBusiness(l.id)]));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{
  for(const [width,height] of [[1440,900],[390,844]]){
   for(const js of [true,false]){
    const page=await browser.newPage({javaScriptEnabled:js,viewport:{width,height},reducedMotion:'reduce'});
    try{
     await page.goto(new URL('pavilion/district.html',base).href);
     if(js)await page.locator('[data-door=brewery] [data-agent]').first().waitFor();
     await page.evaluate(()=>document.fonts.ready);
     await inspectLabels(page,width,js);
     if(!js)continue;
     for(const [day,minute] of [[1,25],[1,20],[3,58],[3,59],[3,154],[3,0]]){
      if(minute!==25)await page.goto(new URL('pavilion/district.html?day='+day+'&minute='+minute,base).href);
      await page.waitForFunction(text=>document.querySelector('#district-clock')?.textContent===text,'Day '+day+' · minute '+minute);
      const cards=[];
      for(const [id,model] of models){
       const expected=model.events.filter(e=>e.day===day && (id==='stadium'?e.minute===minute:e.startMinute<=minute&&minute<e.endMinute));
       const card=page.locator('[data-door="'+id+'"]');
       const shown=await card.locator('[data-agent]').evaluateAll(nodes=>nodes.map(n=>({agent:n.dataset.agent,events:n.dataset.events.split(' '),sources:n.dataset.sources.split(' '),visibleName:n.querySelector('strong').textContent})));
       const names=[...new Set(expected.map(e=>e.owner))];
       assert.deepEqual(shown.map(n=>n.visibleName),names,id+' visible agents');
       assert.equal((await card.innerText()).includes('Idle at this minute'),!names.length);
       for(const n of shown){
        const tasks=expected.filter(e=>e.owner===n.agent);
        assert.deepEqual(n.events,tasks.map(e=>e.id));
        assert.deepEqual(n.sources,tasks.flatMap(e=>e.outputs));
        for(const record of n.sources)assert.ok(model.records[record],id+' '+record);
       }
       cards.push({id,active:names,events:expected.map(e=>e.id)});
      }
      receipts.cardViews.push({width,day,minute,cards});
     }
    }finally{await page.close();}
   }
  }
 }finally{await browser.close();}
 if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(receipts,null,2)+'\n');
 const labels=receipts.labelViews.flatMap(s=>s.buildings);
 console.log(JSON.stringify({labelViews:receipts.labelViews.length,labels:labels.length,
  paintSamples:labels.reduce((n,l)=>n+l.paintSamples,0),occluded:0,
  cardStates:receipts.cardViews.reduce((n,s)=>n+s.cards.length,0)}));
})().catch(error=>{console.error(error);process.exitCode=1;});
