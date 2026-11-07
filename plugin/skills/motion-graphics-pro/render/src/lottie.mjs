// mgp Lottie: export an HTML composition to Lottie JSON, play (preview) and render Lottie files, check features.
//   mgp export <composition.html> --format lottie -o anim.json|anim.lottie [--fps 30] [--mode auto|canvas|dom]
//              [--interpolation linear|hold] [--precision 2] [--tolerance 0.05]
//   mgp play <anim.json|anim.lottie> [--port 4600] [--open]   preview with the MGP.lottie player (mgp scrubber)
//   mgp render <anim.json> -o out.mp4 [render options]         render Lottie to video through the same player
//   mgp frame <anim.json> --t 1 -o f.png                       one frame
//   mgp check <anim.json> [--json]                             features and what is not supported
// Old forms (`rekam lottie ekspor|putar|render|frame|cek`) are translated by names.mjs; lottieCli also accepts them.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { toDotLottie, readLottie } from "./dotlottie.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";
import { motionLib } from "./location.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
/** MGP lib folder (motion-graphics/lib), can be overridden with env MGP_LIB (old REKAM_MGP_LIB) */
export function libDir() {
  const cands = [env("MGP_LIB"), path.resolve(here, "../../../motion-graphics/lib"), path.resolve(here, "../../../../motion-graphics/lib"), motionLib("lottie/lottie.js")].filter(Boolean);
  for (const c of cands) if (fs.existsSync(path.join(c, "lottie", "lottie.js"))) return c;
  throw new Error(L`MGP lib (motion-graphics/lib/lottie) not found; set MGP_LIB=<lib folder>`);
}
const read = (...p) => fs.readFileSync(path.join(libDir(), ...p), "utf8");
/** lottie/record.js (old name lottie/rekam.js) */
const recorderFile = () => (fs.existsSync(path.join(libDir(), "lottie", "record.js")) ? "record.js" : "rekam.js");
const say = (o, s) => { if (!o.quiet && !o.diam) process.stderr.write(s + "\n"); };
const mode$ = (m) => (m === "kanvas" ? "canvas" : m || "auto");

/** load lottie.js into Node (no DOM) for analysis */
function nodeLottie() {
  if (!globalThis.MGP || !globalThis.MGP.lottie || !globalThis.MGP.lottie.analyze) vm.runInThisContext(read("lottie", "lottie.js"), { filename: "lottie.js" });
  return globalThis.MGP.lottie;
}

export async function exportLottie(comp, o) {
  const { openSession, resolveTiming } = await import("./session.mjs");
  const out = path.resolve(o.o || o.out || path.basename(comp).replace(/\.html?$/i, "") + ".json");
  const sess = await openSession(comp, { ...o, scale: 1 });
  try {
    const s = await sess.open();
    const tm = resolveTiming(s.info, o);
    const fps = +(o.fps || 30);
    const mode = mode$(o.mode);
    for (const f of [["core", "mgp-core.js"], ["lottie", "lottie.js"], ["lottie", recorderFile()]])
      await s.page.evaluate((code) => { (0, eval)(code); return true; }, read(...f) + "\n//# sourceURL=mgp/" + f.join("/")); // global eval (the mgp CDP client has no addScriptTag)
    say(o, L`mgp export lottie: ${path.basename(sess.c.file)} ${s.info.width}x${s.info.height}, ${tm.from}-${tm.to} s @ ${fps} fps, mode ${mode}`);
    const r = await s.page.evaluate(async (x) => {
      const LT = window.MGP.lottie, rootEl = document.querySelector("[data-composition-id]") || document.body;
      const recordPage = LT.recordPage || LT.rekamHalaman, fromDOM = LT.fromDOM || LT.dariDOM;
      const rt = window.__mgpRuntime || window.__rekam;
      let res = null, mode = x.mode;
      // the lib reads the old option names (interpolasi/presisi/toleransi); the English ones are passed too
      const common = { fps: x.fps, duration: x.to - x.from, from: x.from, interpolation: x.interpolation, interpolasi: x.interpolation, precision: x.precision, presisi: x.precision, width: x.width, height: x.height };
      if (x.tolerance != null) { common.tolerance = x.tolerance; common.toleransi = x.tolerance; }
      const rep = (q) => q.report || q.laporan;
      if (mode !== "dom") {
        res = await recordPage(Object.assign({ root: rootEl }, common));
        const per = rep(res).recordsPerFrame || rep(res).rekamanPerFrame || [];
        if (mode !== "canvas" && per.every((n) => !n)) res = null;
        else mode = "canvas";
      }
      let seekRuntime = false;
      if (!res) {
        mode = "dom";
        const tls = window.__timelines || {}, keys = Object.keys(tls), tl = tls.main || Object.values(tls)[0] || window.__timeline || null;
        const kids = (q) => { try { return q && q.getChildren ? q.getChildren(true, true, true).length : 0; } catch (e) { return 0; } };
        // One introspectable timeline (GSAP/mgp.motion) = tweens can be mapped to eased keyframes. Multi-scene/block
        // compositions (several timelines, .clip scenes, a __seek driver) are seeked through the mgp runtime
        // (every timeline + clip visibility, the synchronous part of runtime.seek), keyframes from samples.
        const single = keys.length <= 1 && !document.querySelector("[data-composition-id] [data-composition-id], .clip[data-start]") && typeof window.__seek !== "function";
        const gs = single && tl && tl.getChildren && kids(tl) ? tl : null;
        seekRuntime = !gs;
        const seek = gs ? undefined : (t) => { rt.seek(t); };
        res = fromDOM(rootEl, { fps: x.fps, duration: x.to, timeline: gs, seek, width: x.width, height: x.height });
      }
      const moving = Object.values(window.__timelines || {}).some((q) => { try { return q.totalDuration() > 0 && (!q.getChildren || q.getChildren(true, true, true).length > 0); } catch (e) { return false; } }) || typeof window.__seek === "function";
      return { json: res.json(), report: rep(res), mode, seekRuntime, moving };
    }, { mode, fps, from: tm.from, to: tm.to, interpolation: o.interpolation || "linear", precision: o.precision != null ? +o.precision : 2, tolerance: o.tolerance != null ? +o.tolerance : null, width: s.info.width, height: s.info.height });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // -o anim.lottie: dotLottie (deflate zip, lossless, ~10x smaller); otherwise plain Lottie JSON
    const dot = /\.lottie$/i.test(out);
    const body = dot ? toDotLottie(r.json, path.basename(out).replace(/\.lottie$/i, "").replace(/[^\w-]+/g, "_") || "anim") : r.json;
    fs.writeFileSync(out, body);
    const R = r.report || {};
    const layers = R.layers ?? R.lapisan, keyframes = R.keyframes ?? R.keyframe, frames = R.frames ?? R.frame;
    say(o, "  " + L`mode ${r.mode}: ${frames} frames, ${layers} layers, ${keyframes} keyframes, ${(r.json.length / 1024).toFixed(1)} KB JSON` + (dot ? `, ${(body.length / 1024).toFixed(1)} KB .lottie` : "") + ` -> ${out}` + (r.seekRuntime && r.mode === "dom" ? " " + L`(seeked through the runtime: every timeline/scene)` : ""));
    const saved = R.savings ?? R.hemat;
    if (saved) say(o, "  " + L`size savings: ${saved}`);
    for (const x of R.unsupported || R.tidakDidukung || []) say(o, "  " + L`not supported: ${x.what ?? x.hal} (${x.count ?? x.kali}x)`);
    // B3: a static export while the composition moves is almost certainly wrong; say so clearly
    if (!keyframes && r.moving) process.stderr.write("  " + L`WARN` + ": " + L`static Lottie (0 keyframes) although the composition has a moving timeline. Motion on canvas/WebGL, CSS animation, or elements whose DOM does not change is not read by mode ${r.mode}; try --mode ${r.mode === "dom" ? "canvas" : "dom"}, or export per scene.` + "\n");
    // size: heavy Lottie plays slowly on phones/web; estimate and advice
    const MB = r.json.length / 1048576;
    if (MB > 10) process.stderr.write("  " + L`WARN` + ": " + L`JSON ${MB.toFixed(1)} MB (${(MB / Math.max(0.001, tm.to - tm.from)).toFixed(1)} MB per second)` + (dot ? `, .lottie ${(body.length / 1048576).toFixed(1)} MB` : "; " + L`save it as .lottie (-o ${path.basename(out).replace(/\.json$/i, "")}.lottie, lossless, ~10x smaller)`) + ". " + L`Make it smaller: --precision 1, --tolerance 0.3, --fps 24/15, a shorter --from/--to range, or render to MP4.` + "\n");
    return { out, mode: r.mode, bytes: body.length, bytesJson: r.json.length, report: R };
  } finally { await sess.close(); }
}

/** safe to inline in a <script> (the lib's doc comments contain "</script>") */
const inline = (code) => code.replace(/<\/(script)/gi, "<\\/$1");

/** temporary composition that plays a Lottie file with MGP.lottie (__seek/__duration contract) */
export function playComposition(file, o = {}) {
  const src = path.resolve(file);
  if (!fs.existsSync(src)) throw new Error(L`Lottie file not found: ${src}`);
  const txt = readLottie(fs.readFileSync(src)), data = JSON.parse(txt); // .json or .lottie
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-lottie-"));
  const W = data.w, H = data.h, D = (data.op - (data.ip || 0)) / (data.fr || 30);
  const bg = o.color || null;
  // external image assets: copy relative to the JSON file
  for (const a of data.assets || []) if (a.p && !a.layers && a.e !== 1 && !/^data:/.test(a.p)) {
    const from = path.resolve(path.dirname(src), (a.u || "") + a.p), to = path.join(dir, (a.u || "") + a.p);
    if (fs.existsSync(from)) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
  }
  // lang="id" kept as before so the player page renders exactly as it did (font fallback / hyphenation)
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${path.basename(src)}</title>
<style>html,body{margin:0;background:${bg || "transparent"}}#stage{position:relative;width:${W}px;height:${H}px;overflow:hidden}</style>
<script>${inline(read("core", "mgp-core.js"))}</script><script>${inline(read("lottie", "lottie.js"))}</script></head>
<body><div id="stage" data-composition-id="main" data-start="0" data-duration="${D}" data-fps="${data.fr || 30}" data-width="${W}" data-height="${H}"></div>
<script>
window.__duration = ${D};
const inst = MGP.lottie.create(document.getElementById("stage"), { data: ${txt.replace(/</g, "\\u003c")}, assetsPath: "", fit: "contain"${bg ? `, background: ${JSON.stringify(bg)}` : ""} });
window.__seek = (t) => { inst.seek(t); return true; };
window.__ready = inst.ready.then(() => { MGP.core.expose(inst); const r = inst.report(); if (r.unsupported.length) console.warn(${JSON.stringify(L`MGP.lottie does not support: `)} + r.unsupported.join("; ")); return true; });
</script></body></html>`;
  const entry = path.join(dir, "index.html");
  fs.writeFileSync(entry, html);
  return { entry, dir, data };
}

export function checkLottie(file, o = {}) {
  const data = JSON.parse(readLottie(fs.readFileSync(path.resolve(file))));
  const a = nodeLottie().analyze(data);
  const r = { file: path.resolve(file), w: data.w, h: data.h, fps: data.fr, frames: data.op - (data.ip || 0), duration: +((data.op - (data.ip || 0)) / (data.fr || 30)).toFixed(3), layers: a.layers, features: a.features, unsupported: a.unsupported };
  if (!o.json) {
    console.log(L`${path.basename(file)}: ${r.w}x${r.h}, ${r.fps} fps, ${r.frames} frames (${r.duration} s), ${r.layers} layers`);
    console.log("  " + L`features: ${Object.entries(r.features).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    console.log("  " + (r.unsupported.length ? L`not supported: ${r.unsupported.join("; ")}` : L`every feature is supported by the MGP.lottie player`));
  }
  return r;
}

/** args: [sub, file, ...]; sub = export | play | check | render | frame (old ekspor | putar | cek also work). */
export async function lottieCli(args, o) {
  const [sub, file] = args;
  const s = { ekspor: "export", putar: "play", preview: "play", cek: "check", info: "check" }[sub] || sub;
  if (o && o.mode) o.mode = mode$(o.mode);
  if (s === "export") return exportLottie(file, o);
  if (s === "check") { const r = checkLottie(file, o); if (o.json) console.log(JSON.stringify(r, null, 2)); return r; }
  if (s === "play") {
    const k = playComposition(file, o); const pv = await import("./preview.mjs");
    return (pv.preview || pv.pratinjau)(k.entry, { ...o, root: k.dir });
  }
  if (s === "render" || s === "frame") {
    const k = playComposition(file, o); const m = await import("./render.mjs");
    try { return s === "render" ? await m.render(k.entry, { ...o, root: k.dir }) : await m.frame(k.entry, { ...o, root: k.dir }); }
    finally { fs.rmSync(k.dir, { recursive: true, force: true }); }
  }
  console.error(L`mgp lottie: unknown subcommand "${sub || ""}" (export, play, render, frame, check)`);
  process.exitCode = 2;
}

/** Old names (v2.3 / v2.4-dev). */
export { exportLottie as ekspor, playComposition as komposisiPutar, checkLottie as cekLottie };
