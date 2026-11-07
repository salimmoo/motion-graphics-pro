/* MGP pack-scenes/scenes-b.js (ported from the Paket Motion live previews, paket-scenes-b.js) \u2014 Paket Motion previews: iklan / brand promo, talking head, UGC.
   Scenes: logoSting, product3d, countdown, flashSale, testimonial, gummy, phoneUGC,
   presenter (yt | karaoke | podcast | interview | testi | news | panel | react | webinar | vlog). */
(function (root) {
  const MGP = (root.MGP = root.MGP || {});
  if (!MGP.paket || !MGP.paket._engine) return;
  const PS = MGP.paket._engine, X = PS.X, TAU = Math.PI * 2;
  const E = X.E, seg = X.seg, cl = X.clamp, lerp = X.lerp;

  /* ---------- local helpers ---------- */
  const fit = (c, s, maxW, size, w, fam) => { X.font(c, w, size, fam); const m = c.measureText(s).width; return m > maxW ? size * maxW / m : size; };
  const T = (c, s, x, y, o) => { const size = o.max ? fit(c, s, o.max, o.size, o.w || 700, o.fam) : o.size; X.text(c, s, x, y, Object.assign({}, o, { size })); return size; };
  const fill = (c, W, H, col) => { c.fillStyle = col; c.fillRect(0, 0, W, H); };
  const talk = (t, seed = 0, on = true) => (on ? cl(.25 + .75 * Math.abs(X.noise(t * 9 + seed * 7))) * (X.noise(t * 2.3 + seed) > -.55 ? 1 : .1) : 0);
  const blink = (t, seed = 0) => ((t + seed * 1.37) % 3.1) < .12;
  // nicer stylised presenter (same unit box as X.person: head \u2248 y-12, shoulders to +100)
  function figure(c, x, y, s, skin, shirt, hair, o = {}) {
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.rotate(o.tilt || 0);
    const style = o.style || 0, sd = X.shade(skin, -.18);
    if (style === 1) { c.fillStyle = X.shade(hair, -.1); c.beginPath(); c.moveTo(-30, -20); c.bezierCurveTo(-36, 20, -34, 40, -28, 52); c.lineTo(28, 52); c.bezierCurveTo(34, 40, 36, 20, 30, -20); c.closePath(); c.fill(); }
    // torso
    c.fillStyle = X.lgrad(c, 0, 24, 0, 100, [[0, X.shade(shirt, .12)], [1, X.shade(shirt, -.25)]]);
    c.beginPath(); c.moveTo(-62, 102); c.bezierCurveTo(-60, 46, -34, 30, 0, 29); c.bezierCurveTo(34, 30, 60, 46, 62, 102); c.closePath(); c.fill();
    c.fillStyle = sd; c.beginPath(); c.moveTo(-11, 4); c.lineTo(11, 4); c.lineTo(10, 30); c.lineTo(0, 42); c.lineTo(-10, 30); c.closePath(); c.fill();
    c.strokeStyle = X.shade(shirt, -.35); c.lineWidth = 2; c.beginPath(); c.moveTo(-14, 30); c.lineTo(0, 46); c.lineTo(14, 30); c.stroke();
    // ears + head
    c.fillStyle = sd; c.beginPath(); c.ellipse(-23, -9, 5, 8, 0, 0, 6.283); c.fill(); c.beginPath(); c.ellipse(23, -9, 5, 8, 0, 0, 6.283); c.fill();
    c.fillStyle = X.lgrad(c, -24, 0, 24, 0, [[0, X.shade(skin, .08)], [.7, skin], [1, X.shade(skin, -.1)]]);
    c.beginPath(); c.moveTo(0, -42); c.bezierCurveTo(16, -42, 24, -30, 23, -12); c.bezierCurveTo(22, 6, 12, 17, 0, 17); c.bezierCurveTo(-12, 17, -22, 6, -23, -12); c.bezierCurveTo(-24, -30, -16, -42, 0, -42); c.fill();
    // hair
    c.fillStyle = hair; c.beginPath();
    if (style === 2) { c.arc(0, -46, 10, 0, 6.283); c.fill(); c.beginPath(); }
    c.moveTo(-24, -12); c.bezierCurveTo(-28, -40, -10, -50, 4, -48); c.bezierCurveTo(20, -47, 28, -34, 24, -12); c.bezierCurveTo(22, -24, 16, -30, 6, -32); c.bezierCurveTo(-4, -26, -16, -28, -24, -12); c.fill();
    if (!o.noFace) {
      const br = o.brow || 0, bl = o.blink ? .12 : 1, ink = X.shade(skin, -.72);
      c.strokeStyle = X.shade(hair, .05); c.lineWidth = 2.4; c.lineCap = "round";
      c.beginPath(); c.moveTo(-14, -19 - br); c.quadraticCurveTo(-9, -22 - br, -4, -19 - br); c.moveTo(4, -19 - br); c.quadraticCurveTo(9, -22 - br, 14, -19 - br); c.stroke();
      c.fillStyle = ink; c.beginPath(); c.ellipse(-9, -11, 2.6, 3.2 * bl, 0, 0, 6.283); c.fill(); c.beginPath(); c.ellipse(9, -11, 2.6, 3.2 * bl, 0, 0, 6.283); c.fill();
      if (!o.blink) { c.fillStyle = "rgba(255,255,255,.8)"; c.fillRect(-8.6, -12.6, 1.2, 1.2); c.fillRect(9.4, -12.6, 1.2, 1.2); }
      c.strokeStyle = sd; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, -7); c.quadraticCurveTo(-3, 0, 1, 1); c.stroke();
      c.fillStyle = X.a("#ff7b7b", .18); X.circle(c, -14, 0, 4.5); c.fill(); X.circle(c, 14, 0, 4.5); c.fill();
      const m = o.mouth || 0; c.fillStyle = X.shade(skin, -.55); c.beginPath(); c.ellipse(0, 7.5, 6 + m * 1.2, .9 + m * 4.2, 0, 0, 6.283); c.fill();
      if (m > .35) { c.fillStyle = "#d77a7a"; c.beginPath(); c.ellipse(0, 7.5 + m * 2.2, 3.5, m * 1.6, 0, 0, 6.283); c.fill(); }
    }
    c.restore();
  }
  function guy(c, t, x, y, s, o = {}) {
    if (o.rim) X.glow(c, x, y - s * .1, s * 1.05, o.rim, .35);
    const bob = Math.sin(t * 1.6 + (o.seed || 0)) * s * .012;
    figure(c, x, y + bob, s, o.skin || "#e8b896", o.shirt || "#2a2f3a", o.hair || "#2b1d16", { style: o.style, brow: o.brow, tilt: (o.tilt || 0) + Math.sin(t * .9 + (o.seed || 0)) * .03, mouth: o.mouth != null ? o.mouth : talk(t, o.seed || 0, o.talking !== false), blink: blink(t, o.seed || 0), noFace: o.noFace });
  }
  const bokeh = (c, W, H, cols, n, t, seed = 1, sz = 1) => { for (let i = 0; i < n; i++) { const x = (X.hash(seed + i) * W + Math.sin(t * .3 + i) * 12), y = X.hash(seed + i * 3.1) * H * .8, r = (10 + X.hash(seed + i * 7.7) * 34) * sz; X.glow(c, x, y, r, cols[i % cols.length], .22 + .15 * Math.sin(t + i)); } };
  const confetti = (c, W, H, t0, t, cols, n = 70, seed = 3) => {
    const dt = t - t0; if (dt < 0) return;
    for (let i = 0; i < n; i++) {
      const a = X.hash(seed + i) * TAU, v = 140 + X.hash(seed + i * 2.3) * 260, x = W / 2 + Math.cos(a) * v * dt * .9, y = H * .42 + Math.sin(a) * v * dt * .7 + 160 * dt * dt;
      c.save(); c.translate(x, y); c.rotate(dt * (4 + i % 5) + i); c.scale(1, Math.cos(dt * 9 + i)); c.fillStyle = cols[i % cols.length]; c.globalAlpha = cl(1.6 - dt * .5); c.fillRect(-4, -2.5, 8, 5); c.restore();
    }
  };
  const handheld = (c, W, H, t, amp = 1) => { c.translate(W / 2, H / 2); c.rotate(X.noise(t * .8 + 3) * .012 * amp); c.translate(-W / 2 + X.noise(t * 1.1) * 4 * amp, -H / 2 + X.noise(t * .9 + 9) * 4 * amp); };
  const pill = (c, x, y, w, h, col) => { X.rr(c, x, y, w, h, h / 2); c.fillStyle = col; c.fill(); };
  const stars = (c, x, y, s, n, prog, col, off) => { for (let i = 0; i < n; i++) { const p = X.spring(cl(prog * n - i), 9, 5), sx = x + i * s * 1.15; X.icon(c, "star", sx, y, s, off, { fill: off, lw: 1 }); if (p > 0) { c.save(); c.translate(sx, y); c.scale(p, p); X.icon(c, "star", 0, 0, s, col, { fill: col, lw: 1 }); c.restore(); } } };
  const words = (s) => String(s).split(/\s+/).filter(Boolean);

  /* =====================================================================
     logoSting \u2014 shapes converge into a mark, flash, particle burst, wordmark tracks in
     ===================================================================== */
  PS.def("logoSting", (c, t, S) => {
    const { W, H, pal } = S, cx = W / 2, cy = H / 2, u = S.u;
    fill(c, W, H, pal[0]);
    X.glow(c, cx, cy, W * .55, pal[2], .12 + .1 * E(t, 1.8, 2.6));
    // background tech grid that rotates gently
    c.save(); c.translate(cx, cy); c.rotate(t * .02); c.strokeStyle = X.a(pal[1], .05); c.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(i * 40, -400); c.lineTo(i * 40, 400); c.moveTo(-400, i * 40); c.lineTo(400, i * 40); c.stroke(); } c.restore();
    const slide = E(t, 3.0, 4.2, "inOut");                     // mark shifts left to make room for the wordmark
    const mx = cx - slide * W * .2, my = cy - (1 - slide) * 0, R = u * 15;
    // four quarter pieces + inner dot fly in on different curves
    const pieces = [[-1, -1, pal[2]], [1, -1, pal[3]], [1, 1, pal[2]], [-1, 1, pal[1]]];
    pieces.forEach(([sx, sy, col], i) => {
      const p = X.ease.out5(seg(t, .1 + i * .18, 1.5 + i * .14));
      const fx = mx + sx * W * .7 * (1 - p) + Math.sin(i * 2) * 60 * (1 - p), fy = my + sy * H * .8 * (1 - p);
      const rot = (1 - p) * (i % 2 ? 3 : -3) + Math.sin(t * 2 + i) * .02 * (t > 2.4);
      c.save(); c.translate(fx, fy); c.rotate(rot + i * Math.PI / 2 + Math.PI);
      c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, 0, Math.PI / 2); c.closePath(); c.fill();
      c.restore();
    });
    const dp = X.spring(seg(t, 1.7, 2.6), 10, 5);
    c.fillStyle = pal[0]; X.circle(c, mx, my, R * .42 * dp); c.fill();
    c.strokeStyle = pal[1]; c.lineWidth = 2; X.circle(c, mx, my, R * .22 * dp); c.stroke();
    // shock ring + particle burst
    const bt = t - 2.1;
    if (bt > 0 && bt < 1.4) {
      c.strokeStyle = X.a(pal[3], 1 - bt / 1.4); c.lineWidth = 3 * (1 - bt / 1.4); X.circle(c, mx, my, R + bt * 240); c.stroke();
      for (let i = 0; i < 44; i++) { const a = X.hash(i + 1) * TAU, v = 90 + X.hash(i + 9) * 300, d = v * X.ease.out(bt / 1.4); c.fillStyle = X.a(i % 3 ? pal[2] : pal[3], 1 - bt / 1.4); X.circle(c, mx + Math.cos(a) * d, my + Math.sin(a) * d, 2.4 * (1 - bt / 1.4) + .6); c.fill(); }
    }
    // wordmark: tracking from wide to tight
    const word = (S.lines[0].j || "BARU").toUpperCase(), wp = E(t, 3.2, 5.0, "out5");
    if (wp > 0) {
      const x0 = cx + W * .05, ls = lerp(40, 4, wp);
      c.save(); c.globalAlpha = wp; X.font(c, 800, u * 15, S.f1); c.textAlign = "left"; c.textBaseline = "middle"; if ("letterSpacing" in c) c.letterSpacing = ls + "px";
      const mw = c.measureText(word).width, sc = Math.min(1, (W * .46) / mw);
      c.translate(x0, cy - u * 2); c.scale(sc, sc); c.fillStyle = pal[1]; c.fillText(word, 0, 0);
      // light sweep across the wordmark
      const sw = seg(t, 5.0, 6.2); if (sw > 0 && sw < 1) { c.globalCompositeOperation = "source-atop"; const gx = lerp(-80, mw + 80, X.ease.inOut(sw)); c.fillStyle = X.lgrad(c, gx - 50, 0, gx + 50, 0, [[0, "rgba(255,255,255,0)"], [.5, "rgba(255,255,255,.95)"], [1, "rgba(255,255,255,0)"]]); c.fillRect(gx - 60, -u * 12, 120, u * 24); }
      c.restore();
      const tp = E(t, 4.4, 5.4);
      c.save(); c.beginPath(); c.rect(x0, cy + u * 6, W * .5, u * 8); c.clip();
      T(c, S.lines[0].c, x0, cy + u * 10 + (1 - tp) * u * 8, { size: u * 4.4, w: 400, fam: S.f2, color: X.a(pal[1], .75), align: "left", max: W * .45 }); c.restore();
      c.fillStyle = pal[2]; c.fillRect(x0, cy + u * 5.5, W * .12 * E(t, 4.2, 5.2, "out5"), 2);
    }
    // flash
    const fl = Math.exp(-Math.max(0, t - 2.05) * 9) * (t > 2.05 ? 1 : 0); if (fl > .01) { c.fillStyle = X.a("#ffffff", fl * .85); c.fillRect(0, 0, W, H); }
    X.vignette(c, W, H, .5); X.grain(c, W, H, .25, t);
  });

  /* =====================================================================
     product3d \u2014 studio sweep, rotating can with label wrap + spec highlight, reflection, callouts
     ===================================================================== */
  PS.def("product3d", (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    // sweep backdrop
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, X.shade(pal[0], .25)], [.62, pal[0]], [.63, X.shade(pal[0], -.06)], [1, X.shade(pal[0], -.2)]]); c.fillRect(0, 0, W, H);
    X.glow(c, W * .5, H * .38, W * .45, "#ffffff", .55);
    const push = 1 + E(t, 0, 8, "sine") * .08;
    c.save(); c.translate(W / 2, H * .6); c.scale(push, push); c.translate(-W / 2, -H * .6);
    const cx = W * .5, top = H * .2, ch = H * .56, r = u * 15, rot = t * .9, floorY = top + ch;
    // shadow
    const sg = c.createRadialGradient(cx, floorY + 4, 2, cx, floorY + 4, r * 2.2); sg.addColorStop(0, "rgba(0,0,0,.35)"); sg.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = sg; c.save(); c.translate(cx, floorY + 4); c.scale(1, .18); c.translate(-cx, -floorY - 4); c.fillRect(cx - r * 3, floorY - r * 3, r * 6, r * 6); c.restore();
    const drawCan = (mirror) => {
      c.save(); if (mirror) { c.translate(0, floorY * 2 + 6); c.scale(1, -1); c.globalAlpha = .16; }
      const N = 44, ry = r * .26;
      for (let i = 0; i < N; i++) {
        const a0 = -Math.PI / 2 + i / N * Math.PI, a1 = a0 + Math.PI / N, x0 = cx + Math.sin(a0) * r, x1 = cx + Math.sin(a1) * r, uu = ((a0 + rot) % TAU + TAU) % TAU;
        // body (metal)
        c.fillStyle = X.mix(pal[4], "#cfd3da", .3); c.fillRect(x0, top, x1 - x0 + .6, ch);
        // label band
        const band = uu < 3.6 ? pal[2] : pal[3]; c.fillStyle = band; c.fillRect(x0, top + ch * .22, x1 - x0 + .6, ch * .56);
        if ((uu % 1.2) < .12) { c.fillStyle = X.a(pal[1], .5); c.fillRect(x0, top + ch * .22, x1 - x0 + .6, ch * .56); }
      }
      // label text wraps around the cylinder
      const word = "NOVA"; X.font(c, 800, r * .5, S.f1); c.textAlign = "center"; c.textBaseline = "middle";
      [...word].forEach((ch2, i) => { const a = ((i - 1.5) * .28 + 1.6 - rot) % TAU, aa = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(aa) > 1.45) return; c.save(); c.translate(cx + Math.sin(aa) * r, top + ch * .5); c.scale(Math.cos(aa), 1); c.fillStyle = pal[4]; c.fillText(ch2, 0, 0); c.restore(); });
      // cylindrical shading + moving specular
      const sx = cx - r * .35 + Math.sin(t * .6) * r * .08;
      c.fillStyle = X.lgrad(c, cx - r, 0, cx + r, 0, [[0, "rgba(0,0,0,.55)"], [.18, "rgba(0,0,0,.12)"], [cl((sx - cx + r) / (2 * r) - .06), "rgba(255,255,255,0)"], [cl((sx - cx + r) / (2 * r)), "rgba(255,255,255,.75)"], [cl((sx - cx + r) / (2 * r) + .07), "rgba(255,255,255,0)"], [.8, "rgba(0,0,0,.15)"], [1, "rgba(0,0,0,.6)"]]);
      c.fillRect(cx - r, top, r * 2, ch);
      // caps
      c.fillStyle = X.lgrad(c, cx - r, 0, cx + r, 0, [[0, "#8b9099"], [.45, "#eef0f3"], [1, "#7d828b"]]); c.beginPath(); c.ellipse(cx, top, r, ry, 0, 0, TAU); c.fill();
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, top, r * .82, ry * .8, 0, 0, TAU); c.stroke();
      c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(cx, floorY, r, ry, 0, 0, Math.PI); c.fill();
      c.restore();
    };
    drawCan(true); drawCan(false);
    c.restore();
    // callouts
    const calls = [[1.0, 3.6, -1, .36, S.lines[1].j], [3.4, 6.2, 1, .52, S.lines[1].c], [5.6, 8, -1, .66, S.lines[2].j]];
    calls.forEach(([a, b, side, yy, txt], i) => {
      const p = X.win(t, a, b, .6, .4); if (p <= 0) return; const px = W / 2 + side * u * 17, py = H * yy, ex = W / 2 + side * W * .24;
      c.strokeStyle = X.a(pal[1], .7 * p); c.lineWidth = 1.4; c.beginPath(); c.moveTo(px, py); c.lineTo(lerp(px, ex, E(t, a, a + .5, "out5")), py); c.stroke();
      c.fillStyle = pal[3]; X.circle(c, px, py, 3.5 * X.spring(seg(t, a, a + .6))); c.fill();
      T(c, txt, ex + side * 6, py, { size: u * 5, w: 700, fam: S.f2, color: pal[1], alpha: p, align: side < 0 ? "right" : "left", max: W * .22 });
    });
    T(c, (S.lines[0].j || "Baru").toUpperCase(), u * 7, u * 9, { size: u * 5, w: 800, fam: S.f1, color: pal[2], align: "left", ls: 3, alpha: E(t, .2, 1) });
    X.grain(c, W, H, .12, t);
  });

  /* =====================================================================
     countdown \u2014 flip digits, date + location chips, CTA, confetti at zero
     ===================================================================== */
  function flipCard(c, x, y, w, h, cur, nxt, p, S) {
    const { pal } = S, half = h / 2, fz = h * .78;
    const face = (num, y0, y1) => { c.save(); c.beginPath(); c.rect(x, y0, w, y1 - y0); c.clip(); X.rr(c, x, y, w, h, 10); c.fillStyle = X.shade(pal[4], .06); c.fill(); X.text(c, num, x + w / 2, y + h / 2 + h * .04, { size: fz, w: 400, fam: S.f1, color: pal[1] }); c.restore(); };
    face(p > 0 ? nxt : cur, y, y + half); face(cur, y + half, y + h);
    if (p > 0 && p < 1) {
      c.save(); c.translate(0, y + half);
      if (p < .5) { c.scale(1, 1 - p * 2); c.translate(0, -(y + half)); face(cur, y, y + half); c.fillStyle = `rgba(0,0,0,${p})`; c.fillRect(x, y, w, half); }
      else { c.scale(1, (p - .5) * 2); c.translate(0, -(y + half)); face(nxt, y + half, y + h); c.fillStyle = `rgba(0,0,0,${(1 - p) * .6})`; c.fillRect(x, y + half, w, half); }
      c.restore();
    } else if (p >= 1) face(nxt, y + half, y + h);
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x, y + half - 1, w, 2);
  }
  PS.def("countdown", (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    c.fillStyle = X.lgrad(c, 0, 0, W, H, [[0, pal[0]], [1, pal[4]]]); c.fillRect(0, 0, W, H);
    // rotating light rays
    c.save(); c.translate(W / 2, H * .55); c.rotate(t * .08); for (let i = 0; i < 14; i++) { c.rotate(TAU / 14); c.fillStyle = X.a(pal[3], .12); c.beginPath(); c.moveTo(0, 0); c.lineTo(W, -40); c.lineTo(W, 40); c.closePath(); c.fill(); } c.restore();
    X.glow(c, W / 2, H * .55, W * .4, pal[2], .25);
    const zeroT = 5.2, step = 1.04, n = Math.min(5, Math.floor(t / step)), p = cl((t - n * step) / .42);
    const cur = Math.max(0, 5 - n), nxt = Math.max(0, cur - 1), done = t > zeroT;
    T(c, S.lines[2].j.toUpperCase(), W / 2, H * .15, { size: u * 6.5, w: 400, fam: S.f1, color: pal[1], ls: 4, max: W * .8, alpha: E(t, 0, .6) });
    const cw = u * 22, chh = u * 32, gap = u * 3, y = H * .27;
    const labels = ["HARI", "JAM", "DETIK"], vals = [[0, 0], [0, 0], [cur, done ? 0 : nxt]];
    labels.forEach((lb, i) => {
      const x = W / 2 + (i - 1) * (cw + gap) * 1.05 - cw / 2, appear = X.spring(seg(t, i * .12, .9 + i * .12));
      c.save(); c.translate(x + cw / 2, y + chh / 2); c.scale(appear, appear); c.translate(-x - cw / 2, -y - chh / 2);
      X.shadow(c, 18, 10, "rgba(0,0,0,.4)");
      const a = i === 2 ? "0" + vals[2][0] : "00", b = i === 2 ? "0" + vals[2][1] : "00";
      flipCard(c, x, y, cw, chh, a, b, i === 2 && !done && n < 5 ? p : 0, S); X.noShadow(c);
      X.text(c, lb, x + cw / 2, y + chh + u * 4, { size: u * 3.4, w: 700, fam: S.f2, color: X.a(pal[1], .7), ls: 3 });
      c.restore();
    });
    // date + location chips
    const chips = [["12 DES \u00b7 19.00", "clock"], ["Jakarta Convention", "pin"]];
    chips.forEach(([txt, ic], i) => { const cp = E(t, 1 + i * .25, 1.8 + i * .25, "out5"); X.font(c, 600, u * 3.6, S.f2); const w = c.measureText(txt).width + u * 11, x = (i ? W / 2 + u * 2 : W / 2 - u * 2 - w) + (1 - cp) * (i ? 60 : -60), yy = H * .82;
      c.globalAlpha = cp; pill(c, x, yy - u * 3.5, w, u * 7, X.a(pal[1], .12)); X.icon(c, ic, x + u * 4, yy, u * 4, pal[2], { lw: 2 }); X.text(c, txt, x + u * 7.5, yy, { size: u * 3.6, w: 600, fam: S.f2, color: pal[1], align: "left" }); c.globalAlpha = 1; });
    if (done) {
      const k = X.spring(seg(t, zeroT, zeroT + .8), 8, 4); const fl = Math.exp(-(t - zeroT) * 7); c.fillStyle = X.a("#ffffff", fl * .7); c.fillRect(0, 0, W, H);
      c.save(); c.translate(W / 2, H * .93 - u * 3); c.scale(k, k); X.shadow(c, 24, 6, X.a(pal[2], .6)); pill(c, -u * 22, -u * 5, u * 44, u * 10, pal[2]); X.noShadow(c);
      T(c, S.lines[3].j.toUpperCase() + " \u2192", 0, 0, { size: u * 4.4, w: 800, fam: S.f2, color: pal[0], max: u * 40 }); c.restore();
      confetti(c, W, H, zeroT, t, [pal[2], pal[3], pal[1], "#ffd166"], 80);
    }
    X.grain(c, W, H, .15, t);
  });

  /* =====================================================================
     flashSale (9:16) \u2014 beat-synced cuts, flashes, % punches, strike-through, shaking stickers
     ===================================================================== */
  PS.def("flashSale", (c, t, S) => {
    const { W, H, pal } = S, u = S.u, bpm = 128, bl = 60 / bpm, bi = Math.floor(t / bl), bt = (t % bl) / bl, punch = 1 + .22 * Math.exp(-bt * 6);
    const bgs = [pal[0], pal[2], pal[1], pal[0], pal[3]], bg = t < 6.1 ? bgs[bi % 3 === 2 ? 1 : bi % 2 ? 2 : 0] : pal[0], ink = X.lum(bg) > .55 ? pal[1] : "#ffffff";
    fill(c, W, H, bg);
    // diagonal racing stripes
    c.save(); c.translate(W / 2, H / 2); c.rotate(-.5); const off = (t * 220) % 60; c.fillStyle = X.a(ink, .07); for (let i = -20; i < 20; i++) c.fillRect(i * 60 + off, -H, 26, H * 2); c.restore();
    const center = (txt, size, col, yy = H * .45, rot = -.06) => { c.save(); c.translate(W / 2, yy); c.rotate(rot); c.scale(punch, punch); const s = fit(c, txt, W * .86, size, 400, S.f1); X.text(c, txt, 4, 5, { size: s, w: 400, fam: S.f1, color: X.a("#000", .25) }); X.text(c, txt, 0, 0, { size: s, w: 400, fam: S.f1, color: col }); c.restore(); };
    if (t < 1.9) { const w = ["FLASH", "SALE", "FLASH", "SALE"][bi % 4]; center(w, u * 34, ink); T(c, "HANYA 24 JAM", W / 2, H * .62, { size: u * 6, w: 800, fam: S.f2, color: ink, ls: 3 }); }
    else if (t < 4.2) {
      const k = Math.floor((t - 1.9) / bl), pct = Math.min(50, 10 + k * 10);
      center(pct + "%", u * 52, ink, H * .42); center("OFF", u * 20, bi % 2 ? pal[2] : pal[3], H * .6, .05);
    } else if (t < 6.1) {
      // price card
      const p = X.spring(seg(t, 4.2, 4.8), 9, 5); c.save(); c.translate(W / 2, H * .46); c.scale(p, p); c.rotate(-.04);
      X.shadow(c, 20, 12, "rgba(0,0,0,.3)"); X.rr(c, -W * .4, -H * .17, W * .8, H * .34, 18); c.fillStyle = "#ffffff"; c.fill(); X.noShadow(c);
      X.text(c, "Rp199.000", 0, -H * .07, { size: u * 9, w: 700, fam: S.f2, color: "#888" });
      const sp = E(t, 4.7, 5.0, "out5"); c.strokeStyle = pal[2]; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(-u * 24, -H * .07); c.lineTo(lerp(-u * 24, u * 24, sp), -H * .07 - sp * 6); c.stroke();
      const np = X.spring(seg(t, 5.05, 5.6), 10, 4); c.save(); c.translate(0, H * .05); c.scale(np * punch, np * punch); X.text(c, "Rp99.000", 0, 0, { size: u * 15, w: 400, fam: S.f1, color: pal[1] }); c.restore();
      c.restore();
    } else {
      center(S.lines[3].j.toUpperCase(), u * 16, pal[1], H * .42, -.03);
      const p = E(t, 6.2, 6.6, "back"); c.save(); c.translate(W / 2, H * .58); c.scale(p, p); pill(c, -W * .36, -u * 8, W * .72, u * 16, pal[1]); X.icon(c, "cart", -W * .25, 0, u * 9, pal[0], { lw: 2.4 }); T(c, "CHECKOUT", u * 4, 0, { size: u * 8, w: 400, fam: S.f1, color: pal[0], max: W * .45 }); c.restore();
      T(c, "Berakhir 00:" + String(59 - Math.floor((t - 6.1) * 6)).padStart(2, "0") + ":" + String(Math.floor((t * 60) % 60)).padStart(2, "0"), W / 2, H * .7, { size: u * 6, w: 800, fam: S.f2, color: pal[1] });
    }
    // shaking stickers
    const stick = (x, y, r, txt, col, txtCol, rot) => { const sh = X.wob(x, t * 6, .08); c.save(); c.translate(x + X.wob(y, t * 14, 2), y + X.wob(x + 3, t * 14, 2)); c.rotate(rot + sh); c.beginPath(); for (let i = 0; i < 24; i++) { const rr = i % 2 ? r * .82 : r, a = i / 24 * TAU; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = col; X.shadow(c, 8, 4, "rgba(0,0,0,.25)"); c.fill(); X.noShadow(c); T(c, txt, 0, 0, { size: r * .5, w: 400, fam: S.f1, color: txtCol, max: r * 1.5 }); c.restore(); };
    stick(W * .8, H * .14, u * 13, "-50%", pal[2], "#fff", .2);
    if (t > 1) stick(W * .2, H * .84, u * 12 * X.spring(seg(t, 1, 1.5)), "PROMO", pal[3], pal[1], -.25);
    // beat flash + bottom progress
    c.fillStyle = X.a("#ffffff", Math.exp(-bt * 10) * .45); c.fillRect(0, 0, W, H);
    c.fillStyle = X.a(ink, .3); c.fillRect(W * .1, H * .955, W * .8, 4); c.fillStyle = pal[2]; c.fillRect(W * .1, H * .955, W * .8 * (t / S.L), 4);
  });

  /* =====================================================================
     testimonial \u2014 review cards stack, stars fill, avatar, logo ticker
     ===================================================================== */
  const QUOTES = [["Pelayanannya cepat, hasilnya rapi.", "Dewi A.", "Pemilik Kedai", "#e8b896", "#3a5a40", "#2b1d16"], ["Tim kami jadi jauh lebih produktif.", "Bima S.", "Manajer Operasional", "#c98e6b", "#264653", "#111"], ["Hasilnya melebihi harapan kami.", "Sari P.", "Founder Studio", "#f1c7a5", "#9c3d54", "#4a2c1a"]];
  PS.def("testimonial", (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    X.paper(c, W, H, pal[0], .15);
    X.glow(c, W * .72, H * .45, W * .4, pal[3], .25);
    // left headline + counter
    const hp = E(t, 0, .9, "out5"), cnt = Math.round(1200 * X.ease.out(seg(t, .2, 2.2)));
    T(c, "Dipercaya", u * 9, H * .3, { size: u * 6, w: 600, fam: S.f1, color: pal[1], align: "left", alpha: hp });
    T(c, cnt.toLocaleString("id-ID") + "+", u * 9 - (1 - hp) * 30, H * .44, { size: u * 16, w: 800, fam: S.f1, color: pal[2], align: "left", max: W * .36 });
    T(c, "pelanggan di seluruh Indonesia", u * 9, H * .56, { size: u * 4.2, w: 400, fam: S.f2, color: X.a(pal[1], .7), align: "left", alpha: E(t, .5, 1.3), max: W * .36 });
    stars(c, u * 11, H * .66, u * 5, 5, seg(t, 1, 2.2), pal[3], X.a(pal[1], .12));
    // card stack
    const per = 2.5, cxs = W * .69, cys = H * .46, cw = W * .46, chh = H * .5;
    for (let k = 2; k >= 0; k--) {
      const idx = ((Math.floor(t / per) - k) % 3 + 3) % 3, lt = t - Math.floor(t / per) * per, enter = k === 0 ? X.spring(seg(lt, 0, .9), 7, 4.5) : 1;
      const depth = k - (k > 0 ? E(lt, 0, .6) * 0 : 0), q = QUOTES[idx];
      const back = k === 0 ? 0 : k - E(lt, 0, .7) * 0; const sc = 1 - back * .07, yo = -back * u * 5, a = k === 2 ? cl(1 - E(lt, 0, .5)) * .6 : k === 1 ? .85 : 1;
      if (k > 0 && t < per * k) continue;
      c.save(); c.globalAlpha = a; c.translate(cxs + (1 - enter) * W * .5, cys + yo); c.rotate((k === 0 ? (1 - enter) * .2 : (k % 2 ? .04 : -.04)) + (k === 0 ? Math.sin(t * 1.2) * .006 : 0)); c.scale(sc, sc);
      X.shadow(c, 26, 14, "rgba(0,0,0,.16)"); X.rr(c, -cw / 2, -chh / 2, cw, chh, 16); c.fillStyle = pal[4]; c.fill(); X.noShadow(c);
      c.fillStyle = pal[2]; X.rr(c, -cw / 2, -chh / 2, 6, chh, 3); c.fill();
      X.text(c, "\u201c", -cw / 2 + u * 7, -chh / 2 + u * 9, { size: u * 18, w: 800, fam: S.f1, color: X.a(pal[2], .3) });
      c.save(); X.font(c, 600, u * 5, S.f1); const lines = X.wrap(c, q[0], cw - u * 16); c.restore();
      lines.slice(0, 2).forEach((ln, i) => T(c, ln, -cw / 2 + u * 8, -chh * .16 + i * u * 6.5, { size: u * 5, w: 600, fam: S.f1, color: pal[1], align: "left", max: cw - u * 14 }));
      // avatar
      c.save(); X.circle(c, -cw / 2 + u * 13, chh * .27, u * 6); c.fillStyle = X.shade(pal[3], .5); c.fill(); c.clip(); figure(c, -cw / 2 + u * 13, chh * .27 + u * 3, u * 10, q[3], q[4], q[5], { blink: blink(t, idx), style: idx === 2 ? 1 : 0 }); c.restore();
      T(c, q[1], -cw / 2 + u * 22, chh * .23, { size: u * 4, w: 700, fam: S.f2, color: pal[1], align: "left" });
      T(c, q[2], -cw / 2 + u * 22, chh * .33, { size: u * 3.2, w: 400, fam: S.f2, color: X.a(pal[1], .6), align: "left" });
      stars(c, cw / 2 - u * 26, -chh / 2 + u * 8, u * 3.6, 5, k === 0 ? seg(lt, .5, 1.6) : 1, pal[3], X.a(pal[1], .12));
      c.restore();
    }
    // logo ticker
    c.fillStyle = X.a(pal[1], .06); c.fillRect(0, H * .86, W, H * .14);
    const names = ["KOPIKITA", "Arunika", "LOGIX", "batik.co", "SATU", "Rimba", "NOVA"], off = (t * 40) % (u * 34 * names.length);
    for (let i = -1; i < names.length * 2; i++) { const x = i * u * 34 - off; X.circle(c, x + u * 3, H * .93, u * 2.4); c.fillStyle = X.a(pal[1], .35); c.fill(); T(c, names[i % names.length < 0 ? 0 : i % names.length], x + u * 7, H * .93, { size: u * 3.8, w: 800, fam: S.f1, color: X.a(pal[1], .4), align: "left" }); }
  });

  /* =====================================================================
     gummy (9:16) \u2014 glossy jelly blobs squash & stretch, wobbly soft letters
     ===================================================================== */
  function jelly(c, x, y, r, sx, sy, col, t, seed) {
    c.save(); c.translate(x, y); c.scale(sx, sy); c.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, rr = r * (1 + .05 * Math.sin(a * 3 + t * 4 + seed) + .03 * Math.sin(a * 5 - t * 3)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.1); g.addColorStop(0, X.shade(col, .45)); g.addColorStop(.6, col); g.addColorStop(1, X.shade(col, -.25)); c.fillStyle = g; c.fill();
    c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.ellipse(-r * .35, -r * .45, r * .32, r * .16, -.5, 0, TAU); c.fill();
    c.fillStyle = "rgba(255,255,255,.45)"; X.circle(c, r * .1, -r * .62, r * .07); c.fill();
    c.restore();
  }
  PS.def("gummy", (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, X.shade(pal[0], .4)], [1, pal[0]]]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) X.glow(c, X.hash(i + 2) * W, X.hash(i + 5) * H, W * .35, pal[2 + i % 3], .2);
    const ground = H * .8;
    c.fillStyle = X.a(pal[1], .08); c.beginPath(); c.ellipse(W / 2, ground + u * 6, W * .45, u * 6, 0, 0, TAU); c.fill();
    const blobs = [[W * .26, u * 13, pal[2], 0, .9], [W * .55, u * 17, pal[3], .37, .8], [W * .8, u * 11, pal[4], .7, 1.05]];
    blobs.forEach(([x, r, col, ph, sp], i) => {
      const cyc = ((t * sp + ph) % 1), hgt = Math.sin(cyc * Math.PI), y = ground - r - hgt * H * .2;
      const nearG = cl(1 - hgt * 4), sq = 1 + .28 * nearG * Math.exp(-((cyc < .5 ? cyc : 1 - cyc)) * 20), sx = hgt > .25 ? .92 : sq, sy = hgt > .25 ? 1.1 : 1 / sq;
      c.fillStyle = X.a(pal[1], .12 * (1 - hgt)); c.beginPath(); c.ellipse(x, ground, r * (1.1 - hgt * .4), r * .2, 0, 0, TAU); c.fill();
      jelly(c, x, y + r * (1 - sy), r, sx, sy, col, t, i * 2);
      // little face
      c.fillStyle = pal[1]; X.circle(c, x - r * .25, y - r * .02, r * .07); c.fill(); X.circle(c, x + r * .25, y - r * .02, r * .07); c.fill();
      c.strokeStyle = pal[1]; c.lineWidth = 2; c.beginPath(); c.arc(x, y + r * .12, r * .14, .2, Math.PI - .2); c.stroke();
    });
    // wobbly soft letters
    const k = t < 4 ? 0 : 1, txt = k ? S.lines[1].j : S.lines[0].j + "!", lt = k ? t - 4 : t;
    X.font(c, 700, u * (k ? 11 : 26), S.f1); const lines = X.wrap(c, txt, W * .84);
    lines.forEach((ln, li) => {
      const size = fit(c, ln, W * .86, u * (k ? 11 : 26), 700, S.f1); X.font(c, 700, size, S.f1); const tw = c.measureText(ln).width; let x = W / 2 - tw / 2;
      [...ln].forEach((ch, i) => {
        const cw = c.measureText(ch).width, p = X.spring(seg(lt, .1 + (li * 8 + i) * .05, .9 + (li * 8 + i) * .05), 9, 3.5), wob = Math.sin(t * 5 + i * .7) * .045;
        const yy = H * (k ? .22 : .25) + li * size * 1.05 + Math.sin(t * 3 + i * .6) * u * 1.2;
        c.save(); c.translate(x + cw / 2, yy); c.scale(p * (1 + wob), p * (1 - wob)); c.rotate(Math.sin(t * 2 + i) * .05);
        X.text(c, ch, 0, 3, { size, w: 700, fam: S.f1, color: X.shade(pal[1], -.2), stroke: "#fff", lw: size * .16, noFill: true });
        X.text(c, ch, 0, 0, { size, w: 700, fam: S.f1, color: i % 3 === 1 ? pal[2] : pal[1], stroke: "#ffffff", lw: size * .12 });
        c.restore(); x += cw;
      });
    });
    T(c, S.lines[k ? 1 : 0].c, W / 2, H * .9, { size: u * 4.6, w: 700, fam: S.f2, color: pal[1], max: W * .85, alpha: E(lt, .8, 1.4) });
  });

  /* =====================================================================
     phoneUGC (9:16) \u2014 creator post: handheld, word-by-word bold captions, stickers, side rail
     ===================================================================== */
  const ugcScene = (c, W, H, t, S, close) => {
    const { pal } = S, u = S.u;
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, "#d9c7b8"], [.6, "#b89c88"], [1, "#6d5a4d"]]); c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(W * .62, H * .08, W * .3, H * .3); c.fillStyle = "rgba(255,240,210,.5)"; c.fillRect(W * .64, H * .1, W * .26, H * .26);
    c.fillStyle = "#5b7553"; X.circle(c, W * .14, H * .3, W * .12); c.fill(); c.fillStyle = "#7a5a3f"; c.fillRect(W * .11, H * .36, W * .06, H * .18);
    const s = W * (close ? 1.15 : .95);
    guy(c, t, W * .5, H * .56, s, { skin: "#e3ad88", shirt: pal[2], hair: "#1d1410", seed: 2, rim: "#fff2cc" });
    // product in hand
    const hp = X.spring(seg(t, 1.6, 2.3), 8, 4); c.save(); c.translate(W * .7, H * .7 - hp * H * .08); c.rotate(-.15 + Math.sin(t * 2) * .04); c.scale(hp, hp);
    X.rr(c, -u * 9, -u * 16, u * 18, u * 32, 6); c.fillStyle = pal[3]; c.fill(); c.fillStyle = "#fff"; c.fillRect(-u * 9, -u * 4, u * 18, u * 8); X.text(c, "NOVA", 0, 0, { size: u * 4.4, w: 800, fam: S.f1, color: pal[0] });
    c.fillStyle = "#e3ad88"; c.beginPath(); c.ellipse(-u * 8, u * 6, u * 5, u * 8, .3, 0, TAU); c.fill(); c.restore();
  };
  PS.def("phoneUGC", (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    c.save(); handheld(c, W, H, t, 1.4); c.translate(-10, -10); c.scale((W + 20) / W, (H + 20) / H);
    ugcScene(c, W, H, t, S, t > 4.2 && t < 6.3); c.restore();
    c.fillStyle = X.lgrad(c, 0, H * .6, 0, H, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.6)"]]); c.fillRect(0, H * .6, W, H * .4);
    c.fillStyle = X.lgrad(c, 0, 0, 0, H * .12, [[0, "rgba(0,0,0,.35)"], [1, "rgba(0,0,0,0)"]]); c.fillRect(0, 0, W, H * .12);
    // top tabs
    T(c, "Mengikuti", W * .38, u * 8, { size: u * 4, w: 600, fam: S.f2, color: "rgba(255,255,255,.65)" }); T(c, "Untuk Anda", W * .62, u * 8, { size: u * 4, w: 800, fam: S.f2, color: "#fff" }); c.fillStyle = "#fff"; c.fillRect(W * .58, u * 11.5, W * .08, 2);
    // word-by-word captions
    const script = ["Jujur,", "ini", "yang", "paling", "kepake", "minggu", "ini!"].concat(words(S.lines[3].c));
    const per = .42, wi = Math.min(script.length - 1, Math.floor((t - .3) / per)), group = Math.floor(Math.max(0, wi) / 3), from = group * 3;
    if (t > .3) {
      const grp = script.slice(from, from + 3); X.font(c, 800, u * 9, S.f1);
      const size = fit(c, grp.join(" "), W * .8, u * 9, 800, S.f1); X.font(c, 800, size, S.f1); const tw = c.measureText(grp.join(" ")).width + c.measureText(" ").width * .7 * (grp.length - 1); let x = W / 2 - tw / 2;
      grp.forEach((w, i) => { const ww = c.measureText(w).width + c.measureText(" ").width * 1.7, on = from + i === wi, shown = from + i <= wi; if (shown) { const p = on ? X.spring(cl(((t - .3) % per) / per * 2), 10, 4) : 1; c.save(); c.translate(x + c.measureText(w).width / 2, H * .66); const q = .8 + .2 * p; c.scale(q, q); c.rotate(on ? -.04 : 0); X.text(c, w, 0, 0, { size, w: 800, fam: S.f1, color: on ? pal[2] : "#fff", stroke: "#000", lw: size * .18 }); c.restore(); } x += ww; });
    }
    // sticker
    const sp = X.spring(seg(t, 2.6, 3.2), 9, 4); if (sp > .01) { c.save(); c.translate(W * .3, H * .3); c.rotate(-.18 + Math.sin(t * 3) * .03); c.scale(sp, sp); X.shadow(c, 10, 4, "rgba(0,0,0,.3)"); X.rr(c, -u * 19, -u * 6, u * 38, u * 12, 8); c.fillStyle = pal[3]; c.fill(); X.noShadow(c); X.text(c, "WAJIB COBA!", 0, 0, { size: u * 5.4, w: 800, fam: S.f1, color: pal[0] }); c.restore(); }
    // right rail
    const rx = W * .9, likeT = 5.0, liked = t > likeT;
    [["heart", liked ? "13,2rb" : "13,1rb"], ["chat", "842"], ["star", "2.091"], ["play", "Bagikan"]].forEach(([ic, n], i) => {
      const y = H * .48 + i * u * 14, pop = ic === "heart" && liked ? X.spring(seg(t, likeT, likeT + .5), 12, 4) : 1;
      c.save(); c.translate(rx, y); c.scale(pop, pop); X.icon(c, ic, 0, 0, u * 8, "#fff", { fill: ic === "heart" && liked ? pal[2] : "rgba(255,255,255,.95)", lw: 1.5 }); c.restore();
      T(c, n, rx, y + u * 6.5, { size: u * 3, w: 700, fam: S.f2, color: "#fff" });
    });
    if (liked) for (let i = 0; i < 6; i++) { const d = t - likeT - i * .12; if (d < 0 || d > 1.6) continue; c.save(); c.globalAlpha = 1 - d / 1.6; X.icon(c, "heart", rx - 6 + Math.sin(d * 5 + i) * 10, H * .48 - d * 120, u * (4 + i % 3), pal[2], { fill: pal[2] }); c.restore(); }
    // username / caption / music
    X.circle(c, u * 8, H * .79, u * 4); c.fillStyle = pal[3]; c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke();
    T(c, "@kreator.id", u * 14, H * .79, { size: u * 4.2, w: 800, fam: S.f2, color: "#fff", align: "left" });
    T(c, S.lines[0].c + " #racuntiktok", u * 5, H * .84, { size: u * 3.6, w: 400, fam: S.f2, color: "#fff", align: "left", max: W * .74 });
    c.save(); c.beginPath(); c.rect(u * 10, H * .875, W * .55, u * 6); c.clip(); T(c, "\u266a suara asli - kreator.id \u00b7 suara asli - kreator.id", u * 10 - (t * 18) % (W * .4), H * .89, { size: u * 3.4, w: 400, fam: S.f2, color: "#fff", align: "left" }); c.restore();
    c.save(); c.translate(rx, H * .89); c.rotate(t * 2); X.circle(c, 0, 0, u * 5); c.fillStyle = "#222"; c.fill(); X.circle(c, 0, 0, u * 2); c.fillStyle = pal[2]; c.fill(); c.restore();
    c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(0, H - 3, W, 3); c.fillStyle = "#fff"; c.fillRect(0, H - 3, W * t / S.L, 3);
  });

  /* =====================================================================
     presenter \u2014 ten talking-head layouts
     ===================================================================== */
  const CAST = [{ skin: "#e3ad88", hair: "#1d1410", style: 0 }, { skin: "#c68863", hair: "#120c08", style: 2 }, { skin: "#f0c8a8", hair: "#5a3a22", style: 1 }];
  const lowerThird = (c, S, x, y, p, name, role, col, ink, sub) => {
    if (p <= 0) return; const u = S.u; X.font(c, 800, u * 5, S.f1); const w = Math.max(c.measureText(name).width, u * 40) + u * 10;
    c.save(); c.beginPath(); c.rect(x, y - u * 8, w * X.ease.out5(p), u * 18); c.clip();
    c.fillStyle = col; c.fillRect(x, y - u * 7, u * 1.6, u * 15); c.fillStyle = X.a(sub || "#000", .72); c.fillRect(x + u * 1.6, y - u * 7, w, u * 9);
    T(c, name, x + u * 5, y - u * 2.5, { size: u * 5, w: 800, fam: S.f1, color: ink, align: "left" });
    c.fillStyle = col; c.fillRect(x + u * 1.6, y + u * 2, w * .8, u * 6); T(c, role, x + u * 5, y + u * 5, { size: u * 3.4, w: 600, fam: S.f2, color: X.lum(col) > .6 ? "#111" : "#fff", align: "left" });
    c.restore();
  };
  const room = (c, W, H, S, warm) => {
    const { pal } = S; c.fillStyle = X.lgrad(c, 0, 0, W, H, [[0, X.shade(pal[4], .08)], [1, pal[0]]]); c.fillRect(0, 0, W, H);
    c.fillStyle = X.a(pal[1], .05); c.fillRect(W * .06, H * .2, W * .22, H * .5); for (let i = 0; i < 4; i++) { c.fillStyle = X.a(i % 2 ? pal[2] : pal[3], .5); c.fillRect(W * .08 + i * W * .045, H * .28, W * .03, H * .12); }
    c.fillStyle = X.a(pal[1], .08); c.fillRect(W * .06, H * .41, W * .22, 3); c.fillRect(W * .06, H * .58, W * .22, 3);
    X.glow(c, W * .82, H * .25, W * .2, warm || "#ffd9a0", .35);
  };
  const caption = (c, S, txt, y, p, o = {}) => { const { W } = S, u = S.u; if (p <= 0) return; X.font(c, o.w || 600, o.size || u * 4.6, S.f2); const s = fit(c, txt, W * .8, o.size || u * 4.6, o.w || 600, S.f2); X.font(c, o.w || 600, s, S.f2); const tw = c.measureText(txt).width; c.globalAlpha = p; X.rr(c, W / 2 - tw / 2 - u * 3, y - s * .85, tw + u * 6, s * 1.7, 6); c.fillStyle = o.bg || "rgba(0,0,0,.65)"; c.fill(); X.text(c, txt, W / 2, y, { size: s, w: o.w || 600, fam: S.f2, color: o.color || "#fff" }); c.globalAlpha = 1; };

  const PV = {};
  // yt \u2014 punch-in zoom cuts, caption, lower third, subscribe pop
  PV.yt = (c, t, S) => {
    const { W, H, pal } = S, u = S.u, beat = Math.floor(t / 2), zoom = [1, 1.28, 1.08, 1.2][beat % 4], fx = [0, -.06, .04, -.03][beat % 4];
    c.save(); c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-W / 2 + fx * W, -H / 2 + (zoom - 1) * H * .2);
    room(c, W, H, S); guy(c, t, W * .55, H * .62, H * .78, Object.assign({ shirt: "#3b4252", rim: pal[3] }, CAST[0]));
    c.restore();
    // B-roll card on beat 2
    if (beat === 2) { const p = X.spring(seg(t, 4, 4.5)); c.save(); c.translate(W * .2, H * .38); c.scale(p, p); c.rotate(-.03); X.shadow(c, 20, 8, "rgba(0,0,0,.4)"); X.rr(c, -W * .14, -H * .17, W * .28, H * .34, 10); c.fillStyle = pal[4]; c.fill(); X.noShadow(c); X.icon(c, "chart", 0, -u * 2, u * 16, pal[3], { lw: 2.5, p: seg(t, 4.2, 5) }); X.text(c, "+38%", 0, H * .11, { size: u * 5, w: 800, fam: S.f1, color: pal[1] }); c.restore(); }
    lowerThird(c, S, u * 6, H * .7, X.win(t, .4, 3.6, .6, .4), "Rani Pratama", "Kreator Edukasi \u00b7 1,2 jt subscriber", pal[2], "#fff");
    caption(c, S, S.lines[beat % 4].c, H * .9, 1);
    if (t > 6) { const p = X.spring(seg(t, 6, 6.5), 10, 4); c.save(); c.translate(W * .82, H * .14); c.scale(p, p); pill(c, -u * 15, -u * 4.5, u * 30, u * 9, t > 6.9 ? "#555" : pal[2]); X.text(c, t > 6.9 ? "SUBSCRIBED" : "SUBSCRIBE", 0, 0, { size: u * 3.6, w: 800, fam: S.f2, color: "#fff" }); c.restore();
      const cp = E(t, 6.3, 6.85, "inOut"); c.save(); c.translate(lerp(W * .95, W * .86, cp), lerp(H * .4, H * .17, cp)); const pr = t > 6.85 && t < 7.1 ? .85 : 1; c.scale(pr, pr); c.fillStyle = "#fff"; c.strokeStyle = "#000"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 16); c.lineTo(4, 12); c.lineTo(8, 19); c.lineTo(10, 18); c.lineTo(6, 11); c.lineTo(11, 11); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    // cut flash
    const ct = t % 2; if (ct < .06 && t > .5) { c.fillStyle = "rgba(255,255,255,.2)"; c.fillRect(0, 0, W, H); }
  };
  // karaoke (9:16)
  PV.karaoke = (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, X.shade(pal[0], .12)], [1, pal[0]]]); c.fillRect(0, 0, W, H);
    bokeh(c, W, H * .6, [pal[2], pal[3]], 8, t, 4);
    const pz = 1 + .04 * Math.sin(t * .5);
    c.save(); c.translate(W / 2, H * .4); c.scale(pz, pz); guy(c, t, 0, H * .06, W * .95, Object.assign({ shirt: "#20232b", rim: pal[2], seed: 1 }, CAST[1])); c.restore();
    c.fillStyle = X.lgrad(c, 0, H * .45, 0, H, [[0, "rgba(0,0,0,0)"], [.4, "rgba(0,0,0,.75)"], [1, "rgba(0,0,0,.9)"]]); c.fillRect(0, H * .45, W, H * .55);
    const li = Math.floor(t / 2) % 4, lt = t % 2, ws = words(S.lines[li].c), per = 1.7 / ws.length, cur = Math.floor(lt / per);
    // lay words into lines
    const size = u * 8.4; X.font(c, 800, size, S.f1); const rows = [[]]; let rw = 0;
    ws.forEach((w) => { const ww = c.measureText(w.toUpperCase()).width + c.measureText(" ").width * 1.6; if (rw + ww > W * .84 && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push([w.toUpperCase(), ww]); rw += ww; });
    let k = 0; rows.forEach((row, ri) => { const tw = row.reduce((a, b) => a + b[1], 0); let x = W / 2 - tw / 2; row.forEach(([w, ww]) => {
      const on = k === cur, past = k < cur, p = on ? X.spring(seg(lt, k * per, k * per + .3), 12, 4) : 1, y = H * .7 + ri * size * 1.15;
      c.save(); c.translate(x + ww / 2 - c.measureText(" ").width * .8, y); const s = on ? 1 + .08 * p : 1; c.scale(s, s);
      if (on) { c.shadowColor = pal[2]; c.shadowBlur = 18; }
      X.text(c, w, 0, 0, { size, w: 800, fam: S.f1, color: on ? pal[2] : past ? "#fff" : "rgba(255,255,255,.35)", stroke: on ? null : "#000", lw: 4 });
      c.restore(); x += ww; k++; }); });
    // keyword emoji pop
    const ep = X.spring(seg(lt, .2, .7), 9, 4); c.save(); c.translate(W * .78, H * .2); c.scale(ep, ep); c.rotate(.2); X.text(c, ["\ud83d\udd25", "\ud83d\udca1", "\ud83d\udcca", "\ud83d\ude80"][li], 0, 0, { size: u * 14, w: 400, fam: "Segoe UI Emoji" }); c.restore();
    c.fillStyle = pal[3]; c.fillRect(0, 0, W * (t / S.L), 4);
  };
  // podcast \u2014 split panels + live waveform
  PV.podcast = (c, t, S) => {
    const { W, H, pal } = S, u = S.u, speaker = Math.floor(t / 2) % 2;
    fill(c, W, H, pal[0]);
    const pw = W * .44, ph = H * .62, py = H * .12;
    [0, 1].forEach((i) => {
      const x = i ? W - pw - W * .04 : W * .04, act = speaker === i, k = E(t % 2, 0, .4) , sc = act ? 1 + .015 * k : 1;
      c.save(); c.translate(x + pw / 2, py + ph / 2); c.scale(sc, sc); c.translate(-pw / 2, -ph / 2);
      if (act) { c.shadowColor = pal[i ? 3 : 2]; c.shadowBlur = 22; }
      X.rr(c, 0, 0, pw, ph, 14); c.fillStyle = X.lgrad(c, 0, 0, 0, ph, [[0, X.shade(pal[4], .1)], [1, X.shade(pal[4], -.2)]]); c.fill(); X.noShadow(c);
      c.save(); X.rr(c, 0, 0, pw, ph, 14); c.clip();
      X.glow(c, pw * (i ? .25 : .75), ph * .3, pw * .5, pal[i ? 3 : 2], .3);
      c.fillStyle = X.a(pal[1], .06); for (let k2 = 0; k2 < 5; k2++) c.fillRect(pw * .08 + k2 * pw * .18, ph * .15, pw * .02, ph * .5);
      guy(c, t, pw * .5, ph * .72, ph * .75, Object.assign({ shirt: i ? "#4a3f6b" : "#7a3d12", talking: act, seed: i * 3, tilt: i ? .05 : -.05 }, CAST[i]));
      // mic
      c.fillStyle = "#222"; c.save(); c.translate(pw * (i ? .3 : .7), ph * .78); c.rotate(i ? .5 : -.5); X.rr(c, -u * 3, -u * 7, u * 6, u * 11, u * 3); c.fill(); c.fillStyle = "#555"; c.fillRect(-u * .6, u * 4, u * 1.2, u * 14); c.restore();
      c.restore();
      X.rr(c, u * 3, ph - u * 9, u * 30, u * 6.5, u * 3.2); c.fillStyle = "rgba(0,0,0,.6)"; c.fill();
      T(c, i ? "Sari \u00b7 Tamu" : "Andi \u00b7 Host", u * 18, ph - u * 5.8, { size: u * 3.3, w: 700, fam: S.f2, color: "#fff", max: u * 26 });
      if (act) { c.strokeStyle = pal[i ? 3 : 2]; c.lineWidth = 3; X.rr(c, 0, 0, pw, ph, 14); c.stroke(); }
      c.restore();
    });
    // waveform
    const wy = H * .86, n = 48; for (let i = 0; i < n; i++) { const x = W * .1 + i / n * W * .8, amp = (.15 + Math.abs(X.noise(i * .4 + t * 6)) * (.5 + .5 * Math.abs(Math.sin(i * .25 + t * 2)))) * u * 9; c.fillStyle = i / n < (speaker ? .5 : 1) && i / n > (speaker ? 0 : .5) ? X.a(pal[1], .25) : pal[speaker ? 3 : 2]; X.rr(c, x, wy - amp, W * .8 / n * .55, amp * 2, 2); c.fill(); }
    pill(c, u * 5, u * 4, u * 30, u * 7, pal[2]); T(c, "EPS 12 \u00b7 PODCAST", u * 20, u * 7.5, { size: u * 3.2, w: 800, fam: S.f1, color: pal[0], max: u * 26 });
    X.circle(c, W - u * 8, u * 7.5, u * 1.8); c.fillStyle = `rgba(255,60,60,${.5 + .5 * Math.sin(t * 6)})`; c.fill(); T(c, "REC", W - u * 11, u * 7.5, { size: u * 3.2, w: 700, fam: S.f2, color: "#fff", align: "right" });
  };
  // interview \u2014 off-centre warm doc, elegant name super
  PV.interview = (c, t, S) => {
    const { W, H, pal } = S, u = S.u, push = 1 + t * .008;
    c.save(); c.translate(W * .35, H * .6); c.scale(push, push); c.translate(-W * .35, -H * .6);
    c.fillStyle = X.lgrad(c, 0, 0, W, 0, [[0, X.shade(pal[0], .05)], [1, X.shade(pal[4], .1)]]); c.fillRect(0, 0, W, H);
    bokeh(c, W, H, [pal[2], "#ffcf8a", pal[2]], 14, t, 7, 1.4);
    c.fillStyle = X.a("#000", .25); c.fillRect(W * .62, H * .1, W * .05, H * .9);
    X.glow(c, W * .1, H * .3, W * .5, "#ffb36b", .25);
    guy(c, t, W * .34, H * .66, H * .82, Object.assign({ shirt: X.shade(pal[3], -.2), rim: pal[2], tilt: .08, seed: 5 }, CAST[2]));
    c.restore();
    X.letterbox(c, W, H, .07);
    const lp = E(t, .8, 2.2, "out5"), x = W * .6, y = H * .62;
    c.fillStyle = pal[2]; c.fillRect(x, y, W * .3 * lp, 1.4);
    c.save(); c.beginPath(); c.rect(x, y - u * 12, W * .38, u * 12); c.clip(); T(c, "Dr. Ratna Wijaya", x, y - u * 5 + (1 - E(t, 1.1, 2.2, "out5")) * u * 10, { size: u * 6.4, w: 400, fam: S.f1, color: pal[1], align: "left", max: W * .36 }); c.restore();
    T(c, "Sejarawan Maritim", x, y + u * 5, { size: u * 3.6, w: 400, fam: S.f2, color: pal[2], align: "left", ls: 3 * E(t, 1.5, 2.6), alpha: E(t, 1.5, 2.4) });
    const q = S.lines[1 + Math.floor(t / 3) % 3].c, qp = X.win(t % 3, .3, 3, .5, .4);
    T(c, "\u201c" + q + "\u201d", W / 2, H * .87, { size: u * 4.2, w: 400, fam: S.f1, color: X.a(pal[1], .9), alpha: t > 3 ? qp : 0, max: W * .8 });
    X.vignette(c, W, H, .55); X.grain(c, W, H, .3, t);
  };
  // testi \u2014 customer + quote card + rating
  PV.testi = (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    fill(c, W, H, pal[0]); c.fillStyle = X.a(pal[2], .12); X.circle(c, W * .22, H * .5, H * .55); c.fill();
    const fp = X.spring(seg(t, 0, .9), 7, 4.5); c.save(); c.translate(W * .26, H * .5); c.scale(fp, fp); c.rotate(-.03 + Math.sin(t) * .006);
    X.shadow(c, 24, 12, "rgba(0,0,0,.18)"); X.rr(c, -W * .17, -H * .38, W * .34, H * .76, 18); c.fillStyle = X.shade(pal[3], .55); c.fill(); X.noShadow(c);
    c.save(); X.rr(c, -W * .17, -H * .38, W * .34, H * .76, 18); c.clip(); X.glow(c, 0, -H * .1, W * .25, "#fff", .6); guy(c, t, 0, H * .2, H * .62, Object.assign({ shirt: pal[2], seed: 4 }, CAST[2])); c.restore();
    pill(c, -W * .12, H * .27, W * .24, u * 7, "rgba(255,255,255,.9)"); X.circle(c, -W * .09, H * .27 + u * 3.5, u * 1.5); c.fillStyle = "#e11"; c.fill(); T(c, "Pelanggan asli", u * 1.5, H * .27 + u * 3.5, { size: u * 3, w: 700, fam: S.f2, color: pal[1] });
    c.restore();
    const qx = W * .5, qy = H * .22, qp = E(t, .6, 1.5, "out5");
    c.globalAlpha = qp; X.shadow(c, 20, 10, "rgba(0,0,0,.12)"); X.rr(c, qx + (1 - qp) * 40, qy - H * .04, W * .45, H * .64, 16); c.fillStyle = pal[4]; c.fill(); X.noShadow(c);
    X.text(c, "\u201c", qx + u * 8, qy + u * 9, { size: u * 22, w: 800, fam: S.f1, color: pal[2] });
    const quote = "Dalam dua minggu, pesanan kami naik dua kali lipat. Timnya sabar dan cepat.", rev = seg(t, 1.3, 4);
    X.font(c, 600, u * 4.4, S.f1); const ls = X.wrap(c, quote, W * .37); let shown = Math.round(quote.length * rev);
    ls.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, shown)); shown -= ln.length + 1; T(c, part, qx + u * 7, qy + u * 16 + i * u * 6, { size: u * 4.4, w: 600, fam: S.f1, color: pal[1], align: "left" }); });
    stars(c, qx + u * 9, qy + H * .5, u * 4.6, 5, seg(t, 4, 5.4), pal[3], X.a(pal[1], .12));
    T(c, "4,9/5", qx + u * 40, qy + H * .5, { size: u * 5, w: 800, fam: S.f1, color: pal[1], align: "left", alpha: E(t, 5.2, 5.8) });
    c.globalAlpha = 1;
    lowerThird(c, S, W * .5, H * .9, E(t, 5.5, 6.4), "Rina \u00b7 Toko Kue Senja", "Klien sejak 2023", pal[2], "#fff");
  };
  // news \u2014 desk, LIVE, lower bar, ticker
  PV.news = (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, X.shade(pal[0], .15)], [1, X.shade(pal[0], -.3)]]); c.fillRect(0, 0, W, H);
    // video wall
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const x = W * .02 + i * W * .165, y = H * .05 + j * H * .17; c.fillStyle = X.a(i % 2 ? pal[4] : pal[2], .25 + .1 * Math.sin(t * 2 + i + j)); c.fillRect(x, y, W * .155, H * .155); }
    X.glow(c, W * .5, H * .3, W * .4, pal[3], .15);
    const side = X.spring(seg(t, 2.2, 3)); if (side > 0) { c.save(); c.translate(W * .78, H * .33); c.scale(side, side); X.rr(c, -W * .15, -H * .15, W * .3, H * .3, 8); c.fillStyle = pal[4]; c.fill(); c.strokeStyle = pal[3]; c.lineWidth = 2; c.stroke(); X.icon(c, "chart", 0, -u * 2, u * 14, pal[3], { lw: 2.5, p: seg(t, 2.6, 3.6) }); X.text(c, "INFLASI 2,1%", 0, H * .1, { size: u * 3.6, w: 700, fam: S.f1, color: "#fff" }); c.restore(); }
    guy(c, t, W * .42, H * .6, H * .62, Object.assign({ shirt: "#1b2433", seed: 6 }, CAST[0]));
    // desk
    c.fillStyle = X.lgrad(c, 0, H * .66, 0, H, [[0, X.shade(pal[4], .2)], [1, X.shade(pal[0], -.4)]]); c.beginPath(); c.moveTo(W * .1, H * .68); c.lineTo(W * .9, H * .68); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.fillStyle = pal[2]; c.fillRect(W * .1, H * .68, W * .8, 3);
    // lower bar
    const bp = E(t, .6, 1.3, "out5"); c.save(); c.beginPath(); c.rect(0, H * .7, W * bp, H * .2); c.clip();
    c.fillStyle = pal[2]; c.fillRect(W * .05, H * .72, W * .17, H * .1); T(c, "BERITA", W * .135, H * .77, { size: u * 5, w: 700, fam: S.f1, color: "#fff" });
    c.fillStyle = "#fff"; c.fillRect(W * .22, H * .72, W * .73, H * .1); T(c, S.lines[Math.floor(t / 2.7) % 4].j.toUpperCase(), W * .24, H * .77, { size: u * 5.4, w: 700, fam: S.f1, color: pal[0], align: "left", max: W * .68 });
    c.restore();
    // ticker
    c.fillStyle = pal[3]; c.fillRect(0, H * .88, W, H * .12); c.fillStyle = pal[0]; c.fillRect(0, H * .88, W * .14, H * .12); T(c, "TERKINI", W * .07, H * .94, { size: u * 4, w: 700, fam: S.f1, color: "#fff" });
    c.save(); c.beginPath(); c.rect(W * .14, H * .88, W, H * .12); c.clip(); const tick = S.lines.map((l) => l.c).join("   \u2022   ") + "   \u2022   "; X.font(c, 600, u * 4, S.f2); const tw = c.measureText(tick).width, ox = (t * 60) % tw;
    for (let k = 0; k < 3; k++) T(c, tick, W * .16 - ox + k * tw, H * .94, { size: u * 4, w: 600, fam: S.f2, color: pal[0], align: "left" }); c.restore();
    // LIVE + clock
    const lv = .6 + .4 * Math.sin(t * 5); pill(c, u * 5, u * 5, u * 17, u * 7, pal[2]); X.circle(c, u * 9, u * 8.5, u * 1.6); c.fillStyle = `rgba(255,255,255,${lv})`; c.fill(); T(c, "LIVE", u * 15, u * 8.5, { size: u * 3.8, w: 700, fam: S.f1, color: "#fff" });
    T(c, "19:0" + Math.floor(t / 4) + " WIB", u * 25, u * 8.5, { size: u * 3.8, w: 600, fam: S.f2, color: "#fff", align: "left" });
  };
  // panel \u2014 slide with building bullets, presenter in corner bubble
  PV.panel = (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    fill(c, W, H, pal[0]); c.fillStyle = X.a(pal[2], .06); for (let i = 0; i < 12; i++) c.fillRect(0, i * H / 12, W, 1);
    const sp = E(t, 0, .8, "out5"); c.save(); c.translate(0, (1 - sp) * 30); c.globalAlpha = sp;
    X.shadow(c, 26, 12, "rgba(0,0,0,.12)"); X.rr(c, W * .05, H * .1, W * .66, H * .8, 16); c.fillStyle = pal[4]; c.fill(); X.noShadow(c);
    c.fillStyle = pal[2]; X.rr(c, W * .05, H * .1, W * .66, u * 2, 1); c.fill();
    T(c, "Modul 3", W * .09, H * .2, { size: u * 3.4, w: 700, fam: S.f2, color: pal[2], align: "left", ls: 2 });
    T(c, S.lines[0].j, W * .09, H * .3, { size: u * 6.6, w: 700, fam: S.f1, color: pal[1], align: "left", max: W * .58 });
    [1, 2, 3].forEach((k) => {
      const a = 1.2 + (k - 1) * 1.8, p = E(t, a, a + .6, "out5"), y = H * .3 + k * H * .15, act = t > a && t < a + 1.8;
      if (act) { X.rr(c, W * .075, y - u * 5.5, W * .61 * p, u * 11, 8); c.fillStyle = X.a(pal[2], .1); c.fill(); }
      c.save(); c.translate(W * .1, y); const cp = X.spring(seg(t, a + .2, a + .8), 10, 4); c.scale(cp, cp); X.circle(c, 0, 0, u * 3.4); c.fillStyle = pal[act ? 3 : 2]; c.fill(); X.icon(c, "check", 0, 0, u * 4, "#fff", { lw: 3, p: seg(t, a + .3, a + .8) }); c.restore();
      T(c, S.lines[k].j, W * .15 + (1 - p) * 30, y, { size: u * 4.8, w: 600, fam: S.f2, color: pal[1], align: "left", alpha: p, max: W * .52 });
    });
    c.restore();
    // pointer
    const pk = Math.min(3, Math.max(1, Math.floor((t - 1.2) / 1.8) + 1)), py = H * .3 + pk * H * .15;
    if (t > 1.4) { c.fillStyle = pal[3]; c.beginPath(); c.moveTo(W * .7, py); c.lineTo(W * .725, py - u * 2.4); c.lineTo(W * .725, py + u * 2.4); c.closePath(); c.fill(); }
    // presenter bubble
    const bp = X.spring(seg(t, .4, 1.2), 8, 4.5), bx = W * .85, by = H * .68, br = H * .22;
    c.save(); c.translate(bx, by); c.scale(bp, bp); X.shadow(c, 20, 8, "rgba(0,0,0,.2)"); X.circle(c, 0, 0, br); c.fillStyle = X.shade(pal[2], .7); c.fill(); X.noShadow(c);
    c.save(); X.circle(c, 0, 0, br); c.clip(); guy(c, t, 0, br * .55, br * 1.6, Object.assign({ shirt: pal[2], seed: 8 }, CAST[1])); c.restore();
    c.strokeStyle = pal[2]; c.lineWidth = 4; X.circle(c, 0, 0, br); c.stroke();
    c.strokeStyle = pal[3]; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, br + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (t / S.L)); c.stroke(); c.restore();
    T(c, "Bu Maya \u00b7 Trainer", bx, by + br + u * 6, { size: u * 3.4, w: 700, fam: S.f2, color: pal[1], alpha: bp });
  };
  // react (9:16) \u2014 source post top, reacting face bottom, emoji pops
  PV.react = (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    fill(c, W, H, pal[0]);
    // source post
    const zp = 1 + E(t, 2, 4, "inOut") * .12 - E(t, 6, 7, "inOut") * .12, pp = E(t, 0, .7, "out5");
    c.save(); c.translate(W / 2, H * .25); c.scale(zp * pp, zp * pp); c.rotate(-.015);
    X.rr(c, -W * .44, -H * .2, W * .88, H * .4, 14); c.fillStyle = pal[4]; c.fill(); c.strokeStyle = X.a(pal[1], .15); c.lineWidth = 1; c.stroke();
    X.circle(c, -W * .36, -H * .155, u * 4); c.fillStyle = pal[3]; c.fill(); T(c, "@infoviral", -W * .31, -H * .16, { size: u * 4, w: 700, fam: S.f2, color: "#fff", align: "left" }); T(c, "2 jam", W * .38, -H * .16, { size: u * 3.2, w: 400, fam: S.f2, color: "#999", align: "right" });
    T(c, "Harga kopi naik 3x lipat bulan ini?!", -W * .4, -H * .1, { size: u * 4.8, w: 700, fam: S.f2, color: "#fff", align: "left", max: W * .8 });
    X.rr(c, -W * .4, -H * .065, W * .8, H * .22, 10); c.fillStyle = X.lgrad(c, 0, -H * .07, 0, H * .15, [[0, "#6b4a33"], [1, "#2b1a10"]]); c.fill();
    c.fillStyle = "#f2e2c8"; c.beginPath(); c.ellipse(0, H * .05, u * 12, u * 4, 0, 0, TAU); c.fill(); c.fillStyle = "#c98a4b"; c.fillRect(-u * 9, H * .05, u * 18, u * 14);
    for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(255,255,255,${.3 + .2 * Math.sin(t * 2 + i)})`; c.lineWidth = 2; c.beginPath(); c.moveTo(-u * 4 + i * u * 4, H * .03); c.quadraticCurveTo(-u * 7 + i * u * 4 + Math.sin(t * 3 + i) * 4, -H * .01, -u * 3 + i * u * 4, -H * .04); c.stroke(); }
    c.restore();
    T(c, "SERIUS?!", W / 2, H * .5, { size: u * 13 * (1 + .1 * X.beat(t, 75)), w: 400, fam: S.f1, color: pal[2], stroke: "#000", lw: 6, alpha: t > 2 ? 1 : 0, max: W * .8 });
    // reactor
    c.save(); c.beginPath(); c.rect(0, H * .56, W, H * .44); c.clip();
    c.fillStyle = X.lgrad(c, 0, H * .56, 0, H, [[0, "#2a2a32"], [1, "#101014"]]); c.fillRect(0, H * .56, W, H * .44); X.glow(c, W * .8, H * .65, W * .4, pal[3], .25);
    const shock = t > 2 && t < 4.5, s = W * 1.05 * (shock ? 1.06 : 1);
    guy(c, t, W / 2, H * .86, s, Object.assign({ shirt: "#3a3a46", seed: 9, mouth: shock ? .9 : undefined, brow: shock ? 5 : 0, tilt: shock ? -.06 : 0 }, CAST[0]));
    c.restore();
    c.fillStyle = pal[2]; c.fillRect(0, H * .555, W, 3);
    [[2.1, "\ud83d\ude31", .2, .7], [3.2, "\ud83e\udd2f", .82, .64], [5, "\ud83d\ude02", .78, .8], [6.2, "\ud83d\udc40", .18, .85]].forEach(([a, e, x, y]) => { const d = t - a; if (d < 0 || d > 1.8) return; const p = X.spring(cl(d * 2), 10, 4); c.save(); c.translate(W * x, H * y - d * 30); c.scale(p, p); c.rotate(Math.sin(d * 6) * .15); c.globalAlpha = cl(2 - d * 1.1); X.text(c, e, 0, 0, { size: u * 13, w: 400, fam: "Segoe UI Emoji" }); c.restore(); });
    caption(c, S, "Oke, kita bedah satu-satu", H * .95, E(t, 4.5, 5), { w: 800, bg: pal[3], color: "#000" });
  };
  // webinar \u2014 title card \u2192 slide + small cam + lower third
  PV.webinar = (c, t, S) => {
    const { W, H, pal } = S, u = S.u;
    fill(c, W, H, pal[0]); c.fillStyle = X.a(pal[2], .08); X.circle(c, W * .9, H * .1, H * .5); c.fill();
    if (t < 2) {
      const p = E(t, .1, .9, "out5"), o = 1 - E(t, 1.6, 2);
      c.globalAlpha = o; c.fillStyle = pal[2]; c.fillRect(W * .1, H * .58, W * .3 * p, 3);
      c.save(); c.beginPath(); c.rect(0, H * .3, W, H * .26); c.clip(); T(c, "Strategi Tumbuh 2026", W * .1, H * .46 + (1 - p) * u * 14, { size: u * 9, w: 800, fam: S.f1, color: pal[1], align: "left", max: W * .8 }); c.restore();
      T(c, "WEBINAR \u00b7 KAMIS, 14.00 WIB", W * .1, H * .66, { size: u * 3.6, w: 600, fam: S.f2, color: pal[2], align: "left", ls: 3, alpha: E(t, .5, 1.1) }); c.globalAlpha = 1;
      return;
    }
    const lt = t - 2, sp = E(lt, 0, .7, "out5");
    c.save(); c.globalAlpha = sp; c.translate((1 - sp) * -30, 0);
    X.rr(c, W * .04, H * .08, W * .64, H * .68, 12); c.fillStyle = pal[3]; c.fill();
    T(c, S.lines[1].j, W * .08, H * .2, { size: u * 5.6, w: 800, fam: S.f1, color: pal[0], align: "left", max: W * .56 });
    const vals = [.35, .52, .48, .7, .88]; vals.forEach((v, i) => { const p = X.spring(seg(lt, .5 + i * .2, 1.3 + i * .2), 8, 5), bh = H * .4 * v * p, x = W * .1 + i * W * .11; c.fillStyle = i === 4 ? pal[2] : X.a(pal[0], .6); X.rr(c, x, H * .7 - bh, W * .07, bh, 4); c.fill(); });
    c.strokeStyle = X.a(pal[0], .3); c.lineWidth = 1; c.beginPath(); c.moveTo(W * .08, H * .7); c.lineTo(W * .64, H * .7); c.stroke();
    if (lt > 2) T(c, "+88%", W * .54 + u * 2, H * .7 - H * .4 * .88 - u * 5, { size: u * 5, w: 800, fam: S.f1, color: pal[2], alpha: E(lt, 2, 2.5) });
    c.restore();
    // cam
    const cp = X.spring(seg(lt, .3, 1.1), 8, 5); c.save(); c.translate(W * .84, H * .3); c.scale(cp, cp);
    X.rr(c, -W * .13, -H * .2, W * .26, H * .4, 10); c.fillStyle = X.shade(pal[4], -.3); c.fill(); c.save(); X.rr(c, -W * .13, -H * .2, W * .26, H * .4, 10); c.clip(); X.glow(c, 0, -H * .05, W * .15, pal[2], .3); guy(c, t, 0, H * .17, H * .38, Object.assign({ shirt: "#24364d", seed: 10 }, CAST[2])); c.restore();
    c.strokeStyle = pal[2]; c.lineWidth = 2; X.rr(c, -W * .13, -H * .2, W * .26, H * .4, 10); c.stroke(); c.restore();
    // participants + Q&A
    pill(c, W * .72, H * .56, W * .24, u * 7, X.a(pal[1], .1)); X.icon(c, "user", W * .745, H * .56 + u * 3.5, u * 4, pal[2]); T(c, Math.round(240 + lt * 19) + " peserta", W * .77, H * .56 + u * 3.5, { size: u * 3.4, w: 600, fam: S.f2, color: pal[1], align: "left" });
    if (lt > 3.4) { const qp = X.spring(seg(lt, 3.4, 4)); c.save(); c.translate(W * .84, H * .7); c.scale(qp, qp); X.rr(c, -W * .12, -u * 5, W * .24, u * 10, 8); c.fillStyle = pal[1]; c.fill(); X.icon(c, "chat", -W * .085, 0, u * 4.4, pal[0]); T(c, "Q&A dibuka", u * 2, 0, { size: u * 3.4, w: 700, fam: S.f2, color: pal[0] }); c.restore(); }
    lowerThird(c, S, W * .04, H * .9, E(lt, .8, 1.6), "Hendra Gunawan", "Head of Growth, Arunika", pal[2], "#fff", pal[4]);
  };
  // vlog (9:16) \u2014 handheld selfie, timestamps, stickers, whip pans between places
  const PLACES = [["#9ed0f0", "#f6e3b4", "08.12", "Pagi"], ["#d9a06b", "#5a3a26", "11.40", "Kafe"], ["#7aa0c4", "#2c3e50", "16.05", "Kantor"]];
  PV.vlog = (c, t, S) => {
    const { W, H, pal } = S, u = S.u, seg3 = 8 / 3, idx = Math.min(2, Math.floor(t / seg3)), lt = t - idx * seg3, pl = PLACES[idx];
    const whipIn = 1 - E(lt, 0, .32, "out5"), whipOut = E(lt, seg3 - .25, seg3, "in"), sh = (whipOut - whipIn) * W * 1.1;
    fill(c, W, H, pl[1]); c.save(); c.translate(-sh, 0); handheld(c, W, H, t, 1.6); c.translate(-12, -12); c.scale((W + 24) / W, (H + 24) / H);
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, pl[0]], [1, pl[1]]]); c.fillRect(0, 0, W, H);
    if (idx === 0) { X.glow(c, W * .8, H * .15, W * .4, "#fff3c4", .9); c.fillStyle = "#6c8f6a"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(i * W * .22, H * .62, W * .16, Math.PI, 0); c.fill(); } c.fillStyle = "#cfc6b3"; c.fillRect(0, H * .62, W, H * .4); }
    if (idx === 1) { bokeh(c, W, H * .6, ["#ffcf8a", "#ffb36b"], 10, t, 11, 1.2); c.fillStyle = "#3b2616"; c.fillRect(0, H * .75, W, H * .25); }
    if (idx === 2) { c.fillStyle = "rgba(255,255,255,.15)"; for (let i = 0; i < 5; i++) c.fillRect(i * W * .22, H * .1, W * .16, H * .45); c.fillStyle = "#1f2a36"; c.fillRect(0, H * .72, W, H * .3); }
    guy(c, t, W * .5, H * .78, W * 1.2, Object.assign({ shirt: [pal[2], pal[3], "#3d5a80"][idx], seed: 12, tilt: -.06 }, CAST[0]));
    // arm toward camera
    c.fillStyle = CAST[0].skin; c.beginPath(); c.ellipse(W * .95, H * .98, W * .12, H * .08, -.6, 0, TAU); c.fill();
    c.restore();
    // motion streaks during whip
    const wv = Math.max(whipIn, whipOut); if (wv > .05) { c.fillStyle = `rgba(255,255,255,${wv * .35})`; for (let i = 0; i < 18; i++) c.fillRect(0, X.hash(i + idx) * H, W, 1 + X.hash(i * 3) * 5); }
    // timestamp + caption + stickers
    const tp = X.spring(seg(lt, .3, .9), 9, 4);
    c.save(); c.translate(u * 22, H * .1); c.scale(tp, tp); c.rotate(-.05); X.rr(c, -u * 17, -u * 7, u * 34, u * 14, 8); c.fillStyle = "#fff"; c.fill(); X.text(c, pl[2] + " \u00b7 " + pl[3], 0, 0, { size: u * 7, w: 700, fam: S.f1, color: pal[1] }); c.restore();
    const sp = X.spring(seg(lt, .6, 1.2), 10, 3.5); c.save(); c.translate(W * .8, H * .3); c.rotate(.2 + Math.sin(t * 3) * .08); c.scale(sp, sp); X.text(c, ["\u2600\ufe0f", "\u2615", "\ud83d\udcbb"][idx], 0, 0, { size: u * 15, w: 400, fam: "Segoe UI Emoji" }); c.restore();
    T(c, S.lines[idx + 1].j, W / 2, H * .55, { size: u * 9, w: 700, fam: S.f1, color: "#fff", stroke: X.a(pal[1], .8), lw: 5, alpha: X.win(lt, .5, seg3 - .1, .3, .2), max: W * .86 });
    X.circle(c, W - u * 8, u * 8, u * 2); c.fillStyle = `rgba(255,50,50,${.5 + .5 * Math.sin(t * 6)})`; c.fill();
    T(c, "REC " + "0:0" + Math.floor(t), W - u * 12, u * 8, { size: u * 3.6, w: 700, fam: S.f2, color: "#fff", align: "right" });
  };

  PS.def("presenter", (c, t, S) => { (PV[S.v] || PV.yt)(c, t, S); if (S.v !== "news" && S.v !== "panel" && S.v !== "testi") X.grain(c, S.W, S.H, .12, t); });
})(typeof globalThis !== "undefined" ? globalThis : this);
