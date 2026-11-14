/* A small WebGL1 scene engine for the Living Headquarters (no library, no assets: every mesh is generated here). One shader does lighting, fresnel "glass" edges, floor grid, sky gradient and fog.
   Draw order: opaque, then alpha-blended glass (back to front), then additive glow. Instrumentation (frame time, draw calls, triangles) is built in. */
(function (root) {
  'use strict';
  const V = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  };
  const mul = (a, b) => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const persp = (f, a, n, fa) => { const t = 1 / Math.tan(f / 2), o = new Float32Array(16); o[0] = t / a; o[5] = t; o[10] = (fa + n) / (n - fa); o[11] = -1; o[14] = 2 * fa * n / (n - fa); return o; };
  const look = (e, c) => { const z = V.norm(V.sub(e, c)), x = V.norm(V.cross([0, 1, 0], z)), y = V.cross(z, x), o = new Float32Array(16); o.set([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V.dot(x, e), -V.dot(y, e), -V.dot(z, e), 1]); return o; };
  function model(pos, rot, sc) {                                         // T * Ry * Rx * Rz * S, column-major
    const [x, y, z] = rot || [0, 0, 0], cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
    const r00 = cy * cz + sy * sx * sz, r01 = cz * sy * sx - cy * sz, r02 = cx * sy, r10 = cx * sz, r11 = cx * cz, r12 = -sx, r20 = cy * sx * sz - cz * sy, r21 = sy * sz + cy * cz * sx, r22 = cy * cx;
    const s = sc || [1, 1, 1], o = new Float32Array(16);
    o[0] = r00 * s[0]; o[1] = r10 * s[0]; o[2] = r20 * s[0]; o[4] = r01 * s[1]; o[5] = r11 * s[1]; o[6] = r21 * s[1]; o[8] = r02 * s[2]; o[9] = r12 * s[2]; o[10] = r22 * s[2]; o[12] = pos[0]; o[13] = pos[1]; o[14] = pos[2]; o[15] = 1;
    return o;
  }
  function normalMat(m) {                                                // inverse transpose of the upper 3x3 (correct under non-uniform scale)
    const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C || 1, id = 1 / det;
    return new Float32Array([A * id, (c * h - b * i) * id, (b * f - c * e) * id, B * id, (a * i - c * g) * id, (c * d - a * f) * id, C * id, (b * g - a * h) * id, (a * e - b * d) * id]);
  }
  /* ---------- procedural meshes: interleaved [px,py,pz,nx,ny,nz], triangles, non-indexed ---------- */
  const tri = (out, a, b, c, n) => { const nn = n || V.norm(V.cross(V.sub(b, a), V.sub(c, a))); out.push(...a, ...nn, ...b, ...nn, ...c, ...nn); };
  function box() { const o = [], f = [[[0, 0, 1], [0, 1, 0], [1, 0, 0]], [[0, 0, -1], [0, 1, 0], [-1, 0, 0]], [[1, 0, 0], [0, 1, 0], [0, 0, -1]], [[-1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, -1], [1, 0, 0]], [[0, -1, 0], [0, 0, 1], [1, 0, 0]]];
    f.forEach(([n, u, w]) => { const p = (a, b) => [n[0] + u[0] * a + w[0] * b, n[1] + u[1] * a + w[1] * b, n[2] + u[2] * a + w[2] * b]; tri(o, p(-1, -1), p(1, -1), p(1, 1), n); tri(o, p(-1, -1), p(1, 1), p(-1, 1), n); }); return o; }
  function cylinder(seg, top) { const o = [], t = top == null ? 1 : top;                  // unit height 2 (y -1..1), radius 1 at the bottom and `top` at the top
    for (let i = 0; i < seg; i++) { const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const sl = 1 - t, n0 = V.norm([c0, sl / 2, s0]), n1 = V.norm([c1, sl / 2, s1]);
      o.push(c0, -1, s0, ...n0, c1, -1, s1, ...n1, c1 * t, 1, s1 * t, ...n1, c0, -1, s0, ...n0, c1 * t, 1, s1 * t, ...n1, c0 * t, 1, s0 * t, ...n0);
      tri(o, [0, -1, 0], [c1, -1, s1], [c0, -1, s0], [0, -1, 0]); if (t > 0) tri(o, [0, 1, 0], [c0 * t, 1, s0 * t], [c1 * t, 1, s1 * t], [0, 1, 0]); }
    return o; }
  function torus(R, r, sr, ss) { const o = [], P = (i, j) => { const u = i / sr * Math.PI * 2, v = j / ss * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v); return [[(R + r * cv) * cu, r * sv, (R + r * cv) * su], [cv * cu, sv, cv * su]]; };
    for (let i = 0; i < sr; i++) for (let j = 0; j < ss; j++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); [[a, b, c], [a, c, d]].forEach(t => t.forEach(q => o.push(...q[0], ...q[1]))); } return o; }
  function sphere(la, lo) { const o = [], P = (i, j) => { const v = i / la * Math.PI, u = j / lo * Math.PI * 2, p = [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)]; return [p, p]; };
    for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); [[a, c, b], [a, d, c]].forEach(t => t.forEach(q => o.push(...q[0], ...q[1]))); } return o; }
  const MATS = { metal: 1, glass: 2, stone: 3, copper: 4, ceramic: 5, frost: 6, blob: 9 };
  const SRC = {
    vs: 'attribute vec3 aP;attribute vec3 aN;uniform mat4 uVP,uM;uniform mat3 uN;varying vec3 vN,vW;void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=normalize(uN*aN);gl_Position=uVP*w;}',
    fs: '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n'
      + 'varying vec3 vN,vW;uniform vec3 uColor,uEmis,uCam,uFog,uObj;uniform float uAlpha,uFres,uFogD,uGrid,uSky,uTime,uMat,uRad,uQ;'
      + 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'
      + 'vec3 sky(vec3 d){float t=clamp(d.y*1.6+.15,0.,1.);vec3 c=mix(vec3(.10,.07,.11),vec3(.015,.03,.05),t);c+=vec3(.55,.30,.12)*pow(max(0.,1.-abs(d.y+.02)*5.),2.)*.55;return c;}'
      + 'void main(){vec3 n=normalize(vN);'
      + 'if(uSky>.5){vec3 d=normalize(vW-uCam);vec3 col=sky(d);vec2 g=floor(vec2(atan(d.z,d.x)*700.,d.y*700.));float s=step(.9992,h(g));col+=s*vec3(.8,.85,1.)*step(.02,d.y);gl_FragColor=vec4(col,1.);return;}'
      + 'if(uMat>8.5){float d=length(vW.xz-uObj.xz)/uRad;float a=uAlpha*pow(clamp(1.-d,0.,1.),1.7);gl_FragColor=vec4(0.,0.,0.,a);return;}'
      + 'if(uQ<.5){float d=max(dot(n,normalize(vec3(.38,.5,.52))),0.);vec3 c=uColor*(.22+.75*d)+uEmis;float f=1.-exp(-length(uCam-vW)*uFogD);gl_FragColor=vec4(mix(c,uFog,f),uAlpha);return;}'
      + 'vec3 v=normalize(uCam-vW);vec3 L=normalize(vec3(.38,.5,.52));float df=max(dot(n,L),0.);vec3 key=vec3(1.,.80,.60);'
      + 'vec3 hemi=mix(vec3(.030,.040,.058),vec3(.16,.20,.27),n.y*.5+.5);float ao=mix(.5,1.,smoothstep(0.,3.2,vW.y));'
      + 'vec3 col=uColor*(hemi+.82*df*key)*ao;vec3 Hh=normalize(L+v);float nh=max(dot(n,Hh),0.);float nv=max(dot(n,v),0.);float rim=pow(1.-nv,2.);'
      + 'float spec=0.,refl=0.;'
      + 'if(uMat>.5&&uMat<1.5){float br=.62+.38*h(vec2(floor(vW.y*46.),floor((vW.x+vW.z)*4.)));spec=pow(nh,16.)*.85*br;refl=.34*br;col=uColor*(hemi*1.2+.55*df*key)*ao;}'
      + 'else if(uMat<2.5&&uMat>1.5){refl=.62;spec=pow(nh,90.)*1.3;}'
      + 'else if(uMat<3.5&&uMat>2.5){float g=.78+.44*h(floor(vW.xz*2.6)+floor(vW.y*2.6));col*=g;spec=pow(nh,70.)*.75;refl=.2;}'
      + 'else if(uMat<4.5&&uMat>3.5){col=uColor*vec3(1.12,.74,.46)*(hemi+.75*df*key)*ao;spec=pow(nh,22.)*.9;refl=.32;}'
      + 'else if(uMat<5.5&&uMat>4.5){spec=pow(nh,42.)*.55;refl=.1;col+=uColor*.07;}'
      + 'else if(uMat>5.5){col+=vec3(.05);spec=pow(nh,8.)*.16;refl=.05;}'
      + 'col+=sky(reflect(-v,n))*refl*(.3+.7*rim)*uQ+spec*key*uQ;float rf=(uMat>2.5&&uMat<3.5)?.28:((uMat>.5&&uMat<1.5)?.6:1.);col+=rim*uFres*rf*(uColor*1.3+vec3(.25,.45,.5)*.3)+uEmis;'
      + 'if(uGrid>0.){float r=length(vW.xz);vec2 q=abs(fract(vW.xz*.5)-.5);float line=step(.47,max(q.x,q.y));col+=line*vec3(.05,.22,.25)*uGrid*exp(-r*.045);col+=uGrid*exp(-r*.11)*vec3(.10,.07,.03);float ring=step(.97,fract(r*.18))*exp(-r*.06);col+=ring*vec3(.5,.35,.15)*.35*uGrid;}'
      + 'float dist=length(uCam-vW);float lowf=exp(-max(vW.y,0.)*.06);float fg=1.-exp(-dist*uFogD*(.65+1.1*lowf));vec3 fc=mix(uFog,vec3(.15,.095,.085),lowf*.85);col=mix(col,fc,fg);gl_FragColor=vec4(col,uAlpha);}'
  };
  const PSRC = {
    vs: 'attribute vec4 aP;uniform mat4 uVP;uniform float uTime,uSize;uniform vec3 uCam;varying float vA;void main(){vec3 p=aP.xyz;float s=aP.w;p.y=mod(p.y+uTime*.0005*(.4+s)+s*30.,24.);p.x+=sin(uTime*.0003+s*20.)*1.4;p.z+=cos(uTime*.0004+s*17.)*1.4;gl_Position=uVP*vec4(p,1.);float d=length(uCam-p);gl_PointSize=clamp(uSize*70./d,1.,4.5);vA=(.22+.5*fract(s*7.+uTime*.0002))*smoothstep(0.,4.,p.y)*smoothstep(24.,17.,p.y)*smoothstep(260.,60.,d);}',
    fs: 'precision mediump float;varying float vA;void main(){float r=length(gl_PointCoord-.5)*2.;float a=vA*(1.-smoothstep(.15,1.,r));gl_FragColor=vec4(vec3(1.,.78,.52)*a,a);}'
  };
  function create(canvas, opts) {
    opts = opts || {};
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: !!opts.preserve }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, SRC.vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SRC.fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const U = {}; ['uVP', 'uM', 'uN', 'uColor', 'uEmis', 'uCam', 'uFog', 'uAlpha', 'uFres', 'uFogD', 'uGrid', 'uSky', 'uTime', 'uMat', 'uObj', 'uRad', 'uQ'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
    const aP = gl.getAttribLocation(prog, 'aP'), aN = gl.getAttribLocation(prog, 'aN'); gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aN);
    const meshes = {}, mk = (name, data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); meshes[name] = { b, n: data.length / 6 }; };
    mk('box', box()); mk('cyl', cylinder(28)); mk('cyl6', cylinder(6)); mk('cone', cylinder(28, 0)); mk('torus', torus(1, 0.08, 56, 10)); mk('torusS', torus(1, 0.03, 64, 8)); mk('torusX', torus(1, 0.006, 96, 6)); mk('sphere', sphere(14, 20)); mk('sky', sphere(10, 16));
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    // ambient motes: one buffer, one draw call, animated entirely on the GPU
    const psh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pprog = gl.createProgram(); gl.attachShader(pprog, psh(gl.VERTEX_SHADER, PSRC.vs)); gl.attachShader(pprog, psh(gl.FRAGMENT_SHADER, PSRC.fs)); gl.linkProgram(pprog);
    const PU = {}; ['uVP', 'uTime', 'uSize', 'uCam'].forEach(k => { PU[k] = gl.getUniformLocation(pprog, k); }); const pA = gl.getAttribLocation(pprog, 'aP'); const NP = opts.motes == null ? 420 : opts.motes;
    const pd = new Float32Array(NP * 4); for (let i = 0; i < NP; i++) { const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12543.1357, c = Math.sin(i * 39.346) * 28734.5453, f = x => x - Math.floor(x), r = 12 + 85 * Math.sqrt(f(a)), t = f(b) * 6.2832; pd[i * 4] = Math.cos(t) * r; pd[i * 4 + 1] = f(c) * 24; pd[i * 4 + 2] = Math.sin(t) * r; pd[i * 4 + 3] = f(a * 3.1 + b); }
    const pbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pbuf); gl.bufferData(gl.ARRAY_BUFFER, pd, gl.STATIC_DRAW);
    const stats = { frames: 0, draws: 0, tris: 0, win: [], last: 0 };
    let lost = false; canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; }); canvas.addEventListener('webglcontextrestored', () => { lost = false; });
    function resize(dprCap) { const r = Math.min(window.devicePixelRatio || 1, dprCap || 1.5), w = Math.max(2, Math.floor(canvas.clientWidth * r)), h = Math.max(2, Math.floor(canvas.clientHeight * r)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } gl.viewport(0, 0, canvas.width, canvas.height); }
    const setObj = (o, cam, t) => {
      const m = o.m || (o.m = model(o.pos, o.rot, o.scale)); gl.uniformMatrix4fv(U.uM, false, m); gl.uniformMatrix3fv(U.uN, false, o.nm || (o.nm = normalMat(m)));
      gl.uniform3fv(U.uColor, o.color || [.5, .5, .5]); gl.uniform3fv(U.uEmis, o.emis || [0, 0, 0]); gl.uniform1f(U.uAlpha, o.alpha == null ? 1 : o.alpha); gl.uniform1f(U.uFres, o.fres || 0); gl.uniform1f(U.uGrid, o.grid || 0); gl.uniform1f(U.uSky, 0);
      const mt = o.mat == null ? (o.blend === 'glass' ? 2 : 0) : typeof o.mat === 'string' ? MATS[o.mat] || 0 : o.mat; gl.uniform1f(U.uMat, mt); if (mt === 9) { gl.uniform3fv(U.uObj, o.pos); gl.uniform1f(U.uRad, o.scale[0]); }
    };
    const drawMesh = name => { const m = meshes[name]; gl.bindBuffer(gl.ARRAY_BUFFER, m.b); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 24, 12); gl.drawArrays(gl.TRIANGLES, 0, m.n); stats.draws++; stats.tris += m.n / 3; };
    /* scene: array of {mesh,pos,rot,scale,color,emis,alpha,fres,grid,blend:'opaque'|'glass'|'add', dyn:true when the transform changes per frame} */
    function render(scene, camState, time, fx) {
      fx = fx || {};
      if (lost) return;
      const asp = canvas.width / canvas.height, eye = camState.eye, VP = mul(persp(camState.fov || 0.9, asp, 0.5, 400), look(eye, camState.target));
      stats.draws = 0; stats.tris = 0; gl.clearColor(0.02, 0.03, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniform3fv(U.uCam, eye); gl.uniform3fv(U.uFog, [0.03, 0.045, 0.06]); gl.uniform1f(U.uFogD, 0.0095); gl.uniform1f(U.uTime, time || 0); gl.uniform1f(U.uQ, fx.lowQuality ? 0 : 1);
      // sky
      gl.disable(gl.CULL_FACE); gl.depthMask(false); const sk = { pos: eye, scale: [200, 200, 200], rot: [0, 0, 0] }; sk.m = model(eye, [0, 0, 0], [200, 200, 200]); sk.nm = normalMat(sk.m); setObj(sk); gl.uniform1f(U.uSky, 1); gl.uniform3fv(U.uCam, eye); drawMesh('sky'); gl.depthMask(true); gl.enable(gl.CULL_FACE);
      const op = [], gl2 = [], ad = []; scene.forEach(o => (o.blend === 'add' ? ad : o.blend === 'glass' ? gl2 : op).push(o));
      gl.disable(gl.BLEND); op.forEach(o => { setObj(o); drawMesh(o.mesh); });
      const dist = o => { const p = o.pos; return (p[0] - eye[0]) ** 2 + (p[1] - eye[1]) ** 2 + (p[2] - eye[2]) ** 2; };
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl2.sort((a, b) => dist(b) - dist(a)).forEach(o => { setObj(o); drawMesh(o.mesh); });
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); ad.forEach(o => { setObj(o); drawMesh(o.mesh); });
      if (fx.particles && NP) { gl.useProgram(pprog); gl.uniformMatrix4fv(PU.uVP, false, VP); gl.uniform1f(PU.uTime, fx.calm ? 4000 : time || 0); gl.uniform1f(PU.uSize, 1.6); gl.uniform3fv(PU.uCam, eye); gl.bindBuffer(gl.ARRAY_BUFFER, pbuf); gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aN); gl.enableVertexAttribArray(pA); gl.vertexAttribPointer(pA, 4, gl.FLOAT, false, 16, 0); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.drawArrays(gl.POINTS, 0, NP); stats.draws++; gl.disableVertexAttribArray(pA); gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aN); gl.useProgram(prog); }
      gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.disable(gl.BLEND);
      if (stats.last) { stats.win.push(time - stats.last); if (stats.win.length > 90) stats.win.shift(); } stats.last = time; stats.frames++;
    }
    function project(p, camState) { const asp = canvas.clientWidth / canvas.clientHeight, v = mul(persp(camState.fov || 0.9, asp, 0.5, 400), look(camState.eye, camState.target)), x = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12], y = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13], w = v[3] * p[0] + v[7] * p[1] + v[11] * p[2] + v[15];
      return w <= 0 ? null : [(x / w * 0.5 + 0.5) * canvas.clientWidth, (0.5 - y / w * 0.5) * canvas.clientHeight, w]; }
    function dispose() { Object.values(meshes).forEach(m => gl.deleteBuffer(m.b)); gl.deleteProgram(prog); const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
    const info = () => { const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'hidden by the browser'; };
    return { gl, render, resize, project, dispose, stats, info, model, V, mul };
  }
  root.HQGL = { create, model, V };
})(typeof self !== 'undefined' ? self : this);
