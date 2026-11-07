/* paket-scenes-t.js — trend styles: PIXEL ART (arcade / cozy) and ORIGAMI (crane / reveal).
   Pixel art is drawn on a low-res offscreen canvas (1 art pixel = 4 screen px) and upscaled without smoothing,
   with a limited palette and stepped (8–12 fps) motion. Origami uses a real fold: points on one side of a
   crease rotate around it in 3D (orthographic + slight perspective); paper front/back colour and light follow the angle. */
(function () {
  const PS = window.PaketScenes, X = PS.X;

  /* ============================ PIXEL ART ============================ */
  function lowres(S, k) {
    const w = Math.round(S.W / k), h = Math.round(S.H / k);
    if (!S._px || S._px.width !== w) { S._px = document.createElement("canvas"); S._px.width = w; S._px.height = h; }
    const g = S._px.getContext("2d"); g.imageSmoothingEnabled = false; return [g, w, h];
  }
  function blit(c, S) { c.save(); c.imageSmoothingEnabled = false; c.drawImage(S._px, 0, 0, S.W, S.H); c.restore(); }
  // sprite: array of strings, chars map to colours ('.' = transparent)
  function spr(g, rows, x, y, map, flip, k = 1) {
    for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = 0; i < r.length; i++) { const ch = r[flip ? r.length - 1 - i : i]; if (ch === "." || !map[ch]) continue; g.fillStyle = map[ch]; g.fillRect(x + i * k, y + j * k, k, k); } }
  }
  // crisp pixel text on the MAIN canvas (font pixel grid = 2 screen px per art px at size 16)
  const TQ = [];
  function qtext(s, x, y, col, size, align, fam, shadow) { TQ.push([s, x, y, col, size, align, fam, shadow]); }
  function flushText(c) { TQ.splice(0).forEach(([s, x, y, col, size, align, fam, shadow]) => { c.save(); c.font = `${size}px "${fam}", monospace`; c.textBaseline = "top"; c.textAlign = align || "left"; if (shadow) { c.fillStyle = shadow; c.fillText(s, x + size / 8 * 2, y + size / 8 * 2); } c.fillStyle = col; c.fillText(s, x, y); c.restore(); }); }
  function ptext(g, s, x, y, col, size = 8, align = "left", fam = "Press Start 2P", shadow) {
    g.font = `${size}px "${fam}", monospace`; g.textBaseline = "top"; g.textAlign = align;
    if (shadow) { g.fillStyle = shadow; g.fillText(s, Math.round(x) + 1, Math.round(y) + 1); }
    g.fillStyle = col; g.fillText(s, Math.round(x), Math.round(y));
  }
  const HERO = [
    ["...hhh..", "..hhhhh.", "..sskks.", "..sssss.", "...cc...", "..cccc..", ".s.cc.s.", "..bb.bb.", ".bb...bb"],
    ["...hhh..", "..hhhhh.", "..sskks.", "..sssss.", "...cc...", "..ccccs.", ".s.cc...", "...bb...", "..bb.b.."],
  ];
  const COIN = [[".yy.", "yYYy", "yYYy", "yYYy", "yYYy", ".yy."], [".y.", "yYy", "yYy", "yYy", "yYy", ".y."], ["y", "Y", "Y", "Y", "Y", "y"]];
  const HEART = [".r.r.", "rrrrr", "rrrrr", ".rrr.", "..r.."];
  const CAT = [["k...k...", "kk.kk...", "kkkkk...", "kwkwk..k", "kkkkk.k.", ".kkkkkk.", ".k.k.k.k"], ["k...k...", "kk.kk...", "kkkkk..k", "kwkwk.k.", "kkkkkk..", ".kkkkkk.", ".k.k.k.k"]];

  PS.def("pixel", (c, t, S) => (S.v === "cozy" ? cozy(c, t, S) : arcade(c, t, S)));

  function arcade(c, t, S) {
    const [g, w, h] = lowres(S, 4), p = S.pal, T = X.stepT(t, 10);
    const sky = p[0], dark = X.shade(p[0], -.35), mid = X.mix(p[0], p[3], .35), far = X.mix(p[0], p[2], .22);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // dithered horizon glow band
    for (let y = 24; y < Math.round(h * .58); y++) for (let x = (y % 2); x < w; x += 2) if (X.hash(x * 7 + y) < (y - 30) / 46) { g.fillStyle = far; g.fillRect(x, y, 1, 1); }
    // stars twinkle (stepped)
    for (let i = 0; i < 40; i++) { const x = (X.hash(i) * w) | 0, y = (X.hash(i + 40) * 34) | 0; if (X.hash(i + Math.floor(T * 3)) > .25) { g.fillStyle = i % 5 ? p[1] : p[4]; g.fillRect(x, y, 1, 1); } }
    // big pixel moon
    g.fillStyle = p[4]; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) g.fillRect(128 * w / 160 + x, 16 + y, 1, 1);
    g.fillStyle = sky; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if ((x - 3) * (x - 3) + (y + 1) * (y + 1) <= 22) g.fillRect(128 * w / 160 + x, 16 + y, 1, 1);
    // far skyline (parallax 1)
    const o1 = Math.floor(T * 6);
    const hz = Math.round(h * .58); for (let x = 0; x < w; x++) { const k = Math.floor((x + o1) / 7), bh = 8 + ((X.hash(k) * 14) | 0); g.fillStyle = mid; g.fillRect(x, hz - bh, 1, bh); if ((x + o1) % 7 === 3 && X.hash(k * 3) > .4) { g.fillStyle = p[4]; g.fillRect(x, hz - bh + 3, 1, 1); if (X.hash(k + Math.floor(T)) > .5) g.fillRect(x, hz - bh + 6, 1, 1); } }
    // near hills (parallax 2)
    const o2 = Math.floor(T * 14);
    for (let x = 0; x < w; x++) { const hh = 6 + Math.round(4 * Math.sin((x + o2) / 9) + 2 * Math.sin((x + o2) / 4)); g.fillStyle = dark; g.fillRect(x, Math.round(h * .64) - hh, 1, hh); }
    // ground tiles scrolling
    const gy = Math.round(h * .64), o3 = Math.floor(T * 30);
    g.fillStyle = p[2]; g.fillRect(0, gy, w, h - gy);
    g.fillStyle = X.shade(p[2], -.35); for (let y = gy; y < h; y += 4) for (let x = -8; x < w + 8; x += 8) { const xx = x - (o3 % 8) + ((y - gy) / 4 % 2 ? 4 : 0); g.fillRect(xx, y, 1, 4); g.fillRect(xx, y + 3, 8, 1); }
    g.fillStyle = p[3]; g.fillRect(0, gy, w, 1); g.fillStyle = X.shade(p[3], .4); for (let x = -(o3 % 3); x < w; x += 3) g.fillRect(x, gy, 1, 1);
    // coins along the path (scroll with ground); hero jumps on beat to grab them
    const beat = 1.6, ph = (t % beat) / beat, jumping = ph > .55;
    const jy = jumping ? Math.round(Math.sin((ph - .55) / .45 * Math.PI) * 14) : 0;
    const hx = 30, hy = gy - 18 - jy;
    let score = 0;
    for (let i = -1; i < 8; i++) {
      const cx = Math.round(i * 48 - (T * 30) % 48) + hx + 48 + 4, cy = gy - 34;
      const n = Math.floor(t / beat) + i + 1;
      const taken = cx < hx + 10;
      const cf = COIN[Math.floor(T * 8 + i) % 3];
      if (!taken) spr(g, cf, cx + (4 - cf[0].length), cy, { y: X.shade(p[4], -.3), Y: p[4] }, false, 2);
      else if (cx > hx - 16) { qtext("+100", (cx - 2) * 4, (cy - 8 - (hx + 10 - cx) / 2) * 4, p[4], 16, "left", "Press Start 2P", dark); }
      score = Math.max(score, n);
    }
    const map = { h: p[2], s: "#f5c9a0", k: dark, c: p[3], b: X.shade(p[3], -.4) };
    spr(g, HERO[jumping ? 1 : Math.floor(T * 8) % 2], hx, hy, map, false, 2);
    if (jumping) { g.fillStyle = X.a(p[1], .0); }
    // dust puffs when landing
    if (ph < .14) { g.fillStyle = X.mix(p[1], p[0], .3); g.fillRect(hx - 2 - Math.round(ph * 40), gy - 2, 2, 2); g.fillRect(hx + 16 + Math.round(ph * 40), gy - 2, 2, 2); }
    // HUD
    qtext("SCORE " + String(score * 100).padStart(6, "0"), 16, 16, p[1], 16, "left", "Press Start 2P", dark);
    for (let i = 0; i < 3; i++) spr(g, HEART, w - 22 + i * 6, 4, { r: p[2] });
    // dialog box (RPG style) with typed line, every beat of 2s
    const k = Math.floor(t / 2) % 4, lp = (t % 2) / 2, ln = S.lines[k];
    const bx = 6, by = h - 24, bw = w - 12;
    g.fillStyle = dark; g.fillRect(bx, by, bw, 20); g.fillStyle = p[1]; g.fillRect(bx, by, bw, 1); g.fillRect(bx, by + 19, bw, 1); g.fillRect(bx, by, 1, 20); g.fillRect(bx + bw - 1, by, 1, 20);
    let s = ln.j.toUpperCase(); const maxCh = Math.floor((bw - 8) * 4 / 16); if (s.length > maxCh) s = s.slice(0, maxCh - 1) + "…";
    qtext(X.typed(s, lp * 2.2), (bx + 4) * 4, (by + 6) * 4, p[1], 16, "left", "Press Start 2P");
    if (lp > .6 && Math.floor(T * 4) % 2) { g.fillStyle = p[4]; g.fillRect(bx + bw - 7, by + 13, 3, 2); g.fillRect(bx + bw - 6, by + 15, 1, 1); }
    // LEVEL banner at loop start
    const lv = X.win(t, .2, 1.8, .2, .3);
    if (lv > 0) { const yy = Math.round(28 - (1 - X.ease.out(X.seg(t, .2, .5))) * 30); g.fillStyle = p[2]; g.fillRect(w / 2 - 34, yy - 3, 68, 14); qtext("LEVEL 1-1", w / 2 * 4, yy * 4 + 4, p[1], 16, "center", "Press Start 2P", dark); }
    blit(c, S); flushText(c);
    // CRT scanlines + slight bloom vignette on the main canvas (kept crisp)
    c.fillStyle = "rgba(0,0,0,.14)"; for (let y = 0; y < S.H; y += 4) c.fillRect(0, y + 3, S.W, 1);
    X.vignette(c, S.W, S.H, .35);
  }

  function cozy(c, t, S) {
    const [g, w, h] = lowres(S, 4), p = S.pal, T = X.stepT(t, 8);
    // day → dusk → night cycle in 3 steps (limited palette swaps)
    const phase = Math.floor(t / (8 / 3)) % 3;
    const skies = [[X.mix(p[4], "#ffffff", .35), X.mix(p[4], "#ffffff", .6)], [p[2], X.mix(p[2], p[0], .45)], [p[0], X.shade(p[0], .12)]];
    const wall = X.mix(p[0], p[1], .18), wallD = X.mix(p[0], p[1], .1), floor = X.mix(p[2], p[0], .55);
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h * .62; y += 6) for (let x = (y / 6 % 2) * 3; x < w; x += 6) { g.fillStyle = wallD; g.fillRect(x, y, 1, 1); }  // wallpaper dots
    // window
    const wx = 14, wy = 16, ww = w - 28, wh = 46;
    g.fillStyle = skies[phase][0]; g.fillRect(wx, wy, ww, wh / 2); g.fillStyle = skies[phase][1]; g.fillRect(wx, wy + wh / 2, ww, wh / 2);
    for (let y = wy + wh / 2 - 2; y < wy + wh / 2 + 2; y++) for (let x = wx + (y % 2); x < wx + ww; x += 2) { g.fillStyle = skies[phase][1]; g.fillRect(x, y, 1, 1); }
    if (phase < 2) { g.fillStyle = p[4 - phase * 2] || p[4]; const sx = wx + 12 + phase * 30, sy = wy + 10 + phase * 14; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16) { g.fillStyle = phase ? p[2] : "#fff6c8"; g.fillRect(sx + x, sy + y, 1, 1); } }
    else { for (let i = 0; i < 14; i++) if (X.hash(i + Math.floor(T * 2)) > .3) { g.fillStyle = p[1]; g.fillRect(wx + 2 + (X.hash(i * 3) * (ww - 4) | 0), wy + 2 + (X.hash(i * 5) * 20 | 0), 1, 1); } g.fillStyle = p[1]; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9 && (x - 1) * (x - 1) + (y + 1) * (y + 1) > 5) g.fillRect(wx + ww - 12 + x, wy + 9 + y, 1, 1); }
    // distant roofs in window
    g.fillStyle = X.shade(p[3], phase === 2 ? -.6 : -.2); for (let x = wx; x < wx + ww; x++) { const r = 6 + Math.round(3 * Math.abs(((x * .6) % 8) - 4)); g.fillRect(x, wy + wh - r, 1, r); }
    if (phase === 2) for (let i = 0; i < 6; i++) { g.fillStyle = p[4]; g.fillRect(wx + 4 + i * 11, wy + wh - 4, 1, 1); }
    // rain at dusk/night
    if (phase > 0) { g.fillStyle = X.a(p[1], .7); for (let i = 0; i < 22; i++) { const x = wx + (X.hash(i) * ww | 0), y = wy + ((X.hash(i + 9) * wh + T * 60) % wh | 0); g.fillRect(x, y, 1, 2); } }
    // frame + cross bars
    g.fillStyle = X.shade(p[3], -.45); g.fillRect(wx - 2, wy - 2, ww + 4, 2); g.fillRect(wx - 2, wy + wh, ww + 4, 3); g.fillRect(wx - 2, wy, 2, wh); g.fillRect(wx + ww, wy, 2, wh); g.fillRect(wx + ww / 2 - 1, wy, 2, wh); g.fillRect(wx, wy + wh / 2 - 1, ww, 1);
    // floor + desk
    const fy = Math.round(h * .62); g.fillStyle = floor; g.fillRect(0, fy, w, h - fy);
    g.fillStyle = X.shade(floor, -.2); for (let x = 0; x < w; x += 9) g.fillRect(x, fy, 1, h - fy);
    const dy = fy - 6; g.fillStyle = X.shade(p[2], -.25); g.fillRect(8, dy, w - 16, 4); g.fillRect(12, dy + 4, 3, 26); g.fillRect(w - 15, dy + 4, 3, 26);
    // lamp + dithered warm light cone (stronger at night)
    const lx = w - 22; g.fillStyle = p[3]; g.fillRect(lx, dy - 16, 2, 16); g.fillRect(lx - 5, dy - 20, 12, 5); g.fillRect(lx - 3, dy - 1, 8, 1);
    const lightA = phase === 2 ? .55 : phase === 1 ? .3 : .12;
    for (let y = dy - 15; y < dy; y++) for (let x = lx - 12; x < lx + 14; x++) { const d = Math.abs(x - lx - 1) / (y - dy + 18); if (d < 1 && X.hash(x * 13 + y * 7) < lightA * (1 - d)) { g.fillStyle = p[4]; g.fillRect(x, y, 1, 1); } }
    // plant
    g.fillStyle = X.shade(p[2], -.45); g.fillRect(14, dy - 7, 7, 7); g.fillStyle = p[3];
    const sway = Math.floor(T * 2) % 2; [[16, -14], [13, -11], [19, -12], [17, -17]].forEach(([x, y], i) => g.fillRect(x + (i % 2 ? sway : 0), dy + y, 2, 5));
    // mug with stepped steam
    g.fillStyle = p[1]; g.fillRect(30, dy - 5, 5, 5); g.fillRect(35, dy - 4, 1, 2);
    for (let i = 0; i < 3; i++) { const sy = dy - 8 - ((Math.floor(T * 4) + i * 2) % 6); g.fillStyle = X.a(p[1], .6); g.fillRect(31 + ((sy + i) % 2), sy, 1, 1); }
    // cat on the desk, tail flick
    spr(g, CAT[Math.floor(T * 2) % 2], 40, dy - 14, { k: X.shade(p[0], -.2), w: p[4] }, false, 2);
    // rug pattern
    const ry = fy + 16; g.fillStyle = p[2]; g.fillRect(12, ry, w - 24, 8); g.fillStyle = p[4]; for (let x = 14; x < w - 14; x += 4) g.fillRect(x, ry + 3, 2, 2);
    // dialog box
    const k = Math.floor(t / 2) % 4, lp = (t % 2) / 2, ln = S.lines[k];
    const bx = 4, by = h - 26, bw = w - 8;
    g.fillStyle = X.shade(p[0], -.2); g.fillRect(bx, by, bw, 23); g.fillStyle = p[1]; g.fillRect(bx + 1, by + 1, bw - 2, 1); g.fillRect(bx + 1, by + 21, bw - 2, 1); g.fillRect(bx + 1, by + 1, 1, 21); g.fillRect(bx + bw - 2, by + 1, 1, 21);
    c.font = '30px "Pixelify Sans", monospace'; const words = X.wrap(c, ln.j, (bw - 10) * 4).slice(0, 2);
    let rem = Math.round(ln.j.length * X.clamp(lp * 2));
    words.forEach((wd, i) => { const s = wd.slice(0, Math.max(0, rem)); rem -= wd.length + 1; qtext(s, (bx + 5) * 4, (by + 4) * 4 + i * 34, p[1], 30, "left", "Pixelify Sans"); });
    if (lp > .6 && Math.floor(T * 4) % 2) { g.fillStyle = p[4]; g.fillRect(bx + bw - 8, by + 17, 3, 2); }
    // clock in corner
    const hh = ["08:00", "17:30", "21:45"][phase]; qtext(hh, (w - 4) * 4, 14, p[1], 22, "right", "Pixelify Sans", X.shade(p[0], -.3));
    blit(c, S); flushText(c);
    X.vignette(c, S.W, S.H, .3);
  }

  /* ============================ ORIGAMI ============================ */
  // rotate pts on the left side of crease a→b by angle th (0 = flat open, PI = folded over). Returns projected pts + facing.
  function fold(pts, a, b, th, persp = 900) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    return pts.map(([x, y, z = 0]) => {
      const rx = x - a[0], ry = y - a[1], along = rx * ux + ry * uy, d = rx * nx + ry * ny;
      if (d <= 0.0001) return [x, y, z];
      const d2 = d * Math.cos(th), z2 = z + d * Math.sin(th);
      const X2 = a[0] + along * ux + d2 * nx, Y2 = a[1] + along * uy + d2 * ny;
      return [X2, Y2, z2];
    });
  }
  function proj(pts, cx, cy, f = 900) { return pts.map(([x, y, z = 0]) => { const s = f / (f - z); return [cx + (x - cx) * s, cy + (y - cy) * s]; }); }
  function face(c, pts, col) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = col; c.fill(); }
  const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  // paper light: front colour lit by angle, back colour slightly different
  const lit = (col, k) => X.shade(col, X.clamp(k, -1, 1) * .22);
  function paperBG(c, S, col, alt) {
    const { W, H } = S; c.fillStyle = X.lgrad(c, 0, 0, W, H, [[0, X.shade(col, .06)], [1, X.shade(col, -.06)]]); c.fillRect(0, 0, W, H);
    X.paper(c, W, H, "rgba(0,0,0,0)", .5);
    c.save(); c.globalAlpha = .05; c.strokeStyle = alt; c.lineWidth = 1; for (let i = -H; i < W; i += 46) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + H, H); c.stroke(); } c.restore();
  }
  function shadowOf(c, pts, k = .18, dy = 10, blur = 14) { c.save(); X.shadow(c, blur, dy, `rgba(0,0,0,${k})`); face(c, pts, "rgba(0,0,0,.001)"); c.fill(); c.restore(); }

  PS.def("origami", (c, t, S) => (S.v === "reveal" ? reveal(c, t, S) : crane(c, t, S)));

  // flying paper plane (2 wings fold around the keel)
  function plane(c, x, y, s, rot, flap, col, colB) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    const nose = [40, 0], tail = [-30, 0];
    const wingL = [[40, 0], [-30, 0], [-36, -26]], wingR = [[40, 0], [-30, 0], [-36, 26]];
    const fl = Math.sin(flap) * .5;
    const L2 = fold(wingL, tail, nose, Math.PI * .5 + fl).map((p) => [p[0], p[1]]);
    const R2 = fold(wingR.map(([a, b]) => [a, -b]), tail, nose, Math.PI * .5 + fl).map((p) => [p[0], -p[1]]);
    face(c, [[40, 0], [-30, 0], [-30, 6]], X.shade(colB, -.25));
    face(c, L2, lit(col, .4)); face(c, R2, lit(colB, -.25));
    c.restore();
  }

  function crane(c, t, S) {
    const { W, H, pal: p } = S, cx = W / 2, cy = H * .5, R = Math.min(W, H) * .3;
    paperBG(c, S, p[0], p[1]);
    // background planes gliding (parallax, secondary motion)
    for (let i = 0; i < 3; i++) {
      const k = ((t / 8 + i / 3) % 1), x = -80 + k * (W + 160), y = H * (.18 + i * .29) + Math.sin(t * 1.3 + i) * 10;
      c.globalAlpha = .5 + i * .12; plane(c, x, y, .45 + i * .12, Math.sin(t + i) * .08 - .05, t * 3 + i, i % 2 ? p[3] : p[4], X.shade(i % 2 ? p[3] : p[4], .3)); c.globalAlpha = 1;
    }
    const front = p[2], back = X.mix(p[2], "#ffffff", .55);
    // sheet as a diamond square
    const T = [cx, cy - R], B = [cx, cy + R], Lp = [cx - R, cy], Rp = [cx + R, cy];
    const s1 = X.E(t, .5, 1.8, "inOut"), s2 = X.E(t, 2.1, 3.3, "inOut"), s3 = X.E(t, 3.6, 4.3, "inOut");
    let shapes = [];
    if (t < 3.6) {
      // fold 1: top triangle down over bottom (crease L–R)
      const top = [T, Lp, Rp], bot = [Lp, B, Rp];
      const th1 = s1 * Math.PI;
      let topF = fold(top.map((q) => [q[0], q[1]]), Rp, Lp, th1);   // crease Rp→Lp: left normal points up
      // fold 2: fold the resulting triangle in half (crease vertical through centre)
      const th2 = s2 * Math.PI, ax = [cx, cy + R + 1], bx2 = [cx, cy - R - 1];
      const botP = fold(bot, ax, bx2, th2), topP = fold(topF, ax, bx2, th2);
      const pr1 = proj(botP, cx, cy), pr2 = proj(topP, cx, cy);
      const shade1 = Math.cos(th2), shade0 = Math.cos(th1);
      // split each poly into its two halves for correct colouring: simplified—draw base then flaps
      shadowOf(c, proj([Lp, B, Rp, ...(s1 < .5 ? [T] : [])], cx, cy), .16, 12, 18);
      // static right half of bottom
      face(c, [[cx, cy], [cx, cy + R], Rp], lit(front, -.1));
      // right half of top flap (folded by th1 only)
      const trF = fold([[cx, cy - R], [cx, cy], Rp], Rp, Lp, th1); const trP = proj(trF, cx, cy);
      if (th1 > 0) face(c, trP, th1 > Math.PI / 2 ? lit(back, shade0 * -1 - .2) : lit(front, shade0 * .5));
      else face(c, trP, lit(front, .1));
      // left half group (rotates with th2)
      const lb = proj(fold([[cx, cy], Lp, [cx, cy + R]], ax, bx2, th2), cx, cy);
      const lt = proj(fold(fold([[cx, cy - R], Lp, [cx, cy]], Rp, Lp, th1), ax, bx2, th2), cx, cy);
      const lbCol = th2 > Math.PI / 2 ? lit(back, -shade1 - .1) : lit(front, .15 * shade1);
      if (th2 > Math.PI / 2) { face(c, lt, th1 > Math.PI / 2 ? lit(front, .25) : lit(back, .1)); face(c, lb, lbCol); }
      else { face(c, lb, lbCol); face(c, lt, th1 > Math.PI / 2 ? lit(back, -shade0 - .1) : lit(front, shade0 * .4)); }
      // crease lines
      c.strokeStyle = X.a(p[1], .18); c.lineWidth = 1; c.beginPath(); c.moveTo(Lp[0], Lp[1]); c.lineTo(Rp[0], Rp[1]); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
      void pr1; void pr2; void shapes;
    }
    // crane: appears from the folded triangle (scale/rotate settle), then flaps and flies
    if (t >= 3.6) {
      const k = s3, fly = X.E(t, 6.4, 7.8, "in");
      const bob = Math.sin(t * 3) * 4 * (1 - fly);
      const ox = cx + fly * W * .65, oy = cy + bob - fly * H * .35, sc = R / 82 * (.6 + .4 * X.ease.back(k)) * (1 - fly * .35);
      c.save(); c.translate(ox, oy); c.scale(sc, sc); c.rotate(-.04 - fly * .25);
      c.globalAlpha = X.clamp(k * 1.5);
      const flap = Math.sin(t * (t > 5.2 ? 9 : 4)) * (.55 + fly * .3);
      // body pieces
      const body = [[-70, 10], [0, 30], [70, 10], [0, 0]];
      const neck = [[-10, 14], [-95, -55], [-88, -58], [-4, 4]], head = [[-95, -55], [-110, -38], [-88, -58]];
      const tail = [[10, 14], [100, -60], [6, 4]];
      shadowOf(c, body, .22, 26, 24);
      // far wing (behind)
      const wingB = fold([[-40, 6], [40, 6], [10, -80]].map((q) => [q[0], -q[1]]), [40, -6], [-40, -6], Math.PI * .5 + flap).map(([a, b, z]) => [a, -b, z]);
      face(c, proj(wingB, 0, 0, 500), lit(back, -.35));
      face(c, tail, lit(front, -.25)); face(c, [[10, 14], [100, -60], [40, 4]], lit(front, .05));
      face(c, body, lit(front, .1)); face(c, [[-70, 10], [0, 30], [0, 0]], lit(front, -.18));
      face(c, neck, lit(front, .2)); face(c, head, lit(front, -.3));
      const wingF = fold([[-40, 6], [40, 6], [-10, 90]], [-40, 6], [40, 6], Math.PI * .5 - flap);
      const wf = proj(wingF, 0, 0, 500), up = area(wf) > 0;
      face(c, wf, up ? lit(front, .35) : lit(back, -.05));
      c.strokeStyle = X.a(p[1], .15); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-40, 6); c.lineTo(40, 6); c.stroke();
      c.restore(); c.globalAlpha = 1;
    }
    // typography
    const k = t < 3.6 ? (t < 2 ? 0 : 1) : (t < 6.2 ? 2 : 3), ln = S.lines[k];
    const a0 = [0, 2, 3.6, 6.2][k], a1 = [2, 3.6, 6.2, 8][k], al = X.win(t, a0, a1, .5, .45);
    const fs = Math.min(W * .055, 34); c.save(); X.font(c, 700, fs, S.f1); let s = ln.j; while (c.measureText(s).width > W * .8 && s.length > 4) s = s.slice(0, -2); c.restore();
    X.text(c, s, W / 2, H * .88 + (1 - X.ease.out(X.seg(t, a0, a0 + .6))) * 14, { size: fs, fam: S.f1, color: p[1], alpha: al, w: 700 });
    X.text(c, ln.c, W / 2, H * .88 + fs * .95, { size: fs * .42, fam: S.f2, color: X.mix(p[1], p[0], .35), alpha: al * .9, w: 400 });
    // step badge
    X.text(c, `LIPATAN ${k + 1} / 4`, 22, 22, { size: 11, fam: S.f2, color: p[2], align: "left", w: 700, ls: 2 });
  }

  function reveal(c, t, S) {
    const { W, H, pal: p } = S;
    paperBG(c, S, p[0], p[1]);
    c.save(); c.globalAlpha = .14; X.paper(c, W, H, "rgba(0,0,0,0)", .6); c.restore();
    const cw = W * .62, ch = H * .56, x0 = (W - cw) / 2, y0 = H * .16;
    // beat 1 (0–2.6): accordion of 6 strips unfolds from the left edge
    const n = 6, sw = cw / n, op = X.E(t, .25, 2.2, "inOut") * (1 - X.E(t, 7.2, 7.9, "inOut"));
    const lightL = lit(p[1], .1), darkL = X.mix(p[1], p[2], .18);
    let x = x0;
    const cols = [];
    for (let i = 0; i < n; i++) {
      const th = (1 - op) * Math.PI * .5 * (i ? 1 : .98), w = sw * Math.cos(th), rise = sw * Math.sin(th) * .18;
      const facingL = i % 2 === 0, col = facingL ? lit(p[1], .12 - (1 - op) * .25) : lit(darkL, -(1 - op) * .45);
      const top = y0 - (facingL ? 0 : rise), bot = y0 + ch + (facingL ? 0 : rise);
      cols.push([x, w, col, facingL, top, bot]); x += w;
    }
    // shadow under strip
    c.save(); X.shadow(c, 26, 16, "rgba(0,0,0,.22)"); c.fillStyle = "rgba(0,0,0,.01)"; c.fillRect(x0, y0, x - x0, ch); c.restore();
    cols.forEach(([xx, w, col, fl, top, bot], i) => {
      c.beginPath();
      if (fl) { c.moveTo(xx, y0); c.lineTo(xx + w, top - (y0 - top)); c.lineTo(xx + w, bot); c.lineTo(xx, y0 + ch); }
      else { c.moveTo(xx, top); c.lineTo(xx + w, y0); c.lineTo(xx + w, y0 + ch); c.lineTo(xx, bot); }
      c.closePath(); c.fillStyle = col; c.fill();
      c.strokeStyle = X.a(p[0], .25); c.lineWidth = 1; c.stroke();
    });
    // content printed on the paper, clipped to opened width (it "unfolds" with the paper)
    const opened = x - x0;
    if (op > .02) {
      c.save(); c.beginPath(); c.rect(x0, y0 - 10, opened, ch + 20); c.clip();
      const sc = Math.max(.05, opened / cw);
      c.translate(x0, 0); c.scale(sc, 1); c.translate(-x0, 0);
      const k = t < 3.2 ? 0 : t < 5.4 ? 1 : 2, ln = S.lines[k];
      const fs = Math.min(cw * .085, 40);
      c.save(); X.font(c, 700, fs, S.f1); const rows = X.wrap(c, ln.j, cw * .82).slice(0, 2); c.restore();
      const swap = X.win(t, [0, 3.2, 5.4][k], [3.2, 5.4, 8][k], .4, .35);
      rows.forEach((r, i) => X.text(c, r, x0 + cw / 2, y0 + ch * .3 + (i - (rows.length - 1) / 2) * fs * 1.1 + (1 - swap) * 10, { size: fs, fam: S.f1, color: p[0], alpha: swap, w: 700 }));
      X.text(c, ln.c, x0 + cw / 2, y0 + ch * .3 + fs * (rows.length > 1 ? 1.7 : 1.15), { size: fs * .38, fam: S.f2, color: X.mix(p[0], p[1], .3), alpha: swap, w: 500 });
      // origami icon in the card: a little boat made of 3 triangles that "fold up" per beat
      const ip = X.E(t, [0, 3.2, 5.4][k] + .3, [0, 3.2, 5.4][k] + 1.1, "back"), bx = x0 + cw / 2, by = y0 + ch * .8;
      const ic = [p[2], p[3], p[4]][k];
      c.save(); c.translate(bx, by); c.scale(1, ip);
      face(c, [[-30, -2], [30, -2], [19, 12], [-19, 12]], lit(ic, -.15));
      face(c, [[-30, -2], [0, -2], [-5, -28]], lit(ic, .25)); face(c, [[0, -2], [30, -2], [-5, -28]], lit(ic, -.05));
      c.restore();
      c.restore();
    }
    // beat 2: corner dog-ear folds down (top-right), showing paper back colour
    const ce = X.E(t, 3.4, 4.2, "back") * (1 - X.E(t, 6.8, 7.4, "inOut"));
    if (ce > 0 && op > .9) {
      const sz = Math.min(cw, ch) * .28, A = [x0 + cw - sz, y0], B = [x0 + cw, y0 + sz], corner = [[x0 + cw, y0]];
      const f = fold(corner, B, A, ce * Math.PI); const pp = proj(f, W / 2, H / 2, 700);
      face(c, [A, [x0 + cw, y0], B], p[0]);             // hole where the corner was (shows background)
      c.save(); X.shadow(c, 10, 4, "rgba(0,0,0,.25)"); face(c, [A, pp[0], B], ce > .5 ? lit(p[2], .1) : lit(p[1], -.2)); c.restore();
      if (ce > .6) X.text(c, "★", (A[0] + B[0] + pp[0][0]) / 3, (A[1] + B[1] + pp[0][1]) / 3, { size: sz * .26, color: p[1], alpha: X.seg(ce, .6, 1) });
    }
    // crease highlights sweep
    const sweep = X.seg(t, 1.6, 2.8);
    if (sweep > 0 && sweep < 1) { const sx = x0 + sweep * (opened + 60) - 30; c.save(); c.globalCompositeOperation = "soft-light"; c.fillStyle = X.lgrad(c, sx - 40, 0, sx + 40, 0, [[0, "rgba(255,255,255,0)"], [.5, "rgba(255,255,255,.7)"], [1, "rgba(255,255,255,0)"]]); c.fillRect(x0, y0, opened, ch); c.restore(); }
    // flying paper plane exits at the end with folding wings
    const fp = X.E(t, 5.8, 7.8, "inOut");
    if (fp > 0) plane(c, W * .1 + fp * W * .95, H * .86 - Math.sin(fp * Math.PI) * H * .3, .9, -.35 + fp * .3, t * 6, p[3], X.shade(p[3], .35));
    // footer label
    X.text(c, S.title.toUpperCase(), W / 2, H * .92, { size: 11, fam: S.f2, color: p[1], alpha: .75, w: 700, ls: 3 });
  }
})();
