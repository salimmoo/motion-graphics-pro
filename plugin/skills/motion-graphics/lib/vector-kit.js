/**
 * MGP.vectorKit \u2014 vector character constructor kit: one set of capsule / loft pieces re-assembled per view
 * (front, 3/4, side, back), 8 expressions, 12 mouth visemes with a held lip-sync, 8 hand gestures (wave, thumbs up,
 * point, cup, phone ...), two proportion modes (kit 6.3 heads, realistic 7.5 heads) and three style layers
 * (flat per material, silhouette + cut lines, grey per material), turnaround with dip + settle, explode with pivots.
 *
 * Source: website guide/js/demos-skills.js, section "5 \u00b7 VKIT" (curve, rings, loftPts, drawMouth, drawHand, drawKit, vkit).
 * The website demo's UI (tabs, chips, toggles) became options; time drives everything (no dt integration).
 *
 * Options (defaults):
 *   view        0            body view angle in degrees (0 front, 45 3/4, 90 side, 180 back) or "sheet" (5-view sheet)
 *   turn        false        turnaround: cycles 90, 45, 0, 135, 180 with a dip anticipation and a settle per view
 *   turnHold    1.05         seconds per view in the turnaround
 *   explode     0            0..1 explode amount (pieces apart along each chain + white pivots); or keys [[t,v],...]
 *   landmarks   false        dashed landmark lines (crown, chin, shoulder, crotch, fingertip, knee, hem, sole); always on in "sheet"
 *   landmarkLabels true      names + values next to the landmark lines
 *   expr        "netral"     netral | senyum | tawa | sedih | marah | kaget | ragu | kedip
 *   exprCycle   null         array of expression names cycled every exprHold seconds (overrides expr)
 *   exprHold    1.6
 *   vis         ""           fixed viseme ("A E I", "O", "C D N S T X Y Z", "R", "L", "B M P", "F V", "Ee", "Th", "Ch J Sh", "U", "Q W"), "" = follow expression
 *   lipsync     false        play the held viseme sequence lipSeq / lipHold (frames at lipFps, each hold doubled = "on twos")
 *   lipSeq, lipHold          viseme names / hold frames (defaults = website sequence)
 *   lipFps      12
 *   gest        "rileks"     rileks | jempol | tunjuk | stop | kepal | dadah | cangkir | ponsel  (right arm)
 *   mode        "kit"        "kit" (6.3 H) | "real" (7.5 H)
 *   style       "flat"       "flat" | "cut" | "gray"
 *   palette     {}           overrides of the material colours (hair, skin, top, pants, sock, shoe, sole, lip, mouth, teeth, tongue, eye, blush, cup, phone)
 *   cutInk "#d6b06a", cutFill "#1b2546", cutInkDark "#9c7a3c"   colours of the "cut" style
 *   bg "#efe6d2", grid true, gridStep 24, gridColor "rgba(156,122,60,.09)"   sheet background
 *   margin      null         [top, bottom] in px around the figure (default 18/16, sheet 24/30); raise top for raised-arm gestures
 *   shadow      true         contact oval under the feet
 *   blinkEvery 3.4, blinkLen 0.11, bob true
 *   viewLabels  true         view names under the 5-view sheet (DEPAN, SAMPING ...)
 *   font        'ui-monospace, Menlo, Consolas, monospace'   capsFont 'Georgia, "Times New Roman", serif'
 *   duration    8 (seconds), width 1280, height 720, seed
 *
 * api: MGP.vectorKit.create(canvasOrEl, opts) -> inst {draw(t), seek(t), timeline(), duration, ready}
 *      MGP.vectorKit.render(ctx, t, opts)
 *      MGP.vectorKit.lib = { drawKit(g, o), drawMouth(g, x, y, m, sx, P, lineW), drawHand(g, type, W, dir, flip, sz, P, ink, lw, wave),
 *                            curve(keys), rings, loftPts, capPts, cutCap, MODES, MAT, GRAY, EXPR, VIS, GEST, TURN, LIPS, HOLD, visemeAt(t, o), mouthSpec(name) }
 *   drawKit works in head units (1 = one head, y down, crown at y 0, sole at MODES[mode].sole); translate + scale before calling.
 *   drawMouth(g, x, y, m, sx, P, lineW): m = mouth spec {k: "line"|"press"|"D"|"O"|"teeth"|"fv", w, h, c, sk, tt, tb, tg}, sx = width scale,
 *   P = palette {lip, mouth, teeth, tongue, skin}, lineW = line width in the same units.
 *
 * Example:
 *   const inst = MGP.vectorKit.create("#stage", { view: 45, gest: "dadah", lipsync: true, expr: "senyum" });
 *   MGP.core.expose(inst);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const { clamp, lerp, smooth01, mix, rgba } = C;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  /* ---------------- shared path helpers (same as the website) ---------------- */
  function smooth(g, p, close = true) {
    const n = p.length; if (n < 3) return;
    g.moveTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2);
    for (let i = 1; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    if (close) { g.quadraticCurveTo(p[0][0], p[0][1], (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); g.closePath(); }
  }
  function lines(g, p, close = true) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); if (close) g.closePath(); }
  const fillPts = (g, p, col, sm = true) => { if (!p || p.length < 3) return; g.beginPath(); sm ? smooth(g, p) : lines(g, p); g.fillStyle = col; g.fill(); };
  function arcPts(cx, cy, r, d0, d1, through, n) {
    const a0 = Math.atan2(d0[1], d0[0]), a1 = Math.atan2(d1[1], d1[0]), at = Math.atan2(through[1], through[0]);
    const md = (x) => ((x % TAU) + TAU) % TAU;
    let sw = md(a1 - a0); if (md(at - a0) > sw) sw -= TAU;
    const out = []; for (let k = 0; k <= n; k++) out.push([cx + r * Math.cos(a0 + sw * k / n), cy + r * Math.sin(a0 + sw * k / n)]); return out;
  }
  // tangent capsule: circles at the pivots, outer tangent sides, optional bulge (vector-character scripts/shapes.py (old bentuk.py) cap_pts)
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
  function clipHalf(pts, P, n) {
    const out = [], f = (p) => (p[0] - P[0]) * n[0] + (p[1] - P[1]) * n[1];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b); if (fa <= 0) out.push(a); if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    return out;
  }
  const cutCap = (a, b, ra, rb, frac, bo = 0, bi = 0) => { const u = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(u[0], u[1]) || 1e-6; const n = [u[0] / L, u[1] / L]; return clipHalf(capPts(a, b, ra, rb, bo, bi), [a[0] + u[0] * frac, a[1] + u[1] * frac], n); };

  /* ---------------- kit data (body frame: X forward, L lateral (+ = right of the figure), y down; view v: u = X sin v - L cos v) ---------------- */
  function curve(keys) {
    return (y) => {
      let i = 0; while (i < keys.length - 2 && y > keys[i + 1][0]) i++;
      const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(keys.length - 1, i + 2)], t = clamp((y - b[0]) / (c[0] - b[0] || 1)), t2 = t * t, t3 = t2 * t;
      return b.slice(1).map((_, k) => { const p0 = a[k + 1], p1 = b[k + 1], p2 = c[k + 1], p3 = d[k + 1]; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); });
    };
  }
  const rings = (keys, y0, y1, step = 0.025, map = (y) => y, wf = 1, df = 1) => { const f = curve(keys), out = []; for (let y = y0; y <= y1 + 1e-9; y += step) { const [w, d, xc] = f(y); out.push({ y: map(y), w: Math.max(0, w) * wf, d: Math.max(0, d) * df, xc }); } return out; };
  const loftPts = (rs, v, m) => { const sv = Math.sin(v), cv = Math.cos(v), L = [], R = []; for (const r of rs) { const c = r.xc * sv, hw = Math.pow(Math.pow(Math.abs(r.d * sv), m) + Math.pow(Math.abs(r.w * cv), m), 1 / m); L.push([c - hw, r.y]); R.push([c + hw, r.y]); } return L.concat(R.reverse()); };
  const HEADK = [[0.05, 0, 0, -0.02], [0.08, 0.2, 0.24, -0.03], [0.15, 0.29, 0.34, -0.03], [0.27, 0.338, 0.4, -0.025], [0.42, 0.36, 0.425, -0.015], [0.56, 0.365, 0.42, 0], [0.66, 0.35, 0.4, 0.01], [0.72, 0.32, 0.37, 0.02], [0.86, 0.24, 0.29, 0.03], [0.95, 0.155, 0.19, 0.04], [1.0, 0.1, 0.11, 0.045], [1.03, 0, 0, 0.045]];
  const HAIRK = [[-0.01, 0, 0, -0.12], [0.02, 0.14, 0.2, -0.12], [0.08, 0.23, 0.33, -0.12], [0.18, 0.36, 0.44, -0.12], [0.32, 0.43, 0.49, -0.12], [0.5, 0.465, 0.5, -0.13], [0.68, 0.49, 0.49, -0.14], [0.84, 0.53, 0.45, -0.15], [0.96, 0.55, 0.38, -0.16], [1.04, 0.5, 0.29, -0.16], [1.09, 0.3, 0.17, -0.16], [1.11, 0, 0, -0.16]];
  const NECKK = [[0.78, 0.15, 0.16, -0.06], [1.45, 0.165, 0.175, -0.05]];
  const TORSOK = [[0, 0.19, 0.18, -0.03], [0.025, 0.33, 0.26, -0.02], [0.05, 0.47, 0.33, -0.01], [0.085, 0.56, 0.38, 0], [0.13, 0.6, 0.42, 0.01], [0.2, 0.58, 0.435, 0.02], [0.35, 0.53, 0.42, 0.02], [0.55, 0.46, 0.38, 0], [0.75, 0.47, 0.4, 0], [0.95, 0.5, 0.43, 0], [1, 0.5, 0.43, 0]];
  const headF = curve(HEADK);
  const MODES = {
    kit: { n: "Gaya kit 6,3 H", sole: 6.3, shY: 1.42, shL: 0.52, elY: 2.36, wrY: 3.18, hipY: 3.18, hipL: 0.24, knY: 4.55, ankY: 5.95, hem: 5.82, neckB: 1.18, shirtHem: 3.05, wf: 1, hand: 1, lm: [["puncak", 0], ["dagu", 1], ["bahu", 1.29], ["selangkangan", 3.23], ["ujung jari", 3.66], ["lutut", 4.55], ["hem celana", 5.82], ["sol", 6.3]] },
    real: { n: "Realistis 7,5 H", sole: 7.5, shY: 1.56, shL: 0.78, elY: 3.0, wrY: 3.75, hipY: 3.66, hipL: 0.34, knY: 5.56, ankY: 7.15, hem: 7.02, neckB: 1.22, shirtHem: 3.55, wf: 1.42, hand: 1.2, lm: [["puncak", 0], ["dagu", 1], ["bahu", 1.37], ["selangkangan", 3.75], ["ujung jari", 4.6], ["lutut", 5.56], ["pergelangan kaki", 7.15], ["sol", 7.5]] },
  };
  const MAT = { hair: "#2f2536", skin: "#e8b690", top: "#c8724e", pants: "#24365f", sock: "#d6b06a", shoe: "#fbf6ea", sole: "#cdbb97", lip: "#a8504c", mouth: "#5b2531", teeth: "#fffaf0", tongue: "#de7b77", eye: "#231c26", blush: "#ef8f80", cup: "#f4ecd8", phone: "#1d2233" };
  const GRAY = { hair: "#555555", skin: "#c6c6c6", top: "#959595", pants: "#6d6d6d", sock: "#b0b0b0", shoe: "#e0e0e0", sole: "#a9a9a9", lip: "#8a8a8a", mouth: "#4a4a4a", teeth: "#f2f2f2", tongue: "#9b9b9b", eye: "#3a3a3a", blush: "#c6c6c6", cup: "#dedede", phone: "#4a4a4a" };
  const EXPR = {  // English names (neutral, smile, ...) are added below
    netral: { n: "Netral", b: [0, 0], lid: "open", m: { k: "line", w: 0.15, c: 0.018 } },
    senyum: { n: "Senyum", b: [-0.01, 3], lid: "open", m: { k: "D", w: 0.2, h: 0.07, tt: 1 } },
    tawa: { n: "Tertawa", b: [-0.03, 6], lid: "happy", m: { k: "D", w: 0.25, h: 0.13, tt: 1, tg: 1 } },
    sedih: { n: "Sedih", b: [-0.01, -16], lid: "half", m: { k: "line", w: 0.13, c: -0.022 } },
    marah: { n: "Marah", b: [0.025, 20], lid: "open", m: { k: "teeth", w: 0.18, h: 0.05 } },
    kaget: { n: "Kaget", b: [-0.06, -4], lid: "wide", m: { k: "O", w: 0.11, h: 0.14, tg: 1 } },
    ragu: { n: "Ragu", b: [0, 0], one: true, lid: "open", m: { k: "line", w: 0.13, c: -0.004, sk: 0.02 } },
    kedip: { n: "Kedip", b: [-0.01, 2], lid: "wink", m: { k: "D", w: 0.18, h: 0.06, tt: 1 } },
  };
  const VIS = [["A E I", { k: "D", w: 0.24, h: 0.13, tt: 1, tg: 1 }], ["O", { k: "O", w: 0.15, h: 0.15, tg: 1 }], ["C D N S T X Y Z", { k: "teeth", w: 0.22, h: 0.055 }], ["R", { k: "O", w: 0.16, h: 0.08, tt: 1 }], ["L", { k: "D", w: 0.2, h: 0.11, tt: 1, tg: 2 }], ["B M P", { k: "press", w: 0.15 }],
    ["F V", { k: "fv", w: 0.18, h: 0.045 }], ["Ee", { k: "D", w: 0.26, h: 0.07, tt: 1, tb: 1 }], ["Th", { k: "D", w: 0.19, h: 0.07, tt: 1, tg: 3 }], ["Ch J Sh", { k: "O", w: 0.17, h: 0.09, tt: 1, tb: 1 }], ["U", { k: "O", w: 0.1, h: 0.09 }], ["Q W", { k: "O", w: 0.08, h: 0.075 }]];
  const GEST = {  // English names (relaxed, thumb, ...) are added below
    rileks: { n: "Rileks", a: [6, 90, 12, 50], h: "relax" }, jempol: { n: "Jempol", a: [22, 40, 95, 10], h: "thumb" }, tunjuk: { n: "Menunjuk", a: [78, 25, 84, 20], h: "point" }, stop: { n: "Stop", a: [62, 20, 150, 5], h: "open" },
    kepal: { n: "Kepal angkat", a: [95, 85, 172, 60], h: "fist" }, dadah: { n: "Dadah", a: [112, 88, 162, 75], h: "open", wave: 1 }, cangkir: { n: "Cangkir", a: [24, 30, 100, 0], h: "cup" }, ponsel: { n: "Ponsel", a: [30, 25, 118, -10], h: "phone" },
  };
  // English expression / gesture names (v2.4), non-enumerable so the lists keep their original entries
  for (const [en, id] of [["neutral", "netral"], ["smile", "senyum"], ["laugh", "tawa"], ["sad", "sedih"], ["angry", "marah"], ["surprised", "kaget"], ["unsure", "ragu"], ["wink", "kedip"], ["blink", "kedip"]]) Object.defineProperty(EXPR, en, { value: EXPR[id], enumerable: false });
  for (const [en, id] of [["relaxed", "rileks"], ["thumb", "jempol"], ["point", "tunjuk"], ["fist", "kepal"], ["wave", "dadah"], ["cup", "cangkir"], ["phone", "ponsel"]]) if (GEST[id]) Object.defineProperty(GEST, en, { value: GEST[id], enumerable: false });
  const TURN = [[90, "SAMPING"], [45, "3/4 DEPAN"], [0, "DEPAN"], [135, "3/4 BELAKANG"], [180, "BELAKANG"]];
  const LIPS = ["B M P", "O", "C D N S T X Y Z", "Ee", "O", "C D N S T X Y Z", "A E I", "R", "A E I", "F V", "Ee", "C D N S T X Y Z", "U", "Q W", "A E I", "L", "Th", "Ch J Sh", "B M P"];
  const HOLD = [3, 4, 2, 3, 2, 3, 4, 2, 3, 2, 3, 2, 3, 2, 4, 2, 2, 3, 6];
  const mouthSpec = (name) => (VIS.find((x) => x[0] === name) || [0, null])[1];

  /** mouth shape at (x, y): m = spec, sx = width scale, P = palette, lineW = stroke width */
  function drawMouth(g, x, y, m, sx, P, lineW) {
    const w = (m.w || 0.15) * sx, h = m.h || 0;
    g.lineCap = "round"; g.lineJoin = "round";
    if (m.k === "line" || m.k === "press") {
      g.strokeStyle = P.lip; g.lineWidth = lineW * (m.k === "press" ? 1.3 : 1); g.beginPath(); g.moveTo(x - w / 2, y + (m.sk || 0)); g.quadraticCurveTo(x, y + (m.c || 0) * 2, x + w / 2, y - (m.sk || 0)); g.stroke();
      if (m.k === "press") { g.lineWidth = lineW * 0.6; g.beginPath(); g.moveTo(x - w * 0.15, y + 0.03); g.lineTo(x + w * 0.15, y + 0.03); g.stroke(); }
      return;
    }
    const shape = () => { g.beginPath(); if (m.k === "O") g.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); else if (m.k === "teeth" || m.k === "fv") { const r = Math.min(h / 2, w / 4); g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, r) : g.rect(x - w / 2, y - h / 2, w, h); } else { g.moveTo(x - w / 2, y - h * 0.3); g.quadraticCurveTo(x, y - h * 0.42, x + w / 2, y - h * 0.3); g.quadraticCurveTo(x + w * 0.42, y + h * 0.75, x, y + h * 0.72); g.quadraticCurveTo(x - w * 0.42, y + h * 0.75, x - w / 2, y - h * 0.3); g.closePath(); } };
    shape(); g.fillStyle = m.k === "teeth" ? P.teeth : P.mouth; g.fill();
    g.save(); shape(); g.clip();
    if (m.k === "teeth") { g.strokeStyle = rgba(P.mouth, 0.55); g.lineWidth = lineW * 0.5; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.stroke(); }
    if (m.tt || m.k === "fv") { g.fillStyle = P.teeth; g.fillRect(x - w / 2, y - h, w, h * (m.k === "fv" ? 0.95 : 0.62)); }
    if (m.tb) { g.fillStyle = P.teeth; g.fillRect(x - w / 2, y + h * 0.28, w, h); }
    if (m.tg) { g.fillStyle = P.tongue; g.beginPath(); if (m.tg === 3) g.ellipse(x, y + h * 0.02, w * 0.22, h * 0.22, 0, 0, TAU); else if (m.tg === 2) g.ellipse(x, y - h * 0.08, w * 0.24, h * 0.3, 0, 0, TAU); else g.ellipse(x, y + h * 0.55, w * 0.32, h * 0.32, 0, 0, TAU); g.fill(); }
    g.restore();
    if (m.k === "fv") { g.fillStyle = mix(P.lip, P.skin, 0.35); g.beginPath(); g.ellipse(x, y + h * 0.35, w * 0.46, h * 0.45, 0, 0, TAU); g.fill(); }
    g.strokeStyle = m.k === "teeth" ? P.lip : mix(P.lip, P.skin, 0.2); g.lineWidth = lineW * 0.7; shape(); g.stroke();
    if (m.k === "D") { g.strokeStyle = mix(P.lip, P.skin, 0.4); g.lineWidth = lineW * 0.8; g.beginPath(); g.moveTo(x - w * 0.25, y + h * 0.82); g.quadraticCurveTo(x, y + h * 0.95, x + w * 0.25, y + h * 0.82); g.stroke(); }
  }

  // kit hand shapes in a local frame (a along the forearm toward the fingers, b across); relax = loose C grip 0.29 x 0.58 H
  function drawHand(g, type, W, dir, flip, sz, P, ink, lw, wave) {
    const pr = [-dir[1] * flip, dir[0] * flip], T = (a, b) => [W[0] + (dir[0] * a + pr[0] * b) * sz, W[1] + (dir[1] * a + pr[1] * b) * sz], Tl = (pts) => pts.map(([a, b]) => T(a, b));
    const skin = P.skin, dk = mix(P.skin, "#6b3b2e", 0.3), capF = (a, b, r1, r2, col) => fillPts(g, capPts(T(...a), T(...b), r1 * sz, r2 * sz), col, false);
    const fist = () => { fillPts(g, Tl([[0, -0.11], [0.14, -0.145], [0.27, -0.12], [0.31, -0.02], [0.3, 0.09], [0.22, 0.145], [0.06, 0.13], [0, 0.1]]), skin); g.strokeStyle = dk; g.lineWidth = lw; g.lineCap = "round"; for (const b of [-0.05, 0.03]) { const a = T(0.2, b), c = T(0.29, b + 0.01); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); } };
    if (type === "relax") { fillPts(g, Tl([[0, -0.11], [0.1, -0.14], [0.26, -0.145], [0.42, -0.12], [0.53, -0.07], [0.58, 0], [0.55, 0.07], [0.45, 0.11], [0.33, 0.12], [0.2, 0.15], [0.08, 0.14], [0, 0.11]]), skin); capF([0.12, 0.1], [0.3, 0.16], 0.06, 0.05, skin); g.strokeStyle = dk; g.lineWidth = lw; g.lineCap = "round"; [[[0.36, -0.07], [0.5, -0.03]], [[0.36, 0.0], [0.5, 0.04]]].forEach(([a, b]) => { const p = T(...a), q = T(...b); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }); return; }
    if (type === "open") {
      const sp = wave ? 15 : 14, rel = [0.75, 0.94, 1.0, 0.92];
      fillPts(g, Tl([[0, -0.1], [0.16, -0.14], [0.28, -0.12], [0.3, 0.12], [0.16, 0.15], [0, 0.11]]), skin);
      [-0.105, -0.035, 0.035, 0.105].forEach((b, i) => { const an = (i - 1.5) * sp * RAD, L = 0.27 * rel[i], s = [0.26, b]; capF(s, [s[0] + Math.cos(an) * L, s[1] + Math.sin(an) * L], 0.036, 0.032, skin); });
      const ta = (1.5 * sp * 1.9 + 20) * RAD; capF([0.08, 0.12], [0.08 + Math.cos(ta) * 0.18, 0.12 + Math.sin(ta) * 0.18], 0.05, 0.04, skin); return;
    }
    if (type === "thumb") { fist(); const top = T(0.12, -0.1); fillPts(g, capPts(top, [top[0], top[1] - 0.2 * sz], 0.055 * sz, 0.05 * sz), skin, false); return; }
    if (type === "point") { fist(); capF([0.24, -0.08], [0.56, -0.08], 0.04, 0.036, skin); return; }
    if (type === "fist") { fist(); return; }
    if (type === "cup") { const c = T(0.17, 0.0); g.fillStyle = P.cup; g.beginPath(); g.roundRect ? g.roundRect(c[0] - 0.12 * sz, c[1] - 0.2 * sz, 0.24 * sz, 0.28 * sz, 0.035 * sz) : g.rect(c[0] - 0.12 * sz, c[1] - 0.2 * sz, 0.24 * sz, 0.28 * sz); g.fill(); g.fillStyle = P.sock || MAT.sock; g.fillRect(c[0] - 0.12 * sz, c[1] - 0.11 * sz, 0.24 * sz, 0.05 * sz); g.strokeStyle = P.cup; g.lineWidth = 0.035 * sz; g.beginPath(); g.arc(c[0] + 0.14 * sz * flip, c[1] - 0.06 * sz, 0.06 * sz, -Math.PI / 2, Math.PI / 2, flip < 0); g.stroke(); fillPts(g, [[-0.13, -0.04], [0.13, -0.04], [0.12, 0.06], [-0.12, 0.07]].map(([a, b]) => [c[0] + a * sz, c[1] + b * sz]), skin); g.strokeStyle = dk; g.lineWidth = lw; [-0.05, 0.03].forEach((a) => { g.beginPath(); g.moveTo(c[0] + a * sz, c[1] - 0.035 * sz); g.lineTo(c[0] + a * sz, c[1] + 0.02 * sz); g.stroke(); }); return; }
    if (type === "phone") { const c = T(0.2, 0); fist(); g.fillStyle = P.phone; g.beginPath(); g.roundRect ? g.roundRect(c[0] - 0.09 * sz, c[1] - 0.3 * sz, 0.18 * sz, 0.33 * sz, 0.03 * sz) : g.rect(c[0] - 0.09 * sz, c[1] - 0.3 * sz, 0.18 * sz, 0.33 * sz); g.fill(); g.fillStyle = P.screen || "#6f8fd1"; g.fillRect(c[0] - 0.07 * sz, c[1] - 0.27 * sz, 0.14 * sz, 0.24 * sz); fillPts(g, capPts([c[0] - 0.1 * sz * flip, c[1] - 0.08 * sz], [c[0] - 0.04 * sz * flip, c[1] - 0.15 * sz], 0.04 * sz, 0.035 * sz), skin, false); }
  }

  /**
   * Draw the whole kit character in head units. o = { v (deg), mode, style, expr, vis, gest, t, blink, explode, bob, view,
   * palette (overrides), cutInk, cutFill, cutInkDark }
   */
  function drawKit(g, o) {
    const M = MODES[o.mode] || MODES.kit, v = o.v * RAD, sv = Math.sin(v), cv = Math.cos(v);
    // stroke konstan (padanan non-scaling-stroke): o.lwK = faktor pengali semua lebar garis, dihitung di render dari strokeTetap
    const lwK = o.lwK || 1, LW = (x) => x * lwK;
    const P = Object.assign({}, o.style === "gray" ? GRAY : MAT, o.style === "gray" ? {} : o.palette || {});
    const cut = o.style === "cut", flat = o.style === "flat" || (!cut && o.style !== "gray");
    const GOLD = o.cutInk || "#d6b06a", GOLDD = o.cutInkDark || "#9c7a3c", CFILL = o.cutFill || "#1b2546";
    const INK = cut ? GOLD : null, lw = cut ? 0.014 : 0.02, E = o.explode || 0, kx = 0.46 * E;
    const pj = (X, L) => X * sv - L * cv, dp = (X, L) => X * cv + L * sv;
    const col = (c) => (cut ? CFILL : c);
    const ink = (c) => (cut ? GOLD : mix(c, "#2a1a16", 0.22));
    const piece = (pts, c, off = [0, 0], smoothIt = true) => { if (!pts || pts.length < 3) return; g.save(); g.translate(off[0], off[1]); g.beginPath(); smoothIt ? smooth(g, pts) : lines(g, pts); g.fillStyle = col(c); g.fill(); if (cut) { g.strokeStyle = INK; g.lineWidth = LW(lw); g.stroke(); } g.restore(); };
    const seam = (a, b, c, off = [0, 0]) => { if (o.style === "gray") return; g.save(); g.translate(off[0], off[1]); g.strokeStyle = ink(c); g.lineWidth = LW(cut ? lw : 0.018); g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); };
    const pivots = [];
    const wf = M.wf, legR = [0.245 * wf, 0.155 * wf, 0.1 * wf], armR = [0.135 * wf, 0.105 * wf, 0.075 * wf], sideK = 1.12;
    const rv = (r) => Math.sqrt(Math.pow(r * sideK * sv, 2) + Math.pow(r * cv, 2));
    const G = GEST[o.gest] || GEST.rileks, legs = [], arms = [];
    for (const s of [1, -1]) {
      const open = s < 0 ? 0.04 : 0, hip = [0, M.hipY, s * M.hipL], kn = [0.03, M.knY, s * (M.hipL - 0.005 + open * 0.5)], an = [0, M.ankY, s * (M.hipL - 0.02 + open)];
      legs.push({ s, hip, kn, an, depth: dp(0, hip[2]) });
      const ang = s > 0 ? G.a.slice() : [6, 90, 12, 50];
      if (s > 0 && G.wave) ang[2] += 16 * Math.sin((o.t || 0) * TAU * 4 / 1.9);
      const dirA = (el, az) => [Math.sin(el * RAD) * Math.cos(az * RAD), Math.cos(el * RAD), Math.sin(el * RAD) * Math.sin(az * RAD) * s];
      const Sh = [0, M.shY, s * M.shL], up = M.elY - M.shY, fo = M.wrY - M.elY, d1 = dirA(ang[0], ang[1]), d2 = dirA(ang[2], ang[3]);
      const El = [Sh[0] + d1[0] * up, Sh[1] + d1[1] * up, Sh[2] + d1[2] * up], Wr = [El[0] + d2[0] * fo, El[1] + d2[1] * fo, El[2] + d2[2] * fo];
      arms.push({ s, Sh, El, Wr, hand: s > 0 ? G.h : "relax", depth: dp((Sh[0] + El[0] + Wr[0]) / 3, (Sh[2] + El[2] + Wr[2]) / 3), handDepth: dp(Wr[0], Wr[2]), wave: s > 0 && G.wave });
    }
    const P2 = (q) => [pj(q[0], q[2]), q[1]];
    const sgn = (L) => { const u = -L * cv; return Math.abs(u) > 0.05 ? Math.sign(u) : Math.sign(L * sv) || 1; };
    const offL = (s, n) => [sgn(s) * kx * 0.55 * Math.min(n, 1.5), kx * n];
    const offA = (s, n) => [sgn(s) * kx * n, kx * 0.2 * n];
    // draw order: hair back, far limbs, legs + pelvis, neck, torso, near arms, head
    const back = cv < -0.17;
    const hairR = rings(HAIRK, -0.01, 1.11, 0.02), headR = rings(HEADK, 0.05, 1.03, 0.02);
    const headOff = [0, -kx], headTilt = 2 * (back ? -1 : 1);
    const inHead = (fn) => { g.save(); g.translate(headOff[0], headOff[1] + (o.bob || 0)); g.translate(0, 0.98); g.rotate(headTilt * RAD * (cv >= 0 ? 1 : -1) * 0.5); g.translate(0, -0.98); fn(); g.restore(); };
    if (!back) inHead(() => { piece(loftPts(hairR, v, 2), P.hair); });
    const drawArm = (a) => {
      const S2 = P2(a.Sh), E2 = P2(a.El), W2 = P2(a.Wr), dark = a.depth < -0.12 && Math.abs(sv) > 0.3, c = (x) => (dark ? mix(x, "#1a1424", 0.2) : x);
      const r = armR, o1 = offA(a.Sh[2], 1), o2 = offA(a.Sh[2], 2), o3 = offA(a.Sh[2], 3);
      piece(capPts(S2, E2, r[0], r[1]), c(P.skin), o1, false);
      const sl = cutCap(S2, E2, r[0] * 1.14, r[1] * 1.18, 0.55 * dist(S2, E2) || 0.01, 0.01, 0.01);
      piece(sl, c(P.top), o1, false);
      if (flat && sl.length > 2) { const d = [E2[0] - S2[0], E2[1] - S2[1]], m = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / m, d[0] / m], q = [S2[0] + d[0] * 0.53, S2[1] + d[1] * 0.53]; seam([q[0] + n[0] * r[0] * 1.05, q[1] + n[1] * r[0] * 1.05], [q[0] - n[0] * r[0] * 1.05, q[1] - n[1] * r[0] * 1.05], P.top, o1); }
      piece(capPts(E2, W2, r[1], r[2]), c(P.skin), o2, false);
      const d3 = [a.Wr[0] - a.El[0], a.Wr[1] - a.El[1], a.Wr[2] - a.El[2]], l3 = Math.hypot(...d3), d2 = [W2[0] - E2[0], W2[1] - E2[1]], len2 = Math.hypot(...d2) || 1e-6;
      const fs = clamp(len2 / l3, 0.4, 1), dir = len2 > 0.02 ? [d2[0] / len2, d2[1] / len2] : [0, 1];
      const flip = a.s * (cv >= 0 ? 1 : -1) * (Math.abs(sv) > 0.7 ? Math.sign(sv) * a.s * -1 : 1);
      g.save(); g.translate(o3[0], o3[1]);
      const PP = o.style === "gray" ? GRAY : cut ? Object.assign({}, P, { skin: CFILL, cup: CFILL, phone: CFILL }) : P;
      drawHand(g, a.hand, W2, dir, flip, M.hand * (0.75 + 0.25 * fs), PP, ink(P.skin), LW(0.018), a.wave);
      g.restore();
      pivots.push([S2, o1], [E2, o2], [W2, o3]);
    };
    const drawLeg = (L, far) => {
      const c = (x) => (far ? mix(x, "#1a1424", 0.2) : x), H2 = P2(L.hip), K2 = P2(L.kn), A2 = P2(L.an), s = L.s;
      const o1 = offL(L.hip[2], 1.2), o2 = offL(L.hip[2], 2.3), o3 = offL(L.hip[2], 3.2), o4 = offL(L.hip[2], 3.9);
      // shoe: sneaker profile x lateral width, turned out 12 deg, hull in the view
      const prof = [[-0.16, 0], [-0.17, -0.12], [-0.08, -0.2], [0.06, -0.22], [0.22, -0.18], [0.36, -0.13], [0.46, -0.08], [0.5, -0.02], [0.48, 0]], out = 12 * s * RAD, pts = [], bot = [];
      for (const [px, py] of prof) for (const sd of [-1, 1]) { const wl = (0.1 + 0.03 * clamp(px / 0.4)) * wf, X0 = px * wf, L0 = sd * wl, X = X0 * Math.cos(out) - L0 * Math.sin(out) + L.an[0], Lr = X0 * Math.sin(out) + L0 * Math.cos(out) + L.an[2]; const q = [pj(X, Lr), M.sole + py * wf]; pts.push(q); if (py > -0.07) bot.push(q); }
      const hull = (Q) => { Q = Q.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o0, a, b) => (a[0] - o0[0]) * (b[1] - o0[1]) - (a[1] - o0[1]) * (b[0] - o0[0]); const lo = [], hi = []; for (const p of Q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of Q.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
      const sock = capPts([A2[0], A2[1] - 0.24 * wf], A2, rv(legR[2]) * 0.95, rv(legR[2]));
      piece(sock, c(P.sock), o3, false);
      const sh = hull(pts); piece(sh, c(P.shoe), o4);
      if (!cut && o.style !== "gray") { g.save(); g.translate(o4[0], o4[1]); g.beginPath(); smooth(g, sh); g.clip(); g.fillStyle = c(P.sole); g.beginPath(); lines(g, hull(bot)); g.fill(); g.fillRect(-9, M.sole - 0.035 * wf, 18, 0.2); g.restore(); }
      else if (o.style === "gray") { g.save(); g.translate(o4[0], o4[1]); g.beginPath(); smooth(g, sh); g.clip(); g.fillStyle = P.sole; g.fillRect(-9, M.sole - 0.05 * wf, 18, 0.2); g.restore(); }
      piece(capPts(H2, K2, rv(legR[0]), rv(legR[1]), 0.02 * wf, 0.01), c(P.pants), o1, false);
      const shin = cutCap(K2, A2, rv(legR[1]), rv(legR[2]) * 1.25, (M.hem - L.kn[1]) / (L.an[1] - L.kn[1]) * dist(K2, A2), 0.012, 0.012);
      piece(shin, c(P.pants), o2, false);
      if (flat) { const hy = M.hem - 0.07, wv = rv(legR[2]) * 1.3; seam([A2[0] - wv, hy], [A2[0] + wv, hy], P.pants, o2); }
      pivots.push([H2, o1], [K2, o2], [A2, o3]);
    };
    const legsS = legs.slice().sort((a, b) => a.depth - b.depth), armsS = arms.slice().sort((a, b) => a.depth - b.depth);
    const behind = armsS.filter((a) => a.depth < -0.15), front = armsS.filter((a) => a.depth >= -0.15);
    behind.forEach(drawArm);
    legsS.forEach((L, i) => drawLeg(L, i === 0 && Math.abs(sv) > 0.3));
    // pelvis: top straight at the belt, bottom = two circles at the hip pivots
    const pelR = rings([[0, 0.47, 0.42, -0.01], [1, 0.47, 0.43, -0.02]], 0, 1, 0.25, (y) => lerp(M.shirtHem - 0.16, M.hipY, y), wf, 1 + (wf - 1) * 0.6);
    const pOff = [0, kx * 0.55];
    piece(loftPts(pelR, v, 1.3), P.pants, pOff, false);
    legs.forEach((L) => { const c = P2(L.hip); g.save(); g.translate(pOff[0], pOff[1]); g.fillStyle = col(P.pants); g.beginPath(); g.arc(c[0], c[1], rv(legR[0]), 0, TAU); g.fill(); if (cut) { g.strokeStyle = INK; g.lineWidth = LW(lw); g.beginPath(); g.arc(c[0], c[1], rv(legR[0]), 0.05 * Math.PI, 0.95 * Math.PI); g.stroke(); } g.restore(); });
    if (flat && cv > 0.2) { const fx = pj(0.43 * (1 + (wf - 1) * 0.6), 0); seam([fx, M.shirtHem], [fx, M.hipY - 0.02], P.pants, pOff); }
    // neck + torso (loft, superellipse m 1.25 so 3/4 is not narrower than the front)
    const neckR = rings(NECKK, 0.78, 1.45, 0.05), torsoR = rings(TORSOK, 0, 1, 0.025, (s) => lerp(M.neckB, M.shirtHem, s), wf, 1 + (wf - 1) * 0.6);
    const neckP = loftPts(neckR, v, 2);
    g.save(); g.translate(0, -kx * 0.4); piece(neckP, P.skin);
    if (flat && !back) { g.save(); g.beginPath(); smooth(g, neckP); g.clip(); g.translate(0, 0.075); g.rotate(headTilt * RAD * 0.5 * (cv >= 0 ? 1 : -1)); g.beginPath(); smooth(g, loftPts(headR, v, 2)); g.fillStyle = mix(P.skin, "#7a3f2c", 0.22); g.fill(); g.restore(); }
    g.restore();
    const torso = loftPts(torsoR, v, 1.25);
    piece(torso, P.top);
    if (flat) {
      g.save(); g.beginPath(); smooth(g, torso); g.clip(); g.fillStyle = mix(P.top, "#2a1a16", 0.12); g.fillRect(-3, M.shirtHem - 0.09, 6, 0.2);
      const rib = []; for (let th = o.v - 90; th <= o.v + 90; th += 10) { const r0 = torsoR[1], X = r0.xc + r0.d * Math.cos(th * RAD), L = r0.w * Math.sin(th * RAD); if (dp(Math.cos(th * RAD) / r0.d, Math.sin(th * RAD) / r0.w) < 0.02) continue; rib.push([pj(X, L), M.neckB + 0.04 + 0.05 * Math.max(0, Math.cos(th * RAD))]); }
      if (rib.length > 1) { g.strokeStyle = mix(P.top, "#2a1a16", 0.25); g.lineWidth = LW(0.05); g.lineCap = "round"; g.beginPath(); lines(g, rib, false); g.stroke(); g.strokeStyle = mix(P.top, "#2a1a16", 0.4); g.lineWidth = LW(0.014); g.beginPath(); lines(g, rib.map(([x, y]) => [x, y + 0.035]), false); g.stroke(); }
      g.restore();
    }
    // arms in front of the torso; hands raised in front of the face go after the head
    const late = front.filter((a) => a.handDepth > 0.3 && a.Wr[1] < 1.6), early = front.filter((a) => !late.includes(a));
    early.forEach(drawArm);
    // head (face loft, ear, features, hair cover)
    inHead(() => {
      const face = loftPts(headR, v, 2);
      const fp = (y, L) => { const [w, d, xc] = headF(y), th = Math.asin(clamp(L / Math.max(w, 1e-3), -1, 1)), X = xc + d * Math.cos(th), nX = Math.cos(th) / Math.max(d, 1e-3), nL = Math.sin(th) / Math.max(w, 1e-3), nm = Math.hypot(nX, nL); return { u: pj(X, L), y, f: (nX * cv + nL * sv) / nm }; };
      const ear = () => { const [w, , xc] = headF(0.64), u = pj(xc - 0.03, w + 0.015); g.fillStyle = col(P.skin); g.beginPath(); g.ellipse(u, 0.64, 0.05 + 0.03 * Math.abs(sv), 0.09, 0, 0, TAU); g.fill(); if (cut) { g.strokeStyle = INK; g.lineWidth = LW(lw); g.stroke(); } else if (o.style !== "gray") { g.strokeStyle = mix(P.skin, "#6b3b2e", 0.3); g.lineWidth = LW(0.012); g.stroke(); g.strokeStyle = mix(P.skin, "#6b3b2e", 0.45); g.lineWidth = LW(0.014); g.beginPath(); g.arc(u + 0.005 * Math.sign(sv), 0.645, 0.035, -1.2, 1.2); g.stroke(); } };
      if (sv > -0.3 && sv <= 0.45 && !back) ear();
      piece(face, P.skin);
      if (back) { piece(loftPts(hairR, v, 2), P.hair); if (sv > 0.3) ear(); }
      else {
        const ex = (o.expr && typeof o.expr === "object" ? o.expr : EXPR[o.expr]) || EXPR.netral, blink = o.blink;
        if (Math.abs(sv) > 0.5) { const [, d, xc] = headF(0.66), fr = pj(xc + d, 0); g.fillStyle = col(P.skin); g.beginPath(); g.ellipse(fr - Math.sign(sv) * 0.008, 0.665, 0.05, 0.045, 0, 0, TAU); g.fill(); }
        g.save(); g.beginPath(); smooth(g, face); g.clip();
        for (const s of [1, -1]) {
          const e = fp(0.56, s * 0.135); if (e.f <= 0.04) continue;
          const rx = 0.021 * (0.55 + 0.45 * e.f), ry = 0.039 * (ex.lid === "wide" ? 1.15 : 1), al = clamp((e.f - 0.04) * 6);
          g.globalAlpha = al; g.fillStyle = cut ? GOLD : P.eye; g.strokeStyle = cut ? GOLD : P.eye; g.lineWidth = LW(0.018); g.lineCap = "round";
          const closed = blink || ex.lid === "happy" || (ex.lid === "wink" && s < 0);
          if (closed) { g.beginPath(); if (ex.lid === "happy" || ex.lid === "wink") { g.moveTo(e.u - rx * 1.6, 0.575); g.quadraticCurveTo(e.u, 0.52, e.u + rx * 1.6, 0.575); } else { g.moveTo(e.u - rx * 1.5, 0.56); g.quadraticCurveTo(e.u, 0.585, e.u + rx * 1.5, 0.56); } g.stroke(); }
          else { g.beginPath(); g.ellipse(e.u, 0.56, rx, ry, 0, 0, TAU); g.fill(); if (ex.lid === "half") { g.fillStyle = col(P.skin); g.fillRect(e.u - rx * 1.4, 0.56 - ry * 1.2, rx * 2.8, ry * 0.95); g.strokeStyle = cut ? GOLD : P.eye; g.beginPath(); g.moveTo(e.u - rx * 1.3, 0.56 - ry * 0.25); g.lineTo(e.u + rx * 1.3, 0.56 - ry * 0.25); g.stroke(); } }
          // brows: short thick capsule; angle per expression (inner end down = angry)
          const b = fp(0.44 + ex.b[0] - (ex.one && s > 0 ? 0.04 : 0), s * 0.14); if (b.f > 0.04) { const an = (ex.b[1] * (ex.one && s < 0 ? 0 : 1)) * RAD * s * (cv >= 0 ? 1 : -1), hl = 0.055 * (0.55 + 0.45 * b.f); g.strokeStyle = cut ? GOLD : P.hair; g.lineWidth = LW(0.032); g.beginPath(); g.moveTo(b.u - hl * Math.cos(an), b.y + hl * Math.sin(an)); g.lineTo(b.u + hl * Math.cos(an), b.y - hl * Math.sin(an)); g.stroke(); }
          if (flat) { const bl = fp(0.7, s * 0.24); if (bl.f > 0.1) { g.fillStyle = rgba(P.blush, 0.35 * bl.f); g.beginPath(); g.ellipse(bl.u, 0.7, 0.06 * (0.5 + 0.5 * bl.f), 0.038, 0, 0, TAU); g.fill(); } }
          g.globalAlpha = 1;
        }
        // nose: C line inside the face
        const nz = fp(0.64, 0.0);
        if (Math.abs(sv) <= 0.5) { g.strokeStyle = cut ? GOLD : mix(P.skin, "#7a3f2c", 0.45); g.lineWidth = LW(0.02); g.lineCap = "round"; g.beginPath(); const dx = -0.025 * Math.sign(sv || 1) * (cv >= 0 ? 1 : -1); g.moveTo(nz.u, 0.58); g.quadraticCurveTo(nz.u - dx * 1.6, 0.67, nz.u + dx * 0.3, 0.72); g.stroke(); }
        // mouth: viseme or expression; slides to the profile edge as |sin v| grows
        const mspec = o.vis ? (typeof o.vis === "object" ? o.vis : mouthSpec(o.vis) || ex.m) : ex.m;
        const mc = fp(0.8, 0), ml = fp(0.8, 0.09), mr = fp(0.8, -0.09), span = Math.abs(ml.u - mr.u) / 0.18;
        const ps = smooth01((Math.abs(sv) - 0.8) / 0.17), [, md, mxc] = headF(0.8), edge = pj(mxc + md, 0) - Math.sign(sv) * 0.06;
        const mx = lerp(mc.u, edge, ps), sxm = Math.max(0.35, lerp(span, 0.45, ps));
        const MP = cut ? Object.assign({}, P, { lip: GOLD, mouth: "#0e1430", teeth: "#e9dcbc", tongue: GOLDD, skin: CFILL }) : P;
        drawMouth(g, mx, 0.8, mspec, sxm, MP, LW(0.02));
        g.restore();
        // hair cover: hairline table per head-ring angle th, visible arc around v, clipped to the face
        const HL = [[-180, 1.1], [-120, 1.05], [-95, 0.8], [-70, 0.58], [-45, 0.4], [-25, 0.2], [0, 0.24], [30, 0.3], [55, 0.36], [75, 0.42], [88, 0.5], [97, 0.86], [120, 1.02], [150, 1.08], [180, 1.1]];
        const hl = (th) => { th = ((th + 540) % 360) - 180; for (let i = 0; i < HL.length - 1; i++) if (th <= HL[i + 1][0]) return lerp(HL[i][1], HL[i + 1][1], (th - HL[i][0]) / (HL[i + 1][0] - HL[i][0])); return 1.1; };
        const vd = o.v, cover = [];
        for (let th = vd - 96; th <= vd + 96; th += 4) { const y = hl(th), [w, d, xc] = headF(Math.min(y, 0.85)), X = xc + d * Math.cos(th * RAD) * 1.02, L = w * Math.sin(th * RAD) * 1.02; cover.push([pj(X, L), y]); }
        if (cover.length > 2) {
          const a = cover[0], b = cover[cover.length - 1], sg = b[0] > a[0] ? 0.6 : -0.6, poly = [...cover, [b[0] + sg, b[1]], [b[0] + sg, -0.4], [a[0] - sg, -0.4], [a[0] - sg, a[1]]];
          g.save(); g.beginPath(); smooth(g, face); g.clip();
          if (flat) { g.save(); g.translate(0, 0.045); g.beginPath(); lines(g, poly); g.fillStyle = mix(P.skin, "#7a3f2c", 0.2); g.fill(); g.restore(); }
          g.beginPath(); lines(g, poly); g.fillStyle = col(P.hair); g.fill(); g.restore();
          if (cut) { g.save(); g.beginPath(); smooth(g, face); g.clip(); g.strokeStyle = INK; g.lineWidth = LW(lw); g.beginPath(); lines(g, cover, false); g.stroke(); g.restore(); }
        }
        if (sv > 0.45) ear();
      }
      // shine band across the crown, also seen from the back
      if (flat || o.style === "gray") { const hp = loftPts(hairR, v, 2); g.save(); g.beginPath(); smooth(g, hp); g.clip(); const cxh = pj(-0.12, 0); g.strokeStyle = mix(P.hair, "#ffffff", o.style === "gray" ? 0.12 : 0.08); g.lineWidth = LW(0.065); g.beginPath(); g.ellipse(cxh, 0.6, 0.44, 0.42, 0, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); g.strokeStyle = mix(P.hair, "#000000", 0.25); g.lineWidth = LW(0.012); for (const k of [-0.18, 0.02, 0.2]) { g.beginPath(); g.moveTo(cxh + k, 0.16); g.lineTo(cxh + k * 1.1, 0.24); g.stroke(); } g.restore(); }
    });
    late.forEach(drawArm);
    // explode sheet: pivot points in white
    if (E > 0.02) { pivots.forEach(([p, off]) => { g.fillStyle = rgba("#ffffff", E); g.strokeStyle = rgba(GOLDD, E); g.lineWidth = LW(0.012); g.beginPath(); g.arc(p[0] + off[0], p[1] + off[1], 0.035, 0, TAU); g.fill(); g.stroke(); }); }
  }

  /** viseme name at time t for a held sequence (frames at fps, every hold doubled: "on twos") */
  function visemeAt(t, o = {}) {
    const seq = o.lipSeq || LIPS, hold = o.lipHold || HOLD, fps = o.lipFps || 12;
    const f = Math.floor(t * fps + 1e-6) * 2, tot = hold.reduce((a, b) => a + b, 0) * 2, ff = ((f % tot) + tot) % tot;
    let acc = 0, i = 0; while (i < hold.length && acc + hold[i] * 2 <= ff) { acc += hold[i] * 2; i++; }
    return seq[Math.min(i, seq.length - 1)];
  }
  const fmt = (v, d = 2) => (+v).toFixed(d).replace(".", ",");

  const api = C.defineModule("vectorKit", {
    size: [1280, 720],
    duration: (o) => o.duration || 8,
    aliases: { strokeFixed: "strokeTetap" },
    defaults: {
      view: 0, turn: false, turnHold: 1.05, explode: 0, landmarks: false, landmarkLabels: true,
      expr: "netral", exprCycle: null, exprHold: 1.6, vis: "", lipsync: false, lipSeq: null, lipHold: null, lipFps: 12,
      gest: "rileks", mode: "kit", style: "flat", palette: {}, cutInk: "#d6b06a", cutFill: "#1b2546", cutInkDark: "#9c7a3c",
      margin: null, bg: "#efe6d2", grid: true, gridStep: 24, gridColor: "rgba(156,122,60,.09)", shadow: true,
      blinkEvery: 3.4, blinkLen: 0.11, bob: true, viewLabels: true, strokeTetap: null,
      font: 'ui-monospace, Menlo, Consolas, monospace', capsFont: 'Georgia, "Times New Roman", serif', duration: 8,
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, M = MODES[o.mode] || MODES.kit;
      const blink = o.blinkEvery > 0 && ((t % o.blinkEvery) + o.blinkEvery) % o.blinkEvery < o.blinkLen;
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
      if (o.grid) { g.strokeStyle = o.gridColor; g.lineWidth = 1; for (let x = 0; x < W; x += o.gridStep) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); } for (let y = 0; y < H; y += o.gridStep) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); } }
      const exT = Array.isArray(o.explode) ? clamp(C.key(o.explode, t)) : clamp(+o.explode || 0);
      const vis = o.lipsync ? visemeAt(t, o) : o.vis;
      let expr = o.exprCycle && o.exprCycle.length ? o.exprCycle[Math.floor(Math.max(0, t) / o.exprHold) % o.exprCycle.length] : o.expr;
      if (typeof expr === "function") expr = expr(t);   // mis. (t) => MGP.wajah.keVectorKit(MGP.wajah.auPada(kunci, t))
      const views = [];
      if (o.view === "sheet") TURN.forEach(([v, n], i) => views.push({ v, n, cx: (i + 0.5) / 5 }));
      else if (o.turn) {
        const hold = o.turnHold, tt = Math.max(0, t), idx = Math.floor(tt / hold) % 5, ph = tt % hold, [v, n] = TURN[idx];
        // dip anticipation before the turn, small settle after (spring: amp, freq 3, decay 5)
        const dip = ph > hold - 0.2 ? Math.sin(((ph - (hold - 0.2)) / 0.2) * Math.PI / 2) : 0, settle = ph < 0.5 ? 0.05 * Math.sin(ph * 3 * TAU) / Math.exp(ph * 5) : 0;
        views.push({ v, n, cx: 0.5, dip, settle });
      } else views.push({ v: +o.view || 0, n: "", cx: 0.5 });
      const multi = views.length > 1, mg = o.margin || [], top = mg[0] != null ? mg[0] : multi ? 24 : 18, bottom = mg[1] != null ? mg[1] : multi ? 30 : 16, extra = exT * 2.6;
      const s = Math.min((H - top - bottom) / (M.sole + 0.15 + extra), multi ? (W / 5) / 2.1 : W / 3.2), lmX0 = multi ? 6 : W * 0.5 - s * 2.4;
      const oy = top + exT * 0.46 * s;
      const tag = (txt, x, y, colr, size, align = "left", font = o.font) => { g.font = `500 ${size}px ${font}`; g.textAlign = align; g.textBaseline = "alphabetic"; g.fillStyle = colr; g.fillText(txt, x, y); };
      if (o.landmarks || o.view === "sheet") {
        g.save(); M.lm.forEach(([n, y]) => { const yy = oy + y * s; g.strokeStyle = "rgba(156,122,60,.35)"; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(multi ? 30 : lmX0, yy + 0.5); g.lineTo(multi ? W - 6 : W * 0.5 + s * 2.4, yy + 0.5); g.stroke(); g.setLineDash([]); if (o.landmarkLabels) { if (!multi) tag(`${n} ${fmt(y, 2)} H`, W * 0.5 + s * 2.5, yy + 3, "#8a6a34", 9.5 * Math.max(1, H / 480)); else if (W >= 520) tag(fmt(y, 2), 4, yy + 3, "#8a6a34", 8 * Math.max(1, H / 480)); } }); g.restore();
      }
      for (const V of views) {
        const ox = W * V.cx, bob = o.bob ? 0.004 * Math.sin(t * TAU / 3.1) : 0;
        g.save(); g.translate(ox, oy); g.scale(s, s);
        if (V.dip || V.settle) { const dy = (V.dip || 0) * 0.06 - (V.settle || 0) * 0.6; g.translate(0, M.sole); g.scale(1 + (V.dip || 0) * 0.015, 1 - (V.dip || 0) * 0.03 + (V.settle || 0) * 0.3); g.translate(0, -M.sole + dy); }
        if (o.shadow) { g.fillStyle = `rgba(60,40,20,${(0.13 * (1 - exT)).toFixed(3)})`; g.beginPath(); g.ellipse(0, M.sole + 0.02, 0.9 * M.wf, 0.09, 0, 0, TAU); g.fill(); }
        const lwK = o.strokeTetap ? C.lebarTetap(g, o.strokeTetap, g.canvas && W ? g.canvas.width / W : 1) / 0.02 : 1;   // 0,02 H = lebar garis dasar kit
        drawKit(g, { v: V.v, mode: o.mode, style: o.style, expr, vis: typeof vis === "function" ? vis(t) : vis, gest: o.gest, t, blink, explode: exT, bob, view: o.view, palette: o.palette, cutInk: o.cutInk, cutFill: o.cutFill, cutInkDark: o.cutInkDark, lwK });
        g.restore();
        if (multi && o.viewLabels) tag(V.n, ox, H - 10, "#5b4521", (W < 520 ? 7 : 8.5) * Math.max(1, H / 480), "center", o.capsFont);
      }
    },
  });
  api.lib = { drawKit, drawMouth, drawHand, curve, rings, loftPts, capPts, cutCap, smooth, lines, MODES, MAT, GRAY, EXPR, VIS, GEST, TURN, LIPS, HOLD, visemeAt, mouthSpec };
  MGP.vectorKit = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
