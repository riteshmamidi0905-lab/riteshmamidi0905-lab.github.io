/* copilot.js — behaviour of the Support Escalation Copilot case-study page. Progressive enhancement only: without it the page shows the attack table,
   the recorded results and every claim. Nothing here computes a result; each replay shows what the repository recorded. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* attack replay: hostile input → obedient model → the layer that stopped it → how the case ended */
  const rp = $('#replay'); let data = {}; try { data = JSON.parse(($('#rm-copilot') || { textContent: '{}' }).textContent); } catch (e) { /* static page still reads fine */ }
  if (rp && data.attacks) {
    rp.hidden = false;
    const lanes = $$('.replay-lanes li', rp), pick = $$('.replay-pick button', rp), play = $('#replay-play'); let cur = 0, timers = [];
    const fill = (i) => {
      const r = data.attacks[i], set = (k, b, p) => { lanes[k].querySelector('b').textContent = b; lanes[k].querySelector('p').textContent = p; };
      set(0, r.ask, r.attack); set(1, 'Does exactly as told', 'a scripted wrapper, not an LLM'); set(2, r.contained, r.note); set(3, r.state, 'all four invariants held');
    };
    const show = (n) => lanes.forEach((l, k) => { l.classList.toggle('on', k <= n); l.classList.toggle('now', k === n); });
    const run = (i) => { timers.forEach(clearTimeout); timers = []; fill(i); if (reduce) { show(3); return; } show(-1); [0, 1, 2, 3].forEach((k) => timers.push(setTimeout(() => show(k), 300 + k * 650))); };
    pick.forEach((b, i) => b.addEventListener('click', () => { pick.forEach((x) => x.setAttribute('aria-pressed', x === b)); cur = i; run(i); }));
    play.addEventListener('click', () => run(cur));
    run(0);
  }

  /* recorded draft checks */
  $$('.ex-run').forEach((b) => b.addEventListener('click', () => { const res = b.parentElement.querySelector('.ex-res'), open = res.hidden; res.hidden = !open; b.setAttribute('aria-expanded', open); b.textContent = open ? 'Hide the recorded result' : 'Run the recorded check'; }));

  /* evidence table: filter by label */
  const ctl = $$('.ev-ctl button'), rows = $$('.ev-row'), groups = $$('.ev-group'), status = $('#ev-status');
  if (ctl.length) {
    const apply = (f) => {
      let n = 0; rows.forEach((r) => { const ok = f === 'all' || r.dataset.b === f; r.hidden = !ok; if (ok) n++; });
      groups.forEach((g) => { g.hidden = !g.querySelector('.ev-row:not([hidden])'); });
      status.textContent = `${n} of ${rows.length} claims shown`;
    };
    ctl.forEach((b) => b.addEventListener('click', () => { ctl.forEach((x) => x.setAttribute('aria-pressed', x === b)); apply(b.dataset.f); }));
    apply('all');
  }
})();
