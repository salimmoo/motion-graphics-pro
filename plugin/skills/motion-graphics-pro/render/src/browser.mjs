// Find a local Chrome/Edge and open a composition in a headless page.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// Own CDP client (src/cdp.mjs): no playwright-core, no npm install.
import { launch as launchCdp } from "./cdp.mjs";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

export function findBrowser(explicit) {
  const cands = [];
  if (explicit) cands.push(explicit);
  if (env("MGP_BROWSER")) cands.push(env("MGP_BROWSER"));
  const pf = process.env["PROGRAMFILES"] || "C:\\Program Files";
  const pf86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  if (process.platform === "win32") {
    cands.push(
      path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(local, "Chromium", "Application", "chrome.exe"),
    );
  } else if (process.platform === "darwin") {
    cands.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    );
  } else {
    cands.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
      "/snap/bin/chromium", "/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable");
  }
  for (const c of cands) if (c && fs.existsSync(c)) return c;
  // browsers downloaded by Playwright
  const pwDirs = [process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.platform === "win32" ? path.join(local, "ms-playwright") : null,
    process.platform === "darwin" ? path.join(os.homedir(), "Library", "Caches", "ms-playwright") : path.join(os.homedir(), ".cache", "ms-playwright")].filter(Boolean);
  for (const d of pwDirs) {
    if (!fs.existsSync(d)) continue;
    for (const sub of fs.readdirSync(d).filter((s) => /^chromium/.test(s)).sort().reverse()) {
      for (const rel of ["chrome-win/chrome.exe", "chrome-win64/chrome.exe", "chrome-linux/chrome", "chrome-linux64/chrome",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-headless-shell-win64/chrome-headless-shell.exe",
        "chrome-headless-shell-linux64/chrome-headless-shell"]) {
        const p = path.join(d, sub, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}

export const CHROME_ARGS = [
  "--allow-file-access-from-files",
  "--autoplay-policy=no-user-gesture-required",
  "--mute-audio",
  "--hide-scrollbars",
  "--force-color-profile=srgb",
  "--font-render-hinting=none",
  "--disable-lcd-text",
  "--disable-gpu-rasterization",
  "--disable-accelerated-2d-canvas",
  "--disable-checker-imaging",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--disable-features=PaintHolding,Translate,MediaRouter",
  "--run-all-compositor-stages-before-draw",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--no-first-run",
  "--no-default-browser-check",
];

export async function launch({ browserPath } = {}) {
  const exe = findBrowser(browserPath);
  if (!exe) throw new Error(L`Chrome/Edge not found. Install Chrome or Edge, or set --browser <path> / MGP_BROWSER.`);
  const extra = env("MGP_ARGS");
  return launchCdp({ executablePath: exe, headless: true, args: [...CHROME_ARGS, ...(extra ? extra.split(/\s+/).filter(Boolean) : [])] });
}

/** Guess the size from the raw HTML (root data-width/height or meta mgp:size, old rekam:size). */
export function guessSize(html) {
  const m = /data-composition-id[^>]*>/i.exec(html);
  if (m) {
    const tag = html.slice(html.lastIndexOf("<", m.index), m.index + m[0].length);
    const w = /data-width=["']?(\d+)/.exec(tag), h = /data-height=["']?(\d+)/.exec(tag);
    if (w && h) return { width: +w[1], height: +h[1] };
  }
  const meta = /<meta[^>]+name=["'](?:mgp|rekam):size["'][^>]+content=["'](\d+)\s*[x×]\s*(\d+)/i.exec(html);
  if (meta) return { width: +meta[1], height: +meta[2] };
  return null;
}

/**
 * Time limits for one page step (P1: a stuck page or a stalled browser used to hang a command forever).
 * --timeout <s> / env MGP_TIMEOUT (seconds) sets both; defaults: ready 300 s, one seek or screenshot 120 s.
 * 0 turns the limit off.
 */
export function stepTimeouts(o = {}) {
  const raw = o.timeout != null && o.timeout !== "" ? o.timeout : env("MGP_TIMEOUT");
  if (raw != null && raw !== "" && Number.isFinite(+raw)) { const ms = Math.max(0, +raw * 1000); return { ready: ms, seek: ms }; }
  return { ready: 300000, seek: 120000 };
}
const timeoutHint = () => "\n" + L`The page did not answer. Either a promise in the composition never resolves (window.__seek, a seek waitUntil, window.__ready, buildReady: check it alone with mgp frame --t <s>), or the browser stalled because other heavy jobs (another render, GPU voice/image) used the CPU/GPU. Every mgp command has its own browser, profile, pipe and port, so running several at once is safe, only slower. Raise the limit with --timeout <s> (or env MGP_TIMEOUT), 0 = no limit.`;
function explain(e, what) {
  if (e && e.mgpTimeout && !e.mgpHint) { e.mgpHint = true; e.message += timeoutHint(); }
  else if (e && e.mgpCrash && !e.mgpHint) { e.mgpHint = true; e.message = L`${what}: ${e.message}. Run again; with several heavy jobs at once, run fewer in parallel.`; }
  return e;
}

/**
 * Open a composition in a new page. Returns { page, cdp, info, logs }.
 * When the real size differs from the guess, the viewport is reset and the page reloaded.
 * Options: { size, scale, transparent, captions, logs, wait, fps, timeout } (old keys tunggu / transparan still read).
 * fps (the render fps when known) and initFps (env MGP_MOTION_INIT_FPS, "0" passes 0) go to ready().
 */
export async function openComp(browser, url, { size, scale = 1, wait, tunggu, transparent, transparan, captions = null, logs = [], fps, timeout } = {}) {
  if (wait == null) wait = tunggu;
  const lim = stepTimeouts({ timeout });
  const initEnv = env("MGP_MOTION_INIT_FPS");
  const initFps = initEnv != null && initEnv !== "" && Number.isFinite(+initEnv) ? +initEnv : undefined;
  const clear = !!(transparent ?? transparan);
  const vp = size || { width: 1080, height: 1920 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push({ type: m.type(), text: m.text() }); });
  page.on("pageerror", (e) => logs.push({ type: "pageerror", text: String(e && e.message || e) }));
  page.on("requestfailed", (r) => logs.push({ type: "requestfailed", text: r.url() + " " + (r.failure() || {}).errorText }));
  page.on("response", (r) => { if (r.status() >= 400) logs.push({ type: "http" + r.status(), text: r.url() }); });

  const load = async () => {
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => !!(window.__mgpRuntime || window.__rekam), null, { timeout: 30000 });
    try { return await page.evaluate((o) => (window.__mgpRuntime || window.__rekam).ready(o), { wait, fps, initFps }, { timeout: lim.ready, what: L`the composition ready step (fonts, media, timelines)` }); }
    catch (e) { throw explain(e, L`ready`); }
  };
  let info = await load();
  const want = { width: info.width || vp.width, height: info.height || vp.height };
  if (!size && (want.width !== vp.width || want.height !== vp.height)) {
    await page.setViewportSize(want);
    info = await load();
  }
  info.width = info.width || want.width;
  info.height = info.height || want.height;
  const cdp = await ctx.newCDPSession(page);
  if (clear) await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  if (captions) await page.evaluate(([w, o]) => (window.__mgpRuntime || window.__rekam).setCaptions(w, o), [captions.words, captions.opt || {}]);
  return { ctx, page, cdp, info, logs, scale, timeouts: lim };
}

/**
 * Seek in the page with the step time limit (curves, audit, check use it too). Returns what fn returns.
 * The runtime reports WebGL contexts that were lost and not restored (a black canvas): that throws.
 */
export async function seekPage(s, t, { timeouts } = {}) {
  const lim = timeouts || s.timeouts || stepTimeouts();
  let r;
  try {
    r = await s.page.evaluate((x) => {
      const R = window.__mgpRuntime || window.__rekam;
      window.__mgpT = window.__rekamT = x;
      return Promise.resolve(R.seek(x)).then(() => (R.health ? R.health() : null));
    }, t, { timeout: lim.seek, what: L`seek to t=${+(+t).toFixed(4)} s` });
  } catch (e) { throw explain(e, L`seek to t=${+(+t).toFixed(4)} s`); }
  if (r && r.lostContexts > 0 && !env("MGP_ALLOW_CONTEXT_LOSS"))
    throw new Error(L`a WebGL canvas lost its context at t=${+(+t).toFixed(4)} s (${r.lostContexts} canvas, not restored): this frame and the next would be black or empty. The GPU process (SwiftShader) usually restarts when other heavy jobs run at the same time. Run again, or run fewer jobs in parallel (env MGP_ALLOW_CONTEXT_LOSS=1 when the composition loses its context on purpose).`);
  return r;
}

/** Seek to t, then take a screenshot. format: png | jpeg. */
export async function capture(s, t, { format = "png", quality = 92 } = {}) {
  const { page, cdp, scale = 1 } = s;
  const lim = s.timeouts || stepTimeouts();
  await seekPage(s, t, { timeouts: lim });
  const vp = page.viewportSize();
  // a separate CDP session does not inherit the page DPR emulation, so the scale goes in the clip
  const clip = { x: 0, y: 0, width: vp.width, height: vp.height, scale };
  let r;
  try {
    r = await page.guard(cdp.send("Page.captureScreenshot", format === "jpeg"
      ? { format: "jpeg", quality, clip, fromSurface: true, captureBeyondViewport: false }
      : { format: "png", clip, fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true }), lim.seek, L`screenshot at t=${+(+t).toFixed(4)} s`);
  } catch (e) { throw explain(e, L`screenshot at t=${+(+t).toFixed(4)} s`); }
  return Buffer.from(r.data, "base64");
}
