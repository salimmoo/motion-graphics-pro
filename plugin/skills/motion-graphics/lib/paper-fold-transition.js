/**
 * MGP.paperFoldTransition \u2014 origami paper-fold transition between two frames, a DOM variant for any element,
 * and a "portal" (a hole punched in the front scene that the camera pushes through).
 *
 * Extracted from the website's gate layer (guide/js/gate.js "paper-fold theme morph", pose()/sheet()/bakeBack(),
 * and drawSky()/holePts()/coverScale()/drawWarp() of the open sequence). The site folded DOM layers of its gate
 * images with GSAP and CSS 3D; here the same poses are computed from t alone and drawn on a canvas with a
 * perspective-correct triangle-free mesh (each panel split into small cells, each cell drawn with an affine map),
 * or written as CSS transforms on cloned panels in the DOM variant. Image decoding, quality tiers, layout.js and
 * pointer parallax are removed.
 *
 * \u2500\u2500 Canvas fold:  MGP.paperFoldTransition.create(canvasOrEl, opts) / .render(ctx, t, opts)
 *   The old frame is one sheet of paper: the left half folds over the right along the centre crease, the top folds
 *   down over the bottom, the small packet lies down and fades; the new frame arrives as a packet that stands up
 *   and unfolds in reverse. Every panel has a printed front and a kraft back (the print showing through ~13 %),
 *   with mountain/valley shading and a soft shadow under the packet.
 *   Options (defaults):
 *     width 640, height 360, seed 3
 *     from, to          HTMLImageElement | canvas | (ctx, t, w, h) => void  (drawn into the sheet box)
 *     box null          {x, y, w, h} sheet rectangle on the canvas (default: whole canvas)
 *     background null   css colour | (ctx, t, W, H) => void   drawn behind the sheets
 *     mode "origami"    "origami" (two creases, as the site) | "accordion" (concertina of `panels` strips)
 *     panels 4, axis "x"                      accordion: number of strips, "x" = vertical creases, "y" = horizontal
 *     direction "left"  origami: half that folds over ("left" | "right"); accordion: side it collapses to
 *                       ("right" | "left" for axis x, "down" | "up" for axis y)
 *     vertical "down"   origami: "down" = top folds down over the bottom, "up" = bottom folds up
 *     start 0.6, foldDuration 1.82, hold 0.8  timing (s); duration = start + foldDuration + hold
 *     kaku false        rigid folding: the second crease starts only after the first one is flat (hinge gap 0;
 *                       the default overlapping phases detach the corner panel from its hinge)
 *     timing null       override the phase table (in the 1.82 s base): { old:{f1:[a,d], f2:[a,d], f3:[a,d]}, new:{...} }
 *     perspective 1700  CSS-like perspective (px) about the box centre
 *     mesh 6            cells per panel side (higher = more exact perspective, slower)
 *     paperBack ["#c9a77a", "#e8d3ad"], showThrough 0.13, fibre 0.4, rim "rgba(255,246,226,.95)"
 *     shadeColor "#24160a" (back faces), frontShade "#000000"
 *     shadow true, shadowColor "rgba(38,22,6,.5)"
 *     texScale null     texture resolution factor (default: the context's device-pixel scale)
 *
 * \u2500\u2500 DOM fold:  MGP.paperFoldTransition.createDOM(el, opts)
 *   el = container; opts.from / opts.to = Element (cloned) or HTML string; default el.children[0] / [1].
 *   The container gets four panel clones per sheet with CSS 3D transforms set purely from t (seekable, no CSS
 *   transitions). Options: width/height (default el size), start, foldDuration, hold, timing, perspective,
 *   direction "left"|"right", vertical "down"|"up", paperBack, showThrough, shadeColor, shadow.
 *
 * \u2500\u2500 Portal:  MGP.paperFoldTransition.portal(ctx, t, opts)  (also portal.create(canvasOrEl, opts))
 *   Draws `to`, then `from` with a hole cut where the opening is, scaled by a camera push around the opening until
 *   the hole covers the frame (site: sky with the arch hole + push-through); a warm flash inside the opening and
 *   soft motes flying out of it toward the camera.
 *   Options (defaults): width 1280, height 720, seed 9, from, to (as above; `from` is drawn at camera scale),
 *     shape "arch" | "circle" | "ellipse" | "rect" | "poly",  hole {x,y,w,h} opening box (px) \u2014 or center [x,y] +
 *     radius r (circle) / radius [rx, ry] (ellipse),  poly [[u,v],...] (0..1 inside the hole box, shape "poly"),
 *     origin null (zoom origin, default hole centre at 62 % of its height), start 0.5, zoom 2.5 (push duration),
 *     ease "inQuad" (power2.in), cover "auto" (final zoom; number to force), keys null ([[t, zoom], ...] overrides),
 *     toScale [0.8, 1] (the scene behind comes forward, about the zoom origin; never smaller than the visible opening), toDuration null (= zoom), toBackground "#050816" (fill behind the scaled
 *     scene; null = none), flash true, flashColor "#ffe6b0", flashStrength 0.5,
 *     motes 180, moteColors [...], hold 0.5 (duration = start + zoom + hold)
 *
 * api.lib = { origamiPose, accordionPose, drawSheet, phases, holePath, coverScale }
 *
 * Example:
 *   const fold = MGP.paperFoldTransition.create("#stage", { width: 1280, height: 720, from: imgA, to: imgB });
 *   MGP.core.expose(fold);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, PI = Math.PI;

  /* ---------------- 3x4 affine matrices (CSS-like frame: x right, y down, z toward the viewer) ---------------- */
  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  const mul = (A, B) => {
    const R = new Array(12);
    for (let r = 0; r < 3; r++) {
      const a0 = A[r * 4], a1 = A[r * 4 + 1], a2 = A[r * 4 + 2], a3 = A[r * 4 + 3];
      R[r * 4] = a0 * B[0] + a1 * B[4] + a2 * B[8];
      R[r * 4 + 1] = a0 * B[1] + a1 * B[5] + a2 * B[9];
      R[r * 4 + 2] = a0 * B[2] + a1 * B[6] + a2 * B[10];
      R[r * 4 + 3] = a0 * B[3] + a1 * B[7] + a2 * B[11] + a3;
    }
    return R;
  };
  const T3 = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
  const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; };   // CSS rotateX
  const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; };   // CSS rotateY
  const about = (o, M) => mul(mul(T3(o[0], o[1], o[2] || 0), M), T3(-o[0], -o[1], -(o[2] || 0)));
  const ap = (M, x, y) => [M[0] * x + M[1] * y + M[3], M[4] * x + M[5] * y + M[7], M[8] * x + M[9] * y + M[11]];
  const SW = [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];   // swap x <-> y (for accordion axis "y")
  const io = C.ease.inOutQuad;

  /* ---------------- poses ---------------- */
  // origami (site pose()): f1 = left half folded over (0..1), f2 = top folded down, f3 = packet laid down/away
  function origamiPose(f1, f2, f3, w, h) {
    const hw = w / 2, hh = h / 2;
    const Ssh = I();   // the lay-down (f3) is applied later, in final (mirrored) space: see layDown()
    const Stop = about([w / 2, hh, 0], mul(T3(0, 0, f2 * 6), RX(-PI * f2)));
    const Shg = about([hw, 0, 0], mul(T3(0, 0, f1 * 2), RY(PI * f1)));
    const m1 = Math.sin(PI * f1), m2 = Math.sin(PI * f2);
    const panels = [
      { r: [hw, hh, w, h], M: Ssh, sf: m1 * 0.22 + m2 * 0.3, sb: 0 },
      { r: [0, hh, hw, h], M: mul(Ssh, Shg), sf: m1 * 0.55, sb: m1 * 0.45 + 0.1 },
      { r: [hw, 0, w, hh], M: mul(Ssh, Stop), sf: m2 * 0.5 + m1 * 0.25, sb: m2 * 0.45 + 0.08 },
      { r: [0, 0, hw, hh], M: mul(mul(Ssh, Stop), Shg), sf: m1 * 0.55, sb: m1 * 0.45 + 0.1 },
    ];
    return { panels, f3, packet: [hw, hh, w, h], alpha: f3 > 0.55 ? 1 - (f3 - 0.55) / 0.45 : 1, shadow: f2 * Math.min(1, 0.35 + f3 * 1.6) * (f3 > 0.7 ? 1 - (f3 - 0.7) / 0.3 : 1) };
  }
  // accordion: n strips collapse toward the right edge (canonical), alternating mountain/valley creases
  function accordionPose(f, f3, w, h, n, axis) {
    const swap = axis === "y", W = swap ? h : w, H = swap ? w : h, pw = W / n, th = f * (88 * PI / 180);
    const Ssh = I(), packet = swap ? [0, W - pw, H, W] : [W - pw, 0, W, H];
    const panels = []; let X = W, Z = 0;
    for (let i = 0; i < n; i++) {
      const xr = W - i * pw, phi = i % 2 ? -th : th;
      const M = mul(Ssh, mul(T3(X, 0, Z), mul(RY(phi), T3(-xr, 0, 0))));
      panels.push({ r: [xr - pw, 0, xr, H], M, sf: (i % 2 ? 0.42 : 0.1) * Math.sin(th), sb: 0.3 });
      X -= pw * Math.cos(th); Z += pw * Math.sin(phi);
    }
    if (swap) panels.forEach((p) => { p.r = [p.r[1], p.r[0], p.r[3], p.r[2]]; p.M = mul(mul(SW, p.M), SW); });
    return { panels, f3, packet, alpha: f3 > 0.55 ? 1 - (f3 - 0.55) / 0.45 : 1, shadow: f * Math.min(1, 0.35 + f3 * 1.6) * (f3 > 0.7 ? 1 - (f3 - 0.7) / 0.3 : 1) * 0.8 };
  }

  // the folded packet lies down into the ground and slides to the centre (site: sheet transform-origin 75% 100%,
  // translate3d(-25% w, 6% h) rotateX(84deg)); defined from the packet's final rect so mirrored folds still lie down
  function layDown(f3, pk, w, h) {
    if (f3 <= 0) return null;
    const cx = (pk[0] + pk[2]) / 2, by = pk[3];
    return about([cx, by, 0], mul(T3((w / 2 - cx) * f3, (h - by + h * 0.06) * f3, 0), RX((84 * PI / 180) * f3)));
  }
  const mirRect = (r, w, h, fx, fy) => { const x0 = fx ? w - r[2] : r[0], x1 = fx ? w - r[0] : r[2], y0 = fy ? h - r[3] : r[1], y1 = fy ? h - r[1] : r[3]; return [x0, y0, x1, y1]; };

  // phase table in the site's 1.82 s base (gate.js morph(): render())
  const PHASES = { old: { f1: [0, 0.42], f2: [0.36, 0.42], f3: [0.74, 0.32] }, new: { f3: [0.72, 0.32], f2: [1.0, 0.4], f1: [1.32, 0.4] } };
  const ACC = { old: { f1: [0, 0.7], f3: [0.74, 0.32] }, new: { f3: [0.72, 0.32], f1: [1.04, 0.72] } };
  // lipat kaku (opsi kaku: true): lipatan kedua baru mulai setelah lipatan pertama rata. Pada tabel bawaan f1 dan f2
  // tumpang tindih, sehingga panel pojok berputar mengitari engsel yang sedang berdiri dan tepi bersama terlepas
  // (tampak seperti kaca pecah). Dengan urutan ini setiap panel hanya berputar di engselnya: celah engsel 0.
  const PHASES_KAKU = { old: { f1: [0, 0.4], f2: [0.4, 0.38], f3: [0.78, 0.3] }, new: { f3: [0.72, 0.3], f2: [1.02, 0.36], f1: [1.38, 0.38] } };
  const timingOf = (o, mode) => o.timing || (o.kaku && (mode || o.mode) !== "accordion" ? PHASES_KAKU : null);
  /** celah engsel terbesar (px) sebuah pose: ujung tepi bersama antarpanel dipetakan oleh matriks masing-masing panel */
  function celahKaku(pose) {
    const P = pose.panels, pas = [];
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
      const A = P[a].r, B = P[b].r, ov = (a0, a1, b0, b1) => [Math.max(a0, b0), Math.min(a1, b1)];
      let seg = null;
      if (Math.abs(A[2] - B[0]) < 1e-6 || Math.abs(A[0] - B[2]) < 1e-6) { const x = Math.abs(A[2] - B[0]) < 1e-6 ? A[2] : A[0], [y0, y1] = ov(A[1], A[3], B[1], B[3]); if (y1 > y0) seg = [[x, y0], [x, y1]]; }
      else if (Math.abs(A[3] - B[1]) < 1e-6 || Math.abs(A[1] - B[3]) < 1e-6) { const y = Math.abs(A[3] - B[1]) < 1e-6 ? A[3] : A[1], [x0, x1] = ov(A[0], A[2], B[0], B[2]); if (x1 > x0) seg = [[x0, y], [x1, y]]; }
      if (seg) for (const [x, y] of seg) pas.push([ap(P[a].M, x, y), ap(P[b].M, x, y)]);
    }
    let m = 0; for (const [p, q] of pas) m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])); return m;
  }
  const sg = (t, a) => C.clamp((t - a[0]) / a[1]);
  function phases(tt, mode, timing) {
    const P = timing || (mode === "accordion" ? ACC : PHASES), O = P.old, N = P.new;
    const old = { f1: io(sg(tt, O.f1)), f2: O.f2 ? io(sg(tt, O.f2)) : 0, f3: Math.pow(sg(tt, O.f3), 2) };
    const nw = { f1: 1 - io(sg(tt, N.f1)), f2: N.f2 ? 1 - io(sg(tt, N.f2)) : 0, f3: Math.pow(1 - sg(tt, N.f3), 2) };
    return { old, nw, end: Math.max(N.f1[0] + N.f1[1], N.f2 ? N.f2[0] + N.f2[1] : 0) };
  }

  /* ---------------- textures ---------------- */
  function fibreTile(rng) {
    const s = C.offscreen(128, 128), f = s.getContext("2d"), d = f.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = 150 + (rng() - 0.5) * 80; d.data[i] = v + 30; d.data[i + 1] = v + 6; d.data[i + 2] = v - 30; d.data[i + 3] = 46; }
    f.putImageData(d, 0, 0);
    f.globalAlpha = 0.22; f.strokeStyle = "#6b4a22"; f.lineWidth = 0.7;
    for (let i = 0; i < 46; i++) { const x = rng() * 128, y = rng() * 128, a = (rng() - 0.5), l = 6 + rng() * 16; f.beginPath(); f.moveTo(x, y); f.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); f.stroke(); }
    return s;
  }
  // draw a source (image / canvas / function) into a texture canvas of w x h logical px at scale k
  function paint(tex, src, t, w, h, k) {
    const g = tex.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, tex.width, tex.height); g.setTransform(k, 0, 0, k, 0, 0);
    if (typeof src === "function") { g.save(); src(g, t, w, h); g.restore(); }
    else if (src && (src.width || src.naturalWidth)) g.drawImage(src, 0, 0, w, h);
  }
  // kraft back: the print's silhouette filled with a kraft gradient + fibre, ~13 % of the print showing through,
  // a light rim along the creases (site bakeBack())
  function kraft(back, front, o, w, h, k, fib, creases) {
    const g = back.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.clearRect(0, 0, back.width, back.height); g.drawImage(front, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0); g.globalCompositeOperation = "source-atop";
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, o.paperBack[0]); gr.addColorStop(1, o.paperBack[1]);
    g.globalAlpha = 1 - o.showThrough; g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (o.fibre > 0) { g.globalAlpha = o.fibre; g.fillStyle = g.createPattern(fib, "repeat"); g.fillRect(0, 0, w, h); }
    g.globalAlpha = 0.8;
    for (const [ax, v] of creases) {
      const R = 7, a = ax === "x" ? g.createLinearGradient(v - R, 0, v + R, 0) : g.createLinearGradient(0, v - R, 0, v + R);
      a.addColorStop(0, C.rgba(o.rim, 0)); a.addColorStop(0.5, o.rim); a.addColorStop(1, C.rgba(o.rim, 0));
      g.fillStyle = a; if (ax === "x") g.fillRect(v - R, 0, 2 * R, h); else g.fillRect(0, v - R, w, 2 * R);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }

  /* ---------------- mesh renderer ---------------- */
  // one textured cell: affine map from 3 texture points to 3 screen points, clipped to the (slightly grown) quad
  function cell(g, tex, k, uv, q) {
    const [u0, v0] = uv[0], [u1, v1] = uv[1], [u2, v2] = uv[3];
    const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[3];
    const du1 = (u1 - u0) * k, dv1 = (v1 - v0) * k, du2 = (u2 - u0) * k, dv2 = (v2 - v0) * k, det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-9) return;
    const dx1 = x1 - x0, dy1 = y1 - y0, dx2 = x2 - x0, dy2 = y2 - y0;
    const a = (dx1 * dv2 - dx2 * dv1) / det, c = (dx2 * du1 - dx1 * du2) / det, b = (dy1 * dv2 - dy2 * dv1) / det, d = (dy2 * du1 - dy1 * du2) / det;
    const e = x0 - a * u0 * k - c * v0 * k, f = y0 - b * u0 * k - d * v0 * k;
    const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    g.save(); g.beginPath();
    // grow the clip by ~0.75 px on both axes (thin cells too), so neighbouring cells overlap and no seam shows
    for (let i = 0; i < 4; i++) { const X = q[i][0] + Math.sign(q[i][0] - cx) * 0.75, Y = q[i][1] + Math.sign(q[i][1] - cy) * 0.75; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
    g.closePath(); g.clip();
    g.transform(a, b, c, d, e, f);
    const us = [u0, u1, uv[2][0], u2], vs = [v0, v1, uv[2][1], v2];
    const mg = Math.ceil(3 * k) + 1;   // texture margin so the grown clip never shows an empty edge
    const sx = Math.max(0, Math.floor(Math.min(...us) * k) - mg), sy = Math.max(0, Math.floor(Math.min(...vs) * k) - mg);
    const sw = Math.min(tex.width - sx, Math.ceil(Math.max(...us) * k) + mg - sx), sh = Math.min(tex.height - sy, Math.ceil(Math.max(...vs) * k) + mg - sy);
    if (sw > 0 && sh > 0) g.drawImage(tex, sx, sy, sw, sh, sx, sy, sw, sh);
    g.restore();
  }
  // draw one posed sheet into g (box-local coords): sorted panels, front print or kraft back, shading
  function drawSheet(g, pose, tex, back, k, o, w, h, flipX, flipY) {
    const p = o.perspective, ox = w / 2, oy = h / 2, n = Math.max(1, o.mesh | 0);
    // canonical fold -> mirror (direction) -> lay-down -> perspective about the box centre
    const MIR = [flipX ? -1 : 1, 0, 0, flipX ? w : 0, 0, flipY ? -1 : 1, 0, flipY ? h : 0, 0, 0, 1, 0];
    const post = layDown(pose.f3 || 0, mirRect(pose.packet || [0, 0, w, h], w, h, flipX, flipY), w, h);
    const proj = (P) => { const s = p / Math.max(1, p - P[2]); return [ox + (P[0] - ox) * s, oy + (P[1] - oy) * s]; };
    const uvOf = (x, y) => [flipX ? w - x : x, flipY ? h - y : y];
    const odd = flipX !== flipY;   // a single mirror flips the winding of every face
    const list = pose.panels.map((pn, i) => {
      const [x0, y0, x1, y1] = pn.r, M = post ? mul(post, mul(MIR, pn.M)) : mul(MIR, pn.M);
      const c3 = [ap(M, x0, y0), ap(M, x1, y0), ap(M, x1, y1), ap(M, x0, y1)];
      const zs = (c3[0][2] + c3[1][2] + c3[2][2] + c3[3][2]) / 4;
      // facing: signed area of the projected corners (unrotated, unmirrored panel = positive)
      const pr = c3.map(proj);
      let A = 0; for (let j = 0; j < 4; j++) { const a = pr[j], b = pr[(j + 1) % 4]; A += a[0] * b[1] - b[0] * a[1]; }
      return { pn, i, zs, M, front: (A > 0) !== odd };
    }).sort((a, b) => a.zs - b.zs || a.i - b.i);
    for (const L of list) {
      const { pn, front, M } = L, [x0, y0, x1, y1] = pn.r;
      if (x1 - x0 < 0.5 || y1 - y0 < 0.5) continue;
      const T = front ? tex : back;
      const grid = [];
      for (let j = 0; j <= n; j++) { const row = []; for (let i = 0; i <= n; i++) { const x = C.lerp(x0, x1, i / n), y = C.lerp(y0, y1, j / n); row.push([proj(ap(M, x, y)), uvOf(x, y)]); } grid.push(row); }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
        cell(g, T, k, [a[1], b[1], c[1], d[1]], [a[0], b[0], c[0], d[0]]);
      }
      // mountain/valley shading of the visible face (one exact polygon per panel)
      const sa = front ? pn.sf : pn.sb;
      if (sa > 0.004) {
        g.save(); g.globalAlpha = C.clamp(sa); g.fillStyle = front ? o.frontShade : o.shadeColor; g.beginPath();
        [grid[0][0], grid[0][n], grid[n][n], grid[n][0]].forEach((q, m) => (m ? g.lineTo(q[0][0], q[0][1]) : g.moveTo(q[0][0], q[0][1])));
        g.closePath(); g.fill(); g.restore();
      }
    }
  }

  const srcReady = (s) => (s && typeof s === "object" && s.complete === false && s.decode ? s.decode().catch(() => {}) : null);

  /* ---------------- canvas fold module ---------------- */
  const FOLD_DEFAULTS = {
    seed: 3, from: null, to: null, box: null, background: null,
    mode: "origami", panels: 4, axis: "x", direction: null, vertical: "down",
    start: 0.6, foldDuration: 1.82, hold: 0.8, timing: null, kaku: false,
    perspective: 1700, mesh: 6,
    paperBack: ["#c9a77a", "#e8d3ad"], showThrough: 0.13, fibre: 0.4, rim: "rgba(255,246,226,.95)",
    shadeColor: "#24160a", frontShade: "#000000", shadow: true, shadowColor: "rgba(38,22,6,.5)", texScale: null,
  };
  const foldDur = (o) => (o.duration ? o.duration : (o.start == null ? 0.6 : o.start) + (o.foldDuration || 1.82) * (phases(0, o.mode, timingOf(o)).end / 1.82) + (o.hold == null ? 0.8 : o.hold));
  function flips(o) {
    if (o.mode === "accordion") { const d = o.direction || (o.axis === "y" ? "down" : "right"); return [d === "left", d === "up"]; }
    return [(o.direction || "left") === "right", o.vertical === "up"];
  }
  const api = C.defineModule("paperFoldTransition", {
    aliases: { rigid: "kaku" },
    size: [640, 360],
    duration: foldDur,
    defaults: FOLD_DEFAULTS,
    setup(S) {
      S.fib = fibreTile(S.rng);
      const o = S.opts; S.ready = Promise.all([srcReady(o.from), srcReady(o.to)]);
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, B = o.box || { x: 0, y: 0, w: W, h: H }, w = B.w, h = B.h;
      if (typeof o.background === "function") { g.save(); o.background(g, t, W, H); g.restore(); }
      else if (o.background) { g.fillStyle = o.background; g.fillRect(0, 0, W, H); }
      const tr = g.getTransform ? g.getTransform() : { a: 1, b: 0 }, k = o.texScale || Math.max(1, Math.hypot(tr.a, tr.b));
      const tt = (t - o.start) * (1.82 / o.foldDuration), ph = phases(tt, o.mode, timingOf(o));
      const [fx, fy] = flips(o);
      const tw = Math.ceil(w * k), th = Math.ceil(h * k), cache = S.cache;
      const texFor = (key, src) => {
        let c = cache[key];
        if (!c || c.tex.width !== tw || c.tex.height !== th) c = cache[key] = { tex: C.offscreen(tw, th), back: C.offscreen(tw, th), static: false, t: NaN };
        const dyn = typeof src === "function";
        if (dyn ? c.t !== t : !c.static) {
          paint(c.tex, src, t, w, h, k);
          const cr = o.mode === "accordion" ? Array.from({ length: (o.panels | 0) - 1 }, (_, i) => [o.axis === "y" ? "y" : "x", ((i + 1) * (o.axis === "y" ? h : w)) / o.panels]) : [["x", w / 2], ["y", h / 2]];
          kraft(c.back, c.tex, o, w, h, k, S.fib, cr);
          c.static = !dyn; c.t = t;
        }
        return c;
      };
      const flat = (src) => { if (typeof src === "function") { g.save(); g.translate(B.x, B.y); g.beginPath(); g.rect(0, 0, w, h); g.clip(); src(g, t, w, h); g.restore(); } else if (src) g.drawImage(src, B.x, B.y, w, h); };
      const poseOf = (f) => (o.mode === "accordion" ? accordionPose(f.f1, f.f3, w, h, Math.max(2, o.panels | 0), o.axis) : origamiPose(f.f1, f.f2, f.f3, w, h));
      const isRest = (f) => f.f1 < 1e-4 && f.f2 < 1e-4 && f.f3 < 1e-4;
      // the old sheet (until it has faded), then the new one (once it is standing up)
      const drawOne = (f, key, src) => {
        if (!src) return;
        if (isRest(f)) { flat(src); return; }
        const P = poseOf(f); if (P.alpha <= 0.002) return;
        if (o.shadow && P.shadow > 0.003) {
          g.save(); g.translate(B.x, B.y); g.globalAlpha = C.clamp(P.shadow);
          const sx = w * 0.5, sy = Math.min(h * 0.84, h) + Math.min(130, h * 0.13) / 2, rx = w * 0.3, ry = Math.min(130, h * 0.13) / 2;
          g.translate(sx, sy); g.scale(1, ry / rx);
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, o.shadowColor); gr.addColorStop(0.55, C.rgba(o.shadowColor, 0.2)); gr.addColorStop(1, C.rgba(o.shadowColor, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
        }
        const T = texFor(key, src);
        if (P.alpha >= 0.999) { g.save(); g.translate(B.x, B.y); drawSheet(g, P, T.tex, T.back, k, o, w, h, fx, fy); g.restore(); return; }
        // group opacity: render the sheet into a layer, then composite once
        const cw = g.canvas.width, chh = g.canvas.height;
        let L = cache.layer; if (!L || L.width !== cw || L.height !== chh) L = cache.layer = C.offscreen(cw, chh);
        const lg = L.getContext("2d"); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, cw, chh);
        lg.setTransform(tr.a, tr.b, tr.c, tr.d, tr.e, tr.f); lg.translate(B.x, B.y);
        drawSheet(lg, P, T.tex, T.back, k, o, w, h, fx, fy);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = P.alpha; g.drawImage(L, 0, 0); g.restore();
      };
      const oldDone = ph.old.f3 >= 1, newStarted = ph.nw.f3 < 1;
      if (tt <= 0) { flat(o.from); return; }
      if (tt >= ph.end) { flat(o.to); return; }
      if (!oldDone) drawOne(ph.old, "from", o.from);
      if (newStarted) drawOne(ph.nw, "to", o.to);
    },
  });

  /* ---------------- DOM fold module ---------------- */
  const domApi = C.defineModule("paperFoldTransitionDOM", {
    aliases: { rigid: "kaku" },
    size: [640, 360], dom: true,
    duration: foldDur,
    defaults: Object.assign({}, FOLD_DEFAULTS, { mode: "origami" }),
    mount(el, S) {
      const o = S.opts;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      const w = (S.w = o.width || el.clientWidth || S.W), h = (S.h = o.height || el.clientHeight || S.H), hw = Math.round(w / 2), hh = Math.round(h / 2);
      const pick = (src, i) => { if (typeof src === "string") { const d = document.createElement("div"); d.innerHTML = src; return d; } return src || el.children[i]; };
      const A = pick(o.from, 0), B = pick(o.to, 1);
      S.orig = [A, B];
      [A, B].forEach((n) => { if (n && n.parentNode !== el) el.appendChild(n); if (n) Object.assign(n.style, { position: "absolute", left: "0px", top: "0px", width: w + "px", height: h + "px", margin: "0", boxSizing: "border-box" }); });
      const clone = (n) => { const c = n.cloneNode(true); c.removeAttribute("id"); c.querySelectorAll && c.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id")); Object.assign(c.style, { position: "absolute", left: "0px", top: "0px", width: w + "px", height: h + "px", margin: "0", visibility: "visible", display: "" }); return c; };
      const div = (css, par) => { const d = document.createElement("div"); Object.assign(d.style, css); if (par) par.appendChild(d); return d; };
      const [fx, fy] = flips(o);
      const pk = mirRect([hw, hh, w, h], w, h, fx, fy); S.pk = [(pk[0] + pk[2]) / 2, pk[3]];
      const fibre = "repeating-linear-gradient(17deg, rgba(107,74,34,.07) 0 1px, transparent 1px 7px), repeating-linear-gradient(-31deg, rgba(255,255,255,.05) 0 1px, transparent 1px 9px)";
      const mkSheet = (src) => {
        const layer = div({ position: "absolute", left: "0px", top: "0px", width: w + "px", height: h + "px", perspective: o.perspective + "px", pointerEvents: "none" }, el);
        const shadow = div({ position: "absolute", left: w * 0.2 + "px", width: w * 0.6 + "px", top: h * 0.84 + "px", height: Math.min(130, h * 0.13) + "px", opacity: "0", background: `radial-gradient(closest-side, ${o.shadowColor}, ${C.rgba(o.shadowColor, 0.2)} 55%, transparent)` }, layer);
        if (!o.shadow) shadow.style.display = "none";
        const p3 = { position: "absolute", transformStyle: "preserve-3d" };
        // layer (perspective) > post (lay-down, final space) > mir (direction mirror) > sh (the folding sheet)
        const full = { left: "0px", top: "0px", width: w + "px", height: h + "px" };
        const post = div(Object.assign({}, full, p3, { transformOrigin: `${S.pk[0]}px ${S.pk[1]}px` }), layer);
        const mir = div(Object.assign({}, full, p3, { transform: fx || fy ? `scale3d(${fx ? -1 : 1}, ${fy ? -1 : 1}, 1)` : "none" }), post);
        const sh = div(Object.assign({}, full, p3), mir);
        const half = (y, hgt) => div(Object.assign({ left: "0px", top: y + "px", width: w + "px", height: hgt + "px" }, p3), sh);
        const bot = half(hh, h - hh), top = half(0, hh); top.style.transformOrigin = `50% ${hh}px`;
        const hinge = (par, hgt) => div(Object.assign({ left: "0px", top: "0px", width: hw + "px", height: hgt + "px", transformOrigin: `${hw}px 50%` }, p3), par);
        const panel = (par, x, y, pw, ph, oX, oY, backFlip, hasBack) => {
          const pn = div(Object.assign({ left: x + "px", top: y + "px", width: pw + "px", height: ph + "px" }, p3), par);
          const face = { position: "absolute", left: "0px", top: "0px", width: pw + "px", height: ph + "px", overflow: "hidden", backfaceVisibility: "hidden", webkitBackfaceVisibility: "hidden" };
          const fr = div(face, pn); const c = clone(src); c.style.left = -oX + "px"; c.style.top = -oY + "px"; fr.appendChild(c);
          // mirrored construction (direction "right" / vertical "up"): the layer is mirrored, the print is mirrored back
          if (fx || fy) Object.assign(c.style, { transformOrigin: "0 0", transform: `matrix(${fx ? -1 : 1},0,0,${fy ? -1 : 1},${fx ? w : 0},${fy ? h : 0})` });
          const s1 = div({ position: "absolute", inset: "0", background: o.frontShade, opacity: "0" }, fr);
          let s2 = { style: {} };
          if (hasBack) {
            const bk = div(Object.assign({}, face, { transform: backFlip, background: `${fibre}, linear-gradient(135deg, ${o.paperBack[0]}, ${o.paperBack[1]})` }), pn);
            // print seen through the paper: per axis x -> s*x + d in clone coords (reflection about the panel centre,
            // or the matching translation when the construction itself is mirrored)
            const ax = (flipB, mir, cp, size) => (flipB ? (mir ? [1, 2 * cp - size] : [-1, 2 * cp]) : mir ? [-1, size] : [1, 0]);
            const [sx, dx] = ax(backFlip.includes("Y"), fx, oX + pw / 2, w), [sy, dy] = ax(backFlip.includes("X"), fy, oY + ph / 2, h);
            const ghost = clone(src); Object.assign(ghost.style, { left: -oX + "px", top: -oY + "px", opacity: String(o.showThrough), transformOrigin: "0 0", transform: `matrix(${sx},0,0,${sy},${dx},${dy})`, mixBlendMode: "multiply" });
            bk.appendChild(ghost);
            div({ position: "absolute", inset: "0", boxShadow: "inset 0 0 0 1.5px rgba(255,246,226,.6)" }, bk);
            s2 = div({ position: "absolute", inset: "0", background: o.shadeColor, opacity: "0" }, bk);
          }
          return { s1, s2 };
        };
        const BR = panel(bot, hw, 0, w - hw, h - hh, hw, hh, "rotateX(180deg)", false);
        const blh = hinge(bot, h - hh), BL = panel(blh, 0, 0, hw, h - hh, 0, hh, "rotateY(180deg)", true);
        const TR = panel(top, hw, 0, w - hw, hh, hw, 0, "rotateX(180deg)", true);
        const tlh = hinge(top, hh), TL = panel(tlh, 0, 0, hw, hh, 0, 0, "rotateY(180deg)", true);
        return { layer, shadow, post, sh, top, blh, tlh, P: [BR, BL, TR, TL] };
      };
      S.sheets = [A, B].map((n) => (n ? mkSheet(n) : null));
    },
    render(el, t, S) {
      const o = S.opts, w = S.w, h = S.h, tt = (t - o.start) * (1.82 / o.foldDuration), ph = phases(tt, "origami", timingOf(o, "origami"));
      const pose = (Sh, f1, f2, f3) => {
        const a1 = 180 * f1, a2 = -180 * f2;
        Sh.blh.style.transform = Sh.tlh.style.transform = `translateZ(${(f1 * 2).toFixed(2)}px) rotateY(${a1.toFixed(2)}deg)`;
        Sh.top.style.transform = `translateZ(${(f2 * 6).toFixed(2)}px) rotateX(${a2.toFixed(2)}deg)`;
        const [cx, by] = S.pk;
        Sh.post.style.transform = f3 > 0 ? `translate3d(${((w / 2 - cx) * f3).toFixed(1)}px, ${((h - by + h * 0.06) * f3).toFixed(1)}px, 0) rotateX(${(84 * f3).toFixed(1)}deg)` : "none";
        Sh.post.style.opacity = f3 > 0.55 ? (1 - (f3 - 0.55) / 0.45).toFixed(3) : "1";
        Sh.shadow.style.opacity = (f2 * Math.min(1, 0.35 + f3 * 1.6) * (f3 > 0.7 ? 1 - (f3 - 0.7) / 0.3 : 1)).toFixed(3);
        const m1 = Math.sin(PI * f1), m2 = Math.sin(PI * f2), [BR, BL, TR, TL] = Sh.P;
        BL.s1.style.opacity = TL.s1.style.opacity = (m1 * 0.55).toFixed(3);
        BL.s2.style.opacity = TL.s2.style.opacity = (m1 * 0.45 + 0.1).toFixed(3);
        TR.s1.style.opacity = (m2 * 0.5 + m1 * 0.25).toFixed(3); TR.s2.style.opacity = (m2 * 0.45 + 0.08).toFixed(3);
        BR.s1.style.opacity = (m1 * 0.22 + m2 * 0.3).toFixed(3);
      };
      const [A, B] = S.orig, [SA, SB] = S.sheets;
      const before = tt <= 0, after = tt >= ph.end;
      if (A) A.style.visibility = before ? "visible" : "hidden";
      if (B) B.style.visibility = after ? "visible" : "hidden";
      if (SA) { const on = !before && !after && ph.old.f3 < 1; SA.layer.style.display = on ? "" : "none"; if (on) pose(SA, ph.old.f1, ph.old.f2, ph.old.f3); }
      if (SB) { const on = !before && !after && ph.nw.f3 < 1; SB.layer.style.display = on ? "" : "none"; if (on) pose(SB, ph.nw.f1, ph.nw.f2, ph.nw.f3); }
    },
  });
  api.createDOM = domApi.create;
  api.dom = domApi;

  /* ---------------- portal: hole in the front scene + camera push-through ---------------- */
  function holeBox(o) {
    if (o.hole) return o.hole;
    const c = o.center || [o.width / 2, o.height / 2], r = o.radius == null ? 120 : o.radius, rx = Array.isArray(r) ? r[0] : r, ry = Array.isArray(r) ? r[1] : r;
    return { x: c[0] - rx, y: c[1] - ry, w: rx * 2, h: ry * 2 };
  }
  function holePath(g, o, hb) {
    const { x, y, w, h } = hb, sh = o.shape || "arch";
    g.beginPath();
    if (sh === "circle" || sh === "ellipse") g.ellipse(x + w / 2, y + h / 2, w / 2, sh === "circle" ? w / 2 : h / 2, 0, 0, TAU);
    else if (sh === "rect") g.rect(x, y, w, h);
    else if (sh === "poly" && o.poly) o.poly.forEach(([u, v], i) => (i ? g.lineTo(x + u * w, y + v * h) : g.moveTo(x + u * w, y + v * h)));
    else { const r = w / 2; g.moveTo(x, y + h); g.lineTo(x, y + r); g.arc(x + r, y + r, r, PI, TAU); g.lineTo(x + w, y + h); }
    g.closePath();
  }
  // how far the camera must push (around origin) so the opening covers the whole frame (site coverScale())
  function coverScale(hb, org, W, H) {
    const L = hb.x, R = hb.x + hb.w, B = hb.y + hb.h, T = hb.y + hb.h * 0.22, [cx, cy] = org;
    const k = Math.max(cx / Math.max(1, cx - L), (W - cx) / Math.max(1, R - cx), cy / Math.max(1, cy - T), B > cy ? (H - cy) / Math.max(1, B - cy) : 1);
    return Math.min(18, Math.max(2.5, k * 1.18));
  }
  const orbSprite = (core, mid) => { const s = C.offscreen(64, 64), g = s.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, core); rg.addColorStop(0.16, mid); rg.addColorStop(0.45, C.rgba(mid, 0.12)); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return s; };
  const portalApi = C.defineModule("paperFoldPortal", {
    size: [1280, 720],
    duration: (o) => o.duration || (o.start == null ? 0.5 : o.start) + (o.zoom || 2.5) + (o.hold == null ? 0.5 : o.hold),
    defaults: {
      seed: 9, from: null, to: null, shape: "arch", hole: null, center: null, radius: null, poly: null, origin: null,
      start: 0.5, zoom: 2.5, ease: "inQuad", cover: "auto", keys: null, toScale: [0.8, 1], toDuration: null,
      flash: true, flashColor: "#ffe6b0", flashStrength: 0.5, toBackground: "#050816", motes: 180, moteColors: [["rgba(255,250,236,1)", "rgba(255,236,196,.7)"], ["rgba(255,232,178,1)", "rgba(226,184,110,.7)"], ["rgba(230,240,255,1)", "rgba(170,196,255,.6)"]], hold: 0.5,
    },
    setup(S) {
      const o = S.opts, R = S.rng; o.width = o.width || S.W; o.height = o.height || S.H;
      S.ORB = o.moteColors.map(([a, b]) => orbSprite(a, b));
      S.motes = Array.from({ length: o.motes | 0 }, () => { const a = R() * TAU, r = Math.sqrt(R()); return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0.08 + R() * 0.97, c: R() < 0.45 ? 1 : R() < 0.25 ? 2 : 0, s: 0.5 + R(), ph: R() * TAU }; });
      // warp speed v(t) (site: .05 -> .32 over 1.2 s, then -> 2.6 over the push), integrated once into a depth table
      const st = o.start, Z = o.zoom, D = [0], dt = 1 / 120, N = Math.ceil(((st + Z + 2) / dt));
      const vAt = (t) => (t < st ? 0.05 : t < st + 1.2 ? C.lerp(0.05, 0.32, C.ease.sine(C.seg(t, st, st + 1.2))) : C.lerp(0.32, 2.6, C.ease.inQuad(C.seg(t, st + 1.2, st + Z))));
      for (let i = 1; i <= N; i++) D.push(D[i - 1] + vAt((i - 0.5) * dt) * dt);
      S.depth = (t) => { const f = C.clamp(t / dt, 0, N), i = Math.floor(f); return i >= N ? D[N] : C.lerp(D[i], D[i + 1], f - i); };
      S.vAt = vAt;
      S.ready = Promise.all([srcReady(o.from), srcReady(o.to)]);
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, hb = holeBox(o);
      const org = o.origin || [hb.x + hb.w / 2, hb.y + hb.h * 0.62];
      const kc = o.cover === "auto" ? coverScale(hb, org, W, H) : o.cover;
      const z = o.keys ? C.key(o.keys, t) : 1 + (kc - 1) * (C.ease[o.ease] || C.ease.inQuad)(C.seg(t, o.start, o.start + o.zoom));
      const through = !o.keys && t >= o.start + o.zoom;
      // the scene behind comes forward to meet the camera
      const ts = C.lerp(o.toScale[0], o.toScale[1], C.ease.outQuad(C.seg(t, o.start, o.start + (o.toDuration || o.zoom))));
      if (o.toBackground) { g.fillStyle = o.toBackground; g.fillRect(0, 0, W, H); }
      // scaled about the zoom origin, never smaller than needed to fill the visible opening (no empty band)
      const hx0 = Math.max(0, org[0] + (hb.x - org[0]) * z), hx1 = Math.min(W, org[0] + (hb.x + hb.w - org[0]) * z);
      const hy0 = Math.max(0, org[1] + (hb.y - org[1]) * z), hy1 = Math.min(H, org[1] + (hb.y + hb.h - org[1]) * z);
      const need = Math.max(org[0] > 0 ? (org[0] - hx0) / org[0] : 0, W > org[0] ? (hx1 - org[0]) / (W - org[0]) : 0, org[1] > 0 ? (org[1] - hy0) / org[1] : 0, H > org[1] ? (hy1 - org[1]) / (H - org[1]) : 0);
      const tsc = Math.min(1, Math.max(ts, need));
      g.save(); g.translate(org[0], org[1]); g.scale(tsc, tsc); g.translate(-org[0], -org[1]);
      if (typeof o.to === "function") o.to(g, t, W, H); else if (o.to) g.drawImage(o.to, 0, 0, W, H);
      g.restore();
      if (through) return;
      const cam = (c) => { c.translate(org[0], org[1]); c.scale(z, z); c.translate(-org[0], -org[1]); };
      // light from the opening (inside the hole, over the scene behind)
      if (o.flash) {
        const fa = o.flashStrength * C.ease.outQuad(C.seg(t, o.start + 0.25, o.start + 0.75)) * (1 - 0.5 * C.seg(t, o.start + 0.75, o.start + 1.6) + 0.3 * C.seg(t, o.start + 1.6, o.start + o.zoom));
        if (fa > 0.003) {
          g.save(); cam(g); holePath(g, o, hb); g.clip();
          const cx = hb.x + hb.w / 2, cy = hb.y + hb.h * 0.55, gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(hb.w, hb.h) * 0.7);
          gr.addColorStop(0, C.rgba(o.flashColor, 0.9)); gr.addColorStop(0.5, C.rgba(o.flashColor, 0.35)); gr.addColorStop(1, C.rgba(o.flashColor, 0));
          g.globalAlpha = C.clamp(fa); g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(hb.x, hb.y, hb.w, hb.h); g.restore();
        }
      }
      // the front scene with the hole punched in the same draw (layer, so the hole never shows the canvas below)
      const tr = g.getTransform(), cw = g.canvas.width, chh = g.canvas.height;
      let L = S.cache.layer; if (!L || L.width !== cw || L.height !== chh) L = S.cache.layer = C.offscreen(cw, chh);
      const lg = L.getContext("2d"); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = "source-over"; lg.globalAlpha = 1; lg.clearRect(0, 0, cw, chh);
      lg.setTransform(tr.a, tr.b, tr.c, tr.d, tr.e, tr.f); lg.save(); cam(lg);
      if (typeof o.from === "function") o.from(lg, t, W, H); else if (o.from) lg.drawImage(o.from, 0, 0, W, H);
      if (t >= o.start || o.keys) { lg.globalCompositeOperation = "destination-out"; holePath(lg, o, hb); lg.fill(); lg.globalCompositeOperation = "source-over"; }
      lg.restore();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(L, 0, 0); g.restore();
      // motes blowing out of the opening toward the camera (site drawWarp(), closed form via the depth table)
      const wa = C.ease.outQuad(C.seg(t, o.start + 0.25, o.start + 0.85)) * (1 - C.seg(t, o.start + o.zoom - 0.45, o.start + o.zoom));
      if (wa > 0.005 && S.motes.length) {
        const hx = org[0] + (hb.x + hb.w / 2 - org[0]) * z, hy = org[1] + (hb.y + hb.h * 0.55 - org[1]) * z, hw = (hb.w / 2) * z, hh = (hb.h / 2) * z;
        const d = S.depth(t), v = S.vAt(t);
        g.save(); g.globalCompositeOperation = "lighter";
        for (const m of S.motes) {
          const zz = 0.045 + ((((m.z - 0.045 - d) % 1.0) + 1.0) % 1.0);
          const sx = hx + (m.x * hw * 0.95) / zz, sy = hy + (m.y * hh * 0.95) / zz;
          if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
          const sz = Math.min(W < 700 ? 40 : 58, (m.s * 4.6) / Math.pow(zz, 0.9)) * Math.min(1, z * 0.6 + 0.4) * (W / 1280 + 0.25) / 1.25;
          const al = wa * Math.min(1, (1.06 - zz) * 3) * (0.7 + 0.3 * Math.sin(t * 6 + m.ph)) * (zz < 0.25 ? 0.55 : 1);
          if (al < 0.01) continue;
          const z0 = zz + v * 0.05, bx = hx + (m.x * hw * 0.95) / z0 - sx, by = hy + (m.y * hh * 0.95) / z0 - sy;
          for (let j = 2; j >= 0; j--) { const u = j / 3, q = sz * (1 - u * 0.35); g.globalAlpha = al * (1 - u * 0.6); g.drawImage(S.ORB[m.c % S.ORB.length], sx + bx * u - q, sy + by * u - q, q * 2, q * 2); }
        }
        g.restore();
      }
    },
  });
  function portal(ctx, t, opts) { return portalApi.render(ctx, t, opts); }
  portal.create = portalApi.create;
  portal.api = portalApi;
  api.portal = portal;
  api.lib = { origamiPose, accordionPose, drawSheet, phases, holePath, coverScale, mul, RX, RY, T3, about, celahKaku, PHASES, PHASES_KAKU, timingOf };
  MGP.paperFoldTransition = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
