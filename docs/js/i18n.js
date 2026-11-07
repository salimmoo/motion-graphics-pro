/* i18n.js — Bahasa Indonesia (default) / English for the whole site. Load SYNCHRONOUSLY in <head>, before every other script:
     <script src="js/i18n.js"></script>                       (index.html: loads all EN packs)
     <script src="../js/i18n.js" data-i18n="ui,paket"></script>  (paket/index.html: only what that page needs)
   Language: ?lang=en|id  >  localStorage "mgp.lang"  >  "id". Switching saves the choice and reloads at the same section.
   EN mode:
   - data overlays (js/data.en.js, js/skill.en.js, js/vols.en.js, paket/data.en.js) register into I18N.EN and are merged into
     window.GUIDE / SKILL / VOLS / PAKET the moment the original files assign them (accessor on window) — same ids/anchors;
   - UI text from every other script (demos, registry, dialogs …) is swapped by a DOM translator: a dictionary of exact
     strings + "{}" patterns (js/i18n-ui.en.js, js/i18n-demos.en.js) applied to text nodes, a few attributes and canvas text,
     kept up to date by a MutationObserver. Nothing in the original scripts has to change. */
(() => {
  const me = document.currentScript;
  const base = me ? me.src.replace(/[^/]*$/, "") : "js/";            // …/js/
  const KEY = "mgp.lang";
  const url = new URL(location.href);
  const q = (url.searchParams.get("lang") || "").toLowerCase();
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const lang = q === "en" || q === "id" ? q : saved === "en" ? "en" : "id";
  if (q === "en" || q === "id") try { localStorage.setItem(KEY, q); } catch (e) {}
  const root = document.documentElement;
  root.lang = lang; root.classList.add("lang-" + lang);

  const dict = new Map(), pats = [], cache = new Map();
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const PH = /\{\d*\}/g;

  /* ---------- dictionary ---------- */
  function add(obj) {
    for (const [k0, v] of Object.entries(obj || {})) {
      const k = norm(k0);
      if (!k || v == null) continue;
      if (/\{\d*\}/.test(k)) {
        const parts = k.split(PH);
        pats.push({ re: new RegExp("^" + parts.map(esc).join("(.+?)") + "$"), pre: parts[0], v, w: parts.join("").length });
      } else dict.set(k, v);
    }
    pats.sort((a, b) => b.w - a.w);
    cache.clear();
  }
  // translate a whole string; null = no translation known
  function tr(s) {
    const k = norm(s);
    if (!k || !/[A-Za-zÀ-ÿ]/.test(k)) return null;
    if (cache.has(k)) return cache.get(k);
    let r = dict.has(k) ? dict.get(k) : null;
    if (r == null) for (const p of pats) {
      if (p.pre && !k.startsWith(p.pre)) continue;
      const m = p.re.exec(k); if (!m) continue;
      const caps = m.slice(1).map(part);
      let i = 0; r = p.v.replace(PH, (x) => (x.length > 2 ? caps[+x.slice(1, -1) - 1] : caps[i++]) ?? "");
      break;
    }
    if (cache.size > 6000) cache.clear();
    cache.set(k, r);
    return r;
  }
  // a value inside a pattern: exact entry, else translate " · " / ", "-separated pieces one by one
  function part(c) {
    const k = c.trim(), x = dict.get(k);
    if (x != null) return x;
    for (const sep of [" · ", ", "]) if (k.includes(sep)) return c.split(sep).map((y) => dict.get(y.trim()) ?? y).join(sep);
    return c;
  }
  const t = (s) => (lang === "en" ? tr(s) ?? s : s);            // for code that wants to translate explicitly

  /* ---------- data overlays ---------- */
  const EN = {};
  function overlay(b, o) {
    if (o == null) return b;
    if (o && typeof o === "object" && "$" in o && Object.keys(o).length === 1) return o.$;   // {$: value} = replace wholesale
    if (Array.isArray(b)) {
      if (o && typeof o === "object" && !Array.isArray(o)) {                 // {id: item} onto [items]
        return b.map((x) => (x && x.id != null && o[x.id] != null ? overlay(x, o[x.id]) : x));
      }
      if (!Array.isArray(o)) return b;
      const key = b.find((x) => x && typeof x === "object" && !Array.isArray(x));
      const k = key ? ("id" in key ? "id" : "n" in key ? "n" : null) : null;
      if (k && o.some((x) => x && x[k] != null)) {
        const m = new Map(o.filter((x) => x && x[k] != null).map((x) => [x[k], x]));
        return b.map((x) => (x && m.has(x[k]) ? overlay(x, m.get(x[k])) : x));
      }
      return b.map((x, i) => (i < o.length ? overlay(x, o[i]) : x));
    }
    if (b && typeof b === "object") {
      if (typeof o !== "object") return b;
      for (const key of Object.keys(o)) b[key] = key in b ? overlay(b[key], o[key]) : o[key];
      return b;
    }
    return typeof o === typeof b || b == null ? o : b;
  }
  // window.NAME = value  →  value merged with EN[NAME] (and after(value) for cross-object fixes)
  function hook(name, after) {
    let v = window[name];
    Object.defineProperty(window, name, {
      configurable: true, enumerable: true, get: () => v,
      set: (x) => { v = x; if (lang === "en" && x && EN[name]) { try { v = overlay(x, EN[name]); if (after) after(v); } catch (e) { console.warn("i18n overlay", name, e); } } },
    });
  }
  hook("SKILL"); hook("VOLS"); hook("PAKET");
  hook("GUIDE", (g) => {   // data.js appends its extra workflow templates to SKILL.templates: swap those for the EN copies
    const S = window.SKILL, X = EN.GUIDE && EN.GUIDE.TEMPLATES_EXTRA;
    if (S && Array.isArray(S.templates) && X) S.templates.forEach((tp, i) => { const e = X.find((y) => y.id === tp.id); if (e) S.templates[i] = Object.assign({}, tp, e); });
  });

  /* ---------- DOM translator ---------- */
  const ATTRS = ["aria-label", "title", "placeholder", "alt", "data-tip", "label"];
  const SKIP = "script,style,code,pre,textarea,.prose,[translate=no],.notranslate";
  const mine = new WeakMap();                                              // node → value we wrote (no ping-pong)
  function doText(n) {
    const v = n.nodeValue;
    if (!v || v.length > 3000 || mine.get(n) === v) return;
    const p = n.parentElement;
    if (!p || p.closest(SKIP)) return;
    const r = tr(v); if (r == null || r === norm(v)) return;
    if (p.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", norm(v));   // keep select.value logic intact
    const out = v.match(/^\s*/)[0] + r + v.match(/\s*$/)[0];
    mine.set(n, out); n.nodeValue = out;
  }
  function doAttr(el, a) {
    const v = el.getAttribute(a);
    if (!v || el.closest("[translate=no],.notranslate")) return;
    if (a === "value" && !(el.tagName === "INPUT" && /^(button|submit|reset|text|search)$/i.test(el.type))) return;
    const r = tr(v); if (r == null || r === v) return;
    const field = a === "value" && /^(text|search)$/i.test(el.type) && el.value === v;
    el.setAttribute(a, r);
    // a demo's sample text field: show the English sample and let the demo re-read it
    if (field) { el.value = r; const kick = () => el.dispatchEvent(new Event("input", { bubbles: true })); kick(); setTimeout(kick, 0); setTimeout(kick, 400); }
  }
  const SEL = ATTRS.map((a) => `[${a}]`).join(",") + ",input[value]";
  function walk(n) {
    if (n.nodeType === 3) return doText(n);
    if (n.nodeType !== 1 || n.matches(SKIP)) return;
    for (const a of ATTRS) if (n.hasAttribute(a)) doAttr(n, a);
    if (n.tagName === "INPUT") doAttr(n, "value");
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    for (let x = w.nextNode(); x; x = w.nextNode()) doText(x);
    n.querySelectorAll(SEL).forEach((el) => { for (const a of ATTRS) if (el.hasAttribute(a)) doAttr(el, a); if (el.tagName === "INPUT") doAttr(el, "value"); });
  }
  function patchCanvas(C) {
    if (!C) return;
    ["fillText", "strokeText", "measureText"].forEach((m) => {
      const o = C[m]; if (!o) return;
      C[m] = function (s, ...a) {
        if (typeof s === "string" && s.length < 400) { const r = tr(s); if (r != null) s = s.match(/^\s*/)[0] + r + s.match(/\s*$/)[0]; }
        return o.call(this, s, ...a);
      };
    });
  }
  function startDom() {
    patchCanvas(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype);
    patchCanvas(window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype);
    new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === "characterData") doText(r.target);
        else if (r.type === "attributes") doAttr(r.target, r.attributeName);
        else r.addedNodes.forEach(walk);
      }
    }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat("value") });
    walk(root);
    const title = () => { const r = tr(document.title); if (r) document.title = r; };
    title(); document.addEventListener("DOMContentLoaded", title);
  }

  /* ---------- switcher (round flag, bottom-left) ---------- */
  const FLAG = {
    id: '<svg viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="15" fill="#E70011"/><rect y="15" width="30" height="15" fill="#FFFFFF"/></svg>',
    en: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><clipPath id="i18nT"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath>'
      + '<rect width="60" height="30" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/>'
      + '<path d="M0,0L60,30M60,0L0,30" clip-path="url(#i18nT)" stroke="#C8102E" stroke-width="4"/>'
      + '<path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  };
  const NAME = { en: "English", id: "Bahasa Indonesia" };
  function set(to) {
    if (to !== "en" && to !== "id") return;
    try { localStorage.setItem(KEY, to); } catch (e) {}
    const u = new URL(location.href);
    if (u.searchParams.has("lang")) u.searchParams.set("lang", to);
    // keep the reader where they are: in the guide, point the hash at the section at the top of the screen
    if (document.body && /\bmode-guide\b/.test(document.body.className)) {
      let at = null;
      document.querySelectorAll("#doc .topic[id], #doc .part[id], #doc .feat[id], #doc #panduan").forEach((el) => { if (el.getBoundingClientRect().top < 120) at = el.id; });
      if (at) u.hash = "#" + at;
    }
    if (u.href !== location.href) history.replaceState(history.state, "", u.href);
    location.reload();
  }
  function button() {
    if (document.getElementById("langSw")) return;
    const other = lang === "en" ? "id" : "en";
    const b = document.createElement("button");
    b.type = "button"; b.id = "langSw"; b.className = "lang-sw notranslate"; b.setAttribute("translate", "no");
    b.setAttribute("aria-label", NAME[other]); b.dataset.to = other; b.lang = other;
    b.innerHTML = `<span class="lang-flag">${FLAG[other]}</span><span class="lang-tip" role="tooltip">${NAME[other]}</span>`;
    b.addEventListener("click", () => set(other));
    document.body.appendChild(b);
  }

  const pack = (name, o) => { EN[name] = o; if (lang === "en" && window[name]) window[name] = window[name]; };   // late pack: re-merge
  window.I18N = { lang, en: lang === "en", t, tr, add, pack, set, EN, overlay, base };

  if (lang === "en") {
    const want = ((me && me.dataset.i18n) || "ui,demos,data,skill,vols,paket").split(",").map((s) => s.trim());
    const FILES = { ui: "i18n-ui.en.js", demos: "i18n-demos.en.js", data: "data.en.js", skill: "skill.en.js", vols: "vols.en.js", paket: "../paket/data.en.js" };
    // parser-inserted, synchronous: the packs are registered before any other script of the page runs
    want.forEach((k) => FILES[k] && document.write(`<script src="${base}${FILES[k]}"><\/script>`));
    startDom();
  }
  if (document.body) button(); else document.addEventListener("DOMContentLoaded", button);
})();
