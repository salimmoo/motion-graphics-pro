/* Layer 4 · The guide (scroll), in eight numbered parts (1, 2 …) of topics (1.1, 1.2 …).
   - Each part opens with a cover whose photo fades into the one continuous page background.
   - Each topic: plain-language lead, "contoh hasil" windows (demos), an optional built-in block,
     and a drawer with the full technical rules gathered from the three skills (merged per topic).
   - Registry (js/registry.js) and the Paket Motion teaser (paket/data.js) mount lazily. */
window.Guide = (() => {
  const S = window.SKILL, V = window.VOLS || {}, G = window.GUIDE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const doc = $("#doc"), toc = $("#toc"), bar = $("#progress"), bgEl = $("#guideBg");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let built = false, io, lazyIO, running = false, raf = 0, parts = [], feats = [], cloud = null, mx = 0, my = 0;
  document.documentElement.classList.add("js");
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  const acc = (s) => String(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
  const plain = (s) => String(s).replace(/\*/g, "");
  const img = (k) => `assets/img/${k}.jpg`;
  const words = (s) => s.split(/(\s+)/).map((w) => (/\s/.test(w) ? w : `<span class="w"><span>${w}</span></span>`)).join("");

  // raw technical rules, merged per topic from the three skills
  const SRC_NAME = { ch: "Alur Produksi", mo: "Gerak", ve: "Vektor" };
  const rawOf = (key) => {
    const k = key.slice(0, 2);
    if (k === "ch") { const c = S.chapters.find((x) => x.n === +key.slice(2)); return c && { from: SRC_NAME.ch, title: c.title, html: c.html }; }
    const vol = k === "mo" ? V.motion : V.vector, c = vol && vol.chapters.find((x) => x.id === key);
    return c && { from: SRC_NAME[k], title: c.title, html: c.html };
  };
  const drawer = (keys) => {
    const list = (keys || []).map(rawOf).filter(Boolean);
    if (!list.length) return "";
    const from = [...new Set(list.map((x) => x.from))].join(" · ");
    return `<details class="raw rv"><summary><span class="raw-ic" aria-hidden="true"></span><span class="raw-t">Aturan lengkap dari skill</span><span class="raw-m">${list.length} bagian · ${from} · teknis</span></summary>
      <div class="raw-in">${list.map((x) => `<section class="raw-src"><p class="raw-from">${x.from} — ${x.title}</p><div class="prose">${x.html}</div></section>`).join("")}</div></details>`;
  };

  const cover = (p) => `<section class="part" id="p-${p.id}" data-part>
      <div class="part-img" style="background-image:url(${img(p.img)});background-position:${p.pos}"></div>
      <div class="part-in">
        <p class="part-n">Bagian <b>${p.n}</b> / ${G.PARTS.length}${p.star ? ' <i class="hl">★ unggulan</i>' : ""}</p>
        <h2 class="part-t"><span class="big">${words(p.title)}</span> <em>${words(p.accent)}</em></h2>
        <p class="part-tag">${p.tag}</p>
        <ol class="part-list">${p.topics.map((t, i) => `<li><a href="#${t.id}" data-jump="${t.id}"><b>${p.n}.${i + 1}</b>${plain(t.title)}</a></li>`).join("")}</ol>
      </div>
      <div class="part-chips" aria-hidden="true">${p.chips.filter((c) => c !== "Wikimedia").map((c, i) => `<span class="pchip" style="--x:${(60 + (i * 23) % 32)}%;--y:${(16 + (i * 19) % 56)}%;--d:${(i * .35).toFixed(2)}s">${c}</span>`).join("")}</div>
    </section>`;

  const feat = (id, backdrop) => {
    const d = G.DEMO[id]; if (!d) return "";
    return `<div class="feat rv" id="d-${id}" data-demo="${id}">
      <div class="feat-copy"><p class="feat-k">${d.k}</p><h3>${acc(d.h)}</h3><p class="feat-s">${d.s}</p></div>
      <div class="feat-stage">
        <div class="feat-bd" style="background-image:url(${img(backdrop)})"></div>
        <div class="chips-row"><span class="fchip a"><i>◆</i>${d.c[0]}</span><span class="fchip b"><i>◎</i>${d.c[1]}</span></div>
        <div class="win"><div class="win-h"><i></i><span>Contoh hasil · ${d.t}</span></div><div class="demo-body"></div></div>
      </div>
    </div>`;
  };

  /* ---------- built-in blocks ---------- */
  const SPECIAL = {
    about() {
      const A = G.ABOUT;
      return `<div class="about rv">
          <p class="big-q">${acc(A.pitch)}</p>
          <p class="about-o">${A.origin}</p>
        </div>
        <div class="skcards">${A.skills.map(([n, s, go], i) => `<a class="skcard rv" href="#${go}" data-jump="${go}" style="transition-delay:${i * 110}ms"><span class="skn">${i + 1}</span><h4>${n}</h4><p>${s}</p><em>Lihat bagiannya →</em></a>`).join("")}</div>
        <div class="cloud" aria-hidden="true">${A.words.map((w, i) => { const r = (k) => ((Math.sin((i + 1) * 12.9898 * k) * 43758.5453) % 1 + 1) % 1; return `<span style="--x:${(6 + r(1) * 84).toFixed(1)}%;--y:${(8 + r(2) * 78).toFixed(1)}%;--s:${(.8 + r(3) * 1.4).toFixed(2)};--dx:${(r(4) * 60 - 30).toFixed(0)}px;--dy:${(r(5) * 40 - 20).toFixed(0)}px;--t:${(9 + r(6) * 9).toFixed(1)}s;--z:${(.3 + r(7) * .7).toFixed(2)}">${w}</span>`; }).join("")}</div>
        <div class="strengths">${A.strengths.map(([h, p], i) => `<div class="stg-i rv" style="transition-delay:${(i % 4) * 80}ms"><b>${h}</b><p>${p}</p></div>`).join("")}</div>
        <div class="fit rv"><div class="fit-c"><h4>Cocok untuk</h4><ul><li>Explainer produk, layanan, atau gagasan</li><li>Iklan dan promo pendek</li><li>Music video dan klip lirik</li><li>Dokumenter dan video essay</li><li>Konten edukasi dan vertikal media sosial</li></ul></div>
          <div class="fit-c no"><h4>Kurang cocok untuk</h4><ul><li>Mengedit rekaman video yang sudah ada</li><li>Slide presentasi</li><li>Video AI realistis penuh tanpa desain</li></ul></div></div>`;
    },
    compare() {
      const C = G.COMPARE, mark = ["○", "◐", "●"];
      return `<div class="tbl-wrap cmp rv"><table><thead><tr><th>Kemampuan</th>${C.cols.map((x, i) => `<th class="${i ? "" : "us"}">${x}</th>`).join("")}</tr></thead><tbody>
        ${C.rows.map(([r, v]) => `<tr><td>${r}</td>${v.map((x, i) => `<td class="m m${x}${i ? "" : " us"}">${mark[x]}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div><p class="cmp-note">${C.note}</p>`;
    },
    templat() {
      return `<div class="tpl-tabs">${S.templates.map((t, i) => `<button type="button" data-t="${t.id}" class="${i ? "" : "on"}">${t.id}</button>`).join("")}</div><article class="panel prose rv" id="tplBody"></article>`;
    },
    minta() {
      const M = G.MINTA; if (!M) return "";
      const seg = (arr) => arr.map((x) => Array.isArray(x) ? `<a class="mk" href="#${x[1]}" data-jump="${x[1]}">${x[0]}<sup aria-hidden="true">↗</sup></a>` : x).join("");
      const txt = (arr) => arr.map((x) => Array.isArray(x) ? x[0] : x).join("");
      return `<div class="minta rv">
        <div class="mt-pola"><p class="mt-k">Pola dasar</p><p class="mt-q">${seg(M.pola)}</p></div>
        <div class="mt-tabs" role="tablist">${M.contoh.map((c, i) => `<button type="button" role="tab" class="${i ? "" : "on"}" data-i="${i}">${c.t}</button>`).join("")}</div>
        <div class="mt-cards">${M.contoh.map((c, i) => `<figure class="mt-card${i ? "" : " on"}" data-i="${i}"><figcaption>Contoh nyata · ${c.t}</figcaption><blockquote>${seg(c.p)}</blockquote>
          <button type="button" class="mt-copy" data-copy="${txt(c.p).replace(/"/g, "&quot;")}">Salin brief</button></figure>`).join("")}</div>
        <ul class="mt-tips">${M.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
      </div>`;
    },
    /* ---------- part 2 · the v2.4 workflow (data: G.V24) ---------- */
    frame() {
      const F = G.V24.frame, box = (w, h) => { const k = Math.min(116 / w, 82 / h); return `width:${(w * k).toFixed(1)}px;height:${(h * k).toFixed(1)}px`; };
      return `<div class="v4-frames rv">${F.opts.map(([r, sz, use, w, h]) => `<div class="v4-fr"><div class="v4-box" aria-hidden="true">${w ? `<i style="${box(w, h)}"></i>` : `<i class="m" style="${box(9, 16)}"></i><i class="m" style="${box(16, 9)}"></i><i class="m" style="${box(1, 1)}"></i>`}</div><b>${r}</b><span>${sz}</span><p>${use}</p></div>`).join("")}</div>
        <div class="strengths v4-3">${F.more.map(([h, p], i) => `<div class="stg-i rv" style="transition-delay:${i * 80}ms"><b>${h}</b><p>${p}</p></div>`).join("")}</div>
        <div class="code v4-cmd rv" data-lang="bash"><button class="copy" type="button">Salin</button><pre><code>${F.cmd}</code></pre></div>`;
    },
    pasang() {
      const P = G.V24.pasang;
      return `<ol class="v4-steps rv">${P.steps.map(([n, h, cmd, p]) => `<li><span class="v4-n">${n}</span><div><h4>${h}</h4><code class="v4-c">${cmd}</code><p>${p}</p></div></li>`).join("")}</ol>
        <div class="strengths v4-3">${P.facts.map(([h, p], i) => `<div class="stg-i rv" style="transition-delay:${i * 80}ms"><b>${h}</b><p>${p}</p></div>`).join("")}</div>`;
    },
    suara() {
      const V = G.V24.suara, L = G.V24.lbl;
      return `<div class="skcards v4-4">${V.opts.map(([k, h, p, tag], i) => `<div class="skcard v4-card rv" style="transition-delay:${i * 90}ms"><span class="skn">${k}</span><h4>${h}</h4><p>${p}</p><em>${tag}</em></div>`).join("")}</div>
        <div class="strengths v4-3">${V.tools.map(([h, p], i) => `<div class="stg-i rv" style="transition-delay:${i * 80}ms"><b>${h}</b><p>${p}</p></div>`).join("")}</div>
        <div class="v4-sample rv"><p class="v4-k">${L.listen}</p><audio controls preload="none" src="${V.sample[0]}"></audio><p class="cmp-note">${V.sample[1]}</p></div>
        <p class="v4-note rv"><b>${L.ethic}.</b> ${V.ethics}</p>`;
    },
    gratis() {
      const V = G.V24.gratis, L = G.V24.lbl;
      return `<div class="strengths v4-3">${V.routes.map(([h, p], i) => `<div class="stg-i rv" style="transition-delay:${i * 80}ms"><b>${h}</b><p>${p}</p></div>`).join("")}</div>
        <div class="v4-chips rv">${V.steps.map(([k, p]) => `<div class="v4-chip"><code>${k}</code><p>${p}</p></div>`).join("")}</div>
        <div class="v4-gal rv">${V.gallery.map(([src, cap]) => `<figure><img src="assets/img/${src}" alt="${cap}" loading="lazy" decoding="async"><figcaption>${cap}</figcaption></figure>`).join("")}</div>
        <div class="fit rv"><div class="fit-c"><h4>${L.lessons}</h4><ul>${V.lessons.map((x) => `<li>${x}</li>`).join("")}</ul></div><div class="fit-c no"><h4>${L.honest}</h4><p class="v4-p">${V.honest}</p></div></div>`;
    },
    prinsip24() {
      const V = G.V24.prinsip, [b0, b1, cap, t0, t1] = V.ba;
      return `<div class="v4-grid rv">${V.items.map(([h, p]) => `<div class="v4-pi"><b>${h}</b><p>${p}</p></div>`).join("")}</div>
        <figure class="v4-ba rv"><div><img src="assets/img/${b0}" alt="${t0}" loading="lazy" decoding="async"><span>${t0}</span></div><div><img src="assets/img/${b1}" alt="${t1}" loading="lazy" decoding="async"><span>${t1}</span></div><figcaption>${cap}</figcaption></figure>
        <div class="v4-gal wide rv">${V.gallery.map(([src, c]) => `<figure><img src="assets/img/${src}" alt="${c}" loading="lazy" decoding="async"><figcaption>${c}</figcaption></figure>`).join("")}</div>`;
    },
    proyek() {
      const V = G.V24.proyek;
      return `<ol class="v4-steps v4-line rv">${V.steps.map(([cmd, h, p], i) => `<li><span class="v4-n">${i + 1}</span><div><h4>${h}</h4><code class="v4-c">${cmd}</code><p>${p}</p></div></li>`).join("")}</ol>${V.note ? `<p class="v4-note rv">${V.note}</p>` : ""}`;
    },
    banding() {
      const V = G.V24.banding, mark = ["○", "◐", "●"];
      return `<div class="tbl-wrap cmp v4-tbl rv"><table><thead><tr>${V.cols.map((c) => `<th>${c}</th>`).join("")}<th></th></tr></thead><tbody>
        ${V.rows.map(([a, b, c, d, m]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td><td class="v4-num">${d}</td><td class="m m${m}">${mark[m]}</td></tr>`).join("")}
      </tbody></table></div><p class="cmp-note">${V.note}</p>`;
    },
    contoh() {
      const V = G.V24.contoh, [src, poster, h, p] = V.ad, L = G.V24.lbl;
      return `<div class="v4-ex rv">
          <figure class="v4-ad"><video controls playsinline preload="none" poster="assets/img/${poster}" width="540" height="960"><source src="assets/img/${src}" type="video/mp4"></video></figure>
          <div class="v4-ad-t"><p class="v4-k">${L.watch}</p><h3 class="sub-h">${h}</h3><p class="v4-p">${p}</p>
            <div class="v4-gal two">${V.items.map(([k, s, po, t, c]) => `<figure>${k === "video" ? `<video class="v4-loop" muted loop playsinline preload="none" poster="assets/img/${po}"><source src="assets/img/${s}" type="video/mp4"></video>` : `<img src="assets/img/${s}" alt="${t}" loading="lazy" decoding="async">`}<figcaption><b>${t}</b> ${c}</figcaption></figure>`).join("")}</div>
          </div>
        </div>`;
    },
    registry: () => `<div class="lazy" data-lazy="registry"><p class="lazy-msg">Memuat registry…</p></div>`,
    paket: () => `<div class="lazy" data-lazy="paket"><p class="lazy-msg">Memuat paket…</p></div>`,
    ack() {
      const A = G.ACK;
      return `<p class="t-lead rv">${A.lead}</p>${A.groups.map((g) => `<div class="ack-g rv"><h3 class="sub-h">${g.h}</h3><div class="ack-list">${g.items.filter(([n]) => !/Wikimedia/.test(n)).map(([n, what, how, url]) => `<div class="ack-i"><h4>${url ? `<a href="${url}" target="_blank" rel="noopener">${n} ↗</a>` : n}</h4><p>${what}</p><p class="ack-how">${how}</p></div>`).join("")}</div></div>`).join("")}
        <div class="ack-g rv"><p class="cmp-note">Ilustrasi gerbang, rasi, atelier, dan foto sampul tiap bagian dibuat khusus untuk situs ini.</p></div>`;
    },
  };

  function topic(p, t, i) {
    return `<section class="topic" id="${t.id}">
      <div class="t-head rv"><span class="t-num">${p.n}.${i + 1}</span><div><h2>${acc(t.title)}</h2>${t.lead ? `<p class="t-lead">${t.lead}</p>` : ""}</div></div>
      ${(t.demos || []).map((d) => feat(d, p.img)).join("")}
      ${t.special ? `<div class="special sp-${t.special}">${SPECIAL[t.special]()}</div>` : ""}
      ${drawer(t.raw)}
    </section>`;
  }

  function build() {
    if (built) return; built = true;
    const nDemo = Object.keys(G.DEMO).length;
    const stats = [["3", "skill dalam satu paket"], ["9", "langkah kerja"], ["5", "titik keputusan"], [String(S.templates.length), "alur kerja (workflow)"], [String(nDemo), "fitur interaktif"], ["104", "paket motion"]];
    let h = `<header class="hero" id="panduan">
      <p class="kicker rv">Panduan lengkap · Edisi 2026</p>
      <h1 class="rv">Motion Graphics <em>Pro</em></h1>
      <p class="sub rv">Dari brief sampai video jadi. Explainer, iklan, music video, dokumenter, dengan gaya vektor, 3D, tipografi, atau kolase kertas. Keputusan kreatif dan biaya selalu di tanganmu.</p>
      <div class="hero-cta rv"><a class="btn gold" href="#p-mulai" data-jump="p-mulai">Mulai membaca</a><a class="btn" href="#p-baru" data-jump="p-baru">Baru di v2.4</a><a class="btn" href="#p-gerak" data-jump="p-gerak">Gerak & tokoh</a><a class="btn" href="#paket" data-jump="paket">Paket Motion</a></div>
      <div class="stats">${stats.map(([n, l], i) => `<div class="stat rv" style="transition-delay:${i * 80}ms"><b data-count="${n}">0</b><span>${l}</span></div>`).join("")}</div>
    </header>`;
    G.PARTS.forEach((p) => { h += cover(p) + p.topics.map((t, i) => topic(p, t, i)).join(""); });
    h += `<footer class="foot"><p>Motion Graphics Pro · Alur Produksi · Gerak · Vektor</p>
      <div><button class="btn" type="button" data-go="cosmos">Kembali ke rasi</button> <button class="btn gold" type="button" data-go="gate">Tutup gerbang</button></div></footer>`;
    doc.innerHTML = h;

    // toc in the same 1 / 1.1 ladder
    toc.innerHTML = `<div class="tg"><a class="tg-h" href="#panduan" data-a="panduan"><b>·</b>Pembuka</a></div>` + G.PARTS.map((p) => `<div class="tg"><a class="tg-h" href="#p-${p.id}" data-a="p-${p.id}"><b>${p.n}</b>${p.title} ${p.accent}${p.star ? " ★" : ""}</a><div class="tg-i">${p.topics.map((t, i) => `<a href="#${t.id}" data-a="${t.id}"><b>${p.n}.${i + 1}</b>${plain(t.title)}</a>`).join("")}</div></div>`).join("");

    // templates
    const tb = $("#tplBody");
    if (tb) {
      const showT = (id) => { const t = S.templates.find((x) => x.id === id) || S.templates[0]; tb.innerHTML = `<h3 class="tpl-title" id="t-${t.id}">${t.id} · ${t.title}</h3>${t.html}`; $$(".tpl-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === t.id)); };
      $$(".tpl-tabs button").forEach((b) => b.addEventListener("click", () => showT(b.dataset.t)));
      showT(S.templates[0].id); Guide.showT = showT;
    }
    // 1.2 · brief examples: tabs swap the example card; "Salin brief" copies the plain text
    const mt = $(".minta");
    if (mt) {
      const show = (i) => { $$(".mt-tabs button", mt).forEach((b) => b.classList.toggle("on", b.dataset.i === i)); $$(".mt-card", mt).forEach((c) => c.classList.toggle("on", c.dataset.i === i)); };
      $$(".mt-tabs button", mt).forEach((b) => b.addEventListener("click", () => show(b.dataset.i)));
      mt.addEventListener("click", (e) => {
        const b = e.target.closest(".mt-copy"); if (!b) return;
        const done = () => { b.textContent = "Tersalin ✓"; setTimeout(() => (b.textContent = "Salin brief"), 1600); };
        const t = b.dataset.copy;
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done, () => {});
        else { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); done(); }
      });
    }

    doc.addEventListener("click", (e) => {
      const j = e.target.closest("[data-jump]");
      if (j) { e.preventDefault(); scrollToId(j.dataset.jump); return; }
      const b = e.target.closest(".copy"); if (!b) return;
      const code = b.parentElement.querySelector("code").innerText;
      (navigator.clipboard?.writeText(code) || Promise.reject()).then(() => { b.textContent = "Tersalin"; b.classList.add("ok"); setTimeout(() => { b.textContent = "Salin"; b.classList.remove("ok"); }, 1400); }).catch(() => {
        const ta = document.createElement("textarea"); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); b.textContent = "Tersalin";
      });
    });
    toc.addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); scrollToId(a.dataset.a); });

    // reveal: threshold 0 so very tall blocks also appear
    io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      if (en.target.classList.contains("stat")) count(en.target.querySelector("b"));
      if (en.target.dataset.demo) mountSoon(en.target, true);     // on screen now: next free frame, not idle time
      io.unobserve(en.target);
    }), { threshold: 0, rootMargin: "0px 0px -10% 0px" });
    $$(".rv, .part, .cloud").forEach((el) => io.observe(el));
    // heavy mounts (demos, registry, paket) are queued well before they reach the screen and run one per idle slot
    lazyIO = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { lazyIO.unobserve(en.target); mountSoon(en.target); } }), { rootMargin: (window.QUALITY && QUALITY.mobile ? "250px" : "700px") + " 0px" });
    $$("[data-lazy], .feat[data-demo]").forEach((el) => lazyIO.observe(el));
    // v2.4 example loops play only while on screen (no preload before that)
    const loops = $$("video.v4-loop");
    if (window.QUALITY && QUALITY.mobile) loops.forEach((v) => (v.controls = true));
    else {
      const vio = new IntersectionObserver((es) => es.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting && !reduce) { loops.forEach((o) => o !== v && o.pause()); v.preload = "auto"; const pr = v.play(); if (pr) pr.catch(() => {}); } else v.pause();
      }), { threshold: .6 });
      loops.forEach((v) => vio.observe(v));
    }
    parts = $$(".part").map((el) => ({ el, im: $(".part-img", el), tx: $(".part-in", el), ch: $(".part-chips", el) }));
    feats = $$(".feat").map((el) => ({ el, bd: $(".feat-bd", el) }));
    cloud = $(".cloud");
  }

  // mount queue: never two heavy mounts in the same frame
  const mq = []; let mqBusy = false, mqUrgent = false;
  const ric = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 600 }) : (f) => setTimeout(f, 50);
  function mountOne(el) {
    if (el.dataset.mounted) return; el.dataset.mounted = "1";
    if (el.dataset.demo) { if (window.Demos) Demos.mount(el.dataset.demo, el.querySelector(".demo-body")); }
    else mountLazy(el);
  }
  function pump() {
    mqBusy = false;
    if (performance.now() - lastScrollT < 180) { mqBusy = true; setTimeout(pump, 140); return; }   // never mount mid-fling
    while (mq.length && mq[0].dataset.mounted) mq.shift();
    if (!mq.length) return;
    mqBusy = true;
    const go = () => requestAnimationFrame(() => { const el = mq.shift(); if (el) mountOne(el); setTimeout(pump, 0); });
    if (mqUrgent) { mqUrgent = false; go(); } else ric(go);
  }
  function mountSoon(el, urgent) {
    if (el.dataset.mounted) return;
    const i = mq.indexOf(el); if (i >= 0) mq.splice(i, 1);
    if (urgent) { mq.unshift(el); mqUrgent = true; } else mq.push(el);
    if (!mqBusy) pump();
  }

  function mountLazy(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    const k = el.dataset.lazy;
    if (k === "registry") {
      if (window.Registry?.mount) { el.innerHTML = ""; Registry.mount(el); }
      else el.innerHTML = `<p class="lazy-msg">Registry belum tersedia di build ini.</p>`;
    }
    if (k === "paket") {
      if (window.PaketInline?.mount) PaketInline.mount(el);
      else el.innerHTML = `<div class="pk-teaser"><a class="btn gold" href="paket/index.html">Buka Paket Motion ↗</a></div>`;
    }
  }

  function count(b) {
    const n = +b.dataset.count, t0 = performance.now();
    const step = (now) => { const u = Math.min(1, (now - t0) / 1400); b.textContent = Math.round(n * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // old anchors (#ch5 …) resolve to the topic that now holds that chapter
  const resolve = (id) => {
    if (document.getElementById(id)) return id;
    for (const p of G.PARTS) for (const t of p.topics) if ((t.raw || []).includes(id)) return t.id;
    return id;
  };
  // sections above the target can grow while we travel (lazy registry/paket, demos mounting),
  // so keep steering toward the target until it is reached and stays put, unless the reader takes over
  let steer = 0;
  function scrollToId(id) {
    const el = document.getElementById(resolve(id.replace(/^#/, "")));
    if (!el) return;
    const my = ++steer, t0 = performance.now();
    const goal = () => Math.max(0, Math.min(el.getBoundingClientRect().top + scrollY - 70, document.documentElement.scrollHeight - innerHeight));
    const stopIt = () => { steer++; };
    addEventListener("wheel", stopIt, { once: true, passive: true }); addEventListener("touchstart", stopIt, { once: true, passive: true });
    let last = goal(), stable = 0;
    scrollTo({ top: last, behavior: reduce ? "auto" : "smooth" });
    const tick = () => {
      if (my !== steer) return;
      const g = goal(), el2 = performance.now() - t0;
      if (Math.abs(g - last) > 2) { last = g; stable = 0; scrollTo({ top: g, behavior: Math.abs(g - scrollY) > innerHeight * 1.5 && !reduce ? "smooth" : "auto" }); }
      else if (Math.abs(scrollY - g) < 3) stable++;
      if (stable < 6 && el2 < 4000) setTimeout(tick, 120);
      else if (Math.abs(scrollY - g) > 3) scrollTo(0, g);
    };
    setTimeout(tick, 120);
  }

  // geometry cache: absolute tops/heights, refreshed only when the document resizes (no layout reads per frame)
  let geo = null, geoDirty = true, lastY = -1, lastMx = 9, lastMy = 9, tocOn = "", maxScroll = 0;
  // scroll position and viewport height cached from events: reading scrollY inside rAF forces a full layout when
  // anything earlier in the frame touched styles, which was the main scroll cost on long pages
  let sY = scrollY, vH = innerHeight;
  let lastScrollT = 0, lastMeasure = 0;
  addEventListener("scroll", () => { sY = scrollY; lastScrollT = performance.now(); }, { passive: true });
  addEventListener("resize", () => { vH = innerHeight; sY = scrollY; });
  if (window.ResizeObserver) new ResizeObserver(() => (geoDirty = true)).observe(doc); else addEventListener("resize", () => (geoDirty = true));
  addEventListener("resize", () => (geoDirty = true));
  const abs = (el) => { const r = el.getBoundingClientRect(); return [r.top + scrollY, r.height]; };
  function measure() {
    geoDirty = false;
    maxScroll = document.documentElement.scrollHeight - innerHeight; sY = scrollY; vH = innerHeight;
    geo = {
      parts: parts.map((p) => abs(p.el)), feats: feats.map((f) => abs(f.el)), cloud: cloud ? abs(cloud) : null,
      toc: [...toc.querySelectorAll("a")].map((a) => { const el = document.getElementById(a.dataset.a); return [a, el ? abs(el)[0] : Infinity]; }),
    };
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    // geometry is re-read at most ~3 times a second (lazy demos and images resize the page while it scrolls)
    if (!geo || (geoDirty && now - lastMeasure > 320)) { lastMeasure = now; measure(); }
    const H = vH, Y = sY, moved = Y !== lastY, mouse = Math.abs(mx - lastMx) + Math.abs(my - lastMy) > .0005;
    if (!moved && !mouse) return;                       // idle: nothing to do
    lastY = Y; lastMx = mx; lastMy = my;
    bar.style.transform = `scaleX(${maxScroll > 0 ? Y / maxScroll : 0})`;
    bgEl.style.transform = `translate3d(${(mx * -14).toFixed(1)}px, ${(Math.sin(Y / 2400) * 18 + my * -10).toFixed(1)}px, 0) scale(1.08)`;
    if (!reduce && moved && !(window.QUALITY && QUALITY.mobile)) {
      parts.forEach((p, k) => {
        const [t, h] = geo.parts[k], top = t - Y; if (top + h < -50 || top > H + 50) return;
        const u = (H - top) / (H + h);
        p.im.style.transform = `translate3d(0, ${((u - .5) * -80).toFixed(1)}px, 0) scale(${(1.18 - u * .12).toFixed(3)})`;
        p.tx.style.transform = `translate3d(0, ${((u - .5) * -50).toFixed(1)}px, 0)`;
        p.ch.style.transform = `translate3d(0, ${((u - .5) * -140).toFixed(1)}px, 0)`;
      });
      feats.forEach((f, k) => {
        const [t, h] = geo.feats[k], top = t - Y; if (top + h < 0 || top > H) return;
        f.bd.style.transform = `translate3d(0, ${(((H - top) / (H + h) - .5) * -60).toFixed(1)}px, 0) scale(1.15)`;
      });
    }
    if (!reduce && cloud && geo.cloud) { const top = geo.cloud[0] - Y; if (top + geo.cloud[1] > 0 && top < H) cloud.style.setProperty("--mx", mx.toFixed(3)), cloud.style.setProperty("--my", my.toFixed(3)); }
    if (!moved) return;
    let on = "panduan";
    for (const [a, t] of geo.toc) if (t - Y < H * .4) on = a.dataset.a;
    if (on === tocOn) return;
    tocOn = on;
    geo.toc.forEach(([a]) => a.classList.toggle("on", a.dataset.a === on));
    const grp = toc.querySelector("a.on")?.closest(".tg");
    toc.querySelectorAll(".tg").forEach((g) => g.classList.toggle("open", g === grp));
  }

  function open(anchor) {
    build();
    if (!running) { running = true; raf = requestAnimationFrame(loop); }
    requestAnimationFrame(() => {
      if (!anchor || anchor === "#panduan") { scrollTo(0, 0); return; }
      let id = anchor.replace(/^#/, "");
      if (id.startsWith("t-") && Guide.showT) { Guide.showT(id.slice(2)); id = "ch16"; }
      if (id.startsWith("reg-")) { const el = $("[data-lazy=registry]"); if (el) { lazyIO.unobserve(el); mountLazy(el); } if (window.Registry?.open) Registry.open(id.slice(4)); id = "registry"; }
      const el = document.getElementById(resolve(id));
      if (!el) return;
      const jump = () => scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - 70));
      jump(); el.classList.add("in");
      let held = true; const off = () => { held = false; };
      addEventListener("wheel", off, { once: true, passive: true }); addEventListener("touchstart", off, { once: true, passive: true }); addEventListener("keydown", off, { once: true });
      [400, 1000, 1800, 3000].forEach((t) => setTimeout(() => held && jump(), t));
    });
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  return { open, stop, build };
})();
