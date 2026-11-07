# Rujukan: template T1-T15 (varian Bahasa Indonesia)

Bagian dari skill `motion-graphics-pro`. Varian Indonesia dari `template.md` (versi kanonik, bahasa Inggris). Dipakai
untuk pengguna berbahasa Indonesia: isian T1, pesan gerbang, laporan, dan serah terima T10 ditulis dalam Bahasa
Indonesia dari file ini. `mgp new --lang id` (atau `MGP_LANG=id`) mengambil T1 dan T10 dari sini. Isi, nomor, dan
urutan sama dengan `template.md`; bila ada perubahan, ubah kedua file.

Dibaca saat: mengisi brief, pembanding, konsep, shot list, prompt, log job, data scene, kerangka komposisi, tipografi, checklist, handover, keyframe, pecah lapis, set gerak, pixel art, origami. Prompt gambar (T4, T11-T13) tetap bahasa Inggris karena dikirim ke model gambar.

## 16. Template

### T1 Brief

| Isian | Jawaban |
|---|---|
| Judul; tujuan dan pesan utama | <isi> |
| Platform, rasio, durasi | <Reels/TikTok/Shorts>, <9:16/16:9>, <s> (batas platform dicek <tgl>) |
| Audiens | <usia, konteks tonton, bahasa> |
| VO; musik dan SFX | <suara, bahasa>; <musik ya/tidak, gaya SFX> |
| Referensi | Suka / tidak: <link + alasan> |
| Aturan konten | <figur terlarang, cara menggambarkan, sumber wajib> |
| Konsep; personifikasi | <jenis yang disukai/dihindari>; <dipakai/tidak, benda mana> |
| Brand, palet, font; aset | <isi>; <job lama, logo, file> |
| Tenggat; anggaran kredit; output | <tgl>; Higgsfield/ElevenLabs <kredit>; <resolusi>, 24 fps (pilihan frame: bab 2.0) |

### T2 Pembanding gaya + konfirmasi elemen

| Aspek | Rekomendasi: <gaya A> | Opsi B: <gaya> | Opsi C: <gaya> |
|---|---|---|---|
| Palet (hex + porsi) | <isi> | <isi> | <isi> |
| Material, bentuk, tipografi | <isi> | <isi> | <isi> |
| Gerak, transisi | <isi> | <isi> | <isi> |
| Kelebihan / kekurangan | <isi> | <isi> | <isi> |
| Cocok untuk; contoh visual | <isi>; <file> | <isi>; <file> | <isi>; <file> |

| Elemen | Usulan | OK/revisi |
|---|---|---|
| Palet; tipografi | <hex + porsi>; <font, ukuran, bingkai> | |
| Gaya gambar; tokoh | <kit, tepi, bayangan>; <proporsi, sequence> | |
| Gerak; transisi; kamera | 24 fps, on twos, masuk 0,17 s; <per maksud>; <push/pull, k> | |
| Efek; format; audio | <grain, cahaya>; <rasio, zona aman>; <VO, SFX, loudness> | |

### T2a Konsep (3 per video, berdampingan)

| Aspek | Rekomendasi: <konsep A> | Opsi B: <konsep> | Opsi C: <konsep> |
|---|---|---|---|
| Jenis (maks 2, bab 2.2) | <isi> | <isi> | <isi> |
| Benda pembawa makna; personifikasi | <benda>; <ya: benda mana / tidak> | <isi> | <isi> |
| Hook frame 0 | <yang tampil di frame 0> | <isi> | <isi> |
| Alur 4-6 adegan | 1 <...>; 2 <...>; 3 <...>; 4 <...> | <isi> | <isi> |
| Gerak pembukti | <hubungan yang berubah> | <isi> | <isi> |
| Payoff adegan akhir | <benda pembawa makna kembali> | <isi> | <isi> |
| Cabang aset; pustaka gerak | <A/B/C per adegan>; <aksi yang dipakai ulang> | <isi> | <isi> |
| Estimasi kredit | <hitungan bab 15> | <isi> | <isi> |
| Risiko aturan konten | <isi> | <isi> | <isi> |
| Kelebihan / kekurangan | <isi> | <isi> | <isi> |

Setelah tabel: baik-buruk tiap konsep dalam 1-2 kalimat, lalu pertanyaan G1 di chat + interaktif.

### T3 Shot list / beat sheet

| No | Detik | Kata VO pemicu | Set | Cabang | POV | Hero | Aksi | Aset | Transisi masuk | Teks |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0,00-2,40 | "<kata>" (1,20) | <kit> | A/B/C | Pengamat | <hero> | <aksi + detik> | <kode job> | Cut (hook) | <kicker / headline / kunci> |

### T4 Prompt Higgsfield

Susunan tiap prompt: CANVAS, isi (PIECES/SET/CHARACTER/ROW/PEOPLE), STYLE (blok 4.3, sudah memuat larangan teks/logo), ONLY. Potongan putih memakai "flat plain mid-blue background".

```text
(a) KIT 21:9
CANVAS: Wide 21:9 sheet on a flat plain pure white background. <N> separate cut-paper pieces for one location (<lokasi, era>) in <2-3> loose rows, white space of at least one tenth of the sheet width between pieces, each piece complete and not touching another, all at one consistent scale.
PIECES: 1. <potongan, ukuran relatif orang dewasa, tampak, menghadap frame left/right>. 2. <potongan>.
ONLY: Show only the listed pieces on the plain background; add nothing else.

(b) PLATE 9:16
CANVAS: Vertical 9:16 scene, <eye-level/top-down>, one-point perspective, vanishing point at the horizontal centre about <45> percent from the top. Empty scene: no people. Keep <the lower third> clear and low-detail for pieces added later.
SET: <lokasi, waktu, cahaya dari frame left/right, benda tetap dan posisinya>.
ONLY: Show only what this prompt describes; add nothing else.

(c) SEQUENCE 6 FRAME
CANVAS: Wide 21:9 sheet on a flat plain pure white background. Six full-body frames of the same character in one horizontal row, six equal columns, identical size, feet on one shared baseline, a white gutter of at least a quarter column between figures.
CHARACTER: <deskripsi identik: usia, tubuh, rambut, pakaian dan warna, sepatu, aksesori>. Paper collage figure with natural human proportions; each limb is one smooth continuous paper shape. <Smooth blank face.>
FRAMES (side view, facing frame right; every body part changes in every frame): F1 contact, front heel down, rear toe pushing off; F2 down, weight on the front leg, knee bent; F3 passing, rear leg swinging past the standing leg; F4 contact, other leg in front; F5 down; F6 passing. Arms swing opposite to the legs; head and hair follow one beat later.
ONLY: Show only the six figures on the white background; add nothing else.
Wave (front view): F1 arm relaxed; F2 lifting, elbow bent; F3 hand at shoulder, palm out; F4 above head tilted to frame left; F5 upright; F6 tilted to frame right.

(d) FACE KIT
CANVAS: Wide 21:9 sheet on a flat plain pure white background, two rows (three rows for a face-bearing object), one scale for a face <lebar> wide, generous white space.
ROW 1: eight cut-paper mouths in <warna bibir>: closed relaxed; wide open showing upper teeth; medium open, lips stretched; rounded open; small tight rounded; lips pressed together; lower lip under the upper front teeth; closed gentle smile.
ROW 2: six pairs of cut-paper eyebrows in <warna rambut>: neutral; raised; frowning; worried; angry; happy.
ROW 3 (face-bearing object only): six pairs of cut-paper eyes: open; closed as a curved line; wide open; half-lidded; looking frame left; looking frame right.
ONLY: Show only the pieces listed in the rows above on the white background; add nothing else.

(e) CROWD TWO-STATE
CANVAS: Wide 21:9 sheet on a flat plain pure white background. <N> people in one row; each person twice side by side, calm on the left and reacting on the right; identical size, feet on one shared baseline, a white gap between people.
PEOPLE: 1. <usia, pakaian, penutup kepala, warna, menghadap frame left/right>; calm: <pose>; reacting: <surprised, hands raised, leaning back>. 2. <orang berikutnya, lengkap>.
ONLY: Show only these figures on the white background; add nothing else.

(f) MODEL SHEET 21:9
CANVAS: Wide 21:9 sheet on a flat plain pure white background. Left two thirds: the same character in four full-body views in one row (front, three-quarter facing frame right, side facing frame right, back), identical scale, feet on one shared baseline, white gutters between views. Right third: three close-ups at a larger scale: <head and face>, <hands>, <costume detail or signature prop>.
CHARACTER: <deskripsi identik 4.4 butir 2>. Benda berwajah: <benda>, plain with no face.
ONLY: Show only these views and close-ups on the white background; add nothing else.
```

### T5 Log job Higgsfield

| No | Isi | Rasio | Resolusi | Job ID | Kredit |
|---|---|---|---|---|---|
| K1 | Kit <lokasi>, <N> potongan | 21:9 | 2K | <id> | 2,75 |

Kredit batch: <X>. Total sesi: <Y>. Saldo sebelum <A>, sesudah <B> (tool `balance`, <tgl jam>). Referensi: K1 dari <job anchor gaya>. Kiriman 429 = "gagal, tanpa kredit, dikirim ulang".

### T6 Data rakit scene (JSON)

```json
{
  "id": "s03", "dur": 5.2, "pivot": [360, 760], "pov": "observer",
  "camera": [{"t": 0, "z": 1.0, "x": -14}, {"t": 2.4, "z": 1.05, "x": 14}, {"t": 5.2, "z": 1.05, "x": 14}],
  "meta": {"cloud1": {"w": 412, "h": 150}, "walk1": {"w": 479, "h": 880, "anchor": [246.9, 879]}},
  "layers": [
    {"id": "cloud1", "cx": 250, "bottom": 182, "scale": 0.8, "k": 0.15, "t0": 0.25, "from": "r", "off": 360, "boil": 0.7},
    {"id": "building", "cx": 362, "bottom": 1015, "scale": 0.86, "k": 0.70, "t0": 1.80, "from": "pop", "boil": 0.7},
    {"id": "hero", "k": 0.95, "t0": 0.0, "fade": 0, "scale": 0.842, "boil": 1.0,
     "seq": {"intro": [], "loop": ["walk1", "walk2", "walk3", "walk4", "walk5", "walk6"]},
     "keys": [{"t": 0, "cx": -60, "bottom": 1165}, {"t": 1.83, "cx": 360, "bottom": 1165}]}
  ],
  "texts": [{"t0": 3.0, "t1": 5.0, "words": [{"id": "s03-w0", "t": 3.3, "key": true, "hl": "s03-hl0"}]}],
  "sfx": [{"id": "N03", "t": 0.88}],
  "trIn": {"type": "tear-wipe", "dur": 0.5}, "trOut": {"type": "cut", "dur": 0},
  "sources": []
}
```

Field: `meta` = w, h (+ anchor) untuk SETIAP sprite yang dipakai; `cx`, `bottom` = titik bawah-tengah di dunia 720 w (sequence memakai `meta.anchor`); `from` = b, t, l, r, pop, atau kosong; `fade` default 0,2 s; `seq.intro` sekali lalu `seq.loop` diulang (12 gambar/s); `words[].t` = timestamp transkrip; `sources` = sumber angka, koordinat, dalil. Lapis cabang B yang sudah dicocokkan ke frame penuh ditulis dengan `"full": true` (digambar di 0,0 ukuran 720 x 1280). Benda berwajah memakai `"face": {"anchor": [x, y], "w": <lebar wajah>, "mood": [[t, "<state>"]], "vis": "visemes/<blok>_<tokoh>.json"}` (6.7, 6.8).

### T7 Kerangka komposisi mgp (format kompatibel HyperFrames; `mgp new` menulis versi satu adegan)

```html
<!-- index.html: host scene + audio saja -->
<!doctype html>
<html><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="<total>"
  data-fps="24" data-width="1080" data-height="1920">
  <div id="s01" data-composition-id="s01" data-composition-src="compositions/s01.html"
    data-start="0" data-duration="<d1>" data-track-index="1" data-track-kind="graphics"
    data-width="1080" data-height="1920" style="z-index:1"></div>
  <!-- s02: data-start = <d1 - durasi transisi>, z-index 2 -->
  <audio id="mix" class="clip" src="assets/audio/mix.wav" data-start="0" data-track-index="9" data-volume="1"></audio>
</div>
<script>window.__timelines["main"] = mgp.motion.timeline({ paused: true });</script>
</body></html>
```

```html
<!-- compositions/s01.html -->
<template>
<style>
  #root{position:absolute;inset:0;overflow:hidden}
  #s01-sky{position:absolute;inset:0;background:linear-gradient(#2C67B0,#78ACDC 33%,#D9E8F2 61%)}
  .s01-pc{position:absolute;left:0;top:0;transform-origin:0 0;opacity:0;filter:drop-shadow(0 6px 10px rgba(45,28,12,.32))}
  #s01-grain{position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:.10}
</style>
<div id="root" data-composition-id="s01" data-width="1080" data-height="1920">
  <div id="s01-sky"></div>
  <div id="s01-world" data-layout-allow-overflow>
    <img id="s01-cloud1" class="s01-pc" src="assets/pieces/k1/cloud1.png">
    <img id="s01-walk1" class="s01-pc" src="assets/seq/walk/walk1.png"><!-- satu img per potongan/frame; order = lapis -->
  </div>
  <img id="s01-grain" src="assets/fx/grain_1080x1920.png" data-layout-ignore>
</div>
<script>
const SC = {/* data T6 */}, S = 1080 / 720, q = t => Math.floor(t * 12) / 12;   // on twos
const ent = (t, t0) => t < t0 ? null : Math.exp(-(t - t0) / 0.17);
const zk = (z, k) => Math.pow(z, 0.25 + 0.75 * k);
const boil = (f, i, n, a) => Math.sin(f * 12.9898 + i * 78.233 + n) * (a || 0);
const cl = u => Math.min(1, Math.max(0, u)), sm = u => (u = cl(u), u * u * (3 - 2 * u));
function key(K, t, e) { let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
  const a = K[i], b = K[i + 1], u = e((t - a.t) / (b.t - a.t)), o = {};
  for (const p in a) if (p !== "t") o[p] = a[p] + (b[p] - a[p]) * u; return o; }
function place(el, L, t, f, i, c, m) {
  const e = ent(t, L.t0);
  if (e === null || (L.t1 != null && t >= L.t1)) return mgp.motion.set(el, { opacity: 0 });
  const o = (L.off || 0) * e, s = L.from === "pop" ? 1 - 0.08 * e : 1;
  const dx = L.from === "l" ? -o : L.from === "r" ? o : 0, dy = L.from === "b" ? o : L.from === "t" ? -o : 0;
  const [px, py] = SC.pivot, z = zk(c.z, L.k), sz = L.scale * s * z, [ax, ay] = m.anchor || [m.w / 2, m.h];
  const X = px + (L.cx + dx + boil(f, i, 1, L.boil) - px) * z + c.x * L.k;
  const Y = py + (L.bottom + dy + boil(f, i, 2, L.boil) - py) * z, fd = L.fade ?? 0.2;
  mgp.motion.set(el, { x: S * (X - ax * sz), y: S * (Y - ay * sz), scale: S * sz, opacity: fd > 0 ? cl((t - L.t0) / fd) : 1 });
}
function draw(tr) {
  const t = q(tr), f = Math.floor(tr * 12), c = key(SC.camera, t, sm);
  SC.layers.forEach((L, i) => {
    if (!L.seq) return place(document.getElementById("s01-" + L.id), L, t, f, i, c, SC.meta[L.id]);
    const k = Math.max(0, Math.floor((t - L.t0) * 12)), A = L.seq.intro, B = L.seq.loop;
    const cur = k < A.length ? A[k] : B[(k - A.length) % B.length];
    const M = Object.assign({}, L, L.keys ? key(L.keys, t, cl) : {});
    [...new Set(A.concat(B))].forEach(n => { const el = document.getElementById("s01-" + n);
      n === cur ? place(el, M, t, f, i, c, SC.meta[n]) : mgp.motion.set(el, { opacity: 0 }); });
  });
}
document.fonts.ready.then(() => {
  const tl = mgp.motion.timeline({ paused: true }), P = { t: 0 };
  tl.to(P, { t: SC.dur, duration: SC.dur, ease: "none", onUpdate: () => draw(P.t) }, 0);
  /* tween teks T8 di sini */
  draw(0);
  window.__timelines["s01"] = tl;
});
</script>
</template>
```

Setelah menulis: `mgp check index.html` (atau `--json`), `mgp frame` di tengah scene. Cahaya hangat (3.2) = div radial-gradient di atas world; bila `drop-shadow` bermasalah, bayangan dipanggang ke PNG.

### T8 Tipografi kinetik

Markup + CSS masuk scene T7, JS di titik komentar T7 (ukuran 1080 w).

```html
<style>
  .s01-card{position:absolute;left:66px;top:180px;padding:30px 39px;background:#FBF6EA;
    box-shadow:-6px 8px 0 #E3B04B,0 9px 18px rgba(43,26,12,.32)}
  .s01-kick{font:600 27px Poppins;letter-spacing:.3em;color:rgba(20,20,20,.75)}
  .s01-head{font:700 75px/1.15 Poppins;color:#141414}
  .s01-w{display:inline-block;opacity:0}
  .s01-kw{position:relative;isolation:isolate;font-family:"Playfair Display";font-style:italic;font-size:1.12em}
  .s01-hl{position:absolute;left:-12px;right:-12px;top:34%;height:58%;z-index:-1;background:#F1C75B;
    transform-origin:0 50%;clip-path:polygon(0 10%,100% 0,98% 100%,1% 90%)}
</style>
<div id="s01-card" class="s01-card"><div class="s01-kick">TIPS HARIAN</div>
  <div class="s01-head"><span id="s01-w0" class="s01-w">Mulai</span>
  <span id="s01-w1" class="s01-w s01-kw"><i id="s01-hl1" class="s01-hl"></i>sekarang</span></div></div>
```

```js
const F = 1 / 24, T = SC.texts[0];
tl.fromTo("#s01-card", { x: -630, rotation: -1.2, opacity: 0 },
  { x: 0, rotation: -1.2, opacity: 1, duration: 0.6, ease: "expo.out" }, T.t0);
T.words.forEach(w => {
  tl.fromTo("#" + w.id, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 5 * F, ease: "power2.out" }, w.t - F);
  if (!w.key) return;
  tl.fromTo("#" + w.hl, { scaleX: 0 }, { scaleX: 1, duration: 6 * F, ease: "power2.out" }, w.t + F);
  tl.fromTo("#" + w.id, { scale: 1 }, { scale: 1.055, duration: 3 * F, ease: "sine.out",
    yoyo: true, repeat: 1 }, w.t - 3 * F);                       // puncak pulse di w.t
});
tl.to("#s01-card", { opacity: 0, duration: 0.18, ease: "power2.in" }, T.t1 - 0.18);
tl.set("#s01-card", { opacity: 0 }, T.t1);
// garis bawah (pengganti strip): path dash bab 9.3, dashoffset 110 ke 0 selama 12 * F mulai w.t + 4 * F
```

### T9 Checklist review + lembar kontak

| No | Cek | Cara |
|---|---|---|
| 1 | Potongan bersih: tanpa fringe putih, kotak abu, bintik, tepi magenta | `mgp frame --scale 2` lalu crop tepi, latar kontras |
| 2 | Kaki menapak, bayangan kontak, satu arah cahaya | Crop kaki tiap pose |
| 3 | Tanpa teks AI; geografi dan Screen directions benar | Crop; baris lokasi |
| 4 | Hero sekitar 70%, minimal 3 bidang, properti berkonteks | Frame tahan |
| 5 | On twos, stagger, settle 14-16 frame, tahan minimal 25% | `mgp contact --from <a> --to <b> --n 8` |
| 6 | Kata di timestamp VO, tahan 0,5 s + 0,3 s/kata, zona aman | Frame tiap kata |
| 7 | Arab: U+FDF4/U+FDFA tampil, harakat sesuai sumber | Crop |
| 8 | Tepi layer tersembunyi; ukuran tokoh sama; kaki tidak meluncur; mulut/alis di wajah | Frame ujung kamera; 3 frame berurutan |
| 9 | Transisi bersih di 25/50/75% (per blok) | `mgp frame --t <waktu>` di tiga waktu |
| 10 | Dead air: diam + statis > 0,8 s | silencedetect + freezedetect |
| 11 | -14 LUFS, -1,5 dBTP, SFX -5 dB di bawah VO | loudnorm summary |
| 12 | Scene berdampingan beda arketipe/warna; data dan dalil bersumber | Kontak blok; `sources` |
| 13 | `mgp check --json` 0 GALAT; durasi, fps, resolusi benar; placeholder berlabel | CLI; ffprobe |
| 14 | Cabang B: komposit diam lapis = keyframe (berdampingan) | Lembar banding |
| 15 | Benda berwajah: ganti mood lewat antisipasi, squash, wajah baru, settle; mata memimpin, bagian tidak serempak | `mgp contact --from --to` di sekitar waktu ganti mood, 8 frame |
| 16 | Tokoh sama dengan model sheet (proporsi, warna, kostum); tinggi tokoh sama antar adegan dan episode | Banding berdampingan sprite dan model sheet di skala sama |
| 17 | Lip-sync: m/b/p rapat, vokal sesuai huruf, X di jeda; stiker di wajah | Frame di setiap kata ber-m/b/p dalam blok + klip bersuara |
| 18 | Gaya gambar kode: kartu STYLE dipatuhi, daftar larangan bersih | Banding berdampingan dengan style frame yang disetujui |
| 19 | Kurva gerak: tidak ada gerak linier tak sengaja; patah (pop) hanya di tumbukan/cut; squash dengan volume tetap; tidak ada mulai/berhenti mendadak tanpa alasan | `mgp curves index.html --from <a> --to <b> -o review/curves.png` (patokan: `motion-graphics/references/advanced-principles.md` bab 13 dan tabel patokan) |
| 20 | Blocking disetujui sebelum spline: pose kunci terbaca, staging dan timing kasar benar | `mgp contact index.html --var blocking=true --times poses -o review/blocking.png` |

```bash
ffmpeg -i review.mp4 -vf "fps=2,scale=360:-1,tile=6x4" -frames:v 1 sheet_s03.jpg
ffmpeg -i review.mp4 -af silencedetect=noise=-35dB:d=0.8 -vf freezedetect=n=0.003:d=0.8 -f null - 2>&1 | grep -E "silence_|freeze_"
ffmpeg -i final.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=summary -f null -
```

Rutinitas: kontak per shot (`mgp contact`, 8 frame) dan per blok (2 fps), lalu crop full-res di titik kontak. Pilot: lembar blocking (`--times poses`) dulu, lalu kurva (`mgp curves`) setelah spline.

### T9a Rujukan QC per jenis aset (syarat LAPOR)

Cek dari skill lain tidak disalin; Claude membuka bab rujukan saat jenis aset itu dipakai. P0 = merusak baca atau kontrak (bab 12); LAPOR hanya bila semua P0 lolos.

| Jenis aset di adegan | Cek yang dijalankan | P0 |
|---|---|---|
| Potongan kertas, set, lapis cabang B | T9 1-4, 14 | T9 1, 3, 14 |
| Tokoh sequence sheet | T9 2, 5, 8, 16 + `motion-graphics` bab 9 butir 1 (kaki tidak meluncur, 3 frame berurutan), 4 (loop tanpa loncatan), 9 (tidak serempak, frame akhir tidak mati) | T9 2, 8, 16; mg 9 butir 1, 4 |
| Tokoh vektor rig | `vector-character` bab 11 butir 1-32 + `motion-graphics` bab 9 butir 0-16 | vc 11 butir 9, 17; mg 9 butir 0, 1, 3 |
| Benda berwajah | T9 8, 15, 16, 17 | T9 8, 15 |
| Gambar kode gaya baru | T9 18 | T9 18 |
| Peta dan rute | Bab 9 + T9 3, 12 | Koordinat bersumber; rasio peta tidak ditarik |
| Teks, dalil, Arab | T9 6, 7, 12 | T9 7; dalil bersumber |
| Audio | T9 10, 11 | T9 11 |
| Blok, transisi, render | T9 9, 13 | T9 13 |
| Gerak setelah spline (pilot G4 dan blok baru) | T9 5, 19, 20 + patokan `motion-graphics/references/advanced-principles.md` | T9 20 (pilot); temuan kurva yang tidak disengaja = P1 |

Format laporan LAPOR:

| Blok/shot | Jenis aset | Cek dijalankan | Hasil (angka) | P0 | Kelemahan terlihat |
|---|---|---|---|---|---|
| <b2 s05> | <jenis> | <nomor cek> | <angka hasil cek> | <lolos/tidak> | <tulis jujur> |

### T10 Handover

```markdown
# Serah terima <proyek> <episode>
## Status <tgl jam>
Tahap: <nomor + nama>. Gerbang terakhir: G<n> (<menunggu/lolos tgl>). Blok terkunci: <daftar>. Blok berjalan: <nama>.
Lingkungan: <Claude Code / komputer sendiri: render jalan | claude.ai: tanpa Node 22+, Chrome/Chromium, atau ffmpeg tidak ada render, jadi render di Claude Code atau di komputer sendiri>.
## Hasil Review <tgl jam> (RENCANA, belum dikerjakan)
1. <detik/shot>: <permintaan pengguna, kata-kata pengguna bila penting>
## Update <tgl jam> - dikerjakan
- File, perubahan, perintah, kiriman: <path, angka penting, render/snapshot, file baru (rentang)>
## Aset Higgsfield
Tabel T5 + file tujuan; saldo <sisa> (tool balance, <tgl jam>).
## Pustaka gerak
Aksi baru: <tokoh, aksi, job, lolos T9a tgl>.
## Langkah berikut dan pertanyaan terbuka
1. <langkah>; <opsi + biaya, menunggu pengguna>
## Prompt pembuka sesi berikutnya
"Lanjutkan <proyek> <episode>. Baca skill motion-graphics-pro, lalu <path handover> bagian terakhir dulu. Tahap: <tahap>, blok <nama>. Tugas: <tugas>. Higgsfield hanya setelah izin + cek saldo; render penuh hanya setelah saya tulis 'render'."
```

### T11 Keyframe cabang B (9:16 2K)

```text
CANVAS: Vertical 9:16 handcrafted paper collage diorama, <kamera, titik hilang dalam persen>. Built from clearly separated depth layers with small gaps between groups, so each layer can be cut out later.
LAYER PLAN (frame terms, percent of frame): 1. <langit/atap, y 0-35%>. 2. <ujung lorong, x 40-60%, y 30-45%>. 3. <deret kiri, x 0-40%>. 4. <deret kanan, x 60-100%>. 5. <lantai terbuka, y 45-100%, jalur tengah kosong>. 6. <orang latar, wilayah, arah hadap>. 7. <properti depan kiri>. 8. <properti depan kanan>.
DETAIL: medium detail; small goods grouped in clusters; foreground objects cover at most a third of what is behind them.
STYLE: <blok STYLE 4.3>.
ONLY: Show only what this prompt describes; add nothing else.
```

### T12 Lembar pecah lapis (21:9 2K, keyframe dilampirkan)

```text
Layer-separation sheet. COPY from the attached keyframe, do not redraw. Wide 21:9 sheet, four equal vertical 9:16 panels separated by thin white gutters; inside each panel the background is flat solid magenta #FF00FF with no texture, shadow or outline. Every panel uses exactly the keyframe's framing: same scale, position, pose and facing direction for everything that is kept.
Panel 1 KEEP <lapis + wilayah persen>. ERASE <benda yang dihapus>. FILL <lapis belakang: continue only this surface; lapis lain: no fill>.
Panel 2 KEEP ... ERASE ... FILL ...
Panel 3 KEEP ... ERASE ... FILL ...
Panel 4 KEEP ... ERASE ... FILL ...
Keep the original paper textures, colours and light. No readable text, letters, numbers, symbols, logos or watermarks.
```

### T13 Set gerak (21:9 2K)

```text
Stop-motion frame set on a flat plain pure white background: <N> frames of <benda/tokoh> in one row, identical size and position in every frame, same baseline, white gutters between frames; only <bagian yang bergerak> changes: F1 <...>, F2 <...>, F3 <...>. STYLE: <blok STYLE 4.3>. ONLY: Show only these frames; add nothing else.
```

### T14 Pixel art (sprite, palet terbatas) (Versi 2.1)

| Isian | Aturan |
|---|---|
| Kanvas asli | Gambar di resolusi kecil, misalnya 160 x 90 (16:9) atau 90 x 160 (9:16); tokoh sekitar 32-48 piksel tinggi. |
| Palet | 8-16 warna tetap, ditulis sebagai daftar hex; setiap piksel memakai salah satunya, tanpa gradasi halus. |
| Garis dan bayangan | Garis tepi 1 piksel gelap; bayangan satu tingkat warna; gradasi langit memakai dither kotak-kotak. |
| Sprite sheet | Satu baris per gerak: diam 2-4 gambar, jalan 6-8 gambar, lompat 4-6 gambar; ukuran sel sama, titik kaki sama. |
| Gerak | 8-12 gambar per detik (stepped, tanpa interpolasi); posisi dan kamera selalu di piksel utuh. |
| Perbesar | Skala bulat (x3, x4, x6) dengan nearest neighbor; tidak boleh dihaluskan atau diputar bebas. |
| Cek | Tidak ada piksel campuran di tepi, tidak ada piksel separuh, palet tidak bertambah, kaki tidak meluncur. |

### T15 Origami (kertas terlipat, buka-lipat) (Versi 2.1)

| Isian | Aturan |
|---|---|
| Bentuk | Setiap benda dan tokoh disusun dari bidang datar (segitiga, layang-layang) dengan garis lipat yang jelas. |
| Warna kertas | Satu warna per lembar; sisi terang dan sisi gelap per lipatan (selisih 10-20%); sisi balik kertas krem. |
| Garis lipat | Garis tipis lebih terang di lipatan gunung, lebih gelap di lipatan lembah; tanpa garis tinta tebal. |
| Latar | Kertas kraft bertekstur halus, gunung dan pohon dari kertas terlipat, bayangan lembut di bawah lapisan. |
| Buka-lipat | Bidang berputar pada garis lipatnya satu per satu (jeda 0,02-0,05 s), 0,4-0,6 s per bidang; sisi balik terlihat saat berbalik. |
| Contoh gerak | Bangau: persegi, segitiga, dasar burung, bangau jadi; tahan tiap langkah 0,5 s, sayap mengepak kecil di akhir. |
| Gerak | 12 gambar per detik supaya terasa seperti stop motion kertas. |
