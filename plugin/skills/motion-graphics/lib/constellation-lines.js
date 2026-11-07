/**
 * MGP.constellationLines \u2014 a night sky with constellations drawn as smooth glowing lines.
 *
 * Extracted from the website's constellation layer (guide/js/cosmos.js + css/guide.css .const-svg): twinkling
 * starfield, a two-armed golden spiral of stardust, orbit ellipses that draw on, constellation patterns drawn with
 * smooth (Catmull-Rom -> cubic Bezier) lines with a soft glow, star dots that twinkle, sparks that travel along the
 * lines, a pulsing halo on highlighted nodes and serif labels with a gold pill. The site's SVG/DOM, pointer
 * parallax, hover, menu content and quality tiers are removed; everything is drawn on one canvas from t alone.
 *
 * Two ways to give content (both may be used together):
 *   constellations: [{ x, y, label, sub, stars:[[dx,dy],...], star, scale:[sx,sy] }]
 *       x,y = centre in "ring units" (-1..1 on the main ellipse, like the site) unless units:"px";
 *       stars = pattern offsets in -1..1, scaled by scale (default [96,62]) -> one smooth line through them.
 *   nodes: [{ x, y, label, sub, star }]  + edges: [[i,j,k,...], ...]   (graph mode; each edge = one smooth path
 *       through the listed node indices; nodes are drawn as star dots with optional labels).
 *
 * Options (defaults):
 *   width 1280, height 720, duration 8, seed 11
 *   background "nebula"          "nebula" (procedural) | css colour | (ctx,t,W,H)=>void | HTMLImageElement/canvas | null
 *   bg "#050816"                  base colour of the procedural nebula
 *   nebula ["#1d3a8a","#9a6420","#2a4fa8","#c98a32"]   blob colours of the procedural nebula
 *   units "ring"                  "ring" (normalised to the main ellipse) | "px"
 *   centre [0.5, 0.52]            ellipse centre as fraction of W,H;   ringR [0.37, 0.33] (fractions, capped 640/320 px)
 *   constellations DEMO           neutral demo set (7 around + 1 centre); [] for none
 *   nodes [] , edges []           graph mode
 *   rings [[.42,.36,-8],[.3,.26,6],[.16,.14,-3]]   orbit ellipses [rx,ry (fractions of W,H), rotation deg]; [] none
 *   ringColor "rgba(242,215,150,.22)"
 *   stars 280, starColor "#fff6e0"                 twinkling background stars
 *   dust 1500, dustColors ["#ffd27a","#ffe1a0"], spiralR 0.42 (of W, capped 720), spiralTilt -0.22, spiralCentre [0.5,0.55]
 *   lineColors ["#fff2cf","#ffe2a0"]  edge/middle colours of the line gradient;  lineWidth 1.2 (star groups 1.8)
 *   glow 2.2                      blur radius of the line glow (0 = off)
 *   dotColor "#fff6dc", dotR [2.4, 1.5]   star dots (even / odd index)
 *   sparks 1, sparkSpeed [0.12, 0.22] (path lengths per second), sparkColors ["#ffffff","#ffe3a6","#ffd27a"]
 *   halo true, haloColor "rgba(242,215,150,.35)", haloR 56, haloPeriod 3.2
 *   labels true, font "Georgia, 'Times New Roman', serif", uiFont "system-ui, 'Segoe UI', Arial, sans-serif",
 *   labelColor "#f4ecd8", starLabelColor "#ffe9b8", pill ["#f7e2a8","#d9b26a"], pillText "#1a1408", labelSize 26
 *   drawIn { delay:.3, rings:[2.4,.2], lines:[1.6,.12], labels:[1,.08] }  [duration, stagger] of each draw-on; null = drawn
 *   focus null                    { index, t } \u2014 from t the chosen constellation swells and the others dim (site "pick")
 *
 * Methods: api.create(canvasOrEl, opts) -> inst (draw/seek/timeline), api.render(ctx, t, opts)
 *   api.lib = { smoothPts(pts, perSeg), DEMO, PATTERNS, ringAt(i, n) }
 *
 * Example:
 *   const inst = MGP.constellationLines.create("#stage", { seed: 3 });
 *   MGP.core.expose(inst);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2;

  // pattern shapes (abstract polylines in -1..1) \u2014 same geometry family as the site
  const PATTERNS = {
    a: [[-.9, -.3], [-.4, -.8], [.2, -.5], [.7, -.9], [.9, -.2]],
    b: [[-.8, .4], [-.3, -.2], [.1, .5], [.6, 0], [.9, .6]],
    c: [[-.7, -.7], [-.2, -.1], [-.6, .6], [.3, .4], [.8, -.3]],
    d: [[-.9, 0], [-.4, -.6], [.1, -.2], [.4, -.8], [.8, -.4], [.6, .4]],
    e: [[-.6, .7], [-.8, -.1], [-.2, -.6], [.4, -.3], [.8, .3]],
    f: [[-.8, -.5], [-.2, -.8], [.2, -.1], [-.1, .6], [.7, .5]],
    g: [[-.9, .2], [-.5, -.5], [0, -.1], [.5, -.6], [.9, .1], [.3, .6]],
    h: [[-1, -.2], [-.5, .4], [0, -.4], [.5, .3], [1, -.3], [0, .8], [0, -.9]],
  };
  const ringAt = (i, n = 7) => { const a = -Math.PI / 2 + (i * TAU) / n; return [Math.cos(a), Math.sin(a)]; };
  const NAMES = [["Awal", "pembuka"], ["Gagasan", "ide \u00b7 gaya", 1], ["Warna", "palet \u00b7 cahaya", 1], ["Gerak", "irama \u00b7 tokoh", 1],
    ["Huruf", "judul \u00b7 teks", 1], ["Suara", "musik \u00b7 ritme"], ["Arsip", "catatan \u00b7 aset", 1]];
  const PK = ["a", "b", "c", "e", "f", "g", "d"];
  const DEMO = NAMES.map(([label, sub, star], i) => { const p = ringAt(i); return { x: p[0], y: p[1], label, sub, star: !!star, stars: PATTERNS[PK[i]] }; })
    .concat([{ x: 0, y: 0.02, label: "Pusat", sub: "semua rasi", center: true, stars: PATTERNS.h, scale: [150, 90] }]);

  // smooth polyline through pts: Catmull-Rom converted to cubic Beziers (k = 1/6), sampled densely (site: cosmos.js smooth())
  function smoothPts(pts, per = 24) {
    if (pts.length < 2) return pts.slice();
    if (pts.length < 3) { const out = []; for (let k = 0; k <= per; k++) out.push([C.lerp(pts[0][0], pts[1][0], k / per), C.lerp(pts[0][1], pts[1][1], k / per)]); return out; }
    const out = [pts[0].slice()];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, k = 1 / 6;
      const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      for (let s = 1; s <= per; s++) {
        const u = s / per, v = 1 - u;
        out.push([v * v * v * p1[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p2[0], v * v * v * p1[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p2[1]]);
      }
    }
    return out;
  }
  // arc-length table for a polyline
  function lenTable(d) { const L = [0]; for (let i = 1; i < d.length; i++) L.push(L[i - 1] + Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1])); return L; }
  function atLen(d, L, s) {
    if (s <= 0) return d[0]; const tot = L[L.length - 1]; if (s >= tot) return d[d.length - 1];
    let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < s) lo = m; else hi = m; }
    const k = (s - L[lo]) / (L[hi] - L[lo] || 1); return [C.lerp(d[lo][0], d[hi][0], k), C.lerp(d[lo][1], d[hi][1], k)];
  }

  const sparkSprite = (cols) => {
    const s = C.offscreen(64, 64), g = s.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, cols[0]); rg.addColorStop(0.35, cols[1]); rg.addColorStop(1, C.rgba(cols[2], 0));
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return s;
  };

  const api = C.defineModule("constellationLines", {
    size: [1280, 720],
    duration: (o) => o.duration || 8,
    defaults: {
      seed: 11, background: "nebula", bg: "#050816", nebula: ["#1d3a8a", "#9a6420", "#2a4fa8", "#c98a32"],
      units: "ring", centre: [0.5, 0.52], ringR: [0.37, 0.33],
      constellations: null, nodes: [], edges: [],
      rings: [[0.42, 0.36, -8], [0.3, 0.26, 6], [0.16, 0.14, -3]], ringColor: "rgba(242,215,150,.22)",
      stars: 280, starColor: "#fff6e0",
      dust: 1500, dustColors: ["#ffd27a", "#ffe1a0"], spiralR: 0.42, spiralTilt: -0.22, spiralCentre: [0.5, 0.55],
      lineColors: ["#fff2cf", "#ffe2a0"], lineWidth: 1.2, glow: 2.2,
      dotColor: "#fff6dc", dotR: [2.4, 1.5],
      sparks: 1, sparkSpeed: [0.12, 0.22], sparkColors: ["#ffffff", "#ffe3a6", "#ffd27a"],
      halo: true, haloColor: "rgba(242,215,150,.35)", haloR: 56, haloPeriod: 3.2,
      labels: true, font: "Georgia, 'Times New Roman', serif", uiFont: "system-ui, 'Segoe UI', Arial, sans-serif",
      labelColor: "#f4ecd8", starLabelColor: "#ffe9b8", pill: ["#f7e2a8", "#d9b26a"], pillText: "#1a1408", labelSize: 26,
      drawIn: { delay: 0.3, rings: [2.4, 0.2], lines: [1.6, 0.12], labels: [1, 0.08] },
      focus: null,
    },
    setup(S) {
      const o = S.opts, W = S.W, H = S.H, R = S.rng;
      const cx = W * o.centre[0], cy = H * o.centre[1];
      const Rx = Math.min(W * o.ringR[0], 640), Ry = Math.min(H * o.ringR[1], 320);
      const toPx = (x, y) => (o.units === "px" ? [x, y] : [cx + x * Rx, cy + y * Ry]);
      const groups = [];   // {paths:[{d,L,len,w}], dots:[[x,y,r,ph]], label, sub, star, center, at:[x,y]}
      const cons = o.constellations || DEMO;
      const small = W < 700;
      cons.forEach((n) => {
        const [x, y] = toPx(n.x, n.y), sc = n.scale || (n.center ? [150, 90] : small ? [60, 42] : [96, 62]), dy = n.center ? 0 : -6;
        const st = (n.stars || PATTERNS.a).map(([a, b]) => [x + a * sc[0], y + b * sc[1] + dy]);
        const d = smoothPts(st), L = lenTable(d);
        groups.push({ paths: [{ d, L, len: L[L.length - 1], w: n.star ? o.lineWidth * 1.5 : o.lineWidth }],
          dots: st.map((p, i) => [p[0], p[1], i % 2 ? o.dotR[1] : o.dotR[0], R() * TAU]), label: n.label, sub: n.sub, star: !!n.star, center: !!n.center, at: [x, y] });
      });
      if (o.nodes && o.nodes.length) {
        const P = o.nodes.map((n) => toPx(n.x, n.y));
        const g = { paths: [], dots: P.map((p, i) => [p[0], p[1], o.nodes[i].star ? o.dotR[0] * 1.3 : i % 2 ? o.dotR[1] : o.dotR[0], R() * TAU]), graph: true, nodes: o.nodes.map((n, i) => ({ n, at: P[i] })) };
        (o.edges || []).forEach((e) => { const d = smoothPts(e.map((i) => P[i])), L = lenTable(d); g.paths.push({ d, L, len: L[L.length - 1], w: o.lineWidth }); });
        groups.push(g);
      }
      groups.forEach((g) => g.paths.forEach((p) => {
        p.sparks = Array.from({ length: Math.max(0, o.sparks | 0) }, () => ({ u: R(), v: C.lerp(o.sparkSpeed[0], o.sparkSpeed[1], R()) }));
        let x0 = Infinity, x1 = -Infinity; p.d.forEach((q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }); p.x0 = x0; p.x1 = Math.max(x0 + 1, x1);
      }));
      S.groups = groups;
      // spiral stardust + starfield (site: cosmos.js, Math.random replaced by the seeded rng)
      S.spiral = Array.from({ length: o.dust | 0 }, (_, i) => { const u = R(); return { u, a: u * Math.PI * 5.2 + (R() - 0.5) * 0.5, r: R(), s: R() * 1.6 + 0.3, ph: R() * TAU, arm: i % 2 }; });
      S.stars = Array.from({ length: o.stars | 0 }, () => ({ x: R(), y: R(), r: R() * 1.3 + 0.2, ph: R() * TAU, sp: 0.6 + R() * 2 }));
      // nebula blobs: big soft clouds, warm ones pushed toward the edges (the site uses a painted image here)
      S.blobs = Array.from({ length: 18 }, (_, i) => {
        const c = o.nebula[i % o.nebula.length], warm = i % 2 === 1, a = R() * TAU, d = warm ? 0.38 + R() * 0.25 : R() * 0.4;
        return { x: 0.5 + Math.cos(a) * d * 1.2, y: 0.52 + Math.sin(a) * d, r: (i < 6 ? 0.3 : 0.1) + R() * 0.25, c, a: (warm ? 0.22 : 0.2) + R() * 0.25 };
      });
      S.spark = sparkSprite(o.sparkColors);
      S.rings = (o.rings || []).map(([rx, ry, rot]) => ({ cx: W / 2, cy: H * o.centre[1], rx: Math.min(W * rx, 700), ry: Math.min(H * ry, 330), rot: rot * C.RAD }));
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H, DI = o.drawIn;
      // background
      const bgk = o.background;
      if (typeof bgk === "function") bgk(g, t, W, H);
      else if (bgk && typeof bgk === "object" && (bgk.width || bgk.naturalWidth)) { const iw = bgk.naturalWidth || bgk.width, ih = bgk.naturalHeight || bgk.height, s = Math.max(W / iw, H / ih); g.drawImage(bgk, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s); }
      else if (bgk === "nebula") {
        g.fillStyle = o.bg; g.fillRect(0, 0, W, H);
        const br = 1 + 0.06 * C.ease.sine(((t / 30) % 2 > 1 ? 2 - (t / 30) % 2 : (t / 30) % 2));   // site: 30 s "breathe" alternate
        g.save(); g.translate(W / 2, H / 2); g.scale(br, br); g.translate(-W / 2, -H / 2);
        g.globalCompositeOperation = "lighter";
        for (const b of S.blobs) {
          const x = b.x * W, y = b.y * H, r = b.r * Math.max(W, H), gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, C.rgba(b.c, b.a)); gr.addColorStop(0.5, C.rgba(b.c, b.a * 0.35)); gr.addColorStop(1, C.rgba(b.c, 0));
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
        }
        g.restore(); g.globalCompositeOperation = "source-over";
        const v = g.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.2, W / 2, H * 0.52, Math.max(W, H) * 0.75);
        v.addColorStop(0, "rgba(5,8,22,.55)"); v.addColorStop(0.6, "rgba(5,8,22,0)"); v.addColorStop(1, "rgba(0,0,0,.35)");
        g.fillStyle = v; g.fillRect(0, 0, W, H);
      } else if (bgk) { g.fillStyle = bgk; g.fillRect(0, 0, W, H); }

      // starfield + spiral dust, batched into 8 alpha levels per colour (as the site)
      g.globalCompositeOperation = "lighter";
      const BK = S.cache.BK || (S.cache.BK = Array.from({ length: 24 }, () => []));
      for (const b of BK) b.length = 0;
      for (const s of S.stars) { const a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.sp + s.ph)); BK[16 + Math.min(7, (a * 8) | 0)].push(s.x * W, s.y * H, s.r); }
      const ccx = W * o.spiralCentre[0], ccy = H * o.spiralCentre[1], R = Math.min(W * o.spiralR, 720), co = Math.cos(o.spiralTilt), si = Math.sin(o.spiralTilt);
      for (const p of S.spiral) {
        const a = p.a + t * (0.05 + (1 - p.u) * 0.06) + p.arm * Math.PI;
        const rr = (0.08 + p.u * 0.92) * R * (1 + (p.r - 0.5) * 0.16), ex = Math.cos(a) * rr * 1.1, ey = Math.sin(a) * rr * 0.34;
        const al = (0.18 + 0.7 * (1 - p.u)) * (0.5 + 0.5 * Math.sin(t * 2.2 + p.ph));
        BK[p.arm * 8 + Math.min(7, (al * 8) | 0)].push(ccx + ex * co - ey * si, ccy + ex * si + ey * co, p.s);
      }
      for (let k = 0; k < 24; k++) {
        const b = BK[k]; if (!b.length) continue;
        g.globalAlpha = ((k % 8) + 0.5) / 8; g.fillStyle = k >= 16 ? o.starColor : k >= 8 ? o.dustColors[1] : o.dustColors[0];
        g.beginPath(); for (let i = 0; i < b.length; i += 3) g.rect(b[i], b[i + 1], b[i + 2], b[i + 2]); g.fill();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";

      // draw-on progress helpers (power2.inOut for strokes, power3.out for labels)
      const prog = (kind, i) => { if (!DI) return 1; const [d, st] = DI[kind] || [1, 0], off = kind === "rings" ? 0 : kind === "lines" ? 0.3 : 0.4; return C.seg(t, (DI.delay || 0) + off + i * st, (DI.delay || 0) + off + i * st + d); };
      // focus ("pick"): chosen group swells, the rest dims
      const F = o.focus, fk = F ? C.ease.outQuad(C.seg(t, F.t, F.t + 0.6)) : 0;
      const dim = (gi) => (F && gi !== F.index ? 1 - 0.85 * fk : 1);

      // orbit rings
      g.strokeStyle = o.ringColor; g.lineWidth = 1;
      S.rings.forEach((r, i) => {
        const p = C.ease.inOutQuad(prog("rings", i)); if (p <= 0) return;
        g.globalAlpha = F ? 1 - 0.85 * fk : 1;
        g.beginPath(); g.ellipse(r.cx, r.cy, r.rx, r.ry, r.rot, 0, TAU * p); g.stroke();
      });
      g.globalAlpha = 1;

      // constellation lines (with glow), dots, sparks, halos
      let li = 0;
      S.groups.forEach((G, gi) => {
        const A = dim(gi), hot = F && gi === F.index ? fk : 0;
        G.paths.forEach((P) => {
          const p = C.ease.inOutQuad(prog("lines", li++)), upto = P.len * p;
          if (p > 0) {
            const gr = g.createLinearGradient(P.x0, 0, P.x1, 0);
            gr.addColorStop(0, C.rgba(o.lineColors[0], 0.15)); gr.addColorStop(0.5, C.rgba(o.lineColors[1], 0.9)); gr.addColorStop(1, C.rgba(o.lineColors[0], 0.15));
            const path = () => { g.beginPath(); g.moveTo(P.d[0][0], P.d[0][1]); for (let i = 1; i < P.d.length; i++) { if (P.L[i] > upto) { const q = atLen(P.d, P.L, upto); g.lineTo(q[0], q[1]); break; } g.lineTo(P.d[i][0], P.d[i][1]); } };
            g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = gr;
            const w = C.lerp(P.w, 2.4, hot);
            if (o.glow > 0) { g.save(); g.filter = `blur(${o.glow}px)`; g.globalAlpha = A; g.lineWidth = w * 1.6; path(); g.stroke(); g.restore(); }
            g.globalAlpha = A; g.lineWidth = w; path(); g.stroke(); g.globalAlpha = 1;
          }
          // sparks travel along the (drawn part of the) line
          if (p > 0) for (const sp of P.sparks) {
            const u = (((sp.u + t * sp.v * (1 + hot * 1.2)) % 1) + 1) % 1; if (u > p) continue;
            const q = atLen(P.d, P.L, u * P.len), r = (G.star ? 5 : 3.5) * 2;
            g.globalAlpha = Math.sin(u * Math.PI) * 0.95 * A; g.drawImage(S.spark, q[0] - r, q[1] - r, r * 2, r * 2);
          }
          g.globalAlpha = 1;
        });
        // twinkling star dots (appear with their line)
        const shown = G.paths.length ? C.clamp(prog("lines", li - G.paths.length) * 3) : C.clamp(prog("lines", li) * 3);
        g.fillStyle = o.dotColor;
        for (const [x, y, r, ph] of G.dots) {
          g.globalAlpha = (0.55 + 0.45 * Math.sin(t * 2.4 + ph)) * A * (DI ? Math.max(0.35, shown) : 1);
          g.beginPath(); g.arc(x, y, r * (1 + 0.7 * hot), 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        if (o.halo && G.star) {
          const ph = ((t % o.haloPeriod) + o.haloPeriod) % o.haloPeriod / o.haloPeriod, e = C.ease.outQuad(ph), r = (W < 700 ? 34 : o.haloR) * C.lerp(0.6, 1.6, e);
          g.globalAlpha = C.lerp(0.9, 0, e) * A; g.strokeStyle = o.haloColor; g.lineWidth = 1; g.beginPath(); g.arc(G.at[0], G.at[1], r, 0, TAU); g.stroke(); g.globalAlpha = 1;
        }
      });

      // labels
      if (o.labels) {
        let k = 0;
        const label = (x, y, lab, sub, star, center, A) => {
          const p = C.ease.out(prog("labels", k++)); if (p <= 0 || !lab) return;
          const yy = y + 16 * (1 - p), al = p * A;
          g.save(); g.globalAlpha = al; g.textAlign = "center"; g.textBaseline = "middle";
          const fs = center ? o.labelSize * 2.05 : star ? o.labelSize * 1.15 : o.labelSize;
          g.font = `${center ? "italic 300" : "400"} ${fs.toFixed(1)}px ${o.font}`;
          g.shadowColor = star ? "rgba(255,214,140,.8)" : "rgba(255,220,150,.45)"; g.shadowBlur = star ? 22 : 18;
          g.fillStyle = star ? o.starLabelColor : o.labelColor; g.fillText(lab, x, yy);
          g.shadowColor = "rgba(0,0,0,.8)"; g.shadowBlur = 10; g.shadowOffsetY = 2; g.fillText(lab, x, yy);
          g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
          if (sub && (star || center)) {
            const fy = yy + fs * 0.5 + (center ? 14 : 22);
            if (star) {
              const txt = "\u2605 " + sub; g.font = `600 12.5px ${o.uiFont}`; const tw = g.measureText(txt).width + 24, th = 24;
              const pg = g.createLinearGradient(0, fy - th / 2, 0, fy + th / 2); pg.addColorStop(0, o.pill[0]); pg.addColorStop(1, o.pill[1]);
              g.fillStyle = pg; g.shadowColor = "rgba(242,215,150,.45)"; g.shadowBlur = 14;
              g.beginPath(); if (g.roundRect) g.roundRect(x - tw / 2, fy - th / 2, tw, th, th / 2); else g.rect(x - tw / 2, fy - th / 2, tw, th); g.fill();
              g.shadowBlur = 0; g.fillStyle = o.pillText; g.fillText(txt, x, fy + 0.5);
            } else { g.font = `400 13px ${o.uiFont}`; g.globalAlpha = al * 0.85; g.fillStyle = "#e9dcbc"; g.fillText(sub, x, fy); }
          }
          g.restore();
        };
        S.groups.forEach((G, gi) => {
          const A = dim(gi) * (F && gi === F.index ? 1 - C.seg(t, F.t + 0.35, F.t + 0.8) : 1);
          if (G.graph) G.nodes.forEach(({ n, at }) => label(at[0], at[1] - 26, n.label, n.sub, n.star, false, A));
          else label(G.at[0], G.at[1], G.label, G.sub, G.star, G.center, A);
        });
      }
    },
  });
  api.lib = { smoothPts, PATTERNS, DEMO, ringAt };
  MGP.constellationLines = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
