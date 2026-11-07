// mgp Studio - main app.
import * as Src from "./lib/source.js";
import { buildModel, ensureFormat, num } from "./lib/model.js";
import { t, setLang, getLang, applyI18n } from "./lib/i18n.js";
import { initKanvas, drawOverlay, fitStage } from "./lib/canvas.js";
import { initLini, drawLini } from "./lib/timeline.js";
import { renderInspektur } from "./lib/inspector.js";

const $ = (s) => document.querySelector(s);
export const fmt = (x, d = 3) => String(+(+x).toFixed(d));
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const EASES = ["none", "power1.in", "power1.out", "power1.inOut", "power2.in", "power2.out", "power2.inOut", "power3.in", "power3.out", "power3.inOut",
  "power4.in", "power4.out", "power4.inOut", "sine.in", "sine.out", "sine.inOut", "expo.in", "expo.out", "expo.inOut", "circ.in", "circ.out", "circ.inOut",
  "back.in(1.7)", "back.out(1.7)", "back.inOut(1.7)", "elastic.out(1, 0.3)", "elastic.out(1, 0.5)", "elastic.inOut(1, 0.5)", "bounce.out", "bounce.in", "bounce.inOut", "steps(4)", "steps(1)"];

/** Keadaan aplikasi bersama. */
export const S = {
  proj: null, files: [], m: null, win: null, frame: null, info: null,
  t: 0, fps: 30, fpsAsli: 30, dur: 1, playing: false,
  sel: [], selAnim: null, selKey: null, mode: "geser", snap: true, safe: false, grid: false, beats: true,
  zoom: "fit", scale: 1, ox: 0, oy: 0, pps: 120, res: "asli",
  undo: [], redo: [], live: { tweens: [] }, anims: [], beatTimes: null, galat: [],
};
window.__studio = S; // for automated tests and the console
/** The mgp runtime of a page window (old name window.__rekam). */
export const RT = (w) => w && (w.__mgpRuntime || w.__rekam);

// ------------------------------------------------------------------ util
export function toast(msg, ms = 2200) {
  const el = $("#toast"); el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, ms);
}
export const sidParts = (sid) => sid.split(":").map(Number);
export function liveEl(sid) { return S.win ? S.win.document.querySelector('[data-studio-sid="' + sid + '"]') : null; }
export function elOf(sid) { return S.m && S.m.els.get(sid); }
export const snapFrame = (t) => Math.round(t * S.fps) / S.fps;
export function isLocked(el) { let e = el; while (e) { if (e.attrs["data-studio-lock"] != null) return true; e = e.parentSid ? elOf(e.parentSid) : null; } return false; }
export function isHidden(el) { return el.attrs["data-hidden"] != null; }

// error panel hook (old name __studioGalat kept as an alias)
window.__studioError = window.__studioGalat = (msg) => {
  S.galat.push(msg);
  const g = $("#galat"); g.hidden = false;
  g.textContent = S.galat.slice(-6).join("\n");
};

// ------------------------------------------------------------------ suntingan + riwayat
export function snapshot() { return S.files.map((f) => f.text); }
/**
 * Jalankan suntingan. fn mengubah S.files[*].text memakai operasi sumber.
 * opt.live: fungsi yang memperbarui pratinjau tanpa memuat ulang. opt.merge: kunci penggabungan langkah urung.
 */
export async function edit(label, fn, opt = {}) {
  const before = snapshot();
  const selBefore = [...S.sel];
  let r;
  try { r = fn(); } catch (e) { S.files.forEach((f, i) => { f.text = before[i]; }); toast(t("Gagal") + ": " + e.message, 4000); console.warn(e); return false; }
  if (S.files.every((f, i) => f.text === before[i])) return false;
  const last = S.undo[S.undo.length - 1];
  if (opt.merge && last && last.merge === opt.merge && Date.now() - last.at < 900) last.at = Date.now();
  else S.undo.push({ label, texts: before, sel: selBefore, merge: opt.merge, at: Date.now() });
  if (S.undo.length > 300) S.undo.shift();
  S.redo = [];
  await afterChange(opt, r);
  return true;
}
async function afterChange(opt = {}, r) {
  S.m = buildModel(S.files);
  if (opt.select) S.sel = opt.select(r);
  S.sel = S.sel.filter((s) => S.m.els.has(s));
  updateDirty();
  await pushDraft();
  if (opt.live) { try { opt.live(); } catch (e) { console.warn(e); } collectLive(); await seek(S.t); renderAll(); }
  else { renderPanels(); await reloadPreview(); }
}
export async function undo() {
  const u = S.undo.pop(); if (!u) return;
  S.redo.push({ label: u.label, texts: snapshot(), sel: [...S.sel] });
  S.files.forEach((f, i) => { f.text = u.texts[i]; }); S.sel = u.sel;
  toast(t("Urung") + ": " + u.label);
  await afterChange();
}
export async function redo() {
  const u = S.redo.pop(); if (!u) return;
  S.undo.push({ label: u.label, texts: snapshot(), sel: [...S.sel], at: 0 });
  S.files.forEach((f, i) => { f.text = u.texts[i]; }); S.sel = u.sel;
  toast(t("Ulang") + ": " + u.label);
  await afterChange();
}
function updateDirty() {
  const d = S.files.some((f) => f.text !== f.disk);
  $("#kotor").hidden = !d;
  document.title = (d ? "● " : "") + "Studio · " + (S.proj ? S.proj.name : "");
  $("#bUndo").disabled = !S.undo.length; $("#bRedo").disabled = !S.redo.length;
}
async function pushDraft() {
  const files = {}; for (const f of S.files) files[f.rel] = f.text;
  await fetch("/__studio/api/draft", { method: "PUT", body: JSON.stringify({ files }) });
}
export async function save(force) {
  const files = {}, base = {};
  for (const f of S.files) if (f.text !== f.disk) { files[f.rel] = f.text; base[f.rel] = f.hash; }
  if (!Object.keys(files).length) { toast(t("Tidak ada perubahan")); return true; }
  const r = await fetch("/__studio/api/save", { method: "POST", body: JSON.stringify({ files, base, force }) });
  const j = await r.json();
  if (r.status === 409) {
    if (confirm(t("Berkas berubah di disk sejak dibuka. Timpa?") + "\n" + j.rel)) return save(true);
    return false;
  }
  if (!j.ok) { toast(t("Gagal menyimpan") + ": " + (j.error || j.galat || r.status)); return false; }
  for (const f of S.files) if (j.hash[f.rel]) { f.disk = f.text; f.hash = j.hash[f.rel]; }
  updateDirty();
  toast(t("Tersimpan") + " (.bak " + t("dibuat") + ")");
  return true;
}

// ------------------------------------------------------------------ operasi sumber bertingkat
export function fileText(fi) { return S.files[fi].text; }
export function setFile(fi, tx) { S.files[fi].text = tx; }
export function opAttr(sid, name, val) { const [fi, i] = sidParts(sid); setFile(fi, Src.setAttr(fileText(fi), i, name, val)); }
export function opStyle(sid, prop, val) { const [fi, i] = sidParts(sid); setFile(fi, Src.setStyle(fileText(fi), i, prop, val)); }
export function opText(sid, tx) { const [fi, i] = sidParts(sid); setFile(fi, Src.setText(fileText(fi), i, tx)); }
export function curEl(sid) { // elemen dengan atribut terbaru (setelah suntingan dalam fn yang sama)
  const [fi, i] = sidParts(sid); const tags = Src.scanHTML(fileText(fi)); const tg = tags[i];
  return { attrs: Object.fromEntries(tg.attrs.map((a) => [a.name, a.value])), tag: tg };
}
/** Beri id bila belum ada; kembalikan id. */
export function ensureId(sid) {
  const el = curEl(sid);
  if (el.attrs.id) return el.attrs.id;
  const taken = new Set(); for (const f of S.files) for (const m of f.text.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) taken.add(m[1]);
  const base = "el-" + el.tag.name; let k = 1; while (taken.has(base + "-" + k)) k++;
  opAttr(sid, "id", base + "-" + k);
  return base + "-" + k;
}
export function specGet() {
  const b = Src.timelineBlock(fileText(0));
  if (b && b.spec) return JSON.parse(JSON.stringify(b.spec));
  if (b && b.error) throw new Error(t("Blok mgp-timeline bukan JSON yang sah") + ": " + b.error);
  return { versi: 1, animasi: [], kunci: [] };
}
export function specSet(spec) {
  spec.animasi = spec.animasi || []; spec.kunci = (spec.kunci || []).filter((k) => k.keys && k.keys.length);
  let tx = ensureFormat(fileText(0), S.proj.loader || S.proj.pemuat, spec);
  tx = Src.setTimelineSpec(tx, spec);
  setFile(0, tx);
}
export function ensureFormatOnly() { setFile(0, ensureFormat(fileText(0), S.proj.loader || S.proj.pemuat, null)); }
export function newAnimId(spec) { let k = (spec.animasi || []).length + 1; const ids = new Set((spec.animasi || []).map((a) => a.id)); while (ids.has("a" + k)) k++; return "a" + k; }
export function scriptOf(fi, i) { return S.m.scripts.find((s) => s.fi === fi && s.i === i); }
/** Ubah kode skrip inline (tween JS bebas). */
export function opScript(fi, i, fn) {
  const tags = Src.scanHTML(fileText(fi)); const tg = tags[i];
  const code = fileText(fi).slice(tg.innerStart, tg.innerEnd);
  setFile(fi, Src.setInner(fileText(fi), i, fn(code)));
}

// ------------------------------------------------------------------ transform dasar
export function baseOf(el) {
  if (el.fi === 0) return { x: num(el.attrs["data-x"], 0), y: num(el.attrs["data-y"], 0), rotation: num(el.attrs["data-rotate"], 0), scale: num(el.attrs["data-scale"], 1), kind: "data" };
  const st = Object.fromEntries(Src.parseStyle(el.attrs.style || ""));
  const tr = (st.translate || "0px 0px").split(/\s+/).map((v) => parseFloat(v) || 0);
  return { x: tr[0] || 0, y: tr[1] || 0, rotation: parseFloat(st.rotate) || 0, scale: st.scale ? parseFloat(st.scale) : 1, kind: "css" };
}
function writeBase(sid, b) {
  const el = elOf(sid);
  if (el.fi === 0) {
    ensureFormatOnly();
    opAttr(sid, "data-x", b.x ? fmt(b.x, 2) : null);
    opAttr(sid, "data-y", b.y ? fmt(b.y, 2) : null);
    opAttr(sid, "data-rotate", b.rotation ? fmt(b.rotation, 2) : null);
    opAttr(sid, "data-scale", b.scale !== 1 ? fmt(b.scale, 4) : null);
  } else {
    opStyle(sid, "translate", b.x || b.y ? fmt(b.x, 2) + "px " + fmt(b.y, 2) + "px" : null);
    opStyle(sid, "rotate", b.rotation ? fmt(b.rotation, 2) + "deg" : null);
    opStyle(sid, "scale", b.scale !== 1 ? fmt(b.scale, 4) : null);
  }
}
/** Nilai animasi saat ini (relatif terhadap basis) untuk mode kunci. */
export function liveProp(sid, prop) {
  const le = liveEl(sid); const el = elOf(sid);
  if (!le || !S.win.gsap) return prop === "scale" || prop === "opacity" ? 1 : 0;
  const v = +S.win.gsap.getProperty(le, prop === "scale" ? "scaleX" : prop) || 0;
  const b = baseOf(el);
  if (prop === "x") return v - b.x; if (prop === "y") return v - b.y; if (prop === "rotation") return v - b.rotation;
  if (prop === "scale") return b.scale ? v / b.scale : v;
  return v;
}
export function upsertKey(spec, target, prop, time, v) {
  spec.kunci = spec.kunci || [];
  let tr = spec.kunci.find((k) => k.target === target && k.prop === prop);
  if (!tr) { tr = { target, prop, keys: [] }; spec.kunci.push(tr); }
  const half = 0.5 / S.fps;
  const k = tr.keys.find((x) => Math.abs(x.t - time) < half);
  const val = +fmt(v, prop === "scale" || prop === "opacity" ? 4 : 2);
  if (k) k.v = val; else { tr.keys.push({ t: +fmt(snapFrame(time), 4), v: val }); tr.keys.sort((a, b) => a.t - b.t); }
}
/**
 * Terapkan perubahan transform untuk banyak elemen.
 * ch: [{ sid, dx, dy, drot, k }] (k = faktor skala). Bergantung mode: geser (basis) atau kunci (keyframe di S.t).
 */
export function commitTransform(label, ch, opt = {}) {
  const mode = opt.mode || S.mode;
  const vals = ch.map((c) => ({ ...c, el: elOf(c.sid), cur: mode === "kunci" ? { x: liveProp(c.sid, "x"), y: liveProp(c.sid, "y"), rotation: liveProp(c.sid, "rotation"), scale: liveProp(c.sid, "scale") } : null }));
  return edit(label, () => {
    let spec = null;
    for (const c of vals) {
      if (mode === "kunci" && c.el.fi === 0) {
        spec = spec || specGet();
        const id = ensureId(c.sid);
        const tg = "#" + id;
        if (c.dx || c.dy) { upsertKey(spec, tg, "x", S.t, c.cur.x + (c.dx || 0)); upsertKey(spec, tg, "y", S.t, c.cur.y + (c.dy || 0)); }
        if (c.drot) upsertKey(spec, tg, "rotation", S.t, c.cur.rotation + c.drot);
        if (c.k != null && c.k !== 1) upsertKey(spec, tg, "scale", S.t, c.cur.scale * c.k);
        if (c.set) for (const [p, v] of Object.entries(c.set)) upsertKey(spec, tg, p, S.t, v);
      } else {
        const b = baseOf(c.el);
        b.x += c.dx || 0; b.y += c.dy || 0; b.rotation += c.drot || 0;
        if (c.k != null) b.scale *= c.k;
        if (c.set) Object.assign(b, c.set);
        writeBase(c.sid, b);
      }
    }
    if (spec) specSet(spec);
  }, opt);
}

// ------------------------------------------------------------------ operasi lapisan
export async function deleteSel() {
  const els = S.sel.map(elOf).filter(Boolean).filter((e) => !isLocked(e));
  if (!els.length) return;
  // hapus dari yang paling belakang di sumber agar indeks lain tetap sah
  els.sort((a, b) => b.fi - a.fi || b.i - a.i);
  await edit(t("Hapus lapisan"), () => {
    const ids = els.map((e) => e.id).filter(Boolean);
    for (const e of els) setFile(e.fi, Src.removeEl(fileText(e.fi), e.i));
    if (ids.length && Src.timelineBlock(fileText(0))) {
      const spec = specGet();
      const gone = (tg) => ids.some((id) => tg === "#" + id);
      spec.animasi = spec.animasi.filter((a) => !gone(a.target));
      spec.kunci = (spec.kunci || []).filter((k) => !gone(k.target));
      specSet(spec);
    }
  }, { select: () => [] });
}
export async function duplicateSel() {
  const el = elOf(S.sel[0]); if (!el) return;
  let newId = null;
  await edit(t("Gandakan lapisan"), () => {
    const r = Src.duplicateEl(fileText(el.fi), el.i);
    setFile(el.fi, r.src);
    newId = el.id ? r.ids[el.id] : null;
    if (Src.timelineBlock(fileText(0))) {
      const spec = specGet();
      for (const [o, n] of Object.entries(r.ids)) {
        for (const a of spec.animasi.filter((a) => a.target === "#" + o)) spec.animasi.push({ ...JSON.parse(JSON.stringify(a)), id: newAnimId(spec), target: "#" + n });
        for (const k of (spec.kunci || []).filter((k) => k.target === "#" + o)) spec.kunci.push({ ...JSON.parse(JSON.stringify(k)), target: "#" + n });
      }
      specSet(spec);
    }
  }, { select: () => { if (newId) { const e = [...S.m.els.values()].find((x) => x.id === newId); return e ? [e.sid] : []; } return []; } });
}
export async function zOrder(dir) {
  const el = elOf(S.sel[0]); if (!el) return;
  let id;
  await edit(dir > 0 ? t("Bawa maju") : t("Bawa mundur"), () => {
    id = ensureId(el.sid);
    const e2 = Src.scanHTML(fileText(el.fi)).find((x) => Src.attrOf(x, "id") === id);
    setFile(el.fi, Src.moveSibling(fileText(el.fi), e2.i, dir));
  }, { select: () => { const e = [...S.m.els.values()].find((x) => x.id === id && x.fi === el.fi); return e ? [e.sid] : []; } });
}
export async function toggleHidden(sid) {
  const el = elOf(sid);
  await edit(isHidden(el) ? t("Tampilkan") : t("Sembunyikan"), () => { if (el.fi === 0) ensureFormatOnly(); opAttr(sid, "data-hidden", isHidden(el) ? null : "true"); });
}
export async function toggleLock(sid) {
  const el = elOf(sid);
  await edit(t("Kunci lapisan"), () => opAttr(sid, "data-studio-lock", el.attrs["data-studio-lock"] != null ? null : "true"),
    { live: () => {} });
}
export function select(sids, add) {
  if (add) { const s = new Set(S.sel); for (const x of sids) s.has(x) ? s.delete(x) : s.add(x); S.sel = [...s]; }
  else S.sel = [...sids];
  S.selAnim = null; S.selKey = null;
  renderAll();
}

// ------------------------------------------------------------------ pratinjau
let reloadSeq = 0;
export async function reloadPreview() {
  const seq = ++reloadSeq;
  S.memuat = true;
  const fr = document.createElement("iframe");
  fr.className = "muat";
  fr.src = S.proj.entry + "?v=" + seq + "-" + Date.now();
  $("#iframes").appendChild(fr);
  await new Promise((r) => fr.addEventListener("load", r, { once: true }));
  if (seq !== reloadSeq) { fr.remove(); return; }
  const w = fr.contentWindow;
  try {
    await new Promise((r, j) => { const t0 = Date.now(); const c = () => (RT(w) ? r() : Date.now() - t0 > 8000 ? j(new Error(t("runtime mgp tidak termuat"))) : setTimeout(c, 20)); c(); });
    const info = await RT(w).ready();
    if (seq !== reloadSeq) { fr.remove(); return; }
    S.info = info;
    S.dur = info.duration || S.m.durasi || 5;
    if (!S.fpsSet) { S.fpsAsli = info.fps || 30; S.fps = S.fpsAsli; S.fpsSet = true; fillSelects(); }
    S.t = Math.min(S.t, Math.max(0, S.dur - 1 / S.fps));
    await RT(w).seek(S.t);
  } catch (e) { window.__studioError(String(e && e.message || e)); }
  for (const old of [...$("#iframes").children]) if (old !== fr) old.remove();
  fr.classList.remove("muat");
  S.frame = fr; S.win = w;
  collectLive();
  fitStage();
  renderAll();
  if (seq === reloadSeq) { S.memuat = false; S.muatKe = (S.muatKe || 0) + 1; }
}
let seeking = false, seekWant = null;
export async function seek(time) {
  S.t = Math.max(0, Math.min(snapFrame(time), Math.max(0, S.dur - 1 / S.fps)));
  updateTime();
  if (!S.win || !RT(S.win)) return;
  if (seeking) { seekWant = S.t; return; }
  seeking = true;
  try {
    let done = -1;
    while (done !== S.t) { done = S.t; await RT(S.win).seek(done); }
  } catch (e) { window.__studioError(String(e && e.message || e)); }
  seeking = false;
  if (seekWant != null && seekWant !== S.t) { const w = seekWant; seekWant = null; return seek(w); }
  seekWant = null;
  drawOverlay();
  drawLini(true);
  if (!S.playing) renderInspektur(true);
}
function updateTime() {
  const f = Math.round(S.t * S.fps);
  $("#waktu").textContent = S.t.toFixed(3) + " s · f" + f + " / " + Math.max(0, Math.round(S.dur * S.fps) - 1);
}
// putar
let t0 = 0, f0 = 0, audios = [];
function loop(now) {
  if (!S.playing) return;
  const N = Math.round(S.dur * S.fps);
  let f = f0 + Math.floor(((now - t0) / 1000) * S.fps);
  if (f >= N) { t0 = now; f0 = 0; f = 0; audios.forEach((a) => a.el.pause()); }
  if (!seeking && f !== Math.round(S.t * S.fps)) { seek(f / S.fps); syncAudio(f / S.fps); }
  requestAnimationFrame(loop);
}
function syncAudio(tm) {
  for (const a of audios) {
    const lt = a.ms + (tm - a.start) * a.rate, end = a.dur != null ? a.start + a.dur : Infinity;
    if (tm >= a.start && tm < end && (!a.el.duration || lt < a.el.duration)) {
      a.el.volume = Math.min(1, a.vol); a.el.playbackRate = a.rate;
      if (Math.abs(a.el.currentTime - lt) > 0.15) a.el.currentTime = lt;
      if (a.el.paused) a.el.play().catch(() => {});
    } else if (!a.el.paused) a.el.pause();
  }
}
export function togglePlay(v) {
  S.playing = v ?? !S.playing;
  $("#bPutar").textContent = S.playing ? "❚❚" : "▶";
  $("#bPutar").classList.toggle("on", S.playing);
  if (S.playing) {
    audios = ((S.info && S.info.media) || []).map((m) => ({ el: Object.assign(new Audio(m.src), { preload: "auto" }), start: m.start, ms: m.mediaStart || 0, dur: m.duration, vol: m.volume ?? 1, rate: m.rate || 1 }));
    if (S.t >= S.dur - 1 / S.fps) S.t = 0;
    t0 = performance.now(); f0 = Math.round(S.t * S.fps); requestAnimationFrame(loop);
  } else { audios.forEach((a) => a.el.pause()); audios = []; renderInspektur(); }
}

// ------------------------------------------------------------------ animasi hidup <-> sumber
export function collectLive() {
  const w = S.win; const L = { tweens: [] };
  S.live = L; S.anims = [];
  if (!w || !w.gsap || !S.info) return;
  const roots = [];
  const tls = w.__timelines || {};
  const fiOfComp = (k) => { const e = [...S.m.els.values()].find((x) => x.fi > 0 && x.attrs["data-composition-id"] === k); return e ? e.fi : 0; };
  if (S.info.driver === "__timeline" && w.__timeline) roots.push({ tl: w.__timeline, off: 0, fi: 0 });
  else if ((S.info.driver === "komposisi" || S.info.driver === "hyperframes")) for (const k of Object.keys(tls)) { const fi = fiOfComp(k); roots.push({ tl: tls[k], off: fi ? S.m.fileOffset(fi) : 0, fi }); }
  else if (S.info.driver === "gsap-global") roots.push({ tl: w.gsap.globalTimeline, off: 0, fi: 0 });
  for (const r of roots) {
    if (!r.tl || !r.tl.getChildren) continue;
    for (const c of r.tl.getChildren(true, true, false)) {
      if (typeof c.targets !== "function") continue;
      let st = c.startTime(), p = c.parent;
      while (p && p !== r.tl) { st = p.startTime() + st / (p.timeScale() || 1); p = p.parent; }
      const targets = c.targets().filter((x) => x && x.nodeType === 1);
      const sids = [...new Set(targets.map((x) => x.closest && x.closest("[data-studio-sid]")).filter(Boolean).map((x) => x.getAttribute("data-studio-sid")))];
      L.tweens.push({ tw: c, root: r.tl, start: r.off + st, localStart: c.startTime(), dur: c.totalDuration(), sids, fi: r.fi, data: c.data || null, targets });
    }
  }
  // cocokkan
  const spec = S.m.spec || { animasi: [], kunci: [] };
  for (const a of spec.animasi || []) {
    const lv = L.tweens.filter((x) => x.data && x.data.studioId === a.id);
    const sids = lv.length ? [...new Set(lv.flatMap((x) => x.sids))] : sidsOfSelector(a.target);
    S.anims.push({ key: "j:" + a.id, kind: "json", item: a, live: lv[0] || null, sids, start: lv[0] ? lv[0].start : num(a.at, 0), dur: lv[0] ? lv[0].dur : num(a.durasi, 0.5), editable: true });
  }
  (spec.kunci || []).forEach((k, ki) => {
    const sids = sidsOfSelector(k.target);
    S.anims.push({ key: "k:" + ki, kind: "kunci", track: k, ki, sids, start: k.keys.length ? k.keys[0].t : 0, dur: k.keys.length ? k.keys[k.keys.length - 1].t - k.keys[0].t : 0 });
  });
  const free = L.tweens.filter((x) => !x.data || (x.data.studioId == null && x.data.studioKunci == null));
  const used = new Set();
  for (const s of S.m.scripts) {
    for (const call of s.tweens) {
      let els = null;
      if (call.target.kind === "string") { try { els = [...w.document.querySelectorAll(call.target.value)]; } catch { els = null; } }
      const durLit = call.vars.props.find((p) => p.key === "duration");
      const cands = free.filter((x) => !used.has(x) && x.fi === s.fi && (!els || (els.length === x.targets.length && els.every((e) => x.targets.includes(e)))));
      let best = cands.find((x) => !durLit || durLit.value.kind !== "number" || Math.abs(x.tw.duration() - durLit.value.value) < 1e-6 || call.vars.props.some((p) => p.key === "stagger" || p.key === "repeat"));
      if (!best) best = cands[0];
      if (best) used.add(best);
      const sids = best ? best.sids : els ? [...new Set(els.map((e) => e.closest("[data-studio-sid]")).filter(Boolean).map((e) => e.getAttribute("data-studio-sid")))] : [];
      const posOk = !call.position || call.position.kind === "number";
      const durOk = !durLit || durLit.value.kind === "number";
      S.anims.push({ key: "s:" + s.fi + ":" + s.i + ":" + call.index, kind: "js", script: s, call, live: best || null, sids, start: best ? best.start : 0, dur: best ? best.dur : 0, editable: !!best && posOk, trimmable: !!best && durOk });
    }
  }
  for (const x of free) if (!used.has(x)) S.anims.push({ key: "l:" + L.tweens.indexOf(x), kind: "live", live: x, sids: x.sids, start: x.start, dur: x.dur, editable: false });
}
export function sidsOfSelector(sel) {
  if (!S.win || !sel) return [];
  try { return [...new Set([...S.win.document.querySelectorAll(sel)].map((e) => e.closest("[data-studio-sid]")).filter(Boolean).map((e) => e.getAttribute("data-studio-sid")))]; }
  catch { return []; }
}

// ------------------------------------------------------------------ panel kiri: lapisan + variabel
function renderLayers() {
  const box = $("#lapisan");
  const rows = [];
  for (const el of S.m.list) {
    if (el.name === "audio" && false) continue;
    const sel = S.sel.includes(el.sid);
    const tx = el.text ? el.text.trim().slice(0, 30) : "";
    rows.push(`<div class="lap${sel ? " sel" : ""}${isHidden(el) ? " tersembunyi" : ""}" data-sid="${el.sid}" style="padding-left:${8 + el.depth * 12}px">
      <button class="tg${isHidden(el) ? "" : " on"}" data-act="lihat" title="${esc(t("Tampilkan/sembunyikan"))}">${isHidden(el) ? "○" : "●"}</button>
      <button class="tg${el.attrs["data-studio-lock"] != null ? " on" : ""}" data-act="kunci" title="${esc(t("Kunci/buka"))}">${el.attrs["data-studio-lock"] != null ? "■" : "□"}</button>
      <span class="nm">${esc(el.label)}</span>${tx ? `<span class="tx">${esc(tx)}</span>` : ""}${el.fi > 0 ? `<span class="tx">${esc(S.files[el.fi].rel.split("/").pop())}</span>` : ""}</div>`);
  }
  box.innerHTML = rows.join("") || `<div class="kecilMut" style="padding:10px">${t("Tidak ada lapisan")}</div>`;
}
function renderVars() {
  const box = $("#variabel");
  const vars = S.m.vars;
  if (S.m.varsErr) { box.innerHTML = `<div class="kecilMut">${t("data-composition-variables bukan JSON")}: ${esc(S.m.varsErr)}</div>`; return; }
  const rows = (vars || []).map((v, k) => {
    const val = v.default ?? "";
    let inp;
    if (v.type === "color") inp = `<input type="color" data-var="${k}" value="${esc(toHex(val))}"><input type="text" data-var="${k}" value="${esc(val)}">`;
    else if (v.type === "number") inp = `<input type="number" data-var="${k}" value="${esc(val)}" step="${v.step || "any"}">`;
    else if (v.type === "boolean") inp = `<input type="checkbox" data-var="${k}" ${val ? "checked" : ""}>`;
    else if (v.type === "enum") inp = `<select data-var="${k}">${(v.options || []).map((o) => `<option value="${esc(o.value)}" ${o.value === val ? "selected" : ""}>${esc(o.label || o.value)}</option>`).join("")}</select>`;
    else inp = `<input type="text" data-var="${k}" value="${esc(val)}">`;
    return `<div class="bar"><label title="${esc(v.id)}">${esc(v.label || v.id)}</label><div class="isi">${inp}</div></div>`;
  });
  box.innerHTML = rows.join("") + `<button class="kecil" id="bTambahVar">${t("+ Variabel")}</button>`;
}
export async function setVar(k, value) {
  await edit(t("Ubah variabel"), () => {
    const vars = JSON.parse(JSON.stringify(S.m.vars || []));
    if (k === "baru") vars.push(value); else vars[k].default = value;
    ensureFormatOnly();
    setFile(0, Src.setAttr(fileText(0), S.m.htmlI, "data-composition-variables", JSON.stringify(vars)));
  });
}
export function toHex(c) {
  if (!c) return "#000000";
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + c.slice(1).split("").map((x) => x + x).join("");
  const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c);
  if (m) return "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join("");
  return "#000000";
}

// ------------------------------------------------------------------ penanda & ketukan
export async function setMarkers(list, label) {
  await edit(label || t("Ubah marker"), () => {
    list.sort((a, b) => a.t - b.t);
    setFile(0, Src.setAttr(fileText(0), S.m.htmlI, "data-markers", list.length ? JSON.stringify(list) : null));
  }, { live: () => {} });
}
export function addMarker() {
  const list = JSON.parse(JSON.stringify(S.m.markers || []));
  list.push({ t: +fmt(S.t, 4), label: "M" + (list.length + 1) });
  setMarkers(list, t("Tambah marker"));
}
export function beatList() {
  if (!S.beats) return [];
  if (S.beatTimes && S.beatTimes.length) return S.beatTimes;
  if (!S.m.bpm) return [];
  const step = 60 / S.m.bpm, out = [];
  for (let x = S.m.beatOffset || 0; x <= S.dur + 1e-6; x += step) out.push(x);
  return out;
}
async function loadBeats() {
  S.beatTimes = null;
  const au = S.m.clips.find((c) => c.media && c.src && c.el.name === "audio");
  if (!au) return;
  try { const j = await (await fetch("/__studio/api/beats?src=" + encodeURIComponent(au.src))).json(); S.beatTimes = j.beatTimes || null; } catch { /* tidak ada */ }
}

// ------------------------------------------------------------------ mgp jobs
/** Run an mgp command from Studio: action = check | frame | render | contact (old names cek / kontak accepted). */
export async function runMgp(action) {
  action = { cek: "check", kontak: "contact" }[action] || action;
  if (S.files.some((f) => f.text !== f.disk)) { toast(t("Menyimpan dulu agar mgp memakai versi terbaru")); if (!(await save())) return; }
  const size = resSize();
  const body = { action, t: S.t, fps: S.fps !== S.fpsAsli ? S.fps : null, size, n: 12 };
  const r = await fetch("/__studio/api/run", { method: "POST", body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) { toast(j.error || j.galat || t("Gagal")); return; }
  const titles = { check: t("Cek komposisi"), frame: t("Render frame"), render: t("Render video"), contact: t("Lembar kontak") };
  openModal(titles[action], `<div class="kecilMut">${t("Menjalankan mgp")}…</div><pre id="logTugas"></pre>`);
  let job;
  for (;;) {
    await new Promise((res) => setTimeout(res, 400));
    job = await (await fetch("/__studio/api/job?id=" + j.id)).json();
    const lg = document.getElementById("logTugas"); if (lg) { lg.textContent = job.log || "…"; lg.scrollTop = lg.scrollHeight; }
    if (job.status !== "running" && job.status !== "jalan") break;
  }
  S.lastJob = job;
  const ok = job.status === "done" || job.status === "selesai";
  let html = "";
  if (!ok) html = `<div class="cekBaris GALAT">${t("Gagal")} (${t("kode")} ${job.code ?? job.kode})</div><pre>${esc(job.log)}</pre>`;
  else if (action === "check") {
    const h = job.result || job.hasil || {};
    // mgp check --json: lists of strings per level (English keys; the old Indonesian keys are read too)
    const rows = [];
    const add = (lvl, cls, arr) => { for (const x of Array.isArray(arr) ? arr : []) rows.push([lvl, cls, typeof x === "string" ? x : (x.message || x.pesan || JSON.stringify(x))]); };
    add("ERROR", "GALAT", h.errors || h.galat);
    add("WARN", "PERINGATAN", h.warnings || h.peringatan);
    add("OK", "OK", h.passed || h.passes || h.lolos);
    html = `<div class="cekBaris ${h.ok ? "OK" : "GALAT"}">${h.ok ? t("Lulus") : t("Ada galat")}</div>`;
    html += rows.map(([lvl, cls, msg]) => `<div class="cekBaris ${cls}">${lvl} ${esc(msg)}</div>`).join("");
    html += `<pre>${esc(JSON.stringify(h, null, 2))}</pre>`;
  } else {
    const url = "/__studio/output/" + encodeURIComponent(job.out) + "?v=" + Date.now();
    html = action === "render" ? `<video src="${url}" controls autoplay muted loop></video>` : `<img src="${url}" alt="">`;
    html += `<div class="kecilMut">${esc(S.proj.outDir || S.proj.keluaran)}\\${esc(job.out)} · <a href="${url}" target="_blank" style="color:var(--aksen2)">${t("Buka di tab baru")}</a></div><pre>${esc(job.log.slice(-1500))}</pre>`;
  }
  openModal(titles[action], html);
  return job;
}
/** Old name. */
export const runRekam = runMgp;
export function openModal(title, html) { $("#modalJudul").textContent = title; $("#modalIsi").innerHTML = html; $("#modal").hidden = false; }
function resSize() {
  if (S.res === "asli" || !S.info) return null;
  const W = S.info.width, H = S.info.height, short = +S.res, k = short / Math.min(W, H);
  const ev = (x) => Math.round((x * k) / 2) * 2;
  return ev(W) + "x" + ev(H);
}
function fillSelects() {
  const fpsSel = $("#selFps");
  const opts = [...new Set([S.fpsAsli, 24, 25, 30, 60])];
  fpsSel.innerHTML = opts.map((f) => `<option value="${f}" ${f === S.fps ? "selected" : ""}>${f}${f === S.fpsAsli ? " (" + t("asli") + ")" : ""}</option>`).join("");
  const W = S.info ? S.info.width : 0, H = S.info ? S.info.height : 0;
  const res = [["asli", t("Asli") + (W ? " " + W + "×" + H : "")], ["1080", "1080p"], ["720", "720p"], ["540", "540p"], ["360", "360p"]];
  $("#selRes").innerHTML = res.map(([v, l]) => `<option value="${v}" ${v === S.res ? "selected" : ""}>${l}</option>`).join("");
}

// ------------------------------------------------------------------ gambar ulang
export function renderPanels() { renderLayers(); renderVars(); renderInspektur(); $("#inBpm").value = S.m.bpm || ""; updateDirty(); }
export function renderAll() { renderPanels(); drawOverlay(); drawLini(); updateTime(); }

// ------------------------------------------------------------------ mulai
async function main() {
  const proj = await (await fetch("/__studio/api/project")).json();
  // language: the viewer's last choice, else the language of mgp (MGP_LANG / LANG), else English
  let saved = null;
  try { saved = localStorage.getItem("studio-lang") || localStorage.getItem("studio-bahasa"); } catch { /* ignore */ }
  setLang(saved || proj.lang || "en");
  applyI18n(); $("#bBahasa").textContent = getLang() === "id" ? "EN" : "ID";
  S.proj = proj;
  S.files = proj.files.map((f) => ({ rel: f.rel, url: f.url, text: f.text, disk: f.disk, hash: f.hash }));
  S.m = buildModel(S.files);
  $("#namaBerkas").textContent = proj.name; $("#namaBerkas").title = proj.files[0].abs;
  initKanvas(); initLini(); bindUI();
  await loadBeats();
  renderPanels();
  await reloadPreview();
}

function bindUI() {
  $("#bUndo").onclick = undo; $("#bRedo").onclick = redo; $("#bSimpan").onclick = () => save();
  $("#bPutar").onclick = () => togglePlay();
  $("#bMundur").onclick = () => { togglePlay(false); seek(S.t - 1 / S.fps); };
  $("#bMaju").onclick = () => { togglePlay(false); seek(S.t + 1 / S.fps); };
  $("#mGeser").onclick = () => { S.mode = "geser"; $("#mGeser").classList.add("on"); $("#mKunci").classList.remove("on"); renderInspektur(); };
  $("#mKunci").onclick = () => { S.mode = "kunci"; $("#mKunci").classList.add("on"); $("#mGeser").classList.remove("on"); renderInspektur(); };
  $("#bAman").onclick = (e) => { S.safe = !S.safe; e.currentTarget.classList.toggle("on", S.safe); drawOverlay(); };
  $("#bGrid").onclick = (e) => { S.grid = !S.grid; e.currentTarget.classList.toggle("on", S.grid); drawOverlay(); };
  $("#bSnap").onclick = (e) => { S.snap = !S.snap; e.currentTarget.classList.toggle("on", S.snap); };
  $("#bKetuk").classList.toggle("on", S.beats);
  $("#bKetuk").onclick = (e) => { S.beats = !S.beats; e.currentTarget.classList.toggle("on", S.beats); drawLini(); };
  $("#bZoomIn").onclick = () => { S.zoom = Math.min(4, (S.zoom === "fit" ? S.scale : S.zoom) * 1.25); fitStage(); };
  $("#bZoomOut").onclick = () => { S.zoom = Math.max(0.05, (S.zoom === "fit" ? S.scale : S.zoom) / 1.25); fitStage(); };
  $("#bPas").onclick = () => { S.zoom = "fit"; fitStage(); };
  $("#bMarker").onclick = addMarker;
  $("#inBpm").onchange = (e) => edit(t("Ubah BPM"), () => setFile(0, Src.setAttr(fileText(0), S.m.htmlI, "data-bpm", +e.target.value > 0 ? String(+e.target.value) : null)), { live: () => {} });
  $("#selFps").onchange = (e) => { S.fps = +e.target.value; seek(S.t); drawLini(); };
  $("#selRes").onchange = (e) => { S.res = e.target.value; };
  $("#bCek").onclick = () => runMgp("check"); $("#bFrame").onclick = () => runMgp("frame");
  $("#bRender").onclick = () => runMgp("render"); $("#bKontak").onclick = () => runMgp("contact");
  $("#modalTutup").onclick = () => { $("#modal").hidden = true; $("#modalIsi").innerHTML = ""; };
  $("#bBahasa").onclick = () => {
    setLang(getLang() === "id" ? "en" : "id");
    try { localStorage.setItem("studio-lang", getLang()); } catch { /* ignore */ }
    $("#bBahasa").textContent = getLang() === "id" ? "EN" : "ID";
    applyI18n(); fillSelects(); renderAll();
  };
  $("#bHapus").onclick = deleteSel; $("#bGanda").onclick = duplicateSel;
  $("#bNaik").onclick = () => zOrder(1); $("#bTurun").onclick = () => zOrder(-1);
  $("#lapisan").addEventListener("click", (e) => {
    const row = e.target.closest(".lap"); if (!row) return;
    const sid = row.dataset.sid, act = e.target.dataset.act;
    if (act === "lihat") return toggleHidden(sid);
    if (act === "kunci") return toggleLock(sid);
    select([sid], e.shiftKey || e.ctrlKey || e.metaKey);
  });
  $("#variabel").addEventListener("change", (e) => {
    const k = e.target.dataset.var; if (k == null) return;
    const v = S.m.vars[k];
    let val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (v.type === "number") val = +val;
    setVar(+k, val);
  });
  $("#variabel").addEventListener("click", (e) => {
    if (e.target.id !== "bTambahVar") return;
    const id = prompt(t("Id variabel (huruf, angka, tanda hubung)"), "warna-aksen"); if (!id) return;
    const type = prompt(t("Jenis: string, number, color, boolean"), "string") || "string";
    setVar("baru", { id, type, label: id, default: type === "color" ? "#ffb547" : type === "number" ? 0 : type === "boolean" ? false : "" });
  });
  addEventListener("keydown", onKey);
  addEventListener("resize", () => { fitStage(); drawLini(); });
  addEventListener("beforeunload", (e) => { if (S.files.some((f) => f.text !== f.disk)) { e.preventDefault(); e.returnValue = ""; } });
}
function onKey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); return; }
  if (typing) return;
  if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
  if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSel(); return; }
  if (e.code === "Space") { e.preventDefault(); togglePlay(); return; }
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    if (S.selKey) return deleteKey(S.selKey);
    if (S.selAnim && !S.sel.length) return;
    return deleteSel();
  }
  if (e.key === "Escape") { select([]); return; }
  if (e.key === "m" || e.key === "M") { addMarker(); return; }
  if (e.key === "," || e.key === ".") { togglePlay(false); seek(S.t + (e.key === "," ? -1 : 1) / S.fps * (e.shiftKey ? S.fps : 1)); return; }
  if (e.key === "Home") { seek(0); return; } if (e.key === "End") { seek(S.dur); return; }
  if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    const sids = S.sel.filter((s) => !isLocked(elOf(s)));
    if (sids.length) commitTransform(t("Geser"), sids.map((sid) => ({ sid, dx: d[0], dy: d[1] })), { merge: "nudge:" + sids.join(",") });
    else if (d[0]) { togglePlay(false); seek(S.t + (d[0] > 0 ? 1 : -1) * (e.shiftKey ? 1 : 1 / S.fps)); }
  }
}
export async function deleteKey(k) { // k = { ki, idx }
  await edit(t("Hapus keyframe"), () => {
    const spec = specGet(); const tr = spec.kunci[k.ki]; if (!tr) return;
    tr.keys.splice(k.idx, 1);
    specSet(spec);
  });
  S.selKey = null;
}

main().catch((e) => window.__studioError("Studio: " + (e && e.stack || e)));
