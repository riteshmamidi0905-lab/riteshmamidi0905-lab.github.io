'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, text, parent) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (parent) parent.append(n); return n; };
  const link = (text, href, parent) => { const n = el('a', text, parent); n.href = href; return n; };
  const json = (data, parent) => { const n=el('pre', JSON.stringify(data, null, 2), parent); n.tabIndex=0; n.setAttribute('aria-label','Inspectable recorded or registry data'); return n; };
  const base = 'https://github.com/riteshmamidi0905-lab/riteshmamidi0905-lab.github.io/blob/05bc67e337c67f144bd40c9af84a5d6fdc88660c/';
  let registry, recording, cursor = 0, tour = -1, request = 0;
  async function digest(bytes) {
    if (window.crypto && window.crypto.subtle) return [...new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    return new Promise((resolve,reject)=>{
      const worker=new Worker('hash-worker.js'),timer=setTimeout(()=>{worker.terminate();reject(Error('Checksum worker timed out'));},20000);
      worker.onmessage=e=>{clearTimeout(timer);worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data.sha256);};
      worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Checksum worker unavailable'));};
      worker.postMessage(bytes);
    });
  }
  function profile(a, focus = true) {
    const p = $('profile'); p.replaceChildren(); p.hidden = false;
    const h = el('h2', a.name + ' — ' + a.role, p); h.id = 'profile-title';
    el('p', a.maturity, p); el('p', a.limits, p);
    for (const c of a.capabilities) el('span', c.status + ': ' + c.name, p).className = 'badge';
    el('h3', 'Verified responsibilities', p);
    const list = el('ul', undefined, p);
    for (const [mission, task] of Object.entries(a.responsibilities)) el('li', 'Mission ' + mission + ' — ' + task, list);
    el('h3', 'Recorded tools and contracts', p);
    el('p', a.tools.map(t => t.tool + ' (' + t.calls + ' recorded calls, ' + t.failures + ' failures)').join(' · ') || 'No direct tool calls recorded; inspect task/policy/evaluation events.', p);
    const contracts = el('details', undefined, p); el('summary', 'Inspect representative inputs, outputs and checks', contracts);
    for (const c of a.tool_contracts) { link(c.file + ' · event ' + c.seq + ' · ' + c.kind, c.source, contracts); json(c.payload, contracts); }
    el('h3', 'Dependencies and authorization', p); json(a.dependencies, p); el('p', a.authorization, p);
    el('h3', 'Evaluation evidence', p); json(a.evaluation, p);
    el('h3', 'Source and demonstrations', p);
    for (const path of a.local_implementation) { link(path, base + path, p); el('br', undefined, p); }
    el('p', a.source_availability, p);
    const records = el('details', undefined, p); el('summary', a.recordings.length + ' verified recordings', records);
    for (const r of a.recordings) { const row = el('p', undefined, records); link(r.title, r.source, row); el('small', ' · SHA-256 ' + r.sha256, row); }
    el('h3', 'Animation readiness', p); el('p', a.animation_readiness, p); const missing = el('ul', undefined, p); a.missing.forEach(x => el('li', x, missing));
    if (focus) { p.focus(); p.scrollIntoView({block:'start'}); }
    history.replaceState(null, '', '#agent-' + a.slug);
  }
  function draw() {
    if (!recording) return;
    const e = recording.events[cursor];
    $('previous').disabled = cursor === 0; $('next').disabled = cursor === recording.events.length - 1;
    $('timeline').value = String(cursor);
    $('event-status').textContent = 'Recorded event ' + (cursor + 1) + ' of ' + recording.events.length + ' · ' + e.agent.toUpperCase() + ' · ' + e.kind;
    for (const n of $('network-stations').children) { const active = n.dataset.agent === e.agent; n.classList.toggle('active', active); n.textContent = n.dataset.agent.toUpperCase() + (active ? ' — ' + e.kind : recording.events.some(x => x.agent === n.dataset.agent) ? ' — participates' : ' — not assigned in this recording'); }
    const p = $('event'); p.replaceChildren(); const h = el('h3', e.agent.toUpperCase() + ' / ' + e.kind, p); h.id = 'event-title';
    el('p', recording.recording.note || 'Historical recording on synthetic data.', p);
    const dl = el('dl', undefined, p);
    for (const [name, value] of [['Event ID',e.event_id],['Recorded timestamp',e.ts],['Responsible specialist',e.agent],['Recorded mode field',e.mode + ' (historical field; this viewer is read-only replay)'],['Audit reference',e.hash],['Previous hash',e.prev_hash]]) { el('dt', name, dl); el('dd', value, dl); }
    el('h4', 'Exact recorded payload — input, output or decision for this event', p); json(e.payload, p);
    el('h4', 'Recorded evidence references', p); json(e.evidence_refs, p);
    el('p', 'This event is read-only. No inventory effect or human authorization is inferred from a tool-call display; inspect its result and the separate ledger demonstration.', p);
    link('Inspect complete source recording', base + 'nasha-universe/replays/' + $('recording').value, p);
  }
  async function openRecording() {
    const token = ++request; recording = null;
    $('next').disabled = $('previous').disabled = $('reset').disabled = $('timeline').disabled = true;
    $('event-status').textContent = 'Loading recorded evidence…';
    try {
      const file = $('recording').value, item = registry.recordings.find(r => r.file === file);
      const response = await fetch(item.path); if (!response.ok) throw Error('Recording unavailable');
      const bytes = await response.arrayBuffer();
      if (await digest(bytes) !== item.sha256) throw Error('Recording checksum differs');
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (!Array.isArray(data.events) || data.events.length !== item.event_count) throw Error('Recording shape differs');
      if (token !== request) return;
      recording = data; cursor = 0; $('timeline').replaceChildren();
      data.events.forEach((e, i) => { const o = el('option', e.seq + ' · ' + e.agent.toUpperCase() + ' · ' + e.kind, $('timeline')); o.value = i; });
      $('timeline').disabled = $('reset').disabled = false; draw();
    } catch (error) { if (token === request) { $('event').replaceChildren(); el('h3', 'Recording not shown', $('event')).id='event-title'; $('event-status').textContent = 'Evidence could not be verified: ' + error.message + '. Choose a scenario to retry; registry and portfolio remain available.'; } }
  }
  $('previous').onclick = () => { if (recording && cursor > 0) { cursor--; draw(); } };
  $('next').onclick = () => { if (recording && cursor < recording.events.length-1) { cursor++; draw(); } };
  $('reset').onclick = () => { cursor = 0; draw(); };
  $('timeline').onchange = () => { cursor = Number($('timeline').value); draw(); };
  $('recording').onchange = openRecording;
  $('tour').onclick = () => { tour = (tour + 1) % registry.agents.length; profile(registry.agents[tour]); $('tour-progress').textContent = (tour+1) + ' of 12'; $('tour').textContent = 'Next specialist'; };
  async function boot() {
    try {
      const response = await fetch('registry.json'); if (!response.ok) throw Error('Registry unavailable');
      registry = await response.json(); if (registry.agents.length !== 12) throw Error('Incomplete registry');
      for (const a of registry.agents) {
        const station = el('article', undefined, $('stations')); station.className='station';
        const img = el('img', undefined, station); img.src='baseline/'+a.artwork; img.alt=a.name+' approved AI-generated character concept'; img.width=768; img.height=1024; img.loading='lazy'; img.decoding='async';
        const content = el('div', undefined, station); el('h3', a.name, content); el('p', a.role, content); el('p', 'Recorded prototype · animation pending', content).className='muted';
        const b = el('button', 'Inspect '+a.name, content); b.onclick=()=>profile(a);
        const li = el('li', a.name, $('network-stations')); li.dataset.agent=a.slug;
      }
      registry.recordings.forEach(r => { const o=el('option',r.title,$('recording')); o.value=r.file; });
      $('recording').disabled=$('tour').disabled=false; $('recording').value='mission-f-surge-approved.json';
      $('load-status').textContent='All twelve identities accounted for. Responsibilities and tools verified against recorded events.';
      const selected=registry.agents.find(a=>location.hash==='#agent-'+a.slug); if(selected) profile(selected,false);
      $('event-status').textContent='Recorded evidence loads when you enter this section or choose a scenario.';
      if ('IntersectionObserver' in window) {
        const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();if(!recording&&!request)openRecording();}},{rootMargin:'100px'});
        observer.observe($('network'));
      } else await openRecording();
    } catch (error) { $('load-status').className='error'; $('load-status').textContent='Registry could not load: '+error.message+'. Portfolio links remain available. Reload to retry.'; }
  }
  boot();
})();
