#!/usr/bin/env node
// Maintenance tool (not part of rendering): download the mgp bundled fonts again into render/fonts/.
//   node src/download-font.mjs              every font in FONT_LIST
//   node src/download-font.mjs "Inter"      one family only (merged into the manifest)
// Source: Google Fonts CSS API v2 (fonts.googleapis.com -> fonts.gstatic.com, WOFF2) and the
// licences from github.com/google/fonts. Only the latin + latin-ext subsets (and arabic for Noto
// Naskh Arabic) are kept so the bundle stays small. Result: fonts/<slug>/*.woff2, OFL.txt per
// family, fonts/fonts.json (the manifest read by src/fonts.mjs) and fonts/fonts.css.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeCss } from "./fonts.mjs";
import { L } from "./i18n.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "..", "fonts");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// [family, css2 axes, subsets kept, licence folder in google/fonts]
export const FONT_LIST = [
  ["Fraunces", "ital,opsz,wght@0,9..144,100..900;1,9..144,100..900"],
  ["Geist", "wght@100..900"],
  ["Geist Mono", "wght@100..900"],
  ["Cinzel", "wght@400..900"],
  ["Inter", "ital,opsz,wght@0,14..32,100..900;1,14..32,100..900"],
  ["Poppins", "ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700"],
  ["Space Grotesk", "wght@300..700"],
  ["Playfair Display", "ital,wght@0,400..900;1,400..900"],
  ["DM Serif Display", "ital@0;1"],
  ["Caveat", "wght@400..700"],
  ["Press Start 2P", ""],
  ["Noto Sans", "ital,wght@0,100..900;1,100..900"],
  ["Noto Naskh Arabic", "wght@400..700", ["arabic", "latin", "latin-ext"]],
  ["JetBrains Mono", "ital,wght@0,100..800;1,100..800"],
  ["Montserrat", "ital,wght@0,100..900;1,100..900"],
  ["Lora", "ital,wght@0,400..700;1,400..700"],
  ["Nunito", "ital,wght@0,200..1000;1,200..1000"],
  ["Bebas Neue", ""],
  ["Anton", ""],
  ["Oswald", "wght@200..700"],
  ["Archivo Black", ""],
  ["Patrick Hand", ""],
  ["Cormorant Garamond", "ital,wght@0,300..700;1,300..700"],
  ["Source Serif 4", "ital,opsz,wght@0,8..60,200..900;1,8..60,200..900"],
];
/** Old name (v2.3 / v2.4-dev). */
export const DAFTAR = FONT_LIST;
const SUBSET = ["latin", "latin-ext"];

export const slugOf = (fam) => fam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function get(url, as = "text") {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA } });
      if (!r.ok) throw new Error(r.status + " " + url);
      return as === "buf" ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (e) { if (i === 2) throw e; await new Promise((r) => setTimeout(r, 800)); }
  }
}

/** Parse Google Fonts CSS: subset comment, then the @font-face block. */
function parseCss(css) {
  const out = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  for (const m of css.matchAll(re)) {
    const b = m[2], prop = (k) => { const x = new RegExp("(?:^|;|\\s)" + k + "\\s*:\\s*([^;]+);").exec(b); return x ? x[1].trim() : null; };
    const src = /url\((https:[^)]+)\)/.exec(b);
    out.push({ subset: m[1], family: prop("font-family").replace(/^['"]|['"]$/g, ""), style: prop("font-style") || "normal",
      weight: prop("font-weight") || "400", stretch: prop("font-stretch"), unicodeRange: prop("unicode-range"), src: src && src[1] });
  }
  return out;
}

/** "ital,opsz,wght@0,9..144,100..900;..." -> "ital,wght@0,100..900;..." */
function withoutOpsz(axes) {
  const [names, vals] = axes.split("@");
  const k = names.split(","), i = k.indexOf("opsz");
  return k.filter((_, j) => j !== i).join(",") + "@" + vals.split(";").map((t) => t.split(",").filter((_, j) => j !== i).join(",")).join(";");
}

async function one([fam, axes, subsets = SUBSET]) {
  const slug = slugOf(fam);
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  // Families with an opsz axis are downloaded twice: with opsz (used when the query asks for opsz, and in
  // fonts.css) and without opsz (the default instance, the same one Google sends for a query without opsz).
  const variants = [[axes, axes && /opsz/.test(axes.split("@")[0]) ? true : undefined]];
  if (variants[0][1]) variants.push([withoutOpsz(axes), false]);
  const rec = [];
  for (const [ax, opsz] of variants) {
    const url = "https://fonts.googleapis.com/css2?family=" + fam.replace(/ /g, "+") + (ax ? ":" + ax : "") + "&display=block";
    const faces = parseCss(await get(url)).filter((f) => subsets.includes(f.subset));
    if (!faces.length) throw new Error(L`no face for ${fam}`);
    for (const f of faces) {
      const file = `${slug}-${f.style}-${f.weight.replace(/\s+/g, "_")}${opsz ? "-opsz" : ""}-${f.subset}.woff2`;
      const buf = await get(f.src, "buf");
      if (buf.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error(L`not WOFF2: ${f.src}`);
      fs.writeFileSync(path.join(dir, file), buf);
      rec.push({ style: f.style, weight: f.weight, stretch: f.stretch || undefined, opsz, subset: f.subset, unicodeRange: f.unicodeRange, file: slug + "/" + file,
        gstatic: f.src.replace(/^https:\/\/fonts\.gstatic\.com/, ""), bytes: buf.length });
    }
  }
  // licence: ofl/<name> (or apache/ and ufl/ just in case)
  const key = fam.toLowerCase().replace(/[^a-z0-9]/g, "");
  let lic = null;
  for (const [d, f, id] of [["ofl", "OFL.txt", "OFL-1.1"], ["apache", "LICENSE.txt", "Apache-2.0"], ["ufl", "UFL.txt", "UFL-1.0"]]) {
    try { const t = await get(`https://raw.githubusercontent.com/google/fonts/main/${d}/${key}/${f}`); fs.writeFileSync(path.join(dir, f), t.replace(/\r?\n/g, "\n")); lic = { id, file: slug + "/" + f, copyright: (t.split(/\r?\n/).find((l) => /copyright/i.test(l)) || "").trim() }; break; }
    catch { /* try the next folder */ }
  }
  if (!lic) throw new Error(L`licence not found for ${fam}`);
  process.stderr.write("  " + L`${fam}: ${rec.length} files, ${(rec.reduce((a, r) => a + r.bytes, 0) / 1024).toFixed(0)} KB, ${lic.id}` + "\n");
  return { family: fam, slug, axes, license: lic, faces: rec };
}

async function main() {
  const pick = process.argv.slice(2);
  const list = pick.length ? FONT_LIST.filter(([f]) => pick.includes(f)) : FONT_LIST;
  if (!list.length) throw new Error(L`unknown family: ${pick.join(", ")}`);
  fs.mkdirSync(OUT, { recursive: true });
  const manPath = path.join(OUT, "fonts.json");
  const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, "utf8")) : { families: [] };
  for (const d of list) {
    const r = await one(d);
    man.families = man.families.filter((f) => f.family !== r.family).concat(r);
  }
  const order = FONT_LIST.map(([f]) => f);
  man.families.sort((a, b) => order.indexOf(a.family) - order.indexOf(b.family));
  delete man.sumber; delete man.diunduh; // old keys (v2.3 / v2.4-dev)
  man.source = "Google Fonts CSS API v2 (WOFF2), licences from github.com/google/fonts";
  man.downloaded = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(manPath, JSON.stringify(man, null, 1) + "\n");
  writeCss(OUT, man);
  const total = man.families.reduce((a, f) => a + f.faces.reduce((b, x) => b + x.bytes, 0), 0);
  process.stderr.write(L`done: ${man.families.length} families, ${(total / 1048576).toFixed(2)} MB -> ${OUT}` + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("download-font: " + e.message); process.exitCode = 1; });
}
