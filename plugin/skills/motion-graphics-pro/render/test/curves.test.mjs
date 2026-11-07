// Test: mgp curves analysis (pure, no browser). False flags from the iklan-90/105 and P3 reports:
// uniform scale / mirror / scale-in reported as "squash without constant volume", an element leaving
// display:none reported as an "abrupt start" of thousands of px/s. Real squash and real abrupt starts stay flagged.
//   node --test motion-graphics-pro/render/test/curves.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { analyseVolume, analyseElement, analyseSpeed } from "../src/curves.mjs";

const fps = 24, dt = 1 / fps, n = 72;
const times = Array.from({ length: n }, (_, i) => i * dt);
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
const kinds = (f) => f.map((q) => q.kind);
/** rows [x, y, sx, sy, rot, op, vis, e, f, shown] */
const row = (o = {}) => [o.x ?? 100, o.y ?? 100, o.sx ?? 1, o.sy ?? 1, o.rot ?? 0, o.op ?? 1, o.vis ?? 1, 0, 0, o.shown ?? 1];

test("uniform scale 0.2 -> 1.3 -> 1: no volume finding", () => {
  const s = times.map((t) => (t < 1.5 ? 0.2 + 1.1 * ease((t - 0.2) / 1.2) : 1.3 - 0.3 * ease((t - 1.5) / 0.8)));
  assert.deepEqual(analyseVolume(s, s, times).findings, []);
});

test("mirror (scaleX -1 .. -1.4, scaleY 1 .. 1.4): no volume finding", () => {
  const k = times.map((t) => 1 + 0.4 * ease(t / 2));
  assert.deepEqual(analyseVolume(k.map((v) => -v), k, times).findings, []);
});

test("scale-in with a constant-volume squash on the way: no volume finding", () => {
  // base uniform scale grows 0.3 -> 1 over 0.5-1.5 s; a squash sx = b*q, sy = b/q (area = b^2) in between
  const b = times.map((t) => 0.3 + 0.7 * ease((t - 0.5) / 1));
  const q = times.map((t) => (t > 0.8 && t < 1.2 ? 1.3 : 1));
  assert.deepEqual(analyseVolume(b.map((v, i) => v * q[i]), b.map((v, i) => v / q[i]), times).findings, []);
});

test("real squash without constant volume (1.3 x 0.6) is still flagged", () => {
  const sx = times.map((t) => (t > 0.5 && t < 1.2 ? 1 + 0.3 * Math.sin(((t - 0.5) / 0.7) * Math.PI) : 1));
  const sy = times.map((t) => (t > 0.5 && t < 1.2 ? 1 - 0.4 * Math.sin(((t - 0.5) / 0.7) * Math.PI) : 1));
  assert.deepEqual(kinds(analyseVolume(sx, sy, times).findings), ["volume"]);
});

test("element leaving display:none while moving: no abrupt/pop from the jump", () => {
  // hidden (rect 0,0) until 1 s, then moving down from y 300 with an eased motion
  const data = times.map((t) => (t < 1 ? row({ x: 0, y: 0, vis: 0, shown: 0 }) : row({ x: 500, y: 300 + 900 * ease((t - 0.5) / 1.8) })));
  const A = analyseElement(data, times, dt);
  assert.deepEqual(A.findings.filter((q) => q.channel === "position"), []);
  // the old columns (no "shown") still behave as before: the jump is reported
  const old = analyseElement(data.map((r) => r.slice(0, 9)), times, dt);
  assert.ok(old.findings.some((q) => q.kind === "abrupt" && q.channel === "position"));
});

test("a real abrupt start (linear move from rest) is still flagged while shown", () => {
  const data = times.map((t) => row({ x: t < 1 ? 100 : 100 + 600 * (t - 1) }));
  assert.ok(analyseElement(data, times, dt).findings.some((q) => q.kind === "linear" || q.kind === "abrupt"));
});

test("canvas channel with a gap (missing samples): no speed across the gap", () => {
  const v = times.map((t) => (t < 1 ? 0 : 500 + 100 * ease(t - 1)));
  const gap = times.map((t) => t < 1);
  const A = analyseSpeed(v, dt, "b", "", 1, times, gap);
  assert.equal(A.findings.filter((q) => q.kind === "abrupt" || q.kind === "pop").length, 0);
  assert.ok(A.peak < 200, "peak " + A.peak);
});
