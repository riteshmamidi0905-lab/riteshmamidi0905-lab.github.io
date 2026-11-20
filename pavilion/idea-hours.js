// A trading day owns every interval that starts on it, including work past midnight.
const clock = String.raw`(?:noon|midnight|\d{1,2}(?::\d{2})?(?:\s*[ap]\.?m\.?)?)`;
const rangePattern = new RegExp(String.raw`(?<![\p{L}\d$])(${clock})\s*(?:[-–—]|\bto\b|\buntil\b)\s*(${clock})(?![\p{L}\d:])`, 'giu');
const scopes = /\b(weekdays?|weekends?|mon(?:day)?\s*(?:[-–—]|to|through)\s*fri(?:day)?|sat(?:urday)?\s*(?:[-–—]|and|to|through)\s*sun(?:day)?)\b/gi;
const gap = /^(?:[\s,.;:&/+–—-]|\b(?:and|then|on|during|for|from|open|hours|only)\b)*$/i;
const template = 'Weekdays 09:00–14:00, 17:00–22:00; Weekends 08:00–18:00';
export const hoursHelp = 'Use 24-hour times or AM/PM. Enter up to two intervals per day. For different days, use “'+template+'”. A day group can be “closed”.';

function clockMinute(value) {
  const word=value.toLowerCase().replace(/[\s.]/g,'');
  if(word==='noon')return 720;
  if(word==='midnight'||word==='24:00')return 0;
  const m=/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(word);
  if(!m)return null;
  const h=Number(m[1]),n=Number(m[2]||0);
  if(n>59 || (m[3] ? h<1||h>12 : h>23 || (!m[2] && h<=12)))return null;
  return 60*(m[3]?h%12+(m[3]==='pm'?12:0):h)+n;
}
const hhmm = m => String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const span = ([a,b]) => (b-a+1440)%1440 || 1440;
const show = windows => windows.map(([a,b])=>hhmm(a)+'–'+hhmm(b)).join(', ') || 'closed';

function tokens(text,strict) {
  const periods=[];
  for(const m of text.matchAll(rangePattern)){
    // A size, staffing or price range is not a trading interval.
    const tail=text.slice(m.index+m[0].length);
    if(!strict && /^\s*(?:seats?|sq\b|staff|employees?|workers?|positions?|people|baristas?|dollars?|k\b|%)/i.test(tail))continue;
    periods.push({kind:'period',i:m.index,end:m.index+m[0].length,window:[clockMinute(m[1]),clockMinute(m[2])]});
  }
  for(const m of text.matchAll(/\b(closed|24\/7)\b/gi))
    periods.push({kind:'period',i:m.index,end:m.index+m[0].length,window:m[0].toLowerCase()==='closed'?null:[0,0]});
  const groups=[];
  for(const m of text.matchAll(scopes)){
    const i=m.index,end=i+m[0].length;
    // "Staff levels depending on weekends" is a staffing condition.
    if(strict || periods.some(p=>gap.test(p.end<=i?text.slice(p.end,i):end<=p.i?text.slice(end,p.i):'?')))
      groups.push({kind:'group',group:/^(?:weekend|sat)/i.test(m[0])?'weekends':'weekdays',i,end});
  }
  return [...periods,...groups].sort((a,b)=>a.i-b.i);
}
function groupPeriods(parts) {
  if(parts.length===1 && parts[0].window===null)return [];
  if(!parts.length||parts.length>2||parts.some(p=>!p.window||p.window.includes(null)))return null;
  return parts.map(p=>p.window).sort((a,b)=>a[0]-b[0]);
}
function schedule(parts,text,strict) {
  if(!parts.length)return null;
  if(strict && (!gap.test(text.slice(0,parts[0].i)) || !gap.test(text.slice(parts.at(-1).end))))return null;
  for(let i=1;i<parts.length;i++)if(!gap.test(text.slice(parts[i-1].end,parts[i].i)))return null;
  const grouped=parts.some(p=>p.kind==='group');
  const days={};
  if(grouped){
    // A scope can precede its intervals or follow them ("7am–3pm on weekdays").
    const reversed=parts[0].kind!=='group';
    let scope;
    for(const part of reversed?[...parts].reverse():parts){
      if(part.kind==='group'){
        if(Object.hasOwn(days,part.group))return null;
        scope=part.group;days[scope]=[];
      }else if(scope)days[scope].push(part);
      else return null;
    }
    if(!days.weekdays || !days.weekends)return null;
  }
  const weekdays=groupPeriods(grouped?days.weekdays:parts);
  const weekends=grouped?groupPeriods(days.weekends):weekdays;
  if(!weekdays||!weekends||(!weekdays.length&&!weekends.length))return null;
  const week=[weekdays,weekdays,weekdays,weekdays,weekdays,weekends,weekends];
  let previousEnd=-Infinity;
  // Test both boundaries of the repeating week and overnight overlaps.
  for(let day=-1;day<8;day++)for(const window of week[(day+7)%7]){
    const start=day*1440+window[0];
    if(start<previousEnd)return null;
    previousEnd=start+span(window);
  }
  const label=grouped?'Weekdays '+show(weekdays)+'; Weekends '+show(weekends):show(weekdays);
  return {label,complex:grouped||weekdays.length>1,week:week.map(windows=>({
    intervals:windows.map(window=>show([window])),minutes:windows.reduce((n,w)=>n+span(w),0)
  }))};
}
export function readSchedule(value){
  if(typeof value!=='string'||value.length>240)return null;
  return schedule(tokens(value,true),value,true);
}
export function hoursInPitch(text){
  const parts=tokens(text,false);
  const vague=/\b(?:weekends only|weekdays only|closed on|weekend hours|weekday hours|evenings? only|mornings? only|late nights?|morning[- ]to[- ]evening|split shifts?)\b/i.test(text);
  if(!parts.length)return {ask:vague||/\b(?:open|hours)\s+(?:from\s+)?\d/i.test(text)};
  const first=parts[0],last=parts.at(-1);
  const tail=text.slice(last.end),head=text.slice(0,first.i);
  const dayName='(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)s?';
  const partial=/^\s*(?:,\s*|(?:and|or|except)\s+)(?:(?:again|after|from|until|before)\s+)?(?:\d{1,2}(?::\d{2}|\s*[ap]m|\s*[-–—])|noon|midnight)\b/i;
  const unresolved=/\b(?:or|except)\b/i.test(text.slice(first.i,last.end)) || partial.test(tail) ||
    new RegExp('\\b'+dayName+'\\s*[:,]?\\s*(?:from\\s*)?$','i').test(head) ||
    new RegExp('^\\s*(?:(?:on|except)\\s+)?'+dayName+'\\b','i').test(tail);
  const plan=unresolved?null:schedule(parts,text,false);
  return {value:plan?.label,ask:!plan||plan.complex||vague};
}
