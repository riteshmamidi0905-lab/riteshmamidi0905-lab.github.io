import {header,url,esc,timeline,dayNav} from './views.js';
import {floorSvg,floorOrder} from './iso-geometry.js';
import {studios} from './studios.js';
import {instrumentReading} from './shift-display.js';
import {recentEvents} from './floor-staging.js';
import {scheduleDay} from './shift-schedule.js';

export function shiftPanel(m,d,beat,follow){
  const event=follow ? beat.active.find(e=>e.owner===follow) : beat.starts[0];
  const title=follow ? studios[follow].title : 'Shift desk';
  const status=event ? '<h3>'+esc(event.action)+'</h3><p class="meter">'+esc(instrumentReading(m,event)[0])+'</p><p>'+esc(instrumentReading(m,event)[1])+'</p><a href="'+url('inspector',m,d,{id:event.outputs[0]})+'">'+esc(event.outputs[0])+' · inspect source</a>' : '<h3>Idle</h3><p>Reviewing the queue. No source task is assigned at this minute.</p>';
  const transfers=(beat.batch||beat.transfers.slice(0,5)).map(t=>'<li><span>'+esc(t.from)+' → '+esc(t.to)+'</span><a href="'+url('inspector',m,d,{id:t.record})+'">'+esc(t.record)+'</a></li>').join('');
  return '<p class="kicker">'+esc(title)+'</p>'+status+'<hr><p class="kicker">Handoffs · '+beat.transfers.length+'</p>'+(transfers?'<ul class="signals">'+transfers+'</ul>':'<p>None at this minute.</p>')+(beat.waiting.length?'<p>'+beat.waiting.length+' waiting for display</p>':'');
}
export function eventTicker(m,d,events){
  return events.map(e=>'<li><a href="'+url('inspector',m,d,{id:e.outputs[0]})+'"><b>'+esc(e.owner)+'</b><span>'+esc(e.action)+'</span></a></li>').join('');
}
export function headquarters(m,d,reg,art){
  const beat=scheduleDay(m,d)[0];
  const agents=floorOrder.map(n=>reg.find(a=>a.name===n));
  const intro=art.includes('atrium')?'<div id="establish" hidden><picture><source media="(max-width:700px)" srcset="../assets/img/pavilion/atrium-small.webp"><img src="../assets/img/pavilion/atrium.webp" alt="The limestone arrival hall with its bronze-framed glazing"></picture><div><p>AI-generated concept art</p><h2>The atrium</h2><button type="button" id="enter-floor">Enter the floor →</button></div></div>':'';
  return header(m,d)+'<main id="content" class="iso-page"><div class="iso-heading"><div><p class="kicker">Pavilion A · Headquarters</p><h1>The working floor</h1></div><a href="'+url('ops',m,d)+'">Agent Ops console</a></div>'+
  (m.config.edition===7?'<p class="disclose">'+esc(m.config.name)+' · '+esc(m.records.TERMS.sector)+' · day '+d+' · synthetic read-only replay</p>':'')+
  '<div class="iso-toolbar"><label>Day <select id="day">'+m.days.map((_,i)=>'<option '+(i===d?'selected':'')+' value="'+i+'">'+(i||'Opening')+'</option>').join('')+'</select></label><button type="button" id="play">Play shift</button><label>Speed <select id="speed"><option value="1">1×</option><option value="4">4×</option><option value="16">16×</option></select></label><label>Camera <select id="camera"><option value="overview">Floor overview</option><option value="station">Follow active studio</option>'+agents.map(a=>'<option value="who-'+a.name+'">'+esc(studios[a.name].title)+' · '+a.name+'</option>').join('')+'</select></label></div>'+
  '<div class="iso-grid"><div class="drawing" data-light="Morning"><div class="map-status"><span id="sun">Morning</span><span id="load">'+beat.active.length+' active</span></div>'+'<div class="map-lens"><div class="camera-world">'+floorSvg(reg)+'</div></div>'+intro+'<div class="drawing-foot"><span id="floor-caption">Specialist studios</span><span></span></div></div><nav class="event-ticker" aria-label="Latest five source events"><b>Shift wire</b><ol id="ticker">'+eventTicker(m,d,recentEvents(m.events.filter(e=>e.day===d),beat.minute))+'</ol></nav><aside id="task" class="signal-panel">'+shiftPanel(m,d,beat,null)+'</aside></div>'+
  '<div class="scrubber"><label for="seek">Shift position</label><input id="seek" type="range" min="0" max="'+(scheduleDay(m,d).length-1)+'" value="0"><output id="minute">Minute 0</output></div>'+
  '<details class="directory"><summary>Studio directory · 12</summary><div>'+agents.map(a=>'<a href="'+url('agents',m,d)+'" data-agent="'+a.name+'" data-role="'+esc(a.role)+'" data-slug="'+a.slug+'">'+a.name+' <small>'+esc(studios[a.name].title)+'</small></a>').join('')+'</div></details>'+
  '<p class="iso-disclosure"><span>AI-generated concept art</span> · Canonical portraits. Synthetic operating day · Rule-based activity. Playback reads the source ledger.</p><details id="fallback"><summary>Read the shift as text</summary>'+timeline(m,d)+'</details>'+dayNav(m,d,'hq')+'</main>';
}
