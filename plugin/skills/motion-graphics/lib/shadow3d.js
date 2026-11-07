/**
 * MGP shadow3d \u2014 cast shadow from the 3D pose of the figure onto the ground, for any sun azimuth / elevation.
 *
 * Extracted from the website demo "bayangan" (guide/js/demos-skills.js, port of motion-graphics scripts/shadow3d.py (old bayangan3d.py)):
 * a walking figure on a tiled plaza with planters; every body capsule is projected along the sun direction onto y = 0
 * (G = P - sun * P_y / sun_y, a sphere becomes an ellipse with axis r / sin e along the sun), all shadows are filled
 * opaque into ONE layer and composited once (multiply + alpha) so overlaps never double-darken, plus a thin contact
 * occlusion where the feet touch the ground. A small compass shows the sun azimuth, shadow direction and facing.
 *
 * Load order: mgp-core.js, figure3d.js, shadow3d.js.
 *
 * Options (defaults):
 *   width 1280, height 720, duration 10, seed 1
 *   sunAz [[0,200],[10,320]]   sun azimuth (deg from north, clockwise): number, [[t,deg],...] keys or function(t)
 *   sunEl [[0,55],[5,24],[10,55]] sun elevation (deg, 8..80 is sensible): number, keys or function(t)
 *   action "walk"              "walk" | "stand";  face 90 (heading, east)
 *   view 45                    camera angle relative to the facing (0 front, 90 right side, 180 back); number, keys or function
 *   dist 10, pitch 4, focal null, soleY 0.8
 *   scale 1, step 2.0, cadence 120, lift 0.2, pal null      figure options as in MGP.figure3d
 *   mode "pose"                "pose" = shadow from the 3D pose; "fixed" = one rigid ellipse (the rejected approach, for comparison)
 *   shadowColor "#3a3f66", shadowOpacity 0.34, shadowSoft 0 (blur px), contact true, contactColor "#3b4a3a", contactOpacity 0.484
 *   planters true, planterEvery 6, planterZ 3.2, planterColors {box, light, leaf, leafLight}
 *   compass true, sky ["#9cc0d2","#f0dcc0"], ground ["#d9c9a8","#c4ae86"], tiles true, tileColor "rgba(120,96,60,.28)"
 *   labels false (debug caption), font "ui-monospace, Menlo, Consolas, monospace"
 *
 * MGP.shadow3d.lib:
 *   drawShadow(g, cam, prims, base, face, sole, sun, o)   one composited shadow layer (+ contact) for the figure and o.extra(layerCtx)
 *   shadowShapes, contactShapes, groundOf                  re-exported from MGP.figure3d.lib
 *   planters(baseX, o) -> [[x,z],...], planterShadow(lg, cam, x, z, sun), drawPlanter(g, cam, x, z, sun, o, alpha)
 *   drawCompass(g, x, y, R, sunAz, sunEl, face, o)         headLength(el) = 5.78 / tan(el)
 *
 * Example:
 *   MGP.core.expose(MGP.shadow3d.create("#stage", { sunAz: [[0, 200], [10, 320]], sunEl: 40 }));
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  if (!C || !MGP.figure3d) throw new Error("shadow3d.js: load core/mgp-core.js and figure3d.js first");
  const F = MGP.figure3d.lib, TAU = Math.PI * 2, RAD = Math.PI / 180;
  const SOLE = 5.78;

  /** all ground shadows in one opaque layer, composited once; o.mode "fixed" uses one rigid ellipse instead of the pose */
  function drawShadow(g, cam, prims, base, face, sole, sun, o) {
    o = o || {}; const k = o.scale || 1;
    if (o.mode !== "fixed") return F.castShadow(g, cam, prims, base, face, sole, sun, o);
    const S = o.S || { W: o.W, H: o.H, cache: {} }, L = F.layer(S, "shadow", g); L.g.fillStyle = o.color || "#3a3f66";
    F.fillScr(L.g, F.groundScr(cam, F.ellipseXZ(base[0] + 0.1 * k, base[1], 0.9 * k, 0.38 * k, 0, 32)));
    if (o.extra) o.extra(L.g);
    g.save(); g.globalAlpha = o.opacity == null ? 0.34 : o.opacity; g.globalCompositeOperation = "multiply"; if (o.soft > 0) g.filter = `blur(${o.soft}px)`; g.drawImage(L.c, 0, 0, S.W, S.H); g.restore();
  }
  const planters = (bx, o = {}) => { const ev = o.planterEvery || 6, pz = o.planterZ == null ? 3.2 : o.planterZ, out = []; for (let k = Math.floor(bx / ev) - 4; k <= Math.floor(bx / ev) + 5; k++) out.push([k * ev + ev / 2, k % 2 ? pz : -pz]); return out; };
  function planterShadow(lg, cam, x, z, sun) {
    const shd = [-sun[0], -sun[2]], m = Math.hypot(shd[0], shd[1]) || 1, ang = Math.atan2(shd[1] / m, shd[0] / m), G = F.groundOf([x, 1.6, z], sun);
    F.fillScr(lg, F.groundScr(cam, F.ellipseXZ((x + G[0]) / 2, (z + G[1]) / 2, Math.hypot(G[0] - x, G[1] - z) / 2 + 0.6, 0.62, ang, 28)));
  }
  function drawPlanter(g, cam, x, z, sun, o, alpha) {
    const P = Object.assign({ box: "#8b6b4a", light: "rgba(255,240,210,.25)", leaf: "#5f7d48", leafLight: "#8ea55c" }, (o && o.planterColors) || {});
    const c = C.camC(cam, [x, 0, z]); if (c[2] < cam.near) return;
    const s0 = C.scr(cam, c), k = cam.f / c[2], [lx] = F.light2d(cam, sun);
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.fillStyle = P.box; g.beginPath(); g.roundRect ? g.roundRect(s0[0] - 0.55 * k, s0[1] - 0.9 * k, 1.1 * k, 0.9 * k, 0.08 * k) : g.rect(s0[0] - 0.55 * k, s0[1] - 0.9 * k, 1.1 * k, 0.9 * k); g.fill();
    g.fillStyle = P.light; g.fillRect(lx > 0 ? s0[0] + 0.15 * k : s0[0] - 0.55 * k, s0[1] - 0.9 * k, 0.4 * k, 0.9 * k);
    g.fillStyle = P.leaf; for (const [dx, dy, r] of [[-0.3, -1.05, 0.38], [0.25, -1.1, 0.42], [0, -1.4, 0.4]]) { g.beginPath(); g.arc(s0[0] + dx * k, s0[1] + dy * k, r * k, 0, TAU); g.fill(); }
    g.fillStyle = P.leafLight; g.beginPath(); g.arc(s0[0] + (lx > 0 ? 0.15 : -0.15) * k, s0[1] - 1.5 * k, 0.2 * k, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }
  /** sun compass: north mark, facing (ivory), sun position (gold, nearer the centre when high), shadow direction (blue) */
  function drawCompass(g, cxp, cyp, R0, az, el, face, o) {
    o = o || {}; const font = o.font || F.MONO;
    g.fillStyle = "rgba(7,10,22,.72)"; g.beginPath(); g.arc(cxp, cyp, R0 + 6, 0, TAU); g.fill(); g.strokeStyle = "rgba(242,215,150,.45)"; g.lineWidth = 1; g.beginPath(); g.arc(cxp, cyp, R0, 0, TAU); g.stroke();
    const A = (a, r) => [cxp + Math.sin(a * RAD) * r, cyp - Math.cos(a * RAD) * r];
    F.tag(g, o.north || "U", cxp, cyp - R0 + 9, F.K.muted, Math.max(8, R0 * 0.2), "center", font);
    const sp = A(az, R0 * (1 - el / 90)), shp = A(az + 180, R0 * 0.9 * Math.min(1, 0.35 / Math.tan(el * RAD) + 0.2));
    g.strokeStyle = "rgba(160,170,230,.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cxp, cyp); g.lineTo(shp[0], shp[1]); g.stroke();
    g.fillStyle = F.K.gold2; g.beginPath(); g.arc(sp[0], sp[1], Math.max(4.5, R0 * 0.11), 0, TAU); g.fill();
    const fa = A(face, R0 * 0.5); g.strokeStyle = F.K.ivory; g.beginPath(); g.moveTo(cxp, cyp); g.lineTo(fa[0], fa[1]); g.stroke();
  }

  const shadow3d = C.defineModule("shadow3d", {
    size: [1280, 720], duration: (o) => o.duration || 10,
    defaults: { seed: 1, duration: 10, sunAz: [[0, 200], [10, 320]], sunEl: [[0, 55], [5, 24], [10, 55]], action: "walk", face: 90, view: 45, travel: true, x: 0, z: 0,
      dist: 10, pitch: 4, focal: null, soleY: 0.8, scale: 1, step: 2.0, cadence: 120, lift: 0.2, phase: 0, pal: null,
      mode: "pose", shadowColor: "#3a3f66", shadowOpacity: 0.34, shadowSoft: 0, contact: true, contactColor: "#3b4a3a", contactOpacity: 0.22 * 2.2,
      planters: true, planterEvery: 6, planterZ: 3.2, planterColors: null, compass: true,
      sky: ["#9cc0d2", "#f0dcc0"], ground: ["#d9c9a8", "#c4ae86"], tiles: true, tileColor: "rgba(120,96,60,.28)", labels: false, font: F.MONO },
    setup(S) { S.gt = F.gaitFor(S.opts); S.pal = F.palette(S.opts.pal); },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, k = o.scale || 1;
      const f = o.focal || Math.max(0.62 * W, 0.95 * H), pitch = o.pitch, d = o.dist, face = o.face;
      const { J, base } = F.poseAt(S.gt, o, t);
      const az = ((F.valAt(o.sunAz, t) % 360) + 360) % 360, el = C.clamp(F.valAt(o.sunEl, t), 1, 89), sun = C.sunDir(az, el);
      const hc = F.camHeight(d, pitch, f, H / 2, o.soleY * H), cam = C.camOrbit([base[0], 0, base[1]], d, hc, face + F.valAt(o.view, t), pitch, f, W / 2, H / 2), hy = C.horizonY(cam);
      const sk = g.createLinearGradient(0, 0, 0, Math.max(1, hy)); sk.addColorStop(0, o.sky[0]); sk.addColorStop(1, o.sky[1]); g.fillStyle = sk; g.fillRect(0, 0, W, hy + 1);
      const gg = g.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, o.ground[0]); gg.addColorStop(1, o.ground[1]); g.fillStyle = gg; g.fillRect(0, hy, W, H - hy);
      if (o.tiles) F.drawTiles(g, cam, base[0], { color: o.tileColor, step: k });
      const props = o.planters ? planters(base[0], o) : [];
      const prims = F.figPrims(J);
      drawShadow(g, cam, prims, base, face, SOLE, sun, { S, mode: o.mode, color: o.shadowColor, opacity: o.shadowOpacity, soft: o.shadowSoft, contact: o.contact && o.mode !== "fixed",
        contactColor: o.contactColor, contactOpacity: o.contactOpacity, scale: k, extra: (lg) => props.forEach(([x, z]) => planterShadow(lg, cam, x, z, sun)) });
      // props + figure sorted by depth; a prop between camera and figure is faded so the feet stay readable
      const items = props.map(([x, z]) => ({ x, z, c: C.camC(cam, [x, 0, z]) })).filter((q) => q.c[2] > cam.near).map((q) => Object.assign(q, { zz: q.c[2] }));
      const heroC = C.camC(cam, [base[0], 0, base[1]]), heroX = C.scr(cam, heroC)[0];
      items.push({ hero: true, zz: heroC[2] }); items.sort((a, b) => b.zz - a.zz);
      for (const it of items) {
        if (it.hero) { F.drawFigure(g, cam, J, base, face, SOLE, sun, { pal: S.pal, scale: k }); continue; }
        const s0 = C.scr(cam, it.c), kk = f / it.zz;
        drawPlanter(g, cam, it.x, it.z, sun, o, it.zz < heroC[2] && Math.abs(s0[0] - heroX) < 1.6 * kk ? 0.28 : 1);
      }
      const sc = H / 440;
      if (o.compass) { const R0 = Math.min(40 * sc, W * 0.09); drawCompass(g, W - R0 - 14 * sc, R0 + 14 * sc, R0, az, el, face, o); }
      if (o.labels) F.tag(g, (o.mode === "fixed" ? "KAPSUL TETAP" : "BAYANGAN DARI POSE 3D") + ` \u00b7 MATAHARI ${Math.round(az)}\u00b0 / ${Math.round(el)}\u00b0 \u00b7 BAYANGAN KEPALA ${(SOLE * k / Math.tan(el * RAD)).toFixed(2)} H`, 12 * sc, H - 14 * sc, "#1c2340", 10 * sc, "left", o.font);
    },
  });
  shadow3d.lib = { drawShadow, planters, planterShadow, drawPlanter, drawCompass, shadowShapes: F.shadowShapes, contactShapes: F.contactShapes, groundOf: F.groundOf, headLength: (el) => SOLE / Math.tan(el * RAD) };
  MGP.shadow3d = shadow3d;
})(typeof globalThis !== "undefined" ? globalThis : this);
