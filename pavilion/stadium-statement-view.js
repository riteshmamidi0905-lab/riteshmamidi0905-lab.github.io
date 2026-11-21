import {esc} from './views.js';
import {facilityTerms,referenceMargin} from './stadium-economics.js';

const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const money=n=>usd.format(n/100);
export const operatorMargin=r=>r.margin===null?'No revenue':(r.margin*100).toFixed(1)+'%';
export function venueAssumptions() {
  const rates=Object.values(facilityTerms).map(t=>{
    const basis=t.guestsPerWorker?'One worker per '+t.guestsPerWorker+' attendees, rounded up. '+money(t.hourly)+'/hour for '+t.gameHours+' hours per game or '+t.concertHours+' per concert.':
      money(t.daily)+' per calendar day at 8,200 seats, scaled by seat count.'+(t.perGuest?' Plus '+money(t.perGuest)+' per attendee.':'');
    return '<li><strong>'+t.label+'</strong> · '+basis+'</li>';
  }).join('');
  return '<details class="facility-terms"><summary>Model assumptions · venue operator</summary><p>Synthetic planning case for a mid-size, 8,200-seat venue with eight home games and one concert in 28 days. The operator retains a facility admission fee of $2.25 per game attendee or $3.40 per concert attendee. Gross ticket sales belong outside this model.</p><ul>'+rates+'</ul><p>A cancellation retains 25% of forecast labor. Each open vendor remits 12% of gross stand sales plus its booth fee. The promoted vendor funds its own ads and rebates. Settlement is based on sales before promotional rebates.</p><p>The reference operator margin band is '+referenceMargin.min+'–'+referenceMargin.max+'% of operator revenue. This is a synthetic planning assumption for the default schedule and vendor mix, chosen to allow a modest operating surplus after facility costs. It is not a measured industry benchmark. Changes to attendance, mix or staffing may move the result outside that band.</p></details>';
}
export function venueStatement(pl,link) {
  const op=pl.operator;
  function row(entity,id,label=entity.entity) {
    return '<tr><th scope="row">'+link(id,label)+'</th>'+[['revenue','Revenue'],['expense','Operating costs'],['income','Operating income']].map(([k,title])=>'<td><span class="amount-name" aria-hidden="true">'+title+'</span>'+money(entity[k])+'</td>').join('')+'</tr>';
  }
  const lines=[
    row(op,'PL-OPERATOR'),...pl.vendors.map(v=>row(v,'PL-'+v.vendor)),
    row({revenue:-pl.transfers,expense:-pl.transfers,income:0},'PL-COMBINED','Eliminate internal booth fees and revenue share'),
    row(pl.combined,'PL-COMBINED')
  ];
  const detail=Object.entries(facilityTerms).map(([id,t])=>'<li>'+t.label+' · '+money(op.costs[id])+'</li>').join('');
  return '<section data-entity-statement><h2>Who earns what?</h2><div class="table-scroll table-wrap"><table class="entity-ledger"><caption>Four-week income by business · USD</caption><thead><tr><th>Entity</th><th>Revenue</th><th>Operating costs</th><th>Operating income</th></tr></thead><tbody>'+lines.join('')+'</tbody></table></div>'+
    '<p>The combined income is the sum of the operator and vendor incomes. Internal transfers of '+money(pl.transfers)+' cancel from revenue and costs. Vendor revenue includes any promotional rebates as deductions.</p>'+
    '<details class="operator-detail"><summary>Venue operator income and costs</summary><p>Facility admissions '+money(op.admissions)+' · concession revenue share '+money(op.share)+' · booth fees '+money(op.fees)+'.</p><ul>'+detail+'</ul><p>Operator operating margin · '+operatorMargin(op)+'.</p></details>'+venueAssumptions()+'</section>';
}
