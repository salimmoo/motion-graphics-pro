/**
 * MGP.routeMap \u2014 animated route map in three looks: paper cardboard ("karton"), tilted 3D diorama ("3d")
 * and a clean atlas look ("asli"). The route grows from its tip, pauses at every stop, a vehicle rides the
 * tip facing the route heading (max turn rate), stop pins light up and paper labels pop in, the camera follows.
 *
 * Source: website guide/js/demos-plus.js  Demos.add("peta")  (Natural Earth karton / 3D / OpenStreetMap),
 * plus its helpers (noise/fibre textures, Catmull-Rom route, heading table, timeline hold \u2192 leg \u2192 stop \u2192 leg \u2192 stop).
 * Real coastlines come from MGP.peta (Natural Earth, public domain) when its data files are loaded.
 * Differences: no network. Otherwise land is generated procedurally from a seed (value-noise field, sea corridor carved
 * along the route, a coast placed at every stop, marching squares \u2192 smooth polygons) or passed in as polygons
 * (`land`, e.g. pre-projected Natural Earth rings). The "asli" look is an offline atlas style; pass `tiles`
 * (an image/canvas covering the plane) to put a real basemap you are allowed to use under the route.
 * The camera follow is a closed-form exponential lag (sampled kernel), so any frame is a pure function of t.
 *
 * Options (defaults):
 *   style       "karton"      "karton" | "3d" | "asli"
 *   route       Java Sea demo [[lng,lat],...] waypoints (or plane px when coords:"map")
 *   coords      "lonlat"      "lonlat" (Mercator fitted into `fitBox`) | "map" (plane px)
 *   stops       3 demo ports  [{i: waypoint index, name, sub, side:"ne"|"nw"|"se"|"sw"}]; legs are split at stops
 *   plane       [1600,1000]   map plane size (px); fitBox [[230,300],[1370,700]] where a lonlat route is fitted
 *   land        null          polygons [[[x,y],...],...] in route coords; null = procedural
 *   landGen     {seed:5, amount:.5, scale:330, rough:.35, corridor:44, cell:10, port:64}
 *   borders     []            polylines drawn dashed on land (route coords)
 *   tiles       null          image/canvas drawn as the base map (covers the plane) instead of sea+land
 *   -- real geography (needs lib/map.js + lib/map-data/world-50m.js; lonlat routes only) --
 *   darat       null          null/"nyata" = Natural Earth land when loaded | "acak" = procedural (also when landGen/land/tiles given)
 *   proyeksi    "mercator"    "mercator" | "equalEarth" | "ortho" (globe);  pusat [lon,lat] projection centre (route centre)
 *   fit         "rute"        "rute" fits the route into fitBox | "dunia" fits the whole world / globe disk
 *   detail      "auto"        "auto" | "50m" | "10m" (10m tiles: asia-tenggara, eropa-mediterania)
 *   garisPantai true, danau true, batasNegara null (= only "asli"), graticule false ("asli" always), graticuleStep auto
 *   negara      null          ["IDN", ...] highlight countries (needs map-data/world-50m-countries.js)
 *   kota        false         true | n | ["Ambon", ...] Natural Earth city labels; kotaMaks 10, kotaSize 12, bahasa "id" | "en"
 *   stops[k].kota             a Natural Earth place name instead of `p`/name (nearest waypoint when `i` is missing)
 *   palette     {sea:"#86AFC2", seaShadow:"#6F95A8", land0:"#F1E4C6", land1:"#D9C39A", rim:"rgba(252,246,232,.95)",
 *                border:"rgba(120,92,56,.55)", side:"#9C7A4E", sideLine:"#7E5F3A", bg3d:"#7FA8BA",
 *                atlasSea:"#AAD3DF", atlasLand:"#F2EFE9", atlasGreen:"#CDEBB0",
 *                route:"#B23A32", routeRim:"#FBF6EA", pin:"#1C2B45", pinDim:"rgba(28,43,69,.4)", halo:"rgba(242,215,150,.9)",
 *                card:"#FBF6EA", cardShadow:"#E3B04B", ink:"#141414", inkSub:"#6b5a3e", chevron:"#f2d796",
 *                hull:"#3E6FA8", hullDark:"#2B4F7E", sail:"#FBF6EA"}
 *   vehicle     "boat"        "boat" | "chevron" | "dot" | "plane" | "none" | (ctx, {heading, flip, scale, t}) => void
 *   vehicleImage null         image drawn instead of the code boat (72 px wide, flips when heading left)
 *   chevron     true          gold heading chevron under the vehicle
 *   pin         "dot"         "dot" | "pin" (teardrop)
 *   hold .6, legDur [3.4,3.6] (number or per leg), stopHold 1, endHold 1.8, firstPop .25   (seconds)
 *   ease        "smooth"      per-leg easing name from MGP.core.ease or "smooth" (smoothstep)
 *   maxTurn     120           deg/s heading turn limit
 *   fps         12            stepped time ("on twos"); 0 = smooth
 *   follow      true          camera follows the tip (karton, 3d); followLag .28 s
 *   zoom        null          base zoom (default 1.12 karton, 1.05 3d, fit for asli); zoomKeys [[t,k],...] multiplier
 *   tilt 52, tiltWobble 2, spin -4, spinWobble 5, perspective 1000   (3d camera)
 *   fog         true          3d sky fog
 *   font        system sans   label font family; subFont "Georgia, serif"
 *   labelSize   17            label name size (plane px)
 *   labels      false         debug HUD (heading, t, reached stops)
 *
 * Methods: api.create(el, opts) \u2192 inst {draw(t), seek(t), timeline(), duration, ready}; api.render(ctx, t, opts).
 *   api.lib = { buildLand(field, opts), marching(grid...), fibre(seed), routeState(S, t), noise2(x,y,seed), fbm }
 *
 * Example:
 *   const m = MGP.routeMap.create("#stage", { style: "3d", width: 1280, height: 720 });
 *   MGP.core.expose(m);
 *   // custom route in plane px:
 *   MGP.routeMap.create(el, { coords: "map", route: [[200,700],[600,500],[1000,560],[1400,300]],
 *     stops: [{ i: 0, name: "Gudang" }, { i: 3, name: "Pelabuhan" }], legDur: 4 });
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const D2R = Math.PI / 180;

  /* ---------- demo data (approximate harbour positions, rounded to 0.01 deg) ---------- */
  const DEMO_ROUTE = [[106.88, -6.10], [106.98, -5.93], [107.45, -5.76], [108.35, -6.0], [109.3, -6.6], [110.25, -6.55], [110.78, -6.2], [111.45, -6.45], [112.2, -6.66], [112.64, -6.78], [112.71, -6.95], [112.72, -7.1], [112.73, -7.20],
    [112.72, -7.1], [112.73, -6.93], [113.05, -6.72], [113.9, -6.62], [115.0, -6.52], [116.4, -6.1], [117.6, -5.6], [118.7, -5.27], [119.2, -5.14], [119.41, -5.12]];
  const DEMO_STOPS = [{ i: 0, name: "Tanjung Priok", sub: "Jakarta" }, { i: 12, name: "Tanjung Perak", sub: "Surabaya" }, { i: 22, name: "Makassar", sub: "Sulawesi Selatan" }];

  /* ---------- noise / textures ---------- */
  const noise2 = (x, y, seed) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (i, j) => C.hash(i * 157.31 + j * 311.7 + seed * 71.13);
    const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
    return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
  };
  const fbm = (x, y, seed, oct = 4, rough = 0.5) => { let s = 0, a = 1, n = 0, f = 1; for (let o = 0; o < oct; o++) { s += noise2(x * f, y * f, seed + o * 17) * a; n += a; a *= rough; f *= 2.03; } return s / n; };
  const FIB = {};
  function fibre(seed = 11, n = 256, lo = 206, hi = 255, fib = 700) {
    const k = seed + ":" + n; if (FIB[k]) return FIB[k];
    const c = C.offscreen(n, n), g = c.getContext("2d"), id = g.createImageData(n, n), r = C.rng(seed);
    for (let p = 0; p < id.data.length; p += 4) { const v = lo + r() * (hi - lo); id.data[p] = id.data[p + 1] = id.data[p + 2] = v; id.data[p + 3] = 255; }
    g.putImageData(id, 0, 0);
    g.globalAlpha = 0.2; g.strokeStyle = "#7d6c52"; g.lineWidth = 0.7;
    for (let i = 0; i < fib; i++) { const x = r() * n, y = r() * n, a = r() * Math.PI, l = 3 + r() * 10; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    return (FIB[k] = c);
  }

  /* ---------- geometry helpers ---------- */
  function segDist(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    let u = L ? ((px - a[0]) * dx + (py - a[1]) * dy) / L : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
    return Math.hypot(px - a[0] - u * dx, py - a[1] - u * dy);
  }
  const area = (P) => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return s / 2; };
  const chaikin = (P) => { const o = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } return o; };

  /** Marching squares on a value grid (land where v > 0). Returns closed rings in plane px. */
  function marching(V, nx, ny, x0, y0, cell) {
    const pts = {}, segs = [];
    const val = (i, j) => V[j * nx + i];
    const P = (key, ax, ay, bx, by, va, vb) => { if (!pts[key]) { const k = va / (va - vb); pts[key] = [x0 + (ax + (bx - ax) * k) * cell, y0 + (ay + (by - ay) * k) * cell]; } return key; };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = val(i, j), b = val(i + 1, j), c = val(i + 1, j + 1), d = val(i, j + 1);
      const A = a > 0, B = b > 0, Cc = c > 0, D = d > 0;
      if (A === B && B === Cc && Cc === D) continue;
      const top = A !== B ? P("h" + i + "," + j, i, j, i + 1, j, a, b) : null;
      const bot = D !== Cc ? P("h" + i + "," + (j + 1), i, j + 1, i + 1, j + 1, d, c) : null;
      const lef = A !== D ? P("v" + i + "," + j, i, j, i, j + 1, a, d) : null;
      const rig = B !== Cc ? P("v" + (i + 1) + "," + j, i + 1, j, i + 1, j + 1, b, c) : null;
      const e = [top, rig, bot, lef].filter(Boolean);
      if (e.length === 2) segs.push(e);
      else if (e.length === 4) { const m = (a + b + c + d) / 4 > 0; if (m === A) { segs.push([top, rig], [bot, lef]); } else { segs.push([lef, top], [rig, bot]); } }
    }
    const adj = {}; segs.forEach((s, k) => { (adj[s[0]] = adj[s[0]] || []).push(k); (adj[s[1]] = adj[s[1]] || []).push(k); });
    const used = new Uint8Array(segs.length), rings = [];
    for (let k = 0; k < segs.length; k++) {
      if (used[k]) continue; used[k] = 1;
      const start = segs[k][0], ring = [start]; let cur = segs[k][1], guard = 0;
      while (cur !== start && guard++ < 1e6) {
        ring.push(cur); const nb = (adj[cur] || []).find((q) => !used[q]); if (nb == null) break;
        used[nb] = 1; cur = segs[nb][0] === cur ? segs[nb][1] : segs[nb][0];
      }
      if (ring.length > 3) rings.push(ring.map((key) => pts[key]));
    }
    return rings;
  }

  /** Procedural land: noise field, sea corridor along the route, coast at every stop. */
  function buildLand(S) {
    const o = S.opts, g = Object.assign({ seed: 5, amount: 0.5, scale: 330, rough: 0.35, corridor: 44, cell: 10, port: 80, smooth: 1, minArea: 60, margin: 560 }, o.landGen || {});
    const [PW, PH] = S.plane, cell = g.cell, M = g.margin;
    // the field extends `margin` px beyond the plane so no straight cut edge is visible in the tilted 3d view
    const x0 = -M, y0 = -M, nx = Math.ceil((PW + 2 * M) / cell) + 1, ny = Math.ceil((PH + 2 * M) / cell) + 1;
    const route = S.dense, stops = S.stopPts;
    const base = (x, y) => fbm(x / g.scale, y / g.scale, g.seed, 5, 0.5 + g.rough * 0.3) * 1.6 + (g.amount - 0.5) * 1.2;
    // each port gets a ragged headland on the side of the route that is already more "land"; the port sits on its coast
    const discs = stops.map((p, k) => {
      const ang = S.tanAt(S.stopDist[k]), n = [-Math.sin(ang), Math.cos(ang)], R = g.port;
      const s = base(p[0] + n[0] * R, p[1] + n[1] * R) >= base(p[0] - n[0] * R, p[1] - n[1] * R) ? 1 : -1;
      return [p[0] + n[0] * R * s, p[1] + n[1] * R * s, R, p];
    });
    const rb = bbox(route);
    const V = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * cell, y = y0 + j * cell;
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) { V[j * nx + i] = -1; continue; }
      let f = typeof o.landFn === "function" ? o.landFn(x, y) : base(x, y);
      if (x > rb[0] - 3 * g.corridor && x < rb[2] + 3 * g.corridor && y > rb[1] - 3 * g.corridor && y < rb[3] + 3 * g.corridor) {
        let d = 1e9;
        for (let k = 1; k < route.length; k++) { const a = route[k - 1], b = route[k]; if (Math.min(a[0], b[0]) - x > d || x - Math.max(a[0], b[0]) > d || Math.min(a[1], b[1]) - y > d || y - Math.max(a[1], b[1]) > d) continue; const q = segDist(x, y, a, b); if (q < d) d = q; }
        f = Math.min(f, ((d - g.corridor) / g.corridor) * 0.8);
      }
      discs.forEach(([cx, cy, R, p]) => {
        const dc = Math.hypot(x - cx, y - cy); if (dc > R * 2.2) return;
        const w = C.clamp(Math.hypot(x - p[0], y - p[1]) / 50);
        f = Math.max(f, (R - dc + fbm(x / 60, y / 60, g.seed + 9, 3) * R * 0.9 * w) / R * 0.9);
      });
      V[j * nx + i] = f === 0 ? -1e-4 : f;
    }
    let rings = marching(V, nx, ny, x0, y0, cell).filter((r) => Math.abs(area(r)) > g.minArea);
    for (let s = 0; s < g.smooth; s++) rings = rings.map(chaikin);
    return rings;
  }

  /** City labels from Natural Earth places: explicit names, or the largest places in view, decluttered. */
  function pickCities(S, places) {
    const o = S.opts; if (!o.kota) return [];
    const K = S.lineK || 1, fs = o.kotaSize * K, id = o.bahasa !== "en", out = [], boxes = [];
    const nm = (c) => (id ? c.nama_id || c.nama : c.nama);
    S.stopPts.forEach((p) => boxes.push([p[0] - 30 * K, p[1] - 70 * K, p[0] + 190 * K, p[1] + 30 * K]));
    let list;
    if (Array.isArray(o.kota)) list = o.kota.map((n) => { const k = MGP.peta.kota(n); if (!k) return null; const u = S.pr.f(S.pr.flat ? S.pr.lon0 + (((k.lon - S.pr.lon0 + 540) % 360) - 180) : k.lon, k.lat); return u[2] ? Object.assign(k, { p: S.tf(u) }) : null; }).filter(Boolean);
    else list = places.filter((c) => c.p[0] > 20 && c.p[0] < S.plane[0] - 20 && c.p[1] > 20 && c.p[1] < S.plane[1] - 20);
    const maks = Array.isArray(o.kota) ? 1e9 : typeof o.kota === "number" ? o.kota : o.kotaMaks;
    for (const c of list) {
      if (out.length >= maks) break;
      const w = nm(c).length * fs * 0.6 + 12 * K, b = [c.p[0] - 5 * K, c.p[1] - fs * 0.8, c.p[0] + w, c.p[1] + fs * 0.8];
      if (!Array.isArray(o.kota) && boxes.some((q) => !(b[2] < q[0] || b[0] > q[2] || b[3] < q[1] || b[1] > q[3]))) continue;
      boxes.push(b); out.push({ name: nm(c), p: c.p, cap: c.flag & 1 });
    }
    return out;
  }
  function drawCities(g, S, tf, sc = 1) {
    if (!S.cities.length) return;
    const o = S.opts, P = S.pal, asli = o.style === "asli";
    g.save(); g.textBaseline = "middle"; g.lineJoin = "round";
    S.cities.forEach((c) => {
      const q = tf ? tf(c.p) : c.p, fs = o.kotaSize * sc;
      g.beginPath(); g.arc(q[0], q[1], (c.cap ? 3.4 : 2.6) * sc, 0, C.TAU); g.fillStyle = P.cityDot; g.fill(); g.lineWidth = 1.2 * sc; g.strokeStyle = P.cityHalo; g.stroke();
      g.font = `${c.cap ? 700 : 600} ${fs}px ${o.font}`; g.lineWidth = 3 * sc; g.strokeStyle = P.cityHalo; g.strokeText(c.name, q[0] + 6 * sc, q[1]);
      g.fillStyle = asli ? P.cityInkAsli : P.cityInk; g.fillText(c.name, q[0] + 6 * sc, q[1]);
    });
    g.restore();
  }

  /* ---------- module ---------- */
  const PAL = { sea: "#86AFC2", seaShadow: "#6F95A8", land0: "#F1E4C6", land1: "#D9C39A", rim: "rgba(252,246,232,.95)", border: "rgba(120,92,56,.55)",
    side: "#9C7A4E", sideLine: "#7E5F3A", bg3d: "#7FA8BA", atlasSea: "#AAD3DF", atlasLand: "#F2EFE9", atlasGreen: "#CDEBB0", atlasCoast: "#9EC3D2",
    route: "#B23A32", routeRim: "#FBF6EA", routeShadow: "rgba(20,30,40,.35)", pin: "#1C2B45", pinDim: "rgba(28,43,69,.4)", halo: "rgba(242,215,150,.9)",
    card: "#FBF6EA", cardShadow: "#E3B04B", ink: "#141414", inkSub: "#6b5a3e", chevron: "#f2d796", hull: "#3E6FA8", hullDark: "#2B4F7E", sail: "#FBF6EA",
    outside: "#E6DCC6", outside3d: "#0f1a2c", graticule: "rgba(252,246,232,.28)", atlasGraticule: "rgba(255,255,255,.55)", highlight: "rgba(227,176,75,.55)", atlasHighlight: "rgba(242,190,90,.45)",
    cityDot: "#1C2B45", cityHalo: "rgba(251,246,234,.9)", cityInk: "#3d3324", cityInkAsli: "#4a4a4a" };
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function legTimes(o, n) {
    const L = Array.isArray(o.legDur) ? o.legDur : null;
    return Array.from({ length: n }, (_, k) => (L ? (L[k] != null ? L[k] : L[L.length - 1]) : o.legDur));
  }
  function durationOf(o) {
    const n = Math.max(1, (o.stops || DEMO_STOPS).length - 1);
    return o.hold + legTimes(o, n).reduce((a, b) => a + b, 0) + o.stopHold * (n - 1) + o.endHold;
  }

  function setup(S) {
    const o = S.opts; S.pal = Object.assign({}, PAL, o.palette || {});
    S.plane = o.plane.slice();
    const [PW, PH] = S.plane;
    // ---- projection ----
    let proj = (p) => [p[0], p[1]];
    // stops may name a Natural Earth place instead of a waypoint index: {kota: "Venesia"}
    const PT = MGP.peta;
    if (o.coords === "lonlat" && PT) (o.stops || []).forEach((s) => { if (s.kota && !s.p) { const k = PT.kota(s.kota); if (k) { s.p = [k.lon, k.lat]; if (s.name == null) s.name = o.bahasa === "en" ? k.nama : k.nama_id; } }
      if (s.p && s.i == null) { let bi = 0, bd = 1e9; o.route.forEach((q, j) => { const d = Math.hypot(q[0] - s.p[0], q[1] - s.p[1]); if (d < bd) { bd = d; bi = j; } }); s.i = bi; } });
    if (o.coords === "lonlat") {
      // real geography by default when the data is loaded; procedural land when asked (darat:"acak", landGen, land, tiles)
      const want = o.darat === "acak" || o.darat === "procedural" || o.landGen || o.land || o.tiles ? false : o.darat === "nyata" || o.darat === "real" || o.darat == null;
      S.geo = want && PT && PT.ada();
      if (want && !S.geo && o.darat != null && root.console) root.console.warn("MGP.routeMap: data peta belum dimuat (lib/map.js + lib/map-data/world-50m.js); memakai daratan acak.");
      const lons = o.route.map((p) => p[0]), lats = o.route.map((p) => p[1]);
      const c0 = o.pusat || [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
      const pr = PT ? PT.proyeksi(o.proyeksi || "mercator", { lon0: c0[0], lat0: c0[1] })
        : { f: (lon, lat) => [lon * D2R, Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2)), true], flat: true, unitOutline: null };
      S.pr = pr;
      let M;
      if (o.fit === "dunia" || o.fit === "world") M = pr.unitOutline ? pr.unitOutline : [pr.f(c0[0] - 180, -80), pr.f(c0[0] + 180, 82)];
      else M = o.route.map((p) => pr.f(p[0], p[1]));
      const xs = M.map((p) => p[0]), ys = M.map((p) => p[1]);
      const mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys);
      const [[ex0, ey0], [ex1, ey1]] = o.fitBox, ew = ex1 - ex0, eh = ey1 - ey0, bw = mxx - mnx || 1e-6, bh = mxy - mny || 1e-6;
      const sc = Math.min(ew / bw, eh / bh), ox = ex0 + (ew - bw * sc) / 2, oy = ey0 + (eh - bh * sc) / 2;
      const tf = (u) => [ox + (u[0] - mnx) * sc, oy + (mxy - u[1]) * sc];
      proj = (p) => tf(pr.f(p[0], p[1]));
      S.tf = tf; S.pxPerDeg = sc * D2R;
    }
    S.proj = proj;
    const R = o.route.map(proj);
    const stops = (o.stops || DEMO_STOPS).map((s) => Object.assign({}, s, { p: s.p ? proj(s.p) : R[C.clamp(s.i | 0, 0, R.length - 1)] }));
    S.stops = stops; S.stopPts = stops.map((s) => s.p);
    // ---- legs: split the waypoint list at stops, smooth each leg with Catmull-Rom ----
    const idx = stops.map((s) => C.clamp(s.i | 0, 0, R.length - 1));
    S.legs = [];
    for (let k = 0; k < Math.max(1, idx.length - 1); k++) {
      const a = idx[k] || 0, b = idx[k + 1] != null ? idx[k + 1] : R.length - 1;
      const pts = R.slice(Math.min(a, b), Math.max(a, b) + 1);
      const p = pts.length > 1 ? C.catmullPts(pts, 12, false, 0) : [pts[0], pts[0]];
      const len = [0]; for (let i = 1; i < p.length; i++) len.push(len[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
      S.legs.push({ p, len, L: len[len.length - 1] });
    }
    S.legStart = []; let acc = 0; S.legs.forEach((l) => { S.legStart.push(acc); acc += l.L; }); S.Ltot = acc;
    S.dense = S.legs.flatMap((l) => l.p);
    S.atLeg = (lg, d) => { let i = 1; while (i < lg.len.length - 1 && lg.len[i] < d) i++; const a = lg.p[i - 1], b = lg.p[i], u = C.clamp((d - lg.len[i - 1]) / (lg.len[i] - lg.len[i - 1] || 1)); return [C.lerp(a[0], b[0], u), C.lerp(a[1], b[1], u), i]; };
    S.at = (D) => { let k = 0; while (k < S.legs.length - 1 && D > S.legStart[k] + S.legs[k].L) k++; return S.atLeg(S.legs[k], C.clamp(D - S.legStart[k], 0, S.legs[k].L)); };
    S.tanAt = (D) => { const a = S.at(Math.max(0, D - 12)), b = S.at(Math.min(S.Ltot, D + 12)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    S.stopDist = stops.map((s, k) => (k === 0 ? 0 : S.legStart[Math.min(k - 1, S.legs.length - 1)] + S.legs[Math.min(k - 1, S.legs.length - 1)].L));
    // ---- timeline: hold \u2192 leg \u2192 stop \u2192 leg \u2026 \u2192 end hold ----
    const lt = legTimes(o, S.legs.length);
    S.TL = [{ k: "hold", d: o.hold }]; lt.forEach((d, k) => { S.TL.push({ k: "go", s: k, d }); S.TL.push({ k: "stop", d: k === lt.length - 1 ? o.endHold : o.stopHold }); });
    S.REACH = [o.firstPop]; { let tt = o.hold; lt.forEach((d, k) => { tt += d; S.REACH.push(tt); tt += o.stopHold; }); }
    const ez = o.ease === "smooth" ? C.smooth01 : C.ease[o.ease] || C.smooth01;
    S.stateAt = (t) => {
      let a = 0, done = 0;
      for (const s of S.TL) { if (t < a + s.d) { if (s.k === "go") return { leg: s.s, u: ez(C.clamp((t - a) / s.d)), moving: true }; return { leg: Math.max(0, done - 1), u: done ? 1 : 0, moving: false }; } a += s.d; if (s.k === "go") done++; }
      return { leg: S.legs.length - 1, u: 1, moving: false };
    };
    S.headAt = (t) => { const s = S.stateAt(t), lg = S.legs[s.leg], d = s.u * lg.L; const p = S.atLeg(lg, d); return { s, lg, d, p, total: S.legStart[s.leg] + d }; };
    // heading table at 24 fps, smoothed tangent, turn-rate limited (precomputed once \u2192 deterministic)
    const D = durationOf(o); S.HD = []; let hh = null;
    for (let i = 0; i <= Math.ceil(D * 24) + 1; i++) {
      const H = S.headAt(i / 24), a = S.atLeg(H.lg, Math.max(0, H.d - 12)), b = S.atLeg(H.lg, Math.min(H.lg.L, H.d + 12));
      const raw = Math.atan2(b[1] - a[1], b[0] - a[0]); if (hh === null) hh = raw;
      if (H.s.moving) { const dl = Math.atan2(Math.sin(raw - hh), Math.cos(raw - hh)), mx = (o.maxTurn * D2R) / 24; hh += C.clamp(dl, -mx, mx); }
      S.HD.push(hh);
    }
    // ---- land ----
    S.borders = (o.borders || []).map((l) => l.map(proj));
    S.coast = null; S.lakes = []; S.grat = []; S.outline = null; S.cities = []; S.hl = [];
    if (S.geo) {
      const M = o.style === "3d" ? 700 : 60, zmax = Math.max(1, ...(o.zoomKeys || []).map((k) => +k[1] || 1)) * (o.zoom || 1.12);
      const G = PT.siapkan({ proj: S.pr, tf: S.tf, box: [-M, -M, PW + M, PH + M], pxPerDeg: S.pxPerDeg * zmax * (o.style === "asli" ? 1.6 : 1), detail: o.detail || "auto",
        tol: o.style === "3d" ? 0.7 : 0.3, negara: o.negara ? [].concat(o.negara) : null, graticule: true, graticuleStep: o.graticuleStep || (S.pxPerDeg > 40 ? 5 : S.pxPerDeg > 12 ? 10 : 15) });
      S.land = G.darat; S.coast = o.garisPantai === false ? [] : G.pantai; S.lakes = o.danau === false ? [] : G.danau; S.grat = G.garis; S.outline = G.luar; S.petaTiles = G.tiles;
      if (o.batasNegara != null ? o.batasNegara : o.style === "asli") S.borders = S.borders.concat(G.batas);
      S.hl = Object.values(G.negara).flat();
      S._kota = G.kota;
    } else S.land = o.land ? o.land.map((r) => r.map(proj)) : o.tiles ? [] : buildLand(S);
    // path builders; `vis(bb)` (3d) skips rings whose plane bbox is off screen
    const ringsPath = (R) => { const BB = R.map(bbox); return (g, tf, vis) => { R.forEach((r, k) => { if (vis && !vis(BB[k])) return; r.forEach((p, i) => { const q = tf ? tf(p) : p; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); }); }; };
    const linesPath = (L) => { const BB = L.map(bbox); return (g, tf, vis) => { L.forEach((r, k) => { if (vis && !vis(BB[k])) return; r.forEach((p, i) => { const q = tf ? tf(p) : p; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); }); }; };
    S.landPath = ringsPath(S.land);
    // coastline strokes: real coast lines (no seams at tile/plane edges) or the land rings themselves
    S.coastPath = S.coast ? linesPath(S.coast) : S.landPath;
    S.lakePath = ringsPath(S.lakes); S.hlPath = ringsPath(S.hl); S.gratPath = linesPath(S.grat);
    S.outlinePath = S.outline ? ringsPath([S.outline]) : null;
    S.fib = fibre(11);
    // view scale, so the baked plane is sharp enough and atlas strokes keep a constant screen width
    const zk = Math.max(1, ...(o.zoomKeys || []).map((k) => +k[1] || 1));
    if (o.style === "asli" && o.zoom == null) { const b = bbox(S.dense), padR = Math.min(170, S.W * 0.22); S.viewS = Math.min((S.W - 30 - padR) / (b[2] - b[0] || 1), (S.H - 80) / (b[3] - b[1] || 1)) * zk; }
    else S.viewS = Math.max(S.W / 1280, S.H / 720) * (o.zoom || 1.12) * zk;
    S.lineK = o.style === "asli" && S.geo ? 1 / Math.max(0.05, S.viewS / zk) : 1;
    if (S._kota) S.cities = pickCities(S, S._kota);
    if (o.style !== "3d") S.baked = bake(S, o.style);
  }

  /* ---------- baked flat plane (karton / asli) ---------- */
  function bake(S, style) {
    const o = S.opts, P = S.pal, [PW, PH] = S.plane, K = S.lineK;
    const RS = o.bakeScale || C.clamp(S.viewS * (o.dpr || 1) * 1.05, 1.5, Math.sqrt(2.4e7 / (PW * PH)));
    const c = C.offscreen(PW * RS, PH * RS), g = c.getContext("2d"); g.scale(RS, RS);
    if (o.tiles) { g.drawImage(o.tiles, 0, 0, PW, PH); return c; }
    const land = () => { g.beginPath(); S.landPath(g); };
    const coast = () => { g.beginPath(); S.coastPath(g); };
    const lakes = () => { g.beginPath(); S.lakePath(g); };
    // globe / Equal Earth: paint the outside, then keep everything inside the world outline
    if (S.outlinePath) { g.fillStyle = P.outside; g.fillRect(0, 0, PW, PH); g.save(); g.beginPath(); S.outlinePath(g); g.clip(); }
    if (style === "asli") {
      g.fillStyle = P.atlasSea; g.fillRect(0, 0, PW, PH);
      if (S.geo) { g.beginPath(); S.gratPath(g); g.strokeStyle = P.atlasGraticule; g.lineWidth = 0.8 * K; g.stroke(); }
      land(); g.fillStyle = P.atlasLand; g.fill("evenodd");
      if (!S.geo) {
        g.save(); land(); g.clip("evenodd");
        const r = C.rng((o.landGen && o.landGen.seed) || 5);
        for (let i = 0; i < 70; i++) { const x = r() * PW, y = r() * PH, rr = 18 + r() * 55; g.beginPath(); for (let k = 0; k <= 18; k++) { const a = (k / 18) * C.TAU, q = rr * (0.7 + 0.3 * noise2(Math.cos(a) * 2 + i, Math.sin(a) * 2, 3)); g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.8); } g.fillStyle = C.rgba(P.atlasGreen, 0.55); g.fill(); }
        g.restore();
      }
      if (S.hl.length) { g.save(); land(); g.clip("evenodd"); g.beginPath(); S.hlPath(g); g.fillStyle = P.atlasHighlight; g.fill("evenodd"); g.restore(); }
      if (S.lakes.length) { lakes(); g.fillStyle = P.atlasSea; g.fill("evenodd"); g.strokeStyle = P.atlasCoast; g.lineWidth = 0.8 * K; g.stroke(); }
      coast(); g.strokeStyle = P.atlasCoast; g.lineWidth = S.geo ? 1.1 * K : 1.2; g.stroke();
      if (!S.geo) { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; for (let x = 0; x <= PW; x += 200) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, PH); g.stroke(); } for (let y = 0; y <= PH; y += 200) { g.beginPath(); g.moveTo(0, y); g.lineTo(PW, y); g.stroke(); } }
    } else {
      g.fillStyle = P.sea; g.fillRect(0, 0, PW, PH);
      g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.22; g.fillStyle = g.createPattern(S.fib, "repeat"); g.fillRect(0, 0, PW, PH); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      if (S.geo && o.graticule) { g.beginPath(); S.gratPath(g); g.strokeStyle = P.graticule; g.lineWidth = 1; g.setLineDash([2, 4]); g.stroke(); g.setLineDash([]); }
      g.save(); g.shadowColor = "rgba(20,36,52,.42)"; g.shadowBlur = 12 * RS; g.shadowOffsetX = 3 * RS; g.shadowOffsetY = 7 * RS; land(); g.fillStyle = P.seaShadow; g.fill("evenodd"); g.restore();
      g.save(); land(); g.clip("evenodd");
      const lg = g.createLinearGradient(0, 0, PW * 0.7, PH); lg.addColorStop(0, P.land0); lg.addColorStop(1, P.land1); g.fillStyle = lg; g.fillRect(0, 0, PW, PH);
      if (S.hl.length) { g.beginPath(); S.hlPath(g); g.fillStyle = P.highlight; g.fill("evenodd"); }
      g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.75; g.fillStyle = g.createPattern(S.fib, "repeat"); g.fillRect(0, 0, PW, PH);
      g.globalCompositeOperation = "screen"; g.globalAlpha = 1; const rg = g.createRadialGradient(PW * 0.3, PH * 0.2, 0, PW * 0.3, PH * 0.2, PW * 0.8); rg.addColorStop(0, "rgba(255,240,205,.28)"); rg.addColorStop(1, "rgba(255,240,205,0)"); g.fillStyle = rg; g.fillRect(0, 0, PW, PH);
      g.restore();
      if (S.lakes.length) { lakes(); g.fillStyle = P.sea; g.fill("evenodd"); g.strokeStyle = P.rim; g.lineWidth = 1.2; g.stroke(); }
      coast(); g.strokeStyle = P.rim; g.lineWidth = S.geo ? 1.6 : 2; g.stroke();
    }
    if (S.borders.length) { g.beginPath(); S.borders.forEach((l) => l.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))); g.setLineDash([5 * K, 4 * K]); g.strokeStyle = P.border; g.lineWidth = 1.1 * K; g.stroke(); g.setLineDash([]); }
    if (S.outlinePath) { g.restore(); g.beginPath(); S.outlinePath(g); g.strokeStyle = style === "asli" ? P.atlasCoast : P.sideLine; g.lineWidth = 1.5 * K; g.stroke(); }
    drawCities(g, S, null, K);
    return c;
  }

  /* ---------- per-frame state ---------- */
  function routeState(S, t) {
    const o = S.opts, tq = o.fps ? C.stepT(t, o.fps) : t;
    const H = S.headAt(tq), hd = S.HD[C.clamp(Math.round(tq * 24), 0, S.HD.length - 1)];
    const reached = S.REACH.filter((r) => tq >= r).length;
    // closed-form camera lag: exponentially weighted average of past tip positions
    let cx = 0, cy = 0, ws = 0;
    if (o.follow) {
      const lag = Math.max(0.01, o.followLag), h = 1 / 24, N = Math.ceil((lag * 4) / h);
      for (let k = 0; k <= N; k++) { const w = Math.exp(-(k * h) / lag), p = S.headAt(Math.max(0, tq - k * h)).p; cx += p[0] * w; cy += p[1] * w; ws += w; }
      cx /= ws; cy /= ws;
    } else { const b = bbox(S.dense); cx = (b[0] + b[2]) / 2; cy = (b[1] + b[3]) / 2; }
    return { t, tq, H, hd, reached, cam: [cx, cy], left: Math.cos(hd) < 0 };
  }
  const bbox = (P) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; P.forEach((p) => { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }); return [a, b, c, d]; };

  /* ---------- drawing pieces (all in plane px unless a transform fn is given) ---------- */
  function routePts(S, D) {
    const out = []; if (D <= 0) return out;
    for (let k = 0; k < S.legs.length; k++) {
      const lg = S.legs[k], st = S.legStart[k]; if (D <= st) break;
      const dd = Math.min(lg.L, D - st);
      for (let i = 0; i < lg.p.length && lg.len[i] < dd; i++) out.push(lg.p[i]);
      const e = S.atLeg(lg, dd); out.push([e[0], e[1]]);
    }
    return out;
  }
  function strokeRoute(g, S, pts, tf, sc = 1) {
    if (pts.length < 2) return;
    const P = S.pal, path = () => { g.beginPath(); pts.forEach((p, i) => { const q = tf ? tf(p) : p; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); };
    g.lineCap = "round"; g.lineJoin = "round";
    g.save(); g.translate(2 * sc, 4 * sc); g.filter = "blur(" + (2 * sc).toFixed(2) + "px)"; path(); g.strokeStyle = P.routeShadow; g.lineWidth = 10 * sc; g.stroke(); g.restore();
    path(); g.strokeStyle = P.routeRim; g.lineWidth = 8 * sc; g.stroke();
    path(); g.strokeStyle = P.route; g.lineWidth = 3.6 * sc; g.stroke();
  }
  function drawPin(g, S, x, y, on, sc) {
    const P = S.pal;
    if (S.opts.pin === "pin") {
      g.save(); g.translate(x, y); g.scale(sc, sc);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-4, -8, -11, -12, -11, -20); g.arc(0, -20, 11, Math.PI, 0); g.bezierCurveTo(11, -12, 4, -8, 0, 0); g.closePath();
      g.fillStyle = on ? P.route : P.pinDim; g.strokeStyle = P.routeRim; g.lineWidth = 2; g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -20, 4, 0, C.TAU); g.fillStyle = P.routeRim; g.fill(); g.restore(); return;
    }
    g.lineWidth = 2 * sc;
    if (on) { g.beginPath(); g.arc(x, y, 9 * sc, 0, C.TAU); g.strokeStyle = P.halo; g.stroke(); }
    g.beginPath(); g.arc(x, y, 5.5 * sc, 0, C.TAU); g.fillStyle = on ? P.pin : P.pinDim; g.fill(); g.strokeStyle = P.routeRim; g.stroke();
  }
  function spaced(g, txt, x, y, sp) { let cx = x; for (const ch of txt) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; } return cx - x - sp; }
  function spacedW(g, txt, sp) { let w = 0; for (const ch of txt) w += g.measureText(ch).width + sp; return w - sp; }
  function drawLabel(g, S, s, x, y, u, sc) {
    if (u < 0) return;
    const o = S.opts, P = S.pal, e = Math.exp(-u / 0.17), a = Math.min(1, u / 0.2), pop = 1 - 0.08 * e;
    const fs = o.labelSize, name = String(s.name || "").toUpperCase(), sub = s.sub || "";
    g.save(); g.globalAlpha *= a;
    g.font = `600 ${fs}px ${o.font}`; const sp = fs * 0.12, nw = spacedW(g, name, sp);
    g.font = `italic 400 ${fs * 0.76}px ${o.subFont}`; const sw = sub ? g.measureText(sub).width : 0;
    const w = Math.max(nw, sw) + 24, h = fs + (sub ? fs * 0.76 + 3 : 0) + 13;
    const side = s.side || "ne", dx = side[1] === "w" ? -12 - w : 12, dy = side[0] === "s" ? 12 + h : -12;
    g.translate(x, y); g.scale(sc, sc); g.translate(dx + (side[1] === "w" ? w : 0), dy); g.rotate(-1.2 * D2R); g.scale(pop, pop); g.translate(side[1] === "w" ? -w : 0, -h);
    g.save(); g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 14; g.shadowOffsetY = 6; g.fillStyle = P.cardShadow; g.fillRect(4, 4, w, h); g.restore();
    g.fillStyle = P.card; g.fillRect(0, 0, w, h);
    g.fillStyle = P.ink; g.font = `600 ${fs}px ${o.font}`; g.textBaseline = "top"; spaced(g, name, 12, 7, sp);
    if (sub) { g.fillStyle = P.inkSub; g.font = `italic 400 ${fs * 0.76}px ${o.subFont}`; g.fillText(sub, 12, 7 + fs + 3); }
    g.restore();
  }
  function drawBoat(g, P) {
    // paper boat, 72 px long, waterline at y\u22484, bow to +x
    g.save(); g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 4; g.shadowOffsetY = 4;
    g.beginPath(); g.moveTo(-34, -6); g.lineTo(36, -9); g.quadraticCurveTo(30, 6, 18, 8); g.lineTo(-24, 8); g.quadraticCurveTo(-32, 4, -34, -6); g.closePath(); g.fillStyle = P.hull; g.fill(); g.restore();
    g.beginPath(); g.moveTo(-30, 2); g.lineTo(28, 1); g.quadraticCurveTo(24, 7, 18, 8); g.lineTo(-24, 8); g.closePath(); g.fillStyle = P.hullDark; g.fill();
    g.beginPath(); g.moveTo(-34, -6); g.lineTo(36, -9); g.lineTo(35, -6); g.lineTo(-33, -3); g.closePath(); g.fillStyle = P.sail; g.fill();
    g.fillStyle = "#EDE3CC"; g.fillRect(-10, -17, 16, 10); g.fillStyle = P.hull; g.fillRect(-6, -14, 5, 4); g.fillStyle = P.hullDark; g.fillRect(-12, -19, 20, 3);
    g.fillStyle = "#6b4a2b"; g.fillRect(-20, -28, 2.2, 22);
  }
  function drawVehicle(g, S, x, y, hd, left, sc, t, upright) {
    const o = S.opts, P = S.pal;
    g.save(); g.translate(x, y); g.scale(sc, sc);
    if (o.chevron && o.vehicle !== "none") { g.save(); g.rotate(hd); g.shadowColor = "rgba(242,215,150,.9)"; g.shadowBlur = 4; g.beginPath(); g.moveTo(9, 0); g.lineTo(-9, -9); g.lineTo(-4, 0); g.lineTo(-9, 9); g.closePath(); g.fillStyle = P.chevron; g.fill(); g.restore(); }
    const v = o.vehicle;
    if (typeof v === "function") v(g, { heading: hd, flip: left ? -1 : 1, scale: sc, t });
    else if (v === "dot") { g.beginPath(); g.arc(0, 0, 7, 0, C.TAU); g.fillStyle = P.route; g.fill(); g.lineWidth = 2.5; g.strokeStyle = P.routeRim; g.stroke(); }
    else if (v === "plane") { g.rotate(hd); g.fillStyle = P.routeRim; g.strokeStyle = P.pin; g.lineWidth = 1.5; g.beginPath(); g.moveTo(16, 0); g.lineTo(4, -3); g.lineTo(-2, -16); g.lineTo(-6, -16); g.lineTo(-3, -3); g.lineTo(-12, -2); g.lineTo(-16, -8); g.lineTo(-18, -8); g.lineTo(-16, 0); g.lineTo(-18, 8); g.lineTo(-16, 8); g.lineTo(-12, 2); g.lineTo(-3, 3); g.lineTo(-6, 16); g.lineTo(-2, 16); g.lineTo(4, 3); g.closePath(); g.fill(); g.stroke(); }
    else if (v === "boat" || o.vehicleImage) {
      const bh = upright ? 0 : left ? hd - Math.PI : hd;
      g.translate(0, 4); g.rotate(bh); g.scale(left ? -1 : 1, 1); g.translate(0, -4);
      if (o.vehicleImage) { const im = o.vehicleImage, w = 72, h = (w * (im.height || 1)) / (im.width || 1); g.drawImage(im, -36, -30, w, h); } else drawBoat(g, P);
    }
    g.restore();
  }

  /* ---------- styles ---------- */
  function renderFlat(g, S, st) {
    const o = S.opts, { W, H } = S, [PW, PH] = S.plane;
    let s, cx, cy;
    if (o.style === "asli" && o.zoom == null) {
      const b = bbox(S.dense), padL = 30, padT = 50, padR = Math.min(170, W * 0.22), padB = 30;
      s = Math.min((W - padL - padR) / (b[2] - b[0] || 1), (H - padT - padB) / (b[3] - b[1] || 1));
      cx = (b[0] + b[2]) / 2 + (padR - padL) / 2 / s; cy = (b[1] + b[3]) / 2 + (padB - padT) / 2 / s;
    } else {
      s = Math.max(Math.max(W / 1280, H / 720) * (o.zoom || 1.12), 0.2);
      const hw = W / 2 / s, hh = H / 2 / s; cx = C.clamp(st.cam[0], hw, PW - hw); cy = C.clamp(st.cam[1], hh, PH - hh);
    }
    if (o.zoomKeys) s *= C.key(o.zoomKeys, st.tq);
    g.fillStyle = S.outlinePath ? S.pal.outside : o.style === "asli" ? S.pal.atlasSea : S.pal.seaShadow; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2 - cx * s, H / 2 - cy * s); g.scale(s, s);
    g.imageSmoothingQuality = "high"; g.drawImage(S.baked, 0, 0, PW, PH);
    const pts = routePts(S, st.H.total);
    if (o.style === "asli") {
      if (pts.length > 1) { g.lineCap = g.lineJoin = "round"; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.globalAlpha = 0.95; g.strokeStyle = S.pal.routeRim; g.lineWidth = 8 / s; g.stroke(); g.globalAlpha = 1; g.strokeStyle = S.pal.route; g.lineWidth = 4 / s; g.stroke(); }
    } else strokeRoute(g, S, pts);
    const ps = o.style === "asli" ? 1 / s : 1;
    S.stops.forEach((sp, i) => drawPin(g, S, sp.p[0], sp.p[1], st.reached > i, ps));
    S.stops.forEach((sp, i) => drawLabel(g, S, sp, sp.p[0], sp.p[1], o.style === "asli" ? (st.reached > i ? 1 : -1) : st.tq - S.REACH[i], ps));
    drawVehicle(g, S, st.H.p[0], st.H.p[1], st.hd, st.left, ps, st.tq, false);
    g.restore();
  }

  function render3d(g, S, st) {
    const o = S.opts, P = S.pal, { W, H } = S, [PW, PH] = S.plane, T = st.t;
    const s0 = Math.max(Math.max(W / 1280, H / 720) * (o.zoom || 1.05), 0.2) * (o.zoomKeys ? C.key(o.zoomKeys, st.tq) : 1);
    const rz = (Math.sin(T * 0.35) * o.spinWobble + o.spin) * D2R, tilt = (o.tilt + Math.sin(T * 0.27) * o.tiltWobble) * D2R, hw = W / 2 / s0;
    const cx = C.clamp(st.cam[0], Math.min(hw + 60, PW / 2), Math.max(PW - hw - 60, PW / 2)), cy = C.clamp(st.cam[1] - 40, Math.min(380, PH / 2), Math.max(PH - 300, PH / 2));
    const piv = [W / 2, H * 0.6], O = [W / 2, H * 0.2], dP = o.perspective, cr = Math.cos(rz), sr = Math.sin(rz), ct = Math.cos(tilt), stl = Math.sin(tilt);
    const pj = (x, y, z = 0) => {
      let X = (x - cx) * s0, Y = (y - cy) * s0; const Z = z * s0;
      const X2 = X * cr - Y * sr, Y2 = X * sr + Y * cr;
      const y3 = Y2 * ct - Z * stl, z3 = Y2 * stl + Z * ct;
      const k = dP / Math.max(1, dP - z3);
      return [O[0] + (piv[0] + X2 - O[0]) * k, O[1] + (piv[1] + y3 - O[1]) * k, k];
    };
    const tf = (z) => (p) => pj(p[0], p[1], z);
    // per-frame screen culling of plane-space bboxes (projected corners vs. the frame, with margin)
    const fid = (S._fid = (S._fid || 0) + 1);
    const vis = (b) => { if (b._f === fid) return b._v; let a = 1e9, c = -1e9, d = 1e9, e = -1e9;
      for (const q of [pj(b[0], b[1], 6), pj(b[2], b[1], 6), pj(b[0], b[3], 6), pj(b[2], b[3], 6)]) { if (q[0] < a) a = q[0]; if (q[0] > c) c = q[0]; if (q[1] < d) d = q[1]; if (q[1] > e) e = q[1]; }
      b._f = fid; return (b._v = !(c < -80 || a > W + 80 || e < -80 || d > H + 80)); };
    g.fillStyle = P.bg3d; g.fillRect(0, 0, W, H);
    // sea plane
    const MG = 2000; g.beginPath();
    if (S.outlinePath) S.outlinePath(g, tf(0)); else [[-MG, -MG], [PW + MG, -MG], [PW + MG, PH + MG], [-MG, PH + MG]].forEach((p, i) => { const q = pj(p[0], p[1]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath();
    g.fillStyle = P.sea; g.fill();
    if (S.outlinePath) { g.strokeStyle = P.sideLine; g.lineWidth = 2; g.stroke(); }
    if (S.geo && o.graticule) { g.beginPath(); S.gratPath(g, tf(0)); g.strokeStyle = P.graticule; g.lineWidth = 1; g.setLineDash([2, 4]); g.stroke(); g.setLineDash([]); }
    if (o.tiles) { /* tiles are a flat image: approximate by strips */
      const n = 120; for (let i = 0; i < n; i++) { const y0 = (i / n) * PH, y1 = ((i + 1) / n) * PH, a = pj(0, y0), b = pj(PW, y0), c = pj(0, y1); g.save(); g.setTransform(g.getTransform().multiply(new DOMMatrix([(b[0] - a[0]) / PW, (b[1] - a[1]) / PW, (c[0] - a[0]) / (y1 - y0), (c[1] - a[1]) / (y1 - y0), a[0], a[1]]))); g.drawImage(o.tiles, 0, (y0 / PH) * o.tiles.height, o.tiles.width, (o.tiles.height / n) + 0.5, 0, 0, PW, y1 - y0 + 0.6); g.restore(); }
    } else {
      // extruded land: side layers then top
      g.save(); g.globalAlpha = 0.96;
      for (let z = 1; z <= 6; z++) { g.beginPath(); S.landPath(g, tf(z * 1.6), vis); g.fillStyle = P.side; g.fill("evenodd"); g.beginPath(); S.coastPath(g, tf(z * 1.6), vis); g.strokeStyle = P.sideLine; g.lineWidth = 1.5; g.stroke(); }
      g.restore();
      g.save(); g.beginPath(); S.landPath(g, tf(11), vis); g.clip("evenodd");
      const lg = g.createLinearGradient(0, 0, W * 0.7, H); lg.addColorStop(0, P.land0); lg.addColorStop(1, P.land1); g.fillStyle = lg; g.fillRect(0, 0, W, H);
      if (S.hl.length) { g.beginPath(); S.hlPath(g, tf(11), vis); g.fillStyle = P.highlight; g.fill("evenodd"); }
      g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.75; g.fillStyle = g.createPattern(S.fib, "repeat"); g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "screen"; g.globalAlpha = 1; const rg = g.createRadialGradient(W * 0.25, H * 0.1, 0, W * 0.25, H * 0.1, W * 0.8); rg.addColorStop(0, "rgba(255,240,205,.28)"); rg.addColorStop(1, "rgba(255,240,205,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
      g.restore();
      if (S.lakes.length) { g.beginPath(); S.lakePath(g, tf(11), vis); g.fillStyle = P.sea; g.fill("evenodd"); }
      g.beginPath(); S.coastPath(g, tf(11), vis); g.strokeStyle = P.rim; g.lineWidth = (S.geo ? 1.5 : 2) * s0; g.stroke();
      if (S.cities.length) drawCities(g, S, tf(11), s0 * 0.85);
      if (S.borders.length) { g.beginPath(); S.borders.forEach((l) => l.forEach((p, i) => { const q = pj(p[0], p[1], 11); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); })); g.setLineDash([5, 5]); g.strokeStyle = P.border; g.lineWidth = 1.1; g.stroke(); g.setLineDash([]); }
    }
    strokeRoute(g, S, routePts(S, st.H.total), tf(12), s0 * 0.9);
    S.stops.forEach((sp, i) => { const q = pj(sp.p[0], sp.p[1], 13); drawPin(g, S, q[0], q[1], st.reached > i, s0 * q[2] * 0.8); });
    S.stops.forEach((sp, i) => { const q = pj(sp.p[0], sp.p[1], 13); drawLabel(g, S, sp, q[0], q[1] - 6 * q[2], st.tq - S.REACH[i], s0 * q[2] * 0.75); });
    const hq = pj(st.H.p[0], st.H.p[1], 13), a2 = pj(st.H.p[0] + Math.cos(st.hd) * 10, st.H.p[1] + Math.sin(st.hd) * 10, 13);
    const hdS = Math.atan2(a2[1] - hq[1], a2[0] - hq[0]);
    drawVehicle(g, S, hq[0], hq[1] - 10 * hq[2] * s0, hdS, Math.cos(hdS) < 0, s0 * hq[2] * 0.85, st.tq, true);
    if (o.fog) {
      const f = g.createLinearGradient(0, 0, 0, H); f.addColorStop(0, "rgba(14,22,48,.95)"); f.addColorStop(0.22, "rgba(30,52,80,.55)"); f.addColorStop(0.45, "rgba(0,0,0,0)"); g.fillStyle = f; g.fillRect(0, 0, W, H);
      const v = g.createRadialGradient(W / 2, H * 1.2, H * 0.6, W / 2, H * 1.2, H * 1.3); v.addColorStop(0, "rgba(5,8,20,0)"); v.addColorStop(1, "rgba(5,8,20,.55)"); g.fillStyle = v; g.fillRect(0, 0, W, H);
    }
  }

  function hud(g, S, st) {
    const deg = Math.round((((st.hd / D2R) % 360) + 360) % 360);
    g.save(); g.font = `500 13px ui-monospace, Consolas, monospace`; const txt = `heading ${deg}\u00b0 \u00b7 t ${st.tq.toFixed(2)} s \u00b7 ${st.reached}/${S.stops.length}`;
    const w = g.measureText(txt).width + 24; g.fillStyle = "rgba(10,14,24,.6)"; g.beginPath(); g.roundRect ? g.roundRect(14, 14, w, 28, 14) : g.rect(14, 14, w, 28); g.fill();
    g.fillStyle = "#f2d796"; g.textBaseline = "middle"; g.fillText(txt, 26, 28); g.restore();
  }

  const api = C.defineModule("routeMap", {
    aliases: { lang: "bahasa", countryBorders: "batasNegara", lakes: "danau", landSource: "darat", coastline: "garisPantai", cities: "kota",
      maxCities: "kotaMaks", citySize: "kotaSize", countries: "negara", projection: "proyeksi", center: "pusat" },
    valueAliases: { style: { cardboard: "karton", native: "asli" }, fit: { route: "rute", world: "dunia" } },
    size: [1280, 720],
    duration: (o) => durationOf(o),
    defaults: {
      style: "karton", route: DEMO_ROUTE, coords: "lonlat", stops: DEMO_STOPS, plane: [1600, 1000], fitBox: [[230, 300], [1370, 700]],
      land: null, landGen: null, landFn: null, borders: [], tiles: null, palette: null, bakeScale: null,
      darat: null, proyeksi: "mercator", pusat: null, fit: "rute", detail: "auto", batasNegara: null, garisPantai: true, danau: true,
      graticule: false, graticuleStep: null, negara: null, kota: false, kotaMaks: 10, kotaSize: 12, bahasa: "id",
      vehicle: "boat", vehicleImage: null, chevron: true, pin: "dot",
      hold: 0.6, legDur: [3.4, 3.6], stopHold: 1, endHold: 1.8, firstPop: 0.25, ease: "smooth", maxTurn: 120, fps: 12,
      follow: true, followLag: 0.28, zoom: null, zoomKeys: null,
      tilt: 52, tiltWobble: 2, spin: -4, spinWobble: 5, perspective: 1000, fog: true,
      font: SANS, subFont: "Georgia, 'Times New Roman', serif", labelSize: 17, labels: false, seed: 5,
    },
    setup,
    render(g, t, S) {
      const st = routeState(S, t);
      if (S.opts.style === "3d") render3d(g, S, st); else renderFlat(g, S, st);
      if (S.opts.labels) hud(g, S, st);
    },
  });
  api.lib = { buildLand, marching, fibre, noise2, fbm, routeState, pickCities, DEMO_ROUTE, DEMO_STOPS, PALETTE: PAL };
  MGP.routeMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
