import {analytics} from './studio-insights.js';
import {catalog,cartQuote,events,paymentBook} from './studio-ledger.js';
import {rows,recordButton} from './studio-store.js';
import {money,esc} from './builder-common.js';
export function launchCase(b,r,spike,a=analytics(b,r),book=paymentBook(b)){
 const recovered=spike==='recovered';
 const day=events(b).at(-1)?.day||1,traffic=a.days[day-1],factor=spike?10:1;
 const shift=events(b).find(x=>x.type==='shift'&&x.day===day),usual=shift?.positions??b.values.staff,hours=shift?.hours??6,staff=Math.max(0,usual-(spike?1:0))+(recovered?1:0);
 const variants=catalog(b),stock={...book.days[day-1].inventory},records={},prefix=recovered?'RECOVERED':spike?'SPIKE':'NORMAL',id='LAUNCH-'+prefix;
 const demand=traffic.orders*factor,capacity=staff*hours*4,disputesRate=spike?.2:.02;
 let lostRevenue=0,served=0,lostStaff=0,lostStock=0,sales=0,cogs=0,fees=0,reversals=0,disputes=0,tax=0;
 for(let i=0;i<demand;i++){
   const v=variants[i%variants.length];
   if(served>=capacity){lostStaff++;lostRevenue+=v.price;continue;}
   if(stock[v.id]===0){lostStock++;lostRevenue+=v.price;continue;}
   stock[v.id]--;served++;
   const q=cartQuote(b,[{id:v.id,units:1}]);sales+=q.sale;cogs+=q.cogs;fees+=q.fee;tax+=q.tax;
   if(Math.floor(served*disputesRate)>disputes){disputes++;reversals+=q.sale;fees+=1500;tax-=q.tax;}
 }
 const wages=staff*hours*1850,income=sales-reversals-cogs-fees-wages;
 const lines={traffic:{sessions:traffic.sessions*factor,requests:demand,sources:[traffic.id]},stock:{unfilled:lostStock,closing:stock,sources:[book.days[day-1].id]},staff:{positions:staff,capacity,walkouts:lostStaff,wages,sources:shift?[shift.id]:['B-RESULT']},disputes:{rate:disputesRate,disputes,returnedSales:reversals,netTax:tax,fees}};
 for(const [k,detail] of Object.entries(lines)){const key=id+'-'+k;records[key]={id:key,kind:'Launch-day '+k+' assumption and outcome',...detail};}
 const fixes=[];
 if(lostStock)fixes.push({source:id+'-stock',text:'Increase opening stock or advance the supplier receipt. '+lostStock+' requests missed an available unit.'});
 if(lostStaff)fixes.push({source:id+'-staff',text:'Add a shift or stagger pickup. '+lostStaff+' requests exceeded service capacity.'});
 if(disputes)fixes.push({source:id+'-disputes',text:'Reserve cash for '+disputes+' disputes and review the modeled order evidence.'});
 if(!fixes.length)fixes.push({source:id+'-traffic',text:'Modeled capacity covered demand. Validate the traffic assumptions before changing the plan.'});
 records[id]={id,kind:'Isolated launch-day sensitivity',day,sessions:traffic.sessions*factor,demand,served,lostStock,lostStaff,turnedAway:lostStock+lostStaff,lostRevenue,sales,cogs,fees,wages,reversals,income,disputes,sources:Object.keys(records)};
 return {summary:records[id],records,fixes};
}
export function launchBody(b,r){
 const book=paymentBook(b,r),a=analytics(b,r,book);
 const cases=[false,true,'recovered'].map(mode=>launchCase(b,r,mode,a,book));
 const [base,stress,recovery]=cases.map(c=>c.summary),saved=stress.turnedAway-recovery.turnedAway;
 const delta=recovery.income-stress.income;
 const fields=[['Sessions','sessions'],['Checkout requests','demand'],['Fulfilled','served'],['Stockouts','lostStock'],['Staff walkouts','lostStaff'],
   ['Customers turned away','turnedAway'],['Revenue lost to unserved demand','lostRevenue'],['Disputes','disputes'],['Operating income','income']];
 return '<h2>Launch-day stress test</h2><p>Day '+base.day+'. Normal operations, tenfold demand with one fewer position, and the same spike with one shift restored. Disputes rise from 2% to 20% in both spike scenarios.</p>'+
 '<p class="launch-takeaway">'+stress.turnedAway+' customers were turned away, representing '+money(stress.lostRevenue)+' in lost merchandise sales; restoring one shift serves '+saved+' more and '+(delta>=0?'raises':'reduces')+' operating income by '+money(Math.abs(delta))+' to '+money(recovery.income)+'.</p>'+
 '<div class="launch-comparison">'+rows(['Measure','Normal','10× spike','Shift restored'],fields.map(([name,k])=>[name,...cases.map(x=>recordButton(x.summary.id,['income','lostRevenue'].includes(k)?money(x.summary[k]):String(x.summary[k])))]))+'</div>'+
 '<h3>What breaks first</h3><ul>'+cases[1].fixes.map(f=>'<li>'+esc(f.text)+' '+recordButton(f.source,'Source')+'</li>').join('')+'</ul><p>Each request represents one customer and one catalog unit. Lost revenue uses the price of the exact unserved variant, before tax. The extra position costs '+money((events(b).find(x=>x.type==='shift'&&x.day===base.day)?.hours??6)*1850)+' for the shift. Both spike scenarios use identical stock and demand. Scenario results leave the books intact.</p>';
}
