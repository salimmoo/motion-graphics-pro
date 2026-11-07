/**
 * MGP.peta \u2014 real geography for maps: decodes the compact Natural Earth data in lib/map-data/, projects it
 * (Mercator, Equal Earth, orthographic globe) and prepares plane-space geometry for MGP.routeMap or your own canvas.
 *
 * Data sets are classic scripts that push a JSON payload on MGP.petaData (load them before or after this file):
 *   map-data/world-50m.js           world 1:50m land, lakes, country borders, ~1100 populated places
 *   map-data/world-50m-countries.js    world 1:50m country polygons (for highlighting a country), optional
 *   map-data/southeast-asia-10m.js   1:10m tile 92..142 E, 13 S..22 N (Indonesia, Malaysia, Philippines, Indochina)
 *   map-data/europe-mediterranean-10m.js  1:10m tile 12 W..45 E, 28..60 N (Europe, Mediterranean, Black Sea)
 * A 10m tile replaces the 50m world inside its box when the map is zoomed in enough (detail "auto").
 * Source: Natural Earth (naturalearthdata.com), public domain. Encoding: see map-data/build-map.mjs.
 *
 * API
 *   MGP.peta.ada()                         true when the world set is loaded
 *   MGP.peta.set()                         loaded sets [{nama, skala, kotak}]
 *   MGP.peta.proyeksi(nama, {lon0, lat0})  {nama, f(lon,lat) -> [x, y, visible] (unit space, y up), garisLuar}
 *                                          nama: "mercator" | "equalEarth" (alias "equal-earth", "ee") | "ortho" (alias "globe", "bola")
 *   MGP.peta.siapkan(opsi)                 plane geometry, see below
 *   MGP.peta.kota(nama)                    {nama, nama_id, lon, lat, rank, pop, adm0} (searches NAME and NAME_ID) or null
 *   MGP.peta.negara(iso3 | nama)           {iso, nama, nama_id, label, cincin:[[lon,lat],...][]} or null
 *   MGP.peta.lib                           {decode, dp, clipRing, clipLine, ...}
 *
 * siapkan({ proj, tf, box, pxPerDeg, detail, tol, negara, kota, graticule })
 *   proj   object from proyeksi();  tf(u) -> [px, py] maps unit space to plane px
 *   box    [x0, y0, x1, y1] plane px rectangle to keep (geometry is clipped to it)
 *   detail "auto" (10m tiles when pxPerDeg >= 18) | "50m" | "10m";  tol  px simplification (0.35)
 * returns { darat: rings, pantai: lines, danau: rings, batas: lines, garis: graticule lines, luar: outline ring|null,
 *           kota: [{nama, nama_id, lon, lat, rank, pop, adm0, flag, p:[px,py]}], negara: {iso: rings}, tiles: [names] }
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const D2R = Math.PI / 180;
  const ABC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  const VAL = {}; for (let i = 0; i < 64; i++) VAL[ABC[i]] = i;

  /* ---------- decoding ---------- */
  function decode(s, q) {
    const nums = []; let z = 0, mul = 1;
    for (let i = 0; i < s.length; i++) { const v = VAL[s[i]]; z += (v & 31) * mul; if (v & 32) mul *= 32; else { nums.push(z % 2 ? -(z + 1) / 2 : z / 2); z = 0; mul = 1; } }
    const P = []; let x = 0, y = 0;
    for (let i = 0; i + 1 < nums.length; i += 2) { x += nums[i]; y += nums[i + 1]; P.push([x * q - 180, y * q - 90]); }
    return P;
  }
  const SETS = [];
  function muat(extra) {
    const list = (MGP.petaData || []).slice(); if (extra) list.push(extra);
    for (const d of list) {
      if (!d || SETS.some((s) => s.raw === d)) continue;
      SETS.push({ raw: d, nama: d.nama, skala: d.skala, kotak: d.kotak, prioritas: d.prioritas || 0, cache: {} });
    }
    return SETS.length;
  }
  const layer = (S, k) => {
    if (S.cache[k]) return S.cache[k];
    const L = (S.raw.lapis && S.raw.lapis[k]) || [];
    return (S.cache[k] = L.map((s) => { const P = decode(s, S.raw.q); return { P, bb: bbox(P) }; }));
  };
  const places = (S) => S.cache.kota || (S.cache.kota = (S.raw.kota || []).map((r) => ({ nama: r[0], nama_id: r[1] || r[0], lon: r[2], lat: r[3], rank: r[4], pop: r[5] * 1000, adm0: r[6], flag: r[7] })));

  /* ---------- geometry ---------- */
  function bbox(P) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of P) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; }
  const hit = (a, b) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
  const inside = (a, b) => a[0] >= b[0] && a[2] <= b[2] && a[1] >= b[1] && a[3] <= b[3];
  function dp(P, tol, closed) {
    const n = P.length; if (n < 3 || tol <= 0) return P;
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    if (closed) { let fi = 0, fd = -1; for (let i = 1; i < n; i++) { const d = (P[i][0] - P[0][0]) ** 2 + (P[i][1] - P[0][1]) ** 2; if (d > fd) { fd = d; fi = i; } } keep[fi] = 1; }
    const st = closed ? [] : [[0, n - 1]], t2 = tol * tol;
    if (closed) { for (let i = 1; i < n; i++) if (keep[i]) { st.push([0, i], [i, n - 1]); break; } }
    while (st.length) {
      const [a, b] = st.pop(); let mx = -1, mi = -1;
      const ax = P[a][0], ay = P[a][1], dx = P[b][0] - ax, dy = P[b][1] - ay, L = dx * dx + dy * dy;
      for (let i = a + 1; i < b; i++) { let u = L ? ((P[i][0] - ax) * dx + (P[i][1] - ay) * dy) / L : 0; u = u < 0 ? 0 : u > 1 ? 1 : u; const ex = P[i][0] - ax - u * dx, ey = P[i][1] - ay - u * dy, d = ex * ex + ey * ey; if (d > mx) { mx = d; mi = i; } }
      if (mx > t2) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(P[i]); return o;
  }
  function clipRing(R, b) {
    const [x0, y0, x1, y1] = b;
    const E = [[(p) => p[0] >= x0, (p, c) => [x0, p[1] + (c[1] - p[1]) * (x0 - p[0]) / (c[0] - p[0])]], [(p) => p[0] <= x1, (p, c) => [x1, p[1] + (c[1] - p[1]) * (x1 - p[0]) / (c[0] - p[0])]],
      [(p) => p[1] >= y0, (p, c) => [p[0] + (c[0] - p[0]) * (y0 - p[1]) / (c[1] - p[1]), y0]], [(p) => p[1] <= y1, (p, c) => [p[0] + (c[0] - p[0]) * (y1 - p[1]) / (c[1] - p[1]), y1]]];
    let out = R;
    for (const [ins, cut] of E) {
      const inp = out; out = []; const n = inp.length; if (!n) break;
      for (let i = 0; i < n; i++) { const c = inp[i], p = inp[(i + n - 1) % n], ci = ins(c), pi = ins(p); if (ci) { if (!pi) out.push(cut(p, c)); out.push(c); } else if (pi) out.push(cut(p, c)); }
    }
    return out;
  }
  function clipLine(L, b) {
    const [x0, y0, x1, y1] = b, parts = []; let cur = null;
    for (let i = 1; i < L.length; i++) {
      const a = L[i - 1], c = L[i], dx = c[0] - a[0], dy = c[1] - a[1]; let t0 = 0, t1 = 1, ok = true;
      const T = [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]];
      for (let k = 0; k < 4 && ok; k++) { const p = T[k][0], q = T[k][1]; if (p === 0) { if (q < 0) ok = false; continue; } const r = q / p; if (p < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else { if (r < t0) ok = false; else if (r < t1) t1 = r; } }
      if (!ok) { if (cur) { parts.push(cur); cur = null; } continue; }
      const A = t0 > 0 ? [a[0] + dx * t0, a[1] + dy * t0] : a, B = t1 < 1 ? [a[0] + dx * t1, a[1] + dy * t1] : c;
      if (!cur) cur = [A]; cur.push(B); if (t1 < 1) { parts.push(cur); cur = null; }
    }
    if (cur) parts.push(cur); return parts.filter((p) => p.length > 1);
  }
  const BIG = 1e4;
  const outsideBoxes = (b) => [[-BIG, -BIG, b[0], BIG], [b[2], -BIG, BIG, BIG], [b[0], -BIG, b[2], b[1]], [b[0], b[3], b[2], BIG]];
  function ringsOutside(F, b) { const o = []; for (const f of F) { if (!hit(f.bb, b)) { o.push(f.P); continue; } if (inside(f.bb, b)) continue; for (const q of outsideBoxes(b)) { const r = clipRing(f.P, q); if (r.length > 2) o.push(r); } } return o; }
  function linesOutside(L, b) { const o = []; for (const P of L) { const bb = bbox(P); if (!hit(bb, b)) { o.push(P); continue; } if (inside(bb, b)) continue; for (const q of outsideBoxes(b)) o.push(...clipLine(P, q)); } return o; }
  function densify(P, maxDeg, closed) {
    const o = []; const n = P.length;
    for (let i = 0; i < n; i++) { const a = P[i]; o.push(a); if (!closed && i === n - 1) break; const c = P[(i + 1) % n], d = Math.max(Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1])); if (d > maxDeg) { const k = Math.ceil(d / maxDeg); for (let j = 1; j < k; j++) o.push([a[0] + (c[0] - a[0]) * j / k, a[1] + (c[1] - a[1]) * j / k]); } }
    return o;
  }

  /* ---------- projections (unit space, y up) ---------- */
  const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, EM = Math.sqrt(3) / 2;
  function proyeksi(nama, o) {
    o = o || {}; const k = String(nama || "mercator").toLowerCase(), lon0 = +o.lon0 || 0, lat0 = +o.lat0 || 0;
    const wrap = (l) => { let d = l - lon0; while (d < -180) d += 360; while (d > 180) d -= 360; return d; };
    if (k === "ortho" || k === "orthographic" || k === "globe" || k === "bola") {
      const s0 = Math.sin(lat0 * D2R), c0 = Math.cos(lat0 * D2R);
      const f = (lon, lat) => { const l = (lon - lon0) * D2R, p = lat * D2R, cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l);
        const x = cp * Math.sin(l), y = c0 * sp - s0 * cp * cl, v = s0 * sp + c0 * cp * cl;
        if (v >= 0) return [x, y, true]; const r = Math.hypot(x, y) || 1; return [x / r, y / r, false]; };
      const ring = []; for (let i = 0; i < 180; i++) { const a = (i / 180) * Math.PI * 2; ring.push([Math.cos(a), Math.sin(a)]); }
      return { nama: "ortho", lon0, lat0, f, wrap: null, unitOutline: ring, flat: false };
    }
    if (k === "equalearth" || k === "equal-earth" || k === "ee" || k === "equal earth") {
      const f = (lon, lat) => { const l = (lon - lon0) * D2R, th = Math.asin(EM * Math.sin(lat * D2R)), t2 = th * th, t6 = t2 * t2 * t2;
        return [l * Math.cos(th) / (EM * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))), th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)), true]; };
      const ring = []; for (let la = -90; la <= 90; la += 2) ring.push(f(lon0 + 180, la)); for (let la = 90; la >= -90; la -= 2) ring.push(f(lon0 - 180, la));
      return { nama: "equalEarth", lon0, lat0, f, wrap, unitOutline: ring.map((p) => [p[0], p[1]]), flat: true };
    }
    const LIM = 85;
    const f = (lon, lat) => { const p = Math.max(-LIM, Math.min(LIM, lat)) * D2R; return [(lon - lon0) * D2R, Math.log(Math.tan(Math.PI / 4 + p / 2)), true]; };
    return { nama: "mercator", lon0, lat0, f, wrap, unitOutline: null, flat: true };
  }

  /* ---------- prepare plane geometry ---------- */
  // longitude window relative to lon0: shifted copies clipped to [-180, 180] (flat projections)
  function wrapCopies(P, lon0, closed) {
    const R = P.map((p) => [p[0] - lon0, p[1]]), bb = bbox(R), out = [];
    for (const s of [-360, 0, 360]) {
      if (bb[2] + s < -180 || bb[0] + s > 180) continue;
      const Q = s ? R.map((p) => [p[0] + s, p[1]]) : R;
      if (bb[0] + s >= -180 && bb[2] + s <= 180) { out.push(Q); continue; }
      const W = [-180, -BIG, 180, BIG];
      if (closed) { const r = clipRing(Q, W); if (r.length > 2) out.push(r); } else out.push(...clipLine(Q, W));
    }
    return out;
  }
  function siapkan(o) {
    muat();
    const pr = o.proj || proyeksi("mercator"), tf = o.tf, box = o.box, tol = o.tol != null ? o.tol : 0.35;
    const world = SETS.filter((s) => !s.prioritas && s.raw.lapis && s.raw.lapis.darat)[0];
    const res = { darat: [], pantai: [], danau: [], batas: [], garis: [], luar: null, kota: [], negara: {}, tiles: [] };
    if (!world) return res;
    // unit -> px, with outline for globe / equal earth
    const toPx = (lon, lat) => { const u = pr.f(lon, lat); const q = tf([u[0], u[1]]); q.v = u[2]; return q; };
    if (pr.unitOutline) res.luar = pr.unitOutline.map((u) => tf(u));
    const detail = o.detail || "auto";
    const want10 = detail === "10m" || (detail === "auto" && (o.pxPerDeg || 0) >= 18);
    const tiles = !want10 ? [] : SETS.filter((s) => s.prioritas >= 1).filter((s) => {
      const k = s.kotak, edge = densify([[k[0], k[1]], [k[2], k[1]], [k[2], k[3]], [k[0], k[3]]], 2, true);
      const pts = edge.map((p) => projectPt(p)).filter(Boolean); if (!pts.length) return false;
      return hit(bbox(pts), box);
    });
    res.tiles = tiles.map((t) => t.nama);
    function projectPt(p) { const lon = pr.flat ? pr.wrap(p[0]) + pr.lon0 : p[0]; const u = pr.f(lon, p[1]); if (!u[2]) return null; return tf([u[0], u[1]]); }
    // gather lon/lat features
    const landR = layer(world, "darat");
    let darat = landR.map((f) => f.P), pantai = landR.map((f) => f.P.concat([f.P[0]]));
    let danau = layer(world, "danau").map((f) => f.P), batas = layer(world, "batas").map((f) => f.P);
    for (const t of tiles) {
      const b = t.kotak;
      darat = ringsOutside(darat.map((P) => ({ P, bb: bbox(P) })), b).concat(layer(t, "darat").map((f) => f.P));
      pantai = linesOutside(pantai, b).concat(layer(t, "pantai").map((f) => f.P));
      danau = ringsOutside(danau.map((P) => ({ P, bb: bbox(P) })), b).concat(layer(t, "danau").map((f) => f.P));
      batas = linesOutside(batas, b).concat(layer(t, "batas").map((f) => f.P));
    }
    const pad = [box[0], box[1], box[2], box[3]];
    function projRing(P) {
      const srcs = pr.flat ? wrapCopies(P, pr.lon0, true) : [P], out = [];
      for (const S of srcs) {
        const D = densify(S, 1, true); let vis = 0; const Q = D.map((p) => { const u = pr.f(pr.flat ? p[0] + pr.lon0 : p[0], p[1]); if (u[2]) vis++; return tf([u[0], u[1]]); });
        if (!vis) continue;
        const qb = bbox(Q); if (!hit(qb, pad)) continue;
        const C = inside(qb, pad) ? Q : clipRing(Q, pad); if (C.length < 3) continue;
        const s = dp(C, tol, true); if (s.length > 2) out.push(s);
      }
      return out;
    }
    function projLine(P) {
      const srcs = pr.flat ? wrapCopies(P, pr.lon0, false) : [P], out = [];
      for (const S of srcs) {
        const D = densify(S, 1, false); let cur = [];
        const flush = () => { if (cur.length > 1) { const qb = bbox(cur); if (hit(qb, pad)) for (const c of inside(qb, pad) ? [cur] : clipLine(cur, pad)) { const s = dp(c, tol, false); if (s.length > 1) out.push(s); } } cur = []; };
        for (const p of D) { const u = pr.f(pr.flat ? p[0] + pr.lon0 : p[0], p[1]); if (!u[2]) { flush(); continue; } cur.push(tf([u[0], u[1]])); }
        flush();
      }
      return out;
    }
    res.darat = darat.flatMap(projRing); res.pantai = pantai.flatMap(projLine);
    res.danau = danau.flatMap(projRing); res.batas = batas.flatMap(projLine);
    if (o.graticule !== false) {
      const st = o.graticuleStep || 15, G = [];
      for (let lo = -180; lo < 180; lo += st) { const L = []; for (let la = -85; la <= 85; la += 2.5) L.push([lo, la]); G.push(L); }
      for (let la = -75; la <= 75; la += st) { const L = []; for (let lo = -180; lo <= 180; lo += 2.5) L.push([lo, la]); G.push(L); }
      res.garis = G.flatMap(projLine);
    }
    // places: world outside used tiles + tile places inside
    let K = places(world).filter((c) => !tiles.some((t) => c.lon >= t.kotak[0] && c.lon <= t.kotak[2] && c.lat >= t.kotak[1] && c.lat <= t.kotak[3]));
    for (const t of tiles) K = K.concat(places(t));
    for (const c of K) { const u = pr.f(pr.flat ? pr.wrap(c.lon) + pr.lon0 : c.lon, c.lat); if (!u[2]) continue; const p = tf([u[0], u[1]]); if (p[0] < box[0] || p[0] > box[2] || p[1] < box[1] || p[1] > box[3]) continue; res.kota.push(Object.assign({}, c, { p })); }
    res.kota.sort((a, b) => a.rank - b.rank || b.pop - a.pop);
    // countries to highlight
    if (o.negara && o.negara.length) for (const id of o.negara) { const n = negara(id); if (n) res.negara[n.iso] = n.cincin.flatMap(projRing); }
    return res;
  }

  /* ---------- lookups ---------- */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  function kota(nama) {
    muat(); const k = norm(nama); let best = null;
    for (const S of SETS) for (const c of places(S)) if (norm(c.nama) === k || norm(c.nama_id) === k) { if (!best || c.rank < best.rank || (c.rank === best.rank && c.pop > best.pop)) best = c; }
    return best ? Object.assign({}, best) : null;
  }
  function negara(id) {
    muat(); const k = norm(id);
    for (const S of SETS) for (const n of S.raw.negara || []) if (norm(n.iso) === k || norm(n.nama) === k || norm(n.nama_id) === k) {
      if (!n._c) n._c = n.r.map((s) => decode(s, S.raw.q));
      return { iso: n.iso, nama: n.nama, nama_id: n.nama_id || n.nama, label: n.label, cincin: n._c };
    }
    return null;
  }

  MGP.map = MGP.peta = {
    // English names (v2.4); the Indonesian names stay as aliases
    load: muat, prepare: siapkan, projection: proyeksi, cities: kota, countries: negara,
    has: () => (muat(), SETS.some((s) => !s.prioritas && s.raw.lapis && s.raw.lapis.darat)),
    sets: () => (muat(), SETS.map((s) => ({ name: s.nama, scale: s.skala, box: s.kotak, nama: s.nama, skala: s.skala, kotak: s.kotak }))),
    muat, siapkan, proyeksi, kota, negara,
    ada: () => (muat(), SETS.some((s) => !s.prioritas && s.raw.lapis && s.raw.lapis.darat)),
    set: () => (muat(), SETS.map((s) => ({ nama: s.nama, skala: s.skala, kotak: s.kotak }))),
    lib: { decode, dp, clipRing, clipLine, densify, bbox, wrapCopies, ringsOutside, linesOutside },
  };
  muat();
})(typeof globalThis !== "undefined" ? globalThis : this);
