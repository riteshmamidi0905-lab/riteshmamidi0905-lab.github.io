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

  /* ---------- mission explainers ---------- */
  function explainers() {
    $$('.ex').forEach((ex) => {
      const items = $$('.ex-beats li', ex); if (!items.length) return;
      const head = $('.ex-head', ex), body = $('.ex-body', ex);
      ex.classList.add('is-js');
      const ctl = document.createElement('div'); ctl.className = 'ex-ctl'; ctl.setAttribute('role', 'group'); ctl.setAttribute('aria-label', 'Explanation controls');
      const btn = (label, act, aria) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.act = act; b.textContent = label; if (aria) b.setAttribute('aria-label', aria); ctl.append(b); return b; };
      const prev = btn('‹ Prev', 'prev', 'Previous point'), play = btn('▶ Play', 'play', 'Play the explanation'), next = btn('Next ›', 'next', 'Next point'), all = btn('Show all', 'all', 'Show every point as a list');
      const hasAudio = items.some((li) => li.dataset.audio);
      let mute = null; if (hasAudio) { mute = btn('Sound off', 'mute', 'Toggle narration'); mute.setAttribute('aria-pressed', 'true'); }
      head.append(ctl);
      const pills = document.createElement('div'); pills.className = 'ex-pills'; pills.setAttribute('role', 'group'); pills.setAttribute('aria-label', 'Jump to a point');
      items.forEach((li, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = $('h5', li).textContent; b.addEventListener('click', () => { stop(); go(i); }); pills.append(b); });
      const prog = document.createElement('div'); prog.className = 'ex-prog'; prog.innerHTML = '<span></span>';
      $('.ex-beats', ex).after(pills, prog);
      const note = document.createElement('p'); note.className = 'lab-note'; note.style.margin = '10px 0 0'; note.textContent = hasAudio ? 'Captions are always shown.' : 'Captions only: narration audio has not been recorded yet. The text below is the full explanation.'; prog.after(note);
      let idx = 0, timer = 0, raf = 0, playing = false, audio = null, muted = true, t0 = 0, dur = 0, listAll = false;
      const bar = $('span', prog);
      function go(i) {
        idx = clamp(i, 0, items.length - 1); items.forEach((li, k) => li.classList.toggle('on', listAll || k === idx));
        $$('button', pills).forEach((b, k) => { b.classList.toggle('on', k === idx); b.setAttribute('aria-current', k === idx ? 'step' : 'false'); });
        prev.disabled = idx === 0; next.disabled = idx === items.length - 1; bar.style.width = '0';
      }
      function tick(now) { if (!playing) return; const f = clamp((now - t0) / dur); bar.style.width = f * 100 + '%'; if (f >= 1) return advance(); raf = requestAnimationFrame(tick); }
      function advance() { if (idx >= items.length - 1) return stop(); go(idx + 1); begin(); }
      function begin() {
        cancelAnimationFrame(raf); if (audio) { audio.pause(); audio = null; }
        const li = items[idx], chars = li.textContent.length; dur = clamp(2800 + chars * 38, 3500, 13000); t0 = performance.now();
        if (hasAudio && !muted && li.dataset.audio) { audio = new Audio(li.dataset.audio); audio.addEventListener('ended', advance); audio.play().catch(() => { audio = null; }); if (audio) { bar.style.width = '0'; return; } }
        raf = requestAnimationFrame(tick);
      }
      function start() { listAll = false; playing = true; play.textContent = '❚❚ Pause'; play.setAttribute('aria-label', 'Pause the explanation'); if (idx >= items.length - 1) go(0); else go(idx); begin(); }
      function stop() { playing = false; cancelAnimationFrame(raf); if (audio) { audio.pause(); audio = null; } play.textContent = '▶ Play'; play.setAttribute('aria-label', 'Play the explanation'); }
      prev.addEventListener('click', () => { stop(); listAll = false; go(idx - 1); }); next.addEventListener('click', () => { stop(); listAll = false; go(idx + 1); });
      play.addEventListener('click', () => (playing ? stop() : start()));
      all.addEventListener('click', () => { stop(); listAll = !listAll; all.setAttribute('aria-pressed', listAll); go(idx); });
      if (mute) mute.addEventListener('click', () => { muted = !muted; mute.setAttribute('aria-pressed', muted); mute.textContent = muted ? 'Sound off' : 'Sound on'; if (muted && audio) { audio.pause(); audio = null; } });
      new IntersectionObserver((es) => { if (!es[0].isIntersecting && playing) stop(); }, { threshold: 0 }).observe(ex);
      // architecture explorer
      const list = $('.ex-archlist', ex);
      if (list) {
        const nodes = $$('li', list), wrap = document.createElement('div'), row = document.createElement('div'), detail = document.createElement('p'); row.className = 'ex-nodes'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Architecture components'); detail.className = 'ex-detail'; detail.setAttribute('aria-live', 'polite');
        nodes.forEach((li, i) => { const name = $('b', li).textContent, txt = li.textContent.slice(name.length).replace(/^\s*—\s*/, ''); const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => { $$('button', row).forEach((x) => x.setAttribute('aria-pressed', x === b)); detail.textContent = txt; }); row.append(b); if (i < nodes.length - 1) { const a = document.createElement('i'); a.textContent = '→'; a.setAttribute('aria-hidden', 'true'); row.append(a); } });
        list.replaceWith(wrap); wrap.append(row, detail); $('button', row).click();
      }
      go(0);
    });
  }

  /* ---------- lab: tabs + lazy load of the demo code ---------- */
  const LAB_SCRIPTS = ['lab/eval-core.js', 'lab/rag-corpus.js', 'lab/rag-core.js', 'lab/stats-core.js', 'lab/lab-ui.js'];
  let labState = 0;   // 0 idle, 1 loading, 2 ready
  function loadLab() {
    if (labState) return; labState = 1;
    LAB_SCRIPTS.reduce((p, f) => p.then(() => new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/js/' + f; s.onload = res; s.onerror = rej; document.head.append(s); })), Promise.resolve())
      .then(() => { labState = 2; window.RMLab.mountLab(); }).catch(() => { labState = 0; $$('.lab-ui').forEach((u) => { u.textContent = 'The demo code could not be loaded. Please reload the page.'; }); });
  }
  function selectLab(id, focus) {
    $$('.lab-tabs [role=tab]').forEach((t) => { const on = t.dataset.lab === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$('.lab-panel').forEach((p) => { p.hidden = p.dataset.lab !== id; });
    loadLab(); requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  function lab() {
    const sec = $('#lab'); if (!sec) return;
    const tabs = $$('.lab-tabs [role=tab]');
    tabs.forEach((t, i) => { t.addEventListener('click', () => selectLab(t.dataset.lab)); t.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); selectLab(tabs[(i + k + tabs.length) % tabs.length].dataset.lab, true); } else if (e.key === 'Home') { e.preventDefault(); selectLab(tabs[0].dataset.lab, true); } else if (e.key === 'End') { e.preventDefault(); selectLab(tabs[tabs.length - 1].dataset.lab, true); } }); });
    const fromHash = () => { const m = /^#lab-(\w+)$/.exec(location.hash); if (m && $('#lab-' + m[1])) { selectLab(m[1]); } };
    document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#lab-"]'); if (!a) return; const id = a.getAttribute('href').slice(5); e.preventDefault(); selectLab(id); history.replaceState(null, '', '#lab-' + id); const p = $('#lab-' + id); p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
    addEventListener('hashchange', fromHash); fromHash();
    new IntersectionObserver((es) => { if (es[0].isIntersecting) loadLab(); }, { rootMargin: '700px 0px' }).observe(sec);
  }

  /* ---------- capture mode: ?capture=hero|agents|data|maref|product|contact|rag|stream|experiment|maref-lab|funnel|<flagship-id> ---------- */
  function captureMode() {
    if (!capture) return;
    const map = { hero: '#hero', agents: '#world-agents', data: '#world-data', streaming: '#world-data', maref: '#world-maref', product: '#world-product', analytics: '#world-product', contact: '#contact',
      rag: '#lab-rag', stream: '#lab-stream', experiment: '#lab-experiment', experimentation: '#lab-experiment', funnel: '#lab-funnel', 'maref-lab': '#lab-maref', agent: '#lab-agent', 'agent-lab': '#lab-agent' };
    let target = $(map[capture] || ''); if (!target) { const ex = $(`.ex[data-flag="${capture}"]`); target = ex && ex.closest('.flagw'); }
    if (!target) return;
    document.documentElement.classList.add('rm-capture');
    let n = target; while (n && n !== document.body) { n.classList.add('rm-cap-keep'); n = n.parentElement; }
    const lp = target.closest('.lab-panel') || (target.classList.contains('lab-panel') ? target : null);
    if (lp) { $('#lab').classList.add('rm-cap-keep'); $('#lab .wrap').classList.add('rm-cap-keep'); lp.classList.add('rm-cap-keep'); selectLab(lp.dataset.lab); document.documentElement.classList.add('rm-capture-lab'); }
    $$('.rm-cap-keep').forEach((k) => { if (k !== document.body) { const sibs = k.parentElement ? [...k.parentElement.children] : []; sibs.forEach((s) => { if (!s.classList.contains('rm-cap-keep')) s.setAttribute('data-cap-hide', ''); }); } });
    window.scrollTo(0, 0);
    const wait = () => { const w = window.__rm && window.__rm.worlds.find((x) => x.el === target); if (!w) { if (target.dataset.world) return setTimeout(wait, 40); } else if (params.get('t') || params.get('step')) w.renderAt(+params.get('t') || 0, +params.get('step') || 0); document.documentElement.dataset.captureReady = '1'; };
    wait();
  }

  /* ---------- project micro-stories: a 10-second tour from each card's own data ---------- */
  function tours() {
    const dlg = $('#tour'); if (!dlg || typeof dlg.showModal !== 'function') { $$('.pc-tour').forEach((b) => b.remove()); return; }
    const RIM = { data: '#6aa7ff', ai: '#22d3a6', builder: '#22d3a6', product: '#f5b94a' }; let timer = 0;
    const cat = { data: 'Data Engineering', genai: 'GenAI · LLM', mlops: 'MLOps', analytics: 'Analytics', vision: 'Vision · Speech · NLP' };
    dlg.addEventListener('close', () => clearInterval(timer)); dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('.pcard').forEach((card) => {
      const btn = $('.pc-tour', card); if (!btn) return;
      btn.addEventListener('click', () => {
        const flow = card.dataset.flow.split('|'), name = $('h4', card).textContent, desc = $('p', card).textContent, tech = $$('.tt span', card).map((s) => s.textContent);
        dlg.style.setProperty('--rim', RIM[card.dataset.persona] || '#22d3a6'); $('.av', dlg).style.setProperty('--rim', RIM[card.dataset.persona] || '#22d3a6');
        $('.tour-kicker', dlg).textContent = 'Presenter Ritesh · ' + (cat[card.dataset.cat] || ''); $('#tour-title').textContent = name;
        const fl = $('.tour-flow', dlg); fl.replaceChildren(...flow.flatMap((n, i) => { const s = document.createElement('span'); s.textContent = n; return i < flow.length - 1 ? [s, Object.assign(document.createElement('i'), { textContent: '→', ariaHidden: 'true' })] : [s]; }));
        const line = $('.tour-line', dlg); line.textContent = desc;
        const tt = $('.tour-tech', dlg); tt.replaceChildren(...tech.map((t) => Object.assign(document.createElement('span'), { textContent: t })));
        const lk = $('.tour-links', dlg); lk.replaceChildren(...$$('.links a', card).map((a) => { const x = a.cloneNode(true); x.textContent = a.classList.contains('demo') ? 'Live demo ↗' : 'Open the code ↗'; return x; }));
        const spans = $$('span', fl); let i = 0; clearInterval(timer); spans.forEach((s) => s.classList.remove('on'));
        if (reduce) spans.forEach((s) => s.classList.add('on')); else timer = setInterval(() => { if (i < spans.length) spans[i++].classList.add('on'); else clearInterval(timer); }, 700);
        dlg.showModal();
      });
    });
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
    intro(); explainers(); lab(); tours(); captureMode();
    const y = $('#yr'); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
