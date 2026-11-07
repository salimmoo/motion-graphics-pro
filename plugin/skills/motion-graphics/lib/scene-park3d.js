/**
 * MGP scenePark3d \u2014 layered park in real 3D space with a one-take camera orbit around the figure.
 *
 * Extracted from the website demo "orbit3d" (guide/js/demos-skills.js; motion-graphics space3d.py): sky gradient with
 * sun glow, a 360-degree ring of far mountains / hills / tree line (one blurred layer), lawns, a plank path and a pond on
 * the ground plane, trees, lamps, bushes, flowers and grass placed in world space, one composited shadow layer (trees,
 * lamps, bushes and the figure's pose shadow), depth sorting split into far / mid / near layers for depth of field,
 * distance haze, light beams, vignette and grain. The figure stands (orbit hero, as on the website) or walks along the path.
 *
 * Load order: mgp-core.js, figure3d.js, (shadow3d.js), scene-park3d.js.
 *
 * Options (defaults):
 *   width 1280, height 720, duration 12, seed 7 (layout), mtSeed 11 (mountain ring)
 *   action "stand"            "stand" (website look: hero at the origin) | "walk" (walks east along the path, camera follows)
 *   face null                 heading; default 160 for stand, 90 for walk
 *   walkZ -1.2, walkFrom null start x for walking (default: centred so the walk passes the origin at mid-duration)
 *   az0 205, orbitSpeed 15    camera azimuth = az0 + orbitSpeed * t (deg); or orbit: number | [[t,deg],...] | function(t)
 *   dist 14, breathe 0.035    orbit distance (H) and its slow dolly breathing;  pitch 4, focal null, soleY 0.8
 *   sunAz 250, sunEl 14       low warm sun
 *   scale 1, step 2.0, cadence 120, lift 0.2, pal null      figure options as in MGP.figure3d
 *   dof true, haze true, rays true, vignette true, grain true
 *   trees 30, bushes 18, flowers 46, grass 70, lamps [30,150,265]
 *   colors { skyTop, skyMid, skyHorizon, mountain, hill, treeLine, groundFar, groundNear, lawn:[3], path, plank, pond, pondEdge, shadow,
 *            trunk, trunkRim, leaf, leafShade, leafLight, bushLeaf, bushLight, bushShade, lamp, lampGlow, grass, flowers:[4] }
 *   shadowOpacity 0.38, labels false (camera azimuth / view angle caption), font
 *
 * MGP.scenePark3d.lib: buildLayout(opts) -> {objs, path, pond, lawn, prof, profH, profT}, tree/bush/lamp/flower/grass sprite
 *   painters (g, o, x, y, k, hz, lx, ly, col), camAt(S, t) -> {cam, d, az}, viewName(v)
 *
 * Example:
 *   MGP.core.expose(MGP.scenePark3d.create("#stage", { action: "walk", orbitSpeed: 20 }));
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  if (!C || !MGP.figure3d) throw new Error("scene-park3d.js: load core/mgp-core.js and figure3d.js first");
  const F = MGP.figure3d.lib, TAU = Math.PI * 2, RAD = Math.PI / 180, SOLE = 5.78;
  const mix = C.mix, lerp = C.lerp;
  const COL = {
    skyTop: "#22305e", skyMid: "#7d77a2", skyHorizon: "#f1bf8f", mountain: "#7682a6", hill: "#55667a", treeLine: "#3f5a4a",
    groundFar: "#6f7a4c", groundNear: "#43512f", lawn: ["#7d8a51", "#5d6d3b", "#748449"], path: "#d8bd91", plank: "rgba(150,112,72,.45)",
    pond: "#6e97a8", pondGlint: "rgba(246,227,189,.55)", pondEdge: "rgba(40,50,40,.55)", shadow: "#2b3150",
    trunk: "#5a4636", trunkRim: "#d29d64", leaf: "#3d5a3e", leafShade: "#26392f", leafLight: "#93a55a",
    bushLeaf: "#3f5d3b", bushLight: "#8ea25a", bushShade: "#283a2c", lamp: "#2b2a33", lampLight: "#ffe2a6", lampGlow: "rgba(255,216,146,.55)",
    grass: "#4c6a3a", stem: "#3c5a3a", flowers: ["#f2d796", "#f4ecd8", "#e98f7a", "#c9a4e6"],
  };

  /* ---------------- world layout (seeded, fixed draws, then keepout of the camera track for tall objects) ---------------- */
  function buildLayout(o, camTrack) {
    const R = C.rng(o.seed), objs = [], col = o.col;
    const prof = F.mtProfile(o.mtSeed, 720, 150, 300, { power: 1.25, peaks: [[20, 450, 13, 0.1]], volcanoes: [[200, 330, 22]] });
    const profH = F.mtProfile(o.mtSeed + 2, 720, 22, 60, { octs: [[7, 1], [15, 0.45], [31, 0.2]], power: 1.2 });
    const profT = F.mtProfile(o.mtSeed - 6, 720, 7, 9, { octs: [[40, 1], [90, 0.6], [180, 0.4]], power: 1 });
    for (let i = 0; i < o.trees; i++) { const a = R() * TAU, r = 25 + R() * 55; objs.push({ k: "tree", x: r * Math.sin(a), z: r * Math.cos(a), h: 7 + R() * 6, cr: 2.1 + R() * 1.6, seed: i + 1 }); }
    for (const a of o.lamps) objs.push({ k: "lamp", x: 5.6 * Math.sin(a * RAD), z: 5.6 * Math.cos(a * RAD), h: 5.2 });
    for (let i = 0; i < o.bushes; i++) { const a = R() * TAU, r = i < 8 ? 3 + R() * 4 : 23 + R() * 16; objs.push({ k: "bush", x: r * Math.sin(a), z: r * Math.cos(a), s: 0.8 + R() * 0.7, seed: 50 + i }); }
    for (let i = 0; i < o.flowers; i++) { const a = R() * TAU, r = 2.2 + R() * 7.5; objs.push({ k: "flower", x: r * Math.sin(a), z: r * Math.cos(a), c: col.flowers[i % col.flowers.length], s: 0.7 + R() * 0.5 }); }
    for (let i = 0; i < o.grass; i++) { const a = R() * TAU, r = 1.6 + R() * 21; objs.push({ k: "grass", x: r * Math.sin(a), z: r * Math.cos(a), s: 0.6 + R() * 0.7, seed: 200 + i }); }
    const tall = (q) => q.k === "tree" || q.k === "lamp";
    for (let i = objs.length - 1; i >= 0; i--) {
      const q = objs[i], r = Math.hypot(q.x, q.z);
      if (!camTrack) { if (tall(q) && r > 7.5 && r < 23.5) objs.splice(i, 1); continue; }
      // walking: keep the camera track and the figure's path clear (tall objects far from it, small ones out of the lens)
      let dc = 1e9; for (const p of camTrack.cam) dc = Math.min(dc, Math.hypot(q.x - p[0], q.z - p[1]));
      let dp = 1e9; for (const p of camTrack.hero) dp = Math.min(dp, Math.hypot(q.x - p[0], q.z - p[1]));
      if ((tall(q) && (dc < 7 || dp < 2.2)) || dc < 2.2 || (q.k === "bush" && dp < 1.3)) objs.splice(i, 1);
    }
    objs.forEach((q) => { if (q.k === "tree" || q.k === "bush") { const r2 = C.rng(q.seed * 31); q.cl = Array.from({ length: q.k === "tree" ? 9 : 5 }, (_, j) => ({ dx: (r2() - 0.5) * 1.3, dy: (r2() - 0.5) * 1.05 - (j < 3 ? 0.35 : 0), r: 0.42 + r2() * 0.3 })); } });
    const path = F.stripXZ([[-220, -1.2], [220, -1.2]], 3.2), pond = F.ellipseXZ(-9.5, 9, 5, 3, 0.3, 64, 0.05, 3);
    const lawn = [F.ellipseXZ(6, 9, 7, 4, 0.5, 48, 0.12, 4), F.ellipseXZ(-6, -8, 8, 5, -0.4, 48, 0.12, 5), F.ellipseXZ(14, -6, 6, 9, 0.2, 48, 0.1, 6)];
    return { objs, path, pond, lawn, prof, profH, profT };
  }

  /* ---------------- sprite painters (screen space, k = px per H at that depth, hz = haze 0..1) ---------------- */
  function tree(g, o, x, y, k, hz, lx, ly, col) {
    const H0 = col.skyHorizon, trunk = mix(col.trunk, H0, hz), rim = mix(col.trunkRim, H0, hz), cb = mix(col.leaf, H0, hz), cs = mix(col.leafShade, H0, hz * 0.85), cl = mix(col.leafLight, H0, hz * 0.9);
    const th = o.h * 0.6, tw = 0.42 * k, cyc = y - o.h * 0.66 * k, R2 = o.cr * k;
    g.fillStyle = trunk; g.fillRect(x - tw / 2, y - th * k, tw, th * k); g.fillStyle = rim; g.fillRect(lx > 0 ? x + tw * 0.15 : x - tw / 2, y - th * k, tw * 0.35, th * k);
    if (R2 < 7) { g.fillStyle = cb; g.beginPath(); g.ellipse(x, cyc, R2, R2 * 1.1, 0, 0, TAU); g.fill(); return; }
    const ox = -lx * 0.18, oy = ly * 0.18;
    g.fillStyle = cs; for (const c of o.cl) { g.beginPath(); g.arc(x + (c.dx + ox) * R2, cyc + (c.dy + oy) * R2, c.r * R2, 0, TAU); g.fill(); }
    g.fillStyle = cb; for (const c of o.cl) { g.beginPath(); g.arc(x + c.dx * R2, cyc + c.dy * R2, c.r * R2 * 0.92, 0, TAU); g.fill(); }
    g.fillStyle = cl; for (const c of o.cl) { if (c.dx * lx - c.dy * ly < -0.15) continue; g.beginPath(); g.arc(x + (c.dx + lx * 0.2) * R2, cyc + (c.dy - ly * 0.2) * R2, c.r * R2 * 0.5, 0, TAU); g.fill(); }
  }
  function bush(g, o, x, y, k, hz, lx, ly, col) {
    const H0 = col.skyHorizon, R2 = o.s * 0.8 * k, cb = mix(col.bushLeaf, H0, hz), cl = mix(col.bushLight, H0, hz), cs = mix(col.bushShade, H0, hz);
    for (const [c0, sh, sc] of [[cs, -0.15, 1], [cb, 0, 0.9], [cl, 0.22, 0.45]]) { g.fillStyle = c0; for (const c of o.cl) { if (sc < 0.6 && c.dx * lx - c.dy * ly < -0.1) continue; g.beginPath(); g.arc(x + (c.dx + lx * sh) * R2, y - R2 * 0.75 + (c.dy * 0.6 - ly * sh) * R2, c.r * R2 * sc, 0, TAU); g.fill(); } }
  }
  function lamp(g, o, x, y, k, hz, lx, ly, col) {
    const pw = 0.16 * k; g.fillStyle = mix(col.lamp, col.skyHorizon, hz); g.fillRect(x - pw / 2, y - o.h * k, pw, o.h * k); g.fillRect(x - pw * 1.6, y - o.h * k - 0.1 * k, pw * 3.2, 0.12 * k);
    const lyy = y - o.h * k - 0.42 * k; g.fillStyle = col.lampLight; g.fillRect(x - 0.16 * k, lyy, 0.32 * k, 0.36 * k);
    const gl = g.createRadialGradient(x, lyy + 0.18 * k, 1, x, lyy + 0.18 * k, 1.8 * k); gl.addColorStop(0, col.lampGlow); gl.addColorStop(1, C.rgba(col.lampGlow, 0)); g.fillStyle = gl; g.beginPath(); g.arc(x, lyy + 0.18 * k, 1.8 * k, 0, TAU); g.fill();
  }
  function flower(g, o, x, y, k, hz, lx, ly, col) { const s = 0.3 * o.s * k; if (s < 0.6) return; g.strokeStyle = col.stem; g.lineWidth = Math.max(0.6, 0.05 * k); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.6); g.stroke(); g.fillStyle = o.c; g.beginPath(); g.arc(x, y - s * 1.6, s * 0.45, 0, TAU); g.fill(); }
  function grass(g, o, x, y, k, hz, lx, ly, col) { const s = 0.55 * o.s * k; if (s < 1) return; const r2 = C.rng(o.seed); g.strokeStyle = mix(col.grass, col.skyHorizon, hz); g.lineWidth = Math.max(0.8, 0.06 * k); g.lineCap = "round"; for (let i = 0; i < 6; i++) { const dx = (r2() - 0.5) * s * 0.9, lean = (r2() - 0.5) * s * 0.9, hh = s * (0.7 + r2() * 0.6); g.beginPath(); g.moveTo(x + dx, y); g.quadraticCurveTo(x + dx + lean * 0.3, y - hh * 0.6, x + dx + lean, y - hh); g.stroke(); } }
  const PAINT = { tree, bush, lamp, flower, grass };
  const viewName = (v) => (v < 22.5 || v >= 337.5 ? "depan" : v < 67.5 ? "3/4 kanan" : v < 112.5 ? "samping kanan" : v < 157.5 ? "3/4 belakang" : v < 202.5 ? "belakang" : v < 247.5 ? "3/4 belakang" : v < 292.5 ? "samping kiri" : "3/4 kiri");

  const faceOf = (o) => (o.face != null ? o.face : o.action === "walk" ? 90 : 160);
  const heroOpts = (o) => { return Object.assign({}, o, { face: faceOf(o), z: o.action === "walk" ? o.walkZ : 0, x: 0 }); };
  function camAt(S, t, baseOverride) {
    const o = S.opts, W = S.W, H = S.H, f = o.focal || Math.max(0.62 * W, 0.95 * H), pitch = o.pitch;
    const az = o.orbit != null ? F.valAt(o.orbit, t) : o.az0 + o.orbitSpeed * t;
    const d = o.dist * (1 + o.breathe * Math.sin(t * 0.5)), hc = F.camHeight(d, pitch, f, H / 2, o.soleY * H);
    const base = baseOverride || S.heroAt(t).base;
    return { cam: C.camOrbit([base[0], 0, base[1]], d, hc, az, pitch, f, W / 2, H / 2), d, az, f, hc, base };
  }

  const scenePark3d = C.defineModule("scenePark3d", {
    size: [1280, 720], duration: (o) => o.duration || 12,
    defaults: { seed: 7, mtSeed: 11, duration: 12, action: "stand", face: null, walkZ: -1.2, walkFrom: null, az0: 205, orbitSpeed: 15, orbit: null,
      dist: 14, breathe: 0.035, pitch: 4, focal: null, soleY: 0.8, sunAz: 250, sunEl: 14,
      scale: 1, step: 2.0, cadence: 120, lift: 0.2, phase: 0, pal: null,
      dof: true, haze: true, rays: true, vignette: true, grain: true, trees: 30, bushes: 18, flowers: 46, grass: 70, lamps: [30, 150, 265],
      colors: null, shadowOpacity: 0.38, labels: false, font: F.MONO },
    setup(S) {
      const o = S.opts; o.col = Object.assign({}, COL, o.colors || {});
      S.gt = F.gaitFor(o); S.pal = F.palette(o.pal);
      const ho = heroOpts(o);
      if (o.action === "walk") ho.x = o.walkFrom != null ? o.walkFrom : -S.gt.v * (o.scale || 1) * o.duration / 2;
      S.heroAt = (t) => F.poseAt(S.gt, ho, t);
      S.face = ho.face;
      let track = null;
      if (o.action === "walk") { track = { cam: [], hero: [] }; for (let t = 0; t <= o.duration + 1e-9; t += 0.1) { const c = camAt(S, t); track.cam.push([c.cam.pos[0], c.cam.pos[2]]); track.hero.push(c.base); } }
      S.L = buildLayout(o, track);
      // film grain tile (seeded)
      const gc = C.offscreen(160, 160), gg = gc.getContext("2d"), id = gg.createImageData(160, 160), r3 = C.rng(99);
      for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r3() - 0.5) * 150; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      gg.putImageData(id, 0, 0); S.grain = gc;
    },
    render(g, t, S) {
      const o = S.opts, col = o.col, W = S.W, H = S.H, Lw = S.L, face = S.face, ks = o.scale || 1;
      const { J, base } = S.heroAt(t);
      const { cam, d, az, f } = camAt(S, t, base), hy = C.horizonY(cam), sun = C.sunDir(o.sunAz, o.sunEl), [lx, ly] = F.light2d(cam, sun), hzk = o.haze ? 1 : 0;
      const bscale = H / 600;
      // sky + sun glow
      const sk = g.createLinearGradient(0, 0, 0, Math.max(1, hy)); sk.addColorStop(0, col.skyTop); sk.addColorStop(0.6, col.skyMid); sk.addColorStop(1, col.skyHorizon); g.fillStyle = sk; g.fillRect(0, 0, W, Math.max(0, hy) + 2);
      const sc = C.camC(cam, [cam.pos[0] + sun[0] * 1e4, cam.pos[1] + sun[1] * 1e4, cam.pos[2] + sun[2] * 1e4]), sunS = sc[2] > 0 ? C.scr(cam, sc) : null;
      if (o.rays) { const sx = sunS ? sunS[0] : (lx > 0 ? W * 1.3 : -W * 0.3), sy = sunS ? sunS[1] : hy - H * 0.1, out = sunS ? 0 : W * 0.5, gl = g.createRadialGradient(sx, sy, 2, sx, sy, W * 0.55 + out); gl.addColorStop(0, "rgba(255,236,196,.95)"); gl.addColorStop(0.08, "rgba(255,214,160,.5)"); gl.addColorStop(1, "rgba(255,200,150,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, hy + 2); }
      // background rings, blurred as one layer
      const LB = F.layer(S, "bg", g), bg = LB.g;
      [[2600, Lw.prof, mix(col.mountain, col.skyHorizon, 0.45 * hzk + 0.1)], [800, Lw.profH, mix(col.hill, col.skyHorizon, 0.3 * hzk + 0.05)], [160, Lw.profT, mix(col.treeLine, col.skyHorizon, 0.16 * hzk)]].forEach(([Rr, pr, c0]) => {
        const pts = F.ringScr(cam, Rr, pr); if (pts) { bg.fillStyle = c0; bg.beginPath(); F.lines(bg, pts); bg.fill(); }
      });
      if (o.dof) g.filter = `blur(${(2.2 * bscale).toFixed(2)}px)`; g.drawImage(LB.c, 0, 0, W, H); g.filter = "none";
      // ground
      const gg = g.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, mix(col.groundFar, col.skyHorizon, 0.35 * hzk)); gg.addColorStop(1, col.groundNear); g.fillStyle = gg; g.fillRect(0, hy, W, H - hy);
      Lw.lawn.forEach((p, i) => { g.fillStyle = col.lawn[i % col.lawn.length]; F.fillScr(g, F.groundScr(cam, p)); });
      g.fillStyle = col.path; F.fillScr(g, F.groundScr(cam, Lw.path));
      g.strokeStyle = col.plank; g.lineWidth = 1;
      for (let x = Math.floor(cam.pos[0] / 1.2) * 1.2 - 36; x < cam.pos[0] + 36; x += 1.2) { const p = F.groundScr(cam, [[x, -2.8], [x, 0.4], [x + 0.02, 0.4], [x + 0.02, -2.8]]); if (p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.stroke(); } }
      g.fillStyle = col.pond; F.fillScr(g, F.groundScr(cam, Lw.pond)); g.fillStyle = col.pondGlint; for (let i = 0; i < 4; i++) F.fillScr(g, F.groundScr(cam, F.ellipseXZ(-9.5 + (i - 1.5) * 1.6, 9 - i * 0.3, 0.5 - i * 0.06, 0.08, 0.3, 16)));
      g.strokeStyle = col.pondEdge; g.lineWidth = 2; { const p = F.groundScr(cam, Lw.pond); if (p) { g.beginPath(); F.lines(g, p); g.stroke(); } }
      // world shadows: all opaque in one layer, composited once (multiply + alpha)
      const LS = F.layer(S, "shadow", g), sl = LS.g; sl.fillStyle = col.shadow;
      const e = Math.asin(sun[1]), shd = [-sun[0], -sun[2]], sm = Math.hypot(shd[0], shd[1]) || 1, ang = Math.atan2(shd[1] / sm, shd[0] / sm);
      for (const q of Lw.objs) {
        if (q.k === "tree") { const G = F.groundOf([q.x, q.h * 0.66, q.z], sun); F.fillScr(sl, F.groundScr(cam, F.ellipseXZ(G[0], G[1], q.cr / Math.sin(e) * 0.95, q.cr, ang, 32, 0.08, q.seed))); F.fillScr(sl, F.groundScr(cam, F.stripXZ([[q.x, q.z], [lerp(q.x, G[0], 0.8), lerp(q.z, G[1], 0.8)]], 0.45))); }
        else if (q.k === "lamp") { const G = F.groundOf([q.x, q.h, q.z], sun); F.fillScr(sl, F.groundScr(cam, F.stripXZ([[q.x, q.z], G], 0.18))); }
        else if (q.k === "bush") { const G = F.groundOf([q.x, 0.5 * q.s, q.z], sun); F.fillScr(sl, F.groundScr(cam, F.ellipseXZ((q.x + G[0]) / 2, (q.z + G[1]) / 2, 0.8 * q.s / Math.sin(e) * 0.5 + 0.5, 0.8 * q.s, ang, 24))); }
      }
      const hero = F.figPrims(J);
      F.shadowShapes(hero, base, face, SOLE, sun, ks).forEach((p) => F.fillScr(sl, F.groundScr(cam, p)));
      g.save(); g.globalAlpha = o.shadowOpacity; g.globalCompositeOperation = "multiply"; g.drawImage(LS.c, 0, 0, W, H); g.restore();
      // sprites sorted far to near, split into far / mid / near layers for depth of field
      const items = [];
      for (const q of Lw.objs) { const c = C.camC(cam, [q.x, 0, q.z]); if (c[2] < cam.near) continue; items.push({ o: q, z: c[2], s: C.scr(cam, c) }); }
      items.push({ hero: true, z: C.camC(cam, [base[0], 0, base[1]])[2] });
      items.sort((a, b) => b.z - a.z);
      const LF = F.layer(S, "far", g), LM = F.layer(S, "mid", g), LN = F.layer(S, "near", g);
      for (const it of items) {
        const L = !o.dof ? LM.g : it.z > d * 1.9 ? LF.g : it.z < d * 0.55 ? LN.g : LM.g;
        if (it.hero) { F.drawPrims(L, cam, hero, base, face, SOLE, sun, { pal: S.pal, scale: ks }); continue; }
        const k = f / it.z, hz = F.hazeT(it.z) * hzk, [x, y] = it.s, q = it.o;
        if (x < -W * 0.5 || x > W * 1.5) continue;
        PAINT[q.k](L, q, x, y, k, hz, lx, ly, col);
      }
      if (o.dof) g.filter = `blur(${(1.6 * bscale).toFixed(2)}px)`; g.drawImage(LF.c, 0, 0, W, H); g.filter = "none";
      g.drawImage(LM.c, 0, 0, W, H);
      if (o.dof) g.filter = `blur(${(4.5 * bscale).toFixed(2)}px)`; g.drawImage(LN.c, 0, 0, W, H); g.filter = "none";
      // light beams from the sun (screen blend), glow kept when the sun is off frame
      if (o.rays) {
        const sx = sunS ? sunS[0] : lx > 0 ? W * 1.25 : -W * 0.25, sy = sunS ? sunS[1] : hy - H * 0.12;
        g.save(); g.globalCompositeOperation = "screen";
        for (let i = 0; i < 6; i++) { const a0 = Math.PI * (0.18 + i * 0.13) + Math.sin(t * 0.2 + i) * 0.02, a1 = a0 + 0.035 + (i % 3) * 0.015, Lr = W * 1.4; const gr = g.createRadialGradient(sx, sy, 0, sx, sy, Lr); gr.addColorStop(0, "rgba(255,226,170,.16)"); gr.addColorStop(1, "rgba(255,226,170,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a0) * Lr * (lx > 0 ? -1 : 1), sy + Math.sin(a0) * Lr); g.lineTo(sx + Math.cos(a1) * Lr * (lx > 0 ? -1 : 1), sy + Math.sin(a1) * Lr); g.closePath(); g.fill(); }
        g.restore();
      }
      if (o.vignette) { const vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.hypot(W, H) * 0.62); vg.addColorStop(0, "rgba(5,7,16,0)"); vg.addColorStop(1, "rgba(5,7,16,.62)"); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
      if (o.grain) { const pat = g.createPattern(S.grain, "repeat"); g.save(); g.globalAlpha = 0.06; g.globalCompositeOperation = "overlay"; g.fillStyle = pat; g.fillRect(0, 0, W, H); g.restore(); }
      if (o.labels) { const v = (((az - face) % 360) + 360) % 360; F.tag(g, `AZ ${String(Math.round(((az % 360) + 360) % 360)).padStart(3, "0")}\u00b0 \u00b7 SUDUT TOKOH ${Math.round(v)}\u00b0 ${viewName(v).toUpperCase()}`, 12, H - 14, "#f4ecd8", 10 * H / 440, "left", o.font); }
    },
  });
  scenePark3d.lib = { COL, buildLayout, tree, bush, lamp, flower, grass, camAt, viewName };
  MGP.scenePark3d = scenePark3d;
})(typeof globalThis !== "undefined" ? globalThis : this);
