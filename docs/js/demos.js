/* Interactive feature demos for layer 4. Every demo follows the numbers in SKILL.md.
   Each mounts once when it scrolls into view and only animates while visible. */
window.Demos = (() => {
  const L = window.LAYOUT || {};
  const mounted = new Set();
  const $ = (s, r) => r.querySelector(s);
  const $$ = (s, r) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = (u) => (u = clamp(u), u * u * (3 - 2 * u));
  const copyText = (txt, btn) => { (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => { if (btn) { const o = btn.textContent; btn.textContent = "Tersalin"; setTimeout(() => (btn.textContent = o), 1300); } }).catch(() => {}); };
  // run fn(dt, t) on rAF only while el is on screen
  const visLoop = (el, fn) => {
    let on = false, raf = 0, last = 0, t = 0;
    const tick = (now) => { if (!on) return; const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt; fn(dt, t); raf = requestAnimationFrame(tick); };
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !on) { on = true; last = 0; raf = requestAnimationFrame(tick); } else if (!e.isIntersecting) { on = false; cancelAnimationFrame(raf); } }, { threshold: .05 }).observe(el);
  };
  const STYLE = "Every element is a separate piece of real matte cardstock or textured paper with clean scissor-cut edges, stacked in visible depth layers with soft natural drop shadows between layers, subtle paper fibre grain, slight card thickness visible on edges, photographed straight on. Bright clean daylight, clean whites, rich natural colours. Not cartoon, not anime, not 3D render, not glossy, no sepia wash, no vintage filter. No readable text, letters, numbers, symbols, signs, logos or watermarks anywhere.";

  /* ============ 1 · ALUR & GERBANG ============ */
  function alur(el) {
    const ST = [
      ["Brief", "Tujuan video, durasi, platform tayang, dan benda apa yang ingin dihidupkan.", "Jawab pertanyaan brief", "B"],
      ["Konsep dan gaya", "Tiga konsep, satu gaya yang disarankan plus 2-3 alternatif, contoh gambar gaya, dan klip uji 3-5 detik.", "Wajib disetujui: konsep, gaya, dan elemen", "W"],
      ["Naskah", "Naskah, suara narator, teks per kata, dan susunan adegan.", "Wajib disetujui: naskah", "W"],
      ["Rencana", "Rencana tiap adegan, daftar gambar yang perlu dibuat, dan perkiraan kredit.", "Wajib disetujui: izin membuat gambar dan batas kredit", "W"],
      ["Buat aset", "Gambar dibuat sesuai izin, dicek satu per satu, lalu dicatat.", "Lapor, lalu lanjut", "L"],
      ["Potong", "Lembar gambar dipotong jadi potongan siap pakai, lengkap dengan lembar kontak.", "Lapor, lalu lanjut", "L"],
      ["Blok pertama", "Bagian pertama video dirakit lengkap dengan audio sebagai contoh tampilan.", "Wajib disetujui: blok pertama jadi acuan seluruh video", "W"],
      ["Blok berikutnya", "Bagian lain dirakit dan dicek; hanya yang berubah yang dilaporkan.", "Lapor, lalu lanjut", "L"],
      ["Render", "Video final dirender dan dicek untuk terakhir kali.", "Wajib: menunggu kata \"render\" dari kamu", "W"],
    ];
    const PILL = { W: ["w", "Wajib"], L: ["l", "Lapor"], B: ["b", "Jawab"] };
    const NS = "http://www.w3.org/2000/svg", RM = matchMedia("(prefers-reduced-motion: reduce)").matches, gs = window.gsap;
    el.innerHTML = `
      <div class="flow"><svg aria-hidden="true"><defs><linearGradient id="flowGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0"><stop offset="0" stop-color="#9c7a3c"/><stop offset=".55" stop-color="#e2c07c"/><stop offset="1" stop-color="#fff1c8"/></linearGradient></defs><path class="fp"/><path class="fp-on"/><g class="fcomet"></g></svg>${ST.map((s, i) => `<div class="stg" data-i="${i}"><i></i><div class="lb"><span><b>${String(i + 1).padStart(2, "0")}</b>${esc(s[0])}</span><em class="${PILL[s[3]][0]}">${PILL[s[3]][1]}</em></div></div>`).join("")}</div>
      <div class="flow-panel">
        <div class="gate-card"><span class="gt"></span><h4></h4><p class="out-k"></p><p class="gate-k"></p>
          <div class="ctrl"><button class="btn gold" data-a="run">Kerjakan tahap</button><button class="btn" data-a="ok" disabled>Setujui</button><button class="btn" data-a="rev" disabled>Minta revisi</button><button class="btn" data-a="hold">TAHAN</button><button class="btn" data-a="reset">Ulang</button></div></div>
        <div class="log" aria-live="polite"></div>
      </div>`;
    const flow = $(".flow", el), svg = $("svg", flow), grad = $("#flowGrad", flow), path = $(".fp", el), on = $(".fp-on", el), cg = $(".fcomet", el), nodes = $$(".stg", el), log = $(".log", el);
    const btn = (a) => $(`[data-a="${a}"]`, el);
    // comet: a bright head + fading trail of dots
    const dots = Array.from({ length: 8 }, (_, k) => { const c = document.createElementNS(NS, "circle"); c.setAttribute("class", "fc c" + k); c.setAttribute("r", (3.6 * (1 - k / 9)).toFixed(2)); c.setAttribute("opacity", (1 - k / 8).toFixed(2)); cg.appendChild(c); return c; });
    let cur = 0, shown = 0, busy = false, hold = false, waiting = false, drawn = false, len = 1, LN = [0], mob = false;
    const prog = { L: 0 };
    // Catmull-Rom through the stage points -> cubic Bezier segments
    const curve = (P) => {
      let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`; const segs = [];
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
        const c = `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
        d += " " + c; segs.push(`M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${c}`);
      }
      return [d, segs];
    };
    const tmp = document.createElementNS(NS, "path"); svg.appendChild(tmp); tmp.style.visibility = "hidden";
    const target = () => LN[Math.min(cur, LN.length - 1)];
    const pos = () => {
      const w = flow.clientWidth; if (!w) return;
      mob = w < 640;
      let P;
      if (mob) {
        const row = 50, top = 30; flow.style.height = (top * 2 + row * (ST.length - 1)) + "px";
        P = ST.map((_, i) => [26 + Math.sin(i * 1.15) * 9, top + i * row]);
      } else {
        flow.style.height = "";
        const h = flow.clientHeight, pad = Math.max(64, w * .065), amp = Math.min(40, h * .15);
        P = ST.map((_, i) => [pad + i * (w - pad * 2) / (ST.length - 1), h / 2 + (i % 2 ? 1 : -1) * amp * (i === 0 || i === ST.length - 1 ? .7 : 1)]);
      }
      const h = flow.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`); grad.setAttribute("x2", mob ? 0 : w); grad.setAttribute("y2", mob ? h : 0);
      nodes.forEach((n, i) => { n.style.left = P[i][0] + "px"; n.style.top = P[i][1] + "px"; n.classList.toggle("sd", mob); n.classList.toggle("up", !mob && i % 2 === 0); n.classList.toggle("dn", !mob && i % 2 === 1); });
      const [d, segs] = curve(P);
      path.setAttribute("d", d); on.setAttribute("d", d);
      len = path.getTotalLength(); LN = [0];
      segs.forEach((s) => { tmp.setAttribute("d", s); LN.push(LN[LN.length - 1] + tmp.getTotalLength()); });
      LN[LN.length - 1] = len;
      on.style.strokeDasharray = path.style.strokeDasharray = `${len} ${len + 10}`;
      if (drawn) path.style.strokeDashoffset = 0;
      if (gs) gs.killTweensOf(prog);
      prog.L = target(); on.style.strokeDashoffset = len - prog.L;
    };
    const setProg = () => {
      const to = target();
      if (!gs || RM) { prog.L = to; on.style.strokeDashoffset = len - to; return; }
      gs.to(prog, { L: to, duration: .9 + Math.abs(to - prog.L) / 900, ease: "power2.inOut", overwrite: true, onUpdate: () => (on.style.strokeDashoffset = len - prog.L) });
    };
    const pop = (i) => {
      if (!gs || RM || !drawn) return;
      gs.fromTo($("i", nodes[i]), { scale: .3 }, { scale: 1, duration: 1.1, ease: "elastic.out(1.15, .38)", delay: .55 });
      gs.fromTo($(".lb", nodes[i]), { y: mob ? 0 : (i % 2 ? -6 : 6), x: mob ? -6 : 0, opacity: .3 }, { y: 0, x: 0, opacity: 1, duration: .7, ease: "power3.out", delay: .55 });
    };
    // draw-on intro, once, when the flow first scrolls into view
    const intro = () => {
      if (drawn) return; drawn = true;
      if (!gs || RM) { path.style.strokeDashoffset = 0; return; }
      path.style.strokeDashoffset = len;
      gs.to(path, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" });
      nodes.forEach((n, i) => {
        const dl = .15 + 1.6 * (LN[i] / len);
        gs.fromTo($("i", n), { scale: 0 }, { scale: 1, duration: .9, ease: "elastic.out(1.2, .42)", delay: dl });
        gs.fromTo($(".lb", n), { opacity: 0, y: mob ? 0 : (i % 2 ? -8 : 8), x: mob ? -8 : 0 }, { opacity: 1, y: 0, x: 0, duration: .6, ease: "power3.out", delay: dl + .08 });
      });
    };
    if (gs && !RM) { path.style.strokeDashoffset = 1e4; nodes.forEach((n) => { gs.set($("i", n), { scale: 0 }); gs.set($(".lb", n), { opacity: 0 }); }); }
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { pos(); intro(); o.disconnect(); } }, { threshold: .35 }).observe(flow);
    const stamp = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const say = (s, c = "") => { const d = document.createElement("div"); d.innerHTML = `<span style="color:#9c7a3c">${stamp()}</span> ${c ? `<span style="color:${c}">` : ""}${s}${c ? "</span>" : ""}`; log.appendChild(d); log.scrollTop = log.scrollHeight; };
    const paint = () => {
      const s = ST[cur] || ST[ST.length - 1];
      nodes.forEach((n, i) => { n.classList.toggle("done", i < cur || (busy && cur === ST.length - 1 && i === cur && finished)); n.classList.toggle("now", i === cur && !finished); });
      const gt = $(".gt", el); gt.className = "gt " + (s[3] === "L" ? "l" : s[3] === "B" ? "b" : "w"); gt.textContent = s[3] === "W" ? "Gerbang wajib" : s[3] === "L" ? "Gerbang lapor" : "Menunggu jawaban";
      $("h4", el).textContent = `Tahap ${cur + 1} · ${s[0]}`; $(".out-k", el).innerHTML = `<b>Hasil</b> ${esc(s[1])}`; $(".gate-k", el).innerHTML = `<b>Gerbang</b> ${esc(s[2])}`;
      btn("run").disabled = busy || waiting || cur >= ST.length; btn("ok").disabled = btn("rev").disabled = !waiting;
      btn("hold").classList.toggle("on", hold); btn("hold").textContent = hold ? "TAHAN aktif" : "TAHAN";
      if (cur !== shown) { if (cur > shown) pop(cur); shown = cur; }
      setProg();
    };
    let finished = false;
    const next = () => { cur++; if (cur >= ST.length) { cur = ST.length - 1; finished = true; say("Video selesai dan dikirim, lengkap dengan cek akhir.", "#a8f0d3"); busy = true; paint(); nodes.forEach((n) => { n.classList.add("done"); n.classList.remove("now"); }); btn("run").disabled = true; return; } paint(); if (!hold && ST[cur][3] === "L") setTimeout(() => run(), 900); };
    function run() {
      if (busy || waiting) return; busy = true; paint();
      const s = ST[cur];
      say(`Claude mengerjakan tahap ${cur + 1}: ${s[0].toLowerCase()}…`);
      setTimeout(() => {
        busy = false;
        if (s[3] === "L") {
          say("Lapor: laporan cek mutu dan lembar kontak dikirim, semua cek penting lolos. Lanjut tanpa menunggu.", "#a8f0d3");
          if (hold) { say("TAHAN diterima: langkah yang sedang jalan diselesaikan, tidak ada pekerjaan baru. Menunggu kamu.", "#f2d796"); paint(); return; }
          next();
        } else {
          waiting = true;
          say(s[3] === "W" ? `${s[2]}. Hasil dikirim, Claude berhenti sampai kamu menjawab.` : "Pertanyaan brief dikirim; menunggu jawabanmu.", "#ffb3a3");
          paint();
        }
      }, 1100);
    }
    el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
      if (a === "run") { if (hold && ST[cur][3] === "L") { hold = false; } run(); }
      if (a === "ok" && waiting) { waiting = false; say(`Kamu menyetujui ${ST[cur][3] === "W" ? ST[cur][0].toLowerCase() : "brief"}.`, "#f2d796"); next(); }
      if (a === "rev" && waiting) { waiting = false; say("Revisi: hanya bagian yang kamu sebut yang dikerjakan ulang.", "#f2d796"); paint(); }
      if (a === "hold") { hold = !hold; say(hold ? "Kamu menulis TAHAN." : "TAHAN dicabut.", "#f2d796"); paint(); if (!hold && !waiting && !busy && ST[cur][3] === "L") run(); }
      if (a === "reset") { cur = 0; shown = 0; finished = false; busy = waiting = hold = false; log.innerHTML = ""; nodes.forEach((n) => n.classList.remove("done")); say("Proyek baru. Mulai dari brief."); paint(); }
    });
    let rz = 0; addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(pos); });
    // comet travels along the finished part of the path, on a loop
    visLoop(el, (dt, t) => {
      const L = prog.L;
      if (RM || L < 4 || !drawn) { cg.style.opacity = 0; return; }
      const dur = Math.max(.9, L / 260), cyc = dur + .7, u = (t % cyc) / dur;
      if (u > 1) { cg.style.opacity = 0; return; }
      cg.style.opacity = 1;
      const s = L * (1 - Math.pow(1 - u, 1.6));
      dots.forEach((c, k) => { const p = on.getPointAtLength(Math.max(0, s - k * 6)); c.setAttribute("cx", p.x.toFixed(1)); c.setAttribute("cy", p.y.toFixed(1)); });
    });
    say("Siap. Tekan \"Kerjakan tahap\" untuk mulai dari brief.");
    pos(); paint();
  }

  /* ============ 2 · PARALLAX PLAYGROUND ============ */
  function parallax(el) {
    // kit order from build_assets: 0 sun, 1 cloud, 2 far hills, 3 near hills, 4 house, 5 tree, 6 grass, 7 boat
    const D = [
      { i: 0, n: "matahari", cx: 1010, bottom: 300, w: 210, k: .12, t0: .95, from: "t", off: 300 },
      { i: 1, n: "awan", cx: 330, bottom: 215, w: 240, k: .15, t0: .15, from: "l", off: 360 },
      { i: 1, n: "awan 2", cx: 1120, bottom: 160, w: 160, k: .18, t0: .32, from: "r", off: 340, flip: true },
      { i: 2, n: "bukit jauh", cx: 640, bottom: 540, w: 1560, k: .25, t0: .5, from: "b", off: 220 },
      { i: 3, n: "bukit dekat", cx: 640, bottom: 640, w: 1600, k: .4, t0: .7, from: "b", off: 300 },
      { i: 4, n: "rumah", cx: 430, bottom: 588, w: 230, k: .55, t0: 1.05, from: "b", off: 170 },
      { i: 5, n: "pohon", cx: 720, bottom: 600, w: 190, k: .62, t0: 1.25, from: "b", off: 200 },
      { i: 7, n: "perahu (hero)", cx: 1000, bottom: 668, w: 270, k: .72, t0: 1.8, from: "pop", off: 0 },
      { i: 6, n: "rumput depan", cx: 250, bottom: 770, w: 560, k: .9, t0: 2.2, from: "b", off: 270 },
      { i: 6, n: "rumput depan", cx: 1060, bottom: 780, w: 600, k: .92, t0: 2.38, from: "b", off: 280, flip: true },
      { i: 6, n: "rumput depan", cx: 660, bottom: 800, w: 520, k: .9, t0: 2.52, from: "b", off: 260 },
    ];
    el.innerHTML = `<div class="stage16"><div class="lt"></div></div>
      <div class="ctrl"><button class="btn gold" data-a="replay">Rakit ulang</button><button class="btn on" data-a="twos">On twos</button><button class="btn" data-a="boil">Boil ±0,7 px</button><button class="btn" data-a="k">Tampilkan nilai k</button>
      <label class="fld" style="grid-auto-flow:column;align-items:center">Zoom kamera <input type="range" min="1" max="1.15" step=".005" value="1" data-a="z"></label><span class="tclock"></span></div>`;
    const st = $(".stage16", el), clock = $(".tclock", el);
    const grain = document.createElement("canvas"); grain.className = "gr"; grain.width = 320; grain.height = 180;
    { const g = grain.getContext("2d"), id = g.createImageData(320, 180); let s = 7; for (let p = 0; p < id.data.length; p += 4) { s = (s * 16807) % 2147483647; const v = 128 + ((s % 255) - 127) * .9; id.data[p] = id.data[p + 1] = id.data[p + 2] = v; id.data[p + 3] = 255; } g.putImageData(id, 0, 0); }
    const pcs = D.map((d) => {
      const im = document.createElement("img"); im.className = "pc"; im.src = `assets/img/kit-${d.i}.webp`; im.alt = ""; im.draggable = false;
      const meta = (L.kit || [])[d.i] || { w: 1, h: 1 };
      d.h = d.w * meta.h / meta.w;
      const lab = document.createElement("span"); lab.className = "klab"; lab.textContent = `${d.n} · k ${d.k}`;
      st.appendChild(im); st.appendChild(lab); return { d, im, lab };
    });
    st.appendChild(grain);
    let t = 0, twos = true, boil = false, z = 1, camX = 0, tcam = 0;
    st.addEventListener("pointermove", (e) => { const r = st.getBoundingClientRect(); tcam = ((e.clientX - r.left) / r.width - .5) * -120; });
    st.addEventListener("pointerleave", () => (tcam = 0));
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
      if (a === "replay") t = 0;
      if (a === "twos") { twos = !twos; b.classList.toggle("on", twos); b.textContent = twos ? "On twos" : "On ones"; }
      if (a === "boil") { boil = !boil; b.classList.toggle("on", boil); }
      if (a === "k") { st.classList.toggle("showk"); b.classList.toggle("on"); }
    });
    $("[data-a=z]", el).addEventListener("input", (e) => (z = +e.target.value));
    const PV = [640, 560];
    visLoop(el, (dt) => {
      t += dt; if (t > 6.5) t = 0;
      camX += (tcam - camX) * .08;
      const S = st.clientWidth / 1280, tq = twos ? Math.floor(t * 12) / 12 : Math.floor(t * 24) / 24, f = Math.floor(t * 12);
      clock.textContent = `t ${tq.toFixed(3)} s · gambar ${twos ? f : Math.floor(t * 24)}`;
      pcs.forEach(({ d, im, lab }, idx) => {
        const u = tq - d.t0;
        if (u < 0) { im.style.opacity = 0; lab.style.visibility = "hidden"; return; }
        const e = Math.exp(-u / .17), o = d.off * e;
        const dx = d.from === "l" ? -o : d.from === "r" ? o : 0, dy = d.from === "b" ? o : d.from === "t" ? -o : 0;
        const pop = d.from === "pop" ? 1 - .08 * e : 1;
        const zl = Math.pow(z, .25 + .75 * d.k);
        const bx = boil ? Math.sin(f * 12.9898 + idx * 78.233 + 1) * .7 : 0, by = boil ? Math.sin(f * 12.9898 + idx * 78.233 + 2) * .7 : 0;
        const X = PV[0] + (d.cx + dx + bx - PV[0]) * zl + camX * d.k, Y = PV[1] + (d.bottom + dy + by - PV[1]) * zl;
        const sc = pop * zl, w = d.w * sc, h = d.h * sc;
        im.style.width = d.w * S + "px";
        im.style.transform = `translate(${((X - w / 2) * S).toFixed(2)}px, ${((Y - h) * S).toFixed(2)}px) scale(${sc.toFixed(4)})${d.flip ? " scaleX(-1)" : ""}`;
        im.style.transformOrigin = d.flip ? "50% 0" : "0 0";
        im.style.opacity = Math.min(1, u / .2).toFixed(3);
        lab.style.visibility = "visible"; lab.style.left = (X * S - 30) + "px"; lab.style.top = ((Y - h) * S + 4) + "px";
      });
    });
  }

  /* ============ 3 · PROMPT BUILDER ============ */
  function prompt(el) {
    const T = {
      kit: { n: "Kit set 21:9", r: "21:9", f: [["lokasi", "Lokasi, era", "a quiet coastal village at sunrise"], ["pieces", "Potongan (satu per baris)", "a large warm sun disc with soft rays\na fluffy white cloud\na small white house with a red roof, front view, facing frame right\na small wooden fishing boat, side view, facing frame left"]] },
      plate: { n: "Plate 9:16", r: "9:16", f: [["cam", "Kamera", "eye-level"], ["vp", "Titik hilang (% dari atas)", "45"], ["set", "Set (lokasi, waktu, cahaya, benda tetap)", "a narrow market street at morning, light from frame left, stalls on both sides"]] },
      seq: { n: "Sequence 6 frame", r: "21:9", f: [["char", "Deskripsi tokoh (identik di setiap prompt)", "adult man, slim, short black hair, cream long shirt, brown trousers, sandals"], ["act", "Aksi", "walk"]] },
      face: { n: "Kit wajah", r: "21:9", f: [["lip", "Warna bibir", "dusty rose"], ["hair", "Warna rambut / alis", "dark brown"], ["obj", "Benda berwajah? (ya/tidak)", "tidak"]] },
      crowd: { n: "Crowd 2 state", r: "21:9", f: [["people", "Orang (satu per baris)", "elderly woman in a green headscarf, facing frame right\nboy in a white shirt, facing frame left"]] },
      model: { n: "Model sheet", r: "21:9", f: [["char", "Deskripsi tokoh", "a cardboard box with rounded corners, kraft brown, plain with no face"], ["close", "Tiga close-up", "head and face; hands; signature prop"]] },
    };
    el.innerHTML = `<div class="cols"><div>
        <div class="ctrl" style="margin-top:0">${Object.entries(T).map(([k, v], i) => `<button class="btn${i ? "" : " on"}" data-t="${k}">${v.n}</button>`).join("")}</div>
        <div class="fields" style="display:grid;gap:12px;margin-top:16px"></div>
        <div class="ctrl"><label class="fld" style="grid-auto-flow:column;align-items:center">Resolusi <select data-res><option value="2">2K · 2,75 kredit</option><option value="1">1K · 1,5 kredit</option></select></label><span class="tclock cost"></span></div>
      </div><div><div class="out" aria-live="polite"></div><div class="ctrl"><button class="btn gold" data-copy>Salin prompt</button></div></div></div>`;
    let type = "kit";
    const fields = $(".fields", el), out = $(".out", el), res = $("[data-res]", el), cost = $(".cost", el);
    const val = (k) => ($(`[data-f="${k}"]`, el)?.value || "").trim();
    const draw = () => {
      fields.innerHTML = T[type].f.map(([k, l, d]) => `<label class="fld">${l}${d.includes("\n") || d.length > 60 ? `<textarea data-f="${k}" rows="4">${esc(d)}</textarea>` : `<input data-f="${k}" value="${esc(d)}">`}</label>`).join("");
      gen();
    };
    const gen = () => {
      let p = "";
      if (type === "kit") {
        const pcs = val("pieces").split("\n").filter(Boolean);
        p = `CANVAS: Wide 21:9 sheet on a flat plain pure white background. ${pcs.length} separate cut-paper pieces for one location (${val("lokasi")}) in 2 loose rows, white space of at least one tenth of the sheet width between pieces, each piece complete and not touching another, all at one consistent scale.\nPIECES: ${pcs.map((x, i) => `${i + 1}. ${x}.`).join(" ")}\nSTYLE: ${STYLE}\nONLY: Show only the listed pieces on the plain background; add nothing else.`;
      } else if (type === "plate") {
        p = `CANVAS: Vertical 9:16 scene, ${val("cam")}, one-point perspective, vanishing point at the horizontal centre about ${val("vp")} percent from the top. Empty scene: no people. Keep the lower third clear and low-detail for pieces added later.\nSET: ${val("set")}.\nSTYLE: ${STYLE}\nONLY: Show only what this prompt describes; add nothing else.`;
      } else if (type === "seq") {
        const walk = "FRAMES (side view, facing frame right; every body part changes in every frame): F1 contact, front heel down, rear toe pushing off; F2 down, weight on the front leg, knee bent; F3 passing, rear leg swinging past the standing leg; F4 contact, other leg in front; F5 down; F6 passing. Arms swing opposite to the legs; head and hair follow one beat later.";
        const wave = "FRAMES (front view): F1 arm relaxed; F2 lifting, elbow bent; F3 hand at shoulder, palm out; F4 above head tilted to frame left; F5 upright; F6 tilted to frame right.";
        p = `CANVAS: Wide 21:9 sheet on a flat plain pure white background. Six full-body frames of the same character in one horizontal row, six equal columns, identical size, feet on one shared baseline, a white gutter of at least a quarter column between figures.\nCHARACTER: ${val("char")}. Paper collage figure with natural human proportions; each limb is one smooth continuous paper shape. Smooth blank face.\n${/wave|lambai/i.test(val("act")) ? wave : walk}\nSTYLE: ${STYLE}\nONLY: Show only the six figures on the white background; add nothing else.`;
      } else if (type === "face") {
        const obj = /^y/i.test(val("obj"));
        p = `CANVAS: Wide 21:9 sheet on a flat plain pure white background, ${obj ? "three rows" : "two rows"}, one scale for a face 160 px wide, generous white space.\nROW 1: eight cut-paper mouths in ${val("lip")}: closed relaxed; wide open showing upper teeth; medium open, lips stretched; rounded open; small tight rounded; lips pressed together; lower lip under the upper front teeth; closed gentle smile.\nROW 2: six pairs of cut-paper eyebrows in ${val("hair")}: neutral; raised; frowning; worried; angry; happy.${obj ? "\nROW 3: six pairs of cut-paper eyes: open; closed as a curved line; wide open; half-lidded; looking frame left; looking frame right." : ""}\nSTYLE: ${STYLE}\nONLY: Show only the pieces listed in the rows above on the white background; add nothing else.`;
      } else if (type === "crowd") {
        const ppl = val("people").split("\n").filter(Boolean);
        p = `CANVAS: Wide 21:9 sheet on a flat plain pure white background. ${ppl.length} people in one row; each person twice side by side, calm on the left and reacting on the right; identical size, feet on one shared baseline, a white gap between people.\nPEOPLE: ${ppl.map((x, i) => `${i + 1}. ${x}; calm: standing relaxed; reacting: surprised, hands raised, leaning back.`).join(" ")}\nSTYLE: ${STYLE}\nONLY: Show only these figures on the white background; add nothing else.`;
      } else {
        p = `CANVAS: Wide 21:9 sheet on a flat plain pure white background. Left two thirds: the same character in four full-body views in one row (front, three-quarter facing frame right, side facing frame right, back), identical scale, feet on one shared baseline, white gutters between views. Right third: three close-ups at a larger scale: ${val("close")}.\nCHARACTER: ${val("char")}.\nSTYLE: ${STYLE}\nONLY: Show only these views and close-ups on the white background; add nothing else.`;
      }
      out.textContent = p;
      cost.textContent = `Rasio ${T[type].r} · ${res.value === "2" ? "2,75" : "1,5"} kredit per gambar · Claude minta izin dulu`;
    };
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) { type = b.dataset.t; $$("[data-t]", el).forEach((x) => x.classList.toggle("on", x === b)); draw(); } if (e.target.closest("[data-copy]")) copyText(out.textContent, e.target); });
    el.addEventListener("input", gen); res.addEventListener("change", gen);
    draw();
  }

  /* ============ 4 · ENTRY FORMULA ============ */
  function rumus(el) {
    el.innerHTML = `<canvas class="graph"></canvas>
      <div class="lane"><b>On ones · 24 gambar per detik</b><i data-l="1"></i></div><div class="lane"><b>On twos · 12 gambar per detik</b><i data-l="2"></i></div>
      <div class="ctrl"><label class="fld" style="grid-auto-flow:column;align-items:center">off (px) <input type="range" min="80" max="420" value="320" data-off></label><span class="tclock" data-info></span></div>`;
    const cv = $("canvas", el), g = cv.getContext("2d"), off = $("[data-off]", el), info = $("[data-info]", el), l1 = $('[data-l="1"]', el), l2 = $('[data-l="2"]', el);
    const T3 = -0.17 * Math.log(.03);
    visLoop(el, (dt, t) => {
      const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const O = +off.value, pad = 36, X = (s) => pad + s / 1.2 * (w - pad * 2), Y = (v) => h - pad - v / O * (h - pad * 2);
      g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1;
      for (let s = 0; s <= 1.2; s += .1) { g.beginPath(); g.moveTo(X(s), pad); g.lineTo(X(s), h - pad); g.stroke(); }
      g.fillStyle = "rgba(167,159,140,.9)"; g.font = "500 11px 'Geist Mono', monospace";
      for (let s = 0; s <= 1.2; s += .2) g.fillText(s.toFixed(1) + " s", X(s) - 12, h - 14);
      g.fillText("sisa jarak", 6, pad - 14);
      // continuous
      g.strokeStyle = "rgba(242,215,150,.55)"; g.lineWidth = 1.5; g.beginPath();
      for (let s = 0; s <= 1.2; s += .005) { const v = O * Math.exp(-s / .17); s ? g.lineTo(X(s), Y(v)) : g.moveTo(X(s), Y(v)); } g.stroke();
      // on twos staircase
      g.strokeStyle = "#f2d796"; g.lineWidth = 2; g.beginPath();
      for (let k = 0; k <= 14.4; k++) { const s0 = k / 12, v = O * Math.exp(-s0 / .17); const a = X(s0), b = X(Math.min(1.2, (k + 1) / 12)); k ? g.lineTo(a, Y(v)) : g.moveTo(a, Y(v)); g.lineTo(b, Y(v)); } g.stroke();
      // 3% marker
      g.strokeStyle = "#ffb3a3"; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(T3), pad); g.lineTo(X(T3), h - pad); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#ffb3a3"; g.fillText(`3% · ${T3.toFixed(2)} s ≈ ${Math.round(T3 * 24)} frame`, X(T3) + 6, pad + 12);
      const loop = t % 1.6, tq1 = Math.floor(loop * 24) / 24, tq2 = Math.floor(loop * 12) / 12;
      g.fillStyle = "#fff3d2"; g.beginPath(); g.arc(X(Math.min(1.2, loop)), Y(O * Math.exp(-Math.min(1.2, loop) / .17)), 4, 0, 6.28); g.fill();
      const lw = l1.parentElement.clientWidth - 40;
      const p1 = 1 - Math.exp(-tq1 / .17), p2 = 1 - Math.exp(-tq2 / .17);
      l1.style.left = (10 + p1 * lw * .9) + "px"; l2.style.left = (10 + p2 * lw * .9) + "px";
      l1.style.opacity = Math.min(1, tq1 / .2); l2.style.opacity = Math.min(1, tq2 / .2);
      info.textContent = `jarak ${O} px menyusut cepat lalu melambat · diam dalam 14-16 frame`;
    });
  }

  /* ============ 5 · PERSONIFIED OBJECT ============ */
  function mood(el) {
    // a chibi paper coffee cup (short, round, big face, stubby arms) on a cosy cafe table, paper-collage scene;
    // steam and a little emote above the lid react to the mood
    const FACES = {
      normal: { brow: "M-31 -67 Q-24 -70 -16 -67 M16 -67 Q24 -70 31 -67", mouth: "M-8 -31 Q0 -25 8 -31", eye: 1, steam: 1, arm: 18, emo: "" },
      senang: { brow: "M-31 -71 Q-24 -77 -16 -71 M16 -71 Q24 -77 31 -71", mouth: "M-12 -34 Q0 -15 12 -34 Z", eye: .55, steam: 1.25, arm: 128, emo: "heart" },
      sedih: { brow: "M-31 -62 L-16 -69 M16 -69 L31 -62", mouth: "M-9 -25 Q0 -33 9 -25", eye: .85, steam: .4, arm: -12, emo: "drop" },
      kaget: { brow: "M-31 -77 Q-24 -82 -16 -77 M16 -77 Q24 -82 31 -77", mouth: "M-6 -31 a6 7.5 0 1 0 12 0 a6 7.5 0 1 0 -12 0", eye: 1.2, steam: 1.7, arm: 140, emo: "bang" },
      marah: { brow: "M-31 -73 L-15 -64 M15 -64 L31 -73", mouth: "M-10 -27 Q0 -34 10 -27", eye: .8, steam: 2.4, arm: 70, emo: "anger" },
    };
    const NAME = { normal: "Normal", senang: "Senang", sedih: "Sedih", kaget: "Kaget", marah: "Marah" };
    const BASE = 18, TOP = -121;                                 // cup sits on y = 18 (table top), lid dome top at -112
    // paper-collage scene: every shape is a cut piece with a hard offset shadow underneath
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const torn = (x0, x1, y, amp, step = 9) => { let d = `M${x0} ${y}`; for (let x = x0 + step; x < x1; x += step) d += ` L${x.toFixed(1)} ${(y + (rnd() - .5) * amp).toFixed(1)}`; return d + ` L${x1} ${y}`; };
    const cut = (d, fill, sh = .3, dx = 3, dy = 4, extra = "") => `<path d="${d}" fill="rgba(20,8,14,${sh})" transform="translate(${dx} ${dy})"/><path d="${d}" fill="${fill}" ${extra}/>`;
    const bok = []; for (let i = 0; i < 26; i++) { const x = -205 + rnd() * 300, y = -195 + rnd() * 160, r = 5 + rnd() * 15, c = ["#ffcf7a", "#ffb36b", "#ff8f6b", "#8fd3ff", "#ffe6a8", "#c9a4ff"][i % 6]; bok.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${(.18 + rnd() * .35).toFixed(2)}" filter="url(#mdSoft)"/>`); }
    const rain = []; for (let i = 0; i < 18; i++) { const x = -200 + rnd() * 290, y = -195 + rnd() * 150; rain.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} l-2 9" />`); }
    const wainTop = torn(-320, 320, -26, 5);
    const scene = `
        <rect x="-320" y="-240" width="640" height="320" fill="url(#mdWall)"/>
        <rect x="-320" y="-240" width="640" height="320" fill="url(#mdDots)" opacity=".5"/>
        ${cut("M-228 -214 L118 -214 L118 -30 L-228 -30 Z", "#6b4630", .35, 4, 5)}
        <rect x="-218" y="-204" width="326" height="166" fill="url(#mdNight)"/>
        <path d="M-218 -92 L-176 -104 L-176 -122 L-150 -122 L-150 -98 L-118 -110 L-118 -134 L-84 -134 L-84 -104 L-40 -116 L-40 -96 L-6 -104 L-6 -128 L30 -128 L30 -100 L70 -112 L108 -100 L108 -38 L-218 -38 Z" fill="#1a2140" opacity=".9"/>
        <g opacity=".85">${[[-170, -116], [-160, -112], [-108, -126], [-96, -120], [-74, -126], [12, -120], [22, -114], [-28, -108]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="6" fill="#ffd98a" opacity=".7"/>`).join("")}</g>
        <g>${bok.join("")}</g>
        <g stroke="rgba(220,235,255,.28)" stroke-width="1.4" stroke-linecap="round">${rain.join("")}</g>
        <path d="M-218 -204 L108 -204 L108 -196 L-218 -196 Z" fill="rgba(255,255,255,.06)"/>
        <path d="M-210 -200 L-150 -200 L-206 -60 Z" fill="rgba(255,255,255,.05)"/>
        <rect x="-60" y="-204" width="9" height="166" fill="#6b4630"/><rect x="-218" y="-124" width="326" height="8" fill="#6b4630"/>
        ${cut("M-236 -222 L126 -222 L126 -200 Q117 -190 108 -200 Q99 -190 90 -200 Q81 -190 72 -200 Q63 -190 54 -200 Q45 -190 36 -200 Q27 -190 18 -200 Q9 -190 0 -200 Q-9 -190 -18 -200 Q-27 -190 -36 -200 Q-45 -190 -54 -200 Q-63 -190 -72 -200 Q-81 -190 -90 -200 Q-99 -190 -108 -200 Q-117 -190 -126 -200 Q-135 -190 -144 -200 Q-153 -190 -162 -200 Q-171 -190 -180 -200 Q-189 -190 -198 -200 Q-207 -190 -216 -200 Q-226 -190 -236 -200 Z", "#d9a441", .3)}
        <path d="M-236 -214 L126 -214" stroke="rgba(255,240,200,.45)" stroke-width="1.5" stroke-dasharray="4 5"/>
        <g class="md-lamp">
          <circle cx="206" cy="-168" r="96" fill="url(#mdGlow)"/>
          <path d="M206 -240 L206 -206" stroke="#1b1216" stroke-width="2"/>
          ${cut("M190 -206 L222 -206 L238 -178 L174 -178 Z", "#2f6b62", .32)}
          <path d="M180 -182 L232 -182" stroke="rgba(255,255,255,.18)" stroke-width="3"/>
          <ellipse cx="206" cy="-176" rx="13" ry="5.5" fill="#ffe7a6"/>
        </g>
        ${cut("M148 -96 L300 -96 L300 -86 L148 -86 Z", "#7a5136", .32)}
        ${cut("M160 -96 L160 -122 Q160 -128 166 -128 L182 -128 Q188 -128 188 -122 L188 -96 Z", "#c9e0d6", .25)}
        <path d="M164 -118 L184 -118" stroke="rgba(60,90,80,.35)" stroke-width="5"/>
        ${cut("M200 -96 L204 -116 L228 -116 L232 -96 Z", "#c8673f", .28)}
        ${cut("M216 -116 Q204 -140 210 -152 Q220 -138 216 -116 Z M216 -116 Q226 -146 240 -150 Q236 -132 216 -116 Z M216 -116 Q196 -128 190 -140 Q206 -138 216 -116 Z", "#5f8f52", .25)}
        ${cut("M246 -96 L246 -134 L276 -134 L276 -96 Z", "#efe2c4", .25)}
        <path d="M250 -126 L272 -126 M250 -118 L268 -118 M250 -110 L270 -110" stroke="#b9a37a" stroke-width="2"/>
        ${cut(wainTop + " L320 2 L-320 2 Z", "#5a3a3e", .3, 0, -3)}
        <path d="${torn(-320, 320, -14, 3, 12)}" fill="none" stroke="rgba(255,230,200,.12)" stroke-width="1.5"/>
        ${cut("M-320 2 L320 2 L320 34 L-320 34 Z", "url(#mdWood)", .35, 0, -4)}
        <g stroke="rgba(60,30,14,.35)" stroke-width="1.3" fill="none"><path d="M-300 12 Q-200 8 -90 13 T120 12 T300 10"/><path d="M-310 24 Q-180 20 -40 25 T200 22 T310 24"/></g>
        ${cut("M-320 34 L320 34 L320 80 L-320 80 Z", "#4a2c1a", .25, 0, -3)}
        <path d="M-320 34 L320 34" stroke="rgba(255,214,160,.28)" stroke-width="1.6"/>
        <g class="md-plant">
          <ellipse cx="-176" cy="20" rx="24" ry="5" fill="rgba(20,8,14,.35)"/>
          ${cut("M-194 18 L-198 -6 L-154 -6 L-158 18 Z", "#d77c4f", .28)}
          <path d="M-199 -6 L-153 -6 L-153 0 L-199 0 Z" fill="#c06a40"/>
          ${cut("M-176 -6 Q-198 -26 -196 -44 Q-180 -30 -176 -6 Z M-176 -6 Q-170 -38 -152 -48 Q-154 -24 -176 -6 Z M-176 -6 Q-182 -40 -174 -58 Q-164 -38 -176 -6 Z", "#6ea35c", .22)}
          <path d="M-176 -8 Q-178 -30 -174 -52" stroke="rgba(255,255,255,.25)" stroke-width="1.2" fill="none"/>
        </g>
        <g class="md-menu">
          ${cut("M128 18 L142 -26 L170 -26 L184 18 Z", "#f3e6c8", .3)}
          <path d="M145 -14 L167 -14 M143 -6 L169 -6 M141 2 L171 2" stroke="#b08d5a" stroke-width="2"/>
          <text x="156" y="-17" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="8" fill="#7a4e2c" font-style="italic">menu</text>
        </g>
        <g class="md-sugar">
          <ellipse cx="218" cy="20" rx="20" ry="4.5" fill="rgba(20,8,14,.3)"/>
          ${cut("M204 18 L202 -8 Q218 -14 234 -8 L232 18 Z", "rgba(214,236,240,.82)", .2)}
          <path d="M204 2 L232 2 L232 18 L204 18 Z" fill="#fffaf0" opacity=".9"/>
          <path d="M201 -8 Q218 -16 235 -8 L235 -13 Q218 -21 201 -13 Z" fill="#c9a45e"/>
        </g>`;
    el.innerHTML = `<div class="mood-stage"><svg class="mood-scene" viewBox="-320 -240 640 300" preserveAspectRatio="xMidYMid slice" aria-label="Cangkir kopi chibi berwajah di meja kafe">
        <defs>
          <linearGradient id="mdWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c1d2a"/><stop offset=".7" stop-color="#3d2830"/><stop offset="1" stop-color="#4a2f33"/></linearGradient>
          <pattern id="mdDots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".9" fill="rgba(255,230,200,.18)"/><circle cx="10" cy="11" r=".7" fill="rgba(0,0,0,.25)"/></pattern>
          <linearGradient id="mdNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111a3a"/><stop offset=".65" stop-color="#2b3566"/><stop offset="1" stop-color="#5a4a78"/></linearGradient>
          <radialGradient id="mdGlow"><stop offset="0" stop-color="rgba(255,214,140,.55)"/><stop offset=".45" stop-color="rgba(255,190,110,.16)"/><stop offset="1" stop-color="rgba(255,190,110,0)"/></radialGradient>
          <linearGradient id="mdWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b27a4b"/><stop offset="1" stop-color="#8a5a35"/></linearGradient>
          <filter id="mdSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
          <linearGradient id="mdCup" x1="0" x2="1"><stop offset="0" stop-color="#e2d8c4"/><stop offset=".3" stop-color="#fffaf0"/><stop offset=".65" stop-color="#f5eee0"/><stop offset="1" stop-color="#cdbfa6"/></linearGradient>
          <linearGradient id="mdSlv" x1="0" x2="1"><stop offset="0" stop-color="#9e6a3c"/><stop offset=".35" stop-color="#d39a60"/><stop offset=".7" stop-color="#c2884f"/><stop offset="1" stop-color="#8d5d33"/></linearGradient>
          <linearGradient id="mdLid" x1="0" x2="1"><stop offset="0" stop-color="#cfc6b3"/><stop offset=".35" stop-color="#fbf7ee"/><stop offset="1" stop-color="#bfb49e"/></linearGradient>
        </defs>
        ${scene}
        <g transform="translate(0 ${BASE}) scale(.86) translate(0 ${-BASE})">
        <ellipse class="sh" cx="0" cy="${BASE + 1}" rx="58" ry="7" fill="rgba(30,12,6,.45)"/>
        <g class="steam" fill="none" stroke="rgba(255,250,235,.62)" stroke-width="5" stroke-linecap="round">
          <path d="M-20 -118 q-9 -12 0 -24 q9 -12 0 -24"/><path d="M0 -121 q9 -12 0 -24 q-9 -12 0 -24"/><path d="M20 -118 q-9 -12 0 -24 q9 -12 0 -24"/>
        </g>
        <g class="emo"></g>
        <g class="body">
          <g class="arm armL" transform="translate(-61 -40)"><path d="M0 0 Q-8 12 -6 24" stroke="#8f8066" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M0 0 Q-8 12 -6 24" stroke="#fbf5e8" stroke-width="10.5" stroke-linecap="round" fill="none"/></g>
          <g class="arm armR" transform="translate(61 -40) scale(-1 1)"><path d="M0 0 Q-8 12 -6 24" stroke="#8f8066" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M0 0 Q-8 12 -6 24" stroke="#f0e7d6" stroke-width="10.5" stroke-linecap="round" fill="none"/></g>
          <ellipse cx="-22" cy="${BASE - 1}" rx="13" ry="6" fill="#8f8066"/><ellipse cx="22" cy="${BASE - 1}" rx="13" ry="6" fill="#8f8066"/>
          <ellipse cx="-22" cy="${BASE - 2.5}" rx="11" ry="4.2" fill="#d8ccb4"/><ellipse cx="22" cy="${BASE - 2.5}" rx="11" ry="4.2" fill="#d8ccb4"/>
          <path d="M-64 -84 L64 -84 C63 -50 56 -6 47 9 Q43 15 34 15 L-34 15 Q-43 15 -47 9 C-56 -6 -63 -50 -64 -84 Z" fill="url(#mdCup)" stroke="#8f8066" stroke-width="1.8"/>
          <path d="M-52 -76 C-53 -48 -50 -22 -42 -4" stroke="rgba(255,255,255,.6)" stroke-width="6" stroke-linecap="round" fill="none"/>
          <path d="M-57.5 -18 L57.5 -18 C54 -3 50 4 47 9 Q43 15 34 15 L-34 15 Q-43 15 -47 9 C-50 4 -54 -3 -57.5 -18 Z" fill="url(#mdSlv)" stroke="#7a5230" stroke-width="1.2"/>
          <path d="M-55 -13 L55 -13" stroke="rgba(255,236,200,.4)" stroke-width="1.2" stroke-dasharray="3 4"/>
          <path d="M0 9 c-5 -4 -9 -6.5 -9 -10 a4.5 4.5 0 0 1 9 -1.5 a4.5 4.5 0 0 1 9 1.5 c0 3.5 -4 6 -9 10 Z" fill="#fbf1dc" opacity=".92"/>
          <path d="M-61 -97 Q-57 -111 -40 -112 L40 -112 Q57 -111 61 -97 Z" fill="url(#mdLid)" stroke="#8f8066" stroke-width="1.5"/>
          <path d="M-30 -111 Q-28 ${TOP} -18 ${TOP} L18 ${TOP} Q28 ${TOP} 30 -111 Z" fill="url(#mdLid)" stroke="#8f8066" stroke-width="1.5"/>
          <ellipse cx="11" cy="-117" rx="7" ry="2" fill="#5e4c36"/>
          <rect x="-73" y="-99" width="146" height="17" rx="8.5" fill="url(#mdLid)" stroke="#8f8066" stroke-width="1.5"/>
          <path d="M-66 -94 L66 -94" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-linecap="round"/>
          <g class="face">
            <ellipse cx="-38" cy="-37" rx="10" ry="6.5" fill="#f29c8f" opacity=".55"/><ellipse cx="38" cy="-37" rx="10" ry="6.5" fill="#f29c8f" opacity=".55"/>
            <path d="M-44 -40 l4 -3 M-38 -40 l4 -3 M38 -40 l4 -3 M44 -40 l4 -3" stroke="#e98476" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
            <path class="brow" fill="none" stroke="#3b2a14" stroke-width="4.5" stroke-linecap="round"/>
            <g class="eyes"><ellipse class="eye" cx="-23" cy="-48" rx="10" ry="13" fill="#1b130a"/><ellipse class="eye" cx="23" cy="-48" rx="10" ry="13" fill="#1b130a"/>
              <g class="glint"><circle cx="-19" cy="-53" r="3.6" fill="#fff"/><circle cx="27" cy="-53" r="3.6" fill="#fff"/><circle cx="-26" cy="-43" r="1.6" fill="#fff" opacity=".85"/><circle cx="20" cy="-43" r="1.6" fill="#fff" opacity=".85"/></g></g>
            <path class="mouth" fill="#5a1f14" stroke="#3b2a14" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g></g></g></svg></div>
      <div class="ctrl">${Object.keys(FACES).map((k, i) => `<button class="btn${i ? "" : " on"}" data-m="${k}">${NAME[k]}</button>`).join("")}<button class="btn gold" data-m="lompat">Lompat</button><span class="tclock" data-st></span></div>`;
    const body = $(".body", el), eyes = $(".eyes", el), glint = $(".glint", el), brow = $(".brow", el), mouth = $(".mouth", el), sh = $(".sh", el), st = $("[data-st]", el), steam = $(".steam", el), puffs = $$(".steam path", el);
    const emo = $(".emo", el), armL = $(".armL", el), armR = $(".armR", el);
    const EMO = {
      heart: `<path d="M0 6 c-6 -5 -11 -8 -11 -13 a5.5 5.5 0 0 1 11 -2 a5.5 5.5 0 0 1 11 2 c0 5 -5 8 -11 13 Z" fill="#ff7f8e" stroke="#7a2a3a" stroke-width="1.5"/><path d="M26 -10 c-3.5 -3 -6.5 -4.6 -6.5 -7.6 a3.2 3.2 0 0 1 6.5 -1.2 a3.2 3.2 0 0 1 6.5 1.2 c0 3 -3 4.6 -6.5 7.6 Z" fill="#ffb0b8" stroke="#7a2a3a" stroke-width="1.2"/>`,
      drop: `<path d="M30 -16 q7 10 7 15 a7 7 0 0 1 -14 0 q0 -5 7 -15 Z" fill="#8fc8ff" stroke="#2b4a78" stroke-width="1.5"/><path d="M-10 -6 q-18 0 -18 -10 q0 -9 11 -9 q4 -9 15 -7 q10 -5 16 4 q10 1 8 10 q-1 8 -14 8 Z" fill="#9aa7c4" stroke="#3b4566" stroke-width="1.5" opacity=".9"/>`,
      bang: `<g fill="#ffd36b" stroke="#6b4a12" stroke-width="1.5"><path d="M-30 -20 l6 -2 l2 22 l-4 1 Z"/><circle cx="-24" cy="7" r="3"/><path d="M28 -22 l6 1 l-3 22 l-4 -1 Z"/><circle cx="29" cy="6" r="3"/></g>`,
      anger: `<g transform="translate(34 -6)" fill="none" stroke="#e8463a" stroke-width="3.2" stroke-linecap="round"><path d="M-9 -3 q4 -1 5 -6 M3 -9 q1 4 6 5 M9 3 q-4 1 -5 6 M-3 9 q-1 -4 -6 -5"/></g>`,
    };
    let mood0 = "normal", want = null, tk = -1, kind = "", blinkT = 2.5, steamK = 1, steamT = 0, armA = FACES.normal.arm, emoK = 0;
    const apply = (m) => { const F = FACES[m]; brow.setAttribute("d", F.brow); mouth.setAttribute("d", F.mouth); mouth.setAttribute("fill", m === "senang" || m === "kaget" ? "#5a1f14" : "none"); eyes.dataset.s = F.eye; emo.innerHTML = EMO[F.emo] || ""; emoK = 0; };
    apply("normal");
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-m]"); if (!b) return;
      if (b.dataset.m === "lompat") { kind = "jump"; tk = 0; return; }
      if (b.dataset.m === mood0) return;
      want = b.dataset.m; kind = "take"; tk = 0;
      $$("[data-m]", el).forEach((x) => x.classList.toggle("on", x === b));
    });
    const center = () => { const r = body.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 3]; };
    visLoop(el, (dt, t) => {
      const tq = Math.floor(t * 12) / 12;                     // on twos
      let sy = 1, lift = 0, eyeY = 0, armT = FACES[want && tk >= 0 ? mood0 : mood0].arm;
      if (tk >= 0) {
        tk += dt; const k = Math.floor(tk * 12) / 12;
        if (kind === "take") {
          eyeY = k < .17 ? -5 * (k / .17) : 0;                    // eyes lead 2 drawings before the body
          const a = k - .17;
          if (a < 0) sy = 1;
          else if (a < .25) { sy = 1 - .18 * sm(a / .25); armT = -20; }   // anticipation: squash down 3 drawings, arms tuck in
          else { if (want) { mood0 = want; apply(want); want = null; if (window.FX && FX.burst) FX.burst(...center(), 18, .6); } const s = a - .25; sy = 1 + .15 * Math.exp(-5 * s) * Math.sin(3 * Math.PI * 2 * s + Math.PI * .5); if (s > 1.2) tk = -1; }
          st.textContent = a < 0 ? "mata bergerak lebih dulu" : a < .25 ? "ancang-ancang · memampat" : "wajah baru, lalu memantul pelan";
        } else {
          if (k < .25) { sy = 1 - .2 * sm(k / .25); armT = -20; st.textContent = "ancang-ancang"; }
          else if (k < .95) { const u = (k - .25) / .7; lift = Math.sin(Math.PI * u) * 78; sy = 1 + .12 * Math.sin(Math.PI * u) * (u < .5 ? 1 : -.4); armT = 160; st.textContent = "melompat"; }
          else if (k < 1.5) { const u = k - .95; sy = 1 - .2 * Math.exp(-6 * u) * Math.cos(u * 18); st.textContent = "mendarat, meredam"; }
          else tk = -1;
        }
      } else st.textContent = `suasana: ${NAME[mood0].toLowerCase()} · 12 gambar per detik`;
      const sx = 1 + (1 - sy) * .5;                             // squash keeps area
      body.setAttribute("transform", `translate(0 ${(-lift).toFixed(1)}) translate(0 ${BASE}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(0 ${-BASE})`);
      const ss = Math.max(.4, 1 - lift / 160); sh.setAttribute("rx", (58 * ss * sx).toFixed(1)); sh.setAttribute("opacity", ss.toFixed(2));
      // stubby arms follow the mood on twos: wave when happy, shake when angry, droop when sad
      armA += (armT - armA) * Math.min(1, dt * 10);
      const wig = mood0 === "senang" && tk < 0 ? Math.sin(tq * 9) * 14 : mood0 === "marah" && tk < 0 ? Math.sin(tq * 26) * 7 : mood0 === "normal" ? Math.sin(tq * 2) * 4 : 0;
      const aq = Math.round((armA + wig) / 2) * 2;
      armL.setAttribute("transform", `translate(-61 -40) rotate(${aq})`);
      armR.setAttribute("transform", `translate(61 -40) scale(-1 1) rotate(${mood0 === "senang" && tk < 0 ? Math.round((armA - wig) / 2) * 2 : aq})`);
      // steam rides on top of the (squashed) lid; it rises faster and thicker when the cup is upset, thin and slow when sad
      steamK += ((FACES[mood0].steam || 1) - steamK) * Math.min(1, dt * 3); steamT += dt * steamK;
      const sq = Math.floor(steamT * 12) / 12, topY = -lift + (BASE - TOP) * (1 - sy);
      steam.setAttribute("transform", `translate(0 ${topY.toFixed(1)})`);
      puffs.forEach((p, i) => {
        const u = ((sq * .55 + i * .33) % 1), droop = mood0 === "sedih" ? 10 : 0;
        p.setAttribute("transform", `translate(${(Math.sin(sq * 2.2 + i * 2) * (3 + steamK * 1.5)).toFixed(1)} ${(-u * 22 + droop).toFixed(1)}) scale(1 ${mood0 === "sedih" ? .7 : 1})`);
        p.setAttribute("opacity", (Math.sin(Math.PI * u) * Math.min(1, .3 + steamK * .4)).toFixed(2));
        p.setAttribute("stroke-width", (3 + steamK * 1.5).toFixed(1));
      });
      steam.setAttribute("stroke", mood0 === "marah" ? "rgba(255,190,175,.8)" : mood0 === "sedih" ? "rgba(200,215,240,.5)" : "rgba(255,250,235,.62)");
      // emote pops in after the new face, then floats
      emoK = Math.min(1, emoK + dt * 3);
      const pop = emoK < 1 ? 1 + .35 * Math.sin(Math.PI * emoK) : 1, fl = Math.sin(tq * 3) * 3;
      emo.setAttribute("transform", `translate(0 ${(TOP - 52 + topY + fl).toFixed(1)}) scale(${(sm(emoK * 2) * pop).toFixed(3)})`);
      blinkT -= dt; const blink = blinkT < 0 && blinkT > -.17; if (blinkT < -.17) blinkT = 2 + Math.random() * 3;
      const es = +eyes.dataset.s || 1;
      $$(".eye", el).forEach((e) => e.setAttribute("ry", blink ? 1.4 : (13 * es).toFixed(1)));
      glint.setAttribute("opacity", blink || es < .7 ? 0 : 1);
      eyes.setAttribute("transform", `translate(${Math.sin(tq * .7) * 2} ${eyeY})`);
    });
  }

  /* ============ 6 · LIP-SYNC (port of viseme_id.py) ============ */
  function lipsync(el) {
    const VIS = { a: "A", o: "O", u: "U", w: "U", f: "FV", v: "FV", i: "E", e: "E", "é": "E", y: "E", m: "MBP", b: "MBP", p: "MBP" };
    function visemes(chars, starts, ends, dur, draw = 12, gapMin = 2 / 12, wK = .5) {
      const seg = []; let tag = false;
      chars.forEach((c, i) => {
        if (c === "[") tag = true;
        if (tag) { tag = c !== "]"; return; }
        if (/\p{L}/u.test(c)) seg.push([starts[i], ends[i], VIS[c.toLowerCase()] || "e"]);
      });
      for (let i = 0; i < seg.length - 1; i++) if (seg[i + 1][0] - seg[i][1] < gapMin) seg[i][1] = seg[i + 1][0];
      const n = Math.round(dur * draw), ov = (a, b, k) => Math.max(0, Math.min(b, (k + 1) / draw) - Math.max(a, k / draw)), out = [];
      for (let k = 0; k < n; k++) {
        const cov = {};
        for (const [a, b, v] of seg) { const [V, w] = v === "e" ? ["E", wK] : [v, 1]; const o = ov(a, b, k); if (o > 0) cov[V] = (cov[V] || 0) + w * o; }
        const ks = Object.keys(cov); out.push(ks.length ? ks.reduce((p, q) => (cov[p] >= cov[q] ? p : q)) : "X");
      }
      for (const [a, b, v] of seg) {
        if (v !== "MBP") continue;
        const ks = []; for (let k = 0; k < n; k++) if (ov(a, b, k) > 0) ks.push(k);
        if (ks.length && !ks.some((k) => out[k] === "MBP")) out[ks.reduce((p, q) => (ov(a, b, p) >= ov(a, b, q) ? p : q))] = "MBP";
      }
      return out.map((v, k) => ({ t: +(k / draw).toFixed(4), v }));
    }
    // narrator asset (half body). The picture is split into three layers copied
    // from the episode asset: body, head (turns a little around the neck) and chin/beard (drops when the mouth opens).
    // The mouth is drawn at the asset's mouth point (face_nar_ep02.json: mouth y 164, skin centre x 183, lenses 116-140,
    // brows 109.5) in the asset's own manner: a thin dark line when closed, a dark opening with teeth when open.
    const MOUTH = {
      X: "M-8 0.2 Q0 1.2 8 0.2", MBP: "M-7.5 0 Q0 0.9 7.5 0", senyum: "M-10 -1.6 Q0 4.2 10 -1.6",
      A: "M-8.5 -1 Q0 -3 8.5 -1 Q6 9 0 9.6 Q-6 9 -8.5 -1 Z", E: "M-10 -0.8 Q0 -2.6 10 -0.8 Q6 5 0 5.4 Q-6 5 -10 -0.8 Z",
      O: "M-5.5 -1.6 Q0 -4.6 5.5 -1.6 Q6.6 4.6 0 7.6 Q-6.6 4.6 -5.5 -1.6 Z", U: "M-3.8 -0.8 Q0 -3 3.8 -0.8 Q4.4 3.6 0 4.8 Q-4.4 3.6 -3.8 -0.8 Z",
      FV: "M-8 -0.6 Q0 -2.2 8 -0.6 Q5 3 0 3.3 Q-5 3 -8 -0.6 Z",
    };
    const MX = 183, MY = 164, PIV = [183, 184], IMG = "assets/img/narator/";
    const lens = (cx) => `<g transform="translate(${cx} 127.6)"><g class="ls-lid" opacity="0"><circle r="11.4" fill="rgba(112,96,88,.42)"/><path d="M-8.5 0.6 Q0 4.4 8.5 0.6" fill="none" stroke="#2a1c18" stroke-width="1.4" stroke-linecap="round"/><path d="M-6 -4 Q0 -6.5 6 -4" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1"/></g></g>`;
    el.innerHTML = `<div class="ls-wrap"><div class="ls-face"><svg viewBox="12 14 346 346" aria-label="Narator berbicara">
        <defs>
          <radialGradient id="lsBg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#f3d9a4"/><stop offset=".38" stop-color="#e9a46a"/><stop offset=".62" stop-color="#c27060"/><stop offset=".85" stop-color="#8a4a55"/><stop offset="1" stop-color="#2e1828"/></radialGradient>
          <filter id="lsSh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#2e1828" flood-opacity=".38"/></filter>
          <clipPath id="lsMc"><path class="mc"/></clipPath>
        </defs>
        <rect x="12" y="14" width="346" height="346" fill="url(#lsBg)"/>
        <circle cx="185" cy="150" r="150" fill="rgba(255,240,205,.22)"/>
        <g class="ls-bust" filter="url(#lsSh)">
          <image href="${IMG}nar_badan.webp" x="0" y="12" width="370" height="460"/>
          <g class="ls-head">
            <image href="${IMG}nar_kepala.webp" x="90" y="12" width="180" height="178"/>
            <image class="ls-chin" href="${IMG}nar_dagu.webp" x="140" y="160" width="86" height="34"/>
            <path class="ls-brows" d="M150.5 111.6 Q160.5 106.8 172.5 110.2 M194.8 110.2 Q206.5 106.8 221 111.6" fill="none" stroke="#2a1c17" stroke-width="1.7" stroke-linecap="round"/>
            ${lens(160.5)}${lens(208)}
            <g transform="translate(${MX} ${MY})">
              <path class="m" fill="#3a1414"/>
              <g clip-path="url(#lsMc)"><rect class="ls-teeth" x="-12" y="-4" width="24" height="5" fill="#f7f2e8"/><ellipse class="ls-tongue" cx="0" cy="7.6" rx="5.2" ry="3.2" fill="#c8605a"/></g>
              <path class="ml" fill="none" stroke="#6e3a2e" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>
            </g>
          </g>
        </g>
        <text class="vlab" x="340" y="348" text-anchor="end" font-family="Geist Mono, monospace" font-size="11" fill="#fbeed2"></text></svg></div>
      <div><label class="fld">Kalimat (bahasa Indonesia, tag emosi dalam [ ] tidak diucapkan)<textarea data-txt>[excited] Halo, apa kabar semuanya?</textarea></label>
        <div class="ctrl"><button class="btn gold" data-a="play">Putar</button><button class="btn" data-a="json">Salin JSON</button><span class="tclock" data-t></span></div>
        <div class="vstrip"></div></div></div>`;
    const ta = $("[data-txt]", el), strip = $(".vstrip", el), mp = $(".m", el), ml = $(".ml", el), mc = $(".mc", el), teeth = $(".ls-teeth", el), tongue = $(".ls-tongue", el), lab = $(".vlab", el), tl = $("[data-t]", el);
    const head = $(".ls-head", el), bust = $(".ls-bust", el), brows = $(".ls-brows", el), lids = $$(".ls-lid", el), chin = $(".ls-chin", el);
    const OPEN = { A: 1, O: .8, E: .5, U: .4, FV: .25, MBP: 0, X: 0, senyum: .08 };
    let V = [], t = 0, playing = true, spans = [], excited = false;
    const build = () => {
      const s = ta.value, ch = [], st = [], en = []; let c = 0;
      excited = /\[(excited|senang|semangat|happy)\]/i.test(s);
      for (const x of s) { const d = /[,.;:!?]/.test(x) ? .25 : .07; ch.push(x); st.push(c); en.push(c + d); c += d; }
      V = visemes(ch, st, en, c + .2);
      strip.innerHTML = V.map((v) => `<span class="${v.v}">${v.v}</span>`).join(""); spans = $$("span", strip); t = 0;
    };
    ta.addEventListener("input", build);
    el.addEventListener("click", (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (a === "play") { t = 0; playing = true; } if (a === "json") copyText(JSON.stringify(V), e.target); });
    build();
    let lastK = -1, shape = "X", openK = 0, blinkT = 1.6, tt = 0, accent = 0;
    const setMouth = (sh) => {
      const d = MOUTH[sh] || MOUTH.X, open = !(sh === "X" || sh === "senyum" || sh === "MBP");
      mp.setAttribute("d", open ? d : ""); mc.setAttribute("d", open ? d : ""); ml.setAttribute("d", d);
      ml.setAttribute("stroke", open ? "#6e3a2e" : "#5a2c24"); ml.setAttribute("stroke-width", open ? 0.9 : sh === "MBP" ? 1.8 : 1.3);
      teeth.setAttribute("opacity", sh === "A" || sh === "E" || sh === "FV" ? 1 : 0); tongue.setAttribute("opacity", sh === "A" || sh === "O" ? 1 : 0);
    };
    setMouth("X");
    visLoop(el, (dt) => {
      tt += dt;
      if (playing && V.length) {
        t += dt; const k = Math.min(V.length - 1, Math.floor(t * 12));
        if (k !== lastK) {
          const v = V[k].v, prev = shape; shape = k === V.length - 1 ? "senyum" : v;
          setMouth(shape);
          // a small head accent whenever the mouth opens wide after being closed (stressed syllable)
          if ((OPEN[shape] || 0) >= 0.8 && (OPEN[prev] || 0) < 0.5) accent = 1;
          lab.textContent = shape; spans.forEach((s, i) => s.classList.toggle("on", i === k)); if (spans[k]) spans[k].scrollIntoView({ block: "nearest", inline: "nearest" });
          tl.textContent = `t ${(k / 12).toFixed(3)} s · gambar ${k}/${V.length - 1}`; lastK = k;
        }
        if (t > V.length / 12 + 1.2) t = 0;
      }
      // jaw follows the mouth opening; the head turns a little around the neck (slow sway + talking accents);
      // breathing lifts the bust; brows lift on [excited] and on wide vowels
      openK += ((OPEN[shape] || 0) - openK) * Math.min(1, dt * 14);
      accent = Math.max(0, accent - dt * 3.2);
      const talk = t < V.length / 12, br = Math.sin(tt * 6.2832 / 4.2);
      const rot = Math.sin(tt * 0.9) * 0.9 + (talk ? Math.sin(tt * 3.1) * 0.6 : 0) - accent * 0.8, nod = accent * 1.2 + openK * 0.5;
      head.setAttribute("transform", `translate(${(Math.sin(tt * 0.7) * 0.6).toFixed(2)} ${(nod - br * 0.6).toFixed(2)}) rotate(${rot.toFixed(2)} ${PIV[0]} ${PIV[1]})`);
      bust.setAttribute("transform", `translate(0 ${(-br * 0.6).toFixed(2)})`);
      chin.setAttribute("transform", `translate(0 ${(openK * 2.6).toFixed(2)})`);
      brows.setAttribute("transform", `translate(0 ${((excited ? -2.4 : 0) - openK * 1.1 - accent * 0.8).toFixed(2)})`);
      blinkT -= dt; const blink = blinkT < 0 && blinkT > -.14; if (blinkT < -.14) blinkT = 2.4 + Math.random() * 2.6;
      lids.forEach((g2) => g2.setAttribute("opacity", blink ? 1 : 0));
    });
  }

  /* ============ 7 · KINETIC TYPE (T8) ============ */
  function tipo(el) {
    el.innerHTML = `<div class="kt-stage"><div class="bgk"></div><div class="kt-card"><div class="kt-kick"></div><div class="kt-head"></div></div></div>
      <div class="cols" style="margin-top:14px"><label class="fld">Kicker<input data-k value="KISAH KECIL SEHARI-HARI"></label><label class="fld">Headline (*kata kunci*)<input data-h value="Yang *dibagikan* justru tetap ada"></label></div>
      <div class="ctrl"><button class="btn gold" data-a="play">Putar ulang</button><label class="fld" style="grid-auto-flow:column;align-items:center">Kata / detik <input type="range" min="1.2" max="3.5" step=".01" value="2.06" data-sp></label><span class="tclock" data-t></span></div>`;
    const card = $(".kt-card", el), kick = $(".kt-kick", el), head = $(".kt-head", el), ki = $("[data-k]", el), hi = $("[data-h]", el), sp = $("[data-sp]", el), tl = $("[data-t]", el);
    let words = [], t = 0;
    const build = () => {
      kick.textContent = ki.value;
      const parts = hi.value.match(/\*[^*]+\*|\S+/g) || [];
      head.innerHTML = parts.map((p, i) => p.startsWith("*") ? `<span class="kt-w kt-kw" data-i="${i}"><i class="kt-hl"></i>${esc(p.slice(1, -1))}</span>` : `<span class="kt-w" data-i="${i}">${esc(p)}</span>`).join(" ");
      words = $$(".kt-w", head).map((w, i) => ({ w, key: w.classList.contains("kt-kw"), hl: $(".kt-hl", w), t: .55 + i / +sp.value }));
      t = 0;
    };
    [ki, hi, sp].forEach((x) => x.addEventListener("input", build));
    el.addEventListener("click", (e) => { if (e.target.closest('[data-a="play"]')) t = 0; });
    build();
    const F = 1 / 24, expo = (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
    visLoop(el, (dt) => {
      t += dt;
      const t1 = (words.at(-1)?.t || 1) + .5 + .3 * words.length, end = t1 + .18;
      if (t > end + 1) t = 0;
      const cu = expo(clamp(t / .6));
      card.style.transform = `translateX(${(-630 * (1 - cu)).toFixed(1)}px) rotate(-1.2deg)`;
      card.style.opacity = (cu * (1 - clamp((t - t1) / .18))).toFixed(3);
      kick.style.opacity = clamp(t / (4 * F));
      for (const w of words) {
        const u = clamp((t - (w.t - F)) / (5 * F)), e2 = 1 - Math.pow(1 - u, 2);
        let sc = 1;
        if (w.key) { const d = t - (w.t - 3 * F); if (d > 0 && d < 6 * F) sc = 1 + .055 * Math.sin(Math.PI * d / (6 * F)); w.hl.style.transform = `scaleX(${(1 - Math.pow(1 - clamp((t - (w.t + F)) / (6 * F)), 2)).toFixed(3)})`; }
        w.w.style.opacity = e2.toFixed(3); w.w.style.transform = `translateY(${(12 * (1 - e2)).toFixed(1)}px) scale(${sc.toFixed(3)})`;
      }
      tl.textContent = `t ${t.toFixed(2)} s · tahan ${(.5 + .3 * words.length).toFixed(1)} s`;
    });
  }

  /* ============ 8 · TRANSITIONS ============ */
  function transisi(el) {
    const TR = [["wipe", "Wipe kertas sobek", .5], ["page", "Page-turn", .7], ["shut", "Shutters", .65], ["iris", "Iris", .55], ["slide", "Slide", .45], ["bridge", "Bridge carry-over", .8], ["split", "Torn split", 22 / 24], ["cut", "Cut", 0]];
    el.innerHTML = `<div class="tr-stage"><div class="sc a" style="background-image:url(assets/img/sky.jpg)"></div><div class="sc b" style="background-image:url(assets/img/kit-sheet.jpg)"></div><img class="carry" src="assets/img/kit-7.webp" alt="" style="position:absolute;left:38%;top:52%;width:24%;opacity:0;filter:drop-shadow(0 10px 14px rgba(0,0,0,.5));z-index:4"><span class="cap">Pilih transisi</span></div>
      <div class="ctrl">${TR.map(([k, n, d]) => `<button class="btn" data-tr="${k}">${n} · ${d ? (+d.toFixed(2)).toString().replace(".", ",") + " s" : "0"}</button>`).join("")}</div>`;
    const A = $(".a", el), B = $(".b", el), cap = $(".cap", el), carry = $(".carry", el), stage = $(".tr-stage", el);
    let front = B, back = A, run = null;
    const seedTear = (u, s = 3) => { let p = []; for (let i = 0; i <= 24; i++) { const y = i / 24 * 100, j = Math.sin(i * 1.7 + s) * 2.4 + Math.sin(i * 4.3 + s) * 1.3; p.push(`${(u * 112 - 6 + j).toFixed(2)}% ${y.toFixed(2)}%`); } return `polygon(0 0, ${p.join(", ")}, 0 100%)`; };
    const reset = () => { [A, B].forEach((x) => { x.style.clipPath = ""; x.style.transform = ""; x.style.opacity = 1; x.style.zIndex = ""; x.style.boxShadow = ""; }); $$(".bar,.half", stage).forEach((x) => x.remove()); carry.style.opacity = 0; };
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tr]"); if (!b) return;
      const [k, n, d] = TR.find((x) => x[0] === b.dataset.tr);
      [front, back] = [back, front]; reset();
      back.style.zIndex = 1; front.style.zIndex = 2; cap.textContent = `${n} · ${d ? d.toFixed(2) + " s" : "0 s"}`;
      if (k === "shut") for (let i = 0; i < 8; i++) { const bar = document.createElement("div"); bar.className = "bar"; Object.assign(bar.style, { position: "absolute", left: 0, right: 0, top: `${i * 12.5}%`, height: "12.6%", background: "linear-gradient(#1a1a1f,#0b0b10)", transformOrigin: "50% 0", zIndex: 3, transform: "scaleY(0)" }); stage.appendChild(bar); }
      if (k === "split") { front.style.zIndex = 1; back.style.zIndex = 2; ["l", "r"].forEach((s) => { const h = back.cloneNode(); h.className = "half"; h.dataset.s = s; Object.assign(h.style, { position: "absolute", inset: 0, zIndex: 3, clipPath: s === "l" ? "polygon(0 0,52% 0,47% 30%,53% 55%,46% 80%,50% 100%,0 100%)" : "polygon(52% 0,100% 0,100% 100%,50% 100%,46% 80%,53% 55%,47% 30%)" }); stage.appendChild(h); }); back.style.opacity = 0; }
      run = { k, d, t: 0 };
      if (k === "cut") { back.style.zIndex = 1; front.style.zIndex = 2; run = null; }
    });
    visLoop(el, (dt) => {
      if (!run) return;
      run.t += dt; const u = sm(run.t / run.d), f = front, k = run.k;
      if (k === "wipe") f.style.clipPath = seedTear(u);
      if (k === "page") { f.style.clipPath = `inset(0 0 0 ${(100 - u * 100).toFixed(2)}%)`; f.style.boxShadow = `inset ${(40 * Math.sin(Math.PI * u)).toFixed(1)}px 0 40px -10px rgba(0,0,0,.6)`; }
      if (k === "iris") f.style.clipPath = `circle(${(u * 72).toFixed(2)}% at 50% 55%)`;
      if (k === "slide") { f.style.transform = `translateX(${((1 - u) * 100).toFixed(2)}%)`; f.style.boxShadow = "-30px 0 40px rgba(0,0,0,.5)"; }
      if (k === "shut") { const bars = $$(".bar", stage); const v = u < .5 ? u * 2 : (1 - u) * 2; bars.forEach((b, i) => { b.style.transformOrigin = u < .5 ? "50% 0" : "50% 100%"; b.style.transform = `scaleY(${clamp(v * 1.15 - i * .02).toFixed(3)})`; }); f.style.opacity = u < .5 ? 0 : 1; }
      if (k === "bridge") { carry.style.opacity = clamp(run.t / .15) * (1 - clamp((run.t - run.d - .4) / .3)); f.style.opacity = u; }
      if (k === "split") $$(".half", stage).forEach((h) => { const s = h.dataset.s === "l" ? -1 : 1; h.style.transform = `translateX(${(s * 20 * u).toFixed(2)}%) rotate(${(s * 10 * u).toFixed(2)}deg)`; h.style.opacity = 1 - clamp((u - .7) / .3); });
      if (run.t > run.d + (k === "bridge" ? .8 : 0)) { if (k === "shut" || k === "split") $$(".bar,.half", stage).forEach((x) => x.remove()); run = null; }
    });
  }

  /* ============ 9 · ROUTE ============ */
  function rute(el) {
    const NS = "http://www.w3.org/2000/svg";
    el.innerHTML = `<svg class="route" viewBox="0 0 900 340"><path d="M60 270 C 160 120, 260 300, 360 190 S 560 60, 650 160 S 780 300, 850 110" fill="none" stroke="rgba(242,215,150,.14)" stroke-width="2" stroke-dasharray="3 6"/><path class="rt" pathLength="100" d="M60 270 C 160 120, 260 300, 360 190 S 560 60, 650 160 S 780 300, 850 110" fill="none" stroke="#f2d796" stroke-width="3" stroke-linecap="round" stroke-dasharray="100 120" stroke-dashoffset="110" style="filter:drop-shadow(0 0 6px rgba(242,215,150,.8))"/><g class="cities"></g><g class="ex"><path d="M-10 -7 L12 0 L-10 7 L-5 0 Z" fill="#fff3d2" stroke="#9c7a3c"/></g><text x="20" y="28" font-family="Geist, sans-serif" font-size="13" font-weight="500" fill="rgba(244,236,216,.6)">Diagram konsep, bukan peta sungguhan</text></svg>
      <div class="ctrl"><button class="btn gold" data-a="play">Putar rute</button><span class="tclock" data-t></span></div>`;
    const svg = $("svg", el), rt = $(".rt", el), ex = $(".ex", el), cg = $(".cities", el), info = $("[data-t]", el);
    const len = rt.getTotalLength(), N = 400, tab = [];
    for (let i = 0; i <= N; i++) { const p = rt.getPointAtLength(len * i / N), q = rt.getPointAtLength(Math.min(len, len * (i + 1) / N)); tab.push([p.x, p.y, Math.atan2(q.y - p.y, q.x - p.x)]); }
    const STOP = [[0, "Jetty"], [.31, "Kota A"], [.62, "Kota B"], [1, "Site"]];
    cg.innerHTML = STOP.map(([u, n]) => { const p = tab[Math.round(u * N)]; return `<g class="city" data-u="${u}" opacity="0"><circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#0e1530" stroke="#f2d796" stroke-width="2"/><text x="${p[0]}" y="${p[1] - 16}" text-anchor="middle" font-family="Fraunces, serif" font-style="italic" font-size="19" fill="#f4ecd8">${n}</text></g>`; }).join("");
    let t = 0, ang = tab[0][2];
    el.addEventListener("click", (e) => { if (e.target.closest('[data-a="play"]')) { t = 0; ang = tab[0][2]; } });
    // timeline: grow between stops, hold 0.8 s at each stop
    const seg = []; let acc = 0; for (let i = 0; i < STOP.length; i++) { seg.push({ u: STOP[i][0], hold0: acc }); acc += .8; if (i < STOP.length - 1) { seg[i].move0 = acc; acc += (STOP[i + 1][0] - STOP[i][0]) * 4; } }
    const total = acc + 1;
    visLoop(el, (dt) => {
      t += dt; if (t > total + 1) t = 0;
      let u = 0;
      for (let i = 0; i < STOP.length; i++) { const s = seg[i]; if (t >= s.hold0) u = s.u; if (s.move0 != null && t > s.move0) u = s.u + (STOP[i + 1][0] - s.u) * sm((t - s.move0) / ((STOP[i + 1][0] - s.u) * 4)); }
      rt.setAttribute("stroke-dashoffset", (110 - 110 * u).toFixed(2));
      const p = tab[Math.round(u * N)];
      let d = p[2] - ang; d = Math.atan2(Math.sin(d), Math.cos(d));
      const maxTurn = (120 * Math.PI / 180) * dt; ang += clamp(d, -maxTurn, maxTurn);
      ex.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${(ang * 180 / Math.PI).toFixed(1)})`);
      $$(".city", cg).forEach((c) => c.setAttribute("opacity", u >= +c.dataset.u - .001 ? 1 : 0));
      info.textContent = `rute ${Math.round(u * 100)}% · belok maksimal 120° per detik`;
    });
  }

  /* ============ 10 · QC → LAPOR ============ */
  function qc(el) {
    const T9 = { 1: "Potongan bersih: tanpa fringe putih, kotak abu, bintik, tepi magenta", 2: "Kaki menapak, bayangan kontak, satu arah cahaya", 3: "Tanpa teks AI; geografi dan Screen directions benar", 4: "Hero sekitar 70%, minimal 3 bidang, properti berkonteks", 5: "On twos, stagger, settle 14-16 frame, tahan minimal 25%", 6: "Kata di timestamp VO, tahan 0,5 s + 0,3 s/kata, zona aman", 7: "Arab: U+FDF4/U+FDFA tampil, harakat sesuai sumber", 8: "Tepi layer tersembunyi; ukuran tokoh sama; kaki tidak meluncur; mulut/alis di wajah", 9: "Transisi bersih di 25/50/75% (per blok)", 10: "Dead air: diam + statis > 0,8 s", 11: "-14 LUFS, -1,5 dBTP, SFX -5 dB di bawah VO", 12: "Scene berdampingan beda arketipe/warna; data dan dalil bersumber", 13: "check --json 0 error; durasi, fps, resolusi benar; placeholder berlabel", 14: "Cabang B: komposit diam lapis = keyframe (berdampingan)", 15: "Benda berwajah: ganti mood lewat antisipasi, squash, wajah baru, settle", 16: "Tokoh sama dengan model sheet; tinggi tokoh sama antar adegan", 17: "Lip-sync: m/b/p rapat, vokal sesuai huruf, X di jeda", 18: "Gaya gambar kode: kartu STYLE dipatuhi, daftar larangan bersih",
      "mg9.1": "Kaki tidak meluncur (3 frame berurutan)", "mg9.4": "Loop tanpa loncatan", "mg9.9": "Gerak tidak serempak, frame akhir tidak mati", koord: "Koordinat bersumber", rasio: "Rasio peta tidak ditarik", dalil: "Dalil bersumber", bab9: "Aturan peta dan rute" };
    const TY = [
      ["Potongan kertas, set, lapis cabang B", [1, 2, 3, 4, 14], [1, 3, 14]], ["Tokoh sequence sheet", [2, 5, 8, 16, "mg9.1", "mg9.4", "mg9.9"], [2, 8, 16, "mg9.1", "mg9.4"]],
      ["Benda berwajah", [8, 15, 16, 17], [8, 15]], ["Gambar kode gaya baru", [18], [18]], ["Peta dan rute", ["bab9", 3, 12, "koord", "rasio"], ["koord", "rasio"]],
      ["Teks, dalil, Arab", [6, 7, 12, "dalil"], [7, "dalil"]], ["Audio", [10, 11], [11]], ["Blok, transisi, render", [9, 13], [13]],
    ];
    el.innerHTML = `<div class="cols"><div><label class="fld">Blok / shot<input data-b value="b2 s05"></label><p class="qc-k">Jenis aset di adegan</p><div class="qc-types">${TY.map((t, i) => `<button class="btn${i < 2 ? " on" : ""}" data-ty="${i}">${t[0]}</button>`).join("")}</div>
      <div class="qc-list"></div><div class="qc-status"></div></div>
      <div><label class="fld">Hasil (angka)<input data-h value="kontak 8 frame; tepi 0 fringe; settle 15 frame"></label><label class="fld" style="margin-top:10px">Kelemahan terlihat (tulis jujur)<input data-w value="boil awan sedikit kuat di t=3,1 s"></label><div class="out" style="margin-top:14px"></div><div class="ctrl"><button class="btn gold" data-copy>Salin laporan</button></div></div></div>`;
    const sel = new Set([0, 1]), done = new Set(), list = $(".qc-list", el), status = $(".qc-status", el), out = $(".out", el);
    const draw = () => {
      const checks = [], p0 = new Set();
      [...sel].sort().forEach((i) => { TY[i][1].forEach((c) => !checks.includes(c) && checks.push(c)); TY[i][2].forEach((c) => p0.add(c)); });
      list.innerHTML = checks.map((c) => `<label class="qc-item"><input type="checkbox" data-c="${c}" ${done.has(String(c)) ? "checked" : ""}><span class="no">${typeof c === "number" ? "#" + c : "•"}</span><span>${T9[c]}</span>${p0.has(c) ? '<span class="p0">Penting</span>' : "<span></span>"}</label>`).join("");
      const miss = [...p0].filter((c) => !done.has(String(c)));
      const ok = miss.length === 0;
      status.className = "qc-status " + (ok ? "ok" : "no");
      status.textContent = ok ? "Semua cek penting lolos. Boleh lapor dan lanjut." : `Berhenti dulu: ${miss.length} cek penting belum lolos (${miss.map((c) => (typeof c === "number" ? "#" + c : T9[c])).join(", ")}). Perbaiki sebelum lapor.`;
      const types = [...sel].map((i) => TY[i][0]).join("; "), ran = checks.filter((c) => done.has(String(c))).map((c) => (typeof c === "number" ? c : c)).join(", ");
      out.textContent = `| Blok/shot | Jenis aset | Cek dijalankan | Hasil (angka) | Cek penting | Kelemahan terlihat |\n|---|---|---|---|---|---|\n| ${$("[data-b]", el).value} | ${types} | ${ran || "-"} | ${$("[data-h]", el).value} | ${ok ? "lolos" : "tidak"} | ${$("[data-w]", el).value} |`;
    };
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ty]"); if (b) { const i = +b.dataset.ty; sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle("on"); draw(); }
      if (e.target.closest("[data-copy]")) copyText(out.textContent, e.target);
    });
    el.addEventListener("change", (e) => { const c = e.target.dataset.c; if (c == null) return; e.target.checked ? done.add(c) : done.delete(c); draw(); });
    el.addEventListener("input", (e) => { if (e.target.matches("[data-b],[data-h],[data-w]")) draw(); });
    draw();
  }

  /* ============ 11 · CREDIT CALCULATOR ============ */
  function kredit(el) {
    el.innerHTML = `<div class="calc">
        <label class="fld">Lokasi dengan kit langsung<input type="number" min="0" value="4" data-v="a"></label><label class="fld">Lokasi dengan pola strip<input type="number" min="0" value="2" data-v="b"></label>
        <label class="fld">Set gerak baru (gambar 2K)<input type="number" min="0" value="6" data-v="s"></label><label class="fld">Klip video AI (× 5 detik)<input type="number" min="0" value="3" data-v="c"></label>
        <label class="fld">Model video<select data-v="m"><option value="10">Kling 3.0 · 10 kredit</option><option value="35">Seedance 2.5 · 35 kredit</option></select></label>
        <label class="fld">Cadangan buat ulang (%)<input type="number" min="0" max="100" value="15" data-v="r"></label></div>
      <div class="kr-bars" role="list"></div><p class="kr-note">Harga per 1 November 2026: gambar 1K 1,5 kredit dan 2K 2,75 kredit; video Kling 3.0 10 kredit dan Seedance 2.5 35 kredit per 5 detik. Semua angka adalah perkiraan. Sebelum membuat gambar apa pun, Claude tetap meminta izin dan mengecek saldo.</p>`;
    const v = (k) => Math.max(0, +($(`[data-v="${k}"]`, el).value || 0)), bars = $(".kr-bars", el), gs = window.gsap, RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fmt = (x) => Math.round(x).toLocaleString("id-ID"), fmt1 = (x) => (Math.round(x * 10) / 10).toLocaleString("id-ID", { maximumFractionDigits: 1 });
    const ROWS = [["a", "Kit langsung"], ["b", "Pola strip"], ["s", "Set gerak"], ["c", "Video AI"], ["sep"], ["t", "Total + cadangan", "tot"], ["sep"], ["k", "Acuan: video 3 menit penuh Kling", "ref"], ["d", "Acuan: video 3 menit penuh Seedance", "ref"]];
    bars.innerHTML = ROWS.map(([k, n, c]) => k === "sep" ? `<div class="kr-sep"></div>` : `<div class="kr-row ${c || ""}" role="listitem" data-r="${k}"><div class="kr-top"><span class="kr-n">${n}</span><b class="kr-v"></b></div><div class="kr-track"><i class="kr-fill"></i></div></div>`).join("");
    const R = {}; $$(".kr-row", bars).forEach((r) => (R[r.dataset.r] = { n: $(".kr-n", r), v: $(".kr-v", r), f: $(".kr-fill", r), lo: 0, hi: 0 }));
    let first = true;
    const draw = () => {
      const A = [v("a") * 5, v("a") * 8], B = v("b") * 11, S = v("s") * 2.75, C = v("c") * v("m"), r = 1 + v("r") / 100;
      const lo = (A[0] + B + S + C) * r, hi = (A[1] + B + S + C) * r;
      R.c.n.textContent = `Video AI · ${v("m") === 10 ? "Kling" : "Seedance"}`;
      const D = { a: [A[0], A[1]], b: [B, B], s: [S, S], c: [C, C], t: [lo, hi], k: [460, 460], d: [1360, 1360] };
      const mx = Math.max(...Object.values(D).map((x) => x[1]), 1);
      Object.entries(D).forEach(([k, [l, h]], i) => {
        const o = R[k], to = { lo: l, hi: h };
        const show = () => { o.v.innerHTML = Math.round(o.lo) === Math.round(o.hi) ? (k === "s" ? fmt1(o.hi) : fmt(o.hi)) + "<small>kredit</small>" : `${fmt(o.lo)}–${fmt(o.hi)}<small>kredit</small>`; };
        const sc = (h / mx).toFixed(4);
        if (first && !RM) { o.f.style.transitionDelay = (i * .07) + "s"; requestAnimationFrame(() => requestAnimationFrame(() => (o.f.style.transform = `scaleX(${sc})`))); }
        else { o.f.style.transitionDelay = "0s"; o.f.style.transform = `scaleX(${sc})`; }
        if (gs && !RM) gs.to(o, { ...to, duration: first ? 1.1 : .7, delay: first ? i * .07 : 0, ease: "power3.out", overwrite: true, onUpdate: show });
        else { Object.assign(o, to); show(); }
      });
      first = false;
    };
    el.addEventListener("input", draw); el.addEventListener("change", draw); draw();
  }

  const REG = { alur, parallax, prompt, rumus, mood, lipsync, tipo, transisi, rute, qc, kredit };
  function mount(id, el) { if (!el || mounted.has(id) || !REG[id]) return; mounted.add(id); try { REG[id](el); } catch (err) { el.innerHTML = `<p class="out">Demo gagal dimuat: ${esc(err.message)}</p>`; console.error(err); } }
  // extension modules (js/demos-*.js) register extra demos with Demos.add(id, fn)
  const add = (id, fn) => { REG[id] = fn; };
  const util = { $, $$, esc, clamp, sm, copyText, visLoop };
  return { mount, add, util };
})();
