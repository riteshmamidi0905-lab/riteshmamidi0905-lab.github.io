/* scene-runtime.js — "AI Agent Runtime — From First Principles to Production". Four steps on the existing scene engine:
   0 first principles (the nine ideas, in the order they were built) · 1 production architecture (Client → FastAPI → Run service →
   Agent runtime → PostgreSQL, with the resumable SSE return path) · 2 reliability & security (the gates a tool call passes) ·
   3 verified evidence (numbers copied from the pinned commit in content/agent-runtime.json).
   Everything drawn here is DESIGN taken from the repository's code and docs. The moving packets are illustrative, not telemetry. */
(() => {
  'use strict';
  const { H, scenes } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line, rrect, curve } = H;
  const fit = (c, s, w, font) => { c.font = font; if (c.measureText(s).width <= w) return s; while (s.length > 4 && c.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };
  const W_ = (s, i) => clamp(1 - Math.abs(s - i) * 1.6);          // weight of step i around scroll position s
  const D = () => window.RMW.cfg('runtime-data');

  scenes.runtime = {
    tint: HEX.ac, still: 1,
    init() { },
    draw(c, L, t, s, st) {
      const B = L.box, mob = L.mobile, d = D(); st.cam = { x: B.x + B.w / 2, y: B.y + B.h / 2, z: 1 };
      [ladder, arch, gates, evidence].forEach((fn, i) => { const a = W_(s, i); if (a > 0.02) { c.save(); c.globalAlpha = a; fn(c, B, mob, t, s, d); c.restore(); } });
    },
  };

  /* 0 · nine ideas, built in order. The highlight sweeps the ladder to show the order of construction. */
  function ladder(c, B, mob, t, s, d) {
    const n = d.ladder.length, hot = Math.floor((t * 0.8) % n);
    if (mob) {
      const rh = (B.h - 6) / n;
      d.ladder.forEach((r, i) => {
        const y = B.y + 4 + i * rh, on = i === hot, a = on ? 1 : 0.55;
        line(c, B.x + 14, y + rh * 0.5, B.x + 14, y + rh * 1.5, HEX.ac, 1.2, 0.3);
        glow(c, B.x + 14, y + rh * 0.5, on ? 22 : 10, HEX.ac, on ? 0.45 : 0.1);
        c.fillStyle = '#05070a'; c.strokeStyle = rgba(on ? HEX.ac2 : HEX.tx, on ? 1 : 0.4); c.lineWidth = on ? 2.4 : 1.4; c.beginPath(); c.arc(B.x + 14, y + rh * 0.5, 9, 0, TAU); c.fill(); c.stroke();
        text(c, String(i + 1), B.x + 14, y + rh * 0.5 + 4, { size: 10.5, w: 700, align: 'center', col: on ? HEX.ac2 : HEX.dim });
        text(c, r[0], B.x + 36, y + rh * 0.5 + 1, { size: 15, w: 700, col: rgba(HEX.tx, a) });
        text(c, r[1], B.x + 36, y + rh * 0.5 + 16, { size: 11, col: rgba(HEX.mut, a) });
      });
      return;
    }
    const sx = B.x + 8, sw = B.w - 16, colW = sw / n, top = B.y + 20, bot = B.y + B.h - 70;
    const pos = d.ladder.map((_, i) => [sx + colW * (i + 0.5), lerp(bot, top + 70, i / (n - 1))]);
    for (let i = 0; i < n - 1; i++) { line(c, pos[i][0], pos[i][1], pos[i + 1][0], pos[i + 1][1], HEX.ac, 1.6, 0.35, [4, 6]); }
    c.fillStyle = rgba(HEX.ac, 0.05); c.beginPath(); c.moveTo(pos[0][0], bot + 30); pos.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(pos[n - 1][0], bot + 30); c.closePath(); c.fill();
    d.ladder.forEach((r, i) => {
      const [x, y] = pos[i], on = i === hot, done = i <= hot, a = on ? 1 : done ? 0.85 : 0.5;
      glow(c, x, y, on ? 46 : 22, HEX.ac, on ? 0.5 : 0.1);
      c.fillStyle = '#05070a'; c.strokeStyle = rgba(on ? HEX.ac2 : done ? HEX.ac : HEX.tx, on ? 1 : 0.55); c.lineWidth = on ? 3 : 1.8; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill(); c.stroke();
      text(c, String(i + 1), x, y + 5, { size: 14, w: 700, align: 'center', col: on ? HEX.ac2 : HEX.mut });
      const words = r[0].split(' '), l1 = words.length > 2 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : r[0].length > 12 && words.length > 1 ? words[0] : r[0], l2 = l1 === r[0] ? '' : r[0].slice(l1.length).trim();
      const ly = y - 34 - (l2 ? 18 : 0);
      text(c, l1, x, ly, { size: 15, w: 700, align: 'center', col: rgba(HEX.tx, a) }); if (l2) text(c, l2, x, ly + 18, { size: 15, w: 700, align: 'center', col: rgba(HEX.tx, a) });
      const files = r[1].split(' · '); files.forEach((f, k) => text(c, f, x, y + 36 + k * 15, { size: 12, align: 'center', col: rgba(HEX.mut, a) }));
    });
    text(c, 'nine ideas · built in this order · one module each · standard library only', B.x + 8, B.y + B.h - 8, { size: 12, w: 600, ls: 1.2, col: HEX.dim });
  }

  /* 1 · Client → FastAPI → Run service → Agent runtime → PostgreSQL, events returning over SSE */
  function arch(c, B, mob, t, s, d) {
    const n = d.arch.length, hl = Math.floor((t * 0.7) % n), sse = rgba(HEX.blue, 0.95);
    if (mob) {
      const bw = B.w * 0.7, bx = B.x + 4, bh = (B.h - 14) / n - 14, ys = d.arch.map((_, i) => B.y + 4 + i * (bh + 14));
      d.arch.forEach((r, i) => {
        const on = i === hl; c.strokeStyle = rgba(on ? HEX.ac2 : HEX.tx, on ? 0.95 : 0.35); c.lineWidth = on ? 2.2 : 1.3; rrect(c, bx, ys[i], bw, bh, 8); c.stroke(); c.fillStyle = rgba(HEX.ac, on ? 0.1 : 0.03); c.fill();
        text(c, r[0], bx + 12, ys[i] + 19, { size: 14, w: 700, col: HEX.tx }); text(c, fit(c, r[1], bw - 24, '500 10.5px ' + H.FONT), bx + 12, ys[i] + 34, { size: 10.5, col: HEX.ac2 }); text(c, fit(c, r[2], bw - 24, '500 10.5px ' + H.FONT), bx + 12, ys[i] + 48, { size: 10.5, col: HEX.mut });
        if (i < n - 1) { line(c, bx + bw / 2, ys[i] + bh, bx + bw / 2, ys[i + 1], HEX.ac, 1.6, 0.7); const k = (t * 0.6 + i * 0.3) % 1; c.fillStyle = HEX.ac2; c.fillRect(bx + bw / 2 - 2, lerp(ys[i] + bh, ys[i + 1], k) - 2, 4, 4); }
      });
      const rx = bx + bw + 18; curve(c, [rx - 12, ys[4] + bh / 2], [rx + 22, ys[4] + bh / 2], [rx + 22, ys[0] + bh / 2], [rx - 12, ys[0] + bh / 2], HEX.blue, 1.8, 0.85, [5, 5], -t * 14);
      text(c, 'SSE', rx + 4, B.y + B.h / 2 - 16, { size: 12, w: 700, ls: 1.5, col: sse }); text(c, 'events', rx + 4, B.y + B.h / 2 + 2, { size: 11, col: HEX.mut }); text(c, 'stream', rx + 4, B.y + B.h / 2 + 16, { size: 11, col: HEX.mut }); text(c, 'resumable', rx + 4, B.y + B.h / 2 + 30, { size: 11, col: HEX.mut });
      return;
    }
    const gap = 46, bw = (B.w - gap * (n - 1)) / n, bh = Math.min(200, B.h * 0.44), by = B.y + 16, xs = d.arch.map((_, i) => B.x + i * (bw + gap));
    d.arch.forEach((r, i) => {
      const on = i === hl; glow(c, xs[i] + bw / 2, by + bh / 2, bw * 0.7, HEX.ac, on ? 0.12 : 0.03);
      c.strokeStyle = rgba(on ? HEX.ac2 : HEX.tx, on ? 0.95 : 0.35); c.lineWidth = on ? 2.4 : 1.4; rrect(c, xs[i], by, bw, bh, 10); c.stroke(); c.fillStyle = rgba(HEX.ac, on ? 0.09 : 0.03); c.fill();
      text(c, r[0], xs[i] + 16, by + 38, { size: 22, w: 700, col: HEX.tx }); text(c, fit(c, r[1], bw - 28, '500 13px ' + H.FONT), xs[i] + 16, by + 66, { size: 12.5, col: HEX.ac2 });
      const w = r[2].split(' · '); w.forEach((ln, k) => text(c, fit(c, ln, bw - 28, '500 12.5px ' + H.FONT), xs[i] + 16, by + 96 + k * 20, { size: 13, col: HEX.mut }));
      if (i < n - 1) { const y = by + bh / 2; line(c, xs[i] + bw, y, xs[i + 1], y, HEX.ac, 1.8, 0.75); c.fillStyle = HEX.ac2; c.beginPath(); c.moveTo(xs[i + 1], y); c.lineTo(xs[i + 1] - 9, y - 5); c.lineTo(xs[i + 1] - 9, y + 5); c.fill(); for (let k = 0; k < 2; k++) { const u = (t * 0.55 + k * 0.5 + i * 0.17) % 1; c.fillStyle = rgba(HEX.ac2, 0.95); c.fillRect(lerp(xs[i] + bw, xs[i + 1], u) - 2, y - 2, 4, 4); } }
    });
    // return path: events travel from the database back to the client over SSE
    const yb = by + bh + 70, x0 = xs[4] + bw / 2, x1 = xs[0] + bw / 2;
    curve(c, [x0, by + bh], [x0, yb + 30], [x1, yb + 30], [x1, by + bh], HEX.blue, 2.2, 0.9, [6, 6], -t * 16);
    for (let k = 0; k < 4; k++) { const u = ((t * 0.32 + k / 4) % 1), bz = (p0, p1, p2, p3, q) => { const r = 1 - q; return r * r * r * p0 + 3 * r * r * q * p1 + 3 * r * q * q * p2 + q * q * q * p3; }; const px = bz(x0, x0, x1, x1, u), py = bz(by + bh, yb + 30, yb + 30, by + bh, u); c.fillStyle = HEX.blue; c.fillRect(px - 2.5, py - 2.5, 5, 5); }
    text(c, 'SERVER-SENT EVENTS', (x0 + x1) / 2, yb + 52, { size: 13, w: 700, ls: 2, align: 'center', col: sse }); text(c, d.sse, (x0 + x1) / 2, yb + 74, { size: 13.5, align: 'center', col: HEX.mut });
    text(c, 'model_request · tool_requested · approval_required · tool_completed · retry · evaluation · run_completed', (x0 + x1) / 2, yb + 98, { size: 12, align: 'center', col: HEX.dim });
  }

  /* 2 · the gates a tool call passes. One call passes; a write without approval is stopped at the approval gate (illustrative loop). */
  function gates(c, B, mob, t, s, d) {
    const n = d.gates.length, cyc = (t * 0.22) % 2, lane = Math.floor(cyc), u = cyc - lane, stopAt = 2;      // lane 0 passes, lane 1 stops at gate 3
    if (mob) {
      const x = B.x + 22, rh = (B.h - 130) / n, y0 = B.y + 22, y = (i) => y0 + i * rh;
      line(c, x, y0, x, y(n - 1), HEX.tx, 1.4, 0.2);
      d.gates.forEach((g, i) => { const stopped = lane === 1 && i === stopAt; c.fillStyle = '#05070a'; c.strokeStyle = rgba(stopped ? HEX.red : HEX.ac2, stopped ? 1 : 0.7); c.lineWidth = 1.8; rrect(c, x - 10, y(i) - 10, 20, 20, 5); c.fill(); c.stroke(); text(c, String(i + 1), x, y(i) + 4, { size: 10.5, w: 700, align: 'center', col: stopped ? HEX.red : HEX.ac2 }); text(c, g, x + 22, y(i) + 5, { size: 14, w: 700, col: HEX.tx }); });
      const prog = clamp(u * 1.25) * (n - 1), pr = lane === 1 ? Math.min(prog, stopAt) : prog; c.fillStyle = lane === 1 && pr >= stopAt ? HEX.red : HEX.ac2; glow(c, x, y(0) + (y(n - 1) - y(0)) * pr / (n - 1), 14, lane === 1 ? HEX.red : HEX.ac, 0.6); c.beginPath(); c.arc(x, y0 + (y(n - 1) - y0) * pr / (n - 1), 5, 0, TAU); c.fill();
      text(c, lane === 0 ? 'read-only call → runs' : 'write without approval → denied', B.x + 6, B.y + B.h - 96, { size: 12, w: 700, col: lane === 0 ? HEX.ac2 : HEX.red });
      d.guards.slice(0, 6).forEach((g, k) => text(c, fit(c, '· ' + g, B.w / 2 - 10, '500 11px ' + H.FONT), B.x + 6 + (k % 2) * (B.w / 2), B.y + B.h - 72 + Math.floor(k / 2) * 18, { size: 11, col: HEX.mut }));
      return;
    }
    const gap = 18, gw = (B.w - gap * (n - 1)) / n, gy = B.y + 70, gh = 124, xs = d.gates.map((_, i) => B.x + i * (gw + gap));
    text(c, 'MODEL PROPOSES A TOOL CALL', B.x, B.y + 16, { size: 12, w: 700, ls: 1.6, col: HEX.dim }); text(c, 'RUNTIME DECIDES · every call passes these, in order', B.x + B.w, B.y + 16, { size: 12, w: 700, ls: 1.6, align: 'right', col: HEX.dim });
    line(c, B.x, gy + gh / 2, B.x + B.w, gy + gh / 2, HEX.tx, 1.4, 0.18);
    d.gates.forEach((g, i) => {
      const stopped = lane === 1 && i === stopAt && u > 0.3;
      c.strokeStyle = rgba(stopped ? HEX.red : HEX.ac2, stopped ? 1 : 0.6); c.lineWidth = stopped ? 2.6 : 1.6; rrect(c, xs[i], gy, gw, gh, 9); c.stroke(); c.fillStyle = rgba(stopped ? HEX.red : HEX.ac, stopped ? 0.12 : 0.04); c.fill();
      text(c, String(i + 1).padStart(2, '0'), xs[i] + 12, gy + 24, { size: 12, w: 700, col: stopped ? HEX.red : HEX.ac2 });
      const words = g.split(' '); const l1 = words.length > 1 ? words[0] : g, l2 = words.length > 1 ? words.slice(1).join(' ') : ''; text(c, l1, xs[i] + 12, gy + 56, { size: 17, w: 700, col: HEX.tx }); if (l2) text(c, l2, xs[i] + 12, gy + 78, { size: 17, w: 700, col: HEX.tx });
    });
    const prog = clamp(u * 1.2) * n, pr = lane === 1 ? Math.min(prog, stopAt + 0.35) : prog, px = B.x + (B.w) * pr / n;
    const col = lane === 1 && pr >= stopAt + 0.3 ? HEX.red : HEX.ac2; glow(c, px, gy + gh / 2, 26, col, 0.6); c.fillStyle = col; c.beginPath(); c.arc(px, gy + gh / 2, 6.5, 0, TAU); c.fill();
    if (lane === 1 && pr >= stopAt + 0.3) { c.strokeStyle = HEX.red; c.lineWidth = 3; c.beginPath(); c.moveTo(px - 11, gy + gh / 2 - 11); c.lineTo(px + 11, gy + gh / 2 + 11); c.moveTo(px + 11, gy + gh / 2 - 11); c.lineTo(px - 11, gy + gh / 2 + 11); c.stroke(); }
    text(c, lane === 0 ? 'read-only call → every gate passes → tool runs → result returns as untrusted, redacted data' : 'write_file with no human approval → stopped at gate 3 → denied, run continues', B.x, gy + gh + 34, { size: 15, w: 700, col: lane === 0 ? HEX.ac2 : HEX.red });
    text(c, 'illustrative animation of the policy path in agent/loop.py and agent/security.py', B.x, gy + gh + 54, { size: 11.5, col: HEX.dim });
    const gy2 = gy + gh + 118; text(c, 'ALSO ENFORCED PER RUN', B.x, gy2, { size: 12, w: 700, ls: 1.6, col: HEX.dim });
    d.guards.forEach((g, k) => { const col2 = k % 3, row = Math.floor(k / 3); const x = B.x + col2 * (B.w / 3), y = gy2 + 38 + row * 46; c.fillStyle = HEX.ac2; c.fillRect(x, y - 10, 9, 9); text(c, g, x + 20, y, { size: 18, w: 600, col: HEX.tx }); });
  }

  /* 3 · verified evidence: numbers come from content/agent-runtime.json (pinned commit), plus the mandatory qualification */
  function evidence(c, B, mob, t, s, d) {
    const k = ease(clamp((s - 2.55) / 0.6)), n = d.stats.length;
    if (mob) {
      const rh = (B.h - 76) / n;
      d.stats.forEach((r, i) => {
        const y = B.y + 4 + i * rh, a = clamp(k * 1.6 - i * 0.07), save = c.globalAlpha; c.globalAlpha = save * (0.25 + 0.75 * a);
        line(c, B.x, y, B.x + B.w, y, HEX.ac, 1, 0.3);
        text(c, r[0], B.x, y + rh * 0.62, { size: r[0].length > 8 ? 17 : 23, w: 700, col: HEX.ac2 });
        wrap(c, r[1], B.x + B.w * 0.43, y + rh * 0.42, B.w * 0.55, 14, { size: 12.5, w: 700, sans: true, col: HEX.tx });
        c.globalAlpha = save;
      });
      wrap(c, d.qualifier, B.x, B.y + B.h - 52, B.w, 15, { size: 12, w: 700, col: HEX.amber });
      text(c, `source: public repository · commit ${d.sha}`, B.x, B.y + B.h - 8, { size: 10.5, col: HEX.dim });
      return;
    }
    const cols = 4, rows = Math.ceil(n / cols), cw = (B.w - 6) / cols, ch = Math.min(170, (B.h - 120) / rows);
    d.stats.forEach((r, i) => {
      const x = B.x + (i % cols) * cw, y = B.y + 8 + Math.floor(i / cols) * ch, a = clamp(k * 1.6 - i * 0.07), save = c.globalAlpha; c.globalAlpha = save * (0.25 + 0.75 * a);
      line(c, x, y, x + cw - 18, y, HEX.ac, 1.4, 0.5);
      const big = r[0], fs = big.length > 10 ? 30 : big.length > 7 ? 38 : 56;
      text(c, big, x, y + 70, { size: fs, w: 700, col: HEX.ac2 });
      const nl = wrap(c, r[1], x, y + 98, cw - 24, 19, { size: 15.5, w: 700, col: HEX.tx });
      text(c, fit(c, r[2], cw - 24, '500 12.5px ' + H.FONT), x, y + 98 + nl * 19 + 4, { size: 12.5, col: HEX.mut });
      c.globalAlpha = save;
    });
    const qy = B.y + B.h - 44;
    wrap(c, d.qualifier, B.x, qy, B.w * 0.9, 20, { size: 15, w: 700, col: HEX.amber });
    text(c, `source: public repository · commit ${d.sha}`, B.x, qy + 28, { size: 12, col: HEX.dim });
  }
  window.RMW.register('runtime', scenes.runtime);
})();
