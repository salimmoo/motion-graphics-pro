/**
 * MGP.sfx - deterministic procedural sound effects (pure JS DSP, 48 kHz, no samples, no network).
 *
 * The same code runs in the browser (classic <script>, registers MGP.sfx) and in Node (require / createRequire),
 * so a cue list mixed in a composition and the WAV that `rekam sfx` writes are sample-identical.
 * In the browser, `MGP.sfx.offline(cues)` mixes through an OfflineAudioContext and returns an AudioBuffer.
 *
 * API
 *   sfx.list()                                 [{name, aliases, hint, duration, params:{k:[default, hint]}}]   (old: daftar, keys nama/alias/ket/durasi/param)
 *   sfx.synth(name, {duration, seed, gain, pan, sr, ...params})   -> {sr, ch:[Float32Array L, R], duration}   (old: buat, durasi)
 *   sfx.mix(cues, {duration, sr, peak})        cues [{t, sfx, seed, duration, gain, pan, param}] -> same shape   (old: campur, durasi, puncak)
 *   English preset and parameter names (v2.4) are aliases of the original keys, which also seed the noise:
 *   renaming them would change the sound, so the internal keys stay (e.g. "type" -> "ketik", param pitch -> nada).
 *   sfx.wav(bunyi, {bit:16|24|32})             -> Uint8Array (RIFF WAVE, PCM 16/24-bit or float 32)
 *   sfx.toAudioBuffer(bunyi, audioCtx)         browser: AudioBuffer
 *   sfx.offline(cues, {durasi})                browser: Promise<AudioBuffer> rendered by an OfflineAudioContext
 *   sfx.lib                                    {rng, Biquad, pink, brown, reverb, ...} building blocks
 *
 * Every preset is a pure function of (params, seed): no Math.random, no clocks.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  const M = (root.MGP = root.MGP || {}); M.sfx = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TAU = Math.PI * 2, SR0 = 48000;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const db = (x) => Math.pow(10, x / 20);

  /* ---------- randomness ---------- */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* ---------- filters and generators ---------- */
  function Biquad() { this.b0 = 1; this.b1 = this.b2 = this.a1 = this.a2 = this.z1 = this.z2 = 0; }
  Biquad.prototype.set = function (type, f, q, sr, gdb) {
    f = clamp(f, 8, sr * 0.45); q = Math.max(0.05, q || 0.707);
    const w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lp") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === "hp") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === "bp") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else { const A = Math.pow(10, (gdb || 0) / 40); b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0; return this;
  };
  Biquad.prototype.run = function (x) { const y = this.b0 * x + this.z1; this.z1 = this.b1 * x - this.a1 * y + this.z2; this.z2 = this.b2 * x - this.a2 * y; return y; };
  const bq = (type, f, q, sr, g) => new Biquad().set(type, f, q, sr, g);
  // pink noise (Paul Kellet, refined) and brown noise generators
  function pink(r) { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; return () => { const w = r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; const y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926; return y * 0.11; }; }
  function brown(r) { let y = 0; return () => { y = (y + (r() * 2 - 1) * 0.02) * 0.998; return y * 3.5; }; }
  // smooth random curve: value noise with cosine interpolation, `hz` = changes per second
  function wander(r, hz, sr, n) { const k = Math.ceil((n / sr) * hz) + 3, v = Array.from({ length: k }, r); return (i) => { const x = (i / sr) * hz, j = Math.floor(x), u = x - j, s = (1 - Math.cos(Math.PI * u)) / 2; return v[j] + (v[j + 1] - v[j]) * s; }; }
  const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
  // bell-shaped swell with the peak at fraction p of the length
  const swell = (u, p, k = 1.6) => { if (u <= 0 || u >= 1) return 0; const v = u < p ? (u / p) * 0.5 : 0.5 + ((u - p) / (1 - p)) * 0.5; return Math.pow(Math.sin(Math.PI * v), k); };
  const buf = (sr, d) => new Float32Array(Math.max(1, Math.round(sr * d)));
  // damped sine partial added into `o` from sample index i0
  function partial(o, sr, i0, f, amp, tau, ph = 0, len) {
    const n = Math.min(o.length - i0, Math.round(sr * (len || tau * 7))); const w = (TAU * f) / sr, k = Math.exp(-1 / (tau * sr));
    let a = amp; for (let i = 0; i < n; i++) { o[i0 + i] += a * Math.sin(w * i + ph); a *= k; }
  }
  // short filtered noise burst
  function burst(o, sr, i0, r, len, f, q, amp, type = "bp") { const F = bq(type, f, q, sr), n = Math.min(o.length - i0, Math.round(sr * len)); for (let i = 0; i < n; i++) { const e = Math.exp(-i / (n * 0.3)); o[i0 + i] += F.run(r() * 2 - 1) * amp * e; } }

  /* ---------- reverb (Schroeder/Freeverb style, deterministic) ---------- */
  function reverb(L, R, sr, mix = 0.2, size = 0.8, damp = 0.4) {
    const sc = sr / 44100, CD = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AD = [556, 441, 341, 225];
    const make = (off) => ({ c: CD.map((d) => ({ b: new Float32Array(Math.round((d + off) * sc)), i: 0, f: 0 })), a: AD.map((d) => ({ b: new Float32Array(Math.round((d + off) * sc)), i: 0 })) });
    const dL = L.slice(), dR = R.slice(), chans = [[L, dL, make(0)], [R, dR, make(23)]], fb = 0.7 + 0.28 * size;
    for (const [X, dry, st] of chans) {
      for (let n = 0; n < X.length; n++) {
        const x = (dL[n] + dR[n]) * 0.015; let y = 0;
        for (const c of st.c) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.b.length; y += o; }
        for (const a of st.a) { const bo = a.b[a.i], out = bo - y; a.b[a.i] = y + bo * 0.5; a.i = (a.i + 1) % a.b.length; y = out; }
        X[n] = dry[n] * (1 - mix * 0.5) + y * mix * 3;
      }
    }
  }

  /* ---------- presets ---------- */
  // each: {ket, durasi, param: {k: [default, keterangan]}, level: {puncak|rms}, fn(p, r, sr, n) -> mono Float32Array | [L, R]}
  const P = {};
  const def = (nama, spec) => (P[nama] = spec);

  def("whoosh", { ket: "desir udara cepat (lewat kamera, transisi)", durasi: 0.8, level: { puncak: -1 },
    param: { dari: [350, "frekuensi awal pita (Hz)"], ke: [2600, "frekuensi akhir pita (Hz)"], puncak: [0.55, "letak puncak (0..1)"], q: [1.8, "ketajaman pita"], geser: [0.7, "lebar geser stereo kiri-kanan (0..1)"] },
    fn(p, r, sr, n) {
      const L = new Float32Array(n), R = new Float32Array(n), nz = pink(r), F1 = new Biquad(), F2 = new Biquad(), H = bq("hp", 120, 0.7, sr);
      for (let i = 0; i < n; i++) {
        const u = i / n; if (i % 16 === 0) { const f = p.dari * Math.pow(p.ke / p.dari, swell(u, p.puncak, 1) * 0.5 + u * 0.5); F1.set("bp", f, p.q, sr); F2.set("bp", f * 2.1, p.q * 1.4, sr); }
        const x = nz(), e = swell(u, p.puncak, 1.7), y = H.run(F1.run(x) * 1.0 + F2.run(x) * 0.45) * e;
        const pan = (u - 0.5) * 2 * p.geser, a = (pan + 1) * Math.PI / 4; L[i] = y * Math.cos(a); R[i] = y * Math.sin(a);
      }
      return [L, R];
    } });

  def("swoosh-kertas", { ket: "kibasan kertas (kertas melayang, kartu masuk)", durasi: 0.45, level: { puncak: -2 },
    param: { terang: [3200, "pusat pita (Hz)"], butir: [260, "butir serat per detik"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), nz = pink(r), F = new Biquad(), H = bq("hp", 900, 0.7, sr), G = bq("lp", 60, 0.7, sr);
      for (let i = 0; i < n; i++) {
        const u = i / n; if (i % 16 === 0) F.set("bp", p.terang * (1.15 - 0.35 * u), 0.8, sr);
        const grain = r() < p.butir / sr ? 1 : 0, gm = 0.55 + Math.abs(G.run(grain * 40)) * 0.9 + (r() < 0.002 ? 0.6 : 0);
        o[i] = H.run(F.run(nz())) * swell(u, 0.28, 1.3) * gm;
      }
      return o;
    } });

  def("lipat", { ket: "lipatan kertas: kriuk lalu tekan lipatan", durasi: 0.7, level: { puncak: -1.5 },
    param: { jumlah: [16, "jumlah kriuk"], tekan: [1, "bunyi tekan lipatan di akhir (0/1)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), d = n / sr, H = bq("hp", 1500, 0.7, sr), nz = pink(r);
      for (let i = 0; i < n; i++) o[i] = H.run(nz()) * 0.08 * swell(i / n, 0.4, 1.2);
      for (let k = 0; k < p.jumlah; k++) {
        const u = 0.08 + 0.72 * Math.pow(r(), 0.8), i0 = Math.round(u * n);
        burst(o, sr, i0, r, 0.0015 + r() * 0.004, 1800 + r() * 5200, 1.5 + r() * 3, 0.45 + r() * 0.7);
      }
      if (p.tekan) { const i0 = Math.round(Math.min(d - 0.08, d * 0.84) * sr); burst(o, sr, i0, r, 0.035, 700, 0.8, 0.9, "lp"); partial(o, sr, i0, 150, 0.35, 0.03); burst(o, sr, i0, r, 0.006, 4200, 2, 0.5); }
      return o;
    } });

  def("sobek", { ket: "kertas disobek", durasi: 0.9, level: { puncak: -1 },
    param: { kasar: [1, "kekasaran serat (0.3..2)"], dari: [1800, "pusat pita awal (Hz)"], ke: [3600, "pusat pita akhir (Hz)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), nz = pink(r), F = new Biquad(), L = bq("bp", 900, 0.9, sr), S = bq("bp", 1400, 0.8, sr), H = bq("hp", 280, 0.7, sr);
      let snap = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n; if (i % 16 === 0) F.set("bp", p.dari + (p.ke - p.dari) * u, 1.1, sr);
        const rate = (250 + 900 * Math.sin(Math.PI * Math.min(1, u * 1.15))) * p.kasar;
        if (r() < rate / sr) snap = 0.6 + r() * 0.8; snap *= 0.993;
        const e = (u < 0.06 ? u / 0.06 : 1) * (u > 0.9 ? (1 - u) / 0.1 : 1);
        const x = nz(); o[i] = H.run((F.run(x) * (0.35 + snap * 1.3) + L.run(x) * 0.3 * snap) * e + S.run(r() * 2 - 1) * 0.05 * e);
      }
      return o;
    } });

  def("pop", { ket: "pop gelembung / muncul", durasi: 0.16, level: { puncak: -1 },
    param: { nada: [420, "nada akhir (Hz)"], tekuk: [2.6, "lonjakan nada awal (kali)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n); let ph = 0;
      for (let i = 0; i < n; i++) { const t = i / sr, f = p.nada * (1 + (p.tekuk - 1) * Math.exp(-t / 0.012)); ph += (TAU * f) / sr; o[i] = Math.sin(ph) * env(t, 0.0015, 0.035); }
      burst(o, sr, 0, r, 0.003, 3000, 0.7, 0.25, "hp");
      return o;
    } });

  def("klik", { ket: "klik tombol / UI", durasi: 0.05, level: { puncak: -1 },
    param: { nada: [2400, "resonansi utama (Hz)"], terang: [1, "porsi resonansi tinggi (0..2)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n);
      burst(o, sr, 0, r, 0.0012, 5000, 0.7, 0.6, "hp");
      partial(o, sr, 0, p.nada, 0.7, 0.004, 0.3); partial(o, sr, 0, p.nada * 2.3, 0.35 * p.terang, 0.0025);
      partial(o, sr, Math.round(0.0006 * sr), 420, 0.2, 0.006);
      return o;
    } });

  def("ketuk", { ket: "ketukan kayu / tick jam", alias: ["tick", "tik"], durasi: 0.12, level: { puncak: -1 },
    param: { nada: [1150, "nada kayu (Hz)"], kering: [1, "pendeknya dengung (0.5..2)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), k = 1 / p.kering;
      burst(o, sr, 0, r, 0.0015, 3500, 1, 0.5);
      [[1, 0.9, 0.045], [2.57, 0.45, 0.022], [4.21, 0.25, 0.012], [6.3, 0.12, 0.007]].forEach(([m, a, d]) => partial(o, sr, 0, p.nada * m, a, d * k, r() * TAU));
      return o;
    } });

  def("ding", { ket: "denting lonceng kecil / chime", alias: ["chime", "denting"], durasi: 2.4, level: { puncak: -1 },
    param: { nada: [880, "nada dasar (Hz)"], gema: [0.18, "porsi gema (0..1)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), d = n / sr;
      [[1, 1, 0.42], [1.0012, 0.5, 0.42], [2.0, 0.35, 0.2], [2.76, 0.5, 0.16], [4.07, 0.22, 0.09], [5.43, 0.16, 0.06], [6.8, 0.08, 0.04]]
        .forEach(([m, a, dk]) => partial(o, sr, 0, p.nada * m, a, dk * d, r() * TAU, d));
      for (let i = 0; i < Math.min(n, sr * 0.003); i++) o[i] *= i / (sr * 0.003);
      const R = o.slice(); reverb(o, R, sr, p.gema, 0.75); return [o, R];
    } });

  def("riser", { ket: "naik tegang menuju puncak (build-up)", durasi: 2.5, level: { puncak: -1 },
    param: { dari: [110, "nada awal (Hz)"], ke: [880, "nada akhir (Hz)"], desis: [0.6, "porsi desis (0..1)"] },
    fn(p, r, sr, n) {
      const L = new Float32Array(n), R = new Float32Array(n), F = [new Biquad(), new Biquad()], Hn = new Biquad(), nz = pink(r), ph = [0, 0, 0, 0, 0, 0];
      const det = [-0.012, 0, 0.011];
      for (let i = 0; i < n; i++) {
        const u = i / n, f = p.dari * Math.pow(p.ke / p.dari, u * u * 0.6 + u * 0.4);
        if (i % 16 === 0) { F[0].set("lp", 250 + 9000 * u * u, 1.2 + u * 3, sr); F[1].set("lp", 260 + 9000 * u * u, 1.2 + u * 3, sr); Hn.set("hp", 600 + 6000 * u, 0.7, sr); }
        let sl = 0, sr2 = 0;
        for (let k = 0; k < 3; k++) { ph[k] = (ph[k] + (f * (1 + det[k])) / sr) % 1; ph[k + 3] = (ph[k + 3] + (f * (1 - det[k] * 0.9)) / sr) % 1; sl += ph[k] * 2 - 1; sr2 += ph[k + 3] * 2 - 1; }
        const e = Math.pow(u, 1.6) * (u > 0.985 ? (1 - u) / 0.015 : 1), h = Hn.run(nz()) * p.desis * 1.6;
        L[i] = (F[0].run(sl / 3) + h) * e; R[i] = (F[1].run(sr2 / 3) + h) * e;
      }
      return [L, R];
    } });

  def("impact", { ket: "hentakan berat / boom", alias: ["boom", "dentum"], durasi: 1.8, level: { puncak: -0.5 },
    param: { nada: [46, "nada sub akhir (Hz)"], kotor: [1.6, "saturasi (1..4)"], gema: [0.22, "porsi gema"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), d = n / sr; let ph = 0; const Ln = new Biquad();
      for (let i = 0; i < n; i++) {
        const t = i / sr, f = p.nada * (1 + 2.2 * Math.exp(-t / 0.05)); ph += (TAU * f) / sr;
        if (i % 16 === 0) Ln.set("lp", 300 + 3500 * Math.exp(-t / 0.05), 0.8, sr);
        o[i] = Math.sin(ph) * env(t, 0.002, 0.42 * d / 1.8) + Ln.run(r() * 2 - 1) * env(t, 0.001, 0.09) * 0.9;
        o[i] = Math.tanh(o[i] * p.kotor) / Math.tanh(p.kotor);
      }
      burst(o, sr, 0, r, 0.004, 2500, 0.8, 0.4);
      const R = o.slice(); reverb(o, R, sr, p.gema, 0.9, 0.55); return [o, R];
    } });

  def("glitch", { ket: "glitch digital: potongan kotak, gagap, bitcrush", durasi: 0.6, level: { puncak: -7 },
    param: { kepadatan: [1, "kepadatan potongan (0.5..2)"], bit: [5, "kedalaman bitcrush"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n); let i = 0, prev = null; const q = Math.pow(2, p.bit);
      while (i < n) {
        const len = Math.min(n - i, Math.round(sr * (0.012 + r() * 0.05) / p.kepadatan)), kind = r();
        const seg = new Float32Array(len);
        if (kind < 0.3) { const f = 150 + r() * 1800; for (let j = 0; j < len; j++) seg[j] = (Math.sin((TAU * f * j) / sr) > 0 ? 0.7 : -0.7); }
        else if (kind < 0.55) { const hold = 4 + Math.floor(r() * 30); let v = 0; for (let j = 0; j < len; j++) { if (j % hold === 0) v = r() * 2 - 1; seg[j] = v * 0.8; } }
        else if (kind < 0.8 && prev) { for (let j = 0; j < len; j++) seg[j] = prev[j % Math.max(1, Math.floor(prev.length / 3))]; }
        else if (kind < 0.9) { const f = 3000 + r() * 5000; for (let j = 0; j < len; j++) seg[j] = Math.sin((TAU * f * j) / sr) * 0.35 * (1 - j / len); }
        for (let j = 0; j < len; j++) { const e = Math.min(1, j / 48, (len - j) / 48); o[i + j] = (Math.round(seg[j] * q) / q) * e; }
        prev = seg; i += len;
      }
      return o;
    } });

  def("ketik", { ket: "tuts mesin ketik", alias: ["typewriter", "mesin-ketik"], durasi: 2.5, level: { puncak: -1 },
    param: { laju: [8, "ketukan per detik"], bel: [0, "denting bel di akhir (0/1)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), d = n / sr; let t = 0.03;
      while (t < d - (p.bel ? 0.6 : 0.08)) {
        const i0 = Math.round(t * sr), space = r() < 0.14, a = 0.7 + r() * 0.3;
        burst(o, sr, i0, r, 0.003, space ? 2200 : 3600 + r() * 900, 2.5, a * 0.9);
        partial(o, sr, i0 + Math.round(0.002 * sr), space ? 140 : 190 + r() * 40, a * 0.55, 0.02);
        partial(o, sr, i0 + Math.round(0.002 * sr), space ? 330 : 430 + r() * 60, a * 0.3, 0.012);
        burst(o, sr, i0 + Math.round((0.018 + r() * 0.01) * sr), r, 0.008, 1500, 1.2, a * 0.25);
        t += (1 / p.laju) * (0.55 + r() * 0.9) * (space ? 1.4 : 1);
      }
      if (p.bel) { const i0 = Math.round((d - 0.55) * sr); [[1, 0.6, 0.35], [2.76, 0.25, 0.15], [5.4, 0.12, 0.08]].forEach(([m, a, dk]) => partial(o, sr, i0, 2150 * m, a, dk)); }
      return o;
    } });

  def("koin", { ket: "koin / poin didapat", alias: ["coin"], durasi: 0.55, level: { puncak: -5 },
    param: { nada: [987.77, "nada pertama (Hz); nada kedua = kuart di atasnya"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n), t1 = 0.075;
      for (let i = 0; i < n; i++) {
        const t = i / sr, f = t < t1 ? p.nada : p.nada * 1.3348, a = t < t1 ? 1 : Math.exp(-(t - t1) / 0.16); let v = 0;
        for (let h = 1; h <= 9; h += 2) if (f * h < 12000) v += Math.sin(TAU * f * h * t) / h;
        o[i] = v * 0.75 * a * Math.min(1, i / 60);
      }
      return o;
    } });

  def("kamera", { ket: "rana kamera: buka-tutup mekanis", alias: ["shutter", "rana"], durasi: 0.32, level: { puncak: -1 },
    param: { jeda: [0.09, "jeda buka ke tutup (detik)"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n);
      const click = (t, a) => { const i0 = Math.round(t * sr); burst(o, sr, i0, r, 0.004, 3200, 3, a); partial(o, sr, i0, 820, a * 0.5, 0.012); partial(o, sr, i0, 1730, a * 0.3, 0.008); partial(o, sr, i0, 120, a * 0.35, 0.02); };
      click(0.004, 1); click(0.004 + p.jeda, 0.8);
      const F = bq("bp", 1400, 1.2, sr); for (let i = Math.round(0.01 * sr); i < Math.round((0.004 + p.jeda) * sr); i++) o[i] += F.run(r() * 2 - 1) * 0.06;
      burst(o, sr, Math.round((0.012 + p.jeda) * sr), r, 0.03, 900, 0.8, 0.18, "lp");
      return o;
    } });

  def("ombak", { ket: "ambience laut: ombak pecah di pantai", alias: ["laut", "sea"], durasi: 12, level: { rms: -22 },
    param: { periode: [7, "jarak rata-rata antar ombak (detik)"], buih: [1, "porsi desis buih (0..2)"] },
    fn(p, r, sr, n) {
      const d = n / sr, waves = []; let t = -r() * p.periode * 0.6;
      while (t < d + p.periode) { waves.push([t, 0.6 + r() * 0.5, 1.2 + r() * 1.2]); t += p.periode * (0.7 + r() * 0.6); }
      const wv = (tt) => { let s = 0.18; for (const [w0, a, rise] of waves) { const x = tt - w0; if (x < 0 || x > rise + 6) continue; s += a * (x < rise ? Math.pow(x / rise, 2) : Math.exp(-(x - rise) / 1.8)); } return s; };
      const out = [];
      for (let c = 0; c < 2; c++) {
        const rc = rng(hashStr("ombak" + c) ^ (r() * 4294967296)), br = brown(rc), pk = pink(rc), L = new Biquad(), H = new Biquad(), X = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const tt = i / sr + c * 0.13, w = wv(tt); if (i % 32 === 0) { L.set("lp", 280 + 900 * Math.min(1.5, w), 0.6, sr); H.set("bp", 2500 + 2500 * Math.min(1, w), 0.5, sr); }
          X[i] = L.run(br()) * (0.5 + w * 0.8) + H.run(pk()) * Math.pow(Math.max(0, w - 0.2), 1.5) * 0.9 * p.buih;
        }
        out.push(X);
      }
      return out;
    } });

  def("angin", { ket: "ambience angin berembus", alias: ["wind"], durasi: 10, level: { rms: -23 },
    param: { kencang: [1, "kekuatan embusan (0.3..2)"], siul: [1, "resonansi siulan (0.5..3)"] },
    fn(p, r, sr, n) {
      const gust = wander(r, 0.35, sr, n), fw = wander(r, 0.2, sr, n), out = [];
      for (let c = 0; c < 2; c++) {
        const rc = rng((r() * 4294967296) >>> 0), pk = pink(rc), F = new Biquad(), F2 = new Biquad(), X = new Float32Array(n), loc = wander(rc, 0.5, sr, n);
        for (let i = 0; i < n; i++) {
          const g = Math.pow(clamp(gust(i) * 0.75 + loc(i) * 0.35, 0, 1.2), 1.5) * p.kencang;
          if (i % 32 === 0) { F.set("bp", 250 + 700 * fw(i) + 500 * g, 1 + p.siul * 2 * g, sr); F2.set("lp", 500 + 1500 * g, 0.7, sr); }
          const x = pk(); X[i] = (F.run(x) * 1.2 + F2.run(x) * 0.5) * (0.15 + g);
        }
        out.push(X);
      }
      return out;
    } });

  def("keramaian", { ket: "keramaian kecil: gumam orang di ruangan", alias: ["crowd", "gumam"], durasi: 8, level: { rms: -24 },
    param: { orang: [9, "jumlah suara"], ruang: [0.35, "porsi gema ruangan"] },
    fn(p, r, sr, n) {
      const L = new Float32Array(n), R = new Float32Array(n), VOW = [[700, 1200], [400, 2000], [300, 2300], [500, 900], [350, 800], [600, 1700]];
      for (let v = 0; v < p.orang; v++) {
        const rv = rng((r() * 4294967296) >>> 0), f0 = 95 + rv() * 140, pan = rv() * 1.6 - 0.8, gain = 0.4 + rv() * 0.6, F1 = new Biquad(), F2 = new Biquad(), LPf = bq("lp", 2800, 0.7, sr), drift = wander(rv, 2, sr, n);
        let ph = 0, t = rv() * 1.5, talk = rv() < 0.7, next = t + 0.8 + rv() * 2.5, syl = 0, sylEnd = -1, vow = VOW[0];
        for (let i = 0; i < n; i++) {
          const tt = i / sr; if (tt > next) { talk = !talk; next = tt + (talk ? 0.8 + rv() * 2.4 : 0.3 + rv() * 1.4); }
          if (tt > sylEnd) { syl = tt; sylEnd = tt + 0.12 + rv() * 0.16; vow = VOW[Math.floor(rv() * VOW.length)]; F1.set("bp", vow[0] * (0.9 + rv() * 0.2), 5, sr); F2.set("bp", vow[1] * (0.9 + rv() * 0.2), 7, sr); }
          ph = (ph + (f0 * (0.9 + drift(i) * 0.25)) / sr) % 1;
          const s = (tt - syl) / (sylEnd - syl), a = talk ? Math.sin(Math.PI * s) : 0, x = (ph * 2 - 1) * 0.6 + (rv() * 2 - 1) * 0.15;
          const y = LPf.run(F1.run(x) + F2.run(x) * 0.6) * a * gain, an = (pan + 1) * Math.PI / 4; L[i] += y * Math.cos(an); R[i] += y * Math.sin(an);
        }
      }
      const pk = pink(r), H = bq("lp", 1200, 0.7, sr); for (let i = 0; i < n; i++) { const z = H.run(pk()) * 0.05; L[i] += z; R[i] += z; }
      reverb(L, R, sr, p.ruang, 0.7); return [L, R];
    } });

  def("notifikasi", { ket: "notifikasi lembut dua nada", alias: ["notif", "notification"], durasi: 0.8, level: { puncak: -2 },
    param: { nada: [1318.5, "nada pertama (Hz)"], naik: [1.335, "rasio nada kedua"] },
    fn(p, r, sr, n) {
      const o = new Float32Array(n);
      [[0, p.nada, 0.8], [0.11, p.nada * p.naik, 1]].forEach(([t0, f, a]) => { const i0 = Math.round(t0 * sr); partial(o, sr, i0, f, a, 0.22); partial(o, sr, i0, f * 2, a * 0.22, 0.12); partial(o, sr, i0, f * 3, a * 0.08, 0.06); for (let i = 0; i < 200 && i0 + i < n; i++) o[i0 + i] *= i / 200; });
      const R = o.slice(); reverb(o, R, sr, 0.15, 0.6); return [o, R];
    } });

  /* ---------- engine ---------- */
  const ALIAS = {}; for (const [k, v] of Object.entries(P)) { ALIAS[k] = k; (v.alias || []).forEach((a) => (ALIAS[a] = k)); }
  ALIAS["swoosh"] = "swoosh-kertas"; ALIAS["kertas"] = "swoosh-kertas"; ALIAS["tear"] = "sobek"; ALIAS["fold"] = "lipat"; ALIAS["click"] = "klik";
  // English names (v2.4): canonical name -> internal key (the internal key seeds the noise, so it never changes)
  const EN = { "paper-swoosh": "swoosh-kertas", fold: "lipat", tear: "sobek", click: "klik", tap: "ketuk", type: "ketik", coin: "koin",
    camera: "kamera", waves: "ombak", wind: "angin", crowd: "keramaian", notification: "notifikasi" };
  const NAME_EN = {}; for (const [en, k] of Object.entries(EN)) { ALIAS[en] = k; NAME_EN[k] = en; }
  Object.assign(ALIAS, { murmur: "keramaian", tick: "ketuk", chime: "ding", boom: "impact", typewriter: "ketik", shutter: "kamera", sea: "ombak" });
  // English parameter names per preset: {english: internal}
  const PARAM_EN = {
    whoosh: { from: "dari", to: "ke", peak: "puncak", spread: "geser" }, "swoosh-kertas": { bright: "terang", grain: "butir" },
    lipat: { count: "jumlah", press: "tekan" }, sobek: { rough: "kasar", from: "dari", to: "ke" }, pop: { pitch: "nada", bend: "tekuk" },
    klik: { pitch: "nada", bright: "terang" }, ketuk: { pitch: "nada", dry: "kering" }, ding: { pitch: "nada", echo: "gema" },
    riser: { from: "dari", to: "ke", hiss: "desis" }, impact: { pitch: "nada", drive: "kotor", echo: "gema" }, glitch: { density: "kepadatan" },
    ketik: { rate: "laju", bell: "bel" }, koin: { pitch: "nada" }, kamera: { gap: "jeda" }, ombak: { period: "periode", foam: "buih" },
    angin: { strength: "kencang", whistle: "siul" }, keramaian: { voices: "orang", room: "ruang" }, notifikasi: { pitch: "nada", ratio: "naik" },
  };
  const enParams = (key, o) => { const m = PARAM_EN[key] || {}; for (const en in m) { if (o[en] != null && o[m[en]] == null) o[m[en]] = o[en]; if (o.param && o.param[en] != null && o.param[m[en]] == null) o.param[m[en]] = o.param[en]; } return o; };
  const cari = (nama) => { const k = ALIAS[String(nama || "").toLowerCase()]; if (!k) throw new Error(`unknown sfx preset / preset sfx tidak dikenal "${nama}". Choices / pilihan: ${Object.keys(P).map((x) => NAME_EN[x] || x).join(", ")}`); return k; };

  function daftar() {
    return Object.entries(P).map(([nama, s]) => {
      const inv = {}; for (const [en, k] of Object.entries(PARAM_EN[nama] || {})) inv[k] = en;
      const params = {}; for (const [k, v] of Object.entries(s.param)) params[inv[k] || k] = v;
      const name = NAME_EN[nama] || nama, aliases = [nama].concat(s.alias || []).filter((a, i, A) => a !== name && A.indexOf(a) === i);
      return { name, aliases, hint: s.ket, duration: s.durasi, params, nama, alias: s.alias || [], ket: s.ket, durasi: s.durasi, param: s.param };
    });
  }

  function finish(ch, sr, level, o) {
    const n = ch[0].length;
    // DC block + 2 ms fade at both ends
    for (const X of ch) { let x1 = 0, y1 = 0; for (let i = 0; i < n; i++) { const y = X[i] - x1 + 0.995 * y1; x1 = X[i]; y1 = y; X[i] = y; } const f = Math.min(n >> 1, Math.round(sr * 0.002)); for (let i = 0; i < f; i++) { X[i] *= i / f; X[n - 1 - i] *= i / f; } }
    let pk = 0, ss = 0; for (const X of ch) for (let i = 0; i < n; i++) { const a = Math.abs(X[i]); if (a > pk) pk = a; ss += X[i] * X[i]; }
    const rms = Math.sqrt(ss / (n * ch.length)) || 1e-9;
    let g = level.rms != null ? db(level.rms) / rms : db(level.puncak != null ? level.puncak : -1) / (pk || 1);
    if (pk * g > db(-0.3)) g = db(-0.3) / pk;                  // never clip
    g *= db(+o.gain || 0);
    for (const X of ch) for (let i = 0; i < n; i++) X[i] *= g;
  }

  function buat(nama, opts) {
    const o = enParams(cari(nama), Object.assign({}, opts || {}, opts && opts.param ? { param: Object.assign({}, opts.param) } : {})), key = cari(nama), S = P[key], sr = +o.sr || SR0;
    if (o.duration != null && o.durasi == null) o.durasi = o.duration;
    const p = {}; for (const [k, [dv]] of Object.entries(S.param)) { const v = o[k] != null ? o[k] : o.param && o.param[k] != null ? o.param[k] : dv; p[k] = typeof dv === "number" ? +v : v; }
    const durasi = +(o.durasi || S.durasi), n = Math.max(16, Math.round(durasi * sr));
    const r = rng(hashStr(key) ^ Math.imul((+o.seed || 1) >>> 0, 0x9e3779b1));
    let out = S.fn(p, r, sr, n);
    let ch = Array.isArray(out) ? out : [out, null];
    if (!ch[1]) { const pan = clamp(+o.pan || 0, -1, 1), a = (pan + 1) * Math.PI / 4, m = ch[0]; ch = [new Float32Array(m.length), new Float32Array(m.length)]; for (let i = 0; i < m.length; i++) { ch[0][i] = m[i] * Math.cos(a) * Math.SQRT2; ch[1][i] = m[i] * Math.sin(a) * Math.SQRT2; } }
    finish(ch, sr, S.level, o);
    return { sr, ch, duration: n / sr, name: NAME_EN[key] || key, durasi: n / sr, nama: key, param: p, seed: +o.seed || 1 };
  }

  /** Mix cues on a timeline: [{t, sfx, seed, durasi, gain, pan, param}] or {durasi, cues:[...]}. */
  function campur(cues, opts) {
    const o = Object.assign({}, opts || {}); let list = cues;
    if (o.duration != null && o.durasi == null) o.durasi = o.duration; if (o.peak != null && o.puncak == null) o.puncak = o.peak;
    if (!Array.isArray(cues)) { list = cues.cues || cues.isyarat || []; const cd = cues.duration != null ? cues.duration : cues.durasi; if (cd && !o.durasi) o.durasi = cd; }
    const sr = +o.sr || SR0, parts = list.map((c, k) => ({ c, b: buat(c.sfx || c.preset || c.name || c.nama, Object.assign({ seed: c.seed != null ? c.seed : k + 1 }, c.param || {}, { durasi: c.duration != null ? c.duration : c.durasi, gain: c.gain, pan: c.pan, sr })) }));
    const end = Math.max(+o.durasi || 0, ...parts.map(({ c, b }) => (+c.t || 0) + b.durasi));
    const n = Math.max(1, Math.ceil(end * sr)), L = new Float32Array(n), R = new Float32Array(n);
    for (const { c, b } of parts) { const i0 = Math.round((+c.t || 0) * sr); for (let i = 0; i < b.ch[0].length && i0 + i < n; i++) { L[i0 + i] += b.ch[0][i]; R[i0 + i] += b.ch[1][i]; } }
    // gentle peak limiter (look-ahead-free, smooth release) so stacked cues never clip
    const ceil = db(o.puncak != null ? +o.puncak : -1); let gr = 1;
    for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); const want = a * gr > ceil ? ceil / a : 1; gr = want < gr ? want : gr + (1 - gr) * 0.0005; if (a * gr > ceil) gr = ceil / a; L[i] *= gr; R[i] *= gr; }
    return { sr, ch: [L, R], duration: n / sr, durasi: n / sr, cues: parts.length };
  }

  function wav(b, opts) {
    const bit = (opts && +opts.bit) || 16, ch = b.ch, n = ch[0].length, nc = ch.length, bps = bit / 8, fmt = bit === 32 ? 3 : 1;
    const data = n * nc * bps, out = new Uint8Array(44 + data), dv = new DataView(out.buffer);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
    str(0, "RIFF"); dv.setUint32(4, 36 + data, true); str(8, "WAVE"); str(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, fmt, true); dv.setUint16(22, nc, true);
    dv.setUint32(24, b.sr, true); dv.setUint32(28, b.sr * nc * bps, true); dv.setUint16(32, nc * bps, true); dv.setUint16(34, bit, true); str(36, "data"); dv.setUint32(40, data, true);
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
      const v = clamp(ch[c][i], -1, 1);
      if (bit === 32) dv.setFloat32(o, v, true);
      else if (bit === 24) { const s = Math.round(v * 8388607); out[o] = s & 255; out[o + 1] = (s >> 8) & 255; out[o + 2] = (s >> 16) & 255; }
      else dv.setInt16(o, Math.round(v * 32767), true);
      o += bps;
    }
    return out;
  }

  /* ---------- browser helpers ---------- */
  function toAudioBuffer(b, ctx) { const ab = ctx.createBuffer(b.ch.length, b.ch[0].length, b.sr); b.ch.forEach((X, c) => ab.copyToChannel ? ab.copyToChannel(X, c) : ab.getChannelData(c).set(X)); return ab; }
  function offline(cues, opts) {
    const O = (typeof OfflineAudioContext !== "undefined" && OfflineAudioContext) || (typeof webkitOfflineAudioContext !== "undefined" && webkitOfflineAudioContext);
    if (!O) return Promise.reject(new Error("OfflineAudioContext not available / tidak tersedia; use sfx.mix() + sfx.wav()"));
    const o = Object.assign({}, opts || {}); let list = Array.isArray(cues) ? cues : cues.cues || []; if (o.duration != null && o.durasi == null) o.durasi = o.duration;
    if (!Array.isArray(cues)) { const cd = cues.duration != null ? cues.duration : cues.durasi; if (cd && !o.durasi) o.durasi = cd; }
    const sr = +o.sr || SR0, parts = list.map((c, k) => ({ c, b: buat(c.sfx || c.preset || c.name || c.nama, Object.assign({ seed: c.seed != null ? c.seed : k + 1 }, c.param || {}, { durasi: c.duration != null ? c.duration : c.durasi, gain: c.gain, pan: c.pan, sr })) }));
    const end = Math.max(+o.durasi || 0, ...parts.map(({ c, b }) => (+c.t || 0) + b.durasi));
    const ctx = new O(2, Math.max(1, Math.ceil(end * sr)), sr);
    for (const { c, b } of parts) { const s = ctx.createBufferSource(); s.buffer = toAudioBuffer(b, ctx); s.connect(ctx.destination); s.start(+c.t || 0); }
    return ctx.startRendering();
  }

  return { list: daftar, synth: buat, mix: campur, daftar, buat, campur, wav, toAudioBuffer, offline, preset: P, alias: ALIAS, names: NAME_EN, paramNames: PARAM_EN, SR: SR0,
    lib: { rng, hashStr, Biquad, bq, pink, brown, wander, env, swell, partial, burst, reverb } };
});
