import {visibleHandoffs} from './shift-schedule.js';
import {stationTitle,taskTitle,idleMessage} from './station-context.js';
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
  const wire=ticker.closest('.event-ticker');
  wire.querySelector('.handoff-list')?.remove();task.replaceChildren();ticker.replaceChildren();
  const title=field(task,'p','kicker'),action=field(task,'h3'),meter=field(task,'p','meter'),details=field(task,'p'),source=field(task,'a');
  const group=make(wire,'div','handoff-list');
  const count=field(group,'p','kicker'),list=make(group,'ul','signals'),empty=field(group,'p'),waiting=field(group,'p');
  const transfers=Array.from({length:5},()=>{const li=make(list,'li');return {li,label:field(li,'span'),link:field(li,'a')};});
  const history=Array.from({length:5},()=>{const li=make(ticker,'li'),link=make(li,'a');return {li,link,name:field(link,'b'),action:field(link,'span')};});
  const href=id=>url('inspector',model,day,{id}).replaceAll('&amp;','&');
  return (beat,follow,recent)=>{
    const e=follow?beat.active.find(x=>x.owner===follow):beat.starts[0];
    title.set(follow?stationTitle(model,follow):'Shift desk');action.set(e?taskTitle(model,e):'Idle');
    meter.el.hidden=source.el.hidden=!e;
    if(e){const values=instrumentReading(model,e);meter.set(values[0]);details.set(values[1]);source.set(e.outputs[0]+' · inspect source');source.el.href=href(e.outputs[0]);}
    else details.set(idleMessage(model,follow));
    const destination=follow?task:wire;
    if(group.parentElement!==destination)destination.append(group);
    wire.hidden=Boolean(follow);
    const scope=visibleHandoffs(beat,follow);
    group.hidden=!follow&&!scope.transfers.length;
    empty.set(follow?'No handoffs for '+follow+' at this minute.':'None at this minute.');
    count.set('Handoffs · '+scope.transfers.length);empty.el.hidden=!!scope.batch.length;list.hidden=!scope.batch.length;
    transfers.forEach(({li,label,link},i)=>{const edge=scope.batch[i];li.hidden=!edge;if(edge){label.set(edge.from+' → '+edge.to);link.set(edge.record);link.el.href=href(edge.record);}});
    waiting.el.hidden=!scope.waiting.length;if(scope.waiting.length)waiting.set(scope.waiting.length+' waiting for display');
    history.forEach(({li,link,name,action},i)=>{const row=follow?null:recent[i];li.hidden=!row;if(!row){name.set('');action.set('');link.removeAttribute('href');}if(row){name.set(row.owner);action.set(taskTitle(model,row));link.href=href(row.outputs[0]);}});
  };
}
