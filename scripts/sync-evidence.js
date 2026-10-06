/* Re-vendors the Support Escalation Copilot evidence from a NEW pinned commit. Usage: node scripts/sync-evidence.js <full-40-char-sha> [release-tag]
   It downloads the same files listed in SOURCE.json, rewrites SOURCE.json with fresh hashes and stops: review the diff, update content/support-escalation-copilot.json if the
   claim ids changed, rebuild, run the tests. The old numbers disappear from the site only when this succeeds and the tests agree. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), https = require('https');
const root = path.join(__dirname, '..'), dir = path.join(root, 'content/evidence/support-escalation-copilot');
const sha = process.argv[2], tag = process.argv[3];
if (!/^[0-9a-f]{40}$/.test(sha || '')) { console.error('usage: node scripts/sync-evidence.js <40-char commit sha> [tag]'); process.exit(2); }
const get = (url) => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'portfolio-evidence-sync' } }, (r) => { if (r.statusCode !== 200) { r.resume(); return rej(new Error(url + ' -> ' + r.statusCode)); } const ch = []; r.on('data', (c) => ch.push(c)); r.on('end', () => res(Buffer.concat(ch))); }).on('error', rej));
(async () => {
  const src = JSON.parse(fs.readFileSync(path.join(dir, 'SOURCE.json'), 'utf8'));
  for (const [local, meta] of Object.entries(src.files)) {
    const b = await get(`https://raw.githubusercontent.com/${src.repo}/${sha}/${meta.path}`);
    fs.writeFileSync(path.join(dir, local), b); meta.sha256 = crypto.createHash('sha256').update(b).digest('hex'); meta.bytes = b.length;
  }
  src.sha = sha; if (tag) src.release = tag;
  fs.writeFileSync(path.join(dir, 'SOURCE.json'), JSON.stringify(src, null, 1) + '\n');
  console.log('re-vendored at ' + sha + '. Review `git diff content/evidence`, then npm run build && npm test.');
})().catch((e) => { console.error(e.message); process.exit(1); });
