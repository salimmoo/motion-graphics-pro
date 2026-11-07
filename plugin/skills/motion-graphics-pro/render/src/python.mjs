// Finds a Python that has given modules (rembg, faster_whisper, numpy) and runs the scripts in py/.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installEnv, installedPaths } from "./location.mjs";
import { env as envVar } from "./names.mjs";
import { L } from "./i18n.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PY_DIR = path.join(here, "..", "py");

function env() {
  // locations from `mgp install` (MGP_CHATTERBOX_DIR, MGP_IMAGE_MODEL, ...) only when the env is not set yet
  const e = { ...installEnv(), ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", HF_HUB_DISABLE_SYMLINKS_WARNING: "1" };
  // numba (used by pymatting/rembg) fails to write its cache on long Windows paths
  if (!e.NUMBA_CACHE_DIR) { e.NUMBA_CACHE_DIR = path.join(os.tmpdir(), "mgp-numba"); fs.mkdirSync(e.NUMBA_CACHE_DIR, { recursive: true }); }
  return e;
}

function candidates(explicit) {
  const c = [];
  if (explicit) c.push([explicit]);
  const ev = envVar("MGP_PYTHON");
  if (ev) c.push([ev]);
  { const P = installedPaths(); if (P.pythonVoice) c.push([P.pythonVoice]); if (P.pythonCutout) c.push([P.pythonCutout]); } // voice / cutout (rembg) venv from mgp install
  const venv = path.join(here, "..", ".venv");
  c.push([path.join(venv, "Scripts", "python.exe")], [path.join(venv, "bin", "python")]);
  if (process.env.VIRTUAL_ENV) c.push([path.join(process.env.VIRTUAL_ENV, process.platform === "win32" ? "Scripts/python.exe" : "bin/python")]);
  c.push(["python"], ["python3"]);
  if (process.platform === "win32") c.push(["py", "-3"]);
  return c.filter(([exe]) => !path.isAbsolute(exe) || fs.existsSync(exe));
}

const cache = new Map();
/** First Python that can `import mod` (mod may be "a,b"). null when none. */
export function findPython(mod, explicit) {
  const key = mod + "|" + (explicit || "");
  if (cache.has(key)) return cache.get(key);
  const imp = mod.split(",").map((m) => "import " + m.trim()).join("; ");
  let found = null;
  for (const [exe, ...pre] of candidates(explicit)) {
    const r = spawnSync(exe, [...pre, "-c", imp], { encoding: "utf8", env: env(), timeout: 120000 });
    if (r.status === 0) { found = { exe, pre }; break; }
  }
  cache.set(key, found);
  return found;
}

/** Run py/<script> with arguments; stderr is passed through (unless quiet), stdout is returned. Old option name: diam. */
export function runPy(py, script, args, { quiet, diam } = {}) {
  const q = !!(quiet ?? diam);
  return new Promise((res, rej) => {
    const p = spawn(py.exe, [...py.pre, "-I", path.join(PY_DIR, script), ...args], { env: env(), stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => { err += d; if (!q) process.stderr.write(d); });
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res(out) : rej(new Error(L`${script} failed (${c}): ` + err.trim().split("\n").slice(-4).join("\n")))));
  });
}
