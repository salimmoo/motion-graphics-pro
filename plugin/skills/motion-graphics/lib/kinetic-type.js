/**
 * MGP.kineticType \u2014 kinetic typography on canvas: a list of timed text beats, each animated with a named preset.
 *
 * Source: website guide/js/demos.js  tipo()  (paper card slides in, words rise one by one at a words-per-second
 * rate, *keywords* in italic with a highlighter stroke and a small scale pulse, card fades out after a hold of
 * 0.5 s + 0.3 s per word), demos-plus.js  "vo"  (narration words with start/end times \u2192 on-screen words),
 * "gaya"/scene label entries (ent(): exponential slide/pop entry, offset\u00b7e^(-u/0.17), opacity u/0.2).
 * Rewritten as a deterministic canvas renderer; the presets below generalise those motions.
 *
 * Presets (beat.preset or opts.preset):
 *   card        tipo: paper card (kicker + headline) slides in, words rise, keyword highlighter + pulse
 *   rise        words fade up 12 px one by one (5 frames each, ease-out quad)
 *   pop         words scale-pop with overshoot (back ease)
 *   slide       lines slide in from a side with exponential settle (from: "l"|"r"|"t"|"b")
 *   mask        lines rise from behind a mask (clip per line), staggered
 *   cascade     characters drop in with a small rotation, staggered per character
 *   typewriter  characters appear at `cps`, stepped caret
 *   karaoke     all words shown dim; a colour fill sweeps through each word over its spoken time
 *   zoom        the whole block settles from 1.18x with a fade
 *   wipe        soft left-to-right reveal of the block
 * Exit (beat.exit / opts.exit): "fade" (default) | "up" | "none", over exitDur (0.18 s).
 *
 * Beat: { t, dur?, text, preset?, kicker?, words?: [[word, start, end], ...] (absolute s, for karaoke/VO),
 *         x?, y?, align?, valign?, size?, font?, weight?, color?, keyColor?, highlight?, maxWidth?, from?, ... }
 *   text marks keywords with *asterisks*: "Yang *dibagikan* justru tetap ada". "\n" forces a line break.
 *   Missing dur is derived from the preset (card: 0.55 + n/wps + 0.5 + 0.3\u00b7n).
 *
 * Options (defaults; every option can also be set per beat):
 *   beats       demo beats (one per preset)   preset "rise"
 *   ref         1280      reference width: px sizes below are for a 1280-wide frame and scale with W/ref
 *   font        system sans   (card preset uses `serif` for the headline and `capsFont` for the kicker)
 *   serif "Georgia, 'Times New Roman', serif", capsFont same as serif
 *   size 54, weight 700, lineHeight 1.12, letterSpacing 0, color "#141414", keyColor null (= color),
 *   keyItalic true, keyScale 1.12, highlight "#F1C75B", dim "rgba(20,20,20,.28)" (karaoke unsung words)
 *   x .5, y .5, align "center", valign "middle", maxWidth .74 (fraction of W)
 *   wps 2.06 words/s, cps 18 chars/s (typewriter), stagger .035 s (cascade per char), lineStagger .1 s,
 *   delay 0 (card: .55), hold 1.2 s, exit "fade", exitDur .18, from "l", offset 260 px (slide)
 *   card { fill:"#FBF6EA", shadow:"#E3B04B", rotate:-1.2, padX:.04, padY:.032, kickerSize:14, kickerSpacing:.3,
 *          kickerColor:"rgba(20,20,20,.75)", enter:.6, travel:630 }
 *   bg          null      colour, (ctx, t, S) => void, or null (transparent)
 *   googleFonts []        e.g. ["Cormorant Garamond:wght@400;700"]; instance.ready waits for them (MGP.core.fontsReady)
 *   fps         0         stepped time (12 = on twos); 0 = smooth
 *
 * Pure helpers (api.lib): parse(text), layout(ctx, text, style, W) \u2192 {lines, w, h}, stagger(t, t0, i, each, dur),
 *   expo(u), captions(words, {maxWords, maxChars, gap, preset, lead, tail}) \u2192 beats, beatDuration(beat, opts), PRESETS.
 *
 * Example:
 *   const kt = MGP.kineticType.create("#stage", { bg: "#2C67B0", beats: [
 *     { t: 0, preset: "card", kicker: "KISAH KECIL SEHARI-HARI", text: "Yang *dibagikan* justru tetap ada", x: .07, y: .18, align: "left", valign: "top" },
 *     ...MGP.kineticType.captions([["Kapal", .5, .9], ["berangkat", .95, 1.62]], { preset: "karaoke" }) ] });
 *   MGP.core.expose(kt);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const F = 1 / 24;
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const SERIF = "Georgia, 'Times New Roman', serif";
  const PRESETS = ["card", "rise", "pop", "slide", "mask", "cascade", "typewriter", "karaoke", "zoom", "wipe"];

  const expo = (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
  const stagger = (t, t0, i, each, dur) => C.clamp((t - (t0 + i * each)) / (dur || 1e-6));

  /** Split text into words; *word* or *several words* become keywords; "\n" is a forced break. */
  function parse(text) {
    const out = []; let key = false;
    String(text || "").split(/(\n)/).forEach((chunk) => {
      if (chunk === "\n") { out.push({ br: true }); return; }
      chunk.split(/\s+/).filter(Boolean).forEach((w) => {
        let k = key, s = w;
        if (s.startsWith("*")) { k = true; s = s.slice(1); if (!s.endsWith("*")) key = true; }
        if (s.endsWith("*")) { s = s.slice(0, -1); key = false; }
        if (s) out.push({ text: s, key: k });
      });
    });
    return out;
  }

  const fontStr = (st, key, k) => `${key && st.keyItalic ? "italic " : ""}${st.weight} ${(st.size * (key ? st.keyScale : 1) * k).toFixed(2)}px ${st.font}`;
  function measure(g, s, ls) { if (!ls) return g.measureText(s).width; let w = 0; for (const ch of s) w += g.measureText(ch).width + ls; return w - ls; }

  /**
   * Lay out words into lines that fit maxWidth. Returns {lines:[{y, w, h, words:[{text,key,x,w,font,chars:[{c,x,w}],i}]}], w, h, n}
   * Coordinates are relative to the block's top-left; y is each line's baseline.
   */
  function layout(g, text, st, W) {
    const k = W / st.ref, words = typeof text === "string" ? parse(text) : text, ls = (st.letterSpacing || 0) * k;
    const maxW = st.maxWidth <= 1.5 ? st.maxWidth * W : st.maxWidth * k, lh = st.size * st.lineHeight * k;
    g.save(); g.font = fontStr(st, false, k); const space = g.measureText(" ").width + ls;
    const lines = []; let cur = { words: [], w: 0 }, idx = 0;
    const push = () => { lines.push(cur); cur = { words: [], w: 0 }; };
    words.forEach((wd) => {
      if (wd.br) { push(); return; }
      g.font = fontStr(st, wd.key, k); const w = measure(g, wd.text, ls);
      if (cur.words.length && cur.w + space + w > maxW) push();
      const x = cur.words.length ? cur.w + space : 0;
      const chars = []; let cx = 0; for (const ch of wd.text) { const cw = g.measureText(ch).width; chars.push({ c: ch, x: cx, w: cw }); cx += cw + ls; }
      cur.words.push({ text: wd.text, key: wd.key, x, w, font: g.font, chars, i: idx++ });
      cur.w = x + w;
    });
    if (cur.words.length || !lines.length) push();
    g.restore();
    const asc = st.size * k * 0.8;
    lines.forEach((L, i) => { L.y = asc + i * lh; L.h = lh; });
    const bw = Math.max(0, ...lines.map((L) => L.w));
    lines.forEach((L) => { L.dx = st.align === "center" ? (bw - L.w) / 2 : st.align === "right" ? bw - L.w : 0; });
    return { lines, w: bw, h: lines.length * lh, n: idx, lh, k, ls };
  }

  /** Default duration of a beat for its preset. */
  function beatDuration(b, o) {
    if (b.dur != null) return b.dur;
    const st = Object.assign({}, o, b), n = parse(st.text).filter((w) => !w.br).length, pre = st.preset;
    if (pre === "card") return 0.55 + n / st.wps + 0.5 + 0.3 * n;
    if (pre === "karaoke" && st.words && st.words.length) return st.words[st.words.length - 1][2] - b.t + 0.5;
    if (pre === "typewriter") return (st.delay || 0) + String(st.text).replace(/\*/g, "").length / st.cps + st.hold;
    if (pre === "cascade") return (st.delay || 0) + String(st.text).replace(/[*\s]/g, "").length * st.stagger + 0.45 + st.hold;
    return (st.delay || 0) + n / st.wps + 0.3 + st.hold;
  }

  /** Turn narration word timings [[word, start, end], ...] into caption beats (chunked by words/chars and pauses). */
  function captions(words, o = {}) {
    const maxW = o.maxWords || 6, maxC = o.maxChars || 34, gap = o.gap == null ? 0.5 : o.gap, lead = o.lead == null ? 0.12 : o.lead, tail = o.tail == null ? 0.35 : o.tail;
    const groups = []; let cur = [];
    words.forEach((w, i) => {
      const prev = words[i - 1], len = cur.map((x) => x[0]).join(" ").length + w[0].length + 1;
      if (cur.length && (cur.length >= maxW || len > maxC || (prev && w[1] - prev[2] > gap))) { groups.push(cur); cur = []; }
      cur.push(w);
    });
    if (cur.length) groups.push(cur);
    return groups.map((gp, i) => {
      const t = gp[0][1] - lead, next = groups[i + 1], end = Math.min(gp[gp.length - 1][2] + tail, next ? next[0][1] - lead : 1e9);
      return Object.assign({ t, dur: Math.max(0.3, end - t), text: gp.map((w) => w[0]).join(" "), words: gp, preset: o.preset || "karaoke", x: 0.5, y: 0.86, align: "center", valign: "bottom" }, o.beat || {});
    });
  }

  /* ---------- drawing ---------- */
  function drawWord(g, w, x, y, color) { g.font = w.font; g.fillStyle = color; if (!w.ls) { g.fillText(w.text, x, y); return; } w.chars.forEach((c) => g.fillText(c.c, x + c.x, y)); }

  function renderBeat(g, t, S, b, bi) {
    const o = S.opts, W = S.W, H = S.H, st = Object.assign({}, o, b);
    st.preset = st.preset || "rise";
    if (st.preset === "card") { st.font = b.font || o.serif; if (b.align == null) st.align = "left"; }
    const dur = beatDuration(b, o), t0 = b.t, t1 = t0 + dur, ex = st.exit === "none" ? 0 : st.exitDur;
    if (t < t0 - 0.001 || t > t1 + ex) return;
    const L = layout(g, st.text, st, W), k = L.k;
    L.lines.forEach((ln) => ln.words.forEach((w) => (w.ls = L.ls)));
    const keyCol = st.keyColor || st.color;
    // exit envelope
    const eu = ex ? C.clamp((t - t1) / ex) : t > t1 ? 1 : 0, alpha = 1 - eu;
    g.save(); g.globalAlpha = alpha; if (st.exit === "up") g.translate(0, -20 * k * C.ease.inQuad(eu));
    // block origin
    let bx = st.x * W, by = st.y * H, cardPad = [0, 0], kick = null;
    if (st.preset === "card") {
      const cd = Object.assign({ fill: "#FBF6EA", shadow: "#E3B04B", rotate: -1.2, padX: 0.04, padY: 0.032, kickerSize: 14, kickerSpacing: 0.3, kickerColor: "rgba(20,20,20,.75)", enter: 0.6, travel: 630 }, o.card || {}, b.card || {});
      cardPad = [cd.padX * W, cd.padY * W];
      if (st.kicker) { g.font = `600 ${cd.kickerSize * k}px ${st.capsFont || o.serif}`; kick = { cd, w: measure(g, st.kicker, cd.kickerSize * cd.kickerSpacing * k), h: cd.kickerSize * k }; }
      const kh = kick ? kick.h + st.size * k * 0.6 : 0, cw = Math.max(L.w, kick ? kick.w : 0) + 2 * cardPad[0], ch = L.h + kh + 2 * cardPad[1];
      if (st.valign === "middle") by -= ch / 2; else if (st.valign === "bottom") by -= ch;
      if (st.align === "center" && b.x != null) bx -= cw / 2;
      const cu = expo(C.clamp((t - t0) / cd.enter));
      g.globalAlpha = alpha * cu;
      g.translate(bx - cd.travel * k * (1 - cu), by); g.rotate((cd.rotate * Math.PI) / 180);
      g.save(); g.fillStyle = cd.shadow; g.fillRect(-6 * k, 8 * k, cw, ch); g.restore();
      g.save(); g.shadowColor = "rgba(43,26,12,.32)"; g.shadowBlur = 18 * k; g.shadowOffsetY = 9 * k; g.fillStyle = cd.fill; g.fillRect(0, 0, cw, ch); g.restore();
      if (kick) { g.save(); g.globalAlpha = alpha * cu * C.clamp((t - t0) / (4 * F)); g.fillStyle = cd.kickerColor; g.font = `600 ${cd.kickerSize * k}px ${st.capsFont || o.serif}`; g.textBaseline = "alphabetic"; let x = cardPad[0]; for (const c of st.kicker) { g.fillText(c, x, cardPad[1] + kick.h * 0.8); x += g.measureText(c).width + cd.kickerSize * cd.kickerSpacing * k; } g.restore(); }
      g.translate(cardPad[0], cardPad[1] + kh);
    } else {
      if (st.align === "center") bx -= L.w / 2; else if (st.align === "right") bx -= L.w;
      if (st.valign === "middle") by -= L.h / 2; else if (st.valign === "bottom") by -= L.h;
      g.translate(bx, by);
    }
    g.textBaseline = "alphabetic";
    const del = st.delay != null ? st.delay : st.preset === "card" ? 0.55 : 0, ws = t0 + del;
    const pre = st.preset;
    const block = () => L.lines.forEach((ln) => ln.words.forEach((w) => drawWord(g, w, ln.dx + w.x, ln.y, w.key ? keyCol : st.color)));
    if (pre === "zoom") {
      const u = C.ease.out(C.clamp((t - ws) / 0.7)), s = 1.18 - 0.18 * u; g.globalAlpha *= C.clamp(u * 1.6);
      g.translate(L.w / 2, L.h / 2); g.scale(s, s); g.translate(-L.w / 2, -L.h / 2); block();
    } else if (pre === "wipe") {
      const u = C.ease.inOut(C.clamp((t - ws) / Math.max(0.3, L.n / st.wps))), x = u * (L.w + 80 * k) - 40 * k;
      g.save(); const gr = g.createLinearGradient(x - 40 * k, 0, x + 40 * k, 0); g.beginPath(); g.rect(-10 * k, -10 * k, Math.max(0, x + 40 * k + 10 * k), L.h + 20 * k); g.clip();
      block(); g.restore();
      if (u < 1 && u > 0) { g.save(); g.globalCompositeOperation = "destination-out"; gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = gr; g.fillRect(x - 40 * k, -10 * k, 80 * k, L.h + 20 * k); g.restore(); }
    } else if (pre === "slide" || pre === "mask") {
      L.lines.forEach((ln, li) => {
        const u = t - (ws + li * st.lineStagger);
        if (u < 0) return;
        g.save();
        if (pre === "slide") {
          const e = Math.exp(-u / 0.17), off = st.offset * k * e, fr = st.from;
          g.globalAlpha *= Math.min(1, u / 0.2); g.translate(fr === "l" ? -off : fr === "r" ? off : 0, fr === "b" ? off : fr === "t" ? -off : 0);
        } else {
          const e = C.ease.out5(C.clamp(u / 0.6)); g.beginPath(); g.rect(-20 * k, ln.y - ln.h * 0.9, L.w + 40 * k, ln.h * 1.08); g.clip(); g.translate(0, ln.h * 1.15 * (1 - e));
        }
        ln.words.forEach((w) => drawWord(g, w, ln.dx + w.x, ln.y, w.key ? keyCol : st.color));
        g.restore();
      });
    } else if (pre === "typewriter" || pre === "cascade") {
      let ci = 0; const shown = pre === "typewriter" ? Math.floor(Math.max(0, t - ws) * st.cps + 1e-6) : 1e9; let caret = null;
      L.lines.forEach((ln) => ln.words.forEach((w) => {
        g.font = w.font;
        w.chars.forEach((c) => {
          const x = ln.dx + w.x + c.x, y = ln.y;
          if (pre === "typewriter") { if (ci < shown) { g.fillStyle = w.key ? keyCol : st.color; g.fillText(c.c, x, y); caret = [x + c.w, y]; } }
          else {
            const u = stagger(t, ws, ci, st.stagger, 0.45);
            if (u > 0) { const e = C.ease.back(u), r = (C.hash(ci + bi * 31) - 0.5) * 0.42; g.save(); g.globalAlpha *= C.clamp(u * 3); g.translate(x + c.w / 2, y - st.size * k * 0.3); g.rotate(r * (1 - e)); g.translate(0, -st.size * k * 0.55 * (1 - e)); g.fillStyle = w.key ? keyCol : st.color; g.fillText(c.c, -c.w / 2, st.size * k * 0.3); g.restore(); }
          }
          ci++;
        });
        if (pre === "typewriter" && ci < shown) caret = [ln.dx + w.x + w.w + 6 * k, ln.y];
        ci += 1; // the space counts as a keystroke
      }));
      if (pre === "typewriter") {
        const typing = shown < ci, on = typing || Math.floor((t - ws) * 2.2) % 2 === 0;
        if (!caret) caret = [L.lines[0].dx, L.lines[0].y];
        if (on && t >= ws) { g.fillStyle = st.keyColor || st.color; g.fillRect(caret[0] + 2 * k, caret[1] - st.size * k * 0.78, Math.max(2, st.size * k * 0.07), st.size * k * 0.92); }
      }
    } else if (pre === "karaoke") {
      const all = L.lines.flatMap((ln) => ln.words.map((w) => ({ w, ln })));
      const tim = b.words && b.words.length === all.length ? b.words.map((x) => [x[1], x[2]]) : all.map((_, i) => [ws + i / st.wps, ws + (i + 0.9) / st.wps]);
      const inU = C.clamp((t - t0) / 0.15); g.globalAlpha *= inU;
      all.forEach(({ w, ln }, i) => {
        const x = ln.dx + w.x, y = ln.y, [a, e] = tim[i], u = C.clamp((t - a) / Math.max(0.05, e - a));
        drawWord(g, w, x, y, st.dim);
        if (u > 0) {
          if (u < 1 && st.highlight) { g.save(); g.fillStyle = C.rgba(st.highlight, 0.35); const pad = 6 * k; g.fillRect(x - pad, y - st.size * k * 0.85, w.w + 2 * pad, st.size * k * 1.12); g.restore(); }
          g.save(); g.beginPath(); g.rect(x - 2, y - st.size * k * 1.2, (w.w + 4) * u, st.size * k * 1.6); g.clip(); drawWord(g, w, x, y, w.key ? keyCol : st.color); g.restore();
        }
      });
    } else {
      // card / rise / pop: per-word entries at wps
      L.lines.forEach((ln) => ln.words.forEach((w) => {
        const wt = ws + w.i / st.wps, x = ln.dx + w.x, y = ln.y, sz = st.size * k * (w.key ? st.keyScale : 1);
        g.save();
        if (pre === "pop") {
          const u = C.clamp((t - wt) / 0.32); if (u <= 0) { g.restore(); return; }
          const s = 0.4 + 0.6 * C.ease.back(u); g.globalAlpha *= C.clamp(u * 2.5);
          g.translate(x + w.w / 2, y - sz * 0.35); g.scale(s, s); g.translate(-(x + w.w / 2), -(y - sz * 0.35));
        } else {
          const u = C.clamp((t - (wt - F)) / (5 * F)), e2 = 1 - Math.pow(1 - u, 2); if (u <= 0) { g.restore(); return; }
          let sc = 1;
          if (w.key) { const d = t - (wt - 3 * F); if (d > 0 && d < 6 * F) sc = 1 + 0.055 * Math.sin((Math.PI * d) / (6 * F)); }
          g.globalAlpha *= e2; g.translate(0, 12 * k * (1 - e2));
          if (sc !== 1) { g.translate(x + w.w / 2, y - sz * 0.35); g.scale(sc, sc); g.translate(-(x + w.w / 2), -(y - sz * 0.35)); }
          if (w.key && st.highlight && (pre === "card" || st.marker)) {
            const hu = 1 - Math.pow(1 - C.clamp((t - (wt + F)) / (6 * F)), 2);
            if (hu > 0) { const x0 = x - 6 * k, ww = (w.w + 12 * k) * hu, top = y - sz * 0.8 + sz * 0.34, hh = sz * 0.58; g.save(); g.globalAlpha = alpha * (pre === "card" ? 1 : 1); g.beginPath(); g.moveTo(x0, top + hh * 0.1); g.lineTo(x0 + ww, top); g.lineTo(x0 + ww * 0.98, top + hh); g.lineTo(x0 + ww * 0.01, top + hh * 0.9); g.closePath(); g.fillStyle = st.highlight; g.fill(); g.restore(); }
          }
        }
        drawWord(g, w, x, y, w.key ? keyCol : st.color);
        g.restore();
      }));
    }
    g.restore();
  }

  const DEMO = [
    { t: 0, preset: "card", kicker: "KISAH KECIL SEHARI-HARI", text: "Yang *dibagikan* justru tetap ada", x: 0.07, y: 0.18, align: "left", valign: "top" },
  ];

  const api = C.defineModule("kineticType", {
    size: [1280, 720],
    duration: (o) => Math.max(0.5, ...o.beats.map((b) => b.t + beatDuration(b, o) + (o.exit === "none" ? 0 : o.exitDur))) + (o.tail || 0.4),
    defaults: {
      beats: DEMO, preset: "rise", ref: 1280, font: SANS, serif: SERIF, capsFont: null,
      size: 54, weight: 700, lineHeight: 1.12, letterSpacing: 0, color: "#141414", keyColor: null, keyItalic: true, keyScale: 1.12,
      highlight: "#F1C75B", dim: "rgba(20,20,20,.28)", marker: false,
      x: 0.5, y: 0.5, align: "center", valign: "middle", maxWidth: 0.74,
      wps: 2.06, cps: 18, stagger: 0.035, lineStagger: 0.1, delay: null, hold: 1.2, exit: "fade", exitDur: 0.18, from: "l", offset: 260,
      card: null, bg: null, googleFonts: [], fps: 0, tail: 0.4,
    },
    setup(S) { if (S.opts.googleFonts && S.opts.googleFonts.length) S.ready = C.fontsReady(S.opts.googleFonts); },
    render(g, t, S) {
      const o = S.opts; if (o.fps) t = C.stepT(t, o.fps);
      if (typeof o.bg === "function") { g.save(); o.bg(g, t, S); g.restore(); } else if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, S.W, S.H); }
      o.beats.forEach((b, i) => renderBeat(g, t, S, b, i));
    },
  });
  api.captions = captions;
  api.PRESETS = PRESETS;
  api.lib = { parse, layout, stagger, expo, captions, beatDuration, PRESETS, renderBeat };
  MGP.kineticType = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
