import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {newPlan,inferPlan,checkPlan,types} from '../pavilion/builder-plan.js';
import {createBusiness,operatingLedger,totals} from '../pavilion/builder-ledger.js';
import {calculate,sourceFor} from '../pavilion/builder-results.js';
import {funnel,channels,validateCampaign,dayOf,dateOf} from '../pavilion/builder-market.js';
import {websiteHTML,mountWebsitePreview,domainIdeas,themes} from '../pavilion/builder-site.js';
import {BusinessLibrary} from '../pavilion/builder-library.js';
const make=type=>createBusiness(newPlan(type));
function campaign(b,options={}){
 const venue=b.values.type==='stadium';
 return {id:'C-1',channel:venue?'venue':'social',audience:'local',item:b.items[0].id,...(venue?{vendor:b.items[0].id}:{}),offer:'Opening offer',budget:28000,start:1,end:28,discount:15,...options};
}
test('seven presets and source parser carry explicit questions, city evidence and vendor IDs',()=>{
 for(const type of Object.keys(types))assert.doesNotThrow(()=>checkPlan(newPlan(type).values));
 const p=inferPlan('An arena in Austin');assert.equal(p.values.type,'stadium');assert.equal(p.status.city,'parsed');assert.ok(p.questions.mix);
 const q=inferPlan('A Reykjavik salon');assert.ok(q.questions.city);assert.match(q.values.city,/Reykjavik/i);
 assert.deepEqual(inferPlan('A stadium with coffee and merchandise').values.mix,['MERCH','COFFEE']);
});
test('all seven marketing channels have deterministic diminishing marginal reach',()=>{
 for(const channel of Object.keys(channels)){
   const c={channel,audience:'local'},f=n=>funnel(c,n,1);
   assert.deepEqual(f(10000),f(10000));assert.ok(f(20000).reach>f(10000).reach);
   assert.ok(f(30000).reach-f(20000).reach<f(20000).reach-f(10000).reach);
   assert.ok(f(10000).visits<=f(10000).reach);assert.equal(f(10000).conversions,f(10000).newRequests+f(10000).existingRequests);
   assert.ok(funnel(c,40000,4,'fatigue').visits<funnel(c,40000,1,'fatigue').visits);
 }
});
for(const type of Object.keys(types))test(type+' · 28 daily campaign postings reconcile to the counterfactual and source records',()=>{
 const b=make(type),base=calculate(b);b.campaigns.push(campaign(b));const r=calculate(b),a=r.attribution;
 assert.equal(r.days.length,28);assert.equal(r.weeks.length,4);
 assert.equal(a.net,r.total.income-base.total.income);assert.equal(a.net,a.incrementalRevenue-a.incrementalCost-a.otherChange-a.spend-a.rebates);
 assert.equal(a.spend,28000);assert.equal(r.events.length%4,0);assert.deepEqual(r.days,calculate(b).days);
 for(const d of r.days){
   assert.equal(d.variance,0);const close=r.records[d.id];assert.equal(close.income-close.baselineIncome,close.netEffect);
   for(const id of close.sources)assert.ok(sourceFor(r,id),id);assert.ok(sourceFor(r,close.baselineSource));
 }
 for(const rec of Object.values(r.records).filter(x=>x.kind==='Simulated cash journal'))assert.equal(rec.debits.adExpense+rec.debits.promotionalDiscount,rec.credits.cash);
 for(const event of r.events)assert.ok(sourceFor(r,event.record));
 if(type==='stadium'){assert.equal(r.days.filter(d=>d.event!=='Off day').length,9);assert.ok(r.events.every(e=>r.days[e.day-1].event!=='Off day'));}
});
test('discounts and promo overload reduce margin; redemptions never exceed sold units',()=>{
 const b=make('coffee');b.campaigns=[campaign(b,{channel:'email',budget:95000,discount:0}),campaign(b,{id:'C-2',channel:'sms',budget:95000,discount:0})];
 const zero=calculate(b);for(const c of b.campaigns)c.discount=35;const after=calculate(b),overload=calculate(b,'overload');
 assert.ok(after.attribution.rebates>0);assert.equal(zero.total.income-after.total.income,after.attribution.rebates);
 assert.ok(overload.total.income<after.total.income);for(const d of after.days){const used=Object.values(after.records).filter(r=>r.kind==='Campaign funnel and fulfilled redemptions'&&r.day===d.day).reduce((s,r)=>s+r.existing+r.newServed,0);assert.ok(used<=d.saleUnits[b.items[0].id]);}
});
test('service limits distinguish purchase intentions from actual fulfilled demand',()=>{
 const b=make('salon');b.values.staff=1;b.campaigns=[campaign(b,{channel:'search',budget:400000,discount:20})];
 const r=calculate(b);assert.ok(r.attribution.requests>r.attribution.newServed+r.attribution.existing);
});
test('edited SKU costs and prices reach real recipes and change income, while previous settings stay immutable',()=>{
 const b=make('coffee'),first=operatingLedger(b),copy=structuredClone(b),item=copy.items[2];item.price+=185;item.cost+=43;copy.lead=1;copy.stock=125;
 const next=operatingLedger(copy);assert.equal(next.records[item.id].priceCents,item.price);assert.equal(next.records['MAT-3'].unitCostCents,item.cost);
 assert.notEqual(totals(first.days).income,totals(next.days).income);assert.ok(next.days.every(d=>d.variance===0));assert.equal(first.records[item.id].priceCents,b.items[2].price);
});
test('venue settings and vendor-specific offer post to the correct independent account',()=>{
 const b=make('stadium'),first=operatingLedger(b);b.items[0].price+=100;b.values.staff=3;b.values.size='6500 seats';b.lead=1;b.stock=150;
 const edited=operatingLedger(b);assert.equal(edited.records['D03-EVENT'].capacity,6500);assert.equal(edited.records['D03-FOOD-A-HALF'].unitPriceCents,b.items[0].price);
 assert.equal(edited.records['D03-FOOD-A-HALF'].onDuty,3);assert.notEqual(first.days[5].inventory['FOOD-A'],edited.days[5].inventory['FOOD-A']);
 assert.throws(()=>validateCampaign(campaign(b,{vendor:'MERCH'}),b));assert.equal(edited.days.filter(d=>d.variance!==0).length,0);
 b.values.hours='Weekdays 12:00–17:30; Weekends 10:00–16:00';const dayPlan=operatingLedger(b);assert.ok(dayPlan.records['D06-FOOD-A-HALF'].serviceCapacity>dayPlan.records['D03-FOOD-A-HALF'].serviceCapacity);
});
test('calendar bounds and event-only spending are explicit; invalid/inactive plans fail before saving',()=>{
 assert.equal(dayOf(dateOf(28)),28);const b=make('stadium');b.campaigns=[campaign(b,{start:1,end:1})];assert.throws(()=>calculate(b),/event/);
 const c=make('salon');assert.throws(()=>validateCampaign(campaign(c,{channel:'venue'}),c));assert.throws(()=>validateCampaign(campaign(c,{discount:90}),c));
});
test('three themed exports parse as standalone documents with safe text, no remote references and valid day-scoped offers',()=>{
 const b=make('stadium');b.campaigns=[campaign(b,{start:3,end:6})];b.site.title='Name <img src=x>';b.site.story='Brass & limestone';b.site.accent='red;display:none';
 const styles=new Set();
 for(const theme of Object.keys(themes)){b.site.theme=theme;const {document:d}=parseHTML(websiteHTML(b,3));assert.equal(d.querySelector('h1').textContent,b.site.title);
   assert.equal(d.querySelectorAll('script,img,link,form,[src],[href]').length,0);assert.equal(d.querySelector('.promo p').textContent.includes('East Grill'),true);
   assert.ok(!d.querySelector('style').textContent.includes('red;'));styles.add(d.querySelector('style').textContent);
 }assert.equal(styles.size,3);assert.equal(parseHTML(websiteHTML(b,2)).document.querySelector('.promo'),null);assert.deepEqual(domainIdeas('The & Café'),['thecafe.com','thecafestudio.com','visitthecafe.com']);
});
test('library preserves originals, undo/redo and duplicates with denied storage',()=>{
 const storage={get length(){throw Error('denied')},setItem(){throw Error('denied')}},l=new BusinessLibrary(storage),b=make('retail');
 l.add(b);const first=l.current,c=structuredClone(b);c.items[0].price++;l.edit(c);assert.deepEqual(l.travel('undo'),b);assert.deepEqual(l.travel('redo'),c);
 l.duplicate();assert.notEqual(l.current,first);l.reset();assert.deepEqual(l.active.business,b);assert.deepEqual(l.select(first),c);assert.equal(l.persistent,false);
});
test('builder surfaces disclose synthetic operations, reject affirmative publication/delivery claims and contain no send or checkout path',()=>{
 const files=['builder.js','builder-entry.js','builder-dashboard.js','builder-site.js','builder-campaign-view.js','builder-library.js','start.html'];
 for(const f of files){const s=readFileSync(new URL('../pavilion/'+f,import.meta.url),'utf8').replaceAll('nothing is published, charged or sent.','').replaceAll(/(?:Suggestions|suggestions) — not registered/g,'');
   assert.doesNotMatch(s,/\b(fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|checkout|payment form|has been (?:sent|published|registered)|successfully (?:sent|published|registered))\b/i,f);}
 assert.match(readFileSync(new URL('../pavilion/start.html',import.meta.url),'utf8'),/Simulation — synthetic data · nothing is published, charged or sent\./);
});

test('the gallery image, credit and section anchor are present before JavaScript loads',()=>{
 const document=parseHTML(readFileSync(new URL('../pavilion/start.html',import.meta.url),'utf8')).document;
 const image=document.querySelector('.gallery-hero img');
 const phone=document.querySelector('.gallery-hero picture source');
 assert.equal(image.getAttribute('fetchpriority'),'high');
 assert.ok(image.getAttribute('width') && image.getAttribute('height'));
 assert.match(document.querySelector('.gallery-hero figcaption').textContent,/AI-generated concept art/);
 assert.equal(document.querySelector('link[rel=preload][as=image]').getAttribute('href'),phone.getAttribute('srcset'));
 assert.ok(document.getElementById('sectors'));
 assert.ok(document.querySelector('meta[name=description]').getAttribute('content'));
});

test('storefront preview and export show the same escaped content in their own heading hierarchies',()=>{
 const b=make('stadium');b.site.title='<strong>Field & Vale</strong>';b.site.story='<aside>About the venue</aside>';
 b.campaigns=[campaign(b,{start:3,end:6,offer:'Game <em>day</em>'})];
 const preview=parseHTML('<div class="preview"></div>').document.querySelector('.preview');
 mountWebsitePreview(preview,b,3);
 const shadow=preview.shadowRoot, exported=parseHTML(websiteHTML(b,3)).document;
 assert.equal(shadow.querySelector('h3.site-title').textContent,b.site.title);
 assert.equal(exported.querySelector('h1.site-title').textContent,b.site.title);
 assert.equal(shadow.querySelector('.promo').textContent,exported.querySelector('.promo').textContent);
 assert.deepEqual([...shadow.querySelectorAll('h4')].map(n=>n.textContent),[...exported.querySelectorAll('h2')].map(n=>n.textContent));
 assert.equal(shadow.querySelector('.site-title strong,.promo em,aside,iframe,script,form,main'),null);
 mountWebsitePreview(preview,b,2);assert.equal(preview.shadowRoot.querySelector('.promo'),null);
});
