// mgp render / mgp frame: capture frame by frame, then encode.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { openSession, resolveTiming, parseSize, mediaToFile, loadCaptions, fmtT, checkVars } from "./session.mjs";
import { capture } from "./browser.mjs";
import { startEncoder, concat, muxAudio, run, hasFfmpeg } from "./ffmpeg.mjs";
import * as device from "./device.mjs";
import { classifyLogs, summarizeErrors as summarize } from "./error.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

// device.mjs is converted by another helper: accept its new and old export names.
const pickEncoder = (...a) => (device.pickEncoder || device.pilihEncoder)(...a);

function fmtOf(out, o) {
  if (o.format) return o.format;
  const ext = path.extname(out).toLowerCase();
  if (ext === ".mov") return "prores";
  if (ext === ".webm") return "webm";
  if (!ext || out.endsWith("/") || out.endsWith("\\")) return "png";
  return "mp4";
}

/** Split [0, n) into w consecutive ranges. */
export function splitRange(n, w) {
  w = Math.max(1, Math.min(w, n));
  const out = [], base = Math.floor(n / w), extra = n % w;
  let a = 0;
  for (let i = 0; i < w; i++) { const len = base + (i < extra ? 1 : 0); out.push([a, a + len]); a += len; }
  return out;
}

/** Captions options from the CLI (--captions-size/-font/-color/-bottom/-words). */
function captionsOf(o) {
  if (!o.captions) return null;
  return loadCaptions(o.captions, {
    size: o["captions-size"] && +o["captions-size"], font: o["captions-font"], color: o["captions-color"],
    bottom: o["captions-bottom"] && +o["captions-bottom"], maxWords: o["captions-words"] && +o["captions-words"],
  });
}

export async function render(comp, o) {
  if (!hasFfmpeg()) throw new Error(L`ffmpeg is not on PATH (or set MGP_FFMPEG).`);
  const out = path.resolve(o.o || o.out || "mgp.mp4");
  const fmt = fmtOf(out, o);
  const outSize = parseSize(o.size);
  const captionsData = captionsOf(o);
  const sess = await openSession(comp, { ...o, scale: +(o.scale || 1), transparent: !!o.transparent, captionsData });
  const t0 = Date.now();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-"));
  try {
    const first = await sess.open();
    const tm = resolveTiming(first.info, o);
    const workers = Math.max(1, Math.min(+(o.workers || 1), 16, tm.frames));
    const captureFmt = o["capture-format"] === "jpeg" ? "jpeg" : "png";
    const say = (s) => { if (!o.quiet) process.stderr.write(s + "\n"); };
    const shout = (s) => process.stderr.write(s + "\n"); // errors/warnings: printed even with --quiet
    checkVars(first.info, o, say);
    // script errors while loading: stop before rendering (--ignore-errors renders anyway)
    const g0 = classifyLogs(sess.logs);
    if (g0.script.length) {
      if (!o["ignore-errors"]) throw new Error(L`${g0.script.length} script errors on the page; render stopped (add --ignore-errors to render anyway):` + "\n" + summarize(g0.script));
      shout(L`warning: ${g0.script.length} script errors ignored (--ignore-errors):` + "\n" + summarize(g0.script));
    }
    say(L`mgp: ${path.basename(sess.c.file)}  ${first.info.width}x${first.info.height}  ${tm.fps} fps  ${fmtT(tm.from)} → ${fmtT(tm.to)}  (${tm.frames} frames, driver: ${first.info.driver}, ${workers} workers)`);
    const engine = first.info.engine || first.info.mesin;
    say(`browser: ${sess.browser.__exe}` + (engine ? L`  ·  animation engine: ${engine}` : ""));
    // video encoder: --encoder auto|cpu|nvenc|qsv|amf|videotoolbox (default cpu = libx264, deterministic; env MGP_ENCODER)
    const crf = o.crf ? +o.crf : 18;
    const wantEnc = o.encoder || env("MGP_ENCODER") || "cpu";
    let enc0 = { kind: "cpu", codec: "libx264", args: null };
    if (fmt === "mp4") {
      const e = pickEncoder(wantEnc, { workers, crf });
      enc0 = { kind: e.kind || e.jenis, codec: e.codec, args: e.args };
      say(L`encoder: ${e.reason || e.alasan}`);
    } else if (wantEnc !== "cpu" && fmt !== "png") say(L`encoder: --encoder ${wantEnc} is for MP4 only; ${fmt} uses the CPU encoder`);

    const ranges = splitRange(tm.frames, workers);
    const sessions = [first];
    sessions.push(...await Promise.all(ranges.slice(1).map(() => sess.open({ fresh: true }))));

    let done = 0, lastPct = -1;
    const hashes = new Array(tm.frames);
    const tick = () => {
      done++;
      const pct = Math.floor((done / tm.frames) * 10) * 10;
      if (pct !== lastPct) { lastPct = pct; say(L`  ${String(pct).padStart(3)}%  ${done}/${tm.frames} frames`); }
    };

    const pngDir = fmt === "png" ? out : null;
    if (pngDir) fs.mkdirSync(pngDir, { recursive: true });
    const parts = [];
    await Promise.all(ranges.map(async ([a, b], wi) => {
      const s = sessions[wi];
      const part = path.join(tmp, `part_${String(wi).padStart(2, "0")}` + (fmt === "prores" ? ".mov" : fmt === "webm" ? ".webm" : ".mp4"));
      parts[wi] = part;
      const enc = pngDir ? null : startEncoder({ out: part, fps: tm.fps, fmt, outSize, input: captureFmt, crf, preset: o.preset, transparent: !!o.transparent, hw: enc0.args });
      try {
        for (let i = a; i < b; i++) {
          const t = tm.from + i / tm.fps;
          const buf = await capture(s, t, { format: captureFmt });
          if (o.hash) hashes[i] = crypto.createHash("sha1").update(buf).digest("hex");
          if (pngDir) fs.writeFileSync(path.join(pngDir, `frame_${String(i).padStart(5, "0")}.${captureFmt === "jpeg" ? "jpg" : "png"}`), buf);
          else await enc.write(buf);
          tick();
        }
      } catch (e) {
        if (enc0.args) e.message += "\n" + L`(encoder ${enc0.codec} failed during the render; run again with --encoder cpu)`;
        throw e;
      } finally { if (enc) await enc.end(); }
    }));

    // audio
    const tracks = [];
    for (const m of first.info.media || []) {
      const f = mediaToFile(m.src, sess.srv, sess.c.root);
      if (!f || !fs.existsSync(f)) { say(L`  warning: audio ${m.src} not found locally, skipped`); continue; }
      let dur = m.duration;
      if (m.trimEnd != null) dur = Math.min(dur ?? Infinity, (m.trimEnd - m.mediaStart) / (m.rate || 1));
      tracks.push({ file: f, start: m.start - tm.from, mediaStart: m.mediaStart, duration: Number.isFinite(dur) ? dur : null, volume: m.volume, rate: m.rate });
    }
    for (const a of [].concat(o.audio || [])) {
      const [f, off] = String(a).split(/@(?=[-\d.]+$)/);
      if (!fs.existsSync(f)) throw new Error(L`--audio not found: ${f}`);
      tracks.push({ file: path.resolve(f), start: (off ? +off : 0) - tm.from, mediaStart: 0, duration: null, volume: 1, rate: 1 });
    }
    if (o["no-audio"]) tracks.length = 0;
    const length = tm.frames / tm.fps;

    if (pngDir) {
      if (tracks.length) {
        const silentRef = path.join(tmp, "silent.mp4");
        await run(["-f", "lavfi", "-i", `color=c=black:s=16x16:r=${tm.fps}`, "-t", length.toFixed(6), "-c:v", "libx264", "-pix_fmt", "yuv420p", silentRef]);
        const withA = path.join(tmp, "with_audio.mp4");
        await muxAudio(silentRef, tracks, withA, { duration: length, fmt: "mp4" });
        await run(["-i", withA, "-vn", "-c:a", "pcm_s16le", path.join(pngDir, "audio.wav")]);
        say(L`  audio written to ${path.join(pngDir, "audio.wav")}`);
      }
    } else {
      const video = path.join(tmp, "video" + path.extname(parts[0]));
      if (parts.length === 1) fs.renameSync(parts[0], video); else await concat(parts, video);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      if (tracks.length) { await muxAudio(video, tracks, out, { duration: length, fmt }); say(L`  audio: ${tracks.length} tracks mixed`); }
      else fs.copyFileSync(video, out);
    }
    for (const s of sessions) await s.ctx.close();
    const secs = (Date.now() - t0) / 1000;
    say(L`done: ${out}  (${tm.frames} frames in ${secs.toFixed(1)} s, ${(tm.frames / secs).toFixed(1)} frames/s)`);
    const g1 = classifyLogs(sess.logs);
    if (g1.other.length) shout(L`warning: ${g1.other.length} page notes:` + "\n" + summarize(g1.other, 5));
    const fresh = g1.script.filter((x) => !g0.script.includes(x));
    if (fresh.length) {
      if (!o["ignore-errors"]) throw new Error(L`${fresh.length} script errors appeared while rendering (${out} was written, but its frames may be wrong; --ignore-errors to accept):` + "\n" + summarize(fresh));
      shout(L`warning: ${fresh.length} script errors while rendering ignored (--ignore-errors):` + "\n" + summarize(fresh));
    }
    return { out, ...tm, info: first.info, hashes, tracks: tracks.length, seconds: secs, encoder: enc0.codec };
  } finally {
    await sess.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function frame(comp, o) {
  const out = path.resolve(o.o || o.out || "frame.png");
  const captionsData = captionsOf(o);
  const sess = await openSession(comp, { ...o, scale: +(o.scale || 1), transparent: !!o.transparent, captionsData });
  try {
    const s = await sess.open();
    checkVars(s.info, o, (x) => { if (!o.quiet) process.stderr.write(x + "\n"); });
    const t = +(o.t ?? 0);
    const g = classifyLogs(sess.logs);
    if (g.script.length) process.stderr.write(L`warning: ${g.script.length} script errors on the page (the frame is taken anyway):` + "\n" + summarize(g.script) + "\n");
    const jpeg = /\.jpe?g$/i.test(out);
    const buf = await capture(s, t, { format: jpeg ? "jpeg" : "png" });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    if (!o.quiet) process.stderr.write(`frame t=${t} s → ${out}\n`);
    return { out, t };
  } finally { await sess.close(); }
}
