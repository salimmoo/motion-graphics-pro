/**
 * MGP.origamiFold \u2014 a crane (bird) folded from a square sheet: a real flat-fold simulation.
 * Each step cuts every layer on the crease line and rotates the moving flap 180 degrees around that line in 3D
 * (valley towards the viewer, mountain away); folded layers are restacked so later steps fold the whole stack.
 * The sheet starts white side up; the coloured side shows wherever a flap turns over. After the last fold the model
 * turns 90 degrees, holds, then (optionally) unfolds by playing the folds backwards.
 *
 * Source: website guide/js/demos-skills.js, section "8 \u00b7 GAYA TOKOH" (ORI step data, drawCrane, crane timeline,
 * bgOrigami backdrop). UI chips removed; every timing is an option.
 *
 * Options (defaults):
 *   front "#d94a3f", frontAlt "#e8675a"      coloured side of the paper (alternating layers use frontAlt)
 *   back "#f7eedb", backAlt "#e7d9bb"        white / cream side
 *   edgeFront "rgba(120,30,25,.55)", edgeBack "rgba(150,115,70,.55)", edgeLight "rgba(255,250,240,.5)"
 *   light [0,0,1]   light direction (x right, y down, z towards the viewer); flaps are lit by |n . light|
 *   ambient 0.72    minimum light on a flap standing edge-on
 *   shadeColor "#3a1c16"
 *   size  null      model radius in px (default min(W*0.3, H*0.36)); cx, cy null = centred above the ground line
 *   stepFold 0.95, stepHold 0.35   seconds per fold step / hold after each step
 *   endHold 2.4     hold on the finished crane
 *   unfold true, unfoldStep 0.32, endGap 0.6   play the folds backwards after the hold, then a pause on the flat sheet
 *   duration null   total seconds; when given, all the timings above are scaled to fit
 *   loop true       loop the cycle when t runs past the duration
 *   crease false    dashed crease line on the moving step (website "grid / garis lipat" toggle)
 *   bg "paper"      "paper" = folded-paper landscape backdrop, a CSS colour, or null (transparent)
 *   groundShadow true, stepLabels true (step number + Indonesian step name, bottom left), font 'ui-monospace, Menlo, Consolas, monospace'
 *   labelColor "#5b3a1e", seed 5 (backdrop specks), steps null (custom step list, see lib.makeModel), initial null (custom start layers)
 *
 * api: MGP.origamiFold.create(canvasOrEl, opts), .render(ctx, t, opts)
 *   MGP.origamiFold.lib = {
 *     foldPolygon(poly, a, b, angle, pick, mountain) -> {fixed: [[x,y]...]|null, moving: [[x,y,z]...]|null}
 *         fold ONE polygon along the crease a-b by angle (radians, 0 flat .. PI folded over); pick = a point on the moving side
 *     rotateAbout(q, a, b, angle, mountain) -> [x,y,z]   rotate a flat point around the crease line
 *     cut(poly, a, b, side), reflect(p, a, b), hingePt(q, a, b, c), area(poly)
 *     makeModel(steps, initialLayers) -> {STEPS, states, splitAll}   flat-fold state machine (step: {n, a, b, pick, m, unfold, tag, add, keep, hold, turn})
 *     drawModel(g, model, i, u, cx, cy, R, o), drawCrane(g, i, u, cx, cy, R, grid, o), stepAt(t, model, o) -> [i, u]
 *     CRANE (the crane model), CRANE_STEPS, bgPaper(g, W, H, gy, scroll, seed)
 *     validasiPola({titik, lipatan: [[i, j, "M"|"V"|"B"]]}) -> {ok, titik, peringatan}   Maekawa, Kawasaki, dua warna (lokal)
 *     celahEngsel(pasangan) -> celah terbesar antara ujung engsel bersama (0 = lipat kaku)
 *   }
 *
 * Example:
 *   const inst = MGP.origamiFold.create("#stage", { front: "#2f6fb0", frontAlt: "#4a88c6", crease: true });
 *   MGP.core.expose(inst);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const { clamp, lerp, mix } = C;
  const inout3 = C.ease.inOut;
  const path = (g, pts, close = true) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (close) g.closePath(); };

  /* ---------------- generic flat-fold geometry ---------------- */
  const cr = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  /** keep the part of polygon P on side sg (+1 / -1) of the line a-b; null when nothing is left */
  const cut = (P, a, b, sg) => { const out = []; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], fp = cr(a, b, p) * sg, fq = cr(a, b, q) * sg; if (fp >= 0) out.push(p); if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out.length > 2 && Math.abs(area(out)) > 1e-5 ? out : null; };
  /** reflect point q across the line a-b scaled by c (c = 1 unchanged, -1 mirrored = folded flat over, 0 on the line) */
  const hingePt = (q, a, b, c) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, t = ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2, pr = [a[0] + d[0] * t, a[1] + d[1] * t]; return [pr[0] + (q[0] - pr[0]) * c, pr[1] + (q[1] - pr[1]) * c]; };
  const reflect = (p, a, b) => hingePt(p, a, b, -1);
  /** rotate the flat point q (z = 0) around the crease a-b by angle th; z > 0 towards the viewer (valley), mountain flips it */
  function rotateAbout(q, a, b, th, mountain) {
    const d = [b[0] - a[0], b[1] - a[1]], dl = Math.hypot(d[0], d[1]) || 1, uu = [d[0] / dl, d[1] / dl];
    const v = [q[0] - a[0], q[1] - a[1]], al = v[0] * uu[0] + v[1] * uu[1], pp = [v[0] - uu[0] * al, v[1] - uu[1] * al], pm = Math.hypot(pp[0], pp[1]);
    return [a[0] + uu[0] * al + pp[0] * Math.cos(th), a[1] + uu[1] * al + pp[1] * Math.cos(th), (mountain ? -1 : 1) * pm * Math.sin(th)];
  }
  /** fold one polygon along a-b by angle (radians); pick = any point on the side that moves */
  function foldPolygon(poly, a, b, angle, pick, mountain) {
    const ms = cr(a, b, pick) > 0 ? 1 : -1, mv = cut(poly, a, b, ms), fx = cut(poly, a, b, -ms);
    return { fixed: fx, moving: mv ? mv.map((q) => rotateAbout(q, a, b, angle, mountain)) : null };
  }
  /** flat-fold state machine: states[i] = layers before step i (each layer {p, inv, tags}) */
  function makeModel(STEPS, initial) {
    const splitAll = (S, o) => { const fix = [], mov = []; for (const pc of S) { if (o.tag && !pc.tags.includes(o.tag)) { fix.push(pc); continue; } const ms = cr(o.a, o.b, o.pick) > 0 ? 1 : -1; const pm = cut(pc.p, o.a, o.b, ms), pf = cut(pc.p, o.a, o.b, -ms); if (pf) fix.push(Object.assign({}, pc, { p: pf })); if (pm) mov.push(Object.assign({}, pc, { p: pm })); } return { fix, mov }; };
    let st = initial || [{ p: [[0, -1], [1, 0], [0, 1], [-1, 0]], inv: false, tags: [] }];
    const states = [st];
    for (const o of STEPS) {
      if (o.hold || o.turn) { states.push(st); continue; }
      const { fix, mov } = splitAll(st, o);
      if (o.unfold) st = fix.concat(mov);
      else { const mv = mov.map((pc) => ({ p: pc.p.map((q) => reflect(q, o.a, o.b)), inv: o.keep ? !pc.inv : pc.inv, tags: o.add ? pc.tags.concat(o.add) : pc.tags })).reverse(); st = o.m ? mv.concat(fix) : fix.concat(mv); }
      states.push(st);
    }
    return { STEPS, states, splitAll, area };
  }

  /* ---------------- the crane ---------------- */
  const T0 = [0, -1], k1 = [-0.3827, 0.9239], k2 = [-0.1951, 0.9808];
  const Rf = (v) => [-v[0], v[1]], P2 = (a, d, k = 2.4) => [a[0] + d[0] * k, a[1] + d[1] * k];
  // steps: crease line a-b, the point that picks the moving side, valley (default) / mountain (m), optional layer tag filter / new tag
  const CRANE_STEPS = [
    { n: "kertas persegi", hold: true },
    { n: "lipat diagonal, lalu buka", a: [0, -1.2], b: [0, 1.2], pick: [-0.5, 0], unfold: true },
    { n: "sisi kiri ke garis tengah", a: T0, b: P2(T0, k1), pick: [-0.9, 0] },
    { n: "sisi kanan ke garis tengah", a: T0, b: P2(T0, Rf(k1)), pick: [0.9, 0] },
    { n: "layang-layang dirampingkan", a: T0, b: P2(T0, k2), pick: [-0.45, 0.3] },
    { n: "sisi kanan dirampingkan", a: T0, b: P2(T0, Rf(k2)), pick: [0.45, 0.3] },
    { n: "ujung atas dilipat ke bawah (leher)", a: [-1, 0], b: [1, 0], pick: [0, -0.8], add: "neck" },
    { n: "lipat dua ke belakang", a: [0, -1.5], b: [0, 1.5], pick: [0.3, 0.5], m: true },
    { n: "leher ditarik ke atas", a: [0, 0], b: [-0.843 * 2, 0.537 * 2], pick: [-0.05, 0.9], tag: "neck", keep: true },
    { n: "ujung leher ditekuk (kepala)", a: [-0.679 + 0.383, -0.317 + 0.924], b: [-0.679 - 0.383, -0.317 - 0.924], pick: [-0.86, -0.4], tag: "neck", keep: true },
    { n: "diputar: bangau jadi", turn: 90 },
  ];
  const CRANE = makeModel(CRANE_STEPS);

  const DEF = {
    front: "#d94a3f", frontAlt: "#e8675a", back: "#f7eedb", backAlt: "#e7d9bb",
    edgeFront: "rgba(120,30,25,.55)", edgeBack: "rgba(150,115,70,.55)", edgeLight: "rgba(255,250,240,.5)",
    light: [0, 0, 1], ambient: 0.72, shadeColor: "#3a1c16", groundShadow: true,
  };
  /** draw model at step i with progress u (0..1), fitted in radius R around (cx, cy); o = colours / light (see DEF) */
  function drawModel(g, model, i, u, cx, cy, R, o) {
    o = Object.assign({}, DEF, o || {});
    const STEPS = model.STEPS, st = STEPS[i], S = model.states[i], turnA = STEPS.slice(0, i).reduce((s, x) => s + (x.turn || 0), 0) + (st.turn ? st.turn * inout3(u) : 0);
    const ca = Math.cos(turnA * RAD), sa = Math.sin(turnA * RAD);
    const Lv = C.norm3(o.light), amb = o.ambient, litOf = (n) => amb + (1 - amb) * Math.abs(n[0] * Lv[0] + n[1] * Lv[1] + n[2] * Lv[2]);
    const litFlat = litOf([0, 0, 1]);
    // fit: centre on the paper bounding box (smoothly between the states)
    const bb = (sts, a) => { const c = Math.cos(a * RAD), s = Math.sin(a * RAD); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const pc of sts) for (const [x, y] of pc.p) { const X = x * c - y * s, Y = x * s + y * c; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); } return [(x0 + x1) / 2, y1, Math.max(x1 - x0, y1 - y0)]; };
    const b0 = bb(S, turnA), b1 = bb(model.states[i + 1] || S, turnA), k = inout3(u), mcx = lerp(b0[0], b1[0], k), mcy = lerp(b0[1], b1[1], k), span = lerp(b0[2], b1[2], k), sc = R * 2 / Math.max(1.15, span * 1.08);
    const base = cy + R * 0.98, prj = (x, y, z) => { const X = x * ca - y * sa, Y = x * sa + y * ca, pz = 5 / (5 - z); return [cx + (X - mcx) * sc * pz, base + (Y - mcy) * sc * pz - z * sc * 0.12]; };
    const face = (pc, Q, lit) => {
      const white = (area(Q) > 0) !== pc.inv ? 1 : 0; // + area in screen space = white side up (the display turn keeps the winding)
      let col = white ? (pc.k % 2 ? o.backAlt : o.back) : (pc.k % 2 ? o.front : o.frontAlt); col = mix(col, o.shadeColor, 0.3 * (1 - lit));
      g.fillStyle = col; path(g, Q); g.fill(); g.lineJoin = "round"; g.lineWidth = 1; g.strokeStyle = white ? o.edgeBack : o.edgeFront; g.stroke();
      g.strokeStyle = o.edgeLight; g.lineWidth = 0.6; g.stroke();
    };
    const flat = (list) => list.forEach((pc, j) => { pc.k = j; face(pc, pc.p.map(([x, y]) => prj(x, y, 0)), litFlat); });
    if (o.groundShadow) { g.fillStyle = "rgba(80,50,20,.18)"; g.beginPath(); g.ellipse(cx, cy + R * 1.02, R * 0.85, R * 0.07, 0, 0, TAU); g.fill(); }
    if (st.hold || st.turn || u <= 0) { flat(S.map((pc) => Object.assign({}, pc))); }
    else if (u >= 1) { flat(model.states[i + 1].map((pc) => Object.assign({}, pc))); }
    else {
      const { fix, mov } = model.splitAll(S, st), th = Math.PI * (st.unfold ? Math.sin(Math.PI * u) : inout3(u));
      // normal of the moving flap: (0,0,1) rotated about the crease by th
      const d = [st.b[0] - st.a[0], st.b[1] - st.a[1]], dl = Math.hypot(d[0], d[1]) || 1, ax = [d[0] / dl, d[1] / dl], sg = st.m ? -1 : 1;
      const nIn = [-ax[1], ax[0]], side = Math.sign(cr(st.a, st.b, st.pick)) || 1; // in-plane normal towards the moving side
      const nv = [nIn[0] * side * -Math.sin(th) * sg, nIn[1] * side * -Math.sin(th) * sg, Math.cos(th)];
      const moving = () => { const ord = th > Math.PI / 2 ? mov.slice().reverse() : mov; ord.forEach((pc, j) => { pc.k = j + 1; face(pc, pc.p.map((q) => { const r3 = rotateAbout(q, st.a, st.b, th, st.m); return prj(r3[0], r3[1], r3[2] * (1 + j * 0.01)); }), litOf(nv)); }); };
      if (st.m) { moving(); flat(fix); } else { flat(fix); moving(); }
      if (o.crease) { const A = prj(st.a[0], st.a[1], 0), B = prj(st.b[0], st.b[1], 0); g.strokeStyle = "rgba(60,30,20,.55)"; g.setLineDash([4, 4]); g.lineWidth = 1; path(g, [A, B], false); g.stroke(); g.setLineDash([]); }
    }
  }
  const drawCrane = (g, i, u, cx, cy, R, grid, o) => drawModel(g, CRANE, i, u, cx, cy, R, Object.assign({}, o || {}, { crease: grid }));

  /** timing of the whole cycle in seconds */
  function timing(model, o) {
    const NS = model.STEPS.length;
    let F = o.stepFold, Hd = o.stepHold, E = o.endHold, B = o.unfold ? o.unfoldStep : 0, G = o.unfold ? o.endGap : 0;
    const tot0 = NS * (F + Hd) + E + (NS - 1) * B + G;
    if (o.duration) { const k = o.duration / tot0; F *= k; Hd *= k; E *= k; B *= k; G *= k; }
    return { NS, F, Hd, E, B, G, tot: NS * (F + Hd) + E + (NS - 1) * B + G };
  }
  /** [step index, progress] at time t */
  function stepAt(t, model, o) {
    const T = timing(model, o); let tm = o.loop ? ((t % T.tot) + T.tot) % T.tot : clamp(t, 0, T.tot);
    const fwd = T.NS * (T.F + T.Hd);
    if (tm < fwd) { const i = Math.floor(tm / (T.F + T.Hd)), r = tm - i * (T.F + T.Hd); return [Math.min(i, T.NS - 1), Math.min(1, r / T.F)]; }
    if (tm < fwd + T.E || !o.unfold) return [T.NS - 1, 1];
    tm -= fwd + T.E;
    if (tm < (T.NS - 1) * T.B) { const j = Math.floor(tm / T.B), i = T.NS - 1 - j; return [i, 1 - (tm - j * T.B) / T.B]; }
    return [0, 0];
  }

  /** folded-paper landscape backdrop (website bgOrigami) */
  function bgPaper(g, W, H, gy, scroll, seed) {
    g.fillStyle = "#efe3c9"; g.fillRect(0, 0, W, H);
    const R = C.rng(seed == null ? 5 : seed); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,110,60,${0.03 + R() * 0.04})`; const x = R() * W, y = R() * gy, s = 20 + R() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.2, y + s); g.fill(); }
    const mt = (x0, w, h, c1, c2) => { const x = ((x0 - scroll * 0.25) % (W + w * 2) + W + w * 2) % (W + w * 2) - w; g.fillStyle = c1; g.beginPath(); g.moveTo(x - w / 2, gy); g.lineTo(x, gy - h); g.lineTo(x, gy); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(x, gy - h); g.lineTo(x + w / 2, gy); g.lineTo(x, gy); g.fill(); g.fillStyle = "#fbf6ea"; g.beginPath(); g.moveTo(x - w * 0.1, gy - h * 0.8); g.lineTo(x, gy - h); g.lineTo(x + w * 0.1, gy - h * 0.8); g.lineTo(x, gy - h * 0.86); g.fill(); };
    mt(W * 0.15, 220, gy * 0.62, "#8fb3a6", "#6d9387"); mt(W * 0.55, 300, gy * 0.8, "#a8c2b4", "#7fa192"); mt(W * 0.9, 200, gy * 0.55, "#8fb3a6", "#6d9387");
    g.fillStyle = "#c9935a"; g.fillRect(0, gy, W, H - gy); g.fillStyle = "#b07c48"; g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.lineTo(W, gy + 6); g.lineTo(0, gy + 14); g.fill();
    g.strokeStyle = "rgba(255,240,215,.35)"; g.lineWidth = 1; for (let x = -(((scroll) % 48) + 48) % 48; x < W; x += 48) { g.beginPath(); g.moveTo(x, gy + 14); g.lineTo(x + 30, H); g.stroke(); }
  }

  /* ---------------- validator pola lipat (crease pattern) ----------------
     pola = { titik: [[x, y], ...], lipatan: [[i, j, "M" | "V" | "B"], ...] }   (B = tepi kertas; boleh juga batas: [indeks])
     Untuk setiap titik dalam (tidak di tepi): derajat genap (= muka bisa diwarnai dua warna), Maekawa |M - V| = 2,
     Kawasaki: jumlah sudut berselang = 180 derajat. Ini syarat LOKAL dapat-dilipat-datar; tabrakan antarlapisan
     (global) tidak diperiksa. Kembali { ok, titik: [{i, derajat, M, V, maekawa, kawasaki, genap, sudut}], peringatan: [...] } */
  function validasiPola(pola, tol = 0.5) {
    const P = pola.titik, E = pola.lipatan || [], tepi = new Set(pola.batas || []), adj = P.map(() => []);
    for (const [i, j, k] of E) { if (k === "B" || k === "b") { tepi.add(i); tepi.add(j); continue; } adj[i].push([j, k]); adj[j].push([i, k]); }
    // tanpa tepi B / batas: titik di keliling cembung kumpulan titik dianggap tepi kertas
    if (!tepi.size && P.length > 2) {
      const Q = P.map((p, i) => [p[0], p[1], i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), crs = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], hi = []; for (const p of Q) { while (lo.length >= 2 && crs(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of Q.slice().reverse()) { while (hi.length >= 2 && crs(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
      const H = lo.slice(0, -1).concat(hi.slice(0, -1)), sc = Math.max(...P.map((p) => Math.abs(p[0]) + Math.abs(p[1]))) || 1;
      P.forEach((p, i) => { for (let q = 0; q < H.length; q++) { const a = H[q], b = H[(q + 1) % H.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; if (Math.abs(crs(a, b, p)) / L < 1e-6 * sc && (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1]) <= 1e-9 * sc) { tepi.add(i); break; } } });
    }
    const hasil = [], warn = [];
    adj.forEach((L, i) => {
      if (tepi.has(i) || !L.length) return;
      const ang = L.map(([j, k]) => [Math.atan2(P[j][1] - P[i][1], P[j][0] - P[i][0]), k]).sort((a, b) => a[0] - b[0]);
      const sec = ang.map((x, q) => { let d = (ang[(q + 1) % ang.length][0] - x[0]) / RAD; if (d <= 0) d += 360; return d; });
      const M = ang.filter((x) => x[1] === "M" || x[1] === "m").length, V = ang.length - M, genap = ang.length % 2 === 0;
      let ganjil = 0; sec.forEach((d, q) => { if (q % 2 === 0) ganjil += d; });
      const maekawa = Math.abs(M - V) === 2, kawasaki = genap && Math.abs(ganjil - 180) <= tol;
      hasil.push({ i, derajat: ang.length, M, V, maekawa, kawasaki, genap, sudut: sec.map((d) => +d.toFixed(2)) });
      const xy = P[i].map((v) => +(+v).toFixed(3)).join(", ");
      if (!genap) warn.push(`titik ${i} (${xy}): ${ang.length} lipatan (ganjil), muka tidak bisa diwarnai dua warna`);
      if (!maekawa) warn.push(`titik ${i} (${xy}): Maekawa gagal, M ${M} V ${V} (|M - V| harus 2)`);
      if (genap && !kawasaki) warn.push(`titik ${i} (${xy}): Kawasaki gagal, sudut berselang ${ganjil.toFixed(2)} derajat (harus 180)`);
    });
    return { ok: !warn.length, titik: hasil, peringatan: warn, catatan: "syarat lokal per titik; tabrakan antarlapisan tidak diperiksa" };
  }
  /** celah engsel: jarak terbesar (satuan model) antara ujung tepi bersama dua panel setelah dipose. 0 = lipat kaku sungguhan;
      besar = panel terlepas dari engselnya (terlihat seperti kaca pecah). panel = [{tepi: [[a, b], ...] (titik 3D)}] dengan kunci tepi sama */
  function celahEngsel(pasangan) { let m = 0; for (const [p, q] of pasangan) m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1], (p[2] || 0) - (q[2] || 0))); return m; }

  const api = C.defineModule("origamiFold", {
    size: [1280, 720],
    duration: (o) => timing(o.steps ? makeModel(o.steps, o.initial) : CRANE, Object.assign({ stepFold: 0.95, stepHold: 0.35, endHold: 2.4, unfold: true, unfoldStep: 0.32, endGap: 0.6 }, o)).tot,
    defaults: Object.assign({}, DEF, {
      size: null, cx: null, cy: null, stepFold: 0.95, stepHold: 0.35, endHold: 2.4, unfold: true, unfoldStep: 0.32, endGap: 0.6, duration: null, loop: true,
      crease: false, bg: "paper", stepLabels: true, font: "ui-monospace, Menlo, Consolas, monospace", labelColor: "#5b3a1e", seed: 5, steps: null, initial: null,
    }),
    setup(S) { S.model = S.opts.steps ? makeModel(S.opts.steps, S.opts.initial) : CRANE; },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, gy = H * 0.84;
      if (o.bg === "paper") bgPaper(g, W, H, gy, 0, o.seed); else if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
      const [i, u] = stepAt(t, S.model, o), R = o.size || Math.min(W * 0.3, H * 0.36);
      drawModel(g, S.model, i, u, o.cx == null ? W * 0.5 : o.cx, o.cy == null ? gy - R * 1.02 : o.cy, R, o);
      if (o.stepLabels && S.model.STEPS[i].n) { const fs = Math.max(10, Math.round(H / 44)); g.font = `500 ${fs}px ${o.font}`; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = o.labelColor; g.fillText(`${i + 1} \u00b7 ${S.model.STEPS[i].n}`.toUpperCase(), 14, H - 14); }
    },
  });
  api.lib = { foldPolygon, rotateAbout, cut, reflect, hingePt, area, makeModel, drawModel, drawCrane, stepAt, timing, bgPaper, CRANE, CRANE_STEPS, validasiPola, celahEngsel };
  api.validasiPola = api.validatePattern = api.lib.validatePattern = validasiPola;
  MGP.origamiFold = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
