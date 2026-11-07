/**
 * MGP.chibiObject \u2014 a personified object ("benda berwajah"): any object with a chibi face, moods, blink,
 * squash-and-stretch takes, jumps, stubby arms, steam and little emotes. Deterministic, time-driven canvas module.
 *
 * Extracted from the website demo `mood(el)` in guide/js/demos.js (section 5 \u00b7 PERSONIFIED OBJECT): the chibi paper
 * coffee cup on a cosy cafe table. The SVG scene was ported to canvas (Path2D with the demo's own path data); the
 * click-driven state machine was converted to closed-form functions of t (mood keyframes, jump times, blink schedule,
 * lagged arms and steam re-integrated from 0 with a fixed step).
 *
 * Coordinates: the scene uses the demo's viewBox (-320 -240 640 300, "slice" fit). The object is placed at scene point
 * (x, y) = where it touches the ground, scaled by `scale`. Object-local units: origin at the ground contact point,
 * y negative upwards; the built-in cup is ~146 wide and ~139 tall.
 *
 * Options (defaults):
 *   body      "cup"        built-in: "cup" | "box" | "phone" | "pot" | "ball", or a function (ctx, S, st) => draw the object in
 *                          local units, or an object { draw(ctx,S,st), face, arms, top, shadow, feet, steam, armColor, armLine }
 *   image     null         HTMLImageElement/canvas used as the body instead (drawn in `imageBox`)
 *   imageBox  null         [x, y, w, h] in local units (default: 130 wide, bottom on the ground, centred)
 *   face      null         face anchor override { x, y, scale, tilt (deg) } in local units (the face is ~100 wide at scale 1)
 *   arms      null         arm anchors override: [[xL, yL], [xR, yR]] (local units) or false for no arms
 *   mood      "normal"     initial mood; moods: normal | senang | sedih | kaget | marah (+ any in `faces`)
 *   moods     null         mood keyframes [[t, "senang"], [2.5, "kaget"], ...]; the new face lands at t (a "take": eyes
 *                          lead, anticipation squash in the 0.42 s before, then a damped bounce)
 *   faces     {}           extra/override mood definitions (same shape as MGP.chibiObject.lib.FACES entries)
 *   take      true         squash/eyes-lead/bounce around each mood change
 *   blend     0.17         seconds of in-between blending of the face parameters across a change (0 = hard swap like the demo)
 *   jumps     []           times (s) of jumps (anticipation, 78-unit hop, landing settle)
 *   fps       12           drawings per second (on twos); 0 = smooth
 *   steam     null         null = body default (cup only); true/false
 *   emote     true         heart / drop / bang / anger emote that pops in after the new face
 *   blink     true         deterministic blink schedule (first at 2.5 s, then every 2-5 s, seeded)
 *   breathe   0            small idle squash amplitude (e.g. 0.012)
 *   wobble    1            multiplier on the idle arm wave/shake
 *   scene     "cafe"       "cafe" (demo scene) | "plain" (gradient + floor) | "none" (transparent) | function (ctx, S) in scene units
 *   bg        ["#3a3350", "#56496c"]  plain scene wall gradient;  floor "#8a5a35"
 *   x 0, y 18, scale 0.86  placement in scene units
 *   view [-320,-240,640,300], sceneFit "slice" | "contain"   scene viewBox and how it fits the canvas
 *   palette   { ink:"#1b130a", brow:"#3b2a14", mouth:"#5a1f14", cheek:"#f29c8f", blush:"#e98476" }
 *   font      "italic 8px Georgia, serif"   the tiny "menu" card in the cafe scene
 *   duration  null         default: last mood key / jump + 2.5 s (min 6)
 *   seed      11
 *
 * Methods: MGP.chibiObject.create(canvasOrEl, opts) -> instance (draw/seek/timeline), .render(ctx, t, opts)
 *   lib: { FACES, BODIES, EMO, drawFace(ctx, params, palette), faceAt(S, t), stateAt(S, t), drawCafe(ctx, font) }
 *
 * Example:
 *   const cup = MGP.chibiObject.create("#stage", { moods: [[0, "normal"], [2, "senang"], [4.5, "kaget"]], jumps: [6.5] });
 *   MGP.core.expose(cup);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const sm = C.smooth01;

  /* ---------- Path2D cache ---------- */
  const PC = {};
  const P = (d) => PC[d] || (PC[d] = new Path2D(d));
  const lg = (g, x0, x1, stops, y0 = 0, y1 = 0) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  const fillP = (g, d, f, a = 1) => { g.globalAlpha = a; g.fillStyle = f; g.fill(P(d)); g.globalAlpha = 1; };
  const strokeP = (g, d, s, w, a = 1) => { g.globalAlpha = a; g.strokeStyle = s; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(P(d)); g.globalAlpha = 1; };
  const ell = (g, x, y, rx, ry, f, a = 1) => { g.globalAlpha = a; g.fillStyle = f; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.globalAlpha = 1; };
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); } };
  // paper-collage "cut" piece: hard offset shadow, then the piece
  const cut = (g, d, fill, sh = 0.3, dx = 3, dy = 4) => { g.save(); g.translate(dx, dy); fillP(g, d, `rgba(20,8,14,${sh})`); g.restore(); fillP(g, d, fill); };

  /* ---------- moods (face-local units: face centre = demo cup point (0,-45)) ---------- */
  // brow: left brow [x0,y0, cx,cy, x1,y1] (quadratic; the right one is mirrored)
  // mouth: {hw, y, lo, lc, up, uc, fill}: M(-hw,y) C(-hw*lc,y+lo)(hw*lc,y+lo)(hw,y) C(hw*uc,y+up)(-hw*uc,y+up)(-hw,y) Z
  const FACES = {
    normal: { brow: [-31, -22, -24, -25, -16, -22], mouth: { hw: 8, y: 14, lo: 4, lc: 1 / 3, up: 4, uc: 1 / 3, fill: 0 }, eye: 1, steam: 1, arm: 18, emo: "", wig: [2, 4] },
    senang: { brow: [-31, -26, -24, -32, -16, -26], mouth: { hw: 12, y: 11, lo: 38 / 3, lc: 1 / 3, up: 0, uc: 1 / 3, fill: 1 }, eye: 0.55, steam: 1.25, arm: 128, emo: "heart", wig: [9, 14], wave: 1 },
    sedih: { brow: [-31, -17, -23.5, -20.5, -16, -24], mouth: { hw: 9, y: 20, lo: -16 / 3, lc: 1 / 3, up: -16 / 3, uc: 1 / 3, fill: 0 }, eye: 0.85, steam: 0.4, arm: -12, emo: "drop", wig: [0, 0], sad: 1 },
    kaget: { brow: [-31, -32, -24, -37, -16, -32], mouth: { hw: 6, y: 14, lo: 10, lc: 1, up: -10, uc: 1, fill: 1 }, eye: 1.2, steam: 1.7, arm: 140, emo: "bang", wig: [0, 0] },
    marah: { brow: [-31, -28, -23, -23.5, -15, -19], mouth: { hw: 10, y: 18, lo: -14 / 3, lc: 1 / 3, up: -14 / 3, uc: 1 / 3, fill: 0 }, eye: 0.8, steam: 2.4, arm: 70, emo: "anger", wig: [26, 7], hot: 1 },
  };
  const STEAM_COL = { normal: [255, 250, 235, 0.62], marah: [255, 190, 175, 0.8], sedih: [200, 215, 240, 0.5] };
  const EMO = {
    heart: (g) => { fillP(g, "M0 6 c-6 -5 -11 -8 -11 -13 a5.5 5.5 0 0 1 11 -2 a5.5 5.5 0 0 1 11 2 c0 5 -5 8 -11 13 Z", "#ff7f8e"); strokeP(g, "M0 6 c-6 -5 -11 -8 -11 -13 a5.5 5.5 0 0 1 11 -2 a5.5 5.5 0 0 1 11 2 c0 5 -5 8 -11 13 Z", "#7a2a3a", 1.5);
      fillP(g, "M26 -10 c-3.5 -3 -6.5 -4.6 -6.5 -7.6 a3.2 3.2 0 0 1 6.5 -1.2 a3.2 3.2 0 0 1 6.5 1.2 c0 3 -3 4.6 -6.5 7.6 Z", "#ffb0b8"); strokeP(g, "M26 -10 c-3.5 -3 -6.5 -4.6 -6.5 -7.6 a3.2 3.2 0 0 1 6.5 -1.2 a3.2 3.2 0 0 1 6.5 1.2 c0 3 -3 4.6 -6.5 7.6 Z", "#7a2a3a", 1.2); },
    drop: (g) => { const a = "M30 -16 q7 10 7 15 a7 7 0 0 1 -14 0 q0 -5 7 -15 Z", b = "M-10 -6 q-18 0 -18 -10 q0 -9 11 -9 q4 -9 15 -7 q10 -5 16 4 q10 1 8 10 q-1 8 -14 8 Z";
      fillP(g, a, "#8fc8ff"); strokeP(g, a, "#2b4a78", 1.5); fillP(g, b, "#9aa7c4", 0.9); strokeP(g, b, "#3b4566", 1.5, 0.9); },
    bang: (g) => { ["M-30 -20 l6 -2 l2 22 l-4 1 Z", "M28 -22 l6 1 l-3 22 l-4 -1 Z"].forEach((d) => { fillP(g, d, "#ffd36b"); strokeP(g, d, "#6b4a12", 1.5); });
      [[-24, 7], [29, 6]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fillStyle = "#ffd36b"; g.fill(); g.strokeStyle = "#6b4a12"; g.lineWidth = 1.5; g.stroke(); }); },
    anger: (g) => { g.save(); g.translate(34, -6); strokeP(g, "M-9 -3 q4 -1 5 -6 M3 -9 q1 4 6 5 M9 3 q-4 1 -5 6 M-3 9 q-1 -4 -6 -5", "#e8463a", 3.2); g.restore(); },
  };

  /* ---------- built-in bodies (local units, origin = ground contact) ---------- */
  const drawFeet = (g, dx, y, out, fill, rx = 13) => { [-dx, dx].forEach((x) => { ell(g, x, y, rx, rx * 0.46, out); ell(g, x, y - 1.5, rx * 0.85, rx * 0.32, fill); }); };
  const BODIES = {
    cup: {
      face: { x: 0, y: -63, scale: 1, tilt: 0 }, arms: [[-61, -58], [61, -58]], top: -139, shadow: 58, steam: true,
      armLine: "#8f8066", armColor: ["#fbf5e8", "#f0e7d6"],
      draw(g) {
        g.save(); g.translate(0, -18); // demo coordinates (cup sits on y = 18)
        drawFeet(g, 22, 17, "#8f8066", "#d8ccb4");
        const cupD = "M-64 -84 L64 -84 C63 -50 56 -6 47 9 Q43 15 34 15 L-34 15 Q-43 15 -47 9 C-56 -6 -63 -50 -64 -84 Z";
        fillP(g, cupD, lg(g, -64, 64, [[0, "#e2d8c4"], [0.3, "#fffaf0"], [0.65, "#f5eee0"], [1, "#cdbfa6"]])); strokeP(g, cupD, "#8f8066", 1.8);
        strokeP(g, "M-52 -76 C-53 -48 -50 -22 -42 -4", "rgba(255,255,255,.6)", 6);
        const slv = "M-57.5 -18 L57.5 -18 C54 -3 50 4 47 9 Q43 15 34 15 L-34 15 Q-43 15 -47 9 C-50 4 -54 -3 -57.5 -18 Z";
        fillP(g, slv, lg(g, -57.5, 57.5, [[0, "#9e6a3c"], [0.35, "#d39a60"], [0.7, "#c2884f"], [1, "#8d5d33"]])); strokeP(g, slv, "#7a5230", 1.2);
        g.setLineDash([3, 4]); strokeP(g, "M-55 -13 L55 -13", "rgba(255,236,200,.4)", 1.2); g.setLineDash([]);
        fillP(g, "M0 9 c-5 -4 -9 -6.5 -9 -10 a4.5 4.5 0 0 1 9 -1.5 a4.5 4.5 0 0 1 9 1.5 c0 3.5 -4 6 -9 10 Z", "#fbf1dc", 0.92);
        const lid = (x0, x1) => lg(g, x0, x1, [[0, "#cfc6b3"], [0.35, "#fbf7ee"], [1, "#bfb49e"]]);
        const l1 = "M-61 -97 Q-57 -111 -40 -112 L40 -112 Q57 -111 61 -97 Z", l2 = "M-30 -111 Q-28 -121 -18 -121 L18 -121 Q28 -121 30 -111 Z";
        fillP(g, l1, lid(-61, 61)); strokeP(g, l1, "#8f8066", 1.5); fillP(g, l2, lid(-30, 30)); strokeP(g, l2, "#8f8066", 1.5);
        ell(g, 11, -117, 7, 2, "#5e4c36");
        rrect(g, -73, -99, 146, 17, 8.5); g.fillStyle = lid(-73, 73); g.fill(); g.strokeStyle = "#8f8066"; g.lineWidth = 1.5; g.stroke();
        strokeP(g, "M-66 -94 L66 -94", "rgba(255,255,255,.55)", 2);
        g.restore();
      },
    },
    box: {
      face: { x: -4, y: -52, scale: 0.9, tilt: 0 }, arms: [[-62, -50], [54, -50]], top: -114, shadow: 66, steam: false,
      armLine: "#6b4a2a", armColor: ["#e0b47e", "#d2a26b"],
      draw(g) {
        drawFeet(g, 26, -1, "#6b4a2a", "#c08a55", 12);
        const side = "M54 -100 L66 -112 L66 -14 L54 -2 Z", top = "M-62 -100 L-50 -112 L66 -112 L54 -100 Z", front = "M-62 -100 L54 -100 L54 -2 L-62 -2 Z";
        fillP(g, side, "#9a6a3a"); strokeP(g, side, "#6b4a2a", 1.8);
        fillP(g, top, lg(g, -62, 66, [[0, "#e7c28f"], [1, "#d6a86f"]])); strokeP(g, top, "#6b4a2a", 1.8);
        fillP(g, front, lg(g, -62, 54, [[0, "#b98451"], [0.3, "#dcac72"], [0.7, "#cf9b60"], [1, "#a8743f"]])); strokeP(g, front, "#6b4a2a", 1.8);
        fillP(g, "M-4 -112 L10 -112 L-2 -100 L-16 -100 Z", "#efe0b8", 0.95);
        fillP(g, "M-16 -100 L-2 -100 L-2 -84 L-16 -84 Z", "#efe0b8", 0.95);
        strokeP(g, "M-58 -96 L-58 -8", "rgba(255,240,210,.35)", 4);
        strokeP(g, "M-48 -12 L-48 -26 M-52 -22 L-48 -27 L-44 -22 M-38 -12 L-38 -26 M-42 -22 L-38 -27 L-34 -22", "#6b4a2a", 1.8, 0.7);
        g.fillStyle = "rgba(255,250,240,.85)"; g.fillRect(24, -30, 24, 16); strokeP(g, "M28 -25 L44 -25 M28 -19 L40 -19", "#9b7a55", 1.6);
      },
    },
    phone: {
      face: { x: 0, y: -80, scale: 0.82, tilt: 0 }, arms: [[-40, -76], [40, -76]], top: -152, shadow: 46, steam: false,
      armLine: "#151925", armColor: ["#4a5370", "#3e4660"],
      draw(g) {
        drawFeet(g, 18, -1, "#151925", "#3e4660", 10);
        rrect(g, -40, -152, 80, 148, 16); g.fillStyle = lg(g, -40, 40, [[0, "#232838"], [0.4, "#3a4258"], [1, "#1c2130"]]); g.fill(); g.strokeStyle = "#11141d"; g.lineWidth = 2; g.stroke();
        rrect(g, -33, -142, 66, 126, 10); g.fillStyle = lg(g, 0, 0, [[0, "#d4f0fa"], [0.6, "#a6d8ee"], [1, "#86c2e2"]], -142, -16); g.fill();
        ell(g, 0, -147, 2.2, 2.2, "#0d0f16");
        strokeP(g, "M-12 -22 L12 -22", "rgba(255,255,255,.75)", 2.4);
        g.fillStyle = "rgba(40,60,90,.45)"; g.fillRect(-27, -137, 10, 3); g.fillRect(17, -137, 10, 3);
        strokeP(g, "M-30 -138 L-12 -138", "rgba(255,255,255,.0)", 1);
        fillP(g, "M-33 -132 L-14 -142 L-4 -142 L-33 -118 Z", "rgba(255,255,255,.25)");
      },
    },
    pot: {
      face: { x: 0, y: -36, scale: 0.72, tilt: 0 }, arms: [[-40, -40], [40, -40]], top: -168, shadow: 46, steam: false,
      armLine: "#7a3a1e", armColor: ["#e69468", "#d98457"],
      draw(g) {
        drawFeet(g, 20, -1, "#7a3a1e", "#c06a40", 10);
        g.save(); g.translate(0, -82); g.scale(1.6, 1.6); g.translate(176, 6);
        cut(g, "M-176 -6 Q-198 -26 -196 -44 Q-180 -30 -176 -6 Z M-176 -6 Q-170 -38 -152 -48 Q-154 -24 -176 -6 Z M-176 -6 Q-182 -40 -174 -58 Q-164 -38 -176 -6 Z", "#6ea35c", 0.22);
        strokeP(g, "M-176 -8 Q-178 -30 -174 -52", "rgba(255,255,255,.25)", 1.2);
        g.restore();
        const pot = "M-40 -70 L40 -70 L32 -5 Q31 0 26 0 L-26 0 Q-31 0 -32 -5 Z";
        fillP(g, pot, lg(g, -40, 40, [[0, "#b9603a"], [0.3, "#e8936a"], [0.65, "#d77c4f"], [1, "#a9552f"]])); strokeP(g, pot, "#7a3a1e", 1.8);
        rrect(g, -48, -84, 96, 16, 5); g.fillStyle = lg(g, -48, 48, [[0, "#b25f37"], [0.35, "#dd8a5e"], [1, "#a5502c"]]); g.fill(); g.strokeStyle = "#7a3a1e"; g.lineWidth = 1.8; g.stroke();
        strokeP(g, "M-42 -79 L42 -79", "rgba(255,230,200,.45)", 2);
        strokeP(g, "M-33 -62 C-33 -40 -30 -22 -26 -10", "rgba(255,255,255,.28)", 5);
      },
    },
    ball: {
      face: { x: 0, y: -50, scale: 0.86, tilt: 0 }, arms: [[-54, -58], [54, -58]], top: -112, shadow: 50, steam: false,
      armLine: "#8a2f1f", armColor: ["#ffa48a", "#f2927a"],
      draw(g) {
        const gr = g.createRadialGradient(-18, -78, 6, 0, -56, 60); gr.addColorStop(0, "#ffc2a8"); gr.addColorStop(0.45, "#ff8061"); gr.addColorStop(1, "#d24f36");
        g.beginPath(); g.arc(0, -56, 56, 0, TAU); g.fillStyle = gr; g.fill();
        g.save(); g.clip(); strokeP(g, "M-62 -84 Q0 -116 62 -84", "#fff1df", 9); strokeP(g, "M-62 -20 Q0 6 62 -20", "#fff1df", 9); g.restore();
        g.beginPath(); g.arc(0, -56, 56, 0, TAU); g.strokeStyle = "#8a2f1f"; g.lineWidth = 1.8; g.stroke();
        strokeP(g, "M-40 -82 Q-34 -94 -20 -100", "rgba(255,255,255,.55)", 5);
      },
    },
  };

  /* ---------- face ---------- */
  const DEF_PAL = { ink: "#1b130a", brow: "#3b2a14", mouth: "#5a1f14", cheek: "#f29c8f", blush: "#e98476" };
  function drawFace(g, f, pal) {
    pal = Object.assign({}, DEF_PAL, pal || {});
    ell(g, -38, 8, 10, 6.5, pal.cheek, 0.55); ell(g, 38, 8, 10, 6.5, pal.cheek, 0.55);
    strokeP(g, "M-44 5 l4 -3 M-38 5 l4 -3 M38 5 l4 -3 M44 5 l4 -3", pal.blush, 1.4, 0.7);
    // brows
    const b = f.brow; g.strokeStyle = pal.brow; g.lineWidth = 4.5; g.lineCap = "round"; g.beginPath();
    g.moveTo(b[0], b[1]); g.quadraticCurveTo(b[2], b[3], b[4], b[5]); g.moveTo(-b[4], b[5]); g.quadraticCurveTo(-b[2], b[3], -b[0], b[1]); g.stroke();
    // eyes
    g.save(); g.translate(f.eyeX || 0, f.eyeY || 0);
    const ry = f.blink ? 1.4 : 13 * f.eye;
    ell(g, -23, -3, 10, ry, pal.ink); ell(g, 23, -3, 10, ry, pal.ink);
    if (f.glint > 0) { g.globalAlpha = f.glint; g.fillStyle = "#fff"; [[-19, -8, 3.6], [27, -8, 3.6]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
      g.globalAlpha = f.glint * 0.85; [[-26, 2], [20, 2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }); g.globalAlpha = 1; }
    g.restore();
    // mouth
    const m = f.mouth; g.beginPath(); g.moveTo(-m.hw, m.y);
    g.bezierCurveTo(-m.hw * m.lc, m.y + m.lo, m.hw * m.lc, m.y + m.lo, m.hw, m.y);
    g.bezierCurveTo(m.hw * m.uc, m.y + m.up, -m.hw * m.uc, m.y + m.up, -m.hw, m.y); g.closePath();
    if (m.fill > 0.01) { g.globalAlpha = Math.min(1, m.fill); g.fillStyle = pal.mouth; g.fill(); g.globalAlpha = 1; }
    g.strokeStyle = pal.brow; g.lineWidth = 3.5; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
  }

  /* ---------- cafe scene (demo SVG ported to canvas, demo viewBox units) ---------- */
  function drawCafe(g, font) {
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const torn = (x0, x1, y, amp, step = 9) => { let d = `M${x0} ${y}`; for (let x = x0 + step; x < x1; x += step) d += ` L${x.toFixed(1)} ${(y + (rnd() - 0.5) * amp).toFixed(1)}`; return d + ` L${x1} ${y}`; };
    const bok = []; for (let i = 0; i < 26; i++) { const x = -205 + rnd() * 300, y = -195 + rnd() * 160, r = 5 + rnd() * 15, c = ["#ffcf7a", "#ffb36b", "#ff8f6b", "#8fd3ff", "#ffe6a8", "#c9a4ff"][i % 6]; bok.push([x, y, r, c, 0.18 + rnd() * 0.35]); }
    const rain = []; for (let i = 0; i < 18; i++) rain.push([-200 + rnd() * 290, -195 + rnd() * 150]);
    const wainTop = torn(-320, 320, -26, 5), wainLine = torn(-320, 320, -14, 3, 12);
    g.fillStyle = lg(g, 0, 0, [[0, "#2c1d2a"], [0.7, "#3d2830"], [1, "#4a2f33"]], -240, 80); g.fillRect(-320, -240, 640, 320);
    g.globalAlpha = 0.5;
    for (let y = -240; y < 80; y += 14) for (let x = -320; x < 320; x += 14) { ell(g, x + 3, y + 4, 0.9, 0.9, "rgba(255,230,200,.18)"); ell(g, x + 10, y + 11, 0.7, 0.7, "rgba(0,0,0,.25)"); }
    g.globalAlpha = 1;
    cut(g, "M-228 -214 L118 -214 L118 -30 L-228 -30 Z", "#6b4630", 0.35, 4, 5);
    g.fillStyle = lg(g, 0, 0, [[0, "#111a3a"], [0.65, "#2b3566"], [1, "#5a4a78"]], -204, -38); g.fillRect(-218, -204, 326, 166);
    g.save(); g.beginPath(); g.rect(-218, -204, 326, 166); g.clip();
    fillP(g, "M-218 -92 L-176 -104 L-176 -122 L-150 -122 L-150 -98 L-118 -110 L-118 -134 L-84 -134 L-84 -104 L-40 -116 L-40 -96 L-6 -104 L-6 -128 L30 -128 L30 -100 L70 -112 L108 -100 L108 -38 L-218 -38 Z", "#1a2140", 0.9);
    [[-170, -116], [-160, -112], [-108, -126], [-96, -120], [-74, -126], [12, -120], [22, -114], [-28, -108]].forEach(([x, y]) => { g.globalAlpha = 0.85 * 0.7; g.fillStyle = "#ffd98a"; g.fillRect(x, y, 5, 6); });
    g.globalAlpha = 1;
    g.restore();
    // bokeh (soft): blurred discs; the demo lets them spill past the window frame slightly
    const sc = Math.hypot(g.getTransform().a, g.getTransform().b) || 1;
    g.save(); g.filter = `blur(${(3 * sc).toFixed(2)}px)`;
    bok.forEach(([x, y, r, c, a]) => ell(g, x, y, r, r, c, a));
    g.restore(); g.filter = "none";
    g.strokeStyle = "rgba(220,235,255,.28)"; g.lineWidth = 1.4; g.lineCap = "round"; g.beginPath(); rain.forEach(([x, y]) => { g.moveTo(x, y); g.lineTo(x - 2, y + 9); }); g.stroke();
    g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(-218, -204, 326, 8);
    fillP(g, "M-210 -200 L-150 -200 L-206 -60 Z", "rgba(255,255,255,.05)");
    g.fillStyle = "#6b4630"; g.fillRect(-60, -204, 9, 166); g.fillRect(-218, -124, 326, 8);
    const val = "M-236 -222 L126 -222 L126 -200 Q117 -190 108 -200 Q99 -190 90 -200 Q81 -190 72 -200 Q63 -190 54 -200 Q45 -190 36 -200 Q27 -190 18 -200 Q9 -190 0 -200 Q-9 -190 -18 -200 Q-27 -190 -36 -200 Q-45 -190 -54 -200 Q-63 -190 -72 -200 Q-81 -190 -90 -200 Q-99 -190 -108 -200 Q-117 -190 -126 -200 Q-135 -190 -144 -200 Q-153 -190 -162 -200 Q-171 -190 -180 -200 Q-189 -190 -198 -200 Q-207 -190 -216 -200 Q-226 -190 -236 -200 Z";
    cut(g, val, "#d9a441", 0.3);
    g.setLineDash([4, 5]); strokeP(g, "M-236 -214 L126 -214", "rgba(255,240,200,.45)", 1.5); g.setLineDash([]); g.lineCap = "round";
    // lamp
    const gl = g.createRadialGradient(206, -168, 0, 206, -168, 96); gl.addColorStop(0, "rgba(255,214,140,.55)"); gl.addColorStop(0.45, "rgba(255,190,110,.16)"); gl.addColorStop(1, "rgba(255,190,110,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(206, -168, 96, 0, TAU); g.fill();
    g.lineCap = "butt"; strokeP(g, "M206 -240 L206 -206", "#1b1216", 2);
    cut(g, "M190 -206 L222 -206 L238 -178 L174 -178 Z", "#2f6b62", 0.32);
    g.lineCap = "butt"; g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 3; g.beginPath(); g.moveTo(180, -182); g.lineTo(232, -182); g.stroke();
    ell(g, 206, -176, 13, 5.5, "#ffe7a6");
    // shelf
    cut(g, "M148 -96 L300 -96 L300 -86 L148 -86 Z", "#7a5136", 0.32);
    cut(g, "M160 -96 L160 -122 Q160 -128 166 -128 L182 -128 Q188 -128 188 -122 L188 -96 Z", "#c9e0d6", 0.25);
    g.strokeStyle = "rgba(60,90,80,.35)"; g.lineWidth = 5; g.lineCap = "butt"; g.beginPath(); g.moveTo(164, -118); g.lineTo(184, -118); g.stroke();
    cut(g, "M200 -96 L204 -116 L228 -116 L232 -96 Z", "#c8673f", 0.28);
    cut(g, "M216 -116 Q204 -140 210 -152 Q220 -138 216 -116 Z M216 -116 Q226 -146 240 -150 Q236 -132 216 -116 Z M216 -116 Q196 -128 190 -140 Q206 -138 216 -116 Z", "#5f8f52", 0.25);
    cut(g, "M246 -96 L246 -134 L276 -134 L276 -96 Z", "#efe2c4", 0.25);
    g.strokeStyle = "#b9a37a"; g.lineWidth = 2; g.beginPath(); [[-126, 22], [-118, 18], [-110, 20]].forEach(([y, w]) => { g.moveTo(250, y); g.lineTo(250 + w, y); }); g.stroke();
    // wainscot + table
    cut(g, wainTop + " L320 2 L-320 2 Z", "#5a3a3e", 0.3, 0, -3);
    g.lineCap = "round"; g.strokeStyle = "rgba(255,230,200,.12)"; g.lineWidth = 1.5; g.stroke(P(wainLine));
    cut(g, "M-320 2 L320 2 L320 34 L-320 34 Z", lg(g, 0, 0, [[0, "#b27a4b"], [1, "#8a5a35"]], 2, 34), 0.35, 0, -4);
    strokeP(g, "M-300 12 Q-200 8 -90 13 T120 12 T300 10", "rgba(60,30,14,.35)", 1.3); strokeP(g, "M-310 24 Q-180 20 -40 25 T200 22 T310 24", "rgba(60,30,14,.35)", 1.3);
    cut(g, "M-320 34 L320 34 L320 80 L-320 80 Z", "#4a2c1a", 0.25, 0, -3);
    g.lineCap = "butt"; g.strokeStyle = "rgba(255,214,160,.28)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-320, 34); g.lineTo(320, 34); g.stroke();
    // plant
    ell(g, -176, 20, 24, 5, "rgba(20,8,14,.35)");
    cut(g, "M-194 18 L-198 -6 L-154 -6 L-158 18 Z", "#d77c4f", 0.28);
    fillP(g, "M-199 -6 L-153 -6 L-153 0 L-199 0 Z", "#c06a40");
    cut(g, "M-176 -6 Q-198 -26 -196 -44 Q-180 -30 -176 -6 Z M-176 -6 Q-170 -38 -152 -48 Q-154 -24 -176 -6 Z M-176 -6 Q-182 -40 -174 -58 Q-164 -38 -176 -6 Z", "#6ea35c", 0.22);
    strokeP(g, "M-176 -8 Q-178 -30 -174 -52", "rgba(255,255,255,.25)", 1.2);
    // menu card
    cut(g, "M128 18 L142 -26 L170 -26 L184 18 Z", "#f3e6c8", 0.3);
    g.lineCap = "butt"; g.strokeStyle = "#b08d5a"; g.lineWidth = 2; g.beginPath(); [[145, -14, 167], [143, -6, 169], [141, 2, 171]].forEach(([a, y, b]) => { g.moveTo(a, y); g.lineTo(b, y); }); g.stroke();
    g.fillStyle = "#7a4e2c"; g.font = font || "italic 8px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillText("menu", 156, -17); g.textAlign = "start";
    // sugar jar
    ell(g, 218, 20, 20, 4.5, "rgba(20,8,14,.3)");
    cut(g, "M204 18 L202 -8 Q218 -14 234 -8 L232 18 Z", "rgba(214,236,240,.82)", 0.2);
    g.globalAlpha = 0.9; g.fillStyle = "#fffaf0"; g.fillRect(204, 2, 28, 16); g.globalAlpha = 1;
    fillP(g, "M201 -8 Q218 -16 235 -8 L235 -13 Q218 -21 201 -13 Z", "#c9a45e");
  }
  function drawPlain(g, o) {
    const bg = Array.isArray(o.bg) ? o.bg : [o.bg, o.bg];
    g.fillStyle = lg(g, 0, 0, [[0, bg[0]], [1, bg[1]]], -240, 2); g.fillRect(-400, -400, 800, 402);
    const gl = g.createRadialGradient(0, -90, 0, 0, -90, 220); gl.addColorStop(0, "rgba(255,240,210,.22)"); gl.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = gl; g.fillRect(-400, -400, 800, 402);
    cut(g, "M-400 2 L400 2 L400 34 L-400 34 Z", lg(g, 0, 0, [[0, C.shade(o.floor, 0.18)], [1, o.floor]], 2, 34), 0.35, 0, -4);
    g.fillStyle = C.shade(o.floor, -0.35); g.fillRect(-400, 34, 800, 200);
    g.strokeStyle = "rgba(255,230,190,.25)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-400, 34); g.lineTo(400, 34); g.stroke();
  }

  /* ---------- time model ---------- */
  const TAKE_LEAD = 0.17, TAKE_SQ = 0.25, TAKE_BOUNCE = 1.2;
  function moodKeys(o) {
    let K = o.moods && o.moods.length ? o.moods.map((k) => [+k[0], String(k[1])]) : [[0, o.mood || "normal"]];
    K.sort((a, b) => a[0] - b[0]); if (K[0][0] > 0) K.unshift([0, o.mood || K[0][1]]);
    return K;
  }
  const lerpN = C.lerp;
  function mixFace(A, B, k) {
    const out = { brow: A.brow.map((v, i) => lerpN(v, B.brow[i], k)), mouth: {}, eye: lerpN(A.eye, B.eye, k), steam: lerpN(A.steam, B.steam, k), arm: lerpN(A.arm, B.arm, k) };
    for (const q in A.mouth) out.mouth[q] = lerpN(A.mouth[q], B.mouth[q], k);
    return out;
  }
  /** mood weights {name: w} at time t (after stepping), plus the index of the active change */
  function moodAt(S, t) {
    const K = S.keys, bl = S.opts.blend || 0;
    let i = 0; while (i + 1 < K.length && K[i + 1][0] <= t + bl / 2) i++;
    const w = {};
    if (i === 0 || bl <= 0) { w[K[i][1]] = 1; return { w, cur: K[i][1], prev: i ? K[i - 1][1] : K[i][1], tc: K[i][0], i, k: 1 }; }
    const tc = K[i][0], k = sm((t - (tc - bl / 2)) / bl), a = K[i - 1][1], b = K[i][1];
    w[a] = (w[a] || 0) + 1 - k; w[b] = (w[b] || 0) + k;
    return { w, cur: k >= 0.5 ? b : a, prev: a, tc, i, k };
  }
  function faceOf(S, name) { return S.faces[name] || S.faces.normal; }
  function blendFace(S, w) {
    let out = null, acc = 0;
    for (const n in w) { if (w[n] <= 0) continue; const F = faceOf(S, n); if (!out) { out = mixFace(F, F, 0); acc = w[n]; continue; } acc += w[n]; out = mixFace(out, F, w[n] / acc); }
    return out || mixFace(S.faces.normal, S.faces.normal, 0);
  }
  /** body take/jump state at t: squash sy, lift, eye lead offset, arm override */
  function bodyAt(S, t) {
    const o = S.opts; let sy = 1, lift = 0, eyeY = 0, armT = null, takeOn = 0;
    if (o.take !== false) {
      // the latest change whose take has started
      for (let i = S.keys.length - 1; i >= 1; i--) {
        const tc = S.keys[i][0], st = tc - TAKE_LEAD - TAKE_SQ; if (t < st) continue;
        const k = t - st;
        if (k < TAKE_LEAD) { eyeY = -5 * (k / TAKE_LEAD); takeOn = 1; }
        else if (k < TAKE_LEAD + TAKE_SQ) { sy = 1 - 0.18 * sm((k - TAKE_LEAD) / TAKE_SQ); armT = -20; takeOn = 1; }
        else { const s = t - tc; if (s <= TAKE_BOUNCE) { sy = 1 + 0.15 * Math.exp(-5 * s) * Math.sin(3 * Math.PI * 2 * s + Math.PI * 0.5); takeOn = 1; } }
        break;
      }
    }
    for (let j = S.jumps.length - 1; j >= 0; j--) {
      const k = t - S.jumps[j]; if (k < 0) continue; if (k >= 1.5) break;
      if (k < 0.25) { sy = 1 - 0.2 * sm(k / 0.25); armT = -20; }
      else if (k < 0.95) { const u = (k - 0.25) / 0.7; lift = Math.sin(Math.PI * u) * 78; sy = 1 + 0.12 * Math.sin(Math.PI * u) * (u < 0.5 ? 1 : -0.4); armT = 160; }
      else { const u = k - 0.95; sy = 1 - 0.2 * Math.exp(-6 * u) * Math.cos(u * 18); }
      takeOn = 1; break;
    }
    if (o.breathe) sy *= 1 + o.breathe * Math.sin(t * TAU / 3.2);
    return { sy, sx: 1 + (1 - sy) * 0.5, lift, eyeY, armT, takeOn };
  }
  // arm target angle (deg) at t; the arm follows it with the demo's exponential lag (rate 10/s), re-filtered over a 0.7 s window
  function armTarget(S, t) { const b = bodyAt(S, t); return b.armT != null ? b.armT : blendFace(S, moodAt(S, t).w).arm; }
  function armAt(S, t) {
    const dt = 1 / 60, n = 42; let a = armTarget(S, Math.max(0, t - n * dt));
    for (let i = n - 1; i >= 0; i--) { const tt = t - i * dt; if (tt < 0) continue; a += (armTarget(S, tt) - a) * Math.min(1, dt * 10); }
    return a;
  }
  // steam speed K lags the mood (rate 3/s); phase = integral of K. Integrated from 0 with a fixed 1/24 s step, cached.
  function steamAt(S, t) {
    const dt = 1 / 24, c = S.cache.steam || (S.cache.steam = [[faceOf(S, S.keys[0][1]).steam, 0]]);
    const n = Math.max(0, Math.floor(t / dt));
    while (c.length <= n + 1) { const i = c.length - 1, [K, T] = c[i], tt = i * dt; const tgt = blendFace(S, moodAt(S, tt).w).steam; const K2 = K + (tgt - K) * Math.min(1, dt * 3); c.push([K2, T + dt * K2]); }
    const f = (t - n * dt) / dt, A = c[n], B = c[n + 1];
    return [lerpN(A[0], B[0], f), lerpN(A[1], B[1], f)];
  }
  function blinkAt(S, t) {
    if (S.opts.blink === false) return false;
    let b = 2.5, n = 0; while (b <= t && n < 10000) { if (t < b + 0.17) return true; b += 0.17 + 2 + C.hash(S.seed * 7.31 + n) * 3; n++; }
    return false;
  }

  /** full state at time t (exposed for composition) */
  function stateAt(S, t) {
    const o = S.opts, tq = o.fps ? C.stepT(t, o.fps) : t;
    const M = moodAt(S, tq), F = blendFace(S, M.w), B = bodyAt(S, tq);
    let wig = 0, wave = 0, sad = 0, hot = 0;
    for (const n in M.w) { const D = faceOf(S, n), ww = M.w[n]; if (D.wig && D.wig[1]) wig += ww * Math.sin(tq * D.wig[0]) * D.wig[1]; if (D.wave) wave += ww; if (D.sad) sad += ww; if (D.hot) hot += ww; }
    wig *= (1 - B.takeOn) * (o.wobble == null ? 1 : o.wobble);
    const arm = armAt(S, tq);
    const blink = blinkAt(S, tq);
    const [steamK, steamT] = steamAt(S, t);
    return { t, tq, mood: M, face: F, body: B, arm, wig, wave: wave * (1 - B.takeOn), sad, hot, blink, steamK, steamT };
  }

  function resolveBody(o) {
    let base;
    if (typeof o.body === "string") base = BODIES[o.body] || BODIES.cup;
    else if (typeof o.body === "function") base = { draw: o.body, face: { x: 0, y: -60, scale: 1, tilt: 0 }, arms: false, top: -130, shadow: 56, steam: false };
    else if (o.body && typeof o.body === "object") base = Object.assign({ face: { x: 0, y: -60, scale: 1, tilt: 0 }, arms: false, top: -130, shadow: 56, steam: false }, o.body);
    else base = BODIES.cup;
    const B = Object.assign({ armLine: "#8f8066", armColor: ["#fbf5e8", "#f0e7d6"] }, base);
    if (o.image) {
      const img = o.image, iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
      const box = o.imageBox || [-65, -130 * ih / iw, 130, 130 * ih / iw];
      B.draw = (g) => g.drawImage(img, box[0], box[1], box[2], box[3]);
      if (!o.body || typeof o.body === "string") { B.face = { x: 0, y: box[1] + box[3] * 0.55, scale: box[2] / 140, tilt: 0 }; B.arms = false; B.top = box[1]; B.shadow = box[2] * 0.42; B.steam = false; }
    }
    if (o.face) B.face = Object.assign({ x: 0, y: -60, scale: 1, tilt: 0 }, B.face || {}, o.face);
    if (o.arms != null) B.arms = o.arms;
    if (o.top != null) B.top = o.top;
    if (o.shadow != null) B.shadow = o.shadow;
    return B;
  }

  function sceneXf(g, S) {
    const v = S.opts.view || [-320, -240, 640, 300], s = S.opts.sceneFit === "contain" ? Math.min(S.W / v[2], S.H / v[3]) : Math.max(S.W / v[2], S.H / v[3]);
    g.translate(S.W / 2, S.H / 2); g.scale(s, s); g.translate(-(v[0] + v[2] / 2), -(v[1] + v[3] / 2));
    return s;
  }

  const api = C.defineModule("chibiObject", {
    size: [1280, 720],
    duration: (o) => {
      if (o.duration) return o.duration;
      const K = o.moods && o.moods.length ? o.moods.map((k) => +k[0]) : [0], J = o.jumps || [];
      return Math.max(6, Math.max(...K, ...J, 0) + 2.5);
    },
    defaults: {
      body: "cup", image: null, imageBox: null, face: null, arms: null, mood: "normal", moods: null, faces: null, take: true, blend: 0.17,
      jumps: [], fps: 12, steam: null, emote: true, blink: true, breathe: 0, wobble: 1, scene: "cafe", bg: ["#3a3350", "#56496c"], floor: "#8a5a35",
      x: 0, y: 18, scale: 0.86, palette: null, font: "italic 8px Georgia, serif", duration: null, seed: 11, view: null, sceneFit: "slice",
    },
    setup(S) {
      const o = S.opts;
      S.faces = Object.assign({}, FACES, o.faces || {});
      S.keys = moodKeys(o); S.jumps = (o.jumps || []).slice().sort((a, b) => a - b);
      S.seed = o.seed == null ? 11 : o.seed;
      S.body = resolveBody(o);
      S.pal = Object.assign({}, DEF_PAL, o.palette || {});
      if (o.scene === "cafe" || o.scene === "plain") {
        // static backdrop: cache once at 2x
        const q = Math.min(2, Math.max(1, o.dpr || (typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1) || 1)) * (o.cacheScale || 1);
        const cv = C.offscreen(S.W * q, S.H * q), g = cv.getContext("2d");
        g.scale(q, q); sceneXf(g, S);
        if (o.scene === "cafe") drawCafe(g, o.font); else drawPlain(g, o);
        S.bgCache = cv;
      }
    },
    render(g, t, S) {
      const o = S.opts, Bd = S.body;
      if (S.bgCache) g.drawImage(S.bgCache, 0, 0, S.W, S.H);
      g.save();
      sceneXf(g, S);
      if (typeof o.scene === "function") o.scene(g, S);
      const st = stateAt(S, t), B = st.body, F = st.face, tq = st.tq;
      g.translate(o.x, o.y); g.scale(o.scale, o.scale);
      // contact shadow
      const ss = Math.max(0.4, 1 - B.lift / 160);
      ell(g, 0, 1, (Bd.shadow || 56) * ss * B.sx, 7, "rgba(30,12,6,.45)", ss);
      // steam on top of the squashed top
      const top = Bd.top, topY = -B.lift + -top * (1 - B.sy);
      const steamOn = o.steam == null ? Bd.steam : o.steam;
      if (steamOn) {
        const sq = C.stepT(st.steamT, 12), K = st.steamK;
        let col = [0, 0, 0, 0]; const wsum = st.mood.w;
        for (const n in wsum) { const c = STEAM_COL[n] || STEAM_COL.normal; for (let i = 0; i < 4; i++) col[i] += c[i] * wsum[n]; }
        g.save(); g.translate(0, top + topY); g.lineCap = "round";
        ["M-20 3 q-9 -12 0 -24 q9 -12 0 -24", "M0 0 q9 -12 0 -24 q-9 -12 0 -24", "M20 3 q-9 -12 0 -24 q9 -12 0 -24"].forEach((d, i) => {
          const u = (sq * 0.55 + i * 0.33) % 1, droop = st.sad * (10 + 36);
          g.save(); g.translate(Math.sin(sq * 2.2 + i * 2) * (3 + K * 1.5), -u * 22 + droop); g.scale(1, 1 - 0.3 * st.sad);
          g.globalAlpha = Math.max(0, Math.sin(Math.PI * u) * Math.min(1, 0.3 + K * 0.4)) * col[3];
          g.strokeStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; g.lineWidth = 3 + K * 1.5; g.stroke(P(d)); g.restore();
        });
        g.restore(); g.globalAlpha = 1;
      }
      // emote pops in after the new face, then floats
      if (o.emote !== false) {
        const D = faceOf(S, st.mood.cur), drawE = EMO[D.emo];
        if (drawE) {
          const since = st.mood.i > 0 ? tq - st.mood.tc : tq + 1; const emoK = C.clamp(since * 3);
          const pop = emoK < 1 ? 1 + 0.35 * Math.sin(Math.PI * emoK) : 1, fl = Math.sin(tq * 3) * 3, sc = sm(emoK * 2) * pop;
          if (sc > 0.001) { g.save(); g.translate(0, top - 52 + topY + fl); g.scale(sc, sc); drawE(g); g.restore(); }
        }
      }
      // body group (squash about the ground point, lifted when jumping)
      g.save(); g.translate(0, -B.lift); g.scale(B.sx, B.sy);
      if (Bd.arms) {
        const aq = Math.round((st.arm + st.wig) / 2) * 2, aqR = st.wave > 0.5 ? Math.round((st.arm - st.wig) / 2) * 2 : aq;
        Bd.arms.forEach(([ax, ay], i) => {
          g.save(); g.translate(ax, ay); if (i) g.scale(-1, 1); g.rotate((i ? aqR : aq) * RAD);
          strokeP(g, "M0 0 Q-8 12 -6 24", Bd.armLine, 14); strokeP(g, "M0 0 Q-8 12 -6 24", (Bd.armColor || [])[i] || Bd.armColor[0], 10.5);
          g.restore();
        });
      }
      Bd.draw(g, S, st);
      const fa = Bd.face;
      g.save(); g.translate(fa.x, fa.y); if (fa.tilt) g.rotate(fa.tilt * RAD); g.scale(fa.scale, fa.scale);
      drawFace(g, { brow: F.brow, mouth: F.mouth, eye: F.eye, blink: st.blink, glint: st.blink ? 0 : C.clamp((F.eye - 0.62) / 0.16), eyeX: Math.sin(tq * 0.7) * 2, eyeY: B.eyeY }, S.pal);
      g.restore();
      g.restore();
      g.restore();
    },
  });
  api.lib = { FACES, BODIES, EMO, drawFace, drawCafe, drawPlain, stateAt, faceAt: (S, t) => blendFace(S, moodAt(S, t).w) };
  MGP.chibiObject = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
