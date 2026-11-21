import {paymentBook} from './studio-ledger.js';
import {metric,rows,recordButton} from './studio-store.js';
import {money,esc} from './builder-common.js';
export function analytics(b,r,book=paymentBook(b,r)){
 const records={},sessions=book.sessions,days=[];
 for(const session of sessions)records[session.id]=session;
 const summarise=(id,kind,ss)=>{
   const orders=ss.filter(s=>s.ordered),sales=orders.reduce((sum,s)=>sum+book.records[s.orderId].quote.sale,0);
   return records[id]={id,kind,sessions:ss.length,product:ss.filter(s=>s.product).length,cart:ss.filter(s=>s.cart).length,orders:orders.length,
   revenue:sales,repeatSessions:ss.filter(s=>s.repeat).length,repeatOrders:orders.filter(s=>s.repeat).length,conversion:ss.length?orders.length/ss.length:0,aov:orders.length?Math.round(sales/orders.length):0,
   sources:ss.map(s=>s.id)};
 };
 for(let day=1;day<=28;day++){
   const today=sessions.filter(s=>s.day===day);
   days.push(summarise('TRAFFIC-D'+day,'Daily audience and digital sales projection',today));
 }
 const total=summarise('TRAFFIC-TOTAL','28-day audience model',sessions);total.sources=days.map(d=>d.id);
 function groups(labels,key,property){return labels.map(label=>{
   const rec=summarise(key+'-'+label,key+' · '+label,sessions.filter(s=>s[property]===label));return {...rec,label};
 });}
 const sources=groups(['Organic','Direct','Referral','Campaign'],'SOURCE','channel'),cohorts=groups([1,2,3,4],'COHORT','cohort'),hours=groups([...new Set(sessions.map(s=>s.hour))].sort((a,b)=>a-b),'HOUR','hour');
 const forecast=Array.from({length:4},(_,i)=>{
   const recent=days.slice(21),base=recent.reduce((n,d)=>n+d.revenue,0),mid=Math.round(base*1.02**(i+1));
   const id='FORECAST-W'+(5+i);return records[id]={id,week:i+5,kind:'Weekly digital revenue sensitivity band',low:Math.round(mid*.8),mid,high:Math.round(mid*1.2),
   basis:'Repeat the final seven-day sales mix. Assume 2% weekly growth and ±20% demand sensitivity, constant prices and sufficient stock. This is a scenario range, not a confidence interval or booked sales.',sources:recent.map(d=>d.id)};
 });
 return {records,total,days,sources,cohorts,hours,forecast,manual:book.orders.length-total.orders,
   revenue:-book.balances.sales-book.balances.shippingRevenue-book.balances.returns,settled:book.netSettled,channelIncome:book.income};
}
export function analyticsBody(b,r){
 const a=analytics(b,r),t=a.total,bar=(value,max)=>'<span class="studio-bar" style="--w:'+Math.round(100*value/Math.max(1,max))+'%"></span>';
 const group=(caption,rs)=>'<h3>'+caption+'</h3>'+rows(['Group','Sessions','Projected orders'],rs.map(x=>[recordButton(x.id,String(x.label)),bar(x.sessions,t.sessions)+x.sessions,x.orders]));
 return '<h2>Pre-launch analytics</h2><p>Anonymous seeded sessions model a possible online channel. Each converted session posts one order to the payments ledger. '+t.orders+' session orders plus '+a.manual+' manually placed orders give '+(t.orders+a.manual)+' ledger orders. Net sales including shipping after reversals: '+money(a.revenue)+'. Commerce operating income: '+money(a.channelIncome)+'.</p><div class="metrics">'+
 metric('Sessions',String(t.sessions),t.id)+metric('Conversion',(t.conversion*100).toFixed(1)+'%',t.id)+metric('Average order',money(t.aov),t.id)+metric('Returning sessions',(100*t.repeatSessions/t.sessions).toFixed(1)+'%',t.id)+'</div>'+
 '<div class="studio-columns"><section><h3>Purchase funnel</h3>'+rows(['Stage','Sessions'],[['Landing',t.sessions],['Product',t.product],['Cart',t.cart],['Order',t.orders]].map(([l,n])=>[recordButton(t.id,l),bar(n,t.sessions)+n]))+'</section><section>'+group('Traffic by source',a.sources)+'</section></div>'+
 group('Acquisition cohort · first visit week',a.cohorts)+'<details><summary>Hourly demand and source data</summary>'+group('Local hour',a.hours)+'</details>'+
 '<h3>Next four weeks</h3>'+rows(['Forecast week','Low','Central','High'],a.forecast.map(f=>[recordButton(f.id,'Week '+f.week),money(f.low),money(f.mid),money(f.high)]))+'<p>'+esc(a.forecast[0].basis)+'</p>';
}
