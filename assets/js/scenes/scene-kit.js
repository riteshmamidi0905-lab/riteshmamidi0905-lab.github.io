/* scene-kit.js — shared pieces for the six flagship scenes: the stage rail (the project's real architecture stages), the honesty
   tag, and a few maths helpers. Each flagship then draws its own picture under the rail; they share a language, not a layout. */
(() => {
  'use strict';
  const { H } = window.RMW; const { TAU, clamp, lerp, HEX, rgba, glow, text, line } = H;
  const fit = (c, s, w, font) => { c.font = font; if (c.measureText(s).width <= w) return s; while (s.length > 4 && c.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };

  /* the architecture rail: stage nodes joined by a lane, a packet travelling to the active stage. Returns the region below it. */
  const cur = { mob: false, x: 0, w: 1000 };
  function rail(c, L, labels, s, tint) {
    const B = L.box, mob = L.mobile, N = labels.length, y = B.y + 8, x0 = B.x + 8, x1 = B.x + B.w - 8, xs = labels.map((_, i) => lerp(x0, x1, N === 1 ? 0 : i / (N - 1)));
    cur.mob = mob; cur.x = B.x; cur.w = B.w;
    line(c, x0, y, x1, y, HEX.tx, 1.2, 0.18);
    const hx = lerp(x0, x1, clamp(s / (N - 1))); c.strokeStyle = rgba(tint, 0.95); c.lineWidth = 2.6; c.beginPath(); c.moveTo(x0, y); c.lineTo(hx, y); c.stroke();
    glow(c, hx, y, 22, tint, 0.5); c.fillStyle = '#fff'; c.fillRect(hx - 2, y - 2, 4, 4);
    labels.forEach((lb, i) => {
      const act = clamp(1 - Math.abs(s - i)), x = xs[i]; c.fillStyle = '#05070a'; c.strokeStyle = rgba(act > 0.5 ? tint : HEX.tx, act > 0.5 ? 1 : 0.4); c.lineWidth = 1.5 + act * 1.5; c.beginPath(); c.arc(x, y, 5.5 + act * 3, 0, TAU); c.fill(); c.stroke();
      if (!mob) text(c, fit(c, lb.toUpperCase(), (x1 - x0) / N - 10, '700 12px ' + H.FONT), x, y + 26, { size: 12, w: 700, ls: 1.3, align: i === 0 ? 'left' : i === N - 1 ? 'right' : 'center', col: rgba(HEX.tx, 0.34 + 0.66 * act) });
    });
    if (mob) text(c, labels[clamp(Math.round(s), 0, N - 1)].toUpperCase(), B.x + 8, y + 26, { size: 12, w: 700, ls: 1.4, col: HEX.tx });
    const top = mob ? 44 : 56; return { x: B.x, y: B.y + top, w: B.w, h: B.h - top };
  }
  const tag = (c, L, long, short) => L.mobile ? text(c, short || long, L.box.x, L.box.y + L.box.h + 1, { size: 8.5, w: 700, ls: 0.6, col: rgba(HEX.mut, 0.95) }) : text(c, long, L.box.x + L.box.w, L.box.y + L.box.h + 22, { size: 10.5, w: 700, ls: 1.3, align: 'right', col: rgba(HEX.mut, 0.95) });
  const D = (s, i, k) => clamp(1 - Math.abs(s - i) * (k || 1.5));        // weight of stage i around scroll position s
  const label = (c, str, x, y, col) => { const sz = cur.mob ? 9.5 : 11.5, ls = cur.mob ? 0.6 : 1.5, maxW = Math.max(80, cur.x + cur.w - x); c.font = '700 ' + sz + 'px ' + H.FONT; let t2 = str; while (t2.length > 6 && c.measureText(t2).width + ls * t2.length > maxW) t2 = t2.slice(0, -1); if (t2 !== str) t2 = t2.replace(/[ ·→,.:-]+$/, '') + '…'; text(c, t2, x, y, { size: sz, w: 700, ls, col: col || HEX.dim }); };
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(TAU * r());
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const cam = (st, L, z) => { st.cam = { x: L.box.x + L.box.w / 2, y: L.box.y + L.box.h / 2, z: z || 1 }; };
  /* word-wrap limited to maxLines, ellipsis on the last; returns the number of lines drawn */
  function wrapN(c, s, x, y, maxW, lh, o, maxLines) {
    o = o || {}; c.font = `${o.w || 500} ${o.size || 12}px ${o.sans ? H.SANS : H.FONT}`; const words = String(s).split(' '), lines = []; let ln = '';
    for (const w of words) { const t = ln ? ln + ' ' + w : w; if (c.measureText(t).width > maxW && ln) { lines.push(ln); ln = w; } else ln = t; } if (ln) lines.push(ln);
    if (lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (l.length > 3 && c.measureText(l + '…').width > maxW) l = l.slice(0, -1); lines[maxLines - 1] = l.replace(/[ ,.;:]+$/, '') + '…'; }
    lines.forEach((l, i) => text(c, l, x, y + i * lh, o)); return lines.length;
  }
  window.RMW.kit = { wrapN, rail, tag, D, label, gauss, hash, fit, cam };
})();
