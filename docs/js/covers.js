/* Part covers: the photo is a torn sheet of paper laid on the continuous page background.
   - top: soft fade into the background; bottom: a seeded torn edge with a cream paper rim and a cast shadow
   - scroll-linked: the sheet rises and settles flat as the part enters, then lifts and tilts away as it leaves
   Wraps each .part-img (built by js/guide.js) without changing guide.js; works on touch and mobile. */
(() => {
  const doc = document.getElementById("doc");
  if (!doc) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (s) => () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296);
  let list = [], raf = 0;

  // torn edge points along the bottom, from right to left (viewBox 0 0 1000 1000, stretched to the cover)
  function edge(seed, n, base, amp) {
    const r = rnd(seed), pts = [], ph = r() * 6.28, ph2 = r() * 6.28;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = 1000 - u * 1000 + (i && i < n ? (r() - .5) * (500 / n) : 0);
      const wave = Math.sin(u * 7.1 + ph) * amp * .9 + Math.sin(u * 17.3 + ph2) * amp * .35;   // the long, soft line of the tear
      const tooth = (r() - .5) * amp * (i % 2 ? .9 : .35);                                     // fine fibres
      const rip = r() < .05 ? r() * amp * 1.2 : 0;                                              // a rare deeper bite
      pts.push([x, base + wave + tooth - rip]);
    }
    return pts;
  }
  const svgUrl = (pts, a, b) => {
    const d = `M0 0H1000V${pts[0][1].toFixed(1)}` + pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="${a}" stop-color="#fff" stop-opacity="0"/><stop offset="${b}" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><path d="${d}" fill="url(#g)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  };

  function shape(p) {
    const w = p.el.clientWidth || innerWidth, n = Math.max(40, Math.min(160, Math.round(w / 9)));
    const pts = edge(p.seed, n, 950, 11);
    p.wrap.style.setProperty("--pc-m", svgUrl(pts, 0, .22));
    p.wrap.style.setProperty("--pc-r", svgUrl(pts.map(([x, y], i) => [x, y + 3 + ((i * 7) % 5) * .9]), .7, .86));
    p.w = w;
  }

  function scan() {
    doc.querySelectorAll(".part:not([data-pc])").forEach((el, i) => {
      const im = el.querySelector(".part-img"); if (!im) return;
      el.dataset.pc = "1";
      const wrap = document.createElement("div"); wrap.className = "pc-wrap"; wrap.setAttribute("aria-hidden", "true");
      wrap.innerHTML = '<div class="pc-shade"></div><div class="pc-rim"></div><div class="pc-frame"></div>';
      el.insertBefore(wrap, im);
      wrap.lastChild.appendChild(im);     // guide.js keeps its reference to .part-img and its parallax
      const p = { el, wrap, seed: 977 + list.length * 131, w: 0 };
      shape(p); list.push(p);
    });
    if (list.length && !raf) raf = requestAnimationFrame(loop);
  }

  // positions are cached (refreshed when the document resizes); per frame we only write transforms
  let dirty = true, lastY = -1;
  let sY = scrollY, vH = innerHeight;   // cached: no layout-forcing reads inside rAF
  addEventListener("scroll", () => (sY = scrollY), { passive: true });
  addEventListener("resize", () => { vH = innerHeight; sY = scrollY; });
  if (window.ResizeObserver) new ResizeObserver(() => (dirty = true)).observe(doc);
  addEventListener("resize", () => (dirty = true));
  function loop() {
    raf = requestAnimationFrame(loop);
    if (reduce || !document.body.classList.contains("mode-guide")) return;
    if (dirty) { dirty = false; lastY = -1; for (const p of list) { const r = p.el.getBoundingClientRect(); sY = scrollY; p.top = r.top + sY; p.h = r.height; } }
    const Y = sY; if (Y === lastY) return; lastY = Y;
    const H = vH;
    for (const p of list) {
      const top = p.top - Y;
      if (top + p.h < -80 || top > H + 80) continue;
      const enter = Math.max(0, Math.min(1, (H - top) / (H * .9)));      // 0 below the fold -> 1 when the top reaches the top
      const leave = Math.max(0, Math.min(1, -top / Math.max(1, p.h * .9)));
      const e = 1 - Math.pow(1 - enter, 3), k = (e * 1000 | 0) * 1000 + (leave * 1000 | 0);
      if (k === p.k) continue; p.k = k;
      p.wrap.style.transform = `translate3d(0, ${((1 - e) * 8 * H / 100 - leave * 4 * H / 100).toFixed(1)}px, 0) rotate(${((1 - e) * -1.2 + leave * .9).toFixed(3)}deg)`;
    }
  }

  // pause CSS animations (floating chips, word cloud, demo windows) in guide blocks that are off screen
  const offIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("off", !e.isIntersecting)), { rootMargin: "120px 0px" });
  const watchOff = () => doc.querySelectorAll(".part, .cloud, .feat:not([data-off])").forEach((el) => { if (el.dataset.off) return; el.dataset.off = "1"; offIO.observe(el); });
  new MutationObserver(watchOff).observe(doc, { childList: true });
  watchOff();

  if (reduce) document.documentElement.classList.add("pc-still");
  new MutationObserver(scan).observe(doc, { childList: true });
  scan();
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => list.forEach((p) => Math.abs((p.el.clientWidth || 0) - p.w) > 60 && shape(p)), 200); });
})();
