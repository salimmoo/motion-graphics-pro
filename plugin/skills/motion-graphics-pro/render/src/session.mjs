// Work session: server + browser + composition page, plus shared helpers.
import fs from "node:fs";
import path from "node:path";
import { startServer, gsapAsliDir } from "./server.mjs";
import { launch, openComp, guessSize } from "./browser.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

export function parseSize(s) {
  if (!s) return null;
  const m = /^(\d+)\s*[x×:]\s*(\d+)$/.exec(String(s).trim());
  if (!m) throw new Error(L`size must look like 1080x1920, not ${s}`);
  return { width: +m[1], height: +m[2] };
}

/** Split a composition path into the project root + relative entry. */
export function resolveComp(comp, rootOpt) {
  if (!comp) throw new Error(L`name a composition file, e.g. \`mgp render index.html\`.`);
  let file = path.resolve(comp);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) throw new Error(L`file not found: ${file}`);
  const html = fs.readFileSync(file, "utf8");
  // without --root: go up as many "../" as the deepest one the HTML refers to (e.g. src="../core/x.js")
  let up = 0;
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']((?:\.\.\/)+)/gi)) up = Math.max(up, m[1].length / 3);
  let auto = path.dirname(file);
  for (let i = 0; i < up; i++) auto = path.dirname(auto);
  const root = path.resolve(rootOpt || auto);
  const entry = path.relative(root, file);
  if (entry.startsWith("..")) throw new Error(L`--root must contain the composition file.`);
  return { file, root, entry, html };
}

export function loadCaptions(file, opt = {}) {
  if (!file) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const arr = Array.isArray(j) ? j : j.words || j.kata || (j.segments || []).flatMap((s) => s.words || []);
  const words = arr.map((w) => ({ text: String(w.text ?? w.word ?? w.kata ?? "").trim(), start: +(w.start ?? w.mulai), end: +(w.end ?? w.akhir) }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
  if (!words.length) throw new Error(L`the captions file has no timed words: ${file}`);
  return { words, opt };
}

/**
 * Collect variable values from the CLI. Order (later wins):
 * --vars file.json (alias --variables-file), --variables '<json>', then every --var key=value.
 */
export function parseVars(o = {}) {
  const out = {};
  const file = o.vars || o["variables-file"];
  if (file) {
    let j;
    try { j = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { throw new Error(L`--vars: cannot read JSON ${file}: ${e.message}`); }
    if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error(L`--vars must hold one JSON object {key: value}`);
    Object.assign(out, j);
  }
  if (o.variables) {
    let j;
    try { j = JSON.parse(o.variables); } catch (e) { throw new Error(L`--variables is not valid JSON (in PowerShell, write it to a file and use --vars file.json)`); }
    Object.assign(out, j);
  }
  for (const kv of [].concat(o.var || [])) {
    const i = String(kv).indexOf("=");
    if (i < 1) throw new Error(L`--var must look like key=value, not "${kv}"`);
    out[kv.slice(0, i).trim()] = kv.slice(i + 1);
  }
  return out;
}

/** Check the variable report from the page; --strict-variables turns problems into errors. */
export function checkVars(info, o = {}, say = () => {}) {
  const rep = info.variables;
  if (!rep) return;
  const ketat = o["strict-variables"];
  const issues = rep.issues || [];
  if (ketat && issues.length) throw new Error(L`variables do not match their declaration (--strict-variables):` + "\n  " + issues.map((x) => x.msg).join("\n  "));
  for (const x of issues) say("  " + L`variable warning: ${x.msg}`);
}

export async function openSession(comp, o = {}) {
  const c = resolveComp(comp, o.root);
  // --native-gsap: never fall back to mgp.motion silently when the gsap package is not installed (B6)
  const asli = !!(o["native-gsap"] || env("MGP_NATIVE_GSAP"));
  if (asli && !gsapAsliDir()) throw new Error(L`--native-gsap: the gsap package is not installed, so the page would keep using mgp.motion. Install it yourself first: cd motion-graphics-pro/render && npm install gsap (GSAP licence by its makers), or run without --native-gsap.`);
  const srv = await startServer({ root: c.root, entry: c.entry, vars: parseVars(o) });
  const url = srv.base + srv.entryUrl;
  const size = parseSize(o.viewport) || guessSize(c.html) || null;
  let browser;
  try { browser = await launch({ browserPath: o.browser }); }
  catch (e) { await srv.close(); throw e; }
  const logs = [];
  const extraBrowsers = [];
  // extra.fresh: open in a separate browser process (parallel workers do not share one compositor)
  const open = async (extra = {}) => {
    let b = browser;
    if (extra.fresh || extra.baru) { b = await launch({ browserPath: o.browser }); extraBrowsers.push(b); }
    const s = await openComp(b, url, { size, scale: o.scale || 1, transparent: o.transparent, captions: o.captionsData || o.captionsLoaded, logs: extra.logs || logs, wait: o.wait, fps: o.fps ? +o.fps : undefined, timeout: o.timeout });
    if (asli && s.info.engine && /^(motion|gerak)/.test(s.info.engine))
      throw new Error(L`--native-gsap: the page still uses mgp.motion (${s.info.engine}): the composition loads motion.js/gerak.js itself through <script src>, not gsap. For a comparison, make a copy that loads gsap.min.js.`);
    return s;
  };
  const close = async () => {
    for (const b of [browser, ...extraBrowsers]) { try { await b.close(); } catch { /* ignore */ } }
    await srv.close();
  };
  return { c, srv, url, browser, open, close, logs, size };
}

/** Complete the page info with CLI options (duration/fps). */
export function resolveTiming(info, o) {
  const fps = +(o.fps || info.fps || 30);
  let duration = o.duration != null ? +o.duration : info.duration;
  if (!(duration > 0)) throw new Error(L`cannot read the composition duration. Set window.__duration, data-duration on the root, or --duration <seconds>.`);
  const from = o.from != null ? Math.max(0, +o.from) : 0;
  const to = o.to != null ? Math.min(+o.to, duration) : duration;
  if (!(to > from)) throw new Error(L`empty range: --from ${from} --to ${to}`);
  const frames = Math.round((to - from) * fps);
  return { fps, duration, from, to, frames };
}

/** Map a page media URL to a local file. */
export function mediaToFile(src, srv, root) {
  try {
    const u = new URL(src);
    if (u.origin === srv.base) return path.join(root, decodeURIComponent(u.pathname));
    if (u.protocol === "file:") return decodeURIComponent(u.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  } catch { /* ignore */ }
  return null;
}

export const fmtT = (s) => {
  const m = Math.floor(s / 60), r = s - m * 60;
  return (m ? m + ":" : "") + (m ? r.toFixed(2).padStart(5, "0") : r.toFixed(2)) + " s";
};

/** Old name (v2.3 / v2.4-dev tools). */
export const bukaSesi = openSession;
