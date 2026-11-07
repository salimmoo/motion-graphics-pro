/**
 * MGP.particlesFlight \u2014 soft star particles: bursts that scatter, streams that fly to a target, a scripted
 * sparkle trail, and a depth flight ("flying into" a point: round motes rush past the camera, size and softness
 * by depth, a warm bloom at the moment of arrival).
 *
 * Extracted from the website's global star FX layer (guide/js/fx.js). The site integrated particles per frame
 * from pointer events; here every particle is spawned in setup from a seeded rng with a birth time, and its
 * position is a closed-form function of (t - birth) (bursts, flight) or a fixed-step re-simulation from birth
 * (streams, max ~80 steps), so any t can be drawn directly and seeking backwards gives identical pixels.
 * No pointer input: the cursor trail became a scripted `trail` path.
 *
 * Options (defaults):
 *   width 1280, height 720, duration 6, seed 5
 *   background "#050816"     css colour | (ctx,t,W,H)=>void | null (transparent, for overlays)
 *   underlay null            (ctx,t,W,H)=>void drawn after the background, before the particles
 *   bursts  []               [{ t, x, y, n:46, power:1 }]               scatter with drag + light gravity
 *   streams []               [{ t, x, y, tx, ty, n:60, spread:30 }]    particles fly (spring + drag) to tx,ty
 *   flights []               [{ t, x, y, arrive:1.15, settle:0.95, density:1 }]  depth flight toward x,y
 *   trail null               { path:[[x,y],...], t0, t1, spacing:14, smooth:true }  scripted cursor trail
 *   count 300                motes per flight (x density)
 *   sparkColors [["rgba(255,250,235,1)","rgba(255,226,160,.55)"], ["rgba(255,236,190,1)","rgba(214,176,106,.6)"], ["rgba(220,240,255,1)","rgba(140,180,255,.45)"]]
 *                            [core, glow] per sparkle sprite (bursts/streams/trail)
 *   sparkCross true          the thin cross on sparkle sprites
 *   orbColors [["rgba(255,250,236,1)","rgba(255,236,196,.7)"], ["rgba(255,232,178,1)","rgba(226,184,110,.7)"]]  flight motes
 *   softness 1               >1 = softer/bigger bokeh on near motes, <1 = crisper
 *   moteSize 5.5, maxNear 64, maxFar 26    flight mote sizes (px)
 *   bloom true, bloomColors ["#fffaec","#ffecbe","#f0c478","#c88c3c"]
 *   focusDrift true          the flight focus drifts to the frame centre while approaching
 *
 * Methods: api.create(canvasOrEl, opts) -> inst (draw/seek/timeline); api.render(ctx, t, opts)
 *   api.lib = { flightDepth(t, A), sprite(core, glow, cross), orb(core, mid, soft), burstAt(p, age), drawFlight(ctx, t, F, S) }
 *
 * Example:
 *   const fx = MGP.particlesFlight.create("#stage", {
 *     bursts: [{ t: 0.5, x: 640, y: 360 }], flights: [{ t: 2, x: 900, y: 260 }] });
 *   MGP.core.expose(fx);
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2, FPS = 60;

  // sparkle sprite: soft radial glow + thin cross (site: fx.js sprite())
  function sprite(core, glow, cross = true) {
    const s = C.offscreen(64, 64), g = s.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, core); rg.addColorStop(0.18, glow); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    if (cross) { g.strokeStyle = core; g.globalAlpha = 0.9; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 58); g.moveTo(6, 32); g.lineTo(58, 32); g.stroke(); }
    return s;
  }
  const withA = (c, a) => C.rgba(c, a);
  // soft round mote: crisp-ish (far) or bokeh (near)
  function orb(core, mid, soft, softness = 1) {
    const s = C.offscreen(64, 64), g = s.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    const k = soft ? Math.min(0.9, 0.35 * softness) : 0.16, k2 = soft ? Math.min(0.95, 0.7 * Math.sqrt(softness)) : 0.45;
    const am = parseFloat((String(mid).match(/[\d.]+\)\s*$/) || ["1"])[0]);
    rg.addColorStop(0, core); rg.addColorStop(k, mid); rg.addColorStop(Math.max(k + 0.01, k2), withA(mid, soft ? 0.18 * (am / 0.7) : 0.12 * (am / 0.7))); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return s;
  }
  const dim = (c, k) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return C.rgba(c, k); const p = m[1].split(",").map(Number); return `rgba(${p[0]},${p[1]},${p[2]},${((p[3] == null ? 1 : p[3]) * k).toFixed(3)})`; };

  // depth flight: camera speed v(t) eases in, peaks at arrival A, decays after; D(t) = integral of 0.55 v
  const vAt = (t, A) => (t < A ? 2.4 * Math.pow(Math.max(0, t) / A, 2.2) : 2.4 * Math.exp(-(t - A) * 4.2));
  const DA = (A) => (0.55 * 2.4 * A) / 3.2;
  const flightDepth = (t, A) => (t <= 0 ? 0 : t < A ? (0.55 * 2.4 * A * Math.pow(t / A, 3.2)) / 3.2 : DA(A) + ((0.55 * 2.4) / 4.2) * (1 - Math.exp(-(t - A) * 4.2)));
  // mote depth at time t: wraps (z += 1.05) before arrival, clamps at 0.05 after (site behaviour)
  function moteZ(z0, t, A) {
    const wrap = (z) => (z < 0.05 ? 0.05 + ((((z - 0.05) % 1.05) + 1.05) % 1.05) : z);
    if (t < A) return wrap(z0 - flightDepth(t, A));
    const zA = wrap(z0 - DA(A));
    return Math.max(0.05, zA - (flightDepth(t, A) - DA(A)));
  }

  // burst particle, closed form of: vy += g; v *= drag; p += v   (per 1/60 s step, n may be fractional)
  function burstAt(p, age) {
    const n = age * FPS, d = p.drag, dn = Math.pow(d, n), geo = (d * (1 - dn)) / (1 - d);
    const vyInf = (p.g * d) / (1 - d);
    return [p.x + p.vx * geo, p.y + n * vyInf + (p.vy - vyInf) * geo];
  }
  // stream particle: fixed-step re-simulation from birth (spring toward target after delay, drag), interpolated
  function streamAt(p, age) {
    const n = age * FPS, N = Math.floor(n), f = n - N;
    let x = p.x, y = p.y, vx = 0, vy = 0, px = x, py = y;
    for (let i = 1; i <= N + 1; i++) {
      px = x; py = y;
      if (i / FPS > p.delay) { vx += (p.tx - x) * 0.018; vy += (p.ty - y) * 0.018; }
      vx *= p.drag; vy *= p.drag; x += vx; y += vy;
    }
    return [C.lerp(px, x, f), C.lerp(py, y, f)];
  }

  function drawFlight(g, t, F, S) {
    const o = S.opts, W = S.W, H = S.H, A = F.arrive, end = A + F.settle, lt = t - F.t;
    if (lt < 0 || lt > end) return;
    const sm = C.smooth01;
    const env = Math.min(1, lt / 0.25) * (lt < A ? 1 : 1 - sm((lt - A) / (end - A)));
    const k = o.focusDrift ? sm(lt / A) : 0, fx = F.x + (W / 2 - F.x) * k, fy = F.y + (H * 0.5 - F.y) * k;
    const Fk = Math.min(W, H) * 0.42, D = Math.max(W, H), v = vAt(lt, A), small = W < 700;
    g.globalCompositeOperation = "lighter";
    for (const m of F.motes) {
      const z = moteZ(m.z, lt, A), z0 = z + 0.55 * v / FPS;      // previous-frame depth for the comet tail
      const sx = fx + (m.x / z) * Fk, sy = fy + (m.y / z) * Fk;
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
      const near = z < 0.3, sz = Math.min(near ? o.maxNear * o.softness : o.maxFar, (m.s * o.moteSize) / z) * (small ? 0.75 : 1);
      const al = env * Math.min(1, (1.2 - z) * 1.4) * (0.75 + 0.25 * Math.sin(lt * 6.25 + m.ph)) * (near ? 0.5 : 1);
      if (al <= 0.01) continue;
      const spr = S.ORB[(near ? 2 : 0) + m.c];
      // soft motion: a short comet of overlapping round sprites (never a line)
      let px = fx + (m.x / Math.max(0.05, z0)) * Fk - sx, py = fy + (m.y / Math.max(0.05, z0)) * Fk - sy;
      const L = Math.hypot(px, py), cap = sz * 1.3; if (L > cap) { px *= cap / L; py *= cap / L; }
      for (let j = 3; j >= 0; j--) {
        const u = j / 4, qs = sz * (1 - u * 0.3);
        g.globalAlpha = al * (1 - u * 0.75);
        g.drawImage(spr, sx + px * u - qs, sy + py * u - qs, qs * 2, qs * 2);
      }
    }
    g.globalAlpha = 1;
    // bloom: warm light that swells toward arrival, then lets the next scene emerge from it
    const b = !o.bloom ? 0 : lt < A ? Math.pow(sm((lt - A + 0.34) / 0.34), 1.8) : 1 - sm(((lt - A) / (end - A)) * 1.05);
    if (b > 0.003) {
      g.globalCompositeOperation = "source-over";
      const R = D * (0.35 + b * 0.9), gr = g.createRadialGradient(fx, fy, 0, fx, fy, R), bc = o.bloomColors;
      gr.addColorStop(0, C.rgba(bc[0], b * 0.97)); gr.addColorStop(0.28, C.rgba(bc[1], b * 0.58));
      gr.addColorStop(0.62, C.rgba(bc[2], b * 0.22)); gr.addColorStop(1, C.rgba(bc[3], b * 0.08));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    g.globalCompositeOperation = "source-over";
  }

  const api = C.defineModule("particlesFlight", {
    size: [1280, 720],
    duration: (o) => o.duration || 6,
    defaults: {
      seed: 5, background: "#050816", underlay: null,
      bursts: [], streams: [], flights: [], trail: null, count: 300,
      sparkColors: [["rgba(255,250,235,1)", "rgba(255,226,160,.55)"], ["rgba(255,236,190,1)", "rgba(214,176,106,.6)"], ["rgba(220,240,255,1)", "rgba(140,180,255,.45)"]],
      sparkCross: true,
      orbColors: [["rgba(255,250,236,1)", "rgba(255,236,196,.7)"], ["rgba(255,232,178,1)", "rgba(226,184,110,.7)"]],
      softness: 1, moteSize: 5.5, maxNear: 64, maxFar: 26,
      bloom: true, bloomColors: ["#fffaec", "#ffecbe", "#f0c478", "#c88c3c"], focusDrift: true,
    },
    setup(S) {
      const o = S.opts, R = S.rng, P = [];
      const sc = o.sparkColors;
      S.SPR = sc.map(([a, b]) => sprite(a, b, o.sparkCross));
      const oc = o.orbColors;
      S.ORB = [orb(oc[0][0], oc[0][1], 0), orb(oc[1][0], oc[1][1], 0), orb(dim(oc[0][0], 0.55), dim(oc[0][1], 0.46), 1, o.softness), orb(dim(oc[1][0], 0.5), dim(oc[1][1], 0.43), 1, o.softness)];
      const nc = S.SPR.length;
      const col = () => Math.min(nc - 1, R() < 0.6 ? 1 : R() < 0.5 ? 0 : 2);
      (o.bursts || []).forEach((e) => {
        const n = e.n == null ? 46 : e.n, pw = e.power == null ? 1 : e.power;
        for (let i = 0; i < n; i++) {
          const a = R() * TAU, sp = (1.5 + R() * 6.5) * pw;
          P.push({ k: "b", birth: e.t, x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, s: 4 + R() * 12, life: 0.7 + R() * 1.1, c: col(), drag: 0.93 + R() * 0.04, g: 0.02, tw: R() * TAU });
        }
      });
      (o.streams || []).forEach((e) => {
        const n = e.n == null ? 60 : e.n, sp = e.spread == null ? 30 : e.spread;
        for (let i = 0; i < n; i++) P.push({ k: "s", birth: e.t, x: e.x + (R() - 0.5) * sp, y: e.y + (R() - 0.5) * sp, tx: e.tx + (R() - 0.5) * sp * 2, ty: e.ty + (R() - 0.5) * sp, delay: R() * 0.35, s: 4 + R() * 9, life: 1.3, c: Math.min(nc - 1, 1), drag: 0.9, tw: R() * TAU });
      });
      if (o.trail && o.trail.path && o.trail.path.length > 1) {
        const tr = o.trail, d = tr.smooth === false ? tr.path : C.catmullPts(tr.path, 16), Ltot = C.polyLen(d), sp = tr.spacing || 14, n = Math.floor(Ltot / sp);
        for (let i = 1; i <= n; i++) {
          const u = i / n, q = C.polyAt(d, u), bt = C.lerp(tr.t0 || 0, tr.t1 == null ? 1 : tr.t1, u);
          P.push({ k: "b", birth: bt, x: q[0], y: q[1], vx: (R() - 0.5) * 0.8, vy: (R() - 0.5) * 0.8 + 0.2, s: 3 + R() * 7, life: 0.55 + R() * 0.5, c: R() < 0.7 ? Math.min(nc - 1, 1) : 0, drag: 0.97, g: 0, tw: R() * TAU });
        }
      }
      S.P = P;
      S.F = (o.flights || []).map((e) => {
        const n = Math.round((S.W < 700 ? o.count * 0.57 : o.count) * (e.density || 1)), motes = [];
        for (let i = 0; i < n; i++) { const a = R() * TAU, r = Math.pow(R(), 0.6) * 1.25 + 0.04; motes.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, z: 0.15 + R() * 0.95, c: R() < 0.55 ? 1 : 0, s: 0.6 + R() * 1.1, ph: R() * TAU }); }
        return { t: e.t, x: e.x, y: e.y, arrive: e.arrive || 1.15, settle: e.settle == null ? 0.95 : e.settle, motes };
      });
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H;
      if (typeof o.background === "function") o.background(g, t, W, H);
      else if (o.background) { g.fillStyle = o.background; g.fillRect(0, 0, W, H); }
      if (o.underlay) { g.save(); o.underlay(g, t, W, H); g.restore(); }
      g.globalCompositeOperation = "lighter";
      for (const p of S.P) {
        const age = t - p.birth; if (age < 0 || age > p.life) continue;
        const q = p.k === "s" ? streamAt(p, age) : burstAt(p, age);
        const k = 1 - age / p.life, tw = 0.55 + 0.45 * Math.sin(age * 11.1 + p.tw), s = p.s * (0.4 + 0.6 * k) * (0.7 + 0.3 * tw);
        g.globalAlpha = Math.min(1, k * 1.4) * tw;
        g.drawImage(S.SPR[p.c], q[0] - s, q[1] - s, s * 2, s * 2);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      for (const F of S.F) drawFlight(g, t, F, S);
    },
  });
  api.lib = { flightDepth, moteZ, sprite, orb, burstAt, streamAt, drawFlight };
  MGP.particlesFlight = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
