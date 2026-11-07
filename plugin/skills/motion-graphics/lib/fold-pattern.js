/**
 * MGP.foldPattern (old name MGP.lipatPola) \u2014 pola lipat teselasi dalam 3D: Miura-ori (lipat kaku, satu derajat kebebasan), Yoshimura (silinder
 * berlian) dan Kresling (silinder memuntir). Lembar digambar sebagai panel datar yang berputar di engselnya, diberi
 * cahaya Lambert, sisi depan/belakang beda warna, dan garis gunung/lembah. Bisa memuat gambar/teks di permukaan lembar
 * (Miura: "isi" dicetak pada lembar datar lalu ikut terlipat).
 *
 * Geometri:
 *   miura({kolom, baris, a, b, gamma, lipat})  lipat 0 = datar terbuka, 1 = terlipat rapat. Panel jajaran genjang,
 *     sudut lipat theta = lipat * 89 derajat. Rumus bentuk tertutup (sel satuan): H = a sin(th) sin(g),
 *     S = b cos(th) tan(g) / sqrt(1 + cos^2(th) tan^2(g)), L = a sqrt(1 - sin^2(th) sin^2(g)), V = b / sqrt(1 + cos^2(th) tan^2(g));
 *     titik (i, j) = (i S, j L + [i ganjil] V, [j ganjil] H). Semua panel tetap datar dan semua tepi tetap panjangnya
 *     (lipat kaku sungguhan); periksa dengan lib.cekIsometri(model).
 *   yoshimura({N, cincin, R, tinggi, lipat})   cincin poligon bergantian diputar pi/N; diagonal dijaga sepanjang awal,
 *     cincin genap tetap, cincin ganjil menggembung: tepi cincin ganjil memanjang (pola ini memang tidak kaku).
 *   kresling({N, tingkat, R, tinggi, lipat})   tiap tingkat: cincin atas diputar psi; satu diagonal dijaga panjangnya,
 *     sehingga turun = memuntir. Diagonal kedua memendek/memanjang (tidak kaku, sumber bistabilitas).
 *   Setiap model: {titik: [[x,y,z]], datar: [[u,v]] (pola datar, untuk validator dan tekstur), panel: [[i...]], lipatan: [[i,j,"M"|"V"|"B"]]}
 *
 * Validator: lib.validasi(model) memakai MGP.origamiFold.lib.validasiPola (Maekawa, Kawasaki, dua warna) pada pola datar.
 *
 * Modul kanvas MGP.lipatPola.create(target, opsi):
 *   pola "miura" | "yoshimura" | "kresling"
 *   lipat  0..1 | [[t, u], ...] | (t) => u      bawaan: buka -> lipat -> buka (lihat gerak)
 *   gerak "buka" (terlipat -> terbuka) | "tutup" | "bolak" (bawaan)   dipakai bila lipat tidak diberi; mulai, durasiLipat
 *   ease "pegas.sigap" | nama MGP.core.ease | fungsi                  bawaan inOut
 *   yaw, pitch  derajat (angka, keyframe, atau fungsi), putar (derajat/detik)
 *   kolom, baris, a, b, gamma (miura) \u00b7 N, cincin, tingkat, R, tinggi (silinder)
 *   depan "#e8553d", belakang "#f4ecd8", garis true, warnaM "rgba(60,20,10,.55)", warnaV "rgba(255,248,236,.7)"
 *   isi null    (ctx, w, h) => gambar pada lembar datar (miura), mis. kartu judul yang terbuka
 *   cahaya [-0.4, -0.7, 0.6], ambient 0.45, ukuran 0.8 (bagian sisi pendek), bg "#1c2236" | null, bayangan true
 *   label true  nama pola + status validator
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const { clamp, lerp, mix, rgba, norm3, cross3, sub3, dot3 } = C;

  /* gunung/lembah dari sudut dihedral bertanda pada keadaan sedikit terlipat; panel diorientasikan seragam dulu
     (luas bertanda pola datar positif), lalu tanda dot(nA x nB, arah tepi di A) memisahkan gunung dan lembah */
  function tandaiMV(m) {
    const ar = (f) => { let a = 0; for (let k = 0; k < f.length; k++) { const p = m.datar[f[k]], q = m.datar[f[(k + 1) % f.length]]; a += p[0] * q[1] - q[0] * p[1]; } return a; };
    m.panel.forEach((f, i) => { if (ar(f) < 0) m.panel[i] = f.slice().reverse(); });
    const nrm = (f) => { const q = f.map((i) => m.titik[i]); return norm3(cross3(sub3(q[1], q[0]), sub3(q[2], q[0]))); };
    const own = new Map(); m.panel.forEach((f, pi) => { for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length], key = a < b ? a + "," + b : b + "," + a; (own.get(key) || own.set(key, []).get(key)).push([pi, a, b]); } });
    for (const e of m.lipatan) {
      const key = e[0] < e[1] ? e[0] + "," + e[1] : e[1] + "," + e[0], ow = own.get(key) || [];
      if (ow.length < 2) { e[2] = "B"; continue; }
      const [pa, a, b] = ow[0], nA = nrm(m.panel[pa]), nB = nrm(m.panel[ow[1][0]]), d = sub3(m.titik[b], m.titik[a]);
      e[2] = dot3(cross3(nA, nB), d) > 0 ? "V" : "M";
    }
    return m;
  }

  /* ---------------- Miura-ori ---------------- */
  function miuraPos(o, th) {
    const a = o.a, b = o.b, g = o.gamma * RAD, ct = Math.cos(th), st = Math.sin(th), tg = Math.tan(g), q = Math.sqrt(1 + ct * ct * tg * tg);
    const H = a * st * Math.sin(g), S = (b * ct * tg) / q, L = a * Math.sqrt(1 - st * st * Math.sin(g) * Math.sin(g)), V = b / q;
    const P = [];
    // jarak kolom S menyusut ke 0 dan jarak baris L ke a cos(g): lembar memadat ke dua arah sekaligus
    for (let j = 0; j <= o.baris; j++) for (let i = 0; i <= o.kolom; i++) P.push([i * S, j * L + (i % 2) * V, (j % 2) * H]);
    return { P, dim: [o.kolom * S, o.baris * L + V, H] };
  }
  function miura(o = {}) {
    o = Object.assign({ kolom: 8, baris: 6, a: 1, b: 1, gamma: 60, lipat: 0.4 }, o);
    const th = clamp(o.lipat) * 89 * RAD, nx = o.kolom + 1, id = (i, j) => j * nx + i;
    const cur = miuraPos(o, th), flat = miuraPos(o, 0).P.map((p) => [p[0], p[1]]);
    const panel = [], lipatan = [], seen = new Set();
    for (let j = 0; j < o.baris; j++) for (let i = 0; i < o.kolom; i++) panel.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]);
    const addE = (p, q) => { const k = p < q ? p + "," + q : q + "," + p; if (!seen.has(k)) { seen.add(k); lipatan.push([p, q, null]); } };
    panel.forEach((f) => { for (let k = 0; k < 4; k++) addE(f[k], f[(k + 1) % 4]); });
    tandaiMV({ titik: miuraPos(o, 25 * RAD).P, datar: flat, panel, lipatan });
    return { nama: "miura", titik: cur.P, datar: flat, panel, lipatan, dim: cur.dim, th };
  }

  /* ---------------- Yoshimura ---------------- */
  function yoshimura(o = {}) {
    o = Object.assign({ N: 8, cincin: 6, R: 1, tinggi: 0.55, lipat: 0.4 }, o);
    const N = o.N, R = o.R, c = Math.cos(Math.PI / N), h0 = o.tinggi, dh = h0 * (1 - 0.86 * clamp(o.lipat));
    const disk = R * R * (1 - c) * (1 - c) + h0 * h0 - dh * dh, r = Math.min(R * 1.45, R * c + Math.sqrt(Math.max(0, disk)));
    const P = [], datar = [], id = (k, i) => k * N + ((i % N) + N) % N;
    const side = 2 * R * Math.sin(Math.PI / N), dW = side, dH = h0;   // pola datar: segitiga sama kaki
    for (let k = 0; k <= o.cincin; k++) for (let i = 0; i < N; i++) {
      const odd = k % 2, ph = TAU * i / N + (odd ? Math.PI / N : 0), rr = odd ? r : R;
      P.push([rr * Math.cos(ph), k * dh, rr * Math.sin(ph)]);
      datar.push([i * dW + (odd ? dW / 2 : 0), k * dH]);
    }
    const panel = [], lipatan = [];
    for (let k = 0; k < o.cincin; k++) for (let i = 0; i < N; i++) {
      const odd = k % 2;
      if (!odd) { panel.push([id(k, i), id(k, i + 1), id(k + 1, i)]); panel.push([id(k, i + 1), id(k + 1, i + 1), id(k + 1, i)]); lipatan.push([id(k, i), id(k + 1, i), "V"], [id(k, i + 1), id(k + 1, i), "V"]); }
      else { panel.push([id(k, i), id(k, i + 1), id(k + 1, i + 1)]); panel.push([id(k, i), id(k + 1, i + 1), id(k + 1, i)]); lipatan.push([id(k, i), id(k + 1, i + 1), "V"], [id(k, i), id(k + 1, i), "V"]); }
    }
    for (let k = 0; k <= o.cincin; k++) for (let i = 0; i < N; i++) lipatan.push([id(k, i), id(k, i + 1), k === 0 || k === o.cincin ? "B" : "M"]);
    return { nama: "yoshimura", titik: P, datar, panel, lipatan, silinder: true, N };
  }

  /* ---------------- Kresling ---------------- */
  function kresling(o = {}) {
    o = Object.assign({ N: 6, tingkat: 3, R: 1, tinggi: 0.9, lipat: 0.4, psi0: 30 }, o);
    const N = o.N, R = o.R, h0 = o.tinggi, psi0 = o.psi0 * RAD, h = h0 * (1 - 0.82 * clamp(o.lipat));
    // diagonal lembah dijaga: l^2 = 2R^2(1 - cos psi) + h^2 = tetap
    const l2 = 2 * R * R * (1 - Math.cos(psi0)) + h0 * h0, psi = Math.acos(clamp(1 - (l2 - h * h) / (2 * R * R), -1, 1));
    const P = [], datar = [], id = (k, i) => k * N + ((i % N) + N) % N, side = 2 * R * Math.sin(Math.PI / N);
    for (let k = 0; k <= o.tingkat; k++) for (let i = 0; i < N; i++) {
      const ph = TAU * i / N + k * psi; P.push([R * Math.cos(ph), k * h, R * Math.sin(ph)]);
      datar.push([i * side + k * side * (psi0 / (TAU / N)), k * h0]);
    }
    const panel = [], lipatan = [];
    for (let k = 0; k < o.tingkat; k++) for (let i = 0; i < N; i++) {
      panel.push([id(k, i), id(k, i + 1), id(k + 1, i)]); panel.push([id(k, i + 1), id(k + 1, i + 1), id(k + 1, i)]);
      lipatan.push([id(k, i + 1), id(k + 1, i), "V"], [id(k, i), id(k + 1, i), "M"]);
    }
    for (let k = 0; k <= o.tingkat; k++) for (let i = 0; i < N; i++) lipatan.push([id(k, i), id(k, i + 1), k === 0 || k === o.tingkat ? "B" : "M"]);
    return { nama: "kresling", titik: P, datar, panel, lipatan, silinder: true, N, psi, h };
  }

  /* ---------------- pemeriksaan ---------------- */
  /** galat isometri terhadap model acuan (bawaan: dirinya sendiri; pakai keadaan terbuka lipat 0): perubahan panjang tepi
      terbesar (relatif) dan ketidakdataran panel segi empat terbesar. Miura: ~1e-16 (kaku). Yoshimura/Kresling: > 0 (tidak kaku). */
  function cekIsometri(m, ref) {
    ref = ref || m; let tepi = 0, datar = 0;
    for (const [i, j] of m.lipatan) { const a = m.titik[i], b = m.titik[j], A = ref.titik[i], B = ref.titik[j]; const L0 = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); if (L0 > 1e-9) tepi = Math.max(tepi, Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - L0) / L0); }
    for (const f of m.panel) { if (f.length < 4) continue; const p = f.map((i) => m.titik[i]), n = norm3(cross3(sub3(p[1], p[0]), sub3(p[3], p[0]))), s = Math.hypot(...sub3(p[2], p[0])) || 1; datar = Math.max(datar, Math.abs(dot3(n, sub3(p[2], p[0]))) / s); }
    return { tepi, datar };
  }
  /** validator pola datar (Maekawa, Kawasaki, dua warna) lewat MGP.origamiFold.lib.validasiPola */
  function validasi(m) {
    const V = MGP.origamiFold && MGP.origamiFold.lib && MGP.origamiFold.lib.validasiPola;
    if (!V) return { ok: null, peringatan: ["origami-fold.js belum dimuat"] };
    if (m.silinder) {
      // silinder: pola datar berulang ke samping; titik di tepi kiri/kanan disambung lewat salinan bergeser satu periode
      const N = m.N, per = m.datar[N - 1][0] - m.datar[0][0] + (m.datar[1][0] - m.datar[0][0]);
      const titik = m.datar.slice(), lip = [];
      const tambah = (p) => { titik.push(p); return titik.length - 1; };
      const kunci = new Map();
      const salin = (j, geser) => { const kk = j + "|" + geser; let q = kunci.get(kk); if (q == null) { q = tambah([titik[j][0] + geser, titik[j][1]]); kunci.set(kk, q); } return q; };
      for (const [i, j, k] of m.lipatan) {
        const A = titik[i], B = titik[j];
        if (Math.abs(B[0] - A[0]) > per / 2) { const geser = B[0] > A[0] ? -per : per; lip.push([i, salin(j, geser), k], [salin(i, -geser), j, k]); }
        else lip.push([i, j, k]);
      }
      // titik tengah satu kolom saja yang dinilai (yang lain berulang): batasi ke titik tanpa salinan
      const r = V({ titik, lipatan: lip, batas: titik.map((p, q) => q).filter((q) => q >= m.datar.length || titik[q][1] <= 1e-9 || titik[q][1] >= Math.max(...m.datar.map((d) => d[1])) - 1e-9) });
      return r;
    }
    return V({ titik: m.datar, lipatan: m.lipatan });
  }

  /* ---------------- gambar ---------------- */
  function bangun(o, u) {
    const p = Object.assign({}, o, { lipat: u });
    return o.pola === "kresling" ? kresling(p) : o.pola === "yoshimura" ? yoshimura(p) : miura(p);
  }
  function tekstur(S, m) {
    const o = S.opts; if (!o.isi || m.nama !== "miura") return null;
    if (S.cache.tex) return S.cache.tex;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of m.datar) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const k = 1024 / Math.max(x1 - x0, y1 - y0), w = Math.ceil((x1 - x0) * k), h = Math.ceil((y1 - y0) * k), c = C.offscreen(w, h), g = c.getContext("2d");
    g.save(); o.isi(g, w, h); g.restore();
    return (S.cache.tex = { c, k, x0, y0, y1 });
  }
  // segitiga bertekstur: peta afin dari 3 titik tekstur ke 3 titik layar
  function triTex(g, img, s0, s1, s2, d0, d1, d2) {
    const du1 = s1[0] - s0[0], dv1 = s1[1] - s0[1], du2 = s2[0] - s0[0], dv2 = s2[1] - s0[1], det = du1 * dv2 - du2 * dv1; if (Math.abs(det) < 1e-9) return;
    const dx1 = d1[0] - d0[0], dy1 = d1[1] - d0[1], dx2 = d2[0] - d0[0], dy2 = d2[1] - d0[1];
    const a = (dx1 * dv2 - dx2 * dv1) / det, c = (dx2 * du1 - dx1 * du2) / det, b = (dy1 * dv2 - dy2 * dv1) / det, d = (dy2 * du1 - dy1 * du2) / det;
    const e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - d * s0[1];
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, gr = (p) => [p[0] + Math.sign(p[0] - cx) * 0.6, p[1] + Math.sign(p[1] - cy) * 0.6];
    const q0 = gr(d0), q1 = gr(d1), q2 = gr(d2);
    g.save(); g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.closePath(); g.clip();
    g.transform(a, b, c, d, e, f); g.drawImage(img, 0, 0); g.restore();
  }
  function gambarModel(g, S, m, t) {
    const o = S.opts, W = S.W, H = S.H;
    // pusatkan
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of m.titik) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
    const cen = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    const yaw = (val(o.yaw, t) + (o.putar || 0) * t) * RAD, pitch = val(o.pitch, t) * RAD;
    // skala tetap dari keadaan terbuka supaya lembar tidak "membesar" saat terlipat
    const span = S.cache.span || (S.cache.span = (() => { const m0 = bangun(o, 0); let a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9]; for (const p of m0.titik) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k], p[k]); b[k] = Math.max(b[k], p[k]); } return Math.max(b[0] - a[0], b[1] - a[1], b[2] - a[2]); })());
    const sc = Math.min(W, H) * o.ukuran / span, cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // dunia: miura dibaringkan (z = tinggi lipat ke atas layar); silinder berdiri (y ke atas)
    const toV = (p) => { let x = p[0] - cen[0], y = p[1] - cen[1], z = p[2] - cen[2]; if (!m.silinder) { const t2 = y; y = z; z = t2; } else { y = -y; }
      const X = x * cyw + z * syw, Z0 = -x * syw + z * cyw, Y = m.silinder ? y * cp - Z0 * sp : -y * cp - Z0 * sp, Z = m.silinder ? y * sp + Z0 * cp : -y * sp + Z0 * cp; return [X, Y, Z]; };
    const V = m.titik.map(toV), f = 6 * span, prj = (q) => { const k = f / (f - q[2]); return [W / 2 + q[0] * sc * k, H * 0.52 + q[1] * sc * k]; };
    const Pp = V.map(prj), L = norm3(o.cahaya), tex = tekstur(S, m);
    if (o.bayangan) { g.save(); g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.ellipse(W / 2, H * 0.52 + (m.silinder ? span * 0.55 : span * 0.42) * sc, span * sc * 0.5, span * sc * 0.07, 0, 0, TAU); g.fill(); g.restore(); }
    const faces = m.panel.map((fc, i) => { const q = fc.map((k) => V[k]); const n = norm3(cross3(sub3(q[1], q[0]), sub3(q[q.length - 1], q[0]))); return { fc, i, z: q.reduce((s, p) => s + p[2], 0) / q.length, n }; }).sort((a, b) => a.z - b.z);
    for (const F of faces) {
      const pts = F.fc.map((k) => Pp[k]), front = m.silinder ? F.n[2] >= 0 : F.n[2] <= 0, lit = o.ambient + (1 - o.ambient) * Math.abs(dot3(F.n, L));
      const base = front ? o.depan : o.belakang, col = mix(base, "#120a06", clamp(1 - lit) * 0.85);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]); g.closePath();
      g.fillStyle = col; g.fill();
      if (tex && front) {
        const T = (k) => [(m.datar[k][0] - tex.x0) * tex.k, (tex.y1 - m.datar[k][1]) * tex.k];   // v pola ke atas, v kanvas ke bawah
        const fc = F.fc; g.save();   // tekstur opak (tumpang tindih klip tidak menumpuk), lalu bayangan sebagai lapisan sendiri
        triTex(g, tex.c, T(fc[0]), T(fc[1]), T(fc[2]), Pp[fc[0]], Pp[fc[1]], Pp[fc[2]]); triTex(g, tex.c, T(fc[0]), T(fc[2]), T(fc[3]), Pp[fc[0]], Pp[fc[2]], Pp[fc[3]]); g.restore();
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]); g.closePath();
        g.fillStyle = rgba("#120a06", clamp(1 - lit) * 0.85); g.fill();
      }
      g.strokeStyle = rgba("#000000", 0.12); g.lineWidth = 0.6; g.lineJoin = "round"; g.stroke();
    }
    if (o.garis) {
      // garis lipat memudar saat lembar hampir datar (kertas terbuka hanya menyisakan bekas lipatan tipis)
      g.save(); g.globalAlpha = clamp(0.2 + 3 * (m.lipatU == null ? 1 : m.lipatU));
      for (const [i, j, k] of m.lipatan) { if (k === "B") continue; const a = Pp[i], b = Pp[j]; g.strokeStyle = k === "M" ? o.warnaM : o.warnaV; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      g.restore();
    }
  }
  const val = (v, t) => (typeof v === "function" ? v(t) : Array.isArray(v) ? C.key(v, t) : +v || 0);
  function lipatAt(o, t) {
    if (o.lipat != null) return clamp(val(o.lipat, t));
    const e = typeof o.ease === "function" ? o.ease : typeof o.ease === "string" && /^(pegas|spring)(\.|$)/.test(o.ease) ? C.pegasEase(o.ease.split(".")[1] || "sigap") : C.ease[o.ease] || C.ease.inOut;
    const a = o.mulai, d = o.durasiLipat, D = o.duration;
    if (o.gerak === "buka") return 1 - e(C.seg(t, a, a + d));
    if (o.gerak === "tutup") return e(C.seg(t, a, a + d));
    const half = (D - 2 * a) / 2; return t < D / 2 ? e(C.seg(t, a, a + Math.min(d, half))) : 1 - e(C.seg(t, D / 2, D / 2 + Math.min(d, half)));
  }

  // internal module name stays "lipatPola" (it seeds the default rng: renaming it would change renders)
  const api = C.defineModule("lipatPola", {
    aliases: { pattern: "pola", fold: "lipat", motion: "gerak", start: "mulai", foldDuration: "durasiLipat", rotate: "putar",
      cols: "kolom", rows: "baris", rings: "cincin", levels: "tingkat", cylinderHeight: "tinggi", front: "depan", back: "belakang",
      lines: "garis", fill: "isi", light: "cahaya", size: "ukuran", shadow: "bayangan", colorM: "warnaM", colorV: "warnaV" },
    valueAliases: { gerak: { open: "buka", close: "tutup", pingpong: "bolak" } },
    size: [1280, 720],
    duration: (o) => o.duration || 6,
    defaults: { pola: "miura", lipat: null, gerak: "bolak", mulai: 0.4, durasiLipat: 2, ease: "inOut", yaw: -28, pitch: 52, putar: 0,
      kolom: 8, baris: 6, a: 1, b: 1, gamma: 60, N: null, cincin: 6, tingkat: 3, R: 1, tinggi: null,
      depan: "#e8553d", belakang: "#f4ecd8", garis: true, warnaM: "rgba(60,20,10,.55)", warnaV: "rgba(255,248,236,.7)", isi: null,
      cahaya: [-0.4, -0.7, 0.6], ambient: 0.45, ukuran: 0.8, bg: "#1c2236", bayangan: true, label: true, font: "ui-monospace, Menlo, Consolas, monospace", duration: 6 },
    setup(S) {
      const o = S.opts;
      if (o.N == null) o.N = o.pola === "kresling" ? 6 : 8;
      if (o.tinggi == null) o.tinggi = o.pola === "kresling" ? 0.9 : 0.55;
      if (o.pola !== "miura" && o.pitch === 52) o.pitch = 18;
      const m0 = bangun(o, 0.5); S.validasi = validasi(m0); S.iso = cekIsometri(bangun(o, 0.6), bangun(o, 0));
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H;
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
      const u = lipatAt(o, t), m = bangun(o, u); m.lipatU = u;
      gambarModel(g, S, m, t);
      if (o.label) {
        const fs = Math.max(12, Math.round(H / 34)), v = S.validasi; g.font = `600 ${fs}px ${o.font}`; g.fillStyle = "rgba(251,246,234,.9)"; g.textAlign = "left"; g.textBaseline = "alphabetic";
        g.fillText(`${o.pola} \u00b7 lipat ${(u * 100).toFixed(0)} %`, 16, H - 16 - fs * 1.4);
        g.font = `500 ${Math.round(fs * 0.8)}px ${o.font}`; g.fillStyle = "rgba(251,246,234,.65)";
        g.fillText(`Maekawa/Kawasaki/2 warna: ${v.ok === null ? "-" : v.ok ? "lolos" : v.peringatan.length + " peringatan"} \u00b7 galat tepi ${(S.iso.tepi * 100).toFixed(1)} %`, 16, H - 16);
      }
      S.kurva = { lipat: u };
    },
  });
  api.lib = { miura, yoshimura, kresling, cekIsometri, validasi, bangun, triTex, lipatAt };
  Object.assign(api, { miura, yoshimura, kresling, checkIsometry: cekIsometri, validate: validasi, cekIsometri, validasi });
  Object.assign(api.lib, { checkIsometry: cekIsometri, validate: validasi, build: bangun });
  MGP.foldPattern = MGP.lipatPola = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
