import {newPlan,inferPlan,groups,labels,sectors,changeType,checkPlan} from './builder-plan.js';
import {gallerySections,guideView,reviewView} from './builder-entry.js';
import {takeFields,btn,esc,shellHeading,money} from './builder-common.js';

import {createBusiness} from './builder-ledger.js';
import * as market from './builder-campaign-view.js';
import {browserLibrary} from './builder-library.js';
import {dayOf} from './builder-market.js';
import {calculate,sourceFor} from './builder-results.js';
import * as view from './builder-dashboard.js';
import {mountWebsitePreview,downloadWebsite} from './builder-site.js';
let device='desktop',day=1,beat=0,stress='normal',result=null;
const root=document.querySelector('#builder'), notice=document.querySelector('#notice');
const galleryLead=root.querySelector('.entry-lead');
const galleryShelf=root.querySelector('#sectors');
const library=browserLibrary();
let plan=newPlan(),step=0,screen='gallery',business=library.active?.business||null;
function manage(){
 const h=library.stack();
 return '<span class="save-state">'+(library.persistent?'Saved on this device':'Session only · storage unavailable')+'</span>'+
   '<label class="field"><span>Workspace version</span><select name="workspace">'+[...library.entries.values()].map(v=>'<option value="'+esc(v.id)+'"'+(v.id===library.current?' selected':'')+'>'+esc(v.label)+'</option>').join('')+'</select></label>'+
   '<div class="history-tools">'+['undo','redo'].map(k=>'<button class="quiet" data-act="'+k+'"'+((k==='undo'?h.past:h.future).length?'':' disabled')+'>'+k[0].toUpperCase()+k.slice(1)+'</button>').join('')+'</div>'+
   btn('duplicate','Duplicate business','quiet')+btn('reset','Reset business','quiet')+'<a class="text-button" href="#gallery">New business</a>';
}
function compare(){
 if(library.entries.size<2)return '';
 return '<section><h2>Compare saved versions</h2><div class="table-scroll"><table><caption>Four-week operating income under each saved plan</caption><tbody>'+[...library.entries.values()].map(v=>'<tr><th>'+esc(v.label)+'</th><td>'+money((v.id===library.current?result:calculate(v.business)).total.income)+'</td></tr>').join('')+'</tbody></table></div></section>';
}

let playback=null;
function stopHandoffs(){
 clearInterval(playback);playback=null;const control=root.querySelector('[data-act="play-handoffs"]');if(control){control.textContent='Play campaign handoffs';control.setAttribute('aria-pressed','false');}
}
function drawHandoff(tasks){
 const event=tasks[beat];root.querySelector('[name=beat]').value=beat;
 for(const g of root.querySelectorAll('.floor-visual [data-owner]')){
   const active=g.dataset.owner===event.owner;g.querySelector('rect').setAttribute('fill',active?'#87532c':'#294537');g.querySelector('circle').setAttribute('visibility',active?'visible':'hidden');
 }
 const active=root.querySelector('.active-task');active.querySelector('.kicker').textContent='Working · '+event.owner;active.querySelector('h2').textContent=event.action;
 const link=active.querySelector('[data-record]');link.dataset.record=event.record;link.textContent='Inspect '+event.record;
 for(const row of root.querySelectorAll('[data-activity]'))row.innerHTML=row.dataset.activity===event.owner?esc(event.action)+' '+view.evidence(event.record):'Idle for this campaign beat';
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHandoffs();});
function go(next,focus=true){
 stopHandoffs();
 screen=next;root.dataset.screen=next;notice.textContent='';
 if(next==='gallery'){
   if(!root.contains(galleryLead))root.replaceChildren(galleryLead,galleryShelf);
   galleryShelf.innerHTML=gallerySections();
 }
 else if(next==='guide')root.innerHTML=guideView(plan,step);
 else if(next==='review')root.innerHTML=reviewView(plan);
 else if(business){
   result??=calculate(business,stress);
   const pages={overview:()=>view.overview(business,result)+compare(),website:()=>view.website(business,device,day)+market.dayPicker(day),products:view.products,operations:view.operations,customers:view.customers,finance:view.finance,marketing:()=>market.marketing(business,result,day),simulation:()=>view.simulation(business,result)+market.stressPicker(stress)+market.roi(result),report:()=>view.report(business,result)+market.roi(result),hq:()=>market.hqView(business,result,day,beat),district:()=>market.districtView(business,[...library.entries.values()],day)};
   const page=pages[next]||(()=>shellHeading('Business dashboard',view.tabs[next]||'Workspace'));
   root.innerHTML=view.wrap(business,next,page(business,result),manage())+ '<dialog id="record" aria-labelledby="source-title"><button type="button" class="quiet" data-act="close-record">Close record</button><div id="source-body"></div></dialog>';
   if(next==='website')mountWebsitePreview(root.querySelector('.storefront-window'),business,day);
 }
 else{go('gallery',focus);return;}
 if(focus){root.querySelector('h1')?.focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:'instant'});}
}
root.addEventListener('click',e=>{
 const record=e.target.closest('[data-record]')?.dataset.record;
 const opened=record&&result&&sourceFor(result,record);
 if(opened){
   stopHandoffs();
   const dialog=root.querySelector('#record');dialog.querySelector('#source-body').innerHTML=view.recordHTML(opened,id=>Boolean(sourceFor(result,id)));
   if(!dialog.open)dialog.showModal();dialog.querySelector('button').focus();return;
 }
 const lot=e.target.closest('[data-builder-lot]')?.dataset.builderLot;
 if(lot){e.preventDefault();const target=root.querySelector('#lot-'+lot);target.focus();return;}
 const link=e.target.closest('a[href^="#"]');
 if(link){
   e.preventDefault();const target=link.getAttribute('href').slice(1);
   if(target==='sectors'){const section=root.querySelector('#sectors');section.tabIndex=-1;section.focus();return;}
   if(Object.hasOwn(view.tabs,target)||['gallery','hq','district'].includes(target)){navigate(target);return;}
 }
 const op=e.target.closest('[data-act]')?.dataset.act;if(!op)return;
 if(op==='play-handoffs'){
   if(playback){stopHandoffs();return;}
   const tasks=result.events.filter(e=>e.day===day);
   if(beat===tasks.length-1){beat=0;drawHandoff(tasks);}
   const control=root.querySelector('[data-act="play-handoffs"]');control.textContent='Pause campaign handoffs';control.setAttribute('aria-pressed','true');
   playback=setInterval(()=>{beat++;drawHandoff(tasks);if(beat>=tasks.length-1)stopHandoffs();},2100);return;
 }
 if(op==='duplicate'){business=library.duplicate();result=null;navigate('overview');notice.textContent='Version created for comparison.';return;}
 if(op==='undo'||op==='redo'){business=library.travel(op);result=null;go(screen);notice.textContent=op==='undo'?'Edit undone.':'Edit restored.';return;}
 if(op==='reset'){
   const dialog=root.querySelector('#record');dialog.querySelector('#source-body').innerHTML='<h2 id="source-title">Reset this business?</h2><p>Restore its confirmed opening assumptions and remove subsequent edits and campaigns. Other versions stay available.</p>'+btn('confirm-reset','Restore opening plan','button primary');dialog.showModal();dialog.querySelector('button').focus();return;
 }
 if(op==='confirm-reset'){business=library.reset();result=null;day=1;stress='normal';beat=0;navigate('overview');notice.textContent='Opening plan restored. Undo is available.';return;}
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
 if(e.target.name==='workspace'){business=library.select(e.target.value);result=null;day=1;beat=0;stress='normal';go(screen);return;}
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
   if(form.id==='section-jump'){navigate(new FormData(form).get('section'));return;}
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
     checkPlan(plan.values);business=library.add(createBusiness(plan));result=null;day=1;beat=0;stress='normal';navigate('overview');
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
function apply(copy){const checked=calculate(copy,stress);business=library.edit(copy);result=checked;}
function navigate(next){
 // Reuse the loaded document URL. Native fragment navigations can re-request the favicon even offline.
 if(history.state?.builderSection!==next)history.pushState({builderSection:next},'',location.href);
 go(next);
}
addEventListener('popstate',()=>go(history.state?.builderSection||location.hash.slice(1)||'gallery'));
addEventListener('hashchange',()=>{const target=decodeURIComponent(location.hash.slice(1));if(target==='sectors')return;go(target||'gallery');});
try{go(business?(history.state?.builderSection||location.hash.slice(1)||'overview'):'gallery',false);}
catch{business=null;go('gallery',false);notice.textContent='The saved plan could not be opened. Start a new plan in this browser.';}

