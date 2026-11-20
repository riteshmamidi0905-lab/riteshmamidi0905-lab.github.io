import {newPlan,inferPlan,groups,labels,sectors,changeType,checkPlan} from './builder-plan.js';
import {gallery,guideView,reviewView} from './builder-entry.js';
import {takeFields,btn,esc,shellHeading} from './builder-common.js';

const root=document.querySelector('#builder'), notice=document.querySelector('#notice');
let plan=newPlan(),step=0,screen='gallery',business=null;
function go(next,focus=true){
 screen=next;notice.textContent='';
 if(next==='gallery')root.innerHTML=gallery();
 else if(next==='guide')root.innerHTML=guideView(plan,step);
 else if(next==='review')root.innerHTML=reviewView(plan);
 else root.innerHTML=shellHeading('Your workspace',business.values.concept)+btn('guide','Start another business');
 if(focus){root.querySelector('h1')?.focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:'instant'});}
}
root.addEventListener('click',e=>{
 const op=e.target.closest('[data-act]')?.dataset.act;if(!op)return;
 if(op.startsWith('pick:')||op==='guide'){plan=newPlan(op.startsWith('pick:')?sectors[op.split(':')[1]].types[0]:'coffee');if(op.startsWith('pick:'))plan.status.type='user-set';step=0;go('guide');}
 else if(op==='back'){if(screen==='review'){go('guide');}else if(step>0){step--;go('guide');}else go('gallery');}
});
root.addEventListener('change',e=>{
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
   if(form.id==='review-form'){
     takeFields(form,plan,Object.keys(labels).filter(k=>k!=='mix'||plan.values.type==='stadium'));
     checkPlan(plan.values);business=structuredClone(plan);go('overview');
   }
 }catch(error){notice.textContent=error.message;notice.scrollIntoView({block:'nearest'});}
});
go('gallery',false);
