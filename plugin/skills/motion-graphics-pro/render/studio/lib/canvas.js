// mgp Studio - preview canvas: pilih, geser, skala, putar, pandu pintar, marquee, area aman.
import { S, liveEl, elOf, isLocked, select, commitTransform, baseOf, fmt } from "../app.js";
import { t } from "./i18n.js";

const $ = (s) => document.querySelector(s);
let pan, bingkai, ham, cv, drag = null, hover = null;

export function initKanvas() {
  pan = $("#panggung"); bingkai = $("#bingkai"); ham = $("#hamparan"); cv = $("#lapisAman");
  pan.appendChild(cv); pan.appendChild(ham);
  ham.addEventListener("pointerdown", onDown);
  ham.addEventListener("pointermove", onMove);
  ham.addEventListener("pointerup", onUp);
  ham.addEventListener("pointercancel", onUp);
  ham.addEventListener("pointerleave", () => { if (!drag) { hover = null; drawOverlay(); } });
  ham.addEventListener("dblclick", () => { const f = document.querySelector('#inspektur [data-f="text"]'); if (f) { f.focus(); f.select && f.select(); } });
  pan.addEventListener("wheel", (e) => {
    if (!S.info) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const r = pan.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const old = S.scale, nw = Math.max(0.05, Math.min(6, old * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      S.ox = mx - ((mx - S.ox) * nw) / old; S.oy = my - ((my - S.oy) * nw) / old;
      S.zoom = nw; S.panSet = true;
    } else { S.ox -= e.deltaX; S.oy -= e.deltaY; S.panSet = true; if (S.zoom === "fit") S.zoom = S.scale; }
    fitStage();
  }, { passive: false });
  new ResizeObserver(() => fitStage()).observe(pan);
}

export function fitStage() {
  if (!S.info || !pan) return;
  const W = S.info.width, H = S.info.height, pw = pan.clientWidth, ph = pan.clientHeight;
  const fit = Math.min((pw - 40) / W, (ph - 40) / H);
  if (S.zoom === "fit") { S.scale = fit; S.panSet = false; } else S.scale = S.zoom;
  if (!S.panSet) { S.ox = (pw - W * S.scale) / 2; S.oy = (ph - H * S.scale) / 2; }
  bingkai.style.width = W + "px"; bingkai.style.height = H + "px";
  bingkai.style.transform = `translate(${S.ox}px, ${S.oy}px) scale(${S.scale})`;
  $("#zoomLbl").textContent = Math.round(S.scale * 100) + "%";
  cv.width = pw * devicePixelRatio; cv.height = ph * devicePixelRatio; cv.style.width = pw + "px"; cv.style.height = ph + "px";
  drawOverlay();
}

const scr = (x, y) => [S.ox + x * S.scale, S.oy + y * S.scale];
function compPt(e) { const r = pan.getBoundingClientRect(); return { x: (e.clientX - r.left - S.ox) / S.scale, y: (e.clientY - r.top - S.oy) / S.scale }; }
export function boxOf(sid) {
  const le = liveEl(sid); if (!le) return null;
  const r = le.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}
function isBg(sid) { const b = boxOf(sid); return !!b && S.info && b.w * b.h >= 0.9 * S.info.width * S.info.height; }
function pick(x, y) {
  if (!S.win) return null;
  const list = S.win.document.elementsFromPoint(x, y);
  for (const e of list) {
    const s = e.closest && e.closest("[data-studio-sid]");
    if (!s) continue;
    const sid = s.getAttribute("data-studio-sid"), el = elOf(sid);
    if (!el || isLocked(el)) continue;
    return { sid, bg: isBg(sid) };
  }
  return null;
}

// ------------------------------------------------------------------ interaksi
function onDown(e) {
  if (!S.win || e.button !== 0) return;
  ham.setPointerCapture(e.pointerId);
  const p = compPt(e);
  const h = e.target.closest(".pegangan");
  if (h && S.sel.length === 1) return startHandle(h.dataset.h, p, e);
  const hit = pick(p.x, p.y);
  if (hit && (!hit.bg || S.sel.includes(hit.sid))) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) { select([hit.sid], true); drag = null; return; }
    if (!S.sel.includes(hit.sid)) select([hit.sid]);
    drag = { type: "move", p0: p, started: false, hit };
  } else drag = { type: "marquee", p0: p, p1: p, hit, add: e.shiftKey || e.ctrlKey || e.metaKey };
}
function startMove() {
  const sids = S.sel.filter((s) => elOf(s) && !isLocked(elOf(s)));
  const boxes = sids.map(boxOf).filter(Boolean);
  if (!boxes.length) { drag = null; return; }
  const U = { l: Math.min(...boxes.map((b) => b.l)), t: Math.min(...boxes.map((b) => b.t)), r: Math.max(...boxes.map((b) => b.r)), b: Math.max(...boxes.map((b) => b.b)) };
  // garis pandu: tepi & tengah kanvas + lapisan lain
  const W = S.info.width, H = S.info.height, xs = [0, W / 2, W], ys = [0, H / 2, H];
  const selSet = new Set(sids);
  let n = 0;
  for (const el of S.m.list) {
    if (selSet.has(el.sid) || n > 250) continue;
    let up = el.parentSid, skip = false; while (up) { if (selSet.has(up)) { skip = true; break; } up = elOf(up) && elOf(up).parentSid; }
    if (skip) continue;
    const le = liveEl(el.sid); if (!le) continue;
    const b = boxOf(el.sid); if (!b || b.w * b.h >= 0.9 * W * H) continue;
    const cs = S.win.getComputedStyle(le); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    xs.push(b.l, b.cx, b.r); ys.push(b.t, b.cy, b.b); n++;
  }
  drag.sids = sids; drag.U = U; drag.xs = xs; drag.ys = ys; drag.started = true;
  drag.prev = sids.map((sid) => { const le = liveEl(sid); return { sid, le, tr: le.style.translate, b: baseOf(elOf(sid)) }; });
}
function snapAxis(edges, lines, d) {
  const thr = 6 / S.scale;
  let best = null;
  for (const e of edges) for (const c of lines) { const off = c - (e + d); if (Math.abs(off) <= thr && (!best || Math.abs(off) < Math.abs(best.off))) best = { off, c }; }
  return best;
}
function onMove(e) {
  const p = compPt(e);
  if (!drag) {
    const h = pick(p.x, p.y);
    const hs = h && !h.bg ? h.sid : null;
    if (hs !== hover) { hover = hs; drawOverlay(); }
    return;
  }
  if (drag.type === "move") {
    if (!drag.started) { if (Math.hypot(p.x - drag.p0.x, p.y - drag.p0.y) * S.scale < 3) return; startMove(); if (!drag) return; }
    let dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    drag.guides = [];
    if (S.snap && !e.altKey) {
      const U = drag.U;
      const sx = snapAxis([U.l, (U.l + U.r) / 2, U.r], drag.xs, dx); if (sx) { dx += sx.off; drag.guides.push({ v: sx.c }); }
      const sy = snapAxis([U.t, (U.t + U.b) / 2, U.b], drag.ys, dy); if (sy) { dy += sy.off; drag.guides.push({ h: sy.c }); }
    }
    drag.dx = Math.round(dx); drag.dy = Math.round(dy);
    for (const pr of drag.prev) {
      const bx = pr.b.kind === "css" ? pr.b.x : 0, by = pr.b.kind === "css" ? pr.b.y : 0;
      pr.le.style.translate = (bx + drag.dx) + "px " + (by + drag.dy) + "px";
    }
    drag.info = `x ${drag.dx >= 0 ? "+" : ""}${drag.dx}  y ${drag.dy >= 0 ? "+" : ""}${drag.dy}`;
    drag.infoAt = p;
    drawOverlay();
  } else if (drag.type === "marquee") { drag.p1 = p; drawOverlay(); }
  else if (drag.type === "rot") {
    let d = (Math.atan2(p.y - drag.c.y, p.x - drag.c.x) - drag.a0) * 180 / Math.PI;
    d = ((d + 540) % 360) - 180;
    if (e.shiftKey) { const tot = Math.round((drag.r0 + d) / 15) * 15; d = tot - drag.r0; }
    drag.d = +d.toFixed(2);
    drag.le.style.rotate = (drag.cssBase + drag.d) + "deg";
    drag.info = `${fmt(drag.r0 + drag.d, 1)}°`; drag.infoAt = p; drawOverlay();
  } else if (drag.type === "scale") {
    const A = e.altKey ? { x: drag.B.cx, y: drag.B.cy } : drag.A;
    const d0 = Math.hypot(drag.P0.x - A.x, drag.P0.y - A.y) || 1;
    let k = Math.max(0.02, Math.hypot(p.x - A.x, p.y - A.y) / d0);
    // proyeksikan ke arah diagonal agar tidak "terbalik" saat melewati jangkar
    const dot = (p.x - A.x) * (drag.P0.x - A.x) + (p.y - A.y) * (drag.P0.y - A.y);
    if (dot < 0) k = 0.02;
    if (e.shiftKey) k = Math.round(k * 20) / 20;
    const O = drag.O;
    drag.k = k; drag.dx = (1 - k) * (A.x - O.x); drag.dy = (1 - k) * (A.y - O.y);
    drag.le.style.scale = String(drag.cssScale * k);
    drag.le.style.translate = (drag.cssX + drag.dx) + "px " + (drag.cssY + drag.dy) + "px";
    drag.info = "× " + fmt(k, 3); drag.infoAt = p; drawOverlay();
  }
}
function startHandle(h, p, e) {
  const sid = S.sel[0], el = elOf(sid), le = liveEl(sid), B = boxOf(sid);
  if (!el || !le || !B || isLocked(el)) return;
  const b = baseOf(el);
  const css = b.kind === "css" ? b : { x: 0, y: 0, rotation: 0, scale: 1 };
  if (h === "rot") {
    const c = { x: B.cx, y: B.cy };
    const r0 = S.mode === "kunci" ? +S.win.gsap.getProperty(le, "rotation") || 0 : b.rotation;
    drag = { type: "rot", sid, le, c, a0: Math.atan2(p.y - c.y, p.x - c.x), r0, d: 0, cssBase: css.rotation };
    return;
  }
  const corners = { nw: [B.l, B.t], ne: [B.r, B.t], sw: [B.l, B.b], se: [B.r, B.b] };
  const opp = { nw: "se", ne: "sw", sw: "ne", se: "nw" }[h];
  const cs = S.win.getComputedStyle(le);
  const [ox, oy] = cs.transformOrigin.split(" ").map(parseFloat);
  const ow = le.offsetWidth || B.w, oh = le.offsetHeight || B.h;
  const O = { x: B.l + (ox / ow) * B.w, y: B.t + (oy / oh) * B.h };
  drag = { type: "scale", sid, le, B, P0: { x: corners[h][0], y: corners[h][1] }, A: { x: corners[opp][0], y: corners[opp][1] }, O, k: 1, dx: 0, dy: 0,
    cssScale: css.scale, cssX: css.x, cssY: css.y };
}
function onUp(e) {
  const d = drag; drag = null;
  if (!d) return;
  if (d.type === "move") {
    if (!d.started) { drawOverlay(); return; }
    if (!d.dx && !d.dy) { for (const pr of d.prev) pr.le.style.translate = pr.tr; drawOverlay(); return; }
    commitTransform(t("Pindahkan"), d.sids.map((sid) => ({ sid, dx: d.dx, dy: d.dy }))).then((ok) => { if (!ok) for (const pr of d.prev) pr.le.style.translate = pr.tr; });
  } else if (d.type === "marquee") {
    const moved = Math.hypot(d.p1.x - d.p0.x, d.p1.y - d.p0.y) * S.scale > 4;
    if (!moved) { if (d.hit) select([d.hit.sid], d.add); else if (!d.add) select([]); return; }
    const R = { l: Math.min(d.p0.x, d.p1.x), r: Math.max(d.p0.x, d.p1.x), t: Math.min(d.p0.y, d.p1.y), b: Math.max(d.p0.y, d.p1.y) };
    const hits = [];
    for (const el of S.m.list) {
      if (isLocked(el)) continue;
      const b = boxOf(el.sid); if (!b) continue;
      if (b.w * b.h >= 0.9 * S.info.width * S.info.height) continue;
      if (b.l >= R.l && b.r <= R.r && b.t >= R.t && b.b <= R.b) hits.push(el.sid);
    }
    // buang turunan bila induknya ikut terpilih
    const set = new Set(hits);
    const top = hits.filter((sid) => { let up = elOf(sid).parentSid; while (up) { if (set.has(up)) return false; up = elOf(up) && elOf(up).parentSid; } return true; });
    select(top, d.add);
  } else if (d.type === "rot") {
    if (!d.d) return drawOverlay();
    commitTransform(t("Putar"), [{ sid: d.sid, drot: d.d }]);
  } else if (d.type === "scale") {
    if (d.k === 1) return drawOverlay();
    commitTransform(t("Skala"), [{ sid: d.sid, k: d.k, dx: Math.round(d.dx * 100) / 100, dy: Math.round(d.dy * 100) / 100 }]);
  }
}

// ------------------------------------------------------------------ gambar
export function drawOverlay() {
  if (!ham || !S.info) return;
  const parts = [];
  const box = (b, cls) => { const [x, y] = scr(b.l, b.t); parts.push(`<div class="${cls}" style="left:${x}px;top:${y}px;width:${b.w * S.scale}px;height:${b.h * S.scale}px"></div>`); };
  if (hover && !S.sel.includes(hover) && !drag) { const b = boxOf(hover); if (b) box(b, "kotakHover"); }
  for (const sid of S.sel) { const b = boxOf(sid); if (b) box(b, "kotakSel" + (sid === S.sel[0] ? " utama" : "")); }
  if (S.sel.length === 1 && (!drag || drag.type === "scale" || drag.type === "rot")) {
    const el = elOf(S.sel[0]); const b = boxOf(S.sel[0]);
    if (el && b && !isLocked(el)) {
      const [l, tp] = scr(b.l, b.t), [r, bt] = scr(b.r, b.b), cx = (l + r) / 2;
      for (const [h, x, y] of [["nw", l, tp], ["ne", r, tp], ["sw", l, bt], ["se", r, bt]])
        parts.push(`<div class="pegangan" data-h="${h}" style="left:${x}px;top:${y}px;cursor:${h === "nw" || h === "se" ? "nwse" : "nesw"}-resize" title="${t("Skala (Alt: dari tengah)")}"></div>`);
      parts.push(`<div class="tangkaiPutar" style="left:${cx}px;top:${tp - 26}px;height:26px"></div>`);
      parts.push(`<div class="pegangan putar" data-h="rot" style="left:${cx}px;top:${tp - 28}px" title="${t("Putar (Shift: kelipatan 15°)")}"></div>`);
    }
  }
  if (drag && drag.guides) for (const g of drag.guides) {
    if (g.v != null) parts.push(`<div class="pandu v" style="left:${scr(g.v, 0)[0]}px"></div>`);
    if (g.h != null) parts.push(`<div class="pandu h" style="top:${scr(0, g.h)[1]}px"></div>`);
  }
  if (drag && drag.type === "marquee" && drag.p1) {
    const [x0, y0] = scr(Math.min(drag.p0.x, drag.p1.x), Math.min(drag.p0.y, drag.p1.y));
    parts.push(`<div class="marquee" style="left:${x0}px;top:${y0}px;width:${Math.abs(drag.p1.x - drag.p0.x) * S.scale}px;height:${Math.abs(drag.p1.y - drag.p0.y) * S.scale}px"></div>`);
  }
  if (drag && drag.info) { const [x, y] = scr(drag.infoAt.x, drag.infoAt.y); parts.push(`<div class="infoGeser" style="left:${x + 14}px;top:${y + 14}px">${drag.info}</div>`); }
  ham.innerHTML = parts.join("");
  drawGuides();
}
function drawGuides() {
  const g = cv.getContext("2d"), dpr = devicePixelRatio;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  if (!S.safe && !S.grid) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = S.info.width, H = S.info.height;
  const R = (x0, y0, w, h) => { const [a, b] = scr(x0, y0); g.strokeRect(a + 0.5, b + 0.5, w * S.scale, h * S.scale); };
  const L = (x0, y0, x1, y1) => { const [a, b] = scr(x0, y0), [c, d] = scr(x1, y1); g.beginPath(); g.moveTo(a + 0.5, b + 0.5); g.lineTo(c + 0.5, d + 0.5); g.stroke(); };
  if (S.grid) {
    g.strokeStyle = "rgba(124,196,255,0.16)"; g.lineWidth = 1;
    for (let i = 1; i < 10; i++) { L((W * i) / 10, 0, (W * i) / 10, H); L(0, (H * i) / 10, W, (H * i) / 10); }
    g.strokeStyle = "rgba(124,196,255,0.5)";
    for (const k of [1 / 3, 2 / 3]) { L(W * k, 0, W * k, H); L(0, H * k, W, H * k); }
    g.strokeStyle = "rgba(255,79,216,0.5)"; L(W / 2, H / 2 - 30, W / 2, H / 2 + 30); L(W / 2 - 30, H / 2, W / 2 + 30, H / 2);
  }
  if (S.safe) {
    g.font = "10px system-ui"; g.fillStyle = "rgba(255,209,102,0.85)";
    g.strokeStyle = "rgba(255,209,102,0.8)"; g.setLineDash([6, 4]); R(W * 0.035, H * 0.035, W * 0.93, H * 0.93);
    let [a, b] = scr(W * 0.035, H * 0.035); g.fillText(t("aman aksi 93%"), a + 4, b + 12);
    g.strokeStyle = "rgba(255,120,80,0.85)"; R(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
    [a, b] = scr(W * 0.05, H * 0.05); g.fillText(t("aman judul 90%"), a + 4, b + 24);
    g.setLineDash([]);
    if (H > W) { // zona antarmuka aplikasi sosial vertikal
      g.fillStyle = "rgba(255,79,109,0.12)";
      const box = (x0, y0, w, h) => { const [p, q] = scr(x0, y0); g.fillRect(p, q, w * S.scale, h * S.scale); };
      box(0, 0, W, H * 0.12); box(0, H * 0.78, W, H * 0.22); box(W * 0.86, H * 0.35, W * 0.14, H * 0.43);
      g.fillStyle = "rgba(255,150,160,0.9)"; [a, b] = scr(8, H * 0.78); g.fillText(t("zona UI sosial (keterangan, tombol)"), a + 4, b + 14);
    }
  }
}
