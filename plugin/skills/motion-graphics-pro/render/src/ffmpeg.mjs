// ffmpeg/ffprobe wrappers: pipe encoder, joining segments, mixing audio.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

export const FFMPEG = env("MGP_FFMPEG", "ffmpeg");
export const FFPROBE = env("MGP_FFPROBE", "ffprobe");

export function hasFfmpeg() {
  const r = spawnSync(FFMPEG, ["-version"], { encoding: "utf8" });
  return r.status === 0;
}

/** Scale filter to the output size (letterbox when the aspect differs) + force even dimensions. */
export function scaleFilter(out) {
  if (!out) return "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos";
  const { width: W, height: H } = out;
  return `scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`;
}

/** Codec arguments per output format. `transparent` (old `transparan`) = keep alpha. */
export function codecArgs(fmt, { crf = 18, preset = "medium", transparent, transparan = false, hw = null } = {}) {
  const alpha = !!(transparent ?? transparan);
  if (hw && fmt === "mp4") return hw; // hardware encoder (src/device.mjs), MP4 H.264 only
  if (fmt === "prores") return alpha
    ? ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"]
    : ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le", "-vendor", "apl0"];
  if (fmt === "webm") return ["-c:v", "libvpx-vp9", "-crf", String(crf + 12), "-b:v", "0", "-pix_fmt", alpha ? "yuva420p" : "yuv420p", "-row-mt", "1"];
  return ["-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-pix_fmt", "yuv420p", "-profile:v", "high", "-tune", "animation"];
}

/**
 * Start an encoder that reads images from stdin. `transparent` (old `transparan`) keeps alpha.
 * Returns { write(buf), end() -> Promise }.
 */
export function startEncoder({ out, fps, fmt = "mp4", outSize, input = "png", crf, preset, transparent, transparan, log, hw }) {
  const alpha = !!(transparent ?? transparan);
  const vf = fmt === "prores" || alpha ? scaleFilter(outSize).replace(":color=black", ":color=black@0") : scaleFilter(outSize);
  const args = ["-y", "-hide_banner", "-loglevel", "error",
    "-f", "image2pipe", "-c:v", input === "jpeg" ? "mjpeg" : "png", "-framerate", String(fps), "-i", "-",
    "-vf", vf, "-r", String(fps), ...codecArgs(fmt, { crf, preset, transparent: alpha, hw }),
    ...(fmt === "mp4" ? ["-movflags", "+faststart"] : []), "-an", out];
  const p = spawn(FFMPEG, args, { stdio: ["pipe", "ignore", "pipe"] });
  let err = "";
  p.stderr.on("data", (d) => { err += d; if (log) log(String(d)); });
  const done = new Promise((res, rej) => {
    p.on("error", rej);
    p.on("close", (code) => code === 0 ? res() : rej(new Error(L`ffmpeg failed (${code}): ${err.trim()}`)));
  });
  let pipeErr = null;
  p.stdin.on("error", (e) => { pipeErr = e; });
  return {
    write: (buf) => new Promise((res, rej) => {
      if (pipeErr) return rej(new Error(L`ffmpeg pipe broken: ${err.trim()}`));
      if (!p.stdin.write(buf)) p.stdin.once("drain", res); else res();
    }),
    end: () => { p.stdin.end(); return done; },
  };
}

export function run(args, { quiet = true } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ["-y", "-hide_banner", "-loglevel", quiet ? "error" : "info", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res(err) : rej(new Error(L`ffmpeg failed: ${err.trim()}`))));
  });
}

/** Join segments with the concat demuxer, without re-encoding. */
export async function concat(parts, out) {
  const list = out + ".list.txt";
  fs.writeFileSync(list, parts.map((p) => "file '" + path.resolve(p).replace(/\\/g, "/").replace(/'/g, "'\\''") + "'").join("\n"));
  try { await run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", ...(out.endsWith(".mp4") ? ["-movflags", "+faststart"] : []), out]); }
  finally { fs.rmSync(list, { force: true }); }
}

function atempoChain(r) {
  const f = [];
  while (r > 2) { f.push("atempo=2"); r /= 2; }
  while (r < 0.5) { f.push("atempo=0.5"); r /= 0.5; }
  if (Math.abs(r - 1) > 1e-6) f.push("atempo=" + r.toFixed(6));
  return f;
}

/**
 * Mix audio tracks into a video. tracks: [{ file, start, mediaStart, duration, volume, rate }]
 * start is relative to the start of the video (--from already subtracted). The video stream is copied as is.
 */
export async function muxAudio(videoIn, tracks, out, { duration, fmt = "mp4" }) {
  const inputs = [], chains = [], labels = [];
  tracks.forEach((tr, i) => {
    let start = tr.start, ms = tr.mediaStart || 0, dur = tr.duration;
    const rate = tr.rate || 1;
    if (start < 0) { ms += -start * rate; if (dur != null) dur += start; start = 0; }
    if (dur != null && dur <= 0) return;
    if (start >= duration) return;
    inputs.push("-i", tr.file);
    const f = [];
    const trim = ["start=" + ms.toFixed(6)];
    if (dur != null) trim.push("duration=" + (dur * rate).toFixed(6));
    f.push("atrim=" + trim.join(":"), "asetpts=PTS-STARTPTS", ...atempoChain(rate),
      "aformat=sample_rates=48000:channel_layouts=stereo");
    if (tr.volume != null && tr.volume !== 1) f.push("volume=" + tr.volume);
    const d = Math.round(start * 1000);
    if (d > 0) f.push(`adelay=${d}|${d}`);
    const lab = "a" + i;
    chains.push(`[${labels.length + 1}:a]${f.join(",")}[${lab}]`);
    labels.push(lab);
  });
  if (!labels.length) { fs.copyFileSync(videoIn, out); return false; }
  const mix = labels.length > 1
    ? `${labels.map((l) => "[" + l + "]").join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad[mx]`
    : `[${labels[0]}]apad[mx]`;
  const fc = chains.join(";") + ";" + mix + `;[mx]atrim=0:${duration.toFixed(6)}[aout]`;
  const acodec = fmt === "prores" ? ["-c:a", "pcm_s16le"] : fmt === "webm" ? ["-c:a", "libopus", "-b:a", "160k"] : ["-c:a", "aac", "-b:a", "192k"];
  await run(["-i", videoIn, ...inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", ...acodec,
    "-t", duration.toFixed(6), ...(fmt === "mp4" ? ["-movflags", "+faststart"] : []), out]);
  return true;
}

export function probe(file) {
  const r = spawnSync(FFPROBE, ["-v", "error", "-show_streams", "-show_format", "-count_frames", "-of", "json", file], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}
