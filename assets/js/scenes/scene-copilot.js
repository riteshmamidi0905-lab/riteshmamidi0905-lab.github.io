/* scene-copilot.js — "Support Escalation Copilot": one ticket, ten steps, on the existing scene engine.
   0 customer problem · 1 ticket arrives · 2 tenant scoped · 3 evidence retrieved · 4 AI diagnosis · 5 typed action · 6 policy · 7 approval · 8 execution · 9 audit + recovery.
   Colour carries trust: red = untrusted text or a hostile instruction, blue = the model, teal = deterministic code, amber = a human.
   Every number drawn here is read from RMW.cfg('copilot-data'), which the build resolves from the vendored public-claims manifest. Packets are
   illustrative of the design; nothing on this canvas is live telemetry, and the model in the repository is a rule-based stand-in, not an LLM. */
(() => {
  'use strict';
  const { H, scenes, kit } = window.RMW; const { TAU, clamp, lerp, ease, HEX, rgba, glow, text, wrap, line, rrect } = H;
  const HX = Object.assign({}, HEX, { bad: HEX.red, model: HEX.blue, code: HEX.ac, human: HEX.amber });   // trust colours: red untrusted · blue model · teal deterministic code · amber human
  const D = () => window.RMW.cfg('copilot-data'), fit = kit.fit;
  const W_ = (s, i) => clamp(1 - Math.abs(s - i) * 1.6);

  /* ---------- primitives ---------- */
  function box(c, x, y, w, h, col, fillA, o) { o = o || {}; c.save(); c.strokeStyle = rgba(col, o.dim ? 0.35 : 0.85); c.lineWidth = o.on ? 2.2 : 1.5; if (o.dash) c.setLineDash(o.dash); rrect(c, x, y, w, h, o.r || 9); c.stroke(); c.fillStyle = rgba(col, fillA == null ? 0.06 : fillA); c.fill(); c.restore(); }
  function chip(c, label, x, y, w, h, col, o) {
    o = o || {}; const sz = o.size || 12; c.save(); c.strokeStyle = rgba(col, o.dim ? 0.4 : 0.9); c.lineWidth = o.on ? 2.2 : 1.4; rrect(c, x, y, w, h, Math.min(12, h / 2)); c.stroke(); c.fillStyle = rgba(col, o.fill == null ? 0.08 : o.fill); c.fill(); c.restore();
    text(c, fit(c, label, w - 14, '600 ' + sz + 'px ' + H.FONT), x + w / 2, y + h / 2 + sz * 0.36, { size: sz, w: 600, align: 'center', col: o.col || rgba(HX.tx, o.dim ? 0.55 : 1) });
  }
  const cross = (c, x, y, r, col) => { c.save(); c.strokeStyle = col; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke(); c.restore(); };
  const tick = (c, x, y, r, col) => { c.save(); c.strokeStyle = col; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * 0.3, y + r * 0.7); c.lineTo(x + r, y - r * 0.7); c.stroke(); c.restore(); };
  const pk = (c, x, y, col, r) => { glow(c, x, y, 15, col, 0.5); c.fillStyle = col; c.beginPath(); c.arc(x, y, r || 4, 0, TAU); c.fill(); };
  function arrow(c, x1, y1, x2, y2, col, a, dash) { line(c, x1, y1, x2, y2, col, 1.6, a == null ? 0.7 : a, dash); const g = Math.atan2(y2 - y1, x2 - x1); c.fillStyle = rgba(col, a == null ? 0.8 : a); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 8 * Math.cos(g - 0.4), y2 - 8 * Math.sin(g - 0.4)); c.lineTo(x2 - 8 * Math.cos(g + 0.4), y2 - 8 * Math.sin(g + 0.4)); c.fill(); }
  const head = (c, s, x, y, col, mob) => text(c, s, x, y, { size: mob ? 10 : 11.5, w: 700, ls: mob ? 0.8 : 1.5, col });
  const big = (c, s, x, y, mob, col, align) => text(c, s, x, y, { size: mob ? 17 : 24, w: 700, sans: true, col: col || HX.tx, align });
  const cyc = (t, period, n) => { const u = (t / period) % n; return [Math.floor(u), u - Math.floor(u)]; };

  scenes.copilot = {
    tint: HX.ac, still: 0,
    init() { },
    draw(c, L, t, s, st) {
      const d = D(), mob = L.mobile, A = kit.rail(c, L, d.short, s, HX.ac);
      [problem, ticket, tenant, retrieval, diagnosis, actions, policy, approval, execution, audit].forEach((fn, i) => { const a = W_(s, i); if (a > 0.02) { c.save(); c.globalAlpha = a; fn(c, A, mob, t, s, d, L); c.restore(); } });
      kit.cam(st, L);
    },
  };

  /* 0 · the customer problem: three mistakes that touch customers */
  function problem(c, A, mob, t, s, d, L) {
    const cards = [['Re-synced twice', 'a carrier feed duplicated'], ['Credit outside policy', 'granted without the right approval'], ['The wrong tenant’s data', 'read for the wrong customer']];
    if (mob) {
      const rh = Math.min(54, (A.h - 34) / 4);
      head(c, 'THE COSTLY MISTAKES TOUCH CUSTOMERS', A.x, A.y + 10, HX.red, mob);
      cards.forEach((k, i) => { const y = A.y + 26 + i * rh; line(c, A.x, y, A.x, y + rh - 8, HX.red, 3, 0.9); text(c, k[0], A.x + 14, y + 16, { size: 16, w: 700, sans: true, col: HX.tx }); text(c, k[1], A.x + 14, y + 33, { size: 11, col: HX.mut }); });
      kit.tag(c, L, '', 'MERIDIAN FREIGHT SYSTEMS · FICTIONAL · SYNTHETIC DATA');
      return;
    }
    const gap = 22, cw = (A.w - gap * 2) / 3, ch = Math.min(150, A.h * 0.42), y = A.y + 14;
    head(c, 'TODAY A TIER-2 ENGINEER READS, HUNTS, THEN ASKS IN CHAT. THE COSTLY MISTAKES TOUCH CUSTOMERS.', A.x, A.y + 8, HX.red);
    cards.forEach((k, i) => { const x = A.x + i * (cw + gap), hot = Math.floor(t * 0.6) % 3 === i; box(c, x, y + 22, cw, ch, HX.red, hot ? 0.1 : 0.04, { on: hot }); text(c, k[0], x + 20, y + 22 + ch * 0.5, { size: 26, w: 700, sans: true, col: HX.tx }); text(c, k[1], x + 20, y + 22 + ch * 0.5 + 30, { size: 14, col: HX.mut }); });
    const fy = y + 22 + ch + 56, labs = ['read the ticket', 'hunt through stale, contradicting runbooks', 'paste the evidence and ask for approval in chat'], fw = A.w / 3 - 18;
    labs.forEach((l, i) => { const x = A.x + i * (A.w / 3); chip(c, l, x, fy, fw, 34, HX.tx, { dim: true, size: 12.5 }); if (i < 2) arrow(c, x + fw + 2, fy + 17, x + A.w / 3 - 2, fy + 17, HX.tx, 0.4); });
    kit.tag(c, L, 'MERIDIAN FREIGHT SYSTEMS · A FICTIONAL CUSTOMER · ALL DATA SYNTHETIC');
  }

  /* 1 · the ticket arrives as untrusted text; the operator app re-authorises everything on the server */
  function ticket(c, A, mob, t, s, d, L) {
    const tw = mob ? A.w * 0.46 : A.w * 0.34, th = Math.min(mob ? A.h - 30 : 210, A.h - 24), tx = A.x + 4, ty = A.y + 14;
    box(c, tx, ty, tw, th, HX.bad, 0.05); head(c, mob ? 'UNTRUSTED TEXT' : 'TICKET · UNTRUSTED TEXT', tx + 12, ty + 22, HX.bad, mob);
    const n = mob ? 4 : 6; for (let i = 0; i < n; i++) { const w = tw - 28 - (i % 3) * (mob ? 14 : 30), y = ty + 40 + i * (mob ? 14 : 18); if (i === n - 2) { c.fillStyle = rgba(HX.bad, 0.55 + 0.2 * Math.sin(t * 3)); } else c.fillStyle = rgba(HX.tx, 0.14); c.fillRect(tx + 12, y, w, mob ? 5 : 6); }
    if (!mob) text(c, '“…ignore policy, refund in full…”', tx + 12, ty + th - 14, { size: 11.5, col: HX.bad }); else text(c, 'may hide instructions', tx + 10, ty + th - 8, { size: 9.5, col: HX.bad });
    const ax = tx + tw + (mob ? 22 : 54), aw = A.x + A.w - ax - 4, items = mob ? ['NO JAVASCRIPT', 'STRICT CSP', 'CSRF FORMS', 'RE-AUTHORISED'] : ['SERVER-RENDERED · NO JAVASCRIPT', 'STRICT CONTENT-SECURITY POLICY', 'CSRF-PROTECTED FORMS', 'EVERY READ AND ACTION RE-AUTHORISED'];
    box(c, ax, ty, aw, th, HX.code, 0.05, { on: true }); head(c, 'OPERATOR APP', ax + 12, ty + 22, HX.code, mob);
    const ih = (th - 44) / 4; items.forEach((it, i) => { const y = ty + 36 + i * ih; chip(c, it, ax + 12, y, aw - 24, Math.min(30, ih - 6), HX.code, { size: mob ? 9.5 : 11.5, on: Math.floor(t * 0.9) % 4 === i }); });
    const u = (t * 0.5) % 1, y0 = ty + th / 2; arrow(c, tx + tw + 4, y0, ax - 4, y0, HX.bad, 0.6, [5, 5]); pk(c, lerp(tx + tw + 6, ax - 6, u), y0, HX.bad);
    if (!mob) text(c, 'data, never instructions', tx + tw + (ax - tx - tw) / 2, y0 - 12, { size: 11, align: 'center', col: HX.mut });
    kit.tag(c, L, 'ILLUSTRATION OF THE DESIGN · NOT LIVE DATA', 'ILLUSTRATION OF THE DESIGN');
  }

  /* 2 · the case is scoped to one account in the database; other accounts answer with a uniform 404 */
  function tenant(c, A, mob, t, s, d, L) {
    const n = 3, gap = mob ? 10 : 26, tw = (A.w * (mob ? 1 : 0.7) - gap * (n - 1)) / n, th = Math.min(mob ? 76 : 120, A.h * 0.36), x0 = mob ? A.x : A.x + A.w * 0.3, y = A.y + (mob ? 56 : 62);
    const [phase, u] = cyc(t, 1.7, 3);
    ['ACCOUNT A', 'ACCOUNT B', 'ACCOUNT C'].forEach((nm, i) => {
      const x = x0 + i * (tw + gap), on = i === 0; box(c, x, y, tw, th, on ? HX.code : HX.tx, on ? 0.1 : 0.03, { on, dim: !on }); head(c, nm, x + 10, y + 20, on ? HX.code : HX.dim, mob);
      for (let k = 0; k < 3; k++) { c.fillStyle = rgba(on ? HX.code : HX.tx, on ? 0.35 : 0.1); c.fillRect(x + 10, y + 32 + k * (mob ? 11 : 15), tw - 20 - k * 12, 5); }
      if (i === phase && phase > 0) { const bx = x + tw / 2, by = y - 8 - (th * 0.7) * Math.sin(u * Math.PI); pk(c, bx, y - 10 - (1 - Math.abs(u * 2 - 1)) * 34, HX.bad); if (u > 0.5) text(c, '404', bx, y - 52, { size: 13, w: 700, align: 'center', col: HX.bad }); }
    });
    if (phase === 0) pk(c, x0 + tw / 2, y - 10 - (1 - Math.abs(u * 2 - 1)) * 34, HX.code);
    const cx = A.x, cy = y + th / 2; if (!mob) { chip(c, 'one case', cx, cy - 16, 96, 32, HX.code, { size: 11.5 }); arrow(c, cx + 98, cy, x0 - 6, cy, HX.code, 0.55); }
    head(c, 'SIGNED, SHORT-LIVED SCOPE', x0, A.y + 26, HX.code, mob); head(c, 'FORCED ROW-LEVEL SECURITY IN POSTGRESQL', x0, y + th + 30, HX.dim, mob);
    if (!mob) { text(c, 'The model does not choose the tenant. The database does.', x0, y + th + 62, { size: 15, w: 600, sans: true, col: HX.tx }); text(c, 'requests for other accounts get one uniform 404', x0, y + th + 84, { size: 12, col: HX.mut }); }
    kit.tag(c, L, 'ILLUSTRATION · SINGLE POSTGRESQL INSTANCE · MOCK IDENTITY PROVIDER', 'ILLUSTRATION · MOCK IDENTITY PROVIDER');
  }

  /* 3 · retrieval: bars are Hit@1 (thick) and MRR@10 (thin) on the frozen held-out set, from the manifest */
  function retrieval(c, A, mob, t, s, d, L) {
    const k = ease(clamp((s - 2.6) / 0.6)), R = d.retrieval, lw = mob ? 0 : 190, bx = A.x + lw, bw = A.w - lw - (mob ? 0 : 70), rh = Math.min(mob ? 54 : 66, (A.h - 54) / 4);
    head(c, mob ? 'HIT@1 BAR · MRR@10 THIN · 40 HELD-OUT' : 'HIT@1 (BAR) · MRR@10 (THIN)  ·  FROZEN HELD-OUT SET, 40 TICKETS', A.x, A.y + 10, HX.dim, mob);
    R.forEach((r, i) => {
      const y = A.y + 30 + i * rh, on = r.key === 'vector', col = on ? HX.code : HX.blue;
      if (mob) text(c, r.label, A.x, y + 13, { size: 12, w: 600, col: on ? HX.code : HX.tx }); else text(c, r.label, A.x, y + 22, { size: 14, w: 600, col: on ? HX.code : HX.tx });
      const by = mob ? y + 18 : y + 6, w1 = bw * r.hit * k, w2 = bw * r.mrr * k; c.fillStyle = rgba(col, on ? 0.9 : 0.5); c.fillRect(bx, by, w1, mob ? 11 : 17); c.fillStyle = rgba(HX.tx, 0.4); c.fillRect(bx, by + (mob ? 14 : 22), w2, 4);
      text(c, r.hit.toFixed(2), bx + w1 + 8, by + (mob ? 10 : 14), { size: mob ? 12 : 15, w: 700, col: on ? HX.code : HX.tx });
      line(c, A.x, y + rh - 6, A.x + A.w, y + rh - 6, HX.tx, 1, 0.07);
    });
    if (mob) wrap(c, 'similar is not sufficient: look-alike pages come back even when the answer is missing', A.x, A.y + A.h - 22, A.w, 14, { size: 10, col: HX.mut }); else text(c, 'similar is not sufficient: look-alike pages are returned even when the answer is missing', A.x, A.y + A.h - 4, { size: 12, col: HX.mut });
    kit.tag(c, L, 'MEASURED · SINGLE AI REVIEWER · 25 ANSWERABLE TICKETS · DESCRIPTIVE ONLY', 'SINGLE AI REVIEWER · n=25 ANSWERABLE');
  }

  /* 4 · the model proposes; deterministic validation decides what survives */
  function diagnosis(c, A, mob, t, s, d, L) {
    const [phase, u] = cyc(t, 2.1, 2);
    const keys = ['hypotheses', 'cited evidence', 'what is missing', 'proposed actions', 'draft reply'];
    if (mob) {
      const bw = A.w - 8, bh = Math.min(58, (A.h - 66) / 3), x = A.x + 4; let y = A.y + 8;
      const row = (label, sub, col, k) => { box(c, x, y, bw, bh, col, 0.06); text(c, label, x + 12, y + 20, { size: 14, w: 700, sans: true, col: HX.tx }); text(c, fit(c, sub, bw - 24, '500 10.5px ' + H.FONT), x + 12, y + 38, { size: 10.5, col }); if (k < 2) { arrow(c, x + bw / 2, y + bh, x + bw / 2, y + bh + 14, col, 0.6); } y += bh + 14; };
      row('MODEL', 'rule-based stand-in · not an LLM', HX.model, 0); row('Structured output', keys.slice(0, 3).join(' · '), HX.bad, 1); row('Deterministic checks', 'schema · citations · grounding', HX.code, 2);
      kit.tag(c, L, '', 'THE MODEL IS A STAND-IN, NOT AN LLM'); return;
    }
    const bw = (A.w - 2 * 70) / 3, bh = Math.min(190, A.h * 0.7), y = A.y + 22, xs = [0, 1, 2].map((i) => A.x + i * (bw + 70));
    box(c, xs[0], y, bw, bh, HX.model, 0.06); head(c, 'MODEL', xs[0] + 16, y + 26, HX.model); text(c, 'RuleCaseModel', xs[0] + 16, y + 62, { size: 22, w: 700, sans: true }); text(c, 'a deterministic, rule-based stand-in', xs[0] + 16, y + 88, { size: 12.5, col: HX.mut }); text(c, 'NOT A LANGUAGE MODEL', xs[0] + 16, y + 112, { size: 12, w: 700, ls: 1.2, col: HX.amber });
    box(c, xs[1], y, bw, bh, HX.bad, 0.05); head(c, 'ITS OUTPUT · UNTRUSTED DATA', xs[1] + 16, y + 26, HX.bad); keys.forEach((kk, i) => text(c, kk, xs[1] + 16, y + 58 + i * 25, { size: 14, col: HX.tx }));
    box(c, xs[2], y, bw, bh, HX.code, 0.07, { on: true }); head(c, 'DETERMINISTIC CHECKS', xs[2] + 16, y + 26, HX.code); ['valid against a schema', 'citations point at evidence', 'draft grounded in evidence', 'no privileged fields'].forEach((kk, i) => { tick(c, xs[2] + 22, y + 62 + i * 25 - 4, 5, HX.code); text(c, kk, xs[2] + 36, y + 62 + i * 25, { size: 13.5, col: HX.tx }); });
    [0, 1].forEach((i) => { const x1 = xs[i] + bw + 6, x2 = xs[i + 1] - 6, ym = y + bh / 2; arrow(c, x1, ym, x2, ym, i ? HX.bad : HX.model, 0.65); pk(c, lerp(x1, x2, (t * 0.5 + i * 0.3) % 1), ym, i ? HX.bad : HX.model); });
    if (phase) { const px = lerp(xs[2] - 6, xs[2] - 6 - 36, ease(clamp(u * 2))); pk(c, px, y + bh + 24, HX.bad); text(c, 'a field the model may not set → output invalid', xs[2] + bw / 2, y + bh + 48, { size: 12, align: 'center', col: HX.bad }); }
    kit.tag(c, L, 'THE MODEL’S OUTPUT IS DATA TO BE CHECKED, NEVER AN AUTHORITY');
  }

  /* 5 · the only write vocabulary: five typed actions, three of them human-gated; forbidden names rejected by name */
  function actions(c, A, mob, t, s, d, L) {
    const a = d.actions, other = a.total - a.gated.length, [, u] = cyc(t, 2.4, 1);
    const bad = ['send_customer_email', 'run SQL', 'approve own action'];
    const cw = mob ? (A.w - 8) / 2 : Math.min(250, (A.w - 40) / 4), ch = mob ? 32 : 40, x0 = A.x + (mob ? 0 : 0);
    head(c, `${a.total} TYPED ACTIONS · ${a.gated.length} HUMAN-GATED`, A.x, A.y + 10, HX.code, mob);
    a.gated.forEach((g, i) => { const x = mob ? x0 + (i % 2) * (cw + 8) : x0 + i * (cw + 14), y = A.y + 26 + (mob ? Math.floor(i / 2) * (ch + 8) : 0); chip(c, g, x, y, cw, ch, HX.code, { size: mob ? 11 : 13, on: true }); });
    { const i = a.gated.length, x = mob ? x0 + (i % 2) * (cw + 8) : x0 + i * (cw + 14), y = A.y + 26 + (mob ? Math.floor(i / 2) * (ch + 8) : 0); chip(c, `+${other} propose-only`, x, y, cw, ch, HX.code, { size: mob ? 11 : 13, dim: true }); }
    const ry = A.y + (mob ? 26 + 2 * (ch + 8) + 22 : 26 + ch + 70);
    head(c, mob ? `${a.forbiddenNames} NAMES REFUSED BY NAME · NO EXECUTOR` : `${a.forbiddenNames} REQUEST NAMES REFUSED BY NAME · NO SCHEMA, NO EXECUTOR`, A.x, ry - 14, HX.red, mob);
    const fr = [0.4, 0.24, 0.36]; bad.forEach((b, i) => { const w = mob ? (A.w - 16) * fr[i] : cw, x = mob ? A.x + (A.w - 16) * fr.slice(0, i).reduce((p, q) => p + q, 0) + i * 8 : A.x + i * (cw + 14), y = ry + 4; chip(c, b, x, y, w, ch, HX.red, { size: mob ? 9.5 : 12.5, dim: true }); cross(c, x + w - 12, y + 10, 4, HX.red);
      const px = lerp(A.x - 10, x + w / 2, ease(clamp(u * 1.4 - i * 0.12))), py = lerp(ry + ch + (mob ? 28 : 56), y + ch + 2, ease(clamp(u * 1.4 - i * 0.12))); if (u > 0.05 && u < 0.85) pk(c, px, py, HX.red, 3); });
    if (!mob) { text(c, 'FORBIDDEN_ACTION', A.x + A.w, ry + ch + 40, { size: 13, w: 700, ls: 1.2, align: 'right', col: HX.red }); text(c, 'rejected before policy ever sees them', A.x + A.w, ry + ch + 62, { size: 12, align: 'right', col: HX.mut }); }
    kit.tag(c, L, 'CUSTOMER E-MAIL IS EXCLUDED BY CONSTRUCTION · NO CODE PATH EXISTS', 'NO CODE PATH CAN E-MAIL A CUSTOMER');
  }

  /* 6 · policy: rules over trusted facts, with reason codes; a hostile 100% credit is refused whatever the model asked */
  function policy(c, A, mob, t, s, d, L) {
    const [lane, u] = cyc(t, 2.4, 2), outs = [['ALLOW_PROPOSAL', '', HX.code], ['REQUIRE_APPROVAL', 'APPROVAL_REQUIRED_PRODUCTION_ACTION', HX.amber], ['DENY', 'CREDIT_ABOVE_AGENT_THRESHOLD', HX.red], ['ABSTAIN', 'missing or conflicting facts', HX.model]];
    const hot = lane === 0 ? 1 : 2, req = lane === 0 ? ['trigger_resync', HX.code] : ['credit: 100%', HX.red];
    const ox = mob ? A.x + A.w * 0.36 : A.x + A.w * 0.52, ow = A.x + A.w - ox, rh = Math.min(mob ? 50 : 62, (A.h - 20) / 4), cxp = mob ? A.x + A.w * 0.19 : A.x + A.w * 0.3;
    box(c, cxp - (mob ? 40 : 66), A.y + A.h * 0.28, mob ? 80 : 132, mob ? 70 : 96, HX.code, 0.08, { on: true }); text(c, 'POLICY', cxp, A.y + A.h * 0.28 + 24, { size: mob ? 10 : 11.5, w: 700, ls: mob ? 0.8 : 1.5, align: 'center', col: HX.code }); text(c, mob ? 'code' : 'facts + rules', cxp, A.y + A.h * 0.28 + (mob ? 44 : 50), { size: mob ? 11 : 12.5, align: 'center', col: HX.mut });
    chip(c, req[0], A.x, A.y + 6, mob ? 118 : 150, 30, req[1], { size: mob ? 11 : 13 }); const rx = cxp; arrow(c, rx, A.y + 38, rx, A.y + A.h * 0.28 - 2, req[1], 0.6); pk(c, rx, lerp(A.y + 38, A.y + A.h * 0.28, clamp(u * 1.6)), req[1]);
    outs.forEach((o, i) => { const y = A.y + 6 + i * rh, on = i === hot && u > 0.45; box(c, ox, y, ow, rh - 8, o[2], on ? 0.14 : 0.04, { on, dim: !on && i !== hot }); text(c, o[0], ox + 14, y + (o[1] ? 22 : 30), { size: mob ? 12.5 : 15, w: 700, col: on ? o[2] : HX.tx }); if (o[1]) text(c, fit(c, o[1], ow - 24, '500 ' + (mob ? 9.5 : 11.5) + 'px ' + H.FONT), ox + 14, y + 40, { size: mob ? 9.5 : 11.5, col: HX.mut }); line(c, cxp + (mob ? 40 : 66), A.y + A.h * 0.28 + (mob ? 35 : 48), ox, y + (rh - 8) / 2, o[2], 1.2, on ? 0.9 : 0.2); });
    kit.tag(c, L, 'REASON CODES FROM THE REPOSITORY · THE MODEL HAS NO INPUT TO THIS FUNCTION BUT THE VALIDATED ACTION', 'THE MODEL CANNOT OVERRIDE POLICY');
  }

  /* 7 · approval bound to the exact action; an amended action voids it */
  function approval(c, A, mob, t, s, d, L) {
    const [ph, u] = cyc(t, 2.6, 2), amended = ph === 1 && u > 0.35, binds = ['ACTION HASH', 'ROLE', 'TENANT', 'CASE', 'EXPIRY'];
    const cw = mob ? A.w : A.w * 0.56, ch = Math.min(mob ? A.h - 24 : 220, A.h - 20), x = A.x, y = A.y + 8;
    box(c, x, y, cw, ch, HX.human, 0.05, { on: true }); head(c, 'APPROVAL · REQUIRES THE EXACT ROLE', x + 14, y + 24, HX.human, mob); text(c, 'trigger_resync', x + 14, y + 56, { size: mob ? 16 : 22, w: 700, sans: true });
    const bw = (cw - 28 - 6 * (binds.length - 1)) / binds.length; binds.forEach((b, i) => chip(c, mob ? b.split(' ').pop() : b, x + 14 + i * (bw + 6), y + 74, bw, 26, amended && i === 0 ? HX.red : HX.human, { size: mob ? 8.5 : 10.5, dim: amended && i === 0 }));
    const by = y + ch - 52; chip(c, mob ? 'Approve exactly this' : 'Approve exactly this action', x + 14, by, mob ? 150 : 250, 34, amended ? HX.red : HX.human, { on: !amended, dim: amended, size: mob ? 11 : 13, fill: amended ? 0.02 : 0.2 }); chip(c, 'Deny', x + 14 + (mob ? 160 : 264), by, 70, 34, HX.red, { dim: true, size: 12 });
    const sx = x + cw + (mob ? 0 : 30);
    if (amended) { if (mob) { text(c, 'VOID', x + 14, y + 134, { size: 20, w: 800, ls: 3, col: HX.red }); text(c, 'amended: the hash changed, so a new', x + 14, y + 156, { size: 11, col: HX.tx }); text(c, 'approval is needed, not from its amender', x + 14, y + 172, { size: 11, col: HX.mut }); } else { text(c, 'VOID', sx, y + 40, { size: 30, w: 800, ls: 4, col: HX.red }); text(c, 'The action was amended: its hash changed,', sx, y + 74, { size: 14, col: HX.tx }); text(c, 'so the approval no longer applies.', sx, y + 94, { size: 14, col: HX.tx }); text(c, 'A new one is needed, and the person who', sx, y + 124, { size: 13, col: HX.mut }); text(c, 'amended it cannot give it.', sx, y + 143, { size: 13, col: HX.mut }); } }
    else { if (mob) { text(c, 'BOUND', x + 14, y + 134, { size: 20, w: 800, ls: 3, col: HX.human }); text(c, 'to this action, role, tenant and case;', x + 14, y + 156, { size: 11, col: HX.tx }); text(c, 'it expires. Approvers are simulated.', x + 14, y + 172, { size: 11, col: HX.mut }); } else { text(c, 'BOUND', sx, y + 40, { size: 30, w: 800, ls: 4, col: HX.human }); text(c, 'The approval names this action by its hash,', sx, y + 74, { size: 14, col: HX.tx }); text(c, 'this role, this tenant and this case, and', sx, y + 94, { size: 14, col: HX.tx }); text(c, 'it expires.', sx, y + 114, { size: 14, col: HX.tx }); text(c, 'Approvers here are simulated signed identities.', sx, y + 144, { size: 12.5, col: HX.mut }); } }
    kit.tag(c, L, 'ILLUSTRATION OF THE APPROVAL PANEL · SIMULATED SIGN-IN', 'SIMULATED SIGN-IN');
  }

  /* 8 · idempotent execution; an unknown outcome is never retried blindly */
  function execution(c, A, mob, t, s, d, L) {
    const [ph, u] = cyc(t, 3.2, 2), n = 3, gap = mob ? 22 : 56, bw = (A.w - gap * (n - 1)) / n, bh = Math.min(mob ? 70 : 130, A.h * 0.36), y = A.y + 22;
    const nodes = [['GATEWAY', 'validate · approval check', HX.code], [mob ? 'LEDGER' : 'IDEMPOTENCY LEDGER', 'one key per effect', HX.code], [mob ? 'CUSTOMER' : 'CUSTOMER SYSTEM', 'a deterministic mock', HX.amber]];
    nodes.forEach((nd, i) => { const x = A.x + i * (bw + gap); box(c, x, y, bw, bh, nd[2], 0.06); head(c, nd[0], x + 12, y + 22, nd[2], mob); if (!mob) text(c, nd[1], x + 12, y + 46, { size: 12.5, col: HX.mut }); if (i < n - 1) { arrow(c, x + bw + 3, y + bh / 2, x + bw + gap - 3, y + bh / 2, HX.code, 0.6); pk(c, lerp(x + bw, x + bw + gap, (t * 0.6 + i * 0.4) % 1), y + bh / 2, HX.code, 3); } });
    const uncertain = ph === 1 && u > 0.5, ey = y + bh + (mob ? 26 : 56);
    if (!uncertain) { tick(c, A.x + 10, ey - 5, 8, HX.code); text(c, mob ? 'applied once' : 'applied once · key recorded in the ledger', A.x + 28, ey, { size: mob ? 13 : 17, w: 700, sans: true, col: HX.code }); }
    else { text(c, 'UNCERTAIN OUTCOME', A.x, ey, { size: mob ? 14 : 20, w: 800, ls: 2, col: HX.amber }); text(c, mob ? 'timed out · no blind retry' : 'The call timed out after it may have applied. The system does not retry.', A.x, ey + (mob ? 20 : 28), { size: mob ? 11 : 14, col: HX.tx }); text(c, mob ? 'a human reconciles it' : 'A human reconciles it against the customer system and records a note.', A.x, ey + (mob ? 38 : 52), { size: mob ? 11 : 14, col: HX.mut }); }
    kit.tag(c, L, 'CUSTOMER SYSTEMS ARE MOCKS WITH FAULT INJECTION · RECONCILIATION TRUSTS THE OPERATOR’S NOTE', 'MOCK CUSTOMER SYSTEMS · FAULT INJECTION');
  }

  /* 9 · tamper-evident audit chain; lease-based recovery with exactly one effect */
  function audit(c, A, mob, t, s, d, L) {
    const n = mob ? 5 : 7, gap = mob ? 12 : 22, bw = (A.w - gap * (n - 1)) / n, bh = mob ? 38 : 56, y = A.y + 26, grow = (t * 0.5) % 1;
    head(c, mob ? 'APPEND-ONLY · HASH-CHAINED AUDIT LOG' : 'APPEND-ONLY AUDIT LOG · EACH EVENT CARRIES THE HASH OF THE ONE BEFORE', A.x, A.y + 10, HX.code, mob);
    for (let i = 0; i < n; i++) { const x = A.x + i * (bw + gap), last = i === n - 1, a = last ? ease(clamp(grow * 1.6)) : 1; c.save(); c.globalAlpha *= a; box(c, x, y, bw, bh, HX.code, last ? 0.12 : 0.05, { on: last }); text(c, ['proposal', 'decision', 'approval', 'execution', 'refusal', 'recovery', 'audit'][i % 7], x + 8, y + (mob ? 16 : 22), { size: mob ? 9.5 : 12, w: 600, col: HX.tx }); text(c, i ? (mob ? '← hash' : '← prev hash') : 'start', x + 8, y + bh - (mob ? 8 : 12), { size: mob ? 8.5 : 10.5, col: HX.dim }); c.restore(); if (i < n - 1) line(c, x + bw, y + bh / 2, x + bw + gap, y + bh / 2, HX.code, 1.4, 0.6); }
    const wy = y + bh + (mob ? 40 : 66), lease = Math.floor(t * 0.5) % 2; head(c, 'RECOVERY WORKERS · POSTGRESQL LEASES', A.x, wy - (mob ? 14 : 20), HX.human, mob);
    ['worker A', 'worker B'].forEach((w, i) => { const x = A.x + i * (mob ? A.w * 0.34 : 230), on = lease === i; chip(c, mob ? (i ? 'B · waits' : 'A · lease') : w + (on ? ' · holds the lease' : ' · waits'), x, wy, mob ? A.w * 0.32 : 210, 34, HX.human, { on, dim: !on, size: mob ? 9.5 : 12.5 }); });
    const ex = A.x + (mob ? 0 : 480); if (!mob) { text(c, 'one effect per approved action', ex, wy + 15, { size: 17, w: 700, sans: true, col: HX.code }); text(c, 'tested with concurrent workers, including ones that ignore the lease', ex, wy + 38, { size: 12, col: HX.mut }); text(c, 'tamper-evident, not immutable: removing the newest events needs an external anchor, which is not deployed', A.x, wy + 76, { size: 12, col: HX.amber }); }
    else text(c, 'one effect per approved action', A.x, wy + 56, { size: 13, w: 700, sans: true, col: HX.code });
    kit.tag(c, L, 'ILLUSTRATION OF THE DESIGN · TESTS RUN ON ONE DATABASE, ONE HOST', 'ONE DATABASE · ONE HOST');
  }
})();
