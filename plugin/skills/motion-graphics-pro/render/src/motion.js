/* Copy of motion-graphics/lib/motion/motion.js (lib/motion/build.mjs). Edit the source, not this file. */
/*!
 * mgp.motion 1.0.0 (formerly "Gerak") - deterministic animation/tween engine for Motion Graphics Pro.
 * Copyright (c) 2026 Salim Muhammad. Licence: see LICENSE.md at the package root.
 *
 * Written from scratch. Its API deliberately mirrors part of the GSAP 3 API (function names,
 * vars shape, position parameter, ease names) so existing compositions keep working, but
 * no GSAP code was copied. Behaviour is matched through black-box tests.
 *
 * Principles:
 *   - time only moves through the ticker or an explicit seek;
 *   - seeking to any t gives the same result, whatever the seek history
 *     (every seek rebuilds state: revert -> apply immediate renders -> render in order);
 *   - no Math.random: randomness uses its own seeded generator.
 *
 * Usage: <script src="motion.js"></script> then mgp.motion.timeline(...).
 * Same object under the old names window.Gerak / window.gerak. When window.gsap is not defined yet,
 * window.gsap = mgp.motion (compatibility alias), so GSAP-style code keeps working.
 * Set window.__motionNoShim = true (old: __gerakTanpaShim) before loading to turn the gsap alias off.
 */
(function (root, factory) {
  var G = factory(root);
  if (typeof module === "object" && module && module.exports) module.exports = G;
  if (root) {
    root.mgp = root.mgp || {};
    root.mgp.motion = G;                // canonical name: mgp.motion.timeline(...), mgp.motion.to(...)
    root.Gerak = G;                     // old names (v2.3 / v2.4-dev)
    if (!root.gerak) root.gerak = G;
    if (!root.gsap && !root.__motionNoShim && !root.__gerakTanpaShim) { G.isShim = true; root.gsap = G; } // compatibility alias
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function (root) {
/*<inti>*/
  "use strict";

  // ======================================================================= util dasar
  var BIG = 1e10, EPS = 1e-9;
  var isFn = function (v) { return typeof v === "function"; };
  var isStr = function (v) { return typeof v === "string"; };
  var isNum = function (v) { return typeof v === "number"; };
  var isObj = function (v) { return v !== null && typeof v === "object"; };
  var isArrLike = function (v) { return v && typeof v === "object" && !v.nodeType && typeof v.length === "number" && v !== root; };
  var r4 = function (v) { var r = Math.round(v * 10000) / 10000; return r === 0 ? 0 : r; };
  var r5 = function (v) { var r = Math.round(v * 100000) / 100000; return r === 0 ? 0 : r; };
  var r6 = function (v) { var r = Math.round(v * 1000000) / 1000000; return r === 0 ? 0 : r; };
  var rt = function (v) { return Math.round(v * 1e8) / 1e8; }; // waktu
  // Toleransi "sudah mulai": posisi anak dibulatkan rt() (galat sampai 5e-9) sedangkan waktu seek tidak, jadi
  // set/tween di k/fps (mis. 1.5 + 1/24) harus dianggap mulai saat di-seek ke k/fps. 1e-7 jauh di bawah satu frame.
  var TEPS = 1e-7;
  var clampN = function (a, b, v) { return v < a ? a : v > b ? b : v; };
  var hasDoc = typeof document !== "undefined";
  var DEG = 180 / Math.PI, RAD = Math.PI / 180;

  // ======================================================================= acak berseed
  var _seed = 0x6a09e667 | 0;
  function rand() {
    _seed = (_seed + 0x9e3779b9) | 0;
    var t = _seed;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  }
  function seedRand(n) {
    if (isStr(n)) { var h = 2166136261; for (var i = 0; i < n.length; i++) h = Math.imul(h ^ n.charCodeAt(i), 16777619); n = h; }
    _seed = (+n || 0) | 0;
  }

  // ======================================================================= ease
  var EASES = {};
  var linear = function (p) { return p; };
  function family(name, fin) {
    var fout = function (p) { return 1 - fin(1 - p); };
    var fio = function (p) { return p < 0.5 ? fin(p * 2) / 2 : 1 - fin((1 - p) * 2) / 2; };
    EASES[name + ".in"] = fin; EASES[name + ".out"] = fout; EASES[name + ".inOut"] = fio; EASES[name] = fout;
  }
  [0, 1, 2, 3, 4].forEach(function (n) {
    var k = n + 1;
    family("power" + n, n ? function (p) { return Math.pow(p, k); } : linear);
  });
  ["quad", "cubic", "quart", "quint"].forEach(function (nm, i) { ["", ".in", ".out", ".inOut"].forEach(function (s) { EASES[nm + s] = EASES["power" + (i + 1) + s]; }); });
  ["", ".in", ".out", ".inOut"].forEach(function (s) { EASES["strong" + s] = EASES["power4" + s]; EASES["linear" + s] = linear; });
  EASES.none = linear;
  family("sine", function (p) { return p >= 1 ? 1 : 1 - Math.cos(p * Math.PI / 2); });
  // kurva expo yang dikoreksi supaya tepat 0 di awal dan 1 di akhir
  family("expo", function (p) { return Math.pow(2, 10 * (p - 1)) * p + p * p * p * p * p * p * (1 - p); });
  family("circ", function (p) { return 1 - Math.sqrt(1 - p * p); });
  function bounceOut(p) {
    var k = 7.5625, s = 1 / 2.75;
    if (p < s) return k * p * p;
    if (p < 2 * s) { p -= 1.5 * s; return k * p * p + 0.75; }
    if (p < 2.5 * s) { p -= 2.25 * s; return k * p * p + 0.9375; }
    p -= 2.625 * s; return k * p * p + 0.984375;
  }
  family("bounce", function (p) { return 1 - bounceOut(1 - p); });
  var CONFIG = {
    back: function (type, a) {
      var o = a[0] == null || a[0] === "" ? 1.70158 : +a[0];
      var fin = function (p) { return p * p * ((o + 1) * p - o); };
      return pick(type, fin);
    },
    elastic: function (type, a) {
      var amp = a[0] == null || a[0] === "" ? 1 : +a[0], per = a[1] == null || a[1] === "" ? (type === "inOut" ? 0.45 : 0.3) : +a[1];
      var A = Math.max(1, amp), s = per / (2 * Math.PI) * (Math.asin(1 / A) || 0), w = 2 * Math.PI / per;
      var fout = function (p) { return p <= 0 ? 0 : p >= 1 ? 1 : A * Math.pow(2, -10 * p) * Math.sin((p - s) * w) + 1; };
      var fin = function (p) { return 1 - fout(1 - p); };
      if (type === "in") return fin;
      if (type === "inOut") return function (p) { return p < 0.5 ? fin(p * 2) / 2 : 1 - fin((1 - p) * 2) / 2; };
      return fout;
    },
    steps: function (type, a) {
      var n = Math.max(1, Math.round(+a[0] || 1)), lead = a[1] === true || a[1] === "true" ? 1 : 0, k = n + (lead ? 0 : 1);
      return function (p) { return ((Math.floor(k * clampN(0, 1 - 1e-8, p))) + lead) / n; };
    },
  };
  function pick(type, fin) {
    if (type === "in") return fin;
    if (type === "inOut") return function (p) { return p < 0.5 ? fin(p * 2) / 2 : 1 - fin((1 - p) * 2) / 2; };
    return function (p) { return 1 - fin(1 - p); };
  }
  // cubic-bezier(x1, y1, x2, y2) seperti CSS
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var X = function (t) { return ((ax * t + bx) * t + cx) * t; }, Y = function (t) { return ((ay * t + by) * t + cy) * t; };
    var dX = function (t) { return (3 * ax * t + 2 * bx) * t + cx; };
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x, i, d;
      for (i = 0; i < 8; i++) { var e = X(t) - x; if (Math.abs(e) < 1e-7) return Y(t); d = dX(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      var lo = 0, hi = 1; t = x;
      for (i = 0; i < 40; i++) { var v = X(t); if (Math.abs(v - x) < 1e-7) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  }
  var easeMemo = {};
  function parseEase(e, fallback) {
    if (isFn(e)) return e;
    if (e == null || e === "") return fallback;
    if (!isStr(e)) return fallback;
    if (easeMemo[e]) return easeMemo[e];
    var s = e.trim(), f = EASES[s];
    if (!f) {
      var m = /^([A-Za-z_$][\w$]*(?:-[\w$]+)*)(?:\.(in|out|inOut|easeIn|easeOut|easeInOut))?\s*(?:\((.*)\))?$/.exec(s.replace(/\s+/g, " "));
      if (m) {
        var base = m[1].toLowerCase(), type = (m[2] || "out").replace("ease", "").replace(/^./, function (c) { return c.toLowerCase(); });
        var args = m[3] != null ? m[3].split(",").map(function (x) { return x.trim(); }) : [];
        if (base === "cubic-bezier" && args.length === 4) f = bezier(+args[0], +args[1], +args[2], +args[3]);
        else if (CONFIG[base]) f = CONFIG[base](type, args);
        else if (EASES[m[1] + "." + type] && !m[3]) f = EASES[m[1] + "." + type];
        else if (EASES[m[1]]) f = EASES[m[1]];
      }
    }
    if (!f) return fallback;
    easeMemo[e] = f;
    return f;
  }
  function registerEase(name, fn) { EASES[name] = isFn(fn) ? fn : parseEase(fn, linear); easeMemo = {}; }

  // ---------------------------------------------------------------- spring (mass, stiffness, damping)
  // Same presets as MGP.core.SPRINGS. zeta = c / (2 sqrt(m k)): bouncy < 1, snappy = 1, heavy > 1.
  // Old preset names: memantul = bouncy, sigap = snappy, berat = heavy (ease "pegas.memantul" = "spring.bouncy").
  // Closed-form step response (no per-frame integration), so a random seek always gives the same value.
  var PEGAS = { memantul: [1, 180, 12], sigap: [1, 180, 2 * Math.sqrt(180)], berat: [4, 160, 3 * Math.sqrt(640)] };
  var SPRING_OLD = { bouncy: "memantul", snappy: "sigap", heavy: "berat" };
  Object.keys(SPRING_OLD).forEach(function (n) { PEGAS[n] = PEGAS[SPRING_OLD[n]]; });
  function pegasLangkah(m, k, c) {
    var w = Math.sqrt(k / m), z = c / (2 * Math.sqrt(m * k));
    return function (t) {
      if (t <= 0) return 0;
      if (Math.abs(z - 1) < 1e-6) return 1 - (1 + w * t) * Math.exp(-w * t);
      if (z < 1) { var wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); }
      var r = w * Math.sqrt(z * z - 1), r1 = -z * w + r, r2 = -z * w - r, c2 = r1 / (r2 - r1), c1 = -1 - c2;
      return 1 + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    };
  }
  var pegasMemo = {};
  /** mgp.motion.spring(name | {mass, stiffness, damping}) -> {ease, duration (seconds until settled +-0.5 %), zeta, frequency}
   *  Old names: Gerak.pegas, options {massa, kekakuan, redaman}, result key frekuensi. */
  function pegas(p) {
    var pm = p && (p.mass != null ? p.mass : p.massa), pk = p && (p.stiffness != null ? p.stiffness : p.kekakuan), pd = p && (p.damping != null ? p.damping : p.redaman);
    var a = isStr(p) ? PEGAS[p] || PEGAS.memantul : Array.isArray(p) ? p : [pm || 1, pk != null ? +pk : 180, pd != null ? +pd : 12];
    var key = a.join(","); if (pegasMemo[key]) return pegasMemo[key];
    var f = pegasLangkah(+a[0], +a[1], +a[2]), last = 0;
    for (var i = 1; i <= 2400; i++) { var tt = i / 120; if (Math.abs(f(tt) - 1) > 0.005) last = tt; }
    var T = Math.max(1 / 30, last + 1 / 120), e1 = f(T);
    var ease = function (u) { return u <= 0 ? 0 : u >= 1 ? 1 : f(u * T) + (1 - e1) * u * u * u * u; };
    var fq = Math.sqrt(+a[1] / +a[0]) / (2 * Math.PI);
    return (pegasMemo[key] = { ease: ease, duration: T, zeta: +a[2] / (2 * Math.sqrt(+a[0] * +a[1])), frequency: fq, frekuensi: fq });
  }
  Object.keys(PEGAS).forEach(function (n) { EASES[(SPRING_OLD[n] ? "spring." : "pegas.") + n] = pegas(n).ease; });
  CONFIG.pegas = function (type, a) {
    if (a.length === 1 && PEGAS[a[0]]) return pegas(a[0]).ease;
    return pegas([+a[0] || 1, a[1] == null || a[1] === "" ? 180 : +a[1], a[2] == null || a[2] === "" ? 12 : +a[2]]).ease;
  };
  CONFIG.spring = CONFIG.pegas; // "spring(1, 180, 12)" = old "pegas(1, 180, 12)"

  /**
   * mgp.motion.inertia(vars, {amp, freq, decay, tail}) -> new vars: the same tween plus a damped bounce after
   * the end value, driven by the arrival speed:  y = end + v * amp * sin(2 pi freq dt) / e^(decay dt).
   * duration grows by `tail` seconds (default 1; old option name ekor); the bounce fades to 0 at the end of the tail.
   * Old name: Gerak.inersia.
   * Kecepatan datang diambil dari kemiringan ease di p = 1, jadi ease "out" (tiba pelan) hampir tidak memantul.
   */
  function inersia(vars, o) {
    o = o || {}; vars = Object.assign({}, vars || {});
    var amp = o.amp == null ? 0.05 : +o.amp, fr = o.freq == null ? 2 : +o.freq, dec = o.decay == null ? 4 : +o.decay, ekor = o.tail != null ? +o.tail : o.ekor == null ? 1 : +o.ekor;
    var D = vars.duration != null ? +vars.duration : DEFAULTS.duration, e = parseEase(vars.ease, null) || defaultEase(), h = 1e-4;
    var vN = D > 0 ? (e(1) - e(1 - h)) / h / D : 0, Dt = D + ekor;
    vars.duration = Dt;
    vars.ease = function (p) {
      var tt = p * Dt; if (tt < D) return e(D > 0 ? tt / D : 1);
      var dt = tt - D, w = 1 - Math.pow(clampN(0, 1, dt / ekor), 4);
      return 1 + vN * amp * Math.sin(2 * Math.PI * fr * dt) / Math.exp(dec * dt) * w;
    };
    return vars;
  }

  // ======================================================================= warna
  var NAMED = { aqua: [0, 255, 255], lime: [0, 255, 0], silver: [192, 192, 192], black: [0, 0, 0], maroon: [128, 0, 0], teal: [0, 128, 128], blue: [0, 0, 255], navy: [0, 0, 128], white: [255, 255, 255], olive: [128, 128, 0], yellow: [255, 255, 0], orange: [255, 165, 0], gray: [128, 128, 128], grey: [128, 128, 128], purple: [128, 0, 128], green: [0, 128, 0], red: [255, 0, 0], pink: [255, 192, 203], cyan: [0, 255, 255], magenta: [255, 0, 255], fuchsia: [255, 0, 255] };
  function hue(m1, m2, h) { h = h < 0 ? h + 1 : h > 1 ? h - 1 : h; return h * 6 < 1 ? m1 + (m2 - m1) * h * 6 : h < 0.5 ? m2 : h * 3 < 2 ? m1 + (m2 - m1) * (2 / 3 - h) * 6 : m1; }
  function parseColor(v) {
    if (!isStr(v)) return isNum(v) ? [v >> 16 & 255, v >> 8 & 255, v & 255, 1] : null;
    var s = v.trim().toLowerCase();
    if (s === "transparent") return [255, 255, 255, 0];
    if (NAMED[s]) return NAMED[s].concat(1);
    var m;
    if (s[0] === "#") {
      var h = s.slice(1);
      if (!/^[0-9a-f]+$/.test(h)) return null;
      if (h.length === 3 || h.length === 4) h = h.split("").map(function (c) { return c + c; }).join("");
      if (h.length !== 6 && h.length !== 8) return null;
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? r4(parseInt(h.slice(6, 8), 16) / 255) : 1];
    }
    if ((m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(s))) {
      var parts = m[2].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean), num = parts.map(parseFloat);
      if (parts.length < 3 || num.slice(0, 3).some(isNaN)) return null;
      var a = parts.length > 3 ? (parts[3].indexOf("%") > 0 ? num[3] / 100 : num[3]) : 1;
      if (m[1][0] === "r") {
        return [0, 1, 2].map(function (i) { return parts[i].indexOf("%") > 0 ? num[i] * 2.55 : num[i]; }).concat(a);
      }
      var H = (((num[0] % 360) + 360) % 360) / 360, S = num[1] / 100, L = num[2] / 100;
      var m2 = L <= 0.5 ? L * (S + 1) : L + S - L * S, m1 = L * 2 - m2;
      return [Math.round(hue(m1, m2, H + 1 / 3) * 255), Math.round(hue(m1, m2, H) * 255), Math.round(hue(m1, m2, H - 1 / 3) * 255), a];
    }
    return null;
  }
  var colorStr = function (c) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + r4(c[3]) + ")"; };
  var mixC = function (s, e, r) { return [s[0] + (e[0] - s[0]) * r, s[1] + (e[1] - s[1]) * r, s[2] + (e[2] - s[2]) * r, s[3] + (e[3] - s[3]) * r]; };

  // ======================================================================= string kompleks
  // token: warna dan angka. Interpolasi posisional per jenis, bentuk keluaran ikut nilai akhir.
  var TOKEN = /(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-fA-F])|(?:rgba?|hsla?)\([^)]*\)|\b(?:transparent|aqua|lime|silver|black|maroon|teal|blue|navy|white|olive|yellow|orange|gray|grey|purple|green|red|pink|cyan|magenta|fuchsia)\b)|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  function tokenize(str) {
    var lits = [], slots = [], last = 0, m;
    str = String(str);
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(str))) {
      var c = m[1] ? parseColor(m[1]) : null;
      if (m[1] && !c) continue;
      lits.push(str.slice(last, m.index));
      slots.push(c ? { c: c } : { n: parseFloat(m[2]) });
      last = TOKEN.lastIndex;
    }
    lits.push(str.slice(last));
    return { lits: lits, slots: slots, raw: str };
  }
  function makeComplex(sStr, eStr) {
    var e = tokenize(eStr), s = tokenize(sStr == null ? "" : sStr);
    if (!e.slots.length) return null;
    var sn = [], sc = [];
    s.slots.forEach(function (x) { if (x.c) sc.push(x.c); else sn.push(x.n); });
    var ni = 0, ci = 0, pairs = e.slots.map(function (x) {
      if (x.c) { var a = sc[ci++]; return { c: 1, s: a || [0, 0, 0, 0], e: x.c }; }
      var b = sn[ni++]; return { c: 0, s: b == null ? 0 : b, e: x.n };
    });
    return { lits: e.lits, pairs: pairs, end: e.raw };
  }
  function complexAt(cx, r) {
    if (r === 1) return cx.end;
    var out = cx.lits[0];
    for (var i = 0; i < cx.pairs.length; i++) {
      var p = cx.pairs[i];
      out += (p.c ? colorStr(mixC(p.s, p.e, r)) : String(r4(p.s + (p.e - p.s) * r))) + cx.lits[i + 1];
    }
    return out;
  }

  // ======================================================================= target & cache
  var CACHE = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function isElement(t) { return !!(t && t.nodeType === 1 && t.style); }
  function isSVGChild(t) { return isElement(t) && t.namespaceURI === "http://www.w3.org/2000/svg" && t.tagName.toLowerCase() !== "svg" && isFn(t.getBBox); }
  function Cache(t) {
    this.t = t; this.el = isElement(t); this.svg = this.el && isSVGChild(t);
    this.tf = null; this.cv = {}; this.rb = {}; this.base = {}; this.tfStr = null; this.tfInit = false; this.origStr = null;
  }
  function cacheOf(t) {
    var c = CACHE.get(t);
    if (!c) { c = new Cache(t); CACHE.set(t, c); }
    return c;
  }
  var _ctx = null; // context aktif
  function toArray(v, scope) {
    if (v == null) return [];
    if (isStr(v)) {
      var sc = scope || (_ctx && _ctx.scope) || (hasDoc ? document : null);
      if (!sc) return [];
      if (isStr(sc)) sc = hasDoc ? document.querySelector(sc) : null;
      try { return Array.prototype.slice.call((sc || document).querySelectorAll(v)); } catch (e) { return []; }
    }
    if (Array.isArray(v) && v.length && v.every(function (x) { return isNum(x); })) return [v];
    if (Array.isArray(v) || isArrLike(v)) {
      var out = [];
      for (var i = 0; i < v.length; i++) { var x = v[i]; if (Array.isArray(x) || (isArrLike(x) && !isStr(x))) out.push.apply(out, toArray(x, scope)); else if (isStr(x)) out.push.apply(out, toArray(x, scope)); else if (x != null) out.push(x); }
      return out;
    }
    return [v];
  }
  function uniq(a) { var out = [], seen = new Set(); a.forEach(function (x) { if (!seen.has(x)) { seen.add(x); out.push(x); } }); return out; }

  // ======================================================================= CSS: nama & satuan
  var camelRe = /[A-Z]/g;
  var kebab = function (p) { return p.indexOf("--") === 0 ? p : p.replace(camelRe, function (c) { return "-" + c.toLowerCase(); }).replace(/^(webkit|moz|ms)-/, "-$1-"); };
  var UNITLESS = { opacity: 1, zIndex: 1, fontWeight: 1, lineHeight: 1, flexGrow: 1, flexShrink: 1, order: 1, zoom: 1, fillOpacity: 1, strokeOpacity: 1, stopOpacity: 1, floodOpacity: 1, strokeMiterlimit: 1, columnCount: 1, orphans: 1, widows: 1, flex: 1, aspectRatio: 1 };
  var TF = { x: 1, y: 1, z: 1, xPercent: 1, yPercent: 1, rotation: 1, rotate: 1, rotationZ: 1, rotationX: 1, rotationY: 1, rotateX: 1, rotateY: 1, rotateZ: 1, skewX: 1, skewY: 1, scale: 1, scaleX: 1, scaleY: 1, transformPerspective: 1 };
  var TF_ALIAS = { rotate: "rotation", rotationZ: "rotation", rotateZ: "rotation", rotateX: "rotationX", rotateY: "rotationY" };
  var RESERVED = { duration: 1, delay: 1, ease: 1, stagger: 1, repeat: 1, yoyo: 1, repeatDelay: 1, yoyoEase: 1, paused: 1, immediateRender: 1, overwrite: 1, onStart: 1, onUpdate: 1, onComplete: 1, onRepeat: 1, onReverseComplete: 1, onInterrupt: 1, onStartParams: 1, onUpdateParams: 1, onCompleteParams: 1, onRepeatParams: 1, onReverseCompleteParams: 1, callbackScope: 1, id: 1, data: 1, lazy: 1, inherit: 1, keyframes: 1, startAt: 1, runBackwards: 1, defaults: 1, smoothChildTiming: 1, autoRemoveChildren: 1, force3D: 1, autoRound: 1, easeEach: 1, parent: 1, reversed: 1, snap: 1, modifiers: 1, roundProps: 1, transformOrigin: 1, svgOrigin: 1, smoothOrigin: 1, clearProps: 1, autoAlpha: 1, attr: 1, css: 1, onToggle: 1, scrollTrigger: 1, preventOverlaps: 1, fastScrollEnd: 1 };

  function cs(el) { return root.getComputedStyle ? root.getComputedStyle(el) : el.style; }
  var NUM_UNIT = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)([a-z%]*)\s*$/i;
  function unitOf(v) { var m = isStr(v) && NUM_UNIT.exec(v); return m ? m[2] : ""; }

  // berapa px satu satuan u untuk properti prop pada elemen el
  function pxPer(el, prop, u) {
    if (!u || u === "px") return 1;
    var vw = root.innerWidth || 1, vh = root.innerHeight || 1;
    switch (u) {
      case "%": {
        var par = el.parentNode && el.parentNode.nodeType === 1 ? el.parentNode : null;
        if (/^(height|top|bottom|minHeight|maxHeight)$/.test(prop)) return (par ? par.clientHeight || par.getBoundingClientRect().height : vh) / 100;
        if (/^(borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)$/.test(prop) || prop === "x" ) return (el.offsetWidth || 0) / 100;
        if (prop === "y") return (el.offsetHeight || 0) / 100;
        return (par ? par.clientWidth || par.getBoundingClientRect().width : vw) / 100;
      }
      case "em": return parseFloat(cs(el).fontSize) || 16;
      case "rem": return parseFloat(cs(document.documentElement).fontSize) || 16;
      case "vw": return vw / 100;
      case "vh": return vh / 100;
      case "vmin": return Math.min(vw, vh) / 100;
      case "vmax": return Math.max(vw, vh) / 100;
      case "pt": return 96 / 72;
      case "pc": return 16;
      case "in": return 96;
      case "cm": return 96 / 2.54;
      case "mm": return 96 / 25.4;
    }
    return 1;
  }

  // ======================================================================= transform: urai & susun
  function tfDefaults() {
    return { x: 0, y: 0, z: 0, xu: "px", yu: "px", xPercent: 0, yPercent: 0, rotation: 0, rotationX: 0, rotationY: 0, skewX: 0, skewY: 0, scaleX: 1, scaleY: 1, transformPerspective: 0, f3: 0, o: null, zo: 0, ox: 0, oy: 0, xo: 0, yo: 0 };
  }
  function decompose2D(tf, a, b, c, d, e, f) {
    tf.x = e; tf.y = f;
    var sx = Math.sqrt(a * a + b * b), sy = Math.sqrt(c * c + d * d);
    var rot = sx ? Math.atan2(b, a) : 0, skew = (sy ? Math.atan2(c, d) : 0) + rot;
    if (a * d - b * c < 0) { sy = -sy; }
    tf.rotation = r5(rot * DEG);
    var sk = r5(skew * DEG);
    if (Math.abs(sk) > 90 && Math.abs(sk) < 270) { sy = -sy; sk += sk <= 0 ? 180 : -180; }
    tf.skewX = sk;
    tf.scaleX = r5(sx); tf.scaleY = r5(sy * Math.cos(skew));
    if (!isFinite(tf.scaleY) || Math.abs(tf.scaleY) < 1e-12) tf.scaleY = r5(sy);
  }
  function readTransformHTML(c) {
    var el = c.t, tf = tfDefaults(), st = cs(el), M = null;
    try {
      var DM = root.DOMMatrix || root.WebKitCSSMatrix;
      if (DM) {
        M = new DM();
        var w = el.offsetWidth || 0, h = el.offsetHeight || 0;
        var tr = st.translate, ro = st.rotate, sc = st.scale;
        if (tr && tr !== "none") {
          var tp = tr.split(/\s+/), px = function (v, s) { return v && v.indexOf("%") > 0 ? parseFloat(v) * s / 100 : parseFloat(v) || 0; };
          M = M.translate(px(tp[0], w), px(tp[1], h), parseFloat(tp[2]) || 0);
        }
        if (ro && ro !== "none") {
          var rp = ro.split(/\s+/);
          var ang = parseFloat(rp[rp.length - 1]) * (/rad$/.test(rp[rp.length - 1]) ? DEG : /turn$/.test(rp[rp.length - 1]) ? 360 : 1);
          if (rp.length === 1) M = M.rotate(0, 0, ang);
          else if (rp[0] === "x") M = M.rotate(ang, 0, 0);
          else if (rp[0] === "y") M = M.rotate(0, ang, 0);
          else if (rp[0] === "z") M = M.rotate(0, 0, ang);
          else M = M.rotateAxisAngle(+rp[0] || 0, +rp[1] || 0, +rp[2] || 0, ang);
        }
        if (sc && sc !== "none") { var sp = sc.split(/\s+/).map(parseFloat); M = M.scale(sp[0], sp.length > 1 ? sp[1] : sp[0], sp.length > 2 ? sp[2] : 1); }
        if (st.transform && st.transform !== "none") M = M.multiply(new DM(st.transform));
      }
    } catch (e) { M = null; }
    if (M) {
      if (M.is2D !== false && Math.abs(M.m13) < EPS && Math.abs(M.m23) < EPS && Math.abs(M.m31) < EPS && Math.abs(M.m32) < EPS && Math.abs(M.m43) < EPS && Math.abs(M.m33 - 1) < EPS) {
        decompose2D(tf, M.a, M.b, M.c, M.d, M.e, M.f);
      } else {
        var c1 = [M.m11, M.m12, M.m13], c2 = [M.m21, M.m22, M.m23], c3 = [M.m31, M.m32, M.m33];
        var L = function (v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); };
        var s1 = L(c1) || 1, s2 = L(c2) || 1, s3 = L(c3) || 1;
        var R00 = c1[0] / s1, R10 = c1[1] / s1, R20 = c1[2] / s1, R21 = c2[2] / s2, R22 = c3[2] / s3;
        var ry = Math.asin(clampN(-1, 1, -R20)), rx = Math.atan2(R21, R22), rz = Math.atan2(R10, R00);
        tf.rotationY = r5(ry * DEG); tf.rotationX = r5(rx * DEG); tf.rotation = r5(rz * DEG);
        tf.scaleX = r5(s1); tf.scaleY = r5(s2);
        tf.x = M.m41; tf.y = M.m42; tf.z = M.m43;
      }
      // translate(-50%, -50%) dikenali kembali sebagai xPercent/yPercent -50 bila separuh offsetWidth
      // (dibulatkan) sama dengan -x (dibulatkan); sisa pecahan tetap di x/y
      var W = el.offsetWidth, H = el.offsetHeight;
      if (W && Math.round(W / 2) === Math.round(-tf.x)) { tf.xPercent = -50; tf.x = tf.x + W / 2; }
      if (H && Math.round(H / 2) === Math.round(-tf.y)) { tf.yPercent = -50; tf.y = tf.y + H / 2; }
      tf.x = r4(tf.x); tf.y = r4(tf.y); tf.z = r4(tf.z);
    }
    return tf;
  }
  function bbox(el) {
    try { var b = el.getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; } catch (e) { return { x: 0, y: 0, width: 0, height: 0 }; }
  }
  function readTransformSVG(c) {
    var el = c.t, tf = tfDefaults(), b = bbox(el);
    tf.ox = b.x; tf.oy = b.y; tf.bw = b.width; tf.bh = b.height;
    var stored = el.getAttribute("data-svg-origin");
    if (stored) { var sp = stored.split(/\s+/).map(parseFloat); if (sp.length === 2 && !isNaN(sp[0])) { tf.ox = sp[0]; tf.oy = sp[1]; } }
    var m = null;
    try { if (el.transform && el.transform.baseVal && el.transform.baseVal.numberOfItems) { var cn = el.transform.baseVal.consolidate(); m = cn && cn.matrix; } } catch (e) { m = null; }
    if (m) {
      decompose2D(tf, m.a, m.b, m.c, m.d, m.e, m.f);
      var A = mat2(tf), ox = tf.ox, oy = tf.oy;
      tf.x = r4(m.e - (ox - (A[0] * ox + A[2] * oy)));
      tf.y = r4(m.f - (oy - (A[1] * ox + A[3] * oy)));
    }
    return tf;
  }
  function tfOf(c) {
    if (!c.tf) c.tf = c.svg ? readTransformSVG(c) : readTransformHTML(c);
    return c.tf;
  }
  // a,b,c,d untuk rotate(r) skew(kx, ky) scale(sx, sy)
  function mat2(tf) {
    var r = tf.rotation * RAD, kx = tf.skewX * RAD, ky = tf.skewY * RAD;
    var cr = Math.cos(r), sr = Math.sin(r), tx = Math.tan(kx), ty = Math.tan(ky);
    // R * K: K = [1 tan(kx); tan(ky) 1] (kolom: (1, ty), (tx, 1))
    var a = cr - sr * ty, b = sr + cr * ty, c = cr * tx - sr, d = sr * tx + cr;
    return [a * tf.scaleX, b * tf.scaleX, c * tf.scaleY, d * tf.scaleY];
  }
  function n4(v) { return String(r4(v)); }
  function rotStr(v) { return String(v === 0 ? 0 : v); }
  function htmlTransform(tf, force3D) {
    var s = "", x = r4(tf.x), y = r4(tf.y), z = r4(tf.z);
    if (tf.zo && (tf.rotationX || tf.rotationY)) {
      // asal sumbu z: geser translate3d supaya rotasi terjadi di sekitar z = zo
      var rx = tf.rotationX * RAD, ry = tf.rotationY * RAD, rz = tf.rotation * RAD, zo = -tf.zo;
      // R = Rz * Ry * Rx diterapkan ke (0, 0, zo)
      var v0 = 0, v1 = -Math.sin(rx) * zo, v2 = Math.cos(rx) * zo;
      var w0 = Math.cos(ry) * v0 + Math.sin(ry) * v2, w1 = v1, w2 = -Math.sin(ry) * v0 + Math.cos(ry) * v2;
      var u0 = Math.cos(rz) * w0 - Math.sin(rz) * w1, u1 = Math.sin(rz) * w0 + Math.cos(rz) * w1;
      x = r4(x + u0); y = r4(y + u1); z = r4(z + w2 - zo);
    }
    if (tf.transformPerspective) s += "perspective(" + tf.transformPerspective + "px) ";
    if (tf.xPercent || tf.yPercent) s += "translate(" + n4(tf.xPercent) + "%, " + n4(tf.yPercent) + "%) ";
    if (z || force3D || tf.f3 || (tf.zo && (tf.rotationX || tf.rotationY))) s += "translate3d(" + x + tf.xu + ", " + y + tf.yu + ", " + z + "px) ";
    else if (x || y) s += "translate(" + x + tf.xu + ", " + y + tf.yu + ") ";
    if (tf.rotation) s += "rotate(" + rotStr(tf.rotation) + "deg) ";
    if (tf.rotationY) s += "rotateY(" + rotStr(tf.rotationY) + "deg) ";
    if (tf.rotationX) s += "rotateX(" + rotStr(tf.rotationX) + "deg) ";
    if (tf.skewX || tf.skewY) s += "skew(" + rotStr(tf.skewX) + "deg, " + rotStr(tf.skewY) + "deg) ";
    if (tf.scaleX !== 1 || tf.scaleY !== 1) s += "scale(" + n4(tf.scaleX) + ", " + n4(tf.scaleY) + ") ";
    return s ? s.slice(0, -1) : "translate(0px, 0px)";
  }
  function svgTransform(tf) {
    var A = mat2(tf).map(r5), ox = tf.ox, oy = tf.oy;
    var tx = tf.x * (tf.xu === "%" ? (tf.bw || 0) / 100 : 1) + tf.xPercent * (tf.bw || 0) / 100;
    var ty = tf.y * (tf.yu === "%" ? (tf.bh || 0) / 100 : 1) + tf.yPercent * (tf.bh || 0) / 100;
    tx += tf.xo || 0; ty += tf.yo || 0;
    var e = r5(ox - (A[0] * ox + A[2] * oy) + tx), f = r5(oy - (A[1] * ox + A[3] * oy) + ty);
    return "matrix(" + A[0] + "," + A[1] + "," + A[2] + "," + A[3] + "," + e + "," + f + ")";
  }
  function parseOriginHTML(v) {
    var p = String(v).trim().split(/\s+/), KW = { left: "0%", center: "50%", right: "100%", top: "0%", bottom: "100%" };
    if (p.length === 1) p.push("50%");
    if (p[0] === "top" || p[0] === "bottom" || (p[1] === "left" || p[1] === "right")) { var t = p[0]; p[0] = p[1]; p[1] = t; }
    var X = KW[p[0]] || p[0], Y = KW[p[1]] || p[1];
    if (/^-?[\d.]+$/.test(X)) X += "px"; if (/^-?[\d.]+$/.test(Y)) Y += "px";
    return { s: X + " " + Y, z: p[2] ? parseFloat(p[2]) || 0 : 0 };
  }
  function parseOriginSVG(tf, v, absolute, el) {
    var p = String(v).trim().split(/[\s,]+/), KW = { left: 0, center: 50, right: 100, top: 0, bottom: 100 };
    if (p.length === 1) p.push(absolute ? p[0] : "50%");
    if (p[0] === "top" || p[0] === "bottom" || p[1] === "left" || p[1] === "right") { var t = p[0]; p[0] = p[1]; p[1] = t; }
    if (absolute) return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0];
    var b = bbox(el); tf.bw = b.width; tf.bh = b.height;
    var f = function (s, base, size) { if (s in KW) return base + size * KW[s] / 100; if (String(s).indexOf("%") > 0) return base + size * parseFloat(s) / 100; return base + (parseFloat(s) || 0); };
    return [f(p[0], b.x, b.width), f(p[1], b.y, b.height)];
  }

  // ======================================================================= frame: tulis tertunda
  var NONE = {};
  function Frame() { this.m = new Map(); this.log = []; this.q = []; }
  Frame.prototype.has = function (c, k) { var o = this.m.get(c); return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  Frame.prototype.get = function (c, k) { var o = this.m.get(c); return o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : NONE; };
  Frame.prototype.set = function (c, k, v) { var o = this.m.get(c); if (!o) { o = {}; this.m.set(c, o); } o[k] = v; };

  // nilai "mentah" saat ini (untuk urung): nilai inline/atribut/properti, bukan computed
  function rawNow(F, c, k) {
    var v = F ? F.get(c, k) : NONE;
    if (v !== NONE) return v;
    var t = c.t, kind = k.charCodeAt(0), name = k.slice(2);
    if (kind === 116) { var tf = tfOf(c); return name === "org" ? { ox: tf.ox, oy: tf.oy, xo: tf.xo, yo: tf.yo } : tf[name]; } // t:
    if (kind === 99) return t.style.getPropertyValue(name); // c:
    if (kind === 97) return t.getAttribute(name); // a:
    if (kind === 111) return isFn(t[name]) ? t[name]() : t[name]; // o:
    return null;
  }
  // nilai efektif saat ini (untuk awal tween): computed untuk CSS
  function effNow(F, c, k) {
    var v = F ? F.get(c, k) : NONE, t = c.t, kind = k.charCodeAt(0), name = k.slice(2);
    if (kind === 99) {
      if (v !== NONE && v !== "" && v != null) return v;
      if (v === NONE) {
        var inl = t.style.getPropertyValue(name);
        if (inl !== "" && (c.rb[name] === undefined || c.rb[name] === inl) && c.cv[name] !== undefined) return c.cv[name];
        if (inl === "" && c.base[name] !== undefined) return c.base[name];
        var cv = cs(t).getPropertyValue(name);
        if (name.indexOf("--") === 0) cv = cv.trim();
        if (inl === "") c.base[name] = cv;
        return cv;
      }
      // dikosongkan di frame ini: pakai computed dasar
      if (c.base[name] !== undefined) return c.base[name];
      var cb = cs(t).getPropertyValue(name);
      return name.indexOf("--") === 0 ? cb.trim() : cb;
    }
    if (v !== NONE) return v;
    return rawNow(null, c, k);
  }

  var CLEARED = {};
  function commit(F) {
    F.m.forEach(function (o, c) {
      var t = c.t, tfDirty = false, k, v;
      for (k in o) {
        v = o[k];
        var kind = k.charCodeAt(0), name = k.slice(2);
        if (kind === 116) {
          var tf = tfOf(c);
          if (name === "org") { if (v && (tf.ox !== v.ox || tf.oy !== v.oy || tf.xo !== v.xo || tf.yo !== v.yo || !c.tfInit)) { tf.ox = v.ox; tf.oy = v.oy; tf.xo = v.xo; tf.yo = v.yo; tfDirty = true; } }
          else if (tf[name] !== v || !c.tfInit) { tf[name] = v; tfDirty = true; }
        }
        else if (kind === 99) {
          if (v == null || v === "") { if (t.style.getPropertyValue(name) !== "") t.style.removeProperty(name); delete c.cv[name]; delete c.rb[name]; }
          else if (c.cv[name] !== v || t.style.getPropertyValue(name) !== c.rb[name]) { t.style.setProperty(name, v); c.cv[name] = v; c.rb[name] = t.style.getPropertyValue(name); }
        } else if (kind === 97) {
          if (v == null) { if (t.hasAttribute(name)) t.removeAttribute(name); } else if (t.getAttribute(name) !== String(v)) t.setAttribute(name, v);
        } else if (kind === 111) {
          if (isFn(t[name])) t[name](v); else if (t[name] !== v) t[name] = v;
        } else if (kind === 120) { // x: hapus properti (clearProps)
          if (v != null) clearProps(c, v);
        }
      }
      if (tfDirty) writeTransform(c);
    });
    F.m.clear();
  }
  function writeTransform(c) {
    var t = c.t, tf = c.tf;
    if (!tf) return;
    if (c.svg) {
      if (!c.tfInit) { c.tfInit = true; t.style.translate = "none"; t.style.rotate = "none"; t.style.scale = "none"; t.style.transformOrigin = "0px 0px"; }
      var os = tf.ox + " " + tf.oy;
      if (t.getAttribute("data-svg-origin") !== os) t.setAttribute("data-svg-origin", os);
      var m = svgTransform(tf);
      if (m !== c.tfStr) { t.setAttribute("transform", m); c.tfStr = m; }
      return;
    }
    if (!c.tfInit) { c.tfInit = true; t.style.translate = "none"; t.style.rotate = "none"; t.style.scale = "none"; }
    if (tf.o != null && tf.o !== c.origStr) { t.style.transformOrigin = tf.o; c.origStr = tf.o; }
    var s = htmlTransform(tf, CFG.force3D === true);
    if (s !== c.tfStr || t.style.transform === "") { t.style.transform = s; c.tfStr = s; }
  }
  function clearProps(c, v) {
    var t = c.t;
    if (!c.el) return;
    var list = v === true || v === "all" ? null : String(v).split(",").map(function (s) { return s.trim(); });
    if (!list) { t.style.cssText = ""; c.tf = null; c.tfInit = false; c.tfStr = null; c.origStr = null; c.cv = {}; c.rb = {}; if (c.svg) { t.removeAttribute("transform"); t.removeAttribute("data-svg-origin"); } return; }
    list.forEach(function (p) {
      if (TF[p] || p === "transform") { t.style.removeProperty("transform"); t.style.removeProperty("translate"); t.style.removeProperty("rotate"); t.style.removeProperty("scale"); if (c.svg) t.removeAttribute("transform"); c.tf = null; c.tfInit = false; c.tfStr = null; }
      else if (p === "transformOrigin") { t.style.removeProperty("transform-origin"); c.origStr = null; }
      else { var n = kebab(p); t.style.removeProperty(n); delete c.cv[n]; delete c.rb[n]; }
    });
  }

  // ======================================================================= konfigurasi
  var CFG = { force3D: false, nullTargetWarn: false, units: {}, autoSleep: 120 };
  var DEFAULTS = { duration: 0.5, ease: "power1.out", overwrite: false, delay: 0 };
  var defaultEase = function () { return parseEase(DEFAULTS.ease, EASES["power1.out"]); };

  // ======================================================================= track (satu target x satu properti)
  // jenis: n = angka (+satuan), c = warna, x = string kompleks, d = diskret, tf = komponen transform,
  //        aa = autoAlpha, to = transformOrigin
  var _creation = 0;

  function resolveVal(v, i, target, targets) {
    if (isFn(v)) v = v(i, target, targets);
    if (isStr(v) && v.indexOf("random(") >= 0) v = v.replace(/random\(([^)]*)\)/g, function (m, a) { return String(randomFromArgs(a)); });
    return v;
  }
  function randomFromArgs(a) {
    a = a.trim();
    if (a[0] === "[") { var arr = JSON.parse(a.replace(/'/g, '"')); return arr[Math.floor(rand() * arr.length)]; }
    var p = a.split(",").map(function (x) { return parseFloat(x); });
    return randomRange(p[0], p[1], p[2]);
  }
  function randomRange(min, max, snapTo) {
    var v = min + rand() * (max - min);
    if (snapTo) v = Math.round(v / snapTo) * snapTo;
    return r6(v);
  }
  function relParse(v) { var m = isStr(v) && /^([-+*\/])=\s*(.*)$/.exec(v.trim()); return m ? { op: m[1], v: m[2] } : null; }
  function applyRel(start, rel) {
    var n = parseFloat(rel.v) || 0;
    return rel.op === "+" ? start + n : rel.op === "-" ? start - n : rel.op === "*" ? start * n : start / n;
  }

  // ======================================================================= Animation dasar
  function Anim(vars) {
    this.vars = vars || {};
    this._start = 0; this._delay = +this.vars.delay || 0;
    this._repeat = this.vars.repeat === -1 ? -1 : Math.max(0, Math.floor(+this.vars.repeat || 0));
    this._rDelay = +this.vars.repeatDelay || 0;
    this._yoyo = !!this.vars.yoyo;
    this._ts = 1; this._tTime = 0; this._paused = !!this.vars.paused; this._rev = !!this.vars.reversed;
    this.parent = null; this.data = this.vars.data; this._id = ++_creation; this._prev = undefined;
    this._killed = false; this._started = false;
    this._cb = {};
    var self = this;
    ["onStart", "onUpdate", "onComplete", "onRepeat", "onReverseComplete", "onInterrupt"].forEach(function (k) { if (self.vars[k]) self._cb[k] = [self.vars[k], self.vars[k + "Params"]]; });
    if (_ctx) _ctx._add(this);
  }
  var AP = Anim.prototype;
  AP._dur = function () { return 0; };
  AP.duration = function (v) {
    if (!arguments.length) return this._dur();
    var d = this._dur();
    if (this._isTl) { if (d && v) this.timeScale(this._ts * d / v); }
    else { this._d = Math.max(0, +v || 0); this._dirty(); }
    return this;
  };
  AP.totalDuration = function (v) {
    var d = this._dur();
    if (arguments.length) { var td = this.totalDuration(); if (td && v) this.timeScale(this._ts * td / v); return this; }
    if (this._repeat < 0) return BIG;
    return rt(d * (this._repeat + 1) + this._rDelay * this._repeat);
  };
  AP.delay = function (v) {
    if (!arguments.length) return this._delay;
    if (this.parent) { this._start = rt(this._start + (v - this._delay)); this.parent._sort(); this.parent._dirty(); }
    this._delay = v; return this;
  };
  AP.startTime = function (v) {
    if (!arguments.length) return this._start;
    this._start = rt(+v || 0);
    if (this.parent) { this.parent._sort(); this.parent._dirty(); }
    return this;
  };
  AP.endTime = function (rep) { return rt(this._start + (rep === false ? this._dur() : this.totalDuration()) / (this._ts || 1)); };
  AP.timeScale = function (v) {
    if (!arguments.length) return this._ts;
    var p = this.parent;
    if (p && p._isGlobal && !this._paused) { var lt = this._tTime; this._ts = +v || 1e-8; this._start = rt(p._time - lt / this._ts); }
    else this._ts = +v || 1e-8;
    if (p) p._dirty();
    return this;
  };
  AP.repeat = function (v) { if (!arguments.length) return this._repeat; this._repeat = v === -1 ? -1 : Math.max(0, Math.floor(+v || 0)); this._dirty(); return this; };
  AP.repeatDelay = function (v) { if (!arguments.length) return this._rDelay; this._rDelay = +v || 0; this._dirty(); return this; };
  AP.yoyo = function (v) { if (!arguments.length) return this._yoyo; this._yoyo = !!v; this._dirty(); return this; };
  AP.iteration = function () { var c = this._dur() + this._rDelay; if (!c) return 1; var it = Math.floor(this._tTime / c + EPS); if (it && Math.abs(it * c - this._tTime) < EPS) it--; return it + 1; };
  AP._dirty = function () { var a = this; while (a) { a._dv = null; a._needPrime = true; a = a.parent; } };
  // waktu iterasi dari waktu total
  AP._iterTime = function (tt) {
    var d = this._dur();
    if (!this._repeat) return { t: Math.min(tt, d), i: 0 };
    var cyc = d + this._rDelay, tdur = this.totalDuration(), i, t;
    if (cyc <= 0) return { t: d, i: 0 };
    if (tt >= tdur) { i = this._repeat < 0 ? Math.floor(tt / cyc) : this._repeat; t = d; }
    else {
      i = Math.floor(tt / cyc + EPS); t = tt - i * cyc;
      if (i && t < EPS) { i--; t = d; }
      if (t > d) t = d; if (t < 0) t = 0;
    }
    if (this._yoyo && i % 2) t = d - t;
    return { t: t, i: i };
  };
  AP.totalTime = function (v, suppress) {
    if (!arguments.length) return this._tTime;
    seekRoot(this, +v || 0, !!suppress);
    return this;
  };
  AP.time = function (v, suppress) {
    if (!arguments.length) return this._iterTime(this._tTime).t;
    var it = this._iterTime(this._tTime), d = this._dur(), cyc = d + this._rDelay;
    var base = this._repeat ? it.i * cyc : 0;
    v = clampN(0, d, +v || 0);
    return this.totalTime(base + (this._yoyo && it.i % 2 ? d - v : v), suppress);
  };
  AP.progress = function (v, suppress) {
    var d = this._dur();
    if (!arguments.length) return d ? this.time() / d : this._tTime > 0 ? 1 : 0;
    return this.time(d * v, suppress);
  };
  AP.totalProgress = function (v, suppress) {
    var td = this.totalDuration();
    if (!arguments.length) return td ? this._tTime / td : this._tTime > 0 ? 1 : 0;
    return this.totalTime(td * v, suppress);
  };
  AP.seek = function (pos, suppress) {
    var t = isStr(pos) && this._isTl ? this._parsePos(pos, null, true) : +pos || 0;
    return this.totalTime(t, suppress !== false);
  };
  AP.paused = function (v) {
    if (!arguments.length) return this._paused;
    v = !!v;
    if (v !== this._paused) {
      this._paused = v;
      var p = this.parent;
      if (!v && p) { this._start = rt(this._rev ? p._time + this._tTime / this._ts : p._time - this._tTime / this._ts); if (p._isGlobal) TICK.wake(); }
    }
    return this;
  };
  AP.pause = function (at, suppress) { if (at != null) this.totalTime(at, suppress); return this.paused(true); };
  AP.play = function (from, suppress) { if (from != null) this.seek(from, suppress); this._rev = false; this.paused(true); return this.paused(false); };
  AP.resume = function () { return this.paused(false); };
  AP.reverse = function (from, suppress) { if (from != null) this.seek(from, suppress); this.paused(true); this._rev = true; return this.paused(false); };
  AP.reversed = function (v) { if (!arguments.length) return this._rev; if (!!v !== this._rev) { var pz = this._paused; this.paused(true); this._rev = !!v; this.paused(pz); } return this; };
  AP.restart = function (incDelay, suppress) { this._rev = false; this.totalTime(0, suppress); this.paused(true); return this.paused(false); };
  AP.isActive = function () {
    var p = this.parent; if (!p || this._paused) return false;
    var lt = (p._time - this._start) * this._ts; return lt >= 0 && lt < this.totalDuration();
  };
  AP.kill = function () { this._killed = true; if (this.parent) this.parent.remove(this); return this; };
  AP.eventCallback = function (type, fn, params) {
    if (arguments.length < 2) return this._cb[type] ? this._cb[type][0] : undefined;
    if (fn == null) delete this._cb[type]; else this._cb[type] = [fn, params];
    return this;
  };
  AP.then = function (onF) {
    var self = this;
    return new Promise(function (res) {
      var prev = self._cb.onComplete;
      self._cb.onComplete = [function () { if (prev) prev[0].apply(self, prev[1] || []); res(self); }, null];
    }).then(onF);
  };
  AP.invalidate = function () { this._dirty(); this._invalid = true; return this; };
  AP.revert = function () { var F = new Frame(); undoLog(this, F); commit(F); this.kill(); return this; };
  AP.globalTime = function (t) { var a = this, v = arguments.length ? t : this._tTime; while (a.parent) { v = a._start + v / (a._ts || 1); a = a.parent; } return v; };

  // ======================================================================= render & seek
  // Status sebuah anak pada waktu induk: -1 sebelum mulai, selain itu waktu total lokal (dibatasi).
  function localOf(child, pt) {
    var lt = (pt - child._start) * child._ts;
    if (lt < -TEPS) return -1;
    var td = child.totalDuration();
    if (td - lt < 1e-9) return td; // float noise (e.g. 4.05 - 3.15) must still reach the end exactly (elastic.out ends on its value)
    return lt > td ? td : lt < 0 ? 0 : lt;
  }
  function queue(F, a, type) { if (F && F.q && a._cb[type]) F.q.push([a, type]); }
  function fireQueue(q) {
    for (var i = 0; i < q.length; i++) {
      var a = q[i][0], cb = a._cb[q[i][1]];
      if (!cb) continue;
      try { cb[0].apply(a.vars.callbackScope || a, cb[1] || []); } catch (e) { if (root.console) console.error(e); }
    }
  }
  function callbacks(F, a, prev, now, suppress) {
    if (suppress || !F) return;
    var td = a.totalDuration();
    if (now >= 0 && (now !== prev || prev === undefined)) {
      if ((prev === undefined || prev <= 0) && (now > 0 || td === 0)) queue(F, a, "onStart");
      if (!(prev === undefined && now === 0 && td > 0)) queue(F, a, "onUpdate");
      if (now >= td && (prev === undefined || prev < td)) queue(F, a, "onComplete");
    } else if (now < 0 && prev !== undefined && (prev > 0 || (td === 0 && prev >= 0))) {
      queue(F, a, "onUpdate");
      queue(F, a, "onReverseComplete");
    }
  }

  var _seeking = 0, _ticking = 0;
  /** fps of the frame grid on which start values are read (GSAP: first rendered frame at or after the start).
   *  config({initFps}) > window.__mgpInitFps (set by the mgp runtime to the composition fps) > 60 under the live ticker > 0 (exact start). */
  function initFps() {
    if (CFG.initFps != null) return +CFG.initFps || 0;
    if (root && root.__mgpInitFps != null) return +root.__mgpInitFps || 0;
    return _ticking ? 60 : 0;
  }
  function seekRoot(a, t, suppress) {
    var td = a.totalDuration();
    t = t < 0 ? 0 : t > td ? td : t;
    var F = new Frame();
    _seeking++;
    try {
      var prev = a._prevSeek;
      replay(a, F, t, suppress);
      callbacks(F, a, prev, t, suppress);
      a._prevSeek = t;
      commit(F);
    } finally { _seeking--; }
    fireQueue(F.q);
  }
  // bangun ulang keadaan pada t: urungkan render terakhir, pasang render langsung, render urut
  function replay(a, F, t, suppress) {
    var u = takeUndo(a);
    if (a._needPrime !== false || a._invalid) {
      // Mode pemanasan ditetapkan sekali, dari seek pertama: seek pertama langsung ke akhir (pola
      // "pemanasan" blok: totalTime(durasi) lalu 0) berarti setiap tween menangkap nilai awal dari
      // keadaan akhir anak sebelumnya (sama seperti lompatan GSAP); selain itu sapuan berurutan.
      if (!a._primeMode) { var tdu = a.totalDuration(); a._primeMode = tdu > 0 && t >= tdu - EPS ? "lompat" : "sapu"; }
      prime(a, u, a._primeMode);
    }
    applyUndo(u, F);
    resetWritten(a);
    a._log = F.log = [];
    redoImmediate(a, F);
    a._tTime = t;
    renderAt(a, F, t, suppress, true);
  }
  // ambil nilai urung dari log render terakhir (urutan terbalik) lalu kosongkan log
  function takeUndo(a) {
    var log = a._log, out = [];
    if (log) for (var i = log.length - 1; i >= 0; i--) { var tr = log[i]; out.push(tr.c, tr.k, tr.undo); if (tr.k2) out.push(tr.c, tr.k2, tr.undo2); tr.w = 0; }
    a._log = null;
    return out;
  }
  function applyUndo(u, F) { for (var i = 0; i < u.length; i += 3) if (u[i + 1] !== "x:clear") F.set(u[i], u[i + 1], u[i + 2]); }
  function undoLog(a, F) { applyUndo(takeUndo(a), F); }
  // kumpulkan tween yang dirender langsung (from/fromTo/startAt), urut pembuatan
  function collectImmediate(a, out) {
    if (a._isTl) { for (var i = 0; i < a._ch.length; i++) if (!a._ch[i]._paused) collectImmediate(a._ch[i], out); }
    else if (a._sub) collectImmediate(a._sub, out);
    else if (a._imm) out.push(a);
    return out;
  }
  function redoImmediate(a, F) {
    var list = collectImmediate(a, []);
    if (!a._isTl && !a._sub && a._imm && list.indexOf(a) < 0) list.push(a);
    list.sort(function (p, q) { return p._id - q._id; });
    for (var i = 0; i < list.length; i++) list[i]._renderImmediate(F);
  }
  // render satu animasi pada waktu total lokal tt (sudah dibatasi), mode replay
  function renderAt(a, F, tt, suppress, replay) {
    if (a._isTl) a._renderChildren(F, a._iterTime(tt).t, suppress, replay);
    else a._renderTween(F, tt, suppress, replay);
  }
  // pemanasan: sapu maju berurutan di frame bayangan supaya setiap tween menangkap nilai awal
  // tepat pada saat ia pertama mulai (seperti pemutaran berurutan), tanpa menyentuh DOM.
  function prime(a, u, mode) {
    var S = new Frame();
    S.q = null; S.log = null;
    a._needPrime = false; a._invalid = false;
    applyUndo(u || [], S);
    resetInit(a);
    resetWritten(a);
    redoImmediate(a, S);
    var times = [], td = a.totalDuration();
    if (mode !== "lompat") collectStarts(a, 0, 1, times);
    var gf = mode !== "lompat" ? initFps() : 0;
    if (gf > 0) times = times.map(function (x) { return Math.ceil(x * gf - 1e-6) / gf; });
    times.push(td >= BIG ? a._dur() : td);
    times = uniq(times.map(rt).filter(function (x) { return x >= 0 && x < BIG; })).sort(function (p, q) { return p - q; });
    var st = { prev: new Map() };
    for (var i = 0; i < times.length; i++) incRender(a, S, Math.min(times[i], td), st);
    // tulisan bayangan dibuang
    resetWritten(a);
  }
  function resetInit(a) {
    if (a._isTl) for (var i = 0; i < a._ch.length; i++) resetInit(a._ch[i]);
    else { if (a._sub) resetInit(a._sub); if (!a._imm || a._invalid) a._inited = false; a._invalid = false; }
  }
  function resetWritten(a) {
    if (a._isTl) for (var i = 0; i < a._ch.length; i++) resetWritten(a._ch[i]);
    else { if (a._sub) resetWritten(a._sub); if (a._tracks) a._tracks.forEach(function (tr) { tr.w = 0; }); }
  }
  function collectStarts(a, off, ts, out) {
    if (a._isTl) {
      for (var i = 0; i < a._ch.length; i++) {
        var c = a._ch[i]; if (c._paused) continue;
        var s = off + c._start / ts; out.push(s);
        collectStarts(c, s, ts * c._ts, out);
      }
    } else if (a._sub) collectStarts(a._sub, off, ts * a._sub._ts, out);
  }
  // render bertahap (hanya yang berubah) untuk pemanasan
  function incRender(a, S, tt, st) {
    if (a._isTl) {
      var t = a._iterTime(tt).t;
      for (var i = 0; i < a._ch.length; i++) {
        var c = a._ch[i]; if (c._paused) continue;
        var lt = localOf(c, t);
        if (lt < 0) continue;
        var pv = st.prev.get(c);
        if (pv === lt && (c._isTl || c._sub || c._inited)) continue;
        st.prev.set(c, lt);
        incRender(c, S, lt, st);
      }
    } else if (a._sub) incRender(a._sub, S, a._subTime(tt), st);
    else a._renderTween(S, tt, true, false);
  }

  // ======================================================================= Timeline
  function Timeline(vars) {
    vars = vars || {};
    Anim.call(this, vars);
    this._isTl = true; this._ch = []; this.labels = {}; this._recent = null; this._dv = null; this._ord = 0;
    this.autoRemoveChildren = !!vars.autoRemoveChildren; this.smoothChildTiming = !!vars.smoothChildTiming;
    this._defaults = vars.defaults || {};
    this._needPrime = true;
    if (!vars.parent && GLOBAL && !this._isGlobal) attachGlobal(this);
  }
  var TP = Timeline.prototype = Object.create(AP);
  TP.constructor = Timeline;
  TP._dur = function () {
    if (this._dv != null) return this._dv;
    var m = 0;
    for (var i = 0; i < this._ch.length; i++) { var c = this._ch[i]; var e = c._start + c.totalDuration() / (c._ts || 1); if (e > m) m = e; }
    return (this._dv = rt(Math.min(m, BIG)));
  };
  TP._sort = function () { this._ch.sort(function (a, b) { return a._start - b._start || a._ord - b._ord; }); };
  TP._insert = function (child, pos) {
    if (child.parent) child.parent.remove(child);
    child.parent = this; child._ord = ++this._ord;
    child._start = rt(pos + (child._delay || 0));
    this._ch.push(child); this._sort(); this._recent = child; this._dirty();
    return child;
  };
  TP._inheritVars = function (vars) {
    var out = {}, chain = [], a = this, k;
    while (a && !a._isGlobal) { if (a._defaults) chain.unshift(a._defaults); if (a.vars && a.vars.inherit === false) break; a = a.parent; }
    chain.forEach(function (d) { for (k in d) out[k] = d[k]; });
    for (k in vars) out[k] = vars[k];
    return out;
  };
  // parameter posisi
  TP._parsePos = function (pos, child, noCreate) {
    var end = this._dur(), rec = this._recent, labels = this.labels;
    if (pos == null || pos === "") return end;
    if (isNum(pos)) return pos;
    var s = String(pos).trim(), off = 0, base, m;
    var parseOff = function (str, dur) {
      if (!str) return 0;
      var mm = /^([+-]=)?\s*([-+]?[\d.]+(?:e[-+]?\d+)?)(%?)$/i.exec(str.trim());
      if (!mm) return 0;
      var n = parseFloat(mm[2]); if (mm[3]) n = n / 100 * (dur || 0);
      return mm[1] === "-=" ? -n : n;
    };
    if (s[0] === "<" || s[0] === ">") {
      base = rec ? (s[0] === "<" ? rec._start : rec._start + rec.totalDuration() / (rec._ts || 1)) : (s[0] === "<" ? 0 : end);
      var rest = s.slice(1);
      off = parseOff(rest, /%$/.test(rest) ? (rest.indexOf("=") >= 0 && child ? child.totalDuration() : rec ? rec.totalDuration() : 0) : 0);
      return rt(base + off);
    }
    if ((m = /^([+-])=(.*)$/.exec(s))) return rt(end + parseOff(s, child ? child.totalDuration() : 0));
    if (/^[-+]?[\d.]+(?:e[-+]?\d+)?$/i.test(s)) return +s;
    var i = s.search(/[+-]=/), lab = i < 0 ? s : s.slice(0, i), rel = i < 0 ? "" : s.slice(i);
    if (!(lab in labels)) { if (noCreate) return end; labels[lab] = end; }
    return rt(labels[lab] + parseOff(rel, child ? child.totalDuration() : 0));
  };
  TP.add = function (child, pos) {
    var self = this;
    if (Array.isArray(child)) { var p = this._parsePos(pos); child.forEach(function (c) { self.add(c, p); }); return this; }
    if (isStr(child)) return this.addLabel(child, pos);
    if (isFn(child)) return this.call(child, null, pos);
    if (!child || !(child instanceof Anim)) return this;
    if (child === this) return this;
    this._insert(child, this._parsePos(pos, child));
    return this;
  };
  TP.addLabel = function (name, pos) { this.labels[name] = this._parsePos(pos); return this; };
  TP.removeLabel = function (name) { delete this.labels[name]; return this; };
  TP.addPause = function (pos, cb, params) {
    var self = this, p = this._parsePos(pos);
    new Tween([], { duration: 0, immediateRender: false, onComplete: function () { self.pause(); if (cb) cb.apply(self, params || []); }, parent: this }, "to", null, this, p);
    return this;
  };
  TP.to = function (targets, vars, pos, p4) { if (isNum(vars)) { var d = vars; vars = Object.assign({}, pos); vars.duration = d; pos = p4; } return this._tw(targets, vars, pos, "to"); };
  TP.from = function (targets, vars, pos, p4) { if (isNum(vars)) { var d = vars; vars = Object.assign({}, pos); vars.duration = d; pos = p4; } return this._tw(targets, vars, pos, "from"); };
  TP.fromTo = function (targets, fromVars, toVars, pos, p5) {
    if (isNum(fromVars)) { var d = fromVars; fromVars = toVars; toVars = Object.assign({}, pos); toVars.duration = d; pos = p5; }
    return this._tw(targets, toVars, pos, "fromTo", fromVars);
  };
  TP.set = function (targets, vars, pos) {
    vars = Object.assign({}, vars); vars.duration = 0;
    if (vars.immediateRender == null) vars.immediateRender = false;
    return this._tw(targets, vars, pos, "set");
  };
  TP.call = function (fn, params, pos) {
    var p = this._parsePos(pos);
    new Tween([], { duration: 0, immediateRender: false, onComplete: fn, onCompleteParams: params, onReverseComplete: fn, onReverseCompleteParams: params, parent: this }, "to", null, this, p);
    return this;
  };
  TP._tw = function (targets, vars, pos, kind, fromVars) {
    vars = this._inheritVars(vars || {});
    vars.parent = this;
    var tw = new Tween(targets, vars, kind, fromVars, this, pos);
    return this;
  };
  TP.remove = function (child) {
    if (Array.isArray(child)) { var s = this; child.forEach(function (c) { s.remove(c); }); return this; }
    if (isStr(child)) return this.removeLabel(child);
    var i = this._ch.indexOf(child);
    if (i >= 0) { this._ch.splice(i, 1); child.parent = null; if (this._recent === child) this._recent = this._ch[this._ch.length - 1] || null; this._dirty(); }
    return this;
  };
  TP.clear = function (labels) { var s = this; this._ch.slice().forEach(function (c) { s.remove(c); }); if (labels !== false) this.labels = {}; this._log = null; this._dirty(); return this; };
  TP.kill = function () { this._ch.slice().forEach(function (c) { c._killed = true; }); return AP.kill.call(this); };
  TP.recent = function () { return this._recent; };
  TP.getChildren = function (nested, tweens, timelines, ignoreBefore) {
    nested = nested !== false; tweens = tweens !== false; timelines = timelines !== false;
    var min = ignoreBefore == null ? -BIG : ignoreBefore, out = [];
    this._ch.forEach(function (c) {
      if (c._start < min) return;
      if (c._isTl) { if (timelines) out.push(c); if (nested) out.push.apply(out, c.getChildren(true, tweens, timelines)); }
      else if (tweens) out.push(c);
    });
    return out;
  };
  TP.getTweensOf = function (targets, onlyActive) {
    var t = toArray(targets);
    return this.getChildren(true, true, false).filter(function (tw) { return tw._targets && tw._targets.some(function (x) { return t.indexOf(x) >= 0; }) && (!onlyActive || tw.isActive()); });
  };
  TP.shiftChildren = function (amount, adjustLabels, ignoreBefore) {
    ignoreBefore = ignoreBefore || 0;
    this._ch.forEach(function (c) { if (c._start >= ignoreBefore) c._start = rt(c._start + amount); });
    if (adjustLabels) for (var k in this.labels) if (this.labels[k] >= ignoreBefore) this.labels[k] = rt(this.labels[k] + amount);
    this._dirty(); return this;
  };
  TP.invalidate = function () { this._ch.forEach(function (c) { c.invalidate(); }); return AP.invalidate.call(this); };
  TP.currentLabel = function () { var t = this.time(), best = null, bv = -1; for (var k in this.labels) { var v = this.labels[k]; if (v <= t + EPS && v > bv) { bv = v; best = k; } } return best; };
  TP.nextLabel = function (t) { t = t == null ? this.time() : t; var best = null, bv = BIG; for (var k in this.labels) { var v = this.labels[k]; if (v > t + EPS && v < bv) { bv = v; best = k; } } return best; };
  TP.previousLabel = function (t) { t = t == null ? this.time() : t; var best = null, bv = -1; for (var k in this.labels) { var v = this.labels[k]; if (v < t - EPS && v > bv) { bv = v; best = k; } } return best; };
  TP.tweenTo = function (pos, vars) {
    var self = this, to = this._parsePos(pos, null, true), proxy = { t: this.time() };
    vars = Object.assign({ duration: Math.abs(to - proxy.t) / (this._ts || 1), ease: "none" }, vars || {});
    var up = vars.onUpdate; vars.t = to; vars.onUpdate = function () { self.totalTime(proxy.t); if (up) up.apply(this, arguments); };
    this.pause(); return new Tween(proxy, vars, "to");
  };
  TP.tweenFromTo = function (a, b, vars) { this.seek(a); return this.tweenTo(b, vars); };
  // render anak-anak pada waktu iterasi t. Mode replay: semua anak yang sudah mulai dirender,
  // diurutkan menurut saat terakhir mereka berubah (anak yang sudah selesai lebih dulu),
  // sama seperti hasil pemutaran berurutan, tetapi tidak bergantung pada riwayat.
  TP._renderChildren = function (F, t, suppress, replay) {
    var ch = this._ch, list = [], i, c;
    for (i = 0; i < ch.length; i++) {
      c = ch[i];
      if (c._paused || c._killed) continue;
      var lt = localOf(c, t);
      if (lt < 0) {
        if (!suppress && c._prev !== undefined && c._prev >= 0) { var pv = c._prev; c._prev = -1; callbacks(F, c, pv, -1, suppress); if (c._isTl) c._renderChildren(F, -1, suppress, replay); }
        else c._prev = -1;
        continue;
      }
      var endT = c._start + c.totalDuration() / (c._ts || 1);
      list.push({ c: c, lt: lt, k: Math.min(t, endT), o: i });
    }
    list.sort(function (a, b) { return a.k - b.k || a.o - b.o; });
    for (i = 0; i < list.length; i++) {
      c = list[i].c;
      var prev = c._prev;
      c._tTime = list[i].lt;
      renderAt(c, F, list[i].lt, suppress, replay);
      callbacks(F, c, prev, list[i].lt, suppress);
      c._prev = list[i].lt;
    }
  };

  // ======================================================================= Tween
  function Tween(targets, vars, kind, fromVars, parentTl, pos) {
    vars = vars || {};
    kind = kind || "to";
    var parent = vars.parent || parentTl || null;
    var tv = {}; for (var k0 in vars) if (k0 !== "parent") tv[k0] = vars[k0];
    Anim.call(this, tv);
    this._kind = kind;
    this._from = fromVars || null;
    this._targets = uniq(toArray(targets));
    this._d = tv.duration != null ? Math.max(0, +tv.duration || 0) : kind === "set" ? 0 : (parent && parent._defaults && parent._defaults.duration != null ? +parent._defaults.duration : DEFAULTS.duration);
    this._ease = parseEase(tv.ease, null) || (tv.keyframes ? linear : defaultEase());
    this._inited = false; this._tracks = null; this._resolved = null;
    var imm = tv.immediateRender;
    if (kind === "from" || kind === "fromTo" || tv.startAt) this._imm = imm !== false;
    else if (kind === "set") this._imm = imm === true;
    else if (kind === "to" && this._d === 0 && !parent) this._imm = imm !== false;
    else this._imm = imm === true;
    this._register();
    if (tv.overwrite === true) killOthers(this);
    // stagger & keyframes -> timeline dalam
    var st = tv.stagger;
    if (tv.keyframes) this._buildKeyframes(tv);
    else if (st != null && st !== 0 && this._targets.length > 1) this._buildStagger(tv, st);
    else if (st != null && isObj(st) && this._targets.length === 1 && (st.repeat || st.yoyo)) this._buildStagger(tv, st);
    if (parent && parent._isTl) parent._insert(this, parent._parsePos(pos, this));
    else if (GLOBAL && !this._isGlobal) attachGlobal(this);
    if (this._imm) {
      var F = new Frame(); F.q = null;
      this._renderImmediate(F);
      commit(F);
      if (!this._sub) this._tracks && this._tracks.forEach(function (tr) { tr.w = 0; });
      if (this.parent && this.parent._isGlobal && this._d === 0) this._prevG = 0;
    }
  }
  var WP = Tween.prototype = Object.create(AP);
  WP.constructor = Tween;
  WP._dur = function () { return this._sub ? this._sub.totalDuration() / (this._sub._ts || 1) : this._d; };
  WP.targets = function () { return this._targets.slice(); };
  WP._register = function () {
    var self = this;
    this._targets.forEach(function (t) { if (isObj(t) || isFn(t)) { var s = TWEENS.get(t); if (!s) { s = new Set(); TWEENS.set(t, s); } s.add(self); } });
  };
  WP.kill = function (targets, props) {
    if (targets == null && props == null) { this._killed = true; if (this.parent) this.parent.remove(this); return this; }
    var tl = targets == null ? this._targets : toArray(targets);
    var pl = props == null ? null : isStr(props) ? props.split(",").map(function (s) { return s.trim(); }) : Object.keys(props);
    if (!pl) { this._targets = this._targets.filter(function (t) { return tl.indexOf(t) < 0; }); }
    if (this._tracks) this._tracks = this._tracks.filter(function (tr) { return !(tl.indexOf(tr.c.t) >= 0 && (!pl || pl.indexOf(tr.p) >= 0)); });
    if (pl) { this._skip = (this._skip || []).concat(pl); }
    if (!this._targets.length) AP.kill.call(this);
    return this;
  };
  WP.invalidate = function () { this._inited = false; this._tracks = null; this._resolved = this._resolved; if (this._sub) this._sub.invalidate(); return AP.invalidate.call(this); };
  WP._subTime = function (tt) { var it = this._iterTime(tt), d = this._dur(); return d ? this._ease(it.t / d) * d * (this._sub._ts || 1) : it.t; };

  WP._buildStagger = function (tv, st) {
    var targets = this._targets, n = targets.length, self = this;
    var cfg = isObj(st) && !Array.isArray(st) ? st : { each: st };
    var fn = isFn(st) ? st : distribute(cfg);
    var sub = new Timeline({ parent: true, paused: false });
    sub._owner = this;
    var base = {}, k;
    for (k in tv) if (k !== "stagger" && k !== "repeat" && k !== "yoyo" && k !== "repeatDelay" && k !== "delay" && k !== "onStart" && k !== "onUpdate" && k !== "onComplete" && k !== "onRepeat" && k !== "onReverseComplete" && k !== "paused" && k !== "id" && k !== "data" && !/Params$/.test(k)) base[k] = tv[k];
    if (isObj(cfg)) ["repeat", "yoyo", "repeatDelay", "onStart", "onUpdate", "onComplete"].forEach(function (kk) { if (cfg[kk] != null) base[kk] = cfg[kk]; });
    targets.forEach(function (t, i) {
      var v = {}; for (var kk in base) v[kk] = base[kk];
      v.duration = self._d; v.ease = tv.ease != null ? tv.ease : null; if (v.ease == null) v.ease = self._ease;
      v._index = i; v._all = targets; v.parent = sub; v.delay = 0;
      var tw = new Tween(t, v, self._kind, self._from ? self._from : null, null, null);
      var off = isFn(st) ? +st(i, t, targets) || 0 : +fn(i, t, targets) || 0;
      sub._insert(tw, off);
    });
    sub.parent = null;
    this._sub = sub;
    this._imm = false; // tween dalam yang menangani render langsung
    this._tracks = [];
    this._ease = linear;
  };
  WP._buildKeyframes = function (tv) {
    var kf = tv.keyframes, self = this, sub = new Timeline({ parent: true }), k;
    sub._owner = this;
    var common = {};
    for (k in tv) if (k !== "keyframes" && !RESERVED[k] && k !== "stagger") common[k] = tv[k];
    var targets = this._targets;
    var mk = function (vars, kind, from) { var v = Object.assign({}, vars); v.parent = sub; return new Tween(targets, v, kind, from, null, null); };
    if (this._from) {
      var sv = Object.assign({}, this._from); sv.parent = sub; sv.duration = 0; sv.immediateRender = this._imm !== false;
      var stw = new Tween(targets, sv, "set", null, null, null); sub._insert(stw, 0);
    }
    if (Array.isArray(kf)) {
      var defDur = tv.duration != null ? tv.duration / kf.length : DEFAULTS.duration;
      kf.forEach(function (f) {
        var v = Object.assign({}, common, f);
        if (v.duration == null) v.duration = defDur;
        if (v.ease == null) v.ease = "none";
        var at = sub._dur();
        var tw = mk(v, "to");
        sub._insert(tw, at);
      });
    } else {
      var easeEach = kf.easeEach || "power1.inOut", D = tv.duration != null ? +tv.duration : DEFAULTS.duration, pct = [];
      for (k in kf) {
        if (k === "easeEach" || k === "ease") continue;
        if (/%$/.test(k)) { pct.push([parseFloat(k) / 100, kf[k]]); continue; }
        var vals = kf[k]; if (!Array.isArray(vals)) vals = [vals];
        var segs = vals.length - 1;
        if (segs < 1) { var o0 = {}; o0[k] = vals[0]; o0.duration = D; o0.ease = "none"; sub._insert(mk(o0, "to"), 0); continue; }
        for (var i = 0; i < segs; i++) {
          var f0 = {}, t0 = {}; f0[k] = vals[i]; t0[k] = vals[i + 1]; t0.duration = D / segs; t0.ease = easeEach; t0.immediateRender = false;
          sub._insert(mk(t0, "fromTo", f0), D / segs * i);
        }
      }
      pct.sort(function (a, b) { return a[0] - b[0]; });
      var lastP = 0;
      pct.forEach(function (pp) {
        var v = Object.assign({}, pp[1]); var dd = (pp[0] - lastP) * D;
        if (v.ease == null) v.ease = easeEach;
        v.duration = dd;
        if (dd <= 0) { v.duration = 0; sub._insert(mk(v, "set"), pp[0] * D); }
        else sub._insert(mk(v, "to"), lastP * D);
        lastP = pp[0];
      });
      if (sub._dur() < D) sub._insert(new Tween([], { duration: 0, parent: sub }, "set"), D);
    }
    sub.parent = null;
    this._sub = sub; this._imm = false; this._tracks = [];
    if (tv.ease == null) this._ease = linear;
  };

  // ---------------------------------------------------------------- inisialisasi track
  WP._resolvedFor = function (ti) {
    if (!this._resolved) this._resolved = [];
    var r = this._resolved[ti];
    if (r) return r;
    var t = this._targets[ti], all = this.vars._all || this._targets, idx = this.vars._index != null ? this.vars._index : ti, k;
    var res = function (vars) {
      if (!vars) return null;
      var o = {};
      for (var kk in vars) {
        if (kk === "attr" && isObj(vars.attr)) { o.attr = {}; for (var a in vars.attr) o.attr[a] = resolveVal(vars.attr[a], idx, t, all); }
        else if (kk === "css" && isObj(vars.css)) { for (var a2 in vars.css) o[a2] = resolveVal(vars.css[a2], idx, t, all); }
        else if (!RESERVED[kk] || kk === "autoAlpha" || kk === "transformOrigin" || kk === "svgOrigin" || kk === "clearProps") { if (kk[0] !== "_") o[kk] = resolveVal(vars[kk], idx, t, all); }
      }
      return o;
    };
    r = { to: res(this.vars), from: res(this._from), startAt: res(this.vars.startAt) };
    if (this._kind === "from") { r.from = r.to; r.to = null; }
    this._resolved[ti] = r;
    return r;
  };
  WP._init = function (F) {
    this._inited = true;
    var tracks = [], self = this;
    for (var ti = 0; ti < this._targets.length; ti++) {
      var t = this._targets[ti], r = this._resolvedFor(ti);
      var c = (isObj(t) || isFn(t)) ? cacheOf(t) : null;
      if (!c) continue;
      // startAt: tulis dulu sebagai keadaan awal
      if (r.startAt) {
        var saK = Object.keys(r.startAt);
        saK.forEach(function (p) { if (self._skip && self._skip.indexOf(p) >= 0) return; var tr = makeTrack(self, c, p, r.startAt[p], undefined, F, "set"); if (tr) tr.forEach(function (x) { x.sa = 1; tracks.push(x); writeTrack(x, F, 1, 1, self._imm); }); });
      }
      var keys = {}, k;
      if (r.to) for (k in r.to) keys[k] = 1;
      if (r.from) for (k in r.from) keys[k] = 1;
      var order = Object.keys(keys);
      if (order.indexOf("transformOrigin") > 0) { order.splice(order.indexOf("transformOrigin"), 1); order.unshift("transformOrigin"); }
      if (order.indexOf("svgOrigin") > 0) { order.splice(order.indexOf("svgOrigin"), 1); order.unshift("svgOrigin"); }
      var seenTf = {};
      for (var oi = 0; oi < order.length; oi++) {
        var p = order[oi];
        if (TF[p]) { var tn = TF_ALIAS[p] || p; if (seenTf[tn]) continue; seenTf[tn] = 1; }
        if (this._skip && this._skip.indexOf(p) >= 0) continue;
        if (p === "attr") {
          var at = {}, af = r.from && r.from.attr || {}, an = r.to && r.to.attr || {}, a;
          for (a in an) at[a] = 1; for (a in af) at[a] = 1;
          for (a in at) { var trA = makeAttrTrack(this, c, a, an[a] === undefined && this._kind === "fromTo" ? af[a] : an[a], af[a], F); if (trA) tracks.push(trA); }
          continue;
        }
        var ev = r.to ? r.to[p] : undefined;
        // fromTo: properti yang hanya ada di vars "from" dipasang tetap (tidak dianimasikan)
        if (ev === undefined && this._kind === "fromTo" && r.from) ev = r.from[p];
        var trs = makeTrack(this, c, p, ev, r.from ? r.from[p] : undefined, F, this._kind);
        if (trs) tracks.push.apply(tracks, trs);
      }
    }
    if (this.vars.force3D === true) for (var fi = 0; fi < this._targets.length; fi++) { var fc = isObj(this._targets[fi]) ? cacheOf(this._targets[fi]) : null; if (fc && fc.el && !fc.svg) { var ft = newTrack(this, fc, "t:f3", "force3D"); ft.kind = "to"; ft.e = 1; tracks.push(ft); } }
    this._tracks = tracks;
  };
  // render langsung (keadaan "from") saat pembuatan / fase pasang ulang
  WP._renderImmediate = function (F) {
    if (this._sub) return;
    if (!this._inited) this._init(F);
    var ratio = this._d === 0 && (this._kind === "set" || this._kind === "to") ? 1 : this._ease(0);
    var p = this._d === 0 && (this._kind === "set" || this._kind === "to") ? 1 : 0;
    for (var i = 0; i < this._tracks.length; i++) { var tr = this._tracks[i]; writeTrack(tr, F, tr.sa ? 1 : ratio, tr.sa ? 1 : p, true); }
  };
  WP._renderTween = function (F, tt, suppress, replay) {
    if (this._sub) { renderAt(this._sub, F, clampN(0, this._sub.totalDuration(), this._subTime(tt)), suppress, replay); return; }
    if (!this._inited) this._init(F);
    var d = this._d, it = this._iterTime(tt), p = d ? it.t / d : 1;
    if (p > 1 - 1e-12) p = 1;
    var ratio = d ? (p >= 1 ? this._ease(1) : this._ease(p)) : 1;
    if (d && p >= 1 && Math.abs(this._ease(1) - 1) < 1e-12) ratio = 1;
    for (var i = 0; i < this._tracks.length; i++) { var tr = this._tracks[i]; writeTrack(tr, F, tr.sa ? 1 : ratio, tr.sa ? 1 : p, false); }
  };

  // ---------------------------------------------------------------- pembuatan track
  function newTrack(tw, c, key, p) { return { tw: tw, c: c, k: key, p: p, w: 0, undo: undefined }; }
  function recordUndo(tr, F) {
    if (tr.w) return;
    tr.w = 1;
    if (tr.permUndo) { tr.undo = tr.pu; if (tr.k2) tr.undo2 = tr.pu2; }
    else if (UNDO_START[tr.kind] && !tr.nanMid && !tr.sa && tr.tw._kind === "to" && tr.c.el) {
      // seperti GSAP: tween yang diputar mundur melewati awalnya menulis nilai awalnya sendiri
      tr.undo = trackValue(tr, 0, 0, F); if (tr.k2) tr.undo2 = tr.v2;
    }
    else { tr.undo = rawNow(F, tr.c, tr.k); if (tr.k2) tr.undo2 = rawNow(F, tr.c, tr.k2); }
    if (F.log) F.log.push(tr);
  }
  var UNDO_START = { n: 1, c: 1, aa: 1, tf: 1 };
  function writeTrack(tr, F, ratio, p, immediate) {
    recordUndo(tr, F);
    if (immediate && tr.tw._imm && !tr.permUndo) { tr.permUndo = true; tr.pu = tr.undo; tr.pu2 = tr.undo2; }
    var v = trackValue(tr, ratio, p, F);
    if (v === NONE) return;
    F.set(tr.c, tr.k, v);
    if (tr.k2) F.set(tr.c, tr.k2, tr.v2);
  }
  function trackValue(tr, r, p, F) {
    switch (tr.kind) {
      case "n": {
        if (tr.nanMid && r !== 1) return NONE;
        var v = r === 1 ? tr.e : tr.s + (tr.e - tr.s) * r;
        if (tr.round) v = Math.round(v); else if (r !== 1 || tr.endRound) v = tr.prec === 6 ? r6(v) : r4(v);
        if (tr.u2) tr.v2 = tr.u;
        if (tr.out === "num") return v;
        if (tr.out === "str" && r === 1 && tr.raw != null) return tr.raw;
        return v + (tr.u || "");
      }
      case "tf": {
        var w = r === 1 ? tr.e : tr.s + (tr.e - tr.s) * r;
        if (r !== 1) w = r4(w);
        if (tr.k2) tr.v2 = tr.u;
        return w;
      }
      case "c": return r === 1 && tr.raw != null ? tr.raw : colorStr(mixC(tr.s, tr.e, r));
      case "x": return complexAt(tr.cx, r);
      case "d": return (tr.atEnd ? p >= 1 : p > 0) ? tr.e : tr.s;
      case "aa": {
        var a = r === 1 ? tr.e : r4(tr.s + (tr.e - tr.s) * r);
        tr.v2 = a === 0 ? "hidden" : "inherit";
        return String(a);
      }
      case "to": return tr.e;
      case "so": {
        var co = rawNow(F, tr.c, "t:org");
        if (co.ox === tr.e.ox && co.oy === tr.e.oy) return co;
        return { ox: tr.e.ox, oy: tr.e.oy, xo: (co.xo || 0) + tr.d[0], yo: (co.yo || 0) + tr.d[1] };
      }
      case "clr": return p >= 1 ? tr.e : NONE;
    }
    return NONE;
  }

  // nilai mentah -> bentuk yang bisa diinterpolasi
  function numPart(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

  function makeTrack(tw, c, p, endV, fromV, F, kind) {
    var t = c.t, hasFrom = fromV !== undefined, hasEnd = endV !== undefined;
    var isFromKind = kind === "from";
    if (c.el) {
      if (p === "autoAlpha") return [makeAutoAlpha(tw, c, endV, fromV, F, isFromKind)];
      if (p === "transformOrigin" || p === "svgOrigin") return [makeOrigin(tw, c, p, hasEnd ? endV : fromV, F)];
      if (p === "clearProps") { var trc = newTrack(tw, c, "x:clear", p); trc.kind = "clr"; trc.e = endV; trc.permUndo = true; trc.pu = undefined; return [trc]; }
      if (p === "scale") { var a1 = makeTf(tw, c, "scaleX", endV, fromV, F, isFromKind), a2 = makeTf(tw, c, "scaleY", endV, fromV, F, isFromKind); return [a1, a2]; }
      if (TF[p]) { var nm = TF_ALIAS[p] || p; return [makeTf(tw, c, nm, endV, fromV, F, isFromKind)]; }
      if (p === "force3D") return null;
      if (p === "className") return [makeDiscrete(tw, c, "o:className", p, endV, fromV, F, isFromKind)];
      if (p.indexOf("--") === 0 || (p in t.style) || !(p in t)) { var tcss = makeCss(tw, c, p, endV, fromV, F, isFromKind); return tcss ? [tcss] : null; }
      return [makeObj(tw, c, p, endV, fromV, F, isFromKind)];
    }
    return [makeObj(tw, c, p, endV, fromV, F, isFromKind)];
  }
  // dari (start, end) mentah yang sudah dipilih, bangun track nilai
  function fillValue(tr, sRaw, eRaw, ctx) {
    // ctx: { css: bool, prop, el, unitDefault }
    var rel = relParse(eRaw);
    if (isNum(eRaw) || (rel && !isNaN(parseFloat(rel.v)) && !parseColor(rel.v))) {
      var s = isNum(sRaw) ? sRaw : numPart(sRaw), su = isStr(sRaw) ? unitOf(sRaw) : "";
      var e, eu;
      if (rel) { eu = unitOf(rel.v) || su; e = applyRel(s, rel); }
      else { e = eRaw; eu = null; }
      tr.kind = "n"; tr.s = s; tr.e = e;
      if (ctx.css) {
        var u = eu != null ? eu : ctx.unitless ? "" : (su || "px");
        if (eu == null && ctx.unitless) u = "";
        if (su && u && su !== u && s && ctx.el) s = s * pxPer(ctx.el, ctx.prop, su) / pxPer(ctx.el, ctx.prop, u);
        tr.s = s; tr.u = u; tr.out = "str"; tr.endRound = true;
        tr.round = ctx.autoRound && u === "px";
        if (ctx.prop === "zIndex") tr.round = true;
        tr.raw = null;
      } else {
        tr.out = isStr(sRaw) && unitOf(sRaw) && !isNum(sRaw) ? "str" : "num"; tr.u = tr.out === "str" ? su : ""; tr.prec = 6;
        if (rel && unitOf(rel.v)) { tr.out = "str"; tr.u = unitOf(rel.v); }
      }
      return tr;
    }
    if (!isStr(eRaw)) { tr.kind = "d"; tr.s = sRaw; tr.e = eRaw; return tr; }
    var ec = parseColor(eRaw);
    if (ec) {
      var sc = parseColor(isStr(sRaw) ? sRaw : "");
      if (!sc && isStr(sRaw)) { var tk = tokenize(sRaw).slots.filter(function (x) { return x.c; })[0]; sc = tk ? tk.c : null; }
      sc = sc || [0, 0, 0, 0];
      tr.kind = "c"; tr.s = sc; tr.e = ec; tr.raw = eRaw; return tr;
    }
    var m = NUM_UNIT.exec(eRaw);
    if (m) {
      var e2 = parseFloat(m[1]), u2 = m[2], s2 = isNum(sRaw) ? sRaw : numPart(sRaw), su2 = isStr(sRaw) ? unitOf(sRaw) : "";
      tr.kind = "n"; tr.e = e2;
      if (ctx.css) {
        if (su2 !== u2 && s2 && ctx.el) s2 = s2 * pxPer(ctx.el, ctx.prop, su2 || "px") / pxPer(ctx.el, ctx.prop, u2 || "px");
        tr.s = s2; tr.u = u2; tr.out = "str"; tr.round = ctx.autoRound && u2 === "px"; tr.raw = null;
        if (ctx.prop === "zIndex") tr.round = true;
      } else { tr.s = s2; tr.u = u2; tr.out = u2 ? "str" : "num"; tr.prec = u2 ? 4 : 6; tr.raw = eRaw; }
      return tr;
    }
    var cx = makeComplex(isStr(sRaw) && sRaw !== "none" ? sRaw : isNum(sRaw) ? String(sRaw) : "", eRaw);
    if (cx && isStr(sRaw) && sRaw === eRaw) { tr.kind = "d"; tr.s = sRaw; tr.e = eRaw; return tr; }
    if (cx) { tr.kind = "x"; tr.cx = cx; return tr; }
    tr.kind = "d"; tr.s = sRaw; tr.e = eRaw;
    if (ctx.prop === "display" && eRaw === "none") tr.atEnd = true;
    return tr;
  }
  function makeCss(tw, c, p, endV, fromV, F, isFromKind) {
    var name = kebab(p), key = "c:" + name, tr = newTrack(tw, c, key, p);
    var isVar = name.indexOf("--") === 0;
    var ctx = { css: !isVar, prop: p, el: c.t, unitless: !!UNITLESS[p], autoRound: tw.vars.autoRound !== false && !isVar };
    var cur = effNow(F, c, key);
    // nilai inline tanpa satuan (mis. style.strokeDashoffset = 460.9) -> keluaran tanpa satuan juga
    if (!isVar && isNum(endV)) { var inl = F.has(c, key) ? F.get(c, key) : c.t.style.getPropertyValue(name); if (isStr(inl) && /^\s*-?(?:\d+\.?\d*|\.\d+)\s*$/.test(inl)) ctx.unitless = true; }
    var nanMid = fromV === undefined && !isVar && (cur === "normal" || cur === "none") && isNum(endV);
    if (endV === undefined) fillValue(tr, fromValue(fromV, cur), cur, ctx);
    else fillValue(tr, fromV !== undefined ? fromValue(fromV, cur) : cur, endV, ctx);
    if (nanMid && tr.kind === "n") tr.nanMid = true;
    if (isVar && tr.kind === "n") { tr.round = false; tr.prec = 6; tr.out = "str"; if (isNum(endV)) tr.u = ""; }
    if (tr.kind === "d" && tr.s == null) tr.s = "";
    return tr;
  }
  function fromValue(fromV, cur) { var rel = relParse(fromV); if (rel && !parseColor(rel.v)) return applyRel(numPart(cur), rel) + (unitOf(rel.v) || unitOf(cur)); return fromV; }

  function makeObj(tw, c, p, endV, fromV, F, isFromKind) {
    var key = "o:" + p, tr = newTrack(tw, c, key, p);
    var cur = effNow(F, c, key);
    if (cur === undefined || cur === null) cur = 0;
    var ctx = { css: false, prop: p };
    if (endV === undefined) { fillValue(tr, fromValue(fromV, cur), cur, ctx); if (tr.kind === "n" && isNum(cur)) { tr.out = "num"; tr.raw = null; } }
    else fillValue(tr, fromV !== undefined ? fromValue(fromV, cur) : cur, endV, ctx);
    if (tr.kind === "n") { tr.round = false; if (isNum(endV) || (endV === undefined && isNum(cur))) { tr.out = "num"; } tr.prec = tr.out === "str" ? 4 : 6; }
    if (tr.kind === "c" && endV === undefined) tr.raw = isStr(cur) ? cur : null;
    return tr;
  }
  function makeAttrTrack(tw, c, a, endV, fromV, F) {
    var key = "a:" + a, tr = newTrack(tw, c, key, "attr." + a);
    var cur = effNow(F, c, key);
    var ctx = { css: false, prop: a };
    if (endV === undefined) { fillValue(tr, fromValue(fromV, cur), cur == null ? "0" : cur, ctx); }
    else fillValue(tr, fromV !== undefined ? fromValue(fromV, cur) : cur == null ? (parseColor(String(endV)) ? "" : "0") : cur, endV, ctx);
    if (tr.kind === "n") { tr.round = false; tr.out = "str"; tr.u = isStr(endV) ? unitOf(endV) : ""; if (endV === undefined) tr.u = isStr(cur) ? unitOf(cur) : ""; tr.prec = 4; tr.raw = isStr(endV) ? endV : null; if (isNum(endV)) tr.raw = String(endV); }
    return tr;
  }
  function makeDiscrete(tw, c, key, p, endV, fromV, F) {
    var tr = newTrack(tw, c, key, p), cur = effNow(F, c, key);
    tr.kind = "d"; tr.s = fromV !== undefined ? fromV : cur; tr.e = endV !== undefined ? endV : cur; return tr;
  }
  function makeAutoAlpha(tw, c, endV, fromV, F) {
    var tr = newTrack(tw, c, "c:opacity", "autoAlpha");
    tr.k2 = "c:visibility";
    var cur = numPart(effNow(F, c, "c:opacity"));
    var vis = rawNow(F, c, "c:visibility"); // hanya nilai milik elemen sendiri (bukan warisan induk)
    if (vis === "hidden" && cur === 1) cur = 0;
    var rs = function (v, base) { var rel = relParse(v); return rel ? applyRel(base, rel) : numPart(v); };
    tr.kind = "aa";
    if (endV === undefined) { tr.s = rs(fromV, cur); tr.e = cur; }
    else { tr.s = fromV !== undefined ? rs(fromV, cur) : cur; tr.e = rs(endV, tr.s); }
    return tr;
  }
  function makeOrigin(tw, c, p, v, F) {
    var tr = newTrack(tw, c, "t:o", p), tf = tfOf(c);
    tr.kind = "to";
    if (c.svg) {
      var o = parseOriginSVG(tf, v, p === "svgOrigin", c.t);
      // smoothOrigin: geser x/y tambahan supaya matriks saat ini tidak melompat ketika asal berubah
      tr.k = "t:org"; tr.kind = "so"; tr.e = { ox: o[0], oy: o[1] };
      var cur = rawNow(F, c, "t:org"), M = mat2({ rotation: rawNow(F, c, "t:rotation"), skewX: rawNow(F, c, "t:skewX"), skewY: rawNow(F, c, "t:skewY"), scaleX: rawNow(F, c, "t:scaleX"), scaleY: rawNow(F, c, "t:scaleY") });
      var ex = function (X, Y) { return [X - (M[0] * X + M[2] * Y), Y - (M[1] * X + M[3] * Y)]; };
      var e0 = ex(cur.ox, cur.oy), e1 = ex(o[0], o[1]);
      tr.d = [e0[0] - e1[0], e0[1] - e1[1]];
      return tr;
    }
    var po = parseOriginHTML(v);
    tr.e = po.s; tr.k2 = "t:zo"; tr.v2 = po.z;
    return tr;
  }
  function makeTf(tw, c, nm, endV, fromV, F, isFromKind) {
    var tr = newTrack(tw, c, "t:" + nm, nm), tf = tfOf(c);
    var cur = rawNow(F, c, "t:" + nm);
    var curU = nm === "x" ? rawNow(F, c, "t:xu") : nm === "y" ? rawNow(F, c, "t:yu") : null;
    tr.kind = "tf";
    var parse = function (v, base, baseU) {
      // -> [angka, satuan]
      var rel = relParse(v), u = "", n;
      if (isNum(v)) return [v, nm === "x" || nm === "y" ? (baseU === "%" ? "px" : "px") : ""];
      if (rel) { n = parseFloat(rel.v) || 0; u = unitOf(rel.v); if (/^rotation/.test(nm) || /^skew/.test(nm)) n = angle(n, u); return [rel.op === "+" ? base + n : rel.op === "-" ? base - n : rel.op === "*" ? base * n : base / n, nm === "x" || nm === "y" ? baseU : ""]; }
      if (isStr(v)) {
        n = parseFloat(v); u = unitOf(v);
        if (isNaN(n)) n = 0;
        if (/^rotation/.test(nm) || /^skew/.test(nm)) return [angle(n, u), ""];
        if (nm === "x" || nm === "y") {
          if (u === "%") return [n, "%"];
          if (u && u !== "px" && c.el) return [n * pxPer(c.t, nm, u), "px"];
          return [n, "px"];
        }
        return [n, ""];
      }
      return [0, ""];
    };
    var isXY = nm === "x" || nm === "y";
    if (isXY) tr.k2 = "t:" + nm + "u";
    var S, E;
    if (endV === undefined) { S = parse(fromV, cur, curU); E = [cur, curU]; }
    else { S = fromV !== undefined ? parse(fromV, cur, curU) : [cur, curU]; E = parse(endV, S[0], S[1]); }
    if (isXY) {
      // satuan beda: ubah awal ke satuan akhir
      var su = S[1] || "px", eu = E[1] || "px";
      if (su !== eu && S[0]) {
        var size = c.svg ? (nm === "x" ? tfOf(c).bw : tfOf(c).bh) || 0 : nm === "x" ? c.t.offsetWidth || 0 : c.t.offsetHeight || 0;
        S[0] = su === "%" ? S[0] * size / 100 : size ? S[0] / size * 100 : 0;
      }
      tr.u = eu;
    }
    tr.s = S[0]; tr.e = E[0];
    if (!isXY) tr.u = undefined;
    return tr;
  }
  function angle(n, u) { return u === "rad" ? n * DEG : u === "turn" ? n * 360 : u === "grad" ? n * 0.9 : n; }

  // ======================================================================= global timeline & ticker
  var TWEENS = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var GLOBAL = null;
  function attachGlobal(a) {
    GLOBAL._ch.push(a); a.parent = GLOBAL; a._ord = ++GLOBAL._ord;
    a._start = rt(GLOBAL._time + (a._delay || 0));
    GLOBAL._sort(); GLOBAL._dv = null;
    if (!a._paused) TICK.wake();
  }
  function killOthers(tw) {
    tw._targets.forEach(function (t) {
      var s = TWEENS.get(t); if (!s) return;
      s.forEach(function (o) { if (o !== tw && !o._killed) o.kill(t); });
    });
  }
  // global: maju bertahap tanpa replay, sehingga tween lepas tidak menimpa timeline lain
  function GlobalTimeline() {
    Timeline.call(this, { parent: true });
    this._isGlobal = true; this._time = 0; this.autoRemoveChildren = true; this.parent = null;
  }
  GlobalTimeline.prototype = Object.create(TP);
  var GP = GlobalTimeline.prototype;
  GP.constructor = GlobalTimeline;
  GP.time = function (v) { if (!arguments.length) return this._time; return this.totalTime(v); };
  GP.totalTime = function (v, suppress) {
    if (!arguments.length) return this._time;
    this._time = Math.max(0, +v || 0); this._advance(!!suppress); return this;
  };
  GP._dur = TP._dur;
  GP._advance = function (suppress) {
    var F = new Frame(), done = [], t = this._time, ch = this._ch.slice();
    for (var i = 0; i < ch.length; i++) {
      var c = ch[i];
      if (c._paused || c._killed) continue;
      var lt = c._rev ? (c._start - t) * c._ts : (t - c._start) * c._ts, td = c.totalDuration();
      if (lt < 0) {
        // mundur melewati awal: kembalikan ke keadaan awal sekali
        if (c._prevG === undefined || c._prevG <= 0) continue;
        lt = 0;
      }
      lt = clampN(0, td, lt);
      if (lt === c._prevG) continue;
      var prev = c._prevG;
      c._prevG = lt; c._tTime = lt;
      if (c._isTl) {
        var sub = new Frame();
        replay(c, sub, lt, suppress);
        callbacks(sub, c, prev, lt, suppress);
        commit(sub); fireQueue(sub.q);
      } else {
        F.log = null;
        c._renderTween(F, lt, suppress, false);
        callbacks(F, c, prev, lt, suppress);
      }
      if ((c._rev ? lt <= 0 : lt >= td) && this.autoRemoveChildren) done.push(c);
    }
    commit(F);
    var self = this;
    done.forEach(function (c) { var j = self._ch.indexOf(c); if (j >= 0) { self._ch.splice(j, 1); c.parent = null; c._detached = true; } });
    fireQueue(F.q);
  };
  GP.pause = function () { this._paused = true; return this; };
  GP.resume = GP.play = function () { this._paused = false; TICK.wake(); return this; };
  GP.paused = function (v) { if (!arguments.length) return this._paused; this._paused = !!v; return this; };
  GP.getChildren = TP.getChildren;

  var TICK = (function () {
    var listeners = [], running = false, last = 0, startT = null, frame = 0, lagT = 500, lagA = 33, fpsMs = 0, nextAt = 0, timeS = 0, deltaMs = 16.67;
    var now = function () { return root.performance && root.performance.now ? root.performance.now() : Date.now(); };
    var raf = function (f) { if (root.requestAnimationFrame) return root.requestAnimationFrame(f); var h = setTimeout(function () { f(now()); }, 16); if (h && h.unref) h.unref(); return h; };
    function tick() {
      var n = now();
      if (startT === null) { startT = n; last = n; }
      var el = n - last;
      if (lagT && el > lagT) { startT += el - lagA; el = lagA; }
      last = n;
      if (fpsMs && n < nextAt) return false;
      nextAt = n + fpsMs;
      deltaMs = el; frame++;
      timeS = (n - startT) / 1000;
      if (GLOBAL && !GLOBAL._paused) { GLOBAL._time = timeS; _ticking++; try { GLOBAL._advance(false); } finally { _ticking--; } }
      listeners.slice().forEach(function (l) { try { l[0](timeS, el, frame); } catch (e) { if (root.console) console.error(e); } if (l[1]) T.remove(l[0]); });
      return true;
    }
    function loop() { if (!running) return; tick(); raf(loop); }
    var T = {
      add: function (fn, once, prio) { var e = [fn, !!once]; if (prio) listeners.unshift(e); else listeners.push(e); T.wake(); return fn; },
      remove: function (fn) { listeners = listeners.filter(function (l) { return l[0] !== fn; }); },
      lagSmoothing: function (t, a) { if (!arguments.length) return [lagT, lagA]; lagT = +t || 0; lagA = a == null ? 33 : +a; },
      fps: function (f) { fpsMs = f ? 1000 / f : 0; },
      tick: function () { tick(); },
      wake: function () { if (running || !(root.requestAnimationFrame || root.__gerakTimer)) return; running = true; raf(loop); },
      sleep: function () { running = false; },
      deltaRatio: function (f) { return deltaMs / (1000 / (f || 60)); },
      get time() { return timeS; },
      get frame() { return frame; },
    };
    return T;
  })();
  GLOBAL = new GlobalTimeline();

  // ======================================================================= distribute (stagger)
  function distribute(v) {
    var cfg = isObj(v) ? v : { each: v }, cache = {};
    var ease = cfg.ease ? parseEase(cfg.ease, null) : null, from = cfg.from == null ? 0 : cfg.from, base = parseFloat(cfg.base) || 0, axis = cfg.axis;
    var unit = isStr(cfg.amount) ? unitOf(cfg.amount) : isStr(cfg.each) ? unitOf(cfg.each) : "";
    var RATIO = { start: 0, center: 0.5, edges: 0.5, end: 1, random: 0 };
    return function (i, target, list) {
      var n = (list || cfg).length || 1, D = cache[n];
      if (!D) {
        var cols;
        if (cfg.grid === "auto") {
          // kolom = jumlah elemen pada baris pertama (top sama dengan elemen pertama)
          var tops = (list || []).map(function (el) { return el && el.getBoundingClientRect ? el.getBoundingClientRect().top : 0; });
          cols = 1; while (cols < tops.length && Math.abs(tops[cols] - tops[0]) < 1) cols++;
        } else if (Array.isArray(cfg.grid)) cols = cfg.grid[1] || n;
        else cols = BIG;
        var rx, ry, ratio = isStr(from) || Array.isArray(from) || (from > 0 && from < 1);
        if (isStr(from)) rx = ry = RATIO[from] != null ? RATIO[from] : 0;
        else if (Array.isArray(from)) { rx = from[0]; ry = from[1]; }
        else rx = ry = from;
        var ox = ratio ? Math.min(cols, n) * rx - 0.5 : (+from || 0) % cols;
        var oy = cols >= BIG ? 0 : ratio ? n * ry / cols - 0.5 : Math.floor((+from || 0) / cols);
        var d = [], max = -Infinity, min = Infinity;
        for (var j = 0; j < n; j++) {
          var x = (j % cols) - ox, y = oy - Math.floor(j / cols);
          var dist = axis === "x" ? Math.abs(x) : axis === "y" ? Math.abs(y) : Math.sqrt(x * x + y * y);
          d.push(dist); if (dist > max) max = dist; if (dist < min) min = dist;
        }
        if (from === "random") shuffle(d);
        var mult = cols > n ? n - 1 : !axis ? Math.max(cols, n / cols) : axis === "y" ? n / cols : cols;
        var amount = cfg.amount != null ? parseFloat(cfg.amount) || 0 : (parseFloat(cfg.each) || 0) * mult;
        D = cache[n] = { d: d, min: min, span: max - min, amount: amount, edges: from === "edges" };
      }
      var nrm = D.span ? (D.d[i] - D.min) / D.span : 0;
      if (D.edges) nrm = 1 - nrm;
      var val = r6(base + (ease ? ease(nrm) : nrm) * D.amount);
      return unit ? val + unit : val;
    };
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ======================================================================= utils
  var curry = function (fn, n) { return function () { var a = Array.prototype.slice.call(arguments); if (a.length >= n) return fn.apply(null, a); return function (v) { return fn.apply(null, a.concat([v])); }; }; };
  function interpolate(s, e, p) {
    if (p === undefined) return function (q) { return interpolate(s, e, q); };
    if (isNum(s) && isNum(e)) return s + (e - s) * p;
    if (Array.isArray(s) && e === undefined) {
      var arr = s, n = arr.length - 1, q = clampN(0, 1, p) * n, i = Math.min(n - 1, Math.floor(q));
      return n < 1 ? arr[0] : interpolate(arr[i], arr[i + 1], q - i);
    }
    if (Array.isArray(s)) return s.map(function (v, i) { return interpolate(v, e[i], p); });
    if (isObj(s)) { var o = {}; for (var k in s) o[k] = interpolate(s[k], e[k], p); return o; }
    if (isStr(s) && isStr(e)) {
      var cs1 = parseColor(s), ce = parseColor(e);
      if (cs1 && ce) return colorStr(mixC(cs1, ce, p));
      var cx = makeComplex(s, e); if (cx) return complexAt(cx, p >= 1 ? 1 : p);
      return p < 1 ? s : e;
    }
    return p < 0.5 ? s : e;
  }
  function snap(cfg, v) {
    if (v === undefined) return function (x) { return snap(cfg, x); };
    if (isNum(cfg)) return cfg ? Math.round(v / cfg) * cfg : v;
    var vals = Array.isArray(cfg) ? cfg : cfg.values, rad = isObj(cfg) && !Array.isArray(cfg) ? cfg.radius : null;
    if (!vals) { var inc = cfg.increment || 1, s = Math.round(v / inc) * inc; return rad == null || Math.abs(s - v) <= rad ? s : v; }
    var best = vals[0], bd = Infinity;
    vals.forEach(function (x) { var d = Math.abs(x - v); if (d < bd) { bd = d; best = x; } });
    return rad == null || bd <= rad ? best : v;
  }
  var utils = {
    clamp: curry(function (a, b, v) { return clampN(a, b, v); }, 3),
    mapRange: curry(function (a, b, c, d, v) { return a === b ? c : c + (v - a) / (b - a) * (d - c); }, 5),
    normalize: curry(function (a, b, v) { return a === b ? 0 : (v - a) / (b - a); }, 3),
    interpolate: interpolate,
    random: function (min, max, snapTo, fn) {
      if (Array.isArray(min)) { var arr = min, f = function () { return arr[Math.floor(rand() * arr.length)]; }; return max === true ? f : f(); }
      if (snapTo === true) { fn = true; snapTo = 0; }
      var g = function () { return randomRange(min, max, snapTo); };
      return fn ? g : g();
    },
    seed: seedRand,
    shuffle: shuffle,
    wrap: function (a, b, v) {
      if (Array.isArray(a)) { var arr = a; var f = function (i) { var n = arr.length; return arr[((i % n) + n) % n]; }; return b === undefined ? f : f(b); }
      var g = function (x) { var r = b - a; return r ? a + ((((x - a) % r) + r) % r) : a; }; return v === undefined ? g : g(v);
    },
    wrapYoyo: function (a, b, v) { var g = function (x) { var r = b - a, r2 = r * 2; if (!r) return a; var m = ((((x - a) % r2) + r2) % r2); return a + (m > r ? r2 - m : m); }; return v === undefined ? g : g(v); },
    snap: snap,
    toArray: toArray,
    selector: function (scope) { var el = toArray(scope)[0]; return function (s) { return el ? Array.prototype.slice.call(el.querySelectorAll(s)) : []; }; },
    distribute: distribute,
    getUnit: function (v) { return unitOf(String(v)); },
    unitize: function (fn, unit) { return function (v) { var u = unit || unitOf(String(v)); return fn(parseFloat(v)) + u; }; },
    pipe: function () { var f = Array.prototype.slice.call(arguments); return function (v) { return f.reduce(function (a, g) { return g(a); }, v); }; },
    splitColor: function (c, hsl) { var r = parseColor(String(c)); if (!r) return null; r = [Math.round(r[0]), Math.round(r[1]), Math.round(r[2])].concat(r[3] !== 1 ? [r[3]] : []); return r; },
  };

  // ======================================================================= API publik
  function tween(kind) {
    return function (targets, a, b, c) {
      var vars, from = null, d;
      if (kind === "fromTo") { from = a; vars = b; if (isNum(a)) { d = a; from = b; vars = Object.assign({}, c); vars.duration = d; } }
      else { vars = a; if (isNum(a)) { d = a; vars = Object.assign({}, b); vars.duration = d; } }
      vars = Object.assign({}, vars || {});
      if (kind === "set") { vars.duration = 0; if (vars.immediateRender == null) vars.immediateRender = true; }
      return new Tween(targets, vars, kind, from, null, null);
    };
  }
  function getProperty(target, prop, unit) {
    var t = toArray(target)[0];
    if (!t) return undefined;
    if (prop === undefined) return function (p, u) { return getProperty(t, p, u); };
    var c = cacheOf(t), v;
    if (c.el) {
      if (prop === "scale") prop = "scaleX";
      if (TF[prop]) { var tf = tfOf(c); v = tf[TF_ALIAS[prop] || prop]; return unit ? v + unit : v; }
      if (prop === "transformOrigin") return cs(t).transformOrigin;
      if (prop === "autoAlpha") prop = "opacity";
      if (prop.indexOf("--") !== 0 && !(prop in t.style) && prop in t) { v = t[prop]; return v; }
      var name = kebab(prop), raw = (c.cv[name] !== undefined && t.style.getPropertyValue(name) === c.rb[name]) ? c.cv[name] : cs(t).getPropertyValue(name);
      if (name.indexOf("--") === 0) raw = String(raw).trim();
      var m = NUM_UNIT.exec(raw);
      if (m) { var n = parseFloat(m[1]); if (unit) { var u = m[2] || "px"; return (u === unit ? n : n * pxPer(t, prop, u) / pxPer(t, prop, unit)) + unit; } return n; }
      return raw;
    }
    v = isFn(t[prop]) ? t[prop]() : t[prop];
    return unit && isNum(v) ? v + unit : v;
  }
  function quickSetter(target, prop, unit) {
    var ts = toArray(target);
    return function (v) {
      var F = new Frame(); F.q = null;
      ts.forEach(function (t) {
        var c = cacheOf(t), o = {}; o[prop] = unit && isNum(v) ? v + unit : v;
        var tw = { vars: {}, _imm: false, _skip: null };
        var trs = c.el && prop !== "attr" ? makeTrack(tw, c, prop, o[prop], undefined, F, "to") : [makeObj(tw, c, prop, v, undefined, F)];
        (trs || []).forEach(function (tr) { F.log = null; tr.w = 1; var val = trackValue(tr, 1, 1, F); if (val !== NONE) { F.set(c, tr.k, val); if (tr.k2) F.set(c, tr.k2, tr.v2); } });
      });
      commit(F);
    };
  }
  function Context(fn, scope) {
    this.data = []; this.scope = scope; this.isReverted = false; this._anims = [];
    if (fn) this.add(fn);
  }
  Context.prototype._add = function (a) { this._anims.push(a); };
  Context.prototype.add = function (name, fn) {
    if (isFn(name)) { fn = name; name = null; }
    var prev = _ctx; _ctx = this; var r;
    try { r = fn && fn.call(this, this); } finally { _ctx = prev; }
    if (name) this[name] = function () { var p2 = _ctx; _ctx = this; try { return fn.apply(this, arguments); } finally { _ctx = p2; } }.bind(this);
    return r;
  };
  Context.prototype.ignore = function (fn) { var prev = _ctx; _ctx = null; try { fn(); } finally { _ctx = prev; } };
  Context.prototype.revert = function () {
    var F = new Frame();
    this._anims.slice().reverse().forEach(function (a) {
      undoLog(a, F);
      if (!a._isTl && a._tracks) a._tracks.forEach(function (tr) { if (tr.permUndo) { F.set(tr.c, tr.k, tr.pu); if (tr.k2) F.set(tr.c, tr.k2, tr.pu2); } });
      a.kill();
    });
    commit(F); this._anims = []; this.isReverted = true; return this;
  };
  Context.prototype.kill = function () { this._anims.forEach(function (a) { a.kill(); }); this._anims = []; return this; };
  Context.prototype.clear = function () { this._anims = []; };

  var Gerak = {
    version: "1.0.0",
    isMotion: true,
    gerak: true, // old marker (v2.3)
    timeline: function (vars) { return new Timeline(Object.assign({}, vars || {})); },
    to: tween("to"), from: tween("from"), fromTo: tween("fromTo"), set: tween("set"),
    delayedCall: function (delay, fn, params, scope) { return new Tween([], { delay: delay, duration: 0, immediateRender: false, onComplete: fn, onCompleteParams: params, callbackScope: scope, onReverseComplete: fn, onReverseCompleteParams: params }, "to"); },
    killTweensOf: function (targets, props) {
      toArray(targets).forEach(function (t) { var s = TWEENS.get(t); if (s) s.forEach(function (tw) { if (!tw._killed) tw.kill(t, props); }); });
    },
    getTweensOf: function (targets, onlyActive) {
      var out = []; toArray(targets).forEach(function (t) { var s = TWEENS.get(t); if (s) s.forEach(function (tw) { if (!tw._killed && out.indexOf(tw) < 0 && (!onlyActive || tw.isActive())) out.push(tw); }); }); return out;
    },
    isTweening: function (targets) { return Gerak.getTweensOf(targets, true).length > 0; },
    getProperty: getProperty,
    quickSetter: quickSetter,
    quickTo: function (target, prop, vars) {
      var tw = null;
      return function (v) { if (tw) tw.kill(); var o = Object.assign({ duration: 0.5, ease: "power3" }, vars || {}); o[prop] = v; tw = Gerak.to(target, o); return tw; };
    },
    parseEase: function (e) { return parseEase(e, e === undefined ? defaultEase() : undefined); },
    registerEase: registerEase,
    registerPlugin: function () { return Gerak; },
    registerEffect: function (cfg) { Gerak.effects[cfg.name] = function (targets, config) { return cfg.effect(toArray(targets), Object.assign({}, cfg.defaults || {}, config || {})); }; if (cfg.extendTimeline) TP[cfg.name] = function (t, c, pos) { this.add(Gerak.effects[cfg.name](t, c), pos); return this; }; },
    effects: {},
    utils: utils,
    spring: pegas,
    inertia: inersia,
    pegas: pegas,     // old names
    inersia: inersia,
    ticker: TICK,
    globalTimeline: GLOBAL,
    config: function (o) { if (o) for (var k in o) CFG[k] = o[k]; return CFG; },
    defaults: function (o) { if (o) for (var k in o) DEFAULTS[k] = o[k]; easeMemo = {}; return DEFAULTS; },
    context: function (fn, scope) { return new Context(fn, scope); },
    matchMedia: function () { var ctx = new Context(); ctx.add = function (q, fn) { if (isFn(q)) fn = q; if (fn && (!isStr(q) || !root.matchMedia || root.matchMedia(q).matches)) Context.prototype.add.call(ctx, fn); return ctx; }; return ctx; },
    exportRoot: function () { var tl = new Timeline({ paused: false }); GLOBAL._ch.slice().forEach(function (c) { if (c !== tl) tl.add(c, c._start); }); return tl; },
    updateRoot: function (t) { GLOBAL.totalTime(t); },
    core: { Tween: Tween, Timeline: Timeline, Animation: Anim, Frame: Frame },
    Tween: Tween, Timeline: Timeline, TimelineLite: Timeline, TimelineMax: Timeline, TweenLite: Tween, TweenMax: Tween,
    _internal: { parseColor: parseColor, tokenize: tokenize, EASES: EASES, cacheOf: cacheOf, seekRoot: seekRoot, forget: function (t) { CACHE.delete(t); } },
  };
  return Gerak;
/*</inti>*/
});
