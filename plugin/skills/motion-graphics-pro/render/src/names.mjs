// names.mjs · canonical English CLI names + the old Indonesian names (v2.3 / v2.4-dev) they replace.
// translateArgv() rewrites old commands, subcommands, flags and flag values to the canonical ones before any parser
// runs, so every module only ever sees English option keys. env() reads MGP_* first, then the old REKAM_* / KUAS_* name.
// The old names keep working; mgp prints one short note (stderr) listing the old names it translated.

/** old top-level command -> canonical command */
export const COMMANDS = {
  baru: "new", cek: "check", lint: "check", "cek-mesin": "doctor", machine: "doctor", pratinjau: "preview",
  kontak: "contact", kurva: "curves", pasang: "install", katalog: "catalog", tambah: "add", "media-tampilan": "grade",
  "audio-normal": "normalize-audio", "potong-latar": "cutout", "remove-background": "cutout", transkrip: "transcribe",
  selaras: "align", suara: "voice", gambar: "image", bantuan: "help", editor: "studio", snapshot: "frame",
};
/** old subcommand per (canonical) command */
export const SUBCOMMANDS = {
  media: { daftar: "list", ls: "list", tampilan: "look", grade: "look", terangkan: "brighten", "auto-levels": "brighten", gaya: "effects", stylize: "effects", style: "effects", banding: "compare" },
  audio: { normal: "normalize", normalise: "normalize", loudnorm: "normalize", ukur: "measure" },
  image: { iris: "slice", unduh: "download", penyedia: "providers" },
  install: { suara: "voice", gambar: "image", semua: "all" },
  sfx: { daftar: "list", campur: "mix", bukti: "proof" },
  voice: { periksa: "inspect", klon: "clone", ucap: "speak", daftar: "list", nilai: "score", hapus: "remove", bantuan: "help" },
};
/** old flag -> canonical flag, valid for every command (without the leading --) */
export const FLAGS = {
  "abaikan-galat": "ignore-errors", adopsi: "adopt", "background-output": "plate-out", bahasa: "language", banding: "compare",
  bisu: "no-audio", buka: "open", cara: "method", cari: "search", coba: "tries", dari: "reuse", di: "container", diam: "quiet",
  durasi: "duration", efek: "effect", emosi: "emotion", gaya: "style", "gsap-asli": "native-gsap", hentikan: "stop",
  huruf: "letters", interpolasi: "interpolation", "izin-manual": "manual-consent", judul: "title", kalimat: "sentence",
  kata: "words", kategori: "category", ke: "into", kecepatan: "speed", keluaran: "out-dir", kemiripan: "similarity",
  kering: "dry-run", kolom: "cols", komponen: "components", kualitas: "quality", kuant: "quant", kuat: "strength",
  lafal: "pronounce", langkah: "steps", lapisan: "track", "latar-output": "plate-out", lebar: "width", linier: "linear",
  maks: "max", minarea: "min-area", mulai: "start", naskah: "script", paksa: "force", panjang: "long-side",
  penyedia: "provider", perangkat: "device", pernyataan: "statement", potong: "cutout", presisi: "precision", profil: "profile",
  puncak: "peak", putar: "rotate", "python-dasar": "base-python", rapikan: "fix-with", rasio: "aspect", referensi: "reference",
  resolusi: "resolution", sampel: "samples", sel: "selector", simpan: "save-response", "simpan-wheel": "keep-wheels",
  stabilitas: "stability", sumber: "source", "tambah-mesin": "add-engine", tangkap: "capture-format", "tanpa-asr": "no-asr",
  "tanpa-bersih": "no-clean", "tanpa-lafal": "no-pronounce", "tanpa-pinjam": "no-borrow", "tanpa-selaras": "no-align",
  "tanpa-tekstur": "no-texture", "tanpa-uji": "skip-test", teks: "captions", "teks-bawah": "captions-bottom",
  "teks-font": "captions-font", "teks-kata": "captions-words", "teks-ukuran": "captions-size", "teks-warna": "captions-color",
  templat: "template", tinggi: "height", tingkat: "level", toleransi: "tolerance", transparan: "transparent", tunggu: "wait",
  ulang: "retry", "var-ketat": "strict-variables", verifikasi: "verify", wajah: "face", waktu: "times", warna: "color",
  _anak: "child", mesin: "engine", nama: "name", kunci: "key", latar: "detach", cek: "status", baru: "fresh",
};
/** flags whose meaning depends on the command: {command: {old: canonical}} (wins over FLAGS) */
export const FLAGS_BY_COMMAND = {
  new: { kunci: "poses" },
  install: { latar: "detach", cek: "status", check: "status", background: "detach", baru: "fresh" },
  "image download": { mesin: "model" },
  "image slice": { nama: "names" },
  align: { teks: "script" },
  transcribe: { mesin: "engine" },
};
/** old flag values: {canonical flag: {old: canonical}} */
export const VALUES = {
  source: { "cloud-gratis": "free-cloud", lokal: "local" },
  provider: { lokal: "local" },
  style: { kertas: "paper", vektor: "vector" },
  times: { kunci: "poses" },
  key: { hijau: "green" },
  mode: { kanvas: "canvas" },
  emotion: { hangat: "warm", netral: "neutral", semangat: "energetic", tenang: "calm" },
  components: { paket: "packages", uji: "smoke-test", suara: "voice", gambar: "image" },
  method: { templat: "template" },
  format: { lottie: "lottie" },
};
/** old env name -> canonical env name (the old one is still read as a fallback) */
export const ENV = {
  KUAS_MESIN: "MGP_BRUSH_ENGINE", KUAS_SS: "MGP_BRUSH_SUPERSAMPLE", MGP_PETA: "MGP_MAP_DATA", REKAM_ARGS: "MGP_ARGS",
  REKAM_BLOK: "MGP_BLOCKS_DIR", REKAM_BROWSER: "MGP_BROWSER", REKAM_CDP: "MGP_CDP", REKAM_CF_BASE: "MGP_CF_BASE",
  REKAM_CHATTERBOX_DIR: "MGP_CHATTERBOX_DIR", REKAM_DEVICE: "MGP_DEVICE", REKAM_ENCODER: "MGP_ENCODER",
  REKAM_FFMPEG: "MGP_FFMPEG", REKAM_FFPROBE: "MGP_FFPROBE", REKAM_FONTS: "MGP_FONTS", REKAM_GAMBAR_BATAS_DETIK: "MGP_IMAGE_TIMEOUT",
  REKAM_GAMBAR_MODEL: "MGP_IMAGE_MODEL", REKAM_GAMBAR_PAKSA: "MGP_IMAGE_FORCE", REKAM_GAMBAR_PYTHON: "MGP_IMAGE_PYTHON",
  REKAM_GAMBAR_REF_MAKS: "MGP_IMAGE_REF_MAX", REKAM_GAMBAR_TE_DTYPE: "MGP_IMAGE_TE_DTYPE", REKAM_GPU_BATAS: "MGP_GPU_LIMIT",
  REKAM_GPU_KUNCI: "MGP_GPU_LOCK", REKAM_GPU_TUNGGU: "MGP_GPU_WAIT", REKAM_GSAP_ASLI: "MGP_NATIVE_GSAP",
  REKAM_HF_SPACE_BASE: "MGP_HF_SPACE_BASE", REKAM_MGP_LIB: "MGP_LIB", REKAM_NO_SANDBOX: "MGP_NO_SANDBOX",
  REKAM_OPENVOICE_DIR: "MGP_OPENVOICE_DIR", REKAM_POLLI_BASE: "MGP_POLLI_BASE", REKAM_PYTHON: "MGP_PYTHON",
  REKAM_PYTHON_DASAR: "MGP_BASE_PYTHON", REKAM_RUMAH: "MGP_HOME", REKAM_SFX_LIB: "MGP_SFX_LIB",
  REKAM_SUARA_PROFIL: "MGP_VOICE_PROFILES", REKAM_WHISPER_CACHE: "MGP_WHISPER_CACHE", REKAM_WHISPER_CPP: "MGP_WHISPER_CPP",
  REKAM_WHISPER_MODEL: "MGP_WHISPER_MODEL",
};
export const ENV_OLD = Object.fromEntries(Object.entries(ENV).map(([a, b]) => [b, a]));

/** Read an environment variable by its canonical MGP_* name, falling back to the old name. */
export function env(name, fallback) {
  const v = process.env[name];
  if (v != null && v !== "") return v;
  const old = ENV_OLD[name];
  const w = old ? process.env[old] : undefined;
  return w != null && w !== "" ? w : fallback;
}

const used = [];
/** Old names translated in this run (for the one-line note and for `mgp check`). */
export const oldNamesUsed = () => used.slice();

/**
 * Rewrite argv (without node/script) to canonical names. Lottie subcommands are merged:
 *   lottie ekspor|export X  -> export X --format lottie      lottie putar|play X -> play X
 *   lottie render|frame|cek X -> render|frame|check X       (check/render/frame detect .json/.lottie input)
 */
export function translateArgv(argv) {
  const a = argv.slice();
  const note = (o, n) => { if (o !== n) used.push(`${o} -> ${n}`); };
  let i = a.findIndex((x) => !x.startsWith("-"));
  if (i < 0) return translateFlags(a, "", note);
  let cmd = a[i];
  if (COMMANDS[cmd]) { note(cmd, COMMANDS[cmd]); cmd = a[i] = COMMANDS[cmd]; }
  if (cmd === "lottie") {
    const sub = a[i + 1];
    const LS = { ekspor: "export", export: "export", putar: "play", play: "play", render: "render", frame: "frame", cek: "check", check: "check" };
    if (LS[sub]) {
      note("lottie " + sub, LS[sub] === "export" ? "export --format lottie" : LS[sub]);
      a.splice(i, 2, LS[sub]); cmd = LS[sub];
      if (cmd === "export" && !a.some((x) => x === "--format" || x.startsWith("--format="))) a.push("--format", "lottie");
    }
  }
  let ctx = cmd;
  const subs = SUBCOMMANDS[cmd];
  if (subs) {
    const j = a.findIndex((x, k) => k > i && !x.startsWith("-"));
    if (j > 0 && subs[a[j]]) { note(cmd + " " + a[j], cmd + " " + subs[a[j]]); a[j] = subs[a[j]]; }
    if (j > 0) ctx = cmd + " " + a[j];
  }
  return translateFlags(a, ctx, note);
}

function translateFlags(a, ctx, note) {
  const cmd = ctx.split(" ")[0];
  const local = Object.assign({}, FLAGS_BY_COMMAND[cmd] || {}, FLAGS_BY_COMMAND[ctx] || {});
  for (let k = 0; k < a.length; k++) {
    const m = /^--([^=]+)(=.*)?$/.exec(a[k]);
    if (!m) continue;
    const old = m[1], neu = local[old] || FLAGS[old] || old;
    if (neu !== old) { note("--" + old, "--" + neu); a[k] = "--" + neu + (m[2] || ""); }
    const vals = VALUES[neu];
    if (vals) {
      if (m[2]) { const v = m[2].slice(1); if (vals[v]) { note(v, vals[v]); a[k] = "--" + neu + "=" + vals[v]; } }
      else if (a[k + 1] != null && vals[a[k + 1]]) { note(a[k + 1], vals[a[k + 1]]); a[k + 1] = vals[a[k + 1]]; }
    }
  }
  return a;
}
