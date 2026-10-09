/* Vendors the mcp-weir evidence (numbers, claims, freeze history, screenshots, charts) from a pinned commit of the public repository.
   Usage: node scripts/sync-weir-evidence.js <40-char sha> [path-to-local-clone]
   With a local clone it reads `git show <sha>:<path>` (works while the repository is private); without one it downloads from raw.githubusercontent.com.
   It rewrites the SOURCE.json files with fresh hashes. Review the diff, rebuild, run the tests. Nothing is ever edited by hand. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), https = require('https'), cp = require('child_process');
const root = path.join(__dirname, '..');
const sha = process.argv[2], clone = process.argv[3];
if (!/^[0-9a-f]{40}$/.test(sha || '')) { console.error('usage: node scripts/sync-weir-evidence.js <40-char commit sha> [local clone]'); process.exit(2); }
const get = (url) => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'portfolio-evidence-sync' } }, (r) => { if (r.statusCode !== 200) { r.resume(); return rej(new Error(url + ' -> ' + r.statusCode)); } const ch = []; r.on('data', (c) => ch.push(c)); r.on('end', () => res(Buffer.concat(ch))); }).on('error', rej));
const fetchFile = async (src, p) => clone ? cp.execFileSync('git', ['-C', clone, 'show', `${sha}:${p}`], { maxBuffer: 1 << 26 }) : get(`https://raw.githubusercontent.com/${src.repo}/${sha}/${p}`);
(async () => {
  for (const dir of ['content/evidence/mcp-weir', 'assets/weir']) {
    const file = path.join(root, dir, 'SOURCE.json'), src = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [local, meta] of Object.entries(src.files)) {
      const b = await fetchFile(src, meta.path);
      fs.writeFileSync(path.join(root, dir, local), b); meta.sha256 = crypto.createHash('sha256').update(b).digest('hex'); meta.bytes = b.length;
    }
    src.sha = sha; fs.writeFileSync(file, JSON.stringify(src, null, 1) + '\n');
  }
  console.log('re-vendored the mcp-weir evidence at ' + sha + '. Review `git diff content/evidence assets/weir`, then npm run build && npm test.');
})().catch((e) => { console.error(e.message); process.exit(1); });
