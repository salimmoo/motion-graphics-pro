// project.json (old name proyek.json): one source of project data (meta, scenes + timing, VO + word/letter
// timing, blocks, caption, assets + provenance). Schema: motion-graphics-pro references (project.md).
// Used by `mgp new` (writes it), `mgp check` (checks the referenced files) and `mgp contact --times poses`
// (key pose times). Readers accept the old Indonesian keys; the writer writes the new English keys.
import fs from "node:fs";
import path from "node:path";
import { L } from "./i18n.mjs";

/** Project file names, new first. */
export const PROJECT_FILES = ["project.json", "proyek.json"];

/** Find project.json (then the old proyek.json) in the composition folder, then one level up. */
export function findProject(compFile) {
  let d = path.dirname(path.resolve(compFile));
  for (let i = 0; i < 2; i++) {
    for (const n of PROJECT_FILES) {
      const p = path.join(d, n);
      if (fs.existsSync(p)) return p;
    }
    d = path.dirname(d);
  }
  return null;
}

const pick = (o, ...keys) => { if (!o || typeof o !== "object") return undefined; for (const k of keys) if (o[k] !== undefined) return o[k]; return undefined; };
const VALUE = { belum: "pending", "klon-lokal": "local-clone", kode: "code", lain: "other", pengguna: "user", "rekam-gambar": "mgp-image", rekaman: "recording", tanpa: "none", terkunci: "locked" };
const val = (v) => (typeof v === "string" && VALUE[v] ? VALUE[v] : v);

/** Old project keys used in a parsed project file (for `mgp check` hints). */
export function oldProjectKeys(p) {
  const old = new Set();
  const see = (o, keys) => { if (o && typeof o === "object") for (const k of keys) if (o[k] !== undefined) old.add(k); };
  see(p, ["versi", "komposisi", "suara", "adegan", "blok", "aset"]);
  see(p.meta, ["judul", "rasio", "lebar", "tinggi", "durasi", "dibuat", "tahap", "gerbang"]);
  const s = p.suara || p.voice;
  see(s, ["sumber", "profil"]);
  for (const v of (s && s.vo) || []) see(v, ["naskah", "naskah_tampil", "kata", "huruf", "mulai"]);
  for (const a of p.adegan || p.scenes || []) see(a, ["mulai", "durasi", "judul", "cabang", "kunci", "blok", "komposisi"]);
  for (const b of p.blok || p.blocks || []) see(b, ["adegan", "mulai"]);
  for (const a of p.aset || p.assets || []) see(a, ["sumber", "penyedia", "lisensi", "catatan"]);
  see(p.caption, ["gaya"]);
  return [...old];
}

/** Parsed project with the new English keys (old keys and old values are read too). */
export function normalizeProject(p) {
  p = p || {};
  const m = p.meta || {};
  const s = pick(p, "voice", "suara") || {};
  return {
    ...p,
    version: pick(p, "version", "versi"),
    meta: {
      ...m,
      title: pick(m, "title", "judul"), aspect: pick(m, "aspect", "rasio"), width: pick(m, "width", "lebar"), height: pick(m, "height", "tinggi"),
      fps: m.fps, duration: pick(m, "duration", "durasi"), created: pick(m, "created", "dibuat"), stage: pick(m, "stage", "tahap"), gate: pick(m, "gate", "gerbang"),
    },
    composition: pick(p, "composition", "komposisi"),
    voice: {
      ...s,
      source: val(pick(s, "source", "sumber")), profile: pick(s, "profile", "profil"),
      vo: (s.vo || []).map((v) => ({ ...v, script: pick(v, "script", "naskah"), script_display: pick(v, "script_display", "naskah_tampil"), words: pick(v, "words", "kata"), letters: pick(v, "letters", "huruf"), start: pick(v, "start", "mulai") })),
    },
    scenes: (pick(p, "scenes", "adegan") || []).map((a) => ({
      ...a, start: pick(a, "start", "mulai"), duration: pick(a, "duration", "durasi"), title: pick(a, "title", "judul"), branch: pick(a, "branch", "cabang"),
      poses: pick(a, "poses", "kunci") || [], status: val(a.status), blocks: pick(a, "blocks", "blok") || [], composition: pick(a, "composition", "komposisi"),
    })),
    blocks: (pick(p, "blocks", "blok") || []).map((b) => ({ ...b, scene: pick(b, "scene", "adegan"), start: pick(b, "start", "mulai") })),
    assets: (pick(p, "assets", "aset") || []).map((a) => ({ ...a, source: val(pick(a, "source", "sumber")), provider: pick(a, "provider", "penyedia"), license: pick(a, "license", "lisensi"), notes: pick(a, "notes", "catatan") })),
    caption: p.caption ? { ...p.caption, style: pick(p.caption, "style", "gaya") } : p.caption,
  };
}

/** Read a project file; the result has the new English keys (see normalizeProject). */
export function readProject(file) {
  return normalizeProject(JSON.parse(fs.readFileSync(file, "utf8")));
}

/** Initial project data for `mgp new` (new keys). */
export function newProject({ title, aspect, width, height, fps, duration, poses }) {
  return {
    version: 1,
    meta: {
      title, aspect, width, height, fps, duration,
      created: new Date().toISOString().slice(0, 10),
      skill: "motion-graphics-pro 2.4",
      stage: "1 Brief", gate: "G1 pending",
    },
    composition: "index.html",
    voice: {
      source: "pending", // elevenlabs | local-clone | recording | none (decision point G2)
      profile: null,
      vo: [],            // { id, file, script, words, letters, start }
    },
    scenes: [
      { id: "s01", start: 0, duration, title: "Opening scene", branch: "A", poses, status: "blocking", blocks: [] },
    ],
    blocks: [],          // { id: "transitions/tear", scene: "s02", start: 4.5 }
    caption: null,       // { file: "assets/audio/vo.words.json", style: "..." }
    sfx: null,           // "assets/audio/sfx.json" (cues for mgp sfx mix)
    assets: [],          // { file, source, provider, model, job, seed, license, meta, notes }
  };
}

/** Absolute times of every key pose (scene.start + poses[i]), sorted and unique. */
export function keyPoseTimes(p) {
  if (p && !p.scenes) p = normalizeProject(p);
  const t = [];
  for (const a of (p && p.scenes) || []) for (const k of a.poses || []) t.push(+((+a.start || 0) + +k).toFixed(4));
  return [...new Set(t)].sort((a, b) => a - b);
}

/**
 * Check project.json against the composition being checked. Never throws;
 * every finding is a warning (project.json is a companion, not part of the render contract).
 */
export async function checkProject(file, info, { warn, ok }) {
  let raw, p;
  try { raw = JSON.parse(fs.readFileSync(file, "utf8")); p = normalizeProject(raw); }
  catch (e) { warn(L`project.json cannot be read: ${e.message}`); return; }
  const name = path.basename(file);
  const dir = path.dirname(file), rel = path.relative(process.cwd(), file) || file;
  const missing = [];
  const exists = (f, what) => {
    if (!f) return;
    if (/^https?:/i.test(f)) return;
    if (!fs.existsSync(path.resolve(dir, f))) missing.push(`${what}: ${f}`);
  };
  exists(p.composition, L`composition`);
  const s = p.voice || {};
  for (const v of s.vo || []) {
    exists(v.file, `VO ${v.id || ""}`.trim());
    exists(v.script, L`script`);
    exists(v.words, L`word timing`);
    exists(v.letters, L`letter timing`);
  }
  for (const a of p.scenes) exists(a.composition, L`scene ${a.id}`);
  if (p.caption && p.caption.file) exists(p.caption.file, "caption");
  if (typeof p.sfx === "string") exists(p.sfx, "sfx");
  for (const a of p.assets) {
    exists(a.file, L`asset`);
    if (a.meta) exists(a.meta, L`asset meta`);
    if (!a.source) warn(L`${name}: asset ${a.file} has no "source" (provenance is required for the T5 log)`);
  }
  const blocks = [...p.blocks.map((b) => b.id), ...p.scenes.flatMap((a) => a.blocks || [])];
  if (blocks.length) {
    let list = null, findBlock = null;
    try { const add = await import("./add.mjs"); list = add.loadCatalog(); findBlock = add.findBlock; } catch { /* no block folder: skip */ }
    if (list) for (const id of new Set(blocks)) {
      if (!id) continue;
      try { const r = findBlock(id, list); if (r.alias && r.old) warn(L`${name}: block ${id} is an old id; new name: ${r.block.id}`); }
      catch { missing.push(L`block: ${id}`); }
    }
  }
  for (const h of missing) warn(L`${name} refers to files that do not exist: ${h}`);

  // meta vs composition
  const m = p.meta || {};
  if (info) {
    if (m.fps && info.fps && +m.fps !== +info.fps) warn(L`${name} fps ${m.fps} != composition ${info.fps}`);
    if (m.width && info.width && (+m.width !== info.width || +m.height !== info.height))
      warn(L`${name} size ${m.width}x${m.height} != composition ${info.width}x${info.height}`);
    if (m.duration && info.duration && Math.abs(+m.duration - info.duration) > 0.05)
      warn(L`${name} duration ${m.duration} s != composition ${info.duration.toFixed(2)} s (update one of them)`);
    for (const a of p.scenes) {
      const end = (+a.start || 0) + (+a.duration || 0);
      if (info.duration && end > info.duration + 0.05) warn(L`${name} scene ${a.id} ends at ${end.toFixed(2)} s, past the composition duration`);
      for (const k of a.poses || []) if (k < 0 || (a.duration && k > a.duration)) warn(L`${name} scene ${a.id}: key pose ${k} s is outside the scene`);
    }
  }
  if (s.source === "pending") warn(L`${name}: voice source not chosen yet (decision point G2)`);
  if (!missing.length) ok(L`${name} (${rel}): ${p.scenes.length} scenes, ${(s.vo || []).length} VO, ${p.assets.length} assets, every referenced file exists`);
  return { raw, project: p };
}

// Old names (v2.3 / v2.4-dev).
export { findProject as cariProyek, readProject as bacaProyek, newProject as proyekBaru, keyPoseTimes as waktuKunci, checkProject as cekProyek };
