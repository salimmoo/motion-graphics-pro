// mgp voice (old: rekam suara): narration (VO) from a script with the user's own voice, or through ElevenLabs.
//   mgp voice template [--language id|en] [--name Budi] [-o reading.txt]
//   mgp voice inspect recording.wav [--language id|en] [--name Budi]       quality + consent sentence
//   mgp voice clone recording.wav --name <profile> [--engine chatterbox|openvoice]
//   mgp voice speak script.txt --profile <name> -o vo.wav [--language id] [--emotion neutral|warm|energetic|calm] [--speed 1.0]
//        [--sentence 3 [--seed N] | --tries 5] [--pronounce "Claude=Klod"] [--dry-run]   one part per sentence in vo.parts/
//   mgp voice elevenlabs script.txt --voice <id> -o vo.wav [--model eleven_multilingual_v2]
//   mgp voice score vo.wav --profile <name> --script script.txt   raw + normalised WER/CER, CHECK BY EAR, similarity
//   mgp voice list | mgp voice remove <profile>
// The models run in Python (py/voice_engine.py); ffmpeg cleans the audio, src/align.mjs gives word/syllable/letter times.
// Old names still read: profil.json, referensi.wav, lafal.txt, vo.bagian/bagian.json (calon/), vo.kata.json, vo.huruf.json,
// the folder suara/ (now voice/) and the Indonesian emotion names (netral, hangat, semangat, tenang).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { FFMPEG } from "./ffmpeg.mjs";
import { home as mgpHome } from "./location.mjs";
import { findPython, runPy } from "./python.mjs";
import { probeMedia, measureLoudness, audioNormalize } from "./media.mjs";
import { align, prepareScript, syllablesId, syllablesEn, scriptTokens } from "./align.mjs";
import { env } from "./names.mjs";
import { L, t } from "./i18n.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, "../..");
/** voice/ folder of the skill (old name suara/). */
const VOICE_DIR = fs.existsSync(path.join(SKILL, "voice")) || !fs.existsSync(path.join(SKILL, "suara")) ? path.join(SKILL, "voice") : path.join(SKILL, "suara");
const firstExisting = (...fs_) => fs_.find((f) => fs.existsSync(f)) || fs_[0];
const TEMPLATE = firstExisting(path.join(VOICE_DIR, "reading-template.md"), path.join(VOICE_DIR, "template-bacaan.md"));
const say = (o, s) => { if (!(o.quiet ?? o.diam)) process.stderr.write(s + "\n"); };

/* ------------------------------------------------------------------ engines */

export const ENGINES = {
  chatterbox: {
    name: "Chatterbox Multilingual (Resemble AI)", license: L`MIT (code and weights)`,
    url: "https://github.com/resemble-ai/chatterbox", model: "https://huggingface.co/ResembleAI/chatterbox",
    languages: L`23 languages; Indonesian is read with the Malay code (ms)`,
    install: `.venv/Scripts/python -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install chatterbox-tts`,
    download: L`about 3.2 GB once (t3_mtl23ls_v2 2.1 GB + s3gen 1.0 GB + ve), into the Hugging Face cache`,
    modules: "chatterbox",
  },
  openvoice: {
    name: "Chatterbox + OpenVoice V2 tone color converter (MyShell)", license: L`MIT (code and weights)`,
    url: "https://github.com/myshell-ai/OpenVoice", model: "https://huggingface.co/myshell-ai/OpenVoiceV2",
    languages: L`voice colour only (no language); Chatterbox makes the sentence, then its colour is replaced`,
    install: `.venv/Scripts/python -m pip install chatterbox-tts
.venv/Scripts/python -m pip install --no-deps git+https://github.com/myshell-ai/OpenVoice.git
.venv/Scripts/python -m pip install wavmark  # optional`,
    download: L`Chatterbox 3.2 GB + OpenVoice V2 converter 131 MB`,
    modules: "chatterbox,openvoice",
  },
};

/* ------------------------------------------------------------------ util */

function ff(args, { capture = false } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-nostdin", "-y", ...args], { stdio: ["ignore", capture ? "pipe" : "ignore", "pipe"] });
    const out = []; let err = "";
    if (capture) p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res({ stdout: Buffer.concat(out), stderr: err }) : rej(new Error(L`ffmpeg failed: ` + err.trim().split("\n").slice(-4).join("\n")))));
  });
}

/** Float mono samples at rate sr. */
async function pcm(file, sr = 16000) {
  const { stdout } = await ff(["-loglevel", "error", "-i", file, "-vn", "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { capture: true });
  return new Float32Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.length / 4));
}

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function readText(v) {
  if (v == null) return null;
  try { if (fs.existsSync(v) && fs.statSync(v).isFile()) return fs.readFileSync(v, "utf8"); } catch { /* text given directly */ }
  return String(v);
}

/**
 * Folder of the voice profiles: --folder > env MGP_VOICE_PROFILES (old REKAM_SUARA_PROFIL) > ${CLAUDE_PLUGIN_DATA}/voice-profiles
 * (when that env is set) > an older in-skill folder that already holds profiles (voice/profiles, old suara/profil) >
 * <mgp home>/voice-profiles (~/.mgp/voice-profiles). Profiles stay outside the skill/plugin folder, which an update replaces.
 */
export function profilesFolder(o = {}) {
  if (o.folder) return path.resolve(o.folder);
  const e = env("MGP_VOICE_PROFILES");
  if (e) return path.resolve(e);
  if (process.env.CLAUDE_PLUGIN_DATA) return path.join(path.resolve(process.env.CLAUDE_PLUGIN_DATA), "voice-profiles");
  const holds = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }).some((x) => x.isDirectory() && hasProfile(path.join(d, x.name))); } catch { return false; } };
  for (const legacy of [path.join(SKILL, "voice", "profiles"), path.join(SKILL, "suara", "profil")]) if (holds(legacy)) return legacy;
  return path.join(mgpHome(), "voice-profiles");
}

/** profile.json of one profile folder (old profil.json). */
const profileFile = (dir) => firstExisting(path.join(dir, "profile.json"), path.join(dir, "profil.json"));
const hasProfile = (dir) => fs.existsSync(path.join(dir, "profile.json")) || fs.existsSync(path.join(dir, "profil.json"));

/** profile.json with the old profil.json keys mapped to the new ones (both are read). */
export function normalizeProfile(m) {
  if (!m || typeof m !== "object") return m;
  const pick = (o, map) => { if (!o || typeof o !== "object") return o; const r = { ...o }; for (const [a, b] of Object.entries(map)) if (r[b] == null && r[a] != null) { r[b] = r[a]; } for (const a of Object.keys(map)) delete r[a]; return r; };
  const r = pick(m, { nama: "name", bahasa: "lang", mesin: "engine", catatan: "notes", dibuat: "created", diperbarui: "updated", izin: "consent", referensi: "reference", sumber: "source" });
  r.consent = pick(r.consent, { cara: "method", kalimat: "sentence", namaTerdengar: "nameHeard", pernyataan: "statement", skor: "score", terverifikasi: "verified", waktu: "time" });
  r.reference = pick(r.reference, { berkas: "file", durasi: "duration" });
  r.source = pick(r.source, { berkas: "file", durasi: "duration" });
  r.engine = r.engine || {};
  return r;
}

function pyFor(mod, o) {
  return findPython(mod, o.python);
}

async function py(o, args, mod = "torch") {
  const p = pyFor(mod, o);
  if (!p) throw new Error(L`no Python with the module ${mod} found.` + "\n" + L`Install it in render/.venv:` + `\n  python -m venv .venv\n  ${ENGINES.chatterbox.install.split("\n").join("\n  ")}\n` + L`(another venv: --python <path> or env MGP_PYTHON)`);
  const out = await runPy(p, "voice_engine.py", args, { quiet: o.quiet });
  return JSON.parse(out.trim().split("\n").pop());
}

/* ------------------------------------------------------------------ template */

export function templateText(lang = "id", name) {
  const md = fs.readFileSync(TEMPLATE, "utf8");
  const b = lang === "en" ? "en" : "id";
  const m = new RegExp(`<!-- (?:text|teks):${b} -->\\s*([\\s\\S]*?)<!-- /(?:text|teks):${b} -->`).exec(md);
  if (!m) throw new Error(L`template text not found in ${TEMPLATE}`);
  let tx = m[1].trim();
  if (name) tx = tx.replace(/\[(nama|name)\]/g, name);
  return tx;
}

const CONSENT = {
  id: "Saya, [nama], mengizinkan suara saya dikloning untuk proyek ini.",
  en: "I, [name], consent to my voice being cloned for this project.",
};
// key words that must be heard (compared loosely: the ASR spelling may differ a little)
const KEYS = { id: ["saya", "mengizinkan", "suara", "saya", "dikloning", "untuk", "proyek", "ini"], en: ["i", "consent", "to", "my", "voice", "being", "cloned", "for", "this", "project"] };
const MUST = { id: ["mengizinkan", "dikloning"], en: ["consent", "cloned"] };

const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/-/g, "").replace(/\s+/g, " ").trim();
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const similar = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);
// ASR spellings that show up often: "dicloning", "di kloning", "mengijinkan"
const canon = (w) => w.replace(/c(?=l)/g, "k").replace(/ijin/g, "izin");

/** Look for the consent sentence in an ASR transcript. Returns {found, score, wordScore, letterScore, name, matchedWords}. */
export function checkConsent(transcript, lang = "id") {
  const b = lang === "en" ? "en" : "id";
  const w = norm(transcript).split(" ").filter(Boolean).map(canon);
  // two joined ASR words ("di kloning" -> "dikloning")
  const keys = KEYS[b];
  let best = { score: 0 };
  const limit = Math.min(w.length, 60);
  for (let s = 0; s < limit; s++) {
    // match the keys in order, may skip up to 4 words (the name)
    let i = s, hit = 0; const matched = []; let nameWords = []; const must = new Set();
    for (let k = 0; k < keys.length && i < w.length; k++) {
      let found = -1, sk = 0;
      const skip = k === 1 ? 5 : 2; // a name may follow "saya"/"i"
      for (let j = i; j < Math.min(w.length, i + skip + 1); j++) {
        const cand = [w[j], w[j] + (w[j + 1] || "")];
        for (let c = 0; c < cand.length; c++) {
          const m = similar(cand[c], keys[k]);
          if (m > sk) { sk = m; found = j + c; }
        }
      }
      if (sk >= 0.72) {
        if (k === 1) nameWords = w.slice(i, Math.max(i, found - (w[found] === keys[k] ? 0 : 0)));
        hit++; matched.push(keys[k]); if (MUST[b].includes(keys[k])) must.add(keys[k]);
        i = found + 1;
      } else if (k === 0) break;
    }
    const score = hit / keys.length;
    if (score > best.score) best = { score, must: [...must], matched, name: nameWords.join(" ") || null, start: s };
  }
  // letter level: the consent sentence (without "saya"/name) is searched as a substring of the first 40 words, without spaces.
  // This survives words that the ASR joined or split ("mengeizingkenswara").
  const pattern = keys.slice(1).map(canon).join("");
  const text = w.slice(0, 40).join("");
  const h = findSubstring(pattern, text);
  const letterScore = 1 - h / pattern.length;
  const mustWords = MUST[b].map((k) => findSubstring(canon(k).slice(0, 6), text) <= 1);
  const found = (best.score >= 0.75 && (best.must || []).length === MUST[b].length) || (letterScore >= 0.72 && mustWords.every(Boolean));
  let name = best.name;
  if (!name) {
    const i0 = w.findIndex((x) => similar(x, keys[0]) >= 0.75);
    const i1 = w.findIndex((x, j) => j > i0 && (b === "en" ? /^cons/.test(x) : /^men/.test(x)));
    if (i0 >= 0 && i1 > i0 + 1 && i1 - i0 <= 5) name = w.slice(i0 + 1, i1).join(" ");
  }
  return { found, score: +Math.max(best.score, letterScore).toFixed(2), wordScore: +best.score.toFixed(2), letterScore: +letterScore.toFixed(2), name: name || null, matchedWords: best.matched || [] };
}

/** Smallest edit distance between a pattern and any substring of the text (semi-global). */
function findSubstring(p, tx) {
  const m = p.length, n = tx.length;
  if (!m) return 0;
  let prev = new Array(n + 1).fill(0), best = m;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (p[i - 1] === tx[j - 1] ? 0 : 1));
    prev = cur;
  }
  for (let j = 0; j <= n; j++) best = Math.min(best, prev[j]);
  return best;
}

/* ------------------------------------------------------------------ inspect */

function percentile(arr, p) { const a = Float64Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))]; }

/** Signal statistics: speech duration, estimated SNR, clipping. */
async function signalStats(file, info) {
  const x16 = await pcm(file, 16000);
  const N = 320; // 20 ms
  const db = [];
  for (let i = 0; i + N <= x16.length; i += N) {
    let s = 0; for (let k = 0; k < N; k++) s += x16[i + k] * x16[i + k];
    db.push(10 * Math.log10(s / N + 1e-12));
  }
  const floor = percentile(db, 0.1), peak = percentile(db, 0.95);
  const thr = Math.max(floor + 10, peak - 35);
  const speech = db.filter((d) => d > thr).length * 0.02;
  // clipping at the original rate: samples near full scale, and runs of >= 3 consecutive samples
  const xa = await pcm(file, Math.min(48000, info.sampleRate || 48000));
  let clip = 0, runs = 0, run = 0, max = 0;
  for (let i = 0; i < xa.length; i++) {
    const a = Math.abs(xa[i]); if (a > max) max = a;
    if (a >= 0.995) { clip++; run++; if (run === 3) runs++; } else run = 0;
  }
  return { speechSeconds: +speech.toFixed(1), snr: +(peak - floor).toFixed(1), floorDb: +floor.toFixed(1), clipPercent: +(100 * clip / Math.max(1, xa.length)).toFixed(3), clipRuns: runs, samplePeak: +max.toFixed(3) };
}

async function transcribe(file, o, lang) {
  const p = pyFor("faster_whisper", o);
  if (!p) return null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-voice-"));
  try {
    const wav = path.join(tmp, "a16k.wav");
    await ff(["-loglevel", "error", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
    const args = [wav, "--model", o.model || "small", "--lang", lang];
    const j = JSON.parse((await runPy(p, "transcribe.py", args, { quiet: true })).trim().split("\n").pop());
    const words = j.words ?? j.kata;
    return { text: words.map((k) => k.text).join(" "), words, lang: j.language ?? j.bahasa };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/** Consent check without ASR: align the template to the audio, then see whether the first sentence has plausible syllable nuclei. */
async function consentByAlign(file, lang, name) {
  const tx = templateText(lang, name || (lang === "en" ? "name" : "nama"));
  const r = await align(file, { script: tx, lang, quiet: true });
  const s = r.stats;
  const nConsent = scriptTokens(tx.split("\n")[0]).length;
  const k = r.words.slice(0, nConsent);
  const durConsent = k.length ? k[k.length - 1].end - k[0].start : 0;
  const sylConsent = k.reduce((a, w) => a + w.syllables.length, 0);
  const rate = durConsent > 0 ? sylConsent / durConsent : 0;
  const ratio = s.nucleiUsed / Math.max(1, s.syllables);
  // 2-9 syllables/s is normal speech; a used-nucleus ratio >= 0.6 means the utterance length matches the template
  return { structureMatches: rate >= 2 && rate <= 9 && ratio >= 0.6, syllableRate: +rate.toFixed(1), nucleusRatio: +ratio.toFixed(2), consentSeconds: +durConsent.toFixed(2) };
}

export async function inspect(inp, o = {}) {
  if (!inp) throw new Error(L`Name a recording: mgp voice inspect recording.wav [--language id|en]`);
  inp = path.resolve(inp);
  const lang = o.language === "en" ? "en" : "id";
  const info = probeMedia(inp);
  if (!info.hasAudio) throw new Error(L`the file has no audio track: ${inp}`);
  const sig = await signalStats(inp, info);
  const loud = await measureLoudness(inp);
  const findings = [];
  const add = (level, message, extra = {}) => findings.push({ level, message, ...extra });
  const dur = info.duration || 0;
  if (dur < 20) add("ERROR", L`recording ${dur.toFixed(1)} s; at least 20 s (ideally 30-35 s). Read the whole template text.`);
  if (sig.speechSeconds < 15) add(dur < 20 ? "ERROR" : "WARN", L`speech is only about ${sig.speechSeconds} s; read the whole text at a normal pace.`);
  if (sig.snr < 15) add("ERROR", L`noisy: estimated SNR ${sig.snr} dB (at least 15, good above 25). Record in a quieter room, switch off fans/AC.`);
  else if (sig.snr < 25) add("WARN", L`estimated SNR ${sig.snr} dB; usable, but the background noise gets copied too. A quieter room is better.`);
  if (sig.clipPercent > 0.1 || sig.clipRuns > 20) add("ERROR", L`clipping ${sig.clipPercent}% of samples (${sig.clipRuns} runs). Lower the microphone gain or move back a little from the microphone.`);
  else if (sig.clipPercent > 0.01 || sig.clipRuns > 3) add("WARN", L`a little clipping (${sig.clipPercent}% of samples).`);
  if (loud.lufs != null && loud.lufs < -38) add("WARN", L`too quiet (${loud.lufs} LUFS). Move the microphone to 20-30 cm or raise the gain.`);
  if (loud.lufs != null && loud.lufs > -8) add("WARN", L`very loud (${loud.lufs} LUFS); check for distortion.`);
  if (info.sampleRate && info.sampleRate < 16000) add("ERROR", L`sample rate ${info.sampleRate} Hz is too low; use 24-48 kHz.`);
  else if (info.sampleRate && info.sampleRate < 24000) add("WARN", L`sample rate ${info.sampleRate} Hz; 24-48 kHz is better.`);

  // consent
  let consent;
  const asr = o.noAsr ? null : await transcribe(inp, o, lang).catch((e) => { say(o, L`transcription failed: ${e.message}`); return null; });
  if (asr) {
    const c = checkConsent(asr.text, lang);
    consent = { method: "faster-whisper", ...c, transcriptStart: asr.text.split(" ").slice(0, 20).join(" ") };
    if (!c.found) add("ERROR", L`the consent sentence is not heard. The recording must start with: "${CONSENT[lang]}" (heard: "${consent.transcriptStart}")`, { consent: true });
  } else {
    const s = await consentByAlign(inp, lang, o.name);
    consent = { method: "align (no ASR)", found: null, ...s };
    add("WARN", L`faster-whisper is not installed, so the machine cannot hear the content of the consent sentence. The speech structure ${s.structureMatches ? L`matches` : L`does NOT match`} the template (rate ${s.syllableRate} syllables/s, nuclei used ${s.nucleusRatio}). Listen to the start of the recording; when the consent sentence is there, \`clone\` needs --manual-consent. Install ASR: .venv/Scripts/python -m pip install faster-whisper`);
    if (!s.structureMatches) add("ERROR", L`the speech does not match the template text (consent sentence + reading text).`);
  }
  const errors = findings.filter((x) => x.level === "ERROR").length;
  return {
    file: inp, ok: errors === 0, consent,
    technical: { duration: +dur.toFixed(2), sampleRate: info.sampleRate, codec: info.audioCodec, lufs: loud.lufs, peakDb: loud.peak ?? loud.puncak, ...sig },
    findings,
  };
}

export function printInspect(r) {
  const T = r.technical, out = [];
  out.push(L`Recording: ${r.file}`);
  out.push(L`  duration ${T.duration} s (speech ~${T.speechSeconds} s), ${T.sampleRate} Hz ${T.codec}, ${T.lufs} LUFS, peak ${T.peakDb} dBFS`);
  out.push(L`  estimated SNR ${T.snr} dB, clipping ${T.clipPercent}%`);
  if (r.consent.method === "faster-whisper") out.push(L`  consent: ${r.consent.found ? L`PRESENT` : L`MISSING`} (score ${r.consent.score}${r.consent.name ? L`, name heard: ${r.consent.name}` : ""}); start of transcript: "${r.consent.transcriptStart}"`);
  else out.push(L`  consent: cannot be confirmed yet (no ASR); structure ${r.consent.structureMatches ? L`matches` : L`does not match`} the template`);
  for (const x of r.findings) out.push(`  ${t(x.level)}: ${x.message}`);
  out.push(r.ok ? (r.consent.found ? L`PASS: the recording is ready to be cloned (mgp voice clone ... --name <profile>).` : L`PASS technically. Consent must be confirmed manually (--manual-consent) before clone.`) : L`FAIL: fix the ERROR findings, then record again.`);
  return out.join("\n");
}

/* ------------------------------------------------------------------ clone */

export async function clone(inp, o = {}) {
  if (!inp || !o.name) throw new Error(L`Usage: mgp voice clone recording.wav --name <profile> [--engine chatterbox|openvoice]`);
  inp = path.resolve(inp);
  const name = String(o.name).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!name) throw new Error(L`--name may only hold letters, digits, - and _`);
  const engine = o.engine || "chatterbox";
  if (!ENGINES[engine]) throw new Error(L`unknown --engine: ${engine} (choices: ${Object.keys(ENGINES).join(", ")})`);
  const dir = path.join(profilesFolder(o), name);
  if (hasProfile(dir) && !o.force && !o.addEngine) throw new Error(L`profile "${name}" already exists (${dir}). Use --force to overwrite it.`);

  say(o, L`1/4 checking the recording and the consent sentence...`);
  const chk = await inspect(inp, { ...o, quiet: true });
  say(o, printInspect(chk).split("\n").map((l) => "    " + l).join("\n"));
  // consent outside the recording: the voice owner gives consent directly (e.g. in the conversation). Needs --manual-consent + --statement, recorded in the profile.
  const ownerConsent = !!(o.manualConsent && o.statement && String(o.statement).trim().length >= 10);
  const otherErrors = chk.findings.filter((x) => x.level === "ERROR" && !x.consent);
  if (otherErrors.length) throw new Error(L`the recording did not pass the check; no profile was made.`);
  if (chk.consent.found === false && !ownerConsent) throw new Error(L`consent sentence not found; no profile was made. A voice may only be cloned with its owner's consent. When the voice owner gave consent directly outside the recording, run again with --manual-consent --statement "<who owns the voice, when and how consent was given>".`);
  if (chk.consent.found === false) say(o, "    " + L`NOTE: the consent sentence is not in the recording; using the owner's consent statement: "${o.statement}"`);
  if (chk.consent.found == null && !o.manualConsent) throw new Error(L`consent not verified yet (no faster-whisper). Install faster-whisper, or listen to the start of the recording yourself, then run again with --manual-consent.`);

  fs.mkdirSync(dir, { recursive: true });
  say(o, L`2/4 cleaning the reference (trim silence, light noise reduction, normalisation)...`);
  const ref = path.join(dir, "reference.wav");
  // highpass 70 Hz, light afftdn, pauses > 0.5 s shortened, silent edges removed, loudness -20 LUFS, 24 kHz mono
  const af = [
    "highpass=f=70", "afftdn=nr=8:nf=-45:tn=1",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1:stop_periods=-1:stop_duration=0.5:stop_threshold=-45dB:stop_silence=0.25",
    "loudnorm=I=-20:TP=-2:LRA=11",
  ].join(",");
  await ff(["-loglevel", "error", "-i", inp, "-vn", "-ac", "1", "-af", af, "-ar", "24000", "-c:a", "pcm_s16le", ref]);
  const refInfo = probeMedia(ref);

  say(o, L`3/4 preparing the voice conditioning (${ENGINES[engine].name})...`);
  const t0 = Date.now();
  const pyRes = await py(o, ["clone", "--engine", engine, "--ref", ref, "--folder", dir], ENGINES[engine].modules.split(",")[0]);

  say(o, L`4/4 writing metadata...`);
  const fileMeta = path.join(dir, "profile.json");
  const old = hasProfile(dir) ? normalizeProfile(JSON.parse(fs.readFileSync(profileFile(dir), "utf8"))) : {};
  const meta = {
    name, created: old.created || new Date().toISOString(), updated: new Date().toISOString(),
    // the first consent is kept when an engine is added (--add-engine) from the same source
    consent: old.consent && old.source && old.source.sha256 === sha256(inp) ? old.consent : {
      sentence: chk.consent.found === false ? null : CONSENT[o.language === "en" ? "en" : "id"],
      method: chk.consent.found === false ? "owner statement outside the recording (--manual-consent --statement)" : chk.consent.method + (chk.consent.found == null ? " + manual confirmation" : ""),
      statement: chk.consent.found === false ? String(o.statement) : undefined,
      verified: chk.consent.found === true, score: chk.consent.score ?? null, nameHeard: chk.consent.name ?? null, time: new Date().toISOString(),
    },
    source: { file: path.basename(inp), sha256: sha256(inp), duration: chk.technical.duration, sampleRate: chk.technical.sampleRate, lufs: chk.technical.lufs, snr: chk.technical.snr },
    reference: { file: "reference.wav", duration: refInfo.duration, sha256: sha256(ref) },
    lang: o.language === "en" ? "en" : "id",
    engine: { ...(old.engine || {}), [engine]: { ...pyRes, seconds: +((Date.now() - t0) / 1000).toFixed(1) } },
    notes: "This profile is private. Keep it local, do not upload or share it. Remove it with: mgp voice remove " + name,
  };
  fs.writeFileSync(fileMeta, JSON.stringify(meta, null, 2) + "\n");
  say(o, L`profile "${name}" ready: ${dir}`);
  return { profile: name, folder: dir, engine, consent: meta.consent, reference: ref };
}

/* ------------------------------------------------------------------ speak */

const EMOTION = {
  // exaggeration (expressive), cfg_weight (low = looser tempo), temperature
  neutral: { exaggeration: 0.5, cfg: 0.5, temperature: 0.8 },
  warm: { exaggeration: 0.4, cfg: 0.4, temperature: 0.7 },
  energetic: { exaggeration: 0.75, cfg: 0.35, temperature: 0.85 },
  calm: { exaggeration: 0.3, cfg: 0.5, temperature: 0.6 },
};
/** old Indonesian emotion names (also as [tag] in a script) */
const EMOTION_OLD = { netral: "neutral", hangat: "warm", semangat: "energetic", tenang: "calm" };
const emotionKey = (e) => { const k = String(e || "").toLowerCase(); return EMOTION[k] ? k : EMOTION_OLD[k] || null; };

/** Turn numbers into words (with the align rules) but keep the punctuation. */
function spokenText(text, lang) {
  const { words } = prepareScript(text, lang);
  return words.map((w) => (/\d|%|&/.test(w.text) ? w.sp + (w.text.match(/[.,;:?!…]+$/) || [""])[0] : w.text)).join(" ");
}

/** Split a script: paragraph -> sentence -> parts <= max characters (cut at commas/semicolons). */
export function splitScript(text, max = 220) {
  const res = [];
  const par = String(text).replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  par.forEach((p, pi) => {
    const sen = p.match(/[^.!?…]+(?:[.!?…]+["'”’)]*|$)/g).map((s) => s.trim()).filter(Boolean);
    sen.forEach((k, ki) => {
      let tag = null;
      const m = /^\[([a-z]+)\]\s*/i.exec(k);
      if (m && emotionKey(m[1])) { tag = emotionKey(m[1]); k = k.slice(m[0].length); }
      const parts = [];
      if (k.length <= max) parts.push(k);
      else {
        let buf = "";
        for (const piece of k.split(/(?<=[,;:—])\s+/)) {
          if (buf && (buf + " " + piece).length > max) { parts.push(buf); buf = piece; } else buf = buf ? buf + " " + piece : piece;
        }
        if (buf) parts.push(buf);
      }
      parts.forEach((tx, ti) => {
        const endSen = ti === parts.length - 1, endPar = endSen && ki === sen.length - 1;
        res.push({ text: tx, emotion: tag, pause: endPar && pi < par.length - 1 ? "paragraph" : endSen ? (/[?!]["'”’)]*$/.test(tx) ? "exclaim" : "sentence") : "comma" });
      });
    });
  });
  if (res.length) res[res.length - 1].pause = "end";
  return res;
}

const PAUSE = { comma: 0.18, sentence: 0.38, exclaim: 0.45, paragraph: 0.8, end: 0.3 };
const PAUSE_OLD = { koma: "comma", kalimat: "sentence", seru: "exclaim", paragraf: "paragraph", akhir: "end" };

function readProfile(o) {
  const name = o.profile;
  if (!name) throw new Error(L`--profile <name> is required (see: mgp voice list)`);
  const dir = path.join(profilesFolder(o), name);
  if (!hasProfile(dir)) throw new Error(L`profile "${name}" does not exist in ${profilesFolder(o)}. Make it first: mgp voice clone recording.wav --name ${name}`);
  return { dir, meta: normalizeProfile(JSON.parse(fs.readFileSync(profileFile(dir), "utf8"))) };
}

/* ------------------------------------------------------------------ pronunciations (helper spellings for TTS) */

const PRON_DEFAULT = firstExisting(path.join(VOICE_DIR, "pronunciations-default.txt"), path.join(VOICE_DIR, "lafal-bawaan.txt"));

/** Pronunciation text -> [{word, spoken, variants}]. Line: `word = spoken | ASR variant, other variant`; # comment.
 *  Inline (--pronounce "Claude=Klod; brief=brif"): ; or , between entries. Empty spoken = only variants for score. */
export function parsePronunciations(text, inline = false) {
  const out = [];
  const lines = inline ? String(text).split(/[;,\n]/) : String(text).replace(/\r/g, "").split("\n");
  for (let b of lines) {
    b = b.replace(/#.*$/, "").trim();
    if (!b) continue;
    const m = /^([^=|]+?)\s*=\s*([^|]*?)\s*(?:\|\s*(.*))?$/.exec(b);
    if (!m) continue;
    out.push({ word: m[1].trim(), spoken: m[2].trim(), variants: (m[3] || "").split(",").map((s) => s.trim()).filter(Boolean) });
  }
  return out;
}

/** Effective pronunciations: skill default < project pronunciations.txt (old lafal.txt; script folder, its parent, or the working folder) < --pronounce. */
export function loadPronunciations(o = {}, scriptPath = null) {
  if (o.noPronounce) return { entries: [], sources: [] };
  const map = new Map(), sources = [];
  const use = (list, src) => { if (!list.length) return; for (const e of list) map.set(e.word.toLowerCase(), { ...e, source: src }); sources.push(src); };
  if (fs.existsSync(PRON_DEFAULT)) use(parsePronunciations(fs.readFileSync(PRON_DEFAULT, "utf8")), PRON_DEFAULT);
  const dirs = [];
  if (scriptPath && fs.existsSync(scriptPath) && fs.statSync(scriptPath).isFile()) { const d = path.dirname(path.resolve(scriptPath)); dirs.push(d, path.dirname(d)); }
  dirs.push(process.cwd());
  const project = dirs.flatMap((d) => [path.join(d, "pronunciations.txt"), path.join(d, "lafal.txt")]).find((f) => fs.existsSync(f));
  if (project) use(parsePronunciations(fs.readFileSync(project, "utf8")), project);
  if (o.pronounce) {
    const f = path.resolve(String(o.pronounce));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) use(parsePronunciations(fs.readFileSync(f, "utf8")), f);
    else use(parsePronunciations(o.pronounce, true), "--pronounce");
  }
  return { entries: [...map.values()], sources };
}

const APOS = /[\u2018\u2019\u02bc`\u00b4]/g;   // \u2019 \u2018 \u02bc ` \u00b4 -> '
const plainWord = (s) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(APOS, "'").replace(/[\u2010\u2011]/g, "-").toLowerCase();
const isWordChar = (c) => /[\p{L}\p{N}]/u.test(c);

/** One token matched against one entry piece (already plainWord). Whole words only: the token may have leading
 *  punctuation (quotes, brackets) and trailing punctuation or a hyphen suffix ("ZIP" matches "ZIP-nya,", "(ZIP)"),
 *  but never continue the word ("ZIP" does not match "ZIPPED", "don" does not match "don't").
 *  Pieces may contain hyphens, apostrophes, dots, any case ("ZIP-nya", "Jum'at", "Dr."). -> {lead, tail} | null */
function matchPiece(tok, piece) {
  const chars = [...tok];
  let a = 0;
  if (isWordChar([...piece][0] || "")) while (a < chars.length && !isWordChar(chars[a])) a++;   // leading punctuation
  // normalise character by character, remembering where each original character ends
  let norm = "";
  const ends = [];
  for (let i = a; i < chars.length; i++) { norm += plainWord(chars[i]); ends.push(norm.length); }
  if (!norm.startsWith(piece)) return null;
  const at = ends.indexOf(piece.length);
  if (at < 0) return null;   // the piece ends inside a decomposed character
  const rest = chars.slice(a + at + 1).join("");
  const r0 = rest[0] || "", r1 = rest[1] || "";
  if (isWordChar(r0)) return null;   // the word goes on ("ZIP" in "ZIPPED")
  if (/['\u2018\u2019\u02bc]/.test(r0) && isWordChar(r1) && isWordChar([...piece].pop() || "")) return null;   // "don" in "don't"
  return { lead: chars.slice(0, a).join(""), tail: rest };
}

/** Replace script words/phrases with their spoken spelling. Returns {text, tokens, groups, used}: groups = [{o0, oN, s0, sN}]
 *  per original token; used = Set of the entry words (lower case) that matched at least once. */
export function applyPronunciations(text, entries) {
  const T = scriptTokens(text);
  const E = (entries || []).map((e) => ({ word: e.word ?? e.kata, spoken: e.spoken ?? e.ucap })).filter((e) => e.spoken && e.word)
    .map((e) => ({ ...e, k: plainWord(e.word.trim()).split(/\s+/).filter(Boolean) }))
    .sort((a, b) => b.k.length - a.k.length || b.k.join(" ").length - a.k.join(" ").length);   // longest phrase, then longest word first
  const S = [], groups = [], used = new Set();
  for (let i = 0; i < T.length;) {
    let hit = null, first = null, last = null;
    for (const e of E) {
      const n = e.k.length;
      if (i + n > T.length) continue;
      let ok = true, ms = [];
      for (let j = 0; j < n && ok; j++) {
        const m = matchPiece(T[i + j], e.k[j]);
        ok = !!m && (j === 0 || !m.lead) && (j === n - 1 || !m.tail);
        ms.push(m);
      }
      if (ok) { hit = e; first = ms[0]; last = ms[n - 1]; break; }
    }
    if (hit) {
      const n = hit.k.length;
      const neu = (first.lead + hit.spoken + last.tail).split(/\s+/).filter(Boolean);
      groups.push({ o0: i, oN: n, s0: S.length, sN: neu.length, replaced: true });
      used.add(hit.word.trim().toLowerCase());
      S.push(...neu); i += n;
    } else { groups.push({ o0: i, oN: 1, s0: S.length, sN: 1 }); S.push(T[i]); i++; }
  }
  return { text: S.join(" "), tokens: T, groups, used };
}

/** Entries from the project pronunciations.txt / --pronounce that no word of the script matched (the skill default list is
 *  not reported: most of its words are simply not in this script). -> [{word, source}] */
export function unusedPronunciations(script, pron) {
  const clean = String(script).replace(/^\s*\[[a-z]+\]\s*/gim, "");
  const { used } = applyPronunciations(clean, pron.entries);
  return pron.entries.filter((e) => (e.spoken ?? e.ucap) && e.source && e.source !== PRON_DEFAULT && !used.has(String(e.word).trim().toLowerCase()))
    .map((e) => ({ word: e.word, source: e.source }));
}

/* ------------------------------------------------------------------ speak */

/** "3" | "3,5" | "2-4" (1-based) -> unique sorted 0-based indexes. */
function parseSentences(v, n) {
  const set = new Set();
  for (const piece of String(v).split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(piece);
    if (!m) throw new Error(L`--sentence: "${piece}" is not a number (e.g. 3, 2-4, 1,5)`);
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) {
      if (k < 1 || k > n) throw new Error(L`--sentence ${k} is outside 1-${n} (see the sentence numbers with --dry-run)`);
      set.add(k - 1);
    }
  }
  return [...set].sort((x, y) => x - y);
}

const no2 = (i) => String(i + 1).padStart(2, "0");

/** Parts folder of a VO: <vo>.parts/parts.json; the old <vo>.bagian/bagian.json is still found (and then kept as the folder). */
function partsLocation(out) {
  const base = out.replace(/\.[^.\\/]+$/, "");
  const neu = base + ".parts", old = base + ".bagian";
  for (const [d, f] of [[neu, "parts.json"], [old, "parts.json"], [old, "bagian.json"]]) if (fs.existsSync(path.join(d, f))) return { dir: d, manifest: path.join(d, f) };
  return { dir: neu, manifest: path.join(neu, "parts.json") };
}

/** parts.json with the old bagian.json keys mapped to the new ones. */
function normalizeParts(m) {
  if (!m || m.parts) return m;
  const part = (b) => {
    const cand = (b.calon || b.candidates) && (b.candidates || b.calon).map((x) => ({ no: x.no, seed: x.seed, duration: x.duration ?? x.durasi, werNormal: x.werNormal ?? null, wer: x.wer ?? null, score: x.score ?? x.skor, eos: x.eos, transcript: x.transcript ?? x.transkrip ?? null, checkByEar: x.checkByEar ?? x.cekTelinga ?? [], file: x.file ?? x.berkas }));
    const r = { no: b.no, text: b.text ?? b.teks, spoken: b.spoken ?? b.ucap, pause: PAUSE_OLD[b.jeda] || b.pause || b.jeda, emotion: emotionKey(b.emotion ?? b.emosi) || (b.emotion ?? b.emosi), exaggeration: b.exaggeration, cfg: b.cfg, temperature: b.temperature,
      file: b.file ?? b.berkas, duration: b.duration ?? b.durasi, eos: b.eos, seed: b.seed, start: b.start ?? b.mulai };
    if (cand) { r.candidates = cand; r.picked = b.picked ?? b.dipilih; }
    return r;
  };
  return {
    version: m.version ?? m.versi, profile: m.profile ?? m.profil, engine: m.engine ?? m.mesin, lang: m.lang ?? m.bahasa, emotion: emotionKey(m.emotion ?? m.emosi) || (m.emotion ?? m.emosi),
    speed: m.speed ?? m.kecepatan, lufs: m.lufs, ar: m.ar, sr: m.sr, script: m.script ?? m.naskah, pronunciations: m.pronunciations ?? m.lafal,
    created: m.created ?? m.dibuat, updated: m.updated ?? m.diperbarui, parts: (m.parts || m.bagian || []).map(part), notes: m.notes ?? m.catatan,
  };
}

/** Python speak result with the old keys mapped (berkas, calon, pilih, seedDipakai, perangkat, vramPuncakGb, detik, detikAudio). */
function normSpeak(r) {
  const cands = (r.candidates ?? r.calon ?? []).map((c) => c && ({
    expected: c.expected ?? c.harap, pick: c.pick ?? c.pilih, seedUsed: c.seedUsed ?? c.seedDipakai,
    candidates: (c.candidates ?? c.calon)?.map((x) => ({ ...x, duration: x.duration ?? x.durasi, file: x.file ?? x.berkas, transcript: x.transcript ?? x.transkrip, checkByEar: x.checkByEar ?? x.cekTelinga, score: x.score ?? x.skor })),
  }));
  return { ...r, files: r.files ?? r.berkas, candidates: cands, device: normDevice(r.device ?? r.perangkat), vramPeakGb: r.vramPeakGb ?? r.vramPuncakGb, seconds: r.seconds ?? r.detik, audioSeconds: r.audioSeconds ?? r.detikAudio };
}
const normDevice = (d) => d && typeof d === "object" ? { ...d, device: d.device ?? d.perangkat, fallback: d.fallback ?? d.cadangan, reason: d.reason ?? d.alasan } : d;

export async function speak(inp, o = {}) {
  const scriptOrig = readText(inp);
  if (!scriptOrig || !scriptOrig.trim()) throw new Error(L`Usage: mgp voice speak script.txt --profile <name> -o vo.wav`);
  const out = path.resolve(o.o || o.out || "vo.wav");
  const loc = partsLocation(out);
  const dirB = loc.dir;
  let man = null;
  if (o.sentence != null) {
    if (!fs.existsSync(loc.manifest)) throw new Error(L`--sentence needs the earlier VO parts in ${dirB}\\ (made by mgp voice speak without --sentence, v2.4+). Make the full VO first.`);
    man = normalizeParts(JSON.parse(fs.readFileSync(loc.manifest, "utf8")));
    if (!o.profile) o = { ...o, profile: man.profile };
  }
  const fMan = path.join(dirB, "parts.json");
  const { dir, meta } = readProfile(o);
  const engine = o.engine || man?.engine || (meta.engine.chatterbox ? "chatterbox" : Object.keys(meta.engine)[0]);
  if (!meta.engine[engine]) throw new Error(L`profile "${meta.name}" is not prepared for the engine ${engine} yet. Run: mgp voice clone <recording> --name ${meta.name} --engine ${engine} --add-engine`);
  const lang = (o.language || man?.lang || "id").toLowerCase();
  const lng = lang === "en" ? "en" : "id";
  const emotion = emotionKey(o.emotion || man?.emotion || "neutral");
  if (!emotion) throw new Error(L`--emotion: ${Object.keys(EMOTION).join(", ")}`);
  const speed = o.speed != null ? +o.speed : man?.speed ?? 1;
  if (!(speed >= 0.7 && speed <= 1.3)) throw new Error(L`--speed between 0.7 and 1.3`);
  const tries = o.tries != null ? Math.round(+o.tries) : 1;
  if (!(tries >= 1 && tries <= 12)) throw new Error(L`--tries between 1 and 12`);
  const script = scriptOrig.replace(/^\uFEFF/, "");
  const pron = loadPronunciations(o, inp);
  const parts = splitScript(script).map((b) => ({ ...b, spoken: spokenText(applyPronunciations(b.text, pron.entries).text, lng), ...EMOTION[b.emotion || emotion] }));
  const unused = unusedPronunciations(parts.map((b) => b.text).join("\n"), pron);
  const unusedMsg = unused.map((u) => L`WARN` + ": " + L`pronunciation "${u.word}" (${path.basename(u.source)}) matches no word of the script; check the spelling (whole words, any case; hyphens and apostrophes count)`);

  if (o.dryRun) {
    const lines = [L`speak --dry-run: ${parts.length} sentences/parts (numbers for --sentence)` + (pron.sources.length ? L`; pronunciations: ${pron.sources.join(", ")}` : "")];
    parts.forEach((b, i) => lines.push(`  ${String(i + 1).padStart(2)}. ${b.text}${b.spoken !== b.text ? "\n      " + L`spoken: ${b.spoken}` : ""}`));
    lines.push(...unusedMsg);
    return { dryRun: true, text: lines.join("\n"), parts: parts.map((b, i) => ({ no: i + 1, text: b.text, spoken: b.spoken, pause: b.pause })), pronunciations: pron.sources, unusedPronunciations: unused };
  }
  for (const m of unusedMsg) say(o, m);

  // the parts made now
  let pick = parts.map((_, i) => i);
  if (man) {
    if (man.parts.length !== parts.length) throw new Error(L`the number of sentences changed (${man.parts.length} in ${loc.manifest} vs ${parts.length} now). Redo the whole VO without --sentence.`);
    pick = parseSentences(o.sentence, parts.length);
    parts.forEach((b, i) => {
      if (pick.includes(i)) return;
      if (man.parts[i].text !== b.text) say(o, L`WARN` + ": " + L`sentence ${i + 1} changed in the script but is not redone (the old audio is kept): "${b.text}"`);
      if (!o.emotion) Object.assign(b, { exaggeration: man.parts[i].exaggeration, cfg: man.parts[i].cfg, temperature: man.parts[i].temperature });
    });
    if (!o.emotion) for (const i of pick) Object.assign(parts[i], { exaggeration: man.parts[i].exaggeration, cfg: man.parts[i].cfg, temperature: man.parts[i].temperature });
  }
  const seedBase = o.seed != null ? +o.seed : 1;
  const seedOf = (i) => (man ? (o.seed != null ? +o.seed : (man.parts[i].triedSeed ?? man.parts[i].seed ?? i + 1) + 1) : seedBase + i);
  // --sentence N --tries K: the existing take competes as a candidate and is only replaced by a better one (unless --force)
  const currentOf = (i) => {
    if (!man || tries < 2 || o.force) return null;
    const p = man.parts[i], f = p?.file && path.join(dirB, p.file);
    // changed sentence, spelling or emotion: the old take is not a fair rival (the new ones are meant to sound different)
    if (!f || !fs.existsSync(f) || p.text !== parts[i].text || p.spoken !== parts[i].spoken) return null;
    if (["exaggeration", "cfg", "temperature"].some((k) => p[k] != null && parts[i][k] != null && +p[k] !== +parts[i][k])) return null;
    return { file: f, seed: p.seed ?? null, eos: p.eos || 0 };
  };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-speak-"));
  try {
    const fk = path.join(tmp, "sentences.json");
    fs.writeFileSync(fk, JSON.stringify(pick.map((i) => ({ ...parts[i], seed: seedOf(i), ...(currentOf(i) ? { current: currentOf(i) } : {}) }))));
    const fn = path.join(tmp, "normal.json");
    fs.writeFileSync(fn, JSON.stringify({ pronunciations: pron.entries }));
    say(o, L`speak: ${man ? L`redo sentence ${pick.map((i) => i + 1).join(", ")} of ${parts.length}` : L`${parts.length} parts`}, engine ${engine}, profile ${meta.name}, language ${lang}${lang === "id" ? L` (model code ms)` : ""}, emotion ${emotion}${tries > 1 ? L`, ${tries} candidates per sentence (picked by ASR)` : ""}${pron.sources.length ? "\n  " + L`pronunciations: ${pron.sources.join(", ")}` : ""}`);
    const t0 = Date.now();
    const args = ["speak", "--engine", engine, "--folder", dir, "--sentences", fk, "--out", tmp, "--lang", lang, "--seed", String(seedBase), "--normal", fn];
    if (tries > 1) args.push("--tries", String(tries));
    const r = normSpeak(await py(o, args, ENGINES[engine].modules.split(",")[0]));

    // keep the parts in <vo>.parts/ (used by a later --sentence)
    fs.mkdirSync(path.join(dirB, "candidates"), { recursive: true });
    const srMan = man?.sr || r.sr;
    const prev = man ? man.parts : [];
    const fresh = parts.map((b, i) => ({ ...(prev[i] || {}), no: i + 1, text: b.text, spoken: b.spoken, pause: b.pause, emotion: b.emotion || emotion, exaggeration: b.exaggeration, cfg: b.cfg, temperature: b.temperature }));
    const verdicts = [];
    for (let k = 0; k < pick.length; k++) {
      const i = pick[k], f = path.join(dirB, `${no2(i)}.wav`);
      const c = r.candidates?.[k] || {};
      const kept = !!(c.candidates && c.candidates[c.pick]?.current);
      if (!kept) await ff(["-loglevel", "error", "-i", r.files[k], "-ac", "1", "-ar", String(srMan), "-c:a", "pcm_s16le", f]);
      for (const sub of ["candidates", "calon"]) { const cd = path.join(dirB, sub); if (fs.existsSync(cd)) for (const x of fs.readdirSync(cd)) if (x.startsWith(no2(i) + "-")) fs.rmSync(path.join(cd, x)); }
      const e = fresh[i];
      e.file = `${no2(i)}.wav`; e.duration = +probeMedia(f).duration.toFixed(3); e.eos = kept ? (prev[i]?.eos || 0) : r.eos?.[k] || 0;
      if (c.candidates) {
        const cl = [];
        for (let j = 0; j < c.candidates.length; j++) {
          const x = c.candidates[j];
          const row = { no: j + 1, seed: x.seed, duration: x.duration, werNormal: x.werNormal ?? null, wer: x.wer ?? null, score: x.score, eos: x.eos, transcript: x.transcript ?? null, checkByEar: x.checkByEar || [] };
          if (x.current) { row.current = true; row.file = e.file; }   // the existing take: it stays NN.wav, no copy
          else { const fc = path.join(dirB, "candidates", `${no2(i)}-${j + 1}.wav`); fs.copyFileSync(x.file, fc); row.file = `candidates/${no2(i)}-${j + 1}.wav`; }
          cl.push(row);
        }
        e.seed = kept ? (prev[i]?.seed ?? c.candidates[c.pick].seed) : c.candidates[c.pick].seed; e.candidates = cl; e.picked = c.pick + 1;
        e.triedSeed = seedOf(i);
        const curRow = cl.find((x) => x.current), newBest = cl.filter((x) => !x.current).reduce((a, x) => (a == null || x.score < a ? x.score : a), null);
        if (curRow) {
          e.keptCurrent = kept;
          verdicts.push({ sentence: i + 1, kept, currentScore: curRow.score, bestNewScore: newBest });
          say(o, kept ? L`sentence ${i + 1}: current take kept (score ${(+curRow.score).toFixed(3)} <= best new ${newBest == null ? "-" : (+newBest).toFixed(3)}); use --force to take the best new one anyway`
            : L`sentence ${i + 1}: replaced (current take score ${(+curRow.score).toFixed(3)} -> new ${(+newBest).toFixed(3)})`);
        } else {
          delete e.keptCurrent;
          if (man) say(o, L`sentence ${i + 1}: best new candidate score ${newBest == null ? "-" : (+newBest).toFixed(3)}${o.force ? L` (--force: the current take was not compared)` : ""}`);
        }
      } else { e.seed = c.seedUsed ?? seedOf(i); delete e.candidates; delete e.picked; delete e.keptCurrent; }
      if (e.eos) say(o, L`WARN` + ": " + L`sentence ${i + 1}: Chatterbox detected repeated tokens and forced a stop (mumbling, a doubled word, or a cut last word). Listen, or redo: --sentence ${i + 1} --tries 3`);
    }
    man = {
      version: 1, profile: meta.name, engine, lang, emotion, speed, lufs: o.lufs != null ? +o.lufs : man?.lufs ?? -16, ar: +(o.ar || man?.ar || 48000), sr: srMan,
      script: typeof inp === "string" && fs.existsSync(inp) ? path.resolve(inp) : null, pronunciations: pron.sources,
      created: man?.created || new Date().toISOString(), updated: new Date().toISOString(), parts: fresh,
      notes: "One part per sentence for `mgp voice speak ... --sentence N`. candidates/ = candidates from --tries (listen when the scores are close). NN.wav = natural speed (before --speed); start/end = estimated seconds in the final vo.wav (after --speed). To cut one line out of vo.wav use vo.words.json (aligned on the final audio); with ffmpeg put -ss/-to before -i and atempo after the cut (references/audio.md 10.2a).",
    };
    const res = await assemble(dirB, man, out, { ...o, script, lang: lng, pron });
    fs.writeFileSync(fMan, JSON.stringify(man, null, 2) + "\n");
    const secs = (Date.now() - t0) / 1000;
    const pk = r.device ? `, ${r.device.device}${r.vramPeakGb != null ? L`, VRAM peak ${r.vramPeakGb} GB` : ""}${r.device.fallback ? L`, fallback: ${r.device.fallback}` : ""}` : "";
    const rtf = +(r.seconds / Math.max(0.1, r.audioSeconds)).toFixed(2);
    say(o, L`audio ${res.duration.toFixed(1)} s in ${secs.toFixed(0)} s (RTF ${rtf} for synthesis${pk}) → ${out}` + "\n  " + L`parts: ${dirB}`);
    return { out, duration: res.duration, parts: parts.length, redone: pick.map((i) => i + 1), engine, profile: meta.name, rtf, device: r.device, vramPeakGb: r.vramPeakGb, partsDir: dirB, words: res.words, letters: res.letters, comparison: verdicts, candidates: pick.filter((i) => fresh[i].candidates).map((i) => ({ sentence: i + 1, picked: fresh[i].picked, candidates: fresh[i].candidates })) };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/** Join the parts <vo>.parts/NN.wav with natural pauses -> tempo -> loudness -> vo.wav + vo.words.json + vo.letters.json. */
async function assemble(dirB, man, out, o) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-assemble-"));
  try {
    const list = [], pauses = new Map();
    let tt = 0;
    for (const b of man.parts) {
      const f = path.join(dirB, b.file || "");
      if (!b.file || !fs.existsSync(f)) throw new Error(L`part ${b.no} is missing (${f}); redo it with --sentence ${b.no} or remake the whole VO`);
      const d = PAUSE[b.pause] ?? 0.3;
      if (!pauses.has(d)) {
        const s = path.join(tmp, `pause_${pauses.size}.wav`);
        await ff(["-loglevel", "error", "-f", "lavfi", "-i", `anullsrc=r=${man.sr}:cl=mono`, "-t", String(d), "-c:a", "pcm_s16le", s]);
        pauses.set(d, s);
      }
      // start/end: seconds in the final vo.wav (after --speed); estimates only. Cut lines by vo.words.json (aligned on vo.wav).
      b.start = +(tt / man.speed).toFixed(3);
      b.end = +((tt + (b.duration || probeMedia(f).duration)) / man.speed).toFixed(3);
      tt += (b.duration || probeMedia(f).duration) + d;
      list.push(f, pauses.get(d));
    }
    const lst = path.join(tmp, "list.txt");
    fs.writeFileSync(lst, list.map((x) => `file '${x.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
    const joined = path.join(tmp, "joined.wav");
    await ff(["-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:a", "pcm_s16le", joined]);
    let src = joined;
    if (Math.abs(man.speed - 1) > 0.001) { const f = path.join(tmp, "tempo.wav"); await ff(["-loglevel", "error", "-i", joined, "-af", `atempo=${man.speed}`, f]); src = f; }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await audioNormalize(src, { o: out, lufs: man.lufs, tp: -1.5, ar: man.ar, quiet: true });
    const duration = probeMedia(out).duration;
    const times = o.noAlign ? {} : await writeTimes(out, o.script, o.lang, o, o.pron?.entries);
    return { duration, ...times };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/** vo.wav -> vo.words.json (words + syllables) and vo.letters.json (letters), through mgp align. With pronunciations: times
 *  are computed from the spoken spelling ("Klod"), word texts go back to the original script ("Claude"); letters stay spoken (lip-sync). */
async function writeTimes(out, script, lang, o, pron = []) {
  const base = out.replace(/\.[^.\\/]+$/, "");
  const clean = script.replace(/^\s*\[[a-z]+\]\s*/gim, "");
  const lf = applyPronunciations(clean, pron);
  const r = await align(out, { script: lf.text, lang: lang === "en" ? "en" : "id", o: base + ".words.json", letters: base + ".letters.json", quiet: true });
  if (lf.groups.some((g) => g.replaced)) {
    const words = JSON.parse(fs.readFileSync(r.out, "utf8"));
    if (words.length === lf.groups.reduce((a, g) => a + g.sN, 0)) {
      const neu = [];
      for (const g of lf.groups) {
        const sp = words.slice(g.s0, g.s0 + g.sN);
        if (g.oN === g.sN) { sp.forEach((k, j) => neu.push({ ...k, text: lf.tokens[g.o0 + j] })); continue; }
        const a = sp[0].start, z = sp[sp.length - 1].end, d = (z - a) / g.oN, syl = sp.flatMap((k) => k.syllables || k.suku || []);
        for (let j = 0; j < g.oN; j++) {
          const s = +(a + j * d).toFixed(3), e = +(a + (j + 1) * d).toFixed(3);
          neu.push({ ...sp[0], text: lf.tokens[g.o0 + j], start: s, end: e, syllables: syl.filter((x) => { const m = (x.start + x.end) / 2; return m >= s && (m < e || j === g.oN - 1); }) });
        }
      }
      neu.forEach((k, i) => (k.id = "w" + i));
      fs.writeFileSync(r.out, "[\n" + neu.map((w) => "  " + JSON.stringify(w)).join(",\n") + "\n]\n");
    } else say(o, L`WARN` + ": " + L`the aligned word count (${words.length}) does not match the spoken script; the words.json texts use the spoken spelling`);
  }
  say(o, L`times: ${r.stats.words} words, ${r.stats.syllables} syllables → ${r.out}, ${r.lettersOut}`);
  return { words: r.out, letters: r.lettersOut };
}

/* ------------------------------------------------------------------ ElevenLabs */

const elHelp = () => L`ELEVENLABS_API_KEY is not set.
Choices:
  1. Set the key in your computer's environment (never in a project file), then run again:
       PowerShell:  $env:ELEVENLABS_API_KEY = "sk_..."
  2. Without a key: ask Claude to use the ElevenLabs connector (creative_list_voices, then creative_generate_speech),
     download the audio, then add word times with:  mgp align vo.mp3 --script script.txt -o vo.words.json --letters vo.letters.json
  3. A saved /with-timestamps response can be converted without network:  mgp voice elevenlabs script.txt --reuse response.json -o vo.wav`;

/** Turn the ElevenLabs character alignment into words (+syllables) and letters. offset in seconds. */
export function alignmentToTimes(al, lang = "id", offset = 0) {
  const ch = al.characters || al.chars || [], t0 = al.character_start_times_seconds || [], t1 = al.character_end_times_seconds || [];
  const words = [], letters = [];
  let cur = null;
  const close = () => {
    if (!cur) return;
    const text = cur.c.map((c) => c.c).join("");
    const isLetter = (c) => /\p{L}/u.test(c);
    const wordLetters = cur.c.filter((c) => isLetter(c.c));
    const core = wordLetters.length ? wordLetters : cur.c;
    const start = core[0].a, end = core[core.length - 1].b;
    // syllables: from the real letters when the word has no digits; with digits, the spoken form is spread evenly
    const plain = wordLetters.map((c) => c.c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()).join("");
    const syl = [];
    if (!/\d/.test(text) && plain) {
      const sk = lang === "en" ? syllablesEn(plain) : syllablesId(plain);
      let k = 0;
      for (const s of sk) {
        const a = wordLetters[k], b = wordLetters[Math.min(wordLetters.length - 1, k + s.length - 1)];
        syl.push({ text: s, start: r3(a.a), end: r3(b.b) }); k += s.length;
      }
      for (const c of wordLetters) letters.push({ start: r3(c.a), end: r3(c.b), phone: c.c.toLowerCase() });
    } else {
      const sp = prepareScript(text, lang === "en" ? "en" : "id").words.map((w) => w.sp).join(" ").split(" ").filter(Boolean);
      const sk = sp.flatMap((w) => (lang === "en" ? syllablesEn(w) : syllablesId(w)));
      const d = (end - start) / Math.max(1, sk.length);
      sk.forEach((s, i) => {
        syl.push({ text: s, start: r3(start + i * d), end: r3(start + (i + 1) * d) });
        const dh = d / s.length;
        [...s].forEach((c, j) => letters.push({ start: r3(start + i * d + j * dh), end: r3(start + i * d + (j + 1) * dh), phone: c }));
      });
    }
    words.push({ id: "w" + words.length, text, start: r3(start), end: r3(end), syllables: syl });
    cur = null;
  };
  const r3 = (v) => +(+v).toFixed(3);
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (/\s/.test(c)) { close(); continue; }
    if (!cur) cur = { c: [] };
    cur.c.push({ c, a: (+t0[i] || 0) + offset, b: (+t1[i] || 0) + offset });
  }
  close();
  // standalone punctuation sticks to the previous word (same as scriptTokens)
  const joined = [];
  for (const k of words) {
    if (!/[\p{L}\p{N}]/u.test(k.text) && joined.length) joined[joined.length - 1].text += k.text;
    else joined.push(k);
  }
  joined.forEach((k, i) => (k.id = "w" + i));
  return { words: joined, letters };
}

function splitRequests(text, max = 2500) {
  const par = String(text).replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out = []; let buf = "";
  for (const p of par) {
    if (buf && (buf + "\n\n" + p).length > max) { out.push(buf); buf = p; } else buf = buf ? buf + "\n\n" + p : p;
  }
  if (buf) out.push(buf);
  return out.flatMap((c) => (c.length <= max ? [c] : c.match(new RegExp(`[\\s\\S]{1,${max}}(?=\\s|$)`, "g"))));
}

export async function elevenlabs(inp, o = {}) {
  const script = readText(inp);
  if (!script || !script.trim()) throw new Error(L`Usage: mgp voice elevenlabs script.txt --voice <voice_id> -o vo.wav`);
  const out = path.resolve(o.o || o.out || "vo.wav");
  const lang = (o.language || "id").toLowerCase();
  const model = o.model || "eleven_multilingual_v2";
  let responses;
  if (o.reuse) {
    const j = JSON.parse(fs.readFileSync(path.resolve(o.reuse), "utf8"));
    responses = Array.isArray(j) ? j : [j];
  } else {
    const key = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
    if (!key) { const e = new Error(elHelp()); e.guide = true; throw e; }
    if (!o.voice) throw new Error(L`--voice <voice_id> is required (voices: https://elevenlabs.io/app/voice-library, or your cloned voice in My Voices)`);
    const pieces = splitRequests(script);
    responses = [];
    for (let i = 0; i < pieces.length; i++) {
      const body = { text: pieces[i], model_id: model, voice_settings: { stability: o.stability != null ? +o.stability : 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true } };
      if (/v2_5|flash|turbo|v3/.test(model)) body.language_code = lang;
      if (i > 0) body.previous_text = pieces[i - 1].slice(-300);
      if (i < pieces.length - 1) body.next_text = pieces[i + 1].slice(0, 300);
      say(o, L`elevenlabs: request ${i + 1}/${pieces.length} (${pieces[i].length} characters, model ${model})`);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(o.voice)}/with-timestamps?output_format=mp3_44100_128`, {
        method: "POST", headers: { "xi-api-key": key, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
      responses.push(await res.json());
    }
    if (o.saveResponse) fs.writeFileSync(path.resolve(o.saveResponse), JSON.stringify(responses));
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-el-"));
  try {
    let offset = 0; const words = [], letters = [], wavs = [];
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const mp3 = path.join(tmp, `p${i}.mp3`), wav = path.join(tmp, `p${i}.wav`);
      fs.writeFileSync(mp3, Buffer.from(r.audio_base64, "base64"));
      await ff(["-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", wav]);
      const al = alignmentToTimes(r.alignment || r.normalized_alignment || {}, lang, offset);
      for (const k of al.words) words.push({ ...k, id: "w" + words.length });
      letters.push(...al.letters);
      offset += probeMedia(wav).duration; wavs.push(wav);
    }
    const lst = path.join(tmp, "list.txt");
    fs.writeFileSync(lst, wavs.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
    const joined = path.join(tmp, "joined.wav");
    await ff(["-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:a", "pcm_s16le", joined]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // loudness normalisation does not shift the times
    await audioNormalize(joined, { o: out, lufs: o.lufs != null ? +o.lufs : -16, tp: -1.5, quiet: true });
    const base = out.replace(/\.[^.\\/]+$/, "");
    fs.writeFileSync(base + ".words.json", "[\n" + words.map((w) => "  " + JSON.stringify(w)).join(",\n") + "\n]\n");
    fs.writeFileSync(base + ".letters.json", "[\n" + letters.map((w) => "  " + JSON.stringify(w)).join(",\n") + "\n]\n");
    say(o, L`elevenlabs: ${words.length} words, ${letters.length} letters, ${offset.toFixed(1)} s → ${out}`);
    return { out, words: base + ".words.json", letters: base + ".letters.json", wordCount: words.length, duration: +offset.toFixed(3) };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/* ------------------------------------------------------------------ score, list, remove */

const KIND_OLD = { sama: "same", ganti: "substitute", hapus: "delete", tambah: "insert" };
/** Python score result with the old keys mapped (transkrip, salah, jumlahKata, cekTelinga, waktuDari, miripRef, ...). */
function normScore(r) {
  const cbe = (r.checkByEar ?? r.cekTelinga);
  return {
    ...r, transcript: r.transcript ?? r.transkrip, errors: r.errors ?? r.salah, wordCount: r.wordCount ?? r.jumlahKata,
    errorsNormal: r.errorsNormal ?? r.salahNormal, wordCountNormal: r.wordCountNormal ?? r.jumlahKataNormal,
    checkByEar: cbe && cbe.map((x) => ({ ...x, kind: KIND_OLD[x.kind ?? x.jenis] || x.kind || x.jenis, script: x.script ?? x.naskah, heard: x.heard ?? x.dengar })),
    timesFrom: { "kata.json": "words.json" }[r.timesFrom ?? r.waktuDari] || (r.timesFrom ?? r.waktuDari),
    similarityRef: r.similarityRef ?? r.miripRef, similarityCompare: r.similarityCompare ?? r.miripBanding, note: r.note ?? r.catatan,
    device: normDevice(r.device ?? r.perangkat),
  };
}

export async function score(inp, o = {}) {
  if (!inp) throw new Error(L`Usage: mgp voice score vo.wav --profile <name> --script script.txt [--compare other_voice.wav]`);
  const audio = path.resolve(inp);
  const base = audio.replace(/\.[^.\\/]+$/, "");
  const loc = partsLocation(audio);
  const man = fs.existsSync(loc.manifest) ? normalizeParts(JSON.parse(fs.readFileSync(loc.manifest, "utf8"))) : null;
  const args = ["score", "--audio", audio, "--lang", (o.language || man?.lang || "id").toLowerCase(), "--model", o.model || "small"];
  if (o.profile) { const { dir } = readProfile(o); args.push("--ref", firstExisting(path.join(dir, "reference.wav"), path.join(dir, "referensi.wav"))); }
  else if (o.ref) args.push("--ref", path.resolve(o.ref));
  if (o.compare) args.push("--compare", path.resolve(o.compare));
  const scriptArg = o.script || man?.script;
  const script = readText(scriptArg);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-score-"));
  try {
    let pron = { entries: [], sources: [] };
    if (script) {
      const f = path.join(tmp, "script.txt"); fs.writeFileSync(f, script.replace(/^﻿/, "")); args.push("--script", f);
      pron = loadPronunciations(o, scriptArg);
      const fn = path.join(tmp, "normal.json"); fs.writeFileSync(fn, JSON.stringify({ pronunciations: pron.entries })); args.push("--normal", fn);
      const fk = o.words ? path.resolve(o.words) : firstExisting(base + ".words.json", base + ".kata.json");
      if (fs.existsSync(fk)) args.push("--words", fk);
    }
    const r = normScore(await py(o, args, "torch"));
    r.pronunciations = pron.sources;
    // CHECK BY EAR -> sentence number (for --sentence), from the token count per part
    if (r.checkByEar && man) {
      const ends = []; let n = 0;
      for (const b of man.parts) { n += scriptTokens(b.text).length; ends.push(n); }
      const total = scriptTokens(script.replace(/^\s*\[[a-z]+\]\s*/gim, "")).length;
      for (const c of r.checkByEar) {
        if (n === total && c.token?.length) c.sentence = ends.findIndex((x) => c.token[0] < x) + 1;
        else if (c.start != null) c.sentence = man.parts.reduce((k, b, i) => (b.start != null && b.start <= c.start + 0.05 ? i + 1 : k), 1);
      }
    }
    return r;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

function printScore(r) {
  const out = [];
  const p = (x) => (100 * x).toFixed(1) + "%";
  if (r.wer != null) {
    out.push(L`raw WER        ${p(r.wer)} (${r.errors}/${r.wordCount} words), raw CER ${p(r.cer)}`);
    out.push(L`normalised WER ${p(r.werNormal)} (${r.errorsNormal}/${r.wordCountNormal} words), normalised CER ${p(r.cerNormal)}   <- the number for G2`);
    out.push(L`  normalised = lower case, no punctuation, numbers spelled out, joined/split words ("laptop mu" = "laptopmu"), non-standard spelling (aja = saja), pronunciations` + (r.pronunciations?.length ? " (" + r.pronunciations.map((s) => path.basename(s)).join(", ") + ")" : ""));
    const c = r.checkByEar || [];
    if (c.length) {
      out.push(L`CHECK BY EAR (${c.length} places): differences left after normalisation. Listen at these seconds (times from ${r.timesFrom === "words.json" ? "vo.words.json" : "ASR"}):`);
      for (const x of c) {
        const tm = x.start != null ? `${x.start.toFixed(2)}${x.end != null ? "-" + x.end.toFixed(2) : ""} s` : "?";
        const what = x.kind === "delete" ? L`"${x.script}" not heard` : x.kind === "insert" ? L`an extra word heard "${x.heard}"` : L`"${x.script}" heard as "${x.heard}"`;
        out.push(`  ${tm.padEnd(14)}${x.sentence ? L`sentence ${String(x.sentence).padEnd(3)} ` : ""}${what}`);
      }
      const ks = [...new Set(c.map((x) => x.sentence).filter(Boolean))];
      if (ks.length) out.push(L`  When it really is mispronounced, redo just that sentence: mgp voice speak <script> --profile <p> -o <vo.wav> --sentence ${ks.join(",")} --tries 4`);
      out.push(L`  When it is right after all (only the ASR spells it differently), add a variant to the project pronunciations.txt: word = spoken | variant`);
    } else out.push(L`CHECK BY EAR: none (every word matches after normalisation)`);
  }
  if (r.similarityRef != null) out.push(L`speaker similarity to the reference ${r.similarityRef}`);
  if (r.similarityCompare != null) out.push(L`similarity to the comparison ${r.similarityCompare}`);
  if (r.note) out.push(r.note);
  if (r.transcript) out.push(L`transcript: ${r.transcript}`);
  return out.join("\n");
}

export function list(o = {}) {
  const dir = profilesFolder(o);
  const profiles = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => hasProfile(path.join(dir, n))).map((n) => normalizeProfile(JSON.parse(fs.readFileSync(profileFile(path.join(dir, n)), "utf8")))) : [];
  const engines = {};
  for (const [k, m] of Object.entries(ENGINES)) engines[k] = { ...m, installed: !!pyFor(m.modules, o) };
  const asr = !!pyFor("faster_whisper", o);
  const el = !!(process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY);
  return { folder: dir, profiles, engines, fasterWhisper: asr, elevenlabsKey: el };
}

function printList(d) {
  const out = [L`Voice profiles (${d.folder}):`];
  if (!d.profiles.length) out.push(L`  (none yet) make one with: mgp voice clone recording.wav --name <profile>`);
  for (const p of d.profiles) out.push(L`  ${String(p.name).padEnd(16)} engine ${Object.keys(p.engine).join(", ")}; consent ${p.consent?.verified ? L`verified by ASR` : L`manual`} ${String(p.consent?.time || "").slice(0, 10)}; reference ${(+(p.reference?.duration || 0)).toFixed(1)} s`);
  out.push("", L`Engines:`);
  for (const [k, m] of Object.entries(d.engines)) {
    out.push(`  ${k.padEnd(11)} ${m.installed ? L`INSTALLED` : L`not yet`}  ${m.name}; ${m.license}; ${m.languages}`);
    if (!m.installed) out.push("              " + L`install (in render/):` + "\n" + m.install.split("\n").map((s) => "                " + s).join("\n") + "\n              " + L`model download: ${m.download}`);
  }
  out.push(`  faster-whisper ${d.fasterWhisper ? L`INSTALLED` : L`not yet`} ` + L`(consent check and WER score)`);
  out.push(`  elevenlabs  ${d.elevenlabsKey ? L`key ELEVENLABS_API_KEY present` : L`no key (use the ElevenLabs connector through Claude)`}`);
  return out.join("\n");
}

export function remove(name, o = {}) {
  if (!name) throw new Error(L`Usage: mgp voice remove <profile>`);
  const dir = path.join(profilesFolder(o), name);
  if (!hasProfile(dir)) throw new Error(L`profile "${name}" does not exist`);
  fs.rmSync(dir, { recursive: true, force: true });
  return { removed: dir };
}

/* ------------------------------------------------------------------ CLI */

const help = () => L`mgp voice: VO from a script with your own voice (local), or through ElevenLabs

  mgp voice template [--language id|en] [--name Budi] [-o reading.txt]   reading text of ~30 s (starts with the consent sentence)
  mgp voice inspect recording.wav [--language id|en] [--json]            duration, SNR, clipping, loudness, consent sentence
  mgp voice clone recording.wav --name <profile> [--engine chatterbox|openvoice] [--force] [--manual-consent [--statement "<owner consent outside the recording>"]]
  mgp voice speak script.txt --profile <profile> -o vo.wav [--language id|en] [--emotion neutral|warm|energetic|calm]
                   [--speed 1.0] [--engine chatterbox|openvoice] [--seed 1] [--no-align] [--tries N]
                   [--pronounce "Claude=Klod; brief=brif" | --pronounce pronunciations.txt] [--no-pronounce] [--dry-run]
        also writes vo.words.json (words + syllables) and vo.letters.json (letters) for captions and lip-sync,
        and vo.parts/ (one WAV per sentence + parts.json) so that one sentence can be redone:
  mgp voice speak script.txt -o vo.wav --sentence 3 [--seed N | --tries 5] [--force]
        redo sentence 3 only (also "2,5" or "2-4"); the other sentences are reused, same pauses, loudness +
        words.json/letters.json are written again. --tries N: N candidates, scored by ASR (normalised WER + duration),
        the best is used; every candidate is kept in vo.parts/candidates/. With --sentence the current take is scored too
        and only replaced by a better new candidate (scores are printed); --force: take the best new one anyway.
        --dry-run: show the sentence numbers + spoken text only, and warn about pronunciation entries no script word matches.
        Pronunciations: default voice/pronunciations-default.txt, then pronunciations.txt in the script folder/its parent/the working folder, then --pronounce.
        pronunciations.txt line: "Claude = Klod | klod, clod" (word = spoken spelling | ASR variants that count as right).
        Words may hold hyphens, apostrophes and any case ("ZIP-nya = zip nya", "Jum'at = Jumat"); whole words only.
  mgp voice elevenlabs script.txt --voice <voice_id> -o vo.wav [--model eleven_multilingual_v2] [--save-response response.json]
                   [--reuse response.json]   (needs env ELEVENLABS_API_KEY; without a key: the ElevenLabs connector)
  mgp voice score vo.wav --profile <profile> --script script.txt [--compare other.wav] [--words vo.words.json]
        raw and normalised WER/CER (numbers, punctuation, joined words, non-standard spelling, pronunciations), a CHECK BY EAR list
        (words that still differ + seconds + sentence number), speaker similarity. Default script: from vo.parts/parts.json.
  mgp voice list [--json]                                                profiles and installed engines
  mgp voice remove <profile>

  --folder <dir>   profile folder (default: ~/.mgp/voice-profiles, outside the skill; env MGP_VOICE_PROFILES)
  Negative values may be written "--lufs -18" as well as "--lufs=-18".
  --python <path>  Python with the engines installed (default: render/.venv, env MGP_PYTHON)
  Old names still work: mgp suara, periksa/klon/ucap/nilai/daftar/hapus, --nama, --profil, --naskah, --kalimat, --coba, --lafal, ...

Ethics: only clone your own voice or with the written consent of its owner (consent sentence at the start of the recording).
Do not imitate public figures. Profiles are kept locally and are not uploaded.`;

/** "--lufs -18" -> "--lufs=-18": Node parseArgs rejects values that start with "-" (P1-8). */
function joinNegative(argv, textOpts) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i], y = argv[i + 1];
    if (/^--[a-z-]+$/.test(x) && textOpts.has(x.slice(2)) && y != null && /^-\d/.test(y)) { out.push(`${x}=${y}`); i++; }
    else out.push(x);
  }
  return out;
}

/** subcommand aliases (old Indonesian names are also translated by names.mjs before this runs) */
const SUB = { periksa: "inspect", check: "inspect", klon: "clone", ucap: "speak", tts: "speak", daftar: "list", ls: "list", hapus: "remove", delete: "remove", nilai: "score", eval: "score", el: "elevenlabs", bantuan: "help" };

export async function cli(argv) {
  let a;
  argv = joinNegative(argv, new Set(["lufs", "seed", "speed", "stability"]));
  try {
    a = parseArgs({
      args: argv, allowPositionals: true, options: {
        o: { type: "string", short: "o" }, out: { type: "string" }, language: { type: "string" },
        name: { type: "string" }, engine: { type: "string" }, profile: { type: "string" },
        emotion: { type: "string" }, speed: { type: "string" }, seed: { type: "string" }, lufs: { type: "string" },
        voice: { type: "string" }, model: { type: "string" }, reuse: { type: "string" }, "save-response": { type: "string" }, stability: { type: "string" },
        script: { type: "string" }, compare: { type: "string" }, ref: { type: "string" }, folder: { type: "string" }, python: { type: "string" }, statement: { type: "string" },
        sentence: { type: "string" }, tries: { type: "string" }, pronounce: { type: "string" }, words: { type: "string" }, ar: { type: "string" },
        "dry-run": { type: "boolean" }, "no-pronounce": { type: "boolean" },
        force: { type: "boolean" }, "manual-consent": { type: "boolean" }, "add-engine": { type: "boolean" }, "no-align": { type: "boolean" }, "no-asr": { type: "boolean" },
        json: { type: "boolean" }, quiet: { type: "boolean" }, help: { type: "boolean", short: "h" },
      },
    });
  } catch (e) { console.error("mgp voice: " + e.message + "\n\n" + help()); process.exit(2); }
  const { values: v, positionals: pos } = a;
  const sub = SUB[pos[0]] || pos[0];
  if (v.help || !sub || sub === "help") { console.log(help()); return; }
  const o = {
    ...v, o: v.o || v.out, language: (v.language || "").toLowerCase() || undefined,
    manualConsent: v["manual-consent"], addEngine: v["add-engine"], noAlign: v["no-align"], noAsr: v["no-asr"],
    noPronounce: v["no-pronounce"], dryRun: v["dry-run"], saveResponse: v["save-response"],
  };
  const print = (r, text) => console.log(v.json ? JSON.stringify(r, null, 2) : text);
  try {
    if (sub === "template") {
      const tx = templateText(o.language || "id", o.name);
      if (o.o) { fs.writeFileSync(path.resolve(o.o), tx + "\n"); say(o, L`reading text → ${path.resolve(o.o)}`); }
      console.log(tx);
      if (!o.o) say(o, "\n" + L`Read the text above for ~30 seconds (quiet room, 20-30 cm from the microphone, no music), save WAV/MP3/M4A at 24-48 kHz.` + "\n" + L`Full guide: ${TEMPLATE}`);
    } else if (sub === "inspect") {
      const r = await inspect(pos[1], o);
      print(r, printInspect(r)); if (!r.ok) process.exitCode = 1;
    } else if (sub === "clone") {
      const r = await clone(pos[1], o); print(r, L`profile ${r.profile} → ${r.folder}`);
    } else if (sub === "speak") {
      const r = await speak(pos[1], o);
      if (r.dryRun) print(r, r.text);
      else print(r, [r.out, r.words, r.letters, L`parts per sentence: ${r.partsDir}`].filter(Boolean).join("\n"));
    } else if (sub === "elevenlabs") {
      const r = await elevenlabs(pos[1], o); print(r, `${r.out}\n${r.words}\n${r.letters}`);
    } else if (sub === "score") {
      const r = await score(pos[1], o);
      print(r, printScore(r));
    } else if (sub === "list") {
      const d = list(o); print(d, printList(d));
    } else if (sub === "remove") {
      const r = remove(pos[1], o); print(r, L`removed: ${r.removed}`);
    } else { console.error(L`mgp voice: unknown subcommand "${sub}"` + "\n\n" + help()); process.exitCode = 2; }
  } catch (e) {
    console.error((e.guide ? "" : "mgp voice: ") + e.message);
    process.exitCode = 1;
  }
}

// Old names (v2.3 / v2.4-dev).
export const MESIN = ENGINES, folderProfil = profilesFolder, teksTemplate = templateText, cekIzin = checkConsent;
export const periksa = inspect, cetakPeriksa = printInspect, klon = clone, pecahNaskah = splitScript;
export const uraiLafal = parsePronunciations, muatLafal = loadPronunciations, terapkanLafal = applyPronunciations, ucap = speak;
export const alignmentKeWaktu = alignmentToTimes, nilai = score, daftar = list, hapus = remove;
