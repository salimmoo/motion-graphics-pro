// mgp media: footage and image treatments with ffmpeg (look/grade, LUT, brighten, effects),
// plus mgp audio normalize/measure (EBU R128 loudness). Only built-in ffmpeg filters: deterministic,
// no model, no internet.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FFMPEG, FFPROBE, codecArgs } from "./ffmpeg.mjs";
import { L, t } from "./i18n.mjs";

const IMG = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]);
const AUD = new Set([".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".opus"]);
export const isImage = (f) => IMG.has(path.extname(f).toLowerCase());
export const isAudio = (f) => AUD.has(path.extname(f).toLowerCase());

// ------------------------------------------------------------------ look
// Keys are the old Indonesian names (still accepted); `en` is the canonical English name.
// color:   filter chain that only changes colour per pixel (can be exported to .cube)
// texture: spatial/temporal filters (grain, vignette, blur, channel shift) that cannot become a LUT
export const LOOKS = {
  hangat: { en: "warm", desc: "warm daylight: 5200 K, saturation slightly up",
    color: "colortemperature=temperature=5200:mix=0.75:pl=0.35,colorbalance=rm=0.02:bm=-0.03,eq=saturation=1.06:contrast=1.03" },
  dingin: { en: "cool", desc: "cool and clean: 8800 K, saturation slightly down",
    color: "colortemperature=temperature=8800:mix=0.65:pl=0.35,colorbalance=bs=0.02:bm=0.02,eq=saturation=0.94:contrast=1.02" },
  film: { en: "film", desc: "negative film: lifted blacks, teal shadows, warm highlights, fine grain, vignette",
    color: "curves=r='0/0.04 0.5/0.52 1/0.96':g='0/0.05 0.5/0.5 1/0.95':b='0/0.08 0.5/0.48 1/0.9',colorbalance=rs=-0.05:bs=0.06:rh=0.06:bh=-0.05,eq=saturation=0.88:contrast=1.06",
    texture: "noise=alls=7:allf=t,vignette=angle=PI/5" },
  pudar: { en: "faded", desc: "faded matte: lifted blacks, low contrast and saturation",
    color: "curves=all='0/0.12 0.5/0.52 1/0.9',eq=saturation=0.7,colorbalance=rm=0.02:bm=-0.02" },
  kontras: { en: "contrast", desc: "firm contrast and dense colour",
    color: "curves=preset=increase_contrast,eq=saturation=1.15" },
  malam: { en: "night", desc: "day-for-night: dark, blue, low saturation",
    color: "eq=brightness=-0.16:gamma=0.82:saturation=0.45,colorbalance=rs=-0.08:gs=-0.02:bs=0.12:rm=-0.05:bm=0.08,colortemperature=temperature=11000:mix=0.5",
    texture: "vignette=angle=PI/4" },
  kertas: { en: "paper", desc: "printed on paper: soft sepia, lifted blacks, print grain",
    color: "hue=s=0.45,colorchannelmixer=rr=0.85:rg=0.25:rb=0.05:gr=0.15:gg=0.8:gb=0.05:br=0.1:bg=0.2:bb=0.6,curves=all='0/0.1 0.5/0.55 1/0.93'",
    texture: "noise=alls=9:allf=t" },
  sinematik: { en: "teal-orange", desc: "teal-orange: teal shadows, orange skin and highlights",
    color: "colorbalance=rs=-0.08:gs=-0.02:bs=0.1:rh=0.08:gh=0.02:bh=-0.08,eq=contrast=1.08:saturation=1.1",
    texture: "vignette=angle=PI/5" },
  emas: { en: "golden", desc: "golden hour: 4300 K, golden highlights",
    color: "colortemperature=temperature=4300:mix=0.6:pl=0.3,colorbalance=rh=0.06:gh=0.02:bh=-0.06,eq=saturation=1.1:gamma=1.04" },
  bersih: { en: "clean", desc: "clean polish for product/UGC: light contrast and vibrance, slightly sharpened",
    color: "eq=contrast=1.04:saturation=1.03,vibrance=intensity=0.15", texture: "unsharp=5:5:0.4" },
  hitamputih: { en: "mono", desc: "black and white, medium contrast",
    color: "hue=s=0,curves=preset=medium_contrast" },
  sepia: { en: "sepia", desc: "classic sepia",
    color: "colorchannelmixer=rr=0.393:rg=0.769:rb=0.189:gr=0.349:gg=0.686:gb=0.168:br=0.272:bg=0.534:bb=0.131" },
  vhs: { en: "vhs", desc: "VHS tape: shifted red/blue channels, soft, moving noise",
    color: "eq=saturation=1.25:contrast=0.92:brightness=0.02,curves=all='0/0.06 1/0.94'",
    texture: "rgbashift=rh=3:bh=-3,gblur=sigma=0.8,noise=alls=12:allf=t,vignette=angle=PI/5" },
};
const LOOK_ALIAS = Object.fromEntries(Object.entries(LOOKS).flatMap(([k, v]) => [[k, k], [v.en, k]]));
LOOK_ALIAS["teal-orange"] = "sinematik"; LOOK_ALIAS.bw = "hitamputih"; LOOK_ALIAS["hitam-putih"] = "hitamputih"; LOOK_ALIAS["black-white"] = "hitamputih";

/** Short description of a look (key or name) in the active language. */
export function lookHint(name) {
  const k = LOOKS[name] ? name : LOOK_ALIAS[String(name || "").toLowerCase()];
  return k ? t(LOOKS[k].desc) : "";
}

export function findLook(name) {
  const k = LOOK_ALIAS[String(name || "").toLowerCase()];
  if (!k) throw new Error(L`unknown look "${name}". Choices: ${Object.values(LOOKS).map((v) => v.en).join(", ")} (see: mgp media list)`);
  return { id: k, name: LOOKS[k].en, ...LOOKS[k] };
}

// ------------------------------------------------------------------ util
function ff(args, { cwd, capture = false } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ["-hide_banner", ...args], { cwd, stdio: ["ignore", capture ? "pipe" : "ignore", "pipe"] });
    let err = "";
    const out = [];
    if (capture) p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res({ stderr: err, stdout: Buffer.concat(out) }) : rej(new Error(L`ffmpeg failed: ${err.trim().split("\n").slice(-6).join("\n")}`))));
  });
}

export function probeMedia(file) {
  if (!fs.existsSync(file)) throw new Error(L`file not found: ${file}`);
  const r = spawnSync(FFPROBE, ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(L`ffprobe could not read ${file}: ${r.stderr}`);
  const j = JSON.parse(r.stdout);
  const v = (j.streams || []).find((s) => s.codec_type === "video");
  const a = (j.streams || []).find((s) => s.codec_type === "audio");
  return {
    image: isImage(file), width: v ? v.width : null, height: v ? v.height : null,
    fps: v ? v.r_frame_rate : null, duration: +(j.format && j.format.duration) || null,
    hasVideo: !!v, hasAudio: !!a, sampleRate: a ? +a.sample_rate : null, audioCodec: a ? a.codec_name : null,
    frames: v && v.nb_frames ? +v.nb_frames : null,
  };
}

// o.quiet (old callers pass o.diam)
const say = (o, s) => { if (!o.quiet && !o.diam) process.stderr.write(s + "\n"); };

function outPath(inp, o, suffix) {
  if (o.o || o.out) return path.resolve(o.o || o.out);
  const ext = path.extname(inp);
  return path.resolve(path.dirname(inp), path.basename(inp, ext) + "_" + suffix + ext);
}

/** Output encode arguments for the kind and extension. */
function encodeArgs(out, info, o = {}) {
  const ext = path.extname(out).toLowerCase();
  if (info.image) return ext === ".jpg" || ext === ".jpeg" ? ["-frames:v", "1", "-q:v", "2"] : ["-frames:v", "1"];
  const fmt = ext === ".mov" ? "prores" : ext === ".webm" ? "webm" : "mp4";
  const a = !info.hasAudio || o["no-audio"] ? ["-an"] : fmt === "prores" ? ["-c:a", "pcm_s16le"] : fmt === "webm" ? ["-c:a", "libopus", "-b:a", "160k"] : ["-c:a", "aac", "-b:a", "192k"];
  return [...codecArgs(fmt, { crf: o.crf ? +o.crf : 18, preset: o.preset || "medium", transparent: !!o.transparent }).filter((x) => x !== "-tune" && x !== "animation"), ...a, ...(fmt === "mp4" ? ["-movflags", "+faststart"] : [])];
}

/** Wrap a chain with a mix of strength k (0..1) against the source. */
function withStrength(chain, k) {
  if (!(k < 0.999)) return chain;
  k = Math.max(0, k);
  return `format=gbrp,split=2[asal][olah];[olah]${chain},format=gbrp[hasil];[asal][hasil]blend=all_expr='A*(1-${k.toFixed(3)})+B*${k.toFixed(3)}'`;
}

async function applyChain(inp, out, chain, o, extra = {}) {
  const info = probeMedia(inp);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const vf = chain + (!info.image && path.extname(out).toLowerCase() === ".mp4" ? ",format=yuv420p" : "");
  const args = ["-y", "-i", inp, "-filter_complex", `[0:v]${vf}[v]`, "-map", "[v]", ...(info.image ? [] : ["-map", "0:a?"]), ...encodeArgs(out, info, o), out];
  await ff(args, { cwd: extra.cwd });
  return { out, info };
}

// ------------------------------------------------------------------ command: look (look/grade/LUT)
function lutChain(lutFile, o) {
  const src = path.resolve(lutFile);
  if (!fs.existsSync(src)) throw new Error(L`--lut not found: ${src}`);
  if (path.extname(src).toLowerCase() !== ".cube") throw new Error(L`--lut must be a .cube file`);
  // Windows paths are hard to escape in a filtergraph: copy to a temp folder and run ffmpeg there
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-lut-"));
  fs.copyFileSync(src, path.join(dir, "lut.cube"));
  return { chain: "lut3d=file=lut.cube:interp=tetrahedral", cwd: dir };
}

export async function look(inp, o) {
  if (!inp) throw new Error(L`Name an input file: mgp media look photo.jpg --look warm -o out.jpg`);
  inp = path.resolve(inp);
  const parts = [];
  let cwd, label = [];
  if (o.look) {
    for (const n of String(o.look).split(",")) {
      const lk = findLook(n.trim());
      parts.push(lk.color); if (lk.texture && !o["no-texture"]) parts.push(lk.texture);
      label.push(lk.name);
    }
  }
  if (o.lut) { const l = lutChain(o.lut, o); parts.push(l.chain); cwd = l.cwd; label.push(path.basename(o.lut, ".cube")); }
  if (!parts.length) throw new Error(L`Choose --look <name> and/or --lut file.cube (list of looks: mgp media list)`);
  const k = o.strength != null ? +o.strength : 1;
  const out = outPath(inp, o, label.join("+"));
  try {
    await applyChain(inp, out, withStrength(parts.join(","), k), o, { cwd });
  } finally { if (cwd) fs.rmSync(cwd, { recursive: true, force: true }); }
  say(o, L`look ${label.join(" + ")} (strength ${k}) -> ${out}`);
  return { out, look: label, strength: k };
}

// ------------------------------------------------------------------ command: lut (export a look to .cube)
export async function exportLut(name, o) {
  const lk = findLook(name);
  const out = path.resolve(o.o || o.out || lk.name + ".cube");
  const level = 8, N = level * level; // haldclut level 8 = 64 cube
  const { stdout } = await ff(["-f", "lavfi", "-i", `haldclutsrc=level=${level}`, "-frames:v", "1", "-vf", lk.color + ",format=rgb24", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { capture: true });
  if (stdout.length !== N * N * N * 3) throw new Error(L`unexpected hald size: ${stdout.length}`);
  const lines = [`TITLE "mgp ${lk.name}"`, `# mgp look "${lk.name}": ${lk.desc}. Colour part only; grain/vignette are not included.`, `LUT_3D_SIZE ${N}`, "DOMAIN_MIN 0 0 0", "DOMAIN_MAX 1 1 1"];
  for (let i = 0; i < N * N * N; i++) {
    const r = stdout[i * 3] / 255, g = stdout[i * 3 + 1] / 255, b = stdout[i * 3 + 2] / 255;
    lines.push(r.toFixed(6) + " " + g.toFixed(6) + " " + b.toFixed(6));
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n") + "\n");
  say(o, `LUT ${lk.name} (${N}^3) -> ${out}`);
  return { out };
}

// ------------------------------------------------------------------ command: brighten (auto levels)
async function measureLuma(inp, info) {
  const n = info.image ? 1 : Math.max(1, info.frames || Math.round((info.duration || 1) * 30));
  const every = Math.max(1, Math.floor(n / 40));
  const sel = info.image ? "" : `select='not(mod(n,${every}))',`;
  const { stderr } = await ff(["-i", inp, "-vf", `${sel}scale=out_range=full,format=yuv444p,signalstats,metadata=print`, "-an", "-f", "null", "-"]);
  const get = (k) => [...stderr.matchAll(new RegExp("lavfi\\.signalstats\\." + k + "=([\\d.]+)", "g"))].map((m) => +m[1]);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const ymin = get("YMIN"), ylow = get("YLOW"), yavg = get("YAVG"), yhigh = get("YHIGH"), ymax = get("YMAX");
  if (!yavg.length) throw new Error(L`could not measure luma`);
  return { min: Math.min(...ymin) / 255, low: mean(ylow) / 255, avg: mean(yavg) / 255, high: mean(yhigh) / 255, max: Math.max(...ymax) / 255, samples: yavg.length };
}

export async function brighten(inp, o) {
  if (!inp) throw new Error(L`Name an input file: mgp media brighten clip.mp4 -o bright.mp4`);
  inp = path.resolve(inp);
  const info = probeMedia(inp);
  const m = await measureLuma(inp, info);
  // one correction for the whole clip (no flicker): stretch black/white, then gamma to the target average
  let black = Math.min(0.25, Math.max(0, 0.7 * m.low + 0.3 * m.min - 0.01));
  let white = Math.max(0.6, Math.min(1, 0.5 * m.high + 0.5 * m.max + 0.01));
  if (white - black < 0.3) white = Math.min(1, black + 0.3);
  const target = o.target != null ? +o.target : 0.45;
  const mid = Math.min(0.95, Math.max(0.02, (m.avg - black) / (white - black)));
  let gamma = Math.log(mid) / Math.log(target);
  gamma = Math.max(o.force ? 0.6 : 1, Math.min(2.2, gamma));
  const sat = gamma > 1.15 ? 1.08 : 1.03;
  const chainOf = (g) => `colorlevels=rimin=${black.toFixed(4)}:gimin=${black.toFixed(4)}:bimin=${black.toFixed(4)}:rimax=${white.toFixed(4)}:gimax=${white.toFixed(4)}:bimax=${white.toFixed(4)},eq=gamma=${g.toFixed(3)}:saturation=${sat}`;
  const out = outPath(inp, o, "bright");
  const k = o.strength != null ? +o.strength : 1;
  await applyChain(inp, out, withStrength(chainOf(gamma), k), o);
  let m2 = await measureLuma(out, probeMedia(out));
  // eq gamma works per RGB channel, so the resulting luma is not exactly as modelled; one correction round
  if (gamma > 1 && Math.abs(m2.avg - target) > 0.03 && m2.avg > 0.01 && m2.avg < 0.99) {
    const g2 = Math.max(1, Math.min(3, gamma * (Math.log(m2.avg) / Math.log(target))));
    if (Math.abs(g2 - gamma) > 0.02) { gamma = g2; await applyChain(inp, out, withStrength(chainOf(gamma), k), o); m2 = await measureLuma(out, probeMedia(out)); }
  }
  const r = { out, before: m, after: m2, correction: { black: +black.toFixed(4), white: +white.toFixed(4), gamma: +gamma.toFixed(3), saturation: sat } };
  say(o, L`brighten: average luma ${(m.avg * 100).toFixed(1)}% -> ${(m2.avg * 100).toFixed(1)}% (black ${black.toFixed(3)}, white ${white.toFixed(3)}, gamma ${gamma.toFixed(2)}) -> ${out}`);
  return r;
}

// ------------------------------------------------------------------ command: effects (stylize/obscure)
function hex(c, d) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim());
  const h = m ? m[1] : d;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function duoMap(c0, c1) {
  const ch = (i) => `${c0[i]}+(${c1[i] - c0[i]})*val/255`;
  return `format=gbrp,lutrgb=r='${ch(0)}':g='${ch(1)}':b='${ch(2)}'`;
}
/** effect -> short description (English; effectHint() gives the active language). */
export const EFFECTS = {
  blur: "blur (privacy or background): --strength 0..1",
  pixelate: "square mosaic: --selector <px> (cell size)",
  duotone: "two colours: --color '#shadow,#highlight'",
  halftone: "45-degree print dots: --selector <px> --color '#ink,#paper'",
  posterize: "stepped colours: --level <n>",
  grain: "moving film grain: --strength 0..1",
  vignette: "dark edges: --strength 0..1",
};
const EFFECT_ALIAS = { kabur: "blur", mosaik: "pixelate", mosaic: "pixelate", piksel: "pixelate", duaWarna: "duotone", "dua-warna": "duotone", titik: "halftone", poster: "posterize", butir: "grain", vinyet: "vignette" };

/** Short description of an effect in the active language. */
export const effectHint = (name) => (EFFECTS[EFFECT_ALIAS[name] || name] ? t(EFFECTS[EFFECT_ALIAS[name] || name]) : "");

function effectChain(name, info, o) {
  const k = o.strength != null ? Math.max(0, Math.min(1, +o.strength)) : 0.6;
  const W = info.width, H = info.height, short = Math.min(W, H);
  const colors = String(o.color || "").split(",");
  const cell = o.cell ?? o.selector; // the old --sel (cell size) is translated to --selector
  switch (name) {
    case "blur": return `gblur=sigma=${(4 + 36 * k).toFixed(2)}`;
    case "pixelate": {
      const c = Math.max(2, +(cell || Math.round(short / 40)));
      return `scale=w=ceil(iw/${c}):h=ceil(ih/${c}):flags=area,scale=w=${W}:h=${H}:flags=neighbor`;
    }
    case "duotone": return `format=gray,curves=all='0/0 0.25/0.18 0.75/0.84 1/1',${duoMap(hex(colors[0], "14213d"), hex(colors[1], "fca311"))}`;
    case "halftone": {
      const C = Math.max(4, +(cell || Math.round(short / 90)));
      const e = [
        "st(0,(X+Y)*0.70710678)", "st(1,(Y-X)*0.70710678)",
        `st(2,(floor(ld(0)/${C})+0.5)*${C})`, `st(3,(floor(ld(1)/${C})+0.5)*${C})`,
        "st(4,(ld(2)-ld(3))*0.70710678)", "st(5,(ld(2)+ld(3))*0.70710678)",
        "st(6,lum(clip(ld(4),0,W-1),clip(ld(5),0,H-1))/255)",
        `st(7,${C}*0.74*sqrt(1-ld(6)))`,
        "st(8,hypot(ld(0)-ld(2),ld(1)-ld(3)))",
        "255*clip(ld(8)-ld(7)+0.5,0,1)",
      ].join(";");
      return `format=gray,gblur=sigma=${(C / 3).toFixed(2)},eq=contrast=1.15,geq=lum='${e}',${duoMap(hex(colors[0], "1c1b1a"), hex(colors[1], "f3ecdc"))}`;
    }
    case "posterize": {
      const N = Math.max(2, Math.min(32, +(o.level || 5)));
      const q = `floor(val*${N}/256)*255/${N - 1}`;
      return `gblur=sigma=1.2,lutrgb=r='${q}':g='${q}':b='${q}'`;
    }
    case "grain": return `noise=alls=${Math.round(6 + 24 * k)}:allf=t`;
    case "vignette": return `vignette=angle=${(Math.PI / 8 + (Math.PI / 3) * k).toFixed(4)}`;
    default: throw new Error(L`unknown effect "${name}". Choices: ${Object.keys(EFFECTS).join(", ")}`);
  }
}

export async function effects(inp, o) {
  if (!inp) throw new Error(L`Name an input file: mgp media effects photo.jpg --effect duotone -o out.jpg`);
  inp = path.resolve(inp);
  const info = probeMedia(inp);
  const names = String(o.effect || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => EFFECT_ALIAS[s] || s.toLowerCase());
  if (!names.length) throw new Error(L`Choose --effect: ${Object.keys(EFFECTS).join(", ")}`);
  const chain = names.map((n) => effectChain(n, info, o)).join(",");
  const out = outPath(inp, o, names.join("+"));
  await applyChain(inp, out, chain, o);
  say(o, L`effects ${names.join(" + ")} -> ${out}`);
  return { out, effect: names };
}

// ------------------------------------------------------------------ command: compare (sheet with every look)
export async function compare(inp, o) {
  if (!inp) throw new Error(L`Name an image or video: mgp media compare photo.jpg -o compare.jpg`);
  inp = path.resolve(inp);
  const info = probeMedia(inp);
  const ids = o.look ? String(o.look).split(",").map((n) => findLook(n.trim()).id) : Object.keys(LOOKS);
  const cellW = +(o.width || 360), cellH = Math.round((cellW * info.height) / info.width / 2) * 2;
  const cols = +(o.cols || 4);
  const all = ["original", ...ids];
  const t = o.t != null ? +o.t : info.image ? 0 : (info.duration || 0) / 2;
  const inArgs = info.image ? ["-i", inp] : ["-ss", String(t), "-i", inp];
  const fc = [`[0:v]scale=${cellW}:${cellH}:flags=lanczos,format=gbrp,split=${all.length}${all.map((_, i) => `[s${i}]`).join("")}`];
  const font = process.platform === "win32" ? "fontfile='C\\:/Windows/Fonts/arial.ttf':" : "";
  all.forEach((id, i) => {
    const lk = id === "original" ? null : LOOKS[id];
    const ch = lk ? lk.color + (lk.texture ? "," + lk.texture : "") + "," : "";
    fc.push(`[s${i}]${ch}format=yuv444p,drawtext=${font}text='${lk ? lk.en : id}':x=10:y=h-th-10:fontsize=${Math.round(cellW / 14)}:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=6[c${i}]`);
  });
  const rows = Math.ceil(all.length / cols);
  const layout = all.map((_, i) => `${(i % cols) * cellW}_${Math.floor(i / cols) * cellH}`).join("|");
  fc.push(`${all.map((_, i) => `[c${i}]`).join("")}xstack=inputs=${all.length}:layout=${layout}:fill=black[out]`);
  const out = path.resolve(o.o || o.out || "compare_look.jpg");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await ff(["-y", ...inArgs, "-filter_complex", fc.join(";"), "-map", "[out]", "-frames:v", "1", "-q:v", "2", out]);
  say(o, L`compare sheet: ${all.length} panels (${cols}x${rows}) -> ${out}`);
  return { out, looks: ids.map((k) => LOOKS[k].en) };
}

// ------------------------------------------------------------------ audio: measure and normalize
/** EBU R128: { lufs, lra, peak } (old field `puncak` is kept as a hidden alias of peak). */
export async function measureLoudness(file) {
  const { stderr } = await ff(["-nostats", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const sum = stderr.slice(stderr.lastIndexOf("Summary:"));
  const g = (re) => { const m = re.exec(sum); return m ? +m[1] : null; };
  const r = { lufs: g(/I:\s+(-?[\d.]+) LUFS/), lra: g(/LRA:\s+(-?[\d.]+) LU/), peak: g(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
  Object.defineProperty(r, "puncak", { value: r.peak, enumerable: false });
  return r;
}

function audioCodec(out, info) {
  const ext = path.extname(out).toLowerCase();
  if (ext === ".wav") return ["-c:a", "pcm_s16le"];
  if (ext === ".flac") return ["-c:a", "flac"];
  if (ext === ".mp3") return ["-c:a", "libmp3lame", "-b:a", "192k"];
  if (ext === ".ogg" || ext === ".opus" || ext === ".webm") return ["-c:a", "libopus", "-b:a", "160k"];
  return ["-c:a", "aac", "-b:a", "192k"];
}

export async function audioNormalize(inp, o) {
  if (!inp) throw new Error(L`Name a file: mgp audio normalize voice.wav -o voice_normal.wav [--lufs -14 | --podcast]`);
  inp = path.resolve(inp);
  const info = probeMedia(inp);
  if (!info.hasAudio) throw new Error(L`the file has no audio track: ${inp}`);
  const I = o.lufs != null ? +o.lufs : o.podcast ? -16 : -14;
  const TP = o.tp != null ? +o.tp : -1;
  const LRA = o.lra != null ? +o.lra : 11;
  const before = await measureLoudness(inp);
  // pass 1: measure with loudnorm, pass 2: apply linearly with the measured values
  const { stderr } = await ff(["-nostats", "-i", inp, "-vn", "-af", `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, "-f", "null", "-"]);
  const js = stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1);
  const m = JSON.parse(js);
  const af = `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=summary`;
  const out = outPath(inp, o, "normal");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const sr = String(o.ar || info.sampleRate || 48000);
  const videoArgs = info.hasVideo && !info.image && !isAudio(out) ? ["-map", "0:v", "-c:v", "copy", "-map", "0:a"] : ["-vn"];
  await ff(["-y", "-i", inp, ...videoArgs, "-af", af, "-ar", sr, ...audioCodec(out, info), out]);
  let after = await measureLoudness(out);
  let mode = "linear";
  // linear mode may not exceed the true-peak limit; when the target is not reached (peak too high
  // for the loudness, e.g. TTS voice), use a fixed gain + limiter (4x oversampling ~ true-peak)
  if (after.lufs != null && before.lufs != null && Math.abs(after.lufs - I) > 1 && !(o.linear || o.linier)) {
    const lim = Math.pow(10, (TP - 0.3) / 20).toFixed(4);
    let gain = I - before.lufs;
    for (let k = 0; k < 6; k++) {
      const afL = `aresample=${+sr * 4},volume=${gain.toFixed(2)}dB,alimiter=limit=${lim}:attack=2:release=60:level=false,aresample=${sr}`;
      await ff(["-y", "-i", inp, ...videoArgs, "-af", afL, "-ar", sr, ...audioCodec(out, info), out]);
      after = await measureLoudness(out);
      if (after.lufs == null || Math.abs(after.lufs - I) <= 0.3) break;
      gain += 1.4 * (I - after.lufs);
    }
    mode = "gain + limiter";
  }
  say(o, L`audio normalize: ${before.lufs} LUFS (peak ${before.peak} dBFS) -> ${after.lufs} LUFS (peak ${after.peak} dBFS), target ${I} LUFS / ${TP} dBTP, mode ${mode === "linear" ? L`linear` : L`gain + limiter`} -> ${out}`);
  return { out, target: { lufs: I, tp: TP, lra: LRA }, mode, before, after };
}

export async function audioMeasure(inp, o) {
  if (!inp) throw new Error(L`Name a file: mgp audio measure voice.wav`);
  const r = await measureLoudness(path.resolve(inp));
  say(o, L`${path.basename(inp)}: ${r.lufs} LUFS integrated, LRA ${r.lra} LU, peak ${r.peak} dBFS`);
  return r;
}

/** Old names (v2.3 / v2.4-dev): voice.mjs and older tools import these. */
export {
  look as tampilan, exportLut as eksporLut, brighten as terangkan, effects as gaya, compare as banding,
  EFFECTS as EFEK, measureLoudness as ukurLoudness, audioNormalize as audioNormal, audioMeasure as audioUkur,
};
