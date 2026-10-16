/* Vendors the NASHA AI Operations Lab evidence (portfolio-evidence.json, the claims ledger, the Block 3 baseline) from a pinned commit of the public repository riteshmamidi0905-lab/INDO-MEX-BREWERY.
   Usage: node scripts/sync-nasha-evidence.js <40-char sha> [path-to-local-clone]
   With a local clone it reads `git show <sha>:<path>`; without one it downloads from raw.githubusercontent.com. Rewrites SOURCE.json with fresh hashes. Nothing is ever edited by hand. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), https = require('https'), cp = require('child_process');
const root = path.join(__dirname, '..'), dir = path.join(root, 'content/evidence/nasha-lab');
const sha = process.argv[2], clone = process.argv[3];
const FILES = { 'portfolio-evidence.json': 'lab/portfolio/portfolio-evidence.json', 'claims.json': 'lab/claims/claims.json', 'BASELINE-BLOCK3.json': 'lab/baseline/BASELINE-BLOCK3.json' };
if (!/^[0-9a-f]{40}$/.test(sha || '')) { console.error('usage: node scripts/sync-nasha-evidence.js <40-char commit sha> [local clone]'); process.exit(2); }
const get = (url) => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'portfolio-evidence-sync' } }, (r) => { if (r.statusCode !== 200) { r.resume(); return rej(new Error(url + ' -> HTTP ' + r.statusCode)); } const ch = []; r.on('data', (c) => ch.push(c)); r.on('end', () => res(Buffer.concat(ch))); }).on('error', rej));
(async () => {
  const src = { repo: 'riteshmamidi0905-lab/INDO-MEX-BREWERY', sha, branch: 'claude/nasha-enterprise-ai-lab', note: 'Vendored byte-for-byte from the public repository at this commit by scripts/sync-nasha-evidence.js. The NASHA page is checked against these files by scripts/check-nasha.js; npm run verify:evidence re-hashes them and --online re-fetches them from the pinned commit. SYNTHETIC DATA / OFFLINE EVALUATION / same-author.', files: {} };
  fs.mkdirSync(dir, { recursive: true });
  for (const [local, p] of Object.entries(FILES)) {
    const b = clone ? cp.execFileSync('git', ['-C', clone, 'show', `${sha}:${p}`], { maxBuffer: 1 << 26 }) : await get(`https://raw.githubusercontent.com/${src.repo}/${sha}/${p}`);
    fs.writeFileSync(path.join(dir, local), b); src.files[local] = { path: p, sha256: crypto.createHash('sha256').update(b).digest('hex'), bytes: b.length };
  }
  fs.writeFileSync(path.join(dir, 'SOURCE.json'), JSON.stringify(src, null, 1) + '\n');
  console.log('vendored the NASHA lab evidence at ' + sha + '. Review `git diff content/evidence/nasha-lab`, then npm run build && npm test.');
})().catch((e) => { console.error(e.message); process.exit(1); });
