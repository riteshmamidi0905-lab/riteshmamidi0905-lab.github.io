/* nasha.js — progressive enhancement for the NASHA page. Without it every section reads in full (panels stacked, tables visible, details open on demand). No dependencies. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* architecture explorer: one panel at a time; arrow keys move between stages */
  var arch = $('[data-nx="arch"]');
  if (arch) {
    var nodes = $$('.nx-node', arch), panels = $$('.nx-pn', arch);
    var pick = function (k, focus) {
      nodes.forEach(function (n) { var on = n.getAttribute('data-k') === k; n.setAttribute('aria-pressed', on); if (on && focus) n.focus(); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-for') !== k; });
    };
    nodes.forEach(function (n, i) {
      n.addEventListener('click', function () { pick(n.getAttribute('data-k')); });
      n.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); var t = nodes[(i + d + nodes.length) % nodes.length]; pick(t.getAttribute('data-k'), true); }
      });
    });
    pick(nodes[0].getAttribute('data-k'));
  }

  /* planner comparison: switch the scenario subset; bars show k/n and the share */
  var pl = $('[data-nx="planners"]');
  if (pl) {
    var btns = $$('[data-split]', pl), bars = $$('.nx-bar', pl), note = $('[data-note]', pl), base = note.textContent;
    var show = function (split) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-split') === split); });
      bars.forEach(function (b) {
        var v = JSON.parse(b.getAttribute('data-v')), x = v[split], f = $('.nx-bf', b), t = $('.nx-bv', b);
        if (!x) { b.style.opacity = .45; f.style.width = '0%'; t.innerHTML = 'not run on this subset'; return; }
        b.style.opacity = 1; var p = 100 * x[0] / x[1]; f.style.width = p.toFixed(1) + '%'; t.innerHTML = x[0] + '/' + x[1] + ' <i>(' + Math.round(p) + '%)</i>';
      });
      note.textContent = split === 'all' ? base : (split === 'heldoutB' ? 'Held-out B is the split the deterministic planner was not fixed against before scoring. ' : 'Adversarial: prompt injection, poisoned documents and tool results, replay, decision and edit abuse. ') + 'Subset sizes differ by planner; read the counts, not just the bars.';
    };
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-split')); }); });
  }

  /* retrieval explorer: MRR per category */
  var rt = $('[data-nx="retrieval"]');
  if (rt) {
    var data = JSON.parse(rt.getAttribute('data-mrr')), sel = $('select', rt), rb = $$('.nx-bar', rt), rn = $('[data-note]', rt);
    var draw = function () {
      var c = sel.value;
      rb.forEach(function (b) { var v = data[b.getAttribute('data-id')][c], f = $('.nx-bf', b), t = $('.nx-bv', b); if (v == null) { f.style.width = '0%'; t.textContent = 'n/a'; } else { f.style.width = (100 * v).toFixed(1) + '%'; t.textContent = v.toFixed(3); } });
      rn.textContent = c === 'ALL' ? 'Higher is better. Category sizes differ (3 to about 60 questions); small categories are noisy.' : 'Category: ' + sel.options[sel.selectedIndex].text + '. Small categories are noisy; read the pattern across categories, not one bar.';
    };
    sel.addEventListener('change', draw);
  }

  /* steppers: failure story and trace walkthrough (one open at a time; all open without JS) */
  $$('[data-nx="steps"]').forEach(function (list) {
    var heads = $$('button[aria-controls]', list);
    var open = function (b, on) { b.setAttribute('aria-expanded', on); var p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = !on; };
    heads.forEach(function (b, i) {
      open(b, i === 0);
      b.addEventListener('click', function () { var on = b.getAttribute('aria-expanded') !== 'true'; heads.forEach(function (o) { open(o, false); }); open(b, on); });
    });
  });

  /* permission illustration */
  var sim = $('[data-nx="perm"]');
  if (sim) {
    var s = $('select', sim), outs = $$('.nx-out', sim);
    var upd = function () { outs.forEach(function (o) { o.hidden = o.getAttribute('data-i') !== s.value; }); };
    s.addEventListener('change', upd); upd();
  }
})();
