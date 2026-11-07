// mgp sfx: procedural sound effects (lib/sfx/sfx.js, pure JS DSP) -> 48 kHz WAV, no browser.
//   mgp sfx list [--json]
//   mgp sfx <preset> [--duration 1] [--seed 1] [--param k=v ...] [--gain -3] [--pan 0] [--bit 16|24|32] -o out.wav
//   mgp sfx mix cues.json -o sfx.wav [--duration 12] [--peak -1]
//   mgp sfx proof -o folder [--preset a,b]   WAV + spectrogram PNG + loudness per preset
// Old names still work: daftar/campur/bukti, Indonesian preset and parameter names, cues.json "durasi".
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import { FFMPEG } from "./ffmpeg.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";
import { motionLib } from "./location.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));

export function loadSfx() {
  const lib = motionLib("sfx/sfx.js");
  const cand = [env("MGP_SFX_LIB"), path.resolve(HERE, "../../../motion-graphics/lib/sfx/sfx.js"), path.resolve(HERE, "../lib/sfx/sfx.js"), lib && path.join(lib, "sfx", "sfx.js")].filter(Boolean);
  for (const f of cand) if (fs.existsSync(f)) return require(f);
  throw new Error(L`lib/sfx/sfx.js not found. Set env MGP_SFX_LIB to the path of motion-graphics/lib/sfx/sfx.js`);
}

const help = () => L`mgp sfx: procedural, deterministic (seed) sound effects, 48 kHz WAV
  mgp sfx list [--json]                         presets and their parameters
  mgp sfx <preset> -o out.wav [--duration 0.8] [--seed 1] [--param k=v ...] [--gain -3] [--pan -0.5] [--bit 16|24|32]
  mgp sfx mix cues.json -o sfx.wav [--duration 12] [--peak -1]
        cues.json: [{"t": 1.2, "sfx": "whoosh", "seed": 2, "duration": 0.7, "gain": -6, "pan": 0.3, "param": {"to": 3000}}]
        or {"duration": 12, "cues": [...]}; then: mgp render index.html --audio sfx.wav -o out.mp4
  mgp sfx proof -o folder [--preset whoosh,pop]   WAV + spectrogram PNG + loudness (EBU R128) per preset
Old Indonesian preset/parameter names still work (ketik = type, --param ke=... = to=...).`;

const say = (o, s) => { if (!o.quiet) process.stderr.write(s + "\n"); };

function readParams(list) {
  const p = {};
  for (const kv of list || []) {
    const i = kv.indexOf("="); if (i < 1) throw new Error(L`--param must look like key=value (got: "${kv}")`);
    const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim(); p[k] = v !== "" && !isNaN(+v) ? +v : v;
  }
  return p;
}

/** Internal (Indonesian) parameter names of a synth result -> English names. */
function enParams(S, key, param) {
  const inv = {};
  for (const [en, k] of Object.entries((S.paramNames || {})[key] || {})) inv[k] = en;
  const out = {};
  for (const [k, v] of Object.entries(param || {})) out[inv[k] || k] = v;
  return out;
}

function write(S, sound, out, o) {
  out = path.resolve(out); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, S.wav(sound, { bit: o.bit ? +o.bit : 16 }));
  return out;
}

export function measureLoudness(file) {
  // short sounds (< 0.4 s) get a silent tail so there is one 400 ms measuring block; silence itself is gated
  const r = spawnSync(FFMPEG, ["-hide_banner", "-nostats", "-i", file, "-af", "apad=pad_dur=0.5,ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const e = (r.stderr || "").split("Summary:").pop();
  const num = (re) => { const m = e.match(re); return m ? +m[1] : null; };
  return { lufs: num(/I:\s+(-?[\d.]+|-inf) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), peak_dbtp: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

export function spectrogram(file, png) {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-lavfi", `showspectrumpic=s=1024x384:legend=1:scale=log:color=intensity:fscale=log:stop=20000`, png], { encoding: "utf8" });
  if (r.status !== 0) { // old ffmpeg without fscale/stop
    const r2 = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-lavfi", `showspectrumpic=s=1024x384:legend=1:scale=log`, png], { encoding: "utf8" });
    if (r2.status !== 0) throw new Error(L`ffmpeg showspectrumpic failed: ` + (r2.stderr || r.stderr));
  }
  return png;
}

export async function cli(argv) {
  let a;
  try {
    a = parseArgs({ args: argv, allowPositionals: true, options: {
      o: { type: "string", short: "o" }, out: { type: "string" }, duration: { type: "string" }, seed: { type: "string" },
      param: { type: "string", multiple: true }, gain: { type: "string" }, pan: { type: "string" }, bit: { type: "string" },
      peak: { type: "string" }, preset: { type: "string" }, json: { type: "boolean" }, quiet: { type: "boolean" }, help: { type: "boolean", short: "h" } } });
  } catch (e) { console.error("mgp sfx: " + e.message + "\n\n" + help()); process.exitCode = 2; return; }
  const { values: o, positionals: pos } = a; const sub = pos[0];
  if (!sub || o.help || sub === "bantuan" || sub === "help") { console.log(help()); return; }
  const S = loadSfx(), out = o.o || o.out;
  const list = () => (S.list || S.daftar)();
  const synth = (...x) => (S.synth || S.buat)(...x);

  if (sub === "list" || sub === "daftar") {
    const d = list();
    if (o.json) { console.log(JSON.stringify(d.map((p) => ({ name: p.name, aliases: p.aliases, hint: p.hint, duration: p.duration, params: p.params })), null, 2)); return; }
    for (const p of d) {
      console.log(`${p.name.padEnd(14)} ${String(p.duration + " s").padEnd(7)} ${p.hint}${p.aliases.length ? L`  (old names / aliases: ${p.aliases.join(", ")})` : ""}`);
      for (const [k, [v, hint]] of Object.entries(p.params)) console.log(`    --param ${(k + "=" + v).padEnd(16)} ${hint}`);
    }
    console.log("\n" + L`Every preset: --duration, --seed (another sound that stays the same every time), --gain dB, --pan -1..1.`);
    return;
  }

  if (sub === "mix" || sub === "campur") {
    const f = pos[1]; if (!f) throw new Error(L`Name a cue file: mgp sfx mix cues.json -o sfx.wav`);
    const cues = JSON.parse(fs.readFileSync(path.resolve(f), "utf8")); // MGP.sfx.mix reads "duration" and the old "durasi"
    const b = (S.mix || S.campur)(cues, { duration: o.duration ? +o.duration : undefined, peak: o.peak != null ? +o.peak : undefined });
    const dur = b.duration ?? b.durasi;
    const file = write(S, b, out || "sfx.wav", o);
    say(o, L`${b.cues} cues, ${dur.toFixed(2)} s → ${file}` + "\n" + L`mux into the video: mgp render index.html --audio ${path.basename(file)} -o out.mp4`);
    if (o.json) console.log(JSON.stringify({ out: file, cues: b.cues, duration: dur }));
    return;
  }

  if (sub === "proof" || sub === "bukti") {
    const dir = path.resolve(out || "sfx-proof"); fs.mkdirSync(dir, { recursive: true });
    const names = o.preset ? o.preset.split(",").map((s) => s.trim()) : list().map((p) => p.name), results = [];
    for (const name of names) {
      const b = synth(name, { seed: o.seed ? +o.seed : 1 });
      const nm = b.name || name, dur = b.duration ?? b.durasi;
      const wav = write(S, b, path.join(dir, nm + ".wav"), o), png = spectrogram(wav, path.join(dir, nm + ".png"));
      const Ld = measureLoudness(wav); let pk = 0, ss = 0, nn = 0; for (const X of b.ch) for (const v of X) { pk = Math.max(pk, Math.abs(v)); ss += v * v; nn++; }
      const rms = +(10 * Math.log10(ss / nn || 1e-12)).toFixed(1);
      results.push({ preset: nm, duration: +dur.toFixed(3), lufs: Ld.lufs, lra: Ld.lra, peak_dbtp: Ld.peak_dbtp, sample_peak_dbfs: +(20 * Math.log10(pk || 1e-9)).toFixed(2), rms_dbfs: rms, wav: path.basename(wav), spectrogram: path.basename(png) });
      say(o, L`${nm.padEnd(14)} ${dur.toFixed(2)} s  ${String(Ld.lufs).padStart(6)} LUFS  peak ${Ld.peak_dbtp} dBTP  RMS ${rms} dBFS`);
    }
    fs.writeFileSync(path.join(dir, "loudness.json"), JSON.stringify(results, null, 2));
    if (o.json) console.log(JSON.stringify(results, null, 2));
    return;
  }

  // one preset (English or old Indonesian name; parameters in English or Indonesian)
  const param = readParams(o.param);
  const b = synth(sub, Object.assign({}, param, { duration: o.duration ? +o.duration : undefined, seed: o.seed ? +o.seed : 1, gain: o.gain ? +o.gain : 0, pan: o.pan ? +o.pan : 0 }));
  const nm = b.name || b.nama, dur = b.duration ?? b.durasi, prm = enParams(S, b.nama, b.param);
  const file = write(S, b, out || `${nm}.wav`, o);
  say(o, L`${nm} (seed ${b.seed}, ${dur.toFixed(2)} s, ${JSON.stringify(prm)}) → ${file}`);
  if (o.json) console.log(JSON.stringify({ out: file, preset: nm, duration: dur, seed: b.seed, param: prm }));
}

// Old names (v2.3 / v2.4-dev).
export const muatSfx = loadSfx, ukurLoudness = measureLoudness, spektrogram = spectrogram;
