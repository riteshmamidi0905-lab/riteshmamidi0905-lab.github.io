import {esc,input,select,money} from './builder-common.js';
import {catalog,events,addEntry,eventDay,paymentBook} from './studio-ledger.js';
import {fieldDay,metric,recordButton,rows} from './studio-store.js';
import {analytics} from './studio-insights.js';

export const slots=['09:00','10:00','11:00','13:00','14:00','15:00'];
const selectFrom=(xs,fn)=>Object.fromEntries(xs.map(x=>[x,fn(x)]));
export function operationsRecords(b,a,book){
 const bookings=events(b).filter(e=>e.type==='booking');
 const closed=events(b).filter(e=>e.type==='service');
 const appointments=bookings.map(e=>({...e,settled:closed.find(c=>c.booking===e.id)}));
 const occupied=appointments.length,available=b.values.staff*slots.length*28,attended=closed.filter(e=>!e.noShow).length;
 const records={'SERVICE-CAPACITY':{id:'SERVICE-CAPACITY',kind:'Appointment capacity for 28 days',occupied,available,attended,utilization:occupied/available,sources:bookings.map(e=>e.id)}};
 const shifts=events(b).filter(e=>e.type==='shift');const day=events(b).at(-1)?.day||1;
 for(const v of catalog(b)){
   const id='STOCK-'+v.id,stock=book.days[day-1].inventory[v.id],point=b.studio?.reorder?.[v.id]??8;
   records[id]={id,kind:'Current online variant availability',day,variant:v.id,stock,reorderPoint:point,leadDays:2+b.lead,reorder:stock<=point,
    sources:['SHOP-OPEN',...book.stockMoves.filter(k=>book.records[k].variant===v.id&&book.records[k].day<=day),...events(b).filter(e=>e.type==='lost'&&e.variant===v.id).map(e=>e.id)]};
 }
 return {records,appointments,occupied,available,attended,shifts,day};
}
export function operationsBody(b,r){
 const book=paymentBook(b,r),a=analytics(b,r,book),o=operationsRecords(b,a,book),v=catalog(b),names=Object.fromEntries(v.map(x=>[x.id,x.name+' · '+x.variant]));
 const open=o.appointments.filter(e=>!e.settled),service=b.values.type==='salon'||b.studio?.bookingEnabled;
 const field=(k,label,n,min,max)=>input(k,label,n,'type="number" min="'+min+'" max="'+max+'" required');
 return '<h2>Service and supply</h2><div class="metrics">'+metric('Booked slots',o.occupied+' / '+o.available,'SERVICE-CAPACITY')+metric('Channel labor',money(book.balances.labor),'SHOP-D28')+metric('Deposit liability',money(-book.balances.deposits),'SHOP-D28')+'</div>'+
 '<h3>Appointments</h3>'+(service?'<form data-sform="booking">'+fieldDay(b)+field('when','Appointment day',o.day,o.day,28)+select('slot','One-hour slot',selectFrom(slots,x=>x),slots[0])+select('staff','Staff position',selectFrom(Array.from({length:b.values.staff},(_,i)=>String(i+1)),x=>'Position '+x),'1')+select('item','Service',Object.fromEntries(b.items.map(i=>[i.id,i.name])),b.items[0].id)+'<button>Reserve synthetic appointment</button></form>':'<p>Bookings are optional for this business.</p><button type="button" data-studio="enable-bookings">Enable service appointments</button>')+
 (o.appointments.length?rows(['Appointment','Day / time','Position','Reminder','Status'],o.appointments.map(e=>[recordButton(e.id),e.when+' · '+e.slot,e.staff,'Simulated · Day '+Math.max(e.day,e.when-1),e.settled?(e.settled.noShow?'No-show':'Completed'):'Reserved'])):'')+
 (open.length?'<form data-sform="settle">'+select('booking','Reservation',selectFrom(open.map(e=>e.id),x=>x),open[0].id)+fieldDay(b)+select('outcome','Outcome',{completed:'Completed',missed:'No-show'},'completed')+'<button>Record outcome</button></form>':'')+
 '<p>Each staff position offers six one-hour slots per day. A 20% simulated deposit is held until service. A no-show forfeits only the deposit. There are no customer contact fields.</p>'+
 '<h3>Inventory and suppliers</h3>'+rows(['Variant','Units','Reorder at','Lead time'],v.map(x=>{const z=o.records['STOCK-'+x.id];return [recordButton(z.id,names[x.id]),z.stock,z.reorderPoint+' · '+(z.reorder?'reorder':'covered'),z.leadDays+' days'];}))+
 '<form data-sform="supply">'+select('variant','Variant',names,v[0].id)+fieldDay(b)+field('units','Units',12,1,999)+field('point','Reorder point',8,0,999)+select('operation','Supply action',{purchase:'Order from supplier',rule:'Set reorder point',lost:'Record unfilled demand'},'purchase')+'<button>Apply supply action</button></form>'+
 '<h3>Incremental online shifts</h3><p>Schedule packing or service labor against forecast orders. Each labor-hour covers four orders at $18.50 per hour. Excess demand is a projected walkout, separate from posted sales.</p>'+
 '<form data-sform="shift">'+fieldDay(b)+field('positions','Positions',1,1,12)+field('hours','Shift hours',4,1,12)+'<button>Schedule shift</button></form>'+
 (o.shifts.length?rows(['Day','Forecast','Capacity','Projected walkouts','Labor cost'],o.shifts.map(x=>[recordButton(x.id,'Day '+x.day),x.forecast,x.capacity,Math.max(0,x.forecast-x.capacity),money(x.wages)])):'');
}
export function operationsEvent(kind,f,b,r){
 const day=Number(f.day);
 if(kind==='enable-bookings'){b.studio.bookingEnabled=true;return 'save';}
 if(kind==='booking'){
   eventDay(b,day);const when=Number(f.when),staff=Number(f.staff),item=b.items.find(i=>i.id===f.item);
   if(!item||!Number.isInteger(when)||when<day||when>28||!slots.includes(f.slot)||!Number.isInteger(staff)||staff<1||staff>b.values.staff)throw Error('Choose an available staff position and future simulation slot.');
   if(events(b).some(e=>e.type==='booking'&&e.when===when&&e.slot===f.slot&&e.staff===staff))throw Error('That staff position is already reserved for this slot.');
   addEntry(b,{type:'booking',day,when,staff,slot:f.slot,item:item.id,price:item.price,deposit:Math.round(item.price*.2)});return 'save';
 }
 if(kind==='settle'){
   const e=events(b).find(e=>e.type==='booking'&&e.id===f.booking);
   if(!e||day<e.when||events(b).some(x=>x.type==='service'&&x.booking===e.id))throw Error('A reservation can close once, on or after its appointment day.');
   addEntry(b,{type:'service',day,booking:e.id,price:e.price,deposit:e.deposit,noShow:f.outcome==='missed'});return 'save';
 }
 if(kind==='supply'){
   eventDay(b,day);const v=catalog(b).find(i=>i.id===f.variant),units=Number(f.units),point=Number(f.point);
   if(!v||!Number.isSafeInteger(units)||units<1||units>999||!Number.isSafeInteger(point)||point<0||point>999)throw Error('Check the inventory quantities.');
   if(f.operation==='rule'){b.studio.reorder={...b.studio.reorder,[v.id]:point};return 'save';}
   if(f.operation==='lost'){
     const available=paymentBook(b).days[day-1].inventory[v.id];if(units<=available)throw Error('Available stock covers this request.');
     addEntry(b,{day,type:'lost',variant:v.id,units,loss:(units-available)*(v.price-v.cost)});return 'save';
   }
   addEntry(b,{type:'purchase',day,variant:v.id,units,cents:units*v.cost,arrives:day+2+b.lead});return 'save';
 }
 if(kind==='shift'){
   eventDay(b,day);const positions=Number(f.positions),hours=Number(f.hours);
   if(!Number.isSafeInteger(positions)||positions<1||positions>12||!Number.isSafeInteger(hours)||hours<1||hours>12||events(b).some(e=>e.type==='shift'&&e.day===day))throw Error('Choose one valid shift per day.');
   const forecast=analytics(b,r).days[day-1];
   addEntry(b,{type:'shift',day,positions,hours,capacity:positions*hours*4,wages:positions*hours*1850,forecast:forecast.orders,source:forecast.id});return 'save';
 }
}
