import {studios} from './studios.js';
import {instrumentReading} from './shift-display.js';
import {url} from './views.js';

// Build the largest possible handoff list once. Only text, links and visibility
// change during playback, so focused controls survive a clock transition.
export function shiftControls(task,ticker,model,day) {
  function make(parent,tag,cls){
    const el=document.createElement(tag);if(cls)el.className=cls;parent.append(el);return el;
  }
  function field(parent,tag,cls){
    const el=make(parent,tag,cls),text=document.createTextNode('');el.append(text);
    return {el,set(value){if(text.data!==value)text.data=value;}};
  }
  task.replaceChildren();ticker.replaceChildren();
  const title=field(task,'p','kicker'),action=field(task,'h3'),meter=field(task,'p','meter'),details=field(task,'p'),source=field(task,'a');
  make(task,'hr');const count=field(task,'p','kicker'),list=make(task,'ul','signals'),empty=field(task,'p'),waiting=field(task,'p');
  empty.set('None at this minute.');
  const transfers=Array.from({length:5},()=>{const li=make(list,'li');return {li,label:field(li,'span'),link:field(li,'a')};});
  const history=Array.from({length:5},()=>{const li=make(ticker,'li'),link=make(li,'a');return {li,link,name:field(link,'b'),action:field(link,'span')};});
  const href=id=>url('inspector',model,day,{id}).replaceAll('&amp;','&');
  return (beat,follow,recent)=>{
    const e=follow?beat.active.find(x=>x.owner===follow):beat.starts[0];
    title.set(follow?studios[follow].title:'Shift desk');action.set(e?e.action:'Idle');
    meter.el.hidden=source.el.hidden=!e;
    if(e){const values=instrumentReading(model,e);meter.set(values[0]);details.set(values[1]);source.set(e.outputs[0]+' · inspect source');source.el.href=href(e.outputs[0]);}
    else details.set('Reviewing the queue. No source task is assigned at this minute.');
    count.set('Handoffs · '+beat.transfers.length);empty.el.hidden=!!beat.batch.length;list.hidden=!beat.batch.length;
    transfers.forEach(({li,label,link},i)=>{const edge=beat.batch[i];li.hidden=!edge;if(edge){label.set(edge.from+' → '+edge.to);link.set(edge.record);link.el.href=href(edge.record);}});
    waiting.el.hidden=!beat.waiting.length;if(beat.waiting.length)waiting.set(beat.waiting.length+' waiting for display');
    history.forEach(({li,link,name,action},i)=>{const row=recent[i];li.hidden=!row;if(row){name.set(row.owner);action.set(row.action);link.href=href(row.outputs[0]);}});
  };
}
