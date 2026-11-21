import {visitStream} from './studio-sessions.js';

// All postings use integer cents. Debit balances are positive, credits negative.
export const paymentTerms={taxBps:825,processingBps:290,fixedFee:30,disputeFee:1500,delivery:495};
const qty=(n,max)=>Number.isInteger(n)&&n>0&&n<=max;
const bp=(n,rate)=>Math.round(n*rate/10000);
export function catalog(b){
 const rows=b.items.flatMap(i=>['Standard','Plus'].map((variant,n)=>({id:i.id+'-'+(n+1),item:i.id,name:i.name,variant,collection:n?'Select':'Everyday',
   price:i.price+(n?200:0),cost:i.cost+(n?90:0),stock:n?12:24})));
 return rows.map(r=>({...r,...b.studio?.catalog?.[r.id]}));
}
export const discounts={WELCOME10:1000,LOCAL5:500};
export function cartQuote(b,lines,method='pickup',code=''){
 if(!['pickup','shipping'].includes(method)||code&&!Object.hasOwn(discounts,code))throw Error('Select a delivery method and a listed discount.');
 if(!Array.isArray(lines)||!lines.length||lines.length>48||new Set(lines.map(l=>l.id)).size!==lines.length)throw Error('Add at least one distinct variant to the cart.');
 const rows=catalog(b);
 const items=lines.map(l=>{const item=rows.find(i=>i.id===l.id);if(!item||!qty(l.units,999))throw Error('Check the variant and quantity.');
 return {id:item.id,name:item.name,variant:item.variant,units:l.units,price:item.price,cost:item.cost};});
 const subtotal=items.reduce((n,i)=>n+i.price*i.units,0),rebate=bp(subtotal,discounts[code]||0);
 const sale=subtotal-rebate,shipping=method==='shipping'?paymentTerms.delivery:0,tax=bp(sale,paymentTerms.taxBps);
 const total=sale+shipping+tax;
 return {items,subtotal,rebate,sale,shipping,tax,total,fee:bp(total,paymentTerms.processingBps)+paymentTerms.fixedFee,cogs:items.reduce((n,i)=>n+i.cost*i.units,0),method,code};
}
export const events=b=>b.studio?.events??[];
export function eventDay(b,requested){
 const min=events(b).at(-1)?.day||1;
 if(!Number.isInteger(requested)||requested<min||requested>28)throw Error('Choose a simulation day from '+min+' to 28. Posted days cannot be backdated.');
 return requested;
}
export function addEntry(b,event){
 eventDay(b,event.day);const id='SHOP-'+String(events(b).length+1).padStart(4,'0');
 b.studio??={};
 if(!b.studio.openingCatalog)b.studio.openingCatalog=catalog(b).map(({id,cost,stock})=>({id,cost,stock}));
 b.studio.events=[...events(b),{...event,id}];return id;
}
function takeStock(lots,units){
 let due=units,cost=0;
 for(const lot of lots){const used=Math.min(lot.units,due);cost+=used*lot.cost;lot.units-=used;due-=used;if(!due)break;}
 if(due)throw Error('Insufficient valued inventory.');
 return cost;
}
export function placeOrder(b,lines,day,method,code){
 eventDay(b,day);const q=cartQuote(b,lines,method,code),close=paymentBook(b).days[day-1],inventory=close.inventory;
 for(const item of q.items)if(item.units>inventory[item.id])throw Error('Insufficient stock for '+item.name+' · '+item.variant+'.');
 q.cogs=q.items.reduce((sum,line)=>sum+takeStock(structuredClone(close.lots[line.id]),line.units),0);
 return addEntry(b,{day,type:'order',quote:q});
}
export function adjustOrder(b,id,type,cents,day){
 if(!['refund','dispute'].includes(type))throw Error('Select a return or dispute.');
 const book=paymentBook(b),o=book.orders.find(x=>x.id===id);
 if(!o||o.origin!=='Manual'||!qty(cents,o.remaining)||type==='dispute'&&cents!==o.remaining)throw Error('The amount must fit the unsettled portion of this order.');
 return addEntry(b,{day,type,order:id,cents});
}
const accounts=['cash','clearing','stockValue','equity','sales','shippingRevenue','tax','goods','delivery','processing','returns','disputes','labor','deposits','bookingRevenue'];
function planOnlineOrders(b,sessions){
 const days=Array.from({length:29},()=>[]),weeks=new Map();
 let conversions=0;
 for(const s of sessions){
   if(!s.ordered)continue;
   const quote=cartQuote(b,[{id:s.sku+'-1',units:1}]);
   s.value=quote.sale;
   const item=quote.items[0],first=s.day-(s.day-1)%7,receipt='WEB-SUPPLY-'+first+'-'+item.id;
   const lot=weeks.get(receipt)??{id:receipt,day:first,type:'reservedReceipt',variant:item.id,units:0,cost:item.cost};
   lot.units++;weeks.set(receipt,lot);
   days[s.day].push({id:s.orderId,day:s.day,type:'order',quote,session:s.id,receipt});
   conversions++;
   // Systematic sampling gives reproducible rates, independent of manual orders.
   const dispute=conversions%100===99,refund=conversions%25===0;
   if(dispute||refund){
     const day=Math.min(28,s.day+2);
     days[day].push({id:s.orderId+(dispute?'-DISPUTE':'-REFUND'),day,type:dispute?'dispute':'refund',
       order:s.orderId,cents:refund&&conversions%50===0?Math.max(1,Math.round(quote.total/2)):quote.total});
   }
 }
 for(const lot of weeks.values())days[lot.day].unshift(lot);
 return days;
}

export function paymentBook(b,operating){
 const sessions=visitStream(b,operating),planned=planOnlineOrders(b,sessions);
 const list=b.studio?.openingCatalog??catalog(b),stock=Object.fromEntries(list.map(i=>[i.id,i.stock])),stockCost=list.reduce((n,i)=>n+i.stock*i.cost,0);
 const lots=Object.fromEntries(list.map(i=>[i.id,[{units:i.stock,cost:i.cost}]]));
 const balances=Object.fromEntries(accounts.map(k=>[k,0])),records={},orders=[],days=[],stockMoves=[],payouts=[];
 const currentCosts=new Map(catalog(b).map(i=>[i.id,i.cost]));
 const reserved=Object.fromEntries(list.map(i=>[i.id,0]));
 balances.stockValue=stockCost;balances.equity=-stockCost;
 records['SHOP-OPEN']={id:'SHOP-OPEN',kind:'Opening inventory funded by owner equity',stock:{...stock},stockCost};
 let lastIncome=0,collected=0,remitted=0;
 const income=()=>-(balances.sales+balances.shippingRevenue+balances.bookingRevenue+balances.goods+balances.delivery+balances.processing+balances.returns+balances.disputes+balances.labor);
 for(let day=1;day<=28;day++){
   const ids=[];
   function post(id,kind,lines,detail={}){
     if(Object.values(lines).some(n=>!Number.isSafeInteger(n))||Object.values(lines).reduce((n,v)=>n+v,0)!==0)throw Error('Unbalanced journal '+id);
     for(const [k,n] of Object.entries(lines)){if(!Object.hasOwn(balances,k))throw Error('Unknown journal field');balances[k]+=n;}
     records[id]={id,day,kind,postings:lines,...detail};ids.push(id);
   }
   for(const order of events(b).filter(e=>e.type==='purchase'&&e.arrives===day)){
     const id=order.id+'-RECEIPT';stock[order.variant]+=order.units;lots[order.variant].push({units:order.units,cost:order.cents/order.units});
     post(id,'Supplier receipt',{stockValue:order.cents,cash:-order.cents},{variant:order.variant,units:order.units,sources:[order.id]});stockMoves.push(id);
   }
   for(const e of [...planned[day],...events(b).filter(e=>e.day===day)]){
     if(e.type==='reservedReceipt'){
       const cost=e.units*e.cost;reserved[e.variant]+=e.units;
       post(e.id,'Weekly supplier receipt for session orders',{cash:-cost,stockValue:cost},
         {variant:e.variant,units:e.units,unitCost:e.cost,change:e.units});
       stockMoves.push(e.id);continue;
     }
     if(e.type==='order'){
       const q=e.quote;const issued=e.session?q.cogs:q.items.reduce((n,line)=>n+takeStock(lots[line.id],line.units),0);
       if(issued!==q.cogs)throw Error('Inventory cost and checkout journal disagree.');
       post(e.id,'Simulated checkout',{clearing:q.total-q.fee,sales:-q.sale,shippingRevenue:-q.shipping,tax:-q.tax,processing:q.fee,goods:q.cogs,stockValue:-q.cogs,delivery:q.shipping,cash:-q.shipping},{quote:q,origin:e.session?'Session':'Manual',sources:e.session?[e.session,e.receipt]:[]});
       collected+=q.tax;
       const pool=e.session?reserved:stock;
       for(const line of q.items){pool[line.id]-=line.units;if(pool[line.id]<0)throw Error('Negative variant stock');const id=e.id+'-'+line.id;
         records[id]={id,day,kind:'Fulfilled inventory movement',variant:line.id,change:-line.units,remaining:pool[line.id],allocation:e.session?'session reserve':'available',sources:[e.id]};stockMoves.push(id);ids.push(id);}
       orders.push({id:e.id,day,origin:e.session?'Session':'Manual',session:e.session,total:q.total,remaining:q.total,tax:q.tax,returnedTax:0});
     }else if(e.type==='refund'||e.type==='dispute'){
       const order=orders.find(o=>o.id===e.order);
       if(!order||!qty(e.cents,order.remaining))throw Error('Invalid reversal '+e.id);
       order.remaining-=e.cents;
       const taxToDate=Math.round(order.tax*(order.total-order.remaining)/order.total);
       const tax=taxToDate-order.returnedTax;order.returnedTax=taxToDate;
       const fee=e.type==='dispute'?paymentTerms.disputeFee:0;
       post(e.id,e.type==='refund'?'Simulated refund':'Simulated chargeback',{returns:e.cents-tax,tax,disputes:fee,clearing:-e.cents-fee},{sources:[e.order],amount:e.cents,tax,fee});collected-=tax;
     }else if(e.type==='purchase'){
       post(e.id,'Supplier purchase commitment',{}, {variant:e.variant,units:e.units,arrives:e.arrives,plannedCost:e.cents});
     }else if(e.type==='lost'){
       post(e.id,'Unfilled online order · stockout',{}, {variant:e.variant,units:e.units,available:stock[e.variant],lostContribution:e.loss,sources:['SHOP-OPEN',...stockMoves.filter(id=>records[id].variant===e.variant)]});
     }else if(e.type==='shift'){
       post(e.id,'Incremental online shift',{labor:e.wages,cash:-e.wages},{positions:e.positions,hours:e.hours,forecast:e.forecast,capacity:e.capacity,modeledWalkouts:Math.max(0,e.forecast-e.capacity),sources:[e.source]});
     }else if(e.type==='booking'){
       post(e.id,'Simulated appointment deposit',{clearing:e.deposit,deposits:-e.deposit},{appointment:e.slot,staff:e.staff,appointmentDay:e.when,price:e.price,reminder:'Simulated reminder one day before, or on booking day for same-day service.'});
     }else if(e.type==='service'){
       const due=e.noShow?0:e.price-e.deposit,earned=e.noShow?e.deposit:e.price;
       post(e.id,e.noShow?'No-show with retained deposit':'Completed simulated service',{clearing:due,deposits:e.deposit,bookingRevenue:-earned},{sources:[e.booking],noShow:e.noShow});
     }else throw Error('Unrecognized commerce journal type.');
   }
   if(day%7===0){
     const week=Object.values(records).filter(r=>r.day>day-7&&r.day<=day&&r.postings);
     const tax=-balances.tax;post('TAX-'+day,'Weekly sales tax settlement',{tax,cash:-tax},{amount:tax,sources:week.filter(r=>r.postings.tax).map(r=>r.id)});remitted+=tax;
     const amount=balances.clearing;const id='PAYOUT-'+day;post(id,'Weekly processor payout',{cash:amount,clearing:-amount},{amount,sources:week.filter(r=>r.postings.clearing).map(r=>r.id)});payouts.push(id);
   }
   const variance=Object.values(balances).reduce((n,v)=>n+v,0),id='SHOP-D'+String(day).padStart(2,'0');
   const value=Object.values(lots).flat().reduce((n,lot)=>n+lot.units*lot.cost,0);
   const reservedValue=Object.entries(reserved).reduce((sum,[id,n])=>sum+n*(currentCosts.get(id)??0),0);
   if(value+reservedValue!==balances.stockValue)throw Error('Stock valuation and daily balance disagree.');
   if(variance!==0)throw Error('Daily ledger failed to balance.');
   const current=income();records[id]={id,day,kind:'Store channel close',income:current-lastIncome,cumulativeIncome:current,variance,balances:{...balances},inventory:{...stock},reserved:{...reserved},lots:structuredClone(lots),sources:ids.length?ids:[day===1?'SHOP-OPEN':'SHOP-D'+String(day-1).padStart(2,'0')]};
   lastIncome=current;days.push(records[id]);
 }
 const netSettled=Object.values(records).filter(r=>!payouts.includes(r.id)).reduce((n,r)=>n+(r.postings?.clearing??0),0);
 if(netSettled!==payouts.reduce((n,id)=>n+records[id].amount,0))throw Error('Weekly payouts differ from processor settlements.');
 return {balances,records,orders,days,stock,reserved,stockMoves,payouts,netSettled,sessions,income:income(),collected,remitted,variance:days.at(-1).variance};
}
