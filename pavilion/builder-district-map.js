import {lots,mapDrawing} from './district-map.js';
import {activePromotions} from './builder-promotions.js';
import {customLot} from './district-state.js';

export function workspaceLot(entry, index) {
  const type=entry.business.values.type;
  const lot=customLot(entry.business.values,entry.id,index);
  return {...lot,id:'workspace-'+entry.id,name:entry.label,workspace:entry.id,type,
    link:(type==='stadium'?'stadium.html':'hq.html')+'?workspace='+encodeURIComponent(entry.id)};
}

// The Builder's offline board uses the same roof anchors and label placement as the district.
export function boardMap(entries,runs,day) {
  const buildings=[...lots,...entries.map((entry,index)=>{
    const lot=workspaceLot(entry,index);
    const offers=activePromotions(entry.business,runs.get(entry.id),day);
    if(offers.length)lot.badge=offers.length===1?offers[0].discount+'%':offers.length+' ads';
    return lot;
  })];
  const svg=mapDrawing(buildings);
  return svg.replace(/href="[^"]*" data-lot="([^"]+)"/g,'href="#lot-$1" data-builder-lot="$1" data-lot="$1"')
    .replace(/data-label-lot="([^"]+)" href="[^"]*"/g,'data-label-lot="$1" data-board-label="$1" href="#lot-$1"');
}
