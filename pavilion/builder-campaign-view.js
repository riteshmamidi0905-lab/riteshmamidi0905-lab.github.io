import {channels,audiences,dateOf,stressModes} from './builder-market.js';
import {btn,esc,money,count,select,input,shellHeading,note,options} from './builder-common.js';
import {evidence,stat} from './builder-dashboard.js';
import {mapDrawing,lots} from './district-map.js';
import {floorSvg,floorOrder,point,home,overviewBox} from './iso-geometry.js';
export function campaignForm(b){
 const optionsById=Object.fromEntries(Object.entries(channels).filter(([id])=>id!=='venue'||b.values.type==='stadium').map(([id,c])=>[id,c.name]));
 const defaultChannel=b.values.type==='stadium'?'venue':'social';
 return '<form id="campaign-form" class="editor"><div class="form-grid">'+select('channel','Channel',optionsById,defaultChannel)+select('audience','Audience',audiences,'local')+
 input('budget','Total budget ($)','280','type="number" min="1" max="50000" step=".01" required')+select('item',b.values.type==='stadium'?'Vendor / offer':'Promoted offering',Object.fromEntries(b.items.map(i=>[i.id,i.name])),b.items[0].id)+
 input('start','Start date',dateOf(1),'type="date" min="'+dateOf(1)+'" max="'+dateOf(28)+'" required')+input('end','End date',dateOf(28),'type="date" min="'+dateOf(1)+'" max="'+dateOf(28)+'" required')+
 input('offer','Offer name',b.values.type==='stadium'?'Game-day combo':'Neighborhood opening offer','maxlength="72" required')+input('discount','Discount (%)',15,'type="number" min="0" max="75" required')+'</div><button class="button primary">Add to campaign plan</button></form>';
}
export function assumptions(){
 return '<details class="rate-details"><summary>Synthetic channel rates and attribution rules</summary><div class="table-scroll"><table><caption>Rates before diminishing returns</caption><thead><tr><th>Channel</th><th>Reach / $</th><th>Visit rate</th><th>Convert</th><th>New share</th></tr></thead><tbody>'+
 Object.values(channels).map(c=>'<tr><th>'+c.name+'</th><td>'+c.reach+'</td><td>'+c.click/100+'%</td><td>'+c.convert/100+'%</td><td>'+c.newShare+'%</td></tr>').join('')+
 '</tbody></table></div><p>Daily reach = dollars × reach per dollar ÷ (1 + dollars / 450). Reach counts daily exposures, including repeats. A new-customer audience adds 15 percentage points to new share; a returning audience subtracts 25. Fractions round to whole people each day. The venue channel allocates spend to event days only.</p><p>Only fulfilled new requests count as incremental redemptions. Returning offer users lower margin through discounts. Each unit can redeem once, in plan order. Rebates are funded from campaign cash after the sale; original venue settlements retain their recorded sale value. Ad fatigue reduces the visit rate by 20% each successive week; promo overload adds 15 discount points, capped at 85%.</p></details>';
}
export function offers(b,day,manage=false){
 if(!b.campaigns.length)return note('No offers yet. Plan a campaign to add a dated promotion.');
 return '<ul class="offers">'+b.campaigns.map(c=>'<li><div><strong>'+esc(c.offer)+'</strong><p>'+esc(b.items.find(i=>i.id===c.item)?.name||c.item)+' · '+c.discount+'% off · days '+c.start+'–'+c.end+' · '+(day>=c.start&&day<=c.end?'Active':day<c.start?'Upcoming':'Ended')+'</p></div>'+(manage?btn('remove:'+c.id,'Remove '+c.offer,'quiet'):'')+'</li>').join('')+'</ul>';
}
export function creative(b,c){
 return '<div class="creative-pair"><figure class="creative '+esc(b.site.theme)+'" style="--creative-accent:'+(/^#[0-9a-f]{6}$/i.test(b.site.accent)?b.site.accent:'#315842')+'"><figcaption>Ad card · mock-up</figcaption><p>'+esc(b.values.concept)+'</p><h3>'+esc(c.offer)+'</h3><strong>'+c.discount+'% off · '+esc(b.items.find(i=>i.id===c.item)?.name||c.item)+'</strong><small>'+esc(channels[c.channel].name)+' · '+esc(audiences[c.audience])+' · '+esc(b.values.city)+'</small></figure><figure class="social-post"><figcaption>Social post · mock-up</figcaption><p class="social-byline">'+esc(b.values.concept)+'</p><div class="social-tile"><b>'+esc(c.offer)+'</b><span>'+c.discount+'% off</span></div><p>'+esc(b.items.find(i=>i.id===c.item)?.name||c.item)+' in '+esc(b.values.city)+'. Offer applies on simulation days '+c.start+'–'+c.end+'.</p></figure></div>';
}
export function roi(r){
 const a=r.attribution;if(!a.spend)return note('Add a campaign to compare its four-week return against the baseline.');
 const rows=[['Incremental operating revenue',a.incrementalRevenue],['Incremental goods cost',-a.incrementalCost],['Other operating changes',-a.otherChange],['Promotional discounts',-a.rebates],['Channel spend',-a.spend],['Net incremental operating income',a.net]];
 return '<section class="roi-card"><p class="kicker">VERITAS · campaign evaluation</p><h2>Return on campaign spend</h2><div class="stats">'+stat('Incremental income',money(a.net),'B-ROI')+stat('Return on spend',(100*a.roi).toFixed(1)+'%','B-ROI')+stat('Paid channel spend',money(a.spend),'B-ROI')+'</div><div class="table-scroll"><table><caption>Same business, same seed, without the campaign as baseline</caption><tbody>'+rows.map(([label,n])=>'<tr><th>'+label+'</th><td>'+evidence('B-ROI',money(n))+'</td></tr>').join('')+'</tbody></table></div><p>'+evidence('B-ROI',count(a.reach)+' exposures · '+count(a.visits)+' visits · '+count(a.requests)+' purchase intentions')+'</p><p>'+evidence('B-ROI',count(a.newServed)+' incremental promoted units · '+count(a.existing)+' existing redemptions')+'</p></section>';
}
export function marketing(b,r,day){
 return shellHeading('Marketing & Ads','Plan a campaign','Set an offer, audience and budget. Compare the result against the same business without the campaign.')+campaignForm(b)+
 '<h2>Promotions board</h2>'+offers(b,day,true)+(b.campaigns.length?'<div class="actions">'+btn('run','Run four weeks','button primary')+'</div>'+creative(b,b.campaigns.at(-1)):'')+assumptions();
}
export function districtView(b,library,day){
 const versions=library?.length?library:[b],live=versions.map(x=>x.business||x);
 const map=mapDrawing(lots).replace(/href="[^"]*" data-lot="([^"]+)"/g,(_,id)=>'href="#district" data-builder-lot="'+esc(id)+'"');
 return shellHeading('District promotions','NASHA District','Local businesses and their offers on day '+day+'. Select a building to find its active promotions.')+
 '<div class="district-figure">'+map+'</div>'+dayPicker(day)+'<div class="district-rows">'+lots.map(l=>{
   const at=live.filter(x=>x.values.type===l.id),offers=at.flatMap(x=>x.campaigns.filter(c=>c.start<=day&&c.end>=day).map(c=>esc(x.values.concept)+' · '+esc(c.offer)+' · '+c.discount+'% off · '+esc(x.items.find(i=>i.id===c.item)?.name||c.item)));
   return '<article id="lot-'+l.id+'" tabindex="-1"><h3>'+esc(l.use)+'</h3>'+(offers.length?'<ul>'+offers.map(o=>'<li>'+o+'</li>').join('')+'</ul>':note('No active local offers on this day.'))+'</article>';
 }).join('')+'</div>';
}
export const dayPicker=day=>select('display-day','Simulation day',Object.fromEntries(Array.from({length:28},(_,i)=>[i+1,'Day '+(i+1)+' · '+dateOf(i+1)])),day);
export const stressPicker=mode=>select('stress','Campaign stress test',stressModes,mode);
const architecture=new Map();
function floorFor(type){
 if(!architecture.has(type)){
   const registry=floorOrder.map(name=>({name,slug:name.toLowerCase()}));
   architecture.set(type,floorSvg(registry,{config:{template:type},events:[]},true));
 }
 return architecture.get(type);
}
export function hqView(b,r,day,beat){
 const tasks=r.events.filter(e=>e.day===day),event=tasks[Math.min(beat,Math.max(0,tasks.length-1))];
 const markers=floorOrder.map(name=>{
   const [x,y]=point(...home(name)),active=event?.owner===name;
   return '<g transform="translate('+x+' '+y+')"><rect x="-32" y="-9" width="64" height="17" rx="4" fill="'+(active?'#87532c':'#294537')+'"/><text fill="#fff9e6" text-anchor="middle" y="3" font-size="10">'+name+'</text>'+(active?'<circle cy="-20" r="7" fill="#f5dc90" stroke="#78522c" stroke-width="3"/>':'')+'</g>';
 }).join('');
 return shellHeading('Operating headquarters','Campaign floor',b.values.concept+' · Recorded rule-based campaign work on day '+day)+
 '<div class="floor-visual">'+floorFor(b.values.type)+'<svg aria-hidden="true" viewBox="'+overviewBox+'">'+markers+'</svg></div><div class="tools">'+dayPicker(day)+(tasks.length?select('beat','Source-clock task',Object.fromEntries(tasks.map((t,i)=>[i,t.owner+' · '+t.action])),Math.min(beat,tasks.length-1)):'')+'</div>'+
 (event?'<div class="active-task"><p class="kicker">Working · '+event.owner+'</p><h2>'+esc(event.action)+'</h2>'+evidence(event.record,'Inspect '+event.record)+'</div>':note('No campaign tasks recorded this day.'))+
 '<details><summary>Accessible specialist activity list</summary><ul>'+floorOrder.map(name=>'<li><strong>'+name+'</strong> · '+(event?.owner===name?esc(event.action)+' '+evidence(event.record):'Idle for this campaign beat')+'</li>').join('')+'</ul></details><p><a href="#simulation">Return to the four-week simulation</a></p>';
}
