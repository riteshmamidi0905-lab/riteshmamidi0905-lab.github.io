/* The Living Headquarters scene: fixed architecture + parts that respond to the event-derived state (hq-events.js). Nothing here decides what happened; it only draws the state.
   Layout: Arrival atrium at the origin with the twelve agent pylons; Mission Control west; Research Laboratory east; THE WEIR north; the VERITAS chamber south. */
(function (root) {
  'use strict';
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const k = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  const TEAL = [0.25, 0.8, 0.7], GOLD = [0.94, 0.78, 0.45], RED = [0.9, 0.28, 0.2], BLUE = [0.45, 0.62, 1.0], VIOLET = [0.7, 0.55, 0.95], STEEL = [0.16, 0.2, 0.23];
  let A_DATA_FORT = null;
  const ROOMS = { atrium: [0, 0, 0], control: [-34, 0, 0], lab: [34, 0, 0], weir: [0, 0, -34], twin: [0, 0, 34] };
  const R_CAMPUS = 66, LOD_DIST = 55;
  const worldCenter = i => { const a = (i * 30 + 15) * Math.PI / 180; return [Math.cos(a) * R_CAMPUS, 0, Math.sin(a) * R_CAMPUS]; };
  const worldYaw = i => { const a = (i * 30 + 15) * Math.PI / 180; return Math.atan2(-Math.cos(a), -Math.sin(a)); };       // local +z (front) faces the atrium
  const agentPreset = i => { const c = worldCenter(i); return { target: [c[0], 3.4, c[2]], yaw: worldYaw(i) - 0.3, pitch: 0.38, dist: 20 }; };
  const PRESETS = {
    atrium: { target: [0, 2.4, 0], yaw: 0.05, pitch: 0.52, dist: 38 }, control: { target: [-34, 1.4, 4.5], yaw: 0.25, pitch: 0.5, dist: 25 }, lab: { target: [34, 2.2, 0], yaw: -0.5, pitch: 0.34, dist: 22 },
    weir: { target: [0, 1.2, -29], yaw: 0.0, pitch: 0.82, dist: 31 }, twin: { target: [0, 2.6, 34], yaw: Math.PI - 0.3, pitch: 0.42, dist: 24 }, campus: { target: [0, 0, 0], yaw: 0.5, pitch: 0.82, dist: 150 }
  };
  const INTRO = { target: [0, 6, 0], yaw: 1.2, pitch: 0.62, dist: 80 };
  const NODE_COL = { queued: [0.3, 0.35, 0.38], running: BLUE, completed: TEAL, failed: RED, blocked: [0.95, 0.5, 0.2], awaiting_approval: GOLD, rejected: RED, expired: [0.5, 0.45, 0.4], cancelled: [0.4, 0.4, 0.45], skipped: [0.2, 0.22, 0.25] };
  function layout(agents) {
    const pylons = agents.map((a, i) => { const ang = i / agents.length * Math.PI * 2 + 0.26; return { slug: a.slug, name: a.name, color: hex(a.color), pos: [Math.cos(ang) * 10.5, 0, Math.sin(ang) * 10.5], ang }; });
    return { pylons };
  }
  function buildStatic(agents, data) {
    A_DATA_FORT = data.fortress ? { audit: data.fortress.audit.length } : null;
    const L = layout(agents), S = [], add = o => { S.push(o); return o; };
    add({ mesh: 'cyl', pos: [0, -0.62, 0], scale: [260, 0.2, 260], color: [0.02, 0.03, 0.035], grid: 0.55 });                                              // ground plane
    add({ mesh: 'cyl', pos: [0, -0.3, 0], scale: [22, 0.3, 22], color: [0.035, 0.05, 0.06], grid: 1.0, fres: 0.2 });                                // atrium floor with grid + rings
    add({ mesh: 'cyl', pos: [0, 0.02, 0], scale: [3.4, 0.08, 3.4], color: [0.07, 0.09, 0.1], emis: [0.03, 0.05, 0.05] });
    add({ mesh: 'cyl', pos: [0, 0.35, 0], scale: [2.2, 0.35, 2.2], color: [0.1, 0.12, 0.14], fres: 0.6, mat: 'stone' });                                              // plinth
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; add({ mesh: 'box', pos: [Math.cos(a) * 16.2, 4.6, Math.sin(a) * 16.2], rot: [0, -a, 0], scale: [0.05, 4.6, 0.07], color: [0.42, 0.5, 0.52], fres: 0.3, emis: [0.02, 0.03, 0.03], mat: 'metal' }); }   // mullions
    add({ mesh: 'torusX', pos: [0, 9.2, 0], scale: [16.2, 16.2, 16.2], color: [0.55, 0.6, 0.62], fres: 0.5, emis: [0.07, 0.09, 0.09] });
    add({ mesh: 'torusX', pos: [0, 6.0, 0], scale: [16.2, 16.2, 16.2], color: [0.5, 0.55, 0.57], fres: 0.4, emis: [0.04, 0.05, 0.05] });
    add({ mesh: 'torusX', pos: [0, 0.15, 0], scale: [16.2, 16.2, 16.2], color: [0.5, 0.45, 0.35], emis: [0.5, 0.36, 0.16] });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.13; add({ mesh: 'box', pos: [Math.cos(a) * 16.2, 4.6, Math.sin(a) * 16.2], rot: [0, -a - Math.PI / 2, 0], scale: [2.6, 4.5, 0.03], color: [0.3, 0.55, 0.58], alpha: 0.05, fres: 0.7, blend: 'glass' }); }   // glass bays
    // corridors
    [['control', -1, 0], ['lab', 1, 0], ['weir', 0, -1], ['twin', 0, 1]].forEach(([r, dx, dz]) => { const c = ROOMS[r]; add({ mesh: 'box', pos: [dx * 24.5, 0.03, dz * 24.5], rot: [0, dz ? Math.PI / 2 : 0, 0], scale: [8.5, 0.03, 0.9], color: [0.08, 0.1, 0.11], emis: [0.03, 0.12, 0.12] }); });
    // ---- Mission Control (west)
    const C = ROOMS.control;
    add({ mesh: 'cyl', pos: [C[0], -0.1, C[2]], scale: [9.5, 0.3, 9.5], color: [0.04, 0.055, 0.07], grid: 0.7, fres: 0.3 });
    add({ mesh: 'cyl', pos: [C[0], 0.4, C[2]], scale: [6.6, 0.25, 6.6], color: [0.08, 0.1, 0.12], fres: 0.5 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add({ mesh: 'box', pos: [C[0] + Math.cos(a) * 7.8, 0.9, C[2] + Math.sin(a) * 7.8], rot: [0.5, -a - Math.PI / 2, 0], scale: [1.3, 0.12, 0.7], color: [0.12, 0.15, 0.18], emis: [0.02, 0.07, 0.08], fres: 0.5 }); }
    [[1.2, 1.1], [1.0, 2.7], [0.78, 4.1], [0.5, 5.2]].forEach(([w, y], i) => add({ mesh: 'box', pos: [C[0], y + 0.5, C[2]], scale: [w, 0.62, w], color: [0.18, 0.22, 0.25], fres: 0.9, tower: i }));
    // ---- Research Laboratory (east)
    const R = ROOMS.lab;
    add({ mesh: 'cyl', pos: [R[0], -0.1, R[2]], scale: [9.5, 0.3, 9.5], color: [0.04, 0.055, 0.07], grid: 0.7, fres: 0.3 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 1.25 + Math.PI * 0.375 + Math.PI; add({ mesh: 'cyl', pos: [R[0] + Math.cos(a) * 6.4, 0.9, R[2] + Math.sin(a) * 6.4], scale: [0.7, 0.9, 0.7], color: [0.1, 0.12, 0.14], fres: 0.7, station: i }); add({ mesh: 'box', pos: [R[0] + Math.cos(a) * 6.4, 2.0, R[2] + Math.sin(a) * 6.4], rot: [0, -a, 0], scale: [0.7, 0.05, 0.5], color: [0.2, 0.26, 0.3], fres: 0.8 }); }
    add({ mesh: 'cyl', pos: [R[0], 0.5, R[2]], scale: [2.0, 0.5, 2.0], color: [0.1, 0.12, 0.14], fres: 0.6 });
    // ---- THE WEIR (north): a gate
    const W = ROOMS.weir;
    add({ mesh: 'cyl', pos: [W[0], -0.1, W[2]], scale: [10.5, 0.3, 10.5], color: [0.04, 0.05, 0.06], grid: 0.6, fres: 0.3 });
    [-4.6, 4.6].forEach(x => add({ mesh: 'box', pos: [W[0] + x, 4.4, W[2]], scale: [0.9, 4.4, 1.1], color: [0.13, 0.15, 0.17], fres: 0.9, emis: [0.02, 0.02, 0.02] }));
    add({ mesh: 'box', pos: [W[0], 9.2, W[2]], scale: [5.9, 0.7, 1.1], color: [0.13, 0.15, 0.17], fres: 0.9 });
    add({ mesh: 'box', pos: [W[0], 5.2, W[2]], scale: [3.7, 3.9, 0.06], color: [0.2, 0.7, 0.65], alpha: 0.22, fres: 1.0, blend: 'glass', gate: true });
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2 + 0.07 * Math.sin(i * 3.1), r = 178 + 20 * Math.sin(i * 1.7), hh = 4 + 13 * Math.abs(Math.sin(i * 2.3 + 1)) * (0.4 + 0.6 * Math.abs(Math.cos(i * 0.9))); S.push({ mesh: 'box', pos: [Math.cos(a) * r, hh / 2 - 0.5, Math.sin(a) * r], rot: [0, -a, 0], scale: [1.6 + 1.6 * Math.abs(Math.sin(i * 5.1)), hh / 2, 1.6 + 1.4 * Math.abs(Math.cos(i * 4.3))], color: [0.025, 0.03, 0.04] }); }          // distant skyline: depth, never detail
    [[0, 0, 19], [-34, 0, 11], [34, 0, 11], [0, -34, 11], [0, 34, 9]].forEach(([x, z, rd], i) => S.push({ mesh: 'cyl', pos: [i === 0 ? 0 : (i < 3 ? x : 0), 0.03, i === 0 ? 0 : (i < 3 ? 0 : (i === 3 ? -34 : 34))], scale: [rd, 0.01, rd], color: [0, 0, 0], alpha: 0.5, blend: 'glass', mat: 'blob' }));
    L.statics = S;
    buildCampus(L, agents, data, S);
    return L;
  }
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /* Mission Theater stage: tasks are placed by dependency depth (a long chain folds into rows). Pure and shared by the scene, labels and picking. */
  function theaterLayout(nodes) {
    const C = ROOMS.control, by = Object.fromEntries(nodes.map(n => [n.id, n])), layer = {}, lv = id => { if (layer[id] != null) return layer[id]; layer[id] = 0; const ds = by[id].deps.filter(d => by[d]); return (layer[id] = ds.length ? 1 + Math.max(...ds.map(lv)) : 0); };
    nodes.forEach(n => lv(n.id)); const L = Math.max(0, ...Object.values(layer)), fold = L > 6, cols = fold ? 6 : L + 1, rows = fold ? Math.ceil((L + 1) / 6) : 1, pos = {}, cnt = {};
    nodes.forEach(n => { const l = layer[n.id], key = fold ? l : l; const col = fold ? l % 6 : l, row = fold ? Math.floor(l / 6) : 0; const i = cnt[key] = (cnt[key] == null ? 0 : cnt[key] + 1); const same = nodes.filter(x => layer[x.id] === l).length;
      pos[n.id] = [C[0] - 8 + (cols > 1 ? col / (cols - 1) * 16 : 8), C[2] + 7 + (fold ? (row - (rows - 1) / 2) * 3.6 : 0) + (i - (same - 1) / 2) * 2.5]; });
    return pos;
  }
  function buildDynamic(L, agents, st, t, flags) {
    const O = [], add = o => { O.push(o); return o; }, calm = flags.calm, pulse = calm ? 1 : 0.8 + 0.2 * Math.sin(t / 280), slow = calm ? 0 : t / 1000;
    const run = st.mission.status === 'running' || st.mission.status === 'awaiting_approval';
    // central installation
    const coreCol = run ? TEAL : GOLD, glow = run ? 1.0 : 0.55;
    add({ mesh: 'sphere', pos: [0, 3.6, 0], scale: [0.85, 0.85, 0.85], color: k(coreCol, 0.5), emis: k(coreCol, 0.9 * glow * pulse), fres: 1.0 });
    [[2.0, 1.2, 0.5, 1], [1.55, 2.5, -0.35, -1.4], [1.15, 3.8, 0.2, 1.9], [0.8, 5.0, -0.1, -2.4]].forEach(([r, y, tilt, sp], i) => add({ mesh: 'torus', pos: [0, y + 0.3, 0], scale: [r * 1.35, r * 1.35, r * 1.35], rot: [Math.PI / 2 + tilt * 0.6, slow * sp * 0.5, 0], color: [0.55, 0.6, 0.62], emis: k(GOLD, 0.14 + 0.04 * i), fres: 1.2 }));
    add({ mesh: 'cyl', pos: [0, 9, 0], scale: [0.09, 8.7, 0.09], color: TEAL, emis: k(coreCol, 0.7 * glow), alpha: 0.5, blend: 'add' });
    // agent pylons
    L.pylons.forEach(p => { const a = st.agents[p.slug], base = a.state, h = base === 'active' ? 4.4 + (calm ? 0 : 0.35 * Math.sin(t / 220)) : base === 'awaiting' ? 3.6 : base === 'done' ? 3.0 : base === 'blocked' ? 2.2 : a.assigned ? 3.2 : 2.6;
      const lvl = { idle: 0.36, active: 1.0, awaiting: 0.9, done: 0.55, blocked: 0.5 }[base] + (a.assigned && base === 'idle' ? 0.2 : 0), col = base === 'blocked' ? RED : base === 'awaiting' ? GOLD : p.color;
      add({ mesh: 'cyl', pos: [p.pos[0], 0.2, p.pos[2]], scale: [0.85, 0.2, 0.85], color: [0.09, 0.1, 0.12], fres: 0.6, emis: k(p.color, 0.08) });
      add({ mesh: 'box', pos: [p.pos[0], 0.4 + h / 2, p.pos[2]], rot: [0, -p.ang, 0], scale: [0.3, h / 2, 0.3], color: [0.07, 0.09, 0.1], fres: 0.9 });
      add({ mesh: 'box', pos: [p.pos[0], 0.4 + h / 2, p.pos[2]], rot: [0, -p.ang, 0], scale: [0.34, h / 2 - 0.05, 0.08], color: k(col, 0.45), emis: k(col, lvl * 1.1) });
      add({ mesh: 'cone', pos: [p.pos[0], 0.4 + h + 0.5, p.pos[2]], scale: [0.26, 0.5, 0.26], color: k(col, 0.5), emis: k(col, lvl) });
      add({ mesh: 'torusS', pos: [p.pos[0], 0.1, p.pos[2]], scale: [1.15, 1.15, 1.15], color: k(col, 0.5), emis: k(col, base === 'idle' ? 0.45 : 1.0), alpha: 0.9, blend: 'add' });
      if (a.alert) add({ mesh: 'sphere', pos: [p.pos[0], h + 1.9, p.pos[2]], scale: [0.22, 0.22, 0.22], color: RED, emis: k(RED, 0.9 * pulse) });
      if (base === 'active') add({ mesh: 'cyl', pos: [p.pos[0], 0.45 + h / 2, p.pos[2]], scale: [0.55, h / 2 + 0.2, 0.55], color: k(col, 0.5), emis: k(col, 0.6), alpha: 0.25, blend: 'add' });
    });
    if (st.link && st.link.from) { const a = L.pylons.find(p => p.slug === st.link.from), b = L.pylons.find(p => p.slug === st.link.to); if (a && b) { const dx = b.pos[0] - a.pos[0], dz = b.pos[2] - a.pos[2], len = Math.hypot(dx, dz); add({ mesh: 'box', pos: [(a.pos[0] + b.pos[0]) / 2, 2.4, (a.pos[2] + b.pos[2]) / 2], rot: [0, Math.atan2(-dz, dx), 0], scale: [len / 2, 0.035, 0.035], color: GOLD, emis: k(GOLD, 1.0), alpha: 0.9, blend: 'add' }); } }
    if (st.link) { const b = L.pylons.find(p => p.slug === st.link.to); if (b) add({ mesh: 'box', pos: [b.pos[0] / 2, 2.0, b.pos[2] / 2], rot: [0, Math.atan2(-b.pos[2], b.pos[0]), 0], scale: [Math.hypot(b.pos[0], b.pos[2]) / 2, 0.012, 0.012], color: TEAL, emis: k(TEAL, 0.7), alpha: 0.6, blend: 'add' }); }
    // Mission Control
    const C = ROOMS.control, mc = st.rooms.control.lit;
    add({ mesh: 'torusS', pos: [C[0], 3.6, C[2]], scale: [5.0, 5.0, 5.0], rot: [0, slow * 0.4, 0], color: [0.4, 0.5, 0.55], emis: k(run ? TEAL : GOLD, mc ? 0.6 * pulse : 0.15), alpha: 0.8, blend: 'add' });
    [0, 1, 2, 3].forEach(i => add({ mesh: 'box', pos: [C[0], [1.1, 2.7, 4.1, 5.2][i] + 0.5, C[2]], scale: [[1.2, 1.0, 0.78, 0.5][i] + 0.04, 0.6, [1.2, 1.0, 0.78, 0.5][i] + 0.04], color: [0.1, 0.12, 0.14], emis: k(run ? TEAL : GOLD, (mc ? 0.55 : 0.12) * (0.6 + 0.1 * i)), alpha: 0.5, blend: 'add' }));
    if (flags.theater && flags.theater.nodes.length) { const T = flags.theater, P = T.pos, Y = 1.5, byId = Object.fromEntries(T.nodes.map(n => [n.id, n]));
      add({ mesh: 'box', pos: [ROOMS.control[0], 0.12, ROOMS.control[2] + 7], scale: [9.6, 0.1, Math.max(3, ...T.nodes.map(n => Math.abs(P[n.id][1] - ROOMS.control[2] - 7))) + 2.2], color: [0.1, 0.12, 0.14], mat: 'stone' });
      T.nodes.forEach(n => n.deps.forEach(d => { const a = P[d], b = P[n.id]; if (!a || !byId[d]) return; const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, hot = T.sel && (T.sel === n.id || T.sel === d), live = byId[d].state !== 'queued' && n.state !== 'queued', col = hot ? GOLD : live ? TEAL : STEEL, dimE = T.sel && !hot;
        add({ mesh: 'box', pos: [(a[0] + b[0]) / 2, Y, (a[1] + b[1]) / 2], rot: [0, Math.atan2(-dz, dx), 0], scale: [len / 2 - 0.45, 0.014, 0.014], color: col, emis: k(col, dimE ? 0.12 : live || hot ? 0.8 : 0.25), alpha: dimE ? 0.25 : 0.85, blend: 'add' });
        [[0.95, 0.07], [0.72, 0.1], [0.5, 0.14]].forEach(([back, r]) => add({ mesh: 'sphere', pos: [b[0] - ux * (back + 0.2), Y, b[1] - uz * (back + 0.2)], scale: [r, r, r], color: col, emis: k(col, dimE ? 0.15 : 0.95) }));
        if (!calm && live) { const f = ((t / 1400) + (len % 1)) % 1; add({ mesh: 'sphere', pos: [a[0] + dx * f, Y, a[1] + dz * f], scale: [0.09, 0.09, 0.09], color: col, emis: k(col, 1) }); } }));
      T.nodes.forEach(n => { const p = P[n.id], c = NODE_COL[n.state] || STEEL, dimN = T.agent && n.agent !== T.agent, sel = T.sel === n.id, lit = n.state === 'queued' ? 0.15 : 0.85;
        add({ mesh: 'cyl', pos: [p[0], 0.55, p[1]], scale: [0.5, 0.55, 0.5], color: [0.09, 0.1, 0.12], mat: 'stone' });
        add({ mesh: 'sphere', pos: [p[0], Y + (n.state === 'running' ? 0.15 * pulse : 0), p[1]], scale: [0.55, 0.55, 0.55], color: k(c, 0.5), emis: k(c, dimN ? 0.1 : lit), fres: 1, mat: 'glass' });
        if (sel) add({ mesh: 'torusS', pos: [p[0], Y, p[1]], scale: [0.95, 0.95, 0.95], rot: [Math.PI / 2, slow, 0], color: GOLD, emis: k(GOLD, 1), alpha: 0.95, blend: 'add' });
        for (let i = 0; i < Math.min(6, n.tools); i++) add({ mesh: 'box', pos: [p[0] - 0.6 + i * 0.24, 2.35, p[1]], scale: [0.07, 0.07, 0.07], color: BLUE, emis: k(BLUE, 0.9) });
        if (n.hold) add({ mesh: 'box', pos: [p[0] + 0.55, 2.0, p[1] + 0.3], rot: [0.6, 0.78, 0], scale: [0.14, 0.14, 0.14], color: GOLD, emis: k(GOLD, 0.95 * pulse) });
        if (n.fail) add({ mesh: 'sphere', pos: [p[0] - 0.55, 2.0, p[1] + 0.3], scale: [0.13, 0.13, 0.13], color: RED, emis: k(RED, 0.95 * pulse) });
        if (n.fb) add({ mesh: 'cone', pos: [p[0], 2.0, p[1] - 0.5], scale: [0.12, 0.2, 0.12], color: [0.7, 0.5, 0.95], emis: k([0.7, 0.5, 0.95], 0.9) });
        if (n.human) add({ mesh: 'sphere', pos: [p[0] + 0.55, 2.0, p[1] - 0.3], scale: [0.13, 0.13, 0.13], color: TEAL, emis: k(TEAL, 0.95) }); }); }
    else if (st.graph) st.graph.order.forEach((n, i, arr) => { const a = i / arr.length * Math.PI * 2 - Math.PI / 2, nd = st.graph.nodes[n], c = NODE_COL[nd.state] || STEEL; add({ mesh: 'sphere', pos: [C[0] + Math.cos(a) * 4.2, 2.2 + (nd.state === 'running' ? 0.2 * pulse : 0), C[2] + Math.sin(a) * 4.2], scale: [0.34, 0.34, 0.34], color: k(c, 0.5), emis: k(c, nd.state === 'queued' ? 0.15 : 0.8), fres: 1 }); });
    else L.pylons.forEach((p, i, arr) => { const a = i / arr.length * Math.PI * 2 - Math.PI / 2, s = st.agents[p.slug]; add({ mesh: 'sphere', pos: [C[0] + Math.cos(a) * 4.2, 2.2, C[2] + Math.sin(a) * 4.2], scale: [0.26, 0.26, 0.26], color: k(p.color, 0.5), emis: k(p.color, s.state === 'active' ? 0.95 : s.assigned ? 0.4 : 0.07) }); });
    // THE WEIR
    const W = ROOMS.weir, pending = st.holds.some(h => !h.decided), blocked = st.blocks.length > 0, fieldCol = blocked ? RED : pending ? GOLD : TEAL;
    add({ mesh: 'box', pos: [W[0], 5.2, W[2]], scale: [3.7, 3.9, 0.08], color: fieldCol, emis: k(fieldCol, (blocked || pending ? 0.5 : 0.14) * pulse), alpha: blocked || pending ? 0.4 : 0.2, blend: 'add' });
    st.blocks.slice(-12).forEach((b, i) => add({ mesh: 'box', pos: [W[0] - 5.5 + i * 0.95, 0.45, W[2] + 3.4], scale: [0.34, 0.34, 0.34], color: RED, emis: k(RED, 0.8) }));
    st.holds.slice(-6).forEach((h, i) => add({ mesh: 'box', pos: [W[0] - 3 + i * 1.2, 0.45, W[2] + 4.6], rot: [0, 0.78, 0], scale: [0.36, 0.36, 0.36], color: GOLD, emis: k(GOLD, h.decided ? 0.25 : 0.9 * pulse) }));
    st.humans.slice(-6).forEach((h, i) => add({ mesh: 'sphere', pos: [W[0] - 3 + i * 1.2, 0.5, W[2] + 5.8], scale: [0.34, 0.34, 0.34], color: h.decision === 'approve' ? TEAL : RED, emis: k(h.decision === 'approve' ? TEAL : RED, 0.7) }));
    // the four chambers of the fortress, behind the gate; the selected one glows (panel selection), the audit corridor carries one tick per recorded chain
    { const Z = W[2] + 11, on = id => flags.fort === id, em = (id, v) => on(id) ? Math.min(1, v + 0.45) * pulse : v;
      // Authorization Chamber: a portal of two pillars and a lintel with barrier bars (what may pass)
      [-1.5, 1.5].forEach(dx => add({ mesh: 'box', pos: [W[0] - 8.4 + dx, 1.5, Z], scale: [0.28, 1.5, 0.28], color: [0.2, 0.2, 0.22], mat: 'stone' })); add({ mesh: 'box', pos: [W[0] - 8.4, 3.15, Z], scale: [1.9, 0.18, 0.34], color: GOLD, emis: k(GOLD, em('auth', 0.3)), mat: 'metal' });
      for (let i = -2; i <= 2; i++) add({ mesh: 'box', pos: [W[0] - 8.4 + i * 0.55, 1.4, Z], scale: [0.04, 1.3, 0.04], color: GOLD, emis: k(GOLD, em('auth', 0.35)), blend: 'add', alpha: 0.9 });
      // Approval Chamber: a round pavilion with a glass dome and a ring where a person decides
      add({ mesh: 'cyl', pos: [W[0] - 2.8, 0.3, Z], scale: [1.8, 0.3, 1.8], color: [0.18, 0.2, 0.2], mat: 'stone' }); add({ mesh: 'sphere', pos: [W[0] - 2.8, 1.5, Z], scale: [1.45, 1.2, 1.45], color: k(TEAL, 0.4), emis: k(TEAL, em('appr', 0.12)), alpha: 0.4, blend: 'glass', mat: 'glass' }); add({ mesh: 'torusS', pos: [W[0] - 2.8, 2.9, Z], scale: [1.6, 1.6, 1.6], rot: [Math.PI / 2, 0, 0], color: TEAL, emis: k(TEAL, em('appr', 0.4)), alpha: 0.9, blend: 'add' });
      // Audit Corridor: a run of arched ribs, one tick per recorded chain on its floor
      for (let i = 0; i < 6; i++) { const z = Z - 1.5 + i * 0.6; [-1.3, 1.3].forEach(dx => add({ mesh: 'box', pos: [W[0] + 2.8 + dx, 1.2, z], scale: [0.07, 1.2, 0.07], color: BLUE, emis: k(BLUE, em('audit', 0.3)), mat: 'metal' })); add({ mesh: 'box', pos: [W[0] + 2.8, 2.45, z], scale: [1.35, 0.07, 0.07], color: BLUE, emis: k(BLUE, em('audit', 0.35)), mat: 'metal' }); }
      // Failure and Recovery Chamber: a bunker of angled slabs under a red beacon, with a recovery ring beside it
      [-0.5, 0.5].forEach(sd => add({ mesh: 'box', pos: [W[0] + 8.4 + sd * 1.6, 1.0, Z], rot: [0, sd * 0.7, 0], scale: [1.3, 1.0, 0.18], color: [0.22, 0.14, 0.14], mat: 'stone' })); add({ mesh: 'cone', pos: [W[0] + 8.4, 2.5, Z], scale: [0.3, 0.9, 0.3], color: RED, emis: k(RED, em('fail', 0.4)) }); add({ mesh: 'torusS', pos: [W[0] + 9.9, 0.7, Z + 0.9], scale: [0.8, 0.8, 0.8], rot: [Math.PI / 2, 0, 0], color: TEAL, emis: k(TEAL, em('fail', 0.3)), alpha: 0.9, blend: 'add' }); }
    if (A_DATA_FORT) for (let i = 0; i < A_DATA_FORT.audit; i++) add({ mesh: 'box', pos: [W[0] + 2.8 - 1.1 + (i / Math.max(1, A_DATA_FORT.audit - 1)) * 2.2, 0.35, W[2] + 11], scale: [0.05, 0.3, 0.05], color: BLUE, emis: k(BLUE, flags.fort === 'audit' ? 0.95 : 0.3) });
    // Research Laboratory
    const R = ROOMS.lab, claim = st.validations.some(v => /claim/.test(v.name)), mdl = st.model.length > 0, rel = (st.mission.retries || 0) > 0 || st.fallbacks.length > 0 || st.blocks.length > 0;
    const stationLit = [claim, st.rooms.lab.lit && st.validations.length > 0, rel, mdl, false, st.rooms.lab.lit];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 1.25 + Math.PI * 0.375 + Math.PI; add({ mesh: 'box', pos: [R[0] + Math.cos(a) * 6.4, 2.16, R[2] + Math.sin(a) * 6.4], rot: [0, -a, 0], scale: [0.62, 0.025, 0.42], color: BLUE, emis: k(BLUE, stationLit[i] ? 0.95 * pulse : 0.1), alpha: 0.9 }); }
    const lc = st.validations.length ? RED : st.rooms.lab.lit ? BLUE : [0.4, 0.5, 0.6];
    [0, 1, 2].forEach(i => add({ mesh: 'torusS', pos: [R[0], 2.6 + i * 1.1, R[2]], scale: [1.7 - i * 0.3, 1.7 - i * 0.3, 1.7 - i * 0.3], rot: [Math.PI / 2 + 0.3 * (i - 1), slow * (i % 2 ? -0.7 : 0.7), 0], color: k(lc, 0.5), emis: k(lc, st.rooms.lab.lit ? 0.7 : 0.15), fres: 0.9 }));
    add({ mesh: 'sphere', pos: [R[0], 2.4 + 1.1, R[2]], scale: [0.5, 0.5, 0.5], color: k(lc, 0.5), emis: k(lc, st.rooms.lab.lit ? 0.85 * pulse : 0.2) });
    campusDynamic(O, L, agents, st, t, flags);
    return O;
  }

  /* ---------------- Agent campus: twelve worlds on a ring, lit spokes, level of detail ---------------- */
  const place = (o, c, ry) => { const x = o.pos[0], z = o.pos[2], cs = Math.cos(ry), sn = Math.sin(ry), q = Object.assign({}, o), rot = o.rot || [0, 0, 0]; q.pos = [c[0] + cs * x + sn * z, o.pos[1] + (c[1] || 0), c[2] - sn * x + cs * z]; q.rot = [rot[0], rot[1] + ry, rot[2]]; delete q.m; delete q.nm; return q; };
  const TWIN_POS = {};
  function twinLayout(twin) { const C = ROOMS.twin, ids = twin.departments.map(d => d.id).filter(i => i !== 'executive'); ids.forEach((id, i) => { const a = i / ids.length * Math.PI * 2 - Math.PI / 2; TWIN_POS[id] = [C[0] + Math.cos(a) * 4.7, 0, C[2] + Math.sin(a) * 4.7]; }); TWIN_POS.executive = [C[0], 0, C[2]]; return TWIN_POS; }
  function buildCampus(L, agents, data, S) {
    L.worlds = []; if (!data || !data.twin) return;
    const fin = data.twin.departments.find(d => d.id === 'finance'), finance = [fin.baseline.revenue, fin.baseline.gross_profit, fin.surge.revenue, fin.surge.gross_profit, fin.surge_with_reorder.revenue, fin.surge_with_reorder.gross_profit].map(v => v || 0);
    agents.forEach((a, i) => {
      const c = worldCenter(i), ry = worldYaw(i), d = data.agents.find(x => x.slug === a.slug), A = Object.assign({}, d, { col: hex(a.color), twin: { supplier_count: data.twin.supplier_count, finance }, exhibit: data.exhibits[a.slug] });
      const w = root.HQWorlds.build(a.slug, A); L.worlds.push({ slug: a.slug, c, ry, S: w.S.map(o => place(o, c, ry)), D: w.D, col: hex(a.color) });
      const th = i * 30 + 15, rad = th * Math.PI / 180, rc = (17.5 + R_CAMPUS - 9.5) / 2, len = (R_CAMPUS - 9.5 - 17.5) / 2;
      S.push({ mesh: 'cyl', pos: [c[0], 0.03, c[2]], scale: [12, 0.01, 12], color: [0, 0, 0], alpha: 0.55, blend: 'glass', mat: 'blob' });
      S.push({ mesh: 'box', pos: [Math.cos(rad) * rc, 0.03, Math.sin(rad) * rc], rot: [0, -rad, 0], scale: [len, 0.03, 0.55], color: [0.07, 0.09, 0.1], emis: k(hex(a.color), 0.18) });
    });
    S.push({ mesh: 'torusX', pos: [0, 0.04, 0], scale: [R_CAMPUS - 14, R_CAMPUS - 14, R_CAMPUS - 14], color: [0.4, 0.4, 0.35], emis: [0.22, 0.16, 0.07] });
    twinLayout(data.twin); const C = ROOMS.twin;
    S.push({ mesh: 'cyl', pos: [C[0], -0.1, C[2]], scale: [7.6, 0.3, 7.6], color: [0.04, 0.055, 0.07], grid: 0.7, fres: 0.3 }, { mesh: 'torusX', pos: [C[0], 0.07, C[2]], scale: [7.6, 7.6, 7.6], color: [0.4, 0.45, 0.4], emis: [0.1, 0.35, 0.3] });
  }
  const TWIN_SHAPE = { inventory: (p, c) => [{ mesh: 'box', pos: [p[0], 0.9, p[2]], scale: [0.9, 0.8, 0.9] }, { mesh: 'box', pos: [p[0], 2.1, p[2]], scale: [0.6, 0.4, 0.6] }], procurement: (p, c) => [{ mesh: 'cone', pos: [p[0], 1.4, p[2]], scale: [0.9, 1.4, 0.9], rot: [Math.PI, 0, 0] }, { mesh: 'box', pos: [p[0], 0.25, p[2]], scale: [0.9, 0.25, 0.9] }],
    restaurant: (p, c) => [{ mesh: 'cyl6', pos: [p[0], 0.8, p[2]], scale: [1.0, 0.8, 1.0] }, { mesh: 'sphere', pos: [p[0], 1.6, p[2]], scale: [1.0, 0.6, 1.0] }], brewery: (p, c) => [{ mesh: 'cyl', pos: [p[0] - 0.5, 1.2, p[2]], scale: [0.45, 1.2, 0.45] }, { mesh: 'cyl', pos: [p[0] + 0.5, 1.5, p[2]], scale: [0.45, 1.5, 0.45] }],
    finance: (p, c) => [{ mesh: 'box', pos: [p[0], 2.1, p[2]], scale: [0.5, 2.1, 0.5] }, { mesh: 'box', pos: [p[0], 4.3, p[2]], scale: [0.7, 0.08, 0.7] }], marketing: (p, c) => [{ mesh: 'box', pos: [p[0], 2.0, p[2]], scale: [0.1, 2.0, 0.1] }, { mesh: 'cyl', pos: [p[0], 3.4, p[2]], scale: [0.7, 0.06, 0.7], rot: [0.5, 0, 0] }],
    cx: (p, c) => [{ mesh: 'torusS', pos: [p[0], 1.4, p[2]], scale: [1.0, 1.0, 1.0] }, { mesh: 'sphere', pos: [p[0], 1.4, p[2]], scale: [0.35, 0.35, 0.35] }], executive: (p, c) => [{ mesh: 'cyl6', pos: [p[0], 1.6, p[2]], scale: [1.1, 1.6, 1.1] }, { mesh: 'cone', pos: [p[0], 3.9, p[2]], scale: [0.7, 0.8, 0.7] }] };
  function campusDynamic(O, L, agents, st, t, flags) {
    if (!L.worlds || !L.worlds.length) return;
    const calm = flags.calm, pulse = calm ? 1 : 0.8 + 0.2 * Math.sin(t / 280), slow = calm ? 0 : t / 1000, eye = flags.eye || [0, 30, 40], sel = flags.agent;
    L.worlds.forEach((w, i) => {
      const a = st.agents[w.slug], lvl = { idle: 0.32, active: 1.0, awaiting: 0.85, done: 0.6, blocked: 0.55 }[a.state] + (a.assigned && a.state === 'idle' ? 0.15 : 0), col = a.state === 'blocked' ? RED : a.state === 'awaiting' ? GOLD : w.col;
      const dist = Math.hypot(eye[0] - w.c[0], eye[1] - 6, eye[2] - w.c[2]), near = dist < LOD_DIST || flags.room === 'network';
      if (!near) { O.push({ mesh: 'cone', pos: [w.c[0], 9, w.c[2]], scale: [1.4, 7, 1.4], color: k(w.col, 0.4), emis: k(w.col, 0.35 + 0.65 * (lvl - 0.3)), alpha: 0.7, blend: 'add' }, { mesh: 'torusX', pos: [w.c[0], 0.1, w.c[2]], scale: [8, 8, 8], color: k(w.col, 0.5), emis: k(w.col, 0.6), alpha: 0.8, blend: 'add' }); return; }
      for (let j = 0; j < w.S.length; j++) O.push(w.S[j]);
      O.push({ mesh: 'cyl', pos: [w.c[0], 13, w.c[2]], scale: [0.09, 13, 0.09], color: k(w.col, 0.5), emis: k(w.col, 0.25 + 0.5 * (lvl - 0.3)), alpha: 0.4, blend: 'add' });
      if (flags.room === 'network') O.push({ mesh: 'cone', pos: [w.c[0], 9, w.c[2]], scale: [1.6, 7, 1.6], color: k(w.col, 0.4), emis: k(w.col, 0.4 + 0.6 * (lvl - 0.3)), alpha: 0.55, blend: 'add' });
      const ctx = { lvl, pulse, slow, calm, t, state: a.state, full: st, NODE_COL, col: w.col, ex: flags.ex && flags.ex.slug === w.slug ? flags.ex.p : null }; w.D(ctx).forEach(o => O.push(place(o, w.c, w.ry)));
      if (a.alert) O.push({ mesh: 'sphere', pos: [w.c[0], 11.5, w.c[2]], scale: [0.35, 0.35, 0.35], color: RED, emis: k(RED, 0.9 * pulse) });
      if (sel === w.slug) O.push({ mesh: 'torusX', pos: [w.c[0], 0.2, w.c[2]], scale: [10.2, 10.2, 10.2], color: GOLD, emis: k(GOLD, 0.9), alpha: 0.9, blend: 'add' });
    });
    if (flags.station != null && flags.room === 'lab') { const a = (flags.station / 6) * Math.PI * 1.25 + Math.PI * 0.375 + Math.PI, R = ROOMS.lab; O.push({ mesh: 'torusX', pos: [R[0] + Math.cos(a) * 6.4, 0.2, R[2] + Math.sin(a) * 6.4], scale: [1.3, 1.3, 1.3], color: GOLD, emis: k(GOLD, 0.95), alpha: 0.9, blend: 'add' }); }
    // digital twin district (synthetic): buildings are lit by the state of the agent whose specialty matches, never by invented activity
    if (flags.twin) {
      const C = ROOMS.twin; flags.twin.departments.forEach(dp => { const p = TWIN_POS[dp.id], a = st.agents[dp.agent], lvl = { idle: 0.25, active: 1, awaiting: 0.85, done: 0.55, blocked: 0.5 }[a.state] || 0.25, col = hex(agents.find(x => x.slug === dp.agent).color), sel = flags.dept === dp.id;
        TWIN_SHAPE[dp.id](p, C).forEach(b => O.push(Object.assign({ color: k(col, 0.35), emis: k(col, 0.12 + 0.6 * lvl), fres: 0.9 }, b))); if (sel) O.push({ mesh: 'torusX', pos: [p[0], 0.15, p[2]], scale: [1.9, 1.9, 1.9], color: GOLD, emis: k(GOLD, 0.95), alpha: 0.9, blend: 'add' }); });
      flags.twin.edges.forEach(e => { const a = TWIN_POS[e.src], b = TWIN_POS[e.dst]; if (!a || !b) return; const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), hot = flags.dept && (flags.dept === e.src || flags.dept === e.dst);
        O.push({ mesh: 'box', pos: [(a[0] + b[0]) / 2, 2.6, (a[2] + b[2]) / 2], rot: [0, Math.atan2(-dz, dx), 0], scale: [len / 2, hot ? 0.07 : 0.03, hot ? 0.07 : 0.03], color: hot ? GOLD : TEAL, emis: k(hot ? GOLD : TEAL, hot ? 1 : 0.5), alpha: hot ? 0.95 : 0.6, blend: 'add' }); });
    }
    // spatial operations network: recorded hand-offs between worlds (counted from recordings); a mission filter dims the rest
    if (flags.net) { const mx = Math.max(1, ...flags.net.map(e => e.n));
      flags.net.forEach(e => { const a = L.worlds.find(w => w.slug === e.from), b = L.worlds.find(w => w.slug === e.to); if (!a || !b) return; const dx = b.c[0] - a.c[0], dz = b.c[2] - a.c[2], len = Math.hypot(dx, dz), th = 0.04 + 0.28 * e.n / mx;
        const hot = e.hot, y = 11 + (e.n % 3) * 0.5, ux = dx / len, uz = dz / len, col = hot ? [1, 0.95, 0.6] : GOLD; if (e.hide) return;
        O.push({ mesh: 'box', pos: [(a.c[0] + b.c[0]) / 2, y, (a.c[2] + b.c[2]) / 2], rot: [0, Math.atan2(-dz, dx), 0], scale: [len / 2, th, th], color: col, emis: k(col, e.dim ? 0.12 : 0.55 + 0.45 * e.n / mx + (hot ? 0.3 : 0)), alpha: e.dim ? 0.12 : 0.85, blend: 'add' });
        if (!e.dim) { [[9, 0.34], [7.4, 0.5], [5.8, 0.7]].forEach(([back, r]) => O.push({ mesh: 'sphere', pos: [b.c[0] - ux * back, y, b.c[2] - uz * back], scale: [r, r, r], color: col, emis: k(col, 1) })); if (!flags.calm) { const f = ((flags.t0 || 0) / 2600 + (e.n * 0.137)) % 1; O.push({ mesh: 'sphere', pos: [a.c[0] + dx * f, y, a.c[2] + dz * f], scale: [0.45, 0.45, 0.45], color: col, emis: k(col, 1) }); } } });
      L.worlds.forEach(w => O.push({ mesh: 'cyl', pos: [w.c[0], 5.5, w.c[2]], scale: [0.14, 5.5, 0.14], color: k(w.col, 0.5), emis: k(w.col, 0.5), alpha: 0.5, blend: 'add' })); }
  }
  function pickTargets(L) {
    const T = L.pylons.map(p => ({ id: 'agent:' + p.slug, c: [p.pos[0], 2.0, p.pos[2]], h: [0.9, 2.2, 0.9] }));
    T.push({ id: 'room:atrium', c: [0, 3.2, 0], h: [2.1, 3.4, 2.1] }, { id: 'room:control', c: [-34, 3, 0], h: [3.5, 3.4, 3.5] }, { id: 'room:lab', c: [34, 2.5, 0], h: [3.5, 2.6, 3.5] }, { id: 'room:weir', c: [0, 5, -34], h: [6.2, 5, 1.6] });
    (L.worlds || []).forEach(w => T.push({ id: 'world:' + w.slug, c: [w.c[0], 5, w.c[2]], h: [7, 6, 7] }));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 1.25 + Math.PI * 0.375 + Math.PI, R = ROOMS.lab; T.push({ id: 'station:' + i, c: [R[0] + Math.cos(a) * 6.4, 1.6, R[2] + Math.sin(a) * 6.4], h: [0.9, 1.6, 0.9] }); }
    Object.entries(TWIN_POS).forEach(([id, p]) => T.push({ id: 'dept:' + id, c: [p[0], 1.8, p[2]], h: [1.2, 2.0, 1.2] }));
    return T;
  }
  root.HQScene = { ROOMS, PRESETS, INTRO, agentPreset, worldCenter, TWIN_POS, R_CAMPUS, layout, buildStatic, buildDynamic, pickTargets, theaterLayout, hex, ease };
})(typeof self !== 'undefined' ? self : this);
