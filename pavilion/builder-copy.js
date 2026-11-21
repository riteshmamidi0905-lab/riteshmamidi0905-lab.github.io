// Older plans store "Unspecified" as the city and may have it embedded in the generated opening story.
export function optionalText(value) {
  if(value==null || (typeof value==='number' && !Number.isFinite(value)))return '';
  const text=String(value).trim();
  return /^(unspecified|undefined|null|nan)$/i.test(text)?'':text;
}
export function openingStory(values) {
  const kind=values.type==='stadium'?'venue':values.type==='salon'?'studio':'business';
  const city=optionalText(values.city);
  return 'An independent '+kind+' taking shape'+(city?' in '+city:'')+'.';
}
export function storyText(b) {
  if(!optionalText(b.site.story))return '';
  const old=/^An independent (?:venue|studio|business) taking shape in (?:Unspecified|undefined|null|NaN)\.$/i;
  return old.test(b.site.story)?openingStory(b.values):b.site.story;
}
export function dayRange(start,end) {
  return start===end?'Day '+start:'Day '+start+'–'+end;
}
