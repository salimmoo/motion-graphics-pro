/**
 * MGP core \u2014 shared helpers for the Motion Graphics library (lib/).
 *
 * Load first, as a classic script (works from file://):
 *   <script src="lib/core/mgp-core.js"></script>
 * or through the ES-module entry `lib/index.mjs`.
 *
 * Everything here is pure and deterministic (no Math.random, no requestAnimationFrame).
 *
 * MGP.core = {
 *   // random / noise
 *   rng(seed) -> () => number in [0,1)       mulberry32, same seed = same sequence
 *   hash(n) -> [0,1)                          stateless hash of a number
 *   hashStr(s) -> int                         stable integer from a string (for seeds)
 *   noise1(x) -> [-1,1]                       smooth value noise
 *   wob(seed, t, amp, speed)                  noise1 driven by time (hand-held wobble, boil)
 *   // math
 *   clamp(v,a=0,b=1), lerp(a,b,k), seg(t,a,b) (0..1 progress of t over [a,b]), smooth01(u),
 *   win(t,a,b,fi,fo) fade-in/out window, stepT(t,fps) "on twos" when fps=12,
 *   ease.{lin,in,out,out5,inOut,sine,back,elastic,bounce,inQuad,outQuad,inOutQuad}, E(t,a,b,ease)
 *   spring(p,k=7,z=4.5) damped spring 0->1, springAt(t, {freq, damping}) closed-form spring
 *   key(keys, t)  keys = [[t0,v0],[t1,v1],...] smoothstep between keys
 *   // curves
 *   catmull(p0,p1,p2,p3,u,alpha=0.5) -> point (centripetal Catmull-Rom, 2D or 3D)
 *   catmullPts(pts, perSeg=12, closed=false, alpha=0.5) -> dense polyline
 *   catmullPath(ctx, pts, closed=false, alpha=0.5) adds a smooth bezier path through pts
 *   polyLen(pts), polyAt(pts, u) -> [x,y,angle]  point at arc-length fraction u
 *   // 3D camera (world: x east, y up, z north; azimuth from north clockwise)
 *   cam(pos, yaw, pitch, f, cx, cy, near=1), camOrbit(target, dist, height, az, pitch, f, cx, cy)
 *   camC(cam, P) -> camera space [x,y,z], scr(cam, q) -> screen [x,y], project(cam,P) -> [x,y,z]|null
 *   clipNear(pts3cam, near), polyScr(cam, pts3), horizonY(cam), sunDir(az, el)
 *   dot3, cross3, sub3, add3, scale3, norm3, len3
 *   // colour
 *   rgb(c) -> [r,g,b] (hex or rgb()), hex(rgb) -> "#rrggbb", mix(a,b,k), rgba(c,a), shade(c,k) (+lighter/-darker), lum(c)
 *   // canvas
 *   setup(canvasOrEl, {width,height,dpr,fit}) -> {canvas, ctx, W, H, dpr, begin(), resize()}
 *   offscreen(w,h) -> canvas, fontsReady(families[]) -> Promise
 *   // modules
 *   defineModule(name, spec) -> api   (see below)
 *   timeline(inst) -> paused Gerak/GSAP timeline (window.gsap) that seeks inst (or a tiny shim when neither is loaded)
 *   expose(inst, {id}) -> sets window.__duration, __seek, __timeline, __timelines[id], __ready
 * }
 *
 * defineModule(name, spec):
 *   spec.defaults  : default options (shallow-merged with the caller's options)
 *   spec.size      : [W,H] default logical size in CSS px (options.width/height override)
 *   spec.duration  : number | (opts) => number   (seconds)
 *   spec.setup(S)  : optional, called once per instance; S = {opts, W, H, rng, cache:{}}; precompute here
 *   spec.render(ctx, t, S) : draw the WHOLE frame at time t (seconds) in logical units W x H. No state between frames.
 *   spec.dom       : true when the module drives a DOM element instead of a canvas (create gets the element,
 *                    render(el, t, S) is called with the element)
 *   Returns api = { name, defaults, create(canvasOrEl, opts), render(ctx, t, opts) }
 *   create() returns inst = { name, canvas, ctx, el, W, H, opts, duration, ready, draw(t), seek(t), timeline(), state, destroy() }
 *   api.render(ctx, t, opts) draws one frame onto an existing context (for composing several modules in one canvas);
 *   opts.width/height give the logical box (default spec.size).
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  if (MGP.core && MGP.core.__v) return;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;

  /* ---------------- random ---------------- */
  function rng(seed) {
    let s = (typeof seed === "string" ? hashStr(seed) : seed | 0) >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function hashStr(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const lerp = (a, b, k) => a + (b - a) * k;
  const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
  const wob = (seed, t, amp = 1, sp = 1) => noise1(seed * 9.13 + t * sp) * amp;

  /* ---------------- math / easing ---------------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  const smooth01 = (u) => (u = clamp(u), u * u * (3 - 2 * u));
  const win = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
  const stepT = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
  const ease = {
    lin: (p) => p,
    in: (p) => p * p * p,
    out: (p) => 1 - Math.pow(1 - p, 3),
    out5: (p) => 1 - Math.pow(1 - p, 5),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inQuad: (p) => p * p,
    outQuad: (p) => 1 - (1 - p) * (1 - p),
    inOutQuad: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    sine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    elastic: (p) => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
    bounce: (p) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; },
  };
  const E = (t, a, b, e = "out") => (typeof e === "function" ? e : ease[e] || ease.out)(seg(t, a, b));
  const spring = (p, k = 7, z = 4.5) => (p <= 0 ? 0 : 1 - Math.exp(-z * p) * Math.cos(k * p));
  /** closed-form damped spring step response; t in seconds, freq in Hz, damping ratio zeta (0..1) */
  function springAt(t, o = {}) {
    const f = o.freq || 2, z = o.damping == null ? 0.35 : o.damping; if (t <= 0) return 0;
    const w = TAU * f;
    if (z >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  function key(K, t) {
    if (!K.length) return 0; if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const a = K[i - 1], b = K[i], u = smooth01((t - a[0]) / (b[0] - a[0])); return a[1] + (b[1] - a[1]) * u; }
    return K[K.length - 1][1];
  }

  /* ---------------- curves ---------------- */
  function catmull(p0, p1, p2, p3, u, alpha = 0.5) {
    const n = p1.length, d = (a, b) => { let s = 0; for (let i = 0; i < n; i++) s += (b[i] - a[i]) ** 2; return Math.pow(Math.sqrt(s) || 1e-6, alpha); };
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), t = t1 + (t2 - t1) * u;
    const L = (a, b, ta, tb) => a.map((v, i) => (ta === tb ? v : ((tb - t) / (tb - ta)) * v + ((t - ta) / (tb - ta)) * b[i]));
    const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
    return L(B1, B2, t1, t2);
  }
  function catmullPts(pts, perSeg = 12, closed = false, alpha = 0.5) {
    const n = pts.length; if (n < 2) return pts.slice(); const out = [];
    const P = (i) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) for (let k = 0; k < perSeg; k++) out.push(catmull(P(i - 1), P(i), P(i + 1), P(i + 2), k / perSeg, alpha));
    out.push(closed ? pts[0].slice() : pts[n - 1].slice());
    return out;
  }
  function catmullPath(g, pts, closed = false, alpha = 0.5, perSeg = 10) {
    const d = catmullPts(pts, perSeg, closed, alpha); if (!d.length) return;
    g.moveTo(d[0][0], d[0][1]); for (let i = 1; i < d.length; i++) g.lineTo(d[i][0], d[i][1]); if (closed) g.closePath();
  }
  function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function polyAt(pts, u) {
    const tot = polyLen(pts); let rem = tot * clamp(u);
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (rem <= d && d > 0) { const k = rem / d; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])]; } rem -= d; }
    const a = pts[pts.length - 2] || pts[0], b = pts[pts.length - 1]; return [b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0])];
  }

  /* ---------------- 3D camera (port of motion-graphics scripts/space3d.py (old ruang3d.py)) ---------------- */
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm3 = (a) => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function cam(pos, yaw, pitch, f, cx, cy, near = 1) {
    const cY = Math.cos(yaw * RAD), sY = Math.sin(yaw * RAD), cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
    return { pos, yaw, pitch, f, cx, cy, near, fwd: [sY * cp, -sp, cY * cp], right: [cY, 0, -sY], up: [sY * sp, cp, cY * sp] };
  }
  const camOrbit = (tg, d, h, az, pitch, f, cx, cy, near = 1) => { const a = az * RAD; return cam([tg[0] + d * Math.sin(a), h, tg[2] + d * Math.cos(a)], (az + 180) % 360, pitch, f, cx, cy, near); };
  const camC = (c, P) => { const d = [P[0] - c.pos[0], P[1] - c.pos[1], P[2] - c.pos[2]]; return [dot3(d, c.right), dot3(d, c.up), dot3(d, c.fwd)]; };
  const scr = (c, q) => [clamp(c.cx + (c.f * q[0]) / q[2], -2e5, 2e5), clamp(c.cy - (c.f * q[1]) / q[2], -2e5, 2e5)];
  const project = (c, P) => { const q = camC(c, P); if (q[2] < c.near) return null; const s = scr(c, q); return [s[0], s[1], q[2]]; };
  const horizonY = (c) => c.cy - c.f * Math.tan(c.pitch * RAD);
  const sunDir = (az, el) => [Math.sin(az * RAD) * Math.cos(el * RAD), Math.sin(el * RAD), Math.cos(az * RAD) * Math.cos(el * RAD)];
  function clipNear(cs, near) {
    const out = [], n = cs.length;
    for (let i = 0; i < n; i++) { const a = cs[i], b = cs[(i + 1) % n], ia = a[2] >= near, ib = b[2] >= near; if (ia) out.push(a); if (ia !== ib) { const t = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } }
    return out;
  }
  const polyScr = (c, pts3) => { const cs = clipNear(pts3.map((P) => camC(c, P)), c.near); return cs.length < 3 ? null : cs.map((q) => scr(c, q)); };

  /* ---------------- colour ---------------- */
  function rgb(h) {
    if (Array.isArray(h)) return h.slice(0, 3);
    h = String(h).trim(); const m = h.match(/rgba?\(([^)]+)\)/);
    if (m) return m[1].split(",").slice(0, 3).map((v) => Math.round(parseFloat(v)) || 0);
    h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const hex = (r) => "#" + r.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); k = clamp(k); return hex(A.map((v, i) => v + (B[i] - v) * k)); };
  const rgba = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
  const shade = (c, k) => (k >= 0 ? mix(c, "#ffffff", k) : mix(c, "#000000", -k));
  const lum = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /* ---------------- canvas ---------------- */
  const hasDOM = typeof document !== "undefined";
  function offscreen(w, h) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    if (hasDOM) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    throw new Error("MGP: no canvas available");
  }
  /** Prepare a canvas. canvasOrEl: <canvas>, a container element (a canvas is appended), or a CSS selector. */
  function setup(target, o = {}) {
    if (typeof target === "string") target = document.querySelector(target);
    let canvas = target;
    if (!canvas || !canvas.getContext) { canvas = document.createElement("canvas"); if (target) target.appendChild(canvas); }
    const S = { canvas, ctx: canvas.getContext("2d"), W: o.width || 640, H: o.height || 360, dpr: 1 };
    S.resize = (W, H, dpr) => {
      if (W) S.W = W; if (H) S.H = H;
      S.dpr = dpr || o.dpr || (typeof devicePixelRatio !== "undefined" ? Math.min(2, devicePixelRatio || 1) : 1);
      canvas.width = Math.round(S.W * S.dpr); canvas.height = Math.round(S.H * S.dpr);
      if (canvas.style) { if (o.fit) { canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.objectFit = "contain"; } else { canvas.style.width = S.W + "px"; canvas.style.height = S.H + "px"; } canvas.style.display = "block"; }
    };
    S.begin = () => { const g = S.ctx; g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0; g.filter = "none"; g.setLineDash([]); g.clearRect(0, 0, S.W, S.H); return g; };
    S.resize(S.W, S.H, o.dpr);
    return S;
  }
  const FONT_CACHE = {};
  /**
   * Load Google Fonts by family name ("Poppins:wght@400;700"); resolves when loaded or after 4 s.
   * A family that already has a local @font-face (e.g. lib/fonts.css, the bundled fonts of Rekam) is not
   * fetched from Google; it is only loaded. Under Rekam the Google request itself is served locally too.
   */
  function fontsReady(fams) {
    if (!hasDOM || !fams || !fams.length) return Promise.resolve();
    return Promise.all(fams.filter(Boolean).map((spec) => {
      if (FONT_CACHE[spec]) return FONT_CACHE[spec];
      const [fam, axes] = spec.split(":");
      // every local face of the family is loaded up front (italic too), so a canvas never draws with a fallback first
      const local = document.fonts ? [...document.fonts].filter((f) => f.family.replace(/^["']|["']$/g, "") === fam) : [];
      if (local.length) return (FONT_CACHE[spec] = Promise.all(local.map((f) => f.load().catch(() => {}))).then(() => {}));
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=" + fam.replace(/ /g, "+") + (axes ? ":" + axes : "") + "&display=block";
      document.head.appendChild(l);
      return (FONT_CACHE[spec] = new Promise((res) => {
        const done = () => (document.fonts ? Promise.all([document.fonts.load(`400 20px "${fam}"`), document.fonts.load(`700 20px "${fam}"`)]).then(res, res) : res());
        l.onload = done; l.onerror = res; setTimeout(res, 4000);
      }));
    }));
  }

  /* ---------------- timeline / expose ---------------- */
  function shimTimeline(inst, D) {
    let cur = 0;
    const tl = { _shim: true, duration: () => D, totalDuration: () => D, time(v) { if (v == null) return cur; cur = clamp(v, 0, D); inst.seek(cur); return tl; },
      seek(v) { return tl.time(v); }, totalTime(v) { return tl.time(v); }, progress(p) { if (p == null) return D ? cur / D : 0; return tl.time(p * D); }, pause() { return tl; }, play() { return tl; }, paused() { return true; }, kill() {} };
    return tl;
  }
  function timeline(inst) {
    const D = inst.duration;
    const g = root.gsap;
    if (!g || !g.timeline) return shimTimeline(inst, D);
    const proxy = { t: 0 };
    const tl = g.timeline({ paused: true, onUpdate: () => inst.seek(proxy.t) });
    tl.to(proxy, { t: D, duration: D, ease: "none", onUpdate: () => inst.seek(proxy.t) }, 0);
    return tl;
  }
  /** Publish an instance (or {duration, seek, timeline}) for frame capture. */
  function expose(inst, o = {}) {
    if (typeof window === "undefined") return inst;
    const id = o.id || "main";
    const tl = inst.timeline ? inst.timeline() : shimTimeline(inst, inst.duration);
    window.__duration = inst.duration;
    window.__seek = (t) => { if (tl && !tl._shim && tl.seek) { tl.seek(t, false); } inst.seek(t); return true; };
    window.__timeline = tl;
    window.__timelines = window.__timelines || {}; window.__timelines[id] = tl;
    window.__ready = Promise.resolve(inst.ready).then(() => { inst.seek(o.t0 || 0); return true; });
    inst.seek(o.t0 || 0);
    return inst;
  }

  /* ---------------- module factory ---------------- */
  function defineModule(name, spec) {
    const defaults = spec.defaults || {};
    const size = spec.size || [640, 360];
    const durOf = (opts) => (typeof spec.duration === "function" ? spec.duration(opts) : spec.duration || opts.duration || 8);
    function makeState(opts, W, H) {
      const S = { opts, W, H, rng: rng(opts.seed == null ? hashStr(name) : opts.seed), cache: {}, name };
      if (spec.setup) spec.setup(S);
      return S;
    }
    // English option names / values (v2.4): spec.aliases {english: internal}, spec.valueAliases {internal: {english: internal}}
    const AL = spec.aliases || {}, VAL = spec.valueAliases || {};
    function translate(o) {
      if (!o || typeof o !== "object") return o;
      let out = null;
      for (const k in o) if (Object.prototype.hasOwnProperty.call(AL, k)) { out = out || Object.assign({}, o); if (out[AL[k]] === undefined) out[AL[k]] = o[k]; delete out[k]; }
      for (const k in VAL) { const src = out || o; const v = src[k]; if (typeof v === "string" && Object.prototype.hasOwnProperty.call(VAL[k], v)) { out = out || Object.assign({}, o); out[k] = VAL[k][v]; } }
      return out || o;
    }
    function mergeOpts(o) { const out = Object.assign({}, defaults, translate(o) || {}); return out; }
    function create(target, o) {
      const opts = mergeOpts(o);
      const W = opts.width || size[0], H = opts.height || size[1];
      if (spec.dom) {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        const S = makeState(opts, W, H); S.el = el;
        if (spec.mount) spec.mount(el, S);
        const inst = { name, el, W, H, opts, state: S, duration: durOf(opts), t: 0, ready: S.ready || Promise.resolve(),
          draw(t) { inst.t = t; spec.render(el, opts.loop ? ((t % inst.duration) + inst.duration) % inst.duration : t, S); return inst; },
          seek(t) { return inst.draw(t); }, timeline() { return timeline(inst); }, destroy() { if (spec.unmount) spec.unmount(el, S); } };
        return inst;
      }
      const C = setup(target, { width: W, height: H, dpr: opts.dpr, fit: opts.fit });
      const S = makeState(opts, W, H); S.canvas = C.canvas;
      const inst = { name, canvas: C.canvas, ctx: C.ctx, el: C.canvas, W, H, opts, state: S, duration: durOf(opts), t: 0,
        ready: Promise.resolve(S.ready),
        draw(t) {
          inst.t = t; const g = C.begin();
          const tt = opts.loop ? ((t % inst.duration) + inst.duration) % inst.duration : t;
          g.save(); spec.render(g, tt, S); g.restore(); return inst;
        },
        seek(t) { return inst.draw(t); },
        timeline() { return timeline(inst); },
        resize(w, h, dpr) { C.resize(w, h, dpr); inst.W = S.W = C.W; inst.H = S.H = C.H; if (spec.setup) { S.cache = {}; spec.setup(S); } return inst.draw(inst.t); },
        destroy() { if (C.canvas.parentNode && C.canvas !== target) C.canvas.parentNode.removeChild(C.canvas); },
      };
      return inst;
    }
    const states = typeof WeakMap !== "undefined" ? new WeakMap() : null;
    /** draw one frame of this module into an existing 2D context, inside the box opts.width x opts.height */
    function render(ctx, t, o) {
      o = o || {};
      let S = states && states.get(o);
      if (!S) { const opts = mergeOpts(o); S = makeState(opts, opts.width || size[0], opts.height || size[1]); if (states) states.set(o, S); }
      ctx.save(); spec.render(ctx, t, S); ctx.restore();
    }
    const api = { name, defaults, size, create, render, duration: durOf, spec, translateOptions: translate };
    return api;
  }

  /* ---------------- prinsip gerak lanjutan (v2.4) ---------------- */
  // Preset pegas berbasis massa m, kekakuan k, redaman c. Rasio redaman zeta = c / (2 sqrt(m k)), omega0 = sqrt(k / m).
  // Angka yang sama dipakai Gerak ("pegas.memantul" dst.) dan MGP.spring.fn.PEGAS.
  const PEGAS = {
    memantul: { massa: 1, kekakuan: 180, redaman: 12 },                     // zeta 0,45 \u00b7 2,1 Hz \u00b7 pantul 2-3 kali
    sigap: { massa: 1, kekakuan: 180, redaman: 2 * Math.sqrt(180) },        // zeta 1 (kritis) \u00b7 tercepat tanpa pantul
    berat: { massa: 4, kekakuan: 160, redaman: 3 * Math.sqrt(640) },        // zeta 1,5 \u00b7 lambat, berat, tanpa pantul
  };
  // English preset names (v2.4): bouncy = memantul, snappy = sigap, heavy = berat; English keys mass/stiffness/damping/frequency.
  const SPRING_NAMES = { bouncy: "memantul", snappy: "sigap", heavy: "berat" };
  const SPRINGS = {};
  for (const n in SPRING_NAMES) { const q = PEGAS[SPRING_NAMES[n]]; SPRINGS[n] = { mass: q.massa, stiffness: q.kekakuan, damping: q.redaman, massa: q.massa, kekakuan: q.kekakuan, redaman: q.redaman }; }
  const springKeys = (p) => (p && typeof p === "object" && (p.mass != null || p.stiffness != null || p.damping != null || p.frequency != null)
    ? Object.assign({}, p, { massa: p.massa != null ? p.massa : p.mass, kekakuan: p.kekakuan != null ? p.kekakuan : p.stiffness, redaman: p.redaman != null ? p.redaman : p.damping, frekuensi: p.frekuensi != null ? p.frekuensi : p.frequency })
    : p);
  const pegasOpsi = (p) => (typeof p === "string" ? PEGAS[SPRING_NAMES[p] || p] || PEGAS.memantul : springKeys(p) || PEGAS.memantul);
  /** {massa, kekakuan, redaman, zeta, omega, frekuensi (Hz)} dari nama preset atau objek. Boleh juga {zeta, frekuensi}. */
  function pegasInfo(p) {
    p = pegasOpsi(p);
    if (p.zeta != null && p.kekakuan == null) { const m = p.massa || 1, w = TAU * (p.frekuensi || p.freq || 2); return pegasInfo({ massa: m, kekakuan: m * w * w, redaman: 2 * p.zeta * m * w }); }
    const m = p.massa || 1, k = p.kekakuan == null ? 180 : p.kekakuan, c = p.redaman == null ? 12 : p.redaman, w = Math.sqrt(k / m);
    return { mass: m, stiffness: k, damping: c, zeta: c / (2 * Math.sqrt(m * k)), omega: w, frequency: w / TAU, massa: m, kekakuan: k, redaman: c, frekuensi: w / TAU };
  }
  /** keadaan [x, v] pegas bentuk tertutup pada detik t: m x'' + c x' + k (x - ke) = 0, x(0) = dari, x'(0) = v0. Analitik, aman untuk seek acak. */
  function pegasKeadaan(t, p, o = {}) {
    const I = pegasInfo(p), from = o.from != null ? o.from : o.dari == null ? 0 : o.dari, to = o.to != null ? o.to : o.ke == null ? 1 : o.ke, v0 = o.v0 || 0, z = I.zeta, w = I.omega;
    if (t <= 0) return [from, v0];
    const x0 = from - to;
    if (Math.abs(z - 1) < 1e-6) { const e = Math.exp(-w * t), B = v0 + w * x0; return [to + e * (x0 + B * t), e * (B - w * (x0 + B * t))]; }
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * t), A = x0, B = (v0 + z * w * x0) / wd, c = Math.cos(wd * t), s = Math.sin(wd * t);
      return [to + e * (A * c + B * s), e * (-z * w * (A * c + B * s) + (-A * wd * s + B * wd * c))];
    }
    const r = w * Math.sqrt(z * z - 1), r1 = -z * w + r, r2 = -z * w - r, c2 = (v0 - r1 * x0) / (r2 - r1), c1 = x0 - c2;
    return [to + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t), c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t)];
  }
  const pegas = (t, p, o) => pegasKeadaan(t, p, o)[0];
  const PEGAS_DUR = {};
  /** detik sampai pegas 0 -> 1 tenang di dalam +-tol (bawaan 0,5 %) */
  function pegasDurasi(p, tol = 0.005) {
    const key = typeof p === "string" ? p + "|" + tol : null; if (key && PEGAS_DUR[key]) return PEGAS_DUR[key];
    let last = 0; for (let i = 1; i <= 2400; i++) { const t = i / 120; if (Math.abs(pegas(t, p) - 1) > tol) last = t; }
    const d = Math.max(1 / 30, last + 1 / 120); if (key) PEGAS_DUR[key] = d; return d;
  }
  /** pegas sebagai ease 0..1 (bentuknya hanya ditentukan zeta); tepat 0 di 0 dan 1 di 1 */
  function pegasEase(p, tol) {
    const T = pegasDurasi(p, tol), e1 = pegas(T, p);
    return (u) => (u <= 0 ? 0 : u >= 1 ? 1 : pegas(u * T, p) + (1 - e1) * u * u * u * u);
  }

  /* keyframe [[t, nilai, ease?], ...] (nilai angka atau array); ease per segmen = nama core.ease / fungsi, bawaan linier (seperti AE) */
  function nilaiKunci(K, t, e0) {
    const ev = (a, b, u) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * u) : a + (b - a) * u);
    if (!K.length) return 0; if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) {
      const a = K[i - 1], b = K[i], ez = b[2] || a[3] || e0 || "lin", f = typeof ez === "function" ? ez : ease[ez] || ease.lin;
      return ev(a[1], b[1], f((t - a[0]) / (b[0] - a[0])));
    }
    return K[K.length - 1][1];
  }
  /**
   * inersia: pantulan teredam sesudah keyframe, digerakkan kecepatan datang (inertial bounce).
   *   y(t) = nilai(t) + v(tk-) * amp * sin(2 pi freq dt) / e^(decay dt),  dt = t - tk, tk = keyframe terakhir <= t
   * sumber: keyframe [[t, nilai, ease?], ...] atau fungsi (t) => nilai (beri o.kunci = [waktu keyframe])
   * o: amp 0.05, freq 2, decay 4, maks 1 (detik jendela pantul), ease (bawaan segmen, "lin")
   * Murni fungsi t: seek ke mana pun memberi nilai yang sama. Ease yang tiba dengan kecepatan 0 (ease out) tidak memantul.
   */
  function inersia(sumber, t, o = {}) {
    const amp = o.amp == null ? 0.05 : o.amp, f = o.freq == null ? 2 : o.freq, dec = o.decay == null ? 4 : o.decay, maks = o.max != null ? o.max : o.maks == null ? 1 : o.maks;
    const isFn = typeof sumber === "function", base = isFn ? sumber : (x) => nilaiKunci(sumber, x, o.ease);
    const keys = isFn ? (o.keys || o.kunci || []) : sumber.map((k) => k[0]);
    let tk = null; for (const k of keys) if (k <= t) tk = k;   // kunci pertama: kecepatan datang 0, jadi tanpa pantul
    const y = base(t); if (tk == null) return y;
    const dt = t - tk; if (dt <= 0 || dt >= maks) return y;
    const h = 1e-3, a = base(tk - h), b = base(tk), env = (amp * Math.sin(TAU * f * dt)) / Math.exp(dec * dt);
    return Array.isArray(y) ? y.map((v, i) => v + ((b[i] - a[i]) / h) * env) : y + ((b - a) / h) * env;
  }
  /**
   * tunda: rantai tundaan per indeks (follow-through, overlap). Anak ke-i = induk(t - k * jeda * i).
   * o: jeda (detik per indeks) atau frame + fps (bawaan 3 frame @ 24 fps), k 1
   */
  function tunda(induk, t, indeks, o = {}) {
    const jd = o.delay != null ? o.delay : o.jeda, jeda = jd != null ? jd : (o.frame == null ? 3 : o.frame) / (o.fps || 24), k = o.k == null ? 1 : o.k;
    return induk(t - k * jeda * indeks);
  }
  const tundaRantai = (induk, n, o) => (t) => Array.from({ length: n }, (_, i) => tunda(induk, t, i, o));

  /* squash & stretch dengan volume tetap */
  /** s = regangan searah sumbu utama (1 = diam, >1 memanjang, <1 memipih). 2D: sx * sy = 1. Kembali {sx, sy}. */
  const regang = (s) => { s = Math.max(1e-3, s); return { sx: 1 / s, sy: s }; };
  /** 3D: sy = s, sx = sz = 1 / sqrt(s) (sx * sy * sz = 1) */
  const regang3 = (s) => { s = Math.max(1e-3, s); const k = 1 / Math.sqrt(s); return { sx: k, sy: s, sz: k }; };
  /** matriks 2x2 [a, b, c, d] yang meregang s kali sepanjang arah sudut (radian), luas tetap (det = 1) */
  function regangArah(s, sudut) {
    s = Math.max(1e-3, s); const c = Math.cos(sudut), n = Math.sin(sudut), p = s, q = 1 / s;
    return [c * c * p + n * n * q, c * n * (p - q), c * n * (p - q), n * n * p + c * c * q];
  }
  /** regangan dari kecepatan: s = 1 + min(maks, |v| * k); v dalam satuan/detik */
  const regangKecepatan = (v, o = {}) => 1 + Math.min(o.max != null ? o.max : o.maks == null ? 0.35 : o.maks, Math.abs(v) * (o.k == null ? 0.0008 : o.k));
  /** galat volume |sx*sy(*sz) - 1| */
  const galatVolume = (sx, sy, sz = 1) => Math.abs(sx * sy * sz - 1);

  /* stroke konstan saat diskala (padanan vector-effect: non-scaling-stroke untuk kanvas) */
  /** skala transform kanvas saat ini (akar |det|) */
  const skalaKini = (g) => { if (!g || !g.getTransform) return 1; const m = g.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
  /** lebar garis dalam unit lokal supaya tampil px piksel layar (dpr = piksel kanvas per px CSS) */
  const lebarTetap = (g, px, dpr = 1) => (px * dpr) / skalaKini(g);

  /* kuaternion [w, x, y, z] + SLERP (Shoemake 1985) untuk rotasi kamera dan sendi 3D */
  const quatNorm = (q) => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
  /** rotasi sudut (radian) mengitari sumbu [x, y, z] */
  const quatSumbu = (ax, a) => { const n = norm3(ax), s = Math.sin(a / 2); return [Math.cos(a / 2), n[0] * s, n[1] * s, n[2] * s]; };
  const quatKali = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  /** putar vektor v dengan q */
  function quatPutar(q, v) {
    const [w, x, y, z] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
    return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
  }
  /** yaw (mengitari y, derajat), pitch (mengitari x), roll (mengitari z); urutan yaw * pitch * roll */
  const quatEuler = (yaw, pitch = 0, roll = 0) => quatKali(quatKali(quatSumbu([0, 1, 0], yaw * RAD), quatSumbu([1, 0, 0], pitch * RAD)), quatSumbu([0, 0, 1], roll * RAD));
  /** SLERP: busur terpendek, kecepatan sudut tetap; jatuh ke lerp ternormal bila sudut sangat kecil */
  function slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
    if (d > 0.9995) return quatNorm(a.map((v, i) => v + (b[i] - v) * t));
    const om = Math.acos(clamp(d, -1, 1)), so = Math.sin(om), ka = Math.sin((1 - t) * om) / so, kb = Math.sin(t * om) / so;
    return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb, a[3] * ka + b[3] * kb];
  }
  /** arah kamera/benda tanpa roll: interpolasi azimut/elevasi (derajat) lewat lingkaran besar (slerp arah), bukan Euler */
  function slerpArah(az0, el0, az1, el1, k) {
    const A = sunDir(az0, el0), B = sunDir(az1, el1), d = clamp(dot3(A, B), -1, 1), om = Math.acos(d);
    let P;
    if (om < 1e-5) P = A;
    else if (Math.PI - om < 1e-4) { const q = quatSumbu([0, 1, 0], Math.PI * k); P = quatPutar(q, A); } // berlawanan arah: putar mengitari sumbu tegak
    else { const so = Math.sin(om), ka = Math.sin((1 - k) * om) / so, kb = Math.sin(k * om) / so; P = [A[0] * ka + B[0] * kb, A[1] * ka + B[1] * kb, A[2] * ka + B[2] * kb]; }
    P = norm3(P); let az = Math.atan2(P[0], P[2]) / RAD; const el = Math.asin(clamp(P[1], -1, 1)) / RAD;
    // pertahankan azimut kontinu terhadap titik awal (hindari loncatan 360 dan az tak tentu di kutub)
    if (Math.abs(Math.abs(el) - 90) < 1e-3) az = lerp(az0, az1, k);
    az = az0 + ((((az - az0) % 360) + 540) % 360) - 180;
    return { az, el };
  }

  /**
   * karet (rubberhose): anggota tubuh lentur dari pangkal a ke ujung b dengan PANJANG BUSUR TETAP L.
   * d = |ab| < L: busur lingkaran melalui a dan b yang panjangnya tepat L (dipecahkan dari d/L = sin(th/2)/(th/2));
   * d >= L: lurus dan ujung berhenti di a + L * arah (tidak pernah melar). o.arah +1/-1 = sisi tekukan
   * (kiri/kanan dari a->b dalam koordinat layar), o.n titik sampel (24). Kembali {pts, ujung, lurus, th, panjang}.
   */
  function karet(a, b, L, o = {}) {
    const n = o.n || 24, dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-9, ux = dx / d, uy = dy / d, dir = o.dir != null ? o.dir : o.arah, sg = dir == null ? 1 : Math.sign(dir) || 1;
    if (d >= L * 0.9999) { const e = [a[0] + ux * L, a[1] + uy * L]; return { pts: Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], e[0], i / n), lerp(a[1], e[1], i / n)]), tip: e, straight: true, length: L, ujung: e, lurus: true, th: 0, panjang: L }; }
    // sin(x)/x = d/L, x = th/2 di (0, pi)
    const r = d / L; let lo = 1e-6, hi = Math.PI - 1e-9;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Math.sin(m) / m > r) lo = m; else hi = m; }
    const x = (lo + hi) / 2, th = 2 * x, R = L / th, nx = -uy * sg, ny = ux * sg;   // normal ke sisi tekukan
    const h = R * Math.cos(x), cx = (a[0] + b[0]) / 2 - nx * h, cy = (a[1] + b[1]) / 2 - ny * h;   // pusat di sisi berlawanan dari tonjolan
    const a0 = Math.atan2(a[1] - cy, a[0] - cx), a1 = Math.atan2(b[1] - cy, b[0] - cx);
    let sw = a1 - a0; while (sw > Math.PI) sw -= TAU; while (sw < -Math.PI) sw += TAU;
    // ambil busur yang melewati tonjolan (titik tengah = pusat + normal * R)
    const mid = [cx + nx * R, cy + ny * R], am = Math.atan2(mid[1] - cy, mid[0] - cx);
    let dm = am - a0; while (dm > Math.PI) dm -= TAU; while (dm < -Math.PI) dm += TAU;
    if (Math.sign(dm) !== Math.sign(sw) || Math.abs(dm) > Math.abs(sw)) sw = sw > 0 ? sw - TAU : sw + TAU;
    const pts = Array.from({ length: n + 1 }, (_, i) => { const q = a0 + sw * (i / n); return [cx + R * Math.cos(q), cy + R * Math.sin(q)]; });
    pts[n] = [b[0], b[1]];
    return { pts, tip: [b[0], b[1]], straight: false, length: L, center: [cx, cy], ujung: [b[0], b[1]], lurus: false, th, panjang: L, pusat: [cx, cy], R };
  }
  /** potong polyline pts sepanjang s satuan dari ujungnya (mis. ujung celana di atas pergelangan) */
  function potongUjung(pts, s) {
    const out = pts.slice(); let rem = s;
    while (out.length > 2 && rem > 0) { const a = out[out.length - 1], b = out[out.length - 2], l = Math.hypot(a[0] - b[0], a[1] - b[1]); if (l > rem) { out[out.length - 1] = [a[0] + (b[0] - a[0]) * rem / l, a[1] + (b[1] - a[1]) * rem / l]; rem = 0; } else { out.pop(); rem -= l; } }
    return out;
  }
  /** titik terbawah (y terbesar) garis tebal w dengan ujung butt di akhir polyline pts: untuk cek "kaki tidak melewati telapak" */
  function bawahGaris(pts, w) {
    let y = -Infinity; const n = pts.length;
    for (let i = 0; i < n; i++) y = Math.max(y, pts[i][1] + (i < n - 1 ? w / 2 : 0));
    const a = pts[n - 1], b = pts[n - 2] || a, l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, nyv = Math.abs((a[0] - b[0]) / l);
    return Math.max(y === -Infinity ? a[1] : y - 0, a[1] + (w / 2) * nyv);
  }

  MGP.core = {
    __v: "1.1.0", TAU, RAD,
    karet, potongUjung, bawahGaris,
    rng, hash, hashStr, noise1, wob,
    clamp, lerp, seg, smooth01, win, stepT, ease, E, spring, springAt, key,
    // English names (v2.4); the old Indonesian names below stay as aliases
    rubber: karet, trimEnds: potongUjung, strokeBottom: bawahGaris,
    SPRINGS, springInfo: pegasInfo, springState: pegasKeadaan, springPhys: pegas, springDuration: pegasDurasi, springEase: pegasEase,
    keyValue: nilaiKunci, inertia: inersia, delay: tunda, delayChain: tundaRantai,
    stretch: regang, stretch3: regang3, stretchDirection: regangArah, stretchVelocity: regangKecepatan, volumeError: galatVolume,
    scaleNow: skalaKini, fixedWidth: lebarTetap, quatAxis: quatSumbu, quatMul: quatKali, quatRotate: quatPutar, slerpDirection: slerpArah,
    PEGAS, pegasInfo, pegasKeadaan, pegas, pegasDurasi, pegasEase, nilaiKunci, inersia, tunda, tundaRantai,
    regang, regang3, regangArah, regangKecepatan, galatVolume, skalaKini, lebarTetap,
    quatNorm, quatSumbu, quatKali, quatPutar, quatEuler, slerp, slerpArah,
    catmull, catmullPts, catmullPath, polyLen, polyAt,
    dot3, cross3, sub3, add3, scale3, len3, norm3, cam, camOrbit, camC, scr, project, horizonY, sunDir, clipNear, polyScr,
    rgb, hex, mix, rgba, shade, lum,
    setup, offscreen, fontsReady,
    timeline, expose, defineModule,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
