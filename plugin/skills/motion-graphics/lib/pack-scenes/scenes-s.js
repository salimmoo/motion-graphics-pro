/* MGP pack-scenes/scenes-s.js - trend style SULAM KERTAS (stitched paper): felt and layered paper pieces on cream cotton
   paper, every edge sewn with a running stitch, sky/water/flowers worked in thread (satin stitch, french knots), fabric
   label tags with cross-stitch ends. Drawn fully in code (no image assets). Motion on twos (12 fps boil), stitches
   "sewn on" at the start, a slow dusk light change, labels that drop in on a spring. Variant: "kota" (riverside town at dusk). */
(function (root) {
  const MGP = (root.MGP = root.MGP || {});
  const PS = MGP.paket && MGP.paket._engine; if (!PS) return; const X = PS.X;

  // ---------- helpers: felt piece, running stitch, satin leaf, french knot, fabric tag
  function felt(c, path, col, S, sh = 1) {
    c.save(); X.shadow(c, 6 * sh, 3 * sh, "rgba(60,40,20,.28)"); c.fillStyle = col; c.beginPath(); path(c); c.fill(); X.noShadow(c);
    c.clip(); c.globalAlpha = .5; X.paper(c, S.W, S.H, col, .5); c.restore();
  }
  function stitch(c, path, col, w, p = 1, dash = [5, 3.5]) {   // running stitch; p < 1 = still being sewn (fades in)
    if (p <= 0) return;
    c.save(); c.globalAlpha *= X.clamp(p * 1.3); c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.setLineDash(dash);
    c.beginPath(); path(c); c.stroke(); c.restore();
  }
  function knot(c, x, y, r, col) {   // french knot: dot + twist highlight
    c.fillStyle = X.shade(col, -.25); X.circle(c, x, y + r * .25, r); c.fill();
    c.fillStyle = col; X.circle(c, x, y, r); c.fill();
    c.strokeStyle = X.shade(col, .45); c.lineWidth = Math.max(.6, r * .35); c.beginPath(); c.arc(x, y, r * .55, -2.4, -.6); c.stroke();
  }
  function leaf(c, x, y, len, ang, col) {   // satin-stitch leaf: shape + slanted thread lines + midrib
    c.save(); c.translate(x, y); c.rotate(ang);
    const shape = (g) => { g.moveTo(0, 0); g.quadraticCurveTo(len * .5, -len * .32, len, 0); g.quadraticCurveTo(len * .5, len * .32, 0, 0); };
    c.fillStyle = col; c.beginPath(); shape(c); c.fill(); c.save(); c.beginPath(); shape(c); c.clip();
    c.strokeStyle = X.shade(col, .22); c.lineWidth = .9; for (let i = -len; i < len * 1.2; i += 2.6) { c.beginPath(); c.moveTo(i, -len); c.lineTo(i + len * .6, len); c.stroke(); }
    c.restore(); c.strokeStyle = X.shade(col, -.3); c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(len * .92, 0); c.stroke(); c.restore();
  }
  function tag(c, S, txt, x, y, size, accent, ink, bg, a, rot) {
    if (a <= 0.01) return;
    c.save(); X.font(c, 700, size, S.f1); const tw = c.measureText(txt).width, w = tw + size * 2.4, h = size * 1.9;
    c.translate(x, y); c.rotate(rot); c.globalAlpha = X.clamp(a);
    X.shadow(c, 8, 4, "rgba(60,40,15,.3)"); c.fillStyle = bg; X.rr(c, -w / 2, -h / 2, w, h, 4); c.fill(); X.noShadow(c);
    stitch(c, (g) => X.rr(g, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 2), X.a(accent, .7), 1.2, 1, [4, 3]);
    c.strokeStyle = accent; c.lineWidth = 2; c.lineCap = "round";
    [-1, 1].forEach((s) => { const cx = s * (w / 2 - size * .62), r = size * .22; c.beginPath(); c.moveTo(cx - r, -r); c.lineTo(cx + r, r); c.moveTo(cx + r, -r); c.lineTo(cx - r, r); c.stroke(); });
    c.fillStyle = ink; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, size * .06); c.restore();
  }

  PS.def("sulam", (c, t, S) => kota(c, t, S));

  function kota(c, t, S) {
    const { W, H, pal: p } = S, T = X.stepT(t, 12), j = (k, a = .6) => X.wob(k, T * 6, a, 1);   // boil on twos
    const sew = X.E(t, 0, 1.6, "out"), dusk = .5 - .5 * Math.cos(t / PS.L * Math.PI * 2);
    // cotton paper base
    c.fillStyle = p[1]; c.fillRect(0, 0, W, H); X.paper(c, W, H, p[1], .6);
    // sky panel (felt) + dusk tint
    const sky = X.mix(X.mix(p[3], "#ffffff", .45), "#F4C7A6", dusk * .6);
    const skyP = (g) => X.rr(g, 14, 14, W - 28, H * .58, 10);
    felt(c, skyP, sky, S, .6); stitch(c, (g) => X.rr(g, 20, 20, W - 40, H * .58 - 12, 7), X.a(p[0], .45), 1.1, sew);
    // embroidered sun: satin rays turning on twos
    const sx = W * .72, sy = H * (.2 + .05 * dusk), sr = W * .075, sunC = X.mix(p[4], p[2], dusk * .6);
    c.save(); c.translate(sx, sy); c.rotate(T * .25); c.strokeStyle = sunC; c.lineCap = "round"; c.lineWidth = 2.2;
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * sr * 1.25, Math.sin(a) * sr * 1.25); c.lineTo(Math.cos(a) * sr * (1.6 + .12 * (i % 2)), Math.sin(a) * sr * (1.6 + .12 * (i % 2))); c.stroke(); }
    c.restore();
    c.fillStyle = sunC; X.circle(c, sx, sy, sr); c.fill();
    c.save(); X.circle(c, sx, sy, sr); c.clip(); c.strokeStyle = X.shade(sunC, .3); c.lineWidth = 1;
    for (let r = 2; r < sr; r += 3) { c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.stroke(); } c.restore();
    // stitched clouds drifting
    [[.18, .14, 1], [.5, .09, .8], [.86, .3, .9], [.3, .33, .7]].forEach(([cx0, cy0, s], i) => {
      const cx = ((cx0 * W + t * (5 + i * 2)) % (W + 80)) - 40, cy = H * cy0 + j(i + 3, .8), r = W * .045 * s;
      const cl = (g) => { g.moveTo(cx - r * 2.2, cy + r * .6); [[-1.4, 0, 1], [-.3, -.5, 1.3], [.9, -.1, 1.05], [1.8, .3, .8]].forEach(([dx, dy, k]) => g.arc(cx + dx * r, cy + dy * r, r * k, Math.PI, 0)); g.lineTo(cx + r * 2.6, cy + r * .6); g.closePath(); };
      felt(c, cl, X.mix("#ffffff", p[2], .12 + dusk * .2), S, .5);
      stitch(c, (g) => { g.moveTo(cx - r * 2, cy + r * .4); g.lineTo(cx + r * 2.4, cy + r * .4); }, X.a(p[0], .35), .9, sew);
    });
    // far hills (felt layers) with stitched ridges
    const hill = (y0, amp, f, ph, col, k) => {
      const path = (g) => { g.moveTo(0, H); g.lineTo(0, y0); for (let x = 0; x <= W; x += 8) g.lineTo(x, y0 - amp * (.5 + .5 * Math.sin(x / W * f + ph)) + j(k + x * .01, .4)); g.lineTo(W, H); g.closePath(); };
      felt(c, path, col, S, .8);
      stitch(c, (g) => { for (let x = 0; x <= W; x += 8) { const y = y0 + 5 - amp * (.5 + .5 * Math.sin(x / W * f + ph)); x ? g.lineTo(x, y) : g.moveTo(x, y); } }, X.a(X.shade(col, .5), .8), 1, sew);
    };
    hill(H * .47, H * .06, 5, .6, X.mix(p[3], p[0], .25), 11);
    hill(H * .52, H * .05, 7, 2.1, X.mix(p[3], p[1], .15), 12);
    // round felt trees on the hills
    for (let i = 0; i < 5; i++) {
      const tx = W * (.08 + i * .21) + j(40 + i, .4), ty = H * (.5 + .015 * (i % 2)), tr = W * (.035 + .012 * X.hash(i * 4));
      c.fillStyle = X.shade(p[0], -.1); c.fillRect(tx - 1.5, ty, 3, tr * 1.1);
      felt(c, (g) => X.circle(g, tx, ty, tr), X.mix(p[3], "#4f7d45", .6 + .1 * (i % 2)), S, .6);
      stitch(c, (g) => g.arc(tx, ty, tr * .7, -2.6, -.6), X.a("#ffffff", .55), .9, sew);
    }
    // town row: small felt houses with gaps, roofs, windows that light up at dusk
    const HB = H * .6;
    for (let i = 0; i < 6; i++) {
      const hw = W * (.1 + .025 * X.hash(i * 3)), hx = W * .03 + i * W * .16 + (i % 2) * 4, hh = H * (.045 + .03 * X.hash(i * 7)), top = HB - hh + j(20 + i, .3);
      const wall = [X.mix(p[1], "#ffffff", .2), X.mix(p[4], p[1], .35), X.mix(p[3], p[1], .3), X.mix(p[2], p[1], .45)][i % 4], roof = X.mix(p[2], p[0], .1 + .2 * (i % 3));
      felt(c, (g) => g.rect(hx, top, hw, hh), wall, S, .7);
      felt(c, (g) => { g.moveTo(hx - 3, top + 2); g.lineTo(hx + hw / 2, top - hh * .55); g.lineTo(hx + hw + 3, top + 2); g.closePath(); }, roof, S, .7);
      stitch(c, (g) => g.rect(hx + 2.5, top + 2.5, hw - 5, hh - 5), X.a(p[0], .45), .8, sew, [3.5, 2.5]);
      const lit = X.clamp((dusk - .3 - X.hash(i) * .3) * 4), wc = X.mix(X.shade(wall, -.4), p[4], lit);
      c.fillStyle = wc; c.fillRect(hx + hw * .25, top + hh * .32, hw * .17, hh * .28); c.fillRect(hx + hw * .58, top + hh * .32, hw * .17, hh * .28);
      c.fillStyle = X.shade(wall, -.45); c.fillRect(hx + hw * .42, top + hh * .62, hw * .16, hh * .38);
      if (lit > .2) X.glow(c, hx + hw / 2, top + hh * .45, hw * .7, p[4], .3 * lit);
    }
    // river of thread: rows of running stitches sliding on twos
    const WY = HB, WHt = H * .13;
    felt(c, (g) => g.rect(0, WY, W, WHt), X.mix(p[3], p[0], .2), S, .4);
    for (let r = 0; r < 6; r++) {
      const y = WY + 6 + r * (WHt - 10) / 5, off = (T * (10 + r * 3)) % 14;
      stitch(c, (g) => { g.moveTo(-14 + off, y); g.lineTo(W + 14, y); }, X.a("#ffffff", .55 - r * .05), 1.3, sew, [6, 8]);
    }
    // felt boat with a sail, bobbing
    const bx = W * (.25 + .5 * X.seg(t, 0, PS.L)), by = WY + WHt * .45 + Math.sin(T * 3) * 2;
    c.save(); c.translate(bx, by); c.rotate(Math.sin(T * 3 + 1) * .05);
    felt(c, (g) => { g.moveTo(-26, 0); g.lineTo(26, 0); g.lineTo(18, 10); g.lineTo(-18, 10); g.closePath(); }, X.shade(p[2], -.25), S, .8);
    felt(c, (g) => { g.moveTo(2, -4); g.lineTo(2, -40); g.lineTo(22, -6); g.closePath(); }, X.mix("#ffffff", p[1], .4), S, .6);
    stitch(c, (g) => { g.moveTo(-20, 5); g.lineTo(20, 5); }, X.a("#ffffff", .7), 1, sew);
    c.restore();
    // ground band (felt) with a stitched path
    felt(c, (g) => g.rect(0, WY + WHt, W, H - WY - WHt), X.mix(p[4], p[1], .45), S, .4);
    stitch(c, (g) => { g.moveTo(0, WY + WHt + 14); g.bezierCurveTo(W * .3, WY + WHt + 40, W * .6, WY + WHt + 8, W, WY + WHt + 30); }, X.a(p[0], .35), 1.2, sew, [7, 5]);
    // foreground embroidery: leafy branches and french-knot flowers framing the bottom
    const sway = (k) => Math.sin(t * 1.2 + k) * .05 + j(k, .01);
    [[-6, H * 1.0, -1.0, 0], [W + 6, H * .99, -2.15, 1], [W * .42, H + 10, -1.45, 2]].forEach(([x0, y0, a0, k]) => {
      for (let i = 0; i < 9; i++) leaf(c, x0 + Math.cos(a0) * i * 17, y0 + Math.sin(a0) * i * 17, W * (.12 + .04 * X.hash(i + k * 9)), a0 + (i % 2 ? .7 : -.7) + sway(k + i * .3), X.mix(p[3], "#3d6b35", .55 + .1 * (i % 2)));
    });
    for (let i = 0; i < 22; i++) {
      const fx = X.hash(i * 5.1) < .5 ? W * (.03 + .3 * X.hash(i * 2.3)) : W * (.64 + .33 * X.hash(i * 3.7)), fy = H * (.8 + .17 * X.hash(i * 1.9)) + j(30 + i, .4);
      const col = [p[2], p[4], "#ffffff", X.mix(p[2], p[4], .5)][i % 4], grow = X.spring(X.seg(t, .2 + i * .03, .9 + i * .03));
      for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2 + i; knot(c, fx + Math.cos(a) * 7 * grow, fy + Math.sin(a) * 7 * grow, 4.2 * grow, col); }
      knot(c, fx, fy, 3.6 * grow, i % 4 === 1 ? p[2] : p[4]);
    }
    // dusk light over everything
    c.fillStyle = X.a(p[4], .08 * dusk); c.fillRect(0, 0, W, H);
    // fabric labels: headline tag + caption tag, change every L/4 with a spring drop
    const seg = PS.L / 4, k = Math.floor(t / seg) % 4, lt = t - k * seg, ln = S.lines[k];
    const drop = X.spring(X.seg(lt, .05, .9)), out = X.seg(lt, seg - .3, seg);
    tag(c, S, ln.j, W / 2, H * .07 + (1 - drop) * -40, Math.min(W, H) * .062, p[2], p[0], X.mix("#ffffff", p[1], .5), drop * (1 - out), -.025 + (1 - drop) * .08);
    if (ln.c) {
      const d2 = X.spring(X.seg(lt, .35, 1.2));
      c.save(); X.font(c, 500, Math.min(W, H) * .036, S.f2); c.restore();
      tag(c, S, ln.c, W / 2, H * .145 + (1 - d2) * -30, Math.min(W, H) * .034, p[3], p[0], X.mix("#ffffff", p[1], .7), d2 * (1 - out), .02);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
