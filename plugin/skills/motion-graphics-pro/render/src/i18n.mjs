// i18n.mjs · bilingual program messages for mgp.
// English by default; Indonesian with MGP_LANG=id, or automatically when LC_ALL / LC_MESSAGES / LANG starts with "id".
// MGP_LANG=en forces English. Catalogs: render/i18n/<lang>/<module>.json, flat {"English message": "translation"};
// placeholders are {} (in order) or {0}, {1}, ... (any order).
//
// Usage in a module:   import { L } from "./i18n.mjs";   console.log(L`rendered ${n} frames in ${s} s`);
// The catalog key is the English text with each ${...} replaced by {} ("rendered {} frames in {} s").
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "i18n");

/** Active language: "en" | "id". */
export function lang() {
  const m = (process.env.MGP_LANG || "").toLowerCase();
  if (m) return m.startsWith("id") ? "id" : "en";
  for (const k of ["LC_ALL", "LC_MESSAGES", "LANG"]) {
    const v = (process.env[k] || "").toLowerCase();
    if (v) return v.startsWith("id") ? "id" : "en";
  }
  return "en";
}

let CAT = null, CAT_LANG = null;
function catalog() {
  const l = lang();
  if (CAT && CAT_LANG === l) return CAT;
  CAT = {}; CAT_LANG = l;
  const d = path.join(DIR, l);
  try {
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json")).sort()) {
      try { Object.assign(CAT, JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))); } catch { /* broken catalog: fall back to English */ }
    }
  } catch { /* no catalog folder */ }
  return CAT;
}

function fill(tpl, vals) {
  let n = 0;
  return tpl.replace(/\{(\d*)\}/g, (m, i) => { const v = i === "" ? vals[n++] : vals[+i]; return v === undefined ? m : String(v); });
}

/** Tagged template: L`text ${a} more ${b}` -> translated text. */
export function L(strings, ...vals) {
  const key = strings.join("{}");
  const tr = catalog()[key];
  return fill(tr != null ? tr : key, vals);
}

/** Function form: t("text {} more {}", a, b). */
export function t(key, ...vals) {
  const tr = catalog()[key];
  return fill(tr != null ? tr : key, vals);
}

/** Pick one of two inline texts (for long help blocks kept next to the code): pick(english, indonesian). */
export const pick = (en, id) => (lang() === "id" && id != null ? id : en);
