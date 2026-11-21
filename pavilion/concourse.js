import {booths,phases} from './stadium-model.js';
import {esc} from './views.js';
const palette=['#b56a43','#ad8152','#788267','#876c64','#ad8c48','#5e7c73'];
export function concourseMap(model,day,phase){
 const info=model.records[model.days[day-1].eventId],busy=info.attendance>0;
 let xml='<svg class="concourse-art" viewBox="0 0 860 400" role="img" aria-label="Stadium concourse, six independent vendor stations beside the field"><defs><pattern id="grass" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#537358"/><rect width="15" height="30" fill="#5a795c"/></pattern></defs><path d="M35 161 379 27 821 192 480 350Z" fill="#c9b998"/><path d="M35 161v15l445 193v-19Z" fill="#a19171"/><path d="m480 350 341-158v16L480 369Z" fill="#8e846e"/><path d="m90 158 287-111 388 145-285 129Z" fill="#526358"/><path d="m119 159 259-96 357 129-255 114Z" fill="#c1b08f"/><path d="m151 159 227-82 317 115-215 95Z" fill="url(#grass)"/><path d="m177 160 201-71 290 103-189 81Z M315 111l282 110" fill="none" stroke="#dce5b5" stroke-width="2"/>';
 const coords=[[150,145],[259,104],[372,64],[517,108],[627,149],[733,189]];
 for(const [i,b] of booths.entries()){
   const [x,y]=coords[i],enabled=model.mix.includes(b.id),source='D'+String(day).padStart(2,'0')+'-'+b.id+'-'+phases[phase].id,r=model.records[source];const lit=enabled&&busy&&r.served>0;
   xml+='<g transform="translate('+x+' '+y+')"><path d="M-37 0 1-14 38 0 1 17Z" fill="#a49676"/><path d="M-33-2v-20L0-9v21Z" fill="'+palette[i]+'"/><path d="M0-9 34-22v21L0 12Z" fill="#716e59"/><path d="M-37-24 0-38 39-23 0-6Z" fill="'+palette[i]+'" stroke="#e0cda3"/><path d="m-25-18 20 8v7l-20-8Z" fill="'+(lit?'#f3d48a':'#4a6156')+'"/><text text-anchor="middle" y="32">'+esc(b.name)+'</text></g>';
 }
 return xml+'<text x="36" y="382" class="field-caption">'+esc(info.type)+' · '+esc(phases[phase].label)+'</text></svg>';
}
