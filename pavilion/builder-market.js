import {operatingLedger,sum} from './builder-ledger.js';

// Synthetic rates per dollar and basis points. One scenario month starts on Monday.
export const channels={
 search:{name:'Search ads',reach:38,click:320,convert:1400,newShare:78},
 social:{name:'Social ads',reach:82,click:150,convert:900,newShare:70},
 flyers:{name:'Local flyers',reach:10,click:300,convert:1800,newShare:60},
 email:{name:'Email',reach:24,click:600,convert:1600,newShare:16},
 sms:{name:'SMS',reach:12,click:900,convert:2200,newShare:12},
 partner:{name:'Local partnership',reach:26,click:460,convert:1500,newShare:63},
 venue:{name:'In-stadium promo',reach:45,click:600,convert:2700,newShare:52}
};
export const audiences={local:'Local audience',new:'New customers',returning:'Returning customers'};
export const stressModes={normal:'Planned campaign',fatigue:'Ad fatigue',overload:'Promo overload'};
const start=Date.UTC(2026,4,4),ms=86400000;
export const dateOf=d=>new Date(start+(d-1)*ms).toISOString().slice(0,10);
export function dayOf(s){return 1+(Date.parse(s+'T00:00:00Z')-start)/ms;}
const valid=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function validateCampaign(c,b){
 if(!/^[A-Z][A-Z0-9-]{1,22}$/.test(c.id)||!Object.hasOwn(channels,c.channel)||!Object.hasOwn(audiences,c.audience)||
   !valid(c.start,1,28)||!valid(c.end,c.start,28)||!valid(c.budget,100,5000000)||!valid(c.discount,0,75)||
   typeof c.offer!=='string'||!c.offer.trim()||c.offer.length>72||/[<>\x00-\x1f]/.test(c.offer))throw Error('Check the channel, dates, budget ($1–$50,000), offer and discount (0–75%).');
 if(!b.items.some(p=>p.id===c.item)||c.channel==='venue'&&b.values.type!=='stadium'||(b.values.type==='stadium'&&c.vendor!==c.item))throw Error('Choose an offering belonging to this business.');
 return c;
}
export function funnel(c,spend,week,mode='normal'){
 const k=channels[c.channel],dollars=spend/100;
 const reach=Math.round(k.reach*dollars/(1+dollars/450));
 const decay=mode==='fatigue'?Math.pow(.8,week-1):1;
 const visits=Math.round(reach*k.click/10000*decay);
 const conversions=Math.min(visits,Math.round(visits*k.convert/10000));
 const share=Math.max(0,Math.min(100,k.newShare+({local:0,new:15,returning:-25})[c.audience]));
 const newRequests=Math.round(conversions*share/100);
 return {reach,visits,conversions,newRequests,existingRequests:conversions-newRequests,spend};
}
const keyDay=n=>String(n).padStart(2,'0');
export function campaignRun(b,baseline,mode='normal'){
 if(!Object.hasOwn(stressModes,mode))throw Error('Unknown marketing stress.');
 const venue=b.values.type==='stadium',rows=[],records={},events=[],campaignIds=new Set();
 const arrivals=venue?Object.fromEntries(b.items.map(i=>[i.id,Array(28).fill(0)])):Array(28).fill(0);
 for(const c of b.campaigns){
   validateCampaign(c,b);if(campaignIds.has(c.id))throw Error('Campaign IDs must be unique.');campaignIds.add(c.id);
   const eligible=baseline.days.filter(d=>d.day>=c.start&&d.day<=c.end&&(c.channel!=='venue'||d.event!=='Off day'));
   if(!eligible.length)throw Error('The venue channel requires at least one scheduled event during the campaign.');
   const common=Math.floor(c.budget/eligible.length),remainder=c.budget%eligible.length;
   for(const [n,d] of eligible.entries()){
     const stats=funnel(c,common+(n<remainder?1:0),Math.ceil(d.day/7),mode);
     const row={...stats,day:d.day,campaign:c.id,channel:c.channel,item:c.item,discount:Math.min(85,c.discount+(mode==='overload'?15:0))};
     if(venue)arrivals[c.item][d.day-1]+=stats.newRequests;else arrivals[d.day-1]+=stats.newRequests;
     rows.push(row);
   }
 }
 const operated=rows.length?operatingLedger(b,arrivals):baseline;
 const days=[];let cumulative=0;
 for(const [i,d] of operated.days.entries()){
   const original=baseline.days[i],tag='B-D'+keyDay(d.day),current=rows.filter(r=>r.day===d.day),sources=[];
   const remainingNew={},remainingOld={...original.saleUnits},available={...d.saleUnits};let spend=0,rebates=0;
   for(const item of b.items)remainingNew[item.id]=Math.max(0,d.saleUnits[item.id]-original.saleUnits[item.id]);
   for(const row of current){
     const item=b.items.find(x=>x.id===row.item),id=tag+'-'+row.campaign;
     const added=Math.min(remainingNew[item.id],available[item.id],row.newRequests);
     remainingNew[item.id]-=added;available[item.id]-=added;
     const existing=Math.min(available[item.id],remainingOld[item.id],row.existingRequests);remainingOld[item.id]-=existing;available[item.id]-=existing;
     const discount=Math.round((added+existing)*item.price*row.discount/100);
     Object.assign(row,{newServed:added,existing,rebate:discount,id});
     records[id]={id,kind:'Campaign funnel and fulfilled redemptions',...row,offer:b.campaigns.find(c=>c.id===row.campaign).offer,baselineSources:original.ids.map(x=>'BASE/'+x),sources:d.ids};
     records[id+'-POST']={id:id+'-POST',kind:'Simulated cash journal',debits:{adExpense:row.spend,promotionalDiscount:discount},credits:{cash:row.spend+discount},source:id};
     records[id+'-AUDIENCE']={id:id+'-AUDIENCE',kind:'Customer offer response',newFulfilled:added,existingRedeemed:existing,unfulfilledNew:row.newRequests-added,source:id};
     events.push({day:d.day,owner:'NOVARA',action:'Plan channel delivery and attribute visits',record:id},{day:d.day,owner:'ECHON',action:'Classify new and existing offer redemptions',record:id+'-AUDIENCE'},
       {day:d.day,owner:'QUANTIX',action:'Post simulated campaign spend and rebates',record:id+'-POST'});
     spend+=row.spend;rebates+=discount;sources.push(id+'-POST');
   }
   cumulative+=spend+rebates;
   const adjusted={...d,id:tag+'-CLOSE',gross:d.gross-rebates,income:d.income-spend-rebates,fixed:d.fixed+spend,cash:d.cash-cumulative,available:d.available-cumulative,
     ids:[...d.ids,...sources],spend,rebates,incrementalRevenue:d.gross-original.gross,incrementalCost:d.cost-original.cost,otherChange:d.fixed-original.fixed};
   const effect=adjusted.incrementalRevenue-adjusted.incrementalCost-adjusted.otherChange-spend-rebates;
   if(effect!==adjusted.income-original.income||adjusted.gross-adjusted.cost-adjusted.fixed!==adjusted.income||d.variance)throw Error('Daily campaign ledger did not reconcile.');
   records[adjusted.id]={id:adjusted.id,kind:'Campaign-adjusted operating close',...adjusted,baselineIncome:original.income,netEffect:effect,baselineSource:'BASE/'+original.id,sources:adjusted.ids};
   if(sources.length)events.push({day:d.day,owner:'VERITAS',action:'Evaluate incremental contribution against the no-campaign close',record:adjusted.id});
   days.push(adjusted);
 }
 const total=k=>sum(days,d=>d[k]),spend=total('spend'),rebates=total('rebates');
 const a={spend,rebates,incrementalRevenue:total('incrementalRevenue'),incrementalCost:total('incrementalCost'),otherChange:total('otherChange'),newServed:sum(rows,r=>r.newServed),existing:sum(rows,r=>r.existing),reach:sum(rows,r=>r.reach),visits:sum(rows,r=>r.visits),requests:sum(rows,r=>r.conversions)};
 a.net=a.incrementalRevenue-a.incrementalCost-a.otherChange-spend-rebates;a.roi=spend?a.net/spend:null;
 records['B-ROI']={id:'B-ROI',kind:'VERITAS incremental campaign evaluation',...a,comparison:'Identical seed, items, staffing and operating calendar without campaigns. Full modeled change includes downstream service effects.',sources:days.map(d=>d.id)};
 return {operated,baseline,days,extra:records,events,rows,a};
}
