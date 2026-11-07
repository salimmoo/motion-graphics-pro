#!/usr/bin/env node
/*
 * bangun-peta.mjs - builds the compact map data in lib/map-data/ from Natural Earth GeoJSON (public domain).
 *
 *   node lib/map-data/bangun-peta.mjs <folder-with-natural-earth-geojson>
 *
 * Expected files in the folder (from github.com/nvkelso/natural-earth-vector/tree/master/geojson):
 *   ne_50m_land, ne_50m_lakes, ne_50m_admin_0_boundary_lines_land, ne_50m_admin_0_countries,
 *   ne_10m_land, ne_10m_minor_islands, ne_10m_coastline, ne_10m_lakes, ne_10m_admin_0_boundary_lines_land,
 *   ne_10m_populated_places          (all *.geojson)
 *
 * Pipeline (all our own code): Douglas-Peucker simplification in degrees -> (tiles) clip to the tile box
 * (Sutherland-Hodgman for rings, Liang-Barsky for lines) -> quantise to an integer grid -> delta + zigzag
 * varint encoding into a 64-letter URL-safe alphabet (5 data bits + 1 continuation bit per letter).
 * Output: one classic script per data set that registers its JSON payload on MGP.petaData, so it loads
 * from file:// with a plain <script> tag. The payload inside MGP_PETA(...) is plain JSON.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = process.argv[2];
if (!SRC) { console.error("pakai: node bangun-peta.mjs <folder geojson Natural Earth>"); process.exit(2); }
const OUT = path.dirname(fileURLToPath(import.meta.url));
const rd = (n) => JSON.parse(fs.readFileSync(path.join(SRC, n + ".geojson"), "utf8"));

/* ---------- geometry ---------- */
function dpLine(P, tol) {
  const n = P.length; if (n < 3) return P.slice();
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const st = [[0, n - 1]], t2 = tol * tol;
  while (st.length) {
    const [a, b] = st.pop(); let mx = -1, mi = -1;
    const ax = P[a][0], ay = P[a][1], dx = P[b][0] - ax, dy = P[b][1] - ay, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      let u = L ? ((P[i][0] - ax) * dx + (P[i][1] - ay) * dy) / L : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const ex = P[i][0] - ax - u * dx, ey = P[i][1] - ay - u * dy, d = ex * ex + ey * ey;
      if (d > mx) { mx = d; mi = i; }
    }
    if (mx > t2) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return P.filter((_, i) => keep[i]);
}
function dpRing(R, tol) {
  let r = R.slice(); if (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop();
  if (r.length < 4) return r;
  // split at the vertex farthest from vertex 0, simplify both halves
  let fi = 0, fd = -1; for (let i = 1; i < r.length; i++) { const d = (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2; if (d > fd) { fd = d; fi = i; } }
  const a = dpLine(r.slice(0, fi + 1), tol), b = dpLine(r.slice(fi).concat([r[0]]), tol);
  return a.concat(b.slice(1, -1));
}
const area = (P) => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return s / 2; };
function clipRing(R, [x0, y0, x1, y1]) {
  const edges = [[(p) => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]]];
  let out = R;
  for (const [ins, cut] of edges) {
    const inp = out; out = []; if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length], ci = ins(cur), pi = ins(prev);
      if (ci) { if (!pi) out.push(cut(prev, cur)); out.push(cur); } else if (pi) out.push(cut(prev, cur));
    }
  }
  return out;
}
function clipLine(L, [x0, y0, x1, y1]) {
  const parts = []; let cur = null;
  for (let i = 1; i < L.length; i++) {
    const a = L[i - 1], b = L[i], dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) { if (cur) { parts.push(cur); cur = null; } continue; }
    const A = [a[0] + dx * t0, a[1] + dy * t0], B = [a[0] + dx * t1, a[1] + dy * t1];
    if (!cur) cur = [A]; cur.push(B);
    if (t1 < 1) { parts.push(cur); cur = null; }
  }
  if (cur) parts.push(cur);
  return parts.filter((p) => p.length > 1);
}

/* ---------- encoding ---------- */
const ABC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
function enc(nums) {
  let s = "";
  for (const n of nums) { let z = n < 0 ? -2 * n - 1 : 2 * n; do { const d = z & 31; z = Math.floor(z / 32); s += ABC[d | (z ? 32 : 0)]; } while (z); }
  return s;
}
function encPts(P, q, closed) {
  const Q = []; let px = null, py = null;
  for (const p of P) { const x = Math.round((p[0] + 180) / q), y = Math.round((p[1] + 90) / q); if (x === px && y === py) continue; Q.push([x, y]); px = x; py = y; }
  if (closed && Q.length > 1 && Q[0][0] === Q[Q.length - 1][0] && Q[0][1] === Q[Q.length - 1][1]) Q.pop();
  if (Q.length < (closed ? 3 : 2)) return null;
  const nums = [Q[0][0], Q[0][1]]; for (let i = 1; i < Q.length; i++) nums.push(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]);
  return { s: enc(nums), n: Q.length };
}

/* ---------- feature helpers ---------- */
const rings = (fc) => fc.features.flatMap((f) => { const g = f.geometry; if (!g) return []; return g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []; });
const polys = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const lines = (fc) => fc.features.flatMap((f) => { const g = f.geometry; if (!g) return []; return g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []; });

function layerRings(R, tol, q, box, minArea) {
  const out = []; let n = 0;
  for (let r of R) {
    r = dpRing(r, tol);
    if (box) { const bb = bboxOf(r); if (bb[2] < box[0] || bb[0] > box[2] || bb[3] < box[1] || bb[1] > box[3]) continue; r = clipRing(r, box); }
    if (r.length < 3 || Math.abs(area(r)) < minArea) continue;
    const e = encPts(r, q, true); if (e) { out.push(e.s); n += e.n; }
  }
  return { data: out, pts: n };
}
function layerLines(L, tol, q, box) {
  const out = []; let n = 0;
  for (let l of L) {
    l = dpLine(l, tol);
    const parts = box ? clipLine(l, box) : [l];
    for (const p of parts) { const e = encPts(p, q, false); if (e) { out.push(e.s); n += e.n; } }
  }
  return { data: out, pts: n };
}
const bboxOf = (P) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of P) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

function places(fc, filter) {
  return fc.features.filter((f) => filter(f.properties, f.geometry.coordinates)).map((f) => {
    const p = f.properties, [lon, lat] = f.geometry.coordinates;
    const flag = (/capital/i.test(p.FEATURECLA) || p.ADM0CAP ? 1 : 0) | (/Admin-1 capital/i.test(p.FEATURECLA) ? 2 : 0);
    return [p.NAME, p.NAME_ID && p.NAME_ID !== p.NAME ? p.NAME_ID : "", +lon.toFixed(3), +lat.toFixed(3), p.SCALERANK, Math.round((p.POP_MAX || 0) / 1000), p.ADM0_A3 || "", flag];
  }).sort((a, b) => a[4] - b[4] || b[5] - a[5]);
}

// JS files must stay ASCII: escape non-ASCII characters of names
const asciiJSON = (o) => JSON.stringify(o).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
function write(file, payload) {
  const head = `/* MGP peta-data: ${payload.nama}. Sumber: Natural Earth (naturalearthdata.com), domain publik.\n   Dibangun oleh lib/map-data/bangun-peta.mjs. Muat setelah atau sebelum lib/map.js; isi MGP_PETA(...) adalah JSON murni. */\n`;
  const js = head + `(function(r){var M=r.MGP=r.MGP||{};(M.petaData=M.petaData||[]).push(\n${asciiJSON(payload)}\n);if(M.peta&&M.peta.muat)M.peta.muat();})(typeof globalThis!=="undefined"?globalThis:this);\n`;
  fs.writeFileSync(path.join(OUT, file), js);
  const st = { file, bytes: Buffer.byteLength(js) };
  for (const [k, v] of Object.entries(payload.lapis || {})) st[k] = Array.isArray(v) ? v.length : v;
  console.log(JSON.stringify(st));
}

/* ---------- world 50m ---------- */
const PL = rd("ne_10m_populated_places");
{
  const q = 0.005, tol = 0.01;
  const land = layerRings(rings(rd("ne_50m_land")), tol, q, null, 0.0004);
  const lakes = layerRings(rings(rd("ne_50m_lakes")), tol, q, null, 0.002);
  const borders = layerLines(lines(rd("ne_50m_admin_0_boundary_lines_land")), tol, q, null);
  write("dunia-50m.js", { v: 1, nama: "dunia-50m", skala: "1:50m", q, kotak: [-180, -90, 180, 90], prioritas: 0,
    lapis: { darat: land.data, danau: lakes.data, batas: borders.data },
    kota: places(PL, (p) => p.SCALERANK <= 5),
    kolomKota: ["nama", "nama_id", "lon", "lat", "rank", "pop_ribu", "adm0", "flag(1=ibukota negara,2=ibukota prov)"] });
  console.log("  titik: darat", land.pts, "danau", lakes.pts, "batas", borders.pts);
}
/* ---------- world 50m countries (optional, for highlighting one country) ---------- */
{
  const q = 0.01, tol = 0.03, C = rd("ne_50m_admin_0_countries"), negara = [];
  let n = 0;
  for (const f of C.features) {
    const p = f.properties, R = [];
    for (const poly of polys(f.geometry)) for (const r of poly) { const s = dpRing(r, tol); if (s.length < 3 || Math.abs(area(s)) < 0.001) continue; const e = encPts(s, q, true); if (e) { R.push(e.s); n += e.n; } }
    if (R.length) negara.push({ iso: p.ADM0_A3, nama: p.NAME, nama_id: p.NAME_ID && p.NAME_ID !== p.NAME ? p.NAME_ID : "", label: [+(+p.LABEL_X).toFixed(2), +(+p.LABEL_Y).toFixed(2)], r: R });
  }
  write("dunia-50m-negara.js", { v: 1, nama: "dunia-50m-negara", skala: "1:50m", q, kotak: [-180, -90, 180, 90], negara, lapis: { negara: negara.length } });
  console.log("  titik negara", n);
}
/* ---------- regional 10m tiles ---------- */
const L10 = rings(rd("ne_10m_land")).concat(rings(rd("ne_10m_minor_islands")));
const C10 = lines(rd("ne_10m_coastline")).concat(rings(rd("ne_10m_minor_islands")));
const K10 = rings(rd("ne_10m_lakes")), B10 = lines(rd("ne_10m_admin_0_boundary_lines_land"));
for (const [file, nama, box] of [["asia-tenggara-10m.js", "asia-tenggara-10m", [92, -13, 142, 22]], ["eropa-mediterania-10m.js", "eropa-mediterania-10m", [-12, 28, 45, 60]]]) {
  const q = 0.001, tol = 0.0025;
  const land = layerRings(L10, tol, q, box, 0.00002), coast = layerLines(C10, tol, q, box);
  const lakes = layerRings(K10, tol, q, box, 0.0005), borders = layerLines(B10, tol, q, box);
  write(file, { v: 1, nama, skala: "1:10m", q, kotak: box, prioritas: 1,
    lapis: { darat: land.data, pantai: coast.data, danau: lakes.data, batas: borders.data },
    kota: places(PL, (p, c) => p.SCALERANK <= 10 && c[0] >= box[0] && c[0] <= box[2] && c[1] >= box[1] && c[1] <= box[3]) });
  console.log("  titik: darat", land.pts, "pantai", coast.pts, "danau", lakes.pts, "batas", borders.pts);
}
