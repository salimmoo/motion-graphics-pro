# Reading text for voice cloning

Read this text in your own voice for about 30 to 35 seconds, then send the recording. The recording becomes the voice
sample (reference) used to make VO from a script in your voice. There are two texts: Bahasa Indonesia and English.
Read the one in the language of your VO (`mgp voice template --language id|en` prints it). The instructions are given
in English and Indonesian below.

The first sentence is the **consent statement**. Replace `[nama]` / `[name]` with your name (a nickname is fine).
Without this consent sentence, `mgp voice clone` refuses to make a voice profile.

## Bahasa Indonesia

<!-- text:id -->
Saya, [nama], mengizinkan suara saya dikloning untuk proyek ini.
Pagi itu fajar menyingsing di pantai yang ramai, dan angin sepoi-sepoi membawa aroma kopi dari warung di ujung desa.
Anak-anak bernyanyi riang, sementara seorang bapak menarik perahu kecil ke pasir.
Apakah kamu sudah membaca survei tentang struktur masyarakat di pulau itu?
Khusus akhir pekan, kami menyiapkan video praktis, gratis, dan penuh strategi.
Amboi, enak sekali soto buatan Bu Zahra sore ini!
Mari kita syukuri zaman ini dengan bekerja jujur, rajin, dan ramah kepada siapa saja.
<!-- /text:id -->

Sounds covered:

| Sound | Examples in the text |
|---|---|
| ng, ny | menyingsing, angin, ujung, bernyanyi, menyiapkan |
| sy, kh | masyarakat, syukuri; khusus, akhir |
| f, v, z | fajar; video, survei; zaman, Zahra, mengizinkan |
| Diphthongs ai, au, oi, ei | pantai, ramai; pulau; sepoi, amboi; survei |
| Schwa (e pepet) and é | sementara, kecil, membaca, pekan; enak, desa, sore |
| Trilled r | riang, perahu, struktur, strategi, rajin, ramah |
| Final k (glottal stop) | anak, bapak, menarik, enak, masyarakat |
| Consonant clusters | struktur, strategi, praktis, gratis, proyek, dikloning |
| Other consonants | c (kecil), j (fajar, jujur), w (warung), y (yang, siapa saja), final h (ramah) |
| Intonation | statement (sentences 1-3, 5, 7), question (sentence 4), exclamation (sentence 6) |

## English

<!-- text:en -->
I, [name], consent to my voice being cloned for this project.
The quick brown fox jumps over the lazy dog near the river bank.
Have you ever watched the sunrise paint the mountains in gold and orange?
She measured the thick rope twice, then joined the crew on the ship's deck.
What a beautiful, joyful morning this is!
Please call Stella and ask her to bring these things with her from the store: six spoons of fresh snow peas, five thick slabs of blue cheese, and maybe a snack for her brother Bob.
<!-- /text:en -->

Covers: th (the, thick, this), sh/zh (she, ship, measured), ch/j (cheese, jumps, joined), ng (bring, morning), r/l, voiced/voiceless pairs (f/v, s/z, p/b, t/d, k/g), diphthongs (I, my, now, boy, gold), clusters (str, spr, sn, sl, thr), statement, question and exclamation.

## How to record

- **Quiet room**: turn off fans, air conditioning, TV and music. A room with lots of fabric (bedroom, wardrobe) is better than an empty room that echoes.
- **Mouth 20-30 cm from the microphone**, slightly to the side so breaths and "p" sounds do not pop. A phone microphone is enough.
- **No music and no effects** (no filters, reverb or aggressive app noise suppression).
- **Read naturally**, as if telling a friend a story, in the same style as the VO you want. Do not whisper or shout; read questions and exclamations with their intonation.
- **Stay silent for 1 second** before and after reading. If you misread, repeat only that sentence; the wrong part may stay in.
- **Format**: WAV, MP3 or M4A; sample rate 24-48 kHz (44.1 or 48 kHz is most common); mono or stereo.
- **Duration**: at least 20 seconds of speech, ideally 30-35 seconds.
- Check it first: `mgp voice inspect recording.wav`.

## Cara merekam (Bahasa Indonesia)

Baca teks di atas dengan suara Anda sendiri, sekitar 30 sampai 35 detik, lalu kirim rekamannya. Kalimat pertama adalah
pernyataan izin; isi `[nama]` dengan nama Anda (boleh nama panggilan). Tanpa kalimat izin ini, `mgp voice clone`
menolak membuat profil suara.

- **Ruangan sepi**: matikan kipas, AC, TV, dan musik. Ruangan dengan banyak kain (kamar tidur, lemari baju) lebih baik dari ruangan kosong yang bergema.
- **Jarak mulut ke mikrofon 20-30 cm**, sedikit dari samping supaya napas dan bunyi "p" tidak meletup. Mikrofon HP sudah cukup.
- **Tanpa musik dan tanpa efek** (tanpa filter, reverb, atau peredam bising aplikasi yang agresif).
- **Baca wajar**, seperti bercerita ke teman, dengan gaya yang sama dengan VO yang Anda inginkan. Jangan berbisik dan jangan berteriak; kalimat tanya dan seru dibaca dengan nadanya.
- **Diam 1 detik** sebelum dan sesudah membaca. Kalau salah baca, ulang kalimat itu saja; bagian yang salah boleh dibiarkan.
- **Format**: WAV, MP3, atau M4A; sample rate 24-48 kHz (44,1 atau 48 kHz paling umum); mono atau stereo.
- **Durasi**: minimal 20 detik bicara, idealnya 30-35 detik.
- Periksa dulu: `mgp voice inspect rekaman.wav`.
