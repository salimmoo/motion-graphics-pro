#!/usr/bin/env node
// keys.mjs · lists the message keys used in a module (L`...` templates and t("...") calls) and compares them with the catalogs.
//   node render/i18n/tools/keys.mjs src/check.mjs            -> missing / unused keys for i18n/id/check.json
//   node render/i18n/tools/keys.mjs --write-en src/check.mjs  -> (re)write i18n/en/check.json as an identity catalog
//   node render/i18n/tools/keys.mjs --all                     -> report for every module that has a catalog
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RENDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Keys of L`...` tagged templates (with ${...} -> {}) and of t("...") calls. Handles nested templates inside ${...}. */
export function keysOf(src) {
  const keys = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "L" && src[i + 1] === "`" && !/[\w$.]/.test(src[i - 1] || "")) {
      let j = i + 2, key = "", depth = 0;
      while (j < src.length) {
        const c = src[j];
        if (c === "\\") { const n = src[j + 1]; key += n === "`" ? "`" : n === "$" ? "$" : n === "\\" ? "\\" : n === "n" ? "\n" : "\\" + n; j += 2; continue; }
        if (c === "`") break;
        if (c === "$" && src[j + 1] === "{") {
          key += "{}"; j += 2; depth = 1;
          while (j < src.length && depth) { const d = src[j]; if (d === "{") depth++; else if (d === "}") depth--; else if (d === "`") { j++; while (j < src.length && src[j] !== "`") { if (src[j] === "\\") j++; j++; } } else if (d === '"' || d === "'") { const q = d; j++; while (j < src.length && src[j] !== q) { if (src[j] === "\\") j++; j++; } } j++; }
          continue;
        }
        key += c; j++;
      }
      keys.push(key); i = j;
    }
  }
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.push(JSON.parse('"' + m[1] + '"'));
  return [...new Set(keys)];
}

function report(file, writeEn) {
  const mod = path.basename(file).replace(/\.(m?js|py)$/, "");
  const keys = keysOf(fs.readFileSync(file, "utf8"));
  const idf = path.join(RENDER, "i18n", "id", mod + ".json"), enf = path.join(RENDER, "i18n", "en", mod + ".json");
  const id = fs.existsSync(idf) ? JSON.parse(fs.readFileSync(idf, "utf8")) : {};
  const missing = keys.filter((k) => !(k in id)), unused = Object.keys(id).filter((k) => !keys.includes(k));
  if (writeEn) fs.writeFileSync(enf, JSON.stringify(Object.fromEntries(keys.map((k) => [k, k])), null, 1) + "\n");
  return { mod, keys: keys.length, missing, unused };
}

const args = process.argv.slice(2);
const writeEn = args.includes("--write-en");
let files = args.filter((a) => !a.startsWith("--"));
if (args.includes("--all")) files = fs.readdirSync(path.join(RENDER, "src")).filter((f) => /\.m?js$/.test(f)).map((f) => path.join("src", f));
let bad = 0;
for (const f of files) {
  const r = report(path.resolve(RENDER, f), writeEn);
  if (!r.keys) continue;
  console.log(`${r.mod}: ${r.keys} keys, ${r.missing.length} without Indonesian, ${r.unused.length} unused`);
  for (const k of r.missing.slice(0, 20)) console.log("   missing: " + JSON.stringify(k).slice(0, 140));
  for (const k of r.unused.slice(0, 10)) console.log("   unused : " + JSON.stringify(k).slice(0, 140));
  bad += r.missing.length;
}
process.exitCode = bad ? 1 : 0;
