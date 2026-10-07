/* Claim governance, part 1: the vendored evidence files are byte-identical to the pinned public commit.
     node scripts/verify-evidence.js            offline: re-hash every vendored file against SOURCE.json (always part of `npm test`)
     node scripts/verify-evidence.js --online   also re-fetch each file from raw.githubusercontent.com at the pinned SHA and compare (CI)
   If either fails, a number on the site could differ from the repository it cites. Nothing is ever edited by hand: use scripts/sync-evidence.js. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), https = require('https');
const root = path.join(__dirname, '..');
const SETS = [['content/evidence/support-escalation-copilot'], ['content/evidence/maref'], ['assets/copilot']];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const get = (url) => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'portfolio-evidence-check' } }, (r) => {
  if (r.statusCode !== 200) { r.resume(); return rej(new Error(url + ' -> HTTP ' + r.statusCode)); }
  const ch = []; r.on('data', (c) => ch.push(c)); r.on('end', () => res(Buffer.concat(ch)));
}).on('error', rej));
(async () => {
  const online = process.argv.includes('--online'); let n = 0;
  for (const [dir] of SETS) {
    const src = JSON.parse(fs.readFileSync(path.join(root, dir, 'SOURCE.json'), 'utf8'));
    if (!/^[0-9a-f]{40}$/.test(src.sha)) throw new Error(dir + ': SOURCE.json sha must be a full commit SHA, never a branch or tag');
    for (const [local, meta] of Object.entries(src.files)) {
      const b = fs.readFileSync(path.join(root, dir, local));
      if (sha(b) !== meta.sha256 || b.length !== meta.bytes) throw new Error(`${dir}/${local}: differs from the hash recorded for ${src.sha.slice(0, 7)} (edited by hand?)`);
      if (online) { const r = await get(`https://raw.githubusercontent.com/${src.repo}/${src.sha}/${meta.path}`); if (sha(r) !== meta.sha256) throw new Error(`${dir}/${local}: differs from ${src.repo}@${src.sha.slice(0, 7)}:${meta.path}`); }
      n++;
    }
  }
  console.log(`PASS: ${n} vendored evidence files match their pinned hashes${online ? ' and the public repository at the pinned commit' : ' (offline)'}`);
})().catch((e) => { console.error('FAIL: ' + e.message); process.exit(1); });
