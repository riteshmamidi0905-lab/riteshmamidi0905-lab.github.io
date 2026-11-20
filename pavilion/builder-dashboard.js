import {btn,esc,input,select,options,money,count,shellHeading,note} from './builder-common.js';
import {themes,domainIdeas} from './builder-site.js';
import {sectors,types} from './builder-plan.js';
import {elevation} from './builder-art.js';
export const tabs={overview:'Overview',website:'Website',products:'Products/Menu',operations:'Operations',marketing:'Marketing & Ads',customers:'Customers',finance:'Finance',simulation:'Simulation',report:'Report'};
export const evidence=(id,label=id)=>'<button class="source" type="button" data-record="'+esc(id)+'">'+esc(label)+'</button>';
const row=(label,text)=>'<div class="line"><span>'+esc(label)+'</span><strong>'+text+'</strong></div>';
export function stat(title,value,id){return '<div class="stat"><span>'+esc(title)+'</span><strong>'+evidence(id,value)+'</strong></div>';}
export function wrap(b,page,content,archive=''){
 const active=['hq','district'].includes(page)?'simulation':page;
 return '<div class="workbench"><aside class="side"><div class="side-name">'+esc(b.values.concept)+'</div><form id="section-jump" class="mobile-section">'+select('section','Dashboard section',tabs,active)+'<button class="quiet" type="submit">Open section</button></form><nav aria-label="Business dashboard">'+Object.entries(tabs).map(([key,label])=>'<a href="#'+key+'"'+(active===key?' aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav><div class="manage">'+'<details><summary>Manage workspace</summary>'+archive+'</details></div></aside><div class="panel">'+content+'</div></div>';
}
export function totalStats(result){
 const s=result.total;
 return '<div class="stats">'+stat('Four-week revenue',money(s.gross),'B-RESULT')+stat('Operating income',money(s.income),'B-RESULT')+stat('Closing cash',money(s.cash),'B-RESULT')+'</div>';
}
const weekColumns = [
 {name: 'Served', key: 'served', format: count},
 {name: 'Revenue', key: 'gross', format: money},
 {name: 'Operating income', key: 'income', format: money},
 {name: 'Closing cash', key: 'cash', format: money}
];
export function weekly(result) {
 const headings = ['Week', ...weekColumns.map(column => column.name)];
 const header = headings.map(name => '<th scope="col" role="columnheader">'+name+'</th>').join('');
 const weeks = result.weeks.map(week => {
  const headerCell = '<th scope="row" role="rowheader">'+evidence(week.id, 'Week '+week.week)+'</th>';
  const cells = weekColumns.map(({name, key, format}) =>
   '<td role="cell"><span class="week-field" aria-hidden="true">'+name+'</span>'+
   evidence(week.id, format(week[key]))+'</td>'
  ).join('');
  return '<tr role="row">'+headerCell+cells+'</tr>';
 });
 return '<div class="table-scroll"><table class="weekly-ledger" role="table">'+
  '<caption>Four-week operating ledger</caption><thead role="rowgroup"><tr role="row">'+header+
  '</tr></thead><tbody role="rowgroup">'+weeks.join('')+'</tbody></table></div>';
}
export function overview(b,res){
 const sector=Object.entries(sectors).find(([,s])=>s.types.includes(b.values.type))[0];
 return shellHeading('Business overview',b.values.concept,b.values.city+' · '+types[b.values.type]+' · '+b.values.goals)+
 '<div class="overview-hero"><div><p class="kicker">Four-week simulation</p><h2>Your opening month</h2><p>See how the operating plan holds up, then compare a campaign to the same business without it.</p><a class="button primary" href="#simulation">Explore the projection</a></div><div class="art">'+elevation(sector)+'</div></div>'+totalStats(res)+
 '<h2>Next steps</h2><div class="cards">'+[['website','Shape your website','Preview the site and its opening story.'],['products','Set your margins','Review the mix, prices and unit costs.'],['marketing','Plan an offer','Compare extra sales with acquisition costs.']].map(([id,title,detail])=>'<a class="task-card" href="#'+id+'"><h3>'+title+'</h3><p>'+detail+'</p></a>').join('')+'</div>';
}
export function website(b,device,day){
 const s=b.site;
 return shellHeading('Website','Your storefront','Edit the text and appearance, then download a self-contained HTML preview.')+
 '<form id="website-form" class="editor"><div class="form-grid">'+input('title','Hero headline',s.title,'required maxlength="72"')+select('theme','Visual theme',themes,s.theme)+input('accent','Accent color',s.accent,'type="color"')+input('story','Story',s.story,'required maxlength="220"')+'</div><fieldset><legend>Visible sections</legend>'+['offers','hours','story'].map(k=>'<label class="check inline"><input type="checkbox" name="sections" value="'+k+'"'+(s.sections.includes(k)?' checked':'')+'> '+({offers:'Offerings',hours:'Hours and location',story:'Story'})[k]+'</label>').join('')+'</fieldset><button class="button primary">Save website edits</button></form><div class="section-line"><h2>Website preview</h2><div class="toolbar">'+btn('device',device==='mobile'?'Desktop preview':'Mobile preview','quiet')+btn('export','Download static HTML')+'</div></div><p class="tip">Offers shown for simulation day '+day+'.</p><div class="site-preview '+device+'"><div class="storefront-window" role="region" aria-label="Business website preview" tabindex="0"></div></div><h2>Domain ideas</h2>'+note('Suggestions — not registered. Availability is unknown.')+'<ul class="pills">'+domainIdeas(b.values.concept).map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>';
}
export function products(b){
 return shellHeading('Products/Menu','Price the offer','Each item keeps a fixed record ID. Prices and costs feed the four-week ledger.')+
 '<form id="products-form">'+b.items.map(item=>'<fieldset class="product"><legend>'+esc(item.id)+'</legend><div class="product-grid">'+input('name-'+item.id,'Offering',item.name,'maxlength="48" required')+input('price-'+item.id,'Price ($)',(item.price/100).toFixed(2),'type="number" min=".01" max="1000" step=".01" required')+input('cost-'+item.id,'Unit cost ($)',(item.cost/100).toFixed(2),'type="number" min=".01" max="1000" step=".01" required')+'<div class="margin"><small>Gross margin</small><b>'+((item.price-item.cost)*100/item.price).toFixed(1)+'%</b></div></div></fieldset>').join('')+'<button class="button primary">Save product edits</button></form>';
}
export function operations(b,r){
 const last=r.days.at(-1),v=b.values,venue=v.type==='stadium';
 const suppliers=venue?b.items.map(item=>{
   const orders=Object.values(r.records).filter(rec=>rec.kind==='Vendor supply'&&rec.vendor===item.id&&rec.ordered>0);
   const source=orders.at(-1);return source?row(item.name,evidence(source.id,'Day '+source.day+' · '+source.ordered+' ordered')):'';
 }).join(''):Object.values(r.records).filter(rec=>rec.kind==='Fictional supplier').map(rec=>row(rec.name,evidence(rec.id,'Supplies '+rec.materialId))).join('');
 return shellHeading('Operations','Behind the counter','Adjust the operating assumptions and inspect the resulting stock close.')+
 '<form id="operations-form" class="editor"><div class="form-grid">'+input('staff',venue?'Lead vendor positions':'Staff positions',v.staff,'type="number" min="1" max="12" required')+input('hours',venue?'Event shift hours':'Opening hours',v.hours,'required maxlength="220"')+input('lead','Supplier delivery lead (extra days)',b.lead,'type="number" min="0" max="7" required')+input('stock',venue?'Forecast stock target (%)':'Opening stock target (%)',b.stock,'type="number" min="25" max="200" required')+'</div><button class="button primary">Save operating plan</button></form><h2>Suppliers and deliveries</h2>'+suppliers+'<h2>Inventory at close</h2>'+Object.entries(last.inventory).map(([id,n])=>row(id,evidence(last.id,count(n)+' units'))).join('')+'<p><a href="#hq">Open campaign headquarters</a></p>';
}
export function customers(b,r){
 const v=b.values,s=r.total,rec=r.records['B-AUDIENCE'];
 return shellHeading('Customers','Who comes back','Anonymous synthetic segments. The model contains no individual identities or contact details.')+
 '<div class="stats">'+stat('Served over four weeks',count(s.served),'B-RESULT')+stat('Modeled returning share',rec.repeatPercent+'%',rec.id)+stat('Lost future visits',count(s.lost),rec.id)+'</div><h2>Customer mix</h2>'+
 row('First-time or event-driven',evidence(rec.id,100-rec.repeatPercent+'%'))+row('Repeat / local',evidence(rec.id,rec.repeatPercent+'%'))+note(rec.basis)+
 (v.type==='stadium'?note('The venue records walkaways during events. Its calendar does not propagate lost visits to the next game.'):note('Half of unserved covers enter the lost-return pool over the following three days.'))+
 (r.attribution?row('Existing offer redemptions',evidence('B-ROI',count(r.attribution.existing))):'');
}
export function finance(b,r){
 const s=r.total;return shellHeading('Finance','Follow the money','Open any figure to see its calculation and source closes.')+totalStats(r)+
 row('Cost of goods',evidence('B-RESULT',money(s.cost)))+row('Other operating costs',evidence('B-RESULT',money(s.fixed)))+
 row('Four-week break-even revenue',evidence('B-RESULT',s.breakEven===null?'No positive contribution':money(s.breakEven)))+
 row('Cash runway at the last week’s burn',evidence('B-RESULT',s.runway===null?'No net burn observed':s.runway.toFixed(1)+' weeks'))+
 note('Break-even holds the four-week contribution margin and operating costs constant. Runway uses cash available after operating and tax obligations.')+weekly(r);
}
export function simulation(b,r){
 return shellHeading('Simulation','Run four weeks','Compare daily operating records with the same opening plan.')+'<div class="actions">'+btn('run','Run four weeks','button primary')+'<a class="button" href="#hq">View headquarters</a><a class="text-button" href="#district">NASHA District offers</a></div>'+totalStats(r)+weekly(r);
}
export function report(b,r){
 return shellHeading('Launch-readiness report',b.values.concept,'Synthetic simulation — not financial, legal or tax advice.')+'<div class="actions">'+btn('print','Print / Save as PDF')+'</div>'+
 '<h2>Opening assumptions</h2><p>'+esc(types[b.values.type]+' in '+b.values.city+' · '+b.values.size+' · '+b.values.hours+' · '+b.values.staff+' positions')+'</p>'+totalStats(r)+weekly(r)+
 '<h2>Before committing money</h2><p>Check actual demand, supplier terms and staffing costs. Test the offer with real customers before using these projections to make a decision.</p>';
}
export function recordHTML(record,lookup){
 const link=v=>typeof v==='string'&&lookup(v)?evidence(v):esc(String(v??'—'));
 const value=v=>Array.isArray(v)?v.map(x=>typeof x==='object'?esc(JSON.stringify(x)):link(x)).join(' · '):v&&typeof v==='object'?'<code>'+esc(JSON.stringify(v))+'</code>':link(v);
 return '<h2 id="source-title">'+esc(record.kind||'Source record')+'</h2><p class="kicker">'+esc(record.id)+'</p><dl>'+Object.entries(record).filter(([k])=>!['scenario','id','kind'].includes(k)).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+value(v)+'</dd>').join('')+'</dl>';
}
