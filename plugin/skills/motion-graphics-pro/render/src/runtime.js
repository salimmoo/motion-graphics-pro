/*
 * mgp runtime inside the page (formerly "Rekam").
 * Injected as the first script in the composition <head>. Its jobs:
 *   1. freeze the clock (Date, performance.now, requestAnimationFrame) to virtual time,
 *   2. seed Math.random,
 *   3. load sub-compositions (data-composition-src) the HyperFrames way,
 *   4. provide window.__mgpRuntime.ready() and window.__mgpRuntime.seek(t)
 *      (old name window.__rekam with siap/seek/timelineBlok/waktu: the same object).
 * Written for mgp; the composition contract follows HyperFrames (Apache-2.0).
 */
(function () {
  "use strict";
  if (window.__mgpRuntime || window.__rekam) return;

  // message language (window.__mgpLang, injected by the mgp server next to __mgpVars): English unless "id"
  const tr = (en, id) => (String(window.__mgpLang || "").toLowerCase().startsWith("id") ? id : en);

  // ---------------------------------------------------------------- jam virtual
  const RealDate = Date;
  const realNow = performance.now.bind(performance);
  const realRAF = window.requestAnimationFrame.bind(window);
  const realSetTimeout = window.setTimeout.bind(window);
  const EPOCH = RealDate.UTC(2026, 0, 1, 0, 0, 0);
  let vms = 0; // waktu virtual dalam milidetik

  function VDate(...args) {
    if (!(this instanceof VDate)) return new RealDate(EPOCH + vms).toString();
    return args.length ? new RealDate(...args) : new RealDate(EPOCH + vms);
  }
  VDate.prototype = RealDate.prototype;
  VDate.now = () => EPOCH + vms;
  VDate.UTC = RealDate.UTC;
  VDate.parse = RealDate.parse;
  window.Date = VDate;
  performance.now = () => vms;

  let rafQueue = [];
  let rafId = 0;
  window.requestAnimationFrame = (cb) => { rafQueue.push({ id: ++rafId, cb }); return rafId; };
  window.cancelAnimationFrame = (id) => { rafQueue = rafQueue.filter((r) => r.id !== id); };
  function flushRAF() {
    const q = rafQueue; rafQueue = [];
    for (const r of q) { try { r.cb(vms); } catch (e) { console.error(e); } }
  }

  // ---------------------------------------------------------------- acak berseed
  let seed = 0x2f6b1d3a;
  Math.random = function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---------------------------------------------------------------- WebGL context lost (black frames)
  // A WebGL canvas whose context is lost (GPU process restarted under load) draws nothing: the frame comes out
  // black without any error. health() reports the lost, not restored canvases still in the page; mgp stops on them.
  const lostCanvases = new Set();
  window.addEventListener("webglcontextlost", (e) => { if (e.target && e.target.tagName === "CANVAS") lostCanvases.add(e.target); }, true);
  window.addEventListener("webglcontextrestored", (e) => { if (e.target) lostCanvases.delete(e.target); }, true);
  // the event arrives a task later; the context itself says it at once (isContextLost), so WebGL contexts are recorded
  const glContexts = [];
  if (window.HTMLCanvasElement) {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type) {
      const c = origGetContext.apply(this, arguments);
      if (c && /^(webgl2?|experimental-webgl)$/i.test(String(type)) && typeof c.isContextLost === "function" && !glContexts.some((x) => x.g === c)) glContexts.push({ el: this, g: c });
      return c;
    };
  }
  function health() {
    const lost = new Set();
    for (const c of lostCanvases) if (c.isConnected) lost.add(c);
    for (const x of glContexts) { try { if (x.el.isConnected && x.g.isContextLost()) lost.add(x.el); } catch (e) { /* ignore */ } }
    return { lostContexts: lost.size };
  }

  // ---------------------------------------------------------------- canvas fonts (P1-2)
  // document.fonts.ready only waits for faces the DOM uses; a family used only through ctx.font is never
  // loaded, so the canvas draws with the fallback font. fillText/strokeText/measureText record the font and the
  // characters drawn; seek() then loads the recorded fonts (document.fonts.load) and, when a face was loaded,
  // seeks again so the frame is drawn with the real font. canvasFonts() reports the status for `mgp check`.
  const canvasFonts = new Map(); // ctx.font -> { chars: Set, done, at: first seek time, late }
  let canvasFontsDirty = false, seekingNow = null, seekActive = false;
  const origMeasure = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.measureText;
  function noteFont(c, text) {
    let f;
    try { f = c.font; } catch (e) { return; }
    let e = canvasFonts.get(f);
    if (!e) { e = { chars: new Set(), done: false, last: null, at: seekingNow }; canvasFonts.set(f, e); dirty(); }
    if (seekActive) e.inSeek = true;
    if (text == null || e.chars.size >= 160) return;
    const s = String(text);
    if (s === e.last) return;
    e.last = s;
    let i = 0;
    for (const ch of s) {
      if (++i > 200) break;
      if (!e.chars.has(ch)) { e.chars.add(ch); e.done = false; dirty(); }
    }
  }
  // faces loaded at the moment the new font/characters were drawn (a face that loads a moment later, before
  // mgp looks, still means this frame was drawn with the fallback)
  let drawSnap = null;
  function dirty() {
    canvasFontsDirty = true;
    if (!drawSnap && document.fonts) { drawSnap = new Set(); for (const x of document.fonts) if (x.status === "loaded") drawSnap.add(x); }
  }
  for (const P of [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D]) {
    if (!P || !P.prototype) continue;
    for (const m of ["fillText", "strokeText", "measureText"]) {
      const orig = P.prototype[m];
      if (typeof orig !== "function") continue;
      P.prototype[m] = function (text) { noteFont(this, text); return orig.apply(this, arguments); };
    }
  }
  async function loadCanvasFonts() {
    canvasFontsDirty = false;
    if (!document.fonts) return false;
    const jobs = [];
    // (document.fonts.check() is true for faces that have not started loading, so it cannot tell; load() is
    // cheap for faces that are already loaded)
    const was = drawSnap || new Set([...document.fonts].filter((x) => x.status === "loaded"));
    drawSnap = null;
    let changed = false;
    for (const [f, e] of canvasFonts) {
      if (e.done) continue;
      e.done = true;
      const text = [...e.chars].join("") || "a";
      jobs.push(document.fonts.load(f, text).then((faces) => {
        e.faces = faces || [];
        if (e.faces.some((x) => !was.has(x))) { e.late = true; changed = true; }
      }, () => { e.faces = []; e.failed = true; }));
    }
    if (!jobs.length) return false;
    await Promise.race([Promise.all(jobs), new Promise((r) => realSetTimeout(r, 15000))]);
    return changed;
  }
  const GENERIC_FAM = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "inherit", "initial", "-apple-system", "blinkmacsystemfont"]);
  const unq = (s) => String(s).trim().replace(/^["']|["']$/g, "");
  let famProbe = null;
  function famsOf(font) {
    famProbe = famProbe || document.createElement("span");
    famProbe.style.font = "";
    famProbe.style.font = font;
    return (famProbe.style.fontFamily || "").split(",").map(unq).filter(Boolean);
  }
  let sysCtx = null;
  function systemHas(fam) {
    if (!origMeasure) return true;
    sysCtx = sysCtx || document.createElement("canvas").getContext("2d");
    const s = "mmmmmmmmmmlli1WQ@#&gy";
    for (const base of ["monospace", "serif", "sans-serif"]) {
      sysCtx.font = "72px " + base;
      const w0 = origMeasure.call(sysCtx, s).width;
      sysCtx.font = '72px "' + fam.replace(/"/g, "") + '", ' + base;
      if (origMeasure.call(sysCtx, s).width !== w0) return true;
    }
    return false;
  }
  /** [{ family, font, status: loaded|unloaded|loading|error|system|fallback|generic, fallback, late, at }] */
  function canvasFontReport() {
    const out = [], seen = new Set();
    for (const [f, e] of canvasFonts) {
      const fams = famsOf(f), first = fams[0];
      if (!first) continue;
      const k = first.toLowerCase(), key = k + "|" + f;
      if (seen.has(key)) continue;
      seen.add(key);
      let status;
      if (GENERIC_FAM.has(k)) status = "generic";
      else {
        const faces = document.fonts ? [...document.fonts].filter((x) => unq(x.family).toLowerCase() === k) : [];
        if (!faces.length) status = systemHas(first) ? "system" : "fallback";
        else if (e.failed || faces.every((x) => x.status === "error")) status = "error";
        else if (!e.faces) status = faces.some((x) => x.status === "loaded") ? "loaded" : "unloaded";
        else if (!e.faces.length) status = "unmatched"; // declared, but no face fits this weight/style/characters
        else status = e.faces.every((x) => x.status === "loaded") ? "loaded" : e.faces.some((x) => x.status === "error") ? "error" : "loading";
      }
      out.push({ family: first, font: f, status, fallback: fams.slice(1).join(", "), late: !!e.late, at: e.at, inSeek: !!e.inSeek });
    }
    return out;
  }

  // ---------------------------------------------------------------- GSAP
  // Tangkap gsap saat dipasang: matikan auto-remove pada timeline global agar
  // tween yang sudah selesai tetap bisa di-seek mundur, dan matikan lag smoothing.
  window.__timelines = window.__timelines || {};
  let gsapRef = window.gsap;
  function tameGsap(g) {
    try {
      if (!g || g.__mgpTamed) return;
      g.__mgpTamed = true;
      g.globalTimeline.autoRemoveChildren = false;
      g.ticker.lagSmoothing(0);
      // transform 2D (bukan translate3d) agar Chrome tidak mem-promote layer dan
      // menyimpan raster lama: piksel jadi sama walau urutan seek berbeda
      g.config({ force3D: false });
      g.defaults({ lazy: false });
    } catch (e) { /* abaikan */ }
  }
  if (gsapRef) tameGsap(gsapRef);
  else {
    try {
      Object.defineProperty(window, "gsap", {
        configurable: true, enumerable: true,
        get() { return gsapRef; },
        set(v) { gsapRef = v; tameGsap(v); },
      });
    } catch (e) { /* abaikan */ }
  }

  // ---------------------------------------------------------------- util DOM
  const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  const sleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
  const nextPaint = () => new Promise((r) => realRAF(() => realRAF(r)));

  function rootComp() {
    const all = document.querySelectorAll("[data-composition-id]");
    for (const el of all) if (!el.parentElement || !el.parentElement.closest("[data-composition-id]")) return el;
    return null;
  }

  // offset waktu global sebuah elemen = jumlah data-start host komposisi di atasnya
  function compOffset(el) {
    let off = 0, p = el.parentElement ? el.parentElement.closest("[data-composition-id]") : null;
    while (p) {
      const up = p.parentElement ? p.parentElement.closest("[data-composition-id]") : null;
      if (up) off += num(p.getAttribute("data-start"), 0); // root tidak dihitung
      p = up;
    }
    return off;
  }

  // ---------------------------------------------------------------- variabel komposisi
  // Deklarasi: data-composition-variables='[{id,type,label,default,...}]' pada <html> atau root komposisi
  // (file scene: <html> file itu atau root di <template>). Nilai root bisa diganti dari CLI
  // (--var / --vars). Host sub-komposisi bisa memberi data-variable-values='{...}' untuk mount itu.
  // Pengikatan: data-var-text="id" (isi teks), data-var-<atribut>="id" (mis. src, href, poster),
  // var(--id) di CSS, dan window.__hyperframes.getVariables() saat inisialisasi.
  const cliVarsIn = window.__mgpVars || window.__rekamVars; // old name __rekamVars
  const cliVars = (cliVarsIn && typeof cliVarsIn === "object") ? cliVarsIn : {};
  const varIssues = [];
  const varIssueSeen = new Set();
  const varIssue = (kind, msg) => { if (varIssueSeen.has(msg)) return; varIssueSeen.add(msg); varIssues.push({ kind, msg }); };
  const varScopes = new WeakMap();
  let currentScope = null;

  function declOf(el) {
    if (!el || !el.getAttribute) return [];
    const raw = el.getAttribute("data-composition-variables");
    if (!raw) return [];
    try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((d) => d && d.id) : []; }
    catch (e) { varIssue("json", tr("data-composition-variables is not valid JSON: ", "data-composition-variables bukan JSON yang sah: ") + e.message); return []; }
  }

  function coerceVar(d, v, from) {
    if (!d) return v;
    const id = d.id, t = d.type || "string";
    const bad = (why) => { varIssue("type", tr(`variable "${id}" (${from}): `, `variabel "${id}" (${from}): `) + why); };
    if (t === "number") {
      const n = typeof v === "number" ? v : parseFloat(v);
      if (!Number.isFinite(n)) { bad(tr(`"${v}" is not a number`, `"${v}" bukan angka`)); return d.default; }
      if (d.min != null && n < d.min) bad(tr(`${n} is below min ${d.min}`, `${n} di bawah min ${d.min}`));
      if (d.max != null && n > d.max) bad(tr(`${n} is above max ${d.max}`, `${n} di atas max ${d.max}`));
      return n;
    }
    if (t === "boolean") {
      if (typeof v === "boolean") return v;
      const s = String(v).toLowerCase();
      if (["true", "1", "ya", "yes", "on"].includes(s)) return true;
      if (["false", "0", "tidak", "no", "off", ""].includes(s)) return false;
      bad(tr(`"${v}" is not a boolean`, `"${v}" bukan boolean`)); return !!d.default;
    }
    if (t === "enum") {
      const opts = (d.options || []).map((o) => (o && typeof o === "object" ? o.value : o));
      if (opts.length && !opts.map(String).includes(String(v))) bad(tr(`"${v}" is not one of ${opts.join(", ")}`, `"${v}" bukan salah satu dari ${opts.join(", ")}`));
      return v;
    }
    if (t === "color") {
      try { if (window.CSS && CSS.supports && !CSS.supports("color", String(v))) bad(tr(`"${v}" is not a CSS colour`, `"${v}" bukan warna CSS`)); } catch (e) { /* abaikan */ }
      return String(v);
    }
    const s = String(v);
    if (d.maxLength != null && s.length > d.maxLength) bad(tr(`length ${s.length} exceeds maxLength ${d.maxLength}`, `panjang ${s.length} melebihi maxLength ${d.maxLength}`));
    return s;
  }

  function defaultsOf(decls) {
    const o = {};
    for (const d of decls) if (d.default !== undefined) o[d.id] = coerceVar(d, d.default, "default");
    return o;
  }

  function rootDecls() {
    const r = rootComp();
    const seen = new Set(), out = [];
    for (const d of [...declOf(document.documentElement), ...declOf(r)]) if (!seen.has(d.id)) { seen.add(d.id); out.push(d); }
    return out;
  }

  function rootVars() {
    const decls = rootDecls();
    const byId = Object.fromEntries(decls.map((d) => [d.id, d]));
    const v = defaultsOf(decls);
    for (const k of Object.keys(cliVars)) {
      if (!byId[k]) varIssue("undeclared", tr(`variable "${k}" from the CLI is not declared on the root (used as text anyway)`, `variabel "${k}" dari CLI tidak dideklarasikan di root (tetap dipakai sebagai teks)`));
      v[k] = coerceVar(byId[k], cliVars[k], "CLI");
    }
    return v;
  }

  const cssVal = (v) => (typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  function applyCssVars(target, vars) {
    for (const k of Object.keys(vars)) {
      if (!/^[A-Za-z_][\w-]*$/.test(k)) continue;
      try { target.style.setProperty("--" + k, cssVal(vars[k])); } catch (e) { /* abaikan */ }
    }
  }

  function bindEl(el, vars) {
    for (const a of [...el.attributes]) {
      if (!a.name.startsWith("data-var-")) continue;
      const prop = a.name.slice(9), id = a.value;
      if (!prop || !id) continue;
      if (!(id in vars)) { varIssue("unknown", `${a.name}="${id}": ` + tr("variable not declared", "variabel tidak dideklarasikan")); continue; }
      const val = vars[id];
      if (prop === "text") el.textContent = String(val);
      else if (prop === "src" && (el.tagName === "VIDEO" || el.tagName === "AUDIO")) { if (el.getAttribute("src") !== String(val)) { el.setAttribute("src", String(val)); try { el.load(); } catch (e) { /* abaikan */ } } }
      else el.setAttribute(prop, String(val));
    }
  }

  // scopeHost null = root: lewati elemen di dalam host sub-komposisi (diikat saat scene dimuat)
  function bindTree(node, vars, scopeHost) {
    if (!node || node.nodeType !== 1) return;
    const list = [node, ...node.querySelectorAll("*")];
    for (const el of list) {
      if (!el.attributes || !el.attributes.length) continue;
      let has = false;
      for (const a of el.attributes) if (a.name.startsWith("data-var-")) { has = true; break; }
      if (!has) continue;
      // host sendiri (atribut data-var-* pada elemen host) termasuk lingkup induknya
      const own = el.parentElement ? el.parentElement.closest("[data-composition-src]") : null;
      if ((own || null) !== (scopeHost || null)) continue;
      bindEl(el, vars);
    }
  }

  let varObserver = null;
  try {
    varObserver = new MutationObserver((muts) => {
      const vars = rootVars();
      for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) bindTree(n, vars, null);
    });
    varObserver.observe(document.documentElement, { childList: true, subtree: true });
    applyCssVars(document.documentElement, rootVars());
  } catch (e) { /* abaikan */ }

  function applyRootVars() {
    const vars = rootVars();
    applyCssVars(document.documentElement, vars);
    if (document.body) bindTree(document.body, vars, null);
    return vars;
  }

  function varsReport() {
    const decls = rootDecls();
    return { declared: decls.map((d) => ({ id: d.id, type: d.type || "string" })), values: rootVars(), cli: Object.keys(cliVars), issues: varIssues.slice() };
  }

  // ---------------------------------------------------------------- pas-teks (fitText)
  // Cari ukuran font terbesar (baseFontSize, lalu turun per step, minimal minFontSize)
  // yang membuat teks muat di maxWidth (dan maxLines / maxHeight bila diberikan).
  // Pengukuran memakai canvas measureText: deterministik untuk browser yang sama.
  const fitLog = [];
  const fitSeen = new Set();
  let measureCtx = null;
  function mctx() { if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d"); return measureCtx; }
  function famStr(f) {
    f = String(f || "sans-serif").trim();
    if (f.includes(",")) return f;
    if (/^["']/.test(f) || /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(f)) return f;
    return '"' + f.replace(/"/g, "") + '"';
  }
  function fontStr(size, o) { return `${o.fontStyle || "normal"} ${o.fontWeight || 400} ${size}px ${famStr(o.fontFamily)}`; }
  function layoutLines(text, size, o) {
    const g = mctx();
    g.font = fontStr(size, o);
    let ls = 0;
    if (o.letterSpacing != null) {
      const m = /^(-?[\d.]+)\s*(em|px)?$/.exec(String(o.letterSpacing).trim());
      if (m) ls = m[2] === "em" ? +m[1] * size : +m[1];
    }
    try { g.letterSpacing = ls + "px"; } catch (e) { /* browser lama */ }
    const wOf = (s) => g.measureText(s).width;
    const maxLines = Math.max(1, o.maxLines || 1);
    const paras = String(text).split(/\n/);
    if (maxLines === 1 && paras.length === 1) return { lines: 1, width: wOf(paras[0]), overWord: false };
    let lines = 0, widest = 0, overWord = false;
    const space = wOf(" ");
    for (const p of paras) {
      const words = p.split(/\s+/).filter(Boolean);
      if (!words.length) { lines++; continue; }
      let cur = 0;
      for (const w of words) {
        const ww = wOf(w);
        if (ww > o.maxWidth) overWord = true;
        if (cur && cur + space + ww > o.maxWidth) { lines++; widest = Math.max(widest, cur); cur = ww; }
        else cur = cur ? cur + space + ww : ww;
      }
      lines++; widest = Math.max(widest, cur);
    }
    return { lines, width: widest, overWord };
  }
  function compSize() {
    const r = rootComp();
    const w = (window.__size && window.__size.width) || window.__width || (r && num(r.getAttribute("data-width"), 0)) || window.innerWidth;
    const h = (window.__size && window.__size.height) || window.__height || (r && num(r.getAttribute("data-height"), 0)) || window.innerHeight;
    return { w, h };
  }
  // font sudah siap diukur? Bila ada @font-face untuk keluarga pertama, salah satunya harus "loaded".
  // (document.fonts.check() bernilai true untuk face yang belum mulai dimuat, jadi tidak dipakai.)
  function fontSiap(o) {
    if (!document.fonts) return true;
    const fam = String(o.fontFamily || "").split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase();
    if (!fam) return true;
    const want = String(o.fontWeight || 400) === "bold" ? 700 : String(o.fontWeight || 400) === "normal" ? 400 : +o.fontWeight || 400;
    const faces = [...document.fonts].filter((f) => f.family.replace(/^["']|["']$/g, "").toLowerCase() === fam);
    if (!faces.length) return true;
    const wOk = (f) => { const w = String(f.weight).split(/\s+/).map(Number); return w.length > 1 ? want >= w[0] && want <= w[1] : !w[0] || w[0] === want; };
    const cand = faces.filter(wOk).length ? faces.filter(wOk) : faces;
    return cand.some((f) => f.status === "loaded");
  }
  function fitTextFontSize(text, opts) {
    const o = Object.assign({}, opts || {});
    text = String(text == null ? "" : text);
    if (o.textTransform === "uppercase") text = text.toUpperCase();
    else if (o.textTransform === "lowercase") text = text.toLowerCase();
    const cs = compSize();
    if (!(o.maxWidth > 0)) o.maxWidth = cs.w >= cs.h ? 1600 : 900;
    const hi = num(o.maxFontSize, num(o.baseFontSize, 78));
    const lo = Math.min(hi, num(o.minFontSize, 42));
    const step = Math.max(0.25, num(o.step, 2));
    const lh = num(o.lineHeight, 1.2);
    const maxLines = Math.max(1, o.maxLines || 1);
    const fits = (s) => {
      const L = layoutLines(text, s, o);
      if (L.overWord && maxLines > 1) return false;
      if (L.lines > maxLines) return false;
      if (L.width > o.maxWidth + 1e-6) return false;
      if (o.maxHeight > 0 && L.lines * s * lh > o.maxHeight + 1e-6) return false;
      return true;
    };
    // kandidat: hi, hi-step, ..., lalu lo. Lebar teks naik monoton dengan ukuran, jadi cari biner.
    const cands = [];
    for (let s = hi; s > lo + 1e-9; s -= step) cands.push(Math.round(s * 100) / 100);
    cands.push(lo);
    const fontLoaded = fontSiap(o);
    if (!fontLoaded) { try { document.fonts.load(fontStr(hi, o), text || "a"); } catch (e) { /* abaikan */ } }
    let best;
    const last = cands.length - 1;
    if (fits(cands[0])) best = 0;
    else if (!fits(cands[last])) best = -1;
    else {
      let a = 0, b = last;
      while (b - a > 1) { const m = (a + b) >> 1; if (fits(cands[m])) b = m; else a = m; }
      best = b;
    }
    const size = best < 0 ? lo : cands[best];
    const L = layoutLines(text, size, o);
    const res = { fontSize: size, fits: best >= 0, lines: L.lines, width: Math.round(L.width * 100) / 100, maxWidth: o.maxWidth, fontLoaded };
    const key = text + "|" + fontStr(size, o) + "|" + o.maxWidth + "|" + maxLines + "|" + fontLoaded;
    if (!fitSeen.has(key) && fitLog.length < 500) {
      fitSeen.add(key);
      fitLog.push({ text: text.length > 60 ? text.slice(0, 57) + "..." : text, fontSize: size, fits: res.fits, fontLoaded, maxWidth: o.maxWidth, minFontSize: lo, fontFamily: String(o.fontFamily || "sans-serif"), t: vms / 1000 });
    }
    return res;
  }
  async function fitTextFontSizeAsync(text, opts) {
    const o = opts || {};
    try { if (document.fonts) await document.fonts.load(fontStr(num(o.maxFontSize, num(o.baseFontSize, 78)), o), String(text || "a")); } catch (e) { /* abaikan */ }
    return fitTextFontSize(text, o);
  }
  // MGP.fitText(elemen | selector | teks, opsi): untuk elemen, keluarga/ketebalan font diambil
  // dari CSS-nya, maxWidth bawaan = lebar konten induknya, dan fontSize langsung dipasang.
  function fitTextEl(target, opts) {
    const o = Object.assign({}, opts || {});
    if (typeof target === "string") {
      let el = null;
      if (/^[#.\[]/.test(target)) { try { el = document.querySelector(target); } catch (e) { el = null; } }
      if (!el) return fitTextFontSize(target, o);
      target = el;
    }
    const el = target;
    if (!el || !el.nodeType) return fitTextFontSize(String(target), o);
    const cs = getComputedStyle(el);
    if (!o.fontFamily) o.fontFamily = cs.fontFamily;
    if (!o.fontWeight) o.fontWeight = cs.fontWeight;
    if (!o.fontStyle) o.fontStyle = cs.fontStyle;
    if (o.letterSpacing == null && cs.letterSpacing !== "normal") o.letterSpacing = cs.letterSpacing;
    if (!o.textTransform && cs.textTransform !== "none") o.textTransform = cs.textTransform;
    if (!(o.maxWidth > 0)) {
      const p = el.parentElement || el;
      const pcs = getComputedStyle(p);
      o.maxWidth = p.clientWidth - parseFloat(pcs.paddingLeft || 0) - parseFloat(pcs.paddingRight || 0);
    }
    if (o.lineHeight == null) { const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize); if (lh && fs) o.lineHeight = lh / fs; }
    const r = fitTextFontSize(o.text != null ? o.text : el.textContent.trim(), o);
    el.style.fontSize = r.fontSize + "px";
    return r;
  }

  // Nama netral window.__mgp; window.__hyperframes tetap ada (objek yang sama) demi komposisi lama.
  window.__hyperframes = window.__hyperframes || window.__mgp || {};
  window.__mgp = window.__hyperframes;
  window.__hyperframes.fitTextFontSize = fitTextFontSize;
  window.__hyperframes.fitTextFontSizeAsync = fitTextFontSizeAsync;
  window.__hyperframes.getVariables = () => Object.assign({}, currentScope || rootVars());
  window.__hyperframes.measureText = (text, o) => {
    o = o || {};
    const L = layoutLines(String(text), num(o.fontSize, 16), Object.assign({ maxWidth: Infinity, maxLines: o.maxWidth ? 99 : 1 }, o));
    return { width: L.width, lines: L.lines };
  };
  window.MGP = window.MGP || {};
  window.MGP.fitText = fitTextEl;
  window.MGP.pasTeks = fitTextEl;
  window.MGP.fitTextFontSize = fitTextFontSize;

  // ---------------------------------------------------------------- audit tata letak
  // Called by `mgp check` after a seek; mengembalikan temuan pada waktu sekarang.
  function selOf(el) {
    const parts = [];
    let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 3; i++) {
      if (e.id) { parts.unshift("#" + e.id); break; }
      let s = e.tagName.toLowerCase();
      const cls = [...e.classList].filter((c) => c !== "clip").slice(0, 2);
      if (cls.length) s += "." + cls.join(".");
      const p = e.parentElement;
      if (p) { const same = [...p.children].filter((c) => c.tagName === e.tagName); if (same.length > 1) s += `:nth-of-type(${same.indexOf(e) + 1})`; }
      parts.unshift(s);
      e = e.parentElement;
    }
    return parts.join(" > ");
  }
  function effOpacity(el) {
    let o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none") return 0;
      o *= parseFloat(cs.opacity);
      if (o < 0.02) return 0;
    }
    return o;
  }
  function auditLayout(opt) {
    opt = opt || {};
    const { w: W, h: H } = compSize();
    const floor = opt.floor != null ? opt.floor : 0.026 * Math.min(W, H);
    const tol = opt.tol != null ? opt.tol : 2;
    const out = [];
    const els = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p || !n.textContent.trim()) continue;
      if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|TITLE)$/.test(p.tagName)) continue;
      els.add(p);
    }
    const root = rootComp();
    for (const el of els) {
      if (el.closest("[data-layout-ignore], #mgp-captions, #rekam-teks")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || !el.getClientRects().length) continue;
      if (effOpacity(el) < 0.05) continue;
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const r = rg.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      // seluruhnya di luar kanvas = tidak terlihat (mis. sedang masuk), bukan temuan
      if (r.right <= 0 || r.bottom <= 0 || r.left >= W || r.top >= H) continue;
      const teks = el.textContent.trim().replace(/\s+/g, " ");
      const base = { sel: selOf(el), text: teks.length > 40 ? teks.slice(0, 37) + "..." : teks };
      const fs = parseFloat(cs.fontSize) || 0;
      let scale = 1;
      if (el.offsetHeight > 0) scale = el.getBoundingClientRect().height / el.offsetHeight;
      if (!(scale > 0) || !Number.isFinite(scale)) scale = 1;
      const eff = fs * scale;
      if (eff > 0 && eff < floor - 0.01) out.push(Object.assign({ code: "small_text", size: Math.round(eff * 10) / 10, floor: Math.round(floor * 10) / 10 }, base));
      if (el.closest("[data-layout-allow-overflow], [data-layout-bleed]")) continue;
      const outPx = Math.max(-r.left, -r.top, r.right - W, r.bottom - H);
      if (outPx > tol) {
        const vis = (Math.min(r.right, W) - Math.max(r.left, 0)) * (Math.min(r.bottom, H) - Math.max(r.top, 0));
        out.push(Object.assign({ code: "off_canvas", px: Math.round(outPx), visible: Math.round((vis / (r.width * r.height)) * 100) }, base));
      }
      if (cs.display !== "inline" && el.clientWidth > 0) {
        const ox = el.scrollWidth - el.clientWidth, oy = el.scrollHeight - el.clientHeight;
        const clipX = /hidden|clip|scroll|auto/.test(cs.overflowX), clipY = /hidden|clip|scroll|auto/.test(cs.overflowY);
        if (ox > tol) out.push(Object.assign({ code: clipX ? "text_clipped" : "text_overflow", axis: "x", px: Math.round(ox) }, base));
        // vertikal: line-height rapat membuat kotak isi huruf sedikit melewati kotak baris; itu bukan luber
        if (oy > Math.max(tol, (clipY ? 0.25 : 0.4) * fs)) out.push(Object.assign({ code: clipY ? "text_clipped" : "text_overflow", axis: "y", px: Math.round(oy) }, base));
      }
      // wadah terdekat yang memotong (overflow hidden/clip)
      for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement && a !== root; a = a.parentElement) {
        if (a.hasAttribute("data-layout-allow-overflow")) break;
        const acs = getComputedStyle(a);
        if (!/hidden|clip/.test(acs.overflowX + " " + acs.overflowY)) continue;
        const ar = a.getBoundingClientRect();
        const vy = 0.2 * fs * scale;
        const cut = Math.max(ar.left - r.left, ar.top - r.top - vy, r.right - ar.right, r.bottom - ar.bottom - vy);
        if (cut > tol) out.push(Object.assign({ code: "text_clipped_container", container: selOf(a), px: Math.round(cut) }, base));
        break;
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- sub-komposisi
  async function runScripts(container, wrap) {
    const scripts = [...container.querySelectorAll("script")];
    for (const old of scripts) {
      const s = document.createElement("script");
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      if (old.src) {
        await new Promise((res) => { s.onload = s.onerror = res; old.replaceWith(s); });
      } else {
        const isModule = (old.type || "").toLowerCase() === "module";
        s.textContent = wrap && !isModule ? "(function(){\n" + old.textContent + "\n})();" : old.textContent;
        old.replaceWith(s);
      }
    }
  }

  // Gaya <style> di dalam scene dilingkup ke host-nya (kontrak HyperFrames): selector seperti #root milik
  // s01 tidak boleh mengenai #root scene lain atau root utama. Selector S menjadi
  // ":where([data-mgp-scope=n]) :is(S)" (spesifisitas tetap sama dengan aslinya); html/body/:root
  // menjadi host itu sendiri; @keyframes/@font-face tetap global. Keluar: <style data-global> atau
  // atribut data-css-global pada host.
  let lingkupN = 0;
  function pisahKoma(sel) {
    const out = []; let d = 0, q = null, cur = "";
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (q) { cur += ch; if (ch === "\\") { cur += sel[++i] || ""; continue; } if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === "(" || ch === "[") d++;
      else if (ch === ")" || ch === "]") d--;
      if (ch === "," && d === 0) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  }
  const PSEUDO_EL = /(::?(?:before|after|first-line|first-letter|placeholder|selection|marker|backdrop|file-selector-button|cue|part\([^)]*\)|slotted\([^)]*\)))+\s*$/i;
  function lingkupSelector(sel, S) {
    return pisahKoma(sel).map((x) => {
      x = x.trim();
      if (!x) return x;
      const m = /^(?:html|body|:root)(?![\w-])/i.exec(x);
      if (m) {
        const rest = x.slice(m[0].length).replace(/^\s*>?\s*body(?![\w-])/i, "");
        return ":where(" + S + ")" + rest;
      }
      const pe = PSEUDO_EL.exec(x);
      let inti = pe ? x.slice(0, pe.index) : x;
      const ekor = pe ? pe[0].trim() : "";
      if (!inti.trim()) inti = "*";
      return ":where(" + S + ") :is(" + inti + ")" + ekor;
    }).join(", ");
  }
  function lingkupGaya(st, S) {
    const txt = st.textContent;
    if (!txt || !txt.trim() || /@import/i.test(txt)) return false;
    let sheet;
    try { sheet = new CSSStyleSheet(); sheet.replaceSync(txt); } catch (e) { return false; }
    const jalan = (rules) => {
      for (const r of rules) {
        if (r.type === 1) { // CSSStyleRule (aturan bersarang "&" ikut induknya, tidak disentuh)
          try { r.selectorText = lingkupSelector(r.selectorText, S); } catch (e) { /* biarkan apa adanya */ }
        } else if (r.cssRules && r.type !== 7) jalan(r.cssRules); // @media/@supports/@container/@layer; 7 = @keyframes
      }
    };
    try { jalan(sheet.cssRules); } catch (e) { return false; }
    st.textContent = [...sheet.cssRules].map((r) => r.cssText).join("\n");
    st.setAttribute("data-mgp-scoped", S);
    return true;
  }

  async function loadSubComps(scope) {
    const hosts = [...scope.querySelectorAll("[data-composition-src]")].filter((h) => !h.__mgpLoaded);
    for (const host of hosts) {
      host.__mgpLoaded = true;
      const src = host.getAttribute("data-composition-src");
      let html;
      try {
        const r = await fetch(src);
        if (!r.ok) throw new Error("HTTP " + r.status);
        html = await r.text();
      } catch (e) {
        console.error("[mgp] failed to load sub-composition / gagal memuat sub-komposisi " + src + ": " + e.message);
        continue;
      }
      const doc = new DOMParser().parseFromString(html, "text/html");
      const tpl = doc.querySelector("template");
      const frag = document.createElement("div");
      if (tpl) frag.innerHTML = tpl.innerHTML;
      else { frag.innerHTML = doc.head.innerHTML + doc.body.innerHTML; }
      // host perlu ruang: kalau belum diberi posisi, isi penuh induknya
      const cs = getComputedStyle(host);
      if (cs.position === "static") { host.style.position = "absolute"; host.style.inset = "0"; }
      const w = host.getAttribute("data-width"), h = host.getAttribute("data-height");
      if (w && !host.style.width) host.style.width = w + "px";
      if (h && !host.style.height) host.style.height = h + "px";
      // lingkup variabel mount ini: lingkup induk + default deklarasi scene + data-variable-values host
      const parentHost = host.parentElement ? host.parentElement.closest("[data-composition-src]") : null;
      const parentVars = (parentHost && varScopes.get(parentHost)) || rootVars();
      const sceneRoot = frag.querySelector("[data-composition-id]");
      const decls = [...declOf(doc.documentElement), ...declOf(sceneRoot)];
      const byId = Object.fromEntries(decls.map((d) => [d.id, d]));
      const vars = Object.assign({}, parentVars, defaultsOf(decls));
      const hv = host.getAttribute("data-variable-values");
      if (hv) {
        try {
          const obj = JSON.parse(hv);
          for (const k of Object.keys(obj)) vars[k] = coerceVar(byId[k], obj[k], "data-variable-values " + (host.id || src));
        } catch (e) { varIssue("json", tr(`data-variable-values on ${host.id || src} is not valid JSON`, `data-variable-values pada ${host.id || src} bukan JSON yang sah`)); }
      }
      varScopes.set(host, vars);
      applyCssVars(host, vars);
      if (!host.hasAttribute("data-css-global")) {
        const lid = "l" + (++lingkupN);
        host.setAttribute("data-mgp-scope", lid);
        for (const st of frag.querySelectorAll("style")) if (!st.hasAttribute("data-global")) lingkupGaya(st, '[data-mgp-scope="' + lid + '"]');
      }
      while (frag.firstChild) host.appendChild(frag.firstChild);
      bindTree(host, vars, host);
      const prevScope = currentScope;
      currentScope = vars;
      try { await runScripts(host, true); } finally { currentScope = prevScope; }
      await loadSubComps(host);
    }
  }

  // Layer ter-promote (will-change) menyimpan raster lama; matikan agar piksel hanya bergantung pada t.
  function freezeLayers() {
    const st = document.createElement("style");
    st.id = "mgp-freeze";
    st.textContent = "*,*::before,*::after{will-change:auto!important;caret-color:transparent!important}";
    (document.head || document.documentElement).appendChild(st);
  }

  function prepareRoot() {
    const root = rootComp();
    if (!root) return;
    const w = root.getAttribute("data-width"), h = root.getAttribute("data-height");
    if (w && !root.style.width) root.style.width = w + "px";
    if (h && !root.style.height) root.style.height = h + "px";
    if (getComputedStyle(root).position === "static") root.style.position = "relative";
    if (!root.style.overflow) root.style.overflow = "hidden";
    document.documentElement.style.margin = "0";
    document.body.style.margin = "0";
  }

  // ---------------------------------------------------------------- info
  function info() {
    const root = rootComp();
    const o = { width: null, height: null, fps: null, duration: null, driver: null, hf: !!root };
    const sz = window.__size;
    if (sz && sz.width) { o.width = sz.width; o.height = sz.height; }
    if (window.__width) o.width = window.__width;
    if (window.__height) o.height = window.__height;
    if (root && !o.width) { o.width = num(root.getAttribute("data-width"), null); o.height = num(root.getAttribute("data-height"), null); }
    if (!o.width) {
      const m = document.querySelector('meta[name="mgp:size"], meta[name="rekam:size"]');
      if (m) { const [a, b] = m.content.split(/[x×]/).map(Number); o.width = a; o.height = b; }
    }
    o.fps = num(window.__fps, null) || (root ? num(root.getAttribute("data-fps"), null) : null);

    // pemutar waktu
    const tlKeys = Object.keys(window.__timelines || {});
    if (typeof window.__seek === "function") o.driver = "__seek";
    else if (root && tlKeys.length) o.driver = "composition";
    else if (window.__timeline && typeof window.__timeline.totalTime === "function") o.driver = "__timeline";
    else if (tlKeys.length) o.driver = "composition";
    else if (window.gsap && window.gsap.globalTimeline && window.gsap.globalTimeline.getChildren(false, true, true).length) o.driver = "gsap-global";
    else if (document.getAnimations().length) o.driver = "css";
    else if (rafQueue.length) o.driver = "raf";
    else o.driver = "static";

    // durasi
    let d = window.__duration;
    if (typeof d === "function") d = d();
    d = num(d, null);
    if (d == null && root) d = num(root.getAttribute("data-duration"), null);
    if (d == null && o.driver === "__timeline") d = window.__timeline.duration();
    if (d == null && o.driver === "composition") {
      d = 0;
      for (const k of tlKeys) {
        const host = document.querySelector('[data-composition-id="' + k + '"]');
        d = Math.max(d, (host ? compOffset(host) + num(host.getAttribute("data-start"), 0) : 0) + window.__timelines[k].duration());
      }
    }
    if (d == null && o.driver === "gsap-global") {
      d = 0;
      for (const c of window.gsap.globalTimeline.getChildren(false, true, true)) d = Math.max(d, c.endTime());
    }
    if (d == null && o.driver === "css") {
      d = 0;
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.getComputedTiming();
        if (t && Number.isFinite(t.endTime)) d = Math.max(d, t.endTime / 1000);
      }
      if (!d) d = null;
    }
    o.duration = d;
    o.timelines = tlKeys;
    // animation engine the page really uses: mgp.motion (gsap shim, old name Gerak) or real GSAP
    const gg = window.gsap, M = (window.mgp && window.mgp.motion) || window.Gerak;
    if (!gg) o.engine = M ? "motion " + (M.version || "") : null;
    else if (gg.isShim || (M && gg === M)) o.engine = "motion " + (gg.version || "");
    else o.engine = "gsap " + (gg.version || "?");
    o.mesin = o.engine; // old key
    return o;
  }

  // ---------------------------------------------------------------- media
  function mediaList() {
    const out = [];
    for (const el of document.querySelectorAll("audio, video")) {
      const isVideo = el.tagName === "VIDEO";
      if (isVideo && el.getAttribute("data-has-audio") !== "true") continue;
      const src = el.currentSrc || el.src || (el.querySelector("source") || {}).src;
      if (!src) continue;
      const off = compOffset(el);
      out.push({
        id: el.id || null,
        tag: el.tagName.toLowerCase(),
        src,
        start: off + num(el.getAttribute("data-start"), 0),
        mediaStart: num(el.getAttribute("data-media-start"), num(el.getAttribute("data-trim-start"), 0)),
        duration: num(el.getAttribute("data-duration"), null),
        trimEnd: num(el.getAttribute("data-trim-end"), null),
        volume: num(el.getAttribute("data-volume"), el.muted && !isVideo ? 0 : 1),
        rate: num(el.getAttribute("data-playback-rate"), 1),
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- teks terbakar
  let caps = null;
  function setCaptions(words, opt) {
    opt = opt || {};
    const maxW = opt.maxWords || opt.maxKata || 4, gap = opt.gap || opt.jeda || 0.15;
    const groups = []; let cur = [];
    words.forEach((w, i) => {
      cur.push(w);
      const nx = words[i + 1];
      const brk = !nx || cur.length >= maxW || nx.start - w.end >= gap || /[.!?,;:]$/.test(w.text);
      if (brk) { groups.push(cur); cur = []; }
    });
    const layer = document.createElement("div");
    const size = opt.size || opt.ukuran || 64, color = opt.color || opt.warna || "#FFD43B", bottom = opt.bottom != null ? opt.bottom : opt.bawah;
    layer.id = "mgp-captions";
    layer.innerHTML = "<style>#mgp-captions{position:fixed;left:0;right:0;z-index:2147483647;text-align:center;pointer-events:none;" +
      "font:800 " + size + "px/1.15 " + (opt.font || "system-ui, 'Segoe UI', Arial, sans-serif") + ";color:#fff;" +
      "-webkit-text-stroke:" + Math.round(size / 9) + "px #000;paint-order:stroke fill;padding:0 6%;}" +
      "#mgp-captions .g{display:none}#mgp-captions .g.on{display:block}#mgp-captions .w.on{color:" + color + "}" +
      (opt.css || "") + "</style>";
    layer.style.bottom = (bottom != null ? bottom : 22) + "%";
    const els = groups.map((g) => {
      const d = document.createElement("div"); d.className = "g";
      g.forEach((w, i) => {
        const s = document.createElement("span"); s.className = "w"; s.textContent = w.text;
        d.appendChild(s); if (i < g.length - 1) d.appendChild(document.createTextNode(" "));
      });
      layer.appendChild(d); return d;
    });
    document.body.appendChild(layer);
    caps = { groups, els };
  }
  function drawCaptions(t) {
    if (!caps) return;
    caps.groups.forEach((g, gi) => {
      const on = t >= g[0].start && t < g[g.length - 1].end + 0.05;
      caps.els[gi].classList.toggle("on", on);
      if (on) g.forEach((w, wi) => caps.els[gi].children[wi].classList.toggle("on", t >= w.start && t < w.end));
    });
  }

  // ---------------------------------------------------------------- seek
  const pendingImgs = new Set();
  async function settleMedia() {
    const waits = [];
    for (const img of document.images) {
      if (!img.complete || (img.src && !img.__mgpDecoded)) {
        waits.push(img.decode().then(() => { img.__mgpDecoded = true; }, () => { img.__mgpDecoded = true; }));
      }
    }
    if (document.fonts && document.fonts.status !== "loaded") waits.push(document.fonts.ready);
    await Promise.all(waits);
  }

  async function seekVideos(t) {
    const waits = [];
    for (const v of document.querySelectorAll("video")) {
      v.pause();
      const off = compOffset(v) + num(v.getAttribute("data-start"), 0);
      const ms = num(v.getAttribute("data-media-start"), num(v.getAttribute("data-trim-start"), 0));
      const rate = num(v.getAttribute("data-playback-rate"), 1);
      let lt = Math.max(0, ms + (t - off) * rate);
      if (Number.isFinite(v.duration)) lt = Math.min(lt, Math.max(0, v.duration - 0.001));
      if (Math.abs(v.currentTime - lt) < 1e-4) continue;
      waits.push(new Promise((res) => {
        const done = () => { v.removeEventListener("seeked", done); res(); };
        v.addEventListener("seeked", done); v.currentTime = lt; realSetTimeout(done, 3000);
      }));
    }
    await Promise.all(waits);
  }

  // subSaja: penggerak lain (__seek, __timeline, gsap-global) memegang root; mgp tetap men-seek
  // timeline sub-komposisi (blok dari "mgp add", scene) dan visibilitas host-nya. Penggerak halaman
  // dijalankan sesudahnya, jadi ia tetap boleh menimpa (mis. mode blocking menahan blok di pose kunci).
  function seekHyperframes(t, subSaja) {
    const tls = window.__timelines || {};
    const root = rootComp();
    for (const k of Object.keys(tls)) {
      const tl = tls[k];
      if (!tl || typeof tl.totalTime !== "function") continue;
      const host = document.querySelector('[data-composition-id="' + k + '"]');
      if (subSaja && (!host || host === root || tl === window.__timeline)) continue;
      let lt = t;
      if (host && host !== root) {
        const st = compOffset(host) + num(host.getAttribute("data-start"), 0);
        const du = num(host.getAttribute("data-duration"), tl.duration());
        lt = Math.min(Math.max(0, t - st), du);
      }
      try { tl.pause(); tl.totalTime(Math.min(lt, tl.totalDuration()), false); } catch (e) { console.error(e); }
    }
    // klip: tampil pada [start, start + duration)
    for (const el of document.querySelectorAll(subSaja ? "[data-composition-id][data-start]" : ".clip[data-start], [data-composition-id][data-start]")) {
      if (el === root || el.tagName === "AUDIO") continue;
      const st = compOffset(el) + num(el.getAttribute("data-start"), 0);
      const du = num(el.getAttribute("data-duration"), Infinity);
      el.style.visibility = t >= st && t < st + du ? "" : "hidden";
    }
  }

  function seekCSS(t) {
    for (const a of document.getAnimations()) {
      if (a.__mgpSkip || a.__rekamSkip) continue;
      try {
        let off = 0;
        const tgt = a.effect && a.effect.target;
        const host = tgt && tgt.closest && tgt.closest("[data-start]");
        if (host && host !== rootComp()) off = compOffset(host) + num(host.getAttribute("data-start"), 0);
        a.pause();
        a.currentTime = Math.max(0, (t - off) * 1000);
      } catch (e) { /* abaikan */ }
    }
  }

  function seekPlugins(t, fps) {
    for (const p of new Set([...(window.__hfLottie || []), ...(window.__mgpLottie || [])])) {
      try {
        if (typeof p.goToAndStop === "function") p.goToAndStop(t * 1000, false);
        else if (typeof p.setFrame === "function") p.setFrame(Math.min(t * (p.manifest && p.manifest.fr ? p.manifest.fr : fps || 30), (p.totalFrames || 1e9) - 1));
      } catch (e) { /* abaikan */ }
    }
    for (const a of new Set([...(window.__hfAnime || []), ...(window.__mgpAnime || [])])) { try { a.seek(t * 1000); } catch (e) { /* abaikan */ } }
  }

  // Chrome menyimpan keadaan layer/raster dari frame yang pernah digambar, sehingga piksel
  // frame yang sama bisa berbeda tergantung urutan seek. Menyembunyikan body sesaat (sinkron,
  // tanpa paint) membangun ulang keadaan itu; hasilnya hanya bergantung pada t.
  function resetPaintState() {
    if (window.__mgpNoReset || window.__rekamTanpaReset || !document.body) return;
    const b = document.body, prev = b.style.getPropertyValue("display"), pr = b.style.getPropertyPriority("display");
    b.style.setProperty("display", "none", "important");
    void b.offsetHeight;
    if (prev) b.style.setProperty("display", prev, pr); else b.style.removeProperty("display");
  }

  let driver = null, fpsKnown = 30, reseek = false;
  async function seek(t) {
    t = Math.max(0, +t || 0);
    seekingNow = t;
    seekActive = true;
    try {
      await seekOnce(t);
      // canvas text drew with a font that was not loaded yet: load it, then draw this frame again (once)
      if (canvasFontsDirty && !reseek && (await loadCanvasFonts())) {
        reseek = true;
        try { await seekOnce(t); } finally { reseek = false; }
      }
    } finally { seekActive = false; }
    return t;
  }
  async function seekOnce(t) {
    vms = t * 1000;
    // acak yang dipanggil saat menggambar frame diseed dari t: hasil tidak bergantung urutan seek
    seed = (0x2f6b1d3a ^ Math.imul(Math.round(t * 1000) + 1, 0x9e3779b1)) | 0;
    resetPaintState();
    const g = window.gsap;
    if (g && g.globalTimeline && driver !== "gsap-global") { try { g.globalTimeline.pause(); } catch (e) { /* abaikan */ } }

    // sub-compositions first (see seekHyperframes); window.__mgpNoSubSeek = true (old __rekamTanpaSubSeek) turns it off
    if (driver !== "composition" && driver !== "static" && !window.__mgpNoSubSeek && !window.__rekamTanpaSubSeek) seekHyperframes(t, true);
    if (driver === "__seek") {
      const r = window.__seek(t);
      if (r && typeof r.then === "function") await r;
    } else if (driver === "__timeline") {
      window.__timeline.pause(); window.__timeline.totalTime(t, false);
    } else if (driver === "composition") {
      seekHyperframes(t);
    } else if (driver === "gsap-global") {
      g.globalTimeline.pause(); g.globalTimeline.totalTime(t, false);
    }
    if (driver !== "composition" && document.querySelector(".clip[data-start]")) {
      // komposisi non-HF yang tetap memakai .clip
      for (const el of document.querySelectorAll(".clip[data-start]")) {
        if (el.tagName === "AUDIO") continue;
        const st = num(el.getAttribute("data-start"), 0), du = num(el.getAttribute("data-duration"), Infinity);
        el.style.visibility = t >= st && t < st + du ? "" : "hidden";
      }
    }
    seekCSS(t);
    seekPlugins(t, fpsKnown);
    flushRAF();
    const waits = [];
    try {
      window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time: t, waitUntil: (p) => waits.push(p) } }));
      window.dispatchEvent(new CustomEvent("mgp-seek", { detail: { time: t, waitUntil: (p) => waits.push(p) } }));
      window.dispatchEvent(new CustomEvent("rekam-seek", { detail: { time: t, waitUntil: (p) => waits.push(p) } })); // old event name
    } catch (e) { console.error(e); }
    drawCaptions(t);
    await Promise.all(waits);
    await seekVideos(t);
    await settleMedia();
    return t;
  }

  // ---------------------------------------------------------------- siap
  let readyP = null;
  function siap(opt) {
    if (readyP) return readyP;
    opt = opt || {};
    readyP = (async () => {
      if (document.readyState === "loading") await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
      freezeLayers();
      applyRootVars();
      prepareRoot();
      await loadSubComps(document);
      if (document.readyState !== "complete") await new Promise((r) => window.addEventListener("load", r, { once: true }));
      if (document.fonts) await document.fonts.ready;
      // canvas text drawn while the page started (outside seek): load those fonts before the first frame
      if (canvasFontsDirty) await loadCanvasFonts();
      // tunggu semua komposisi mendaftarkan timeline (dibangun async, mis. di fonts.ready)
      // data-no-timeline: komposisi diam, tidak ada timeline yang ditunggu
      const ids = [...document.querySelectorAll("[data-composition-id]:not([data-no-timeline])")].map((e) => e.getAttribute("data-composition-id"));
      const t0 = realNow();
      const limit = opt.wait || opt.tunggu || 6000;
      while (realNow() - t0 < limit) {
        const tls = window.__timelines || {};
        const missing = ids.filter((id) => !tls[id]);
        if (!missing.length && (ids.length || typeof window.__seek === "function" || window.__timeline || realNow() - t0 > 300)) break;
        await sleep(30);
      }
      const br = (window.__hf && window.__hf.buildReady) || (window.__mgp && window.__mgp.buildReady);
      if (br) await Promise.all(Object.values(br));
      if (window.__ready && typeof window.__ready.then === "function") await window.__ready;
      for (const m of document.querySelectorAll("audio, video")) { try { m.pause(); m.autoplay = false; } catch (e) { /* abaikan */ } }
      for (const img of document.images) img.decoding = "sync";
      await settleMedia();
      const inf = info();
      driver = inf.driver;
      fpsKnown = inf.fps || 30;
      // mgp.motion reads tween start values on this frame grid (GSAP parity); MGP_MOTION_INIT_FPS=0 -> exact starts
      if (window.__mgpInitFps == null) window.__mgpInitFps = (opt.initFps != null ? +opt.initFps : +(opt.fps || inf.fps || 30));
      await seek(0);
      await nextPaint();
      inf.media = mediaList();
      inf.missingTimelines = ids.filter((id) => !(window.__timelines || {})[id]);
      inf.variables = varsReport();
      return inf;
    })();
    return readyP;
  }

  // ---------------------------------------------------------------- pemeriksaan
  function audit() {
    const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "emoji", "math", "inherit", "initial", "-apple-system", "blinkmacsystemfont"]);
    const faces = {};
    for (const f of document.fonts) {
      const fam = f.family.replace(/^["']|["']$/g, "").toLowerCase();
      (faces[fam] = faces[fam] || []).push(f.status);
    }
    const used = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim() || !n.parentElement) continue;
      const tag = n.parentElement.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEMPLATE") continue;
      const fam = getComputedStyle(n.parentElement).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
      used[fam] = (used[fam] || 0) + 1;
    }
    const fonts = Object.keys(used).map((fam) => {
      const k = fam.toLowerCase();
      if (generic.has(k)) return { family: fam, status: "generic" };
      if (!faces[k]) return { family: fam, status: "no-font-face" };
      if (faces[k].includes("loaded")) return { family: fam, status: "loaded" };
      if (faces[k].includes("error")) return { family: fam, status: "error" };
      return { family: fam, status: faces[k][0] };
    });
    const images = [...document.images].map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0 }));
    const inline = [...document.querySelectorAll("script:not([src])")].map((s) => s.textContent).join("\n");
    const lint = [];
    if (/Date\.now\(|new Date\(\)/.test(inline)) lint.push(tr("The script uses Date.now()/new Date(); mgp freezes it to virtual time, but timeline time is safer.", "Skrip memakai Date.now()/new Date(); mgp membekukannya ke waktu virtual, tetapi lebih aman memakai waktu timeline."));
    if (/repeat\s*:\s*-1/.test(inline)) lint.push(tr("There is a repeat: -1 (infinite); the duration may be unreadable. Use a finite repeat count.", "Ada repeat: -1 (tak berhingga); durasi bisa tidak terbaca. Pakai jumlah ulang yang terbatas."));
    if (/setInterval\(|setTimeout\(/.test(inline)) lint.push(tr("There is a setTimeout/setInterval; timers do not follow virtual time and can make frames differ between renders.", "Ada setTimeout/setInterval; timer tidak ikut waktu virtual dan bisa membuat frame berbeda tiap render."));
    for (const a of document.querySelectorAll("audio")) if (!a.id) lint.push(tr("There is an <audio> without an id (", "Ada <audio> tanpa id (") + (a.getAttribute("src") || "?") + tr("); HyperFrames skips it, mgp still mixes it.", "); HyperFrames melewatinya, mgp tetap mencampurnya."));
    for (const c of document.querySelectorAll(".clip")) if (!c.hasAttribute("data-start") && !c.closest("[data-block-clone], [data-blok-klon]")) lint.push(tr("Element .clip#", "Elemen .clip#") + (c.id || "?") + tr(" has no data-start.", " tanpa data-start."));
    return { fonts, images, lint };
  }

  // mgp check: timeline sub-komposisi beserta rentangnya dan playhead sekarang (apakah ikut di-seek?)
  function timelineBlok() {
    const tls = window.__timelines || {}, root = rootComp(), out = [];
    for (const k of Object.keys(tls)) {
      const tl = tls[k];
      if (!tl || typeof tl.totalTime !== "function") continue;
      const host = document.querySelector('[data-composition-id="' + k + '"]');
      if (!host || host === root) continue;
      let dur = 0, children = 0, pos = null;
      try { dur = tl.totalDuration(); } catch (e) { /* abaikan */ }
      try { children = tl.getChildren ? tl.getChildren(true, true, true).length : 1; } catch (e) { children = 1; }
      try { pos = tl.totalTime(); } catch (e) { pos = null; }
      const st = compOffset(host) + num(host.getAttribute("data-start"), 0);
      const r = host.getBoundingClientRect();
      const block = host.getAttribute("data-block") || host.getAttribute("data-blok") || null, duration = num(host.getAttribute("data-duration"), dur);
      const box = { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.max(1, Math.min(r.width, window.innerWidth)), h: Math.max(1, Math.min(r.height, window.innerHeight)) };
      out.push({ id: k, block, start: st, duration, tlDuration: dur, children, position: pos, box,
        blok: block, durasi: duration, tlDurasi: dur, anak: children, posisi: pos, kotak: box }); // old field names
    }
    return out;
  }

  const api = {
    version: "0.3.0", ready: siap, seek, info, audit, mediaList, setCaptions, auditLayout, varsReport, blockTimelines: timelineBlok,
    health, canvasFonts: canvasFontReport,
    fitTextFontSize, fitText: fitTextEl,
    get fitLog() { return fitLog.slice(); },
    get time() { return vms / 1000; },
    // old names (v2.3 / v2.4-dev tools)
    versi: "0.3.0", siap, timelineBlok,
    get waktu() { return vms / 1000; },
  };
  window.__mgpRuntime = window.__rekam = api;
})();
