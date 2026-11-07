// mgp curves: motion QC. Seeks the composition frame by frame, records position, scale, rotation and opacity
// of the moving elements, then draws a value graph + a speed graph (like a Graph Editor) per element and
// flags: linear/robotic motion, speed breaks (pops), abrupt starts/stops, and squash without constant volume.
//
//   mgp curves <composition.html> [--selector ".a, #b"] [-o curves.png] [--json] [--fps 30] [--from 0] [--to 5] [--max 8]
//
// Without --selector: elements with the data-curves attribute (old data-kurva), or (when there are none) elements
// whose own transform/opacity changes. A canvas composition may provide window.__curves = (t) => ({ name: number, ... })
// (old window.__kurva); its channels are analysed too.
//
// JSON (--json): { file, fps, from, to, frames, elements: [{ label, findings: [{ kind, channel, t0, t1, note }], peak, volume }],
//   summary: { linear, pop, abrupt, volume }, auto }. kind: linear | pop | abrupt | volume.
import fs from "node:fs";
import path from "node:path";
import { openSession, resolveTiming, fmtT } from "./session.mjs";
import { stepTimeouts } from "./browser.mjs";
import { L } from "./i18n.mjs";

/* ---------------------------------------------------------------- sampling in the page */
// Columns per element and frame: [cx, cy, sx, sy, rot, op, vis, e, f, shown]. vis = the box has an area (used to
// pick elements, as before); shown = rendered at all (not display:none, not visibility:hidden). Frames that are
// not shown are gaps: no speed is measured into or out of them (an element leaving display:none jumps from 0,0).
function prepareElements([sel, max, badSelector]) {
  const label = (el) => (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.classList && el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : ""));
  let els = [];
  if (sel) { try { els = [...document.querySelectorAll(sel)]; } catch (e) { return { error: badSelector + sel }; } }
  else {
    els = [...document.querySelectorAll("[data-curves], [data-kurva]")];
    if (!els.length) {
      const root = document.querySelector("[data-composition-id]") || document.body;
      els = [...root.querySelectorAll("*")].filter((e) => !/^(SCRIPT|STYLE|LINK|META|TITLE|BR|DEFS|CLIPPATH|LINEARGRADIENT|RADIALGRADIENT|STOP|MASK|FILTER)$/i.test(e.tagName)).slice(0, 800);
      els.auto = true;
    }
  }
  window.__curvesEl = els; window.__curvesMax = max; window.__curvesBuf = [];
  const fn = window.__curves || window.__kurva;
  return { n: els.length, auto: !!els.auto, label: els.map(label), canvas: typeof fn === "function" };
}
/**
 * Seek + sample several frames in ONE page call (was: two CDP round trips per frame, and every element's values
 * sent back as JSON each frame). The samples stay in the page (one Float64Array per frame); only the canvas
 * channels come back. Layout is read once per frame: all rects first, then the styles.
 */
async function seekSample(times) {
  const R = window.__mgpRuntime || window.__rekam, els = window.__curvesEl || [], N = 10;
  const fn = window.__curves || window.__kurva;
  const out = [];
  // no pixels are captured here: skip the paint-state reset of every seek (a full relayout; it only matters for
  // raster caches, not for positions or styles)
  const noReset = window.__mgpNoReset;
  window.__mgpNoReset = true;
  try {
  for (const t of times) {
    window.__mgpT = window.__rekamT = t;
    await R.seek(t);
    const buf = new Float64Array(els.length * N);
    const rects = els.map((el) => el.getBoundingClientRect());
    for (let k = 0; k < els.length; k++) {
      const el = els[k], r = rects[k], o = k * N;
      let m = null, op = 1, shown = 1;
      try {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse" || !el.getClientRects().length) shown = 0;
        if (cs.transform && cs.transform !== "none") m = new DOMMatrix(cs.transform);
        else if (el.transform && el.transform.baseVal && el.transform.baseVal.numberOfItems) { const c = el.transform.baseVal.consolidate(); if (c) m = c.matrix; }
        const v = parseFloat(cs.opacity); op = isNaN(v) ? 1 : v;
      } catch (e) { m = null; }
      let sx = 1, sy = 1, rot = 0;
      if (m) {
        rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
        if (m.is2D === false && (Math.abs(m.m13) > 1e-9 || Math.abs(m.m23) > 1e-9 || Math.abs(m.m31) > 1e-9 || Math.abs(m.m32) > 1e-9)) {
          // rotated out of the plane (rotateX/Y): the 2D part shrinks by foreshortening, not by scale; the 3D axis
          // lengths are the real scale
          sx = Math.hypot(m.m11, m.m12, m.m13); sy = Math.hypot(m.m21, m.m22, m.m23);
        } else { sx = Math.hypot(m.a, m.b); sy = sx ? (m.a * m.d - m.b * m.c) / sx : Math.hypot(m.c, m.d); }
      }
      buf[o] = r.left + r.width / 2; buf[o + 1] = r.top + r.height / 2; buf[o + 2] = sx; buf[o + 3] = sy; buf[o + 4] = rot;
      buf[o + 5] = op; buf[o + 6] = r.width * r.height > 0 ? 1 : 0; buf[o + 7] = m ? m.e : 0; buf[o + 8] = m ? m.f : 0; buf[o + 9] = shown;
    }
    window.__curvesBuf.push(buf);
    let kv = null;
    if (typeof fn === "function") { try { kv = fn(t); } catch (e) { kv = null; } }
    out.push(kv && typeof kv === "object" ? kv : null);
  }
  } finally { window.__mgpNoReset = noReset; }
  return out;
}
/** Per element: the range of each column over all frames (positions over shown frames only), and "ever has an area". */
function spreads() {
  const B = window.__curvesBuf || [], n = (window.__curvesEl || []).length, N = 10, out = [];
  for (let k = 0; k < n; k++) {
    const lo = new Array(N).fill(Infinity), hi = new Array(N).fill(-Infinity);
    let vis = 0;
    for (const buf of B) {
      const o = k * N, shown = buf[o + 9];
      if (buf[o + 6]) vis = 1;
      for (let c = 0; c < N; c++) {
        if (!shown && (c === 0 || c === 1)) continue;
        const v = buf[o + c];
        if (v < lo[c]) lo[c] = v;
        if (v > hi[c]) hi[c] = v;
      }
    }
    out.push({ vis, d: lo.map((a, c) => (Number.isFinite(a) ? hi[c] - a : 0)) });
  }
  return out;
}
/** The per-frame rows of the picked elements only. */
function rowsOf(idx) {
  const B = window.__curvesBuf || [], N = 10;
  return idx.map((k) => B.map((buf) => Array.from(buf.subarray(k * N, k * N + N))));
}

/* ---------------------------------------------------------------- analysis (pure, testable without a browser) */
/** unwrap angles so 179 -> -179 is not read as a 358 degree jump */
const unwrap = (a) => { const o = a.slice(); for (let i = 1; i < o.length; i++) { let d = o[i] - o[i - 1]; while (d > 180) { d -= 360; } while (d < -180) { d += 360; } o[i] = o[i - 1] + d; } return o; };

/**
 * Analyse one value series (value per frame, dt seconds). Returns {speed, peak, segments, findings}.
 * threshold: minimum speed counted as moving (unit/second). gap (optional): true for frames where the element is
 * not shown (display:none, hidden, a missing canvas value); no speed is measured into or out of a gap, and a move
 * that starts as the element appears (or stops as it disappears) is not an abrupt start/stop.
 */
export function analyseSpeed(v, dt, name, unit, threshold, times, gap) {
  const n = v.length, speed = new Array(n).fill(0);
  for (let i = 1; i < n; i++) speed[i] = gap && (gap[i] || gap[i - 1]) ? 0 : Math.abs(v[i] - v[i - 1]) / dt;
  return analyseSeries(speed, name, unit, threshold, times, gap);
}
export function analyseSeries(speed, name, unit, threshold, times, gap) {
  const n = speed.length, peak = Math.max(0, ...speed), findings = [];
  if (peak < threshold) return { speed, peak, segments: [], findings };
  const G = (i) => !!(gap && i >= 0 && i < n && gap[i]);
  const moving = speed.map((s) => s > Math.max(threshold, peak * 0.02));
  const segments = []; let a = -1;
  for (let i = 0; i <= n; i++) { const g = i < n && moving[i]; if (g && a < 0) a = i; if (!g && a >= 0) { segments.push([a, i - 1]); a = -1; } }
  const T = (i) => times[Math.max(0, Math.min(times.length - 1, i))];
  for (const [i0, i1] of segments) {
    const len = i1 - i0 + 1, s = speed.slice(i0, i1 + 1), pk = Math.max(...s);
    if (pk < peak * 0.15) continue;   // small jitter
    // a move that begins as the element appears (or ends as it disappears) is an appearance, not an abrupt start/stop
    const fromGap = G(i0 - 1) || G(i0 - 2), intoGap = G(i1 + 1);
    // linear / robotic: nearly constant speed over the segment and starts/stops within one frame
    const inner = len > 4 ? s.slice(1, -1) : s, im = inner.reduce((x, y) => x + y, 0) / inner.length;
    const cv = Math.sqrt(inner.reduce((x, y) => x + (y - im) * (y - im), 0) / inner.length) / (im || 1);
    const sharpStart = s[0] > pk * 0.6 && !fromGap, sharpEnd = s[len - 1] > pk * 0.6 && !intoGap;
    let linear = false;
    if (len >= 5 && cv < 0.06 && (sharpStart || sharpEnd)) {
      linear = true;
      const how = sharpStart && sharpEnd ? L`an abrupt start and stop` : sharpStart ? L`an abrupt start` : L`an abrupt stop`;
      findings.push({ kind: "linear", channel: name, t0: T(i0 - 1), t1: T(i1), note: L`constant speed ${im.toFixed(1)} ${unit}/s (±${(cv * 100).toFixed(1)} %) with ${how}: add ease in/out or a spring` });
    }
    // pop: a speed jump in the middle of a move
    // = an acceleration spike its neighbouring frames do not support (a fast spring stays smooth: its acceleration is even)
    for (let i = i0 + 1; i <= i1; i++) {
      if (G(i) || G(i - 1) || G(i - 2)) continue;
      const d = Math.abs(speed[i] - speed[i - 1]), dPrev = i >= 2 ? Math.abs(speed[i - 1] - speed[i - 2]) : 0, dNext = i + 1 < n ? Math.abs(speed[i + 1] - speed[i]) : 0;
      if (d > peak * 0.25 && d > 2.5 * Math.max(dPrev, dNext) && speed[i] > threshold && speed[i - 1] > threshold) findings.push({ kind: "pop", channel: name, t0: T(i - 1), t1: T(i), note: L`speed jumps ${speed[i - 1].toFixed(0)} -> ${speed[i].toFixed(0)} ${unit}/s within 1 frame (pop)` });
    }
    // abrupt start / stop (when not already reported as linear)
    if (!linear && len >= 3) {
      if (sharpStart) findings.push({ kind: "abrupt", channel: name, t0: T(i0 - 1), t1: T(i0), note: L`starts from rest to ${s[0].toFixed(0)} ${unit}/s within 1 frame (${Math.round((s[0] / pk) * 100)} % of the peak)` });
      if (sharpEnd) findings.push({ kind: "abrupt", channel: name, t0: T(i1), t1: T(i1 + 1), note: L`stops from ${s[len - 1].toFixed(0)} ${unit}/s to rest within 1 frame` });
    }
  }
  return { speed, peak, segments, findings };
}
/**
 * squash/stretch: when the scale is not uniform (|sx| != |sy|), the area |sx*sy| must stay at the area of the
 * uniform (rest) scale around it. A mirror (scaleX -1) is not a squash, and while the uniform scale itself
 * changes (a scale-in with a squash), the area may lie anywhere between the rest areas before and after.
 */
export function analyseVolume(sx, sy, times, tol = 0.1, gap) {
  const n = sx.length, findings = [];
  const ax = sx.map(Math.abs), ay = sy.map(Math.abs);
  const G = (i) => !!(gap && gap[i]);
  const aspect = ax.map((v, i) => (ay[i] ? v / ay[i] : 1)), rest = [];
  for (let i = 0; i < n; i++) if (!G(i) && Math.abs(aspect[i] - 1) < 0.01) rest.push(i);
  if (!aspect.some((a, i) => !G(i) && Math.abs(a - 1) > 0.05)) return { findings, maxError: 0 };
  let maxError = 0, iMax = -1, a = -1;
  const area = (i) => ax[i] * ay[i] || 1;
  // rest areas just before and after frame i (one side only at the ends; 1 when there is no rest frame at all)
  const band = (i) => {
    let p = -1, q = -1;
    for (const j of rest) { if (j <= i) p = j; else { q = j; break; } }
    if (p < 0 && q < 0) return [1, 1];
    const A = p >= 0 ? area(p) : area(q), B = q >= 0 ? area(q) : area(p);
    return [Math.min(A, B), Math.max(A, B)];
  };
  const bad = new Array(n).fill(false), err = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (G(i) || Math.abs(aspect[i] - 1) <= 0.05) continue;
    const v = ax[i] * ay[i], [lo, hi] = band(i);
    const e = (err[i] = v < lo ? 1 - v / lo : v > hi ? v / hi - 1 : 0);
    if (e > maxError) { maxError = e; iMax = i; }
    if (e > tol) bad[i] = true;
  }
  for (let i = 0; i <= n; i++) { const b = i < n && bad[i]; if (b && a < 0) a = i; if (!b && a >= 0) { const j = a; findings.push({ kind: "volume", channel: "scale", t0: times[j], t1: times[i - 1], note: L`squash/stretch without constant volume: sx·sy deviates up to ${(Math.max(...err.slice(j, i)) * 100).toFixed(0)} % (use sx = 1/sy, MGP.core.stretch)` }); a = -1; } }
  return { findings, maxError, tMax: iMax >= 0 ? times[iMax] : null };
}
/** analyse every channel of one element. data = [[x,y,sx,sy,rot,op,vis,e,f,shown], ...] per frame (shown optional) */
export function analyseElement(data, times, dt) {
  const col = (k) => data.map((r) => r[k]);
  const x = col(0), y = col(1), sx = col(2), sy = col(3), rot = unwrap(col(4)), op = col(5);
  const gapAll = data.map((r) => r.length > 9 && !r[9]), gap = gapAll.some(Boolean) ? gapAll : undefined;
  const values = { x, y, scaleX: sx, scaleY: sy, rotation: rot, opacity: op };
  const n = data.length, posSpeed = new Array(n).fill(0);
  for (let i = 1; i < n; i++) posSpeed[i] = gap && (gap[i] || gap[i - 1]) ? 0 : Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]) / dt;
  const res = { channels: {}, findings: [] };
  const range = (a) => [Math.min(...a), Math.max(...a)];
  const pos = analyseSeries(posSpeed, "position", "px", 4, times, gap);
  res.channels.position = { speed: pos.speed, peak: pos.peak, x: range(x), y: range(y) };
  res.findings.push(...pos.findings);
  const scl = (a) => analyseSpeed(a, dt, "scale", "", 0.02, times, gap);
  const s1 = scl(sx), s2 = scl(sy), sk = s1.speed.map((v, i) => Math.max(v, s2.speed[i]));
  const sA = analyseSeries(sk, "scale", "", 0.02, times, gap);
  res.channels.scale = { speed: sk, peak: sA.peak, sx: range(sx), sy: range(sy) }; res.findings.push(...sA.findings);
  const r = analyseSpeed(rot, dt, "rotation", "°", 2, times, gap);
  res.channels.rotation = { speed: r.speed, peak: r.peak, values: range(rot) }; res.findings.push(...r.findings);
  const o = analyseSpeed(op, dt, "opacity", "", 0.02, times, gap);
  res.channels.opacity = { speed: o.speed, peak: o.peak, values: range(op) }; res.findings.push(...o.findings.filter((q) => q.kind !== "abrupt"));
  const vol = analyseVolume(sx, sy, times, 0.1, gap);
  res.volume = { maxError: vol.maxError, tMax: vol.tMax }; res.findings.push(...vol.findings);
  res.values = values;
  return res;
}

/* ---------------------------------------------------------------- graph drawing */
function graphPage(data) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#101218;color:#ddd;font:13px/1.3 system-ui,Segoe UI,Arial,sans-serif}</style></head>
<body><canvas id="c"></canvas><script>
const D = ${JSON.stringify(data).replace(/</g, "\\u003c")};
const W = 1600, RH = 230, HEAD = 58, n = D.el.length, H = HEAD + n * RH + 16;
const c = document.getElementById("c"); c.width = W; c.height = H; c.style.width = W + "px"; c.style.height = H + "px";
const g = c.getContext("2d");
g.fillStyle = "#101218"; g.fillRect(0, 0, W, H);
g.fillStyle = "#fff"; g.font = "600 17px system-ui,Segoe UI,Arial"; g.fillText(D.title, 16, 26);
g.fillStyle = "#9aa"; g.font = "13px system-ui,Segoe UI,Arial"; g.fillText(D.sub, 16, 46);
const COL = { x: "#5ab0ff", y: "#7ee0a6", scaleX: "#ffb347", scaleY: "#ff7f6e", rotation: "#c39bff", opacity: "#e6e6e6", position: "#5ab0ff", scale: "#ffb347" };
const KIND = { linear: "#ff4d6d", pop: "#ffcc00", abrupt: "#ff9a3c", volume: "#ff3df2" };
const T0 = D.times[0], T1 = D.times[D.times.length - 1];
function panel(x0, y0, w, h, title) {
  g.fillStyle = "#171a23"; g.fillRect(x0, y0, w, h); g.strokeStyle = "#2a2f3c"; g.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  g.fillStyle = "#aab"; g.font = "600 12px system-ui"; g.fillText(title, x0 + 8, y0 + 16);
  const L = x0 + 8, R = x0 + w - 8, T = y0 + 26, B = y0 + h - 20, X = (t) => L + (R - L) * (t - T0) / ((T1 - T0) || 1);
  g.strokeStyle = "#252a36"; g.lineWidth = 1;
  const step = Math.max(0.5, Math.ceil((T1 - T0) / 12 * 2) / 2);
  for (let t = Math.ceil(T0 / step) * step; t <= T1 + 1e-9; t += step) { const x = X(t); g.beginPath(); g.moveTo(x + 0.5, T); g.lineTo(x + 0.5, B); g.stroke(); g.fillStyle = "#667"; g.font = "10px system-ui"; g.fillText(t.toFixed(1) + "s", x + 2, B + 13); }
  return { X, T, B, L, R };
}
D.el.forEach((E, k) => {
  const y0 = HEAD + k * RH;
  g.fillStyle = E.findings.length ? "#ffb3c1" : "#cfe"; g.font = "600 13px system-ui"; g.fillText((E.findings.length ? "● " : "✓ ") + E.label, 16, y0 + 16);
  g.fillStyle = "#889"; g.font = "11px system-ui"; g.fillText(E.summary, 16, y0 + 32);
  // findings as bands
  const pw = (W - 48) / 2, ph = RH - 48;
  const A = panel(16, y0 + 40, pw, ph, D.labels.values), Bp = panel(32 + pw, y0 + 40, pw, ph, D.labels.speed);
  for (const P of [A, Bp]) for (const q of E.findings) { g.fillStyle = KIND[q.kind] + "44"; const xa = P.X(q.t0), xb = Math.max(xa + 2, P.X(q.t1)); g.fillRect(xa, P.T, xb - xa, P.B - P.T); }
  let lx = A.L + 230;
  for (const [nm, arr] of Object.entries(E.values)) {
    const mn = Math.min(...arr), mx = Math.max(...arr); if (mx - mn < 1e-6) continue;
    g.strokeStyle = COL[nm]; g.lineWidth = 1.6; g.beginPath();
    arr.forEach((v, i) => { const x = A.X(D.times[i]), y = A.B - (A.B - A.T) * (v - mn) / (mx - mn); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = COL[nm]; g.font = "11px system-ui"; const s = nm + " " + (+mn.toFixed(2)) + "→" + (+mx.toFixed(2)); g.fillText(s, lx, A.T - 12 + 4); lx += g.measureText(s).width + 14;
  }
  let lx2 = Bp.L + 330;
  for (const [nm, S] of Object.entries(E.speed)) {
    if (!(S.peak > 0)) continue;
    g.strokeStyle = COL[nm]; g.lineWidth = 1.6; g.beginPath();
    S.speed.forEach((v, i) => { const x = Bp.X(D.times[i]), y = Bp.B - (Bp.B - Bp.T) * v / S.peak; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = COL[nm]; g.font = "11px system-ui"; const s = nm + " " + S.label; g.fillText(s, lx2, Bp.T - 8); lx2 += g.measureText(s).width + 14;
  }
});
let lx = W - 520; g.font = "12px system-ui";
for (const [j, cc] of Object.entries(KIND)) { const name = D.labels.kinds[j] || j; g.fillStyle = cc; g.fillRect(lx, 18, 12, 12); g.fillStyle = "#ccd"; g.fillText(name, lx + 16, 29); lx += 30 + g.measureText(name).width; }
window.__done = true;
</script></body></html>`;
}

/** Translated finding kind (the JSON keeps the English kind). */
const kindName = (k) => ({ linear: L`linear`, pop: L`pop`, abrupt: L`abrupt`, volume: L`volume` })[k] || k;

/* ---------------------------------------------------------------- command */
export async function curves(comp, o = {}) {
  const session = await openSession(comp, o);
  try {
    const s = await session.open();
    const tm = resolveTiming(s.info, o);
    const fps = Math.min(60, +(o.fps || s.info.fps || 30)), dt = 1 / fps;
    const max = Math.max(1, +(o.max || 8));
    const prep = await s.page.evaluate(prepareElements, [o.selector || null, max, L`invalid selector: `]);
    if (prep.error) throw new Error(prep.error);
    const n = Math.max(2, Math.round((tm.to - tm.from) * fps) + 1), times = Array.from({ length: n }, (_, i) => +(tm.from + i * dt).toFixed(6));
    // seek + sample in chunks of frames per page call (one round trip per chunk; the samples stay in the page)
    const canvas = [], lim = s.timeouts || stepTimeouts(o), CH = 12;
    for (let k = 0; k < n; k += CH) {
      const ts = times.slice(k, k + CH);
      try { canvas.push(...await s.page.evaluate(seekSample, ts, { timeout: lim.seek ? lim.seek * 2 : 0, what: L`curves: seek + sample ${ts[0]}-${ts[ts.length - 1]} s` })); }
      catch (e) { if (e.mgpTimeout) e.message += "\n" + L`(a seek in this range did not finish; check that frame alone with mgp frame --t <s>, or raise --timeout)`; throw e; }
      if (!o.quiet && n > 240 && (k / CH) % 20 === 19) process.stderr.write(L`  curves: ${Math.min(n, k + CH)}/${n} frames` + "\n");
    }
    // pick elements: those whose own transform/opacity changes (auto mode), sorted by amount of motion
    let idx = prep.label.map((_, i) => i);
    const SP = prep.auto ? await s.page.evaluate(spreads) : null;
    const spread = (i) => { const d = SP[i].d; return { pos: Math.hypot(d[0], d[1]), sk: Math.max(d[2], d[3]), rot: d[4], op: d[5], own: Math.hypot(d[7], d[8]) }; };
    const score = (v) => v.pos / 40 + v.sk * 4 + v.rot / 20 + v.op * 2;
    if (prep.auto) {
      // only elements whose OWN transform/opacity changes (children that follow their parent are skipped);
      // when there are none at all (motion through left/top), use elements whose position changes
      const visible = (i) => !!SP[i].vis;
      let pick = idx.filter((i) => { const v = spread(i); return visible(i) && (v.sk > 0.01 || v.rot > 0.5 || v.op > 0.01 || v.own > 0.5); });
      if (!pick.length) pick = idx.filter((i) => visible(i) && spread(i).pos > 1);
      idx = pick.sort((a, b) => score(spread(b)) - score(spread(a)));
    }
    idx = idx.slice(0, prep.auto ? max : Math.max(max, 64));
    const series = idx.length ? await s.page.evaluate(rowsOf, idx) : [];
    const el = idx.map((i, k) => ({ label: prep.label[i], ...analyseElement(series[k], times, dt) }));
    // canvas channels (window.__curves): every channel that appears in ANY sample (was: only the first sample's,
    // so a channel that started later was dropped silently); frames where a channel is missing are gaps
    if (prep.canvas) {
      const names = [];
      for (const q of canvas) if (q) for (const k of Object.keys(q)) if (!names.includes(k)) names.push(k);
      for (const name of names) {
        const raw = canvas.map((q) => (q && q[name] != null && Number.isFinite(+q[name]) ? +q[name] : null));
        const have = raw.filter((v) => v != null);
        if (!have.length) continue;
        const gap = raw.map((v) => v == null);
        let last = have[0];
        const v = raw.map((x) => (x != null ? (last = x) : last));
        const rg = Math.max(...have) - Math.min(...have);
        const A = analyseSpeed(v, dt, name, "", Math.max(1e-6, rg * 0.02), times, gap.some(Boolean) ? gap : undefined);
        el.push({ label: "canvas:" + name, channels: { [name]: { speed: A.speed, peak: A.peak, values: [Math.min(...have), Math.max(...have)] } }, findings: A.findings, values: { [name]: v }, canvas: true });
      }
    }
    const summary = { linear: 0, pop: 0, abrupt: 0, volume: 0 };
    for (const E of el) for (const q of E.findings) summary[q.kind] = (summary[q.kind] || 0) + 1;
    const res = { file: session.c.file, fps, from: tm.from, to: tm.to, frames: n, elements: el.map((E) => ({ label: E.label, findings: E.findings,
      peak: Object.fromEntries(Object.entries(E.channels).map(([k, v]) => [k, +(+v.peak || 0).toFixed(3)])), volume: E.volume })), summary, auto: prep.auto };

    const out = o.o || o.out ? path.resolve(o.o || o.out) : null;
    if (out) {
      const fmt = (k, v) => (k === "position" ? v.toFixed(0) + " px/s" : k === "rotation" ? v.toFixed(0) + "°/s" : v.toFixed(2) + "/s");
      const sumLine = `${kindName("linear")} ${summary.linear}, ${kindName("pop")} ${summary.pop}, ${kindName("abrupt")} ${summary.abrupt}, ${kindName("volume")} ${summary.volume}`;
      const graph = { title: "mgp curves · " + path.basename(session.c.file), sub: L`${fps} fps · ${fmtT(tm.from)} → ${fmtT(tm.to)} · ${el.length} elements · findings: ${sumLine}`,
        labels: { values: L`Value (normalised per channel)`, speed: L`Speed (normalised per channel, label = peak)`,
          kinds: { linear: kindName("linear"), pop: kindName("pop"), abrupt: kindName("abrupt"), volume: kindName("volume") } },
        times, el: el.map((E) => ({ label: E.label, findings: E.findings, summary: E.findings.length ? E.findings.slice(0, 3).map((q) => `${kindName(q.kind)} ${q.channel} ${q.t0.toFixed(2)}–${q.t1.toFixed(2)} s`).join(" · ") + (E.findings.length > 3 ? ` (+${E.findings.length - 3})` : "") : L`no findings`,
          values: E.values, speed: Object.fromEntries(Object.entries(E.channels).map(([k, v]) => [k, { speed: v.speed, peak: v.peak, label: fmt(k, +v.peak || 0) }])) })) };
      const H = 58 + Math.max(1, el.length) * 230 + 16;
      const page = await session.browser.newPage({ viewport: { width: 1600, height: Math.min(16000, H) }, deviceScaleFactor: 1 });
      await page.setContent(graphPage(graph), { waitUntil: "load" });
      await page.waitForFunction(() => window.__done === true, null, { timeout: 20000 });
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, type: /\.jpe?g$/i.test(out) ? "jpeg" : "png", fullPage: true });
      await page.close();
      res.out = out;
    }
    return res;
  } finally { await session.close(); }
}

export function printCurves(h) {
  const els = h.elements || h.elemen || [];
  const lines = [L`curves ${path.basename(h.file)}: ${h.frames ?? h.frame} frames @ ${h.fps} fps, ${els.length} elements` + (h.auto ? " " + L`(picked automatically)` : "")];
  for (const E of els) {
    const fs_ = E.findings || E.temuan || [];
    lines.push(`  ${fs_.length ? "!" : "ok"} ${E.label}  ${L`peak`} ${Object.entries(E.peak || E.puncak || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}`);
    for (const q of fs_) lines.push(`      ${kindName(q.kind || q.jenis).padEnd(8)} ${(q.channel || q.saluran).padEnd(8)} ${q.t0.toFixed(2)}-${q.t1.toFixed(2)} s  ${q.note || q.ket}`);
  }
  const sm = h.summary || {};
  lines.push(L`summary: ${kindName("linear")} ${sm.linear || 0}, ${kindName("pop")} ${sm.pop || 0}, ${kindName("abrupt")} ${sm.abrupt || 0}, ${kindName("volume")} ${sm.volume || 0}` + (h.out ? "\n" + L`graph: ${h.out}` : ""));
  return lines.join("\n");
}

/** Old names (v2.3 / v2.4-dev). */
export { curves as kurva, printCurves as cetakKurva, analyseSpeed as analisisKecepatan, analyseSeries as analisisDeret,
  analyseVolume as analisisVolume, analyseElement as analisisElemen };
