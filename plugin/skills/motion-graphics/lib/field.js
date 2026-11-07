/**
 * MGP.field (old name MGP.medan) \u2014 medan gaya prosedural ala MoGraph: cloner + effector + falloff field, deterministik.
 *   T'_i(t) = T_i + dT * F(x_i, t)      (F di [0, 1], satu per effector; efek dijumlahkan berurutan)
 * Ribuan elemen digerakkan tanpa keyframe per objek: cukup gerakkan medannya.
 *
 * Cloner (MGP.medan.klon.*) -> [{i, n, u (indeks 0..1), x, y, z, skala, skalaX, skalaY, rot, opasitas, tinggi, warna, ch}]
 *   grid({kolom, baris, jarak: [dx, dy], pusat: [x, y]}), linier({n, dari: [x, y], ke: [x, y]}),
 *   radial({n, pusat, r, sudut0}), teks(ctx, teks, {font, ukuran, pusat: [x, y], jarakHuruf})  (glif diukur dengan measureText)
 * Field (MGP.medan.field.*) -> (klon, t) => 0..1. Angka parameter boleh fungsi (t) => nilai.
 *   linier({dari, ke, lembut}) gradasi sepanjang sumbu;  bola({pusat, r, lembut}) radial;  noise({skala, kecepatan, seed});
 *   gelombang({panjang, kecepatan, sumbu}) rumus sin;  konstan(v);  gabung([f...], "maks" | "kali" | "tambah" | "min");  balik(f)
 *   indeks((u, t) => 0..1) dari indeks klon (untuk efek berurutan / stagger)
 * Effector (MGP.medan.efek.*) -> {terapkan(klon, t)}:
 *   polos(field, dT)               T + dT * F
 *   acak(field, dT, {seed})        T + dT * F * acak_i (acak_i di [-1, 1], berseed per klon)
 *   rumus(field, dT, (i, n, t) => k)  T + dT * F * k  (mis. Math.sin((i / n + t) * 2 * Math.PI))
 *   tunda(field, dT, {jeda})       medan dibaca pada t - jeda (gema waktu)
 *   pegas(field, dT, {pegas: "memantul", jendela: 1.6})  medan dilewatkan pegas teredam: F_eff = integral F(t - s) h(s) ds
 *                                   (h = respons impuls pegas; dihitung ulang dari t setiap frame, jadi aman di-seek)
 *   dT: {x, y, z, skala, skalaX, skalaY, rot (derajat), opasitas, tinggi, warna (0..1 campur warna -> warna2)}; nilai boleh fungsi (klon) => angka
 * terapkan(klon, efektor[], t) -> salinan klon yang sudah berubah.  gambar(g, klon, bentuk, opsi) -> gambar klon.
 *
 * Modul kanvas MGP.medan.create(target, opsi):
 *   mode "grid" | "batang" | "teks" | "bebas"   demo siap pakai; "bebas" memakai opsi klon + efektor
 *   data [..] (batang), label [..], teks "..." (teks), warna, latar, font, duration 6
 *   klon (array atau (S) => array), efektor (array atau (S) => array), bentuk "kotak" | "lingkaran" | "batang" | "huruf" | fungsi
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const { clamp, lerp, mix, smooth01 } = C;
  const V = (v, t) => (typeof v === "function" ? v(t) : v);

  /* ---------------- cloner ---------------- */
  const dasar = (i, n, x, y, ext) => Object.assign({ i, n, u: n > 1 ? i / (n - 1) : 0, x, y, z: 0, skala: 1, skalaX: 1, skalaY: 1, rot: 0, opasitas: 1, tinggi: 1, warna: 0 }, ext || {});
  const klon = {
    grid(o = {}) { const nx = o.kolom || 10, ny = o.baris || 6, d = o.jarak || [40, 40], c = o.pusat || [0, 0], out = []; const n = nx * ny;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out.push(dasar(j * nx + i, n, c[0] + (i - (nx - 1) / 2) * d[0], c[1] + (j - (ny - 1) / 2) * d[1], { gx: i, gy: j }));
      return out; },
    linier(o = {}) { const n = o.n || 10, a = o.dari || [0, 0], b = o.ke || [100, 0]; return Array.from({ length: n }, (_, i) => { const k = n > 1 ? i / (n - 1) : 0; return dasar(i, n, lerp(a[0], b[0], k), lerp(a[1], b[1], k)); }); },
    radial(o = {}) { const n = o.n || 12, c = o.pusat || [0, 0], r = o.r || 100, a0 = (o.sudut0 || -90) * RAD; return Array.from({ length: n }, (_, i) => { const a = a0 + TAU * i / n; return dasar(i, n, c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), { rot: a / RAD + 90 }); }); },
    teks(g, teks, o = {}) {
      const s = String(teks || ""), size = o.ukuran || 64, font = `${o.tebal || 800} ${size}px ${o.font || "system-ui, Segoe UI, Arial, sans-serif"}`, sp = o.jarakHuruf || 0, c = o.pusat || [0, 0];
      g.save(); g.font = font; const ws = [...s].map((ch) => g.measureText(ch).width + sp); g.restore();
      const tot = ws.reduce((a, b) => a + b, 0) - sp; let x = c[0] - tot / 2; const chars = [...s], n = chars.length;
      return chars.map((ch, i) => { const k = dasar(i, n, x + ws[i] / 2 - sp / 2, c[1], { ch, w: ws[i] - sp, font, ukuran: size }); x += ws[i]; return k; });
    },
  };

  /* ---------------- field (falloff) ---------------- */
  const field = {
    konstan: (v = 1) => () => v,
    linier(o = {}) { return (k, t) => { const a = V(o.dari || [0, 0], t), b = V(o.ke || [100, 0], t), dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1; const u = ((k.x - a[0]) * dx + (k.y - a[1]) * dy) / L2; const v = clamp(u); return o.lembut === false ? (u >= 0.5 ? 1 : 0) : 1 - smooth01(v); }; },
    bola(o = {}) { return (k, t) => { const c = V(o.pusat || [0, 0], t), r = Math.max(1e-6, V(o.r == null ? 150 : o.r, t)), lb = clamp(V(o.lembut == null ? 0.6 : o.lembut, t), 0.001, 1); const d = Math.hypot(k.x - c[0], k.y - c[1]) / r; return 1 - smooth01((d - (1 - lb)) / lb); }; },
    noise(o = {}) { const sd = o.seed == null ? 7 : o.seed; return (k, t) => { const s = V(o.skala || 0.01, t), sp = V(o.kecepatan == null ? 0.6 : o.kecepatan, t); const a = C.noise1(k.x * s + sd * 3.1 + t * sp), b = C.noise1(k.y * s - sd * 1.7 - t * sp * 0.7 + 40); return clamp(0.5 + 0.5 * (a + b) / 2 * 1.6); }; },
    gelombang(o = {}) { return (k, t) => { const L = V(o.panjang || 300, t), sp = V(o.kecepatan == null ? 1 : o.kecepatan, t), ax = o.sumbu === "y" ? k.y : o.sumbu === "r" ? Math.hypot(k.x, k.y) : k.x; return 0.5 + 0.5 * Math.sin(TAU * (ax / L - t * sp)); }; },
    indeks(f) { return (k, t) => clamp(f(k.u, t, k)); },
    gabung(list, mode = "maks") { return (k, t) => { const v = list.map((f) => f(k, t)); return clamp(mode === "kali" ? v.reduce((a, b) => a * b, 1) : mode === "tambah" ? v.reduce((a, b) => a + b, 0) : mode === "min" ? Math.min(...v) : Math.max(...v)); }; },
    balik(f) { return (k, t) => 1 - f(k, t); },
  };

  /* ---------------- effector ---------------- */
  const KEYS = ["x", "y", "z", "skala", "skalaX", "skalaY", "rot", "opasitas", "tinggi"];
  function tambah(k, dT, w) {
    if (!w) return;
    for (const p of KEYS) if (dT[p] != null) k[p] += (typeof dT[p] === "function" ? dT[p](k) : dT[p]) * w;
    if (dT.warna != null) k.warna = clamp(k.warna + (typeof dT.warna === "number" ? dT.warna : 1) * w);
  }
  const efek = {
    polos: (f, dT) => ({ terapkan(k, t) { tambah(k, dT, f(k, t)); } }),
    acak: (f, dT, o = {}) => { const sd = o.seed == null ? 11 : o.seed; return { terapkan(k, t) { const w = f(k, t); if (!w) return; const r = (q) => C.hash(k.i * 17.13 + sd * 3.7 + q) * 2 - 1, out = {}; for (const p of KEYS) if (dT[p] != null) out[p] = dT[p] * r(KEYS.indexOf(p)); tambah(k, out, w); } }; },
    rumus: (f, dT, fn) => ({ terapkan(k, t) { tambah(k, dT, f(k, t) * fn(k.i, k.n, t, k)); } }),
    tunda: (f, dT, o = {}) => ({ terapkan(k, t) { tambah(k, dT, f(k, t - (typeof o.jeda === "function" ? o.jeda(k) : o.jeda == null ? 0.3 : o.jeda))); } }),
    pegas(f, dT, o = {}) {
      // respons impuls pegas h(s) = d/ds langkah(s); F_eff(t) = sum F(t - s) h(s) ds, jendela tetap -> fungsi murni t
      const p = o.pegas || "memantul", W = o.jendela || 1.6, n = o.sampel || 48, ds = W / n, h = [];
      for (let q = 0; q < n; q++) h.push(C.pegas((q + 1) * ds, p) - C.pegas(q * ds, p));
      const tot = h.reduce((a, b) => a + b, 0) || 1;
      return { terapkan(k, t) { let s = 0; for (let q = 0; q < n; q++) s += f(k, t - (q + 0.5) * ds) * h[q]; tambah(k, dT, s / tot * (o.normal === false ? tot : 1)); } };
    },
  };
  function terapkan(list, efektor, t) {
    return list.map((k0) => { const k = Object.assign({}, k0); for (const e of efektor || []) e.terapkan(k, t); return k; });
  }

  /* ---------------- gambar ---------------- */
  function gambar(g, list, bentuk, o = {}) {
    const c0 = o.warna || "#d6b06a", c1 = o.warna2 || "#e8553d", s0 = o.ukuran || 24;
    for (const k of list) {
      if (k.opasitas <= 0.001) continue;
      g.save(); g.globalAlpha = clamp(k.opasitas); g.translate(k.x, k.y); g.rotate(k.rot * RAD); g.scale(k.skala * k.skalaX, k.skala * k.skalaY);
      g.fillStyle = mix(c0, c1, k.warna);
      if (typeof bentuk === "function") bentuk(g, k, o);
      else if (bentuk === "lingkaran") { g.beginPath(); g.arc(0, 0, s0 / 2, 0, TAU); g.fill(); }
      else if (bentuk === "batang") { const w = o.lebar || s0, hh = (o.tinggiMaks || 300) * Math.max(0, k.tinggi); g.beginPath(); g.roundRect ? g.roundRect(-w / 2, -hh, w, hh, Math.min(w * 0.18, hh / 2)) : g.rect(-w / 2, -hh, w, hh); g.fill(); }
      else if (bentuk === "huruf") { g.font = k.font; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillText(k.ch, 0, 0); }
      else { g.beginPath(); g.roundRect ? g.roundRect(-s0 / 2, -s0 / 2, s0, s0, s0 * 0.18) : g.rect(-s0 / 2, -s0 / 2, s0, s0); g.fill(); }
      g.restore();
    }
  }

  /* ---------------- demo / modul ---------------- */
  function demoGrid(S) {
    const { W, H } = S, d = Math.min(W, H) / 11;
    const list = klon.grid({ kolom: Math.floor(W / d) - 1, baris: Math.floor(H / d) - 1, jarak: [d, d], pusat: [W / 2, H / 2] });
    const jalur = (t) => [W * (0.15 + 0.7 * (0.5 - 0.5 * Math.cos(t * TAU / S.opts.duration))), H * (0.5 + 0.22 * Math.sin(t * TAU * 2 / S.opts.duration))];
    const bola = field.bola({ pusat: jalur, r: Math.min(W, H) * 0.32, lembut: 0.8 });
    return { list, bentuk: "kotak", gopsi: { ukuran: d * 0.5, warna: S.opts.warna, warna2: S.opts.warna2 },
      efektor: [efek.pegas(bola, { skala: 0.9, rot: 90, warna: 1 }, { pegas: "memantul" }), efek.acak(field.noise({ skala: 0.004, kecepatan: 0.4 }), { y: d * 0.12, rot: 12 })] };
  }
  function demoBatang(S) {
    const o = S.opts, { W, H } = S, data = o.data || [34, 58, 41, 77, 63, 92, 50, 70], n = data.length, mx = Math.max(...data), lebar = W * 0.72 / n;
    const list = klon.linier({ n, dari: [W * 0.14 + lebar / 2, H * 0.84], ke: [W * 0.86 - lebar / 2, H * 0.84] }).map((k, i) => Object.assign(k, { tinggi: 0, nilai: data[i] / mx }));
    // medan linier menyapu dari kiri ke kanan; batang tumbuh setinggi datanya lewat pegas (tiap batang menyusul sesudah dilewati)
    const sapu = field.linier({ dari: (t) => [lerp(W * 0.1, W * 1.25, smooth01((t - 0.3) / 2.2)), 0], ke: (t) => [lerp(W * 0.1, W * 1.25, smooth01((t - 0.3) / 2.2)) - W * 0.25, 0] });
    const tumbuh = efek.pegas(field.balik(sapu), { tinggi: (k) => k.nilai, warna: (k) => k.nilai }, { pegas: "memantul" });
    return { list, bentuk: "batang", gopsi: { lebar: lebar * 0.62, tinggiMaks: H * 0.62, warna: o.warna, warna2: o.warna2 }, efektor: [tumbuh], label: true, data, mx };
  }
  function demoTeks(S, g) {
    const o = S.opts, { W, H } = S, size = Math.round(Math.min(W, H) * 0.18);
    const list = klon.teks(g, o.teks || "MEDAN GERAK", { ukuran: size, pusat: [W / 2, H * 0.58], font: o.font, jarakHuruf: size * 0.04 });
    const sx = (t) => lerp(W * 0.12, W * 1.35, smooth01((t - 0.2) / 2.2)), masuk = field.linier({ dari: (t) => [sx(t), 0], ke: (t) => [sx(t) - W * 0.3, 0] });
    const sembunyi = masuk;   // F = 1 untuk glif yang belum dilewati sapuan (masih tersembunyi)
    return { list, bentuk: "huruf", gopsi: { warna: o.warna, warna2: o.warna2 },
      efektor: [efek.pegas(sembunyi, { y: size * 0.9, opasitas: -1, rot: -25, skala: -0.4 }, { pegas: "memantul" }),
        efek.rumus(field.konstan(1), { y: -size * 0.06 }, (i, n, t) => Math.sin((i / n) * TAU - t * 3)),
        efek.polos(field.bola({ pusat: (t) => [W * (0.5 + 0.4 * Math.sin(t * 0.9)), H * 0.55], r: size * 2.2 }), { warna: 1, skala: 0.12 })] };
  }
  const api = C.defineModule("medan", {   // internal name kept (default rng seed)
    aliases: { shape: "bentuk", effector: "efektor", drawOptions: "gambarOpsi", clone: "klon", bg: "latar", text: "teks",
      color: "warna", color2: "warna2", labels: "label" },
    valueAliases: { mode: { bars: "batang", text: "teks", free: "bebas" }, bentuk: { box: "kotak", circle: "lingkaran", bar: "batang", letter: "huruf" } },
    size: [1280, 720],
    duration: (o) => o.duration || 6,
    defaults: { mode: "grid", data: null, label: null, teks: null, warna: "#d6b06a", warna2: "#e8553d", latar: "#12172a", font: "system-ui, Segoe UI, Arial, sans-serif", klon: null, efektor: null, bentuk: "kotak", gambarOpsi: null, duration: 6 },
    setup(S) { S.ready = S.opts.mode === "teks" && C.fontsReady ? C.fontsReady([]) : null; },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H;
      if (o.latar) { g.fillStyle = o.latar; g.fillRect(0, 0, W, H); }
      let D;
      if (o.mode === "bebas") D = { list: typeof o.klon === "function" ? o.klon(S, g) : o.klon || [], efektor: typeof o.efektor === "function" ? o.efektor(S) : o.efektor || [], bentuk: o.bentuk, gopsi: o.gambarOpsi || {} };
      else D = S.cache.D || (S.cache.D = o.mode === "batang" ? demoBatang(S) : o.mode === "teks" ? demoTeks(S, g) : demoGrid(S));
      const out = terapkan(D.list, D.efektor, t);
      gambar(g, out, D.bentuk, D.gopsi);
      if (D.label) {
        const fs = Math.round(H * 0.035); g.font = `600 ${fs}px ${o.font}`; g.textAlign = "center"; g.fillStyle = "rgba(244,236,216,.85)";
        out.forEach((k, i) => { const hh = D.gopsi.tinggiMaks * k.tinggi; g.globalAlpha = clamp(k.tinggi / Math.max(1e-3, k.nilai) * 1.2); g.fillText(Math.round(D.data[i]), k.x, k.y - hh - fs * 0.5); g.fillText((o.label && o.label[i]) || "", k.x, k.y + fs * 1.3); });
        g.globalAlpha = 1;
      }
      S.kurva = out.length ? { klon0: out[0].y, klonTengah: out[Math.floor(out.length / 2)].skala * out[Math.floor(out.length / 2)].skalaY, tinggi0: out[0].tinggi } : {};
    },
  });
  Object.assign(api, { clone: klon, effect: efek, apply: terapkan, draw: gambar, klon, field, efek, terapkan, gambar });
  api.lib = { klon, field, efek, terapkan, gambar, demoGrid, demoBatang, demoTeks, clone: klon, effect: efek, apply: terapkan, draw: gambar };
  MGP.field = MGP.medan = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
