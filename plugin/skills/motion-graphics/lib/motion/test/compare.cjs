#!/usr/bin/env node
// Uji banding Gerak vs GSAP asli untuk skenario objek biasa (opsional: butuh paket gsap).
//   node lib/motion/test/banding.cjs [path/ke/gsap.js] [--simpan]
// --simpan writes the GSAP results to test/expected.json (used by test.cjs without GSAP).
const path = require("path"), fs = require("fs");
const args = process.argv.slice(2);
const gsapPath = args.find((a) => !a.startsWith("--")) || path.join(__dirname, "../../../../motion-graphics-pro/render/node_modules/gsap/dist/gsap.js");
globalThis.__gerakTanpaShim = true;
const Gerak = require("../motion.js");
let gsap;
try { gsap = require(gsapPath).gsap; } catch (e) { console.log("GSAP tidak ditemukan di", gsapPath, "- lewati banding"); process.exit(0); }
gsap.defaults({ lazy: false });
const S = require("./scenarios.cjs");
let fail = 0; const harapan = {};
for (const [name, fn] of Object.entries(S)) {
  let a, b;
  try { a = JSON.stringify(fn(gsap)); } catch (e) { a = "ERR " + e.message; }
  try { b = JSON.stringify(fn(Gerak)); } catch (e) { b = "ERR " + e.message + " " + (e.stack || "").split("\n")[1]; }
  harapan[name] = JSON.parse(a.startsWith("ERR") ? "null" : a);
  if (a !== b) { fail++; console.log("BEDA", name, "\n  gsap :", a, "\n  gerak:", b); }
}
console.log(Object.keys(S).length - fail + "/" + Object.keys(S).length, "skenario sama");
if (args.includes("--simpan")) fs.writeFileSync(path.join(__dirname, "expected.json"), JSON.stringify(harapan, null, 1));
process.exit(fail ? 1 : 0);
