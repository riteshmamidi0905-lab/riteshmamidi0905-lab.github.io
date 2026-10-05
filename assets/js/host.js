/* host.js — the avatar host's behaviours: first-visit intro, mission explainers (play / pause / step,
   architecture explorer, narration hook), lab loading + tabs, and capture mode (?capture=…). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search), capture = params.get('capture');
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };

  /* ---------- first-visit intro: signals → network → silhouette → hero. ≤3.4 s, skippable, shown once ---------- */
  function intro() {
    const el = $('.rm-intro'); if (!el) return;
    const finish = () => { if (el.classList.contains('done')) return; el.classList.add('done'); document.documentElement.classList.remove('intro-pending'); store.set('rm-intro-seen', '1'); cancelAnimationFrame(raf); setTimeout(() => { el.style.display = 'none'; }, 900); };
    let raf = 0;
    if (!document.documentElement.classList.contains('intro-pending') || reduce || capture) { el.style.display = 'none'; return; }
    $('.intro-skip', el).addEventListener('click', finish); addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
    const cv = $('canvas', el), c = cv.getContext('2d'), word = $('.intro-word', el), img = new Image();
    const dpr = Math.min(devicePixelRatio || 1, 2); let W = 0, H = 0;
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    img.onerror = finish;
    img.onload = () => {
      const ih = H * (W < 700 ? 0.6 : 0.8), iw = ih * img.width / img.height, ix = W < 700 ? (W - iw) / 2 : W * 0.5 - iw * 0.2, iy = H - ih;
      const off = document.createElement('canvas'); off.width = Math.ceil(iw); off.height = Math.ceil(ih); const oc = off.getContext('2d'); oc.drawImage(img, 0, 0, iw, ih);
      const data = oc.getImageData(0, 0, off.width, off.height).data, step = W < 700 ? 11 : 9, pts = [];
      for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (data[(y * off.width + x) * 4 + 3] > 140) pts.push({ tx: ix + x, ty: iy + y });
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      pts.forEach((p) => { const a = rnd() * 6.283, r = Math.max(W, H) * (0.5 + rnd() * 0.5); p.sx = W / 2 + Math.cos(a) * r; p.sy = H / 2 + Math.sin(a) * r; p.d = rnd() * 0.5; });
      const T0 = performance.now(), TOTAL = 3300, ease = (t) => 1 - Math.pow(1 - t, 3);
      const frame = (now) => {
        const t = (now - T0) / 1000; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        const conv = clamp((t - 0.35) / 1.3), net = clamp(1 - (t - 1.7) / 0.9), reveal = clamp((t - 1.5) / 1.0);
        if (t < 0.5) { c.fillStyle = `rgba(121,237,197,${0.4 + 0.6 * Math.sin(t * 12) ** 2})`; c.fillRect(W / 2 - 1.5, H / 2 - 1.5, 3, 3); }
        const cur = pts.map((p) => { const k = ease(clamp((conv - p.d * 0.5) / (1 - p.d * 0.5))); return [p.sx + (p.tx - p.sx) * k, p.sy + (p.ty - p.sy) * k]; });
        c.fillStyle = 'rgba(121,237,197,.85)'; cur.forEach((q, i) => { if (i % 2 || conv > 0.02) c.fillRect(q[0], q[1], 1.6, 1.6); });
        if (net > 0 && conv > 0.5) { c.strokeStyle = `rgba(34,211,166,${0.16 * net * conv})`; c.lineWidth = 0.7; c.beginPath(); for (let i = 0; i < cur.length; i += 2) { const a = cur[i], b = cur[i + 3]; if (b && Math.abs(a[0] - b[0]) < step * 2.2 && Math.abs(a[1] - b[1]) < step * 2.2) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } } c.stroke(); }
        if (reveal > 0) { c.save(); c.globalAlpha = ease(reveal); c.shadowColor = '#22d3a6'; c.shadowBlur = 30; c.drawImage(img, ix, iy, iw, ih); c.restore(); }
        word.classList.toggle('on', t > 2.3);
        if (t * 1000 > TOTAL) return finish();
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    img.src = 'assets/avatar/ritesh-cutout-1020.webp';
    setTimeout(finish, 5500);
  }

  /* ---------- lab: tabs + lazy load of the demo code ---------- */
  const LAB_SCRIPTS = ['lab/agent-core.js', 'lab/stream-core.js', 'lab/funnel-core.js', 'lab/eval-core.js', 'lab/rag-corpus.js', 'lab/rag-core.js', 'lab/stats-core.js', 'lab/lab-ui.js'];
  let labState = 0;   // 0 idle, 1 loading, 2 ready
  function loadLab() {
    if (labState) return; labState = 1;
    LAB_SCRIPTS.reduce((p, f) => p.then(() => (window.RMW && window.RMW.loadFile ? window.RMW.loadFile(f) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/js/' + f; s.onload = res; s.onerror = rej; document.head.append(s); }))), Promise.resolve())
      .then(() => { labState = 2; window.RMLab.mountLab(); }).catch(() => { labState = 0; $$('.lab-ui').forEach((u) => { u.textContent = 'The demo code could not be loaded. Please reload the page.'; }); });
  }
  function selectLab(id, focus) {
    const panel = $('#lab-' + id); if (!panel) return;
    const group = panel.closest('.demo');
    $$('[role=tab]', group).forEach((t) => { const on = t.dataset.lab === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$('.lab-panel', group).forEach((p) => { p.hidden = p.dataset.lab !== id; });
    loadLab(); requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  function lab() {
    $$('.demo .seg').forEach((seg) => {
      const tabs = $$('[role=tab]', seg);
      tabs.forEach((t, i) => { t.addEventListener('click', () => selectLab(t.dataset.lab)); t.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); selectLab(tabs[(i + k + tabs.length) % tabs.length].dataset.lab, true); } else if (e.key === 'Home') { e.preventDefault(); selectLab(tabs[0].dataset.lab, true); } else if (e.key === 'End') { e.preventDefault(); selectLab(tabs[tabs.length - 1].dataset.lab, true); } }); });
    });
    const go = (id, smooth) => { selectLab(id); const p = $('#lab-' + id); const top = p.closest('.demo').getBoundingClientRect().top + scrollY - 70; scrollTo({ top, behavior: smooth && !reduce ? 'smooth' : 'auto' }); };
    document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#lab-"]'); if (!a) return; e.preventDefault(); const id = a.getAttribute('href').slice(5); go(id, true); history.replaceState(null, '', '#lab-' + id); });
    const fromHash = () => { const m = /^#lab-(\w+)$/.exec(location.hash); if (m && $('#lab-' + m[1])) go(m[1], false); };
    addEventListener('hashchange', fromHash); fromHash();
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { loadLab(); io.disconnect(); } }, { rootMargin: '900px 0px' });
    $$('.demo').forEach((d) => io.observe(d));
  }

  /* ---------- capture mode: ?capture=hero|agents|data|maref|product|contact|rag|stream|experiment|maref-lab|funnel|<flagship-id> ---------- */
  function captureMode() {
    if (!capture) return;
    const map = { hero: '#hero', agents: '#world-agents', data: '#world-data', streaming: '#world-data', maref: '#world-maref', product: '#world-product', analytics: '#world-product', contact: '#contact',
      rag: '#lab-rag', stream: '#lab-stream', experiment: '#lab-experiment', experimentation: '#lab-experiment', funnel: '#lab-funnel', 'maref-lab': '#lab-maref', agent: '#lab-agent', 'agent-lab': '#lab-agent' };
    let target = $(map[capture] || ''); if (!target) target = $(`#flag-${capture}`);
    if (!target) return;
    document.documentElement.classList.add('rm-capture');
    let n = target; while (n && n !== document.body) { n.classList.add('rm-cap-keep'); n = n.parentElement; }
    const lp = target.closest('.lab-panel') || (target.classList.contains('lab-panel') ? target : null); if (lp) { let m = lp; while (m && m !== document.body) { m.classList.add('rm-cap-keep'); m = m.parentElement; } }
    if (lp) { lp.classList.add('rm-cap-keep'); selectLab(lp.dataset.lab); document.documentElement.classList.add('rm-capture-lab'); }
    $$('.rm-cap-keep').forEach((k) => { if (k !== document.body) { const sibs = k.parentElement ? [...k.parentElement.children] : []; sibs.forEach((s) => { if (!s.classList.contains('rm-cap-keep')) s.setAttribute('data-cap-hide', ''); }); } });
    window.scrollTo(0, 0);
    const wait = () => { const w = window.__rm && window.__rm.worlds.find((x) => x.el === target); if (!w) { if (target.dataset.world) return setTimeout(wait, 40); } else if (params.get('t') || params.get('step')) w.renderAt(+params.get('t') || 0, +params.get('step') || 0); document.documentElement.dataset.captureReady = '1'; };
    wait();
  }

  /* ---------- launch film: a deterministic director page (see film.js) ---------- */
  function filmMode() {
    document.documentElement.classList.add('rm-capture', 'rm-film');
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/film.css'; document.head.append(l);
    const s = document.createElement('script'); s.src = 'assets/js/film.js'; document.head.append(s);
    $$('body > *:not(script):not(link)').forEach((n) => n.setAttribute('data-cap-hide', ''));
    loadLab();
  }

  function init() {
    if (capture === 'film') { filmMode(); return; }
    intro(); lab(); captureMode();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
