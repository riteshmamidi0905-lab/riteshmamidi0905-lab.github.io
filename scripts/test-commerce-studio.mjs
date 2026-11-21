import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlan} from '../pavilion/builder-plan.js';
import {createBusiness} from '../pavilion/builder-ledger.js';
import {calculate,sourceFor} from '../pavilion/builder-results.js';
import {catalog,paymentBook,cartQuote,placeOrder,adjustOrder} from '../pavilion/studio-ledger.js';
import {siteDesign,publicSite,encodeSite,decodeSite,staticFile,domainSearch} from '../pavilion/studio-site.js';
import {analytics} from '../pavilion/studio-insights.js';
import {growRecords,growthEvent,searchRecord} from '../pavilion/studio-growth.js';
import {operationsEvent} from '../pavilion/studio-operations.js';
import {compose} from '../pavilion/studio-copy.js';
import {launchCase} from '../pavilion/studio-launch.js';
const business=(type='coffee')=>({...createBusiness(newPlan(type)),studio:{}});
test('Portable site round-trips Unicode and ordered pages without including the private ledger',()=>{
 const b=business();b.site.title='Café Luz';b.studio.design=siteDesign(b);placeOrder(b,[{id:catalog(b)[0].id,units:1}],1,'pickup','');
 const site=publicSite(b),key=encodeSite(site);
 assert.deepEqual(decodeSite(key),site);assert.doesNotMatch(JSON.stringify(site),/SHOP-0001|openingCatalog|budget/);
 assert.throws(()=>decodeSite('!'));assert.throws(()=>encodeSite({...site,accent:'bad'}));
 assert.match(staticFile(site),/href="#page-2"/);assert.equal(domainSearch('Café')[0].domain,'cafe.com');
});
test('Daily debits equal credits after placement, partial refund, full refund, chargeback, tax and weekly payout',()=>{
 const b=business(),variant=catalog(b)[0],lines=[{id:variant.id,units:2}];
 const seeded=paymentBook(b);
 const one=placeOrder(b,lines,1,'shipping','WELCOME10'),two=placeOrder(b,lines,2,'pickup','LOCAL5'),three=placeOrder(b,lines,3,'pickup','');
 const before=paymentBook(b);assert.equal(before.stock[variant.id],variant.stock-6);
 assert.equal(before.records[one].quote.sale,Math.round(variant.price*2*.9));
 adjustOrder(b,one,'refund',99,5);adjustOrder(b,one,'refund',before.records[one].quote.total-99,8);adjustOrder(b,two,'dispute',before.records[two].quote.total,10);
 assert.throws(()=>adjustOrder(b,two,'refund',1,11));assert.throws(()=>placeOrder(b,[{id:variant.id,units:999}],11));
 const after=paymentBook(b);assert.equal(after.days.length,28);
 assert.ok(after.days.every(d=>d.variance===0&&Object.values(d.balances).reduce((n,v)=>n+v,0)===0));assert.equal(after.collected,after.remitted);
 assert.equal(after.balances.tax,0);assert.equal(after.balances.clearing,0);assert.equal(after.payouts.length,4);assert.equal(after.balances.disputes-seeded.balances.disputes,1500);
 assert.equal(after.collected-seeded.collected,before.records[three].quote.tax);assert.deepEqual(paymentBook(b),after);
 assert.equal(after.income,before.income-(before.records[one].quote.total-before.records[one].quote.tax)-(before.records[two].quote.total-before.records[two].quote.tax)-1500);
});
test('Booking liabilities settle once, procurement respects lead times and lost demand cites stock',()=>{
 const b=business('salon'),v=catalog(b)[0],r=calculate(b);
 const f={day:1,when:2,staff:1,item:b.items[0].id,slot:'09:00'};operationsEvent('booking',f,b,r);
 assert.throws(()=>operationsEvent('booking',f,b,r));assert.throws(()=>operationsEvent('settle',{booking:'SHOP-0001',day:1,outcome:'missed'},b,r));
 operationsEvent('supply',{day:1,variant:v.id,units:40,point:8,operation:'purchase'},b,r);
 operationsEvent('supply',{day:1,variant:v.id,units:v.stock+1,point:8,operation:'lost'},b,r);
 assert.throws(()=>placeOrder(b,[{id:v.id,units:v.stock+1}],1));
 operationsEvent('settle',{booking:'SHOP-0001',day:2,outcome:'missed'},b,r);
 const book=paymentBook(b);assert.equal(book.days[0].inventory[v.id],v.stock);assert.equal(book.days[2].inventory[v.id],v.stock+40);
 assert.equal(book.balances.deposits,0);assert.equal(-book.balances.bookingRevenue,Math.round(b.items[0].price*.2));assert.ok(book.days.every(d=>!d.variance));
});
for(const type of ['coffee','salon','retail','stadium','brewery','bakery','truck'])test(type+' · attributable campaigns, seeded sessions and launch-day records',()=>{
 const b=business(type);growthEvent('outreach',{budget:70,offer:'Local opening',channel:'email',audience:'local',item:b.items[0].id,template:'opening',start:1,end:7,discount:5},b);
 const r=calculate(b),g=growRecords(b,r),v=g['REVIEW-C-1'];
 assert.equal(v.netProfit,v.netRevenueEffect+v.goodsEffect+v.operatingExpenseEffect);
 assert.ok(v.sources.every(id=>sourceFor(r,id)));const a=analytics(b,r);
 assert.deepEqual(a,analytics(b,r));assert.ok(a.total.sessions>=2000&&a.total.product>=a.total.cart&&a.total.cart>=a.total.orders);
 for(const row of Object.values(a.records))for(const id of row.sources)assert.ok(a.records[id]||g[id]||sourceFor(r,id),id);
 assert.equal(a.sources.reduce((n,s)=>n+s.orders,0),a.total.orders);
 const normal=launchCase(b,r,false,a),wave=launchCase(b,r,true,a);
 assert.equal(wave.summary.demand,10*normal.summary.demand);
 assert.equal(wave.summary.served+wave.summary.lostStaff+wave.summary.lostStock,wave.summary.demand);
 assert.ok(wave.fixes.every(f=>wave.records[f.source]));assert.deepEqual(wave,launchCase(b,r,true,a));
 assert.match(compose(b,'campaign','direct',b.items[0].id).line,/Explore/);assert.ok(searchRecord(b).score<=100);
});
test('Supplier price changes preserve issued cost on old lots',()=>{
 const b=business(),item=b.items[0],v=catalog(b)[0];
 placeOrder(b,[{id:v.id,units:v.stock-1}],1,'pickup','');const oldCost=item.cost;item.cost+=120;
 operationsEvent('supply',{day:1,variant:v.id,units:3,point:1,operation:'purchase'},b,calculate(b));
 const id=placeOrder(b,[{id:v.id,units:3}],3,'pickup',''),book=paymentBook(b);
 assert.equal(book.records[id].quote.cogs,oldCost+2*item.cost);assert.equal(book.stock[v.id],1);assert.ok(book.days.every(d=>d.variance===0));
});

import {artCategory,itemArt} from '../pavilion/studio-art.js';
test('All seven storefronts distinguish their product categories and show a functional hero and visit block',()=>{
 for(const type of ['coffee','salon','retail','stadium','brewery','bakery','truck']){
   const b=business(type),site=publicSite(b),html=staticFile(site);
   const categories=b.items.map(i=>artCategory(type,i));
   assert.equal(new Set(categories.map(itemArt)).size,b.items.length,type);
   assert.match(html,/class="shop-cta" href="#offerings-1"/);assert.match(html,/id="offerings-1"/);
   assert.ok(html.includes(site.tagline));assert.match(html,/Plan your visit/);assert.match(html,/Our story/);
   assert.doesNotMatch(html,/Unspecified/);assert.match(html,/nothing is published, charged or sent/);
 }
});
test('Every converted session posts once, payouts cover net settlement, and reserved supply reconciles',()=>{
 for(const type of ['coffee','salon','retail','stadium','brewery','bakery','truck']){
   const b=business(type),r=calculate(b),item=catalog(b)[0],manual=placeOrder(b,[{id:item.id,units:1}],1,'pickup','');
   const book=paymentBook(b,r),a=analytics(b,r,book),seeded=book.orders.filter(o=>o.origin==='Session');
   assert.ok(seeded.length>200);assert.equal(a.total.orders,seeded.length);assert.equal(book.orders.length,a.total.orders+1);
   assert.equal(a.total.revenue,seeded.reduce((v,o)=>v+book.records[o.id].quote.sale,0));
   assert.deepEqual(seeded.map(o=>o.id).sort(),book.sessions.filter(s=>s.ordered).map(s=>s.orderId).sort());
   for(const o of seeded){assert.equal(a.records[o.session].orderId,o.id);assert.ok(book.records[o.id].sources.includes(o.session));}
   assert.equal(book.stockMoves.filter(id=>book.records[id].allocation==='session reserve').length,a.total.orders);
   assert.ok(Object.values(book.reserved).every(n=>n===0));assert.equal(book.stock[item.id],item.stock-1);
   assert.equal(book.records[manual].origin,'Manual');assert.ok(book.days.every(d=>d.variance===0));
   assert.equal(book.payouts.reduce((n,id)=>n+book.records[id].amount,0),book.netSettled);
   assert.ok(book.payouts.every(id=>book.records[id].amount>0));assert.equal(book.balances.clearing,0);
   assert.equal(book.collected,book.remitted);assert.equal(a.channelIncome,book.income);
   const baseline=launchCase(b,r,false,a,book).summary,spike=launchCase(b,r,true,a,book).summary,recovery=launchCase(b,r,'recovered',a,book).summary;
   assert.equal(spike.demand,10*baseline.demand);assert.equal(recovery.demand,spike.demand);assert.ok(recovery.served>=spike.served);
   for(const row of [baseline,spike,recovery]){
    assert.equal(row.turnedAway,row.demand-row.served);assert.equal(row.turnedAway,row.lostStaff+row.lostStock);
    const vs=catalog(b),requested=Array.from({length:row.demand},(_,i)=>vs[i%vs.length].price).reduce((n,v)=>n+v,0);
    assert.equal(row.sales+row.lostRevenue,requested);assert.equal(row.income,row.sales-row.cogs-row.reversals-row.fees-row.wages);
   }
 }
});
