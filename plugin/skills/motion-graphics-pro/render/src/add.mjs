// mgp add / mgp catalog: insert blocks from the Motion Graphics Pro block registry
// (folder ../../blocks, old name blok/) into an HTML composition, and search the catalog.
// Written for mgp; the "add" and "catalog" ideas follow HyperFrames (Apache-2.0).
// Old block ids (transisi/robek), HyperFrames names (torn-paper-rip), old prop names (arah) and old option
// values (vertikal) are translated through block.json / catalog.json `aliases`, `prop_aliases`, props[*].aliases
// and props[*].option_aliases. An old skill tree (blok/<category>/<name>/blok.json) is still read.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./names.mjs";
import { L, lang } from "./i18n.mjs";
import { motionLib } from "./location.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const CORE = [["_core", "block-core.js"], ["_inti", "blok-inti.js"]]; // new tree, old tree
// old category names, used when catalog.json is missing (old tree) or does not list them
const CATEGORY_OLD = {
  aksen: "accents", galeri: "gallery", judul: "titles", kamera: "camera", kertas: "paper", kode: "code", label: "labels",
  latar: "backgrounds", logo: "logos", paket: "packs", peta: "maps", sosial: "social", subtitle: "subtitles", tangan: "hands",
  teks: "text", tekstur: "textures", tokoh: "characters", transisi: "transitions",
};
// an engine already loaded by the composition: gsap, old gerak.js, or motion.js (file name)
const ENGINE_RE = /<script[^>]+src=["'](?:[^"']*(?:gsap|gerak)[^"']*|(?:[^"']*\/)?motion(?:\.min)?\.m?js(?:\?[^"']*)?)["']/i;

const coreOf = (dir) => { for (const p of CORE) { const f = path.join(dir, ...p); if (fs.existsSync(f)) return f; } return null; };

/** The block folder: env MGP_BLOCKS_DIR (old REKAM_BLOK), motion-graphics-pro/blocks, or an old tree's blok/. */
export function blocksDir() {
  const cands = [env("MGP_BLOCKS_DIR"), path.resolve(here, "../../blocks"), path.resolve(here, "../../blok")].filter(Boolean);
  for (const c of cands) if (coreOf(c)) return c;
  throw new Error(L`block folder not found (set env MGP_BLOCKS_DIR=<path to motion-graphics-pro/blocks>)`);
}

function catalogFile(dir) {
  for (const n of ["catalog.json", "katalog.json"]) {
    try { return JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")); } catch { /* next */ }
  }
  return null;
}

/** Old category name -> new one (from catalog.json category_aliases, else the built-in table). */
export function categoryOf(c, dir) {
  if (!c) return c;
  let ali = CATEGORY_OLD;
  try { const cat = catalogFile(dir || blocksDir()); if (cat && cat.category_aliases) ali = { ...CATEGORY_OLD, ...cat.category_aliases }; } catch { /* built-in */ }
  return ali[c] || c;
}

/** Block metadata with the new key names (old blok.json keys are read too). */
function normalizeBlock(m, file) {
  const props = {};
  for (const [k, d] of Object.entries(m.props || {})) {
    if (!d || typeof d !== "object") { props[k] = { default: d }; continue; }
    props[k] = {
      ...d, default: d.default !== undefined ? d.default : d.bawaan, type: d.type || d.jenis,
      options: d.options || d.pilihan, hint: d.hint || d.ket, aliases: d.aliases || [], option_aliases: d.option_aliases || {},
    };
  }
  const dir = path.dirname(file);
  return {
    ...m, id: m.id, name: m.name || m.nama, name_id: m.name_id || m.nama, category: m.category || m.kategori,
    description: m.description || m.deskripsi, tags: m.tags || m.tag || [], duration: m.duration ?? m.durasi,
    dependencies: m.dependencies || m.dependensi || [], props, prop_aliases: m.prop_aliases || {},
    aliases: [...new Set([...(m.aliases || []), ...(m.nama_lama || []), ...(m.hyperframes || [])])],
    __html: ["block.html", "blok.html"].map((n) => path.join(dir, n)).find((f) => fs.existsSync(f)),
    __dir: dir,
  };
}

/** Every block, scanned from <category>/<name>/block.json (old tree: blok.json). */
export function loadCatalog(dir = blocksDir()) {
  const list = [];
  for (const cat of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!cat.isDirectory() || /^[_.]/.test(cat.name) || cat.name === "tools" || cat.name === "alat") continue;
    for (const b of fs.readdirSync(path.join(dir, cat.name), { withFileTypes: true })) {
      if (!b.isDirectory()) continue;
      const f = ["block.json", "blok.json"].map((n) => path.join(dir, cat.name, b.name, n)).find((x) => fs.existsSync(x));
      if (!f) continue;
      try { list.push(normalizeBlock(JSON.parse(fs.readFileSync(f, "utf8")), f)); }
      catch (e) { console.error(L`mgp: broken ${path.basename(f)}: ${f}: ${e.message}`); }
    }
  }
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Find one block by id ("transitions/slide"), name only ("slide"), old id ("transisi/geser"),
 * old category + name, or HyperFrames item name ("push-in"). Returns { block, alias?, old?, hf? }.
 */
export function findBlock(q, list) {
  const exact = list.find((b) => b.id === q);
  if (exact) return { block: exact };
  const oldId = list.filter((b) => b.aliases.includes(q) && q.includes("/"));
  if (oldId.length) return { block: oldId[0], alias: q, old: true };
  if (q.includes("/")) {
    const [c, n] = q.split("/");
    const nc = categoryOf(c);
    const hit = list.find((b) => b.id === nc + "/" + n) || list.find((b) => b.category === nc && b.aliases.some((a) => a.split("/")[1] === n));
    if (hit) return { block: hit, alias: q, old: true };
  }
  const byName = list.filter((b) => b.id.split("/")[1] === q);
  if (byName.length === 1) return { block: byName[0] };
  if (byName.length > 1) throw new Error(L`name "${q}" exists in several categories: ${byName.map((b) => b.id).join(", ")}; write category/name in full`);
  const oldName = list.filter((b) => b.aliases.some((a) => a.includes("/") && a.split("/")[1] === q));
  if (oldName.length === 1) return { block: oldName[0], alias: q, old: true };
  const hf = list.filter((b) => b.aliases.includes(q));
  if (hf.length) return { block: hf[0], alias: q, hf: true };
  const hint = score(q, list).slice(0, 5).map((r) => r.b.id);
  throw new Error(L`block "${q}" not found.` + (hint.length ? " " + L`Maybe: ${hint.join(", ")}` : "") + "\n" + L`Search: mgp catalog --search "${q}"`);
}

/** Translate one --prop key/value to the block's canonical prop name and option value. */
export function translateProp(block, k, v) {
  const props = block.props || {};
  let key = k, note = null;
  if (!(k in props)) {
    const hit = Object.keys(props).find((p) => (props[p].aliases || []).includes(k)) || (block.prop_aliases || {})[k];
    if (hit && hit in props) { key = hit; note = L`old prop name "${k}" -> "${key}"`; }
  }
  const d = props[key];
  if (d && typeof v === "string" && d.option_aliases && d.option_aliases[v] !== undefined) {
    const nv = d.option_aliases[v];
    note = (note ? note + "; " : "") + L`old value "${v}" -> "${nv}"`;
    v = nv;
  }
  return { key, value: v, known: key in props, note };
}

function score(q, list) {
  const words = String(q || "").toLowerCase().split(/[\s,/]+/).filter(Boolean);
  const out = [];
  for (const b of list) {
    const fields = [
      [b.id, 6], [b.name, 4], [b.name_id, 4], [(b.tags || []).join(" "), 3], [(b.aliases || []).join(" "), 3],
      [b.description?.id, 1], [b.description?.en, 1],
    ];
    let s = 0;
    for (const w of words) {
      let hit = 0;
      for (const [txt, wt] of fields) if (txt && String(txt).toLowerCase().includes(w)) hit = Math.max(hit, wt);
      if (!hit) { s = 0; break; }
      s += hit;
    }
    if (s) out.push({ b, s });
  }
  return out.sort((a, b) => b.s - a.s || a.b.id.localeCompare(b.b.id));
}

// ------------------------------------------------------------------ catalog
export function catalog(o = {}) {
  const list = loadCatalog();
  const id = lang() === "id";
  let res = list;
  const cat = o.category ? categoryOf(o.category) : null;
  if (cat) res = res.filter((b) => b.category === cat);
  if (o.search) res = score(o.search, res).map((r) => r.b);
  if (o.json) {
    return JSON.stringify({ count: res.length, search: o.search || null, blocks: res.map(({ __dir, __html, example, contoh, ...b }) => b) }, null, 2);
  }
  if (!o.search && !cat) {
    const per = {};
    for (const b of list) per[b.category] = (per[b.category] || 0) + 1;
    return L`${list.length} blocks in ${Object.keys(per).length} categories:` + "\n" +
      Object.entries(per).map(([k, n]) => `  ${k.padEnd(12)} ${n}`).join("\n") + "\n\n" +
      L`Search:  mgp catalog --search glitch
List:    mgp catalog --category transitions
Insert:  mgp add transitions/slide --into composition.html --prop direction=right`;
  }
  if (!res.length) return L`No block matches "${o.search || o.category}".`;
  const w = Math.max(...res.map((b) => b.id.length)) + 2;
  return res.map((b) => `${b.id.padEnd(w)}${String(b.duration).padStart(4)}s  ${(id ? b.name_id : b.name) || b.name}  ·  ${((id ? b.description?.id : b.description?.en) || b.description?.en || b.description?.id || "").slice(0, 90)}`).join("\n") +
    "\n\n" + L`${res.length} blocks. Insert: mgp add <id> --into composition.html`;
}

// ------------------------------------------------------------------ small HTML helpers
/** Index of the end (after >) of the closing tag of the element whose opening tag starts at `start`. */
function elementEnd(html, start) {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (!m[2]) continue; // comment
    const tag = m[2].toLowerCase();
    if (!m[1] && (tag === "script" || tag === "style")) {
      const close = html.toLowerCase().indexOf("</" + tag, re.lastIndex);
      if (close < 0) return -1;
      re.lastIndex = html.indexOf(">", close) + 1;
      continue;
    }
    if (VOID.has(tag) || m[3]) { if (depth === 0) return re.lastIndex; continue; }
    if (m[1]) { depth--; if (depth === 0) return m.index; }
    else depth++;
  }
  return -1;
}

function findOpenTag(html, sel) {
  let re;
  if (!sel) re = /<[a-zA-Z][\w-]*\b[^>]*\bdata-composition-id=["'][^"']*["'][^>]*>/;
  else if (sel.startsWith("#")) re = new RegExp(`<[a-zA-Z][\\w-]*\\b[^>]*\\bid=["']${sel.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`);
  else re = new RegExp(`<[a-zA-Z][\\w-]*\\b[^>]*\\bdata-composition-id=["']${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`);
  const m = re.exec(html);
  return m ? m.index : -1;
}

function propValue(v) {
  if (v === undefined) return true;
  try { return JSON.parse(v); } catch { return v; }
}

/** Apply id, props and timing to a block snippet. */
export function prepareSnippet(block, { uid, props = {}, start, duration, track } = {}) {
  let s = fs.readFileSync(block.__html || path.join(block.__dir, "block.html"), "utf8").replaceAll("__ID__", uid);
  const m = /(<script[^>]*data-(?:block|blok)-props[^>]*>)([\s\S]*?)(<\/script>)/.exec(s);
  if (m) {
    const cur = JSON.parse(m[2]);
    Object.assign(cur, props);
    s = s.slice(0, m.index) + m[1] + "\n" + JSON.stringify(cur) + "\n" + m[3] + s.slice(m.index + m[0].length);
  }
  const tagRe = new RegExp(`<div[^>]*data-composition-id="${uid}"[^>]*>`);
  s = s.replace(tagRe, (tag) => {
    if (start != null) tag = tag.replace(/data-start="[^"]*"/, `data-start="${+start}"`);
    if (duration != null) tag = tag.replace(/data-duration="[^"]*"/, `data-duration="${+duration}"`);
    if (track != null) tag = tag.replace(/data-track-index="[^"]*"/, `data-track-index="${+track}"`);
    return tag;
  });
  return s;
}

function fontsFromProps(block, props) {
  const out = [];
  for (const [k, def] of Object.entries(block.props || {})) {
    if (!def || def.type !== "font") continue;
    const v = props[k] !== undefined ? props[k] : def.default;
    if (v && !/^(system-ui|sans-serif|serif|monospace)$/i.test(v)) out.push(v);
  }
  return out;
}

// ------------------------------------------------------------------ add
/** Insert one or more blocks (q = id or array of ids). --prop only applies to a single block. */
export function add(q, o = {}) {
  const ids = (Array.isArray(q) ? q : [q]).filter(Boolean);
  if (ids.length <= 1) return addOne(ids[0], o);
  if (o.prop && [].concat(o.prop).length) throw new Error(L`--prop is for one block per call; insert the other blocks separately`);
  return { many: ids.map((id) => addOne(id, o)) };
}

function addOne(q, o = {}) {
  if (!q) throw new Error(L`usage: mgp add <category/name> [--into composition.html] [--prop key=value ...]`);
  const dir = blocksDir();
  const list = loadCatalog(dir);
  const { block, alias, old, hf } = findBlock(q, list);
  const props = {};
  const unknown = [];
  const notes = [];
  if (alias && hf) notes.push(L`"${alias}" (HyperFrames) is mapped to block ${block.id}`);
  else if (alias) notes.push(L`old block id "${alias}" -> ${block.id}`);
  for (const p of [].concat(o.prop || [])) {
    const i = p.indexOf("=");
    const r = translateProp(block, i < 0 ? p : p.slice(0, i), propValue(i < 0 ? undefined : p.slice(i + 1)));
    props[r.key] = r.value;
    if (r.note) notes.push(r.note);
    if (!r.known) unknown.push(r.key);
  }
  const base = "blk-" + block.id.split("/")[1];
  if (unknown.length) notes.push(L`props this block does not know: ${unknown.join(", ")} (written anyway)`);

  if (!o.into) {
    const snip = prepareSnippet(block, { uid: base, props, start: o.start, duration: o.duration, track: o.track });
    return { text: snip, notes, block: block.id };
  }

  const comp = path.resolve(o.into);
  if (!fs.existsSync(comp)) throw new Error(L`composition does not exist: ${comp}`);
  let html = fs.readFileSync(comp, "utf8");
  let uid = base, n = 1;
  while (html.includes(`data-composition-id="${uid}"`)) uid = `${base}-${++n}`;
  const snip = prepareSnippet(block, { uid, props, start: o.start, duration: o.duration, track: o.track });

  // support files -> <composition folder>/blocks/ (a project that already has the old blok/blok-inti.js keeps
  // that folder: the new core is backward compatible and overwrites it, so there is never a second core)
  const compDir = path.dirname(comp);
  const oldCore = path.join(compDir, "blok", "blok-inti.js");
  const useOld = !fs.existsSync(path.join(compDir, "blocks", "block-core.js")) && fs.existsSync(oldCore);
  const libName = useOld ? "blok" : "blocks";
  const libDir = path.join(compDir, libName);
  const coreName = useOld ? "blok-inti.js" : "block-core.js";
  const copy = [[coreOf(dir), path.join(libDir, coreName)]];
  const depTags = [`<script src="${libName}/${coreName}"></script>`];
  for (const d of block.dependencies || []) {
    if (!d.startsWith("lib:")) continue;
    let f = d.slice(4);
    let dist = path.resolve(dir, "../../motion-graphics/lib/dist");
    if (!fs.existsSync(dist)) { const lib = motionLib("dist"); if (lib) dist = path.join(lib, "dist"); }
    if (f === "mgp-paket.js" && !fs.existsSync(path.join(dist, f))) f = "mgp-packs.js"; // old file name
    const src = path.join(dist, f);
    if (!fs.existsSync(src)) throw new Error(L`dependency ${d} not found in ${src} (is the motion-graphics skill installed next to motion-graphics-pro?)`);
    copy.push([src, path.join(libDir, f)]);
    depTags.push(`<script src="${libName}/${f}"></script>`);
  }

  // <head>: mgp.motion (the package animation engine, GSAP-compatible API), fonts, core, lib.
  // A composition that already loads GSAP / motion.js (or the old gerak.js) is left alone; otherwise motion.js is
  // copied next to the blocks so the composition also runs from file:// without internet.
  let head = "";
  if (!ENGINE_RE.test(html)) {
    const lib = motionLib("motion/motion.js");
    const g = [path.resolve(dir, "../../motion-graphics/lib/motion/motion.js"), lib && path.join(lib, "motion", "motion.js"), path.join(here, "motion.js"), path.resolve(dir, "../../motion-graphics/lib/gerak/gerak.js")].find((p) => p && fs.existsSync(p));
    if (!g) throw new Error(L`motion.js not found (motion-graphics/lib/motion/motion.js or render/src/motion.js)`);
    copy.unshift([g, path.join(libDir, "motion.js")]);
    head += `<script src="${libName}/motion.js"></script>\n`;
  }
  for (const f of fontsFromProps(block, props)) {
    const href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, "+")}&display=block`;
    if (!html.includes(href)) head += `<link rel="stylesheet" href="${href}">\n`;
  }
  for (const t of depTags) if (!html.includes(t)) head += t + "\n";
  if (head) {
    if (/<\/head>/i.test(html)) html = html.replace(/\s*<\/head>/i, "\n" + head + "</head>");
    else html = head + html;
  }

  // insert the snippet before the container's closing tag
  const sel = o.container || null;
  const st = findOpenTag(html, sel);
  let pos = -1;
  if (st >= 0) pos = elementEnd(html, st);
  else if (sel) throw new Error(L`container ${sel} not found in ${path.basename(comp)}`);
  if (pos < 0) pos = html.search(/<\/body>/i);
  if (pos < 0) pos = html.length;
  const comment = `\n<!-- mgp add ${block.id} -->\n`;
  html = html.slice(0, pos) + comment + snip.trim() + "\n" + html.slice(pos);

  if (!o["dry-run"]) {
    fs.mkdirSync(libDir, { recursive: true });
    for (const [a, b] of copy) fs.copyFileSync(a, b);
    fs.writeFileSync(comp, html);
  }
  return {
    block: block.id, id: uid, composition: comp, container: sel || (st >= 0 ? L`root composition` : "<body>"),
    start: o.start != null ? +o.start : null, duration: o.duration != null ? +o.duration : block.duration,
    props, files: copy.map(([, b]) => path.relative(compDir, b).replace(/\\/g, "/")), notes, dryRun: !!o["dry-run"],
  };
}

export function printAdd(r) {
  if (r.many) return r.many.map(printAdd).join("\n");
  const dflt = L`data-start default`;
  if (r.text) return (r.notes.length ? r.notes.map((c) => "// " + c).join("\n") + "\n" : "") + r.text;
  return [
    (r.dryRun ? L`(dry run) ` : "") + L`block ${r.block} inserted as #${r.id} in ${path.basename(r.composition)} (${r.container})`,
    L`  timing: start ${r.start ?? dflt} · duration ${r.duration}s`,
    Object.keys(r.props).length ? L`  props: ${JSON.stringify(r.props)}` : L`  props: defaults`,
    L`  files: ${r.files.join(", ")}`,
    ...r.notes.map((c) => L`  note: ${c}`),
    L`  check: mgp check ${path.basename(r.composition)}`,
  ].join("\n");
}

// Old names (v2.3 / v2.4-dev).
export { blocksDir as folderBlok, loadCatalog as muatKatalog, catalog as katalog, prepareSnippet as siapkanPotongan, add as tambah, printAdd as cetakTambah };
/** Old name: cariBlok returned { blok, alias }. */
export function cariBlok(q, list) { const r = findBlock(q, list); return { blok: r.block, alias: r.alias }; }
