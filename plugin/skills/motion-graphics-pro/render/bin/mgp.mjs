#!/usr/bin/env node
// mgp: renders HTML compositions to video frame by frame, fully local (Chrome/Edge + ffmpeg). Old name: rekam.
// Old Indonesian commands, flags and values still work (src/names.mjs translates them first).
import { parseArgs } from "node:util";
import { translateArgv, oldNamesUsed } from "../src/names.mjs";
import { L } from "../src/i18n.mjs";

const VERSION = "0.3.0";
const help = () => L`mgp ${VERSION}: render HTML compositions to video locally (Chrome/Edge + ffmpeg)

Project:
  mgp new <folder> [--aspect 9:16|16:9] [--fps 24] [--duration 10] [--title "..."]
               standard folders + brief.md + STATUS.md + project.json + index.html (mgp.motion, mgp.js, fonts)
  mgp audit <project-folder|composition.html> [--json] [--platform tiktok|reels|shorts|youtube|feed]
               one report: check, curves, safe zones, VO, loudness, project.json, asset licences -> review/audit.md

Composition:
  mgp check <composition.html | anim.json> [--json] [--samples 240] [--tolerance 2]   (also checks project.json)
  mgp preview <composition.html> [--port 4600] [--open]
  mgp studio <composition.html> [--port 4700] [--open] [--out-dir folder]   visual editor (alias: editor)
  mgp render <composition.html | anim.json> -o out.mp4 [--fps 24|30|60] [--size 1080x1920]
               [--from 0] [--to 5] [--scale 1] [--workers 4] [--audio music.wav@1.5]
               [--captions words.json] [--format mp4|prores|webm|png] [--crf 18] [--transparent]
               [--encoder cpu|auto|nvenc|qsv|amf|videotoolbox]   (MP4; default cpu = libx264)
  mgp frame <composition.html | anim.json> --t 3.2 -o f.png
  mgp contact <composition.html> --n 12 -o contact.png
               [--times 0,1.2,2.4 | --times poses]   given seconds / key poses from project.json (blocking)
  mgp curves <composition.html> [--selector ".a, #b"] [-o curves.png] [--json] [--max 8]
               motion QC: value + speed graph per element; flags linear motion, pops,
               abrupt starts/stops, squash without constant volume (canvas: window.__curves = (t) => ({...}))

Lottie (player and exporter MGP.lottie):
  mgp export <composition.html> --format lottie -o anim.json|anim.lottie [--fps 30] [--mode auto|canvas|dom]
               [--interpolation linear|hold] [--precision 2] [--from 0] [--to 5]
  mgp play <anim.json|anim.lottie> [--port 4600] [--open]     preview with the MGP.lottie player
  mgp render|frame|check <anim.json>                          render, one frame, or unsupported features

Machine:
  mgp doctor [--json]        CPU, RAM, GPU/VRAM, ffmpeg hardware encoders, PyTorch (MGP_PYTHON),
                             then advice per pipeline: voice, local image, render (alias: machine)
  mgp install voice|image|all [--detach] [--cpu] [--openvoice] [--folder <dir>]   install the local engines once per
                             computer: PyTorch for your GPU, venv, locked packages, models + sha256, smoke test
  mgp install all --status | --adopt | --dry-run   status / use an existing manual install / decisions only

Ready-made blocks (folder blocks/):
  mgp catalog [--search glitch] [--category transitions] [--json]
  mgp add <category/name ...> --into composition.html [--prop key=value ...] [--start 2]
               [--duration 1.2] [--track 20] [--container #box] [--dry-run]   (without --into: print the snippet)

Composition variables (check, preview, render, frame, contact):
  --var key=value         set one root variable (repeatable)
  --vars values.json      JSON object {key: value} (alias --variables-file)
  --variables '<json>'    inline JSON (in PowerShell --vars is safer)
  --strict-variables      fail when a value does not match its declaration

Media (ffmpeg, local):
  mgp media list                                   looks and effects
  mgp media look <in> --look warm [--strength 0.8] [--lut x.cube] -o out
  mgp media brighten <in> -o out [--target 0.45]   auto levels for dark/dull footage
  mgp media effects <in> --effect blur|pixelate|duotone|halftone|posterize|grain|vignette -o out
  mgp media compare <in> -o compare.jpg            one frame with every look
  mgp media lut <look> -o look.cube                export the colour part of a look as a .cube LUT
  mgp audio normalize <in> -o out [--lufs -14 | --podcast] [--tp -1]
  mgp audio measure <in>                           EBU R128 loudness
  mgp cutout <in.png|in.mp4> -o out.png|out.webm|out.mov [--model u2net]
             [--plate-out plate.webm] [--key magenta|green|#rrggbb] [--no-despill] [--despill <colour>]
  mgp transcribe <audio|video> -o words.json [--language id] [--model small]
                 [--fix-with script.txt] [--reuse words.json]
  mgp align <audio> --script text.txt -o words.json   word timing without Whisper
  mgp sfx list | mgp sfx <preset> [--duration 1] [--seed 1] [--param k=v] -o out.wav
  mgp sfx mix cues.json -o sfx.wav                     lay SFX on a timeline, then --audio sfx.wav

Voice / VO (mgp voice --help for every option):
  mgp voice template [--language id|en]                ~30 s reading text that starts with the consent sentence
  mgp voice inspect recording.wav                      recording quality + consent sentence
  mgp voice clone recording.wav --name <profile>       local voice profile (Chatterbox, MIT)
  mgp voice speak script.txt --profile <profile> -o vo.wav [--emotion warm] [--speed 1.0]
  mgp voice elevenlabs script.txt --voice <id> -o vo.wav   (env ELEVENLABS_API_KEY)
  mgp voice list | score | remove

Free still images (mgp image --help):
  mgp image "<prompt>" -o out.png [--source auto|free-cloud|local|higgsfield] [--provider hf|cloudflare|pollinations]
            [--reference a.png] [--aspect 21:9] [--seed 7] [--magenta] [--cutout]
  mgp image kit "<character>" -o kit/ [--style paper]   parts sheet -> cutout -> slice -> kit.json (pivots)
  mgp image plate "<place>" -o plate.png [--aspect 9:16]  |  mgp image slice | download | providers

Common options:
  --fps <n>          render fps (default: data-fps / window.__fps / 30)
  --duration <s>     force a duration when the composition does not declare one
  --size WxH         output size (scaled; a different aspect ratio is letterboxed)
  --viewport WxH     page layout size (default: data-width/height or window.__size)
  --scale <n>        deviceScaleFactor while capturing (2 = capture 2x sharper)
  --root <folder>    server root (default: the composition folder)
  --browser <path>   Chrome/Edge path (or env MGP_BROWSER)
  --native-gsap      serve real GSAP from node_modules/gsap (if you installed it) instead of mgp.motion
  --capture-format png|jpeg   intermediate capture format (jpeg is faster, slightly lossy)
  --workers <n>      pages in parallel; the frame range is split, then joined
  --encoder <kind>   MP4 encoder: cpu (libx264, default) | auto | nvenc | qsv | amf | videotoolbox
                     (env MGP_ENCODER; hardware is tested first, failure -> libx264)
  --audio f[@s]      extra audio track with an offset (repeatable)
  --no-audio         leave the audio out
  --captions <json>  burn captions from timed words [{text,start,end}]
                     (--captions-size 64 --captions-font ... --captions-color #FFD43B --captions-bottom 22 --captions-words 4)
  --python <path>    Python for cutout/transcribe (or env MGP_PYTHON)
  --hash             print the sha1 of every frame (determinism test)
  --json             result as JSON
  --quiet            no progress log (errors and warnings are still printed)
  --ignore-errors    render even when the page has script errors (default: the render fails)
  --timeout <s>      time limit per page step (ready, one seek, one screenshot); default ready 300 s, seek 120 s,
                     0 = none (env MGP_TIMEOUT). A stuck page fails with a clear error instead of hanging
  Negative values may be written apart: --lufs -18 --tp -1.5 (same as --lufs=-18)

Messages are in English; set MGP_LANG=id for Indonesian (automatic when LANG/LC_ALL starts with "id").
Old Indonesian names still work (rekam, cek, --teks, ...): mgp translates them and prints a short note.
`;

const S = { type: "string" }, B = { type: "boolean" };
const opts = {
  o: { type: "string", short: "o" }, out: S,
  fps: S, size: S, viewport: S, from: S, to: S, scale: S, duration: S,
  workers: { type: "string", short: "w" }, audio: { type: "string", multiple: true }, "no-audio": B,
  captions: S, "captions-size": S, "captions-font": S, "captions-color": S, "captions-bottom": S, "captions-words": S,
  format: S, crf: S, preset: S, encoder: S, "capture-format": S, transparent: B, root: S, browser: S, "native-gsap": B,
  t: S, n: S, cols: S, width: S, port: S, open: B, json: B, hash: B, quiet: B, wait: S,
  help: { type: "boolean", short: "h" }, version: { type: "boolean", short: "v" },
  // variables
  var: { type: "string", multiple: true }, vars: S, variables: S, "variables-file": S, "strict-variables": B,
  // check
  samples: S, tolerance: S,
  // curves
  max: S, selector: S,
  // contact: seconds or "poses" (project.json)
  times: S,
  // media
  look: S, lut: S, strength: S, effect: S, color: S, level: S, target: S, force: B, "no-texture": B,
  lufs: S, podcast: B, tp: S, lra: S, ar: S, linear: B,
  model: S, "model-file": S, "plate-out": S, key: S, similarity: S, quality: S, matting: B, python: S,
  "no-despill": B, despill: S, // cutout: key-colour despill (on by default; --despill <colour> for a model cutout)
  language: S, "fix-with": S, script: S, reuse: S, engine: S, prompt: S, device: S,
  // blocks (add, catalog)
  into: S, prop: { type: "string", multiple: true }, start: S, track: S, container: S, "dry-run": B, search: S, category: S,
  // studio
  "out-dir": S,
  // lottie
  mode: S, interpolation: S, precision: S,
  // render: keep rendering despite script errors
  "ignore-errors": B,
  // capture commands: time limit per page step in seconds (ready / one seek / one screenshot); env MGP_TIMEOUT
  timeout: S,
};

/** Node parseArgs rejects "--lufs -18" (value starts with "-"): join into "--lufs=-18". Boolean options are skipped. */
function joinNegative(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i], b = args[i + 1];
    const m = /^--([A-Za-z][\w-]*)$/.exec(a);
    if (m && b !== undefined && /^-(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(b) && !(opts[m[1]] && opts[m[1]].type === "boolean")) { out.push(a + "=" + b); i++; continue; }
    out.push(a);
  }
  return out;
}

const isLottie = (f) => typeof f === "string" && /\.(json|lottie)$/i.test(f);

async function main() {
  const argv = joinNegative(translateArgv(process.argv.slice(2)));
  process.argv.splice(2, process.argv.length - 2, ...argv);
  const old = oldNamesUsed();
  if (old.length && !argv.includes("--quiet") && !argv.includes("--json")) process.stderr.write(L`mgp: old names translated: ${old.join(", ")}` + "\n");
  const first = argv.find((x) => !x.startsWith("-"));
  const rest = argv.slice(argv.indexOf(first) + 1);
  if (first === "new") return (await import("../src/new.mjs")).cli(rest);
  if (first === "install") return (await import("../src/install.mjs")).cli(rest);
  if (first === "image") return (await import("../src/image.mjs")).cli(rest);
  if (first === "sfx") return (await import("../src/sfx.mjs")).cli(rest);
  if (first === "voice") return (await import("../src/voice.mjs")).cli(rest);
  if (first === "align") return (await import("../src/align.mjs")).cli(rest);
  if (first === "audit") return (await import("../src/audit.mjs")).cli(rest);
  let parsed;
  try { parsed = parseArgs({ args: argv, options: opts, allowPositionals: true }); }
  catch (e) { console.error("mgp: " + e.message + "\n\n" + help()); process.exit(2); }
  const { values: o, positionals: pos } = parsed;
  const [c, comp] = pos;
  if (o.version) { console.log(VERSION); return; }
  if (!c || o.help || c === "help") { console.log(help()); return; }
  if (o.wait) o.wait = +o.wait;
  if (o["native-gsap"]) process.env.MGP_NATIVE_GSAP = "1"; // use node_modules/gsap (when installed) instead of mgp.motion
  const print = (r) => { if (o.json) console.log(JSON.stringify(r, null, 2)); };

  if (c === "check" && isLottie(comp)) {
    const { lottieCli } = await import("../src/lottie.mjs");
    await lottieCli(["check", comp], o);
  } else if (c === "check") {
    const { check, printCheck } = await import("../src/check.mjs");
    const h = await check(comp, o);
    console.log(o.json ? JSON.stringify(h, null, 2) : printCheck(h));
    process.exitCode = h.ok ? 0 : 1;
  } else if ((c === "render" || c === "frame") && isLottie(comp)) {
    const { lottieCli } = await import("../src/lottie.mjs");
    await lottieCli([c, comp], o);
  } else if (c === "render") {
    const { render } = await import("../src/render.mjs");
    const r = await render(comp, o);
    if (o.hash) for (let i = 0; i < r.hashes.length; i++) console.log(i + "\t" + r.hashes[i]);
    if (o.json) console.log(JSON.stringify({ out: r.out, frames: r.frames, fps: r.fps, from: r.from, to: r.to, seconds: r.seconds, driver: r.info.driver, encoder: r.encoder, variables: r.info.variables && r.info.variables.values }));
  } else if (c === "doctor") {
    const { doctor, printDoctor } = await import("../src/doctor.mjs");
    const h = await doctor(o);
    console.log(o.json ? JSON.stringify(h, null, 2) : printDoctor(h));
  } else if (c === "frame") {
    const { frame } = await import("../src/render.mjs");
    await frame(comp, o);
  } else if (c === "curves") {
    const { curves, printCurves } = await import("../src/curves.mjs");
    const h = await curves(comp, o);
    console.log(o.json ? JSON.stringify(h, null, 2) : printCurves(h));
  } else if (c === "contact") {
    const { contact } = await import("../src/contact-sheet.mjs");
    await contact(comp, o);
  } else if (c === "preview") {
    const { preview } = await import("../src/preview.mjs");
    await preview(comp, o);
  } else if (c === "studio") {
    const { studio } = await import("../src/studio.mjs");
    await studio(comp, o);
  } else if (c === "export" || c === "play") {
    const { lottieCli } = await import("../src/lottie.mjs");
    if (c === "export" && o.format && o.format !== "lottie") { console.error(L`mgp export: unknown --format "${o.format}" (supported: lottie)`); process.exitCode = 2; return; }
    await lottieCli([c, ...pos.slice(1)], o);
  } else if (c === "media" || c === "grade") {
    const m = await import("../src/media.mjs");
    const sub = c === "grade" ? "look" : pos[1];
    const inp = c === "grade" ? pos[1] : pos[2];
    if (sub === "list") {
      if (o.json) return print({ looks: m.LOOKS, effects: m.EFFECTS });
      console.log(L`Looks (mgp media look --look <name>; the old Indonesian names work too):`);
      for (const [k, v] of Object.entries(m.LOOKS)) console.log(`  ${v.en.padEnd(13)} ${("(" + k + ")").padEnd(14)} ${m.lookHint(k)}`);
      console.log("\n" + L`Effects (mgp media effects --effect <name>[,<name>]):`);
      for (const k of Object.keys(m.EFFECTS)) console.log(`  ${k.padEnd(11)} ${m.effectHint(k)}`);
    } else if (sub === "look") print(await m.look(inp, o));
    else if (sub === "brighten") print(await m.brighten(inp, o));
    else if (sub === "effects") print(await m.effects(inp, o));
    else if (sub === "compare") print(await m.compare(inp, o));
    else if (sub === "lut") print(await m.exportLut(inp, o));
    else { console.error(L`mgp media: unknown subcommand "${sub || ""}" (list, look, brighten, effects, compare, lut)`); process.exitCode = 2; }
  } else if (c === "audio" || c === "normalize-audio") {
    const m = await import("../src/media.mjs");
    const sub = c === "normalize-audio" ? "normalize" : pos[1];
    const inp = c === "normalize-audio" ? pos[1] : pos[2];
    if (sub === "normalize") print(await m.audioNormalize(inp, o));
    else if (sub === "measure") print(await m.audioMeasure(inp, o));
    else { console.error(L`mgp audio: unknown subcommand "${sub || ""}" (normalize, measure)`); process.exitCode = 2; }
  } else if (c === "cutout") {
    const { cutout } = await import("../src/cutout.mjs");
    print(await cutout(comp, o));
  } else if (c === "transcribe") {
    const { transcribe } = await import("../src/transcript.mjs");
    print(await transcribe(comp, o));
  } else if (c === "add") {
    const { add, printAdd } = await import("../src/add.mjs");
    const r = add(pos.slice(1), o);
    console.log(o.json ? JSON.stringify(r, null, 2) : printAdd(r));
  } else if (c === "catalog") {
    const { catalog } = await import("../src/add.mjs");
    if (comp && !o.search) o.search = pos.slice(1).join(" ");
    console.log(catalog(o));
  } else if (c === "lottie") {
    const { lottieCli } = await import("../src/lottie.mjs");
    await lottieCli(pos.slice(1), o);
  } else {
    console.error(L`mgp: unknown command "${c}"` + "\n\n" + help());
    process.exitCode = 2;
  }
}

main().catch((e) => { console.error("mgp: " + (e && e.message || e)); process.exitCode = 1; });
