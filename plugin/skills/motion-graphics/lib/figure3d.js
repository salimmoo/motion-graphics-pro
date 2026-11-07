/**
 * MGP figure3d \u2014 3D human figure (classical 7.5-head canon, volume-shaded meshes, ink rim) driven by a data gait engine.
 *
 * Extracted from the website demos (guide/js/demos-skills.js): shared figure code ("TUBUH 3D dari pose", port of
 * motion-graphics scripts/shadow3d.py (old bayangan3d.py)), the gait engine ("MESIN GAIT", port of scripts/gait_engine.py (old mesin_gait.py)) and the
 * 3D space helpers ("RUANG 3D", port of scripts/space3d.py (old ruang3d.py)). The camera itself comes from MGP.core (cam, camOrbit, camC, scr).
 *
 * Load order: mgp-core.js, figure3d.js (then shadow3d.js, scene-park3d.js).
 *
 * Two modules are defined in this file:
 *
 * 1) MGP.figure3d \u2014 one figure on a plaza floor, walking (travels forward, camera follows) or standing (breathing,
 *    weight shift, slow look around), seen from any camera angle, optional turntable, cast shadow + contact shadow.
 *    Options (defaults):
 *      width 1280, height 720, duration 8, seed 1
 *      action "walk"            "walk" | "stand"
 *      face 90                  heading of the figure in degrees (0 = north/+z, 90 = east/+x)
 *      view 45                  camera angle around the figure, relative to the facing (0 = front, 90 = figure's right side,
 *                               180 = back, 270 = left side). number, [[t,deg],...] keys, or function(t) -> deg
 *      spin 0                   turntable speed in deg/s, added to view
 *      travel true              walking moves the figure through the world (feet planted on the floor); false = in place
 *      x 0, z 0                 start position on the ground (H units)
 *      dist 10, pitch 4         orbit distance (H) and camera pitch (deg, + looks down)
 *      focal null               focal length px (default max(0.62 W, 0.95 H))
 *      soleY 0.8                screen y (fraction of H) where the target's sole sits (sets the camera height)
 *      scale 1                  body scale (1 = 5.78 H tall)
 *      step 2.0, cadence 120, lift 0.2   gait: step length (H, base skeleton units), cadence (steps/min, cycle = 120/cadence s), swing lift
 *      phase 0                  gait phase offset (0..1)
 *      pal {}                   palette override: skin, skinD, hair, hairL, top|shirt, pants|trousers, shoe|shoes, sole, eye, lip, blush, ink
 *      sunAz 250, sunEl 55      sun azimuth (deg from north, clockwise) / elevation (deg)
 *      shadow true, shadowColor "#3a3f66", shadowOpacity 0.34, shadowSoft 0 (blur px), contact true
 *      sky ["#9cc0d2","#f0dcc0"], ground ["#d9c9a8","#c4ae86"], tiles true, tileColor "rgba(120,96,60,.28)", bg null (solid colour instead of sky+ground)
 *      labels false             debug overlay (view angle, phase)
 *      font "ui-monospace, Menlo, Consolas, monospace"
 *
 * 2) MGP.gait \u2014 the side-view gait engine demo: realistic walk from gait data (heel rocker, foot flat, toe rocker, swing),
 *    ground ticks that scroll at exactly the walking speed, heel-strike prints, pivots, optional IK bones and the
 *    stance/swing phase timeline (HS FF HO TO).
 *    Options: width 1280, height 720, duration 6, step 2.0, cadence 119, speed 1 (playback rate), pivot true, prints true,
 *    bones false, timeline true, labels false, pal {skin, hair, top, pants, shoe, sole, dark}, sky/ground colours, font.
 *
 * MGP.figure3d.lib (stable contract, same signatures/semantics as the website code):
 *   figGait() -> Gait instance on the figure skeleton;  new Gait(body, kw)  the engine (pose(p), arm(p), foot(p), report())
 *   gaitPose(gt, p) = gt.pose(p)                         raw gait pose (hip, near/far legs with knee/ankle/cfg, lean, nod)
 *   figWalk(gt, p) -> pose J   figStand(t) -> pose J     J = {legs, arms, U, nod, yaw}; set J.pal / J.scale / J.hideArms
 *   figMeasure(J) -> landmarks in heads                  figPrims(J) -> capsule/sphere prims (prims.pose = J)
 *   drawFigure(g, cam, J, base[x,z], face, sole, sun, opt?)   opt = {pal, scale} (optional 8th arg, extension)
 *   drawPrims(g, cam, prims, base, face, sole, sun, opt?)     drawMesh(g, cam, M, sun, col, o)
 *   shadowShapes(prims, base, face, sole, sun, scale?) -> ground polygons [[x,z],...]
 *   contactShapes(prims, base, face, sole, h=0.12, scale?) -> [[poly, strength], ...]
 *   ik, BODY, GDEF, FIG, FIG_BODY, FCOL, HD, PRIM, shoeMap, rotAbout, rot2, tubeGrid, gridFn, headS, hairS, hairMax, surfFrame,
 *   toWorld, groundOf, groundScr, fillScr, ellipseXZ, stripXZ, mtProfile, ringScr, camHeight, light2d, hazeT,
 *   2D: capPts, cutCap, clipHalf, smooth, lines, fillPts, arcPts
 *   castShadow(g, cam, prims, base, face, sole, sun, o) composited figure shadow + contact (o: color, opacity, soft, contact, scale, W, H)
 *   layer(S, key, g) -> offscreen layer context matched to g's pixel ratio (cleared)
 *   drawTiles(g, cam, cx, o) plaza floor grid lines; palette(p) -> FCOL merged with aliases
 *
 * Example:
 *   const fig = MGP.figure3d.create("#stage", { action: "walk", view: 45, spin: 20 });
 *   MGP.core.expose(fig);
 *   // or draw a figure yourself:
 *   const L = MGP.figure3d.lib, gt = L.figGait(), J = L.figWalk(gt, (t / gt.g.T) % 1);
 *   const cam = MGP.core.camOrbit([0, 0, 0], 10, 3, 135, 4, 700, 640, 360);
 *   L.drawFigure(ctx, cam, J, [0, 0], 90, 5.78, MGP.core.sunDir(250, 55));
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  if (!C) throw new Error("figure3d.js: load core/mgp-core.js first");
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = C.clamp, lerp = C.lerp, smooth01 = C.smooth01, dot3 = C.dot3, rng = C.rng, mix = C.mix, rgba = C.rgba;
  const camC = C.camC, scr = C.scr, sunDir = C.sunDir, polyScr = C.polyScr, camOrbit = C.camOrbit;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const MONO = "ui-monospace, Menlo, Consolas, monospace";
  const K = { night: "#070a14", navy: "#0e1530", ultra: "#1b2d63", ivory: "#f4ecd8", ivory2: "#e9dcbc", gold: "#d6b06a", gold2: "#f2d796", goldd: "#9c7a3c", muted: "#a79f8c" };

  /* ---------------- 2D helpers (smooth path, tangent capsules, half-plane clip) ---------------- */
  // closed smooth path through points (quadratic midpoints)
  function smooth(g, p, close = true) {
    const n = p.length; if (n < 3) return;
    g.moveTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2);
    for (let i = 1; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    if (close) { g.quadraticCurveTo(p[0][0], p[0][1], (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); g.closePath(); }
  }
  function lines(g, p, close = true) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); if (close) g.closePath(); }
  const fillPts = (g, p, col, sm = true) => { if (!p || p.length < 3) return; g.beginPath(); sm ? smooth(g, p) : lines(g, p); g.fillStyle = col; g.fill(); };
  const tag = (g, txt, x, y, col = K.gold2, size = 10, align = "left", font = MONO) => { g.font = `500 ${size}px ${font}`; g.textAlign = align; g.textBaseline = "alphabetic"; g.fillStyle = col; g.fillText(txt, x, y); };

  // tangent capsule (vector-character scripts/shapes.py (old bentuk.py) cap_pts): circles at the pivots, outer tangent sides, bulge zero at the ends
  function arcPts(cx, cy, r, d0, d1, through, n) {
    const a0 = Math.atan2(d0[1], d0[0]), a1 = Math.atan2(d1[1], d1[0]), at = Math.atan2(through[1], through[0]);
    const md = (x) => ((x % TAU) + TAU) % TAU;
    let sw = md(a1 - a0); if (md(at - a0) > sw) sw -= TAU;
    const out = []; for (let k = 0; k <= n; k++) out.push([cx + r * Math.cos(a0 + sw * k / n), cy + r * Math.sin(a0 + sw * k / n)]); return out;
  }
  function capPts(a, b, ra, rb, bo = 0, bi = 0, at = 0.4, nArc = 14, nSide = 8) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = uy, ny = -ux;
    const s = clamp((rb - ra) / L, -0.99, 0.99), c = Math.sqrt(1 - s * s);
    const dR = [nx * c - ux * s, ny * c - uy * s], dL = [-nx * c - ux * s, -ny * c - uy * s];
    const prof = (t) => (t <= 0 || t >= 1 ? 0 : Math.pow(Math.sin(0.5 * Math.PI * (t < at ? t / at : (1 - t) / (1 - at))), 2));
    const pts = arcPts(a[0], a[1], ra, dL, dR, [-ux, -uy], nArc);
    for (let k = 1; k < nSide; k++) { const t = k / nSide, gq = bo * prof(t); pts.push([a[0] + ra * dR[0] + (b[0] + rb * dR[0] - a[0] - ra * dR[0]) * t + dR[0] * gq, a[1] + ra * dR[1] + (b[1] + rb * dR[1] - a[1] - ra * dR[1]) * t + dR[1] * gq]); }
    pts.push(...arcPts(b[0], b[1], rb, dR, dL, [ux, uy], nArc));
    for (let k = 1; k < nSide; k++) { const t = 1 - k / nSide, gq = bi * prof(t); pts.push([a[0] + ra * dL[0] + (b[0] + rb * dL[0] - a[0] - ra * dL[0]) * t + dL[0] * gq, a[1] + ra * dL[1] + (b[1] + rb * dL[1] - a[1] - ra * dL[1]) * t + dL[1] * gq]); }
    return pts;
  }
  // keep the part of a polygon on the side (p - P) . n <= 0 (cut perpendicular to an axis: hem, cuff)
  function clipHalf(pts, P, n) {
    const out = [], f = (p) => (p[0] - P[0]) * n[0] + (p[1] - P[1]) * n[1];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b); if (fa <= 0) out.push(a); if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    return out;
  }
  const cutCap = (a, b, ra, rb, frac, bo = 0, bi = 0) => { const u = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(u[0], u[1]) || 1e-6; const n = [u[0] / L, u[1] / L]; return clipHalf(capPts(a, b, ra, rb, bo, bi), [a[0] + u[0] * frac, a[1] + u[1] * frac], n); };

  /* ======================================================================
     MESIN GAIT: port of motion-graphics scripts/gait_engine.py (old mesin_gait.py) (bab 4.3)
     side view, face +x, units H, y down, x 0 = hip joint
     ====================================================================== */
  const BODY = { thigh: 1.27, shin: 1.24, sole_y: 5.78, hip_y: 3.14, ankle_local: [0.13, -0.135], heel_local: [0.03, 0], toe_local: [0.555, -0.008],
    shoe: [[0.02, -0.03], [0, -0.09], [0.025, -0.165], [0.1, -0.15], [0.19, -0.185], [0.3, -0.152], [0.42, -0.122], [0.515, -0.095], [0.562, -0.05], [0.555, -0.008], [0.52, 0], [0.04, 0]],
    shoulder: [-0.02, 1.47], upper: 0.84, fore: 0.78 };
  const GDEF = { T: 1.0, stance: 0.6, step: 2.0, u_flat: 0.15, u_heeloff: 0.55, u_mid: 0.4, knee_hs: 3, knee_load: 20, knee_mid: 5, plantar_to: 25, reach_max: 0.99, lift: 0.2, lift_skew: 0.65,
    swing_flat: 0.55, lean: 2, sh_amp: 11, sh_amp_bag: 4, el_back: 12, el_front: 32, el_bag: 8, arm_lag: 0.03, nod_amp: 1.5, nod_lag: 0.05 };
  const rot2 = (p, deg) => { const a = deg * RAD, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
  const rotAbout = (p, piv, deg) => { const r = rot2([p[0] - piv[0], p[1] - piv[1]], deg); return [r[0] + piv[0], r[1] + piv[1]]; };
  const shoeMap = (cfg) => { const [px, py] = cfg.piv, [ax, ay] = cfg.at; return (p) => { const q = rot2([p[0] - px, p[1] - py], cfg.deg); return [q[0] + ax, q[1] + ay]; }; };
  function ik(h, a, l1, l2, kneeFwd = true) {
    const dx = a[0] - h[0], dy = a[1] - h[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-6), base = Math.atan2(dy, dx);
    const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    let best = null;
    for (const s of [1, -1]) { const k = [h[0] + l1 * Math.cos(base + s * A), h[1] + l1 * Math.sin(base + s * A)]; if (best === null || (k[0] > best[0]) === kneeFwd) best = k; }
    return best;
  }
  const easeIO = (t) => (t = clamp(t), t * t * (3 - 2 * t));
  const hermite = (p0, p1, m0, m1, t) => { const t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1; };

  class Gait {
    constructor(body = {}, kw = {}) {
      const b = (this.b = Object.assign({}, BODY, body)), g = (this.g = Object.assign({}, GDEF, kw));
      this.TH = b.thigh; this.SH = b.shin; this.L_LEG = this.TH + this.SH; this.SOLE = b.sole_y;
      this.HEEL = b.heel_local; this.TOE = b.toe_local; this.ANK = b.ankle_local;
      this.S = 2 * g.step; this.v = this.S / g.T; this.u_ps = 0.5 / g.stance;
      this.H0 = g.stance * this.S * g.u_mid - (this.ANK[0] - this.HEEL[0]);
      this.phi_hs = 14; this.phi_ps = 15;
      for (let i = 0; i < 6; i++) {
        const hy = this._hipFromLead(0);
        this.phi_hs = -Gait.solve((ph) => this.plantar([0, hy], this._ank(0, ph), ph), 0, -40, 0);
        this.phi_ps = this._matchPhiPs();
      }
      this._buildHip();
    }
    kneeReach(kd) { const a = (180 - kd) * RAD; return Math.sqrt(this.TH ** 2 + this.SH ** 2 - 2 * this.TH * this.SH * Math.cos(a)); }
    kneeAtReach(r) { const d = r * this.L_LEG, c = (this.TH ** 2 + this.SH ** 2 - d * d) / (2 * this.TH * this.SH); return 180 - Math.acos(clamp(c, -1, 1)) / RAD; }
    kneeFlex(h, a) { const d = Math.min(dist(h, a), this.L_LEG - 1e-9), c = (this.TH ** 2 + this.SH ** 2 - d * d) / (2 * this.TH * this.SH); return 180 - Math.acos(clamp(c, -1, 1)) / RAD; }
    plantar(hip, ank, phi) {
      const k = ik(hip, ank, this.TH, this.SH), s = [ank[0] - k[0], ank[1] - k[1]], f = [Math.cos(phi * RAD), Math.sin(phi * RAD)];
      const c = (s[0] * f[0] + s[1] * f[1]) / Math.hypot(s[0], s[1]); return 90 - Math.acos(clamp(c, -1, 1)) / RAD;
    }
    shoeMinY(cfg) { const f = shoeMap(cfg); let m = -1e9; for (const q of this.b.shoe) m = Math.max(m, f(q)[1]); return m; }
    heelX(u) { return this.H0 - this.S * this.g.stance * u; }
    cfg(u, phi) {
      const xh = this.heelX(u);
      if (u < this.g.u_heeloff || phi <= 0) return { piv: this.HEEL, at: [xh, this.SOLE], deg: phi };
      return { piv: this.TOE, at: [xh + this.TOE[0] - this.HEEL[0], this.SOLE + this.TOE[1]], deg: phi };
    }
    _ank(u, phi) { return shoeMap(this.cfg(u, phi))(this.ANK); }
    phiLead(u) {
      const g = this.g;
      if (u < g.u_flat) return -this.phi_hs * Math.cos(0.5 * Math.PI * u / g.u_flat);
      if (u < g.u_heeloff) return 0;
      return this.phi_ps * Math.pow(Math.max(0, (u - g.u_heeloff) / (this.u_ps - g.u_heeloff)), 1.6);
    }
    kneeTarget(u) { return Math.max(this.kneeAtReach(this.g.reach_max), this._kneeData(u)); }
    _kneeData(u) {
      const g = this.g;
      if (u < 0.2) return g.knee_hs + (g.knee_load - g.knee_hs) * Math.sin(0.5 * Math.PI * u / 0.2);
      if (u < 0.5) return g.knee_load + (g.knee_mid - g.knee_load) * easeIO((u - 0.2) / 0.3);
      return g.knee_mid;
    }
    _hipFromLead(u, phi) { phi = phi === undefined ? this.phiLead(u) : phi; const [ax, ay] = this._ank(u, phi), d = this.kneeReach(this.kneeTarget(u)); return ay - Math.sqrt(Math.max(d * d - ax * ax, 1e-6)); }
    static solve(f, target, lo, hi, it = 50) {
      let flo = f(lo) - target;
      for (let i = 0; i < it; i++) { const mid = 0.5 * (lo + hi), fm = f(mid) - target; if (fm * flo > 0) { lo = mid; flo = fm; } else hi = mid; }
      return 0.5 * (lo + hi);
    }
    _matchPhiPs() { const target = this._hipFromLead(0); return Gait.solve((ph) => -this._hipFromLead(this.u_ps, ph), -target, 0, 70); }
    _buildHip(n = 240) {
      const ys = [], cr = [], dmax = this.g.reach_max * this.L_LEG;
      for (let i = 0; i < n; i++) {
        const p = i / n, u = (p < 0.5 ? p : p - 0.5) / this.g.stance;
        ys.push(this._hipFromLead(u));
        const [ax, ay] = this._ank(u, this.phiLead(u)); cr.push(ay - Math.sqrt(Math.max(dmax * dmax - ax * ax, 1e-6)));
      }
      const a0 = ys.reduce((s, y) => s + y, 0) / n;
      const co = [2, 4, 6, 8, 10].map((k) => { let ak = 0, bk = 0; ys.forEach((y, i) => { ak += y * Math.cos(TAU * k * i / n); bk += y * Math.sin(TAU * k * i / n); }); return [k, 2 / n * ak, 2 / n * bk]; });
      this._hip = [a0, co];
      let shift = 0; cr.forEach((c, i) => { shift = Math.max(shift, c - this.hipY(i / n)); });
      this._hip = [a0 + shift, co]; this.hipRaw = ys; this.hipShift = shift;
    }
    hipY(p) { const [a0, co] = this._hip; let s = a0; for (const [k, ak, bk] of co) s += ak * Math.cos(TAU * k * p) + bk * Math.sin(TAU * k * p); return s; }
    stanceState(u, pLeg) {
      if (u <= this.u_ps) { const phi = this.phiLead(u); return [phi, this.cfg(u, phi)]; }
      const hip = [0, this.hipY(pLeg)], k = (u - this.u_ps) / (1 - this.u_ps);
      const sl = this.phi_ps * 1.6 / (this.u_ps - this.g.u_heeloff) * (1 - this.u_ps);
      let phi = hermite(this.phi_ps, this._phiTo(), sl, 0, k);
      const dmax = this.g.reach_max * this.L_LEG;
      if (dist(hip, this._ank(u, phi)) > dmax) phi = Gait.solve((ph) => -dist(hip, this._ank(u, ph)), -dmax, phi, 85);
      return [phi, this.cfg(u, phi)];
    }
    _phiTo() { if (this._pto === undefined) { const hip = [0, this.hipY(this.g.stance)]; this._pto = Gait.solve((ph) => this.plantar(hip, this._ank(1, ph), ph), this.g.plantar_to, 0, 85); } return this._pto; }
    footStancePt(p) { const u = clamp(p / this.g.stance, 0, 1), [phi, c] = this.stanceState(u, p); return [shoeMap(c)(this.ANK), phi]; }
    _swingEnds() {
      if (this._sw) return this._sw;
      const g = this.g, dp = 1e-3, dt = dp * g.T;
      const s0 = [0, 1].map((j) => this.footStancePt(g.stance - dp * j)), s1 = [0, 1].map((j) => this.footStancePt(dp * j));
      return (this._sw = { a0: s0[0][0], f0: s0[0][1], a1: s1[0][0], f1: s1[0][1],
        v0: [(s0[0][0][0] - s0[1][0][0]) / dt, (s0[0][0][1] - s0[1][0][1]) / dt], r0: (s0[0][1] - s0[1][1]) / dt,
        v1: [(s1[1][0][0] - s1[0][0][0]) / dt, (s1[1][0][1] - s1[0][0][1]) / dt] });
    }
    foot(p) {
      const g = this.g; p = ((p % 1) + 1) % 1;
      if (p < g.stance) { const u = p / g.stance, [phi, c] = this.stanceState(u, p); return { cfg: c, ankle: shoeMap(c)(this.ANK), phi, stance: true, u }; }
      const w = (p - g.stance) / (1 - g.stance), tsw = (1 - g.stance) * g.T, E = this._swingEnds();
      let x = hermite(E.a0[0], E.a1[0], E.v0[0] * tsw, E.v1[0] * tsw, w), y = hermite(E.a0[1], E.a1[1], E.v0[1] * tsw, E.v1[1] * tsw, w);
      y -= g.lift * Math.pow(Math.sin(Math.PI * Math.pow(w, g.lift_skew)), 2);
      const wf = g.swing_flat, phi = w < wf ? hermite(E.f0, 0, E.r0 * tsw, 0, w / wf) : hermite(0, E.f1, 0, 0, (w - wf) / (1 - wf));
      const hip = [0, this.hipY(p)], d = dist(hip, [x, y]), dmax = g.reach_max * this.L_LEG;
      if (d > dmax) { x = hip[0] + (x - hip[0]) * dmax / d; y = hip[1] + (y - hip[1]) * dmax / d; }
      return { cfg: { piv: this.ANK, at: [x, y], deg: phi }, ankle: [x, y], phi, stance: false, u: w };
    }
    arm(p, bag = false) {
      const g = this.g, b = this.b, amp = bag ? g.sh_amp_bag : g.sh_amp, c = -Math.cos(TAU * (p - g.arm_lag)), th = amp * c;
      const el = bag ? g.el_bag : g.el_back + (g.el_front - g.el_back) * (c + 1) / 2, S = b.shoulder;
      const E = [S[0] + b.upper * Math.sin(th * RAD), S[1] + b.upper * Math.cos(th * RAD)];
      const W = [E[0] + b.fore * Math.sin((th + el) * RAD), E[1] + b.fore * Math.cos((th + el) * RAD)];
      return [[S, E, W], th, el];
    }
    nod(p) { return this.g.nod_amp * Math.cos(2 * TAU * (p - this.g.nod_lag)); }
    pose(p) {
      p = ((p % 1) + 1) % 1;
      const hy = this.hipY(p), hip = [0, hy], near = this.foot(p), far = this.foot(p + 0.5);
      for (const f of [near, far]) { f.knee = ik(hip, f.ankle, this.TH, this.SH); f.flex = this.kneeFlex(hip, f.ankle); f.reach = dist(hip, f.ankle) / this.L_LEG; f.plantar = this.plantar(hip, f.ankle, f.phi); }
      return { p, hip, dy: hy - this.b.hip_y, near, far, lean: this.g.lean, nod: this.nod(p) };
    }
    report(n = 96) {
      const fr = []; for (let i = 0; i < n; i++) fr.push(this.pose(i / n));
      const hy = fr.map((f) => f.hip[1]);
      const sw = fr.map((f) => f.near).filter((s) => !s.stance), st = fr.map((f) => f.near).filter((s) => s.stance);
      const to = st.reduce((a, b) => (Math.abs(b.u - 0.99) < Math.abs(a.u - 0.99) ? b : a));
      let clr = 9; sw.forEach((s) => { if (s.u > 0.15 && s.u < 0.85) clr = Math.min(clr, this.SOLE - this.shoeMinY(s.cfg)); });
      return { bob: Math.max(...hy) - Math.min(...hy), reach: Math.max(...fr.map((f) => Math.max(f.near.reach, f.far.reach))), knee: Math.max(...sw.map((s) => s.flex)),
        plantar: to.plantar, clr, pen: Math.max(0, ...fr.map((f) => this.shoeMinY(f.near.cfg) - this.SOLE)) };
    }
  }


  /* ---------------- 3D space helpers (port of scripts/space3d.py (old ruang3d.py); camera from MGP.core) ---------------- */
  const camHeight = (d, pitch, f, cy, solePx) => { const t = pitch * RAD, k = (solePx - cy) / f; return d * (Math.sin(t) + k * Math.cos(t)) / (Math.cos(t) - k * Math.sin(t)); };
  const light2d = (c, s) => { const lx = dot3(s, c.right), ly = dot3(s, c.up), n = Math.hypot(lx, ly) || 1; return [lx / n, ly / n]; };
  const hazeT = (d, d0 = 15, D = 400, tmax = 0.6) => (d <= d0 ? 0 : tmax * (1 - Math.exp(-(d - d0) / D)));
  const groundScr = (c, xz) => polyScr(c, xz.map((p) => [p[0], 0, p[1]]));
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

  /* ======================================================================
     TUBUH 3D dari pose: port of motion-graphics scripts/shadow3d.py (old bayangan3d.py) (bab 5.3)
     body coords (xs forward, ys down from top of head, l lateral + = right of the figure); sole at ys = sole
     The pose (legs, arms, lean, nod, head yaw) drives two things: capsule prims for the cast shadow and
     contact, and a stylised vector character (mesh parts, flat 3-tone shading, ink rim) for the picture.
     ====================================================================== */
  const PRIM = { torso: [[0, 1.62], [0, 3.0], 0.34], neck: [[0, 1.0], [-0.02, 1.4], 0.12], head: [[0.04, 0.55], 0.5], chin: [0, 1.0], lean_piv: [0, 2.9],
    thigh_r: 0.21, shin_r: 0.15, foot_r: 0.1, upper_r: 0.11, fore_r: 0.09, hand_r: 0.1, lat_hip: 0.16, lat_sh: 0.42 };
  // character proportions: classical adult canon of 7.5 heads on the 5.78 H body (one head HD = 0.771 H). Landmarks in heads
  // from the crown: chin 1, nipples 2, navel 3, crotch 3.75 (half the height), knee 5.625 (a quarter of the height above the floor).
  // Widths: shoulders 2 heads outside the deltoids, hips 1.5, neck 0.5 (0.3 long); chest depth 0.75 of the chest width; foot 1.1.
  // Arms: upper arm 1.5 heads from the shoulder top, forearm + hand 1.9; elbow at the waist, wrist at the crotch, fingertips mid-thigh.
  // The legs walk on a scaled copy of the gait engine (same angles and timing, longer bones, bigger shoe).
  const HD = 5.78 / 7.5;
  const FIG = { hc: [0.03, 0.41], A: 0.3, Ab: 0.34, B: 0.265, C: 0.36, chin: [0.03, 0.74], HIP: 2.78, lean_piv: [0, 2.6],
    hipLat: 0.3, sh: [-0.03, 1.25], shLat: 0.6, upper: 0.95, fore: 0.75, hand: 0.68 };
  const FKS = 1.6, FLEG = { thigh: 1.54, shin: 1.272 }, FKL = (FLEG.thigh + FLEG.shin) / (BODY.thigh + BODY.shin);
  const FIG_BODY = { thigh: FLEG.thigh, shin: FLEG.shin, hip_y: FIG.HIP, sole_y: BODY.sole_y,
    ankle_local: BODY.ankle_local.map((v) => v * FKS), heel_local: BODY.heel_local.map((v) => v * FKS), toe_local: BODY.toe_local.map((v) => v * FKS),
    shoe: BODY.shoe.map((p) => p.map((v) => v * FKS)), shoulder: FIG.sh, upper: FIG.upper, fore: FIG.fore };
  const FIG_GAIT = { step: GDEF.step * FKL, lift: GDEF.lift * FKL };
  const figGait = () => new Gait(FIG_BODY, FIG_GAIT);
  const FCOL = { skin: "#f0b892", skinD: "#c98663", hair: "#3b2620", hairL: "#7a5040", top: "#d8693f", pants: "#2d4068", shoe: "#f3eee4", sole: "#4b4352", eye: "#241a22", lip: "#a8483f", blush: "#f08a78", ink: "#1f1526" };
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm3 = (a) => { const m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; };
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  // point on the bone a -> b (body xy, lateral la -> lb) at u, pushed k off the axis along the in-plane normal (+ = behind a hanging bone)
  const segPt = (a, b, u, k, la, lb) => { const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; return [lerp(a[0], b[0], u) - dy / m * k, lerp(a[1], b[1], u) + dx / m * k, lerp(la, lb, u)]; };

  // pose builders: walking (from the scaled gait engine) and standing (orbit hero)
  function figWalk(gt, p) {
    const pz = gt.pose(p), U = (q) => { const r = rotAbout(q, FIG.lean_piv, pz.lean); return [r[0], r[1] + pz.dy]; };
    const hy = pz.hip[1], legs = [];
    // walking narrows the base: knees and ankles come in towards the line of progress
    for (const [leg, s] of [[pz.near, 1], [pz.far, -1]]) { const f = shoeMap(leg.cfg); legs.push({ s, lat: FIG.hipLat * s, latK: 0.2 * s, latA: 0.15 * s, toeLat: 0.19 * s, hip: [0, hy], knee: leg.knee, ankle: leg.ankle, heel: f(gt.HEEL), toe: f(gt.TOE) }); }
    const arms = [[0, 1], [0.5, -1]].map(([side, s]) => { const [S, E, W] = gt.arm(p + side)[0]; return { s, S, E, W, lat: [FIG.shLat * s, 0.66 * s, 0.7 * s] }; });
    return { legs, arms, U, nod: pz.nod, yaw: 0 };
  }
  function figStand(t) {
    const br = 0.006 * Math.sin(t * TAU / 4.2), hy = FIG.HIP + br, legs = [], B = FIG_BODY;
    const ank = [0, B.sole_y + B.ankle_local[1]], heel = [B.heel_local[0] - B.ankle_local[0], B.sole_y], toe = [B.toe_local[0] - B.ankle_local[0], B.sole_y + B.toe_local[1]];
    const knee = ik([0, hy], ank, B.thigh, B.shin, true);
    for (const s of [1, -1]) legs.push({ s, lat: FIG.hipLat * s, latK: 0.2 * s, latA: 0.17 * s, toeLat: 0.25 * s, hip: [0, hy], knee, ankle: ank, heel, toe });
    const U = (q) => [q[0], q[1] + br];
    // relaxed arms: elbow a touch behind the shoulder, forearm slightly forward, hanging a little away from the body
    const arms = [1, -1].map((s) => { const S = B.shoulder, E = [S[0] - 0.035, S[1] + Math.sqrt(B.upper * B.upper - 0.035 * 0.035)], W = [E[0] + B.fore * Math.sin(9 * RAD), E[1] + B.fore * Math.cos(9 * RAD)]; return { s, S, E, W, lat: [FIG.shLat * s, 0.665 * s, 0.705 * s] }; });
    // weight shift and a slow look around: the face turns with the head
    return { legs, arms, U, nod: 1.2 * Math.sin(t * TAU / 5.3), yaw: 22 * Math.sin(t * TAU / 9.5) };
  }
  // landmarks of a pose in heads from the crown (used by the proportion test page)
  function figMeasure(J) {
    const A = J.arms[0], U = J.U, S = U(A.S), E = U(A.E), W = U(A.W), d = nrm3(sub3([...W, A.lat[2]], [...E, A.lat[1]])), L = J.legs[0];
    return { chin: (FIG.hc[1] + FIG.C) / HD, knee: L.knee[1] / HD, elbow: E[1] / HD, wrist: W[1] / HD, finger: (W[1] + d[1] * (FIG.hand - 0.05)) / HD,
      upper: (E[1] - (S[1] - 0.135)) / HD, forehand: (FIG.fore + FIG.hand - 0.05) / HD, neckLen: (1.0 - (FIG.hc[1] + FIG.C)) / HD,
      foot: (dist(L.heel, L.toe) + 0.03) / HD };
  }
  // head frame: local (x fwd, y down, l lat) about the head centre -> yaw -> nod about the chin -> upper-body lean/bob
  const headFn = (J) => { const a = J.yaw * RAD, c = Math.cos(a), s = Math.sin(a); return (q) => { const x = q[0] * c - q[2] * s, l = q[0] * s + q[2] * c, r = J.U(rotAbout([FIG.hc[0] + x, FIG.hc[1] + q[1]], FIG.chin, J.nod)); return [r[0], r[1], l]; }; };
  // capsule prims for the cast shadow / contact (same pose, same volumes as the picture)
  function figPrims(J) {
    const out = [], U = J.U, H = headFn(J);
    for (const L of J.legs) {
      out.push(["cap", [...L.hip, L.lat], [...L.knee, L.latK], 0.24, "pants"]);
      out.push(["cap", [...L.knee, L.latK], [...L.ankle, L.latA], 0.15, "pants"]);
      out.push(["cap", [L.heel[0], L.heel[1] - 0.11, L.latA], [L.toe[0], L.toe[1] - 0.08, L.toeLat], 0.13, "shoe"]);
    }
    for (const l of [-0.24, 0.24]) out.push(["cap", [...U([0, 1.3]), l], [...U([0, 2.7]), l], 0.32, "top"]);
    out.push(["cap", [...U([0, 0.7]), 0], [...U([-0.03, 1.1]), 0], 0.19, "skin"]);
    out.push(["sph", H([0, 0, 0]), 0.36, "head"]);
    out.push(["sph", H([-0.03, -0.04, 0]), 0.38, "hair"]);
    for (const A of J.arms) {
      const S = U(A.S), E = U(A.E), W = U(A.W), d = nrm3(sub3([...W, 0], [...E, 0]));
      out.push(["cap", [...S, A.lat[0]], [...E, A.lat[1]], 0.14, "top"]);
      out.push(["cap", [...E, A.lat[1]], [...W, A.lat[2]], 0.1, "skin"]);
      out.push(["sph", [W[0] + d[0] * 0.3, W[1] + d[1] * 0.3, A.lat[2]], 0.12, "skin"]);
    }
    out.pose = J;
    return out;
  }
  const walkPrims = (gt, p) => figPrims(figWalk(gt, p));
  const standPrims = (t) => figPrims(figStand(t));

  // ---- mesh parts ----
  // tube through control rings {c, a (lateral half), b (other half)}; optional rounded caps; superellipse power pw
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
  const gridFn = (rows, cols, fn) => { const pts = []; for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pts.push(fn(i, j)); return { pts, rows, cols }; };
  // head surface (local, centred): rounder skull, jaw narrowing to a soft chin
  function headS(th, ph) {
    const st = Math.sin(th), ct = Math.cos(th), cp = Math.cos(ph), sp = Math.sin(ph), q = th / Math.PI;
    const jaw = 1 - 0.24 * smooth01((q - 0.5) / 0.5) - 0.05 * smooth01((q - 0.2) / 0.3) * Math.max(0, -cp);
    const A = cp > 0 ? FIG.A : FIG.Ab;
    return [A * st * cp * jaw + 0.035 * smooth01((q - 0.66) / 0.3) * Math.max(0, cp), -FIG.C * ct, FIG.B * st * sp * jaw];
  }
  // hairline: forehead in front, above the ears at the side, nape at the back; side-swept fringe
  function hairMax(ph) {
    const w = ((ph % TAU) + TAU) % TAU, u = Math.min(w, TAU - w) / Math.PI;
    let m = lerp(0.35, 0.53, smooth01(u / 0.3)); m = lerp(m, 0.8, smooth01((u - 0.55) / 0.4));
    // fringe swept to one side, ragged tufts along the edge (front and nape)
    const fr = Math.max(0, 1 - u / 0.42), sw = Math.sin(ph);
    m += fr * (0.02 + 0.07 * smooth01((sw + 0.25) / 1.0));
    m += 0.075 * Math.exp(-Math.pow((u - 0.41) / 0.045, 2)) - 0.03 * Math.exp(-Math.pow((u - 0.52) / 0.06, 2));
    const tuft = Math.abs(Math.sin(ph * 9 + 0.4)); m += (fr + smooth01((u - 0.7) / 0.3)) * 0.045 * (1 - tuft * tuft);
    return m * Math.PI;
  }
  function hairS(th, ph) {
    const p = headS(th, ph), cp = Math.cos(ph), q = th / Math.PI, top = Math.max(0, Math.cos(th));
    const vol = 0.05 + 0.065 * Math.pow(top, 1.4) + 0.07 * Math.exp(-Math.pow((q - 0.19) / 0.12, 2)) * Math.pow(Math.max(0, cp), 2) + 0.03 * Math.max(0, -cp) * smooth01((q - 0.3) / 0.3);
    return [p[0] * (1 + vol) - 0.012 * top, p[1] * (1 + vol) - 0.02, p[2] * (1 + vol)];
  }
  const surfFrame = (fn, th, ph) => { const e = 0.01, P = fn(th, ph), Tp = nrm3(sub3(fn(th, ph + e), fn(th, ph - e))), Tt = nrm3(sub3(fn(th + e, ph), fn(th - e, ph))); let n = nrm3(cross3(Tt, Tp)); if (dot3(n, P) < 0) n = [-n[0], -n[1], -n[2]]; return { P, Tp, Tt, n }; };

  // draw one mesh: union silhouette (ink rim by stroke-then-fill), shadow side and lit side clipped at the terminator
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
    if (o.ink !== false && o.lw > 0) { g.lineJoin = "round"; g.lineWidth = o.lw * 2; g.strokeStyle = o.inkCol || rgba(FCOL.ink, 0.62); g.stroke(); }
    g.fillStyle = col; g.fill();
    if (o.face === "back") return;
    // clip each visible quad where f(vertex) <= 0, f linear along the edges
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
    // soft: rim factor per vertex (1 at the silhouette, 0 facing the camera) for rim and bounce light
    let fr = null;
    if (o.soft || o.rim) { fr = new Float64Array(N); for (let i = 0; i < N; i++) { const n = nrm3([VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2]]); fr[i] = 1 + dot3(n, nrm3(sub3(P[i], cam.pos))); } }
    if (o.soft) band((i) => 0.45 - lam[i], rgba(mix(col, "#fff3d6", 0.25), 0.22));
    band((i) => lam[i] - thr, o.dark || mix(col, "#4a2848", 0.3));
    if (o.soft) { band((i) => lam[i] + 0.38, rgba(mix(col, "#2a1530", 0.55), 0.32)); band((i) => Math.max(0.84 - fr[i], lam[i] + 0.05), rgba(mix(col, "#ffb27a", 0.35), 0.28)); }
    if (o.light !== false) band((i) => (o.lthr || 0.8) - lam[i], o.lightCol || rgba(mix(col, "#fff3d6", 0.5), 0.45));
    if (fr) band((i) => Math.max(0.84 - fr[i], -0.05 - lam[i]), rgba(mix(col, "#fff6e0", 0.6), 0.34));
  }

  // the character, drawn back to front from the pose
  function drawFigure(g, cam, J, base, face, sole, sun, opt) {
    // library extension: opt = {pal, scale} (or J.pal / J.scale); defaults reproduce the website figure
    opt = opt || {}; const FCOL = palette(Object.assign({}, J.pal || {}, opt.pal || {})), KS = opt.scale || J.scale || 1, INK = rgba(FCOL.ink, 0.62);
    const dmI = (M, s_, col, o) => drawMesh(g, cam, M, s_, col, Object.assign({ inkCol: INK }, o));
    const Wd = (q) => toWorld(q, base, face, sole, KS), Wg = (gr) => ({ pts: gr.pts.map(Wd), rows: gr.rows, cols: gr.cols });
    const latW = [Math.cos(face * RAD), 0, -Math.sin(face * RAD)], latFar = dot3(latW, cam.fwd), U = J.U, H = headFn(J);
    const zOf = (q) => camC(cam, Wd(q))[2];
    const pxu = KS * cam.f / Math.max(cam.near, zOf(U([0, 2.5]))), lw = clamp(0.016 * pxu, 0.45, 2.1);
    // soft shading: core shadow, half-light, highlight, rim light and warm bounce light on top of the 3 tones
    const O = { lw, soft: true };
    // legs: sole, shoe, trouser leg (thigh, knee, calf bulge behind the shin, ankle; the hem falls over the shoe)
    const legGroup = (L) => () => {
      const dir2 = (() => { const d = [L.toe[0] - L.heel[0], L.toe[1] - L.heel[1]], m = Math.hypot(d[0], d[1]) || 1; return [d[0] / m, d[1] / m]; })(), up2 = [dir2[1], -dir2[0]];
      const sp = (p2, along, upk, l) => [p2[0] + dir2[0] * along + up2[0] * upk, p2[1] + dir2[1] * along + up2[1] * upk, l];
      const lh = L.latA, lt = L.toeLat;
      const so = tubeGrid([{ c: sp(L.heel, 0.1, 0.027, lh), a: 0.15, b: 0.03 }, { c: sp(L.heel, 0.42, 0.027, lerp(lh, lt, 0.4)), a: 0.165, b: 0.03 }, { c: sp(L.toe, -0.1, 0.025, lt), a: 0.152, b: 0.028 }], 14, [true, true]);
      dmI(Wg(so), sun, FCOL.sole, { lw, light: false });
      const shoe = tubeGrid([{ c: sp(L.heel, 0.12, 0.15, lh), a: 0.14, b: 0.14 }, { c: sp(L.heel, 0.45, 0.135, lerp(lh, lt, 0.4)), a: 0.163, b: 0.13 }, { c: sp(L.toe, -0.13, 0.088, lt), a: 0.148, b: 0.082 }], 16, [true, true]);
      dmI(Wg(shoe), sun, FCOL.shoe, O);
      const hip = [...L.hip, L.lat], kn = [...L.knee, L.latK];
      const T = (u, k) => segPt(L.hip, L.knee, u, k, L.lat, L.latK), Sh = (u, k) => segPt(L.knee, L.ankle, u, k, L.latK, L.latA);
      const leg = tubeGrid([{ c: T(0, 0.03), a: 0.28, b: 0.31 }, { c: T(0.18, 0.025), a: 0.265, b: 0.29 }, { c: T(0.42, -0.005), a: 0.235, b: 0.255 },
        { c: T(0.7, -0.01), a: 0.2, b: 0.212 }, { c: T(0.92, 0), a: 0.172, b: 0.178 }, { c: kn, a: 0.165, b: 0.17 },
        { c: Sh(0.14, 0.02), a: 0.165, b: 0.178 }, { c: Sh(0.33, 0.04), a: 0.168, b: 0.188 }, { c: Sh(0.58, 0.022), a: 0.142, b: 0.15 },
        { c: Sh(0.82, 0.005), a: 0.12, b: 0.124 }, { c: Sh(1, 0), a: 0.115, b: 0.118 }, { c: Sh(1.07, -0.01), a: 0.125, b: 0.13 }], 18);
      void hip;
      dmI(Wg(leg), sun, FCOL.pants, O);
    };
    // arms: tapered skin tube (deltoid, biceps, elbow, forearm bulge, flat wrist), mitten hand with the palm to the thigh, short sleeve
    const armGroup = (A) => () => {
      const S2 = U(A.S), E2 = U(A.E), W2 = U(A.W), S = [...S2, A.lat[0]], E = [...E2, A.lat[1]], Wr = [...W2, A.lat[2]], d = nrm3(sub3(Wr, E));
      const Up = (u, k) => segPt(S2, E2, u, k, A.lat[0], A.lat[1]), Fo = (u, k) => segPt(E2, W2, u, k, A.lat[1], A.lat[2]);
      const arm = tubeGrid([{ c: S, a: 0.135, b: 0.145 }, { c: Up(0.12, 0), a: 0.158, b: 0.16 }, { c: Up(0.32, 0), a: 0.152, b: 0.158 }, { c: Up(0.55, -0.014), a: 0.135, b: 0.142 }, { c: Up(0.85, 0), a: 0.112, b: 0.118 }, { c: E, a: 0.104, b: 0.11 },
        { c: Fo(0.15, -0.01), a: 0.122, b: 0.13 }, { c: Fo(0.4, -0.004), a: 0.108, b: 0.112 }, { c: Fo(0.72, 0), a: 0.084, b: 0.088 }, { c: Wr, a: 0.06, b: 0.082 }], 14);
      dmI(Wg(arm), sun, FCOL.skin, O);
      const fw = [1, 0, 0], inw = [0, 0, -Math.sign(A.lat[0])], hp = (u, f = 0, i = 0) => add3(add3(add3(Wr, d, u), fw, f), inw, i);
      const hand = tubeGrid([{ c: hp(0.05), a: 0.052, b: 0.095 }, { c: hp(0.22, 0.005), a: 0.062, b: 0.12 }, { c: hp(0.42, 0.012, 0.008), a: 0.052, b: 0.11 }, { c: hp(0.57, 0.03, 0.02), a: 0.04, b: 0.09 }], 12, [true, true]);
      const thumb = tubeGrid([{ c: hp(0.1, 0.07, 0.01), a: 0.034, b: 0.034 }, { c: hp(0.25, 0.1, 0.025), a: 0.03, b: 0.029 }, { c: hp(0.34, 0.095, 0.035), a: 0.025, b: 0.025 }], 8, [false, true]);
      dmI(Wg(thumb), sun, FCOL.skin, O);
      dmI(Wg(hand), sun, FCOL.skin, O);
      const sleeve = tubeGrid([{ c: S, a: 0.14, b: 0.155 }, { c: Up(0.13, 0), a: 0.172, b: 0.175 }, { c: Up(0.26, 0), a: 0.17, b: 0.173 }, { c: Up(0.42, 0), a: 0.162, b: 0.166 }], 18, [true, false]);
      dmI(Wg(sleeve), sun, FCOL.top, O);
    };
    const legs = J.legs.map((L) => ({ z: zOf([...L.knee, L.latK]), f: legGroup(L) })).sort((a, b) => b.z - a.z);
    const arms = J.hideArms ? [] : J.arms.map((A) => ({ z: zOf([...U(A.E), A.lat[1]]), far: A.s * latFar > 0.25, f: armGroup(A) })).sort((a, b) => b.z - a.z);
    arms.filter((a) => a.far).forEach((a) => a.f());
    legs.forEach((l) => l.f());
    // pelvis with the glutes (no rim: it merges into the trouser legs), neck, fitted shirt with chest, shoulder blades, waist and lumbar curve
    const ring = (x, y, a, b, l = 0) => ({ c: [...U([x, y]), l], a, b });
    dmI(Wg(tubeGrid([ring(0.02, 2.3, 0.43, 0.285), ring(0.0, 2.52, 0.52, 0.315), ring(-0.03, 2.72, 0.575, 0.345), ring(-0.05, 2.84, 0.54, 0.35), ring(-0.05, 2.9, 0.33, 0.28)], 22, [false, false], 2.2)), sun, FCOL.pants, { lw, ink: false, soft: true });
    dmI(Wg(tubeGrid([ring(0.01, 0.62, 0.16, 0.165), ring(-0.01, 0.8, 0.188, 0.18), ring(-0.03, 0.98, 0.198, 0.19), ring(-0.04, 1.1, 0.23, 0.21)], 14)), sun, mix(FCOL.skin, FCOL.skinD, 0.35), O);
    dmI(Wg(tubeGrid([ring(-0.035, 0.99, 0.205, 0.19), ring(-0.04, 1.02, 0.31, 0.21), ring(-0.04, 1.06, 0.42, 0.24), ring(-0.035, 1.11, 0.52, 0.27), ring(-0.025, 1.18, 0.585, 0.31), ring(-0.005, 1.3, 0.55, 0.352), ring(0.04, 1.5, 0.51, 0.385),
      ring(0.045, 1.72, 0.475, 0.36), ring(0.035, 1.93, 0.435, 0.315), ring(0.025, 2.12, 0.415, 0.282), ring(0.022, 2.28, 0.44, 0.294), ring(0.018, 2.42, 0.485, 0.31)], 24, [false, false], 2.3)), sun, FCOL.top, O);
    // head group
    const hz = zOf(H([0, 0, 0])), Hg = (gr) => ({ pts: gr.pts.map((q) => Wd(H(q))), rows: gr.rows, cols: gr.cols });
    const hairG = Hg(gridFn(12, 32, (i, j) => { const ph = TAU * j / 32; return hairS(hairMax(ph) * i / 11, ph); }));
    const headG = Hg(gridFn(14, 24, (i, j) => headS(Math.PI * i / 13, TAU * j / 24)));
    const bits = [];
    for (const s of [1, -1]) {
      const F = surfFrame(headS, 0.555 * Math.PI, s * (Math.PI / 2 + 0.16)), c = add3(F.P, F.n, 0.012);
      bits.push({ z: zOf(H(c)), m: Hg(tubeGrid([{ c: add3(c, [0, -0.05, 0]), a: 0.034, b: 0.058 }, { c: add3(c, [0.0, 0.042, 0]), a: 0.032, b: 0.05 }], 10, [true, true])), col: FCOL.skin });
    }
    { const F = surfFrame(headS, 0.6 * Math.PI, 0), c = add3(F.P, F.n, 0.004); bits.push({ z: zOf(H(add3(c, [0.03, 0, 0]))), m: Hg(tubeGrid([{ c: add3(c, [-0.006, -0.035, 0]), a: 0.022, b: 0.02 }, { c: add3(c, [0.008, 0.012, 0]), a: 0.03, b: 0.028 }], 10, [true, true])), col: FCOL.skin, o: { lw, ink: false } }); }
    dmI(hairG, sun, FCOL.hair, { lw, face: "back" });
    bits.filter((b) => b.z > hz).forEach((b) => dmI(b.m, sun, b.col, b.o || O));
    dmI(headG, sun, FCOL.skin, O);
    bits.filter((b) => b.z <= hz).forEach((b) => dmI(b.m, sun, b.col, b.o || O));
    // face features on the head surface: foreshortened with the head, hidden when turned away
    const camP = cam.pos;
    const featVis = (F) => { const P = Wd(H(F.P)), n = sub3(Wd(H(add3(F.P, F.n, 0.05))), P); return -dot3(nrm3(n), nrm3(sub3(P, camP))); };
    const toS = (q) => { const c = camC(cam, Wd(H(q))); return c[2] < cam.near ? null : scr(cam, c); };
    const blob = (th, ph, du, dv, col, alpha) => { const F = surfFrame(headS, th, ph), fv = featVis(F); if (fv < 0.04) return; const pts = []; for (let k = 0; k < 14; k++) { const a = TAU * k / 14, q = add3(add3(add3(F.P, F.n, 0.004), F.Tp, du * Math.cos(a)), F.Tt, dv * Math.sin(a)), s = toS(q); if (!s) return; pts.push(s); } g.globalAlpha = alpha * clamp((fv - 0.04) * 5); g.fillStyle = col; g.beginPath(); lines(g, pts); g.fill(); g.globalAlpha = 1; };
    const stroke = (ths, phs, wd, col, alpha = 1) => { const F = surfFrame(headS, ths[1], phs[1]), fv = featVis(F); if (fv < 0.04) return; const pts = ths.map((th, k) => { const f = surfFrame(headS, th, phs[k]); return toS(add3(f.P, f.n, 0.004)); }); if (pts.some((p) => !p)) return; g.globalAlpha = alpha * clamp((fv - 0.04) * 5); g.strokeStyle = col; g.lineWidth = Math.max(0.6, wd * pxu); g.lineCap = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.quadraticCurveTo(2 * pts[1][0] - (pts[0][0] + pts[2][0]) / 2, 2 * pts[1][1] - (pts[0][1] + pts[2][1]) / 2, pts[2][0], pts[2][1]); g.stroke(); g.globalAlpha = 1; };
    const PI = Math.PI;
    for (const s of [1, -1]) {
      blob(0.62 * PI, s * 0.6, 0.055, 0.032, FCOL.blush, 0.34);
      blob(0.515 * PI, s * 0.37, 0.028, 0.042, FCOL.eye, 1);
      blob(0.503 * PI, s * 0.37 + 0.032, 0.01, 0.01, "#fffaf0", 0.95);
      stroke([0.45 * PI, 0.435 * PI, 0.445 * PI], [s * 0.19, s * 0.37, s * 0.54], 0.03, FCOL.hair, 0.95);
    }
    stroke([0.712 * PI, 0.726 * PI, 0.712 * PI], [-0.14, 0, 0.14], 0.018, FCOL.lip, 0.9);
    dmI(hairG, sun, FCOL.hair, { lw, face: "front", lightCol: rgba(FCOL.hairL, 0.75), lthr: 0.55, rim: true });
    // strands: the side part sweeping into the fringe, and the crown falling to the nape
    const strand = (pts, col, wd) => {
      g.strokeStyle = col; g.lineWidth = Math.max(0.5, wd * pxu); g.lineCap = "round"; let on = false; g.beginPath();
      for (const [th, ph] of pts) { const F = surfFrame(hairS, th, ph), s = toS(add3(F.P, F.n, 0.004)), v = s && featVis(F) > 0.08; if (v) { on ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); on = true; } else on = false; }
      g.stroke();
    };
    const sCol = rgba(FCOL.hairL, 0.6), dCol = rgba("#170d10", 0.45);
    for (let k = 0; k < 5; k++) { const pe = -0.25 + k * 0.3, pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10, ph = lerp(-0.62 + k * 0.05, pe, smooth01(u)), th = lerp(0.07 * PI, hairMax(ph) * 0.96, Math.pow(u, 0.85)); pts.push([th, ph]); } strand(pts, k % 2 ? dCol : sCol, 0.012); }
    for (let k = 0; k < 6; k++) { const pe = PI + (k - 2.5) * 0.42, pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10, ph = lerp(PI + (k - 2.5) * 0.1, pe, u), th = lerp(0.1 * PI, hairMax(ph) * 0.95, u); pts.push([th, ph]); } strand(pts, k % 2 ? dCol : sCol, 0.011); }
    strand(Array.from({ length: 9 }, (_, i) => [lerp(0.04, 0.3, i / 8) * PI, -0.62 - i * 0.02]), rgba("#170d10", 0.6), 0.015);
    // near arms last
    arms.filter((a) => !a.far).forEach((a) => a.f());
  }
  // body point -> world; k = body scale (library extension, 1 = website)
  const toWorld = (q, base, face, sole, k = 1) => { const a = face * RAD, f = [Math.sin(a), Math.cos(a)], r = [Math.cos(a), -Math.sin(a)]; return [base[0] + k * (q[0] * f[0] + q[2] * r[0]), k * (sole - q[1]), base[1] + k * (q[0] * f[1] + q[2] * r[1])]; };
  const groundOf = (P, sun) => { const k = P[1] / sun[1]; return [P[0] - sun[0] * k, P[2] - sun[2] * k]; };
  // perspective render of the body: every point projected, feet stay on their world points
  function drawPrims(g, cam, prims, base, face, sole, sun, opt) { if (prims.pose) drawFigure(g, cam, prims.pose, base, face, sole, sun, opt); }
  // ground-space shadow of the body: every point P -> G = P - sun * (P_y / sun_y); sphere -> ellipse, axis r / sin e along the sun
  function shadowShapes(prims, base, face, sole, sun, ks = 1) {
    const e = Math.asin(Math.max(1e-3, sun[1])), sh = [-sun[0], -sun[2]], m = Math.hypot(sh[0], sh[1]) || 1, ang = Math.atan2(sh[1] / m, sh[0] / m), out = [];
    for (const pr of prims) {
      if (pr[0] === "cap") {
        const A = groundOf(toWorld(pr[1], base, face, sole, ks), sun), B = groundOf(toWorld(pr[2], base, face, sole, ks), sun), r = pr[3] * ks;
        const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(d[0], d[1]);
        if (L < 1e-4) { out.push(ellipseXZ(A[0], A[1], r, r, 0, 20)); continue; }
        const a0 = Math.atan2(d[1], d[0]), pts = [];
        for (let k = 0; k <= 10; k++) { const t = a0 + Math.PI / 2 + Math.PI * k / 10; pts.push([A[0] + r * Math.cos(t), A[1] + r * Math.sin(t)]); }
        for (let k = 0; k <= 10; k++) { const t = a0 - Math.PI / 2 + Math.PI * k / 10; pts.push([B[0] + r * Math.cos(t), B[1] + r * Math.sin(t)]); }
        out.push(pts);
      } else { const G = groundOf(toWorld(pr[1], base, face, sole, ks), sun); out.push(ellipseXZ(G[0], G[1], pr[2] * ks / Math.sin(e), pr[2] * ks, ang, 24)); }
    }
    return out;
  }
  // contact occlusion under parts closer than h = 0.12 H to the ground
  function contactShapes(prims, base, face, sole, h = 0.12, ks = 1) {
    const out = [];
    for (const pr of prims) {
      if (pr[0] !== "cap" || !(sole - pr[1][1] < h + 0.1 && sole - pr[2][1] < h + 0.1)) continue;
      const A = toWorld(pr[1], base, face, sole, ks), B = toWorld(pr[2], base, face, sole, ks), lift = (Math.min(A[1], B[1]) - pr[3] * ks) / ks;
      if (lift > h) continue;
      const k = 1 - clamp(lift / h), ln = Math.hypot(B[0] - A[0], B[2] - A[2]) / 2 + 0.1 * ks;
      out.push([ellipseXZ((A[0] + B[0]) / 2, (A[2] + B[2]) / 2, ln, 0.13 * ks, Math.atan2(B[2] - A[2], B[0] - A[0]), 24), k]);
    }
    return out;
  }
  const fillScr = (g, pts) => { if (!pts) return; g.beginPath(); lines(g, pts); g.fill(); };

  /* ---------------- library extras (not in the website code) ---------------- */
  const PAL_ALIAS = { shirt: "top", trousers: "pants", shoes: "shoe", skinShadow: "skinD", hairLight: "hairL" };
  /** FCOL merged with a user palette (accepts the aliases shirt / trousers / shoes) */
  function palette(p) {
    const out = Object.assign({}, FCOL);
    if (p) for (const k of Object.keys(p)) { if (p[k] == null) continue; out[PAL_ALIAS[k] || k] = p[k]; }
    return out;
  }
  /** offscreen layer with the same pixel ratio as g, cleared, transform set to logical units */
  function layer(S, key, g) {
    const tr = g.getTransform ? g.getTransform() : { a: 1, b: 0 }, dpr = Math.hypot(tr.a, tr.b) || 1;
    const w = Math.ceil(S.W * dpr), h = Math.ceil(S.H * dpr), cache = S.cache || (S.cache = {});
    let L = cache["layer_" + key];
    if (!L || L.width !== w || L.height !== h) L = cache["layer_" + key] = C.offscreen(w, h);
    const lg = L.getContext("2d");
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalAlpha = 1; lg.globalCompositeOperation = "source-over"; lg.filter = "none"; lg.clearRect(0, 0, w, h);
    lg.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c: L, g: lg };
  }
  /** composite the figure's cast shadow (+ contact occlusion) onto g. o: {W, H, S (state for layer cache), color, opacity, soft, contact, contactColor, contactOpacity, scale} */
  function castShadow(g, cam, prims, base, face, sole, sun, o) {
    o = o || {}; const S = o.S || { W: o.W, H: o.H, cache: {} }, W = S.W, H = S.H, k = o.scale || 1;
    const L = layer(S, "shadow", g); L.g.fillStyle = o.color || "#3a3f66";
    shadowShapes(prims, base, face, sole, sun, k).forEach((q) => fillScr(L.g, groundScr(cam, q)));
    if (o.extra) o.extra(L.g);
    g.save(); g.globalAlpha = o.opacity == null ? 0.34 : o.opacity; g.globalCompositeOperation = "multiply";
    if (o.soft > 0) g.filter = `blur(${o.soft}px)`; g.drawImage(L.c, 0, 0, W, H); g.restore();
    if (o.contact !== false) {
      const A = layer(S, "contact", g); A.g.fillStyle = o.contactColor || "#3b4a3a";
      contactShapes(prims, base, face, sole, 0.12, k).forEach(([q, s]) => { A.g.globalAlpha = s; fillScr(A.g, groundScr(cam, q)); }); A.g.globalAlpha = 1;
      g.save(); g.globalAlpha = o.contactOpacity == null ? 0.22 * 2.2 : o.contactOpacity; g.globalCompositeOperation = "multiply"; g.drawImage(A.c, 0, 0, W, H); g.restore();
    }
  }
  /** plaza floor: world grid lines every `step` H around x = cx (near-plane clipped) */
  function drawTiles(g, cam, cx, o) {
    o = o || {}; const step = o.step || 1, half = o.half || 30, zr = o.zr || 24;
    g.strokeStyle = o.color || "rgba(120,96,60,.28)"; g.lineWidth = o.lw || 1;
    const cx0 = Math.floor(cx / step) * step - half, segs = [];
    for (let x = cx0; x <= cx0 + 2 * half; x += step) segs.push([[x, -zr], [x, zr]]);
    for (let z = -zr; z <= zr; z += step) segs.push([[cx0, z], [cx0 + 2 * half, z]]);
    for (const [a, b] of segs) {
      const A = camC(cam, [a[0], 0, a[1]]), B = camC(cam, [b[0], 0, b[1]]); if (A[2] < cam.near && B[2] < cam.near) continue;
      let P1 = A, P2 = B;
      if (P1[2] < cam.near) { const k = (cam.near - P1[2]) / (P2[2] - P1[2]); P1 = [P1[0] + (P2[0] - P1[0]) * k, P1[1] + (P2[1] - P1[1]) * k, cam.near]; }
      if (P2[2] < cam.near) { const k = (cam.near - P2[2]) / (P1[2] - P2[2]); P2 = [P2[0] + (P1[0] - P2[0]) * k, P2[1] + (P1[1] - P2[1]) * k, cam.near]; }
      const s1 = scr(cam, P1), s2 = scr(cam, P2); g.beginPath(); g.moveTo(s1[0], s1[1]); g.lineTo(s2[0], s2[1]); g.stroke();
    }
  }
  /** value of an option that may be a number, [[t,v],...] keys or a function of t */
  const valAt = (v, t) => (typeof v === "function" ? v(t) : Array.isArray(v) ? C.key(v, t) : +v || 0);
  const gaitFor = (o) => new Gait(FIG_BODY, { step: (o.step == null ? GDEF.step : o.step) * FKL, lift: (o.lift == null ? GDEF.lift : o.lift) * FKL, T: 120 / (o.cadence || 120) });
  /** pose of the module at time t: {J, base, p} (shared by figure3d / shadow3d / scene-park3d) */
  function poseAt(gt, o, t) {
    const sole = 5.78, k = o.scale || 1, a = (o.face || 0) * RAD;
    if (o.action === "stand") return { J: figStand(t), base: [o.x || 0, o.z || 0], p: 0 };
    const p = (((t / gt.g.T + (o.phase || 0)) % 1) + 1) % 1, s = o.travel === false ? 0 : gt.v * k * t;
    void sole;
    return { J: figWalk(gt, p), base: [(o.x || 0) + Math.sin(a) * s, (o.z || 0) + Math.cos(a) * s], p };
  }

  const lib = {
    BODY, GDEF, Gait, ik, shoeMap, rot2, rotAbout, easeIO, hermite,
    FIG, FIG_BODY, FIG_GAIT, FKS, FKL, FCOL, HD, PRIM,
    figGait, figWalk, figStand, figMeasure, figPrims, walkPrims, standPrims, headFn, segPt,
    gaitPose: (gt, p) => gt.pose(p), gaitFor, poseAt,
    tubeGrid, gridFn, headS, hairS, hairMax, surfFrame, drawMesh, drawFigure, drawPrims, shadowShapes, contactShapes,
    toWorld, groundOf, groundScr, fillScr, ellipseXZ, stripXZ, pnoise, mtProfile, ringScr, camHeight, light2d, hazeT,
    capPts, cutCap, clipHalf, smooth, lines, fillPts, arcPts, tag,
    palette, layer, castShadow, drawTiles, valAt, K, MONO,
  };

  /* ---------------- module: figure3d ---------------- */
  const SOLE = 5.78;
  const figure3d = C.defineModule("figure3d", {
    size: [1280, 720], duration: (o) => o.duration || 8,
    defaults: { seed: 1, duration: 8, action: "walk", face: 90, view: 45, spin: 0, travel: true, x: 0, z: 0, dist: 10, pitch: 4, focal: null, soleY: 0.8,
      scale: 1, step: 2.0, cadence: 120, lift: 0.2, phase: 0, pal: null, sunAz: 250, sunEl: 55,
      shadow: true, shadowColor: "#3a3f66", shadowOpacity: 0.34, shadowSoft: 0, contact: true,
      sky: ["#9cc0d2", "#f0dcc0"], ground: ["#d9c9a8", "#c4ae86"], tiles: true, tileColor: "rgba(120,96,60,.28)", bg: null, labels: false, font: MONO },
    setup(S) { S.gt = gaitFor(S.opts); S.pal = palette(S.opts.pal); },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, k = o.scale || 1;
      const f = o.focal || Math.max(0.62 * W, 0.95 * H), pitch = o.pitch, d = o.dist;
      const { J, base, p } = poseAt(S.gt, o, t);
      const view = valAt(o.view, t) + (o.spin || 0) * t, camAz = o.face + view;
      const hc = camHeight(d, pitch, f, H / 2, o.soleY * H), cam = camOrbit([base[0], 0, base[1]], d, hc, camAz, pitch, f, W / 2, H / 2), hy = C.horizonY(cam);
      const sun = sunDir(valAt(o.sunAz, t), valAt(o.sunEl, t));
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
      else {
        const sk = g.createLinearGradient(0, 0, 0, Math.max(1, hy)); sk.addColorStop(0, o.sky[0]); sk.addColorStop(1, o.sky[1]); g.fillStyle = sk; g.fillRect(0, 0, W, hy + 1);
        const gg = g.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, o.ground[0]); gg.addColorStop(1, o.ground[1]); g.fillStyle = gg; g.fillRect(0, hy, W, H - hy);
      }
      if (o.tiles) drawTiles(g, cam, base[0], { color: o.tileColor, step: k });
      const prims = figPrims(J);
      if (o.shadow) castShadow(g, cam, prims, base, o.face, SOLE, sun, { S, color: o.shadowColor, opacity: o.shadowOpacity, soft: o.shadowSoft, contact: o.contact, scale: k });
      drawFigure(g, cam, J, base, o.face, SOLE, sun, { pal: S.pal, scale: k });
      if (o.labels) {
        const v = ((view % 360) + 360) % 360;
        tag(g, `${o.action === "stand" ? "BERDIRI" : "JALAN"} \u00b7 SUDUT ${Math.round(v)}\u00b0 \u00b7 FASE ${p.toFixed(2)}`, 12, H - 14, "#1c2340", 11, "left", o.font);
      }
    },
  });
  figure3d.lib = lib;
  MGP.figure3d = figure3d;

  /* ---------------- module: gait (side view, port of the website "gait" demo) ---------------- */
  const gaitDemo = C.defineModule("gait", {
    size: [1280, 720], duration: (o) => o.duration || 6,
    defaults: { seed: 1, duration: 6, step: 2.0, cadence: 119, speed: 1, pivot: true, prints: true, bones: false, timeline: true, labels: false,
      pal: null, sky: ["#0d1534", "#28356a"], ground: ["#1a2246", "#070a16"], glow: "rgba(242,215,150,.22)", accent: K.gold2, font: MONO },
    setup(S) {
      const o = S.opts; S.T = Math.round((120 / o.cadence) * 24) / 24; S.gt = new Gait({}, { step: o.step, T: S.T });
      S.C = Object.assign({ skin: "#e4b38e", hair: "#2b2230", top: "#efe4cc", pants: "#4f7f88", shoe: "#fbf7ee", sole: "#cdbf9f", dark: "#121a33" }, o.pal || {});
    },
    render(g0, tt, S) {
      // the demo is laid out in a 440 px tall box (website stage); scale it to the canvas height
      const o = S.opts, sc = S.H / 440, g = g0; g.save(); g.scale(sc, sc);
      const w = S.W / sc, h = 440, gt = S.gt, T = S.T, Cc = S.C, t = tt * o.speed, F = o.font, A2 = o.accent;
      const TL = o.timeline ? 66 : 0, gy = h - TL - 26, hp = Math.max(18, (gy - 22) / 5.78), ox = w * 0.46, oy = gy - 5.78 * hp;
      const p = (t / T) % 1, pz = gt.pose(p), worldX = gt.v * t;
      const X = (q) => [ox + q[0] * hp, oy + q[1] * hp];
      const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, o.sky[0]); sky.addColorStop(1, o.sky[1]); g.fillStyle = sky; g.fillRect(0, 0, w, gy);
      const glow = g.createRadialGradient(w * 0.78, gy * 0.9, 4, w * 0.78, gy * 0.9, w * 0.6); glow.addColorStop(0, o.glow); glow.addColorStop(1, rgba(o.glow, 0)); g.fillStyle = glow; g.fillRect(0, 0, w, gy);
      const gr = g.createLinearGradient(0, gy, 0, h); gr.addColorStop(0, o.ground[0]); gr.addColorStop(1, o.ground[1]); g.fillStyle = gr; g.fillRect(0, gy, w, h - gy);
      // ground ticks every 0.5 H move with the ground at exactly -v (feet stay planted)
      const sp = 0.5, x0w = worldX - ox / hp, x1w = worldX + (w - ox) / hp;
      for (let k = Math.floor(x0w / sp); k <= x1w / sp; k++) { const sx = ox + (k * sp - worldX) * hp; g.fillStyle = rgba(A2, k % 4 === 0 ? 0.35 : 0.12); g.fillRect(sx, gy + 4, 1, k % 4 === 0 ? 9 : 5); }
      g.strokeStyle = rgba(A2, 0.55); g.lineWidth = 1; g.beginPath(); g.moveTo(0, gy + 0.5); g.lineTo(w, gy + 0.5); g.stroke();
      if (o.prints) {
        const jmax = Math.floor((worldX - 1e-6) / gt.g.step + 1e-9);
        for (let j = jmax; j > jmax - 14; j--) { const wx = gt.H0 + j * gt.g.step + gt.HEEL[0], sx = ox + (wx - worldX) * hp; if (sx < -20 || sx > w + 20) continue; g.fillStyle = j % 2 ? rgba(A2, 0.85) : "rgba(244,236,216,.6)"; g.beginPath(); g.ellipse(sx, gy + 1, 3.2, 1.6, 0, 0, TAU); g.fill(); }
        if (o.labels) tag(g, "titik heel strike menempel di tanah", 12, gy + 20, K.muted, 9, "left", F);
      }
      const U = (q) => { const r = rotAbout(q, PRIM.lean_piv, pz.lean); return [r[0], r[1] + pz.dy]; };
      const legDraw = (leg, dark) => {
        const c = (col) => (dark ? mix(col, Cc.dark, 0.3) : col), hip = pz.hip, kn = leg.knee, an = leg.ankle;
        fillPts(g, capPts(X(hip), X(kn), 0.205 * hp, 0.15 * hp, 0.02 * hp, 0), c(Cc.pants), false);
        fillPts(g, capPts(X(kn), X(an), 0.15 * hp, 0.105 * hp, 0.012 * hp, 0), c(Cc.pants), false);
        const f = shoeMap(leg.cfg), shoe = gt.b.shoe.map((q) => X(f(q)));
        fillPts(g, shoe, c(Cc.shoe));
        g.save(); g.beginPath(); smooth(g, shoe); g.clip(); fillPts(g, [[-0.1, -0.04], [0.7, -0.04], [0.7, 0.05], [-0.1, 0.05]].map((q) => X(f(q))), c(Cc.sole), false); g.restore();
        if (o.bones) { g.strokeStyle = A2; g.lineWidth = 1.5; g.beginPath(); const a = X(hip), b = X(kn), d = X(an); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(d[0], d[1]); g.stroke(); [a, b, d].forEach((q) => { g.fillStyle = K.night; g.beginPath(); g.arc(q[0], q[1], 3, 0, TAU); g.fill(); g.strokeStyle = A2; g.stroke(); }); }
      };
      const armDraw = (side, dark) => {
        const c = (col) => (dark ? mix(col, Cc.dark, 0.3) : col), [S0, E0, W0] = gt.arm(p + side)[0].map(U), S1 = X(S0), E1 = X(E0), W1 = X(W0);
        fillPts(g, capPts(S1, E1, 0.125 * hp, 0.105 * hp), c(Cc.top), false);
        fillPts(g, capPts(E1, W1, 0.1 * hp, 0.08 * hp), c(Cc.top), false);
        const d = [W1[0] - E1[0], W1[1] - E1[1]], m = Math.hypot(d[0], d[1]) || 1, H2 = [W1[0] + d[0] / m * 0.17 * hp, W1[1] + d[1] / m * 0.17 * hp];
        fillPts(g, capPts(W1, H2, 0.075 * hp, 0.085 * hp), c(Cc.skin), false);
        const q = [E1[0] + d[0] * 0.86, E1[1] + d[1] * 0.86]; g.strokeStyle = c(mix(Cc.top, "#000", 0.14)); g.lineWidth = Math.max(1, 0.02 * hp); g.beginPath(); g.moveTo(q[0] - d[1] / m * 0.09 * hp, q[1] + d[0] / m * 0.09 * hp); g.lineTo(q[0] + d[1] / m * 0.09 * hp, q[1] - d[0] / m * 0.09 * hp); g.stroke();
      };
      // far side first (about 20% darker), then near
      armDraw(0.5, true); legDraw(pz.far, true);
      legDraw(pz.near, false);
      const hipS = X(pz.hip);
      g.fillStyle = Cc.pants; g.beginPath(); g.ellipse(hipS[0], hipS[1] - 0.03 * hp, 0.3 * hp, 0.27 * hp, 0, 0, TAU); g.fill();
      fillPts(g, capPts(X(U([-0.02, 1.4])), X(U([0.0, 0.95])), 0.12 * hp, 0.12 * hp), Cc.skin, false);
      fillPts(g, cutCap(X(U([0, 1.58])), X(U([0, 3.3])), 0.34 * hp, 0.36 * hp, 0.97, 0.03 * hp, 0.01 * hp), Cc.top);
      g.strokeStyle = mix(Cc.top, "#000", 0.12); g.lineWidth = Math.max(1, 0.02 * hp); g.beginPath(); { const a = X(U([-0.33, 3.12])), b = X(U([0.35, 3.12])); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      const HC = (q) => X(U(rotAbout(q, PRIM.chin, pz.nod)));
      const hc = HC([0.05, 0.55]), r = 0.47 * hp;
      g.fillStyle = Cc.skin; g.beginPath(); g.arc(hc[0], hc[1], r, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(...HC([0.5, 0.64]), 0.055 * hp, 0.05 * hp, 0, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(...HC([0.0, 0.5]), 0.53 * hp, 0, TAU); g.clip();
      fillPts(g, [[0.36, -0.2], [0.42, 0.2], [0.12, 0.3], [-0.06, 0.56], [-0.22, 0.98], [-1, 1.1], [-1, -1], [1, -1]].map(HC), Cc.hair, false); g.restore();
      g.fillStyle = mix(Cc.skin, "#7a4a3a", 0.25); g.beginPath(); g.ellipse(...HC([-0.08, 0.64]), 0.07 * hp, 0.1 * hp, 0, 0, TAU); g.fill();
      g.fillStyle = "#231c26"; g.beginPath(); g.ellipse(...HC([0.34, 0.54]), 0.028 * hp, 0.05 * hp, 0, 0, TAU); g.fill();
      g.strokeStyle = mix(Cc.skin, "#5a2a30", 0.5); g.lineWidth = Math.max(1, 0.025 * hp); g.lineCap = "round"; g.beginPath(); { const a = HC([0.33, 0.8]), b = HC([0.43, 0.79]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      armDraw(0, false);
      const n = pz.near, u = n.u;
      if (o.pivot) for (const ft of [pz.near, pz.far]) { if (!ft.stance) continue; const piv = X(shoeMap(ft.cfg)(ft.cfg.piv)), flat = ft.u >= gt.g.u_flat && ft.u < gt.g.u_heeloff; if (flat) continue; g.strokeStyle = A2; g.lineWidth = 1.5; g.beginPath(); g.arc(piv[0], piv[1], 6, 0, TAU); g.stroke(); g.fillStyle = A2; g.beginPath(); g.arc(piv[0], piv[1], 2, 0, TAU); g.fill(); }
      if (o.labels) {
        const phase = !n.stance ? "Ayun: Hermite C1 jari lepas \u2192 tumit menapak" : u < gt.g.u_flat ? "Heel rocker: pivot di tumit" : u < gt.g.u_heeloff ? "Kaki rata" : u < gt.u_ps ? "Toe rocker: pivot di ujung sol" : "Pra-ayun (dua kaki menapak)";
        tag(g, "KAKI DEKAT \u00b7 " + phase.toUpperCase(), 12, 22, A2, 10, "left", F);
        tag(g, `lutut ${n.flex.toFixed(0)}\u00b0 \u00b7 jangkau ${(Math.max(n.reach, pz.far.reach) * 100).toFixed(1)}% \u00b7 p ${p.toFixed(2)}`, 12, 38, K.muted, 9.5, "left", F);
      }
      if (o.timeline) {
        const ty = h - TL + 8, x0 = 74, x1 = w - 16, XP = (q) => lerp(x0, x1, q);
        g.fillStyle = "rgba(6,9,20,.92)"; g.fillRect(0, h - TL - 4, w, TL + 4); g.strokeStyle = rgba(A2, 0.25); g.beginPath(); g.moveTo(0, h - TL - 3.5); g.lineTo(w, h - TL - 3.5); g.stroke();
        const evs = [[0, "HS"], [gt.g.u_flat * gt.g.stance, "FF"], [gt.g.u_heeloff * gt.g.stance, "HO"], [gt.g.stance, "TO"]];
        [["DEKAT", 0], ["JAUH", 0.5]].forEach(([nm, off], rr) => {
          const y = ty + 10 + rr * 22; tag(g, nm, 12, y + 7, K.muted, 9, "left", F);
          for (const [a, b] of off ? [[0.5, 1], [0, 0.1]] : [[0, 0.6]]) { const gg = g.createLinearGradient(XP(a), 0, XP(b), 0); gg.addColorStop(0, "rgba(214,176,106,.85)"); gg.addColorStop(1, "rgba(214,176,106,.55)"); g.fillStyle = gg; g.fillRect(XP(a), y, XP(b) - XP(a), 9); }
          g.strokeStyle = rgba(A2, 0.35); g.strokeRect(XP(0) + 0.5, y + 0.5, XP(1) - XP(0) - 1, 8);
          evs.forEach(([q, l]) => { const xq = XP((q + off) % 1); g.fillStyle = K.ivory; g.fillRect(xq - 0.5, y - 2, 1, 13); if (rr === 0) tag(g, l, xq + 3, y - 3, K.ivory2, 8.5, "left", F); });
        });
        g.fillStyle = "rgba(244,236,216,.12)"; g.fillRect(XP(0), ty + 6, XP(0.1) - XP(0), 36); g.fillRect(XP(0.5), ty + 6, XP(0.6) - XP(0.5), 36);
        const xp = XP(p); g.fillStyle = A2; g.fillRect(xp - 1, ty + 2, 2, 44);
        tag(g, w > 560 ? "HS tumit menapak \u00b7 FF kaki rata \u00b7 HO tumit naik \u00b7 TO jari lepas \u00b7 arsir = dua kaki menapak 2 \u00d7 10%" : "arsir = dua kaki menapak 2 \u00d7 10%", x0, h - 6, K.muted, 8.5, "left", F);
      }
      g.restore();
    },
  });
  gaitDemo.lib = lib;
  MGP.gait = gaitDemo;
})(typeof globalThis !== "undefined" ? globalThis : this);
