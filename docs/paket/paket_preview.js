/* paket_preview.js - mesin preview animasi paket motion (10 dtk berulang, Web Animations API).
   PaketPreview.build(host, paket, kategori) -> {seek(ms), play(), pause(), W, H}. Satu loop T = 10000 ms; semua animasi sinkron. */
(function(){
const T = 10000, FONTS = {}, SVGNS = "http://www.w3.org/2000/svg";
const WG = {"Inter":"wght@400;600;800","Poppins":"wght@400;600;700","Montserrat":"wght@400;700;800","Space Grotesk":"wght@400;700","Kalam":"wght@400;700","Nunito":"wght@400;700;800",
 "Lora":"ital,wght@0,400;0,700;1,400","Syne":"wght@400;700;800","Playfair Display":"ital,wght@0,400;0,700;1,400","Oswald":"wght@400;700","IBM Plex Mono":"wght@400;700",
 "DM Serif Display":"ital@0;1","Libre Baskerville":"ital,wght@0,400;0,700;1,400","Cinzel":"wght@400;700","Bodoni Moda":"ital,wght@0,400;0,700;1,400","Source Serif 4":"ital,wght@0,400;0,700;1,400",
 "Fraunces":"ital,wght@0,400;0,700;1,400","Fredoka":"wght@400;600;700","Comic Neue":"wght@400;700","Caveat":"wght@400;700","Sora":"wght@400;700","Outfit":"wght@400;700",
 "Cormorant Garamond":"ital,wght@0,400;0,700;1,400","Space Mono":"wght@400;700","Roboto Flex":"wght@100..1000","Josefin Sans":"wght@400;700","IBM Plex Sans":"wght@400;700",
 "Barlow":"wght@400;700","JetBrains Mono":"wght@400;700","Plus Jakarta Sans":"wght@400;700;800","Manrope":"wght@400;700;800","Baloo 2":"wght@400;700;800"};
function font(f){ if (FONTS[f]) return; FONTS[f] = 1; const l = document.createElement("link"); l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=" + f.replace(/ /g, "+") + (WG[f] ? ":" + WG[f] : "") + "&display=swap"; document.head.appendChild(l); }
const SIZE = {"16:9":[640,360], "9:16":[360,640], "4:5":[432,540], "1:1":[480,480]};
const BADGE = {ADS:"BARU", TLK:"LIVE", SHO:"PART 1", DEM:"BARU", EDU:"KUIS", DOK:"ARSIP", NAR:"BAB 1", KIN:"♪", DAT:"DATA", EXP:"TIPS"};
const cl = v => Math.max(0, Math.min(1, v));
const tf = (x=0, y=0, s=1, r=0, ry=0) => `translate(${x}%,${y}%) scale(${s}) rotate(${r}deg) rotateY(${ry}deg)`;
const EO = "cubic-bezier(.2,.8,.2,1)", BK = "cubic-bezier(.34,1.56,.64,1)", LN = "linear", IO = "cubic-bezier(.45,0,.55,1)";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

function build(host, P, KAT){
  const v = P.pv, [W, H] = SIZE[v.ar] || SIZE["16:9"], u = Math.min(W, H) / 100, p = P.pal, F1 = P.font[0], F2 = P.font[1];
  font(F1); font(F2); if (v.lay === "code" || v.cap === "mono") font("IBM Plex Mono");
  const A = [];
  const K = (el, keys) => { if (!el) return; const kf = []; if (keys[0][0] > 0) kf.push(Object.assign({}, keys[0][1], {offset:0}));
    keys.forEach(([t, pr, e]) => kf.push(Object.assign({}, pr, {offset: cl(t / T)}, e ? {easing: e} : {})));
    if (keys[keys.length - 1][0] < T) kf.push(Object.assign({}, keys[keys.length - 1][1], {offset:1}));
    for (let i = 1; i < kf.length; i++) if (kf[i].offset < kf[i - 1].offset) kf[i].offset = kf[i - 1].offset;
    try { A.push(el.animate(kf, {duration:T, iterations:Infinity, fill:"both"})); } catch(e){ /* nilai tak terinterpolasi: abaikan */ } };
  const E = (tag, css, html, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const S = (svg, parent, css) => { const e = E("div", "position:absolute;inset:0;" + (css || ""), svg, parent); return e; };
  const n = v.n, d = T / n, ex = KAT.contoh;
  const shots = []; let TR;
  host.innerHTML = "";
  const st = E("div", `position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${p[0]};perspective:${W * 2}px;color:${p[1]};font-family:"${F2}",system-ui,sans-serif`, null, host);
  // ---------------------------------------------------- transisi antar shot
  function trans(t){
    const N = {opacity:1, transform:tf(), filter:"blur(0px) hue-rotate(0deg)"};
    const rip = X => `polygon(0% 0%, ${X + 2}% 0%, ${X - 3}% 12%, ${X + 3}% 25%, ${X - 2}% 38%, ${X + 3}% 50%, ${X - 3}% 63%, ${X + 2}% 76%, ${X - 3}% 88%, ${X + 2}% 100%, 0% 100%)`;
    const D = {
      cut:{d:2, i:{opacity:0}, o:{opacity:0}, hold:false}, fade:{d:520, i:{opacity:0}, hold:true}, push:{d:520, i:{transform:tf(100)}, o:{transform:tf(-100)}},
      slide:{d:520, i:{transform:tf(0, 100)}, o:{transform:tf(0, -25), opacity:0}}, wipe:{d:560, clip:["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"], hold:true},
      zoom:{d:560, i:{opacity:0, transform:tf(0, 0, .55)}, o:{opacity:0, transform:tf(0, 0, 1.7)}}, whip:{d:380, i:{transform:tf(70), filter:"blur(14px) hue-rotate(0deg)"}, o:{transform:tf(-70), filter:"blur(14px) hue-rotate(0deg)", opacity:0}},
      iris:{d:650, clip:["circle(0% at 50% 50%)", "circle(115% at 50% 50%)"], hold:true}, ink:{d:900, clip:["circle(0% at 18% 82%)", "circle(170% at 18% 82%)"], hold:true},
      rip:{d:700, clip:[rip(-8), rip(112)], hold:true}, page:{d:700, i:{transform:tf(0, 0, 1, 0, -95)}, hold:true}, scale:{d:560, i:{opacity:0, transform:tf(0, 0, .25, -10)}, hold:true, ease:BK},
      glitch:{d:420, glitch:true}, flash:{d:2, i:{opacity:0}, o:{opacity:0}, flash:.95}, beat:{d:2, i:{opacity:0}, o:{opacity:0}, flash:.8, punch:true}, blinds:{d:2, i:{opacity:0}, o:{opacity:0}, blinds:true}};
    const x = D[t] || D.fade; x.N = Object.assign({}, N, x.clip ? {clipPath:x.clip[1]} : {}); x.H = Object.assign({}, x.N, {opacity:0}); return x;
  }
  function shotKeys(sh, i, s, e){
    const t = TR, N = t.N, H = t.H, k = [];
    const st = o => Object.assign({}, N, o);
    if (i === 0) k.push([0, H], [0, H, EO], [300, N]);
    else if (t.glitch){ k.push([s, st({opacity:0, transform:tf(6), filter:"blur(0px) hue-rotate(90deg)"})], [s + 100, st({opacity:1, transform:tf(-5), filter:"blur(0px) hue-rotate(180deg)"})],
      [s + 200, st({opacity:.4, transform:tf(4)})], [s + 300, st({transform:tf(-2)})], [s + t.d, N]); }
    else if (t.punch){ k.push([s, H], [s, st({transform:tf(0, 0, 1.12)}), EO], [s + 240, N]); }
    else { const from = t.clip ? st({clipPath:t.clip[0]}) : st(t.i); k.push([s, H], [s, from, t.ease || EO], [s + t.d, N]); }
    if (i === n - 1) k.push([T - 320, N, IO], [T, H]);
    else if (t.glitch) k.push([e, N], [e + 150, st({opacity:.5, transform:tf(-6)})], [e + 300, H]);
    else if (t.hold || !t.o) k.push([e + t.d, N], [e + t.d, H]);
    else k.push([e, N, EO], [e + t.d, st(t.o)], [e + t.d, H]);
    K(sh, k);
  }
  function overlays(){
    const tx = (v.bg === "paper" || v.bg === "kraft" || v.bg === "dark" || v.bg === "mono" || v.bg === "retro" || v.bg === "news" || v.bg === "footage" || v.bg === "cork" || v.bg === "chalk");
    if (tx){ const g = E("div", `position:absolute;inset:-20%;z-index:90;pointer-events:none;background-image:${NOISE};opacity:${v.bg === "dark" || v.bg === "footage" ? .22 : .14};mix-blend-mode:${v.bg === "dark" || v.bg === "footage" || v.bg === "chalk" ? "screen" : "multiply"}`, null, st);
      const ks = []; for (let t = 0; t <= T; t += 125) ks.push([t, {transform:`translate(${(t * 7) % 23 - 11}px,${(t * 13) % 19 - 9}px)`}, "steps(1)"]); K(g, ks); }
    if (v.bg === "dark" || v.bg === "footage" || v.bg === "mono" || v.cam === "kb") E("div", "position:absolute;inset:0;z-index:91;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.45))", null, st);
    if (TR.flash){ const f = E("div", "position:absolute;inset:0;z-index:95;pointer-events:none;background:#fff;opacity:0", null, st), ks = [[0, {opacity:0}]];
      for (let i = 1; i < n; i++){ const b = i * d; ks.push([b - 70, {opacity:0}], [b, {opacity:TR.flash}, EO], [b + (TR.punch ? 140 : 300), {opacity:0}]); } K(f, ks); }
    if (TR.blinds){ for (let j = 0; j < 6; j++){ const b = E("div", `position:absolute;left:0;right:0;top:${j * 100 / 6}%;height:${100 / 6 + .5}%;z-index:95;background:${p[2]};transform:scaleY(0);transform-origin:50% ${j % 2 ? 0 : 100}%`, null, st), ks = [[0, {transform:"scaleY(0)"}]];
      for (let i = 1; i < n; i++){ const B = i * d + j * 25; ks.push([B - 300, {transform:"scaleY(0)"}, EO], [B - 40, {transform:"scaleY(1)"}], [B + 40, {transform:"scaleY(1)"}, EO], [B + 300, {transform:"scaleY(0)"}]); } K(b, ks); } }
    if (v.bg === "footage" && v.lay !== "duo") E("div", `position:absolute;left:${3 * u}px;top:${3 * u}px;z-index:92;font:700 ${2.6 * u}px "IBM Plex Mono",monospace;color:#fff;display:flex;gap:${u}px;align-items:center`, `<span style="width:${2.2 * u}px;height:${2.2 * u}px;border-radius:50%;background:#ff3b30;display:inline-block"></span>REC`, st);
    const tag = E("div", `position:absolute;right:${2 * u}px;bottom:${2 * u}px;z-index:96;font:600 ${2.2 * u}px Inter,system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.45);padding:${.4 * u}px ${1.2 * u}px;border-radius:${u}px`, esc(P.id), st);
  }
  // ---------------------------------------------------- latar (look)
  function look(el, b){
    const g = (css) => E("div", "position:absolute;" + css, null, el);
    el.style.background = p[0];
    if (b === "flat" || b === "pastel"){ g(`width:46%;aspect-ratio:1;border-radius:50%;right:-10%;top:-18%;background:${p[2]};opacity:${b === "pastel" ? .25 : .9}`); g(`width:30%;aspect-ratio:1;border-radius:50%;left:-8%;bottom:-12%;background:${p[3]};opacity:${b === "pastel" ? .25 : .85}`);
      g(`width:8%;aspect-ratio:1;border-radius:50%;left:18%;top:14%;background:${p[2]};opacity:.5`); }
    else if (b === "iso"){ el.style.backgroundImage = `repeating-linear-gradient(30deg,${p[1]}14 0 1px,transparent 1px 28px),repeating-linear-gradient(150deg,${p[1]}14 0 1px,transparent 1px 28px)`; }
    else if (b === "white"){ g(`left:6%;top:8%;width:30%;height:3px;background:${p[3]};opacity:.15;transform:rotate(-2deg)`); }
    else if (b === "paper" || b === "kraft"){ el.style.backgroundImage = `radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.35),transparent 60%),radial-gradient(ellipse at 80% 90%,rgba(0,0,0,.10),transparent 55%)`;
      if (b === "kraft") g(`inset:0;background:repeating-linear-gradient(95deg,rgba(0,0,0,.035) 0 2px,transparent 2px 9px)`); }
    else if (b === "glass" || b === "grad"){ g(`width:60%;aspect-ratio:1;border-radius:50%;left:-12%;top:-20%;background:radial-gradient(circle,${p[2]},transparent 68%);opacity:.75`);
      g(`width:70%;aspect-ratio:1;border-radius:50%;right:-18%;bottom:-35%;background:radial-gradient(circle,${p[3]},transparent 68%);opacity:.7`); if (b === "grad") el.style.background = `linear-gradient(135deg,${p[0]},${p[4]})`; }
    else if (b === "bold"){ /* satu warna */ }
    else if (b === "dark"){ g(`inset:0;background:radial-gradient(ellipse at 70% 30%,${p[2]}33,transparent 60%)`); }
    else if (b === "news"){ el.style.backgroundImage = `repeating-linear-gradient(90deg,transparent 0 31%,${p[1]}22 31% calc(31% + 1px),transparent calc(31% + 1px) 33.3%)`;
      g(`right:0;bottom:0;width:40%;height:45%;background-image:radial-gradient(${p[1]}33 1.2px,transparent 1.4px);background-size:7px 7px;opacity:.7`); }
    else if (b === "map"){ el.style.backgroundImage = `linear-gradient(${p[1]}12 1px,transparent 1px),linear-gradient(90deg,${p[1]}12 1px,transparent 1px)`; el.style.backgroundSize = "40px 40px";
      S(`<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><path d="M5 38 C10 22 22 18 30 24 S44 16 50 22 S58 36 52 44 S34 56 22 50 S2 50 5 38Z" fill="${p[4]}" opacity=".85" stroke="${p[1]}" stroke-opacity=".25" stroke-width=".3"/><path d="M60 14 C70 8 84 10 92 18 S98 34 90 42 S72 46 66 38 S52 22 60 14Z" fill="${p[4]}" opacity=".85" stroke="${p[1]}" stroke-opacity=".25" stroke-width=".3"/></svg>`, el); }
    else if (b === "cork"){ el.style.backgroundImage = `radial-gradient(rgba(0,0,0,.18) 1px,transparent 1.6px),radial-gradient(rgba(255,255,255,.12) 1px,transparent 1.6px)`; el.style.backgroundSize = "9px 9px,13px 13px"; el.style.backgroundPosition = "0 0,4px 6px"; }
    else if (b === "mono"){ el.style.background = `linear-gradient(160deg,${p[0]},${p[3]})`; }
    else if (b === "sunset"){ el.style.background = `linear-gradient(180deg,${p[3]} 0%,${p[2]} 55%,${p[0]} 100%)`; g(`width:26%;aspect-ratio:1;border-radius:50%;left:37%;top:34%;background:${p[4]};opacity:.9`); }
    else if (b === "comic"){ el.style.backgroundImage = `radial-gradient(${p[2]}55 1.6px,transparent 1.8px)`; el.style.backgroundSize = "8px 8px"; }
    else if (b === "neon"){ g(`left:-10%;right:-10%;bottom:-5%;height:45%;background-image:linear-gradient(${p[2]}88 1px,transparent 1px),linear-gradient(90deg,${p[2]}88 1px,transparent 1px);background-size:36px 24px;transform:perspective(300px) rotateX(60deg);transform-origin:50% 100%`);
      g(`width:70%;aspect-ratio:1;left:15%;top:-10%;border-radius:50%;background:radial-gradient(circle,${p[3]}55,transparent 65%)`); }
    else if (b === "cosmic"){ const sh = []; for (let i = 0; i < 90; i++) sh.push(`${((i * 97) % 100) * W * 1.15 / 100}px ${((i * 61) % 100) * H * 1.15 / 100}px 0 ${i % 7 ? 0 : 1}px rgba(255,255,255,${.4 + (i % 5) / 10})`);
      const s1 = g(`left:0;top:0;width:2px;height:2px;border-radius:50%`); s1.style.boxShadow = sh.join(",");
      g(`width:80%;aspect-ratio:1;left:-20%;top:-30%;border-radius:50%;background:radial-gradient(circle,${p[2]}66,transparent 65%)`); g(`width:70%;aspect-ratio:1;right:-25%;bottom:-40%;border-radius:50%;background:radial-gradient(circle,${p[3]}44,transparent 65%)`); }
    else if (b === "gummy"){ [[p[2], -6, 8, 30], [p[3], 70, 58, 34], [p[4], 62, -10, 22]].forEach(([c, x, y, w]) => g(`left:${x}%;top:${y}%;width:${w}%;aspect-ratio:1;border-radius:46% 54% 50% 50%;background:radial-gradient(circle at 35% 30%,#fff9 0 8%,${c} 30%,${c})`)); }
    else if (b === "swiss"){ el.style.backgroundImage = `linear-gradient(90deg,${p[1]}10 1px,transparent 1px)`; el.style.backgroundSize = `${W / 12}px 100%`; g(`left:0;top:0;width:33%;height:${v.ar === "16:9" ? 100 : 30}%;background:${p[2]}`); }
    else if (b === "retro"){ el.style.backgroundImage = `repeating-conic-gradient(from 0deg at 50% 110%,${p[4]}55 0 6deg,transparent 6deg 12deg)`; g(`inset:0;background-image:radial-gradient(${p[1]}22 1.2px,transparent 1.4px);background-size:6px 6px`); }
    else if (b === "chalk"){ g(`left:8%;top:12%;width:40%;height:18%;background:radial-gradient(ellipse,rgba(255,255,255,.08),transparent 70%)`); g(`right:6%;bottom:10%;width:36%;height:22%;background:radial-gradient(ellipse,rgba(255,255,255,.06),transparent 70%)`); el.style.boxShadow = `inset 0 0 0 ${2 * u}px #6b4a2b`; }
    else if (b === "blueprint"){ el.style.backgroundImage = `linear-gradient(${p[1]}26 1px,transparent 1px),linear-gradient(90deg,${p[1]}26 1px,transparent 1px),linear-gradient(${p[1]}10 1px,transparent 1px),linear-gradient(90deg,${p[1]}10 1px,transparent 1px)`; el.style.backgroundSize = "60px 60px,60px 60px,12px 12px,12px 12px"; }
    else if (b === "ui"){ /* datar terang */ }
    else if (b === "footage"){ el.style.background = `linear-gradient(135deg,${p[3]}aa,${p[0]} 55%,${p[2]}88)`; for (let i = 0; i < 7; i++) g(`left:${(i * 37) % 90}%;top:${(i * 23) % 80}%;width:${10 + (i % 3) * 7}%;aspect-ratio:1;border-radius:50%;background:${i % 2 ? p[2] : p[4]};opacity:.25;filter:blur(${4 + i}px)`); }
  }
  // ---------------------------------------------------- teks judul dengan gerak txt
  function title(parent, text, s, css){
    const big = v.lay === "center" || v.lay === "lyric" || v.lay === "rank" || v.lay === "quote";
    const fs = (css && css.fs) || (big ? (v.ar === "16:9" ? 10 : 11) : 7.2) * u;
    const ital = (v.txt === "mask" && /Serif|Playfair|Bodoni|Cormorant|Baskerville/.test(F1)) ? "italic" : "normal";
    const box = E("div", `position:relative;display:inline-block;max-width:100%;font:${ital} ${v.txt === "flex" ? 400 : 700} ${fs}px/1.05 "${F1}",system-ui,sans-serif;color:${(css && css.color) || p[1]};letter-spacing:-.01em;${(css && css.extra) || ""}`, null, parent);
    box.dataset.ttl = "1"; const words = text.split(" "), t0 = s + 260;
    const wspan = (w, j) => `<span class="w" style="display:inline-block;white-space:pre">${esc(w)}${j < words.length - 1 ? " " : ""}</span>`;
    const lspan = () => words.map((w, j) => `<span style="display:inline-block;white-space:pre">${[...(w + (j < words.length - 1 ? " " : ""))].map(ch => `<span class="l" style="display:inline-block;white-space:pre">${esc(ch)}</span>`).join("")}</span>`).join("");
    const x = v.txt;
    if (x === "type" || x === "letters" || x === "scramble"){ box.innerHTML = lspan(); const L = [...box.querySelectorAll(".l")], order = L.map((_, i) => i);
      if (x === "scramble") order.sort((a, b) => ((a * 7919) % 13) - ((b * 7919) % 13));
      order.forEach((li, j) => { const el = L[li], t = t0 + j * (x === "type" ? 45 : x === "letters" ? 38 : 30);
        if (x === "letters") K(el, [[t, {opacity:0, transform:"translateY(-60%)"}, BK], [t + 420, {opacity:1, transform:"translateY(0%)"}]]);
        else if (x === "scramble") K(el, [[t, {opacity:0, color:p[2]}], [t + 60, {opacity:1, color:p[2]}], [t + 120, {opacity:.3, color:p[2]}], [t + 220, {opacity:1, color:p[2]}, EO], [t + 520, {opacity:1, color:(css && css.color) || p[1]}]]);
        else K(el, [[t, {opacity:0}, "steps(1)"], [t + 1, {opacity:1}]]); });
      if (x === "type"){ const c = E("span", `display:inline-block;width:.08em;height:.9em;background:${p[2]};vertical-align:-.1em;margin-left:.05em`, null, box); const ks = []; for (let t = 0; t <= T; t += 500) ks.push([t, {opacity:(t / 500) % 2 ? 0 : 1}, "steps(1)"]); K(c, ks); }
      return box; }
    if (x === "word" || x === "rise" || x === "swap"){ box.innerHTML = words.map((w, j) => x === "rise" ? `<span style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em">${wspan(w, j)}</span>` : wspan(w, j)).join("");
      box.querySelectorAll(".w").forEach((el, j) => { const t = t0 + j * (x === "rise" ? 110 : 170);
        if (x === "rise") K(el, [[t, {transform:"translateY(105%)"}, EO], [t + 520, {transform:"translateY(0%)"}]]);
        else K(el, [[t, {opacity:0, transform:"scale(.6)"}, BK], [t + 360, {opacity:1, transform:"scale(1)"}]]); });
      if (x === "swap"){ const last = box.querySelectorAll(".w"); const el = last[last.length - 1]; K(el, [[t0 + 1500, {transform:"rotateX(0deg)", color:p[1]}, EO], [t0 + 1800, {transform:"rotateX(90deg)", color:p[1]}], [t0 + 1801, {transform:"rotateX(-90deg)", color:p[2]}, EO], [t0 + 2100, {transform:"rotateX(0deg)", color:p[2]}]]); }
      return box; }
    box.textContent = text;
    if (x === "fade") K(box, [[t0, {opacity:0, transform:"translateY(30%)"}, EO], [t0 + 600, {opacity:1, transform:"translateY(0%)"}]]);
    else if (x === "slam") K(box, [[t0, {opacity:0, transform:"scale(2.4)"}, "cubic-bezier(.5,0,.75,0)"], [t0 + 260, {opacity:1, transform:"scale(.96)"}, EO], [t0 + 420, {opacity:1, transform:"scale(1)"}]]);
    else if (x === "mask"){ box.style.overflow = "hidden"; box.innerHTML = `<span style="display:block">${esc(text)}</span>`; K(box.firstChild, [[t0, {transform:"translateY(110%)"}, EO], [t0 + 700, {transform:"translateY(0%)"}]]); }
    else if (x === "track") K(box, [[t0, {opacity:0, letterSpacing:".55em"}, EO], [t0 + 900, {opacity:1, letterSpacing:"-.01em"}]]);
    else if (x === "blur") K(box, [[t0, {opacity:0, filter:"blur(16px)"}, EO], [t0 + 800, {opacity:1, filter:"blur(0px)"}]]);
    else if (x === "hand"){ box.style.fontWeight = 400; K(box, [[t0, {clipPath:"inset(0% 100% 0% 0%)"}, LN], [t0 + 1300, {clipPath:"inset(0% 0% 0% 0%)"}]]); }
    else if (x === "marker"){ box.innerHTML = `<span style="position:relative;display:inline-block"><span class="hl" style="position:absolute;left:-.08em;right:-.08em;bottom:.04em;height:.42em;background:${p[2]};opacity:.55;transform-origin:0 50%;z-index:-0"></span><span style="position:relative">${esc(text)}</span></span>`;
      K(box, [[t0, {opacity:0}, EO], [t0 + 300, {opacity:1}]]); K(box.querySelector(".hl"), [[t0 + 400, {transform:"scaleX(0)"}, EO], [t0 + 900, {transform:"scaleX(1)"}]]); }
    else if (x === "stamp"){ box.style.cssText += `;display:inline-block;padding:.12em .3em;border:${.6 * u}px solid currentColor;border-radius:${u}px;text-transform:uppercase`; K(box, [[t0, {opacity:0, transform:"scale(2.6) rotate(-14deg)"}, "cubic-bezier(.6,0,.9,.3)"], [t0 + 240, {opacity:1, transform:"scale(1) rotate(-4deg)"}, EO], [t0 + 340, {opacity:1, transform:"scale(1.04) rotate(-4deg)"}], [t0 + 440, {opacity:1, transform:"scale(1) rotate(-4deg)"}]]); }
    else if (x === "flex") K(box, [[t0, {fontWeight:100, opacity:0}, IO], [t0 + 500, {fontWeight:300, opacity:1}, IO], [t0 + 1500, {fontWeight:900, opacity:1}, IO], [t0 + 2600, {fontWeight:200, opacity:1}, IO], [t0 + 3400, {fontWeight:700, opacity:1}]]);
    else if (x === "glitch"){ const ks = [[t0, {opacity:0, transform:"translateX(0px)", textShadow:"0 0 transparent,0 0 transparent"}, "steps(1)"]]; for (let j = 0; j < 14; j++) ks.push([t0 + 60 + j * 70, {opacity:j % 4 === 1 ? .4 : 1, transform:`translateX(${((j * 37) % 9) - 4}px)`, textShadow:`${((j * 5) % 7) - 3}px 0 #ff0055,${((j * 3) % 7) - 3}px 0 #00e5ff`}, "steps(1)"]); ks.push([t0 + 1100, {opacity:1, transform:"translateX(0px)", textShadow:"0 0 transparent,0 0 transparent"}]); K(box, ks); }
    else if (x === "neon"){ box.style.color = "#fff"; const g = `0 0 ${.5 * u}px #fff,0 0 ${2 * u}px ${p[2]},0 0 ${5 * u}px ${p[2]}`; box.style.textShadow = g; K(box, [[t0, {opacity:0}, "steps(1)"], [t0 + 80, {opacity:1}, "steps(1)"], [t0 + 160, {opacity:.2}, "steps(1)"], [t0 + 260, {opacity:1}, "steps(1)"], [t0 + 520, {opacity:.5}, "steps(1)"], [t0 + 600, {opacity:1}]]); }
    else if (x === "extrude"){ box.style.textShadow = Array.from({length:8}, (_, j) => `${j + 1}px ${j + 1}px 0 ${p[3]}`).join(","); box.style.color = p[4]; K(box, [[t0, {opacity:0, transform:"rotateX(70deg) rotateY(-30deg)"}, EO], [t0 + 900, {opacity:1, transform:"rotateX(8deg) rotateY(-12deg)"}, IO], [t0 + 3000, {opacity:1, transform:"rotateX(-6deg) rotateY(14deg)"}]]); }
    return box;
  }
  const lines = (parent, k, w, c, css) => { for (let j = 0; j < k; j++) E("div", `height:${1.6 * u}px;width:${w - j * 9}%;background:${c};opacity:.35;border-radius:${u}px;margin-top:${1.6 * u}px;${css || ""}`, null, parent); };
  const pop = (el, t, from) => K(el, [[t, {opacity:0, transform:from || "translateY(18px) scale(.96)"}, EO], [t + 520, {opacity:1, transform:"translateY(0px) scale(1)"}]]);
  const draw = (path, t, dur, len) => { path.style.strokeDasharray = len; K(path, [[t, {strokeDashoffset:len}, EO], [t + dur, {strokeDashoffset:0}]]); };
  // ---------------------------------------------------- komposisi (layout)
  function layout(ct, L, c, i, s, e){
    const port = v.ar !== "16:9", F = `"${F1}",system-ui,sans-serif`;
    const flex = (css) => E("div", `position:absolute;inset:0;display:flex;${css}`, null, ct);
    if (L === "center" || L === "lyric" || L === "rank" || L === "logo"){
      const f = flex(`flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:${2 * u}px;padding:${4 * u}px`);
      if (L === "rank"){ const r = E("div", `font:800 ${30 * u}px/0.9 ${F};color:${p[2]}`, String(n - i), f); pop(r, s + 120, "scale(.4)"); }
      if (L === "lyric" && i > 0){ const pv = E("div", `font:600 ${5 * u}px/1.1 ${F};opacity:.35`, esc(ex[(i - 1) % ex.length].judul), f); }
      if (L === "logo"){ const m = E("div", `width:${22 * u}px;height:${22 * u}px;position:relative`, null, f);
        [[p[2], "0%", "0%"], [p[3], "50%", "0%"], [p[4], "0%", "50%"], [p[1], "50%", "50%"]].forEach(([cc, x, y], j) => { const q = E("div", `position:absolute;left:${x};top:${y};width:50%;height:50%;background:${cc};border-radius:${j === 0 ? "100% 0 0 0" : j === 3 ? "0 0 100% 0" : "0"}`, null, m); pop(q, s + 150 + j * 120, "scale(0) rotate(90deg)"); });
        title(f, "BRANDMU", s + 600, {fs:9 * u, color:p[1] === p[0] ? "#fff" : p[1]}); return; }
      title(f, c.judul, s); return; }
    if (L === "split" || L === "photo" || L === "quote"){
      if (L === "photo"){ const ph = E("div", `position:absolute;left:${port ? 6 : 12}%;right:${port ? 6 : 12}%;top:${port ? 24 : 22}%;bottom:${port ? 26 : 16}%;background:#f4efe6;padding:${1.4 * u}px;box-shadow:0 ${u}px ${3 * u}px rgba(0,0,0,.35);transform:rotate(${i % 2 ? 1.5 : -1.5}deg)`, null, ct);
        const img = E("div", `position:absolute;inset:${1.4 * u}px;background:linear-gradient(180deg,${v.bg === "mono" ? "#bbb,#555" : "#c9b48f,#5b4a36"});filter:${v.bg === "mono" ? "grayscale(1)" : "sepia(.4)"};overflow:hidden`, null, ph);
        E("div", `position:absolute;left:0;right:0;bottom:0;height:38%;background:${v.bg === "mono" ? "#333" : "#3d3125"}`, null, img); [[10, 30, 14], [34, 18, 10], [58, 40, 18], [80, 24, 9]].forEach(([x, h, w]) => E("div", `position:absolute;left:${x}%;bottom:30%;width:${w}%;height:${h}%;background:${v.bg === "mono" ? "#222" : "#2a2119"};opacity:.85`, null, img));
        if (v.bg === "mono") E("div", `position:absolute;left:58%;bottom:30%;width:18%;height:40%;background:${p[2]};mix-blend-mode:multiply`, null, img);
        const tb = E("div", `position:absolute;left:${port ? 6 : 12}%;right:${port ? 6 : 12}%;top:${port ? 6 : 2}%;`, null, ct); title(tb, c.judul, s, {color:v.bg === "dark" || v.bg === "footage" ? p[1] : p[1]}); accent(ph, s, e); return; }
      if (L === "quote"){ const q = E("div", `position:absolute;left:${port ? 6 : 10}%;right:${port ? 6 : 10}%;top:${port ? 18 : 12}%;bottom:${port ? 26 : 14}%;background:${p[4]};padding:${4 * u}px;box-shadow:0 ${.6 * u}px ${2.4 * u}px rgba(0,0,0,.18)`, null, ct);
        E("div", `font:700 ${16 * u}px/0.6 ${F};color:${p[2]};height:${7 * u}px`, "“", q); title(q, c.judul, s); lines(q, 3, 90, p[1]); pop(q, s + 80); accent(q, s, e); return; }
      const lt = E("div", `position:absolute;left:0;${port ? "right:0;top:6%" : "width:52%;top:0;bottom:0"};display:flex;flex-direction:column;justify-content:center;padding:${3 * u}px`, null, ct);
      title(lt, c.judul, s); lines(lt, 2, 80, p[1]);
      const rt = E("div", `position:absolute;${port ? "left:8%;right:8%;bottom:10%;height:42%" : "right:2%;width:42%;top:14%;bottom:14%"};background:${p[4]};border-radius:${2 * u}px;overflow:hidden;box-shadow:0 ${u}px ${4 * u}px rgba(0,0,0,.18)`, null, ct);
      E("div", `position:absolute;inset:0;background:linear-gradient(135deg,${p[2]},${p[3]});opacity:.85`, null, rt); E("div", `position:absolute;width:40%;aspect-ratio:1;border-radius:50%;left:30%;top:22%;background:${p[4]};opacity:.55`, null, rt);
      pop(rt, s + 200, "translateX(30px) scale(.96)"); accent(lt, s, e); return; }
    if (L === "cards" || L === "icons" || L === "steps"){
      const top = E("div", `position:absolute;left:0;right:0;top:${port ? 8 : 4}%;padding:0 ${3 * u}px;text-align:${L === "steps" ? "left" : "center"}`, null, ct); title(top, c.judul, s);
      const row = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:${port ? 34 : 38}%;bottom:${port ? 22 : 8}%;display:flex;${L === "steps" || (port && L !== "icons") ? "flex-direction:column" : ""};gap:${2.4 * u}px;align-items:stretch;justify-content:center`, null, ct);
      const k = L === "icons" ? (port ? 3 : 4) : 3;
      for (let j = 0; j < k; j++){
        if (L === "steps"){ const it = E("div", `display:flex;align-items:center;gap:${2 * u}px;background:${p[4]};border-radius:${1.6 * u}px;padding:${1.6 * u}px ${2 * u}px;box-shadow:0 ${.3 * u}px ${1.2 * u}px rgba(0,0,0,.12)`, `<b style="font:700 ${5 * u}px ${F};color:${p[2]};min-width:${5 * u}px">${j + 1}</b><span style="flex:1;height:${1.8 * u}px;background:${p[1]};opacity:.3;border-radius:${u}px"></span>`, row);
          pop(it, s + 500 + j * 380, "translateX(-24px)"); if (v.acc === "check"){ const ck = E("span", `font:700 ${4.4 * u}px Inter;color:${p[2]}`, "✓", it); pop(ck, s + 900 + j * 380, "scale(0)"); } continue; }
        if (L === "icons"){ const it = E("div", `flex:1;display:flex;flex-direction:column;align-items:center;gap:${1.4 * u}px`, null, row);
          const ic = E("div", `width:${(port ? 18 : 14) * u}px;aspect-ratio:1;border-radius:${v.bg === "white" || v.bg === "paper" ? "50%" : 2.4 * u + "px"};background:${[p[2], p[3], p[1], p[2]][j]};display:flex;align-items:center;justify-content:center;${v.bg === "white" ? `background:transparent;border:${.5 * u}px solid ${[p[2], p[3], p[1], p[2]][j]}` : ""}`,
            `<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="${v.bg === "white" ? [p[2], p[3], p[1], p[2]][j] : p[4]}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${["<path d='M4 17l5-5 4 4 7-7'/>", "<circle cx='12' cy='12' r='8'/><path d='M12 8v4l3 2'/>", "<rect x='4' y='5' width='16' height='14' rx='2'/><path d='M4 10h16'/>", "<path d='M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2L6.6 19.2l1.3-6-4.5-4 6-.6z'/>"][j]}</svg>`, it);
          if (v.acc === "count") E("b", `font:800 ${5 * u}px ${F};color:${p[1]}`, String([12, 48, 3, 7][j]), it); else E("span", `height:${1.6 * u}px;width:70%;background:${p[1]};opacity:.3;border-radius:${u}px`, null, it);
          pop(it, s + 500 + j * 220, "translateY(24px) scale(.7)"); continue; }
        const cd = E("div", `flex:1;background:${p[4]};border-radius:${2 * u}px;padding:${2 * u}px;box-shadow:0 ${.6 * u}px ${2.4 * u}px rgba(0,0,0,.16);${v.bg === "glass" ? `background:rgba(255,255,255,.12);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.3)` : ""};transform:rotate(${(j - 1) * 2}deg)`,
          `<div style="width:${7 * u}px;height:${7 * u}px;border-radius:50%;background:${[p[2], p[3], p[2]][j]}"></div>`, row); lines(cd, 3, 90, v.bg === "glass" ? "#fff" : p[1]);
        if (v.acc === "stars") E("div", `margin-top:${1.4 * u}px;font-size:${3.4 * u}px;color:${p[3]};letter-spacing:.1em`, "★★★★★", cd);
        pop(cd, s + 450 + j * 260, "translateY(40px) rotate(4deg)"); }
      accent(top, s, e); return; }
    if (L === "chart"){
      const top = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:4%`, null, ct); title(top, c.judul, s, {fs:6 * u});
      const ch = E("div", `position:absolute;left:${4 * u}px;right:${4 * u}px;top:${port ? 30 : 30}%;bottom:8%;border-left:2px solid ${p[1]}55;border-bottom:2px solid ${p[1]}55;display:flex;align-items:flex-end;gap:${2 * u}px;padding:0 ${2 * u}px`, null, ct);
      const hs = [[30, 45, 52, 70, 88], [60, 35, 80, 50, 65], [20, 40, 35, 75, 92], [55, 62, 48, 70, 80]][i % 4];
      hs.forEach((h, j) => { const b = E("div", `flex:1;height:${h}%;background:${j === 4 ? p[2] : p[3]};border-radius:${u}px ${u}px 0 0;transform-origin:50% 100%;${v.bg === "paper" ? `border:2px solid ${p[1]};background:transparent;background-image:repeating-linear-gradient(45deg,${j === 4 ? p[2] : p[3]} 0 3px,transparent 3px 7px)` : ""}`, null, ch);
        K(b, [[s + 400 + j * 140, {transform:"scaleY(0)"}, EO], [s + 1300 + j * 140, {transform:"scaleY(1)"}]]); });
      const ln = S(`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible"><path d="M2 ${100 - hs[0] + 6} L 24 ${100 - hs[1] + 6} L 46 ${100 - hs[2] + 6} L 68 ${100 - hs[3] + 6} L 96 ${100 - hs[4] + 2}" fill="none" stroke="${p[1]}" stroke-width="1.4" vector-effect="non-scaling-stroke" stroke-dasharray="3 0"/></svg>`, ch);
      draw(ln.querySelector("path"), s + 1500, 1000, 200); accent(ch, s, e);
      E("div", `position:absolute;right:${2 * u}px;top:${port ? 24 : 22}%;font:600 ${2.2 * u}px Inter;color:${p[1]};opacity:.6`, "data contoh", ct); return; }
    if (L === "map" || L === "timeline"){
      const top = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:4%`, null, ct); title(top, c.judul, s, {fs:6 * u});
      if (L === "map"){ const pts = [[18, 62], [78, 34], [30, 40], [70, 70]], a = pts[i % 4], b = pts[(i + 1) % 4], mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 22;
        const sv = S(`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible"><path d="M${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}" fill="none" stroke="${p[2]}" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>`, ct);
        draw(sv.querySelector("path"), s + 600, 1400, 160);
        [a, b].forEach((q, j) => { const dot = E("div", `position:absolute;left:${q[0]}%;top:${q[1]}%;width:${3 * u}px;height:${3 * u}px;margin:${-1.5 * u}px;border-radius:50%;background:${p[2]};box-shadow:0 0 0 ${u}px ${p[2]}44`, null, ct); pop(dot, s + 400 + j * 1500, "scale(0)");
          if (j === 1){ const lb = E("div", `position:absolute;left:${q[0]}%;top:${q[1]}%;transform:translate(-50%,-260%);background:${p[1]};color:${p[0]};font:700 ${2.6 * u}px Inter;padding:${.5 * u}px ${1.2 * u}px;border-radius:${u}px;white-space:nowrap`, "Tujuan", ct); pop(lb, s + 2100, "translate(-50%,-200%)"); } });
        if (v.acc === "pin"){ const pin = E("div", `position:absolute;left:${b[0]}%;top:${b[1]}%;width:${5 * u}px;height:${5 * u}px;margin:${-6 * u}px 0 0 ${-2.5 * u}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${p[2]}`, null, ct); K(pin, [[s + 1900, {opacity:0, transform:"translateY(-40px) rotate(-45deg)"}, BK], [s + 2400, {opacity:1, transform:"translateY(0px) rotate(-45deg)"}]]); }
        return; }
      const tl = E("div", `position:absolute;left:4%;right:4%;top:58%;height:2px;background:${p[1]}66`, null, ct); K(tl, [[s + 200, {transform:"scaleX(0)"}, EO], [s + 1000, {transform:"scaleX(1)"}]]); tl.style.transformOrigin = "0 50%";
      for (let j = 0; j < 4; j++){ const x = 6 + j * 29; const dt = E("div", `position:absolute;left:${x}%;top:58%;width:${3.4 * u}px;height:${3.4 * u}px;margin:${-1.7 * u}px;border-radius:50%;background:${j <= i % 4 ? p[2] : p[4]};border:2px solid ${p[2]}`, null, ct);
        pop(dt, s + 500 + j * 260, "scale(0)"); const lb = E("div", `position:absolute;left:${x}%;top:63%;transform:translateX(-50%);font:700 ${3 * u}px ${F};color:${p[1]};text-align:center`, ["I", "II", "III", "IV"][j] + `<div style="width:${10 * u}px;height:${1.2 * u}px;background:${p[1]};opacity:.3;border-radius:${u}px;margin:${u}px auto 0"></div>`, ct); pop(lb, s + 650 + j * 260); }
      if (v.acc === "count" || v.acc === "ring") accent(top, s, e); return; }
    if (L === "collage" || L === "board" || L === "panels"){
      const k = L === "panels" ? 3 : (L === "board" ? 4 : 3), pcs = [];
      for (let j = 0; j < k; j++){
        let css;
        if (L === "panels") css = port ? `left:5%;right:5%;top:${4 + j * 31}%;height:29%` : `left:${2 + j * 32.6}%;width:31%;top:14%;bottom:14%`;
        else if (L === "board") css = `left:${[6, 54, 12, 58][j]}%;top:${[8, 6, 52, 50][j]}%;width:${port ? 38 : 30}%;height:${port ? 30 : 38}%`;
        else css = port ? `left:${[6, 30, 10][j]}%;top:${[2, 23, 44][j]}%;width:${[70, 64, 78][j]}%;height:${[23, 22, 22][j]}%` : `left:${[4, 36, 62][j]}%;top:${[10, 26, 6][j]}%;width:${[38, 34, 34][j]}%;height:${[48, 50, 44][j]}%`;
        const pc = E("div", `position:absolute;${css};background:${L === "panels" ? p[4] : "#f4efe6"};${L === "panels" ? `border:${.7 * u}px solid ${p[1]}` : `padding:${1.2 * u}px;box-shadow:0 ${.6 * u}px ${2 * u}px rgba(0,0,0,.3)`};transform:rotate(${L === "panels" ? 0 : [-4, 3, -2, 5][j]}deg);${L === "collage" ? `clip-path:polygon(0 2%,8% 0,22% 3%,40% 0,61% 2%,79% 0,100% 3%,98% 30%,100% 58%,97% 100%,70% 97%,48% 100%,24% 98%,0 100%,2% 64%,0 34%)` : ""}`, null, ct);
        E("div", `position:absolute;inset:${L === "panels" ? 0 : 1.2 * u + "px"};background:${L === "panels" ? `radial-gradient(${p[2]}33 1.4px,transparent 1.6px) 0 0/7px 7px` : `linear-gradient(160deg,${[p[2], p[3], p[4], p[2]][j]},${[p[3], p[1], p[2], p[1]][j]}cc)`};${L === "collage" && v.bg === "paper" ? "filter:sepia(.5)" : ""}`, null, pc);
        if (L === "board"){ const pin = E("div", `position:absolute;left:46%;top:-${1.4 * u}px;width:${2.8 * u}px;height:${2.8 * u}px;border-radius:50%;background:${p[2]};box-shadow:0 2px 3px rgba(0,0,0,.4)`, null, pc); }
        if (L === "collage" && (v.acc === "tape" || v.acc === "medal")) E("div", `position:absolute;left:38%;top:-${1.6 * u}px;width:24%;height:${3.6 * u}px;background:rgba(255,240,200,.75);transform:rotate(-3deg)`, null, pc);
        pop(pc, s + 200 + j * 280, L === "panels" ? "scale(.9)" : "translateY(-40px) rotate(-8deg)"); pcs.push(pc); }
      if (L === "board"){ const sv = S(`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%"><path d="M23 10 L70 8 L28 54 L74 52" fill="none" stroke="${p[2]}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`, ct, "z-index:3"); draw(sv.querySelector("path"), s + 1400, 1400, 240); }
      const tb = E("div", `position:absolute;left:${port ? 6 : 8}%;right:${port ? 6 : 30}%;bottom:${port ? 22 : 6}%;z-index:4;${L === "panels" ? "" : `background:${p[4]};padding:${1.6 * u}px ${2.4 * u}px;box-shadow:0 ${.4 * u}px ${1.6 * u}px rgba(0,0,0,.25);transform:rotate(-1deg)`}`, null, ct);
      if (L === "panels"){ tb.style.cssText += `;left:auto;right:${port ? 8 : 6}%;top:${port ? 6 : 8}%;bottom:auto;background:#fff;border:${.5 * u}px solid ${p[1]};border-radius:50%;padding:${2 * u}px ${3 * u}px;max-width:${port ? 80 : 40}%`; }
      title(tb, c.judul, s, {fs:(port ? 6.4 : 5.6) * u}); accent(tb, s, e); return; }
    if (L === "footage" || L === "duo"){
      if (L === "duo"){ for (let j = 0; j < 2; j++){ const fr = E("div", `position:absolute;${port ? `left:0;right:0;top:${j * 50}%;height:49.4%` : `top:8%;bottom:20%;left:${j * 50 + 1}%;width:48%`};background:linear-gradient(135deg,${[p[2], p[3]][j]}aa,${p[0]});border-radius:${port ? 0 : 1.6 * u}px;overflow:hidden`, null, ct);
          for (let q = 0; q < 4; q++) E("div", `position:absolute;left:${(q * 31 + j * 20) % 80}%;top:${(q * 27) % 70}%;width:22%;aspect-ratio:1;border-radius:50%;background:#fff;opacity:.12;filter:blur(6px)`, null, fr);
          E("div", `position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font:600 ${2.6 * u}px Inter;color:#fff;background:rgba(0,0,0,.4);padding:${.6 * u}px ${1.4 * u}px;border-radius:${u}px;white-space:nowrap`, j ? "▶ rekaman 2" : "▶ rekaman 1", fr);
          pop(fr, s + 100 + j * 200, port ? "translateY(-20px)" : "translateX(-20px)"); }
        if (v.acc === "wave"){ const wv = E("div", `position:absolute;left:30%;right:30%;bottom:${port ? 46 : 12}%;height:${5 * u}px;display:flex;gap:2px;align-items:center;z-index:3`, null, ct);
          for (let q = 0; q < 24; q++){ const br = E("div", `flex:1;height:100%;background:${p[2]};border-radius:2px;transform-origin:50% 50%`, null, wv); const ks = []; for (let t = 0; t <= T; t += 160) ks.push([t, {transform:`scaleY(${.15 + ((q * 7 + t / 160 * 5) % 10) / 12})`}]); K(br, ks); } }
        accent(ct.lastElementChild && ct.children[1] ? ct.children[1] : ct, s, e); return; }
      E("div", `position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font:600 ${2.8 * u}px Inter;color:#fff;background:rgba(0,0,0,.35);padding:${.8 * u}px ${1.6 * u}px;border-radius:${u}px;white-space:nowrap`, "▶ rekaman narasumber", ct);
      const lt = E("div", `position:absolute;left:${3 * u}px;bottom:${port ? 26 : 22}%;max-width:80%;background:${p[4]};padding:${1.2 * u}px ${2.4 * u}px;border-left:${1 * u}px solid ${p[2]}`, null, ct);
      title(lt, c.judul, s, {fs:4.6 * u}); E("div", `font:500 ${2.4 * u}px Inter;opacity:.7;margin-top:${.4 * u}px`, KAT.nama, lt);
      pop(lt, s + 200, "translateX(-40px)"); accent(lt, s, e); return; }
    if (L === "ui" || L === "phone" || L === "chat" || L === "code"){
      const isP = L === "phone";
      const win = E("div", `position:absolute;${isP ? "left:50%;top:6%;width:52%;bottom:6%;transform:translateX(-50%);border-radius:" + 5 * u + "px;border:" + 1.4 * u + "px solid " + p[1] : (port ? "left:4%;right:4%;top:20%;bottom:16%" : "left:8%;right:8%;top:14%;bottom:8%") + ";border-radius:" + 1.6 * u + "px"};background:${L === "code" ? p[4] : "#fff"};box-shadow:0 ${u}px ${5 * u}px rgba(0,0,0,.25);overflow:hidden`, null, ct);
      if (!isP) E("div", `height:${4 * u}px;background:${L === "code" ? "#00000033" : "#f1f3f6"};display:flex;gap:${.8 * u}px;align-items:center;padding:0 ${1.4 * u}px`, `<i style="width:${1.4 * u}px;height:${1.4 * u}px;border-radius:50%;background:#ff5f57"></i><i style="width:${1.4 * u}px;height:${1.4 * u}px;border-radius:50%;background:#febc2e"></i><i style="width:${1.4 * u}px;height:${1.4 * u}px;border-radius:50%;background:#28c840"></i>`, win);
      const body = E("div", `position:absolute;left:0;right:0;top:${isP ? 0 : 4 * u}px;bottom:0;padding:${2 * u}px;display:flex;gap:${2 * u}px`, null, win);
      if (L === "code"){ body.style.flexDirection = "column"; body.style.font = `500 ${3 * u}px "IBM Plex Mono",monospace`; body.style.color = p[1]; body.style.gap = `${.8 * u}px`;
        ["$ npx tool init", "  ✓ konfigurasi dibuat", "$ npx tool run --watch", "  ✓ selesai dalam 1,2 dtk"].forEach((t, j) => { const ln = E("div", `white-space:pre;color:${t.includes("✓") ? p[2] : p[1]}`, esc(t), body); K(ln, [[s + 300 + j * 500, {clipPath:"inset(0% 100% 0% 0%)"}, "steps(14)"], [s + 700 + j * 500, {clipPath:"inset(0% 0% 0% 0%)"}]]); });
        const tt = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:${port ? 6 : 2}%`, null, ct); title(tt, c.judul, s, {fs:5.4 * u}); return; }
      if (L === "chat"){ body.style.flexDirection = "column"; body.style.justifyContent = "flex-end"; body.style.gap = `${1.4 * u}px`;
        [["Ringkas laporan minggu ini", 1], ["Berikut tiga poin utama dari laporan...", 0], ["Buat dalam bentuk tabel", 1]].forEach(([t, me], j) => { const b = E("div", `align-self:${me ? "flex-end" : "flex-start"};max-width:70%;background:${me ? p[2] : "#f1f3f6"};color:${me ? "#fff" : p[1]};font:500 ${2.8 * u}px Inter;padding:${1.2 * u}px ${1.8 * u}px;border-radius:${2 * u}px`, esc(t), body); pop(b, s + 300 + j * 700, "translateY(14px)"); });
        const tt = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:${port ? 6 : 1}%`, null, ct); title(tt, c.judul, s, {fs:5 * u}); return; }
      if (!isP){ E("div", `width:22%;background:#f6f7f9;border-radius:${u}px`, null, body); }
      const main = E("div", `flex:1;display:flex;flex-direction:column;gap:${1.4 * u}px`, null, body);
      for (let j = 0; j < (isP ? 5 : 4); j++){ const r = E("div", `height:${(isP ? 9 : 6) * u}px;border-radius:${u}px;background:${j === 1 ? p[2] + "22" : "#f1f3f6"};display:flex;align-items:center;padding:0 ${1.4 * u}px;gap:${u}px`, `<i style="width:${2.6 * u}px;height:${2.6 * u}px;border-radius:50%;background:${[p[2], p[3]][j % 2]}"></i><i style="flex:1;height:${1.2 * u}px;background:#c8ccd4;border-radius:${u}px"></i>`, main); pop(r, s + 200 + j * 120, "translateY(10px)"); }
      if (isP) K(main, [[s + 1200, {transform:"translateY(0%)"}, IO], [s + 2600, {transform:"translateY(-22%)"}]]);
      const btn = E("div", `position:absolute;right:${isP ? 18 : 12}%;bottom:${isP ? 14 : 14}%;background:${p[2]};color:#fff;font:700 ${2.8 * u}px Inter;padding:${1 * u}px ${2.2 * u}px;border-radius:${u}px`, "Simpan", win);
      const cur = E("div", `position:absolute;left:0;top:0;width:${4 * u}px;z-index:5`, `<svg viewBox="0 0 24 24" width="100%"><path d="M4 2l15 9-6.5 1.5L9 19z" fill="#111" stroke="#fff" stroke-width="1.4"/></svg>`, ct);
      const tx = isP ? 62 : 74, ty = isP ? 78 : 76;
      K(cur, [[s + 300, {transform:`translate(${W * .2}px,${H * .3}px)`}, IO], [s + 1500, {transform:`translate(${W * tx / 100 * .86}px,${H * ty / 100 * .86}px)`}], [s + 1700, {transform:`translate(${W * tx / 100 * .86}px,${H * ty / 100 * .86}px) scale(.85)`}], [s + 1850, {transform:`translate(${W * tx / 100 * .86}px,${H * ty / 100 * .86}px) scale(1)`}]]);
      const rp = E("div", `position:absolute;left:50%;top:50%;width:${10 * u}px;height:${10 * u}px;margin:${-5 * u}px;border-radius:50%;border:2px solid #fff`, null, btn); K(rp, [[s + 1700, {opacity:0, transform:"scale(.2)"}, EO], [s + 1720, {opacity:1, transform:"scale(.2)"}, EO], [s + 2300, {opacity:0, transform:"scale(1.6)"}]]);
      const tt = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:${port ? 6 : 1}%;${isP ? "display:none" : ""}`, null, ct); title(tt, c.judul, s, {fs:5 * u}); if (v.acc === "circle") accent(btn, s, e); else accent(tt, s, e); return; }
    if (L === "product"){
      const pr = E("div", `position:absolute;left:50%;top:${port ? 40 : 46}%;width:${port ? 36 : 22}%;aspect-ratio:.62;transform:translate(-50%,-50%);transform-style:preserve-3d`, null, ct);
      const body = E("div", `position:absolute;inset:0;border-radius:${4 * u}px ${4 * u}px ${2.4 * u}px ${2.4 * u}px;background:linear-gradient(100deg,${p[3]} 0%,${p[2]} 45%,${p[3]} 100%);box-shadow:0 ${4 * u}px ${6 * u}px rgba(0,0,0,.35)${v.bg === "glass" ? ";opacity:.85;backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.4)" : ""}`, null, pr);
      E("div", `position:absolute;left:12%;top:8%;width:18%;bottom:8%;border-radius:${3 * u}px;background:linear-gradient(180deg,rgba(255,255,255,.65),rgba(255,255,255,0))`, null, body);
      E("div", `position:absolute;left:18%;right:18%;top:38%;height:22%;background:${p[4]};border-radius:${u}px;opacity:.9`, null, body);
      K(pr, [[s + 100, {transform:"translate(-50%,-50%) rotateY(-30deg) scale(.85)", opacity:0}, EO], [s + 700, {transform:"translate(-50%,-50%) rotateY(-20deg) scale(1)", opacity:1}, IO], [e, {transform:"translate(-50%,-50%) rotateY(25deg) scale(1)", opacity:1}]]);
      const tt = E("div", `position:absolute;left:0;right:0;bottom:${port ? 10 : 6}%;text-align:center`, null, ct); title(tt, c.judul, s, {fs:(port ? 8 : 6.4) * u}); accent(tt, s, e); return; }
    if (L === "iso"){
      const g = E("div", `position:absolute;left:50%;top:${port ? 50 : 56}%;width:0;height:0`, null, ct);
      [[-26, 6, p[2]], [0, -8, p[3]], [26, 6, p[2]]].forEach(([x, y, cc], j) => { const cube = E("div", `position:absolute;left:${x * u}px;top:${y * u}px;width:${16 * u}px;height:${16 * u}px;margin:${-8 * u}px`, null, g);
        E("div", `position:absolute;inset:0;background:${cc};transform:rotate(30deg) skewX(-30deg) scaleY(.864);transform-origin:50% 0;top:-50%;filter:brightness(1.15)`, null, cube);
        E("div", `position:absolute;left:0;width:50%;top:25%;height:75%;background:${cc};transform:skewY(30deg);filter:brightness(.85)`, null, cube);
        E("div", `position:absolute;right:0;width:50%;top:25%;height:75%;background:${cc};transform:skewY(-30deg);filter:brightness(.7)`, null, cube);
        pop(cube, s + 300 + j * 300, "translateY(-30px)"); });
      const sv = S(`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%"><path d="M24 ${port ? 64 : 70} L50 ${port ? 52 : 58} L76 ${port ? 64 : 70}" fill="none" stroke="${p[1]}" stroke-width="1.4" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/></svg>`, ct); draw(sv.querySelector("path"), s + 1300, 900, 120);
      const tt = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:${port ? 8 : 4}%`, null, ct); title(tt, c.judul, s, {fs:6 * u}); accent(tt, s, e); return; }
    if (L === "scene"){
      const cosmic = v.bg === "cosmic", sil = v.bg === "sunset";
      const layers = cosmic ? [] : [[p[3], 62, "M0 60 Q 20 40 40 52 T 80 46 T 100 52 V100 H0Z", 2], [p[2], 72, "M0 70 Q 25 56 50 66 T 100 62 V100 H0Z", 4], [sil ? p[1] : p[4], 84, "M0 82 Q 30 72 55 80 T 100 78 V100 H0Z", 7]];
      if (cosmic){ const pl = E("div", `position:absolute;left:50%;top:52%;width:${port ? 46 : 30}%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,${p[3]},${p[2]} 55%,${p[0]})`, null, ct);
        const ring = E("div", `position:absolute;left:-30%;right:-30%;top:42%;height:16%;border:${.8 * u}px solid ${p[3]}aa;border-radius:50%;transform:rotate(-14deg)`, null, pl); K(pl, [[s, {transform:"translate(-50%,-50%) rotate(0deg) scale(.9)"}, LN], [e, {transform:"translate(-50%,-50%) rotate(12deg) scale(1.05)"}]]); }
      layers.forEach(([cc, y, d0, sp]) => { const ly = S(`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%"><path d="${d0}" fill="${cc}" opacity="${sil ? 1 : .95}"/></svg>`, ct, `left:-10%;right:-10%;width:120%`);
        K(ly, [[s, {transform:`translateX(${sp * .6}%)`}, LN], [e, {transform:`translateX(${-sp * .6}%)`}]]); });
      if (!cosmic){ const tr = E("div", `position:absolute;left:${port ? 64 : 72}%;bottom:16%;width:${port ? 14 : 8}%;height:${port ? 18 : 26}%`, null, ct);
        E("div", `position:absolute;left:44%;width:12%;bottom:0;height:40%;background:${sil ? p[1] : "#5b3a1f"}`, null, tr); E("div", `position:absolute;left:0;right:0;top:0;height:72%;border-radius:50% 50% 45% 45%;background:${sil ? p[1] : p[3]}`, null, tr); pop(tr, s + 300, "translateY(20px) scale(.8)"); }
      const tt = E("div", `position:absolute;left:${3 * u}px;right:${3 * u}px;top:${port ? 10 : 8}%;text-align:${port ? "center" : "left"}`, null, ct); title(tt, c.judul, s, {color:sil || cosmic ? p[1] : p[1]}); accent(tt, s, e); return; }
    title(flex("align-items:center;justify-content:center"), c.judul, s);
  }
  // ---------------------------------------------------- aksen
  function accent(target, s, e){
    const a = v.acc, t0 = s + 1200; if (a === "none" || a === "check" && v.lay === "steps" || (a === "stars" && (v.lay === "cards"))) return;
    if (a === "count" && v.lay === "icons") return;
    const tt = target.querySelector && target.querySelector("[data-ttl]"); if (tt && (a === "circle" || a === "under" || a === "arrow" || a === "badge" || a === "count" || a === "stars" || a === "glow")) target = tt;
    target.style.position = target.style.position || "relative";
    const box = E("div", "position:absolute;inset:0;pointer-events:none;overflow:visible", null, target);
    if (a === "circle" || a === "under" || a === "arrow"){ const sv = S(`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible">${a === "circle" ? `<path d="M50 -6 C 92 -6 108 30 104 56 C 100 92 60 108 30 102 C 0 96 -10 60 -4 34 C 2 8 30 -4 56 -2" fill="none" stroke="${p[2]}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`
        : a === "under" ? `<path d="M0 104 Q 25 98 50 104 T 100 102" fill="none" stroke="${p[2]}" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linecap="round"/>` : `<path d="M110 130 Q 104 112 96 100" fill="none" stroke="${p[2]}" stroke-width="2.6" vector-effect="non-scaling-stroke" stroke-linecap="round"/><path d="M90 104 L96 100 L98 108" fill="none" stroke="${p[2]}" stroke-width="2.6" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`}</svg>`, box);
      sv.querySelectorAll("path").forEach((pp, j) => draw(pp, t0 + j * 500, a === "circle" ? 700 : 500, 400)); return; }
    const corner = (w, css, html) => { const x = E("div", `position:absolute;right:${-2 * u}px;top:${-4 * u}px;width:${w}px;height:${w}px;display:flex;align-items:center;justify-content:center;${css}`, html, box); return x; };
    if (a === "badge"){ const b = corner(13 * u, `border-radius:50%;background:${p[2]};color:${p[4] === p[2] ? "#fff" : p[4]};font:800 ${2.8 * u}px Inter;text-align:center;line-height:1;box-shadow:0 ${.4 * u}px ${1.6 * u}px rgba(0,0,0,.25)`, esc(BADGE[P.kat] || "★")); K(b, [[t0, {transform:"scale(0) rotate(-40deg)"}, BK], [t0 + 450, {transform:"scale(1) rotate(-12deg)"}]]); return; }
    if (a === "stamp"){ const b = corner(16 * u, `border:${.6 * u}px solid ${p[2]};color:${p[2]};font:800 ${3.2 * u}px "IBM Plex Mono",monospace;border-radius:${u}px;height:${7 * u}px;width:auto;padding:0 ${1.4 * u}px`, "ARSIP"); K(b, [[t0, {opacity:0, transform:"scale(2.4) rotate(-20deg)"}, "cubic-bezier(.6,0,.9,.3)"], [t0 + 220, {opacity:1, transform:"scale(1) rotate(-12deg)"}]]); return; }
    if (a === "icon"){ const b = corner(10 * u, `border-radius:${2.4 * u}px;background:${p[3]};color:#fff;font:700 ${5 * u}px Inter`, "✦"); K(b, [[t0, {transform:"scale(0)"}, BK], [t0 + 400, {transform:"scale(1)"}]]); return; }
    if (a === "stars"){ const b = E("div", `position:absolute;left:0;bottom:${-6 * u}px;font-size:${4 * u}px;color:${p[2]};letter-spacing:.12em;white-space:nowrap`, "★★★★★".split("").map(x => `<span style="display:inline-block">${x}</span>`).join(""), box);
      b.querySelectorAll("span").forEach((sp, j) => K(sp, [[t0 + j * 120, {transform:"scale(0)"}, BK], [t0 + j * 120 + 300, {transform:"scale(1)"}]])); return; }
    if (a === "glow" || a === "medal"){ const g = E("div", `position:absolute;left:50%;top:50%;width:${(a === "medal" ? 30 : 46) * u}px;height:${(a === "medal" ? 30 : 46) * u}px;margin:${-(a === "medal" ? 15 : 23) * u}px;z-index:-1;border-radius:50%;background:radial-gradient(circle,${p[2]}${a === "medal" ? "" : "66"} 0 ${a === "medal" ? 28 : 0}%,${a === "medal" ? "#e8c266" : p[2] + "33"} ${a === "medal" ? 30 : 30}%,transparent 68%)`, null, box);
      if (a === "medal"){ g.style.cssText += ";left:auto;right:0;top:-10%;margin:0"; const rays = E("div", `position:absolute;inset:-30%;background:repeating-conic-gradient(#f3d27a55 0 6deg,transparent 6deg 15deg);border-radius:50%;-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)`, null, g); K(rays, [[s, {transform:"rotate(0deg)"}, LN], [e, {transform:"rotate(60deg)"}]]); }
      K(g, [[t0 - 600, {opacity:0, transform:"scale(.6)"}, EO], [t0, {opacity:1, transform:"scale(1)"}, IO], [t0 + 1400, {opacity:.75, transform:"scale(1.08)"}, IO], [t0 + 2800, {opacity:1, transform:"scale(1)"}]]); return; }
    if (a === "count"){ const b = E("div", `position:absolute;right:0;bottom:${-9 * u}px;display:flex;font:800 ${7 * u}px/1 ${"\"" + F1 + "\""};color:${p[2]};height:${7 * u}px;overflow:hidden`, null, box);
      [1, 2, 8].forEach((dg, j) => { const col = E("div", "display:flex;flex-direction:column", Array.from({length:10}, (_, q) => `<span style="height:${7 * u}px">${q}</span>`).join(""), b); K(col, [[t0 + j * 100, {transform:"translateY(0px)"}, EO], [t0 + 1400 + j * 200, {transform:`translateY(${-dg * 7 * u}px)`}]]); });
      E("div", `padding-left:${.4 * u}px`, "%", b); return; }
    if (a === "ring"){ const sv = corner(12 * u, "", `<svg viewBox="0 0 36 36" width="100%" height="100%"><circle cx="18" cy="18" r="15" fill="none" stroke="${p[1]}" stroke-opacity=".15" stroke-width="4"/><circle cx="18" cy="18" r="15" fill="none" stroke="${p[2]}" stroke-width="4" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg>`);
      const c2 = sv.querySelectorAll("circle")[1]; c2.style.strokeDasharray = 95; K(c2, [[t0, {strokeDashoffset:95}, EO], [t0 + 1600, {strokeDashoffset:24}]]); return; }
    if (a === "check"){ const sv = corner(11 * u, `border-radius:50%;background:${p[2]}`, `<svg viewBox="0 0 24 24" width="60%"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`); K(sv, [[t0, {transform:"scale(0)"}, BK], [t0 + 380, {transform:"scale(1)"}]]); draw(sv.querySelector("path"), t0 + 250, 400, 30); return; }
    if (a === "tape" || a === "pin"){ const b = E("div", `position:absolute;left:30%;top:${-2 * u}px;width:30%;height:${3.6 * u}px;background:${a === "pin" ? p[2] : "rgba(255,240,200,.8)"};transform:rotate(-4deg);${a === "pin" ? `width:${3 * u}px;border-radius:50%;height:${3 * u}px` : ""}`, null, box); pop(b, t0, "scale(0)"); return; }
    if (a === "wave"){ const wv = E("div", `position:absolute;left:0;bottom:${-8 * u}px;width:${30 * u}px;height:${5 * u}px;display:flex;gap:2px;align-items:center`, null, box);
      for (let q = 0; q < 16; q++){ const br = E("div", `flex:1;height:100%;background:${p[2]};border-radius:2px`, null, wv); const ks = []; for (let t = 0; t <= T; t += 160) ks.push([t, {transform:`scaleY(${.15 + ((q * 7 + t / 160 * 5) % 10) / 12})`}]); K(br, ks); } return; }
  }
  // ---------------------------------------------------- subtitle
  function caption(text, s, e, i){
    const c = v.cap; if (c === "none") return;
    const port = v.ar !== "16:9", words = text.split(" "), t0 = s + 450, span = Math.max(600, (e - s) - 1100), per = span / words.length;
    const pos = (c === "slam") ? `left:6%;right:6%;top:${port ? 62 : 58}%;text-align:center` : `left:6%;right:6%;bottom:${port ? 12 : 7}%;text-align:center`;
    const bx = E("div", `position:absolute;${pos};z-index:80;pointer-events:none`, null, st);
    const fs = (port ? 4.6 : 4) * u;
    const sty = {clean:`font:600 ${fs}px Inter,sans-serif;color:#fff;background:rgba(0,0,0,.55);padding:${.6 * u}px ${1.4 * u}px;border-radius:${u}px`, pill:`font:800 ${fs * 1.08}px Montserrat,Inter,sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 2px 6px rgba(0,0,0,.6)`,
      word:`font:700 ${fs}px "${F2}",sans-serif;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.65)`, slam:`font:900 ${fs * 1.7}px "${F1}",sans-serif;color:#fff;text-transform:uppercase;-webkit-text-stroke:${.25 * u}px #000;paint-order:stroke`,
      box:`font:700 ${fs}px Inter,sans-serif;color:#111;background:#fff;padding:${.5 * u}px ${1.2 * u}px;border-radius:${.8 * u}px;box-decoration-break:clone;-webkit-box-decoration-break:clone;line-height:1.5`,
      serif:`font:italic 500 ${fs * 1.05}px "Lora","${F2}",serif;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7)`, neon:`font:700 ${fs}px "${F1}",sans-serif;color:#fff;text-shadow:0 0 ${.6 * u}px #fff,0 0 ${2 * u}px ${p[2]},0 0 ${4 * u}px ${p[2]}`,
      bar:`font:600 ${fs}px Inter,sans-serif;color:#fff;background:${p[2]};padding:${.8 * u}px ${2 * u}px;display:inline-block`, mono:`font:500 ${fs}px "IBM Plex Mono",monospace;color:#fff;background:rgba(0,0,0,.7);padding:${.5 * u}px ${1.2 * u}px`,
      outline:`font:900 ${fs * 1.15}px Montserrat,Inter,sans-serif;color:#fff;-webkit-text-stroke:${.3 * u}px #000;paint-order:stroke;text-transform:uppercase`}[c] || "";
    const ln = E("span", sty, null, bx);
    if (c === "pill" || c === "word" || c === "slam" || c === "outline"){ ln.innerHTML = words.map(w => `<span class="cw" style="display:inline-block;white-space:pre;padding:0 .12em;border-radius:${.8 * u}px">${esc(w)} </span>`).join("");
      ln.querySelectorAll(".cw").forEach((w, j) => { const a = t0 + j * per, b = a + per;
        if (c === "pill") K(w, [[a, {backgroundColor:"rgba(0,0,0,0)", color:"#fff"}, "steps(1)"], [a + 1, {backgroundColor:p[2], color:"#111"}, "steps(1)"], [b, {backgroundColor:"rgba(0,0,0,0)", color:"#fff"}]]);
        else if (c === "word") K(w, [[a, {color:"#fff"}, EO], [a + 150, {color:p[2]}]]);
        else if (c === "slam"){ w.style.position = "absolute"; w.style.left = "0"; w.style.right = "0"; K(w, [[a, {opacity:0, transform:"scale(1.6)"}, EO], [a + 140, {opacity:1, transform:"scale(1)"}, "steps(1)"], [b, {opacity:0, transform:"scale(1)"}]]); }
        else K(w, [[a, {opacity:0, transform:"translateY(30%)"}, BK], [a + 200, {opacity:1, transform:"translateY(0%)"}]]); });
      if (c === "slam") ln.style.cssText += `;position:relative;display:block;height:${fs * 2}px`; }
    else if (c === "mono"){ ln.textContent = text; K(ln, [[t0, {clipPath:"inset(0% 100% 0% 0%)"}, `steps(${text.length})`], [t0 + text.length * 45, {clipPath:"inset(0% 0% 0% 0%)"}]]); }
    else { ln.textContent = text; if (c === "bar") ln.style.transformOrigin = "0 50%"; }
    K(bx, [[t0 - 1, {opacity:0, transform:c === "bar" ? "translateX(-30px)" : "translateY(8px)"}, EO], [t0 + 250, {opacity:1, transform:"translate(0px,0px)"}], [e - 120, {opacity:1, transform:"translate(0px,0px)"}, EO], [e, {opacity:0, transform:"translate(0px,0px)"}]]);
  }
  // ---------------------------------------------------- kamera
  function camera(cam, bg, ct, c, s, e){
    const L = IO;
    if (c === "push") K(cam, [[s, {transform:tf(0, 0, 1)}, L], [e, {transform:tf(0, 0, 1.12)}]]);
    else if (c === "pull") K(cam, [[s, {transform:tf(0, 0, 1.2)}, L], [e, {transform:tf(0, 0, 1)}]]);
    else if (c === "pan") K(cam, [[s, {transform:tf(3.5, 0, 1.05)}, L], [e, {transform:tf(-3.5, 0, 1.05)}]]);
    else if (c === "kb") K(cam, [[s, {transform:tf(2, 1.2, 1.04)}, LN], [e, {transform:tf(-2, -1, 1.18)}]]);
    else if (c === "shake"){ const ks = []; for (let t = s; t <= e; t += 110){ const q = Math.round(t / 110); ks.push([t, {transform:tf(((q * 37) % 7 - 3) * .18, ((q * 53) % 7 - 3) * .18, 1.04, ((q * 17) % 5 - 2) * .2)}, IO]); } K(cam, ks); }
    else if (c === "drift"){ K(bg, [[s, {transform:tf(2, 0, 1.06)}, LN], [e, {transform:tf(-2, 0, 1.06)}]]); K(ct, [[s, {transform:tf(3.2, 0, 1)}, LN], [e, {transform:tf(-3.2, 0, 1)}]]); }
    else if (c === "tilt") K(cam, [[s, {transform:"perspective(900px) rotateY(-9deg) rotateX(5deg) scale(1.04)"}, L], [e, {transform:"perspective(900px) rotateY(8deg) rotateX(-3deg) scale(1.04)"}]]);
    else if (c === "dolly"){ K(bg, [[s, {transform:tf(0, 0, 1)}, L], [e, {transform:tf(0, 0, 1.28)}]]); K(ct, [[s, {transform:tf(0, 0, 1.04)}, L], [e, {transform:tf(0, 0, .94)}]]); }
    else if (c === "orbit"){ K(ct, [[s, {transform:"perspective(900px) rotateY(-16deg)"}, L], [e, {transform:"perspective(900px) rotateY(16deg)"}]]); K(bg, [[s, {transform:tf(3, 0, 1.08)}, L], [e, {transform:tf(-3, 0, 1.08)}]]); }
  }
  function run(){
  TR = trans(v.tr);
  for (let i = 0; i < n; i++){
    const s = i * d, e = s + d, c = ex[i % ex.length];
    const sh = E("div", `position:absolute;inset:0;z-index:${i + 1};transform-origin:${v.tr === "page" ? "0% 50%" : "50% 50%"};will-change:transform,opacity`, null, st);
    const cam = E("div", "position:absolute;inset:-7%;transform-origin:50% 50%", null, sh);
    const bg = E("div", "position:absolute;inset:0", null, cam); look(bg, v.bg);
    const ct = E("div", `position:absolute;inset:${v.cam === "still" ? 9 : 13}%`, null, cam);
    layout(ct, v.lay, c, i, s, e); camera(cam, bg, ct, v.cam, s, Math.min(T, e + TR.d));
    shotKeys(sh, i, s, e); shots.push(sh);
    caption(c.cap, s, e, i);
  }
  overlays();
  }
  run();
  const api = {W, H, anims:A, seek(ms){ A.forEach(a => { a.currentTime = ms % T; }); }, play(){ A.forEach(a => a.play()); }, pause(){ A.forEach(a => a.pause()); }};
  return api;
}
window.PaketPreview = {build, T, SIZE};
})();
