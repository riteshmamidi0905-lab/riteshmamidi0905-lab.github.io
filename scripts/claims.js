/* Claim governance, part 2: the ONLY way copy about Support Escalation Copilot gets a number. Reads the vendored public-claims manifest (pinned commit) and
   resolves tokens such as {{test-suite.passed}} or {{retrieval-vector-beat-hybrid.strategies.vector.hit@1}} at build time. A token that does not resolve, or that
   points at a claim the repository did not mark `suitable_for.portfolio`, throws: the build fails instead of printing a number nobody can trace. */
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'content/evidence/support-escalation-copilot');
const SOURCE = JSON.parse(fs.readFileSync(path.join(dir, 'SOURCE.json'), 'utf8'));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(dir, 'public-claims.json'), 'utf8'));
const STEERING = JSON.parse(fs.readFileSync(path.join(dir, 'draft-steering.json'), 'utf8'));
const EVIDENCE = JSON.parse(fs.readFileSync(path.join(dir, 'release-evidence.json'), 'utf8'));
const BY_ID = Object.fromEntries(MANIFEST.claims.map((c) => [c.id, c]));
const claim = (id) => { const c = BY_ID[id]; if (!c) throw new Error('unknown claim id: ' + id); if (!c.suitable_for.portfolio) throw new Error(`claim ${id} is not suitable_for.portfolio in the source manifest: it must not appear on the site`); return c; };
const dig = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function token(expr) {
  const [id, ...rest] = expr.split('.'); const c = claim(id);
  if (!rest.length) throw new Error('token needs a path: {{' + expr + '}}');
  const v = dig(c.value || {}, rest.join('.'));
  if (v === undefined || v === null || typeof v === 'object') throw new Error('token does not resolve to a scalar: {{' + expr + '}}');
  return String(v);
}
const fill = (s) => String(s).replace(/\{\{([^}]+)\}\}/g, (_, e) => token(e.trim()));
/* the numbers a visitor may see in the case study: every scalar number inside any portfolio-eligible claim's text, qualification or value */
function allowedNumbers() {
  const out = new Set(), grab = (s) => String(s).replace(/[A-Za-z]+-\d+|\bv?\d+\.\d+\.\d+\b|0x[0-9a-f]+/gi, ' ').match(/\d+(?:[.,]\d+)?/g)?.forEach((n) => out.add(n.replace(/,/g, '')));
  /* numbers in the manifest's values may legitimately be shown rounded: 0.8733 as 0.87, 0.4545 as 45% */
  const num = (n) => { out.add(String(n)); out.add(n.toFixed(2)); if (n >= 0 && n <= 1) out.add(String(Math.round(n * 100))); };
  const walk = (v) => { if (typeof v === 'number') num(v); else if (typeof v === 'string') grab(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  MANIFEST.claims.filter((c) => c.suitable_for.portfolio).forEach((c) => { grab(c.claim); grab(c.qualification); walk(c.value || {}); });
  return out;
}
/* The repository's own end-to-end injection-containment report, vendored. The case study's attack rows and its "detectors on or off" statement are checked against it. */
const injectionRows = () => fs.readFileSync(path.join(dir, 'm4-injection.md'), 'utf8').split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| attack') && !l.startsWith('|---'))
  .map((l) => l.split('|').slice(1, -1).map((x) => x.trim())).map(([attack, model, detectors, outcome, final, proposed, rejected, contained, i1, i2, i3, i4]) => ({ attack, model, detectors, outcome, final, proposed, rejected, contained, inv: [i1, i2, i3, i4] }));
function detectorsOnOff() {
  const rows = injectionRows().filter((r) => r.model === 'obedient'), by = {};
  rows.forEach((r) => { (by[r.attack] = by[r.attack] || {})[r.detectors] = [r.outcome, r.final, r.proposed, r.rejected, r.contained].join('|'); });
  const pairs = Object.values(by).filter((v) => v.on && v.OFF);
  return { pairs: pairs.length, same: pairs.filter((v) => v.on === v.OFF).length };
}

/* Evidence layer: one vocabulary, derived from the manifest's own fields, never typed by hand.
   limitation: a stated gap · not-evaluated: not run, no result claimed · simulated: real code, but a scripted stand-in plays the model · verified: measured/tested in the public repo at the pinned commit */
const BADGES = {
  verified: ['Verified', 'Tested or measured in the public repository at the pinned commit. The qualification beside it says what that does and does not show.'],
  simulated: ['Simulated', 'Real code was run, but a scripted stand-in plays the model, a customer system or an approver. It tests the controls, not a language model.'],
  limitation: ['Limitation', 'A known gap, stated on purpose.'],
  'not-evaluated': ['Not evaluated', 'Not run. No result is claimed.'],
};
const badgeOf = (c) => (c.evidence_class === 'not_executed' ? 'not-evaluated' : c.kind === 'limitation' ? 'limitation' : c.model === 'deterministic_stand_in' ? 'simulated' : 'verified');
const deepFill = (v) => (typeof v === 'string' ? fill(v) : Array.isArray(v) ? v.map(deepFill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepFill(x)])) : v);
module.exports = { SOURCE, MANIFEST, STEERING, EVIDENCE, claim, fill, deepFill, token, allowedNumbers, BY_ID, BADGES, badgeOf, injectionRows, detectorsOnOff };
