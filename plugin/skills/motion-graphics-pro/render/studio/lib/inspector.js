// mgp Studio - properties panel: teks, klip, transform (sadar waktu), gaya, variabel, animasi, keyframe.
import { S, esc, fmt, EASES, elOf, liveEl, edit, opAttr, opStyle, opText, fileText, setFile, ensureId, specGet, specSet, newAnimId, opScript, commitTransform, baseOf, liveProp,
  toggleHidden, toggleLock, duplicateSel, deleteSel, zOrder, setVar, toHex, isHidden, isLocked, seek, toast, setMarkers, deleteKey, ensureFormatOnly } from "../app.js";
import * as Src from "./source.js";
import { t } from "./i18n.js";
/** The Studio loader (old global name RekamPemuat). */
const LOADER = () => window.MgpLoader || window.RekamPemuat;
import { presetName } from "./timeline.js";

const $ = (s) => document.querySelector(s);
let box = null, bound = false;
const FONTS = ["system-ui", "Geist", "Fraunces", "Inter", "Poppins", "Montserrat", "Segoe UI", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Consolas", "Impact"];

const row = (label, inner, title) => `<div class="bar"><label title="${esc(title || label)}">${esc(label)}</label><div class="isi">${inner}</div></div>`;
const num = (f, v, extra = "") => `<input type="number" data-f="${f}" value="${v == null || v === "" ? "" : esc(v)}" step="any" ${extra}>`;
const txt = (f, v, ph = "", extra = "") => `<input type="text" data-f="${f}" value="${esc(v ?? "")}" placeholder="${esc(ph)}" ${extra}>`;
function easeSel(attrs, val) {
  return `<input type="text" list="dlEase" ${attrs} value="${esc(val ?? "")}" placeholder="power2.out">`;
}
const sec = (title, inner, right = "") => `<div class="sek"><h4><span>${esc(title)}</span>${right}</h4>${inner}</div>`;

export function renderInspektur(light) {
  box = box || $("#inspektur");
  if (!S.m) return;
  if (!bound) bind();
  if (light) {
    if (box.contains(document.activeElement)) return;
    if (!S.sel.length && !S.selAnim) return;
  }
  const scroll = box.scrollTop;
  let html = `<datalist id="dlEase">${EASES.map((e) => `<option value="${esc(e)}">`).join("")}</datalist><datalist id="dlFont">${fontList().map((f) => `<option value="${esc(f)}">`).join("")}</datalist>`;
  if (!S.sel.length) html += compPanel();
  else if (S.sel.length > 1) html += sec(t("Pilihan"), `<div class="kecilMut">${S.sel.length} ${t("lapisan dipilih. Seret di kanvas untuk memindahkan bersama; panah untuk menggeser 1 px (Shift 10 px).")}</div>
    <div class="grup" style="margin-top:6px"><button data-act="hapus">${t("Hapus")}</button></div>`);
  else html += elPanel(elOf(S.sel[0]));
  box.innerHTML = html;
  box.scrollTop = scroll;
  for (const c of box.querySelectorAll("canvas.kurva")) drawCurve(c, c.dataset.ease);
  if (S.selAnim) { const card = box.querySelector(`.kartuAnim[data-key="${CSS.escape(S.selAnim)}"]`); if (card && !light) card.scrollIntoView({ block: "nearest" }); }
}
function fontList() {
  const s = new Set(FONTS);
  try { if (S.win) for (const f of S.win.document.fonts) s.add(f.family.replace(/^["']|["']$/g, "")); } catch { /* abaikan */ }
  return [...s];
}

// ------------------------------------------------------------------ komposisi (tanpa pilihan)
function compPanel() {
  const m = S.m, inf = S.info || {};
  let h = "";
  const durSrc = m.durasiSumber;
  const durRO = !durSrc;
  h += sec(t("Komposisi"),
    row(t("Ukuran"), `<span class="baca">${inf.width || "?"} × ${inf.height || "?"}</span>`) +
    row("fps", `<span class="baca">${inf.fps || 30}</span>`) +
    row(t("Durasi (s)"), num("compDur", m.durasi ?? inf.duration, durRO ? "readonly" : ""), durSrc ? durSrc.kind : t("tidak ditemukan sebagai literal")) +
    row(t("Penggerak"), `<span class="baca">${esc(inf.driver || "?")}</span>`) +
    row(t("Format"), m.hasFormat ? `<span class="baca">mgp-timeline ✓ (${(m.spec && m.spec.animasi || []).length} ${t("animasi")}, ${(m.spec && m.spec.kunci || []).length} ${t("jalur kunci")})</span>` :
      `<button data-act="pasangFormat">${t("Pasang format Studio")}</button>`));
  if (m.specErr) h += sec(t("Galat"), `<div class="cekBaris GALAT">${esc(m.specErr)}</div>`);
  const mk = (m.markers || []).map((x, i) => `<div class="bar"><label><button class="kecil" data-act="lompatMarker" data-i="${i}">${fmt(x.t, 2)} s</button></label><div class="isi">
    <input type="text" data-mk="${i}" value="${esc(x.label || "")}"><button class="kecil" data-act="hapusMarker" data-i="${i}">✕</button></div></div>`).join("");
  h += sec(t("Marker"), (mk || `<div class="kecilMut">${t("Belum ada marker. Tekan M atau + Marker.")}</div>`));
  const ro = S.anims.filter((a) => a.kind === "live" || (a.kind === "js" && !a.editable)).length;
  h += sec(t("Bantuan"), `<div class="kecilMut">${t("Klik lapisan di kanvas atau panel Lapisan. Seret untuk memindahkan, sudut untuk skala, bulatan atas untuk memutar. Del hapus, Ctrl+D gandakan, Ctrl+Z urung, Ctrl+S simpan, Spasi putar, M marker.")}</div>
    ${ro ? `<div class="kecilMut" style="margin-top:6px">${ro} ${t("tween dari skrip bebas hanya bisa dibaca (posisi/nilai berupa ekspresi atau tidak terlacak).")}</div>` : ""}`);
  return h;
}

// ------------------------------------------------------------------ elemen
function elPanel(el) {
  if (!el) return "";
  const le = liveEl(el.sid), cs = le && S.win ? S.win.getComputedStyle(le) : null;
  const st = Object.fromEntries(Src.parseStyle(el.attrs.style || ""));
  const locked = isLocked(el);
  let h = "";
  const acts = `<span class="aksiKecil">
    <button data-act="lihat" title="${esc(t("Tampilkan/sembunyikan"))}">${isHidden(el) ? t("Tampilkan") : t("Sembunyikan")}</button>
    <button data-act="kunciLap" class="${el.attrs["data-studio-lock"] != null ? "on" : ""}">${t("Kunci")}</button>
    <button data-act="ganda" title="Ctrl+D">⧉</button><button data-act="naik" title="${esc(t("Bawa maju"))}">▲</button><button data-act="turun" title="${esc(t("Bawa mundur"))}">▼</button>
    <button data-act="hapus" title="Del">✕</button></span>`;
  h += `<div class="sek"><h4><span style="text-transform:none;font-family:var(--fm);color:var(--tx)">${esc(el.label)}</span></h4>${acts}
    <div class="kecilMut" style="margin-top:5px">&lt;${el.name}&gt; · ${esc(S.files[el.fi].rel)}${locked ? " · " + t("terkunci") : ""}</div>
    ${el.fi > 0 ? `<div class="kecilMut">${t("Elemen sub-komposisi: transform ditulis sebagai CSS translate/rotate/scale; animasi terstruktur dan keyframe hanya untuk berkas utama.")}</div>` : ""}
    ${row("id", txt("id", el.id || "", t("(tanpa id)")))}</div>`;
  // teks
  const vt = el.attrs["data-var-text"];
  if (vt && S.m.vars) {
    const v = S.m.vars.find((x) => x.id === vt);
    h += sec(t("Teks"), `<div class="kecilMut">${t("Terikat ke variabel")} <b>${esc(vt)}</b></div>` + row(t("Nilai"), `<textarea data-f="varText" data-var="${esc(vt)}" rows="2">${esc(v ? v.default : "")}</textarea>`));
  } else if (el.leaf) h += sec(t("Teks"), `<textarea data-f="text" rows="2" style="width:100%">${esc(el.text)}</textarea>`);
  // klip
  if (el.attrs["data-start"] != null) {
    const tr = el.attrs["data-track"] ?? el.attrs["data-track-index"];
    h += sec(t("Klip"), `<div class="dua">${row(t("Mulai"), num("clipStart", el.attrs["data-start"]))}${row(t("Durasi"), num("clipDur", el.attrs["data-duration"] ?? "", 'placeholder="∞"'))}</div>` +
      row(t("Trek"), num("clipTrack", tr ?? "", 'step="1"')) + (el.name === "audio" || el.name === "video" ? row(t("Volume"), num("clipVol", el.attrs["data-volume"] ?? 1)) + row(t("Mulai media"), num("clipMs", el.attrs["data-media-start"] ?? el.attrs["data-trim-start"] ?? 0)) : ""));
  } else if (el !== S.m.root && el.name !== "audio") h += sec(t("Klip"), `<button data-act="jadikanKlip">${t("Jadikan klip mulai di playhead")}</button>`);
  // transform
  const kunci = S.mode === "kunci" && el.fi === 0;
  const b = baseOf(el);
  const vals = kunci ? { x: liveProp(el.sid, "x"), y: liveProp(el.sid, "y"), rotation: liveProp(el.sid, "rotation"), scale: liveProp(el.sid, "scale"), opacity: liveProp(el.sid, "opacity") }
    : { x: b.x, y: b.y, rotation: b.rotation, scale: b.scale, opacity: st.opacity ?? "" };
  h += sec(t("Transform") + " · " + (kunci ? t("kunci di") + " " + fmt(S.t, 2) + " s" : t("dasar (geser seluruh animasi)")),
    `<div class="dua">${row("X", num("tx", fmt(vals.x, 2)))}${row("Y", num("ty", fmt(vals.y, 2)))}${row("R°", num("trot", fmt(vals.rotation, 2)))}${row("S", num("tscale", fmt(vals.scale, 4), 'step="0.05"'))}</div>` +
    row(t("Opasitas"), num("topac", vals.opacity === "" ? "" : fmt(vals.opacity, 3), `step="0.05" min="0" max="1" placeholder="${cs ? fmt(cs.opacity, 2) : ""}"`)) +
    `<div class="kecilMut">${kunci ? t("Mengubah nilai membuat/mengubah keyframe pada waktu playhead.") : t("Nilai dasar ditambahkan ke animasi; seluruh animasi ikut bergeser.")}</div>`);
  // tata letak
  h += sec(t("Tata letak (style inline)"), `<div class="dua">${row("L", txt("s:left", st.left, cs ? cs.left : ""))}${row("T", txt("s:top", st.top, cs ? cs.top : ""))}${row("W", txt("s:width", st.width, cs ? cs.width : ""))}${row("H", txt("s:height", st.height, cs ? cs.height : ""))}</div>` +
    row("z-index", txt("s:z-index", st["z-index"], cs ? cs.zIndex : "")));
  // tampilan
  const col = st.color || (cs ? cs.color : ""), bg = st.background || st["background-color"] || (cs ? cs.backgroundColor : "");
  h += sec(t("Tampilan"),
    row(t("Warna teks"), `<input type="color" data-f="colorPick" value="${esc(toHex(col))}">${txt("s:color", st.color, cs ? cs.color : "")}`) +
    row(t("Latar"), `<input type="color" data-f="bgPick" value="${esc(toHex(bg))}">${txt("s:background", st.background ?? st["background-color"], cs ? cs.backgroundColor : "")}`) +
    row(t("Font"), `<input type="text" list="dlFont" data-f="s:font-family" value="${esc(st["font-family"] ?? "")}" placeholder="${esc(cs ? cs.fontFamily : "")}">`) +
    `<div class="dua">${row(t("Ukuran"), txt("s:font-size", st["font-size"], cs ? cs.fontSize : ""))}${row(t("Tebal"), `<select data-f="s:font-weight"><option value="">${esc(cs ? cs.fontWeight : "")}</option>${[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => `<option ${String(st["font-weight"]) === String(w) ? "selected" : ""}>${w}</option>`).join("")}</select>`)}</div>` +
    row(t("Spasi huruf"), txt("s:letter-spacing", st["letter-spacing"], cs ? cs.letterSpacing : "")) +
    row(t("Radius"), txt("s:border-radius", st["border-radius"], cs ? cs.borderRadius : "")));
  // data-var-*
  const dv = Object.entries(el.attrs).filter(([k]) => k.startsWith("data-var-"));
  h += sec(t("Variabel data-var-*"), dv.map(([k, v]) => row(k.slice(9), `<input type="text" data-attr="${esc(k)}" value="${esc(v)}"><button class="kecil" data-act="hapusAttr" data-k="${esc(k)}">✕</button>`, k)).join("") +
    `<button class="kecil" data-act="tambahVarAttr">${t("+ data-var")}</button>`);
  // animasi
  h += animPanel(el);
  return h;
}

function presetOptions(sel) {
  const P = (LOADER() && LOADER().PRESET) || {};
  const groups = { masuk: t("Masuk"), keluar: t("Keluar"), tekanan: t("Tekanan") };
  let o = `<option value="">${t("kustom (from/to)")}</option>`;
  for (const [g, gl] of Object.entries(groups)) {
    o += `<optgroup label="${esc(gl)}">` + Object.entries(P).filter(([, p]) => p.peran === g).map(([id]) => `<option value="${id}" ${id === sel ? "selected" : ""}>${esc(presetName(id))}</option>`).join("") + "</optgroup>";
  }
  return o;
}
function animPanel(el) {
  const anims = S.anims.filter((a) => a.sids.includes(el.sid) && a.kind !== "kunci");
  // item JSON yang targetnya tidak ditemukan di pratinjau tetap ditampilkan
  if (el.id && S.m.spec) for (const it of S.m.spec.animasi || []) if (it.target === "#" + el.id && !anims.some((a) => a.kind === "json" && a.item.id === it.id)) anims.push({ key: "j:" + it.id, kind: "json", item: it, sids: [el.sid] });
  let h = "";
  for (const a of anims) h += animCard(a);
  const add = el.fi === 0 ? `<div class="bar"><label>${t("Tambah")}</label><div class="isi"><select data-act="tambahAnim"><option value="">${t("pilih preset…")}</option>${presetOptions("").replace(`<option value="">${t("kustom (from/to)")}</option>`, `<option value="__kustom">${t("kustom (from/to)")}</option>`)}</select></div></div>` :
    `<div class="kecilMut">${t("Animasi terstruktur hanya untuk elemen di berkas utama.")}</div>`;
  h = sec(t("Animasi"), (h || `<div class="kecilMut">${t("Belum ada animasi pada lapisan ini.")}</div>`) + add);
  // keyframe
  if (el.id && S.m.spec && (S.m.spec.kunci || []).some((k) => k.target === "#" + el.id)) {
    let kh = "";
    (S.m.spec.kunci || []).forEach((k, ki) => {
      if (k.target !== "#" + el.id) return;
      kh += `<div class="kartuAnim"><div class="kepala"><b>${esc(k.prop)}</b><button class="kecil" data-act="hapusJalur" data-ki="${ki}">${t("Hapus jalur")}</button></div>` +
        k.keys.map((x, idx) => `<div class="grup" style="margin:3px 0"><button class="kecil${S.selKey && S.selKey.ki === ki && S.selKey.idx === idx ? " on" : ""}" data-act="lompatKunci" data-ki="${ki}" data-idx="${idx}">◆</button>
        <input type="number" step="any" style="width:62px" data-a="kunci" data-ki="${ki}" data-idx="${idx}" data-k="t" value="${x.t}" title="${esc(t("waktu (s)"))}">
        <input type="number" step="any" style="width:62px" data-a="kunci" data-ki="${ki}" data-idx="${idx}" data-k="v" value="${x.v}" title="${esc(t("nilai"))}">
        ${idx ? easeSel(`style="width:90px" data-a="kunci" data-ki="${ki}" data-idx="${idx}" data-k="ease"`, x.ease || "") : '<span style="width:90px"></span>'}
        <button class="kecil" data-act="hapusKunci" data-ki="${ki}" data-idx="${idx}">✕</button></div>`).join("") + "</div>";
    });
    h += sec(t("Keyframe"), kh);
  }
  return h;
}
function animCard(a) {
  const sel = S.selAnim === a.key ? ' style="border-color:var(--aksen2)"' : "";
  if (a.kind === "json") {
    const it = a.item, P = LOADER().PRESET, p = it.preset ? P[it.preset] : null;
    const peran = p ? p.peran : "kustom";
    const at = `data-a="json" data-id="${esc(it.id)}"`;
    const usesJarak = it.preset && /geser|pantul|naik|melayang/.test(it.preset);
    const ease = it.ease || (p ? p.ease : "power2.out");
    return `<div class="kartuAnim" data-key="${esc(a.key)}"${sel}><div class="kepala"><b>${esc(p ? presetName(it.preset) : t("kustom"))}</b><span class="peran ${peran}">${esc(t(peran))}</span></div>
      ${row(t("Preset"), `<select ${at} data-k="preset">${presetOptions(it.preset || "")}</select>`)}
      <div class="dua">${row("@", `<input type="number" step="any" ${at} data-k="at" value="${esc(it.at ?? 0)}" title="${esc(t("mulai (s)"))}">`)}${row("⟷", `<input type="number" step="any" min="0" ${at} data-k="durasi" value="${esc(it.durasi ?? (p ? p.durasi : 0.5))}" title="${esc(t("durasi (s)"))}">`)}</div>
      ${row("Ease", easeSel(`${at} data-k="ease"`, ease))}
      <canvas class="kurva" data-ease="${esc(ease)}"></canvas>
      <div class="dua">${row(t("Stagger"), `<input type="number" step="0.01" min="0" ${at} data-k="stagger" value="${esc(it.stagger ?? (p && p.stagger) ?? "")}" placeholder="0">`)}${row(t("Pecah"), `<select ${at} data-k="pecah"><option value="">${t("tidak")}</option><option value="huruf" ${(it.pecah ?? (p && p.pecah)) === "huruf" ? "selected" : ""}>${t("huruf")}</option><option value="kata" ${(it.pecah ?? (p && p.pecah)) === "kata" ? "selected" : ""}>${t("kata")}</option></select>`)}</div>
      ${usesJarak ? row(t("Jarak (px)"), `<input type="number" step="any" ${at} data-k="jarak" value="${esc(it.jarak ?? 120)}">`) : ""}
      ${p ? "" : row("from", `<textarea rows="2" ${at} data-k="from">${esc(JSON.stringify(it.from || {}))}</textarea>`) + row("to", `<textarea rows="2" ${at} data-k="to">${esc(JSON.stringify(it.to || {}))}</textarea>`)}
      <div class="grup" style="margin-top:4px">${p ? `<button class="kecil" data-act="kustomkan" data-id="${esc(it.id)}">${t("Jadikan kustom")}</button>` : ""}<button class="kecil" data-act="hapusAnim" data-id="${esc(it.id)}">${t("Hapus animasi")}</button>
      <button class="kecil" data-act="lompat" data-t="${esc(it.at ?? 0)}">${t("Ke awal")}</button></div></div>`;
  }
  if (a.kind === "js") {
    const c = a.call, at = `data-a="js" data-key="${esc(a.key)}"`;
    const field = (which, p) => {
      const ro = p.value.kind === "expr" || p.value.kind === "object";
      const v = p.value.kind === "string" ? p.value.value : p.value.raw;
      const isEase = p.key === "ease" && which === "vars";
      return row((which === "from" ? "from." : "") + p.key, isEase ? easeSel(`${at} data-w="${which}" data-k="${esc(p.key)}" data-kind="string"`, v) :
        `<input type="text" ${at} data-w="${which}" data-k="${esc(p.key)}" data-kind="${p.value.kind}" value="${esc(v)}" ${ro ? `readonly title="${esc(t("ekspresi: hanya baca"))}"` : ""}>`, p.key);
    };
    const easeP = c.vars.props.find((p) => p.key === "ease");
    const ease = easeP && easeP.value.kind === "string" ? easeP.value.value : "power1.out";
    const pos = c.position;
    return `<div class="kartuAnim js" data-key="${esc(a.key)}"${sel}><div class="kepala"><b>.${c.method}(${esc(c.target.raw)})</b><span class="peran js">JS</span></div>
      <div class="kecilMut">${t("Tween di skrip bebas: hanya literal yang bisa disunting langsung di sumber.")}</div>
      ${row(t("Posisi"), pos && pos.kind !== "number" ? `<input type="text" readonly value="${esc(pos.raw)}" title="${esc(t("ekspresi: hanya baca"))}">` : `<input type="number" step="any" ${at} data-w="pos" value="${esc(pos ? pos.value : a.live ? fmt(a.live.localStart, 4) : "")}">`)}
      ${!c.vars.props.some((p) => p.key === "duration") ? row("duration", `<input type="number" step="any" ${at} data-w="vars" data-k="duration" data-kind="number" value="" placeholder="0.5">`) : ""}
      ${!easeP ? row("ease", easeSel(`${at} data-w="vars" data-k="ease" data-kind="string"`, "")) : ""}
      ${c.vars.props.filter((p) => p.key).map((p) => field("vars", p)).join("")}
      <canvas class="kurva" data-ease="${esc(ease)}"></canvas>
      ${c.from ? c.from.props.filter((p) => p.key).map((p) => field("from", p)).join("") : ""}
      ${a.live ? "" : `<div class="kecilMut">${t("Tween ini tidak ditemukan di timeline yang berjalan.")}</div>`}</div>`;
  }
  const l = a.live;
  return `<div class="kartuAnim" data-key="${esc(a.key)}"${sel}><div class="kepala"><b>${t("tween skrip")}</b><span class="peran">${t("hanya baca")}</span></div>
    <div class="baca">${fmt(l.start)} s · ${fmt(l.dur)} s · ${esc(Object.keys(l.tw.vars || {}).filter((k) => !/^on|^data$/.test(k)).map((k) => k + ":" + (typeof l.tw.vars[k] === "object" ? "…" : l.tw.vars[k])).join(", "))}</div></div>`;
}

// ------------------------------------------------------------------ kurva ease
function drawCurve(c, name) {
  const g = c.getContext("2d"); const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio);
  g.clearRect(0, 0, w, h);
  let fn = null;
  try { fn = window.gsap && window.gsap.parseEase(name || "none"); } catch { fn = null; }
  const pad = 8 * devicePixelRatio, lo = -0.35, hi = 1.35;
  const Y = (v) => h - pad - ((v - lo) / (hi - lo)) * (h - 2 * pad);
  g.strokeStyle = "rgba(255,255,255,0.1)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(pad, Y(0)); g.lineTo(w - pad, Y(0)); g.moveTo(pad, Y(1)); g.lineTo(w - pad, Y(1)); g.stroke();
  if (!fn) { g.fillStyle = "#ff8a8a"; g.font = 11 * devicePixelRatio + "px system-ui"; g.fillText(t("ease tidak dikenal"), pad, h / 2); return; }
  g.strokeStyle = "#ffb547"; g.lineWidth = 2 * devicePixelRatio; g.beginPath();
  for (let i = 0; i <= 120; i++) { const x = i / 120, v = fn(x); const px = pad + x * (w - 2 * pad), py = Y(v); i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.stroke();
}

// ------------------------------------------------------------------ event
function bind() {
  bound = true;
  box.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    const le = S.sel[0] && liveEl(S.sel[0]);
    if (f === "colorPick" && le) le.style.color = e.target.value;
    if (f === "bgPick" && le) le.style.background = e.target.value;
    if (e.target.dataset.k === "ease") { const card = e.target.closest(".kartuAnim"); const cv = card && card.querySelector("canvas.kurva"); if (cv) drawCurve(cv, e.target.value); }
  });
  box.addEventListener("change", onChange);
  box.addEventListener("click", onClick);
}
async function onChange(e) {
  const x = e.target, f = x.dataset.f, sid = S.sel[0], el = sid && elOf(sid);
  const v = x.type === "checkbox" ? x.checked : x.value;
  if (x.dataset.act === "tambahAnim") return addAnim(el, v);
  if (x.dataset.mk != null) { const list = JSON.parse(JSON.stringify(S.m.markers)); list[+x.dataset.mk].label = v; return setMarkers(list, t("Ganti nama marker")); }
  if (x.dataset.a === "json") return changeJson(x.dataset.id, x.dataset.k, v);
  if (x.dataset.a === "js") return changeJs(x.dataset.key, x.dataset.w, x.dataset.k, v, x.dataset.kind);
  if (x.dataset.a === "kunci") return changeKey(+x.dataset.ki, +x.dataset.idx, x.dataset.k, v);
  if (x.dataset.attr) return edit(t("Ubah atribut"), () => opAttr(sid, x.dataset.attr, v));
  if (!f) return;
  if (f === "compDur") return setCompDur(+v);
  if (!el) return;
  if (f === "id") return edit(t("Ganti id"), () => opAttr(sid, "id", v.trim() || null));
  if (f === "text") return edit(t("Ubah teks"), () => opText(sid, v));
  if (f === "varText") return setVar(S.m.vars.findIndex((q) => q.id === x.dataset.var), v);
  if (f === "clipStart") return edit(t("Ubah klip"), () => opAttr(sid, "data-start", fmt(+v || 0, 4)), { live: () => liveEl(sid) && liveEl(sid).setAttribute("data-start", v) });
  if (f === "clipDur") return edit(t("Ubah klip"), () => opAttr(sid, "data-duration", v === "" ? null : fmt(+v, 4)), { live: () => { const l = liveEl(sid); if (l) v === "" ? l.removeAttribute("data-duration") : l.setAttribute("data-duration", v); } });
  if (f === "clipTrack") return edit(t("Ubah trek"), () => opAttr(sid, el.attrs["data-track"] != null ? "data-track" : "data-track-index", v === "" ? null : String(Math.round(+v))), { live: () => {} });
  if (f === "clipVol") return edit(t("Ubah volume"), () => opAttr(sid, "data-volume", fmt(+v, 3)), { live: () => {} });
  if (f === "clipMs") return edit(t("Ubah mulai media"), () => opAttr(sid, el.attrs["data-trim-start"] != null ? "data-trim-start" : "data-media-start", fmt(+v, 4)), { live: () => {} });
  if (f === "tx" || f === "ty" || f === "trot" || f === "tscale") {
    const key = { tx: "x", ty: "y", trot: "rotation", tscale: "scale" }[f];
    return commitTransform(t("Ubah transform"), [{ sid, set: { [key]: +v || (key === "scale" ? 1 : 0) } }]);
  }
  if (f === "topac") {
    if (S.mode === "kunci" && el.fi === 0) return commitTransform(t("Kunci opasitas"), [{ sid, set: { opacity: +v } }]);
    return edit(t("Ubah opasitas"), () => opStyle(sid, "opacity", v === "" ? null : fmt(+v, 3)));
  }
  if (f === "colorPick") return edit(t("Ubah warna"), () => opStyle(sid, "color", v), { live: () => {} });
  if (f === "bgPick") return edit(t("Ubah latar"), () => opStyle(sid, "background", v), { live: () => {} });
  if (f.startsWith("s:")) {
    const prop = f.slice(2);
    const val = v.trim();
    return edit(t("Ubah gaya") + " " + prop, () => opStyle(sid, prop, val || null), { live: () => { const l = liveEl(sid); if (l) l.style.setProperty(prop, val); } });
  }
}
async function onClick(e) {
  const b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
  const act = b.dataset.act, sid = S.sel[0], el = sid && elOf(sid);
  if (act === "lihat") return toggleHidden(sid);
  if (act === "kunciLap") return toggleLock(sid);
  if (act === "ganda") return duplicateSel();
  if (act === "hapus") return deleteSel();
  if (act === "naik") return zOrder(1);
  if (act === "turun") return zOrder(-1);
  if (act === "pasangFormat") return edit(t("Pasang format Studio"), () => ensureFormatOnly());
  if (act === "lompatMarker") return seek(S.m.markers[+b.dataset.i].t);
  if (act === "hapusMarker") { const list = JSON.parse(JSON.stringify(S.m.markers)); list.splice(+b.dataset.i, 1); return setMarkers(list, t("Hapus marker")); }
  if (act === "lompat") return seek(+b.dataset.t);
  if (act === "jadikanKlip") return edit(t("Jadikan klip"), () => {
    opAttr(sid, "data-start", fmt(S.t, 4)); opAttr(sid, "data-duration", "2");
    const cls = (Src.attrOf(Src.scanHTML(fileText(el.fi))[el.i], "class") || "").split(/\s+/).filter(Boolean);
    if (!cls.includes("clip")) opAttr(sid, "class", [...cls, "clip"].join(" "));
  });
  if (act === "hapusAttr") return edit(t("Hapus atribut"), () => opAttr(sid, b.dataset.k, null));
  if (act === "tambahVarAttr") { const k = prompt(t("Nama (tanpa data-var-)"), "text"); if (!k) return; return edit(t("Tambah atribut"), () => opAttr(sid, "data-var-" + k.replace(/^data-var-/, ""), "")); }
  if (act === "hapusAnim") return edit(t("Hapus animasi"), () => { const s = specGet(); s.animasi = s.animasi.filter((a) => a.id !== b.dataset.id); specSet(s); });
  if (act === "kustomkan") return edit(t("Jadikan kustom"), () => {
    const s = specGet(); const it = s.animasi.find((a) => a.id === b.dataset.id); const p = LOADER().PRESET[it.preset];
    const d = p.buat(it); it.from = d.from; it.to = d.to;
    it.durasi = it.durasi ?? p.durasi; it.ease = it.ease ?? p.ease;
    if (p.stagger && it.stagger == null) it.stagger = p.stagger; if (p.pecah && it.pecah == null) it.pecah = p.pecah;
    if (p.repeat) it.repeat = p.repeat; if (p.yoyo) it.yoyo = true;
    delete it.preset; delete it.jarak; specSet(s);
  });
  if (act === "hapusKunci") return deleteKey({ ki: +b.dataset.ki, idx: +b.dataset.idx });
  if (act === "hapusJalur") return edit(t("Hapus jalur keyframe"), () => { const s = specGet(); s.kunci.splice(+b.dataset.ki, 1); specSet(s); });
  if (act === "lompatKunci") { S.selKey = { ki: +b.dataset.ki, idx: +b.dataset.idx }; return seek(S.m.spec.kunci[+b.dataset.ki].keys[+b.dataset.idx].t); }
}
async function addAnim(el, presetId) {
  if (!el || !presetId) return;
  const P = LOADER().PRESET;
  let newKey = null;
  await edit(t("Tambah animasi"), () => {
    const id = ensureId(el.sid);
    const s = specGet();
    const aid = newAnimId(s);
    const it = { id: aid, target: "#" + id, at: +fmt(S.t, 3) };
    if (presetId === "__kustom") Object.assign(it, { durasi: 0.6, ease: "power2.out", from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } });
    else { it.preset = presetId; it.durasi = P[presetId].durasi; it.ease = P[presetId].ease; }
    s.animasi.push(it); specSet(s);
    newKey = "j:" + aid;
  });
  S.selAnim = newKey;
}
function changeJson(id, k, v) {
  return edit(t("Ubah animasi"), () => {
    const s = specGet(); const it = s.animasi.find((a) => a.id === id); if (!it) return;
    const P = LOADER().PRESET;
    if (k === "preset") {
      if (!v) { // ke kustom
        const p = P[it.preset]; if (p) { const d = p.buat(it); it.from = d.from; it.to = d.to; }
        delete it.preset; delete it.jarak;
      } else {
        const old = P[it.preset]; const p = P[v];
        it.preset = v; delete it.from; delete it.to;
        // ganti durasi/ease bawaan bila sebelumnya masih bawaan preset lama
        if (!old || it.durasi == null || it.durasi === old.durasi) it.durasi = p.durasi;
        if (!old || !it.ease || it.ease === old.ease) it.ease = p.ease;
        if (old && it.stagger === old.stagger) delete it.stagger;
        if (old && it.pecah === old.pecah) delete it.pecah;
      }
    } else if (k === "from" || k === "to") {
      let o; try { o = JSON.parse(v || "{}"); } catch (e) { throw new Error(k + ": " + t("bukan JSON yang sah") + " (" + e.message + ")"); }
      it[k] = o;
    } else if (v === "" || v == null) delete it[k];
    else it[k] = ["at", "durasi", "stagger", "jarak", "repeat"].includes(k) ? +v : v;
    specSet(s);
  });
}
function changeJs(key, which, k, v, kind) {
  const a = S.anims.find((x) => x.key === key); if (!a) return;
  const s = a.script, idx = a.call.index;
  return edit(t("Ubah tween"), () => {
    if (which === "pos") return opScript(s.fi, s.i, (code) => Src.setTweenPosition(code, idx, +v));
    let val = v;
    if (kind === "number" || (kind !== "string" && /^-?\d*\.?\d+$/.test(v))) val = +v;
    else if (kind === "literal") val = v === "true" ? true : v === "false" ? false : v === "null" ? null : v;
    if (v === "" && kind !== "string") val = undefined;
    opScript(s.fi, s.i, (code) => Src.setTweenProp(code, idx, which, k, val));
  });
}
function changeKey(ki, idx, k, v) {
  return edit(t("Ubah keyframe"), () => {
    const s = specGet(); const key = s.kunci[ki].keys[idx];
    if (k === "ease") { if (v) key.ease = v; else delete key.ease; }
    else key[k] = +v;
    s.kunci[ki].keys.sort((a, b) => a.t - b.t);
    specSet(s);
  });
}
function setCompDur(v) {
  const src = S.m.durasiSumber; if (!src || !(v > 0)) return;
  return edit(t("Ubah durasi komposisi"), () => {
    if (src.kind === "attr") opAttr(src.sid, "data-duration", fmt(v, 4));
    else if (src.kind === "js") setFile(0, Src.setInner(fileText(0), src.script.i, Src.splice(src.script.code, src.g.start, src.g.end, fmt(v, 4))));
    else { const s = specGet(); s.durasi = v; specSet(s); }
  });
}
