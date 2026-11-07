/**
 * MGP.characterStyles \u2014 one character, three looks: smooth vector, pixel art, origami. Same rig, same motion,
 * only the drawing changes. Side view facing right; the legs come from the gait engine of MGP.figure3d (planted
 * stance foot with heel / toe roll), so the sole stays flat in stance and the ground scrolls at the walking speed.
 *   vector  : ink-outlined strokes, flat colour per material, far limbs in shade colours, 24 fps
 *   pixel   : the sprite is laid out at its real size (about 90 px tall) as flat material masks, then shaded pixel by
 *             pixel (light / base / shadow ramp per material + selective outline), upscaled without smoothing, 8 fps
 *   origami : each body part is ONE sheet folded once along a straight crease (lit face + shaded flap); the flaps
 *             swing open around their crease like hinges at the start (unfold), 12 fps
 *
 * Source: website guide/js/demos-skills.js, section "8 \u00b7 GAYA TOKOH" (gtPose, gtVector, gtHead, gtPixelSprite,
 * gtPaper, gtPaperDraw, gayaTokoh backgrounds). The crane example of the origami look is MGP.origamiFold.
 * Requires: core, figure3d.js (MGP.figure3d.lib: Gait engine, FIG, BODY, shoeMap, ik) loaded before the first draw.
 * Optional: origami-fold.js for action "crane".
 *
 * Options (defaults):
 *   style     "vector"     "vector" | "pixel" | "origami"
 *   action    "walk"       "walk" | "idle" (breathing) | "wave" (hello) | "sheet" (pixel: walk + the 8-frame sprite sheet)
 *                          | "crane" (origami: folded crane, needs origami-fold.js) | "ex" (= the website example of the style:
 *                          vector wave, pixel sheet, origami crane)
 *   palette   {}           colour overrides: skin, skinS, hair, hairL, top, topS, pants, pantsS, shoe, shoeS, sole, ink, blush
 *                          (a base colour without its S variant derives the shade); pixel ramps derive from the same keys
 *   pixelRamps {}          explicit pixel ramps {skin: [light, base, shadow, outline], ...} (also skinF, topF, pantsF, shoeF)
 *   scale     0.66         character height as a fraction of the canvas height
 *   x         null         character x as a fraction of the width (default 0.47; pixel 0.45, pixel sheet 0.22)
 *   ground    0.84         ground line as a fraction of the height
 *   fps       null         frame stepping (default vector 24, pixel 8, origami 12); 0 = continuous
 *   scroll    true         the ground scrolls while walking (character stays in place)
 *   bg        "auto"       "auto" = the look's backdrop (sky + hills / pixel landscape / paper landscape), a CSS colour, or null
 *   grid      false        pixel grid (pixel) or dashed crease lines (origami)
 *   unfoldAt  0            origami: second at which the hinge unfold starts (null = already open)
 *   origamiGaya "kaku"     origami look: "kaku" (v2.4: each part one paper strip with a continuous mountain crease,
 *                          knee/elbow folds sharing mitre edges, every facet lit from one light direction, plain paper
 *                          backdrop) | "lama" (v2.3 look: pointed strips with hinged flaps, speckled backdrop)
 *   blink     true
 *   lineWidth 2.2          vector ink width (character units, 100 = full height)
 *   strokeTetap null       vector: ink width in screen px that stays constant when the character is scaled (non-scaling stroke)
 *   anggota  "kaku"       vector: "karet" = rubberhose limbs (one constant-length bend hip->ankle, shoulder->wrist; never below the sole)
 *   stepLabels true        crane step names (action "crane")
 *   font      'ui-monospace, Menlo, Consolas, monospace'
 *   seed      5, duration 8, width 1280, height 720
 *
 * api: MGP.characterStyles.create(canvasOrEl, opts), .render(ctx, t, opts)
 *   MGP.characterStyles.lib = {
 *     pose(mode, p) -> J            rig in character units (100 = height, y down, feet on y 0, x 0 = hip); mode walk|idle|wave
 *     drawVector(g, J, {blink, lwI, col}), drawHead(g, J, o, lwI, col)
 *     pixelSprite(J, s, blink, ramps) -> {c, ox, oy}   low-res sprite canvas (s = sprite px per character unit)
 *     paperPieces(J, col) -> pieces, paperDraw(g, pieces, foldT, grid)
 *     bgVector(g, W, H, gy, scroll), bgPaper(g, W, H, gy, scroll, seed), bgPixel(lg, Wl, Hl, gyl, sc)
 *     colors(palette) -> col, pixelRamps(col, overrides) -> ramps, COL, PIXEL_MAT, hingePt, gait() (shared Gait instance), K (units per H)
 *   }
 *
 * Example:
 *   const inst = MGP.characterStyles.create("#stage", { style: "pixel", action: "walk" });
 *   MGP.core.expose(inst);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const { clamp, mix, rgba } = C;
  const inout3 = C.ease.inOut;
  const hexRGB = (c) => C.rgb(c);

  /* ---------------- figure3d dependency (resolved lazily so load order does not matter) ---------------- */
  const F = () => {
    const L = MGP.figure3d && MGP.figure3d.lib;
    if (!L || !L.figGait) throw new Error("MGP.characterStyles needs figure3d.js (MGP.figure3d.lib) loaded first");
    return L;
  };
  let GT_G = null, GT_K = null;
  const gait = () => GT_G || (GT_G = F().figGait());
  const unitK = () => GT_K || (GT_K = 100 / F().BODY.sole_y);

  /* ---------------- palette ---------------- */
  const COL = { skin: "#f3b892", skinS: "#c98663", hair: "#3b2620", hairL: "#6e4433", top: "#d8693f", topS: "#a2482c", pants: "#2d4068", pantsS: "#1f2c4a", shoe: "#f3eee4", shoeS: "#b9ae9c", sole: "#5b5266", ink: "#1b1226", blush: "#f08a78" };
  function colors(pal) {
    pal = pal || {}; const c = Object.assign({}, COL, pal);
    for (const k of ["skin", "top", "pants", "shoe"]) if (pal[k] && !pal[k + "S"]) c[k + "S"] = mix(pal[k], "#3a1a10", 0.25);
    if (pal.hair && !pal.hairL) c.hairL = mix(pal.hair, "#ffffff", 0.22);
    return c;
  }

  const gtDir = (a) => [Math.sin(a * RAD), Math.cos(a * RAD)];
  const gtAdd = (p, a, L) => { const d = gtDir(a); return [p[0] + d[0] * L, p[1] + d[1] * L]; };
  // pose: legs from the gait engine (planted stance foot, real heel / toe roll); stylised upper body with a big head.
  // Idle breathing and the wave hello use standing legs.
  function gtPose(mode, p) {
    const Lb = F(), G = gait(), BODY = Lb.BODY, FIG = Lb.FIG, shoeMap = Lb.shoeMap, ik = Lb.ik, K = unitK();
    const P = (q) => [q[0] * K, (q[1] - BODY.sole_y) * K], J = {};
    let hip, lean = 0, legs = [], arms = [], nod = 0;
    const shoeOf = (cfg) => { const f = shoeMap(cfg); return { poly: G.b.shoe.map((q) => P(f(q))), heel: P(f(G.HEEL)), toe: P(f(G.TOE)) }; };
    if (mode === "walk") {
      const pz = G.pose(p); hip = P(pz.hip); lean = pz.lean; nod = pz.nod;
      legs = [pz.near, pz.far].map((L) => Object.assign({ hip, k: P(L.knee), an: P(L.ankle), stance: L.stance }, shoeOf(L.cfg)));
      arms = [0, 0.5].map((side) => { const [, th, el] = G.arm(p + side); return { up: th * 1.25, lo: th * 1.25 + el }; });
    } else {
      const br = Math.sin(TAU * p); hip = P([0, FIG.HIP + 0.004 * br]); lean = 1;
      legs = [0.07, -0.06].map((ax) => { const cfg = { piv: G.HEEL, at: [ax - (G.ANK[0] - G.HEEL[0]), G.SOLE], deg: 0 }, an = shoeMap(cfg)(G.ANK); return Object.assign({ hip, k: P(ik([0, FIG.HIP], an, G.TH, G.SH, true)), an: P(an), stance: true }, shoeOf(cfg)); });
      if (mode === "wave") arms = [{ up: 150, lo: 165 + 22 * Math.sin(TAU * p * 2) }, { up: -4, lo: 8 }];
      else arms = [{ up: 5 + br, lo: 14 + br }, { up: -5 - br, lo: 6 }];
    }
    const sh = gtAdd(hip, 180 - lean, 21), neck = gtAdd(hip, 180 - lean, 23.5);
    J.hip = hip; J.sh = sh; J.neck = neck; J.head = [neck[0] + 2.6, neck[1] - 12.5 + 0.3 * nod]; J.lean = lean;
    J.legs = legs; J.arms = arms.map((A) => { const e = gtAdd(sh, A.up, 15), w = gtAdd(e, A.lo, 13.5); return { sh, e, w }; });
    return J;
  }
  // trouser leg end just above the ankle (hidden in the shoe)
  const gtHem = (L, up = 1.3) => { const d = [L.k[0] - L.an[0], L.k[1] - L.an[1]], m = Math.hypot(d[0], d[1]) || 1; return [L.an[0] + d[0] / m * up, L.an[1] + d[1] / m * up]; };
  const gtPath = (g, pts, close = true) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (close) g.closePath(); };

  /* ---------------- vector ---------------- */
  function gtVector(g, J, o = {}) {
    const Cc = o.col || COL, lwI = o.lwI || 2.4;
    const seg = (pts, w, col, cap = "round") => { g.lineJoin = "round"; g.lineCap = cap; g.strokeStyle = Cc.ink; g.lineWidth = w + lwI; gtPath(g, pts, false); g.stroke(); g.strokeStyle = col; g.lineWidth = w; gtPath(g, pts, false); g.stroke(); };
    const shoe = (L, far) => {
      g.lineJoin = "round"; g.fillStyle = far ? Cc.shoeS : Cc.shoe; g.strokeStyle = Cc.ink; g.lineWidth = lwI; gtPath(g, L.poly); g.stroke(); g.fill();
      const d = [L.toe[0] - L.heel[0], L.toe[1] - L.heel[1]], m = Math.hypot(d[0], d[1]) || 1, u = [d[0] / m, d[1] / m], n = [u[1], -u[0]];
      g.save(); gtPath(g, L.poly); g.clip(); g.fillStyle = far ? mix(Cc.sole, "#000000", 0.2) : Cc.sole;
      gtPath(g, [[L.heel[0] - u[0] * 4, L.heel[1] - u[1] * 4], [L.toe[0] + u[0] * 4, L.toe[1] + u[1] * 4], [L.toe[0] + u[0] * 4 + n[0] * 1.5, L.toe[1] + u[1] * 4 + n[1] * 1.5], [L.heel[0] - u[0] * 4 + n[0] * 1.5, L.heel[1] - u[1] * 4 + n[1] * 1.5]]); g.fill(); g.restore();
      g.strokeStyle = Cc.ink; g.lineWidth = lwI * 0.7; gtPath(g, L.poly); g.stroke();
    };
    const leg = (L, far) => {
      // one trouser leg: both ink passes first, then both colour passes, so thigh and shin read as one piece of cloth
      const col = far ? Cc.pantsS : Cc.pants, hem = gtHem(L), pass = (ink) => { g.lineJoin = "round"; g.strokeStyle = ink ? Cc.ink : col; g.lineCap = "butt"; g.lineWidth = 7.4 + (ink ? lwI : 0); gtPath(g, [L.k, hem], false); g.stroke(); g.lineCap = "round"; g.lineWidth = 9.4 + (ink ? lwI : 0); gtPath(g, [L.hip, L.k], false); g.stroke(); g.lineWidth = 7.4 + (ink ? lwI : 0); gtPath(g, [L.k, [L.k[0] + 0.01, L.k[1]]], false); g.stroke(); };
      pass(true); pass(false); shoe(L, far);
    };
    const arm = (A, far) => { seg([A.sh, A.e], 7, far ? Cc.topS : Cc.top); seg([A.e, A.w], 5.4, far ? Cc.skinS : Cc.skin); seg([A.w, A.w], 6.8, far ? Cc.skinS : Cc.skin); };
    // rubberhose (o.karet): satu busur lentur berpanjang tetap dari pinggul ke pergelangan kaki / bahu ke pergelangan tangan.
    // Ujung celana dipotong di atas pergelangan dan berujung butt; bila garisnya masih turun melewati telapak (y > -0,4),
    // ujungnya dipotong lagi sampai aman. Sepatu digambar sesudahnya menutup ujung itu.
    const legK = (L, far) => {
      const col = far ? Cc.pantsS : Cc.pants, len = Math.hypot(L.k[0] - L.hip[0], L.k[1] - L.hip[1]) + Math.hypot(L.an[0] - L.k[0], L.an[1] - L.k[1]);
      let pts = C.potongUjung(C.karet(L.hip, L.an, len, { arah: -1 }).pts, 1.3); const w = 8.4;
      for (let i = 0; i < 12 && C.bawahGaris(pts, w + lwI) > -0.4; i++) pts = C.potongUjung(pts, 0.5);
      L.karetBawah = C.bawahGaris(pts, w + lwI);
      for (const ink of [true, false]) { g.lineJoin = "round"; g.strokeStyle = ink ? Cc.ink : col; g.lineWidth = w + (ink ? lwI : 0); g.lineCap = "butt"; gtPath(g, pts, false); g.stroke(); g.lineCap = "round"; gtPath(g, pts.slice(0, 3), false); g.stroke(); }
      shoe(L, far);
    };
    const armK = (A, far) => {
      const len = Math.hypot(A.e[0] - A.sh[0], A.e[1] - A.sh[1]) + Math.hypot(A.w[0] - A.e[0], A.w[1] - A.e[1]), pts = C.karet(A.sh, A.w, len, { arah: 1 }).pts, n = pts.length;
      seg(pts.slice(0, Math.ceil(n * 0.55)), 7, far ? Cc.topS : Cc.top); seg(pts.slice(Math.floor(n * 0.5)), 5.4, far ? Cc.skinS : Cc.skin); seg([A.w, A.w], 6.8, far ? Cc.skinS : Cc.skin);
    };
    const kar = !!o.karet, legF = kar ? legK : leg, armF = kar ? armK : arm;
    armF(J.arms[1], true); legF(J.legs[1], true);
    seg([[J.hip[0], J.hip[1] - 2], [J.hip[0], J.hip[1] + 2]], 15, Cc.pants);
    seg([[J.sh[0] - 1, J.sh[1] + 2], [J.hip[0], J.hip[1] - 4]], 17, Cc.top);
    legF(J.legs[0], false);
    gtHead(g, J, o, lwI, Cc);
    armF(J.arms[0], false);
  }
  function gtHead(g, J, o, lwI, Cc) {
    Cc = Cc || COL; const [hx, hy] = J.head, r = 11.5;
    g.lineCap = "round"; g.strokeStyle = Cc.ink; g.lineWidth = 6 + lwI; gtPath(g, [[J.neck[0] + 1, J.neck[1] + 2], [J.neck[0] + 1.5, J.neck[1] - 4]], false); g.stroke();
    g.strokeStyle = Cc.skinS; g.lineWidth = 6; g.stroke();
    g.fillStyle = Cc.ink; g.beginPath(); g.arc(hx, hy, r + lwI / 2, 0, TAU); g.fill();
    g.fillStyle = Cc.skin; g.beginPath(); g.arc(hx, hy, r, 0, TAU); g.fill();
    g.fillStyle = Cc.hair; g.beginPath(); g.moveTo(hx + r * 0.95, hy - r * 0.25); g.quadraticCurveTo(hx + r * 0.9, hy - r * 1.25, hx - r * 0.1, hy - r * 1.12); g.quadraticCurveTo(hx - r * 1.25, hy - r * 0.95, hx - r * 1.08, hy + r * 0.25); g.quadraticCurveTo(hx - r * 0.75, hy + r * 0.65, hx - r * 0.35, hy + r * 0.15); g.quadraticCurveTo(hx - r * 0.2, hy - r * 0.35, hx + r * 0.25, hy - r * 0.45); g.quadraticCurveTo(hx + r * 0.6, hy - r * 0.15, hx + r * 0.95, hy - r * 0.25); g.fill();
    g.strokeStyle = Cc.ink; g.lineWidth = lwI * 0.6; g.stroke();
    g.fillStyle = Cc.skinS; g.beginPath(); g.ellipse(hx - r * 0.15, hy + r * 0.08, r * 0.17, r * 0.24, 0, 0, TAU); g.fill();
    g.fillStyle = Cc.ink; g.beginPath(); g.ellipse(hx + r * 0.52, hy - r * 0.02, r * 0.11, o.blink ? r * 0.03 : r * 0.17, 0, 0, TAU); g.fill();
    g.strokeStyle = Cc.hair; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + r * 0.36, hy - r * 0.3); g.lineTo(hx + r * 0.72, hy - r * 0.32); g.stroke();
    g.fillStyle = rgba(Cc.blush, 0.5); g.beginPath(); g.ellipse(hx + r * 0.45, hy + r * 0.35, r * 0.2, r * 0.12, 0, 0, TAU); g.fill();
    g.strokeStyle = Cc.mouth || "#8a3b34"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(hx + r * 0.62, hy + r * 0.5); g.quadraticCurveTo(hx + r * 0.75, hy + r * 0.6, hx + r * 0.88, hy + r * 0.48); g.stroke();
  }

  /* ---------------- pixel art ----------------
     every material has a ramp (light, base, shadow, outline); light comes from the upper front, so a 2 px shadow band
     runs along the back / under edges and a 1 px light rim along the top / front. Selective outline: the material's own
     dark tone (softer on the lit side) and a mid tone on staircase corners instead of anti-aliasing. */
  const PIXEL_MAT = [
    ["skin", ["#ffd9bb", "#f2b48d", "#cf8a64", "#8a4a34"]], ["skinF", ["#dea07c", "#cc8a66", "#ad6c4c", "#6e3828"]],
    ["hair", ["#7b4b37", "#4a2c21", "#2c1a14", "#140b08"]], ["top", ["#f59a68", "#d8693f", "#a9482b", "#5e2414"]],
    ["topF", ["#c2613d", "#a9502f", "#86391f", "#4a1a0c"]], ["pants", ["#5672ad", "#30467a", "#202f55", "#0e1428"]],
    ["pantsF", ["#2c3f6c", "#243559", "#192643", "#0a0f20"]], ["shoe", ["#ffffff", "#ece5d6", "#bdb19c", "#5c5548"]],
    ["shoeF", ["#d6ccb8", "#c2b6a0", "#9d927f", "#4a443a"]], ["sole", ["#6a6178", "#4f4759", "#3b3444", "#1d1923"]],
    ["eye", null, "#22161f"], ["mouth", null, "#8a3b34"], ["blush", null, "#f19a86"],
  ];
  const PX_KEY = PIXEL_MAT.map((m, i) => `rgb(${(i * 19 + 7) % 256},${(i * 53 + 101) % 256},${(i * 97 + 31) % 256})`), PX_KEYV = PX_KEY.map((s) => s.match(/\d+/g).map(Number));
  const PX_MI = Object.fromEntries(PIXEL_MAT.map((m, i) => [m[0], i]));
  const rampOf = (base) => [mix(base, "#fff6e0", 0.32), base, mix(base, "#2a1530", 0.28), mix(base, "#140810", 0.62)];
  /** pixel ramps as RGB arrays, index-aligned with PIXEL_MAT; base colours from the palette, explicit overrides win */
  function pixelRamps(pal, over) {
    pal = pal || {}; over = over || {};
    const src = { skin: "skin", hair: "hair", top: "top", pants: "pants", shoe: "shoe", sole: "sole" };
    return PIXEL_MAT.map(([name, ramp, flat]) => {
      if (over[name]) return over[name].map(hexRGB);
      if (!ramp) { const k = name === "eye" ? pal.ink && "ink" : name === "mouth" ? "mouth" : name === "blush" ? "blush" : null; return [hexRGB((k && pal[k]) || flat)]; }
      const base = name.endsWith("F") ? name.slice(0, -1) : name;
      if (src[base] && pal[src[base]]) { const b = name.endsWith("F") ? mix(pal[src[base]], "#2a1530", 0.2) : pal[src[base]]; return rampOf(b).map(hexRGB); }
      return ramp.map(hexRGB);
    });
  }
  const DEFAULT_RAMPS = PIXEL_MAT.map((m) => (m[1] ? m[1].map(hexRGB) : [hexRGB(m[2])]));
  function gtPixelSprite(J, s, blink, RGB) {
    RGB = RGB || DEFAULT_RAMPS;
    const w = Math.ceil(64 * s), h = Math.ceil(116 * s), c = C.offscreen(w, h);
    const g = c.getContext("2d", { willReadFrequently: true }), ox = Math.round(w * 0.42), oy = h - Math.round(3 * s), px = 1 / s, K = (n) => PX_KEY[PX_MI[n]];
    g.setTransform(s, 0, 0, s, ox, oy);
    const seg = (pts, wd, m, cap = "round") => { g.lineJoin = "round"; g.lineCap = cap; g.strokeStyle = K(m); g.lineWidth = wd; gtPath(g, pts, false); g.stroke(); };
    const shoe = (L, far) => {
      g.fillStyle = K(far ? "shoeF" : "shoe"); gtPath(g, L.poly); g.fill();
      const d = [L.toe[0] - L.heel[0], L.toe[1] - L.heel[1]], m = Math.hypot(d[0], d[1]) || 1, u = [d[0] / m, d[1] / m], n = [u[1], -u[0]], k = 1.4 * px + 0.5;
      g.save(); gtPath(g, L.poly); g.clip(); g.fillStyle = K("sole");
      gtPath(g, [[L.heel[0] - u[0] * 5 - n[0], L.heel[1] - u[1] * 5 - n[1]], [L.toe[0] + u[0] * 5 - n[0], L.toe[1] + u[1] * 5 - n[1]], [L.toe[0] + u[0] * 5 + n[0] * k, L.toe[1] + u[1] * 5 + n[1] * k], [L.heel[0] - u[0] * 5 + n[0] * k, L.heel[1] - u[1] * 5 + n[1] * k]]); g.fill(); g.restore();
    };
    const leg = (L, far) => { const m = far ? "pantsF" : "pants"; seg([L.k, gtHem(L, 1.6)], 7.4, m, "butt"); seg([L.hip, L.k], 9.2, m); seg([L.k, [L.k[0] + 0.01, L.k[1]]], 7.4, m); shoe(L, far); };
    const arm = (A, far) => { seg([A.sh, A.e], 7, far ? "topF" : "top"); seg([A.e, A.w], 5.4, far ? "skinF" : "skin"); seg([A.w, [A.w[0] + 0.01, A.w[1]]], 6.6, far ? "skinF" : "skin"); };
    arm(J.arms[1], true); leg(J.legs[1], true);
    seg([[J.hip[0], J.hip[1] - 2], [J.hip[0], J.hip[1] + 2]], 15, "pants");
    seg([[J.sh[0] - 1, J.sh[1] + 2], [J.hip[0], J.hip[1] - 4]], 17, "top");
    leg(J.legs[0], false);
    const [hx, hy] = J.head, r = 11.5;
    seg([[J.neck[0] + 1, J.neck[1] + 2], [J.neck[0] + 1.5, J.neck[1] - 4]], 6, "skinF");
    g.fillStyle = K("skin"); g.beginPath(); g.arc(hx, hy, r, 0, TAU); g.fill();
    g.fillStyle = K("hair"); g.beginPath(); g.moveTo(hx + r * 0.95, hy - r * 0.25); g.quadraticCurveTo(hx + r * 0.9, hy - r * 1.25, hx - r * 0.1, hy - r * 1.12); g.quadraticCurveTo(hx - r * 1.25, hy - r * 0.95, hx - r * 1.08, hy + r * 0.25); g.quadraticCurveTo(hx - r * 0.75, hy + r * 0.65, hx - r * 0.35, hy + r * 0.15); g.quadraticCurveTo(hx - r * 0.2, hy - r * 0.35, hx + r * 0.25, hy - r * 0.45); g.quadraticCurveTo(hx + r * 0.6, hy - r * 0.15, hx + r * 0.95, hy - r * 0.25); g.closePath(); g.fill();
    g.fillStyle = K("skinF"); g.beginPath(); g.ellipse(hx - r * 0.15, hy + r * 0.08, r * 0.17, r * 0.24, 0, 0, TAU); g.fill();
    arm(J.arms[0], false);
    // flat material map from the key colours (anti-aliased fringe below half coverage is dropped)
    g.setTransform(1, 0, 0, 1, 0, 0);
    const id = g.getImageData(0, 0, w, h), d = id.data, M = new Int8Array(w * h).fill(-1);
    for (let i = 0; i < w * h; i++) {
      const a = d[i * 4 + 3]; if (a < 128) continue;
      const r0 = d[i * 4], g0 = d[i * 4 + 1], b0 = d[i * 4 + 2]; let bi = 0, bd = 1e9;
      for (let k = 0; k < PX_KEYV.length; k++) { const P = PX_KEYV[k], e = (P[0] - r0) ** 2 + (P[1] - g0) ** 2 + (P[2] - b0) ** 2; if (e < bd) { bd = e; bi = k; } } M[i] = bi;
    }
    // stray blend pixels between two materials take the material around them
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, a1 = M[i - 1], a2 = M[i + 1], a3 = M[i - w], a4 = M[i + w]; if (M[i] >= 0 && a1 === a2 && a2 === a3 && a3 === a4 && a1 !== M[i]) M[i] = a1; }
    // face details on whole pixels: eye 2 px wide (1 px line when blinking), mouth and blush
    const put = (x, y, m) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) M[y * w + x] = PX_MI[m]; };
    const ex = ox + (hx + r * 0.5) * s, ey = oy + (hy - r * 0.1) * s, eh = blink ? 1 : Math.max(2, Math.round(r * 0.34 * s));
    for (let k = 0; k < eh; k++) { put(ex, ey + k - (blink ? -1 : 0), "eye"); put(ex + 1, ey + k - (blink ? -1 : 0), "eye"); }
    for (let k = 0; k < Math.max(2, Math.round(r * 0.26 * s)); k++) put(ox + (hx + r * 0.6) * s + k, oy + (hy + r * 0.52) * s + (k === 0 ? -1 : 0), "mouth");
    for (let k = 0; k < Math.max(2, Math.round(r * 0.28 * s)); k++) put(ox + (hx + r * 0.3) * s + k, oy + (hy + r * 0.3) * s, "blush");
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : M[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, m = M[i];
      if (m >= 0) {
        const R2 = RGB[m]; let P;
        if (R2.length === 1) P = R2[0];
        else {
          const big = m === PX_MI.top || m === PX_MI.pants || m === PX_MI.hair, sh = at(x - 1, y) !== m || at(x - 2, y) !== m || (big && at(x - 3, y) !== m) || at(x, y + 1) !== m || (at(x, y + 2) !== m && at(x - 1, y + 1) !== m);
          const li = !sh && (at(x + 1, y) !== m || at(x, y - 1) !== m);
          P = R2[sh ? 2 : li ? 0 : 1];
        }
        d[i * 4] = P[0]; d[i * 4 + 1] = P[1]; d[i * 4 + 2] = P[2]; d[i * 4 + 3] = 255; continue;
      }
      // outline pixel?
      const L2 = at(x - 1, y), R3 = at(x + 1, y), U2 = at(x, y - 1), D2 = at(x, y + 1), nb = [D2, L2, U2, R3].filter((v) => v >= 0);
      if (!nb.length) { d[i * 4 + 3] = 0; continue; }
      const src = nb[0], R2 = RGB[src], lit = U2 < 0 && R3 < 0, base = R2.length === 1 ? RGB[PX_MI.skin] : R2;
      let P = lit ? base[3].map((v, k) => Math.round(v * 0.55 + base[2][k] * 0.45)) : base[3];
      if (nb.length === 2 && !((L2 >= 0 && R3 >= 0) || (U2 >= 0 && D2 >= 0))) P = P.map((v, k) => Math.round(v * 0.6 + base[1][k] * 0.4));
      d[i * 4] = P[0]; d[i * 4 + 1] = P[1]; d[i * 4 + 2] = P[2]; d[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return { c, ox, oy };
  }

  /* ---------------- origami: every part is ONE sheet folded once along a straight crease (mountain fold) ---------------- */
  function gtPaper(J, Cc) {
    Cc = Cc || COL; const pcs = [], dk = (c, k) => mix(c, "#2a1530", k), lt = (c, k) => mix(c, "#fff6e4", k);
    const piece = (gIdx, front, back, hinge, cF, cB) => pcs.push({ g: gIdx, planes: [{ p: front, c: cF }, { p: back, c: cB, flap: true }], hinge });
    // a strip a -> b, half widths wa / wb, pointed ends (folded corners) so joints overlap without gaps
    const strip = (gIdx, a, b, wa, wb, col, far, pa = 0.7, pb = 0.7) => {
      const d = [b[0] - a[0], b[1] - a[1]], m = Math.hypot(d[0], d[1]) || 1, u = [d[0] / m, d[1] / m], n = [u[1], -u[0]];
      const fn = n[0] >= 0 ? n : [-n[0], -n[1]];
      const A = [a[0] - u[0] * wa * pa, a[1] - u[1] * wa * pa], B = [b[0] + u[0] * wb * pb, b[1] + u[1] * wb * pb];
      const Fp = [A, [a[0] + fn[0] * wa, a[1] + fn[1] * wa], [b[0] + fn[0] * wb, b[1] + fn[1] * wb], B], Kp = [A, [a[0] - fn[0] * wa, a[1] - fn[1] * wa], [b[0] - fn[0] * wb, b[1] - fn[1] * wb], B];
      piece(gIdx, Fp, Kp, [A, B], far ? dk(col, 0.18) : lt(col, 0.12), far ? dk(col, 0.42) : dk(col, 0.22));
    };
    const shoe = (L, far) => {
      const q = L.poly, n = q.length;
      const iT = 9 % n, iH = 2, side = q.slice(iT).concat(q.slice(0, iH + 1)), top = q.slice(iH, iT + 1);
      piece(0, side, top, [q[iH], q[iT]], far ? Cc.shoeS : Cc.shoe, far ? dk(Cc.shoeS, 0.15) : lt(Cc.shoe, 0.6));
    };
    const leg = (L, far) => { strip(1, L.k, gtHem(L, 1.3), 4.6, 3.5, Cc.pants, far, 0.6, 0); strip(2, L.hip, L.k, 5.8, 4.6, Cc.pants, far, 0.5, 0.8); shoe(L, far); };
    const arm = (A, far) => {
      strip(5, A.sh, A.e, 4.2, 3.4, Cc.top, far, 0.6, 0.6); strip(5, A.e, A.w, 3.1, 2.6, Cc.skin, far, 0.5, 0.2);
      const d = gtDir(Math.atan2(A.w[0] - A.e[0], A.w[1] - A.e[1]) / RAD), m = [A.w[0] + d[0] * 3, A.w[1] + d[1] * 3], n = [d[1], -d[0]];
      piece(5, [A.w, [m[0] + n[0] * 3, m[1] + n[1] * 3], [A.w[0] + d[0] * 6.5, A.w[1] + d[1] * 6.5]], [A.w, [m[0] - n[0] * 3, m[1] - n[1] * 3], [A.w[0] + d[0] * 6.5, A.w[1] + d[1] * 6.5]], [A.w, [A.w[0] + d[0] * 6.5, A.w[1] + d[1] * 6.5]], far ? Cc.skinS : lt(Cc.skin, 0.15), far ? dk(Cc.skinS, 0.2) : Cc.skinS);
    };
    arm(J.arms[1], true); leg(J.legs[1], true);
    // pelvis and shirt: one sheet each, crease down the middle of the body
    const h = J.hip, s = J.sh, u = (() => { const d = [s[0] - h[0], s[1] - h[1]], m = Math.hypot(d[0], d[1]); return [d[0] / m, d[1] / m]; })(), fn = [-u[1], u[0]], Ln = Math.hypot(s[0] - h[0], s[1] - h[1]);
    const T = (t, k) => [h[0] + u[0] * Ln * t + fn[0] * k, h[1] + u[1] * Ln * t + fn[1] * k];
    piece(3, [T(-0.22, 0), T(-0.2, 7.4), T(0.12, 7.2), T(0.12, 0)], [T(-0.22, 0), T(-0.2, -7.6), T(0.12, -7.4), T(0.12, 0)], [T(-0.22, 0), T(0.12, 0)], lt(Cc.pants, 0.1), dk(Cc.pants, 0.25));
    piece(4, [T(0.02, 0), T(0.02, 7.6), T(0.5, 6.6), T(0.98, 7.4), T(1.08, 0)], [T(0.02, 0), T(0.02, -7.8), T(0.5, -7.2), T(0.98, -8.4), T(1.08, 0)], [T(0.02, 0), T(1.08, 0)], lt(Cc.top, 0.14), Cc.topS);
    leg(J.legs[0], false);
    // head: an octagon folded down the profile line, hair a separate folded cap, neck a small tab
    const [hx, hy] = J.head, r = 12.5, H = (a, k = r) => [hx + Math.cos(a * RAD) * k, hy + Math.sin(a * RAD) * k];
    piece(6, [[J.neck[0] + 4, J.neck[1] + 3], [J.neck[0] + 4.2, J.neck[1] - 7], [J.neck[0], J.neck[1] - 7]], [[J.neck[0] + 4, J.neck[1] + 3], [J.neck[0] - 3, J.neck[1] + 3], [J.neck[0], J.neck[1] - 7]], [[J.neck[0] + 4, J.neck[1] + 3], [J.neck[0], J.neck[1] - 7]], Cc.skin, Cc.skinS);
    const oct = [-112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5, 202.5].map((a) => H(a)), top = H(-90, r * 0.93), bot = H(90, r * 0.93);
    piece(6, [top, oct[1], oct[2], oct[3], oct[4], bot], [top, oct[0], oct[7], oct[6], oct[5], bot], [top, bot], lt(Cc.skin, 0.12), Cc.skinS);
    const h1 = H(-112, r * 1.14), h2 = H(-10, r * 1.06), h3 = H(150, r * 1.08), hc = H(-150, r * 0.32), h4 = H(96, r * 0.62);
    piece(7, [h1, h2, hc], [h1, hc, h4, h3, H(-160, r * 1.15)], [h1, hc], Cc.hairL, Cc.hair);
    arm(J.arms[0], false);
    return pcs;
  }
  // reflect point q across the line a-b scaled by c (c = 1 flat open, -1 folded flat over, 0 edge-on)
  const hingePt = (q, a, b, c) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, t = ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2, pr = [a[0] + d[0] * t, a[1] + d[1] * t]; return [pr[0] + (q[0] - pr[0]) * c, pr[1] + (q[1] - pr[1]) * c]; };
  function gtPaperDraw(g, pcs, foldT, grid) {
    const ord = [0, 1, 2, 3, 4, 5, 6, 7], dur = 0.42, gap = 0.2;
    // soft cast shadow of the whole sheet stack first (paper lifted off the backdrop)
    g.save(); g.translate(0.7, 1.1); g.fillStyle = "rgba(70,40,20,.16)";
    for (const pc of pcs) for (const pl of pc.planes) { if (pl.flap && foldT < (ord.indexOf(pc.g) * gap + dur)) continue; gtPath(g, pl.p); g.fill(); }
    g.restore();
    for (const pc of pcs) {
      const u = clamp((foldT - ord.indexOf(pc.g) * gap) / dur), c = Math.cos(Math.PI * (1 - inout3(u))), [A, B] = pc.hinge;
      const fl = pc.planes.find((p) => p.flap), fx = pc.planes.find((p) => !p.flap), fp = fl.p.map((q) => hingePt(q, A, B, c));
      const drawPl = (pts, col) => { g.fillStyle = col; gtPath(g, pts); g.fill(); g.strokeStyle = "rgba(255,249,236,.75)"; g.lineWidth = 0.55; g.lineJoin = "round"; g.stroke(); };
      // still closed: the flap lies on top showing the white back of the paper; opening: it swings round the crease
      const back = mix("#fbf3e2", fl.c, 0.08), shade = c < 0 ? mix(back, "#c9b08c", 0.25 * (1 + c)) : mix(fl.c, "#fff6e4", 0.18 * (1 - c));
      if (c >= 0) { drawPl(fp, shade); drawPl(fx.p, fx.c); }
      else { drawPl(fx.p, fx.c); drawPl(fp, shade); }
      g.strokeStyle = "rgba(60,30,20,.28)"; g.lineWidth = 0.45; gtPath(g, [A, B], false); g.stroke();
      if (grid) { g.strokeStyle = "rgba(60,30,20,.6)"; g.setLineDash([1.2, 1.2]); gtPath(g, [A, B], false); g.stroke(); g.setLineDash([]); }
    }
  }

  /* ---------------- origami lipat kaku (bawaan v2.4) ----------------
     Setiap bagian tubuh = satu strip kertas yang dilipat gunung di garis tengahnya (garis lipat menerus dari ujung
     ke ujung). Sendi (lutut, siku) = lipatan melintang: kedua segmen berbagi tepi miter, jadi tidak ada celah.
     Setiap muka datar diwarnai dari satu arah cahaya (kiri atas depan): n = (+-normal2D sin(phi), cos(phi)),
     terang = ambient + (1 - ambient) max(0, n . L). Tata letak muka hanya fungsi pose, jadi stabil antar-frame.
     Buka lipatan (unfoldAt): sudut lipat phi tiap bagian turun dari 84 derajat (hampir tertutup) ke 38 derajat. */
  const LO = (() => { const v = [-0.5, -0.62, 0.6], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
  const lerpN = (a, b, k) => a + (b - a) * k;
  function oriTerang(n2, phi, amb = 0.3) { const s = Math.sin(phi), c = Math.cos(phi); return amb + (1 - amb) * Math.max(0, n2[0] * s * LO[0] + n2[1] * s * LO[1] + c * LO[2]); }
  const oriWarna = (c, b) => mix(mix(c, "#2a1530", 0.5), mix(c, "#fff6e4", 0.28), clamp(b));
  function oriPoly(g, pts, fill) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = fill; g.lineWidth = 0.35; g.lineJoin = "round"; g.stroke(); }
  /** strip terlipat sepanjang polyline P dengan setengah lebar w[i]; phi = sudut lipat (0 = datar) */
  function oriStrip(g, P, w, col, phi, garis) {
    const n = P.length, seg = [], A = [], B = [], cp = Math.cos(phi);
    for (let i = 0; i < n - 1; i++) { const d = [P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]], L = Math.hypot(d[0], d[1]) || 1e-6; seg.push([d[1] / L, -d[0] / L]); }
    for (let i = 0; i < n; i++) {
      const a = seg[Math.max(0, i - 1)], b = seg[Math.min(n - 2, i)];
      let m = [a[0] + b[0], a[1] + b[1]]; const ml = Math.hypot(m[0], m[1]) || 1; m = [m[0] / ml, m[1] / ml];
      const k = Math.min(2.2, 1 / Math.max(0.35, m[0] * b[0] + m[1] * b[1])), ww = w[i] * cp * k;
      A.push([P[i][0] + m[0] * ww, P[i][1] + m[1] * ww]); B.push([P[i][0] - m[0] * ww, P[i][1] - m[1] * ww]);
    }
    // alas satu warna dulu (menutup garis rambut antialias di antara muka), lalu muka-muka datar
    const out = A.concat(B.slice().reverse());
    oriPoly(g, out, oriWarna(col, 0.35));
    for (let i = 0; i < n - 1; i++) {
      const s = seg[i];
      oriPoly(g, [P[i], P[i + 1], A[i + 1], A[i]], oriWarna(col, oriTerang(s, phi)));
      oriPoly(g, [P[i], P[i + 1], B[i + 1], B[i]], oriWarna(col, oriTerang([-s[0], -s[1]], phi)));
    }
    g.lineCap = "round"; g.lineJoin = "round";
    // garis lipat gunung menerus di tengah strip, lipatan melintang di sendi, tepi kertas tipis
    g.strokeStyle = "rgba(255,248,232,.55)"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n; i++) g.lineTo(P[i][0], P[i][1]); g.stroke();
    g.strokeStyle = "rgba(40,20,20,.28)"; g.lineWidth = 0.35; g.beginPath(); for (let i = 1; i < n - 1; i++) { g.moveTo(A[i][0], A[i][1]); g.lineTo(B[i][0], B[i][1]); } g.stroke();
    g.strokeStyle = "rgba(40,20,20,.32)"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(out[0][0], out[0][1]); for (let i = 1; i < out.length; i++) g.lineTo(out[i][0], out[i][1]); g.closePath(); g.stroke();
    if (garis) { g.strokeStyle = "rgba(60,30,20,.6)"; g.setLineDash([1.2, 1.2]); g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n; i++) g.lineTo(P[i][0], P[i][1]); g.stroke(); g.setLineDash([]); }
    return { A, B };
  }
  /** poligon terlipat sepanjang garis a-b (kepala, rambut, sepatu): dua muka, masing-masing diwarnai dari arah cahaya */
  function oriPanel(g, pts, a, b, col, phi) {
    const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, nn = [d[1] / L, -d[0] / L], side = (q) => (q[0] - a[0]) * nn[0] + (q[1] - a[1]) * nn[1];
    const cut = (P, sg) => { const o2 = []; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], fp = side(p) * sg, fq = side(q) * sg; if (fp >= 0) o2.push(p); if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); o2.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return o2; };
    const cp = Math.cos(phi), all = pts.map((q) => { const s = side(q); return [q[0] - nn[0] * s * (1 - cp), q[1] - nn[1] * s * (1 - cp)]; });
    oriPoly(g, all, oriWarna(col, 0.35));
    for (const sg of [1, -1]) { const P = cut(all, sg); if (P.length > 2) oriPoly(g, P, oriWarna(col, oriTerang([nn[0] * sg, nn[1] * sg], phi))); }
    g.strokeStyle = "rgba(255,248,232,.5)"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = "rgba(40,20,20,.3)"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(all[0][0], all[0][1]); for (let i = 1; i < all.length; i++) g.lineTo(all[i][0], all[i][1]); g.closePath(); g.stroke();
  }
  function gtOrigamiKaku(g, J, Cc, foldT, grid) {
    Cc = Cc || COL;
    const PHI = 46 * RAD, dur = 0.42, gap = 0.2, phiOf = (gi) => lerpN(84 * RAD, PHI, inout3(clamp((foldT - gi * gap) / dur)));
    const far = (c) => mix(c, "#2a1530", 0.16);
    const leg = (L, isFar) => {
      oriStrip(g, [L.hip, L.k, gtHem(L, 1.3)], [5.4, 4.4, 3.6], isFar ? far(Cc.pants) : Cc.pants, phiOf(isFar ? 1 : 2), grid);
      const q = L.poly, iT = 9 % q.length, iH = 2;
      oriPanel(g, q, q[iH], q[iT], isFar ? far(Cc.shoe) : Cc.shoe, phiOf(0) * 0.8);
    };
    const arm = (A, isFar) => {
      const ph = phiOf(5);
      oriStrip(g, [A.sh, A.e, A.w], [4, 3.2, 2.6], isFar ? far(Cc.top) : Cc.top, ph, grid);
      const d = [A.w[0] - A.e[0], A.w[1] - A.e[1]], m = Math.hypot(d[0], d[1]) || 1, u = [d[0] / m, d[1] / m];
      oriStrip(g, [[A.w[0] - u[0] * 1.2, A.w[1] - u[1] * 1.2], [A.w[0] + u[0] * 2.6, A.w[1] + u[1] * 2.6], [A.w[0] + u[0] * 5.6, A.w[1] + u[1] * 5.6]], [2.4, 2.9, 1.2], isFar ? far(Cc.skin) : Cc.skin, ph, false);
    };
    arm(J.arms[1], true); leg(J.legs[1], true);
    const h = J.hip, s = J.sh, dd = [s[0] - h[0], s[1] - h[1]], Ln = Math.hypot(dd[0], dd[1]) || 1, u = [dd[0] / Ln, dd[1] / Ln];
    const T = (t) => [h[0] + u[0] * Ln * t, h[1] + u[1] * Ln * t];
    oriStrip(g, [T(-0.2), T(0.14)], [7.4, 7.2], Cc.pants, phiOf(3), grid);
    oriStrip(g, [T(0.02), T(0.5), T(1.06)], [7.6, 6.8, 7.8], Cc.top, phiOf(4), grid);
    leg(J.legs[0], false);
    // leher + kepala: segi delapan dilipat di garis profil; rambut satu tutup terlipat
    oriStrip(g, [[J.neck[0] + 1, J.neck[1] + 3], [J.neck[0] + 1.5, J.neck[1] - 6]], [3.2, 3], Cc.skin, phiOf(6), false);
    const [hx, hy] = J.head, r = 12.5, H = (a, k = r) => [hx + Math.cos(a * RAD) * k, hy + Math.sin(a * RAD) * k];
    const oct = [-112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5, 202.5].map((a) => H(a));
    oriPanel(g, oct, H(-90, r * 0.93), H(90, r * 0.93), Cc.skin, phiOf(6) * 0.9);
    const h1 = H(-112, r * 1.14), h2 = H(-10, r * 1.06), h3 = H(150, r * 1.08), h4 = H(96, r * 0.62);
    oriPanel(g, [h1, h2, H(-60, r * 0.5), H(-150, r * 0.32), h4, h3, H(-160, r * 1.15)], h1, H(-150, r * 0.32), Cc.hair, phiOf(7) * 0.9);
    arm(J.arms[0], false);
  }
  /** latar kertas tanpa serpihan acak: gradien lembut + gunung kertas dua muka + tanah */
  function bgPaperKaku(g, W, H, gy, scroll) {
    const sk = g.createLinearGradient(0, 0, 0, gy); sk.addColorStop(0, "#f3e8d0"); sk.addColorStop(1, "#ead9b8"); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    const mt = (x0, w, hh, c1, c2) => { const x = ((x0 - scroll * 0.25) % (W + w * 2) + W + w * 2) % (W + w * 2) - w; g.fillStyle = c1; g.beginPath(); g.moveTo(x - w / 2, gy); g.lineTo(x, gy - hh); g.lineTo(x, gy); g.closePath(); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(x, gy - hh); g.lineTo(x + w / 2, gy); g.lineTo(x, gy); g.closePath(); g.fill(); g.strokeStyle = "rgba(255,248,232,.5)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, gy - hh); g.lineTo(x, gy); g.stroke(); };
    mt(W * 0.15, 220, gy * 0.62, "#a8c2b4", "#7fa192"); mt(W * 0.55, 300, gy * 0.8, "#b9cfc2", "#8fb3a6"); mt(W * 0.9, 200, gy * 0.55, "#a8c2b4", "#7fa192");
    g.fillStyle = "#c9935a"; g.fillRect(0, gy, W, H - gy); g.fillStyle = "#b07c48"; g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.lineTo(W, gy + 6); g.lineTo(0, gy + 14); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,240,215,.3)"; g.lineWidth = 1; for (let x = -(((scroll) % 48) + 48) % 48; x < W; x += 48) { g.beginPath(); g.moveTo(x, gy + 14); g.lineTo(x + 30, H); g.stroke(); }
  }

  /* ---------------- backdrops ---------------- */
  const bgVector = (g, W, H, gy, scroll) => {
    const sk = g.createLinearGradient(0, 0, 0, gy); sk.addColorStop(0, "#9fd0ea"); sk.addColorStop(1, "#f3e3c4"); g.fillStyle = sk; g.fillRect(0, 0, W, gy);
    g.fillStyle = "#fff6e4"; g.beginPath(); g.arc(W * 0.82, gy * 0.3, Math.min(W, H) * 0.07, 0, TAU); g.fill();
    for (const [k, col, amp, y0] of [[0.2, "#a9c98a", 0.16, 0.78], [0.45, "#7fae6a", 0.1, 0.9]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, gy); for (let x = 0; x <= W; x += 8) g.lineTo(x, gy * y0 - Math.sin((x + scroll * k) * 0.012) * gy * amp * 0.5 - Math.sin((x + scroll * k) * 0.031) * gy * amp * 0.3); g.lineTo(W, gy); g.fill(); }
    g.fillStyle = "#d7b98a"; g.fillRect(0, gy, W, H - gy); g.fillStyle = "#c49f6c"; for (let x = -(((scroll) % 60) + 60) % 60; x < W; x += 60) g.fillRect(x, gy + 10, 30, 4);
  };
  const bgPaper = (g, W, H, gy, scroll, seed) => {
    if (MGP.origamiFold && MGP.origamiFold.lib && MGP.origamiFold.lib.bgPaper) return MGP.origamiFold.lib.bgPaper(g, W, H, gy, scroll, seed);
    g.fillStyle = "#efe3c9"; g.fillRect(0, 0, W, H);
    const R = C.rng(seed == null ? 5 : seed); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,110,60,${0.03 + R() * 0.04})`; const x = R() * W, y = R() * gy, s = 20 + R() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.2, y + s); g.fill(); }
    const mt = (x0, w, h, c1, c2) => { const x = ((x0 - scroll * 0.25) % (W + w * 2) + W + w * 2) % (W + w * 2) - w; g.fillStyle = c1; g.beginPath(); g.moveTo(x - w / 2, gy); g.lineTo(x, gy - h); g.lineTo(x, gy); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(x, gy - h); g.lineTo(x + w / 2, gy); g.lineTo(x, gy); g.fill(); g.fillStyle = "#fbf6ea"; g.beginPath(); g.moveTo(x - w * 0.1, gy - h * 0.8); g.lineTo(x, gy - h); g.lineTo(x + w * 0.1, gy - h * 0.8); g.lineTo(x, gy - h * 0.86); g.fill(); };
    mt(W * 0.15, 220, gy * 0.62, "#8fb3a6", "#6d9387"); mt(W * 0.55, 300, gy * 0.8, "#a8c2b4", "#7fa192"); mt(W * 0.9, 200, gy * 0.55, "#8fb3a6", "#6d9387");
    g.fillStyle = "#c9935a"; g.fillRect(0, gy, W, H - gy); g.fillStyle = "#b07c48"; g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.lineTo(W, gy + 6); g.lineTo(0, gy + 14); g.fill();
    g.strokeStyle = "rgba(255,240,215,.35)"; g.lineWidth = 1; for (let x = -(((scroll) % 48) + 48) % 48; x < W; x += 48) { g.beginPath(); g.moveTo(x, gy + 14); g.lineTo(x + 30, H); g.stroke(); }
  };
  const PX = { sky: "#8fc3e6", sky2: "#b9dcef", sky3: "#e4eef0", cloud: "#fff7ea", cloudS: "#d9e6ee", hill: "#6fa35a", hillS: "#4e7f45", hillL: "#8cbc6c", gr: "#c59a63", grS: "#9a7448", grL: "#d9b27c", grass: "#79b35c", grassS: "#5a8f47" };
  const bgPixel = (lg, Wl, Hl, gyl, sc) => {
    lg.fillStyle = PX.sky; lg.fillRect(0, 0, Wl, Hl);
    // dithered bands instead of a gradient
    for (let y = Math.floor(gyl * 0.45); y < gyl; y++) for (let x = 0; x < Wl; x++) { const k = (y - gyl * 0.45) / (gyl * 0.55); if ((x + y) % 2 === 0 ? k > 0.25 : k > 0.55) { lg.fillStyle = k > 0.8 ? PX.sky3 : PX.sky2; lg.fillRect(x, y, 1, 1); } }
    const cl = (cx, cy) => { lg.fillStyle = PX.cloudS; lg.fillRect(cx + 1, cy + 3, 22, 2); lg.fillStyle = PX.cloud; lg.fillRect(cx, cy, 24, 4); lg.fillRect(cx + 4, cy - 3, 11, 3); lg.fillRect(cx + 13, cy - 2, 7, 2); };
    const wrap = (x) => ((x % (Wl + 40)) + Wl + 40) % (Wl + 40) - 20;
    cl(wrap(20 - Math.floor(sc * 0.1)), Math.floor(gyl * 0.22)); cl(wrap(Math.floor(Wl * 0.6) - Math.floor(sc * 0.1)), Math.floor(gyl * 0.12));
    for (let x = 0; x < Wl; x++) { const u = x + Math.floor(sc * 0.4), hh = Math.round(gyl * 0.24 + Math.sin(u * 0.05) * 5 + Math.sin(u * 0.13) * 2); lg.fillStyle = PX.hill; lg.fillRect(x, gyl - hh, 1, hh); lg.fillStyle = PX.hillL; lg.fillRect(x, gyl - hh, 1, 1); if (Math.floor(u / 4) % 6 === 0) { lg.fillStyle = PX.hillS; lg.fillRect(x, gyl - hh + 3, 1, hh - 3); } }
    lg.fillStyle = PX.grass; lg.fillRect(0, gyl, Wl, 3); lg.fillStyle = PX.grassS; lg.fillRect(0, gyl + 3, Wl, 1); lg.fillStyle = PX.gr; lg.fillRect(0, gyl + 4, Wl, Hl - gyl - 4);
    const o = Math.floor(sc); for (let x = -(((o % 12) + 12) % 12); x < Wl; x += 12) { lg.fillStyle = PX.grS; lg.fillRect(x, gyl + 7, 4, 1); lg.fillRect(x + 6, gyl + 12, 3, 1); lg.fillStyle = PX.grL; lg.fillRect(x + 2, gyl + 9, 2, 1); lg.fillStyle = PX.grassS; lg.fillRect(x + 3, gyl - 1, 1, 1); lg.fillRect(x + 9, gyl - 1, 1, 1); }
  };

  /* ---------------- module ---------------- */
  const api = C.defineModule("characterStyles", {
    aliases: { limbs: "anggota", origamiStyle: "origamiGaya", strokeFixed: "strokeTetap" },
    valueAliases: { anggota: { rigid: "kaku", rubber: "karet" }, origamiGaya: { rigid: "kaku", old: "lama" } },
    size: [1280, 720],
    duration: (o) => o.duration || 8,
    defaults: { style: "vector", action: "walk", palette: {}, pixelRamps: {}, scale: 0.66, x: null, ground: 0.84, fps: null, scroll: true, bg: "auto", grid: false,
      unfoldAt: 0, origamiGaya: "kaku", blink: true, lineWidth: 2.2, strokeTetap: null, anggota: "kaku", stepLabels: true, font: "ui-monospace, Menlo, Consolas, monospace", seed: 5, duration: 8 },
    setup(S) {
      const o = S.opts;
      S.col = colors(o.palette);
      S.ramps = pixelRamps(o.palette, o.pixelRamps);
      S.cache.sprites = new Map();
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, gy = H * o.ground, G = gait(), K = unitK(), SPEED = G.v * K;
      const style = o.style === "pixel" ? "pixel" : o.style === "origami" ? "origami" : "vector";
      let mode = o.action === "ex" ? (style === "vector" ? "wave" : style === "pixel" ? "sheet" : "crane") : o.action;
      if (mode === "crane" && !(MGP.origamiFold && MGP.origamiFold.lib)) mode = "idle";
      const custBg = o.bg && o.bg !== "auto";
      if (style === "pixel") {
        // one sprite pixel = ps screen pixels; the character is about 90 sprite pixels tall
        const ps = Math.max(2, Math.round(H * o.scale / 92)), Wl = Math.ceil(W / ps), Hl = Math.ceil(H / ps), gyl = Math.round(gy / ps), s = H * o.scale / ps / 100;
        if (!S.cache.low || S.cache.low.width !== Wl || S.cache.low.height !== Hl) { S.cache.low = C.offscreen(Wl, Hl); S.cache.sprites = new Map(); S.cache.sheet = null; }
        const low = S.cache.low, lg = low.getContext("2d");
        const fps = o.fps == null ? 8 : o.fps, nF = 8, fi = fps ? Math.floor(t * fps + 1e-6) : Math.floor(t * 8), fr = ((fi % nF) + nF) % nF, tq = fps ? fi / fps : t;
        const walking = mode === "walk" || mode === "sheet", sc = walking && o.scroll ? Math.round(tq * SPEED * s) : 0;
        lg.clearRect(0, 0, Wl, Hl);
        if (o.bg === "auto") bgPixel(lg, Wl, Hl, gyl, sc); else if (custBg) { lg.fillStyle = o.bg; lg.fillRect(0, 0, Wl, Hl); }
        const blink = o.blink && (((tq % 3.2) + 3.2) % 3.2) < 0.13;
        const ph = walking ? fr / nF : mode === "wave" ? (tq / 3.2) % 1 : (((fi % 2) + 2) % 2) * 0.25;
        const key = `${walking ? "walk" : mode}|${ph.toFixed(4)}|${blink}|${s.toFixed(3)}`;
        let sp = S.cache.sprites.get(key);
        if (!sp) { sp = gtPixelSprite(gtPose(walking ? "walk" : mode === "wave" ? "wave" : "idle", ph), s, blink, S.ramps); if (S.cache.sprites.size > 64) S.cache.sprites.clear(); S.cache.sprites.set(key, sp); }
        const cx = Math.round(Wl * (o.x != null ? o.x : mode === "sheet" ? 0.22 : 0.45));
        lg.fillStyle = "rgba(60,40,20,.35)"; lg.fillRect(cx - Math.round(14 * s), gyl, Math.round(30 * s), 1); lg.fillRect(cx - Math.round(10 * s), gyl + 1, Math.round(22 * s), 1);
        lg.drawImage(sp.c, cx - sp.ox, gyl - sp.oy);
        if (mode === "sheet") {
          // sprite sheet: the 8 walk frames side by side, the playing frame boxed
          const s2 = s * 0.5, fw = Math.ceil(46 * s2), rh = Math.ceil(110 * s2), fx0 = Math.round(Wl * 0.42);
          const cols = Math.max(2, Math.min(8, Math.floor((Wl - fx0 - 3) / fw))), rows = Math.ceil(nF / cols), fy = Math.max(2, Math.round((gyl - rows * rh) / 2));
          lg.fillStyle = "rgba(20,14,40,.6)"; lg.fillRect(fx0 - 2, fy - 2, cols * fw + 3, rows * rh + 3);
          if (!S.cache.sheet) S.cache.sheet = Array.from({ length: nF }, (_, i) => gtPixelSprite(gtPose("walk", i / nF), s2, false, S.ramps));
          for (let i = 0; i < nF; i++) { const s3 = S.cache.sheet[i], x = fx0 + (i % cols) * fw, y = fy + Math.floor(i / cols) * rh; lg.drawImage(s3.c, x + Math.round(fw * 0.42) - s3.ox, y + rh - 2 - s3.oy); if (i === fr) { lg.fillStyle = "#ffd36b"; lg.fillRect(x - 1, y - 1, fw, 1); lg.fillRect(x - 1, y + rh - 1, fw, 1); lg.fillRect(x - 1, y - 1, 1, rh); lg.fillRect(x + fw - 2, y - 1, 1, rh); } }
        }
        g.imageSmoothingEnabled = false; g.drawImage(low, 0, 0, Wl * ps, Hl * ps); g.imageSmoothingEnabled = true;
        if (o.grid) { g.strokeStyle = "rgba(20,14,40,.18)"; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x += ps) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = 0; y <= H; y += ps) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke(); }
        return;
      }
      if (style === "origami" && mode === "crane") {
        const OL = MGP.origamiFold.lib;
        if (o.bg === "auto") bgPaper(g, W, H, gy, 0, o.seed); else if (custBg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
        const tim = { stepFold: 0.95, stepHold: 0.35, endHold: 2.4, unfold: true, unfoldStep: 0.32, endGap: 0.6, loop: true };
        const [i, u] = OL.stepAt(t, OL.CRANE, tim), R = Math.min(W * 0.3, H * 0.36);
        OL.drawCrane(g, i, u, W * (o.x != null ? o.x : 0.5), gy - R * 1.02, R, o.grid);
        if (o.stepLabels) { const fs = Math.max(10, Math.round(H / 44)); g.font = `500 ${fs}px ${o.font}`; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#5b3a1e"; g.fillText(`${i + 1} \u00b7 ${OL.CRANE.STEPS[i].n}`.toUpperCase(), 14, H - 14); }
        return;
      }
      const walking = mode === "walk", fps = o.fps == null ? (style === "origami" ? 12 : 24) : o.fps, tq = fps ? Math.floor(t * fps + 1e-6) / fps : t;
      const k = (H * o.scale) / 100, cx = W * (o.x != null ? o.x : 0.47), scroll = walking && o.scroll ? tq * SPEED * k : 0;
      const oriLama = o.origamiGaya === "lama";
      if (o.bg === "auto") { if (style === "origami") { if (oriLama) bgPaper(g, W, H, gy, scroll, o.seed); else bgPaperKaku(g, W, H, gy, scroll); } else bgVector(g, W, H, gy, scroll); }
      else if (custBg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
      const pm = mode === "wave" || mode === "idle" ? mode : "walk";
      const J = gtPose(pm, walking ? (tq / G.g.T) % 1 : (tq / 3.2) % 1), blink = o.blink && (((tq % 3.4) + 3.4) % 3.4) < 0.11;
      g.fillStyle = style === "origami" ? "rgba(80,50,20,.25)" : "rgba(60,40,30,.22)"; g.beginPath(); g.ellipse(cx + 2 * k, gy + 1, 17 * k, 2.6 * k, 0, 0, TAU); g.fill();
      g.save(); g.translate(cx, gy); g.scale(k, k);
      // strokeTetap (px): garis tinta tetap setebal itu di layar berapa pun skala tokohnya (padanan non-scaling-stroke)
      const lwI = o.strokeTetap ? C.lebarTetap(g, o.strokeTetap, g.canvas && W ? g.canvas.width / W : 1) : o.lineWidth;
      if (style === "vector") { gtVector(g, J, { blink, lwI, col: S.col, karet: o.anggota === "karet" }); S.J = J; }
      else {
        const foldT = o.unfoldAt == null ? 9 : t - o.unfoldAt; // the unfold runs continuously (not stepped), as on the website
        if (oriLama) gtPaperDraw(g, gtPaper(J, S.col), foldT, o.grid); else gtOrigamiKaku(g, J, S.col, foldT, o.grid);
        if (foldT > 2) {
          const [hx, hy] = J.head; g.fillStyle = S.col.ink; g.beginPath(); g.moveTo(hx + 5.5, hy - 1.8); g.lineTo(hx + 8, hy - 0.2); g.lineTo(hx + 5.5, hy + (blink ? -1.2 : 1.6)); g.fill();
          g.fillStyle = rgba(S.col.blush, 0.6); g.beginPath(); g.moveTo(hx + 4, hy + 4); g.lineTo(hx + 8, hy + 3.5); g.lineTo(hx + 6, hy + 6); g.fill();
        }
      }
      g.restore();
    },
  });
  api.lib = {
    pose: gtPose, drawVector: gtVector, drawHead: gtHead, pixelSprite: gtPixelSprite, paperPieces: gtPaper, paperDraw: gtPaperDraw,
    drawOrigami: gtOrigamiKaku, origamiStrip: oriStrip, origamiPanel: oriPanel, bgPaperKaku,
    bgVector, bgPaper, bgPixel, colors, pixelRamps, hingePt, gait, COL, PIXEL_MAT, get K() { return unitK(); },
  };
  MGP.characterStyles = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
