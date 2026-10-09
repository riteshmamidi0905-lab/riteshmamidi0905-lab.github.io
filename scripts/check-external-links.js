/* Manual network check (not part of `npm test`): every distinct external link on the built pages and the profile README must answer 200 (GitHub, Coursera, LinkedIn may answer 3xx/999 to bots: reported, not failed).
   Usage: node scripts/check-external-links.js        Exit status 1 if a GitHub or same-site link is dead. */
'use strict';
const fs = require('fs'), https = require('https');
const FILES = ['index.html', 'recruiter.html', 'support-escalation-copilot.html', 'agent-runtime.html', 'evaluation.html', 'projects.html', 'mcp-weir.html', 'profile/README.md'];
const urls = new Set();
for (const f of FILES) { const t = fs.readFileSync(f, 'utf8'); for (const m of t.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)) { let u = m[0].replace(/[.,;]+$/, ''); if (/^https?:\/\/(www\.w3\.org|schema\.org|fonts\.|localhost|127\.)/.test(u) || /\$\{|\{\{/.test(u)) continue; urls.add(u.split('#')[0]); } }
const get = (u) => new Promise((res) => { const r = https.get(u, { headers: { 'User-Agent': 'portfolio-link-check' }, timeout: 20000 }, (x) => { x.resume(); res({ u, s: x.statusCode, loc: x.headers.location }); }); r.on('error', (e) => res({ u, s: 0, err: e.message })); r.on('timeout', () => { r.destroy(); res({ u, s: 0, err: 'timeout' }); }); });
(async () => {
  const list = [...urls].sort(), out = []; for (let i = 0; i < list.length; i += 6) out.push(...await Promise.all(list.slice(i, i + 6).map(get)));
  const bad = out.filter((r) => r.s !== 200), hard = bad.filter((r) => /github\.com|githubusercontent|riteshmamidi0905-lab\.github\.io/.test(r.u) && !(r.s >= 300 && r.s < 400));
  console.log(JSON.stringify({ checked: out.length, ok: out.length - bad.length, notOk: bad.map((r) => `${r.s} ${r.u}${r.loc ? ' -> ' + r.loc : ''}${r.err ? ' ' + r.err : ''}`) }, null, 1));
  process.exit(hard.length ? 1 : 0);
})();
