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
 b.studio??={};b.studio.events=[...events(b),{...event,id}];return id;
}
export function placeOrder(b,lines,day,method,code){
 eventDay(b,day);const q=cartQuote(b,lines,method,code),inventory=paymentBook(b).stock;
 for(const item of q.items)if(item.units>inventory[item.id])throw Error('Insufficient stock for '+item.name+' · '+item.variant+'.');
 return addEntry(b,{day,type:'order',quote:q});
}
export function adjustOrder(b,id,type,cents,day){
 if(!['refund','dispute'].includes(type))throw Error('Select a return or dispute.');
 const book=paymentBook(b),o=book.orders.find(x=>x.id===id);
 if(!o||!qty(cents,o.remaining)||type==='dispute'&&cents!==o.remaining)throw Error('The amount must fit the unsettled portion of this order.');
 return addEntry(b,{day,type,order:id,cents});
}
const accounts=['cash','clearing','stockValue','equity','sales','shippingRevenue','tax','goods','delivery','processing','returns','disputes','labor','deposits','bookingRevenue'];
export function paymentBook(b){
 const list=catalog(b),stock=Object.fromEntries(list.map(i=>[i.id,i.stock])),stockCost=list.reduce((n,i)=>n+i.stock*i.cost,0);
 const balances=Object.fromEntries(accounts.map(k=>[k,0])),records={},orders=[],days=[],stockMoves=[],payouts=[];
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
   for(const e of events(b).filter(e=>e.day===day)){
     if(e.type==='order'){
       const q=e.quote;post(e.id,'Simulated checkout',{clearing:q.total-q.fee,sales:-q.sale,shippingRevenue:-q.shipping,tax:-q.tax,processing:q.fee,goods:q.cogs,stockValue:-q.cogs,delivery:q.shipping,cash:-q.shipping},{quote:q});
       collected+=q.tax;
       for(const line of q.items){stock[line.id]-=line.units;if(stock[line.id]<0)throw Error('Negative variant stock');const id=e.id+'-'+line.id;
         records[id]={id,day,kind:'Fulfilled inventory movement',variant:line.id,change:-line.units,remaining:stock[line.id],sources:[e.id]};stockMoves.push(id);ids.push(id);}
       orders.push({id:e.id,day,total:q.total,remaining:q.total,tax:q.tax,returnedTax:0});
     }else if(e.type==='refund'||e.type==='dispute'){
       const order=orders.find(o=>o.id===e.order);
       if(!order||!qty(e.cents,order.remaining))throw Error('Invalid reversal '+e.id);
       order.remaining-=e.cents;
       const taxToDate=Math.round(order.tax*(order.total-order.remaining)/order.total);
       const tax=taxToDate-order.returnedTax;order.returnedTax=taxToDate;
       const fee=e.type==='dispute'?paymentTerms.disputeFee:0;
       post(e.id,e.type==='refund'?'Simulated refund':'Simulated chargeback',{returns:e.cents-tax,tax,disputes:fee,clearing:-e.cents-fee},{sources:[e.order],amount:e.cents,tax,fee});collected-=tax;
     }else if(e.type==='receipt'){
       stock[e.variant]+=e.units;post(e.id,'Supplier receipt',{stockValue:e.cents,cash:-e.cents},{variant:e.variant,units:e.units});
       stockMoves.push(e.id);
     }else if(e.type==='booking'){
       post(e.id,'Simulated appointment deposit',{clearing:e.deposit,deposits:-e.deposit},{appointment:e.slot,price:e.price});
     }else if(e.type==='service'){
       const due=e.noShow?0:e.price-e.deposit,earned=e.noShow?e.deposit:e.price;
       post(e.id,e.noShow?'No-show with retained deposit':'Completed simulated service',{clearing:due,deposits:e.deposit,bookingRevenue:-earned},{sources:[e.booking],noShow:e.noShow});
     }else throw Error('Unrecognized commerce journal type.');
   }
   if(day%7===0){
     const tax=-balances.tax;post('TAX-'+day,'Weekly sales tax settlement',{tax,cash:-tax},{amount:tax});remitted+=tax;
     const amount=balances.clearing;const id='PAYOUT-'+day;post(id,'Weekly processor payout',{cash:amount,clearing:-amount},{amount});payouts.push(id);
   }
   const variance=Object.values(balances).reduce((n,v)=>n+v,0),id='SHOP-D'+String(day).padStart(2,'0');
   if(variance!==0)throw Error('Daily ledger failed to balance.');
   const current=income();records[id]={id,day,kind:'Store channel close',income:current-lastIncome,cumulativeIncome:current,variance,balances:{...balances},sources:ids.length?ids:[day===1?'SHOP-OPEN':'SHOP-D'+String(day-1).padStart(2,'0')]};
   lastIncome=current;days.push(records[id]);
 }
 return {balances,records,orders,days,stock,stockMoves,payouts,income:income(),collected,remitted,variance:days.at(-1).variance};
}
