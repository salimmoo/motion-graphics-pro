/* mgp Studio - loader v1 (old name: Rekam Studio pemuat)
 * Builds the animation from the block <script type="application/json" id="mgp-timeline">
 * (old id rekam-timeline is still read). Studio copies this file into the composition
 * (<script id="mgp-loader">, old id rekam-pemuat), so the composition stays self-contained:
 * mgp, Studio and a plain browser give the same result.
 * What it does:
 *   - variables: data-composition-variables on <html> -> var(--id), data-var-text, data-var-src
 *   - hidden layers: [data-hidden] is not shown
 *   - base transform: data-x, data-y (px), data-rotate (degrees), data-scale, merged
 *     with GSAP tweens that animate the same property (the animation shifts with it)
 *   - animation: presets (entrance/exit/emphasis) or free from/to, plus keyframes ("kunci")
 * The spec keys (versi, animasi, kunci, durasi, ...) and preset ids are the Studio file format and stay as they are.
 * Needs GSAP 3. Put it as the last script in <body>.
 * Global: window.MgpLoader (old name window.RekamPemuat, the same object).
 */
(function () {
  "use strict";
  var P = window.MgpLoader = window.RekamPemuat = window.MgpLoader || window.RekamPemuat || {};
  P.versi = 1;

  var N = { opacity: 1, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, rotationX: 0, rotationY: 0, filter: "blur(0px)", clipPath: "inset(0% 0% 0% 0%)" };
  function natural(state) { var o = {}; for (var k in state) if (k in N) o[k] = N[k]; return o; }
  function masuk(label, en, state, ease, durasi, extra) {
    return Object.assign({ peran: "masuk", label: label, en: en, ease: ease || "power3.out", durasi: durasi || 0.6,
      buat: function (o) { var s = typeof state === "function" ? state(o) : state; return { from: s, to: natural(s) }; } }, extra || {});
  }
  function keluar(label, en, state, ease, durasi) {
    return { peran: "keluar", label: label, en: en, ease: ease || "power2.in", durasi: durasi || 0.5,
      buat: function (o) { var s = typeof state === "function" ? state(o) : state; return { from: natural(s), to: s }; } };
  }
  function tekanan(label, en, to, ease, durasi, extra) {
    return Object.assign({ peran: "tekanan", label: label, en: en, ease: ease || "sine.inOut", durasi: durasi || 0.4,
      buat: function (o) { return { to: typeof to === "function" ? to(o) : to }; } }, extra || {});
  }
  var J = function (o) { return o.jarak != null ? +o.jarak : 120; };

  P.PRESET = P.PRESET || {
    "pudar": masuk("Pudar masuk", "Fade in", { opacity: 0 }, "power1.out", 0.5),
    "geser-kiri": masuk("Geser masuk dari kiri", "Slide in from left", function (o) { return { x: -J(o), opacity: 0 }; }),
    "geser-kanan": masuk("Geser masuk dari kanan", "Slide in from right", function (o) { return { x: J(o), opacity: 0 }; }),
    "geser-atas": masuk("Geser masuk dari atas", "Slide in from top", function (o) { return { y: -J(o), opacity: 0 }; }),
    "geser-bawah": masuk("Geser masuk dari bawah", "Slide in from bottom", function (o) { return { y: J(o), opacity: 0 }; }),
    "skala": masuk("Skala masuk", "Scale in", { scale: 0.6, opacity: 0 }, "power3.out", 0.6),
    "pop": masuk("Pop (pegas)", "Spring pop", { scale: 0 }, "back.out(1.8)", 0.6),
    "putar": masuk("Putar masuk", "Spin in", { rotation: -180, scale: 0.4, opacity: 0 }, "power3.out", 0.8),
    "pantul": masuk("Pantul jatuh", "Bounce drop", function (o) { return { y: -J(o) * 3, opacity: 0 }; }, "bounce.out", 1),
    "ketik": masuk("Ketik (per huruf)", "Typewriter", { opacity: 0 }, "none", 0.01, { pecah: "huruf", stagger: 0.05 }),
    "naik-bertahap": masuk("Naik bertahap (per kata)", "Staggered fade up", function (o) { return { y: J(o) / 3, opacity: 0 }; }, "power3.out", 0.6, { pecah: "kata", stagger: 0.08 }),
    "tumbuh-garis": masuk("Tumbuh garis", "Line grow", { scaleX: 0 }, "expo.out", 0.8, { origin: "0% 50%" }),
    "lipat-kertas": masuk("Lipat kertas", "Paper fold", { rotationX: -90, opacity: 0 }, "back.out(1.4)", 0.8, { origin: "50% 0%", perspektif: 900 }),
    "kabur": masuk("Kabur masuk", "Blur in", { filter: "blur(24px)", opacity: 0 }, "power2.out", 0.7),
    "tirai": masuk("Tirai (buka dari kiri)", "Wipe reveal", { clipPath: "inset(0% 100% 0% 0%)" }, "power3.inOut", 0.8),
    "pudar-keluar": keluar("Pudar keluar", "Fade out", { opacity: 0 }, "power1.in", 0.5),
    "geser-keluar-kiri": keluar("Geser keluar ke kiri", "Slide out left", function (o) { return { x: -J(o), opacity: 0 }; }),
    "geser-keluar-kanan": keluar("Geser keluar ke kanan", "Slide out right", function (o) { return { x: J(o), opacity: 0 }; }),
    "geser-keluar-atas": keluar("Geser keluar ke atas", "Slide out up", function (o) { return { y: -J(o), opacity: 0 }; }),
    "geser-keluar-bawah": keluar("Geser keluar ke bawah", "Slide out down", function (o) { return { y: J(o), opacity: 0 }; }),
    "skala-keluar": keluar("Skala keluar", "Scale out", { scale: 0.6, opacity: 0 }),
    "kabur-keluar": keluar("Kabur keluar", "Blur out", { filter: "blur(24px)", opacity: 0 }),
    "denyut": tekanan("Denyut", "Pulse", { scale: 1.12 }, "sine.inOut", 0.25, { yoyo: true, repeat: 1 }),
    "goyang": tekanan("Goyang", "Shake", { keyframes: { rotation: [0, -7, 7, -4, 4, 0] } }, "none", 0.5),
    "kedip": tekanan("Kedip", "Blink", { opacity: 0.25 }, "steps(1)", 0.12, { yoyo: true, repeat: 3 }),
    "ayun": tekanan("Ayun", "Swing", { rotation: 8 }, "sine.inOut", 0.4, { yoyo: true, repeat: 1 }),
    "melayang": tekanan("Melayang", "Float", function (o) { return { y: -J(o) / 6 }; }, "sine.inOut", 0.8, { yoyo: true, repeat: 1 }),
  };

  // ---------------------------------------------------------------- util
  function pecah(el, mode) {
    el.__rkPecah = el.__rkPecah || {};
    if (el.__rkPecah[mode]) return el.__rkPecah[mode];
    // variable-bound text: fill in the current value, then release the binding in the live DOM so
    // the runtime rebinding does not wipe the letter/word pieces (the source does not change)
    var vk = el.getAttribute("data-var-text");
    if (vk) {
      var api = window.__mgp || window.__hyperframes;
      var vals = api && api.getVariables ? api.getVariables() : P.nilaiVariabel || {};
      if (vk in vals) el.textContent = String(vals[vk]);
      el.removeAttribute("data-var-text");
      el.setAttribute("data-var-text-lepas", vk);
    }
    var spans = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      var parts = mode === "kata" ? tn.textContent.split(/(\s+)/) : Array.from(tn.textContent);
      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        var s = document.createElement("span");
        s.className = "rk-" + mode; s.style.display = "inline-block"; s.textContent = p;
        frag.appendChild(s); spans.push(s);
      });
      tn.parentNode.replaceChild(frag, tn);
    });
    el.__rkPecah[mode] = spans;
    return spans;
  }
  function targetsOf(sel, mode) {
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!mode) return els;
    var out = [];
    els.forEach(function (e) { out = out.concat(pecah(e, mode)); });
    return out;
  }
  function variabel() {
    // the mgp runtime already bound the variables (including values from --var); the loader only fills them when opened without mgp
    if (window.__mgpRuntime || window.__rekam) return;
    var raw = document.documentElement.getAttribute("data-composition-variables");
    if (!raw) return;
    var list; try { list = JSON.parse(raw); } catch (e) { console.error("[mgp-loader] data-composition-variables is not JSON: " + e.message); return; }
    var vals = {};
    (list || []).forEach(function (v) { vals[v.id] = v.value != null ? v.value : v.default; });
    var root = document.documentElement;
    (list || []).forEach(function (v) {
      var val = vals[v.id];
      root.style.setProperty("--" + v.id, v.type === "number" && v.unit ? val + v.unit : String(val));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-var-text]"), function (el) {
      var k = el.getAttribute("data-var-text"); if (k in vals) el.textContent = vals[k];
    });
    Array.prototype.forEach.call(document.querySelectorAll("*"), function (el) {
      Array.prototype.forEach.call(el.attributes, function (a) {
        if (a.name.indexOf("data-var-") !== 0 || a.name === "data-var-text") return;
        if (a.value in vals && vals[a.value] != null) el.setAttribute(a.name.slice(9), vals[a.value]);
      });
    });
    P.nilaiVariabel = vals;
  }
  var ROT = { rotation: 1, rotate: 1, rotationZ: 1 };
  function baseOf(el) {
    if (!el || !el.getAttribute) return null;
    var x = +el.getAttribute("data-x") || 0, y = +el.getAttribute("data-y") || 0, r = +el.getAttribute("data-rotate") || 0;
    var s = el.hasAttribute("data-scale") ? +el.getAttribute("data-scale") : 1;
    if (!x && !y && !r && s === 1) return null;
    return { x: x, y: y, rotation: r, scale: s };
  }
  function shiftVal(v, b, mul) {
    if (typeof v === "string" && /^[+-]=/.test(v)) return v;
    var n = parseFloat(v);
    if (!isFinite(n)) return v;
    return mul ? n * b : n + b;
  }
  function geserVars(vars, keys) {
    if (!vars) return;
    keys.forEach(function (k) {
      if (!(k in vars)) return;
      var orig = vars[k];
      var kind = ROT[k] ? "rotation" : k === "scale" || k === "scaleX" || k === "scaleY" ? "scale" : k;
      vars[k] = function (i, el, list) {
        var o = typeof orig === "function" ? orig(i, el, list) : orig;
        var b = baseOf(el); if (!b) return o;
        return kind === "scale" ? shiftVal(o, b.scale, true) : shiftVal(o, b[kind], false);
      };
    });
  }
  // merge the base transform into every tween that animates x/y/rotation/scale of an element with a base
  function terapkanBasis(tl) {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-x],[data-y],[data-rotate],[data-scale]"));
    if (!els.length) return;
    els.forEach(function (el) {
      if (el.closest("template")) return;
      var b = baseOf(el); if (!b) return;
      gsap.set(el, { x: b.x, y: b.y, rotation: b.rotation, scale: b.scale });
    });
    var all = [];
    var roots = [tl];
    var tls = window.__timelines || {};
    Object.keys(tls).forEach(function (k) { if (tls[k] && tls[k] !== tl) roots.push(tls[k]); });
    if (window.__timeline && window.__timeline !== tl) roots.push(window.__timeline);
    roots.forEach(function (r) { if (r && r.getChildren) all = all.concat(r.getChildren(true, true, false)); });
    var keys = ["x", "y", "rotation", "rotate", "rotationZ", "scale", "scaleX", "scaleY"];
    all.forEach(function (tw) {
      var tg = tw.targets ? tw.targets() : [];
      if (!tg.some(function (e) { return els.indexOf(e) >= 0; })) return;
      geserVars(tw.vars, keys);
      if (tw.vars.startAt) geserVars(tw.vars.startAt, keys);
      tw.invalidate();
    });
    // sweep forward and back to 0: start values are recorded again in the right order
    roots.forEach(function (r) {
      if (!r || !r.totalTime) return;
      var t = r.totalTime();
      r.totalTime(r.totalDuration(), true); r.totalTime(0, true); r.totalTime(t, true);
    });
  }

  // ---------------------------------------------------------------- build
  P.bangun = function (spec, tl) {
    var dibuat = [];
    (spec.animasi || []).forEach(function (a, ai) {
      if (!a || !a.target || a.nonaktif) return;
      var p = a.preset ? P.PRESET[a.preset] : null;
      if (a.preset && !p) { console.error("[mgp-loader] unknown preset: " + a.preset); return; }
      var def = p ? p.buat(a) : { from: a.from, to: a.to };
      var mode = a.pecah != null ? a.pecah : p && p.pecah;
      var tg = targetsOf(a.target, mode || null);
      if (!tg.length) { console.warn("[mgp-loader] target not found: " + a.target); return; }
      var durasi = a.durasi != null ? +a.durasi : p ? p.durasi : 0.5;
      var ease = a.ease || (p ? p.ease : "power2.out");
      var peran = p ? p.peran : a.from ? "masuk" : "tekanan";
      var to = Object.assign({}, def.to || {}, { duration: durasi, ease: ease, data: { studioId: a.id || "a" + ai } });
      var st = a.stagger != null ? a.stagger : p && p.stagger;
      if (st) to.stagger = st;
      var rep = a.repeat != null ? a.repeat : p && p.repeat;
      if (rep) to.repeat = rep;
      if (a.yoyo != null ? a.yoyo : p && p.yoyo) to.yoyo = true;
      if (p && p.origin) gsap.set(tg, { transformOrigin: p.origin });
      if (p && p.perspektif) gsap.set(tg, { transformPerspective: p.perspektif });
      var at = a.at != null ? +a.at : 0;
      var tw;
      if (def.from) { to.immediateRender = peran === "masuk"; tw = tl.fromTo(tg, Object.assign({}, def.from), to, at); }
      else { to.immediateRender = false; tw = tl.to(tg, to, at); }
      dibuat.push(tw);
    });
    (spec.kunci || []).forEach(function (k, ki) {
      if (!k || !k.target || !k.prop || !k.keys || !k.keys.length) return;
      var tg = targetsOf(k.target, null);
      if (!tg.length) return;
      var keys = k.keys.slice().sort(function (a, b) { return a.t - b.t; });
      var o0 = {}; o0[k.prop] = keys[0].v;
      tl.set(tg, Object.assign(o0, { data: { studioKunci: ki, key: 0 } }), 0);
      for (var i = 1; i < keys.length; i++) {
        var f = {}, t = {};
        f[k.prop] = keys[i - 1].v; t[k.prop] = keys[i].v;
        Object.assign(t, { duration: Math.max(0.0001, keys[i].t - keys[i - 1].t), ease: keys[i].ease || k.ease || "power1.inOut", immediateRender: false, data: { studioKunci: ki, key: i } });
        tl.fromTo(tg, f, t, keys[i - 1].t);
      }
    });
    return dibuat;
  };

  // ---------------------------------------------------------------- run
  var blok = document.getElementById("mgp-timeline") || document.getElementById("rekam-timeline");
  if (!blok || !window.gsap) { if (blok) console.error("[mgp-loader] GSAP is not loaded"); return; }
  if (P.__sudah) return;
  P.__sudah = true;
  var spec;
  try { spec = JSON.parse(blok.textContent || "{}"); } catch (e) { console.error("[mgp-loader] mgp-timeline is not JSON: " + e.message); return; }
  P.spec = spec;
  var st = document.createElement("style");
  st.textContent = "[data-hidden]{display:none!important}";
  document.head.appendChild(st);
  variabel();
  var root = null;
  Array.prototype.forEach.call(document.querySelectorAll("[data-composition-id]"), function (el) {
    if (!root && !(el.parentElement && el.parentElement.closest("[data-composition-id]"))) root = el;
  });
  window.__timelines = window.__timelines || {};
  var rid = root && root.getAttribute("data-composition-id");
  var tl = (rid && window.__timelines[rid]) || window.__timeline;
  if (!tl) {
    tl = gsap.timeline({ paused: true });
    if (rid) window.__timelines[rid] = tl; else window.__timeline = tl;
  }
  if (spec.durasi && window.__duration == null && !(root && root.hasAttribute("data-duration"))) window.__duration = +spec.durasi;
  P.timeline = tl;
  P.bangun(spec, tl);
  terapkanBasis(tl);
})();
