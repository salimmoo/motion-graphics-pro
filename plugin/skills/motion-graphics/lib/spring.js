/**
 * MGP.spring \u2014 springs, overshoot / bounce, follow-through and the classic animation principles.
 *
 * Extracted from the website demos `pegas(el)` (graph editor + preview of an overshoot / bounce expression,
 * port of motion-graphics scripts/spring.py (old pegas.py)) and `prinsip(el)` (animation principles, before / after panels)
 * in guide/js/demos-skills.js. Chips and sliders became options; everything is drawn from t alone.
 *
 * Two layers:
 *  (a) MGP.spring.fn \u2014 pure, deterministic helpers usable by any module (kinetic type, characters, UI):
 *      bez(x1,y1,x2,y2) -> (x)=>y        cubic-bezier easing (CSS / After Effects style), y may leave 0..1
 *      EASES {easy,inout,outexpo,back,lin}  named easings used by the graph editor ({n, f, h})
 *      spring(t, {freq=2, damping=0.35, from=0, to=1, v0=0}) closed-form damped spring (under/critical/over-damped)
 *      springVel(t, opts)                 its velocity
 *      bounceExpr(t, amp, freq, decay)    After Effects bounce expression amp*sin(t*freq*2pi)/exp(t*decay)
 *      keyOvershoot(t, {delay=0, key=0.5, ease="easy", amp=15, freq=3, decay=5, unit=100}) -> 0..1(+overshoot)
 *                                         ease to the last key, then the bounce expression (pegas valAt, seconds)
 *      settleTime(amp, decay, tol=0.5)    seconds until the bounce stays inside +-tol units
 *      timingName(frames)                 "tajam (2-4 f)" ... "dramatis (40 f+)"
 *      springTab(drive, freq, zeta, T, n=480, cycles=5) -> (p)=>x   periodic spring response to a periodic drive
 *      follower(parent, {freq=1.5, damping=0.35, gain=1, dt=1/240, t0=0}) -> (t)=>x
 *                                         spring that follows parent(t); fixed-step simulation from t0, cached per step
 *      chain(parent, n, {freq, damping, lag, falloff}) -> (t)=>[x0..x(n-1)]   overlapping action: each link follows
 *                                         the previous one (springs), or pure delay when lag>0 and freq==null
 *      lag(parent, t, i, lagSec=2.5/24)   parent(t - i*lag)  (valueAtTime(time - lag))
 *      squash(sy, k=0.5) -> sx            the demo rule x = 100 + (100 - y) * k (percent)
 *      preserve(s) -> [sx, sy]            area preserving stretch: sy = s, sx = 1/s
 *      bounceBall(u, {squash=30, stretch=24, contact=0.07}) -> {h, sx, sy}  one bounce cycle (u 0..1)
 *      anticipate(f, {windup=10, hold=2, action=18, settle=10, back=0.16, squat=0.16, lean=9, stretch=0.24})
 *                                         -> {x, sx, sy, lean, phase}  frame-based wind-up / action / settle (24 fps)
 *      antOver(a=0.1, o=0.1) -> easing    bezier easing with anticipation a and overshoot o
 *  (b) MGP.spring.create(canvasOrEl, opts) \u2014 canvas module rendering the two demos.
 *
 * Options (create / render):
 *   mode       "pegas" | "prinsip"                                 default "pegas"
 *   width,height                                                    default 1280 x 720
 *   duration   seconds; default: pegas 2 loops of the curve, prinsip = loops x principle length (or segments)
 *   font       monospace font stack for readouts                    "ui-monospace, Menlo, Consolas, monospace"
 *   palette    {night, navy, ivory, ivory2, gold, gold2, goldd, muted, blue, ...} overrides
 *   bg         page background behind the panels                    "#070a14"
 *   tags       draw the small panel tags (Graph editor, Pratinjau, TANPA/DENGAN)   true
 *   readouts   draw numbers inside frames                            true
 *  pegas:
 *   preset     "over" (amp 15 freq 3 decay 5, skala) | "bounce" (80, 3, 8, posisi) | "free"
 *   amp, freq, decay   override the preset (amp in property units: % or px)
 *   ease       "easy" | "inout" | "outexpo" | "back" | "lin"     easing into the last key    "easy"
 *   key        frames of the key segment (24 fps)                  12
 *   prop       "skala" | "posisi"                                   from preset
 *   twos       draw on twos (12 drawings / s)                       false
 *   onion      onion skin ghosts in the preview                     true
 *   layout     "duo" | "graph" | "preview"                          "duo"
 *   loops      loops in the default duration                        2
 *  prinsip:
 *   principle  id or array of ids: squash, antisipasi, slow, arc, overlap, sekunder, smear, staging   "squash"
 *   segment    seconds per principle when principle is an array    6
 *   panels     "both" | "with" | "without"                          "both"
 *   layout     "auto" (side by side when wide) | "side" | "stack"   "auto"
 *   onion      onion skin                                           false
 *   slow       half speed                                           false
 *   loops      loops of a single principle in the default duration  3
 *
 * Methods: inst.draw(t)/seek(t), inst.timeline(), api.render(ctx, t, opts), api.fn (pure helpers),
 *          api.lib = { PRINCIPLES (ids, names, rules, loop lengths), pegasCurve(opts) -> {valAt(frame), N} }.
 *
 * Example:
 *   const s = MGP.spring.create("#stage", { mode: "pegas", preset: "bounce" }); MGP.core.expose(s);
 *   const y = MGP.spring.fn.spring(t, { freq: 2.5, damping: 0.3 });        // 0 -> 1 with overshoot
 *   const tail = MGP.spring.fn.chain((t) => Math.sin(t * 3), 5, { freq: 1.45, damping: 0.33 });
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const { clamp, lerp, mix, rgba } = C;
  const inout3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeIO = (t) => (t = clamp(t), t * t * (3 - 2 * t));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const fmt = (v, d = 2) => (+v).toFixed(d).replace(".", ",");

  /* ======================= (a) pure helpers ======================= */
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x; for (let i = 0; i < 10; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-7 || Math.abs(d) < 1e-7) break; t -= e / d; }
      if (Math.abs(X(t) - x) > 1e-4) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 40; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
      return Y(clamp(t));
    };
  }
  const EASES = {
    easy: { n: "Easy Ease", f: bez(1 / 3, 0, 2 / 3, 1), h: [1 / 3, 0, 2 / 3, 1] },
    inout: { n: "In-out", f: inout3, h: [0.65, 0, 0.35, 1] },
    outexpo: { n: "Out expo", f: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) },
    back: { n: "Back 1,4", f: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) },
    lin: { n: "Linear", f: (t) => t },
  };
  // closed-form damped harmonic oscillator x'' = -w^2 (x - to) - 2 z w x', x(0) = from, x'(0) = v0
  function springState(t, o = {}) {
    const f = o.freq == null ? 2 : o.freq, z = o.damping == null ? 0.35 : o.damping, from = o.from || 0, to = o.to == null ? 1 : o.to, v0 = o.v0 || 0;
    if (t <= 0) return [from, v0];
    const w = TAU * f, x0 = from - to;
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * t), A = x0, B = (v0 + z * w * x0) / wd, c = Math.cos(wd * t), s = Math.sin(wd * t);
      return [to + e * (A * c + B * s), e * (-z * w * (A * c + B * s) + (-A * wd * s + B * wd * c))];
    }
    if (z === 1) { const e = Math.exp(-w * t), B = v0 + w * x0; return [to + e * (x0 + B * t), e * (B - w * (x0 + B * t))]; }
    const r = w * Math.sqrt(z * z - 1), r1 = -z * w + r, r2 = -z * w - r, c2 = (v0 - r1 * x0) / (r2 - r1), c1 = x0 - c2;
    return [to + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t), c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t)];
  }
  const spring = (t, o) => springState(t, o)[0];
  const springVel = (t, o) => springState(t, o)[1];
  const bounceExpr = (t, amp, freq, decay) => (t <= 0 ? 0 : (amp * Math.sin(t * freq * TAU)) / Math.exp(t * decay));
  function keyOvershoot(t, o = {}) {
    const d = o.delay || 0, Dk = o.key == null ? 0.5 : o.key, e = typeof o.ease === "function" ? o.ease : (EASES[o.ease || "easy"] || EASES.easy).f;
    const amp = o.amp == null ? 15 : o.amp, freq = o.freq == null ? 3 : o.freq, decay = o.decay == null ? 5 : o.decay, unit = o.unit || 100;
    const tt = t - d; if (tt <= 0) return 0; if (tt < Dk) return e(tt / Dk);
    return 1 + bounceExpr(tt - Dk, amp, freq, decay) / unit;
  }
  const settleTime = (amp, decay, tol = 0.5) => Math.log(Math.max(1.0001, amp / tol)) / decay;
  const timingName = (f) => (f <= 4 ? "tajam (2-4 f)" : f <= 10 ? "cepat (6-8 f)" : f <= 17 ? "normal (12-15 f)" : f <= 34 ? "berat (20-30 f)" : "dramatis (40 f+)");
  // periodic response (scripts/spring.py (old pegas.py)): pre-roll several cycles, keep the last one, sample with linear interpolation
  function springTab(drive, f, z, T, n = 480, cyc = 5) {
    const w = TAU * f, dt = T / n; let x = 0, v = 0; const out = [];
    for (let i = 0; i < cyc * n; i++) { const a = -w * w * x - 2 * z * w * v + drive((i % n) / n); v += a * dt; x += v * dt; if (i >= (cyc - 1) * n) out.push(x); }
    return (p) => { const q = (((p % 1) + 1) % 1) * n, i = Math.floor(q), tt = q - i; return out[i % n] * (1 - tt) + out[(i + 1) % n] * tt; };
  }
  // spring that chases parent(t); deterministic: semi-implicit Euler with a fixed step from t0, states cached per step
  function follower(parent, o = {}) {
    const f = o.freq == null ? 1.5 : o.freq, z = o.damping == null ? 0.35 : o.damping, gain = o.gain == null ? 1 : o.gain, dt = o.dt || 1 / 240, t0 = o.t0 || 0;
    const w = TAU * f, X = [parent(t0) * gain], V = [0];
    const fn = (t) => {
      const q = (t - t0) / dt; if (q <= 0) return X[0];
      const i = Math.floor(q);
      while (X.length <= i + 1) { const k = X.length - 1, target = parent(t0 + (k + 1) * dt) * gain; const a = -w * w * (X[k] - target) - 2 * z * w * V[k]; const v = V[k] + a * dt; V.push(v); X.push(X[k] + v * dt); }
      const r = q - i; return X[i] * (1 - r) + X[i + 1] * r;
    };
    fn.reset = () => { X.length = 1; V.length = 1; };
    return fn;
  }
  function chain(parent, n, o = {}) {
    if (o.freq == null && o.lag) { const L = o.lag; return (t) => Array.from({ length: n }, (_, i) => parent(t - i * L)); }
    const links = []; let prev = parent;
    for (let i = 0; i < n; i++) { const fo = o.falloff == null ? 1 : Math.pow(o.falloff, i); const fl = follower(prev, Object.assign({}, o, { freq: (o.freq == null ? 1.5 : o.freq) * fo })); links.push(fl); prev = fl; }
    return (t) => links.map((fl) => fl(t));
  }
  const lag = (parent, t, i, L = 2.5 / 24) => parent(t - i * L);
  const squash = (sy, k = 0.5) => 100 + (100 - sy) * k;
  const preserve = (s) => [1 / Math.max(1e-6, s), s];
  function bounceBall(u, o = {}) {
    u = ((u % 1) + 1) % 1;
    const sq = o.squash == null ? 30 : o.squash, stv = o.stretch == null ? 24 : o.stretch, ct = o.contact == null ? 0.07 : o.contact, vy = 1 - 2 * u, nr = Math.min(u, 1 - u);
    const sy = nr < ct ? 100 - sq * (1 - nr / ct) : 100 + stv * vy * vy;
    return { h: 4 * u * (1 - u), sx: squash(sy, o.k), sy };
  }
  function anticipate(f, o = {}) {
    const wu = o.windup == null ? 10 : o.windup, hd = o.hold == null ? 2 : o.hold, ac = o.action == null ? 18 : o.action, se = o.settle == null ? 10 : o.settle;
    const back = o.back == null ? 0.16 : o.back, sq = o.squat == null ? 0.16 : o.squat, ln = o.lean == null ? 9 : o.lean, str = o.stretch == null ? 0.24 : o.stretch;
    const a1 = wu, a2 = wu + hd, a3 = a2 + ac, a4 = a3 + se;
    let x = 0, sx = 1, sy = 1, lean = 0, phase = "awal";
    if (f < a1) { const k = easeIO(f / a1); x = -back * k; sy = 1 - sq * k; lean = -ln * k; phase = "ancang"; }
    else if (f < a2) { x = -back; sy = 1 - sq; lean = -ln; phase = "tahan"; }
    else if (f < a3) { const k = (f - a2) / ac, e = 1 - Math.pow(2, -10 * k); x = lerp(-back, 1, e); const s = str * Math.pow(1 - k, 2.5); sx = 1 + s; sy = 1 - s * 0.5; lean = (ln * 4 / 3) * (1 - e) - 2; phase = "aksi"; }
    else if (f < a4) { const k = (f - a3) / se; x = 1 + 0.05 * Math.sin(k * Math.PI) * (1 - k); sy = 1 - 0.09 * Math.sin(k * Math.PI); lean = (ln * 7 / 9) * Math.sin(k * Math.PI) * (1 - k); phase = "settle"; }
    else { x = 1; phase = "selesai"; }
    sx = sx * (1 + (1 - sy) * 0.5);
    return { x, sx, sy, lean, phase, frames: [a1, a2, a3, a4] };
  }
  const antOver = (a = 0.1, o = 0.1) => bez(0.36, -a * 3, 0.64, 1 + o * 3);
  // v2.4: preset pegas bersama (massa/kekakuan/redaman -> zeta), sama dengan MGP.core.PEGAS dan ease Gerak "pegas.<nama>"
  /** {freq, damping} untuk spring()/springState() dari nama preset ("memantul" | "sigap" | "berat") atau {massa, kekakuan, redaman} */
  const preset = (p) => { const I = C.pegasInfo(p); return { freq: I.frekuensi, damping: I.zeta }; };
  /** bola memantul dengan volume tetap (sx * sy = 1); sama dengan bounceBall tetapi sx dihitung dari sy */
  const bounceBallVolume = (u, o) => { const b = bounceBall(u, o), r = C.regang(b.sy / 100); return { h: b.h, sx: r.sx * 100, sy: b.sy }; };
  const fn = { bez, EASES, spring, springVel, springState, bounceExpr, keyOvershoot, settleTime, timingName, springTab, follower, chain, lag, squash, preserve, bounceBall, anticipate, antOver, inout3, easeIO,
    PEGAS: C.PEGAS, preset, pegas: C.pegas, pegasKeadaan: C.pegasKeadaan, pegasEase: C.pegasEase, pegasDurasi: C.pegasDurasi, pegasInfo: C.pegasInfo,
    inersia: C.inersia, tunda: C.tunda, tundaRantai: C.tundaRantai, regang: C.regang, regangArah: C.regangArah, bounceBallVolume };

  /* ======================= (b) canvas module ======================= */
  const PAL = { night: "#070a14", navy: "#0e1530", ultra: "#1b2d63", ivory: "#f4ecd8", ivory2: "#e9dcbc", gold: "#d6b06a", gold2: "#f2d796", goldd: "#9c7a3c", muted: "#a79f8c",
    blue: "#8fa7d8", graphBg: "#080c1a", prevIn: "#17224a", prevOut: "#070a16", panelOff: "#0d1226", panelOn: "#141d40", panelEnd: "#070a16", eye: "#0b0f1f",
    ballHi: "#fff1c7", ballLo: "#7d5c26", others: ["#8fa7d8", "#c98a7a", "#7fb3a6", "#b39ad6"] };
  const DEF = { mode: "pegas", font: "ui-monospace, Menlo, Consolas, monospace", palette: null, bg: "#070a14", tags: true, readouts: true,
    preset: "over", amp: null, freq: null, decay: null, ease: "easy", key: 12, prop: null, twos: false, onion: null, layout: null, loops: null,
    principle: "squash", segment: 6, panels: "both", slow: false, duration: null };
  const PRE = { over: [15, 3, 5, "skala"], bounce: [80, 3, 8, "posisi"], free: [15, 3, 5, "skala"] };
  const LEAD = 8, POST = 40, TAIL = 10;

  function tagF(S) { return (g, txt, x, y, col, size = 10, align = "left") => { g.font = `500 ${size}px ${S.opts.font}`; g.textAlign = align; g.textBaseline = "alphabetic"; g.fillStyle = col || S.K.gold2; g.fillText(txt, x, y); }; }
  function pill(g, S, txt, x, y, right) {
    g.font = `600 11px ${S.opts.font}`; const tw = g.measureText(txt).width, w = tw + 18, h = 22, x0 = right ? x - w : x;
    g.fillStyle = "rgba(7,10,20,.72)"; g.strokeStyle = "rgba(242,215,150,.18)"; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(x0, y, w, h, 11) : g.rect(x0, y, w, h); g.fill(); g.stroke();
    g.fillStyle = S.K.ivory; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(txt, x0 + 9, y + h / 2 + 0.5); g.textBaseline = "alphabetic";
  }
  function roundClip(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.clip(); }

  /* ---------- pegas ---------- */
  function pegasCurve(o) {
    const pr = PRE[o.preset] || PRE.over;
    const st = { amp: o.amp == null ? pr[0] : o.amp, freq: o.freq == null ? pr[1] : o.freq, decay: o.decay == null ? pr[2] : o.decay, prop: o.prop || pr[3], ease: EASES[o.ease] ? o.ease : "easy", dur: o.key || 12, twos: !!o.twos };
    const UNIT = st.prop === "skala" ? 100 : 540;
    const valAt = (f) => { const t = (f - LEAD) / 24, Dk = st.dur / 24; if (t <= 0) return 0; if (t < Dk) return EASES[st.ease].f(t / Dk); const u = t - Dk; return 1 + st.amp * Math.sin(u * st.freq * TAU) / Math.exp(u * st.decay) / UNIT; };
    const N = LEAD + st.dur + POST + TAIL, curve = [];
    for (let i = 0; i <= 600; i++) curve.push(valAt(N * i / 600));
    const mn = Math.min(0, ...curve), mx = Math.max(1, ...curve), pad = (mx - mn) * 0.12;
    const peak = Math.max(...curve) - 1;
    const info = [`key ${st.dur} f = ${fmt(st.dur / 24, 2)} s \u00b7 ${timingName(st.dur)}`, `lewat target ${fmt(peak * UNIT, 1)} ${st.prop === "skala" ? "%" : "px"} \u00b7 tenang \u00b1${fmt(settleTime(st.amp, st.decay), 2)} s`];
    return { st, UNIT, valAt, N, curve, yr: [mn - pad, mx + pad], info };
  }
  function drawGraph(g, S, P, fq, x0, y0, w, h) {
    const K = S.K, tag = S.tag, { st, N, curve, yr, valAt } = P;
    g.save(); g.translate(x0, y0); roundClip(g, 0, 0, w, h, 14);
    const L = 46, R = 14, T = 34, B = 28, X = (f) => L + (w - L - R) * f / N, Y = (v) => T + (h - T - B) * (1 - (v - yr[0]) / (yr[1] - yr[0]));
    g.fillStyle = K.graphBg; g.fillRect(0, 0, w, h);
    g.lineWidth = 1;
    for (let f = 0; f <= N; f += 2) { g.strokeStyle = f % 12 === 0 ? "rgba(242,215,150,.13)" : f % 6 === 0 ? "rgba(242,215,150,.06)" : "rgba(242,215,150,.025)"; g.beginPath(); g.moveTo(X(f) + 0.5, T); g.lineTo(X(f) + 0.5, h - B); g.stroke(); if (f % 12 === 0) tag(g, f + "f", X(f), h - B + 15, K.muted, 9, "center"); }
    const u = P.UNIT, stepV = st.prop === "skala" ? 25 : 135;
    for (let v = Math.ceil(yr[0] * u / stepV) * stepV; v <= yr[1] * u; v += stepV) { const y = Y(v / u); g.strokeStyle = v === 0 || v === u ? "rgba(242,215,150,.22)" : "rgba(242,215,150,.07)"; g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(w - R, y + 0.5); g.stroke(); tag(g, String(v), L - 6, y + 3, K.muted, 9, "right"); }
    tag(g, st.prop === "skala" ? "%" : "px", L - 6, T - 8, K.muted, 9, "right");
    if (w > 470 && S.opts.readouts) tag(g, "value + amp\u00b7sin(t\u00b7freq\u00b72\u03c0)/exp(t\u00b7decay)", L + 4, T - 12, "rgba(242,215,150,.7)", 9.5);
    const k2 = LEAD + st.dur;
    const path = (f0, f1) => { g.beginPath(); for (let i = 0; i <= 600; i++) { const f = N * i / 600; if (f < f0 - 1e-9 || f > f1 + N / 600) continue; g.lineTo(X(f), Y(curve[i])); } };
    g.save(); g.shadowColor = "rgba(242,215,150,.55)"; g.shadowBlur = 10;
    g.lineWidth = 2.2; g.strokeStyle = K.gold; path(0, k2); g.stroke();
    g.strokeStyle = K.gold2; path(k2, N); g.stroke(); g.restore();
    const hd = EASES[st.ease].h;
    if (hd) { g.strokeStyle = "rgba(244,236,216,.45)"; g.lineWidth = 1; const xa = X(LEAD), xb = X(k2), ya = Y(0), yb = Y(1); [[xa, ya, lerp(xa, xb, hd[0]), lerp(ya, yb, hd[1])], [xb, yb, lerp(xa, xb, hd[2]), lerp(ya, yb, hd[3])]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.fillStyle = K.ivory; g.beginPath(); g.arc(c, d, 2.6, 0, TAU); g.fill(); }); }
    const step = st.twos ? 2 : 1;
    g.fillStyle = "rgba(244,236,216,.75)";
    if (st.twos) { g.strokeStyle = "rgba(244,236,216,.32)"; g.lineWidth = 1; g.beginPath(); for (let f = 0; f <= N; f += 2) { const v = valAt(f); g.lineTo(X(f), Y(v)); g.lineTo(X(Math.min(N, f + 2)), Y(v)); } g.stroke(); }
    for (let f = 0; f <= N; f += step) { g.beginPath(); g.arc(X(f), Y(valAt(f)), st.twos ? 2.2 : 1.5, 0, TAU); g.fill(); }
    for (const [f, v] of [[LEAD, 0], [k2, 1]]) { const x = X(f), y = Y(v); g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = K.night; g.strokeStyle = K.gold2; g.lineWidth = 1.5; g.fillRect(-4.5, -4.5, 9, 9); g.strokeRect(-4.5, -4.5, 9, 9); g.restore(); }
    tag(g, "key terakhir", X(k2) + 8, Y(1) - 10, K.gold2, 9);
    const px = X(fq); g.strokeStyle = "rgba(242,215,150,.9)"; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 0.5, T - 4); g.lineTo(px + 0.5, h - B); g.stroke();
    g.fillStyle = K.gold2; g.beginPath(); g.moveTo(px - 5, T - 9); g.lineTo(px + 5, T - 9); g.lineTo(px, T - 3); g.fill();
    g.fillStyle = K.ivory; g.beginPath(); g.arc(px, Y(valAt(fq)), 4, 0, TAU); g.fill();
    if (S.opts.tags) pill(g, S, "Graph editor \u00b7 value", w - 10, 10, true);
    g.restore();
    g.strokeStyle = "rgba(242,215,150,.14)"; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1, 14) : g.rect(x0, y0, w, h); g.stroke();
  }
  function drawPrev(g, S, P, fq, x0, y0, w, h) {
    const K = S.K, tag = S.tag, { st, valAt, N } = P, u = P.UNIT, step = st.twos ? 2 : 1, onion = S.opts.onion == null ? true : S.opts.onion;
    g.save(); g.translate(x0, y0); roundClip(g, 0, 0, w, h, 14);
    const bgG = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.5, Math.max(w, h) * 0.8); bgG.addColorStop(0, K.prevIn); bgG.addColorStop(1, K.prevOut); g.fillStyle = bgG; g.fillRect(0, 0, w, h);
    const draw = (v, a) => {
      g.globalAlpha = a;
      if (st.prop === "skala") {
        const R0 = Math.min(w, h) * 0.3, r = Math.max(0, R0 * v), cx = w < 460 ? Math.max(w / 2, w - R0 * 1.4 - 10) : w / 2, cy = h * 0.5;
        if (a === 1) { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(cx, cy + R0 * 1.12, r * 0.9, r * 0.16, 0, 0, TAU); g.fill(); }
        const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r + 0.01); gr.addColorStop(0, K.ballHi); gr.addColorStop(0.55, K.gold); gr.addColorStop(1, K.ballLo);
        g.fillStyle = a === 1 ? gr : rgba(K.gold2, 1); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
        if (a === 1 && r > 6) { g.strokeStyle = "rgba(255,244,214,.55)"; g.lineWidth = Math.max(1, r * 0.04); g.beginPath(); g.arc(cx, cy, r * 0.72, 0, TAU); g.stroke(); }
      } else {
        const xa = w * 0.16, xb = w * 0.78, x = lerp(xa, xb, v), cw = Math.min(w * 0.16, 64, h * 0.32), ch = cw * 1.25, y = h * 0.6 - ch / 2;
        g.fillStyle = a === 1 ? K.gold : rgba(K.gold2, 1); g.beginPath(); g.roundRect ? g.roundRect(x - cw / 2, y, cw, ch, 6) : g.rect(x - cw / 2, y, cw, ch); g.fill();
        if (a === 1) { g.fillStyle = "rgba(7,10,20,.55)"; g.fillRect(x - cw * 0.3, y + ch * 0.2, cw * 0.6, 2); g.fillRect(x - cw * 0.3, y + ch * 0.32, cw * 0.38, 2); }
      }
      g.globalAlpha = 1;
    };
    if (st.prop === "posisi") { const xa = w * 0.16, xb = w * 0.78; g.strokeStyle = "rgba(242,215,150,.25)"; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(xb, h * 0.22); g.lineTo(xb, h * 0.78); g.stroke(); g.setLineDash([]); tag(g, "target", xb, h * 0.2, K.muted, 9, "center"); g.strokeStyle = "rgba(242,215,150,.12)"; g.beginPath(); g.moveTo(xa, h * 0.8); g.lineTo(w * 0.9, h * 0.8); g.stroke(); }
    if (onion) [3, 2, 1].forEach((k) => { const f = fq - k * step; if (f >= 0) draw(valAt(f), 0.09 * (4 - k)); });
    draw(valAt(fq), 1);
    if (S.opts.readouts) {
      tag(g, `f ${String(Math.round(fq)).padStart(2, "0")} / ${N}`, 12, h - 14, K.gold2, 10);
      tag(g, st.twos ? "on twos \u00b7 12 gambar/s" : "on ones \u00b7 24 gambar/s", w - 12, h - 14, K.muted, 9.5, "right");
      tag(g, `${fmt(valAt(fq) * u, 1)} ${st.prop === "skala" ? "%" : "px"}`, 12, 22, K.ivory, 11);
      tag(g, P.info[0], 12, 38, K.gold2, 9); tag(g, P.info[1], 12, 52, K.muted, 9);
    }
    if (S.opts.tags) pill(g, S, "Pratinjau", w - 10, 10, true);
    g.restore();
    g.strokeStyle = "rgba(242,215,150,.14)"; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1, 14) : g.rect(x0, y0, w, h); g.stroke();
  }
  function renderPegas(g, t, S) {
    const P = S.cache.pegas, { W, H } = S, o = S.opts, D = P.N / 24, tl = ((t % D) + D) % D, fq = P.st.twos ? Math.floor(tl * 12 + 1e-6) * 2 : Math.floor(tl * 24 + 1e-6);
    g.fillStyle = o.bg; g.fillRect(0, 0, W, H);
    const lay = o.layout || "duo", m = Math.round(Math.min(W, H) * 0.035), gap = m * 0.6;
    if (lay === "graph") drawGraph(g, S, P, fq, m, m, W - 2 * m, H - 2 * m);
    else if (lay === "preview") drawPrev(g, S, P, fq, m, m, W - 2 * m, H - 2 * m);
    else { const gw = (W - 2 * m - gap) * 0.6; drawGraph(g, S, P, fq, m, m, gw, H - 2 * m); drawPrev(g, S, P, fq, m + gw + gap, m, W - 2 * m - gap - gw, H - 2 * m); }
  }

  /* ---------- prinsip ---------- */
  function buildPrinciples(S) {
    const K = S.K, tag = S.tag;
    const OL = 2.4, headX = (t) => { t = ((t % OL) + OL) % OL; if (t < 0.6) return inout3(t / 0.6); if (t < 1.2) return 1; if (t < 1.8) return 1 - inout3((t - 1.2) / 0.6); return 0; };
    const headA = (p) => { const t = p * OL, h = 1 / 240; return (headX(t + h) - 2 * headX(t) + headX(t - h)) / (h * h); };
    const hairTab = springTab((p) => -1.1 * headA(p), 1.45, 0.33, OL);
    const swayX = (p) => Math.sin(TAU * p), antTab = springTab((p) => -(-(TAU * TAU) * Math.sin(TAU * p)) * 0.9, 2.3, 0.14, 1);
    const ring = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const ballFill = (g, cx, cy, rx, ry, base) => { const r = Math.max(rx, ry), gr = g.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, r * 0.08, cx, cy, r); gr.addColorStop(0, mix(base, "#ffffff", 0.55)); gr.addColorStop(0.6, base); gr.addColorStop(1, mix(base, "#000000", 0.45)); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); };
    const eyes = (g, x, y, s, look = 0) => { for (const d of [-1, 1]) { g.fillStyle = K.eye; g.beginPath(); g.ellipse(x + d * s * 0.9 + look * s * 0.4, y, s * 0.28, s * 0.42, 0, 0, TAU); g.fill(); } };
    const floor = (g, W, y) => {
      g.save(); g.translate(W / 2, y); g.scale(1, 0.22);
      const pool = g.createRadialGradient(0, 0, 4, 0, 0, W * 0.46); pool.addColorStop(0, "rgba(242,215,150,.14)"); pool.addColorStop(1, "rgba(242,215,150,0)");
      g.fillStyle = pool; g.beginPath(); g.arc(0, 0, W * 0.46, 0, TAU); g.fill(); g.restore();
      const ln = g.createLinearGradient(W * 0.06, 0, W * 0.94, 0); ln.addColorStop(0, "rgba(242,215,150,0)"); ln.addColorStop(0.5, "rgba(242,215,150,.45)"); ln.addColorStop(1, "rgba(242,215,150,0)");
      g.strokeStyle = ln; g.lineWidth = 1; g.beginPath(); g.moveTo(W * 0.06, y + 0.5); g.lineTo(W * 0.94, y + 0.5); g.stroke();
    };
    const bar = (g, W, H, segs, f, tot) => {
      const x0 = W * 0.08, x1 = W * 0.92, y = H - 20, X = (q) => lerp(x0, x1, q / tot);
      g.fillStyle = "rgba(242,215,150,.08)"; g.fillRect(x0, y, x1 - x0, 6);
      segs.forEach(([a, b, n, c]) => { g.fillStyle = c; g.fillRect(X(a), y, X(b) - X(a) - 1, 6); if (S.opts.readouts) tag(g, n, (X(a) + X(b)) / 2, y - 5, K.muted, 8.5, "center"); });
      g.fillStyle = K.ivory; g.fillRect(X(f) - 1, y - 2, 2, 10);
    };
    // tapered capsule between two circles (outer tangents)
    const capsule = (g, a, b, ra, rb, col) => {
      const L = dist(a, b) || 1e-6, ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = clamp((ra - rb) / L, -0.99, 0.99), al = Math.acos(s);
      g.fillStyle = col; g.beginPath(); g.arc(a[0], a[1], ra, ang + al, ang - al + TAU, false); g.arc(b[0], b[1], rb, ang - al, ang + al, false); g.closePath(); g.fill();
    };
    const fillPts = (g, p, col) => {
      const n = p.length; if (n < 3) return; g.beginPath(); g.moveTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2);
      for (let i = 1; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      g.quadraticCurveTo(p[0][0], p[0][1], (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); g.closePath(); g.fillStyle = col; g.fill();
    };
    const RO = () => S.opts.readouts;
    return [
      { id: "squash", n: "Squash & stretch", rule: "Volume tetap: x = 100 + (100 - y) \u00d7 0,5. Saat jatuh cepat bola memanjang searah gerak, saat menyentuh lantai memipih.", L: 1, draw(g, W, H, t, on, U) {
        const gy = H * 0.8, r = U * 0.95, u = t % 1, hm = H * 0.5, hg = 4 * u * (1 - u) * hm;
        g.fillStyle = "rgba(242,215,150,.22)"; for (let i = 1; i < 12; i++) { const q = i / 12; g.beginPath(); g.arc(W / 2, gy - r - 4 * q * (1 - q) * hm, 1.2, 0, TAU); g.fill(); }
        const bb = on ? bounceBall(u) : { sx: 100, sy: 100 }, sx = bb.sx, sy = bb.sy, rx = r * sx / 100, ry = r * sy / 100, cx = W / 2, cy = gy - hg - ry;
        floor(g, W, gy); g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(cx, gy + 2, rx * (1.05 - 0.55 * hg / hm), r * 0.14, 0, 0, TAU); g.fill();
        ballFill(g, cx, cy, rx, ry, K.gold); if (RO()) tag(g, `x ${Math.round(sx)} \u00b7 y ${Math.round(sy)}`, cx, gy + 18, K.muted, 9, "center");
      } },
      { id: "antisipasi", n: "Antisipasi", rule: "Wind-up 0-10 f, transisi 10-12 f, aksi utama 12-30 f, settle 30-40 f.", L: 64 / 24, draw(g, W, H, t, on, U) {
        const f = t * 24, gy = H * 0.7, x0 = W * 0.24, x1 = W * 0.74, D = x1 - x0; let x = x0, sx = 1, sy = 1, lean = 0, al = 1;
        if (on) { const a = anticipate(f); x = x0 + a.x * D; sx = a.sx; sy = a.sy; lean = a.lean; }
        else x = f < 12 ? x0 : f < 30 ? lerp(x0, x1, easeIO((f - 12) / 18)) : x1;
        if (f > 56) al = 1 - (f - 56) / 8;
        floor(g, W, gy); g.globalAlpha = clamp(al);
        g.save(); g.translate(x, gy); g.rotate(lean * RAD); g.scale(sx, sy);
        const bw = U * 1.7, bh = U * 2; g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 2, bw * 0.6, U * 0.14, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(0, -bh, 0, 0); gr.addColorStop(0, K.gold2); gr.addColorStop(1, K.goldd); g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(-bw / 2, -bh, bw, bh, U * 0.5) : g.rect(-bw / 2, -bh, bw, bh); g.fill();
        eyes(g, bw * 0.12, -bh * 0.66, U * 0.32, 1); g.restore(); g.globalAlpha = 1;
        bar(g, W, H, on ? [[0, 10, "wind-up", "rgba(242,215,150,.45)"], [10, 12, "", "rgba(244,236,216,.6)"], [12, 30, "aksi", K.gold], [30, 40, "settle", "rgba(242,215,150,.6)"]] : [[12, 30, "aksi", K.gold]], f, 64);
      } },
      { id: "slow", n: "Slow in / out", rule: "Ease in/out di setiap pose kunci: jarak antar-frame rapat di ujung dan renggang di tengah.", L: 2, draw(g, W, H, t, on, U) {
        const u = t % 2, k = u < 1 ? u : 2 - u, e = on ? inout3(k) : k, xa = W * 0.14, xb = W * 0.86, y = H * 0.52;
        g.strokeStyle = "rgba(242,215,150,.2)"; g.lineWidth = 2; g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke();
        for (let i = 0; i <= 24; i++) { const q = on ? inout3(i / 24) : i / 24, x = lerp(xa, xb, q); g.fillStyle = i % 12 === 0 ? K.gold2 : "rgba(242,215,150,.55)"; g.fillRect(x - 0.75, y - U * 1.35, 1.5, i % 12 === 0 ? 12 : 7); }
        if (RO()) tag(g, "spacing 24 f", xa, y - U * 1.6, K.muted, 9);
        ballFill(g, lerp(xa, xb, e), y, U * 0.55, U * 0.55, K.gold);
      } },
      { id: "arc", n: "Arc", rule: "Ujung tungkai bergerak di busur (rotasi FK), bukan garis lurus.", L: 2, draw(g, W, H, t, on, U) {
        const R = Math.min(H * 0.56, W * 0.4 / Math.sin(58 * RAD)), pv = [W / 2, H * 0.5 - R * 0.55], A = -58 * RAD, B = 58 * RAD;
        const tipAt = (tt) => { const u = ((tt % 2) + 2) % 2, k = inout3(u < 1 ? u : 2 - u); if (on) { const a = lerp(A, B, k); return [pv[0] + R * Math.sin(a), pv[1] + R * Math.cos(a)]; } const pa = [pv[0] + R * Math.sin(A), pv[1] + R * Math.cos(A)], pb = [pv[0] + R * Math.sin(B), pv[1] + R * Math.cos(B)]; return [lerp(pa[0], pb[0], k), lerp(pa[1], pb[1], k)]; };
        g.strokeStyle = "rgba(242,215,150,.18)"; g.lineWidth = 1; g.setLineDash([3, 5]); g.beginPath(); if (on) g.arc(pv[0], pv[1], R, Math.PI / 2 - B, Math.PI / 2 - A); else { const a = tipAt(0), b = tipAt(1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); g.setLineDash([]);
        for (let j = 16; j >= 1; j--) { const p = tipAt(t - j / 24); g.fillStyle = rgba(K.gold2, 0.5 * (1 - j / 17)); g.beginPath(); g.arc(p[0], p[1], 2.2, 0, TAU); g.fill(); }
        const tp = tipAt(t); capsule(g, pv, tp, U * 0.32, U * 0.22, K.ivory2);
        ring(g, pv[0], pv[1], U * 0.18, K.goldd); ballFill(g, tp[0], tp[1], U * 0.42, U * 0.42, K.gold);
        if (RO()) tag(g, on ? `panjang tetap ${Math.round(dist(pv, tp))} px` : `panjang ${Math.round(dist(pv, tp))} px (berubah)`, W / 2, H - 12, K.muted, 9, "center");
      } },
      { id: "overlap", n: "Follow-through / overlap", rule: "Anak telat 2-5 f; segmen rambut telat 2,5 f per segmen. Pegas rambut 1,45 Hz, zeta 0,33.", L: OL, draw(g, W, H, t, on, U) {
        const gy = H * 0.78, x = lerp(W * 0.28, W * 0.72, headX(t)), hr = U * 1.05, hy = gy - hr;
        floor(g, W, gy); g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(x, gy + 2, hr, U * 0.14, 0, 0, TAU); g.fill();
        let p = [x - hr * 0.1, hy - hr * 0.92], ang = 0; const sg = U * 0.62;
        for (let i = 0; i < 5; i++) { ang = on ? hairTab((t - i * 2.5 / 24) / OL) * (0.22 + 0.05 * i) : 0; const q = [p[0] + sg * Math.sin(ang), p[1] - sg * Math.cos(ang)]; g.strokeStyle = mix(K.gold2, K.goldd, i / 5); g.lineCap = "round"; g.lineWidth = U * (0.34 - i * 0.05); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); p = q; }
        ring(g, p[0], p[1], U * 0.18, K.gold2);
        ballFill(g, x, hy, hr, hr, K.blue); eyes(g, x + hr * 0.15, hy - hr * 0.05, U * 0.3, headX(t + 0.05) - headX(t - 0.05) > 0 ? 1 : -1);
      } },
      { id: "sekunder", n: "Gerak sekunder", rule: "Antena = pegas 2,3 Hz, zeta 0,14, didorong percepatan samping; jauh dari ayunan jalan 1 Hz.", L: 2, draw(g, W, H, t, on, U) {
        const p = t % 1, gy = H * 0.8, cx = W / 2 + swayX(p) * U * 0.35, bob = Math.abs(Math.sin(TAU * p)) * U * 0.18, by = gy - U * 1.0 - bob;
        floor(g, W, gy);
        for (const s of [-1, 1]) { const lift = Math.max(0, Math.sin(TAU * p) * s) * U * 0.45, fx = W / 2 + s * U * 0.55; g.fillStyle = K.goldd; g.beginPath(); g.ellipse(fx, gy - U * 0.14 - lift, U * 0.36, U * 0.16, 0, 0, TAU); g.fill(); g.strokeStyle = K.goldd; g.lineWidth = U * 0.18; g.beginPath(); g.moveTo(fx, gy - U * 0.2 - lift); g.lineTo(cx + s * U * 0.4, by + U * 0.2); g.stroke(); }
        const bw = U * 1.25, bh = U * 1.5; ballFill(g, cx, by - bh * 0.35, bw, bh, K.blue); eyes(g, cx, by - bh * 0.55, U * 0.3);
        for (const s of [-1, 1]) {
          const base = [cx + s * bw * 0.38, by - bh * 1.15], a = on ? antTab(p) * 1.6 : 0, n = 6, len = U * 1.25; let q = base; g.strokeStyle = K.gold2; g.lineWidth = U * 0.1; g.lineCap = "round"; g.beginPath(); g.moveTo(q[0], q[1]);
          for (let i = 1; i <= n; i++) { const k = i / n; q = [base[0] + Math.sin(a * k * k + s * 0.25) * len * k, base[1] - Math.cos(a * k * k + s * 0.25) * len * k]; g.lineTo(q[0], q[1]); }
          g.stroke(); ring(g, q[0], q[1], U * 0.2, K.gold);
        }
      } },
      { id: "smear", n: "Smear", rule: "Di frame tercepat, ujung yang bergerak di-stretch searah gerak selama 1 frame. Diputar 0,4\u00d7.", L: 1.5, slow: 0.4, draw(g, W, H, t, on, U) {
        const tq = Math.floor(t * 24 + 1e-6) / 24, R = Math.min(H * 0.5, W * 0.4), pv = [W / 2, H * 0.5 + R * 0.45];
        const angAt = (tt) => { tt = ((tt % 1.5) + 1.5) % 1.5; if (tt < 0.35) return -105; if (tt < 0.35 + 3 / 24) return lerp(-105, 72, 1 - Math.pow(1 - (tt - 0.35) / (3 / 24), 2)); if (tt < 1.05) return 72; return lerp(72, -105, inout3((tt - 1.05) / 0.45)); };
        const P = (a) => [pv[0] + R * Math.sin(a * RAD), pv[1] - R * Math.cos(a * RAD)];
        const a1 = angAt(tq), a0 = angAt(tq - 1 / 24), sp = Math.abs(a1 - a0);
        g.strokeStyle = "rgba(242,215,150,.14)"; g.lineWidth = 1; g.beginPath(); g.arc(pv[0], pv[1], R, (-105 - 90) * RAD, (72 - 90) * RAD); g.stroke();
        if (on && sp > 30) {
          const pts = [], n = 14; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), w = U * 0.48 * Math.pow(i / n, 0.8); const c = P(a), nr = [Math.sin(a * RAD), -Math.cos(a * RAD)]; pts.push([c[0] + nr[0] * w, c[1] + nr[1] * w]); }
          for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n), w = U * 0.48 * Math.pow(i / n, 0.8); const c = P(a), nr = [Math.sin(a * RAD), -Math.cos(a * RAD)]; pts.push([c[0] - nr[0] * w * 0.3, c[1] - nr[1] * w * 0.3]); }
          fillPts(g, pts, rgba(K.gold, 0.85)); if (RO()) tag(g, "smear 1 frame", W / 2, 18, K.gold2, 9.5, "center");
        }
        const tp = P(a1); g.strokeStyle = K.ivory2; g.lineWidth = U * 0.2; g.lineCap = "round"; g.beginPath(); g.moveTo(pv[0], pv[1]); g.lineTo(tp[0], tp[1]); g.stroke();
        ballFill(g, tp[0], tp[1], U * 0.5, U * 0.5, K.gold); ring(g, pv[0], pv[1], U * 0.2, K.goldd);
        if (RO()) tag(g, `${Math.round(sp)}\u00b0/frame`, W / 2, H - 10, K.muted, 9, "center");
      } },
      { id: "staging", n: "Staging", rule: "Satu fokus; yang sekunder di-blur dan diredupkan, plus vignette.", L: 3, draw(g, W, H, t, on, U) {
        const gy = H * 0.8; floor(g, W, gy);
        const others = [[0.16, 0.35, 0], [0.32, 0.62, 1.3], [0.7, 0.5, 2.1], [0.86, 0.3, 0.7]];
        others.forEach(([fx, fy, ph], i) => { const c = K.others[i % K.others.length], x = W * fx + Math.sin(t * TAU / 3 + ph) * U * 0.5, y = H * fy + Math.cos(t * TAU / 1.5 + ph) * U * 0.3; if (on) { g.filter = "blur(3px)"; g.globalAlpha = 0.4; } ballFill(g, x, y, U * 0.75, U * 0.75, on ? mix(c, "#1a2040", 0.35) : c); g.filter = "none"; g.globalAlpha = 1; });
        const hx = W / 2, hy = gy - U * 1.25 - Math.abs(Math.sin(t * TAU / 1.5)) * U * 0.4;
        if (on) { const gl = g.createRadialGradient(hx, hy, 2, hx, hy, U * 3); gl.addColorStop(0, "rgba(242,215,150,.16)"); gl.addColorStop(1, "rgba(242,215,150,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, H); }
        ballFill(g, hx, hy, U * 1.2, U * 1.2, K.gold); eyes(g, hx, hy - U * 0.2, U * 0.34);
        if (on) { const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, "rgba(4,6,14,0)"); vg.addColorStop(1, "rgba(4,6,14,.7)"); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
      } },
    ];
  }
  const prList = (o) => (Array.isArray(o.principle) ? o.principle : [o.principle || "squash"]);
  function renderPrinsip(g, t, S) {
    const o = S.opts, K = S.K, PR = S.cache.PR, list = prList(o), { W, H } = S;
    let id = list[0], lt = t;
    if (list.length > 1) { const sgm = o.segment || 6, i = clamp(Math.floor(t / sgm), 0, list.length - 1); id = list[i]; lt = t - i * sgm; }
    const p = PR.find((q) => q.id === id) || PR[0], speed = (p.slow || 1) * (o.slow ? 0.5 : 1), tt = Math.max(0, lt) * speed, tl = ((tt % p.L) + p.L) % p.L;
    g.fillStyle = K.panelEnd; g.fillRect(0, 0, W, H);
    const which = o.panels === "with" ? [true] : o.panels === "without" ? [false] : [false, true];
    const side = which.length === 1 ? true : o.layout === "side" ? true : o.layout === "stack" ? false : W >= 520 && W >= H * 0.9;
    const n = which.length, pw = side ? W / n : W, ph = side ? H : H / n, U = Math.min(pw, ph * 1.25) / 10;
    which.forEach((on, i) => {
      const ox = side ? i * pw : 0, oy = side ? 0 : i * ph;
      g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, pw, ph); g.clip();
      const bg = g.createLinearGradient(0, 0, 0, ph); bg.addColorStop(0, on ? K.panelOn : K.panelOff); bg.addColorStop(1, K.panelEnd); g.fillStyle = bg; g.fillRect(0, 0, pw, ph);
      if (o.onion) [3, 2, 1].forEach((k) => { g.save(); g.globalAlpha = 0.11 * (4 - k); p.draw(g, pw, ph, ((tl - k / 12) % p.L + p.L) % p.L, on, U); g.restore(); g.globalAlpha = 1; });
      g.save(); p.draw(g, pw, ph, tl, on, U); g.restore();
      g.restore();
      if (o.tags) S.tag(g, on ? "\u25cf DENGAN" : "\u25cb TANPA", ox + 12, oy + 20, on ? K.gold2 : K.muted, Math.max(9.5, U * 0.28));
    });
    if (n > 1) { g.strokeStyle = "rgba(242,215,150,.3)"; g.lineWidth = 1; g.beginPath(); if (side) { g.moveTo(pw + 0.5, 0); g.lineTo(pw + 0.5, H); } else { g.moveTo(0, ph + 0.5); g.lineTo(W, ph + 0.5); } g.stroke(); }
  }

  const api = C.defineModule("spring", {
    size: [1280, 720],
    valueAliases: { mode: { spring: "pegas", principles: "prinsip" } },
    defaults: DEF,
    duration(o) {
      if (o.duration) return o.duration;
      if ((o.mode || "pegas") === "prinsip") {
        const list = prList(o); if (list.length > 1) return list.length * (o.segment || 6);
        const L = { squash: 1, antisipasi: 64 / 24, slow: 2, arc: 2, overlap: 2.4, sekunder: 2, smear: 1.5 / 0.4, staging: 3 }[list[0]] || 2;
        return L * (o.loops || 3) * (o.slow ? 2 : 1);
      }
      return (pegasCurve(o).N / 24) * (o.loops || 2);
    },
    setup(S) {
      S.K = Object.assign({}, PAL, S.opts.palette || {}); S.tag = tagF(S);
      if (S.opts.mode === "prinsip") S.cache.PR = buildPrinciples(S); else S.cache.pegas = pegasCurve(S.opts);
    },
    render(g, t, S) {
      if (S.opts.mode === "prinsip") { if (!S.cache.PR) S.cache.PR = buildPrinciples(S); renderPrinsip(g, t, S); }
      else { if (!S.cache.pegas) S.cache.pegas = pegasCurve(S.opts); renderPegas(g, t, S); }
    },
  });
  api.fn = fn;
  api.lib = {
    pegasCurve,
    get PRINCIPLES() { const S = { opts: Object.assign({}, DEF), K: PAL }; S.tag = tagF(S); return buildPrinciples(S).map(({ id, n, rule, L, slow }) => ({ id, name: n, rule, loop: L, slow: slow || 1 })); },
  };
  MGP.spring = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
