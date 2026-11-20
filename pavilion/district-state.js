import {defaults} from './idea-profiles.js';
import {runIdea} from './idea-analysis.js';
import {simulateCurrentPeriod} from './engine.js';
import {lots} from './district-map.js';
import {scheduleDay} from './shift-schedule.js';
export function districtBusiness(id){
 const lot=lots.find(l=>l.id===id);if(!lot||id==='stadium')throw Error('Choose a listed business.');
 if(id==='brewery')return simulateCurrentPeriod();
 return runIdea({...defaults(id),concept:lot.name});
}
export function activity(model,day,minute){
 const schedule=scheduleDay(model,day),slot=Math.max(0,schedule.findLastIndex(b=>b.minute<=minute));
 const running=model.events.filter(e=>e.day===day&&e.startMinute<=minute&&e.endMinute>minute);
 return {slot,owners:[...new Set(running.map(e=>e.owner))],ids:running.map(e=>e.id)};
}
export function customLot(idea,id,index){
 return {id:'custom-'+id,name:idea.concept,use:idea.type,u:1.5+5*(index%3),v:17+5*Math.floor(index/3),w:3.2,d:2.3,h:1.4,wall:'#c3b492',roof:'#6d8077',link:'hq.html#sim='+encodeURIComponent(id)};
}
