import {builderUrl} from './builder-promotions.js';
import {askFloor,suggestQuestions} from './floor-questions.js';
import {esc,url} from './views.js';

function inspectorLink(model,id,day) {
 return '<a href="'+url('inspector',model,day,{id})+'">'+esc(id)+'</a>';
}
export function mountQuestions(source,currentDay,visit,sourceLink=inspectorLink){
 const getModel=typeof source==='function'?source:()=>source;
 const open=document.querySelector('#ask-open'),box=document.querySelector('#ask-floor'),form=box.querySelector('form'),input=form.elements.question;
 const answer=box.querySelector('.answer'),flight=box.querySelector('.flight'),refs=box.querySelector('.citations');
 let result=null,index=0,timer,displayedModel;
 function stop(){clearTimeout(timer);timer=null;flight.querySelector('.tour').textContent='Play flight';}
 function toggle(show){box.hidden=!show;open.setAttribute('aria-expanded',String(show));if(show){refresh();input.focus({preventScroll:true});}else{stop();open.focus({preventScroll:true});}}
 open.onclick=()=>toggle(box.hidden);box.querySelector('.dismiss').onclick=()=>toggle(false);
 document.addEventListener('keydown',e=>{
  if(e.key==='/'&&open.getClientRects().length&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,select,textarea,[contenteditable]')){e.preventDefault();toggle(true);}
  if(e.key==='Escape'&&!box.hidden){e.preventDefault();e.stopImmediatePropagation();toggle(false);}
 },true);
 function step(to){
  index=Math.min(result.flight.length-1,Math.max(0,to));const s=result.flight[index];if(!s)return;
  visit(s);flight.querySelector('output').textContent=(index+1)+' / '+result.flight.length+' · Day '+s.day+' · '+s.agent+' · '+s.event;
  flight.querySelector('.previous').disabled=index===0;flight.querySelector('.next').disabled=index===result.flight.length-1;
 }
 function tour(){if(index>=result.flight.length-1){stop();return;}step(index+1);timer=setTimeout(tour,2100);}
 function submit(text){
  const model=getModel();stop();input.value=text;result=askFloor(model,text,currentDay());answer.textContent=result.message;
  refs.hidden=!result.ids.length;refs.querySelector('summary').textContent='Source records ('+result.ids.length+')';
  refs.querySelector('div').innerHTML=result.ids.map(id=>{
   if(result.intent==='campaign'&&model.workspace)return '<a href="'+esc(builderUrl(model.workspace,'simulation',{record:id}))+'">'+esc(id)+'</a>';
   const day=Number(/^D(\d+)-/.exec(id)?.[1]??currentDay());return sourceLink(model,id,day);
  }).join(' ');
  flight.hidden=!result.flight.length;if(!flight.hidden)step(0);
 }
 form.onsubmit=e=>{e.preventDefault();submit(input.value);};
 const chips=box.querySelector('.question-examples');
 function refresh(){
  const model=getModel();
  if(model!==displayedModel){
   stop();result=null;answer.textContent='';input.value='';flight.hidden=true;refs.hidden=true;
   refs.querySelector('div').replaceChildren();displayedModel=model;
  }
  chips.replaceChildren();
  if(model)for(const q of suggestQuestions(model,currentDay())){
   const b=document.createElement('button');b.type='button';b.textContent=q;b.onclick=()=>submit(q);chips.append(b);
  }
 }
 flight.querySelector('.next').onclick=()=>{stop();step(index+1);};flight.querySelector('.previous').onclick=()=>{stop();step(index-1);};
 flight.querySelector('.tour').onclick=()=>{if(timer){stop();return;}if(index===result.flight.length-1)step(0);flight.querySelector('.tour').textContent='Pause flight';timer=setTimeout(tour,1500);};
 refresh();return refresh;
}
export const questionBox='<section id="ask-floor" aria-label="Ask the floor" hidden><button class="dismiss" type="button">Close questions</button><form><label for="floor-question">Ask the floor</label><input id="floor-question" name="question" type="search" maxlength="240" placeholder="Ask about a recorded day or specialist" required><button>Ask</button></form><div class="question-examples" aria-label="Suggested questions"></div><p class="answer" role="status"></p><details class="citations" hidden><summary>Source records</summary><div></div></details><div class="flight" hidden><button class="previous" type="button">Previous stop</button><button class="tour" type="button">Play flight</button><button class="next" type="button">Next stop</button><output></output></div></section>';
