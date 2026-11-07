// Local static server for compositions. Injects the mgp runtime into the entry HTML.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { fontRoute, rewriteFonts } from "./fonts.mjs";
import { env } from "./names.mjs";
import { L, lang } from "./i18n.mjs";
import { motionLib } from "./location.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const MIME = {
  ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".aac": "audio/aac",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".wasm": "application/wasm", ".lottie": "application/zip", ".txt": "text/plain; charset=utf-8",
};

// Real GSAP is only used when asked for (--native-gsap / env MGP_NATIVE_GSAP) and installed in node_modules.
function gsapDir() {
  if (!env("MGP_NATIVE_GSAP")) return null;
  return gsapAsliDir();
}
/** gsap/dist folder resolvable from render/src (null when the gsap package is not installed). */
export function gsapAsliDir() {
  try { return path.dirname(require.resolve("gsap/dist/gsap.min.js")); } catch { return null; }
}
// mgp.motion: the package animation engine (GSAP-compatible API). Copy in src/motion.js, source in
// motion-graphics/lib/motion/motion.js (copied by lib/motion/build.mjs).
function motionFile() {
  const a = path.join(here, "motion.js");
  if (fs.existsSync(a)) return a;
  const b = path.join(here, "../../../motion-graphics/lib/motion/motion.js");
  if (fs.existsSync(b)) return b;
  const lib = motionLib("motion/motion.js");
  return lib ? path.join(lib, "motion", "motion.js") : null;
}

// GSAP from a CDN (jsdelivr, unpkg, cdnjs) is redirected to /__mgp/gsap/: by default that is mgp.motion, so
// a composition still opens in a normal browser, but rendering needs neither internet nor npm.
const CDN_GSAP = /(<script[^>]+src=["'])https?:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com|cdnjs\.cloudflare\.com\/ajax\/libs)\/gsap(?:@[\d.]+)?\/(?:[\d.]+\/)?(?:dist\/)?([A-Za-z0-9-]+?)(?:\.min)?\.js(["'])/gi;

/** Insert the runtime (and mgp.motion as the gsap global when the composition loads no engine itself). */
export function inject(html, vars = null) {
  html = rewriteFonts(html); // Google Fonts -> bundled local fonts (src/fonts.mjs)
  html = html.replace(CDN_GSAP, (m, a, name, b) => a + "/__mgp/gsap/" + name + ".min.js" + b);
  // the composition already loads an engine: gsap, old gerak.js, or motion.js (file name, not "motion-graphics/" in a path)
  const needsGsap = /data-composition-id/.test(html) && !/<script[^>]+src=["'](?:[^"']*(?:gsap|gerak)[^"']*|(?:[^"']*\/)?motion(?:\.min)?\.m?js(?:\?[^"']*)?)["']/i.test(html);
  // window.__mgpLang: message language for the page runtime (variable issues, layout audit); no visual effect
  let pre = "window.__mgpLang=" + JSON.stringify(lang()) + ";";
  if (vars && Object.keys(vars).length) pre += "window.__mgpVars=" + JSON.stringify(vars).replace(/</g, "\\u003c") + ";";
  let tags = "<script>" + pre + '</script><script src="/__mgp/runtime.js"></script>';
  if (needsGsap) tags += '<script src="/__mgp/gsap/gsap.min.js"></script>';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tags);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + tags + "</head>");
  return tags + html;
}

/**
 * Start the server. root = project folder, entry = relative path of the composition HTML.
 * extra: { "/path": (req, res) => void } for extra pages (preview). The old URL prefix /__rekam/ is still served.
 */
export function startServer({ root, entry, port = 0, extra = {}, vars = null }) {
  root = path.resolve(root);
  const entryUrl = "/" + entry.split(path.sep).join("/");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let p = decodeURIComponent(url.pathname);
    if (p.startsWith("/__rekam/")) p = "/__mgp/" + p.slice(9); // old prefix
    if (extra[p]) return extra[p](req, res, url);
    if (fontRoute(p, req, res, url, root)) return;
    if (p === "/favicon.ico" && !fs.existsSync(path.join(root, "favicon.ico"))) { res.writeHead(204); return res.end(); }
    if (p === "/__mgp/runtime.js") return sendFile(res, path.join(here, "runtime.js"));
    if (p.startsWith("/__mgp/gsap/") || p === "/__mgp/gerak.js" || p === "/__mgp/motion.js") {
      const d = p.startsWith("/__mgp/gsap/") ? gsapDir() : null;
      if (d) return sendFile(res, path.join(d, path.basename(p)));
      // mgp.motion replaces gsap.min.js; other GSAP plugins (e.g. ScrollTrigger) are a no-op
      const name = path.basename(p);
      if (name === "gsap.min.js" || name === "gsap.js" || name === "motion.js" || name === "gerak.js") {
        const g = motionFile();
        if (g) return sendFile(res, g);
        res.writeHead(404); return res.end(L`motion.js not found`);
      }
      res.writeHead(200, { "content-type": MIME[".js"], "cache-control": "no-store" });
      return res.end("/* " + name + ": GSAP plugin not available in mgp.motion (registerPlugin no-op) */");
    }
    if (p === "/") p = entryUrl;
    const file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    // ?raw (old ?mentah): the entry file as written, without the injected runtime
    if (p === entryUrl && !url.searchParams.has("raw") && !url.searchParams.has("mentah")) {
      fs.readFile(file, "utf8", (err, txt) => {
        if (err) { res.writeHead(404); return res.end(L`not found`); }
        res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-store" });
        res.end(inject(txt, vars));
      });
      return;
    }
    sendFile(res, file, req);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const { port: pt } = server.address();
      resolve({ server, port: pt, base: `http://127.0.0.1:${pt}`, entryUrl, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

function sendFile(res, file, req) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "content-type": "text/plain" }); return res.end(L`not found: ${file}`); }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    // CSS/JS/HTML that reference Google Fonts are redirected to the local fonts
    if (/^text\/(css|javascript|html)/.test(type) && st.size < 8e6) {
      const txt = fs.readFileSync(file, "utf8");
      if (txt.includes("fonts.g")) {
        const out = Buffer.from(rewriteFonts(txt));
        res.writeHead(200, { "content-type": type, "content-length": out.length, "cache-control": "no-store" });
        return res.end(out);
      }
    }
    const range = req && req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : st.size - 1;
      res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${st.size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { "content-type": type, "content-length": st.size, "accept-ranges": "bytes", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
}
