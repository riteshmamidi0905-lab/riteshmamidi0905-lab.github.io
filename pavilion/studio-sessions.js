import {searchRecord} from './studio-growth.js';
import {calculate} from './builder-results.js';

export function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
// A conversion carries the same ID through the funnel, inventory and processor journal.
export function visitStream(b,operating){
 if(!b.site || !b.values.type)return [];
 const sessions=[],guests=[],byDay=new Map(),search=searchRecord(b),seed=b.seed??27;
 const r=operating?.mode==='normal'?operating:b.campaigns.length?calculate(b):{records:{}};
 for(const rec of Object.values(r.records))if(rec.kind==='Campaign funnel and fulfilled redemptions'){
   const list=byDay.get(rec.day)||[];list.push(rec);byDay.set(rec.day,list);
 }
 for(let day=1;day<=28;day++){
   const week=Math.ceil(day/7),campaigns=byDay.get(day)||[];
   for(const [src,base] of [['Organic',search.organicPerDay],['Direct',50],['Referral',32],['Campaign',campaigns.reduce((n,c)=>n+c.visits,0)]]){
     const rand=rng(seed+day*21997+src.charCodeAt(0)*1337);
     const volume=src==='Campaign'?base:Math.round(base*(.8+rand()*.4)*(day%7>=5?1.12:1));
     for(let i=0;i<volume;i++){
       const repeat=guests.length>0&&rand()<.27;
       const guest=repeat?guests[Math.floor(rand()*guests.length)]:{id:'G-'+(guests.length+1),cohort:week};
       if(!repeat)guests.push(guest);
       const product=rand()<.64,cart=product&&rand()<.26,ordered=cart&&rand()<.54;
       const offering=b.items[Math.floor(rand()*b.items.length)],hour=Math.min(23,Math.floor(7+(rand()+rand())*7));
       const id='SESSION-'+day+'-'+src+'-'+(i+1);
       const s={id,kind:'Anonymous synthetic visit',day,hour,channel:src,guest:guest.id,cohort:guest.cohort,repeat,product,cart,ordered,value:ordered?offering.price:0,sku:offering.id,
         sources:src==='Campaign'?campaigns.map(c=>c.id):src==='Organic'?['SITE-SEARCH']:[]};
       if(ordered)s.orderId='WEB-'+day+'-'+src+'-'+(i+1);
       sessions.push(s);
     }
   }
 }
 return sessions;
}
