// Device manager of mgp (Node side): machine profile, hardware video encoders, shared GPU lock.
// Python counterpart: py/device.py. Single threshold table: py/hardware-requirements.json.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FFMPEG } from "./ffmpeg.mjs";
import { env } from "./names.mjs";
import { L, lang } from "./i18n.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const GB = 1024 ** 3;
/** Number with d decimals (decimal comma in Indonesian, point in English). */
export const num = (x, d = 1) => { const s = Number(x).toFixed(d); return lang() === "id" ? s.replace(".", ",") : s; };

/** hardware-requirements.json with the old kebutuhan.json keys mapped to the new ones (both are accepted). */
export function normalizeRequirements(j) {
  if (!j || typeof j !== "object") return { margin_gb: 0.5, gpu_wait_seconds: 120, tasks: {}, recommendation: {} };
  const ren = (o, map) => {
    if (!o || typeof o !== "object") return o || {};
    const r = { ...o };
    for (const [a, b] of Object.entries(map)) if (r[b] == null && r[a] != null) { r[b] = r[a]; delete r[a]; }
    return r;
  };
  const t = ren(j, { _ket: "_desc", tunggu_gpu_detik: "gpu_wait_seconds", tugas: "tasks", rekomendasi: "recommendation" });
  const R = ren(t.recommendation, { suara: "voice", gambar: "image" });
  R.voice = ren(R.voice, { rtf_cpu_bawaan: "rtf_cpu_default", rtf_cuda_bawaan: "rtf_cuda_default", rtf_lemah: "rtf_weak", ram_kosong_min_gb: "free_ram_min_gb", _ket: "_desc" });
  R.image = ren(R.image, { ram_kosong_min_gb: "free_ram_min_gb", vram_penuh_gb: "vram_full_gb", _ket: "_desc" });
  R.render = ren(R.render, { ram_per_pekerja_gb: "ram_per_worker_gb", thread_per_pekerja: "threads_per_worker", pekerja_maks: "workers_max", pekerja_berbagi: "workers_shared", ram_pratinjau_skala_gb: "ram_preview_scale_gb", _ket: "_desc" });
  t.recommendation = R;
  t.tasks = t.tasks || {};
  return t;
}

let _table = null;
/** Contents of py/hardware-requirements.json (thresholds + memory estimates, one table for Node and Python). */
export function requirements() {
  if (!_table) {
    let j = null;
    try { j = JSON.parse(fs.readFileSync(path.join(here, "..", "py", "hardware-requirements.json"), "utf8")); } catch { /* defaults */ }
    _table = normalizeRequirements(j);
  }
  return _table;
}

function run(cmd, args, timeout = 8000) {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf8", timeout, windowsHide: true });
    return r.status === 0 ? r.stdout : null;
  } catch { return null; }
}

// ------------------------------------------------------------------ probe

export function ram() { return { totalGb: os.totalmem() / GB, freeGb: os.freemem() / GB }; }

export function cpu() {
  const c = os.cpus();
  return { name: (c[0] && c[0].model || "").trim(), threads: os.availableParallelism ? os.availableParallelism() : c.length, arch: os.arch() };
}

function nvidiaSmi() {
  if (process.platform === "win32") {
    const c = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "nvidia-smi.exe");
    if (fs.existsSync(c)) return c;
  }
  return "nvidia-smi";
}

export function gpuNvidia() {
  const out = run(nvidiaSmi(), ["--query-gpu=index,name,memory.total,memory.free,driver_version,encoder.stats.sessionCount", "--format=csv,noheader,nounits"])
    || run(nvidiaSmi(), ["--query-gpu=index,name,memory.total,memory.free,driver_version", "--format=csv,noheader,nounits"]);
  if (!out) return [];
  return out.trim().split(/\r?\n/).map((ln) => ln.split(",").map((s) => s.trim())).filter((p) => p.length >= 5).map((p) => ({
    vendor: "NVIDIA", name: p[1], index: +p[0], vramTotalGb: +(+p[2] / 1024).toFixed(2), vramFreeGb: +(+p[3] / 1024).toFixed(2), driver: p[4], source: "nvidia-smi",
  }));
}

const vendorOf = (n) => /nvidia|geforce|quadro|rtx/i.test(n) ? "NVIDIA" : /amd|radeon/i.test(n) ? "AMD" : /intel|arc|iris|uhd/i.test(n) ? "Intel" : /apple/i.test(n) ? "Apple" : "other";

export function gpuOther() {
  const h = [];
  if (process.platform === "win32") {
    const out = run("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }"], 15000);
    for (const n of (out || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) if (vendorOf(n) !== "NVIDIA") h.push({ vendor: vendorOf(n), name: n, source: "wmi" });
  } else if (process.platform === "darwin") {
    const out = run("system_profiler", ["SPDisplaysDataType"], 15000) || "";
    for (const m of out.matchAll(/Chipset Model:\s*(.+)/g)) h.push({ vendor: vendorOf(m[1]) === "other" ? "Apple" : vendorOf(m[1]), name: m[1].trim(), source: "system_profiler" });
    if (!h.length && os.arch() === "arm64") h.push({ vendor: "Apple", name: L`Apple Silicon (unified memory)`, source: "platform" });
  } else {
    const out = run("lspci", []) || "";
    for (const ln of out.split("\n")) if (/VGA|3D controller|Display/.test(ln)) {
      const n = ln.split(":").slice(2).join(":").trim();
      if (vendorOf(n) !== "NVIDIA") h.push({ vendor: vendorOf(n), name: n, source: "lspci" });
    }
  }
  return h;
}

// ------------------------------------------------------------------ hardware video encoders

/** H.264 encoder per --encoder kind, with quality arguments close to libx264 -crf (default 18). */
export const ENCODER = {
  cpu: { codec: "libx264", vendor: null },
  nvenc: { codec: "h264_nvenc", vendor: "NVIDIA" },
  qsv: { codec: "h264_qsv", vendor: "Intel" },
  amf: { codec: "h264_amf", vendor: "AMD" },
  videotoolbox: { codec: "h264_videotoolbox", vendor: "Apple" },
};
// try order for --encoder auto
const AUTO_ORDER = ["nvenc", "qsv", "amf", "videotoolbox"];

/**
 * ffmpeg arguments of a hardware H.264 encoder. crf = the libx264 --crf value (default 18); the equivalents were
 * calibrated with SSIM/PSNR against libx264 (see README, section --encoder).
 */
export function argsHw(kind, crf = 18) {
  if (kind === "nvenc") return ["-c:v", "h264_nvenc", "-preset", "p5", "-tune", "hq", "-rc", "vbr", "-cq", String(crf + 1), "-b:v", "0",
    "-spatial-aq", "1", "-aq-strength", "8", "-bf", "3", "-b_ref_mode", "middle", "-rc-lookahead", "20", "-profile:v", "high", "-pix_fmt", "yuv420p"];
  if (kind === "qsv") return ["-c:v", "h264_qsv", "-preset", "slower", "-global_quality", String(crf + 1), "-look_ahead_depth", "20",
    "-profile:v", "high", "-pix_fmt", "nv12"];
  if (kind === "amf") return ["-c:v", "h264_amf", "-usage", "transcoding", "-quality", "quality", "-rc", "cqp",
    "-qp_i", String(crf), "-qp_p", String(crf + 2), "-qp_b", String(crf + 4), "-profile:v", "high", "-pix_fmt", "yuv420p"];
  if (kind === "videotoolbox") return ["-c:v", "h264_videotoolbox", "-q:v", String(Math.max(1, Math.min(100, 100 - 2 * crf))), "-profile:v", "high", "-pix_fmt", "yuv420p"];
  return null;
}

let _encList = null;
/** Hardware H.264 encoders compiled into this ffmpeg (not necessarily working). */
export function availableEncoders() {
  if (_encList) return _encList;
  const out = run(FFMPEG, ["-hide_banner", "-encoders"], 15000) || "";
  _encList = {};
  for (const [j, e] of Object.entries(ENCODER)) _encList[j] = new RegExp("^\\s*V\\S*\\s+" + e.codec + "\\b", "m").test(out);
  for (const c of ["hevc_nvenc", "av1_nvenc", "hevc_qsv", "av1_qsv", "hevc_amf", "hevc_videotoolbox", "prores_videotoolbox"]) _encList[c] = new RegExp("^\\s*V\\S*\\s+" + c + "\\b", "m").test(out);
  return _encList;
}

const _tests = new Map();
/** Test-encode a small clip (driver/device may be missing although the encoder is compiled in). {ok, ms, error}. */
export function testEncoder(kind) {
  if (_tests.has(kind)) return _tests.get(kind);
  let r;
  if (kind === "cpu") r = { ok: true, ms: 0 };
  else if (!availableEncoders()[kind]) r = { ok: false, error: L`this ffmpeg has no ${ENCODER[kind].codec}` };
  else {
    const t0 = Date.now();
    const p = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "verbose", "-f", "lavfi", "-i", "testsrc2=s=320x240:r=30:d=0.5",
      "-vf", "format=rgb24", ...argsHw(kind), "-frames:v", "15", "-f", "null", "-"], { encoding: "utf8", timeout: 30000, windowsHide: true });
    const lines = (p.stderr || "").trim().split(/\r?\n/).map((x) => x.replace(/^(\[[^\]]*\]\s*)+/, "")).filter(Boolean);
    const core = lines.filter((x) => /driver|minimum|api version|not support|cannot load|no device|device creation|failed to (open|create)|dll|unsupported|out of memory/i.test(x));
    let error = (core.length ? core : lines.slice(-2)).slice(0, 2).join(" | ");
    const m = error.match(/minimum required Nvidia driver for nvenc is ([\d.]+)/i);
    if (m) error = L`NVIDIA driver too old for this ffmpeg (needs >= ${m[1]}); update the driver, or point MGP_FFMPEG to ffmpeg 7.x/8.0 [${error}]`;
    r = p.status === 0 ? { ok: true, ms: Date.now() - t0 } : { ok: false, error: error || (p.error && p.error.message) || L`code ${p.status}` };
  }
  _tests.set(kind, r);
  return r;
}

/**
 * Choose the encoder for an MP4 render. choice: auto|cpu|nvenc|qsv|amf|videotoolbox.
 * Returns { kind, codec, args (null = default libx264), reason, fellBack? }.
 */
export function pickEncoder(choice = "cpu", { workers = 1, crf = 18 } = {}) {
  choice = String(choice || "cpu").toLowerCase();
  if (choice === "libx264" || choice === "x264") choice = "cpu";
  if (choice === "cpu") return { kind: "cpu", codec: "libx264", args: null, reason: L`libx264 (CPU, deterministic)` };
  if (!ENCODER[choice] && choice !== "auto") throw new Error(L`unknown --encoder "${choice}" (auto, cpu, nvenc, qsv, amf, videotoolbox)`);
  const cands = choice === "auto" ? AUTO_ORDER.filter((j) => availableEncoders()[j]) : [choice];
  const failed = [];
  for (const j of cands) {
    if (j === "nvenc") {
      // NVENC uses a separate encoder chip and about 0.1-0.2 GB VRAM per session; it does not take the GPU lock,
      // but falls back to the CPU when VRAM is nearly full (e.g. in use by a voice/image model)
      const g = gpuNvidia()[0];
      const need = (requirements().recommendation?.render?.vram_nvenc_gb ?? 0.3) * Math.max(1, workers) / 2;
      if (g && g.vramFreeGb < need) { failed.push(L`nvenc: free VRAM ${num(g.vramFreeGb, 2)} GB, needs ~${num(need, 2)} GB`); continue; }
    }
    const u = testEncoder(j);
    if (u.ok) return { kind: j, codec: ENCODER[j].codec, args: argsHw(j, crf), reason: L`${ENCODER[j].codec} (${ENCODER[j].vendor}, test encode passed in ${u.ms} ms)` };
    failed.push(`${j}: ${u.error}`);
  }
  const why = failed.length ? failed.join("; ") : L`this ffmpeg has no hardware H.264 encoder`;
  return { kind: "cpu", codec: "libx264", args: null, reason: L`libx264 (CPU); hardware encoder cannot be used: ${why}`, fellBack: choice !== "auto" ? choice : "auto" };
}

// ------------------------------------------------------------------ GPU lock (same format as py/device.py)
// The lock file stays at <cache>/rekam/gpu.lock so that old and new tool versions still exclude each other.
// Written keys: {pid, task, start, host, lang}; the old keys tugas/mulai/bahasa are read too.

export function lockPath() {
  const e = env("MGP_GPU_LOCK");
  if (e) return e;
  if (process.platform === "win32") return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "rekam", "gpu.lock");
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "rekam", "gpu.lock");
}

export function pidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

/** {free, stale, corrupt, file, pid, task, start, host, lang}. */
export function lockStatus() {
  const f = lockPath();
  let d;
  try { d = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return e.code === "ENOENT" ? { free: true, file: f } : { free: false, corrupt: true, file: f }; }
  d = { ...d, task: d.task ?? d.tugas, start: d.start ?? d.mulai, lang: d.lang ?? d.bahasa };
  delete d.tugas; delete d.mulai; delete d.bahasa;
  const alive = (d.host && d.host !== os.hostname()) || pidAlive(d.pid);
  return { free: !alive, stale: !alive, file: f, ...d };
}

let _held = 0;
/** Try to take the GPU lock without waiting. */
export function tryLock(task) {
  if (_held) { _held++; return true; }
  const f = lockPath();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  for (let i = 0; i < 2; i++) {
    try {
      fs.writeFileSync(f, JSON.stringify({ pid: process.pid, task, start: +(Date.now() / 1000).toFixed(1), host: os.hostname(), lang: "node" }), { flag: "wx" });
      _held = 1;
      process.once("exit", releaseLock);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      const s = lockStatus();
      if (!s.stale && !s.corrupt) return false;
      try { const tmp = `${f}.stale.${process.pid}`; fs.renameSync(f, tmp); fs.rmSync(tmp, { force: true }); } catch {}
    }
  }
  return false;
}

/** Wait for the GPU lock at most `wait` seconds (default MGP_GPU_WAIT / 120). true when taken. Old option name: tunggu. */
export async function acquireLock(task, { wait, tunggu, say = (s) => process.stderr.write(s + "\n") } = {}) {
  if (wait == null) wait = tunggu;
  if (wait == null) wait = +(env("MGP_GPU_WAIT") ?? requirements().gpu_wait_seconds ?? 120);
  const t0 = Date.now();
  let told = false;
  for (;;) {
    if (tryLock(task)) { if (told) say("  " + L`GPU free after ${((Date.now() - t0) / 1000).toFixed(0)} s`); return true; }
    if ((Date.now() - t0) / 1000 >= wait) return false;
    if (!told) {
      const s = lockStatus();
      say("  " + L`GPU in use by '${s.task}' (PID ${s.pid}); waiting at most ${wait} s...`);
      told = true;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export function releaseLock() {
  if (!_held) return;
  if (--_held) return;
  const f = lockPath();
  try { const d = JSON.parse(fs.readFileSync(f, "utf8")); if (d.pid === process.pid) fs.rmSync(f, { force: true }); } catch {}
}

// ------------------------------------------------------------------ stored measurements (RTF etc.)

/** Measurements written by py/device.py (ukur.json next to the GPU lock; file name kept for old versions). */
export function readMeasurements() {
  try { return JSON.parse(fs.readFileSync(path.join(path.dirname(lockPath()), "ukur.json"), "utf8")); } catch { return {}; }
}

// Old names (v2.3 / v2.4-dev).
export const angka = num, tabel = requirements, gpuLain = gpuOther, encoderTersedia = availableEncoders, ujiEncoder = testEncoder;
export const pilihEncoder = pickEncoder, lokasiKunci = lockPath, pidHidup = pidAlive, statusKunci = lockStatus;
export const cobaKunci = tryLock, ambilKunci = acquireLock, lepasKunci = releaseLock, bacaUkur = readMeasurements;
