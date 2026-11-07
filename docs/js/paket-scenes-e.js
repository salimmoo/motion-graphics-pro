/* paket-scenes-e.js — Short vertikal (SHO) scenes for PaketScenes. 9:16 (SHO-04 = 4:5). */
(function () {
  const PS = window.PaketScenes; if (!PS) return;
  const X = PS.X, TAU = Math.PI * 2;

  /* ---------- local helpers ---------- */
  const fitSize = (c, s, maxW, size, w, fam) => { X.font(c, w, size, fam); const m = c.measureText(s).width; return m > maxW ? size * maxW / m : size; };
  // fit text in a box: returns {lines,size}
  const fitBox = (c, s, maxW, maxLines, size, w, fam) => {
    let sz = size, lines;
    for (let i = 0; i < 14; i++) { X.font(c, w, sz, fam); lines = X.wrap(c, s, maxW); if (lines.length <= maxLines && lines.every((l) => c.measureText(l).width <= maxW)) break; sz *= .9; }
    return { lines, size: sz };
  };
  // vertical-app chrome: progress bar, right rail, handle + caption
  function rail(c, S, t, o = {}) {
    const { W, H, pal } = S, ink = o.ink || "#fff", x = W - 30;
    const items = [["heart", "48,2K"], ["chat", "1.204"], ["star", "9.870"]];
    items.forEach(([ic, n], i) => {
      const y = H * .52 + i * 62, pop = i === 0 ? X.spring(X.seg(t, o.like || 2.2, (o.like || 2.2) + .9)) : 1;
      c.save(); c.translate(x, y); const s = 1 + (i === 0 ? Math.max(0, (pop - 1)) * 1.2 + (1 - Math.min(1, pop)) * 0 : 0); c.scale(s, s);
      c.fillStyle = "rgba(0,0,0,.28)"; X.circle(c, 0, 0, 19); c.fill();
      const liked = i === 0 && t > (o.like || 2.2);
      X.icon(c, ic, 0, 0, 22, liked ? (o.likeCol || "#FF3B5C") : ink, { lw: 2, fill: liked ? (o.likeCol || "#FF3B5C") : null });
      c.restore();
      X.text(c, n, x, y + 30, { size: 10, w: 600, fam: "Inter", color: ink });
    });
  }
  function handle(c, S, t, name, cap, o = {}) {
    const { W, H } = S, ink = o.ink || "#fff";
    X.text(c, name, 16, H - 78, { size: 14, w: 700, fam: S.f2, color: ink, align: "left" });
    const sz = fitSize(c, cap, W - 90, 12, 400, S.f2);
    X.text(c, cap, 16, H - 58, { size: sz, w: 400, fam: S.f2, color: X.a(o.inkHex || "#ffffff", .85), align: "left" });
    // music line scroller
    c.save(); c.beginPath(); c.rect(34, H - 46, 150, 18); c.clip();
    const mt = "♪ suara asli · trending · ♪ suara asli · trending";
    X.text(c, mt, 34 - (t * 22) % 160, H - 37, { size: 11, w: 500, fam: "Inter", color: X.a(o.inkHex || "#ffffff", .8), align: "left" });
    c.restore();
    c.save(); c.translate(22, H - 37); c.rotate(t * 2); c.fillStyle = "#222"; X.circle(c, 0, 0, 8); c.fill(); c.fillStyle = o.disc || "#fff"; X.circle(c, 0, 0, 3); c.fill(); c.restore();
  }
  function progress(c, S, t, col, back = "rgba(255,255,255,.25)", y) {
    const { W, H, L } = S; y = y == null ? H - 6 : y;
    c.fillStyle = back; c.fillRect(0, y, W, 3); c.fillStyle = col; c.fillRect(0, y, W * (t / L), 3);
    X.circle(c, W * (t / L), y + 1.5, 4); c.fill();
  }
  const shakeAt = (t, times, amp = 7, dur = .28) => { let dx = 0, dy = 0; for (const s of times) { const k = X.seg(t, s, s + dur); if (k > 0 && k < 1) { const d = (1 - k) * amp; dx += X.noise(t * 40 + s) * d; dy += X.noise(t * 40 + s + 50) * d; } } return [dx, dy]; };

  /* ================= SHO-01 · hookText ================= */
  PS.def("hookText", (c, t, S) => {
    const { W, H, pal } = S, Y = pal[2], R = pal[3];
    const words = S.lines[0].j.toUpperCase().split(/\s+/);
    const slams = words.map((_, i) => .15 + i * .28);
    const [sx, sy] = shakeAt(t, slams.concat([2.9, 5.6]), 9);
    // bg: dark with pulsing glow + speed lines
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const pulse = X.beat(t, 128, 5);
    X.glow(c, W / 2, H * .42, W * (.9 + pulse * .15), Y, .16 + pulse * .1);
    c.save(); c.translate(W / 2, H * .42); c.strokeStyle = X.a(pal[1], .07); c.lineWidth = 2;
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + t * .15, r0 = 120 + ((t * 260 + i * 53) % 320); c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * (r0 + 40), Math.sin(a) * (r0 + 40)); c.stroke(); }
    c.restore();
    c.save(); c.translate(sx, sy);
    // top pill
    const pillA = X.E(t, .05, .4);
    c.globalAlpha = pillA; c.fillStyle = R; X.rr(c, W / 2 - 78, 74, 156, 28, 14); c.fill();
    X.text(c, "TONTON SAMPAI HABIS", W / 2, 88, { size: 11, w: 800, fam: S.f2, color: "#fff", ls: 1 });
    c.globalAlpha = 1;
    if (t < 2.75) {
      // phase 1: hook words stacked
      const out = X.E(t, 2.45, 2.75, "in");
      const lh = 0;
      let sizes = words.map((w) => Math.min(96, fitSize(c, w, W * .72, 96, 400, S.f1)));
      const tot = sizes.reduce((a, b) => a + b * .98, 0); let y = H * .42 - tot / 2;
      words.forEach((w, i) => {
        const sz = sizes[i], k = X.seg(t, slams[i], slams[i] + .22), e = X.ease.out5(k);
        const sc = X.lerp(2.6, 1, e) * (1 + out * .4), yy = y + sz * .49;
        y += sz * .98;
        if (k <= 0) return;
        c.save(); c.translate(W / 2 - 14, yy); c.scale(sc, sc); c.rotate((1 - e) * (i % 2 ? .08 : -.08)); c.globalAlpha = Math.min(1, k * 3) * (1 - out);
        const hi = i === 1;
        if (hi) { const bw = X.measure(c, w, 400, sz, S.f1) + 22; c.fillStyle = Y; c.save(); c.rotate(-.03); c.fillRect(-bw / 2 * X.E(t, slams[i] + .1, slams[i] + .35), -sz * .5, bw * X.E(t, slams[i] + .1, slams[i] + .35), sz * .98); c.restore(); }
        X.text(c, w, 3, 4, { size: sz, w: 400, fam: S.f1, color: "rgba(0,0,0,.5)" });
        X.text(c, w, 0, 0, { size: sz, w: 400, fam: S.f1, color: hi ? pal[0] : pal[1] });
        c.restore(); void lh;
      });
      // flash on each slam
      for (const s of slams) { const f = 1 - X.seg(t, s, s + .12); if (f > 0 && f < 1) { c.fillStyle = X.a(pal[1], f * .25); c.fillRect(-20, -20, W + 40, H + 40); } }
      const cap = S.lines[0].c, ca = X.E(t, 1.4, 1.8);
      const cs = fitSize(c, cap, W * .8, 17, 600, S.f2);
      c.globalAlpha = ca * (1 - out); X.text(c, cap, W / 2, H * .42 + tot / 2 + 34 + (1 - ca) * 12, { size: cs, w: 600, fam: S.f2, color: Y }); c.globalAlpha = 1;
    } else if (t < 5.5) {
      // phase 2: quick content cards
      [0, 1].forEach((i) => {
        const st = 2.85 + i * 1.15, k = X.spring(X.seg(t, st, st + .9)), a = X.seg(t, st, st + .15);
        if (a <= 0) return;
        const cy = H * .3 + i * 158, x0 = 20, w = W - 82;
        c.save(); c.globalAlpha = a; c.translate((1 - k) * W * .9, 0); c.rotate((1 - k) * .1);
        X.shadow(c, 24, 10, "rgba(0,0,0,.45)"); c.fillStyle = "#fff"; X.rr(c, x0, cy, w, 132, 18); c.fill(); X.noShadow(c);
        c.fillStyle = i ? R : Y; X.rr(c, x0 + 16, cy + 16, 46, 46, 12); c.fill();
        X.text(c, String(i + 1), x0 + 39, cy + 40, { size: 30, w: 400, fam: S.f1, color: i ? "#fff" : pal[0] });
        const j = S.lines[1 + i].j, cp = S.lines[1 + i].c;
        X.text(c, j.toUpperCase(), x0 + 76, cy + 40, { size: fitSize(c, j.toUpperCase(), w - 92, 26, 400, S.f1), w: 400, fam: S.f1, color: "#111", align: "left" });
        const fb = fitBox(c, cp, w - 32, 2, 16, 500, S.f2);
        fb.lines.forEach((l, li) => X.text(c, l, x0 + 16, cy + 84 + li * fb.size * 1.3, { size: fb.size, w: 500, fam: S.f2, color: "#444", align: "left" }));
        c.fillStyle = i ? R : Y; c.fillRect(x0 + 16, cy + 118, (w - 32) * X.E(t, st + .3, st + 1.2), 4);
        c.restore();
      });
    } else {
      // phase 3: save CTA with bookmark bounce
      const k = X.spring(X.seg(t, 5.55, 6.6)), bw = 120;
      c.save(); c.translate(W / 2, H * .36); c.scale(k, k); c.rotate(Math.sin(t * 7) * .05 * (1 - X.seg(t, 6, 7)));
      c.fillStyle = Y; c.beginPath(); c.moveTo(-bw / 3, -bw / 2); c.lineTo(bw / 3, -bw / 2); c.lineTo(bw / 3, bw / 2); c.lineTo(0, bw / 4); c.lineTo(-bw / 3, bw / 2); c.closePath(); c.fill();
      c.restore();
      const j = S.lines[2].j.toUpperCase(), sz = fitSize(c, j, W * .7, 64, 400, S.f1), a = X.E(t, 5.8, 6.2, "back");
      c.save(); c.translate(W / 2 - 14, H * .55); c.scale(.6 + a * .4, .6 + a * .4); c.globalAlpha = X.seg(t, 5.8, 5.95);
      X.text(c, j, 0, 0, { size: sz, w: 400, fam: S.f1, color: pal[1] }); c.restore();
      const p2 = S.lines[3].j, pa = X.E(t, 6.4, 6.8);
      c.globalAlpha = pa; c.fillStyle = R; X.rr(c, W / 2 - 70, H * .62, 140, 34, 17); c.fill();
      X.text(c, p2, W / 2, H * .62 + 17, { size: fitSize(c, p2, 120, 15, 800, S.f2), w: 800, fam: S.f2, color: "#fff" }); c.globalAlpha = 1;
    }
    c.restore();
    rail(c, S, t, { like: 1.6 });
    handle(c, S, t, "@faktaharian", "#fyp #tips #faktanya");
    progress(c, S, t, Y);
  });

  /* ================= SHO-02 · factCards ================= */
  function illo(c, k, x, y, w, h, t, pal) {
    c.save(); X.rr(c, x, y, w, h, 18); c.clip();
    const z = 1.06 + t * .03, cx = x + w / 2, cy = y + h / 2;
    c.translate(cx + Math.sin(t * .4) * 8, cy); c.scale(z, z); c.translate(-cx, -cy);
    if (k === 0) { // space
      c.fillStyle = X.lgrad(c, 0, y, 0, y + h, [[0, "#050816"], [1, X.mix(pal[4], pal[2], .25)]]); c.fillRect(x, y, w, h);
      for (let i = 0; i < 60; i++) { c.fillStyle = X.a("#ffffff", .3 + X.hash(i) * .7 * (.6 + .4 * Math.sin(t * 3 + i))); c.fillRect(x + X.hash(i + 3) * w, y + X.hash(i + 9) * h, 1.6, 1.6); }
      X.glow(c, cx + 30, cy - 10, 120, pal[2], .35);
      c.fillStyle = X.lgrad(c, cx - 50, cy - 70, cx + 90, cy + 50, [[0, pal[2]], [1, pal[3]]]); X.circle(c, cx + 30, cy - 10, 62); c.fill();
      c.strokeStyle = X.a("#ffffff", .6); c.lineWidth = 3; c.beginPath(); c.ellipse(cx + 30, cy - 10, 105, 22, -.3, 0, TAU); c.stroke();
      c.fillStyle = "#0b0f22"; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w * .3, y + h * .72); c.lineTo(x + w * .55, y + h * .86); c.lineTo(x + w * .8, y + h * .68); c.lineTo(x + w, y + h * .82); c.lineTo(x + w, y + h); c.fill();
    } else if (k === 1) { // ocean
      c.fillStyle = X.lgrad(c, 0, y, 0, y + h, [[0, X.mix(pal[3], "#ffffff", .3)], [.55, "#ffd2a6"], [.56, X.mix(pal[2], "#003355", .45)], [1, "#06243a"]]); c.fillRect(x, y, w, h);
      X.glow(c, cx, y + h * .52, 110, "#ffcf8a", .7); c.fillStyle = "#fff4dd"; X.circle(c, cx, y + h * .52, 30); c.fill();
      for (let r = 0; r < 7; r++) { c.strokeStyle = X.a("#ffffff", .18 + r * .04); c.lineWidth = 2; c.beginPath(); const yy = y + h * (.6 + r * .06); for (let xx = x; xx <= x + w; xx += 8) c.lineTo(xx, yy + Math.sin(xx * .05 + t * 2 + r) * (2 + r)); c.stroke(); }
    } else { // city
      c.fillStyle = X.lgrad(c, 0, y, 0, y + h, [[0, X.mix(pal[3], pal[0], .4)], [1, pal[2]]]); c.fillRect(x, y, w, h);
      for (let L = 0; L < 2; L++) for (let i = 0; i < 9; i++) { const bw = w / 7, bx = x + i * bw * .8 - L * 20 + (L ? t * 4 : t * 9) % bw, bh = h * (.3 + X.hash(i * 7 + L) * .45); c.fillStyle = L ? "#0c1222" : "#1b2440"; c.fillRect(bx, y + h - bh, bw * .72, bh);
        if (L) for (let wy = 0; wy < 7; wy++) for (let wx = 0; wx < 3; wx++) if (X.hash(i * 31 + wy * 5 + wx) > .45) { c.fillStyle = X.a("#ffe08a", .7); c.fillRect(bx + 5 + wx * bw * .2, y + h - bh + 8 + wy * 14, 4, 6); } }
    }
    c.restore();
  }
  PS.def("factCards", (c, t, S) => {
    const { W, H, pal } = S, A = pal[2], B = pal[3];
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    X.glow(c, W * .2, H * .15, 260, A, .12); X.glow(c, W * .9, H * .85, 260, B, .12);
    const facts = [["87%", 0, S.lines[0]], ["3x", 1, S.lines[1]], ["1/4", 2, S.lines[2]]];
    const D = 8 / 3;
    // story segments
    for (let i = 0; i < 3; i++) { const sx = 14 + i * ((W - 28) / 3); c.fillStyle = "rgba(255,255,255,.22)"; X.rr(c, sx, 14, (W - 28) / 3 - 6, 3, 2); c.fill(); c.fillStyle = "#fff"; X.rr(c, sx, 14, ((W - 28) / 3 - 6) * X.clamp((t - i * D) / D), 3, 2); c.fill(); }
    facts.forEach(([num, ill, ln], i) => {
      const s0 = i * D, lt = t - s0;
      const inK = i === 0 ? 1 : X.E(t, s0 - .05, s0 + .45, "out5"), outK = i === 2 ? 0 : X.E(t, s0 + D - .05, s0 + D + .4, "inOut");
      if (lt < -.1 || lt > D + .45) return;
      const ox = (1 - inK) * W - outK * W * 1.05;
      c.save(); c.translate(ox, 0); c.rotate(-outK * .05);
      // chip
      c.fillStyle = A; X.rr(c, 22, 36, 92, 26, 13); c.fill();
      X.text(c, "FAKTA #" + (i + 1), 68, 49.5, { size: 12, w: 800, fam: S.f1, color: pal[0], ls: 1 });
      // image panel
      X.shadow(c, 26, 14, "rgba(0,0,0,.5)"); c.fillStyle = "#000"; X.rr(c, 22, 76, W - 44, H * .4, 18); c.fill(); X.noShadow(c);
      illo(c, ill, 22, 76, W - 44, H * .4, Math.max(0, lt), pal);
      // big number count
      const p = X.E(lt, .25, 1.3, "out5"), n = parseFloat(num), suf = num.replace(/[\d.]/g, "");
      const shown = num.includes("/") ? num : (Math.round(n * p) + suf);
      const ny = 76 + H * .4 + 72, ns = fitSize(c, shown, W - 60, 84, 800, S.f1);
      c.save(); c.translate(30, ny); c.scale(.8 + .2 * X.ease.back(X.seg(lt, .2, .6)), .8 + .2 * X.ease.back(X.seg(lt, .2, .6)));
      X.text(c, shown, 0, 0, { size: ns, w: 800, fam: S.f1, color: A, align: "left" }); c.restore();
      // caption with underline
      const fb = fitBox(c, ln.c, W - 60, 2, 22, 700, S.f1);
      fb.lines.forEach((l, li) => { const a = X.E(lt, .6 + li * .15, 1 + li * .15); c.globalAlpha = a; X.text(c, l, 30, ny + 66 + li * fb.size * 1.3 + (1 - a) * 10, { size: fb.size, w: 700, fam: S.f1, color: pal[1], align: "left" }); c.globalAlpha = 1; });
      X.font(c, 700, fb.size, S.f1); const uw = c.measureText(fb.lines[0]).width;
      c.strokeStyle = B; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); const ux = 30, uy = ny + 66 + fb.size * .62;
      const up = X.E(lt, 1.1, 1.7); c.moveTo(ux, uy); for (let k = 0; k <= 20 * up; k++) c.lineTo(ux + uw * k / 20, uy + Math.sin(k * .9) * 1.6); c.stroke();
      c.restore();
    });
    // subtitle (narration) word highlight
    const ln = S.lines[Math.min(2, Math.floor(t / D))].j.split(" "), wi = Math.floor(((t % D) / D) * (ln.length + 1.5));
    X.font(c, 800, 16, S.f2); const tw = ln.map((w) => c.measureText(w + " ").width), tot = tw.reduce((a, b) => a + b, 0);
    let xx = W / 2 - tot / 2; const yy = H - 104;
    c.fillStyle = "rgba(0,0,0,.55)"; X.rr(c, xx - 10, yy - 15, tot + 14, 30, 8); c.fill();
    ln.forEach((w, i) => { X.text(c, w, xx, yy, { size: 16, w: 800, fam: S.f2, color: i === wi ? A : "#fff", align: "left" }); xx += tw[i]; });
    rail(c, S, t, { like: 4.1, likeCol: B });
    handle(c, S, t, "@faktacepat", "narasi AI · #sains #fakta");
    progress(c, S, t, A);
  });

  /* ================= SHO-03 · photoDump ================= */
  function snap(c, k, w, h, pal) { // procedural photo inside polaroid
    const sets = [[pal[2], "#ffd6a5"], [pal[3], "#cdeac0"], ["#6fa8dc", "#f1f7ff"], ["#e9b0d4", "#fff0f7"], ["#f6bd60", "#fff6e0"], ["#84a59d", "#eaf4f4"]];
    const [a, b] = sets[k % sets.length];
    c.fillStyle = X.lgrad(c, 0, -h / 2, 0, h / 2, [[0, b], [1, a]]); c.fillRect(-w / 2, -h / 2, w, h);
    const m = k % 4;
    if (m === 0) { c.fillStyle = "#fff8e0"; X.circle(c, w * .18, -h * .15, w * .14); c.fill(); c.fillStyle = X.shade(a, -.25); c.beginPath(); c.moveTo(-w / 2, h / 2); c.quadraticCurveTo(-w * .1, -h * .05, w / 2, h * .2); c.lineTo(w / 2, h / 2); c.fill(); }
    else if (m === 1) { c.fillStyle = X.shade(a, -.3); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-w / 2 + i * w * .35, h / 2); c.lineTo(-w / 2 + i * w * .35 + w * .25, -h * .1 + i * 8); c.lineTo(-w / 2 + i * w * .35 + w * .5, h / 2); c.fill(); } }
    else if (m === 2) { c.fillStyle = "#fff"; X.rr(c, -w * .22, -h * .05, w * .44, h * .38, 6); c.fill(); c.fillStyle = X.shade(a, -.2); X.circle(c, 0, -h * .14, w * .14); c.fill(); }
    else { c.strokeStyle = X.shade(a, -.35); c.lineWidth = 3; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-w / 2 + i * w * .25, h / 2); c.lineTo(-w / 2 + i * w * .25 + 10, -h * .2); c.stroke(); X.circle(c, -w / 2 + i * w * .25 + 10, -h * .22, 8); c.fillStyle = pal[2]; c.fill(); } }
  }
  PS.def("photoDump", (c, t, S) => {
    const { W, H, pal } = S, bpm = 120, b = 60 / bpm;
    X.paper(c, W, H, pal[0], .25);
    // title
    X.text(c, "photo dump", W / 2, 70, { size: 40, w: 400, fam: S.f1, color: pal[1] });
    X.text(c, "— rekap bulan ini —", W / 2, 102, { size: 13, w: 500, fam: S.f2, color: pal[2], ls: 1 });
    const N = 12, start = .4;
    for (let i = 0; i < N; i++) {
      const t0 = start + i * b; if (t < t0) break;
      const k = X.seg(t, t0, t0 + .28), e = X.ease.back(k);
      const rx = (X.hash(i * 3 + 1) - .5) * W * .32, ry = (X.hash(i * 5 + 2) - .5) * H * .26, rot = (X.hash(i * 7) - .5) * .5;
      const pw = 196, ph = 236;
      // older photos get slightly pushed down/darker
      const age = Math.max(0, (t - t0) / b);
      c.save(); c.translate(W / 2 + rx, H * .5 + ry - (1 - e) * 60); c.rotate(rot + (1 - e) * .35); const sc = X.lerp(1.45, 1, e) * (1 - Math.min(.06, age * .006)); c.scale(sc, sc);
      c.globalAlpha = Math.min(1, k * 4);
      X.shadow(c, 18 * (1.4 - e * .4), 8 + (1 - e) * 16, "rgba(0,0,0,.28)"); c.fillStyle = "#fff"; c.fillRect(-pw / 2, -ph / 2, pw, ph); X.noShadow(c);
      c.save(); c.translate(0, -18); c.beginPath(); c.rect(-pw / 2 + 12, -ph / 2 + 12 + 18, pw - 24, pw - 24); c.clip(); c.translate(0, -ph / 2 + 30 + (pw - 24) / 2 - 18 + 18); snap(c, i, pw - 24, pw - 24, pal); c.restore();
      X.text(c, `${String(1 + (i * 3) % 28).padStart(2, "0")}.08.26`, pw / 2 - 18, ph / 2 - 52, { size: 13, w: 700, fam: "Courier New", color: "#ff8a3d", align: "right" });
      X.text(c, ["pantai", "kopi pagi", "kota", "teman", "senja", "jalan"][i % 6], -pw / 2 + 14, ph / 2 - 22, { size: 16, w: 400, fam: S.f1, color: "#333", align: "left" });
      c.restore();
      // tape on a few
      if (i % 3 === 0 && k > .9) { c.save(); c.translate(W / 2 + rx, H * .5 + ry - ph / 2 + 4); c.rotate(rot - .2); c.fillStyle = X.a(pal[3], .55); c.fillRect(-26, -9, 52, 18); c.restore(); }
    }
    // beat flash
    const f = X.beat(t - start, bpm, 18); if (t > start) { c.fillStyle = `rgba(255,255,255,${f * .3})`; c.fillRect(0, 0, W, H); }
    // beat meter
    for (let i = 0; i < 16; i++) { const on = Math.floor((t - start) / b) % 16 === i; c.fillStyle = on ? pal[2] : X.a(pal[1], .15); X.rr(c, W / 2 - 16 * 7 + i * 14, H - 52, 9, on ? 16 : 8, 3); c.fill(); }
    X.text(c, "♪ 120 BPM · potong di ketukan", W / 2, H - 22, { size: 11, w: 600, fam: S.f2, color: X.a(pal[1], .6) });
  });

  /* ================= SHO-04 · carousel (4:5) ================= */
  PS.def("carousel", (c, t, S) => {
    const { W, H, pal } = S, N = 4;
    c.fillStyle = X.mix(pal[0], pal[1], .06); c.fillRect(0, 0, W, H);
    // header
    c.fillStyle = X.lgrad(c, 14, 14, 42, 42, [[0, pal[2]], [1, pal[3]]]); X.circle(c, 30, 30, 15); c.fill(); c.fillStyle = "#fff"; X.circle(c, 30, 30, 12); c.fill(); c.fillStyle = pal[3]; X.circle(c, 30, 30, 10); c.fill();
    X.text(c, "atelier.tips", 54, 25, { size: 13, w: 700, fam: S.f2, color: pal[1], align: "left" });
    X.text(c, "Disponsori · Simpan untuk nanti", 54, 40, { size: 10, w: 400, fam: S.f2, color: X.a(pal[1], .55), align: "left" });
    // track position
    const swaps = [1.9, 3.9, 5.9]; let pos = 0, drag = 0;
    swaps.forEach((s, i) => { pos += X.E(t, s, s + .55, "out5"); const d = X.seg(t, s - .45, s); if (d > 0 && d < 1) drag = Math.max(drag, X.ease.sine(d) * .12); });
    pos = pos + drag * 0; const off = pos + drag;
    const cy = 58, ch = H - 58 - 84, cw = W;
    c.save(); c.beginPath(); c.rect(0, cy, W, ch); c.clip();
    for (let i = 0; i < N; i++) {
      const x = (i - off) * cw; if (x > W || x < -W) continue;
      const bg = [pal[4], pal[2], pal[3], pal[1]][i], ink = i === 0 ? pal[1] : "#fff", acc = i === 0 ? pal[2] : (i === 1 ? pal[3] : pal[2]);
      c.save(); c.translate(x, cy);
      c.fillStyle = bg; c.fillRect(0, 0, cw, ch);
      // decor
      c.fillStyle = X.a(ink, .07); X.circle(c, cw * .85, ch * .2, 90 + Math.sin(t + i) * 6); c.fill();
      const local = X.clamp(1 - Math.abs(i - off));
      X.text(c, String(i + 1).padStart(2, "0"), 30, 60, { size: 64, w: 800, fam: S.f1, color: acc, align: "left", alpha: .9 });
      X.text(c, `${i + 1}/${N}`, cw - 30, 44, { size: 12, w: 700, fam: S.f2, color: X.a(ink === "#fff" ? "#ffffff" : pal[1], .7), align: "right" });
      const ln = S.lines[i], fb = fitBox(c, i === 0 ? "Simpan 4 tips ini" : ln.j, cw - 64, 2, 40, 800, S.f1);
      fb.lines.forEach((l, li) => X.text(c, l, 30, 140 + li * fb.size * 1.1 + (1 - local) * 20, { size: fb.size, w: 800, fam: S.f1, color: ink, align: "left" }));
      const cb = fitBox(c, ln.c, cw - 64, 3, 17, 400, S.f2);
      cb.lines.forEach((l, li) => X.text(c, l, 30, 140 + fb.lines.length * fb.size * 1.1 + 20 + li * cb.size * 1.4, { size: cb.size, w: 400, fam: S.f2, color: X.a(ink === "#fff" ? "#ffffff" : pal[1], .8), align: "left" }));
      // icon chip
      c.fillStyle = X.a(ink === "#fff" ? "#ffffff" : pal[1], .12); X.rr(c, 30, ch - 86, 64, 64, 18); c.fill();
      X.icon(c, ["bolt", "check", "star", "heart"][i], 62, ch - 54, 30, acc, { lw: 2.4, p: X.E(local, .2, 1) });
      X.text(c, i < N - 1 ? "Geser →" : "Simpan ★", cw - 30, ch - 54, { size: 15, w: 700, fam: S.f2, color: ink, align: "right", alpha: .85 });
      c.restore();
    }
    c.restore();
    // finger swipe gesture
    swaps.forEach((s) => { const g = X.seg(t, s - .5, s + .15); if (g > 0 && g < 1) { const gx = X.lerp(W * .78, W * .25, X.ease.inOut(g)), a = Math.sin(g * Math.PI); c.fillStyle = `rgba(255,255,255,${.55 * a})`; X.circle(c, gx, cy + ch * .55, 22); c.fill(); c.strokeStyle = `rgba(0,0,0,${.25 * a})`; c.lineWidth = 2; c.stroke(); c.strokeStyle = `rgba(255,255,255,${.35 * a})`; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(gx + 20, cy + ch * .55); c.lineTo(gx + 70 * a, cy + ch * .55); c.stroke(); } });
    // footer icons + dots
    const fy = cy + ch + 26;
    ["heart", "chat", "play"].forEach((ic, i) => X.icon(c, ic, 26 + i * 34, fy, 22, pal[1], { lw: 2, fill: i === 0 && t > 6.6 ? pal[2] : null }));
    X.icon(c, "doc", W - 26, fy, 22, pal[1], { lw: 2 });
    for (let i = 0; i < N; i++) { const act = X.clamp(1 - Math.abs(i - off)); c.fillStyle = act > .5 ? pal[2] : X.a(pal[1], .25); X.circle(c, W / 2 - 24 + i * 16, fy, 3 + act * 1.5); c.fill(); }
    X.text(c, "Disukai 12.480 orang · lihat semua komentar", 14, fy + 30, { size: 11, w: 600, fam: S.f2, color: X.a(pal[1], .7), align: "left" });
  });

  /* ================= SHO-05 · stitch ================= */
  PS.def("stitch", (c, t, S) => {
    const { W, H, pal } = S, A = pal[2], R = pal[3], hh = H / 2;
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const topOn = t < 3.1, punch = X.E(t, 2.6, 2.9) * (1 - X.E(t, 3.0, 3.4));
    // TOP: source clip
    c.save(); c.beginPath(); c.rect(0, 0, W, hh); c.clip();
    c.translate(W / 2, hh / 2); c.scale(1 + punch * .12, 1 + punch * .12); c.translate(-W / 2, -hh / 2);
    c.fillStyle = X.lgrad(c, 0, 0, W, hh, [[0, X.mix(pal[4], R, .35)], [1, X.mix(pal[4], A, .2)]]); c.fillRect(0, 0, W, hh);
    for (let i = 0; i < 5; i++) { X.glow(c, (X.hash(i) * W + t * 10 * (i + 1)) % W, X.hash(i + 4) * hh, 70, i % 2 ? A : R, .18); }
    X.person(c, W / 2, hh * .58, 150, "#e8b897", "#2b2b3a", "#1b1410", { mouth: topOn ? Math.abs(Math.sin(t * 13)) : 0, tilt: Math.sin(t * 2) * .04, blink: (t % 2.3) < .12 });
    // source caption
    const q = S.lines[1].j + "?"; const qs = fitSize(c, q, W - 60, 22, 800, S.f1);
    X.font(c, 800, qs, S.f1); const qw = c.measureText(q).width;
    c.fillStyle = "#fff"; X.rr(c, W / 2 - qw / 2 - 10, hh * .2 - 16, qw + 20, 32, 8); c.fill();
    X.text(c, q, W / 2, hh * .2, { size: qs, w: 800, fam: S.f1, color: "#111" });
    if (!topOn) { c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(0, 0, W, hh); c.fillStyle = "rgba(0,0,0,.55)"; X.rr(c, W - 52, 52, 36, 36, 18); c.fill(); c.fillStyle = "#fff"; c.fillRect(W - 40, 62, 4, 16); c.fillRect(W - 32, 62, 4, 16); }
    c.restore();
    // play bar top
    c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(14, hh - 22, W - 28, 3); c.fillStyle = "#fff"; c.fillRect(14, hh - 22, (W - 28) * Math.min(1, t / 3.1), 3);
    X.text(c, "@sumberasli", 14, hh - 38, { size: 12, w: 700, fam: S.f2, color: "#fff", align: "left" });
    X.text(c, topOn ? "0:0" + Math.floor(t) + " / 0:03" : "0:03 / 0:03", W - 14, hh - 38, { size: 11, w: 500, fam: "Inter", color: "#fff", align: "right" });
    // split line with glitch
    const g = 1 - X.seg(t, 3.1, 3.5);
    c.fillStyle = A; c.fillRect(0, hh - 2 - g * 3, W, 2); c.fillStyle = R; c.fillRect(0, hh + g * 3, W, 2);
    // label pill
    const la = X.spring(X.seg(t, .2, 1.2));
    c.save(); c.translate(W / 2, 30); c.scale(la, la); c.fillStyle = "rgba(0,0,0,.6)"; X.rr(c, -86, -14, 172, 28, 14); c.fill();
    X.text(c, "STITCH · @sumberasli", 0, 0, { size: 11, w: 800, fam: S.f2, color: "#fff", ls: 1 }); c.restore();
    // BOTTOM: response
    c.save(); c.beginPath(); c.rect(0, hh + 2, W, hh); c.clip();
    const live = !topOn;
    c.fillStyle = X.lgrad(c, 0, hh, 0, H, [[0, X.mix(pal[0], A, .12)], [1, pal[0]]]); c.fillRect(0, hh, W, hh);
    c.fillStyle = X.a("#ffffff", .05); for (let i = 0; i < 6; i++) c.fillRect(30 + i * 56, hh + 40, 30, 110);
    X.person(c, W / 2 + Math.sin(t * 1.3) * 4, hh + hh * .62, 175, "#c68c6b", R, "#2a1c14", { mouth: live ? Math.abs(Math.sin(t * 11 + 1)) : 0, tilt: live ? Math.sin(t * 3) * .05 : 0, blink: (t % 3.1) < .12 });
    if (!live) { c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, hh, W, hh); }
    c.restore();
    // response captions word boxes
    if (live) {
      const words = S.lines[1].c.split(" "), lt = t - 3.3, shown = Math.min(words.length, Math.floor(lt / .28) + 1);
      X.font(c, 900, 22, S.f1); let lines = [[]], lw = 0;
      words.slice(0, shown).forEach((w) => { const ww = c.measureText(w + " ").width; if (lw + ww > W - 60) { lines.push([]); lw = 0; } lines[lines.length - 1].push(w); lw += ww; });
      lines.forEach((ln, li) => { const s = ln.join(" "), ww = c.measureText(s).width, y = hh + 46 + li * 34;
        c.fillStyle = "#fff"; X.rr(c, W / 2 - ww / 2 - 10, y - 15, ww + 20, 30, 7); c.fill();
        let xx = W / 2 - ww / 2; ln.forEach((w, wi) => { const last = li === lines.length - 1 && wi === ln.length - 1; X.text(c, w, xx, y + 1, { size: 22, w: 900, fam: S.f1, color: last ? R : "#111", align: "left" }); xx += c.measureText(w + " ").width; }); });
    }
    rail(c, S, t, { like: 5.4, likeCol: R });
    handle(c, S, t, "@kamu", "tanggapan · #stitch #duet");
    progress(c, S, t, A);
  });

  /* ================= SHO-06 · listicle ================= */
  PS.def("listicle", (c, t, S) => {
    const { W, H, pal } = S, A = pal[2], G = pal[3];
    const items = ["Tidur sebelum jam 11", "Minum air saat bangun", "Catat 3 target harian", "Jalan kaki 10 menit", "Matikan notifikasi"];
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, pal[0]], [1, pal[4]]]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { c.fillStyle = X.a("#ffffff", .04); c.fillRect(0, (i * 52 + t * 40) % H, W, 1); }
    // header
    X.text(c, "TOP 5", W / 2, 58, { size: 54, w: 400, fam: S.f1, color: pal[1], ls: 4 });
    X.text(c, "kebiasaan yang mengubah hari", W / 2, 92, { size: 14, w: 600, fam: S.f2, color: G });
    const D = 1.45, cur = Math.min(4, Math.floor(t / D)), lt = t - cur * D, rank = 5 - cur;
    const isOne = rank === 1;
    // glow for #1
    if (isOne) { const k = X.E(lt, 0, .8); X.glow(c, W / 2, H * .38, 260, G, .45 * k); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + lt * .6, r = 90 + (lt * 120 + i * 17) % 160; c.fillStyle = X.a(i % 2 ? G : A, (1 - (r - 90) / 160) * k); c.fillRect(W / 2 + Math.cos(a) * r, H * .38 + Math.sin(a) * r, 4, 8); } }
    // flip number
    const fk = X.seg(lt, 0, .35), fe = X.ease.out5(fk);
    const ny = H * .38, nh = 170;
    c.save(); c.translate(W / 2, ny);
    c.fillStyle = X.a("#000", .35); X.rr(c, -85, -nh / 2 + 6, 170, nh, 18); c.fill();
    c.fillStyle = isOne ? G : A; X.rr(c, -85, -nh / 2, 170, nh, 18); c.fill();
    c.scale(1, Math.max(.02, fe));
    X.text(c, String(rank), 0, 8, { size: 160, w: 400, fam: S.f1, color: isOne ? pal[0] : "#fff" });
    c.restore();
    c.fillStyle = X.a("#000", .25); c.fillRect(W / 2 - 85, ny - 1, 170, 2);
    if (isOne) { const ck = X.ease.back(X.seg(lt, .25, .7)); c.save(); c.translate(W / 2, ny - nh / 2 - 22 - (1 - ck) * 30); c.rotate(Math.sin(lt * 4) * .06); c.globalAlpha = X.seg(lt, .25, .35); c.fillStyle = G; c.beginPath(); c.moveTo(-36, 16); c.lineTo(-40, -16); c.lineTo(-18, 2); c.lineTo(0, -24); c.lineTo(18, 2); c.lineTo(40, -16); c.lineTo(36, 16); c.closePath(); c.fill(); c.restore(); }
    // item card
    const ck = X.spring(X.seg(lt, .2, 1.1)), it = items[rank - 1];
    c.save(); c.translate(0, (1 - Math.min(ck, 1.2)) * 40); c.globalAlpha = X.seg(lt, .2, .35);
    c.fillStyle = "#fff"; X.rr(c, 30, ny + nh / 2 + 24, W - 60, 64, 16); c.fill();
    X.text(c, it, W / 2, ny + nh / 2 + 56, { size: fitSize(c, it, W - 90, 22, 700, S.f2), w: 700, fam: S.f2, color: pal[0] });
    c.restore();
    // done list
    for (let i = 0; i < cur; i++) { const r = 5 - i, y = H - 200 + i * 34, a = X.E(t, (i + 1) * D, (i + 1) * D + .4);
      c.globalAlpha = a * .9; c.fillStyle = X.a("#ffffff", .08); X.rr(c, 30 + (1 - a) * -40, y, W - 60, 28, 8); c.fill();
      X.text(c, "#" + r, 44, y + 14, { size: 14, w: 400, fam: S.f1, color: A, align: "left" });
      X.text(c, items[r - 1], 76, y + 14, { size: 12, w: 600, fam: S.f2, color: "#fff", align: "left" }); c.globalAlpha = 1; }
    // segmented progress
    for (let i = 0; i < 5; i++) { c.fillStyle = i <= cur ? (i === 4 ? G : A) : "rgba(255,255,255,.2)"; X.rr(c, 30 + i * ((W - 60) / 5), H - 26, (W - 60) / 5 - 6, 5, 3); c.fill(); }
  });

  /* ================= SHO-07 · storyText ================= */
  PS.def("storyText", (c, t, S) => {
    const { W, H, pal } = S;
    // blurred footage: soft bokeh blobs with slow drift + handheld sway
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, X.mix(pal[0], pal[2], .25)], [1, pal[0]]]); c.fillRect(0, 0, W, H);
    const sw = X.wob(1, t, 6, .7);
    for (let i = 0; i < 11; i++) { const col = [pal[2], pal[3], pal[4], "#f7c59f"][i % 4]; X.glow(c, (X.hash(i) * W + Math.sin(t * .3 + i) * 30 + sw), X.hash(i + 11) * H + Math.cos(t * .25 + i) * 30, 80 + X.hash(i + 5) * 120, col, .28); }
    c.fillStyle = "rgba(10,10,20,.25)"; c.fillRect(0, 0, W, H);
    X.grain(c, W, H, .35, t);
    // label
    c.fillStyle = pal[2]; X.rr(c, 18, 40, 98, 24, 12); c.fill(); X.text(c, "STORYTIME", 67, 52.5, { size: 11, w: 800, fam: S.f1, color: "#fff", ls: 1 });
    X.text(c, "part 1 · dengar sampai habis", 126, 52.5, { size: 11, w: 500, fam: S.f2, color: "rgba(255,255,255,.75)", align: "left" });
    const pages = [`Jadi ceritanya, ${S.lines[0].j.toLowerCase()}…`, `${S.lines[1].c}. Aku kaget banget.`];
    const pi = t < 4 ? 0 : 1, lt = t - pi * 4;
    X.font(c, 700, 21, S.f2); const lines = X.wrap(c, pages[pi], W - 80);
    const lh = 36, y0 = H * .4 - lines.length * lh / 2;
    lines.forEach((l, i) => {
      const st = .25 + i * .5, k = X.E(lt, st, st + .25, "back"), out = X.seg(lt, 3.7, 3.95);
      if (k <= 0) return;
      X.font(c, 700, 21, S.f2); const tw = c.measureText(l).width, y = y0 + i * lh;
      c.save(); c.globalAlpha = Math.min(1, k * 2) * (1 - out); c.translate(W / 2, y); c.scale(.85 + k * .15, .85 + k * .15);
      const typed = X.typed(l, X.seg(lt, st, st + .45)); X.font(c, 700, 21, S.f2); const bw = Math.max(18, c.measureText(typed).width);
      c.fillStyle = "#fff"; X.rr(c, -tw / 2 - 10, -16, bw + 20, 34, 7); c.fill();
      X.text(c, typed, -tw / 2, 1, { size: 21, w: 700, fam: S.f2, color: "#111", align: "left" });
      if (typed.length < l.length && Math.floor(lt * 6) % 2) { X.font(c, 700, 21, S.f2); c.fillStyle = pal[2]; c.fillRect(-tw / 2 + c.measureText(typed).width + 1, -10, 2, 20); }
      c.restore();
    });
    // reaction emoji-free sticker
    const sk = X.spring(X.seg(lt, 2.4, 3.2));
    if (sk > 0) { c.save(); c.translate(W * .74, H * .62); c.rotate(-.15); c.scale(sk, sk); c.fillStyle = pal[2]; X.rr(c, -50, -18, 100, 36, 10); c.fill(); X.text(c, pi ? "HAH?!" : "serius…", 0, 1, { size: 18, w: 800, fam: S.f1, color: "#fff" }); c.restore(); }
    rail(c, S, t, { like: 6.2, likeCol: pal[2] });
    handle(c, S, t, "@ceritasaya", "true story · #storytime");
    progress(c, S, t, pal[2]);
  });

  /* ================= SHO-08 · colorWalk ================= */
  PS.def("colorWalk", (c, t, S) => {
    const { W, H, pal } = S, N = 6, D = 8 / N;
    const fam = [pal[2], pal[3], pal[4], X.shade(pal[2], -.18), X.shade(pal[3], .2), X.shade(pal[4], -.12)];
    const hexes = ["#F08080", "#F4978E", "#FBC4AB", "#D86C6C", "#F7B0A8", "#E3AD96"];
    const i = Math.min(N - 1, Math.floor(t / D)), lt = t - i * D, col = fam[i];
    const bob = Math.sin(t * 2 * TAU / 1.2) * 3, sway = Math.sin(t * TAU / 2.4) * 4; // walking bob
    c.save(); c.translate(sway, bob);
    c.fillStyle = X.shade(col, .55); c.fillRect(-10, -10, W + 20, H + 20);
    const cx = W / 2, cy = H * .44, zoom = 1 + lt * .05;
    c.translate(cx, cy); c.scale(zoom, zoom); c.translate(-cx, -cy);
    const dark = X.shade(col, -.25), lite = X.shade(col, .3);
    if (i === 0) { // arched door
      c.fillStyle = lite; c.fillRect(0, H * .1, W, H * .8); c.fillStyle = col; c.beginPath(); c.moveTo(cx - 80, H * .78); c.lineTo(cx - 80, cy); c.arc(cx, cy, 80, Math.PI, 0); c.lineTo(cx + 80, H * .78); c.fill(); c.fillStyle = dark; X.circle(c, cx + 50, H * .6, 6); c.fill(); }
    else if (i === 1) { // flower
      for (let p = 0; p < 8; p++) { c.save(); c.translate(cx, cy); c.rotate(p / 8 * TAU + lt * .2); c.fillStyle = p % 2 ? col : lite; c.beginPath(); c.ellipse(0, -52, 30, 56, 0, 0, TAU); c.fill(); c.restore(); }
      c.fillStyle = dark; X.circle(c, cx, cy, 30); c.fill(); }
    else if (i === 2) { // cup
      c.fillStyle = dark; c.fillRect(0, H * .66, W, H * .4); c.fillStyle = col; X.rr(c, cx - 70, cy - 50, 140, 150, 26); c.fill(); c.strokeStyle = col; c.lineWidth = 16; c.beginPath(); c.arc(cx + 74, cy + 20, 30, -1.2, 1.2); c.stroke();
      c.fillStyle = lite; c.beginPath(); c.ellipse(cx, cy - 50, 70, 16, 0, 0, TAU); c.fill(); for (let s = 0; s < 3; s++) { c.strokeStyle = X.a("#ffffff", .6); c.lineWidth = 4; c.beginPath(); for (let y = 0; y < 60; y += 4) c.lineTo(cx - 24 + s * 24 + Math.sin(y * .15 + t * 4 + s) * 6, cy - 70 - y); c.stroke(); } }
    else if (i === 3) { // umbrella
      c.fillStyle = col; c.beginPath(); c.arc(cx, cy, 110, Math.PI, 0); for (let k = 0; k < 4; k++) c.arc(cx + 82.5 - k * 55, cy, 27.5, 0, Math.PI, true); c.fill(); c.strokeStyle = dark; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + 120); c.arc(cx - 14, cy + 120, 14, 0, Math.PI); c.stroke();
      for (let r = 0; r < 30; r++) { c.strokeStyle = X.a(dark, .4); c.lineWidth = 1.5; const rx = X.hash(r) * W, ry = (X.hash(r + 3) * H + t * 300) % H; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 3, ry + 12); c.stroke(); } }
    else if (i === 4) { // ice cream
      c.fillStyle = "#e6b980"; c.beginPath(); c.moveTo(cx - 55, cy + 10); c.lineTo(cx, cy + 170); c.lineTo(cx + 55, cy + 10); c.fill(); c.fillStyle = col; X.circle(c, cx, cy - 10, 64); c.fill(); c.fillStyle = lite; X.circle(c, cx - 20, cy - 30, 18); c.fill(); }
    else { // sunset
      c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, lite], [1, col]]); c.fillRect(-20, -20, W + 40, H + 40); c.fillStyle = "#fff4ea"; X.circle(c, cx, cy, 70); c.fill(); c.fillStyle = dark; c.fillRect(-20, cy + 40, W + 40, H); for (let k = 0; k < 5; k++) { c.fillStyle = X.a("#ffffff", .5); c.fillRect(cx - 60 + k * 10, cy + 60 + k * 18, 120 - k * 20, 3); } }
    c.restore();
    // match-cut flash circle wipe at cut
    const cut = 1 - X.seg(lt, 0, .18); if (i > 0 && cut > 0) { c.fillStyle = X.a(fam[i - 1], cut * .8); X.circle(c, W / 2, H * .44, 90 * (1 + (1 - cut) * 4)); c.fill(); }
    // soft vignette + grain
    X.vignette(c, W, H, .18, "60,30,30");
    X.grain(c, W, H, .25, t);
    // title
    X.text(c, "color walk", W / 2, 66, { size: 34, w: 400, fam: S.f1, color: pal[1] });
    X.text(c, "merah muda · sore di kota", W / 2, 94, { size: 12, w: 500, fam: S.f2, color: X.a(pal[1], .7), ls: 1 });
    // swatches row
    for (let k = 0; k <= i; k++) {
      const a = X.ease.back(X.seg(t, k * D, k * D + .35)), x = W / 2 - (N * 50) / 2 + k * 50 + 25, y = H - 92;
      c.save(); c.translate(x, y); c.scale(a, a); c.fillStyle = "#fff"; X.shadow(c, 8, 3, "rgba(0,0,0,.15)"); X.rr(c, -21, -26, 42, 56, 5); c.fill(); X.noShadow(c); c.fillStyle = fam[k]; X.rr(c, -17, -22, 34, 34, 3); c.fill(); c.restore();
      X.text(c, hexes[k].slice(1), x, y + 22, { size: 7.5, w: 600, fam: "Inter", color: pal[1], alpha: a });
    }
    X.text(c, `klip ${i + 1}/${N} · potong saat warna bertemu`, W / 2, H - 34, { size: 11, w: 500, fam: S.f2, color: X.a(pal[1], .65) });
  });

  /* ================= SHO-09 · series ================= */
  PS.def("series", (c, t, S) => {
    const { W, H, pal } = S, R = pal[2];
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    // suspense scene: corridor with door light
    const dz = 1 + t * .025;
    c.save(); c.translate(W / 2, H * .5); c.scale(dz, dz); c.translate(-W / 2, -H * .5);
    c.fillStyle = pal[4]; c.beginPath(); c.moveTo(0, 0); c.lineTo(W * .32, H * .3); c.lineTo(W * .32, H * .7); c.lineTo(0, H); c.fill(); c.beginPath(); c.moveTo(W, 0); c.lineTo(W * .68, H * .3); c.lineTo(W * .68, H * .7); c.lineTo(W, H); c.fill();
    const flick = .7 + .3 * X.noise(t * 9);
    c.fillStyle = X.a("#f5d7a1", .12 * flick); c.beginPath(); c.moveTo(W * .4, H * .7); c.lineTo(W * .6, H * .7); c.lineTo(W * .9, H); c.lineTo(W * .1, H); c.fill();
    c.fillStyle = "#050505"; c.fillRect(W * .4, H * .36, W * .2, H * .34);
    c.fillStyle = X.a("#f5d7a1", .9 * flick); c.fillRect(W * .4, H * .695, W * .2, 3);
    X.glow(c, W / 2, H * .7, 80, "#f5d7a1", .25 * flick);
    c.restore();
    X.vignette(c, W, H, .7);
    X.grain(c, W, H, .5, t);
    // PART badge stamp
    const bk = X.seg(t, .1, .4), be = X.ease.out5(bk), [sx, sy] = shakeAt(t, [.4], 8);
    c.save(); c.translate(W / 2 + sx, 96 + sy); c.scale(X.lerp(2.2, 1, be), X.lerp(2.2, 1, be)); c.rotate(-.06); c.globalAlpha = Math.min(1, bk * 3);
    c.fillStyle = R; X.rr(c, -72, -26, 144, 52, 8); c.fill(); X.text(c, "PART 1", 0, 2, { size: 40, w: 700, fam: S.f1, color: "#fff", ls: 2 }); c.restore();
    // cliffhanger text typed
    const cl = "Dan ternyata… pintu itu tidak pernah dikunci.";
    if (t < 5.6) {
      X.font(c, 700, 24, S.f1); const ls = X.wrap(c, cl, W - 70); let rem = X.seg(t, 1, 4.2) * cl.length;
      ls.forEach((l, i) => { const s = l.slice(0, Math.max(0, Math.round(rem))); rem -= l.length + 1; X.text(c, s.toUpperCase(), W / 2, H * .2 + 70 + i * 32, { size: 24, w: 700, fam: S.f1, color: pal[1] }); });
      if (Math.floor(t * 3) % 2) { c.fillStyle = R; c.fillRect(W / 2 - 4, H * .2 + 70 + ls.length * 32 - 6, 8, 3); }
    }
    // glitch ending
    const gk = X.seg(t, 5.4, 6.0);
    if (gk > 0) {
      const strength = Math.sin(gk * Math.PI);
      for (let i = 0; i < 12; i++) { const y = X.hash(i + Math.floor(t * 20)) * H, h = 6 + X.hash(i * 3 + Math.floor(t * 20)) * 30, dx = (X.hash(i * 7 + Math.floor(t * 30)) - .5) * 70 * strength;
        c.fillStyle = X.a(i % 2 ? R : "#00e5ff", .35 * strength); c.fillRect(dx, y, W, h); }
      const bt = "BERSAMBUNG", bs = fitSize(c, bt, W - 50, 56, 700, S.f1), a = X.seg(t, 5.7, 5.9);
      c.globalAlpha = a; c.globalCompositeOperation = "lighter";
      X.text(c, bt, W / 2 - 4 * strength, H * .44, { size: bs, w: 700, fam: S.f1, color: "#ff0040" });
      X.text(c, bt, W / 2 + 4 * strength, H * .44, { size: bs, w: 700, fam: S.f1, color: "#00e5ff" });
      c.globalCompositeOperation = "source-over"; X.text(c, bt, W / 2, H * .44, { size: bs, w: 700, fam: S.f1, color: "#fff" }); c.globalAlpha = 1;
      // series progress
      const pa = X.E(t, 6.0, 6.4);
      c.globalAlpha = pa; X.text(c, "Part 1 dari 3", W / 2, H * .52, { size: 13, w: 600, fam: S.f2, color: pal[3] });
      for (let k = 0; k < 3; k++) { c.fillStyle = k === 0 ? R : "rgba(255,255,255,.18)"; X.rr(c, W / 2 - 84 + k * 58, H * .55, 52, 6, 3); c.fill(); }
      // follow button pulse
      const fp = 1 + X.beat(t, 100, 6) * .06;
      c.save(); c.translate(W / 2, H * .64); c.scale(fp * X.ease.back(X.seg(t, 6.2, 6.6)), fp * X.ease.back(X.seg(t, 6.2, 6.6)));
      c.fillStyle = R; X.rr(c, -78, -22, 156, 44, 22); c.fill(); X.text(c, "+ Ikuti untuk Part 2", 0, 1, { size: 13, w: 800, fam: S.f2, color: "#fff" }); c.restore();
      c.globalAlpha = 1;
    }
    rail(c, S, t, { like: 3.2, likeCol: R });
    handle(c, S, t, "@kisahberseri", "seri misteri · part 1 #bersambung");
    progress(c, S, t, R);
  });

  /* ================= SHO-10 · beforeAfter ================= */
  function room(c, W, H, after, pal, t) {
    const wall = after ? X.mix(pal[2], "#ffffff", .78) : "#c9c6c0", floor = after ? X.mix(pal[3], "#8a5a2b", .45) : "#8f8a82";
    c.fillStyle = wall; c.fillRect(0, 0, W, H); c.fillStyle = floor; c.fillRect(0, H * .68, W, H * .32);
    c.fillStyle = after ? "rgba(0,0,0,.06)" : "rgba(0,0,0,.12)"; for (let i = 0; i < 6; i++) c.fillRect(0, H * .68 + i * 34, W, 2);
    // window
    c.fillStyle = after ? "#bfe3ff" : "#9aa0a6"; c.fillRect(W * .12, H * .2, W * .34, H * .22); c.strokeStyle = after ? "#fff" : "#77746f"; c.lineWidth = 6; c.strokeRect(W * .12, H * .2, W * .34, H * .22); c.beginPath(); c.moveTo(W * .29, H * .2); c.lineTo(W * .29, H * .42); c.stroke();
    if (after) { X.glow(c, W * .3, H * .3, 160, "#fff6c8", .5); c.fillStyle = "#fff"; X.circle(c, W * .2, H * .26, 10); c.fill(); }
    // frame on wall
    c.save(); c.translate(W * .72, H * .27); c.rotate(after ? 0 : .22); c.fillStyle = after ? pal[2] : "#6f6c68"; c.fillRect(-38, -30, 76, 60); c.fillStyle = after ? pal[3] : "#aaa"; c.fillRect(-30, -22, 60, 44); if (after) { c.fillStyle = pal[2]; X.circle(c, -6, 2, 12); c.fill(); } c.restore();
    // sofa
    c.fillStyle = after ? pal[2] : "#7d7a75"; X.rr(c, W * .1, H * .54, W * .62, H * .12, 14); c.fill(); X.rr(c, W * .08, H * .5, W * .1, H * .17, 10); c.fill(); X.rr(c, W * .64, H * .5, W * .1, H * .17, 10); c.fill();
    c.fillStyle = after ? X.shade(pal[2], .25) : "#8d8a85"; X.rr(c, W * .14, H * .46, W * .54, H * .1, 12); c.fill();
    if (after) { c.fillStyle = pal[3]; X.rr(c, W * .2, H * .47, W * .12, H * .07, 8); c.fill(); c.fillStyle = "#fff"; X.rr(c, W * .48, H * .47, W * .12, H * .07, 8); c.fill(); }
    // lamp / plant
    if (after) {
      c.strokeStyle = "#333"; c.lineWidth = 3; c.beginPath(); c.moveTo(W * .86, H * .67); c.lineTo(W * .86, H * .4); c.stroke(); c.fillStyle = pal[3]; c.beginPath(); c.moveTo(W * .8, H * .4); c.lineTo(W * .92, H * .4); c.lineTo(W * .89, H * .34); c.lineTo(W * .83, H * .34); c.fill();
      X.glow(c, W * .86, H * .42, 90, pal[3], .4 + .1 * Math.sin(t * 5));
      c.fillStyle = "#6c4f3d"; X.rr(c, W * .76, H * .6, W * .08, H * .08, 4); c.fill();
      for (let l = 0; l < 6; l++) { c.save(); c.translate(W * .8, H * .6); c.rotate(-1.2 + l * .48 + Math.sin(t * 2 + l) * .05); c.fillStyle = l % 2 ? "#3aa35b" : "#2d8a4a"; c.beginPath(); c.ellipse(0, -26, 8, 26, 0, 0, TAU); c.fill(); c.restore(); }
      for (let s = 0; s < 6; s++) { const k = (t * .6 + s / 6) % 1; c.fillStyle = X.a("#ffffff", Math.sin(k * Math.PI)); X.icon(c, "star", W * (.15 + X.hash(s) * .7), H * (.12 + X.hash(s + 4) * .4), 10 + 6 * Math.sin(k * Math.PI), "#fff", { fill: "#fff", lw: 1 }); }
    } else {
      // boxes, clutter
      c.fillStyle = "#a08a6c"; c.fillRect(W * .74, H * .58, W * .16, H * .1); c.fillRect(W * .78, H * .5, W * .12, H * .08); c.strokeStyle = "#7a6650"; c.lineWidth = 2; c.strokeRect(W * .74, H * .58, W * .16, H * .1);
      c.fillStyle = "#6e6a64"; for (let k = 0; k < 4; k++) c.fillRect(W * (.2 + k * .12), H * (.72 + (k % 2) * .05), 22, 8);
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(W * .55, H * .1); c.lineTo(W * .6, H * .16); c.lineTo(W * .57, H * .22); c.stroke();
    }
  }
  PS.def("beforeAfter", (c, t, S) => {
    const { W, H, pal } = S, P = pal[2], Y = pal[3];
    const top = 128, bh = H - top - 120;
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    // title
    const tsz = fitSize(c, "SEBELUM / SESUDAH", W - 40, 30, 400, S.f1);
    X.text(c, "SEBELUM / SESUDAH", W / 2, 60, { size: tsz, w: 400, fam: S.f1, color: pal[1] });
    X.text(c, "Renovasi kamar dalam 7 hari", W / 2, 92, { size: 14, w: 600, fam: S.f2, color: P });
    // slider position: sweep → bounce → hold → sweep back
    let s;
    if (t < .8) s = .94; else if (t < 2.4) s = X.lerp(.94, .5, X.spring(X.seg(t, .8, 2.4), 9, 5)); else if (t < 3.6) s = .5 + Math.sin((t - 2.4) * 5) * .03 * (1 - X.seg(t, 2.4, 3.6)); else if (t < 6.4) s = X.lerp(.5, .04, X.E(t, 3.6, 4.6, "out5")); else s = X.lerp(.04, .94, X.E(t, 6.4, 7.6, "inOut"));
    const sx = W * s;
    c.save(); X.rr(c, 16, top, W - 32, bh, 20); c.clip(); c.translate(16, top);
    const iw = W - 32;
    room(c, iw, bh, false, pal, t);
    c.save(); c.beginPath(); c.rect(sx - 16, 0, iw, bh); c.clip(); room(c, iw, bh, true, pal, t); c.restore();
    // labels
    c.fillStyle = "rgba(0,0,0,.6)"; X.rr(c, 12, 12, 86, 26, 13); c.fill(); X.text(c, "SEBELUM", 55, 25.5, { size: 11, w: 800, fam: S.f2, color: "#fff", ls: 1 });
    c.fillStyle = P; X.rr(c, iw - 98, 12, 86, 26, 13); c.fill(); X.text(c, "SESUDAH", iw - 55, 25.5, { size: 11, w: 800, fam: S.f2, color: "#fff", ls: 1 });
    c.restore();
    // handle
    const hx = Math.max(16, Math.min(W - 16, sx));
    c.fillStyle = "#fff"; c.fillRect(hx - 2, top, 4, bh);
    const hy = top + bh / 2, sq = 1 + X.beat(t, 75, 9) * .08;
    c.save(); c.translate(hx, hy); c.scale(sq, sq); X.shadow(c, 14, 4, "rgba(0,0,0,.3)"); c.fillStyle = "#fff"; X.circle(c, 0, 0, 22); c.fill(); X.noShadow(c);
    c.fillStyle = P; c.beginPath(); c.moveTo(-6, -7); c.lineTo(-13, 0); c.lineTo(-6, 7); c.fill(); c.beginPath(); c.moveTo(6, -7); c.lineTo(13, 0); c.lineTo(6, 7); c.fill(); c.restore();
    // percent bar
    X.text(c, "geser untuk lihat hasil", W / 2, H - 92, { size: 12, w: 500, fam: S.f2, color: X.a(pal[1], .55) });
    const words = [["Hari 1", .1], ["Hari 4", .5], ["Hari 7", .95]];
    words.forEach(([w, at], i) => { const on = (1 - s) >= at - .04; c.fillStyle = on ? (i === 2 ? Y : P) : "#e7e7e7"; X.rr(c, 30 + i * ((W - 60) / 3), H - 66, (W - 60) / 3 - 8, 34, 10); c.fill(); X.text(c, w, 30 + i * ((W - 60) / 3) + ((W - 60) / 3 - 8) / 2, H - 49, { size: 13, w: 800, fam: S.f2, color: on ? (i === 2 ? pal[1] : "#fff") : "#999" }); });
  });
})();
