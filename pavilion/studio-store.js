import {esc,input,select,money} from './builder-common.js';
import {catalog,cartQuote,placeOrder,adjustOrder,paymentBook,events,discounts} from './studio-ledger.js';
import {art} from './studio-site.js';
export const storeTabs={store:'Store & checkout',payments:'Payments ledger'};
export const recordButton=(id,label=id)=>'<button class="source" type="button" data-studio="source" data-id="'+esc(id)+'">'+esc(label)+'</button>';
export const rows=(head,body)=>'<div class="scroll"><table><thead><tr>'+head.map(t=>'<th scope="col">'+esc(t)+'</th>').join('')+'</tr></thead><tbody>'+body.map(row=>'<tr>'+row.map((v,i)=>i?'<td>'+v+'</td>':'<th scope="row">'+v+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
export function fieldDay(b){return input('day','Simulation day',events(b).at(-1)?.day||1,'type="number" min="'+(events(b).at(-1)?.day||1)+'" max="28" required');}
export const metric=(title,val,id)=>'<div class="metric">'+esc(title)+'<b>'+(id?recordButton(id,val):esc(val))+'</b></div>';
export function storeBody(b,ui){
 const variants=catalog(b),book=paymentBook(b),collection=ui.collection||'All';
 const cart=ui.cart||[], quote=cart.length?cartQuote(b,cart,ui.method||'pickup',ui.code||''):null;
 const cards=variants.filter(x=>collection==='All'||x.collection===collection).map((i,n)=>'<article class="tile">'+art+'<h3>'+esc(i.name)+'</h3><p>'+esc(i.variant)+' · '+money(i.price)+' · '+book.stock[i.id]+' in stock</p><button type="button" data-studio="add-item" data-id="'+esc(i.id)+'">Add '+esc(i.variant)+' to cart</button></article>').join('');
 return '<h2>Store and checkout</h2>'+select('studio-collection','Collection',{All:'All',Everyday:'Everyday',Select:'Select'},collection)+'<div class="tiles">'+cards+'</div><h2>Cart</h2>'+
 (quote?rows(['Variant','Units','Line total'],quote.items.map(i=>[esc(i.name+' · '+i.variant),i.units,money(i.units*i.price)]))+'<div class="studio-actions"><button type="button" data-studio="clear-cart">Empty cart</button></div>'+
 '<form data-sform="checkout">'+fieldDay(b)+select('method','Fulfillment',{pickup:'Pickup',shipping:'Shipping'},ui.method||'pickup')+select('code','Discount code',{'':'None',WELCOME10:'WELCOME10 · 10%',LOCAL5:'LOCAL5 · 5%'},ui.code||'')+
 '<p>Items '+money(quote.subtotal)+' · discount '+money(quote.rebate)+' · shipping '+money(quote.shipping)+' · tax '+money(quote.tax)+' · total <strong>'+money(quote.total)+'</strong></p><button class="primary">Place simulated order</button></form>':'<p>Your cart is empty.</p>')+
 '<p>Illustrative objects represent variants. Shipping is passed through at cost. Tax is 8.25% of discounted merchandise.</p>';
}
export function paymentsBody(b,r){
 const book=paymentBook(b),a=book.balances,day='SHOP-D28';
 return '<h2>Payments ledger</h2><p>Incremental online store and appointment activity. Existing operating projection '+money(r.total.income)+' plus channel profit '+money(book.income)+' gives '+money(r.total.income+book.income)+' across both.</p><div class="metrics">'+metric('Channel operating income',money(book.income),day)+metric('Processing fees',money(a.processing),day)+metric('Net tax remitted',money(book.remitted),day)+metric('Closing trial balance',money(book.variance),day)+'</div>'+
 '<h3>Orders and reversals</h3>'+(!book.orders.length?'<p>Place a simulated order to inspect its stock movements or model a return.</p>':rows(['Order','Day','Original total','Available to reverse'],book.orders.map(o=>[recordButton(o.id),o.day,money(o.total),money(o.remaining)])))+
 (book.orders.some(o=>o.remaining)?'<form data-sform="adjust">'+select('order','Order',Object.fromEntries(book.orders.filter(o=>o.remaining).map(o=>[o.id,o.id+' · '+money(o.remaining)])),null)+select('adjust','Adjustment',{refund:'Refund amount',full:'Full remaining refund',dispute:'Chargeback of remaining amount'},'refund')+input('amount','Partial amount ($)','1.00','type="number" step=".01" min=".01"')+fieldDay(b)+'<button>Record simulated adjustment</button></form>':'')+
 '<h3>Weekly payouts</h3>'+rows(['Settlement','Amount'],book.payouts.map(id=>[recordButton(id),money(book.records[id].amount)]))+
 '<details><summary>28 daily closes and source journals</summary>'+rows(['Close','Channel income','Trial balance'],book.days.map(d=>[recordButton(d.id),money(d.income),money(d.variance)]))+'</details><p>Processor fee: 2.9% plus $0.30 per order. Reversals return tax proportionally. Fulfilled stock and the original fee are retained. A chargeback adds $15. Tax and processor balances settle every seventh day, including credits.</p>';
}
export function storeEvent(kind,el,f,b,ui){
 if(kind==='studio-collection'){ui.collection=el.value;return 'view';}
 if(kind==='add-item'){
   ui.cart??=[];const id=el.dataset.id,line=ui.cart.find(x=>x.id===id),units=1+(line?.units||0);
   if(units>paymentBook(b).stock[id])throw Error('Cart quantity exceeds available stock.');
   if(line)line.units=units;else ui.cart.push({id,units});return 'view';
 }
 if(kind==='clear-cart'){ui.cart=[];return 'view';}
 if(kind==='method'||kind==='code'){ui[kind]=el.value;return 'view';}
 if(kind==='checkout'){placeOrder(b,ui.cart,Number(f.day),f.method,f.code);ui.cart=[];ui.area='payments';return 'save';}
 if(kind==='adjust'){const o=paymentBook(b).orders.find(x=>x.id===f.order);adjustOrder(b,f.order,f.adjust==='dispute'?'dispute':'refund',f.adjust==='refund'?Math.round(Number(f.amount)*100):o.remaining,Number(f.day));return 'save';}
}
