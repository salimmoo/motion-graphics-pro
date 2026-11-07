// mgp Studio - reads and edits the composition HTML source precisely.
// Modul ini dipakai di browser (Studio) dan di Node (uji). Tanpa dependensi.
// Prinsip: sumber tidak pernah diserialisasi ulang. Setiap suntingan mengganti rentang
// teks yang sudah dilokasi oleh pemindai, jadi format, komentar, dan skrip lain tetap utuh.
import { t } from "./i18n.js";

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);

export const decodeEnt = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|quot|amp|lt|gt|apos|nbsp);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k === "quot") return '"'; if (k === "amp") return "&"; if (k === "lt") return "<"; if (k === "gt") return ">";
  if (k === "apos") return "'"; if (k === "nbsp") return " ";
  if (k[1] === "x") return String.fromCodePoint(parseInt(k.slice(2), 16));
  return String.fromCodePoint(parseInt(k.slice(1), 10));
});
export const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Tulis atribut: kutip ganda, kecuali nilai memuat " tetapi tidak ' (mis. JSON). */
export function attrText(name, value) {
  if (value === true || value === "") return name + (value === "" ? '=""' : "");
  const v = String(value);
  if (v.includes('"') && !v.includes("'")) return name + "='" + v.replace(/&/g, "&amp;") + "'";
  return name + '="' + v.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '"';
}

/**
 * Pindai HTML menjadi daftar tag dengan offset sumber.
 * tag: { i, name, start, end, attrs[], parent, children[], close:{start,end}|null, innerStart, innerEnd, selfClose, inTemplate }
 */
export function scanHTML(src) {
  const tags = [];
  const stack = [];
  let pos = 0;
  const n = src.length;
  const lower = src.toLowerCase();
  while (pos < n) {
    const lt = src.indexOf("<", pos);
    if (lt < 0) break;
    if (src.startsWith("<!--", lt)) { const e = src.indexOf("-->", lt + 4); pos = e < 0 ? n : e + 3; continue; }
    if (src[lt + 1] === "!" || src[lt + 1] === "?") { const e = src.indexOf(">", lt); pos = e < 0 ? n : e + 1; continue; }
    if (src[lt + 1] === "/") {
      const m = /^<\/([a-zA-Z][\w:-]*)\s*>/.exec(src.slice(lt, lt + 80));
      if (!m) { pos = lt + 2; continue; }
      const name = m[1].toLowerCase();
      const end = lt + m[0].length;
      let k = stack.length - 1;
      while (k >= 0 && stack[k].name !== name) k--;
      if (k >= 0) {
        for (let j = stack.length - 1; j > k; j--) { const t = stack[j]; t.innerEnd = lt; }
        const t = stack[k];
        t.close = { start: lt, end }; t.innerEnd = lt;
        stack.length = k;
      }
      pos = end; continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)/.exec(src.slice(lt, lt + 80));
    if (!m) { pos = lt + 1; continue; }
    const name = m[1].toLowerCase();
    let p = lt + m[0].length;
    const attrs = [];
    let selfClose = false;
    // atribut
    while (p < n) {
      while (p < n && /\s/.test(src[p])) p++;
      if (src[p] === ">") { p++; break; }
      if (src[p] === "/" && src[p + 1] === ">") { selfClose = true; p += 2; break; }
      if (src[p] === "/") { p++; continue; }
      const as = p;
      while (p < n && !/[\s/>=]/.test(src[p])) p++;
      const an = src.slice(as, p);
      let j = p; while (j < n && /\s/.test(src[j])) j++;
      if (src[j] === "=") {
        j++; while (j < n && /\s/.test(src[j])) j++;
        let vs, ve, q = "";
        if (src[j] === '"' || src[j] === "'") { q = src[j]; vs = j + 1; ve = src.indexOf(q, vs); if (ve < 0) ve = n; p = ve + 1; }
        else { vs = j; ve = j; while (ve < n && !/[\s>]/.test(src[ve])) ve++; p = ve; }
        attrs.push({ name: an.toLowerCase(), raw: an, value: decodeEnt(src.slice(vs, ve)), start: as, end: p, vStart: vs, vEnd: ve, quote: q });
      } else if (an) {
        attrs.push({ name: an.toLowerCase(), raw: an, value: "", start: as, end: p, vStart: p, vEnd: p, quote: null, bare: true });
      } else p++;
    }
    const parent = stack.length ? stack[stack.length - 1] : null;
    const tag = { i: tags.length, name, start: lt, end: p, nameEnd: lt + m[0].length, attrs, parent: parent ? parent.i : -1, children: [], close: null, innerStart: p, innerEnd: p, selfClose,
      inTemplate: !!(parent && (parent.name === "template" || parent.inTemplate)) };
    tags.push(tag);
    if (parent) parent.children.push(tag.i);
    if (VOID.has(name) || selfClose) { pos = p; continue; }
    if (RAW.has(name)) {
      const re = new RegExp("</" + name + "\\s*>", "ig");
      re.lastIndex = p;
      const mm = re.exec(lower) ;
      const cs = mm ? mm.index : n;
      tag.innerEnd = cs;
      tag.close = mm ? { start: cs, end: cs + mm[0].length } : null;
      pos = mm ? cs + mm[0].length : n;
      continue;
    }
    stack.push(tag);
    pos = p;
  }
  for (const t of stack) if (t.innerEnd === t.innerStart) t.innerEnd = n;
  return tags;
}

export const attrOf = (tag, name) => { const a = tag.attrs.find((x) => x.name === name); return a ? a.value : null; };
export const hasAttr = (tag, name) => tag.attrs.some((x) => x.name === name);

/** Sisipkan data-studio-sid ke setiap tag (hanya untuk versi yang dilayani ke pratinjau). */
export function withSids(src, prefix) {
  const tags = scanHTML(src);
  let out = "", last = 0;
  for (const t of tags) {
    if (t.name === "html" || t.name === "head" || t.name === "script" || t.name === "style" || t.name === "meta" || t.name === "link" || t.name === "title") continue;
    out += src.slice(last, t.nameEnd) + ' data-studio-sid="' + prefix + ":" + t.i + '"';
    last = t.nameEnd;
  }
  return out + src.slice(last);
}

// ------------------------------------------------------------------ operasi suntingan
const splice = (s, a, b, ins) => s.slice(0, a) + ins + s.slice(b);
function tagAt(src, i) { const tags = scanHTML(src); const t = tags[i]; if (!t) throw new Error("tag #" + i + " tidak ada"); return { tags, t }; }

export function setAttr(src, i, name, value) {
  const { t } = tagAt(src, i);
  const a = t.attrs.find((x) => x.name === name);
  if (value == null || value === false) {
    if (!a) return src;
    let s = a.start; while (s > 0 && /[ \t]/.test(src[s - 1])) s--;
    return splice(src, s, a.end, "");
  }
  const txt = attrText(name, value);
  if (a) return splice(src, a.start, a.end, txt);
  // sisipkan setelah atribut terakhir (atau setelah nama tag)
  const at = t.attrs.length ? t.attrs[t.attrs.length - 1].end : t.nameEnd;
  return splice(src, at, at, " " + txt);
}

export function parseStyle(s) {
  const out = [];
  for (const part of (s || "").split(/;(?![^(]*\))/)) {
    const k = part.indexOf(":");
    if (k < 0) continue;
    const prop = part.slice(0, k).trim().toLowerCase(), val = part.slice(k + 1).trim();
    if (prop) out.push([prop, val]);
  }
  return out;
}
export const styleText = (decls) => decls.map(([p, v]) => p + ": " + v).join("; ");
export function getStyle(src, i, prop) { const { t } = tagAt(src, i); const d = parseStyle(attrOf(t, "style")).find((x) => x[0] === prop); return d ? d[1] : null; }
export function setStyle(src, i, prop, value) {
  const { t } = tagAt(src, i);
  const decls = parseStyle(attrOf(t, "style"));
  const k = decls.findIndex((d) => d[0] === prop);
  if (value == null || value === "") { if (k >= 0) decls.splice(k, 1); }
  else if (k >= 0) decls[k][1] = value; else decls.push([prop, value]);
  return setAttr(src, i, "style", decls.length ? styleText(decls) : null);
}

/** Elemen daun (tanpa anak tag) yang teksnya bisa diganti. */
export function isTextLeaf(tags, t) { return !!t.close && !t.children.length && !RAW.has(t.name) && !VOID.has(t.name); }
export function getText(src, i) { const { t } = tagAt(src, i); return decodeEnt(src.slice(t.innerStart, t.innerEnd)); }
export function setText(src, i, text) {
  const { tags, t } = tagAt(src, i);
  if (!isTextLeaf(tags, t)) throw new Error("Elemen ini memuat elemen lain; teksnya tidak bisa diganti langsung.");
  return splice(src, t.innerStart, t.innerEnd, escText(text));
}
export function setInner(src, i, text) { const { t } = tagAt(src, i); return splice(src, t.innerStart, t.innerEnd, text); }

/** Rentang penuh elemen, termasuk indentasi di depannya dan satu baris baru. */
export function outerRange(src, t) {
  const end = t.close ? t.close.end : t.end;
  let s = t.start; while (s > 0 && /[ \t]/.test(src[s - 1])) s--;
  let e = end; if (src[e] === "\r") e++; if (src[e] === "\n") e++;
  if (!(s === 0 || src[s - 1] === "\n")) s = t.start;
  return [s, e];
}
export function removeEl(src, i) { const { t } = tagAt(src, i); const [a, b] = outerRange(src, t); return splice(src, a, b, ""); }
/** Gandakan elemen; id elemen dan turunannya diberi akhiran. Hasil: { src, ids: {lama: baru} } */
export function duplicateEl(src, i, existingIds) {
  const { tags, t } = tagAt(src, i);
  const [a, b] = outerRange(src, t);
  let chunk = src.slice(a, b);
  if (!/\n$/.test(chunk)) chunk += "\n";
  const map = {};
  const taken = new Set(existingIds || tags.map((x) => attrOf(x, "id")).filter(Boolean));
  chunk = chunk.replace(/(\sid\s*=\s*)(["'])([^"']+)\2/g, (m, pre, q, id) => {
    let k = 2, nid = id + "-" + k; while (taken.has(nid)) nid = id + "-" + (++k);
    taken.add(nid); map[id] = nid; return pre + q + nid + q;
  });
  return { src: splice(src, b, b, chunk), ids: map };
}
/** Tukar elemen dengan saudara sebelah (arah +1 = sesudahnya = tampil di atas). */
export function moveSibling(src, i, dir) {
  const { tags, t } = tagAt(src, i);
  if (t.parent < 0) return src;
  const sib = tags[t.parent].children.filter((c) => !["script", "style", "template"].includes(tags[c].name));
  const k = sib.indexOf(i), o = sib[k + dir];
  if (o == null) return src;
  const A = outerRange(src, t), B = outerRange(src, tags[o]);
  const [first, second] = dir > 0 ? [A, B] : [B, A];
  const s1 = src.slice(first[0], first[1]), s2 = src.slice(second[0], second[1]);
  const fix = (s) => (/\n$/.test(s) ? s : s + "\n");
  return src.slice(0, first[0]) + fix(s2) + src.slice(first[1], second[0]) + fix(s1) + src.slice(second[1]);
}
/** Sisipkan teks sebelum </body> terakhir (atau di akhir berkas). */
export function insertBeforeBodyEnd(src, text) {
  const k = src.toLowerCase().lastIndexOf("</body>");
  return k < 0 ? src + "\n" + text + "\n" : splice(src, k, k, text + "\n");
}
export const findTag = (tags, fn) => tags.find(fn) || null;
export const findById = (tags, id) => tags.find((t) => attrOf(t, "id") === id && !t.inTemplate) || tags.find((t) => attrOf(t, "id") === id) || null;

// ------------------------------------------------------------------ blok timeline JSON
export function timelineBlock(src) {
  const tags = scanHTML(src);
  const t = tags.find((x) => x.name === "script" && (attrOf(x, "id") === "mgp-timeline" || attrOf(x, "id") === "rekam-timeline" || hasAttr(x, "data-mgp-timeline") || hasAttr(x, "data-rekam-timeline")));
  if (!t) return null;
  let spec = null, error = null;
  try { spec = JSON.parse(src.slice(t.innerStart, t.innerEnd)); } catch (e) { error = e.message; }
  return { tag: t, spec, error };
}
/** Serialisasi rapi: satu item per baris, mudah dibaca dan di-diff. */
export function specText(spec) {
  const lines = ["{"];
  const keys = Object.keys(spec);
  keys.forEach((k, ki) => {
    const v = spec[k];
    const comma = ki < keys.length - 1 ? "," : "";
    if (Array.isArray(v) && v.length && typeof v[0] === "object") {
      lines.push("  " + JSON.stringify(k) + ": [");
      v.forEach((it, i) => lines.push("    " + JSON.stringify(it) + (i < v.length - 1 ? "," : "")));
      lines.push("  ]" + comma);
    } else lines.push("  " + JSON.stringify(k) + ": " + JSON.stringify(v) + comma);
  });
  lines.push("}");
  return "\n" + lines.join("\n") + "\n";
}
export function setTimelineSpec(src, spec) {
  const b = timelineBlock(src);
  if (!b) throw new Error(t("Blok mgp-timeline belum ada."));
  return splice(src, b.tag.innerStart, b.tag.innerEnd, specText(spec));
}

// ------------------------------------------------------------------ JS: tween GSAP bebas
// Lexer kecil: melompati string, template, komentar, regex. Mengembalikan posisi
// setiap pemanggilan .to( .from( .fromTo( .set( beserta argumen literalnya.
function skipStr(code, i) {
  const q = code[i]; i++;
  while (i < code.length && code[i] !== q) { if (code[i] === "\\") i++; else if (q === "`" && code[i] === "$" && code[i + 1] === "{") { i = matchBrace(code, i + 1) ; } i++; }
  return i + 1;
}
function matchBrace(code, i) { // i di '{' '(' '['; kembalikan posisi penutup
  const open = code[i], close = { "{": "}", "(": ")", "[": "]" }[open];
  let d = 0;
  for (let k = i; k < code.length; k++) {
    const c = code[k];
    if (c === '"' || c === "'" || c === "`") { k = skipStr(code, k) - 1; continue; }
    if (c === "/" && code[k + 1] === "/") { k = code.indexOf("\n", k); if (k < 0) return code.length; continue; }
    if (c === "/" && code[k + 1] === "*") { k = code.indexOf("*/", k + 2) + 1; if (k <= 0) return code.length; continue; }
    if (c === open) d++; else if (c === close) { d--; if (!d) return k; }
  }
  return code.length;
}
function splitTop(code, a, b) { // pecah [a,b) di koma tingkat atas
  const parts = []; let s = a;
  for (let k = a; k < b; k++) {
    const c = code[k];
    if (c === '"' || c === "'" || c === "`") { k = skipStr(code, k) - 1; continue; }
    if (c === "/" && code[k + 1] === "/") { k = code.indexOf("\n", k); if (k < 0 || k > b) k = b; continue; }
    if (c === "/" && code[k + 1] === "*") { k = code.indexOf("*/", k + 2) + 1; continue; }
    if (c === "{" || c === "(" || c === "[") { k = matchBrace(code, k); continue; }
    if (c === ",") { parts.push([s, k]); s = k + 1; }
  }
  parts.push([s, b]);
  return parts.map(([x, y]) => { while (x < y && /\s/.test(code[x])) x++; while (y > x && /\s/.test(code[y - 1])) y--; return [x, y]; }).filter(([x, y]) => y > x);
}
export function parseValue(code, a, b) {
  const raw = code.slice(a, b);
  const v = { start: a, end: b, raw, kind: "expr" };
  if (/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(raw)) { v.kind = "number"; v.value = +raw; }
  else if (/^(["'])(?:\\.|(?!\1)[^\\])*\1$/.test(raw) || /^`[^`$]*`$/.test(raw)) { v.kind = "string"; v.quote = raw[0]; v.value = raw.slice(1, -1).replace(/\\(.)/g, "$1"); }
  else if (/^(true|false|null)$/.test(raw)) { v.kind = "literal"; v.value = JSON.parse(raw); }
  else if (raw[0] === "{" && matchBrace(code, a) === b - 1) { v.kind = "object"; v.props = parseObject(code, a, b); }
  return v;
}
function parseObject(code, a, b) {
  const props = [];
  for (const [x, y] of splitTop(code, a + 1, b - 1)) {
    const m = /^(?:([A-Za-z_$][\w$]*)|(["'])([^"']*)\2)\s*:\s*/.exec(code.slice(x, y));
    if (!m) { props.push({ key: null, start: x, end: y, value: { kind: "expr", raw: code.slice(x, y), start: x, end: y } }); continue; }
    const key = m[1] || m[3];
    props.push({ key, start: x, end: y, value: parseValue(code, x + m[0].length, y) });
  }
  return props;
}
export function parseTweensJS(code) {
  const out = [];
  const re = /\.\s*(fromTo|from|to|set)\s*\(/g;
  let i = 0;
  // lompati string/komentar saat mencari
  const mask = maskCode(code);
  let m;
  while ((m = re.exec(mask))) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(code, open);
    const method = m[1];
    const args = splitTop(code, open + 1, close).map(([x, y]) => parseValue(code, x, y));
    const nVars = method === "fromTo" ? 2 : 1;
    const varsArgs = args.slice(1, 1 + nVars);
    if (args.length < 1 + nVars || varsArgs.some((v) => v.kind !== "object")) continue;
    // penerima: gsap.timeline(...) dsb. bukan tween
    const before = mask.slice(Math.max(0, m.index - 30), m.index);
    if (/gsap\s*$/.test(before) && method === "set" && false) continue;
    out.push({ index: i++, method, start: m.index, open, close, target: args[0], from: method === "fromTo" ? args[1] : method === "from" ? args[1] : null,
      to: method === "fromTo" ? args[2] : method === "from" ? null : args[1], vars: method === "fromTo" ? args[2] : args[1], position: args[1 + nVars] || null, args });
  }
  return out;
}
function maskCode(code) { // ganti isi string/komentar dengan spasi agar regex tidak salah tangkap
  let out = "";
  for (let k = 0; k < code.length; k++) {
    const c = code[k];
    if (c === '"' || c === "'" || c === "`") { const e = skipStr(code, k); out += c + " ".repeat(Math.max(0, e - k - 2)) + (e - k >= 2 ? code[e - 1] : ""); k = e - 1; continue; }
    if (c === "/" && code[k + 1] === "/") { let e = code.indexOf("\n", k); if (e < 0) e = code.length; out += " ".repeat(e - k); k = e - 1; continue; }
    if (c === "/" && code[k + 1] === "*") { let e = code.indexOf("*/", k + 2); e = e < 0 ? code.length : e + 2; out += " ".repeat(e - k); k = e - 1; continue; }
    out += c;
  }
  return out;
}
export const fmtNum = (x) => String(+(+x).toFixed(4));
export function jsLiteral(value, like) {
  if (typeof value === "number") return fmtNum(value);
  if (typeof value === "boolean" || value === null) return String(value);
  const q = like && like.quote && like.quote !== "`" ? like.quote : '"';
  return q + String(value).replace(/\\/g, "\\\\").replace(new RegExp(q, "g"), "\\" + q) + q;
}
/** Ganti/ tambah properti pada objek vars sebuah tween JS. which: "vars" | "from" | "to" */
export function setTweenProp(code, callIndex, which, key, value) {
  const tw = parseTweensJS(code)[callIndex];
  if (!tw) throw new Error("tween tidak ditemukan");
  const obj = tw[which];
  if (!obj || obj.kind !== "object") throw new Error("objek tidak bisa disunting");
  const p = obj.props.find((x) => x.key === key);
  if (value === undefined) { // hapus properti
    if (!p) return code;
    let a = p.start, b = p.end;
    const after = code.slice(b).match(/^\s*,/);
    if (after) b += after[0].length; else { const bef = code.slice(0, a).match(/,\s*$/); if (bef) a -= bef[0].length; }
    return splice(code, a, b, "");
  }
  if (p) {
    if (p.value.kind === "expr" || p.value.kind === "object") throw new Error("nilai " + key + " berupa ekspresi; hanya bisa dibaca");
    return splice(code, p.value.start, p.value.end, jsLiteral(value, p.value));
  }
  // tambah sebelum '}'
  const closeB = obj.end - 1;
  let k = closeB; while (k > obj.start && /\s/.test(code[k - 1])) k--;
  const empty = !obj.props.length;
  const hasTrail = code[k - 1] === ",";
  const ins = (empty ? " " : hasTrail ? " " : ", ") + (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)) + ": " + jsLiteral(value) + (empty ? " " : "");
  return splice(code, k, k, ins);
}
export function setTweenPosition(code, callIndex, value) {
  const tw = parseTweensJS(code)[callIndex];
  if (!tw) throw new Error("tween tidak ditemukan");
  if (tw.position) {
    if (tw.position.kind !== "number") throw new Error("posisi berupa ekspresi; hanya bisa dibaca");
    return splice(code, tw.position.start, tw.position.end, fmtNum(value));
  }
  let k = tw.close; while (/\s/.test(code[k - 1])) k--;
  return splice(code, k, k, ", " + fmtNum(value));
}
/** Angka literal `window.__duration = 5` / `__fps = 30` di skrip. */
export function findGlobalNumber(code, name) {
  const re = new RegExp("(window\\.)?" + name.replace(/\$/g, "\\$") + "\\s*=\\s*(-?\\d+(?:\\.\\d+)?)\\s*[;\\n]");
  const m = re.exec(maskCode(code));
  if (!m) return null;
  const vs = m.index + m[0].indexOf(m[2], m[0].indexOf("="));
  return { value: +m[2], start: vs, end: vs + m[2].length };
}
export { splice };
