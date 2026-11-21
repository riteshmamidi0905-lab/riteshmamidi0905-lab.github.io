import {sectors,groups,labels} from './builder-plan.js';
import {shellHeading,esc,btn,planField} from './builder-common.js';
import {elevation} from './builder-art.js';
export function gallerySections(){
 const cards=Object.entries(sectors).map(([key,s])=>'<article class="industry"><div class="art">'+elevation(key)+'</div><div><h3>'+esc(s.label)+'</h3><p>'+({food:'Brewpub, café, bakery or food truck',beauty:'A salon built around appointments',retail:'An independent shop and its inventory',sports:'A venue and its independent vendors'})[key]+'</p>'+btn('pick:'+key,'Start with this','text-button')+'</div></article>').join('');
 return '<section><div class="section-line"><h2>Choose an industry</h2><span>Illustrated previews</span></div><div class="industry-grid">'+cards+'</div></section><section class="quick"><h2>Already have an idea?</h2><form id="shortcut"><label class="field"><span>Describe your business in one sentence</span><textarea name="pitch" maxlength="600" required placeholder="A neighborhood hair salon in Austin, 3 stylists, $55k to open"></textarea></label><button class="button">Review my idea</button></form></section>';
}
export function guideView(plan,step){
 const group=groups[step];
 const keys=[...group.keys,...(step===0&&plan.values.type==='stadium'?['mix']:[])];
 return '<section class="intake"><div class="step-rail"><span>Guided start</span><span>Step '+(step+1)+' of '+groups.length+'</span></div><progress aria-label="Setup progress" value="'+(step+1)+'" max="'+groups.length+'"></progress>'+shellHeading('Your business',group.title)+'<form id="guide-form" data-step="'+step+'">'+keys.map(k=>planField(plan,k)).join('')+'<div class="actions">'+btn('back','Back','quiet')+'<button class="button primary">'+(step===groups.length-1?'Review my assumptions':'Continue')+'</button></div></form></section>';
}
export function reviewView(plan){
 const keys=Object.keys(labels).filter(k=>k!=='mix'||plan.values.type==='stadium');
 return '<section class="intake review">'+shellHeading('Review & refine','Here’s what I understood','Edit any value. Fields marked “asked” need your confirmation before the model runs.')+'<form id="review-form"><div class="form-grid">'+keys.map(k=>planField(plan,k,true)).join('')+'</div><div class="actions">'+btn('back','Back','quiet')+'<button class="button primary">Create my workspace</button></div></form></section>';
}
