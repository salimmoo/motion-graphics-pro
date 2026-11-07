/* Router across the four layers: gate → cosmos → orbit → guide.
   Hash: #gerbang · #rasi · #orbit-<id> · #panduan / #ch<n> / #d-<demo> / #t-<template> */
window.App = (() => {
  // the guide (layer 4) and everything only it needs load on demand: first visit to the guide, a deep link,
  // or an idle moment once the visitor has passed the gate. The gate, constellation and orbit never wait for them.
  const LAZY = ["js/skill.js", "js/vols.js", "js/demos.js", "js/demos-plus.js", "js/demos-skills.js", "js/registry.js", "js/paket-inline.js", "js/guide.js", "js/covers.js"];
  let lazyP = null;
  const loadGuide = () => lazyP || (lazyP = new Promise((ok) => {
    let n = LAZY.length; const end = () => { if (--n === 0) ok(); };
    LAZY.forEach((src) => { const sc = document.createElement("script"); sc.src = src; sc.async = false; sc.onload = sc.onerror = end; document.body.appendChild(sc); });
  }));
  if (!window.Guide) window.Guide = { stub: true, stop() {}, open(a) { loadGuide().then(() => { if (!window.Guide.stub && mode === "guide") window.Guide.open(a); }); } };
  const idle = window.requestIdleCallback ? (f, t) => requestIdleCallback(f, { timeout: t }) : (f, t) => setTimeout(f, t / 2);
  // prefetch only while the visitor rests in the constellation or the orbit (never during a flight or the gate move)
  let restT = 0;
  const calm = () => (mode === "cosmos" || mode === "orbit") && !stages.cosmos.dataset.flying && !body.classList.contains("portal");
  const prefetchGuide = () => { clearTimeout(restT); restT = setTimeout(() => { if (lazyP) return; if (calm()) idle(() => (calm() ? (lateBg(), loadGuide()) : prefetchGuide()), 1500); else prefetchGuide(); }, 2600); };
  const lateBg = () => document.documentElement.classList.add("late-bg");   // the orbit's photo is fetched from here on
  const body = document.body, back = document.getElementById("backTop"), backLbl = document.getElementById("backLbl");
  const stages = { gate: document.getElementById("gate"), cosmos: document.getElementById("cosmos"), orbit: document.getElementById("orbit") };
  const BACK = { cosmos: ["gate", "Gerbang"], orbit: ["cosmos", "Semua rasi"], guide: ["cosmos", "Semua rasi"] };
  let armed = 0;   // time after which the scroll gesture in the constellation is accepted
  let mode = null;

  function setMode(m) {
    mode = m;
    if (m === "orbit") lateBg();
    if (m === "cosmos" || m === "orbit") prefetchGuide();
    body.className = "mode-" + m + (body.classList.contains("portal") ? " portal" : "");
    Object.entries(stages).forEach(([k, el]) => el.classList.toggle("on", k === m));
    document.querySelectorAll(".chrome-nav a").forEach((a) => a.classList.toggle("on", a.dataset.go === m || (m === "orbit" && a.dataset.go === "cosmos")));
    back.hidden = !BACK[m]; if (BACK[m]) backLbl.textContent = BACK[m][1];
    if (m === "cosmos") armed = performance.now() + 1400;
    if (m !== "gate") Gate.stop();
    if (m !== "cosmos") Cosmos.stop();
    if (m !== "orbit") Orbit.stop();
    if (m !== "guide") Guide.stop();
  }
  const hash = (h) => { if (location.hash !== h) history.replaceState(null, "", h); };

  function go(to, o = {}) {
    if (to === "cosmos" && o.from === "gate" && mode === "gate") {
      // open the gate, then arrive in the constellation while we push through the arch
      // one continuous take: the live constellation already runs behind the arch while the camera pushes through
      Gate.open({
        portal: () => { body.classList.add("portal"); stages.cosmos.classList.add("on"); Cosmos.reset(); Cosmos.start(); Cosmos.enter("portal"); },
        zoom: (d) => Cosmos.push(d),
        through: () => { body.classList.remove("portal"); setMode("cosmos"); hash("#rasi"); },
      });
      return;
    }
    if (to === "gate" && (mode === "cosmos" || mode === "orbit")) {
      // going back: the opening played in reverse, starting pushed through the arch with this stage still live behind it
      if (Gate.isClosing()) return;
      const from = stages[mode];
      Gate.close({
        portal: () => { body.classList.add("portal"); stages.gate.classList.add("on"); from.style.zIndex = "5"; },
        closed: () => { body.classList.remove("portal"); from.style.zIndex = ""; setMode("gate"); scrollTo(0, 0); hash("#gerbang"); },
      });
      return;
    }
    if (to === "gate") { Gate.reset(); setMode("gate"); Gate.start(); scrollTo(0, 0); hash("#gerbang"); return; }
    if (to === "cosmos") { setMode("cosmos"); scrollTo(0, 0); Cosmos.reset(); Cosmos.start(); Cosmos.enter(false); hash("#rasi"); return; }
    if (to === "orbit") { setMode("orbit"); Orbit.show(o.id || "templat"); hash("#orbit-" + (o.id || "templat")); return; }
    if (to === "guide") { setMode("guide"); Guide.open(o.anchor || "#panduan"); hash(o.anchor && o.anchor !== "#panduan" ? o.anchor : "#panduan"); }
  }

  back.addEventListener("click", () => { const b = BACK[mode]; if (b) go(b[0]); });

  // in the constellation: scroll up = enter "Mulai", scroll down = back to the gate
  let busy = false;
  const gesture = (dir) => {
    if (mode !== "cosmos" || busy || performance.now() < armed || Gate.isClosing()) return;
    busy = true; setTimeout(() => (busy = false), 1600);
    if (dir < 0) Cosmos.pickId("mulai"); else go("gate");
  };
  addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > 18) gesture(Math.sign(e.deltaY)); }, { passive: true });
  let ty = null;
  addEventListener("touchstart", (e) => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchend", (e) => { if (ty == null) return; const d = e.changedTouches[0].clientY - ty; ty = null; if (Math.abs(d) > 70) gesture(d > 0 ? -1 : 1); }, { passive: true });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-go]"); if (!a) return;
    e.preventDefault();
    go(a.dataset.go, a.dataset.go === "guide" ? { anchor: "#panduan" } : {});
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mode === "orbit") go("cosmos");
    if ((e.key === "Enter" || e.key === " ") && mode === "gate" && document.activeElement === document.body) { e.preventDefault(); go("cosmos", { from: "gate" }); }
  });

  // route from the hash (on load and when the hash changes, e.g. back/forward or a pasted link)
  function route(first) {
    const h = location.hash;
    // #donasi / #donate / #tentang / #about open their dialog over whatever layer is showing (js/site-modal.js)
    if (window.SiteModal && SiteModal.isLink(h)) { if (first) { setMode("gate"); Gate.start(); } SiteModal.fromHash(); return; }
    if (h === "#rasi") go("cosmos");
    else if (h.startsWith("#orbit-")) go("orbit", { id: h.slice(7) });
    else if (h && h !== "#gerbang") go("guide", { anchor: h });
    else if (first) { setMode("gate"); Gate.start(); }
    else go("gate");
  }
  addEventListener("hashchange", () => route(false));
  route(true);
  return { go };
})();
