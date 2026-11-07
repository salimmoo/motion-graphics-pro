/* paket-scenes-d.js — Product demo / UI (DEM) + Edukasi (EDU) preview scenes for PaketScenes. */
(function () {
  const PS = window.PaketScenes; if (!PS) return;
  const X = PS.X, TAU = Math.PI * 2;

  /* ---------- local helpers ---------- */
  const fit = (c, s, maxW, size, w, fam) => { let z = size; for (let i = 0; i < 30 && X.measure(c, s, w, z, fam) > maxW; i++) z *= .93; return z; };
  const light = (S) => X.lum(S.pal[0]) > .5;
  const surf = (S) => (light(S) ? "#ffffff" : S.pal[4]);
  const line2 = (S, k) => X.mix(surf(S), S.pal[1], k);
  const cursor = (c, x, y, s = 1, press = 0) => {
    c.save(); c.translate(x, y); c.scale(s * (1 - press * .15), s * (1 - press * .15)); X.shadow(c, 6, 3, "rgba(0,0,0,.35)");
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 17); c.lineTo(4.5, 13); c.lineTo(7.5, 20); c.lineTo(10.5, 18.6); c.lineTo(7.6, 12); c.lineTo(13, 12); c.closePath();
    c.fillStyle = "#fff"; c.fill(); X.noShadow(c); c.lineWidth = 1.3; c.strokeStyle = "#111"; c.stroke(); c.restore();
  };
  const ripple = (c, x, y, t, t0, col, r = 26) => { const p = X.seg(t, t0, t0 + .6); if (p <= 0 || p >= 1) return; c.save(); c.globalAlpha = (1 - p) * .8; c.strokeStyle = col; c.lineWidth = 2.5 * (1 - p) + .5; X.circle(c, x, y, 4 + r * X.ease.out(p)); c.stroke(); c.globalAlpha = (1 - p) * .25; c.fillStyle = col; X.circle(c, x, y, 4 + r * .6 * X.ease.out(p)); c.fill(); c.restore(); };
  const pill = (c, x, y, w, h, fill) => { X.rr(c, x, y, w, h, h / 2); c.fillStyle = fill; c.fill(); };
  const bars = (c, x, y, w, col, n = 2, gap = 7, h = 4) => { c.fillStyle = col; for (let i = 0; i < n; i++) { X.rr(c, x, y + i * gap, w * (i ? .62 : 1), h, h / 2); c.fill(); } };
  const confetti = (c, cx, cy, t, t0, cols, n = 34, spread = 1, seed = 3) => {
    const p = t - t0; if (p < 0 || p > 2.6) return;
    for (let i = 0; i < n; i++) {
      const a = X.hash(seed + i) * TAU, v = (60 + X.hash(seed + i * 3) * 150) * spread, g = 220;
      const x = cx + Math.cos(a) * v * p * .9, y = cy + Math.sin(a) * v * p * .9 - 60 * p + g * p * p * .5;
      c.save(); c.globalAlpha = X.clamp(1.4 - p * .6); c.translate(x, y); c.rotate(p * 8 * (X.hash(i) - .5) * 3); c.fillStyle = cols[i % cols.length];
      if (i % 3) c.fillRect(-3, -1.6, 6, 3.2); else { X.circle(c, 0, 0, 2.4); c.fill(); }
      c.restore();
    }
  };
  const bgSoft = (c, S, t, a = .5) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    X.glow(c, W * (.2 + .05 * Math.sin(t * .7)), H * .15, Math.max(W, H) * .55, pal[2], light(S) ? .14 * a * 2 : .35 * a);
    X.glow(c, W * (.85 + .04 * Math.cos(t * .6)), H * .9, Math.max(W, H) * .5, pal[3], light(S) ? .12 * a * 2 : .3 * a);
  };
  const capPill = (c, S, text, x, y, p, o = {}) => {
    if (p <= 0) return; const z = o.size || 13, w = X.measure(c, text, 600, z, S.f2) + 34;
    c.save(); c.globalAlpha = X.clamp(p); c.translate(x, y + (1 - X.ease.back(X.clamp(p))) * 12); X.shadow(c, 18, 6, "rgba(0,0,0,.22)");
    pill(c, -w / 2, -z, w, z * 2, o.bg || S.pal[1]); X.noShadow(c);
    X.circle(c, -w / 2 + 14, 0, 3.5); c.fillStyle = S.pal[2]; c.fill();
    X.text(c, text, 6, 1, { size: z, w: 600, fam: S.f2, color: o.fg || S.pal[0] }); c.restore();
  };

  /* ---------- kanban app window (DEM-01/04, reused) ---------- */
  function kanban(c, S, x, y, w, h, o = {}) {
    const { pal } = S, sf = surf(S), ink = pal[1], dim = line2(S, .12), dim2 = line2(S, .22), acc = pal[2];
    X.shadow(c, 30, 14, "rgba(15,23,42,.18)"); X.rr(c, x, y, w, h, 12); c.fillStyle = sf; c.fill(); X.noShadow(c);
    c.save(); X.rr(c, x, y, w, h, 12); c.clip();
    c.fillStyle = line2(S, .05); c.fillRect(x, y, w, 26);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { X.circle(c, x + 14 + i * 13, y + 13, 4); c.fillStyle = col; c.fill(); });
    pill(c, x + w / 2 - 90, y + 7, 180, 12, line2(S, .08));
    // sidebar
    const sb = 104; c.fillStyle = line2(S, .03); c.fillRect(x, y + 26, sb, h - 26);
    X.rr(c, x + 14, y + 40, 18, 18, 5); c.fillStyle = acc; c.fill(); bars(c, x + 38, y + 47, 44, dim2, 1);
    const navs = ["Beranda", "Proyek", "Tim", "Laporan", "Atur"];
    navs.forEach((n, i) => {
      const yy = y + 74 + i * 24, on = i === (o.nav ?? 1);
      if (on) { X.rr(c, x + 8, yy - 9, sb - 16, 20, 6); c.fillStyle = X.a(acc, .12); c.fill(); }
      X.circle(c, x + 21, yy + 1, 3.5); c.fillStyle = on ? acc : dim2; c.fill();
      X.text(c, n, x + 32, yy + 1, { size: 9.5, w: on ? 700 : 500, fam: S.f2, color: on ? ink : X.mix(sf, ink, .55), align: "left" });
    });
    // header
    const mx = x + sb + 14; X.text(c, o.head || "Papan Tim", mx, y + 46, { size: 15, w: 800, fam: S.f1, color: ink, align: "left" });
    [0, 1, 2].forEach((i) => { X.circle(c, mx + 4 + i * 13, y + 64, 6); c.fillStyle = [pal[3], acc, "#f59e0b"][i]; c.fill(); c.strokeStyle = sf; c.lineWidth = 2; c.stroke(); });
    const bx = x + w - 88, by = y + 36, bp = o.btn || 0;
    c.save(); c.translate(bx + 35, by + 11); c.scale(1 - bp * .08, 1 - bp * .08);
    X.rr(c, -35, -11, 70, 22, 7); c.fillStyle = acc; c.fill(); X.text(c, "Bagikan", 0, 1, { size: 9.5, w: 700, fam: S.f2, color: "#fff" }); c.restore();
    // columns
    const cols = ["Rencana", "Proses", "Selesai"], gap = 12, cw = (w - sb - 14 - gap * 2 - 14) / 3, top = y + 82;
    const cards = [[0, 1, 2], [3, 4], [5, 6]], dp = o.drag ?? -1, moved = dp >= 1;
    if (moved) { cards[0] = [1, 2]; cards[1] = [3, 0, 4]; }
    const pos = {};
    cols.forEach((name, ci) => {
      const cx = mx + ci * (cw + gap); X.rr(c, cx, top, cw, h - (top - y) - 12, 9); c.fillStyle = line2(S, .035); c.fill();
      X.text(c, name, cx + 10, top + 13, { size: 9, w: 700, fam: S.f2, color: X.mix(sf, ink, .6), align: "left" });
      X.text(c, String(cards[ci].length), cx + cw - 12, top + 13, { size: 8.5, w: 700, fam: S.f2, color: X.mix(sf, ink, .4), align: "right" });
      cards[ci].forEach((id, k) => { pos[id] = [cx + 7, top + 24 + k * 40, ci]; });
    });
    if (o.hl && o.hl.col != null) { const cx = mx + o.hl.col * (cw + gap); c.save(); c.globalAlpha = o.hl.a; X.rr(c, cx - 2, top - 2, cw + 4, h - (top - y) - 8, 10); c.strokeStyle = acc; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.stroke(); c.restore(); }
    const tags = [acc, pal[3], "#f59e0b", "#ef4444", acc, pal[3], "#a855f7"];
    const card = (id, px, py, lift = 0, rot = 0) => {
      c.save(); c.translate(px + (cw - 14) / 2, py + 17); c.rotate(rot); c.scale(1 + lift * .05, 1 + lift * .05);
      if (lift) X.shadow(c, 18 * lift, 10 * lift, "rgba(15,23,42,.25)"); else X.shadow(c, 3, 1, "rgba(15,23,42,.08)");
      X.rr(c, -(cw - 14) / 2, -17, cw - 14, 34, 7); c.fillStyle = sf; c.fill(); X.noShadow(c);
      c.fillStyle = tags[id]; X.rr(c, -(cw - 14) / 2 + 8, -10, 22, 5, 2.5); c.fill();
      bars(c, -(cw - 14) / 2 + 8, 0, (cw - 14) * .7, dim, 2, 7, 3.5); c.restore();
    };
    Object.entries(pos).forEach(([id, [px, py]]) => { if (+id === 0 && dp >= 0 && dp < 1) return; card(+id, px, py); });
    let dragPt = null;
    if (dp >= 0 && dp < 1) {
      const a = [mx + 7, top + 24], b = [mx + cw + gap + 7, top + 24 + 40], e = X.ease.inOut(dp), lift = Math.sin(Math.PI * X.clamp(dp * 1.2)) * .5 + .5 * (dp < .9);
      const px = X.lerp(a[0], b[0], e), py = X.lerp(a[1], b[1], e) - Math.sin(Math.PI * e) * 16;
      card(0, px, py, X.clamp(lift), Math.sin(e * Math.PI) * .06); dragPt = [px + cw * .5, py + 18];
    }
    // toast
    if (o.toast > 0) {
      const p = X.spring(o.toast, 9, 6), tw = 190, tx = x + w - tw - 16, ty = y + h - 16 - 40 * p;
      c.save(); c.globalAlpha = X.clamp(o.toast * 3); X.shadow(c, 20, 8, "rgba(0,0,0,.25)"); X.rr(c, tx, ty - 18, tw, 36, 9); c.fillStyle = ink; c.fill(); X.noShadow(c);
      X.circle(c, tx + 18, ty, 8); c.fillStyle = pal[3]; c.fill(); X.icon(c, "check", tx + 18, ty, 11, "#fff", { lw: 2.6 });
      X.text(c, o.toastText || "Semua terhubung", tx + 34, ty, { size: 10, w: 600, fam: S.f2, color: sf, align: "left" }); c.restore();
    }
    c.restore();
    return { mx, top, cw, gap, sb, bx, by, dragPt, navY: (i) => y + 74 + i * 24 };
  }

  /* ---------- screenUI (walk | spot) ---------- */
  PS.def("screenUI", (c, t, S) => {
    const { W, H, pal } = S; bgSoft(c, S, t, .5);
    const x = 40, y = 30, w = W - 80, h = H - 66;
    if (S.v === "spot") {
      const push = 1 + .03 * X.ease.sine(t / 8);
      c.save(); c.translate(W / 2, H / 2); c.scale(push, push); c.translate(-W / 2, -H / 2);
      const G = kanban(c, S, x, y, w, h, { nav: 3, btn: 0 });
      // targets: sidebar nav, column Proses, Bagikan button
      const T3 = [[x + 6, G.navY(0) - 12, 92, 122], [G.mx + G.cw + G.gap - 4, G.top - 4, G.cw + 8, 120], [G.bx - 6, G.by - 6, 82, 34]];
      const k = Math.min(2, Math.floor(t / 2.55)), kp = X.E(t, k * 2.55, k * 2.55 + .7, "out5"), prev = T3[Math.max(0, k - 1)], cur = T3[k];
      const r = k === 0 ? cur.map((v, i) => X.lerp([W / 2 - 10, H / 2 - 10, 20, 20][i], v, kp)) : cur.map((v, i) => X.lerp(prev[i], v, kp));
      const dimA = X.E(t, .1, .6) * .62;
      c.save(); c.beginPath(); c.rect(0, 0, W, H); X.rr(c, r[0], r[1], r[2], r[3], 10); c.fillStyle = `rgba(8,10,16,${dimA})`; c.fill("evenodd"); c.restore();
      c.save(); X.rr(c, r[0], r[1], r[2], r[3], 10); c.strokeStyle = pal[2]; c.lineWidth = 2; X.shadow(c, 16, 0, X.a(pal[2], .8)); c.stroke(); c.restore();
      // pulse ring
      const pr = (t % 1.1) / 1.1; c.save(); c.globalAlpha = (1 - pr) * .6 * dimA; X.rr(c, r[0] - pr * 8, r[1] - pr * 8, r[2] + pr * 16, r[3] + pr * 16, 12); c.strokeStyle = pal[2]; c.lineWidth = 1.5; c.stroke(); c.restore();
      c.restore();
      // label callout
      const lab = ["Navigasi rapi", "Seret, lepas, selesai", "Bagikan ke tim"][k], cap = S.lines[[0, 1, 2][k]].c;
      const lp = X.E(t, k * 2.55 + .45, k * 2.55 + 1.05, "back") * (1 - X.seg(t, k * 2.55 + 2.25, k * 2.55 + 2.55) * (k < 2 ? 1 : 0));
      const lx = k === 2 ? r[0] - 214 : r[0] + r[2] + 14, ly = k === 2 ? r[1] + 44 : r[1] + 26;
      if (lp > 0) {
        c.save(); c.globalAlpha = X.clamp(lp); c.translate(lx + (1 - lp) * (k === 2 ? 14 : -14), ly);
        X.shadow(c, 20, 8, "rgba(0,0,0,.3)"); X.rr(c, 0, 0, 200, 56, 11); c.fillStyle = "#fff"; c.fill(); X.noShadow(c);
        X.circle(c, 20, 20, 10); c.fillStyle = pal[2]; c.fill(); X.text(c, String(k + 1), 20, 20.5, { size: 11, w: 800, fam: S.f1, color: "#fff" });
        X.text(c, lab, 38, 20, { size: fit(c, lab, 150, 13, 800, S.f1), w: 800, fam: S.f1, color: "#111", align: "left" });
        X.text(c, cap, 14, 41, { size: fit(c, cap, 176, 9.5, 500, S.f2), w: 500, fam: S.f2, color: "#555", align: "left" }); c.restore();
      }
      // feature counter
      X.text(c, `FITUR 0${k + 1} / 03`, W - 44, H - 17, { size: 9, w: 700, fam: S.f2, color: X.mix(pal[0], pal[1], .55), align: "right", ls: 2 });
      return;
    }
    // walk: cursor + clicks + camera zoom
    const drag = X.seg(t, 2.6, 4.2), btn = Math.max(0, 1 - Math.abs(t - 5.35) * 6), toast = X.seg(t, 5.4, 6.4);
    const zIn = X.E(t, 1.9, 2.6, "inOut") * (1 - X.E(t, 4.5, 5.2, "inOut")), z = 1 + .55 * zIn + .25 * X.E(t, 6.1, 7.4, "inOut") * (1 - X.seg(t, 7.6, 8));
    // focus: board area during drag, toast later
    const fx = X.lerp(W / 2, 270, zIn) + X.E(t, 6.1, 7.4, "inOut") * 150 * (1 - zIn), fy = X.lerp(H / 2, 150, zIn) + X.E(t, 6.1, 7.4, "inOut") * 90;
    c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-fx, -fy);
    const G = kanban(c, S, x, y, w, h, { nav: t > 1.5 ? 1 : 0, drag: t > 2.6 ? drag : -1, btn, toast, toastText: S.lines[2].j, hl: { col: 1, a: Math.sin(Math.PI * drag) * .9 } });
    // cursor path
    const P0 = [W - 70, H - 40], P1 = [x + 50, G.navY(1)], P2 = [G.mx + G.cw * .5, G.top + 42], P3 = [G.mx + G.cw * 1.5 + G.gap, G.top + 82], P4 = [G.bx + 35, G.by + 12];
    let cp, press = 0;
    if (t < 1.4) cp = P0.map((v, i) => X.lerp(v, P1[i], X.E(t, .3, 1.35, "inOut")));
    else if (t < 2.6) cp = P1.map((v, i) => X.lerp(v, P2[i], X.E(t, 1.7, 2.55, "inOut")));
    else if (t < 4.2) cp = G.dragPt || P3;
    else if (t < 5.3) cp = P3.map((v, i) => X.lerp(v, P4[i], X.E(t, 4.3, 5.2, "inOut")));
    else cp = P4.map((v, i) => X.lerp(v, P4[i] + [30, 60][i], X.E(t, 5.8, 7, "inOut")));
    press = Math.max(1 - Math.abs(t - 1.45) * 8, t > 2.55 && t < 4.2 ? 1 : 0, 1 - Math.abs(t - 5.35) * 8, 0);
    ripple(c, P1[0], P1[1], t, 1.45, pal[2]); ripple(c, P3[0], P3[1], t, 4.2, pal[2]); ripple(c, P4[0], P4[1], t, 5.35, pal[2], 34);
    cursor(c, cp[0], cp[1], 1 / z * 1.1, X.clamp(press));
    c.restore();
    const k = t < 2.5 ? 0 : t < 5.2 ? 1 : 2;
    capPill(c, S, S.lines[k].j, W / 2, H - 16, X.win(t, [0, 2.5, 5.2][k] + .2, [2.5, 5.2, 7.8][k], .4, .3));
  });

  /* ---------- floatUI ---------- */
  function miniScreen(c, S, w, h, kind, t) {
    const { pal } = S, sf = X.mix(pal[0], "#ffffff", .07), ink = pal[1];
    X.rr(c, 0, 0, w, h, 12); c.fillStyle = sf; c.fill();
    c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 1; c.stroke();
    c.save(); X.rr(c, 0, 0, w, h, 12); c.clip();
    c.fillStyle = "rgba(255,255,255,.05)"; c.fillRect(0, 0, w, 22); [0, 1, 2].forEach((i) => { X.circle(c, 12 + i * 10, 11, 3); c.fillStyle = "rgba(255,255,255,.25)"; c.fill(); });
    if (kind === 0) { // chart
      X.text(c, "Pendapatan", 14, 40, { size: 10, w: 600, fam: S.f2, color: X.a(ink, .6), align: "left" });
      X.text(c, "Rp 2,4 M", 14, 60, { size: 20, w: 800, fam: S.f1, color: ink, align: "left" });
      const pts = []; for (let i = 0; i <= 10; i++) pts.push([14 + i * (w - 28) / 10, h - 22 - (Math.sin(i * .9 + 1) * .3 + .5 + i * .04) * (h - 110)]);
      c.lineWidth = 2.4; c.strokeStyle = pal[2]; X.poly(c, pts, X.seg(t, .3, 2.2)); c.stroke();
      c.lineTo(pts[pts.length - 1][0], h); c.lineTo(14, h); c.globalAlpha = .18; c.fillStyle = pal[2]; c.fill(); c.globalAlpha = 1;
    } else if (kind === 1) { // list
      for (let i = 0; i < 5; i++) { const yy = 36 + i * ((h - 46) / 5); X.circle(c, 22, yy + 8, 7); c.fillStyle = [pal[2], pal[3], "#f59e0b", pal[2], pal[3]][i]; c.fill(); bars(c, 36, yy + 3, w - 70, "rgba(255,255,255,.22)", 2, 7, 3.2); }
    } else { // donut + stats
      const r = Math.min(w, h) * .26, cx = w / 2, cy = h * .52, p = X.E(t, .5, 2.4, "out5");
      c.lineWidth = 11; c.strokeStyle = "rgba(255,255,255,.1)"; X.circle(c, cx, cy, r); c.stroke();
      c.strokeStyle = pal[3]; c.lineCap = "round"; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * .72 * p); c.stroke();
      X.text(c, Math.round(72 * p) + "%", cx, cy + 1, { size: 18, w: 800, fam: S.f1, color: ink });
    }
    c.restore();
  }
  PS.def("floatUI", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    X.glow(c, W * .3 + Math.sin(t * .5) * 30, H * .4, 300, pal[2], .45); X.glow(c, W * .75, H * .65 + Math.cos(t * .6) * 20, 260, pal[3], .32);
    // star dust
    for (let i = 0; i < 40; i++) { const x = (X.hash(i) * W + t * (6 + X.hash(i + 9) * 14)) % W, y = X.hash(i + 3) * H; c.fillStyle = `rgba(255,255,255,${.15 + X.hash(i + 5) * .4})`; c.fillRect(x, y, 1.4, 1.4); }
    // perspective floor grid
    c.save(); c.strokeStyle = X.a(pal[2], .16); c.lineWidth = 1; for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(W / 2 + i * 18, H * .62); c.lineTo(W / 2 + i * 120, H + 20); c.stroke(); }
    for (let j = 0; j < 6; j++) { const yy = H * .62 + Math.pow((j + (t * .4) % 1) / 6, 2) * H * .45; c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); } c.restore();
    const ent = (i) => X.spring(X.seg(t, .15 + i * .25, 1.8 + i * .25), 6, 4.5);
    const panels = [
      { x: W * .1, y: H * .18, w: 190, h: 150, sk: .32, k: 1, d: .6, kind: 1 },
      { x: W * .35, y: H * .1, w: 220, h: 170, sk: .22, k: 1.25, d: 1, kind: 0 },
      { x: W * .66, y: H * .22, w: 160, h: 140, sk: .12, k: .95, d: .75, kind: 2 },
    ];
    const sweep = ((t * .45) % 1.4) - .2;
    panels.forEach((p, i) => {
      const e = ent(i), dx = Math.sin(t * .6 + i * 2) * 8 * p.d, dy = Math.cos(t * .7 + i) * 7 * p.d + (1 - e) * 120;
      c.save(); c.globalAlpha = X.clamp(e * 1.4); c.translate(p.x + dx, p.y + dy);
      c.transform(1, -p.sk * .55, -p.sk * .2, 1, 0, 0); c.scale(p.k * .92, p.k * .92);
      X.shadow(c, 40, 26, "rgba(0,0,0,.55)"); X.rr(c, 0, 0, p.w, p.h, 12); c.fillStyle = "#000"; c.fill(); X.noShadow(c);
      miniScreen(c, S, p.w, p.h, p.kind, t - i * .3);
      // sheen
      c.save(); X.rr(c, 0, 0, p.w, p.h, 12); c.clip(); const sx = sweep * (p.w + 200) - 100;
      c.fillStyle = X.lgrad(c, sx - 60, 0, sx + 60, 0, [[0, "rgba(255,255,255,0)"], [.5, "rgba(255,255,255,.16)"], [1, "rgba(255,255,255,0)"]]); c.fillRect(0, 0, p.w, p.h); c.restore();
      c.strokeStyle = X.a(pal[2], .6); c.lineWidth = 1.2; X.rr(c, 0, 0, p.w, p.h, 12); c.stroke();
      c.restore();
    });
    // headline
    const k = Math.min(3, Math.floor(t / 2)), ln = S.lines[k].j, lp = X.win(t, k * 2 + .25, k * 2 + 2, .5, .3), sz = fit(c, ln, W * .7, 30, 800, S.f1);
    c.save(); c.globalAlpha = lp; X.text(c, ln, W / 2, H * .86 + (1 - X.ease.out(X.clamp(lp))) * 10, { size: sz, w: 800, fam: S.f1, color: pal[1], ls: -.5 }); c.restore();
    X.vignette(c, W, H, .5);
  });

  /* ---------- device (laptop | phone) ---------- */
  function appScreen(c, S, w, h, scroll, mode) {
    const { pal } = S; c.fillStyle = "#fff"; c.fillRect(0, 0, w, h);
    c.save(); c.translate(0, -scroll);
    const hero = mode === "phone" ? h * .34 : h * .42;
    c.fillStyle = X.lgrad(c, 0, 0, w, hero, [[0, pal[2]], [1, X.mix(pal[2], pal[3], .6)]]); c.fillRect(0, 0, w, hero);
    X.text(c, S.lines[0].j, w * .08, hero * .45, { size: fit(c, S.lines[0].j, w * .8, mode === "phone" ? w * .09 : w * .065, 800, S.f1), w: 800, fam: S.f1, color: "#fff", align: "left" });
    pill(c, w * .08, hero * .62, w * .3, hero * .14, "#fff"); X.text(c, "Coba gratis", w * .08 + w * .15, hero * .69, { size: hero * .07, w: 700, fam: S.f2, color: pal[2] });
    const cols = mode === "phone" ? 2 : 3, gw = (w * .84 - (cols - 1) * w * .03) / cols;
    for (let i = 0; i < 9; i++) {
      const cx = w * .08 + (i % cols) * (gw + w * .03), cy = hero + 14 + Math.floor(i / cols) * (gw * .75 + 12);
      X.rr(c, cx, cy, gw, gw * .75, 8); c.fillStyle = X.mix("#ffffff", pal[1], .05); c.fill();
      X.rr(c, cx + 6, cy + 6, gw - 12, gw * .38, 5); c.fillStyle = [pal[2], pal[3], "#f59e0b"][i % 3]; c.globalAlpha = .75; c.fill(); c.globalAlpha = 1;
      bars(c, cx + 6, cy + gw * .5, gw * .7, X.mix("#ffffff", pal[1], .2), 2, 6, 3);
    }
    c.restore();
  }
  PS.def("device", (c, t, S) => {
    const { W, H, pal } = S;
    if (S.v === "phone") {
      c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 3; i++) { X.circle(c, W * [.1, .9, .2][i] + Math.sin(t * .8 + i) * 14, H * [.2, .55, .9][i] + Math.cos(t * .6 + i) * 18, [90, 120, 80][i]); c.fillStyle = X.a(i === 1 ? pal[3] : pal[4], .5); c.fill(); }
      const k = t < 2.7 ? 0 : t < 5.4 ? 1 : 2;
      const head = [S.lines[0].j, S.lines[1].j, S.lines[3].j][k], hp = X.win(t, [0, 2.7, 5.4][k] + .15, [2.7, 5.4, 8][k], .45, .3);
      c.save(); c.globalAlpha = hp; X.text(c, head, W / 2, 62 + (1 - X.ease.out(X.clamp(hp))) * 14, { size: fit(c, head, W * .84, 30, 800, S.f1), w: 800, fam: S.f1, color: pal[1] }); c.restore();
      const pw = 222, ph = 440, ent = X.spring(X.seg(t, 0, 1.6), 6, 5), tilt = Math.sin(t * .9) * .03;
      c.save(); c.translate(W / 2, H * .56 + (1 - ent) * 300); c.rotate(tilt);
      X.shadow(c, 40, 24, "rgba(0,0,0,.35)"); X.rr(c, -pw / 2, -ph / 2, pw, ph, 34); c.fillStyle = pal[2]; c.fill(); X.noShadow(c);
      X.rr(c, -pw / 2 + 8, -ph / 2 + 8, pw - 16, ph - 16, 27); c.save(); c.clip();
      const sw = pw - 16, sh = ph - 16; c.translate(-pw / 2 + 8, -ph / 2 + 8);
      // three screens slide horizontally
      const slide = X.E(t, 2.6, 3.1, "out5") + X.E(t, 5.3, 5.8, "out5");
      for (let s = 0; s < 3; s++) {
        c.save(); c.translate((s - slide) * sw, 0);
        if (s === 0) appScreen(c, S, sw, sh, X.E(t, .9, 2.3, "inOut") * 60, "phone");
        else if (s === 1) {
          c.fillStyle = "#fff"; c.fillRect(0, 0, sw, sh); X.rr(c, 14, 40, sw - 28, sh * .42, 16); c.fillStyle = X.lgrad(c, 0, 40, 0, sh * .5, [[0, pal[3]], [1, pal[0]]]); c.fill();
          X.icon(c, "heart", sw / 2, 40 + sh * .21, 46, "#fff", { fill: "#fff", lw: 2 });
          X.text(c, "Produk favorit", 18, sh * .55, { size: 16, w: 800, fam: S.f1, color: pal[2], align: "left" }); bars(c, 18, sh * .6, sw - 60, "#e5e5ea", 3, 10, 5);
          const bp = 1 - Math.max(0, 1 - Math.abs(t - 5.1) * 6) * .08; c.save(); c.translate(sw / 2, sh - 58); c.scale(bp, bp); X.rr(c, -(sw - 36) / 2, -20, sw - 36, 40, 20); c.fillStyle = pal[0]; c.fill(); X.text(c, "Tambah ke keranjang", 0, 1, { size: 12, w: 700, fam: S.f2, color: "#fff" }); c.restore();
        } else {
          c.fillStyle = pal[0]; c.fillRect(0, 0, sw, sh); const cp = X.spring(X.seg(t, 5.45, 6.4), 8, 5);
          X.circle(c, sw / 2, sh * .42, 46 * cp); c.fillStyle = "#fff"; c.fill(); X.icon(c, "check", sw / 2, sh * .42, 48 * cp, pal[0], { lw: 3.4, p: X.seg(t, 6, 6.6) });
          X.text(c, "Pesanan berhasil!", sw / 2, sh * .62, { size: 19, w: 800, fam: S.f1, color: "#fff", alpha: X.seg(t, 5.7, 6.2) }); bars(c, sw * .2, sh * .68, sw * .6, "rgba(255,255,255,.45)", 2, 9, 4);
          confetti(c, sw / 2, sh * .42, t, 5.9, ["#fff", pal[3], pal[4], pal[2]], 30, .7);
        }
        c.restore();
      }
      c.restore();
      X.rr(c, -34, -ph / 2 + 14, 68, 16, 8); c.fillStyle = pal[2]; c.fill();
      // finger taps
      const taps = [[2.35, 40, 120], [5.05, 0, 162]];
      taps.forEach(([tt, fx, fy]) => { const a = X.win(t, tt - .6, tt + .35, .3, .25); if (a <= 0) return; const pr = X.clamp(1 - Math.abs(t - tt) * 6);
        ripple(c, fx, fy, t, tt, "#fff", 30); c.save(); c.globalAlpha = a * .85; X.shadow(c, 14, 6, "rgba(0,0,0,.3)"); X.circle(c, fx + 2, fy + 4 + (1 - a) * 30, 17 * (1 - pr * .15)); c.fillStyle = "rgba(255,255,255,.75)"; c.fill(); c.restore(); });
      c.restore();
      // progress dots
      for (let i = 0; i < 3; i++) { pill(c, W / 2 - 28 + i * 20 + (i > k ? 10 : 0), H - 26, i === k ? 26 : 8, 8, i === k ? pal[1] : X.a(pal[1], .4)); }
      return;
    }
    // laptop
    bgSoft(c, S, t, .6);
    const ent = X.E(t, 0, 1.1, "out5"), lx = W * .36, ly = H * .5 + (1 - ent) * 40, lw = 330, lh = 206;
    c.save(); c.globalAlpha = ent; c.translate(lx, ly); c.rotate(-.015);
    X.shadow(c, 40, 20, "rgba(17,24,39,.25)"); X.rr(c, -lw / 2, -lh / 2, lw, lh, 12); c.fillStyle = "#1f2430"; c.fill(); X.noShadow(c);
    c.save(); X.rr(c, -lw / 2 + 9, -lh / 2 + 9, lw - 18, lh - 22, 4); c.clip(); c.translate(-lw / 2 + 9, -lh / 2 + 9);
    appScreen(c, S, lw - 18, lh - 22, X.E(t, 1.2, 3.4, "inOut") * 120 - X.E(t, 5.5, 7, "inOut") * 120, "laptop"); c.restore();
    c.beginPath(); c.moveTo(-lw / 2 - 26, lh / 2); c.lineTo(lw / 2 + 26, lh / 2); c.lineTo(lw / 2 + 14, lh / 2 + 12); c.lineTo(-lw / 2 - 14, lh / 2 + 12); c.closePath();
    c.fillStyle = X.lgrad(c, 0, lh / 2, 0, lh / 2 + 12, [[0, "#d7dbe3"], [1, "#9aa1ae"]]); c.fill(); X.rr(c, -30, lh / 2, 60, 4, 2); c.fillStyle = "#8a909c"; c.fill();
    c.restore();
    // phone in front
    const pe = X.spring(X.seg(t, .5, 2), 6, 5), px = W * .74 + (1 - pe) * 160, py = H * .54 + Math.sin(t * 1.1) * 4, pw = 110, ph = 220;
    c.save(); c.translate(px, py); c.rotate(.06 + Math.sin(t * .8) * .015);
    X.shadow(c, 30, 18, "rgba(17,24,39,.3)"); X.rr(c, -pw / 2, -ph / 2, pw, ph, 20); c.fillStyle = "#1f2430"; c.fill(); X.noShadow(c);
    c.save(); X.rr(c, -pw / 2 + 5, -ph / 2 + 5, pw - 10, ph - 10, 16); c.clip(); c.translate(-pw / 2 + 5, -ph / 2 + 5);
    appScreen(c, S, pw - 10, ph - 10, (t * 26) % 120, "phone"); c.restore();
    X.rr(c, -16, -ph / 2 + 9, 32, 8, 4); c.fillStyle = "#1f2430"; c.fill();
    ripple(c, 0, 30, t, 3.8, pal[2], 20); c.restore();
    // heading + badges
    const k = t < 4 ? 0 : 3, hd = S.lines[k].j, hp = X.win(t, k ? 4.1 : .4, k ? 8 : 4, .5, .3);
    c.save(); c.globalAlpha = hp; X.text(c, hd, 30, 34 + (1 - X.ease.out(X.clamp(hp))) * 8, { size: fit(c, hd, W * .55, 22, 800, S.f1), w: 800, fam: S.f1, color: pal[1], align: "left" }); c.restore();
    ["Unduh · iOS", "Unduh · Android"].forEach((b, i) => {
      const bp = X.spring(X.seg(t, 4.6 + i * .2, 5.8 + i * .2), 8, 5); if (bp <= 0) return;
      c.save(); c.translate(W * .66 + i * 104, H - 30); c.scale(bp, bp); X.shadow(c, 12, 5, "rgba(0,0,0,.25)"); X.rr(c, -48, -14, 96, 28, 8); c.fillStyle = pal[1]; c.fill(); X.noShadow(c);
      X.icon(c, i ? "play" : "phone", -34, 0, 13, "#fff", { lw: 2, fill: i ? "#fff" : undefined }); X.text(c, b, 8, 1, { size: 9.5, w: 700, fam: S.f2, color: "#fff" }); c.restore();
    });
  });

  /* ---------- terminal ---------- */
  PS.def("terminal", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    X.glow(c, W * .8, H * .1, 320, pal[3], .18); X.glow(c, W * .15, H * .95, 300, pal[2], .14);
    const z = 1 + .05 * X.ease.sine(t / 8), x = 44, y = 26, w = W - 88, h = H - 56;
    c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    X.shadow(c, 40, 20, "rgba(0,0,0,.6)"); X.rr(c, x, y, w, h, 12); c.fillStyle = pal[4]; c.fill(); X.noShadow(c);
    c.strokeStyle = "rgba(255,255,255,.08)"; c.stroke();
    ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { X.circle(c, x + 16 + i * 14, y + 14, 4.5); c.fillStyle = col; c.fill(); });
    X.text(c, "demo — zsh", x + w / 2, y + 14, { size: 10, w: 500, fam: "JetBrains Mono", color: X.a(pal[1], .5) });
    // tabs
    pill(c, x + w - 120, y + 7, 100, 14, "rgba(255,255,255,.05)"); X.text(c, "api.js", x + w - 70, y + 14.5, { size: 8.5, w: 500, fam: "JetBrains Mono", color: pal[3] });
    const K = "#ff7b72", Sg = "#a5d6ff", F = "#d2a8ff", Cm = "#8b949e", P = pal[1];
    const L = [
      [["$ ", pal[2]], ["npx create-app demo --api", P]],
      [["", P]],
      [["import ", K], ["{ kirim } ", P], ["from ", K], ["\"./tim\"", Sg]],
      [["export async function ", K], ["bagikan", F], ["(papan) {", P]],
      [["  // semua anggota melihat hal yang sama", Cm]],
      [["- ", "#f85149"], ["  return simpan(papan)", "#f85149"]],
      [["+ ", pal[2]], ["  return kirim(papan, { realtime: ", pal[2]], ["true", pal[3]], [" })", pal[2]]],
      [["}", P]],
      [["", P]],
      [["$ ", pal[2]], ["npm test", P]],
    ];
    const total = L.reduce((a, l) => a + l.reduce((b, s) => b + s[0].length, 0) + 4, 0);
    let budget = Math.floor(total * X.E(t, .3, 4.6, "lin")), cy = y + 46, lh = 17, last = [x + 20, cy];
    X.font(c, 500, 11.5, "JetBrains Mono");
    L.forEach((ln, li) => {
      const yy = cy + li * lh; let xx = x + 40;
      const isDiff = ln[0][0] === "- " || ln[0][0] === "+ ";
      if (isDiff && budget > 0) { c.fillStyle = ln[0][0] === "- " ? "rgba(248,81,73,.13)" : X.a(pal[2], .13); c.fillRect(x + 1, yy - 8.5, w - 2, lh); }
      if (budget > -4) X.text(c, String(li + 1).padStart(2, " "), x + 26, yy, { size: 9.5, w: 400, fam: "JetBrains Mono", color: X.a(pal[1], .25), align: "right" });
      ln.forEach(([s, col]) => { if (budget <= 0) return; const part = s.slice(0, budget); budget -= s.length;
        X.text(c, part, xx, yy, { size: 11.5, w: 500, fam: "JetBrains Mono", color: col, align: "left" }); X.font(c, 500, 11.5, "JetBrains Mono"); xx += c.measureText(part).width; last = [xx, yy]; });
      budget -= 4;
    });
    // output
    const op = X.seg(t, 4.9, 5.1);
    if (op > 0) {
      const oy = cy + L.length * lh; const sp = "⠋⠙⠹⠸⠼⠴⠦⠧"[Math.floor(t * 12) % 8];
      if (t < 5.7) X.text(c, sp + " menjalankan 12 tes…", x + 40, oy, { size: 11.5, w: 500, fam: "JetBrains Mono", color: X.a(pal[1], .7), align: "left" });
      else {
        const pp = X.spring(X.seg(t, 5.7, 6.5), 9, 6); c.save(); c.translate(x + 48, oy); c.scale(pp, pp); X.circle(c, 0, 0, 7); c.fillStyle = pal[2]; c.fill(); X.icon(c, "check", 0, 0, 10, pal[0], { lw: 3 }); c.restore();
        X.text(c, "12 tes lulus", x + 62, oy, { size: 11.5, w: 700, fam: "JetBrains Mono", color: pal[2], align: "left" });
        X.text(c, "· 0,8 dtk · siap rilis", x + 152, oy, { size: 11.5, w: 500, fam: "JetBrains Mono", color: X.a(pal[1], .6), align: "left", alpha: X.seg(t, 6, 6.5) });
        last = [x + 300, oy];
      }
    }
    if (Math.floor(t * 2.2) % 2 === 0 || t < 4.6) { c.fillStyle = pal[3]; c.fillRect(last[0] + 2, last[1] - 7, 7, 14); }
    c.restore();
    // floating badge
    const bp = X.spring(X.seg(t, 6.3, 7.2), 7, 5);
    if (bp > 0) { c.save(); c.translate(W - 120, 52); c.rotate(-.06); c.scale(bp, bp); X.shadow(c, 20, 8, "rgba(0,0,0,.5)"); X.rr(c, -70, -18, 140, 36, 18); c.fillStyle = pal[2]; c.fill(); X.noShadow(c);
      X.text(c, "v2.0 · Open source", 0, 1, { size: 11, w: 800, fam: S.f2, color: pal[0] }); c.restore(); }
  });

  /* ---------- chat ---------- */
  PS.def("chat", (c, t, S) => {
    const { W, H, pal } = S; bgSoft(c, S, t, .7);
    const x = 70, y = 18, w = W - 140, h = H - 36;
    X.shadow(c, 40, 16, "rgba(30,41,59,.16)"); X.rr(c, x, y, w, h, 16); c.fillStyle = "#fff"; c.fill(); X.noShadow(c);
    // header
    X.circle(c, x + 24, y + 22, 10); c.fillStyle = X.lgrad(c, x + 14, y + 12, x + 34, y + 32, [[0, pal[2]], [1, pal[3]]]); c.fill();
    X.icon(c, "star", x + 24, y + 22, 11, "#fff", { fill: "#fff", lw: 1 });
    X.text(c, "Asisten", x + 42, y + 22, { size: 12, w: 700, fam: S.f1, color: pal[1], align: "left" });
    X.circle(c, x + 92, y + 22, 3); c.fillStyle = "#22c55e"; c.fill();
    c.fillStyle = X.mix("#ffffff", pal[1], .08); c.fillRect(x, y + 42, w, 1);
    // input box with typing
    const prompt = "Ringkas rapat tim minggu ini jadi 3 poin", tp = X.seg(t, .3, 1.8), sent = t > 2;
    X.rr(c, x + 16, y + h - 44, w - 32, 30, 15); c.fillStyle = X.mix("#ffffff", pal[1], .04); c.fill(); c.strokeStyle = X.a(pal[2], sent ? .2 : .6); c.lineWidth = 1.2; c.stroke();
    const typedS = sent ? "" : X.typed(prompt, tp);
    X.text(c, typedS || (sent ? "Tanyakan apa saja…" : ""), x + 30, y + h - 29, { size: 11, w: 500, fam: S.f2, color: typedS ? pal[1] : X.a(pal[1], .35), align: "left" });
    if (!sent && Math.floor(t * 3) % 2 === 0) { const mw = X.measure(c, typedS, 500, 11, S.f2); c.fillStyle = pal[2]; c.fillRect(x + 31 + mw, y + h - 36, 1.5, 14); }
    const sb = 1 - Math.max(0, 1 - Math.abs(t - 1.95) * 7) * .2; c.save(); c.translate(x + w - 32, y + h - 29); c.scale(sb, sb); X.circle(c, 0, 0, 11); c.fillStyle = pal[2]; c.fill(); X.icon(c, "play", 1, 0, 11, "#fff", { fill: "#fff", lw: 1 }); c.restore();
    // user bubble
    const ub = X.spring(X.seg(t, 2, 2.8), 8, 5);
    if (ub > 0) { X.font(c, 500, 11, S.f2); const bw = c.measureText(prompt).width + 26; c.save(); c.translate(x + w - 20, y + 70); c.scale(ub, ub); X.rr(c, -bw, -14, bw, 28, 14); c.fillStyle = pal[2]; c.fill(); X.text(c, prompt, -bw / 2, 1, { size: 11, w: 500, fam: S.f2, color: "#fff" }); c.restore(); }
    // assistant
    if (t > 2.6) {
      X.circle(c, x + 30, y + 112, 9); c.fillStyle = X.lgrad(c, x + 20, y + 102, x + 40, y + 122, [[0, pal[2]], [1, pal[3]]]); c.fill();
      if (t < 3.4) { for (let i = 0; i < 3; i++) { X.circle(c, x + 52 + i * 10, y + 112 - Math.max(0, Math.sin(t * 10 - i * .8)) * 4, 3); c.fillStyle = X.a(pal[1], .4); c.fill(); } }
      else {
        const pts = ["1. Rilis fitur baru dimajukan ke Jumat.", "2. Tim desain pegang alur onboarding.", "3. Semua laporan pakai papan bersama."];
        const words = pts.join(" | ").split(" "); const shown = Math.floor(words.length * X.seg(t, 3.4, 5.4)); let n = 0;
        pts.forEach((p, i) => { const ws = p.split(" "); const vis = ws.slice(0, Math.max(0, Math.min(ws.length, shown - n))).join(" "); n += ws.length + 1;
          if (vis) X.text(c, vis, x + 48, y + 112 + i * 19, { size: 11, w: i === 0 ? 600 : 500, fam: S.f2, color: pal[1], align: "left" }); });
      }
      // result card
      const rc = X.spring(X.seg(t, 5.5, 6.5), 7, 5);
      if (rc > 0) {
        c.save(); c.translate(x + 48, y + 178); c.scale(1, rc); c.globalAlpha = X.clamp(rc);
        X.shadow(c, 18, 8, "rgba(30,41,59,.15)"); X.rr(c, 0, 0, 230, 68, 12); c.fillStyle = "#fff"; c.fill(); X.noShadow(c); c.strokeStyle = X.a(pal[3], .5); c.stroke();
        X.rr(c, 12, 12, 44, 44, 10); c.fillStyle = X.a(pal[3], .15); c.fill(); X.icon(c, "doc", 34, 34, 22, pal[3], { lw: 2 });
        X.text(c, "Ringkasan_rapat.pdf", 66, 26, { size: 11, w: 700, fam: S.f1, color: pal[1], align: "left" });
        const bp = X.E(t, 6, 7.2, "out5"); pill(c, 66, 42, 148, 6, X.mix("#ffffff", pal[1], .08)); pill(c, 66, 42, 148 * bp, 6, pal[3]);
        c.restore();
      }
      if (t > 6.8) { const sp = X.seg(t, 6.8, 7.5); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.globalAlpha = 1 - sp; X.icon(c, "star", x + 270 + Math.cos(a) * 26 * sp, y + 186 + Math.sin(a) * 26 * sp, 8, pal[2], { fill: pal[2], lw: 1 }); } c.globalAlpha = 1; }
    }
  });

  /* ---------- launch ---------- */
  PS.def("launch", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const em = X.E(t, 0, 2.4, "inOut"), cx = W / 2, cy = H * .44 - 10 * em;
    X.glow(c, cx, cy, 280 * (.6 + em * .5), pal[2], .42 * em); X.glow(c, cx, cy + 70, 200, pal[3], .12 * em);
    const rot = Math.sin(t * .5) * .35, ow = 190 * (Math.cos(rot) * .25 + .75), oh = 112;
    // reflection
    c.save(); c.globalAlpha = .18 * em; c.translate(cx, cy + oh + 30); c.scale(1, -.45); X.rr(c, -ow / 2, -oh / 2, ow, oh, 22); c.fillStyle = X.lgrad(c, 0, -oh / 2, 0, oh / 2, [[0, "#000"], [1, pal[4]]]); c.fill(); c.restore();
    c.save(); c.translate(cx, cy); c.globalAlpha = em;
    X.rr(c, -ow / 2, -oh / 2, ow, oh, 22); c.fillStyle = X.lgrad(c, -ow / 2, -oh / 2, ow / 2, oh / 2, [[0, "#2a2a2e"], [.5, pal[4]], [1, "#050505"]]); c.fill();
    c.save(); X.rr(c, -ow / 2, -oh / 2, ow, oh, 22); c.clip();
    const sw = ((t - 2.2) / 2.2) * (ow + 200) - ow / 2 - 100; c.fillStyle = X.lgrad(c, sw - 50, 0, sw + 50, 0, [[0, "rgba(255,255,255,0)"], [.5, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]); c.fillRect(-ow, -oh, ow * 2, oh * 2);
    c.restore();
    c.lineWidth = 1.5; X.rr(c, -ow / 2, -oh / 2, ow, oh, 22); c.strokeStyle = X.lgrad(c, -ow / 2, 0, ow / 2, 0, [[0, X.a(pal[2], .1)], [.5 + rot * .8, X.a(pal[2], .95)], [1, X.a(pal[2], .1)]]); c.stroke();
    X.circle(c, 0, 0, 14); c.fillStyle = X.a(pal[2], .25 + .2 * Math.sin(t * 3)); c.fill(); X.circle(c, 0, 0, 5); c.fillStyle = pal[2]; c.fill();
    c.restore();
    // horizon line
    c.fillStyle = X.lgrad(c, 0, 0, W, 0, [[0, "rgba(255,255,255,0)"], [.5, X.a(pal[3], .5)], [1, "rgba(255,255,255,0)"]]); c.fillRect(W * (.5 - .4 * em), cy + oh / 2 + 28, W * .8 * em, 1);
    // thin type
    const k = t < 4.6 ? 0 : 3, tx = S.lines[k].j, tp = X.win(t, k ? 4.8 : 2.6, k ? 8 : 4.6, .9, .4);
    const ls = X.lerp(9, 1.5, X.ease.out(X.seg(t, k ? 4.8 : 2.6, k ? 6.6 : 4.4)));
    c.save(); c.globalAlpha = tp; X.text(c, tx, cx, H * .82, { size: fit(c, tx, W * .8, 30, 300, S.f1), w: 300, fam: S.f1, color: pal[1], ls }); c.restore();
    X.text(c, k ? "Tersedia hari ini" : "Baru", cx, H * .91, { size: 10, w: 500, fam: S.f2, color: pal[3], ls: 3, alpha: tp * .9 });
    // light sweep over type
    const lsx = X.seg(t, 6.2, 7.4) * (W * .8) + W * .1; if (t > 6.2 && t < 7.4) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = Math.sin(Math.PI * X.seg(t, 6.2, 7.4)); X.glow(c, lsx, H * .82, 90, pal[2], .35); c.restore(); }
    X.grain(c, W, H, .12, t); X.vignette(c, W, H, .7);
  });

  /* ---------- onboarding (onboard | steps) ---------- */
  PS.def("onboarding", (c, t, S) => {
    const { W, H, pal } = S;
    if (S.v === "steps") {
      c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
      c.strokeStyle = X.mix(pal[0], pal[1], .05); c.lineWidth = 1; for (let i = 0; i < W; i += 24) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); } for (let j = 0; j < H; j += 24) { c.beginPath(); c.moveTo(0, j); c.lineTo(W, j); c.stroke(); }
      const k = Math.min(2, Math.floor(t / 2.5)), steps = ["Siapkan bahannya", "Pasang bagian ini", "Kencangkan & cek"];
      X.text(c, "Tutorial", 34, 34, { size: 11, w: 700, fam: S.f2, color: pal[2], align: "left", ls: 2 });
      X.text(c, S.lines[1].j, 34, 58, { size: fit(c, S.lines[1].j, 240, 20, 800, S.f1), w: 800, fam: S.f1, color: pal[1], align: "left" });
      steps.forEach((s, i) => {
        const yy = 108 + i * 72, on = i === k, done = t > i * 2.5 + 2.1, ap = X.E(t, .2 + i * .25, .9 + i * .25, "back");
        c.save(); c.globalAlpha = ap; c.translate((1 - ap) * -30, 0);
        if (on) { X.shadow(c, 18, 6, "rgba(15,23,42,.12)"); X.rr(c, 26, yy - 26, 250, 58, 14); c.fillStyle = "#fff"; c.fill(); X.noShadow(c); c.fillStyle = pal[2]; X.rr(c, 26, yy - 26, 4, 58, 2); c.fill(); }
        X.text(c, String(i + 1).padStart(2, "0"), 46, yy + 3, { size: 30, w: 800, fam: S.f1, color: on ? pal[2] : X.mix(pal[0], pal[1], .25), align: "left" });
        X.text(c, s, 100, yy - 6, { size: 13.5, w: 700, fam: S.f1, color: on ? pal[1] : X.mix(pal[0], pal[1], .5), align: "left" });
        bars(c, 100, yy + 8, 130, X.mix(pal[0], pal[1], .12), 1, 0, 4);
        const cp = X.spring(X.seg(t, i * 2.5 + 2.1, i * 2.5 + 2.8), 9, 6);
        if (done) { c.save(); c.translate(256, yy + 2); c.scale(cp, cp); X.circle(c, 0, 0, 11); c.fillStyle = pal[3]; c.fill(); X.icon(c, "check", 0, 0, 13, "#fff", { lw: 3 }); c.restore(); }
        c.restore();
      });
      // object panel + magnifier
      const ox = 300, oy = 30, ow = W - ox - 30, oh = H - 60;
      X.shadow(c, 30, 12, "rgba(15,23,42,.15)"); X.rr(c, ox, oy, ow, oh, 18); c.fillStyle = "#fff"; c.fill(); X.noShadow(c);
      const drawObj = () => {
        const cx = ox + ow / 2, cy = oy + oh / 2 + 10;
        X.rr(c, cx - 110, cy - 50, 220, 100, 14); c.fillStyle = X.mix("#fff", pal[1], .07); c.fill(); c.strokeStyle = pal[1]; c.lineWidth = 2.5; c.stroke();
        X.rr(c, cx - 90, cy - 30, 80, 60, 8); c.fillStyle = pal[2]; c.fill(); X.rr(c, cx - 82, cy - 22, 64, 30, 4); c.fillStyle = "#fff"; c.fill();
        [0, 1, 2].forEach((i) => { X.circle(c, cx + 28 + i * 0, cy - 22 + i * 24, 9); c.fillStyle = i === 1 ? pal[3] : "#fff"; c.fill(); c.strokeStyle = pal[1]; c.lineWidth = 2; c.stroke(); });
        [[cx + 70, cy - 24], [cx + 70, cy + 24]].forEach(([bx, by], i) => { X.circle(c, bx, by, 7); c.fillStyle = "#cbd5e1"; c.fill(); c.strokeStyle = pal[1]; c.stroke(); c.save(); c.translate(bx, by); c.rotate(i === 1 ? -X.E(t, 5.3, 6.6, "inOut") * Math.PI : 0); c.fillStyle = pal[1]; c.fillRect(-5, -1, 10, 2); c.restore(); });
        c.fillStyle = pal[1]; c.fillRect(cx - 120, cy + 50, 240, 6);
      };
      drawObj();
      const tg = [[ox + ow / 2 - 50, oy + oh / 2 + 4], [ox + ow / 2 + 28, oy + oh / 2 + 10], [ox + ow / 2 + 70, oy + oh / 2 + 34]];
      const kp = X.E(t, k * 2.5, k * 2.5 + .8, "out5"), a0 = tg[Math.max(0, k - 1)], a1 = tg[k], mp = [X.lerp(a0[0], a1[0], kp), X.lerp(a0[1], a1[1], kp)], R = 48;
      c.save(); X.circle(c, mp[0], mp[1], R); c.clip(); c.fillStyle = "#fff"; c.fill(); c.translate(mp[0], mp[1]); c.scale(2.1, 2.1); c.translate(-mp[0], -mp[1]); drawObj(); c.restore();
      X.shadow(c, 14, 4, "rgba(0,0,0,.25)"); X.circle(c, mp[0], mp[1], R); c.strokeStyle = pal[2]; c.lineWidth = 4; c.stroke(); X.noShadow(c);
      c.save(); c.translate(mp[0], mp[1]); c.rotate(.8); c.fillStyle = pal[1]; X.rr(c, R, -5, 34, 10, 5); c.fill(); c.restore();
      return;
    }
    // onboard
    bgSoft(c, S, t, .6);
    const x = 110, y = 24, w = W - 220, h = H - 48, k = Math.min(2, Math.floor(t / 2.4));
    X.shadow(c, 36, 16, "rgba(20,83,45,.15)"); X.rr(c, x, y, w, h, 18); c.fillStyle = "#fff"; c.fill(); X.noShadow(c);
    // stepper
    const sx = x + 70, ex = x + w - 70, syy = y + 36;
    c.lineWidth = 4; c.lineCap = "round"; c.strokeStyle = X.mix("#fff", pal[1], .1); c.beginPath(); c.moveTo(sx, syy); c.lineTo(ex, syy); c.stroke();
    const prog = X.clamp((X.E(t, 1.8, 2.5, "out5") + X.E(t, 4.2, 4.9, "out5")) / 2); c.strokeStyle = pal[2]; c.beginPath(); c.moveTo(sx, syy); c.lineTo(X.lerp(sx, ex, prog), syy); c.stroke();
    ["Akun", "Tim", "Selesai"].forEach((n, i) => {
      const px = X.lerp(sx, ex, i / 2), done = t > [1.9, 4.3, 6.6][i], act = i <= k; const pop = X.spring(X.seg(t, [1.9, 4.3, 6.6][i], [2.6, 5, 7.3][i]), 9, 6);
      X.circle(c, px, syy, 13 * (done ? .9 + .1 * pop : 1)); c.fillStyle = done ? pal[2] : act ? "#fff" : X.mix("#fff", pal[1], .06); c.fill(); c.lineWidth = 2.5; c.strokeStyle = act ? pal[2] : X.mix("#fff", pal[1], .15); c.stroke();
      if (done) X.icon(c, "check", px, syy, 14 * pop, "#fff", { lw: 3 }); else X.text(c, String(i + 1), px, syy + 1, { size: 11, w: 800, fam: S.f1, color: act ? pal[2] : X.mix("#fff", pal[1], .4) });
      X.text(c, n, px, syy + 24, { size: 9.5, w: 700, fam: S.f2, color: act ? pal[1] : X.mix("#fff", pal[1], .4) });
    });
    // panels slide
    const sl = X.E(t, 2.3, 2.8, "out5") + X.E(t, 4.7, 5.2, "out5");
    c.save(); X.rr(c, x + 1, y + 72, w - 2, h - 74, 16); c.clip();
    for (let s = 0; s < 3; s++) {
      c.save(); c.translate((s - sl) * w, 0); const px = x + 40, py = y + 84;
      if (s === 0) {
        X.text(c, "Buat akunmu", px, py + 8, { size: 17, w: 800, fam: S.f1, color: pal[1], align: "left" });
        ["Nama lengkap", "Email kerja"].forEach((f, i) => { const fy = py + 30 + i * 46; X.text(c, f, px, fy, { size: 9, w: 600, fam: S.f2, color: X.mix("#fff", pal[1], .5), align: "left" });
          X.rr(c, px, fy + 8, w - 80, 26, 8); c.strokeStyle = i === Math.floor(X.seg(t, .2, 1.6) * 2) ? pal[2] : X.mix("#fff", pal[1], .15); c.lineWidth = 1.5; c.stroke();
          X.text(c, X.typed(["Rani Pratiwi", "rani@tim.id"][i], X.seg(t, .2 + i * .7, .9 + i * .7)), px + 10, fy + 21, { size: 11, w: 500, fam: S.f2, color: pal[1], align: "left" }); });
      } else if (s === 1) {
        X.text(c, "Undang timmu", px, py + 8, { size: 17, w: 800, fam: S.f1, color: pal[1], align: "left" });
        for (let i = 0; i < 4; i++) { const ap = X.spring(X.seg(t, 2.9 + i * .25, 3.7 + i * .25), 8, 5); c.save(); c.translate(px + 22 + i * 56, py + 66); c.scale(ap, ap);
          X.circle(c, 0, 0, 20); c.fillStyle = [pal[2], pal[3], "#60a5fa", "#f472b6"][i]; c.fill(); X.text(c, "RDAB"[i], 0, 1, { size: 13, w: 800, fam: S.f1, color: "#fff" }); c.restore(); }
        X.text(c, "4 anggota bergabung", px, py + 112, { size: 11, w: 600, fam: S.f2, color: pal[2], align: "left", alpha: X.seg(t, 3.9, 4.3) });
      } else {
        const cp = X.spring(X.seg(t, 5.3, 6.2), 8, 5); X.circle(c, x + w / 2, py + 50, 30 * cp); c.fillStyle = pal[2]; c.fill(); X.icon(c, "check", x + w / 2, py + 50, 32 * cp, "#fff", { lw: 3.2, p: X.seg(t, 5.5, 6.1) });
        X.text(c, "Semua siap!", x + w / 2, py + 104, { size: 18, w: 800, fam: S.f1, color: pal[1], alpha: X.seg(t, 5.7, 6.2) });
        X.text(c, S.lines[3].j, x + w / 2, py + 128, { size: 11, w: 500, fam: S.f2, color: X.mix("#fff", pal[1], .55), alpha: X.seg(t, 5.9, 6.4) });
        confetti(c, x + w / 2, py + 50, t, 5.4, [pal[2], pal[3], "#60a5fa", "#f472b6"], 36, .9);
      }
      c.restore();
    }
    c.restore();
    // button
    const btnp = [1.85, 4.25].reduce((a, tt) => Math.max(a, 1 - Math.abs(t - tt) * 7), 0); if (t < 5) { c.save(); c.translate(x + w - 80, y + h - 30); c.scale(1 - btnp * .1, 1 - btnp * .1); X.rr(c, -48, -14, 96, 28, 14); c.fillStyle = pal[2]; c.fill(); X.text(c, "Lanjut →", 0, 1, { size: 11, w: 700, fam: S.f2, color: "#fff" }); c.restore();
      [1.85, 4.25].forEach((tt) => ripple(c, x + w - 80, y + h - 30, t, tt, pal[2])); }
  });

  /* ---------- notifs ---------- */
  PS.def("notifs", (c, t, S) => {
    const { W, H, pal } = S; bgSoft(c, S, t, .7);
    // counter (left)
    const cnt = Math.round(12480 * X.E(t, .3, 6.2, "out5")), cs = cnt.toLocaleString("id-ID");
    X.text(c, "Pengguna aktif", 40, 70, { size: 11, w: 700, fam: S.f2, color: pal[2], align: "left", ls: 1.5 });
    X.text(c, cs, 38, 108, { size: 46, w: 800, fam: S.f1, color: pal[1], align: "left", ls: -1 });
    const up = X.spring(X.seg(t, 1, 1.8), 7, 5); c.save(); c.translate(48, 146); c.scale(up, up); pill(c, -10, -11, 92, 22, X.a("#22c55e", .15)); X.text(c, "▲ 38% bulan ini", 36, 0.5, { size: 9.5, w: 700, fam: S.f2, color: "#16a34a" }); c.restore();
    // sparkline
    const sp = []; for (let i = 0; i <= 14; i++) sp.push([40 + i * 15, 220 - (i * 4 + Math.sin(i * 1.3) * 8 + Math.pow(i / 14, 2) * 40)]);
    c.lineWidth = 2.5; c.strokeStyle = pal[2]; c.lineJoin = "round"; X.poly(c, sp, X.seg(t, .6, 5.5)); c.stroke();
    const ep = X.polyEnd(sp, X.seg(t, .6, 5.5)); X.circle(c, ep[0], ep[1], 4.5); c.fillStyle = pal[2]; c.fill(); X.glow(c, ep[0], ep[1], 16, pal[2], .5);
    X.text(c, S.lines[2].j, 40, 262, { size: fit(c, S.lines[2].j, 240, 15, 800, S.f1), w: 800, fam: S.f1, color: pal[1], align: "left", alpha: X.seg(t, 1.5, 2.2) });
    // logos
    ["Nusa", "Kopiku", "Rantai", "Lumbung"].forEach((n, i) => { const a = X.E(t, 3 + i * .2, 3.6 + i * .2); c.save(); c.globalAlpha = a * .75; const lx = 40 + i * 66, ly = 312;
      c.fillStyle = X.mix(pal[0], pal[1], .55); if (i % 2) X.rr(c, lx, ly - 7, 13, 13, 3); else X.circle(c, lx + 6.5, ly - .5, 6.5); c.fill(); X.text(c, n, lx + 17, ly, { size: 10.5, w: 800, fam: S.f1, color: X.mix(pal[0], pal[1], .55), align: "left" }); c.restore(); });
    // notification stack (right)
    const N = [["Rani bergabung ke tim", "baru saja", pal[2], "user"], ["Pesanan #2041 masuk", "1 mnt", pal[3], "cart"], ["Ulasan ★★★★★ dari Dimas", "2 mnt", "#f59e0b", "star"], ["Laporan mingguan siap", "5 mnt", "#22c55e", "doc"], ["120 pengguna baru hari ini", "8 mnt", pal[2], "bell"]];
    const nx = W * .5, nw = W * .45, times = [.4, 1.6, 2.8, 4, 5.2];
    let arrived = times.filter((tt) => t >= tt).length;
    for (let i = arrived - 1; i >= 0; i--) {
      const order = arrived - 1 - i, age = t - times[i], sp2 = X.spring(X.seg(age, 0, .9), 8, 5.5);
      const prevShift = order === 0 ? 0 : 1; const slideIn = X.spring(X.seg(t - times[arrived - 1], 0, .8), 8, 5.5);
      const yy = 40 + (order - (1 - slideIn) * prevShift) * 64, sc = Math.max(.82, 1 - order * .04);
      if (order > 3) continue;
      c.save(); c.globalAlpha = X.clamp(sp2 * 1.5) * (1 - Math.max(0, order - 2.6)); c.translate(nx + nw / 2, yy + 26 - (1 - sp2) * 40); c.scale(sc, sc);
      X.shadow(c, 24, 10, "rgba(15,23,42,.16)"); X.rr(c, -nw / 2, -26, nw, 54, 14); c.fillStyle = "rgba(255,255,255,.96)"; c.fill(); X.noShadow(c);
      X.rr(c, -nw / 2 + 12, -14, 30, 30, 9); c.fillStyle = N[i][2]; c.fill(); X.icon(c, N[i][3], -nw / 2 + 27, 1, 16, "#fff", { lw: 2.2 });
      X.text(c, N[i][0], -nw / 2 + 52, -5, { size: fit(c, N[i][0], nw - 100, 11.5, 700, S.f2), w: 700, fam: S.f2, color: pal[1], align: "left" });
      X.text(c, "Aplikasimu · " + N[i][1], -nw / 2 + 52, 11, { size: 9, w: 500, fam: S.f2, color: X.mix("#fff", pal[1], .45), align: "left" });
      c.restore();
    }
    // badge bell
    const bb = X.beat(t, 50, 6); c.save(); c.translate(W - 34, 26); c.rotate(Math.sin(t * 20) * .2 * bb); X.icon(c, "bell", 0, 0, 20, pal[1], { lw: 2 }); c.restore();
    X.circle(c, W - 26, 19, 7); c.fillStyle = pal[3]; c.fill(); X.text(c, String(arrived), W - 26, 19.5, { size: 8.5, w: 800, fam: S.f2, color: "#fff" });
  });

  /* ---------- slides ---------- */
  PS.def("slides", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = X.mix(pal[4], pal[1], .04); c.fillRect(0, 0, W, H);
    const D = 8 / 3, k = Math.min(2, Math.floor(t / D)), lt = t - k * D;
    const data = [
      [S.lines[0].j, ["Satu ide per layar", "Kata kunci, bukan paragraf", "Gambar membantu ingatan"], "bolt"],
      [S.lines[2].j, ["Cek urutan langkah", "Jangan lewati persiapan", "Ulangi bagian sulit"], "search"],
      [S.lines[3].j, ["Tulis satu kalimat", "Hubungkan ke contoh", "Bagikan ke teman"], "check"],
    ];
    const sx = 34, sy = 24, sw = W - 68, sh = H - 62;
    const out = X.E(lt, D - .45, D, "inOut");
    const draw = (j, off, lt2) => {
      c.save(); c.translate(off, 0);
      X.shadow(c, 30, 12, "rgba(17,24,39,.15)"); X.rr(c, sx, sy, sw, sh, 14); c.fillStyle = pal[0]; c.fill(); X.noShadow(c);
      c.save(); X.rr(c, sx, sy, sw, sh, 14); c.clip();
      const bp = X.E(lt2, .05, .6, "out5"); c.fillStyle = [pal[2], pal[3], pal[2]][j]; c.fillRect(sx + sw - 190 * bp, sy, 190, sh);
      c.globalAlpha = .18; X.circle(c, sx + sw - 95, sy + sh * .5, 90 + 6 * Math.sin(t * 2)); c.fillStyle = "#fff"; c.fill(); c.globalAlpha = 1;
      X.icon(c, data[j][2], sx + sw - 95, sy + sh * .5, 70 * X.spring(X.seg(lt2, .3, 1.2), 8, 5), "#fff", { lw: 2.4 });
      c.restore();
      X.text(c, `0${j + 1}`, sx + 30, sy + 34, { size: 11, w: 800, fam: S.f2, color: pal[2], align: "left", ls: 2 });
      const tp = X.E(lt2, .15, .7, "out5"), ttl = data[j][0];
      c.save(); c.beginPath(); c.rect(sx + 20, sy + 44, sw - 230, 44); c.clip();
      X.text(c, ttl, sx + 30, sy + 66 + (1 - tp) * 40, { size: fit(c, ttl, sw - 250, 28, 800, S.f1), w: 800, fam: S.f1, color: pal[1], align: "left" }); c.restore();
      data[j][1].forEach((b, i) => { const p = X.E(lt2, .8 + i * .45, 1.25 + i * .45, "back"); if (p <= 0) return;
        c.save(); c.globalAlpha = X.clamp(p); c.translate((1 - p) * -24, 0); const by = sy + 120 + i * 40;
        X.rr(c, sx + 30, by - 13, 26, 26, 8); c.fillStyle = X.a(pal[2], .12); c.fill(); X.text(c, String(i + 1), sx + 43, by + .5, { size: 12, w: 800, fam: S.f1, color: pal[2] });
        X.text(c, b, sx + 68, by, { size: 15, w: 600, fam: S.f2, color: pal[1], align: "left" }); c.restore(); });
      c.restore();
    };
    draw(k, -out * (W + 20), lt);
    if (k < 2 && out > 0) draw(k + 1, (1 - out) * (W + 20), 0);
    // progress
    const pp = X.clamp(t / 7.8); pill(c, sx, H - 24, sw, 5, X.mix(pal[4], pal[1], .12)); pill(c, sx, H - 24, sw * pp, 5, pal[2]);
    X.text(c, `${k + 1} / 3`, W - sx, H - 36, { size: 9.5, w: 700, fam: S.f2, color: X.mix(pal[4], pal[1], .5), align: "right" });
  });

  /* ---------- micro (9:16) ---------- */
  PS.def("micro", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { c.save(); c.globalAlpha = .12; c.translate(X.hash(i) * W, (X.hash(i + 4) * H + t * 20 * (1 + i % 3)) % (H + 40) - 20); c.rotate(t * .5 + i); c.fillStyle = i % 2 ? pal[2] : pal[3]; X.rr(c, -14, -14, 28, 28, 8); c.fill(); c.restore(); }
    // story segments
    for (let i = 0; i < 4; i++) { const sw = (W - 40 - 18) / 4, x = 20 + i * (sw + 6); pill(c, x, 18, sw, 4, X.a(pal[1], .15)); pill(c, x, 18, sw * X.seg(t, i * 2, i * 2 + 2), 4, pal[1]); }
    X.text(c, "MICROLEARNING · 60 DTK", 20, 42, { size: 9.5, w: 800, fam: S.f2, color: pal[3], align: "left", ls: 1.5 });
    // ring timer
    const rc = [W - 52, 52], rp = 1 - t / 8; c.lineWidth = 5; c.strokeStyle = X.a(pal[1], .1); X.circle(c, rc[0], rc[1], 22); c.stroke();
    c.strokeStyle = pal[2]; c.lineCap = "round"; c.beginPath(); c.arc(rc[0], rc[1], 22, -Math.PI / 2, -Math.PI / 2 + TAU * rp); c.stroke();
    X.text(c, String(Math.ceil(60 * rp)), rc[0], rc[1] + 1, { size: 14, w: 800, fam: S.f1, color: pal[1] });
    // keyword card
    const kp = X.spring(X.seg(t, .2, 1.3), 6, 4.5);
    c.save(); c.translate(W / 2, 175); c.rotate(-.03 * (1 - kp)); c.scale(.8 + .2 * kp, .8 + .2 * kp); c.globalAlpha = X.clamp(kp * 2);
    X.shadow(c, 30, 14, "rgba(0,0,0,.18)"); X.rr(c, -(W - 48) / 2, -70, W - 48, 140, 22); c.fillStyle = pal[4]; c.fill(); X.noShadow(c);
    X.text(c, "KONSEP HARI INI", 0, -42, { size: 9.5, w: 800, fam: S.f2, color: pal[2], ls: 2 });
    const kw = "Cek Dulu", bz = 1 + .04 * X.beat(t, 60, 5);
    c.save(); c.scale(bz, bz); X.text(c, kw, 0, 0, { size: fit(c, kw, W - 90, 44, 800, S.f1), w: 800, fam: S.f1, color: pal[1] }); c.restore();
    const ul = X.E(t, .9, 1.6, "out5"); c.fillStyle = X.a(pal[2], .55); X.rr(c, -90, 18, 180 * ul, 8, 4); c.fill();
    X.text(c, S.lines[0].c, 0, 44, { size: fit(c, S.lines[0].c, W - 90, 11, 500, S.f2), w: 500, fam: S.f2, color: X.a(pal[1], .7) });
    c.restore();
    // 3 tips
    const tips = [["check", "Lihat sekeliling sebelum mulai"], ["lock", "Pakai alat pelindung"], ["bell", "Lapor bila ada bahaya"]];
    tips.forEach(([ic, s], i) => { const p = X.spring(X.seg(t, 1.8 + i * 1.2, 2.8 + i * 1.2), 8, 5.5); if (p <= 0) return;
      const y = 300 + i * 74; c.save(); c.translate((1 - p) * W * .6, 0); c.globalAlpha = X.clamp(p * 2);
      X.shadow(c, 14, 6, "rgba(0,0,0,.1)"); X.rr(c, 24, y, W - 48, 60, 16); c.fillStyle = pal[4]; c.fill(); X.noShadow(c);
      X.circle(c, 56, y + 30, 18); c.fillStyle = i === 1 ? pal[2] : pal[3]; c.fill(); X.icon(c, ic, 56, y + 30, 18, "#fff", { lw: 2.4 });
      X.text(c, "Tips " + (i + 1), 86, y + 20, { size: 9, w: 800, fam: S.f2, color: pal[2], align: "left", ls: 1 });
      X.text(c, s, 86, y + 38, { size: fit(c, s, W - 130, 13, 700, S.f1), w: 700, fam: S.f1, color: pal[1], align: "left" }); c.restore(); });
    // bottom cta
    const bp = X.E(t, 5.6, 6.3, "back"); if (bp > 0) { c.save(); c.globalAlpha = X.clamp(bp); c.translate(W / 2, H - 50 + (1 - bp) * 20); pill(c, -110, -20, 220, 40, pal[1]); X.text(c, S.lines[3].j.split(" ").slice(0, 4).join(" "), 0, 1, { size: fit(c, S.lines[3].j.split(" ").slice(0, 4).join(" "), 190, 13, 700, S.f2), w: 700, fam: S.f2, color: pal[0] }); c.restore(); }
  });

  /* ---------- quiz ---------- */
  PS.def("quiz", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { c.globalAlpha = .08; X.circle(c, X.hash(i) * W, (X.hash(i + 2) * H + Math.sin(t + i) * 6), 10 + X.hash(i + 7) * 30); c.fillStyle = i % 2 ? pal[2] : pal[3]; c.fill(); } c.globalAlpha = 1;
    const qp = X.E(t, 0, .7, "back");
    c.save(); c.translate(W / 2, 70 - (1 - qp) * 50); c.globalAlpha = X.clamp(qp);
    X.shadow(c, 24, 10, "rgba(46,26,71,.15)"); X.rr(c, -250, -46, 500, 92, 18); c.fillStyle = pal[4]; c.fill(); X.noShadow(c);
    pill(c, -232, -34, 104, 20, X.a(pal[2], .15)); X.text(c, "Pertanyaan 1/5", -180, -23.5, { size: 9.5, w: 800, fam: S.f2, color: pal[2] });
    const q = "Bagian mana yang paling sering keliru?"; X.text(c, q, 0, 10, { size: fit(c, q, 460, 19, 800, S.f1), w: 800, fam: S.f1, color: pal[1] });
    // timer bar
    const tb = 1 - X.seg(t, .7, 4.2); pill(c, -232, 30, 464, 6, X.a(pal[1], .08)); pill(c, -232, 30, 464 * tb, 6, tb < .3 ? "#ef4444" : pal[2]);
    c.restore();
    const opts = ["Takaran bahan", "Urutan langkah", "Waktu tunggu", "Alat yang dipakai"], right = 1, rev = X.seg(t, 4.3, 4.6), sel = t > 3.1;
    opts.forEach((o, i) => {
      const col = i % 2, row = (i / 2) | 0, ox = W / 2 - 250 + col * 256, oy = 140 + row * 70, p = X.spring(X.seg(t, .5 + i * .15, 1.4 + i * .15), 8, 5);
      const isR = i === right, dim = rev > 0 && !isR ? .4 : 1;
      c.save(); c.globalAlpha = X.clamp(p * 1.5) * (1 - (1 - dim) * rev); c.translate(ox + 122, oy + 27); const pop = isR ? 1 + .06 * Math.sin(Math.PI * X.seg(t, 4.3, 4.8)) : 1; c.scale(p * pop, p * pop);
      X.shadow(c, 14, 6, "rgba(46,26,71,.12)"); X.rr(c, -122, -27, 244, 54, 14); c.fillStyle = isR && rev ? pal[3] : "#fff"; c.fill(); X.noShadow(c);
      if (sel && isR && !rev) { c.strokeStyle = pal[2]; c.lineWidth = 2.5; c.stroke(); }
      X.circle(c, -96, 0, 14); c.fillStyle = isR && rev ? "rgba(255,255,255,.25)" : X.a(pal[2], .12); c.fill();
      X.text(c, "ABCD"[i], -96, 1, { size: 12, w: 800, fam: S.f1, color: isR && rev ? "#fff" : pal[2] });
      X.text(c, o, -72, 1, { size: 13, w: 700, fam: S.f2, color: isR && rev ? "#fff" : pal[1], align: "left" });
      if (isR && rev) { const cp = X.spring(X.seg(t, 4.4, 5.2), 9, 6); c.save(); c.translate(96, 0); c.scale(cp, cp); X.circle(c, 0, 0, 13); c.fillStyle = "#fff"; c.fill(); X.icon(c, "check", 0, 0, 14, pal[3], { lw: 3 }); c.restore(); }
      c.restore();
    });
    // cursor picks B
    if (t > 1.8 && t < 4.4) { const cp = [X.lerp(W - 60, W / 2 + 140, X.E(t, 1.9, 3, "inOut")), X.lerp(H - 20, 168, X.E(t, 1.9, 3, "inOut"))]; ripple(c, W / 2 + 140, 168, t, 3.1, pal[2]); cursor(c, cp[0], cp[1], 1, X.clamp(1 - Math.abs(t - 3.1) * 8)); }
    confetti(c, W / 2 + 6, 168, t, 4.4, [pal[2], pal[3], "#f59e0b", "#f472b6"], 44, 1.1);
    // score
    const sp = X.spring(X.seg(t, 5, 5.8), 8, 5); if (sp > 0) { c.save(); c.translate(W / 2, H - 34); c.scale(sp, sp); pill(c, -90, -17, 180, 34, pal[1]); X.text(c, "Benar! +10 poin", 0, 1, { size: 13, w: 800, fam: S.f1, color: "#fff" }); c.restore(); }
    if (t > 6.3) X.text(c, S.lines[3].c, W / 2, H - 70, { size: fit(c, S.lines[3].c, W - 80, 11, 500, S.f2), w: 500, fam: S.f2, color: X.a(pal[1], .6), alpha: X.seg(t, 6.3, 6.8) });
  });

  /* ---------- science ---------- */
  PS.def("science", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { const tw = .4 + .6 * Math.abs(Math.sin(t * 1.5 + i)); c.fillStyle = `rgba(255,255,255,${.12 + X.hash(i + 2) * .35 * tw})`; c.fillRect(X.hash(i) * W, X.hash(i + 30) * H, 1.5, 1.5); }
    const D = 8 / 3, k = Math.min(2, Math.floor(t / D)), lt = t - k * D, cx = W * .58, cy = H * .5;
    const scene = (j, sc, a) => {
      if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(cx, cy); c.scale(sc, sc);
      if (j === 0) { // planet + moon
        X.glow(c, 0, 0, 150, pal[3], .25); X.circle(c, 0, 0, 80); c.fillStyle = pal[3]; c.fill();
        c.save(); X.circle(c, 0, 0, 80); c.clip(); c.fillStyle = X.shade(pal[3], -.25); for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(-60 + ((i * 50 + t * 14) % 200), -40 + i * 22, 30, 10, .2, 0, TAU); c.fill(); }
        c.fillStyle = "rgba(0,0,0,.28)"; X.circle(c, 34, 22, 90); c.fill(); c.restore();
        c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 130, 40, -.2, 0, TAU); c.stroke();
        const ma = t * 1.2; const mx = Math.cos(ma) * 130, my = Math.sin(ma) * 40; const rx = mx * Math.cos(-.2) - my * Math.sin(-.2), ry = mx * Math.sin(-.2) + my * Math.cos(-.2);
        X.circle(c, rx, ry, 12); c.fillStyle = pal[2]; c.fill();
      } else if (j === 1) { // cell
        c.save(); c.rotate(t * .1); c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 95 + Math.sin(a * 5 + t * 2) * 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * .8); } c.closePath();
        c.fillStyle = X.a(pal[3], .25); c.fill(); c.lineWidth = 5; c.strokeStyle = pal[3]; c.stroke(); c.restore();
        X.circle(c, -10 + Math.sin(t) * 3, 0, 32); c.fillStyle = pal[2]; c.fill(); X.circle(c, -16, -6, 11); c.fillStyle = X.shade(pal[2], -.25); c.fill();
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + t * .3; c.save(); c.translate(Math.cos(a) * 62, Math.sin(a) * 46); c.rotate(a); c.fillStyle = i % 2 ? "#fff" : pal[4] === pal[0] ? "#fff" : X.shade(pal[3], .4); c.beginPath(); c.ellipse(0, 0, 12, 6, 0, 0, TAU); c.fill(); c.restore(); }
      } else { // atom
        X.glow(c, 0, 0, 60, pal[2], .6); for (let i = 0; i < 6; i++) { X.circle(c, Math.cos(i * 2.1) * 9, Math.sin(i * 2.1) * 9, 9); c.fillStyle = i % 2 ? pal[2] : "#fff"; c.fill(); }
        for (let o = 0; o < 3; o++) { c.save(); c.rotate(o * Math.PI / 3); c.strokeStyle = X.a(pal[3], .7); c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 110, 34, 0, 0, TAU); c.stroke();
          const a = t * (2 + o * .4) + o * 2; X.glow(c, Math.cos(a) * 110, Math.sin(a) * 34, 14, pal[3], .9); X.circle(c, Math.cos(a) * 110, Math.sin(a) * 34, 6); c.fillStyle = "#fff"; c.fill(); c.restore(); }
      }
      c.restore();
    };
    const zout = X.E(lt, D - .55, D, "in");
    scene(k, 1 + zout * 3.2, 1 - zout); if (k < 2) scene(k + 1, .25 + zout * .75, zout); if (k === 0 && lt < .8) {}
    if (k > 0 && lt < .5) {} // incoming handled by previous
    const intro = k === 0 ? X.E(lt, 0, .8, "out5") : 1; if (k === 0 && intro < 1) { c.save(); c.globalAlpha = 1 - intro; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H); c.restore(); }
    // labels (left)
    const names = [["Bumi", "10⁷ m", "Planet berbatu ketiga"], ["Sel", "10⁻⁵ m", "Satuan terkecil kehidupan"], ["Atom", "10⁻¹⁰ m", "Inti + elektron yang mengorbit"]][k];
    const lp = X.win(lt, .35, D - .2, .45, .35);
    c.save(); c.globalAlpha = lp; c.translate((1 - X.clamp(lp)) * -16, 0);
    X.text(c, "SKALA " + names[1], 36, H * .34, { size: 10, w: 800, fam: S.f2, color: pal[2], align: "left", ls: 2 });
    X.text(c, names[0], 34, H * .46, { size: 40, w: 800, fam: S.f1, color: pal[1], align: "left" });
    X.text(c, names[2], 36, H * .56, { size: 12, w: 500, fam: S.f2, color: X.a(pal[1], .7), align: "left" });
    // leader line to object
    c.strokeStyle = X.a(pal[1], .5); c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(36, H * .62); c.lineTo(36 + 150 * X.clamp(lp), H * .62); c.lineTo(cx - 70, cy + 30); c.stroke(); c.setLineDash([]);
    X.circle(c, cx - 70, cy + 30, 3); c.fillStyle = pal[1]; c.fill();
    c.restore();
    // scale bar
    for (let i = 0; i < 3; i++) { X.circle(c, 40 + i * 18, H - 26, i === k ? 5 : 3); c.fillStyle = i === k ? pal[2] : X.a(pal[1], .3); c.fill(); }
    X.text(c, "zoom in ▸", 100, H - 25, { size: 9, w: 600, fam: S.f2, color: X.a(pal[1], .5), align: "left" });
  });

  /* ---------- blueprint ---------- */
  PS.def("blueprint", (c, t, S) => {
    const { W, H, pal } = S;
    if (!S._bp) { const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"); g.fillStyle = pal[0]; g.fillRect(0, 0, W, H);
      for (let x = 0; x <= W; x += 10) { g.strokeStyle = x % 50 ? X.a(pal[3], .1) : X.a(pal[3], .25); g.lineWidth = 1; g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); }
      for (let y = 0; y <= H; y += 10) { g.strokeStyle = y % 50 ? X.a(pal[3], .1) : X.a(pal[3], .25); g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
      S._bp = cv; }
    const pan = X.E(t, 0, 8, "sine"); c.save(); c.translate(-12 * pan, -6 * pan); c.drawImage(S._bp, 0, 0); c.drawImage(S._bp, W, 0); c.drawImage(S._bp, 0, H); c.restore();
    const ink = pal[1], acc = pal[2], mono = "IBM Plex Mono";
    c.strokeStyle = ink; c.lineWidth = 1.6; c.lineCap = "round";
    const cx = 200, cy = 175, R = 92, d = (p) => X.seg(t, p[0], p[1]);
    // front view: flange with bolt holes
    X.drawOn(c, (g) => g.arc(cx, cy, R, -Math.PI / 2, Math.PI * 1.5), d([.2, 1.4]), 600);
    X.drawOn(c, (g) => g.arc(cx, cy, 36, -Math.PI / 2, Math.PI * 1.5), d([.9, 1.7]), 240);
    c.save(); c.setLineDash([8, 3, 2, 3]); c.globalAlpha = .7 * d([.4, .8]); c.lineWidth = .8; c.beginPath(); c.moveTo(cx - R - 18, cy); c.lineTo(cx + R + 18, cy); c.moveTo(cx, cy - R - 18); c.lineTo(cx, cy + R + 18); c.stroke(); c.beginPath(); c.arc(cx, cy, 66, 0, TAU); c.stroke(); c.restore();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2, p = d([1.4 + i * .12, 1.7 + i * .12]); if (p > 0) X.drawOn(c, (g) => g.arc(cx + Math.cos(a) * 66, cy + Math.sin(a) * 66, 9, 0, TAU), p, 60); }
    // keyway
    X.drawOn(c, (g) => { g.moveTo(cx - 8, cy - 35); g.lineTo(cx - 8, cy - 46); g.lineTo(cx + 8, cy - 46); g.lineTo(cx + 8, cy - 35); }, d([1.7, 2.1]), 50);
    // side view
    const sx = 390, sw = 34;
    X.drawOn(c, (g) => { g.rect(sx, cy - R, sw, R * 2); }, d([2, 3]), 450);
    X.drawOn(c, (g) => { g.rect(sx + sw, cy - 36, 90, 72); }, d([2.6, 3.4]), 330);
    c.save(); c.globalAlpha = .45 * d([3, 3.4]); c.setLineDash([4, 3]); c.beginPath(); c.moveTo(sx, cy - 46); c.lineTo(sx + sw + 90, cy - 46); c.moveTo(sx, cy + 46); c.lineTo(sx + sw, cy + 46); c.stroke(); c.restore();
    // hatch
    c.save(); c.globalAlpha = d([3.3, 3.8]) * .5; c.beginPath(); c.rect(sx + sw, cy - 36, 90, 72); c.clip(); c.lineWidth = .8; for (let i = -80; i < 140; i += 8) { c.beginPath(); c.moveTo(sx + sw + i, cy + 36); c.lineTo(sx + sw + i + 72, cy - 36); c.stroke(); } c.restore();
    // dimensions
    const dim = (x1, y1, x2, y2, label, p, off) => { if (p <= 0) return; c.save(); c.globalAlpha = X.clamp(p * 2); c.strokeStyle = acc; c.fillStyle = acc; c.lineWidth = 1;
      const ex = X.lerp(x1, x2, X.ease.out(p)), ey = X.lerp(y1, y2, X.ease.out(p)); c.beginPath(); c.moveTo(x1, y1); c.lineTo(ex, ey); c.stroke();
      const ar = (x, y, a) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(a - .35) * 7, y - Math.sin(a - .35) * 7); c.lineTo(x - Math.cos(a + .35) * 7, y - Math.sin(a + .35) * 7); c.closePath(); c.fill(); };
      const a = Math.atan2(y2 - y1, x2 - x1); ar(x1, y1, a + Math.PI); if (p > .95) ar(x2, y2, a);
      X.text(c, label, (x1 + x2) / 2 + off[0], (y1 + y2) / 2 + off[1], { size: 10, w: 700, fam: mono, color: acc, alpha: X.seg(p, .6, 1) }); c.restore(); };
    dim(cx - R, cy + R + 26, cx + R, cy + R + 26, "Ø 184", d([3.4, 4.2]), [0, 11]);
    dim(sx, cy - R - 16, sx + sw, cy - R - 16, "34", d([3.8, 4.4]), [0, -9]);
    dim(sx + sw + 104, cy - 36, sx + sw + 104, cy + 36, "72", d([4.1, 4.7]), [16, 0]);
    // extension lines
    c.save(); c.strokeStyle = X.a(acc, .6); c.lineWidth = .7; c.globalAlpha = d([3.3, 3.6]); c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx - R, cy + R + 32); c.moveTo(cx + R, cy); c.lineTo(cx + R, cy + R + 32); c.stroke(); c.restore();
    // callout
    const cp = X.E(t, 4.8, 5.6, "out5"); if (cp > 0) { const p0 = [cx + Math.cos(-Math.PI / 6) * 66, cy + Math.sin(-Math.PI / 6) * 66];
      c.save(); c.strokeStyle = pal[1]; c.lineWidth = 1; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p0[0] + 60 * cp, p0[1] - 60 * cp); c.lineTo(p0[0] + 60 * cp + 70 * X.seg(cp, .5, 1), p0[1] - 60 * cp); c.stroke();
      X.circle(c, p0[0], p0[1], 3); c.fill(); X.text(c, "6× M16 baut", p0[0] + 66, p0[1] - 70, { size: 10, w: 700, fam: mono, color: pal[1], align: "left", alpha: X.seg(cp, .6, 1) });
      const pulse = (t * 1.4) % 1; c.globalAlpha = 1 - pulse; c.strokeStyle = acc; X.circle(c, p0[0], p0[1], 10 + pulse * 14); c.stroke(); c.restore(); }
    // title block
    const tb = X.E(t, .3, 1.1, "out5"), bx = W - 190, by = H - 70;
    c.save(); c.globalAlpha = tb; c.strokeStyle = pal[1]; c.lineWidth = 1.2; c.strokeRect(bx, by, 172, 52); c.beginPath(); c.moveTo(bx, by + 22); c.lineTo(bx + 172, by + 22); c.moveTo(bx + 110, by + 22); c.lineTo(bx + 110, by + 52); c.stroke();
    X.text(c, (S.lines[2].j || "PERHATIKAN BAGIAN INI").toUpperCase(), bx + 8, by + 11.5, { size: fit(c, (S.lines[2].j || "").toUpperCase(), 156, 9.5, 700, mono), w: 700, fam: mono, color: pal[1], align: "left" });
    X.text(c, "FLENS-01  REV B", bx + 8, by + 37, { size: 8.5, w: 500, fam: mono, color: X.a(pal[1], .8), align: "left" }); X.text(c, "1 : 2", bx + 141, by + 37, { size: 10, w: 700, fam: mono, color: acc }); c.restore();
    X.text(c, "GAMBAR TEKNIK · TAMPAK DEPAN / SAMPING", 24, 22, { size: 9, w: 700, fam: mono, color: X.a(pal[1], .75), align: "left", ls: 1, alpha: tb });
  });

  /* ---------- kids ---------- */
  PS.def("kids", (c, t, S) => {
    const { W, H, pal } = S; c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const cols = [pal[2], pal[3], pal[4], "#FFCA3A", "#6A4C93"];
    // sun with face
    c.save(); c.translate(70, 62); c.rotate(t * .6); c.fillStyle = "#FFCA3A"; for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); X.rr(c, 38, -5, 16 + 4 * Math.sin(t * 4 + i), 10, 5); c.fill(); } c.restore();
    X.circle(c, 70, 62, 34); c.fillStyle = "#FFCA3A"; c.fill(); X.circle(c, 70, 62, 34); c.strokeStyle = X.shade("#FFCA3A", -.15); c.lineWidth = 3; c.stroke();
    const bl = (t % 3) > 2.85 ? .1 : 1; c.fillStyle = pal[1]; c.beginPath(); c.ellipse(59, 56, 3.5, 4.5 * bl, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(81, 56, 3.5, 4.5 * bl, 0, 0, TAU); c.fill();
    c.lineWidth = 3; c.strokeStyle = pal[1]; c.beginPath(); c.arc(70, 66, 10, .2, Math.PI - .2); c.stroke(); X.circle(c, 52, 70, 5); c.fillStyle = X.a(pal[2], .5); c.fill(); X.circle(c, 88, 70, 5); c.fill();
    // clouds
    [[W * .62, 50, 1], [W * .86, 92, .8]].forEach(([x, y, s], i) => { const dx = Math.sin(t * .5 + i) * 12; c.fillStyle = "#fff"; [[0, 0, 22], [22, -8, 26], [46, 0, 20]].forEach(([a, b, r]) => { X.circle(c, x + dx + a * s, y + b * s, r * s); c.fill(); }); });
    // hills
    c.fillStyle = pal[4]; c.beginPath(); c.moveTo(0, H); c.lineTo(0, H - 60); c.quadraticCurveTo(W * .25, H - 110, W * .5, H - 62); c.quadraticCurveTo(W * .75, H - 20, W, H - 80); c.lineTo(W, H); c.fill();
    c.fillStyle = X.shade(pal[4], -.15); c.beginPath(); c.moveTo(0, H); c.lineTo(0, H - 30); c.quadraticCurveTo(W * .4, H - 70, W * .7, H - 34); c.quadraticCurveTo(W * .9, H - 16, W, H - 30); c.lineTo(W, H); c.fill();
    // balloons
    [[W * .82, 1.1, pal[2]], [W * .9, 1.6, pal[3]], [W * .74, 2.1, "#FFCA3A"]].forEach(([x, ph, col], i) => {
      const y = H * .55 - ((t * 22 + i * 70) % (H * .8)) * .35 + Math.sin(t * 2 + ph) * 6, sx = x + Math.sin(t * 1.3 + ph) * 8;
      c.strokeStyle = X.a(pal[1], .5); c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx, y + 28); c.quadraticCurveTo(sx + 8, y + 48, sx - 2, y + 70); c.stroke();
      c.fillStyle = col; c.beginPath(); c.ellipse(sx, y, 20, 26, 0, 0, TAU); c.fill(); c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.ellipse(sx - 7, y - 9, 5, 8, -.4, 0, TAU); c.fill();
    });
    // bouncy letters
    const k = t < 4 ? 0 : 1, word = k ? "1 · 2 · 3" : "Ayo Belajar!", t0 = k ? 4 : .2;
    X.font(c, 800, 58, S.f1); const chars = word.split(""), widths = chars.map((ch) => c.measureText(ch).width), tw = widths.reduce((a, b) => a + b, 0);
    const scale = Math.min(1, (W * .7) / tw); let x = W / 2 - tw * scale / 2; const wp = X.win(t, t0, k ? 7.9 : 4, .01, .35);
    chars.forEach((ch, i) => {
      const p = X.seg(t, t0 + i * .07, t0 + i * .07 + .7), y = H * .48 - (1 - X.ease.bounce(p)) * 160 - Math.abs(Math.sin(t * 3 + i * .6)) * 6 * (p >= 1);
      const sq = p >= 1 ? 1 + Math.sin(t * 6 + i) * .03 : 1;
      if (ch !== " " && p > 0) { c.save(); c.globalAlpha = wp; c.translate(x + widths[i] * scale / 2, y); c.rotate(Math.sin(t * 2 + i) * .08); c.scale(scale * sq, scale / sq);
        X.text(c, ch, 3, 4, { size: 58, w: 800, fam: S.f1, color: X.a(pal[1], .25) }); X.text(c, ch, 0, 0, { size: 58, w: 800, fam: S.f1, color: cols[i % 3], stroke: "#fff", lw: 6 }); X.text(c, ch, 0, 0, { size: 58, w: 800, fam: S.f1, color: cols[i % 3] }); c.restore(); }
      x += widths[i] * scale;
    });
    // shapes with faces in second beat
    if (k) [["circle", pal[2]], ["tri", pal[3]], ["sq", "#FFCA3A"]].forEach(([sh, col], i) => {
      const p = X.spring(X.seg(t, 4.6 + i * .3, 5.6 + i * .3), 8, 5); if (p <= 0) return; const sx = W * .3 + i * W * .2, sy = H * .74 + Math.sin(t * 4 + i) * 4;
      c.save(); c.translate(sx, sy); c.scale(p, p); c.fillStyle = col; if (sh === "circle") { X.circle(c, 0, 0, 24); c.fill(); } else if (sh === "tri") { c.beginPath(); c.moveTo(0, -28); c.lineTo(28, 20); c.lineTo(-28, 20); c.closePath(); c.fill(); } else { X.rr(c, -23, -23, 46, 46, 9); c.fill(); }
      c.fillStyle = pal[1]; X.circle(c, -7, -2, 3); c.fill(); X.circle(c, 7, -2, 3); c.fill(); c.lineWidth = 2.5; c.strokeStyle = pal[1]; c.beginPath(); c.arc(0, 4, 6, .3, Math.PI - .3); c.stroke(); c.restore();
    });
    else X.text(c, S.lines[0].c, W / 2, H * .66, { size: fit(c, S.lines[0].c, W * .7, 15, 700, S.f2), w: 700, fam: S.f2, color: pal[1], alpha: X.win(t, 1.4, 4, .4, .35) });
    // falling confetti
    for (let i = 0; i < 26; i++) { const y = ((t * (40 + X.hash(i) * 40) + X.hash(i + 3) * H) % (H + 20)) - 10, x = X.hash(i + 8) * W + Math.sin(t * 2 + i) * 10;
      c.save(); c.translate(x, y); c.rotate(t * 3 + i); c.fillStyle = cols[i % 5]; if (i % 2) c.fillRect(-4, -2, 8, 4); else { X.circle(c, 0, 0, 3); c.fill(); } c.restore(); }
  });
})();
