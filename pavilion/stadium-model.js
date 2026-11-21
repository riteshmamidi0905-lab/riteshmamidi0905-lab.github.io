// Fictional USD cents, whole guests and units. One seed controls attendance and demand across every comparison.
export const booths=[
 {id:'FOOD-A',name:'East Grill',category:'Food',share:58,price:1250,cost:395,rate:64,wage:2000,fee:6500},
 {id:'FOOD-B',name:'South Tacos',category:'Food',share:52,price:1180,cost:350,rate:67,wage:2000,fee:6500},
 {id:'BEER',name:'Craft Beer Cart',category:'Beer',share:42,price:975,cost:285,rate:81,wage:1950,fee:5500},
 {id:'MERCH',name:'Terrace Goods',category:'Merchandise',share:25,price:2450,cost:1150,rate:49,wage:2100,fee:7000},
 {id:'SNACK',name:'Local Snack Stand',category:'Snacks',share:54,price:675,cost:190,rate:95,wage:1850,fee:4500},
 {id:'COFFEE',name:'North Coffee Kiosk',category:'Coffee',share:36,price:595,cost:130,rate:71,wage:1900,fee:4500}
];
export const phases=[{id:'GATES',label:'Gates open',minutes:38,share:18},{id:'PRE',label:'Pre-start peak',minutes:32,share:32},{id:'HALF',label:'Halftime surge',minutes:24,share:37},{id:'CLOSE',label:'Close',minutes:30,share:13}];
export const stadiumStress={rain:'Rain-out',sellout:'Sold-out game (+30% demand)',halftime:'Halftime staffing shortage',delay:'Supplier delay before game day',cap:'Venue price cap'};
export const stadiumPolicy={capacity:8200,home:5850,concert:7580,shareBps:1200,shiftMinutes:330,vendorOverhead:1500,venueDaily:57500,homeCost:604000,concertCost:1150000,homeAdmission:225,concertAdmission:340,queuePatience:20};
export const recommended={ 'FOOD-A':5,'FOOD-B':4,BEER:3,MERCH:3,SNACK:3,COFFEE:2 };
const games=new Set([3,6,10,13,17,20,24,27]),moneyRound=Math.round;
export function calendar(day,seed=27,stress=''){
 const type=day===22?'Concert':games.has(day)?'Home game':'Off day';
 const factor=96+((seed*17+day*13)%9),forecast=type==='Off day'?0:day===20?Math.round(stadiumPolicy.capacity/1.3):Math.round((type==='Concert'?stadiumPolicy.concert:stadiumPolicy.home)*factor/100);
 let attendance=forecast;
 if(stress==='rain'&&day===13)attendance=0;
 if(stress==='sellout'&&day===20)attendance=Math.min(stadiumPolicy.capacity,Math.round(forecast*1.3));
 return {type,forecast,attendance,day,weather:stress==='rain'&&day===13?'Rain cancellation':'Normal synthetic conditions'};
}
const account=capital=>({cash:capital,stock:0,equity:-capital,sales:0,share:0,fees:0,cost:0,wages:0,operations:0,admissions:0});
function posting(book,debit,credit,cents,source){
 if(!Number.isSafeInteger(cents)||cents<0)throw Error('Invalid stadium posting');
 book.balances[debit]+=cents;book.balances[credit]-=cents;book.postings.push({debit,credit,cents,source});
}
function closeBook(book,units=0,unitCost=0){
 const a=book.balances,variance=Object.values(a).reduce((n,v)=>n+v,0);
 const net=-a.sales-a.admissions-a.cost-a.wages-a.share-a.fees-a.operations;
 const movement=book.postings.reduce((v,p)=>v+(p.debit==='cash'?p.cents:0)-(p.credit==='cash'?p.cents:0),0);
 if(variance||a.stock!==units*unitCost||book.openingCash+movement!==a.cash||a.cash+a.stock!==-a.equity+net)throw Error('Stadium book failed to reconcile');
 return {openingCash:book.openingCash,closingCash:a.cash,stockUnits:units,inventoryCents:a.stock,incomeCents:net,variance,postings:book.postings.map(p=>({...p})),balances:{...a}};
}
const begin=balances=>({balances,openingCash:balances.cash,postings:[]});
const valid=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function simulateStadium({seed=27,stress='',staff=recommended,mix=booths.map(b=>b.id)}={}){
 if(!valid(seed,1,999999)||stress&&!Object.hasOwn(stadiumStress,stress)||!Array.isArray(mix)||!mix.length||new Set(mix).size!==mix.length||mix.some(id=>!booths.some(b=>b.id===id)))throw Error('Invalid venue configuration.');
 const vendors=booths.filter(b=>mix.includes(b.id));if(vendors.some(b=>!valid(staff[b.id],1,12)))throw Error('Choose 1–12 positions for each stand.');
 const records={},events=[],days=[],state=new Map(vendors.map(b=>[b.id,{balances:account(1500000),stock:0,served:0,walkaways:0}])),venue=account(12000000);
 function record(id,kind,data){if(records[id])throw Error('Duplicate stadium source');records[id]={id,kind,...data};return id;}
 function task(day,minute,owner,action,inputs,outputs){if([...inputs,...outputs].some(id=>!records[id]))throw Error('Missing stadium source');events.push({id:'EV-ST-'+day+'-'+String(events.length+1).padStart(4,'0'),day,minute,owner,action,inputs,outputs});}
 for(let day=1;day<=28;day++){
   const prefix='D'+String(day).padStart(2,'0')+'-',event=calendar(day,seed,stress),operator=begin(venue);
   const eventId=record(prefix+'EVENT','Event calendar',{...event,capacity:stadiumPolicy.capacity});
   task(day,0,'SYNAPSE',event.attendance?'Open the event concourse':'Record the venue calendar',[ ],[eventId]);
   const admissions=event.attendance*(event.type==='Concert'?stadiumPolicy.concertAdmission:stadiumPolicy.homeAdmission);
   posting(operator,'cash','admissions',admissions,eventId);
   posting(operator,'operations','cash',stadiumPolicy.venueDaily+(event.forecast?(event.attendance?(event.type==='Concert'?stadiumPolicy.concertCost:stadiumPolicy.homeCost):Math.round(stadiumPolicy.homeCost*.25)):0),eventId);
   const closes=[],settlements=[];let shares=0,fees=0;
   for(const b of vendors){
     const s=state.get(b.id),book=begin(s.balances),id=prefix+b.id+'-',crew=staff[b.id],cost=b.cost;
     // Fixed forecast buying prevents extra staff from silently reducing supplies.
     const need=Math.round(event.attendance*b.share/1000),par=Math.ceil(event.forecast*b.share/1000*1.32);
     const ordered=Math.max(0,par-s.stock),delayed=stress==='delay'&&day===20;
     const delivered=(delayed?0:ordered)+(s.delayed||0);s.delayed=delayed?ordered:0;
     const supply=record(id+'SUPPLY','Vendor supply',{day,vendor:b.id,openingUnits:s.stock,ordered,delivered,delayed,unitCostCents:cost,forecastSource:eventId});
     s.stock+=delivered;posting(book,'stock','cash',delivered*cost,supply);
     if(ordered||delivered)task(day,5,'NEXORA','Arrange vendor supply',[eventId],[supply]);
     const forecast=record(id+'FORECAST','Stand forecast',{day,vendor:b.id,demand:need,perThousand:b.share,expectedSpendPerAttendeeCents:b.share*b.price/1000,positions:crew});
     if(event.attendance)task(day,8,'AETHON','Forecast stand demand',[eventId],[forecast]);
     let ready=Math.min(s.stock,Math.floor(crew*b.rate*2));
     if(event.attendance){const prep=record(id+'PREP','Prep release',{day,vendor:b.id,readyUnits:ready,prepWindowMinutes:120,checked:true,supplyId:supply});
       task(day,12,'VECTRA','Verify available stock',[supply],[prep]);
       if(b.category!=='Merchandise'){const qc=record(id+'CHECK','Food handling check',{day,vendor:b.id,checkedDelivery:supply,syntheticChecklistComplete:true});task(day,14,'AEGIS','Verify simulated food-handling checklist',[prep],[qc]);}}
     let distributed=0,cumulative=0,queue=0,total=0,lost=0,sales=0;const periods=[];
     for(const [i,phase] of phases.entries()){
       cumulative+=phase.share;const through=Math.round(need*cumulative/100),arrivals=through-distributed;distributed=through;
       const onDuty=event.attendance?Math.max(0,crew-(stress==='halftime'&&phase.id==='HALF'?1:0)):0;
       const capacity=Math.floor(onDuty*phase.minutes*b.rate/60),served=Math.min(queue+arrivals,capacity,ready),left=queue+arrivals-served;
       const waiting=i===phases.length-1?0:Math.floor(left*stadiumPolicy.queuePatience/100),walkaways=left-waiting;
       const price=stress==='cap'?Math.min(b.price,700):b.price,amount=served*price;
       const sale=record(id+phase.id,'Stand interval',{day,vendor:b.id,phase:phase.label,arrivals,queueIn:queue,onDuty,minutes:phase.minutes,serviceCapacity:capacity,stockBefore:s.stock,served,queueOut:waiting,walkaways,unitPriceCents:price,revenueCents:amount});
       posting(book,'cash','sales',amount,sale);posting(book,'cost','stock',served*cost,sale);s.stock-=served;ready-=served;queue=waiting;total+=served;lost+=walkaways;sales+=amount;periods.push(sale);
       if(event.attendance)task(day,[20,58,90,114][i],'SYNAPSE','Coordinate '+phase.label.toLowerCase()+' service',[forecast,supply],[sale]);
     }
     const pay=event.attendance?Math.round(crew*stadiumPolicy.shiftMinutes*b.wage/60)-(stress==='halftime'?Math.round(phases[2].minutes*b.wage/60):0):0;
     const share=moneyRound(sales*stadiumPolicy.shareBps/10000),fee=event.attendance?b.fee:0;
     const remittance=record(id+'TRANSFER','Vendor to venue settlement',{day,vendor:b.id,grossSalesCents:sales,shareCents:share,boothFeeCents:fee,sourceIntervals:periods});
     for(const [a,c] of [['share',share],['fees',fee]]){posting(book,a,'cash',c,remittance);posting(operator,'cash',a,c,remittance);}
     posting(book,'wages','cash',pay,remittance);posting(book,'operations','cash',stadiumPolicy.vendorOverhead,remittance);
     shares+=share;fees+=fee;s.served+=total;s.walkaways+=lost;
     if(total+lost!==need)throw Error('Unreconciled guests');
     const close=record(id+'CLOSE-BOOK','Vendor close',{day,vendor:b.id,served:total,walkaways:lost,cumulativeServed:s.served,cumulativeWalkaways:s.walkaways,settlementId:remittance,intervalIds:periods,...closeBook(book,s.stock,cost)});
     closes.push(close);settlements.push(remittance);
     if(lost){const feedback=record(id+'QUEUE','Queue feedback',{day,vendor:b.id,walkaways:lost,basis:'Unserved demand in the four venue intervals.'});task(day,144,'ECHON','Classify queue-related fan feedback',periods,[feedback]);}
     task(day,154,'QUANTIX','Settle vendor share and booth fee',periods,[remittance,close]);
   }
   const received=operator.postings.filter(p=>p.credit==='share').reduce((n,p)=>n+p.cents,0);
   const receivedFees=operator.postings.filter(p=>p.credit==='fees').reduce((n,p)=>n+p.cents,0);
   if(received!==shares||receivedFees!==fees)throw Error('Venue transfers do not tie');
   const close=record(prefix+'VENUE-CLOSE','Venue close',{day,attendance:event.attendance,admissionsCents:admissions,sharesCents:shares,feesCents:fees,settlementIds:settlements,vendorCloseIds:closes,...closeBook(operator)});
   task(day,158,'QUANTIX','Close the venue settlement',settlements,[close]);
   const audit=record(prefix+'AUDIT','Venue reconciliation',{day,venueCloseId:close,vendorCloseIds:closes,shareVarianceCents:received-shares,feeVarianceCents:receivedFees-fees});
   task(day,162,'VERITAS','Check daily trial balances and transfers',[close,...closes],[audit]);days.push({day,eventId,close,audit,closes});
 }
 return {seed,stress,staff:{...staff},mix:[...mix],records,events,days};
}
export function staffingSweep(seed=27){
 return booths.map(b=>{
   const rows=Array.from({length:10},(_,i)=>{const positions=i+1,m=simulateStadium({seed,staff:{[b.id]:positions},mix:[b.id]}),close=m.records[m.days.at(-1).closes[0]];
     return {positions,served:close.cumulativeServed,walkaways:close.cumulativeWalkaways,income:close.incomeCents};});
   return {id:b.id,name:b.name,rows,best:rows.reduce((a,b)=>a.income>=b.income?a:b)};
 });
}
