import {profiles,operatingProfile,fields} from './idea-profiles.js';
import {replayLink} from './idea-replay.js';
import {esc} from './views.js';
import {scenarios} from './idea-profiles.js';
export const dollars=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n/100);
export const num=n=>n.toLocaleString('en-US');
export const disclosure='Synthetic simulation — not financial, legal or tax advice.';
export function table(headers,rows,caption=''){
  return `<table class="compact">${caption?'<caption>'+esc(caption)+'</caption>':''}<thead><tr>${headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((v,i)=>i?'<td>'+v+'</td>':'<th scope="row">'+v+'</th>').join('')+'</tr>').join('')}</tbody></table>`;
}
export function sourceLink(id,keys,week,label,positions){
  const href=replayLink('inspector',id,keys,week.week*7,{id:week.id,...(positions?{positions}:{})});
  return `<a href="${esc(href)}">${esc(label||week.id)}</a>`;
}
export function ledgerRows(data,id,keys,unit){
  return table(['Week',unit[0].toUpperCase()+unit.slice(1),'Net sales','Income','Closing cash'],data.weeks.map(w=>[
    sourceLink(id,keys,w,'Week '+w.week),num(w.served),dollars(w.revenue),dollars(w.income),dollars(w.cash)]));
}
export function chart(weeks,unit,dark=false){
  const max=Math.max(1,...weeks.map(w=>w.served)),color=dark?'#e7c390':'#32624d',ink=dark?'#f5f2e6':'#3f5146';
  return `<svg class="chart" viewBox="0 0 390 114" role="img" aria-label="${esc(unit)} by week: ${weeks.map(w=>w.served).join(', ')}"><line x1="12" y1="88" x2="381" y2="88" stroke="${ink}" opacity=".35"/>${weeks.map((w,i)=>{
    const h=Math.max(1,w.served/max*55),x=20+i*95;
    return `<rect x="${x}" y="${88-h}" width="56" height="${h}" fill="${color}"/><text x="${x+28}" y="${81-h}" text-anchor="middle" fill="${ink}" font-size="12">${w.served}</text><text x="${x+28}" y="106" text-anchor="middle" fill="${ink}" font-size="12">Week ${i+1}</text>`;}).join('')}</svg>`;
}
function definition(pairs){return '<dl class="data-list">'+pairs.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>';}
export function assumptionDetails(idea){
 const s=operatingProfile(idea),p=profiles[idea.type];
 return definition([['Trading unit',s.unit],['Weekday arrivals (Mon–Sun)',s.weekday.join(' / ')],['Opening ramp','70%, 80%, 90%, 100%. Seed 27 adds deterministic daily variation of −4% to +4%.'],
 ['Capacity',s.capacity+' '+s.unit+' per staffed position per day; '+s.hours+' hours of coverage.'],
 ['Offer mix per 100 '+s.unit,s.names.map((n,i)=>n+' × '+s.mix[i]).join(' · ')],
 ['Prices / unit supply cost',s.names.map((n,i)=>n+' '+dollars(s.prices[i])+' / '+dollars(s.costs[i])).join(' · ')],
 ['Payroll',idea.staff+' positions at '+dollars(s.wage)+'/hour. Relief shifts aggregated.'],
 ['Rent / utilities per day',dollars(s.dailyRent)+' / '+dollars(s.utilities)+' plus $0.12 per delivered item.'],
 ['Tax assumption',idea.type==='salon'?'0% across this illustrative basket; verify service and retail treatment locally.':'8% across the illustrative basket; verify the actual local rate.'],
 ['Demand and premises','District multiplier and square roots of footprint and opening duration scale the sector’s reference demand. City is a label.'],
 ['Service and restocking','Half of unserved guests can forgo one return across the next three days (50/30/20%). Delays above 10 minutes increase walkouts. Updated weekly ratings affect first-time visits. Same-day baseline orders need cash and a forecast budget plus 18%; orders over $920 require recorded policy review.'],
 ['Model boundary','Opening cash is working capital after fit-out. Inventory, refunds, wages and weekly settlements are posted. Financing, construction, owner draws and income tax are outside the projection.']]);
}
export function reportView(idea,status,assessment,id){
 const {baseline:b,recommended,sweep,risks,singles}=assessment,unit=profiles[idea.type].unit;
 const src=w=>sourceLink(id,[],w);const sheet=(title,body)=>`<section class="report-sheet"><p class="kicker">Pavilion A · Launch readiness</p><h2>${esc(title)}</h2><p class="report-disclosure">${disclosure} No data leaves the browser.</p>${body}</section>`;
 const accepted=definition(Object.entries(fields).map(([k,l])=>[l,(k==='type'?profiles[idea.type].label:idea[k])+' · '+(status[k]||'confirmed')]));
 const current=baselineText(b);
 return `<div class="no-print"><p class="kicker">Launch readiness</p><h1 tabindex="-1">Your report</h1><p>${esc(idea.concept)} · 28 days · Seven printable sections</p><div class="actions"><button id="print">Print / Save as PDF</button><button class="quiet" id="back-results">Back to projection</button></div></div>`+
 sheet('The concept',`<h3>${esc(idea.concept)}</h3>${accepted}`)+
 sheet('Operating assumptions',assumptionDetails(idea))+
 sheet('Four-week projection',`${chart(b.weeks,unit)}${ledgerRows(b,id,[],unit)}<p class="source-line">Baseline weekly close IDs · ${b.weeks.map(src).join(' · ')}</p>`)+
 sheet('Break-even and cash runway',`<h3>Break-even net sales</h3><p>${b.breakEven===null?'Unreachable at the modeled contribution margin.':dollars(b.breakEven)+' over 28 days at the realized mix.'}</p><p>Fixed costs ${dollars(b.fixed)} divided by the contribution margin. Supply costs and per-item utilities total ${dollars(b.variableCost)}.</p><h3>Cash runway</h3><p>${current}</p><p>Available cash at day 28 is ${dollars(b.free)} after reserving unpaid operating costs and sales tax. Week-four net cash burn after those obligations is ${dollars(b.burn)}.</p><p class="source-line">Week-three and week-four closes · ${b.weeks.slice(2).map(src).join(' · ')}</p>`)+
 sheet('Staffing recommendation',`<p>${recommended.staff} positions gives the highest four-week operating income in the 1–12 position sweep. Your confirmed plan has ${idea.staff}. Ties favor the smaller team.</p>${table(['Positions',unit,'28-day income'],sweep.map(row=>[String(row.staff),num(row.served),dollars(row.income)]))}<p class="source-line">Recommended roster, week-four close · ${sourceLink(id,[],{week:4,id:recommended.closeIds[3]},null,recommended.staff)}</p>`)+
 sheet('Three operating risks',risks.map(k=>{const row=singles[k],delta=row.numbers.income-b.numbers.income;return `<h3>${scenarios[k].label}</h3><p>${esc(scenarios[k].reason)} Four-week operating income changes by ${dollars(delta)}. Closing cash is ${dollars(row.numbers.cash)}.</p><p class="source-line">${esc(scenarios[k].label)} · weekly close records ${row.weeks.map(w=>sourceLink(id,[k],w)).join(' · ')}</p>`;}).join('')+'<p>Ranked by change in operating income, using the same seed and opening plan.</p>')+
 sheet('What to validate next',`<ol><li>Count ${esc(unit)} by hour for a representative weekday and weekend. Compare them with the weekday forecast.</li><li>Ask suppliers for actual item costs, minimum order sizes and lead times.</li><li>Measure hands-on time per ${idea.type==='salon'?'appointment':'transaction'}, wait tolerance and repeat bookings or visits.</li><li>Obtain current rent, wage, utilities and tax estimates for ${esc(idea.city)}. Replace synthetic assumptions before making a financial decision.</li></ol>`);
}
export function baselineText(b){
 if(b.runway===0)return 'Available cash is exhausted at the four-week close.';
 if(b.runway===null)return 'Week four generated or held cash. A finite runway cannot be estimated from that week.';
 return 'About '+b.runway.toFixed(1)+' weeks at the week-four burn rate, assuming that rate continues.';
}
