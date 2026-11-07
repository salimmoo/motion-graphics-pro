// mgp's own Chrome DevTools Protocol client: no npm dependencies.
// Launches headless Chrome/Edge, talks over a pipe (--remote-debugging-pipe, the default)
// or a WebSocket (--remote-debugging-port=0, Node 22+ built-in WebSocket), and provides
// small Playwright-style wrappers (Browser, Context, Page) limited to what mgp uses.
//
//   const b = await launch({ executablePath, args });
//   const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
//   const page = await ctx.newPage();
//   await page.goto(url, { waitUntil: "load" });
//   const v = await page.evaluate((x) => x * 2, 21);
//   const cdp = await ctx.newCDPSession(page);    // a second CDP session to the same target
//   await cdp.send("Page.captureScreenshot", { format: "png" });
//   await b.close();
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { env } from "./names.mjs";
import { L } from "./i18n.mjs";

// ------------------------------------------------------------------ transport

/** CDP pipe: JSON messages terminated by a NUL byte. Chrome reads fd 3 and writes fd 4. */
class PipeTransport {
  constructor(toChrome, fromChrome) {
    this._out = toChrome;
    this._parts = [];
    this.onmessage = null;
    this.onclose = null;
    fromChrome.on("data", (buf) => {
      let start = 0;
      for (let i = buf.indexOf(0); i !== -1; i = buf.indexOf(0, start)) {
        this._parts.push(buf.subarray(start, i));
        const msg = Buffer.concat(this._parts).toString("utf8");
        this._parts = [];
        start = i + 1;
        if (this.onmessage) this.onmessage(msg);
      }
      if (start < buf.length) this._parts.push(buf.subarray(start));
    });
    fromChrome.on("close", () => this.onclose && this.onclose());
    fromChrome.on("error", () => { /* handled through close */ });
    toChrome.on("error", () => { /* browser already gone */ });
  }
  send(s) { this._out.write(s); this._out.write("\0"); }
  close() { try { this._out.end(); } catch { /* ignore */ } }
}

/** Error for a closed session/connection (callers test e.cdpClosed, not the message text). */
function closedError(msg) { const e = new Error(msg); e.cdpClosed = true; return e; }

class WebSocketTransport {
  static open(url) {
    if (typeof WebSocket !== "function") throw new Error(L`no global WebSocket (needs Node 22+). Use pipe mode (the default).`);
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resolve(new WebSocketTransport(ws)), { once: true });
      ws.addEventListener("error", (e) => reject(new Error(L`cannot connect to ${url}: ${e.message || L`WebSocket error`}`)), { once: true });
    });
  }
  constructor(ws) {
    this._ws = ws;
    this.onmessage = null;
    this.onclose = null;
    ws.addEventListener("message", (e) => this.onmessage && this.onmessage(typeof e.data === "string" ? e.data : Buffer.from(e.data).toString("utf8")));
    ws.addEventListener("close", () => this.onclose && this.onclose());
  }
  send(s) { this._ws.send(s); }
  close() { try { this._ws.close(); } catch { /* ignore */ } }
}

// ------------------------------------------------------------------ connection and sessions

export class CDPSession extends EventEmitter {
  constructor(conn, sessionId, targetId) {
    super();
    this._conn = conn;
    this.id = sessionId;
    this.targetId = targetId;
    this.closed = false;
  }
  send(method, params = {}) {
    if (this.closed) return Promise.reject(closedError(L`${method}: CDP session already closed`));
    return this._conn._send(method, params, this.id);
  }
  async detach() {
    if (this.closed) return;
    try { await this._conn.send("Target.detachFromTarget", { sessionId: this.id }); } catch { /* ignore */ }
  }
}

export class Connection extends EventEmitter {
  constructor(transport) {
    super();
    this._t = transport;
    this._id = 0;
    this._wait = new Map();
    this.sessions = new Map();
    this.closed = false;
    transport.onmessage = (s) => this._onMessage(s);
    transport.onclose = () => this._onClose();
  }
  send(method, params = {}) { return this._send(method, params, undefined); }
  _send(method, params, sessionId) {
    if (this.closed) return Promise.reject(closedError(L`${method}: browser connection already closed`));
    const id = ++this._id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    const err = new Error(); // keep the caller's stack
    return new Promise((resolve, reject) => {
      this._wait.set(id, { resolve, reject, method, err });
      this._t.send(JSON.stringify(msg));
    });
  }
  _onMessage(s) {
    let m;
    try { m = JSON.parse(s); } catch { return; }
    if (m.id) {
      const w = this._wait.get(m.id);
      if (!w) return;
      this._wait.delete(m.id);
      if (m.error) {
        w.err.message = `${w.method}: ${m.error.message}${m.error.data ? " (" + m.error.data + ")" : ""}`;
        w.reject(w.err);
      } else w.resolve(m.result);
      return;
    }
    if (m.method === "Target.attachedToTarget") {
      const { sessionId, targetInfo } = m.params;
      if (!this.sessions.has(sessionId)) this.sessions.set(sessionId, new CDPSession(this, sessionId, targetInfo.targetId));
    } else if (m.method === "Target.detachedFromTarget") {
      const ses = this.sessions.get(m.params.sessionId);
      if (ses) { ses.closed = true; this.sessions.delete(m.params.sessionId); ses.emit("detached"); }
    }
    if (m.sessionId) {
      const ses = this.sessions.get(m.sessionId);
      if (ses) ses.emit(m.method, m.params);
    } else this.emit(m.method, m.params);
  }
  _onClose() {
    if (this.closed) return;
    this.closed = true;
    for (const w of this._wait.values()) { w.err.message = L`${w.method}: browser connection closed`; w.err.cdpClosed = true; w.reject(w.err); }
    this._wait.clear();
    for (const s of this.sessions.values()) { s.closed = true; s.emit("detached"); }
    this.sessions.clear();
    this.emit("disconnected");
  }
  /** Attach to a target with a flat session and return its CDPSession. */
  async attach(targetId) {
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true });
    let s = this.sessions.get(sessionId);
    if (!s) { s = new CDPSession(this, sessionId, targetId); this.sessions.set(sessionId, s); }
    return s;
  }
  close() { this._t.close(); }
}

// ------------------------------------------------------------------ browser launch

/**
 * Base switches Playwright also uses for Chromium (so behaviour and pixels match the
 * older mgp renders). mgp adds its own CHROME_ARGS in browser.mjs.
 */
export const BASE_SWITCHES = [
  "--disable-field-trial-config",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-back-forward-cache",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-extensions-with-background-pages",
  "--disable-component-update",
  "--no-default-browser-check",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-edgeupdater",
  "--disable-extensions",
  "--enable-features=CDPScreenshotNewSurface",
  "--allow-pre-commit-input",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-popup-blocking",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-updater-scheduler",
  "--force-color-profile=srgb",
  "--metrics-recording-only",
  "--no-first-run",
  "--password-store=basic",
  "--use-mock-keychain",
  "--no-service-autorun",
  "--disable-search-engine-choice-screen",
  "--unsafely-disable-devtools-self-xss-warnings",
  "--edge-skip-compat-layer-relaunch",
  "--disable-infobars",
  "--disable-sync",
];
export const BASE_DISABLED_FEATURES = [
  "AvoidUnnecessaryBeforeUnloadCheckSync", "DestroyProfileOnBrowserClose", "DialMediaRouteProvider", "GlobalMediaControls",
  "HttpsUpgrades", "LensOverlay", "MediaRouter", "PaintHolding", "ThirdPartyStoragePartitioning",
  "BlockOriginHeaderModificationOnRedirect", "AvoidCorsURLLoaderRestartOnRedirect", "Translate", "AutoDeElevate",
  "OptimizationHints", "NetworkTimeServiceQuerying", "AimEnabled", "msForceBrowserSignIn", "msEdgeUpdateLaunchServicesPreferredVersion",
];
const HEADLESS_SWITCHES = ["--headless", "--hide-scrollbars", "--mute-audio",
  "--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"];

/** Merge every --disable-features / --enable-features into one (Chrome only uses the last one). */
export function mergeArgs(list) {
  const feat = { "--disable-features": new Set(), "--enable-features": new Set() };
  const out = [];
  const seen = new Set();
  for (const a of list.filter(Boolean)) {
    const i = a.indexOf("=");
    const k = i > 0 ? a.slice(0, i) : a;
    if (feat[k]) { for (const f of a.slice(i + 1).split(",")) if (f) feat[k].add(f); continue; }
    if (seen.has(a)) continue;
    seen.add(a);
    out.push(a);
  }
  for (const [k, s] of Object.entries(feat)) if (s.size) out.push(k + "=" + [...s].join(","));
  return out;
}

function rmrf(dir) {
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(dir, { recursive: true, force: true }); return; }
    catch { const until = Date.now() + 100; while (Date.now() < until) { /* wait for the files to be released (Windows) */ } }
  }
}

// ------------------------------------------------------------------ concurrent runs: no orphan browsers
// Every mgp process gets its own browser process, profile (mkdtemp), CDP pipe and server port (port 0), so
// parallel commands share no port or folder. What went wrong was cleanup: Ctrl+C or a kill signal skipped the
// "exit" handler, so the browser (and its mgp-profile-* folder) stayed behind. The live browsers are kept
// here; a signal kills them, removes their profiles, then exits with the usual 128 + signal code.
const LIVE = new Set();
const SIGNALS = { SIGINT: 2, SIGTERM: 15, SIGHUP: 1, SIGBREAK: 21 };
let signalsOn = false;
function onSignal(sig) {
  for (const b of LIVE) { try { b.killer(); } catch { /* ignore */ } }
  for (const b of LIVE) rmrf(b.profile);
  LIVE.clear();
  process.exit(128 + (SIGNALS[sig] || 1));
}
function watchSignals() {
  if (signalsOn) return;
  signalsOn = true;
  for (const s of Object.keys(SIGNALS)) { try { process.on(s, onSignal); } catch { /* signal not supported here */ } }
}
function unwatchSignals() {
  if (!signalsOn || LIVE.size) return;
  signalsOn = false;
  for (const s of Object.keys(SIGNALS)) { try { process.removeListener(s, onSignal); } catch { /* ignore */ } }
}
/** Live mgp browsers of this process (for tests and diagnostics). */
export const liveBrowsers = () => LIVE.size;
/** Profiles left by browsers killed hard (taskkill /F, power loss): removed after 6 h, never one in use. */
function sweepProfiles() {
  try {
    const dir = os.tmpdir(), now = Date.now();
    let n = 0;
    for (const e of fs.readdirSync(dir)) {
      if (!e.startsWith("mgp-profile-") || ++n > 200) continue;
      const p = path.join(dir, e);
      try {
        if (now - fs.statSync(p).mtimeMs < 6 * 3600e3) continue;
        // Chrome holds "lockfile" (Windows, cannot be deleted while open) / SingletonLock (POSIX) while in use
        if (fs.existsSync(path.join(p, "SingletonLock"))) continue;
        const lock = path.join(p, "lockfile");
        if (fs.existsSync(lock)) { try { fs.rmSync(lock); } catch { continue; } }
        fs.rmSync(p, { recursive: true, force: true });
      } catch { /* in use or already gone */ }
    }
  } catch { /* ignore */ }
}
let swept = false;

/**
 * Launch the browser and connect CDP.
 * options: executablePath, args (extra), headless (true), transport "pipe" | "port"
 *          (default: env MGP_CDP, then "pipe"), timeout (ms, 30000), env.
 */
export async function launch(o = {}) {
  const exe = o.executablePath;
  if (!exe) throw new Error(L`executablePath is required`);
  const mode = o.transport || env("MGP_CDP") || "pipe";
  if (!swept) { swept = true; sweepProfiles(); }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "mgp-profile-"));
  const args = mergeArgs([
    ...BASE_SWITCHES,
    "--disable-features=" + BASE_DISABLED_FEATURES.join(","),
    ...(o.headless === false ? [] : HEADLESS_SWITCHES),
    ...(env("MGP_NO_SANDBOX") || (process.getuid && process.getuid() === 0) ? ["--no-sandbox"] : []),
    ...(o.args || []),
    "--user-data-dir=" + profile,
    mode === "port" ? "--remote-debugging-port=0" : "--remote-debugging-pipe",
    "about:blank",
  ]);
  const stdio = mode === "port" ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe", "pipe", "pipe"];
  const proc = spawn(exe, args, { stdio, windowsHide: true, env: o.env || process.env, detached: process.platform !== "win32" });
  let stderr = "";
  const keep = (d) => { stderr = (stderr + d).slice(-8000); };
  proc.stdout.on("data", keep);
  proc.stderr.on("data", keep);
  const killer = () => { try { proc.kill("SIGKILL"); } catch { /* ignore */ } };
  process.once("exit", killer);
  const live = { killer, profile };
  LIVE.add(live);
  watchSignals();
  const fail = (msg) => {
    killer(); process.removeListener("exit", killer); LIVE.delete(live); unwatchSignals(); rmrf(profile);
    return new Error(msg + (stderr.trim() ? "\n--- " + L`browser output` + " ---\n" + stderr.trim().split("\n").slice(-15).join("\n") : ""));
  };
  const timeout = o.timeout || 30000;
  const exited = new Promise((r) => proc.once("exit", (code, sig) => r({ code, sig })));
  const spawnErr = new Promise((_, rej) => proc.once("error", (e) => rej(fail(L`cannot start ${exe}: ${e.message}`))));

  let transport;
  if (mode === "port") {
    // DevToolsActivePort holds "<port>\n<browser ws path>"; stderr also prints "DevTools listening on ws://..."
    const ws = await Promise.race([spawnErr, (async () => {
      const t0 = Date.now();
      const file = path.join(profile, "DevToolsActivePort");
      while (Date.now() - t0 < timeout) {
        if (proc.exitCode != null) throw fail(L`browser exited before CDP was ready (code ${proc.exitCode})`);
        const m = /DevTools listening on (ws:\/\/\S+)/.exec(stderr);
        if (m) return m[1];
        if (fs.existsSync(file)) {
          const [port, p] = fs.readFileSync(file, "utf8").split(/\r?\n/);
          if (port && p) return `ws://127.0.0.1:${port}${p}`;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      throw fail(L`browser did not open the DevTools port within ${timeout / 1000} s`);
    })()]);
    transport = await WebSocketTransport.open(ws);
  } else {
    transport = new PipeTransport(proc.stdio[3], proc.stdio[4]);
  }
  const conn = new Connection(transport);
  // wait until CDP really answers
  let tm;
  try {
    await Promise.race([spawnErr, conn.send("Browser.getVersion").then((v) => { conn.version = v; }),
      exited.then(({ code }) => { if (!conn.version) throw fail(L`browser exited before CDP was ready (code ${code})`); }),
      new Promise((_, rej) => { tm = setTimeout(() => rej(fail(L`browser did not answer CDP within ${timeout / 1000} s`)), timeout); })]);
  } catch (e) { conn.close(); throw e; } finally { clearTimeout(tm); }
  spawnErr.catch(() => {});
  return new Browser(conn, proc, { exe, profile, killer, exited, args, live });
}

/** A pause that does not keep the Node process alive. */
const jeda = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms).unref());

// ------------------------------------------------------------------ Playwright-style wrappers

export class Browser extends EventEmitter {
  constructor(conn, proc, meta) {
    super();
    this._conn = conn;
    this._proc = proc;
    this._meta = meta;
    this.__exe = meta.exe;
    this.args = meta.args;
    this._contexts = new Set();
    this._closed = false;
    conn.on("disconnected", () => this.emit("disconnected"));
  }
  get connection() { return this._conn; }
  version() { return this._conn.version ? this._conn.version.product : ""; }
  /** Send a browser-level CDP command. */
  send(method, params) { return this._conn.send(method, params); }

  async newContext(opts = {}) {
    const { browserContextId } = await this._conn.send("Target.createBrowserContext", { disposeOnDetach: true });
    const ctx = new BrowserContext(this, browserContextId, opts);
    this._contexts.add(ctx);
    return ctx;
  }
  /** A page in its own new context; page.close() also closes the context. */
  async newPage(opts = {}) {
    const ctx = await this.newContext(opts);
    const page = await ctx.newPage();
    page._ownsContext = true;
    return page;
  }
  async close() {
    if (this._closed) return;
    this._closed = true;
    const { killer, exited, profile } = this._meta;
    if (!this._conn.closed) {
      await Promise.race([this._conn.send("Browser.close").catch(() => {}), jeda(3000)]);
    }
    this._conn.close();
    const done = await Promise.race([exited.then(() => true), jeda(5000, false)]);
    if (!done) { killer(); await Promise.race([exited, jeda(2000)]); }
    process.removeListener("exit", killer);
    // Chrome child processes may still hold the pipe ends; release them so Node can exit
    for (const st of this._proc.stdio) { try { st && st.destroy(); } catch { /* ignore */ } }
    rmrf(profile);
    if (this._meta.live) { LIVE.delete(this._meta.live); unwatchSignals(); }
  }
}

export class BrowserContext {
  constructor(browser, id, opts) {
    this._browser = browser;
    this.id = id;
    this._opts = opts;
    this._pages = new Set();
    this._closed = false;
  }
  async newPage() {
    const conn = this._browser._conn;
    const { targetId } = await conn.send("Target.createTarget", { url: "about:blank", browserContextId: this.id });
    const ses = await conn.attach(targetId);
    const page = new Page(this, ses, targetId, this._opts);
    await page._init();
    this._pages.add(page);
    return page;
  }
  /** An extra CDP session to the page target (does not inherit the page session emulation). */
  async newCDPSession(page) { return this._browser._conn.attach(page._targetId); }
  async close() {
    if (this._closed) return;
    this._closed = true;
    for (const p of this._pages) await p.close({ fromContext: true }).catch(() => {});
    await this._browser._conn.send("Target.disposeBrowserContext", { browserContextId: this.id }).catch(() => {});
    this._browser._contexts.delete(this);
  }
}

const remoteText = (a) => {
  if (!a) return "";
  if ("value" in a) return typeof a.value === "string" ? a.value : JSON.stringify(a.value);
  if (a.unserializableValue) return a.unserializableValue;
  return a.description || a.type || "";
};

function errorFrom(d) {
  const ex = d.exception;
  if (ex && ex.description) {
    const first = ex.description.split("\n")[0];
    const m = /^(?:[A-Z]\w*(?:Error|Exception)|Error): ([\s\S]*)$/.exec(first);
    const e = new Error(m ? m[1] : first);
    e.stack = ex.description;
    return e;
  }
  if (ex && "value" in ex) return new Error(typeof ex.value === "string" ? ex.value : JSON.stringify(ex.value));
  return new Error(d.text || L`script error`);
}

export class Page extends EventEmitter {
  constructor(ctx, ses, targetId, opts) {
    super();
    this._ctx = ctx;
    this._ses = ses;
    this._targetId = targetId;
    this._viewport = opts.viewport || { width: 1280, height: 720 };
    this._dpr = opts.deviceScaleFactor || 1;
    this._network = opts.network !== false;
    this._requests = new Map();
    this._mainFrame = null;
    this._closed = false;
    this._crash = null;
    this._crashWaiters = new Set();
    this.mouse = {
      move: (x, y) => this._ses.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }),
      click: async (x, y, o = {}) => {
        const b = o.button || "left";
        await this._ses.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await this._ses.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: b, clickCount: 1 });
        await this._ses.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: b, clickCount: 1 });
      },
      wheel: (dx, dy, x = 1, y = 1) => this._ses.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: dx, deltaY: dy }),
    };
    this.keyboard = {
      type: (text) => this._ses.send("Input.insertText", { text }),
      press: async (key) => {
        const KEYS = { Enter: [13, "\r"], Tab: [9, "\t"], Escape: [27, ""], Backspace: [8, ""], Delete: [46, ""], Space: [32, " "], " ": [32, " "],
          ArrowLeft: [37, ""], ArrowUp: [38, ""], ArrowRight: [39, ""], ArrowDown: [40, ""], Home: [36, ""], End: [35, ""] };
        const [code, text] = KEYS[key] || [key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0, key.length === 1 ? key : ""];
        const base = { key: key === "Space" ? " " : key, code: key.length === 1 ? (/[a-z]/i.test(key) ? "Key" + key.toUpperCase() : /\d/.test(key) ? "Digit" + key : key) : key, windowsVirtualKeyCode: code };
        await this._ses.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", text: text || undefined, ...base });
        await this._ses.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
      },
    };
  }
  get session() { return this._ses; }
  async _init() {
    const s = this._ses;
    s.on("Runtime.consoleAPICalled", (p) => {
      const text = (p.args || []).map(remoteText).join(" ");
      this.emit("console", { type: () => p.type, text: () => text, args: () => p.args });
    });
    s.on("Log.entryAdded", ({ entry }) => {
      if (entry.source === "worker") return;
      const type = entry.level === "verbose" ? "debug" : entry.level;
      this.emit("console", { type: () => type, text: () => entry.text, url: () => entry.url });
    });
    s.on("Runtime.exceptionThrown", (p) => this.emit("pageerror", errorFrom(p.exceptionDetails)));
    s.on("Network.requestWillBeSent", (p) => { this._requests.set(p.requestId, p.request.url); this.emit("request", { url: () => p.request.url, method: () => p.request.method }); });
    s.on("Network.responseReceived", (p) => {
      const r = p.response;
      this.emit("response", { url: () => r.url, status: () => r.status, headers: () => r.headers, fromCache: () => !!r.fromDiskCache });
    });
    s.on("Network.loadingFinished", (p) => this._requests.delete(p.requestId));
    s.on("Network.loadingFailed", (p) => {
      const url = this._requests.get(p.requestId) || "";
      this._requests.delete(p.requestId);
      this.emit("requestfailed", { url: () => url, failure: () => ({ errorText: p.errorText + (p.blockedReason ? " (" + p.blockedReason + ")" : "") }), canceled: () => !!p.canceled });
    });
    s.on("Page.frameNavigated", (p) => { if (!p.frame.parentId) this._mainFrame = p.frame.id; });
    s.on("detached", () => { this._closed = true; this.emit("close"); });
    // a crashed renderer answers no pending command: without this, evaluate/screenshot waited forever
    s.on("Inspector.targetCrashed", () => {
      const e = new Error(L`the page renderer crashed (out of memory, or its renderer/GPU process was killed while other heavy jobs ran)`);
      e.mgpCrash = true;
      this._crash = e;
      for (const w of this._crashWaiters) w(e);
      this._crashWaiters.clear();
      this.emit("crash", e);
    });
    const vp = this._viewport;
    await Promise.all([
      s.send("Inspector.enable").catch(() => {}),
      s.send("Page.enable"),
      s.send("Page.getFrameTree").then((r) => { this._mainFrame = r.frameTree.frame.id; }),
      s.send("Page.setLifecycleEventsEnabled", { enabled: true }),
      s.send("Runtime.enable"),
      s.send("Log.enable"),
      this._network ? s.send("Network.enable") : null,
      this._metrics(),
      s.send("Emulation.setFocusEmulationEnabled", { enabled: true }),
      s.send("Emulation.setEmulatedMedia", { media: "", features: [
        { name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "no-preference" },
        { name: "forced-colors", value: "none" }] }),
    ]);
    void vp;
  }
  _metrics() {
    const { width, height } = this._viewport;
    return this._ses.send("Emulation.setDeviceMetricsOverride", {
      mobile: false, width, height, screenWidth: width, screenHeight: height, deviceScaleFactor: this._dpr,
      screenOrientation: width > height ? { angle: 90, type: "landscapePrimary" } : { angle: 0, type: "portraitPrimary" },
    });
  }
  viewportSize() { return { ...this._viewport }; }
  async setViewportSize(vp) { this._viewport = { width: vp.width, height: vp.height }; await this._metrics(); }
  url() { return this._lastUrl || "about:blank"; }

  /** Wait for a lifecycle event (load / DOMContentLoaded / networkIdle) of a given loaderId. */
  _lifecycle(name, loaderId, timeout) {
    const want = { load: "load", domcontentloaded: "DOMContentLoaded", networkidle: "networkIdle" }[name] || "load";
    return new Promise((resolve, reject) => {
      const on = (p) => {
        if (p.name !== want || p.frameId !== this._mainFrame || (loaderId && p.loaderId !== loaderId)) return;
        done(); resolve();
      };
      const off = () => { done(); reject(new Error(L`page closed`)); };
      const tm = setTimeout(() => { done(); reject(new Error(L`waiting for "${want}" took longer than ${timeout / 1000} s`)); }, timeout);
      const done = () => { clearTimeout(tm); this._ses.off("Page.lifecycleEvent", on); this._ses.off("detached", off); };
      this._ses.on("Page.lifecycleEvent", on);
      this._ses.once("detached", off);
    });
  }
  async goto(url, { waitUntil = "load", timeout = 30000 } = {}) {
    // add the listener before navigating so the load event is not missed
    let loader = null;
    const pending = [];
    const on = (p) => { if (p.name === ({ load: "load", domcontentloaded: "DOMContentLoaded", networkidle: "networkIdle" }[waitUntil] || "load") && p.frameId === this._mainFrame) pending.push(p.loaderId); };
    this._ses.on("Page.lifecycleEvent", on);
    try {
      const r = await this._ses.send("Page.navigate", { url, frameId: this._mainFrame || undefined });
      if (r.errorText) throw new Error(L`cannot open ${url}: ${r.errorText}`);
      loader = r.loaderId;
      this._lastUrl = url;
      if (!loader || pending.includes(loader)) return null;
      await this._lifecycle(waitUntil, loader, timeout);
      return null;
    } finally { this._ses.off("Page.lifecycleEvent", on); }
  }
  async reload(o = {}) { return this.goto(this.url(), o); }

  _expr(fn, arg) {
    if (typeof fn === "string") return fn;
    return `(${fn.toString()})(${arg === undefined ? "" : JSON.stringify(arg)})`;
  }
  /**
   * Race a CDP promise against a renderer crash and (when timeout > 0 ms) a time limit. The timeout error has
   * e.mgpTimeout = true and names `what`. Used by evaluate({ timeout }) and by browser.mjs capture().
   */
  guard(p, timeout, what) {
    if (this._crash) return Promise.reject(this._crash);
    return new Promise((resolve, reject) => {
      let tm = null;
      const onCrash = (e) => { clearTimeout(tm); reject(e); };
      this._crashWaiters.add(onCrash);
      if (timeout > 0) tm = setTimeout(() => {
        this._crashWaiters.delete(onCrash);
        const e = new Error(L`${what || "page step"} did not finish within ${+(timeout / 1000).toFixed(1)} s`);
        e.mgpTimeout = true;
        reject(e);
      }, timeout);
      p.then((v) => { clearTimeout(tm); this._crashWaiters.delete(onCrash); resolve(v); },
        (e) => { clearTimeout(tm); this._crashWaiters.delete(onCrash); reject(e); });
    });
  }
  /** Like Playwright: the function is serialised and run in the page; the result is JSON. opts: { timeout (ms), what }. */
  async evaluate(fn, arg, opts = {}) {
    const r = await this.guard(this._ses.send("Runtime.evaluate", { expression: this._expr(fn, arg), awaitPromise: true, returnByValue: true, userGesture: true }), opts.timeout, opts.what);
    if (r.exceptionDetails) throw errorFrom(r.exceptionDetails);
    return r.result.value;
  }
  /** Polling from the Node side (page timers may be frozen by the mgp runtime). */
  async waitForFunction(fn, arg, { timeout = 30000, polling = 50 } = {}) {
    const t0 = Date.now();
    let last;
    for (;;) {
      try { const v = await this.evaluate(fn, arg); if (v) return v; }
      catch (e) { last = e; if (e.cdpClosed || /CDP session already closed|browser connection|sesi CDP sudah ditutup|koneksi browser/.test(e.message)) throw e; }
      if (Date.now() - t0 > timeout) throw new Error(L`waitForFunction took longer than ${timeout / 1000} s` + (last ? ": " + last.message : ""));
      await new Promise((r) => setTimeout(r, polling));
    }
  }
  async addInitScript(fn, arg) {
    return this._ses.send("Page.addScriptToEvaluateOnNewDocument", { source: this._expr(fn, arg) });
  }
  /** Expose a Node function to the page as window[name](...args) -> Promise. */
  async exposeFunction(name, fn) {
    await this._ses.send("Runtime.addBinding", { name: "__mgpBind_" + name });
    this._ses.on("Runtime.bindingCalled", async (p) => {
      if (p.name !== "__mgpBind_" + name) return;
      const { seq, args } = JSON.parse(p.payload);
      let res, err;
      try { res = await fn(...args); } catch (e) { err = String(e && e.message || e); }
      const expr = `window.__mgpBindRes_${name}(${seq}, ${JSON.stringify(err || null)}, ${JSON.stringify(res === undefined ? null : res)})`;
      this._ses.send("Runtime.evaluate", { expression: expr, contextId: p.executionContextId }).catch(() => {});
    });
    const shim = (n) => {
      let seq = 0; const wait = new Map(); const bind = window["__mgpBind_" + n];
      window["__mgpBindRes_" + n] = (s, e, v) => { const w = wait.get(s); wait.delete(s); if (w) e ? w[1](new Error(e)) : w[0](v); };
      window[n] = (...args) => new Promise((res, rej) => { const s = ++seq; wait.set(s, [res, rej]); bind(JSON.stringify({ seq: s, args })); });
    };
    await this.addInitScript(shim, name);
    await this.evaluate(shim, name).catch(() => {});
  }
  async setContent(html, { timeout = 30000 } = {}) {
    await this._ses.send("Page.setDocumentContent", { frameId: this._mainFrame, html });
    // wait for images and fonts
    await this.waitForFunction(() => document.readyState === "complete" || document.readyState === "interactive", undefined, { timeout });
    await this.evaluate(async () => {
      await Promise.all([...document.images].map((i) => (i.complete ? (i.decode ? i.decode().catch(() => {}) : null) : new Promise((r) => { i.onload = i.onerror = r; }))));
      if (document.fonts) await document.fonts.ready;
    });
  }
  async content() { return this.evaluate(() => document.documentElement.outerHTML); }
  async title() { return this.evaluate(() => document.title); }

  /** Page screenshot. options: path, type png|jpeg, quality, fullPage, clip {x,y,width,height}. */
  async screenshot(o = {}) {
    const format = o.type || (o.path && /\.jpe?g$/i.test(o.path) ? "jpeg" : "png");
    let clip = o.clip ? { scale: 1, ...o.clip } : null;
    let beyond = false;
    if (o.fullPage) {
      const m = await this._ses.send("Page.getLayoutMetrics");
      const cs = m.cssContentSize || m.contentSize;
      clip = { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 };
      beyond = true;
    }
    const params = { format, fromSurface: true, captureBeyondViewport: beyond };
    if (clip) params.clip = clip;
    if (format === "jpeg") params.quality = o.quality ?? 90;
    const r = await this._ses.send("Page.captureScreenshot", params);
    const buf = Buffer.from(r.data, "base64");
    if (o.path) { fs.mkdirSync(path.dirname(path.resolve(o.path)), { recursive: true }); fs.writeFileSync(o.path, buf); }
    return buf;
  }
  isClosed() { return this._closed; }
  async close({ fromContext = false } = {}) {
    if (!this._closed) {
      this._closed = true;
      await this._ctx._browser._conn.send("Target.closeTarget", { targetId: this._targetId }).catch(() => {});
    }
    this._ctx._pages.delete(this);
    if (this._ownsContext && !fromContext) await this._ctx.close();
  }
}

/** Playwright style: chromium.launch({ executablePath, args, headless }). */
export const chromium = { launch };
