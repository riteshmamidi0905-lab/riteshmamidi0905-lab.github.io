import {optionalText,dayRange} from './builder-copy.js';
import {channels,audiences,stressModes} from './builder-market.js';
import {btn,esc,money,count,select,input,shellHeading,note,options} from './builder-common.js';
import {evidence,stat} from './builder-dashboard.js';
import {calculate} from './builder-results.js';
import {lots} from './district-map.js';
import {boardMap} from './builder-district-map.js';
import {activePromotions,builderUrl} from './builder-promotions.js';
import {floorSvg,floorOrder,point,home,overviewBox} from './iso-geometry.js';
const simulationDays=Object.fromEntries(Array.from({length:28},(_,i)=>[i+1,'Day '+(i+1)]));
export function campaignForm(b){
 const optionsById=Object.fromEntries(Object.entries(channels).filter(([id])=>id!=='venue'||b.values.type==='stadium').map(([id,c])=>[id,c.name]));
 const defaultChannel=b.values.type==='stadium'?'venue':'social';
 return '<form id="campaign-form" class="editor"><div class="form-grid">'+select('channel','Channel',optionsById,defaultChannel)+select('audience','Audience',audiences,'local')+
 input('budget','Total budget ($)','280','type="number" min="1" max="50000" step=".01" required')+select('item',b.values.type==='stadium'?'Vendor / offer':'Promoted offering',Object.fromEntries(b.items.map(i=>[i.id,i.name])),b.items[0].id)+
 select('start','Campaign starts',simulationDays,1)+select('end','Campaign ends',simulationDays,28)+
 input('offer','Offer name',b.values.type==='stadium'?'Game-day combo':'Neighborhood opening offer','maxlength="72" required')+input('discount','Discount (%)',15,'type="number" min="0" max="75" required')+'</div><button class="button primary">Add to campaign plan</button></form>';
}
export function assumptions(){
 return '<details class="rate-details"><summary>Synthetic channel rates and attribution rules</summary><div class="table-scroll"><table><caption>Rates before diminishing returns</caption><thead><tr><th>Channel</th><th>Reach / $</th><th>Visit rate</th><th>Convert</th><th>New share</th></tr></thead><tbody>'+
 Object.values(channels).map(c=>'<tr><th>'+c.name+'</th><td>'+c.reach+'</td><td>'+c.click/100+'%</td><td>'+c.convert/100+'%</td><td>'+c.newShare+'%</td></tr>').join('')+
 '</tbody></table></div><p>Daily reach = dollars × reach per dollar ÷ (1 + dollars / 450). Reach counts daily exposures, including repeats. A new-customer audience adds 15 percentage points to new share; a returning audience subtracts 25. Fractions round to whole people each day. The venue channel allocates spend to event days only.</p><p>Only fulfilled new requests count as incremental redemptions. Returning offer users lower margin through discounts. Each unit can redeem once, in plan order. Rebates are funded from campaign cash after the sale; original venue settlements retain their recorded sale value. Spend and rebates settle in a separate campaign cash journal. A projected cash shortfall calls for financing; the campaign journal does not automatically stop base procurement. Ad fatigue reduces the visit rate by 20% each successive week; promo overload adds 15 discount points, capped at 85%.</p></details>';
}
export function offers(b,day,manage=false,result=null,entryId=null){
 const delivered=result?new Set(activePromotions(b,result,day).map(c=>c.id)):null;
 if(!b.campaigns.length)return note('No offers yet. Plan a campaign to add a dated promotion.');
 return '<ul class="offers">'+b.campaigns.map(c=>'<li><div><strong>'+esc(c.offer)+'</strong><p>'+esc(b.items.find(i=>i.id===c.item)?.name||c.item)+' · '+c.discount+'% off · '+dayRange(c.start,c.end)+' · '+(day<c.start?'Upcoming':day>c.end?'Ended':delivered&&!delivered.has(c.id)?'No delivery today':'Active')+'</p>'+(delivered?.has(c.id)?(entryId?'<a href="'+esc(builderUrl(entryId,'simulation',{record:'B-EFFECT-'+c.id}))+'">Inspect offer result</a>':evidence('B-EFFECT-'+c.id,'Inspect offer result')):'')+'</div>'+(manage?btn('remove:'+c.id,'Remove '+c.offer,'quiet'):'')+'</li>').join('')+'</ul>';
}
export function creative(b,c){
 return '<div class="creative-pair"><figure class="creative '+esc(b.site.theme)+'" style="--creative-accent:'+(/^#[0-9a-f]{6}$/i.test(b.site.accent)?b.site.accent:'#315842')+'"><figcaption>Ad card · mock-up</figcaption><p>'+esc(b.values.concept)+'</p><h3>'+esc(c.offer)+'</h3><strong>'+c.discount+'% off · '+esc(b.items.find(i=>i.id===c.item)?.name||c.item)+'</strong><small>'+esc(channels[c.channel].name)+' · '+esc(audiences[c.audience])+(optionalText(b.values.city)?' · '+esc(b.values.city):'')+'</small></figure><figure class="social-post"><figcaption>Social post · mock-up</figcaption><p class="social-byline">'+esc(b.values.concept)+'</p><div class="social-tile"><b>'+esc(c.offer)+'</b><span>'+c.discount+'% off</span></div><p>'+esc(b.items.find(i=>i.id===c.item)?.name||c.item)+(optionalText(b.values.city)?' in '+esc(b.values.city):'')+'. '+dayRange(c.start,c.end)+'.</p></figure></div>';
}
export function roi(r){
 const a=r.attribution;if(!a.spend)return note('Add a campaign to compare its four-week return against the baseline.');
 const rows=[['Incremental operating revenue',a.incrementalRevenue],['Incremental goods cost',-a.incrementalCost],['Other operating changes',-a.otherChange],['Promotional discounts',-a.rebates],['Channel spend',-a.spend],['Net incremental operating income',a.net]];
 return '<section class="roi-card"><p class="kicker">VERITAS · campaign evaluation'+(r.entities?' · all businesses in the venue':'')+'</p><h2>Return on campaign spend</h2><div class="stats">'+stat('Incremental income',money(a.net),'B-ROI')+stat('Return on spend',(100*a.roi).toFixed(1)+'%','B-ROI')+stat('Paid channel spend',money(a.spend),'B-ROI')+'</div><div class="table-scroll"><table><caption>Same business, same seed, without the campaign as baseline</caption><tbody>'+rows.map(([label,n])=>'<tr><th>'+label+'</th><td>'+evidence('B-ROI',money(n))+'</td></tr>').join('')+'</tbody></table></div><p>'+evidence('B-ROI',count(a.reach)+' exposures · '+count(a.visits)+' visits · '+count(a.requests)+' purchase intentions')+'</p><p>'+evidence('B-ROI',count(a.newServed)+' incremental promoted units · '+count(a.existing)+' existing redemptions')+'</p></section>';
}
export function marketing(b,r,day){
 return shellHeading('Marketing & Ads','Plan a campaign','Set an offer, audience and budget. Compare the result against the same business without the campaign.')+campaignForm(b)+
 '<h2>Promotions board</h2>'+offers(b,day,true,r)+(b.campaigns.length?'<div class="actions">'+btn('run','Run four weeks','button primary')+'</div>'+creative(b,b.campaigns.at(-1)):'')+assumptions();
}
function venueCard(result){
 if(!result.entities)return '';
 return '<p>Four-week operating income · venue operator '+money(result.entities.operator.income)+' · all businesses in the venue '+money(result.entities.combined.income)+'</p>';
}
export function districtView(b,library,day,current){
 const entries=library||[];
 const runs=new Map(entries.map(e=>[e.id,e.business===b?current:calculate(e.business)]));
 return shellHeading('District promotions','NASHA District','Select a building to inspect the offers for this day.')+
 '<div class="district-figure">'+boardMap(entries,runs,day)+'</div>'+dayPicker(day)+'<div class="district-rows">'+lots.map(l=>{
   const occupants=entries.filter(e=>e.business.values.type===l.id);
   return '<article id="lot-'+l.id+'" tabindex="-1"><h3>'+esc(l.use)+'</h3>'+occupants.map(e=>esc(e.label)+' · '+offers(e.business,day,false,runs.get(e.id),e.id)).join('')+(occupants.length?'':note('No saved offers for this business type.'))+'</article>';
 }).join('')+entries.map(e=>'<article id="lot-workspace-'+esc(e.id)+'" tabindex="-1"><h3>'+esc(e.label)+'</h3>'+venueCard(runs.get(e.id))+offers(e.business,day,false,runs.get(e.id),e.id)+'<a href="'+esc(builderUrl(e.id,'marketing'))+'">Promotions board</a></article>').join('')+'</div>';
}
export function replayLinks(entry,day){
 const url=(entry.business.values.type==='stadium'?'stadium.html':'hq.html')+'?'+new URLSearchParams({workspace:entry.id,day});
 return '<nav class="actions" aria-label="Explore this workspace"><a class="text-button" href="'+esc(url)+'">Ask the floor about '+esc(entry.label)+'</a><a class="text-button" href="district.html?day='+day+'#lot-'+esc(entry.id)+'">Open the district map</a></nav>';
}
export const dayPicker=day=>select('display-day','Simulation day',simulationDays,day);
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
   return '<g data-owner="'+name+'" transform="translate('+x+' '+y+')"><rect x="-32"  y="-9" width="64" height="17" rx="4" fill="'+(active?'#87532c':'#294537')+'"/><text fill="#fff9e6" text-anchor="middle" y="3" font-size="10">'+name+'</text>'+'<circle cy="-20" r="7" fill="#f5dc90" stroke="#78522c" stroke-width="3" visibility="'+(active?'visible':'hidden')+'"/>'+'</g>';
 }).join('');
 return shellHeading('Operating headquarters','Campaign floor',b.values.concept+' · Recorded rule-based campaign work on day '+day)+
 '<div class="floor-visual">'+floorFor(b.values.type)+'<svg aria-hidden="true" viewBox="'+overviewBox+'">'+markers+'</svg></div><div class="tools">'+dayPicker(day)+(tasks.length?select('beat','Source-clock task',Object.fromEntries(tasks.map((t,i)=>[i,t.owner+' · '+t.action])),Math.min(beat,tasks.length-1)):'')+'</div>'+(tasks.length>1?'<button type="button" class="button" data-act="play-handoffs" aria-pressed="false">Play campaign handoffs</button>':'')+
 (event?'<div class="active-task"><p class="kicker">Working · '+event.owner+'</p><h2>'+esc(event.action)+'</h2>'+evidence(event.record,'Inspect '+event.record)+'</div>':note('No campaign tasks recorded this day.'))+
 '<details><summary>Accessible specialist activity list</summary><ul>'+floorOrder.map(name=>'<li><strong>'+name+'</strong> · <span data-activity="'+name+'">'+(event?.owner===name?esc(event.action)+' '+evidence(event.record):'Idle for this campaign beat')+'</span></li>').join('')+'</ul></details><p><a href="#simulation">Return to the four-week simulation</a></p>';
}
