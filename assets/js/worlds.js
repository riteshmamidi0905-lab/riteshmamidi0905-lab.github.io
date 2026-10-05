/* worlds.js — the scene engine. Every chapter and flagship is a full-screen pinned canvas scene: a pure function of
   (time, step), so it is deterministic for capture/film and cheap to pause. Scroll position scrubs the step; step buttons and
   arrow keys do the same without scrolling. Scene code (and the real logic cores each scene runs) loads lazily when the
   section nears the viewport; only the scene on screen renders. Scene files register themselves with RMW.register(). */
(() => {
  'use strict';
  const RM = (window.RMLab = window.RMLab || {});
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  const capture = params.get('capture');
  const mobileMQ = matchMedia('(max-width: 900px)');
  const lowPower = () => mobileMQ.matches || (navigator.hardwareConcurrency || 8) <= 4;
  const STATIC = () => reduceMQ.matches || !!capture;
  const TAU = Math.PI * 2, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => t * t * (3 - 2 * t), easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const HEX = { ac: '#22d3a6', ac2: '#79edc5', blue: '#6aa7ff', amber: '#f5b94a', red: '#ff6b6b', violet: '#9b8cff', tx: '#f3f5f7', mut: '#a0a9b6', dim: '#6f7a89' };
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const FONT = '"JetBrains Mono",ui-monospace,Menlo,monospace', SANS = 'Inter,system-ui,sans-serif';
  const rand = (seed) => { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---------- drawing helpers shared by every scene ---------- */
  const SC = { dpr: 1 };
  function rec(c, s, x, y, o) { const sz = o.size || 12; c.font = `${o.w || 500} ${sz}px ${o.sans ? SANS : FONT}`; const m = c.measureText(String(s)), t = c.getTransform(), w = m.width + (o.ls || 0) * String(s).length, al = o.align || 'left', x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x; window.__txt.push({ s: String(s).slice(0, 40), x: (x0 * t.a + t.e) / SC.dpr, y: ((y - sz * 0.78) * t.d + t.f) / SC.dpr, w: w * t.a / SC.dpr, h: sz * t.d / SC.dpr, a: c.globalAlpha }); }
  function glow(c, x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function rrect(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function text(c, s, x, y, o) { o = o || {}; if (window.__txt) rec(c, s, x, y, o); c.font = `${o.w || 500} ${o.size || 12}px ${o.sans ? SANS : FONT}`; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic'; c.fillStyle = o.col || HEX.tx; if (o.ls) c.letterSpacing = o.ls + 'px'; c.fillText(s, x, y); if (o.ls) c.letterSpacing = '0px'; }
  function wrap(c, s, x, y, maxW, lh, o) { const words = String(s).split(' '); let ln = '', yy = y, n = 0; c.font = `${(o && o.w) || 500} ${(o && o.size) || 12}px ${o && o.sans ? SANS : FONT}`; for (const w of words) { const t = ln ? ln + ' ' + w : w; if (c.measureText(t).width > maxW && ln) { text(c, ln, x, yy, o); ln = w; yy += lh; n++; } else ln = t; } if (ln) { text(c, ln, x, yy, o); n++; } return n; }
  function line(c, x1, y1, x2, y2, col, w, a, dash) { c.save(); c.strokeStyle = rgba(col, a == null ? 1 : a); c.lineWidth = w || 1; if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore(); }
  function curve(c, p0, p1, p2, p3, col, w, a, dash, off) { c.save(); c.strokeStyle = rgba(col, a == null ? 1 : a); c.lineWidth = w || 1; if (dash) { c.setLineDash(dash); c.lineDashOffset = off || 0; } c.beginPath(); c.moveTo(p0[0], p0[1]); c.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); c.stroke(); c.restore(); }
  const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
  const Hh = { SC, TAU, clamp, lerp, ease, easeOut, HEX, rgba, rgb, rand, glow, rrect, text, wrap, line, curve, bez, FONT, SANS, lowPower };

  function backdrop(c, L, t, s, tint, parts) {
    const { W, H } = L;
    c.fillStyle = '#05070a'; c.fillRect(0, 0, W, H);
    glow(c, W * 0.5, H * 0.42, Math.max(W, H) * 0.55, tint, 0.075);
    const hy = H * 0.66, vx = W * 0.5, off = ((t * 0.1 + s * 0.3) % 1);
    c.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const f = (i + off) / 12, y = hy + (H - hy) * f * f * f; c.strokeStyle = rgba(tint, 0.03 + 0.07 * f); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let k = -12; k <= 12; k++) { c.strokeStyle = rgba(tint, 0.04); c.beginPath(); c.moveTo(vx + k * 22, hy); c.lineTo(vx + k * W * 0.13, H); c.stroke(); }
    const n = L.low ? 22 : 54;
    for (let i = 0; i < n; i++) { const r = parts[i], z = r.z; const x = ((r.x * W + t * 5 * z + s * 30 * z) % (W + 20) + W + 20) % (W + 20) - 10, y = (r.y * H + Math.sin(t * 0.3 + r.p) * 6 * z) % H; c.fillStyle = rgba(i % 9 === 0 ? HEX.tx : tint, 0.1 + 0.32 * z); c.fillRect(x, y, 0.8 + 1.6 * z, 0.8 + 1.6 * z); }
  }

  /* ---------- registry + lazy loading of scenes and the real logic they run ---------- */
  const scenes = {}, listeners = {}, loaded = {}, loading = {};
  const J = (f) => 'assets/js/' + f;
  const FLAGDEPS = { 'flag-stream': ['lab/stream-core.js'], 'flag-lake': [], 'flag-eval': ['lab/eval-core.js'], 'flag-rag': ['lab/rag-corpus.js', 'lab/rag-core.js'], 'flag-drift': [], 'flag-ab': ['lab/stats-core.js'] };
  const DEPS = { agents: ['lab/agent-core.js', 'lab/rag-corpus.js', 'lab/rag-core.js', 'scenes/scene-ai.js'], data: ['lab/stream-core.js', 'scenes/scene-data.js'], product: ['lab/funnel-core.js', 'lab/stats-core.js', 'scenes/scene-product.js'], maref: ['lab/eval-core.js', 'scenes/scene-maref.js'] };
  Object.keys(FLAGDEPS).forEach((k) => { DEPS[k] = ['scenes/scene-kit.js'].concat(FLAGDEPS[k], ['scenes/scene-' + k + '.js']); });
  const loadScript = (f) => loaded[f] ? Promise.resolve() : loading[f] || (loading[f] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = J(f); s.onload = () => { loaded[f] = 1; res(); }; s.onerror = rej; document.head.append(s); }));
  const loadP = {}, load = (name) => loadP[name] || (loadP[name] = (DEPS[name] || []).reduce((p, f) => p.then(() => loadScript(f)), Promise.resolve()));
  const RMW = window.RMW = { H: Hh, scenes, register(name, scene) { scenes[name] = scene; (listeners[name] || []).forEach((fn) => fn()); }, loadFile: (f) => loadScript(f), onReady(name, fn) { if (scenes[name]) fn(); else (listeners[name] = listeners[name] || []).push(fn); }, load };

  /* ---------- hero + contact: the environment (agent graph, data streams, an evaluation ring) ---------- */
  const DIMS = ['TASK ACCURACY', 'GROUNDEDNESS', 'HALLUCINATION RESISTANCE', 'INSTRUCTION ADHERENCE', 'CONSISTENCY', 'TASK COMPLETION'];
  RMW.register('hero', {
    tint: HEX.ac,
    init(w) { const r = rand(9); w.state.net = Array.from({ length: 64 }, () => ({ x: r(), y: r(), p: r() * 6.28, v: 0.4 + r(), k: Math.floor(r() * 3) })); w.state.pointer = { x: 0.6, y: 0.45 }; w.state.pp = { x: 0.6, y: 0.45 }; },
    draw(c, L, t, s, st) {
      const { W, H } = L, sp = st.scrollP || 0; st.pp.x += (st.pointer.x - st.pp.x) * 0.06; st.pp.y += (st.pointer.y - st.pp.y) * 0.06;
      const cx = W * (L.mobile ? 0.5 : 0.66) + (st.pp.x - 0.5) * 26, cy = H * (L.mobile ? 0.27 : 0.52) + (st.pp.y - 0.5) * 18, R = Math.min(W * (L.mobile ? 0.34 : 0.2), H * (L.mobile ? 0.17 : 0.4)) * (1 + sp * 0.25);
      const rot = t * 0.035 + sp * 0.9, vt = (k) => { const a = -Math.PI / 2 + rot + k * TAU / 6; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.94]; };
      for (let ring = 1; ring <= 3; ring++) { c.strokeStyle = rgba(HEX.ac, 0.14 + 0.06 * ring); c.lineWidth = 1; c.beginPath(); for (let k = 0; k <= 6; k++) { const p = vt(k % 6), f = ring / 3; k ? c.lineTo(cx + (p[0] - cx) * f, cy + (p[1] - cy) * f) : c.moveTo(cx + (p[0] - cx) * f, cy + (p[1] - cy) * f); } c.stroke(); }
      const lit = (t * 0.5) % 6;
      c.beginPath(); for (let k = 0; k <= 6; k++) { const p = vt(k % 6), f = 0.5 + 0.22 * Math.sin(t * 0.45 + (k % 6) * 1.7) + 0.08 * Math.sin(t * 0.9 + k); k ? c.lineTo(cx + (p[0] - cx) * f, cy + (p[1] - cy) * f) : c.moveTo(cx + (p[0] - cx) * f, cy + (p[1] - cy) * f); } c.closePath(); c.fillStyle = rgba(HEX.ac, 0.08); c.fill(); c.strokeStyle = rgba(HEX.ac2, 0.55); c.lineWidth = 1.5; c.stroke();
      for (let k = 0; k < 6; k++) {
        const p = vt(k), d = Math.min(Math.abs(lit - k), 6 - Math.abs(lit - k)), g = clamp(1 - d / 1.2);
        line(c, cx, cy, p[0], p[1], HEX.ac, 1, 0.2 + 0.4 * g); glow(c, p[0], p[1], 14 + 22 * g, HEX.ac, 0.1 + 0.35 * g);
        c.fillStyle = g > 0.3 ? HEX.ac2 : '#05070a'; c.strokeStyle = rgba(HEX.ac2, 0.7); c.beginPath(); c.arc(p[0], p[1], 3.5 + 2.5 * g, 0, TAU); c.fill(); c.stroke();
        if (!L.mobile) text(c, DIMS[k], p[0] + (p[0] > cx ? 16 : -16), p[1] + 4, { size: 11, align: p[0] > cx ? 'left' : 'right', col: rgba(HEX.tx, 0.55 + 0.45 * g), ls: 1.3, w: 600 });
      }
      const pts = st.net.map((q) => [q.x * W + Math.sin(t * 0.3 * q.v + q.p) * 16 + (st.pp.x - 0.5) * 22 * q.v, q.y * H + Math.cos(t * 0.25 * q.v + q.p) * 12 + (st.pp.y - 0.5) * 14 * q.v - sp * 60 * q.v]);
      c.lineWidth = 0.8; const lim = (W * 0.12) ** 2;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = dx * dx + dy * dy; if (d < lim) { c.strokeStyle = rgba(HEX.ac, 0.2 * (1 - d / lim)); c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); c.stroke(); } }
      pts.forEach((p, i) => { const q = st.net[i]; c.fillStyle = q.k === 0 ? '#eafff7' : q.k === 1 ? rgba(HEX.blue, 0.85) : rgba(HEX.ac2, 0.75); c.beginPath(); c.arc(p[0], p[1], q.k === 0 ? 2.2 : 1.3, 0, TAU); c.fill(); });
      const sx0 = L.mobile ? 0 : W * 0.5, sw = L.mobile ? W : W * 0.5;
      for (let i = 0; i < 6; i++) { const y = H * ((L.mobile ? 0.62 : 0.09) + i * (L.mobile ? 0.03 : 0.04)), sp2 = 40 + i * 14; line(c, sx0, y, sx0 + sw, y, HEX.blue, 1, 0.08); for (let k = 0; k < 4; k++) { const x = sx0 + ((t * sp2 + k * sw * 0.3 + i * 90) % sw); c.fillStyle = rgba(i % 3 ? HEX.ac2 : HEX.blue, 0.75); c.fillRect(x, y - 1, 10 + i * 2, 2); } }
    },
  });
  RMW.register('contact', {
    tint: HEX.ac,
    init() { },
    draw(c, L, t) {
      const { W, H } = L, cx = W * (L.mobile ? 0.5 : 0.66), cy = H * (L.mobile ? 0.64 : 0.5), R = Math.min(W * 0.34, H * 0.46);
      for (let k = 0; k < 3; k++) { c.strokeStyle = rgba(HEX.ac, 0.08 + 0.03 * k); c.lineWidth = 1; c.beginPath(); c.ellipse(cx, cy, R * (0.8 + k * 0.38), R * (0.45 + k * 0.2), t * 0.03 * (k % 2 ? -1 : 1), 0, TAU); c.stroke(); }
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * TAU / 6 + t * 0.02, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.6; line(c, cx, cy, x, y, HEX.violet, 1, 0.18); glow(c, x, y, 18, HEX.violet, 0.3); c.fillStyle = HEX.ac2; c.fillRect(x - 2, y - 2, 4, 4); }
      for (let i = 0; i < 6; i++) { const y = H * (0.14 + i * 0.12), x = ((t * (50 + i * 12) + i * 200) % W); c.fillStyle = rgba(HEX.blue, 0.65); c.fillRect(x, y, 14, 2); line(c, 0, y + 1, W, y + 1, HEX.blue, 1, 0.06); }
    },
  });

  /* ---------- world controller ---------- */
  const worlds = [];
  let STEPS = {};
  class World {
    constructor(el, cfg) {
      this.el = el; this.id = el.dataset.world; this.name = el.dataset.scene || this.id; this.cfg = cfg; this.N = cfg ? cfg.steps.length : 1; this.scene = null;
      this.canvas = el.querySelector('.world-canvas'); this.ctx = this.canvas.getContext('2d');
      this.s = 0; this.target = 0; this.t = 0; this.visible = false; this.state = { scrollP: 0 }; this.manual = null; this.curStep = -1; this.L = null; this.cam = { x: 0, y: 0, z: 1 };
      const r = rand(11 + this.id.length); this.parts = Array.from({ length: 64 }, () => ({ x: r(), y: r(), z: 0.2 + r() * 0.8, p: r() * 6.28 }));
      this.cap = el.querySelector('.world-cap'); this.nav = [...el.querySelectorAll('.world-nav [data-step]')];
      this.ready = new Promise((res) => { this.activate = () => load(this.name).then(() => RMW.onReady(this.name, () => { this.scene = scenes[this.name]; this.scene.init(this); if (STATIC() && this.scene.still != null) { this.s = this.target = this.scene.still; this.t = this.scene.stillT || 8; this.setStep(clamp(Math.round(this.s), 0, this.N - 1), true); } this.resize(); this.once(); res(); })); });
      this.resize(); this.bindUI(); this.setStep(0, true);
      new ResizeObserver(() => { this.resize(); this.once(); }).observe(el); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.resize(); this.once(); });
    }
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, lowPower() ? 1.5 : 2); this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rW = r.width, rH = r.height, mobile = rW < 900, k = mobile ? clamp(rW / 390, 1, 1.45) : clamp(rW / 1440, 0.9, 1.4), W = rW / k, h = rH / k;
      if (this.cap && this.cfg && this.cap.offsetParent) { const l = this.cap.querySelector('.cap-label'), tx = this.cap.querySelector('.cap-text'), keep = [l.textContent, tx.textContent]; let mh = 0; this.cap.style.minHeight = ''; this.cfg.steps.forEach((st2) => { l.textContent = st2[0]; tx.textContent = st2[1]; mh = Math.max(mh, this.cap.offsetHeight); }); l.textContent = keep[0]; tx.textContent = keep[1]; this.cap.style.minHeight = mh + 'px'; }
      const q = (sel) => { const e = this.el.querySelector(sel); if (!e || !e.offsetParent) return null; const b = e.getBoundingClientRect(); return { x: (b.left - r.left) / k, y: (b.top - r.top) / k, r: (b.right - r.left) / k, b: (b.bottom - r.top) / k }; };
      const top = q('.world-top'), cap = q('.world-cap'), nav = q('.world-nav');
      const by = top ? top.b + (mobile ? 12 : 16) : h * 0.16, bb = cap ? cap.y - (mobile ? 12 : 34) : h * 0.8;
      const box = { x: W * (mobile ? 0.04 : 0.045), y: by, w: W * (mobile ? 0.92 : 0.91), h: Math.max(160, bb - by) };
      this.k = k; this.dpr = dpr; this.L = { W, H: h, rW, rH, k, mobile, low: lowPower(), box, band: { y0: box.y, y1: box.y + box.h }, top, cap, nav, av: { x: W, y: h, w: 0, h: 0, cx: W } };
    }
    bindUI() {
      this.nav.forEach((b) => b.addEventListener('click', () => this.goto(+b.dataset.step)));
      this.el.addEventListener('keydown', (e) => { if (!e.target.closest('.world-nav')) return; const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (k) { e.preventDefault(); const n = clamp(this.curStep + k, 0, this.N - 1); this.goto(n); this.nav[n].focus(); } });
      if (this.name === 'hero') addEventListener('pointermove', (e) => { this.state.pointer = { x: e.clientX / innerWidth, y: e.clientY / innerHeight }; }, { passive: true });
    }
    goto(i) {
      if (STATIC() || !this.el.classList.contains('is-pinned')) { this.setStep(i, false); this.target = i; this.s = i; this.once(); return; }
      const top = this.el.getBoundingClientRect().top + scrollY, span = this.el.offsetHeight - innerHeight;
      window.scrollTo({ top: top + span * ((i + 0.5) / this.N), behavior: 'smooth' });
    }
    setStep(i, force) {
      if (i === this.curStep && !force) return; this.curStep = i;
      if (!this.cfg) return; const step = this.cfg.steps[i];
      this.nav.forEach((b) => { const on = +b.dataset.step === i; b.setAttribute('aria-current', on ? 'step' : 'false'); b.classList.toggle('on', on); b.classList.toggle('past', +b.dataset.step < i); });
      if (this.cap) { this.cap.classList.remove('in'); void this.cap.offsetWidth; const n = this.cap.querySelector('.cap-n'); if (n) n.textContent = `${String(i + 1).padStart(2, '0')} / ${String(this.N).padStart(2, '0')}`; this.cap.querySelector('.cap-label').textContent = step[0]; this.cap.querySelector('.cap-text').textContent = step[1]; this.cap.classList.add('in'); }
      this.el.dataset.step = i;
    }
    progress() { if (!this.el.classList.contains('is-pinned')) return this.target; const r = this.el.getBoundingClientRect(), span = this.el.offsetHeight - innerHeight; return clamp(clamp(-r.top / span) * this.N - 0.5, 0, this.N - 1); }
    frame(dt) {
      if (!this.L) return;
      if (this.manual === null) {
        this.target = this.el.classList.contains('is-pinned') ? this.progress() : this.target; this.s += (this.target - this.s) * Math.min(1, dt * 7); this.t += dt;
        const r = this.el.getBoundingClientRect(); this.state.scrollP = clamp(-r.top / Math.max(1, r.height));
      }
      if (this.cfg) this.setStep(clamp(Math.round(this.s), 0, this.N - 1), false);
      this.draw(dt);
    }
    draw(dt) {
      const c = this.ctx, L = this.L, sc = this.scene, tint = sc ? sc.tint : HEX.ac;
      SC.dpr = this.dpr; if (window.__txt) window.__txt.length = 0; c.save(); backdrop(c, { W: L.rW, H: L.rH, low: L.low }, this.t, this.s, tint, this.parts); c.scale(L.k, L.k);
      if (sc) {
        if (sc.advance && dt) sc.advance(this, Math.min(dt, 0.1));
        const cm = this.state.cam; if (cm) { this.cam.x += (cm.x - this.cam.x) * 0.08; this.cam.y += (cm.y - this.cam.y) * 0.08; this.cam.z += (cm.z - this.cam.z) * 0.08; c.translate(this.cam.x, this.cam.y); c.scale(this.cam.z, this.cam.z); c.translate(-this.cam.x, -this.cam.y); }
        sc.draw(c, L, this.t, this.s, this.state);
      }
      c.restore();
    }
    once() { if (!this.L) return; if (this.scene && this.scene.prime && !this.state.primed) { this.scene.prime(this); this.state.primed = true; } this.draw(0); }
    renderAt(t, s) { this.manual = t; this.t = t; this.s = s; this.setStep(clamp(Math.round(s), 0, this.N - 1), false); this.resize(); this.once(); }
  }

  /* ---------- master loop: only visible scenes tick ---------- */
  let last = 0, raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016), gap = lowPower() ? 1 / 30 : 0; if (gap && now - last < gap * 1000) return; last = now;
    worlds.forEach((w) => { if (w.visible) w.frame(dt); });
  }
  function start() {
    const vis = new IntersectionObserver((es) => es.forEach((e) => { const w = worlds.find((x) => x.el === e.target); if (w) { w.visible = e.isIntersecting; if (e.isIntersecting && STATIC()) w.once(); } }), { rootMargin: '10% 0px' });
    const near = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const w = worlds.find((x) => x.el === e.target); if (w && !w.requested) { w.requested = true; w.activate(); } near.unobserve(e.target); } }), { rootMargin: capture ? '100000px' : '1800px 0px' });
    worlds.forEach((w) => { vis.observe(w.el); near.observe(w.el); });
    if (!STATIC()) raf = requestAnimationFrame(loop);
    reduceMQ.addEventListener('change', () => location.reload());
  }
  function init() {
    STEPS = JSON.parse((document.getElementById('rm-worlds') || { textContent: '{}' }).textContent);
    document.querySelectorAll('[data-world]').forEach((el) => {
      const id = el.dataset.world, cfg = STEPS[el.dataset.steps || id] || null; if (cfg && !STATIC()) el.classList.add('is-pinned');
      el.classList.add('js-world'); el.style.setProperty('--n', cfg ? cfg.steps.length : 1);
      worlds.push(new World(el, cfg));
    });
    window.__rm = { worlds, RMW, backdrop, rand, HEX, load, params, capture, loadAll: () => Promise.all(Object.keys(DEPS).map(load)) };
    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
