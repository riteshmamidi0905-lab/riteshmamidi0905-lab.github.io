/* site.js — page behaviour: nav, reveal, copy-email, architecture explorers, MAREF dimensions, project library + detail dialog.
   No dependencies. Everything here is progressive enhancement: the page reads fine without it. */
(() => {
  'use strict';
  window.__enh = true;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (v == null) continue; if (k === 'class') e.className = v; else e.setAttribute(k, v); } kids.flat().forEach((c) => { if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); }); return e; };

  /* nav: solid after the hero starts to leave, progress bar, current section, mobile menu */
  const nav = $('#nav'), bar = $('#bar'), links = $$('#nlinks a[href^="#"]:not(.nl-cta)');
  const secs = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  function onScroll() {
    nav.classList.toggle('solid', scrollY > 40);
    const h = document.documentElement.scrollHeight - innerHeight; bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
    let cur = null; secs.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.45) cur = s.id; });
    links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + cur));
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), nl = $('#nlinks');
  const closeMenu = () => { nl.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
  burger.addEventListener('click', () => { const o = nl.classList.toggle('open'); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });
  nl.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); }); addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* reveal: headings and blocks, once */
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.rv').forEach((e) => io.observe(e));
  } else $$('.rv').forEach((e) => e.classList.add('in'));

  /* video posters load only when a film box is opened */
  $$('.filmbox').forEach((d) => d.addEventListener('toggle', () => { if (d.open) $$('video[data-poster]', d).forEach((v) => { v.poster = v.dataset.poster; v.removeAttribute('data-poster'); }); }));

  /* copy email */
  const cm = $('#copymail');
  if (cm) cm.addEventListener('click', async () => {
    const mail = cm.dataset.mail; try { await navigator.clipboard.writeText(mail); } catch (e) { const t = el('textarea'); t.value = mail; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (x) { /* ignore */ } t.remove(); }
    $('#cptext').textContent = 'copied'; const toast = $('#toast'); toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); $('#cptext').textContent = 'copy'; }, 1800);
  });

  /* MAREF dimensions */
  const dims = $$('.dimension');
  if (dims.length) {
    const data = JSON.parse($('#rm-maref').textContent);
    dims.forEach((b) => b.addEventListener('click', () => {
      const d = data[+b.dataset.i]; dims.forEach((x) => x.setAttribute('aria-pressed', x === b));
      $('#dimensionNum').textContent = 'Dimension ' + String(+b.dataset.i + 1).padStart(2, '0'); $('#dimensionTitle').textContent = d.name; $('#dimensionQ').textContent = d.question; $('#dimensionMethod').textContent = d.method; $('#dimensionEx').textContent = d.example;
      $('#dimensionFlow').replaceChildren(...d.flow.map((x) => el('li', null, x)));
    }));
  }

  /* project library: search + filter + detail dialog */
  const rows = $$('.prow'), q = $('#psearch'), status = $('#filterStatus'), empty = $('#pempty'); let filter = 'all';
  function apply() {
    const term = (q.value || '').trim().toLowerCase(); let n = 0;
    rows.forEach((r) => { const ok = (filter === 'all' || r.dataset.cat === filter) && (!term || term.split(/\s+/).every((w) => r.dataset.q.includes(w))); r.classList.toggle('hide', !ok); if (ok) n++; });
    status.textContent = `${n} project${n === 1 ? '' : 's'}`; empty.hidden = n > 0;
  }
  if (q) { q.addEventListener('input', apply); $$('.chips button').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; $$('.chips button').forEach((x) => x.setAttribute('aria-pressed', x === b)); apply(); })); }
  const dlg = $('#pdetail'), PD = JSON.parse(($('#rm-projects') || { textContent: '{}' }).textContent);
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('.pr-main').forEach((b) => b.addEventListener('click', () => {
      const p = PD[b.dataset.repo]; if (!p) return;
      $('#pd-cat').textContent = p.c; $('#pd-title').textContent = p.n; $('#pd-what').textContent = p.d;
      $('#pd-tech').replaceChildren(...p.t.map((t) => el('i', null, t)));
      $('#pd-ev').replaceChildren(...p.ev.map((e) => { const a = el('a', { href: e.href, target: '_blank', rel: 'noopener' }, el('span', null, e.label), el('span', null, '↗')); return el('li', null, a); }));
      const flag = $('#pd-flag'); flag.replaceChildren(); if (p.flag) flag.append(el('a', { href: '#flag-' + b.dataset.repo, class: 'ln' }, 'Read the flagship case study ↑'));
      flag.firstChild && flag.firstChild.addEventListener('click', () => dlg.close());
      const fig = $('#pd-vis'); fig.hidden = !p.visual; $$('img', fig).forEach((i) => i.remove());
      if (p.visual) fig.prepend(el('img', { src: `project-visuals/${b.dataset.repo}${reduce ? '-still' : ''}.svg`, alt: p.n + ' illustrative workflow', width: '640', height: '360' }));
      dlg.showModal();
    }));
  } else $$('.pr-main').forEach((b) => { b.disabled = true; });
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
