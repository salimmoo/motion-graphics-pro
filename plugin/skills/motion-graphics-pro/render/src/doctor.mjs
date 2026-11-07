// mgp doctor (old: rekam cek-mesin): machine profile + advice per pipeline (voice, local image, render).
// Thresholds live in one table: py/hardware-requirements.json (section "recommendation").
import { spawnSync } from "node:child_process";
import { FFMPEG, hasFfmpeg } from "./ffmpeg.mjs";
import fs from "node:fs";
import { findPython, runPy } from "./python.mjs";
import { installedPaths, legacyManual, configFile, readConfig } from "./location.mjs";
import { requirements, num, cpu, ram, gpuNvidia, gpuOther, availableEncoders, testEncoder, ENCODER, lockStatus, readMeasurements } from "./device.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

function ffmpegVersion() {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-version"], { encoding: "utf8", windowsHide: true });
  const m = r.status === 0 && /ffmpeg version (\S+)/.exec(r.stdout);
  return m ? m[1] : null;
}

/** device.py output with the old keys mapped (versi -> version). */
function normTorch(j) {
  const t = j.torch && { ...j.torch, version: j.torch.version ?? j.torch.versi };
  const c = j.ctranslate2 && { ...j.ctranslate2, version: j.ctranslate2.version ?? j.ctranslate2.versi };
  return { ...j, torch: t || j.torch, ctranslate2: c || j.ctranslate2 };
}

async function torchProfile(o, exp, mod = "torch") {
  // image venv: use that exe itself (findPython may fall back to the voice venv, whose diffusers is too old)
  const py = exp !== undefined ? (fs.existsSync(exp) ? { exe: exp, pre: [] } : null) : findPython(mod, o.python);
  if (!py) return { found: false, note: L`no Python with PyTorch found (mgp install voice, or set MGP_PYTHON / --python)` };
  try {
    const out = await runPy(py, "device.py", ["profile", "--only-torch"], { quiet: true });
    return { found: true, exe: py.exe, ...normTorch(JSON.parse(out.trim().split("\n").pop())) };
  } catch (e) { return { found: false, exe: py.exe, note: String(e.message).slice(0, 200) }; }
}

/** Raw profile: CPU, RAM, GPU, ffmpeg + hw encoders (tested), PyTorch in MGP_PYTHON, stored measurements. */
export async function machineProfile(o = {}) {
  const nv = gpuNvidia();
  const p = { cpu: cpu(), ram: ram(), gpu: [...nv, ...gpuOther()], ffmpeg: null, torch: null, gpuLock: lockStatus(), measurements: readMeasurements() };
  if (hasFfmpeg()) {
    const have = availableEncoders();
    const enc = {};
    for (const j of Object.keys(ENCODER)) if (j !== "cpu") enc[j] = have[j] ? testEncoder(j) : { ok: false, error: "not compiled", notCompiled: true };
    p.ffmpeg = { version: ffmpegVersion(), exe: FFMPEG, encoder: enc };
  }
  // voice venv: --python > MGP_PYTHON > mgp install voice > ~/vsu (old manual install) > another Python with torch
  const P = installedPaths(), vsu = legacyManual().pythonVoice, vgb = legacyManual().pythonImage;
  const pyV = o.python || env("MGP_PYTHON") || P.pythonVoice || (fs.existsSync(vsu) ? vsu : null);
  p.torch = pyV ? await torchProfile(o, pyV) : await torchProfile(o);
  const pyI = env("MGP_IMAGE_PYTHON") || P.pythonImage || (fs.existsSync(vgb) ? vgb : null);
  p.torchImage = pyI ? await torchProfile(o, pyI, "torch, diffusers") : { found: false, note: L`image venv not found (mgp install image, or MGP_IMAGE_PYTHON)` };
  const cfg = readConfig();
  p.install = { config: fs.existsSync(configFile()) ? configFile() : null, voice: !!cfg.voice, image: !!cfg.image,
    legacyManual: [vsu, vgb].filter((f) => fs.existsSync(f) && !JSON.stringify(cfg).includes(JSON.stringify(f).slice(1, -1))) };
  return p;
}

/** Advice per pipeline from the profile + threshold table. */
export function recommend(p) {
  const A = requirements().recommendation || {};
  const V = A.voice || {}, I = A.image || {}, R = A.render || {};
  const nv = p.gpu.find((g) => g.vendor === "NVIDIA");
  const apple = p.gpu.find((g) => g.vendor === "Apple");
  const vramTot = nv ? nv.vramTotalGb : 0;
  const ramF = p.ram.freeGb, ramT = p.ram.totalGb;
  const t = p.torch || {};
  const tb = t.torch && t.torch.build;
  const tolerance = 0.1; // 4094 MiB still counts as "4 GB"
  const r = {};
  const meas = (dev) => { const u = p.measurements || {}; return u["voice:chatterbox:" + dev] || u["suara:chatterbox:" + dev]; };

  // ---- voice (local clone, Chatterbox)
  {
    let device, rtf, source;
    const notes = [];
    const gpuEnough = nv && vramTot + tolerance >= (V.vram_min_gb ?? 3.5);
    if (tb === "cuda" && gpuEnough) {
      device = "GPU (CUDA)";
      rtf = meas("cuda")?.rtf; source = rtf ? L`measured on this machine` : L`estimate`;
      rtf = rtf ?? V.rtf_cuda_default ?? 1;
    } else if (tb === "mps") {
      device = "GPU (MPS)"; rtf = meas("mps")?.rtf ?? V.rtf_cpu_default ?? 5; source = meas("mps") ? L`measured on this machine` : L`rough estimate`;
    } else {
      device = "CPU";
      rtf = meas("cpu")?.rtf; source = rtf ? L`measured on this machine` : L`estimate`;
      rtf = rtf ?? V.rtf_cpu_default ?? 5;
      if (gpuEnough && tb === "cpu") notes.push(L`NVIDIA GPU ${num(vramTot)} GB present, but PyTorch in ${t.exe || "MGP_PYTHON"} is a CPU build: install the CUDA build (see voice/README.md)`);
      if (nv && !gpuEnough) notes.push(L`VRAM ${num(vramTot)} GB < ${num(V.vram_min_gb ?? 3.5)} GB: Chatterbox runs on the CPU`);
    }
    if (!t.found) notes.push((t.note || L`PyTorch not found; local clone not installed yet`) + L`. Start at the beginning of the project: mgp install voice --detach`);
    const sec30 = Math.round(rtf * 30);
    const minRam = V.free_ram_min_gb ?? 5;
    const weak = rtf > (V.rtf_weak ?? 8) || ramF < minRam;
    if (ramF < minRam) notes.push(L`free RAM ${num(ramF)} GB < ${num(minRam)} GB needed by the model`);
    r.voice = {
      device, rtf: +rtf.toFixed(2), rtfSource: source, secondsPer30sVo: sec30, weak,
      advice: weak
        ? L`This machine is weak for a local clone (~${sec30} s per 30 s of VO). Suggest ElevenLabs or your own voice recording.`
        : L`Local clone on ${device}: ~${sec30} s per 30 s of VO (RTF ${num(rtf, 2)}, ${source}) + about 10-20 s to load the model.`,
      notes,
    };
  }

  // ---- local image (FLUX etc., mgp image)
  {
    const vmin = I.vram_min_gb ?? 4, rmin = I.free_ram_min_gb ?? 16, vfull = I.vram_full_gb ?? 12;
    let mode = "cloud", advice;
    const notes = [];
    if (nv && vramTot + tolerance >= vfull) { mode = "local"; advice = L`Fully local on the GPU (VRAM ${num(vramTot)} GB).`; }
    else if (nv && vramTot + tolerance >= vmin && ramF >= rmin) { mode = "local-offload"; advice = L`Local is possible through offload (VRAM ${num(vramTot)} GB + free RAM ${num(ramF)} GB); slow, fine for a few images.`; }
    else if (apple && ramT >= 32 && ramF >= rmin) { mode = "local-mps"; advice = L`Apple Silicon with ${num(ramT)} GB RAM: local is possible through MPS, slow.`; }
    else {
      advice = L`Use the cloud (Higgsfield etc.) for images.`;
      if (nv && vramTot + tolerance < vmin) notes.push(L`VRAM ${num(vramTot)} GB < ${num(vmin)} GB`);
      if (!nv && !apple) notes.push(L`no NVIDIA/Apple GPU`);
      if (ramF < rmin) notes.push(L`free RAM ${num(ramF)} GB < ${num(rmin)} GB for offload` + (ramT >= rmin + 4 ? L` (close other apps/sessions, then check again)` : ""));
    }
    const ti = p.torchImage && p.torchImage.found && p.torchImage.torch ? p.torchImage.torch.build : null;
    if (mode !== "cloud" && !p.torchImage?.found) notes.push(L`image venv not installed yet: mgp install image --detach (about 4.9 GB of models)`);
    else if (mode !== "cloud" && ti !== "cuda" && ti !== "mps") notes.push(L`image venv (${p.torchImage.exe}) uses a PyTorch ${ti || "?"} build: needs CUDA/MPS (mgp install image)`);
    r.image = { mode, advice, notes };
  }

  // ---- render
  {
    const th = p.cpu.threads, tpw = R.threads_per_worker ?? 4, rpw = R.ram_per_worker_gb ?? 0.8;
    const w = Math.max(1, Math.min(R.workers_max ?? 4, Math.floor(th / tpw), Math.floor(Math.max(0, ramF - 1) / rpw)));
    const shared = R.workers_shared ?? 2;
    const enc = p.ffmpeg ? Object.entries(p.ffmpeg.encoder).filter(([, v]) => v.ok).map(([k]) => k) : [];
    const notes = [];
    // only report encoder failures whose GPU vendor is present (amf on a laptop without AMD is expected)
    const vendors = new Set(p.gpu.map((g) => g.vendor));
    if (p.ffmpeg) for (const [k, v] of Object.entries(p.ffmpeg.encoder)) if (!v.ok && !v.notCompiled && vendors.has(ENCODER[k].vendor)) notes.push(L`${k} not usable: ${v.error}`);
    const small = ramF < (R.ram_preview_scale_gb ?? 4) || th < 8;
    r.render = {
      workers: w, workersShared: Math.min(w, shared),
      encoder: { final: "cpu", draft: enc[0] || "cpu", hw: enc },
      smallPreview: small,
      advice: [
        L`--workers ${w} (own machine) or --workers ${Math.min(w, shared)} when the laptop is used by other sessions`,
        enc.length ? L`encoder: final --encoder cpu (libx264, deterministic); drafts/long renders may use --encoder ${enc[0]}` : L`encoder: --encoder cpu (no hardware encoder passed the test)`,
        small ? L`drafts: render with half --size (e.g. 540x960), then the final at full size` : L`full-size drafts are still fine; half --size for quick iterations`,
      ],
      notes,
    };
    if (!p.ffmpeg) r.render.advice.unshift(L`ffmpeg not found: install ffmpeg or set MGP_FFMPEG`);
  }
  return r;
}

export async function doctor(o = {}) {
  const p = await machineProfile(o);
  return { profile: p, recommendation: recommend(p) };
}

export function printDoctor({ profile: p, recommendation: r }) {
  const out = [];
  const yes = L`yes`, no = L`no`;
  out.push(L`Machine`);
  out.push(L`  CPU     ${p.cpu.name} (${p.cpu.threads} threads)`);
  out.push(L`  RAM     ${num(p.ram.totalGb)} GB total, ${num(p.ram.freeGb)} GB free`);
  if (!p.gpu.length) out.push(L`  GPU     not detected`);
  for (const g of p.gpu) out.push(`  GPU     ${g.name}` + (g.vramTotalGb != null ? L` (VRAM ${num(g.vramTotalGb)} GB, ${num(g.vramFreeGb)} GB free, driver ${g.driver})` : g.vendor === "Intel" || g.vendor === "AMD" ? L` (iGPU/shared memory)` : ""));
  if (p.ffmpeg) {
    const e = Object.entries(p.ffmpeg.encoder).map(([k, v]) => `${k} ${v.ok ? yes : no}`).join(", ");
    out.push(L`  ffmpeg  ${p.ffmpeg.version}; hw encoders: ${e}`);
  } else out.push(L`  ffmpeg  not found`);
  const t = p.torch || {};
  if (t.found && t.torch) out.push(L`  PyTorch ${t.torch.version} (${t.torch.build}${t.torch.cuda ? L`, CUDA ${t.torch.cudaBuild} active` : ""}) in ${t.exe}` + (t.ctranslate2 ? L`; ctranslate2 ${t.ctranslate2.version} (GPU ${t.ctranslate2.cuda ? yes : no})` : ""));
  else out.push(`  PyTorch ${t.note || L`none`}`);
  const ti = p.torchImage || {};
  if (ti.found && ti.torch) out.push(L`  Image   PyTorch ${ti.torch.version} (${ti.torch.build}${ti.torch.cuda ? L`, CUDA active` : ""}) in ${ti.exe}`);
  else out.push(L`  Image   ${ti.note || L`no image venv`}`);
  const inst = p.install || {};
  const cfgName = inst.config ? inst.config.split(/[\\/]/).pop() : "install.json";
  out.push(L`  Install ${inst.config ? L`${cfgName}: voice ${inst.voice ? yes : L`not yet`}, image ${inst.image ? yes : L`not yet`}` : L`no install.json yet`} (full status: mgp install all --status)`);
  if (inst.legacyManual && inst.legacyManual.length) out.push(L`          manual install found (${inst.legacyManual.join(", ")}): mgp install all --adopt`);
  const k = p.gpuLock;
  out.push(L`  GPU lock ${k.free ? L`free` : L`in use by '${k.task}' (PID ${k.pid})`} (${k.file})`);
  out.push("");
  out.push(L`Advice`);
  out.push(L`  Voice (local clone): ${r.voice.advice}`);
  for (const c of r.voice.notes) out.push(`    - ${c}`);
  out.push(L`  Local image: ${r.image.advice}`);
  for (const c of r.image.notes) out.push(`    - ${c}`);
  out.push(L`  Render:`);
  for (const s of r.render.advice) out.push(`    - ${s}`);
  for (const c of r.render.notes) out.push(L`    - note: ${c}`);
  return out.join("\n");
}

// Old names (v2.3 / v2.4-dev).
export const profilMesin = machineProfile, rekomendasi = recommend, cekMesin = doctor, cetakMesin = printDoctor;
