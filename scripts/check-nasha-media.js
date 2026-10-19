/* Prevent the known unreleased review assets from entering an active tree again. */
'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const blocked = new Set([
  '7db3ca50f6f36eb7de554544d1e2fe66b541d222', // 48-second film
  'b81be1dd78410f544916f2efae7692516f252d34', // captions
  '8910655d678f8debc1867df15540258dd1e2699d', // social cover
  'd87fff269e8fd8337aa4212dec02ea684b42d4a0'  // poster
]);
const tracked = execFileSync('git', ['ls-files', '--stage'], {encoding:'utf8'}).trim().split('\n');
for (const row of tracked) {
  const [meta, file] = row.split('\t');
  assert.ok(!blocked.has(meta.split(' ')[1]), 'Known unreleased media blob is tracked: ' + file);
  if (file.startsWith('deliverables/nasha-ecosystem/')) {
    assert.equal(file, 'deliverables/nasha-ecosystem/nasha-preview.html', 'Rendered review media must remain local');
  }
}
for (const file of ['nasha-launch-review.mp4','nasha-launch-review.vtt','linkedin-cover.png','launch-poster.png','capture-hero.png']) {
  execFileSync('git', ['check-ignore', '--quiet', 'deliverables/nasha-ecosystem/' + file]);
}
const html = fs.readFileSync('nasha-ai-preview.html','utf8');
assert.ok(!/nasha-launch-review\.(mp4|vtt)|linkedin-cover\.png|launch-poster\.png/.test(html), 'Unreleased media is linked in the active preview');
console.log('PASS: unreleased media excluded from tracked files and preview; local render paths ignored');
