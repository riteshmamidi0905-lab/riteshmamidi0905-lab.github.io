import {browserLibrary} from './builder-library.js';
import {calculate} from './builder-results.js';
import {builderUrl} from './builder-promotions.js';

export function replayForEntry(entry, mode='normal') {
  const result=calculate(entry.business,mode);
  const model={...result.operatingModel,promotionBook:result.promotionBook,workspace:entry.id};
  return {result,model,entry,sourceUrl:id=>builderUrl(entry.id,'simulation',{mode,record:id})};
}
export function savedReplay(id,mode='normal') {
  const entry=browserLibrary().entries.get(id);
  if(!entry)throw Error('This saved Builder workspace is unavailable in this browser.');
  return replayForEntry(entry,mode);
}
