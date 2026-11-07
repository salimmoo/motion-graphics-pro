/**
 * MGP.lottie.rekam / dariDOM: export MGP compositions to Lottie JSON (Bodymovin 5.x shape), written for the MGP library.
 * Load after lottie.js (player not required for exporting, but used for checks):
 *   <script src="lib/core/mgp-core.js"></script><script src="lib/lottie/lottie.js"></script><script src="lib/lottie/record.js"></script>
 *
 * (a) Vector recording from a canvas draw function:
 *   MGP.lottie.rekam(source, opts) -> { data, laporan, json() }
 *     source: (ctx, t) => void          any draw(t) that paints with the 2D canvas API
 *           | MGP module api            (uses api.render(ctx, t, opts.modul))
 *           | MGP instance              (from MGP.<modul>.create; records its own state)
 *     opts: width, height, fps 30, duration (s), from 0 (s), nama, presisi 2 (decimals), toleransi 0.05 (px, key dropping)
 *           interpolasi "linear" | "hold"   linear (default) = keys interpolate linearly, a key is dropped when its neighbours
 *                                            reproduce it within toleransi (paths too when the vertex count stays the same);
 *                                            hold = one hold key per changed frame (exact, larger)
 *           geser true                       moving rigid sub-paths become static shape + position track (false = off)
 *           slot "auto" | "urutan"           auto = class + occurrence slots, falling back to draw-order slots on z conflicts
 *     A recording context stands in for the canvas: every fill/stroke/fillText/drawImage becomes a record (paths in device
 *     space, colour, gradient, stroke settings, clip, blend). Records are matched to "slots" across frames (same kind + style,
 *     n-th occurrence), each slot becomes one Lottie layer whose values are keyframed only where they change: identical
 *     frames and unchanged paths cost nothing (path keyframe reuse = repeated values collapse into one hold key).
 *     Text becomes text layers (font family/weight/style, size, colour, alignment, tracking) with a decomposed transform.
 *     Images become embedded image assets. Clips become layer masks.
 *     laporan lists what could not be expressed (shadows, filters, unsupported composite ops, patterns, Path2D, pixel ops).
 *
 * (b) DOM / SVG + timeline converter:
 *   MGP.lottie.dariDOM(root, opts) -> { data, laporan, json() }
 *     root: element (HTML or <svg>) whose descendants are converted
 *     opts: timeline (GSAP timeline, or any object with seek(t)/time(t)), seek (t) => void (alternative), duration, fps 30,
 *           width/height (default root size), toleransi 0.6 (px / percent for ease fitting), nama
 *     SVG rect/circle/ellipse/line/polyline/polygon/path/text and HTML boxes (background colour, border radius) and text leaves
 *     become layers. Each element is sampled every frame (matrix to root, opacity, colours); with a GSAP timeline each tween
 *     segment whose ease maps to a cubic bezier (none, power1-4, quad..quint, sine, expo, circ, back) becomes two keyframes with
 *     those handles, checked against the samples; other segments (elastic, bounce, steps, overlapping tweens, Gerak or other
 *     timelines) keep sampled linear keyframes with redundant keys removed.
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const LT = (MGP.lottie = MGP.lottie || {});
  if (LT.__record || LT.__rekam) return;
  const RAD = Math.PI / 180, KAPPA = 0.5519150244935105;
  const hasDOM = typeof document !== "undefined";

  /* ---------------- matrix ---------------- */
  const I = () => [1, 0, 0, 1, 0, 0];
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const msc = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  const inv = (m) => { const d = m[0] * m[3] - m[1] * m[2] || 1e-12; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
  /** split matrix into Lottie p, r, s, sk (sa = 0) matching the player: M = T(p) R(r) Shx(-tan sk) S(s) */
  function decompose(m) {
    const a = m[0], b = m[1], c = m[2], d = m[3];
    const sx = Math.hypot(a, b) || 1e-9, r = Math.atan2(b, a), cr = Math.cos(-r), sr = Math.sin(-r);
    const c2 = cr * c - sr * d, d2 = sr * c + cr * d, sy = d2 || 1e-9, k = c2 / sy;
    return { p: [m[4], m[5]], r: r / RAD, s: [sx * 100, sy * 100], sk: -Math.atan(k) / RAD };
  }

  /* ---------------- colour ---------------- */
  let NC = null;
  const normCtx = () => NC || (NC = hasDOM ? document.createElement("canvas").getContext("2d") : null);
  function parseColor(v) {
    if (v == null) return null;
    if (typeof v === "object") return v; // gradient/pattern record
    const g = normCtx(); let s = String(v);
    if (g) { g.fillStyle = "#000"; g.fillStyle = s; s = g.fillStyle; }
    let m = /^#([0-9a-f]{6})$/i.exec(s);
    if (m) { const n = parseInt(m[1], 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]; }
    m = /rgba?\(([^)]+)\)/.exec(s);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] == null ? 1 : p[3]]; }
    return [0, 0, 0, 1];
  }
  const BM = { multiply: 1, screen: 2, overlay: 3, darken: 4, lighten: 5, "color-dodge": 6, "color-burn": 7, "hard-light": 8, "soft-light": 9, difference: 10, exclusion: 11, hue: 12, saturation: 13, color: 14, luminosity: 15, lighter: 16 };

  /* ---------------- path builder (device space) ---------------- */
  function PathRec() { this.subs = []; this.cur = null; }
  PathRec.prototype = {
    move(p) { this.cur = { v: [p], i: [p], o: [p], c: false }; this.subs.push(this.cur); },
    line(p) { if (!this.cur) return this.move(p); const c = this.cur; c.v.push(p); c.i.push(p); c.o.push(p); },
    cubic(a, b, p) { if (!this.cur) this.move(a); const c = this.cur; c.o[c.o.length - 1] = a; c.v.push(p); c.i.push(b); c.o.push(p); },
    close() { const c = this.cur; if (!c) return; if (c.v.length > 1) { const a = c.v[0], z = c.v[c.v.length - 1]; if (Math.abs(a[0] - z[0]) < 1e-6 && Math.abs(a[1] - z[1]) < 1e-6) { c.i[0] = c.i[c.i.length - 1]; c.v.pop(); c.i.pop(); c.o.pop(); } } c.c = true; this.cur = { v: [c.v[0]], i: [c.v[0]], o: [c.v[0]], c: false }; this.subs.push(this.cur); },
    last() { const c = this.cur; return c && c.v.length ? c.v[c.v.length - 1] : null; },
    done() { return this.subs.filter((s) => s.v.length > 1 || s.c); },
  };
  /** arc (centre cx,cy radii rx,ry, rotation rot) from a0 to a1 (radians) as cubic pieces, local -> device via m */
  function arcTo(P, m, cx, cy, rx, ry, rot, a0, a1, ccw, connect) {
    let da = a1 - a0;
    if (!ccw && da < 0) da = da % (2 * Math.PI) + 2 * Math.PI; if (ccw && da > 0) da = da % (2 * Math.PI) - 2 * Math.PI;
    if (!ccw && a1 - a0 >= 2 * Math.PI) da = 2 * Math.PI; if (ccw && a0 - a1 >= 2 * Math.PI) da = -2 * Math.PI;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const pt = (a, k = 1, dx = 0, dy = 0) => { const x = rx * Math.cos(a) * k + dx, y = ry * Math.sin(a) * k + dy; return ap(m, cx + x * cr - y * sr, cy + x * sr + y * cr); };
    const start = pt(a0);
    if (connect && P.cur && P.cur.v.length) P.line(start); else P.move(start);
    const n = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 2) - 1e-9)), step = da / n, h = (4 / 3) * Math.tan(step / 4);
    for (let k = 0; k < n; k++) {
      const s = a0 + step * k, e = s + step;
      const loc = (a, t) => { const x = rx * (Math.cos(a) - t * Math.sin(a)), y = ry * (Math.sin(a) + t * Math.cos(a)); return ap(m, cx + x * cr - y * sr, cy + x * sr + y * cr); };
      P.cubic(loc(s, h), loc(e, -h), pt(e));
    }
  }

  /* ---------------- recording context ---------------- */
  function RecCtx(W, H, note) {
    const st = () => ({ m: I(), alpha: 1, fill: [0, 0, 0, 1], stroke: [0, 0, 0, 1], lw: 1, cap: "butt", join: "miter", ml: 10, dash: [], dashOff: 0,
      font: "10px sans-serif", align: "start", base: "alphabetic", ls: "0px", gco: "source-over", clip: null, shB: 0, shC: "rgba(0,0,0,0)", shX: 0, shY: 0, filter: "none" });
    let S = st(); const stack = []; let P = new PathRec(); const recs = [];
    const meas = normCtx() ? document.createElement("canvas").getContext("2d") : null;
    const fx = () => {
      if (S.shB > 0 || S.shX || S.shY) { const c = parseColor(S.shC); if (c && c[3] > 0) note("shadow ignored"); }
      if (S.filter && S.filter !== "none") note("ctx.filter ignored (" + String(S.filter).split("(")[0] + ")");
      if (S.gco !== "source-over" && BM[S.gco] == null) note("composite op " + S.gco + " drawn as normal");
    };
    const style = (v) => {
      if (Array.isArray(v)) return { type: "solid", c: v };
      if (v && v.__grad) {
        const m = S.m;
        if (v.__grad === "lin") return { type: "lin", s: ap(m, v.x0, v.y0), e: ap(m, v.x1, v.y1), stops: v.stops.slice() };
        const c1 = ap(m, v.x1, v.y1), c0 = ap(m, v.x0, v.y0), r = v.r1 * msc(m);
        if (v.r0 > 0) note("radial gradient inner radius ignored");
        const d = Math.hypot(c0[0] - c1[0], c0[1] - c1[1]);
        return { type: "rad", s: c1, e: [c1[0] + r, c1[1]], h: r ? Math.min(99, d / r * 100) : 0, a: d ? Math.atan2(c0[1] - c1[1], c0[0] - c1[0]) / RAD : 0, stops: v.stops.slice() };
      }
      if (v && v.__pattern) { note("pattern fill drawn as grey"); return { type: "solid", c: [0.5, 0.5, 0.5, 1] }; }
      return { type: "solid", c: [0, 0, 0, 1] };
    };
    const base = () => ({ alpha: S.alpha, clip: S.clip, bm: BM[S.gco] || 0 });
    const rectSub = (x, y, w, h) => { const Q = new PathRec(); Q.move(ap(S.m, x, y)); Q.line(ap(S.m, x + w, y)); Q.line(ap(S.m, x + w, y + h)); Q.line(ap(S.m, x, y + h)); Q.close(); return Q.done(); };
    const paint = (mode, subs, rule) => {
      fx(); if (!subs.length) return;
      const sty = style(mode === "fill" ? S.fill : S.stroke);
      const r = { k: "path", mode, subs, sty, rule: rule === "evenodd" ? 2 : 1, ...base() };
      if (mode === "stroke") { const s = msc(S.m); r.w = S.lw * s; r.cap = S.cap; r.join = S.join; r.ml = S.ml; if (S.dash.length) { r.dash = S.dash.map((x) => x * s); r.dashOff = S.dashOff * s; } }
      recs.push(r);
    };
    const txt = (mode, text, x, y, maxW) => {
      fx(); if (maxW != null) note("fillText maxWidth ignored");
      if (meas) { meas.font = S.font; meas.textBaseline = S.base; meas.textAlign = "left"; try { meas.letterSpacing = S.ls; } catch (e) { /* old browser */ } }
      let dy = 0;
      if (meas && S.base !== "alphabetic") { const mm = meas.measureText(String(text)); if (mm.alphabeticBaseline != null) dy = -mm.alphabeticBaseline; }
      const sty = style(mode === "fill" ? S.fill : S.stroke);
      if (sty.type !== "solid") note("gradient text drawn with first stop colour");
      const col = sty.type === "solid" ? sty.c : sty.stops.length ? sty.stops[0][1] : [0, 0, 0, 1];
      recs.push({ k: "text", mode, text: String(text), font: S.font, ls: S.ls, align: S.align, m: mul(S.m, [1, 0, 0, 1, x, y + dy]), c: col, lw: mode === "stroke" ? S.lw : 0, ...base() });
    };
    const ctx = {
      canvas: { width: W, height: H, getContext: () => ctx },
      save() { stack.push(Object.assign({}, S, { m: S.m.slice(), dash: S.dash.slice() })); },
      restore() { if (stack.length) S = stack.pop(); },
      reset() { S = st(); stack.length = 0; P = new PathRec(); },
      translate(x, y) { S.m = mul(S.m, [1, 0, 0, 1, x, y]); },
      scale(x, y) { S.m = mul(S.m, [x, 0, 0, y == null ? x : y, 0, 0]); },
      rotate(a) { const c = Math.cos(a), s = Math.sin(a); S.m = mul(S.m, [c, s, -s, c, 0, 0]); },
      transform(a, b, c, d, e, f) { S.m = mul(S.m, [a, b, c, d, e, f]); },
      setTransform(a, b, c, d, e, f) { if (a && typeof a === "object") S.m = [a.a, a.b, a.c, a.d, a.e, a.f]; else S.m = a == null ? I() : [a, b, c, d, e, f]; },
      resetTransform() { S.m = I(); },
      getTransform() { const m = S.m; return typeof DOMMatrix !== "undefined" ? new DOMMatrix(m) : { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }; },
      beginPath() { P = new PathRec(); },
      moveTo(x, y) { P.move(ap(S.m, x, y)); },
      lineTo(x, y) { P.line(ap(S.m, x, y)); },
      bezierCurveTo(a, b, c, d, x, y) { P.cubic(ap(S.m, a, b), ap(S.m, c, d), ap(S.m, x, y)); },
      quadraticCurveTo(a, b, x, y) {
        const inv0 = P.last(); const p0 = inv0 ? ap(inv(S.m), inv0[0], inv0[1]) : [a, b];
        P.cubic(ap(S.m, p0[0] + (2 / 3) * (a - p0[0]), p0[1] + (2 / 3) * (b - p0[1])), ap(S.m, x + (2 / 3) * (a - x), y + (2 / 3) * (b - y)), ap(S.m, x, y));
      },
      arc(x, y, r, a0, a1, ccw) { arcTo(P, S.m, x, y, r, r, 0, a0, a1, !!ccw, true); },
      ellipse(x, y, rx, ry, rot, a0, a1, ccw) { arcTo(P, S.m, x, y, rx, ry, rot, a0, a1, !!ccw, true); },
      arcTo(x1, y1, x2, y2, r) {
        const l = P.last(); if (!l) { P.move(ap(S.m, x1, y1)); return; }
        const p0 = ap(inv(S.m), l[0], l[1]), v1 = [p0[0] - x1, p0[1] - y1], v2 = [x2 - x1, y2 - y1], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
        const ang = Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2 || 1))));
        if (!r || !l1 || !l2 || Math.abs(Math.sin(ang)) < 1e-6) { P.line(ap(S.m, x1, y1)); return; }
        const d = r / Math.tan(ang / 2), t1 = [x1 + v1[0] / l1 * d, y1 + v1[1] / l1 * d], t2 = [x1 + v2[0] / l2 * d, y1 + v2[1] / l2 * d];
        const bis = [v1[0] / l1 + v2[0] / l2, v1[1] / l1 + v2[1] / l2], bl = Math.hypot(...bis), dc = r / Math.sin(ang / 2), c = [x1 + bis[0] / bl * dc, y1 + bis[1] / bl * dc];
        const a0 = Math.atan2(t1[1] - c[1], t1[0] - c[0]), a1 = Math.atan2(t2[1] - c[1], t2[0] - c[0]), cross = v1[0] * v2[1] - v1[1] * v2[0];
        arcTo(P, S.m, c[0], c[1], r, r, 0, a0, a1, cross < 0 ? false : true, true);
      },
      rect(x, y, w, h) { P.move(ap(S.m, x, y)); P.line(ap(S.m, x + w, y)); P.line(ap(S.m, x + w, y + h)); P.line(ap(S.m, x, y + h)); P.close(); },
      roundRect(x, y, w, h, r) {
        let rr = Array.isArray(r) ? r : [r == null ? 0 : r]; rr = rr.map((q) => (typeof q === "object" ? q.x || 0 : +q || 0));
        const [tl, tr, br, bl] = rr.length === 1 ? [rr[0], rr[0], rr[0], rr[0]] : rr.length === 2 ? [rr[0], rr[1], rr[0], rr[1]] : rr.length === 3 ? [rr[0], rr[1], rr[2], rr[1]] : rr;
        const k = Math.min(1, w / ((tl + tr) || 1), w / ((bl + br) || 1), h / ((tl + bl) || 1), h / ((tr + br) || 1)), A = tl * k, B = tr * k, C = br * k, D = bl * k;
        P.move(ap(S.m, x + A, y)); P.line(ap(S.m, x + w - B, y)); if (B) arcTo(P, S.m, x + w - B, y + B, B, B, 0, -Math.PI / 2, 0, false, true);
        P.line(ap(S.m, x + w, y + h - C)); if (C) arcTo(P, S.m, x + w - C, y + h - C, C, C, 0, 0, Math.PI / 2, false, true);
        P.line(ap(S.m, x + D, y + h)); if (D) arcTo(P, S.m, x + D, y + h - D, D, D, 0, Math.PI / 2, Math.PI, false, true);
        P.line(ap(S.m, x, y + A)); if (A) arcTo(P, S.m, x + A, y + A, A, A, 0, Math.PI, Math.PI * 1.5, false, true);
        P.close();
      },
      closePath() { P.close(); },
      fill(a, b) { if (a && typeof a === "object") { note("Path2D ignored"); return; } paint("fill", P.done(), a); },
      stroke(a) { if (a && typeof a === "object") { note("Path2D ignored"); return; } paint("stroke", P.done()); },
      clip(a) { if (a && typeof a === "object") { note("Path2D clip ignored"); return; } S.clip = (S.clip || []).concat([P.done()]); },
      fillRect(x, y, w, h) {
        // an opaque full-canvas fill hides everything before it (common "clear with background")
        const c = [ap(S.m, x, y), ap(S.m, x + w, y + h)];
        if (Array.isArray(S.fill) && S.fill[3] >= 1 && S.alpha >= 1 && S.gco === "source-over" && !S.clip && S.m[1] === 0 && S.m[2] === 0 && Math.min(c[0][0], c[1][0]) <= 0.5 && Math.min(c[0][1], c[1][1]) <= 0.5 && Math.max(c[0][0], c[1][0]) >= W - 0.5 && Math.max(c[0][1], c[1][1]) >= H - 0.5) recs.length = 0;
        paint("fill", rectSub(x, y, w, h));
      },
      strokeRect(x, y, w, h) { paint("stroke", rectSub(x, y, w, h)); },
      clearRect(x, y, w, h) {
        const c = [ap(S.m, x, y), ap(S.m, x + w, y + h)];
        if (Math.min(c[0][0], c[1][0]) <= 0.5 && Math.min(c[0][1], c[1][1]) <= 0.5 && Math.max(c[0][0], c[1][0]) >= W - 0.5 && Math.max(c[0][1], c[1][1]) >= H - 0.5) recs.length = 0;
        else note("partial clearRect ignored");
      },
      fillText(t, x, y, mw) { txt("fill", t, x, y, mw); },
      strokeText(t, x, y, mw) { txt("stroke", t, x, y, mw); },
      measureText(t) { if (!meas) return { width: String(t).length * 6 }; meas.font = S.font; meas.textBaseline = S.base; meas.textAlign = S.align; try { meas.letterSpacing = S.ls; } catch (e) { /* ignore */ } return meas.measureText(t); },
      drawImage(img, ...a) {
        fx();
        let sx = 0, sy = 0, sw = img.width || img.naturalWidth, sh = img.height || img.naturalHeight, dx, dy, dw, dh;
        if (a.length === 2) [dx, dy] = a, dw = sw, dh = sh; else if (a.length === 4) [dx, dy, dw, dh] = a; else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
        if (!(sw > 0 && sh > 0)) return;
        let url = null;
        try {
          const c = document.createElement("canvas"); c.width = Math.ceil(sw); c.height = Math.ceil(sh);
          c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); url = c.toDataURL("image/png");
        } catch (e) { note("image not readable (cross-origin) skipped"); return; }
        recs.push({ k: "image", url, w: Math.ceil(sw), h: Math.ceil(sh), m: mul(S.m, [dw / sw, 0, 0, dh / sh, dx, dy]), ...base() });
      },
      createLinearGradient(x0, y0, x1, y1) { const g = { __grad: "lin", x0, y0, x1, y1, stops: [], addColorStop(o, c) { g.stops.push([o, parseColor(c)]); } }; return g; },
      createRadialGradient(x0, y0, r0, x1, y1, r1) { const g = { __grad: "rad", x0, y0, r0, x1, y1, r1, stops: [], addColorStop(o, c) { g.stops.push([o, parseColor(c)]); } }; return g; },
      createConicGradient() { note("conic gradient drawn as grey"); return { __pattern: 1, addColorStop() {} }; },
      createPattern() { return { __pattern: 1 }; },
      setLineDash(d) { S.dash = (d || []).slice(); }, getLineDash() { return S.dash.slice(); },
      isPointInPath() { return false; }, isPointInStroke() { return false; },
      getImageData(x, y, w, h) { note("getImageData (pixel ops) ignored"); return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
      putImageData() { note("putImageData ignored"); }, createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
      __records: recs,
    };
    const props = { fillStyle: ["fill", (v) => parseColor(v)], strokeStyle: ["stroke", (v) => parseColor(v)], globalAlpha: ["alpha", (v) => +v], lineWidth: ["lw", (v) => +v],
      lineCap: ["cap", String], lineJoin: ["join", String], miterLimit: ["ml", (v) => +v], lineDashOffset: ["dashOff", (v) => +v], font: ["font", String], textAlign: ["align", String],
      textBaseline: ["base", String], letterSpacing: ["ls", String], globalCompositeOperation: ["gco", String], shadowBlur: ["shB", (v) => +v], shadowColor: ["shC", String],
      shadowOffsetX: ["shX", (v) => +v], shadowOffsetY: ["shY", (v) => +v], filter: ["filter", String] };
    for (const [k, [f, conv]] of Object.entries(props)) Object.defineProperty(ctx, k, { get: () => S[f], set: (v) => { S[f] = conv(v); }, enumerable: true });
    if (typeof Proxy === "undefined") return ctx;
    return new Proxy(ctx, { get(t, k) { if (k in t) return t[k]; if (typeof k === "string" && !/^(then|toJSON)$/.test(k)) return function () { note("ctx." + k + "() ignored"); }; return undefined; }, set(t, k, v) { if (k in t) t[k] = v; else t[k] = v; return true; } });
  }

  /* ---------------- keyframe tracks ---------------- */
  const rnd = (v, p) => { const k = Math.pow(10, p); return Math.round(v * k) / k; };
  const rv = (v, p) => (Array.isArray(v) ? v.map((x) => rnd(x, p)) : rnd(v, p));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const LIN = { o: { x: [0], y: [0] }, i: { x: [1], y: [1] } };
  /** values[f] (null = keep previous) -> Lottie animatable property */
  /** pad a Lottie path to n vertices with zero-length segments (lottie-web keeps the first keyframe's vertex count) */
  function padPath(P, n) {
    if (P.v.length >= n) return P;
    const Q = { c: P.c, v: P.v.slice(), i: P.i.slice(), o: P.o.slice() };
    if (!Q.v.length) { Q.v.push([-1e4, -1e4]); Q.i.push([0, 0]); Q.o.push([0, 0]); }
    const L = Q.v.length - 1, last = Q.v[L], out = Q.o[L];
    Q.o[L] = [0, 0];
    while (Q.v.length < n) { Q.v.push(last.slice()); Q.i.push([0, 0]); Q.o.push([0, 0]); }
    Q.o[Q.o.length - 1] = P.c ? out : [0, 0];
    return Q;
  }
  function track(values, opt = {}) {
    if (opt.path) { const n = Math.max(1, ...values.map((v) => (v ? v.v.length : 0))); values = values.map((v) => (v ? padPath(v, n) : v)); }
    let first = values.find((v) => v != null); if (first === undefined) first = opt.def;
    const arr = values.map((v) => (v == null ? undefined : v));
    for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = i ? arr[i - 1] : first;
    const keys = [];
    for (let i = 0; i < arr.length; i++) if (!i || !same(arr[i], arr[i - 1])) keys.push(i);
    const wrap = (v) => (opt.path ? [v] : Array.isArray(v) ? v : [v]);
    if (keys.length === 1) return { a: 0, k: opt.path ? first : first };
    const flat = (v) => (opt.path ? [].concat(...v.v, ...v.i, ...v.o) : [].concat(v));
    const F = arr.map(flat);
    // Paths are padded to one vertex count, so only open/closed (c) can differ (e.g. an absent slot = EMPTY,
    // open). Those boundaries become per-key holds; everything else stays linear, so unchanged or smoothly
    // moving stretches collapse to a few keys instead of one hold key per frame (size: masks and paths).
    const lin = opt.linear && (!opt.path || F.every((x) => x.length === F[0].length));
    if (!lin) return { a: 1, k: keys.map((t) => ({ t: t + (opt.t0 || 0), s: wrap(arr[t]), h: 1 })) };
    const cOf = (i) => (opt.path ? !!arr[i].c : true);
    // linear: key at every change boundary (both sides), then drop keys that interpolate within eps
    const ks = new Set(); keys.forEach((t) => { ks.add(t); if (t > 0) ks.add(t - 1); }); ks.add(arr.length - 1);
    let K = [...ks].sort((a, b) => a - b);
    const eps = opt.eps == null ? 0.05 : opt.eps;
    const fits = (a, b, i) => { if (cOf(i) !== cOf(a) || cOf(b) !== cOf(a)) return false; const u = (i - a) / (b - a), A = F[a], B = F[b], V = F[i]; return V.every((x, d) => Math.abs(A[d] + (B[d] - A[d]) * u - x) <= eps); };
    let changed = true;
    while (changed) { changed = false; for (let j = 1; j < K.length - 1; j++) { const a = K[j - 1], b = K[j + 1]; let ok = true; for (let i = a + 1; i < b && ok; i++) ok = fits(a, b, i); if (ok) { K.splice(j, 1); changed = true; j--; } } }
    return { a: 1, k: K.map((t, j) => Object.assign({ t: t + (opt.t0 || 0), s: wrap(arr[t]) }, j < K.length - 1 ? (cOf(t) !== cOf(K[j + 1]) ? { h: 1 } : JSON.parse(JSON.stringify(LIN))) : {})) };
  }
  const countKeys = (p) => (p && p.a === 1 ? p.k.length : 0);

  /* ---------------- records -> layers ---------------- */
  const EMPTY = { i: [[0, 0]], o: [[0, 0]], v: [[-1e4, -1e4]], c: false }; // off-canvas: draws nothing even with round caps
  function toLottiePath(S, p) { return { c: !!S.c, v: S.v.map((q) => rv(q, p)), i: S.i.map((q, k) => rv([q[0] - S.v[k][0], q[1] - S.v[k][1]], p)), o: S.o.map((q, k) => rv([q[0] - S.v[k][0], q[1] - S.v[k][1]], p)) }; }
  const CAP = { butt: 1, round: 2, square: 3 }, JOIN = { miter: 1, round: 2, bevel: 3 };
  function gradFlat(stops) {
    const S = stops.slice().sort((a, b) => a[0] - b[0]);
    return [].concat(...S.map(([o, c]) => [o, c[0], c[1], c[2]]), ...S.map(([o, c]) => [o, c[3] == null ? 1 : c[3]]));
  }
  function parseFont(f) {
    const g = normCtx(); if (g) { g.font = "10px sans-serif"; g.font = f; f = g.font; }
    const m = /^(.*?)(\d+(?:\.\d+)?)px(?:\s*\/\s*\S+)?\s+(.+)$/.exec(f) || [null, "", "10", "sans-serif"];
    const pre = m[1], fams = m[3].split(",").map((x) => x.trim().replace(/^["']|["']$/g, ""));
    // a system first family (ui-monospace, system-ui ...) keeps the whole CSS stack so the same fallback is used on playback
    const SYS = /^(system-ui|ui-[a-z]+|-apple-system|blinkmacsystemfont)$/i;
    const fam = SYS.test(fams[0]) && fams.length > 1 ? fams.map((x) => (/\s/.test(x) ? `'${x}'` : x)).join(", ") : fams[0];
    const w = /\b(\d00)\b/.exec(pre) ? +/\b(\d00)\b/.exec(pre)[1] : /\bbold\b/.test(pre) ? 700 : /\blighter\b/.test(pre) ? 300 : 400;
    const it = /italic|oblique/.test(pre);
    const WN = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
    const style = it ? (w === 400 ? "Italic" : WN[w] + " Italic") : WN[w] || "Regular";
    return { size: +m[2], family: fam, weight: w, italic: it, style, name: (fams[0] + "-" + style).replace(/[\s,'"]+/g, "") };
  }
  function classKey(r) {
    if (r.k === "path") { const s = r.sty; return ["P", r.mode, s.type, s.stops ? s.stops.length : 0, r.dash ? r.dash.length : 0, r.bm].join(":"); }
    if (r.k === "text") return ["T", r.mode, r.bm, parseFont(r.font).name].join(":");
    return ["I", r.url.length, r.bm].join(":") + ":" + hashStr(r.url);
  }
  function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i += 7) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  /** frames: array of record arrays -> { layers, assets, fonts, stats } */
  function build(frames, o, note, byPos) {
    const N = frames.length, p = o.presisi == null ? 2 : o.presisi, linear = o.interpolasi === "linear";
    // toleransi buang-key >= setengah kuantum pembulatan: dengan --presisi 1 (0,1 px) toleransi 0,05 membuat setiap
    // undakan pembulatan menjadi key baru (berkas justru membesar)
    const epsQ = Math.max(o.toleransi == null ? 0.05 : o.toleransi, Math.pow(10, -p));
    // slot = class key + occurrence index within the frame
    const slotFrames = new Map(); // slot -> array[N] of record|null
    const seqs = [];
    frames.forEach((recs, f) => {
      const cnt = {}, seq = [];
      recs.forEach((r, j) => { const ck = classKey(r), n = (cnt[ck] = (cnt[ck] || 0) + 1), id = byPos ? String(j).padStart(5, "0") + "@" + ck : ck + "#" + n; if (!slotFrames.has(id)) slotFrames.set(id, new Array(N).fill(null)); slotFrames.get(id)[f] = r; seq.push(id); });
      seqs.push(seq);
    });
    // z-order: topological sort of "below -> above" pairs, ties by mean position
    const ids = [...slotFrames.keys()], pos = new Map(ids.map((id) => [id, [0, 0]])), succ = new Map(ids.map((id) => [id, new Set()])), indeg = new Map(ids.map((id) => [id, 0]));
    for (const seq of seqs) { seq.forEach((id, j) => { const q = pos.get(id); q[0] += j / Math.max(1, seq.length - 1); q[1]++; }); for (let j = 1; j < seq.length; j++) { const a = seq[j - 1], b = seq[j]; if (!succ.get(a).has(b)) { succ.get(a).add(b); indeg.set(b, indeg.get(b) + 1); } } }
    const mean = (id) => pos.get(id)[0] / pos.get(id)[1];
    const order = [], left = new Set(ids);
    while (left.size) {
      let pick = null;
      for (const id of left) if (indeg.get(id) === 0 && (!pick || mean(id) < mean(pick))) pick = id;
      if (!pick) for (const id of left) if (!pick || mean(id) < mean(pick)) pick = id; // cycle: break at the lowest
      left.delete(pick); order.push(pick); for (const b of succ.get(pick)) indeg.set(b, indeg.get(b) - 1);
    }
    const rank = new Map(order.map((id, k) => [id, k]));
    let conflicts = 0; for (const seq of seqs) for (let j = 1; j < seq.length; j++) if (rank.get(seq[j]) < rank.get(seq[j - 1])) { conflicts++; break; }
    if (conflicts && !byPos) return null; // caller retries with draw-order slots

    const layers = [], assets = [], fonts = new Map(), assetIds = new Map();
    let keyCount = 0, ind = 1, moved = 0;
    for (const id of order.slice().reverse()) { // Lottie: first layer = top
      const R = slotFrames.get(id), fIn = R.findIndex((r) => r), fOut = N - [...R].reverse().findIndex((r) => r);
      const any = R[fIn], sub = (f) => R.slice(fIn, fOut).map(f);
      const op100 = (r, extra = 1) => (r ? rnd(Math.max(0, Math.min(1, r.alpha * extra)) * 100, 2) : 0);
      const L = { ddd: 0, ind: ind++, sr: 1, ao: 0, ip: fIn, op: fOut, st: 0, bm: any.bm || 0, nm: id };
      // clip -> masks
      const nClip = Math.max(0, ...sub((r) => (r && r.clip ? r.clip.length : 0)));
      if (nClip) {
        L.hasMask = true; L.masksProperties = [];
        for (let c = 0; c < nClip; c++) {
          const W = o.width, H = o.height, full = { c: true, v: [[-1, -1], [W + 1, -1], [W + 1, H + 1], [-1, H + 1]], i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]] };
          // a clip may be several sub-paths: each clip level becomes one mask made of its first sub-path; extra sub-paths add masks
          const nSub = Math.max(1, ...sub((r) => (r && r.clip && r.clip[c] ? r.clip[c].length : 0)));
          for (let s = 0; s < nSub; s++) {
            // masks live in layer space: text/image layers carry the record matrix, so map the clip back through its inverse
            const local = (r, P) => { if (r.k === "path") return P; const m = inv(r.m), q = (v) => ap(m, v[0], v[1]); return { c: P.c, v: P.v.map(q), i: P.i.map(q), o: P.o.map(q) }; };
            const fullFor = (r) => (r && r.k !== "path" ? toLottiePath(local(r, { c: true, v: full.v, i: full.v, o: full.v }), p) : full);
            const pt = track(sub((r) => (r && r.clip && r.clip[c] && r.clip[c][s] ? toLottiePath(local(r, r.clip[c][s]), p) : s ? EMPTY : fullFor(r))), { path: true, t0: fIn, linear, eps: epsQ });
            keyCount += countKeys(pt);
            L.masksProperties.push({ inv: false, mode: c === 0 || s > 0 ? "a" : "i", pt, o: { a: 0, k: 100 }, x: { a: 0, k: 0 }, nm: "klip " + (c + 1) + "." + (s + 1) });
          }
        }
        if (nClip > 1) note("nested clips approximated (first sub-path intersect)");
      }
      if (any.k === "path") {
        const it = [], R2 = sub((r) => r), life = R2.length;
        // path reuse: sub-paths that keep their shape and only move become tracks = one static shape + position keys
        // (matched frame to frame by shape, nearest offset); the rest keep per-frame path keyframes by index
        const tracks = [], byKey = new Map(), resid = R2.map(() => []);
        R2.forEach((r, f) => {
          if (!r) return; const used = new Set();
          r.subs.forEach((S) => {
            if (nClip || o.geser === false) { resid[f].push(S); return; }
            const off = S.v[0], q = (x) => Math.round(x * 20) / 20;
            const key = (S.c ? "c" : "o") + S.v.map((v, k) => [q(v[0] - off[0]), q(v[1] - off[1]), q(S.i[k][0] - off[0]), q(S.i[k][1] - off[1]), q(S.o[k][0] - off[0]), q(S.o[k][1] - off[1])].join(",")).join(";");
            let best = null, bd = Infinity;
            for (const T of byKey.get(key) || []) { if (used.has(T) || T.last === f) continue; const lo = T.offs[T.lastF], d = Math.hypot(lo[0] - off[0], lo[1] - off[1]); if (d < bd) { bd = d; best = T; } }
            if (!best) { best = { key, S, offs: {}, n: 0, lastF: f }; tracks.push(best); if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(best); }
            used.add(best); best.offs[f] = off; best.lastF = f; best.last = f; best.n++; best.inst = (best.inst || []).concat([[f, S]]);
          });
        });
        for (const T of tracks) {
          if (T.n < 2) { T.inst.forEach(([f, S]) => resid[f].push(S)); continue; }
          moved++;
          const off0 = T.S.v[0], shape = toLottiePath({ c: T.S.c, v: T.S.v.map((v) => [v[0] - off0[0], v[1] - off0[1]]), i: T.S.i.map((v) => [v[0] - off0[0], v[1] - off0[1]]), o: T.S.o.map((v) => [v[0] - off0[0], v[1] - off0[1]]) }, p);
          const P = [], Sc = []; let lastO = null;
          for (let f = 0; f < life; f++) { const of = T.offs[f]; if (of) lastO = rv(of, p); P.push(of ? rv(of, p) : null); Sc.push(of ? [100, 100] : [0, 0]); }
          const pt = track(P, { t0: fIn, linear, def: lastO, eps: epsQ }), stk = track(Sc, { t0: fIn }); keyCount += countKeys(pt) + countKeys(stk);
          it.push({ ty: "gr", nm: "jalur geser " + moved, it: [{ ty: "sh", ks: { a: 0, k: shape } }, { ty: "tr", p: pt, a: { a: 0, k: [0, 0] }, s: stk, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } }] });
        }
        const nSub = Math.max(0, ...resid.map((x) => x.length));
        for (let s = 0; s < nSub; s++) {
          const ks = track(resid.map((x) => (x[s] ? toLottiePath(x[s], p) : EMPTY)), { path: true, t0: fIn, linear, eps: epsQ }); keyCount += countKeys(ks); it.push({ ty: "sh", ks, nm: "jalur " + (s + 1) });
        }
        const sty = any.sty, T = (fn, def, extra = {}) => { const tk = track(sub((r) => (r ? fn(r) : null)), Object.assign({ t0: fIn, linear, def }, extra)); keyCount += countKeys(tk); return tk; };
        const o100 = T((r) => op100(r, r.sty.type === "solid" ? r.sty.c[3] : 1), 0);
        const S = sub((r) => r);
        // frames where the slot is absent inside [fIn, fOut): force opacity 0
        if (S.some((r) => !r)) { const vals = S.map((r) => (r ? op100(r, r.sty.type === "solid" ? r.sty.c[3] : 1) : 0)); Object.assign(o100, track(vals, { t0: fIn })); }
        let st;
        if (sty.type === "solid") st = { ty: any.mode === "fill" ? "fl" : "st", c: T((r) => rv(r.sty.c.slice(0, 3).concat(1), 4), [0, 0, 0, 1]), o: o100 };
        else {
          st = { ty: any.mode === "fill" ? "gf" : "gs", t: sty.type === "lin" ? 1 : 2, o: o100, s: T((r) => rv(r.sty.s, p), [0, 0]), e: T((r) => rv(r.sty.e, p), [0, 0]),
            g: { p: sty.stops.length, k: T((r) => rv(gradFlat(r.sty.stops), 4), []) } };
          if (sty.type === "rad") { st.h = T((r) => rnd(r.sty.h || 0, 2), 0); st.a = T((r) => rnd(r.sty.a || 0, 2), 0); }
        }
        if (any.mode === "fill") st.r = any.rule;
        else {
          st.w = T((r) => rnd(r.w, p), 1); st.lc = CAP[any.cap] || 1; st.lj = JOIN[any.join] || 1; st.ml = any.ml || 4;
          if (any.dash) { st.d = any.dash.map((_, k) => ({ n: k % 2 ? "g" : "d", nm: k % 2 ? "gap" : "dash", v: T((r) => rnd((r.dash || [])[k] || 0, p), 0) })); st.d.push({ n: "o", nm: "offset", v: T((r) => rnd(-(r.dashOff || 0), p), 0) }); }
          if (new Set(sub((r) => r && r.cap + r.join)).size > 2) note("line cap/join changes over time (first value kept)");
        }
        it.push(st, { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } });
        Object.assign(L, { ty: 4, ks: staticKs(), shapes: [{ ty: "gr", nm: "rekaman", it }] });
      } else if (any.k === "text") {
        const F = parseFont(any.font); if (!fonts.has(F.name)) fonts.set(F.name, { fName: F.name, fFamily: F.family, fStyle: F.style, fWeight: String(F.weight), ascent: 75 });
        if (new Set(sub((r) => r && parseFont(r.font).name).filter(Boolean)).size > 1) note("font family changes inside one text slot (first kept)");
        const docs = sub((r) => { if (!r) return null; const f = parseFont(r.font), lsPx = parseFloat(r.ls) || 0;
          const d = { s: rnd(f.size, 2), f: f.name, t: r.text, j: r.align === "center" ? 2 : r.align === "right" || r.align === "end" ? 1 : 0, tr: lsPx ? rnd(lsPx / f.size * 1000, 1) : 0, lh: rnd(f.size * 1.2, 2), ls: 0, fc: rv(r.c.slice(0, 3), 4) };
          if (r.mode === "stroke") { d.sc = d.fc; d.sw = rnd(r.lw, 2); delete d.fc; d.fc = [0, 0, 0, 0]; } return d; });
        const dk = track(docs, { t0: fIn }); keyCount += countKeys(dk);
        const textDoc = dk.a === 1 ? { k: dk.k.map((k) => ({ s: k.s[0], t: k.t })) } : { k: [{ s: dk.k, t: fIn }] };
        const D = sub((r) => (r ? decompose(r.m) : null));
        unwrapRot(D);
        const vals = sub((r) => (r ? op100(r, r.c[3]) : 0));
        Object.assign(L, { ty: 5, ks: ksTrack(D, vals, fIn, linear, p, (n) => (keyCount += n), epsQ), t: { d: textDoc, p: {}, m: { g: 1, a: { a: 0, k: [0, 0] } }, a: [] } });
      } else {
        let aid = assetIds.get(any.url);
        if (!aid) { aid = "gambar_" + (assets.length + 1); assetIds.set(any.url, aid); assets.push({ id: aid, w: any.w, h: any.h, u: "", p: any.url, e: 1 }); }
        const D = sub((r) => (r ? decompose(r.m) : null)); unwrapRot(D);
        Object.assign(L, { ty: 2, refId: aid, ks: ksTrack(D, sub((r) => op100(r)), fIn, linear, p, (n) => (keyCount += n), epsQ) });
      }
      layers.push(L);
    }
    return { layers, assets, fonts: [...fonts.values()], stats: { slots: ids.length, keyframes: keyCount, zConflicts: conflicts, slotMode: byPos ? "urutan gambar" : "kelas + kemunculan", movedPaths: moved } };
  }
  /** web fonts: point fPath at the Google Fonts CSS for the family (Rekam serves its local copy offline), skip system fonts */
  function linkFonts(list) {
    if (!list.length) return;
    const sys = /^(system-ui|ui-[a-z]+|sans-serif|serif|monospace|cursive|fantasy|arial|helvetica|georgia|times new roman|times|courier new|courier|verdana|tahoma|segoe ui|consolas|menlo|monaco|-apple-system|blinkmacsystemfont)$/i;
    const byFam = new Map();
    // a CSS stack ("system-ui, 'Segoe UI', Arial") names its first family; system fonts get no Google Fonts link
    const first = (f) => String(f || "").split(",")[0].trim().replace(/^["']|["']$/g, "");
    for (const F of list) { const fam = first(F.fFamily); if (!fam || sys.test(fam)) continue; if (!byFam.has(fam)) byFam.set(fam, new Set()); byFam.get(fam).add((/italic/i.test(F.fStyle) ? 1 : 0) + "," + (F.fWeight || 400)); }
    for (const F of list) {
      const fam = first(F.fFamily), set = byFam.get(fam); if (!set) continue;
      const axes = [...set].sort((a, b) => (a > b ? 1 : -1)).join(";");
      F.fPath = "https://fonts.googleapis.com/css2?family=" + fam.replace(/ /g, "+") + ":ital,wght@" + axes + "&display=block";
      F.fOrigin = "g"; F.origin = 1;
    }
  }
  function staticKs() { return { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } }; }
  function unwrapRot(D) { let prev = null; for (const d of D) { if (!d) continue; if (prev != null) { while (d.r - prev > 180) d.r -= 360; while (d.r - prev < -180) d.r += 360; } prev = d.r; } }
  function ksTrack(D, opac, t0, linear, p, count, eps) {
    const T = (vals, def, e) => { const t = track(vals, { t0, linear, def, eps: e }); count(countKeys(t)); return t; };
    return { o: T(opac, 100), p: T(D.map((d) => (d ? rv(d.p, p) : null)), [0, 0], eps), a: { a: 0, k: [0, 0] }, s: T(D.map((d) => (d ? rv(d.s, 3) : null)), [100, 100]),
      r: T(D.map((d) => (d ? rnd(d.r, 3) : null)), 0), sk: T(D.map((d) => (d ? rnd(d.sk, 3) : null)), 0), sa: { a: 0, k: 0 } };
  }

  /* ---------------- (a) rekam ---------------- */
  function resolveSource(src, o) {
    if (typeof src === "function") return src;
    if (src && src.state && src.name) { // instance
      const api = Object.values(MGP).find((m) => m && m.spec && m.name === src.name);
      if (api) { o.width = o.width || src.W; o.height = o.height || src.H; if (o.duration == null) o.duration = src.duration; return (g, t) => { const tt = src.opts && src.opts.loop ? ((t % src.duration) + src.duration) % src.duration : t; api.spec.render(g, tt, src.state); }; }
    }
    if (src && src.render && src.size) { const mo = o.modul || {}; o.width = o.width || mo.width || src.size[0]; o.height = o.height || mo.height || src.size[1]; if (o.duration == null) o.duration = src.duration(Object.assign({}, src.defaults, mo)); return (g, t) => src.render(g, t, mo); }
    if (src && typeof src.drawRec === "function") return (g, t) => src.drawRec(g, t);
    throw new Error("MGP.lottie.rekam: source must be draw(ctx, t), a module api or a module instance");
  }
  function Notes() { const m = new Map(); const f = (s) => m.set(s, (m.get(s) || 0) + 1); f.list = () => [...m.entries()].map(([k, v]) => ({ hal: k, kali: v })); return f; }
  function rekam(src, opts = {}) {
    const o = Object.assign({ fps: 30, from: 0, presisi: 2, interpolasi: "linear", toleransi: 0.05 }, opts);
    const draw = resolveSource(src, o);
    if (!o.width || !o.height) throw new Error("MGP.lottie.rekam: width/height needed");
    if (!(o.duration > 0)) throw new Error("MGP.lottie.rekam: duration needed");
    const note = Notes(), N = Math.max(1, Math.round(o.duration * o.fps)), frames = [];
    let identical = 0, prevSig = null;
    for (let f = 0; f < N; f++) {
      const ctx = RecCtx(o.width, o.height, note);
      ctx.save(); draw(ctx, o.from + f / o.fps); ctx.restore();
      const recs = ctx.__records.slice();
      const sig = recs.length + ":" + hashStr(JSON.stringify(recs.map((r) => [r.k, r.mode, r.text, r.subs && r.subs.map((s) => s.v.length), r.m, r.alpha])));
      if (sig === prevSig) identical++; prevSig = sig;
      frames.push(recs);
    }
    return finish(frames, o, note, identical);
  }
  function finish(frames, o, note, identical) {
    const N = frames.length;
    const B = build(frames, o, note, o.slot === "urutan") || build(frames, o, note, true);
    const data = { v: "5.7.4", fr: o.fps, ip: 0, op: N, w: Math.round(o.width), h: Math.round(o.height), nm: o.name || o.nama || "MGP record", ddd: 0, assets: B.assets, layers: B.layers, markers: [],
      meta: { g: "MGP.lottie.record 1.0" } };
    if (B.fonts.length) data.fonts = { list: B.fonts };
    linkFonts(B.fonts);
    const laporan = { frame: N, rekamanPerFrame: frames.map((x) => x.length), frameSama: identical, lapisan: B.layers.length, slot: B.stats.slots, modeSlot: B.stats.slotMode, jalurGeser: B.stats.movedPaths, keyframe: B.stats.keyframes, aset: B.assets.length,
      font: B.fonts.map((x) => x.fFamily + " " + x.fStyle), tidakDidukung: note.list() };
    return { data, report: laporan, laporan, json: (sp) => JSON.stringify(data, null, sp) };
  }

  /* ---------------- (a2) whole page: mirror every 2D canvas while seeking ---------------- */
  function xfRec(r, m, k) {
    const P = (q) => ap(m, q[0], q[1]), PS = (S) => ({ c: S.c, v: S.v.map(P), i: S.i.map(P), o: S.o.map(P) }), s = msc(m);
    const out = Object.assign({}, r, { alpha: r.alpha * k, clip: r.clip ? r.clip.map((c) => c.map(PS)) : null });
    if (r.k === "path") {
      out.subs = r.subs.map(PS);
      const st = r.sty;
      if (st.type !== "solid") { const c = P(st.s); out.sty = Object.assign({}, st, { s: c, e: st.type === "rad" ? [c[0] + Math.hypot(st.e[0] - st.s[0], st.e[1] - st.s[1]) * s, c[1]] : P(st.e) }); }
      if (r.w != null) out.w = r.w * s;
      if (r.dash) { out.dash = r.dash.map((x) => x * s); out.dashOff = r.dashOff * s; }
    } else out.m = mul(m, r.m);
    return out;
  }
  let HOOK = null;
  function hookCanvas(note) {
    if (HOOK) { HOOK.note = note; return HOOK; }
    const P2 = root.CanvasRenderingContext2D && root.CanvasRenderingContext2D.prototype;
    if (!P2) throw new Error("MGP.lottie: no CanvasRenderingContext2D");
    const H = { note, map: new WeakMap(), list: [], off: true };
    const SKIP = { measureText: 1, getTransform: 1, getLineDash: 1, isPointInPath: 1, isPointInStroke: 1, getContextAttributes: 1, createImageData: 1, getImageData: 1, isContextLost: 1, drawFocusIfNeeded: 1 };
    const COPY = ["fillStyle", "strokeStyle", "globalAlpha", "lineWidth", "lineCap", "lineJoin", "miterLimit", "font", "textAlign", "textBaseline", "globalCompositeOperation"];
    const PROPS = COPY.concat(["lineDashOffset", "letterSpacing", "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY", "filter"]);
    const recOf = (g) => {
      let R = H.map.get(g);
      if (!R) {
        R = RecCtx(g.canvas.width, g.canvas.height, (x) => H.note(x)); H.map.set(g, R); H.list.push({ g, R });
        for (const k of COPY) { const v = g[k]; if (typeof v !== "object") try { R[k] = v; } catch (e) { /* ignore */ } }
        const T = g.getTransform(); R.setTransform(T.a, T.b, T.c, T.d, T.e, T.f);
      }
      return R;
    };
    H.recOf = recOf;
    for (const name of Object.getOwnPropertyNames(P2)) {
      const d = Object.getOwnPropertyDescriptor(P2, name);
      if (d.value && typeof d.value === "function" && name !== "constructor") {
        const orig = d.value;
        P2[name] = function (...a) {
          let rr;
          if (!SKIP[name] && !H.off) { H.off = true; try { const R = recOf(this); rr = R[name](...a.map((x) => (x && x.__rec ? x.__rec : x))); } catch (e) { /* the recorder never breaks drawing */ } finally { H.off = false; } }
          const res = orig.apply(this, a);
          if (res && rr && /^create.*Gradient$|^createPattern$/.test(name)) res.__rec = rr;
          return res;
        };
      } else if (d.set && PROPS.includes(name)) {
        Object.defineProperty(P2, name, { configurable: true, enumerable: d.enumerable, get: d.get,
          set(v) { if (!H.off) { H.off = true; try { recOf(this)[name] = v && v.__rec ? v.__rec : v; } catch (e) { /* ignore */ } finally { H.off = false; } } d.set.call(this, v); } });
      }
    }
    const G = root.CanvasGradient && root.CanvasGradient.prototype;
    if (G) { const add = G.addColorStop; G.addColorStop = function (o, c) { if (this.__rec) this.__rec.addColorStop(o, c); return add.call(this, o, c); }; }
    return (HOOK = H);
  }
  /**
   * Record the whole page (every visible 2D canvas under root) while seeking. Async.
   * opts: root (element/selector, default [data-composition-id] or body), fps 30, duration (default window.__duration),
   *       seek (t) => void|Promise (default window.__rekam.seek or window.__seek), plus the rekam() options.
   * The hook sits on the 2D context prototype, so contexts created earlier are mirrored too (state synced on first use).
   * Canvas placement (CSS box, scale) and element opacity are applied; canvases stack in document order.
   */
  async function rekamHalaman(opts = {}) {
    const o = Object.assign({ fps: 30, from: 0, presisi: 2, interpolasi: "linear", toleransi: 0.05 }, opts), note = Notes();
    const rootEl = typeof o.root === "string" ? document.querySelector(o.root) : o.root || document.querySelector("[data-composition-id]") || document.body;
    const rt = root.__mgpRuntime || root.__rekam;
    const seek = o.seek || (rt && rt.seek ? (t) => rt.seek(t) : root.__seek);
    const D = o.duration || root.__duration;
    if (!seek || !(D > 0)) throw new Error("MGP.lottie.rekamHalaman: page needs window.__seek and window.__duration (or opts.seek/duration)");
    const H = hookCanvas(note);
    const rr = rootEl.getBoundingClientRect();
    o.width = o.width || Math.round(rr.width); o.height = o.height || Math.round(rr.height);
    const N = Math.max(1, Math.round(D * o.fps)), frames = [];
    let identical = 0, prev = null;
    for (let f = 0; f < N; f++) {
      H.off = false;
      try { await seek(o.from + f / o.fps); } finally { H.off = true; }
      const recs = [];
      for (const cv of rootEl.querySelectorAll("canvas")) {
        const ent = H.list.find((x) => x.g.canvas === cv);
        if (!ent || !cv.getClientRects().length) continue;
        const r = cv.getBoundingClientRect(), m = [r.width / cv.width, 0, 0, r.height / cv.height, r.left - rr.left, r.top - rr.top];
        let a = 1;
        for (let e = cv; e && e.nodeType === 1; e = e.parentNode) { const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none") a = 0; a *= parseFloat(cs.opacity); if (e === rootEl) break; }
        if (a <= 0) continue;
        for (const x of ent.R.__records) recs.push(xfRec(x, m, a));
      }
      const sig = recs.length + ":" + hashStr(JSON.stringify(recs.map((r) => [r.k, r.text, r.subs && r.subs.map((q) => q.v[0]), r.m, r.alpha])));
      if (sig === prev) identical++;
      prev = sig;
      frames.push(recs);
    }
    const res = finish(frames, o, note, identical);
    res.laporan.kanvas = rootEl.querySelectorAll("canvas").length;
    // the root's CSS background (seen between canvases) becomes a solid layer at the bottom
    const bg = parseColor(getComputedStyle(rootEl).backgroundColor);
    if (bg && bg[3] > 0) {
      const hex = "#" + bg.slice(0, 3).map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
      res.data.layers.push({ ddd: 0, ind: res.data.layers.length + 1, ty: 1, nm: "latar root", sr: 1, ao: 0, ip: 0, op: N, st: 0, bm: 0, sc: hex, sw: o.width, sh: o.height,
        ks: Object.assign(staticKs(), { o: { a: 0, k: rnd(bg[3] * 100, 2) } }) });
      res.laporan.lapisan++;
    }
    return res;
  }

  /* ---------------- (b) DOM / SVG + timeline ---------------- */
  const BEZ = {
    none: [0, 0, 1, 1], linear: [0, 0, 1, 1],
    "power1.in": [0.55, 0.085, 0.68, 0.53], "power1.out": [0.25, 0.46, 0.45, 0.94], "power1.inOut": [0.455, 0.03, 0.515, 0.955],
    "power2.in": [0.55, 0.055, 0.675, 0.19], "power2.out": [0.215, 0.61, 0.355, 1], "power2.inOut": [0.645, 0.045, 0.355, 1],
    "power3.in": [0.895, 0.03, 0.685, 0.22], "power3.out": [0.165, 0.84, 0.44, 1], "power3.inOut": [0.77, 0, 0.175, 1],
    "power4.in": [0.755, 0.05, 0.855, 0.06], "power4.out": [0.23, 1, 0.32, 1], "power4.inOut": [0.86, 0, 0.07, 1],
    "sine.in": [0.47, 0, 0.745, 0.715], "sine.out": [0.39, 0.575, 0.565, 1], "sine.inOut": [0.445, 0.05, 0.55, 0.95],
    "expo.in": [0.95, 0.05, 0.795, 0.035], "expo.out": [0.19, 1, 0.22, 1], "expo.inOut": [1, 0, 0, 1],
    "circ.in": [0.6, 0.04, 0.98, 0.335], "circ.out": [0.075, 0.82, 0.165, 1], "circ.inOut": [0.785, 0.135, 0.15, 0.86],
    "back.in": [0.6, -0.28, 0.735, 0.045], "back.out": [0.175, 0.885, 0.32, 1.275], "back.inOut": [0.68, -0.55, 0.265, 1.55],
  };
  const ALIAS = { quad: "power1", cubic: "power2", quart: "power3", quint: "power4", strong: "power4" };
  /** GSAP ease name -> [x1,y1,x2,y2] or null */
  function easeBezier(e) {
    if (e == null) e = "power1.out";
    if (typeof e === "function") return null;
    e = String(e).trim();
    if (/^cubic-bezier\(/.test(e)) { const n = e.match(/-?[\d.]+/g).map(Number); return n.length === 4 ? n : null; }
    let [name, type] = e.split("."); name = name.replace(/\(.*$/, ""); name = ALIAS[name.toLowerCase()] || name;
    if (/^(easeIn|easeOut|easeInOut)$/.test(type || "")) type = { easeIn: "in", easeOut: "out", easeInOut: "inOut" }[type];
    if (name === "none" || name === "linear" || name === "Linear") return BEZ.none;
    const k = name.toLowerCase() + "." + (type || "out");
    if (/\(/.test(e) && name === "back") return null; // custom overshoot
    return BEZ[k] || null;
  }
  /** fit cubic-bezier handles to an ease function (max-error coordinate search from a start guess) */
  const FIT = new Map();
  function fitBezier(fn, start, key) {
    if (key && FIT.has(key)) return FIT.get(key);
    const be = LT.lib && LT.lib.bezEase; if (!be) return start;
    const U = Array.from({ length: 41 }, (_, i) => i / 40), T = U.map(fn);
    const err = (q) => { const f = be(q[0], q[1], q[2], q[3]); let m = 0; for (let i = 0; i < U.length; i++) m = Math.max(m, Math.abs(f(U[i]) - T[i])); return m; };
    let q = (start || [0.33, 0, 0.67, 1]).slice(), best = err(q);
    for (let step = 0.2; step > 0.0005; step /= 2) {
      let moved = true;
      while (moved) { moved = false;
        for (let k = 0; k < 4; k++) for (const dlt of [step, -step]) {
          const c = q.slice(); c[k] += dlt; if (k % 2 === 0) c[k] = Math.min(1, Math.max(0, c[k]));
          const e = err(c); if (e < best - 1e-7) { best = e; q = c; moved = true; }
        } }
    }
    const out = q.map((v) => Math.round(v * 1e4) / 1e4); out.err = best;
    if (key) FIT.set(key, out);
    return out;
  }
  function gsapSegments(tl, el) {
    if (!tl || !tl.getChildren) return [];
    const out = [];
    const offsetOf = (a) => { let t = a.startTime(), p = a.parent; while (p && p !== tl && p.parent) { t = p.startTime() + t / (p.timeScale ? p.timeScale() : 1); p = p.parent; } return t; };
    for (const tw of tl.getChildren(true, true, false)) {
      const targets = tw.targets ? tw.targets() : [];
      if (!targets.some((x) => x === el || (x && x.contains && x.contains(el)))) continue;
      const s = offsetOf(tw), d = tw.duration() * (tw.repeat && tw.repeat() > 0 ? tw.repeat() + 1 : 1);
      const ease = tw.vars && tw.vars.ease;
      const en = ease === undefined ? (root.gsap && root.gsap.defaults && root.gsap.defaults().ease) || "power1.out" : ease;
      let bez = tw.repeat && tw.repeat() ? null : easeBezier(en);
      // refine the table handles against GSAP's real curve (tables are only approximate: up to 19% off for circ)
      if (bez && root.gsap && root.gsap.parseEase && typeof en === "string" && en !== "none" && en !== "linear") { const fn = root.gsap.parseEase(en); if (fn) { const q = fitBezier(fn, bez, en); if (q.err < 0.02) bez = q; } }
      out.push({ a: s, b: s + d, bez, own: targets.includes(el) });
    }
    return out;
  }
  function parseSvgPath(d) {
    const P = new PathRec(), toks = String(d).match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) || [];
    let i = 0, cmd = "", cx = 0, cy = 0, sx = 0, sy = 0, lc = null, lq = null;
    const n = () => +toks[i++], isNum = () => i < toks.length && !/[a-zA-Z]/.test(toks[i]);
    const m = I();
    while (i < toks.length) {
      if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? cx : 0, oy = rel ? cy : 0;
      if (C === "M") { cx = n() + ox; cy = n() + oy; P.move([cx, cy]); sx = cx; sy = cy; cmd = rel ? "l" : "L"; lc = lq = null; }
      else if (C === "L") { cx = n() + ox; cy = n() + oy; P.line([cx, cy]); lc = lq = null; }
      else if (C === "H") { cx = n() + ox; P.line([cx, cy]); lc = lq = null; }
      else if (C === "V") { cy = n() + (rel ? cy : 0); P.line([cx, cy]); lc = lq = null; }
      else if (C === "C" || C === "S") {
        let a; if (C === "C") a = [n() + ox, n() + oy]; else a = lc ? [2 * cx - lc[0], 2 * cy - lc[1]] : [cx, cy];
        const b = [n() + ox, n() + oy], e = [n() + ox, n() + oy]; P.cubic(a, b, e); lc = b; lq = null; cx = e[0]; cy = e[1];
      } else if (C === "Q" || C === "T") {
        const q = C === "Q" ? [n() + ox, n() + oy] : lq ? [2 * cx - lq[0], 2 * cy - lq[1]] : [cx, cy], e = [n() + ox, n() + oy];
        P.cubic([cx + 2 / 3 * (q[0] - cx), cy + 2 / 3 * (q[1] - cy)], [e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1])], e); lq = q; lc = null; cx = e[0]; cy = e[1];
      } else if (C === "A") {
        let rx = Math.abs(n()), ry = Math.abs(n()); const phi = n() * RAD, fa = n(), fs = n(), x = n() + ox, y = n() + oy;
        if (!rx || !ry) { P.line([x, y]); } else {
          const c = Math.cos(phi), s = Math.sin(phi), dx = (cx - x) / 2, dy = (cy - y) / 2, x1 = c * dx + s * dy, y1 = -s * dx + c * dy;
          const lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
          const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
          const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / (den || 1))), cxp = k * rx * y1 / ry, cyp = -k * ry * x1 / rx;
          const ccx = c * cxp - s * cyp + (cx + x) / 2, ccy = s * cxp + c * cyp + (cy + y) / 2;
          const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
          const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry); let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
          if (!fs && dt > 0) dt -= 2 * Math.PI; if (fs && dt < 0) dt += 2 * Math.PI;
          arcTo(P, m, ccx, ccy, rx, ry, phi, t1, t1 + dt, dt < 0, true);
        }
        cx = x; cy = y; lc = lq = null;
      } else if (C === "Z") { P.close(); cx = sx; cy = sy; lc = lq = null; }
      else { i++; }
      if (C !== "Z" && !isNum() && i < toks.length && !/[a-zA-Z]/.test(toks[i])) i++;
    }
    return P.done();
  }
  function elemGeometry(el) {
    const tag = el.tagName.toLowerCase(), A = (k) => parseFloat(el.getAttribute(k)) || 0;
    if (tag === "rect") { const w = A("width"), h = A("height"), x = A("x"), y = A("y"); return { ty: "rc", p: [x + w / 2, y + h / 2], s: [w, h], r: Math.max(A("rx"), A("ry")) }; }
    if (tag === "circle") return { ty: "el", p: [A("cx"), A("cy")], s: [A("r") * 2, A("r") * 2] };
    if (tag === "ellipse") return { ty: "el", p: [A("cx"), A("cy")], s: [A("rx") * 2, A("ry") * 2] };
    if (tag === "line") return { ty: "sh", subs: [{ v: [[A("x1"), A("y1")], [A("x2"), A("y2")]], i: [[A("x1"), A("y1")], [A("x2"), A("y2")]], o: [[A("x1"), A("y1")], [A("x2"), A("y2")]], c: false }] };
    if (tag === "polyline" || tag === "polygon") { const n = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number), pts = []; for (let k = 0; k + 1 < n.length; k += 2) pts.push([n[k], n[k + 1]]); return { ty: "sh", subs: [{ v: pts, i: pts, o: pts, c: tag === "polygon" }] }; }
    if (tag === "path") return { ty: "sh", subs: parseSvgPath(el.getAttribute("d") || "") };
    return null;
  }
  function htmlMatrix(el, rootEl) {
    let m = I(), e = el;
    const chain = [];
    while (e && e !== rootEl && e.nodeType === 1) { chain.push(e); e = e.offsetParent; if (e && !rootEl.contains(e) && e !== rootEl) break; }
    for (const x of chain) {
      const cs = getComputedStyle(x); let t = I();
      if (cs.transform && cs.transform !== "none") { const D = new DOMMatrix(cs.transform), og = cs.transformOrigin.split(" ").map(parseFloat); t = mul([1, 0, 0, 1, og[0], og[1]], mul([D.a, D.b, D.c, D.d, D.e, D.f], [1, 0, 0, 1, -og[0], -og[1]])); }
      m = mul(mul([1, 0, 0, 1, x.offsetLeft, x.offsetTop], t), m);
    }
    return m;
  }
  function chainOpacity(el, rootEl) { let a = 1; for (let e = el; e && e.nodeType === 1; e = e.parentNode) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return 0; a *= parseFloat(cs.opacity); if (e === rootEl) break; } return a; }

  function dariDOM(rootEl, opts = {}) {
    if (typeof rootEl === "string") rootEl = document.querySelector(rootEl);
    const o = Object.assign({ fps: 30, toleransi: 0.6, presisi: 2 }, opts), note = Notes();
    const tl = o.timeline || null;
    const seek = o.seek || (tl ? (t) => { if (tl.seek) tl.seek(t, false); else if (tl.time) tl.time(t); } : root.__seek ? (t) => root.__seek(t) : null);
    if (!seek) throw new Error("MGP.lottie.dariDOM: give timeline or seek");
    const D = o.duration || (tl && (tl.duration ? (typeof tl.duration === "function" ? tl.duration() : tl.duration) : 0)) || root.__duration;
    if (!(D > 0)) throw new Error("MGP.lottie.dariDOM: duration needed");
    const rr = rootEl.getBoundingClientRect(), W = o.width || Math.round(rr.width), H = o.height || Math.round(rr.height), N = Math.max(1, Math.round(D * o.fps));
    if (tl && !tl.getChildren) note("timeline without GSAP introspection: sampled keyframes only");
    // elements
    const items = [];
    const walk = (el) => {
      for (const c of el.children) {
        const tag = c.tagName.toLowerCase();
        if (/^(script|style|defs|clippath|mask|lineargradient|radialgradient|pattern|symbol|metadata|title|desc)$/.test(tag)) continue;
        if (c instanceof SVGElement) {
          if (tag === "text") items.push({ el: c, kind: "svgtext" });
          else if (elemGeometry(c)) items.push({ el: c, kind: "svg" });
          else if (tag === "use" || tag === "image" || tag === "foreignobject") note("svg <" + tag + "> skipped");
          walk(c);
        } else {
          const cs = getComputedStyle(c), bg = parseColor(cs.backgroundColor);
          if (bg && bg[3] > 0) items.push({ el: c, kind: "box" });
          if (cs.backgroundImage && cs.backgroundImage !== "none") note("CSS background-image skipped");
          if (cs.clipPath && cs.clipPath !== "none") note("CSS clip-path skipped (element drawn unclipped)");
          if (cs.boxShadow && cs.boxShadow !== "none") note("CSS box-shadow skipped");
          try { if (c.getAnimations && c.getAnimations().length) note("CSS animation/transition skipped (not driven by the timeline)"); } catch (e) { /* abaikan */ }
          if ([...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) items.push({ el: c, kind: "text" });
          if (tag === "img" || tag === "canvas" || tag === "video") note("<" + tag + "> skipped (use rekam for canvases)");
          walk(c);
        }
      }
    };
    if (!(rootEl instanceof SVGElement)) { const bg = parseColor(getComputedStyle(rootEl).backgroundColor); if (bg && bg[3] > 0) items.push({ el: rootEl, kind: "box", root: true }); }
    walk(rootEl);
    const rootSvgOffset = () => { const r = rootEl.getBoundingClientRect(); return [1, 0, 0, 1, -r.left, -r.top]; };
    const matOf = (it) => {
      if (it.el instanceof SVGGraphicsElement) { const c = it.el.getScreenCTM(); return c ? mul(rootSvgOffset(), [c.a, c.b, c.c, c.d, c.e, c.f]) : I(); }
      return it.root ? I() : htmlMatrix(it.el, rootEl);
    };
    const sampleAt = (t) => {
      seek(t);
      return items.map((it) => {
        const cs = getComputedStyle(it.el), m = matOf(it), a = chainOpacity(it.el, rootEl);
        if (it.kind === "box") return { m, a, fill: parseColor(cs.backgroundColor) };
        if (it.kind === "svg") return { m, a, fill: cs.fill === "none" ? null : parseColor(cs.fill), fo: parseFloat(cs.fillOpacity), stroke: cs.stroke === "none" ? null : parseColor(cs.stroke), so: parseFloat(cs.strokeOpacity), sw: parseFloat(cs.strokeWidth) || 0 };
        return { m, a, fill: parseColor(it.kind === "svgtext" ? cs.fill : cs.color), text: it.el.textContent };
      });
    };
    const S = []; for (let f = 0; f < N; f++) S.push(sampleAt(f / o.fps));
    // static description at t = 0
    seek(0);
    const layers = [], fonts = new Map(), dbg = []; let keyCount = 0, eased = 0, sampled = 0;
    const p = o.presisi;
    items.forEach((it, idx) => {
      const el = it.el, cs = getComputedStyle(el);
      const segs = gsapSegments(tl, el);
      // anchor = transform origin (HTML) or bbox centre (SVG), so position moves linearly when the element also rotates/scales
      let A0 = [0, 0];
      if (it.root) A0 = [0, 0];
      else if (el instanceof SVGGraphicsElement) { try { const bb = el.getBBox(); A0 = [bb.x + bb.width / 2, bb.y + bb.height / 2]; } catch (e) { /* not rendered */ } }
      else { const og = cs.transformOrigin.split(" ").map(parseFloat); if (og.length >= 2 && og.every(isFinite)) A0 = og.slice(0, 2); }
      const Ds = S.map((fr) => { const d = decompose(fr[idx].m); d.p = ap(fr[idx].m, A0[0], A0[1]); return d; }); unwrapRot(Ds);
      const L = { ddd: 0, ind: idx + 1, sr: 1, ao: 0, ip: 0, op: N, st: 0, bm: 0, nm: (el.id ? "#" + el.id : el.tagName.toLowerCase()) + " " + (idx + 1) };
      // eased keyframe fitting per channel
      const fit = (vals, isAngle) => {
        const own = segs.filter((s) => s.own).sort((a, b) => a.a - b.a);
        const keyAt = [], usable = [];
        for (const s of own) {
          const fa = s.a * o.fps, fb = s.b * o.fps;
          if (!s.bez || fb - fa < 1 || usable.some((u) => !(fb <= u.fa || fa >= u.fb))) continue;
          // exact values at the tween ends
          const va = vals.sampleT(s.a), vb = vals.sampleT(s.b), [x1, y1, x2, y2] = s.bez, ez = LT.lib ? LT.lib.bezEase(x1, y1, x2, y2) : null;
          if (!ez) continue;
          let ok = true;
          // tolerance: toleransi (px / %) or 1.5% of the segment range (fitted bezier vs the real GSAP curve)
          for (let f = Math.ceil(fa); f <= Math.min(N - 1, Math.floor(fb)) && ok; f++) { const u = (f - fa) / (fb - fa), e = ez(u), V = [].concat(vals.at[f]), A = [].concat(va), B = [].concat(vb); ok = V.every((x, d) => Math.abs(A[d] + (B[d] - A[d]) * e - x) <= Math.max(o.toleransi, Math.abs(B[d] - A[d]) * 0.015)); }
          if (ok) usable.push({ fa, fb, va, vb, bez: s.bez });
          if (o.debug) dbg.push([idx, s.a, s.b, String(s.bez), ok, JSON.stringify(va), JSON.stringify(vb)].join(" "));
        }
        if (!usable.length) { sampled++; const t = track(vals.at.map((v) => v), { linear: true, eps: o.toleransi * 0.25 }); keyCount += countKeys(t); return t; }
        eased += usable.length;
        // build keys: eased segments + linear samples in between (simplified)
        const K = [];
        let f = 0;
        usable.sort((a, b) => a.fa - b.fa);
        for (const u of usable) {
          for (; f < u.fa; f++) K.push({ t: f, s: vals.at[f] });
          K.push({ t: rnd(u.fa, 4), s: u.va, bez: u.bez });
          f = Math.floor(u.fb) + 1;
          K.push({ t: rnd(u.fb, 4), s: u.vb });
        }
        for (; f < N; f++) K.push({ t: f, s: vals.at[f] });
        // drop linear keys that add nothing
        const out = [];
        for (let k = 0; k < K.length; k++) {
          const a = out[out.length - 1], b = K[k], c = K[k + 1];
          if (a && c && !a.bez && !b.bez && c && same([].concat(a.s), [].concat(b.s)) && same([].concat(b.s), [].concat(c.s))) continue;
          out.push(b);
        }
        const keys = out.map((k, j) => {
          const kk = { t: k.t, s: [].concat(rv(k.s, p)) };
          if (j < out.length - 1) { const z = k.bez || [0, 0, 1, 1]; kk.o = { x: [z[0]], y: [z[1]] }; kk.i = { x: [z[2]], y: [z[3]] }; }
          return kk;
        });
        keyCount += keys.length;
        return keys.length > 1 ? { a: 1, k: keys } : { a: 0, k: keys.length ? keys[0].s : vals.at[0] };
      };
      const chan = (fn) => ({ at: S.map((fr, f) => fn(fr[idx], Ds[f])), sampleT: (t) => { const fr = sampleAt(t)[idx], d = decompose(fr.m); d.p = ap(fr.m, A0[0], A0[1]); return fn(fr, d); } });
      const prevSeek = () => seek(0);
      const ks = { a: { a: 0, k: rv(A0, p) }, sa: { a: 0, k: 0 } };
      ks.p = fit(chan((fr, d) => rv(d.p, p)));
      ks.s = fit(chan((fr, d) => rv(d.s, 3)));
      ks.r = fit(chan((fr, d) => rnd(d.r, 3)), true);
      ks.sk = fit(chan((fr, d) => rnd(d.sk, 3)));
      ks.o = fit(chan((fr) => rnd(fr.a * 100, 2)));
      ["r", "sk", "o"].forEach((k) => { if (ks[k].a === 1) ks[k].k.forEach((x) => (x.s = [x.s[0]])); else if (Array.isArray(ks[k].k)) ks[k].k = ks[k].k[0]; });
      prevSeek();
      L.ks = ks;
      const colTrack = (fn) => { const t = track(S.map((fr) => { const c = fn(fr[idx]); return c ? rv(c.slice(0, 3).concat(1), 4) : null; }), { def: [0, 0, 0, 1], linear: true, eps: 0.004 }); keyCount += countKeys(t); return t; };
      const alphaTrack = (fn) => { const t = track(S.map((fr) => rnd(fn(fr[idx]) * 100, 2)), { linear: true, eps: 0.2 }); keyCount += countKeys(t); return t; };
      const tr0 = { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } };
      if (it.kind === "svg" || it.kind === "box") {
        let g;
        if (it.kind === "box") { const w = el.offsetWidth, h = el.offsetHeight; g = { ty: "rc", p: [w / 2, h / 2], s: [w, h], r: parseFloat(cs.borderTopLeftRadius) || 0 }; if (cs.borderTopLeftRadius !== cs.borderBottomRightRadius) note("uneven border-radius uses top-left"); }
        else g = elemGeometry(el);
        const sh = g.ty === "sh" ? g.subs.map((s, k) => ({ ty: "sh", nm: "jalur " + (k + 1), ks: { a: 0, k: toLottiePath(s, p) } })) : [{ ty: g.ty, d: 1, p: { a: 0, k: rv(g.p, p) }, s: { a: 0, k: rv(g.s, p) }, ...(g.ty === "rc" ? { r: { a: 0, k: rnd(g.r || 0, p) } } : {}) }];
        const sty = [];
        const s0 = S[0][idx];
        if (it.kind === "svg" && s0.stroke) {
          const dash = (cs.strokeDasharray || "none") === "none" ? null : cs.strokeDasharray.split(/[\s,]+/).map(parseFloat);
          const st = { ty: "st", c: colTrack((fr) => fr.stroke), o: alphaTrack((fr) => (fr.stroke ? fr.stroke[3] * fr.so : 0)), w: { a: 0, k: s0.sw }, lc: CAP[cs.strokeLinecap] || 1, lj: JOIN[cs.strokeLinejoin] || 1, ml: parseFloat(cs.strokeMiterlimit) || 4 };
          if (dash) { st.d = dash.map((v, k) => ({ n: k % 2 ? "g" : "d", nm: k % 2 ? "gap" : "dash", v: { a: 0, k: v } })); st.d.push({ n: "o", nm: "offset", v: { a: 0, k: parseFloat(cs.strokeDashoffset) || 0 } }); if (new Set(S.map((fr) => 0)).size) note("stroke-dashoffset taken at t=0 (animated draw-on is not tracked)"); }
          sty.push(st);
        }
        if (s0.fill) sty.push({ ty: "fl", c: colTrack((fr) => fr.fill), o: alphaTrack((fr) => (fr.fill ? fr.fill[3] * (fr.fo == null || isNaN(fr.fo) ? 1 : fr.fo) : 0)), r: cs.fillRule === "evenodd" ? 2 : 1 });
        L.ty = 4; L.shapes = [{ ty: "gr", nm: "bentuk", it: sh.concat(sty, [tr0]) }];
      } else {
        const F = parseFont(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
        if (!fonts.has(F.name)) fonts.set(F.name, { fName: F.name, fFamily: F.family, fStyle: F.style, fWeight: String(F.weight), ascent: 75 });
        let ox = 0, oy = 0, j = 0;
        if (it.kind === "svgtext") { ox = parseFloat(el.getAttribute("x")) || 0; oy = parseFloat(el.getAttribute("y")) || 0; const an = cs.textAnchor; j = an === "middle" ? 2 : an === "end" ? 1 : 0; }
        else {
          const mc = document.createElement("canvas").getContext("2d"); mc.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const mm = mc.measureText("Hg");
          const asc = mm.fontBoundingBoxAscent || F.size * 0.8, des = mm.fontBoundingBoxDescent || F.size * 0.2, lh = parseFloat(cs.lineHeight) || (asc + des);
          const ta = cs.textAlign, w = el.clientWidth, pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
          // flex/grid centring (justify-content / align-items) places the text box, not text-align
          const flex = /flex|grid/.test(cs.display), jc = cs.justifyContent, ai = cs.alignItems;
          j = ta === "center" || (flex && /center/.test(jc)) ? 2 : ta === "right" || ta === "end" || (flex && /end|right/.test(jc)) ? 1 : 0; ox = j === 2 ? pl + (w - pl - pr) / 2 : j === 1 ? w - pr : pl;
          const pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0, hIn = el.clientHeight - pt - pb;
          oy = pt + (lh - (asc + des)) / 2 + asc;
          if (flex && /center/.test(ai) && hIn > lh) oy += (hIn - lh) / 2;
          else if (flex && /end/.test(ai) && hIn > lh) oy += hIn - lh;
          if (el.getClientRects().length > 1 || el.scrollHeight > lh * 1.5) note("multi-line HTML text kept on one line");
        }
        const docs = S.map((fr) => ({ s: rnd(F.size, 2), f: F.name, t: (fr[idx].text || "").replace(/\s+/g, " ").trim(), j, tr: 0, lh: rnd(F.size * 1.2, 2), ls: 0, fc: rv((fr[idx].fill || [0, 0, 0]).slice(0, 3), 4) }));
        const dk = track(docs, {}); keyCount += countKeys(dk);
        L.ty = 5; L.t = { d: dk.a === 1 ? { k: dk.k.map((k) => ({ s: k.s[0], t: k.t })) } : { k: [{ s: dk.k, t: 0 }] }, p: {}, m: { g: 1, a: { a: 0, k: [0, 0] } }, a: [] };
        // text origin offset inside the element: anchor = -offset so element matrix applies unchanged
        L.ks.a = { a: 0, k: rv([A0[0] - ox, A0[1] - oy], p) }; // text origin sits at (ox, oy) inside the element
        if (ks.s.a === 1 || ks.r.a === 1) { /* anchor offset is exact under scale/rotation since anchor applies before them */ }
      }
      layers.push(L);
    });
    layers.reverse();
    const data = { v: "5.7.4", fr: o.fps, ip: 0, op: N, w: W, h: H, nm: o.name || o.nama || "MGP fromDOM", ddd: 0, assets: [], layers, markers: [], meta: { g: "MGP.lottie.fromDOM 1.0" } };
    if (fonts.size) { data.fonts = { list: [...fonts.values()] }; linkFonts(data.fonts.list); }
    const laporan = { frame: N, elemen: items.length, lapisan: layers.length, keyframe: keyCount, segmenEase: eased, kanalSampel: sampled, tidakDidukung: note.list() };
    if (o.debug) laporan.debug = dbg;
    return { data, report: laporan, laporan, json: (sp) => JSON.stringify(data, null, sp) };
  }

  // English names (v2.4): record, recordPage, fromDOM; old names rekam, rekamHalaman, dariDOM stay
  Object.assign(LT, { __record: "1.0.0", __rekam: "1.0.0", record: rekam, recordPage: rekamHalaman, fromDOM: dariDOM, rekam, rekamHalaman, dariDOM, lib: Object.assign(LT.lib || {}, { RecCtx, decompose, easeBezier, parseSvgPath, track }) });
})(typeof globalThis !== "undefined" ? globalThis : this);
