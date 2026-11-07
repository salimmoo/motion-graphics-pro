// mgp cutout: remove the background of an image or video into alpha.
//   model : rembg (MIT, U2-Net) through Python, per frame for video
//   key   : colour key without a model (--key magenta | --key green | --key #00ff00)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FFMPEG } from "./ffmpeg.mjs";
import { probeMedia } from "./media.mjs";
import { findPython, runPy } from "./python.mjs";
import { L } from "./i18n.mjs";

const PY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "py");

const INSTALL = () => L`rembg is not installed in any Python that was found (install.json cutout venv, MGP_PYTHON, render/.venv, PATH).
Install it once (own small venv, locked packages + the U2-Net model with sha256, CPU, ~0.6 GB):
  mgp install cutout              (progress: mgp install cutout --status)
Already have a venv with rembg (e.g. made by hand)? Register it: mgp install cutout --adopt
  (found automatically in ~/vrb; any other venv: --python <path> or env MGP_PYTHON).
Without a model, for assets on a flat colour background: --key magenta (background #FF00FF) or --key #00ff00.`;

function ff(args) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let e = ""; p.stderr.on("data", (d) => (e += d));
    p.on("error", rej); p.on("close", (c) => (c === 0 ? res() : rej(new Error(L`ffmpeg failed: ${e.trim()}`))));
  });
}

const quiet = (o) => !!(o.quiet || o.diam);
const say = (o, s) => { if (!quiet(o)) process.stderr.write(s + "\n"); };

/** py/cutout.py mode for a single image: "image" when the script declares it, else the old "gambar". */
function pyImageMode() {
  try { return /choices=\[[^\]]*["']image["']/.test(fs.readFileSync(path.join(PY_DIR, "cutout.py"), "utf8")) ? "image" : "gambar"; } catch { return "image"; }
}

/** Alpha encoder arguments for the output extension. */
function alphaEncode(out, o) {
  const ext = path.extname(out).toLowerCase();
  if (ext === ".mov") return ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"];
  if (ext === ".webm") {
    const crf = { cepat: 30, fast: 30, seimbang: 18, balanced: 18, terbaik: 12, best: 12 }[o.quality || "balanced"] ?? 18;
    return ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", String(crf), "-b:v", "0", "-auto-alt-ref", "0", "-row-mt", "1"];
  }
  throw new Error(L`Video output with alpha must be .webm (VP9 alpha) or .mov (ProRes 4444), not ${ext}`);
}

function audioArgs(out, info, o) {
  if (!info.hasAudio || o["no-audio"]) return ["-an"];
  return path.extname(out).toLowerCase() === ".mov" ? ["-map", "1:a", "-c:a", "pcm_s16le"] : ["-map", "1:a", "-c:a", "libopus", "-b:a", "160k"];
}

function parseKey(k) {
  const s = String(k).toLowerCase();
  if (s === "magenta") return { magenta: true, hex: "FF00FF" };
  if (s === "hijau" || s === "green") return { hex: "00FF00", despill: "green" };
  if (s === "biru" || s === "blue") return { hex: "0000FF", despill: "blue" };
  const m = /^#?([0-9a-f]{6})$/.exec(s);
  if (!m) throw new Error(L`--key must be magenta, green, blue or a colour #rrggbb, not "${k}"`);
  const h = m[1].toUpperCase();
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return { hex: h, despill: g > r && g > b ? "green" : b > r && b > g ? "blue" : null };
}

export async function cutout(inp, o) {
  if (!inp) throw new Error(L`Name a file: mgp cutout person.png -o cutout.png  |  mgp cutout clip.mp4 -o cutout.webm`);
  inp = path.resolve(inp);
  const info = probeMedia(inp);
  const ext = path.extname(inp);
  const out = path.resolve(o.o || o.out || path.join(path.dirname(inp), path.basename(inp, ext) + (info.image ? "_cutout.png" : "_cutout.webm")));
  if (info.image && path.extname(out).toLowerCase() !== ".png") throw new Error(L`Image output with alpha must be .png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const plate = o["plate-out"];
  const model = o.model || "u2net";
  const key = o.key ? parseKey(o.key) : null;
  const t0 = Date.now();
  const py$ = { ...o, quiet: quiet(o), diam: quiet(o) };

  // colour key: magenta uses the magenta-key logic (Python numpy) when available, else ffmpeg
  if (key) {
    const py = key.magenta ? findPython("numpy, PIL", o.python) : null;
    if (key.magenta && py) {
      const ds = o["no-despill"] || o.noDespill ? ["--no-despill"] : [];   // despill of the magenta tint along the edge: on by default
      if (info.image) { await runPy(py, "cutout.py", ["magenta", inp, out, ...ds], py$); }
      else await perFrame(inp, out, info, o, (a, b) => runPy(py, "cutout.py", ["magenta", a, b, ...ds], py$));
      say(o, L`cutout (magenta key, numpy) -> ${out}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      return { out, method: "key-magenta" };
    }
    const sim = o.similarity != null ? +o.similarity : key.magenta ? 0.3 : 0.12;
    const vf = key.magenta ? `format=rgba,colorkey=0x${key.hex}:${sim}:0.15` : `format=yuva444p,chromakey=0x${key.hex}:${sim}:0.08${key.despill && !(o["no-despill"] || o.noDespill) ? ",despill=type=" + key.despill : ""}`;
    if (info.image) await ff(["-i", inp, "-vf", vf + ",format=rgba", "-frames:v", "1", out]);
    else await ff(["-i", inp, "-i", inp, "-map", "0:v", "-vf", vf, ...alphaEncode(out, o), ...audioArgs(out, info, o), out]);
    say(o, L`cutout (key ${key.hex}, ffmpeg) -> ${out}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    return { out, method: "key-ffmpeg" };
  }

  const py = findPython("rembg", o.python);
  if (!py) throw new Error(INSTALL());
  say(o, L`cutout: model ${model} (rembg, ${py.exe})`);
  if (info.image) {
    await runPy(py, "cutout.py", [pyImageMode(), inp, out, "--model", model, ...(plate ? ["--plate", path.resolve(plate)] : []), ...(o.matting ? ["--matting"] : [])], py$);
  } else {
    await perFrame(inp, out, info, o, (a, b, pl) => runPy(py, "cutout.py", ["folder", a, b, "--model", model, ...(pl ? ["--plate", pl] : []), ...(o.matting ? ["--matting"] : [])], py$)
      .then(() => (o.despill ? runPy(py, "cutout.py", ["despill", b, b, "--key-color", String(o.despill)], py$) : null)), plate && path.resolve(plate));
  }
  // model cutout of a subject shot on a coloured screen: --despill green|magenta|#rrggbb takes that tint out along the edge
  if (o.despill && info.image) await runPy(py, "cutout.py", ["despill", out, out, "--key-color", String(o.despill)], py$);
  const secs = (Date.now() - t0) / 1000;
  say(o, L`done: ${out}${plate ? " + " + path.resolve(plate) : ""}  (${secs.toFixed(1)} s)`);
  return { out, plate: plate ? path.resolve(plate) : null, method: "rembg:" + model, seconds: secs };
}

/** Video: split into PNGs, process the folder, rebuild with alpha (+ source audio). */
async function perFrame(inp, out, info, o, processDir, plateOut) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-cutout-"));
  try {
    const a = path.join(tmp, "in"), b = path.join(tmp, "out"), pl = plateOut ? path.join(tmp, "plate") : null;
    fs.mkdirSync(a);
    const range = [];
    if (o.from != null) range.push("-ss", String(o.from));
    if (o.to != null) range.push("-to", String(o.to));
    await ff([...range, "-i", inp, "-fps_mode", "passthrough", "-pix_fmt", "rgb24", path.join(a, "f_%06d.png")]);
    const n = fs.readdirSync(a).length;
    say(o, "  " + L`${n} frames @ ${info.fps} fps`);
    await processDir(a, b, pl);
    const enc = async (dir, dst) => ff(["-framerate", info.fps || "30", "-i", path.join(dir, "f_%06d.png"), ...range, "-i", inp, "-map", "0:v", ...alphaEncode(dst, o), ...audioArgs(dst, info, o), "-shortest", dst]);
    await enc(b, out);
    if (pl) { fs.mkdirSync(path.dirname(plateOut), { recursive: true }); await enc(pl, plateOut); }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/** Old name (v2.3 / v2.4-dev). */
export { cutout as potongLatar };
