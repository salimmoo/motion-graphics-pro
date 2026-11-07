/* paket-scenes-a2.js — documentary + narrative scenes for PaketScenes:
   corkboard · newspaper · timeline(history|data) · noir · docAnnot · storybook · cutout · spotlight · wayang · comic · rotoscope · journal · cosmic */
(function () {
  const PS = window.PaketScenes; if (!PS) return;
  const X = PS.X, TAU = Math.PI * 2;
  const fit = (c, s, w, size, maxW, fam) => { X.font(c, w, size, fam); const m = c.measureText(s).width; return m > maxW ? size * maxW / m : size; };
  const cache = (S, key, w, h, fn) => { S._c = S._c || {}; if (!S._c[key]) { const cv = document.createElement("canvas"); cv.width = Math.ceil(w * 2); cv.height = Math.ceil(h * 2); const g = cv.getContext("2d"); g.scale(2, 2); fn(g, w, h); S._c[key] = cv; } return S._c[key]; };
  // wrapped text block; returns line count
  const block = (c, s, x, y, maxW, size, w, fam, col, lh = 1.25, align = "left", alpha = 1) => {
    c.save(); X.font(c, w, size, fam); c.fillStyle = col; c.textAlign = align; c.textBaseline = "top"; c.globalAlpha *= alpha;
    const ls = X.wrap(c, s, maxW); ls.forEach((l, i) => c.fillText(l, x, y + i * size * lh)); c.restore(); return ls.length;
  };
  const quadPts = (a, cp, b, n = 24) => { const o = []; for (let i = 0; i <= n; i++) o.push(X.qpt(a, cp, b, i / n)); return o; };

  /* ================= corkboard (DOK-04) ================= */
  PS.def("corkboard", (c, t, S) => {
    const { W, H, pal } = S, WW = W * 1.8, WH = H * 1.35;
    const cork = cache(S, "cork", WW, WH, (g, w, h) => {
      g.fillStyle = pal[0]; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3200; i++) { const x = X.hash(i * 3.1) * w, y = X.hash(i * 7.7) * h, r = .5 + X.hash(i * 1.3) * 1.7; g.fillStyle = X.hash(i * 5.5) > .5 ? "rgba(60,35,15,.35)" : "rgba(255,235,200,.25)"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      const fr = 18; g.fillStyle = "#3b2a1c"; g.fillRect(0, 0, w, fr); g.fillRect(0, h - fr, w, fr); g.fillRect(0, 0, fr, h); g.fillRect(w - fr, 0, fr, h);
      g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(0, 0, w, 4);
    });
    const it = [[.2, .3, "photo"], [.52, .26, "note"], [.8, .52, "photo"], [.42, .68, "note"]].map(([fx, fy, ty], i) => ({ x: fx * WW, y: fy * WH, ty, i, rot: (S.r(i) - .5) * .16, t0: i * 2 + .45 }));
    // camera: fly to item per beat, last beat pulls back to the whole board
    const b = Math.min(3, Math.floor(t / 2)), lt = t - b * 2;
    const from = b === 0 ? { x: WW * .1, y: WH * .25, z: 1.05 } : { x: it[b - 1].x, y: it[b - 1].y + 10, z: 1.35 };
    let to = { x: it[b].x, y: it[b].y + 10, z: 1.35 };
    let k = X.E(lt, 0, .9, "inOut");
    let cam = { x: X.lerp(from.x, to.x, k), y: X.lerp(from.y, to.y, k), z: X.lerp(from.z, to.z, k) };
    if (t > 6.3) { const q = X.E(t, 6.3, 7.2, "inOut"); cam = { x: X.lerp(cam.x, WW / 2, q), y: X.lerp(cam.y, WH / 2, q), z: X.lerp(cam.z, Math.max(W / WW, H / WH) * 1.02, q) }; }
    c.save(); c.translate(W / 2 + X.wob(1, t, 2.5, .8), H / 2 + X.wob(2, t, 2, .8)); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
    c.drawImage(cork, 0, 0, WW, WH);
    const pin = (x, y, p) => { if (p <= 0) return; const s = X.ease.back(X.clamp(p)); c.save(); c.translate(x, y); c.scale(s, s); X.shadow(c, 4, 3, "rgba(0,0,0,.45)", 2); X.circle(c, 0, 0, 7); c.fillStyle = pal[2]; c.fill(); X.noShadow(c); X.circle(c, -2, -2, 2.4); c.fillStyle = "rgba(255,255,255,.65)"; c.fill(); c.restore(); };
    // strings first (under items? real strings sit on top of pins) — draw after items
    it.forEach((o) => {
      const p = X.seg(t, o.t0, o.t0 + .8); if (p <= 0) return;
      const sp = X.spring(p, 9, 5), w = o.ty === "photo" ? 150 : 170, h = o.ty === "photo" ? 128 : 104;
      c.save(); c.translate(o.x, o.y); c.rotate(o.rot + (1 - sp) * .5); c.scale(.6 + .4 * sp, .6 + .4 * sp); c.globalAlpha = X.clamp(p * 3);
      X.shadow(c, 14, 8, "rgba(0,0,0,.45)", 4);
      if (o.ty === "photo") {
        c.fillStyle = pal[4]; c.fillRect(-w / 2, -h / 2, w, h); X.noShadow(c);
        const g = X.lgrad(c, 0, -h / 2, 0, h / 2 - 26, [[0, "#5c574f"], [1, "#25211c"]]); c.fillStyle = g; c.fillRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 34);
        c.save(); c.beginPath(); c.rect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 34); c.clip(); X.person(c, 0, -h / 2 + 52, 62, "#8d867a", "#4a453d", "#2b2722", { noFace: true }); c.restore();
        X.text(c, X.typed("BUKTI #0" + (o.i + 1), X.seg(t, o.t0 + .7, o.t0 + 1.3)), -w / 2 + 10, h / 2 - 13, { size: 12, w: 400, fam: S.f1, color: pal[1], align: "left" });
      } else {
        c.fillStyle = pal[3]; c.fillRect(-w / 2, -h / 2, w, h); X.noShadow(c);
        c.strokeStyle = X.a(pal[2], .5); c.lineWidth = 1; c.beginPath(); c.moveTo(-w / 2, -h / 2 + 26); c.lineTo(w / 2, -h / 2 + 26); c.stroke();
        c.strokeStyle = "rgba(80,120,170,.25)"; for (let yy = -h / 2 + 44; yy < h / 2; yy += 16) { c.beginPath(); c.moveTo(-w / 2, yy); c.lineTo(w / 2, yy); c.stroke(); }
        X.text(c, "CATATAN " + (o.i + 1), -w / 2 + 10, -h / 2 + 14, { size: 11, w: 400, fam: S.f2, color: pal[2], align: "left" });
        const txt = X.typed(S.lines[o.i].j, X.seg(t, o.t0 + .5, o.t0 + 1.5));
        const sz = 15; block(c, txt, -w / 2 + 10, -h / 2 + 33, w - 20, sz, 400, S.f1, pal[1], 1.07);
      }
      c.restore();
      pin(o.x + Math.sin(o.rot) * 0, o.y - (o.ty === "photo" ? 56 : 44), X.seg(t, o.t0 + .35, o.t0 + .75));
    });
    // red string between consecutive pins (+ closing loop in the last beat)
    const pins = it.map((o) => [o.x, o.y - (o.ty === "photo" ? 56 : 44)]);
    const links = [[0, 1, 2.2], [1, 2, 4.2], [2, 3, 6.2], [3, 0, 6.9]];
    c.strokeStyle = pal[2]; c.lineWidth = 2.4; c.lineCap = "round"; X.shadow(c, 3, 3, "rgba(0,0,0,.4)");
    links.forEach(([a, bb, t0]) => { const p = X.E(t, t0, t0 + .8, "inOut"); if (p <= 0) return; const A = pins[a], B = pins[bb], cp = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + 36 + Math.sin(t * 2 + a) * 3]; X.poly(c, quadPts(A, cp, B), p); c.stroke(); });
    X.noShadow(c);
    c.restore();
    // lower third (screen)
    const k2 = Math.min(3, Math.floor(t / 2)), lp = X.E(t - k2 * 2, .5, 1.1, "out5");
    c.save(); c.globalAlpha = lp; c.fillStyle = "rgba(18,14,10,.82)"; const lw = Math.min(W * .62, 360); c.fillRect(22 - (1 - lp) * 40, H - 66, lw, 44);
    c.fillStyle = pal[2]; c.fillRect(22 - (1 - lp) * 40, H - 66, 5, 44);
    X.text(c, "KASUS #04", 38 - (1 - lp) * 40, H - 54, { size: 10, w: 700, fam: S.f2, color: pal[2], align: "left" });
    const cs = fit(c, S.lines[k2].c, 400, 13, lw - 30, S.f1);
    X.text(c, X.typed(S.lines[k2].c, X.seg(t - k2 * 2, .6, 1.6)), 38 - (1 - lp) * 40, H - 36, { size: cs, w: 400, fam: S.f1, color: pal[4], align: "left" });
    c.restore();
    X.vignette(c, W, H, .55); X.grain(c, W, H, .35, t);
  });

  /* ================= newspaper (DOK-05) ================= */
  PS.def("newspaper", (c, t, S) => {
    const { W, H, pal } = S;
    const cols = cache(S, "npcols", W, H, (g) => {
      const top = H * .5, gx = 22, cw = (W - gx * 2 - 24) / 3;
      for (let ci = 0; ci < 3; ci++) {
        const x0 = gx + ci * (cw + 12);
        if (ci === 0) { // halftone photo
          const ph = H * .3; g.fillStyle = X.mix(pal[0], "#ffffff", .3); g.fillRect(x0, top, cw, ph);
          X.halftone(g, x0, top, cw, ph, pal[1], 4.2, (x, y) => { const lx = (x - x0) / cw, ly = (y - top) / ph, mtn = .55 + Math.sin(lx * 7) * .12 + Math.sin(lx * 17) * .04, sun = Math.hypot(lx - .7, ly - .3); return X.clamp((ly > mtn ? .85 : .25 + ly * .3) - (sun < .14 ? .5 : 0)); });
          g.strokeStyle = pal[1]; g.lineWidth = .8; g.strokeRect(x0, top, cw, ph);
          for (let i = 0; i < 3; i++) { g.fillStyle = X.a(pal[3], .7); g.fillRect(x0, top + ph + 8 + i * 7, cw * (i === 2 ? .5 : .95), 2.6); }
        } else for (let li = 0; li < 22; li++) { const y = top + li * 7.6; if (y > H - 14) break; g.fillStyle = X.a(pal[3], .75); g.fillRect(x0 + (li % 9 === 0 ? 10 : 0), y, cw * (li % 9 === 8 ? .55 : .9 + X.hash(li + ci * 40) * .1), 2.6); }
        if (ci) { g.fillStyle = pal[1]; g.fillRect(x0 - 6.5, top, .7, H - top - 14); }
      }
    });
    const page = (k) => {
      X.paper(c, W, H, pal[0], .5);
      c.fillStyle = X.a("#8a6a3a", .08); c.fillRect(0, 0, W, H);
      X.text(c, "WARTA  LAMA", W / 2, H * .085, { size: H * .085, w: 400, fam: S.f1, color: pal[1], ls: 4 });
      c.fillStyle = pal[1]; c.fillRect(20, H * .145, W - 40, 2.2); c.fillRect(20, H * .158, W - 40, .7);
      X.text(c, "No. " + (1147 + k) + "  ·  Edisi Sabtu  ·  Harga 5 sen", W / 2, H * .185, { size: 9.5, w: 400, fam: S.f2, color: pal[3] });
      c.fillRect(20, H * .21, W - 40, .7);
      const hs = fit(c, S.lines[k].j, 400, H * .14, W - 50, S.f1);
      X.text(c, S.lines[k].j, W / 2, H * .3, { size: hs, w: 400, fam: S.f1, color: pal[1] });
      X.text(c, S.lines[k].c, W / 2, H * .41, { size: fit(c, S.lines[k].c, 400, H * .045, W - 80, S.f2), w: 400, fam: S.f2, color: pal[2] });
      c.drawImage(cols, 0, 0, W, H);
    };
    const spin = X.seg(t, 3.9, 4.9);
    c.fillStyle = X.shade(pal[1], .08); c.fillRect(0, 0, W, H);
    if (t < 3.9) { const z = 1 + X.E(t, 0, 3.9, "sine") * .55; c.save(); c.translate(W / 2, H * .3); c.scale(z, z); c.translate(-W / 2, -H * .3); page(0); c.restore(); }
    else {
      const e = X.ease.out(spin), z = t < 4.9 ? .2 + e * .85 : 1.05 + X.E(t, 4.9, 8, "sine") * .25;
      c.save(); c.translate(W / 2, H / 2); c.rotate(t < 4.9 ? (1 - e) * TAU * 1.5 : 0); c.scale(z, z); X.shadow(c, 30, 10, "rgba(0,0,0,.6)"); c.fillStyle = pal[0]; c.fillRect(-W / 2, -H / 2, W, H); X.noShadow(c); c.translate(-W / 2, -H / 2);
      c.beginPath(); c.rect(0, 0, W, H); c.clip(); page(1); c.restore();
    }
    // ink stamp
    const sp = X.seg(t, 6.1, 6.5);
    if (sp > 0) {
      const s = 2.4 - 1.4 * X.ease.out5(sp);
      c.save(); c.translate(W * .76, H * .6); c.rotate(-.2); c.scale(s, s); c.globalAlpha = .85 * X.clamp(sp * 2); c.globalCompositeOperation = "multiply";
      c.strokeStyle = pal[2]; c.lineWidth = 3.2; X.rr(c, -70, -24, 140, 48, 6); c.stroke(); c.lineWidth = 1.2; X.rr(c, -64, -18, 128, 36, 4); c.stroke();
      X.text(c, "ARSIP", 0, 1, { size: 26, w: 400, fam: S.f1, color: pal[2], ls: 5 });
      for (let i = 0; i < 26; i++) { c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(-70 + X.hash(i) * 140, -24 + X.hash(i + 9) * 48, 2 + X.hash(i + 3) * 5, 1.4); }
      c.restore();
    }
    X.vignette(c, W, H, .4, "40,25,10"); X.grain(c, W, H, .3, t);
  });

  /* ================= timeline (history | data) ================= */
  PS.def("timeline", (c, t, S) => {
    const { W, H, pal } = S, data = S.v === "data", gap = data ? W * .4 : W * .58, ly = data ? H * .66 : H * .64;
    const xs = [0, 1, 2, 3].map((i) => W * .5 + i * gap);
    const b = Math.min(3, Math.floor(t / 2)), lt = t - b * 2;
    const fromX = b === 0 ? xs[0] - W * .45 : xs[b - 1];
    const camX = X.lerp(fromX, xs[b], X.E(lt, 0, 1.05, "inOut")) + (t > 6.9 ? -X.E(t, 6.9, 8, "inOut") * 0 : 0);
    const yrs = data ? ["2019", "2021", "2023", "2026"] : ["1602", "1799", "1945", "2026"];
    const vals = data ? [12, 48, 135, 420] : null;
    // bg
    if (data) { c.fillStyle = pal[0]; c.fillRect(0, 0, W, H); }
    else { X.paper(c, W, H, pal[0], .45); }
    // watermark year (parallax .35)
    X.text(c, yrs[b], W * .5 - (camX - xs[b]) * .35, H * .3, { size: H * .42, w: 700, fam: S.f1, color: X.a(pal[1], data ? .05 : .06) });
    if (data) { c.strokeStyle = X.a(pal[3], .14); c.lineWidth = 1; for (let gy = H * .2; gy < H * .9; gy += H * .1) { c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke(); } }
    c.save(); c.translate(W / 2 - camX, 0);
    const reach = camX + W * .02;
    if (!data) {
      c.strokeStyle = X.a(pal[1], .35); c.lineWidth = 1.2; c.beginPath(); c.moveTo(xs[0] - W, ly); c.lineTo(xs[3] + W, ly); c.stroke();
      c.strokeStyle = pal[2]; c.lineWidth = 3; c.beginPath(); c.moveTo(xs[0] - W, ly); c.lineTo(reach, ly); c.stroke();
      for (let x = Math.floor((camX - W) / 24) * 24; x < camX + W; x += 24) { const maj = Math.round(x / 24) % 5 === 0; c.fillStyle = X.a(pal[1], maj ? .5 : .25); c.fillRect(x, ly + 6, 1, maj ? 10 : 5); }
    } else {
      // rising line through points
      const py = (i) => ly - [.05, .2, .42, .78][i] * H * .5;
      const pts = []; for (let i = -1; i <= 4; i++) { const ii = X.clamp(i, 0, 3); pts.push([W * .5 + i * gap, i < 0 ? ly + 10 : i > 3 ? py(3) - 40 : py(ii)]); }
      const tot = pts[pts.length - 1][0] - pts[0][0], pr = X.clamp((reach - pts[0][0]) / tot);
      c.save(); X.poly(c, pts, pr); c.lineTo(reach, H); c.lineTo(pts[0][0], H); c.closePath(); c.fillStyle = X.lgrad(c, 0, H * .2, 0, H, [[0, X.a(pal[3], .35)], [1, X.a(pal[3], 0)]]); c.fill(); c.restore();
      c.strokeStyle = pal[3]; c.lineWidth = 3.5; c.lineJoin = "round"; X.poly(c, pts, pr); c.stroke();
      xs.forEach((x, i) => { xs[i] = x; }); S._py = py;
    }
    xs.forEach((x, i) => {
      const t0 = i * 2 + .85, p = X.seg(t, t0, t0 + .6); if (p <= 0) return;
      const y = data ? S._py(i) : ly, s = X.ease.back(p), active = i === b;
      // pulse ring
      const rp = X.seg(t, t0, t0 + 1.2); if (rp < 1) { c.strokeStyle = X.a(pal[2], 1 - rp); c.lineWidth = 2; X.circle(c, x, y, 8 + rp * 26); c.stroke(); }
      c.fillStyle = data ? pal[4] : pal[0]; X.circle(c, x, y, 9 * s); c.fill(); c.strokeStyle = pal[2]; c.lineWidth = 3; c.stroke();
      c.fillStyle = pal[2]; X.circle(c, x, y, 3.5 * s); c.fill();
      if (!data) {
        X.text(c, yrs[i], x, ly + 34, { size: 19, w: 700, fam: S.f1, color: pal[1], alpha: p });
        const cp = X.seg(t, t0 + .2, t0 + .9), cw = Math.min(W * .46, 270), ch = H * .36, cy = ly - 26 - ch;
        if (cp > 0) {
          const sy = X.spring(cp, 8, 5);
          c.save(); c.globalAlpha = active ? 1 : .55; c.translate(x, ly - 18); c.scale(1, sy); c.translate(-x, -(ly - 18));
          c.strokeStyle = X.a(pal[2], .7); c.lineWidth = 1; c.beginPath(); c.moveTo(x, ly - 10); c.lineTo(x, cy + ch); c.stroke();
          X.shadow(c, 22, 10, "rgba(60,40,10,.22)"); c.fillStyle = pal[4]; X.rr(c, x - cw / 2, cy, cw, ch, 6); c.fill(); X.noShadow(c);
          c.fillStyle = pal[3]; c.fillRect(x - cw / 2, cy, cw, 4);
          X.text(c, "PERISTIWA " + ["I", "II", "III", "IV"][i], x - cw / 2 + 16, cy + 22, { size: 10, w: 700, fam: S.f1, color: pal[2], align: "left", ls: 2 });
          X.text(c, S.lines[i].j, x - cw / 2 + 16, cy + 48, { size: fit(c, S.lines[i].j, 700, 20, cw - 32, S.f1), w: 700, fam: S.f1, color: pal[1], align: "left" });
          block(c, S.lines[i].c, x - cw / 2 + 16, cy + 66, cw - 32, 12.5, 400, S.f2, X.a(pal[1], .8), 1.3, "left", X.seg(t, t0 + .6, t0 + 1.1));
          c.restore();
        }
      } else {
        // count-up value + flag
        const v = Math.round(vals[i] * X.E(t, t0, t0 + 1, "out")), fp = X.seg(t, t0 + .2, t0 + .8);
        X.text(c, v + " rb", x, y - 40, { size: 30 * (.8 + .2 * s), w: 800, fam: S.f1, color: pal[1], alpha: p });
        X.text(c, S.lines[i].j, x, y - 68, { size: fit(c, S.lines[i].j, 600, 12, gap * .8, S.f2), w: 600, fam: S.f2, color: pal[3], alpha: X.seg(t, t0 + .4, t0 + .9) });
        if (fp > 0) {
          const ph = 46 * X.ease.back(fp), fy = ly + 30;
          c.strokeStyle = pal[1]; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, H * .97); c.lineTo(x, H * .97 - ph - 12); c.stroke();
          c.fillStyle = pal[2]; c.beginPath(); const top = H * .97 - ph - 12; c.moveTo(x, top);
          for (let k = 0; k <= 8; k++) c.lineTo(x + k * 6, top + Math.sin(t * 7 - k * .8) * 2.2 * (k / 8));
          for (let k = 8; k >= 0; k--) c.lineTo(x + k * 6, top + 16 + Math.sin(t * 7 - k * .8) * 2.2 * (k / 8));
          c.closePath(); c.fill(); X.text(c, yrs[i], x + 24, top + 8, { size: 9, w: 800, fam: S.f2, color: pal[4] });
          void fy;
        }
      }
    });
    c.restore();
    // header
    const hp = X.E(t, .1, .8, "out5");
    if (!data) { X.text(c, "GARIS WAKTU", 26, 30, { size: 11, w: 700, fam: S.f1, color: pal[2], align: "left", ls: 3, alpha: hp }); c.fillStyle = X.a(pal[2], hp); c.fillRect(26, 42, 60 * hp, 1.5); }
    else { X.text(c, "Pertumbuhan pengguna", 26, 30, { size: 17, w: 700, fam: S.f1, color: pal[1], align: "left", alpha: hp }); X.text(c, "dalam ribuan · 2019–2026", 26, 50, { size: 11, w: 400, fam: S.f2, color: X.a(pal[1], .6), align: "left", alpha: hp }); }
    // foreground dust
    if (!data) { for (let i = 0; i < 14; i++) { const x = ((X.hash(i) * W - t * (8 + i)) % W + W) % W, y = X.hash(i + 30) * H + Math.sin(t + i) * 6; c.fillStyle = X.a(pal[2], .25); X.circle(c, x, y, 1 + X.hash(i + 5) * 1.6); c.fill(); } X.vignette(c, W, H, .25, "70,40,10"); }
  });

  /* ================= noir (DOK-07) ================= */
  PS.def("noir", (c, t, S) => {
    const { W, H, pal } = S, z = 1 + t * .014;
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    // back wall gradient
    c.fillStyle = X.lgrad(c, 0, 0, W, H, [[0, X.shade(pal[4], .06)], [1, pal[0]]]); c.fillRect(0, 0, W, H);
    // figure in fedora (silhouette)
    const fx = W * .74, fy = H * .98, sway = Math.sin(t * .9) * 1.5;
    c.save(); c.translate(fx + sway, fy); c.fillStyle = "#050505";
    c.beginPath(); c.moveTo(-62, 0); c.bezierCurveTo(-60, -110, -44, -150, -22, -160); c.lineTo(22, -160); c.bezierCurveTo(46, -150, 60, -110, 64, 0); c.fill();
    c.beginPath(); c.ellipse(0, -190, 24, 30, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, -210, 50, 8, -.05, 0, TAU); c.fill(); X.rr(c, -26, -244, 52, 36, 10); c.fill();
    c.strokeStyle = X.a(pal[2], .35); c.lineWidth = 1.5; c.beginPath(); c.moveTo(-62, 0); c.bezierCurveTo(-60, -110, -44, -150, -22, -160); c.stroke(); c.beginPath(); c.arc(0, -190, 24, Math.PI * .6, Math.PI * 1.3); c.stroke(); c.beginPath(); c.moveTo(-50, -210); c.lineTo(-26, -214); c.stroke();
    c.restore();
    // smoke from the cigarette
    c.save(); c.strokeStyle = X.a(pal[1], .16); c.lineWidth = 2.2; c.lineCap = "round";
    for (let s = 0; s < 3; s++) { c.beginPath(); for (let k = 0; k <= 30; k++) { const yy = H * .62 - k * 7, xx = fx - 34 + Math.sin(k * .35 + t * 1.6 + s * 2) * (4 + k * .8) + X.noise(k * .2 + t + s) * 6; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
    c.restore();
    for (let i = 0; i < 4; i++) { const sx = (W * (.2 + i * .25) + t * (10 + i * 4)) % (W * 1.3) - W * .15; X.glow(c, sx, H * (.35 + .12 * Math.sin(i + t * .3)), H * .45, pal[1], .05); }
    // venetian blind light — sweeping
    c.save(); c.globalCompositeOperation = "lighter"; c.translate(W * .45, H * .4); c.rotate(-.32);
    const off = -W * .12 + X.E(t, 0, 8, "sine") * W * .22;
    const g = c.createLinearGradient(-W * .7 + off, 0, W * .6 + off, 0); g.addColorStop(0, X.a(pal[1], 0)); g.addColorStop(.35, X.a(pal[1], .13)); g.addColorStop(.7, X.a(pal[1], .08)); g.addColorStop(1, X.a(pal[1], 0));
    c.fillStyle = g; for (let i = -7; i < 8; i++) c.fillRect(-W * .7 + off, i * 30 + (t * 2) % 30 * 0, W * 1.3, 15);
    c.restore();
    c.restore();
    // light leak
    c.save(); c.globalCompositeOperation = "lighter";
    const lk = .35 + .25 * Math.sin(t * 1.3) + .15 * X.noise(t * 2);
    X.glow(c, W * (.05 + .05 * Math.sin(t * .5)), H * .1, H * .9, pal[2], .32 * lk); X.glow(c, W * .02, H * .9, H * .5, pal[3], .25 * lk);
    c.restore();
    // titles
    const k = t < 4 ? 0 : 1, lt = t - k * 4, ap = X.win(lt, .3, 3.9, .9, .45);
    const tr = 14 * (1 - X.E(lt, .3, 2.4, "out5"));
    c.save(); X.font(c, "italic 400", 10, S.f1); c.restore();
    const ts = fit(c, S.lines[k].j, "italic 400", H * .12, W * .56, S.f1);
    X.text(c, S.lines[k].j, 34, H * .44, { size: ts, w: "italic 400", fam: S.f1, color: pal[1], align: "left", ls: tr, alpha: ap });
    c.fillStyle = X.a(pal[3], ap); c.fillRect(36, H * .44 + ts * .62, 90 * X.E(lt, .9, 1.8, "out5"), 2);
    X.text(c, S.lines[k].c, 36, H * .44 + ts * .62 + 22, { size: fit(c, S.lines[k].c, 400, 13, W * .5, S.f2), w: 400, fam: S.f2, color: X.a(pal[1], .75), align: "left", alpha: X.win(lt, 1.1, 3.9, .6, .45), ls: 1 });
    X.text(c, "BAB " + (k + 1), 36, H * .44 - ts * .7, { size: 10, w: 400, fam: S.f2, color: pal[2], align: "left", ls: 4, alpha: ap });
    X.grain(c, W, H, .85, t); X.vignette(c, W, H, .8); X.letterbox(c, W, H, .085);
  });

  /* ================= docAnnot (DOK-08) ================= */
  PS.def("docAnnot", (c, t, S) => {
    const { W, H, pal } = S, P = S.portrait;
    const dw = Math.min(W * .62, 400), dx = W / 2 - dw / 2, dy = H * .08, qy = dy + 92, qy2 = dy + 158;
    const qs = S.lines[0].j, q2 = S.lines[1].j;
    const doc = () => {
      X.shadow(c, 26, 12, "rgba(0,0,0,.25)"); c.fillStyle = pal[4]; c.fillRect(dx, dy, dw, H * 1.2); X.noShadow(c);
      X.text(c, "DOKUMEN · No. 47/1998", dx + 22, dy + 24, { size: 9, w: 600, fam: S.f2, color: X.a(pal[1], .6), align: "left", ls: 2 });
      X.text(c, "RAHASIA", dx + dw - 22, dy + 24, { size: 9, w: 800, fam: S.f2, color: pal[3], align: "right", ls: 2 });
      c.fillStyle = X.a(pal[1], .8); c.fillRect(dx + 22, dy + 38, dw - 44, 1);
      for (let i = 0; i < 2; i++) { c.fillStyle = X.a(pal[1], .22); c.fillRect(dx + 22, dy + 54 + i * 10, (dw - 44) * (i ? .7 : .96), 3.2); }
      X.text(c, "“" + qs + "”", dx + 22, qy, { size: fit(c, "“" + qs + "”", 700, 21, dw - 44, S.f1), w: 700, fam: S.f1, color: pal[1], align: "left" });
      for (let i = 0; i < 3; i++) { c.fillStyle = X.a(pal[1], .22); c.fillRect(dx + 22, qy + 24 + i * 10, (dw - 44) * [.92, .99, .6][i], 3.2); }
      X.text(c, q2, dx + 22, qy2, { size: fit(c, q2, 400, 15, dw - 60, S.f1), w: 400, fam: S.f1, color: pal[1], align: "left" });
      for (let i = 0; i < 9; i++) { c.fillStyle = X.a(pal[1], .2); c.fillRect(dx + 22, qy2 + 22 + i * 10, (dw - 44) * (.7 + X.hash(i + 4) * .3), 3.2); }
    };
    const camP = X.E(t, 0, 8, "sine"), z = 1 + camP * .12;
    c.fillStyle = X.shade(pal[0], -.18); c.fillRect(0, 0, W, H);
    c.fillStyle = X.lgrad(c, 0, 0, W, H, [[0, "rgba(255,250,240,.15)"], [1, "rgba(0,0,0,.18)"]]); c.fillRect(0, 0, W, H);
    c.save(); c.translate(W / 2, qy); c.scale(z, z); c.rotate(-.012); c.translate(-W / 2, -qy);
    doc();
    // highlighter
    X.font(c, 700, fit(c, "“" + qs + "”", 700, 21, dw - 44, S.f1), S.f1); const qw = Math.min(dw - 44, c.measureText("“" + qs + "”").width);
    const hp = X.E(t, .4, 1.3, "inOut");
    if (hp > 0) { c.save(); c.globalCompositeOperation = "multiply"; c.fillStyle = X.a(pal[2], .85); c.beginPath(); c.moveTo(dx + 18, qy - 11); c.lineTo(dx + 18 + (qw + 10) * hp, qy - 13); c.lineTo(dx + 20 + (qw + 10) * hp, qy + 12); c.lineTo(dx + 18, qy + 11); c.fill(); c.restore(); }
    // red circle + arrow + note on line 2
    X.font(c, 400, fit(c, q2, 400, 15, dw - 60, S.f1), S.f1); const q2w = Math.min(dw - 60, c.measureText(q2).width);
    const cp = X.E(t, 2.0, 2.9, "inOut");
    if (cp > 0) {
      c.save(); c.strokeStyle = pal[3]; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath();
      const cx = dx + 22 + q2w / 2, rx = q2w / 2 + 14, ry = 15;
      for (let k = 0; k <= 60 * cp; k++) { const a = -2.6 + k / 60 * TAU * 1.08, r = 1 + k / 60 * .06; const px = cx + Math.cos(a) * rx * r, py = qy2 + Math.sin(a) * ry * r; k ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.stroke();
      const ap = X.E(t, 2.8, 3.3, "out");
      if (ap > 0) { const ax = dx + dw - 110, ay = qy2 + 40; c.beginPath(); c.moveTo(ax + 40, ay + 26); c.quadraticCurveTo(ax + 4, ay + 20, X.lerp(ax + 40, cx + rx - 4, ap), X.lerp(ay + 26, qy2 + 10, ap)); c.stroke();
        X.text(c, "cek ini!", ax + 44, ay + 40, { size: 17, w: 700, fam: "Caveat", color: pal[3], align: "left", alpha: X.seg(t, 3.1, 3.5) }); }
      c.restore();
    }
    // redaction bars
    for (let i = 0; i < 4; i++) { const rp = X.E(t, 4.0 + i * .18, 4.5 + i * .18, "out5"); if (rp <= 0) continue; c.fillStyle = "#0b0b0b"; c.fillRect(dx + 22, qy2 + 20 + (i + 3) * 10, (dw - 44) * [.62, .9, .45, .78][i] * rp, 7); }
    c.restore();
    // magnifier
    const mp = X.E(t, 5.6, 6.5, "out5");
    if (mp > 0) {
      const lx = X.lerp(W * 1.1, dx + 22 + qw * .5, mp) + Math.sin(t * 1.3) * 6, lyy = X.lerp(H * .9, qy + 6, mp) + Math.cos(t * 1.1) * 4, R = Math.min(W, H) * .17;
      c.save(); X.shadow(c, 20, 10, "rgba(0,0,0,.35)"); X.circle(c, lx, lyy, R); c.fillStyle = pal[4]; c.fill(); X.noShadow(c); c.clip();
      c.translate(lx, lyy); c.scale(2.1 * z, 2.1 * z); c.translate(-lx, -lyy);
      c.translate(W / 2, qy); c.translate(-W / 2, -qy);
      doc(); c.save(); c.globalCompositeOperation = "multiply"; c.fillStyle = X.a(pal[2], .85); c.fillRect(dx + 18, qy - 12, qw + 10, 24); c.restore();
      c.restore();
      c.save(); c.strokeStyle = "#222"; c.lineWidth = 7; X.circle(c, lx, lyy, R); c.stroke(); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.5; c.beginPath(); c.arc(lx, lyy, R - 7, 3.6, 4.6); c.stroke();
      c.strokeStyle = "#222"; c.lineWidth = 12; c.lineCap = "round"; c.beginPath(); c.moveTo(lx + R * .72, lyy + R * .72); c.lineTo(lx + R * 1.3, lyy + R * 1.3); c.stroke(); c.restore();
    }
    // source tag
    const sp = X.E(t, .2, .8, "out5");
    c.save(); c.globalAlpha = sp; c.fillStyle = pal[1]; X.rr(c, 18, H - 40, 168, 24, 12); c.fill();
    X.text(c, "SUMBER · ARSIP PUBLIK", 102, H - 28, { size: 9.5, w: 700, fam: S.f2, color: pal[4], ls: 1.5 }); c.restore();
    X.vignette(c, W, H, .3);
  });

  /* ================= storybook (NAR-01) ================= */
  PS.def("storybook", (c, t, S) => {
    const { W, H, pal } = S, cx = W / 2, pw = W * .41, ph = H * .8, top = H * .1;
    const sky = X.mix(pal[3], pal[0], .55);
    const illus = (x, y, w, h, night) => {
      c.save(); c.beginPath(); c.rect(x + 14, y + 14, w - 28, h - 28); c.clip();
      const ix = x + 14, iy = y + 14, iw = w - 28, ih = h - 28;
      c.fillStyle = night ? X.lgrad(c, 0, iy, 0, iy + ih, [[0, X.mix(pal[1], "#24306a", .6)], [1, X.mix(pal[2], "#3a3a70", .6)]]) : X.lgrad(c, 0, iy, 0, iy + ih, [[0, sky], [1, pal[0]]]); c.fillRect(ix, iy, iw, ih);
      if (night) { for (let i = 0; i < 22; i++) { c.fillStyle = X.a("#fff8e0", .5 + .5 * Math.sin(t * 3 + i)); X.circle(c, ix + X.hash(i) * iw, iy + X.hash(i + 9) * ih * .5, .8 + X.hash(i + 2)); c.fill(); }
        c.fillStyle = pal[4]; X.circle(c, ix + iw * .72, iy + ih * .2, ih * .08); c.fill(); c.fillStyle = X.mix(pal[1], "#24306a", .6); X.circle(c, ix + iw * .75, iy + ih * .18, ih * .07); c.fill(); }
      else { const sx = ix + iw * .74, sy = iy + ih * .2, sr = ih * .085; c.save(); c.translate(sx, sy); c.rotate(t * .25); c.strokeStyle = X.a(pal[4], .9); c.lineWidth = 2.5; c.lineCap = "round"; for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(sr * 1.3, 0); c.lineTo(sr * 1.75, 0); c.stroke(); } c.restore(); c.fillStyle = pal[4]; X.circle(c, sx, sy, sr); c.fill();
        for (let i = 0; i < 2; i++) { const cxx = ix + ((iw * (.2 + i * .45) + t * 6) % (iw + 60)) - 30, cyy = iy + ih * (.16 + i * .1); c.fillStyle = "rgba(255,255,255,.85)"; X.circle(c, cxx, cyy, 11); c.fill(); X.circle(c, cxx + 12, cyy - 4, 13); c.fill(); X.circle(c, cxx + 25, cyy, 10); c.fill(); }
        c.strokeStyle = pal[1]; c.lineWidth = 1.3; for (let i = 0; i < 3; i++) { const bx = ix + ((iw * .1 + i * 22 + t * 18) % iw), by = iy + ih * (.35 + i * .04), f = Math.sin(t * 9 + i) * 4; c.beginPath(); c.moveTo(bx - 6, by - f); c.quadraticCurveTo(bx - 3, by - 2, bx, by); c.quadraticCurveTo(bx + 3, by - 2, bx + 6, by - f); c.stroke(); } }
      const hill = (yy, col, amp, ph2, dx) => { c.fillStyle = col; c.beginPath(); c.moveTo(ix, iy + ih); for (let k = 0; k <= 20; k++) { const xx = ix + k / 20 * iw; c.lineTo(xx, iy + ih * yy + Math.sin(k * .5 + ph2 + dx) * amp); } c.lineTo(ix + iw, iy + ih); c.fill(); };
      hill(.62, X.mix(pal[3], night ? "#203040" : "#ffffff", night ? .5 : .25), 10, 0, t * .05);
      // house
      const hx = ix + iw * .28, hy = iy + ih * .7, hw = iw * .26, hh = ih * .18;
      c.fillStyle = X.mix(pal[0], "#ffffff", .3); c.fillRect(hx, hy - hh, hw, hh);
      c.fillStyle = pal[2]; c.beginPath(); c.moveTo(hx - 8, hy - hh); c.lineTo(hx + hw / 2, hy - hh - ih * .13); c.lineTo(hx + hw + 8, hy - hh); c.fill();
      c.fillStyle = X.shade(pal[2], -.3); c.fillRect(hx + hw * .7, hy - hh - ih * .12, 9, 18);
      for (let i = 0; i < 4; i++) { const sp = ((t * .4 + i * .25) % 1); c.fillStyle = X.a(night ? "#cfd6ea" : "#ffffff", .7 * (1 - sp)); X.circle(c, hx + hw * .7 + 4 + Math.sin(sp * 6 + i) * 5 + sp * 10, hy - hh - ih * .12 - sp * 40, 4 + sp * 7); c.fill(); }
      c.fillStyle = pal[1]; c.fillRect(hx + hw * .42, hy - hh * .55, hw * .18, hh * .55);
      c.fillStyle = night ? "#ffd56b" : X.mix(pal[3], "#ffffff", .4); c.fillRect(hx + hw * .12, hy - hh * .75, hw * .2, hh * .28); if (night) X.glow(c, hx + hw * .22, hy - hh * .6, 26, "#ffd56b", .5);
      hill(.8, X.mix(pal[3], night ? "#102030" : "#000000", night ? .55 : .12), 7, 2, 0);
      // tree
      const tx = ix + iw * .75, tyy = iy + ih * .8, sw = Math.sin(t * 1.4) * .04;
      c.fillStyle = X.shade(pal[1], .25); c.fillRect(tx - 4, tyy - ih * .2, 8, ih * .2);
      c.save(); c.translate(tx, tyy - ih * .2); c.rotate(sw); c.fillStyle = X.mix(pal[3], night ? "#102030" : "#000", .3); X.circle(c, 0, -14, ih * .11); c.fill(); X.circle(c, -14, -2, ih * .08); c.fill(); X.circle(c, 14, -4, ih * .085); c.fill(); c.restore();
      c.restore();
      c.strokeStyle = X.a(pal[1], .25); c.lineWidth = 1; c.strokeRect(x + 14, y + 14, w - 28, h - 28);
    };
    const textPage = (x, y, w, h, k, rev) => {
      const pad = 26, ln = S.lines[k];
      X.text(c, "— " + ["Satu", "Dua", "Tiga", "Empat"][k] + " —", x + w / 2, y + 34, { size: 10, w: 400, fam: S.f2, color: pal[2], ls: 3, alpha: X.clamp(rev * 3) });
      const hs = fit(c, ln.j, 600, 25, w - pad * 2, S.f1);
      X.text(c, ln.j, x + w / 2, y + 66 + (1 - X.ease.out(X.clamp(rev * 2))) * 10, { size: hs, w: 600, fam: S.f1, color: pal[1], alpha: X.clamp(rev * 2) });
      const cap = ln.c || "", first = cap.charAt(0), rest = cap.slice(1), a2 = X.clamp(rev * 2 - .5);
      X.text(c, first, x + pad + 14, y + 112, { size: 44, w: 700, fam: S.f1, color: pal[2], alpha: a2 });
      block(c, rest, x + pad + 36, y + 96, w - pad * 2 - 36, 13.5, 400, S.f2, X.a(pal[1], .85), 1.5, "left", a2);
      block(c, "Dan sejak hari itu, semua orang di kampung mengingat cerita ini.", x + pad, y + 156, w - pad * 2, 12.5, 400, S.f2, X.a(pal[1], .6), 1.5, "left", X.clamp(rev * 2 - 1));
      X.text(c, String(k * 2 + 2), x + w / 2, y + h - 18, { size: 10, w: 400, fam: S.f2, color: X.a(pal[1], .5) });
    };
    const pg = (x, w, side) => { c.fillStyle = pal[0]; c.fillRect(x, top, w, ph); const g = side < 0 ? X.lgrad(c, x + w - 30, 0, x + w, 0, [[0, "rgba(0,0,0,0)"], [1, "rgba(60,30,10,.22)"]]) : X.lgrad(c, x, 0, x + 30, 0, [[0, "rgba(60,30,10,.22)"], [1, "rgba(0,0,0,0)"]]); c.fillStyle = g; c.fillRect(x, top, w, ph); };
    // table + cover
    c.fillStyle = X.shade(pal[1], .08); c.fillRect(0, 0, W, H); X.glow(c, W / 2, H * .4, W * .7, pal[4], .18);
    const bob = Math.sin(t * .8) * 1.5;
    c.save(); c.translate(0, bob);
    X.shadow(c, 30, 14, "rgba(0,0,0,.5)"); c.fillStyle = pal[2]; X.rr(c, cx - pw - 10, top - 8, pw * 2 + 20, ph + 16, 6); c.fill(); X.noShadow(c);
    const turn = X.seg(t, 3.7, 4.7), A = t < 4.2;
    const revA = X.seg(t, .2, 1.8), revB = X.seg(t, 4.7, 6.3);
    // left page
    pg(cx - pw, pw, -1); illus(cx - pw, top, pw, ph, turn >= 1);
    if (t < 3.7 || turn >= .5) {} // left already drawn with correct spread
    // right page (base)
    pg(cx, pw, 1); textPage(cx, top, pw, ph, t < 3.7 ? 0 : 1, t < 3.7 ? revA : revB);
    // flipping leaf
    if (turn > 0 && turn < 1) {
      const e = X.ease.inOut(turn);
      if (e < .5) { const sx = 1 - e * 2; c.save(); c.translate(cx, 0); c.scale(sx, 1); pg(0, pw, 1); textPage(0, top, pw, ph, 0, 1); c.fillStyle = `rgba(40,20,5,${.35 * (1 - sx)})`; c.fillRect(0, top, pw, ph); c.restore(); }
      else { const sx = (e - .5) * 2; c.save(); c.translate(cx, 0); c.scale(-sx, 1); pg(0, pw, 1); c.restore(); c.save(); c.translate(cx, 0); c.scale(sx, 1); c.translate(-cx, 0); c.beginPath(); c.rect(cx - pw, top, pw, ph); c.clip(); illus(cx - pw, top, pw, ph, true); c.fillStyle = `rgba(40,20,5,${.3 * (1 - sx)})`; c.fillRect(cx - pw, top, pw, ph); c.restore(); }
      X.glow(c, cx, H / 2, pw * .6, "#000000", .15 * Math.sin(turn * Math.PI));
    }
    c.fillStyle = "rgba(60,30,10,.25)"; c.fillRect(cx - 1, top, 2, ph);
    c.restore();
    X.vignette(c, W, H, .45); void A;
  });

  /* ================= cutout (NAR-03) ================= */
  PS.def("cutout", (c, t, S) => {
    const { W, H, pal } = S, tt = X.stepT(t, 12), gy = H * .8;
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W * .45, H * .62); c.rotate(tt * .15); c.fillStyle = X.a(pal[4], .35); for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, W, i * TAU / 12, i * TAU / 12 + TAU / 24); c.fill(); } c.restore();
    c.fillStyle = pal[3]; c.fillRect(0, gy, W, H - gy); c.fillStyle = X.a(pal[4], .5); for (let x = -((tt * 40) % 40); x < W; x += 40) c.fillRect(x, gy + 18, 20, 4);
    // character state
    let x = X.lerp(-70, W * .38, X.E(tt, 0, 2, "out")), jump = 0, sq = 1, walk = tt < 2 ? Math.sin(tt * 14) : 0;
    if (tt > 2 && tt < 3.3) { const p = X.seg(tt, 2.15, 3.15); jump = Math.sin(p * Math.PI) * H * .22; }
    const land = X.seg(tt, 3.15, 3.6), take = X.seg(tt, 2, 2.15); sq = 1 - .22 * Math.sin(take * Math.PI) - .25 * Math.sin(land * Math.PI) * (1 - land);
    const surprised = tt > 2 && tt < 4.6, wave = tt > 5.4 ? Math.sin(tt * 10) : 0;
    const bob = Math.abs(walk) * 5;
    c.save(); c.translate(x, gy - jump - bob);
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(0, jump + bob + 4, 42 * (1 - jump / H), 7, 0, 0, TAU); c.fill();
    c.scale(1 / Math.sqrt(sq), sq);
    X.shadow(c, 0, 4, X.a(pal[1], .25), 4);
    const limb = (px, py, a, len, w, col) => { c.save(); c.translate(px, py); c.rotate(a); c.fillStyle = col; X.rr(c, -w / 2, -w / 2, w, len, w / 2); c.fill(); c.restore(); };
    limb(-12, -40, walk * .6 + (jump ? -.5 : 0), 42, 15, X.shade(pal[3], -.2)); limb(12, -40, -walk * .6 + (jump ? .5 : 0), 42, 15, X.shade(pal[3], -.2));
    c.fillStyle = pal[2]; X.rr(c, -30, -104, 60, 70, 20); c.fill();
    limb(-28, -92, (jump ? 2.6 : -walk * .7 + .2) + (surprised ? .9 : 0), 40, 13, X.shade(pal[2], -.15));
    limb(28, -92, wave ? -2.4 + wave * .4 : (jump ? -2.6 : walk * .7 - .2) - (surprised ? .9 : 0), 40, 13, X.shade(pal[2], -.15));
    c.fillStyle = "#F6C9A0"; X.circle(c, 0, -134, 34); c.fill();
    c.fillStyle = pal[1]; c.beginPath(); c.ellipse(0, -160, 30, 12, 0, Math.PI, 0); c.fill();
    X.noShadow(c);
    const look = Math.sin(tt * 2) * 3; c.fillStyle = "#fff"; X.circle(c, -12, -138, 9); c.fill(); X.circle(c, 12, -138, 9); c.fill();
    c.fillStyle = pal[1]; X.circle(c, -12 + look, -137, surprised ? 3 : 4.5); c.fill(); X.circle(c, 12 + look, -137, surprised ? 3 : 4.5); c.fill();
    if (surprised) { c.fillStyle = pal[1]; c.beginPath(); c.ellipse(0, -116, 6, 8, 0, 0, TAU); c.fill(); } else { c.strokeStyle = pal[1]; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.arc(0, -122, 10, .3, Math.PI - .3); c.stroke(); }
    c.restore();
    if (surprised) { const p = X.seg(tt, 2.1, 2.5); X.text(c, "!", x + 58, gy - jump - 150, { size: 44 * X.ease.back(p), w: 700, fam: S.f1, color: pal[2], stroke: pal[1], lw: 4 }); }
    // gift box pops
    const bx = W * .72, bp = X.seg(tt, 3.6, 4.0), lid = X.seg(tt, 4.0, 4.8);
    if (bp > 0) {
      const s = X.ease.back(bp); c.save(); c.translate(bx, gy); c.scale(s, s); X.shadow(c, 0, 4, X.a(pal[1], .25), 4);
      c.fillStyle = pal[3]; c.fillRect(-36, -60, 72, 60); c.fillStyle = pal[4]; c.fillRect(-7, -60, 14, 60);
      c.save(); c.translate(-40 + lid * 30, -60 - Math.sin(lid * Math.PI) * 70 - lid * 10); c.rotate(-lid * .55); c.fillStyle = X.shade(pal[3], -.15); c.fillRect(0, -16, 80, 16); c.fillStyle = pal[4]; c.fillRect(33, -16, 14, 16); c.restore();
      X.noShadow(c); c.restore();
      if (lid > 0) for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (X.hash(i) - .5) * 2.2, d = X.ease.out(lid) * (60 + X.hash(i + 3) * 70), px = bx + Math.cos(a) * d, py = gy - 60 + Math.sin(a) * d + lid * lid * 40; c.save(); c.translate(px, py); c.rotate(tt * 6 + i); X.icon(c, "star", 0, 0, 16, [pal[2], pal[4], pal[1]][i % 3], { fill: [pal[2], pal[4], pal[1]][i % 3] }); c.restore(); }
    }
    // bouncing title letters
    const k = tt < 4 ? 0 : 1, s = S.lines[k].j, lt = tt - k * 4, size = fit(c, s, 700, H * .11, W * .86, S.f1);
    X.font(c, 700, size, S.f1); let lx = W / 2 - c.measureText(s).width / 2;
    for (let i = 0; i < s.length; i++) { const ch = s[i], w = c.measureText(ch).width, p = X.seg(lt, .15 + i * .035, .55 + i * .035), y = H * .17 - (1 - X.ease.bounce(p)) * 60 + Math.sin(tt * 6 + i) * 2;
      if (p > 0) X.text(c, ch, lx + w / 2, y, { size, w: 700, fam: S.f1, color: pal[4], stroke: pal[1], lw: 6, alpha: X.clamp(p * 4) }); lx += w; }
    X.text(c, S.lines[k].c, W / 2, H * .17 + size * .8, { size: fit(c, S.lines[k].c, 600, 14, W * .8, S.f2), w: 600, fam: S.f2, color: pal[1], alpha: X.win(lt, .7, 4, .4, .3) });
  });

  /* ================= spotlight (NAR-05) ================= */
  PS.def("spotlight", (c, t, S) => {
    const { W, H, pal } = S, floor = H * .74;
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    c.fillStyle = X.lgrad(c, 0, floor, 0, H, [[0, X.shade(pal[4], .06)], [1, pal[0]]]); c.fillRect(0, floor, W, H - floor);
    c.strokeStyle = "rgba(255,255,255,.05)"; c.lineWidth = 1; for (let i = 1; i < 8; i++) { const y = floor + (H - floor) * (i / 8) ** 1.6; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // spotlight path
    let sx = W * (.5 + .32 * Math.sin(t * 1.4)), sr = H * .2;
    const lock = X.E(t, 2, 2.8, "inOut"); sx = X.lerp(sx, W * .5, lock); sr = X.lerp(sr, H * .23, lock) + X.E(t, 6, 7, "inOut") * H * .1;
    const breathe = Math.sin(t * 1.6) * 1.2, fx = W * .5, ly = floor - H * .25;
    // light on the back wall + cone + pool (behind the figure)
    X.glow(c, sx, floor - H * .22, sr * 1.6, pal[2], .55);
    c.save(); c.globalCompositeOperation = "lighter";
    c.beginPath(); c.moveTo(sx - 14, -10); c.lineTo(sx + 14, -10); c.lineTo(sx + sr * 1.15, floor); c.lineTo(sx - sr * 1.15, floor); c.closePath();
    c.fillStyle = X.lgrad(c, 0, 0, 0, floor, [[0, X.a(pal[2], .3)], [1, X.a(pal[2], .1)]]); c.fill();
    c.fillStyle = X.a(pal[2], .4); c.beginPath(); c.ellipse(sx, floor + 4, sr * 1.15, sr * .22, 0, 0, TAU); c.fill();
    c.restore();
    // figure (silhouette, rim-lit when the light is on it)
    const on = X.clamp(1 - Math.abs(sx - fx) / (sr * 1.4));
    c.save(); c.translate(fx, floor + 4); c.fillStyle = "#0b0a0a";
    const body = () => { c.beginPath(); c.moveTo(-34, 0); c.lineTo(-26, -90); c.bezierCurveTo(-30, -130, -22, -150, 0, -150 - breathe); c.bezierCurveTo(22, -150, 30, -130, 26, -90); c.lineTo(34, 0); c.closePath(); c.moveTo(15, -170 - breathe); c.ellipse(0, -170 - breathe, 15, 19, 0, 0, TAU); };
    body(); c.fill(); c.strokeStyle = X.a(pal[2], .8 * on); c.lineWidth = 1.6; body(); c.stroke();
    c.restore();
    c.fillStyle = "rgba(0,0,0,.55)"; c.beginPath(); c.ellipse(fx, floor + 6, 40, 7, 0, 0, TAU); c.fill();
    // darkness with soft hole
    const g = c.createRadialGradient(sx, ly, sr * .5, sx, ly, sr * 2.8); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.45, "rgba(0,0,0,.35)"); g.addColorStop(1, "rgba(0,0,0,.9)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // dust motes in the beam
    c.save(); c.globalCompositeOperation = "lighter"; c.beginPath(); c.moveTo(sx - 14, -10); c.lineTo(sx + 14, -10); c.lineTo(sx + sr * 1.15, floor); c.lineTo(sx - sr * 1.15, floor); c.closePath(); c.clip();
    for (let i = 0; i < 40; i++) { const px = sx + (X.hash(i) - .5) * sr * 2.2, py = ((X.hash(i + 7) * floor + t * (6 + X.hash(i + 2) * 10)) % floor); c.fillStyle = X.a(pal[1], .35 + .3 * Math.sin(t * 2 + i)); X.circle(c, px + Math.sin(t + i) * 4, py, .7 + X.hash(i + 11) * 1.2); c.fill(); }
    c.restore();
    // title
    const k = t < 4.6 ? 0 : 1, lt = t - (k ? 4.6 : 0), ts = fit(c, S.lines[k].j, 400, H * .1, W * .8, S.f1);
    X.text(c, S.lines[k].j, W / 2, H * .2 + (1 - X.E(lt, .3, 1.3, "out5")) * 16, { size: ts, w: 400, fam: S.f1, color: pal[1], alpha: X.win(lt, k ? .2 : 2.2, k ? 3.4 : 4.6, .8, .4) });
    X.text(c, S.lines[k].c, W / 2, H * .2 + ts * .75, { size: fit(c, S.lines[k].c, 400, 13, W * .7, S.f2), w: 400, fam: S.f2, color: pal[2], ls: 1.5, alpha: X.win(lt, k ? .8 : 2.8, k ? 3.4 : 4.6, .8, .4) });
    // curtains
    const cur = (x0, dir) => { for (let i = 0; i < 6; i++) { const x = x0 + dir * i * 12 + Math.sin(t * .7 + i) * 1.5; c.fillStyle = X.lgrad(c, x, 0, x + dir * 12, 0, [[0, X.shade(pal[3], -.55)], [.5, X.shade(pal[3], -.15)], [1, X.shade(pal[3], -.6)]]); c.fillRect(Math.min(x, x + dir * 12), 0, 12.5, H); } };
    cur(0, 1); cur(W, -1);
    c.fillStyle = X.lgrad(c, 0, 0, 0, H * .12, [[0, X.shade(pal[3], -.6)], [1, X.shade(pal[3], -.3)]]); c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * .06); for (let i = 10; i >= 0; i--) c.quadraticCurveTo(W * (i + .5) / 10, H * .13, W * i / 10, H * .06); c.fill();
    X.grain(c, W, H, .4, t); X.vignette(c, W, H, .5);
  });

  /* ================= wayang (NAR-06) ================= */
  const gununganPath = () => {
    const p = new Path2D();
    p.moveTo(0, -1); p.bezierCurveTo(.12, -.82, .44, -.55, .42, -.3); p.bezierCurveTo(.41, -.12, .36, -.05, .38, 0); p.lineTo(-.38, 0); p.bezierCurveTo(-.36, -.05, -.41, -.12, -.42, -.3); p.bezierCurveTo(-.44, -.55, -.12, -.82, 0, -1); p.closePath();
    // lace: rings of holes following the outline
    for (let r = 0; r < 4; r++) { const sc = .86 - r * .16; for (let k = 0; k < 14 + r * 2; k++) { const u = (k + .5) / (14 + r * 2); const a = -Math.PI * .95 + u * Math.PI * .9 * 2; const x = Math.sin(a * .5) * .36 * sc * 1.1, y = -.32 - Math.cos(a * .5) * .55 * sc + .05; if (y > -.1) continue; p.moveTo(x + .016, y); p.ellipse(x, y, .016, .026, a * .3, 0, TAU); } }
    // tree trunk + branches
    p.moveTo(.018, -.12); p.lineTo(.018, -.7); p.lineTo(-.018, -.7); p.lineTo(-.018, -.12); p.closePath();
    for (let i = 0; i < 5; i++) { const y = -.24 - i * .1, l = .2 - i * .03; for (const s of [-1, 1]) { p.moveTo(s * .03, y); p.quadraticCurveTo(s * l * .7, y - .07, s * l, y - .02); p.quadraticCurveTo(s * l * .6, y - .03, s * .03, y + .02); p.closePath(); } }
    // gate
    p.moveTo(-.1, -.02); p.lineTo(-.1, -.11); p.lineTo(0, -.16); p.lineTo(.1, -.11); p.lineTo(.1, -.02); p.closePath();
    return p;
  };
  const puppetPath = () => {
    const p = new Path2D();
    // legs + flared kain
    p.moveTo(-.04, 0); p.lineTo(-.02, -.18); p.lineTo(-.1, -.2); p.lineTo(-.06, -.44); p.lineTo(.08, -.44); p.lineTo(.13, -.2); p.lineTo(.05, -.18); p.lineTo(.07, 0); p.closePath();
    // torso (slim, leaning), neck, head, crown
    p.moveTo(-.05, -.44); p.bezierCurveTo(-.07, -.58, -.04, -.66, .0, -.7); p.lineTo(.05, -.7); p.bezierCurveTo(.07, -.62, .07, -.52, .07, -.44); p.closePath();
    p.moveTo(0, -.7); p.lineTo(.02, -.78); p.lineTo(.045, -.78); p.lineTo(.04, -.7); p.closePath();
    p.moveTo(.0, -.78); p.bezierCurveTo(-.02, -.86, .04, -.9, .08, -.86); p.lineTo(.12, -.82); p.lineTo(.07, -.8); p.closePath();
    p.moveTo(-.02, -.84); p.lineTo(-.03, -.98); p.lineTo(.02, -.93); p.lineTo(.04, -1.02); p.lineTo(.07, -.9); p.lineTo(.06, -.84); p.closePath();
    // lace holes
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const x = -.045 + j * .045 + (i % 2) * .02, y = -.24 - i * .033; p.moveTo(x + .008, y); p.arc(x, y, .008, 0, TAU); }
    for (let i = 0; i < 4; i++) { const y = -.5 - i * .045; p.moveTo(.02 + .006, y); p.arc(.02, y, .006, 0, TAU); }
    p.moveTo(.02, -.9); p.arc(.015, -.9, .01, 0, TAU);
    return p;
  };
  PS.def("wayang", (c, t, S) => {
    const { W, H, pal } = S, top = H * .1, bot = H * .82, fl = .85 + .1 * X.noise(t * 6) + .05 * Math.sin(t * 23);
    S._gp = S._gp || gununganPath(); S._pp = S._pp || puppetPath();
    // kelir
    const lx = W * .5 + X.noise(t * 3) * 6;
    const g = c.createRadialGradient(lx, H * .42, 10, lx, H * .42, W * .7); g.addColorStop(0, X.mix(pal[3], "#ffffff", .25 * fl)); g.addColorStop(.35, pal[3]); g.addColorStop(.7, pal[0]); g.addColorStop(1, X.shade(pal[0], -.45));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const fig = (path, x, y, h, rot, sx, alpha, blur) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(h * sx, h); c.globalAlpha = alpha; if (blur) { c.shadowColor = X.a(pal[1], .6); c.shadowBlur = blur; } c.fillStyle = pal[1]; c.fill(path, "evenodd"); c.restore(); };
    const stick = (x1, y1, x2, y2) => { c.strokeStyle = X.a(pal[1], .85); c.lineWidth = 1.6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    const arm = (sx0, sy0, h, a, dir) => { c.save(); c.translate(sx0, sy0); c.rotate(a); c.strokeStyle = pal[1]; c.lineWidth = h * .02; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(dir * h * .06, h * .2); c.lineTo(dir * h * .16, h * .3); c.stroke(); c.restore(); return [sx0 + Math.cos(a + Math.PI / 2) * h * .3 + dir * h * .1, sy0 + h * .3]; };
    // gunungan: twirl at centre, then glide to the right, return near the end
    const gx = X.lerp(W * .5, W * .88, X.E(t, 2.0, 3.0, "inOut")) + X.E(t, 7.1, 7.9, "inOut") * (W * .5 - W * .88);
    const twirl = t < 2.2 ? Math.cos(t * 3.2) : Math.cos(X.E(t, 2.0, 3.0) * Math.PI) * (t > 7 ? Math.cos(X.seg(t, 7.1, 7.9) * Math.PI * 2) : 1);
    const gh = H * .62 * (t > 2.0 && t < 7.1 ? .9 : 1), gsx = Math.max(.08, Math.abs(twirl));
    const sway = Math.sin(t * 1.7) * .04;
    fig(S._gp, gx + 10 * fl, bot + 2, gh * 1.03, sway, gsx, .25, 14);
    fig(S._gp, gx, bot, gh, sway, gsx, 1, 3);
    stick(gx, bot - gh * .05, gx, H);
    // puppets
    const pa = X.E(t, 2.4, 3.4, "out"), ph = H * .58;
    if (pa > 0) {
      const px = X.lerp(-W * .1, W * .3, pa), py = bot + Math.sin(t * 2) * 2, rk = Math.sin(t * 1.3) * .03;
      fig(S._pp, px + 8 * fl, py, ph * 1.04, rk, 1, .22, 12); fig(S._pp, px, py, ph, rk, 1, 1, 2);
      const hd = arm(px + ph * .06, py - ph * .66, ph, -.4 + Math.sin(t * 2.4) * .55, 1); stick(hd[0], hd[1], hd[0] + 20, H);
      arm(px - ph * .02, py - ph * .66, ph, .25, -1); stick(px, py - ph * .1, px, H);
    }
    const pb = X.E(t, 4.4, 5.4, "out");
    if (pb > 0) {
      const px = X.lerp(W * 1.1, W * .66, pb) - X.E(t, 7.1, 7.9, "inOut") * W * .0, py = bot + Math.sin(t * 2 + 1) * 2;
      fig(S._pp, px + 8 * fl, py, ph * .98, 0, -1, .22, 12); fig(S._pp, px, py, ph * .95, Math.sin(t * 1.1) * .03, -1, 1, 2);
      const hd = arm(px - ph * .06, py - ph * .63, ph * .95, .4 - Math.sin(t * 2) * .4, -1); stick(hd[0], hd[1], hd[0] - 20, H); stick(px, py - ph * .1, px, H);
    }
    // top & bottom frame (plangkan + gedebog)
    c.fillStyle = pal[4]; c.fillRect(0, 0, W, top); c.fillStyle = pal[2]; c.fillRect(0, top - 5, W, 5);
    for (let x = 0; x < W; x += 22) { c.fillStyle = X.a(pal[3], .5); c.beginPath(); c.moveTo(x, top); c.lineTo(x + 11, top + 7); c.lineTo(x + 22, top); c.fill(); }
    c.fillStyle = X.lgrad(c, 0, bot, 0, H, [[0, X.mix(pal[4], "#5a4a20", .3)], [1, pal[4]]]); c.fillRect(0, bot, W, H - bot);
    c.strokeStyle = "rgba(0,0,0,.25)"; for (let x = 0; x < W; x += 9) { c.beginPath(); c.moveTo(x, bot + 4); c.lineTo(x + 3, H); c.stroke(); }
    // title
    const k = t < 5 ? 0 : 1, lt = t - (k ? 5 : 0), a = X.win(lt, k ? .2 : 3.0, k ? 3 : 5, .6, .4);
    X.text(c, S.lines[k].j, W / 2, top / 2 + 1, { size: fit(c, S.lines[k].j, 700, top * .5, W * .7, S.f1), w: 700, fam: S.f1, color: pal[3], ls: 2, alpha: a });
    X.text(c, S.lines[k].c, W / 2, bot + (H - bot) * .5, { size: fit(c, S.lines[k].c, 400, 13, W * .8, S.f2), w: 400, fam: S.f2, color: X.a(pal[3], .9), alpha: a });
    // embers
    c.save(); c.globalCompositeOperation = "lighter"; for (let i = 0; i < 16; i++) { const p = (t * .12 + X.hash(i)) % 1, x = W * X.hash(i + 3) + Math.sin(t * 2 + i) * 8, y = bot - p * (bot - top); c.fillStyle = X.a(pal[3], .5 * (1 - p)); X.circle(c, x, y, 1.2); c.fill(); } c.restore();
    X.vignette(c, W, H, .5, "40,10,0"); X.grain(c, W, H, .25, t);
  });

  /* ================= comic (NAR-07) ================= */
  PS.def("comic", (c, t, S) => {
    const { W, H, pal } = S, m = 14, gt = 10, ink = pal[1];
    const P1 = [m, m, W / 2 - m - gt / 2 + 8, H * .52], P2 = [W / 2 + gt / 2 + 8, m, W / 2 - m - gt / 2 - 8, H * .52], P3 = [m, m + H * .52 + gt, W - m * 2, H - m * 2 - H * .52 - gt];
    const ht = (key, r, col, fn) => cache(S, key, r[2], r[3], (g, w, h) => { g.fillStyle = pal[0]; g.fillRect(0, 0, w, h); X.halftone(g, 0, 0, w, h, col, 7, fn); });
    const h1 = ht("h1", P1, X.a(pal[2], .9), (x, y) => .25 + y / P1[3] * .6), h2 = ht("h2", P2, X.a(pal[4], .8), (x, y) => .2 + (1 - x / P2[2]) * .5), h3 = ht("h3", P3, X.a(pal[3], .6), (x, y) => .15 + Math.hypot(x - P3[2] * .6, y - P3[3] * .5) / P3[2] * .9);
    const shake = t > 3.6 && t < 4.1 ? (X.hash(Math.floor(t * 30)) - .5) * 8 : 0;
    const slide = X.E(t, 6.4, 7.3, "inOut");
    c.fillStyle = X.shade(pal[0], -.04); c.fillRect(0, 0, W, H);
    c.save(); c.translate(-slide * W + shake, shake * .6);
    const zoom = 1 + X.E(t, 4.8, 6.4, "sine") * .18; c.translate(W * .62, P3[1] + P3[3] / 2); c.scale(zoom, zoom); c.translate(-W * .62, -(P3[1] + P3[3] / 2));
    const panel = (r, img, t0, dir, body) => {
      const p = X.seg(t, t0, t0 + .55); if (p <= 0) return; const e = X.ease.back(p);
      c.save(); c.translate(r[0] + r[2] / 2 + dir[0] * (1 - e) * W * .6, r[1] + r[3] / 2 + dir[1] * (1 - e) * H * .6); c.rotate((1 - e) * dir[0] * .15); c.translate(-r[2] / 2, -r[3] / 2);
      c.save(); c.beginPath(); c.rect(0, 0, r[2], r[3]); c.clip(); c.drawImage(img, 0, 0, r[2], r[3]); body(r[2], r[3]); c.restore();
      c.strokeStyle = ink; c.lineWidth = 3.5; c.strokeRect(0, 0, r[2], r[3]); c.restore();
    };
    const balloon = (x, y, w, h, tx, ty, text, p, size) => { if (p <= 0) return; const s = X.ease.elastic(X.clamp(p)); c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = "#fff"; c.strokeStyle = ink; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); c.moveTo(-w * .12, h * .4); c.lineTo(tx, ty); c.lineTo(w * .08, h * .45); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.ellipse(0, 0, w / 2 - 1.5, h / 2 - 1.5, 0, 0, TAU); c.fill();
      c.textAlign = "center"; c.textBaseline = "top"; X.font(c, 700, size, S.f2); c.fillStyle = ink; const ls = X.wrap(c, text, w * .72); ls.forEach((l, i) => c.fillText(l, 0, -ls.length * size * .58 + i * size * 1.12)); c.restore(); };
    panel(P1, h1, .15, [-1, 0], (w, h) => {
      const sl = (t * 60) % 30; c.strokeStyle = X.a(ink, .3); c.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const y = 20 + i * h / 9; c.beginPath(); c.moveTo(w - ((sl + i * 17) % w), y); c.lineTo(w - ((sl + i * 17) % w) + 40, y); c.stroke(); }
      c.fillStyle = ink; c.beginPath(); c.ellipse(w * .45, h * .62, w * .17, h * .24, 0, 0, TAU); c.fill(); c.fillRect(w * .26, h * .82, w * .38, h * .3);
      c.fillStyle = "#fff"; X.circle(c, w * .5, h * .58, 7); c.fill(); c.fillStyle = ink; X.circle(c, w * .51 + Math.sin(t * 2) * 2, h * .58, 3); c.fill();
      c.fillStyle = pal[2]; c.fillRect(0, 0, w * .58, 26); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(0, 0, w * .58, 26); X.text(c, "SEMENTARA ITU…", 10, 13, { size: 11, w: 700, fam: S.f2, color: ink, align: "left" });
    });
    panel(P2, h2, 1.3, [1, 0], (w, h) => {
      c.fillStyle = ink; c.beginPath(); c.ellipse(w * .25, h * .9, w * .2, h * .3, 0, 0, TAU); c.fill();
      balloon(w * .58, h * .4, w * .72, h * .55, -w * .3, h * .4, S.lines[0].j, X.seg(t, 1.8, 2.5), Math.min(15, h * .1));
    });
    panel(P3, h3, 2.6, [0, 1], (w, h) => {
      const bp = X.seg(t, 3.55, 3.95), cx = w * .62, cy = h * .5;
      if (bp > 0) { c.strokeStyle = X.a(ink, .5); c.lineWidth = 2; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; c.beginPath(); c.moveTo(cx + Math.cos(a) * h * .45, cy + Math.sin(a) * h * .45); c.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w); c.stroke(); } }
      c.fillStyle = pal[4]; c.fillRect(10, 10, w * .36, 44); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(10, 10, w * .36, 44);
      block(c, S.lines[1].j, 18, 16, w * .36 - 16, 13, 700, S.f2, ink, 1.15);
      if (bp > 0) { const s = X.ease.elastic(bp) * (1 + .04 * Math.sin(t * 20)); c.save(); c.translate(cx, cy); c.rotate(-.12 + (1 - bp) * .6); c.scale(s, s);
        c.beginPath(); for (let i = 0; i < 24; i++) { const r = (i % 2 ? .5 : 1) * h * .42 * (1 + (X.hash(i) - .5) * .25), a = i / 24 * TAU; c[i ? "lineTo" : "moveTo"](Math.cos(a) * r * 1.5, Math.sin(a) * r); } c.closePath();
        c.fillStyle = pal[2]; c.fill(); c.strokeStyle = pal[3]; c.lineWidth = 5; c.stroke(); c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
        X.text(c, "BRAK!", 0, 2, { size: h * .3, w: 400, fam: S.f1, color: pal[3], stroke: ink, lw: 5 }); c.restore(); }
    });
    // page 2: splash
    c.save(); c.translate(W, 0); const r = [m, m, W - 2 * m, H - 2 * m];
    c.fillStyle = pal[3]; c.fillRect(r[0], r[1], r[2], r[3]); c.save(); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip(); c.translate(W / 2, H / 2); c.rotate(t * .3); c.fillStyle = X.a(pal[2], .6); for (let i = 0; i < 16; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, W, i * TAU / 16, i * TAU / 16 + TAU / 32); c.fill(); } c.restore();
    c.strokeStyle = ink; c.lineWidth = 3.5; c.strokeRect(r[0], r[1], r[2], r[3]);
    X.text(c, S.lines[2].j, W / 2, H * .45, { size: fit(c, S.lines[2].j, 400, H * .17, W * .82, S.f1), w: 400, fam: S.f1, color: "#fff", stroke: ink, lw: 7 });
    X.text(c, S.lines[2].c, W / 2, H * .64, { size: fit(c, S.lines[2].c, 700, 15, W * .7, S.f2), w: 700, fam: S.f2, color: ink });
    c.restore();
    c.restore();
  });

  /* ================= rotoscope (NAR-08) ================= */
  PS.def("rotoscope", (c, t, S) => {
    const { W, H, pal } = S, gy = H * .78, sz = H * .5, st = X.stepT(t, 12);
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    // accent sun drawn on
    c.strokeStyle = pal[3]; c.lineWidth = 1.4; const sp = X.E(t, .2, 1.4, "inOut"); c.beginPath(); c.arc(W * .8, H * .28, H * .1, -1.6, -1.6 + TAU * sp); c.stroke();
    c.strokeStyle = X.a(pal[1], .7); c.lineWidth = 1; c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
    for (let x = -((st * 160) % 60); x < W; x += 60) { c.beginPath(); c.moveTo(x, gy + 8); c.lineTo(x + 18, gy + 8); c.stroke(); }
    const leapP = X.seg(t, 4.6, 5.8), leap = Math.sin(leapP * Math.PI);
    const pose = (ph) => {
      const L = sz * .27, bob = -Math.abs(Math.cos(ph)) * sz * .04 - leap * sz * .35;
      const hip = [0, -sz * .55 + bob], lean = .18 + leap * .2;
      const sh = [hip[0] + Math.sin(lean) * sz * .3, hip[1] - Math.cos(lean) * sz * .3];
      const head = [sh[0] + sz * .04, sh[1] - sz * .1];
      const leg = (p) => { const th = Math.sin(p) * .75 * (1 - leap) + leap * (p === ph ? 1.1 : -1.0), bend = Math.max(0, -Math.cos(p)) * 1.3 * (1 - leap) + leap * .6; const k = [hip[0] + Math.sin(th) * L, hip[1] + Math.cos(th) * L]; const sa = th - bend; return [k, [k[0] + Math.sin(sa) * L, k[1] + Math.cos(sa) * L]]; };
      const armf = (p) => { const a = -Math.sin(p) * .8 * (1 - leap) + leap * (p === ph ? -2.4 : 2.2); const e = [sh[0] + Math.sin(a) * L * .8, sh[1] + Math.cos(a) * L * .8]; const fa = a + 1.2 * (1 - leap); return [e, [e[0] + Math.sin(fa) * L * .7, e[1] + Math.cos(fa) * L * .7]]; };
      return { hip, sh, head, l1: leg(ph), l2: leg(ph + Math.PI), a1: armf(ph), a2: armf(ph + Math.PI) };
    };
    const figure = (ph, x, col, lw, alpha, seed) => {
      const q = pose(ph), j = (i) => (X.hash(Math.floor(st * 12) * 31 + i + seed) - .5) * 2.2;
      c.save(); c.translate(x, gy); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round"; c.globalAlpha = alpha;
      const seg = (a, b, i) => { c.beginPath(); c.moveTo(a[0] + j(i), a[1] + j(i + 1)); c.quadraticCurveTo((a[0] + b[0]) / 2 + j(i + 2) * 1.5, (a[1] + b[1]) / 2 + j(i + 3) * 1.5, b[0] + j(i + 4), b[1] + j(i + 5)); c.stroke(); };
      for (let pass = 0; pass < 2; pass++) { c.lineWidth = pass ? lw * .5 : lw; c.globalAlpha = alpha * (pass ? .5 : 1); const o = pass * 20;
        seg(q.hip, q.sh, 1 + o); seg(q.hip, q.l1[0], 7 + o); seg(q.l1[0], q.l1[1], 13 + o); seg(q.hip, q.l2[0], 19 + o); seg(q.l2[0], q.l2[1], 25 + o);
        seg(q.sh, q.a1[0], 31 + o); seg(q.a1[0], q.a1[1], 37 + o); seg(q.sh, q.a2[0], 43 + o); seg(q.a2[0], q.a2[1], 49 + o);
        c.beginPath(); c.arc(q.head[0] + j(55 + o), q.head[1] + j(56 + o), sz * .055, .3, TAU - .2); c.stroke(); }
      c.restore();
    };
    const ph = st * TAU * 1.5, fx = W * .42;
    for (let i = 4; i >= 1; i--) figure(ph - i * .32, fx - i * 20, pal[2], 1.6, .32 - i * .06, i * 7);
    figure(ph, fx, pal[1], 2, 1, 0);
    // type
    const k = t < 4 ? 0 : 1, lt = t - k * 4, ap = X.win(lt, .3, 4, .6, .4);
    X.text(c, S.lines[k].j, 30, H * .16, { size: fit(c, S.lines[k].j, 600, H * .075, W * .5, S.f1), w: 600, fam: S.f1, color: pal[1], align: "left", alpha: ap });
    c.fillStyle = pal[2]; c.fillRect(30, H * .16 + H * .05, W * .18 * X.E(lt, .6, 1.4, "out5") * ap, 1.5);
    X.text(c, S.lines[k].c, 30, H * .16 + H * .1, { size: fit(c, S.lines[k].c, 400, 12, W * .5, S.f2), w: 400, fam: S.f2, color: X.a(pal[1], .65), align: "left", alpha: X.win(lt, .8, 4, .6, .4) });
    X.text(c, "FR " + String(Math.floor(st * 12) % 96).padStart(3, "0"), W - 24, H - 22, { size: 9, w: 500, fam: "IBM Plex Mono", color: X.a(pal[1], .45), align: "right" });
    X.grain(c, W, H, .15, t);
  });

  /* ================= journal (NAR-09, portrait) ================= */
  PS.def("journal", (c, t, S) => {
    const { W, H, pal } = S, hand = S.f1;
    c.fillStyle = X.shade(pal[0], -.25); c.fillRect(0, 0, W, H);
    c.save(); const z = 1.02 + t * .006; c.translate(W / 2 + X.wob(1, t, 3, .9), H / 2 + X.wob(2, t, 3, .8)); c.rotate(X.wob(3, t, .012, .7)); c.scale(z, z); c.translate(-W / 2, -H / 2);
    X.paper(c, W, H, pal[0], .4);
    c.strokeStyle = "rgba(91,139,216,.22)"; c.lineWidth = 1; for (let y = 70; y < H; y += 28) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = X.a(pal[2], .45); c.beginPath(); c.moveTo(38, 0); c.lineTo(38, H); c.stroke();
    // coffee ring
    c.strokeStyle = "rgba(120,80,40,.14)"; c.lineWidth = 5; X.circle(c, W * .82, H * .1, 30); c.stroke();
    // handwriting helper
    let head = null;
    const write = (s, x, y, size, w, maxW, p0, p1, col) => {
      X.font(c, w, size, hand); const ls = X.wrap(c, s, maxW), lens = ls.map((l) => c.measureText(l).width), tot = lens.reduce((a, b) => a + b, 0); let done = tot * X.E(t, p0, p1, "lin");
      ls.forEach((l, i) => { const yy = y + i * size * 1.05; if (done <= 0) return; const ww = Math.min(lens[i], done); c.save(); c.beginPath(); c.rect(x - 4, yy - size, ww + 4, size * 1.5); c.clip(); X.text(c, l, x, yy, { size, w, fam: hand, color: col, align: "left" }); c.restore(); if (done < lens[i] && t > p0 && t < p1) head = [x + ww, yy]; done -= lens[i]; });
      return ls.length;
    };
    X.text(c, "Senin, 3 Nov", 50, 44, { size: 11, w: 600, fam: S.f2, color: X.a(pal[1], .55), align: "left", ls: 1 });
    const n1 = write(S.lines[0].j, 50, 98, 34, 700, W - 80, .3, 1.6, pal[1]);
    write(S.lines[0].c, 50, 98 + n1 * 36 + 8, 22, 400, W - 80, 1.6, 2.7, X.a(pal[1], .8));
    // star doodle
    const dp = X.E(t, 1.7, 2.3, "inOut"); if (dp > 0) { c.strokeStyle = pal[2]; c.lineWidth = 2; c.lineCap = "round"; const pts = []; for (let i = 0; i <= 10; i++) { const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5; pts.push([W - 40 + Math.cos(a) * r, 70 + Math.sin(a) * r]); } X.poly(c, pts, dp); c.stroke(); }
    // polaroid with tape
    const pp = X.seg(t, 2.8, 3.6);
    if (pp > 0) {
      const s = 1.3 - .3 * X.ease.out5(pp), rot = X.lerp(-.25, .07, X.spring(pp, 8, 5)), px = W * .52, py = H * .55;
      c.save(); c.translate(px, py); c.rotate(rot); c.scale(s, s); c.globalAlpha = X.clamp(pp * 3);
      X.shadow(c, 16, 8, "rgba(0,0,0,.25)"); c.fillStyle = pal[4]; c.fillRect(-100, -100, 200, 222); X.noShadow(c);
      c.fillStyle = X.lgrad(c, 0, -88, 0, 90, [[0, pal[2]], [.6, X.mix(pal[2], pal[0], .6)], [.61, pal[3]], [1, X.shade(pal[3], -.3)]]); c.fillRect(-88, -88, 176, 176);
      c.fillStyle = X.a("#fff3d0", .9); X.circle(c, 30, -10 + Math.sin(t) * 2, 18); c.fill();
      c.fillStyle = X.shade(pal[3], -.45); c.beginPath(); c.moveTo(-88, 30); c.lineTo(-40, -6); c.lineTo(0, 22); c.lineTo(40, 0); c.lineTo(88, 32); c.lineTo(88, 88); c.lineTo(-88, 88); c.fill();
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const y = 50 + i * 9, o = (t * 20 + i * 13) % 40; c.beginPath(); c.moveTo(-70 + o, y); c.lineTo(-50 + o, y); c.stroke(); }
      X.text(c, "pantai, sore", 0, 106, { size: 17, w: 400, fam: hand, color: pal[1] });
      c.fillStyle = X.a(pal[3], .5); c.save(); c.translate(-80, -100); c.rotate(-.6); c.fillRect(-26, -9, 52, 18); c.restore(); c.save(); c.translate(80, -100); c.rotate(.6); c.fillRect(-26, -9, 52, 18); c.restore();
      c.restore();
    }
    // arrow + note
    const ap = X.E(t, 3.9, 4.5, "inOut"); if (ap > 0) { c.strokeStyle = pal[2]; c.lineWidth = 2; c.lineCap = "round"; const pts = quadPts([W * .16, H * .43], [W * .12, H * .5], [W * .26, H * .52], 16); X.poly(c, pts, ap); c.stroke(); if (ap > .95) { c.beginPath(); c.moveTo(W * .26, H * .52); c.lineTo(W * .22, H * .5); c.moveTo(W * .26, H * .52); c.lineTo(W * .225, H * .54); c.stroke(); }
      X.text(c, "hari ini!", W * .1, H * .41, { size: 20, w: 700, fam: hand, color: pal[2], align: "left", alpha: X.seg(t, 4.2, 4.6) }); }
    // entry 2
    write(S.lines[1].j, 50, H * .8, 28, 700, W - 80, 4.8, 6.4, pal[1]);
    write(S.lines[1].c, 50, H * .8 + 62, 20, 400, W - 80, 6.4, 7.4, X.a(pal[1], .8));
    // heart doodle
    const hp = X.E(t, 6.6, 7.3, "inOut"); if (hp > 0) { c.save(); c.translate(W - 46, H * .78); c.strokeStyle = pal[2]; c.lineWidth = 2.2; c.setLineDash([90 * hp, 200]); c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-18, 0, -12, -14, 0, -6); c.bezierCurveTo(12, -14, 18, 0, 0, 12); c.stroke(); c.restore(); }
    // pen
    if (head) { c.save(); c.translate(head[0] + 2, head[1] + 4); c.rotate(-.7); c.fillStyle = "#222"; c.fillRect(0, -3, 70, 6); c.fillStyle = pal[3]; c.fillRect(20, -3.5, 46, 7); c.fillStyle = "#222"; c.beginPath(); c.moveTo(0, -3); c.lineTo(-8, 0); c.lineTo(0, 3); c.fill(); c.restore(); }
    c.restore();
    X.vignette(c, W, H, .3);
  });

  /* ================= cosmic (NAR-10) ================= */
  PS.def("cosmic", (c, t, S) => {
    const { W, H, pal } = S, cx = W / 2, cy = H / 2, ang = -.08 + t / S.L * .16, z = 1 + X.E(t, 0, 8, "sine") * .18;
    if (!S._st) S._st = [0, 1, 2].map((l) => Array.from({ length: 90 - l * 25 }, (_, i) => [X.hash(i * 3 + l * 100) * 2 - 1, X.hash(i * 7 + l * 100 + 1) * 2 - 1, X.hash(i + l * 50) * 6.28, .5 + l * .5 + X.hash(i + 9) * .6]));
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    // nebula
    c.save(); c.translate(cx, cy); c.rotate(ang * .5); c.globalCompositeOperation = "lighter";
    X.glow(c, -W * .25, -H * .1, W * .5, pal[2], .3); X.glow(c, W * .3, H * .2, W * .45, pal[3], .14); X.glow(c, W * .05, -H * .3, W * .35, pal[2], .18);
    c.restore();
    // stars (3 parallax layers)
    S._st.forEach((layer, l) => { c.save(); c.translate(cx, cy); c.rotate(ang * (1 + l * .6)); c.scale(1 + (z - 1) * l * .6, 1 + (z - 1) * l * .6);
      layer.forEach(([x, y, ph, r]) => { const a = .35 + .65 * (.5 + .5 * Math.sin(t * 2.5 + ph)); c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(x * W * .8, y * H * .8, r, r); }); c.restore(); });
    // shooting star
    const ss = X.seg(t, 5, 5.7); if (ss > 0 && ss < 1) { const x = W * (.9 - ss * .6), y = H * (.08 + ss * .25); c.strokeStyle = X.lgrad(c, x, y, x + 70, y - 28, [[0, "rgba(255,255,255,.9)"], [1, "rgba(255,255,255,0)"]]); c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 70, y - 28); c.stroke(); }
    c.save(); c.translate(cx, cy); c.rotate(ang * 1.4); c.scale(z, z); c.translate(-cx, -cy);
    // ringed planet
    const px = W * .26, py = H * .36 + Math.sin(t * .7) * 3, pr = H * .15;
    const ring = (front) => { c.save(); c.translate(px, py); c.rotate(-.35); c.strokeStyle = X.a(pal[3], .55); c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, pr * 1.8, pr * .42, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); c.stroke(); c.strokeStyle = X.a(pal[1], .35); c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, pr * 2.05, pr * .5, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); c.stroke(); c.restore(); };
    ring(false);
    const pg = c.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr); pg.addColorStop(0, X.mix(pal[2], "#ffffff", .35)); pg.addColorStop(.7, pal[2]); pg.addColorStop(1, X.shade(pal[4], -.2)); c.fillStyle = pg; X.circle(c, px, py, pr); c.fill();
    c.save(); X.circle(c, px, py, pr); c.clip(); c.strokeStyle = X.a(pal[4], .35); c.lineWidth = 4; for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(px, py + i * pr * .26, pr * 1.2, pr * .08, -.2, 0, TAU); c.stroke(); } c.restore();
    ring(true);
    // floating island + door + stairs
    const ix = W * .67, iy = H * .5 + Math.sin(t * 1.1) * 5;
    for (let i = 0; i < 5; i++) { const sx = ix + 40 + i * 28, sy = iy + 30 + i * 22 + Math.sin(t * 1.6 + i * .9) * 4; c.fillStyle = X.mix(pal[4], pal[1], .25); c.fillRect(sx - 14, sy, 28, 6); c.fillStyle = X.shade(pal[4], -.2); c.fillRect(sx - 14, sy + 6, 28, 4); }
    c.fillStyle = pal[4]; c.beginPath(); c.moveTo(ix - 60, iy); c.lineTo(ix + 60, iy); c.lineTo(ix + 34, iy + 34); c.lineTo(ix + 6, iy + 70); c.lineTo(ix - 28, iy + 36); c.closePath(); c.fill();
    c.fillStyle = X.mix(pal[4], pal[2], .5); c.fillRect(ix - 60, iy - 4, 120, 6);
    const dw = 34, dh = 62, op = .35 + .25 * Math.sin(t * .8);
    c.save(); c.globalCompositeOperation = "lighter"; X.glow(c, ix, iy - dh / 2, 120, pal[3], .35 + .1 * Math.sin(t * 3)); c.fillStyle = X.a(pal[3], .12); c.beginPath(); c.moveTo(ix - dw / 2, iy); c.lineTo(ix + dw / 2, iy); c.lineTo(ix + 90, iy + 120); c.lineTo(ix - 60, iy + 120); c.fill(); c.restore();
    c.fillStyle = X.mix(pal[3], "#ffffff", .5); c.fillRect(ix - dw / 2, iy - dh, dw, dh);
    c.fillStyle = pal[1]; c.fillRect(ix - dw / 2 - 4, iy - dh - 4, dw + 8, 4); c.fillRect(ix - dw / 2 - 4, iy - dh, 4, dh); c.fillRect(ix + dw / 2, iy - dh, 4, dh);
    c.fillStyle = X.shade(pal[4], .1); c.beginPath(); c.moveTo(ix - dw / 2, iy - dh); c.lineTo(ix - dw / 2 - dw * op, iy - dh + 6); c.lineTo(ix - dw / 2 - dw * op, iy - 4); c.lineTo(ix - dw / 2, iy); c.fill();
    c.restore();
    // text
    c.fillStyle = X.lgrad(c, 0, H * .62, 0, H, [[0, X.a(pal[0], 0)], [1, X.a(pal[0], .85)]]); c.fillRect(0, H * .62, W, H * .38);
    const k = t < 4 ? 0 : 1, lt = t - k * 4, a = X.win(lt, .4, 4, .8, .4), ls = 10 * (1 - X.E(lt, .4, 2.2, "out5")) + 2;
    X.text(c, S.lines[k].j.toUpperCase(), W / 2, H * .82, { size: fit(c, S.lines[k].j.toUpperCase(), 700, H * .065, W * .72, S.f1), w: 700, fam: S.f1, color: pal[1], ls, alpha: a });
    X.text(c, S.lines[k].c, W / 2, H * .9, { size: fit(c, S.lines[k].c, 400, 12, W * .7, S.f2), w: 400, fam: S.f2, color: X.a(pal[1], .7), alpha: X.win(lt, 1, 4, .6, .4) });
    X.vignette(c, W, H, .5);
  });
})();
