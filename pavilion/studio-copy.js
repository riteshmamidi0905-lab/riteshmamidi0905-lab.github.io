import {input,select,esc} from './builder-common.js';
import {optionalText} from './builder-copy.js';
import {recordButton} from './studio-store.js';
export const tones={warm:'Warm',direct:'Direct',editorial:'Editorial'};
export function compose(b,surface,tone,itemId){
 const item=b.items.find(x=>x.id===itemId);if(!item||!['site','product','campaign'].includes(surface)||!Object.hasOwn(tones,tone))throw Error('Choose a listed copy rule and item.');
 const city=optionalText(b.values.city),name=b.values.concept;
 const lines={
 site:{warm:'Welcome to '+name+(city?' in '+city:'')+'.',direct:'Explore '+name+'.',editorial:name+' · '+item.name+' and more.'},
 product:{warm:'Discover '+item.name+' at '+name+'.',direct:item.name+' from '+name+'.',editorial:item.name+' — a selection from '+name+'.'},
 campaign:{warm:'A closer look at '+item.name+'.',direct:'Explore '+item.name+'.',editorial:'In focus — '+item.name+'.'}};
 return {id:'COPY-'+surface+'-'+tone+'-'+item.id,kind:'Template-generated copy',line:lines[surface][tone],surface,tone,item:item.id,
 fields:{business:name,offering:item.name,...(surface==='site'&&tone==='warm'&&city?{location:city}:{})},
 rule:surface+' / '+tone+' substitutes the listed business fields into a fixed sentence. No model or external service runs.'};
}
export function copyBody(b,ui){
 const current=ui.copy||{surface:'site',tone:'warm',item:b.items[0].id},c=compose(b,current.surface,current.tone,current.item);
 return '<h2>Copy assistant</h2><form data-sform="compose">'+select('surface','Destination',{site:'Site headline',product:'Product description',campaign:'Campaign draft'},c.surface)+select('tone','Tone',tones,c.tone)+select('item','Offering',Object.fromEntries(b.items.map(i=>[i.id,i.name])),c.item)+'<button>Generate suggestion</button></form>'+
 '<article class="tile"><p class="kicker">Template-generated</p><h3>'+esc(c.line)+'</h3><h4>Why this line?</h4><p>'+esc(c.rule)+'</p><dl>'+Object.entries(c.fields).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl><button type="button" data-studio="apply-copy">Use this suggestion</button></article>';
}
export function copyEvent(kind,f,b,ui){
 if(kind==='compose'){compose(b,f.surface,f.tone,f.item);ui.copy={surface:f.surface,tone:f.tone,item:f.item};return 'view';}
 if(kind==='apply-copy'){
   const s=ui.copy||{surface:'site',tone:'warm',item:b.items[0].id},c=compose(b,s.surface,s.tone,s.item);
   if(c.surface==='site')b.site.title=c.line.slice(0,96);
   else if(c.surface==='product')b.studio.descriptions={...b.studio.descriptions,[c.item]:c.line};
   else b.studio.campaignDraft=c.line.slice(0,72);
   return 'save';
 }
}
