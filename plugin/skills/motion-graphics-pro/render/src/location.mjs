// Install locations of mgp (`mgp install`): home ~/.mgp, install.json, venvs and model folders.
// Read by python.mjs (env for the Python scripts), voice.mjs, image.mjs, doctor.mjs, install.mjs.
// Lookup order: explicit env (MGP_PYTHON, MGP_IMAGE_PYTHON, MGP_CHATTERBOX_DIR, ...) > install.json > default locations.
// Old names still found: home ~/.rekam (env REKAM_RUMAH), pasang.json / pasang-status.json / pasang.log,
// venv-suara / venv-gambar and the manual vsu / vgb installs. Installed models are never moved.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./names.mjs";

export const WIN = process.platform === "win32";

/**
 * mgp home folder: env MGP_HOME (old REKAM_RUMAH), else ~/.mgp; when ~/.mgp does not exist but the old ~/.rekam
 * does, ~/.rekam is used as it is (short path; on Windows %USERPROFILE%\.mgp).
 */
export function home() {
  const e = env("MGP_HOME");
  if (e) return path.resolve(e);
  const neu = path.join(os.homedir(), ".mgp"), old = path.join(os.homedir(), ".rekam");
  if (!fs.existsSync(neu) && fs.existsSync(old)) return path.resolve(old);
  return path.resolve(neu);
}

/** New name if it exists or the old one does not, else the old name (reads find the old file, new files get new names). */
const pick = (dir, neu, old) => {
  const a = path.join(dir, neu), b = path.join(dir, old);
  return !fs.existsSync(a) && fs.existsSync(b) ? b : a;
};
export const configFile = () => pick(home(), "install.json", "pasang.json");
export const statusFile = () => path.join(home(), "install-status.json");
export const statusFileOld = () => path.join(home(), "pasang-status.json");
export const logFile = () => pick(home(), "install.log", "pasang.log");

/** Python inside a venv (Scripts\python.exe on Windows, bin/python on macOS/Linux). */
export function venvPython(dir) {
  return WIN ? path.join(dir, "Scripts", "python.exe") : path.join(dir, "bin", "python");
}

/** install.json with the old pasang.json keys mapped to the new ones (suara->voice, gambar->image, diadopsi->adopted, waktu->time). */
export function normalizeConfig(c) {
  if (!c || typeof c !== "object") return {};
  const part = (x) => {
    if (!x || typeof x !== "object") return x;
    const r = { ...x };
    if (r.adopted == null && r.diadopsi != null) r.adopted = r.diadopsi;
    if (r.time == null && r.waktu != null) r.time = r.waktu;
    delete r.diadopsi; delete r.waktu;
    return r;
  };
  const out = { ...c };
  if (out.voice == null && out.suara != null) out.voice = out.suara;
  if (out.image == null && out.gambar != null) out.image = out.gambar;
  delete out.suara; delete out.gambar;
  if (out.voice) out.voice = part(out.voice);
  if (out.image) out.image = part(out.image);
  if (out.cutout) out.cutout = part(out.cutout);
  return out;
}

export function readConfig() {
  try { return normalizeConfig(JSON.parse(fs.readFileSync(configFile(), "utf8"))); } catch { return {}; }
}

/** Writes install.json (new keys); an old pasang.json stays untouched, install.json wins from then on. */
export function writeConfig(c) {
  fs.mkdirSync(home(), { recursive: true });
  const f = path.join(home(), "install.json");
  fs.writeFileSync(f + ".tmp", JSON.stringify(normalizeConfig(c), null, 2));
  fs.renameSync(f + ".tmp", f);
}

/** Default installer locations for one base folder (default: home()). Existing venv-suara / venv-gambar are kept. */
export function defaults(base = home()) {
  return {
    venvVoice: pick(base, "venv-voice", "venv-suara"),
    venvImage: pick(base, "venv-image", "venv-gambar"),
    venvCutout: path.join(base, "venv-cutout"),
    model: path.join(base, "model"),
    chatterbox: path.join(base, "model", "chatterbox"),
    openvoice: path.join(base, "model", "openvoice"),
    hf: path.join(base, "model", "hf"),
    rembg: path.join(base, "model", "rembg"),
  };
}

/** Old manual install (before mgp install): venvs vsu/vgb + model folders in the home folder. */
export function legacyManual() {
  const h = os.homedir();
  return {
    pythonVoice: venvPython(path.join(h, "vsu")),
    pythonImage: venvPython(path.join(h, "vgb")),
    chatterbox: path.join(h, "vsu-model", "chatterbox"),
    openvoice: path.join(h, "vsu-model", "openvoice"),
    whisper: path.join(h, ".cache", "huggingface", "hub"),
    hf: path.join(h, "vgb-model", "hf"),
    // rembg by hand (in a real production: venv vrb + rembg's own model folder ~/.rembg; older rembg: ~/.u2net)
    pythonCutout: venvPython(path.join(h, "vrb")),
    rembg: path.join(h, ".rembg"),
  };
}

const exists = (p) => !!p && fs.existsSync(p);

/**
 * Locations in use per part (without explicit env): install.json first, then the default locations when present.
 * {pythonVoice, pythonImage, pythonCutout, chatterbox, openvoice, whisper, hf, rembg}; null when not found.
 */
export function installedPaths() {
  const c = readConfig();
  const b = defaults();
  const m = c.model || {};
  const first = (...xs) => xs.find(exists) || null;
  return {
    pythonVoice: first(c.voice && c.voice.python, venvPython(b.venvVoice)),
    pythonImage: first(c.image && c.image.python, venvPython(b.venvImage)),
    pythonCutout: first(c.cutout && c.cutout.python, venvPython(b.venvCutout)),
    chatterbox: first(m.chatterbox, b.chatterbox),
    openvoice: first(m.openvoice, b.openvoice),
    whisper: first(m.whisper, b.hf),
    hf: first(m.hf, b.hf),
    rembg: first(m.rembg, b.rembg),
  };
}

/**
 * Env for the Python scripts from the mgp install result. Only fills keys that are not set yet (MGP_* or the old
 * REKAM_* name), so explicit env still wins.
 */
export function installEnv() {
  const P = installedPaths();
  const e = {};
  const fill = (k, v) => { if (v && !env(k)) e[k] = v; };
  // flat model folders are only used when their main file exists (empty folder = not downloaded yet)
  if (P.chatterbox && fs.existsSync(path.join(P.chatterbox, "t3_mtl23ls_v2.safetensors"))) fill("MGP_CHATTERBOX_DIR", P.chatterbox);
  if (P.openvoice && fs.existsSync(path.join(P.openvoice, "converter", "checkpoint.pth"))) fill("MGP_OPENVOICE_DIR", P.openvoice);
  if (P.whisper) fill("MGP_WHISPER_CACHE", P.whisper);
  if (P.hf && fs.existsSync(path.join(P.hf, "models--unsloth--FLUX.2-klein-4B-GGUF"))) fill("MGP_IMAGE_MODEL", P.hf);
  // rembg reads REMBG_HOME/models/<model>/<model>.onnx (U2NET_HOME, when set, still wins inside rembg)
  if (P.rembg && fs.existsSync(path.join(P.rembg, "models", "u2net", "u2net.onnx")) && !process.env.REMBG_HOME && !process.env.U2NET_HOME) e.REMBG_HOME = P.rembg;
  return e;
}

/**
 * The sibling motion-graphics skill's lib/ folder that contains `probe` (e.g. "motion/motion.js", "dist/mgp.js").
 * Order: env MGP_LIB (old REKAM_MGP_LIB) > ../motion-graphics/lib next to this skill (Claude Code install, unchanged) >
 * skill mounts where the skills are not siblings of this render/ folder (e.g. a copied render/ folder):
 * env MGP_SKILLS_DIR, /mnt/skills/user, /mnt/skills, ~/.claude/skills. null when not found.
 */
export function motionLib(probe = "motion/motion.js") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const has = (d) => !!d && fs.existsSync(path.join(d, ...probe.split("/")));
  for (const d of [env("MGP_LIB"), path.resolve(here, "../../../motion-graphics/lib")]) if (has(d)) return path.resolve(d);
  const roots = [env("MGP_SKILLS_DIR"), "/mnt/skills/user", "/mnt/skills", path.join(os.homedir(), ".claude", "skills")].filter(Boolean);
  for (const r of roots) {
    let subs = [];
    try { subs = fs.readdirSync(r); } catch { continue; }
    subs = subs.filter((s) => /motion-graphics(?!-pro)/.test(s)).sort((a, b) => (a === "motion-graphics" ? -1 : b === "motion-graphics" ? 1 : a.localeCompare(b)));
    for (const s of subs) if (has(path.join(r, s, "lib"))) return path.join(r, s, "lib");
  }
  return null;
}

// Old names (v2.3 / v2.4-dev).
export const rumah = home, berkasConfig = configFile, berkasStatus = statusFile, berkasLog = logFile, pythonVenv = venvPython;
export const bacaConfig = readConfig, tulisConfig = writeConfig, bawaan = defaults, manualLama = legacyManual;
export const lokasiPasang = installedPaths, envPasang = installEnv;
