import {optionalText} from './builder-copy.js';
import {esc} from './views.js';
import {labels,types,goalOptions} from './builder-plan.js';
import {booths} from './stadium-model.js';
export {esc};
export const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
export const count=n=>new Intl.NumberFormat('en-US').format(n);
export const disclosure='Simulation — synthetic data · nothing is published, charged or sent.';
export const btn=(action,text,style='button')=>'<button type="button" class="'+style+'" data-act="'+esc(action)+'">'+esc(text)+'</button>';
export const options=(data,chosen)=>Object.entries(data).map(([v,label])=>'<option value="'+esc(v)+'"'+(String(chosen)===v?' selected':'')+'>'+esc(label)+'</option>').join('');
export const pairs=values=>Object.fromEntries(values.map(x=>[x,x]));
export function input(key,label,value,attrs=''){
 return '<label class="field"><span>'+esc(label)+'</span><input name="'+esc(key)+'" value="'+esc(value)+'" '+attrs+'></label>';
}
export function select(key,label,entries,value){
 return '<label class="field"><span>'+esc(label)+'</span><select name="'+esc(key)+'">'+options(entries,value)+'</select></label>';
}
const choices={type:types,neighborhood:pairs(['neighborhood','downtown','suburban','campus','industrial']),tier:pairs(['value','standard','premium']),goals:pairs(goalOptions)};
export function planField(plan,key,review=false){
 const v=key==='city'?optionalText(plan.values[key]):plan.values[key],question=plan.questions[key],state=question?'asked':plan.status[key];
 let field;
 if(key==='mix')field='<fieldset><legend>Independent vendors</legend>'+booths.map(b=>'<label class="check"><input type="checkbox" name="mix" value="'+b.id+'"'+(v?.includes(b.id)?' checked':'')+'> '+esc(b.name)+'</label>').join('')+'</fieldset>';
 else if(key==='city')field=input(key,labels[key],v,'maxlength="56" placeholder="Location not set"');
 else if(choices[key])field=select(key,labels[key],choices[key],v);
 else field=input(key,labels[key],v,key==='budget'?'type="number" min="500" max="1000000" required':key==='staff'?'type="number" min="1" max="12" required':'maxlength="'+(key==='products'?146:key==='hours'?220:56)+'" required');
 return '<div class="field-group">'+field+(review?'<small class="assumption">'+esc(state)+'</small>':'')+(question?'<p class="clarify">'+esc(question)+'</p><label class="check"><input type="checkbox" name="confirm-'+key+'" required> I have reviewed this assumption</label>':'')+'</div>';
}
export function takeFields(form,plan,keys){
 const data=new FormData(form);
 for(const key of keys){
   if(!data.has(key)&&key!=='mix')continue;
   const raw=key==='mix'?data.getAll('mix'):data.get(key);
   const value=['staff','budget'].includes(key)?Number(raw):typeof raw==='string'?raw.trim():raw;
   if(JSON.stringify(value)!==JSON.stringify(key==='city'?optionalText(plan.values.city):plan.values[key])||data.has('confirm-'+key)){
     plan.values[key]=key==='city'&&!optionalText(value)?'Unspecified':value;plan.status[key]='user-set';delete plan.questions[key];
   }
 }
 return plan;
}
export function shellHeading(eyebrow,title,description=''){
 return '<header class="screen-head"><p class="kicker">'+esc(eyebrow)+'</p><h1 tabindex="-1">'+esc(title)+'</h1>'+(description?'<p>'+esc(description)+'</p>':'')+'</header>';
}
export const note=text=>'<p class="tip">'+esc(text)+'</p>';
