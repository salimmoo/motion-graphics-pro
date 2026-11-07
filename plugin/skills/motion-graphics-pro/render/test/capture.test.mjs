// Test: capture commands under real use (P1 reports iklan-90/105): parallel runs, a stuck page, a lost WebGL
// context, fonts used only by a canvas, and the curves false flags. Needs Chrome/Edge; runs mgp as child processes.
//   node --test motion-graphics-pro/render/test/capture.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const MGP = path.join(here, "..", "bin", "mgp.mjs");
const FIX = path.join(here, "fixtures");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-captest-"));
// a private temp folder: the browser profiles of these runs land here, so leftovers can be counted
const privTmp = path.join(tmp, "t");
fs.mkdirSync(privTmp);
const env = { ...process.env, TMP: privTmp, TEMP: privTmp, TMPDIR: privTmp, MGP_LANG: "en" };

function mgp(args, extra = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [MGP, ...args], { env: { ...env, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ code, out, err, s: (Date.now() - t0) / 1000 }));
  });
}
const sha = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
const profiles = () => fs.readdirSync(privTmp).filter((x) => x.startsWith("mgp-profile-"));

test("a seek that never resolves fails within --timeout with a clear message (was: hung forever)", async () => {
  const r = await mgp(["contact", path.join(FIX, "hang-seek.html"), "--times", "0,1", "--timeout", "3", "-o", path.join(tmp, "hang.png")]);
  assert.equal(r.code, 1);
  assert.match(r.err, /seek to t=1 s did not finish within 3 s/);
  assert.ok(r.s < 60, "took " + r.s + " s");
  assert.deepEqual(profiles(), []);
});

test("3 contact sheets + 1 frame in parallel: all succeed, same pixels as alone, no browser profile left", async () => {
  const comp = path.join(FIX, "curves-flags.html");
  const solo = await mgp(["contact", comp, "--n", "12", "-o", path.join(tmp, "solo.png")]);
  assert.equal(solo.code, 0, solo.err);
  const runs = await Promise.all([
    ...[1, 2, 3].map((i) => mgp(["contact", comp, "--n", "12", "-o", path.join(tmp, `par${i}.png`)])),
    mgp(["frame", path.join(FIX, "canvas-fonts.html"), "--t", "1.5", "-o", path.join(tmp, "f.png")]),
  ]);
  for (const r of runs) assert.equal(r.code, 0, r.err);
  for (const i of [1, 2, 3]) assert.equal(sha(path.join(tmp, `par${i}.png`)), sha(path.join(tmp, "solo.png")));
  assert.deepEqual(profiles(), []);
});

test("a WebGL canvas that loses its context stops the capture (was: black frames, exit 0)", async () => {
  const comp = path.join(FIX, "webgl-lost.html");
  const r = await mgp(["contact", comp, "--times", "0.5,1.5", "-o", path.join(tmp, "gl.png")]);
  assert.equal(r.code, 1);
  assert.match(r.err, /lost its context at t=1\.5 s/);
  const ok = await mgp(["contact", comp, "--times", "0.5,1.5", "-o", path.join(tmp, "gl2.png")], { MGP_ALLOW_CONTEXT_LOSS: "1" });
  assert.equal(ok.code, 0, ok.err);
});

test("canvas-only fonts: the first capture at 1.5 s equals a later one; check lists the fonts and the fallback", async () => {
  const comp = path.join(FIX, "canvas-fonts.html");
  // first use of Fraunces is at t >= 1: the FIRST capture at 1.5 s must already use it (= the second capture)
  const { openSession } = await import("../src/session.mjs");
  const { capture } = await import("../src/browser.mjs");
  const ses = await openSession(comp, { quiet: true });
  try {
    const s = await ses.open();
    const h1 = crypto.createHash("sha1").update(await capture(s, 1.5)).digest("hex");
    const h2 = crypto.createHash("sha1").update(await capture(s, 1.5)).digest("hex");
    assert.equal(h1, h2, "first capture drew the canvas text with the fallback font");
  } finally { await ses.close(); }
  const c = await mgp(["check", comp, "--json"]);
  const h = JSON.parse(c.out);
  assert.ok(h.passed.some((x) => /canvas fonts loaded: .*Fraunces/.test(x)), h.passed.join("\n"));
  assert.ok(h.warnings.some((x) => /NotAFontXYZ.*draws with sans-serif/.test(x)), h.warnings.join("\n"));
});

test("curves: no false volume/abrupt flags (mirror, rotateY, display:none), real squash kept, late canvas channel analysed", async () => {
  const r = await mgp(["curves", path.join(FIX, "curves-flags.html"), "--json", "--quiet"]);
  assert.equal(r.code, 0, r.err);
  const h = JSON.parse(r.out);
  const by = Object.fromEntries(h.elements.map((e) => [e.label, e.findings.map((f) => f.kind + ":" + f.channel)]));
  assert.deepEqual(by["#flip"] || [], []);
  assert.deepEqual((by["#pop"] || []).filter((k) => k.endsWith(":position")), []);
  assert.ok(!(by["#ry"] || []).includes("volume:scale"));
  assert.ok(by["#sq"].includes("volume:scale"));
  assert.ok("canvas:b" in by, Object.keys(by).join(", "));
});

test.after(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } });
