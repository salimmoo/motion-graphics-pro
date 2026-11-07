/**
 * MGP.causalTransitions \u2014 "motivated" transitions between two scenes, each type chosen by its cause:
 *   wipe   (ganti lokasi)      torn-paper wipe, paper tear strip on the edge        0.5 s
 *   page   (waktu berlalu)     page-turn reveal with a fold shadow/highlight         0.7 s
 *   shut   (ganti bab)         7 shutter bars close, scenes swap at 50%, bars open   0.65 s
 *   iris   (fokus)             circle grows 0 \u2192 72% from a focus point, paper ring   0.55 s
 *   slide  (kontinuitas)       next sheet slides in from the right with edge shadow  0.45 s
 *   bridge (benda pindah set)  torn wipe while a carried object stays on top         0.8 s
 *   split  (pemutusan makna)   scene A tears into two halves that rotate \u00b110\u00b0, shift \u00b120%   22 frames @24
 *   cut    (impact)            hard cut                                              0
 *   fade   (crossfade)         plain dissolve; the source demo rejects it for whole scenes \u2014 offered for completeness  0.6 s
 * All progress is eased with smoothstep (soft start and end).
 *
 * Source: website guide/js/demos-plus.js  Demos.add("sebab")  (and the older demos.js transisi()), DOM/clip-path
 * version rewritten for canvas 2D. Every frame is a pure function of t.
 *
 * Options (defaults):
 *   type      "wipe"     one of the names above (api.TYPES lists them with default durations and causes)
 *   from, to  null       scene A / B: (ctx, t, S) => void drawing the full W x H frame, or an image/canvas (cover-fit),
 *                        or a CSS colour string. S has W, H, u (eased progress), raw, role ("from"|"to"), opts.
 *   at        0.8        transition start (s);  duration: null = the type's default;  after: 1.5 hold after it
 *   ease      "smooth"   "smooth" (smoothstep) or a MGP.core.ease name
 *   focus     [0.336, 0.635]  iris centre as a fraction of W, H
 *   bars 7, barColors ["#22345A","#1A2846"] (top\u2192bottom gradient), barColors2 ["#1C2B45","#15213A"] (even bars)
 *   paper "#F1E6D0" (tear strip), ring "rgba(241,230,208,.95)", jag 2.6 (tear roughness, % of W), seed 9
 *   carry     null       bridge only: (ctx, t, u, S) => void, or an image drawn at carryRect
 *   carryRect [510, 380, 380, 232] in 1280x720 units (scaled to W, H); carryLift 14 px, carryTilt 2\u00b0
 *   splitAngle 10, splitShift 0.2 (fraction of W), slideBack 0.25 (scene A drifts left by this fraction)
 *   bg        "#000"     colour behind everything
 *   labels    false      debug caption with type and progress
 *
 * API:
 *   MGP.causalTransitions.create(el, {type, from, to, at, duration}) \u2192 instance (draw/seek/timeline/ready)
 *   MGP.causalTransitions.render(ctx, t, opts)       pure frame render into an existing context
 *   MGP.causalTransitions.frame(ctx, type, u, drawA, drawB, opts)   draw one state at eased progress u (0..1)
 *        drawA/drawB: (ctx) => void (already set up for the W x H box); opts.width/height, plus the options above
 *   MGP.causalTransitions.TYPES  { wipe: {d:.5, cause:"ganti lokasi"}, ... }
 *
 * Example:
 *   const tr = MGP.causalTransitions.create("#stage", { type: "iris", from: drawVillage, to: drawCloseUp, at: 1 });
 *   MGP.core.expose(tr);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;

  const TYPES = {
    wipe: { d: 0.5, cause: "ganti lokasi" }, page: { d: 0.7, cause: "waktu berlalu" }, shut: { d: 0.65, cause: "ganti bab" },
    iris: { d: 0.55, cause: "fokus" }, slide: { d: 0.45, cause: "kontinuitas" }, bridge: { d: 0.8, cause: "benda pindah set" },
    split: { d: 22 / 24, cause: "pemutusan makna" }, cut: { d: 0, cause: "impact" }, fade: { d: 0.6, cause: "crossfade" },
  };

  /* ---------- fibre texture for the tear strip ---------- */
  let FIB = null;
  function fibre() {
    if (FIB) return FIB;
    const n = 160, c = C.offscreen(n, n), g = c.getContext("2d"), id = g.createImageData(n, n), r = C.rng(11);
    for (let p = 0; p < id.data.length; p += 4) { const v = 206 + r() * 49; id.data[p] = id.data[p + 1] = id.data[p + 2] = v; id.data[p + 3] = 255; }
    g.putImageData(id, 0, 0); g.globalAlpha = 0.2; g.strokeStyle = "#7d6c52"; g.lineWidth = 0.7;
    for (let i = 0; i < 300; i++) { const x = r() * n, y = r() * n, a = r() * Math.PI, l = 3 + r() * 10; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    return (FIB = c);
  }

  /* ---------- scene painting ---------- */
  function paint(g, sc, t, info) {
    const { W, H } = info;
    if (!sc) return;
    if (typeof sc === "function") { g.save(); sc(g, t, info); g.restore(); return; }
    if (typeof sc === "string") { g.fillStyle = sc; g.fillRect(0, 0, W, H); return; }
    const iw = sc.naturalWidth || sc.videoWidth || sc.width, ih = sc.naturalHeight || sc.videoHeight || sc.height;
    if (!iw || !ih) return;
    const k = Math.max(W / iw, H / ih), w = iw * k, h = ih * k;
    g.drawImage(sc, (W - w) / 2, (H - h) / 2, w, h);
  }
  const polyPath = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };

  /** Draw one transition state. A, B: (ctx) => void. u = eased progress, active = transition running (0<u<1). */
  function frame(g, type, u, A, B, o) {
    const W = o.width, H = o.height, jag = o._jag || makeJag(o.seed == null ? 9 : o.seed);
    const pct = (x, y) => [(x / 100) * W, (y / 100) * H];
    const on = u > 0 && u < 1;
    g.fillStyle = o.bg || "#000"; g.fillRect(0, 0, W, H);
    const clipDraw = (path, draw) => { g.save(); path(); g.clip(); draw(); g.restore(); };
    switch (type) {
      case "cut": (u >= 1 ? B : A)(); return;
      case "fade": A(); if (u > 0) { g.save(); g.globalAlpha = u; B(); g.restore(); } return;
      case "wipe": case "bridge": {
        A(); if (u <= 0) return; if (u >= 1) { B(); return; }
        const amp = o.jag == null ? 2.6 : o.jag;
        const edge = jag.map((j, i) => [u * 116 - 8 + j * amp * 2 + Math.sin(i * 1.7) * 0.8, (i / 24) * 100]);
        clipDraw(() => polyPath(g, [[-2, -2], ...edge, [-2, 102]].map((p) => pct(p[0], p[1]))), B);
        // paper tear strip along the edge
        const back = edge.map(([x, y]) => [x + 1.6 + Math.abs(Math.sin(y)) * 0.6, y]).reverse();
        g.save(); g.shadowColor = "rgba(40,25,10,.45)"; g.shadowBlur = 5; g.shadowOffsetX = 3;
        polyPath(g, edge.concat(back).map((p) => pct(p[0], p[1]))); g.fillStyle = o.paper || "#F1E6D0"; g.fill(); g.restore();
        g.save(); polyPath(g, edge.concat(back).map((p) => pct(p[0], p[1]))); g.clip(); g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.6; g.fillStyle = g.createPattern(fibre(), "repeat"); g.fillRect(0, 0, W, H); g.restore();
        return;
      }
      case "page": {
        A(); if (u <= 0) return; if (u >= 1) { B(); return; }
        const x = ((100 - u * 100) / 100) * W;
        clipDraw(() => { g.beginPath(); g.rect(x, 0, W - x, H); }, B);
        if (o.fold !== false) {
          const fw = Math.sin(Math.PI * u) * 0.16 * W;
          if (fw > 0.5) {
            const s1 = g.createLinearGradient(x, 0, x + fw, 0); s1.addColorStop(0, "rgba(30,18,8,.55)"); s1.addColorStop(1, "rgba(30,18,8,0)"); g.fillStyle = s1; g.fillRect(x, 0, fw, H);
            const hw = fw * 0.6, s2 = g.createLinearGradient(x - hw, 0, x, 0); s2.addColorStop(0, "rgba(255,250,235,0)"); s2.addColorStop(1, "rgba(255,250,235,.45)"); g.fillStyle = s2; g.fillRect(x - hw, 0, hw, H);
          }
        }
        return;
      }
      case "shut": {
        (u >= 0.5 ? B : A)();
        const v = u < 0.5 ? u * 2 : (1 - u) * 2, n = o.bars || 7, bh = H / n, c1 = o.barColors || ["#22345A", "#1A2846"], c2 = o.barColors2 || ["#1C2B45", "#15213A"];
        if (u <= 0 || u >= 1) return;
        for (let i = 0; i < n; i++) {
          const k = C.clamp(v * 1.2 - i * 0.03); if (k <= 0) continue;
          const y0 = i * bh, h = (bh + 1) * k, y = u < 0.5 ? y0 : y0 + bh + 1 - h;
          const cc = i % 2 ? c2 : c1, gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, cc[0]); gr.addColorStop(1, cc[1]);
          g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 10; g.shadowOffsetY = 4; g.fillStyle = gr; g.fillRect(0, y, W, h); g.restore();
        }
        return;
      }
      case "iris": {
        A(); if (u <= 0) return; if (u >= 1) { B(); return; }
        const f = o.focus || [430 / 1280, 457 / 720], cx = f[0] * W, cy = f[1] * H, R = u * 0.72 * Math.hypot(W, H) / Math.SQRT2;
        clipDraw(() => { g.beginPath(); g.arc(cx, cy, R, 0, C.TAU); }, B);
        g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 18; g.beginPath(); g.arc(cx, cy, R, 0, C.TAU); g.strokeStyle = o.ring || "rgba(241,230,208,.95)"; g.lineWidth = 4 * Math.max(0.5, W / 1280); g.stroke(); g.restore();
        return;
      }
      case "slide": {
        const back = o.slideBack == null ? 0.25 : o.slideBack;
        if (u >= 1) { B(); return; }
        g.save(); g.translate(-u * back * W, 0); A(); g.restore();
        if (u <= 0) return;
        const x = (1 - u) * W;
        g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 40 * Math.max(0.4, W / 1280); g.shadowOffsetX = -26 * Math.max(0.4, W / 1280); g.fillStyle = "#000"; g.fillRect(x, 0, W, H); g.restore();
        clipDraw(() => { g.beginPath(); g.rect(x, 0, W, H); }, () => { g.translate(x, 0); B(); });
        return;
      }
      case "split": {
        if (u <= 0 && !o._splitOn) { A(); return; }
        B(); if (u >= 1) return;
        const ang = (o.splitAngle == null ? 10 : o.splitAngle) * Math.PI / 180, sh = o.splitShift == null ? 0.2 : o.splitShift;
        const mid = jag.map((j, n) => [50 + j * 5, (n / 24) * 100]);
        [-1, 1].forEach((s) => {
          const pts = s < 0 ? [[-2, -2], ...mid, [-2, 102]] : [[102, -2], ...mid, [102, 102]];
          g.save(); g.globalAlpha = 1 - C.clamp((u - 0.72) / 0.28);
          g.translate(W / 2, H); g.translate(s * sh * u * W, 0); g.rotate(s * ang * u); g.translate(-W / 2, -H);
          g.save(); g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 14; polyPath(g, pts.map((p) => pct(p[0], p[1]))); g.fillStyle = "#000"; g.fill(); g.restore();
          clipDraw(() => polyPath(g, pts.map((p) => pct(p[0], p[1]))), A);
          g.restore();
        });
        return;
      }
      default: (u >= 0.5 ? B : A)();
    }
  }
  function makeJag(seed) { const r = C.rng(seed); return Array.from({ length: 25 }, () => r() - 0.5); }

  const durOf = (o) => (o.duration != null ? o.duration : (TYPES[o.type] || TYPES.wipe).d);

  const api = C.defineModule("causalTransitions", {
    size: [1280, 720],
    duration: (o) => o.at + durOf(o) + o.after,
    defaults: {
      type: "wipe", from: "#2C67B0", to: "#F3E8CF", at: 0.8, duration: null, after: 1.5, ease: "smooth",
      focus: [430 / 1280, 457 / 720], bars: 7, barColors: ["#22345A", "#1A2846"], barColors2: ["#1C2B45", "#15213A"],
      paper: "#F1E6D0", ring: "rgba(241,230,208,.95)", jag: 2.6, seed: 9, fold: true,
      carry: null, carryRect: [510, 380, 380, 232], carryLift: 14, carryTilt: 2,
      splitAngle: 10, splitShift: 0.2, slideBack: 0.25, bg: "#000", labels: false, font: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',
    },
    setup(S) { S.jag = makeJag(S.opts.seed); },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, d = durOf(o);
      const ez = o.ease === "smooth" ? C.smooth01 : C.ease[o.ease] || C.smooth01;
      const raw = d ? C.clamp((t - o.at) / d) : t >= o.at ? 1 : 0, u = d ? ez(raw) : raw;
      const info = (role) => ({ W, H, u, raw, role, opts: o, t });
      const A = () => paint(g, o.from, t, info("from")), B = () => paint(g, o.to, t, info("to"));
      const fo = Object.assign({}, o, { width: W, height: H, _jag: S.jag, _splitOn: t >= o.at });
      frame(g, o.type, u, A, B, fo);
      if (o.type === "bridge" && o.carry) {
        const r = o.carryRect, kx = W / 1280, ky = H / 720, s = Math.sin(Math.PI * u);
        g.save(); g.translate(0, -o.carryLift * s * ky);
        const cx = (r[0] + r[2] / 2) * kx, cy = (r[1] + r[3] / 2) * ky; g.translate(cx, cy); g.rotate((-o.carryTilt * s * Math.PI) / 180); g.translate(-cx, -cy);
        g.shadowColor = "rgba(45,28,12,.4)"; g.shadowBlur = 12 * kx; g.shadowOffsetY = 8 * ky;
        if (typeof o.carry === "function") o.carry(g, t, u, Object.assign({ W, H }, S)); else g.drawImage(o.carry, r[0] * kx, r[1] * ky, r[2] * kx, r[3] * ky);
        g.restore();
      }
      if (o.labels) {
        const ty = TYPES[o.type] || {}; g.save(); g.font = `500 ${Math.max(10, 13 * W / 1280)}px ${o.font}`; g.textBaseline = "middle";
        const txt = `${o.type} \u00b7 ${ty.cause || ""} \u00b7 u ${u.toFixed(2)}`, w = g.measureText(txt).width + 20;
        g.fillStyle = "rgba(9,12,26,.75)"; g.fillRect(10, H - 34, w, 24); g.fillStyle = "#f2d796"; g.fillText(txt, 20, H - 22); g.restore();
      }
    },
  });
  api.TYPES = TYPES;
  api.frame = (g, type, u, drawA, drawB, opts = {}) => {
    const o = Object.assign({}, api.defaults, opts, { type }); o.width = opts.width || 1280; o.height = opts.height || 720; o._splitOn = u > 0;
    g.save(); frame(g, type, u, () => { g.save(); drawA(g); g.restore(); }, () => { g.save(); drawB(g); g.restore(); }, o); g.restore();
  };
  api.lib = { frame, paint, fibre, makeJag };
  MGP.causalTransitions = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
