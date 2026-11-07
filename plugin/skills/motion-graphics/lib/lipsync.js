/**
 * MGP.lipsync \u2014 deterministic viseme engine + talking-face renderers (canvas).
 *
 * Extracted from the website demo `lipsync(el)` in guide/js/demos.js (section 6 \u00b7 LIP-SYNC, a port of the skill's
 * viseme_id.py): letters -> 7 mouth shapes (A, E, O, U, FV, MBP, X; plus "senyum" = closing smile), Indonesian
 * timing per character (0.07 s, punctuation 0.25 s), gap merging (< 2 drawings), per-drawing majority vote at 12
 * drawings/s with unknown consonants weighted 0.5, and the "every M/B/P gets at least one closed drawing" rule.
 * The demo's narrator photo layers are NOT used (no personal assets); a vector presenter is drawn instead, and any
 * user image can be animated with a drawn mouth. Head sway / jaw / brows / blink / accent follow the demo's numbers.
 *
 * ---- Engine (pure, no canvas) ----
 *   MGP.lipsync.visemes(input, opts) -> track: [[t, viseme, weight], ...] one entry per drawing (t in s from 0)
 *     input: a string ("[excited] Halo, apa kabar ..."; [tags] are not spoken; [excited|senang|semangat|happy] lifts brows)
 *            | phone timings [{t0,t1,phone}] or [{start,end,phone}] (letters or ARPAbet, e.g. from a forced aligner)
 *            | word timings  [{start,end,word}] or [{t0,t1,word}] (letters spread evenly over each word)
 *     opts: fps 12, charDur 0.07, pauseDur 0.25, tagTime false (true = tags take time like the demo), gapMin 2/fps,
 *           weakWeight 0.5, tail 0.2 (silence appended to the track)
 *     track props (non-JSON): track.fps, track.duration, track.words [{t0,t1,text}], track.emotion ("excited"|null)
 *   MGP.lipsync.at(track, t, opts) -> { viseme, prev, frame, open, openK (smoothed, rate 14/s), wide, round, teeth,
 *     tongue, weight, accent (0..1 head accent on a stressed opening), talking, shape (12 numbers), lineW, mix }
 *     opts: endSmile true (last drawing and after = "senyum"), blend 0 (s of shape cross-fade between drawings)
 *   MGP.lipsync.toJSON(track) -> {fps, duration, frames:[{t,v,w}], words}
 *
 * ---- Module (canvas) ----  MGP.lipsync.create(canvasOrEl, opts)
 *   text      "[excited] Halo, apa kabar semuanya?"   or `track` (output of visemes) / `timings` (aligner output)
 *   face      "presenter"  | "image"
 *   image     null         HTMLImageElement / canvas (face: "image"), fitted "contain" (imageFit: "cover" also)
 *   mouth     {x, y, width:60, angle:0}   mouth centre/width/angle (deg) in IMAGE pixels
 *   patch     true         skin patch hiding the original mouth: true | false | {color:"auto"|css, rx, ry, feather 0..1} (rx/ry in mouth widths)
 *   eyes      null         optional blink lids on an image: [{x, y, rx, ry}] in image px (lid colour = patch colour)
 *   headMotion 1           sway/nod/breath amplitude (image: rotation about `pivot` image px, default bottom centre)
 *   overscan  null         image zoom that hides the edges while it sways (default 1.04 when headMotion, else 1)
 *   lead 0.3, tail 1.2     silence before / after the track (duration = lead + track + tail)
 *   fps 12, charDur 0.07, pauseDur 0.25, blend 0, endSmile true, blink true, seed 3
 *   palette   presenter/mouth colours {bg:[...5 stops], skin, skinShade, hair, shirt, shirtShade, iris, inner:"#3a1414",
 *             lip:"#6e3a2e", lipClosed:"#5a2c24", teeth:"#f7f2e8", tongue:"#c8605a", blush}
 *   ekspresi null          FACS (needs wajah.js): emotion name, AU object, [[t, name|AU], ...] or (t) => AU; brows/lids/lip corners
 *                          from the AUs, jaw shared with the visemes (max), transisiEkspresi 0.25 s
 *   drawMouth null         override (ctx, m, P) drawn in mouth-local units (mouth ~20 wide, origin at centre);
 *                          "vectorKit" uses MGP.vectorKit.lib.drawMouth when that module is loaded
 *   captions  false        karaoke subtitle of the current line; captionFont "600 {size}px system-ui, sans-serif",
 *             captionSize (px, default H*0.052), captionColor "#fff", captionDim "rgba(255,255,255,.45)",
 *             captionHighlight "#ffd36b", captionBg "rgba(10,6,14,.55)", captionY (0..1 of H, default 0.9)
 *   labels    false        debug: viseme name in the corner
 *
 *   lib: { VIS, ARPA, SHAPES, OPEN, drawMouth(ctx, m, P), drawPresenter(ctx, S, st), mouthFor(viseme) }
 *
 * Example:
 *   const ls = MGP.lipsync.create("#stage", { text: "Halo, apa kabar?", captions: true });
 *   MGP.core.expose(ls);
 *   const tr = MGP.lipsync.visemes([{ start: 0, end: 0.4, word: "halo" }]); MGP.lipsync.at(tr, 0.2).viseme;
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;

  /* ---------------- engine ---------------- */
  const VIS = { a: "A", o: "O", u: "U", w: "U", f: "FV", v: "FV", i: "E", e: "E", "\u00e9": "E", y: "E", m: "MBP", b: "MBP", p: "MBP" };
  const ARPA = { AA: "A", AE: "A", AH: "A", AY: "A", AW: "A", AO: "O", OW: "O", OY: "O", UW: "U", UH: "U", W: "U", ER: "E", IY: "E", IH: "E", EH: "E", EY: "E", Y: "E", F: "FV", V: "FV", M: "MBP", B: "MBP", P: "MBP" };
  const SIL = /^(sil|sp|spn|pau|<.*>|_|)$/i;
  const OPEN = { A: 1, O: 0.8, E: 0.5, U: 0.4, FV: 0.25, MBP: 0, X: 0, senyum: 0.08 };
  const isLetter = (c) => { try { return /\p{L}/u.test(c); } catch (e) { return /[A-Za-z\u00c0-\u017e]/.test(c); } };
  const visOfLetter = (c) => VIS[c.toLowerCase()] || "e";
  function visOfPhone(p) {
    p = String(p || "").trim(); if (SIL.test(p)) return null;
    const up = p.toUpperCase().replace(/[0-9]/g, "");
    if (ARPA[up]) return ARPA[up];
    if (/^[A-Z]{1,2}$/.test(up) && p === p.toUpperCase() && p.length > 1) return "e";
    return visOfLetter(p[0]);
  }
  const EMO_RE = /\[(excited|senang|semangat|happy)\]/i;

  /** text -> letter segments [[a, b, V]] + tokens for captions */
  function segText(text, o) {
    const cd = o.charDur == null ? 0.07 : o.charDur, pd = o.pauseDur == null ? 0.25 : o.pauseDur;
    const seg = [], toks = []; let c = 0, tag = false, tok = null;
    const endTok = () => { if (tok && tok.t1 != null) toks.push({ t0: tok.t0, t1: tok.t1, text: tok.text }); tok = null; };
    for (const x of String(text)) {
      if (x === "[") tag = true;
      if (tag) { if (x === "]") tag = false; if (o.tagTime) c += cd; continue; }
      const d = /[,.;:!?]/.test(x) ? pd : cd;
      if (/\s/.test(x)) { endTok(); }
      else {
        if (!tok) tok = { t0: null, t1: null, text: "" };
        tok.text += x;
        if (isLetter(x) || /[0-9]/.test(x)) { if (tok.t0 == null) tok.t0 = c; tok.t1 = c + d; }
      }
      if (isLetter(x)) seg.push([c, c + d, visOfLetter(x)]);
      c += d;
    }
    endTok();
    return { seg, words: toks, end: c, emotion: EMO_RE.test(String(text)) ? "excited" : null };
  }
  function segTimings(arr) {
    const seg = [], words = []; let end = 0;
    arr.forEach((e) => {
      const a = +(e.t0 != null ? e.t0 : e.start), b = +(e.t1 != null ? e.t1 : e.end); end = Math.max(end, b);
      if (e.phone != null || e.phoneme != null) { const v = visOfPhone(e.phone != null ? e.phone : e.phoneme); if (v) seg.push([a, b, v]); }
      else if (e.word != null || e.text != null) {
        const w = String(e.word != null ? e.word : e.text), L = [...w].filter(isLetter);
        words.push({ t0: a, t1: b, text: w });
        L.forEach((ch, i) => seg.push([a + ((b - a) * i) / L.length, a + ((b - a) * (i + 1)) / L.length, visOfLetter(ch)]));
      }
    });
    return { seg, words, end, emotion: null };
  }
  /** the demo's viseme_id algorithm on letter segments */
  function binSegments(seg, dur, o) {
    const draw = o.fps || 12, gapMin = o.gapMin == null ? 2 / draw : o.gapMin, wK = o.weakWeight == null ? 0.5 : o.weakWeight;
    seg = seg.map((s) => s.slice()).sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < seg.length - 1; i++) if (seg[i + 1][0] - seg[i][1] < gapMin) seg[i][1] = seg[i + 1][0];
    const n = Math.max(1, Math.round(dur * draw)), ov = (a, b, k) => Math.max(0, Math.min(b, (k + 1) / draw) - Math.max(a, k / draw)), out = [];
    for (let k = 0; k < n; k++) {
      const cov = {};
      for (const [a, b, v] of seg) { const [V, w] = v === "e" ? ["E", wK] : [v, 1]; const q = ov(a, b, k); if (q > 0) cov[V] = (cov[V] || 0) + w * q; }
      const ks = Object.keys(cov);
      if (!ks.length) { out.push([+(k / draw).toFixed(4), "X", 0]); continue; }
      const best = ks.reduce((p, q) => (cov[p] >= cov[q] ? p : q));
      out.push([+(k / draw).toFixed(4), best, +Math.min(1, cov[best] * draw).toFixed(3)]);
    }
    for (const [a, b, v] of seg) {
      if (v !== "MBP") continue;
      const ks = []; for (let k = 0; k < n; k++) if (ov(a, b, k) > 0) ks.push(k);
      if (ks.length && !ks.some((k) => out[k][1] === "MBP")) { const k = ks.reduce((p, q) => (ov(a, b, p) >= ov(a, b, q) ? p : q)); out[k][1] = "MBP"; out[k][2] = 1; }
    }
    return out;
  }
  function visemes(input, o) {
    o = o || {};
    const R = typeof input === "string" ? segText(input, o) : segTimings(input || []);
    const tail = o.tail == null ? 0.2 : o.tail, fps = o.fps || 12;
    const tr = binSegments(R.seg, R.end + tail, o);
    tr.fps = fps; tr.duration = tr.length / fps; tr.words = R.words; tr.emotion = o.emotion !== undefined ? o.emotion : R.emotion;
    return tr;
  }
  const toJSON = (tr) => ({ fps: tr.fps || 12, duration: tr.duration || tr.length / (tr.fps || 12), frames: tr.map(([t, v, w]) => ({ t, v, w })), words: tr.words || [] });
  function fromAny(track) {
    if (Array.isArray(track) && track.length && !Array.isArray(track[0]) && track[0].v != null) { const fps = 12, tr = track.map((f) => [f.t, f.v, f.w == null ? 1 : f.w]); tr.fps = fps; tr.duration = tr.length / fps; tr.words = []; return tr; }
    if (track && track.frames) { const tr = track.frames.map((f) => [f.t, f.v, f.w == null ? 1 : f.w]); tr.fps = track.fps || 12; tr.duration = track.duration || tr.length / tr.fps; tr.words = track.words || []; return tr; }
    return track;
  }

  /* mouth shapes, mouth-local units (~20 wide): [Lx,Ly, Ux,Uy, Rx,Ry, C1x,C1y, Mx,My, C2x,C2y]
     path: M L  Q U R  Q C1 M  Q C2 L  Z  (closed shapes put the lower lip on the upper curve) */
  const closedQ = (L, U, R) => { const my = (L[1] + U[1]) / 2; return [L[0], L[1], U[0], U[1], R[0], R[1], R[0] / 2, my, 0, my, L[0] / 2, my]; };
  const SHAPES = {
    X: closedQ([-8, 0.2], [0, 1.2], [8, 0.2]), MBP: closedQ([-7.5, 0], [0, 0.9], [7.5, 0]), senyum: closedQ([-10, -1.6], [0, 4.2], [10, -1.6]),
    A: [-8.5, -1, 0, -3, 8.5, -1, 6, 9, 0, 9.6, -6, 9], E: [-10, -0.8, 0, -2.6, 10, -0.8, 6, 5, 0, 5.4, -6, 5],
    O: [-5.5, -1.6, 0, -4.6, 5.5, -1.6, 6.6, 4.6, 0, 7.6, -6.6, 4.6], U: [-3.8, -0.8, 0, -3, 3.8, -0.8, 4.4, 3.6, 0, 4.8, -4.4, 3.6],
    FV: [-8, -0.6, 0, -2.2, 8, -0.6, 5, 3, 0, 3.3, -5, 3],
  };
  const WIDE = { A: 0.85, E: 1, O: 0.55, U: 0.38, FV: 0.8, MBP: 0.75, X: 0.8, senyum: 1 };
  function mouthFor(v) {
    const open = !(v === "X" || v === "senyum" || v === "MBP");
    return { viseme: v, shape: (SHAPES[v] || SHAPES.X).slice(), open: open ? 1 : 0, teeth: v === "A" || v === "E" || v === "FV" ? 1 : 0, tongue: v === "A" || v === "O" ? 1 : 0,
      lineW: open ? 0.9 : v === "MBP" ? 1.8 : 1.3, wide: WIDE[v] == null ? 0.8 : WIDE[v], round: v === "O" || v === "U" ? 1 : 0 };
  }
  function mixMouth(a, b, k) {
    const o = { viseme: k < 0.5 ? a.viseme : b.viseme, shape: a.shape.map((v, i) => C.lerp(v, b.shape[i], k)) };
    ["open", "teeth", "tongue", "lineW", "wide", "round"].forEach((q) => (o[q] = C.lerp(a[q], b[q], k)));
    return o;
  }
  const visAt = (tr, k, endSmile) => (k < 0 ? "X" : k >= tr.length - 1 && endSmile ? "senyum" : k >= tr.length ? "X" : tr[k][1]);
  function at(track, t, o) {
    o = o || {}; const tr = fromAny(track), fps = tr.fps || 12, endSmile = o.endSmile !== false;
    const k = Math.floor(t * fps + 1e-6), v = visAt(tr, k, endSmile), pv = visAt(tr, k - 1, endSmile);
    // jaw opening follows the drawing with the demo's exponential lag (rate 14/s), closed form over the last 12 drawings
    const dec = Math.exp(-14 / fps); let ok = 0;
    for (let j = Math.max(-1, k - 12); j < k; j++) { const tg = OPEN[visAt(tr, j, endSmile)] || 0; ok = tg + (ok - tg) * dec; }
    const tg = OPEN[v] || 0; ok = tg + (ok - tg) * Math.exp(-14 * Math.max(0, t - k / fps));
    // head accent: wide opening right after a closed-ish one, decays 3.2/s
    let accent = 0;
    for (let j = k; j >= Math.max(0, k - 6); j--) { if ((OPEN[visAt(tr, j, endSmile)] || 0) >= 0.8 && (OPEN[visAt(tr, j - 1, endSmile)] || 0) < 0.5) { accent = Math.max(0, 1 - 3.2 * (t - j / fps)); break; } }
    let m = mouthFor(v);
    const bl = o.blend || 0, since = t - k / fps;
    if (bl > 0 && since < bl && pv !== v) m = mixMouth(mouthFor(pv), m, C.smooth01(since / bl));
    return Object.assign(m, { viseme: v, prev: pv, frame: k, openT: tg, openK: ok, weight: k >= 0 && k < tr.length ? tr[k][2] : 0, accent, talking: t >= 0 && t < tr.length / fps, mix: bl });
  }

  /* ---------------- drawing ---------------- */
  const DEF_PAL = {
    bg: ["#f3d9a4", "#e9a46a", "#c27060", "#8a4a55", "#2e1828"], skin: "#e8b48f", skinShade: "#c98d6b", hair: "#2a1d1a", shirt: "#6f8a64", shirtShade: "#55704c",
    iris: "#4a3020", inner: "#3a1414", lip: "#6e3a2e", lipClosed: "#5a2c24", teeth: "#f7f2e8", tongue: "#c8605a", blush: "#e98476",
  };
  function mouthPath(g, s) { g.beginPath(); g.moveTo(s[0], s[1]); g.quadraticCurveTo(s[2], s[3], s[4], s[5]); g.quadraticCurveTo(s[6], s[7], s[8], s[9]); g.quadraticCurveTo(s[10], s[11], s[0], s[1]); g.closePath(); }
  /** default mouth drawer (demo manner: thin dark line when closed, dark opening with teeth/tongue when open) */
  function drawMouth(g, m, P) {
    P = P || DEF_PAL; const s = m.shape;
    g.lineJoin = "round"; g.lineCap = "round";
    if (m.open > 0.02) {
      g.globalAlpha = Math.min(1, m.open * 1.5); mouthPath(g, s); g.fillStyle = P.inner; g.fill();
      g.save(); mouthPath(g, s); g.clip();
      if (m.teeth > 0.01) { g.globalAlpha = m.teeth * Math.min(1, m.open * 1.5); g.fillStyle = P.teeth; g.fillRect(-12, -4, 24, 5); }
      if (m.tongue > 0.01) { g.globalAlpha = m.tongue * Math.min(1, m.open * 1.5); g.fillStyle = P.tongue; g.beginPath(); g.ellipse(0, 7.6, 5.2, 3.2, 0, 0, TAU); g.fill(); }
      g.restore(); g.globalAlpha = 1;
    }
    mouthPath(g, s); g.strokeStyle = C.mix(P.lipClosed, P.lip, m.open); g.lineWidth = m.lineW; g.stroke();
  }
  const VK = { A: { k: "D", w: 0.24, h: 0.13, tt: 1, tg: 1 }, O: { k: "O", w: 0.15, h: 0.15, tg: 1 }, E: { k: "D", w: 0.26, h: 0.07, tt: 1, tb: 1 }, U: { k: "O", w: 0.1, h: 0.09 },
    FV: { k: "fv", w: 0.18, h: 0.045 }, MBP: { k: "press", w: 0.15 }, X: { k: "line", w: 0.15, c: 0.004 }, senyum: { k: "line", w: 0.2, c: 0.024 } };
  function drawMouthAny(g, S, m) {
    const o = S.opts, P = S.pal;
    if (typeof o.drawMouth === "function") return o.drawMouth(g, m, P);
    const vk = MGP.vectorKit && MGP.vectorKit.lib && MGP.vectorKit.lib.drawMouth;
    if (o.drawMouth === "vectorKit" && vk) { g.save(); g.scale(100, 100); vk(g, 0, 0, VK[m.viseme] || VK.X, 1, { lip: P.lip, mouth: P.inner, teeth: P.teeth, tongue: P.tongue, skin: P.skin }, 0.014); g.restore(); return; }
    drawMouth(g, m, P);
  }

  // presenter, 360 x 360 design units
  function drawPresenter(g, S, st) {
    const P = S.pal, m = st.m, hm = S.opts.headMotion == null ? 1 : S.opts.headMotion;
    const bgS = P.bg, gr = g.createRadialGradient(180, 126, 0, 180, 126, 290);
    bgS.forEach((c, i) => gr.addColorStop([0, 0.38, 0.62, 0.85, 1][i] != null ? [0, 0.38, 0.62, 0.85, 1][i] : i / (bgS.length - 1), c));
    g.fillStyle = gr; g.fillRect(-40, -40, 440, 440);
    g.fillStyle = "rgba(255,240,205,.22)"; g.beginPath(); g.arc(183, 150, 150, 0, TAU); g.fill();
    g.save(); g.translate(0, -st.br * 0.6 * hm);
    g.shadowColor = "rgba(46,24,40,.38)"; g.shadowBlur = 8; g.shadowOffsetX = 3; g.shadowOffsetY = 5;
    // bust
    g.fillStyle = P.shirt; g.beginPath(); g.moveTo(30, 380); g.bezierCurveTo(34, 300, 70, 272, 140, 258); g.lineTo(226, 258); g.bezierCurveTo(296, 272, 332, 300, 336, 380); g.closePath(); g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = P.shirtShade; g.beginPath(); g.moveTo(150, 258); g.lineTo(183, 300); g.lineTo(216, 258); g.closePath(); g.fill();
    g.fillStyle = P.skinShade; g.beginPath(); g.moveTo(160, 196); g.lineTo(206, 196); g.lineTo(210, 262); g.quadraticCurveTo(183, 286, 156, 262); g.closePath(); g.fill();
    g.strokeStyle = C.shade(P.shirt, 0.2); g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.moveTo(146, 258); g.lineTo(183, 296); g.lineTo(220, 258); g.stroke();
    g.fillStyle = C.shade(P.shirtShade, -0.15); [312, 336, 360].forEach((y) => { g.beginPath(); g.arc(183, y, 3.2, 0, TAU); g.fill(); });
    // head (turns around the neck)
    g.save();
    g.translate(Math.sin(st.tt * 0.7) * 0.6 * hm, (st.nod - st.br * 0.6) * hm);
    g.translate(183, 214); g.rotate(st.rot * hm * RAD); g.translate(-183, -214);
    // FACS (opsi ekspresi, perlu wajah.js): rahang dipakai bersama visem, max(visem, AU26)
    const A = st.au, jaw = (A ? Math.max(st.openK, A.AU26) : st.openK) * 2.6;
    // ears
    g.fillStyle = P.skin; [[118, 150], [248, 150]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 11, 17, 0, 0, TAU); g.fill(); });
    g.fillStyle = P.skinShade; [[119, 151], [247, 151]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 5, 10, 0, 0, TAU); g.fill(); });
    // face with the jaw dropping a little when the mouth opens
    const face = () => { g.beginPath(); g.moveTo(121, 120); g.bezierCurveTo(118, 62, 248, 62, 245, 120); g.bezierCurveTo(247, 166, 228 , 206 + jaw * 0.6, 183, 220 + jaw); g.bezierCurveTo(138, 206 + jaw * 0.6, 119, 166, 121, 120); g.closePath(); };
    face(); const fg = g.createLinearGradient(120, 0, 246, 0); fg.addColorStop(0, C.shade(P.skin, -0.06)); fg.addColorStop(0.45, C.shade(P.skin, 0.06)); fg.addColorStop(1, C.shade(P.skin, -0.1)); g.fillStyle = fg; g.fill();
    g.save(); face(); g.clip(); g.fillStyle = C.rgba(P.blush, 0.25); [[148, 176], [218, 176]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 14, 8, 0, 0, TAU); g.fill(); }); g.restore();
    // hair
    g.fillStyle = P.hair; g.beginPath();
    g.moveTo(116, 136); g.bezierCurveTo(100, 70, 140, 30, 192, 34); g.bezierCurveTo(244, 38, 268, 84, 250, 138);
    g.bezierCurveTo(246, 116, 240, 104, 230, 98); g.bezierCurveTo(214, 110, 188, 112, 170, 98); g.bezierCurveTo(158, 108, 140, 110, 130, 104); g.bezierCurveTo(124, 112, 120, 122, 116, 136); g.closePath(); g.fill();
    g.strokeStyle = C.shade(P.hair, 0.18); g.lineWidth = 2; g.beginPath(); g.moveTo(150, 50); g.quadraticCurveTo(176, 58, 186, 92); g.moveTo(206, 46); g.quadraticCurveTo(226, 62, 230, 92); g.stroke();
    // brows
    const by = (st.excited ? -2.4 : 0) - st.openK * 1.1 - st.accent * 0.8;
    // alis: AU1 ujung dalam naik, AU2 ujung luar naik, AU4 turun (tanpa ekspresi: sama seperti sebelumnya)
    const bi = A ? -7 * A.AU1 + 6 * A.AU4 - 2 * A.AU2 : 0, bo = A ? -7 * A.AU2 + 2 * A.AU4 + 2 * A.AU1 * (1 - A.AU2) : 0;
    g.strokeStyle = P.hair; g.lineWidth = 4.2; g.lineCap = "round"; g.beginPath();
    g.moveTo(144, 116 + by + bo); g.quadraticCurveTo(158, 107 + by + (bo + bi) / 2, 173, 112 + by + bi); g.moveTo(193, 112 + by + bi); g.quadraticCurveTo(208, 107 + by + (bo + bi) / 2, 222, 116 + by + bo); g.stroke();
    // eyes + lids
    [[159, 133], [207, 133]].forEach(([x, y]) => {
      g.save(); g.beginPath(); g.ellipse(x, y, 11.5, 8.2, 0, 0, TAU); g.fillStyle = "#fbf7f0"; g.fill(); g.clip();
      g.fillStyle = P.iris; g.beginPath(); g.arc(x + 0.5, y + 0.5, 6.4, 0, TAU); g.fill();
      g.fillStyle = "#120a08"; g.beginPath(); g.arc(x + 0.5, y + 0.5, 3.2, 0, TAU); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 2.6, y - 2, 1.8, 0, TAU); g.fill();
      const lid = st.blink || (A && A.kedip > 0.5) ? 1 : A ? C.clamp(0.12 - 0.12 * A.AU5 + 0.3 * A.AU7 + 0.28 * A.AU6, 0, 0.7) : 0.12;
      g.fillStyle = C.shade(P.skin, -0.04); g.fillRect(x - 13, y - 10, 26, 18.4 * lid);
      g.restore();
      g.strokeStyle = "#2a1c18"; g.lineWidth = 2; g.beginPath();
      if (st.blink || (A && A.kedip > 0.5)) { g.moveTo(x - 11, y + 1); g.quadraticCurveTo(x, y + 5, x + 11, y + 1); } else { g.ellipse(x, y, 11.5, 8.2, 0, Math.PI * 1.08, Math.PI * 1.92); }
      g.stroke();
    });
    // nose
    g.strokeStyle = P.skinShade; g.lineWidth = 2.2; g.beginPath(); g.moveTo(184, 140); g.quadraticCurveTo(178, 160, 182, 166); g.quadraticCurveTo(186, 168, 191, 165); g.stroke();
    // mouth (at the jaw)
    // sudut bibir AU12/AU15 ditambahkan ke bentuk visem (senyum sambil bicara), diredam saat visem membulat
    let mm = m;
    if (A) { const k = (A.AU12 - A.AU15) * (1 - 0.6 * (m.round || 0)) * 2.6, sh = m.shape.slice(); sh[1] -= k; sh[5] -= k; sh[0] *= 1 + 0.15 * A.AU12 - 0.15 * A.AU23; sh[4] *= 1 + 0.15 * A.AU12 - 0.15 * A.AU23; if (A.AU26 > m.openK && !m.talking) { const e = (A.AU26 - (m.openK || 0)) * 9; sh[7] += e; sh[9] += e; sh[11] += e; } mm = Object.assign({}, m, { shape: sh, open: Math.max(m.open, A.AU26 > 0.15 && !m.talking ? A.AU26 : 0) }); }
    g.save(); g.translate(183, 191 + jaw * 0.7); g.scale(1.65, 1.65); drawMouthAny(g, S, mm); g.restore();
    g.restore();
    g.restore();
  }

  function sampleColor(img, x, y) {
    try { const c = C.offscreen(1, 1), g = c.getContext("2d"); g.drawImage(img, Math.round(x), Math.round(y), 3, 3, 0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return C.hex([d[0], d[1], d[2]]); } catch (e) { return null; }
  }
  function drawImageFace(g, S, st) {
    const o = S.opts, img = o.image; if (!img) return;
    const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
    const s = o.imageFit === "cover" ? Math.max(S.W / iw, S.H / ih) : Math.min(S.W / iw, S.H / ih);
    const hm = o.headMotion == null ? 1 : o.headMotion, mo = Object.assign({ x: iw / 2, y: ih * 0.7, width: iw * 0.12, angle: 0 }, o.mouth || {});
    const pv = o.pivot || [iw / 2, ih];
    if (o.imageBg) { g.fillStyle = o.imageBg; g.fillRect(0, 0, S.W, S.H); }
    g.save();
    const ov = o.overscan == null ? (hm ? 1.04 : 1) : o.overscan;
    g.beginPath(); g.rect(0, 0, S.W, S.H); g.clip();
    g.translate(S.W / 2, S.H / 2); g.scale(s * ov, s * ov); g.translate(-iw / 2, -ih / 2);
    g.translate(0, (st.nod * 0.5 - st.br * 0.6) * hm / s * 2);
    g.translate(pv[0], pv[1]); g.rotate(st.rot * 0.6 * hm * RAD); g.translate(-pv[0], -pv[1]);
    g.drawImage(img, 0, 0, iw, ih);
    const mw = mo.width;
    // skin patch over the original mouth
    if (o.patch !== false) {
      const pt = Object.assign({ color: "auto", rx: 0.62, ry: 0.34, feather: 0.45 }, typeof o.patch === "object" ? o.patch : {});
      const col = S.patchColor || (S.patchColor = (pt.color === "auto" ? sampleColor(img, mo.x - 1, mo.y - mw * 0.5) : pt.color) || "#c99a7f");
      g.save(); g.translate(mo.x, mo.y); g.rotate(mo.angle * RAD); g.scale(pt.rx * mw, pt.ry * mw);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1); rg.addColorStop(0, col); rg.addColorStop(C.clamp(1 - pt.feather), col); rg.addColorStop(1, C.rgba(col, 0));
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
    }
    // optional lids over the image eyes
    if (o.eyes && st.blink) {
      const col = S.patchColor || "#c99a7f";
      o.eyes.forEach((e) => { g.save(); g.translate(e.x, e.y); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, e.rx * 1.08, e.ry * 1.15, 0, 0, TAU); g.fill();
        g.strokeStyle = "#2a1c18"; g.lineWidth = Math.max(1, e.rx * 0.14); g.lineCap = "round"; g.beginPath(); g.moveTo(-e.rx, e.ry * 0.1); g.quadraticCurveTo(0, e.ry * 0.6, e.rx, e.ry * 0.1); g.stroke(); g.restore(); });
    }
    g.save(); g.translate(mo.x, mo.y + st.openK * mw * 0.02); g.rotate(mo.angle * RAD); g.scale(mw / 20, mw / 20); drawMouthAny(g, S, st.m); g.restore();
    g.restore();
  }

  function wrapWords(g, words, maxW) {
    const lines = []; let cur = [], w = 0; const sp = g.measureText(" ").width;
    words.forEach((wd, i) => { const ww = g.measureText(wd.text).width; if (cur.length && w + sp + ww > maxW) { lines.push(cur); cur = []; w = 0; } cur.push(Object.assign({ i, ww }, wd)); w += (cur.length > 1 ? sp : 0) + ww; });
    if (cur.length) lines.push(cur); return lines;
  }
  function drawCaptions(g, S, ts) {
    const o = S.opts, words = S.track.words || []; if (!words.length) return;
    const size = o.captionSize || Math.round(S.H * 0.052), font = (o.captionFont || "600 {size}px system-ui, -apple-system, 'Segoe UI', sans-serif").replace("{size}", size);
    g.save(); g.font = font; g.textBaseline = "middle";
    const lines = S.cache.lines && S.cache.font === font ? S.cache.lines : (S.cache.font = font, S.cache.lines = wrapWords(g, words, S.W * 0.84));
    // current line: the one holding the last word that has started (or the first)
    let li = 0; lines.forEach((L, i) => { if (L[0].t0 <= ts + 0.05) li = i; });
    const L = lines[li], end = L[L.length - 1].t1;
    const fin = li === 0 ? C.seg(ts, L[0].t0 - 0.3, L[0].t0) : 1, fout = li === lines.length - 1 ? 1 - C.seg(ts, end + 0.9, end + 1.3) : 1, fade = Math.min(fin, fout);
    if (fade <= 0.001) { g.restore(); return; }
    const sp = g.measureText(" ").width, tw = L.reduce((a, w) => a + w.ww, 0) + sp * (L.length - 1);
    const cy = S.H * (o.captionY == null ? 0.9 : o.captionY), pad = size * 0.45;
    let x = (S.W - tw) / 2;
    g.globalAlpha = fade; g.fillStyle = o.captionBg || "rgba(10,6,14,.55)";
    if (g.roundRect) { g.beginPath(); g.roundRect(x - pad, cy - size * 0.75, tw + pad * 2, size * 1.5, size * 0.3); g.fill(); } else g.fillRect(x - pad, cy - size * 0.75, tw + pad * 2, size * 1.5);
    L.forEach((w) => {
      const k = C.seg(ts, w.t0, w.t1);
      g.fillStyle = ts >= w.t1 ? (o.captionColor || "#fff") : (o.captionDim || "rgba(255,255,255,.45)"); g.fillText(w.text, x, cy);
      if (k > 0 && k < 1) { g.save(); g.beginPath(); g.rect(x, cy - size, w.ww * k, size * 2); g.clip(); g.fillStyle = o.captionHighlight || "#ffd36b"; g.fillText(w.text, x, cy); g.restore(); }
      else if (k >= 1 && ts < w.t1 + 0.25) { g.fillStyle = o.captionHighlight || "#ffd36b"; g.fillText(w.text, x, cy); }
      x += w.ww + sp;
    });
    g.restore();
  }

  function trackOf(o) {
    if (o.track) return fromAny(o.track);
    const vo = { fps: o.fps, charDur: o.charDur, pauseDur: o.pauseDur, tagTime: o.tagTime, gapMin: o.gapMin, weakWeight: o.weakWeight, tail: 0.2 };
    return visemes(o.timings || o.text || "", vo);
  }
  function blinkAt(S, t) {
    if (S.opts.blink === false) return false;
    let b = 1.6, n = 0; while (b <= t && n < 10000) { if (t < b + 0.14) return true; b += 0.14 + 2.4 + C.hash(S.seed * 3.7 + n) * 2.6; n++; }
    return false;
  }

  const mod = C.defineModule("lipsync", {
    aliases: { expression: "ekspresi", expressionTransition: "transisiEkspresi", transitionExpression: "transisiEkspresi" },
    size: [720, 720],
    duration: (o) => (o.duration ? o.duration : (o.lead == null ? 0.3 : o.lead) + trackOf(o).duration + (o.tail == null ? 1.2 : o.tail)),
    defaults: {
      text: "[excited] Halo, apa kabar semuanya?", track: null, timings: null, face: "presenter", image: null, imageFit: "contain", imageBg: null,
      mouth: null, patch: true, eyes: null, pivot: null, overscan: null, headMotion: 1, lead: 0.3, tail: 1.2, fps: 12, charDur: 0.07, pauseDur: 0.25, tagTime: false,
      blend: 0, endSmile: true, blink: true, seed: 3, palette: null, drawMouth: null, emotion: undefined, ekspresi: null, transisiEkspresi: 0.25,
      captions: false, captionFont: null, captionSize: null, captionColor: "#fff", captionDim: "rgba(255,255,255,.45)", captionHighlight: "#ffd36b", captionBg: "rgba(10,6,14,.55)", captionY: 0.9,
      labels: false, duration: null,
    },
    setup(S) {
      const o = S.opts;
      S.track = trackOf(o); S.seed = o.seed == null ? 3 : o.seed;
      S.pal = Object.assign({}, DEF_PAL, o.palette || {});
      S.excited = o.emotion !== undefined ? !!o.emotion : S.track.emotion === "excited";
    },
    render(g, t, S) {
      const o = S.opts, lead = o.lead == null ? 0.3 : o.lead, ts = t - lead;
      const m = at(S.track, ts, { endSmile: o.endSmile, blend: o.blend });
      const talk = m.talking, br = Math.sin(t * TAU / 4.2);
      const rot = Math.sin(t * 0.9) * 0.9 + (talk ? Math.sin(t * 3.1) * 0.6 : 0) - m.accent * 0.8, nod = m.accent * 1.2 + m.openK * 0.5;
      const st = { m, tt: t, ts, br, rot, nod, accent: m.accent, openK: m.openK, blink: blinkAt(S, t), excited: S.excited,
        au: o.ekspresi && (MGP.face || MGP.wajah) ? (MGP.face || MGP.wajah).auPada(o.ekspresi, t, o.transisiEkspresi == null ? 0.25 : o.transisiEkspresi) : null };
      if (o.face === "image") drawImageFace(g, S, st);
      else { const s = Math.max(S.W, S.H) / 346; g.save(); g.translate(S.W / 2, S.H / 2); g.scale(s, s); g.translate(-185, -187); drawPresenter(g, S, st); g.restore(); }
      if (o.captions) drawCaptions(g, S, ts);
      if (o.labels) { g.font = `${Math.round(S.H * 0.03)}px ui-monospace, monospace`; g.fillStyle = "#fbeed2"; g.textAlign = "right"; g.fillText(m.viseme, S.W - 14, S.H - 14); g.textAlign = "start"; }
    },
  });
  mod.visemes = visemes; mod.at = at; mod.toJSON = toJSON;
  mod.lib = { VIS, ARPA, OPEN, SHAPES, mouthFor, mixMouth, drawMouth, drawPresenter, drawImageFace, drawCaptions, segText, binSegments, visOfPhone };
  MGP.lipsync = mod;
})(typeof globalThis !== "undefined" ? globalThis : this);
