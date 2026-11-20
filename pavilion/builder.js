import {newPlan,inferPlan,groups,labels,sectors,changeType,checkPlan} from './builder-plan.js';
import {gallery,guideView,reviewView} from './builder-entry.js';
import {takeFields,btn,esc,shellHeading} from './builder-common.js';

import {createBusiness} from './builder-ledger.js';
import * as market from './builder-campaign-view.js';
import {dayOf} from './builder-market.js';
import {calculate,sourceFor} from './builder-results.js';
import * as view from './builder-dashboard.js';
import {websiteHTML,downloadWebsite} from './builder-site.js';
let device='desktop',day=1,beat=0,stress='normal',result=null;
const root=document.querySelector('#builder'), notice=document.querySelector('#notice');
let plan=newPlan(),step=0,screen='gallery',business=null;
function go(next,focus=true){
 screen=next;notice.textContent='';
 if(next==='gallery')root.innerHTML=gallery();
 else if(next==='guide')root.innerHTML=guideView(plan,step);
 else if(next==='review')root.innerHTML=reviewView(plan);
 else if(business){
   result??=calculate(business,stress);
   const pages={overview:view.overview,website:()=>view.website(business,device,day),products:view.products,operations:view.operations,customers:view.customers,finance:view.finance,marketing:()=>market.marketing(business,result,day),simulation:()=>view.simulation(business,result)+market.stressPicker(stress)+market.roi(result),report:()=>view.report(business,result)+market.roi(result),hq:()=>market.hqView(business,result,day,beat),district:()=>market.districtView(business,[business],day)};
   const page=pages[next]||(()=>shellHeading('Business dashboard',view.tabs[next]||'Workspace'));
   root.innerHTML=view.wrap(business,next,page(business,result))+ '<dialog id="record" aria-labelledby="source-title"><button type="button" class="quiet" data-act="close-record">Close record</button><div id="source-body"></div></dialog>';
   if(next==='website')root.querySelector('iframe').srcdoc=websiteHTML(business,day);
 }
 else{go('gallery',focus);return;}
 if(focus){root.querySelector('h1')?.focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:'instant'});}
}
root.addEventListener('click',e=>{
 const record=e.target.closest('[data-record]')?.dataset.record;
 const opened=record&&result&&sourceFor(result,record);
 if(opened){
   const dialog=root.querySelector('#record');dialog.querySelector('#source-body').innerHTML=view.recordHTML(opened,id=>Boolean(sourceFor(result,id)));
   if(!dialog.open)dialog.showModal();dialog.querySelector('button').focus();return;
 }
 const lot=e.target.closest('[data-builder-lot]')?.dataset.builderLot;
 if(lot){e.preventDefault();const target=root.querySelector('#lot-'+lot);target.focus();return;}
 const op=e.target.closest('[data-act]')?.dataset.act;if(!op)return;
 if(op==='close-record'){root.querySelector('#record').close();return;}
 if(op==='device'){device=device==='mobile'?'desktop':'mobile';go('website',false);root.querySelector('[data-act="device"]').focus();return;}
 if(op==='export'){downloadWebsite(business,day);return;}
 if(op==='print'){window.print();return;}
 if(op==='run'){result=calculate(business,stress);if(screen==='simulation'){go(screen,false);root.querySelector('[data-act=run]').focus();notice.textContent='Four weeks reconciled.';}else navigate('simulation');return;}
 if(op.startsWith('remove:')){const copy=structuredClone(business);copy.campaigns=copy.campaigns.filter(c=>c.id!==op.slice(7));apply(copy);go(screen);notice.textContent='Campaign removed.';return;}
 if(op.startsWith('pick:')||op==='guide'){plan=newPlan(op.startsWith('pick:')?sectors[op.split(':')[1]].types[0]:'coffee');if(op.startsWith('pick:'))plan.status.type='user-set';step=0;go('guide');}
 else if(op==='back'){if(screen==='review'){go('guide');}else if(step>0){step--;go('guide');}else go('gallery');}
});
root.addEventListener('change',e=>{
 if(['display-day','beat','stress'].includes(e.target.name)){
   const key=e.target.name;if(key==='display-day'){day=Number(e.target.value);beat=0;}if(key==='beat')beat=Number(e.target.value);
   if(key==='stress'){stress=e.target.value;result=null;}
   go(screen,false);root.querySelector('[name="'+key+'"]').focus();return;
 }
 if(e.target.name==='type'){changeType(plan,e.target.value);go(screen,false);root.querySelector('[name=type]')?.focus();}
});
root.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;
 try{
   if(form.id==='shortcut'){plan=inferPlan(new FormData(form).get('pitch'));step=0;go('review');}
   if(form.id==='guide-form'){
     takeFields(form,plan,[...groups[step].keys,...(step===0&&plan.values.type==='stadium'?['mix']:[])]);
     if(step===groups.length-1)go('review');else{step++;go('guide');}
   }
   if(form.id==='campaign-form'){
     const f=new FormData(form),copy=structuredClone(business);
     const c={id:'C-'+(1+Math.max(0,...copy.campaigns.map(c=>Number(c.id.slice(2))||0))),channel:f.get('channel'),audience:f.get('audience'),item:f.get('item'),offer:f.get('offer').trim(),discount:Number(f.get('discount')),budget:Math.round(Number(f.get('budget'))*100),start:dayOf(f.get('start')),end:dayOf(f.get('end'))};
     if(copy.values.type==='stadium')c.vendor=c.item;copy.campaigns.push(c);apply(copy);day=result.events.find(e=>e.day>=c.start)?.day||c.start;beat=0;
     go('marketing',false);notice.textContent='Campaign added to the simulation.';root.querySelector('[data-act=run]').focus();
   }
   if(form.id==='review-form'){
     takeFields(form,plan,Object.keys(labels).filter(k=>k!=='mix'||plan.values.type==='stadium'));
     checkPlan(plan.values);business=createBusiness(plan);result=null;navigate('overview');
   }
   if(['website-form','operations-form','products-form'].includes(form.id)){
     const copy=structuredClone(business),data=new FormData(form);
     if(form.id==='website-form')copy.site={theme:data.get('theme'),accent:data.get('accent'),title:data.get('title').trim(),story:data.get('story').trim(),sections:data.getAll('sections')};
     if(form.id==='operations-form'){
       copy.values.staff=Number(data.get('staff'));copy.values.hours=data.get('hours').trim();copy.lead=Number(data.get('lead'));copy.stock=Number(data.get('stock'));
     }
     if(form.id==='products-form')copy.items=copy.items.map(i=>({...i,name:data.get('name-'+i.id).trim(),price:Math.round(Number(data.get('price-'+i.id))*100),cost:Math.round(Number(data.get('cost-'+i.id))*100)}));
     apply(copy);go(screen,false);notice.textContent='Edits saved in this workspace.';
   }
 }catch(error){notice.textContent=error.message;notice.scrollIntoView({block:'nearest'});}
});
function apply(copy){const checked=calculate(copy,stress);business=copy;result=checked;}
function navigate(next){if(location.hash==='#'+next)go(next);else location.hash=next;}
addEventListener('hashchange',()=>{const target=decodeURIComponent(location.hash.slice(1));if(target==='sectors')return;go(target||'gallery');});
go('gallery',false);
