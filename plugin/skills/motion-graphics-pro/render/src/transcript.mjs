// mgp transcribe: audio/video -> timing per word [{id,text,start,end}].
// Engines: faster-whisper (Python, MIT) when installed, then whisper.cpp (whisper-cli) on PATH.
// --fix-with script.txt aligns the result to the script (script spelling, audio timing).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { FFMPEG } from "./ffmpeg.mjs";
import { fileURLToPath } from "node:url";
import { findPython, runPy } from "./python.mjs";
import { fixToScript } from "./clean.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

const PY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "py");
const quiet = (o) => !!(o.quiet || o.diam);
const say = (o, s) => { if (!quiet(o)) process.stderr.write(s + "\n"); };

const INSTALL = () => L`No transcription engine found.
Pick one:
  1. faster-whisper (Python, MIT):  python -m pip install faster-whisper
     (the venv in render/.venv is used automatically; another venv: --python <path> or env MGP_PYTHON)
  2. whisper.cpp: put whisper-cli on PATH (or env MGP_WHISPER_CPP) and download a ggml model,
     e.g. ggml-small.bin, then pass --model-file <path> or env MGP_WHISPER_MODEL.
.en models (small.en etc.) translate other languages into English; for Indonesian use --model small --language id.`;

function ff(args) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let e = ""; p.stderr.on("data", (d) => (e += d));
    p.on("error", rej); p.on("close", (c) => (c === 0 ? res() : rej(new Error(L`ffmpeg failed: ${e.trim()}`))));
  });
}

function findWhisperCpp() {
  const names = [env("MGP_WHISPER_CPP"), "whisper-cli", "whisper-cpp", "whisper-cli.exe"].filter(Boolean);
  for (const n of names) {
    const r = spawnSync(n, ["--help"], { encoding: "utf8", timeout: 20000 });
    if (!r.error && /whisper|--model/i.test((r.stdout || "") + (r.stderr || ""))) return n;
  }
  return null;
}

function findGgml(model, explicit) {
  const c = [explicit, env("MGP_WHISPER_MODEL")];
  const name = `ggml-${model}.bin`;
  for (const d of [process.cwd(), path.join(process.cwd(), "models"), path.join(os.homedir(), ".cache", "whisper.cpp"), path.join(os.homedir(), ".cache", "whisper"), path.join(os.homedir(), "whisper.cpp", "models")]) c.push(path.join(d, name));
  return c.find((f) => f && fs.existsSync(f)) || null;
}

async function viaWhisperCpp(bin, wav, o, tmp) {
  const model = o.model || "small";
  const mf = findGgml(model, o["model-file"]);
  if (!mf) throw new Error(L`whisper.cpp found (${bin}) but not the model ggml-${model}.bin. Pass --model-file <path> or env MGP_WHISPER_MODEL.`);
  const base = path.join(tmp, "wcpp");
  await new Promise((res, rej) => {
    const p = spawn(bin, ["-m", mf, "-f", wav, "-l", o.language || "auto", "-ml", "1", "-sow", "-oj", "-of", base, "-np"], { stdio: ["ignore", "ignore", "pipe"] });
    let e = ""; p.stderr.on("data", (d) => (e += d));
    p.on("error", rej); p.on("close", (c) => (c === 0 ? res() : rej(new Error(L`whisper.cpp failed: ${e.trim().split("\n").slice(-4).join("\n")}`))));
  });
  const j = JSON.parse(fs.readFileSync(base + ".json", "utf8"));
  const words = (j.transcription || []).map((s) => ({ text: String(s.text || "").trim(), start: (s.offsets ? s.offsets.from : 0) / 1000, end: (s.offsets ? s.offsets.to : 0) / 1000 }))
    .filter((w) => w.text && !/^\[.*\]$/.test(w.text));
  return { engine: "whisper.cpp", language: (j.result && j.result.language) || o.language || null, words };
}

function readText(v) {
  if (!v) return null;
  if (fs.existsSync(v)) return fs.readFileSync(v, "utf8");
  return String(v);
}

function readWords(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const arr = Array.isArray(j) ? j : j.words || j.kata || (j.segments || []).flatMap((s) => s.words || []);
  return arr.map((w) => ({ text: String(w.text ?? w.word ?? "").trim(), start: +(w.start ?? w.t0), end: +(w.end ?? w.t1) })).filter((w) => w.text && Number.isFinite(w.start));
}

/** py/transcribe.py flags: the English names when the script declares them, else the old Indonesian ones. */
function pyFlags() {
  let src = "";
  try { src = fs.readFileSync(path.join(PY_DIR, "transcribe.py"), "utf8"); } catch { /* missing: runPy reports it */ }
  return { language: src.includes('"--language"') ? "--language" : "--bahasa", device: src.includes('"--device"') ? "--device" : "--perangkat" };
}

export async function transcribe(inp, o) {
  const out = path.resolve(o.o || o.out || "words.json");
  let res;
  if (o.reuse) {
    // only fix an existing transcript
    res = { engine: "file", language: null, words: readWords(path.resolve(o.reuse)) };
  } else {
    if (!inp) throw new Error(L`Name a file: mgp transcribe voice.wav -o words.json --language id [--model small] [--fix-with script.txt]`);
    inp = path.resolve(inp);
    if (!fs.existsSync(inp)) throw new Error(L`file not found: ${inp}`);
    if (o.model && /\.en$/.test(o.model) && o.language && o.language !== "en") say(o, L`warning: model ${o.model} is English only and translates other languages; use --model ${o.model.replace(/\.en$/, "")}`);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-transcribe-"));
    try {
      const wav = path.join(tmp, "voice16k.wav");
      const range = [...(o.from != null ? ["-ss", String(o.from)] : []), ...(o.to != null ? ["-to", String(o.to)] : [])];
      await ff([...range, "-i", inp, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
      const pick = o.engine || "auto";
      const py = pick === "whisper.cpp" ? null : findPython("faster_whisper", o.python);
      if (py) {
        say(o, L`transcribe: faster-whisper, model ${o.model || "small"}${o.language ? L`, language ${o.language}` : L`, language auto`} (${py.exe})`);
        const F = pyFlags();
        const args = [wav, "--model", o.model || "small", ...(o.language ? [F.language, o.language] : []), ...(o.prompt ? ["--prompt", o.prompt] : []), ...(o.device ? [F.device, o.device] : [])];
        const j = JSON.parse((await runPy(py, "transcribe.py", args, { ...o, quiet: quiet(o), diam: quiet(o) })).trim().split("\n").pop());
        res = { engine: "faster-whisper", language: j.language ?? j.bahasa, words: j.words || j.kata };
      } else {
        const bin = pick === "faster-whisper" ? null : findWhisperCpp();
        if (!bin) throw new Error(INSTALL());
        say(o, L`transcribe: whisper.cpp (${bin}), model ${o.model || "small"}`);
        res = await viaWhisperCpp(bin, wav, o, tmp);
      }
      const off = o.from != null ? +o.from : 0;
      if (off) for (const w of res.words) { w.start += off; w.end += off; }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  let words = res.words.map((w, i) => ({ id: "w" + i, text: w.text, start: +(+w.start).toFixed(3), end: +(+w.end).toFixed(3), ...(w.p != null ? { p: w.p } : {}) }));
  let stat = null;
  const script = readText(o["fix-with"] || o.script);
  if (script) {
    const r = fixToScript(words, script);
    words = r.words; stat = r.stats;
    say(o, L`fix to script: ${stat.script} script words, ${stat.asr} ASR words; match ${stat.match}, respelled ${stat.respelled}, merged ${stat.merged}, split ${stat.split}, inserted ${stat.inserted}, dropped ${stat.dropped}`);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, "[\n" + words.map((w) => "  " + JSON.stringify(w)).join(",\n") + "\n]\n");
  say(o, L`${words.length} words -> ${out}` + (res.language ? "  " + L`(language ${res.language})` : ""));
  return { out, engine: res.engine, language: res.language, count: words.length, fixed: stat };
}

/** Old name (v2.3 / v2.4-dev). */
export { transcribe as transkrip };
