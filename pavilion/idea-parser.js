import {defaults, fields, profiles, hoursLong} from './idea-profiles.js';

const types={
  brewery:/\b(brewpub|microbrewery|brewery|taproom)\b/i,coffee:/\b(caf[eé]|coffee(?:house| shop| roaster| bar)|espresso bar|roastery)(?![\p{L}\d_])/iu,
  bakery:/\b(bakery|bakeshop|bakehouse|patisserie)\b/i,truck:/\b(food truck|taco truck|mobile kitchen|food cart)\b/i,
  retail:/\b(boutique|retail shop|gift (?:shop|store)|clothing store|bookshop)\b/i,salon:/\b(salon|barber(?:shop)?|beauty studio|hair studio|hairdresser)\b/i
};
const areas={downtown:/\b(downtown|city cent(?:er|re))\b/i,suburban:/\b(suburb(?:s|an)?|outskirts)\b/i,
  campus:/\b(campus|university district)\b/i,industrial:/\b(industrial|warehouse district)\b/i,neighborhood:/\b(neighbou?rhood|residential)\b/i};
const prices={value:/\b(affordable|value[- ]priced|budget[- ]friendly|low[- ]cost|inexpensive|economy)\b/i,
  premium:/\b(premium|upscale|luxury|high[- ]end)\b/i,standard:/\b(standard|mid[- ](?:priced|range|market)|moderate)\b/i};
const numbers='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const boundary=/\s+(?:with|in|near|for|from|open|budget|serving|selling|offering|featuring|specializing|specialising|staffed|seating|called|named|at|on)\b|[;.!?]/i;
const title=s=>s.replace(/(^|[\s-])\p{L}/gu,c=>c.toUpperCase());
const clean=s=>s.trim().replace(/[.;,]+$/,'').trim();
export const examples=[
  'A neighborhood hair salon called Iris Studio in Austin, 800 sq ft, premium, 3 stylists, open 9am–5pm, $55k to open, offering haircuts, color and scalp treatments.',
  'A 60-seat brewpub named Court House in Austin with four staff, $85,000 to open, serving tacos, lager and lime soda.',
  'A downtown coffee roaster in Portland, open 7am to 4pm with 3 baristas and a $45k budget.',
  'A bakery called Morning Fold in Madison with 24 seats, serving sourdough and cardamom buns.',
  'An affordable taco truck in Tucson, 180 sq ft with two cooks and $42k to open.',
  'A premium retail boutique named Field Notes in Denver, selling linen, candles and notebooks.',
  'A suburban barbershop in Atlanta with 4 barbers, open 10am–7pm, offering cuts and beard trims.',
  'A café or bakery near a campus in Boston with 20 seats. I am still choosing the format.',
  'An industrial microbrewery in Milwaukee with an opening budget of $120,000 and five staff.',
  'A mid-range gift shop in Boise, 900 square feet, open 10:00–18:00 with two employees.'
];
export function normalizeHours(text){
  const time='(\\d{1,2}(?::\\d{2})?)\\s*([ap]\\.?m\\.?)?';
  const match=new RegExp('\\b'+time+'\\s*(?:[-–—]|\\bto\\b|\\buntil\\b)\\s*'+time+'(?!\\w)','i').exec(text);
  if(!match)return null;
  function minutes(raw,ap){let [h,m='00']=raw.split(':').map(Number);
    if(ap){if(h<1||h>12)return null;h=h%12+(/^p/i.test(ap)?12:0);}
    if(h>23||Number(m)>59)return null;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
  if(!match[2]&&!match[4]&&!match[1].includes(':')&&!match[3].includes(':'))return null;
  if(!match[2]&&match[4]&&!match[1].includes(':'))return null;
  const a=minutes(match[1],match[2]),b=minutes(match[3],match[4]);
  return a&&b&&hoursLong(a+'–'+b)?a+'–'+b:null;
}
export function parseIdea(input){
  const text=input.trim().normalize('NFKC');
  if(!text||text.length>1000)throw Error('Describe your idea in 1–1,000 characters.');
  let primary=text.split(/\b(?:serving|selling|offering|featuring|(?:plan|want) to sell|speciali[sz]ing in)\b/i)[0];
  // A product-first pitch can still explicitly place its format after the offerings.
  const place=/\bfrom (?:a|an|my|our) (.+)/i.exec(text);
  if(place&&!Object.values(types).some(re=>re.test(primary)))primary=place[1];
  const candidates=Object.keys(types).filter(k=>types[k].test(primary));
  const values=defaults(candidates.length===1?candidates[0]:''),status=Object.fromEntries(Object.keys(fields).map(k=>[k,'defaulted'])),questions={};
  function put(k,v){values[k]=v;status[k]='parsed';}
  function ask(k,message){questions[k]=message;status[k]='defaulted';}
  if(candidates.length===1)put('type',candidates[0]);else ask('type',candidates.length?'Which of these formats is primary? '+candidates.map(k=>profiles[k].label).join(' or '):'Which supported format is closest to your idea?');
  const named=/\b(?:named|called|call it)\s+["“']?(.+)/i.exec(text);
  const quoted=/["“]([^"”]{1,56})["”]/.exec(text);
  if(named||quoted){const v=quoted?quoted[1]:named[1].split(boundary)[0].split(',')[0];if(clean(v))put('concept',clean(v));}
  const locationClause=primary.replace(/\b(St|Ft|Mt)\.\s+(?=[A-Z])/g,'$1· ');
  const cities=[...locationClause.matchAll(/\b(?:in|city\s*:\s*)\s+(?=((?:[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’·-]*)(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’·-]*){0,5}))/gi)]
    .map(m=>m[1].split(boundary)[0].split(/\s+(?:with|and|or|is|has|opens|seats)\b/i)[0].replace(/^(?:downtown|suburban|industrial)\s+/i,'').trim())
    .filter(v=>v&&!/^(?:a |an |the |downtown$|suburbs$|town$|mind$|(?:opening |working |startup )?(?:capital|funds|cash)$|the bank$)/i.test(v));
  if(cities.length===1&&!/\bin [^,;.]+?\bor (?:in )?[A-Z][a-z]/.test(primary))put('city',title(cities[0]).replaceAll('·','.'));else if(cities.length)ask('city','Which city should this scenario use?');
  for(const [field,patterns] of [['tier',prices],['neighborhood',areas]]){
    const found=Object.keys(patterns).filter(k=>patterns[k].test(primary));
    if(found.length===1)put(field,found[0]);else if(found.length>1)ask(field,'Which '+fields[field].toLowerCase()+' should we use?');
  }
  const sized=[...text.matchAll(/\b([\d,]+)[ -]*(seats?|seaters?|covers?|sq\.?\s*ft\.?|square[- ]f(?:ee|oo)t|ft²|ft2)\b/gi)];
  if(sized.length===1&&!/\d\s*[-–]\s*\d+\s*seats/i.test(text)){const [,n,u]=sized[0];put('size',Number(n.replaceAll(',',''))+' '+(/seat|cover/i.test(u)?'seats':'sq ft'));}
  else if(sized.length)ask('size','Which single footprint or seat count applies?');
  const numbered=text.replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi,s=>numbers.indexOf(s.toLowerCase()));
  const staff=[...numbered.matchAll(/\b(\d+)[ -]*(?:part[- ]time |full[- ]time )?(?:staff(?:ers)?|employees?|workers?|people|person|stylists?|baristas?|bakers?|cooks?|barbers?|assistants?|positions?)\b|\b(?:team|crew|staff) of (\d+)\b/gi)];
  if(staff.length===1&&!/\d\s*(?:[-–]|or|to)\s*\d+\s*(?:staff|employees|workers|positions|baristas|stylists)/i.test(numbered))put('staff',Number(staff[0][1]||staff[0][2]));
  else if(staff.length>0)ask('staff','How many people work one shift, including the owner?');
  const hours=/\b24\/7\b/.test(text)?'00:00–00:00':normalizeHours(text);
  if(hours)put('hours',hours);
  if((!hours&&/morning[- ]to[- ]evening|evenings? only|mornings? only|late nights?/i.test(text))||(!hours&&/\b(?:open|hours)\s+(?:from\s+)?\d/i.test(text))||/\b(?:weekends only|weekdays only|closed on|weekend hours|mon(?:day)?[-–]fri(?:day)?)\b/i.test(text))ask('hours','What representative daily interval should we model across seven days?');
  const amounts=[...text.matchAll(/(?:\$|\bUSD\s*)\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b|thousand\b|million\b|m\b)?|\b(\d[\d,]*(?:\.\d+)?)\s*(k\b|thousand\b|million\b)?\s*(?:USD|dollars)\b/gi)];
  const candidatesMoney=amounts.filter(m=>{const before=text.slice(Math.max(0,m.index-40),m.index).split(/[,;.]/).at(-1);const after=text.slice(m.index+m[0].length,m.index+m[0].length+28);return /(?:budget|capital|starting with|invest|funds|available|funding|cash to open)(?:\s+(?:of|is|about))?\s*:?\s*$/i.test(before)||/^\s*(?:opening |startup |start-up )?(?:budget|capital|to (?:open|start|launch)|into opening|in (?:opening |working )?(?:funds|capital)|available)/i.test(after);});
  const budgetRange=/\$[\d,.]+\s*k?\s*(?:[-–]|to|or)\s*\$?[\d,.]+/i.test(text);
  if(candidatesMoney.length===1&&!budgetRange){const m=candidatesMoney[0],suffix=(m[2]||m[4]||'').toLowerCase();put('budget',Math.round(Number((m[1]||m[3]).replaceAll(',',''))*(suffix.startsWith('m')?1e6:suffix?1e3:1)));}
  else if(amounts.length)ask('budget','Which amount is opening capital in US dollars?');
  const offer=/\b(?:serving|selling|offering|featuring|(?:plan|want) to sell|speciali[sz]ing in|signature(?: products| services)?\s*:)\s+(.+)/i.exec(text);
  if(offer){const part=offer[1].split(boundary)[0].split(/,\s*(?=(?:open|budget|\$|\d+\s+(?:staff|seat)))/i)[0];
    const list=part.split(/\s*,\s*|\s+and\s+| & /i).map(clean).filter(Boolean);
    if(list.length>=1&&list.length<=3&&!/\bor\b/i.test(part))put('products',list.join(', '));else ask('products','Which one to three offerings should represent your mix?');}
  if(!offer&&/\bor\b[^.;]{1,55}\b(?:signature|main|primary) offering/i.test(text))ask('products','Which offerings should represent your main business?');
  for(const [key,min,max] of [['staff',1,12],['budget',500,1000000]]){
    if(status[key]==='parsed'&&(values[key]<min||values[key]>max))ask(key,'What value within '+min+'–'+max+' should we model?');
  }
  if(status.size==='parsed'){
    const limit=values.size.endsWith('seats')?400:20000, n=parseInt(values.size,10);
    if(n<1||n>limit)ask('size','Choose a footprint within the supported range (400 seats or 20,000 sq ft).');
  }
  for(const k of Object.keys(questions))values[k]=defaults(values.type)[k];
  return {values,status,questions};
}
