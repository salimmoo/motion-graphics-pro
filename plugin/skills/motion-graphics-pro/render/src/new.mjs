// mgp new: open a standard Motion Graphics Pro project.
//   standard folders, brief.md (T1), STATUS.md (T10), project.json, and an index.html already wired
//   to mgp.motion (assets/js/motion.js), the MGP library (assets/js/mgp.js) and the bundled fonts (assets/fonts/).
//   Every path is relative: it runs from file:// (small player) and through mgp (check, contact, render).
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { newProject } from "./project.mjs";
import { L, lang } from "./i18n.mjs";
import { motionLib } from "./location.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const RENDER = path.resolve(here, "..");
const PRO = path.resolve(RENDER, "..");
const MGP_DIST = ((p) => fs.existsSync(p) ? p : ((lib) => lib ? path.join(lib, "dist", "mgp.js") : p)(motionLib("dist/mgp.js")))(
  path.resolve(PRO, "..", "motion-graphics", "lib", "dist", "mgp.js"));
const FONTS = path.join(RENDER, "fonts");

export const help = () => L`mgp new <folder> [--aspect 9:16|16:9|1:1|4:5|21:9|WxH] [--resolution 720|1080|1440|4k] [--fps 24|30|60]
           [--duration 30] [--title "Title"]
           [--font "Poppins,Playfair Display"] [--poses 0,1.5,3] [--lang id|en] [--force] [--json]

Opens a standard project:
  index.html     root composition (mgp.motion + lib/dist/mgp.js + bundled fonts), variable "blocking"
  project.json   one source of project data (schema: motion-graphics-pro/references/project.md)
  brief.md       T1 form · STATUS.md T10 handover (language: --lang, default MGP_LANG / LANG)
  assets/{js,fonts,audio,pieces,raw,src,fx}  compositions/  review/  out/

Defaults: 9:16, resolution 1080 (short side 1080 px: 1080x1920), 24 fps, 10 s, fonts Poppins + Playfair Display.
Aspect: 9:16 Reels/TikTok/Shorts · 16:9 YouTube/web · 1:1 feed · 4:5 portrait feed · 21:9 cinematic.
Resolution = short side: 720 (draft), 1080 (default), 1440, 4k (2160; renders about 4x slower).
Default key poses: 4 points spread over scene s01 (used by the blocking stage:
  mgp contact index.html --var blocking=true --times poses -o review/blocking.png).`;
/** Old name (v2.3 / v2.4-dev): the help text. */
export const BANTUAN = help();

const SIZES = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "21:9": [2520, 1080] };
const RESOLUTION = { "720": 720, "720p": 720, "1080": 1080, "1080p": 1080, "1440": 1440, "2k": 1440, "4k": 2160, "2160": 2160, "2160p": 2160 };
const even = (x) => Math.round(x / 2) * 2;

function template(name, lng = lang()) {
  // one source per language: references/template.md (English, canonical) and references/template.id.md
  // (Indonesian variant); old folder rujukan/ as a fallback. Sections T1 and T10.
  const files = lng === "id" ? ["template.id.md", "template.md"] : ["template.md"];
  for (const dir of ["references", "rujukan"]) for (const file of files) {
    try {
      const t = fs.readFileSync(path.join(PRO, dir, file), "utf8").replace(/\r\n/g, "\n");
      if (name === "T1") {
        const m = t.match(/### T1 [^\n]*\n([\s\S]*?)\n### T2/);
        if (m) return m[1].trim();
      }
      if (name === "T10") {
        const m = t.match(/### T10 [^\n]*\n+```markdown\n([\s\S]*?)\n```/);
        if (m) return m[1].trim();
      }
    } catch { /* next folder, then the built-in fallback */ }
  }
  return null;
}

function copyFonts(families, toDir) {
  const man = JSON.parse(fs.readFileSync(path.join(FONTS, "fonts.json"), "utf8"));
  const css = fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8").split("\n");
  const out = ["/* mgp bundled fonts (project subset, OFL-1.1; licence in each font folder). Add a family: copy it from motion-graphics-pro/render/fonts/. */"];
  const used = [], missing = [];
  for (const name of families) {
    const f = man.families.find((x) => x.family.toLowerCase() === name.toLowerCase());
    if (!f) { missing.push(name); continue; }
    const slug = f.faces[0].file.split("/")[0];
    fs.cpSync(path.join(FONTS, slug), path.join(toDir, slug), { recursive: true });
    out.push(...css.filter((l) => l.includes(`font-family:'${f.family}'`)));
    used.push(f.family);
  }
  fs.writeFileSync(path.join(toDir, "fonts.css"), out.join("\n") + "\n");
  return { used, missing, all: man.families.map((x) => x.family) };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The page below renders exactly like the v2.4 template (same CSS, same text, same tweens); only ids, comments and
// the file:// player (not rendered by mgp) are in English. The visible placeholder text stays as it was.
function indexHtml({ title, W, H, fps, duration, poses, fontTitle, fontKey }) {
  const S = Math.min(W, H) / 1080; // unit: short side 1080
  const px = (v) => Math.round(v * S);
  return `<!doctype html>
<!-- Made by "mgp new". mgp composition skeleton (references/template.md T7; HyperFrames-compatible format).
     Runs from file:// (small player below the frame) and through mgp: mgp check / contact / curves / render index.html -->
<html lang="id" data-composition-variables='[{"id":"blocking","type":"boolean","default":false,"label":"Blocking: key poses only (stepped)"}]'>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${esc(title)}</title>
<link rel="stylesheet" href="assets/fonts/fonts.css">
<script src="assets/js/motion.js"></script>
<script src="assets/js/mgp.js"></script>
<style>
  html, body { margin: 0; background: #16161a; }
  #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #F3EDE2; }
  #s01-sky { position: absolute; inset: 0; background: linear-gradient(#2C67B0, #78ACDC 45%, #D9E8F2 80%); }
  #s01-card { position: absolute; left: ${px(90)}px; top: ${Math.round(H * 0.3)}px; padding: ${px(40)}px ${px(52)}px;
    background: #FBF6EA; box-shadow: 0 ${px(9)}px ${px(18)}px rgba(43,26,12,.32); }
  #s01-kicker { font: 600 ${px(30)}px '${fontTitle}', sans-serif; letter-spacing: .3em; color: rgba(20,20,20,.75); }
  #s01-title { font: 700 ${px(84)}px/1.12 '${fontTitle}', sans-serif; color: #141414; max-width: ${W - px(300)}px; }
  #s01-keyword { font: italic 700 ${px(64)}px '${fontKey}', serif; color: #B23A32; }
  #s01-ball { position: absolute; left: ${px(140)}px; top: ${Math.round(H * 0.72)}px; width: ${px(120)}px; height: ${px(120)}px;
    border-radius: 50%; background: #E3B04B; box-shadow: 0 ${px(8)}px ${px(14)}px rgba(45,28,12,.3); }
  #player { font: 13px system-ui, sans-serif; color: #ddd; padding: 10px; display: flex; gap: 10px; align-items: center; width: ${Math.min(W, 1080)}px; }
  #player input[type=range] { flex: 1; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-fps="${fps}" data-width="${W}" data-height="${H}">
  <div id="s01" class="clip" data-start="0" data-duration="${duration}">
    <div id="s01-sky"></div>
    <div id="s01-card">
      <div id="s01-kicker">KICKER</div>
      <div id="s01-title">${esc(title)}</div>
      <div id="s01-keyword">kata kunci</div>
    </div>
    <div id="s01-ball"></div>
  </div>
</div>
<script>
(function () {
  // main API: mgp.motion (the package animation engine). "gsap" is only a compatibility alias for old code.
  var motion = (window.mgp && window.mgp.motion) || window.gsap;
  var D = ${duration}, FPS = ${fps};
  // key poses of scene s01 (seconds). Keep equal to project.json scenes[0].poses.
  var POSES = ${JSON.stringify(poses)};
  var getVars = (window.__mgp || window.__hyperframes || {}).getVariables;
  var vars = getVars ? getVars() : {};
  var blocking = vars.blocking === true || vars.blocking === "true" || /[?&]blocking=1/.test(location.search);
  function pose(t) { var k = POSES[0]; for (var i = 0; i < POSES.length; i++) if (POSES[i] <= t + 1e-6) k = POSES[i]; return k; }

  // Blocks from "mgp add" = sub-compositions with their own timeline in window.__timelines[id].
  // mgp seeks them itself (before __seek), so blocks move without extra code here.
  // The template only seeks them too in blocking mode (blocks held at the key pose) and in the
  // file:// player (without mgp). Time offset = the host data-start (+ its parent hosts), as in mgp.
  function seekBlocks(t) {
    var tls = window.__timelines || {}, root = document.querySelector('[data-composition-id="main"]');
    Object.keys(tls).forEach(function (id) {
      var b = tls[id], host = document.querySelector('[data-composition-id="' + id + '"]');
      if (!b || !host || host === root || typeof b.totalTime !== "function") return;
      var st = 0;
      for (var h = host; h && h !== root; h = h.parentElement && h.parentElement.closest("[data-composition-id]")) st += +h.getAttribute("data-start") || 0;
      var du = +host.getAttribute("data-duration") || b.totalDuration();
      host.style.visibility = t >= st && t < st + du ? "" : "hidden";
      b.pause(); b.totalTime(Math.min(Math.max(0, t - st), du, b.totalDuration()), false);
    });
  }

  // Content motion, written pose to pose: P0 hook (the card is visible on frame 0), P1 the ball lands,
  // P2 the ball slides + keyword, P3 the card leaves. Every action ENDS exactly at its key time,
  // so blocking mode (stepped) holds the pose already reached. Replace this with the project's scene.
  var tl = motion.timeline({ paused: true });
  function action(k, dur) { return Math.max(0, POSES[k] - dur); }
  tl.fromTo("#s01-ball", { y: ${-px(1700)} }, { y: 0, duration: 0.9, ease: "spring.bouncy" }, action(1, 0.9));
  tl.fromTo("#s01-ball", { x: 0 }, { x: ${W - px(400)}, duration: 1.2, ease: "power2.inOut" }, action(2, 1.2));
  tl.fromTo("#s01-keyword", { y: ${px(20)}, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, action(2, 0.3));
  tl.fromTo("#s01-card", { x: 0, opacity: 1 }, { x: ${-px(700)}, opacity: 0, duration: 0.3, ease: "power2.in" }, action(3, 0.3));
  tl.set({}, {}, D);

  function draw(t) {
    var tt = blocking ? pose(t) : t;
    tl.seek(tt);
    if (blocking || !window.__mgpRuntime) seekBlocks(tt);
    // paper boil on twos, deterministic (MGP.core.noise1)
    if (window.MGP && MGP.core && MGP.core.noise1) {
      var f = Math.floor(tt * 12);
      motion.set("#s01-sky", { x: MGP.core.noise1(f * 0.37) * 1.2, y: MGP.core.noise1(f * 0.53 + 9) * 1.2 });
    }
  }
  window.__duration = D;
  window.__fps = FPS;
  window.__seek = draw;                // mgp uses __seek as the root driver; blocks are still seeked by mgp
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;     // timeline key = root data-composition-id
  draw(0);

  // small player when opened straight from file:// (not created while mgp renders)
  if (!window.__mgpRuntime) {
    var bar = document.createElement("div"); bar.id = "player";
    bar.innerHTML = '<button>play</button><input type="range" min="0" max="' + D + '" step="' + (1 / FPS) + '" value="0"><span>0.00 s</span><label><input type="checkbox"' + (blocking ? " checked" : "") + '> blocking</label>';
    document.body.appendChild(bar);
    var b = bar.querySelector("button"), r = bar.querySelector("input[type=range]"), s = bar.querySelector("span"), c = bar.querySelector("input[type=checkbox]");
    var running = false, t0 = 0, from = 0;
    var show = function (t) { draw(t); r.value = t; s.textContent = t.toFixed(2) + " s"; };
    var play = function (now) { if (!running) return; var t = from + (now - t0) / 1000; if (t >= D) t = 0, from = 0, t0 = now; show(t); requestAnimationFrame(play); };
    b.onclick = function () { running = !running; b.textContent = running ? "pause" : "play"; from = +r.value; t0 = performance.now(); if (running) requestAnimationFrame(play); };
    r.oninput = function () { running = false; b.textContent = "play"; show(+r.value); };
    c.onchange = function () { blocking = c.checked; show(+r.value); };
  }
})();
</script>
</body>
</html>
`;
}

function spread(D) {
  // 4 key poses spread evenly, rounded to 0.25 s (3 drawings on twos at 24 fps)
  return [0, 0.15, 0.4, 0.75].map((u) => Math.round(u * D * 4) / 4);
}

export async function create(folder, o = {}) {
  if (o.lang != null) {
    // --lang id|en: brief.md, STATUS.md and the messages follow this language (same switch as MGP_LANG)
    const l = String(o.lang).toLowerCase();
    if (!/^(id|en)/.test(l)) throw new Error(L`mgp new: unknown --lang ${o.lang} (id or en)`);
    process.env.MGP_LANG = l.startsWith("id") ? "id" : "en";
  }
  const lng = lang();
  if (!folder) throw new Error(L`mgp new: name the project folder` + "\n\n" + help());
  const aspect = o.aspect || "9:16";
  let [W, H] = SIZES[aspect] || (/^\d+x\d+$/.test(aspect) ? aspect.split("x").map(Number) : [null, null]);
  if (!W) throw new Error(L`mgp new: unknown --aspect ${aspect} (9:16, 16:9, 1:1, 4:5, 21:9, or WIDTHxHEIGHT)`);
  if (o.resolution != null && SIZES[aspect]) {
    const side = RESOLUTION[String(o.resolution).toLowerCase()];
    if (!side) throw new Error(L`mgp new: unknown --resolution ${o.resolution} (720, 1080, 1440, 4k)`);
    const k = side / Math.min(W, H); W = even(W * k); H = even(H * k);
  }
  const fps = +(o.fps || 24), duration = +(o.duration || 10);
  if (!(fps > 0) || !(duration > 0)) throw new Error(L`mgp new: --fps and --duration must be positive numbers`);
  const title = o.title || path.basename(path.resolve(folder));
  const poses = o.poses ? String(o.poses).split(/[,;\s]+/).filter(Boolean).map(Number) : spread(duration);
  if (poses.length < 1 || poses.some((x) => !Number.isFinite(x) || x < 0 || x > duration)) throw new Error(L`mgp new: --poses must be a list of seconds inside the duration`);
  while (poses.length < 4) poses.push(poses[poses.length - 1]);
  const families = String(o.font || "Poppins,Playfair Display").split(",").map((s) => s.trim()).filter(Boolean);

  const dir = path.resolve(folder);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length && !o.force)
    throw new Error(L`mgp new: folder ${dir} is not empty; use a new folder or --force (files with the same name are overwritten)`);
  const sub = ["assets/js", "assets/fonts", "assets/audio", "assets/pieces", "assets/raw", "assets/src", "assets/fx", "compositions", "review", "out"];
  for (const s of sub) fs.mkdirSync(path.join(dir, s), { recursive: true });

  const notes = [];
  fs.copyFileSync(path.join(here, "motion.js"), path.join(dir, "assets/js/motion.js"));
  if (fs.existsSync(MGP_DIST)) fs.copyFileSync(MGP_DIST, path.join(dir, "assets/js/mgp.js"));
  else notes.push(L`lib/dist/mgp.js is not built yet: run \`node motion-graphics/lib/build.js\`, then copy it to assets/js/mgp.js`);
  const fnt = copyFonts(families, path.join(dir, "assets/fonts"));
  if (fnt.missing.length) notes.push(L`fonts not in the bundle: ${fnt.missing.join(", ")} (add your own @font-face in assets/fonts/)`);
  const fontTitle = fnt.used[0] || "Poppins", fontKey = fnt.used[1] || fontTitle;

  fs.writeFileSync(path.join(dir, "index.html"), indexHtml({ title, W, H, fps, duration, poses, fontTitle, fontKey }));

  const p = newProject({ title, aspect, width: W, height: H, fps, duration, poses });
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify(p, null, 2) + "\n");

  const date = p.meta.created;
  let t1 = template("T1", lng) || L`| Field | Answer |
|---|---|
| Title; goal and main message | <fill in> |`;
  // the filled-in cells follow the language of the template text itself
  t1 = t1.replace(/\| (Judul; tujuan dan pesan utama|Title; goal and main message) \| <[^>\n]*> \|/, (m, a) => `| ${a} | ${title}; ` + (a.startsWith("Judul") ? "<tujuan, pesan utama>" : L`<goal, main message>`) + " |")
    .replace(/\| (Platform, rasio, durasi|Platform, aspect, duration) \| [^\n]*\|/, (m, a) => `| ${a} | <Reels/TikTok/Shorts>, ${aspect}, ${duration} s ` + (a.includes("rasio") ? "(batas platform dicek <tgl>)" : L`(platform limits checked <date>)`) + " |")
    .replace(/<(resolusi|resolution)>, 24 fps/, `${W}x${H}, ${fps} fps`);
  fs.writeFileSync(path.join(dir, "brief.md"),
    L`# Brief: ${title}

Made ${date} by \`mgp new\`. Empty fields are asked of the user (skill motion-graphics-pro, stage 1; template T1).

${t1}

## Personification question

Used or not; if yes, which object: <fill in>
`);

  let t10 = template("T10", lng) || L`# Handover <project> <episode>
## Status <date time>
Stage: <number + name>.`;
  t10 = t10.replace(/<(proyek|project)> <episode>/, title).replace(/## Status <(tgl jam|date time)>/, `## Status ${date}`)
    .replace(/Tahap: <nomor \+ nama>\. Gerbang terakhir: G<n> \(<menunggu\/lolos tgl>\)\. Blok terkunci: <daftar>\. Blok berjalan: <nama>\./,
      "Tahap: 1 Brief. Gerbang terakhir: - (G1 belum). Blok terkunci: -. Blok berjalan: -.")
    .replace(/Stage: <number \+ name>\.(?: Last gate: G<n> \([^)\n]*\)\. Locked blocks: <[^>\n]*>\. Running block: <[^>\n]*>\.)?/,
      "Stage: 1 Brief. Last gate: - (G1 pending). Locked blocks: -. Running block: -.");
  fs.writeFileSync(path.join(dir, "STATUS.md"), t10 + "\n");

  return {
    folder: dir, lang: lng, aspect, size: `${W}x${H}`, fps, duration, poses, fonts: fnt.used, notes,
    files: ["index.html", "project.json", "brief.md", "STATUS.md", "assets/js/motion.js", "assets/js/mgp.js", "assets/fonts/fonts.css"],
  };
}

export async function cli(argv) {
  let a;
  try {
    a = parseArgs({ args: argv, allowPositionals: true, options: {
      aspect: { type: "string" }, resolution: { type: "string" }, fps: { type: "string" }, duration: { type: "string" }, title: { type: "string" },
      font: { type: "string" }, poses: { type: "string" }, lang: { type: "string" }, force: { type: "boolean" }, json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    } });
  } catch (e) { console.error("mgp new: " + e.message + "\n\n" + help()); process.exitCode = 2; return; }
  if (a.values.help || !a.positionals[0]) { console.log(help()); return; }
  const r = await create(a.positionals[0], a.values);
  if (a.values.json) { console.log(JSON.stringify(r, null, 2)); return; }
  const rel = (path.relative(process.cwd(), r.folder) || ".").replace(/\\/g, "/");
  console.log(`mgp new: ${r.folder}`);
  console.log(L`  ${r.size} (${r.aspect}), ${r.fps} fps, ${r.duration} s, fonts ${r.fonts.join(" + ")}, key poses ${r.poses.join(" / ")} s`);
  for (const b of r.files) console.log("  + " + b);
  for (const c of r.notes) console.log("  " + L`WARN` + " " + c);
  const R = 'node "' + path.join(RENDER, "bin", "mgp.mjs").replace(/\\/g, "/") + '"';
  console.log("\n" + L`Next steps (skill motion-graphics-pro, stage 1):
  ${R} doctor                      # once at the start: guides the voice and image choices
  ${R} check ${rel}/index.html
  ${R} contact ${rel}/index.html --var blocking=true --times poses -o ${rel}/review/blocking.png
  fill in brief.md (T1), then three T2a concepts towards gate G1.`);
}

// Old names (v2.3 / v2.4-dev).
export { create as baru };
