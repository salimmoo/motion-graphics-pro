// mgp align (old: rekam selaras): forced alignment of a script to audio without Whisper/ML, pure JS.
//
// Flow:
//   1. The audio is read (PCM WAV directly; other formats through ffmpeg to 16 kHz mono WAV), mixed to mono,
//      resampled to 16 kHz.
//   2. Features per 10 ms: RMS energy (dB), vowel band energy 300-3000 Hz, high band 3.5-8 kHz,
//      spectral flatness, and voicing (normalised autocorrelation, 50-500 Hz).
//   3. VAD: threshold from an adaptive noise floor (local percentile) + hysteresis + hangover -> speech regions and pauses.
//   4. Syllable nuclei: peaks of the smoothed vowel band envelope, with prominence, voicing
//      and minimum distance conditions (de Jong & Wempe style).
//   5. The script is split into words and syllables (Indonesian rules; vowel cluster heuristic for English),
//      numbers are spelled out.
//   6. Dynamic programming aligns the syllable sequence to the nucleus sequence: nuclei may be skipped, syllables
//      may have no nucleus (merged), long pauses are steered to punctuated word boundaries and forbidden inside words.
//   7. Syllable boundary = energy minimum between two nuclei (or a pause edge); word starts/ends stick to the
//      speech onset/offset around pauses.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { FFMPEG } from "./ffmpeg.mjs";
import { L } from "./i18n.mjs";

const SR = 16000, HOP = 160, WIN = 400, NFFT = 512;
const FR = SR / HOP; // frame per detik (100)

/** Default parameters (chosen from an evaluation on SAPI samples; see the align evaluation notes). */
export const PARAM = {
  // VAD
  vadMargin: 9, vadRel: 42, vadHyst: 3, vadCloseGap: 0.03, vadMinSpeech: 0.04, pauseMin: 0.15,
  // inti
  smooth: 1.0, promMin: 3.0, voiceMin: 0.55, nucRel: 25, nucLocal: 1, minDist: 0.07,
  // DP
  skip0: 0.55, skipK: 0.3, miss: 0.6, missSon: 0.7, missVow: 0.35,
  pauseInWord: 6, pauseWord: 1.0, punctNoPause: 1.0, commaNoPause: 0.5, rateK: 1.0, consK: 0.8, rateWin: 0, rateCap: 0,
  // batas
  headMax: 0.4, tailMax: 0.5, closure: 0, bndDrop: 1,
};

const say = (o, s) => { if (!(o.quiet ?? o.diam)) process.stderr.write(s + "\n"); };

/* ------------------------------------------------------------------ audio */

function ff(args) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let e = ""; p.stderr.on("data", (d) => (e += d));
    p.on("error", (er) => rej(new Error(L`ffmpeg cannot be started (${er.message}). Install ffmpeg or set env MGP_FFMPEG.`)));
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(L`ffmpeg failed: ` + e.trim()))));
  });
}

/** Baca WAV PCM (int 8/16/24/32, float 32/64, WAVE_FORMAT_EXTENSIBLE). Mengembalikan {rate, ch, data:Float32Array[]} atau null. */
export function readWav(buf) {
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    const body = off + 8;
    if (body + size > buf.length) size = buf.length - body; // potongan terpotong / ukuran 0xFFFFFFFF
    if (id === "fmt ") {
      let tag = buf.readUInt16LE(body);
      const ch = buf.readUInt16LE(body + 2), rate = buf.readUInt32LE(body + 4), bits = buf.readUInt16LE(body + 14);
      if (tag === 0xfffe && size >= 26) tag = buf.readUInt16LE(body + 24); // subformat GUID: 2 byte pertama
      fmt = { tag, ch, rate, bits };
    } else if (id === "data") { data = { off: body, size }; }
    off = body + size + (size & 1);
  }
  if (!fmt || !data) return null;
  const { tag, ch, rate, bits } = fmt;
  if (!(tag === 1 || tag === 3) || !ch || !rate) return null;
  const bps = bits >> 3, frames = Math.floor(data.size / (bps * ch));
  const out = Array.from({ length: ch }, () => new Float32Array(frames));
  let p = data.off;
  for (let i = 0; i < frames; i++) for (let c = 0; c < ch; c++, p += bps) {
    let v;
    if (tag === 3) v = bits === 64 ? buf.readDoubleLE(p) : buf.readFloatLE(p);
    else if (bits === 16) v = buf.readInt16LE(p) / 32768;
    else if (bits === 24) v = buf.readIntLE(p, 3) / 8388608;
    else if (bits === 32) v = buf.readInt32LE(p) / 2147483648;
    else if (bits === 8) v = (buf[p] - 128) / 128;
    else return null;
    out[c][i] = v;
  }
  return { rate, ch, data: out };
}

/** Campur ke mono lalu resampel (windowed sinc) ke 16 kHz. */
function toMono16k(w) {
  const n = w.data[0].length, m = new Float32Array(n);
  for (const c of w.data) for (let i = 0; i < n; i++) m[i] += c[i] / w.ch;
  if (w.rate === SR) return m;
  const ratio = SR / w.rate, outN = Math.floor(n * ratio), out = new Float32Array(outN);
  const fc = Math.min(1, ratio) * 0.95, Z = 12; // setengah lebar kernel (dalam sampel masukan, diskalakan)
  const half = Math.ceil(Z / fc);
  for (let k = 0; k < outN; k++) {
    const x = k / ratio, i0 = Math.floor(x);
    let s = 0, ws = 0;
    for (let i = i0 - half + 1; i <= i0 + half; i++) {
      if (i < 0 || i >= n) continue;
      const d = (x - i) * fc;
      const sinc = d === 0 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d);
      const win = 0.5 + 0.5 * Math.cos((Math.PI * (x - i)) / (half + 1));
      const wgt = sinc * win; s += m[i] * wgt; ws += wgt;
    }
    out[k] = ws ? s / ws : 0;
  }
  return out;
}

export async function loadAudio(file) {
  const buf = fs.readFileSync(file);
  let w = readWav(buf);
  if (!w) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-align-"));
    try {
      const wav = path.join(tmp, "voice16k.wav");
      await ff(["-i", file, "-vn", "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", wav]);
      w = readWav(fs.readFileSync(wav));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    if (!w) throw new Error(L`audio not readable: ${file}`);
  }
  return toMono16k(w);
}

/* ------------------------------------------------------------------ fitur */

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

const dB = (e) => 10 * Math.log10(e + 1e-12);

function features(x) {
  const nF = Math.max(1, Math.floor((x.length - WIN) / HOP) + 1);
  const rms = new Float32Array(nF), vow = new Float32Array(nF), hi = new Float32Array(nF), flat = new Float32Array(nF), voi = new Float32Array(nF);
  const han = new Float32Array(WIN); for (let i = 0; i < WIN; i++) han[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WIN - 1));
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  const b = (hz) => Math.round((hz * NFFT) / SR);
  const v0 = b(300), v1 = b(3000), h0 = b(3500), h1 = NFFT / 2, l0 = b(60);
  // autokorelasi (40 ms jendela, FFT 1024) untuk kadar bersuara
  const AW = 640, AN = 1024, ar = new Float64Array(AN), ai = new Float64Array(AN);
  const ahan = new Float64Array(AW); for (let i = 0; i < AW; i++) ahan[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (AW - 1));
  // autokorelasi jendela sendiri, untuk normalisasi (Boersma 1993)
  const wr = new Float64Array(AN), wi = new Float64Array(AN);
  for (let i = 0; i < AW; i++) wr[i] = ahan[i];
  fft(wr, wi); for (let i = 0; i < AN; i++) { wr[i] = wr[i] * wr[i] + wi[i] * wi[i]; wi[i] = 0; }
  fft(wr, wi); const rw0 = wr[0];
  const lagLo = Math.floor(SR / 500), lagHi = Math.floor(SR / 50);
  for (let f = 0; f < nF; f++) {
    const s = f * HOP;
    let e = 0, mean = 0;
    for (let i = 0; i < WIN; i++) mean += x[s + i];
    mean /= WIN;
    for (let i = 0; i < WIN; i++) { const v = x[s + i] - mean; e += v * v; re[i] = v * han[i]; im[i] = 0; }
    for (let i = WIN; i < NFFT; i++) { re[i] = 0; im[i] = 0; }
    rms[f] = dB(e / WIN);
    fft(re, im);
    let ev = 0, eh = 0, lsum = 0, asum = 0, cnt = 0;
    for (let k = l0; k < h1; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      if (k >= v0 && k <= v1) ev += p;
      if (k >= h0) eh += p;
      lsum += Math.log(p + 1e-14); asum += p; cnt++;
    }
    vow[f] = dB(ev / (v1 - v0 + 1));
    hi[f] = dB(eh / (h1 - h0));
    flat[f] = Math.exp(lsum / cnt) / (asum / cnt + 1e-14);
    // bersuara: hanya bila ada energi berarti
    if (rms[f] > -75) {
      const c = s + WIN / 2 - AW / 2;
      let m2 = 0, nn = 0;
      for (let i = 0; i < AW; i++) { const j = c + i; if (j >= 0 && j < x.length) { m2 += x[j]; nn++; } }
      m2 = nn ? m2 / nn : 0;
      for (let i = 0; i < AN; i++) { const j = c + i; ar[i] = i < AW && j >= 0 && j < x.length ? (x[j] - m2) * ahan[i] : 0; ai[i] = 0; }
      fft(ar, ai);
      for (let i = 0; i < AN; i++) { ar[i] = ar[i] * ar[i] + ai[i] * ai[i]; ai[i] = 0; }
      fft(ar, ai);
      const r0 = ar[0] || 1e-14;
      let best = 0;
      for (let L = lagLo; L <= lagHi; L++) {
        const r = ar[L] / r0 / (wr[L] / rw0);
        if (r > best && ar[L] >= ar[L - 1] && ar[L] >= ar[L + 1]) best = r;
      }
      voi[f] = Math.min(1, best);
    }
  }
  return { nF, rms, vow, hi, flat, voi };
}

function pct(arr, q) {
  const a = Array.from(arr).filter(Number.isFinite).sort((p, r) => p - r);
  if (!a.length) return 0;
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))))];
}

function smoothArr(a, sig) {
  if (!(sig > 0)) return Float32Array.from(a);
  const R = Math.ceil(sig * 3), k = [];
  for (let i = -R; i <= R; i++) k.push(Math.exp((-i * i) / (2 * sig * sig)));
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    let s = 0, w = 0;
    for (let j = -R; j <= R; j++) { const t = i + j; if (t >= 0 && t < a.length) { s += a[t] * k[j + R]; w += k[j + R]; } }
    out[i] = s / w;
  }
  return out;
}

/* ------------------------------------------------------------------ VAD */

function vad(F, P) {
  const { nF, rms } = F;
  const lv = pct(rms, 0.95);
  // lantai derau adaptif: persentil 10 dalam jendela 4 s, dihitung tiap 0.5 s lalu diinterpolasi
  const step = 50, W = 200, pts = [];
  for (let c = 0; c < nF + step; c += step) {
    const a = Math.max(0, c - W / 2), b = Math.min(nF, c + W / 2);
    pts.push(pct(rms.subarray(a, Math.max(a + 1, b)), 0.1));
  }
  const gFloor = pct(rms, 0.1);
  const thr = new Float32Array(nF);
  for (let f = 0; f < nF; f++) {
    const k = f / step, i0 = Math.floor(k), t = k - i0;
    const fl = Math.min(pts[i0] * (1 - t) + (pts[i0 + 1] ?? pts[i0]) * t, gFloor + 10);
    thr[f] = Math.max(fl + Math.max(P.vadMargin, 0.2 * (lv - fl)), lv - P.vadRel);
  }
  const on = new Uint8Array(nF);
  let st = 0;
  for (let f = 0; f < nF; f++) {
    if (!st && rms[f] > thr[f] + P.vadHyst) st = 1;
    else if (st && rms[f] < thr[f]) st = 0;
    on[f] = st;
  }
  // mundur: histeresis kiri (onset ke titik ambang bawah)
  for (let f = nF - 2; f >= 0; f--) if (!on[f] && on[f + 1] && rms[f] >= thr[f]) on[f] = 1;
  // hangover: tutup celah pendek, buang letupan pendek
  const runs = (val) => { const r = []; for (let f = 0; f < nF;) { if (on[f] === val) { let g = f; while (g < nF && on[g] === val) g++; r.push([f, g]); f = g; } else f++; } return r; };
  for (const [a, b] of runs(0)) if (a > 0 && b < nF && (b - a) / FR < P.vadCloseGap) on.fill(1, a, b);
  for (const [a, b] of runs(1)) if ((b - a) / FR < P.vadMinSpeech) on.fill(0, a, b);
  const reg = runs(1).map(([a, b]) => ({ a, b }));
  // jeda: celah >= pauseMin; celah lebih pendek tetap dicatat sebagai "gap" untuk batas
  const gaps = [];
  for (let i = 1; i < reg.length; i++) gaps.push({ a: reg[i - 1].b, b: reg[i].a, dur: (reg[i].a - reg[i - 1].b) / FR });
  // chunk: wilayah bicara yang dipisah jeda panjang
  const chunkOf = new Int32Array(nF).fill(-1);
  let ch = 0;
  for (let i = 0; i < reg.length; i++) {
    if (i > 0 && gaps[i - 1].dur >= P.pauseMin) ch++;
    reg[i].chunk = ch;
    chunkOf.fill(ch, reg[i].a, reg[i].b);
  }
  // frame sunyi diberi chunk terdekat sebelumnya (untuk inti di tepi)
  let last = 0; for (let f = 0; f < nF; f++) { if (chunkOf[f] >= 0) last = chunkOf[f]; else chunkOf[f] = -1 - last; }
  return { on, reg, gaps, chunkOf, nChunk: reg.length ? ch + 1 : 0, level: lv };
}

/* ------------------------------------------------------------------ inti suku kata */

function syllableNuclei(F, V, P) {
  const { nF, vow, voi, hi } = F;
  // selubung: pita vokal, dikurangi sedikit bila pita tinggi dominan (desis)
  const raw = new Float32Array(nF);
  for (let f = 0; f < nF; f++) raw[f] = vow[f] - 0.5 * Math.max(0, hi[f] - vow[f]);
  const env = smoothArr(raw, P.smooth);
  const sp = []; for (let f = 0; f < nF; f++) if (V.on[f]) sp.push(env[f]);
  // ambang tinggi puncak: relatif ke persentil 95 selubung bicara, lokal (+-5 s) bila cukup data
  const top = pct(sp, 0.95), minH = new Float32Array(nF).fill(top - P.nucRel);
  if (P.nucLocal) {
    const G = 100, Wn = 500;
    for (let c = 0; c < nF; c += G) {
      const a = Math.max(0, c - Wn), b = Math.min(nF, c + G + Wn), loc = [];
      for (let f = a; f < b; f++) if (V.on[f]) loc.push(env[f]);
      if (loc.length >= 100) minH.fill(pct(loc, 0.95) - P.nucRel, c, Math.min(nF, c + G));
    }
  }
  const lim = Math.round(0.3 * FR);
  const cand = [];
  for (let f = 1; f < nF - 1; f++) {
    if (!V.on[f] || !(env[f] >= env[f - 1] && env[f] > env[f + 1]) || env[f] < minH[f]) continue;
    let vv = 0; for (let k = -3; k <= 3; k++) if (f + k >= 0 && f + k < nF) vv = Math.max(vv, voi[f + k]);
    if (vv < P.voiceMin) continue;
    let lmin = env[f], rmin = env[f];
    for (let k = f - 1; k >= Math.max(0, f - lim); k--) { if (env[k] > env[f]) break; if (!V.on[k]) { lmin = -200; break; } lmin = Math.min(lmin, env[k]); }
    for (let k = f + 1; k < Math.min(nF, f + lim); k++) { if (env[k] > env[f]) break; if (!V.on[k]) { rmin = -200; break; } rmin = Math.min(rmin, env[k]); }
    const prom = env[f] - Math.max(lmin, rmin);
    if (prom < P.promMin) continue;
    cand.push({ f, t: f / FR, h: env[f], prom: Math.min(prom, 30), voi: vv });
  }
  // jarak minimum: puncak tertinggi menang
  const md = Math.round(P.minDist * FR), keep = [];
  for (const c of [...cand].sort((a, b) => b.h - a.h || a.f - b.f)) if (!keep.some((k) => Math.abs(k.f - c.f) < md)) keep.push(c);
  keep.sort((a, b) => a.f - b.f);
  for (const k of keep) k.chunk = V.chunkOf[k.f] >= 0 ? V.chunkOf[k.f] : -1 - V.chunkOf[k.f];
  return { nuc: keep, env };
}

/* ------------------------------------------------------------------ teks */

const stripDiacritics = (s) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const isLetter = (c) => /\p{L}/u.test(c);

const ID_UNITS = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
function numberId(n) {
  if (n < 12) return ID_UNITS[n];
  if (n < 20) return ID_UNITS[n - 10] + " belas";
  if (n < 100) return ID_UNITS[Math.floor(n / 10)] + " puluh" + (n % 10 ? " " + ID_UNITS[n % 10] : "");
  if (n < 200) return "seratus" + (n % 100 ? " " + numberId(n % 100) : "");
  if (n < 1000) return ID_UNITS[Math.floor(n / 100)] + " ratus" + (n % 100 ? " " + numberId(n % 100) : "");
  if (n < 2000) return "seribu" + (n % 1000 ? " " + numberId(n % 1000) : "");
  const big = [[1e12, "triliun"], [1e9, "miliar"], [1e6, "juta"], [1e3, "ribu"]];
  for (const [v, w] of big) if (n >= v) { const q = Math.floor(n / v), r = n % v; return numberId(q) + " " + w + (r ? " " + numberId(r) : ""); }
  return String(n);
}
const EN_1 = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_10 = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function numberEn(n) {
  if (n < 20) return EN_1[n];
  if (n < 100) return EN_10[Math.floor(n / 10)] + (n % 10 ? " " + EN_1[n % 10] : "");
  if (n < 1000) return EN_1[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numberEn(n % 100) : "");
  const big = [[1e12, "trillion"], [1e9, "billion"], [1e6, "million"], [1e3, "thousand"]];
  for (const [v, w] of big) if (n >= v) { const q = Math.floor(n / v), r = n % v; return numberEn(q) + " " + w + (r ? " " + numberEn(r) : ""); }
  return String(n);
}
const numberWords = (n, lng) => (lng === "en" ? numberEn(n) : numberId(n));

/** Eja angka di satu token: "2024," -> "dua ribu dua puluh empat"; "3,5" -> "tiga koma lima"; "12%" -> "... persen". */
function spellNumbers(tok, lng) {
  const en = lng === "en";
  return tok.replace(/\d[\d.,]*\d|\d/g, (m) => {
    let s = m, dec = null;
    const th = en ? "," : ".", dc = en ? "." : ",";
    if (new RegExp("^\\d{1,3}(\\" + th + "\\d{3})+$").test(s)) s = s.split(th).join("");
    else if (s.includes(dc)) { const [a, b] = s.split(dc); s = a.split(th).join(""); dec = b; }
    else s = s.replace(/[.,]/g, "");
    let w = s.length > 15 ? s.split("").map((d) => numberWords(+d, lng)).join(" ") : numberWords(parseInt(s, 10), lng);
    if (dec) w += (en ? " point " : " koma ") + dec.replace(/\D/g, "").split("").map((d) => numberWords(+d, lng)).join(" ");
    return " " + w + " ";
  }).replace(/%/g, en ? " percent " : " persen ").replace(/&/g, en ? " and " : " dan ");
}

const ID_LETTERS = { a: "a", b: "be", c: "ce", d: "de", e: "e", f: "ef", g: "ge", h: "ha", i: "i", j: "je", k: "ka", l: "el", m: "em", n: "en", o: "o", p: "pe", q: "ki", r: "er", s: "es", t: "te", u: "u", v: "ve", w: "we", x: "eks", y: "ye", z: "zet" };
const EN_LETTERS = { a: "ay", b: "bee", c: "see", d: "dee", e: "ee", f: "ef", g: "jee", h: "aych", i: "eye", j: "jay", k: "kay", l: "el", m: "em", n: "en", o: "oh", p: "pee", q: "kyu", r: "ar", s: "es", t: "tee", u: "you", v: "vee", w: "dubelyu", x: "eks", y: "why", z: "zee" };

/** Bentuk spoken satu token: daftar "kata ucap" huruf kecil. */
function spoken(tok, lng) {
  let s = stripDiacritics(spellNumbers(tok, lng));
  const parts = s.split(/[^\p{L}']+/u).map((p) => p.replace(/'/g, "")).filter(Boolean);
  const out = [];
  for (const p of parts) {
    // singkatan huruf besar tanpa vokal (mis. "HSE" tetap dibaca kata bila ada vokal)
    if (p.length >= 2 && p.length <= 5 && p === p.toUpperCase() && !/[aeiouAEIOU]/.test(p)) {
      for (const c of p.toLowerCase()) if ((lng === "en" ? EN_LETTERS : ID_LETTERS)[c]) out.push((lng === "en" ? EN_LETTERS : ID_LETTERS)[c]);
    } else out.push(p.toLowerCase());
  }
  return out;
}

/** Suku kata Indonesia. */
export function syllablesId(w) {
  const u = [];
  for (let i = 0; i < w.length;) {
    const two = w.slice(i, i + 2);
    if (/^(ng|ny|sy|kh)$/.test(two)) { u.push({ s: two, v: false }); i += 2; continue; }
    const c = w[i];
    if ("aiueo".includes(c)) {
      // diftong ai/au/oi/ei hanya di akhir kata (pantai, pulau, amboi, survei); "main" = ma-in
      if (/^(ai|au|oi|ei)$/.test(two) && i + 2 === w.length) { u.push({ s: two, v: true }); i += 2; continue; }
      u.push({ s: c, v: true }); i++; continue;
    }
    u.push({ s: c, v: false }); i++;
  }
  return splitUnits(u);
}

/** Suku kata Inggris: gugus vokal (aeiouy) dengan e bisu di akhir dan -ed/-es bisu. */
export function syllablesEn(w) {
  // akhiran yang berdiri sebagai suku sendiri: complete-ly, move-ment, home-less
  const suf = w.match(/^(.{3,}?)(ly|ment|ness|ful|less)$/);
  if (suf && /[aeiouy]/.test(suf[1])) return [...syllablesEn(suf[1]), ...syllablesEn(suf[2])];
  const u = [];
  for (let i = 0; i < w.length;) {
    const c = w[i];
    if (c === "q" && w[i + 1] === "u") { u.push({ s: "qu", v: false }); i += 2; continue; }
    const isV = "aeiou".includes(c) || (c === "y" && i > 0);
    if (isV) {
      let j = i + 1;
      while (j < w.length && ("aeiou".includes(w[j]) || (w[j] === "y" && j > i))) {
        // hiatus: vi-a, cre-ate, qui-et, du-o
        const pair = w[j - 1] + w[j];
        if (/^(ia|iu|eo|uo)$/.test(pair) || (pair === "ie" && w[j + 1] === "t")) break;
        j++;
      }
      u.push({ s: w.slice(i, j), v: true }); i = j;
    } else { u.push({ s: c, v: false }); i++; }
  }
  const nV = u.filter((x) => x.v).length;
  if (nV > 1) {
    const L = u.length;
    const last = u[L - 1], prev = u[L - 2];
    // e bisu: "-Ce" (bukan "-le" setelah konsonan: table)
    if (last.v && last.s === "e" && prev && !prev.v && !(prev.s === "l" && u[L - 3] && !u[L - 3].v)) last.v = false;
    // -ed bisu kecuali setelah t/d; -es bisu kecuali setelah s/x/z/ch/sh/g/c
    else if (L >= 3 && !last.v && u[L - 2].v && u[L - 2].s === "e") {
      const pc = u[L - 3] && !u[L - 3].v ? u[L - 3].s : "";
      if ((last.s === "d" && !/[td]/.test(pc)) || (last.s === "s" && pc && !/[sxzcgh]/.test(pc))) u[L - 2].v = false;
    }
  }
  return splitUnits(u);
}

/** Potong unit jadi suku kata: V-V, V-CV, VC-CV, VCC-CV (konsonan terakhir ke suku berikutnya). */
function splitUnits(u) {
  const vi = []; u.forEach((x, i) => { if (x.v) vi.push(i); });
  if (!vi.length) return [u.map((x) => x.s).join("")].filter(Boolean);
  const cuts = [];
  for (let k = 1; k < vi.length; k++) {
    const nC = vi[k] - vi[k - 1] - 1;
    cuts.push(nC === 0 ? vi[k] : vi[k] - 1);
  }
  const out = []; let a = 0;
  for (const c of cuts) { out.push(u.slice(a, c).map((x) => x.s).join("")); a = c; }
  out.push(u.slice(a).map((x) => x.s).join(""));
  return out.filter(Boolean);
}

/** Token naskah: tanda baca yang berdiri sendiri ditempel ke kata sebelumnya. */
export function scriptTokens(teks) {
  const raw = String(teks).replace(/\r/g, "").replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of raw) {
    if (!/[\p{L}\p{N}]/u.test(t)) { if (out.length) out[out.length - 1] += t; }
    else out.push(t);
  }
  return out;
}

/** Bangun kata + suku dari naskah. */
export function prepareScript(teks, lng = "id") {
  const toks = scriptTokens(teks), words = [], syl = [];
  for (const tok of toks) {
    const sp = spoken(tok, lng);
    const su = [];
    for (const w of sp) for (const s of (lng === "en" ? syllablesEn(w) : syllablesId(w))) su.push(s);
    if (!su.length) su.push(stripDiacritics(tok).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") || "?");
    const m = tok.match(/([.,;:?!\u2026\u2014-]+)["')\]\u201d\u2019]*$/);
    const tail = m ? m[1] : "";
    const punct = /[.;:?!\u2026]/.test(tail) ? 2 : /[,\u2014-]/.test(tail) ? 1 : 0;
    const wi = words.length;
    words.push({ text: tok, sp: sp.join(" "), punct, s0: syl.length, n: su.length });
    su.forEach((s, k) => syl.push({ text: s, w: wi, first: k === 0, last: k === su.length - 1, onset: onsetKind(s), wt: weight(s) }));
  }
  return { words, syl };
}

function onsetKind(s) {
  if (/^[aeiouy]/.test(s)) return "v";
  if (/^(ng|ny|[lrmnwyh])/.test(s)) return "s";
  return "c";
}
function weight(s) { return 1 + 0.25 * s.replace(/[aeiouy]/g, "").length; }

/* ------------------------------------------------------------------ DP */

function alignDP(syl, words, nuc, P, dExp, V, prev = null) {
  const N = syl.length, M = nuc.length, INF = 1e30;
  // tipe batas sebelum suku i: 0 awal/akhir, 1 dalam kata, 2 antar kata, 3 koma, 4 titik dsb.
  const bt = new Int8Array(N + 1);
  for (let i = 1; i < N; i++) {
    if (!syl[i].first) bt[i] = 1;
    else { const pw = words[syl[i - 1].w].punct; bt[i] = pw === 2 ? 4 : pw === 1 ? 3 : 2; }
  }
  // lama jeda di antara inti j-1 dan j
  const pd = new Float32Array(M);
  for (let j = 1; j < M; j++) for (const g of V.gaps) if (g.dur >= P.pauseMin && g.a >= nuc[j - 1].f && g.b <= nuc[j].f) pd[j] += g.dur;
  const cross = (i, j) => (bt[i] === 0 ? 0 : bt[i] === 1 ? P.pauseInWord * (1 + pd[j] / 0.2) : bt[i] === 2 ? P.pauseWord * Math.min(3, pd[j] / 0.2) : 0);
  const noPause = (i) => (bt[i] === 4 ? P.punctNoPause : bt[i] === 3 ? P.commaNoPause : 0);
  const missC = (i) => (syl[i].onset === "v" ? P.missVow : syl[i].onset === "s" ? P.missSon : P.miss);
  const skipC = (j) => P.skip0 + P.skipK * Math.min(1, nuc[j].prom / 12) * Math.min(1, nuc[j].voi / 0.7);
  const crosses = (j) => j > 0 && nuc[j].chunk !== nuc[j - 1].chunk;
  // jarak antar-inti yang diharapkan sebelum suku i: tumbuh dengan jumlah konsonan di antara dua vokal
  const nCons = (i) => {
    const a = syl[i - 1].text.replace(/^[^aeiouy]*[aeiouy]+/, ""), b = syl[i].text.match(/^[^aeiouy]*/)[0];
    return (a + b).replace(/ng|ny|sy|kh|th|sh|ch|ph/g, "x").length;
  };
  // laju lokal (putaran kedua): detik bicara per suku kata dalam jendela +-rateWin s menurut hasil putaran
  // pertama, relatif terhadap rata-rata seluruh audio. Menangani narasi yang laju bicaranya berubah.
  const loc = new Float32Array(M).fill(1);
  if (prev && P.rateWin > 0 && M > 1) {
    const ts = [], an = [];
    for (let i = 0; i < N; i++) if (prev[i] >= 0) an.push(i);
    if (an.length >= 2) {
      for (let i = 0; i < N; i++) {
        let k = 0; while (k < an.length - 1 && an[k + 1] <= i) k++;
        const i0 = an[k], i1 = an[Math.min(an.length - 1, k + 1)];
        const t0 = nuc[prev[i0]].t, t1 = nuc[prev[i1]].t;
        ts.push(i1 === i0 ? t0 : t0 + ((t1 - t0) * (i - i0)) / (i1 - i0));
      }
      const spF = new Float64Array(V.on.length + 1);
      for (let f = 0; f < V.on.length; f++) spF[f + 1] = spF[f] + V.on[f];
      const Wf = Math.round(P.rateWin * FR);
      for (let j = 0; j < M; j++) {
        const f = nuc[j].f, f0 = Math.max(0, f - Wf), f1 = Math.min(V.on.length, f + Wf);
        let cnt = 0; for (const t of ts) if (t * FR >= f0 && t * FR < f1) cnt++;
        if (cnt >= 6) loc[j] = Math.max(0.6, Math.min(1.7, (spF[f1] - spF[f0]) / FR / cnt / dExp));
      }
    }
  }
  const dp = new Float32Array(N + 1);
  if (N > 1) {
    let tot = 0;
    for (let i = 1; i < N; i++) { dp[i] = 1 + P.consK * nCons(i); tot += dp[i]; }
    const k = dExp / (tot / (N - 1));
    for (let i = 1; i < N; i++) dp[i] *= k;
  }
  // band di sekitar diagonal untuk audio panjang
  const W = N * M <= 4e6 ? Math.max(N, M) + 1 : Math.max(300, Math.ceil(0.2 * Math.max(N, M)));
  const lo = new Int32Array(N + 1), hi = new Int32Array(N + 1);
  for (let i = 0; i <= N; i++) { const c = Math.round((i * M) / Math.max(1, N)); lo[i] = Math.max(0, c - W); hi[i] = Math.min(M, c + W); }
  const rows = [];
  for (let i = 0; i <= N; i++) {
    const L = hi[i] - lo[i] + 1;
    rows.push({ D: [new Float64Array(L).fill(INF), new Float64Array(L).fill(INF)], B: [new Int8Array(L), new Int8Array(L)], T: [new Float32Array(L).fill(-1), new Float32Array(L).fill(-1)], E: [new Float32Array(L), new Float32Array(L)] });
  }
  const get = (i, j, c) => (j < lo[i] || j > hi[i] ? INF : rows[i].D[c][j - lo[i]]);
  const set = (i, j, c, v, b, t, e) => {
    if (j < lo[i] || j > hi[i]) return;
    const r = rows[i], k = j - lo[i];
    if (v < r.D[c][k]) { r.D[c][k] = v; r.B[c][k] = b; r.T[c][k] = t; r.E[c][k] = e; }
  };
  rows[0].D[0][0] = 0;
  // kode balik: 1 cocok (dari c0), 2 cocok (dari c1), 3 lewati inti (dari c0), 4 lewati (dari c1), 5 tanpa inti (dari c0), 6 tanpa inti (dari c1)
  for (let i = 0; i <= N; i++) for (let j = lo[i]; j <= hi[i]; j++) for (let c = 0; c < 2; c++) {
    const d = get(i, j, c);
    if (d >= INF) continue;
    const lt = rows[i].T[c][j - lo[i]], le = rows[i].E[c][j - lo[i]];
    if (j < M) {
      // lewati inti j
      const x = crosses(j);
      set(i, j + 1, x || c ? 1 : 0, d + skipC(j) + (x ? cross(i, j) : 0), c ? 4 : 3, x ? -1 : lt, x ? 0 : le);
      if (i < N) {
        // cocokkan suku i dengan inti j
        const crossed = c || x;
        let cost = (x ? cross(i, j) : 0) + (!crossed && i > 0 && j > 0 ? noPause(i) : 0);
        if (lt >= 0 && !crossed && i > 0 && bt[i] <= 2) {
          const r = Math.log(Math.max(0.02, nuc[j].t - lt) / ((le + dp[i]) * loc[j]));
          cost += P.rateK * (P.rateCap > 0 ? Math.min(r * r, P.rateCap) : r * r);
        }
        set(i + 1, j + 1, 0, d + cost, c ? 2 : 1, nuc[j].t, 0);
      }
    }
    if (i < N) set(i + 1, j, 0, d + missC(i) + (!c && i > 0 && j > 0 && j < M ? noPause(i) : 0), c ? 6 : 5, c ? -1 : lt, c ? 0 : le + (i > 0 ? dp[i] : 0));
  }
  let c = get(N, M, 0) <= get(N, M, 1) ? 0 : 1;
  const total = get(N, M, c);
  const asg = new Int32Array(N).fill(-1);
  for (let i = N, j = M; i > 0 || j > 0;) {
    if (j < lo[i] || j > hi[i]) break;
    const b = rows[i].B[c][j - lo[i]];
    if (!b) break;
    const pc = b % 2 === 1 ? 0 : 1;
    if (b <= 2) { asg[i - 1] = j - 1; i--; j--; }
    else if (b <= 4) { j--; }
    else { i--; }
    c = pc;
  }
  return { asg, cost: total };
}

/* ------------------------------------------------------------------ batas */

function boundaries(syl, words, nuc, asg, V, env, P) {
  const N = syl.length;
  const gapsBetween = (f0, f1) => V.gaps.filter((g) => g.a >= f0 && g.b <= f1);
  const regOf = (f) => V.reg.find((r) => f >= r.a && f < r.b) || V.reg.reduce((best, r) => (!best || Math.min(Math.abs(r.a - f), Math.abs(r.b - f)) < Math.min(Math.abs(best.a - f), Math.abs(best.b - f)) ? r : best), null);
  const anc = []; for (let i = 0; i < N; i++) if (asg[i] >= 0) anc.push(i);
  const seg = new Array(N).fill(null);
  if (!anc.length) return null;
  // segmen untuk suku berinti
  for (let k = 0; k < anc.length; k++) {
    const i = anc[k], f = nuc[asg[i]].f;
    seg[i] = { a: null, b: null, f };
  }
  for (let k = 0; k < anc.length; k++) {
    const i = anc[k], fi = seg[i].f;
    if (k === 0) { const r = regOf(fi); seg[i].a = Math.max(r ? Math.min(r.a, fi) : fi, fi - P.headMax * FR); seg[i].preGap = true; }
    if (k === anc.length - 1) { const r = regOf(fi); seg[i].b = Math.min(r ? Math.max(r.b, fi + 1) : fi + 1, fi + P.tailMax * FR); seg[i].postGap = true; }
    if (k < anc.length - 1) {
      const j = anc[k + 1], fj = seg[j].f;
      const gs = gapsBetween(fi, fj);
      if (gs.length) {
        const g = gs.reduce((p, q) => (q.b - q.a > p.b - p.a ? q : p));
        seg[i].b = Math.min(g.a, fi + P.tailMax * FR); seg[j].a = Math.max(g.b, fj - P.headMax * FR);
        seg[i].postGap = true; seg[j].preGap = true; seg[j].gapA = g.a;
      } else {
        let m = fi + 1, mv = Infinity;
        for (let f = fi + 1; f < fj; f++) if (env[f] < mv) { mv = env[f]; m = f; }
        // konsonan awal: batas di tempat energi mulai turun ke lembah, bukan di dasar lembah
        if (P.bndDrop > 0 && syl[j].onset !== "v") while (m - 1 > fi && env[m - 1] <= mv + P.bndDrop) m--;
        seg[i].b = m; seg[j].a = m;
      }
    }
  }
  // tutupan letup sebelum suku berawal p/t/k/b/d/g/c setelah celah
  for (const i of anc) {
    const s = seg[i];
    if (s.preGap && /^[ptkbdgc]/.test(syl[i].text)) s.a = Math.max(s.gapA ?? s.a - P.closure * FR, s.a - P.closure * FR);
  }
  // suku tanpa inti: tempel ke tetangga, bagi rentang menurut bobot
  const groups = []; // [{idx:[...], a, b}]
  for (let k = 0; k <= anc.length; k++) {
    const i0 = k === 0 ? 0 : anc[k - 1] + 1, i1 = k === anc.length ? N : anc[k];
    if (i1 <= i0) continue;
    const prev = k > 0 ? anc[k - 1] : -1, next = k < anc.length ? anc[k] : -1;
    const run = []; for (let i = i0; i < i1; i++) run.push(i);
    let side;
    if (prev < 0) side = "next"; else if (next < 0) side = "prev";
    else {
      const wPrev = syl[prev].w, wNext = syl[next].w, wa = syl[i0].w, wb = syl[i1 - 1].w;
      const pauseBetween = seg[prev].postGap && seg[next].preGap;
      if (wa === wPrev && wb !== wNext) side = "prev";
      else if (wb === wNext && wa !== wPrev) side = "next";
      else if (wa === wPrev && wb === wNext) side = !pauseBetween ? "both" : syl[i0].onset === "v" ? "prev" : "next";
      else if (pauseBetween) side = words[wb].punct ? "prev" : "next";
      else side = "both";
    }
    groups.push({ run, prev, next, side });
  }
  for (const g of groups) {
    let list, a, b;
    if (g.side === "prev") { list = [g.prev, ...g.run]; a = seg[g.prev].a; b = seg[g.prev].b; }
    else if (g.side === "next") { list = [...g.run, g.next]; a = seg[g.next].a; b = seg[g.next].b; }
    else { list = [g.prev, ...g.run, g.next]; a = seg[g.prev].a; b = seg[g.next].b; }
    const ws = list.map((i) => syl[i].wt), tot = ws.reduce((x, y) => x + y, 0);
    let t = a;
    list.forEach((i, k) => {
      const d = ((b - a) * ws[k]) / tot;
      seg[i] = { ...(seg[i] || {}), a: t, b: t + d };
      t += d;
    });
  }
  return seg.map((s) => ({ start: s.a / FR, end: Math.max(s.a, s.b) / FR }));
}

function letterPhones(sukuOut) {
  const ph = [];
  for (const s of sukuOut) {
    const L = [...s.text].filter(isLetter);
    if (!L.length) continue;
    const isV = (c) => "aeiouy".includes(c);
    let v0 = L.findIndex(isV); if (v0 < 0) v0 = L.length;
    let v1 = v0; while (v1 < L.length && isV(L[v1])) v1++;
    const on = v0, cod = L.length - v1, nv = v1 - v0;
    const dur = Math.max(0.001, s.end - s.start);
    const cd = Math.min(0.06, (dur * 0.4) / Math.max(1, on + cod));
    const vd = nv ? (dur - cd * (on + cod)) / nv : 0;
    let t = s.start;
    L.forEach((c, k) => {
      const d = k >= v0 && k < v1 ? vd : nv ? cd : dur / L.length;
      ph.push({ start: +t.toFixed(3), end: +(t + d).toFixed(3), phone: c });
      t += d;
    });
  }
  return ph;
}

/* ------------------------------------------------------------------ main */

function readText(v) {
  if (v == null) return null;
  try { if (fs.existsSync(v) && fs.statSync(v).isFile()) return fs.readFileSync(v, "utf8"); } catch { /* text given directly */ }
  return String(v);
}

/** Align a 16 kHz mono signal (Float32Array) to a script. The core of align(). Old option names bahasa/huruf accepted. */
export function alignSignal(x, script, opts = {}) {
  const P = { ...PARAM, ...(opts.param || {}) };
  const lng = (opts.lang ?? opts.language ?? opts.bahasa) === "en" ? "en" : "id";
  const wantLetters = opts.letters ?? opts.huruf;
  const { words, syl } = prepareScript(script, lng);
  if (!words.length) throw new Error(L`empty script`);
  const F = features(x);
  const V = vad(F, P);
  const { nuc, env } = syllableNuclei(F, V, P);
  const dur = x.length / SR;
  const speech = V.reg.reduce((s, r) => s + (r.b - r.a), 0) / FR;
  const dExp = Math.max(0.08, Math.min(0.5, speech / Math.max(1, syl.length)));
  let segs = null, asg = null;
  if (nuc.length) {
    ({ asg } = alignDP(syl, words, nuc, P, dExp, V));
    if (P.rateWin > 0) ({ asg } = alignDP(syl, words, nuc, P, dExp, V, asg));
    segs = boundaries(syl, words, nuc, asg, V, env, P);
  }
  if (!segs) {
    // no nuclei: spread evenly over the speech range (or the whole audio)
    const a = V.reg.length ? V.reg[0].a / FR : 0, b = V.reg.length ? V.reg[V.reg.length - 1].b / FR : dur;
    const tot = syl.reduce((s, q) => s + q.wt, 0); let t = a;
    segs = syl.map((q) => { const d = ((b - a) * q.wt) / tot; const r = { start: t, end: t + d }; t += d; return r; });
  }
  const r3 = (v) => +Math.max(0, Math.min(dur, v)).toFixed(3);
  const out = words.map((w, i) => {
    const su = segs.slice(w.s0, w.s0 + w.n).map((s, k) => ({ text: syl[w.s0 + k].text, start: r3(s.start), end: r3(s.end) }));
    return { id: "w" + i, text: w.text, start: su[0].start, end: su[su.length - 1].end, syllables: su };
  });
  // keep the order monotonic
  for (let i = 1; i < out.length; i++) if (out[i].start < out[i - 1].end) { const m = +(Math.max(out[i].start, Math.min(out[i - 1].end, out[i].end))).toFixed(3); out[i - 1].end = Math.min(out[i - 1].end, m); out[i].start = Math.max(out[i].start, out[i - 1].end); }
  const used = asg ? Array.from(asg).filter((v) => v >= 0).length : 0;
  const pauses = V.gaps.filter((g) => g.dur >= P.pauseMin).length;
  if (opts.debug) opts.debug.v = { nuc, reg: V.reg, gaps: V.gaps, asg, syl };
  return {
    words: out, letters: wantLetters ? letterPhones(out.flatMap((k) => k.syllables)) : null,
    stats: { words: words.length, syllables: syl.length, nuclei: nuc.length, nucleiUsed: used, syllablesWithoutNucleus: syl.length - used, pauses, regions: V.reg.length, duration: +dur.toFixed(3), speech: +speech.toFixed(3) },
  };
}

/**
 * Program use: await align("voice.wav", { script: "text.txt" | "text given directly", o: "words.json",
 *   lang: "id"|"en", letters: "phones.json", quiet: true, param: {...} })
 * Returns { out, words, letters, lettersOut, stats }. Without o/out no file is written.
 * Old option names (naskah, teks, bahasa, huruf, diam) are accepted.
 */
export async function align(inp, opts = {}) {
  if (!inp) throw new Error(L`Name an audio file: mgp align voice.wav --script text.txt -o words.json`);
  inp = path.resolve(inp);
  if (!fs.existsSync(inp)) throw new Error(L`file not found: ${inp}`);
  const quiet = opts.quiet ?? opts.diam, letters = opts.letters ?? opts.huruf;
  const script = readText(opts.script ?? opts.naskah ?? opts.teks);
  if (!script || !script.trim()) throw new Error(L`--script is required: a text file path or the text itself`);
  const x = await loadAudio(inp);
  const r = alignSignal(x, script, { lang: opts.lang ?? opts.language ?? opts.bahasa, letters: !!letters, param: opts.param, debug: opts.debug });
  const out = opts.o || opts.out;
  if (out) {
    const f = path.resolve(out);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, "[\n" + r.words.map((w) => "  " + JSON.stringify(w)).join(",\n") + "\n]\n");
    r.out = f;
  }
  if (letters && typeof letters === "string") {
    const f = path.resolve(letters);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, "[\n" + r.letters.map((w) => "  " + JSON.stringify(w)).join(",\n") + "\n]\n");
    r.lettersOut = f;
  }
  const s = r.stats, o = { quiet };
  say(o, L`align: ${s.words} words, ${s.syllables} syllables; ${s.nuclei} nuclei detected (${s.nucleiUsed} used, ${s.syllablesWithoutNucleus} syllables without a nucleus); ${s.pauses} pauses; speech ${s.speech} of ${s.duration} s`);
  if (r.out) say(o, L`${s.words} words -> ${r.out}`);
  if (r.lettersOut) say(o, L`${r.letters.length} letters -> ${r.lettersOut}`);
  return r;
}

const help = () => L`mgp align <audio> [script.txt | --script text.txt] -o words.json [--language id|en] [--letters phones.json] [--json] [--quiet]

Aligns a script to audio without Whisper: syllable nucleus detection + dynamic programming.
  --script, -n   path of a text file or the text itself (required; may also be the 2nd positional, the flag wins)
  -o, --out      JSON output [{id,text,start,end,syllables}] (default: words.json)
  --language     id (default) or en: syllable splitting rules and number spelling
  --letters      also write per-letter timing [{start,end,phone}] for MGP.lipsync.visemes()
  --param k=v    change an algorithm parameter (repeatable; see PARAM in src/align.mjs)
  --json         print a JSON summary to stdout
  --quiet        no messages on stderr
Old names still work: mgp selaras, --naskah/--teks, --bahasa, --huruf, --diam.`;

export async function cli(argv) {
  let a;
  try {
    a = parseArgs({
      args: argv, allowPositionals: true, options: {
        script: { type: "string", short: "n" }, o: { type: "string", short: "o" }, out: { type: "string" },
        language: { type: "string" }, lang: { type: "string" }, letters: { type: "string" }, param: { type: "string", multiple: true },
        json: { type: "boolean" }, quiet: { type: "boolean" }, help: { type: "boolean", short: "h" },
      },
    });
  } catch (e) { console.error("mgp align: " + e.message + "\n\n" + help()); process.exit(2); }
  const { values: v, positionals: pos } = a;
  if (v.help || !pos.length) { console.log(help()); if (!pos.length && !v.help) process.exitCode = 2; return; }
  const param = {};
  for (const kv of v.param || []) { const [k, val] = kv.split("="); if (!(k in PARAM)) { console.error("mgp align: " + L`unknown parameter: ${k}`); process.exit(2); } param[k] = +val; }
  const lng = (v.language || v.lang || "id").toLowerCase();
  if (!["id", "en"].includes(lng)) { console.error("mgp align: " + L`--language must be id or en`); process.exit(2); }
  try {
    const r = await align(pos[0], { script: v.script ?? pos[1], o: v.o || v.out || "words.json", lang: lng, letters: v.letters, quiet: v.quiet, param });
    if (v.json) console.log(JSON.stringify({ out: r.out, letters: r.lettersOut || null, ...r.stats }));
  } catch (e) { console.error("mgp align: " + e.message); process.exit(1); }
}

// Old names (v2.3 / v2.4-dev).
export const selaras = align, selarasSinyal = alignSignal, bacaWav = readWav, muatAudio = loadAudio;
export const sukuId = syllablesId, sukuEn = syllablesEn, tokenNaskah = scriptTokens, siapkanNaskah = prepareScript;
