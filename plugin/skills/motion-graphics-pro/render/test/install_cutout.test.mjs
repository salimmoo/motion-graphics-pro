// Test: the "cutout" install target (rembg + U2-Net; P3_revisi: rembg was in no venv, an agent made its own).
//   node --test motion-graphics-pro/render/test/install_cutout.test.mjs
// Offline checks only. The full install was run by hand: MGP_HOME=<temp> mgp install cutout --fresh (409 s), and
// mgp install cutout --adopt on the hand-made venv ~/vrb.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { manifest, decide } from "../src/install.mjs";
import { defaults, legacyManual } from "../src/location.mjs";

const PY = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "py");

test("manifest: u2net pinned with url, size and sha256, in the rembg folder layout", () => {
  const c = manifest().components.u2net;
  assert.equal(c.target, "cutout");
  assert.equal(c.layout, "flat");
  assert.equal(c.files.length, 1);
  const f = c.files[0];
  assert.match(f.url, /^https:\/\/github\.com\/danielgatis\/rembg\/releases\/download\/v0\.0\.0\/u2net\.onnx$/);
  assert.equal(f.path, "models/u2net/u2net.onnx");     // REMBG_HOME/models/<model>/<model>.onnx
  assert.match(f.sha256, /^[0-9a-f]{64}$/);
  assert.equal(f.size, 175997641);
  assert.equal(c.totalSize, f.size);
});

test("requirements-cutout.txt: every package pinned with ==, rembg + onnxruntime + numpy 2, no torch", () => {
  const lines = fs.readFileSync(path.join(PY, "requirements-cutout.txt"), "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
  for (const l of lines) assert.match(l, /^[A-Za-z0-9_.-]+==[0-9][\w.]*$/, l);
  const names = lines.map((l) => l.split("==")[0].toLowerCase());
  for (const n of ["rembg", "onnxruntime", "numpy", "pillow", "pymatting", "numba", "scipy", "scikit-image", "pooch"]) assert.ok(names.includes(n), n);
  assert.ok(!names.includes("torch"));
  assert.match(lines.find((l) => /^numpy==/.test(l)), /^numpy==2\./);
});

test("decide(): cutout is possible on CPU even where torch is not (Intel Mac)", () => {
  const p = { os: "macos", arch: "x64", gpu: [], ram: { totalGb: 16, freeGb: 8 }, disk: { folder: "/tmp", freeGb: 50 }, python: { choice: { exe: "python3", version: "3.12.4", minor: 12, major: 3, ensurepip: true, bit64: true }, all: [] } };
  const d = decide(p);
  assert.equal(d.supported, false);           // no torch wheel
  assert.equal(d.cutout.possible, true);
  assert.equal(d.cutout.device, "cpu");
  assert.ok(d.needGb.cutout > 0.5 && d.needGb.cutout < 1);
});

test("locations: default venv-cutout + model/rembg, old manual ~/vrb + ~/.rembg", () => {
  const b = defaults("/x");
  assert.equal(path.basename(b.venvCutout), "venv-cutout");
  assert.equal(path.relative("/x", b.rembg).replace(/\\/g, "/"), "model/rembg");
  const m = legacyManual();
  assert.match(m.pythonCutout, /vrb/);
  assert.match(m.rembg, /\.rembg$/);
});

test("install_test.py knows the cutout target", () => {
  const s = fs.readFileSync(path.join(PY, "install_test.py"), "utf8");
  assert.match(s, /"cutout": \["rembg", "onnxruntime"/);
  assert.match(s, /def cutout_test/);
});
