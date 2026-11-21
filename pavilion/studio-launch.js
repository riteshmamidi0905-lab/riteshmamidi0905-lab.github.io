import {analytics} from './studio-insights.js';
import {catalog,cartQuote,events,paymentBook} from './studio-ledger.js';
import {rows,recordButton} from './studio-store.js';
import {money,esc} from './builder-common.js';
export function launchCase(b,r,spike,a=analytics(b,r),book=paymentBook(b)){
 const day=events(b).at(-1)?.day||1,traffic=a.days[day-1],factor=spike?10:1;
 const shift=events(b).find(x=>x.type==='shift'&&x.day===day),usual=shift?.positions??b.values.staff,hours=shift?.hours??6,staff=Math.max(0,usual-(spike?1:0));
 const variants=catalog(b),stock={...book.days[day-1].inventory},records={},prefix=spike?'SPIKE':'NORMAL',id='LAUNCH-'+prefix;
 const demand=traffic.orders*factor,capacity=staff*hours*4,disputesRate=spike?.2:.02;
 let served=0,lostStaff=0,lostStock=0,sales=0,cogs=0,fees=0,reversals=0,disputes=0,tax=0;
 for(let i=0;i<demand;i++){
   const v=variants[i%variants.length];
   if(served>=capacity){lostStaff++;continue;}
   if(stock[v.id]===0){lostStock++;continue;}
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
 records[id]={id,kind:'Isolated launch-day sensitivity',day,sessions:traffic.sessions*factor,demand,served,lostStock,lostStaff,sales,cogs,fees,wages,reversals,income,disputes,sources:Object.keys(records)};
 return {summary:records[id],records,fixes};
}
export function launchBody(b,r){
 const a=analytics(b,r),book=paymentBook(b),base=launchCase(b,r,false,a,book),stress=launchCase(b,r,true,a,book);
 const fields=[['Sessions','sessions'],['Checkout requests','demand'],['Fulfilled','served'],['Stockouts','lostStock'],['Staff walkouts','lostStaff'],['Disputes','disputes'],['Operating income','income']];
 return '<h2>Launch-day stress test</h2><p>Day '+base.summary.day+' under normal demand and a 10× spike. The spike removes one position, limits each variant to on-hand stock and disputes 20% of fulfilled orders. The baseline disputes 2%. This side-by-side scenario leaves posted books untouched.</p>'+
 rows(['Measure','Normal launch','Stressed launch'],fields.map(([name,k])=>[name,...[base,stress].map(x=>recordButton(x.summary.id,k==='income'?money(x.summary[k]):String(x.summary[k])))]))+
 '<h3>What breaks first</h3><ul>'+stress.fixes.map(f=>'<li>'+esc(f.text)+' '+recordButton(f.source,'Source')+'</li>').join('')+'</ul><p>Requests rotate across catalog variants. Each position can fulfill four an hour. Unserved orders are classified once. Income deducts COGS, payroll, processor fees and dispute losses.</p>';
}
