/**
 * MGP.sceneTanker \u2014 a product tanker berths at an oil jetty in one take (vector 3D, flat 3-tone shading).
 *
 * Extracted from the website demo `tanker(el)` in guide/js/demos-skills.js (hull, box, window, Hermite key helpers,
 * terrain ring helpers from the space3d.py port). Slider / chips / drag became options; the frame is drawn from t alone:
 * the tanker approaches on a slant, slows and straightens, a tug swings in and pushes it sideways onto the fenders,
 * six mooring lines are thrown and hove tight one by one, then the two loading arms reach the manifold.
 *
 * World in metres: x along the quay, y up (water 0), z off the quay face (water z > 0, land z < 0).
 * Ship frame: u forward, v up, w to starboard (quay on the port side).
 *
 * Options (defaults):
 *   width, height      1280 x 720
 *   duration           46      seconds of action (the demo's DUR)
 *   hold               3       seconds held on the final moored frame (total duration = duration + hold, or beats.arms + hold)
 *   beats              null    {approach, turn, push, moor, arms} seconds at which each beat ends; default fractions of
 *                              duration 0.36, 0.60, 0.75, 0.93, 1.0 (approach, slow & straighten, tug push to contact,
 *                              mooring lines done, loading arms connected). Time between beats is remapped linearly.
 *   sky                "siang" | "senja"  time of day (dusk lights the lamps, windows, glints)
 *   palette            {}      overrides of the sky / sea / land palette: top, mid, hor, sunC, w0, w1, wave, hill, hillN,
 *                              land, far, quay, glint ("rgba(r,g,b," prefixes for sunC/wave/glint), lamp (0/1)
 *   sun                null    [azimuth, elevation] in degrees (default siang [205, 38], senja [258, 5])
 *   ship               {}      tanker colours: hull, boot, deck, deckDusk, house, houseTop, funnel, funnelTop, boats,
 *                              walkway, walkwayDusk, pipes, manifold, catwalk, mast, windows, windowsLit
 *   tug                {}      tug colours: hull, fender, deck, house, funnel, mast
 *   jetty              {}      quay colours: fender, fenderLit, bollard, edge, pipes[3], lampPost, arm, armRiser, armBase,
 *                              line, lineTight, tank, tankAlt, tankDusk, tankAltDusk, tankTop, tankTopDusk, shed, shedRoof,
 *                              tree, treeDusk, trunk
 *   camera             "udara" preset name ("udara" | "laut" | "ujung" | "darat") or {az, el, d}
 *   cameraKeys         null    [[t, presetOrObj], ...] smooth camera moves through keys (seconds); overrides camera
 *   cameraInterp       "euler" "slerp" = interpolate the view direction on a great circle (quaternion slerp) instead of az/el lerp
 *   seed               5       trees / waves / mountain ridges
 *   labels             false   names on the mooring lines
 *   lineNames          the six mooring line names (Bahasa Indonesia)
 *   caption            false   phase + speed readout bottom-left
 *   font               "ui-monospace, Menlo, Consolas, monospace"
 *
 * Methods: inst.draw(t)/seek(t), inst.timeline(); api.render(ctx, t, opts).
 * api.lib = { PRESETS, SKY, hullHB, hullDH, hullPt, hullLoop, keyed, drawBox, drawMesh, tubeGrid, winQuad, polyline3,
 *             pnoise, mtProfile, ringScr, ellipseXZ, stripXZ, softabs, hazeT, light2d, state(t, opts) -> {u, ship, tug, knots, phase, lines, gap} }
 *
 * Example:
 *   const tk = MGP.sceneTanker.create("#stage", { sky: "senja", cameraKeys: [[0, "laut"], [20, "udara"], [40, "ujung"]] });
 *   MGP.core.expose(tk);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const { clamp, lerp, smooth01, mix, rgba, rng, camOrbit, camC, scr, horizonY, sunDir, clipNear, polyScr, dot3, cross3 } = C;
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const nrm3 = (a) => { const m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; };
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const hermite = (p0, p1, m0, m1, t) => { const t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1; };
  const fmt = (v, d = 2) => (+v).toFixed(d).replace(".", ",");
  const INK = "#1f1526";
  function lines(g, p, close = true) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); if (close) g.closePath(); }

  /* ---------------- terrain helpers (space3d.py port, module-local) ---------------- */
  const light2d = (c, s) => { const lx = dot3(s, c.right), ly = dot3(s, c.up), n = Math.hypot(lx, ly) || 1; return [lx / n, ly / n]; };
  const hazeT = (d, d0 = 15, D = 400, tmax = 0.6) => (d <= d0 ? 0 : tmax * (1 - Math.exp(-(d - d0) / D)));
  function ellipseXZ(cx, cz, a, b, ang = 0, n = 40, wob = 0, seed = 0) {
    const r = rng(seed + 1), ph = [r() * TAU, r() * TAU], ca = Math.cos(ang), sa = Math.sin(ang), out = [];
    for (let i = 0; i < n; i++) { const t = TAU * i / n, k = 1 + wob * (0.6 * Math.sin(3 * t + ph[0]) + 0.4 * Math.sin(5 * t + ph[1])), u = a * k * Math.cos(t), v = b * k * Math.sin(t); out.push([cx + u * ca - v * sa, cz + u * sa + v * ca]); }
    return out;
  }
  function stripXZ(pts, wd) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)], d = [b[0] - a[0], b[1] - a[1]], m = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / m, d[0] / m]; L.push([pts[i][0] + n[0] * wd / 2, pts[i][1] + n[1] * wd / 2]); R.push([pts[i][0] - n[0] * wd / 2, pts[i][1] - n[1] * wd / 2]); }
    return L.concat(R.reverse());
  }
  function pnoise(r, k) { const vals = Array.from({ length: k }, () => r()); return (u) => { const x = (((u % 1) + 1) % 1) * k, i = Math.floor(x), t = x - i, t2 = (1 - Math.cos(Math.PI * t)) / 2; return vals[i % k] * (1 - t2) + vals[(i + 1) % k] * t2; }; }
  const softabs = (d, c) => Math.sqrt(d * d + c * c) - c;
  function mtProfile(seed, n, base, amp, o = {}) {
    const octs = o.octs || [[5, 1], [11, 0.5], [23, 0.26], [47, 0.14], [97, 0.07], [193, 0.035]], power = o.power || 1.3;
    const r = rng(seed), fs = octs.map(([k, a]) => [pnoise(r, k), a]), tot = octs.reduce((s, x) => s + x[1], 0), rough = [[61, 1], [131, 0.5], [263, 0.25]].map(([k, a]) => [pnoise(r, k), a]);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const az = 360 * i / n, u = az / 360, v = fs.reduce((s, [f, a]) => s + f(u) * a, 0) / tot, rr = rough.reduce((s, [f, a]) => s + f(u) * a, 0) / 1.75 - 0.5;
      let h = base + amp * Math.pow(v, power);
      for (const [az0, hp, w, cap] of o.peaks || []) { const d = softabs(((az - az0 + 540) % 360) - 180, cap * w); if (d < w) { const k = 1 - d / w; h = Math.max(h, hp * (0.42 * k + 0.58 * Math.pow(k, 2.4)) * (1 + 0.1 * rr * (1 - k))); } }
      for (const [az0, hv, w] of o.volcanoes || []) { const dd = ((az - az0 + 540) % 360) - 180, d = softabs(dd, 0.07 * w); if (d < w) { const k = 1 - d / w; let vv = hv * Math.pow(k, 1.75) * (1 + 0.05 * rr * (1 - k) * 4); vv -= hv * 0.018 * Math.exp(-Math.pow(dd / (0.05 * w), 2)); h = Math.max(h, vv); } }
      out.push([az, h + amp * 0.035 * rr]);
    }
    return out;
  }
  function ringScr(c, R, prof, margin = 0.35) {
    const n = prof.length, top = [], bot = [], vis = [];
    for (const [az, h] of prof) { const a = az * RAD, x = R * Math.sin(a), z = R * Math.cos(a), t = camC(c, [x, h, z]), b = camC(c, [x, 0, z]); top.push(t); bot.push(b); vis.push(t[2] > margin * R && b[2] > margin * R); }
    if (!vis.some(Boolean)) return null;
    let idx;
    if (vis.every(Boolean)) idx = [...Array(n).keys()];
    else { const s0 = vis.indexOf(false), runs = []; let cur = []; for (let k = 0; k < n; k++) { const i = (s0 + k) % n; if (vis[i]) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } } if (cur.length) runs.push(cur); idx = runs.reduce((a, b) => (b.length > a.length ? b : a)); }
    if (idx.length < 2) return null;
    return idx.map((i) => scr(c, top[i])).concat(idx.slice().reverse().map((i) => scr(c, bot[i])));
  }

  /* ---------------- mesh helpers ---------------- */
  function tubeGrid(ctrl, cols, caps = [false, false], pw = 2) {
    const n = ctrl.length;
    let rings = ctrl.map((k, i) => ({ c: k.c, a: k.a, b: k.b, t: nrm3(sub3(ctrl[Math.min(n - 1, i + 1)].c, ctrl[Math.max(0, i - 1)].c)) }));
    const capR = (k, dir) => [[0.5, 0.87], [0.82, 0.57], [0.97, 0.22]].map(([o, s]) => ({ c: add3(k.c, k.t, dir * o * (k.a + k.b) / 2), a: k.a * s, b: k.b * s, t: k.t }));
    if (caps[0]) rings = capR(rings[0], -1).reverse().concat(rings);
    if (caps[1]) rings = rings.concat(capR(rings[rings.length - 1], 1));
    const pts = [], ex = 2 / pw;
    for (const r of rings) {
      let L = Math.abs(r.t[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]; const d = dot3(L, r.t); L = nrm3([L[0] - d * r.t[0], L[1] - d * r.t[1], L[2] - d * r.t[2]]); const V = cross3(r.t, L);
      for (let j = 0; j < cols; j++) { const th = TAU * j / cols, c = Math.cos(th), s = Math.sin(th), cx = Math.sign(c) * Math.pow(Math.abs(c), ex), sy = Math.sign(s) * Math.pow(Math.abs(s), ex); pts.push([r.c[0] + L[0] * r.a * cx + V[0] * r.b * sy, r.c[1] + L[1] * r.a * cx + V[1] * r.b * sy, r.c[2] + L[2] * r.a * cx + V[2] * r.b * sy]); }
    }
    return { pts, rows: rings.length, cols };
  }
  // one mesh: union silhouette (ink rim by stroke-then-fill), shadow side and lit side clipped at the terminator
  function drawMesh(g, cam, M, sun, col, o = {}) {
    const { rows, cols, pts: P } = M, N = rows * cols, S = new Array(N);
    for (let i = 0; i < N; i++) { const q = camC(cam, P[i]); if (q[2] < cam.near) return; S[i] = scr(cam, q); }
    const VN = new Float64Array(N * 3), Q = [];
    let cen = [0, 0, 0]; for (const p of P) cen = add3(cen, p, 1 / N);
    let sgn = 0;
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols; j++) {
      const a = i * cols + j, b = (i + 1) * cols + j, c = (i + 1) * cols + ((j + 1) % cols), d = i * cols + ((j + 1) % cols);
      const n = cross3(sub3(P[c], P[a]), sub3(P[d], P[b])), m = [(P[a][0] + P[c][0]) / 2, (P[a][1] + P[c][1]) / 2, (P[a][2] + P[c][2]) / 2];
      sgn += dot3(n, sub3(m, cen)); Q.push([a, b, c, d, n, m]);
    }
    sgn = sgn < 0 ? -1 : 1;
    for (const q of Q) { q[4] = [q[4][0] * sgn, q[4][1] * sgn, q[4][2] * sgn]; for (let k = 0; k < 4; k++) { const v = q[k] * 3; VN[v] += q[4][0]; VN[v + 1] += q[4][1]; VN[v + 2] += q[4][2]; } }
    const lam = new Float64Array(N); for (let i = 0; i < N; i++) { const n = nrm3([VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2]]); lam[i] = dot3(n, sun); }
    const addPoly = (pp) => { if (pp.length < 3) return; let A = 0; for (let k = 0; k < pp.length; k++) { const p1 = pp[k], p2 = pp[(k + 1) % pp.length]; A += p1[0] * p2[1] - p2[0] * p1[1]; } if (A < 0) pp = pp.slice().reverse(); g.moveTo(pp[0][0], pp[0][1]); for (let k = 1; k < pp.length; k++) g.lineTo(pp[k][0], pp[k][1]); g.closePath(); };
    const vis = Q.map((q) => dot3(q[4], sub3(q[5], cam.pos)) < 0);
    const want = (k) => (o.face === "front" ? vis[k] : o.face === "back" ? !vis[k] : true);
    g.beginPath(); Q.forEach((q, k) => { if (want(k)) addPoly([S[q[0]], S[q[1]], S[q[2]], S[q[3]]]); });
    if (o.ink !== false && o.lw > 0) { g.lineJoin = "round"; g.lineWidth = o.lw * 2; g.strokeStyle = o.inkCol || rgba(INK, 0.62); g.stroke(); }
    g.fillStyle = col; g.fill();
    if (o.face === "back") return;
    const band = (f, fill) => {
      g.beginPath();
      Q.forEach((q, k) => {
        if (!vis[k]) return;
        const v = [f(q[0]), f(q[1]), f(q[2]), f(q[3])];
        if (v[0] > 0 && v[1] > 0 && v[2] > 0 && v[3] > 0) return;
        const out = [];
        for (let e = 0; e < 4; e++) { const fa = v[e], fb = v[(e + 1) % 4], A = S[q[e]], B = S[q[(e + 1) % 4]]; if (fa <= 0) out.push(A); if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } }
        addPoly(out);
      });
      g.fillStyle = fill; g.fill();
    };
    const thr = o.thr === undefined ? 0.02 : o.thr;
    band((i) => lam[i] - thr, o.dark || mix(col, "#4a2848", 0.3));
    if (o.light !== false) band((i) => (o.lthr || 0.8) - lam[i], o.lightCol || rgba(mix(col, "#fff3d6", 0.5), 0.45));
  }

  /* ---------------- hull / box / key helpers (from the demo) ---------------- */
  function hullHB(Hs, u) {
    const bs = Hs.L / 2 - Hs.bow; if (u > bs) { const k = (u - bs) / Hs.bow; return Hs.B / 2 * Math.pow(Math.max(0, 1 - k * k), 0.55); }
    const ss = -Hs.L / 2 + Hs.stern; if (u < ss) { const k = (ss - u) / Hs.stern; return Hs.B / 2 * (1 - Hs.tr * k * k); }
    return Hs.B / 2;
  }
  const hullDH = (Hs, u) => Hs.fb + Hs.sheer * smooth01((u - (Hs.L / 2 - Hs.bow * 1.3)) / (Hs.bow * 1.3)) + Hs.sheerA * smooth01((-Hs.L / 2 + Hs.stern * 1.6 - u) / (Hs.stern * 1.6));
  function hullPt(Hs, s, side, v, grow = 0) {
    const u0 = -Hs.L / 2 + Hs.L * s, dh = hullDH(Hs, u0), vf = clamp(v / dh, 0, 1.3), bw = smooth01((u0 - (Hs.L / 2 - Hs.bow)) / Hs.bow);
    return [u0 + Hs.rake * vf * bw, v, side * (hullHB(Hs, u0) * (1 + Hs.flare * vf * bw) + grow)];
  }
  function hullLoop(Hs, N, vfn, grow = 0) {
    const out = [];
    for (let k = 0; k <= N; k++) { const s = Math.pow(k / N, 0.92), u0 = -Hs.L / 2 + Hs.L * s; out.push(hullPt(Hs, s, 1, vfn(u0), grow)); }
    for (let k = N - 1; k >= 0; k--) { const s = Math.pow(k / N, 0.92), u0 = -Hs.L / 2 + Hs.L * s; out.push(hullPt(Hs, s, -1, vfn(u0), grow)); }
    return out;
  }
  const ribbon = (Hs, N, rowsV, T, grow = 0) => { const rows = rowsV.map((fn) => hullLoop(Hs, N, fn, grow)); const cols = rows[0].length; return { rows: rows.length, cols, pts: [].concat(...rows).map(T) }; };
  const BOXF = [[[0, 4, 6, 2], [-1, 0, 0]], [[1, 3, 7, 5], [1, 0, 0]], [[0, 1, 5, 4], [0, -1, 0]], [[2, 6, 7, 3], [0, 1, 0]], [[0, 2, 3, 1], [0, 0, -1]], [[4, 5, 7, 6], [0, 0, 1]]];
  const polyScrN = (c, pts3, near) => { const cs = clipNear(pts3.map((P) => camC(c, P)), near); return cs.length < 3 ? null : cs.map((q) => scr(c, q)); };
  function drawBox(g, cam, T, b, col, sun, o = {}) {
    const c = []; for (let i = 0; i < 8; i++) c.push(T([i & 1 ? b[1] : b[0], i & 2 ? b[3] : b[2], i & 4 ? b[5] : b[4]]));
    const ctr = T([(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2]);
    for (const [ix, n] of BOXF) {
      const fc = [0, 1, 2].map((k) => (c[ix[0]][k] + c[ix[1]][k] + c[ix[2]][k] + c[ix[3]][k]) / 4), nW = nrm3(sub3(T([(b[0] + b[1]) / 2 + n[0], (b[2] + b[3]) / 2 + n[1], (b[4] + b[5]) / 2 + n[2]]), ctr));
      if (dot3(nW, sub3(fc, cam.pos)) >= 0) continue;
      const P = o.near ? polyScrN(cam, ix.map((i) => c[i]), o.near) : polyScr(cam, ix.map((i) => c[i])); if (!P) continue;
      const lam = dot3(nW, sun), fcol = o.flat ? col : lam > 0.04 ? mix(col, o.lit || "#fff6e2", 0.06 + 0.22 * lam) : mix(col, o.dk || "#2c2440", 0.3);
      g.fillStyle = fcol; g.beginPath(); lines(g, P); g.fill();
      if (o.lw) { g.strokeStyle = o.ink || "rgba(24,18,34,.5)"; g.lineWidth = o.lw; g.lineJoin = "round"; g.stroke(); }
    }
  }
  function winQuad(g, cam, T, q, col) {
    const [ax, at, a0, a1, v0, v1] = q, pt = (a, v) => (ax === 0 ? T([at + 0.06, v, a]) : T([a, v, at + 0.06 * ax])), Cc = ax === 0 ? T([at, (v0 + v1) / 2, 0]) : T([(a0 + a1) / 2, (v0 + v1) / 2, at]), Nn = ax === 0 ? T([at + 1, (v0 + v1) / 2, 0]) : T([(a0 + a1) / 2, (v0 + v1) / 2, at + ax]);
    if (dot3(sub3(Nn, Cc), sub3(Cc, cam.pos)) >= 0) return;
    const P = polyScr(cam, [pt(a0, v0), pt(a1, v0), pt(a1, v1), pt(a0, v1)]); if (!P) return; g.fillStyle = col; g.beginPath(); lines(g, P); g.fill();
  }
  function polyline3(g, cam, pts) { let on = false; for (const P of pts) { const q = camC(cam, P); if (q[2] < cam.near) { on = false; continue; } const s = scr(cam, q); on ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); on = true; } }
  // Hermite through keys [u, ...values]; tangents from neighbours, zero where the key says stop
  function keyed(keys, u) {
    const n = keys.length; u = clamp(u, keys[0][0], keys[n - 1][0]);
    let i = 0; while (i < n - 2 && u > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], du = b[0] - a[0] || 1, t = (u - a[0]) / du;
    const tan = (j) => { const k = keys[j]; if (k.stop || j === 0 || j === n - 1) return k.slice(1).map(() => 0); const p = keys[j - 1], q = keys[j + 1]; return k.slice(1).map((_, m) => (q[m + 1] - p[m + 1]) / (q[0] - p[0])); };
    const ma = tan(i), mb = tan(i + 1);
    return a.slice(1).map((_, m) => hermite(a[m + 1], b[m + 1], ma[m] * du, mb[m] * du, t));
  }
  const stopK = (k) => Object.assign(k, { stop: true });

  /* ---------------- scene constants ---------------- */
  const SH = { L: 176, B: 28, fb: 7.6, bow: 40, stern: 14, tr: 0.16, sheer: 2.4, sheerA: 0.7, rake: 7, flare: 0.05 };
  const TG = { L: 28, B: 10, fb: 2.4, bow: 9, stern: 5, tr: 0.3, sheer: 1.3, sheerA: 0.2, rake: 1.6, flare: 0.08 };
  const BZ = SH.B / 2 + 1.7;
  const SK = [[0, -370, 128, -9.5], [0.18, -215, 84, -9], [0.36, -84, 44, -6], [0.52, -15, 27, -1.6], [0.6, 0, 22.5, 0], stopK([0.75, 0, BZ, 0]), [1, 0, BZ, 0]];
  const shipAt = (u) => { const [x, z, psi] = keyed(SK, u); return { x, z, psi: psi * RAD }; };
  const TK = [[0, 50, SH.B / 2 + 10, 0], [0.44, 40, SH.B / 2 + 11, 0], [0.54, 24, SH.B / 2 + 17, -55], stopK([0.61, 20, SH.B / 2 + TG.L / 2 + 0.6, -90]), stopK([0.77, 20, SH.B / 2 + TG.L / 2 + 0.6, -90]), [0.86, 22, SH.B / 2 + 34, -100], [1, 60, SH.B / 2 + 80, -160]];
  const KN = [[0, 2.6], [0.18, 2.1], [0.36, 1.3], [0.52, 0.7], [0.6, 0.35], [0.7, 0.18], [0.75, 0], [1, 0]];
  const knAt = (u) => { let i = 0; while (i < KN.length - 2 && u > KN[i + 1][0]) i++; const a = KN[i], b = KN[i + 1]; return lerp(a[1], b[1], clamp((u - a[0]) / (b[0] - a[0]))); };
  const tugAt = (u, sp) => { const [lu, lw, h] = keyed(TK, u), c = Math.cos(sp.psi), s = Math.sin(sp.psi); return { x: sp.x + lu * c - lw * s, z: sp.z + lu * s + lw * c, psi: sp.psi + h * RAD }; };
  const frame = (p, heave = 0, roll = 0, mir = false) => { const c = Math.cos(p.psi), s = Math.sin(p.psi), sr = Math.sin(roll); return (q) => { const y = q[1] + heave + q[2] * sr; return [p.x + q[0] * c - q[2] * s, mir ? -y : y, p.z + q[0] * s + q[2] * c]; }; };
  const LINE_NAMES = ["Tali depan", "Tali samping depan", "Tali silang depan", "Tali silang belakang", "Tali samping belakang", "Tali belakang"];
  const LINE_GEO = [[80, 121], [66, 77], [50, 11], [-50, -11], [-68, -77], [-82, -121]];
  const BOLL = []; for (let x = -121; x <= 121; x += 22) BOLL.push(x);
  const FEND = []; for (let x = -110; x <= 110; x += 22) FEND.push(x);
  const TANKS = [[-120, -112, 17, 15], [-76, -116, 15, 14], [-32, -121, 17, 16], [16, -117, 13, 12], [58, -112, 17, 15], [104, -120, 15, 14], [-98, -166, 19, 17], [-44, -172, 19, 18], [14, -168, 17, 16], [72, -166, 19, 17], [150, -150, 16, 14]];
  const PRESETS = { /* English: air, sea, bow, land (added below) */ udara: { az: 22, el: 17, d: 320 }, laut: { az: 352, el: 6, d: 250 }, ujung: { az: 78, el: 11, d: 300 }, darat: { az: 205, el: 13, d: 240 } };
  const SKY = {
    siang: { top: "#5f93c2", mid: "#a9c8de", hor: "#eef1ea", sun: [205, 38], sunC: "rgba(255,246,220,", w0: "#8fb2c2", w1: "#2f5d76", wave: "rgba(255,255,255,", hill: "#8aa0a8", hillN: "#6f8a86", land: "#a7a58f", far: "#7f9672", quay: "#c9c2b2", lamp: 0, glint: "rgba(255,250,235," },
    senja: { top: "#232650", mid: "#8a5a86", hor: "#f2a25e", sun: [258, 5], sunC: "rgba(255,196,128,", w0: "#c98a74", w1: "#262a4c", wave: "rgba(255,198,150,", hill: "#5a4a6a", hillN: "#433a58", land: "#6a6270", far: "#4c4a5c", quay: "#9a8f8e", lamp: 1, glint: "rgba(255,178,104," },
  };
  const SHIPC = { hull: "#2e3442", boot: "#a83a35", deck: "#8c4a3a", deckDusk: "#5c4a46", house: "#eceae3", houseTop: "#d9d6cd", funnel: "#c2402f", funnelTop: "#24242b", boats: "#f08a2c",
    walkway: "#7f9a7c", walkwayDusk: "#6b7066", pipes: "#d7d3c8", manifold: "#e3b23c", catwalk: "#c9c6bc", mast: "#e8e4d8", windows: "#2c3846", windowsLit: "#ffd98a" };
  const TUGC = { hull: "#b8392e", fender: "#1d1e24", deck: "#5f5a55", house: "#efede6", funnel: "#c2402f", mast: "#e8e4d8" };
  const JETC = { fender: "#24262c", fenderLit: "#6a6f7a", bollard: "#3a3c44", edge: "#e6bb3a", pipes: ["#b9b5a8", "#d8b24a", "#b9b5a8"], lampPost: "#4a4d56", arm: "#e7e3d8", armRiser: "#d8b24a", armBase: "#5d606a",
    line: "#f3d98e", lineTight: "#fbefc6", tank: "#f1eee6", tankAlt: "#dcd8cb", tankDusk: "#cdc4cc", tankAltDusk: "#b9b0bd", tankTop: "#c7c3b8", tankTopDusk: "#8d8790", shed: "#e9e6dc", shedRoof: "#4d6f8f",
    tree: "#4f6f45", treeDusk: "#3e4a4a", trunk: "#5a4636" };
  const BEAT_U = [0, 0.36, 0.6, 0.75, 0.93, 1];

  for (const [en, id] of [["air", "udara"], ["sea", "laut"], ["bow", "ujung"], ["land", "darat"]]) Object.defineProperty(PRESETS, en, { value: PRESETS[id], enumerable: false });
  for (const [en, id] of [["day", "siang"], ["dusk", "senja"]]) Object.defineProperty(SKY, en, { value: SKY[id], enumerable: false });
  const DEF = { duration: 46, hold: 3, beats: null, sky: "siang", palette: null, sun: null, ship: null, tug: null, jetty: null, camera: "udara", cameraKeys: null, cameraInterp: "euler", seed: 5,
    labels: false, lineNames: null, caption: false, font: "ui-monospace, Menlo, Consolas, monospace" };

  const camOf = (v) => (typeof v === "string" ? PRESETS[v] || PRESETS.udara : Object.assign({}, PRESETS.udara, v || {}));
  function camAt(o, t) {
    const K = o.cameraKeys;
    if (!K || !K.length) return camOf(o.camera);
    if (t <= K[0][0]) return camOf(K[0][1]);
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) {
      const a = camOf(K[i - 1][1]), b = camOf(K[i][1]), k = smooth01((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]));
      // cameraInterp "slerp": arah kamera lewat lingkaran besar (kuaternion/slerp), tanpa belokan Euler di dekat tampak atas
      if (o.cameraInterp === "slerp") { const q = C.slerpArah(a.az, a.el, b.az, b.el, k); return { az: q.az, el: Math.min(q.el, 84), d: lerp(a.d, b.d, k) }; }   // 84: hindari kamera tepat tegak (proyeksi tak tentu)
      const daz = ((((b.az - a.az) % 360) + 540) % 360) - 180;
      return { az: a.az + daz * k, el: lerp(a.el, b.el, k), d: lerp(a.d, b.d, k) };
    }
    return camOf(K[K.length - 1][1]);
  }
  function beatTimes(o) {
    const D = o.duration || 46, b = o.beats || {};
    return [0, b.approach == null ? 0.36 * D : b.approach, b.turn == null ? 0.6 * D : b.turn, b.push == null ? 0.75 * D : b.push, b.moor == null ? 0.93 * D : b.moor, b.arms == null ? D : b.arms];
  }
  function uAt(o, t) {
    const B = beatTimes(o); if (t <= 0) return 0;
    for (let i = 1; i < B.length; i++) if (t < B[i]) return lerp(BEAT_U[i - 1], BEAT_U[i], (t - B[i - 1]) / Math.max(1e-6, B[i] - B[i - 1]));
    return 1;
  }
  function phaseOf(u, nLines) { return u < 0.36 ? "MENDEKAT" : u < 0.6 ? "MELAMBAT & MELURUS" : u < 0.745 ? "DIDORONG KAPAL TUNDA" : u < 0.77 ? "MENEMPEL DI FENDER" : nLines < 6 ? `TALI TAMBAT ${nLines}/6` : u < 0.99 ? "LENGAN MUAT TERSAMBUNG" : "TERTAMBAT AMAN"; }

  function setup(S) {
    const o = S.opts, sd = o.seed == null ? 5 : o.seed;
    const base = SKY[o.sky] || SKY.siang, sk = Object.assign({}, base, o.palette || {});
    const sa = o.sun || sk.sun; sk.sunV = sunDir(sa[0], sa[1]);
    S.sk = sk; S.SC = Object.assign({}, SHIPC, o.ship || {}); S.TC = Object.assign({}, TUGC, o.tug || {}); S.JC = Object.assign({}, JETC, o.jetty || {});
    const names = o.lineNames || LINE_NAMES;
    S.LINES = LINE_GEO.map(([u, bx], i) => ({ n: names[i] || "", u, bx, t0: 0.765 + i * 0.026 }));
    const TREES = [], RT = rng(sd); let guard = 0;
    while (TREES.length < 46 && guard++ < 5000) { const x = (RT() - 0.5) * 520, z = -64 - RT() * 230; if (TANKS.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7) || (x > 20 && x < 52 && z > -44)) continue; TREES.push([x, z, 5 + RT() * 4, RT()]); }
    const R = rng(sd + 16), WAVES = []; for (let i = 0; i < 420; i++) WAVES.push([(R() - 0.5) * 1100, 3 + Math.pow(R(), 1.6) * 760, 3 + R() * 7, R() * TAU]);
    S.TREES = TREES; S.WAVES = WAVES;
    S.prof = mtProfile(sd + 26, 540, 30, 150, { power: 1.4, octs: [[4, 1], [9, 0.5], [19, 0.25], [41, 0.12], [83, 0.06]] });
    S.profN = mtProfile(sd + 32, 540, 12, 40, { power: 1.2, octs: [[7, 1], [17, 0.5], [37, 0.25]] });
  }

  function render(g, t, S) {
    const o = S.opts, sk = S.sk, sun = sk.sunV, SC = S.SC, TC = S.TC, JC = S.JC, W = S.W, H = S.H, MONO = o.font;
    const u = uAt(o, t), lamp = [];
    const camP = camAt(o, t);
    const f = 1.02 * Math.max(W, 1.55 * H);
    const sp = shipAt(u), tp = tugAt(u, sp), heave = 0.14 * Math.sin(t * 0.9), roll = 0.004 * Math.sin(t * 0.7);
    const tg = [sp.x * lerp(1, 0.7, smooth01(u / 0.5)), 5, lerp(sp.z, 8, 0.45)], hc = tg[1] + camP.d * Math.tan(camP.el * RAD);
    const cam = camOrbit(tg, camP.d, hc, camP.az, camP.el, f, W / 2, H * 0.52), hy = horizonY(cam), k0 = f / camP.d;
    const kAt = (P) => f / Math.max(1, camC(cam, P)[2]);

    /* ---- ships ---- */
    const shipParts = (p, hv, rl, mir) => {
      const T = frame(p, hv, rl, mir), dh0 = hullDH(SH, -SH.L / 2 + 16), A = -SH.L / 2, hs = SC.house;
      return { T, dh0, stack: [[A + 8, A + 24, dh0, dh0 + 11.5, -11, 11, hs], [A + 10, A + 24, dh0 + 11.5, dh0 + 14.5, -9.5, 9.5, hs], [A + 13, A + 24.6, dh0 + 14.5, dh0 + 17.6, -14, 14, hs], [A + 15, A + 23, dh0 + 17.6, dh0 + 18.6, -6, 6, SC.houseTop]],
        wins: [[0, A + 24, -9, 9, dh0 + 2.2, dh0 + 3.2], [0, A + 24, -9, 9, dh0 + 5, dh0 + 6], [0, A + 24, -9, 9, dh0 + 7.8, dh0 + 8.8], [0, A + 24, -8, 8, dh0 + 12.4, dh0 + 13.4], [0, A + 24.6, -13, 13, dh0 + 15.6, dh0 + 17],
          ...[2.2, 5, 7.8].flatMap((v) => [[1, 11, A + 10, A + 22, dh0 + v, dh0 + v + 1], [-1, -11, A + 10, A + 22, dh0 + v, dh0 + v + 1]])],
        funnel: [[A + 3, A + 10, dh0 + 7, dh0 + 20, -3.8, 3.8, SC.funnel], [A + 3, A + 10, dh0 + 20, dh0 + 23.5, -3.8, 3.8, SC.funnelTop], [A + 3, A + 10, dh0 + 14, dh0 + 16, -3.85, 3.85, hs]],
        boats: [[A + 12, A + 19, dh0 + 4.2, dh0 + 6.6, 11.2, 13.4, SC.boats], [A + 12, A + 19, dh0 + 4.2, dh0 + 6.6, -13.4, -11.2, SC.boats]] };
    };
    function drawShip(g, p, hv, rl, k, mir) {
      const P = shipParts(p, hv, rl, mir), T = P.T, lw = clamp(0.12 * k, 0.4, 1.3), O = { lw };
      drawMesh(g, cam, ribbon(SH, 40, [() => 0, (uu) => hullDH(SH, uu) * 0.5, (uu) => hullDH(SH, uu)], T), sun, SC.hull, { lw, light: false });
      drawMesh(g, cam, ribbon(SH, 40, [() => 0, () => 2.4], T, 0.03), sun, SC.boot, { lw: 0, ink: false, face: "front" });
      if (mir) { P.stack.forEach((b) => drawBox(g, cam, T, b, b[6], sun)); P.funnel.forEach((b) => drawBox(g, cam, T, b, b[6], sun)); return; }
      const deck = polyScr(cam, hullLoop(SH, 40, (uu) => hullDH(SH, uu) + 0.02).map(T));
      if (deck) { g.fillStyle = sk.lamp ? SC.deckDusk : SC.deck; g.beginPath(); lines(g, deck); g.fill(); g.strokeStyle = "rgba(24,18,34,.45)"; g.lineWidth = lw; g.stroke(); }
      const pw = (m) => Math.max(0.6, m * k);
      g.lineCap = "round";
      g.strokeStyle = sk.lamp ? SC.walkwayDusk : SC.walkway; g.lineWidth = pw(3.4); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 25, hullDH(SH, 0) + 0.05, 0]), T([SH.L / 2 - 30, hullDH(SH, 0) + 0.05, 0])]); g.stroke();
      for (const w of [-4.2, -2.6, 2.6, 4.2]) { g.strokeStyle = "rgba(24,18,34,.55)"; g.lineWidth = pw(0.9); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 25, 8.4, w]), T([SH.L / 2 - 32, 8.4, w])]); g.stroke(); g.strokeStyle = SC.pipes; g.lineWidth = pw(0.5); g.stroke(); }
      for (const uu of [-3, 3]) { g.strokeStyle = "rgba(24,18,34,.6)"; g.lineWidth = pw(1.1); g.beginPath(); polyline3(g, cam, [T([uu, 8.9, -SH.B / 2 + 1.5]), T([uu, 8.9, SH.B / 2 - 1.5])]); g.stroke(); g.strokeStyle = SC.manifold; g.lineWidth = pw(0.65); g.stroke(); }
      for (let uu = -SH.L / 2 + 26; uu < SH.L / 2 - 30; uu += 12) { g.strokeStyle = "rgba(24,18,34,.5)"; g.lineWidth = pw(0.35); g.beginPath(); polyline3(g, cam, [T([uu, 7.7, 0]), T([uu, 10.4, 0])]); g.stroke(); }
      g.strokeStyle = SC.catwalk; g.lineWidth = pw(1.3); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 24, 10.4, 0]), T([SH.L / 2 - 14, 10.4, 0])]); g.stroke();
      g.strokeStyle = "rgba(240,236,226,.75)"; g.lineWidth = pw(0.18); g.beginPath(); polyline3(g, cam, hullLoop(SH, 40, (uu) => hullDH(SH, uu) + 1.1).map(T)); g.stroke();
      const items = [], zc = (q) => camC(cam, T(q))[2];
      items.push({ z: zc([-SH.L / 2 + 16, P.dh0 + 8, 0]), f: () => { P.stack.forEach((b) => drawBox(g, cam, T, b, b[6], sun, O)); P.wins.forEach((q) => winQuad(g, cam, T, q, sk.lamp ? SC.windowsLit : SC.windows)); } });
      items.push({ z: zc([-SH.L / 2 + 6.5, P.dh0 + 15, 0]), f: () => P.funnel.forEach((b) => drawBox(g, cam, T, b, b[6], sun, O)) });
      P.boats.forEach((b) => items.push({ z: zc([(b[0] + b[1]) / 2, b[2], (b[4] + b[5]) / 2]), f: () => drawBox(g, cam, T, b, b[6], sun, O) }));
      const crane = (uu, ww, jw) => () => { const base = T([uu, 7.8, ww]), top = T([uu, 17, ww]), tip = T([uu + 13, 19, ww + jw]); g.strokeStyle = "rgba(24,18,34,.6)"; g.lineWidth = pw(1.2); g.beginPath(); polyline3(g, cam, [base, top, tip]); g.stroke(); g.strokeStyle = SC.manifold; g.lineWidth = pw(0.8); g.stroke(); };
      items.push({ z: zc([0, 12, -SH.B / 2 + 4]), f: crane(-7, -SH.B / 2 + 4, 2) });
      items.push({ z: zc([SH.L / 2 - 9, 14, 0]), f: () => { g.strokeStyle = "rgba(24,18,34,.6)"; g.lineWidth = pw(0.9); g.beginPath(); polyline3(g, cam, [T([SH.L / 2 - 9, hullDH(SH, SH.L / 2 - 9), 0]), T([SH.L / 2 - 9, 23, 0])]); g.stroke(); g.strokeStyle = SC.mast; g.lineWidth = pw(0.55); g.stroke(); } });
      items.push({ z: zc([-SH.L / 2 + 19, P.dh0 + 22, 0]), f: () => { g.strokeStyle = SC.mast; g.lineWidth = pw(0.5); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 19, P.dh0 + 18.6, 0]), T([-SH.L / 2 + 19, P.dh0 + 25, 0])]); g.stroke(); g.lineWidth = pw(0.35); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 19, P.dh0 + 23.5, -3.5]), T([-SH.L / 2 + 19, P.dh0 + 23.5, 3.5])]); g.stroke(); } });
      items.sort((a, b) => b.z - a.z).forEach((it) => it.f());
      lamp.push(T([SH.L / 2 - 9, 23.4, 0]), T([-SH.L / 2 + 19, P.dh0 + 25.4, 0]), T([-SH.L / 2 + 24.6, P.dh0 + 17.6, -14]), T([-SH.L / 2 + 24.6, P.dh0 + 17.6, 14]));
    }
    function drawTug(g, p, hv, k, mir) {
      const T = frame(p, hv, 0, mir), lw = clamp(0.12 * k, 0.4, 1.3), O = { lw };
      drawMesh(g, cam, ribbon(TG, 18, [() => 0, (uu) => hullDH(TG, uu)], T), sun, TC.hull, { lw, light: false });
      if (!mir) drawMesh(g, cam, ribbon(TG, 18, [(uu) => hullDH(TG, uu) - 1.1, (uu) => hullDH(TG, uu) + 0.15], T, 0.45), sun, TC.fender, { lw, light: false, face: "front" });
      const deck = !mir && polyScr(cam, hullLoop(TG, 18, (uu) => hullDH(TG, uu) + 0.16).map(T)); if (deck) { g.fillStyle = TC.deck; g.beginPath(); lines(g, deck); g.fill(); }
      const fb = TG.fb;
      drawBox(g, cam, T, [-3, 6, fb, fb + 3, -3.2, 3.2], TC.house, sun, O);
      drawBox(g, cam, T, [-0.5, 6.2, fb + 3, fb + 5.2, -3.9, 3.9], TC.house, sun, O);
      if (!mir) drawBox(g, cam, T, [6.2, 6.4, fb + 3.7, fb + 4.8, -3.6, 3.6], sk.lamp ? SC.windowsLit : SC.windows, sun, { flat: true });
      drawBox(g, cam, T, [-4.6, -3, fb + 2, fb + 6.6, -1.6, 1.6], TC.funnel, sun, O);
      if (!mir) { g.strokeStyle = TC.mast; g.lineWidth = Math.max(0.6, 0.35 * k); g.beginPath(); polyline3(g, cam, [T([2.5, fb + 5.2, 0]), T([2.5, fb + 9.5, 0])]); g.stroke(); lamp.push(T([2.5, fb + 9.7, 0])); }
    }

    /* ---- sky, sun, distant coast ---- */
    const skg = g.createLinearGradient(0, Math.min(0, hy - H), 0, Math.max(hy, Math.min(0, hy - H) + 1)); skg.addColorStop(0, sk.top); skg.addColorStop(0.62, sk.mid); skg.addColorStop(1, sk.hor); g.fillStyle = skg; g.fillRect(0, 0, W, Math.max(0, hy) + 2);
    const sc = camC(cam, add3(cam.pos, sun, 1e4)), sunS = sc[2] > 0 ? scr(cam, sc) : null;
    if (sunS) { const gl = g.createRadialGradient(sunS[0], sunS[1], 1, sunS[0], sunS[1], W * 0.5); gl.addColorStop(0, sk.sunC + ".95)"); gl.addColorStop(0.06, sk.sunC + ".55)"); gl.addColorStop(1, sk.sunC + "0)"); g.fillStyle = gl; g.fillRect(0, 0, W, hy + 2); }
    [[3200, S.prof, sk.hill], [1500, S.profN, sk.hillN]].forEach(([Rr, pr, col]) => { const pts = ringScr(cam, Rr, pr); if (pts) { g.fillStyle = col; g.beginPath(); lines(g, pts); g.fill(); } });
    /* ---- water ---- */
    const wg = g.createLinearGradient(0, hy, 0, Math.max(H, hy + 1)); wg.addColorStop(0, sk.w0); wg.addColorStop(1, sk.w1); g.fillStyle = wg; g.fillRect(0, hy, W, H - hy);
    if (sunS && sk.lamp) { const gx = sunS[0], gw = W * 0.08, gl = g.createLinearGradient(0, hy, 0, Math.max(H, hy + 1)); gl.addColorStop(0, sk.glint + ".7)"); gl.addColorStop(1, sk.glint + "0)"); g.fillStyle = gl; g.beginPath(); g.moveTo(gx - gw * 0.2, hy); g.lineTo(gx + gw * 0.2, hy); g.lineTo(gx + gw, H); g.lineTo(gx - gw, H); g.closePath(); g.fill(); }
    /* ---- reflections: mirrored ships on an offscreen layer, broken into shimmer lines ---- */
    {
      const tr = g.getTransform ? g.getTransform() : { a: 1, b: 0 }, s = Math.max(1, Math.hypot(tr.a, tr.b) || 1), cw = Math.ceil(W * s), ch = Math.ceil(H * s);
      let L = S.cache.layer; if (!L || L.width !== cw || L.height !== ch) L = S.cache.layer = C.offscreen(cw, ch);
      const lr = L.getContext("2d"); lr.setTransform(1, 0, 0, 1, 0, 0); lr.globalCompositeOperation = "source-over"; lr.globalAlpha = 1; lr.clearRect(0, 0, cw, ch); lr.setTransform(s, 0, 0, s, 0, 0);
      drawShip(lr, sp, heave, roll, kAt([sp.x, 0, sp.z]), true); drawTug(lr, tp, heave, kAt([tp.x, 0, tp.z]), true);
      lr.globalCompositeOperation = "destination-out"; lr.fillStyle = "rgba(0,0,0,.85)"; for (let y = Math.max(0, Math.floor(hy)); y < H; y += 3.2) lr.fillRect(0, y + 1.6 * Math.sin(y * 0.21 + t * 2.2), W, 1.3); lr.globalCompositeOperation = "source-over";
      g.save(); g.globalAlpha = sk.lamp ? 0.3 : 0.24; g.drawImage(L, 0, 0, W, H); g.restore();
    }
    /* ---- wave dashes drifting slowly ---- */
    g.lineCap = "round";
    for (const [x0, z0, len, ph] of S.WAVES) { const x = ((x0 + t * 1.4 + 550) % 1100) - 550 + tg[0] * 0.6, z = z0 + Math.sin(t * 0.6 + ph) * 1.2; const A = camC(cam, [x, 0, z]); if (A[2] < 3) continue; const a = scr(cam, A), hl = len * 0.5 * f / A[2], b = [a[0] + hl, a[1]]; a[0] -= hl; if (a[1] < hy || a[0] > W || b[0] < 0) continue; const fade = clamp(1 - A[2] / 1100), al = (0.12 + 0.28 * fade) * (0.6 + 0.4 * Math.sin(t * 1.3 + ph * 3)); g.strokeStyle = sk.wave + al.toFixed(3) + ")"; g.lineWidth = Math.max(0.6, 0.5 * f / A[2]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    /* ---- wakes ---- */
    const kn = knAt(u);
    for (const [who, lenB] of [["ship", SH.L / 2], ["tug", TG.L / 2]]) {
      const pts = []; for (let j = 0; j < 26; j++) { const uu = u - j * 0.007; if (uu < 0) break; const s2 = shipAt(uu), q = who === "ship" ? s2 : tugAt(uu, s2); pts.push([q.x - Math.cos(q.psi) * lenB, 0.05, q.z - Math.sin(q.psi) * lenB]); }
      if (pts.length > 2 && (who === "tug" || kn > 0.12)) { g.strokeStyle = sk.wave + (who === "ship" ? 0.22 * clamp(kn / 1.2) : 0.3).toFixed(3) + ")"; g.lineWidth = Math.max(1, (who === "ship" ? 9 : 4) * k0 * 0.5); g.beginPath(); polyline3(g, cam, pts); g.stroke(); }
    }
    { const T = frame(sp), bw = clamp(kn / 1.4); if (bw > 0.05) { g.strokeStyle = sk.wave + (0.55 * bw).toFixed(3) + ")"; g.lineWidth = Math.max(1, 1.2 * k0); for (const s of [1, -1]) { g.beginPath(); polyline3(g, cam, [T([SH.L / 2 + 6, 0.05, 0]), T([SH.L / 2 - 14, 0.05, s * (SH.B / 2 + 3)]), T([SH.L / 2 - 40, 0.05, s * (SH.B / 2 + 7)])]); g.stroke(); } } }
    const push = u > 0.6 && u < 0.78, tT = frame(tp);
    if (push || kn > 0.1) { const n = 7; for (let i = 0; i < n; i++) { const a = ((t * 1.6 + i / n) % 1), P = tT([-TG.L / 2 - 2 - a * 22, 0.05, Math.sin(i * 2.3) * 2 * a]), q = camC(cam, P); if (q[2] < 2) continue; const s2 = scr(cam, q), r = (1.5 + a * 4) * f / q[2]; g.fillStyle = `rgba(255,255,255,${(0.42 * (1 - a) * (push ? 1 : 0.5)).toFixed(3)})`; g.beginPath(); g.ellipse(s2[0], s2[1], r, r * 0.35, 0, 0, TAU); g.fill(); } }
    for (const [Hs, p] of [[SH, sp], [TG, tp]]) { const T = frame(p); g.strokeStyle = sk.wave + ".45)"; g.lineWidth = Math.max(0.8, 0.7 * kAt([p.x, 0, p.z])); g.beginPath(); polyline3(g, cam, hullLoop(Hs, 30, () => 0.03, 0.9).map(T)); g.closePath(); g.stroke(); }
    /* ---- land behind the quay ---- */
    for (const [z0, z1, col] of [[-46, -62, sk.quay], [-62, -240, sk.land], [-240, -1500, sk.far]]) { const P = polyScrN(cam, [[-1500, 3.2, z0], [1500, 3.2, z0], [1500, 3.2, z1], [-1500, 3.2, z1]], 25); if (P) { g.fillStyle = col; g.beginPath(); lines(g, P); g.fill(); } }
    const camWater = cam.pos[2] > -2, high = cam.pos[1] > 24, lwq = (P) => clamp(0.1 * kAt(P), 0.4, 1.2), O0 = { lw: 0.8 };
    const landItems = [];
    TANKS.forEach(([x, z, r, h], i) => landItems.push({ z: camC(cam, [x, h / 2, z])[2], f: () => {
      const tb = tubeGrid([{ c: [x, 3.2, z], a: r, b: r }, { c: [x, 3.2 + h, z], a: r, b: r }], 28);
      drawMesh(g, cam, tb, sun, sk.lamp ? (i % 4 === 3 ? JC.tankAltDusk : JC.tankDusk) : i % 4 === 3 ? JC.tankAlt : JC.tank, { lw: lwq([x, 0, z]), thr: 0.05, dark: sk.lamp ? "#77708a" : "#a9b0b8", lightCol: "rgba(255,255,250,.5)" });
      const top = polyScr(cam, ellipseXZ(x, z, r, r, 0, 28).map((p) => [p[0], 3.2 + h, p[1]])); if (top) { g.fillStyle = sk.lamp ? JC.tankTopDusk : JC.tankTop; g.beginPath(); lines(g, top); g.fill(); g.strokeStyle = "rgba(24,18,34,.4)"; g.lineWidth = lwq([x, 0, z]); g.stroke(); }
      g.strokeStyle = "rgba(40,50,70,.35)"; g.lineWidth = Math.max(0.6, 0.6 * kAt([x, 0, z])); g.beginPath(); polyline3(g, cam, ellipseXZ(x, z, r * 1.002, r * 1.002, 0, 28).map((p) => [p[0], 3.2 + h * 0.8, p[1]])); g.closePath(); g.stroke();
    } }));
    const [tlx, tly] = light2d(cam, sun);
    S.TREES.forEach(([x, z, r, v]) => landItems.push({ z: camC(cam, [x, 4, z])[2], f: () => { const q = camC(cam, [x, 3.2, z]); if (q[2] < 3) return; const b0 = scr(cam, q), kk = f / q[2], R2 = r * kk, cy = b0[1] - r * 1.25 * kk; g.strokeStyle = JC.trunk; g.lineWidth = Math.max(0.6, 0.7 * kk); g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b0[0], cy); g.stroke(); g.fillStyle = mix(sk.lamp ? JC.treeDusk : JC.tree, "#2a3a30", v * 0.4); g.beginPath(); g.arc(b0[0], cy, R2, 0, TAU); g.arc(b0[0] - R2 * 0.6, cy + R2 * 0.3, R2 * 0.7, 0, TAU); g.arc(b0[0] + R2 * 0.6, cy + R2 * 0.25, R2 * 0.72, 0, TAU); g.fill(); g.fillStyle = sk.lamp ? "rgba(255,170,130,.12)" : "rgba(214,226,150,.4)"; g.beginPath(); g.arc(b0[0] + tlx * R2 * 0.3, cy - tly * R2 * 0.3, R2 * 0.55, 0, TAU); g.fill(); } }));
    landItems.push({ z: camC(cam, [36, 5, -32])[2], f: () => { drawBox(g, cam, (q) => q, [28, 44, 3.2, 7.4, -38, -27], JC.shed, sun, O0); drawBox(g, cam, (q) => q, [27.5, 44.5, 7.4, 8.2, -38.5, -26.5], JC.shedRoof, sun, O0); } });
    const quay = () => {
      drawBox(g, cam, (q) => q, [-232, 232, -0.6, 3.2, -46, 0], sk.quay, sun, { lw: 0.8, near: 20 });
      g.lineCap = "butt"; g.strokeStyle = JC.edge; g.lineWidth = Math.max(0.8, 0.5 * k0); g.beginPath(); polyline3(g, cam, [[-232, 3.25, -0.4], [232, 3.25, -0.4]]); g.stroke();
      [4.4, 5.2, 6.0].forEach((yy, i) => { g.strokeStyle = "rgba(24,18,34,.5)"; g.lineWidth = Math.max(1, 0.9 * k0); g.beginPath(); polyline3(g, cam, [[-232, yy, -16], [232, yy, -16]]); g.stroke(); g.strokeStyle = JC.pipes[i % JC.pipes.length]; g.lineWidth = Math.max(0.7, 0.55 * k0); g.stroke(); });
      for (let x = -225; x <= 225; x += 15) { g.strokeStyle = "rgba(60,60,70,.6)"; g.lineWidth = Math.max(0.6, 0.35 * k0); g.beginPath(); polyline3(g, cam, [[x, 3.2, -16], [x, 6.5, -16]]); g.stroke(); }
      const sideZ = sp.z - SH.B / 2;
      FEND.forEach((x) => { const touch = Math.abs(x - sp.x) < SH.L / 2 - 34 && sideZ < 3.4, dep = touch ? clamp(sideZ - 0.25, 1.05, 1.6) : 1.6; drawBox(g, cam, (q) => q, [x - 1.6, x + 1.6, 0.3, 3.0, 0, dep], JC.fender, sun, { lw: 0.6, lit: JC.fenderLit }); });
      BOLL.forEach((x) => { const bt = tubeGrid([{ c: [x, 3.2, -1.7], a: 0.45, b: 0.45 }, { c: [x, 4.1, -1.7], a: 0.4, b: 0.4 }], 10, [false, true]); drawMesh(g, cam, bt, sun, JC.bollard, { lw: lwq([x, 0, 0]), lightCol: "rgba(200,205,215,.5)", lthr: 0.5 }); });
      for (let x = -200; x <= 200; x += 50) { g.strokeStyle = JC.lampPost; g.lineWidth = Math.max(0.6, 0.3 * k0); g.beginPath(); polyline3(g, cam, [[x, 3.2, -30], [x, 15, -30], [x, 15, -27.5]]); g.stroke(); lamp.push([x, 14.6, -27.5]); }
    };
    // loading arms: riser, inboard arm, outboard arm reaching the ship's manifold once moored
    const arms = (part) => {
      const reach = smooth01((u - 0.93) / 0.06), Tm = frame(sp, heave, roll);
      for (const xo of [-4, 4]) {
        const Rr = [xo, 18.5, -7], stow = [xo, 7, -4.5], M = Tm([xo, 10.6, -SH.B / 2 + 3.5]), Tg = lerp3(stow, M, reach);
        const dz = Tg[2] - Rr[2], dy = Tg[1] - Rr[1], d = Math.min(Math.hypot(dz, dy), 23.9), base = Math.atan2(dy, dz), A = Math.acos(clamp((12 * 12 + d * d - 12 * 12) / (2 * 12 * d), -1, 1));
        const e1 = [Rr[2] + 12 * Math.cos(base + A), Rr[1] + 12 * Math.sin(base + A)], e2 = [Rr[2] + 12 * Math.cos(base - A), Rr[1] + 12 * Math.sin(base - A)], E = e1[1] > e2[1] ? e1 : e2, EW = [xo, E[1], E[0]];
        const seg = (pts, w, col) => { g.strokeStyle = "rgba(24,18,34,.65)"; g.lineWidth = Math.max(1.2, (w + 0.35) * k0); g.beginPath(); polyline3(g, cam, pts); g.stroke(); g.strokeStyle = col; g.lineWidth = Math.max(0.8, w * k0); g.stroke(); };
        if (part === 0) { drawBox(g, cam, (q) => q, [xo - 1.2, xo + 1.2, 3.2, 4.2, -8.2, -5.8], JC.armBase, sun, O0); seg([[xo, 3.2, -7], Rr], 1.1, JC.arm); seg([Rr, [xo, 19.5, -10.5]], 0.9, JC.armRiser); seg([Rr, EW], 0.8, JC.arm); }
        else { seg([EW, Tg], 0.65, JC.arm); const q = camC(cam, EW); if (q[2] > 1) { const s2 = scr(cam, q); g.fillStyle = "#2c2e36"; g.beginPath(); g.arc(s2[0], s2[1], Math.max(1.2, 0.8 * k0), 0, TAU); g.fill(); } }
      }
    };
    // mooring lines with sag; thrown in sequence, slack, then hove tight
    let nLines = 0; const placed = [];
    const moor = () => {
      const Tm = frame(sp, heave, roll);
      S.LINES.forEach((Ln) => {
        const a0 = Ln.t0, k = clamp((u - a0) / 0.02); if (k <= 0) return;
        const A = Tm([Ln.u, hullDH(SH, Ln.u) + 1.0, -hullHB(SH, Ln.u) + 0.6]), B = [Ln.bx, 4.0, -1.7];
        const tight = smooth01((u - a0 - 0.03) / 0.05), sag = lerp(3.2, 0.35, tight), pts = [];
        if (k < 1) { const E = add3(lerp3(A, B, k), [0, 7 * Math.sin(Math.PI * k), 0]); for (let i = 0; i <= 14; i++) { const s = i / 14; pts.push(add3(lerp3(A, E, s), [0, -1.2 * 4 * s * (1 - s), 0])); } }
        else { nLines++; for (let i = 0; i <= 18; i++) { const s = i / 18, P = add3(lerp3(A, B, s), [0, -sag * 4 * s * (1 - s), 0]); P[1] = Math.max(0.15, P[1]); pts.push(P); } }
        g.lineCap = "round"; g.strokeStyle = "rgba(30,22,30,.6)"; g.lineWidth = Math.max(2, 0.9 * kAt(B)); g.beginPath(); polyline3(g, cam, pts); g.stroke(); g.strokeStyle = tight > 0.9 ? JC.lineTight : JC.line; g.lineWidth = Math.max(1.1, 0.5 * kAt(B)); g.stroke();
        if (o.labels && k >= 1 && Ln.n) { const m = camC(cam, pts[9]); if (m[2] > 2) { const s2 = scr(cam, m), fs = W < 520 ? 8.5 : 10; g.font = `500 ${fs}px ${MONO}`; const txt = Ln.n.toUpperCase(), tw = g.measureText(txt).width; let y = s2[1] - 10; for (let n = 0; n < 6 && placed.some((r) => Math.abs(r[0] - s2[0]) < (r[1] + tw) / 2 + 6 && Math.abs(r[2] - y) < fs + 5); n++) y -= fs + 6; placed.push([s2[0], tw, y]); g.strokeStyle = "rgba(246,231,184,.5)"; g.lineWidth = 1; g.beginPath(); g.moveTo(s2[0], s2[1]); g.lineTo(s2[0], y + 3); g.stroke(); g.fillStyle = "rgba(7,10,22,.7)"; g.fillRect(s2[0] - tw / 2 - 4, y - fs + 1, tw + 8, fs + 4); g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#f6e7b8"; g.fillText(txt, s2[0], y); } }
      });
    };
    const vessels = () => {
      const sZ = camC(cam, [sp.x, 5, sp.z])[2], tZ = camC(cam, [tp.x, 3, tp.z])[2];
      const ds = () => drawShip(g, sp, heave, roll, kAt([sp.x, 0, sp.z]), false), dt2 = () => drawTug(g, tp, heave * 1.6, kAt([tp.x, 0, tp.z]), false);
      if (tZ > sZ) { dt2(); ds(); } else { ds(); dt2(); }
    };
    const lands = () => landItems.sort((a, b) => b.z - a.z).forEach((it) => it.f());
    if (camWater) { lands(); quay(); arms(0); if (!high) { moor(); arms(1); } vessels(); if (high) { moor(); arms(1); } }
    else { vessels(); quay(); moor(); arms(0); arms(1); lands(); }
    /* ---- dusk: lamps glow and spill on the water ---- */
    if (sk.lamp) {
      g.save(); g.globalCompositeOperation = "screen";
      for (const P of lamp) { const q = camC(cam, P); if (q[2] < 2) continue; const s2 = scr(cam, q), r = Math.max(4, 5 * f / q[2]); const gl = g.createRadialGradient(s2[0], s2[1], 0, s2[0], s2[1], r * 3); gl.addColorStop(0, "rgba(255,226,160,.95)"); gl.addColorStop(0.2, "rgba(255,200,120,.45)"); gl.addColorStop(1, "rgba(255,190,120,0)"); g.fillStyle = gl; g.beginPath(); g.arc(s2[0], s2[1], r * 3, 0, TAU); g.fill(); const w0 = camC(cam, [P[0], 0, Math.max(P[2], 1)]); if (camWater && w0[2] > 2 && P[2] > -32) { const sw = scr(cam, w0), lg = g.createLinearGradient(0, sw[1] - 2, 0, sw[1] + r * 6); lg.addColorStop(0, "rgba(255,200,130,.28)"); lg.addColorStop(1, "rgba(255,200,130,0)"); g.fillStyle = lg; for (let j = 0; j < 6; j++) { const wj = r * (0.5 - j * 0.06) * (1 + 0.3 * Math.sin(t * 3 + j + P[0])); g.fillRect(sw[0] - wj / 2, sw[1] + j * r, wj, r * 0.62); } } }
      g.restore();
    }
    /* ---- optional caption ---- */
    S.last = { u, kn, nLines, gap: Math.max(0, sp.z - SH.B / 2 - 1.7), phase: phaseOf(u, nLines) };
    if (o.caption) {
      const ph = S.last.phase, capTxt = u < 0.745 ? `SANDAR \u00b7 ${ph} \u00b7 KECEPATAN ${fmt(kn, 1)} KN` : `SANDAR \u00b7 ${ph}`, fs = W < 520 ? 9 : Math.max(10.5, H / 60);
      g.font = `500 ${fs}px ${MONO}`; const cw = g.measureText(capTxt).width;
      g.fillStyle = "rgba(7,10,22,.55)"; g.fillRect(8, H - fs * 2.7, cw + 12, fs * 1.8); g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#f4ecd8"; g.fillText(capTxt, 14, H - fs * 1.33);
    }
  }

  const api = C.defineModule("sceneTanker", {
    valueAliases: { sky: { day: "siang", dusk: "senja" }, camera: { air: "udara", sea: "laut", bow: "ujung", land: "darat" } },
    size: [1280, 720],
    defaults: DEF,
    duration: (o) => beatTimes(o)[5] + (o.hold == null ? 3 : o.hold),
    setup,
    render,
  });
  api.lib = { PRESETS, SKY, SH, TG, hullHB, hullDH, hullPt, hullLoop, ribbon, keyed, drawBox, drawMesh, tubeGrid, winQuad, polyline3, pnoise, mtProfile, ringScr, ellipseXZ, stripXZ, softabs, hazeT, light2d,
    shipAt, tugAt, knotsAt: knAt, uAt: (t, o) => uAt(Object.assign({}, DEF, o || {}), t),
    state(t, opts) {
      const o = Object.assign({}, DEF, opts || {}), u = uAt(o, t), sp = shipAt(u), nLines = [0, 1, 2, 3, 4, 5].filter((i) => u >= 0.765 + i * 0.026 + 0.02).length;
      return { u, ship: sp, tug: tugAt(u, sp), knots: knAt(u), lines: nLines, gap: Math.max(0, sp.z - SH.B / 2 - 1.7), phase: phaseOf(u, nLines) };
    } };
  MGP.sceneTanker = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
