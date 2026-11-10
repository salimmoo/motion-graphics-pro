/**
 * MGP.paket \u2014 Paket Motion scene engine + registry (ported from the Paket Motion live previews).
 *
 * Renders any of the 105 Paket Motion packages (EXP-01 ... TRN-05) straight from its id, so a paket brief can be
 * previewed or rendered to video directly. Each package names a scene (fx.s) and a variant (fx.v); 76 scene
 * renderers live in scenes-a1 ... scenes-t. Every scene draws the WHOLE frame from t alone (an 8 s loop).
 *
 * Load order (classic scripts, file:// safe):
 *   core/mgp-core.js, pack-scenes/engine.js, pack-scenes/data.js, pack-scenes/scenes-{a1,a2,b,c,d,e,t}.js
 *   (or the single file dist/mgp-packs.js)
 *
 * API
 *   MGP.paket.ids()                      -> ["EXP-01", ...]
 *   MGP.paket.get(id)                    -> {id, kat, nama, inti, pal[5], font[2], ar, fx:{s, v, fonts?, lines?}}
 *   MGP.paket.scenes()                   -> registered scene names
 *   MGP.paket.kategori()                 -> {EXP: {nama, contoh:[{j, c}]}, ...}
 *   MGP.paket.state(id, opts)            -> scene state S {W, H, L, pal, f1, f2, v, lines, scene, ...} (logical size by ratio)
 *   MGP.paket.render(id, ctx, t, opts)   draw one frame of package `id` at t seconds into ctx.
 *        The frame is fitted into opts.width x opts.height (default: logical size 640x360 / 360x640 / 432x540 / 480x480)
 *        starting at the current origin; the ctx transform is respected; state is cached per (id, opts object).
 *   MGP.paket.create(target, id, opts)   -> instance {canvas, ctx, W, H, duration, ready, draw(t), seek(t), timeline()}
 *   MGP.paket.ready(id, opts)            -> Promise, resolves when the package's Google Fonts are loaded
 *   MGP.paket.def(name, fn)              register a custom scene fn(ctx, t, S, X)
 *   MGP.paket.X                          drawing helpers used by the scenes (text, wrap, icons, torn paper, grain, ...)
 *
 * Options (all optional)
 *   width, height  output box in CSS px (create: default = logical size x scale)
 *   scale          create(): output scale over the logical size (default 2, e.g. 16:9 -> 1280x720)
 *   dpr            device pixel ratio of the canvas (default min(2, devicePixelRatio))
 *   pal            override palette (array of up to 5 colours: bg, ink, accent, accent 2, surface)
 *   font           override [titleFont, bodyFont]
 *   lines          override text beats: [{j: "Judul", c: "Keterangan"}, ...] (also accepts {judul, cap}); 4 are used
 *   title          override the package title shown by some scenes
 *   scene, variant override the scene / variant (render another look with this package's palette)
 *   ar             override aspect ratio "16:9" | "9:16" | "4:5" | "1:1"
 *   loop           true (default): t wraps every 8 s; false: t is clamped to [0, 8)
 *   duration       create(): timeline duration in seconds (default 8; with loop=true longer durations repeat the loop)
 *   seam           true (default): soften the loop point with a short fade to the background colour
 *   fonts          true (default): load the package's Google Fonts (needs network); false = system fallback fonts
 *
 * Example
 *   const p = MGP.paket.create(document.getElementById("stage"), "EXP-03", { lines: [{ j: "Masalahnya", c: "..." }] });
 *   MGP.core.expose(p);                       // window.__seek / __duration / __timeline for frame capture
 *   // or inside your own canvas renderer: MGP.paket.render("KIN-02", ctx, t, { width: 1280, height: 720 });
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  if (!C) throw new Error("MGP.paket: load core/mgp-core.js first");
  const L = 8, SIZE = { "16:9": [640, 360], "9:16": [360, 640], "4:5": [432, 540], "1:1": [480, 480] };
  const SC = {};
  const WG = { "Inter": "wght@400;600;800", "Poppins": "wght@400;600;700;800", "Montserrat": "wght@400;700;800", "Space Grotesk": "wght@400;700", "Nunito": "wght@400;700;800",
    "Lora": "ital,wght@0,400;0,700;1,400", "Syne": "wght@400;700;800", "Playfair Display": "ital,wght@0,400;0,700;1,400", "Oswald": "wght@400;700", "IBM Plex Mono": "wght@400;700",
    "DM Serif Display": "ital@0;1", "Libre Baskerville": "ital,wght@0,400;0,700;1,400", "Cinzel": "wght@400;700", "Bodoni Moda": "ital,wght@0,400;0,700;1,400", "Source Serif 4": "ital,wght@0,400;0,700;1,400",
    "Fraunces": "ital,wght@0,400;0,700;1,400", "Fredoka": "wght@400;600;700", "Comic Neue": "wght@400;700", "Caveat": "wght@400;700", "Sora": "wght@400;700", "Outfit": "wght@300;400;700",
    "Cormorant Garamond": "ital,wght@0,400;0,700;1,400", "Space Mono": "wght@400;700", "Roboto Flex": "wght@100..1000", "Josefin Sans": "wght@400;700", "IBM Plex Sans": "wght@400;700",
    "Barlow": "wght@400;700", "JetBrains Mono": "wght@400;700", "Plus Jakarta Sans": "wght@400;700;800", "Manrope": "wght@400;700;800", "Baloo 2": "wght@400;700;800", "Press Start 2P": "", "Pixelify Sans": "wght@400;700", "Zen Maru Gothic": "wght@400;700", "Shippori Mincho": "wght@400;700" };
  /* ---------------- helpers ---------------- */
  const X = {};
  X.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  X.lerp = (a, b, k) => a + (b - a) * k;
  X.seg = (t, a, b) => X.clamp((t - a) / (b - a));                        // 0..1 progress of t over [a,b]
  X.win = (t, a, b, fi = .35, fo = .35) => Math.min(X.seg(t, a, a + fi), 1 - X.seg(t, b - fo, b)); // fade in/out window
  X.ease = {
    lin: (p) => p,
    in: (p) => p * p * p,
    out: (p) => 1 - Math.pow(1 - p, 3),
    out5: (p) => 1 - Math.pow(1 - p, 5),
    inOut: (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    sine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    elastic: (p) => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - .75) * (2 * Math.PI) / 3) + 1),
    bounce: (p) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + .75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + .9375; return n * (p -= 2.625 / d) * p + .984375; },
  };
  X.E = (t, a, b, e = "out") => X.ease[e](X.seg(t, a, b));                // eased progress
  X.spring = (p, k = 7, z = 4.5) => (p <= 0 ? 0 : 1 - Math.exp(-z * p) * Math.cos(k * p));  // damped spring 0\u21921 (overshoots)
  X.stepT = (t, fps = 12) => Math.floor(t * fps) / fps;                   // stepped time ("on twos" = 12)
  X.beat = (t, bpm = 120, decay = 8) => { const b = 60 / bpm, f = (t % b) / b; return Math.exp(-decay * f * b); };  // 1 on the beat, decays
  X.hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  X.noise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return X.lerp(X.hash(i), X.hash(i + 1), u) * 2 - 1; };  // smooth -1..1
  X.wob = (seed, t, amp = 1, sp = 1) => X.noise(seed * 9.13 + t * sp) * amp;
  // colours
  X.rgb = (h) => { h = String(h); const m = h.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(",").slice(0, 3).map((v) => Math.round(parseFloat(v)) || 0); h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((x) => x + x).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  X.a = (h, a) => { const [r, g, b] = X.rgb(h); return `rgba(${r},${g},${b},${a})`; };
  X.mix = (h1, h2, k) => { const a = X.rgb(h1), b = X.rgb(h2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`; };
  X.lum = (h) => { const [r, g, b] = X.rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  X.shade = (h, k) => (k >= 0 ? X.mix(h, "#ffffff", k) : X.mix(h, "#000000", -k));
  // type
  X.font = (c, w, size, fam) => { c.font = `${w} ${size}px "${fam}", system-ui, sans-serif`; };
  X.text = (c, s, x, y, o = {}) => {
    c.save(); X.font(c, o.w || 700, o.size || 24, o.fam || "Inter");
    c.textAlign = o.align || "center"; c.textBaseline = o.base || "middle"; c.fillStyle = o.color || "#000";
    if (o.ls != null && "letterSpacing" in c) c.letterSpacing = o.ls + "px";
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.stroke) { c.lineWidth = o.lw || 2; c.strokeStyle = o.stroke; c.lineJoin = "round"; c.strokeText(s, x, y); }
    if (!o.noFill) c.fillText(s, x, y);
    c.restore();
  };
  X.wrap = (c, s, maxW) => { const out = []; let line = ""; String(s).split(/\s+/).forEach((w) => { const tt = line ? line + " " + w : w; if (c.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; }); if (line) out.push(line); return out; };
  X.measure = (c, s, w, size, fam) => { c.save(); X.font(c, w, size, fam); const m = c.measureText(s).width; c.restore(); return m; };
  // typewriter: first n characters of s at progress p
  X.typed = (s, p) => s.slice(0, Math.round(s.length * X.clamp(p)));
  // shapes
  X.rr = (c, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  X.circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); };
  X.shadow = (c, blur = 18, oy = 8, col = "rgba(0,0,0,.25)", ox = 0) => { c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetY = oy; c.shadowOffsetX = ox; };
  X.noShadow = (c) => { c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; };
  // torn/jagged rectangle path (paper)
  X.torn = (c, x, y, w, h, seed = 1, j = 4) => {
    c.beginPath(); const st = 14; let i = 0;
    for (let k = 0; k <= w; k += st) c.lineTo(x + k, y + (X.hash(seed + i++) - .5) * j);
    for (let k = 0; k <= h; k += st) c.lineTo(x + w + (X.hash(seed + i++) - .5) * j, y + k);
    for (let k = w; k >= 0; k -= st) c.lineTo(x + k, y + h + (X.hash(seed + i++) - .5) * j);
    for (let k = h; k >= 0; k -= st) c.lineTo(x + (X.hash(seed + i++) - .5) * j, y + k);
    c.closePath();
  };
  // stroke a path progressively (p 0..1). len = approximate path length.
  X.drawOn = (c, fn, p, len = 1200) => { c.save(); c.setLineDash([len * X.clamp(p), len + 10]); c.beginPath(); fn(c); c.stroke(); c.restore(); };
  // polyline through pts with progress (exact)
  X.poly = (c, pts, p = 1) => {
    if (pts.length < 2) return; let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let rem = tot * X.clamp(p); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && rem > 0; i++) { const d = seg[i - 1], k = Math.min(1, rem / d); c.lineTo(X.lerp(pts[i - 1][0], pts[i][0], k), X.lerp(pts[i - 1][1], pts[i][1], k)); rem -= d; }
    return { tot };
  };
  X.polyEnd = (pts, p) => { let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; } let rem = tot * X.clamp(p); for (let i = 1; i < pts.length; i++) { const d = seg[i - 1]; if (rem <= d) { const k = rem / d; return [X.lerp(pts[i - 1][0], pts[i][0], k), X.lerp(pts[i - 1][1], pts[i][1], k), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; } rem -= d; } const a = pts[pts.length - 1]; return [a[0], a[1], 0]; };
  // quadratic bezier point
  X.qpt = (a, cp, b, k) => [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * cp[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * cp[1] + k * k * b[1]];
  // textures (cached offscreen patterns)
  const TX = {};
  function noiseCanvas(n = 160, a = 40, mono = true, seed = 1) {
    const R = C.rng(seed), cv = C.offscreen(n, n); const g = cv.getContext("2d"), d = g.createImageData(n, n);
    for (let i = 0; i < d.data.length; i += 4) { const v = R() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = mono ? v : R() * 255; d.data[i + 3] = a; }
    g.putImageData(d, 0, 0); return cv;
  }
  X.grain = (c, W, H, amt = .5, t = 0) => {   // animated film grain
    if (!TX.grain) TX.grain = [0, 1, 2].map((k) => noiseCanvas(180, 46, true, 11 + k));
    const cv = TX.grain[Math.floor(t * 24) % 3]; c.save(); c.globalAlpha = amt; c.globalCompositeOperation = "overlay";
    const p = c.createPattern(cv, "repeat"); c.fillStyle = p; c.translate((X.hash(Math.floor(t * 24)) * 180) | 0, (X.hash(Math.floor(t * 24) + 7) * 180) | 0); c.fillRect(-180, -180, W + 360, H + 360); c.restore();
  };
  X.paper = (c, W, H, col, amt = .35) => {    // fibrous paper texture over a fill
    c.fillStyle = col; c.fillRect(0, 0, W, H);
    if (!TX.paper) { const cv = noiseCanvas(220, 22, true, 21), R = C.rng(22); const g = cv.getContext("2d"); g.globalAlpha = .08; g.strokeStyle = "#000"; for (let i = 0; i < 90; i++) { g.beginPath(); const x = R() * 220, y = R() * 220, a = R() * 6.3, l = 6 + R() * 18; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } TX.paper = cv; }
    c.save(); c.globalAlpha = amt; c.globalCompositeOperation = "multiply"; c.fillStyle = c.createPattern(TX.paper, "repeat"); c.fillRect(0, 0, W, H); c.restore();
  };
  X.vignette = (c, W, H, amt = .45, col = "0,0,0") => { const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.hypot(W, H) * .6); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${amt})`); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  X.glow = (c, x, y, r, col, a = .6) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, X.a(col, a)); g.addColorStop(1, X.a(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  X.lgrad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  X.halftone = (c, x, y, w, h, col, step = 7, fn = () => .5) => { c.fillStyle = col; for (let yy = y; yy < y + h; yy += step) for (let xx = x + ((yy / step) % 2 ? step / 2 : 0); xx < x + w; xx += step) { const r = fn(xx, yy) * step * .55; if (r > .3) { c.beginPath(); c.arc(xx, yy, r, 0, 6.283); c.fill(); } } };
  X.letterbox = (c, W, H, k = .1, col = "#000") => { c.fillStyle = col; c.fillRect(0, 0, W, H * k); c.fillRect(0, H * (1 - k), W, H * k); };
  // simple vector icons in a 24-unit box, centred at x,y, size s. p = draw-on progress for strokes.
  const IC = {
    gear: (c) => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.moveTo(12 + Math.cos(a) * 7.5, 12 + Math.sin(a) * 7.5); c.lineTo(12 + Math.cos(a) * 10.5, 12 + Math.sin(a) * 10.5); } c.moveTo(19, 12); c.arc(12, 12, 7, 0, 6.283); c.moveTo(15, 12); c.arc(12, 12, 3, 0, 6.283); },
    chart: (c) => { c.moveTo(3, 21); c.lineTo(21, 21); c.moveTo(6, 18); c.lineTo(6, 12); c.moveTo(11, 18); c.lineTo(11, 7); c.moveTo(16, 18); c.lineTo(16, 10); c.moveTo(20, 18); c.lineTo(20, 4); },
    user: (c) => { c.moveTo(16, 8); c.arc(12, 8, 4, 0, 6.283); c.moveTo(4, 21); c.quadraticCurveTo(4, 14, 12, 14); c.quadraticCurveTo(20, 14, 20, 21); },
    check: (c) => { c.moveTo(4, 12.5); c.lineTo(9.5, 18); c.lineTo(20, 6); },
    bolt: (c) => { c.moveTo(13, 2); c.lineTo(5, 13.5); c.lineTo(11.5, 13.5); c.lineTo(10.5, 22); c.lineTo(19, 10); c.lineTo(12.5, 10); c.closePath(); },
    globe: (c) => { c.moveTo(21, 12); c.arc(12, 12, 9, 0, 6.283); c.moveTo(3, 12); c.lineTo(21, 12); c.moveTo(12, 3); c.bezierCurveTo(7, 7, 7, 17, 12, 21); c.moveTo(12, 3); c.bezierCurveTo(17, 7, 17, 17, 12, 21); },
    heart: (c) => { c.moveTo(12, 20); c.bezierCurveTo(2, 13, 3, 4, 8.5, 4.5); c.bezierCurveTo(10.5, 4.7, 11.5, 6, 12, 7); c.bezierCurveTo(12.5, 6, 13.5, 4.7, 15.5, 4.5); c.bezierCurveTo(21, 4, 22, 13, 12, 20); },
    star: (c) => { for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.2 : 9.5, a = -Math.PI / 2 + i * Math.PI / 5; c[i ? "lineTo" : "moveTo"](12 + Math.cos(a) * r, 12.5 + Math.sin(a) * r); } c.closePath(); },
    cart: (c) => { c.moveTo(2, 4); c.lineTo(5, 4); c.lineTo(7.5, 15); c.lineTo(18.5, 15); c.lineTo(20.5, 7); c.lineTo(6, 7); c.moveTo(10, 19.5); c.arc(9, 19.5, 1.4, 0, 6.283); c.moveTo(18, 19.5); c.arc(17, 19.5, 1.4, 0, 6.283); },
    play: (c) => { c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); },
    lock: (c) => { c.rect(5, 11, 14, 10); c.moveTo(8, 11); c.lineTo(8, 7.5); c.arc(12, 7.5, 4, Math.PI, 0); c.lineTo(16, 11); },
    chat: (c) => { c.moveTo(4, 5); c.lineTo(20, 5); c.lineTo(20, 16); c.lineTo(10, 16); c.lineTo(5, 20); c.lineTo(6, 16); c.lineTo(4, 16); c.closePath(); },
    bell: (c) => { c.moveTo(6, 17); c.lineTo(6, 11); c.bezierCurveTo(6, 4, 18, 4, 18, 11); c.lineTo(18, 17); c.lineTo(20, 18.5); c.lineTo(4, 18.5); c.closePath(); c.moveTo(10, 21); c.lineTo(14, 21); },
    doc: (c) => { c.moveTo(6, 2.5); c.lineTo(14, 2.5); c.lineTo(19, 7.5); c.lineTo(19, 21.5); c.lineTo(6, 21.5); c.closePath(); c.moveTo(9, 11); c.lineTo(16, 11); c.moveTo(9, 14.5); c.lineTo(16, 14.5); c.moveTo(9, 18); c.lineTo(13, 18); },
    pin: (c) => { c.moveTo(12, 22); c.bezierCurveTo(5, 14, 5, 10, 5, 9); c.arc(12, 9, 7, Math.PI, 0); c.bezierCurveTo(19, 10, 19, 14, 12, 22); c.moveTo(14.5, 9); c.arc(12, 9, 2.5, 0, 6.283); },
    cloud: (c) => { c.moveTo(7, 18); c.bezierCurveTo(1.5, 18, 2, 11, 7, 11.5); c.bezierCurveTo(7.5, 5, 16, 4.5, 17, 10.5); c.bezierCurveTo(22.5, 10.5, 22.5, 18, 17, 18); c.closePath(); },
    search: (c) => { c.moveTo(17, 10); c.arc(10.5, 10.5, 6.5, 0, 6.283); c.moveTo(15.5, 15.5); c.lineTo(21, 21); },
    phone: (c) => { c.rect(7, 2.5, 10, 19); c.moveTo(11, 18.5); c.lineTo(13, 18.5); },
    mail: (c) => { c.rect(3, 5.5, 18, 13); c.moveTo(3, 6); c.lineTo(12, 13); c.lineTo(21, 6); },
    clock: (c) => { c.moveTo(21, 12); c.arc(12, 12, 9, 0, 6.283); c.moveTo(12, 7); c.lineTo(12, 12); c.lineTo(15.5, 14); },
    leaf: (c) => { c.moveTo(4, 20); c.bezierCurveTo(4, 8, 10, 4, 20, 4); c.bezierCurveTo(20, 14, 14, 20, 4, 20); c.moveTo(4, 20); c.lineTo(14, 10); },
    truck: (c) => { c.rect(2, 7, 12, 9); c.moveTo(14, 10); c.lineTo(18, 10); c.lineTo(21, 13); c.lineTo(21, 16); c.lineTo(14, 16); c.moveTo(8, 18); c.arc(6.5, 18, 1.6, 0, 6.283); c.moveTo(19, 18); c.arc(17.5, 18, 1.6, 0, 6.283); },
  };
  X.ICONS = Object.keys(IC);
  X.icon = (c, name, x, y, s, col, o = {}) => {
    const f = IC[name] || IC.star; c.save(); c.translate(x - s / 2, y - s / 2); c.scale(s / 24, s / 24);
    c.lineWidth = (o.lw || 2) * 24 / s; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = col; c.fillStyle = o.fill || col;
    if (o.p != null && o.p < 1) c.setLineDash([80 * X.clamp(o.p), 200]);
    c.beginPath(); f(c); if (o.fill) c.fill(); if (o.fill !== "only") c.stroke(); c.restore();
  };
  // a soft stylised person (head + shoulders) \u2014 used by talking-head / testimonial / misc scenes
  X.person = (c, x, y, s, skin, shirt, hair, o = {}) => {
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    const tilt = o.tilt || 0, mouth = o.mouth || 0; c.rotate(tilt);
    c.fillStyle = shirt; c.beginPath(); c.moveTo(-58, 100); c.bezierCurveTo(-58, 40, -30, 26, 0, 26); c.bezierCurveTo(30, 26, 58, 40, 58, 100); c.closePath(); c.fill();
    c.fillStyle = X.shade(skin, -.12); c.fillRect(-10, 6, 20, 24);
    c.fillStyle = skin; c.beginPath(); c.ellipse(0, -12, 24, 29, 0, 0, 6.283); c.fill();
    c.fillStyle = hair; c.beginPath(); c.ellipse(0, -28, 26, 17, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(-20, -18, 7, 14, .2, 0, 6.283); c.fill(); c.beginPath(); c.ellipse(20, -18, 7, 14, -.2, 0, 6.283); c.fill();
    if (!o.noFace) {
      const blink = o.blink ? .15 : 1; c.fillStyle = X.shade(skin, -.6);
      c.beginPath(); c.ellipse(-9, -10, 2.4, 3 * blink, 0, 0, 6.283); c.fill(); c.beginPath(); c.ellipse(9, -10, 2.4, 3 * blink, 0, 0, 6.283); c.fill();
      c.fillStyle = X.shade(skin, -.45); c.beginPath(); c.ellipse(0, 6, 6, 1.5 + mouth * 4, 0, 0, 6.283); c.fill();
    }
    c.restore();
  };


  /* ---------------- generic fallback scene ---------------- */
  SC.title = (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const k = Math.floor(t / (L / 4)) % 4, ln = S.lines[k], p = X.E(t % (L / 4), 0, .7, "back");
    X.text(c, ln.j, W / 2, H / 2 - 10 + (1 - p) * 30, { size: Math.min(W, H) * .1, fam: S.f1, color: pal[1], alpha: p });
    X.text(c, ln.c, W / 2, H / 2 + Math.min(W, H) * .1, { size: Math.min(W, H) * .045, w: 400, fam: S.f2, color: pal[2], alpha: X.E(t % (L / 4), .3, 1) });
  };

  /* ---------------- registry ---------------- */
  const DATA = () => MGP.packsData || MGP.paketData || { kategori: {}, paket: {} };
  function get(id) { const P = DATA().paket[id]; return P ? Object.assign({ id }, P) : null; }
  const fontSpec = (f) => f + (WG[f] ? ":" + WG[f] : "");
  function ctxOf(id, o) {
    o = o || {};
    const P = get(id) || { id: String(id), kat: "", nama: o.title || String(id), inti: "", pal: null, font: [], ar: "16:9", fx: {} };
    const fx = Object.assign({}, P.fx || {});
    if (o.scene) fx.s = o.scene;
    if (o.variant != null) fx.v = o.variant;
    const ar = o.ar || P.ar || "16:9";
    const [W, H] = SIZE[ar] || SIZE["16:9"];
    const pal = (o.pal || P.pal || ["#111", "#fff", "#f2d796", "#888", "#222"]).slice();
    while (pal.length < 5) pal.push(pal[pal.length - 1]);
    const K = DATA().kategori[P.kat];
    const norm = (x) => ({ j: x.j != null ? x.j : x.judul || "", c: x.c != null ? x.c : x.cap || "" });
    const src = (o.lines && o.lines.length ? o.lines : null) || (fx.lines && fx.lines.length ? fx.lines : null) || (K && K.contoh) || [{ j: P.nama, c: P.inti }];
    const lines = src.map(norm);
    while (lines.length < 4) lines.push(lines[lines.length % Math.max(1, lines.length)] || { j: P.nama, c: "" });
    const font = o.font || P.font || [];
    const seed = String(P.id || "").split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
    return { W, H, L, pal, f1: font[0] || "Inter", f2: font[1] || "Inter", v: fx.v || "", title: o.title || P.nama, kat: P.kat, id: P.id, lines,
      u: Math.min(W, H) / 100, portrait: H > W, scene: fx.s || "title", fx, r: (i) => X.hash(i + seed),
      fonts: [font[0], font[1]].concat(fx.fonts || []).filter(Boolean) };
  }
  const FONT_P = {};
  function ready(id, o) {
    const S = typeof id === "object" ? id : ctxOf(id, o);
    if ((o && o.fonts === false) || !S.fonts.length) return Promise.resolve();
    const key = S.fonts.join("|");
    return FONT_P[key] || (FONT_P[key] = C.fontsReady(S.fonts.map(fontSpec)));
  }
  // scenes cache measured text / offscreen layers on S._*; drop them once real fonts arrive
  const clearCache = (S) => { Object.keys(S).forEach((k) => { if (k[0] === "_") delete S[k]; }); };
  function frame(c, t, S, o) {
    o = o || {};
    t = o.loop === false ? C.clamp(t, 0, L - 1e-4) : ((t % L) + L) % L;
    const fn = SC[S.scene] || SC.title;
    c.save();
    try { fn(c, t, S, X); }
    catch (e) { if (!S.__warned) { S.__warned = true; if (typeof console !== "undefined") console.warn("[MGP.paket]", S.id, e); } c.restore(); c.save(); SC.title(c, 1.2, S, X); }
    c.restore();
    const seamOn = o.seam !== false && o.loop !== false && !(S.fx && S.fx.noSeam);
    if (seamOn) { const seam = Math.max(X.seg(t, L - .3, L), 1 - X.seg(t, 0, .22)); if (seam > 0) { c.save(); c.globalAlpha = seam * .9; c.fillStyle = S.pal[0]; c.fillRect(0, 0, S.W, S.H); c.restore(); } }
  }
  const states = new WeakMap();
  const state = (id, o) => ctxOf(id, o);
  /** draw package `id` at time t into ctx, fitted to opts.width x opts.height (default logical size) */
  function render(id, c, t, o) {
    o = o || {};
    let m = states.get(o); if (!m) { m = {}; states.set(o, m); }
    let S = m[id];
    if (!S) { S = m[id] = ctxOf(id, o); if (o.fonts !== false) ready(S, o).then(() => clearCache(S)); }
    const bw = o.width || S.W, bh = o.height || S.H, k = Math.min(bw / S.W, bh / S.H);
    c.save(); c.translate((bw - S.W * k) / 2, (bh - S.H * k) / 2); c.scale(k, k);
    c.beginPath(); c.rect(0, 0, S.W, S.H); c.clip();
    frame(c, t, S, o); c.restore();
  }
  /** canvas instance for one package (frame capture / HyperFrames) */
  function create(target, id, o) {
    o = Object.assign({}, o || {});
    const S = ctxOf(id, o), sc = o.scale || 2;
    const W = o.width || Math.round(S.W * sc), H = o.height || Math.round(S.H * sc);
    const cv = C.setup(target, { width: W, height: H, dpr: o.dpr, fit: o.fit });
    const D = o.duration || L;
    const inst = { name: "paket", id, canvas: cv.canvas, ctx: cv.ctx, W, H, opts: o, state: S, duration: D, t: 0,
      draw(t) {
        inst.t = t; const g = cv.begin(), k = Math.min(W / S.W, H / S.H);
        g.save(); g.translate((W - S.W * k) / 2, (H - S.H * k) / 2); g.scale(k, k); frame(g, t, S, o); g.restore(); return inst;
      },
      seek(t) { return inst.draw(t); },
      timeline() { return C.timeline(inst); },
      destroy() { if (cv.canvas.parentNode && cv.canvas !== target) cv.canvas.parentNode.removeChild(cv.canvas); },
    };
    inst.ready = o.fonts === false ? Promise.resolve() : ready(S, o).then(() => { clearCache(S); inst.draw(inst.t); });
    return inst;
  }
  const engine = { L, SIZE, X, SC, def: (name, fn) => { SC[name] = fn; }, has: (n) => !!SC[n] };
  MGP.packs = MGP.paket = {   // MGP.packs (v2.4); old name MGP.paket
    _engine: engine, L, SIZE, X,
    ids: () => Object.keys(DATA().paket),
    get, state, render, create, ready,
    scenes: () => Object.keys(SC).filter((k) => k !== "title"),
    categories: () => DATA().kategori,
    kategori: () => DATA().kategori,
    def: engine.def,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
