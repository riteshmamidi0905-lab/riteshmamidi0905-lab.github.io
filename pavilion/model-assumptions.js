import {brewpub} from './brewpub.js';
import {weekFigures,usd} from './week-comparison.js';
import {url,esc} from './views.js';
export function assumptions(model,day) {
  if(model.config.edition!==3)return '';
  const t=model.records.TERMS;
  const weekly=model.weeks.map((id,i)=>weekFigures(model,i+1));
  const basket=model.products.map((id,i)=>model.records[id].priceCents*t.unitsPerHundredCovers[i]);
  const check=basket.reduce((a,b)=>a+b,0), percent=(n,d)=>(100*n/d).toFixed(1)+'%';
  const list=x=>x.join(' / ');
  const staff=t.staffIds.map(id=>model.records[id]);
  const mixes=model.products.map((id,i)=>{
    const sku=model.records[id],unitCost=Object.entries(sku.recipe).reduce((s,[k,v])=>s+v*model.records[k].unitCostCents,0);
    return '<tr><th scope="row">'+esc(sku.name)+'</th><td>'+t.unitsPerHundredCovers[i]+'</td><td>'+usd(sku.priceCents)+'</td><td>'+percent(basket[i],check)+'</td><td>'+usd(unitCost)+' · '+percent(unitCost,sku.priceCents)+'</td></tr>';
  }).join('');
  const declined=weekly.map(({w})=>model.events.filter(e=>e.day>=w.from&&e.day<=w.through).flatMap(e=>e.outputs.map(id=>model.records[id])).filter(r=>r.kind==='Approval record'&&!r.approved).length);
  const weeks=weekly.map(({numbers,w,meals},i)=>'<tr><th scope="row"><a href="'+url('inspector',model,w.through,{id:w.id})+'">Week '+(i+1)+'</a></th><td>'+t.weeklyRampPercent[i]+'%</td><td>'+meals+'</td><td>'+usd(numbers.revenue)+'</td><td>'+usd(w.netIncomeCents)+'</td><td>'+numbers.shortages+'</td><td>'+declined[i]+'</td></tr>').join('');
  return '<details class="paper assumptions" id="model-assumptions" open><summary><strong>Model assumptions</strong> · Synthetic Austin brewpub</summary><div class="assumption-grid"><section><h3>Guests and service</h3><p>Monday through Sunday, mature demand is '+list(t.fullWeekCovers)+' covers. The opening ramp is '+list(t.weeklyRampPercent.map(x=>x+"%"))+' over four weeks. A fixed seed varies each day by −4% to +4%. Each price point above baseline lowers forecast covers by 0.45% of original demand.</p><p>One cover calls for one entrée. Each staffed position supports '+t.coversPerPosition+' covers per day. An entrée served is the model’s realized-cover proxy. Drinks can sell separately when the kitchen runs short.</p></section>'+
    '<section><h3>Operating costs</h3><p>'+staff.length+' rotating shift positions, '+staff[0].scheduledMinutes/60+' paid hours per position per service. '+staff.map(s=>esc(s.role)+' '+usd(s.hourlyRateCents)+'/h').join(' · ')+'.</p><p>Daily rent '+usd(t.dailyRentCents)+'. Utilities '+usd(t.dailyUtilityBaseCents)+' plus '+usd(t.utilitiesPerCompletedUnitCents)+' per item. Sales tax is '+(t.salesTaxBasisPoints/100).toFixed(2)+'% and settles weekly with operating bills.</p></section></div>'+
    '<h3>Menu economics</h3><p>At the modeled mix the pre-tax check is '+usd(Math.round(check/100))+' per cover. Recipe costs post only when items sell.</p><div class="scroll-table"><table><thead><tr><th>Item</th><th>Units / 100 covers</th><th>Price</th><th>Revenue mix</th><th>Unit cost / COGS ratio</th></tr></thead><tbody>'+mixes+'</tbody></table></div>'+
    '<h3>Four-week operating trajectory</h3><p>Rent and scheduled wages accrue from opening day. More guests spread those costs across more sales. Staffing limits, delivery delays and purchase decisions can leave demand unfilled. The weeks below come from the posted ledger.</p><div class="scroll-table"><table><thead><tr><th>Close</th><th>Ramp</th><th>Entrées served</th><th>Net revenue</th><th>Operating income</th><th>Unfilled items</th><th>Declined orders</th></tr></thead><tbody>'+weeks+'</tbody></table></div>'+
    '<p>Opening working capital is '+usd(model.records.PLAN.openingCashCents)+'. Initial stock targets 75 lager pours, 18 spritzes and 60 food portions per studio, capped at 25% of opening cash. Reorders include an '+brewpub.bufferPercent+'% stock buffer. The purchase cap is '+usd(model.records.PLAN.purchaseApprovalLimitCents)+'. Reorders cover expected staffed demand through delivery, less stock and open orders. Stock is paid on receipt. The default delivery lag is zero days. One sold item is refunded every third operating day when sales exist.</p><p>All inputs are synthetic planning assumptions. The ledger excludes build-out, financing, depreciation, employer benefits, gratuities, income taxes and card fees. No measured Austin operator results are represented.</p><a href="'+url('inspector',model,day,{id:'TERMS'})+'">Inspect operating terms</a></details>';
}
