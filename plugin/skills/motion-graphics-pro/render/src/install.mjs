// mgp install voice|image|all (old: rekam pasang suara|gambar|semua): installer of the local engines, once per computer.
// Detect OS/GPU/RAM/disk/Python -> choose the PyTorch build -> venv on a short path -> locked packages
// (py/requirements-*.txt) -> model weights locked per commit + sha256 (py/model-manifest.json, resumable)
// -> install.json (locations read by voice/image) -> smoke test. Models are NOT in the ZIP.
// Old files are still read: pasang.json, pasang-status.json, rekam-syarat.json, zz_rekam_torch.pth, venv-suara/venv-gambar.
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { gpuNvidia, gpuOther, num } from "./device.mjs";
import { runPy, PY_DIR } from "./python.mjs";
import { home, defaults, legacyManual, venvPython, readConfig, writeConfig, statusFile, statusFileOld, logFile, configFile, WIN } from "./location.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GB = 1024 ** 3, MB = 1024 ** 2;
const TORCH = "2.6.0";
const MANIFEST = path.join(PY_DIR, "model-manifest.json");
const REQS = { voice: path.join(PY_DIR, "requirements-voice.txt"), openvoice: path.join(PY_DIR, "requirements-voice-openvoice.txt"), image: path.join(PY_DIR, "requirements-image.txt"), cutout: path.join(PY_DIR, "requirements-cutout.txt") };
const INDEX = {
  cu126: "https://download.pytorch.org/whl/cu126", cu118: "https://download.pytorch.org/whl/cu118",
  cpu: "https://download.pytorch.org/whl/cpu", "rocm6.2.4": "https://download.pytorch.org/whl/rocm6.2.4", pypi: null,
};
// estimated installed disk space (GB), measured from vsu/vgb on the test laptop + PyTorch wheel sizes
const DISK = { torchCuda: 4.6, torchRocm: 9.0, torchCpu: 0.9, packagesVoice: 1.3, packagesImage: 0.6, packagesCutout: 0.45, tempDownload: 2.8 };
/** old target / component names -> new */
const TARGET = { suara: "voice", voice: "voice", gambar: "image", image: "image", cutout: "cutout", potong: "cutout", rembg: "cutout", semua: "all", all: "all" };
/** targets of one CLI target ("all" = every engine; cutout = rembg + U2-Net, CPU, no torch) */
const targetsOf = (t) => (t === "all" ? ["voice", "image", "cutout"] : [t]);
const COMPONENT = { paket: "packages", uji: "smoke-test", test: "smoke-test" };

const say = (o, s) => { if (!o.quiet) process.stderr.write(s + "\n"); };

/** model-manifest.json with the old keys (komponen, berkas, ukuran, ukuranTotal, wajib, tata, ...) mapped to the new ones. */
export function normalizeManifest(j) {
  const comps = j.components || j.komponen || {};
  const out = {};
  for (const [id, c] of Object.entries(comps)) {
    const layout = c.layout ?? c.tata;
    out[id] = {
      ...c,
      target: TARGET[c.target] || c.target,
      required: c.required ?? c.wajib,
      name: c.name ?? c.nama,
      license: c.license ?? c.lisensi,
      layout: { datar: "flat", paket: "package" }[layout] || layout,
      _desc: c._desc ?? c._ket,
      files: (c.files || c.berkas || []).map((b) => ({ ...b, size: b.size ?? b.ukuran })),
      totalSize: c.totalSize ?? c.ukuranTotal,
    };
  }
  return { ...j, version: j.version ?? j.versi, components: out };
}
export const manifest = () => normalizeManifest(JSON.parse(fs.readFileSync(MANIFEST, "utf8")));

/* ================================================================== probe */

function run(cmd, args, timeout = 20000) {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf8", timeout, windowsHide: true });
    return r.status === 0 ? r.stdout : null;
  } catch { return null; }
}

function computeCap() {
  const exe = WIN ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "nvidia-smi.exe") : "nvidia-smi";
  const out = run(fs.existsSync(exe) ? exe : "nvidia-smi", ["--query-gpu=compute_cap", "--format=csv,noheader"], 8000);
  return out ? out.trim().split(/\r?\n/).map((s) => parseFloat(s)) : [];
}

function freeDisk(dir) {
  let d = path.resolve(dir);
  while (!fs.existsSync(d) && path.dirname(d) !== d) d = path.dirname(d);
  try { const s = fs.statfsSync(d); return (s.bavail * s.bsize) / GB; } catch { return null; }
}

const PY_CODE = "import sys,json,importlib.util as u;print(json.dumps({'v':list(sys.version_info[:3]),'exe':sys.executable,'venv':sys.prefix!=sys.base_prefix,'base':getattr(sys,'_base_executable',sys.executable),'ensurepip':u.find_spec('ensurepip') is not None,'bits':sys.maxsize>2**32}))";

/** Base Python (not a venv) >= 3.10; 3.12 first (the package lock is proven on 3.12). */
export function findBasePython(explicit) {
  const cands = [];
  if (explicit) cands.push([explicit]);
  const ev = env("MGP_BASE_PYTHON");
  if (ev) cands.push([ev]);
  if (WIN) cands.push(["py", "-3.12"], ["py", "-3.11"], ["py", "-3.10"], ["python"], ["python3"]);
  else cands.push(["python3.12"], ["python3.11"], ["python3.10"], ["python3"], ["python"]);
  const found = [];
  for (const [exe, ...pre] of cands) {
    if (WIN && /WindowsApps/i.test(exe)) continue; // the Microsoft Store alias opens the Store, not Python
    const out = run(exe, [...pre, "-c", PY_CODE], 20000);
    if (!out) continue;
    try {
      const j = JSON.parse(out.trim().split("\n").pop());
      if (WIN && /WindowsApps/i.test(j.exe)) continue;
      const realExe = j.venv ? j.base : j.exe;
      if (found.some((t) => t.exe === realExe)) continue;
      found.push({ exe: realExe, version: j.v.join("."), minor: j.v[1], major: j.v[0], ensurepip: j.ensurepip, bit64: j.bits });
    } catch { /* skip */ }
  }
  const ok = found.filter((t) => t.major === 3 && t.minor >= 10 && t.minor <= 12 && t.bit64);
  ok.sort((a, b) => b.minor - a.minor);
  return { choice: ok[0] || null, all: found };
}

/** Machine profile for the install decisions. */
export function probe(o = {}) {
  const cc = computeCap();
  const gpu = [...gpuNvidia().map((g, i) => ({ ...g, computeCap: cc[i] || null })), ...gpuOther()];
  const base = path.resolve(o.folder || home());
  return {
    os: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : process.platform === "linux" ? "linux" : process.platform,
    arch: os.arch(),
    gpu,
    ram: { totalGb: os.totalmem() / GB, freeGb: os.freemem() / GB },
    disk: { folder: base, freeGb: freeDisk(base) },
    python: findBasePython(o.basePython),
  };
}

/* ================================================================== decisions (pure function, testable with a fake probe) */

const driverVer = (s) => { const [a, b = 0] = String(s || "0").split(".").map(Number); return a + b / 100; };

export function pythonAdvice(osn) {
  if (osn === "windows") return L`Install Python 3.12 (64-bit): winget install -e --id Python.Python.3.12  (or python.org > Downloads, tick "Add python.exe to PATH"), then open a new terminal.`;
  if (osn === "macos") return L`Install Python 3.12: brew install python@3.12  (or the installer from python.org).`;
  return L`Install Python 3.12 + venv: sudo apt install python3.12 python3.12-venv  (Ubuntu 24.04; Ubuntu 22.04: sudo apt install python3.10-venv; Fedora: sudo dnf install python3.12).`;
}

/** Choose the PyTorch build + whether local voice/image is feasible + disk needs. */
export function decide(p, o = {}) {
  const nv = p.gpu.find((g) => g.vendor === "NVIDIA");
  const amd = p.gpu.find((g) => g.vendor === "AMD");
  const notes = [];
  let build, reason, supported = true;

  if (p.os === "macos" && p.arch === "arm64") { build = "pypi"; reason = L`Apple Silicon: the PyPI wheel already brings MPS (Metal GPU)`; }
  else if (p.os === "macos") { supported = false; build = null; reason = L`PyTorch ${TORCH} has no wheel for Intel Macs (x86_64)`; }
  else if (p.os === "windows" && p.arch !== "x64") { supported = false; build = null; reason = L`PyTorch ${TORCH} has no Windows ${p.arch} wheel`; }
  else if (p.os === "linux" && p.arch === "arm64") { build = "pypi"; reason = L`Linux ARM64: PyPI wheel (CPU)`; }
  else if (p.os !== "windows" && p.os !== "linux") { supported = false; build = null; reason = L`OS ${p.os} is not supported`; }
  else if (o.cpu) { build = "cpu"; reason = L`--cpu requested`; }
  else if (nv) {
    const d = driverVer(nv.driver), cc = nv.computeCap;
    const min126 = p.os === "windows" ? 528.33 : 525.60, min118 = p.os === "windows" ? 452.39 : 450.80;
    if ((nv.vramTotalGb || 0) < 2) { build = "cpu"; reason = L`VRAM ${num(nv.vramTotalGb || 0)} GB is too small for any model; the CPU build saves disk space`; }
    else if (cc && cc < 3.7) { build = "cpu"; reason = L`GPU compute capability ${cc} < 3.7 is not supported by PyTorch ${TORCH}`; }
    else if (d >= min126 && (!cc || cc >= 5.0)) { build = "cu126"; reason = L`NVIDIA driver ${nv.driver} >= ${min126} (CUDA 12.6)`; }
    else if (d >= min118) { build = "cu118"; reason = cc && cc < 5.0 ? L`compute capability ${cc}: CUDA 11.8 still supports it` : L`driver ${nv.driver} < ${min126}: using CUDA 11.8 (update the driver to >= ${min126} for CUDA 12.6)`; }
    else { build = "cpu"; reason = L`NVIDIA driver ${nv.driver} too old (< ${min118}); update the driver, then run again for the CUDA build`; }
  } else if (amd && p.os === "linux") { build = "rocm6.2.4"; reason = L`AMD GPU on Linux: ROCm 6.2.4 (not tested in this package yet)`; notes.push(L`ROCm not tested yet; if it fails, run again with --cpu`); }
  else { build = "cpu"; reason = amd ? L`AMD GPU on Windows is not supported by PyTorch (DirectML is not used): CPU` : p.gpu.some((g) => g.vendor === "Intel") ? L`Intel GPU: CPU build (XPU not tested yet)` : L`no supported GPU: CPU`; }

  const vram = nv ? nv.vramTotalGb || 0 : 0;
  const ramT = p.ram.totalGb;

  // voice: Chatterbox fp32 needs ~3.7 GB free VRAM (hardware-requirements.json); RAM ~4.5 GB
  const voice = { possible: supported, notes: [] };
  if (supported) {
    voice.device = build.startsWith("cu") && vram + 0.1 >= 3.5 ? "cuda" : build.startsWith("rocm") ? L`rocm (through the cuda API; VRAM not readable, the device manager decides)` : p.os === "macos" ? "mps" : "cpu";
    if (build.startsWith("cu") && vram + 0.1 < 3.5) voice.notes.push(L`VRAM ${num(vram)} GB < 3.5 GB: Chatterbox on the CPU (faster-whisper can still use the GPU)`);
    if (ramT < 8) { voice.notes.push(L`total RAM ${num(ramT)} GB < 8 GB: the local clone will be very slow; suggest ElevenLabs or your own recording`); voice.weak = true; }
    if (voice.device === "cpu") voice.notes.push(L`CPU: about 3-10 minutes per 30 seconds of VO`);
  } else voice.notes.push(L`local clone not possible on this machine: use ElevenLabs or your own recording`);

  // local image (FLUX.2 klein 4B GGUF): the text encoder needs ~11 GB free RAM, the transformer 1.5-3.5 GB VRAM
  const image = { possible: supported, notes: [] };
  if (supported) {
    if (build.startsWith("cu") && vram + 0.1 >= 3.5) image.device = "cuda";
    else if (build.startsWith("cu") && vram >= 1.5) image.device = "cuda+offload";
    else if (p.os === "macos") image.device = "mps";
    else if (build.startsWith("rocm")) image.device = "rocm";
    else image.device = "cpu";
    if (ramT < 16) { image.possible = false; image.notes.push(L`total RAM ${num(ramT)} GB < 16 GB: the text encoder needs ~11 GB free; use the free cloud (mgp image --source free-cloud)`); }
    if (image.device === "cpu") { image.slow = true; image.notes.push(L`no GPU: about 10-30 minutes per image; the free cloud is much faster`); }
    if (image.device === "mps" && ramT < 24) { image.possible = false; image.notes.push(L`Apple Silicon < 24 GB unified memory: use the free cloud`); }
  } else image.notes.push(L`local image not possible: use the free cloud (mgp image --source free-cloud)`);

  // cutout (rembg + U2-Net through onnxruntime): CPU only, no torch, so it works wherever Python 3.10-3.12 does
  const cutout = { possible: true, device: "cpu", notes: [] };
  if (ramT < 4) cutout.notes.push(L`total RAM ${num(ramT)} GB < 4 GB: rembg may run out of memory on large frames`);

  const torchGb = !build ? 0 : build.startsWith("cu") ? DISK.torchCuda : build.startsWith("rocm") ? DISK.torchRocm : p.os === "macos" ? 0.9 : DISK.torchCpu;
  const m = (() => { try { return manifest().components; } catch { return {}; } })();
  const mGb = (k) => (m[k] ? m[k].totalSize / GB : 0);
  const need = {
    voice: torchGb + DISK.packagesVoice + mGb("chatterbox") + mGb("whisper-small") + (o.openvoice ? mGb("openvoice") : 0),
    image: DISK.packagesImage + mGb("flux2-klein-4b"), // torch is borrowed from the voice venv when present
    imageTorch: torchGb,
    cutout: DISK.packagesCutout + mGb("u2net"),
  };
  const py = p.python && p.python.choice;
  const python = py
    ? { ok: py.ensurepip, exe: py.exe, version: py.version, advice: !py.ensurepip ? (p.os === "linux" ? L`venv/ensurepip module missing: sudo apt install python3.${py.minor}-venv` : L`ensurepip module missing; reinstall Python from python.org`) : py.minor !== 12 ? L`Python ${py.version} is used; the package lock is proven on 3.12. If pip fails: ${pythonAdvice(p.os)}` : null }
    : { ok: false, advice: pythonAdvice(p.os) + (p.python && p.python.all.length ? L` (found ${p.python.all.map((t) => t.version).join(", ")}; needs 3.10-3.12 64-bit)` : "") };
  return { os: p.os, arch: p.arch, supported, torch: { build, index: build ? INDEX[build] : null, version: TORCH, reason }, python, voice, image, cutout, needGb: need, freeDiskGb: p.disk.freeGb, notes };
}

/* ================================================================== status (for --detach and --status) */

const STEP_OLD = { mengunduh: "downloading", selesai: "done", memasang: "installing", membuat: "creating", berjalan: "running", gagal: "failed", mulai: "start" };
/** Status file with the old pasang-status.json keys mapped (langkah, komponen, selesai, galat, uji, mulai, diperbarui). */
function normalizeStatus(s) {
  if (!s || typeof s !== "object") return null;
  if (s.components || s.step || s.done != null) return s;
  const comps = {};
  for (const [k, v] of Object.entries(s.komponen || {})) comps[k] = { ...v, status: STEP_OLD[v.status] || v.status, file: v.file ?? v.berkas };
  return {
    pid: s.pid, target: (s.target || []).map((t) => TARGET[t] || t), start: s.mulai, args: s.argumen, step: STEP_OLD[s.langkah] || s.langkah,
    components: comps, done: s.selesai, ok: s.ok, error: s.galat, test: s.uji, updated: s.diperbarui,
  };
}

let _status = null, _lastWrite = 0;
function statusRead() {
  for (const f of [statusFile(), statusFileOld()]) {
    try { return normalizeStatus(JSON.parse(fs.readFileSync(f, "utf8"))); } catch { /* next */ }
  }
  return null;
}
function statusWrite(force = false) {
  if (!_status) return;
  const now = Date.now();
  if (!force && now - _lastWrite < 1000) return;
  _lastWrite = now;
  _status.updated = new Date().toISOString();
  try { fs.mkdirSync(home(), { recursive: true }); fs.writeFileSync(statusFile() + ".tmp", JSON.stringify(_status, null, 1)); fs.renameSync(statusFile() + ".tmp", statusFile()); } catch { /* status is optional */ }
}
function step(o, name, data = {}) {
  if (_status) { _status.step = name; _status.components[name] = { ..._status.components[name], ...data }; statusWrite(true); }
}
export function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } }

/* ================================================================== download (resumable + sha256) */

function shaCache() { try { return JSON.parse(fs.readFileSync(path.join(home(), "sha-cache.json"), "utf8")); } catch { return {}; } }
function saveShaCache(c) { try { fs.mkdirSync(home(), { recursive: true }); fs.writeFileSync(path.join(home(), "sha-cache.json"), JSON.stringify(c)); } catch { /* */ } }

/** sha256 of a file (cached per path+size+mtime so that adopt/re-checks do not hash GBs again). */
export async function sha256File(f, { cache = true } = {}) {
  const st = fs.statSync(f);
  const key = `${path.resolve(f)}|${st.size}|${Math.floor(st.mtimeMs)}`;
  const c = cache ? shaCache() : {};
  if (c[key]) return c[key];
  const h = crypto.createHash("sha256");
  await new Promise((res, rej) => fs.createReadStream(f, { highWaterMark: 8 * MB }).on("data", (d) => h.update(d)).on("end", res).on("error", rej));
  const hex = h.digest("hex");
  if (cache) { const c2 = shaCache(); c2[key] = hex; saveShaCache(c2); }
  return hex;
}

/**
 * Download url -> dest with resume (Range into dest.part), check size + sha256, retry when it breaks.
 * onProgress(bytesSoFar, total). Returns "present" (already matching) or "downloaded".
 * Old option names (ukuran, onMaju, coba, diam, idleDetik) are accepted too.
 */
export async function downloadFile(url, dest, opt = {}) {
  const size = opt.size ?? opt.ukuran, sha256 = opt.sha256, onProgress = opt.onProgress ?? opt.onMaju;
  const tries = opt.tries ?? opt.coba ?? 12, quiet = opt.quiet ?? opt.diam ?? true, idleSeconds = opt.idleSeconds ?? opt.idleDetik ?? 60;
  if (fs.existsSync(dest) && (!size || fs.statSync(dest).size === size)) {
    if (!sha256 || (await sha256File(dest)) === sha256) return "present";
    fs.rmSync(dest); // wrong content
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const part = dest + ".part";
  const baseHdr = {};
  if (process.env.HF_TOKEN && /huggingface\.co/.test(url)) baseHdr.Authorization = "Bearer " + process.env.HF_TOKEN;
  let badHash = 0, lastError = null;
  for (let i = 0; i < tries; i++) {
    let start = fs.existsSync(part) ? fs.statSync(part).size : 0;
    if (size && start > size) { fs.rmSync(part); start = 0; }
    if (!size || start < size) {
      const ac = new AbortController();
      let idle = setTimeout(() => ac.abort(), idleSeconds * 1000);
      try {
        const res = await fetch(url, { headers: { ...baseHdr, ...(start ? { Range: `bytes=${start}-` } : {}) }, redirect: "follow", signal: ac.signal });
        if (res.status === 416 && size && start === size) { /* already complete */ }
        else if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        else {
          if (start && res.status === 200) start = 0; // server ignored Range: start over
          const ws = fs.createWriteStream(part, { flags: start ? "a" : "w" });
          let n = start;
          try {
            for await (const ch of res.body) {
              clearTimeout(idle); idle = setTimeout(() => ac.abort(), idleSeconds * 1000);
              if (!ws.write(ch)) await new Promise((r) => ws.once("drain", r));
              n += ch.length;
              if (onProgress) onProgress(n, size);
            }
          } finally { await new Promise((r) => ws.end(r)); }
        }
      } catch (e) {
        lastError = e;
        clearTimeout(idle);
        if (!quiet) process.stderr.write("  " + L`retry ${i + 1}/${tries} ${path.basename(dest)}: ${String(e.message || e).slice(0, 120)}` + "\n");
        await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * (i + 1))));
        continue;
      }
      clearTimeout(idle);
    }
    const realSize = fs.statSync(part).size;
    if (size && realSize < size) continue; // broke off in the middle without an error: continue
    if (sha256) {
      const h = await sha256File(part, { cache: false });
      if (h !== sha256) {
        fs.rmSync(part);
        if (++badHash >= 2) throw new Error(L`sha256 mismatch for ${path.basename(dest)} (got ${h.slice(0, 12)}..., expected ${sha256.slice(0, 12)}...)`);
        continue;
      }
    }
    fs.renameSync(part, dest);
    return "downloaded";
  }
  throw new Error(L`failed to download ${url}: ${lastError ? lastError.message : L`keeps breaking off`}`);
}

/* ================================================================== model locations per component */

// a file with its own "url" (e.g. a GitHub release asset) is downloaded from there; otherwise Hugging Face repo@rev
const fileUrl = (b) => b.url || `https://huggingface.co/${b.repo}/resolve/${b.rev}/${b.path.split("/").map(encodeURIComponent).join("/")}`;

/** Target path of one manifest file in the component folder (flat: <folder>/<path>; hf: Hugging Face cache). */
function target(comp, b, dirComp) {
  if (comp.layout === "hf") return path.join(dirComp, "models--" + b.repo.replace("/", "--"), "snapshots", b.rev, ...b.path.split("/"));
  return path.join(dirComp, ...b.path.split("/"));
}

/** Model folder of a component under `dirModel` (flat: model/<folder>; hf: model/hf). */
const componentDir = (comp, dirModel) => path.join(dirModel, comp.folder);

function writeHfRef(comp, dirComp) {
  if (comp.layout !== "hf") return;
  for (const b of comp.files) {
    const ref = path.join(dirComp, "models--" + b.repo.replace("/", "--"), "refs", "main");
    fs.mkdirSync(path.dirname(ref), { recursive: true });
    if (!fs.existsSync(ref) || fs.readFileSync(ref, "utf8").trim() !== b.rev) fs.writeFileSync(ref, b.rev);
  }
}

/** File status of a component in one folder: {complete, present, count, bytes, total, partial, bad} (size check; sha256 only with verify). */
async function componentStatus(comp, dirComp, { verify = false } = {}) {
  let bytes = 0, present = 0, partial = 0;
  const bad = [];
  for (const b of comp.files) {
    const f = target(comp, b, dirComp);
    if (fs.existsSync(f) && fs.statSync(f).size === b.size) {
      if (verify && (await sha256File(f)) !== b.sha256) { bad.push(b.path); continue; }
      present++; bytes += b.size;
    } else if (fs.existsSync(f + ".part")) { partial++; bytes += Math.min(b.size, fs.statSync(f + ".part").size); }
  }
  return { complete: present === comp.files.length, present, count: comp.files.length, bytes, total: comp.totalSize, partial, bad };
}

async function downloadComponent(name, comp, dirComp, o) {
  const total = comp.totalSize;
  let done = 0;
  const t0 = Date.now();
  step(o, name, { status: "downloading", bytes: 0, total });
  let lastPrint = 0;
  for (const b of comp.files) {
    const f = target(comp, b, dirComp);
    const r = await downloadFile(fileUrl(b), f, {
      size: b.size, sha256: b.sha256, quiet: o.quiet,
      onProgress: (n) => {
        const now = done + n;
        if (_status) { _status.components[name] = { status: "downloading", bytes: now, total, file: b.path }; statusWrite(); }
        if (!o.quiet && Date.now() - lastPrint > 5000) {
          lastPrint = Date.now();
          process.stderr.write(`  ${name}: ${(100 * now / total).toFixed(0)}% (${(now / MB).toFixed(0)}/${(total / MB).toFixed(0)} MB, ${b.path})\n`);
        }
      },
    });
    done += b.size;
    if (r === "present") say(o, "  " + L`${name}: ${b.path} already present (sha256 matches)`);
  }
  writeHfRef(comp, dirComp);
  step(o, name, { status: "done", bytes: total, total });
  say(o, "  " + L`${name}: complete (${num(total / GB, 2)} GB, ${Math.round((Date.now() - t0) / 1000)} s)`);
}

/* ================================================================== Python / pip */

function runLogged(o, exe, args, { env: extra } = {}) {
  return new Promise((res, rej) => {
    say(o, `  $ ${path.basename(exe)} ${args.join(" ").slice(0, 200)}`);
    const p = spawn(exe, args, { env: { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: "1", PYTHONUTF8: "1", ...extra }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let tail = "";
    const write = (d) => { const s = d.toString(); tail = (tail + s).slice(-3000); if (!o.quiet && o.verbose) process.stderr.write(s); };
    p.stdout.on("data", write); p.stderr.on("data", write);
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res(tail) : rej(new Error(L`${path.basename(exe)} ${args.slice(0, 3).join(" ")} failed (${c}):` + "\n" + tail.trim().split("\n").slice(-12).join("\n")))));
  });
}

function venvInfo(py) {
  if (!py || !fs.existsSync(py)) return null;
  const out = run(py, ["-c", "import sys,sysconfig,json,importlib.metadata as m\ntry: t=m.version('torch')\nexcept Exception: t=None\nprint(json.dumps({'v':'%d.%d.%d'%sys.version_info[:3],'minor':sys.version_info[1],'purelib':sysconfig.get_paths()['purelib'],'torch':t}))"], 30000);
  try { return JSON.parse(out.trim().split("\n").pop()); } catch { return null; }
}

const buildOf = (torchVer) => !torchVer ? null : /\+cu(\d+)/.test(torchVer) ? "cu" + /\+cu(\d+)/.exec(torchVer)[1] : /\+rocm/.test(torchVer) ? /\+(rocm[\d.]+)/.exec(torchVer)[1] : /\+cpu/.test(torchVer) ? "cpu" : "pypi";

/** Find a wheel in the PyTorch index (URL + sha256) so that it can be downloaded with resume; null when not found. */
async function findWheel(index, pkg, cp, osn, arch) {
  try {
    const res = await fetch(`${index}/${pkg}/`, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return null;
    const html = await res.text();
    const plat = osn === "windows" ? /win_amd64/ : arch === "arm64" ? /linux.*aarch64/ : /linux.*x86_64/;
    for (const m of html.matchAll(/href="([^"]+)"[^>]*>([^<]+\.whl)</g)) {
      const name = m[2];
      if (!name.startsWith(`${pkg}-${TORCH}`) || !name.includes(`-cp${cp}-cp${cp}-`) || !plat.test(name)) continue;
      const sha = /#sha256=([0-9a-f]{64})/.exec(m[1]);
      const url = new URL(m[1].replace(/#.*$/, ""), `${index}/${pkg}/`).href;
      return { name: decodeURIComponent(name), url, sha256: sha ? sha[1] : null };
    }
  } catch { /* */ }
  return null;
}

/** Install torch (+torchaudio) into the venv. Big wheels are downloaded by us (resume + sha256), then pip installs them. */
async function installTorch(o, py, dec, { audio }) {
  const pkgs = audio ? ["torch", "torchaudio"] : ["torch"];
  const build = dec.torch.build;
  const cp = String(venvInfo(py).v.split(".").slice(0, 2).join(""));
  if (build === "pypi") {
    await runLogged(o, py, ["-m", "pip", "install", ...pkgs.map((p) => `${p}==${TORCH}`)]);
    return;
  }
  const whl = [];
  const dlDir = path.join(home(), "downloads");
  for (const p of pkgs) {
    const w = await findWheel(dec.torch.index, p, cp, dec.os, dec.arch);
    if (!w) { whl.length = 0; break; }
    // reuse a wheel that is already there (e.g. from a manual install) when its sha256 matches
    const local = [path.join(dlDir, w.name), path.join(home(), "unduh", w.name), path.join(os.homedir(), "vsu-whl", build, w.name)].find((f) => fs.existsSync(f));
    const f = local && w.sha256 && (await sha256File(local)) === w.sha256 ? local : path.join(dlDir, w.name);
    if (f !== local) {
      step(o, "torch", { status: "downloading", file: w.name });
      const t0 = Date.now();
      await downloadFile(w.url, f, { sha256: w.sha256, quiet: o.quiet, onProgress: (n) => { if (_status) { _status.components.torch = { status: "downloading", bytes: n, file: w.name }; statusWrite(); } } });
      say(o, "  " + L`${w.name} downloaded (${Math.round((Date.now() - t0) / 1000)} s)`);
    } else say(o, "  " + L`using the local wheel ${f}`);
    whl.push(f);
  }
  step(o, "torch", { status: "installing" });
  if (whl.length) await runLogged(o, py, ["-m", "pip", "install", ...whl, "--extra-index-url", dec.torch.index]);
  else await runLogged(o, py, ["-m", "pip", "install", ...pkgs.map((p) => `${p}==${TORCH}`), "--index-url", dec.torch.index]);
  if (!o.keepWheels) for (const f of whl) if (f.startsWith(dlDir)) try { fs.rmSync(f); } catch { /* */ }
}

const textSha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16);
const MARK_OLD_KEY = { voice: "suara", image: "gambar", openvoice: "openvoice" };

/** pip install --no-deps -r <requirements> (skipped when the marker in the venv matches). Old marker rekam-syarat.json is read too. */
async function installRequirements(o, py, venv, file, key) {
  const mark = path.join(venv, "mgp-requirements.json"), markOld = path.join(venv, "rekam-syarat.json");
  let t = {}, old = {};
  try { t = JSON.parse(fs.readFileSync(mark, "utf8")); } catch { /* */ }
  try { old = JSON.parse(fs.readFileSync(markOld, "utf8")); } catch { /* */ }
  const sha = textSha(file);
  if ((t[key] === sha || old[MARK_OLD_KEY[key]] === sha) && !o.retry) { say(o, "  " + L`packages ${path.basename(file)} already installed`); return; }
  step(o, "packages-" + key, { status: "installing" });
  await runLogged(o, py, ["-m", "pip", "install", "--no-deps", "-r", file]);
  t[key] = sha;
  fs.writeFileSync(mark, JSON.stringify(t, null, 1));
  step(o, "packages-" + key, { status: "done" });
}

async function createVenv(o, dec, dir) {
  if (fs.existsSync(venvPython(dir))) return venvPython(dir);
  if (!dec.python.ok) throw new Error(dec.python.advice);
  // Windows without Long Paths: the deepest torch/diffusers files are about 190 characters below the venv; MAX_PATH 260
  if (WIN && dir.length > PATH_LIMIT && !longPathsOn()) {
    throw new Error(L`venv path too long for Windows without Long Paths (${dir.length} > ${PATH_LIMIT} characters): ${dir}` + "\n" +
      L`pip will fail with "No such file or directory" on the deepest torch/diffusers files. Use a short --folder (e.g. C:\\mgp) or enable Long Paths (admin PowerShell: New-ItemProperty -Path HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force).`);
  }
  step(o, "venv", { status: "creating", folder: dir });
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  await runLogged(o, dec.python.exe, ["-m", "venv", dir]);
  return venvPython(dir);
}

const PATH_LIMIT = 60;
function longPathsOn() {
  const out = run("reg", ["query", "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem", "/v", "LongPathsEnabled"], 8000) || "";
  return /LongPathsEnabled\s+REG_DWORD\s+0x1\b/.test(out);
}

/* ================================================================== detect existing installs */

const PTH = "zz_mgp_torch.pth", PTH_OLD = "zz_rekam_torch.pth";
/** The .pth that borrows torch from the voice venv: an existing old one is kept, new installs get the new name. */
const pthIn = (purelib) => { const o = path.join(purelib, PTH_OLD); return fs.existsSync(o) || fs.existsSync(o + ".off") || fs.existsSync(o + ".mati") ? o : path.join(purelib, PTH); };

/** Candidates per part: env, install.json, default locations, old manual install (vsu/vgb). */
function candidates(base) {
  const c = readConfig(), b = defaults(base), M = legacyManual();
  const u = (...xs) => [...new Set(xs.filter(Boolean))];
  return {
    pythonVoice: u(env("MGP_PYTHON"), c.voice && c.voice.python, venvPython(b.venvVoice), M.pythonVoice),
    pythonImage: u(env("MGP_IMAGE_PYTHON"), c.image && c.image.python, venvPython(b.venvImage), M.pythonImage),
    pythonCutout: u(env("MGP_CUTOUT_PYTHON"), c.cutout && c.cutout.python, venvPython(b.venvCutout), M.pythonCutout),
    chatterbox: u(env("MGP_CHATTERBOX_DIR"), c.model && c.model.chatterbox, b.chatterbox, M.chatterbox),
    openvoice: u(env("MGP_OPENVOICE_DIR"), c.model && c.model.openvoice, b.openvoice, M.openvoice),
    "whisper-small": u(env("MGP_WHISPER_CACHE"), c.model && c.model.whisper, b.hf, M.whisper),
    "flux2-klein-4b": u(env("MGP_IMAGE_MODEL"), c.model && c.model.hf, b.hf, M.hf),
    u2net: u(process.env.REMBG_HOME, c.model && c.model.rembg, b.rembg, M.rembg),
  };
}

/** Origin of one location: "mgp install" (default location), "adopted" (recorded), "env", "old manual" (vsu/vgb), "other". */
function sourceLabel(p, base) {
  const c = readConfig(), M = legacyManual(), b = defaults(base);
  const recorded = [c.voice && c.voice.python, c.image && c.image.python, c.cutout && c.cutout.python, ...Object.values(c.model || {})];
  const isDefault = Object.values(b).includes(p) || [venvPython(b.venvVoice), venvPython(b.venvImage), venvPython(b.venvCutout)].includes(p);
  if (recorded.includes(p)) return (c.voice && c.voice.adopted) || (c.image && c.image.adopted) || (c.cutout && c.cutout.adopted) ? (isDefault ? "mgp install" : "adopted") : "mgp install";
  if ([...["MGP_PYTHON", "MGP_IMAGE_PYTHON", "MGP_CUTOUT_PYTHON", "MGP_CHATTERBOX_DIR", "MGP_OPENVOICE_DIR", "MGP_WHISPER_CACHE", "MGP_IMAGE_MODEL"].map((k) => env(k)), process.env.REMBG_HOME].includes(p)) return "env";
  if (isDefault) return "mgp install";
  if (Object.values(M).includes(p)) return "old manual";
  return "other";
}

function venvModules(py, tgt) {
  const out = run(py, ["-I", path.join(PY_DIR, "install_test.py"), "module", "--target", tgt], 60000);
  try { const j = JSON.parse(out.trim().split("\n").pop()); return { ...j, modules: j.modules ?? j.modul }; } catch { return null; }
}

/** Full status per target (changes nothing). */
export async function checkStatus(tgt, o = {}) {
  tgt = TARGET[tgt] || tgt;
  const base = path.resolve(o.folder || home());
  const M = manifest().components;
  const C = candidates(base);
  const st = statusRead();
  const running = st && !st.done && st.pid && pidAlive(st.pid) ? st : null;
  const out = { home: home(), config: fs.existsSync(configFile()) ? configFile() : null, background: null, target: {} };
  if (st) out.background = { pid: st.pid, alive: !!running, done: !!st.done, ok: st.ok, error: st.error, step: st.step, start: st.start, updated: st.updated, log: logFile(), test: st.test };
  const targets = targetsOf(tgt);
  for (const t of targets) {
    const r = { ready: true, parts: [] };
    // python
    const pyList = t === "voice" ? C.pythonVoice : t === "cutout" ? C.pythonCutout : C.pythonImage;
    let pyPick = null;
    for (const py of pyList) {
      if (!fs.existsSync(py)) continue;
      const m = venvModules(py, t);
      if (!m || !m.modules) continue;
      const missing = Object.entries(m.modules).filter(([, v]) => !v).map(([k]) => k);
      pyPick = { python: py, source: sourceLabel(py, base), version: m.python, torch: m.torch, build: buildOf(m.torch), missing, ready: !missing.length };
      if (!missing.length) break;
    }
    const pyStat = pyPick ? { name: "python", status: pyPick.ready ? "installed" : "partial", ...pyPick } : { name: "python", status: "missing" };
    if (running && (running.target || []).includes(t) && /venv|torch|packages|paket/.test(running.step || "") && pyStat.status !== "installed") pyStat.status = "installing";
    r.parts.push(pyStat);
    if (pyStat.status !== "installed") r.ready = false;
    // models
    for (const [name, comp] of Object.entries(M)) {
      if (comp.target !== t) continue;
      if (comp.layout === "package") { r.parts.push({ name, status: pyStat.status === "installed" ? "installed" : "missing", note: comp._desc }); continue; }
      let pick = null;
      for (const d of C[name] || []) {
        if (!fs.existsSync(d)) continue;
        const s = await componentStatus(comp, d, { verify: o.verify });
        if (!pick || s.bytes > pick.bytes) pick = { ...s, folder: d, source: sourceLabel(d, base) };
        if (s.complete && !s.bad.length) break;
      }
      const it = { name, required: comp.required, sizeGb: +(comp.totalSize / GB).toFixed(2) };
      if (pick && pick.complete) Object.assign(it, { status: "installed", folder: pick.folder, source: pick.source, verified: !!o.verify });
      else if (pick && pick.bad && pick.bad.length) Object.assign(it, { status: "corrupt", folder: pick.folder, bad: pick.bad });
      else if (pick && pick.bytes > 0) Object.assign(it, { status: "partial", percent: Math.round(100 * pick.bytes / comp.totalSize), folder: pick.folder });
      else it.status = "missing";
      const lk = running && running.components && running.components[name];
      if (lk && lk.status === "downloading") Object.assign(it, { status: "downloading", percent: Math.round(100 * (lk.bytes ?? lk.byte ?? 0) / (lk.total || comp.totalSize)) });
      r.parts.push(it);
      if (comp.required && it.status !== "installed") r.ready = false;
    }
    // where from: every part ready from outside install.json -> can be adopted
    const outside = r.parts.filter((b) => b.status === "installed" && (b.source === "env" || b.source === "old manual" || b.source === "other"));
    r.canAdopt = r.ready && outside.length > 0;
    out.target[t] = r;
  }
  return out;
}

const SOURCE_TEXT = () => ({ "mgp install": L`mgp install`, adopted: L`adopted`, env: "env", "old manual": L`old manual`, other: L`other` });

export function printStatus(h) {
  const out = [L`mgp install (home ${h.home}${h.config ? "" : L`, no install.json yet`})`];
  const bg = h.background;
  if (bg) {
    if (bg.alive) out.push(L`  Background: RUNNING (PID ${bg.pid}), step: ${bg.step || "-"}; log ${bg.log}`);
    else if (bg.done) out.push(L`  Last background run: ${bg.ok ? L`finished OK` : L`FAIL` + ": " + String(bg.error || "").split("\n")[0]} (${bg.updated})` + (bg.test ? L`; test: ${bg.test}` : ""));
    else out.push(L`  Last background run stopped in the middle (step ${bg.step}); run the same command again to continue`);
  }
  const tag = { installed: L`[ok]   `, missing: "[----] ", partial: "[part] ", downloading: L`[down] `, installing: L`[inst] `, corrupt: L`[CORRUPT]` };
  const src = SOURCE_TEXT();
  for (const [t, r] of Object.entries(h.target)) {
    out.push("", `${t === "voice" ? L`Voice (local clone)` : t === "cutout" ? L`Cutout (rembg, U2-Net)` : L`Local image`}: ${r.ready ? L`READY` : L`incomplete`}`);
    for (const b of r.parts) {
      let s = `  ${tag[b.status] || b.status} ${b.name.padEnd(15)}`;
      if (b.name === "python") s += b.python ? `${b.python} (Python ${b.version}, torch ${b.torch || "-"}${b.missing && b.missing.length ? L`; missing: ${b.missing.join(", ")}` : ""}) [${src[b.source] || b.source}]` : L`no venv yet`;
      else if (b.status === "installed") s += `${b.folder || L`(comes with a pip package)`}${b.sizeGb ? ` (${num(b.sizeGb, 2)} GB)` : ""}${b.source ? ` [${src[b.source] || b.source}]` : ""}${b.verified ? " sha256 OK" : ""}`;
      else if (b.status === "downloading" || b.status === "partial") s += L`${b.percent}% of ${num(b.sizeGb, 2)} GB`;
      else if (b.status === "corrupt") s += L`wrong sha256: ${b.bad.join(", ")} (${b.folder})`;
      else s += b.required === false ? L`optional (${num(b.sizeGb, 2)} GB, --openvoice)` : `${b.sizeGb ? num(b.sizeGb, 2) + " GB" : ""}`;
      out.push(s);
    }
    if (r.canAdopt) out.push(L`  -> a complete manual/env install was found: mgp install ${t} --adopt  (used as it is, no new download)`);
    else if (!r.ready) out.push(L`  -> install: mgp install ${t} --detach  (progress: mgp install ${t} --status)`);
  }
  return out.join("\n");
}

/* ================================================================== adopt */

async function adopt(tgt, o) {
  const h = await checkStatus(tgt, { ...o, verify: true });
  const c = readConfig();
  c.model = c.model || {};
  const res = {};
  for (const [t, r] of Object.entries(h.target)) {
    const bad = r.parts.filter((b) => b.status === "corrupt");
    if (bad.length) throw new Error(L`${t}: wrong sha256 in ${bad.map((b) => b.name + " (" + b.bad.join(", ") + ")").join("; ")}. Delete that file, then run mgp install ${t} (it is downloaded again).`);
    if (!r.ready) { res[t] = { adopted: false, reason: L`incomplete: ` + r.parts.filter((b) => b.status !== "installed" && b.required !== false).map((b) => b.name).join(", ") }; continue; }
    const py = r.parts.find((b) => b.name === "python");
    c[t] = { python: py.python, torch: py.torch, adopted: true, time: new Date().toISOString() };
    for (const b of r.parts) {
      if (b.status !== "installed" || !b.folder) continue;
      if (b.name === "chatterbox") c.model.chatterbox = b.folder;
      if (b.name === "openvoice") c.model.openvoice = b.folder;
      if (b.name === "whisper-small") c.model.whisper = b.folder;
      if (b.name === "flux2-klein-4b") c.model.hf = b.folder;
      if (b.name === "u2net") c.model.rembg = b.folder;
    }
    res[t] = { adopted: true, python: py.python };
    say(o, L`adopt ${t}: ${py.python} + ${r.parts.filter((b) => b.folder).map((b) => b.name + "=" + b.folder).join(", ")} (every sha256 matches)`);
  }
  writeConfig(c);
  return res;
}

/* ================================================================== install */

async function installVoice(o, dec, base) {
  const b = defaults(base);
  const M = manifest().components;
  const c = readConfig();
  const want = (k) => !o.components || o.components.includes(k);
  let py = c.voice && c.voice.python && fs.existsSync(c.voice.python) ? c.voice.python : null;
  if (want("venv") || want("torch") || want("packages")) {
    if (!dec.voice.possible) throw new Error(L`local clone is not supported on this machine: ` + dec.voice.notes.join("; "));
    py = py && !o.fresh ? py : await createVenv(o, dec, b.venvVoice);
    step(o, "venv", { status: "done", python: py });
    const iv = venvInfo(py);
    if (want("torch")) {
      if (iv.torch && iv.torch.startsWith(TORCH) && buildOf(iv.torch) === (dec.torch.build === "pypi" ? "pypi" : dec.torch.build)) say(o, "  " + L`torch ${iv.torch} already installed`);
      else { say(o, L`torch ${TORCH} build ${dec.torch.build}: ${dec.torch.reason}`); await installTorch(o, py, dec, { audio: true }); }
      step(o, "torch", { status: "done" });
    }
    if (want("packages")) {
      await installRequirements(o, py, path.dirname(path.dirname(py)), REQS.voice, "voice");
      if (o.openvoice) await installRequirements(o, py, path.dirname(path.dirname(py)), REQS.openvoice, "openvoice");
    }
    const c2 = readConfig();
    c2.voice = { python: py, torch: venvInfo(py).torch, time: new Date().toISOString() };
    writeConfig(c2);
  }
  for (const name of ["chatterbox", "whisper-small", ...(o.openvoice ? ["openvoice"] : [])]) {
    if (!want(name)) continue;
    const comp = M[name];
    const dk = componentDir(comp, b.model);
    await downloadComponent(name, comp, dk, o);
    const c3 = readConfig(); c3.model = c3.model || {};
    c3.model[{ chatterbox: "chatterbox", openvoice: "openvoice", "whisper-small": "whisper" }[name]] = dk;
    writeConfig(c3);
  }
}

async function installImage(o, dec, base) {
  const b = defaults(base);
  const M = manifest().components;
  const c = readConfig();
  const want = (k) => !o.components || o.components.includes(k);
  let py = c.image && c.image.python && fs.existsSync(c.image.python) ? c.image.python : null;
  if (want("venv") || want("torch") || want("packages")) {
    if (!dec.image.possible && !o.force) throw new Error(L`local image is not recommended on this machine: ` + dec.image.notes.join("; ") + L` (force: --force)`);
    py = py && !o.fresh ? py : await createVenv(o, dec, b.venvImage);
    step(o, "venv", { status: "done", python: py });
    const venv = path.dirname(path.dirname(py));
    const iv = venvInfo(py);
    const pth = pthIn(iv.purelib);
    // torch: borrowed from the voice venv (same Python version, matching torch 2.6.0 build) to avoid downloading 2.5 GB again
    const pyVoice = (readConfig().voice || {}).python;
    const ivV = pyVoice && fs.existsSync(pyVoice) ? venvInfo(pyVoice) : null;
    const canBorrow = !o.noBorrow && ivV && ivV.minor === iv.minor && ivV.torch && ivV.torch.startsWith(TORCH) && ivV.purelib !== iv.purelib;
    const ownTorch = (() => { try { return fs.readdirSync(iv.purelib).some((f) => /^torch-.*\.dist-info$/.test(f)); } catch { return false; } })();
    if (want("packages")) {
      // pip runs WITHOUT the .pth so that pip never touches the packages of the voice venv
      const hasPth = fs.existsSync(pth);
      if (hasPth) fs.renameSync(pth, pth + ".off");
      try { await installRequirements(o, py, venv, REQS.image, "image"); }
      finally { if (hasPth) fs.renameSync(pth + ".off", pth); }
    }
    if (want("torch")) {
      if (ownTorch) say(o, "  " + L`torch already installed in the image venv`);
      else if (canBorrow) {
        fs.writeFileSync(pth, ivV.purelib + "\n");
        say(o, "  " + L`torch ${ivV.torch} borrowed from the voice venv through ${path.basename(pth)} (image venv packages still come first)`);
      } else { say(o, L`torch ${TORCH} build ${dec.torch.build} for the image venv: ${dec.torch.reason}`); await installTorch(o, py, dec, { audio: false }); }
      step(o, "torch", { status: "done" });
    }
    const c2 = readConfig();
    c2.image = { python: py, torch: venvInfo(py).torch, torchBorrowed: fs.existsSync(pth) ? fs.readFileSync(pth, "utf8").trim() : null, time: new Date().toISOString() };
    writeConfig(c2);
  }
  if (want("flux2-klein-4b")) {
    const comp = M["flux2-klein-4b"];
    const dk = componentDir(comp, b.model);
    await downloadComponent("flux2-klein-4b", comp, dk, o);
    const c3 = readConfig(); c3.model = c3.model || {}; c3.model.hf = dk; writeConfig(c3);
  }
}

/** mgp install cutout: own small venv (numpy 2 for rembg/numba, no torch) + locked packages + U2-Net weights (sha256). */
async function installCutout(o, dec, base) {
  const b = defaults(base);
  const M = manifest().components;
  const c = readConfig();
  const want = (k) => !o.components || o.components.includes(k);
  let py = c.cutout && c.cutout.python && fs.existsSync(c.cutout.python) ? c.cutout.python : null;
  if (want("venv") || want("packages")) {
    py = py && !o.fresh ? py : await createVenv(o, dec, b.venvCutout);
    step(o, "venv", { status: "done", python: py });
    if (want("packages")) await installRequirements(o, py, path.dirname(path.dirname(py)), REQS.cutout, "cutout");
    const c2 = readConfig();
    c2.cutout = { python: py, torch: null, time: new Date().toISOString() };
    writeConfig(c2);
  }
  if (want("u2net")) {
    const comp = M.u2net;
    const dk = componentDir(comp, b.model);
    await downloadComponent("u2net", comp, dk, o);
    const c3 = readConfig(); c3.model = c3.model || {}; c3.model.rembg = dk; writeConfig(c3);
  }
}

/* ================================================================== smoke test */

async function smokeTest(tgt, o) {
  const C = readConfig();
  const dir = path.join(home(), "test");
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const dev = (r) => { const d = r.device ?? r.perangkat; return d && typeof d === "object" ? (d.device ?? d.perangkat) : d; };
  try {
    if (tgt === "voice") {
      const py = C.voice && C.voice.python;
      if (!py) throw new Error(L`no voice venv yet`);
      const dirCb = env("MGP_CHATTERBOX_DIR") || (C.model && C.model.chatterbox);
      if (!dirCb || !fs.existsSync(path.join(dirCb, "t3_mtl23ls_v2.safetensors"))) throw new Error(L`chatterbox model incomplete (the test does not download silently)`);
      say(o, L`voice smoke test: one sentence with the built-in Chatterbox voice (not a personal profile)...`);
      const r = JSON.parse((await runPy({ exe: py, pre: [] }, "install_test.py", ["voice", "--out", path.join(dir, "voice_test.wav")], { quiet: o.quiet })).trim().split("\n").pop());
      return { ok: true, file: r.file, device: dev(r), audioSeconds: r.audioSeconds ?? r.detikAudio, synthSeconds: r.synthSeconds ?? r.detikSintesis, rtf: r.rtf, seconds: r.seconds ?? r.detik, totalSeconds: Math.round((Date.now() - t0) / 1000) };
    }
    if (tgt === "cutout") {
      const py = C.cutout && C.cutout.python;
      if (!py) throw new Error(L`no cutout venv yet`);
      say(o, L`cutout smoke test: rembg U2-Net on a generated test picture (CPU)...`);
      const r = JSON.parse((await runPy({ exe: py, pre: [] }, "install_test.py", ["cutout", "--out", path.join(dir, "cutout_test.png")], { quiet: o.quiet })).trim().split("\n").pop());
      return { ok: !!r.ok, file: r.file, device: dev(r), seconds: r.seconds, model: r.modelFile, totalSeconds: Math.round((Date.now() - t0) / 1000) };
    }
    const py = C.image && C.image.python;
    if (!py) throw new Error(L`no image venv yet`);
    say(o, L`image smoke test: one local 512x512 image...`);
    const r = JSON.parse((await runPy({ exe: py, pre: [] }, "image_engine.py", ["make", "--prompt", "a single red apple, flat paper collage style, plain magenta background", "-o", path.join(dir, "image_test.png"), "--width", "512", "--height", "512", "--seed", "1"], { quiet: o.quiet })).trim().split("\n").pop());
    return { ok: true, file: r.file, device: dev(r), diffusionSeconds: r.diffusionSeconds ?? r.detikDifusi, seconds: r.seconds ?? r.detik, vramPeakGb: r.vramPeakGb ?? r.vramPuncakGb, totalSeconds: Math.round((Date.now() - t0) / 1000) };
  } catch (e) {
    const msg = String(e.message || e);
    // pending (not a failure): not enough free RAM right now (English and Indonesian Python messages)
    return { ok: false, error: msg.split("\n").slice(-3).join(" | ").slice(0, 400), pending: /(^|[^V])(RAM kosong|free RAM) [0-9,.]+ GB < /.test(msg) };
  }
}

/* ================================================================== CLI */

const help = () => L`mgp install: install the local engines (voice clone / FLUX image) once per computer

  mgp install voice|image|cutout|all [--detach] [--cpu] [--openvoice] [--folder <dir>] [--json]
  mgp install voice|image|cutout|all --status [--verify] [--json]   status of every part, changes nothing
  mgp install voice|image|cutout|all --adopt  use an existing manual install (vsu/vgb/vrb/env), no new download
        cutout = rembg + U2-Net (onnxruntime, CPU, ~0.6 GB) for mgp cutout; own venv <home>/venv-cutout
  mgp install all --dry-run                  show the decisions (OS/GPU/PyTorch build/disk) without installing
  mgp install --stop                         stop a background install (can be continued later)

Steps: detect OS/GPU/driver/RAM/disk/Python -> PyTorch ${TORCH} build (CUDA 12.6/11.8, MPS, ROCm, CPU)
-> venvs in <home>/venv-voice and venv-image (the image venv borrows torch from the voice venv through a .pth)
-> locked packages (render/py/requirements-*.txt, --no-deps) -> model weights locked to a commit + sha256
(render/py/model-manifest.json; downloads resume when they break off) -> install.json -> smoke test
(1 sentence with the built-in voice / 1 image of 512 px, GPU through the shared lock).

Options:
  --detach         run in the background; progress: mgp install <target> --status, log: <home>/install.log
  --cpu            force the PyTorch CPU build (saves disk; slower)
  --openvoice      also install the openvoice engine (+122 MB of models, extra packages)
  --folder <dir>   base folder of venvs + models (default: home ${home()}; env MGP_HOME moves the home)
  --adopt          register the install found (sha256 checked) in install.json
  --fresh          ignore a manual install that was found; install fresh in the base folder
  --components a,b only some parts: venv,torch,packages,chatterbox,whisper-small,openvoice,flux2-klein-4b,u2net,smoke-test
  --skip-test      skip the smoke test     --force   install image even with RAM < 16 GB     --verbose  show pip output
  --base-python <exe>   Python 3.10-3.12 to create the venvs (default: found automatically, 3.12 first)
Old names still work: mgp install suara|gambar|semua, --cek, --latar, --adopsi, --baru, --komponen paket,uji, ...
`;

export async function cli(argv) {
  let a;
  try {
    a = parseArgs({
      args: argv, allowPositionals: true, options: {
        status: { type: "boolean" }, folder: { type: "string" }, cpu: { type: "boolean" }, detach: { type: "boolean" },
        json: { type: "boolean" }, openvoice: { type: "boolean" }, adopt: { type: "boolean" }, fresh: { type: "boolean" }, components: { type: "string" },
        "skip-test": { type: "boolean" }, force: { type: "boolean" }, "dry-run": { type: "boolean" }, verify: { type: "boolean" }, verbose: { type: "boolean" },
        "base-python": { type: "string" }, stop: { type: "boolean" }, quiet: { type: "boolean" }, retry: { type: "boolean" }, "keep-wheels": { type: "boolean" },
        "no-borrow": { type: "boolean" }, child: { type: "boolean" }, help: { type: "boolean", short: "h" },
      },
    });
  } catch (e) { console.error("mgp install: " + e.message + "\n\n" + help()); process.exitCode = 2; return; }
  const { values: v, positionals: pos } = a;
  const o = {
    ...v, dryRun: v["dry-run"], skipTest: v["skip-test"], basePython: v["base-python"], keepWheels: v["keep-wheels"], noBorrow: v["no-borrow"],
    components: v.components ? v.components.split(",").map((s) => s.trim()).map((s) => COMPONENT[s] || s) : null,
  };
  if (o.stop) {
    const st = statusRead();
    if (st && st.pid && !st.done && pidAlive(st.pid)) { process.kill(st.pid); console.log(L`background install PID ${st.pid} stopped; run its command again to continue (downloads resume)`); }
    else console.log(L`no background install is running`);
    return;
  }
  const tgt = TARGET[pos[0]];
  if (v.help || !tgt) { console.log(help()); if (!v.help && pos[0]) process.exitCode = 2; return; }
  const targets = targetsOf(tgt);

  if (o.status) {
    const h = await checkStatus(tgt, o);
    console.log(o.json ? JSON.stringify(h, null, 2) : printStatus(h));
    return;
  }

  const base = path.resolve(o.folder || home());
  const p = probe(o);
  const dec = decide(p, o);
  if (o.dryRun) {
    console.log(o.json ? JSON.stringify({ probe: p, decision: dec }, null, 2) : printDecision(p, dec, targets));
    return;
  }

  // one install at a time
  const st0 = statusRead();
  if (st0 && !st0.done && st0.pid && st0.pid !== process.pid && pidAlive(st0.pid)) {
    console.error(L`mgp install: another install is running (PID ${st0.pid}, step ${st0.step}). Check: mgp install ${tgt} --status; stop: mgp install --stop`);
    process.exitCode = 1; return;
  }

  // a complete manual install was found -> offer adopt (unless --adopt / --fresh / --components)
  if (!o.fresh && !o.components && !o.adopt && !v.child) {
    const h = await checkStatus(tgt, o);
    const allReady = targets.every((t) => h.target[t].ready);
    if (allReady && targets.some((t) => h.target[t].canAdopt)) {
      console.log(printStatus(h) + "\n\n" + L`Every part of ${targets.join(" + ")} is already on this machine. Use it as it is (no new download):
  mgp install ${tgt} --adopt
or install fresh in ${base}: mgp install ${tgt} --fresh`);
      if (o.json) console.log(JSON.stringify({ adoptOffer: true, status: h }));
      return;
    }
    if (allReady) { console.log(printStatus(h) + "\n\n" + L`Already installed. Run the test again: mgp install ${tgt} --components smoke-test`); return; }
  }

  if (o.detach && !v.child) {
    fs.mkdirSync(home(), { recursive: true });
    const log = fs.openSync(logFile(), "a");
    fs.writeSync(log, `\n==== ${new Date().toISOString()} mgp install ${argv.join(" ")}\n`);
    const args = [path.join(HERE, "..", "bin", "mgp.mjs"), "install", ...argv.filter((x) => x !== "--detach"), "--child"];
    const child = spawn(process.execPath, args, { detached: true, stdio: ["ignore", log, log], windowsHide: true, env: process.env });
    child.unref();
    _status = { pid: child.pid, target: targets, start: new Date().toISOString(), args: argv, step: "start", components: {}, done: false };
    statusWrite(true);
    console.log(L`install of ${targets.join(" + ")} runs in the background (PID ${child.pid}).` + "\n  " + L`progress: mgp install ${tgt} --status` + "\n  " + L`log: ${logFile()}` + "\n  " + L`decision: PyTorch ${TORCH} ${dec.torch.build || "-"} (${dec.torch.reason})`);
    return;
  }

  // ---- run the install (in the foreground, or as the --detach child)
  _status = { pid: process.pid, target: targets, start: new Date().toISOString(), args: argv, step: "start", components: {}, done: false };
  statusWrite(true);
  if (o.adopt) {
    try {
      step(o, "adopt", { status: "verify sha256" });
      const r = await adopt(tgt, o);
      const test = {};
      if (!o.skipTest) for (const t of targets) if (r[t] && r[t].adopted) { step(o, "test-" + t, { status: "running" }); test[t] = await smokeTest(t, o); step(o, "test-" + t, { status: test[t].ok ? "done" : "failed" }); say(o, testSummary(t, test[t])); }
      _status.done = true; _status.ok = true; _status.step = "done (adopt)";
      _status.test = Object.entries(test).map(([t, u]) => testSummary(t, u)).join("; ");
      statusWrite(true);
      if (o.json) console.log(JSON.stringify({ adopt: r, test }, null, 2));
      else console.log(L`adopt finished; install.json: ${configFile()}`);
    } catch (e) {
      _status.done = true; _status.ok = false; _status.error = String(e.message || e); statusWrite(true);
      console.error("mgp install: " + (e.message || e)); process.exitCode = 1;
    }
    return;
  }
  const t0 = Date.now();
  const res = { decision: dec, target: {} };
  try {
    say(o, printDecision(p, dec, targets));
    if (!dec.supported && targets.some((t) => t !== "cutout")) throw new Error(L`this machine is not supported for the local engines: ` + dec.torch.reason);
    const need = targets.reduce((s, t) => s + dec.needGb[t], 0) + DISK.tempDownload;
    if (p.disk.freeGb != null && p.disk.freeGb < need && !o.force && !o.components) throw new Error(L`free disk ${num(p.disk.freeGb)} GB on ${p.disk.folder} < ~${num(need)} GB needed. Free some disk space or use --folder <another drive>.`);
    for (const t of targets) {
      const start = Date.now();
      if (!o.components || o.components.some((k) => k !== "smoke-test")) {
        if (t === "voice") await installVoice(o, dec, base); else if (t === "cutout") await installCutout(o, dec, base); else await installImage(o, dec, base);
      }
      res.target[t] = { seconds: Math.round((Date.now() - start) / 1000) };
      if (!o.skipTest && (!o.components || o.components.includes("smoke-test"))) {
        step(o, "test-" + t, { status: "running" });
        const u = await smokeTest(t, o);
        res.target[t].test = u;
        step(o, "test-" + t, { status: u.ok ? "done" : "failed", ...u });
        say(o, testSummary(t, u));
      }
    }
    _status.done = true; _status.ok = true; _status.step = "done";
    _status.test = Object.entries(res.target).map(([t, r]) => r.test ? testSummary(t, r.test) : null).filter(Boolean).join("; ");
    statusWrite(true);
    say(o, L`finished in ${Math.round((Date.now() - t0) / 1000)} s. Locations saved in ${configFile()}; mgp voice/image use them automatically.`);
    if (o.json) console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    _status.done = true; _status.ok = false; _status.error = String(e.message || e); statusWrite(true);
    console.error("mgp install: " + (e.message || e) + "\n" + L`Run the same command again to continue (downloads resume where they broke off).`);
    process.exitCode = 1;
  }
}

function testSummary(t, u) {
  if (!u.ok) return L`test ${t}: ${u.pending ? L`PENDING` : L`FAIL`}: ${u.error}`;
  if (t === "voice") return L`voice test OK: ${u.audioSeconds} s of audio on ${u.device}, synthesis ${u.synthSeconds} s (RTF ${u.rtf}), total ${u.totalSeconds} s -> ${u.file}`;
  if (t === "cutout") return L`cutout test OK: U2-Net on ${u.device}, ${u.seconds} s, total ${u.totalSeconds} s -> ${u.file}`;
  return L`image test OK: 512x512 on ${u.device}, diffusion ${u.diffusionSeconds} s, total ${u.totalSeconds} s${u.vramPeakGb ? L`, VRAM peak ${u.vramPeakGb} GB` : ""} -> ${u.file}`;
}

export function printDecision(p, k, targets = ["voice", "image", "cutout"]) {
  const out = [
    L`Machine: ${p.os} ${p.arch}, RAM ${num(p.ram.totalGb)} GB (${num(p.ram.freeGb)} free), free disk ${p.disk.freeGb != null ? num(p.disk.freeGb) + " GB" : "?"} on ${p.disk.folder}`,
    L`GPU: ${p.gpu.length ? p.gpu.map((g) => g.name + (g.vramTotalGb != null ? ` (${num(g.vramTotalGb)} GB, driver ${g.driver}${g.computeCap ? ", cc " + g.computeCap : ""})` : "")).join("; ") : L`none`}`,
    L`Base Python: ${k.python.exe ? `${k.python.exe} (${k.python.version})` : L`NONE`}${k.python.advice ? "\n  " + k.python.advice : ""}`,
    L`PyTorch ${TORCH}: ${k.torch.build || L`not possible`} (${k.torch.reason})${k.torch.index ? " " + k.torch.index : ""}`,
  ];
  for (const t of targets) {
    const r = k[t];
    out.push(L`${t}: ${r.possible ? L`possible, device ${r.device}` : L`not recommended`}; disk ~${num(k.needGb[t])} GB${t === "image" ? L` (+${num(k.needGb.imageTorch)} GB when torch cannot be borrowed)` : ""}`);
    for (const c of r.notes) out.push(`  - ${c}`);
  }
  for (const c of k.notes) out.push(`  - ${c}`);
  return out.join("\n");
}

// Old names (v2.3 / v2.4-dev).
export const cariPythonDasar = findBasePython, saranPython = pythonAdvice, putuskan = decide, pidHidup = pidAlive;
export const sha256Berkas = sha256File, unduhBerkas = downloadFile, cekStatus = checkStatus, cetakStatus = printStatus, cetakKeputusan = printDecision;
