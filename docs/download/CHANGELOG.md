# Changelog

## v2.4.2 (08-11-2026)

### Dokumen
- README: bagian baru **Free and Ultra** (tabel edisi gratis dan berbayar). Edisi gratis tetap lengkap.
- Rujukan audio, lipsync, `audit.mjs`, `location.mjs`, dan dokumen skill EN: label produksi internal diganti teks umum.

## v2.4.1 (07-11-2026)

Perbaikan dari dua produksi nyata (iklan 90 dan 85 detik dibuat penuh dengan skill ini).

### Render dan cek mutu
- `mgp contact` / `render` / `frame` aman dijalankan bersamaan: batas waktu (`--timeout`, `MGP_TIMEOUT`), deteksi crash renderer, galat saat konteks WebGL hilang (tidak lagi frame hitam dengan exit 0), peringatan frame hitam, browser dan profil dibersihkan saat Ctrl+C.
- Font yang hanya dipakai kanvas dimuat sebelum tangkap (`ctx.font` dicatat lalu `document.fonts.load`); `mgp check` memberi WARN bila kanvas jatuh ke font cadangan.
- `mgp curves`: tidak lagi salah menandai cermin, rotateY, atau elemen yang keluar dari `display:none`; kanal kanvas dianalisis di semua sampel; ±20 % lebih cepat.
- `mgp audit`: zona aman diukur dari huruf (bukan kotak blok); kata status gerbang dua bahasa diterima (approved/disetujui/lolos/passed).
- Opsi `MGP.packs.render` (`ar`, `lines`, …) didokumentasikan.

### Suara dan gambar
- `mgp voice speak --sentence N --tries K` mempertahankan take lama bila semua calon baru lebih buruk (`--force` untuk perilaku lama); skor tiap calon dicetak.
- Lafal untuk kata bertanda hubung, apostrof, dan singkatan (`ZIP-nya`, `Jum'at`, `Dr.`) kini cocok; entri lafal yang tidak terpakai diberi WARN.
- Despill warna kunci di tepi potongan (`--cutout`, `kit`, `slice`, `mgp cutout --key`), nyala bawaan; `--no-despill` untuk mematikan.
- `mgp install cutout`: rembg + model u2net (terkunci, sha256) untuk `mgp cutout`; petunjuk pasang jelas bila belum ada.
- Peringatan di rujukan audio/lipsync: potong audio menurut waktu kata audio final, bukan sesudah atempo.

### Contoh
- Galeri baru 12 klip (Atelier Kertas, kota malam, origami, pixel art, teks kinetik, peta topografi, liquid glass, tokoh 2D, benda bicara, simulasi 3D, talking head stiker, produk realistis) dan iklan 85 detik bergaya Product Demo UI di README dan situs.

### Pemasangan
- **Plugin Claude `motion-graphics-pro`**: ketiga skill kini satu plugin (`.claude-plugin/plugin.json`, `skills/motion-graphics-pro`, `skills/motion-graphics`, `skills/vector-character`). Pasang di claude.ai/Cowork lewat Customize → Plugins → Upload plugin (`download/motion-graphics-pro-plugin-v2.4.1.zip`) atau Add marketplace `salimmoo/motion-graphics-pro`; di Claude Code `/plugin marketplace add salimmoo/motion-graphics-pro` lalu `/plugin install motion-graphics-pro@salimmoo`. ZIP plugin menggantikan ZIP skill lengkap. SKILL.md memakai `${CLAUDE_SKILL_DIR}` untuk jalur mgp. Profil suara (`mgp voice`) kini disimpan di `~/.mgp/voice-profiles` (atau `$CLAUDE_PLUGIN_DATA/voice-profiles`), di luar folder plugin yang diganti saat pembaruan; folder lama di dalam skill tetap dibaca. mgp juga menemukan skill `motion-graphics` lewat `MGP_LIB`/`MGP_SKILLS_DIR`. `_shared/sync.py` mengenali tata letak plugin. Uji `_shared/tests` kini menulis PNG ke folder sementara.

## v2.4 (06-11-2026)

### Nama Inggris, pesan dwibahasa, `mgp audit`, dokumen Inggris (06-11-2026)
- **Ganti nama ke bahasa Inggris** (tabel nama lama ke nama baru di `render/README.md`, bagian "Compatibility"): CLI `rekam` → **`mgp`** dengan subperintah dan flag Inggris (`new`, `check`, `doctor`, `install`, `add --into`, `image`, `voice`, `align`, `curves`, `contact`, `preview`, `catalog`, `cutout`, `transcribe`, `export --format lottie`, `play`, ...); env `REKAM_*`/`KUAS_*` → `MGP_*`; mesin tween Gerak → **`mgp.motion`** (alias `Gerak`, `gerak`, `gsap`; ease `spring.bouncy|snappy|heavy`); modul `MGP.face`, `MGP.field`, `MGP.foldPattern`, `MGP.map`, `MGP.packs`; folder `blok/` → `blocks/`, `rujukan/` → `references/` (ketiga skill), `_bersama/` → `_shared/`, `suara/` → `voice/`, `paket/` → `packs/`; id, prop, dan nilai blok Inggris (`transitions/tear`, `text/rising-words`, ...); API blok `BLOCK.*`; berkas proyek `project.json`, `vo.words.json`, `vo.letters.json`, `pronunciations.txt`; modul Python `brush`, `image_ops`, `cavity`, `sync`, ... dengan shim nama lama.
- **Nama lama tetap jalan sebagai alias**: `render/src/names.mjs` menerjemahkan perintah, flag, nilai, dan env lama (satu baris catatan ke stderr); `bin/rekam.mjs` tetap ada; `~/.rekam`, `proyek.json`, `blok/blok-inti.js`, id blok lama, dan nama HyperFrames tetap dibaca. `mgp check` memberi WARN per jenis nama lama.
- **Pesan CLI dwibahasa**: bawaan Inggris, Indonesia dengan `MGP_LANG=id` atau locale `id` (katalog `render/i18n/en|id/`, Python `i18n_py.py`). Kata status ID tetap (LOLOS/AWAS/GALAT, CEK TELINGA).
- **`mgp audit <folder-proyek|komposisi.html> [--platform tiktok|reels|shorts|youtube|feed] [--json] [--skip ...] [--fast]`**: satu laporan sebelum render dengan putusan PASS/WARN/ERROR per kriteria: check, curves, zona aman teks per platform, VO (WER ternormal + CHECK BY EAR), loudness (-14 LUFS, puncak ≤ -1 dB), `project.json`, dan lisensi aset. Ditulis ke `review/audit.md` + `review/audit.json`; kode keluar 1 bila ERROR.
- **Dokumen skill berbahasa Inggris** (SKILL.md, `references/*.md`, `packs/INDEX.md`, README skrip) untuk ketiga skill; Claude tetap membalas dalam bahasa pengguna (Indonesia penuh untuk pengguna Indonesia). Templat dwibahasa: `references/template.md` (EN) + `references/template.id.md` (ID), dan `mgp new --lang id|en`. Teks bacaan klon suara tetap ada dalam ID dan EN. Data paket (`packs.json`, `motion-packs.html`) masih berbahasa Indonesia.
- **mgp.motion**: `elastic.out` kini tepat di nilai akhir, dan tween yang ditumpuk di atas tween yoyo membaca nilai awal pada kisi frame seperti GSAP (`config({initFps})`, `MGP_MOTION_INIT_FPS`). Regresi piksel 293 komposisi lama vs baru identik.

### Alur kerja
- **SKILL.md dipangkas menjadi inti** di ketiga skill (motion-graphics-pro 1011 → 211 baris, motion-graphics 558 → 106, vector-character 782 → 161). Inti memuat alur 9 langkah dengan gerbang G1–G5 dan aturan LAPOR, aturan wajib, cek terpenting, peta perintah, dan tabel rujukan yang menyebut kapan tiap file dibaca. Rincian dipindah utuh ke `references/*.md` (nomor bab lama dipertahankan).
- **`mgp new <folder>`**: pembuka proyek. Menulis folder standar, `brief.md` (T1), `STATUS.md` (T10), `project.json`, dan `index.html` yang sudah memuat mgp.motion, `mgp.js`, dan font bundel lewat jalur relatif (jalan dari file:// dan lewat mgp). `--lang id|en` memilih bahasa brief dan STATUS.
- **`project.json`**: satu sumber data proyek (meta, adegan + pose kunci, VO + waktu kata/huruf, blok, caption, aset + asal-usul). `mgp check` memeriksa berkas yang dirujuk. Skema: `motion-graphics-pro/references/project.md`.
- **Tahap blocking** di pilot G4: pose kunci ditinjau stepped (`mgp contact --var blocking=true --times poses`) sebelum spline, lalu `mgp curves` untuk QC. `mgp contact --times` menerima daftar detik atau `poses`.
- `mgp doctor` di awal proyek mengarahkan pilihan suara, gambar, dan encoder. Klon suara mendukung izin pemilik di luar rekaman (`--manual-consent --statement`). Mesin lokal dipasang sekali per komputer (`mgp install voice|image`); model tidak ikut ZIP.

### Prinsip gerak lanjutan (`motion-graphics/references/advanced-principles.md`)
- Preset pegas `bouncy` / `snappy` / `heavy` (ease `spring.*`), `inertia()`, `delay()`, squash volume tetap, stroke konstan saat diskala, rubberhose, kepala 2.5D dari 5 pose, ekspresi FACS (`MGP.face`), SLERP, origami lipat kaku + validator Maekawa/Kawasaki, pola Miura-ori/Yoshimura/Kresling (`MGP.foldPattern`), modul `MGP.field` (cloner + effector + field).
- **`mgp curves`**: grafik nilai dan kecepatan per elemen; menandai gerak linier, patah, mulai/berhenti mendadak, dan squash tanpa volume tetap.
- Gaya tokoh origami baru bawaan `origamiStyle: "rigid"` (strip kertas menerus, cahaya satu arah); tampilan lama lewat `"old"`.
- Blok baru: `paper/miura`, `paper/yoshimura`, `paper/kresling` (total **260 blok**).

### Mesin dan gambar gratis
- Pengatur perangkat bersama: cek VRAM/RAM, antrean GPU lintas proses, cadangan otomatis ke CPU bila memori GPU habis. Suara klon di GPU ±4x lebih cepat.
- `mgp render --encoder auto|nvenc|qsv|amf|videotoolbox` (bawaan tetap `cpu`).
- **`mgp image`**: kit sheet, plate, dan aset tunggal dari cloud gratis (Space resmi Hugging Face, Cloudflare Workers AI, Pollinations) atau lokal FLUX.2 [klein] 4B (Apache-2.0); latar magenta → potong → `slice` → `kit.json` ber-pivot; `--tries N`, `--rotate`. Contoh rig `render/examples/kit-rig.html`.
- Prompt bebas kini ikut `--style <nama|teks>` dan `--tries N` (bersama `--cutout`): seed dicoba berurutan sampai potongan bersih (tanpa sisa magenta, subjek tidak menyentuh tepi), skor tiap percobaan disimpan.
- **Pembersih magenta bawaan** di `--cutout`, `kit`, dan `slice`: sisa magenta dan bercak lepas dibuang, tepi tanpa pinggiran merah muda (`--no-clean` untuk mematikan). Pelajaran uji stop-motion anime kertas masuk `references/image.md` 3.6: satu pose per gambar, referensi tokoh berdiri + deskripsi tungkai rinci, 2-4 pose cukup untuk on fours.

### Pilihan frame
- Titik keputusan **frame** di tahap 1, sebelum `mgp new`: 9:16, 16:9, 1:1, 4:5, 21:9, atau multi-format (satu master dengan zona aman bersama), sekaligus resolusi (720/1080/1440/4K) dan fps (24/30/60), dengan zona aman per platform (`references/brief-concept.md` 2.0).
- `mgp new --aspect 21:9` (2520 x 1080) dan `--resolution 720|1080|1440|4k`.

### Pemasang mesin lokal
- **`mgp install voice|image|all`**, sekali per komputer: deteksi OS/GPU/RAM/Python, pilih build PyTorch (CUDA, MPS, ROCm, atau CPU), venv di jalur pendek (`~/.mgp`; `~/.rekam` yang sudah ada tetap dipakai), unduh model yang dikunci commit + sha256 dengan resume, lalu uji asap satu kalimat atau satu gambar. Opsi `--detach` (unduh di latar), `--status` (kemajuan/status), `--dry-run`, `--adopt` (pakai instalasi manual yang sudah ada tanpa unduh ulang), `--cpu`, `--stop`. Model tidak ikut ZIP (suara ±9 GB, gambar ±5 GB).
- Venv gambar meminjam PyTorch dari venv suara (hemat ±4,4 GB). `mgp doctor` kini memeriksa venv gambar terpisah dan menyarankan `mgp install ... --detach`.

### Suara (perbaikan setelah uji akhir)
- **Ulang satu kalimat**: `mgp voice speak script.txt -o vo.wav --sentence 3 [--seed N | --tries 4]`. Setiap kalimat disimpan di `vo.parts/`; hanya kalimat yang disebut dibuat ulang, lalu VO, loudness, `vo.words.json`, dan `vo.letters.json` dirakit ulang. `--tries N` membuat N calon dalam satu kali muat model dan memilih yang terbaik (skor ASR + durasi).
- `mgp voice score` memberi WER/CER **ternormal** di samping angka mentah, plus daftar **CHECK BY EAR** (CEK TELINGA dengan `MGP_LANG=id`: kata yang perlu didengar sendiri).
- **Peta lafal**: `pronunciations.txt` proyek, `--pronounce "a=b"`, dan `voice/pronunciations-default.txt` (mis. `Claude = Klod`); subtitle tetap memakai teks asli.
- Log mesin suara lebih bersih; peringatan kata terpotong diteruskan per kalimat; `--lufs -18` (nilai negatif) diterima.

### Lapisan Python
- `image_ops` (dulu `atelier_citra`): resize 30-74x lebih cepat (keluaran identik bit), garis yang ujungnya di luar kanvas kini sama dengan OpenCV. `brush` (dulu `kuas`) 1,15-1,38x lebih cepat.

### Situs panduan
- Bagian baru **Alur v2.4** (bilingual): pilihan frame, pasang sekali, empat pilihan suara, gambar gratis (dengan catatan mutu yang jujur), prinsip gerak lanjutan, proyek baru + blocking, hasil uji banding, dan contoh hasil (iklan 30 detik, stop-motion anime kertas, rig dari kit lokal).
- Isi skill di situs dirakit dari SKILL.md inti + `references/` (bab lama dipertahankan, ditambah bab Mesin dan `project.json`): versi Indonesia dari dokumen Indonesia, versi Inggris langsung dari dokumen Inggris skill (tanpa terjemahan tangan).
- Halaman Paket Motion memakai perintah `mgp add <blok> ... --into index.html` dengan 260 blok sendiri. Langkah `mgp audit` dan catatan alias di bagian Alur v2.4; iklan contoh diganti versi 2.

### Bersih-bersih nama dan fakta
- Nama netral di samping nama lama (semua tetap diterima): `window.__mgp` (= `__hyperframes`), event `mgp-seek` (= `hf-seek`), `__mgpLottie`/`__mgpAnime`, global `mgp.motion` (alias `gsap`), penggerak `composition`, field blok `aliases` (dulu `hyperframes`), `blocks/tools/legacy-items.json`, `legacy-name-map.json`, `render/examples/compat/`. Tabel di `render/README.md`, "Kompatibilitas".
- Dokumen tidak lagi menyiratkan skill ini turunan atau butuh proyek lain; kredit dikumpulkan di NOTICE.md bagian "Pengakuan".
- Fakta yang dibenahi: daftar fitur yang dulu ditulis "tidak ada di Rekam" (nama lama mgp) (transkrip, blok, Studio, pas-teks, font bundel) ternyata sudah ada; jumlah font bundel 24 (bukan 25); rujukan `bake-basemap.mjs` dihapus (tidak ada di paket); jumlah blok 260; `npm i` tidak dibutuhkan mgp.

## v2.3 (05-11-2026)

### Suara dan clone voice
- **`rekam suara`** baru. Di titik keputusan naskah, Claude menawarkan 4 pilihan sumber suara: ElevenLabs, clone suaramu sendiri (lokal), rekaman sendiri, atau tanpa narasi (SKILL.md 1.1 dan bab 10.1).
- Clone lokal: rekam ±30 detik membaca `suara/template-bacaan.md` (Indonesia/Inggris, termasuk kalimat persetujuan), lalu `rekam suara periksa` (durasi, clipping, sample rate, derau, kalimat izin), `klon` (membuat profil), dan `ucap` (naskah → VO, emosi, kecepatan, tag per kalimat, loudness -16 LUFS, otomatis `vo.kata.json` / `vo.huruf.json` untuk lip-sync). Juga ada `nilai`, `daftar`, dan `hapus`.
- Mesin bawaan **Chatterbox Multilingual** (MIT), dengan OpenVoice V2 (MIT) sebagai opsi. Hasil uji: kemiripan suara 0,92, CER 5%. Karena belum ada kode `id`, bahasa Indonesia dibacakan lewat Melayu sehingga logatnya agak Melayu.
- `rekam suara elevenlabs`: API `/with-timestamps` dengan `ELEVENLABS_API_KEY`, waktu per kata ikut.
- Etika: hanya suara sendiri atau dengan izin terekam, tidak untuk tokoh publik, dan profil disimpan lokal.

### Toolkit sendiri (tanpa HyperFrames)
- **Blok** (`motion-graphics-pro/blok/`): 257 blok siap pakai (transisi, judul, teks kinetik, caption, grafik, peta, 3D, kamera, latar, aksen). Dipasang dengan `rekam tambah`, dicari dengan `rekam katalog`; nama item HyperFrames lama ikut dipetakan.
- **Rekam Studio** (`rekam studio`): editor visual untuk menggeser, memutar, menskala, dan menghapus layer, serta mengganti opsi animasi.
- Rekam memakai klien CDP buatan sendiri, tanpa npm dan tanpa Playwright. **25 font OFL** dibundel di `render/fonts/` dan dilayani di `/__fonts/`.
- Perintah baru Rekam: `media`, `audio`, `potong-latar`, `transkrip`, `selaras` (aligner offline per kata dan per huruf), `sfx` (efek suara prosedural), `lottie` (ekspor/putar).
- **Gerak** dilengkapi hingga paritas 275/279 komposisi terhadap GSAP.
- **Peta** (`lib/peta.js` + `lib/peta-data/`): garis pantai, negara, dan kota dari Natural Earth (domain publik).
- **Lottie** (`lib/lottie/`): pemutar dan pengekspor yang ditulis sendiri.
- SKILL.md: semua rujukan `npx hyperframes` diganti perintah Rekam. HyperFrames kini opsional sepenuhnya.
- NOTICE: kredit blok, font OFL, CDP, Natural Earth, Chatterbox/OpenVoice.

## v2.2 (05-11-2026)

### Mesin baru
- **Gerak** (`motion-graphics/lib/gerak/`): mesin animasi/tween milik paket yang menggantikan GSAP (lisensi GSAP melarang alat yang bersaing dengan pembuat animasi visual Webflow, seperti Rekam Studio). Ditulis sendiri; API kompatibel dengan bagian GSAP 3 yang dipakai paket (`gsap.timeline`, `to/from/fromTo/set/call/add`, parameter posisi, stagger, keyframes, ease standar, transform HTML/SVG, warna, filter, clip-path, bayangan, `attr`, variabel CSS), terpasang sebagai `window.gsap` bila GSAP asli tidak dimuat. Seek deterministik dari arah mana pun. Rekam melayani Gerak untuk setiap permintaan GSAP (`--gsap-asli` untuk GSAP yang dipasang sendiri); `gsap` dihapus dari dependensi `render/package.json`. Contoh `lib/examples` memuat `../gerak/gerak.js`. Uji: `lib/gerak/uji/` (unit, banding, paritas piksel terhadap GSAP).
- **Rekam** (`motion-graphics-pro/render/`): renderer lokal milik paket, menggantikan `npx hyperframes` sebagai renderer bawaan. Perintah `cek`, `pratinjau`, `frame`, `kontak`, `render` (`node render/bin/rekam.mjs …`, `npm i` sekali). Chrome/Edge yang sudah terpasang + ffmpeg; keluaran MP4 H.264, ProRes 422 HQ / 4444 alfa, WebM, urutan PNG; render paralel `--workers`; audio dari `<audio data-start>` dan `--audio`; teks terbakar dari waktu per kata; uji determinisme dengan hash frame. Membaca kontrak HyperFrames apa adanya (root `data-composition-id`, `data-composition-src` + `<template>`, `window.__timelines`, `.clip`, `hf-seek`) serta `window.__seek(t)`, `__timeline`, GSAP global, animasi CSS, dan loop rAF. Tidak ada di Rekam: `fitTextFontSize`, `data-var-*`, transcribe, media-treatment, registry, Studio; font dipasang lewat `@font-face`.
- **Pustaka gerak JS** (`motion-graphics/lib/`): 17 modul deterministik dengan kontrak bersama (`create`, `seek`, `render`, `timeline`, `MGP.core.expose` → `window.__duration` / `__seek` / `__ready`): `core`, `figure3d` + `gait`, `shadow3d`, `scenePark3d`, `sceneTanker`, `characterStyles`, `origamiFold`, `vectorKit`, `paperFoldTransition`, `causalTransitions`, `chibiObject`, `lipsync`, `routeMap`, `kineticType`, `spring`, `particlesFlight`, `constellationLines`. Ditambah `paket-scenes/`: adegan bergerak untuk ke-104 paket motion langsung dari id (`MGP.paket.create` / `MGP.paket.render`). Bundel satu file `dist/mgp.js` dan `dist/mgp-paket.js`, ES module `index.mjs`, satu contoh per modul, `node lib/build.js`.
- **Lapisan Python numpy + Pillow**: `kuas.py` (API gambar vektor: jalur, cat, gradien, kanvas, klip, lapis, matriks perspektif, teks, citra, pathfinder, SVG) dengan mesin murni numpy dan skia-python sebagai mesin opsional (`KUAS_MESIN`, `KUAS_SS`); `atelier_citra.py` menggantikan OpenCV; `rongga.py` satu sumber. Sumber tunggal di `_bersama/`, disalin ke `scripts/` tiap skill oleh `_bersama/sinkron.py` (`--cek` untuk rilis). `scripts/requirements.txt` dan `scripts/README.md` per skill.
- Proporsi tokoh contoh pindah ke **kanon 7,5 kepala** (`mesin_gait.BODY` / `canon()`, `loft.CANON`, `bayangan3d.PRIM`, `ruang3d.HERO`, `MGP.figure3d`).

### motion-graphics-pro
- Bab 11 ditulis ulang: Rekam sebagai renderer bawaan, kebutuhan dan pemasangan (Node.js 22+, ffmpeg, Chrome/Edge, Python numpy + Pillow), tabel pemetaan perintah HyperFrames → Rekam, daftar fitur yang tidak ada di Rekam, pustaka modul `lib/` di komposisi, fallback. HyperFrames tetap opsional untuk block registry, Studio, transcribe, normalize-audio.
- T7, T9, 7.2, 7.3, 8, 10: perintah cek/snapshot diganti `rekam cek` / `rekam kontak` / `rekam frame`; Poppins dipasang lewat `@font-face`; transisi siap pakai dari `lib/`.
- Bab 17.2: paket motion bisa dirender langsung dari id (`MGP.paket.render(id, …)`); kolom `add` registry ditandai opsional. Catatan yang sama di `paket/INDEX.md`.
- 15.1: pencocokan SIFT ditandai opsional (OpenCV tidak wajib).

### motion-graphics
- Bab 13 baru **Pustaka modul (`lib/`)**: daftar modul dan kapan dipakai, kontrak komposisi, render dengan Rekam.
- Bab 8 dan 11: render frame lewat `kuas` (`Permukaan.larik()`, pathfinder `kuas.gabung/iris/kurang`), pemasangan numpy + Pillow, tabel skrip ditambah `kuas.py`, `atelier_citra.py`, `requirements.txt`; perintah `python -I`.
- 5.2, 5.3, 7.1: mode campur lewat `kuas.Cat(campur=…)`.
- 12.1: proporsi 7,5 kepala (satu kepala = 0.771 H), landmark dari `mesin_gait.canon()`.

### vector-character
- Bab 6 dan 17: `pip install -r scripts/requirements.txt`, OpenCV dihapus dari kebutuhan, `toarray` → `Permukaan.larik()`, `cv2.findContours` → `atelier_citra.kontur_luar`, `skia.Op` / `PathMeasure` → `kuas.gabung` / `iris` / `kurang` / `kuas.ukur`, `KUAS_MESIN` / `KUAS_SS`; modul proyek menerima `kuas.Kanvas` dan `kuas.Jalur`; rujukan ke `MGP.vectorKit` dan `MGP.characterStyles`.
- Bab 0, 5, 12, 14, 16: catatan PathOps hanya untuk mesin skia (mesin murni menghitung boolean tepat per sampel), trace dengan `atelier_citra`, SVG lewat `kuas.gambar_svg`, rongga lewat `atelier_citra.komponen`.
- Bab 1: grid proporsi diselaraskan dengan `loft.CANON` (lutut 5.625 H, ujung jari 4.7 H).

### Umum
- `NOTICE.md` baru: kredit HyperFrames (Apache-2.0, kontrak), OpenCV (Apache-2.0, algoritme), Skia / skia-python (BSD-3), GSAP (Standard "No Charge" License), playwright-core (Apache-2.0).
- README: isi paket, pemasangan, mulai cepat dengan Rekam, kebutuhan.

## v2.1 (05-11-2026)

### motion-graphics-pro
- Bab 17.1 **Cara meminta ke Claude**: pola brief satu kalimat, peta isian ke bab skill, lima contoh brief (iklan, explainer, dokumenter, music video, edukasi), tips.
- Bab 17.2 **Pustaka paket motion**: folder baru `paket/` berisi 104 paket dalam 11 kategori (`INDEX.md`, `paket.json`, `paket_preview.js`, penjelajah offline `paket_motion.html`); tiap paket memuat kegunaan, durasi, gerak kunci, palet, font, slot, item registry HyperFrames, perintah `npx hyperframes add`, dan brief siap salin. Pilihan unggulan per kategori.
- Kategori baru **TRN · tren baru piksel & origami**: TRN-01 Pixel Art Arcade 8-bit, TRN-02 Pixel Art Cozy 16-bit, TRN-03 Origami Bangau Lipat, TRN-04 Origami Lipat Buka.
- Bab 17.3 pixel art dan origami di alur produksi + QC tambahan.
- Bab 17.4 **trik aset Higgsfield latar magenta #FF00FF** (termasuk bukaan dan celah kisi) + kunci warna lokal; prompt "fully visible with a wide margin" supaya aset tidak terpotong. Skrip baru `scripts/kunci_magenta.py`.
- Template baru **T14 Pixel art** dan **T15 Origami**.

### motion-graphics
- Bab 12.1 figur manusia 3D: proporsi 7 kepala, bahu sekitar 1.9-2 kepala, tungkai sekitar 1/2 tinggi, ujung jari di pertengahan paha; volume tabung dan shading (core shadow, half-light, sorot, rim, bounce), urutan gambar, diam hidup.
- Bab 12.2 resep adegan satu take kapal tanker sandar: tahap, jalur Hermite, kapal tunda, fender, enam tali tambat, lengan muat, preset kamera, suasana siang/senja.
- Bab 12.3 benda chibi dipersonifikasi (cangkir kopi): proporsi, tabel mood, lengan per mood, uap yang bereaksi, take ganti mood, lompat.
- Bab 12.4 wajah narator lip-sync: viseme dengan gigi dan lidah, kedip, angguk kepala, alis naik pada tag [excited].
- Bab 12.5 gerak gaya pixel art (8 fps stepped, buffer resolusi rendah, dither, parallax piksel utuh) dan origami (12 fps, buka lipatan berengsel, urutan lipat bangau).

### vector-character
- Bab 19 varian gaya tokoh: rangka bersama, vektor, pixel art (palet 12 warna, ambang alpha, garis tepi 1 px, skala bulat), origami (layang-layang terbelah garis lipat, kipas badan dan kepala, sisi balik krem), kapan memilih.

### Umum
- Teks dinetralkan untuk publik (nama proyek dan sapaan internal diganti).
- README dengan cara pasang di Claude Code dan claude.ai.

## v2.0 (02-11-2026)
- motion-graphics-pro versi 2: tahap konsep, gerbang WAJIB/LAPOR, rujukan QC per jenis aset, konsistensi tokoh, personifikasi benda, lip-sync dari waktu per huruf.
