/* Build-time HTML for the avatar host, cinematic worlds and project explainers.
   Source of truth: assets/avatar/manifest.json, content/worlds.json, content/explainers.json. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/avatar/manifest.json'), 'utf8'));
const worlds = JSON.parse(fs.readFileSync(path.join(root, 'content/worlds.json'), 'utf8'));
const explainers = JSON.parse(fs.readFileSync(path.join(root, 'content/explainers.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* resolve a persona to an image: a generated asset when the manifest names one, else the portrait cut-out */
function personaImage(persona) {
  const p = manifest.personas[persona] || manifest.personas.hero, f = manifest.fallback;
  const file = p.file || f.file, file2 = p.file ? (p.file2x || null) : f.file2x, w = p.file ? (p.w || f.w) : f.w, h = p.file ? (p.h || f.h) : f.h;
  for (const x of [file, file2]) if (x && !fs.existsSync(path.join(root, x))) throw new Error('avatar asset missing: ' + x);
  return { p, file, file2, w, h };
}
function avatarHTML(persona, o) {
  o = Object.assign({ cls: '', tag: true, eager: false, sizes: '(max-width:900px) 70vw, 460px', alt: '' }, o || {});
  const { p, file, file2, w, h } = personaImage(persona);
  const srcset = file2 ? ` srcset="${file} ${w}w, ${file2} ${w * 2}w" sizes="${o.sizes}"` : '';
  return `<figure class="av ${o.cls}" data-av data-persona="${persona}" style="--rim:${p.rim}"><img src="${file}"${srcset} width="${w}" height="${h}" alt="${esc(o.alt)}" ${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${o.tag ? `<figcaption class="av-tag">${esc(p.label)}</figcaption>` : ''}</figure>`;
}

const arrow = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function worldHTML(id) {
  const w = worlds[id], who = manifest.personas[w.persona].label;
  const nav = w.steps.map((s, i) => `<button type="button" data-step="${i}" aria-label="Step ${i + 1} of ${w.steps.length}: ${esc(s[0])}"${i ? '' : ' aria-current="step"'}>${String(i + 1).padStart(2, '0')}</button>`).join('');
  const steps = w.steps.map((s) => `<li><b>${esc(s[0])}</b><p>${esc(s[1])}</p></li>`).join('');
  return `<section class="world${w.avatar === false ? ' no-av' : ''}" id="world-${id}" data-world="${id}" aria-labelledby="w-${id}-t">
  <div class="world-stage">
    <canvas class="world-canvas" aria-hidden="true"></canvas>
    <div class="world-vignette" aria-hidden="true"></div>
    <div class="world-top"><span class="world-kicker">${esc(w.kicker)}</span><span class="world-note">${esc(w.note)}</span></div>
    ${w.avatar === false ? '' : avatarHTML(w.persona, { cls: 'world-av', tag: false, sizes: '(max-width:900px) 52vw, 420px' })}
    <div class="world-copy">
      <h2 class="world-title" id="w-${id}-t">${esc(w.title)}</h2>
      <ol class="world-steps">${steps}</ol>
      <div class="world-nav" role="group" aria-label="${esc(w.title)} — steps">${nav}</div>
      <a class="world-cta" href="#${w.lab}">${esc(w.labLabel)} ${arrow}</a>
    </div>
    <div class="world-cap" aria-live="polite"><div class="cap-who">${esc(who)} says</div><span class="cap-label">${esc(w.steps[0][0])}</span><p class="cap-text">${esc(w.steps[0][1])}</p></div>
  </div>
</section>`;
}
const worldsJSON = () => `<script type="application/json" id="rm-worlds">${JSON.stringify(worlds).replace(/</g, '\\u003c')}</script>`;

module.exports = { avatarHTML, worldHTML, worldsJSON, manifest, worlds, explainers };
