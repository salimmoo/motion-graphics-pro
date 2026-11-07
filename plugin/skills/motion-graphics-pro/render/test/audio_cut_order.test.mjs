// Test: cutting one VO line next to a tempo change (P3_revisi: the cup's line 11 held line 12 because the project script
// cut AFTER atempo). Recipe from references/audio.md 10.2a: -ss/-to before -i (source timeline), atempo after the cut.
//   node --test motion-graphics-pro/render/test/audio_cut_order.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FFMPEG } from "../src/ffmpeg.mjs";

const SR = 16000;
const ff = (args) => { const r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args]); assert.equal(r.status, 0, String(r.stderr)); };
/** zero crossings per second over a stretch of a mono s16le file -> rough frequency */
function freq(file, from, to) {
  const b = fs.readFileSync(file), n = b.length / 2, a = Math.floor(from * SR), z = Math.min(n, Math.floor(to * SR));
  let zc = 0;
  for (let i = a + 1; i < z; i++) if ((b.readInt16LE(2 * (i - 1)) < 0) !== (b.readInt16LE(2 * i) < 0)) zc++;
  return zc / 2 / ((z - a) / SR);
}
const secs = (file) => fs.statSync(file).size / 2 / SR;

// "line 1" = 440 Hz for 0-2 s, "line 2" = 1000 Hz for 2-4 s; the line must play at speed 1.25
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-cut-"));
const src = path.join(tmp, "vo.wav");
ff(["-f", "lavfi", "-i", `sine=f=440:d=2:r=${SR}`, "-f", "lavfi", "-i", `sine=f=1000:d=2:r=${SR}`, "-filter_complex", "[0][1]concat=n=2:v=0:a=1", "-ac", "1", src]);

test("right: -ss/-to before -i, atempo after the cut -> only line 1, 1.6 s", () => {
  const out = path.join(tmp, "right.raw");
  ff(["-ss", "0", "-to", "2", "-i", src, "-af", "atempo=1.25", "-f", "s16le", "-ac", "1", "-ar", String(SR), out]);
  assert.ok(Math.abs(secs(out) - 1.6) < 0.05, `duration ${secs(out)}`);
  assert.ok(Math.abs(freq(out, 0.05, secs(out) - 0.05) - 440) < 25, "only the 440 Hz line");
});

test("wrong (the P3 pitfall): -ss/-to after -i with atempo -> the cut takes in the next line", () => {
  const out = path.join(tmp, "wrong.raw");
  ff(["-i", src, "-ss", "0", "-to", "2", "-af", "atempo=1.25", "-f", "s16le", "-ac", "1", "-ar", String(SR), out]);
  // the 2 s window is measured on the re-timed output: it holds 2.5 s of source, so line 2 (1000 Hz) leaks in at the end
  assert.ok(secs(out) > 1.9, `duration ${secs(out)}`);
  assert.ok(freq(out, secs(out) - 0.3, secs(out) - 0.02) > 800, "next line audible at the end");
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
