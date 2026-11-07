/* ==========================================================================
   Registry · Motion Graphics Pro v2
   Pustaka blok & komponen gerak bergaya kolase kertas. Semua pratinjau
   digambar oleh kode di file ini (DOM + CSS + GSAP), tanpa aset luar.
   API: window.Registry = { mount(el), open(id) }   ·   deep link #reg-<id>
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- helper bersama: ikut tersalin ke setiap snippet ---------- */
  const H = {
    rnd: (s) => { s = Math.imul(s | 0, -1640531535) >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; },
    q: (t) => Math.floor(t * 12 + 1e-6) / 12,
    cl: (u) => Math.min(1, Math.max(0, u)),
    sm: (u) => (u = Math.min(1, Math.max(0, u)), u * u * (3 - 2 * u)),
    ent: (t, t0, tau) => (t < t0 ? 1 : Math.exp(-(t - t0) / (tau || 0.17))),
    boil: (f, i, a) => { const v = Math.sin(f * 12.9898 + i * 78.233) * 43758.5453; return (v - Math.floor(v) - 0.5) * 2 * a; },
    torn: (s, n, a) => { const r = H.rnd(s), o = []; for (let i = 0; i <= n; i++) o.push((r() * 2 - 1) * a * (i % 2 ? 1 : 0.45)); return o; },
    wipe: (x, e, w, h, right) => {
      const n = e.length - 1, o = right ? w + 80 : -80, p = [o + "px -4px"];
      e.forEach((d, i) => p.push((x + d).toFixed(1) + "px " + (i === 0 ? -4 : i === n ? h + 4 : (i * h) / n).toFixed(1) + "px"));
      p.push(o + "px " + (h + 4) + "px");
      return "polygon(" + p.join(",") + ")";
    },
    band: (x1, e1, x2, e2, h) => {
      const n = e1.length - 1, a = [], b = [];
      for (let i = 0; i <= n; i++) {
        const y = (i === 0 ? -4 : i === n ? h + 4 : (i * h) / n).toFixed(1);
        a.push((x1 + e1[i]).toFixed(1) + "px " + y + "px");
        b.unshift((x2 + e2[i]).toFixed(1) + "px " + y + "px");
      }
      return "polygon(" + a.concat(b).join(",") + ")";
    },
    rect: (s, w, h, a, n) => {
      const r = H.rnd(s), j = () => (r() * 2 - 1) * a, m = Math.max(3, Math.round((n * h) / w)), p = [];
      for (let i = 0; i < n; i++) p.push([(i * w) / n, a + j()]);
      for (let i = 0; i < m; i++) p.push([w - a + j(), (i * h) / m]);
      for (let i = 0; i < n; i++) p.push([w - (i * w) / n, h - a + j()]);
      for (let i = 0; i < m; i++) p.push([a + j(), h - (i * h) / m]);
      return "polygon(" + p.map((v) => v[0].toFixed(1) + "px " + v[1].toFixed(1) + "px").join(",") + ")";
    },
    key: (K, t) => {
      if (t <= K[0][0]) return K[0][1];
      for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const a = K[i - 1], b = K[i], u = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u * u * (3 - 2 * u); }
      return K[K.length - 1][1];
    },
    loop: (D, draw) => { const tl = gsap.timeline({ paused: true }), c = { t: 0 }; tl.to(c, { t: D, duration: D, ease: "none", onUpdate: () => draw(c.t) }); draw(0); return tl; },
  };

  /* ---------- tekstur kertas (data URI SVG, tanpa file) ---------- */
  const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .22 0 0 0 0 .12 .9 0 0 0 -.33'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";
  const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.3' numOctaves='2' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .2 0 0 0 0 .15 0 0 0 0 .1 1.5 0 0 0 -.62'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23g)'/%3E%3C/svg%3E\")";
  const INK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='i'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.6' numOctaves='3' seed='9'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 0 0 0 2.1'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23i)'/%3E%3C/svg%3E\")";

  /* $ = akar komponen. Di registry diganti .reg-st, di snippet diganti .mgp-<id> */
  const BASE = `$ { position: relative; width: 640px; height: 360px; overflow: hidden; background: #0e1530; color: #141414; font-family: "Geist", "Helvetica Neue", Arial, sans-serif; font-weight: 400; line-height: 1.2; letter-spacing: 0; text-align: left; }
$.x-v { width: 360px; height: 640px; }
$ *, $ *::before, $ *::after { box-sizing: border-box; }
$ p, $ b, $ i, $ em { margin: 0; }
$ .x-a { position: absolute; }
$ .x-f { position: absolute; inset: 0; }
$ .x-sky { background: linear-gradient(#2C67B0, #78ACDC 55%, #D9E8F2); }
$ .x-nite { background: linear-gradient(#0a1030, #1b2d63 62%, #34478a); }
$ .x-tx { background-image: ${NOISE}; }
$ .x-pp { background-color: #FBF6EA; background-image: ${NOISE}; }
$ .x-ds { filter: drop-shadow(0 5px 5px rgba(45,28,12,.32)); }
$ .x-gr { position: absolute; inset: 0; pointer-events: none; background-image: ${GRAIN}; mix-blend-mode: multiply; opacity: .5; }
$ .x-serif { font-family: "Fraunces", Georgia, serif; }
$ .x-sun { border-radius: 50%; background: radial-gradient(circle at 40% 38%, #fff1bf, #F3C766 58%, #E3A93B); box-shadow: 0 0 40px rgba(255,226,150,.55); }
$ .x-moon { border-radius: 50%; background: #F1E6D0; box-shadow: inset -14px -6px 0 0 #d6c6a0, 0 0 30px rgba(241,230,208,.35); }
$ .x-star { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff3d2; box-shadow: 0 0 6px #fff3d2; }
$ .x-cloud { border-radius: 30px; background-color: #FBF6EA; }
$ .x-cloud::before { content: ""; position: absolute; left: 22%; top: -60%; width: 44%; height: 125%; border-radius: 50%; background: inherit; }
$ .x-hill { border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
$ .x-rf { clip-path: polygon(50% 0, 100% 100%, 0 100%); }
$ .x-win { position: absolute; width: 20px; height: 20px; background: #F3C766; box-shadow: inset 0 0 0 3px #7a4a26; }
$ .x-lit { box-shadow: inset 0 0 0 3px #4a3418, 0 0 16px 4px rgba(243,199,102,.7); }
$ .x-kite { background: linear-gradient(135deg, #B23A32 50%, #F1C75B 50%); clip-path: polygon(50% 0, 100% 40%, 50% 100%, 0 40%); }
$ .x-cs { position: absolute; border-radius: 50%; background: rgba(20,12,4,.3); filter: blur(3px); }
$ .x-fig { position: absolute; width: 40px; height: 92px; }
$ .x-fig i { position: absolute; display: block; }
$ .x-hd { left: 8px; top: 0; width: 24px; height: 26px; border-radius: 50%; background: #E8B48A; }
$ .x-hr { left: 6px; top: -3px; width: 28px; height: 14px; border-radius: 14px 14px 4px 4px; background: #2a1a12; }
$ .x-bd { left: 4px; top: 24px; width: 32px; height: 42px; background: var(--c, #B23A32); clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%); }
$ .x-lg { top: 62px; width: 7px; height: 30px; background: #3a2a20; border-radius: 3px; }
$ .x-lg.x-l { left: 11px; } $ .x-lg.x-r { left: 22px; }
$ .x-ar { top: 27px; width: 6px; height: 28px; background: #E8B48A; border-radius: 3px; transform-origin: 50% 3px; }
$ .x-ar.x-l { left: 6px; } $ .x-ar.x-r { left: 28px; }`;

  /* ---------- set siap pakai (diinterpolasi ke html item) ---------- */
  const house = (x, y, roof, body, lit) =>
    `<div class="x-a x-rf x-tx" style="left:${x - 10}px;top:${y - 38}px;width:${96}px;height:40px;background-color:${roof}"></div>` +
    `<div class="x-a x-tx x-ds" style="left:${x}px;top:${y}px;width:76px;height:58px;background-color:${body}"><i class="x-win${lit ? " x-lit" : ""}" style="left:28px;top:18px"></i></div>`;
  const DAY = `<div class="x-f x-sky"></div>
<div class="x-a x-sun" style="left:452px;top:44px;width:78px;height:78px"></div>
<div class="x-a x-cloud x-tx x-ds" style="left:64px;top:70px;width:130px;height:30px"></div>
<div class="x-a x-cloud x-tx x-ds" style="left:318px;top:112px;width:92px;height:22px"></div>
<div class="x-a x-hill x-tx" style="left:-120px;top:196px;width:540px;height:260px;background-color:#86A85E"></div>
<div class="x-a x-hill x-tx x-ds" style="left:240px;top:226px;width:580px;height:240px;background-color:#5B8442"></div>
${house(116, 216, "#B23A32", "#EBCB9C")}
<div class="x-a x-tx x-ds" style="left:-10px;top:320px;width:660px;height:50px;background-color:#43703A;border-radius:40% 60% 0 0/18px 22px 0 0"></div>`;
  const NIGHT = `<div class="x-f x-nite"></div>
<i class="x-star" style="left:228px;top:42px"></i><i class="x-star" style="left:300px;top:96px"></i><i class="x-star" style="left:388px;top:36px"></i><i class="x-star" style="left:520px;top:70px"></i><i class="x-star" style="left:590px;top:30px"></i><i class="x-star" style="left:40px;top:150px"></i>
<div class="x-a x-moon" style="left:94px;top:50px;width:62px;height:62px"></div>
<div class="x-a x-hill x-tx" style="left:200px;top:186px;width:600px;height:280px;background-color:#2B3F78"></div>
<div class="x-a x-hill x-tx x-ds" style="left:-170px;top:232px;width:580px;height:230px;background-color:#1E2D5E"></div>
${house(450, 236, "#16224A", "#C9B48A", true)}
<div class="x-a x-tx x-ds" style="left:-10px;top:322px;width:660px;height:50px;background-color:#141F45;border-radius:60% 40% 0 0/22px 18px 0 0"></div>`;
  const DAYV = `<div class="x-f x-sky"></div>
<div class="x-a x-sun" style="left:236px;top:84px;width:76px;height:76px"></div>
<div class="x-a x-cloud x-tx x-ds" style="left:34px;top:156px;width:120px;height:28px"></div>
<div class="x-a x-cloud x-tx x-ds" style="left:200px;top:236px;width:86px;height:20px"></div>
<div class="x-a x-hill x-tx" style="left:-140px;top:430px;width:460px;height:300px;background-color:#86A85E"></div>
<div class="x-a x-hill x-tx x-ds" style="left:90px;top:466px;width:420px;height:260px;background-color:#5B8442"></div>
${house(60, 440, "#B23A32", "#EBCB9C")}
<div class="x-a x-tx x-ds" style="left:-10px;top:566px;width:380px;height:90px;background-color:#43703A;border-radius:50% 50% 0 0/26px 26px 0 0"></div>`;
  const KITE = `<div class="x-a x-kite x-ds" style="left:295px;top:118px;width:50px;height:64px"></div>`;
  const FIG = (c) => `<div class="x-fig" style="--c:${c || "#B23A32"}"><i class="x-lg x-l"></i><i class="x-lg x-r"></i><i class="x-bd"></i><i class="x-ar x-l"></i><i class="x-ar x-r"></i><i class="x-hd"></i><i class="x-hr"></i></div>`;
  const LAYERS = `<div class="x-f x-sky"></div>
<div class="x-ly" data-k="0.15"><div class="x-a x-sun" style="left:650px;top:40px;width:70px;height:70px"></div><div class="x-a x-cloud x-tx x-ds" style="left:270px;top:70px;width:130px;height:30px"></div><div class="x-a x-cloud x-tx x-ds" style="left:780px;top:104px;width:100px;height:24px"></div></div>
<div class="x-ly" data-k="0.25"><div class="x-a x-hill x-tx" style="left:0;top:168px;width:560px;height:260px;background-color:#A9C28F"></div><div class="x-a x-hill x-tx" style="left:470px;top:158px;width:640px;height:280px;background-color:#9AB683"></div></div>
<div class="x-ly" data-k="0.40"><div class="x-a x-hill x-tx x-ds" style="left:-60px;top:216px;width:720px;height:240px;background-color:#76A052"></div><div class="x-a x-hill x-tx x-ds" style="left:560px;top:230px;width:620px;height:230px;background-color:#6A9447"></div></div>
<div class="x-ly" data-k="0.55">${house(300, 222, "#B23A32", "#EBCB9C")}${house(600, 232, "#1C2B45", "#F1E6D0")}${house(860, 226, "#E3B04B", "#EBCB9C")}</div>
<div class="x-ly" data-k="0.72"><div class="x-a x-kite x-ds" style="left:560px;top:84px;width:44px;height:56px"></div><div class="x-a" style="left:520px;top:218px">${FIG("#1C2B45")}<i class="x-cs" style="left:12px;top:86px;width:16px;height:12px"></i></div></div>
<div class="x-ly" data-k="0.90"><div class="x-a x-tx x-ds" style="left:0;top:306px;width:1040px;height:60px;background-color:#43703A;border-radius:30% 40% 0 0/18px 22px 0 0"></div><div class="x-a x-tx x-ds" style="left:120px;top:290px;width:110px;height:44px;border-radius:50% 50% 0 0;background-color:#2F5A2C"></div><div class="x-a x-tx x-ds" style="left:740px;top:286px;width:140px;height:50px;border-radius:50% 50% 0 0;background-color:#2F5A2C"></div></div>
<div class="x-ly" data-k="1.2"><div class="x-a x-tx x-ds" style="left:150px;top:-60px;width:220px;height:120px;border-radius:50%;background-color:#22401F"></div><div class="x-a x-tx x-ds" style="left:760px;top:-70px;width:260px;height:130px;border-radius:50%;background-color:#1E3A1C"></div></div>`;
  const LAYER_CSS = `$ .x-ly { position: absolute; left: -200px; top: 0; width: 1040px; height: 360px; }`;

  /* ---------- dunia per item: setiap pratinjau punya latar sendiri ----------
     SC(tema) merakit langit, cahaya, awan/bintang, bukit atau laut, dan satu landmark
     (mercusuar, kota, pinus, gunung, kincir, masjid, tenda pasar, palem, perahu) dari seed tema.
     Semua tetap potongan kertas bertekstur (x-tx) dengan bayangan jatuh (x-ds). */
  const SKY = {
    siang: "linear-gradient(#2C67B0, #78ACDC 55%, #D9E8F2)",
    fajar: "linear-gradient(#34477f, #b77f9c 46%, #f3b98f 76%, #fde3bf)",
    senja: "linear-gradient(#251f52, #7d4475 44%, #de7f55 74%, #f6c26a)",
    tosca: "linear-gradient(#17707f, #56aeb0 55%, #d5eee4)",
    gurun: "linear-gradient(#c97a3e, #eeb06c 50%, #fbe2ae)",
    gugur: "linear-gradient(#55779f, #aebdc0 55%, #efd6ae)",
    mendung: "linear-gradient(#4f5f78, #8d9db0 55%, #d2d8dd)",
    malam: "linear-gradient(#0a1030, #1b2d63 62%, #34478a)",
    ungu: "linear-gradient(#120b2e, #37215f 60%, #67408a)",
    aurora: "linear-gradient(#04141f, #0c3a45 50%, #2a7a62 78%, #6fbf8a)",
    bara: "linear-gradient(#1a0d1c, #4a1f2e 58%, #93422c)",
    hutan: "linear-gradient(#0b1a1a, #173c3a 60%, #2f6352)",
  };
  const DD = (cls, st, inner) => `<div class="x-a ${cls}" style="${st}">${inner || ""}</div>`;
  const SC = (o) => {
    const V = !!o.v, W = V ? 360 : 640, r = H.rnd(o.seed || 7), hz = V ? 430 : 196, fy = V ? 566 : 320, d = DD;
    const night = /malam|ungu|aurora|bara|hutan/.test(o.sky);
    let h = `<div class="x-f" style="background:${SKY[o.sky] || SKY.siang}"></div>`;
    if (o.sky === "aurora") h += d("", `left:-40px;top:${V ? 60 : 10}px;width:${W + 80}px;height:${V ? 260 : 150}px;background:linear-gradient(100deg, transparent 10%, rgba(120,240,170,.28) 30%, rgba(90,200,220,.18) 52%, transparent 70%);filter:blur(6px);transform:skewY(-6deg)`);
    if (night) for (let i = 0; i < 12; i++) h += `<i class="x-star" style="left:${(r() * W).toFixed(0)}px;top:${(8 + r() * hz * .62).toFixed(0)}px;opacity:${(.45 + r() * .55).toFixed(2)}"></i>`;
    const lx = (o.lx != null ? o.lx : .72) * W, ly = o.ly != null ? o.ly : (V ? 84 : 44), ls = o.ls || 70;
    if (o.lt === "moon") h += d("x-moon", `left:${lx}px;top:${ly}px;width:${ls * .85}px;height:${ls * .85}px`);
    else if (o.lt !== "none") h += d("x-sun", `left:${lx}px;top:${ly}px;width:${ls}px;height:${ls}px${o.sunbg ? ";background:" + o.sunbg : ""}`);
    for (let i = 0; i < (o.clouds || 0); i++) { const w = 70 + r() * 70; h += d("x-cloud x-tx x-ds", `left:${(r() * (W - w)).toFixed(0)}px;top:${(30 + r() * hz * .45).toFixed(0)}px;width:${w.toFixed(0)}px;height:${(w * .23).toFixed(0)}px;background-color:${o.cc || "#FBF6EA"}`); }
    if (o.far) h += o.far(W, hz, d, r);
    const c = o.h || ["#86A85E", "#5B8442", "#43703A"];
    if (o.sea) {
      h += d("x-tx", `left:-20px;top:${hz + 34}px;width:${W + 40}px;height:${fy - hz}px;background-color:${c[0]}`);
      h += d("x-tx", `left:-20px;top:${hz + 34}px;width:${W + 40}px;height:${fy - hz}px;background-image:repeating-linear-gradient(transparent 0 14px, rgba(255,255,255,.16) 14px 16px)`);
      h += d("x-tx x-ds", `left:-30px;top:${hz + 74}px;width:${W + 60}px;height:${fy - hz}px;background-color:${c[1]};border-radius:46% 54% 0 0/16px 22px 0 0`);
    } else {
      const a = r(), b = r();
      h += d("x-hill x-tx", `left:${(-150 + a * 80) * (V ? .7 : 1)}px;top:${hz + a * 16}px;width:${W * .82 + a * 60}px;height:${V ? 300 : 260}px;background-color:${c[0]}${o.terr ? ";background-image:repeating-linear-gradient(" + o.terr + ")" : ""}`);
      h += d("x-hill x-tx x-ds", `left:${W * (.36 + b * .14)}px;top:${hz + 26 + b * 18}px;width:${W * .88}px;height:${V ? 260 : 240}px;background-color:${c[1]}${o.terr ? ";background-image:repeating-linear-gradient(" + o.terr + ")" : ""}`);
    }
    if (o.mk) h += o.mk(W, V ? 500 : 274, d, r);
    h += d("x-tx x-ds", `left:-10px;top:${fy}px;width:${W + 20}px;height:${V ? 90 : 50}px;background-color:${c[2]};border-radius:${(30 + r() * 30).toFixed(0)}% ${(40 + r() * 30).toFixed(0)}% 0 0/18px 22px 0 0`);
    return h;
  };
  /* landmark: x = kiri, b = garis dasar (px) */
  const LM = {
    house: (x, b, roof, body, lit) => house(x, b - 58, roof, body, lit),
    tower: (d, x, b, hgt, c1, c2, lit) => d("x-tx x-ds", `left:${x}px;top:${b - hgt}px;width:34px;height:${hgt}px;clip-path:polygon(22% 0,78% 0,100% 100%,0 100%);background-color:${c1};background-image:repeating-linear-gradient(${c1} 0 18px, ${c2} 18px 36px)`) +
      d("", `left:${x + 5}px;top:${b - hgt - 16}px;width:24px;height:16px;background:${lit ? "#F3C766" : "#d9d2bf"};box-shadow:${lit ? "0 0 26px 10px rgba(243,199,102,.55)" : "none"}`) + d("x-rf x-tx", `left:${x + 1}px;top:${b - hgt - 34}px;width:32px;height:18px;background-color:${c2 === "#FBF6EA" ? c1 : c2}`),
    pine: (d, x, b, s, c) => d("", `left:${x + s * .26}px;top:${b - s * .25}px;width:${s * .1}px;height:${s * .25}px;background:#3a2a20`) + d("x-rf x-tx x-ds", `left:${x}px;top:${b - s}px;width:${s * .62}px;height:${s * .62}px;background-color:${c}`) + d("x-rf x-tx", `left:${x + s * .06}px;top:${b - s * 1.22}px;width:${s * .5}px;height:${s * .5}px;background-color:${c}`),
    tree: (d, x, b, s, c) => d("", `left:${x + s * .44}px;top:${b - s * .5}px;width:${s * .12}px;height:${s * .5}px;background:#5a3b22`) + d("x-tx x-ds", `left:${x}px;top:${b - s * 1.1}px;width:${s}px;height:${s * .8}px;border-radius:50%;background-color:${c}`),
    city: (d, x, b, n, c, win, r) => { let s = "", xx = x; for (let i = 0; i < n; i++) { const w = 30 + r() * 30, hh = 60 + r() * 110; s += d("x-tx x-ds", `left:${xx.toFixed(0)}px;top:${(b - hh).toFixed(0)}px;width:${w.toFixed(0)}px;height:${(hh + 20).toFixed(0)}px;background-color:${c};background-image:repeating-linear-gradient(0deg, ${c} 0 7px, transparent 7px 15px), repeating-linear-gradient(90deg, ${c} 0 5px, ${win} 5px 11px)`); xx += w + 3 + r() * 6; } return s; },
    peak: (d, x, b, w, hh, c, snow) => d("x-rf x-tx", `left:${x}px;top:${b - hh}px;width:${w}px;height:${hh}px;background-color:${c}`) + (snow ? d("x-tx", `left:${x + w * .3}px;top:${b - hh}px;width:${w * .4}px;height:${hh * .32}px;background-color:${snow};clip-path:polygon(50% 0,100% 100%,78% 82%,60% 100%,42% 80%,22% 100%,0 100%)`) : ""),
    mill: (d, x, b, c, bl) => d("x-tx x-ds", `left:${x}px;top:${b - 110}px;width:40px;height:110px;clip-path:polygon(25% 0,75% 0,100% 100%,0 100%);background-color:${c}`) +
      [20, 110].map((a) => d("x-tx x-ds", `left:${x - 46}px;top:${b - 112}px;width:132px;height:12px;background-color:${bl};transform:rotate(${a}deg)`)).join("") + d("", `left:${x + 14}px;top:${b - 112}px;width:12px;height:12px;border-radius:50%;background:#3a2a20`),
    dome: (d, x, b, c, gold, lit) => d("x-tx x-ds", `left:${x}px;top:${b - 64}px;width:96px;height:64px;background-color:${c}`, `<i class="x-win${lit ? " x-lit" : ""}" style="left:38px;top:24px;border-radius:10px 10px 0 0"></i>`) +
      d("x-tx x-ds", `left:${x + 18}px;top:${b - 100}px;width:60px;height:46px;border-radius:50% 50% 8px 8px/70% 70% 8px 8px;background-color:${gold}`) + d("x-tx x-ds", `left:${x + 112}px;top:${b - 150}px;width:16px;height:150px;background-color:${c}`) + d("x-rf", `left:${x + 108}px;top:${b - 172}px;width:24px;height:24px;background:${gold}`),
    tent: (d, x, b, w, c1, c2) => d("x-tx x-ds", `left:${x}px;top:${b - w * .9}px;width:${w}px;height:${w * .45}px;clip-path:polygon(50% 0,100% 100%,0 100%);background-color:${c1};background-image:repeating-linear-gradient(90deg, ${c1} 0 12px, ${c2} 12px 24px)`) + d("x-tx x-ds", `left:${x + w * .08}px;top:${b - w * .46}px;width:${w * .84}px;height:${w * .46}px;background-color:#3a2a20`, `<i style="position:absolute;left:12%;right:12%;top:30%;height:30%;background:#F3C766;opacity:.85"></i>`),
    palm: (d, x, b, s) => d("x-tx", `left:${x}px;top:${b - s}px;width:10px;height:${s}px;background-color:#7a5232;transform:rotate(6deg);transform-origin:50% 100%;border-radius:4px`) +
      [-40, -8, 26, 58, 150].map((a) => d("x-tx x-ds", `left:${x - 30}px;top:${b - s - 8}px;width:70px;height:16px;border-radius:50%;background-color:#3f7a3a;transform:rotate(${a}deg);transform-origin:50% 50%`)).join(""),
    boat: (d, x, b, c, sail) => d("x-tx x-ds", `left:${x}px;top:${b - 18}px;width:92px;height:20px;clip-path:polygon(0 0,100% 0,82% 100%,16% 100%);background-color:${c}`) + d("x-tx x-ds", `left:${x + 30}px;top:${b - 84}px;width:46px;height:62px;clip-path:polygon(0 0,100% 100%,0 100%);background-color:${sail}`),
    kite: (d, x, y, c1, c2) => d("x-kite x-ds", `left:${x}px;top:${y}px;width:40px;height:52px;background:linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`),
  };
  /* tema bernama: satu dunia per item, tidak ada dua yang sama */
  const T = {
    pantai: { sky: "tosca", lx: .78, clouds: 2, sea: 1, h: ["#2f8fa0", "#E8CF98", "#d9b97a"], seed: 11, mk: (W, b, d) => LM.tower(d, W * .18, b + 4, 118, "#B23A32", "#FBF6EA") + LM.boat(d, W * .6, b + 2, "#7a4a26", "#FBF6EA") },
    kotaMalam: { sky: "malam", lt: "moon", lx: .14, h: ["#2B3F78", "#1E2D5E", "#141F45"], seed: 12, mk: (W, b, d, r) => LM.city(d, W * .3, b + 10, 8, "#16224A", "#F3C766", r) },
    aurora: { sky: "aurora", lt: "none", h: ["#1d4a44", "#12332f", "#0c2422"], seed: 13, far: (W, hz, d) => LM.peak(d, W * .5, hz + 60, 260, 150, "#24525a", "#d9eee6"), mk: (W, b, d) => LM.pine(d, 40, b + 8, 90, "#0f2a26") + LM.pine(d, 110, b + 14, 70, "#14332e") + LM.pine(d, W * .78, b + 10, 96, "#0f2a26") },
    sawah: { sky: "fajar", lx: .2, ly: 70, sunbg: "radial-gradient(circle at 40% 38%, #fff4d6, #f5b77a 60%, #e2895a)", clouds: 1, cc: "#fbe4d0", h: ["#9fbf5e", "#7ba246", "#5e8a3a"], terr: "transparent 0 16px, rgba(40,60,20,.18) 16px 18px", seed: 14, mk: (W, b, d) => LM.house(W * .62, b, "#7a4a26", "#EBCB9C") + LM.tree(d, W * .84, b + 4, 46, "#4f7a34") },
    masjid: { sky: "ungu", lt: "moon", lx: .8, ly: 34, h: ["#3b2a6b", "#2a1d52", "#1c1340"], seed: 15, mk: (W, b, d) => LM.dome(d, W * .2, b + 6, "#E8DCC0", "#E3B04B", true) + LM.palm(d, W * .74, b + 14, 96) },
    gurun: { sky: "gurun", lx: .62, ly: 30, ls: 84, h: ["#e2b872", "#c9954e", "#b07a3c"], seed: 16, mk: (W, b, d) => LM.palm(d, W * .2, b + 8, 110) + LM.palm(d, W * .28, b + 16, 80) + LM.tent(d, W * .62, b + 14, 120, "#B23A32", "#F1E6D0") },
    layang: { sky: "siang", lx: .78, clouds: 3, h: ["#9cc06a", "#6b9a4a", "#4d7c3c"], seed: 17, mk: (W, b, d) => LM.house(W * .14, b, "#1C6E8C", "#F1E6D0") + LM.tree(d, W * .34, b + 6, 50, "#3f6e30") + LM.kite(d, W * .66, 90, "#1C6E8C", "#F1C75B") },
    gunung: { sky: "malam", lt: "moon", lx: .78, h: ["#24345f", "#1a2649", "#111a36"], seed: 18, far: (W, hz, d) => LM.peak(d, -30, hz + 70, 320, 190, "#2e4377", "#e8eef5") + LM.peak(d, W * .42, hz + 70, 280, 150, "#263a6a", "#dfe7f2"), mk: (W, b, d) => LM.pine(d, W * .66, b + 12, 80, "#0f1a33") + LM.pine(d, W * .74, b + 18, 64, "#132042") },
    kincir: { sky: "gugur", lx: .1, ly: 56, clouds: 2, cc: "#f6ead4", h: ["#c9a24e", "#a77d36", "#7f5a28"], seed: 19, mk: (W, b, d) => LM.mill(d, W * .66, b + 6, "#E8DCC0", "#7a4a26") + LM.tree(d, W * .16, b + 6, 54, "#c0622c") + LM.tree(d, W * .28, b + 10, 40, "#d98a3a") },
    pelabuhan: { sky: "malam", lt: "moon", lx: .42, ly: 40, sea: 1, h: ["#1e3566", "#111c3d", "#0d1530"], seed: 20, mk: (W, b, d) => LM.tower(d, W * .82, b + 4, 110, "#E8DCC0", "#16224A", true) + LM.boat(d, W * .2, b + 4, "#6b4426", "#C9B48A") },
    pasarMalam: { sky: "bara", lt: "moon", lx: .14, ly: 36, h: ["#5a2a2a", "#3e1d22", "#2a1418"], seed: 21, mk: (W, b, d) => LM.tent(d, W * .4, b + 10, 110, "#E3B04B", "#B23A32") + LM.tent(d, W * .62, b + 14, 96, "#1C6E8C", "#F1E6D0") + LM.tent(d, W * .2, b + 16, 84, "#B23A32", "#F1E6D0") },
    kotaPagi: { sky: "fajar", lx: .76, ly: 80, clouds: 2, cc: "#fbe4d0", h: ["#9a8fa8", "#7d6f8c", "#5d5070"], seed: 22, mk: (W, b, d, r) => LM.city(d, W * .08, b + 10, 9, "#4a3f5e", "#f5c98c", r) },
    desaUngu: { sky: "ungu", lt: "moon", lx: .16, h: ["#43306e", "#30225a", "#211846"], seed: 23, mk: (W, b, d) => LM.house(W * .6, b, "#1c1340", "#C9B48A", true) + LM.pine(d, W * .82, b + 10, 84, "#1c1340") + LM.pine(d, W * .9, b + 14, 64, "#241a4f") },
    kebunTeh: { sky: "tosca", lx: .12, ly: 52, clouds: 2, h: ["#5fae6a", "#3f8f55", "#2f6f45"], terr: "100deg, transparent 0 12px, rgba(20,60,30,.2) 12px 15px", seed: 24, mk: (W, b, d) => LM.house(W * .7, b, "#B23A32", "#F1E6D0") + LM.tree(d, W * .52, b + 6, 44, "#2f6f45") },
    pasarPagi: { sky: "fajar", lx: .8, ly: 60, clouds: 1, cc: "#fbe4d0", h: ["#b9a36a", "#93804c", "#6f5f38"], seed: 25, mk: (W, b, d) => LM.tent(d, W * .58, b + 8, 110, "#B23A32", "#F1E6D0") + LM.tent(d, W * .78, b + 14, 90, "#1C6E8C", "#F1E6D0") },
    festival: { sky: "siang", lx: .84, ly: 30, clouds: 2, h: ["#7fb3cf", "#5b93b4", "#3f7596"], sea: 1, seed: 26, mk: (W, b, d) => LM.kite(d, W * .14, 70, "#B23A32", "#F1C75B") + LM.kite(d, W * .3, 120, "#1C6E8C", "#FBF6EA") + LM.kite(d, W * .86, 140, "#E3B04B", "#B23A32") + LM.boat(d, W * .7, b + 2, "#B23A32", "#FBF6EA") },
    bengkel: { sky: "gugur", lx: .82, ly: 40, clouds: 1, cc: "#f6ead4", h: ["#a8b46a", "#86924a", "#66743a"], seed: 27, mk: (W, b, d) => LM.house(W * .64, b, "#7a4a26", "#E8CF98") + LM.tree(d, W * .84, b + 6, 50, "#c0622c") + LM.kite(d, W * .5, 70, "#B23A32", "#F1C75B") },
    mendung: { sky: "mendung", lt: "none", clouds: 4, cc: "#e9edf0", h: ["#8fa37a", "#6f8660", "#55694a"], seed: 28, mk: (W, b, d) => LM.mill(d, W * .74, b + 6, "#F1E6D0", "#5a3b22") + LM.house(W * .2, b, "#5a3b22", "#E8DCC0") },
    tropis: { sky: "siang", lx: .14, ly: 40, clouds: 2, sea: 1, h: ["#2a9db0", "#F0D9A0", "#e0c180"], seed: 29, mk: (W, b, d) => LM.palm(d, W * .62, b + 10, 120) + LM.palm(d, W * .72, b + 16, 90) + LM.boat(d, W * .2, b - 2, "#1C6E8C", "#FBF6EA") },
    senjaKota: { sky: "senja", lx: .46, ly: 120, ls: 90, sunbg: "radial-gradient(circle at 45% 40%, #ffe9b8, #f3a65a 60%, #d9683c)", h: ["#6b3f5e", "#4e2c48", "#361e34"], seed: 30, mk: (W, b, d, r) => LM.dome(d, W * .62, b + 8, "#3a2238", "#c98a3a", true) + LM.city(d, 20, b + 12, 4, "#2e1a2c", "#f5c98c", r) },
    taman: { sky: "siang", lx: .7, clouds: 3, h: ["#9cc06a", "#76a24e", "#4d7c3c"], seed: 31, mk: (W, b, d, r) => LM.city(d, W * .5, b - 10, 5, "#8aa0b8", "#e6eef5", r) + LM.tree(d, W * .12, b + 6, 60, "#3f6e30") + LM.tree(d, W * .3, b + 10, 46, "#4f7a34") },
    hutanMalam: { sky: "hutan", lt: "moon", lx: .7, ly: 40, h: ["#1f4a3e", "#153a31", "#0d2a23"], seed: 32, mk: (W, b, d) => [0, 70, 130, 400, 470, 540].map((x, i) => LM.pine(d, x, b + 10 + (i % 2) * 8, 90 - (i % 3) * 14, i % 2 ? "#0e2620" : "#133229")).join("") },
    fajarLaut: { v: 1, sky: "fajar", lx: .6, ly: 110, clouds: 2, cc: "#fbe4d0", sea: 1, h: ["#5d7fa8", "#e8cf98", "#d6b47a"], seed: 33, mk: (W, b, d) => LM.tower(d, 40, b + 4, 130, "#B23A32", "#FBF6EA") + LM.boat(d, 210, b + 4, "#6b4426", "#FBF6EA") },
    gunungV: { v: 1, sky: "siang", lx: .66, ly: 70, clouds: 2, h: ["#7da35a", "#5b8442", "#43703A"], seed: 34, far: (W, hz, d) => LM.peak(d, -40, hz + 60, 300, 230, "#6d84a6", "#f2f5f8") + LM.peak(d, 150, hz + 60, 260, 180, "#5f7898", "#eef2f6"), mk: (W, b, d) => LM.pine(d, 250, b + 10, 80, "#2f5a2c") + LM.house(40, b + 4, "#B23A32", "#EBCB9C") },
  };
  /* tujuh lapis parallax, palet dan isi bisa diganti */
  const LAYERS_OF = (o) => `<div class="x-f" style="background:${SKY[o.sky]}"></div>
<div class="x-ly" data-k="0.15"><div class="x-a x-sun" style="left:650px;top:40px;width:70px;height:70px${o.sunbg ? ";background:" + o.sunbg : ""}"></div><div class="x-a x-cloud x-tx x-ds" style="left:270px;top:70px;width:130px;height:30px;background-color:${o.cc}"></div><div class="x-a x-cloud x-tx x-ds" style="left:780px;top:104px;width:100px;height:24px;background-color:${o.cc}"></div></div>
<div class="x-ly" data-k="0.25"><div class="x-a x-hill x-tx" style="left:0;top:168px;width:560px;height:260px;background-color:${o.c[0]}"></div><div class="x-a x-hill x-tx" style="left:470px;top:158px;width:640px;height:280px;background-color:${o.c[1]}"></div></div>
<div class="x-ly" data-k="0.40"><div class="x-a x-hill x-tx x-ds" style="left:-60px;top:216px;width:720px;height:240px;background-color:${o.c[2]}"></div><div class="x-a x-hill x-tx x-ds" style="left:560px;top:230px;width:620px;height:230px;background-color:${o.c[3]}"></div></div>
<div class="x-ly" data-k="0.55">${o.mid}</div>
<div class="x-ly" data-k="0.72"><div class="x-a x-kite x-ds" style="left:560px;top:84px;width:44px;height:56px"></div><div class="x-a" style="left:520px;top:218px">${FIG(o.fig)}<i class="x-cs" style="left:12px;top:86px;width:16px;height:12px"></i></div></div>
<div class="x-ly" data-k="0.90"><div class="x-a x-tx x-ds" style="left:0;top:306px;width:1040px;height:60px;background-color:${o.c[4]};border-radius:30% 40% 0 0/18px 22px 0 0"></div><div class="x-a x-tx x-ds" style="left:120px;top:290px;width:110px;height:44px;border-radius:50% 50% 0 0;background-color:${o.c[5]}"></div><div class="x-a x-tx x-ds" style="left:740px;top:286px;width:140px;height:50px;border-radius:50% 50% 0 0;background-color:${o.c[5]}"></div></div>
<div class="x-ly" data-k="1.2"><div class="x-a x-tx x-ds" style="left:150px;top:-60px;width:220px;height:120px;border-radius:50%;background-color:${o.c[6]}"></div><div class="x-a x-tx x-ds" style="left:760px;top:-70px;width:260px;height:130px;border-radius:50%;background-color:${o.c[6]}"></div></div>`;
  const LAY_GUGUR = LAYERS_OF({ sky: "gugur", cc: "#f6ead4", fig: "#7a4a26", c: ["#d8c08a", "#c9ad74", "#b98d45", "#a77d36", "#7f5a28", "#6b4426", "#4a2e18"],
    mid: `${LM.mill(DD, 300, 290, "#E8DCC0", "#7a4a26")}${house(560, 232, "#7a4a26", "#E8CF98")}${house(860, 226, "#B23A32", "#F1E6D0")}` });
  const LAY_TROPIS = LAYERS_OF({ sky: "senja", cc: "#f7d6c0", fig: "#1C6E8C", sunbg: "radial-gradient(circle at 45% 40%, #ffe9b8, #f3a65a 60%, #d9683c)", c: ["#8a5a7a", "#7a4a6c", "#5a7a4a", "#4f6e40", "#3a5a34", "#2f4a2a", "#1f3220"],
    mid: `${LM.palm(DD, 330, 300, 110)}${house(600, 232, "#3a2238", "#E8CF98", true)}${LM.palm(DD, 900, 300, 96)}` });

  /* ---------- kategori ---------- */
  const CATS = [
    ["transisi", "Transisi"],
    ["teks", "Teks kinetik"],
    ["judul", "Judul & kartu"],
    ["lower", "Lower third & caption"],
    ["tekstur", "Tekstur & overlay"],
    ["peta", "Peta & data"],
    ["tokoh", "Tokoh & gerak"],
    ["kamera", "Kamera"],
  ];
  const CAT = Object.fromEntries(CATS);

  /* ---------- item ---------- */
  const ITEMS = [];
  const I = (o) => ITEMS.push(o);

  /* ===== TRANSISI ===== */
  I({
    id: "mgp-sobek-kertas", nama: "Sobek Kertas", kat: "transisi", jenis: "block", dur: 0.5, rasio: "16:9 · 9:16", twos: true, poster: 1.04,
    desk: "Set lama tersobek ke samping dan lokasi baru muncul dari balik tepi kertas yang bergerigi, lengkap dengan serat krem di bibir sobekan. Gerigi berseed, jadi bentuknya sama di setiap render.",
    kapan: "Ganti lokasi. Pakai 0,5 s dengan progres smoothstep, dan sisakan ekor shot keluar minimal sepanjang transisi.",
    params: [["durasi", 0.5, "detik transisi"], ["mulai", 0.8, "detik awal sobekan"], ["seed", 7, "bentuk gerigi"], ["gerigi", 9, "px amplitudo tepi"], ["titik", 22, "jumlah titik tepi"], ["rim", 13, "px lebar serat krem"]],
    html: `<div class="x-f">${SC(T.pantai)}</div><div class="x-f x-ds"><div class="x-f x-b">${SC(T.kotaMalam)}</div></div><div class="x-f x-ds"><div class="x-f x-pp x-rim"></div></div><div class="x-gr"></div>`,
    css: `$ .x-rim { background-color: #F1E6D0; }`,
    build: function build(root, P, H) {
      const b = root.querySelector(".x-b"), rim = root.querySelector(".x-rim"), W = root.offsetWidth, h = root.offsetHeight;
      const e = H.torn(P.seed, P.titik, P.gerigi), e2 = H.torn(P.seed + 9, P.titik, P.gerigi * 0.35).map((d, i) => d + e[i] * 0.6);
      return H.loop(2.4, (t) => {
        const u = H.sm((t - P.mulai) / P.durasi), x = -P.rim - 24 + u * (W + P.rim * 2 + 48);
        b.style.clipPath = H.wipe(x, e, W, h, false);
        rim.style.clipPath = H.band(x, e, x + P.rim, e2, h);
      });
    },
  });

  I({
    id: "mgp-page-turn", nama: "Page-turn", kat: "transisi", jenis: "block", dur: 0.7, rasio: "16:9 · 9:16", twos: true, poster: 1.12,
    desk: "Halaman dibalik dari kanan ke kiri dengan punggung kertas yang terang dan bayangan lipatan selebar sin(πu). Terasa seperti membuka buku cerita, bukan sekadar wipe.",
    kapan: "Waktu berlalu atau pindah bagian cerita. 0,7 s; jangan dipakai untuk ganti lokasi biasa.",
    params: [["durasi", 0.7, "detik transisi"], ["mulai", 0.8, "detik awal balik"], ["lipat", 74, "px lebar maksimum lipatan"]],
    html: `<div class="x-f">${SC(T.aurora)}</div><div class="x-a x-shd"></div><div class="x-f x-pa">${SC(T.sawah)}</div><div class="x-a x-flap"></div><div class="x-gr"></div>`,
    css: `$ .x-shd, $ .x-flap { top: 0; bottom: 0; width: 0; }
$ .x-shd { background: linear-gradient(90deg, rgba(14,9,3,.55), rgba(14,9,3,0)); }
$ .x-flap { background: linear-gradient(90deg, #cdbd98, #f6eedb 38%, #fffaf0 70%, #e6d8b8); box-shadow: -8px 0 16px rgba(30,18,6,.35); }`,
    build: function build(root, P, H) {
      const pa = root.querySelector(".x-pa"), fl = root.querySelector(".x-flap"), sh = root.querySelector(".x-shd"), W = root.offsetWidth;
      return H.loop(2.6, (t) => {
        const u = H.sm((t - P.mulai) / P.durasi), X = W * (1 - u), wf = P.lipat * Math.sin(Math.PI * u), on = u > 0 && u < 1 ? 1 : 0;
        pa.style.clipPath = "inset(0 " + (W - X).toFixed(1) + "px 0 0)";
        fl.style.left = (X - wf).toFixed(1) + "px"; fl.style.width = wf.toFixed(1) + "px"; fl.style.opacity = on;
        sh.style.left = X.toFixed(1) + "px"; sh.style.width = (wf * 1.7).toFixed(1) + "px"; sh.style.opacity = on;
      });
    },
  });

  I({
    id: "mgp-shutter", nama: "Shutter Bilah", kat: "transisi", jenis: "block", dur: 0.65, rasio: "16:9 · 9:16", twos: true, poster: 1.12,
    desk: "Bilah kertas navy menutup layar bergantian dari atas dan bawah, set ditukar tepat di 50%, lalu bilah membuka lagi. Tegas, rapi, dan langsung terbaca sebagai pergantian bab.",
    kapan: "Ganti bab atau segmen besar. 0,65 s; cocok sebagai jeda sebelum kartu bab.",
    params: [["durasi", 0.65, "detik total tutup + buka"], ["mulai", 0.8, "detik awal"], ["bilah", 6, "jumlah bilah"], ["selang", 0.02, "detik stagger antarbilah"]],
    html: `<div class="x-f">${SC(T.masjid)}</div><div class="x-f x-pa">${SC(T.gurun)}</div><div class="x-f x-bars"></div><div class="x-gr"></div>`,
    css: `$ .x-bars { display: flex; }
$ .x-bar { flex: 1 1 0; height: 100%; background-color: #1C2B45; box-shadow: inset 1px 0 0 rgba(241,230,208,.3), inset -1px 0 0 rgba(0,0,0,.35); transform-origin: 50% 0; }
$ .x-bar:nth-child(even) { background-color: #24376a; transform-origin: 50% 100%; }`,
    build: function build(root, P, H) {
      const bars = root.querySelector(".x-bars"), pa = root.querySelector(".x-pa");
      for (let i = 0; i < P.bilah; i++) { const d = document.createElement("i"); d.className = "x-bar x-tx"; bars.appendChild(d); }
      const bs = [...bars.children], st = P.selang * (P.bilah - 1), h = Math.max(0.1, (P.durasi - st) / 2), mid = P.mulai + h + st;
      const tl = gsap.timeline({ paused: true });
      tl.set(bs, { scaleY: 0 }, 0)
        .to(bs, { scaleY: 1, duration: h, ease: "power2.in", stagger: P.selang }, P.mulai)
        .set(pa, { autoAlpha: 0 }, mid)
        .to(bs, { scaleY: 0, duration: h, ease: "power2.out", stagger: P.selang }, mid + 0.04)
        .to({}, { duration: 1.2 });
      return tl;
    },
  });

  I({
    id: "mgp-iris", nama: "Iris Fokus", kat: "transisi", jenis: "block", dur: 0.55, rasio: "16:9 · 9:16", twos: true, poster: 1.06,
    desk: "Lingkaran terbuka dari pusat hero, dari 0 sampai menutup bingkai, dengan bibir kertas krem yang mengikuti tepinya. Mata penonton dibawa tepat ke benda yang penting.",
    kapan: "Fokus ke satu benda atau tokoh, lalu masuk ke dunianya. Pusatkan pada hero; radius akhir sekitar 72%.",
    params: [["durasi", 0.55, "detik transisi"], ["mulai", 0.8, "detik awal"], ["x", 50, "% pusat iris (hero)"], ["y", 41.7, "% pusat iris (hero)"], ["akhir", 74, "% radius akhir"]],
    html: `<div class="x-f">${SC(T.layang)}${KITE}</div><div class="x-f x-b">${SC(T.gunung)}</div><div class="x-a x-ring"></div><div class="x-gr"></div>`,
    css: `$ .x-ring { border: 3px solid #F1E6D0; border-radius: 50%; box-shadow: 0 0 0 2px rgba(20,12,4,.25), 0 6px 14px rgba(20,12,4,.35); }`,
    build: function build(root, P, H) {
      const b = root.querySelector(".x-b"), ring = root.querySelector(".x-ring"), W = root.offsetWidth, h = root.offsetHeight;
      const cx = (P.x / 100) * W, cy = (P.y / 100) * h, R = Math.sqrt((W * W + h * h) / 2);
      return H.loop(2.4, (t) => {
        const u = H.sm((t - P.mulai) / P.durasi), r = P.akhir * u, rp = (r / 100) * R;
        b.style.clipPath = "circle(" + r.toFixed(2) + "% at " + P.x + "% " + P.y + "%)";
        ring.style.cssText = "left:" + (cx - rp) + "px;top:" + (cy - rp) + "px;width:" + 2 * rp + "px;height:" + 2 * rp + "px;opacity:" + (u > 0 && u < 1 ? 1 : 0);
      });
    },
  });

  I({
    id: "mgp-geser-lapis", nama: "Geser Lapis", kat: "transisi", jenis: "block", dur: 0.45, rasio: "16:9 · 9:16", twos: true, poster: 1.0,
    desk: "Lembar baru meluncur masuk menutupi set lama, membawa bayangan tepi yang jatuh ke kertas di bawahnya. Set lama ikut mundur sedikit supaya terasa ada kedalaman.",
    kapan: "Kontinuitas: adegan berlanjut di arah yang sama. 0,45 s, ease keluar cepat.",
    params: [["durasi", 0.45, "detik transisi"], ["mulai", 0.8, "detik awal"], ["parallax", 70, "px set lama ikut mundur"], ["miring", 1.2, "derajat lembar saat masuk"]],
    html: `<div class="x-f x-pa">${SC(T.kincir)}</div><div class="x-f x-b">${SC(T.pelabuhan)}</div><div class="x-gr"></div>`,
    css: `$ .x-b { box-shadow: -16px 0 24px rgba(10,6,2,.45); }`,
    build: function build(root, P, H) {
      const pa = root.querySelector(".x-pa"), b = root.querySelector(".x-b"), W = root.offsetWidth;
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(b, { x: W + 90, rotation: P.miring }, { x: 0, rotation: 0, duration: P.durasi, ease: "power3.out", transformOrigin: "0% 100%" }, P.mulai)
        .fromTo(pa, { x: 0 }, { x: -P.parallax, duration: P.durasi, ease: "power3.out" }, P.mulai)
        .to({}, { duration: 1.3 });
      return tl;
    },
  });

  I({
    id: "mgp-belah-sobek", nama: "Belah Sobek", kat: "transisi", jenis: "block", dur: 0.92, rasio: "16:9", twos: true, poster: 1.3,
    desk: "Satu set robek di tengah menjadi dua belahan yang berputar ±10° dan terlempar ke samping, membuka adegan di baliknya. Efek dramatis yang tetap bersahaja.",
    kapan: "Pemutusan makna: sebelum dan sesudah, janji dan kenyataan. 22 frame; pakai hemat, satu atau dua kali per film.",
    params: [["frame", 22, "frame belah (24 fps)"], ["mulai", 0.7, "detik awal"], ["putar", 10, "derajat tiap belahan"], ["geser", 20, "% lebar per belahan"], ["seed", 3, "bentuk sobekan"], ["gerigi", 10, "px amplitudo"], ["titik", 18, "jumlah titik tepi"], ["rim", 10, "px serat krem"]],
    html: `<div class="x-f">${SC(T.pasarMalam)}</div><div class="x-f x-hl x-ds"><div class="x-f x-cl">${SC(T.kotaPagi)}<div class="x-f x-pp x-rl"></div></div></div><div class="x-f x-hr x-ds"><div class="x-f x-cr">${SC(T.kotaPagi)}<div class="x-f x-pp x-rr"></div></div></div><div class="x-gr"></div>`,
    css: `$ .x-rl, $ .x-rr { background-color: #F1E6D0; }`,
    build: function build(root, P, H) {
      const q = (s) => root.querySelector(s), W = root.offsetWidth, h = root.offsetHeight, m = W / 2;
      const e = H.torn(P.seed, P.titik, P.gerigi), e2 = H.torn(P.seed + 5, P.titik, P.gerigi * 0.3).map((d, i) => d + e[i] * 0.6);
      q(".x-cl").style.clipPath = H.wipe(m, e, W, h, false);
      q(".x-cr").style.clipPath = H.wipe(m, e, W, h, true);
      q(".x-rl").style.clipPath = H.band(m - P.rim, e2, m, e, h);
      q(".x-rr").style.clipPath = H.band(m, e, m + P.rim, e2, h);
      const F = P.frame / 24, g = (P.geser / 100) * W, tl = gsap.timeline({ paused: true });
      tl.fromTo(q(".x-hl"), { x: 0, rotation: 0 }, { x: -g, rotation: -P.putar, duration: F, ease: "power2.inOut", transformOrigin: "50% 100%" }, P.mulai)
        .fromTo(q(".x-hr"), { x: 0, rotation: 0 }, { x: g, rotation: P.putar, duration: F, ease: "power2.inOut", transformOrigin: "50% 100%" }, P.mulai)
        .to(q(".x-hl"), { x: -W * 0.75, rotation: -P.putar * 1.6, duration: 0.3, ease: "power2.in" }, P.mulai + F + 0.35)
        .to(q(".x-hr"), { x: W * 0.75, rotation: P.putar * 1.6, duration: 0.3, ease: "power2.in" }, P.mulai + F + 0.35)
        .to({}, { duration: 0.9 });
      return tl;
    },
  });

  I({
    id: "mgp-lipat-kertas", nama: "Lipat Kertas", kat: "transisi", jenis: "block", dur: 0.7, rasio: "16:9 · 9:16", twos: true, poster: 0.98,
    desk: "Set dilipat di garis tengah seperti surat: separuh atas terlipat menjauh, lalu separuh bawah menyusul, dengan bayangan yang menggelap di setiap lipatan.",
    kapan: "Menutup satu urusan dan membuka yang lain, misalnya sesudah membaca surat atau peta. 0,7 s.",
    params: [["durasi", 0.7, "detik dua lipatan"], ["mulai", 0.8, "detik awal"], ["sudut", 88, "derajat lipatan"], ["gelap", 0.7, "opasitas bayangan lipatan"]],
    html: `<div class="x-f">${SC(T.desaUngu)}</div><div class="x-f x-pv"><div class="x-f x-ft">${SC(T.kebunTeh)}<div class="x-f x-dk"></div></div><div class="x-f x-fb">${SC(T.kebunTeh)}<div class="x-f x-dk"></div></div></div><div class="x-gr"></div>`,
    css: `$ .x-pv { perspective: 1100px; }
$ .x-ft { clip-path: inset(0 0 50% 0); }
$ .x-fb { clip-path: inset(50% 0 0 0); }
$ .x-dk { background: #0a0f24; opacity: 0; }`,
    build: function build(root, P, H) {
      const ft = root.querySelector(".x-ft"), fb = root.querySelector(".x-fb"), d = P.durasi / 2;
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(ft, { rotationX: 0 }, { rotationX: P.sudut, duration: d, ease: "power2.in", transformOrigin: "50% 50%" }, P.mulai)
        .fromTo(ft.querySelector(".x-dk"), { opacity: 0 }, { opacity: P.gelap, duration: d, ease: "power2.in" }, P.mulai)
        .fromTo(fb, { rotationX: 0 }, { rotationX: -P.sudut, duration: d, ease: "power2.in", transformOrigin: "50% 50%" }, P.mulai + d)
        .fromTo(fb.querySelector(".x-dk"), { opacity: 0 }, { opacity: P.gelap, duration: d, ease: "power2.in" }, P.mulai + d)
        .to({}, { duration: 1.2 });
      return tl;
    },
  });

  /* ===== TEKS KINETIK ===== */
  I({
    id: "mgp-kata-on-twos", nama: "Kata On Twos", kat: "teks", jenis: "component", dur: 2.6, rasio: "16:9 · 9:16", twos: true, poster: 2.1,
    desk: "Headline muncul kata demi kata dengan fade-rise 5 frame, naik 7 px, berdetak 12 gambar per detik seperti kolase lainnya. Kata kunci berganti ke serif italic 1,12 kali.",
    kapan: "Headline scene kinetik 3-7 kata. Taruh tiap kata di timestamp VO dari transkrip; tahan baca 0,5 s + 0,3 s per kata.",
    params: [["mulai", 0.45, "detik kata pertama"], ["jeda", 0.32, "detik antarkata (ganti timestamp VO)"], ["frame", 5, "frame fade-rise"], ["naik", 7, "px jarak naik"], ["tahan", 1.7, "detik tahan baca"]],
    html: `<div class="x-f x-pp"></div><div class="x-f" style="background-image:repeating-linear-gradient(transparent 0 33px, rgba(60,100,170,.2) 33px 35px), linear-gradient(90deg, transparent 54px, rgba(190,60,50,.4) 54px 56px, transparent 56px)"></div><div class="x-a x-kick">BAB PEMBUKA</div><div class="x-a x-ln"><span class="x-w">Cahaya</span> <span class="x-w">pertama</span> <span class="x-w">menyentuh</span> <span class="x-w x-kw x-serif">kota.</span></div><div class="x-gr"></div>`,
    css: `$ .x-kick { left: 60px; top: 106px; font-size: 15px; font-weight: 600; letter-spacing: .3em; color: #9c7a3c; }
$ .x-ln { left: 58px; right: 58px; top: 134px; font-size: 50px; font-weight: 800; line-height: 1.06; letter-spacing: -.015em; color: #141414; }
$ .x-w { display: inline-block; }
$ .x-kw { font-style: italic; font-weight: 600; font-size: 1.12em; color: #B23A32; letter-spacing: 0; }`,
    build: function build(root, P, H) {
      const ws = [...root.querySelectorAll(".x-w")], k = root.querySelector(".x-kick"), F = P.frame / 24, tl = gsap.timeline({ paused: true });
      tl.fromTo(k, { opacity: 0 }, { opacity: 1, duration: 4 / 24, ease: "none" }, 0.2);
      ws.forEach((w, i) => tl.fromTo(w, { opacity: 0, y: P.naik }, { opacity: 1, y: 0, duration: F, ease: "power2.out" }, P.mulai + i * P.jeda));
      tl.to([k, ...ws], { opacity: 0, y: -6, duration: 0.2, ease: "power1.in" }, P.mulai + (ws.length - 1) * P.jeda + F + P.tahan).to({}, { duration: 0.4 });
      return tl;
    },
  });

  I({
    id: "mgp-strip-sorot", nama: "Strip Sorot", kat: "teks", jenis: "component", dur: 0.25, rasio: "16:9 · 9:16", twos: false, poster: 1.6,
    desk: "Strip kuning bertepi sobek menyapu di belakang kata kunci dalam 6 frame, lalu kata itu berdenyut 5,5% tepat di ketukan. Seperti stabilo di buku catatan, tapi rapi.",
    kapan: "Satu kata kunci per callout. Strip mulai dari 34% tinggi kata setinggi 58%; jangan disandingkan dengan garis bawah di kata yang sama.",
    params: [["mulai", 0.8, "detik timestamp kata"], ["frame", 6, "frame sapuan"], ["denyut", 0.055, "skala denyut"], ["seed", 5, "bentuk sobekan"], ["sobek", 12, "% kedalaman gerigi"]],
    html: `<div class="x-f x-pp" style="background-color:#E9F0E2"></div><div class="x-f" style="background-image:linear-gradient(rgba(60,110,80,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(60,110,80,.16) 1px, transparent 1px);background-size:24px 24px"></div><div class="x-a x-ln">Air yang <span class="x-kw"><span class="x-hw"><i class="x-hl"></i></span>menghidupkan</span> lembah.</div><div class="x-gr"></div>`,
    css: `$ .x-ln { left: 56px; right: 56px; top: 104px; font-size: 48px; font-weight: 800; line-height: 1.14; letter-spacing: -.015em; color: #141414; }
$ .x-kw { position: relative; display: inline-block; z-index: 0; }
$ .x-hw { position: absolute; left: -8px; right: -8px; top: 34%; height: 58%; z-index: -1; }
$ .x-hl { position: absolute; inset: 0; background-color: #F1C75B; }`,
    build: function build(root, P, H) {
      const ln = root.querySelector(".x-ln"), kw = root.querySelector(".x-kw"), hw = root.querySelector(".x-hw"), hl = root.querySelector(".x-hl");
      const r = H.rnd(P.seed), n = 16, top = [], bot = [];
      for (let i = 0; i <= n; i++) { const x = ((i / n) * 100).toFixed(1); top.push(x + "% " + (r() * P.sobek).toFixed(1) + "%"); bot.unshift(x + "% " + (100 - r() * P.sobek).toFixed(1) + "%"); }
      hl.style.clipPath = "polygon(" + top.concat(bot).join(",") + ")";
      const F = P.frame / 24, tl = gsap.timeline({ paused: true });
      tl.fromTo(ln, { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 5 / 24, ease: "power2.out" }, 0.25)
        .fromTo(hw, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: F, ease: "none" }, P.mulai)
        .fromTo(kw, { scale: 1 }, { scale: 1 + P.denyut, duration: 0.1, ease: "sine.out", yoyo: true, repeat: 1 }, P.mulai + F)
        .to(ln, { opacity: 0, duration: 0.2 }, P.mulai + 2.1).to({}, { duration: 0.35 });
      return tl;
    },
  });

  I({
    id: "mgp-garis-draw", nama: "Garis Bawah Draw-on", kat: "teks", jenis: "component", dur: 0.5, rasio: "16:9 · 9:16", twos: false, poster: 1.7,
    desk: "Garis tangan berwarna tinta merah tertarik di bawah kata kunci dalam 12 frame, sedikit melengkung seperti dicoret pena. Halus, hangat, dan tidak berteriak.",
    kapan: "Penekanan yang lebih tenang dari strip sorot. Mulai sesudah kata tampil; 8-16 frame.",
    params: [["mulai", 0.9, "detik mulai menggaris"], ["frame", 12, "frame tarikan (8-16)"], ["tebal", 5, "px tebal garis"], ["warna", "#B23A32", "warna tinta"]],
    html: `<div class="x-f x-pp" style="background-color:#F6E6DC"></div><div class="x-f" style="background-image:radial-gradient(rgba(150,70,60,.3) 1.4px, transparent 1.9px);background-size:20px 20px"></div><div class="x-a x-ln">Satu langkah <span class="x-kw x-serif">kecil<svg class="x-ul" viewBox="0 0 200 30" preserveAspectRatio="none"><path pathLength="100" d="M4 18 C 40 9, 90 25, 130 14 S 185 11, 196 16"/></svg></span> sudah cukup.</div><div class="x-gr"></div>`,
    css: `$ .x-ln { left: 60px; right: 60px; top: 120px; font-size: 50px; font-weight: 800; line-height: 1.12; letter-spacing: -.015em; color: #141414; }
$ .x-kw { position: relative; display: inline-block; font-style: italic; font-weight: 600; font-size: 1.12em; letter-spacing: 0; }
$ .x-ul { position: absolute; left: -4%; width: 108%; bottom: -.16em; height: .4em; overflow: visible; }
$ .x-ul path { fill: none; stroke-linecap: round; stroke-dasharray: 100 120; stroke-dashoffset: 100; vector-effect: non-scaling-stroke; }`,
    build: function build(root, P, H) {
      const ln = root.querySelector(".x-ln"), p = root.querySelector(".x-ul path"), tl = gsap.timeline({ paused: true });
      p.style.stroke = P.warna; p.style.strokeWidth = P.tebal;
      tl.fromTo(ln, { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 5 / 24, ease: "power2.out" }, 0.3)
        .fromTo(p, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: P.frame / 24, ease: "power1.inOut" }, P.mulai)
        .to(ln, { opacity: 0, duration: 0.2 }, P.mulai + 2).to({}, { duration: 0.35 });
      return tl;
    },
  });

  I({
    id: "mgp-stempel", nama: "Stempel Tinta", kat: "teks", jenis: "component", dur: 0.13, rasio: "16:9 · 1:1", twos: true, poster: 1.4,
    desk: "Cap merah menghantam kertas dalam 3 frame, tinta sedikit belang, dan lembarnya ikut bergetar sesaat. Impact yang terasa fisik tanpa efek ledakan.",
    kapan: "Penegasan status: disetujui, selesai, terbukti. Timing tajam 2-4 frame, tepat di kata VO.",
    params: [["mulai", 0.9, "detik hantaman"], ["skala", 1.7, "skala awal cap"], ["putar", -8, "derajat akhir cap"], ["teks", "DISETUJUI", "isi cap"]],
    html: `<div class="x-f x-tx" style="background-color:#6b4a2e"></div><div class="x-f" style="background-image:repeating-linear-gradient(92deg, rgba(40,22,10,.28) 0 2px, transparent 2px 23px, rgba(255,220,170,.07) 23px 27px, transparent 27px 41px), radial-gradient(ellipse at 30% 40%, rgba(255,220,160,.16), transparent 60%)"></div><div class="x-a x-doc x-pp x-ds"><b>Surat Jalan</b><span>No. 014</span><i></i><i></i><i></i><i></i></div><div class="x-a x-st"><div class="x-stt">DISETUJUI</div></div><div class="x-gr"></div>`,
    css: `$ .x-doc { left: 150px; top: 36px; width: 340px; height: 292px; padding: 34px 36px; }
$ .x-doc b { display: block; font-family: "Fraunces", Georgia, serif; font-size: 30px; font-weight: 600; color: #141414; }
$ .x-doc span { position: absolute; right: 32px; top: 46px; font-size: 12px; letter-spacing: .2em; color: #7a5a2a; }
$ .x-doc i { display: block; height: 9px; margin-top: 22px; background: #e3d7bb; border-radius: 4px; }
$ .x-doc i:nth-of-type(2) { width: 80%; } $ .x-doc i:nth-of-type(4) { width: 58%; }
$ .x-st { left: 196px; top: 176px; width: 248px; height: 90px; border: 5px solid #B23A32; border-radius: 10px; display: grid; place-items: center; color: #B23A32; mix-blend-mode: multiply; opacity: 0; -webkit-mask-image: ${INK}; mask-image: ${INK}; }
$ .x-stt { border: 2px solid #B23A32; border-radius: 5px; padding: 6px 14px; font-size: 29px; font-weight: 800; letter-spacing: .14em; }`,
    build: function build(root, P, H) {
      const st = root.querySelector(".x-st"), doc = root.querySelector(".x-doc"), tl = gsap.timeline({ paused: true });
      root.querySelector(".x-stt").textContent = P.teks;
      tl.fromTo(st, { opacity: 0, scale: P.skala, rotation: P.putar - 8 }, { opacity: 0.92, scale: 1, rotation: P.putar, duration: 3 / 24, ease: "power3.in" }, P.mulai)
        .fromTo(doc, { x: 0, y: 0, rotation: 0 }, { keyframes: [{ x: 4, y: 3, rotation: 0.6, duration: 1 / 24 }, { x: -3, y: -2, rotation: -0.4, duration: 1 / 24 }, { x: 1, y: 1, rotation: 0.15, duration: 1 / 24 }, { x: 0, y: 0, rotation: 0, duration: 2 / 24 }] }, P.mulai + 3 / 24)
        .to({}, { duration: 1.5 });
      return tl;
    },
  });

  I({
    id: "mgp-huruf-guntingan", nama: "Huruf Guntingan", kat: "teks", jenis: "component", dur: 1.2, rasio: "16:9 · 9:16", twos: true, poster: 2.2,
    desk: "Setiap huruf ditempel di potongan kertasnya sendiri, warna dan potongan berbeda, lalu muncul bergantian dengan pop 0,17 s dan boil halus per gambar.",
    kapan: "Judul pendek yang ingin terasa buatan tangan: nama segmen, kata tunggal, hitungan. Maks 8 huruf.",
    params: [["kata", "KERTAS", "huruf yang ditempel"], ["mulai", 0.3, "detik huruf pertama"], ["jeda", 0.17, "detik antarhuruf"], ["putar", 6, "derajat acak maks"], ["boil", 0.7, "px boil per gambar"], ["seed", 12, "acak warna & potongan"]],
    html: `<div class="x-f x-tx" style="background-color:#4a1d2a"></div><div class="x-f" style="background-image:radial-gradient(rgba(255,230,200,.1) 1.6px, transparent 2.1px);background-size:11px 11px"></div><div class="x-a x-tx" style="left:34px;top:30px;width:170px;height:120px;background-color:#e9dfc8;opacity:.16;transform:rotate(-8deg)"></div><div class="x-a x-tx" style="left:430px;top:220px;width:190px;height:110px;background-color:#f3c766;opacity:.14;transform:rotate(6deg)"></div><div class="x-a x-row"></div><div class="x-gr"></div>`,
    css: `$ .x-row { left: 0; right: 0; top: 124px; display: flex; justify-content: center; gap: 8px; filter: drop-shadow(0 5px 5px rgba(0,0,0,.4)); }
$ .x-ch { display: grid; place-items: center; width: 76px; height: 104px; font-size: 64px; font-weight: 800; line-height: 1; }
$ .x-ch.x-serif { font-style: italic; font-weight: 600; }`,
    build: function build(root, P, H) {
      const row = root.querySelector(".x-row"), r = H.rnd(P.seed), cs = [];
      const C = [["#FBF6EA", "#141414"], ["#F1C75B", "#141414"], ["#B23A32", "#FBF6EA"], ["#E9DCBC", "#1C2B45"], ["#78ACDC", "#141414"], ["#F1E6D0", "#B23A32"]];
      [...P.kata].forEach((ch, i) => {
        const b = document.createElement("b"), c = C[i % C.length], j = () => (r() * 9).toFixed(1);
        b.className = "x-ch x-tx" + (i % 2 ? " x-serif" : "");
        b.textContent = ch; b.style.backgroundColor = c[0]; b.style.color = c[1];
        b.style.clipPath = "polygon(" + j() + "% " + j() + "%," + (100 - j()) + "% " + j() + "%," + (100 - j()) + "% " + (100 - j()) + "%," + j() + "% " + (100 - j()) + "%)";
        row.appendChild(b); cs.push({ b, rot: (r() * 2 - 1) * P.putar });
      });
      return H.loop(3.2, (t) => {
        const f = Math.floor(t * 12);
        cs.forEach((c, i) => {
          const t0 = P.mulai + i * P.jeda;
          if (t < t0) return gsap.set(c.b, { opacity: 0 });
          const e = H.ent(t, t0);
          gsap.set(c.b, { opacity: H.cl((t - t0) / 0.2), y: 40 * e, scale: 1 - 0.08 * e, rotation: c.rot + H.boil(f, i, 0.5), x: H.boil(f, i + 20, P.boil) });
        });
      });
    },
  });

  I({
    id: "mgp-denyut-kata", nama: "Denyut Kata Kunci", kat: "teks", jenis: "component", dur: 0.25, rasio: "16:9 · 9:16", twos: false, poster: 1.25,
    desk: "Kata kunci emas berdenyut 5,5% dengan pendar lembut tepat di timestamp kata, dua kali bila VO mengulang. Penanda waktu di bawah memperlihatkan sinkronnya.",
    kapan: "Saat kata kunci diucapkan dan tidak perlu bingkai tambahan. Paling kuat di kartu navy.",
    params: [["ketuk", [1.1, 2.1], "detik timestamp kata"], ["denyut", 0.055, "skala denyut"], ["warna", "#F3C766", "aksen kata kunci"]],
    html: `<div class="x-f x-tx" style="background-color:#0f3b3f"></div><div class="x-f" style="background-image:radial-gradient(circle at 50% 44%, rgba(243,199,102,.24), transparent 55%), repeating-radial-gradient(circle at 50% 44%, transparent 0 38px, rgba(255,255,255,.03) 38px 40px)"></div><div class="x-a x-ln">Yang kecil pun<br><span class="x-kw x-serif">berarti.</span></div><div class="x-a x-tr"><i class="x-ph"></i></div><div class="x-gr"></div>`,
    css: `$ .x-ln { left: 0; right: 0; top: 104px; text-align: center; font-size: 46px; font-weight: 800; line-height: 1.12; color: #FBF6EA; }
$ .x-kw { display: inline-block; font-style: italic; font-weight: 600; font-size: 1.24em; }
$ .x-tr { left: 120px; right: 120px; top: 300px; height: 2px; background: rgba(241,230,208,.25); }
$ .x-tr b { position: absolute; top: -5px; width: 2px; height: 12px; background: #F3C766; }
$ .x-ph { position: absolute; top: -4px; left: 0; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: #FBF6EA; }`,
    build: function build(root, P, H) {
      const kw = root.querySelector(".x-kw"), tr = root.querySelector(".x-tr"), ph = root.querySelector(".x-ph"), ln = root.querySelector(".x-ln"), D = 3;
      kw.style.color = P.warna;
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(ln, { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 5 / 24, ease: "power2.out" }, 0.2);
      P.ketuk.forEach((k) => {
        const m = document.createElement("b"); m.style.left = (k / D) * 100 + "%"; tr.appendChild(m);
        tl.fromTo(kw, { scale: 1, textShadow: "0 0 0px rgba(243,199,102,0)" }, { scale: 1 + P.denyut, textShadow: "0 0 18px rgba(243,199,102,.75)", duration: 0.09, ease: "sine.out", yoyo: true, repeat: 1 }, k);
      });
      tl.fromTo(ph, { left: "0%" }, { left: "100%", duration: D, ease: "none" }, 0);
      return tl;
    },
  });

  /* ===== JUDUL & KARTU ===== */
  I({
    id: "mgp-kartu-bab", nama: "Kartu Bab", kat: "judul", jenis: "block", dur: 2.9, rasio: "16:9 · 9:16", twos: true, poster: 1.6,
    desk: "Kartu navy bertepi krem sobek naik dari bawah dengan peluruhan eksponensial, lalu kicker, judul serif, dan garis emas menyusul. Pembuka bab yang terasa seperti sampul buku.",
    kapan: "Awal bab atau segmen. Tahan minimal 25% durasi shot; keluar 40-50% lebih cepat dari masuk.",
    params: [["kicker", "BAB DUA", "teks kicker"], ["naik", 180, "px jarak masuk"], ["putar", -1.2, "derajat akhir (±1-1,5)"], ["seed", 21, "bentuk tepi sobek"], ["gerigi", 3.5, "px amplitudo tepi"]],
    html: `<div class="x-f x-tx" style="background-color:#2c3e55"></div><div class="x-f" style="background-image:repeating-linear-gradient(105deg, transparent 0 22px, rgba(200,225,255,.18) 22px 23px), linear-gradient(rgba(14,22,40,.6), rgba(58,82,112,.2))"></div><div class="x-a x-card x-ds"><div class="x-f x-pp x-rim"></div><div class="x-a x-face x-tx"><div class="x-k">BAB DUA</div><div class="x-t x-serif">Musim <em>Hujan</em></div><i class="x-r"></i></div></div><div class="x-gr"></div>`,
    css: `$ .x-card { left: 150px; top: 80px; width: 340px; height: 200px; }
$ .x-rim { background-color: #F1E6D0; }
$ .x-face { inset: 10px; background-color: #1C2B45; display: grid; place-content: center; justify-items: center; text-align: center; color: #fff; }
$ .x-k { font-size: 13px; letter-spacing: .32em; font-weight: 600; color: #F3C766; }
$ .x-t { margin-top: 10px; font-size: 50px; font-weight: 400; line-height: 1; }
$ .x-t em { font-style: italic; color: #F3C766; }
$ .x-r { display: block; width: 64px; height: 2px; margin-top: 16px; background: #F3C766; }`,
    build: function build(root, P, H) {
      const q = (s) => root.querySelector(s), card = q(".x-card");
      q(".x-k").textContent = P.kicker;
      q(".x-rim").style.clipPath = H.rect(P.seed, 340, 200, P.gerigi, 22);
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(card, { y: P.naik, rotation: P.putar + 5, opacity: 0 }, { y: 0, rotation: P.putar, opacity: 1, duration: 0.62, ease: "expo.out" }, 0.25)
        .fromTo(q(".x-k"), { opacity: 0 }, { opacity: 1, duration: 4 / 24, ease: "none" }, 0.55)
        .fromTo(q(".x-t"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 6 / 24, ease: "power2.out" }, 0.65)
        .fromTo(q(".x-r"), { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, 0.82)
        .to(card, { y: -40, opacity: 0, duration: 0.3, ease: "power2.in" }, 2.55)
        .to({}, { duration: 0.3 });
      return tl;
    },
  });

  I({
    id: "mgp-label-kertas", nama: "Label Kertas", kat: "judul", jenis: "component", dur: 0.6, rasio: "16:9 · 9:16", twos: true, poster: 1.5,
    desk: "Strip krem dengan ply merah tergeser (−4, +5) px masuk dari kiri sejauh 420 px memakai rumus masuk eksponensial 0,17 s. Label tempat yang terasa ditempel tangan.",
    kapan: "Nama tempat, benda, atau waktu di dalam scene. Masuk di 45-70% durasi shot, sesudah subjek tampil.",
    params: [["judul", "Pasar Pagi", "baris utama"], ["sub", "titik 01 · 05.40", "baris kecil"], ["mulai", 0.5, "detik masuk"], ["jarak", 420, "px offset masuk dari kiri"], ["keluar", 2.6, "detik keluar"], ["ply", "#B23A32", "warna ply"]],
    html: `<div class="x-f">${SC(T.pasarPagi)}</div><div class="x-a x-lab"><div class="x-f x-ply x-tx"></div><div class="x-f x-pp x-face"><b>Pasar Pagi</b><span>titik 01 · 05.40</span></div></div><div class="x-gr"></div>`,
    css: `$ .x-lab { left: 40px; top: 254px; width: 250px; height: 64px; filter: drop-shadow(0 5px 5px rgba(45,28,12,.32)); }
$ .x-ply { left: -4px; top: 5px; width: 250px; height: 64px; }
$ .x-face { padding: 9px 18px; display: flex; flex-direction: column; justify-content: center; }
$ .x-face b { font-size: 25px; font-weight: 800; color: #141414; }
$ .x-face span { margin-top: 3px; font-size: 11.5px; letter-spacing: .22em; text-transform: uppercase; color: #7a5a2a; }`,
    build: function build(root, P, H) {
      const lab = root.querySelector(".x-lab"), ply = root.querySelector(".x-ply"), face = root.querySelector(".x-face");
      face.querySelector("b").textContent = P.judul; face.querySelector("span").textContent = P.sub;
      ply.style.backgroundColor = P.ply;
      face.style.clipPath = H.rect(4, 250, 64, 2, 16); ply.style.clipPath = H.rect(8, 250, 64, 2, 16);
      return H.loop(3.2, (t) => {
        if (t < P.mulai) return gsap.set(lab, { opacity: 0 });
        const e = H.ent(t, P.mulai), o = H.sm((t - P.keluar) / 0.22);
        gsap.set(lab, { x: -P.jarak * e - P.jarak * 0.6 * o * o, opacity: Math.min(H.cl((t - P.mulai) / 0.2), 1 - o) });
      });
    },
  });

  I({
    id: "mgp-pita-judul", nama: "Pita Judul", kat: "judul", jenis: "component", dur: 0.7, rasio: "16:9 · 9:16", twos: true, poster: 1.5,
    desk: "Pita merah membentang dari tengah, ekor berlekuk keluar dari balik badan pita, lalu judul serif naik di atasnya. Meriah tanpa ramai.",
    kapan: "Judul acara, nama festival, penanda perayaan. Satu pita per frame.",
    params: [["judul", "Festival", "kata pertama"], ["aksen", "Layang", "kata aksen (italic emas)"], ["mulai", 0.35, "detik bentang"], ["warna", "#B23A32", "warna pita"]],
    html: `<div class="x-f">${SC(T.festival)}</div><div class="x-a x-rb"><i class="x-tl x-tx"></i><i class="x-tr x-tx"></i><div class="x-mid x-tx"><span class="x-serif x-tt">Festival <em>Layang</em></span></div></div><div class="x-gr"></div>`,
    css: `$ .x-rb { left: 130px; top: 128px; width: 380px; height: 74px; filter: drop-shadow(0 6px 6px rgba(45,28,12,.35)); }
$ .x-mid { position: absolute; inset: 0; display: grid; place-items: center; color: #FBF6EA; font-size: 36px; }
$ .x-tt em { font-style: italic; color: #F3C766; }
$ .x-tl, $ .x-tr { position: absolute; top: 18px; width: 92px; height: 74px; background-color: #7f2520; }
$ .x-tl { left: -62px; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 24% 50%); }
$ .x-tr { right: -62px; clip-path: polygon(0 0, 100% 0, 76% 50%, 100% 100%, 0 100%); }`,
    build: function build(root, P, H) {
      const q = (s) => root.querySelector(s), m = P.mulai, tl = gsap.timeline({ paused: true });
      q(".x-mid").style.backgroundColor = P.warna;
      q(".x-tt").innerHTML = P.judul + " <em>" + P.aksen + "</em>";
      tl.fromTo(q(".x-mid"), { scaleX: 0 }, { scaleX: 1, duration: 0.42, ease: "expo.out" }, m)
        .fromTo(q(".x-tl"), { x: 150, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "expo.out" }, m + 0.12)
        .fromTo(q(".x-tr"), { x: -150, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "expo.out" }, m + 0.12)
        .fromTo(q(".x-tt"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 6 / 24, ease: "power2.out" }, m + 0.3)
        .to(q(".x-rb"), { y: -24, opacity: 0, duration: 0.25, ease: "power2.in" }, 2.7)
        .to({}, { duration: 0.3 });
      return tl;
    },
  });

  I({
    id: "mgp-kartu-kutipan", nama: "Kartu Kutipan", kat: "judul", jenis: "component", dur: 0.7, rasio: "16:9 · 1:1", twos: true, poster: 1.4,
    desk: "Kartu krem berselotip jatuh ke papan, berayun sekali, lalu diam di kemiringan ±1,5° dengan bayangan lembut. Kutipan jadi terasa seperti catatan yang ditempel.",
    kapan: "Kutipan, pepatah, atau pesan penutup. Maks 2-3 baris; tahan 0,5 s + 0,3 s per kata.",
    params: [["kutipan", "Pelan-pelan, asal <em>sampai</em>.", "isi (em = aksen)"], ["sumber", "PEPATAH", "baris sumber"], ["putar", 1.5, "derajat akhir"], ["mulai", 0.25, "detik jatuh"]],
    html: `<div class="x-f x-tx" style="background-color:#a87b4f"></div><div class="x-f" style="background-image:radial-gradient(rgba(70,40,15,.38) 1.2px, transparent 1.8px), radial-gradient(rgba(255,230,190,.22) 1px, transparent 1.6px);background-size:9px 9px, 13px 13px;background-position:0 0, 4px 6px;box-shadow:inset 0 0 0 12px #5a3b22, inset 0 0 0 14px rgba(0,0,0,.25)"></div><div class="x-a x-qc x-pp"><i class="x-tape"></i><p class="x-serif">“Pelan-pelan, asal <em>sampai</em>.”</p><span>PEPATAH</span></div><div class="x-gr"></div>`,
    css: `$ .x-qc { left: 170px; top: 70px; width: 300px; height: 216px; padding: 40px 32px; box-shadow: 0 6px 12px rgba(20,12,4,.3); }
$ .x-qc p { font-size: 34px; line-height: 1.1; font-style: italic; color: #141414; }
$ .x-qc em { color: #B23A32; }
$ .x-qc span { position: absolute; left: 32px; bottom: 26px; font-size: 11px; letter-spacing: .3em; color: #7a5a2a; font-weight: 600; }
$ .x-tape { position: absolute; left: 118px; top: -12px; width: 66px; height: 24px; background: rgba(241,230,208,.78); box-shadow: 0 1px 2px rgba(0,0,0,.15); clip-path: polygon(3% 0, 97% 6%, 100% 100%, 0 94%); }`,
    build: function build(root, P, H) {
      const qc = root.querySelector(".x-qc"), tl = gsap.timeline({ paused: true });
      qc.querySelector("p").innerHTML = "“" + P.kutipan + "”"; qc.querySelector("span").textContent = P.sumber;
      tl.fromTo(qc, { y: -300, rotation: -9 }, { y: 0, rotation: P.putar, duration: 0.7, ease: "back.out(1.5)", transformOrigin: "50% 0%" }, P.mulai)
        .to(qc, { y: -5, rotation: P.putar + 0.4, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: 1 }, P.mulai + 0.8)
        .to(qc, { y: 300, opacity: 0, duration: 0.3, ease: "power2.in" }, 3.4)
        .to({}, { duration: 0.25 });
      return tl;
    },
  });

  /* ===== LOWER THIRD & CAPTION ===== */
  I({
    id: "mgp-lower-third-sobek", nama: "Lower Third Sobek", kat: "lower", jenis: "component", dur: 0.6, rasio: "16:9", twos: true, poster: 1.6,
    desk: "Nama di strip navy dan peran di strip krem, masing-masing dengan tepi kanan sobek, masuk berurutan dari kiri dengan aksen emas. Identitas narasumber yang elegan.",
    kapan: "Memperkenalkan orang atau narasumber. Tahan 2-3 s, di sepertiga bawah yang bebas subtitle.",
    params: [["nama", "Rara Wulandari", "baris nama"], ["peran", "Perajin layang-layang", "baris peran"], ["mulai", 0.4, "detik masuk"], ["jarak", 420, "px offset masuk"], ["keluar", 2.8, "detik keluar"], ["seed", 6, "bentuk sobekan"]],
    html: `<div class="x-f">${SC(T.bengkel)}</div><div class="x-a x-lt"><div class="x-a x-nm x-tx"><b>Rara Wulandari</b></div><div class="x-a x-rl x-pp"><span>Perajin layang-layang</span></div><i class="x-a x-gd"></i></div><div class="x-gr"></div>`,
    css: `$ .x-lt { left: 34px; top: 246px; width: 320px; height: 90px; filter: drop-shadow(0 5px 6px rgba(20,12,4,.35)); }
$ .x-nm { left: 0; top: 0; width: 300px; height: 50px; background-color: #1C2B45; padding: 0 22px; display: flex; align-items: center; }
$ .x-nm b { color: #FBF6EA; font-size: 25px; font-weight: 700; white-space: nowrap; }
$ .x-rl { left: 20px; top: 46px; width: 236px; height: 32px; padding: 0 14px; display: flex; align-items: center; }
$ .x-rl span { font-size: 14px; font-weight: 600; letter-spacing: .05em; color: #141414; white-space: nowrap; }
$ .x-gd { left: 0; top: 0; width: 5px; height: 50px; background: #F3C766; }`,
    build: function build(root, P, H) {
      const q = (s) => root.querySelector(s), nm = q(".x-nm"), rl = q(".x-rl"), gd = q(".x-gd");
      nm.querySelector("b").textContent = P.nama; rl.querySelector("span").textContent = P.peran;
      nm.style.clipPath = H.wipe(292, H.torn(P.seed, 6, 4), 300, 50, false);
      rl.style.clipPath = H.wipe(229, H.torn(P.seed + 1, 5, 3), 236, 32, false);
      const L = [[nm, 0], [gd, 0], [rl, 0.12]];
      return H.loop(3.4, (t) => {
        L.forEach(([el, d], i) => {
          const t0 = P.mulai + d;
          if (t < t0) return gsap.set(el, { opacity: 0 });
          const e = H.ent(t, t0), o = H.sm((t - P.keluar - (0.12 - d)) / 0.2);
          gsap.set(el, { x: -P.jarak * e - P.jarak * 0.5 * o * o, opacity: Math.min(H.cl((t - t0) / 0.2), 1 - o) });
        });
      });
    },
  });

  I({
    id: "mgp-caption-strip", nama: "Caption Strip Krem", kat: "lower", jenis: "component", dur: 1.1, rasio: "9:16", v: true, twos: false, poster: 1.6,
    desk: "Subtitle VO per frasa 3-5 kata di atas strip krem miring halus, berganti dengan fade 4 frame. Diletakkan di dasar pita aman 9:16 supaya tidak tertutup tombol platform.",
    kapan: "Reels, TikTok, Shorts dengan narasi. Ukuran 52 px pada 1080 w (minimal 28 px); semua kata di pita 168-1330 px.",
    params: [["frasa", ["Setiap pagi ia datang", "membawa air ke desa", "tanpa pernah mengeluh"], "frasa 3-5 kata"], ["per", 1.1, "detik per frasa (ikut VO)"], ["mulai", 0.2, "detik frasa pertama"], ["miring", 1, "derajat bergantian"]],
    html: `<div class="x-f">${SC(T.fajarLaut)}</div><div class="x-a x-cap"><span class="x-cs2 x-pp"></span></div><div class="x-gr"></div>`,
    css: `$ .x-cap { left: 0; right: 0; top: 398px; display: flex; justify-content: center; }
$ .x-cs2 { display: inline-block; padding: 7px 13px 8px; font-size: 19px; font-weight: 700; color: #141414; box-shadow: 0 4px 8px rgba(20,12,4,.28); white-space: nowrap; }`,
    build: function build(root, P, H) {
      const s = root.querySelector(".x-cs2"), n = P.frasa.length, D = P.mulai + n * P.per + 0.6;
      return H.loop(D, (t) => {
        if (t < P.mulai) return gsap.set(s, { opacity: 0 });
        const k = Math.min(n - 1, Math.floor((t - P.mulai) / P.per)), lt = t - P.mulai - k * P.per, u = H.cl(lt / (4 / 24));
        if (s.dataset.k !== String(k)) { s.dataset.k = k; s.textContent = P.frasa[k]; }
        const out = H.sm((t - (D - 0.2)) / 0.2);
        gsap.set(s, { opacity: Math.min(u, 1 - out), y: 8 * (1 - H.sm(u)), rotation: k % 2 ? P.miring : -P.miring });
      });
    },
  });

  I({
    id: "mgp-caption-kata-aktif", nama: "Caption Kata Aktif", kat: "lower", jenis: "component", dur: 1.9, rasio: "9:16", v: true, twos: false, poster: 1.2,
    desk: "Satu frasa tampil utuh, lalu potongan kertas kuning melompat dari kata ke kata mengikuti VO. Penonton tahu persis kata mana yang sedang diucapkan.",
    kapan: "Konten edukasi vertikal dan kutipan yang perlu dibaca sambil didengar. Waktu kata dari transkrip per kata.",
    params: [["kata", ["Kertas", "kecil", "bisa", "jadi", "cerita"], "kata dalam frasa"], ["waktu", [0.3, 0.75, 1.1, 1.4, 1.8], "detik tiap kata (VO)"], ["geser", 3, "frame lompatan chip"]],
    html: `<div class="x-f">${SC(T.gunungV)}</div><div class="x-a x-cb"><div class="x-ck"><i class="x-chip"></i></div></div><div class="x-gr"></div>`,
    css: `$ .x-cb { left: 0; right: 0; top: 386px; display: flex; justify-content: center; }
$ .x-ck { position: relative; display: flex; gap: 7px; padding: 10px 14px; background: rgba(14,21,48,.86); border-radius: 3px; box-shadow: 0 6px 14px rgba(0,0,0,.3); }
$ .x-ck span { position: relative; z-index: 1; font-size: 21px; font-weight: 700; color: #FBF6EA; }
$ .x-chip { position: absolute; top: 7px; bottom: 7px; left: 0; width: 0; background-color: #F1C75B; clip-path: polygon(2% 6%, 98% 0, 100% 92%, 0 100%); }`,
    build: function build(root, P, H) {
      const ck = root.querySelector(".x-ck"), chip = root.querySelector(".x-chip"), ws = [];
      P.kata.forEach((w) => { const s = document.createElement("span"); s.textContent = w; ck.appendChild(s); ws.push(s); });
      const D = P.waktu[P.waktu.length - 1] + 1.3, box = (i) => [ws[i].offsetLeft - 5, ws[i].offsetWidth + 10];
      return H.loop(D, (t) => {
        let k = -1; P.waktu.forEach((w, i) => { if (t >= w) k = i; });
        ws.forEach((s, i) => { s.style.color = i === k ? "#141414" : "#FBF6EA"; s.style.opacity = i <= k || k < 0 ? 1 : 0.55; });
        if (k < 0) return gsap.set(chip, { opacity: 0 });
        const a = box(Math.max(0, k - 1)), b = box(k), u = k ? H.sm((t - P.waktu[k]) / (P.geser / 24)) : 1;
        gsap.set(chip, { opacity: 1, x: a[0] + (b[0] - a[0]) * u, width: a[1] + (b[1] - a[1]) * u });
        gsap.set(ws[k], { scale: 1 + 0.06 * H.ent(t, P.waktu[k], 0.12) });
      });
    },
  });

  I({
    id: "mgp-tag-lokasi", nama: "Tag Lokasi", kat: "lower", jenis: "component", dur: 1.0, rasio: "16:9 · 9:16", twos: true, poster: 1.9,
    desk: "Pin merah jatuh ke peta kertas dengan bayangan kontak, garis penunjuk tertarik, lalu tag nama dan koordinat terbuka. Koordinat ditulis dari sumber, bukan dikira-kira.",
    kapan: "Memperkenalkan lokasi nyata di peta atau di atas set. Pin di titik koordinat yang terverifikasi.",
    params: [["nama", "Kota Tua", "nama lokasi"], ["koordinat", "6,13° LS · 106,81° BT", "dari sumber terverifikasi"], ["mulai", 0.4, "detik pin jatuh"], ["tinggi", 140, "px tinggi jatuh"]],
    html: `<div class="x-f x-tx" style="background-color:#86BDB6"></div><div class="x-f" style="background-image:repeating-linear-gradient(transparent 0 18px, rgba(255,255,255,.15) 18px 20px)"></div><svg class="x-f x-map" viewBox="0 0 640 360"><path d="M0 214 C 80 192, 140 232, 210 216 S 330 172, 400 198 S 520 244, 640 208 L 640 360 L 0 360 Z"/><path d="M470 60 C 500 40, 560 46, 580 70 S 560 120, 520 116 S 450 90, 470 60 Z"/></svg><i class="x-cs x-psh" style="left:288px;top:207px;width:24px;height:10px"></i><div class="x-a x-pin"><svg viewBox="0 0 40 52"><path d="M20 51C20 51 3 31 3 19a17 17 0 0 1 34 0c0 12-17 32-17 32z" fill="#B23A32"/><circle cx="20" cy="19" r="7" fill="#FBF6EA"/></svg></div><i class="x-a x-ld"></i><div class="x-a x-tg x-pp"><b class="x-serif">Kota Tua</b><span>6,13° LS · 106,81° BT</span></div><div class="x-gr"></div>`,
    css: `$ .x-map { filter: drop-shadow(0 4px 4px rgba(45,28,12,.25)); }
$ .x-map path { fill: #EADFC4; stroke: #c9b48a; stroke-width: 2; }
$ .x-pin { left: 280px; top: 160px; width: 40px; height: 52px; filter: drop-shadow(0 3px 3px rgba(45,28,12,.35)); }
$ .x-pin svg { display: block; width: 100%; height: 100%; }
$ .x-ld { left: 318px; top: 178px; width: 40px; height: 2px; background: #141414; transform-origin: 0 50%; }
$ .x-tg { left: 356px; top: 150px; padding: 9px 14px 10px; box-shadow: 0 4px 8px rgba(20,12,4,.3); }
$ .x-tg b { display: block; font-size: 28px; font-weight: 600; line-height: 1; color: #141414; white-space: nowrap; }
$ .x-tg span { display: block; margin-top: 5px; font-size: 12px; letter-spacing: .08em; color: #7a5a2a; white-space: nowrap; }`,
    build: function build(root, P, H) {
      const q = (s) => root.querySelector(s), pin = q(".x-pin"), sh = q(".x-psh"), ld = q(".x-ld"), tg = q(".x-tg"), co = q(".x-tg span");
      q(".x-tg b").textContent = P.nama; co.textContent = P.koordinat;
      gsap.set(pin, { transformOrigin: "50% 100%" });
      return H.loop(3.4, (t) => {
        const m = P.mulai;
        if (t < m) { gsap.set([pin, sh, tg], { opacity: 0 }); return gsap.set(ld, { scaleX: 0 }); }
        const e = H.ent(t, m, 0.12), land = H.ent(t, m + 0.2, 0.1);
        gsap.set(pin, { opacity: 1, y: -P.tinggi * e, scaleY: 1 - 0.12 * (t > m + 0.2 ? land : 0), scaleX: 1 + 0.08 * (t > m + 0.2 ? land : 0) });
        gsap.set(sh, { opacity: 1 - e, scale: 0.4 + 0.6 * (1 - e) });
        gsap.set(ld, { scaleX: H.sm((t - m - 0.35) / 0.2) });
        const u = H.sm((t - m - 0.5) / 0.25);
        gsap.set(tg, { opacity: u > 0 ? 1 : 0, clipPath: "inset(0% " + (100 - u * 100).toFixed(1) + "% 0% 0%)" });
        gsap.set(co, { opacity: H.cl((t - m - 0.75) / (4 / 24)) });
      });
    },
  });

  /* ===== TEKSTUR & OVERLAY ===== */
  I({
    id: "mgp-grain-kertas", nama: "Grain Kertas Berseed", kat: "tekstur", jenis: "component", dur: 0, rasio: "semua", twos: true, poster: 0.5,
    desk: "Butir multiply menyeluruh yang berganti pola tiap gambar on twos dari seed tetap, jadi render ulang selalu identik. Setengah kiri tanpa grain, kanan dengan grain 0,14.",
    kapan: "Di atas seluruh frame collage, selalu. Opasitas 0,10-0,16; jangan pakai treatment film grain footage.",
    params: [["opasitas", 0.14, "multiply 0,10-0,16"], ["seed", 3, "seed dasar"], ["butir", 2, "px ukuran butir"], ["pisah", true, "tampilkan perbandingan"]],
    html: `<div class="x-f">${SC(T.mendung)}</div><canvas class="x-a x-gc"></canvas><i class="x-a x-dv"></i><span class="x-a x-lb x-l">tanpa grain</span><span class="x-a x-lb x-r">grain 0,14</span>`,
    css: `$ .x-gc { left: 0; top: 0; width: 100%; height: 100%; mix-blend-mode: multiply; image-rendering: pixelated; }
$ .x-dv { left: 319px; top: 0; width: 2px; height: 100%; background: #FBF6EA; box-shadow: 0 0 8px rgba(0,0,0,.3); }
$ .x-lb { top: 14px; padding: 5px 9px; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; background: rgba(251,246,234,.9); color: #141414; }
$ .x-lb.x-l { left: 14px; } $ .x-lb.x-r { right: 14px; }`,
    build: function build(root, P, H) {
      const cv = root.querySelector(".x-gc"), W = root.offsetWidth, h = root.offsetHeight, x0 = P.pisah ? W / 2 : 0;
      if (!P.pisah) root.querySelectorAll(".x-dv,.x-lb").forEach((n) => n.remove());
      cv.style.left = x0 + "px"; cv.style.width = W - x0 + "px"; cv.style.opacity = P.opasitas;
      cv.width = Math.ceil((W - x0) / P.butir); cv.height = Math.ceil(h / P.butir);
      const ctx = cv.getContext("2d"), img = ctx.createImageData(cv.width, cv.height);
      let last = -1;
      return H.loop(2, (t) => {
        const f = Math.floor(t * 12); if (f === last) return; last = f;
        const r = H.rnd(P.seed * 977 + f), d = img.data;
        for (let i = 0; i < d.length; i += 4) { const v = 255 - r() * 255; d[i] = v; d[i + 1] = v * 0.97; d[i + 2] = v * 0.92; d[i + 3] = 255; }
        ctx.putImageData(img, 0, 0);
      });
    },
  });

  I({
    id: "mgp-boil-tepi", nama: "Boil Potongan", kat: "tekstur", jenis: "component", dur: 0, rasio: "semua", twos: true, poster: 0.5,
    desk: "Setiap potongan bergetar ±0,7 px per gambar dan tokoh ±1,5 px dengan putar ±0,45°, di-seed dari nomor gambar dan indeks lapis. Kolase terasa hidup seperti stop motion asli.",
    kapan: "Semua scene collage yang tampak terlalu digital. Pratinjau memakai pengali 3 agar terlihat; set lihat = 1 untuk render.",
    params: [["potongan", 0.7, "px boil potongan"], ["hero", 1.5, "px boil tokoh/hero"], ["putar", 0.45, "derajat boil hero"], ["lihat", 3, "pengali pratinjau (1 = render)"]],
    html: `<div class="x-f x-sc">${SC(T.tropis)}${KITE}</div><div class="x-gr"></div>`,
    css: ``,
    build: function build(root, P, H) {
      const ps = [...root.querySelectorAll(".x-sc > .x-a")], hero = root.querySelector(".x-kite");
      return H.loop(2, (t) => {
        const f = Math.floor(t * 12), m = P.lihat;
        ps.forEach((el, i) => {
          const a = el === hero ? P.hero : P.potongan;
          gsap.set(el, { x: H.boil(f, i, a * m), y: H.boil(f, i + 40, a * m), rotation: el === hero ? H.boil(f, i + 80, P.putar * m) : 0 });
        });
      });
    },
  });

  I({
    id: "mgp-debu-cahaya", nama: "Debu Cahaya", kat: "tekstur", jenis: "component", dur: 0, rasio: "16:9 · 9:16", twos: false, poster: 1.5,
    desk: "Berkas cahaya hangat dari jendela dengan butir debu yang melayang dan berkelip di dalamnya. Loop mulus karena semua gerak memakai periode yang membagi durasi.",
    kapan: "Interior tenang, momen hening, kilas balik. Idle dekorasi kecil, bukan pusat perhatian.",
    params: [["butir", 38, "jumlah debu"], ["lebar", 64, "px lebar berkas"], ["seed", 8, "sebaran debu"], ["siklus", 6, "detik loop mulus"]],
    html: `<div class="x-f x-tx" style="background-color:#3a2619"></div><div class="x-a x-tx" style="left:0;top:286px;width:640px;height:74px;background-color:#24170f"></div><div class="x-a x-wd"></div><div class="x-a x-bm"></div><div class="x-a x-tx x-ds" style="left:360px;top:240px;width:200px;height:14px;background-color:#6b4426"></div><div class="x-a x-tx" style="left:376px;top:254px;width:10px;height:50px;background-color:#4f311c"></div><div class="x-a x-tx" style="left:534px;top:254px;width:10px;height:50px;background-color:#4f311c"></div><div class="x-a x-tx x-ds" style="left:430px;top:186px;width:44px;height:56px;border-radius:40% 40% 30% 30%;background-color:#B23A32"></div><div class="x-f x-mt"></div><div class="x-gr"></div>`,
    css: `$ .x-wd { left: 70px; top: 40px; width: 120px; height: 150px; background: linear-gradient(#ffe8b0, #f3c766); box-shadow: inset 0 0 0 6px #5a3a22, 0 0 40px rgba(255,220,150,.45); }
$ .x-wd::before, $ .x-wd::after { content: ""; position: absolute; background: #5a3a22; }
$ .x-wd::before { left: 57px; top: 0; width: 6px; height: 100%; } $ .x-wd::after { left: 0; top: 72px; width: 100%; height: 6px; }
$ .x-bm { left: 70px; top: 40px; width: 470px; height: 300px; clip-path: polygon(0 0, 26% 0, 100% 80%, 100% 100%, 50% 100%, 0 50%); background: linear-gradient(150deg, rgba(255,232,170,.5), rgba(255,232,170,.04) 80%); mix-blend-mode: screen; }
$ .x-mt i { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff3d2; box-shadow: 0 0 6px rgba(255,236,190,.95); }`,
    build: function build(root, P, H) {
      const mt = root.querySelector(".x-mt"), r = H.rnd(P.seed), D = P.siklus, ds = [];
      for (let i = 0; i < P.butir; i++) {
        const el = document.createElement("i"); mt.appendChild(el);
        ds.push({ el, a: r(), b: r() * 2 - 1, ph: r() * 6.283, k: 1 + Math.floor(r() * 2), s: 0.6 + r() * 1.1 });
      }
      return H.loop(D, (t) => {
        const w = (6.283 * t) / D;
        ds.forEach((d) => {
          const a = (d.a + 0.04 * Math.sin(w * d.k + d.ph)) % 1, x = 130 + a * 300, y = 100 + a * 230;
          const off = d.b * P.lebar + 10 * Math.sin(w * d.k + d.ph * 2);
          gsap.set(d.el, { x: x + off * 0.6, y: y - off * 0.8 + 6 * Math.cos(w + d.ph), scale: d.s, opacity: (0.25 + 0.75 * Math.abs(Math.sin(w * 2 * d.k + d.ph))) * (1 - Math.abs(d.b) * 0.6) });
        });
      });
    },
  });

  I({
    id: "mgp-cahaya-hangat", nama: "Cahaya Hangat + Vignette", kat: "tekstur", jenis: "component", dur: 0, rasio: "semua", twos: false, poster: 1.6,
    desk: "Radial rgba(255,240,205,.18) dari kiri atas dengan radius 900 px, ditambah vignette lembut di tepi. Garis pembanding memperlihatkan bedanya sebelum dan sesudah.",
    kapan: "Akhir setiap scene collage, di atas world dan di bawah grain. Menyatukan potongan dari kit yang berbeda.",
    params: [["x", 120, "px sumber cahaya (720 w)"], ["y", 80, "px sumber cahaya"], ["radius", 900, "px radius"], ["kuat", 0.18, "alpha cahaya"], ["vignette", 0.42, "alpha tepi"]],
    html: `<div class="x-f">${SC(T.senjaKota)}</div><div class="x-f x-ov"><div class="x-f x-warm"></div><div class="x-f x-vig"></div></div><i class="x-a x-dv"></i><div class="x-gr"></div>`,
    css: `$ .x-dv { top: 0; width: 2px; height: 100%; background: #FBF6EA; box-shadow: 0 0 8px rgba(0,0,0,.35); }`,
    build: function build(root, P, H) {
      const ov = root.querySelector(".x-ov"), dv = root.querySelector(".x-dv"), W = root.offsetWidth, s = W / 720;
      root.querySelector(".x-warm").style.background = "radial-gradient(circle " + P.radius * s + "px at " + P.x * s + "px " + P.y * s + "px, rgba(255,240,205," + P.kuat * 2.2 + "), rgba(255,240,205," + P.kuat + ") 30%, rgba(255,240,205,0))";
      root.querySelector(".x-vig").style.background = "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(30,16,6," + P.vignette + "))";
      return H.loop(4.8, (t) => {
        const x = W * H.key([[0, 0.12], [0.6, 0.12], [2, 0.88], [2.8, 0.88], [4.2, 0.12]], t);
        ov.style.clipPath = "inset(0 0 0 " + x.toFixed(1) + "px)"; dv.style.left = x - 1 + "px";
      });
    },
  });

  I({
    id: "mgp-medali-cahaya", nama: "Medali Cahaya", kat: "tekstur", jenis: "component", dur: 1.0, rasio: "16:9 · 1:1", twos: true, poster: 2.2,
    desk: "Cakram bertingkat, bintang delapan, sinar yang berputar pelan, dan pendar screen selebar 2,1 kali radius. Bingkai cahaya untuk benda atau tokoh yang dimuliakan.",
    kapan: "Momen penting, penghargaan, emblem. Untuk tokoh suci, isi pusatnya dengan kaligrafi dari kode, bukan gambar AI.",
    params: [["radius", 70, "px radius cakram luar"], ["pendar", 2.1, "x radius untuk glow"], ["sinar", 24, "jumlah sinar"], ["mulai", 0.2, "detik pop"]],
    html: `<div class="x-f" style="background:radial-gradient(circle at 50% 50%, #1f5560, #0b2630 55%, #061419)"></div><div class="x-a x-glow"></div><div class="x-a x-rays"></div><div class="x-a x-d x-d1 x-tx"></div><div class="x-a x-d x-d2 x-tx"></div><div class="x-a x-d x-d3 x-tx"></div><div class="x-a x-s8"></div><div class="x-gr"></div>`,
    css: `$ .x-glow { border-radius: 50%; background: radial-gradient(closest-side, rgba(255,226,150,.55), rgba(255,226,150,.12) 60%, transparent); mix-blend-mode: screen; }
$ .x-rays { border-radius: 50%; mix-blend-mode: screen; -webkit-mask-image: radial-gradient(closest-side, #000 35%, transparent 100%); mask-image: radial-gradient(closest-side, #000 35%, transparent 100%); }
$ .x-d { border-radius: 50%; box-shadow: 0 4px 8px rgba(0,0,0,.35); }
$ .x-d1 { background-color: #E3B04B; } $ .x-d2 { background-color: #FBF6EA; } $ .x-d3 { background-color: #1C2B45; }
$ .x-s8 { background: linear-gradient(135deg, #fff1bf, #F3C766 60%, #c98f2e); }`,
    build: function build(root, P, H) {
      const q = (s) => root.querySelector(s), W = root.offsetWidth, h = root.offsetHeight, cx = W / 2, cy = h / 2, R = P.radius;
      const put = (el, r) => { el.style.left = cx - r + "px"; el.style.top = cy - r + "px"; el.style.width = el.style.height = 2 * r + "px"; };
      put(q(".x-glow"), R * P.pendar); put(q(".x-rays"), R * 2.3); put(q(".x-d1"), R); put(q(".x-d2"), R * 0.78); put(q(".x-d3"), R * 0.58); put(q(".x-s8"), R * 0.44);
      const step = 360 / P.sinar;
      q(".x-rays").style.background = "repeating-conic-gradient(from 0deg, rgba(255,232,170,.55) 0deg " + step / 3 + "deg, rgba(255,232,170,0) " + step / 3 + "deg " + step + "deg)";
      const pts = []; for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, rr = i % 2 ? 0.42 : 1; pts.push((50 + 50 * rr * Math.sin(a)).toFixed(1) + "% " + (50 - 50 * rr * Math.cos(a)).toFixed(1) + "%"); }
      q(".x-s8").style.clipPath = "polygon(" + pts.join(",") + ")";
      const ds = [q(".x-d1"), q(".x-d2"), q(".x-d3"), q(".x-s8")], D = 4;
      return H.loop(D, (t) => {
        gsap.set(q(".x-rays"), { rotation: (step * t) / D, opacity: H.cl((t - P.mulai) / 0.4) });
        gsap.set(q(".x-glow"), { opacity: H.cl((t - P.mulai) / 0.5) * (0.85 + 0.15 * Math.sin((6.283 * t * 2) / D)) });
        ds.forEach((el, i) => { const t0 = P.mulai + i * 0.1; gsap.set(el, t < t0 ? { opacity: 0 } : { opacity: H.cl((t - t0) / 0.2), scale: 1 - 0.08 * H.ent(t, t0) }); });
      });
    },
  });

  /* ===== PETA & DATA ===== */
  I({
    id: "mgp-rute-tumbuh", nama: "Rute Tumbuh", kat: "peta", jenis: "block", dur: 3.5, rasio: "16:9 · 9:16", twos: true, poster: 3.0,
    desk: "Garis rute tumbuh dari ujungnya dengan dash pathLength 100, berhenti di setiap kota sambil labelnya muncul. Penjelajah di kepala garis menghadap tangen yang dihaluskan, belok maks 120°/s.",
    kapan: "Perjalanan, ekspedisi, rantai pasok. Ganti pulau contoh dengan garis pantai GeoJSON yang diproyeksikan.",
    params: [["tumbuh", 1.4, "detik per ruas"], ["henti", 0.7, "detik berhenti di kota"], ["belok", 120, "derajat/detik maks"], ["tebal", 3.5, "px tebal rute"], ["kota", ["Teluk Awal", "Pulau Tengah", "Tanjung Timur"], "nama perhentian (contoh)"]],
    html: `<div class="x-f x-tx" style="background-color:#9DBFD3"></div><div class="x-f" style="background-image:linear-gradient(rgba(40,70,110,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(40,70,110,.14) 1px, transparent 1px);background-size:64px 64px"></div><svg class="x-f x-map" viewBox="0 0 640 360"><path class="x-ld" d="M30 250 C 40 205, 110 190, 150 215 S 205 270, 172 302 S 70 332, 40 300 Z"/><path class="x-ld" d="M250 112 C 268 72, 350 60, 382 96 S 402 160, 352 170 S 240 160, 250 112 Z"/><path class="x-ld" d="M470 172 C 500 120, 590 110, 616 160 S 600 262, 540 272 S 452 232, 470 172 Z"/><path class="x-rt" pathLength="100" d="M160 246 C 210 240, 250 214, 300 182 S 380 156, 420 180 S 462 206, 482 214"/></svg><div class="x-a x-cty"></div><i class="x-a x-boat"></i><div class="x-gr"></div>`,
    css: `$ .x-map { filter: drop-shadow(0 4px 4px rgba(45,28,12,.25)); }
$ .x-ld { fill: #EADFC4; stroke: #c9b48a; stroke-width: 2; }
$ .x-rt { fill: none; stroke: #B23A32; stroke-linecap: round; stroke-dasharray: 100 120; stroke-dashoffset: 100; }
$ .x-cty { inset: 0; }
$ .x-cty div { position: absolute; display: flex; align-items: center; gap: 6px; transform: translate(-6px, -6px); }
$ .x-cty i { width: 12px; height: 12px; border-radius: 50%; background: #FBF6EA; border: 3px solid #141414; flex: none; }
$ .x-cty span { padding: 3px 7px; background: #FBF6EA; font-size: 12.5px; font-weight: 700; color: #141414; box-shadow: 0 2px 4px rgba(20,12,4,.3); white-space: nowrap; }
$ .x-boat { left: 0; top: 0; width: 22px; height: 14px; margin: -7px 0 0 -11px; background: #141414; clip-path: polygon(0 0, 100% 50%, 0 100%, 22% 50%); }`,
    build: function build(root, P, H) {
      const rt = root.querySelector(".x-rt"), boat = root.querySelector(".x-boat"), cty = root.querySelector(".x-cty"), n = P.kota.length;
      rt.style.strokeWidth = P.tebal;
      const K = [[0, 0], [0.3, 0]], reach = [0.3];
      for (let i = 1; i < n; i++) { const a = K[K.length - 1][0]; K.push([a + P.henti, (i - 1) / (n - 1)], [a + P.henti + P.tumbuh, i / (n - 1)]); reach.push(a + P.henti + P.tumbuh); }
      K.splice(2, 1); K.push([K[K.length - 1][0] + 1.4, 1]);
      const D = K[K.length - 1][0], cs = P.kota.map((nm) => { const d = document.createElement("div"); d.innerHTML = "<i></i><span></span>"; d.lastChild.textContent = nm; cty.appendChild(d); return d; });
      let L = 0, tab = null;
      const prep = () => {
        L = rt.getTotalLength(); if (!L) return false;
        const pt = (s) => rt.getPointAtLength(H.cl(s) * L);
        cs.forEach((d, i) => { const p = pt(i / (n - 1)); d.style.left = p.x + "px"; d.style.top = p.y + "px"; });
        tab = []; let ang = null; const N = Math.ceil(D * 12) + 1;
        for (let k = 0; k < N; k++) {
          const s = H.key(K, k / 12), a = pt(s - 0.01), b = pt(s + 0.01), raw = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          if (ang === null) ang = raw; else { let d = ((raw - ang + 540) % 360) - 180; d = Math.max(-P.belok / 12, Math.min(P.belok / 12, d)); ang += d; }
          const p = pt(s); tab.push([p.x, p.y, ang]);
        }
        return true;
      };
      return H.loop(D, (t) => {
        if (!tab && !prep()) return;
        const s = H.key(K, t), T = tab[Math.min(tab.length - 1, Math.floor(t * 12))];
        rt.style.strokeDashoffset = 100 * (1 - s);
        gsap.set(boat, { x: T[0], y: T[1], rotation: T[2], opacity: H.cl((t - 0.15) / 0.2) });
        cs.forEach((d, i) => gsap.set(d, { opacity: H.cl((t - reach[i]) / (4 / 24)) }));
      });
    },
  });

  I({
    id: "mgp-pin-kota", nama: "Pin Kota", kat: "peta", jenis: "component", dur: 0.6, rasio: "16:9 · 9:16", twos: true, poster: 2.4,
    desk: "Tiga pin kertas jatuh bergiliran ke daratan dengan bayangan kontak yang mengecil-membesar, lalu label kota tergeser keluar. Urutan mengikuti narasi, bukan sekaligus.",
    kapan: "Menandai beberapa kota, cabang, atau titik kejadian. Label muncul di kata VO dan ditahan.",
    params: [["kota", ["Watu Agung", "Kali Jernih", "Muara Teduh"], "nama (contoh)"], ["mulai", 0.4, "detik pin pertama"], ["jeda", 0.55, "detik antarpin"], ["tinggi", 120, "px tinggi jatuh"]],
    html: `<div class="x-f x-tx" style="background-color:#5f8fb8"></div><div class="x-f" style="background-image:radial-gradient(rgba(255,255,255,.18) 1.2px, transparent 1.7px);background-size:14px 14px"></div><svg class="x-f x-map" viewBox="0 0 640 360"><path d="M60 120 C 120 60, 260 50, 340 80 S 520 60, 590 130 S 600 280, 500 300 S 300 330, 180 300 S 20 220, 60 120 Z"/></svg><div class="x-f x-pins"></div><div class="x-gr"></div>`,
    css: `$ .x-map { filter: drop-shadow(0 5px 5px rgba(45,28,12,.28)); }
$ .x-map path { fill: #EADFC4; stroke: #c9b48a; stroke-width: 2; }
$ .x-pn { position: absolute; width: 0; height: 0; }
$ .x-pn svg { position: absolute; left: -15px; top: -40px; width: 30px; height: 40px; filter: drop-shadow(0 3px 3px rgba(45,28,12,.35)); }
$ .x-pn .x-cs { left: -9px; top: -4px; width: 18px; height: 8px; }
$ .x-pn span { position: absolute; left: 16px; top: -38px; padding: 4px 8px; background: #FBF6EA; font-size: 14px; font-weight: 700; color: #141414; white-space: nowrap; box-shadow: 0 3px 6px rgba(20,12,4,.28); }`,
    build: function build(root, P, H) {
      const box = root.querySelector(".x-pins"), xy = [[170, 196], [338, 140], [462, 246]], C = ["#B23A32", "#1C2B45", "#E3B04B"];
      const ps = P.kota.map((nm, i) => {
        const d = document.createElement("div"), p = xy[i % xy.length]; d.className = "x-pn"; d.style.left = p[0] + "px"; d.style.top = p[1] + "px";
        d.innerHTML = '<i class="x-cs"></i><svg viewBox="0 0 40 52"><path d="M20 51C20 51 3 31 3 19a17 17 0 0 1 34 0c0 12-17 32-17 32z" fill="' + C[i % 3] + '"/><circle cx="20" cy="19" r="7" fill="#FBF6EA"/></svg><span></span>';
        d.querySelector("span").textContent = nm; box.appendChild(d);
        return { sv: d.querySelector("svg"), sh: d.querySelector(".x-cs"), lb: d.querySelector("span") };
      });
      ps.forEach((p) => gsap.set(p.sv, { transformOrigin: "50% 100%" }));
      return H.loop(3.6, (t) => {
        ps.forEach((p, i) => {
          const t0 = P.mulai + i * P.jeda;
          if (t < t0) return gsap.set([p.sv, p.sh, p.lb], { opacity: 0 });
          const e = H.ent(t, t0, 0.11), sq = t > t0 + 0.18 ? H.ent(t, t0 + 0.18, 0.09) : 0, u = H.sm((t - t0 - 0.3) / 0.22);
          gsap.set(p.sv, { opacity: 1, y: -P.tinggi * e, scaleY: 1 - 0.14 * sq, scaleX: 1 + 0.1 * sq });
          gsap.set(p.sh, { opacity: 1 - e, scale: 0.4 + 0.6 * (1 - e) });
          gsap.set(p.lb, { opacity: u, x: -12 * (1 - u) });
        });
      });
    },
  });

  I({
    id: "mgp-bar-kertas", nama: "Bar Kertas", kat: "peta", jenis: "component", dur: 1.4, rasio: "16:9 · 1:1", twos: true, poster: 2.2,
    desk: "Diagram batang dari potongan kertas berwarna dengan pucuk sobek, tumbuh bergiliran memakai peluruhan 0,17 s sementara angkanya ikut menghitung. Data terasa dekat, bukan dingin.",
    kapan: "Perbandingan 3-7 nilai dalam explainer. Data di contoh hanya ilustrasi; isi dari sumbermu sendiri.",
    params: [["data", [42, 68, 55, 90, 76], "nilai (contoh)"], ["label", ["Mar", "Apr", "Mei", "Jun", "Jul"], "label sumbu"], ["judul", "Panen per bulan (ton, contoh)", "judul grafik"], ["mulai", 0.4, "detik bar pertama"], ["jeda", 0.2, "detik antarbar"]],
    html: `<div class="x-f x-pp" style="background-color:#DCC7A2"></div><div class="x-f" style="background-image:repeating-linear-gradient(135deg, rgba(90,60,30,.08) 0 2px, transparent 2px 9px)"></div><div class="x-a x-ttl"></div><i class="x-a x-ax"></i><div class="x-f x-bs"></div><div class="x-gr"></div>`,
    css: `$ .x-ttl { left: 90px; top: 30px; font-size: 20px; font-weight: 700; color: #141414; }
$ .x-ax { left: 80px; top: 300px; width: 490px; height: 2px; background: #141414; }
$ .x-bb { position: absolute; bottom: 60px; width: 62px; }
$ .x-bf { position: absolute; left: 0; bottom: 0; width: 62px; height: 0; clip-path: polygon(0 5px, 10px 0, 21px 6px, 32px 1px, 43px 5px, 53px 0, 62px 4px, 62px 100%, 0 100%); }
$ .x-bv { position: absolute; left: 0; width: 62px; text-align: center; font-size: 17px; font-weight: 800; color: #141414; }
$ .x-bl { position: absolute; left: 0; top: 8px; width: 62px; text-align: center; font-size: 13px; font-weight: 600; letter-spacing: .08em; color: #7a5a2a; }`,
    build: function build(root, P, H) {
      const bs = root.querySelector(".x-bs"), C = ["#B23A32", "#E3B04B", "#78ACDC", "#1C2B45", "#5B8442"], max = Math.max(...P.data), Hm = 200;
      root.querySelector(".x-ttl").textContent = P.judul;
      const n = P.data.length, gap = (490 - n * 62) / (n + 1);
      const bars = P.data.map((v, i) => {
        const b = document.createElement("div"); b.className = "x-bb"; b.style.left = 80 + gap + i * (62 + gap) + "px";
        b.innerHTML = '<div class="x-bf x-tx"></div><div class="x-bv"></div>';
        b.firstChild.style.backgroundColor = C[i % C.length]; bs.appendChild(b);
        const l = document.createElement("div"); l.className = "x-bl"; l.textContent = P.label[i] || ""; l.style.left = 80 + gap + i * (62 + gap) + "px"; l.style.top = "308px"; bs.appendChild(l);
        return { f: b.firstChild, v: b.lastChild, h: (v / max) * Hm, val: v };
      });
      return H.loop(3.4, (t) => {
        bars.forEach((b, i) => {
          const t0 = P.mulai + i * P.jeda, p = t < t0 ? 0 : 1 - H.ent(t, t0);
          b.f.style.height = (b.h * p).toFixed(1) + "px"; b.v.style.bottom = b.h * p + 8 + "px";
          b.v.textContent = Math.round(b.val * p); b.v.style.opacity = t < t0 ? 0 : 1;
        });
      });
    },
  });

  I({
    id: "mgp-angka-hitung", nama: "Angka Berhitung", kat: "peta", jenis: "component", dur: 1.6, rasio: "16:9 · 9:16 · 1:1", twos: true, poster: 2.6,
    desk: "Angka besar menghitung naik dengan ease keluar kubik, berformat ribuan Indonesia, di atas tag kertas yang muncul dengan pop. Garis emas menutup ketika angka mendarat.",
    kapan: "Satu statistik yang harus diingat. Angka mendarat lalu diam total; tahan minimal 1 s.",
    params: [["nilai", 1250, "angka akhir"], ["satuan", "kilometer ditempuh", "keterangan"], ["mulai", 0.45, "detik mulai hitung"], ["durasi", 1.6, "detik hitung"]],
    html: `<div class="x-f x-tx" style="background-color:#23392f"></div><div class="x-f" style="background-image:radial-gradient(ellipse at 28% 30%, rgba(255,255,255,.09), transparent 50%), radial-gradient(ellipse at 76% 72%, rgba(255,255,255,.07), transparent 45%), linear-gradient(8deg, transparent 80%, rgba(255,255,255,.05) 81%, transparent 83%);box-shadow:inset 0 0 0 12px #6b4a2e"></div><div class="x-a x-tag x-pp"><div class="x-num">0</div><div class="x-unit">kilometer ditempuh</div><i class="x-u"></i></div><div class="x-gr"></div>`,
    css: `$ .x-tag { left: 150px; top: 82px; width: 340px; height: 196px; display: grid; place-content: center; justify-items: center; text-align: center; box-shadow: 0 6px 12px rgba(0,0,0,.35); }
$ .x-num { font-size: 84px; font-weight: 800; line-height: 1; letter-spacing: -.02em; color: #141414; font-variant-numeric: tabular-nums; }
$ .x-unit { margin-top: 8px; font-family: "Fraunces", Georgia, serif; font-style: italic; font-size: 20px; color: #7a5a2a; }
$ .x-u { display: block; width: 90px; height: 3px; margin-top: 14px; background: #E3B04B; transform-origin: 50% 50%; }`,
    build: function build(root, P, H) {
      const q = (s) => root.querySelector(s), tag = q(".x-tag"), num = q(".x-num"), u = q(".x-u");
      q(".x-unit").textContent = P.satuan;
      return H.loop(3.6, (t) => {
        gsap.set(tag, t < 0.2 ? { opacity: 0 } : { opacity: H.cl((t - 0.2) / 0.2), scale: 1 - 0.08 * H.ent(t, 0.2), rotation: -1 });
        const p = H.cl((t - P.mulai) / P.durasi), v = Math.round(P.nilai * (1 - Math.pow(1 - p, 3)));
        num.textContent = v.toLocaleString("id-ID");
        gsap.set(u, { scaleX: H.sm((t - P.mulai - P.durasi + 0.1) / 0.3) });
      });
    },
  });

  I({
    id: "mgp-garis-waktu", nama: "Garis Waktu", kat: "peta", jenis: "component", dur: 1.8, rasio: "16:9", twos: true, poster: 2.6,
    desk: "Garis tinta tertarik dari kiri dan setiap titik tahun meletup tepat saat garis melewatinya, disusul label serif. Sejarah singkat yang tetap terasa bergerak.",
    kapan: "Kronologi 3-6 titik. Titik muncul saat garis tiba, label menyusul 4 frame kemudian.",
    params: [["titik", [["1990", "Benih"], ["2000", "Tunas"], ["2010", "Pohon"], ["2020", "Hutan"]], "tahun & label (contoh)"], ["mulai", 0.3, "detik garis mulai"], ["durasi", 1.8, "detik garis penuh"]],
    html: `<div class="x-f x-pp" style="background-color:#E3EBEE"></div><div class="x-f" style="background-image:linear-gradient(90deg, rgba(40,70,110,.1) 1px, transparent 1px), linear-gradient(rgba(40,70,110,.06) 1px, transparent 1px);background-size:80px 100%, 100% 30px"></div><i class="x-a x-gl"></i><div class="x-f x-pts"></div><div class="x-gr"></div>`,
    css: `$ .x-gl { left: 70px; top: 190px; width: 500px; height: 3px; background: #141414; transform-origin: 0 50%; }
$ .x-pt { position: absolute; top: 190px; width: 0; }
$ .x-pt i { position: absolute; left: -9px; top: -8px; width: 18px; height: 18px; border-radius: 50%; background: #B23A32; border: 3px solid #FBF6EA; box-shadow: 0 2px 4px rgba(20,12,4,.35); }
$ .x-pt b { position: absolute; left: -40px; width: 80px; top: -48px; text-align: center; font-size: 22px; font-weight: 800; color: #141414; }
$ .x-pt span { position: absolute; left: -50px; width: 100px; top: 22px; text-align: center; font-family: "Fraunces", Georgia, serif; font-style: italic; font-size: 20px; color: #7a5a2a; }`,
    build: function build(root, P, H) {
      const gl = root.querySelector(".x-gl"), box = root.querySelector(".x-pts"), n = P.titik.length;
      const pts = P.titik.map((d, i) => {
        const f = n > 1 ? i / (n - 1) : 0, el = document.createElement("div"); el.className = "x-pt"; el.style.left = 70 + f * 500 + "px";
        el.innerHTML = "<i></i><b></b><span></span>"; el.querySelector("b").textContent = d[0]; el.querySelector("span").textContent = d[1]; box.appendChild(el);
        let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (H.sm(m) < f) lo = m; else hi = m; }
        return { dot: el.querySelector("i"), tx: [el.querySelector("b"), el.querySelector("span")], t0: P.mulai + hi * P.durasi };
      });
      return H.loop(P.mulai + P.durasi + 1.6, (t) => {
        gsap.set(gl, { scaleX: H.sm((t - P.mulai) / P.durasi) });
        pts.forEach((p) => {
          gsap.set(p.dot, t < p.t0 ? { opacity: 0 } : { opacity: 1, scale: 1 + 0.5 * H.ent(t, p.t0, 0.1) - 0.5 * (t < p.t0 + 0.08 ? 1 - (t - p.t0) / 0.08 : 0) });
          const u = H.sm((t - p.t0 - 4 / 24) / (5 / 24));
          gsap.set(p.tx, { opacity: u, y: 6 * (1 - u) });
        });
      });
    },
  });

  /* ===== TOKOH & GERAK ===== */
  I({
    id: "mgp-masuk-exp", nama: "Rakit Scene Exp 0,17 s", kat: "tokoh", jenis: "block", dur: 5.6, rasio: "16:9 · 9:16", twos: true, poster: 4.2,
    desk: "Scene dirakit potongan demi potongan dengan p = target + off · e^(−t/0,17 s): awan dari samping, bukit dari bawah, rumah, hero pop, depan, lalu label. Settle 14-16 frame, persis resep skill.",
    kapan: "Pembuka setiap set collage. Stagger 0,1-0,27 s dari jauh ke dekat; frame 0 video tetap harus berisi hook.",
    params: [["tau", 0.17, "detik konstanta peluruhan"], ["fade", 0.2, "detik alpha masuk"], ["pop", 0.08, "skala pop hero"], ["boil", 0.7, "px boil per gambar"]],
    html: `<div class="x-f" style="background:${SKY.fajar}"></div>
<div class="x-a x-sun x-p" data-f="t" data-o="150" data-t="0.30" style="left:452px;top:44px;width:78px;height:78px"></div>
<div class="x-a x-cloud x-tx x-ds x-p" data-f="l" data-o="300" data-t="0.15" style="left:64px;top:70px;width:130px;height:30px"></div>
<div class="x-a x-cloud x-tx x-ds x-p" data-f="r" data-o="340" data-t="0.40" style="left:330px;top:112px;width:92px;height:22px"></div>
<div class="x-a x-hill x-tx x-p" data-f="b" data-o="170" data-t="0.50" style="left:-120px;top:196px;width:540px;height:260px;background-color:#a9ae6a"></div>
<div class="x-a x-hill x-tx x-ds x-p" data-f="b" data-o="280" data-t="0.78" style="left:240px;top:226px;width:580px;height:240px;background-color:#86904c"></div>
<div class="x-a x-p" data-f="b" data-o="190" data-t="1.05" style="left:106px;top:178px;width:96px;height:96px"><div class="x-a x-rf x-tx" style="left:0;top:0;width:96px;height:40px;background-color:#B23A32"></div><div class="x-a x-tx x-ds" style="left:10px;top:38px;width:76px;height:58px;background-color:#EBCB9C"><i class="x-win" style="left:28px;top:18px"></i></div></div>
<div class="x-a x-p" data-f="b" data-o="150" data-t="1.40" style="left:520px;top:166px;width:70px;height:110px"><div class="x-a" style="left:30px;top:60px;width:10px;height:50px;background:#6b4426"></div><div class="x-a x-tx x-ds" style="left:0;top:0;width:70px;height:72px;border-radius:50%;background-color:#3F6B36"></div></div>
<div class="x-a x-p" data-f="pop" data-o="0" data-t="1.80" style="left:300px;top:222px;width:40px;height:98px">${FIG("#1C2B45")}<i class="x-cs" style="left:12px;top:86px;width:16px;height:12px"></i></div>
<div class="x-a x-tx x-ds x-p" data-f="b" data-o="260" data-t="2.15" style="left:-10px;top:318px;width:660px;height:52px;background-color:#66743a;border-radius:40% 60% 0 0/18px 22px 0 0"></div>
<div class="x-a x-tx x-ds x-p" data-f="b" data-o="280" data-t="2.45" style="left:400px;top:300px;width:130px;height:46px;border-radius:50% 50% 0 0;background-color:#4f5a2c"></div>
<div class="x-a x-p x-lb" data-f="l" data-o="420" data-t="3.00" style="left:36px;top:34px"><i class="x-lbp"></i><span class="x-lbf x-pp">Desa Tepi Bukit</span></div>
<div class="x-gr"></div>`,
    css: `$ .x-lb { width: 200px; height: 44px; filter: drop-shadow(0 4px 4px rgba(45,28,12,.3)); }
$ .x-lbp { position: absolute; left: -4px; top: 5px; width: 200px; height: 44px; background: #B23A32; }
$ .x-lbf { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 16px; font-size: 20px; font-weight: 800; color: #141414; white-space: nowrap; }`,
    build: function build(root, P, H) {
      const ps = [...root.querySelectorAll(".x-p")].map((el) => ({ el, f: el.dataset.f, o: +el.dataset.o, t0: +el.dataset.t }));
      ps.forEach((p) => p.f === "pop" && gsap.set(p.el, { transformOrigin: "50% 100%" }));
      return H.loop(5.6, (t) => {
        const fr = Math.floor(t * 12);
        ps.forEach((p, i) => {
          if (t < p.t0) return gsap.set(p.el, { opacity: 0 });
          const e = H.ent(t, p.t0, P.tau), o = p.o * e;
          gsap.set(p.el, {
            opacity: H.cl((t - p.t0) / P.fade),
            x: (p.f === "l" ? -o : p.f === "r" ? o : 0) + H.boil(fr, i, P.boil),
            y: (p.f === "b" ? o : p.f === "t" ? -o : 0) + H.boil(fr, i + 30, P.boil),
            scale: p.f === "pop" ? 1 - P.pop * e : 1,
          });
        });
      });
    },
  });

  I({
    id: "mgp-squash-pop", nama: "Squash & Pop", kat: "tokoh", jenis: "component", dur: 1.2, rasio: "16:9 · 1:1", twos: true, poster: 0.66,
    desk: "Lampion kertas jatuh, gepeng saat mendarat, memantul memanjang, lalu mengendap dengan sisa getar kecil. Bayangan kontak membesar-mengecil mengikuti ketinggian.",
    kapan: "Benda atau ikon yang masuk dengan karakter. Timing cepat 6-8 frame per fase; antisipasi dan overlap tetap terbaca on twos.",
    params: [["mulai", 0.3, "detik jatuh"], ["tinggi", 170, "px tinggi jatuh"], ["gepeng", 0.76, "skala Y saat mendarat"], ["pantul", 38, "px pantulan"]],
    html: `<div class="x-f x-tx" style="background-color:#4b2a4f"></div><div class="x-f" style="background-image:repeating-linear-gradient(90deg, rgba(255,220,240,.07) 0 18px, transparent 18px 36px)"></div><div class="x-a x-tx" style="left:0;top:272px;width:640px;height:88px;background-color:#2e1a31"></div><i class="x-cs x-sh" style="left:282px;top:266px;width:76px;height:14px"></i><div class="x-a x-lp"><i class="x-cap"></i><div class="x-bdl x-tx"></div><i class="x-tas"></i></div><div class="x-gr"></div>`,
    css: `$ .x-lp { left: 270px; top: 150px; width: 100px; height: 122px; }
$ .x-cap { position: absolute; left: 30px; top: 0; width: 40px; height: 12px; background: #E3B04B; border-radius: 3px; }
$ .x-bdl { position: absolute; left: 0; top: 10px; width: 100px; height: 96px; border-radius: 46% / 50%; background-color: #B23A32; box-shadow: inset 0 0 0 2px rgba(0,0,0,.1); }
$ .x-bdl::before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: repeating-linear-gradient(90deg, transparent 0 18px, rgba(0,0,0,.14) 18px 20px); }
$ .x-tas { position: absolute; left: 46px; top: 104px; width: 8px; height: 18px; background: #E3B04B; border-radius: 0 0 4px 4px; }`,
    build: function build(root, P, H) {
      const lp = root.querySelector(".x-lp"), sh = root.querySelector(".x-sh"), m = P.mulai, tl = gsap.timeline({ paused: true });
      gsap.set(lp, { transformOrigin: "50% 100%" });
      tl.fromTo(lp, { y: -P.tinggi - 140, scaleX: 0.9, scaleY: 1.14 }, { y: 0, scaleX: 0.92, scaleY: 1.12, duration: 0.32, ease: "power2.in" }, m)
        .to(lp, { scaleX: 1 / P.gepeng * 0.93, scaleY: P.gepeng, duration: 2 / 24, ease: "none" })
        .to(lp, { y: -P.pantul, scaleX: 0.94, scaleY: 1.09, duration: 0.24, ease: "power2.out" })
        .to(lp, { y: 0, scaleX: 1, scaleY: 1, duration: 0.2, ease: "power2.in" })
        .to(lp, { scaleX: 1.08, scaleY: 0.9, duration: 2 / 24, ease: "none" })
        .to(lp, { scaleX: 1, scaleY: 1, duration: 0.22, ease: "power2.out" })
        .fromTo(sh, { scale: 0.3, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 0.32, ease: "power2.in" }, m)
        .to(sh, { scale: 0.7, opacity: 0.6, duration: 0.24, ease: "power2.out" }, m + 0.32 + 2 / 24)
        .to(sh, { scale: 1, opacity: 1, duration: 0.2, ease: "power2.in" }, m + 0.56 + 2 / 24)
        .to({}, { duration: 1.1 });
      return tl;
    },
  });

  I({
    id: "mgp-lompat", nama: "Lompat Berantisipasi", kat: "tokoh", jenis: "component", dur: 1.2, rasio: "16:9", twos: true, poster: 0.95,
    desk: "Tokoh kertas jongkok 4 frame, melesat dalam lengkung parabola dengan lengan terangkat, lalu mendarat gepeng dan pulih. Bayangan kontak 0,4 kali lebar figur, menipis saat tokoh di udara.",
    kapan: "Reaksi gembira, berpindah tempat, transisi aksi. Untuk tokoh nyata gunakan sheet aksi per frame; ini rig pratinjau.",
    params: [["antisipasi", 4, "frame jongkok"], ["terbang", 0.62, "detik di udara"], ["tinggi", 92, "px puncak lompatan"], ["jarak", 240, "px jarak lompat"], ["bayangan", 0.4, "x lebar figur"]],
    html: `<div class="x-f" style="background:${SKY.gurun}"></div><div class="x-a x-hill x-tx" style="left:-80px;top:210px;width:820px;height:260px;background-color:#e2b872"></div><div class="x-a x-tx x-ds" style="left:-10px;top:296px;width:660px;height:70px;background-color:#c9954e;border-radius:30% 50% 0 0/14px 18px 0 0"></div><i class="x-cs x-jsh"></i><div class="x-a x-jp">${FIG("#B23A32")}</div><div class="x-gr"></div>`,
    css: `$ .x-jp { left: 0; top: 0; width: 40px; height: 92px; }
$ .x-jsh { left: 0; top: 0; height: 12px; }`,
    build: function build(root, P, H) {
      const jp = root.querySelector(".x-jp"), sh = root.querySelector(".x-jsh"), ar = jp.querySelectorAll(".x-ar"), S = 1.55, G = 304, X0 = 170;
      gsap.set(jp, { transformOrigin: "50% 100%" });
      const A = P.antisipasi / 24, T = P.terbang, hop = A + T + 0.42, D = 2 * (0.3 + hop + 0.45);
      const pose = (t) => {
        let k = t < D / 2 ? 0 : 1, lt = t - k * (D / 2) - 0.3, dir = k ? -1 : 1, x = k ? X0 + P.jarak : X0, y = 0, sx = 1, sy = 1, arm = 12;
        if (lt > 0 && lt <= A) { const u = H.sm(lt / A); sy = 1 - 0.14 * u; sx = 1 + 0.08 * u; arm = 12 - 40 * u; }
        else if (lt > A && lt <= A + T) { const v = (lt - A) / T; x += dir * P.jarak * v; y = -P.tinggi * 4 * v * (1 - v); sy = 1 + 0.12 * Math.abs(1 - 2 * v); sx = 1 - 0.06 * Math.abs(1 - 2 * v); arm = 160; }
        else if (lt > A + T) { x += dir * P.jarak; const w = lt - A - T, e = H.ent(w, 0, 0.09); sy = 1 - 0.2 * e; sx = 1 + 0.12 * e; arm = 12 + 60 * e; }
        return { x, y, sx: sx * dir, sy, arm };
      };
      return H.loop(D, (t) => {
        const p = pose(t), wf = 40 * S * P.bayangan, hgt = H.cl(-p.y / P.tinggi);
        gsap.set(jp, { x: p.x - 20, y: G - 92 + p.y, scaleX: S * p.sx, scaleY: S * p.sy });
        gsap.set(ar[0], { rotation: p.arm }); gsap.set(ar[1], { rotation: -p.arm });
        gsap.set(sh, { x: p.x - wf / 2, y: G - 6, width: wf, scale: 1 - 0.45 * hgt, opacity: 1 - 0.55 * hgt });
      });
    },
  });

  I({
    id: "mgp-benda-kedip", nama: "Benda Berwajah Kedip", kat: "tokoh", jenis: "component", dur: 0.33, rasio: "16:9 · 1:1", twos: true, poster: 1.0,
    desk: "Toples kertas berwajah yang bernapas pelan, berkedip 4 gambar, sesekali kedip ganda, lalu melirik ke samping. Personifikasi benda yang langsung bikin penonton tersenyum.",
    kapan: "Benda yang jadi tokoh: produk, alat, makanan. Kedip tiap 2-4 s; kit mata dan mulut ditempel per frame dari pusat wajah.",
    params: [["kedip", [0.9, 2.5, 2.75], "detik awal tiap kedip"], ["lirik", 4, "px pupil melirik"], ["napas", 0.012, "skala napas"], ["label", "GULA", "tulisan label"]],
    html: `<div class="x-f x-tx" style="background-color:#5d7f7a"></div><div class="x-f" style="background-image:linear-gradient(rgba(235,245,240,.24) 2px, transparent 2px), linear-gradient(90deg, rgba(235,245,240,.24) 2px, transparent 2px);background-size:40px 40px"></div><div class="x-a x-tx x-ds" style="left:0;top:262px;width:640px;height:98px;background-color:#8a5a34"></div><i class="x-cs" style="left:262px;top:256px;width:116px;height:14px"></i><div class="x-a x-jar"><div class="x-a x-lid x-tx"></div><div class="x-a x-bj x-tx"></div><div class="x-a x-eyes"><i class="x-eye"></i><i class="x-eye"></i></div><i class="x-a x-chk" style="left:26px"></i><i class="x-a x-chk" style="left:106px"></i><i class="x-a x-mo"></i><div class="x-a x-jl x-pp">GULA</div></div><div class="x-gr"></div>`,
    css: `$ .x-jar { left: 245px; top: 80px; width: 150px; height: 184px; }
$ .x-lid { left: 20px; top: 0; width: 110px; height: 30px; border-radius: 8px; background-color: #B23A32; box-shadow: 0 3px 4px rgba(0,0,0,.2); }
$ .x-bj { left: 0; top: 24px; width: 150px; height: 160px; border-radius: 34% 34% 26% 26% / 22% 22% 16% 16%; background-color: #F1D9A6; box-shadow: inset -10px 0 0 rgba(0,0,0,.06); }
$ .x-eyes { left: 40px; top: 80px; width: 70px; height: 26px; display: flex; justify-content: space-between; }
$ .x-eye { position: relative; width: 16px; height: 24px; border-radius: 50%; background: #141414; }
$ .x-eye::after { content: ""; position: absolute; left: 4px; top: 4px; width: 5px; height: 5px; border-radius: 50%; background: #fff; }
$ .x-chk { top: 112px; width: 18px; height: 10px; border-radius: 50%; background: rgba(214,98,90,.45); }
$ .x-mo { left: 62px; top: 112px; width: 26px; height: 13px; border-bottom: 3px solid #141414; border-radius: 0 0 50% 50%; }
$ .x-jl { left: 30px; top: 138px; width: 90px; height: 30px; display: grid; place-items: center; font-size: 13px; font-weight: 800; letter-spacing: .28em; color: #7a2a22; }`,
    build: function build(root, P, H) {
      const jar = root.querySelector(".x-jar"), eyes = root.querySelectorAll(".x-eye"), ec = root.querySelector(".x-eyes"), D = 4;
      root.querySelector(".x-jl").textContent = P.label;
      gsap.set(jar, { transformOrigin: "50% 100%" });
      const SEQ = [0.45, 0.08, 0.45, 1];
      return H.loop(D, (t) => {
        const f = Math.floor(t * 12); let sy = 1;
        P.kedip.forEach((b) => { const k = Math.floor((t - b) * 12); if (k >= 0 && k < SEQ.length) sy = Math.min(sy, SEQ[k]); });
        gsap.set(eyes, { scaleY: sy });
        gsap.set(ec, { x: P.lirik * H.key([[0, 0], [1.5, 0], [1.66, 1], [3.1, 1], [3.26, 0]], t) });
        gsap.set(jar, { scaleY: 1 + P.napas * Math.sin((6.283 * t) / D), x: H.boil(f, 1, 0.7), y: H.boil(f, 2, 0.7) });
      });
    },
  });

  I({
    id: "mgp-kerumunan-reaksi", nama: "Kerumunan Bereaksi", kat: "tokoh", jenis: "block", dur: 0.6, rasio: "16:9", twos: true, poster: 1.1,
    desk: "Sembilan tokoh berganti dari tenang ke reaksi mulai dari tengah ke luar, selang 0,07 s, masing-masing melompat 14 px · sin(πu) selama 0,25 s. Tidak pernah serempak, jadi terasa ramai sungguhan.",
    kapan: "Penonton bersorak, warga terkejut, kelas yang paham. Dua state per orang sudah cukup.",
    params: [["mulai", 0.6, "detik reaksi tengah"], ["selang", 0.07, "detik per jarak dari tengah"], ["lompat", 14, "px tinggi lompatan"], ["lama", 0.25, "detik lompatan"], ["balik", 2.4, "detik kembali tenang"]],
    html: `<div class="x-f x-tx" style="background-color:#161a35"></div><div class="x-f" style="background-image:linear-gradient(160deg, transparent 28%, rgba(255,240,200,.16) 40%, transparent 54%), linear-gradient(200deg, transparent 28%, rgba(255,240,200,.16) 40%, transparent 54%), radial-gradient(ellipse at 50% 100%, rgba(243,199,102,.18), transparent 60%)"></div><div class="x-a x-tx" style="left:0;top:276px;width:640px;height:84px;background-color:#2b2340"></div><div class="x-f x-crowd"></div><div class="x-gr"></div>`,
    css: `$ .x-pr { position: absolute; top: 190px; width: 40px; height: 98px; }
$ .x-pr .x-cs { left: 12px; top: 86px; width: 16px; height: 12px; }`,
    build: function build(root, P, H) {
      const box = root.querySelector(".x-crowd"), C = ["#B23A32", "#E3B04B", "#78ACDC", "#F1E6D0", "#5B8442"], n = 9, c = (n - 1) / 2, ppl = [];
      for (let i = 0; i < n; i++) {
        const d = document.createElement("div"); d.className = "x-pr"; d.style.left = 58 + i * 60 + "px";
        d.innerHTML = '<i class="x-cs"></i><div class="x-fig" style="--c:' + C[(i * 3) % C.length] + '">' + '<i class="x-lg x-l"></i><i class="x-lg x-r"></i><i class="x-bd"></i><i class="x-ar x-l"></i><i class="x-ar x-r"></i><i class="x-hd"></i><i class="x-hr"></i></div>';
        box.appendChild(d);
        ppl.push({ fig: d.querySelector(".x-fig"), sh: d.querySelector(".x-cs"), ar: d.querySelectorAll(".x-ar"), dt: Math.abs(i - c) * P.selang, s: 0.9 + ((i * 7) % 3) * 0.06 });
      }
      return H.loop(3.4, (t) => {
        ppl.forEach((p) => {
          const ts = P.mulai + p.dt, te = P.balik + p.dt, on = t >= ts && t < te, u = (t - ts) / P.lama;
          const y = u > 0 && u < 1 ? -P.lompat * Math.sin(Math.PI * u) : 0;
          gsap.set(p.fig, { y, scale: p.s, transformOrigin: "50% 100%" });
          gsap.set(p.ar[0], { rotation: on ? 150 : 8 }); gsap.set(p.ar[1], { rotation: on ? -150 : -8 });
          gsap.set(p.sh, { scale: 1 + y / 40, opacity: 1 + y / 30 });
        });
      });
    },
  });

  /* ===== KAMERA ===== */
  I({
    id: "mgp-dolly-parallax", nama: "Dolly Parallax k", kat: "kamera", jenis: "block", dur: 2.0, rasio: "16:9 · 9:16", twos: true, poster: 1.5,
    desk: "Tujuh lapis kertas bergeser sebesar camX · k: langit 0,15, bukit jauh 0,25, bukit dekat 0,40, rumah 0,55, hero 0,72, depan 0,90, pembingkai 1,2. Kedalaman muncul tanpa 3D.",
    kapan: "Establishing shot dan perkenalan dunia. Kamera bergerak di awal dan diam di paruh akhir shot.",
    params: [["geser", 200, "px total camX"], ["gerak", 2.0, "detik gerak kamera"], ["diam", 1.0, "detik tahan"]],
    html: `${LAY_GUGUR}<div class="x-gr"></div>`,
    css: LAYER_CSS,
    build: function build(root, P, H) {
      const ls = [...root.querySelectorAll(".x-ly")].map((el) => ({ el, k: +el.dataset.k }));
      const a = 0.3, b = a + P.gerak, c = b + P.diam, d = c + P.gerak, D = d + 0.3;
      return H.loop(D, (t) => {
        const cam = -P.geser * H.key([[0, 0], [a, 0], [b, 1], [c, 1], [d, 0]], t);
        ls.forEach((l) => gsap.set(l.el, { x: cam * l.k + P.geser * 0.45 * l.k }));
      });
    },
  });

  I({
    id: "mgp-push-in", nama: "Push-in Berlapis", kat: "kamera", jenis: "block", dur: 1.9, rasio: "16:9 · 9:16", twos: true, poster: 2.4,
    desk: "Kamera mendorong ke hero dengan zoom per lapis zl = z^(0,25 + 0,75k) di sekitar pivot hero, jadi lapis depan membesar lebih cepat dari langit. Dorongan pelan yang terasa sinematik.",
    kapan: "Menekankan tokoh atau momen; push 2-10% di awal shot, lalu diam.",
    params: [["zoom", 1.1, "z akhir (push 10%)"], ["gerak", 1.9, "detik dorongan"], ["pivotX", 340, "px pivot hero"], ["pivotY", 250, "px pivot hero"]],
    html: `${LAY_TROPIS}<div class="x-gr"></div>`,
    css: LAYER_CSS,
    build: function build(root, P, H) {
      const ls = [...root.querySelectorAll(".x-ly")].map((el) => ({ el, k: +el.dataset.k }));
      ls.forEach((l) => gsap.set(l.el, { transformOrigin: P.pivotX + 200 + "px " + P.pivotY + "px" }));
      const D = 0.3 + P.gerak + 1.5;
      return H.loop(D, (t) => {
        const z = 1 + (P.zoom - 1) * H.key([[0, 0], [0.3, 0], [0.3 + P.gerak, 1]], t);
        ls.forEach((l) => gsap.set(l.el, { scale: Math.pow(z, 0.25 + 0.75 * l.k) }));
      });
    },
  });

  I({
    id: "mgp-whip-pan", nama: "Whip Pan Kertas", kat: "kamera", jenis: "block", dur: 0.4, rasio: "16:9", twos: true, poster: 1.0,
    desk: "Kamera menyentak ke samping dalam 0,4 s; dunia kabur horizontal dan serpih kertas melesat berlawanan arah, lalu mendarat tajam di set berikutnya.",
    kapan: "Energi tinggi: jawaban cepat, kejutan, montase. Durasi pendek supaya kaburnya tidak sempat terlihat murah.",
    params: [["durasi", 0.4, "detik sentakan"], ["mulai", 0.7, "detik sentakan pertama"], ["kabur", 9, "px blur maksimum"], ["serpih", 12, "jumlah serpih kertas"]],
    html: `<svg width="0" height="0" style="position:absolute"><filter id="x-wb{U}" x="-5%" width="110%"><feGaussianBlur stdDeviation="0 0"/></filter></svg><div class="x-a x-wl"><div class="x-a x-s1">${SC(T.taman)}</div><div class="x-a x-s2">${SC(T.hutanMalam)}</div></div><div class="x-f x-sp"></div><div class="x-gr"></div>`,
    css: `$ .x-wl { left: 0; top: 0; width: 1280px; height: 360px; }
$ .x-s1, $ .x-s2 { top: 0; width: 640px; height: 360px; overflow: hidden; }
$ .x-s1 { left: 0; } $ .x-s2 { left: 640px; }
$ .x-sp i { position: absolute; height: 3px; border-radius: 2px; background: #FBF6EA; }`,
    build: function build(root, P, H) {
      const wl = root.querySelector(".x-wl"), fl = root.querySelector("filter"), gb = fl.firstElementChild, sp = root.querySelector(".x-sp"), W = 640, r = H.rnd(5), ss = [];
      for (let i = 0; i < P.serpih; i++) { const el = document.createElement("i"); el.style.top = 20 + r() * 320 + "px"; el.style.width = 80 + r() * 220 + "px"; el.style.background = i % 3 ? "#FBF6EA" : "#F1C75B"; sp.appendChild(el); ss.push({ el, x: r() * 900 - 200, v: 0.6 + r() * 0.8 }); }
      const m2 = P.mulai + P.durasi + 1.1, D = m2 + P.durasi + 1.1;
      return H.loop(D, (t) => {
        const u1 = H.cl((t - P.mulai) / P.durasi), u2 = H.cl((t - m2) / P.durasi), e = (u) => H.sm(H.sm(u));
        const x = -W * (e(u1) - e(u2)), s = Math.max(Math.sin(Math.PI * u1), Math.sin(Math.PI * u2)), dir = u2 > 0 ? 1 : -1;
        gsap.set(wl, { x });
        if (s > 0.05) { gb.setAttribute("stdDeviation", (P.kabur * s).toFixed(1) + " 0"); wl.style.filter = "url(#" + fl.id + ")"; } else wl.style.filter = "none";
        ss.forEach((p) => gsap.set(p.el, { opacity: s * 0.85, x: p.x + dir * p.v * 700 * (u2 > 0 ? u2 : u1), scaleX: 0.4 + s }));
      });
    },
  });

  /* ======================================================================
     MESIN: pemutar, grid, detail
     ====================================================================== */
  const BY = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
  const RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const fmt = (n, d) => (d == null ? String(n) : n.toFixed(d)).replace(".", ",");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const params = (it) => Object.fromEntries(it.params.map((p) => [p[0], JSON.parse(JSON.stringify(p[1]))]));
  const durTxt = (it) => (it.dur ? fmt(it.dur) + " s" : "loop");

  let styled = false;
  function injectStyles() {
    if (styled) return; styled = true;
    const st = document.createElement("style"); st.id = "reg-items-css";
    st.textContent = BASE.split("$").join(".reg-st") + "\n" + ITEMS.map((it) => it.css ? it.css.split("$").join(".reg-st." + it.id) : "").join("\n");
    document.head.appendChild(st);
  }

  /* --- detak tunggal untuk semua pemutar yang aktif --- */
  const live = new Set();
  let raf = 0, last = 0;
  function tick(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    live.forEach((p) => p.adv(dt));
    raf = live.size ? requestAnimationFrame(tick) : ((last = 0), 0);
  }
  const wake = () => { if (!raf && live.size) { last = 0; raf = requestAnimationFrame(tick); } };

  let uid = 0;
  const ro = window.ResizeObserver ? new ResizeObserver((es) => es.forEach((e) => e.target.__p && e.target.__p.fit())) : null;

  function Player(it, box) {
    this.it = it; this.box = box; this.W = it.v ? 360 : 640; this.H = it.v ? 640 : 360; this.speed = 1; this.lt = -1; this.ok = false;
    const st = document.createElement("div");
    st.className = "reg-st " + it.id + (it.v ? " x-v" : "");
    st.innerHTML = it.html.split("{U}").join("r" + ++uid);
    st.setAttribute("aria-hidden", "true");
    box.appendChild(st); this.st = st; box.__p = this;
    this.fit();
    try {
      if (!window.gsap) throw new Error("GSAP belum dimuat");
      this.tl = it.build(st, params(it), H); this.D = this.tl.duration() || 1; this.ok = true;
    } catch (err) {
      console.error("[Registry] " + it.id, err); this.D = 1;
      box.classList.add("reg-err");
    }
    this.t = Math.min(this.D - 0.01, it.poster != null ? it.poster : this.D * 0.6);
    this.render(true);
    if (ro) ro.observe(box);
  }
  Player.prototype.fit = function () {
    const bw = this.box.clientWidth, bh = this.box.clientHeight; if (!bw || !bh) return;
    const s = Math.min(bw / this.W, bh / this.H);
    this.st.style.transform = "translate(" + ((bw - this.W * s) / 2).toFixed(1) + "px," + ((bh - this.H * s) / 2).toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
  };
  Player.prototype.render = function (force) {
    if (!this.ok) return;
    const t = this.it.twos ? H.q(this.t) : this.t;
    if (force || t !== this.lt) { this.lt = t; this.tl.time(Math.min(t, this.D - 1e-4), false); }
    if (this.onT) this.onT(this.t);
  };
  Player.prototype.adv = function (dt) { this.t = (this.t + dt * this.speed) % this.D; this.render(); };
  Player.prototype.play = function () { if (!this.ok) return; this.playing = true; live.add(this); wake(); if (this.onS) this.onS(true); };
  Player.prototype.pause = function () { this.playing = false; live.delete(this); if (this.onS) this.onS(false); };
  Player.prototype.seek = function (t) { this.t = Math.max(0, Math.min(this.D - 1e-3, t)); this.render(); };
  Player.prototype.destroy = function () { this.pause(); if (ro) ro.unobserve(this.box); if (this.tl) this.tl.kill(); this.st.remove(); this.box.__p = null; };

  /* --- snippet mandiri --- */
  const HSRC = "const H = {\n" + Object.keys(H).map((k) => "  " + k + ": " + H[k].toString()).join(",\n") + "\n};";
  function snippet(it) {
    const cls = it.id, css = (BASE + "\n" + (it.css || "")).split("$").join("." + cls);
    return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${it.nama} · ${cls}</title>
<!-- Font pratinjau. Di komposisi mgp pakai font bundel (mgp new menyalinnya ke assets/fonts/) atau @font-face ke assets/fonts/. -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400;1,600&family=Geist:wght@400;600;700;800&display=swap">
<style>
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #070a14; }
${css}
</style>
</head>
<body>
<div class="${cls}${it.v ? " x-v" : ""}" data-composition-id="${cls}" data-width="${it.v ? 360 : 640}" data-height="${it.v ? 640 : 360}">
${it.html.split("{U}").join("1")}
</div>
<!-- Pratinjau lepas memakai GSAP dari CDN. Di komposisi mgp, ganti baris ini dengan assets/js/motion.js (mgp.motion, alias gsap, API sama). -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script>
/* ${it.nama} (${cls}) · Motion Graphics Pro · Registry Atelier
   ${it.kapan} */
const P = ${JSON.stringify(params(it), null, 2).replace(/\n/g, "\n")};

${HSRC}

${it.build.toString()}

const root = document.querySelector(".${cls}");
const fx = build(root, P, H);                  // timeline efek (paused)
const D = fx.duration(), TWOS = ${it.twos ? "true" : "false"};   // TWOS: 12 gambar/detik
const tl = gsap.timeline({ paused: true }), clk = { t: 0 };
tl.to(clk, { t: D, duration: D, ease: "none", onUpdate: () => fx.time(TWOS ? H.q(clk.t) : clk.t) });
window.__timelines = window.__timelines || {};
window.__timelines["${cls}"] = tl;             // mgp men-seek timeline ini

/* Pratinjau lepas di browser. Hapus dua baris ini di dalam komposisi mgp. */
const t0 = performance.now();
gsap.ticker.add(() => tl.time(((performance.now() - t0) / 1000) % D));
</script>
</body>
</html>
`;
  }

  /* --- salin --- */
  function copy(text, btn) {
    const done = (ok) => { if (!btn) return; const o = btn.dataset.lbl || btn.textContent; btn.dataset.lbl = o; btn.textContent = ok ? "Tersalin" : "Gagal"; btn.classList.toggle("reg-ok", ok); clearTimeout(btn.__t); btn.__t = setTimeout(() => { btn.textContent = o; btn.classList.remove("reg-ok"); }, 1600); };
    const fb = () => {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e) {} ta.remove(); done(ok);
    };
    if (navigator.clipboard && window.isSecureContext !== false) navigator.clipboard.writeText(text).then(() => done(true), fb); else fb();
  }

  /* --- ikon --- */
  const IC = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.5"/></svg>',
  };

  /* ======================= GRID ======================= */
  const S = { q: "", cat: "all", jenis: "all", cards: [], root: null, hover: null, vis: new Map() };

  function mount(el) {
    if (!el) return;
    injectStyles();
    S.root = el;
    el.classList.add("registry");
    const nB = ITEMS.filter((i) => i.jenis === "block").length, nC = ITEMS.length - nB;
    el.innerHTML = `
      <div class="reg-intro">
        <p class="reg-lead">Pustaka gerak milik Motion Graphics Pro: <em>${ITEMS.length} blok dan komponen</em> dalam gaya kolase kertas, dari transisi sobek sampai benda yang berkedip. Semuanya digambar dengan kode dan mengikuti angka di skill ini, jadi bisa kamu putar, geser per frame, lalu salin sebagai satu file HTML yang langsung jalan.</p>
        <ul class="reg-stats" aria-label="Ringkasan registry">
          <li class="reg-stat"><b>${ITEMS.length}</b><span>item siap pakai</span></li>
          <li class="reg-stat"><b>${nB}<i>/</i>${nC}</b><span>block / component</span></li>
          <li class="reg-stat"><b>12</b><span>gambar per detik</span></li>
          <li class="reg-stat"><b>0</b><span>kredit AI terpakai</span></li>
        </ul>
      </div>
      <div class="reg-bar">
        <label class="reg-search">${IC.search}<span class="reg-sr">Cari item registry</span><input type="search" placeholder="Cari: sobek, peta, kedip, caption…" autocomplete="off" spellcheck="false"></label>
        <div class="reg-seg" role="group" aria-label="Jenis">
          <button type="button" data-j="all" class="on" aria-pressed="true">Semua</button><button type="button" data-j="block" aria-pressed="false">Block</button><button type="button" data-j="component" aria-pressed="false">Component</button>
        </div>
      </div>
      <div class="reg-chips" role="group" aria-label="Kategori">
        <button type="button" class="reg-chip on" data-c="all" aria-pressed="true">Semua <i>${ITEMS.length}</i></button>
        ${CATS.map(([k, n]) => `<button type="button" class="reg-chip" data-c="${k}" aria-pressed="false">${n} <i>${ITEMS.filter((i) => i.kat === k).length}</i></button>`).join("")}
      </div>
      <p class="reg-count" aria-live="polite"></p>
      <div class="reg-grid">
        ${ITEMS.map((it, i) => `
        <article class="reg-card" tabindex="0" role="button" data-id="${it.id}" aria-label="${esc(it.nama)}, ${esc(CAT[it.kat])}. Buka detail">
          <div class="reg-th${it.v ? " reg-th-v" : ""}"><span class="reg-badge">${it.jenis}</span><span class="reg-live" aria-hidden="true"></span></div>
          <div class="reg-tx">
            <span class="reg-kat">${esc(CAT[it.kat])}</span>
            <h3 class="reg-nm">${esc(it.nama)}</h3>
            <p class="reg-ds">${esc(it.desk)}</p>
            <span class="reg-mt"><span>${durTxt(it)}</span><span>${esc(it.rasio)}</span><span>${it.twos ? "on twos" : "24 fps"}</span></span>
          </div>
        </article>`).join("")}
      </div>
      <div class="reg-empty" hidden><p>Belum ada item yang cocok dengan pencarianmu.</p><button type="button" class="btn">Atur ulang filter</button></div>
      <p class="reg-note">Pratinjau bergerak saat kartu disorot. Buka kartu untuk timeline, parameter, dan kode lengkap.</p>`;

    S.cards = [...el.querySelectorAll(".reg-card")];
    const inp = el.querySelector(".reg-search input");
    inp.addEventListener("input", () => { S.q = inp.value; apply(); });
    el.querySelector(".reg-seg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.jenis = b.dataset.j; setOn(b); apply(); });
    el.querySelector(".reg-chips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.cat = b.dataset.c; setOn(b); apply(); });
    el.querySelector(".reg-empty button").addEventListener("click", () => {
      S.q = ""; inp.value = ""; S.cat = "all"; S.jenis = "all";
      setOn(el.querySelector('.reg-chip[data-c="all"]')); setOn(el.querySelector('.reg-seg [data-j="all"]')); apply();
    });
    const grid = el.querySelector(".reg-grid");
    grid.addEventListener("click", (e) => { const c = e.target.closest(".reg-card"); if (c) open(c.dataset.id, c); });
    grid.addEventListener("keydown", (e) => { const c = e.target.closest(".reg-card"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(c.dataset.id, c); } });
    S.cards.forEach((c) => {
      const on = () => { S.hover = c; sched(); }, off = () => { if (S.hover === c) S.hover = null; sched(); };
      c.addEventListener("mouseenter", on); c.addEventListener("mouseleave", off);
      c.addEventListener("focus", on); c.addEventListener("blur", off);
    });

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          const c = e.target;
          if (e.isIntersecting) { ensure(c); S.vis.set(c, e.intersectionRatio); } else S.vis.delete(c);
        });
        sched();
      }, { rootMargin: "120px 0px", threshold: [0, 0.6, 1] });
      S.cards.forEach((c) => io.observe(c));
    } else S.cards.forEach(ensure);

    if (RM.addEventListener) RM.addEventListener("change", sched);
    apply();
    fromHash();
    window.addEventListener("hashchange", fromHash);
  }

  function setOn(b) { b.parentNode.querySelectorAll("button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); }); }
  function ensure(c) { if (!c.__p) c.__p = new Player(BY[c.dataset.id], c.querySelector(".reg-th")); }

  function apply() {
    const q = norm(S.q.trim()), words = q ? q.split(/\s+/) : [];
    let n = 0;
    S.cards.forEach((c) => {
      const it = BY[c.dataset.id];
      const hay = c.__hay || (c.__hay = norm([it.nama, it.desk, it.kapan, CAT[it.kat], it.kat, it.id, it.jenis].join(" ")));
      const ok = (S.cat === "all" || it.kat === S.cat) && (S.jenis === "all" || it.jenis === S.jenis) && words.every((w) => hay.includes(w));
      c.hidden = !ok; if (ok) n++;
    });
    const r = S.root;
    r.querySelector(".reg-count").textContent = n === ITEMS.length ? `Menampilkan semua ${n} item` : `${n} dari ${ITEMS.length} item`;
    r.querySelector(".reg-empty").hidden = n > 0;
    sched();
  }

  /* hanya kartu yang disorot + beberapa kartu terlihat yang bergerak */
  let schedT = 0;
  function sched() { cancelAnimationFrame(schedT); schedT = requestAnimationFrame(autoplay); }
  function autoplay() {
    if (!S.root) return;
    const modal = M && !M.el.hidden, mobile = window.innerWidth < 700, N = RM.matches ? 0 : mobile ? 1 : 3;
    const want = new Set();
    if (!modal) {
      if (S.hover && !S.hover.hidden && !RM.matches) want.add(S.hover);
      S.cards.filter((c) => !c.hidden && (S.vis.get(c) || 0) >= 0.6).slice(0, N).forEach((c) => want.add(c));
    }
    S.cards.forEach((c) => {
      const p = c.__p; if (!p) return;
      const on = want.has(c);
      if (on && !p.playing) p.play(); else if (!on && p.playing) p.pause();
      c.classList.toggle("reg-on", on);
    });
  }

  /* ======================= DETAIL ======================= */
  let M = null;
  function modal() {
    if (M) return M;
    injectStyles();
    const el = document.createElement("div");
    el.className = "registry reg-modal"; el.hidden = true;
    el.innerHTML = `
      <div class="reg-scrim" data-x></div>
      <div class="reg-dlg" role="dialog" aria-modal="true" aria-labelledby="reg-d-nm" tabindex="-1">
        <div class="reg-d-top">
          <span class="reg-d-pos"></span>
          <div class="reg-d-nav">
            <button type="button" class="reg-ib" data-prev aria-label="Item sebelumnya">${IC.prev}</button>
            <button type="button" class="reg-ib" data-next aria-label="Item berikutnya">${IC.next}</button>
            <button type="button" class="reg-ib" data-x aria-label="Tutup detail">${IC.x}</button>
          </div>
        </div>
        <div class="reg-d-body">
          <div class="reg-d-l">
            <div class="reg-view"></div>
            <div class="reg-ctl">
              <button type="button" class="reg-play" aria-label="Putar">${IC.play}</button>
              <input type="range" class="reg-seek" min="0" max="1000" step="1" value="0" aria-label="Posisi waktu">
              <span class="reg-time">0,00 s</span>
            </div>
            <div class="reg-ctl2">
              <span class="reg-fps"></span>
              <div class="reg-speed" role="group" aria-label="Kecepatan"><button type="button" data-s="0.25">0,25×</button><button type="button" data-s="0.5">0,5×</button><button type="button" data-s="1" class="on">1×</button></div>
            </div>
            <div class="reg-inst"><span class="reg-inst-k">Pasang</span><code></code><button type="button" class="reg-cp" data-c="inst">Salin</button></div>
            <p class="reg-keys"><kbd>Spasi</kbd> putar / jeda <kbd>&larr;</kbd><kbd>&rarr;</kbd> item lain <kbd>Esc</kbd> tutup. Geser timeline untuk memeriksa tiap gambar.</p>
          </div>
          <div class="reg-d-r">
            <p class="reg-d-kat"></p>
            <h3 id="reg-d-nm" class="reg-d-nm"></h3>
            <p class="reg-d-ds"></p>
            <dl class="reg-meta"></dl>
            <h4 class="reg-h">Kapan dipakai</h4>
            <p class="reg-d-kp"></p>
            <h4 class="reg-h">Parameter</h4>
            <div class="reg-tbl"><table><thead><tr><th>Nama</th><th>Default</th><th>Arti</th></tr></thead><tbody></tbody></table></div>
            <div class="reg-snip-h"><h4 class="reg-h">Snippet mandiri</h4><div><button type="button" class="reg-cp" data-c="snip">Salin</button><button type="button" class="reg-cp" data-dl>Unduh .html</button></div></div>
            <p class="reg-snip-n">HTML + CSS + GSAP dalam satu file. Buka langsung di browser, atau masukkan ke komposisi mgp (ganti GSAP dengan mgp.motion, API sama); timeline terdaftar di <code>window.__timelines</code>.</p>
            <pre class="reg-code"><code></code></pre>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s);
    M = { el, dlg: q(".reg-dlg"), view: q(".reg-view"), play: q(".reg-play"), seek: q(".reg-seek"), time: q(".reg-time"), p: null, id: null, ret: null, scrub: false, was: false, speed: 1 };
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-x]")) return close();
      if (e.target.closest("[data-prev]")) return step(-1);
      if (e.target.closest("[data-next]")) return step(1);
      const sp = e.target.closest("[data-s]"); if (sp) { M.speed = +sp.dataset.s; setOn(sp); if (M.p) M.p.speed = M.speed; return; }
      const dl = e.target.closest("[data-dl]"); if (dl) return download(BY[M.id]);
      const cp = e.target.closest(".reg-cp"); if (cp) return copy(cp.dataset.c === "inst" ? "mgp add " + M.id : snippet(BY[M.id]), cp);
    });
    M.play.addEventListener("click", () => { if (!M.p) return; M.p.playing ? M.p.pause() : M.p.play(); });
    M.view.addEventListener("click", () => { if (M.p) M.p.playing ? M.p.pause() : M.p.play(); });
    M.seek.addEventListener("input", () => { if (!M.p) return; if (!M.scrub) { M.scrub = true; M.was = M.p.playing; M.p.pause(); } M.p.seek((M.seek.value / 1000) * M.p.D); });
    M.seek.addEventListener("change", () => { if (M.scrub) { M.scrub = false; if (M.was) M.p.play(); } });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); return close(); }
      const tag = (e.target.tagName || "").toLowerCase();
      if (e.key === "ArrowLeft" && tag !== "input") { e.preventDefault(); return step(-1); }
      if (e.key === "ArrowRight" && tag !== "input") { e.preventDefault(); return step(1); }
      if (e.key === " " && tag !== "button" && tag !== "input" && M.p) { e.preventDefault(); M.p.playing ? M.p.pause() : M.p.play(); }
      if (e.key === "Tab") {
        const f = [...M.dlg.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])")].filter((x) => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    return M;
  }

  function visibleIds() { const v = S.cards.filter((c) => !c.hidden).map((c) => c.dataset.id); return v.length ? v : ITEMS.map((i) => i.id); }
  function step(d) { const ids = visibleIds(); let i = ids.indexOf(M.id); if (i < 0) i = 0; else i = (i + d + ids.length) % ids.length; show(ids[i]); }

  function show(id) {
    const it = BY[id]; if (!it) return;
    const m = modal(), q = (s) => m.el.querySelector(s);
    if (m.p) m.p.destroy();
    m.id = id;
    const ids = S.cards.length ? visibleIds() : ITEMS.map((i) => i.id), pos = ids.indexOf(id);
    q(".reg-d-pos").textContent = CAT[it.kat] + (pos >= 0 ? "  ·  " + (pos + 1) + " / " + ids.length : "");
    q(".reg-d-kat").textContent = CAT[it.kat] + " · " + it.jenis;
    q(".reg-d-nm").textContent = it.nama;
    q(".reg-d-ds").textContent = it.desk;
    q(".reg-d-kp").textContent = it.kapan;
    q(".reg-meta").innerHTML = [["ID", `<code>${it.id}</code>`], ["Durasi efek", durTxt(it)], ["Rasio", esc(it.rasio)], ["Gambar", it.twos ? "on twos, 12/detik" : "halus, 24 fps"], ["Jenis", it.jenis]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    q(".reg-tbl tbody").innerHTML = it.params.map(([n, v, d]) => `<tr><td><code>${esc(n)}</code></td><td><code>${esc(typeof v === "string" ? '"' + v + '"' : JSON.stringify(v).replace(/,/g, ", "))}</code></td><td>${esc(d)}</td></tr>`).join("");
    q(".reg-inst code").textContent = "mgp add " + id;
    q(".reg-code code").textContent = snippet(it);
    q(".reg-code").scrollTop = 0; q(".reg-d-r").scrollTop = 0; m.dlg.scrollTop = 0;
    q(".reg-fps").textContent = it.twos ? "On twos · 12 gambar/detik" : "Halus · 24 fps";
    m.view.classList.toggle("reg-view-v", !!it.v);
    const p = new Player(it, m.view); p.speed = m.speed; m.p = p;
    p.onT = (t) => { if (!m.scrub) m.seek.value = Math.round((t / p.D) * 1000); m.time.textContent = fmt(t, 2) + " / " + fmt(p.D, 2) + " s"; };
    p.onS = (on) => { m.play.innerHTML = on ? IC.pause : IC.play; m.play.setAttribute("aria-label", on ? "Jeda" : "Putar"); m.view.classList.toggle("reg-playing", on); };
    p.render(true); p.onS(false);
    if (!RM.matches) { p.seek(0); p.play(); }
    if (location.hash !== "#reg-" + id) try { history.replaceState(null, "", "#reg-" + id); } catch (e) {}
  }

  function open(id, from) {
    if (!BY[id]) return false;
    const m = modal(), wasHidden = m.el.hidden;
    if (wasHidden) {
      m.ret = from || document.activeElement;
      m.el.hidden = false; m.bodyOv = document.body.style.overflow; document.body.style.overflow = "hidden";
      requestAnimationFrame(() => m.el.classList.add("reg-in"));
    }
    show(id);
    if (wasHidden) m.dlg.focus({ preventScroll: true });
    sched();
    return true;
  }

  function close() {
    if (!M || M.el.hidden) return;
    if (M.p) { M.p.destroy(); M.p = null; }
    M.el.classList.remove("reg-in"); M.el.hidden = true;
    document.body.style.overflow = M.bodyOv || "";
    if (/^#reg-/.test(location.hash)) try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (M.ret && M.ret.focus && document.contains(M.ret)) M.ret.focus({ preventScroll: true });
    sched();
  }

  function fromHash() { const m = /^#reg-(.+)$/.exec(location.hash); if (m && BY[decodeURIComponent(m[1])] && (!M || M.el.hidden || M.id !== m[1])) open(decodeURIComponent(m[1])); }

  function download(it) {
    const b = new Blob([snippet(it)], { type: "text/html" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = it.id + ".html"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  window.Registry = { mount, open, items: ITEMS.map((i) => ({ id: i.id, nama: i.nama, kategori: CAT[i.kat], jenis: i.jenis })), snippet: (id) => (BY[id] ? snippet(BY[id]) : null) };
})();
