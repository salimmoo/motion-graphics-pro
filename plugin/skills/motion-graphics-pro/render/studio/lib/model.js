// mgp Studio - composition model from the source (layers, clips, structured animation, JS tweens).
import { scanHTML, attrOf, hasAttr, isTextLeaf, getText, timelineBlock, parseTweensJS, findGlobalNumber, insertBeforeBodyEnd, specText, decodeEnt } from "./source.js";

const SKIP = new Set(["html", "head", "meta", "link", "title", "script", "style", "base", "noscript", "br", "template"]);
const num = (v, d = null) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const joinPosix = (a, b) => {
  const parts = (a ? a.split("/") : []).concat(b.split("/"));
  const out = [];
  for (const p of parts) { if (!p || p === ".") continue; if (p === "..") out.pop(); else out.push(p); }
  return out.join("/");
};
const dirOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

export function labelOf(el) {
  if (el.id) return "#" + el.id;
  const cls = el.cls ? "." + el.cls.split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
  return el.name + cls;
}

export function buildModel(files) {
  const m = { files, els: new Map(), list: [], tops: [], clips: [], scripts: [], spec: null, specErr: null, hasFormat: false, root: null,
    markers: [], bpm: null, beatOffset: 0, vars: null, varsErr: null, durasi: null, durasiSumber: null, fps: null, ids: new Set() };
  const entryDir = dirOf(files[0].rel);
  files.forEach((f, fi) => {
    const tags = scanHTML(f.text);
    f.tags = tags;
    for (const t of tags) {
      const id = attrOf(t, "id");
      if (id) m.ids.add(id);
      if (t.name === "script") {
        const type = (attrOf(t, "type") || "").toLowerCase();
        if (!hasAttr(t, "src") && !/json/.test(type) && attrOf(t, "id") !== "mgp-loader" && attrOf(t, "id") !== "rekam-pemuat") {
          const code = f.text.slice(t.innerStart, t.innerEnd);
          m.scripts.push({ fi, i: t.i, code, tweens: parseTweensJS(code) });
        }
        continue;
      }
      if (SKIP.has(t.name)) continue;
      // hanya isi <body> (berkas entri) atau isi <template> (sub-komposisi)
      let p = t.parent >= 0 ? tags[t.parent] : null;
      let ok = false;
      while (p) { if (p.name === "body" || p.name === "template") { ok = true; break; } p = p.parent >= 0 ? tags[p.parent] : null; }
      if (!ok && t.name !== "body") continue;
      if (t.name === "body") continue;
      const el = {
        sid: fi + ":" + t.i, fi, i: t.i, name: t.name, id, cls: attrOf(t, "class") || "", tag: t,
        attrs: Object.fromEntries(t.attrs.map((a) => [a.name, a.value])),
        parentSid: null, kids: [], depth: 0, leaf: isTextLeaf(tags, t), text: null,
      };
      if (el.leaf) el.text = getText(f.text, t.i);
      const pt = t.parent >= 0 ? tags[t.parent] : null;
      if (pt && !SKIP.has(pt.name) && pt.name !== "body") el.parentSid = fi + ":" + pt.i;
      el.label = labelOf(el);
      m.els.set(el.sid, el);
    }
  });
  // pohon
  for (const el of m.els.values()) {
    const p = el.parentSid && m.els.get(el.parentSid);
    if (p) p.kids.push(el.sid);
  }
  // host sub-komposisi: berkas fi>0 digantung di bawah host-nya
  const fileByRel = new Map(files.map((f, fi) => [f.rel, fi]));
  const hostOf = new Map(); // fi -> host sid
  for (const el of m.els.values()) {
    const src = el.attrs["data-composition-src"];
    if (!src) continue;
    const rel = joinPosix(src.startsWith("/") ? "" : entryDir, src.replace(/^\//, ""));
    const fi = fileByRel.get(rel);
    if (fi == null || hostOf.has(fi)) continue;
    hostOf.set(fi, el.sid);
    for (const k of m.els.values()) if (k.fi === fi && !k.parentSid) { k.parentSid = el.sid; el.kids.push(k.sid); k.viaHost = true; }
  }
  m.hostOf = hostOf;
  for (const el of m.els.values()) if (!el.parentSid) m.tops.push(el.sid);
  // urutan DOM + kedalaman
  const walk = (sid, d) => { const el = m.els.get(sid); el.depth = d; m.list.push(el); for (const k of el.kids) walk(k, d + 1); };
  m.tops.forEach((s) => walk(s, 0));

  // root komposisi
  m.root = m.list.find((e) => e.fi === 0 && e.attrs["data-composition-id"] != null) || null;
  // offset waktu: data-start host di atas berkas, tanpa root
  const offsetFi = (fi) => { const h = hostOf.get(fi); if (!h) return 0; const he = m.els.get(h); return absStart(he); };
  function absStart(el) {
    let off = 0, p = el.parentSid ? m.els.get(el.parentSid) : null;
    while (p) { if (p.attrs["data-composition-id"] != null && p !== m.root && p.attrs["data-start"] != null && p.fi === el.fi) off += num(p.attrs["data-start"], 0); p = p.parentSid ? m.els.get(p.parentSid) : null; }
    return off + (el.fi > 0 ? offsetFi(el.fi) : 0) + num(el.attrs["data-start"], 0);
  }
  m.absStart = absStart;
  m.fileOffset = offsetFi;
  for (const el of m.list) {
    if (el.attrs["data-start"] == null || el === m.root) continue;
    const tr = el.attrs["data-track"] ?? el.attrs["data-track-index"];
    m.clips.push({ sid: el.sid, el, start: absStart(el), local: num(el.attrs["data-start"], 0), dur: num(el.attrs["data-duration"], null),
      track: tr != null ? num(tr, 0) : null, trackAttr: el.attrs["data-track"] != null ? "data-track" : "data-track-index",
      media: el.name === "audio" || el.name === "video", src: el.attrs.src || null, mediaStart: num(el.attrs["data-media-start"] ?? el.attrs["data-trim-start"], 0) });
  }
  // lajur otomatis untuk klip tanpa track
  let auto = Math.max(0, ...m.clips.map((c) => (c.track != null ? c.track : 0))) + 1;
  for (const c of m.clips) if (c.track == null) { c.track = auto++; c.autoTrack = true; }

  // blok terstruktur
  const b = timelineBlock(files[0].text);
  if (b) { m.hasFormat = true; m.spec = b.spec; m.specErr = b.error; }
  m.hasLoader = m.hasPemuat = files[0].tags.some((t) => t.name === "script" && (attrOf(t, "id") === "mgp-loader" || attrOf(t, "id") === "rekam-pemuat"));
  const htmlTag = files[0].tags.find((t) => t.name === "html");
  m.htmlI = htmlTag ? htmlTag.i : null;
  if (htmlTag) {
    try { m.markers = JSON.parse(attrOf(htmlTag, "data-markers") || "[]"); } catch { m.markers = []; }
    m.bpm = num(attrOf(htmlTag, "data-bpm"), null);
    m.beatOffset = num(attrOf(htmlTag, "data-beat-offset"), 0);
    const v = attrOf(htmlTag, "data-composition-variables");
    if (v) { try { m.vars = JSON.parse(v); } catch (e) { m.varsErr = e.message; } }
  }
  // durasi & fps
  if (m.root && m.root.attrs["data-duration"] != null) { m.durasi = num(m.root.attrs["data-duration"]); m.durasiSumber = { kind: "attr", sid: m.root.sid }; }
  else {
    for (const s of m.scripts.filter((x) => x.fi === 0)) {
      const g = findGlobalNumber(s.code, "__duration");
      if (g) { m.durasi = g.value; m.durasiSumber = { kind: "js", script: s, g }; break; }
    }
    if (m.durasi == null && m.spec && m.spec.durasi) { m.durasi = m.spec.durasi; m.durasiSumber = { kind: "spec" }; }
  }
  if (m.root && m.root.attrs["data-fps"] != null) m.fps = num(m.root.attrs["data-fps"]);
  return m;
}

/**
 * Make sure the composition has an mgp-timeline block + the loader. Returns the new text.
 * Old compositions keep their rekam-timeline / rekam-pemuat blocks (both are read); new ones get the new ids.
 */
export function ensureFormat(text, loader, spec) {
  const tags = scanHTML(text);
  let out = text;
  const isTl = (t) => t.name === "script" && (attrOf(t, "id") === "mgp-timeline" || attrOf(t, "id") === "rekam-timeline" || hasAttr(t, "data-mgp-timeline") || hasAttr(t, "data-rekam-timeline"));
  if (!tags.some(isTl)) {
    out = insertBeforeBodyEnd(out, '<script type="application/json" id="mgp-timeline">' + specText(spec || { versi: 1, animasi: [], kunci: [] }) + "</script>");
  }
  const t2 = scanHTML(out);
  const pm = t2.find((t) => t.name === "script" && (attrOf(t, "id") === "mgp-loader" || attrOf(t, "id") === "rekam-pemuat"));
  if (!pm) out = insertBeforeBodyEnd(out, '<script id="mgp-loader">\n' + loader.trim() + "\n</script>");
  return out;
}
export { num, decodeEnt };
