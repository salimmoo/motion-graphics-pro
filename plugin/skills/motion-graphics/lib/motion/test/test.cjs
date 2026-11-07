#!/usr/bin/env node
// Uji unit Gerak tanpa dependensi: node lib/motion/test/uji.cjs
//  1. ease: dibanding rumus acuan tertutup (ditulis terpisah di sini) dan nilai rujukan GSAP (rujukan.json)
//  2. parameter posisi
//  3. distribusi stagger (utils.distribute)
//  4. determinisme seek: urutan seek acak memberi nilai identik
//  5. skenario timeline (skenario.cjs) dibanding hasil GSAP yang tersimpan (harapan.json)
"use strict";
const path = require("path"), fs = require("fs");
globalThis.__gerakTanpaShim = true;
const G = require("../motion.js");
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "reference.json"), "utf8"));
let lulus = 0, gagal = 0;
const cek = (nama, ok, info) => { if (ok) lulus++; else { gagal++; console.log("GAGAL", nama, info === undefined ? "" : info); } };
const dekat = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-9);

// ---------------------------------------------------------------- 1. ease
const PI = Math.PI;
const inOut = (fin) => (p) => (p < 0.5 ? fin(2 * p) / 2 : 1 - fin(2 - 2 * p) / 2);
const out = (fin) => (p) => 1 - fin(1 - p);
const pw = (k) => (p) => Math.pow(p, k);
const backIn = (s) => (p) => p * p * ((s + 1) * p - s);
const bounceO = (p) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; };
const elO = (a, per) => { const A = Math.max(1, a), s = per / (2 * PI) * Math.asin(1 / A); return (p) => (p === 0 ? 0 : p === 1 ? 1 : A * Math.pow(2, -10 * p) * Math.sin((p - s) * 2 * PI / per) + 1); };
const expoIn = (p) => Math.pow(2, 10 * (p - 1)) * p + Math.pow(p, 6) * (1 - p); // varian GSAP 3.15: tepat 0 di p=0
const sineIn = (p) => (p === 1 ? 1 : 1 - Math.cos(p * PI / 2));
const circIn = (p) => 1 - Math.sqrt(1 - p * p);
const steps = (n) => (p) => Math.floor((n + 1) * Math.min(p, 1 - 1e-8)) / n;
const RUMUS = {
  none: (p) => p, linear: (p) => p, "power0.in": (p) => p,
  "power1.in": pw(2), "power1.out": out(pw(2)), "power1.inOut": inOut(pw(2)),
  "power2.in": pw(3), "power2.out": out(pw(3)), "power2.inOut": inOut(pw(3)), power2: out(pw(3)),
  "power3.in": pw(4), "power3.out": out(pw(4)), "power3.inOut": inOut(pw(4)),
  "power4.in": pw(5), "power4.out": out(pw(5)), "power4.inOut": inOut(pw(5)),
  "quad.out": out(pw(2)), "cubic.in": pw(3), "strong.inOut": inOut(pw(5)),
  "sine.in": sineIn, "sine.out": out(sineIn), "sine.inOut": inOut(sineIn), sine: out(sineIn),
  "expo.in": expoIn, "expo.out": out(expoIn), "expo.inOut": inOut(expoIn), expo: out(expoIn),
  "circ.in": circIn, "circ.out": out(circIn), "circ.inOut": inOut(circIn), circ: out(circIn),
  "back.in": backIn(1.70158), "back.out": out(backIn(1.70158)), "back.inOut": inOut(backIn(1.70158)), back: out(backIn(1.70158)),
  "back.out(3)": out(backIn(3)), "back.out(1.4)": out(backIn(1.4)), "back.inOut(1.3)": inOut(backIn(1.3)),
  "elastic.out": elO(1, 0.3), elastic: elO(1, 0.3), "elastic.in": out(elO(1, 0.3)), "elastic.inOut": inOut(out(elO(1, 0.45))),
  "elastic.out(1,0.45)": elO(1, 0.45), "elastic.out(1, 0.5)": elO(1, 0.5), "elastic.inOut(1, 0.5)": inOut(out(elO(1, 0.5))), "elastic.out(1.5,0.3)": elO(1.5, 0.3),
  "bounce.out": bounceO, bounce: bounceO, "bounce.in": out(bounceO), "bounce.inOut": inOut(out(bounceO)),
  "steps(4)": steps(4), "steps(1)": steps(1), "steps(3)": steps(3),
};
for (const nama of Object.keys(ref.ease)) {
  const f = G.parseEase(nama), r = RUMUS[nama];
  let maxR = 0, maxG = 0;
  ref.ps.forEach((p, i) => { const v = f(p); if (r) maxR = Math.max(maxR, Math.abs(v - r(p))); maxG = Math.max(maxG, Math.abs(v - ref.ease[nama][i])); });
  cek("ease " + nama + " vs rumus", !r || maxR < 1e-9, maxR);
  cek("ease " + nama + " vs rujukan GSAP", maxG < 1e-9, maxG);
}
cek("ease tak dikenal -> undefined", G.parseEase("tidakada") === undefined);
cek("cubic-bezier linear", dekat(G.parseEase("cubic-bezier(0,0,1,1)")(0.37), 0.37, 1e-6));
const cb = G.parseEase("cubic-bezier(0.42,0,0.58,1)");
cek("cubic-bezier ease-in-out simetris", dekat(cb(0.3) + cb(0.7), 1, 1e-6) && dekat(cb(0.5), 0.5, 1e-6));
G.registerEase("ujiKu", (p) => p * p);
cek("registerEase", G.parseEase("ujiKu")(0.5) === 0.25);

// ---------------------------------------------------------------- 2. parameter posisi
{
  const tl = G.timeline({ paused: true }), q = {};
  const pos = [[undefined, 0], ["+=0.5", 1.5], ["<", 1.5], ["<0.2", 1.7], [">", 2.7], [2, 2], ["-=0.3", 3.4], ["L", 4.4], ["L+=1", 5.4], ["L-=0.4", 4], ["<-0.2", 3.8], [">+=0.1", 4.9], ["<+=1", 5.9], ["M+=2", 8.9]];
  pos.forEach(([p, harap]) => {
    tl.to(q, { duration: 1 }, p);
    const st = tl.recent().startTime();
    cek("posisi " + p, dekat(st, harap, 1e-7), st + " != " + harap);
  });
  cek("label dibuat di akhir", tl.labels.L === 4.4 && tl.labels.M === 6.9, JSON.stringify(tl.labels));
  const t2 = G.timeline({ paused: true });
  t2.to(q, { duration: 1, delay: 0.5 }, 1);
  cek("delay menambah posisi", t2.getChildren()[0].startTime() === 1.5);
  t2.add("A", 3).call(() => {}, null, "A+=0.5");
  cek("add label & call", t2.labels.A === 3 && t2.recent().startTime() === 3.5);
}

// ---------------------------------------------------------------- 3. stagger / distribute
for (const [nama, d] of Object.entries(ref.distribute)) {
  const f = G.utils.distribute(d.cfg), arr = Array(d.n).fill(0);
  const v = arr.map((_, i) => f(i, null, arr));
  const mx = Math.max(...v.map((x, i) => Math.abs(x - d.v[i])));
  cek("distribute " + nama, mx < 1e-6, JSON.stringify(v) + " vs " + JSON.stringify(d.v));
}
{
  const a = [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
  const tl = G.timeline({ paused: true });
  tl.to(a, { v: 1, duration: 1, ease: "none", stagger: { amount: 0.6, from: "end" } }, 0);
  tl.totalTime(0.5);
  cek("stagger amount from end", JSON.stringify(a.map((o) => +o.v.toFixed(4))) === JSON.stringify([0, 0.1, 0.3, 0.5]), JSON.stringify(a.map((o) => o.v)));
  cek("durasi stagger", dekat(tl.duration(), 1.6, 1e-9), tl.duration());
}

// ---------------------------------------------------------------- 4. determinisme seek
{
  const bangun = () => {
    const o = { a: 0, b: 0, c: "0px 0px", w: "#000000" };
    const tl = G.timeline({ paused: true });
    tl.fromTo(o, { a: -5 }, { a: 10, duration: 1, ease: "power2.inOut" }, 0.2)
      .to(o, { a: 3, b: 7, duration: 1.3, ease: "back.out(2)" }, "<0.6")
      .from(o, { b: 40, duration: 0.5, ease: "elastic.out(1,0.4)" }, 2)
      .to(o, { c: "10px 20px", w: "#ff8800", duration: 1, repeat: 2, yoyo: true }, 0.5)
      .set(o, { b: 99 }, 3.2)
      .to(o, { a: "+=4", duration: 0.7 }, "-=0.2");
    const sub = G.timeline(); sub.to(o, { b: 5, duration: 0.6, ease: "sine.inOut", repeat: 1, yoyo: true }); tl.add(sub, 1.1);
    return { o, tl };
  };
  const snap = (o) => JSON.stringify([+o.a.toFixed(9), +o.b.toFixed(9), o.c, o.w]);
  const { o: o1, tl: t1 } = bangun();
  const D = t1.duration(), ts = Array.from({ length: 40 }, (_, i) => +(i * D / 39).toFixed(4));
  // acuan: halaman "baru" untuk setiap t
  const acuan = ts.map((t) => { const { o, tl } = bangun(); tl.totalTime(t); return snap(o); });
  let acak = 12345; const rnd = () => ((acak = (acak * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let beda = 0;
  for (let ulang = 0; ulang < 5; ulang++) {
    const urut = ts.map((t, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    for (const i of urut) { t1.totalTime(ts[i]); if (snap(o1) !== acuan[i]) beda++; }
  }
  for (let i = 0; i < ts.length; i++) { t1.totalTime(ts[i]); if (snap(o1) !== acuan[i]) beda++; }
  for (let i = ts.length - 1; i >= 0; i--) { t1.totalTime(ts[i]); if (snap(o1) !== acuan[i]) beda++; }
  cek("seek deterministik (40 titik x 7 urutan)", beda === 0, beda + " beda");
  // seek sama dua kali tidak mengubah apa pun
  t1.totalTime(1.7); const s1 = snap(o1); t1.totalTime(1.7); cek("seek idempoten", s1 === snap(o1));
}
{
  // DOM tidak ada: utils.random berseed
  G.utils.seed(42); const a = [G.utils.random(0, 100), G.utils.random(0, 100, 5)];
  G.utils.seed(42); const b = [G.utils.random(0, 100), G.utils.random(0, 100, 5)];
  cek("random berseed", JSON.stringify(a) === JSON.stringify(b) && b[1] % 5 === 0);
  cek("utils dasar", G.utils.clamp(0, 10, 12) === 10 && G.utils.mapRange(0, 10, 0, 100, 5) === 50 && G.utils.wrap(0, 10, 12) === 2 && G.utils.snap(5, 12) === 10 && G.utils.interpolate(0, 10, 0.25) === 2.5 && G.utils.interpolate("#000000", "#ffffff", 0.5) === "rgba(128,128,128,1)" && G.utils.clamp(0, 1)(2) === 1);
}

// ---------------------------------------------------------------- 5. skenario vs harapan GSAP
{
  const S = require("./scenarios.cjs");
  const H = JSON.parse(fs.readFileSync(path.join(__dirname, "expected.json"), "utf8"));
  for (const [nama, fn] of Object.entries(S)) {
    let v; try { v = JSON.stringify(fn(G)); } catch (e) { v = "ERR " + e.message; }
    cek("skenario " + nama, v === JSON.stringify(H[nama]), v + " vs " + JSON.stringify(H[nama]));
  }
}

// ---------------------------------------------------------------- 6. pegas dan inersia (v2.4, milik Gerak sendiri)
{
  // rumus acuan ditulis terpisah: x(t) = 1 - e^(-z w t) (cos wd t + z w / wd sin wd t)
  const acuan = (m, k, c, t) => { const w = Math.sqrt(k / m), z = c / (2 * Math.sqrt(m * k)), wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); };
  const P = G.pegas("memantul");
  cek("pegas memantul zeta", dekat(P.zeta, 12 / (2 * Math.sqrt(180)), 1e-12), P.zeta);
  for (const u of [0.1, 0.3, 0.5, 0.8]) cek("pegas memantul ease " + u, dekat(P.ease(u), acuan(1, 180, 12, u * P.duration), 0.006), P.ease(u));
  cek("pegas ease string", G.parseEase("pegas.memantul") === P.ease);
  cek("pegas ease (m,k,c)", dekat(G.parseEase("pegas(1, 180, 12)")(0.4), P.ease(0.4), 1e-12));
  cek("pegas sigap tanpa lewat", [...Array(101).keys()].every((i) => G.parseEase("pegas.sigap")(i / 100) <= 1 + 1e-9));
  cek("pegas berat zeta", dekat(G.pegas("berat").zeta, 1.5, 1e-9), G.pegas("berat").zeta);
  for (const n of ["memantul", "sigap", "berat"]) { const e = G.parseEase("pegas." + n); cek("pegas ujung " + n, e(0) === 0 && e(1) === 1); }
  // MGP.core memakai angka yang sama
  try {
    require("../../core/mgp-core.js"); const C = globalThis.MGP.core;
    for (const n of ["memantul", "sigap", "berat"]) cek("pegas core = gerak " + n, dekat(C.pegasEase(n)(0.37), G.parseEase("pegas." + n)(0.37), 1e-9) && dekat(C.pegasInfo(n).zeta, G.pegas(n).zeta, 1e-12));
  } catch (e) { cek("pegas core termuat", false, e.message); }
  // inersia: durasi + ekor, nilai akhir tepat, memantul lewat target bila tiba cepat, deterministik dari arah seek mana pun
  const o = { x: 0 }, tl = G.timeline({ paused: true });
  tl.to(o, G.inersia({ x: 100, duration: 0.5, ease: "power2.in" }, { amp: 0.05, freq: 2.5, decay: 5 }), 0);
  cek("inersia durasi", dekat(tl.duration(), 1.5, 1e-9), tl.duration());
  const seri = [0.55, 0.6, 0.7, 1.2, 0.3, 1.5, 0.6];
  const nilai = seri.map((t) => (tl.seek(t), o.x));
  cek("inersia lewat target", Math.max(...nilai) > 104, nilai);
  cek("inersia akhir tepat", (tl.seek(1.5), o.x) === 100);
  cek("inersia deterministik", (tl.seek(0.6), o.x) === nilai[1] && (tl.seek(0.2), tl.seek(0.6), o.x) === nilai[1]);
  const lambat = G.inersia({ x: 1, duration: 0.5, ease: "power3.out" }, {});
  cek("inersia ease out tanpa pantul", Math.abs(lambat.ease(0.5) - 1) < 1e-3, lambat.ease(0.5));
}

// ---------------------------------------------------------------- 6. batas frame k/fps (B1)
// set/tween yang ditaruh tepat di k/fps harus sudah berlaku saat di-seek ke k/fps (GSAP: ya), dan belum
// berlaku satu frame sebelumnya. Posisi anak dibulatkan 1e-8, waktu seek tidak: dulu terlambat 1 frame.
{
  let salah = [];
  for (const fps of [24, 25, 30, 60]) {
    for (let k = 1; k < 4 * fps; k++) {
      const o = { v: 0 }, tl = G.timeline({ paused: true });
      tl.set(o, { v: 1 }, k / fps); tl.set({}, {}, 5);
      tl.seek(k / fps); const a = o.v;
      tl.seek((k - 1) / fps); const b = o.v;
      if (a !== 1 || b !== 0) salah.push(fps + ":" + k + "=" + a + "/" + b);
    }
  }
  cek("set di k/fps berlaku di frame k (24/25/30/60 fps)", !salah.length, salah.slice(0, 5).join(" "));
  // kilat satu frame (pola contoh/kompat): set 1 di 1.5, set 0 di 1.5 + 1/24 -> hanya frame 36 yang menyala
  const o = { v: 0 }, tl = G.timeline({ paused: true });
  tl.set(o, { v: 1 }, 1.5).set(o, { v: 0 }, 1.5 + 1 / 24);
  const nyala = [35, 36, 37, 38].map((i) => (tl.seek(i / 24), o.v));
  cek("kilat satu frame 1/24", JSON.stringify(nyala) === "[0,1,0,0]", nyala);
  // repro B1 (laporan B): set di 1.5 + 1/24, seek 37/24 -> 1; dua set berurutan -> nilai set kedua
  const p = { v: 0 }, t2 = G.timeline({ paused: true }); t2.set(p, { v: 1 }, 1.5 + 1 / 24); t2.seek(37 / 24);
  cek("repro B1 set tunggal", p.v === 1, p.v);
  const q = { v: 0 }, t3 = G.timeline({ paused: true }); t3.set(q, { v: 1 }, 1.5).set(q, { v: 2 }, 1.5 + 1 / 24); t3.seek(37 / 24);
  cek("repro B1 dua set", q.v === 2, q.v);
  // timeline bersarang dengan offset tak-desimal: set di dalam anak tetap tepat frame
  salah = [];
  for (let k = 1; k < 48; k++) {
    const r = { v: 0 }, root = G.timeline({ paused: true }), c = G.timeline();
    c.set(r, { v: 1 }, k / 24); c.set({}, {}, 3); root.add(c, 7 / 24);
    root.seek((k + 7) / 24); const a = r.v; root.seek((k + 6) / 24); const b = r.v;
    if (a !== 1 || b !== 0) salah.push(k + "=" + a + "/" + b);
  }
  cek("set bersarang (offset 7/24) tepat frame", !salah.length, salah.slice(0, 5).join(" "));
  // tween yang mulai di k/fps: di frame k bernilai awal, di frame k+1 sudah bergerak, callback onStart sekali
  let mulai = 0;
  const w = { v: 0 }, t4 = G.timeline({ paused: true });
  t4.fromTo(w, { v: 10 }, { v: 20, duration: 10 / 24, ease: "none", immediateRender: false, onStart: () => mulai++ }, 13 / 24);
  t4.totalTime(12 / 24); const w12 = w.v; t4.totalTime(13 / 24); const w13 = w.v; t4.totalTime(14 / 24); const w14 = w.v; // totalTime: callback tidak ditekan (seek menekannya)
  cek("tween di k/fps: awal tepat di frame k", w12 === 0 && w13 === 10 && Math.abs(w14 - 11) < 1e-6, [w12, w13, w14]);
  cek("tween di k/fps: onStart sekali", mulai === 1, mulai);
}

// ---------------------------------------------------------------- v2.4 English names + two GSAP differences found in review
{
  cek("mgp.motion global = Gerak", globalThis.mgp && globalThis.mgp.motion === G && globalThis.Gerak === G);
  cek("spring.bouncy = pegas.memantul", G.parseEase("spring.bouncy")(0.37) === G.parseEase("pegas.memantul")(0.37) && G.spring("heavy").zeta === G.pegas("berat").zeta);
  cek("spring {mass, stiffness, damping} = {massa, kekakuan, redaman}", G.spring({ mass: 2, stiffness: 150, damping: 9 }).duration === G.pegas({ massa: 2, kekakuan: 150, redaman: 9 }).duration);
  cek("inertia tail = inersia ekor", G.inertia({ x: 1, duration: 1 }, { tail: 0.5 }).duration === 1.5 && G.inersia({ x: 1, duration: 1 }, { ekor: 0.5 }).duration === 1.5);
  // K1: elastic.out must land exactly on the end value even when start + duration has float noise (3.15 + 0.9)
  const e = { r: -14 }, te = G.timeline({ paused: true }).to(e, { r: 0, duration: 0.9, ease: "elastic.out(1.1, .35)" }, 3.15);
  const ev = [3.9, 4.04, 4.05, 4.1, 5].map((t) => { te.time(t); return +e.r.toFixed(6); });
  cek("K1 elastic.out ends exactly (GSAP values)", JSON.stringify(ev) === JSON.stringify([0.045348, -0.012758, 0, 0, 0]), ev);
  // K2: a tween stacked on a yoyo tween reads its start value on the first frame it renders (GSAP 3.13 values)
  G.config({ initFps: 50 });
  const d = { r: 0 }, t2 = G.timeline({ paused: true });
  t2.to(d, { r: 10, duration: 0.1, repeat: 3, yoyo: true }).to(d, { r: 50, duration: 0.5 }, 0.15);
  const dv = [0.16, 0.2, 0.3, 0.4, 0.5, 0.65].map((t) => { t2.time(t); return +d.r.toFixed(4); });
  cek("K2 stacked tween start = value at its first frame (GSAP values)", JSON.stringify(dv) === JSON.stringify([8.1266, 14.684, 28.636, 39.1, 46.076, 50]), dv);
  G.config({ initFps: 0 });
  const d0 = { r: 0 }, t0 = G.timeline({ paused: true });
  t0.to(d0, { r: 10, duration: 0.1, repeat: 3, yoyo: true }).to(d0, { r: 50, duration: 0.5 }, 0.15);
  t0.time(0.16);
  cek("K2 initFps 0 = exact start (old behaviour)", +d0.r.toFixed(3) === 9.183, d0.r);
  delete G.config().initFps;
}

console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
