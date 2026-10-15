/* Claim governance for the NASHA page: every number on it comes from the vendored portfolio-evidence.json (a pinned commit of the public repository), or from a small allow-list of
   structural numbers. The page never types a result. SYNTHETIC DATA / OFFLINE EVALUATION / same author. */
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'content/evidence/nasha-lab');
const SOURCE = JSON.parse(fs.readFileSync(path.join(dir, 'SOURCE.json'), 'utf8'));
const E = JSON.parse(fs.readFileSync(path.join(dir, 'portfolio-evidence.json'), 'utf8'));
const LEDGER = JSON.parse(fs.readFileSync(path.join(dir, 'claims.json'), 'utf8'));
const BASELINE = JSON.parse(fs.readFileSync(path.join(dir, 'BASELINE-BLOCK3.json'), 'utf8'));
const planner = (id) => { const p = E.planners.find((x) => x.id === id); if (!p) throw new Error('no planner ' + id); return p; };
const hasPlanner = (id) => E.planners.some((x) => x.id === id);
const claim = (id) => { const c = E.claims.find((x) => x.claim_id === id); if (!c) throw new Error('no claim ' + id); return c; };
const fix = (x, d) => { const f = 10 ** d, y = x * f, fl = Math.floor(y), tie = Math.abs(y - fl - 0.5) < 1e-9; const r = tie ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(y); return (r / f).toFixed(d); };
const pct = (k, n, d = 0) => fix(100 * k / n, d);
const frac = (o) => `${o.k}/${o.n}`;
const fmtn = (n) => Number(n).toLocaleString('en-US');
const ms = (v) => (v == null ? 'n/a' : v >= 1000 ? `${fix(v / 1000, 1)} s` : `${fix(v, 0)} ms`);
const SHA = SOURCE.sha, SHORT = SHA.slice(0, 7), REPO = SOURCE.repo.split('/')[1], REPO_URL = 'https://github.com/' + SOURCE.repo;
const blob = (p) => `${REPO_URL}/blob/${SHA}/${p}`, tree = (p) => `${REPO_URL}/tree/${SHA}/${p}`;
/* every number the page may show: all numbers in the evidence file, percentages derived from its {k,n} pairs, and structural ones */
function allowedNumbers() {
  const out = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '2026', '100', '1.5', '0.8', '54', '84', '66']);
  const add = (n) => { out.add(String(n)); out.add(fmtn(n)); };
  const pctOf = (k, n) => { if (!n) return; [0, 1].forEach((d) => out.add(pct(k, n, d))); };
  (function walk(v) {
    if (typeof v === 'number') { add(v); [0, 1, 2, 3].forEach((d) => out.add(v.toFixed(d))); out.add(String(Math.round(v * 100) / 100)); out.add(fix(v * 100, 0)); out.add(fix(v * 100, 1)); out.add(fix(v / 1000, 1)); }
    else if (typeof v === 'string') { for (const m of v.matchAll(/\d[\d,]*(?:\.\d+)*/g)) out.add(m[0].replace(/[.,]+$/, '')); }
    else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (typeof v.k === 'number' && typeof v.n === 'number') pctOf(v.k, v.n); Object.values(v).forEach(walk); }
  })(E);
  const calls = ['q15r1', 'q15r2', 'q7'].reduce((s, id) => s + (E.planners.find((p) => p.id === id) || { llm_calls: 0 }).llm_calls, 0); add(calls);
  return out;
}
module.exports = { SOURCE, E, LEDGER, BASELINE, planner, hasPlanner, claim, fix, pct, frac, fmtn, ms, SHA, SHORT, REPO, REPO_URL, blob, tree, allowedNumbers };
