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
const EVL = Object.fromEntries(Object.entries(require('./claims').BADGES).map(([k, v]) => [k, v[0]]));   // evidence labels: one vocabulary, defined in scripts/claims.js

/* Avatar slots. A persona uses, in order: assets/avatar/<persona>.webp|png (+ optional @2x), then the manifest `file`, then the
   portrait cut-out fallback. Dropping a transparent image into assets/avatar/ and rebuilding is all a replacement needs. */
function imageSize(file) {
  const b = fs.readFileSync(path.join(root, file));
  if (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
    const t = b.slice(12, 16).toString();
    if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  }
  throw new Error('cannot read image size: ' + file);
}
const exists = (f) => fs.existsSync(path.join(root, f));
function personaImage(persona) {
  const p = manifest.personas[persona] || manifest.personas.hero, f = manifest.fallback;
  for (const ext of ['webp', 'png']) {
    const file = `assets/avatar/${persona}.${ext}`;
    if (exists(file)) { const f2 = `assets/avatar/${persona}@2x.${ext}`; return { p, file, file2: exists(f2) ? f2 : null, ...imageSize(file), fallback: false }; }
  }
  if (p.file) { if (!exists(p.file)) throw new Error('avatar asset missing: ' + p.file); return { p, file: p.file, file2: p.file2x && exists(p.file2x) ? p.file2x : null, w: p.w || imageSize(p.file).w, h: p.h || imageSize(p.file).h, fallback: false }; }
  for (const x of [f.file, f.file2x]) if (!exists(x)) throw new Error('avatar asset missing: ' + x);
  return { p, file: f.file, file2: f.file2x, w: f.w, h: f.h, fallback: true };
}
function avatarHTML(persona, o) {
  o = Object.assign({ cls: '', tag: false, eager: false, sizes: '(max-width:900px) 70vw, 460px', alt: '' }, o || {});
  const { p, file, file2, w, h, fallback } = personaImage(persona);
  /* no canonical art yet: an empty, hidden slot — the composition is designed to stand without it; drop a file in assets/avatar/ to fill it */
  if (fallback) return `<figure class="av av-empty ${o.cls}" data-av data-persona="${persona}" data-slot="empty" aria-hidden="true" hidden></figure>`;
  const srcset = file2 ? ` srcset="${file} ${w}w, ${file2} ${w * 2}w" sizes="${o.sizes}"` : '';
  return `<figure class="av ${o.cls}" data-av data-persona="${persona}"${fallback ? ' data-fallback' : ''} style="--rim:${p.rim};--ar:${w}/${h}"><img src="${file}"${srcset} width="${w}" height="${h}" alt="${esc(o.alt)}" ${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${o.tag ? `<figcaption class="av-tag">${esc(p.label)}</figcaption>` : ''}</figure>`;
}

const arrow = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
/* One full-screen pinned stage. `steps` = [[label, text], …]; scenes are drawn on the canvas, text is the supporting caption. */
function stageHTML(o) {
  const nav = o.steps.map((s, i) => `<button type="button" data-step="${i}" aria-label="Step ${i + 1} of ${o.steps.length}: ${esc(s[0])}"${i ? '' : ' aria-current="step"'}><span>${String(i + 1).padStart(2, '0')}</span></button>`).join('');
  const steps = o.steps.map((s) => `<li><b>${esc(s[0])}${s[2] ? ` · ${EVL[s[2]]}` : ''}</b><p>${esc(s[1])}</p></li>`).join('');
  return `<section class="world ${o.cls || ''}" id="${o.id}" data-world="${o.id.replace(/^world-/, '')}" data-scene="${o.scene}"${o.key ? ` data-steps="${esc(o.key)}"` : ''} aria-labelledby="${o.id}-t">
  <div class="world-stage">
    <canvas class="world-canvas" aria-hidden="true"></canvas>
    <div class="world-vig" aria-hidden="true"></div>
    <div class="world-top"><div><span class="world-kicker">${esc(o.kicker)}</span>${o.h === 3 ? `<h3 class="world-title" id="${o.id}-t">${esc(o.title)}</h3>` : `<h2 class="world-title" id="${o.id}-t">${esc(o.title)}</h2>`}${o.sub ? `<p class="world-sub">${esc(o.sub)}</p>` : ''}</div><span class="world-note">${esc(o.note)}</span></div>
    <ol class="world-steps">${steps}</ol>
    <div class="world-cap" aria-live="polite"><span class="cap-n">01 / ${String(o.steps.length).padStart(2, '0')}</span>${o.steps[0][2] ? `<span class="cap-ev ev ev-${o.steps[0][2]}"><span class="ev-m" aria-hidden="true"></span><span class="ev-t">${EVL[o.steps[0][2]]}</span></span>` : ''}<b class="cap-label">${esc(o.steps[0][0])}</b><p class="cap-text">${esc(o.steps[0][1])}</p>${o.cta ? `<a class="world-cta" href="${o.cta[0]}"${/^https?:/.test(o.cta[0]) ? ' target="_blank" rel="noopener"' : ''}>${esc(o.cta[1])} ${arrow}</a>` : ''}</div>
    <div class="world-nav" role="group" aria-label="${esc(o.title)}: steps">${nav}</div>
  </div>
</section>`;
}
function worldHTML(id) {
  const w = worlds[id];
  return stageHTML({ id: 'world-' + id, scene: id, kicker: w.kicker, title: w.title, note: w.note, steps: w.steps, cta: [`#${w.lab}`, w.labLabel] });
}
const worldsJSON = (extra) => `<script type="application/json" id="rm-worlds">${JSON.stringify(Object.assign({}, worlds, extra || {})).replace(/</g, '\\u003c')}</script>`;

module.exports = { avatarHTML, worldHTML, stageHTML, worldsJSON, manifest, worlds, explainers };
