#!/usr/bin/env node
// Builds the mgp.motion derivatives from one source (motion.js):
//   motion.mjs                                          ES module (default export + named exports)
//   ../gerak/gerak.js, ../gerak/gerak.mjs               old paths (v2.3 / v2.4-dev), identical copies
//   ../../../motion-graphics-pro/render/src/motion.js   copy for the mgp renderer (served as gsap.min.js)
//   node lib/motion/build.mjs      (old name: lib/gerak/bangun.mjs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "motion.js"), "utf8");
const a = src.indexOf("/*<inti>*/"), b = src.indexOf("/*</inti>*/");
if (a < 0 || b < 0) throw new Error("marker /*<inti>*/ not found in motion.js");
const head = src.slice(0, src.indexOf("(function (root, factory)"));
const body = src.slice(a, b + "/*</inti>*/".length);
const names = ["timeline", "to", "from", "fromTo", "set", "delayedCall", "spring", "inertia", "pegas", "inersia", "killTweensOf", "getTweensOf", "getProperty", "quickSetter", "quickTo", "parseEase", "registerEase", "registerPlugin", "utils", "ticker", "globalTimeline", "config", "defaults", "context", "matchMedia", "Tween", "Timeline", "version"];
const mjs = `${head.replace("Usage: <script src=\"motion.js\"></script> then mgp.motion.timeline(...).", "ES module (generated from motion.js by build.mjs; do not edit).")}const root = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
const motion = (function (root) {
${body}
})(root);
if (root) { root.mgp = root.mgp || {}; if (!root.mgp.motion) root.mgp.motion = motion; if (!root.Gerak) root.Gerak = motion; }
if (root && typeof window !== "undefined" && !root.gsap && !root.__motionNoShim && !root.__gerakTanpaShim) { motion.isShim = true; root.gsap = motion; }
export default motion;
export { motion, motion as Gerak, motion as gsap };
export const { ${names.join(", ")} } = motion;
`;
fs.writeFileSync(path.join(here, "motion.mjs"), mjs);
const said = ["motion.mjs " + fs.statSync(path.join(here, "motion.mjs")).size + " bytes; motion.js " + src.length + " bytes"];
// old paths: byte-identical copies, so compositions that load lib/gerak/gerak.js keep working
const old = path.join(here, "..", "gerak");
fs.mkdirSync(old, { recursive: true });
fs.writeFileSync(path.join(old, "gerak.js"), src);
fs.writeFileSync(path.join(old, "gerak.mjs"), mjs);
fs.writeFileSync(path.join(old, "README.md"), "# lib/gerak (old path)\n\nMoved to [`lib/motion/`](../motion/README.md) (engine name `mgp.motion`, formerly Gerak).\n`gerak.js` and `gerak.mjs` here are identical copies written by `node lib/motion/build.mjs`, kept so old compositions keep loading.\n");
said.push("lib/gerak/gerak.js + gerak.mjs (old-path copies)");
const pro = path.join(here, "../../../motion-graphics-pro/render/src");
if (fs.existsSync(pro)) {
  fs.writeFileSync(path.join(pro, "motion.js"), "/* Copy of motion-graphics/lib/motion/motion.js (lib/motion/build.mjs). Edit the source, not this file. */\n" + src);
  said.push(path.relative(process.cwd(), path.join(pro, "motion.js")));
}
console.log("written: " + said.join("; "));
