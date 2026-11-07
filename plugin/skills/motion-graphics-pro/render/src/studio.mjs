// mgp studio: local visual editor for mgp compositions.
// This server serves the Studio app (render/studio/), draft versions of the composition for the preview,
// saves changes to the source files (with .bak), and runs mgp commands.
// API (old Indonesian route names still answered): /__studio/api/project (proyek), draft (draf), save (simpan),
// run (jalankan), beats (ketukan), job (tugas); output files under /__studio/output/ (keluaran).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveComp } from "./session.mjs";
import { startServer, inject } from "./server.mjs";
import { rewriteFonts } from "./fonts.mjs";
import { L, lang } from "./i18n.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(here, "..", "studio");
const BIN = path.resolve(here, "..", "bin", "mgp.mjs");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".wav": "audio/wav", ".mp3": "audio/mpeg" };
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
/** Studio actions (old Indonesian names accepted). */
const ACTIONS = { check: "check", cek: "check", frame: "frame", contact: "contact", kontak: "contact", render: "render" };

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
function sendStatic(res, file, req) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, L`not found`, "text/plain");
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : st.size - 1;
      res.writeHead(206, { "content-type": type, "content-range": `bytes ${a}-${b}/${st.size}`, "accept-ranges": "bytes", "content-length": b - a + 1 });
      return fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { "content-type": type, "content-length": st.size, "cache-control": "no-store", "accept-ranges": "bytes" });
    fs.createReadStream(file).pipe(res);
  });
}

export async function studio(comp, o = {}) {
  const c = resolveComp(comp, o.root);
  const { withSids } = await import(pathToFileURL(path.join(STUDIO, "lib", "source.js")).href);
  const toUrl = (rel) => "/" + rel.split(path.sep).join("/");
  const entryRel = c.entry;
  const entryDir = path.dirname(path.join(c.root, entryRel));
  // default output folder: studio-output/ next to the composition (an existing old keluaran-studio/ is kept in use)
  const near = path.dirname(c.file);
  const oldOut = path.join(near, "keluaran-studio"), newOut = path.join(near, "studio-output");
  const outDir = path.resolve(o["out-dir"] || (fs.existsSync(oldOut) && !fs.existsSync(newOut) ? oldOut : newOut));
  const name = path.basename(c.file, path.extname(c.file));

  /** files: rel -> { abs, url, text (draft), disk (content on disk), hash (hash on disk) } */
  const files = new Map();
  function addFile(abs) {
    const rel = path.relative(c.root, abs);
    if (rel.startsWith("..") || files.has(rel) || !fs.existsSync(abs)) return;
    const disk = fs.readFileSync(abs, "utf8");
    files.set(rel, { rel, abs, url: toUrl(rel), text: disk, disk, hash: hash(disk) });
  }
  function discover() {
    addFile(c.file);
    // sub-compositions: the runtime fetches them relative to the document URL (entry folder)
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of [...files.values()]) {
        for (const m of f.text.matchAll(/data-composition-src\s*=\s*["']([^"']+)["']/gi)) {
          if (/^[a-z]+:/i.test(m[1])) continue;
          const abs = path.resolve(m[1].startsWith("/") ? c.root : entryDir, m[1].replace(/^\//, ""));
          if (!files.has(path.relative(c.root, abs)) && fs.existsSync(abs)) { addFile(abs); grew = true; }
        }
      }
    }
  }
  discover();
  const list = () => [...files.values()];
  const indexOf = (rel) => list().findIndex((f) => f.rel === rel);

  // ------------------------------------------------------------ mgp jobs
  const jobs = new Map();
  let jobSeq = 0;
  function runJob(act, p) {
    const action = ACTIONS[act];
    if (!action) throw new Error(L`unknown action: ${act}`);
    fs.mkdirSync(outDir, { recursive: true });
    const args = [BIN];
    let out = null;
    const fps = p.fps ? ["--fps", String(p.fps)] : [];
    const size = p.size ? ["--size", String(p.size)] : [];
    if (action === "check") args.push("check", c.file, "--json");
    else if (action === "frame") {
      const t = Math.max(0, +p.t || 0);
      out = path.join(outDir, `${name}-t${t.toFixed(3).replace(".", "_")}.png`);
      args.push("frame", c.file, "--t", String(t), "-o", out, ...size);
    } else if (action === "contact") {
      out = path.join(outDir, `${name}-contact.png`);
      args.push("contact", c.file, "--n", String(p.n || 12), "-o", out, ...fps);
    } else if (action === "render") {
      out = path.join(outDir, `${name}.${p.format === "webm" ? "webm" : p.format === "mov" ? "mov" : "mp4"}`);
      args.push("render", c.file, "-o", out, ...fps, ...size);
      if (p.workers) args.push("--workers", String(p.workers));
    }
    if (o.browser) args.push("--browser", o.browser);
    const id = String(++jobSeq);
    const job = { id, action, status: "running", log: "", stdout: "", out: out && path.basename(out), started: Date.now(), code: null };
    jobs.set(id, job);
    const ch = spawn(process.execPath, args, { cwd: path.dirname(c.file), env: process.env });
    ch.stdout.on("data", (d) => { job.stdout += d; });
    ch.stderr.on("data", (d) => { job.log += d; if (job.log.length > 200000) job.log = job.log.slice(-100000); });
    ch.on("error", (e) => { job.status = "failed"; job.log += "\n" + e.message; });
    ch.on("close", (code) => {
      job.code = code; job.finished = Date.now();
      if (action === "check") { try { job.result = JSON.parse(job.stdout); } catch { /* leave it */ } job.status = job.result ? "done" : "failed"; }
      else job.status = code === 0 ? "done" : "failed";
    });
    return job;
  }

  // ------------------------------------------------------------ routes
  const api = {
    "/__studio/api/project": (req, res) => send(res, 200, {
      name: path.basename(c.file), root: c.root, entry: toUrl(entryRel), outDir, lang: lang(),
      files: list().map((f) => ({ rel: f.rel.split(path.sep).join("/"), url: f.url, text: f.text, disk: f.disk, hash: f.hash, abs: f.abs })),
      loader: fs.readFileSync(path.join(STUDIO, "loader.js"), "utf8"),
    }),
    "/__studio/api/draft": async (req, res) => {
      const b = await readBody(req);
      for (const [rel, text] of Object.entries(b.files || {})) { const f = files.get(rel.split("/").join(path.sep)); if (f) f.text = text; }
      discover();
      send(res, 200, { ok: true, files: list().map((f) => f.rel.split(path.sep).join("/")) });
    },
    "/__studio/api/save": async (req, res) => {
      const b = await readBody(req);
      const force = b.force ?? b.paksa;
      const saved = {};
      for (const [relp, text] of Object.entries(b.files || {})) {
        const f = files.get(relp.split("/").join(path.sep));
        if (!f) continue;
        const now = fs.readFileSync(f.abs, "utf8");
        if (!force && b.base && b.base[relp] && hash(now) !== b.base[relp]) {
          return send(res, 409, { ok: false, error: "conflict", rel: relp, message: L`The file changed on disk since it was opened: ${relp}` });
        }
        if (now !== text) {
          fs.writeFileSync(f.abs + ".bak", now);
          fs.writeFileSync(f.abs, text);
        }
        f.disk = text; f.text = text; f.hash = hash(text);
        saved[relp] = f.hash;
      }
      send(res, 200, { ok: true, hash: saved });
    },
    "/__studio/api/run": async (req, res) => {
      const b = await readBody(req);
      try { const j = runJob(b.action ?? b.aksi, b); send(res, 200, { id: j.id }); } catch (e) { send(res, 400, { error: e.message }); }
    },
    // HyperFrames beat grid (beats/<audio>.json) when present; always 200 so the console stays clean
    "/__studio/api/beats": (req, res, url) => {
      const src = url.searchParams.get("src") || "";
      const f = path.resolve(entryDir, "beats", src + ".json");
      if (!f.startsWith(c.root) || !fs.existsSync(f)) return send(res, 200, { beatTimes: null });
      try { const j = JSON.parse(fs.readFileSync(f, "utf8")); send(res, 200, { beatTimes: j.beatTimes || j.beats || null, bpm: j.bpm || null }); }
      catch { send(res, 200, { beatTimes: null }); }
    },
    "/__studio/api/job": (req, res, url) => {
      const j = jobs.get(url.searchParams.get("id"));
      if (!j) return send(res, 404, { error: L`no such job` });
      send(res, 200, { ...j, log: j.log.slice(-6000) });
    },
  };
  // old route names (v2.3 / v2.4-dev Studio pages)
  for (const [oldR, newR] of [["proyek", "project"], ["draf", "draft"], ["simpan", "save"], ["jalankan", "run"], ["ketukan", "beats"], ["tugas", "job"]]) api["/__studio/api/" + oldR] = api["/__studio/api/" + newR];
  function route(p) {
    if (typeof p !== "string") return undefined;
    if (p === "/") return (req, res) => sendStatic(res, path.join(STUDIO, "index.html"), req);
    if (api[p]) return (req, res, url) => Promise.resolve(api[p](req, res, url)).catch((e) => send(res, 500, { error: e.message }));
    if (p.startsWith("/__studio/app/")) {
      const f = path.resolve(STUDIO, p.slice("/__studio/app/".length));
      if (!f.startsWith(STUDIO)) return (req, res) => send(res, 403, "", "text/plain");
      return (req, res) => sendStatic(res, f, req);
    }
    if (p.startsWith("/__studio/output/") || p.startsWith("/__studio/keluaran/")) {
      const f = path.resolve(outDir, path.basename(p));
      return (req, res) => sendStatic(res, f, req);
    }
    const f = list().find((x) => x.url === p);
    if (f) {
      return (req, res, url) => {
        const idx = indexOf(f.rel);
        const raw = url.searchParams.has("raw") || url.searchParams.has("asli");
        let html = raw ? f.text : withSids(f.text, String(idx));
        if (!raw) html = rewriteFonts(html); // Google Fonts -> local fonts (sub-compositions too)
        if (f.rel === entryRel) {
          html = inject(html);
          // report preview page errors to the Studio error panel (old hook name __studioGalat still tried)
          const report = "<script>(function(){function k(m){try{var h=parent.__studioError||parent.__studioGalat;h&&h(String(m))}catch(_){}}" +
            "addEventListener('error',function(e){k(e.message||e)});addEventListener('unhandledrejection',function(e){k(e.reason&&e.reason.message||e.reason)});})();</script>";
          html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + report) : report + html;
        }
        send(res, 200, html, "text/html; charset=utf-8");
      };
    }
    return undefined;
  }
  const extra = new Proxy({}, { get: (_, p) => route(p) });

  const port = +(o.port || 4700);
  const srv = await startServer({ root: c.root, entry: entryRel, port, extra }).catch((e) => {
    if (e.code !== "EADDRINUSE") throw e;
    return startServer({ root: c.root, entry: entryRel, port: 0, extra });
  });
  const url = srv.base + "/";
  process.stderr.write(L`mgp studio: ${url}` + "\n  " + L`composition: ${c.file}` + "\n  " + L`output: ${outDir}` + "\n  " + L`Ctrl+C to stop.` + "\n");
  if (o.open) {
    const cmd = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).unref();
  }
  return { ...srv, url };
}
