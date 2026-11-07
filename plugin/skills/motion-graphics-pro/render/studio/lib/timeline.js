// mgp Studio - timeline: penggaris, marker, ketukan, klip per trek, tween per elemen, keyframe.
import { S, seek, togglePlay, elOf, liveEl, select, edit, opAttr, fmt, esc, specGet, specSet, opScript, setMarkers, beatList, snapFrame, renderAll, isLocked } from "../app.js";
import * as Src from "./source.js";
import { t } from "./i18n.js";
/** The Studio loader (old global name RekamPemuat). */
const LOADER = () => window.MgpLoader || window.RekamPemuat;

const $ = (s) => document.querySelector(s);
const RULER = 26, HEAD = 18, LANE = 26, AROW = 18;
let area, isi, lab, rows = [], drag = null, ph = null;
const waves = new Map(); // src -> { peaks, dur } | "muat" | "gagal"

export function initLini() {
  area = $("#liniArea"); isi = $("#liniIsi"); lab = $("#liniLabel");
  area.addEventListener("scroll", () => { const inner = lab.firstElementChild; if (inner) inner.style.transform = `translateY(${-area.scrollTop}px)`; });
  area.addEventListener("pointerdown", onDown);
  area.addEventListener("pointermove", onMove);
  area.addEventListener("pointerup", onUp);
  area.addEventListener("pointercancel", onUp);
  area.addEventListener("dblclick", onDbl);
  area.addEventListener("contextmenu", (e) => {
    const mk = e.target.closest(".marker");
    if (mk) { e.preventDefault(); const list = JSON.parse(JSON.stringify(S.m.markers)); list.splice(+mk.dataset.i, 1); setMarkers(list, t("Hapus marker")); }
  });
  area.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const z = $("#zoomLini"); z.value = Math.max(20, Math.min(600, +z.value * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); S.pps = +z.value; drawLini();
  }, { passive: false });
  lab.addEventListener("click", (e) => { const r = e.target.closest(".barisLabel[data-sid]"); if (r) select([r.dataset.sid], e.shiftKey); });
  $("#zoomLini").addEventListener("input", (e) => { S.pps = +e.target.value; drawLini(); });
  S.pps = +$("#zoomLini").value;
}

const X = (time) => time * S.pps;
const totalDur = () => Math.max(S.dur || 1, 0.5);
function clipDur(c) {
  if (c.dur != null) return c.dur;
  if (c.media && c.src) { const w = waves.get(c.src); if (w && w.dur) return Math.max(0.05, w.dur - c.mediaStart); }
  return Math.max(0.05, totalDur() - c.start);
}
function animsOf(sid) { return S.anims.filter((a) => a.sids.includes(sid)); }

function buildRows() {
  rows = [];
  let y = 0;
  const clips = S.m.clips;
  if (clips.length) {
    rows.push({ kind: "head", y, h: HEAD, label: t("Klip") }); y += HEAD;
    const tracks = [...new Set(clips.map((c) => c.track))].sort((a, b) => a - b);
    for (const tr of tracks) { rows.push({ kind: "lane", y, h: LANE, track: tr, label: t("Trek") + " " + tr }); y += LANE; }
  }
  const animEls = S.m.list.filter((el) => animsOf(el.sid).length);
  if (animEls.length) {
    rows.push({ kind: "head", y, h: HEAD, label: t("Animasi") }); y += HEAD;
    for (const el of animEls) {
      const list = animsOf(el.sid);
      const bars = list.filter((a) => a.kind !== "kunci").sort((a, b) => a.start - b.start);
      const lanes = [];
      for (const a of bars) {
        let k = lanes.findIndex((end) => end <= a.start + 1e-6);
        if (k < 0) { k = lanes.length; lanes.push(0); }
        lanes[k] = a.start + Math.max(a.dur, 0.05); a._lane = k;
      }
      const keys = list.filter((a) => a.kind === "kunci");
      const h = Math.max(1, lanes.length) * AROW + keys.length * AROW + 4;
      rows.push({ kind: "anim", y, h, sid: el.sid, label: el.label, bars, keys, nl: Math.max(1, lanes.length) });
      y += h;
    }
  }
  return y;
}

export function drawLini(light) {
  if (!isi || !S.m) return;
  if (light && ph) { ph.style.left = X(S.t) + "px"; return; }
  const H = buildRows();
  const W = X(totalDur()) + 80;
  const parts = [];
  // penggaris
  const step = S.pps >= 300 ? 0.1 : S.pps >= 120 ? 0.5 : S.pps >= 50 ? 1 : 2;
  let ticks = "";
  for (let s = 0; s <= totalDur() + 1e-6; s += step) {
    const major = Math.abs(s - Math.round(s)) < 1e-6;
    ticks += `<div class="tik${major ? "" : " kecil"}" style="left:${X(s)}px">${major ? Math.round(s) + "s" : ""}</div>`;
  }
  if (S.pps >= 300) for (let f = 0; f <= totalDur() * S.fps; f++) { if (f % Math.round(S.fps * step)) ticks += `<div class="tik kecil" style="left:${X(f / S.fps)}px;top:22px"></div>`; }
  const mk = (S.m.markers || []).map((m, i) => `<div class="marker" data-i="${i}" style="left:${X(m.t)}px" title="${esc(m.label || "")} · ${fmt(m.t)} s · ${esc(t("seret, klik ganda ganti nama, klik kanan hapus"))}"></div><div class="markerLbl" style="left:${X(m.t) + 8}px">${esc(m.label || "")}</div>`).join("");
  parts.push(`<div class="penggaris" style="width:${W}px;position:sticky">${ticks}${mk}</div>`);
  // isi baris
  let body = "";
  for (const b of beatList()) body += `<div class="ketuk" style="left:${X(b)}px;top:0"></div>`;
  for (const r of rows) {
    body += `<div class="baris" style="top:${r.y}px;height:${r.h}px;width:${W}px"></div>`;
    if (r.kind === "lane") {
      for (const c of S.m.clips.filter((c) => c.track === r.track)) {
        const d = clipDur(c), lock = isLocked(c.el);
        const sel = S.sel.includes(c.sid);
        body += `<div class="blok ${c.media ? "audio" : "klip"}${sel ? " sel" : ""}" data-clip="${c.sid}" style="left:${X(c.start)}px;top:${r.y + 3}px;width:${Math.max(4, X(d))}px" title="${esc(c.el.label)} · ${fmt(c.start)}–${fmt(c.start + d)} s">
          ${c.media ? `<canvas data-wave="${esc(c.src)}" data-ms="${c.mediaStart}" data-d="${d}"></canvas>` : ""}<span>${esc(c.el.label)}</span>${lock ? "" : '<div class="tepi k"></div><div class="tepi n"></div>'}</div>`;
      }
    } else if (r.kind === "anim") {
      for (const a of r.bars) {
        const lbl = animLabel(a);
        const ro = !a.editable;
        const sel = S.selAnim === a.key;
        body += `<div class="blok tw${a.kind === "js" ? " js" : ""}${ro ? " baca" : ""}${sel ? " sel" : ""}" data-anim="${esc(a.key)}" data-sid="${r.sid}" style="left:${X(a.start)}px;top:${r.y + 2 + a._lane * AROW}px;width:${Math.max(6, X(a.dur))}px" title="${esc(lbl)} · ${fmt(a.start)} s + ${fmt(a.dur)} s${ro ? " · " + esc(t("hanya baca")) : ""}"><span>${esc(lbl)}</span>${ro || a.trimmable === false ? "" : '<div class="tepi k"></div><div class="tepi n"></div>'}</div>`;
      }
      r.keys.forEach((a, j) => {
      const ky = r.y + 2 + (r.nl + j) * AROW + AROW / 2;
      body += `<div class="propLbl" style="left:${X(a.track.keys.length ? a.track.keys[0].t : 0) - 6}px;top:${ky - 6}px">${esc(a.track.prop)}</div>`;
      a.track.keys.forEach((k, idx) => {
        const sel = S.selKey && S.selKey.ki === a.ki && S.selKey.idx === idx;
        body += `<div class="wajik ${esc(a.track.prop)}${sel ? " sel" : ""}" data-ki="${a.ki}" data-idx="${idx}" style="left:${X(k.t)}px;top:${ky}px" title="${esc(a.track.prop)} = ${k.v} @ ${fmt(k.t)} s · ${esc(t("seret untuk geser, Del/Alt+klik hapus"))}"></div>`;
      });
      });
    }
  }
  parts.push(`<div id="liniBaris" style="position:absolute;left:0;top:${RULER}px;width:${W}px;height:${H}px">${body}</div>`);
  parts.push(`<div class="playhead" style="left:${X(S.t)}px;height:${RULER + H}px"></div>`);
  isi.style.width = W + "px"; isi.style.height = RULER + H + 8 + "px";
  isi.innerHTML = parts.join("");
  ph = isi.querySelector(".playhead");
  // label
  let lb = `<div style="height:${RULER}px"></div><div style="position:relative;height:${H}px">`;
  for (const r of rows) {
    const sel = r.sid && S.sel.includes(r.sid);
    lb += `<div class="barisLabel${r.kind === "head" ? " kepala" : ""}${sel ? " sel" : ""}" ${r.sid ? `data-sid="${r.sid}"` : ""} style="top:${r.y}px;height:${r.h}px">${esc(r.label)}</div>`;
  }
  lab.innerHTML = `<div style="transform:translateY(${-area.scrollTop}px)">${lb}</div></div>`;
  drawWaves();
}
function animLabel(a) {
  if (a.kind === "json") return a.item.preset ? (LOADER() && LOADER().PRESET[a.item.preset] ? presetName(a.item.preset) : a.item.preset) : t("kustom");
  if (a.kind === "js") return "." + a.call.method + (a.call.vars.props.find((p) => p.key === "ease") ? " " + (a.call.vars.props.find((p) => p.key === "ease").value.value || "") : "");
  return t("tween skrip");
}
export function presetName(id) {
  const p = LOADER() && LOADER().PRESET[id];
  if (!p) return id;
  return document.documentElement.lang === "en" ? p.en : p.label;
}

// ------------------------------------------------------------------ gelombang audio
function drawWaves() {
  for (const c of isi.querySelectorAll("canvas[data-wave]")) {
    const src = c.dataset.wave;
    const w = waves.get(src);
    if (!w) { loadWave(src); continue; }
    if (w === "muat" || w === "gagal") continue;
    const rect = c.getBoundingClientRect();
    c.width = Math.max(1, Math.round(rect.width)); c.height = Math.max(1, Math.round(rect.height));
    const g = c.getContext("2d"); g.fillStyle = "rgba(220,255,235,0.9)";
    const ms = +c.dataset.ms, d = +c.dataset.d, H = c.height;
    for (let x = 0; x < c.width; x++) {
      const t0 = ms + (x / c.width) * d, t1 = ms + ((x + 1) / c.width) * d;
      let m = 0; for (let k = Math.floor(t0 * 100); k <= Math.floor(t1 * 100) && k < w.peaks.length; k++) m = Math.max(m, w.peaks[k] || 0);
      const h = Math.max(1, m * (H - 2)); g.fillRect(x, (H - h) / 2, 1, h);
    }
  }
}
async function loadWave(src) {
  waves.set(src, "muat");
  try {
    const base = new URL(S.proj.entry, location.href);
    const buf = await (await fetch(new URL(src, base))).arrayBuffer();
    const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
    const ab = await ctx.decodeAudioData(buf);
    const ch = ab.getChannelData(0), per = Math.max(1, Math.floor(ab.sampleRate / 100));
    const peaks = new Float32Array(Math.ceil(ch.length / per));
    for (let i = 0; i < peaks.length; i++) { let m = 0; for (let j = i * per; j < Math.min(ch.length, (i + 1) * per); j++) m = Math.max(m, Math.abs(ch[j])); peaks[i] = m; }
    waves.set(src, { peaks, dur: ab.duration });
    drawLini();
  } catch (e) { waves.set(src, "gagal"); }
}

// ------------------------------------------------------------------ jepret waktu
function snapT(time, exclude) {
  if (!S.snap) return snapFrame(time);
  const thr = 7 / S.pps;
  const cand = [0, totalDur(), S.t, ...(S.m.markers || []).map((m) => m.t), ...beatList()];
  for (const c of S.m.clips) if (c.sid !== exclude) cand.push(c.start, c.start + clipDur(c));
  for (const a of S.anims) if (a.key !== exclude && a.kind !== "kunci") cand.push(a.start, a.start + a.dur);
  let best = null;
  for (const c of cand) if (Math.abs(c - time) <= thr && (best == null || Math.abs(c - time) < Math.abs(best - time))) best = c;
  return snapFrame(best != null ? best : time);
}
const timeAt = (e) => { const r = area.getBoundingClientRect(); return Math.max(0, (e.clientX - r.left + area.scrollLeft) / S.pps); };
const yAt = (e) => { const r = area.getBoundingClientRect(); return e.clientY - r.top + area.scrollTop - RULER; };

// ------------------------------------------------------------------ interaksi
function onDown(e) {
  if (e.button !== 0) return;
  const tm = timeAt(e);
  const mk = e.target.closest(".marker");
  const blok = e.target.closest(".blok");
  const wj = e.target.closest(".wajik");
  area.setPointerCapture(e.pointerId);
  if (mk) { drag = { type: "marker", i: +mk.dataset.i, el: mk, t0: S.m.markers[+mk.dataset.i].t, x0: tm, moved: false }; return; }
  if (wj) {
    const ki = +wj.dataset.ki, idx = +wj.dataset.idx;
    if (e.altKey) { import("../app.js").then((A) => A.deleteKey({ ki, idx })); drag = null; return; }
    S.selKey = { ki, idx }; S.selAnim = null;
    const tr = S.m.spec.kunci[ki];
    const sids = S.anims.find((a) => a.kind === "kunci" && a.ki === ki).sids;
    if (sids[0] && !S.sel.includes(sids[0])) S.sel = [sids[0]];
    drag = { type: "key", ki, idx, el: wj, t0: tr.keys[idx].t, x0: tm, moved: false };
    renderAll();
    drag.el = isi.querySelector(`.wajik[data-ki="${ki}"][data-idx="${idx}"]`);
    return;
  }
  if (blok && blok.dataset.clip) {
    const c = S.m.clips.find((x) => x.sid === blok.dataset.clip);
    if (!S.sel.includes(c.sid)) { S.sel = [c.sid]; S.selAnim = null; S.selKey = null; renderAll(); }
    if (isLocked(c.el)) return;
    const mode = e.target.classList.contains("k") ? "l" : e.target.classList.contains("n") ? "r" : "move";
    drag = { type: "clip", mode, c, x0: tm, start0: c.start, local0: c.local, dur0: clipDur(c), ms0: c.mediaStart, track0: c.track, moved: false, le: liveEl(c.sid), el: isi.querySelector(`.blok[data-clip="${c.sid}"]`) };
    return;
  }
  if (blok && blok.dataset.anim) {
    const a = S.anims.find((x) => x.key === blok.dataset.anim);
    S.selAnim = a.key; S.selKey = null;
    if (blok.dataset.sid && !S.sel.includes(blok.dataset.sid)) S.sel = [blok.dataset.sid];
    renderAll();
    if (!a.editable) return;
    const mode = e.target.classList.contains("k") ? "l" : e.target.classList.contains("n") ? "r" : "move";
    drag = { type: "anim", mode, a, x0: tm, start0: a.start, dur0: a.dur, moved: false, el: isi.querySelector(`.blok[data-anim="${CSS.escape(a.key)}"]`) };
    return;
  }
  // penggaris atau area kosong: scrub
  togglePlay(false);
  if (S.selAnim || S.selKey) { S.selAnim = null; S.selKey = null; }
  drag = { type: "scrub" };
  seek(snapT(tm));
}
function onMove(e) {
  if (!drag) return;
  const tm = timeAt(e);
  if (drag.type === "scrub") { seek(S.snap ? snapT(tm) : tm); return; }
  const dt = tm - drag.x0;
  if (!drag.moved && Math.abs(dt * S.pps) < 3) return;
  drag.moved = true;
  if (drag.type === "marker") { drag.nt = snapT(Math.max(0, drag.t0 + dt)); drag.el.style.left = X(drag.nt) + "px"; }
  else if (drag.type === "key") { drag.nt = snapT(Math.max(0, drag.t0 + dt)); if (drag.el) drag.el.style.left = X(drag.nt) + "px"; }
  else if (drag.type === "clip") {
    const c = drag.c;
    if (drag.mode === "move") {
      let ns = snapT(Math.max(0, drag.start0 + dt), c.sid);
      const ne = snapT(drag.start0 + dt + drag.dur0, c.sid);
      if (Math.abs(ne - (drag.start0 + dt + drag.dur0)) < Math.abs(ns - (drag.start0 + dt)) && ne - drag.dur0 >= 0) ns = snapFrame(ne - drag.dur0);
      drag.ns = ns; drag.nd = drag.dur0;
      const lane = rows.find((r) => r.kind === "lane" && yAt(e) >= r.y && yAt(e) < r.y + r.h);
      drag.ntrack = lane ? lane.track : drag.track0;
      if (lane) drag.el.style.top = lane.y + 3 + "px";
    } else if (drag.mode === "l") {
      const ns = Math.min(snapT(drag.start0 + dt, c.sid), drag.start0 + drag.dur0 - 1 / S.fps);
      drag.ns = Math.max(0, ns); drag.nd = drag.dur0 - (drag.ns - drag.start0);
    } else { drag.ns = drag.start0; drag.nd = Math.max(1 / S.fps, snapT(drag.start0 + drag.dur0 + dt, c.sid) - drag.start0); }
    drag.el.style.left = X(drag.ns) + "px"; drag.el.style.width = Math.max(4, X(drag.nd)) + "px";
    if (drag.le) { // pratinjau langsung: runtime membaca atribut setiap seek
      drag.le.setAttribute("data-start", fmt(drag.local0 + (drag.ns - drag.start0), 4));
      if (drag.mode !== "move" || c.dur != null) drag.le.setAttribute("data-duration", fmt(drag.nd, 4));
      seek(S.t);
    }
  } else if (drag.type === "anim") {
    const a = drag.a;
    if (drag.mode === "move") {
      let ns = snapT(Math.max(0, drag.start0 + dt), a.key);
      const ne = snapT(drag.start0 + dt + drag.dur0, a.key);
      if (Math.abs(ne - (drag.start0 + dt + drag.dur0)) < Math.abs(ns - (drag.start0 + dt))) ns = Math.max(0, snapFrame(ne - drag.dur0));
      drag.ns = ns; drag.nd = drag.dur0;
      if (a.live && a.live.tw) { try { a.live.tw.startTime(a.live.localStart + (ns - drag.start0)); seek(S.t); } catch { /* abaikan */ } }
    } else if (drag.mode === "l") {
      drag.ns = Math.max(0, Math.min(snapT(drag.start0 + dt, a.key), drag.start0 + drag.dur0 - 0.01)); drag.nd = drag.dur0 - (drag.ns - drag.start0);
    } else { drag.ns = drag.start0; drag.nd = Math.max(0.01, snapT(drag.start0 + drag.dur0 + dt, a.key) - drag.start0); }
    drag.el.style.left = X(drag.ns) + "px"; drag.el.style.width = Math.max(6, X(drag.nd)) + "px";
  }
}
function repeatFactor(a) {
  if (a.kind === "json") { const p = LOADER().PRESET[a.item.preset] || {}; return (+(a.item.repeat ?? p.repeat ?? 0) || 0) + 1; }
  const r = a.call.vars.props.find((p) => p.key === "repeat"); return (r && r.value.kind === "number" ? r.value.value : 0) + 1;
}
async function onUp() {
  const d = drag; drag = null;
  if (!d || d.type === "scrub" || !d.moved) return;
  if (d.type === "marker") {
    const list = JSON.parse(JSON.stringify(S.m.markers)); list[d.i].t = +fmt(d.nt, 4);
    return setMarkers(list, t("Geser marker"));
  }
  if (d.type === "key") {
    const nt = d.nt;
    let newIdx = d.idx;
    await edit(t("Geser keyframe"), () => {
      const spec = specGet(); const tr = spec.kunci[d.ki];
      const k = tr.keys[d.idx]; k.t = +fmt(nt, 4);
      tr.keys = tr.keys.filter((x, i) => i === d.idx || Math.abs(x.t - k.t) > 1e-6);
      tr.keys.sort((a, b) => a.t - b.t); newIdx = tr.keys.indexOf(k);
      specSet(spec);
    });
    S.selKey = { ki: d.ki, idx: newIdx };
    return;
  }
  if (d.type === "clip") {
    const c = d.c;
    const local = d.local0 + (d.ns - d.start0);
    await edit(t("Ubah klip"), () => {
      opAttr(c.sid, "data-start", fmt(Math.max(0, local), 4));
      if (d.mode !== "move" || c.dur != null) opAttr(c.sid, "data-duration", fmt(d.nd, 4));
      if (d.mode === "l" && c.media) opAttr(c.sid, c.el.attrs["data-trim-start"] != null ? "data-trim-start" : "data-media-start", fmt(Math.max(0, d.ms0 + (d.ns - d.start0)), 4));
      if (d.mode === "move" && d.ntrack != null && d.ntrack !== d.track0) opAttr(c.sid, c.trackAttr, String(d.ntrack));
    }, { live: () => {} });
    return;
  }
  if (d.type === "anim") {
    const a = d.a, dStart = d.ns - d.start0, dDur = d.nd - d.dur0, rf = repeatFactor(a);
    await edit(d.mode === "move" ? t("Geser animasi") : t("Ubah durasi animasi"), () => {
      if (a.kind === "json") {
        const spec = specGet(); const it = spec.animasi.find((x) => x.id === a.item.id);
        const p = LOADER().PRESET[it.preset] || {};
        if (dStart) it.at = +fmt(Math.max(0, (+it.at || 0) + dStart), 4);
        if (dDur) it.durasi = +fmt(Math.max(0.01, (it.durasi ?? p.durasi ?? 0.5) + dDur / rf), 4);
        specSet(spec);
      } else if (a.kind === "js") {
        const s = a.script, call = a.call;
        if (dStart) {
          const pos = call.position ? call.position.value : a.live.localStart;
          opScript(s.fi, s.i, (code) => Src.setTweenPosition(code, call.index, Math.max(0, pos + dStart)));
        }
        if (dDur) {
          const lit = call.vars.props.find((p) => p.key === "duration");
          const cur = lit && lit.value.kind === "number" ? lit.value.value : (a.live.tw.vars.duration ?? 0.5);
          opScript(s.fi, s.i, (code) => Src.setTweenProp(code, call.index, "vars", "duration", Math.max(0.01, +fmt(cur + dDur / rf, 4))));
        }
      }
    });
  }
}
function onDbl(e) {
  const mk = e.target.closest(".marker");
  if (mk) {
    const list = JSON.parse(JSON.stringify(S.m.markers)); const m = list[+mk.dataset.i];
    const nm = prompt(t("Nama marker"), m.label || ""); if (nm == null) return;
    m.label = nm; setMarkers(list, t("Ganti nama marker"));
  }
}
