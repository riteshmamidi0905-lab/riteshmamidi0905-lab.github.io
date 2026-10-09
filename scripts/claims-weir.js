/* Claim governance for the Weir page: every number on it comes from the vendored headline file (pinned commit of the public repository), or from a
   small allow-list of structural numbers. `token('scripted.cells.A3/strict.attacks')` resolves a scalar and throws if it does not exist. */
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'content/evidence/mcp-weir');
const SOURCE = JSON.parse(fs.readFileSync(path.join(dir, 'SOURCE.json'), 'utf8'));
const H = JSON.parse(fs.readFileSync(path.join(dir, 'headline.json'), 'utf8'));
const dig = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function token(expr) {
  const v = dig(H, expr);
  if (v === undefined || v === null || typeof v === 'object') throw new Error('token does not resolve to a scalar: ' + expr);
  return v;
}
const cell = (arm, mode) => { const c = H.scripted.cells[`${arm}/${mode}`]; if (!c) throw new Error(`no cell ${arm}/${mode}`); return c; };
const rm = (arm, mode) => { const c = (H.realmodel.cells || {})[`${arm}/${mode}`]; if (!c) throw new Error(`no real-model cell ${arm}/${mode}`); return c; };
/* round half to even on exact ties, like Python's format() used for the repository's own tables (81.25 -> 81.2, 0.125 -> 0.12) */
const fix = (x, d) => { const f = 10 ** d, y = x * f, fl = Math.floor(y), tie = Math.abs(y - fl - 0.5) < 1e-9; const r = tie ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(y); return (r / f).toFixed(d); };
const pct = (k, n, d = 1) => fix(100 * k / n, d);
const frac = (k, n) => `${k}/${n}`;
const fmtn = (n) => Number(n).toLocaleString('en-US');
/* every number the page may show: all numbers in the headline file, the percentages derived from its counts, and structural ones */
function allowedNumbers() {
  const out = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '24', '2026', '100']);
  const add = (n) => { out.add(String(n)); out.add(fmtn(n)); };
  const pctOf = (k, n) => { if (!n) return; [0, 1].forEach((d) => out.add(pct(k, n, d))); out.add(String(Math.round(100 * k / n))); };
  (function walk(v, key) {
    if (typeof v === 'number') { add(v); out.add(v.toFixed(1)); out.add(v.toFixed(2)); out.add(String(Math.round(v * 100) / 100)); }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key)); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
  })(H);
  for (const group of [H.scripted.cells, H.realmodel.cells || {}]) for (const c of Object.values(group)) { pctOf(c.attacks_reached_goal, c.attacks); pctOf(c.benign_completed, c.benign); pctOf(c.benign_tasks_needing_approval, c.benign); }
  /* first-stop shares (counts over n) and the value tier's combined share */
  const fst = H.scripted.first_stop;
  if (fst) { for (const c of [...Object.values(fst.counts), ...Object.values(fst.fired || {}), fst.oracle_declined, fst.hard_denied]) pctOf(c, fst.n); pctOf((fst.counts['R-DEST-UNTRUSTED'] || 0) + (fst.counts['R-FLOW-CONF'] || 0), fst.n); }
  /* adaptive attacks: five seeds per cell */
  out.add('5'); out.add('0.74'); out.add('741'); out.add('390'); out.add('0.66');
  return out;
}
module.exports = { SOURCE, H, token, cell, rm, pct, fix, frac, fmtn, allowedNumbers };
