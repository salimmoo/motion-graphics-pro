// mgp check: inspect a composition before rendering.
// JSON result: { file, errors[], warnings[], passed[], notes[], info, ok } (old keys galat/peringatan/lolos/info_).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openSession, mediaToFile, fmtT } from "./session.mjs";
import { capture } from "./browser.mjs";
import * as fonts from "./fonts.mjs";
import { L } from "./i18n.mjs";

const RATIOS = [["9:16", 9 / 16], ["16:9", 16 / 9], ["1:1", 1], ["4:5", 4 / 5]];
const sha = (b) => crypto.createHash("sha1").update(b).digest("hex");
// fonts.mjs report of Google Fonts requests (new names missing/local, old names hilang/lokal)
const fontReport = () => {
  const r = fonts.report || fonts.laporan || {};
  return { missing: r.missing || r.hilang || new Set(), local: r.local || r.lokal || new Set() };
};
const RT = "(window.__mgpRuntime || window.__rekam)";

export async function check(comp, o = {}) {
  const sess = await openSession(comp, o);
  const res = { file: sess.c.file, errors: [], warnings: [], passed: [], notes: [] };
  const err = (s) => res.errors.push(s), warn = (s) => res.warnings.push(s), ok = (s) => res.passed.push(s);
  try {
    const s = await sess.open();
    const inf = s.info;
    res.info = { width: inf.width, height: inf.height, fps: inf.fps, duration: inf.duration, driver: inf.driver, timelines: inf.timelines };
    const isStatic = inf.driver === "static" || inf.driver === "statis";

    // duration
    if (inf.duration > 0) ok(L`duration ${fmtT(inf.duration)}`);
    else err(L`duration not readable: set window.__duration or data-duration on the root`);
    if (inf.duration > 600) warn(L`duration ${fmtT(inf.duration)} is very long; check for an infinite repeat`);

    // time driver
    if (isStatic) err(L`no timeline: define window.__seek(t), window.__timeline, an mgp.motion/GSAP timeline, or window.__timelines (composition format)`);
    else ok(L`time driver: ${inf.driver}`);
    if (inf.driver === "raf") warn(L`rAF driver: only correct when drawing is computed from performance.now()/the rAF timestamp, not from a frame count; defining window.__seek(t) is safer`);
    if (inf.missingTimelines && inf.missingTimelines.length) err(L`compositions without a registered timeline: ${inf.missingTimelines.join(", ")} (window.__timelines[id] = tl)`);

    // size
    if (!inf.width || !inf.height) warn(L`size not declared; using the viewport ${s.page.viewportSize().width}x${s.page.viewportSize().height}`);
    else {
      const r = inf.width / inf.height;
      const hit = RATIOS.find(([, v]) => Math.abs(v - r) < 0.005);
      if (hit) ok(L`size ${inf.width}x${inf.height} (${hit[0]})`);
      else warn(L`size ${inf.width}x${inf.height} is not 9:16, 16:9 or 1:1`);
      if (inf.width % 2 || inf.height % 2) warn(L`odd dimensions; H.264 yuv420p will round them to even`);
    }
    if (!inf.fps) warn(L`fps not declared (data-fps / window.__fps); the render uses 30 unless --fps`);

    // assets and page errors
    const fr = fontReport();
    const a = await s.page.evaluate(`${RT}.audit()`);
    for (const im of a.images) if (!im.ok) err(L`image failed to load: ${im.src}`);
    for (const f of a.fonts) {
      const local = fonts.isLocal(f.family);
      const google = [...fr.missing].some((h) => h.toLowerCase() === f.family.toLowerCase());
      const noFace = f.status === "no-font-face" || f.status === "tanpa-font-face";
      if (f.status === "loaded" && google) warn(L`font "${f.family}" loaded from Google Fonts and is not among the mgp local fonts: the render needs internet (add it to fonts/ with src/download-font.mjs)`);
      else if (f.status === "loaded") ok(L`font "${f.family}" loaded` + (local ? L` (local)` : ""));
      else if (google) err(L`font "${f.family}" is not among the local fonts and failed to load from Google Fonts (offline?)`);
      else if (noFace && local) warn(L`font "${f.family}" has no @font-face although it is among the mgp local fonts; load it with <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, "+")}"> (redirected to local) so the result is the same on every machine`);
      else if (noFace) warn(L`font "${f.family}" has no @font-face; it depends on a system font, the result may differ on another machine`);
      else if (f.status === "error") err(L`font "${f.family}" failed to load`);
      else if (f.status !== "generic" && f.status !== "generik") warn(L`font "${f.family}" has status ${f.status}`);
    }
    // fonts requested through Google Fonts but not used by DOM text (e.g. only on a canvas)
    const used = new Set(a.fonts.map((f) => f.family.toLowerCase()));
    const rest = [...fr.missing].filter((h) => !h.startsWith("gstatic:") && !used.has(h.toLowerCase()));
    if (rest.length) {
      const st = await s.page.evaluate((fams) => fams.map((n) => [...document.fonts].filter((f) => f.family.replace(/^["']|["']$/g, "").toLowerCase() === n.toLowerCase()).map((f) => f.status)), rest);
      rest.forEach((h, i) => (st[i].includes("loaded") ? warn : err)(L`font "${h}" requested from Google Fonts and not among the mgp local fonts` + (st[i].includes("loaded") ? L`: loaded over the internet, an offline render will use a fallback font` : L`: failed to load (offline?)`)));
    }
    for (const g of [...fr.missing].filter((h) => h.startsWith("gstatic:"))) warn(L`font file referenced directly from fonts.gstatic.com and not in the bundle: ${g.slice(8)}`);
    const loaded = await s.page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/^["']|["']$/g, "")))]);
    const localUsed = [...new Set([...fr.local, ...loaded.filter(fonts.isLocal)])];
    if (localUsed.length) ok(L`local fonts (no internet): ${localUsed.join(", ")}`);
    for (const l of a.lint) warn(l);
    const seen = new Set();
    for (const l of sess.logs) {
      const key = l.type + l.text;
      if (seen.has(key)) continue; seen.add(key);
      if (l.type.startsWith("http") || l.type === "requestfailed") {
        const u = l.text.split(" ")[0];
        if (seen.has("asset" + u)) continue;
        // The browser often cancels media requests (range requests, preload) while loading:
        // net::ERR_ABORTED / ERR_CANCELED, or 206/416. That is not a missing asset when the file exists.
        const local = mediaToFile(u, sess.srv, sess.c.root);
        const exists = local && fs.existsSync(local) && fs.statSync(local).isFile();
        const cancelled = l.type === "requestfailed" && /ERR_ABORTED|ERR_CANCELED|ERR_CACHE_MISS|aborted|cancel/i.test(l.text);
        if (exists && (cancelled || l.type === "http206" || l.type === "http416")) continue;
        seen.add("asset" + u);
        if (l.type === "requestfailed" && exists) warn(L`asset request failed (${l.text.slice(u.length).trim()}), the file exists: ${u.replace(sess.srv.base, "")}`);
        else err(L`missing asset (${l.type}): ${u.replace(sess.srv.base, "")}`);
      }
      else if (l.type === "pageerror") err(L`script error: ${l.text}`);
      else if (l.type === "error" && /^\[(blok|block|rekam|mgp)\]/.test(l.text)) err(L`error ${l.text} (the render will fail; fix that block/sub-composition)`);
      else if (l.type === "error" && !/Failed to load resource/.test(l.text)) warn(L`console: ${l.text}`);
    }
    for (const m of inf.media || []) {
      const f = mediaToFile(m.src, sess.srv, sess.c.root);
      if (!f || !fs.existsSync(f)) err(L`audio not found: ${m.src.replace(sess.srv.base, "")}`);
      else ok(L`audio ${m.id || m.src.split("/").pop()} starts at ${m.start.toFixed(2)} s`);
    }

    // deterministic: seek the same t twice (with other seeks in between) and compare
    if (inf.duration > 0 && !isStatic) {
      const D = inf.duration, f = 1 / (inf.fps || 30);
      const ts = [0.37 * D, 0.71 * D, Math.max(0, D - f)].map((t) => Math.round(t / f) * f);
      const differ = [];
      const shots = [];
      for (const t of ts) {
        const A = await capture(s, t);
        await capture(s, 0);
        await capture(s, D * 0.5 + f);
        const B = await capture(s, t);
        if (sha(A) !== sha(B)) differ.push(t.toFixed(3));
        shots.push(sha(A));
      }
      if (differ.length) err(L`not deterministic: frames differ when the same t is seeked again (t = ${differ.join(", ")} s)`);
      else ok(L`deterministic: 3 points seeked again, identical hashes`);
      // every frame identical: the animation may not move. When a timeline holds tweens this is an error:
      // the driver does not seek its timeline (e.g. window.__seek does not call the timeline, or the other way round).
      const z = await capture(s, 0);
      if (new Set([sha(z), ...shots]).size === 1) {
        const moving = await s.page.evaluate(() => Object.values(window.__timelines || {}).some((tl) => { try { return tl && tl.totalDuration() > 0 && (!tl.getChildren || tl.getChildren(true, true, true).length > 0); } catch (e) { return false; } }));
        if (moving) err(L`first, middle and last frames are identical although a timeline holds tweens: the time driver (${inf.driver}) does not move its timeline`);
        else warn(L`first, middle and last frames are identical: the timeline may not move anything`);
      }
    }

    // blocks (mgp add) and scenes: sub-composition timelines must be seeked too, and their region must change
    if (inf.duration > 0 && !isStatic) await checkBlocks(s, inf, { ok, warn, err });

    // composition variables
    const vr = inf.variables;
    if (vr) {
      if (vr.declared.length) ok(L`variables: ${vr.declared.map((d) => d.id + "=" + JSON.stringify(vr.values[d.id])).join(", ")}`);
      const strict = o["strict-variables"];
      for (const x of vr.issues) (strict ? err : warn)(L`variable: ${x.msg}`);
    }

    // text layout: swept every 0.25 s (at most 240 points); findings that last >= 2 points are reported
    if (inf.duration > 0) await auditText(s, inf, o, { ok, warn, err, info: (x) => res.notes.push(x) });

    // fitTextFontSize / MGP.fitText
    const fl = await s.page.evaluate(`${RT}.fitLog`);
    const noFit = fl.filter((f) => !f.fits), noFont = fl.filter((f) => !f.fontLoaded);
    for (const f of noFit.slice(0, 12)) warn(L`fitText: "${f.text}" does not fit in ${Math.round(f.maxWidth)} px even at minFontSize ${f.minFontSize} px; the text will overflow (shorten it, raise maxLines, or lower minFontSize)`);
    if (noFit.length > 12) warn(L`fitText: ${noFit.length - 12} more texts do not fit either`);
    const fam = [...new Set(noFont.map((f) => f.fontFamily))];
    if (fam.length) warn(L`fitText called before the font loaded (${fam.join(", ")}): the size was computed with a fallback font. Call it after document.fonts.ready, or use fitTextFontSizeAsync`);
    if (fl.length && !noFit.length && !noFont.length) ok(L`fitText: ${fl.length} measurements, all fit`);

    // canvas text (ctx.font): fonts only a canvas uses are not loaded by document.fonts.ready. The runtime now
    // loads them and draws the frame again; here: families that still fall back (P1-2)
    await canvasFontCheck(s, { ok, warn, err });
  } catch (e) {
    err(String(e.message || e));
  } finally { await sess.close(); }

  // old names (still working): one WARN per kind with the new name
  try { await oldNames(sess.c, warn); } catch { /* never fail the check on this */ }

  // project.json (old proyek.json; in the composition folder or one level up): referenced files must exist
  try {
    const { findProject, checkProject, readProject, keyPoseTimes, oldProjectKeys } = await import("./project.mjs");
    const pj = findProject(sess.c.file);
    if (pj) {
      if (path.basename(pj) === "proyek.json") warn(L`old project file name proyek.json (still read); new name: project.json`);
      const r = await checkProject(pj, res.info, { warn, ok });
      const oldKeys = r && r.raw ? oldProjectKeys(r.raw) : [];
      if (oldKeys.length) warn(L`old project keys in ${path.basename(pj)}: ${oldKeys.join(", ")} (still read; new names e.g. versi -> version, adegan -> scenes, kunci -> poses, suara -> voice, aset -> assets)`);
      // key poses off the frame grid: the blocking sheet (contact --times poses) uses the first frame after them
      const fps = (res.info && res.info.fps) || 0;
      if (fps > 0) {
        let ks = []; try { ks = keyPoseTimes(readProject(pj)); } catch { /* ignore */ }
        const off = ks.filter((t) => Math.abs(t * fps - Math.round(t * fps)) > 1e-4);
        if (off.length) res.notes.push(L`key poses off the 1/${fps} s grid: ${off.map((t) => `${t} s -> f${Math.ceil(t * fps - 1e-6)} (${(Math.ceil(t * fps - 1e-6) / fps).toFixed(3)} s)`).join(", ")}; contact --times poses uses the first frame after them`);
      }
    }
  } catch (e) { warn("project.json: " + e.message); }
  res.ok = res.errors.length === 0;
  return res;
}

/** Canvas fonts recorded by the runtime (fillText/strokeText/measureText) over every seek of the check. */
export async function canvasFontCheck(s, { ok, warn, err }) {
  let list = [];
  try { list = await s.page.evaluate(`(${RT}.canvasFonts ? ${RT}.canvasFonts() : [])`); } catch { return; }
  const by = new Map();
  for (const f of list) { const k = f.family.toLowerCase() + "|" + f.status; if (!by.has(k)) by.set(k, { ...f, fonts: [] }); by.get(k).fonts.push(f.font); }
  const fonts = (x) => x.fonts.slice(0, 3).join("; ") + (x.fonts.length > 3 ? " …" : "");
  const good = [];
  for (const x of by.values()) {
    const fb = x.fallback || L`the browser default font`;
    if (x.status === "loaded") { good.push(x.family); if (x.late && x.at == null && !x.inSeek) warn(L`canvas font "${x.family}" was loaded only after the page drew with it while starting (not inside a seek): text drawn once at start-up (a cached texture, a sprite) keeps the fallback. Draw it inside window.__seek / the timeline, or await document.fonts.load("${x.fonts[0]}") first`); }
    else if (x.status === "generic") continue;
    else if (x.status === "system") warn(L`canvas font "${x.family}" (${fonts(x)}) has no @font-face; it depends on a system font, the result may differ on another machine`);
    else if (x.status === "fallback") warn(L`canvas text uses font "${x.family}" (${fonts(x)}), but no @font-face declares it and the system does not have it: the canvas draws with ${fb}. Add it to the page (bundled fonts.css, a Google Fonts link (redirected to the local fonts) or @font-face)`);
    else if (x.status === "unmatched") warn(L`canvas font "${x.family}" (${fonts(x)}) is declared, but no @font-face fits this weight/style or these characters: the canvas draws with ${fb}. Declare the weight/style it uses`);
    else if (x.status === "error") err(L`canvas font "${x.family}" (${fonts(x)}) failed to load: the canvas draws with ${fb}`);
    else warn(L`canvas font "${x.family}" (${fonts(x)}) was still ${x.status} when drawn: the canvas may draw with ${fb}`);
  }
  if (good.length) ok(L`canvas fonts loaded: ${[...new Set(good)].join(", ")}`);
}

/**
 * Every sub-composition timeline (blocks from "mgp add", scenes) is seeked to 30/60/90% of its range:
 *  - its playhead must equal the expected local time (otherwise ERROR: frozen block, P0),
 *  - its host region must change between those points (otherwise WARN: block covered or still).
 */
async function checkBlocks(s, inf, { ok, warn, err }) {
  const f = 1 / (inf.fps || 30);
  let list = [];
  try { list = await s.page.evaluate(`(${RT}.blockTimelines || ${RT}.timelineBlok || (() => []))()`); } catch { return; }
  const active = list.filter((b) => (b.children ?? b.anak) > 0 && (b.tlDuration ?? b.tlDurasi) > 0);
  if (!active.length) return;
  let passed = 0;
  for (const b of active) {
    const tlDur = b.tlDuration ?? b.tlDurasi, dur = b.duration ?? b.durasi;
    const span = Math.min(dur > 0 ? dur : tlDur, tlDur);
    const ts = [0.3, 0.6, 0.9].map((u) => Math.round((b.start + u * span) / f) * f).filter((t) => t >= 0 && t < inf.duration);
    if (!ts.length) continue;
    const blk = b.block ?? b.blok;
    const name = b.id + (blk ? ` (${blk})` : "");
    let wrong = 0, sample = null;
    const shots = new Set();
    for (const t of ts) {
      const x = await s.page.evaluate(async ([t, id]) => {
        const R = window.__mgpRuntime || window.__rekam;
        await R.seek(t);
        return (R.blockTimelines || R.timelineBlok)().find((q) => q.id === id) || null;
      }, [t, b.id]);
      const expect = Math.min(Math.max(0, t - b.start), span);
      const pos = x ? (x.position !== undefined ? x.position : x.posisi) : null;
      if (!x || pos == null || Math.abs(pos - expect) > f * 0.51) { wrong++; sample = sample || { t, pos, expect }; }
      if (x) {
        const k = x.box || x.kotak;
        try {
          const r = await s.cdp.send("Page.captureScreenshot", { format: "png", clip: { x: k.x, y: k.y, width: k.w, height: k.h, scale: 0.25 }, fromSurface: true, captureBeyondViewport: false });
          shots.add(sha(Buffer.from(r.data, "base64")));
        } catch { /* ignore */ }
      }
    }
    if (wrong === ts.length) err(L`block ${name} is not seeked: playhead ${sample.pos == null ? "?" : sample.pos.toFixed(3)} s at t=${sample.t.toFixed(2)} s, expected ${sample.expect.toFixed(3)} s. The block will not move in the render (driver ${inf.driver})`);
    else if (wrong) warn(L`block ${name}: playhead does not match the local time at ${wrong} of ${ts.length} points (played with another offset/speed?)`);
    else if (shots.size === 1 && ts.length > 1) warn(L`block ${name}: its region is identical at t=${ts.map((t) => t.toFixed(2)).join(", ")} s; the block is covered by another layer, hidden, or not moving`);
    else passed++;
  }
  if (passed) ok(L`blocks/sub-compositions: ${passed} of ${active.length} timelines are seeked and move`);
}

const KIND = () => ({
  small_text: L`text below the reading floor`,
  off_canvas: L`text outside the canvas`,
  text_overflow: L`text overflows its box`,
  text_clipped: L`text clipped by its own box`,
  text_clipped_container: L`text clipped by a container (overflow hidden)`,
});

/** Sweep the timeline and run auditLayout in the page at every point. */
async function auditText(s, inf, o, report) {
  const D = inf.duration, f = 1 / (inf.fps || 30);
  const maxN = +(o.samples || 240);
  const dt = Math.max(0.25, D / maxN);
  const ts = [];
  for (let t = 0; t < D - 1e-9; t += dt) ts.push(Math.round(t / f) * f);
  if (!ts.length) ts.push(0);
  const tol = o.tolerance != null ? +o.tolerance : 2;
  const found = new Map();
  for (const t of ts) {
    const list = await s.page.evaluate(async ([t, tol]) => { const R = window.__mgpRuntime || window.__rekam; await R.seek(t); return R.auditLayout({ tol }); }, [t, tol]);
    for (const x of list) {
      const k = x.code + "|" + x.sel;
      if (!found.has(k)) found.set(k, { ...x, ts: [] });
      const e = found.get(k);
      e.ts.push(t);
      if (x.px != null) e.px = Math.max(e.px || 0, x.px);
      if (x.size != null) e.size = Math.min(e.size ?? Infinity, x.size);
    }
  }
  const NAME = KIND();
  let n = 0;
  for (const e of found.values()) {
    const long = e.ts.length * dt;
    const when = e.ts.length === 1 ? `t=${e.ts[0].toFixed(2)} s` : `${e.ts[0].toFixed(2)}-${Math.min(D, e.ts[e.ts.length - 1] + dt).toFixed(2)} s`;
    const detail = e.code === "small_text" ? L`${e.size} px < ${e.floor} px (2.6% of the short side)`
      : e.code === "off_canvas" ? L`${e.px} px outside, ${e.visible}% visible`
      : e.code === "text_clipped_container" ? L`${e.px} px clipped by ${e.container}`
      : `${e.px} px (${e.axis})`;
    const msg = `${NAME[e.code] || e.code}: ${e.sel} "${e.text}" ${detail}, ${when}`;
    // a single point = transient (entering/leaving), a note is enough; small text counts when shown >= 0.5 s
    const lasts = e.code === "small_text" ? long >= 0.5 : e.ts.length >= 2;
    if (lasts) { report.warn(msg); n++; } else report.info(msg);
  }
  if (!n) report.ok(L`text layout: ${ts.length} points swept, no text overflowing, clipped or below the reading floor`);
}

// ------------------------------------------------------------------ old names (v2.3 / v2.4-dev)
const OLD_HOOKS = [
  [/\b__kurvaMaks\b/, "__kurvaMaks", "__curvesMax"], [/\b__kurvaEl\b/, "__kurvaEl", "__curvesEl"], [/\b__kurva\b/, "__kurva", "__curves"],
  [/\b__rekamVars\b/, "__rekamVars", "__mgpVars"], [/\b__rekamT\b/, "__rekamT", "__mgpT"], [/\b__rekamBindRes_/, "__rekamBindRes_", "__mgpBindRes_"],
  [/\b__rekamSkip\b/, "__rekamSkip", "__mgpSkip"], [/\b__rekamTanpaReset\b/, "__rekamTanpaReset", "__mgpNoReset"],
  [/\b__rekamTanpaSubSeek\b/, "__rekamTanpaSubSeek", "__mgpNoSubSeek"], [/\b__rekam\b(?![\w-])/, "__rekam", "__mgpRuntime"],
  [/\b__selesai\b/, "__selesai", "__done"], [/\b__studioGalat\b/, "__studioGalat", "__studioError"],
  [/\b__gerakTanpaShim\b/, "__gerakTanpaShim", "__motionNoShim"], [/["']rekam-seek["']/, "rekam-seek", "mgp-seek"],
  [/\bdata-rekam-timeline\b/, "data-rekam-timeline", "data-mgp-timeline"], [/\bdata-kurva\b/, "data-kurva", "data-curves"],
  [/name=["']rekam:size["']/, "rekam:size", "mgp:size"], [/id=["']rekam-timeline["']/, "#rekam-timeline", "#mgp-timeline"],
  [/id=["']rekam-pemuat["']/, "#rekam-pemuat", "#mgp-loader"], [/\bRekamPemuat\b/, "RekamPemuat", "MgpLoader"], [/#rekam-teks\b|id=["']rekam-teks["']/, "rekam-teks", "mgp-captions"],
];

/** Static scan of the composition source (entry HTML + local sub-composition files) for old names. */
async function oldNames(c, warn) {
  const texts = [c.html];
  for (const m of c.html.matchAll(/data-composition-src=["']([^"']+)["']/g)) {
    try { const f = path.resolve(path.dirname(c.file), m[1]); if (fs.existsSync(f)) texts.push(fs.readFileSync(f, "utf8")); } catch { /* ignore */ }
  }
  const all = texts.join("\n");
  // markup and inline code only (HTML comments dropped)
  const src = all.replace(/<!--[\s\S]*?-->/g, "");

  const hooks = OLD_HOOKS.filter(([re]) => re.test(src)).map(([, a, b]) => `${a} -> ${b}`);
  if (hooks.length) warn(L`old page hooks/attributes (still read): ${hooks.join(", ")}`);

  if (/<script[^>]+src=["'][^"']*gerak(?:\.min)?\.m?js/i.test(src)) warn(L`old engine file gerak.js (still works); new name: motion.js (copy motion-graphics/lib/motion/motion.js, API mgp.motion; window.Gerak stays an alias)`);

  if (/\bdata-blok(?:-props)?\b/.test(src)) warn(L`old block markup data-blok / data-blok-props (still read); new names: data-block / data-block-props (insert again with mgp add)`);
  if (/blok\/blok-inti\.js/.test(src)) warn(L`old block core blok/blok-inti.js (still works); new: blocks/block-core.js (mgp add overwrites the old file with the new compatible core)`);

  // block ids and props
  const ids = [...src.matchAll(/data-(?:blok|block)=["']([^"']+)["']/g)].map((m) => m[1]);
  if (!ids.length) return;
  let list, findBlock, translateProp;
  try { const add = await import("./add.mjs"); list = add.loadCatalog(); findBlock = add.findBlock; translateProp = add.translateProp; } catch { return; }
  const oldIds = new Set(), oldProps = new Set();
  for (const id of new Set(ids)) {
    try { const r = findBlock(id, list); if (r.alias) oldIds.add(`${id} -> ${r.block.id}`); } catch { /* unknown block: not our concern here */ }
  }
  // props JSON of new-markup blocks: <... data-block="id" ...> <script ... data-block-props>{...}</script>
  for (const m of src.matchAll(/data-block=["']([^"']+)["'][^>]*>\s*<script[^>]*data-block-props[^>]*>([\s\S]*?)<\/script>/g)) {
    let block, props;
    try { block = findBlock(m[1], list).block; props = JSON.parse(m[2]); } catch { continue; }
    for (const [k, v] of Object.entries(props || {})) {
      const r = translateProp(block, k, v);
      if (r.key !== k) oldProps.add(`${block.id}: ${k} -> ${r.key}`);
      else if (r.value !== v) oldProps.add(`${block.id}: ${k}=${v} -> ${r.value}`);
    }
  }
  if (oldIds.size) warn(L`old block ids (still resolved): ${[...oldIds].join(", ")}`);
  if (oldProps.size) warn(L`old prop names/values in data-block-props (still read): ${[...oldProps].join(", ")}`);
}

export function printCheck(h) {
  const out = [];
  const tag = (w) => ("  " + w).padEnd(8);
  out.push(`mgp check: ${h.file}`);
  if (h.info) out.push(`  ${h.info.width}x${h.info.height}  ${h.info.fps || "?"} fps  ${h.info.duration ? h.info.duration.toFixed(3) + " s" : L`duration ?`}  ` + L`driver ${h.info.driver}`);
  for (const s of h.passed) out.push(tag(L`OK`) + s);
  for (const s of h.warnings) out.push(tag(L`WARN`) + s);
  for (const s of h.errors) out.push(tag(L`ERROR`) + s);
  for (const s of h.notes || []) out.push(tag("info") + s);
  out.push(h.ok ? L`PASS (${h.warnings.length} warnings)` : L`FAIL: ${h.errors.length} errors, ${h.warnings.length} warnings`);
  return out.join("\n");
}

// Old names (v2.3 / v2.4-dev).
export { check as cek, printCheck as cetakCek };
