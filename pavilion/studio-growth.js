import {publicSite} from './studio-site.js';
import {esc,input,select,money} from './builder-common.js';
import {rows,metric,recordButton} from './studio-store.js';
import {calculate} from './builder-results.js';
import {channels,audiences} from './builder-market.js';

export const campaigns={opening:'Opening invitation',returning:'Return visit',feature:'Product spotlight'};
export function searchRecord(b){
 const s=publicSite(b),keys=s.pages.flatMap(p=>p.sections);
 const tests={'Descriptive page title':s.meta.title.trim().length>=10,'Description of at least 35 characters':s.meta.description.trim().length>=35,
 'Share image selected':Boolean(s.meta.image),'An offering has a price':s.items.some(i=>i.price>0),'Visible visit or booking information':keys.some(k=>['contact','booking'].includes(k))};
 const score=Object.values(tests).filter(Boolean).length*20;
 return {id:'SITE-SEARCH',kind:'Synthetic search readiness',tests,score,organicPerDay:20+score/2,rule:'20 daily search sessions plus 0.5 per readiness point. No search engine is queried.'};
}
export function visibility(b){
 const site=publicSite(b),keys=site.pages.flatMap(p=>p.sections);
 return {id:'SITE-VISIBILITY',kind:'Rule-based information visibility',checks:{'Named business':Boolean(site.name),'Location supplied':Boolean(site.city),'Published opening hours':Boolean(site.hours)&&keys.some(k=>['contact','booking','faq'].includes(k)),'Priced catalog':keys.includes('products'),'Questions answered':keys.includes('faq')}};
}
export function growRecords(b,r){
 const records={'SITE-SEARCH':searchRecord(b),'SITE-VISIBILITY':visibility(b)};
 const fatigue=b.campaigns.length?(r.mode==='fatigue'?r:calculate(b,'fatigue')):null;
 for(const c of b.campaigns){
   const without=r.promotionBook.without(c.id),effect=r.promotionBook.effect(c.id);
   const daily=Object.values(r.records).filter(x=>x.campaign===c.id&&x.kind==='Campaign funnel and fulfilled redemptions');
   const sum=k=>daily.reduce((n,x)=>n+x[k],0);
   const reach=sum('reach'),clicks=sum('visits'),gross=r.total.gross-without.total.gross,goods=without.total.cost-r.total.cost,other=without.total.fixed-r.total.fixed;
   const isDirect=['email','sms'].includes(c.channel);
   const id='REVIEW-'+c.id;
   records[id]={id,kind:'VERITAS · deterministic campaign evaluation',offer:c.offer,channel:channels[c.channel].name,dayRange:[c.start,c.end],template:c.template||'Existing promotion',
     exposures:reach,opens:isDirect?Math.max(clicks,Math.round(reach*(c.channel==='sms'?.68:.39))):0,clicks,unsubscribes:isDirect?Math.round(reach*.003):0,
     engagements:c.channel==='social'?Math.max(clicks,Math.round(reach*.06)):0,existingOfferUsers:sum('existing'),newFulfilled:sum('newServed'),netRevenueEffect:gross,
     goodsEffect:goods,operatingExpenseEffect:other,netProfit:effect.netCents,fatigueProfit:fatigue.promotionBook.effect(c.id).netCents,
     evaluation:gross+goods+other===effect.netCents?'Attribution reconciled':'Attribution inconsistent',
     rule:'Compares the complete plan with that offer removed. Discounts to existing buyers are cannibalization. Fatigue decays visit rate by 20% per week. Direct-message opens and opt-outs are synthetic rates (email 39%, SMS 68%, opt-outs 0.3%). Social engagement assumes 6%.',
     sources:[effect.id,...daily.map(d=>d.id)]};
 }
 return records;
}
export function growthBody(b,r){
 const s=publicSite(b),rec=growRecords(b,r),search=rec['SITE-SEARCH'],vis=rec['SITE-VISIBILITY'];
 const campaignsHTML=b.campaigns.map(c=>{const v=rec['REVIEW-'+c.id];return '<article class="tile"><p class="kicker">'+esc(v.channel)+' · Day '+c.start+'–'+c.end+'</p><h3>'+esc(c.offer)+'</h3><p>'+esc(b.values.concept)+' · '+esc(b.items.find(x=>x.id===c.item).name)+' · '+c.discount+'% off</p>'+rows(['Recorded outcome','Result'],[
 ['Exposures / clicks',v.exposures+' / '+v.clicks],...(['sms','email'].includes(c.channel)?[['Opens / unsubscribes',v.opens+' / '+v.unsubscribes]]:[]),...(c.channel==='social'?[['Engagements',v.engagements]]:[]),
 ['Existing buyers redeeming',v.existingOfferUsers],['Incremental net revenue',money(v.netRevenueEffect)],['Goods cost effect',money(v.goodsEffect)],['Operating cost effect',money(v.operatingExpenseEffect)],['Incremental profit',money(v.netProfit)],['Profit with fatigue',money(v.fatigueProfit)]])+
 recordButton(v.id,'VERITAS · '+v.evaluation)+'</article>';}).join('');
 const checks=x=>'<ul>'+Object.entries(x).map(([k,v])=>'<li>'+esc(k)+' · '+(v?'present':'missing')+'</li>').join('')+'</ul>';
 return '<h2>Discovery and campaigns</h2><div class="studio-columns"><section><h3>Search appearance</h3><form data-sform="seo">'+input('title','Page title',s.meta.title,'required maxlength="96"')+input('description','Search description',s.meta.description,'maxlength="240"')+select('image','Share illustration',{Gallery:'Gallery',Storefront:'Storefront',Products:'Products'},s.meta.image)+'<button>Save search appearance</button></form></section><section>'+metric('Search readiness',search.score+'/100',search.id)+checks(search.tests)+'<p>'+search.organicPerDay+' projected organic sessions per day.</p><details><summary>AI visibility · simulated</summary>'+checks(vis.checks)+recordButton(vis.id,'Inspect checklist')+'</details></section></div>'+
 '<h2>Campaign calendar</h2><form data-sform="outreach">'+select('channel','Simulated channel',{email:'Email',sms:'SMS',social:'Social'},'email')+select('template','Template',campaigns,'opening')+select('audience','Synthetic audience',audiences,'local')+select('item','Offering',Object.fromEntries(b.items.map(i=>[i.id,i.name])),b.items[0].id)+input('offer','Campaign headline',b.studio?.campaignDraft||campaigns.opening,'required maxlength="72"')+
 input('start','First simulation day',1,'type="number" min="1" max="28" required')+input('end','Last simulation day',7,'type="number" min="1" max="28" required')+input('budget','Simulated spend ($)',70,'type="number" min="1" max="50000" step=".01" required')+input('discount','Offer discount (%)',5,'type="number" min="0" max="75" required')+'<button>Model campaign</button></form>'+
 '<div class="tiles">'+(campaignsHTML||'<p>Model your first campaign to see the dated creative and its attributed profit.</p>')+'</div>';
}
export function growthEvent(kind,f,b){
 if(kind==='seo'){b.studio.seo={title:f.title.trim(),description:f.description.trim(),image:f.image};publicSite(b);return 'save';}
 if(kind==='outreach'){
 const id='C-'+(1+Math.max(0,...b.campaigns.map(c=>Number(c.id.slice(2)))));
 const c={id,channel:f.channel,audience:f.audience,item:f.item,offer:f.offer.trim(),start:Number(f.start),end:Number(f.end),budget:Math.round(Number(f.budget)*100),discount:Number(f.discount),template:campaigns[f.template]};
 if(b.values.type==='stadium')c.vendor=c.item;b.campaigns.push(c);return 'save';}
}
