/* paket-scenes-c.js — kinetic typography + data scenes for the Paket Motion previews.
   lyric, script, swiss, retroCut, neon, extrude, glitch, manifesto, variable, halftone,
   barRace, scrolly (data|narr), bigNumber, pictograph, trendLine (note|biz), qaData, heatmap. */
(function () {
  const PS = window.PaketScenes; if (!PS) return;
  const X = PS.X, TAU = Math.PI * 2;
  const fit = (c, s, w, fam, size, maxW) => { const m = X.measure(c, s, w, size, fam); return m > maxW ? size * maxW / m : size; };
  const fill = (c, S, col) => { c.fillStyle = col || S.pal[0]; c.fillRect(0, 0, S.W, S.H); };
  const phrase = (S) => S.lines.map((l) => l.j).join(" ");
  const off = (S, key, w, h, draw) => {           // cached 2x offscreen layer
    if (S[key]) return S[key]; const cv = document.createElement("canvas"); cv.width = w * 2; cv.height = h * 2;
    const g = cv.getContext("2d"); g.scale(2, 2); draw(g, w, h); S[key] = cv; return cv;
  };
  const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  /* ------------------------------------------------------------ lyric (KIN-01) */
  PS.def("lyric", (c, t, S) => {
    const { W, H, pal } = S, words = phrase(S).split(/\s+/).filter(Boolean);
    const half = Math.ceil(words.length / 2), A = words.slice(0, half), B = words.slice(half);
    const bpm = 120, pulse = X.beat(t, bpm, 5);
    fill(c, S);
    const g = c.createRadialGradient(W / 2, H * .55, 10, W / 2, H * .55, W * .75);
    g.addColorStop(0, X.a(pal[2], .16 + .2 * pulse)); g.addColorStop(1, X.a(pal[0], 0)); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) { const x = (X.hash(i) * W + t * 14 * (.4 + X.hash(i + 3))) % (W + 60) - 30, y = H * (.1 + .75 * X.hash(i + 9)) - Math.sin(t * .8 + i) * 10; X.glow(c, x, y, 10 + X.hash(i + 5) * 30, i % 2 ? pal[3] : pal[2], .08 + .1 * pulse); }
    const nb = 48; for (let i = 0; i < nb; i++) { const h = (4 + 30 * Math.abs(X.noise(i * .55 + t * 3.2))) * (.5 + .7 * pulse); c.fillStyle = X.a(i % 6 ? pal[2] : pal[3], .32); X.rr(c, i * W / nb + 2, H - h - 12, W / nb - 4, h, 2); c.fill(); }
    const grp = t < 4 ? 0 : 1, lt = t - grp * 4, cur = grp ? B : A, prev = grp ? A : B;
    const per = Math.min(.5, 3.0 / cur.length);
    // previous line (dim, above)
    const pin = X.E(lt, 0, .5, "out5"), pl = prev.join(" ");
    const ps = fit(c, pl, 800, S.f1, 62, W * .86) * X.lerp(1, .5, pin);
    X.text(c, pl, W / 2, X.lerp(H * .52, H * .3, pin), { size: ps, fam: S.f1, w: 800, color: pal[1], alpha: X.lerp(.9, .28, pin) });
    // current line, word-by-word
    const size = fit(c, cur.join(" "), 800, S.f1, 64, W * .86); X.font(c, 800, size, S.f1);
    const sp = c.measureText(" ").width, ws = cur.map((w) => c.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (cur.length - 1);
    let x = W / 2 - tot / 2; const y0 = H * .52 + (1 - X.E(lt, 0, .45, "out5")) * 40;
    cur.forEach((w, i) => {
      const ts = .25 + i * per, cx = x + ws[i] / 2, act = lt >= ts && lt < ts + per, past = lt >= ts + per;
      let col = pal[1], al = .12, sc = 1, dy = 0;
      if (act) { const k = X.seg(lt, ts, ts + per * .9); col = pal[2]; al = 1; sc = 1 + .28 * (1 - X.spring(k * 1.4, 9, 5)); dy = -Math.sin(Math.min(1, k * 2) * Math.PI) * 10; }
      else if (past) { al = .95; }
      c.save(); c.translate(cx, y0 + dy); c.scale(sc, sc);
      if (act) { c.shadowColor = pal[2]; c.shadowBlur = 22; }
      X.text(c, w, 0, 0, { size, fam: S.f1, w: 800, color: col, alpha: al });
      c.restore();
      if (act) { const k = X.E(lt, ts, ts + per * .8, "out"); c.fillStyle = pal[3]; X.rr(c, x, y0 + size * .5, ws[i] * k, 4, 2); c.fill(); }
      x += ws[i] + sp;
    });
    X.text(c, "♪ 120 BPM", 22, 22, { size: 11, fam: S.f2, w: 600, color: pal[1], align: "left", alpha: .55 });
    const tc = "00:" + String(Math.floor(12 + t)).padStart(2, "0"); X.text(c, tc, W - 22, 22, { size: 11, fam: S.f2, w: 600, color: pal[1], align: "right", alpha: .55 });
    X.circle(c, W - 70, 22, 3 + 2 * pulse); c.fillStyle = pal[3]; c.fill();
  });

  /* ------------------------------------------------------------ script (KIN-02) */
  PS.def("script", (c, t, S) => {
    const { W, H, pal } = S;
    c.save(); c.translate(W / 2, H / 2); c.scale(1 + t * .005, 1 + t * .005); c.translate(-W / 2, -H / 2);
    X.paper(c, W, H, pal[0], .3);
    // pressed botanicals in corners
    for (let i = 0; i < 2; i++) { c.save(); c.translate(i ? W - 46 : 46, i ? H - 40 : 40); c.rotate(i ? 2.6 : -.5 + Math.sin(t) * .03); c.globalAlpha = .5; X.icon(c, "leaf", 0, 0, 46, pal[3], { lw: 1.4 }); c.restore(); }
    const l1 = S.lines[0].j, l2 = S.lines[1].j, cx = W / 2;
    const s1 = fit(c, l1, 700, S.f1, 96, W * .78), s2 = fit(c, l2, 700, S.f1, 82, W * .66);
    const y1 = H * .4, y2 = H * .64;
    let pen = null;
    const write = (s, y, size, p, col) => {
      X.font(c, 700, size, S.f1); const w = c.measureText(s).width, x0 = cx - w / 2, xr = x0 + w * p;
      if (p <= 0) return; c.save(); c.beginPath(); c.rect(x0 - 30, y - size, xr - x0 + 30 - 6 + (p >= 1 ? 40 : 0), size * 2); c.clip();
      X.text(c, s, x0, y, { size, fam: S.f1, w: 700, color: col, align: "left" }); c.restore();
      c.save(); c.beginPath(); c.rect(xr - 6, y - size, 6, size * 2); c.clip(); X.text(c, s, x0, y, { size, fam: S.f1, w: 700, color: col, align: "left", alpha: .45 }); c.restore();
      if (p < 1) pen = [xr, y + Math.sin(xr * .13) * size * .2];
    };
    const p1 = X.E(t, .3, 2.6, "inOut"), p2 = X.E(t, 2.8, 4.6, "inOut");
    write(l1, y1, s1, p1, pal[1]); write(l2, y2, s2, p2, pal[2]);
    // flourish under line 2
    X.font(c, 700, s2, S.f1); const w2 = c.measureText(l2).width;
    const fp = X.E(t, 4.6, 5.6, "inOut");
    if (fp > 0) {
      c.strokeStyle = pal[2]; c.lineWidth = 2.4; c.lineCap = "round";
      const a = [cx - w2 / 2 - 10, y2 + s2 * .5], b = [cx + w2 / 2 + 30, y2 + s2 * .42];
      X.drawOn(c, (g) => { g.moveTo(a[0], a[1]); g.bezierCurveTo(cx - w2 * .1, y2 + s2 * .9, cx + w2 * .2, y2 + s2 * .2, b[0], b[1]); g.bezierCurveTo(b[0] + 22, b[1] - 6, b[0] + 8, b[1] - 28, b[0] - 6, b[1] - 8); }, fp, w2 * 1.6);
      if (fp < 1) pen = X.polyEnd([a, [cx, y2 + s2 * .62], b], fp);
    }
    const cap = (S.lines[2].j + " " + S.lines[3].j).trim();
    const ca = X.E(t, 5.6, 6.4); if (ca > 0) X.text(c, cap, cx, H * .84 + (1 - ca) * 10, { size: fit(c, cap, 400, S.f2, 18, W * .7), fam: S.f2, w: 400, color: pal[3], alpha: ca });
    // ink dots
    if (pen) { // fountain pen
      c.save(); c.translate(pen[0], pen[1]); c.rotate(-.75 + Math.sin(t * 9) * .04); X.shadow(c, 10, 8, "rgba(0,0,0,.25)");
      c.fillStyle = pal[3]; X.rr(c, -5, -96, 10, 72, 4); c.fill(); X.noShadow(c);
      c.fillStyle = "#d9c08a"; c.fillRect(-5, -28, 10, 6);
      c.fillStyle = pal[1]; c.beginPath(); c.moveTo(-5, -22); c.lineTo(5, -22); c.lineTo(0, 0); c.closePath(); c.fill(); c.restore();
    }
    c.restore();
  });

  /* ------------------------------------------------------------ swiss (KIN-03) */
  PS.def("swiss", (c, t, S) => {
    const { W, H, pal } = S, m = 30, cols = 12, rows = 6, cw = (W - m * 2) / cols, rh = (H - m * 2) / rows;
    fill(c, S);
    c.strokeStyle = X.a(pal[1], .08); c.lineWidth = 1;
    for (let i = 0; i <= cols; i++) { c.beginPath(); c.moveTo(m + i * cw, m); c.lineTo(m + i * cw, H - m); c.stroke(); }
    for (let j = 0; j <= rows; j++) { c.beginPath(); c.moveTo(m, m + j * rh); c.lineTo(W - m, m + j * rh); c.stroke(); }
    const k = Math.floor(t / 2) % 4, lt = t % 2, pk = (k + 3) % 4;
    const BL = [[7, 0, 5, 4], [0, 4, 6, 2], [8, 1, 4, 5], [5, 0, 2, 6]];
    const e = X.E(lt, 0, .55, "out5"), a = BL[pk], b = BL[k], r = a.map((v, i) => X.lerp(v, b[i], e));
    c.fillStyle = pal[2]; c.fillRect(m + r[0] * cw, m + r[1] * rh, r[2] * cw, r[3] * rh);
    X.text(c, "0" + (k + 1), m + r[0] * cw + 8, m + r[1] * rh + 14, { size: 11, fam: S.f2, w: 700, color: pal[4], align: "left" });
    // blue dot snaps along the baseline
    const dx = X.lerp([2, 10, 4, 11][pk], [2, 10, 4, 11][k], X.E(lt, .1, .5, "out5"));
    X.circle(c, m + dx * cw + cw / 2, m + 5 * rh + rh / 2, rh * .32); c.fillStyle = pal[3]; c.fill();
    // big type, word per row, masked rise
    const ws = S.lines[k].j.split(/\s+/), tx = m + ([0, 6, 0, 7][k] > 6 ? 0 : 0);
    const size = Math.min(rh * 1.55, ...ws.map((w) => fit(c, w, 800, S.f1, rh * 1.55, cw * 8)));
    const ox = (k === 1 ? m + 6 * cw : m) + 2, oy0 = k === 1 ? m + rh * .9 : m + rh * 2.3;
    ws.slice(0, 3).forEach((w, i) => {
      const y = oy0 + i * size * .98, ky = 1 - X.E(lt, .12 + i * .08, .62 + i * .08, "out5");
      const xx = Math.min(ox, W - m - X.measure(c, w, 800, size, S.f1));
      c.save(); c.beginPath(); c.rect(m, y - size * .78, W - m * 2, size * .98); c.clip();
      X.text(c, w, xx, y + ky * size, { size, fam: S.f1, w: 800, color: pal[1], align: "left", base: "alphabetic", ls: -size * .04 });
      c.restore();
    });
    // rule draws in
    c.fillStyle = pal[1]; c.fillRect(m, m + 5 * rh - 1, (W - m * 2) * X.E(lt, 0, .8, "out5"), 2);
    const meta = { size: 9.5, fam: S.f2, w: 600, color: pal[1], align: "left", alpha: .75 };
    X.text(c, "KIN—03 / GRID 12×6", m, m - 13, meta);
    X.text(c, `0${k + 1} — 04`, W - m, m - 13, Object.assign({}, meta, { align: "right" }));
    X.text(c, "Gerak presisi · 24 fps · Inter", m, H - m + 14, meta);
    X.text(c, (lt * 12).toFixed(0).padStart(2, "0") + "f", W - m, H - m + 14, Object.assign({}, meta, { align: "right" }));
  });

  /* ------------------------------------------------------------ retroCut (KIN-04) */
  PS.def("retroCut", (c, t, S) => {
    const { W, H, pal } = S, tt = X.stepT(t, 12);
    fill(c, S);
    const ox = W / 2, oy = H * 1.08;
    c.save(); c.translate(ox, oy); c.rotate(tt * .07);
    for (let i = 0; i < 28; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, W * 1.3, i * TAU / 28, (i + .5) * TAU / 28); c.closePath(); c.fillStyle = X.shade(pal[0], -.07); c.fill(); }
    c.restore();
    const sh = (fn) => { c.save(); X.shadow(c, 0, 5, "rgba(40,20,0,.28)", 4); fn(); c.restore(); };
    const sunY = H * .78 - X.E(tt, 0, 1.4, "back") * 50;
    sh(() => { c.fillStyle = pal[2]; X.circle(c, W * .7, sunY, 110); c.fill(); });
    c.fillStyle = X.shade(pal[2], .25); for (let i = 0; i < 4; i++) c.fillRect(W * .7 - 120, sunY - 10 + i * 18, 240, 6);
    const hill = (col, yb, amp, ph, sp) => sh(() => { c.fillStyle = col; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 16) c.lineTo(x, yb + Math.sin(x / 70 + ph + tt * sp) * amp); c.lineTo(W, H); c.closePath(); c.fill(); });
    hill(pal[4], H * .74, 12, 0, .5); hill(pal[3], H * .83, 9, 2, -.7); hill(pal[1], H * .93, 6, 4, .9);
    for (let i = 0; i < 9; i++) { const x = (X.hash(i) * W + tt * 20 * (i % 2 ? 1 : -1) + W) % W, y = H * .12 + X.hash(i + 4) * H * .4 + Math.sin(tt * 2 + i) * 6; c.save(); c.translate(x, y); c.rotate(tt * (i % 2 ? .8 : -.6) + i); c.fillStyle = [pal[3], pal[4], pal[2]][i % 3]; if (i % 3 === 0) X.icon(c, "star", 0, 0, 18, pal[3], { fill: pal[3] }); else { X.circle(c, 0, 0, 5 + i % 4); c.fill(); } c.restore(); }
    const k = Math.floor(t / 2) % 4, lt = t % 2, word = S.lines[k].j.toUpperCase();
    const size = fit(c, word, 700, S.f1, 86, W * .62), e = X.E(X.stepT(lt, 12), 0, .6, "back"), out = X.E(lt, 1.75, 2, "in");
    const x = 34 - (1 - e) * 340 + out * -30;
    c.save(); c.translate(x, H * .44); c.rotate(-.04);
    X.text(c, word, 6, 6, { size, fam: S.f1, w: 700, color: pal[1], align: "left", alpha: 1 - out });
    X.text(c, word, 0, 0, { size, fam: S.f1, w: 700, color: pal[3], align: "left", alpha: 1 - out });
    c.restore();
    const tag = S.title.toUpperCase(), te = X.E(tt, .3, .9, "back");
    c.save(); c.translate(34, H * .44 + size * .62); c.scale(te, te);
    const tw = X.measure(c, tag, 700, 13, S.f1) + tag.length * 2 + 22;
    sh(() => { c.fillStyle = pal[4]; c.fillRect(0, -12, tw, 24); });
    X.text(c, tag, 11, 1, { size: 13, fam: S.f1, w: 700, color: pal[3], align: "left", ls: 2 }); c.restore();
    X.grain(c, W, H, .35, tt);
  });

  /* ------------------------------------------------------------ neon (KIN-05, 9:16) */
  PS.def("neon", (c, t, S) => {
    const { W, H, pal } = S;
    const brick = off(S, "_brick", W, H, (g, w, h) => {
      g.fillStyle = X.shade(pal[4], -.35); g.fillRect(0, 0, w, h);
      const bh = 22, bw = 52; for (let r = 0; r * bh < h; r++) for (let q = -1; q * bw < w; q++) { const x = q * bw + (r % 2 ? bw / 2 : 0), v = X.hash(r * 31 + q * 7); g.fillStyle = X.shade(pal[4], -.1 + v * .22); g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); }
    });
    c.drawImage(brick, 0, 0, W, H);
    X.vignette(c, W, H, .75);
    const fl = (seed, on) => { if (t < on) return 0; if (t < on + .55) return X.hash(Math.floor(t * 30) + seed) > .5 ? 1 : .12; if (t > 6 + seed * .02 && t < 6.25 + seed * .02 && seed % 3 === 0) return X.hash(Math.floor(t * 40)) > .5 ? 1 : .2; return 1; };
    const jit = (f) => (f < 1 ? (X.hash(Math.floor(t * 50)) - .5) * 2 : 0);
    const tube = (draw, col, f, blur = 26) => { if (f <= 0) return; c.save(); c.globalAlpha = f; c.shadowColor = col; c.shadowBlur = blur; draw(col, false); c.shadowBlur = blur * .4; draw(X.mix(col, "#ffffff", .7), true); c.restore(); };
    // frame
    const fF = fl(1, .2);
    X.glow(c, W / 2, H * .44, 220, pal[2], .18 * fF);
    tube((col, core) => { c.strokeStyle = col; c.lineWidth = core ? 1.2 : 3.4; X.rr(c, 34, H * .25, W - 68, H * .4, 26); c.stroke(); }, pal[3], fF, 18);
    const ws = S.lines[0].j.split(/\s+/);
    ws.slice(0, 2).forEach((w, i) => {
      const f = fl(i * 3 + 3, .9 + i * .7), size = fit(c, w, 400, S.f1, 74, W - 110), y = H * .36 + i * size * 1.02, j = jit(f);
      tube((col, core) => { X.font(c, 400, size, S.f1); c.textAlign = "center"; c.textBaseline = "middle"; if (core) { c.lineWidth = 1.3; c.strokeStyle = col; c.strokeText(w, W / 2 + j, y); } else { c.fillStyle = col; c.fillText(w, W / 2 + j, y); } }, pal[2], f);
    });
    const l2 = S.lines[1].j, f2 = fl(6, 2.6), s2 = fit(c, l2, 400, S.f2, 30, W - 120);
    tube((col, core) => { X.font(c, core ? 400 : 300, s2, S.f2); c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 1; c.strokeStyle = col; c.strokeText(l2, W / 2, H * .58); }, pal[3], f2, 16);
    // heart icon
    const fh = fl(9, 3.6); if (fh > 0) { const hb = 1 + .08 * X.beat(t, 100, 6); c.save(); c.translate(W / 2, H * .73); c.scale(hb, hb); c.globalAlpha = fh; c.shadowColor = pal[2]; c.shadowBlur = 20; X.icon(c, "heart", 0, 0, 44, pal[2], { lw: 2.6 }); c.restore(); }
    // wet floor reflection
    const fg = c.createLinearGradient(0, H * .82, 0, H); fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(1, "rgba(0,0,0,.6)"); c.fillStyle = fg; c.fillRect(0, H * .82, W, H * .18);
    c.save(); c.globalAlpha = .5 * fF; c.translate(W / 2, H * .9); c.scale(1.6, .22); X.glow(c, 0, 0, 120, pal[2], .5); X.glow(c, 60, 10, 80, pal[3], .4); c.restore();
    for (let i = 0; i < 14; i++) { const y = H * .86 + X.hash(i) * H * .12, x = X.hash(i + 2) * W; c.fillStyle = X.a(i % 2 ? pal[2] : pal[3], .25 * fF * (.5 + .5 * Math.sin(t * 3 + i))); c.fillRect(x, y, 20 + X.hash(i + 5) * 40, 1.5); }
    X.grain(c, W, H, .25, t);
  });

  /* ------------------------------------------------------------ extrude (KIN-06) */
  PS.def("extrude", (c, t, S) => {
    const { W, H, pal } = S;
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, X.shade(pal[0], .15)], [1, X.shade(pal[0], -.08)]]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { const z = .4 + X.hash(i) * .8, x = (X.hash(i + 1) * W + Math.sin(t * .5 + i) * 30 * z), y = X.hash(i + 2) * H + Math.cos(t * .6 + i) * 20 * z, r = 14 + 30 * z;
      const g = c.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r); g.addColorStop(0, X.shade(i % 2 ? pal[2] : pal[3], .5)); g.addColorStop(1, i % 2 ? pal[2] : pal[3]); c.fillStyle = g; c.globalAlpha = .55; X.circle(c, x, y, r); c.fill(); c.globalAlpha = 1; }
    const k = Math.floor(t / 2) % 4, lt = t % 2, word = S.lines[k].j.toUpperCase();
    const size = fit(c, word, 400, S.f1, 116, W * .8);
    const s = lt < .9 ? X.spring(X.seg(lt, 0, .9) * 1.3, 8, 5) : 1 - X.E(lt, 1.72, 2, "in");
    const ry = Math.sin(t * .9) * .38, sx = Math.cos(ry), N = 26;
    // floor shadow
    c.save(); c.globalAlpha = .22 * s; c.translate(W / 2, H * .5 + size * .8); c.scale(1, .16); X.glow(c, 0, 0, W * .36 * sx, pal[1], .8); c.restore();
    c.save(); c.translate(W / 2, H * .48); c.scale(Math.max(.01, sx * s), Math.max(.01, s)); c.rotate(-.04);
    X.font(c, 400, size, S.f1); c.textAlign = "center"; c.textBaseline = "middle";
    for (let i = N; i >= 1; i--) { const dx = (-Math.sin(ry) * 1.8 + .8) * i, dy = i * 1.25; c.fillStyle = X.mix(X.shade(pal[2], -.45), pal[3], 1 - i / N); c.fillText(word, dx, dy); }
    const fg = c.createLinearGradient(0, -size / 2, 0, size / 2); fg.addColorStop(0, "#ffffff"); fg.addColorStop(1, X.mix(pal[4], "#ffffff", .3)); c.fillStyle = fg; c.fillText(word, 0, 0);
    c.lineWidth = 1.2; c.strokeStyle = X.a(pal[1], .5); c.strokeText(word, 0, 0);
    // specular sweep
    c.save(); c.globalCompositeOperation = "source-atop"; const sw = ((t * .6) % 1.4 - .2) * W; c.fillStyle = X.lgrad(c, sw - 60, 0, sw + 60, 0, [[0, "rgba(255,255,255,0)"], [.5, "rgba(255,255,255,.0)"], [1, "rgba(255,255,255,0)"]]); c.restore();
    c.restore();
    X.text(c, `0${k + 1} / 04`, W / 2, H * .87, { size: 12, fam: S.f2, w: 700, color: pal[1], ls: 4, alpha: .7 });
  });

  /* ------------------------------------------------------------ glitch (KIN-07) */
  PS.def("glitch", (c, t, S) => {
    const { W, H, pal } = S;
    if (!S._g) { S._g = document.createElement("canvas"); S._g.width = W * 2; S._g.height = H * 2; }
    const gc = S._g, g = gc.getContext("2d"); g.setTransform(2, 0, 0, 2, 0, 0);
    g.fillStyle = pal[0]; g.fillRect(0, 0, W, H);
    // hex columns
    g.font = `400 9px "${S.f1}", monospace`; g.fillStyle = X.a(pal[2], .14); g.textAlign = "left";
    for (let col = 0; col < 3; col++) for (let r = 0; r < 26; r++) { const v = Math.floor(X.hash(col * 99 + r + Math.floor(t * 6)) * 65535).toString(16).padStart(4, "0"); g.fillText(v.toUpperCase() + " " + Math.floor(X.hash(r + col) * 255).toString(16).padStart(2, "0"), col < 2 ? 14 + col * 62 : W - 70, 20 + r * 13.5 - (t * 14) % 13.5); }
    const k = Math.floor(t / 2) % 4, lt = t % 2, word = S.lines[k].j.toUpperCase(), CH = "#$%&@01ABX/<>?*=";
    let shown = ""; for (let i = 0; i < word.length; i++) { const res = lt > .12 + i * .045; shown += res || word[i] === " " ? word[i] : CH[Math.floor(X.hash(i * 7 + Math.floor(t * 24)) * CH.length)]; }
    const size = fit(g, word, 700, S.f1, 60, W * .72); const gi = lt < .32 ? 1 - lt / .32 : (X.hash(Math.floor(t * 9)) > .88 ? .6 : 0);
    const d = 2 + gi * 7, draw = (col, ox, oy, op = "source-over") => { g.globalCompositeOperation = op; g.font = `700 ${size}px "${S.f1}", monospace`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(shown, W / 2 + ox, H * .48 + oy); };
    draw(X.a(pal[3], .85), -d, 0, "lighter"); draw(X.a(pal[2], .85), d, 1, "lighter"); draw(pal[1], 0, 0); g.globalCompositeOperation = "source-over";
    // terminal
    g.font = `400 11px "${S.f1}", monospace`; g.textAlign = "left"; g.fillStyle = pal[2];
    g.fillText("> decode --stream sinyal_0" + (k + 1), W * .16, H * .22);
    g.fillStyle = X.a(pal[1], .6); g.fillText("[ OK ] kunci " + Math.floor(X.hash(k + 3) * 0xffffff).toString(16).toUpperCase() + "  ·  paket " + (k + 1) + "/4", W * .16, H * .22 + 16);
    if (Math.floor(t * 2.5) % 2) { g.fillStyle = pal[2]; g.fillRect(W * .16 + 2, H * .7 - 9, 9, 13); }
    const pr = X.E(lt, 0, 1.4, "out"); g.strokeStyle = X.a(pal[1], .3); g.strokeRect(W * .16, H * .74, W * .68, 8); g.fillStyle = pal[2]; g.fillRect(W * .16 + 2, H * .74 + 2, (W * .68 - 4) * pr, 4);
    g.fillStyle = X.a(pal[1], .7); g.fillText("DEKODE " + Math.round(pr * 100) + "%", W * .16, H * .74 + 24);
    // slices to main
    const n = 14, sh = H / n;
    for (let i = 0; i < n; i++) { const hit = gi > 0 && X.hash(i * 13 + Math.floor(t * 14)) > .55, dx = hit ? (X.hash(i + Math.floor(t * 20)) - .5) * 60 * gi : 0; c.drawImage(gc, 0, i * sh * 2, W * 2, sh * 2, dx, i * sh, W, sh); }
    if (gi > .3) for (let i = 0; i < 4; i++) { c.fillStyle = X.a(i % 2 ? pal[3] : pal[2], .5 * gi); c.fillRect(0, X.hash(i + Math.floor(t * 30)) * H, W, 2 + X.hash(i + 4) * 6); }
    if (!S._scan) { const cv = document.createElement("canvas"); cv.width = 4; cv.height = 3; const q = cv.getContext("2d"); q.fillStyle = "rgba(0,0,0,.35)"; q.fillRect(0, 0, 4, 1); S._scan = c.createPattern(cv, "repeat"); }
    c.fillStyle = S._scan; c.fillRect(0, 0, W, H); X.vignette(c, W, H, .5);
  });

  /* ------------------------------------------------------------ manifesto (KIN-08) */
  PS.def("manifesto", (c, t, S) => {
    const { W, H, pal } = S, ls = S.lines.map((l) => l.j);
    fill(c, S); X.paper(c, W, H, pal[0], .25);
    X.text(c, "“", 40, 118 + Math.sin(t * .6) * 4, { size: 220, fam: S.f1, w: 400, color: pal[2], alpha: .14 * X.E(t, 0, 1), align: "left" });
    c.save(); const z = 1 + t * .006; c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    const x0 = 78, size = Math.min(H * .6 / 4.6, ...ls.map((s) => fit(c, s, 400, S.f1, 60, W - x0 - 50)));
    c.fillStyle = pal[2]; c.fillRect(x0 - 22, H * .18, 3, H * .62 * X.E(t, .2, 1.2, "out5"));
    ls.forEach((s, i) => {
      const ti = .4 + i * .7, y = H * .2 + size * .9 + i * size * 1.12, ky = 1 - X.E(t, ti, ti + .75, "out5");
      const last = i === ls.length - 1; X.font(c, 400, size, S.f1); const w = c.measureText(s).width;
      if (last) { const mp = X.E(t, 3.6, 4.3, "inOut"); if (mp > 0) { c.save(); c.translate(x0 - 6, y - size * .72); c.transform(1, 0, -.12, 1, 0, 0); c.fillStyle = X.a(pal[2], .92); c.beginPath(); c.moveTo(0, 4); c.lineTo((w + 12) * mp, 0); c.lineTo((w + 12) * mp, size * .9); c.lineTo(0, size * .96); c.closePath(); c.fill(); c.restore(); } }
      c.save(); c.beginPath(); c.rect(0, y - size * .95, W, size * 1.18); c.clip();
      X.text(c, s, x0, y + ky * size * 1.2, { size, fam: S.f1, w: 400, color: last ? X.mix(pal[1], pal[4], X.E(t, 3.85, 4.3)) : pal[1], align: "left", base: "alphabetic" });
      c.restore();
    });
    const ap = X.E(t, 4.7, 5.4, "out5"), ay = H * .2 + size * .9 + 3.55 * size * 1.12 + 18;
    c.fillStyle = pal[3]; c.fillRect(x0, ay, 40 * ap, 1.5);
    X.text(c, "Nilai kami, ditulis bersama", x0 + 52, ay + 1, { size: 12, fam: S.f2, w: 500, color: pal[3], align: "left", alpha: X.E(t, 5, 5.6) });
    c.restore();
  });

  /* ------------------------------------------------------------ variable (KIN-09) */
  PS.def("variable", (c, t, S) => {
    const { W, H, pal } = S, br = .5 - .5 * Math.cos(TAU * t / 4);
    fill(c, S);
    const r = Math.min(W, H) * (.32 + .1 * br);
    c.fillStyle = X.a(pal[4], .55); X.circle(c, W / 2, H * .47, r); c.fill();
    c.strokeStyle = X.a(pal[3], .5); c.lineWidth = 1.5; X.circle(c, W / 2, H * .47, r + 10); c.stroke();
    c.setLineDash([2, 6]); X.circle(c, W / 2, H * .47, r + 26 + br * 8); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 3; i++) { const rr = r + ((t * 30 + i * 40) % 120); c.strokeStyle = X.a(pal[3], .25 * (1 - (rr - r) / 120)); X.circle(c, W / 2, H * .47, rr); c.stroke(); }
    const word = S.lines[0].j, ch = [...word], fam = S.f1;
    if (!S._vs) S._vs = fit(c, word, 1000, fam, 92, W * .84);
    const size = S._vs, wts = ch.map((_, i) => Math.round(100 + 900 * X.clamp(br * .85 + .15 + .22 * Math.sin(t * 3 - i * .7))));
    const wid = ch.map((s, i) => X.measure(c, s, wts[i], size, fam)), tot = wid.reduce((a, b) => a + b, 0);
    let x = W / 2 - tot / 2;
    ch.forEach((s, i) => { const k = (wts[i] - 100) / 900; X.text(c, s, x + wid[i] / 2, H * .45 + Math.sin(t * 3 - i * .7) * 4, { size, fam, w: wts[i], color: X.mix(pal[1], pal[2], k * .8) }); x += wid[i]; });
    const l2 = S.lines[1].j; c.save(); if ("letterSpacing" in c) c.letterSpacing = (2 + 8 * br).toFixed(1) + "px"; X.font(c, 500, 18, S.f2); c.textAlign = "center"; c.fillStyle = pal[3]; c.fillText(l2.toUpperCase(), W / 2, H * .66); c.restore();
    const up = Math.sin(TAU * t / 4) > 0;
    X.text(c, up ? "Tarik napas" : "Hembuskan", W / 2, H * .82, { size: 13, fam: S.f2, w: 500, color: pal[1], alpha: .4 + .5 * Math.abs(Math.sin(TAU * t / 4)) });
    X.text(c, "wght " + wts[0], 24, H - 22, { size: 10.5, fam: S.f2, w: 600, color: pal[1], align: "left", alpha: .6 });
    c.fillStyle = X.a(pal[1], .15); c.fillRect(90, H - 24, 120, 3); c.fillStyle = pal[2]; c.fillRect(90, H - 24, 120 * (wts[0] - 100) / 900, 3);
  });

  /* ------------------------------------------------------------ halftone (KIN-10) */
  PS.def("halftone", (c, t, S) => {
    const { W, H, pal } = S, R = Math.min(W, H) * .42;
    X.paper(c, W, H, pal[0], .4);
    const sun = (key, col) => off(S, key, R * 2, R * 2, (g) => X.halftone(g, 0, 0, R * 2, R * 2, col, 7.5, (x, y) => { const d = Math.hypot(x - R, y - R) / R; return d > 1 ? 0 : 1.05 - d * .85; }));
    const sx = W * .74, sy = H * .52, mr = 2.5 + 2 * Math.sin(t * 1.7);
    c.save(); c.translate(sx, sy); c.rotate(t * .08);
    for (let i = 0; i < 18; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, W, i * TAU / 18, (i + .45) * TAU / 18); c.closePath(); c.fillStyle = X.a(pal[4], .28); c.fill(); }
    c.restore();
    const pz = 1 + .04 * Math.sin(t * 1.2);
    c.save(); c.globalCompositeOperation = "multiply";
    c.drawImage(sun("_hs2", pal[3]), sx - R * pz + mr, sy - R * pz + mr * .6, R * 2 * pz, R * 2 * pz);
    c.drawImage(sun("_hs1", pal[2]), sx - R * pz, sy - R * pz, R * 2 * pz, R * 2 * pz);
    c.restore();
    const ws = [S.lines[0].j, S.lines[1].j].map((s) => s.toUpperCase());
    ws.forEach((w, i) => {
      const size = fit(c, w, 400, S.f1, 58, W * .5), y = H * .3 + i * 64, e = X.E(X.stepT(t, 12), .2 + i * .35, .8 + i * .35, "bounce"), yy = y - (1 - e) * 120;
      c.save(); c.globalCompositeOperation = "multiply";
      X.text(c, w, 40 + mr, yy + mr * .5, { size, fam: S.f1, w: 400, color: pal[2], align: "left", alpha: e });
      X.text(c, w, 40, yy, { size, fam: S.f1, w: 400, color: pal[3], align: "left", alpha: e });
      c.restore();
    });
    c.fillStyle = pal[1]; c.fillRect(0, H - 46, W, 46);
    X.text(c, (S.lines[2].j + " · " + S.lines[3].j).toUpperCase(), 40, H - 23, { size: 14, fam: S.f2, w: 700, color: pal[0], align: "left", ls: 3 });
    const st = X.seg(t, 4.2, 4.6); if (st > 0) {
      const s = X.lerp(1.8, 1, X.ease.out5(st)), sh = st < 1 ? (X.hash(Math.floor(t * 40)) - .5) * 3 : 0;
      c.save(); c.translate(W * .44 + sh, H * .62); c.rotate(-.22); c.scale(s, s); c.globalAlpha = X.clamp(st * 2) * .85; c.strokeStyle = pal[2]; c.lineWidth = 3;
      X.circle(c, 0, 0, 40); c.stroke(); c.lineWidth = 1.2; X.circle(c, 0, 0, 33); c.stroke();
      X.text(c, "EDISI", 0, -8, { size: 13, fam: S.f1, w: 400, color: pal[2] }); X.text(c, "2026", 0, 10, { size: 17, fam: S.f1, w: 400, color: pal[2] }); c.restore();
    }
    X.grain(c, W, H, .3, X.stepT(t, 12));
  });

  /* ------------------------------------------------------------ barRace (DAT-01) */
  const RACE = { n: ["Jawa", "Sumatra", "Sulawesi", "Kalimantan", "Bali", "Papua"], a: [90, 70, 34, 55, 28, 16], g: [.05, .11, .3, .1, .22, .36] };
  PS.def("barRace", (c, t, S) => {
    const { W, H, pal } = S; fill(c, S);
    const yr = X.ease.sine(X.clamp(t / 7.6)) * 7, vals = RACE.a.map((a, i) => a * Math.exp(RACE.g[i] * yr) + Math.sin(yr * 2 + i) * 3);
    const mx = Math.max(...vals) * 1.08, top = 78, rowH = (H - top - 30) / 6, x0 = 112, bw = W - x0 - 90;
    // grid
    const step = mx > 400 ? 100 : mx > 200 ? 50 : 25;
    for (let v = 0; v < mx; v += step) { const x = x0 + v / mx * bw; c.fillStyle = X.a(pal[1], .08); c.fillRect(x, top - 8, 1, H - top - 20); X.text(c, String(v), x, top - 16, { size: 9, fam: S.f2, w: 500, color: pal[1], alpha: .4 }); }
    X.text(c, String(2019 + Math.floor(yr)), W - 26, H - 40, { size: 84, fam: S.f1, w: 800, color: pal[1], align: "right", alpha: .14 });
    const cols = [pal[2], pal[3], X.mix(pal[2], pal[3], .5), X.shade(pal[3], -.35), X.shade(pal[2], -.3), X.mix(pal[1], pal[3], .45)];
    vals.forEach((v, i) => {
      let r = 0; vals.forEach((o, j) => { if (j !== i) r += 1 / (1 + Math.exp(-(o - v) / (mx * .004))); });
      const y = top + r * rowH, w = Math.max(4, v / mx * bw * X.E(t, 0, .8, "out5")), h = rowH * .72;
      if (r < .5) X.glow(c, x0 + w, y + h / 2, 40, cols[i], .35);
      c.fillStyle = X.lgrad(c, 0, y, 0, y + h, [[0, X.shade(cols[i], .18)], [1, cols[i]]]); X.rr(c, x0, y, w, h, 4); c.fill();
      X.text(c, RACE.n[i], x0 - 10, y + h / 2, { size: 12, fam: S.f2, w: 600, color: pal[1], align: "right" });
      X.text(c, fmt(v * 10), x0 + w + 8, y + h / 2, { size: 12, fam: S.f1, w: 700, color: pal[1], align: "left" });
      if (r < .5) X.text(c, "★", x0 + w - 12, y + h / 2, { size: 12, color: pal[0], w: 700 });
    });
    X.text(c, S.lines[2].j, 24, 28, { size: 20, fam: S.f1, w: 800, color: pal[1], align: "left" });
    X.text(c, "Volume per wilayah · ribu unit", 24, 50, { size: 11, fam: S.f2, w: 400, color: pal[1], align: "left", alpha: .55 });
  });

  /* ------------------------------------------------------------ scrolly (DAT-03 data | EDU-09 narr) */
  PS.def("scrolly", (c, t, S) => {
    const { W, H, pal } = S, k = Math.floor(t / 2) % 4, lt = t % 2, e = X.E(lt, 0, .7, "out5");
    fill(c, S);
    if (S.v === "narr") {
      const ICN = ["doc", "chart", "search", "check"], cx = W / 2, cy = H * .44;
      for (let i = 0; i < 4; i++) { const on = i <= k; c.fillStyle = on ? pal[2] : X.a(pal[1], .12); X.rr(c, cx - 78 + i * 40, 26, 34, 5, 3); c.fill(); }
      c.fillStyle = pal[4]; X.circle(c, cx, cy, 86 + 4 * Math.sin(t * 2)); c.fill();
      for (let i = 0; i < 6; i++) { const a = t * .7 + i * TAU / 6, rr = 112; X.circle(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .9, i % 2 ? 4 : 2.5); c.fillStyle = i % 2 ? pal[3] : pal[2]; c.fill(); }
      const outP = X.E(lt, 0, .35, "in"), inP = X.spring(X.seg(lt, .15, 1.1) * 1.2, 8, 5);
      if (outP < 1) { c.save(); c.translate(cx, cy); c.rotate(outP * .8); c.scale(1 - outP, 1 - outP); X.icon(c, ICN[(k + 3) % 4], 0, 0, 90, pal[1], { lw: 2.6 }); c.restore(); }
      c.save(); c.translate(cx, cy); c.rotate((1 - Math.min(1, inP)) * -.6); c.scale(inP, inP); X.icon(c, ICN[k], 0, 0, 90, k % 2 ? pal[3] : pal[2], { lw: 2.6, p: X.E(lt, .1, .9) }); c.restore();
      const hd = S.lines[k].j; X.text(c, hd, cx, H * .76 + (1 - e) * 14, { size: fit(c, hd, 700, S.f1, 26, W * .7), fam: S.f1, w: 700, color: pal[1], alpha: e });
      // narration waveform
      const nb = 36; for (let i = 0; i < nb; i++) { const h = 3 + 16 * Math.abs(X.noise(i * .6 + t * 5)) * (lt < 1.7 ? 1 : .3); c.fillStyle = X.a(pal[3], .7); X.rr(c, cx - nb * 3 + i * 6, H * .9 - h / 2, 3, h, 1.5); c.fill(); }
      X.icon(c, "user", cx - nb * 3 - 18, H * .9, 14, pal[3], { lw: 2 });
      return;
    }
    const pw = W * .36;
    c.fillStyle = pal[4]; c.fillRect(0, 0, pw, H);
    const body = ["Penjualan naik pelan setiap tahun.", "Lalu satu tahun melonjak tajam.", "Garis trennya terus menanjak.", "Dalam tujuh tahun: tiga kali lipat."];
    const scroll = X.lerp(k - 1, k, e) * 92;
    c.save(); c.beginPath(); c.rect(0, 0, pw, H); c.clip();
    for (let i = 0; i < 4; i++) { const y = H / 2 - 30 + i * 92 - scroll, al = i === k ? 1 : .25;
      X.text(c, S.lines[i].j, 34, y, { size: fit(c, S.lines[i].j, 700, S.f1, 19, pw - 50), fam: S.f1, w: 700, color: pal[1], align: "left", alpha: al });
      X.font(c, 400, 12, S.f2); X.wrap(c, body[i], pw - 54).forEach((ln, j) => X.text(c, ln, 34, y + 22 + j * 16, { size: 12, fam: S.f2, w: 400, color: pal[1], align: "left", alpha: al * .8 })); }
    c.restore();
    c.fillStyle = X.a(pal[1], .12); c.fillRect(18, 40, 2, H - 80); c.fillStyle = pal[3]; c.fillRect(18, 40, 2, (H - 80) * ((k + e) / 4));
    const vals = [3, 3.6, 4.2, 5, 8.6, 7.6, 9.6], cx0 = pw + 50, cw = W - pw - 80, base = H - 54, bh = H - 130, bwid = cw / vals.length;
    c.fillStyle = X.a(pal[1], .15); c.fillRect(cx0 - 10, base, cw + 20, 1);
    vals.forEach((v, i) => {
      const grow = X.E(t, .1 + i * .06, .9 + i * .06, "out5"), h = v / 10 * bh * (k === 0 && t < 2 ? grow : 1);
      let col = X.a(pal[2], .4); if (k >= 1 && i === 4) col = X.mix(X.a(pal[2], .4) === col ? pal[2] : pal[2], pal[3], k === 1 ? e : 1); if (k === 3 && i !== 6 && i !== 0) col = X.a(pal[2], .18); if (k === 3 && (i === 6 || i === 0)) col = pal[2];
      c.fillStyle = col; X.rr(c, cx0 + i * bwid + 6, base - h, bwid - 12, h, 3); c.fill();
      X.text(c, String(2019 + i), cx0 + i * bwid + bwid / 2, base + 14, { size: 9, fam: S.f2, w: 500, color: pal[1], alpha: .5 });
    });
    if (k === 1) { const x = cx0 + 4 * bwid + bwid / 2, y = base - 8.6 / 10 * bh - 18; X.text(c, "+72%", x, y - (1 - e) * 10, { size: 15, fam: S.f1, w: 700, color: pal[3], alpha: e }); }
    if (k >= 2) { c.strokeStyle = pal[3]; c.lineWidth = 2.5; c.lineCap = "round"; const pts = vals.map((v, i) => [cx0 + i * bwid + bwid / 2, base - v / 10 * bh - 10]); X.poly(c, pts, k === 2 ? e : 1); c.stroke(); pts.forEach((p, i) => { if ((k === 2 ? e : 1) * (pts.length - 1) >= i) { X.circle(c, p[0], p[1], 3.5); c.fillStyle = pal[3]; c.fill(); } }); }
    if (k === 3) { const s = X.spring(X.seg(lt, .2, 1) * 1.2); c.save(); c.translate(cx0 + cw * .32, H * .3); c.scale(s, s); X.text(c, "3×", 0, 0, { size: 56, fam: S.f1, w: 700, color: pal[3] }); c.restore(); }
  });

  /* ------------------------------------------------------------ bigNumber (DAT-04) */
  PS.def("bigNumber", (c, t, S) => {
    const { W, H, pal } = S, target = 12480, p = X.E(t, .3, 4.6, "out5"), v = target * p;
    fill(c, S);
    c.fillStyle = X.lgrad(c, 0, 0, W, H, [[0, X.a(pal[4], .9)], [1, X.a(pal[0], 0)]]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { const y = (X.hash(i) * H - t * 20 * (.5 + X.hash(i + 1))) % H; c.fillStyle = X.a(pal[2], .1); c.fillRect(X.hash(i + 3) * W, (y + H) % H, 1.5, 10 + X.hash(i + 4) * 30); }
    const cx = W / 2, cy = H * .5, R = H * .4;
    c.strokeStyle = X.a(pal[1], .1); c.lineWidth = 6; X.circle(c, cx, cy, R); c.stroke();
    for (let i = 0; i < 60; i++) { const a = -Math.PI / 2 + i * TAU / 60, on = i / 60 < p; c.strokeStyle = on ? pal[2] : X.a(pal[1], .15); c.lineWidth = i % 5 ? 1 : 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10)); c.lineTo(cx + Math.cos(a) * (R + (i % 5 ? 15 : 20)), cy + Math.sin(a) * (R + (i % 5 ? 15 : 20))); c.stroke(); }
    c.strokeStyle = pal[2]; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * p); c.stroke();
    const ea = -Math.PI / 2 + TAU * p; X.glow(c, cx + Math.cos(ea) * R, cy + Math.sin(ea) * R, 26, pal[2], .7);
    // odometer digits
    const digits = 5, size = H * .3; X.font(c, 400, size, S.f1); const dw = c.measureText("0").width, sepw = dw * .4, tot = digits * dw + sepw;
    let x = cx - tot / 2; const tick = X.beat(v / 100, 60, 3) * 0;
    c.save(); c.beginPath(); c.rect(cx - tot / 2 - 10, cy - size * .52, tot + 20, size * .98); c.clip();
    for (let d = digits - 1; d >= 0; d--) {
      const pos = digits - 1 - d; if (pos === 2) { X.text(c, ".", x + sepw / 2, cy + size * .1, { size, fam: S.f1, w: 400, color: pal[1] }); x += sepw; }
      const cont = v / Math.pow(10, d), dig = Math.floor(cont) % 10; let frac = cont - Math.floor(cont); if (d > 0) frac = X.clamp((frac - .85) / .15); else frac = 0;
      const on = v >= Math.pow(10, d) || d === 0;
      for (const [n, oy, inc] of [[dig, -frac, 0], [(dig + 1) % 10, 1 - frac, 1]]) { const al = on ? 1 : (inc ? 1 : 0); if (al) X.text(c, String(n), x + dw / 2, cy + oy * size, { size, fam: S.f1, w: 400, color: pal[1], alpha: al }); }
      x += dw;
    }
    c.restore();
    X.text(c, "PENGGUNA AKTIF", cx, cy - size * .72, { size: 12, fam: S.f2, w: 700, color: pal[2], ls: 3 });
    X.text(c, S.lines[3].c, cx, cy + size * .74, { size: fit(c, S.lines[3].c, 400, S.f2, 14, R * 1.6), fam: S.f2, w: 400, color: pal[1], alpha: .7 });
    const bp = X.spring(X.seg(t, 4.7, 5.6) * 1.2, 9, 5); if (bp > 0) { c.save(); c.translate(cx + tot / 2 + 18, cy - size * .45); c.scale(bp, bp); c.rotate(-.08); c.fillStyle = pal[3]; X.rr(c, -4, -14, 62, 28, 14); c.fill(); X.text(c, "+38%", 27, 1, { size: 14, fam: S.f2, w: 800, color: pal[0] }); c.restore(); }
    for (let i = 0; i < 14; i++) { const k = X.seg(t, 4.7, 6.4); if (k <= 0 || k >= 1) break; const a = X.hash(i) * TAU, d = 40 + k * 120 * (.5 + X.hash(i + 2)); X.circle(c, cx + Math.cos(a) * d * 1.5, cy + Math.sin(a) * d, 2.5 * (1 - k)); c.fillStyle = i % 2 ? pal[3] : pal[2]; c.fill(); }
  });

  /* ------------------------------------------------------------ pictograph (DAT-05) */
  PS.def("pictograph", (c, t, S) => {
    const { W, H, pal } = S; X.paper(c, W, H, pal[0], .25);
    const cols = 10, rows = 5, gx = W * .38, gw = W - gx - 30, cell = Math.min(gw / cols, (H - 90) / rows), gy = (H - cell * rows) / 2 + 8;
    const fillN = 35, hiN = 12, k2 = t >= 4.4;
    const man = (x, y, s, col) => { c.fillStyle = col; X.circle(c, x, y - s * .28, s * .13); c.fill(); X.rr(c, x - s * .17, y - s * .11, s * .34, s * .42, s * .1); c.fill(); };
    for (let i = 0; i < cols * rows; i++) {
      const cx = gx + (i % cols) * cell + cell / 2, cy = gy + Math.floor(i / cols) * cell + cell / 2;
      const ti = .5 + i * .06, on = i < fillN && t >= ti, pe = i < fillN ? X.E(t, ti, ti + .45, "back") : 0;
      let col = X.a(pal[1], .16); if (on) col = X.mix(X.a(pal[1], .16) && pal[1], pal[2], 1);
      if (i < fillN) col = X.mix("#cfc8b8", pal[2], X.clamp(pe));
      if (k2 && i < hiN) col = X.mix(pal[2], pal[3], X.E(t, 4.4 + i * .04, 4.8 + i * .04));
      const s = cell * (1 + (i < fillN ? .25 * Math.sin(Math.PI * X.clamp(pe)) : 0));
      man(cx, cy + 4, s * .95, i < fillN || (k2 && i < hiN) ? col : X.a(pal[1], .15));
    }
    let filled = 0; for (let i = 0; i < fillN; i++) if (t >= .7 + i * .06) filled++; const num = k2 ? Math.round(24 * X.E(t, 4.4, 5.4)) : filled * 2;
    X.text(c, num + "%", 34, H * .42, { size: 74, fam: S.f1, w: 700, color: k2 ? pal[3] : pal[2], align: "left" });
    const cap = k2 ? "di antaranya berusia di bawah 25 tahun" : "warga memakai transportasi umum";
    X.font(c, 400, 14, S.f2); X.wrap(c, cap, gx - 60).forEach((ln, j) => X.text(c, ln, 34, H * .42 + 50 + j * 18, { size: 14, fam: S.f2, w: 400, color: pal[1], align: "left" }));
    X.text(c, "1 ikon = 2% responden", 34, H - 28, { size: 10.5, fam: S.f2, w: 600, color: pal[1], align: "left", alpha: .55 });
    X.text(c, S.lines[0].j.toUpperCase(), 34, 34, { size: 12, fam: S.f1, w: 700, color: pal[1], align: "left", ls: 2.5 });
  });

  /* ------------------------------------------------------------ trendLine (DAT-06 note | DOK-09 biz) */
  const TREND = [22, 26, 24, 31, 35, 28, 25, 33, 41, 46, 44, 55, 62, 58, 70];
  PS.def("trendLine", (c, t, S) => {
    const { W, H, pal } = S, biz = S.v === "biz";
    fill(c, S);
    if (biz) { for (let i = 0; i < 18; i++) X.glow(c, (X.hash(i) * W + t * 8) % W, H * (.2 + X.hash(i + 2) * .6), 20 + X.hash(i + 3) * 40, i % 3 ? pal[4] : pal[2], .25); c.fillStyle = X.a(pal[0], .55); c.fillRect(0, 0, W, H); }
    const z = biz ? 1 + t * .012 : 1; c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    const x0 = 56, x1 = W - 40, y0 = biz ? 80 : 74, y1 = H - (biz ? 96 : 48), n = TREND.length;
    const pts = TREND.map((v, i) => [x0 + i / (n - 1) * (x1 - x0), y1 - (v - 15) / 60 * (y1 - y0)]);
    for (let i = 0; i <= 4; i++) { const y = y1 - i / 4 * (y1 - y0); c.fillStyle = X.a(pal[1], .08); c.fillRect(x0, y, x1 - x0, 1); X.text(c, String(15 + i * 15), x0 - 10, y, { size: 9, fam: S.f2, w: 500, color: pal[1], align: "right", alpha: .45 }); }
    const p = X.E(t, .3, 5.6, "inOut"), lc = biz ? pal[2] : pal[3];
    // area
    const end = X.polyEnd(pts, p);
    c.save(); X.poly(c, pts, p); c.lineTo(end[0], y1); c.lineTo(x0, y1); c.closePath(); c.fillStyle = X.lgrad(c, 0, y0, 0, y1, [[0, X.a(lc, .28)], [1, X.a(lc, 0)]]); c.fill(); c.restore();
    c.strokeStyle = lc; c.lineWidth = 2.6; c.lineJoin = "round"; c.lineCap = "round"; if (biz) { c.shadowColor = lc; c.shadowBlur = 12; } X.poly(c, pts, p); c.stroke(); X.noShadow(c);
    X.glow(c, end[0], end[1], 22, lc, .6); X.circle(c, end[0], end[1], 4); c.fillStyle = biz ? "#fff" : lc; c.fill();
    if (!biz) {
      const ann = [[6, "Turun 12%", 2.6, 1], [12, "Rekor baru", 4.9, -1]];
      ann.forEach(([i, lab, ta, dir]) => {
        const q = pts[i], a = X.E(t, ta, ta + .6, "inOut"); if (a <= 0) return;
        c.strokeStyle = pal[2]; c.lineWidth = 2; X.drawOn(c, (g) => g.ellipse(q[0], q[1], 18, 14, -.2, -.5, TAU - .3), a, 110);
        const ly = q[1] + dir * -48, la = X.E(t, ta + .4, ta + .9);
        c.globalAlpha = la; c.strokeStyle = X.a(pal[1], .6); c.lineWidth = 1; c.beginPath(); c.moveTo(q[0], q[1] - dir * 16); c.lineTo(q[0] + 10, ly); c.lineTo(q[0] + 24, ly); c.stroke();
        X.text(c, lab, q[0] + 28, ly, { size: 12.5, fam: S.f1, w: 700, color: pal[2], align: "left" }); c.globalAlpha = 1;
      });
      X.text(c, S.lines[0].j, x0, 30, { size: 19, fam: S.f1, w: 700, color: pal[1], align: "left" });
      X.text(c, "Harga rata-rata per kuartal", x0, 50, { size: 11, fam: S.f2, w: 400, color: pal[1], align: "left", alpha: .55 });
    }
    c.restore();
    if (biz) {
      // ticker
      c.fillStyle = X.a(pal[4], .95); c.fillRect(0, 0, W, 30); const items = ["IHSG ▲ 1,2%", "EMAS ▼ 0,4%", "RUPIAH ▲ 0,3%", "KOPI ▲ 4,8%", "BATUBARA ▼ 2,1%", "NIKEL ▲ 3,6%"];
      const iw = items.map((s) => X.measure(c, s, 700, 11, S.f1) + 28), tw = iw.reduce((a, b) => a + b, 0); let x = -((t * 40) % tw);
      for (let r = 0; r < 3; r++) items.forEach((s, i) => { const up = s.includes("▲"); X.text(c, s, x, 15, { size: 11, fam: S.f1, w: 700, color: up ? pal[2] : pal[3], align: "left" }); x += iw[i]; });
      const v = 15 + (TREND[Math.min(TREND.length - 1, Math.floor(p * (TREND.length - 1)))]) ; X.text(c, "Rp " + (v * 1.73).toFixed(1).replace(".", ",") + " T", W - 30, 58, { size: 22, fam: S.f1, w: 800, color: pal[1], align: "right" });
      X.text(c, "nilai pasar", W - 30, 76, { size: 10, fam: S.f2, w: 500, color: pal[1], align: "right", alpha: .6 });
      const k = t < 4 ? 0 : 1, lt = t - k * 4, e = X.E(lt, .2, .8, "out5"), ex = X.E(lt, 3.5, 3.95, "in"), lw = W * .5;
      c.save(); c.beginPath(); c.rect(30, H - 74, lw, 50); c.clip(); const sx = (1 - e + ex) * -lw;
      c.fillStyle = pal[2]; c.fillRect(30 + sx, H - 70, 5, 40); c.fillStyle = X.a(pal[4], .92); c.fillRect(35 + sx, H - 70, lw - 5, 40);
      X.text(c, S.lines[k].j, 48 + sx, H - 57, { size: 15, fam: S.f1, w: 800, color: pal[1], align: "left" });
      X.text(c, S.lines[k].c, 48 + sx, H - 39, { size: 10.5, fam: S.f2, w: 400, color: pal[1], align: "left", alpha: .7 }); c.restore();
      X.vignette(c, W, H, .5);
    }
  });

  /* ------------------------------------------------------------ qaData (DAT-07) */
  PS.def("qaData", (c, t, S) => {
    const { W, H, pal } = S; fill(c, S);
    c.fillStyle = X.lgrad(c, 0, 0, 0, H, [[0, X.a(pal[4], .0)], [1, X.a(pal[4], .9)]]); c.fillRect(0, 0, W, H);
    const q = "Berapa persen warga yang mulai menabung tahun ini?", qp = X.E(t, .3, 2.2, "lin"), qs = X.typed(q, qp);
    const by = 34; X.font(c, 400, 18, S.f1); const lines = X.wrap(c, q, W * .62);
    c.fillStyle = X.a(pal[1], .08); X.rr(c, 40, by - 12, W * .62 + 40, lines.length * 24 + 28, 16); c.fill();
    X.icon(c, "chat", 26, by + 4, 18, pal[2], { lw: 2 });
    let rem = qs, cur = null; lines.forEach((ln, i) => { const s = rem.slice(0, ln.length); rem = rem.slice(ln.length + 1); X.text(c, s, 60, by + 8 + i * 24, { size: 18, fam: S.f1, w: 400, color: pal[1], align: "left" }); if (s.length && (s.length < ln.length || i === lines.length - 1) && !cur) cur = [60 + X.measure(c, s, 400, 18, S.f1) + 3, by + 8 + i * 24]; });
    if (cur && Math.floor(t * 3) % 2 && t < 2.8) { c.fillStyle = pal[2]; c.fillRect(cur[0], cur[1] - 10, 2, 20); }
    const cx = W * .32, cy = H * .64, R = H * .24, segs = [[.64, pal[2]], [.22, X.shade(pal[3], -.25)], [.14, X.a(pal[3], .55)]];
    let a0 = -Math.PI / 2; const dp = X.E(t, 2.5, 4.2, "inOut"), hi = X.E(t, 5.2, 5.8, "back");
    segs.forEach(([f, col], i) => {
      const a1 = a0 + f * TAU * dp, mid = (a0 + a1) / 2, pop = i === 0 ? hi * 8 : 0;
      c.save(); c.translate(Math.cos(mid) * pop, Math.sin(mid) * pop); c.strokeStyle = col; c.lineWidth = R * .42 + (i === 0 ? hi * 6 : 0); c.beginPath(); c.arc(cx, cy, R, a0 + .02, Math.max(a0 + .02, a1 - .02)); c.stroke(); c.restore();
      a0 += f * TAU * dp;
    });
    X.text(c, Math.round(64 * X.E(t, 2.6, 4.3)) + "%", cx, cy, { size: R * .62, fam: S.f1, w: 700, color: pal[1] });
    const leg = [["Mulai menabung", 64], ["Belum mulai", 22], ["Ragu-ragu", 14]];
    leg.forEach(([n, v], i) => { const a = X.E(t, 3.4 + i * .2, 3.9 + i * .2), y = H * .5 + i * 30; c.globalAlpha = a; c.fillStyle = segs[i][1]; X.rr(c, W * .58, y - 6, 12, 12, 3); c.fill(); X.text(c, n, W * .58 + 22, y, { size: 13, fam: S.f2, w: 500, color: pal[1], align: "left" }); X.text(c, v + "%", W - 46, y, { size: 13, fam: S.f2, w: 700, color: pal[1], align: "right" }); c.globalAlpha = 1; });
    if (hi > 0) { const y = H * .5 + 3 * 30 + 6; X.text(c, "Jawabannya: 64%", W * .58, y, { size: 18, fam: S.f1, w: 700, color: pal[2], align: "left", alpha: X.clamp(hi) }); c.fillStyle = pal[2]; c.fillRect(W * .58, y + 14, 150 * X.E(t, 5.5, 6.2, "out5"), 3); }
  });

  /* ------------------------------------------------------------ heatmap (DAT-08) */
  PS.def("heatmap", (c, t, S) => {
    const { W, H, pal } = S; fill(c, S);
    if (!S._hex) {
      const r = 10, hw = Math.sqrt(3) * r, cells = []; const blobs = [[.22, .55, .16, .2], [.42, .5, .12, .14], [.58, .42, .1, .18], [.74, .55, .14, .12], [.88, .6, .07, .1], [.34, .66, .12, .08]];
      for (let row = 0; row * r * 1.5 < H; row++) for (let q = 0; q * hw < W; q++) {
        const x = q * hw + (row % 2 ? hw / 2 : 0), y = row * r * 1.5 + 20, nx = x / W, ny = y / H;
        let inside = false; blobs.forEach(([bx, by, rx, ry]) => { if (((nx - bx) / rx) ** 2 + ((ny - by) / ry) ** 2 < 1 + X.noise(x * .05 + y * .03) * .25) inside = true; });
        if (inside) cells.push([x, y, X.clamp(.5 + .45 * X.noise(x * .018 + 3) + .35 * X.noise(y * .03 + 9))]);
      }
      let top = 0; cells.forEach((cl, i) => { if (cl[2] > cells[top][2]) top = i; }); S._hex = { cells, r, top };
    }
    const { cells, r, top } = S._hex, sweep = X.E(t, .2, 2.6, "inOut") * (W + 80) - 40, th = .15 + .5 * (.5 - .5 * Math.cos(TAU * X.clamp((t - 3) / 4)));
    cells.forEach(([x, y, v], i) => {
      const a = X.clamp((sweep - x) / 60), act = v >= th; const col = X.mix(pal[4], X.mix(pal[3], pal[2], v), a * (act || t < 3 ? 1 : .25));
      c.fillStyle = col; c.beginPath(); for (let j = 0; j < 6; j++) { const an = Math.PI / 6 + j * Math.PI / 3, rr = (r - 1) * (.6 + .4 * X.ease.back(a)); c[j ? "lineTo" : "moveTo"](x + Math.cos(an) * rr, y + Math.sin(an) * rr); } c.closePath(); c.fill();
    });
    // legend + slider
    const lx = 40, ly = H - 34, lw = 200; c.fillStyle = X.lgrad(c, lx, 0, lx + lw, 0, [[0, pal[3]], [1, pal[2]]]); X.rr(c, lx, ly, lw, 8, 4); c.fill();
    X.text(c, "rendah", lx, ly + 20, { size: 9.5, fam: S.f2, w: 500, color: pal[1], align: "left", alpha: .6 }); X.text(c, "tinggi", lx + lw, ly + 20, { size: 9.5, fam: S.f2, w: 500, color: pal[1], align: "right", alpha: .6 });
    if (t > 3) { const kx = lx + th * lw; c.fillStyle = pal[1]; X.circle(c, kx, ly + 4, 7); c.fill(); X.text(c, "≥ " + Math.round(th * 100), kx, ly - 12, { size: 10, fam: S.f2, w: 700, color: pal[1] }); }
    // callout
    const [tx, ty, tv] = cells[top], ca = X.E(t, 2.6, 3.2, "back");
    if (ca > .01) {
      const pr = (t * 1.2) % 1; c.strokeStyle = X.a(pal[2], 1 - pr); c.lineWidth = 2; X.circle(c, tx, ty, 8 + pr * 22); c.stroke();
      const bx = Math.min(W - 170, tx + 40), by = ty - 80 < 64 ? ty + 40 : ty - 80;
      c.strokeStyle = X.a(pal[1], .7); c.lineWidth = 1; c.beginPath(); c.moveTo(tx, ty); c.lineTo(bx, by + (by > ty ? 10 : 34)); c.stroke();
      c.save(); c.translate(bx, by); c.scale(ca, ca); c.fillStyle = X.a(pal[4], .95); X.rr(c, 0, 0, 150, 46, 10); c.fill(); c.fillStyle = pal[2]; c.fillRect(0, 10, 3, 26);
      X.text(c, "Wilayah tertinggi", 14, 15, { size: 10.5, fam: S.f2, w: 500, color: pal[1], align: "left", alpha: .7 }); X.text(c, "Skor " + Math.round(60 + tv * 38), 14, 32, { size: 16, fam: S.f1, w: 700, color: pal[1], align: "left" }); c.restore();
    }
    X.text(c, S.lines[1].j, 40, 30, { size: 20, fam: S.f1, w: 700, color: pal[1], align: "left" });
    X.text(c, "Penjualan per area · indeks 0–100", 40, 50, { size: 11, fam: S.f2, w: 400, color: pal[1], align: "left", alpha: .55 });
  });
})();
