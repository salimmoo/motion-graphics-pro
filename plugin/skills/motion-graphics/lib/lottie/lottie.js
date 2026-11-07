/**
 * MGP.lottie: Lottie (Bodymovin JSON) player on a 2D canvas, written for the MGP library.
 * Deterministic: draw(t) renders the frame at t seconds from scratch (no state between frames), so any seek order gives
 * the same pixels. Written from the Lottie format description (lottie-docs, CC-BY 4.0); no lottie-web code is used.
 *
 * Load after core (core is optional; the player has a small fallback):
 *   <script src="lib/core/mgp-core.js"></script>
 *   <script src="lib/lottie/lottie.js"></script>
 *
 * api:
 *   MGP.lottie.create(canvasOrEl, opts) -> inst
 *     opts: data (object or JSON string) | url, loop false, speed 1, fit "contain"|"cover"|"fill"|"none",
 *           width/height (logical box, default = animation size), dpr, background (CSS colour or null),
 *           assetsPath (prefix for external images; default = folder of url + asset.u), subframe true
 *           (false = snap to whole frames), from/to (frame range to play, default ip..op)
 *   inst = { name:"lottie", canvas, ctx, W, H, data, fps, ip, op, frames, duration, ready,
 *            draw(t), seek(t), drawFrame(n), frameAt(t), drawTo(ctx, t, box?), timeline(), report(), destroy() }
 *     duration = (to - from) / fps / speed seconds; draw(t) shows frame from + t * fps * speed.
 *     drawFrame(n) shows Lottie frame n exactly (frame-accurate by frame number).
 *     drawTo(ctx, t, {x, y, width, height, fit}) composes the animation into another canvas (box in ctx user units).
 *   MGP.lottie.load(urlOrData) -> Promise<data>
 *   MGP.lottie.renderFrame(ctx, data, frame, {width, height, fit, images}) draws one frame into an existing context
 *   MGP.lottie.analyze(data) -> { features: {name: count}, unsupported: [text], expressions: n, layers: n }
 *   MGP.lottie.FEATURES   supported feature list (see README)
 *
 * Supported: shape layers (group, rect, ellipse, star/polygon, path, fill, stroke with dashes/caps/joins/miter,
 * gradient fill/stroke linear + radial with highlight, trim paths simultaneous/individual, repeater, round corners,
 * merge paths as add), transforms (anchor, position incl. separated x/y, scale, rotation, opacity, skew + axis),
 * keyframes with bezier easing per dimension, hold, spatial bezier for position, auto-orient, parenting, solid, null,
 * image (embedded base64 or external), precomp with time remap and time stretch, masks (add/subtract/intersect,
 * inverted, opacity, expansion and feather approximated), track mattes (alpha/luma, inverted, td/tt and tp),
 * text (font, size, fill, stroke, justification, tracking, line height, caps, box text, glyph shapes when present),
 * in/out points, blend modes. Not supported (listed by report()): expressions, effects, 3D camera, text animators,
 * text on path, pucker/bloat, twist, offset path, zig-zag, merge modes other than add.
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const LT = (MGP.lottie = MGP.lottie || {});
  if (LT.__player) return;
  const RAD = Math.PI / 180, KAPPA = 0.5519150244935105;
  const hasDOM = typeof document !== "undefined";

  /* ---------------- 2D affine matrix [a b c d e f] like canvas ---------------- */
  const I = () => [1, 0, 0, 1, 0, 0];
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const tr = (x, y) => [1, 0, 0, 1, x, y];
  const sc = (x, y) => [x, 0, 0, y, 0, 0];
  const ro = (deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [c, s, -s, c, 0, 0]; };
  const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mscale = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1e-9;
  const isI = (m) => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

  /* ---------------- cubic-bezier easing ---------------- */
  const EASE = new Map();
  function bezEase(x1, y1, x2, y2) {
    const key = x1 + "," + y1 + "," + x2 + "," + y2;
    let fn = EASE.get(key);
    if (fn) return fn;
    if (x1 === y1 && x2 === y2) fn = (u) => u;
    else {
      const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
      const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
      fn = (u) => {
        if (u <= 0) return 0; if (u >= 1) return 1;
        let t = u;
        for (let k = 0; k < 8; k++) { const e = X(t) - u, d = dX(t); if (Math.abs(e) < 1e-7) return Y(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
        let lo = 0, hi = 1; t = u;
        for (let k = 0; k < 40; k++) { const x = X(t); if (Math.abs(x - u) < 1e-7) break; if (x < u) lo = t; else hi = t; t = (lo + hi) / 2; }
        return Y(t);
      };
    }
    EASE.set(key, fn);
    return fn;
  }
  const hv = (h, i, d) => { if (!h) return d; const a = h[i]; if (a == null) return d; return Array.isArray(a) ? a : [a]; };

  /* ---------------- property evaluation ---------------- */
  const isKf = (p) => p && Array.isArray(p.k) && p.k.length > 0 && p.k[0] != null && typeof p.k[0] === "object" && "t" in p.k[0];
  const num = (v, d = 0) => (v == null ? d : Array.isArray(v) ? (v.length ? +v[0] : d) : typeof v === "number" ? v : +v || d);
  function lerpV(a, b, u, ud) {
    if (typeof a === "number") return a + ((typeof b === "number" ? b : num(b, a)) - a) * u;
    if (!Array.isArray(a)) return a;
    if (a.length && typeof a[0] === "object" && a[0] && a[0].v) { // path keyframe value [ {i,o,v,c} ]
      return a.map((pa, k) => lerpPath(pa, (b && b[k]) || pa, u));
    }
    const out = new Array(a.length);
    for (let i = 0; i < a.length; i++) { const uu = ud ? ud[Math.min(i, ud.length - 1)] : u; out[i] = b && b[i] != null ? a[i] + (b[i] - a[i]) * uu : a[i]; }
    return out;
  }
  function lerpPath(a, b, u) {
    const n = a.v.length, L = (A, B) => { const o = new Array(n); for (let i = 0; i < n; i++) { const p = A[i] || [0, 0], q = (B && B[i]) || p; o[i] = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]; } return o; };
    return { c: a.c, v: L(a.v, b.v), i: L(a.i, b.i), o: L(a.o, b.o) };
  }
  function spatialLut(a, s, e) {
    if (a.__lut) return a.__lut;
    const to = a.to, ti = a.ti, N = 64;
    const P1 = [s[0] + to[0], s[1] + to[1]], P2 = [e[0] + ti[0], e[1] + ti[1]];
    const pts = [], len = [0];
    for (let k = 0; k <= N; k++) {
      const t = k / N, mt = 1 - t, A = mt * mt * mt, B = 3 * mt * mt * t, C = 3 * mt * t * t, D = t * t * t;
      const p = []; for (let d = 0; d < s.length; d++) { const p1 = d < 2 ? (d ? P1[1] : P1[0]) : s[d] + (to[d] || 0), p2 = d < 2 ? (d ? P2[1] : P2[0]) : e[d] + (ti[d] || 0); p.push(A * s[d] + B * p1 + C * p2 + D * e[d]); }
      if (k) { const q = pts[k - 1]; len.push(len[k - 1] + Math.hypot(p[0] - q[0], p[1] - q[1])); }
      pts.push(p);
    }
    return (a.__lut = { pts, len, total: len[N] });
  }
  function lutAt(L, u) {
    const want = L.total * u, n = L.len.length;
    if (u <= 0) return L.pts[0].slice(); if (u >= 1) return L.pts[n - 1].slice();
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.len[m] < want) lo = m; else hi = m; }
    const seg = L.len[hi] - L.len[lo], k = seg ? (want - L.len[lo]) / seg : 0;
    return L.pts[lo].map((v, d) => v + (L.pts[hi][d] - v) * k);
  }
  /** value of an animatable property at frame f (comp time). */
  function val(p, f) {
    if (p == null) return undefined;
    if (!isKf(p)) return p.k;
    const K = p.k, n = K.length;
    if (f <= K[0].t || n === 1) return K[0].s != null ? K[0].s : K[0].e;
    let i = n - 1;
    for (let j = 0; j < n - 1; j++) if (f < K[j + 1].t) { i = j; break; }
    const a = K[i];
    if (i === n - 1) return a.s != null ? a.s : K[n - 2] && K[n - 2].e;
    const b = K[i + 1], s = a.s, e = a.e != null ? a.e : b.s != null ? b.s : s;
    if (a.h === 1 || s == null) return s != null ? s : e;
    const span = b.t - a.t, u = span > 0 ? (f - a.t) / span : 1;
    const ox = hv(a.o, "x", [0]), oy = hv(a.o, "y", [0]), ix = hv(a.i, "x", [1]), iy = hv(a.i, "y", [1]);
    const dims = Array.isArray(s) ? s.length : 1;
    const spatial = a.to && a.ti && Array.isArray(s) && typeof s[0] === "number" && (a.to.some((v) => v) || a.ti.some((v) => v));
    if (spatial) {
      const eu = bezEase(ox[0], oy[0], ix[0], iy[0])(u);
      return lutAt(spatialLut(a, s, e), eu);
    }
    if (ox.length > 1 && dims > 1) {
      const ud = []; for (let d = 0; d < dims; d++) { const k = Math.min(d, ox.length - 1); ud.push(bezEase(ox[k], oy[Math.min(d, oy.length - 1)], ix[Math.min(d, ix.length - 1)], iy[Math.min(d, iy.length - 1)])(u)); }
      return lerpV(s, e, ud[0], ud);
    }
    return lerpV(s, e, bezEase(ox[0], oy[0], ix[0], iy[0])(u));
  }
  const nv = (p, f, d = 0) => (p == null ? d : num(val(p, f), d));
  const vv = (p, f, d) => { if (p == null) return d; const v = val(p, f); return Array.isArray(v) ? v : v == null ? d : [v, v]; };

  /* ---------------- transforms ---------------- */
  function position(ks, f) {
    const p = ks.p;
    if (!p) return [0, 0];
    if (p.s && (p.x || p.y)) return [nv(p.x, f), nv(p.y, f)];
    return vv(p, f, [0, 0]);
  }
  /** local matrix + opacity of a transform block (layer ks, group tr). autoOrient: rotate along position path. */
  function xform(ks, f, autoOrient) {
    if (!ks) return { m: I(), o: 1 };
    const a = vv(ks.a, f, [0, 0]), p = position(ks, f), s = vv(ks.s, f, [100, 100]);
    let r = ks.r ? nv(ks.r, f) : ks.rz ? nv(ks.rz, f) : 0;
    if (autoOrient && ks.p && (isKf(ks.p) || (ks.p.s && (isKf(ks.p.x) || isKf(ks.p.y))))) {
      const d = 0.05, A = position(ks, f - d), B = position(ks, f + d);
      if (Math.hypot(B[0] - A[0], B[1] - A[1]) > 1e-6) r += Math.atan2(B[1] - A[1], B[0] - A[0]) / RAD;
    }
    let m = tr(p[0], p[1]);
    if (r) m = mul(m, ro(r));
    const sk = ks.sk ? nv(ks.sk, f) : 0;
    if (sk) { const sa = ks.sa ? nv(ks.sa, f) : 0; m = mul(m, mul(ro(-sa), mul([1, 0, -Math.tan(sk * RAD), 1, 0, 0], ro(sa)))); }
    m = mul(m, sc(s[0] / 100, (s[1] == null ? s[0] : s[1]) / 100));
    if (a[0] || a[1]) m = mul(m, tr(-a[0], -a[1]));
    return { m, o: ks.o ? nv(ks.o, f, 100) / 100 : 1 };
  }

  /* ---------------- paths (absolute tangents) ---------------- */
  // P = { v:[[x,y]], i:[[x,y]] (absolute in-handle), o:[[x,y]] (absolute out-handle), c:bool }
  function absPath(sh) {
    const v = sh.v || [], ii = sh.i || [], oo = sh.o || [], P = { v: [], i: [], o: [], c: !!sh.c };
    for (let k = 0; k < v.length; k++) { const p = v[k], a = ii[k] || [0, 0], b = oo[k] || [0, 0]; P.v.push([p[0], p[1]]); P.i.push([p[0] + a[0], p[1] + a[1]]); P.o.push([p[0] + b[0], p[1] + b[1]]); }
    return P;
  }
  const xfPath = (P, m) => (isI(m) ? P : { c: P.c, v: P.v.map((q) => ap(m, q[0], q[1])), i: P.i.map((q) => ap(m, q[0], q[1])), o: P.o.map((q) => ap(m, q[0], q[1])) });
  const revPath = (P) => { const n = P.v.length, R = { c: P.c, v: [], i: [], o: [] }; if (!n) return R;
    // keep the first vertex first (AE reverses direction, not the starting point)
    for (let k = 0; k < n; k++) { const j = (n - k) % n; R.v.push(P.v[j]); R.i.push(P.o[j]); R.o.push(P.i[j]); } return R; };
  function trace(g, P) {
    const n = P.v.length; if (!n) return;
    g.moveTo(P.v[0][0], P.v[0][1]);
    for (let k = 1; k < n; k++) g.bezierCurveTo(P.o[k - 1][0], P.o[k - 1][1], P.i[k][0], P.i[k][1], P.v[k][0], P.v[k][1]);
    if (P.c && n > 1) { g.bezierCurveTo(P.o[n - 1][0], P.o[n - 1][1], P.i[0][0], P.i[0][1], P.v[0][0], P.v[0][1]); g.closePath(); }
    else if (P.c) g.closePath();
  }
  function segs(P) {
    const n = P.v.length, out = [];
    for (let k = 0; k < n - 1; k++) out.push([P.v[k], P.o[k], P.i[k + 1], P.v[k + 1]]);
    if (P.c && n > 1) out.push([P.v[n - 1], P.o[n - 1], P.i[0], P.v[0]]);
    return out;
  }
  const bpt = (s, t) => { const mt = 1 - t, A = mt * mt * mt, B = 3 * mt * mt * t, C = 3 * mt * t * t, D = t * t * t; return [A * s[0][0] + B * s[1][0] + C * s[2][0] + D * s[3][0], A * s[0][1] + B * s[1][1] + C * s[2][1] + D * s[3][1]]; };
  function segLut(s) {
    const N = 24, len = [0]; let prev = s[0];
    for (let k = 1; k <= N; k++) { const p = bpt(s, k / N); len.push(len[k - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; }
    return len;
  }
  function tAt(lut, l) {
    const N = lut.length - 1, tot = lut[N]; if (l <= 0) return 0; if (l >= tot) return 1;
    let k = 1; while (k < N && lut[k] < l) k++;
    const a = lut[k - 1], b = lut[k]; return (k - 1 + (b > a ? (l - a) / (b - a) : 0)) / N;
  }
  function split(s, t) { // de Casteljau -> [left, right]
    const L = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const a = L(s[0], s[1]), b = L(s[1], s[2]), c = L(s[2], s[3]), d = L(a, b), e = L(b, c), m = L(d, e);
    return [[s[0], a, d, m], [m, e, c, s[3]]];
  }
  function subSeg(s, t0, t1) {
    if (t1 < 1) s = split(s, t1)[0];
    if (t0 > 0) s = split(s, t1 > 0 ? t0 / t1 : 0)[1];
    return s;
  }
  function pathLen(P) { const S = segs(P), luts = S.map(segLut); return { S, luts, lens: luts.map((l) => l[l.length - 1]), total: luts.reduce((a, l) => a + l[l.length - 1], 0) }; }
  /** open sub-path between arc lengths a..b (0 <= a < b <= total) */
  function cutPath(PL, a, b) {
    const out = { v: [], i: [], o: [], c: false };
    let acc = 0;
    for (let k = 0; k < PL.S.length; k++) {
      const L = PL.lens[k], s0 = acc, s1 = acc + L; acc = s1;
      if (s1 < a - 1e-9 || s0 > b + 1e-9 || (L === 0 && out.v.length)) continue;
      const t0 = a > s0 ? tAt(PL.luts[k], a - s0) : 0, t1 = b < s1 ? tAt(PL.luts[k], b - s0) : 1;
      const q = subSeg(PL.S[k], t0, t1);
      if (!out.v.length) { out.v.push(q[0]); out.i.push(q[0]); out.o.push(q[0]); }
      out.o[out.o.length - 1] = q[1];
      out.v.push(q[3]); out.i.push(q[2]); out.o.push(q[3]);
      if (s1 >= b) break;
    }
    return out;
  }
  function joinOpen(A, B) {
    if (!A.v.length) return B; if (!B.v.length) return A;
    const R = { v: A.v.slice(), i: A.i.slice(), o: A.o.slice(), c: false };
    R.o[R.o.length - 1] = B.o[0];
    for (let k = 1; k < B.v.length; k++) { R.v.push(B.v[k]); R.i.push(B.i[k]); R.o.push(B.o[k]); }
    return R;
  }
  /** trim ranges [[a,b]] in 0..1 after offset; returns null for "whole" */
  function trimRanges(s, e, o) {
    s = Math.min(1, Math.max(0, s)); e = Math.min(1, Math.max(0, e));
    if (s > e) { const t = s; s = e; e = t; }
    if (e - s >= 1 - 1e-9) return null;
    if (e - s <= 1e-9) return [];
    s += o; e += o; const k = Math.floor(s); s -= k; e -= k;
    return e > 1 ? [[s, 1], [0, e - 1]] : [[s, e]];
  }
  function trimOne(P, ranges) {
    const PL = pathLen(P), T = PL.total; if (T <= 0) return [];
    if (ranges.length === 2 && P.c) return [joinOpen(cutPath(PL, ranges[0][0] * T, T), cutPath(PL, 0, ranges[1][1] * T))];
    return ranges.map(([a, b]) => cutPath(PL, a * T, b * T)).filter((q) => q.v.length > 1);
  }
  function roundPath(P, r) {
    const n = P.v.length; if (!n || r <= 0) return P;
    const R = { v: [], i: [], o: [], c: P.c };
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    for (let k = 0; k < n; k++) {
      const v = P.v[k];
      if (!same(P.i[k], v) || !same(P.o[k], v) || (!P.c && (k === 0 || k === n - 1))) { R.v.push(v); R.i.push(P.i[k]); R.o.push(P.o[k]); continue; }
      const prev = P.v[(k - 1 + n) % n], next = P.v[(k + 1) % n];
      const dp = Math.hypot(prev[0] - v[0], prev[1] - v[1]), dn = Math.hypot(next[0] - v[0], next[1] - v[1]);
      const kp = dp ? Math.min(dp / 2, r) / dp : 0, kn = dn ? Math.min(dn / 2, r) / dn : 0;
      const a = [v[0] + (prev[0] - v[0]) * kp, v[1] + (prev[1] - v[1]) * kp], b = [v[0] + (next[0] - v[0]) * kn, v[1] + (next[1] - v[1]) * kn];
      R.v.push(a); R.i.push(a); R.o.push([a[0] - (a[0] - v[0]) * KAPPA, a[1] - (a[1] - v[1]) * KAPPA]);
      R.v.push(b); R.i.push([b[0] - (b[0] - v[0]) * KAPPA, b[1] - (b[1] - v[1]) * KAPPA]); R.o.push(b);
    }
    return R;
  }

  /* ---------------- primitive shapes ---------------- */
  function rectPath(it, f) {
    const p = vv(it.p, f, [0, 0]), s = vv(it.s, f, [0, 0]), w = s[0] / 2, h = s[1] / 2;
    const r = Math.min(w, h, nv(it.r, f)), L = p[0] - w, R = p[0] + w, T = p[1] - h, B = p[1] + h;
    let P;
    if (r <= 0) P = absPath({ c: true, v: [[R, T], [R, B], [L, B], [L, T]] });
    else {
      const c = r * (1 - KAPPA);
      P = { c: true, v: [[R, T + r], [R, B - r], [R - r, B], [L + r, B], [L, B - r], [L, T + r], [L + r, T], [R - r, T]],
        i: [[R, T + c], [R, B - r], [R - c, B], [L + r, B], [L, B - c], [L, T + r], [L + c, T], [R - r, T]],
        o: [[R, T + r], [R, B - c], [R - r, B], [L + c, B], [L, B - r], [L, T + c], [L + r, T], [R - c, T]] };
    }
    return it.d === 3 ? revPath(P) : P;
  }
  function ellipsePath(it, f) {
    const p = vv(it.p, f, [0, 0]), s = vv(it.s, f, [0, 0]), x = p[0], y = p[1], rx = s[0] / 2, ry = s[1] / 2, cx = rx * KAPPA, cy = ry * KAPPA;
    const P = { c: true, v: [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]],
      i: [[x - cx, y - ry], [x + rx, y - cy], [x + cx, y + ry], [x - rx, y + cy]],
      o: [[x + cx, y - ry], [x + rx, y + cy], [x - cx, y + ry], [x - rx, y - cy]] };
    return it.d === 3 ? revPath(P) : P;
  }
  function starPath(it, f) {
    const p = vv(it.p, f, [0, 0]), pts = Math.floor(nv(it.pt, f, 5)), rot = nv(it.r, f), star = it.sy !== 2, dir = it.d === 3 ? -1 : 1;
    const or = nv(it.or, f), os = nv(it.os, f) / 100, ir = star ? nv(it.ir, f) : 0, is = star ? nv(it.is, f) / 100 : 0;
    const n = star ? pts * 2 : pts, step = (Math.PI * 2) / n;
    const P = { c: true, v: [], i: [], o: [] };
    let ang = -Math.PI / 2 + rot * RAD;
    for (let k = 0; k < n; k++) {
      const outer = !star || k % 2 === 0, rad = outer ? or : ir, round = outer ? os : is;
      const seg = star ? (2 * Math.PI * rad) / (pts * 2) : (2 * Math.PI * rad) / (pts * 4);
      const x = rad * Math.cos(ang), y = rad * Math.sin(ang), d = Math.hypot(x, y) || 1, tx = x === 0 ? 0 : y / d, ty = y === 0 ? 0 : -x / d;
      const X = x + p[0], Y = y + p[1], k2 = seg * round * dir;
      P.v.push([X, Y]); P.o.push([X - tx * k2, Y - ty * k2]); P.i.push([X + tx * k2, Y + ty * k2]);
      ang += step * dir;
    }
    return P;
  }
  function shapePaths(it, f) {
    if (it.ty === "sh") { const v = val(it.ks, f), sh = Array.isArray(v) ? v[0] : v; return sh && sh.v ? [absPath(sh)] : []; }
    if (it.ty === "rc") return [rectPath(it, f)];
    if (it.ty === "el") return [ellipsePath(it, f)];
    if (it.ty === "sr") return [starPath(it, f)];
    return [];
  }

  /* ---------------- shape list evaluation ---------------- */
  // node = { paths: [P] } (node-local space); ref = { node, m } (node -> current group); op = { it, refs, m, a }
  const STYLE = { fl: 1, st: 1, gf: 1, gs: 1 };
  function procList(items, f, R) {
    let ops = [], refs = [];
    for (let k = 0; k < items.length; k++) {
      const it = items[k]; if (!it || it.hd) continue;
      const ty = it.ty;
      if (ty === "sh" || ty === "rc" || ty === "el" || ty === "sr") refs.push({ node: { paths: shapePaths(it, f) }, m: I() });
      else if (ty === "gr") {
        const sub = procList(it.it || [], f, R), t = xform((it.it || []).find((x) => x && x.ty === "tr"), f);
        for (const op of sub.ops) ops.push({ it: op.it, refs: op.refs, m: mul(t.m, op.m), a: op.a * t.o });
        for (const r of sub.refs) refs.push({ node: r.node, m: mul(t.m, r.m) });
      } else if (STYLE[ty]) ops.push({ it, refs: refs.map((r) => ({ node: r.node, m: r.m })), m: I(), a: 1 });
      else if (ty === "tm") {
        const ranges = trimRanges(nv(it.s, f) / 100, nv(it.e, f, 100) / 100, (((nv(it.o, f) / 360) % 1) + 1) % 1);
        if (!ranges) continue;
        const nodes = [...new Set(refs.map((r) => r.node))];
        if (it.m === 2) { // individually: one length across all paths in order
          const all = []; nodes.forEach((nd) => nd.paths.forEach((P, j) => all.push({ nd, j, L: pathLen(P).total })));
          const T = all.reduce((a, x) => a + x.L, 0); let acc = 0; const keep = new Map(nodes.map((nd) => [nd, []]));
          for (const x of all) {
            const a0 = acc, a1 = acc + x.L; acc = a1; if (x.L <= 0) continue;
            const loc = [];
            for (const [ra, rb] of ranges) { const lo = Math.max(ra * T, a0), hi = Math.min(rb * T, a1); if (hi > lo) loc.push([(lo - a0) / x.L, (hi - a0) / x.L]); }
            const P = x.nd.paths[x.j];
            if (loc.length === 2 && P.c && loc[0][1] >= 1 - 1e-9 && loc[1][0] <= 1e-9) keep.get(x.nd).push(...trimOne(P, [[loc[0][0], 1], [0, loc[1][1]]]));
            else keep.get(x.nd).push(...trimOne(P, loc.length ? loc : []));
          }
          nodes.forEach((nd) => (nd.paths = keep.get(nd)));
        } else nodes.forEach((nd) => (nd.paths = nd.paths.flatMap((P) => trimOne(P, ranges))));
      } else if (ty === "rd") {
        const r = nv(it.r, f); if (r > 0) new Set(refs.map((x) => x.node)).forEach((nd) => (nd.paths = nd.paths.map((P) => roundPath(P, r))));
      } else if (ty === "rp") {
        const above = items.slice(0, k), copies = Math.max(0, Math.round(nv(it.c, f, 1))), off = nv(it.o, f), T = it.tr || {};
        const a = vv(T.a, f, [0, 0]), p = vv(T.p, f, [0, 0]), s = vv(T.s, f, [100, 100]), r = nv(T.r, f), so = nv(T.so, f, 100) / 100, eo = nv(T.eo, f, 100) / 100;
        const copiesOut = [];
        for (let c = 0; c < copies; c++) {
          const n = c + off, sub = procList(above, f, R);
          const m = mul(tr(a[0] + p[0] * n, a[1] + p[1] * n), mul(ro(r * n), mul(sc(Math.pow(s[0] / 100, n), Math.pow((s[1] == null ? s[0] : s[1]) / 100, n)), tr(-a[0], -a[1]))));
          const al = copies > 1 ? so + (eo - so) * (c / (copies - 1)) : so;
          copiesOut.push({ ops: sub.ops.map((op) => ({ it: op.it, refs: op.refs, m: mul(m, op.m), a: op.a * al })), refs: sub.refs.map((x) => ({ node: x.node, m: mul(m, x.m) })) });
        }
        const order = it.m === 2 ? copiesOut : copiesOut.slice().reverse(); // ops are top-first; composite "above" puts later copies on top
        ops = [].concat(...order.map((x) => x.ops)); refs = [].concat(...copiesOut.map((x) => x.refs));
      } else if (ty === "mm") { if (it.mm > 2) R.note("merge paths mode " + it.mm + " drawn as add"); }
      else if (ty === "tr") { /* handled by parent */ }
      else if (ty === "pb" || ty === "tw" || ty === "op" || ty === "zz") R.note("shape modifier " + ty + " ignored");
    }
    return { ops, refs };
  }

  /* ---------------- colour & gradients ---------------- */
  const c255 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  function colArr(c) { if (!c) return [0, 0, 0, 1]; const big = c[0] > 1 || c[1] > 1 || c[2] > 1; return big ? [c[0] / 255, c[1] / 255, c[2] / 255, c[3] == null ? 1 : c[3] > 1 ? c[3] / 255 : c[3]] : [c[0], c[1], c[2], c[3] == null ? 1 : c[3]]; }
  const css = (c, a = 1) => { const q = colArr(c); return `rgba(${c255(q[0])},${c255(q[1])},${c255(q[2])},${Math.max(0, Math.min(1, a))})`; };
  function gradStops(g, f) {
    const n = g.p || 0, v = val(g.k, f) || [], cs = [], as = [];
    for (let j = 0; j < n; j++) cs.push([v[j * 4], v[j * 4 + 1], v[j * 4 + 2], v[j * 4 + 3]]);
    for (let j = n * 4; j + 1 < v.length; j += 2) as.push([v[j], v[j + 1]]);
    const at = (arr, x, w) => { if (!arr.length) return null; if (x <= arr[0][0]) return arr[0].slice(1, 1 + w); const L = arr[arr.length - 1]; if (x >= L[0]) return L.slice(1, 1 + w);
      for (let k = 1; k < arr.length; k++) if (x <= arr[k][0]) { const a = arr[k - 1], b = arr[k], u = b[0] > a[0] ? (x - a[0]) / (b[0] - a[0]) : 0; return a.slice(1, 1 + w).map((q, d) => q + (b[1 + d] - q) * u); } return L.slice(1, 1 + w); };
    const pos = [...new Set(cs.map((x) => x[0]).concat(as.map((x) => x[0])))].sort((a, b) => a - b);
    return pos.map((x) => { const c = at(cs, x, 3) || [0, 0, 0], a = as.length ? at(as, x, 1)[0] : 1; return [Math.max(0, Math.min(1, x)), c, a]; });
  }
  function gradient(g, it, f, alpha) {
    const s = vv(it.s, f, [0, 0]), e = vv(it.e, f, [0, 0]);
    let G;
    if (it.t === 2) {
      const r = Math.hypot(e[0] - s[0], e[1] - s[1]); let h = nv(it.h, f) / 100; h = Math.max(-0.99, Math.min(0.99, h));
      const ang = Math.atan2(e[1] - s[1], e[0] - s[0]) + nv(it.a, f) * RAD, d = r * h;
      G = g.createRadialGradient(s[0] + Math.cos(ang) * d, s[1] + Math.sin(ang) * d, 0, s[0], s[1], Math.max(r, 1e-6));
    } else G = g.createLinearGradient(s[0], s[1], e[0], e[1]);
    for (const [x, c, a] of gradStops(it.g || {}, f)) G.addColorStop(x, css(c, a * alpha));
    return G;
  }
  const CAP = ["butt", "butt", "round", "square"], JOIN = ["miter", "miter", "round", "bevel"];
  function drawOps(g, ops, base, alpha, f, R, fillOverride) {
    for (let k = ops.length - 1; k >= 0; k--) {
      const op = ops[k], it = op.it, a = alpha * op.a * nv(it.o, f, 100) / 100;
      if (a <= 0 || !op.refs.length) continue;
      g.setTransform(...mul(base, op.m));
      g.beginPath();
      let any = false;
      for (const r of op.refs) for (const P of r.node.paths) { if (P.v.length) { trace(g, xfPath(P, r.m)); any = true; } }
      if (!any) continue;
      const stroke = it.ty === "st" || it.ty === "gs";
      if (stroke) {
        const w = nv(it.w, f, 1); if (w <= 0) continue;
        g.lineWidth = w; g.lineCap = CAP[it.lc || 2] || "round"; g.lineJoin = JOIN[it.lj || 2] || "round"; g.miterLimit = it.ml || (it.ml2 ? nv(it.ml2, f, 4) : 4);
        const dash = [], dashOff = [0];
        if (it.d && it.d.length) for (const d of it.d) { const x = nv(d.v, f); if (d.n === "o") dashOff[0] = x; else dash.push(x); }
        if (dash.length && dash.some((x) => x > 0)) { g.setLineDash(dash.length % 2 ? dash.concat(dash) : dash); g.lineDashOffset = -dashOff[0]; } else g.setLineDash([]);
        g.strokeStyle = it.ty === "gs" ? gradient(g, it, f, a) : css(val(it.c, f) || [0, 0, 0], a);
        g.globalAlpha = 1; g.stroke();
        g.setLineDash([]);
      } else {
        g.fillStyle = fillOverride || (it.ty === "gf" ? gradient(g, it, f, a) : css(val(it.c, f), a));
        g.globalAlpha = 1; g.fill(it.r === 2 ? "evenodd" : "nonzero");
      }
    }
  }

  /* ---------------- report collector ---------------- */
  function Reporter() { const seen = new Map(); return { seen, note(s) { seen.set(s, (seen.get(s) || 0) + 1); }, list() { return [...seen.keys()]; } }; }

  /* ---------------- buffers ---------------- */
  function Pool(W, H) {
    const free = [];
    return {
      get() { let c = free.pop(); if (!c) { c = mk(W, H); } const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.clearRect(0, 0, W, H); return c; },
      put(c) { free.push(c); },
      W, H,
    };
  }
  function mk(w, h) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    if (hasDOM) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    throw new Error("MGP.lottie: no canvas available");
  }
  const BLEND = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity", "lighter"];

  /* ---------------- layers ---------------- */
  function Renderer(data, images, R) {
    const assets = {}; (data.assets || []).forEach((a) => (assets[a.id] = a));
    const fonts = {}; ((data.fonts && data.fonts.list) || []).forEach((x) => (fonts[x.fName] = x));
    const chars = data.chars || [];
    const glyph = (ch, fam, style) => chars.find((c) => c.ch === ch && c.fFamily === fam && (!style || !c.style || c.style === style));
    const fr = data.fr || 30;
    let pool = null, measure = null;

    function worldOf(L, f, byInd, cache) {
      if (cache.has(L)) return cache.get(L);
      cache.set(L, I()); // guard against cycles
      let m = xform(L.ks, f, L.ao === 1).m;
      if (L.parent != null && byInd[L.parent] && byInd[L.parent] !== L) m = mul(worldOf(byInd[L.parent], f, byInd, cache), m);
      cache.set(L, m);
      return m;
    }
    function comp(g, layers, f, base, alpha, depth) {
      if (depth > 24) return;
      const byInd = {}; layers.forEach((L) => { if (L.ind != null) byInd[L.ind] = L; });
      const cache = new Map();
      for (let k = layers.length - 1; k >= 0; k--) {
        const L = layers[k];
        if (L.td || L.hd || !(f >= (L.ip || 0) && f < (L.op == null ? Infinity : L.op))) continue;
        if (L.ty === 3 || L.ty === 6 || L.ty === 13 || L.ty > 5) continue;
        let matte = null;
        if (L.tt) matte = L.tp != null ? byInd[L.tp] : layers[k - 1];
        layer(g, L, f, base, alpha, depth, byInd, cache, matte && L.tt ? { L: matte, mode: L.tt } : null);
      }
    }
    function layer(g, L, f, base, alpha, depth, byInd, cache, matte) {
      const t = xform(L.ks, f, L.ao === 1), op = t.o * alpha;
      if (op <= 0) return;
      const M = mul(base, worldOf(L, f, byInd, cache));
      const masks = (L.masksProperties || []).filter((m) => m.mode !== "n");
      const bm = L.bm || 0, needBuf = masks.length || matte || bm;
      let dst = g, buf = null;
      if (needBuf) { buf = pool.get(); dst = buf.getContext("2d"); }
      dst.save();
      content(dst, L, f, M, op, depth);
      dst.restore();
      if (!needBuf) return;
      if (masks.length) applyMasks(dst, masks, f, M);
      if (matte) applyMatte(dst, matte, f, base, alpha, depth, byInd, cache);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = BLEND[bm] || "source-over";
      g.drawImage(buf, 0, 0); g.restore();
      pool.put(buf);
    }
    function content(g, L, f, M, op, depth) {
      if (L.ty === 4) { const r = procList(L.shapes || [], f, R); drawOps(g, r.ops, M, op, f, R); }
      else if (L.ty === 1) { g.setTransform(...M); g.globalAlpha = 1; g.fillStyle = hexA(L.sc || "#000", op); g.fillRect(0, 0, L.sw || 0, L.sh || 0); }
      else if (L.ty === 2) {
        const A = assets[L.refId], img = images[L.refId];
        if (A && img) { g.setTransform(...M); g.globalAlpha = op; g.drawImage(img, 0, 0, A.w || img.width, A.h || img.height); g.globalAlpha = 1; }
      } else if (L.ty === 0) {
        const A = assets[L.refId]; if (!A || !A.layers) return;
        let inner = L.tm ? nv(L.tm, f) * fr : (f - (L.st || 0)) / (L.sr || 1);
        if (L.tm && L.op != null) { /* keep last frame inside range */ }
        g.setTransform(...M); g.beginPath(); g.rect(0, 0, L.w || A.w || data.w, L.h || A.h || data.h); g.clip();
        comp(g, A.layers, inner, M, op, depth + 1);
      } else if (L.ty === 5) text(g, L, f, M, op);
    }
    function hexA(h, a) { const s = String(h).replace("#", ""), n = parseInt(s.length === 3 ? s.split("").map((x) => x + x).join("") : s.slice(0, 6), 16) || 0; return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
    function maskPath(g, m, f) { const v = val(m.pt, f), sh = Array.isArray(v) ? v[0] : v; if (sh && sh.v) trace(g, absPath(sh)); }
    function applyMasks(dst, masks, f, M) {
      const mb = pool.get(), mg = mb.getContext("2d"), W = pool.W, H = pool.H;
      const first = masks[0].mode;
      if (first === "s" || first === "i") { mg.fillStyle = "#fff"; mg.fillRect(0, 0, W, H); }
      for (const m of masks) {
        const a = nv(m.o, f, 100) / 100, x = nv(m.x, f), fe = vv(m.f, f, [0, 0]), feather = Math.max(fe[0] || 0, fe[1] || 0) * mscale(M);
        const tmp = pool.get(), tg = tmp.getContext("2d");
        tg.setTransform(...M); tg.beginPath();
        if (m.inv) { tg.save(); tg.setTransform(1, 0, 0, 1, 0, 0); tg.rect(-1, -1, W + 2, H + 2); tg.restore(); }
        maskPath(tg, m, f);
        tg.fillStyle = "#fff"; tg.fill(m.inv ? "evenodd" : "nonzero");
        if (x) { tg.lineWidth = Math.abs(x) * 2; tg.lineJoin = "round"; tg.strokeStyle = "#fff"; tg.globalCompositeOperation = x > 0 ? "source-over" : "destination-out"; if (m.inv) tg.globalCompositeOperation = x > 0 ? "destination-out" : "source-over"; tg.stroke(); tg.globalCompositeOperation = "source-over"; }
        mg.save(); mg.globalAlpha = a; if (feather > 0.5) mg.filter = `blur(${(feather / 2).toFixed(2)}px)`;
        mg.globalCompositeOperation = m.mode === "s" ? "destination-out" : m.mode === "i" || m.mode === "d" ? "destination-in" : m.mode === "f" ? "xor" : m.mode === "l" ? "lighten" : "source-over";
        mg.drawImage(tmp, 0, 0); mg.restore();
        pool.put(tmp);
      }
      dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalAlpha = 1; dst.globalCompositeOperation = "destination-in"; dst.drawImage(mb, 0, 0); dst.restore();
      pool.put(mb);
    }
    function applyMatte(dst, mt, f, base, alpha, depth, byInd, cache) {
      const L = mt.L; if (!L) return;
      const mb = pool.get(), mg = mb.getContext("2d");
      if (f >= (L.ip || 0) && f < (L.op == null ? Infinity : L.op) && !L.hd) {
        const nested = L.tt ? { L: L.tp != null ? byInd[L.tp] : null, mode: L.tt } : null;
        layer(mg, L, f, base, 1, depth, byInd, cache, nested && nested.L ? nested : null);
      }
      const mode = mt.mode;
      if (mode === 3 || mode === 4) {
        const W = pool.W, H = pool.H, img = mg.getImageData(0, 0, W, H), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3] / 255, l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 * a; // canvas data is un-premultiplied
          const v = mode === 3 ? l : 1 - l; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(v * 255);
        }
        mg.putImageData(img, 0, 0);
      }
      dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalAlpha = 1;
      dst.globalCompositeOperation = mode === 2 ? "destination-out" : "destination-in";
      dst.drawImage(mb, 0, 0); dst.restore();
      pool.put(mb);
    }

    /* ---- text ---- */
    function textDoc(L, f) {
      const d = L.t && L.t.d; if (!d) return null;
      const K = d.k; if (!Array.isArray(K)) return K && K.s ? K.s : K;
      let s = K[0] && K[0].s; for (const k of K) if (k.t <= f) s = k.s; return s;
    }
    function cssFont(F, size) {
      const st = (F && F.fStyle) || "", fam = (F && F.fFamily) || "sans-serif";
      const w = (F && F.fWeight) || (/black|heavy/i.test(st) ? 900 : /extra\s*bold|ultra\s*bold/i.test(st) ? 800 : /semi\s*bold|demi/i.test(st) ? 600 : /bold/i.test(st) ? 700 : /medium/i.test(st) ? 500 : /extra\s*light|ultra\s*light/i.test(st) ? 200 : /light/i.test(st) ? 300 : /thin|hairline/i.test(st) ? 100 : 400);
      const it = /italic|oblique/i.test(st) ? "italic " : "";
      const q = /,/.test(fam) || /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(fam) ? fam : `"${fam}", sans-serif`; // a CSS family list is used as is
      return `${it}${w} ${size}px ${q}`;
    }
    function text(g, L, f, M, op) {
      const doc = textDoc(L, f); if (!doc) return;
      if (L.t.a && L.t.a.length) R.note("text animators ignored");
      if (L.t.p && L.t.p.m != null) R.note("text on path ignored");
      const F = fonts[doc.f], size = doc.s || 12, track = (doc.tr || 0) / 1000 * size, lh = doc.lh || size * 1.2;
      let str = String(doc.t == null ? "" : doc.t);
      if (doc.ca === 1 || doc.ca === 2) str = str.toUpperCase();
      const fill = doc.fc && colArr(doc.fc)[3] > 0 ? css(doc.fc, op * colArr(doc.fc)[3]) : null, stroke = doc.sc && doc.sw ? css(doc.sc, op) : null;
      if (!measure) measure = mk(8, 8).getContext("2d");
      measure.font = cssFont(F, size);
      const useGlyph = chars.length && F && [...str.replace(/[\r\n\u0003]/g, "")].every((ch) => ch === " " || glyph(ch, F.fFamily, F.fStyle));
      const adv = (ch) => { if (useGlyph) { const G = glyph(ch, F.fFamily, F.fStyle); return G ? (G.w || 0) * size / 100 : measure.measureText(ch).width; } return measure.measureText(ch).width; };
      const lineW = (s) => { let w = 0; for (const ch of s) w += adv(ch) + track; return w - (s.length ? track : 0); };
      let lines = str.split(/\r\n|\r|\n|\u0003/);
      const box = doc.sz && doc.ps;
      if (box) { // wrap words into the box
        const out = []; for (const ln of lines) { let cur = ""; for (const w of ln.split(" ")) { const tryS = cur ? cur + " " + w : w; if (cur && lineW(tryS) > doc.sz[0]) { out.push(cur); cur = w; } else cur = tryS; } out.push(cur); } lines = out;
      }
      const j = doc.j || 0;
      let y = box ? doc.ps[1] + size * 0.8 : 0;
      const ls = doc.ls || 0;
      for (const ln of lines) {
        const w = lineW(ln);
        let x = box ? doc.ps[0] : 0;
        if (j === 1) x += box ? doc.sz[0] - w : -w; else if (j === 2) x += box ? (doc.sz[0] - w) / 2 : -w / 2;
        for (const ch of ln) {
          const a = adv(ch);
          if (useGlyph) {
            const G = glyph(ch, F.fFamily, F.fStyle);
            if (G && G.data && G.data.shapes) {
              const r = procList(G.data.shapes, f, R), mm = mul(M, mul(tr(x, y - ls), sc(size / 100, size / 100)));
              g.setTransform(...mm); g.beginPath();
              for (const rf of r.refs) for (const P of rf.node.paths) trace(g, xfPath(P, rf.m));
              g.globalAlpha = 1;
              const doFill = () => { if (fill) { g.fillStyle = fill; g.fill(); } }, doStroke = () => { if (stroke) { g.strokeStyle = stroke; g.lineWidth = doc.sw * 100 / size; g.stroke(); } };
              if (doc.of) { doFill(); doStroke(); } else { doStroke(); doFill(); }
            }
          } else {
            g.setTransform(...M); g.font = cssFont(F, size); g.textBaseline = "alphabetic"; g.textAlign = "left"; g.globalAlpha = 1;
            const doFill = () => { if (fill) { g.fillStyle = fill; g.fillText(ch, x, y - ls); } }, doStroke = () => { if (stroke) { g.strokeStyle = stroke; g.lineWidth = doc.sw; g.lineJoin = "round"; g.strokeText(ch, x, y - ls); } };
            if (doc.of) { doFill(); doStroke(); } else { doStroke(); doFill(); }
          }
          x += a + track;
        }
        y += lh;
      }
    }

    return {
      /** draw frame f into g; base = matrix from animation space to g's device pixels */
      frame(g, f, base, W, H) {
        if (!pool || pool.W !== W || pool.H !== H) pool = Pool(W, H);
        g.save(); comp(g, data.layers || [], f, base, 1, 0); g.restore();
      },
    };
  }

  /* ---------------- analysis ---------------- */
  const LAYER_NAMES = { 0: "precomp", 1: "solid", 2: "image", 3: "null", 4: "shape", 5: "text", 6: "audio", 7: "video placeholder", 8: "image sequence", 9: "video", 10: "image placeholder", 11: "guide", 12: "adjustment", 13: "camera", 14: "light", 15: "data" };
  const SHAPE_NAMES = { gr: "group", rc: "rectangle", el: "ellipse", sr: "star/polygon", sh: "path", fl: "fill", st: "stroke", gf: "gradient fill", gs: "gradient stroke", tm: "trim paths", rp: "repeater", rd: "round corners", mm: "merge paths", tr: "transform", pb: "pucker/bloat", tw: "twist", op: "offset path", zz: "zig-zag", no: "no style" };
  const UNSUP_SHAPE = { pb: 1, tw: 1, op: 1, zz: 1 };
  const BM_NAMES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity", "add", "hard-mix"];
  function analyze(data) {
    const F = {}, U = new Set(); let expr = 0, layers = 0;
    const add = (k) => (F[k] = (F[k] || 0) + 1);
    const walkProps = (o, depth = 0) => {
      if (!o || typeof o !== "object" || depth > 60) return;
      if (Array.isArray(o)) { o.forEach((x) => walkProps(x, depth + 1)); return; }
      if (typeof o.x === "string" && ("k" in o || "a" in o)) expr++;
      if (isKf(o)) { add("keyframes"); if (o.k.some((k) => k.h === 1)) add("hold keyframes"); if (o.k.some((k) => k.to && k.to.some && k.to.some((v) => v))) add("spatial bezier"); }
      for (const k in o) if (k !== "k" || typeof o.k === "object") walkProps(o[k], depth + 1);
    };
    const walkShapes = (items) => (items || []).forEach((it) => {
      if (!it) return; add("shape:" + (SHAPE_NAMES[it.ty] || it.ty));
      if (UNSUP_SHAPE[it.ty]) U.add("shape modifier " + SHAPE_NAMES[it.ty]);
      if (it.ty === "mm" && it.mm > 2) U.add("merge paths mode " + it.mm + " (drawn as add)");
      if ((it.ty === "st" || it.ty === "gs") && it.d && it.d.length) add("dashes");
      if (it.ty === "gr") walkShapes(it.it);
    });
    const walkLayers = (Ls) => (Ls || []).forEach((L) => {
      layers++; add("layer:" + (LAYER_NAMES[L.ty] || L.ty));
      if ([6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(L.ty)) U.add("layer type " + (LAYER_NAMES[L.ty] || L.ty) + (L.ty === 6 ? " (no sound)" : ""));
      if (L.ddd) U.add("3D layers (drawn flat)");
      if (L.parent != null) add("parenting");
      if (L.ao) add("auto-orient");
      if (L.tm) add("time remap"); if (L.sr && L.sr !== 1) add("time stretch");
      if (L.ks && L.ks.p && L.ks.p.s) add("separated position");
      if (L.ks && (L.ks.sk && (isKf(L.ks.sk) || num(L.ks.sk.k)))) add("skew");
      if (L.masksProperties && L.masksProperties.length) { add("masks"); L.masksProperties.forEach((m) => { add("mask:" + m.mode); if (m.inv) add("mask inverted"); if (m.f && num(m.f.k)) add("mask feather (approx.)"); if (m.x && num(m.x.k)) add("mask expansion (approx.)"); if ("ldf".includes(m.mode)) U.add("mask mode " + m.mode + " (approximated)"); }); }
      if (L.tt) add("track matte:" + ["", "alpha", "alpha inverted", "luma", "luma inverted"][L.tt]);
      if (L.bm) { add("blend:" + (BM_NAMES[L.bm] || L.bm)); if (L.bm === 17) U.add("blend mode hard-mix"); }
      if (L.ef && L.ef.length) U.add("effects (" + L.ef.map((e) => e.nm || e.ty).slice(0, 4).join(", ") + (L.ef.length > 4 ? ", ..." : "") + ")");
      if (L.sy && L.sy.length) U.add("layer styles");
      if (L.ty === 4) walkShapes(L.shapes);
      if (L.ty === 5 && L.t) { if (L.t.a && L.t.a.length) U.add("text animators"); if (L.t.p && L.t.p.m != null) U.add("text on path"); if (data.chars && data.chars.length) add("text glyph shapes"); }
    });
    walkLayers(data.layers);
    (data.assets || []).forEach((a) => { if (a.layers) { add("precomp asset"); walkLayers(a.layers); } else if (a.p) add(a.e === 1 || /^data:/.test(a.p) ? "image embedded" : "image external"); });
    walkProps(data.layers); (data.assets || []).forEach((a) => a.layers && walkProps(a.layers));
    if (expr) U.add("expressions (" + expr + " properties; static/keyframed value used)");
    if (data.chars && data.chars.length) (data.chars || []).forEach((c) => c.data && c.data.shapes && walkShapes(c.data.shapes));
    return { features: F, unsupported: [...U], expressions: expr, layers };
  }

  /* ---------------- loading ---------------- */
  function load(src) {
    if (src && typeof src === "object") return Promise.resolve(src);
    if (typeof src === "string" && /^\s*[{[]/.test(src)) return Promise.resolve(JSON.parse(src));
    return fetch(src).then((r) => { if (!r.ok) throw new Error("MGP.lottie: " + r.status + " " + src); return r.json(); });
  }
  function loadImages(data, base) {
    const out = {}, jobs = [];
    if (!hasDOM || typeof Image === "undefined") return Promise.resolve(out);
    for (const a of data.assets || []) {
      if (a.layers || !a.p) continue;
      let src = a.p;
      if (!(a.e === 1 || /^data:/.test(src))) src = (base != null ? base : "") + (a.u || "") + a.p;
      jobs.push(new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { out[a.id] = im; res(); }; im.onerror = () => res(); im.src = src; }));
    }
    return Promise.all(jobs).then(() => out);
  }
  function loadFonts(data) {
    if (!hasDOM || !data.fonts || !data.fonts.list) return Promise.resolve();
    const jobs = [];
    for (const F of data.fonts.list) {
      const fam = /,/.test(F.fFamily) ? F.fFamily : `"${F.fFamily}"`, style = /italic/i.test(F.fStyle || "") ? "italic " : "";
      const face = () => (document.fonts && document.fonts.load ? document.fonts.load(`${style}${F.fWeight || 400} 20px ${fam}`).catch(() => {}) : null);
      if (F.fPath && (F.origin === 1 || /\.css|fonts\.googleapis|__fonts\/g\//.test(F.fPath))) {
        // wait for the stylesheet first: fonts.load() before its @font-face rules exist resolves at once with nothing
        let l = document.querySelector(`link[href="${F.fPath}"]`);
        if (!l) { l = document.createElement("link"); l.rel = "stylesheet"; l.href = F.fPath; document.head.appendChild(l); }
        jobs.push(new Promise((res) => { if (l.sheet) return res(); l.addEventListener("load", res); l.addEventListener("error", res); }).then(face));
      } else if (F.fPath && (F.origin === 3 || /\.(woff2?|ttf|otf)(\?|$)/.test(F.fPath)) && typeof FontFace !== "undefined") { const ff = new FontFace(F.fFamily, `url(${F.fPath})`); jobs.push(ff.load().then((x) => document.fonts.add(x), () => {})); }
      else jobs.push(face());
    }
    return Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 3000))]);
  }

  /* ---------------- fit ---------------- */
  function fitMatrix(fit, aw, ah, bw, bh) {
    if (fit === "fill") return [bw / aw, 0, 0, bh / ah, 0, 0];
    if (fit === "none") return [1, 0, 0, 1, (bw - aw) / 2, (bh - ah) / 2];
    const s = fit === "cover" ? Math.max(bw / aw, bh / ah) : Math.min(bw / aw, bh / ah);
    return [s, 0, 0, s, (bw - aw * s) / 2, (bh - ah * s) / 2];
  }

  /** draw Lottie frame `frame` into ctx (current transform kept), inside box {x,y,width,height,fit} in user units */
  function renderFrame(ctx, data, frame, o = {}) {
    const st = (data.__mgp = data.__mgp || { R: Reporter(), images: o.images || {} });
    if (o.images) st.images = o.images;
    if (!st.rend) st.rend = Renderer(data, st.images, st.R);
    const T = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const box = fitMatrix(o.fit || "contain", data.w, data.h, o.width || data.w, o.height || data.h);
    const base = mul([T.a, T.b, T.c, T.d, T.e, T.f], mul(tr(o.x || 0, o.y || 0), box));
    st.rend.frame(ctx, frame, base, ctx.canvas.width, ctx.canvas.height);
  }

  /* ---------------- player instance ---------------- */
  function setupCanvas(target, W, H, o) {
    if (MGP.core && MGP.core.setup) return MGP.core.setup(target, { width: W, height: H, dpr: o.dpr, fit: o.fitCss });
    if (typeof target === "string") target = document.querySelector(target);
    let canvas = target; if (!canvas || !canvas.getContext) { canvas = document.createElement("canvas"); if (target) target.appendChild(canvas); }
    const dpr = o.dpr || Math.min(2, root.devicePixelRatio || 1), S = { canvas, ctx: canvas.getContext("2d"), W, H, dpr };
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + "px"; canvas.style.height = H + "px"; canvas.style.display = "block";
    S.begin = () => { const g = S.ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, W, H); return g; };
    return S;
  }
  function create(target, o = {}) {
    const inst = { name: "lottie", opts: o, data: null, duration: o.duration || 1, fps: 30, ip: 0, op: 30, frames: 30, t: 0, loop: !!o.loop, speed: o.speed || 1 };
    let C = null, R = Reporter(), rend = null, images = {};
    const base0 = o.url && typeof o.url === "string" ? o.url.replace(/[^/]*$/, "") : "";
    const init = (data) => {
      inst.data = data; inst.fps = data.fr || 30;
      inst.ip = o.from != null ? o.from : data.ip || 0; inst.op = o.to != null ? o.to : data.op == null ? inst.ip + inst.fps : data.op;
      inst.frames = inst.op - inst.ip; inst.duration = inst.frames / inst.fps / inst.speed;
      inst.W = o.width || data.w; inst.H = o.height || data.h;
      if (target !== null) { C = setupCanvas(target, inst.W, inst.H, o); inst.canvas = C.canvas; inst.ctx = C.ctx; inst.el = C.canvas; }
      return Promise.all([loadImages(data, o.assetsPath != null ? o.assetsPath : base0).then((im) => (images = im)), loadFonts(data)]).then(() => { rend = Renderer(data, images, R); });
    };
    inst.ready = load(o.data != null ? o.data : o.url).then(init).then(() => { inst.draw(inst.t || 0); return inst; });
    inst.frameAt = (t) => {
      let n = t * inst.fps * inst.speed;
      if (inst.loop && inst.frames > 0) n = ((n % inst.frames) + inst.frames) % inst.frames;
      else n = Math.max(0, Math.min(inst.frames - (o.holdLast === false ? 0 : 1e-6), n));
      n = Math.round(n * 1e4) / 1e4;
      if (o.subframe === false) n = Math.floor(n + 1e-6);
      return inst.ip + n;
    };
    inst.drawFrame = (f) => {
      if (!rend || !C) return inst;
      const g = C.begin();
      if (o.background) { g.fillStyle = o.background; g.fillRect(0, 0, inst.W, inst.H); }
      const base = mul([C.dpr, 0, 0, C.dpr, 0, 0], fitMatrix(o.fit || "contain", inst.data.w, inst.data.h, inst.W, inst.H));
      rend.frame(g, f, base, C.canvas.width, C.canvas.height);
      g.setTransform(C.dpr, 0, 0, C.dpr, 0, 0);
      return inst;
    };
    inst.draw = (t) => { inst.t = t; return rend ? inst.drawFrame(inst.frameAt(t)) : inst; };
    inst.seek = (t) => inst.draw(t);
    inst.drawTo = (ctx, t, box = {}) => {
      if (!rend) return inst;
      const T = ctx.getTransform(), m = mul([T.a, T.b, T.c, T.d, T.e, T.f], mul(tr(box.x || 0, box.y || 0), fitMatrix(box.fit || o.fit || "contain", inst.data.w, inst.data.h, box.width || inst.data.w, box.height || inst.data.h)));
      ctx.save(); rend.frame(ctx, inst.frameAt(t), m, ctx.canvas.width, ctx.canvas.height); ctx.restore();
      return inst;
    };
    inst.timeline = () => (MGP.core && MGP.core.timeline ? MGP.core.timeline(inst) : { duration: () => inst.duration, seek: (x) => inst.seek(x) });
    inst.report = () => { const a = inst.data ? analyze(inst.data) : { unsupported: [] }; a.runtime = R.list(); return a; };
    inst.destroy = () => { if (C && C.canvas && C.canvas.parentNode && C.canvas !== target) C.canvas.parentNode.removeChild(C.canvas); };
    return inst;
  }

  const FEATURES = ["shape layer", "group", "rectangle (roundness)", "ellipse", "star", "polygon", "path", "fill (nonzero/evenodd)", "stroke (width, caps, joins, miter, dashes)",
    "gradient fill/stroke linear", "gradient fill/stroke radial + highlight", "gradient opacity stops", "trim paths (simultaneous, individual, offset)", "repeater (copies, offset, transform, opacity, composite)",
    "round corners", "merge paths (add)", "transform: anchor, position, separated x/y, scale, rotation, opacity, skew + axis", "keyframes: bezier easing (per dimension), linear, hold",
    "legacy keyframes (s/e)", "spatial bezier position", "auto-orient", "parenting", "solid layer", "null layer", "image layer (embedded / external)", "precomp", "time remap", "time stretch",
    "layer in/out points", "masks add/subtract/intersect + inverted + opacity", "mask feather/expansion (approx.)", "track matte alpha/luma (+inverted), td/tt and tp", "text layer: font, size, fill, stroke, justify, tracking, line height, caps, box",
    "text glyph shapes (chars)", "blend modes (16)"];

  Object.assign(LT, { __player: "1.0.0", create, load, renderFrame, analyze, FEATURES, lib: { val, xform, bezEase, absPath, trimRanges, procList, fitMatrix, gradStops, cssColor: css } });
})(typeof globalThis !== "undefined" ? globalThis : this);
