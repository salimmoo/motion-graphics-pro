/* Global star FX on a full-screen canvas: cursor trail, click bursts that scatter,
   streams that fly to a target, and a depth flight for "flying into" a constellation:
   soft round star motes stream past the camera (size and softness by depth) and a warm bloom
   blooms at the moment of arrival. No strokes, everything is a soft round sprite. */
window.FX = (() => {
  const cv = document.getElementById("fx"), cx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const Q = window.QUALITY || { tier: 2, dpr: () => Math.min(devicePixelRatio || 1, 1.25), n: (x) => x, on() {} };
  let W = 0, H = 0, dpr = 1;
  const P = [];               // particles
  let fl = null;              // depth flight {x, y, t0, motes, arrive}
  const resize = () => { dpr = Q.dpr(); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener("resize", resize);

  // pre-rendered sparkle sprites
  const sprite = (core, glow) => {
    const s = document.createElement("canvas"); s.width = s.height = 64; const g = s.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, core); rg.addColorStop(.18, glow); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = core; g.globalAlpha = .9; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 58); g.moveTo(6, 32); g.lineTo(58, 32); g.stroke();
    return s;
  };
  // soft round motes for the flight: crisp-ish (far) and bokeh (near)
  const orb = (core, mid, soft) => {
    const s = document.createElement("canvas"); s.width = s.height = 64; const g = s.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, core); rg.addColorStop(soft ? .35 : .16, mid); rg.addColorStop(soft ? .7 : .45, mid.replace(/[\d.]+\)$/, soft ? ".18)" : ".12)")); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return s;
  };
  const ORB = [orb("rgba(255,250,236,1)", "rgba(255,236,196,.7)"), orb("rgba(255,232,178,1)", "rgba(226,184,110,.7)"),
    orb("rgba(255,248,232,.55)", "rgba(255,232,190,.32)", 1), orb("rgba(255,226,166,.5)", "rgba(220,176,100,.3)", 1)];
  const SPR = [sprite("rgba(255,250,235,1)", "rgba(255,226,160,.55)"), sprite("rgba(255,236,190,1)", "rgba(214,176,106,.6)"), sprite("rgba(220,240,255,1)", "rgba(140,180,255,.45)")];

  // the frame loop sleeps while there is nothing to draw and wakes on the next particle or flight
  let awake = false;
  const wake = () => { if (!awake) { awake = true; last = performance.now(); requestAnimationFrame(frame); } };
  const add = (o) => { wake(); if (P.length < 1400) P.push(Object.assign({ life: 1, age: 0, s: 6, c: 0, vx: 0, vy: 0, drag: .96, tw: Math.random() * 6.28 }, o)); };

  function burst(x, y, n = 46, power = 1) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 6.5) * power;
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, s: 4 + Math.random() * 12, life: .7 + Math.random() * 1.1, c: Math.random() < .6 ? 1 : Math.random() < .5 ? 0 : 2, drag: .93 + Math.random() * .04, g: .02 });
    }
  }
  function stream(x, y, tx, ty, n = 60) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      add({ x: x + (Math.random() - .5) * 30, y: y + (Math.random() - .5) * 30, tx: tx + (Math.random() - .5) * 60, ty: ty + (Math.random() - .5) * 30, home: true, delay: Math.random() * .35, s: 4 + Math.random() * 9, life: 1.3, c: 1, drag: .9 });
    }
  }
  // depth flight toward (x, y): motes accelerate past the camera, bloom peaks at `arrive` seconds, then settle
  function flight(x, y, o = {}) {
    if (reduce) return;
    const n = Math.round(Q.n(W < 700 ? 170 : 300) * (o.density || 1)), motes = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, r = Math.pow(Math.random(), .6) * 1.25 + .04;
      motes.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * .8, z: .15 + Math.random() * .95, c: Math.random() < .55 ? 1 : 0, s: .6 + Math.random() * 1.1, ph: Math.random() * 6.28 });
    }
    wake(); fl = { x, y, t0: performance.now(), motes, arrive: o.arrive || 1.15, end: (o.arrive || 1.15) + (o.settle || .95) };
  }
  const warpTo = (x, y, dur = 1.2) => flight(x, y, { arrive: dur * .72 });
  const sm = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
  function drawFlight(now, dt) {
    const t = (now - fl.t0) / 1000, A = fl.arrive;
    if (t > fl.end) { fl = null; return; }
    // camera speed: eases in, peaks just before arrival, decays after (z units / s)
    const v = t < A ? 2.4 * Math.pow(t / A, 2.2) : 2.4 * Math.exp(-(t - A) * 4.2);
    const env = Math.min(1, t / .25) * (t < A ? 1 : 1 - sm((t - A) / (fl.end - A)));
    const k = sm(t / A), fx = fl.x + (W / 2 - fl.x) * k, fy = fl.y + (H * .5 - fl.y) * k;   // focus drifts to centre
    const F = Math.min(W, H) * .42, D = Math.max(W, H);
    for (const m of fl.motes) {
      const z0 = m.z; m.z -= v * dt * .55;
      if (m.z < .05) { if (t < A) { m.z += 1.05; continue; } m.z = .05; }
      const sx = fx + (m.x / m.z) * F, sy = fy + (m.y / m.z) * F;
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) { if (t < A) m.z = 1 + Math.random() * .2; continue; }
      const near = m.z < .3, sz = Math.min(near ? 64 : 26, (m.s * 5.5) / m.z) * (W < 700 ? .75 : 1);
      const al = env * Math.min(1, (1.2 - m.z) * 1.4) * (.75 + .25 * Math.sin(now / 160 + m.ph)) * (near ? .5 : 1);
      if (al <= .01) continue;
      const spr = ORB[(near ? 2 : 0) + m.c];
      // soft motion: the mote stretches into a short comet of overlapping round sprites (never a line)
      let px = fx + (m.x / Math.max(.05, z0)) * F - sx, py = fy + (m.y / Math.max(.05, z0)) * F - sy;
      const L = Math.hypot(px, py), cap = sz * 1.3; if (L > cap) { px *= cap / L; py *= cap / L; }
      for (let j = 3; j >= 0; j--) {
        const u = j / 4, qs = sz * (1 - u * .3);
        cx.globalAlpha = al * (1 - u * .75);
        cx.drawImage(spr, sx + px * u - qs, sy + py * u - qs, qs * 2, qs * 2);
      }
    }
    // bloom: warm light that swells toward arrival and lets the next layer emerge from it
    const b = t < A ? Math.pow(sm((t - A + .34) / .34), 1.8) : 1 - sm((t - A) / (fl.end - A) * 1.05);
    if (b > .003) {
      cx.globalCompositeOperation = "source-over";
      const R = D * (.35 + b * .9), g = cx.createRadialGradient(fx, fy, 0, fx, fy, R);
      g.addColorStop(0, `rgba(255,250,236,${(b * .97).toFixed(3)})`); g.addColorStop(.28, `rgba(255,236,190,${(b * .58).toFixed(3)})`);
      g.addColorStop(.62, `rgba(240,196,120,${(b * .22).toFixed(3)})`); g.addColorStop(1, `rgba(200,140,60,${(b * .08).toFixed(3)})`);
      cx.globalAlpha = 1; cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.globalCompositeOperation = "lighter";
    }
  }

  // cursor trail
  let lx = -1, ly = -1;
  addEventListener("pointermove", (e) => {
    if (reduce || e.pointerType === "touch" || Q.tier === 0) return;
    const d = Math.hypot(e.clientX - lx, e.clientY - ly);
    if (d > 14) {
      lx = e.clientX; ly = e.clientY;
      add({ x: lx, y: ly, vx: (Math.random() - .5) * .8, vy: (Math.random() - .5) * .8 + .2, s: 3 + Math.random() * 7, life: .55 + Math.random() * .5, c: Math.random() < .7 ? 1 : 0, drag: .97 });
    }
  }, { passive: true });
  addEventListener("pointerdown", (e) => { if (!e.target.closest("input, textarea, select")) burst(e.clientX, e.clientY, 26, .7); }, { passive: true });

  let last = performance.now(), dirtyCv = true;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    // idle: nothing to draw -> clear once and leave the canvas alone (no full-screen upload every frame)
    if (!P.length && !fl) { if (dirtyCv) { cx.clearRect(0, 0, W, H); dirtyCv = false; } awake = false; return; }
    dirtyCv = true;
    cx.clearRect(0, 0, W, H);
    cx.globalCompositeOperation = "lighter";
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.age += dt;
      if (p.age > p.life) { P.splice(i, 1); continue; }
      if (p.home) {
        if (p.age > p.delay) { p.vx += (p.tx - p.x) * .018; p.vy += (p.ty - p.y) * .018; }
      } else if (p.g) p.vy += p.g;
      p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy;
      const k = 1 - p.age / p.life, tw = .55 + .45 * Math.sin(now / 90 + p.tw);
      const s = p.s * (.4 + .6 * k) * (.7 + .3 * tw);
      cx.globalAlpha = Math.min(1, k * 1.4) * tw;
      cx.drawImage(SPR[p.c], p.x - s, p.y - s, s * 2, s * 2);
    }
    if (fl) drawFlight(now, dt);
    cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  }
  wake();
  return { burst, stream, warpTo, flight, flying: () => !!fl };
})();
