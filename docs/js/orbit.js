/* Layer 3 · Orbital atelier. Cards float on a 3D ring that turns toward the cursor,
   tilt toward it, and fly to full screen when clicked. Medallions orbit on an inner ring. */
window.Orbit = (() => {
  const G = window.GUIDE, S = window.SKILL;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px)").matches;
  const $ = (s) => document.querySelector(s);
  const ring = $("#orbitRing"), bg = $("#orbitBg"), tabs = $("#orbitTabs"), cv = $("#orbitCv"), cx = cv.getContext("2d");
  const ICON = {
    stairs: "M3 20h5v-5h5v-5h5V5h3", lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v3", gate: "M4 21V9a8 8 0 0 1 16 0v12M8 21V10M12 21V8M16 21V10M4 14h16",
    scroll: "M7 3h10v18H7zM10 8h4M10 12h4M10 16h3", compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z", key: "M14 9a4 4 0 1 1-1.2 2.8L5 20H3v-2l1-1h2v-2h2l2.2-2.2",
    star: "M12 3l2.6 6 6.4.6-4.9 4.2 1.5 6.3L12 17l-5.6 3.1 1.5-6.3L3 9.6 9.4 9z", palette: "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.6-1-2.6 1-1.4 2-1.4h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7h.01M15 7.5h.01",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", grid: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
    layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5", scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 7.9L20 20M8.1 16.1L20 4",
    ruler: "M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2", prompt: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5", coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9h4.5a1.5 1.5 0 0 1 0 3H10.5a1.5 1.5 0 0 0 0 3H15M12 7v10",
    branch: "M6 3v12M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9c0 6-12 3-12 6", calc: "M5 3h14v18H5zM8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h4",
    graph: "M3 3v18h18M6 16c3-8 6-10 12-11", face: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 10h.01M15 10h.01M8.5 15c2 2 5 2 7 0", mouth: "M3 12c3-4 15-4 18 0-3 5-15 5-18 0zM3 12h18",
    film: "M3 5h18v14H3zM7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4", walk: "M13 4a2 2 0 1 0 0-.1M10 21l2-6 3 3v3M9 12l2-4 4 2 2 3M11 8l-3 3-2 5", book: "M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6",
    type: "M4 6V4h16v2M12 4v16M9 20h6", transition: "M3 4h8v16H3zM13 4h8v16h-8zM11 12h2", route: "M5 19a2 2 0 1 0 0-.1M19 5a2 2 0 1 0 0-.1M5 17c0-6 14-4 14-10",
    check: "M4 12l5 5L20 6", audio: "M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2", render: "M4 4h16v12H4zM8 20h8M12 16v4M10 8l4 2-4 2z", x: "M5 5l14 14M19 5L5 19",
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="#f2d796" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k] || ICON.star}"/></svg>`;

  const CENTER_CARDS = () => {
    const demos = G.MENU.flatMap((m) => m.cards.filter((c) => c.demo));
    const tpl = (window.SKILL?.templates || []).map((t) => ({ t: `${t.id} · ${t.title.replace(/\s*\(.*\)$/, "")}`, s: "Alur kerja siap salin", go: `#t-${t.id}`, icon: "scroll" }));
    return [...(G.CENTER_EXTRA || []), ...demos.filter((d, i) => i % 2 === 0).slice(0, 6), ...tpl.slice(0, 6)];
  };

  // ---- card carousel: real frames of the demos / templates / registry / paket this card leads to (js/thumbs.js)
  const TH = window.THUMBS || {}, TL = window.THUMB_LABELS || {};
  const HOLD = 1.05;   // seconds per image
  const PART_OF = { paket: "pustaka", templat: "pustaka" };
  const coverOf = (mid) => { const p = G.PARTS.find((x) => x.id === (PART_OF[mid] || mid)); return p ? [{ src: `assets/img/${p.img}.jpg`, cap: `${p.title} ${p.accent}` }] : []; };
  const demoIds = (mid) => {
    const m = G.MENU.find((x) => x.id === mid), p = G.PARTS.find((x) => x.id === (PART_OF[mid] || mid));
    const fromCards = m ? m.cards.map((c) => (c.go.match(/^#d-(.+)$/) || [])[1]).filter(Boolean) : [];
    const fromPart = p ? p.topics.flatMap((t) => t.demos || []) : [];
    return [...new Set([...fromCards, ...fromPart])];
  };
  const shots = (keys) => keys.flatMap((k) => (TH[k] || []).map((src) => ({ src, cap: TL[k] || k })));
  const group = (pre) => Object.keys(TH).filter((k) => k.startsWith(pre));
  const rot = (arr, n) => (arr.length ? [...arr.slice(n % arr.length), ...arr.slice(0, n % arr.length)] : arr);
  function slides(c, mid, i) {
    const go = c.go || "", d = (go.match(/^#d-(.+)$/) || [])[1], t = (go.match(/^#t-(.+)$/) || [])[1], pk = (go.match(/#([A-Z]+)-\d+$/) || [])[1];
    mid = (G.MENU.find((m) => m.cards.some((x) => x.go === go)) || { id: mid }).id;   // centre cards borrow their home constellation
    const sib = demoIds(mid).filter((x) => x !== d), reg = group("reg-"), tpl = group("t-"), pks = group("pk-");
    let L;
    if (d) L = [...shots([d]), ...shots(sib.slice(0, 6))];
    else if (t) L = [...shots([`t-${t}`]), ...shots(rot(tpl.filter((x) => x !== `t-${t}`), i)).slice(0, 4), ...shots(rot(reg, i * 5)).slice(0, 4)];
    else if (go === "#registry") L = shots(rot(reg, i * 3)).filter((_, j) => j % 2 === 0).slice(0, 14);
    else if (/^paket\//.test(go) || go === "#paket") { const first = pk ? pks.filter((k) => k.startsWith(`pk-${pk}-`)) : []; L = [...shots(first), ...shots(rot(pks.filter((k) => !first.includes(k)), i * 2)).filter((_, j) => j % 2 === 0)].slice(0, 12); }
    else L = shots(rot(sib, i)).slice(0, 8);
    return [...L, ...coverOf(mid)];
  }
  const KB = [["-3%", "2%", "2%", "-2%"], ["2%", "-2%", "-2%", "1%"], ["-2%", "-2%", "3%", "2%"], ["3%", "1%", "-2%", "-1%"]];
  function paint(k, layer, sl) {
    layer.style.backgroundImage = `url("${sl.src}")`;
    const [x0, y0, x1, y1] = KB[(k.n + k.i) % KB.length];
    if (layer.animate && !reduce) layer.animate([{ transform: `scale(1.06) translate(${x0}, ${y0})` }, { transform: `scale(1.16) translate(${x1}, ${y1})` }], { duration: HOLD * 2300, easing: "linear", fill: "both" });
    k.capEl.textContent = sl.cap;
  }
  function step(k) {
    if (!k.sl.length) return;
    k.n = (k.n + 1) % k.sl.length;
    const front = k.L[k.f ^ 1];
    paint(k, front, k.sl[k.n]);
    front.classList.add("on"); k.L[k.f].classList.remove("on"); k.f ^= 1;
    const nx = k.sl[(k.n + 1) % k.sl.length]; if (nx) (new Image()).src = nx.src;   // preload the next frame
  }
  let dragged = false, drag = null;
  let cards = [], medals = [], running = false, raf = 0, last = 0, A = 0, V = 0, mx = 0, my = 0, tmx = 0, tmy = 0, current = null, hoverI = -1, entering = 0, warm = null;
  addEventListener("pointermove", (e) => {
    tmx = (e.clientX / innerWidth - .5) * 2; tmy = (e.clientY / innerHeight - .5) * 2;
    if (drag) { const dx = e.clientX - drag.x; drag.x = e.clientX; drag.v = dx / Math.max(1, e.timeStamp - drag.t); drag.t = e.timeStamp; A += dx * .006; if (Math.abs(e.clientX - drag.x0) > 6) dragged = true; }
  }, { passive: true });
  const scene = document.getElementById("orbitScene");
  scene.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; drag = { x: e.clientX, x0: e.clientX, t: e.timeStamp, v: 0 }; dragged = false; scene.classList.add("grab"); });
  addEventListener("pointerup", () => { if (!drag) return; V = Math.max(-3, Math.min(3, drag.v * 6)); drag = null; scene.classList.remove("grab"); setTimeout(() => (dragged = false), 0); });

  function build(id) {
    const m = id === "templat" ? Object.assign({}, G.CENTER, { cards: CENTER_CARDS() }) : G.MENU.find((x) => x.id === id) || G.MENU[0];
    current = m.id;
    const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];
    $("#orbitKicker").textContent = `Orbit — ${m.label}`;
    $("#orbitTitle").textContent = m.label;
    $("#orbitSub").innerHTML = m.star ? `<span class="o-cap"><i aria-hidden="true">★</i> ${m.sub}</span>` : m.sub;
    ring.innerHTML = "";
    cards = m.cards.map((c, i) => {
      const el = document.createElement("button");
      el.className = "ocard"; el.type = "button";
      // carousel: frames of the demos / templates / registry items this card leads to, crossfading about once a second
      el.innerHTML = `<div class="art"><div class="car"><i class="on"></i><i></i></div><span class="num">${String(i + 1).padStart(2, "0")}</span>${icon(c.icon)}${c.demo ? '<span class="badge">Interaktif</span>' : ""}<span class="cap ocap"></span></div><div class="tx"><h3>${c.t}</h3><p>${c.s}</p></div>`;
      el.addEventListener("mouseenter", () => (hoverI = i));
      el.addEventListener("mouseleave", () => (hoverI = -1));
      el.addEventListener("click", (ev) => { if (dragged) { ev.preventDefault(); return; } openCard(el, c); });
      ring.appendChild(el);
      const k = { el, c, i, L: [...el.querySelectorAll(".car i")], f: 0, n: 0, t: -i * .17, capEl: el.querySelector(".cap"), sl: slides(c, m.id, i) };
      if (!k.sl.length) k.sl = [{ src: "assets/img/cosmos.jpg", cap: m.label }];
      paint(k, k.L[0], k.sl[0]);
      return k;
    });
    const words = (m.sub + " · " + m.label).split(/[·&]/).map((w) => w.trim()).filter(Boolean).slice(0, 4);
    medals = words.map((w, i) => { const el = document.createElement("div"); el.className = "medal"; el.textContent = w; ring.appendChild(el); return { el, i, n: words.length }; });
    tabs.innerHTML = [...G.MENU, G.CENTER].map((x) => `<button type="button" data-id="${x.id}" class="${x.id === m.id ? "on" : ""}">${x.label}</button>`).join("");
    tabs.querySelectorAll("button").forEach((b) => b.addEventListener("click", (e) => { if (b.dataset.id !== current) { FX.burst(e.clientX, e.clientY, 30); swap(b.dataset.id); } }));
    entering = 0; A = -Math.PI * .5;
  }

  function swap(id) {
    if (!window.gsap) return build(id);
    gsap.to(ring.children, { opacity: 0, scale: .6, duration: .35, stagger: .02, onComplete: () => build(id) });
  }

  const QL = window.QUALITY || { tier: 2, dpr: () => Math.min(devicePixelRatio || 1, 1.25), n: (x) => x };
  function size() { const dpr = QL.dpr(); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  const dust = Array.from({ length: QL.n(90) }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 6.28 }));

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    mx += (tmx - mx) * .07; my += (tmy - my) * .07;
    entering = Math.min(1, entering + dt * .8);   // also runs while pre-warming, so every blur/depth state is rendered once before the switch
    const e = 1 - Math.pow(1 - entering, 3);
    // orbit turns toward the cursor side; slows while hovering a card
    const vT = reduce ? 0 : (hoverI >= 0 ? .05 : .12 + mx * .85);
    if (!drag) { V += (vT - V) * Math.min(1, dt * 1.2); A += V * dt; }
    const W = innerWidth, Rx = Math.min(W * (small ? .36 : .34), 600), Rz = small ? 220 : 340, N = cards.length || 1;
    bg.style.transform = `translate3d(${-mx * 24}px, ${-my * 16}px, 0) scale(1.04)`;
    for (const k of cards) {
      const ph = A + k.i * (Math.PI * 2 / N);
      const x = Math.sin(ph) * Rx * e, z = (Math.cos(ph) * Rz - Rz * .15) * e - (1 - e) * 900, y = Math.sin(ph * 2 + k.i) * 26 + Math.sin(now / 900 + k.i) * 8 + my * -20;
      const depth = (Math.cos(ph) + 1) / 2;
      const hov = k.i === hoverI ? 1 : 0;
      const ry = -Math.sin(ph) * 28 + mx * 10, rx = -my * 8;
      k.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${(z + hov * 120).toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${(1 + hov * .06).toFixed(3)})`;
      k.el.style.opacity = (e * (.28 + .72 * depth)).toFixed(3);
      k.el.style.zIndex = String(Math.round(1000 + z + hov * 400));
      // carousel advances only on cards facing the camera, to stay light
      if (depth > .45 && !reduce) { k.t += dt; if (k.t > HOLD) { k.t = 0; step(k); } }
    }
    for (const m of medals) {
      const ph = -A * 1.6 + m.i * (Math.PI * 2 / m.n) + .4;
      const x = Math.sin(ph) * Rx * .58 * e, z = Math.cos(ph) * Rz * .55, y = 150 + Math.cos(ph * 1.5) * 30;
      m.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(-Math.sin(ph) * 30).toFixed(1)}deg)`;
      m.el.style.opacity = (e * (.4 + .6 * (Math.cos(ph) + 1) / 2)).toFixed(3);
      m.el.style.zIndex = String(Math.round(1000 + z));
    }
    // dust + orbit trail
    const H = innerHeight;
    cx.clearRect(0, 0, W, H);
    cx.globalCompositeOperation = "lighter";
    cx.strokeStyle = "rgba(242,215,150,.16)"; cx.lineWidth = 1;
    cx.beginPath(); cx.ellipse(W / 2, H * .54 + 30, Rx * 1.05, 70, 0, 0, Math.PI * 2); cx.stroke();
    for (let i = 0, nT = QL.n(260); i < nT; i++) {
      const ph = A * .9 + i * (6.29 / nT), rr = Rx * (1 + Math.sin(i * 3.1) * .06);
      cx.globalAlpha = .15 + .5 * Math.abs(Math.sin(i * 1.7 + now / 600));
      cx.fillStyle = "#ffe0a0"; cx.fillRect(W / 2 + Math.sin(ph) * rr, H * .54 + 30 + Math.cos(ph) * 70, 1.4, 1.4);
    }
    for (const d of dust) { d.y -= .0003 * (1 + d.z); if (d.y < -.02) d.y = 1.02; cx.globalAlpha = .2 + .4 * Math.sin(now / 500 + d.ph) ** 2; cx.fillRect(d.x * W + Math.sin(now / 2000 + d.ph) * 20, d.y * H, 1.8 * d.z + .4, 1.8 * d.z + .4); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
  }

  const stageEl = document.getElementById("orbit");
  function show(id) {
    const reuse = warm && warm.id === id && warm.built;
    if (warm) { if (reuse) stageEl.classList.add("pw-hold"); stageEl.classList.remove("prewarm"); warm = null; cards.forEach((k) => (k.el.style.display = "")); }
    if (reuse) { entering = 0; last = 0; } else build(id);
    if (!running) { running = true; size(); last = 0; raf = requestAnimationFrame(loop); }
  }
  function stop() { running = false; cancelAnimationFrame(raf); unprepare(); }
  function unprepare(id) { if (!warm || (id && warm.id !== id)) return; stageEl.classList.remove("prewarm"); warm = null; cards.forEach((k) => (k.el.style.display = "")); if (!stageEl.classList.contains("on")) { running = false; cancelAnimationFrame(raf); } }
  // build the orbit for `id` ahead of time, spread over idle frames, so the later switch only toggles visibility:
  // frame 1 builds the cards, frame 2 decodes the background + first carousel frames, frame 3 paints it invisibly
  function prepare(id) {
    if (reduce || (warm && warm.id === id)) return;
    const w = (warm = { id, built: false });
    const raf2 = (f) => requestAnimationFrame(() => warm === w && f());
    raf2(() => {
      build(id); w.built = true;
      cards.forEach((k) => (k.el.style.display = "none"));   // revealed one per frame once the stage is pre-painting
      raf2(() => {
        const srcs = [matchMedia("(max-width: 760px)").matches ? "assets/img/m/atelier.jpg" : "assets/img/atelier.jpg", ...cards.flatMap((k) => k.sl.slice(0, 2).map((x) => x.src))];
        Promise.all(srcs.map((u) => { const im = new Image(); im.src = u; return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); }))
          .then(() => raf2(() => {
            stageEl.classList.add("prewarm"); if (!running) { running = true; size(); last = 0; raf = requestAnimationFrame(loop); }
            // reveal one card per frame, let the ring run ~1/3 s so every card is painted, then park the loop
            // (the invisible layer stays rastered; animating it behind the flight would double the frame cost)
            let i = 0; const next = () => { if (i < cards.length) { cards[i++].el.style.display = ""; raf2(next); } else setTimeout(() => { if (warm === w && !stageEl.classList.contains("on")) { running = false; cancelAnimationFrame(raf); } }, 350); }; raf2(next);
          }));
      });
    });
  }
  addEventListener("resize", () => running && size());

  function openCard(el, c) {
    const r = el.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, 80, 1.3);
    if (!c.go.startsWith("#")) { setTimeout(() => (location.href = c.go), 350); return; }   // separate page (Paket Motion)
    if (!window.gsap || reduce) { App.go("guide", { anchor: c.go }); return; }
    const ghost = el.cloneNode(true);
    Object.assign(ghost.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", margin: 0, transform: "none", filter: "none", opacity: 1, zIndex: 80 });
    document.body.appendChild(ghost);
    gsap.timeline({ onComplete: () => {
        App.go("guide", { anchor: c.go });
        // the guide's first layout/paint is heavy: let it land under the static full-screen ghost, then fade the ghost
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => gsap.to(ghost, { opacity: 0, duration: .6, onComplete: () => ghost.remove() }), 60)));
      } })
      .to(ghost, { left: 0, top: 0, width: innerWidth, height: innerHeight, duration: .9, ease: "power3.inOut" })
      .to(ghost.querySelector(".art"), { height: innerHeight * .7, duration: .9, ease: "power3.inOut" }, 0);
  }

  return { show, stop, prepare, unprepare };
})();
