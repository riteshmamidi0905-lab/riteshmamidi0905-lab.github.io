// Each comparison removes exactly one offer from the same synthetic plan.
// Effects of overlapping offers are marginal and need not add up to the portfolio ROI.
const money = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});
const dollars = cents => money.format(cents / 100);
const normal = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function campaignAnswer(book, text) {
  const q = ' '+normal(String(text).slice(0,240))+' ';
  const offers = book?.offers || [];
  const ids = offers.filter(c => q.includes(' '+normal(c.id)+' '));
  const matches = ids.length ? ids : offers.filter(c => q.includes(' '+normal(c.offer)+' '));
  if (!matches.length && !/\b(campaigns?|promotions?|offers?|combos?|ads?|paid off)\b/.test(q)) return null;
  const reply = (message,ids=[]) => ({intent:'campaign',message,ids,flight:[]});
  if (!offers.length) return reply('This replay has no recorded Builder campaigns. Open a saved business from NASHA District to inspect its promotions.');
  const ranking=/\b(which|best|rank|compare|paid off|most profitable)\b/.test(q);
  if (!matches.length && !ranking) return reply('Choose a recorded promotion by its name or ID: '+offers.map(c=>c.offer+' ('+c.id+')').join(', ')+'.');
  if (matches.length>1 && !ranking) return reply('More than one recorded promotion matches. Ask using its campaign ID: '+matches.map(c=>c.id).join(', ')+'.');
  const records=(matches.length?matches:offers).map(c=>book.effect(c.id));
  const top=Math.max(...records.map(r=>r.netCents));
  const leaders=records.filter(r=>r.netCents===top).map(r=>r.offer+' ('+r.campaign+')').join(', ');
  const summary=records.length===1 ? leaders+(top<0?' reduced':top>0?' increased':' did not change')+' four-week operating income'+(top?' by '+dollars(Math.abs(top)):'')+'.' :
    top<=0?'No promotion increased four-week operating income. The highest result was '+leaders+' at '+dollars(top)+'.':
    'The highest four-week gain was '+leaders+' at '+dollars(top)+'.';
  return reply(summary+' Each result compares the full simulated plan with the same plan excluding only that offer. Spend and discounts are included.',records.map(r=>r.id));
}
export function activePromotions(business, result, day) {
  return business.campaigns.filter(c => result.records['B-D'+String(day).padStart(2,'0')+'-'+c.id]);
}
export function builderUrl(id, section='overview', parameters={}) {
  return 'start.html?'+new URLSearchParams({workspace:id,...parameters})+'#'+section;
}
