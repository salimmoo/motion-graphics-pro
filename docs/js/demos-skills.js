/* Interactive demos for the two companion skills of the bundle: motion-graphics and vector-character.
   Every number comes from the skill text or its bundled scripts (mesin_gait.py, pegas.py, ruang3d.py,
   bayangan3d.py, bentuk.py, loft.py); each demo cites its section in the caption.
   Registers with Demos.add(id, fn). fn(el) renders into the demo body; animation runs only while visible. */
(() => {
  "use strict";
  const DM = window.Demos;
  if (!DM || !DM.add) return;
  const { $, $$, esc, clamp, visLoop } = DM.util;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const smooth01 = (u) => (u = clamp(u), u * u * (3 - 2 * u));
  const inout3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
  const UIF = '"Geist", "Helvetica Neue", Arial, sans-serif';
  const CAPS = '"Cinzel", Georgia, serif';
  const K = { night: "#070a14", navy: "#0e1530", ultra: "#1b2d63", ivory: "#f4ecd8", ivory2: "#e9dcbc", gold: "#d6b06a", gold2: "#f2d796", goldd: "#9c7a3c", muted: "#a79f8c" };

  /* ---------------- colour ---------------- */
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = (r) => "#" + r.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); t = clamp(t); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------------- UI ---------------- */
  const UI = {
    chips: (k, items, cur) => `<div class="ds-chips" data-k="${k}">${items.map(([v, l, tip]) => `<button type="button" class="ds-chip${String(v) === String(cur) ? " on" : ""}" data-v="${esc(v)}"${tip ? ` title="${esc(tip)}"` : ""}>${l}</button>`).join("")}</div>`,
    slider: (k, l, min, max, step, val) => `<label class="ds-sl"><span>${l}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-k="${k}"><output data-o="${k}"></output></label>`,
    tog: (k, l, on) => `<button type="button" class="ds-tg${on ? " on" : ""}" data-t="${k}" aria-pressed="${!!on}"><i></i>${l}</button>`,
    grp: (label, inner, cls = "") => `<div class="ds-grp ${cls}"><div class="ds-k">${label}</div>${inner}</div>`,
  };
  function bind(el, st, on) {
    el.addEventListener("click", (e) => {
      const c = e.target.closest(".ds-chip");
      if (c && el.contains(c)) {
        const box = c.parentElement, k = box.dataset.k, raw = c.dataset.v;
        $$(".ds-chip", box).forEach((b) => b.classList.toggle("on", b === c));
        st[k] = raw !== "" && !isNaN(+raw) ? +raw : raw; on(k, st[k]); return;
      }
      const t = e.target.closest(".ds-tg");
      if (t && el.contains(t)) { const k = t.dataset.t; st[k] = !st[k]; t.classList.toggle("on", st[k]); t.setAttribute("aria-pressed", st[k]); on(k, st[k]); }
    });
    el.addEventListener("input", (e) => { const i = e.target.closest("input[data-k]"); if (!i) return; st[i.dataset.k] = +i.value; on(i.dataset.k, st[i.dataset.k]); });
  }
  const setChip = (el, k, v) => { const box = $(`.ds-chips[data-k="${k}"]`, el); if (box) $$(".ds-chip", box).forEach((b) => b.classList.toggle("on", b.dataset.v === String(v))); };
  const setTog = (el, k, v) => { const b = $(`.ds-tg[data-t="${k}"]`, el); if (b) { b.classList.toggle("on", !!v); b.setAttribute("aria-pressed", !!v); } };
  const setSl = (el, k, v) => { const i = $(`input[data-k="${k}"]`, el); if (i) i.value = v; };
  const outp = (el, k, txt) => { const o = $(`[data-o="${k}"]`, el); if (o) o.textContent = txt; };
  const shell = (cls, main, side, cap) => `<div class="ds ${cls}"><div class="ds-wrap"><div class="ds-main">${main}</div><div class="ds-side">${side}<p class="ds-cap">${cap}</p></div></div></div>`;
  const setHTML = (el, s) => { if (el.__h !== s) { el.__h = s; el.innerHTML = s; } };
  const fmt = (v, d = 2) => (+v).toFixed(d).replace(".", ",");

  // canvas inside a sized box; fit() keeps the backing store at devicePixelRatio and returns the 2D context in CSS px
  function cv2d(box) {
    const cv = document.createElement("canvas"); box.prepend(cv);
    const g = cv.getContext("2d");
    const S = { cv, g, w: 1, h: 1, dpr: 1 };
    S.fit = () => {
      const w = box.clientWidth || 1, h = box.clientHeight || 1, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w !== S.w || h !== S.h || dpr !== S.dpr) { S.w = w; S.h = h; S.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); return g;
    };
    S.layer = () => { const c = document.createElement("canvas"); const lg = c.getContext("2d"); return { c, g: lg, fit() { if (c.width !== S.cv.width || c.height !== S.cv.height) { c.width = S.cv.width; c.height = S.cv.height; } lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, c.width, c.height); lg.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); return lg; } }; };
    return S;
  }
  // closed smooth path through points (quadratic midpoints)
  function smooth(g, p, close = true) {
    const n = p.length; if (n < 3) return;
    g.moveTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2);
    for (let i = 1; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    if (close) { g.quadraticCurveTo(p[0][0], p[0][1], (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); g.closePath(); }
  }
  function lines(g, p, close = true) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); if (close) g.closePath(); }
  const fillPts = (g, p, col, sm = true) => { if (!p || p.length < 3) return; g.beginPath(); sm ? smooth(g, p) : lines(g, p); g.fillStyle = col; g.fill(); };
  const tag = (g, txt, x, y, col = K.gold2, size = 10, align = "left", font = MONO) => { g.font = `500 ${size}px ${font}`; g.textAlign = align; g.textBaseline = "alphabetic"; g.fillStyle = col; g.fillText(txt, x, y); };

  // tangent capsule (vector-character scripts/bentuk.py cap_pts): circles at the pivots, outer tangent sides, bulge zero at the ends
  function arcPts(cx, cy, r, d0, d1, through, n) {
    const a0 = Math.atan2(d0[1], d0[0]), a1 = Math.atan2(d1[1], d1[0]), at = Math.atan2(through[1], through[0]);
    const md = (x) => ((x % TAU) + TAU) % TAU;
    let sw = md(a1 - a0); if (md(at - a0) > sw) sw -= TAU;
    const out = []; for (let k = 0; k <= n; k++) out.push([cx + r * Math.cos(a0 + sw * k / n), cy + r * Math.sin(a0 + sw * k / n)]); return out;
  }
  function capPts(a, b, ra, rb, bo = 0, bi = 0, at = 0.4, nArc = 14, nSide = 8) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = uy, ny = -ux;
    const s = clamp((rb - ra) / L, -0.99, 0.99), c = Math.sqrt(1 - s * s);
    const dR = [nx * c - ux * s, ny * c - uy * s], dL = [-nx * c - ux * s, -ny * c - uy * s];
    const prof = (t) => (t <= 0 || t >= 1 ? 0 : Math.pow(Math.sin(0.5 * Math.PI * (t < at ? t / at : (1 - t) / (1 - at))), 2));
    const pts = arcPts(a[0], a[1], ra, dL, dR, [-ux, -uy], nArc);
    for (let k = 1; k < nSide; k++) { const t = k / nSide, gq = bo * prof(t); pts.push([a[0] + ra * dR[0] + (b[0] + rb * dR[0] - a[0] - ra * dR[0]) * t + dR[0] * gq, a[1] + ra * dR[1] + (b[1] + rb * dR[1] - a[1] - ra * dR[1]) * t + dR[1] * gq]); }
    pts.push(...arcPts(b[0], b[1], rb, dR, dL, [ux, uy], nArc));
    for (let k = 1; k < nSide; k++) { const t = 1 - k / nSide, gq = bi * prof(t); pts.push([a[0] + ra * dL[0] + (b[0] + rb * dL[0] - a[0] - ra * dL[0]) * t + dL[0] * gq, a[1] + ra * dL[1] + (b[1] + rb * dL[1] - a[1] - ra * dL[1]) * t + dL[1] * gq]); }
    return pts;
  }
  // keep the part of a polygon on the side (p - P) . n <= 0 (cut perpendicular to an axis: hem, cuff)
  function clipHalf(pts, P, n) {
    const out = [], f = (p) => (p[0] - P[0]) * n[0] + (p[1] - P[1]) * n[1];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b); if (fa <= 0) out.push(a); if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    return out;
  }
  const cutCap = (a, b, ra, rb, frac, bo = 0, bi = 0) => { const u = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(u[0], u[1]) || 1e-6; const n = [u[0] / L, u[1] / L]; return clipHalf(capPts(a, b, ra, rb, bo, bi), [a[0] + u[0] * frac, a[1] + u[1] * frac], n); };

  /* ======================================================================
     MESIN GAIT: port of motion-graphics scripts/mesin_gait.py (bab 4.3)
     side view, face +x, units H, y down, x 0 = hip joint
     ====================================================================== */
  const BODY = { thigh: 1.27, shin: 1.24, sole_y: 5.78, hip_y: 3.14, ankle_local: [0.13, -0.135], heel_local: [0.03, 0], toe_local: [0.555, -0.008],
    shoe: [[0.02, -0.03], [0, -0.09], [0.025, -0.165], [0.1, -0.15], [0.19, -0.185], [0.3, -0.152], [0.42, -0.122], [0.515, -0.095], [0.562, -0.05], [0.555, -0.008], [0.52, 0], [0.04, 0]],
    shoulder: [-0.02, 1.47], upper: 0.84, fore: 0.78 };
  const GDEF = { T: 1.0, stance: 0.6, step: 2.0, u_flat: 0.15, u_heeloff: 0.55, u_mid: 0.4, knee_hs: 3, knee_load: 20, knee_mid: 5, plantar_to: 25, reach_max: 0.99, lift: 0.2, lift_skew: 0.65,
    swing_flat: 0.55, lean: 2, sh_amp: 11, sh_amp_bag: 4, el_back: 12, el_front: 32, el_bag: 8, arm_lag: 0.03, nod_amp: 1.5, nod_lag: 0.05 };
  const rot2 = (p, deg) => { const a = deg * RAD, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
  const rotAbout = (p, piv, deg) => { const r = rot2([p[0] - piv[0], p[1] - piv[1]], deg); return [r[0] + piv[0], r[1] + piv[1]]; };
  const shoeMap = (cfg) => { const [px, py] = cfg.piv, [ax, ay] = cfg.at; return (p) => { const q = rot2([p[0] - px, p[1] - py], cfg.deg); return [q[0] + ax, q[1] + ay]; }; };
  function ik(h, a, l1, l2, kneeFwd = true) {
    const dx = a[0] - h[0], dy = a[1] - h[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-6), base = Math.atan2(dy, dx);
    const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    let best = null;
    for (const s of [1, -1]) { const k = [h[0] + l1 * Math.cos(base + s * A), h[1] + l1 * Math.sin(base + s * A)]; if (best === null || (k[0] > best[0]) === kneeFwd) best = k; }
    return best;
  }
  const easeIO = (t) => (t = clamp(t), t * t * (3 - 2 * t));
  const hermite = (p0, p1, m0, m1, t) => { const t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1; };

  class Gait {
    constructor(body = {}, kw = {}) {
      const b = (this.b = Object.assign({}, BODY, body)), g = (this.g = Object.assign({}, GDEF, kw));
      this.TH = b.thigh; this.SH = b.shin; this.L_LEG = this.TH + this.SH; this.SOLE = b.sole_y;
      this.HEEL = b.heel_local; this.TOE = b.toe_local; this.ANK = b.ankle_local;
      this.S = 2 * g.step; this.v = this.S / g.T; this.u_ps = 0.5 / g.stance;
      this.H0 = g.stance * this.S * g.u_mid - (this.ANK[0] - this.HEEL[0]);
      this.phi_hs = 14; this.phi_ps = 15;
      for (let i = 0; i < 6; i++) {
        const hy = this._hipFromLead(0);
        this.phi_hs = -Gait.solve((ph) => this.plantar([0, hy], this._ank(0, ph), ph), 0, -40, 0);
        this.phi_ps = this._matchPhiPs();
      }
      this._buildHip();
    }
    kneeReach(kd) { const a = (180 - kd) * RAD; return Math.sqrt(this.TH ** 2 + this.SH ** 2 - 2 * this.TH * this.SH * Math.cos(a)); }
    kneeAtReach(r) { const d = r * this.L_LEG, c = (this.TH ** 2 + this.SH ** 2 - d * d) / (2 * this.TH * this.SH); return 180 - Math.acos(clamp(c, -1, 1)) / RAD; }
    kneeFlex(h, a) { const d = Math.min(dist(h, a), this.L_LEG - 1e-9), c = (this.TH ** 2 + this.SH ** 2 - d * d) / (2 * this.TH * this.SH); return 180 - Math.acos(clamp(c, -1, 1)) / RAD; }
    plantar(hip, ank, phi) {
      const k = ik(hip, ank, this.TH, this.SH), s = [ank[0] - k[0], ank[1] - k[1]], f = [Math.cos(phi * RAD), Math.sin(phi * RAD)];
      const c = (s[0] * f[0] + s[1] * f[1]) / Math.hypot(s[0], s[1]); return 90 - Math.acos(clamp(c, -1, 1)) / RAD;
    }
    shoeMinY(cfg) { const f = shoeMap(cfg); let m = -1e9; for (const q of this.b.shoe) m = Math.max(m, f(q)[1]); return m; }
    heelX(u) { return this.H0 - this.S * this.g.stance * u; }
    cfg(u, phi) {
      const xh = this.heelX(u);
      if (u < this.g.u_heeloff || phi <= 0) return { piv: this.HEEL, at: [xh, this.SOLE], deg: phi };
      return { piv: this.TOE, at: [xh + this.TOE[0] - this.HEEL[0], this.SOLE + this.TOE[1]], deg: phi };
    }
    _ank(u, phi) { return shoeMap(this.cfg(u, phi))(this.ANK); }
    phiLead(u) {
      const g = this.g;
      if (u < g.u_flat) return -this.phi_hs * Math.cos(0.5 * Math.PI * u / g.u_flat);
      if (u < g.u_heeloff) return 0;
      return this.phi_ps * Math.pow(Math.max(0, (u - g.u_heeloff) / (this.u_ps - g.u_heeloff)), 1.6);
    }
    kneeTarget(u) { return Math.max(this.kneeAtReach(this.g.reach_max), this._kneeData(u)); }
    _kneeData(u) {
      const g = this.g;
      if (u < 0.2) return g.knee_hs + (g.knee_load - g.knee_hs) * Math.sin(0.5 * Math.PI * u / 0.2);
      if (u < 0.5) return g.knee_load + (g.knee_mid - g.knee_load) * easeIO((u - 0.2) / 0.3);
      return g.knee_mid;
    }
    _hipFromLead(u, phi) { phi = phi === undefined ? this.phiLead(u) : phi; const [ax, ay] = this._ank(u, phi), d = this.kneeReach(this.kneeTarget(u)); return ay - Math.sqrt(Math.max(d * d - ax * ax, 1e-6)); }
    static solve(f, target, lo, hi, it = 50) {
      let flo = f(lo) - target;
      for (let i = 0; i < it; i++) { const mid = 0.5 * (lo + hi), fm = f(mid) - target; if (fm * flo > 0) { lo = mid; flo = fm; } else hi = mid; }
      return 0.5 * (lo + hi);
    }
    _matchPhiPs() { const target = this._hipFromLead(0); return Gait.solve((ph) => -this._hipFromLead(this.u_ps, ph), -target, 0, 70); }
    _buildHip(n = 240) {
      const ys = [], cr = [], dmax = this.g.reach_max * this.L_LEG;
      for (let i = 0; i < n; i++) {
        const p = i / n, u = (p < 0.5 ? p : p - 0.5) / this.g.stance;
        ys.push(this._hipFromLead(u));
        const [ax, ay] = this._ank(u, this.phiLead(u)); cr.push(ay - Math.sqrt(Math.max(dmax * dmax - ax * ax, 1e-6)));
      }
      const a0 = ys.reduce((s, y) => s + y, 0) / n;
      const co = [2, 4, 6, 8, 10].map((k) => { let ak = 0, bk = 0; ys.forEach((y, i) => { ak += y * Math.cos(TAU * k * i / n); bk += y * Math.sin(TAU * k * i / n); }); return [k, 2 / n * ak, 2 / n * bk]; });
      this._hip = [a0, co];
      let shift = 0; cr.forEach((c, i) => { shift = Math.max(shift, c - this.hipY(i / n)); });
      this._hip = [a0 + shift, co]; this.hipRaw = ys; this.hipShift = shift;
    }
    hipY(p) { const [a0, co] = this._hip; let s = a0; for (const [k, ak, bk] of co) s += ak * Math.cos(TAU * k * p) + bk * Math.sin(TAU * k * p); return s; }
    stanceState(u, pLeg) {
      if (u <= this.u_ps) { const phi = this.phiLead(u); return [phi, this.cfg(u, phi)]; }
      const hip = [0, this.hipY(pLeg)], k = (u - this.u_ps) / (1 - this.u_ps);
      const sl = this.phi_ps * 1.6 / (this.u_ps - this.g.u_heeloff) * (1 - this.u_ps);
      let phi = hermite(this.phi_ps, this._phiTo(), sl, 0, k);
      const dmax = this.g.reach_max * this.L_LEG;
      if (dist(hip, this._ank(u, phi)) > dmax) phi = Gait.solve((ph) => -dist(hip, this._ank(u, ph)), -dmax, phi, 85);
      return [phi, this.cfg(u, phi)];
    }
    _phiTo() { if (this._pto === undefined) { const hip = [0, this.hipY(this.g.stance)]; this._pto = Gait.solve((ph) => this.plantar(hip, this._ank(1, ph), ph), this.g.plantar_to, 0, 85); } return this._pto; }
    footStancePt(p) { const u = clamp(p / this.g.stance, 0, 1), [phi, c] = this.stanceState(u, p); return [shoeMap(c)(this.ANK), phi]; }
    _swingEnds() {
      if (this._sw) return this._sw;
      const g = this.g, dp = 1e-3, dt = dp * g.T;
      const s0 = [0, 1].map((j) => this.footStancePt(g.stance - dp * j)), s1 = [0, 1].map((j) => this.footStancePt(dp * j));
      return (this._sw = { a0: s0[0][0], f0: s0[0][1], a1: s1[0][0], f1: s1[0][1],
        v0: [(s0[0][0][0] - s0[1][0][0]) / dt, (s0[0][0][1] - s0[1][0][1]) / dt], r0: (s0[0][1] - s0[1][1]) / dt,
        v1: [(s1[1][0][0] - s1[0][0][0]) / dt, (s1[1][0][1] - s1[0][0][1]) / dt] });
    }
    foot(p) {
      const g = this.g; p = ((p % 1) + 1) % 1;
      if (p < g.stance) { const u = p / g.stance, [phi, c] = this.stanceState(u, p); return { cfg: c, ankle: shoeMap(c)(this.ANK), phi, stance: true, u }; }
      const w = (p - g.stance) / (1 - g.stance), tsw = (1 - g.stance) * g.T, E = this._swingEnds();
      let x = hermite(E.a0[0], E.a1[0], E.v0[0] * tsw, E.v1[0] * tsw, w), y = hermite(E.a0[1], E.a1[1], E.v0[1] * tsw, E.v1[1] * tsw, w);
      y -= g.lift * Math.pow(Math.sin(Math.PI * Math.pow(w, g.lift_skew)), 2);
      const wf = g.swing_flat, phi = w < wf ? hermite(E.f0, 0, E.r0 * tsw, 0, w / wf) : hermite(0, E.f1, 0, 0, (w - wf) / (1 - wf));
      const hip = [0, this.hipY(p)], d = dist(hip, [x, y]), dmax = g.reach_max * this.L_LEG;
      if (d > dmax) { x = hip[0] + (x - hip[0]) * dmax / d; y = hip[1] + (y - hip[1]) * dmax / d; }
      return { cfg: { piv: this.ANK, at: [x, y], deg: phi }, ankle: [x, y], phi, stance: false, u: w };
    }
    arm(p, bag = false) {
      const g = this.g, b = this.b, amp = bag ? g.sh_amp_bag : g.sh_amp, c = -Math.cos(TAU * (p - g.arm_lag)), th = amp * c;
      const el = bag ? g.el_bag : g.el_back + (g.el_front - g.el_back) * (c + 1) / 2, S = b.shoulder;
      const E = [S[0] + b.upper * Math.sin(th * RAD), S[1] + b.upper * Math.cos(th * RAD)];
      const W = [E[0] + b.fore * Math.sin((th + el) * RAD), E[1] + b.fore * Math.cos((th + el) * RAD)];
      return [[S, E, W], th, el];
    }
    nod(p) { return this.g.nod_amp * Math.cos(2 * TAU * (p - this.g.nod_lag)); }
    pose(p) {
      p = ((p % 1) + 1) % 1;
      const hy = this.hipY(p), hip = [0, hy], near = this.foot(p), far = this.foot(p + 0.5);
      for (const f of [near, far]) { f.knee = ik(hip, f.ankle, this.TH, this.SH); f.flex = this.kneeFlex(hip, f.ankle); f.reach = dist(hip, f.ankle) / this.L_LEG; f.plantar = this.plantar(hip, f.ankle, f.phi); }
      return { p, hip, dy: hy - this.b.hip_y, near, far, lean: this.g.lean, nod: this.nod(p) };
    }
    report(n = 96) {
      const fr = []; for (let i = 0; i < n; i++) fr.push(this.pose(i / n));
      const hy = fr.map((f) => f.hip[1]);
      const sw = fr.map((f) => f.near).filter((s) => !s.stance), st = fr.map((f) => f.near).filter((s) => s.stance);
      const to = st.reduce((a, b) => (Math.abs(b.u - 0.99) < Math.abs(a.u - 0.99) ? b : a));
      let clr = 9; sw.forEach((s) => { if (s.u > 0.15 && s.u < 0.85) clr = Math.min(clr, this.SOLE - this.shoeMinY(s.cfg)); });
      return { bob: Math.max(...hy) - Math.min(...hy), reach: Math.max(...fr.map((f) => Math.max(f.near.reach, f.far.reach))), knee: Math.max(...sw.map((s) => s.flex)),
        plantar: to.plantar, clr, pen: Math.max(0, ...fr.map((f) => this.shoeMinY(f.near.cfg) - this.SOLE)) };
    }
  }

  /* ======================================================================
     RUANG 3D: port of motion-graphics scripts/ruang3d.py (bab 5.2)
     world in H: x east, y up, z north; ground y 0; azimuth from north clockwise
     ====================================================================== */
  function mkCam(pos, yaw, pitch, f, cx, cy, near = 1) {
    const cY = Math.cos(yaw * RAD), sY = Math.sin(yaw * RAD), cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
    return { pos, yaw, pitch, f, cx, cy, near, fwd: [sY * cp, -sp, cY * cp], right: [cY, 0, -sY], up: [sY * sp, cp, cY * sp] };
  }
  const camOrbit = (tg, d, h, az, pitch, f, cx, cy) => { const a = az * RAD; return mkCam([tg[0] + d * Math.sin(a), h, tg[2] + d * Math.cos(a)], (az + 180) % 360, pitch, f, cx, cy); };
  const camC = (c, P) => { const d = [P[0] - c.pos[0], P[1] - c.pos[1], P[2] - c.pos[2]]; return [dot3(d, c.right), dot3(d, c.up), dot3(d, c.fwd)]; };
  const scr = (c, q) => [clamp(c.cx + c.f * q[0] / q[2], -2e5, 2e5), clamp(c.cy - c.f * q[1] / q[2], -2e5, 2e5)];
  const horizonY = (c) => c.cy - c.f * Math.tan(c.pitch * RAD);
  const camHeight = (d, pitch, f, cy, solePx) => { const t = pitch * RAD, k = (solePx - cy) / f; return d * (Math.sin(t) + k * Math.cos(t)) / (Math.cos(t) - k * Math.sin(t)); };
  const sunDir = (az, el) => [Math.sin(az * RAD) * Math.cos(el * RAD), Math.sin(el * RAD), Math.cos(az * RAD) * Math.cos(el * RAD)];
  const light2d = (c, s) => { const lx = dot3(s, c.right), ly = dot3(s, c.up), n = Math.hypot(lx, ly) || 1; return [lx / n, ly / n]; };
  const hazeT = (d, d0 = 15, D = 400, tmax = 0.6) => (d <= d0 ? 0 : tmax * (1 - Math.exp(-(d - d0) / D)));
  function clipNear(cs, near) {
    const out = [], n = cs.length;
    for (let i = 0; i < n; i++) { const a = cs[i], b = cs[(i + 1) % n], ia = a[2] >= near, ib = b[2] >= near; if (ia) out.push(a); if (ia !== ib) { const t = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } }
    return out;
  }
  const polyScr = (c, pts3) => { const cs = clipNear(pts3.map((P) => camC(c, P)), c.near); return cs.length < 3 ? null : cs.map((q) => scr(c, q)); };
  const groundScr = (c, xz) => polyScr(c, xz.map((p) => [p[0], 0, p[1]]));
  function ellipseXZ(cx, cz, a, b, ang = 0, n = 40, wob = 0, seed = 0) {
    const r = rng(seed + 1), ph = [r() * TAU, r() * TAU], ca = Math.cos(ang), sa = Math.sin(ang), out = [];
    for (let i = 0; i < n; i++) { const t = TAU * i / n, k = 1 + wob * (0.6 * Math.sin(3 * t + ph[0]) + 0.4 * Math.sin(5 * t + ph[1])), u = a * k * Math.cos(t), v = b * k * Math.sin(t); out.push([cx + u * ca - v * sa, cz + u * sa + v * ca]); }
    return out;
  }
  function stripXZ(pts, wd) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)], d = [b[0] - a[0], b[1] - a[1]], m = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / m, d[0] / m]; L.push([pts[i][0] + n[0] * wd / 2, pts[i][1] + n[1] * wd / 2]); R.push([pts[i][0] - n[0] * wd / 2, pts[i][1] - n[1] * wd / 2]); }
    return L.concat(R.reverse());
  }
  function pnoise(r, k) { const vals = Array.from({ length: k }, () => r()); return (u) => { const x = (((u % 1) + 1) % 1) * k, i = Math.floor(x), t = x - i, t2 = (1 - Math.cos(Math.PI * t)) / 2; return vals[i % k] * (1 - t2) + vals[(i + 1) % k] * t2; }; }
  const softabs = (d, c) => Math.sqrt(d * d + c * c) - c;
  function mtProfile(seed, n, base, amp, o = {}) {
    const octs = o.octs || [[5, 1], [11, 0.5], [23, 0.26], [47, 0.14], [97, 0.07], [193, 0.035]], power = o.power || 1.3;
    const r = rng(seed), fs = octs.map(([k, a]) => [pnoise(r, k), a]), tot = octs.reduce((s, x) => s + x[1], 0), rough = [[61, 1], [131, 0.5], [263, 0.25]].map(([k, a]) => [pnoise(r, k), a]);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const az = 360 * i / n, u = az / 360, v = fs.reduce((s, [f, a]) => s + f(u) * a, 0) / tot, rr = rough.reduce((s, [f, a]) => s + f(u) * a, 0) / 1.75 - 0.5;
      let h = base + amp * Math.pow(v, power);
      for (const [az0, hp, w, cap] of o.peaks || []) { const d = softabs(((az - az0 + 540) % 360) - 180, cap * w); if (d < w) { const k = 1 - d / w; h = Math.max(h, hp * (0.42 * k + 0.58 * Math.pow(k, 2.4)) * (1 + 0.1 * rr * (1 - k))); } }
      for (const [az0, hv, w] of o.volcanoes || []) { const dd = ((az - az0 + 540) % 360) - 180, d = softabs(dd, 0.07 * w); if (d < w) { const k = 1 - d / w; let vv = hv * Math.pow(k, 1.75) * (1 + 0.05 * rr * (1 - k) * 4); vv -= hv * 0.018 * Math.exp(-Math.pow(dd / (0.05 * w), 2)); h = Math.max(h, vv); } }
      out.push([az, h + amp * 0.035 * rr]);
    }
    return out;
  }
  function ringScr(c, R, prof, margin = 0.35) {
    const n = prof.length, top = [], bot = [], vis = [];
    for (const [az, h] of prof) { const a = az * RAD, x = R * Math.sin(a), z = R * Math.cos(a), t = camC(c, [x, h, z]), b = camC(c, [x, 0, z]); top.push(t); bot.push(b); vis.push(t[2] > margin * R && b[2] > margin * R); }
    if (!vis.some(Boolean)) return null;
    let idx;
    if (vis.every(Boolean)) idx = [...Array(n).keys()];
    else { const s0 = vis.indexOf(false), runs = []; let cur = []; for (let k = 0; k < n; k++) { const i = (s0 + k) % n; if (vis[i]) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } } if (cur.length) runs.push(cur); idx = runs.reduce((a, b) => (b.length > a.length ? b : a)); }
    if (idx.length < 2) return null;
    return idx.map((i) => scr(c, top[i])).concat(idx.slice().reverse().map((i) => scr(c, bot[i])));
  }

  /* ======================================================================
     TUBUH 3D dari pose: port of motion-graphics scripts/bayangan3d.py (bab 5.3)
     body coords (xs forward, ys down from top of head, l lateral + = right of the figure); sole at ys = sole
     The pose (legs, arms, lean, nod, head yaw) drives two things: capsule prims for the cast shadow and
     contact, and a stylised vector character (mesh parts, flat 3-tone shading, ink rim) for the picture.
     ====================================================================== */
  const PRIM = { torso: [[0, 1.62], [0, 3.0], 0.34], neck: [[0, 1.0], [-0.02, 1.4], 0.12], head: [[0.04, 0.55], 0.5], chin: [0, 1.0], lean_piv: [0, 2.9],
    thigh_r: 0.21, shin_r: 0.15, foot_r: 0.1, upper_r: 0.11, fore_r: 0.09, hand_r: 0.1, lat_hip: 0.16, lat_sh: 0.42 };
  // character proportions: classical adult canon of 7.5 heads on the 5.78 H body (one head HD = 0.771 H). Landmarks in heads
  // from the crown: chin 1, nipples 2, navel 3, crotch 3.75 (half the height), knee 5.625 (a quarter of the height above the floor).
  // Widths: shoulders 2 heads outside the deltoids, hips 1.5, neck 0.5 (0.3 long); chest depth 0.75 of the chest width; foot 1.1.
  // Arms: upper arm 1.5 heads from the shoulder top, forearm + hand 1.9; elbow at the waist, wrist at the crotch, fingertips mid-thigh.
  // The legs walk on a scaled copy of the gait engine (same angles and timing, longer bones, bigger shoe).
  const HD = 5.78 / 7.5;
  const FIG = { hc: [0.03, 0.41], A: 0.3, Ab: 0.34, B: 0.265, C: 0.36, chin: [0.03, 0.74], HIP: 2.78, lean_piv: [0, 2.6],
    hipLat: 0.3, sh: [-0.03, 1.25], shLat: 0.6, upper: 0.95, fore: 0.75, hand: 0.68 };
  const FKS = 1.6, FLEG = { thigh: 1.54, shin: 1.272 }, FKL = (FLEG.thigh + FLEG.shin) / (BODY.thigh + BODY.shin);
  const FIG_BODY = { thigh: FLEG.thigh, shin: FLEG.shin, hip_y: FIG.HIP, sole_y: BODY.sole_y,
    ankle_local: BODY.ankle_local.map((v) => v * FKS), heel_local: BODY.heel_local.map((v) => v * FKS), toe_local: BODY.toe_local.map((v) => v * FKS),
    shoe: BODY.shoe.map((p) => p.map((v) => v * FKS)), shoulder: FIG.sh, upper: FIG.upper, fore: FIG.fore };
  const FIG_GAIT = { step: GDEF.step * FKL, lift: GDEF.lift * FKL };
  const figGait = () => new Gait(FIG_BODY, FIG_GAIT);
  const FCOL = { skin: "#f0b892", skinD: "#c98663", hair: "#3b2620", hairL: "#7a5040", top: "#d8693f", pants: "#2d4068", shoe: "#f3eee4", sole: "#4b4352", eye: "#241a22", lip: "#a8483f", blush: "#f08a78", ink: "#1f1526" };
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm3 = (a) => { const m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; };
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  // point on the bone a -> b (body xy, lateral la -> lb) at u, pushed k off the axis along the in-plane normal (+ = behind a hanging bone)
  const segPt = (a, b, u, k, la, lb) => { const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; return [lerp(a[0], b[0], u) - dy / m * k, lerp(a[1], b[1], u) + dx / m * k, lerp(la, lb, u)]; };

  // pose builders: walking (from the scaled gait engine) and standing (orbit hero)
  function figWalk(gt, p) {
    const pz = gt.pose(p), U = (q) => { const r = rotAbout(q, FIG.lean_piv, pz.lean); return [r[0], r[1] + pz.dy]; };
    const hy = pz.hip[1], legs = [];
    // walking narrows the base: knees and ankles come in towards the line of progress
    for (const [leg, s] of [[pz.near, 1], [pz.far, -1]]) { const f = shoeMap(leg.cfg); legs.push({ s, lat: FIG.hipLat * s, latK: 0.2 * s, latA: 0.15 * s, toeLat: 0.19 * s, hip: [0, hy], knee: leg.knee, ankle: leg.ankle, heel: f(gt.HEEL), toe: f(gt.TOE) }); }
    const arms = [[0, 1], [0.5, -1]].map(([side, s]) => { const [S, E, W] = gt.arm(p + side)[0]; return { s, S, E, W, lat: [FIG.shLat * s, 0.66 * s, 0.7 * s] }; });
    return { legs, arms, U, nod: pz.nod, yaw: 0 };
  }
  function figStand(t) {
    const br = 0.006 * Math.sin(t * TAU / 4.2), hy = FIG.HIP + br, legs = [], B = FIG_BODY;
    const ank = [0, B.sole_y + B.ankle_local[1]], heel = [B.heel_local[0] - B.ankle_local[0], B.sole_y], toe = [B.toe_local[0] - B.ankle_local[0], B.sole_y + B.toe_local[1]];
    const knee = ik([0, hy], ank, B.thigh, B.shin, true);
    for (const s of [1, -1]) legs.push({ s, lat: FIG.hipLat * s, latK: 0.2 * s, latA: 0.17 * s, toeLat: 0.25 * s, hip: [0, hy], knee, ankle: ank, heel, toe });
    const U = (q) => [q[0], q[1] + br];
    // relaxed arms: elbow a touch behind the shoulder, forearm slightly forward, hanging a little away from the body
    const arms = [1, -1].map((s) => { const S = B.shoulder, E = [S[0] - 0.035, S[1] + Math.sqrt(B.upper * B.upper - 0.035 * 0.035)], W = [E[0] + B.fore * Math.sin(9 * RAD), E[1] + B.fore * Math.cos(9 * RAD)]; return { s, S, E, W, lat: [FIG.shLat * s, 0.665 * s, 0.705 * s] }; });
    // weight shift and a slow look around: the face turns with the head
    return { legs, arms, U, nod: 1.2 * Math.sin(t * TAU / 5.3), yaw: 22 * Math.sin(t * TAU / 9.5) };
  }
  // landmarks of a pose in heads from the crown (used by the proportion test page)
  function figMeasure(J) {
    const A = J.arms[0], U = J.U, S = U(A.S), E = U(A.E), W = U(A.W), d = nrm3(sub3([...W, A.lat[2]], [...E, A.lat[1]])), L = J.legs[0];
    return { chin: (FIG.hc[1] + FIG.C) / HD, knee: L.knee[1] / HD, elbow: E[1] / HD, wrist: W[1] / HD, finger: (W[1] + d[1] * (FIG.hand - 0.05)) / HD,
      upper: (E[1] - (S[1] - 0.135)) / HD, forehand: (FIG.fore + FIG.hand - 0.05) / HD, neckLen: (1.0 - (FIG.hc[1] + FIG.C)) / HD,
      foot: (dist(L.heel, L.toe) + 0.03) / HD };
  }
  // head frame: local (x fwd, y down, l lat) about the head centre -> yaw -> nod about the chin -> upper-body lean/bob
  const headFn = (J) => { const a = J.yaw * RAD, c = Math.cos(a), s = Math.sin(a); return (q) => { const x = q[0] * c - q[2] * s, l = q[0] * s + q[2] * c, r = J.U(rotAbout([FIG.hc[0] + x, FIG.hc[1] + q[1]], FIG.chin, J.nod)); return [r[0], r[1], l]; }; };
  // capsule prims for the cast shadow / contact (same pose, same volumes as the picture)
  function figPrims(J) {
    const out = [], U = J.U, H = headFn(J);
    for (const L of J.legs) {
      out.push(["cap", [...L.hip, L.lat], [...L.knee, L.latK], 0.24, "pants"]);
      out.push(["cap", [...L.knee, L.latK], [...L.ankle, L.latA], 0.15, "pants"]);
      out.push(["cap", [L.heel[0], L.heel[1] - 0.11, L.latA], [L.toe[0], L.toe[1] - 0.08, L.toeLat], 0.13, "shoe"]);
    }
    for (const l of [-0.24, 0.24]) out.push(["cap", [...U([0, 1.3]), l], [...U([0, 2.7]), l], 0.32, "top"]);
    out.push(["cap", [...U([0, 0.7]), 0], [...U([-0.03, 1.1]), 0], 0.19, "skin"]);
    out.push(["sph", H([0, 0, 0]), 0.36, "head"]);
    out.push(["sph", H([-0.03, -0.04, 0]), 0.38, "hair"]);
    for (const A of J.arms) {
      const S = U(A.S), E = U(A.E), W = U(A.W), d = nrm3(sub3([...W, 0], [...E, 0]));
      out.push(["cap", [...S, A.lat[0]], [...E, A.lat[1]], 0.14, "top"]);
      out.push(["cap", [...E, A.lat[1]], [...W, A.lat[2]], 0.1, "skin"]);
      out.push(["sph", [W[0] + d[0] * 0.3, W[1] + d[1] * 0.3, A.lat[2]], 0.12, "skin"]);
    }
    out.pose = J;
    return out;
  }
  const walkPrims = (gt, p) => figPrims(figWalk(gt, p));
  const standPrims = (t) => figPrims(figStand(t));

  // ---- mesh parts ----
  // tube through control rings {c, a (lateral half), b (other half)}; optional rounded caps; superellipse power pw
  function tubeGrid(ctrl, cols, caps = [false, false], pw = 2) {
    const n = ctrl.length;
    let rings = ctrl.map((k, i) => ({ c: k.c, a: k.a, b: k.b, t: nrm3(sub3(ctrl[Math.min(n - 1, i + 1)].c, ctrl[Math.max(0, i - 1)].c)) }));
    const capR = (k, dir) => [[0.5, 0.87], [0.82, 0.57], [0.97, 0.22]].map(([o, s]) => ({ c: add3(k.c, k.t, dir * o * (k.a + k.b) / 2), a: k.a * s, b: k.b * s, t: k.t }));
    if (caps[0]) rings = capR(rings[0], -1).reverse().concat(rings);
    if (caps[1]) rings = rings.concat(capR(rings[rings.length - 1], 1));
    const pts = [], ex = 2 / pw;
    for (const r of rings) {
      let L = Math.abs(r.t[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]; const d = dot3(L, r.t); L = nrm3([L[0] - d * r.t[0], L[1] - d * r.t[1], L[2] - d * r.t[2]]); const V = cross3(r.t, L);
      for (let j = 0; j < cols; j++) { const th = TAU * j / cols, c = Math.cos(th), s = Math.sin(th), cx = Math.sign(c) * Math.pow(Math.abs(c), ex), sy = Math.sign(s) * Math.pow(Math.abs(s), ex); pts.push([r.c[0] + L[0] * r.a * cx + V[0] * r.b * sy, r.c[1] + L[1] * r.a * cx + V[1] * r.b * sy, r.c[2] + L[2] * r.a * cx + V[2] * r.b * sy]); }
    }
    return { pts, rows: rings.length, cols };
  }
  const gridFn = (rows, cols, fn) => { const pts = []; for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pts.push(fn(i, j)); return { pts, rows, cols }; };
  // head surface (local, centred): rounder skull, jaw narrowing to a soft chin
  function headS(th, ph) {
    const st = Math.sin(th), ct = Math.cos(th), cp = Math.cos(ph), sp = Math.sin(ph), q = th / Math.PI;
    const jaw = 1 - 0.24 * smooth01((q - 0.5) / 0.5) - 0.05 * smooth01((q - 0.2) / 0.3) * Math.max(0, -cp);
    const A = cp > 0 ? FIG.A : FIG.Ab;
    return [A * st * cp * jaw + 0.035 * smooth01((q - 0.66) / 0.3) * Math.max(0, cp), -FIG.C * ct, FIG.B * st * sp * jaw];
  }
  // hairline: forehead in front, above the ears at the side, nape at the back; side-swept fringe
  function hairMax(ph) {
    const w = ((ph % TAU) + TAU) % TAU, u = Math.min(w, TAU - w) / Math.PI;
    let m = lerp(0.35, 0.53, smooth01(u / 0.3)); m = lerp(m, 0.8, smooth01((u - 0.55) / 0.4));
    // fringe swept to one side, ragged tufts along the edge (front and nape)
    const fr = Math.max(0, 1 - u / 0.42), sw = Math.sin(ph);
    m += fr * (0.02 + 0.07 * smooth01((sw + 0.25) / 1.0));
    m += 0.075 * Math.exp(-Math.pow((u - 0.41) / 0.045, 2)) - 0.03 * Math.exp(-Math.pow((u - 0.52) / 0.06, 2));
    const tuft = Math.abs(Math.sin(ph * 9 + 0.4)); m += (fr + smooth01((u - 0.7) / 0.3)) * 0.045 * (1 - tuft * tuft);
    return m * Math.PI;
  }
  function hairS(th, ph) {
    const p = headS(th, ph), cp = Math.cos(ph), q = th / Math.PI, top = Math.max(0, Math.cos(th));
    const vol = 0.05 + 0.065 * Math.pow(top, 1.4) + 0.07 * Math.exp(-Math.pow((q - 0.19) / 0.12, 2)) * Math.pow(Math.max(0, cp), 2) + 0.03 * Math.max(0, -cp) * smooth01((q - 0.3) / 0.3);
    return [p[0] * (1 + vol) - 0.012 * top, p[1] * (1 + vol) - 0.02, p[2] * (1 + vol)];
  }
  const surfFrame = (fn, th, ph) => { const e = 0.01, P = fn(th, ph), Tp = nrm3(sub3(fn(th, ph + e), fn(th, ph - e))), Tt = nrm3(sub3(fn(th + e, ph), fn(th - e, ph))); let n = nrm3(cross3(Tt, Tp)); if (dot3(n, P) < 0) n = [-n[0], -n[1], -n[2]]; return { P, Tp, Tt, n }; };

  // draw one mesh: union silhouette (ink rim by stroke-then-fill), shadow side and lit side clipped at the terminator
  function drawMesh(g, cam, M, sun, col, o = {}) {
    const { rows, cols, pts: P } = M, N = rows * cols, S = new Array(N);
    for (let i = 0; i < N; i++) { const q = camC(cam, P[i]); if (q[2] < cam.near) return; S[i] = scr(cam, q); }
    const VN = new Float64Array(N * 3), Q = [];
    let cen = [0, 0, 0]; for (const p of P) cen = add3(cen, p, 1 / N);
    let sgn = 0;
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols; j++) {
      const a = i * cols + j, b = (i + 1) * cols + j, c = (i + 1) * cols + ((j + 1) % cols), d = i * cols + ((j + 1) % cols);
      const n = cross3(sub3(P[c], P[a]), sub3(P[d], P[b])), m = [(P[a][0] + P[c][0]) / 2, (P[a][1] + P[c][1]) / 2, (P[a][2] + P[c][2]) / 2];
      sgn += dot3(n, sub3(m, cen)); Q.push([a, b, c, d, n, m]);
    }
    sgn = sgn < 0 ? -1 : 1;
    for (const q of Q) { q[4] = [q[4][0] * sgn, q[4][1] * sgn, q[4][2] * sgn]; for (let k = 0; k < 4; k++) { const v = q[k] * 3; VN[v] += q[4][0]; VN[v + 1] += q[4][1]; VN[v + 2] += q[4][2]; } }
    const lam = new Float64Array(N); for (let i = 0; i < N; i++) { const n = nrm3([VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2]]); lam[i] = dot3(n, sun); }
    const addPoly = (pp) => { if (pp.length < 3) return; let A = 0; for (let k = 0; k < pp.length; k++) { const p1 = pp[k], p2 = pp[(k + 1) % pp.length]; A += p1[0] * p2[1] - p2[0] * p1[1]; } if (A < 0) pp = pp.slice().reverse(); g.moveTo(pp[0][0], pp[0][1]); for (let k = 1; k < pp.length; k++) g.lineTo(pp[k][0], pp[k][1]); g.closePath(); };
    const vis = Q.map((q) => dot3(q[4], sub3(q[5], cam.pos)) < 0);
    const want = (k) => (o.face === "front" ? vis[k] : o.face === "back" ? !vis[k] : true);
    g.beginPath(); Q.forEach((q, k) => { if (want(k)) addPoly([S[q[0]], S[q[1]], S[q[2]], S[q[3]]]); });
    if (o.ink !== false && o.lw > 0) { g.lineJoin = "round"; g.lineWidth = o.lw * 2; g.strokeStyle = o.inkCol || rgba(FCOL.ink, 0.62); g.stroke(); }
    g.fillStyle = col; g.fill();
    if (o.face === "back") return;
    // clip each visible quad where f(vertex) <= 0, f linear along the edges
    const band = (f, fill) => {
      g.beginPath();
      Q.forEach((q, k) => {
        if (!vis[k]) return;
        const v = [f(q[0]), f(q[1]), f(q[2]), f(q[3])];
        if (v[0] > 0 && v[1] > 0 && v[2] > 0 && v[3] > 0) return;
        const out = [];
        for (let e = 0; e < 4; e++) { const fa = v[e], fb = v[(e + 1) % 4], A = S[q[e]], B = S[q[(e + 1) % 4]]; if (fa <= 0) out.push(A); if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } }
        addPoly(out);
      });
      g.fillStyle = fill; g.fill();
    };
    const thr = o.thr === undefined ? 0.02 : o.thr;
    // soft: rim factor per vertex (1 at the silhouette, 0 facing the camera) for rim and bounce light
    let fr = null;
    if (o.soft || o.rim) { fr = new Float64Array(N); for (let i = 0; i < N; i++) { const n = nrm3([VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2]]); fr[i] = 1 + dot3(n, nrm3(sub3(P[i], cam.pos))); } }
    if (o.soft) band((i) => 0.45 - lam[i], rgba(mix(col, "#fff3d6", 0.25), 0.22));
    band((i) => lam[i] - thr, o.dark || mix(col, "#4a2848", 0.3));
    if (o.soft) { band((i) => lam[i] + 0.38, rgba(mix(col, "#2a1530", 0.55), 0.32)); band((i) => Math.max(0.84 - fr[i], lam[i] + 0.05), rgba(mix(col, "#ffb27a", 0.35), 0.28)); }
    if (o.light !== false) band((i) => (o.lthr || 0.8) - lam[i], o.lightCol || rgba(mix(col, "#fff3d6", 0.5), 0.45));
    if (fr) band((i) => Math.max(0.84 - fr[i], -0.05 - lam[i]), rgba(mix(col, "#fff6e0", 0.6), 0.34));
  }

  // the character, drawn back to front from the pose
  function drawFigure(g, cam, J, base, face, sole, sun) {
    const Wd = (q) => toWorld(q, base, face, sole), Wg = (gr) => ({ pts: gr.pts.map(Wd), rows: gr.rows, cols: gr.cols });
    const latW = [Math.cos(face * RAD), 0, -Math.sin(face * RAD)], latFar = dot3(latW, cam.fwd), U = J.U, H = headFn(J);
    const zOf = (q) => camC(cam, Wd(q))[2];
    const pxu = cam.f / Math.max(cam.near, zOf(U([0, 2.5]))), lw = clamp(0.016 * pxu, 0.45, 2.1);
    // soft shading: core shadow, half-light, highlight, rim light and warm bounce light on top of the 3 tones
    const O = { lw, soft: true };
    // legs: sole, shoe, trouser leg (thigh, knee, calf bulge behind the shin, ankle; the hem falls over the shoe)
    const legGroup = (L) => () => {
      const dir2 = (() => { const d = [L.toe[0] - L.heel[0], L.toe[1] - L.heel[1]], m = Math.hypot(d[0], d[1]) || 1; return [d[0] / m, d[1] / m]; })(), up2 = [dir2[1], -dir2[0]];
      const sp = (p2, along, upk, l) => [p2[0] + dir2[0] * along + up2[0] * upk, p2[1] + dir2[1] * along + up2[1] * upk, l];
      const lh = L.latA, lt = L.toeLat;
      const so = tubeGrid([{ c: sp(L.heel, 0.1, 0.027, lh), a: 0.15, b: 0.03 }, { c: sp(L.heel, 0.42, 0.027, lerp(lh, lt, 0.4)), a: 0.165, b: 0.03 }, { c: sp(L.toe, -0.1, 0.025, lt), a: 0.152, b: 0.028 }], 14, [true, true]);
      drawMesh(g, cam, Wg(so), sun, FCOL.sole, { lw, light: false });
      const shoe = tubeGrid([{ c: sp(L.heel, 0.12, 0.15, lh), a: 0.14, b: 0.14 }, { c: sp(L.heel, 0.45, 0.135, lerp(lh, lt, 0.4)), a: 0.163, b: 0.13 }, { c: sp(L.toe, -0.13, 0.088, lt), a: 0.148, b: 0.082 }], 16, [true, true]);
      drawMesh(g, cam, Wg(shoe), sun, FCOL.shoe, O);
      const hip = [...L.hip, L.lat], kn = [...L.knee, L.latK];
      const T = (u, k) => segPt(L.hip, L.knee, u, k, L.lat, L.latK), Sh = (u, k) => segPt(L.knee, L.ankle, u, k, L.latK, L.latA);
      const leg = tubeGrid([{ c: T(0, 0.03), a: 0.28, b: 0.31 }, { c: T(0.18, 0.025), a: 0.265, b: 0.29 }, { c: T(0.42, -0.005), a: 0.235, b: 0.255 },
        { c: T(0.7, -0.01), a: 0.2, b: 0.212 }, { c: T(0.92, 0), a: 0.172, b: 0.178 }, { c: kn, a: 0.165, b: 0.17 },
        { c: Sh(0.14, 0.02), a: 0.165, b: 0.178 }, { c: Sh(0.33, 0.04), a: 0.168, b: 0.188 }, { c: Sh(0.58, 0.022), a: 0.142, b: 0.15 },
        { c: Sh(0.82, 0.005), a: 0.12, b: 0.124 }, { c: Sh(1, 0), a: 0.115, b: 0.118 }, { c: Sh(1.07, -0.01), a: 0.125, b: 0.13 }], 18);
      void hip;
      drawMesh(g, cam, Wg(leg), sun, FCOL.pants, O);
    };
    // arms: tapered skin tube (deltoid, biceps, elbow, forearm bulge, flat wrist), mitten hand with the palm to the thigh, short sleeve
    const armGroup = (A) => () => {
      const S2 = U(A.S), E2 = U(A.E), W2 = U(A.W), S = [...S2, A.lat[0]], E = [...E2, A.lat[1]], Wr = [...W2, A.lat[2]], d = nrm3(sub3(Wr, E));
      const Up = (u, k) => segPt(S2, E2, u, k, A.lat[0], A.lat[1]), Fo = (u, k) => segPt(E2, W2, u, k, A.lat[1], A.lat[2]);
      const arm = tubeGrid([{ c: S, a: 0.135, b: 0.145 }, { c: Up(0.12, 0), a: 0.158, b: 0.16 }, { c: Up(0.32, 0), a: 0.152, b: 0.158 }, { c: Up(0.55, -0.014), a: 0.135, b: 0.142 }, { c: Up(0.85, 0), a: 0.112, b: 0.118 }, { c: E, a: 0.104, b: 0.11 },
        { c: Fo(0.15, -0.01), a: 0.122, b: 0.13 }, { c: Fo(0.4, -0.004), a: 0.108, b: 0.112 }, { c: Fo(0.72, 0), a: 0.084, b: 0.088 }, { c: Wr, a: 0.06, b: 0.082 }], 14);
      drawMesh(g, cam, Wg(arm), sun, FCOL.skin, O);
      const fw = [1, 0, 0], inw = [0, 0, -Math.sign(A.lat[0])], hp = (u, f = 0, i = 0) => add3(add3(add3(Wr, d, u), fw, f), inw, i);
      const hand = tubeGrid([{ c: hp(0.05), a: 0.052, b: 0.095 }, { c: hp(0.22, 0.005), a: 0.062, b: 0.12 }, { c: hp(0.42, 0.012, 0.008), a: 0.052, b: 0.11 }, { c: hp(0.57, 0.03, 0.02), a: 0.04, b: 0.09 }], 12, [true, true]);
      const thumb = tubeGrid([{ c: hp(0.1, 0.07, 0.01), a: 0.034, b: 0.034 }, { c: hp(0.25, 0.1, 0.025), a: 0.03, b: 0.029 }, { c: hp(0.34, 0.095, 0.035), a: 0.025, b: 0.025 }], 8, [false, true]);
      drawMesh(g, cam, Wg(thumb), sun, FCOL.skin, O);
      drawMesh(g, cam, Wg(hand), sun, FCOL.skin, O);
      const sleeve = tubeGrid([{ c: S, a: 0.14, b: 0.155 }, { c: Up(0.13, 0), a: 0.172, b: 0.175 }, { c: Up(0.26, 0), a: 0.17, b: 0.173 }, { c: Up(0.42, 0), a: 0.162, b: 0.166 }], 18, [true, false]);
      drawMesh(g, cam, Wg(sleeve), sun, FCOL.top, O);
    };
    const legs = J.legs.map((L) => ({ z: zOf([...L.knee, L.latK]), f: legGroup(L) })).sort((a, b) => b.z - a.z);
    const arms = J.hideArms ? [] : J.arms.map((A) => ({ z: zOf([...U(A.E), A.lat[1]]), far: A.s * latFar > 0.25, f: armGroup(A) })).sort((a, b) => b.z - a.z);
    arms.filter((a) => a.far).forEach((a) => a.f());
    legs.forEach((l) => l.f());
    // pelvis with the glutes (no rim: it merges into the trouser legs), neck, fitted shirt with chest, shoulder blades, waist and lumbar curve
    const ring = (x, y, a, b, l = 0) => ({ c: [...U([x, y]), l], a, b });
    drawMesh(g, cam, Wg(tubeGrid([ring(0.02, 2.3, 0.43, 0.285), ring(0.0, 2.52, 0.52, 0.315), ring(-0.03, 2.72, 0.575, 0.345), ring(-0.05, 2.84, 0.54, 0.35), ring(-0.05, 2.9, 0.33, 0.28)], 22, [false, false], 2.2)), sun, FCOL.pants, { lw, ink: false, soft: true });
    drawMesh(g, cam, Wg(tubeGrid([ring(0.01, 0.62, 0.16, 0.165), ring(-0.01, 0.8, 0.188, 0.18), ring(-0.03, 0.98, 0.198, 0.19), ring(-0.04, 1.1, 0.23, 0.21)], 14)), sun, mix(FCOL.skin, FCOL.skinD, 0.35), O);
    drawMesh(g, cam, Wg(tubeGrid([ring(-0.035, 0.99, 0.205, 0.19), ring(-0.04, 1.02, 0.31, 0.21), ring(-0.04, 1.06, 0.42, 0.24), ring(-0.035, 1.11, 0.52, 0.27), ring(-0.025, 1.18, 0.585, 0.31), ring(-0.005, 1.3, 0.55, 0.352), ring(0.04, 1.5, 0.51, 0.385),
      ring(0.045, 1.72, 0.475, 0.36), ring(0.035, 1.93, 0.435, 0.315), ring(0.025, 2.12, 0.415, 0.282), ring(0.022, 2.28, 0.44, 0.294), ring(0.018, 2.42, 0.485, 0.31)], 24, [false, false], 2.3)), sun, FCOL.top, O);
    // head group
    const hz = zOf(H([0, 0, 0])), Hg = (gr) => ({ pts: gr.pts.map((q) => Wd(H(q))), rows: gr.rows, cols: gr.cols });
    const hairG = Hg(gridFn(12, 32, (i, j) => { const ph = TAU * j / 32; return hairS(hairMax(ph) * i / 11, ph); }));
    const headG = Hg(gridFn(14, 24, (i, j) => headS(Math.PI * i / 13, TAU * j / 24)));
    const bits = [];
    for (const s of [1, -1]) {
      const F = surfFrame(headS, 0.555 * Math.PI, s * (Math.PI / 2 + 0.16)), c = add3(F.P, F.n, 0.012);
      bits.push({ z: zOf(H(c)), m: Hg(tubeGrid([{ c: add3(c, [0, -0.05, 0]), a: 0.034, b: 0.058 }, { c: add3(c, [0.0, 0.042, 0]), a: 0.032, b: 0.05 }], 10, [true, true])), col: FCOL.skin });
    }
    { const F = surfFrame(headS, 0.6 * Math.PI, 0), c = add3(F.P, F.n, 0.004); bits.push({ z: zOf(H(add3(c, [0.03, 0, 0]))), m: Hg(tubeGrid([{ c: add3(c, [-0.006, -0.035, 0]), a: 0.022, b: 0.02 }, { c: add3(c, [0.008, 0.012, 0]), a: 0.03, b: 0.028 }], 10, [true, true])), col: FCOL.skin, o: { lw, ink: false } }); }
    drawMesh(g, cam, hairG, sun, FCOL.hair, { lw, face: "back" });
    bits.filter((b) => b.z > hz).forEach((b) => drawMesh(g, cam, b.m, sun, b.col, b.o || O));
    drawMesh(g, cam, headG, sun, FCOL.skin, O);
    bits.filter((b) => b.z <= hz).forEach((b) => drawMesh(g, cam, b.m, sun, b.col, b.o || O));
    // face features on the head surface: foreshortened with the head, hidden when turned away
    const camP = cam.pos;
    const featVis = (F) => { const P = Wd(H(F.P)), n = sub3(Wd(H(add3(F.P, F.n, 0.05))), P); return -dot3(nrm3(n), nrm3(sub3(P, camP))); };
    const toS = (q) => { const c = camC(cam, Wd(H(q))); return c[2] < cam.near ? null : scr(cam, c); };
    const blob = (th, ph, du, dv, col, alpha) => { const F = surfFrame(headS, th, ph), fv = featVis(F); if (fv < 0.04) return; const pts = []; for (let k = 0; k < 14; k++) { const a = TAU * k / 14, q = add3(add3(add3(F.P, F.n, 0.004), F.Tp, du * Math.cos(a)), F.Tt, dv * Math.sin(a)), s = toS(q); if (!s) return; pts.push(s); } g.globalAlpha = alpha * clamp((fv - 0.04) * 5); g.fillStyle = col; g.beginPath(); lines(g, pts); g.fill(); g.globalAlpha = 1; };
    const stroke = (ths, phs, wd, col, alpha = 1) => { const F = surfFrame(headS, ths[1], phs[1]), fv = featVis(F); if (fv < 0.04) return; const pts = ths.map((th, k) => { const f = surfFrame(headS, th, phs[k]); return toS(add3(f.P, f.n, 0.004)); }); if (pts.some((p) => !p)) return; g.globalAlpha = alpha * clamp((fv - 0.04) * 5); g.strokeStyle = col; g.lineWidth = Math.max(0.6, wd * pxu); g.lineCap = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.quadraticCurveTo(2 * pts[1][0] - (pts[0][0] + pts[2][0]) / 2, 2 * pts[1][1] - (pts[0][1] + pts[2][1]) / 2, pts[2][0], pts[2][1]); g.stroke(); g.globalAlpha = 1; };
    const PI = Math.PI;
    for (const s of [1, -1]) {
      blob(0.62 * PI, s * 0.6, 0.055, 0.032, FCOL.blush, 0.34);
      blob(0.515 * PI, s * 0.37, 0.028, 0.042, FCOL.eye, 1);
      blob(0.503 * PI, s * 0.37 + 0.032, 0.01, 0.01, "#fffaf0", 0.95);
      stroke([0.45 * PI, 0.435 * PI, 0.445 * PI], [s * 0.19, s * 0.37, s * 0.54], 0.03, FCOL.hair, 0.95);
    }
    stroke([0.712 * PI, 0.726 * PI, 0.712 * PI], [-0.14, 0, 0.14], 0.018, FCOL.lip, 0.9);
    drawMesh(g, cam, hairG, sun, FCOL.hair, { lw, face: "front", lightCol: rgba(FCOL.hairL, 0.75), lthr: 0.55, rim: true });
    // strands: the side part sweeping into the fringe, and the crown falling to the nape
    const strand = (pts, col, wd) => {
      g.strokeStyle = col; g.lineWidth = Math.max(0.5, wd * pxu); g.lineCap = "round"; let on = false; g.beginPath();
      for (const [th, ph] of pts) { const F = surfFrame(hairS, th, ph), s = toS(add3(F.P, F.n, 0.004)), v = s && featVis(F) > 0.08; if (v) { on ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); on = true; } else on = false; }
      g.stroke();
    };
    const sCol = rgba(FCOL.hairL, 0.6), dCol = rgba("#170d10", 0.45);
    for (let k = 0; k < 5; k++) { const pe = -0.25 + k * 0.3, pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10, ph = lerp(-0.62 + k * 0.05, pe, smooth01(u)), th = lerp(0.07 * PI, hairMax(ph) * 0.96, Math.pow(u, 0.85)); pts.push([th, ph]); } strand(pts, k % 2 ? dCol : sCol, 0.012); }
    for (let k = 0; k < 6; k++) { const pe = PI + (k - 2.5) * 0.42, pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10, ph = lerp(PI + (k - 2.5) * 0.1, pe, u), th = lerp(0.1 * PI, hairMax(ph) * 0.95, u); pts.push([th, ph]); } strand(pts, k % 2 ? dCol : sCol, 0.011); }
    strand(Array.from({ length: 9 }, (_, i) => [lerp(0.04, 0.3, i / 8) * PI, -0.62 - i * 0.02]), rgba("#170d10", 0.6), 0.015);
    // near arms last
    arms.filter((a) => !a.far).forEach((a) => a.f());
  }
  const toWorld = (q, base, face, sole) => { const a = face * RAD, f = [Math.sin(a), Math.cos(a)], r = [Math.cos(a), -Math.sin(a)]; return [base[0] + q[0] * f[0] + q[2] * r[0], sole - q[1], base[1] + q[0] * f[1] + q[2] * r[1]]; };
  const groundOf = (P, sun) => { const k = P[1] / sun[1]; return [P[0] - sun[0] * k, P[2] - sun[2] * k]; };
  // perspective render of the body: every point projected, feet stay on their world points
  function drawPrims(g, cam, prims, base, face, sole, sun) { if (prims.pose) drawFigure(g, cam, prims.pose, base, face, sole, sun); }
  // ground-space shadow of the body: every point P -> G = P - sun * (P_y / sun_y); sphere -> ellipse, axis r / sin e along the sun
  function shadowShapes(prims, base, face, sole, sun) {
    const e = Math.asin(Math.max(1e-3, sun[1])), sh = [-sun[0], -sun[2]], m = Math.hypot(sh[0], sh[1]) || 1, ang = Math.atan2(sh[1] / m, sh[0] / m), out = [];
    for (const pr of prims) {
      if (pr[0] === "cap") {
        const A = groundOf(toWorld(pr[1], base, face, sole), sun), B = groundOf(toWorld(pr[2], base, face, sole), sun), r = pr[3];
        const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(d[0], d[1]);
        if (L < 1e-4) { out.push(ellipseXZ(A[0], A[1], r, r, 0, 20)); continue; }
        const a0 = Math.atan2(d[1], d[0]), pts = [];
        for (let k = 0; k <= 10; k++) { const t = a0 + Math.PI / 2 + Math.PI * k / 10; pts.push([A[0] + r * Math.cos(t), A[1] + r * Math.sin(t)]); }
        for (let k = 0; k <= 10; k++) { const t = a0 - Math.PI / 2 + Math.PI * k / 10; pts.push([B[0] + r * Math.cos(t), B[1] + r * Math.sin(t)]); }
        out.push(pts);
      } else { const G = groundOf(toWorld(pr[1], base, face, sole), sun); out.push(ellipseXZ(G[0], G[1], pr[2] / Math.sin(e), pr[2], ang, 24)); }
    }
    return out;
  }
  // contact occlusion under parts closer than h = 0.12 H to the ground
  function contactShapes(prims, base, face, sole, h = 0.12) {
    const out = [];
    for (const pr of prims) {
      if (pr[0] !== "cap" || !(sole - pr[1][1] < h + 0.1 && sole - pr[2][1] < h + 0.1)) continue;
      const A = toWorld(pr[1], base, face, sole), B = toWorld(pr[2], base, face, sole), lift = Math.min(A[1], B[1]) - pr[3];
      if (lift > h) continue;
      const k = 1 - clamp(lift / h), ln = Math.hypot(B[0] - A[0], B[2] - A[2]) / 2 + 0.1;
      out.push([ellipseXZ((A[0] + B[0]) / 2, (A[2] + B[2]) / 2, ln, 0.13, Math.atan2(B[2] - A[2], B[0] - A[0]), 24), k]);
    }
    return out;
  }
  const fillScr = (g, pts) => { if (!pts) return; g.beginPath(); lines(g, pts); g.fill(); };

  /* ======================================================================
     1 · PEGAS: overshoot / bounce graph editor (motion-graphics bab 2, 3, 6)
     ====================================================================== */
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => { let t = x; for (let i = 0; i < 10; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-7 || Math.abs(d) < 1e-7) break; t -= e / d; } return Y(clamp(t)); };
  }
  const EASES = {
    easy: { n: "Easy Ease", f: bez(1 / 3, 0, 2 / 3, 1), h: [1 / 3, 0, 2 / 3, 1] },
    inout: { n: "In-out", f: inout3, h: [0.65, 0, 0.35, 1] },
    outexpo: { n: "Out expo", f: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) },
    back: { n: "Back 1,4", f: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) },
    lin: { n: "Linear", f: (t) => t },
  };
  const timingName = (f) => (f <= 4 ? "tajam (2-4 f)" : f <= 10 ? "cepat (6-8 f)" : f <= 17 ? "normal (12-15 f)" : f <= 34 ? "berat (20-30 f)" : "dramatis (40 f+)");

  function pegas(el) {
    const st = { preset: "over", amp: 15, freq: 3, decay: 5, ease: "easy", dur: 12, prop: "skala", twos: false, onion: true };
    const PRE = { over: [15, 3, 5, "skala"], bounce: [80, 3, 8, "posisi"] };
    el.innerHTML = shell("ds-pegas",
      `<div class="ds-duo"><div class="ds-stage ds-pg-graph"><span class="ds-tag">Graph editor · value</span></div><div class="ds-stage ds-pg-prev"><span class="ds-tag">Pratinjau</span></div></div>`,
      UI.grp("Preset", UI.chips("preset", [["over", "Overshoot"], ["bounce", "Bounce"], ["free", "Bebas"]], st.preset)) +
      `<div class="ds-sls">${UI.slider("amp", "amp", 0, 120, 1, st.amp)}${UI.slider("freq", "freq", 0.5, 6, 0.1, st.freq)}${UI.slider("decay", "decay", 1, 12, 0.5, st.decay)}${UI.slider("dur", "Key", 2, 40, 1, st.dur)}</div>` +
      UI.grp("Easing menuju key terakhir", UI.chips("ease", Object.entries(EASES).map(([k, v]) => [k, v.n]), st.ease)) +
      UI.grp("Properti · gambar", `<div class="ds-flexrow">${UI.chips("prop", [["skala", "Skala %"], ["posisi", "Posisi px"]], st.prop)}${UI.tog("twos", "On twos", st.twos)}${UI.tog("onion", "Onion", st.onion)}</div>`),
      `<b>Catatan</b> Pantulan dihitung dari tiga angka: seberapa jauh melewati target, seberapa cepat bergetar, dan seberapa cepat meredam. Gerak cepat butuh 2-4 frame, gerak normal 6-8, gerak santai 12-15. Animasi kertas biasanya digambar 12 kali per detik.`);
    const G = cv2d($(".ds-pg-graph", el)), P = cv2d($(".ds-pg-prev", el));
    const LEAD = 8, POST = 40, TAIL = 10;
    let curve = [], yr = [0, 1], N = 0, info = ["", ""];
    const UNIT = () => (st.prop === "skala" ? 100 : 540);
    const valAt = (f) => { const t = (f - LEAD) / 24, Dk = st.dur / 24; if (t <= 0) return 0; if (t < Dk) return EASES[st.ease].f(t / Dk); const u = t - Dk; return 1 + st.amp * Math.sin(u * st.freq * TAU) / Math.exp(u * st.decay) / UNIT(); };
    const rebuild = () => {
      N = LEAD + st.dur + POST + TAIL; curve = [];
      for (let i = 0; i <= 600; i++) curve.push(valAt(N * i / 600));
      const mn = Math.min(0, ...curve), mx = Math.max(1, ...curve), pad = (mx - mn) * 0.12; yr = [mn - pad, mx + pad];
      outp(el, "amp", st.amp); outp(el, "freq", fmt(st.freq, 1)); outp(el, "decay", fmt(st.decay, 1)); outp(el, "dur", st.dur + " f");
      const peak = Math.max(...curve) - 1, u = UNIT();
      // settles when amp / exp(t decay) < 0.5 unit of the property
      info = [`key ${st.dur} f = ${fmt(st.dur / 24, 2)} s · ${timingName(st.dur)}`, `lewat target ${fmt(peak * u, 1)} ${st.prop === "skala" ? "%" : "px"} · tenang ±${fmt(Math.log(Math.max(1.0001, st.amp / 0.5)) / st.decay, 2)} s`];
    };
    bind(el, st, (k) => {
      if (k === "preset" && PRE[st.preset]) { [st.amp, st.freq, st.decay, st.prop] = PRE[st.preset]; ["amp", "freq", "decay"].forEach((q) => setSl(el, q, st[q])); setChip(el, "prop", st.prop); }
      if (k === "amp" || k === "freq" || k === "decay") { st.preset = "free"; setChip(el, "preset", "free"); }
      rebuild();
    });
    rebuild();
    let t = 0;
    const drawGraph = (fq) => {
      const g = G.fit(), w = G.w, h = G.h, L = 46, R = 14, T = 34, B = 28, X = (f) => L + (w - L - R) * f / N, Y = (v) => T + (h - T - B) * (1 - (v - yr[0]) / (yr[1] - yr[0]));
      g.fillStyle = "#080c1a"; g.fillRect(0, 0, w, h);
      g.lineWidth = 1;
      for (let f = 0; f <= N; f += 2) { g.strokeStyle = f % 12 === 0 ? "rgba(242,215,150,.13)" : f % 6 === 0 ? "rgba(242,215,150,.06)" : "rgba(242,215,150,.025)"; g.beginPath(); g.moveTo(X(f) + 0.5, T); g.lineTo(X(f) + 0.5, h - B); g.stroke(); if (f % 12 === 0) tag(g, f + "f", X(f), h - B + 15, K.muted, 9, "center"); }
      const u = UNIT(), stepV = st.prop === "skala" ? 25 : 135;
      for (let v = Math.ceil(yr[0] * u / stepV) * stepV; v <= yr[1] * u; v += stepV) { const y = Y(v / u); g.strokeStyle = v === 0 || v === u ? "rgba(242,215,150,.22)" : "rgba(242,215,150,.07)"; g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(w - R, y + 0.5); g.stroke(); tag(g, String(v), L - 6, y + 3, K.muted, 9, "right"); }
      tag(g, st.prop === "skala" ? "%" : "px", L - 6, T - 8, K.muted, 9, "right");
      if (w > 470) tag(g, "value + amp·sin(t·freq·2π)/exp(t·decay)", L + 4, T - 12, "rgba(242,215,150,.7)", 9.5);
      // curve: key segment then expression segment (after the last key)
      const k2 = LEAD + st.dur;
      const path = (f0, f1) => { g.beginPath(); for (let i = 0; i <= 600; i++) { const f = N * i / 600; if (f < f0 - 1e-9 || f > f1 + N / 600) continue; const x = X(f), y = Y(curve[i]); g.lineTo(x, y); } };
      g.save(); g.shadowColor = "rgba(242,215,150,.55)"; g.shadowBlur = 10;
      g.lineWidth = 2.2; g.strokeStyle = K.gold; path(0, k2); g.stroke();
      g.strokeStyle = K.gold2; path(k2, N); g.stroke(); g.restore();
      // bezier handles (AE influence)
      const hd = EASES[st.ease].h;
      if (hd) { g.strokeStyle = "rgba(244,236,216,.45)"; g.lineWidth = 1; const x0 = X(LEAD), x1 = X(k2), y0 = Y(0), y1 = Y(1); [[x0, y0, lerp(x0, x1, hd[0]), lerp(y0, y1, hd[1])], [x1, y1, lerp(x0, x1, hd[2]), lerp(y0, y1, hd[3])]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.fillStyle = K.ivory; g.beginPath(); g.arc(c, d, 2.6, 0, TAU); g.fill(); }); }
      // samples (on ones = every frame, on twos = held every 2 frames)
      const step = st.twos ? 2 : 1;
      g.fillStyle = "rgba(244,236,216,.75)";
      if (st.twos) { g.strokeStyle = "rgba(244,236,216,.32)"; g.lineWidth = 1; g.beginPath(); for (let f = 0; f <= N; f += 2) { const v = valAt(f); g.lineTo(X(f), Y(v)); g.lineTo(X(Math.min(N, f + 2)), Y(v)); } g.stroke(); }
      for (let f = 0; f <= N; f += step) { g.beginPath(); g.arc(X(f), Y(valAt(f)), st.twos ? 2.2 : 1.5, 0, TAU); g.fill(); }
      // keyframes
      for (const [f, v] of [[LEAD, 0], [k2, 1]]) { const x = X(f), y = Y(v); g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = K.night; g.strokeStyle = K.gold2; g.lineWidth = 1.5; g.fillRect(-4.5, -4.5, 9, 9); g.strokeRect(-4.5, -4.5, 9, 9); g.restore(); }
      tag(g, "key terakhir", X(k2) + 8, Y(1) - 10, K.gold2, 9);
      // playhead
      const px = X(fq); g.strokeStyle = "rgba(242,215,150,.9)"; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 0.5, T - 4); g.lineTo(px + 0.5, h - B); g.stroke();
      g.fillStyle = K.gold2; g.beginPath(); g.moveTo(px - 5, T - 9); g.lineTo(px + 5, T - 9); g.lineTo(px, T - 3); g.fill();
      g.fillStyle = K.ivory; g.beginPath(); g.arc(px, Y(valAt(fq)), 4, 0, TAU); g.fill();
    };
    const drawPrev = (fq) => {
      const g = P.fit(), w = P.w, h = P.h, u = UNIT(), step = st.twos ? 2 : 1;
      const bgG = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.5, Math.max(w, h) * 0.8); bgG.addColorStop(0, "#17224a"); bgG.addColorStop(1, "#070a16"); g.fillStyle = bgG; g.fillRect(0, 0, w, h);
      const ghosts = st.onion ? [3, 2, 1] : [];
      const draw = (v, a) => {
        g.globalAlpha = a;
        if (st.prop === "skala") {
          const R0 = Math.min(w, h) * 0.3, r = Math.max(0, R0 * v), cx = w < 460 ? Math.max(w / 2, w - R0 * 1.4 - 10) : w / 2, cy = h * 0.5;
          if (a === 1) { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(cx, cy + R0 * 1.12, r * 0.9, r * 0.16, 0, 0, TAU); g.fill(); }
          const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r + 0.01); gr.addColorStop(0, "#fff1c7"); gr.addColorStop(0.55, K.gold); gr.addColorStop(1, "#7d5c26");
          g.fillStyle = a === 1 ? gr : rgba(K.gold2, 1); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
          if (a === 1 && r > 6) { g.strokeStyle = "rgba(255,244,214,.55)"; g.lineWidth = Math.max(1, r * 0.04); g.beginPath(); g.arc(cx, cy, r * 0.72, 0, TAU); g.stroke(); }
        } else {
          const x0 = w * 0.16, x1 = w * 0.78, x = lerp(x0, x1, v), cw = Math.min(w * 0.16, 64, h * 0.32), ch = cw * 1.25, y = h * 0.6 - ch / 2;
          g.fillStyle = a === 1 ? K.gold : rgba(K.gold2, 1); g.beginPath(); g.roundRect ? g.roundRect(x - cw / 2, y, cw, ch, 6) : g.rect(x - cw / 2, y, cw, ch); g.fill();
          if (a === 1) { g.fillStyle = "rgba(7,10,20,.55)"; g.fillRect(x - cw * 0.3, y + ch * 0.2, cw * 0.6, 2); g.fillRect(x - cw * 0.3, y + ch * 0.32, cw * 0.38, 2); }
        }
        g.globalAlpha = 1;
      };
      if (st.prop === "posisi") { const x0 = w * 0.16, x1 = w * 0.78; g.strokeStyle = "rgba(242,215,150,.25)"; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(x1, h * 0.22); g.lineTo(x1, h * 0.78); g.stroke(); g.setLineDash([]); tag(g, "target", x1, h * 0.2, K.muted, 9, "center"); g.strokeStyle = "rgba(242,215,150,.12)"; g.beginPath(); g.moveTo(x0, h * 0.8); g.lineTo(w * 0.9, h * 0.8); g.stroke(); }
      ghosts.forEach((k) => { const f = fq - k * step; if (f >= 0) draw(valAt(f), 0.09 * (4 - k)); });
      draw(valAt(fq), 1);
      tag(g, `f ${String(Math.round(fq)).padStart(2, "0")} / ${N}`, 12, h - 14, K.gold2, 10);
      tag(g, st.twos ? "on twos · 12 gambar/s" : "on ones · 24 gambar/s", w - 12, h - 14, K.muted, 9.5, "right");
      tag(g, `${fmt(valAt(fq) * u, 1)} ${st.prop === "skala" ? "%" : "px"}`, 12, 22, K.ivory, 11);
      tag(g, info[0], 12, 38, K.gold2, 9); tag(g, info[1], 12, 52, K.muted, 9);
    };
    visLoop(el, (dt) => { t += dt; const tl = t % (N / 24), fq = st.twos ? Math.floor(tl * 12) * 2 : Math.floor(tl * 24); drawGraph(fq); drawPrev(fq); });
  }

  /* ======================================================================
     2 · PRINSIP: 12 principles with numbers, before / after (motion-graphics bab 2, 3.1, 4)
     ====================================================================== */
  function prinsip(el) {
    // periodic spring tables (scripts/pegas.py: pre-roll several cycles, keep the last one)
    const springTab = (drive, f, z, T, n = 480, cyc = 5) => { const w = TAU * f, dt = T / n; let x = 0, v = 0; const out = []; for (let i = 0; i < cyc * n; i++) { const a = -w * w * x - 2 * z * w * v + drive((i % n) / n); v += a * dt; x += v * dt; if (i >= (cyc - 1) * n) out.push(x); } return (p) => { const q = (((p % 1) + 1) % 1) * n, i = Math.floor(q), tt = q - i; return out[i % n] * (1 - tt) + out[(i + 1) % n] * tt; }; };
    // overlap: head path and its acceleration
    const OL = 2.4, headX = (t) => { t = ((t % OL) + OL) % OL; if (t < 0.6) return inout3(t / 0.6); if (t < 1.2) return 1; if (t < 1.8) return 1 - inout3((t - 1.2) / 0.6); return 0; };
    const headA = (p) => { const t = p * OL, h = 1 / 240; return (headX(t + h) - 2 * headX(t) + headX(t - h)) / (h * h); };
    const hairTab = springTab((p) => -1.1 * headA(p), 1.45, 0.33, OL);
    // secondary: walking-in-place sway 1 Hz, antenna spring 2.3 Hz zeta 0.14 driven by lateral acceleration
    const swayX = (p) => Math.sin(TAU * p), antTab = springTab((p) => -(-(TAU * TAU) * Math.sin(TAU * p)) * 0.9, 2.3, 0.14, 1);
    const ring = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const ballFill = (g, cx, cy, rx, ry, base) => { const r = Math.max(rx, ry), gr = g.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, r * 0.08, cx, cy, r); gr.addColorStop(0, mix(base, "#ffffff", 0.55)); gr.addColorStop(0.6, base); gr.addColorStop(1, mix(base, "#000000", 0.45)); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); };
    const eyes = (g, x, y, s, look = 0) => { for (const d of [-1, 1]) { g.fillStyle = "#0b0f1f"; g.beginPath(); g.ellipse(x + d * s * 0.9 + look * s * 0.4, y, s * 0.28, s * 0.42, 0, 0, TAU); g.fill(); } };
    const floor = (g, W, y) => {
      g.save(); g.translate(W / 2, y); g.scale(1, 0.22);
      const pool = g.createRadialGradient(0, 0, 4, 0, 0, W * 0.46); pool.addColorStop(0, "rgba(242,215,150,.14)"); pool.addColorStop(1, "rgba(242,215,150,0)");
      g.fillStyle = pool; g.beginPath(); g.arc(0, 0, W * 0.46, 0, TAU); g.fill(); g.restore();
      const ln = g.createLinearGradient(W * 0.06, 0, W * 0.94, 0); ln.addColorStop(0, "rgba(242,215,150,0)"); ln.addColorStop(0.5, "rgba(242,215,150,.45)"); ln.addColorStop(1, "rgba(242,215,150,0)");
      g.strokeStyle = ln; g.lineWidth = 1; g.beginPath(); g.moveTo(W * 0.06, y + 0.5); g.lineTo(W * 0.94, y + 0.5); g.stroke();
    };
    const bar = (g, W, H, segs, f, tot) => {
      const x0 = W * 0.08, x1 = W * 0.92, y = H - 20, X = (q) => lerp(x0, x1, q / tot);
      g.fillStyle = "rgba(242,215,150,.08)"; g.fillRect(x0, y, x1 - x0, 6);
      segs.forEach(([a, b, n, c]) => { g.fillStyle = c; g.fillRect(X(a), y, X(b) - X(a) - 1, 6); tag(g, n, (X(a) + X(b)) / 2, y - 5, K.muted, 8.5, "center"); });
      g.fillStyle = K.ivory; g.fillRect(X(f) - 1, y - 2, 2, 10);
    };
    const PR = [
      { id: "squash", n: "Squash & stretch", rule: "Volume tetap: x = 100 + (100 - y) × 0,5. Saat jatuh cepat bola memanjang searah gerak, saat menyentuh lantai memipih; kedip = mata di-squash jadi garis.", L: 1, draw(g, W, H, t, on, U) {
        const gy = H * 0.8, r = U * 0.95, u = (t % 1), hm = H * 0.5, hg = 4 * u * (1 - u) * hm, vy = 1 - 2 * u;
        g.fillStyle = "rgba(242,215,150,.22)"; for (let i = 1; i < 12; i++) { const q = i / 12; g.beginPath(); g.arc(W / 2, gy - r - 4 * q * (1 - q) * hm, 1.2, 0, TAU); g.fill(); }
        let sy = 100; if (on) { const nr = Math.min(u, 1 - u); sy = nr < 0.07 ? 100 - 30 * (1 - nr / 0.07) : 100 + 24 * vy * vy; }
        const sx = 100 + (100 - sy) * 0.5, rx = r * sx / 100, ry = r * sy / 100, cx = W / 2, cy = gy - hg - ry;
        floor(g, W, gy); g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(cx, gy + 2, rx * (1.05 - 0.55 * hg / hm), r * 0.14, 0, 0, TAU); g.fill();
        ballFill(g, cx, cy, rx, ry, K.gold); tag(g, `x ${Math.round(sx)} · y ${Math.round(sy)}`, cx, gy + 18, K.muted, 9, "center");
      } },
      { id: "antisipasi", n: "Antisipasi", rule: "Wind-up 0-10 f, transisi 10-12 f, aksi utama 12-30 f, settle 30-40 f. Gerak terbesar terjadi dalam sekitar 3 frame, lalu ease ke puncak.", L: 64 / 24, draw(g, W, H, t, on, U) {
        const f = t * 24, gy = H * 0.7, x0 = W * 0.24, x1 = W * 0.74, D = x1 - x0; let x = x0, sx = 1, sy = 1, lean = 0, al = 1;
        if (on) {
          if (f < 10) { const k = easeIO(f / 10); x = x0 - 0.16 * D * k; sy = 1 - 0.16 * k; lean = -9 * k; }
          else if (f < 12) { x = x0 - 0.16 * D; sy = 0.84; lean = -9; }
          else if (f < 30) { const k = (f - 12) / 18, e = 1 - Math.pow(2, -10 * k); x = lerp(x0 - 0.16 * D, x1, e); const s = 0.24 * Math.pow(1 - k, 2.5); sx = 1 + s; sy = 1 - s * 0.5; lean = 12 * (1 - e) - 2; }
          else if (f < 40) { const k = (f - 30) / 10; x = x1 + 0.05 * D * Math.sin(k * Math.PI) * (1 - k); sy = 1 - 0.09 * Math.sin(k * Math.PI); lean = 7 * Math.sin(k * Math.PI) * (1 - k); }
          else x = x1;
        } else { x = f < 12 ? x0 : f < 30 ? lerp(x0, x1, easeIO((f - 12) / 18)) : x1; }
        if (f > 56) al = 1 - (f - 56) / 8;
        sx = sx * (on ? 1 + (1 - sy) * 0.5 : 1);
        floor(g, W, gy); g.globalAlpha = clamp(al);
        g.save(); g.translate(x, gy); g.rotate(lean * RAD); g.scale(sx, sy);
        const bw = U * 1.7, bh = U * 2; g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 2, bw * 0.6, U * 0.14, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(0, -bh, 0, 0); gr.addColorStop(0, K.gold2); gr.addColorStop(1, K.goldd); g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(-bw / 2, -bh, bw, bh, U * 0.5) : g.rect(-bw / 2, -bh, bw, bh); g.fill();
        eyes(g, bw * 0.12, -bh * 0.66, U * 0.32, 1); g.restore(); g.globalAlpha = 1;
        bar(g, W, H, on ? [[0, 10, "wind-up", "rgba(242,215,150,.45)"], [10, 12, "", "rgba(244,236,216,.6)"], [12, 30, "aksi", K.gold], [30, 40, "settle", "rgba(242,215,150,.6)"]] : [[12, 30, "aksi", K.gold]], f, 64);
      } },
      { id: "slow", n: "Slow in / out", rule: "Ease in/out di setiap pose kunci. Jarak antar-frame rapat di ujung (lambat) dan renggang di tengah (cepat); kurva curam = cepat.", L: 2, draw(g, W, H, t, on, U) {
        const u = t % 2, k = u < 1 ? u : 2 - u, e = on ? inout3(k) : k, xa = W * 0.14, xb = W * 0.86, y = H * 0.52;
        g.strokeStyle = "rgba(242,215,150,.2)"; g.lineWidth = 2; g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke();
        for (let i = 0; i <= 24; i++) { const q = on ? inout3(i / 24) : i / 24, x = lerp(xa, xb, q); g.fillStyle = i % 12 === 0 ? K.gold2 : "rgba(242,215,150,.55)"; g.fillRect(x - 0.75, y - U * 1.35, 1.5, i % 12 === 0 ? 12 : 7); }
        tag(g, "spacing 24 f", xa, y - U * 1.6, K.muted, 9);
        ballFill(g, lerp(xa, xb, e), y, U * 0.55, U * 0.55, K.gold);
      } },
      { id: "arc", n: "Arc", rule: "Ujung tungkai bergerak di busur (rotasi FK), bukan garis lurus. Head turn sedikit turun di tengah; benda di lintasan lompat diputar searah lintasan (atan2).", L: 2, draw(g, W, H, t, on, U) {
        const R = Math.min(H * 0.56, W * 0.4 / Math.sin(58 * RAD)), pv = [W / 2, H * 0.5 - R * 0.55], A = -58 * RAD, B = 58 * RAD;
        const tipAt = (tt) => { const u = ((tt % 2) + 2) % 2, k = inout3(u < 1 ? u : 2 - u); if (on) { const a = lerp(A, B, k); return [pv[0] + R * Math.sin(a), pv[1] + R * Math.cos(a)]; } const pa = [pv[0] + R * Math.sin(A), pv[1] + R * Math.cos(A)], pb = [pv[0] + R * Math.sin(B), pv[1] + R * Math.cos(B)]; return [lerp(pa[0], pb[0], k), lerp(pa[1], pb[1], k)]; };
        g.strokeStyle = "rgba(242,215,150,.18)"; g.setLineDash([3, 5]); g.beginPath(); if (on) g.arc(pv[0], pv[1], R, Math.PI / 2 - B, Math.PI / 2 - A); else { const a = tipAt(0), b = tipAt(1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); g.setLineDash([]);
        for (let j = 16; j >= 1; j--) { const p = tipAt(t - j / 24); g.fillStyle = rgba(K.gold2, 0.5 * (1 - j / 17)); g.beginPath(); g.arc(p[0], p[1], 2.2, 0, TAU); g.fill(); }
        const tp = tipAt(t); fillPts(g, capPts(pv, tp, U * 0.32, U * 0.22), K.ivory2, false);
        ring(g, pv[0], pv[1], U * 0.18, K.goldd); ballFill(g, tp[0], tp[1], U * 0.42, U * 0.42, K.gold);
        tag(g, on ? `panjang tetap ${Math.round(dist(pv, tp))} px` : `panjang ${Math.round(dist(pv, tp))} px (berubah)`, W / 2, H - 12, K.muted, 9, "center");
      } },
      { id: "overlap", n: "Follow-through / overlap", rule: "Anak telat 2-5 f (valueAtTime(time - 0,05)); rambut telat dari kepala; segmen ekor telat 2-3 f per segmen. Pegas rambut 1,35-1,55 Hz, zeta 0,32-0,35.", L: OL, draw(g, W, H, t, on, U) {
        const gy = H * 0.78, x = lerp(W * 0.28, W * 0.72, headX(t)), hr = U * 1.05, hy = gy - hr;
        floor(g, W, gy); g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(x, gy + 2, hr, U * 0.14, 0, 0, TAU); g.fill();
        let p = [x - hr * 0.1, hy - hr * 0.92], ang = 0; const seg = U * 0.62;
        for (let i = 0; i < 5; i++) { ang = on ? hairTab((t - i * 2.5 / 24) / OL) * (0.22 + 0.05 * i) : 0; const q = [p[0] + seg * Math.sin(ang), p[1] - seg * Math.cos(ang)]; g.strokeStyle = mix(K.gold2, K.goldd, i / 5); g.lineCap = "round"; g.lineWidth = U * (0.34 - i * 0.05); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); p = q; }
        ring(g, p[0], p[1], U * 0.18, K.gold2);
        ballFill(g, x, hy, hr, hr, "#8fa7d8"); eyes(g, x + hr * 0.15, hy - hr * 0.05, U * 0.3, headX(t + 0.05) - headX(t - 0.05) > 0 ? 1 : -1);
      } },
      { id: "sekunder", n: "Gerak sekunder", rule: "Layer terpisah, offset waktu, mendukung bukan bersaing. Antena = pegas u'' = -ω²u - 2ζωu' - a_lateral, ω = 2π × 2,3 Hz, ζ = 0,14; frekuensi pegas jauh dari ayunan jalan 1 Hz.", L: 2, draw(g, W, H, t, on, U) {
        const p = t % 1, gy = H * 0.8, cx = W / 2 + swayX(p) * U * 0.35, bob = Math.abs(Math.sin(TAU * p)) * U * 0.18, by = gy - U * 1.0 - bob;
        floor(g, W, gy);
        for (const s of [-1, 1]) { const lift = Math.max(0, Math.sin(TAU * p) * s) * U * 0.45, fx = W / 2 + s * U * 0.55; g.fillStyle = K.goldd; g.beginPath(); g.ellipse(fx, gy - U * 0.14 - lift, U * 0.36, U * 0.16, 0, 0, TAU); g.fill(); g.strokeStyle = K.goldd; g.lineWidth = U * 0.18; g.beginPath(); g.moveTo(fx, gy - U * 0.2 - lift); g.lineTo(cx + s * U * 0.4, by + U * 0.2); g.stroke(); }
        const bw = U * 1.25, bh = U * 1.5; ballFill(g, cx, by - bh * 0.35, bw, bh, "#8fa7d8"); eyes(g, cx, by - bh * 0.55, U * 0.3);
        for (const s of [-1, 1]) {
          const base = [cx + s * bw * 0.38, by - bh * 1.15], a = on ? antTab(p) * 1.6 : 0, n = 6, len = U * 1.25; let q = base; g.strokeStyle = K.gold2; g.lineWidth = U * 0.1; g.beginPath(); g.moveTo(q[0], q[1]);
          for (let i = 1; i <= n; i++) { const k = i / n; q = [base[0] + Math.sin(a * k * k + s * 0.25) * len * k, base[1] - Math.cos(a * k * k + s * 0.25) * len * k]; g.lineTo(q[0], q[1]); }
          g.stroke(); ring(g, q[0], q[1], U * 0.2, K.gold);
        }
      } },
      { id: "smear", n: "Smear", rule: "Di frame tercepat, ujung yang bergerak di-stretch searah gerak selama 1 frame. Diputar 0,4× supaya frame tunggal terlihat.", L: 1.5, slow: 0.4, draw(g, W, H, t, on, U) {
        const tq = Math.floor(t * 24) / 24, R = Math.min(H * 0.5, W * 0.4), pv = [W / 2, H * 0.5 + R * 0.45];
        const angAt = (tt) => { tt = ((tt % 1.5) + 1.5) % 1.5; if (tt < 0.35) return -105; if (tt < 0.35 + 3 / 24) return lerp(-105, 72, 1 - Math.pow(1 - (tt - 0.35) / (3 / 24), 2)); if (tt < 1.05) return 72; return lerp(72, -105, inout3((tt - 1.05) / 0.45)); };
        const P = (a) => [pv[0] + R * Math.sin(a * RAD), pv[1] - R * Math.cos(a * RAD)];
        const a1 = angAt(tq), a0 = angAt(tq - 1 / 24), sp = Math.abs(a1 - a0);
        g.strokeStyle = "rgba(242,215,150,.14)"; g.beginPath(); g.arc(pv[0], pv[1], R, (-105 - 90) * RAD, (72 - 90) * RAD); g.stroke();
        if (on && sp > 30) {
          const pts = [], n = 14; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), w = U * 0.48 * Math.pow(i / n, 0.8); const c = P(a), nr = [Math.sin(a * RAD), -Math.cos(a * RAD)]; pts.push([c[0] + nr[0] * w, c[1] + nr[1] * w]); }
          for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n), w = U * 0.48 * Math.pow(i / n, 0.8); const c = P(a), nr = [Math.sin(a * RAD), -Math.cos(a * RAD)]; pts.push([c[0] - nr[0] * w * 0.3, c[1] - nr[1] * w * 0.3]); }
          fillPts(g, pts, rgba(K.gold, 0.85)); tag(g, "smear 1 frame", W / 2, 18, K.gold2, 9.5, "center");
        }
        const tp = P(a1); g.strokeStyle = K.ivory2; g.lineWidth = U * 0.2; g.lineCap = "round"; g.beginPath(); g.moveTo(pv[0], pv[1]); g.lineTo(tp[0], tp[1]); g.stroke();
        ballFill(g, tp[0], tp[1], U * 0.5, U * 0.5, K.gold); ring(g, pv[0], pv[1], U * 0.2, K.goldd);
        tag(g, `${Math.round(sp)}°/frame`, W / 2, H - 10, K.muted, 9, "center");
      } },
      { id: "staging", n: "Staging", rule: "Satu fokus; yang sekunder di-blur dan diredupkan; DOF terkunci di subjek + vignette. Siluet tetap terbaca di setiap pose.", L: 3, draw(g, W, H, t, on, U) {
        const gy = H * 0.8; floor(g, W, gy);
        const others = [[0.16, 0.35, "#8fa7d8", 0], [0.32, 0.62, "#c98a7a", 1.3], [0.7, 0.5, "#7fb3a6", 2.1], [0.86, 0.3, "#b39ad6", 0.7]];
        others.forEach(([fx, fy, c, ph]) => { const x = W * fx + Math.sin(t * TAU / 3 + ph) * U * 0.5, y = H * fy + Math.cos(t * TAU / 1.5 + ph) * U * 0.3; if (on) { g.filter = "blur(3px)"; g.globalAlpha = 0.4; } ballFill(g, x, y, U * 0.75, U * 0.75, on ? mix(c, "#1a2040", 0.35) : c); g.filter = "none"; g.globalAlpha = 1; });
        const hx = W / 2, hy = gy - U * 1.25 - Math.abs(Math.sin(t * TAU / 1.5)) * U * 0.4;
        if (on) { const gl = g.createRadialGradient(hx, hy, 2, hx, hy, U * 3); gl.addColorStop(0, "rgba(242,215,150,.16)"); gl.addColorStop(1, "rgba(242,215,150,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, H); }
        ballFill(g, hx, hy, U * 1.2, U * 1.2, K.gold); eyes(g, hx, hy - U * 0.2, U * 0.34);
        if (on) { const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, "rgba(4,6,14,0)"); vg.addColorStop(1, "rgba(4,6,14,.7)"); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
      } },
    ];
    const st = { pr: "squash", onion: false, slow: false };
    el.innerHTML = shell("ds-prinsip", `<div class="ds-stage ds-pr-stage"></div>`,
      UI.grp("Prinsip", UI.chips("pr", PR.map((p) => [p.id, p.n]), st.pr)) + `<div class="ds-rule" data-rule></div>` + `<div class="ds-tgs">${UI.tog("onion", "Onion skin", st.onion)}${UI.tog("slow", "Lambat 0,5×", st.slow)}</div>`,
      `<b>Catatan</b> Panel kiri tanpa prinsip animasi, panel kanan dengan prinsip. Panjang loop sama, jadi bedanya murni pada cara bergerak: ancang-ancang, kempis-mengembang, gerak susulan, dan percepatan yang halus.`);
    const S = cv2d($(".ds-pr-stage", el)), rule = $("[data-rule]", el);
    const showRule = () => { const p = PR.find((q) => q.id === st.pr); rule.innerHTML = `<h4>${p.n}</h4><p>${esc(p.rule)}</p>`; if (window.gsap) gsap.fromTo(rule, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }); };
    let t = 0; bind(el, st, (k) => { if (k === "pr") { t = 0; showRule(); } }); showRule();
    visLoop(el, (dt) => {
      const p = PR.find((q) => q.id === st.pr); t += dt * (p.slow || 1) * (st.slow ? 0.5 : 1);
      const g = S.fit(), w = S.w, h = S.h, side = w >= 520, pw = side ? w / 2 : w, ph = side ? h : h / 2, U = Math.min(pw, ph * 1.25) / 10, tl = t % p.L;
      g.fillStyle = "#070a16"; g.fillRect(0, 0, w, h);
      [false, true].forEach((on, i) => {
        const ox = side ? i * pw : 0, oy = side ? 0 : i * ph;
        g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, pw, ph); g.clip();
        const bg = g.createLinearGradient(0, 0, 0, ph); bg.addColorStop(0, on ? "#141d40" : "#0d1226"); bg.addColorStop(1, "#070a16"); g.fillStyle = bg; g.fillRect(0, 0, pw, ph);
        if (st.onion) [3, 2, 1].forEach((k) => { g.globalAlpha = 0.11 * (4 - k); p.draw(g, pw, ph, ((tl - k / 12) % p.L + p.L) % p.L, on, U); g.globalAlpha = 1; });
        p.draw(g, pw, ph, tl, on, U);
        g.restore();
        tag(g, on ? "● DENGAN" : "○ TANPA", ox + 12, oy + 20, on ? K.gold2 : K.muted, 9.5, "left", MONO);
      });
      g.strokeStyle = "rgba(242,215,150,.3)"; g.lineWidth = 1; g.beginPath(); if (side) { g.moveTo(pw + 0.5, 0); g.lineTo(pw + 0.5, h); } else { g.moveTo(0, ph + 0.5); g.lineTo(w, ph + 0.5); } g.stroke();
    });
  }

  /* ======================================================================
     3 · GAIT: realistic walk from data (motion-graphics bab 4.3, scripts/mesin_gait.py)
     ====================================================================== */
  function gait(el) {
    const st = { step: 2.0, cad: 119, speed: 1, bones: false, pivot: true, prints: true };
    el.innerHTML = shell("ds-gait", `<div class="ds-stage ds-gt-stage"><span class="ds-tag">Tampak samping · mesin gait</span></div>`,
      `<div class="ds-sls">${UI.slider("step", "Langkah", 1.4, 2.4, 0.05, st.step)}${UI.slider("cad", "Cadence", 96, 130, 1, st.cad)}</div>` +
      UI.grp("Kecepatan tayang", UI.chips("speed", [[1, "1×"], [0.5, "½×"], [0.25, "¼×"]], st.speed)) +
      `<div class="ds-tgs">${UI.tog("pivot", "Pivot tumit / ujung", st.pivot)}${UI.tog("prints", "Titik tapak", st.prints)}${UI.tog("bones", "Kerangka IK", st.bones)}</div>` +
      `<div class="ds-stats" data-stats></div>`,
      `<b>Catatan</b> Langkah dihitung dari data jalan manusia sungguhan: sekitar 119 langkah per menit, 60% waktu kaki menapak dan 40% mengayun. Tanah bergeser seirama langkah, jadi kaki yang menapak tidak meluncur. Singkatan pada grafik: tumit menapak, telapak rata, tumit naik, jari lepas.`);
    const S = cv2d($(".ds-gt-stage", el)), stats = $("[data-stats]", el);
    let gt, T, rep, t = 0, prints = [];
    const rebuild = () => {
      T = Math.round((120 / st.cad) * 24) / 24;
      gt = new Gait({}, { step: st.step, T }); rep = gt.report();
      outp(el, "step", fmt(st.step, 2) + " H"); outp(el, "cad", st.cad + "/mnt");
      stats.innerHTML = [["stride", fmt(gt.S, 2) + " H"], ["v tanah", fmt(gt.v, 2) + " H/s"], [`siklus ${fmt(120 / st.cad, 2)} s`, `${Math.round(T * 24)} f`], ["bob panggul", fmt(rep.bob, 3) + " H"],
        ["jangkauan maks", fmt(rep.reach * 100, 1) + "%"], ["lutut swing maks", fmt(rep.knee, 0) + "°"], ["plantar toe-off", fmt(rep.plantar, 0) + "°"], ["tembus tanah", fmt(rep.pen, 3) + " H"]]
        .map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("");
    };
    bind(el, st, (k) => { if (k === "step" || k === "cad") rebuild(); }); rebuild();
    const C = { skin: "#e4b38e", hair: "#2b2230", top: "#efe4cc", pants: "#4f7f88", shoe: "#fbf7ee", sole: "#cdbf9f", dark: "#121a33" };
    visLoop(el, (dt) => {
      t += dt * st.speed;
      const g = S.fit(), w = S.w, h = S.h, TL = 66, gy = h - TL - 26, hp = Math.max(18, (gy - 22) / 5.78), ox = w * 0.46, oy = gy - 5.78 * hp;
      const p = (t / T) % 1, pz = gt.pose(p), worldX = gt.v * t;
      const X = (q) => [ox + q[0] * hp, oy + q[1] * hp];
      // sky + ground
      const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, "#0d1534"); sky.addColorStop(1, "#28356a"); g.fillStyle = sky; g.fillRect(0, 0, w, gy);
      const glow = g.createRadialGradient(w * 0.78, gy * 0.9, 4, w * 0.78, gy * 0.9, w * 0.6); glow.addColorStop(0, "rgba(242,215,150,.22)"); glow.addColorStop(1, "rgba(242,215,150,0)"); g.fillStyle = glow; g.fillRect(0, 0, w, gy);
      const gr = g.createLinearGradient(0, gy, 0, h); gr.addColorStop(0, "#1a2246"); gr.addColorStop(1, "#070a16"); g.fillStyle = gr; g.fillRect(0, gy, w, h - gy);
      // ground ticks every 0.5 H move with the ground at exactly -v (feet stay planted)
      const sp = 0.5, x0w = worldX - ox / hp, x1w = worldX + (w - ox) / hp;
      for (let k = Math.floor(x0w / sp); k <= x1w / sp; k++) { const sx = ox + (k * sp - worldX) * hp; g.fillStyle = k % 4 === 0 ? "rgba(242,215,150,.35)" : "rgba(242,215,150,.12)"; g.fillRect(sx, gy + 4, 1, k % 4 === 0 ? 9 : 5); }
      g.strokeStyle = "rgba(242,215,150,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, gy + 0.5); g.lineTo(w, gy + 0.5); g.stroke();
      // heel-strike prints: world x = H0 + j * step (every heel strike of either foot)
      if (st.prints) {
        const jmax = Math.floor((worldX - 1e-6) / gt.g.step + 1e-9);
        for (let j = jmax; j > jmax - 14; j--) { const wx = gt.H0 + j * gt.g.step + gt.HEEL[0], sx = ox + (wx - worldX) * hp; if (sx < -20 || sx > w + 20) continue; g.fillStyle = j % 2 ? "rgba(242,215,150,.85)" : "rgba(244,236,216,.6)"; g.beginPath(); g.ellipse(sx, gy + 1, 3.2, 1.6, 0, 0, TAU); g.fill(); }
        tag(g, "titik heel strike menempel di tanah", 12, gy + 20, K.muted, 9);
      }
      const U = (q) => { const r = rotAbout(q, PRIM.lean_piv, pz.lean); return [r[0], r[1] + pz.dy]; };
      const legDraw = (leg, dark) => {
        const c = (col) => (dark ? mix(col, C.dark, 0.3) : col), hip = pz.hip, kn = leg.knee, an = leg.ankle;
        fillPts(g, capPts(X(hip), X(kn), 0.205 * hp, 0.15 * hp, 0.02 * hp, 0), c(C.pants), false);
        fillPts(g, capPts(X(kn), X(an), 0.15 * hp, 0.105 * hp, 0.012 * hp, 0), c(C.pants), false);
        const f = shoeMap(leg.cfg), shoe = gt.b.shoe.map((q) => X(f(q)));
        fillPts(g, shoe, c(C.shoe));
        g.save(); g.beginPath(); smooth(g, shoe); g.clip(); fillPts(g, [[-0.1, -0.04], [0.7, -0.04], [0.7, 0.05], [-0.1, 0.05]].map((q) => X(f(q))), c(C.sole), false); g.restore();
        if (st.bones) { g.strokeStyle = K.gold2; g.lineWidth = 1.5; g.beginPath(); const a = X(hip), b = X(kn), d = X(an); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(d[0], d[1]); g.stroke(); [a, b, d].forEach((q) => { g.fillStyle = K.night; g.beginPath(); g.arc(q[0], q[1], 3, 0, TAU); g.fill(); g.strokeStyle = K.gold2; g.stroke(); }); }
      };
      const armDraw = (side, dark) => {
        const c = (col) => (dark ? mix(col, C.dark, 0.3) : col), [S0, E0, W0] = gt.arm(p + side)[0].map(U), S1 = X(S0), E1 = X(E0), W1 = X(W0);
        fillPts(g, capPts(S1, E1, 0.125 * hp, 0.105 * hp), c(C.top), false);
        fillPts(g, capPts(E1, W1, 0.1 * hp, 0.08 * hp), c(C.top), false);
        const d = [W1[0] - E1[0], W1[1] - E1[1]], m = Math.hypot(d[0], d[1]) || 1, H2 = [W1[0] + d[0] / m * 0.17 * hp, W1[1] + d[1] / m * 0.17 * hp];
        fillPts(g, capPts(W1, H2, 0.075 * hp, 0.085 * hp), c(C.skin), false);
        const q = [E1[0] + d[0] * 0.86, E1[1] + d[1] * 0.86]; g.strokeStyle = c(mix(C.top, "#000", 0.14)); g.lineWidth = Math.max(1, 0.02 * hp); g.beginPath(); g.moveTo(q[0] - d[1] / m * 0.09 * hp, q[1] + d[0] / m * 0.09 * hp); g.lineTo(q[0] + d[1] / m * 0.09 * hp, q[1] - d[0] / m * 0.09 * hp); g.stroke();
      };
      // far side first (darker), then near (bab 2: layer belakang sekitar 20% lebih gelap)
      armDraw(0.5, true); legDraw(pz.far, true);
      legDraw(pz.near, false);
      // torso, neck, head in the upper-body frame U (lean 2 deg, bob)
      const hipS = X(pz.hip);
      g.fillStyle = C.pants; g.beginPath(); g.ellipse(hipS[0], hipS[1] - 0.03 * hp, 0.3 * hp, 0.27 * hp, 0, 0, TAU); g.fill();
      fillPts(g, capPts(X(U([-0.02, 1.4])), X(U([0.0, 0.95])), 0.12 * hp, 0.12 * hp), C.skin, false);
      fillPts(g, cutCap(X(U([0, 1.58])), X(U([0, 3.3])), 0.34 * hp, 0.36 * hp, 0.97, 0.03 * hp, 0.01 * hp), C.top);
      g.strokeStyle = mix(C.top, "#000", 0.12); g.lineWidth = Math.max(1, 0.02 * hp); g.beginPath(); { const a = X(U([-0.33, 3.12])), b = X(U([0.35, 3.12])); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      // head: skin circle + hair (back and top) + ear, eye, nose bump
      const HC = (q) => X(U(rotAbout(q, PRIM.chin, pz.nod)));
      const hc = HC([0.05, 0.55]), r = 0.47 * hp;
      g.fillStyle = C.skin; g.beginPath(); g.arc(hc[0], hc[1], r, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(...HC([0.5, 0.64]), 0.055 * hp, 0.05 * hp, 0, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(...HC([0.0, 0.5]), 0.53 * hp, 0, TAU); g.clip();
      fillPts(g, [[0.36, -0.2], [0.42, 0.2], [0.12, 0.3], [-0.06, 0.56], [-0.22, 0.98], [-1, 1.1], [-1, -1], [1, -1]].map(HC), C.hair, false); g.restore();
      g.fillStyle = mix(C.skin, "#7a4a3a", 0.25); g.beginPath(); g.ellipse(...HC([-0.08, 0.64]), 0.07 * hp, 0.1 * hp, 0, 0, TAU); g.fill();
      g.fillStyle = "#231c26"; g.beginPath(); g.ellipse(...HC([0.34, 0.54]), 0.028 * hp, 0.05 * hp, 0, 0, TAU); g.fill();
      g.strokeStyle = mix(C.skin, "#5a2a30", 0.5); g.lineWidth = Math.max(1, 0.025 * hp); g.lineCap = "round"; g.beginPath(); { const a = HC([0.33, 0.8]), b = HC([0.43, 0.79]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      armDraw(0, false);
      // pivot of the stance foot: heel rocker / flat / toe rocker on the sole tip
      const n = pz.near, u = n.u;
      const phase = !n.stance ? "Swing: Hermite C1 toe-off → heel strike" : u < gt.g.u_flat ? "Heel rocker: pivot di tumit" : u < gt.g.u_heeloff ? "Kaki rata" : u < gt.u_ps ? "Toe rocker: pivot di ujung sol" : "Pre-swing (double support)";
      if (st.pivot) for (const f of [pz.near, pz.far]) { if (!f.stance) continue; const piv = X(shoeMap(f.cfg)(f.cfg.piv)), flat = f.u >= gt.g.u_flat && f.u < gt.g.u_heeloff; if (flat) continue; g.strokeStyle = K.gold2; g.lineWidth = 1.5; g.beginPath(); g.arc(piv[0], piv[1], 6, 0, TAU); g.stroke(); g.fillStyle = K.gold2; g.beginPath(); g.arc(piv[0], piv[1], 2, 0, TAU); g.fill(); }
      tag(g, (w > 460 ? "KAKI DEKAT · " : "") + phase.toUpperCase(), 12, 22, K.gold2, w > 460 ? 10 : 9);
      tag(g, `lutut ${fmt(n.flex, 0)}° · jangkau ${fmt(Math.max(n.reach, pz.far.reach) * 100, 1)}% · p ${fmt(p, 2)}`, 12, 38, K.muted, 9.5);
      // phase timeline: stance 60 / swing 40, events at heel strike, foot flat, heel off, toe off
      const ty = h - TL + 8, x0 = 74, x1 = w - 16, XP = (q) => lerp(x0, x1, q);
      g.fillStyle = "rgba(6,9,20,.92)"; g.fillRect(0, h - TL - 4, w, TL + 4); g.strokeStyle = "rgba(242,215,150,.25)"; g.beginPath(); g.moveTo(0, h - TL - 3.5); g.lineTo(w, h - TL - 3.5); g.stroke();
      const evs = [[0, "HS"], [gt.g.u_flat * gt.g.stance, "FF"], [gt.g.u_heeloff * gt.g.stance, "HO"], [gt.g.stance, "TO"]];
      [["DEKAT", 0], ["JAUH", 0.5]].forEach(([nm, off], r) => {
        const y = ty + 10 + r * 22; tag(g, nm, 12, y + 7, K.muted, 9);
        for (const [a, b] of off ? [[0.5, 1], [0, 0.1]] : [[0, 0.6]]) { const gg = g.createLinearGradient(XP(a), 0, XP(b), 0); gg.addColorStop(0, "rgba(214,176,106,.85)"); gg.addColorStop(1, "rgba(214,176,106,.55)"); g.fillStyle = gg; g.fillRect(XP(a), y, XP(b) - XP(a), 9); }
        g.strokeStyle = "rgba(242,215,150,.35)"; g.strokeRect(XP(0) + 0.5, y + 0.5, XP(1) - XP(0) - 1, 8);
        evs.forEach(([q, l]) => { const xq = XP((q + off) % 1); g.fillStyle = K.ivory; g.fillRect(xq - 0.5, y - 2, 1, 13); if (r === 0) tag(g, l, xq + 3, y - 3, K.ivory2, 8.5); });
      });
      g.fillStyle = "rgba(244,236,216,.12)"; g.fillRect(XP(0), ty + 6, XP(0.1) - XP(0), 36); g.fillRect(XP(0.5), ty + 6, XP(0.6) - XP(0.5), 36);
      const xp = XP(p); g.fillStyle = K.gold2; g.fillRect(xp - 1, ty + 2, 2, 44);
      tag(g, w > 560 ? "HS heel strike · FF kaki rata · HO heel off · TO toe off · arsir = double support 2 × 10%" : "arsir = double support 2 × 10%", x0, h - 6, K.muted, 8.5);
    });
  }

  /* ======================================================================
     4 · ORBIT 3D: layered garden in 3D space, one-take camera orbit (motion-graphics bab 5, 5.2, 7, 7.1)
     ====================================================================== */
  function orbit3d(el) {
    const st = { auto: true, spd: 15, dist: 14, dof: true, vig: true, rays: true, haze: true };
    el.innerHTML = shell("ds-orbit", `<div class="ds-stage ds-or-stage ds-drag"><span class="ds-tag">Satu take · seret untuk orbit</span></div>`,
      `<div class="ds-sls">${UI.slider("dist", "Dolly", 9, 22, 0.5, st.dist)}</div>` +
      UI.grp("Orbit otomatis", `<div class="ds-flexrow">${UI.tog("auto", "Putar", st.auto)}${UI.chips("spd", [[15, "15°/s"], [45, "45°/s (take)"]], st.spd)}</div>`) +
      UI.grp("Lapisan sinematik", `<div class="ds-tgs">${UI.tog("dof", "DOF blur", st.dof)}${UI.tog("haze", "Haze jarak", st.haze)}${UI.tog("rays", "Cahaya + berkas", st.rays)}${UI.tog("vig", "Vignette + grain", st.vig)}</div>`) +
      `<div class="ds-stats" data-stats></div>`,
      `<b>Catatan</b> Lapisan taman ditempatkan di ruang 3D sungguhan, lalu kamera berputar dalam satu pengambilan tanpa potongan. Benda jauh dibuat sedikit kabur dan berkabut, benda dekat lebih tajam, sehingga kedalaman terasa alami.`);
    const S = cv2d($(".ds-or-stage", el)), stats = $("[data-stats]", el);
    const LB = S.layer(), LF = S.layer(), LM = S.layer(), LN = S.layer(), LS = S.layer();
    bind(el, st, (k) => { if (k === "dist") outp(el, "dist", fmt(st.dist, 1) + " H"); });
    outp(el, "dist", fmt(st.dist, 1) + " H");
    // world layout (fixed draws, then keepout of the camera ring 9-22 H for tall objects)
    const R = rng(7), objs = [];
    const SKYT = "#22305e", SKYM = "#7d77a2", SKYH = "#f1bf8f", MT = "#7682a6", HILL = "#55667a", TREEF = "#3f5a4a";
    const prof = mtProfile(11, 720, 150, 300, { power: 1.25, peaks: [[20, 450, 13, 0.1]], volcanoes: [[200, 330, 22]] });
    const profH = mtProfile(13, 720, 22, 60, { octs: [[7, 1], [15, 0.45], [31, 0.2]], power: 1.2 });
    const profT = mtProfile(5, 720, 7, 9, { octs: [[40, 1], [90, 0.6], [180, 0.4]], power: 1 });
    for (let i = 0; i < 30; i++) { const a = R() * TAU, r = 25 + R() * 55; objs.push({ k: "tree", x: r * Math.sin(a), z: r * Math.cos(a), h: 7 + R() * 6, cr: 2.1 + R() * 1.6, seed: i + 1 }); }
    for (const a of [30, 150, 265]) objs.push({ k: "lamp", x: 5.6 * Math.sin(a * RAD), z: 5.6 * Math.cos(a * RAD), h: 5.2 });
    for (let i = 0; i < 18; i++) { const a = R() * TAU, r = i < 8 ? 3 + R() * 4 : 23 + R() * 16; objs.push({ k: "bush", x: r * Math.sin(a), z: r * Math.cos(a), s: 0.8 + R() * 0.7, seed: 50 + i }); }
    for (let i = 0; i < 46; i++) { const a = R() * TAU, r = 2.2 + R() * 7.5; objs.push({ k: "flower", x: r * Math.sin(a), z: r * Math.cos(a), c: ["#f2d796", "#f4ecd8", "#e98f7a", "#c9a4e6"][i % 4], s: 0.7 + R() * 0.5 }); }
    for (let i = 0; i < 70; i++) { const a = R() * TAU, r = 1.6 + R() * 21; objs.push({ k: "grass", x: r * Math.sin(a), z: r * Math.cos(a), s: 0.6 + R() * 0.7, seed: 200 + i }); }
    const tall = (o) => o.k === "tree" || o.k === "lamp";
    for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i], r = Math.hypot(o.x, o.z); if (tall(o) && r > 7.5 && r < 23.5) objs.splice(i, 1); }
    objs.forEach((o) => { if (o.k === "tree" || o.k === "bush") { const r2 = rng(o.seed * 31); o.cl = Array.from({ length: o.k === "tree" ? 9 : 5 }, (_, j) => ({ dx: (r2() - 0.5) * 1.3, dy: (r2() - 0.5) * 1.05 - (j < 3 ? 0.35 : 0), r: 0.42 + r2() * 0.3 })); } });
    const path = stripXZ([[-220, -1.2], [220, -1.2]], 3.2), pond = ellipseXZ(-9.5, 9, 5, 3, 0.3, 64, 0.05, 3), lawn = [ellipseXZ(6, 9, 7, 4, 0.5, 48, 0.12, 4), ellipseXZ(-6, -8, 8, 5, -0.4, 48, 0.12, 5), ellipseXZ(14, -6, 6, 9, 0.2, 48, 0.1, 6)];
    const sun = sunDir(250, 14), face = 160;
    const grain = document.createElement("canvas"); grain.width = grain.height = 160; { const gg = grain.getContext("2d"), id = gg.createImageData(160, 160), r3 = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r3() - 0.5) * 150; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gg.putImageData(id, 0, 0); }
    let az = 205, t = 0, drag = null, idle = 0, grainPat = null;
    const box = $(".ds-or-stage", el);
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, az }; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", (e) => { if (!drag) return; az = drag.az - (e.clientX - drag.x) * 0.45; idle = 0; });
    const up = () => { drag = null; idle = 0; }; box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    const tree = (g, o, x, y, k, hz, lx, ly) => {
      const trunk = mix("#5a4636", SKYH, hz), rim = mix("#d29d64", SKYH, hz), cb = mix("#3d5a3e", SKYH, hz), cs = mix("#26392f", SKYH, hz * 0.85), cl = mix("#93a55a", SKYH, hz * 0.9);
      const th = o.h * 0.6, tw = 0.42 * k, cyc = y - o.h * 0.66 * k, R2 = o.cr * k;
      g.fillStyle = trunk; g.fillRect(x - tw / 2, y - th * k, tw, th * k); g.fillStyle = rim; g.fillRect(lx > 0 ? x + tw * 0.15 : x - tw / 2, y - th * k, tw * 0.35, th * k);
      if (R2 < 7) { g.fillStyle = cb; g.beginPath(); g.ellipse(x, cyc, R2, R2 * 1.1, 0, 0, TAU); g.fill(); return; }
      const ox = -lx * 0.18, oy = ly * 0.18;
      g.fillStyle = cs; for (const c of o.cl) { g.beginPath(); g.arc(x + (c.dx + ox) * R2, cyc + (c.dy + oy) * R2, c.r * R2, 0, TAU); g.fill(); }
      g.fillStyle = cb; for (const c of o.cl) { g.beginPath(); g.arc(x + c.dx * R2, cyc + c.dy * R2, c.r * R2 * 0.92, 0, TAU); g.fill(); }
      g.fillStyle = cl; for (const c of o.cl) { if (c.dx * lx - c.dy * ly < -0.15) continue; g.beginPath(); g.arc(x + (c.dx + lx * 0.2) * R2, cyc + (c.dy - ly * 0.2) * R2, c.r * R2 * 0.5, 0, TAU); g.fill(); }
    };
    const bush = (g, o, x, y, k, hz, lx, ly) => { const R2 = o.s * 0.8 * k, cb = mix("#3f5d3b", SKYH, hz), cl = mix("#8ea25a", SKYH, hz), cs = mix("#283a2c", SKYH, hz); for (const [col, sh, sc] of [[cs, -0.15, 1], [cb, 0, 0.9], [cl, 0.22, 0.45]]) { g.fillStyle = col; for (const c of o.cl) { if (sc < 0.6 && c.dx * lx - c.dy * ly < -0.1) continue; g.beginPath(); g.arc(x + (c.dx + lx * sh) * R2, y - R2 * 0.75 + (c.dy * 0.6 - ly * sh) * R2, c.r * R2 * sc, 0, TAU); g.fill(); } } };
    const lamp = (g, o, x, y, k, hz) => { const pw = 0.16 * k; g.fillStyle = mix("#2b2a33", SKYH, hz); g.fillRect(x - pw / 2, y - o.h * k, pw, o.h * k); g.fillRect(x - pw * 1.6, y - o.h * k - 0.1 * k, pw * 3.2, 0.12 * k); const lyy = y - o.h * k - 0.42 * k; g.fillStyle = "#ffe2a6"; g.fillRect(x - 0.16 * k, lyy, 0.32 * k, 0.36 * k); const gl = g.createRadialGradient(x, lyy + 0.18 * k, 1, x, lyy + 0.18 * k, 1.8 * k); gl.addColorStop(0, "rgba(255,216,146,.55)"); gl.addColorStop(1, "rgba(255,216,146,0)"); g.fillStyle = gl; g.beginPath(); g.arc(x, lyy + 0.18 * k, 1.8 * k, 0, TAU); g.fill(); };
    const flower = (g, o, x, y, k) => { const s = 0.3 * o.s * k; if (s < 0.6) return; g.strokeStyle = "#3c5a3a"; g.lineWidth = Math.max(0.6, 0.05 * k); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.6); g.stroke(); g.fillStyle = o.c; g.beginPath(); g.arc(x, y - s * 1.6, s * 0.45, 0, TAU); g.fill(); };
    const grass = (g, o, x, y, k, hz) => { const s = 0.55 * o.s * k; if (s < 1) return; const r2 = rng(o.seed); g.strokeStyle = mix("#4c6a3a", SKYH, hz); g.lineWidth = Math.max(0.8, 0.06 * k); g.lineCap = "round"; for (let i = 0; i < 6; i++) { const dx = (r2() - 0.5) * s * 0.9, lean = (r2() - 0.5) * s * 0.9, hh = s * (0.7 + r2() * 0.6); g.beginPath(); g.moveTo(x + dx, y); g.quadraticCurveTo(x + dx + lean * 0.3, y - hh * 0.6, x + dx + lean, y - hh); g.stroke(); } };
    visLoop(el, (dt) => {
      t += dt; idle += dt;
      if (st.auto && !drag && idle > 0.6) az += st.spd * dt;
      const g = S.fit(), W = S.w, H = S.h, f = Math.max(0.62 * W, 0.92 * H), pitch = 4;
      const d = st.dist * (1 + 0.035 * Math.sin(t * 0.5)), hc = camHeight(d, pitch, f, H / 2, 0.8 * H);
      const cam = camOrbit([0, 0, 0], d, hc, az, pitch, f, W / 2, H / 2), hy = horizonY(cam), [lx, ly] = light2d(cam, sun), hzk = st.haze ? 1 : 0;
      const bscale = H / 600;
      // sky
      const sk = g.createLinearGradient(0, 0, 0, hy); sk.addColorStop(0, SKYT); sk.addColorStop(0.6, SKYM); sk.addColorStop(1, SKYH); g.fillStyle = sk; g.fillRect(0, 0, W, Math.max(0, hy) + 2);
      const sc = camC(cam, [cam.pos[0] + sun[0] * 1e4, cam.pos[1] + sun[1] * 1e4, cam.pos[2] + sun[2] * 1e4]), sunS = sc[2] > 0 ? scr(cam, sc) : null;
      if (st.rays) { const sx = sunS ? sunS[0] : (lx > 0 ? W * 1.3 : -W * 0.3), sy = sunS ? sunS[1] : hy - H * 0.1, out = sunS ? 0 : W * 0.5, gl = g.createRadialGradient(sx, sy, 2, sx, sy, W * 0.55 + out); gl.addColorStop(0, "rgba(255,236,196,.95)"); gl.addColorStop(0.08, "rgba(255,214,160,.5)"); gl.addColorStop(1, "rgba(255,200,150,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, hy + 2); }
      // background rings (blurred as one layer: far mountains 2.2)
      const bg = LB.fit();
      [[2600, prof, mix(MT, SKYH, 0.45 * hzk + 0.1)], [800, profH, mix(HILL, SKYH, 0.3 * hzk + 0.05)], [160, profT, mix(TREEF, SKYH, 0.16 * hzk)]].forEach(([Rr, pr, col]) => { const pts = ringScr(cam, Rr, pr); if (pts) { bg.fillStyle = col; bg.beginPath(); lines(bg, pts); bg.fill(); } });
      if (st.dof) g.filter = `blur(${(2.2 * bscale).toFixed(2)}px)`; g.drawImage(LB.c, 0, 0, W, H); g.filter = "none";
      // ground
      const gg = g.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, mix("#6f7a4c", SKYH, 0.35 * hzk)); gg.addColorStop(1, "#43512f"); g.fillStyle = gg; g.fillRect(0, hy, W, H - hy);
      lawn.forEach((p, i) => { g.fillStyle = ["#7d8a51", "#5d6d3b", "#748449"][i]; fillScr(g, groundScr(cam, p)); });
      g.fillStyle = "#d8bd91"; fillScr(g, groundScr(cam, path));
      g.strokeStyle = "rgba(150,112,72,.45)"; g.lineWidth = 1;
      for (let x = Math.floor(cam.pos[0] / 1.2) * 1.2 - 36; x < cam.pos[0] + 36; x += 1.2) { const p = groundScr(cam, [[x, -2.8], [x, 0.4], [x + 0.02, 0.4], [x + 0.02, -2.8]]); if (p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.stroke(); } }
      g.fillStyle = "#6e97a8"; fillScr(g, groundScr(cam, pond)); g.fillStyle = "rgba(246,227,189,.55)"; for (let i = 0; i < 4; i++) fillScr(g, groundScr(cam, ellipseXZ(-9.5 + (i - 1.5) * 1.6, 9 - i * 0.3, 0.5 - i * 0.06, 0.08, 0.3, 16)));
      g.strokeStyle = "rgba(40,50,40,.55)"; g.lineWidth = 2; { const p = groundScr(cam, pond); if (p) { g.beginPath(); lines(g, p); g.stroke(); } }
      // world shadows: all opaque in one layer, composited once (multiply + alpha)
      const sl = LS.fit(); sl.fillStyle = "#2b3150";
      const e = Math.asin(sun[1]), shd = [-sun[0], -sun[2]], sm = Math.hypot(...shd), ang = Math.atan2(shd[1] / sm, shd[0] / sm);
      for (const o of objs) {
        if (o.k === "tree") { const G = groundOf([o.x, o.h * 0.66, o.z], sun); fillScr(sl, groundScr(cam, ellipseXZ(G[0], G[1], o.cr / Math.sin(e) * 0.95, o.cr, ang, 32, 0.08, o.seed))); fillScr(sl, groundScr(cam, stripXZ([[o.x, o.z], [lerp(o.x, G[0], 0.8), lerp(o.z, G[1], 0.8)]], 0.45))); }
        else if (o.k === "lamp") { const G = groundOf([o.x, o.h, o.z], sun); fillScr(sl, groundScr(cam, stripXZ([[o.x, o.z], G], 0.18))); }
        else if (o.k === "bush") { const G = groundOf([o.x, 0.5 * o.s, o.z], sun); fillScr(sl, groundScr(cam, ellipseXZ((o.x + G[0]) / 2, (o.z + G[1]) / 2, 0.8 * o.s / Math.sin(e) * 0.5 + 0.5, 0.8 * o.s, ang, 24))); }
      }
      const hero = standPrims(t);
      shadowShapes(hero, [0, 0], face, 5.78, sun).forEach((p) => fillScr(sl, groundScr(cam, p)));
      g.save(); g.globalAlpha = 0.38; g.globalCompositeOperation = "multiply"; g.drawImage(LS.c, 0, 0, W, H); g.restore();
      // sprites sorted far to near, split into far / mid / near layers for depth of field
      const items = [];
      for (const o of objs) { const c = camC(cam, [o.x, 0, o.z]); if (c[2] < cam.near) continue; items.push({ o, z: c[2], s: scr(cam, c) }); }
      items.push({ hero: true, z: camC(cam, [0, 0, 0])[2] });
      items.sort((a, b) => b.z - a.z);
      const lf = LF.fit(), lm = LM.fit(), ln = LN.fit();
      for (const it of items) {
        const L = !st.dof ? lm : it.z > d * 1.9 ? lf : it.z < d * 0.55 ? ln : lm;
        if (it.hero) { drawPrims(L, cam, hero, [0, 0], face, 5.78, sun); continue; }
        const k = f / it.z, hz = hazeT(it.z) * hzk, [x, y] = it.s, o = it.o;
        if (x < -W * 0.5 || x > W * 1.5) continue;
        if (o.k === "tree") tree(L, o, x, y, k, hz, lx, ly); else if (o.k === "bush") bush(L, o, x, y, k, hz, lx, ly); else if (o.k === "lamp") lamp(L, o, x, y, k, hz); else if (o.k === "flower") flower(L, o, x, y, k); else grass(L, o, x, y, k, hz);
      }
      if (st.dof) g.filter = `blur(${(1.6 * bscale).toFixed(2)}px)`; g.drawImage(LF.c, 0, 0, W, H); g.filter = "none";
      g.drawImage(LM.c, 0, 0, W, H);
      if (st.dof) g.filter = `blur(${(4.5 * bscale).toFixed(2)}px)`; g.drawImage(LN.c, 0, 0, W, H); g.filter = "none";
      // light beams from the sun (screen blend), glow kept when the sun is off frame
      if (st.rays) {
        const sx = sunS ? sunS[0] : lx > 0 ? W * 1.25 : -W * 0.25, sy = sunS ? sunS[1] : hy - H * 0.12;
        g.save(); g.globalCompositeOperation = "screen";
        for (let i = 0; i < 6; i++) { const a0 = Math.PI * (0.18 + i * 0.13) + Math.sin(t * 0.2 + i) * 0.02, a1 = a0 + 0.035 + (i % 3) * 0.015, Lr = W * 1.4; const gr = g.createRadialGradient(sx, sy, 0, sx, sy, Lr); gr.addColorStop(0, "rgba(255,226,170,.16)"); gr.addColorStop(1, "rgba(255,226,170,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a0) * Lr * (lx > 0 ? -1 : 1), sy + Math.sin(a0) * Lr); g.lineTo(sx + Math.cos(a1) * Lr * (lx > 0 ? -1 : 1), sy + Math.sin(a1) * Lr); g.closePath(); g.fill(); }
        g.restore();
      }
      if (st.vig) {
        const vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.hypot(W, H) * 0.62); vg.addColorStop(0, "rgba(5,7,16,0)"); vg.addColorStop(1, "rgba(5,7,16,.62)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
        if (!grainPat) grainPat = g.createPattern(grain, "repeat"); g.save(); g.globalAlpha = 0.06; g.globalCompositeOperation = "overlay"; g.fillStyle = grainPat; g.fillRect(0, 0, W, H); g.restore();
      }
      const v = (((az - face) % 360) + 360) % 360, vn = v < 22.5 || v >= 337.5 ? "depan" : v < 67.5 ? "3/4 kanan" : v < 112.5 ? "samping 90R" : v < 157.5 ? "3/4 belakang" : v < 202.5 ? "belakang" : v < 247.5 ? "3/4 belakang" : v < 292.5 ? "samping 90L" : "3/4 kiri";
      tag(g, `AZ ${String(Math.round(((az % 360) + 360) % 360)).padStart(3, "0")}° · SUDUT TOKOH ${Math.round(v)}° ${vn.toUpperCase()}`, 12, H - 14, K.ivory, 10);
      setHTML(stats, [["jarak", fmt(d, 1) + " H"], ["tinggi kamera", fmt(hc, 2) + " H"], ["f", Math.round(f) + " px"], ["matahari", "250° / 14°"]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join(""));
    });
  }

  /* ======================================================================
     5 · VKIT: character constructor kit (vector-character bab 3, 5.1, 14.1, 16, 18)
     body frame: X forward, L lateral (+ = right of the figure), y down; view v: u = X sin v - L cos v
     ====================================================================== */
  function curve(keys) {
    return (y) => {
      let i = 0; while (i < keys.length - 2 && y > keys[i + 1][0]) i++;
      const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(keys.length - 1, i + 2)], t = clamp((y - b[0]) / (c[0] - b[0] || 1)), t2 = t * t, t3 = t2 * t;
      return b.slice(1).map((_, k) => { const p0 = a[k + 1], p1 = b[k + 1], p2 = c[k + 1], p3 = d[k + 1]; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); });
    };
  }
  const rings = (keys, y0, y1, step = 0.025, map = (y) => y, wf = 1, df = 1) => { const f = curve(keys), out = []; for (let y = y0; y <= y1 + 1e-9; y += step) { const [w, d, xc] = f(y); out.push({ y: map(y), w: Math.max(0, w) * wf, d: Math.max(0, d) * df, xc }); } return out; };
  const loftPts = (rs, v, m) => { const sv = Math.sin(v), cv = Math.cos(v), L = [], R = []; for (const r of rs) { const c = r.xc * sv, hw = Math.pow(Math.pow(Math.abs(r.d * sv), m) + Math.pow(Math.abs(r.w * cv), m), 1 / m); L.push([c - hw, r.y]); R.push([c + hw, r.y]); } return L.concat(R.reverse()); };
  const HEADK = [[0.05, 0, 0, -0.02], [0.08, 0.2, 0.24, -0.03], [0.15, 0.29, 0.34, -0.03], [0.27, 0.338, 0.4, -0.025], [0.42, 0.36, 0.425, -0.015], [0.56, 0.365, 0.42, 0], [0.66, 0.35, 0.4, 0.01], [0.72, 0.32, 0.37, 0.02], [0.86, 0.24, 0.29, 0.03], [0.95, 0.155, 0.19, 0.04], [1.0, 0.1, 0.11, 0.045], [1.03, 0, 0, 0.045]];
  const HAIRK = [[-0.01, 0, 0, -0.12], [0.02, 0.14, 0.2, -0.12], [0.08, 0.23, 0.33, -0.12], [0.18, 0.36, 0.44, -0.12], [0.32, 0.43, 0.49, -0.12], [0.5, 0.465, 0.5, -0.13], [0.68, 0.49, 0.49, -0.14], [0.84, 0.53, 0.45, -0.15], [0.96, 0.55, 0.38, -0.16], [1.04, 0.5, 0.29, -0.16], [1.09, 0.3, 0.17, -0.16], [1.11, 0, 0, -0.16]];
  const NECKK = [[0.78, 0.15, 0.16, -0.06], [1.45, 0.165, 0.175, -0.05]];
  const TORSOK = [[0, 0.19, 0.18, -0.03], [0.025, 0.33, 0.26, -0.02], [0.05, 0.47, 0.33, -0.01], [0.085, 0.56, 0.38, 0], [0.13, 0.6, 0.42, 0.01], [0.2, 0.58, 0.435, 0.02], [0.35, 0.53, 0.42, 0.02], [0.55, 0.46, 0.38, 0], [0.75, 0.47, 0.4, 0], [0.95, 0.5, 0.43, 0], [1, 0.5, 0.43, 0]];
  const headF = curve(HEADK);
  const MODES = {
    kit: { n: "Gaya kit 6,3 H", sole: 6.3, shY: 1.42, shL: 0.52, elY: 2.36, wrY: 3.18, hipY: 3.18, hipL: 0.24, knY: 4.55, ankY: 5.95, hem: 5.82, neckB: 1.18, shirtHem: 3.05, wf: 1, hand: 1, lm: [["puncak", 0], ["dagu", 1], ["bahu", 1.29], ["selangkangan", 3.23], ["ujung jari", 3.66], ["lutut", 4.55], ["hem celana", 5.82], ["sol", 6.3]] },
    real: { n: "Realistis 7,5 H", sole: 7.5, shY: 1.56, shL: 0.78, elY: 3.0, wrY: 3.75, hipY: 3.66, hipL: 0.34, knY: 5.56, ankY: 7.15, hem: 7.02, neckB: 1.22, shirtHem: 3.55, wf: 1.42, hand: 1.2, lm: [["puncak", 0], ["dagu", 1], ["bahu", 1.37], ["selangkangan", 3.75], ["ujung jari", 4.6], ["lutut", 5.56], ["pergelangan kaki", 7.15], ["sol", 7.5]] },
  };
  const MAT = { hair: "#2f2536", skin: "#e8b690", top: "#c8724e", pants: "#24365f", sock: "#d6b06a", shoe: "#fbf6ea", sole: "#cdbb97", lip: "#a8504c", mouth: "#5b2531", teeth: "#fffaf0", tongue: "#de7b77", eye: "#231c26", blush: "#ef8f80", cup: "#f4ecd8", phone: "#1d2233" };
  const GRAY = { hair: "#555555", skin: "#c6c6c6", top: "#959595", pants: "#6d6d6d", sock: "#b0b0b0", shoe: "#e0e0e0", sole: "#a9a9a9", lip: "#8a8a8a", mouth: "#4a4a4a", teeth: "#f2f2f2", tongue: "#9b9b9b", eye: "#3a3a3a", blush: "#c6c6c6", cup: "#dedede", phone: "#4a4a4a" };
  const EXPR = {
    netral: { n: "Netral", b: [0, 0], lid: "open", m: { k: "line", w: 0.15, c: 0.018 } },
    senyum: { n: "Senyum", b: [-0.01, 3], lid: "open", m: { k: "D", w: 0.2, h: 0.07, tt: 1 } },
    tawa: { n: "Tertawa", b: [-0.03, 6], lid: "happy", m: { k: "D", w: 0.25, h: 0.13, tt: 1, tg: 1 } },
    sedih: { n: "Sedih", b: [-0.01, -16], lid: "half", m: { k: "line", w: 0.13, c: -0.022 } },
    marah: { n: "Marah", b: [0.025, 20], lid: "open", m: { k: "teeth", w: 0.18, h: 0.05 } },
    kaget: { n: "Kaget", b: [-0.06, -4], lid: "wide", m: { k: "O", w: 0.11, h: 0.14, tg: 1 } },
    ragu: { n: "Ragu", b: [0, 0], one: true, lid: "open", m: { k: "line", w: 0.13, c: -0.004, sk: 0.02 } },
    kedip: { n: "Kedip", b: [-0.01, 2], lid: "wink", m: { k: "D", w: 0.18, h: 0.06, tt: 1 } },
  };
  const VIS = [["A E I", { k: "D", w: 0.24, h: 0.13, tt: 1, tg: 1 }], ["O", { k: "O", w: 0.15, h: 0.15, tg: 1 }], ["C D N S T X Y Z", { k: "teeth", w: 0.22, h: 0.055 }], ["R", { k: "O", w: 0.16, h: 0.08, tt: 1 }], ["L", { k: "D", w: 0.2, h: 0.11, tt: 1, tg: 2 }], ["B M P", { k: "press", w: 0.15 }],
    ["F V", { k: "fv", w: 0.18, h: 0.045 }], ["Ee", { k: "D", w: 0.26, h: 0.07, tt: 1, tb: 1 }], ["Th", { k: "D", w: 0.19, h: 0.07, tt: 1, tg: 3 }], ["Ch J Sh", { k: "O", w: 0.17, h: 0.09, tt: 1, tb: 1 }], ["U", { k: "O", w: 0.1, h: 0.09 }], ["Q W", { k: "O", w: 0.08, h: 0.075 }]];
  const GEST = {
    rileks: { n: "Rileks", a: [6, 90, 12, 50], h: "relax" }, jempol: { n: "Jempol", a: [22, 40, 95, 10], h: "thumb" }, tunjuk: { n: "Menunjuk", a: [78, 25, 84, 20], h: "point" }, stop: { n: "Stop", a: [62, 20, 150, 5], h: "open" },
    kepal: { n: "Kepal angkat", a: [95, 85, 172, 60], h: "fist" }, dadah: { n: "Dadah", a: [112, 88, 162, 75], h: "open", wave: 1 }, cangkir: { n: "Cangkir", a: [24, 30, 100, 0], h: "cup" }, ponsel: { n: "Ponsel", a: [30, 25, 118, -10], h: "phone" },
  };
  const VIEWS = [[0, "Depan"], [45, "3/4"], [90, "Samping"], [180, "Belakang"], ["sheet", "Lembar 5 tampak"]];
  const TURN = [[90, "SAMPING"], [45, "3/4 DEPAN"], [0, "DEPAN"], [135, "3/4 BELAKANG"], [180, "BELAKANG"]];

  function drawMouth(g, x, y, m, sx, P, lineW) {
    const w = (m.w || 0.15) * sx, h = m.h || 0;
    g.lineCap = "round"; g.lineJoin = "round";
    if (m.k === "line" || m.k === "press") {
      g.strokeStyle = P.lip; g.lineWidth = lineW * (m.k === "press" ? 1.3 : 1); g.beginPath(); g.moveTo(x - w / 2, y + (m.sk || 0)); g.quadraticCurveTo(x, y + (m.c || 0) * 2, x + w / 2, y - (m.sk || 0)); g.stroke();
      if (m.k === "press") { g.lineWidth = lineW * 0.6; g.beginPath(); g.moveTo(x - w * 0.15, y + 0.03); g.lineTo(x + w * 0.15, y + 0.03); g.stroke(); }
      return;
    }
    const shape = () => { g.beginPath(); if (m.k === "O") g.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); else if (m.k === "teeth" || m.k === "fv") { const r = Math.min(h / 2, w / 4); g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, r) : g.rect(x - w / 2, y - h / 2, w, h); } else { g.moveTo(x - w / 2, y - h * 0.3); g.quadraticCurveTo(x, y - h * 0.42, x + w / 2, y - h * 0.3); g.quadraticCurveTo(x + w * 0.42, y + h * 0.75, x, y + h * 0.72); g.quadraticCurveTo(x - w * 0.42, y + h * 0.75, x - w / 2, y - h * 0.3); g.closePath(); } };
    shape(); g.fillStyle = m.k === "teeth" ? P.teeth : P.mouth; g.fill();
    g.save(); shape(); g.clip();
    if (m.k === "teeth") { g.strokeStyle = rgba(P.mouth, 0.55); g.lineWidth = lineW * 0.5; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.stroke(); }
    if (m.tt || m.k === "fv") { g.fillStyle = P.teeth; g.fillRect(x - w / 2, y - h, w, h * (m.k === "fv" ? 0.95 : 0.62)); }
    if (m.tb) { g.fillStyle = P.teeth; g.fillRect(x - w / 2, y + h * 0.28, w, h); }
    if (m.tg) { g.fillStyle = P.tongue; g.beginPath(); if (m.tg === 3) g.ellipse(x, y + h * 0.02, w * 0.22, h * 0.22, 0, 0, TAU); else if (m.tg === 2) g.ellipse(x, y - h * 0.08, w * 0.24, h * 0.3, 0, 0, TAU); else g.ellipse(x, y + h * 0.55, w * 0.32, h * 0.32, 0, 0, TAU); g.fill(); }
    g.restore();
    if (m.k === "fv") { g.fillStyle = mix(P.lip, P.skin, 0.35); g.beginPath(); g.ellipse(x, y + h * 0.35, w * 0.46, h * 0.45, 0, 0, TAU); g.fill(); }
    g.strokeStyle = m.k === "teeth" ? P.lip : mix(P.lip, P.skin, 0.2); g.lineWidth = lineW * 0.7; shape(); g.stroke();
    if (m.k === "D") { g.strokeStyle = mix(P.lip, P.skin, 0.4); g.lineWidth = lineW * 0.8; g.beginPath(); g.moveTo(x - w * 0.25, y + h * 0.82); g.quadraticCurveTo(x, y + h * 0.95, x + w * 0.25, y + h * 0.82); g.stroke(); }
  }
  // kit hand shapes in a local frame (a along the forearm toward the fingers, b across); relax = loose C grip 0.29 x 0.58 H (bab 18.4)
  function drawHand(g, type, W, dir, flip, sz, P, ink, lw, wave) {
    const pr = [-dir[1] * flip, dir[0] * flip], T = (a, b) => [W[0] + (dir[0] * a + pr[0] * b) * sz, W[1] + (dir[1] * a + pr[1] * b) * sz], Tl = (pts) => pts.map(([a, b]) => T(a, b));
    const skin = P.skin, dk = mix(P.skin, "#6b3b2e", 0.3), capF = (a, b, r1, r2, col) => fillPts(g, capPts(T(...a), T(...b), r1 * sz, r2 * sz), col, false);
    const up = [0, -1], Ts = (a, b) => [W[0] + up[0] * a * sz + b * sz, W[1] + up[1] * a * sz];
    const fist = () => { fillPts(g, Tl([[0, -0.11], [0.14, -0.145], [0.27, -0.12], [0.31, -0.02], [0.3, 0.09], [0.22, 0.145], [0.06, 0.13], [0, 0.1]]), skin); g.strokeStyle = dk; g.lineWidth = lw; g.lineCap = "round"; for (const b of [-0.05, 0.03]) { const a = T(0.2, b), c = T(0.29, b + 0.01); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); } };
    if (type === "relax") { fillPts(g, Tl([[0, -0.11], [0.1, -0.14], [0.26, -0.145], [0.42, -0.12], [0.53, -0.07], [0.58, 0], [0.55, 0.07], [0.45, 0.11], [0.33, 0.12], [0.2, 0.15], [0.08, 0.14], [0, 0.11]]), skin); capF([0.12, 0.1], [0.3, 0.16], 0.06, 0.05, skin); g.strokeStyle = dk; g.lineWidth = lw; g.lineCap = "round"; [[[0.36, -0.07], [0.5, -0.03]], [[0.36, 0.0], [0.5, 0.04]]].forEach(([a, b]) => { const p = T(...a), q = T(...b); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }); return; }
    if (type === "open") {
      const sp = wave ? 15 : 14, rel = [0.75, 0.94, 1.0, 0.92];
      fillPts(g, Tl([[0, -0.1], [0.16, -0.14], [0.28, -0.12], [0.3, 0.12], [0.16, 0.15], [0, 0.11]]), skin);
      [-0.105, -0.035, 0.035, 0.105].forEach((b, i) => { const an = (i - 1.5) * sp * RAD, L = 0.27 * rel[i], s = [0.26, b]; capF(s, [s[0] + Math.cos(an) * L, s[1] + Math.sin(an) * L], 0.036, 0.032, skin); });
      const ta = (1.5 * sp * 1.9 + 20) * RAD; capF([0.08, 0.12], [0.08 + Math.cos(ta) * 0.18, 0.12 + Math.sin(ta) * 0.18], 0.05, 0.04, skin); return;
    }
    if (type === "thumb") { fist(); const top = T(0.12, -0.1); fillPts(g, capPts(top, [top[0], top[1] - 0.2 * sz], 0.055 * sz, 0.05 * sz), skin, false); return; }
    if (type === "point") { fist(); capF([0.24, -0.08], [0.56, -0.08], 0.04, 0.036, skin); return; }
    if (type === "fist") { fist(); return; }
    if (type === "cup") { const c = T(0.17, 0.0); g.fillStyle = P.cup; g.beginPath(); g.roundRect ? g.roundRect(c[0] - 0.12 * sz, c[1] - 0.2 * sz, 0.24 * sz, 0.28 * sz, 0.035 * sz) : g.rect(c[0] - 0.12 * sz, c[1] - 0.2 * sz, 0.24 * sz, 0.28 * sz); g.fill(); g.fillStyle = MAT.sock; g.fillRect(c[0] - 0.12 * sz, c[1] - 0.11 * sz, 0.24 * sz, 0.05 * sz); g.strokeStyle = P.cup; g.lineWidth = 0.035 * sz; g.beginPath(); g.arc(c[0] + 0.14 * sz * flip, c[1] - 0.06 * sz, 0.06 * sz, -Math.PI / 2, Math.PI / 2, flip < 0); g.stroke(); fillPts(g, [[-0.13, -0.04], [0.13, -0.04], [0.12, 0.06], [-0.12, 0.07]].map(([a, b]) => [c[0] + a * sz, c[1] + b * sz]), skin); g.strokeStyle = dk; g.lineWidth = lw; [-0.05, 0.03].forEach((a) => { g.beginPath(); g.moveTo(c[0] + a * sz, c[1] - 0.035 * sz); g.lineTo(c[0] + a * sz, c[1] + 0.02 * sz); g.stroke(); }); return; }
    if (type === "phone") { const c = T(0.2, 0); fist(); g.fillStyle = P.phone; g.beginPath(); g.roundRect ? g.roundRect(c[0] - 0.09 * sz, c[1] - 0.3 * sz, 0.18 * sz, 0.33 * sz, 0.03 * sz) : g.rect(c[0] - 0.09 * sz, c[1] - 0.3 * sz, 0.18 * sz, 0.33 * sz); g.fill(); g.fillStyle = "#6f8fd1"; g.fillRect(c[0] - 0.07 * sz, c[1] - 0.27 * sz, 0.14 * sz, 0.24 * sz); fillPts(g, capPts([c[0] - 0.1 * sz * flip, c[1] - 0.08 * sz], [c[0] - 0.04 * sz * flip, c[1] - 0.15 * sz], 0.04 * sz, 0.035 * sz), skin, false); }
  }

  function drawKit(g, o) {
    const M = MODES[o.mode], v = o.v * RAD, sv = Math.sin(v), cv = Math.cos(v), P = o.style === "gray" ? GRAY : MAT, cut = o.style === "cut", flat = o.style === "flat";
    const INK = cut ? K.gold : null, lw = cut ? 0.014 : 0.02, E = o.explode || 0, kx = 0.46 * E;
    const pj = (X, L) => X * sv - L * cv, dp = (X, L) => X * cv + L * sv;
    const col = (c) => (cut ? "#1b2546" : c);
    const ink = (c) => (cut ? K.gold : mix(c, "#2a1a16", 0.22));
    const piece = (pts, c, off = [0, 0], smoothIt = true) => { if (!pts || pts.length < 3) return; g.save(); g.translate(off[0], off[1]); g.beginPath(); smoothIt ? smooth(g, pts) : lines(g, pts); g.fillStyle = col(c); g.fill(); if (cut) { g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); } g.restore(); };
    const seam = (a, b, c, off = [0, 0]) => { if (o.style === "gray") return; g.save(); g.translate(off[0], off[1]); g.strokeStyle = ink(c); g.lineWidth = cut ? lw : 0.018; g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); };
    const pivots = [];
    // skeleton (3D)
    const wf = M.wf, legR = [0.245 * wf, 0.155 * wf, 0.1 * wf], armR = [0.135 * wf, 0.105 * wf, 0.075 * wf], sideK = 1.12;
    const rv = (r) => Math.sqrt(Math.pow(r * sideK * sv, 2) + Math.pow(r * cv, 2));
    const G = GEST[o.gest] || GEST.rileks, legs = [], arms = [];
    for (const s of [1, -1]) {
      const open = s < 0 ? 0.04 : 0, hip = [0, M.hipY, s * M.hipL], kn = [0.03, M.knY, s * (M.hipL - 0.005 + open * 0.5)], an = [0, M.ankY, s * (M.hipL - 0.02 + open)];
      legs.push({ s, hip, kn, an, depth: dp(0, hip[2]) });
      const ang = s > 0 ? G.a.slice() : [6, 90, 12, 50];
      if (s > 0 && G.wave) ang[2] += 16 * Math.sin(o.t * TAU * 4 / 1.9);
      const dirA = (el, az) => [Math.sin(el * RAD) * Math.cos(az * RAD), Math.cos(el * RAD), Math.sin(el * RAD) * Math.sin(az * RAD) * s];
      const Sh = [0, M.shY, s * M.shL], up = M.elY - M.shY, fo = M.wrY - M.elY, d1 = dirA(ang[0], ang[1]), d2 = dirA(ang[2], ang[3]);
      const El = [Sh[0] + d1[0] * up, Sh[1] + d1[1] * up, Sh[2] + d1[2] * up], Wr = [El[0] + d2[0] * fo, El[1] + d2[1] * fo, El[2] + d2[2] * fo];
      arms.push({ s, Sh, El, Wr, hand: s > 0 ? G.h : "relax", depth: dp((Sh[0] + El[0] + Wr[0]) / 3, (Sh[2] + El[2] + Wr[2]) / 3), handDepth: dp(Wr[0], Wr[2]), wave: s > 0 && G.wave });
    }
    const P2 = (q) => [pj(q[0], q[2]), q[1]];
    const sgn = (L) => { const u = -L * cv; return Math.abs(u) > 0.05 ? Math.sign(u) : Math.sign(L * sv) || 1; };
    // explode offsets: one joint diameter + 0.055 H gap per piece along each chain (bab 5.1)
    const offL = (s, n) => [sgn(s) * kx * 0.55 * Math.min(n, 1.5), kx * n];
    const offA = (s, n) => [sgn(s) * kx * n, kx * 0.2 * n];
    // ---- draw order (bab 16.6): hair back, far limbs, legs + pelvis, neck, torso, near arms, head ----
    const back = cv < -0.17;
    const hairR = rings(HAIRK, -0.01, 1.11, 0.02), headR = rings(HEADK, 0.05, 1.03, 0.02);
    const headOff = [0, -kx], headTilt = (o.view === "sheet" ? 2 : 2) * (back ? -1 : 1);
    const inHead = (fn) => { g.save(); g.translate(headOff[0], headOff[1] + (o.bob || 0)); g.translate(0, 0.98); g.rotate(headTilt * RAD * (cv >= 0 ? 1 : -1) * 0.5); g.translate(0, -0.98); fn(); g.restore(); };
    if (!back) inHead(() => { piece(loftPts(hairR, v, 2), P.hair); });
    const drawArm = (a) => {
      const S2 = P2(a.Sh), E2 = P2(a.El), W2 = P2(a.Wr), dark = a.depth < -0.12 && Math.abs(sv) > 0.3, c = (x) => (dark ? mix(x, "#1a1424", 0.2) : x);
      const r = armR, o1 = offA(a.Sh[2], 1), o2 = offA(a.Sh[2], 2), o3 = offA(a.Sh[2], 3);
      piece(capPts(S2, E2, r[0], r[1]), c(P.skin), o1, false);
      const sl = cutCap(S2, E2, r[0] * 1.14, r[1] * 1.18, 0.55 * dist(S2, E2) || 0.01, 0.01, 0.01);
      piece(sl, c(P.top), o1, false);
      if (flat && sl.length > 2) { const d = [E2[0] - S2[0], E2[1] - S2[1]], m = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / m, d[0] / m], q = [S2[0] + d[0] * 0.53, S2[1] + d[1] * 0.53]; seam([q[0] + n[0] * r[0] * 1.05, q[1] + n[1] * r[0] * 1.05], [q[0] - n[0] * r[0] * 1.05, q[1] - n[1] * r[0] * 1.05], P.top, o1); }
      piece(capPts(E2, W2, r[1], r[2]), c(P.skin), o2, false);
      const d3 = [a.Wr[0] - a.El[0], a.Wr[1] - a.El[1], a.Wr[2] - a.El[2]], len3 = Math.hypot(...d3), d2 = [W2[0] - E2[0], W2[1] - E2[1]], len2 = Math.hypot(...d2) || 1e-6;
      const fs = clamp(len2 / len3, 0.4, 1), dir = len2 > 0.02 ? [d2[0] / len2, d2[1] / len2] : [0, 1];
      const flip = a.s * (cv >= 0 ? 1 : -1) * (Math.abs(sv) > 0.7 ? Math.sign(sv) * a.s * -1 : 1);
      g.save(); g.translate(o3[0], o3[1]);
      const PP = o.style === "gray" ? GRAY : cut ? Object.assign({}, MAT, { skin: "#1b2546", cup: "#1b2546", phone: "#1b2546" }) : MAT;
      drawHand(g, a.hand, W2, dir, flip, M.hand * (0.75 + 0.25 * fs), PP, ink(P.skin), 0.018, a.wave);
      g.restore();
      pivots.push([S2, o1], [E2, o2], [W2, o3]);
    };
    const drawLeg = (L, far) => {
      const c = (x) => (far ? mix(x, "#1a1424", 0.2) : x), H2 = P2(L.hip), K2 = P2(L.kn), A2 = P2(L.an), s = L.s;
      const o1 = offL(L.hip[2], 1.2), o2 = offL(L.hip[2], 2.3), o3 = offL(L.hip[2], 3.2), o4 = offL(L.hip[2], 3.9);
      // shoe: sneaker profile x lateral width, turned out 12 deg, hull in the view (bab 16.2)
      const prof = [[-0.16, 0], [-0.17, -0.12], [-0.08, -0.2], [0.06, -0.22], [0.22, -0.18], [0.36, -0.13], [0.46, -0.08], [0.5, -0.02], [0.48, 0]], out = 12 * s * RAD, pts = [], bot = [];
      for (const [px, py] of prof) for (const sd of [-1, 1]) { const wl = (0.1 + 0.03 * clamp(px / 0.4)) * wf, X0 = px * wf, L0 = sd * wl, X = X0 * Math.cos(out) - L0 * Math.sin(out) + L.an[0], Lr = X0 * Math.sin(out) + L0 * Math.cos(out) + L.an[2]; const q = [pj(X, Lr), M.sole + py * wf]; pts.push(q); if (py > -0.07) bot.push(q); }
      const hull = (Q) => { Q = Q.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], hi = []; for (const p of Q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of Q.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
      const sock = capPts([A2[0], A2[1] - 0.24 * wf], A2, rv(legR[2]) * 0.95, rv(legR[2]));
      piece(sock, c(P.sock), o3, false);
      const sh = hull(pts); piece(sh, c(P.shoe), o4);
      if (!cut && o.style !== "gray") { g.save(); g.translate(o4[0], o4[1]); g.beginPath(); smooth(g, sh); g.clip(); g.fillStyle = c(P.sole); g.beginPath(); lines(g, hull(bot)); g.fill(); g.fillRect(-9, M.sole - 0.035 * wf, 18, 0.2); g.restore(); }
      else if (o.style === "gray") { g.save(); g.translate(o4[0], o4[1]); g.beginPath(); smooth(g, sh); g.clip(); g.fillStyle = P.sole; g.fillRect(-9, M.sole - 0.05 * wf, 18, 0.2); g.restore(); }
      piece(capPts(H2, K2, rv(legR[0]), rv(legR[1]), 0.02 * wf, 0.01), c(P.pants), o1, false);
      const shin = cutCap(K2, A2, rv(legR[1]), rv(legR[2]) * 1.25, (M.hem - L.kn[1]) / (L.an[1] - L.kn[1]) * dist(K2, A2), 0.012, 0.012);
      piece(shin, c(mix(P.pants, "#000", 0.0)), o2, false);
      if (flat) { const hy = M.hem - 0.07, wv = rv(legR[2]) * 1.3; seam([A2[0] - wv, hy], [A2[0] + wv, hy], P.pants, o2); }
      pivots.push([H2, o1], [K2, o2], [A2, o3]);
    };
    const legsS = legs.slice().sort((a, b) => a.depth - b.depth), armsS = arms.slice().sort((a, b) => a.depth - b.depth);
    const behind = armsS.filter((a) => a.depth < -0.15), front = armsS.filter((a) => a.depth >= -0.15);
    behind.forEach(drawArm);
    legsS.forEach((L, i) => drawLeg(L, i === 0 && Math.abs(sv) > 0.3));
    // pelvis: top straight at the belt, bottom = two circles at the hip pivots (bab 5.1)
    const pelR = rings([[0, 0.47, 0.42, -0.01], [1, 0.47, 0.43, -0.02]], 0, 1, 0.25, (y) => lerp(M.shirtHem - 0.16, M.hipY, y), wf, 1 + (wf - 1) * 0.6);
    const pOff = [0, kx * 0.55];
    piece(loftPts(pelR, v, 1.3), P.pants, pOff, false);
    legs.forEach((L) => { const c = P2(L.hip); g.save(); g.translate(pOff[0], pOff[1]); g.fillStyle = col(P.pants); g.beginPath(); g.arc(c[0], c[1], rv(legR[0]), 0, TAU); g.fill(); if (cut) { g.strokeStyle = INK; g.lineWidth = lw; g.beginPath(); g.arc(c[0], c[1], rv(legR[0]), 0.05 * Math.PI, 0.95 * Math.PI); g.stroke(); } g.restore(); });
    if (flat && cv > 0.2) { const fx = pj(0.43 * (1 + (wf - 1) * 0.6), 0); seam([fx, M.shirtHem], [fx, M.hipY - 0.02], P.pants, pOff); }
    // neck + torso (loft, superellipse m 1.25 so 3/4 is not narrower than the front: bab 16.3)
    const neckR = rings(NECKK, 0.78, 1.45, 0.05), torsoR = rings(TORSOK, 0, 1, 0.025, (s) => lerp(M.neckB, M.shirtHem, s), wf, 1 + (wf - 1) * 0.6);
    const neckP = loftPts(neckR, v, 2);
    g.save(); g.translate(0, -kx * 0.4); piece(neckP, P.skin);
    if (flat && !back) { g.save(); g.beginPath(); smooth(g, neckP); g.clip(); g.translate(0, 0.075); g.rotate(headTilt * RAD * 0.5 * (cv >= 0 ? 1 : -1)); g.beginPath(); smooth(g, loftPts(headR, v, 2)); g.fillStyle = mix(P.skin, "#7a3f2c", 0.22); g.fill(); g.restore(); }
    g.restore();
    const torso = loftPts(torsoR, v, 1.25);
    piece(torso, P.top);
    if (flat) {
      g.save(); g.beginPath(); smooth(g, torso); g.clip(); g.fillStyle = mix(P.top, "#2a1a16", 0.12); g.fillRect(-3, M.shirtHem - 0.09, 6, 0.2);
      const rib = []; for (let th = o.v - 90; th <= o.v + 90; th += 10) { const r0 = torsoR[1], X = r0.xc + r0.d * Math.cos(th * RAD), L = r0.w * Math.sin(th * RAD); if (dp(Math.cos(th * RAD) / r0.d, Math.sin(th * RAD) / r0.w) < 0.02) continue; rib.push([pj(X, L), M.neckB + 0.04 + 0.05 * Math.max(0, Math.cos(th * RAD))]); }
      if (rib.length > 1) { g.strokeStyle = mix(P.top, "#2a1a16", 0.25); g.lineWidth = 0.05; g.lineCap = "round"; g.beginPath(); lines(g, rib, false); g.stroke(); g.strokeStyle = mix(P.top, "#2a1a16", 0.4); g.lineWidth = 0.014; g.beginPath(); lines(g, rib.map(([x, y]) => [x, y + 0.035]), false); g.stroke(); }
      g.restore();
    }
    // arms in front of the torso; hands raised in front of the face go after the head
    const headD = 0, late = front.filter((a) => a.handDepth > headD + 0.3 && a.Wr[1] < 1.6), early = front.filter((a) => !late.includes(a));
    early.forEach(drawArm);
    // head (face loft, ear, features, hair cover)
    inHead(() => {
      const face = loftPts(headR, v, 2);
      const fp = (y, L) => { const [w, d, xc] = headF(y), th = Math.asin(clamp(L / Math.max(w, 1e-3), -1, 1)), X = xc + d * Math.cos(th), nX = Math.cos(th) / Math.max(d, 1e-3), nL = Math.sin(th) / Math.max(w, 1e-3), nm = Math.hypot(nX, nL); return { u: pj(X, L), y, f: (nX * cv + nL * sv) / nm }; };
      const ear = () => { const [w, , xc] = headF(0.64), u = pj(xc - 0.03, w + 0.015); g.fillStyle = col(P.skin); g.beginPath(); g.ellipse(u, 0.64, 0.05 + 0.03 * Math.abs(sv), 0.09, 0, 0, TAU); g.fill(); if (cut) { g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); } else if (o.style !== "gray") { g.strokeStyle = mix(P.skin, "#6b3b2e", 0.3); g.lineWidth = 0.012; g.stroke(); g.strokeStyle = mix(P.skin, "#6b3b2e", 0.45); g.lineWidth = 0.014; g.beginPath(); g.arc(u + 0.005 * Math.sign(sv), 0.645, 0.035, -1.2, 1.2); g.stroke(); } };
      if (sv > -0.3 && sv <= 0.45 && !back) ear();
      piece(face, P.skin);
      if (back) { piece(loftPts(hairR, v, 2), P.hair); if (sv > 0.3) ear(); }
      else {
        const ex = EXPR[o.expr] || EXPR.netral, blink = o.blink;
        // nose: profile bump only when |sin v| > 0.5, merged into the face edge (bab 3, 16.3)
        if (Math.abs(sv) > 0.5) { const [, d, xc] = headF(0.66), fr = pj(xc + d, 0); g.fillStyle = col(P.skin); g.beginPath(); g.ellipse(fr - Math.sign(sv) * 0.008, 0.665, 0.05, 0.045, 0, 0, TAU); g.fill(); }
        // features stay inside the face silhouette
        g.save(); g.beginPath(); smooth(g, face); g.clip();
        // eyes: rx scaled by (0.55 + 0.45 facing), hidden when facing <= 0 (bab 16.4); kit eye 0.021 x 0.039 H, centres 0.27 H apart (bab 3, 18.5)
        for (const s of [1, -1]) {
          const e = fp(0.56, s * 0.135); if (e.f <= 0.04) continue;
          const rx = 0.021 * (0.55 + 0.45 * e.f), ry = 0.039 * (ex.lid === "wide" ? 1.15 : 1), al = clamp((e.f - 0.04) * 6);
          g.globalAlpha = al; g.fillStyle = cut ? K.gold : P.eye; g.strokeStyle = cut ? K.gold : P.eye; g.lineWidth = 0.018; g.lineCap = "round";
          const closed = blink || ex.lid === "happy" || (ex.lid === "wink" && s < 0);
          if (closed) { g.beginPath(); if (ex.lid === "happy" || ex.lid === "wink") { g.moveTo(e.u - rx * 1.6, 0.575); g.quadraticCurveTo(e.u, 0.52, e.u + rx * 1.6, 0.575); } else { g.moveTo(e.u - rx * 1.5, 0.56); g.quadraticCurveTo(e.u, 0.585, e.u + rx * 1.5, 0.56); } g.stroke(); }
          else { g.beginPath(); g.ellipse(e.u, 0.56, rx, ry, 0, 0, TAU); g.fill(); if (ex.lid === "half") { g.fillStyle = col(P.skin); g.fillRect(e.u - rx * 1.4, 0.56 - ry * 1.2, rx * 2.8, ry * 0.95); g.strokeStyle = cut ? K.gold : P.eye; g.beginPath(); g.moveTo(e.u - rx * 1.3, 0.56 - ry * 0.25); g.lineTo(e.u + rx * 1.3, 0.56 - ry * 0.25); g.stroke(); } }
          // brows: short thick capsule; angle per expression (inner end down = angry)
          const b = fp(0.44 + ex.b[0] - (ex.one && s > 0 ? 0.04 : 0), s * 0.14); if (b.f > 0.04) { const an = (ex.b[1] * (ex.one && s < 0 ? 0 : 1)) * RAD * s * (cv >= 0 ? 1 : -1), hl = 0.055 * (0.55 + 0.45 * b.f); g.strokeStyle = cut ? K.gold : P.hair; g.lineWidth = 0.032; g.beginPath(); g.moveTo(b.u - hl * Math.cos(an), b.y + hl * Math.sin(an)); g.lineTo(b.u + hl * Math.cos(an), b.y - hl * Math.sin(an)); g.stroke(); }
          if (flat) { const bl = fp(0.7, s * 0.24); if (bl.f > 0.1) { g.fillStyle = rgba(P.blush, 0.35 * bl.f); g.beginPath(); g.ellipse(bl.u, 0.7, 0.06 * (0.5 + 0.5 * bl.f), 0.038, 0, 0, TAU); g.fill(); } }
          g.globalAlpha = 1;
        }
        // nose: C line ~0.16 H inside the face (bab 3)
        const nz = fp(0.64, 0.0);
        if (Math.abs(sv) <= 0.5) { g.strokeStyle = cut ? K.gold : mix(P.skin, "#7a3f2c", 0.45); g.lineWidth = 0.02; g.lineCap = "round"; g.beginPath(); const dx = -0.025 * Math.sign(sv || 1) * (cv >= 0 ? 1 : -1); g.moveTo(nz.u, 0.58); g.quadraticCurveTo(nz.u - dx * 1.6, 0.67, nz.u + dx * 0.3, 0.72); g.stroke(); }
        // mouth: viseme or expression; slides to the profile edge as |sin v| grows (bab 0, 16.4)
        const mspec = o.vis ? (VIS.find((x) => x[0] === o.vis) || [0, ex.m])[1] : ex.m;
        const mc = fp(0.8, 0), ml = fp(0.8, 0.09), mr = fp(0.8, -0.09), span = Math.abs(ml.u - mr.u) / 0.18;
        const ps = smooth01((Math.abs(sv) - 0.8) / 0.17), [mw, md, mxc] = headF(0.8), edge = pj(mxc + md, 0) - Math.sign(sv) * 0.06;
        const mx = lerp(mc.u, edge, ps), sxm = Math.max(0.35, lerp(span, 0.45, ps)); void mw;
        const MP = cut ? Object.assign({}, MAT, { lip: K.gold, mouth: "#0e1430", teeth: "#e9dcbc", tongue: K.goldd, skin: "#1b2546" }) : P;
        drawMouth(g, mx, 0.8, mspec, sxm, MP, 0.02);
        g.restore();
        // hair cover: hairline table per head-ring angle th, visible arc around v, clipped to the face (bab 16.5)
        const HL = [[-180, 1.1], [-120, 1.05], [-95, 0.8], [-70, 0.58], [-45, 0.4], [-25, 0.2], [0, 0.24], [30, 0.3], [55, 0.36], [75, 0.42], [88, 0.5], [97, 0.86], [120, 1.02], [150, 1.08], [180, 1.1]];
        const hl = (th) => { th = ((th + 540) % 360) - 180; for (let i = 0; i < HL.length - 1; i++) if (th <= HL[i + 1][0]) return lerp(HL[i][1], HL[i + 1][1], (th - HL[i][0]) / (HL[i + 1][0] - HL[i][0])); return 1.1; };
        const vd = o.v, cover = [];
        for (let th = vd - 96; th <= vd + 96; th += 4) { const y = hl(th), [w, d, xc] = headF(Math.min(y, 0.85)), X = xc + d * Math.cos(th * RAD) * 1.02, L = w * Math.sin(th * RAD) * 1.02; cover.push([pj(X, L), y]); }
        if (cover.length > 2) {
          const a = cover[0], b = cover[cover.length - 1], poly = [...cover, [b[0] + (b[0] > a[0] ? 0.6 : -0.6), b[1]], [b[0] + (b[0] > a[0] ? 0.6 : -0.6), -0.4], [a[0] - (b[0] > a[0] ? 0.6 : -0.6), -0.4], [a[0] - (b[0] > a[0] ? 0.6 : -0.6), a[1]]];
          g.save(); g.beginPath(); smooth(g, face); g.clip();
          if (flat) { g.save(); g.translate(0, 0.045); g.beginPath(); lines(g, poly); g.fillStyle = mix(P.skin, "#7a3f2c", 0.2); g.fill(); g.restore(); }
          g.beginPath(); lines(g, poly); g.fillStyle = col(P.hair); g.fill(); g.restore();
          if (cut) { g.save(); g.beginPath(); smooth(g, face); g.clip(); g.strokeStyle = INK; g.lineWidth = lw; g.beginPath(); lines(g, cover, false); g.stroke(); g.restore(); }
        }
        // ear on the tucked side sits in front of the hair (bab 3)
        if (sv > 0.45) ear();
      }
      // shine band across the crown (dL* +7..+15), also seen from the back (bab 16.4)
      if (flat || o.style === "gray") { const hp = loftPts(hairR, v, 2); g.save(); g.beginPath(); smooth(g, hp); g.clip(); const cxh = pj(-0.12, 0); g.strokeStyle = mix(P.hair, "#ffffff", o.style === "gray" ? 0.12 : 0.08); g.lineWidth = 0.065; g.beginPath(); g.ellipse(cxh, 0.6, 0.44, 0.42, 0, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); g.strokeStyle = mix(P.hair, "#000", 0.25); g.lineWidth = 0.012; for (const k of [-0.18, 0.02, 0.2]) { g.beginPath(); g.moveTo(cxh + k, 0.16); g.lineTo(cxh + k * 1.1, 0.24); g.stroke(); } g.restore(); }
    });
    late.forEach(drawArm);
    // explode sheet: pivot points in white
    if (E > 0.02) { pivots.forEach(([p, off]) => { g.fillStyle = rgba("#ffffff", E); g.strokeStyle = rgba(K.goldd, E); g.lineWidth = 0.012; g.beginPath(); g.arc(p[0] + off[0], p[1] + off[1], 0.035, 0, TAU); g.fill(); g.stroke(); }); }
  }

  function vkit(el) {
    const st = { tab: "tampak", view: 0, turn: false, explode: false, lmk: false, expr: "netral", vis: "", lips: false, gest: "rileks", mode: "kit", style: "flat" };
    const TABS = [["tampak", "Tampak"], ["wajah", "Wajah"], ["mulut", "Mulut"], ["gestur", "Gestur"], ["gaya", "Gaya"]];
    el.innerHTML = shell("ds-vkit", `<div class="ds-stage ds-vk-stage"><span class="ds-tag ds-tag-dark ds-tag-l" data-vt>Tampak depan</span></div>`,
      `<div class="ds-tabs">${UI.chips("tab", TABS, st.tab)}</div>` +
      `<div class="ds-pane" data-pane="tampak">${UI.chips("view", VIEWS, st.view)}<div class="ds-tgs" style="margin-top:10px">${UI.tog("turn", "Turnaround 5 tampak", st.turn)}${UI.tog("explode", "Explode + pivot", st.explode)}${UI.tog("lmk", "Garis landmark", st.lmk)}</div></div>` +
      `<div class="ds-pane" data-pane="wajah">${UI.chips("expr", Object.entries(EXPR).map(([k, x]) => [k, x.n]), st.expr)}</div>` +
      `<div class="ds-pane" data-pane="mulut">${UI.chips("vis", [["", "Ikuti ekspresi"], ...VIS.map(([k]) => [k, k])], st.vis)}<div class="ds-tgs" style="margin-top:10px">${UI.tog("lips", "Putar lip-sync (hold ≥ 2 f)", st.lips)}</div></div>` +
      `<div class="ds-pane" data-pane="gestur">${UI.chips("gest", Object.entries(GEST).map(([k, x]) => [k, x.n]), st.gest)}</div>` +
      `<div class="ds-pane" data-pane="gaya">${UI.grp("Mode proporsi", UI.chips("mode", [["kit", MODES.kit.n], ["real", MODES.real.n]], st.mode))}${UI.grp("Lapisan gaya", UI.chips("style", [["flat", "Flat per bahan"], ["cut", "Siluet + garis potong"], ["gray", "Abu-abu per bahan"]], st.style))}</div>` +
      `<p class="ds-note" data-note></p>`,
      `<b>Catatan</b> Tokoh dirakit dari potongan berbentuk kapsul yang bertemu rapi di sendi. Proporsi tubuh, ukuran mata, dan bentuk mulut mengikuti ukuran tetap, sehingga tokoh tetap konsisten dari depan, samping, maupun belakang.`);
    const S = cv2d($(".ds-vk-stage", el)), note = $("[data-note]", el), vt = $("[data-vt]", el);
    const NOTES = {
      tampak: "Satu kit potongan, dirakit ulang per tampak. Turnaround memakai dip antisipasi sebelum putar dan settle kecil tiap ganti tampak.",
      wajah: "Ekspresi lewat alis (sudut, tinggi), kelopak (busur ^ tertawa, setengah tutup) dan mulut; mata tetap titik. Kedip = mata di-squash jadi garis.",
      mulut: "12 viseme, hold tanpa interpolasi minimal 2 frame per bunyi. Mulut terbuka = rongga gelap + gigi + lidah + bibir bawah menempel.",
      gestur: "Lengan utuh = potongan rig yang sama diputar di bahu + siku, tangan gestur dipasang di kait pergelangan. Dadah: lengan bawah ±16°, 4 ayunan dalam 1,9 s.",
      gaya: "Geometri sama untuk semua lapisan: mode proporsi = abu-abu per bahan tanpa garis dan kontak; gaya flat = warna rata per bahan + bayangan kontak; siluet + garis potong = satu bentuk dengan garis potong di dalamnya.",
    };
    const panes = () => { $$(".ds-pane", el).forEach((p) => p.classList.toggle("on", p.dataset.pane === st.tab)); note.textContent = NOTES[st.tab]; };
    let t = 0, exT = 0, turnT = 0, lipT = 0;
    bind(el, st, (k) => { if (k === "tab") panes(); if (k === "view") { st.turn = false; setTog(el, "turn", false); } if (k === "turn" && st.turn) { turnT = 0; } if (k === "vis") { st.lips = false; setTog(el, "lips", false); } if (k === "lips" && st.lips) lipT = 0; });
    panes();
    const LIPS = ["B M P", "O", "C D N S T X Y Z", "Ee", "O", "C D N S T X Y Z", "A E I", "R", "A E I", "F V", "Ee", "C D N S T X Y Z", "U", "Q W", "A E I", "L", "Th", "Ch J Sh", "B M P"];
    const HOLD = [3, 4, 2, 3, 2, 3, 4, 2, 3, 2, 3, 2, 3, 2, 4, 2, 2, 3, 6];
    visLoop(el, (dt) => {
      t += dt; exT += ((st.explode ? 1 : 0) - exT) * Math.min(1, dt * 7);
      const g = S.fit(), W = S.w, H = S.h, M = MODES[st.mode], blink = (t % 3.4) < 0.11;
      // sheet background (ivory kit sheet with a fine grid)
      g.fillStyle = "#efe6d2"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(156,122,60,.09)"; g.lineWidth = 1; for (let x = 0; x < W; x += 24) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); } for (let y = 0; y < H; y += 24) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      let vis = st.vis;
      if (st.lips) { lipT += dt; const f = Math.floor(lipT * 12) * 2; let acc = 0, i = 0; const tot = HOLD.reduce((a, b) => a + b, 0) * 2; const ff = f % tot; while (i < HOLD.length && acc + HOLD[i] * 2 <= ff) { acc += HOLD[i] * 2; i++; } vis = LIPS[Math.min(i, LIPS.length - 1)]; setChip(el, "vis", vis); }
      const views = [];
      if (st.view === "sheet") TURN.forEach(([v, n], i) => views.push({ v, n, cx: (i + 0.5) / 5 }));
      else if (st.turn) {
        turnT += dt; const hold = 1.05, idx = Math.floor(turnT / hold) % 5, ph = turnT % hold, [v, n] = TURN[idx];
        // dip anticipation before the turn, small settle after (pegas: amp, freq 3, decay 5)
        const dip = ph > hold - 0.2 ? Math.sin(((ph - (hold - 0.2)) / 0.2) * Math.PI / 2) : 0, settle = ph < 0.5 ? 0.05 * Math.sin(ph * 3 * TAU) / Math.exp(ph * 5) : 0;
        views.push({ v, n, cx: 0.5, dip, settle }); setChip(el, "view", [0, 45, 90, 180].includes(v) ? v : "");
      } else views.push({ v: st.view, n: (VIEWS.find((x) => x[0] === st.view) || [0, ""])[1].toUpperCase(), cx: 0.5 });
      const multi = views.length > 1, top = multi ? 24 : 18, bottom = multi ? 30 : 16, extra = exT * 2.6;
      const s = Math.min((H - top - bottom) / (M.sole + 0.15 + extra), multi ? (W / 5) / 2.1 : W / 3.2), lmX0 = multi ? 6 : W * 0.5 - s * 2.4;
      // landmark lines (bab 11 butir 27): same top, chin, shoulder, crotch, fingertip, knee, hem, sole on every view
      const oy = top + exT * 0.46 * s;
      if (st.lmk || st.view === "sheet") {
        g.save(); M.lm.forEach(([n, y]) => { const yy = oy + y * s; g.strokeStyle = "rgba(156,122,60,.35)"; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(multi ? 30 : lmX0, yy + 0.5); g.lineTo(multi ? W - 6 : W * 0.5 + s * 2.4, yy + 0.5); g.stroke(); g.setLineDash([]); if (!multi) tag(g, `${n} ${fmt(y, 2)} H`, W * 0.5 + s * 2.5, yy + 3, "#8a6a34", 9.5); else if (W >= 520) tag(g, fmt(y, 2), 4, yy + 3, "#8a6a34", 8); }); g.restore();
      }
      for (const V of views) {
        const ox = W * V.cx, bob = 0.004 * Math.sin(t * TAU / 3.1);
        g.save(); g.translate(ox, oy); g.scale(s, s);
        if (V.dip || V.settle) { const dy = (V.dip || 0) * 0.06 - (V.settle || 0) * 0.6; g.translate(0, M.sole); g.scale(1 + (V.dip || 0) * 0.015, 1 - (V.dip || 0) * 0.03 + (V.settle || 0) * 0.3); g.translate(0, -M.sole + dy); }
        // ground shadow (oval under the feet)
        g.fillStyle = `rgba(60,40,20,${(0.13 * (1 - exT)).toFixed(3)})`; g.beginPath(); g.ellipse(0, M.sole + 0.02, 0.9 * M.wf, 0.09, 0, 0, TAU); g.fill();
        drawKit(g, { v: V.v, mode: st.mode, style: st.style, expr: st.expr, vis, gest: st.gest, t, blink, explode: exT, bob, view: st.view });
        g.restore();
        if (multi) tag(g, V.n, ox, H - 10, "#5b4521", W < 520 ? 7 : 8.5, "center", CAPS);
      }
      const narrow = W < 460;
      const vtx = multi ? "Lembar 5 tampak · garis landmark" : narrow ? `${views[0].n.toLowerCase()} · ${views[0].v}°` : `Tampak ${views[0].n.toLowerCase()} · v ${views[0].v}°${st.turn ? " · turnaround" : ""}`;
      if (vt.textContent !== vtx) vt.textContent = vtx;
      const vdisp = multi && narrow ? "none" : ""; if (vt.style.display !== vdisp) vt.style.display = vdisp;
    });
  }

  /* ======================================================================
     6 · BAYANGAN: shadow from the 3D pose with a moveable sun (motion-graphics bab 5.3, scripts/bayangan3d.py)
     ====================================================================== */
  function bayangan(el) {
    const st = { az: 250, el: 55, cam: 135, walk: true, mode: "pose", ao: true };
    el.innerHTML = shell("ds-bayang", `<div class="ds-stage ds-by-stage ds-drag"><span class="ds-tag ds-tag-l">Seret untuk memindah matahari</span></div>`,
      `<div class="ds-sls">${UI.slider("az", "Azimut", 0, 359, 1, st.az)}${UI.slider("el", "Elevasi", 8, 80, 1, st.el)}</div>` +
      UI.grp("Sudut kamera", UI.chips("cam", [[180, "180"], [135, "135"], [90, "90"], [0, "0"]], st.cam)) +
      UI.grp("Bayangan tokoh", UI.chips("mode", [["pose", "Dari pose 3D"], ["fixed", "Kapsul tetap (ditolak)"]], st.mode)) +
      `<div class="ds-tgs">${UI.tog("walk", "Jalan", st.walk)}${UI.tog("ao", "Oklusi kontak", st.ao)}</div>` +
      `<div class="ds-stats" data-stats></div>`,
      `<b>Catatan</b> Bayangan dihitung dari pose tubuh dan posisi matahari, jadi ikut memanjang dan berputar saat matahari dipindah. Semua bayangan digabung dalam satu lapisan supaya tidak menumpuk gelap, dan ada bayangan kontak tipis di tempat kaki menyentuh tanah.`);
    const S = cv2d($(".ds-by-stage", el)), stats = $("[data-stats]", el), LS = S.layer(), LA = S.layer();
    const gt = figGait();
    bind(el, st, () => sync()); const sync = () => { outp(el, "az", Math.round(st.az) + "°"); outp(el, "el", Math.round(st.el) + "°"); }; sync();
    const box = $(".ds-by-stage", el); let drag = null;
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, az: st.az, el: st.el }; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", (e) => { if (!drag) return; st.az = (((drag.az + (e.clientX - drag.x) * 0.6) % 360) + 360) % 360; st.el = clamp(drag.el - (e.clientY - drag.y) * 0.35, 8, 80); setSl(el, "az", st.az); setSl(el, "el", st.el); sync(); });
    const up = () => (drag = null); box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    let t = 0, camAz = st.cam;
    visLoop(el, (dt) => {
      if (st.walk) t += dt;
      camAz += ((((st.cam - camAz + 540) % 360) - 180)) * Math.min(1, dt * 4);
      const g = S.fit(), W = S.w, H = S.h, f = Math.max(0.62 * W, 0.95 * H), pitch = 4, d = 10, sole = 5.78;
      const p = (t / gt.g.T) % 1, base = [gt.v * t, 0], face = 90;
      const hc = camHeight(d, pitch, f, H / 2, 0.8 * H), cam = camOrbit([base[0], 0, base[1]], d, hc, camAz, pitch, f, W / 2, H / 2), hy = horizonY(cam), sun = sunDir(st.az, st.el);
      // sky + plaza ground with world tiles every 1 H (they scroll with the world: feet stay planted)
      const sk = g.createLinearGradient(0, 0, 0, hy); sk.addColorStop(0, "#9cc0d2"); sk.addColorStop(1, "#f0dcc0"); g.fillStyle = sk; g.fillRect(0, 0, W, hy + 1);
      const gg = g.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, "#d9c9a8"); gg.addColorStop(1, "#c4ae86"); g.fillStyle = gg; g.fillRect(0, hy, W, H - hy);
      g.strokeStyle = "rgba(120,96,60,.28)"; g.lineWidth = 1;
      const cx0 = Math.floor(base[0]) - 30, segs = [];
      for (let x = cx0; x <= cx0 + 60; x++) segs.push([[x, -24], [x, 24]]);
      for (let z = -24; z <= 24; z++) segs.push([[cx0, z], [cx0 + 60, z]]);
      for (const [a, b] of segs) { const A = camC(cam, [a[0], 0, a[1]]), B = camC(cam, [b[0], 0, b[1]]); if (A[2] < cam.near && B[2] < cam.near) continue; let P1 = A, P2 = B; if (P1[2] < cam.near) { const k = (cam.near - P1[2]) / (P2[2] - P1[2]); P1 = [P1[0] + (P2[0] - P1[0]) * k, P1[1] + (P2[1] - P1[1]) * k, cam.near]; } if (P2[2] < cam.near) { const k = (cam.near - P2[2]) / (P1[2] - P2[2]); P2 = [P2[0] + (P1[0] - P2[0]) * k, P2[1] + (P1[1] - P2[1]) * k, cam.near]; } const s1 = scr(cam, P1), s2 = scr(cam, P2); g.beginPath(); g.moveTo(s1[0], s1[1]); g.lineTo(s2[0], s2[1]); g.stroke(); }
      // planters along the walk (world props with their own shadows)
      const props = []; for (let k = Math.floor(base[0] / 6) - 4; k <= Math.floor(base[0] / 6) + 5; k++) props.push([k * 6 + 3, k % 2 ? 3.2 : -3.2]);
      const prims = walkPrims(gt, p);
      const sl = LS.fit(); sl.fillStyle = "#3a3f66";
      if (st.mode === "pose") shadowShapes(prims, base, face, sole, sun).forEach((q) => fillScr(sl, groundScr(cam, q)));
      else fillScr(sl, groundScr(cam, ellipseXZ(base[0] + 0.1, base[1], 0.9, 0.38, 0, 32)));
      const e = Math.asin(sun[1]), shd = [-sun[0], -sun[2]], m = Math.hypot(...shd) || 1, ang = Math.atan2(shd[1] / m, shd[0] / m);
      props.forEach(([x, z]) => { const G = groundOf([x, 1.6, z], sun); fillScr(sl, groundScr(cam, ellipseXZ((x + G[0]) / 2, (z + G[1]) / 2, Math.hypot(G[0] - x, G[1] - z) / 2 + 0.6, 0.62, ang, 28))); });
      g.save(); g.globalAlpha = 0.34; g.globalCompositeOperation = "multiply"; g.drawImage(LS.c, 0, 0, W, H); g.restore();
      if (st.ao && st.mode === "pose") { const la = LA.fit(); la.fillStyle = "#3b4a3a"; contactShapes(prims, base, face, sole).forEach(([q, k]) => { la.globalAlpha = k; fillScr(la, groundScr(cam, q)); }); la.globalAlpha = 1; g.save(); g.globalAlpha = 0.22 * 2.2; g.globalCompositeOperation = "multiply"; g.drawImage(LA.c, 0, 0, W, H); g.restore(); }
      // props + figure sorted by depth
      const items = props.map(([x, z]) => ({ x, z, c: camC(cam, [x, 0, z]) })).filter((q) => q.c[2] > cam.near).map((q) => ({ ...q, zz: q.c[2] }));
      const heroC = camC(cam, [base[0], 0, base[1]]), heroX = scr(cam, heroC)[0];
      items.push({ hero: true, zz: heroC[2] }); items.sort((a, b) => b.zz - a.zz);
      for (const it of items) {
        if (it.hero) { drawPrims(g, cam, prims, base, face, sole, sun); continue; }
        const s0 = scr(cam, it.c), k = f / it.zz, [lx] = light2d(cam, sun);
        // a prop between camera and figure is faded so the feet stay readable
        g.globalAlpha = it.zz < heroC[2] && Math.abs(s0[0] - heroX) < 1.6 * k ? 0.28 : 1;
        g.fillStyle = "#8b6b4a"; g.beginPath(); g.roundRect ? g.roundRect(s0[0] - 0.55 * k, s0[1] - 0.9 * k, 1.1 * k, 0.9 * k, 0.08 * k) : g.rect(s0[0] - 0.55 * k, s0[1] - 0.9 * k, 1.1 * k, 0.9 * k); g.fill();
        g.fillStyle = "rgba(255,240,210,.25)"; g.fillRect(lx > 0 ? s0[0] + 0.15 * k : s0[0] - 0.55 * k, s0[1] - 0.9 * k, 0.4 * k, 0.9 * k);
        g.fillStyle = "#5f7d48"; for (const [dx, dy, r] of [[-0.3, -1.05, 0.38], [0.25, -1.1, 0.42], [0, -1.4, 0.4]]) { g.beginPath(); g.arc(s0[0] + dx * k, s0[1] + dy * k, r * k, 0, TAU); g.fill(); }
        g.fillStyle = "#8ea55c"; g.beginPath(); g.arc(s0[0] + (lx > 0 ? 0.15 : -0.15) * k, s0[1] - 1.5 * k, 0.2 * k, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      // sun compass: figure facing (east), sun azimuth, shadow direction, elevation
      const R0 = Math.min(40, W * 0.09), cxp = W - R0 - 14, cyp = R0 + 14;
      g.fillStyle = "rgba(7,10,22,.72)"; g.beginPath(); g.arc(cxp, cyp, R0 + 6, 0, TAU); g.fill(); g.strokeStyle = "rgba(242,215,150,.45)"; g.lineWidth = 1; g.beginPath(); g.arc(cxp, cyp, R0, 0, TAU); g.stroke();
      const A = (a, r) => [cxp + Math.sin(a * RAD) * r, cyp - Math.cos(a * RAD) * r];
      tag(g, "U", cxp, cyp - R0 + 9, K.muted, 8, "center");
      const sp = A(st.az, R0 * (1 - st.el / 90)), shp = A(st.az + 180, R0 * 0.9 * Math.min(1, 0.35 / Math.tan(st.el * RAD) + 0.2));
      g.strokeStyle = "rgba(160,170,230,.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cxp, cyp); g.lineTo(shp[0], shp[1]); g.stroke();
      g.fillStyle = K.gold2; g.beginPath(); g.arc(sp[0], sp[1], 4.5, 0, TAU); g.fill(); const fa = A(face, R0 * 0.5); g.strokeStyle = K.ivory; g.beginPath(); g.moveTo(cxp, cyp); g.lineTo(fa[0], fa[1]); g.stroke();
      tag(g, st.mode === "pose" ? "BAYANGAN DARI POSE 3D · IKUT MELANGKAH" : "KAPSUL TETAP · TIDAK BERUBAH SAAT BERGERAK", 12, H - 14, st.mode === "pose" ? "#1c2340" : "#8a2e22", 10);
      const len = 5.78 / Math.tan(st.el * RAD);
      setHTML(stats, [["elevasi e", Math.round(st.el) + "°"], ["bayangan kepala", fmt(len, 2) + " H"], ["sumbu elips bola", fmt(1 / Math.sin(st.el * RAD), 2) + " × r"], ["fase p", fmt(p, 2)]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join(""));
    });
  }

  /* ======================================================================
     7 · TANKER: a product tanker berths at an oil jetty in one take (same 3D projection as orbit3d)
     world in metres: x along the quay, y up (water level 0), z off the quay face (water z > 0, land z < 0)
     ship frame: u forward, v up, w to starboard (the quay is on the port side, -w)
     ====================================================================== */
  function hullHB(Hs, u) {
    const bs = Hs.L / 2 - Hs.bow; if (u > bs) { const k = (u - bs) / Hs.bow; return Hs.B / 2 * Math.pow(Math.max(0, 1 - k * k), 0.55); }
    const ss = -Hs.L / 2 + Hs.stern; if (u < ss) { const k = (ss - u) / Hs.stern; return Hs.B / 2 * (1 - Hs.tr * k * k); }
    return Hs.B / 2;
  }
  const hullDH = (Hs, u) => Hs.fb + Hs.sheer * smooth01((u - (Hs.L / 2 - Hs.bow * 1.3)) / (Hs.bow * 1.3)) + Hs.sheerA * smooth01((-Hs.L / 2 + Hs.stern * 1.6 - u) / (Hs.stern * 1.6));
  function hullPt(Hs, s, side, v, grow = 0) {
    const u0 = -Hs.L / 2 + Hs.L * s, dh = hullDH(Hs, u0), vf = clamp(v / dh, 0, 1.3), bw = smooth01((u0 - (Hs.L / 2 - Hs.bow)) / Hs.bow);
    return [u0 + Hs.rake * vf * bw, v, side * (hullHB(Hs, u0) * (1 + Hs.flare * vf * bw) + grow)];
  }
  // closed loop around the hull (starboard stern -> bow tip -> port stern); vfn(u0) gives v at each column
  function hullLoop(Hs, N, vfn, grow = 0) {
    const out = [];
    for (let k = 0; k <= N; k++) { const s = Math.pow(k / N, 0.92), u0 = -Hs.L / 2 + Hs.L * s; out.push(hullPt(Hs, s, 1, vfn(u0), grow)); }
    for (let k = N - 1; k >= 0; k--) { const s = Math.pow(k / N, 0.92), u0 = -Hs.L / 2 + Hs.L * s; out.push(hullPt(Hs, s, -1, vfn(u0), grow)); }
    return out;
  }
  const ribbon = (Hs, N, rowsV, T, grow = 0) => { const rows = rowsV.map((fn) => hullLoop(Hs, N, fn, grow)); const cols = rows[0].length; return { rows: rows.length, cols, pts: [].concat(...rows).map(T) }; };
  // box in a local frame T: [u0, u1, v0, v1, w0, w1]; flat 3-tone faces with a thin ink edge
  const BOXF = [[[0, 4, 6, 2], [-1, 0, 0]], [[1, 3, 7, 5], [1, 0, 0]], [[0, 1, 5, 4], [0, -1, 0]], [[2, 6, 7, 3], [0, 1, 0]], [[0, 2, 3, 1], [0, 0, -1]], [[4, 5, 7, 6], [0, 0, 1]]];
  function drawBox(g, cam, T, b, col, sun, o = {}) {
    const c = []; for (let i = 0; i < 8; i++) c.push(T([i & 1 ? b[1] : b[0], i & 2 ? b[3] : b[2], i & 4 ? b[5] : b[4]]));
    const ctr = T([(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2]);
    for (const [ix, n] of BOXF) {
      const fc = [0, 1, 2].map((k) => (c[ix[0]][k] + c[ix[1]][k] + c[ix[2]][k] + c[ix[3]][k]) / 4), nW = nrm3(sub3(T([(b[0] + b[1]) / 2 + n[0], (b[2] + b[3]) / 2 + n[1], (b[4] + b[5]) / 2 + n[2]]), ctr));
      if (dot3(nW, sub3(fc, cam.pos)) >= 0) continue;
      const P = o.near ? polyScrN(cam, ix.map((i) => c[i]), o.near) : polyScr(cam, ix.map((i) => c[i])); if (!P) continue;
      const lam = dot3(nW, sun), fcol = o.flat ? col : lam > 0.04 ? mix(col, o.lit || "#fff6e2", 0.06 + 0.22 * lam) : mix(col, o.dk || "#2c2440", 0.3);
      g.fillStyle = fcol; g.beginPath(); lines(g, P); g.fill();
      if (o.lw) { g.strokeStyle = o.ink || "rgba(24,18,34,.5)"; g.lineWidth = o.lw; g.lineJoin = "round"; g.stroke(); }
    }
  }
  const polyScrN = (c, pts3, near) => { const cs = clipNear(pts3.map((P) => camC(c, P)), near); return cs.length < 3 ? null : cs.map((q) => scr(c, q)); };
  // flat window strip on a box face: [axis (0 = forward face, +-1 = side), plane, a0, a1, v0, v1]; drawn only when that face looks at the camera
  function winQuad(g, cam, T, q, col) {
    const [ax, at, a0, a1, v0, v1] = q, pt = (a, v) => (ax === 0 ? T([at + 0.06, v, a]) : T([a, v, at + 0.06 * ax])), C = ax === 0 ? T([at, (v0 + v1) / 2, 0]) : T([(a0 + a1) / 2, (v0 + v1) / 2, at]), N = ax === 0 ? T([at + 1, (v0 + v1) / 2, 0]) : T([(a0 + a1) / 2, (v0 + v1) / 2, at + ax]);
    if (dot3(sub3(N, C), sub3(C, cam.pos)) >= 0) return;
    const P = polyScr(cam, [pt(a0, v0), pt(a1, v0), pt(a1, v1), pt(a0, v1)]); if (!P) return; g.fillStyle = col; g.beginPath(); lines(g, P); g.fill();
  }
  function polyline3(g, cam, pts) { let on = false; for (const P of pts) { const q = camC(cam, P); if (q[2] < cam.near) { on = false; continue; } const s = scr(cam, q); on ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); on = true; } }
  // Hermite through keys [u, ...values]; tangents from neighbours, zero where the key says stop
  function keyed(keys, u) {
    const n = keys.length; u = clamp(u, keys[0][0], keys[n - 1][0]);
    let i = 0; while (i < n - 2 && u > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], du = b[0] - a[0] || 1, t = (u - a[0]) / du;
    const tan = (j) => { const k = keys[j]; if (k.stop || j === 0 || j === n - 1) return k.slice(1).map(() => 0); const p = keys[j - 1], q = keys[j + 1]; return k.slice(1).map((_, m) => (q[m + 1] - p[m + 1]) / (q[0] - p[0])); };
    const ma = tan(i), mb = tan(i + 1);
    return a.slice(1).map((_, m) => hermite(a[m + 1], b[m + 1], ma[m] * du, mb[m] * du, t));
  }
  const stopK = (k) => Object.assign(k, { stop: true });

  function tanker(el) {
    const DUR = 46, st = { play: true, spd: 1, cam: "udara", sky: "siang", lbl: true, tl: 0 };
    el.innerHTML = shell("ds-tanker", `<div class="ds-stage ds-tk-stage ds-drag"><span class="ds-tag">Seret untuk memutar kamera</span></div>`,
      `<div class="ds-sls">${UI.slider("tl", "Waktu", 0, 100, 0.1, 0)}</div>` +
      UI.grp("Putar", `<div class="ds-flexrow">${UI.tog("play", "Jalan", st.play)}<div class="ds-chips" data-k="act"><button type="button" class="ds-chip" data-v="ulang">Ulangi dari awal</button></div>${UI.chips("spd", [[0.5, "0,5×"], [1, "1×"], [2, "2×"]], st.spd)}</div>`) +
      UI.grp("Sudut kamera", UI.chips("cam", [["udara", "Udara"], ["laut", "Dari laut"], ["ujung", "Ujung dermaga"], ["darat", "Dari darat"]], st.cam)) +
      UI.grp("Suasana", `<div class="ds-flexrow">${UI.chips("sky", [["siang", "Siang"], ["senja", "Senja"]], st.sky)}${UI.tog("lbl", "Nama tali", st.lbl)}</div>`) +
      `<div class="ds-stats" data-stats></div>`,
      `<b>Catatan</b> Satu adegan utuh tanpa potongan: kapal tanker datang pelan, kapal tunda mendorong dari samping, kapal menempel lembut di fender, lalu tali tambat dipasang satu per satu dan lengan muat tersambung. Semuanya digambar dari kode, jadi sudut kamera, waktu, dan suasana bisa diganti kapan saja.`);
    const box = $(".ds-tk-stage", el), S = cv2d(box), stats = $("[data-stats]", el), LR = S.layer();
    let t = 0, scrub = false, hold = 0;
    const camP = { az: 22, el: 17, d: 320 }, PRE = { udara: { az: 22, el: 17, d: 320 }, laut: { az: 352, el: 6, d: 250 }, ujung: { az: 78, el: 11, d: 300 }, darat: { az: 205, el: 13, d: 240 } };
    let camT = { ...PRE.udara }, drag = null;
    const outT = () => outp(el, "tl", `${Math.floor(t)}/${DUR} dtk`);
    bind(el, st, (k, v) => {
      if (k === "tl") { t = v / 100 * DUR; hold = 0; outT(); }
      else if (k === "cam") camT = { ...PRE[v] };
      else if (k === "act") { t = 0; hold = 0; st.play = true; setTog(el, "play", true); $$(".ds-chips[data-k=act] .ds-chip", el).forEach((b) => b.classList.remove("on")); }
    });
    outT();
    const tl = $('input[data-k="tl"]', el);
    tl.addEventListener("pointerdown", () => (scrub = true)); const unS = () => (scrub = false); tl.addEventListener("pointerup", unS); tl.addEventListener("change", unS);
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, az: camT.az, el: camT.el }; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", (e) => { if (!drag) return; camT.az = drag.az - (e.clientX - drag.x) * 0.4; camT.el = clamp(drag.el + (e.clientY - drag.y) * 0.18, 3, 55); });
    const up = () => (drag = null); box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);

    // ---------- the ships ----------
    const SH = { L: 176, B: 28, fb: 7.6, bow: 40, stern: 14, tr: 0.16, sheer: 2.4, sheerA: 0.7, rake: 7, flare: 0.05 };
    const TG = { L: 28, B: 10, fb: 2.4, bow: 9, stern: 5, tr: 0.3, sheer: 1.3, sheerA: 0.2, rake: 1.6, flare: 0.08 };
    const BZ = SH.B / 2 + 1.7;
    // ship centre path: approach on a slant, slow and straighten, then sideways onto the fenders
    const SK = [[0, -370, 128, -9.5], [0.18, -215, 84, -9], [0.36, -84, 44, -6], [0.52, -15, 27, -1.6], [0.6, 0, 22.5, 0], stopK([0.75, 0, BZ, 0]), [1, 0, BZ, 0]];
    const shipAt = (u) => { const [x, z, psi] = keyed(SK, u); return { x, z, psi: psi * RAD }; };
    // tug pose in the ship frame: escort at the offshore bow, swing in, push square on, back off and leave
    const TK = [[0, 50, SH.B / 2 + 10, 0], [0.44, 40, SH.B / 2 + 11, 0], [0.54, 24, SH.B / 2 + 17, -55], stopK([0.61, 20, SH.B / 2 + TG.L / 2 + 0.6, -90]), stopK([0.77, 20, SH.B / 2 + TG.L / 2 + 0.6, -90]), [0.86, 22, SH.B / 2 + 34, -100], [1, 60, SH.B / 2 + 80, -160]];
    const KN = [[0, 2.6], [0.18, 2.1], [0.36, 1.3], [0.52, 0.7], [0.6, 0.35], [0.7, 0.18], [0.75, 0], [1, 0]];
    const knAt = (u) => { let i = 0; while (i < KN.length - 2 && u > KN[i + 1][0]) i++; const a = KN[i], b = KN[i + 1]; return lerp(a[1], b[1], clamp((u - a[0]) / (b[0] - a[0]))); };
    const frame = (p, heave = 0, roll = 0, mir = false) => { const c = Math.cos(p.psi), s = Math.sin(p.psi), sr = Math.sin(roll); return (q) => { const y = q[1] + heave + q[2] * sr; return [p.x + q[0] * c - q[2] * s, mir ? -y : y, p.z + q[0] * s + q[2] * c]; }; };
    // mooring lines: fairlead (ship u, port side) -> bollard x on the quay; thrown in order, then hove tight
    const LINES = [["Tali depan", 80, 121], ["Tali samping depan", 66, 77], ["Tali silang depan", 50, 11], ["Tali silang belakang", -50, -11], ["Tali samping belakang", -68, -77], ["Tali belakang", -82, -121]].map(([n, u, bx], i) => ({ n, u, bx, t0: 0.765 + i * 0.026 }));
    const BOLL = []; for (let x = -121; x <= 121; x += 22) BOLL.push(x);
    const FEND = []; for (let x = -110; x <= 110; x += 22) FEND.push(x);
    const TANKS = [[-120, -112, 17, 15], [-76, -116, 15, 14], [-32, -121, 17, 16], [16, -117, 13, 12], [58, -112, 17, 15], [104, -120, 15, 14], [-98, -166, 19, 17], [-44, -172, 19, 18], [14, -168, 17, 16], [72, -166, 19, 17], [150, -150, 16, 14]];
    const TREES = [], RT = rng(5); while (TREES.length < 46) { const x = (RT() - 0.5) * 520, z = -64 - RT() * 230; if (TANKS.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7) || (x > 20 && x < 52 && z > -44)) continue; TREES.push([x, z, 5 + RT() * 4, RT()]); }
    const R = rng(21), WAVES = []; for (let i = 0; i < 420; i++) WAVES.push([(R() - 0.5) * 1100, 3 + Math.pow(R(), 1.6) * 760, 3 + R() * 7, R() * TAU]);
    const prof = mtProfile(31, 540, 30, 150, { power: 1.4, octs: [[4, 1], [9, 0.5], [19, 0.25], [41, 0.12], [83, 0.06]] });
    const profN = mtProfile(37, 540, 12, 40, { power: 1.2, octs: [[7, 1], [17, 0.5], [37, 0.25]] });
    const SKY = {
      siang: { top: "#5f93c2", mid: "#a9c8de", hor: "#eef1ea", sun: sunDir(205, 38), sunC: "rgba(255,246,220,", w0: "#8fb2c2", w1: "#2f5d76", wave: "rgba(255,255,255,", hill: "#8aa0a8", hillN: "#6f8a86", land: "#a7a58f", far: "#7f9672", quay: "#c9c2b2", lamp: 0, glint: "rgba(255,250,235," },
      senja: { top: "#232650", mid: "#8a5a86", hor: "#f2a25e", sun: sunDir(258, 5), sunC: "rgba(255,196,128,", w0: "#c98a74", w1: "#262a4c", wave: "rgba(255,198,150,", hill: "#5a4a6a", hillN: "#433a58", land: "#6a6270", far: "#4c4a5c", quay: "#9a8f8e", lamp: 1, glint: "rgba(255,178,104," },
    };
    // ship + tug parts
    const shipParts = (p, heave, roll, mir) => {
      const T = frame(p, heave, roll, mir), dh0 = hullDH(SH, -SH.L / 2 + 16), A = -SH.L / 2;
      return { T, dh0, stack: [[A + 8, A + 24, dh0, dh0 + 11.5, -11, 11, "#eceae3"], [A + 10, A + 24, dh0 + 11.5, dh0 + 14.5, -9.5, 9.5, "#eceae3"], [A + 13, A + 24.6, dh0 + 14.5, dh0 + 17.6, -14, 14, "#eceae3"], [A + 15, A + 23, dh0 + 17.6, dh0 + 18.6, -6, 6, "#d9d6cd"]],
        wins: [[0, A + 24, -9, 9, dh0 + 2.2, dh0 + 3.2], [0, A + 24, -9, 9, dh0 + 5, dh0 + 6], [0, A + 24, -9, 9, dh0 + 7.8, dh0 + 8.8], [0, A + 24, -8, 8, dh0 + 12.4, dh0 + 13.4], [0, A + 24.6, -13, 13, dh0 + 15.6, dh0 + 17],
          ...[2.2, 5, 7.8].flatMap((v) => [[1, 11, A + 10, A + 22, dh0 + v, dh0 + v + 1], [-1, -11, A + 10, A + 22, dh0 + v, dh0 + v + 1]])],
        funnel: [[A + 3, A + 10, dh0 + 7, dh0 + 20, -3.8, 3.8, "#c2402f"], [A + 3, A + 10, dh0 + 20, dh0 + 23.5, -3.8, 3.8, "#24242b"], [A + 3, A + 10, dh0 + 14, dh0 + 16, -3.85, 3.85, "#eceae3"]],
        boats: [[A + 12, A + 19, dh0 + 4.2, dh0 + 6.6, 11.2, 13.4, "#f08a2c"], [A + 12, A + 19, dh0 + 4.2, dh0 + 6.6, -13.4, -11.2, "#f08a2c"]] };
    };
    const lamp = [];
    function drawShip(g, cam, p, sun, sk, heave, roll, k, mir) {
      const P = shipParts(p, heave, roll, mir), T = P.T, lw = clamp(0.12 * k, 0.4, 1.3), O = { lw };
      drawMesh(g, cam, ribbon(SH, 40, [() => 0, (u) => hullDH(SH, u) * 0.5, (u) => hullDH(SH, u)], T), sun, "#2e3442", { lw, light: false });
      drawMesh(g, cam, ribbon(SH, 40, [() => 0, () => 2.4], T, 0.03), sun, "#a83a35", { lw: 0, ink: false, face: "front" });
      if (mir) { P.stack.forEach((b) => drawBox(g, cam, T, b, b[6], sun)); P.funnel.forEach((b) => drawBox(g, cam, T, b, b[6], sun)); return; }
      const deck = polyScr(cam, hullLoop(SH, 40, (u) => hullDH(SH, u) + 0.02).map(T));
      if (deck) { g.fillStyle = sk.lamp ? "#5c4a46" : "#8c4a3a"; g.beginPath(); lines(g, deck); g.fill(); g.strokeStyle = "rgba(24,18,34,.45)"; g.lineWidth = lw; g.stroke(); }
      // walkway stripe, pipes, manifold, catwalk, railing
      const pw = (m) => Math.max(0.6, m * k);
      g.lineCap = "round";
      g.strokeStyle = sk.lamp ? "#6b7066" : "#7f9a7c"; g.lineWidth = pw(3.4); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 25, hullDH(SH, 0) + 0.05, 0]), T([SH.L / 2 - 30, hullDH(SH, 0) + 0.05, 0])]); g.stroke();
      for (const w of [-4.2, -2.6, 2.6, 4.2]) { g.strokeStyle = "rgba(24,18,34,.55)"; g.lineWidth = pw(0.9); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 25, 8.4, w]), T([SH.L / 2 - 32, 8.4, w])]); g.stroke(); g.strokeStyle = "#d7d3c8"; g.lineWidth = pw(0.5); g.stroke(); }
      for (const uu of [-3, 3]) { g.strokeStyle = "rgba(24,18,34,.6)"; g.lineWidth = pw(1.1); g.beginPath(); polyline3(g, cam, [T([uu, 8.9, -SH.B / 2 + 1.5]), T([uu, 8.9, SH.B / 2 - 1.5])]); g.stroke(); g.strokeStyle = "#e3b23c"; g.lineWidth = pw(0.65); g.stroke(); }
      for (let uu = -SH.L / 2 + 26; uu < SH.L / 2 - 30; uu += 12) { g.strokeStyle = "rgba(24,18,34,.5)"; g.lineWidth = pw(0.35); g.beginPath(); polyline3(g, cam, [T([uu, 7.7, 0]), T([uu, 10.4, 0])]); g.stroke(); }
      g.strokeStyle = "#c9c6bc"; g.lineWidth = pw(1.3); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 24, 10.4, 0]), T([SH.L / 2 - 14, 10.4, 0])]); g.stroke();
      g.strokeStyle = "rgba(240,236,226,.75)"; g.lineWidth = pw(0.18); g.beginPath(); polyline3(g, cam, hullLoop(SH, 40, (u) => hullDH(SH, u) + 1.1).map(T)); g.stroke();
      // depth sorted deck items: accommodation stack, funnel, lifeboats, hose crane, masts
      const items = [];
      const zc = (q) => camC(cam, T(q))[2];
      items.push({ z: zc([-SH.L / 2 + 16, P.dh0 + 8, 0]), f: () => { P.stack.forEach((b) => drawBox(g, cam, T, b, b[6], sun, O)); P.wins.forEach((q) => winQuad(g, cam, T, q, sk.lamp ? "#ffd98a" : "#2c3846")); } });
      items.push({ z: zc([-SH.L / 2 + 6.5, P.dh0 + 15, 0]), f: () => P.funnel.forEach((b) => drawBox(g, cam, T, b, b[6], sun, O)) });
      P.boats.forEach((b) => items.push({ z: zc([(b[0] + b[1]) / 2, b[2], (b[4] + b[5]) / 2]), f: () => drawBox(g, cam, T, b, b[6], sun, O) }));
      const crane = (uu, ww, jw) => () => { const base = T([uu, 7.8, ww]), top = T([uu, 17, ww]), tip = T([uu + 13, 19, ww + jw]); g.strokeStyle = "rgba(24,18,34,.6)"; g.lineWidth = pw(1.2); g.beginPath(); polyline3(g, cam, [base, top, tip]); g.stroke(); g.strokeStyle = "#e3b23c"; g.lineWidth = pw(0.8); g.stroke(); };
      items.push({ z: zc([0, 12, -SH.B / 2 + 4]), f: crane(-7, -SH.B / 2 + 4, 2) });
      items.push({ z: zc([SH.L / 2 - 9, 14, 0]), f: () => { g.strokeStyle = "rgba(24,18,34,.6)"; g.lineWidth = pw(0.9); g.beginPath(); polyline3(g, cam, [T([SH.L / 2 - 9, hullDH(SH, SH.L / 2 - 9), 0]), T([SH.L / 2 - 9, 23, 0])]); g.stroke(); g.strokeStyle = "#e8e4d8"; g.lineWidth = pw(0.55); g.stroke(); } });
      items.push({ z: zc([-SH.L / 2 + 19, P.dh0 + 22, 0]), f: () => { g.strokeStyle = "#e8e4d8"; g.lineWidth = pw(0.5); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 19, P.dh0 + 18.6, 0]), T([-SH.L / 2 + 19, P.dh0 + 25, 0])]); g.stroke(); g.lineWidth = pw(0.35); g.beginPath(); polyline3(g, cam, [T([-SH.L / 2 + 19, P.dh0 + 23.5, -3.5]), T([-SH.L / 2 + 19, P.dh0 + 23.5, 3.5])]); g.stroke(); } });
      items.sort((a, b) => b.z - a.z).forEach((it) => it.f());
      lamp.push(T([SH.L / 2 - 9, 23.4, 0]), T([-SH.L / 2 + 19, P.dh0 + 25.4, 0]), T([-SH.L / 2 + 24.6, P.dh0 + 17.6, -14]), T([-SH.L / 2 + 24.6, P.dh0 + 17.6, 14]));
    }
    function drawTug(g, cam, p, sun, sk, heave, k, mir) {
      const T = frame(p, heave, 0, mir), lw = clamp(0.12 * k, 0.4, 1.3), O = { lw };
      drawMesh(g, cam, ribbon(TG, 18, [() => 0, (u) => hullDH(TG, u)], T), sun, "#b8392e", { lw, light: false });
      if (!mir) drawMesh(g, cam, ribbon(TG, 18, [(u) => hullDH(TG, u) - 1.1, (u) => hullDH(TG, u) + 0.15], T, 0.45), sun, "#1d1e24", { lw, light: false, face: "front" });
      const deck = !mir && polyScr(cam, hullLoop(TG, 18, (u) => hullDH(TG, u) + 0.16).map(T)); if (deck) { g.fillStyle = "#5f5a55"; g.beginPath(); lines(g, deck); g.fill(); }
      const fb = TG.fb;
      drawBox(g, cam, T, [-3, 6, fb, fb + 3, -3.2, 3.2], "#efede6", sun, O);
      drawBox(g, cam, T, [-0.5, 6.2, fb + 3, fb + 5.2, -3.9, 3.9], "#efede6", sun, O);
      if (!mir) drawBox(g, cam, T, [6.2, 6.4, fb + 3.7, fb + 4.8, -3.6, 3.6], sk.lamp ? "#ffd98a" : "#2c3846", sun, { flat: true });
      drawBox(g, cam, T, [-4.6, -3, fb + 2, fb + 6.6, -1.6, 1.6], "#c2402f", sun, O);
      if (!mir) { g.strokeStyle = "#e8e4d8"; g.lineWidth = Math.max(0.6, 0.35 * k); g.beginPath(); polyline3(g, cam, [T([2.5, fb + 5.2, 0]), T([2.5, fb + 9.5, 0])]); g.stroke(); lamp.push(T([2.5, fb + 9.7, 0])); }
    }
    const tugAt = (u, sp) => { const [lu, lw, h] = keyed(TK, u), c = Math.cos(sp.psi), s = Math.sin(sp.psi); return { x: sp.x + lu * c - lw * s, z: sp.z + lu * s + lw * c, psi: sp.psi + h * RAD }; };

    visLoop(el, (dt) => {
      if (st.play && !scrub) { t += dt * st.spd; if (t >= DUR) { hold += dt; t = DUR; if (hold > 4) { t = 0; hold = 0; } } }
      const u = clamp(t / DUR), sk = SKY[st.sky], sun = sk.sun;
      if (!scrub) { setSl(el, "tl", (u * 100).toFixed(1)); outT(); }
      // camera: ease toward the preset / drag target
      const ea = Math.min(1, dt * 3);
      camP.az += ((((camT.az - camP.az) % 360) + 540) % 360 - 180) * ea; camP.el += (camT.el - camP.el) * ea; camP.d += (camT.d - camP.d) * ea;
      const g = S.fit(), W = S.w, H = S.h, f = 1.02 * Math.max(W, 1.55 * H);
      const sp = shipAt(u), tp = tugAt(u, sp), heave = 0.14 * Math.sin(t * 0.9), roll = 0.004 * Math.sin(t * 0.7);
      const tg = [sp.x * lerp(1, 0.7, smooth01(u / 0.5)), 5, lerp(sp.z, 8, 0.45)], hc = tg[1] + camP.d * Math.tan(camP.el * RAD);
      const cam = camOrbit(tg, camP.d, hc, camP.az, camP.el, f, W / 2, H * 0.52), hy = horizonY(cam), k0 = f / camP.d;
      const kAt = (P) => f / Math.max(1, camC(cam, P)[2]);
      // sky, sun, distant coast
      const skg = g.createLinearGradient(0, Math.min(0, hy - H), 0, hy); skg.addColorStop(0, sk.top); skg.addColorStop(0.62, sk.mid); skg.addColorStop(1, sk.hor); g.fillStyle = skg; g.fillRect(0, 0, W, Math.max(0, hy) + 2);
      const sc = camC(cam, add3(cam.pos, sun, 1e4)), sunS = sc[2] > 0 ? scr(cam, sc) : null;
      if (sunS) { const gl = g.createRadialGradient(sunS[0], sunS[1], 1, sunS[0], sunS[1], W * 0.5); gl.addColorStop(0, sk.sunC + ".95)"); gl.addColorStop(0.06, sk.sunC + ".55)"); gl.addColorStop(1, sk.sunC + "0)"); g.fillStyle = gl; g.fillRect(0, 0, W, hy + 2); }
      [[3200, prof, sk.hill], [1500, profN, sk.hillN]].forEach(([Rr, pr, col]) => { const pts = ringScr(cam, Rr, pr); if (pts) { g.fillStyle = col; g.beginPath(); lines(g, pts); g.fill(); } });
      // water
      const wg = g.createLinearGradient(0, hy, 0, H); wg.addColorStop(0, sk.w0); wg.addColorStop(1, sk.w1); g.fillStyle = wg; g.fillRect(0, hy, W, H - hy);
      if (sunS && sk.lamp) { const gx = sunS[0], gw = W * (sk.lamp ? 0.08 : 0.14), gl = g.createLinearGradient(0, hy, 0, H); gl.addColorStop(0, sk.glint + (sk.lamp ? ".7)" : ".16)")); gl.addColorStop(1, sk.glint + "0)"); g.fillStyle = gl; g.beginPath(); g.moveTo(gx - gw * 0.2, hy); g.lineTo(gx + gw * 0.2, hy); g.lineTo(gx + gw, H); g.lineTo(gx - gw, H); g.closePath(); g.fill(); }
      // reflections of the ships (mirrored about the water, broken into shimmer lines)
      const lr = LR.fit(); lamp.length = 0;
      drawShip(lr, cam, sp, sun, sk, heave, roll, kAt([sp.x, 0, sp.z]), true); drawTug(lr, cam, tp, sun, sk, heave, kAt([tp.x, 0, tp.z]), true);
      lr.globalCompositeOperation = "destination-out"; lr.fillStyle = "rgba(0,0,0,.85)"; for (let y = Math.max(0, Math.floor(hy)); y < H; y += 3.2) lr.fillRect(0, y + 1.6 * Math.sin(y * 0.21 + t * 2.2), W, 1.3); lr.globalCompositeOperation = "source-over";
      g.save(); g.globalAlpha = sk.lamp ? 0.3 : 0.24; g.drawImage(LR.c, 0, 0, W, H); g.restore();
      // wave dashes drifting slowly
      g.lineCap = "round";
      for (const [x0, z0, len, ph] of WAVES) { const x = ((x0 + t * 1.4 + 550) % 1100) - 550 + tg[0] * 0.6, z = z0 + Math.sin(t * 0.6 + ph) * 1.2; const A = camC(cam, [x, 0, z]); if (A[2] < 3) continue; const a = scr(cam, A), hl = len * 0.5 * f / A[2], b = [a[0] + hl, a[1]]; a[0] -= hl; if (a[1] < hy || a[0] > W || b[0] < 0) continue; const fade = clamp(1 - A[2] / 1100), al = (0.12 + 0.28 * fade) * (0.6 + 0.4 * Math.sin(t * 1.3 + ph * 3)); g.strokeStyle = sk.wave + al.toFixed(3) + ")"; g.lineWidth = Math.max(0.6, 0.5 * f / A[2]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      // wakes: the path behind the stern and the tug, foam at the bow while under way
      const kn = knAt(u);
      for (const [who, lenB, wd] of [["ship", SH.L / 2, 1], ["tug", TG.L / 2, 0.5]]) {
        const pts = []; for (let j = 0; j < 26; j++) { const uu = u - j * 0.007; if (uu < 0) break; const s2 = shipAt(uu), q = who === "ship" ? s2 : tugAt(uu, s2); pts.push([q.x - Math.cos(q.psi) * lenB, 0.05, q.z - Math.sin(q.psi) * lenB]); }
        if (pts.length > 2 && (who === "tug" || kn > 0.12)) { g.strokeStyle = sk.wave + (who === "ship" ? 0.22 * clamp(kn / 1.2) : 0.3).toFixed(3) + ")"; g.lineWidth = Math.max(1, (who === "ship" ? 9 : 4) * k0 * 0.5); g.beginPath(); polyline3(g, cam, pts); g.stroke(); }
      }
      { const T = frame(sp), bw = clamp(kn / 1.4); if (bw > 0.05) { g.strokeStyle = sk.wave + (0.55 * bw).toFixed(3) + ")"; g.lineWidth = Math.max(1, 1.2 * k0); for (const s of [1, -1]) { g.beginPath(); polyline3(g, cam, [T([SH.L / 2 + 6, 0.05, 0]), T([SH.L / 2 - 14, 0.05, s * (SH.B / 2 + 3)]), T([SH.L / 2 - 40, 0.05, s * (SH.B / 2 + 7)])]); g.stroke(); } } }
      const push = u > 0.6 && u < 0.78, tT = frame(tp);
      if (push || kn > 0.1) { const n = 7; for (let i = 0; i < n; i++) { const a = ((t * 1.6 + i / n) % 1), P = tT([-TG.L / 2 - 2 - a * 22, 0.05, Math.sin(i * 2.3) * 2 * a]), q = camC(cam, P); if (q[2] < 2) continue; const s2 = scr(cam, q), r = (1.5 + a * 4) * f / q[2]; g.fillStyle = `rgba(255,255,255,${(0.42 * (1 - a) * (push ? 1 : 0.5)).toFixed(3)})`; g.beginPath(); g.ellipse(s2[0], s2[1], r, r * 0.35, 0, 0, TAU); g.fill(); } }
      // foam line hugging the waterline
      for (const [Hs, p] of [[SH, sp], [TG, tp]]) { const T = frame(p); g.strokeStyle = sk.wave + ".45)"; g.lineWidth = Math.max(0.8, 0.7 * kAt([p.x, 0, p.z])); g.beginPath(); polyline3(g, cam, hullLoop(Hs, 30, () => 0.03, 0.9).map(T)); g.closePath(); g.stroke(); }
      // land behind the quay
      for (const [z0, z1, col] of [[-46, -62, sk.quay], [-62, -240, sk.land], [-240, -1500, sk.far]]) { const P = polyScrN(cam, [[-1500, 3.2, z0], [1500, 3.2, z0], [1500, 3.2, z1], [-1500, 3.2, z1]], 25); if (P) { g.fillStyle = col; g.beginPath(); lines(g, P); g.fill(); } }
      const camWater = cam.pos[2] > -2, high = cam.pos[1] > 24, lwq = (P) => clamp(0.1 * kAt(P), 0.4, 1.2), O0 = { lw: 0.8 };
      // ---- scene groups ----
      const landItems = [];
      TANKS.forEach(([x, z, r, h], i) => landItems.push({ z: camC(cam, [x, h / 2, z])[2], f: () => {
        const tb = tubeGrid([{ c: [x, 3.2, z], a: r, b: r }, { c: [x, 3.2 + h, z], a: r, b: r }], 28);
        drawMesh(g, cam, tb, sun, sk.lamp ? (i % 4 === 3 ? "#b9b0bd" : "#cdc4cc") : i % 4 === 3 ? "#dcd8cb" : "#f1eee6", { lw: lwq([x, 0, z]), thr: 0.05, dark: sk.lamp ? "#77708a" : "#a9b0b8", lightCol: "rgba(255,255,250,.5)" });
        const top = polyScr(cam, ellipseXZ(x, z, r, r, 0, 28).map((p) => [p[0], 3.2 + h, p[1]])); if (top) { g.fillStyle = sk.lamp ? "#8d8790" : "#c7c3b8"; g.beginPath(); lines(g, top); g.fill(); g.strokeStyle = "rgba(24,18,34,.4)"; g.lineWidth = lwq([x, 0, z]); g.stroke(); }
        g.strokeStyle = "rgba(40,50,70,.35)"; g.lineWidth = Math.max(0.6, 0.6 * kAt([x, 0, z])); g.beginPath(); polyline3(g, cam, ellipseXZ(x, z, r * 1.002, r * 1.002, 0, 28).map((p) => [p[0], 3.2 + h * 0.8, p[1]])); g.closePath(); g.stroke();
      } }));
      const [tlx, tly] = light2d(cam, sun);
      TREES.forEach(([x, z, r, v]) => landItems.push({ z: camC(cam, [x, 4, z])[2], f: () => { const q = camC(cam, [x, 3.2, z]); if (q[2] < 3) return; const b0 = scr(cam, q), kk = f / q[2], R2 = r * kk, cy = b0[1] - r * 1.25 * kk; g.strokeStyle = "#5a4636"; g.lineWidth = Math.max(0.6, 0.7 * kk); g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b0[0], cy); g.stroke(); g.fillStyle = mix(sk.lamp ? "#3e4a4a" : "#4f6f45", "#2a3a30", v * 0.4); g.beginPath(); g.arc(b0[0], cy, R2, 0, TAU); g.arc(b0[0] - R2 * 0.6, cy + R2 * 0.3, R2 * 0.7, 0, TAU); g.arc(b0[0] + R2 * 0.6, cy + R2 * 0.25, R2 * 0.72, 0, TAU); g.fill(); g.fillStyle = sk.lamp ? "rgba(255,170,130,.12)" : "rgba(214,226,150,.4)"; g.beginPath(); g.arc(b0[0] + tlx * R2 * 0.3, cy - tly * R2 * 0.3, R2 * 0.55, 0, TAU); g.fill(); } }));
      landItems.push({ z: camC(cam, [36, 5, -32])[2], f: () => { drawBox(g, cam, (q) => q, [28, 44, 3.2, 7.4, -38, -27], "#e9e6dc", sun, O0); drawBox(g, cam, (q) => q, [27.5, 44.5, 7.4, 8.2, -38.5, -26.5], "#4d6f8f", sun, O0); } });
      const quay = () => {
        drawBox(g, cam, (q) => q, [-232, 232, -0.6, 3.2, -46, 0], sk.quay, sun, { lw: 0.8, near: 20 });
        g.lineCap = "butt"; g.strokeStyle = "#e6bb3a"; g.lineWidth = Math.max(0.8, 0.5 * k0); g.beginPath(); polyline3(g, cam, [[-232, 3.25, -0.4], [232, 3.25, -0.4]]); g.stroke();
        // pipe rack on the quay
        for (const [yy, col] of [[4.4, "#b9b5a8"], [5.2, "#d8b24a"], [6.0, "#b9b5a8"]]) { g.strokeStyle = "rgba(24,18,34,.5)"; g.lineWidth = Math.max(1, 0.9 * k0); g.beginPath(); polyline3(g, cam, [[-232, yy, -16], [232, yy, -16]]); g.stroke(); g.strokeStyle = col; g.lineWidth = Math.max(0.7, 0.55 * k0); g.stroke(); }
        for (let x = -225; x <= 225; x += 15) { g.strokeStyle = "rgba(60,60,70,.6)"; g.lineWidth = Math.max(0.6, 0.35 * k0); g.beginPath(); polyline3(g, cam, [[x, 3.2, -16], [x, 6.5, -16]]); g.stroke(); }
        // fenders (squeezed while the hull leans on them) and bollards
        const sideZ = sp.z - SH.B / 2;
        FEND.forEach((x) => { const touch = Math.abs(x - sp.x) < SH.L / 2 - 34 && sideZ < 3.4, dep = touch ? clamp(sideZ - 0.25, 1.05, 1.6) : 1.6; drawBox(g, cam, (q) => q, [x - 1.6, x + 1.6, 0.3, 3.0, 0, dep], "#24262c", sun, { lw: 0.6, lit: "#6a6f7a" }); });
        BOLL.forEach((x) => { const bt = tubeGrid([{ c: [x, 3.2, -1.7], a: 0.45, b: 0.45 }, { c: [x, 4.1, -1.7], a: 0.4, b: 0.4 }], 10, [false, true]); drawMesh(g, cam, bt, sun, "#3a3c44", { lw: lwq([x, 0, 0]), lightCol: "rgba(200,205,215,.5)", lthr: 0.5 }); });
        // lamp posts along the quay
        for (let x = -200; x <= 200; x += 50) { g.strokeStyle = "#4a4d56"; g.lineWidth = Math.max(0.6, 0.3 * k0); g.beginPath(); polyline3(g, cam, [[x, 3.2, -30], [x, 15, -30], [x, 15, -27.5]]); g.stroke(); lamp.push([x, 14.6, -27.5]); }
      };
      // loading arms: riser, inboard arm, outboard arm reaching the ship's manifold once moored
      const arms = (part) => {
        const reach = smooth01((u - 0.93) / 0.06), Tm = frame(sp, heave, roll);
        for (const xo of [-4, 4]) {
          const Rr = [xo, 18.5, -7], stow = [xo, 7, -4.5], M = Tm([xo, 10.6, -SH.B / 2 + 3.5]), Tg = lerp3(stow, M, reach);
          const dz = Tg[2] - Rr[2], dy = Tg[1] - Rr[1], d = Math.min(Math.hypot(dz, dy), 23.9), base = Math.atan2(dy, dz), A = Math.acos(clamp((12 * 12 + d * d - 12 * 12) / (2 * 12 * d), -1, 1));
          const e1 = [Rr[2] + 12 * Math.cos(base + A), Rr[1] + 12 * Math.sin(base + A)], e2 = [Rr[2] + 12 * Math.cos(base - A), Rr[1] + 12 * Math.sin(base - A)], E = e1[1] > e2[1] ? e1 : e2, EW = [xo, E[1], E[0]];
          const seg = (pts, w, col) => { g.strokeStyle = "rgba(24,18,34,.65)"; g.lineWidth = Math.max(1.2, (w + 0.35) * k0); g.beginPath(); polyline3(g, cam, pts); g.stroke(); g.strokeStyle = col; g.lineWidth = Math.max(0.8, w * k0); g.stroke(); };
          if (part === 0) { drawBox(g, cam, (q) => q, [xo - 1.2, xo + 1.2, 3.2, 4.2, -8.2, -5.8], "#5d606a", sun, O0); seg([[xo, 3.2, -7], Rr], 1.1, "#e7e3d8"); seg([Rr, [xo, 19.5, -10.5]], 0.9, "#d8b24a"); seg([Rr, EW], 0.8, "#e7e3d8"); }
          else { seg([EW, Tg], 0.65, "#e7e3d8"); const q = camC(cam, EW); if (q[2] > 1) { const s2 = scr(cam, q); g.fillStyle = "#2c2e36"; g.beginPath(); g.arc(s2[0], s2[1], Math.max(1.2, 0.8 * k0), 0, TAU); g.fill(); } }
        }
      };
      // mooring lines with sag; thrown in sequence, slack, then hove tight
      let nLines = 0; const placed = [];
      const moor = () => {
        const Tm = frame(sp, heave, roll);
        LINES.forEach((Ln) => {
          const a0 = Ln.t0, k = clamp((u - a0) / 0.02); if (k <= 0) return;
          const A = Tm([Ln.u, hullDH(SH, Ln.u) + 1.0, -hullHB(SH, Ln.u) + 0.6]), B = [Ln.bx, 4.0, -1.7];
          const tight = smooth01((u - a0 - 0.03) / 0.05), sag = lerp(3.2, 0.35, tight), pts = [];
          if (k < 1) { const E = add3(lerp3(A, B, k), [0, 7 * Math.sin(Math.PI * k), 0]); for (let i = 0; i <= 14; i++) { const s = i / 14; pts.push(add3(lerp3(A, E, s), [0, -1.2 * 4 * s * (1 - s), 0])); } }
          else { nLines++; for (let i = 0; i <= 18; i++) { const s = i / 18, P = add3(lerp3(A, B, s), [0, -sag * 4 * s * (1 - s), 0]); P[1] = Math.max(0.15, P[1]); pts.push(P); } }
          g.lineCap = "round"; g.strokeStyle = "rgba(30,22,30,.6)"; g.lineWidth = Math.max(2, 0.9 * kAt(B)); g.beginPath(); polyline3(g, cam, pts); g.stroke(); g.strokeStyle = tight > 0.9 ? "#fbefc6" : "#f3d98e"; g.lineWidth = Math.max(1.1, 0.5 * kAt(B)); g.stroke();
          if (st.lbl && k >= 1) { const m = camC(cam, pts[9]); if (m[2] > 2) { const s2 = scr(cam, m), fs = W < 520 ? 8.5 : 10; g.font = `500 ${fs}px ${MONO}`; const txt = Ln.n.toUpperCase(), tw = g.measureText(txt).width; let y = s2[1] - 10; for (let n = 0; n < 6 && placed.some((r) => Math.abs(r[0] - s2[0]) < (r[1] + tw) / 2 + 6 && Math.abs(r[2] - y) < fs + 5); n++) y -= fs + 6; placed.push([s2[0], tw, y]); g.strokeStyle = "rgba(246,231,184,.5)"; g.lineWidth = 1; g.beginPath(); g.moveTo(s2[0], s2[1]); g.lineTo(s2[0], y + 3); g.stroke(); g.fillStyle = "rgba(7,10,22,.7)"; g.fillRect(s2[0] - tw / 2 - 4, y - fs + 1, tw + 8, fs + 4); tag(g, txt, s2[0], y, "#f6e7b8", fs, "center"); } }
        });
      };
      const vessels = () => {
        const sZ = camC(cam, [sp.x, 5, sp.z])[2], tZ = camC(cam, [tp.x, 3, tp.z])[2];
        const ds = () => drawShip(g, cam, sp, sun, sk, heave, roll, kAt([sp.x, 0, sp.z]), false), dt2 = () => drawTug(g, cam, tp, sun, sk, heave * 1.6, kAt([tp.x, 0, tp.z]), false);
        if (tZ > sZ) { dt2(); ds(); } else { ds(); dt2(); }
      };
      const lands = () => landItems.sort((a, b) => b.z - a.z).forEach((it) => it.f());
      if (camWater) { lands(); quay(); arms(0); if (!high) { moor(); arms(1); } vessels(); if (high) { moor(); arms(1); } }
      else { vessels(); quay(); moor(); arms(0); arms(1); lands(); }
      // dusk: lamps glow and spill on the water
      if (sk.lamp) {
        g.save(); g.globalCompositeOperation = "screen";
        for (const P of lamp) { const q = camC(cam, P); if (q[2] < 2) continue; const s2 = scr(cam, q), r = Math.max(4, 5 * f / q[2]); const gl = g.createRadialGradient(s2[0], s2[1], 0, s2[0], s2[1], r * 3); gl.addColorStop(0, "rgba(255,226,160,.95)"); gl.addColorStop(0.2, "rgba(255,200,120,.45)"); gl.addColorStop(1, "rgba(255,190,120,0)"); g.fillStyle = gl; g.beginPath(); g.arc(s2[0], s2[1], r * 3, 0, TAU); g.fill(); const w0 = camC(cam, [P[0], 0, Math.max(P[2], 1)]); if (camWater && w0[2] > 2 && P[2] > -32) { const sw = scr(cam, w0), lg = g.createLinearGradient(0, sw[1] - 2, 0, sw[1] + r * 6); lg.addColorStop(0, "rgba(255,200,130,.28)"); lg.addColorStop(1, "rgba(255,200,130,0)"); g.fillStyle = lg; for (let j = 0; j < 6; j++) { const wj = r * (0.5 - j * 0.06) * (1 + 0.3 * Math.sin(t * 3 + j + P[0])); g.fillRect(sw[0] - wj / 2, sw[1] + j * r, wj, r * 0.62); } } }
        g.restore();
      }
      // caption + numbers
      const sideGap = Math.max(0, sp.z - SH.B / 2 - 1.7);
      const phase = u < 0.36 ? "MENDEKAT" : u < 0.6 ? "MELAMBAT & MELURUS" : u < 0.745 ? "DIDORONG KAPAL TUNDA" : u < 0.77 ? "MENEMPEL DI FENDER" : nLines < 6 ? `TALI TAMBAT ${nLines}/6` : u < 0.99 ? "LENGAN MUAT TERSAMBUNG" : "TERTAMBAT AMAN";
      const capTxt = u < 0.745 ? `SANDAR · ${phase} · KECEPATAN ${fmt(kn, 1)} KN` : `SANDAR · ${phase}`;
      g.font = `500 ${W < 520 ? 9 : 10.5}px ${MONO}`; const cw = g.measureText(capTxt).width;
      g.fillStyle = "rgba(7,10,22,.55)"; g.fillRect(8, H - 28, cw + 12, 19); tag(g, capTxt, 14, H - 14, K.ivory, W < 520 ? 9 : 10.5);
      const ph2 = { "MENDEKAT": "mendekat", "MELAMBAT & MELURUS": "melambat", "DIDORONG KAPAL TUNDA": "didorong", "MENEMPEL DI FENDER": "menempel", "LENGAN MUAT TERSAMBUNG": "tersambung", "TERTAMBAT AMAN": "aman" }[phase] || "pasang tali";
      setHTML(stats, [["tahap", ph2], ["kecepatan", fmt(kn, 1) + " kn"], ["jarak ke fender", fmt(sideGap, 1) + " m"], ["tali tambat", nLines + " / 6"]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join(""));
    });
  }


  /* ======================================================================
     8 · GAYA TOKOH: one character, three looks (vector, pixel art, origami) + one motion example per look
     side view facing right, units: 100 = full height, y down, feet on y 0, x 0 = hip; legs from the gait engine
     ====================================================================== */
  const GT_COL = { skin: "#f3b892", skinS: "#c98663", hair: "#3b2620", hairL: "#6e4433", top: "#d8693f", topS: "#a2482c", pants: "#2d4068", pantsS: "#1f2c4a", shoe: "#f3eee4", shoeS: "#b9ae9c", sole: "#5b5266", ink: "#1b1226", blush: "#f08a78" };
  const GT_K = 100 / BODY.sole_y;
  const gtDir = (a) => [Math.sin(a * RAD), Math.cos(a * RAD)];
  const gtAdd = (p, a, L) => { const d = gtDir(a); return [p[0] + d[0] * L, p[1] + d[1] * L]; };
  let GT_G = null;
  const gtG = () => GT_G || (GT_G = figGait());
  // pose: the legs come from the same gait engine as the 3D figure (planted stance foot, real heel / toe roll),
  // so the shoe sole stays flat on the ground in stance and the ground scrolls at exactly the walking speed.
  // The upper body is the stylised character (big head); idle breathing and the wave hello use standing legs.
  function gtPose(mode, p) {
    const G = gtG(), P = (q) => [q[0] * GT_K, (q[1] - BODY.sole_y) * GT_K], J = {};
    let hip, lean = 0, legs = [], arms = [], nod = 0;
    const shoeOf = (cfg) => { const f = shoeMap(cfg); return { poly: G.b.shoe.map((q) => P(f(q))), heel: P(f(G.HEEL)), toe: P(f(G.TOE)) }; };
    if (mode === "walk") {
      const pz = G.pose(p); hip = P(pz.hip); lean = pz.lean; nod = pz.nod;
      legs = [pz.near, pz.far].map((L) => Object.assign({ hip, k: P(L.knee), an: P(L.ankle), stance: L.stance }, shoeOf(L.cfg)));
      arms = [0, 0.5].map((side) => { const [, th, el] = G.arm(p + side); return { up: th * 1.25, lo: th * 1.25 + el }; });
    } else {
      const br = Math.sin(TAU * p); hip = P([0, FIG.HIP + 0.004 * br]); lean = 1;
      legs = [0.07, -0.06].map((ax) => { const cfg = { piv: G.HEEL, at: [ax - (G.ANK[0] - G.HEEL[0]), G.SOLE], deg: 0 }, an = shoeMap(cfg)(G.ANK); return Object.assign({ hip, k: P(ik([0, FIG.HIP], an, G.TH, G.SH, true)), an: P(an), stance: true }, shoeOf(cfg)); });
      if (mode === "wave") arms = [{ up: 150, lo: 165 + 22 * Math.sin(TAU * p * 2) }, { up: -4, lo: 8 }];
      else arms = [{ up: 5 + br, lo: 14 + br }, { up: -5 - br, lo: 6 }];
    }
    const sh = gtAdd(hip, 180 - lean, 21), neck = gtAdd(hip, 180 - lean, 23.5);
    J.hip = hip; J.sh = sh; J.neck = neck; J.head = [neck[0] + 2.6, neck[1] - 12.5 + 0.3 * nod]; J.lean = lean;
    J.legs = legs; J.arms = arms.map((A) => { const e = gtAdd(sh, A.up, 15), w = gtAdd(e, A.lo, 13.5); return { sh, e, w }; });
    return J;
  }
  // trouser leg end just above the ankle (hidden in the shoe): never reaches the sole, whatever the foot angle
  const gtHem = (L, up = 1.3) => { const d = [L.k[0] - L.an[0], L.k[1] - L.an[1]], m = Math.hypot(d[0], d[1]) || 1; return [L.an[0] + d[0] / m * up, L.an[1] + d[1] / m * up]; };
  const gtPath = (g, pts, close = true) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (close) g.closePath(); };
  // smooth vector character; far limbs use the shade colours
  function gtVector(g, J, o = {}) {
    const C = GT_COL, lwI = o.lwI || 2.4;
    const seg = (pts, w, col, cap = "round") => { g.lineJoin = "round"; g.lineCap = cap; g.strokeStyle = C.ink; g.lineWidth = w + lwI; gtPath(g, pts, false); g.stroke(); g.strokeStyle = col; g.lineWidth = w; gtPath(g, pts, false); g.stroke(); };
    const shoe = (L, far) => {
      g.lineJoin = "round"; g.fillStyle = far ? C.shoeS : C.shoe; g.strokeStyle = C.ink; g.lineWidth = lwI; gtPath(g, L.poly); g.stroke(); g.fill();
      // rubber sole: the band along the heel -> toe line, clipped to the shoe
      const d = [L.toe[0] - L.heel[0], L.toe[1] - L.heel[1]], m = Math.hypot(d[0], d[1]) || 1, u = [d[0] / m, d[1] / m], n = [u[1], -u[0]];
      g.save(); gtPath(g, L.poly); g.clip(); g.fillStyle = far ? mix(C.sole, "#000000", 0.2) : C.sole;
      gtPath(g, [[L.heel[0] - u[0] * 4, L.heel[1] - u[1] * 4], [L.toe[0] + u[0] * 4, L.toe[1] + u[1] * 4], [L.toe[0] + u[0] * 4 + n[0] * 1.5, L.toe[1] + u[1] * 4 + n[1] * 1.5], [L.heel[0] - u[0] * 4 + n[0] * 1.5, L.heel[1] - u[1] * 4 + n[1] * 1.5]]); g.fill(); g.restore();
      g.strokeStyle = C.ink; g.lineWidth = lwI * 0.7; gtPath(g, L.poly); g.stroke();
    };
    const leg = (L, far) => {
      // one trouser leg: both ink passes first, then both colour passes, so thigh and shin read as one piece of cloth
      const col = far ? C.pantsS : C.pants, hem = gtHem(L), pass = (ink) => { g.lineJoin = "round"; g.strokeStyle = ink ? C.ink : col; g.lineCap = "butt"; g.lineWidth = 7.4 + (ink ? lwI : 0); gtPath(g, [L.k, hem], false); g.stroke(); g.lineCap = "round"; g.lineWidth = 9.4 + (ink ? lwI : 0); gtPath(g, [L.hip, L.k], false); g.stroke(); g.lineWidth = 7.4 + (ink ? lwI : 0); gtPath(g, [L.k, [L.k[0] + 0.01, L.k[1]]], false); g.stroke(); };
      pass(true); pass(false); shoe(L, far);
    };
    const arm = (A, far) => { seg([A.sh, A.e], 7, far ? C.topS : C.top); seg([A.e, A.w], 5.4, far ? C.skinS : C.skin); seg([A.w, A.w], 6.8, far ? C.skinS : C.skin); };
    arm(J.arms[1], true); leg(J.legs[1], true);
    seg([[J.hip[0], J.hip[1] - 2], [J.hip[0], J.hip[1] + 2]], 15, C.pants);
    seg([[J.sh[0] - 1, J.sh[1] + 2], [J.hip[0], J.hip[1] - 4]], 17, C.top);
    leg(J.legs[0], false);
    gtHead(g, J, o, lwI);
    arm(J.arms[0], false);
  }
  function gtHead(g, J, o, lwI) {
    const C = GT_COL, [hx, hy] = J.head, r = 11.5;
    g.lineCap = "round"; g.strokeStyle = C.ink; g.lineWidth = 6 + lwI; gtPath(g, [[J.neck[0] + 1, J.neck[1] + 2], [J.neck[0] + 1.5, J.neck[1] - 4]], false); g.stroke();
    g.strokeStyle = C.skinS; g.lineWidth = 6; g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.arc(hx, hy, r + lwI / 2, 0, TAU); g.fill();
    g.fillStyle = C.skin; g.beginPath(); g.arc(hx, hy, r, 0, TAU); g.fill();
    g.fillStyle = C.hair; g.beginPath(); g.moveTo(hx + r * 0.95, hy - r * 0.25); g.quadraticCurveTo(hx + r * 0.9, hy - r * 1.25, hx - r * 0.1, hy - r * 1.12); g.quadraticCurveTo(hx - r * 1.25, hy - r * 0.95, hx - r * 1.08, hy + r * 0.25); g.quadraticCurveTo(hx - r * 0.75, hy + r * 0.65, hx - r * 0.35, hy + r * 0.15); g.quadraticCurveTo(hx - r * 0.2, hy - r * 0.35, hx + r * 0.25, hy - r * 0.45); g.quadraticCurveTo(hx + r * 0.6, hy - r * 0.15, hx + r * 0.95, hy - r * 0.25); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = lwI * 0.6; g.stroke();
    g.fillStyle = C.skinS; g.beginPath(); g.ellipse(hx - r * 0.15, hy + r * 0.08, r * 0.17, r * 0.24, 0, 0, TAU); g.fill();
    g.fillStyle = C.ink; g.beginPath(); g.ellipse(hx + r * 0.52, hy - r * 0.02, r * 0.11, o.blink ? r * 0.03 : r * 0.17, 0, 0, TAU); g.fill();
    g.strokeStyle = C.hair; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + r * 0.36, hy - r * 0.3); g.lineTo(hx + r * 0.72, hy - r * 0.32); g.stroke();
    g.fillStyle = rgba(C.blush, 0.5); g.beginPath(); g.ellipse(hx + r * 0.45, hy + r * 0.35, r * 0.2, r * 0.12, 0, 0, TAU); g.fill();
    g.strokeStyle = "#8a3b34"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(hx + r * 0.62, hy + r * 0.5); g.quadraticCurveTo(hx + r * 0.75, hy + r * 0.6, hx + r * 0.88, hy + r * 0.48); g.stroke();
  }

  /* ---- pixel art: the sprite is laid out at its real size (about 90 px tall) as flat material masks, then shaded
     pixel by pixel like hand-made pixel art: every material has a ramp (light, base, shadow, outline); light comes from
     the upper front, so a 2 px shadow band runs along the back / under edges and a 1 px light rim along the top / front.
     Selective outline: the material's own dark tone (softer on the lit side), and a hand-picked mid tone on staircase
     corners instead of blurry anti-aliasing. Far limbs use a darker ramp, details (eye, mouth, blush) stay flat. ---- */
  const GT_MAT = [
    ["skin", ["#ffd9bb", "#f2b48d", "#cf8a64", "#8a4a34"]], ["skinF", ["#dea07c", "#cc8a66", "#ad6c4c", "#6e3828"]],
    ["hair", ["#7b4b37", "#4a2c21", "#2c1a14", "#140b08"]], ["top", ["#f59a68", "#d8693f", "#a9482b", "#5e2414"]],
    ["topF", ["#c2613d", "#a9502f", "#86391f", "#4a1a0c"]], ["pants", ["#5672ad", "#30467a", "#202f55", "#0e1428"]],
    ["pantsF", ["#2c3f6c", "#243559", "#192643", "#0a0f20"]], ["shoe", ["#ffffff", "#ece5d6", "#bdb19c", "#5c5548"]],
    ["shoeF", ["#d6ccb8", "#c2b6a0", "#9d927f", "#4a443a"]], ["sole", ["#6a6178", "#4f4759", "#3b3444", "#1d1923"]],
    ["eye", null, "#22161f"], ["mouth", null, "#8a3b34"], ["blush", null, "#f19a86"],
  ];
  const GT_KEY = GT_MAT.map((m, i) => `rgb(${(i * 19 + 7) % 256},${(i * 53 + 101) % 256},${(i * 97 + 31) % 256})`), GT_KEYV = GT_KEY.map((s) => s.match(/\d+/g).map(Number));
  const GT_MI = Object.fromEntries(GT_MAT.map((m, i) => [m[0], i])), GT_RGB = GT_MAT.map((m) => (m[1] ? m[1].map(hex) : [hex(m[2])]));
  function gtPixelSprite(J, s, blink) {
    const w = Math.ceil(64 * s), h = Math.ceil(116 * s), c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"), ox = Math.round(w * 0.42), oy = h - Math.round(3 * s), px = 1 / s, K = (n) => GT_KEY[GT_MI[n]];
    g.setTransform(s, 0, 0, s, ox, oy);
    const seg = (pts, wd, m, cap = "round") => { g.lineJoin = "round"; g.lineCap = cap; g.strokeStyle = K(m); g.lineWidth = wd; gtPath(g, pts, false); g.stroke(); };
    const shoe = (L, far) => {
      g.fillStyle = K(far ? "shoeF" : "shoe"); gtPath(g, L.poly); g.fill();
      const d = [L.toe[0] - L.heel[0], L.toe[1] - L.heel[1]], m = Math.hypot(d[0], d[1]) || 1, u = [d[0] / m, d[1] / m], n = [u[1], -u[0]], k = 1.4 * px + 0.5;
      g.save(); gtPath(g, L.poly); g.clip(); g.fillStyle = K("sole");
      gtPath(g, [[L.heel[0] - u[0] * 5 - n[0], L.heel[1] - u[1] * 5 - n[1]], [L.toe[0] + u[0] * 5 - n[0], L.toe[1] + u[1] * 5 - n[1]], [L.toe[0] + u[0] * 5 + n[0] * k, L.toe[1] + u[1] * 5 + n[1] * k], [L.heel[0] - u[0] * 5 + n[0] * k, L.heel[1] - u[1] * 5 + n[1] * k]]); g.fill(); g.restore();
    };
    const leg = (L, far) => { const m = far ? "pantsF" : "pants"; seg([L.k, gtHem(L, 1.6)], 7.4, m, "butt"); seg([L.hip, L.k], 9.2, m); seg([L.k, [L.k[0] + 0.01, L.k[1]]], 7.4, m); shoe(L, far); };
    const arm = (A, far) => { seg([A.sh, A.e], 7, far ? "topF" : "top"); seg([A.e, A.w], 5.4, far ? "skinF" : "skin"); seg([A.w, [A.w[0] + 0.01, A.w[1]]], 6.6, far ? "skinF" : "skin"); };
    arm(J.arms[1], true); leg(J.legs[1], true);
    seg([[J.hip[0], J.hip[1] - 2], [J.hip[0], J.hip[1] + 2]], 15, "pants");
    seg([[J.sh[0] - 1, J.sh[1] + 2], [J.hip[0], J.hip[1] - 4]], 17, "top");
    leg(J.legs[0], false);
    const [hx, hy] = J.head, r = 11.5;
    seg([[J.neck[0] + 1, J.neck[1] + 2], [J.neck[0] + 1.5, J.neck[1] - 4]], 6, "skinF");
    g.fillStyle = K("skin"); g.beginPath(); g.arc(hx, hy, r, 0, TAU); g.fill();
    g.fillStyle = K("hair"); g.beginPath(); g.moveTo(hx + r * 0.95, hy - r * 0.25); g.quadraticCurveTo(hx + r * 0.9, hy - r * 1.25, hx - r * 0.1, hy - r * 1.12); g.quadraticCurveTo(hx - r * 1.25, hy - r * 0.95, hx - r * 1.08, hy + r * 0.25); g.quadraticCurveTo(hx - r * 0.75, hy + r * 0.65, hx - r * 0.35, hy + r * 0.15); g.quadraticCurveTo(hx - r * 0.2, hy - r * 0.35, hx + r * 0.25, hy - r * 0.45); g.quadraticCurveTo(hx + r * 0.6, hy - r * 0.15, hx + r * 0.95, hy - r * 0.25); g.closePath(); g.fill();
    g.fillStyle = K("skinF"); g.beginPath(); g.ellipse(hx - r * 0.15, hy + r * 0.08, r * 0.17, r * 0.24, 0, 0, TAU); g.fill();
    arm(J.arms[0], false);
    // flat material map from the key colours (anti-aliased fringe below half coverage is dropped)
    g.setTransform(1, 0, 0, 1, 0, 0);
    const id = g.getImageData(0, 0, w, h), d = id.data, M = new Int8Array(w * h).fill(-1);
    for (let i = 0; i < w * h; i++) {
      const a = d[i * 4 + 3]; if (a < 128) continue;
      const r0 = d[i * 4], g0 = d[i * 4 + 1], b0 = d[i * 4 + 2]; let bi = 0, bd = 1e9; // getImageData is not premultiplied
      GT_KEYV.forEach((P, k) => { const e = (P[0] - r0) ** 2 + (P[1] - g0) ** 2 + (P[2] - b0) ** 2; if (e < bd) { bd = e; bi = k; } }); M[i] = bi;
    }
    // stray blend pixels between two materials take the material around them
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, a1 = M[i - 1], a2 = M[i + 1], a3 = M[i - w], a4 = M[i + w]; if (M[i] >= 0 && a1 === a2 && a2 === a3 && a3 === a4 && a1 !== M[i]) M[i] = a1; }
    // face details on whole pixels: eye 2 px wide (1 px line when blinking), mouth and blush
    const put = (x, y, m) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) M[y * w + x] = GT_MI[m]; };
    const ex = ox + (hx + r * 0.5) * s, ey = oy + (hy - r * 0.1) * s, eh = blink ? 1 : Math.max(2, Math.round(r * 0.34 * s));
    for (let k = 0; k < eh; k++) { put(ex, ey + k - (blink ? -1 : 0), "eye"); put(ex + 1, ey + k - (blink ? -1 : 0), "eye"); }
    for (let k = 0; k < Math.max(2, Math.round(r * 0.26 * s)); k++) put(ox + (hx + r * 0.6) * s + k, oy + (hy + r * 0.52) * s + (k === 0 ? -1 : 0), "mouth");
    for (let k = 0; k < Math.max(2, Math.round(r * 0.28 * s)); k++) put(ox + (hx + r * 0.3) * s + k, oy + (hy + r * 0.3) * s, "blush");
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : M[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, m = M[i];
      if (m >= 0) {
        const R2 = GT_RGB[m]; let P;
        if (R2.length === 1) P = R2[0];
        else {
          const big = m === GT_MI.top || m === GT_MI.pants || m === GT_MI.hair, sh = at(x - 1, y) !== m || at(x - 2, y) !== m || (big && at(x - 3, y) !== m) || at(x, y + 1) !== m || (at(x, y + 2) !== m && at(x - 1, y + 1) !== m);
          const li = !sh && (at(x + 1, y) !== m || at(x, y - 1) !== m);
          P = R2[sh ? 2 : li ? 0 : 1];
        }
        d[i * 4] = P[0]; d[i * 4 + 1] = P[1]; d[i * 4 + 2] = P[2]; d[i * 4 + 3] = 255; continue;
      }
      // outline pixel?
      const L2 = at(x - 1, y), R3 = at(x + 1, y), U2 = at(x, y - 1), D2 = at(x, y + 1), nb = [D2, L2, U2, R3].filter((v) => v >= 0);
      if (!nb.length) { d[i * 4 + 3] = 0; continue; }
      const src = nb[0], R2 = GT_RGB[src], lit = U2 < 0 && R3 < 0, base = R2.length === 1 ? GT_RGB[GT_MI.skin] : R2;
      let P = lit ? base[3].map((v, k) => Math.round(v * 0.55 + base[2][k] * 0.45)) : base[3];
      if (nb.length === 2 && !((L2 >= 0 && R3 >= 0) || (U2 >= 0 && D2 >= 0))) P = P.map((v, k) => Math.round(v * 0.6 + base[1][k] * 0.4));
      d[i * 4] = P[0]; d[i * 4 + 1] = P[1]; d[i * 4 + 2] = P[2]; d[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return { c, ox, oy };
  }

  /* ---- origami: every body part is ONE sheet of paper folded once along a straight crease (a mountain fold):
     the lit face and the shaded face share the crease, the outer edges show the white paper edge.
     Refolding swings the shaded flap around its crease (a hinge); pieces never move apart. ---- */
  function gtPaper(J) {
    const C = GT_COL, pcs = [], dk = (c, k) => mix(c, "#2a1530", k), lt = (c, k) => mix(c, "#fff6e4", k);
    const piece = (gIdx, front, back, hinge, cF, cB) => pcs.push({ g: gIdx, planes: [{ p: front, c: cF }, { p: back, c: cB, flap: true }], hinge });
    // a strip a -> b, half widths wa / wb, pointed ends (folded corners) so joints overlap without gaps
    const strip = (gIdx, a, b, wa, wb, col, far, pa = 0.7, pb = 0.7) => {
      const d = [b[0] - a[0], b[1] - a[1]], m = Math.hypot(d[0], d[1]) || 1, u = [d[0] / m, d[1] / m], n = [u[1], -u[0]];
      const fn = n[0] >= 0 ? n : [-n[0], -n[1]]; // front normal: towards +x (the way the figure faces)
      const A = [a[0] - u[0] * wa * pa, a[1] - u[1] * wa * pa], B = [b[0] + u[0] * wb * pb, b[1] + u[1] * wb * pb];
      const F = [A, [a[0] + fn[0] * wa, a[1] + fn[1] * wa], [b[0] + fn[0] * wb, b[1] + fn[1] * wb], B], K = [A, [a[0] - fn[0] * wa, a[1] - fn[1] * wa], [b[0] - fn[0] * wb, b[1] - fn[1] * wb], B];
      piece(gIdx, F, K, [A, B], far ? dk(col, 0.18) : lt(col, 0.12), far ? dk(col, 0.42) : dk(col, 0.22));
    };
    const shoe = (L, far) => {
      const q = L.poly, n = q.length; // gait shoe outline (heel back ... toe ... sole): split along the heel-top -> toe-tip crease
      const iT = 9 % n, iH = 2, top = q.slice(iH, iT + 1), side = q.slice(iT).concat(q.slice(0, iH + 1));
      piece(0, side, top, [q[iH], q[iT]], far ? C.shoeS : C.shoe, far ? dk(C.shoeS, 0.15) : lt(C.shoe, 0.6));
    };
    const leg = (L, far) => { strip(1, L.k, gtHem(L, 1.3), 4.6, 3.5, C.pants, far, 0.6, 0); strip(2, L.hip, L.k, 5.8, 4.6, C.pants, far, 0.5, 0.8); shoe(L, far); };
    const arm = (A, far) => {
      strip(5, A.sh, A.e, 4.2, 3.4, C.top, far, 0.6, 0.6); strip(5, A.e, A.w, 3.1, 2.6, C.skin, far, 0.5, 0.2);
      const d = gtDir(Math.atan2(A.w[0] - A.e[0], A.w[1] - A.e[1]) / RAD), m = [A.w[0] + d[0] * 3, A.w[1] + d[1] * 3], n = [d[1], -d[0]];
      piece(5, [A.w, [m[0] + n[0] * 3, m[1] + n[1] * 3], [A.w[0] + d[0] * 6.5, A.w[1] + d[1] * 6.5]], [A.w, [m[0] - n[0] * 3, m[1] - n[1] * 3], [A.w[0] + d[0] * 6.5, A.w[1] + d[1] * 6.5]], [A.w, [A.w[0] + d[0] * 6.5, A.w[1] + d[1] * 6.5]], far ? C.skinS : lt(C.skin, 0.15), far ? dk(C.skinS, 0.2) : C.skinS);
    };
    arm(J.arms[1], true); leg(J.legs[1], true);
    // pelvis and shirt: one sheet each, crease down the middle of the body
    const h = J.hip, s = J.sh, u = (() => { const d = [s[0] - h[0], s[1] - h[1]], m = Math.hypot(d[0], d[1]); return [d[0] / m, d[1] / m]; })(), fn = [-u[1], u[0]], Ln = Math.hypot(s[0] - h[0], s[1] - h[1]);
    const T = (t, k) => [h[0] + u[0] * Ln * t + fn[0] * k, h[1] + u[1] * Ln * t + fn[1] * k];
    piece(3, [T(-0.22, 0), T(-0.2, 7.4), T(0.12, 7.2), T(0.12, 0)], [T(-0.22, 0), T(-0.2, -7.6), T(0.12, -7.4), T(0.12, 0)], [T(-0.22, 0), T(0.12, 0)], lt(C.pants, 0.1), dk(C.pants, 0.25));
    piece(4, [T(0.02, 0), T(0.02, 7.6), T(0.5, 6.6), T(0.98, 7.4), T(1.08, 0)], [T(0.02, 0), T(0.02, -7.8), T(0.5, -7.2), T(0.98, -8.4), T(1.08, 0)], [T(0.02, 0), T(1.08, 0)], lt(C.top, 0.14), C.topS);
    leg(J.legs[0], false);
    // head: an octagon folded down the profile line, hair a separate folded cap, neck a small tab
    const [hx, hy] = J.head, r = 12.5, H = (a, k = r) => [hx + Math.cos(a * RAD) * k, hy + Math.sin(a * RAD) * k];
    piece(6, [[J.neck[0] + 4, J.neck[1] + 3], [J.neck[0] + 4.2, J.neck[1] - 7], [J.neck[0], J.neck[1] - 7]], [[J.neck[0] + 4, J.neck[1] + 3], [J.neck[0] - 3, J.neck[1] + 3], [J.neck[0], J.neck[1] - 7]], [[J.neck[0] + 4, J.neck[1] + 3], [J.neck[0], J.neck[1] - 7]], C.skin, C.skinS);
    const oct = [-112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5, 202.5].map((a) => H(a)), top = H(-90, r * 0.93), bot = H(90, r * 0.93);
    piece(6, [top, oct[1], oct[2], oct[3], oct[4], bot], [top, oct[0], oct[7], oct[6], oct[5], bot], [top, bot], lt(C.skin, 0.12), C.skinS);
    const h1 = H(-112, r * 1.14), h2 = H(-10, r * 1.06), h3 = H(150, r * 1.08), hc = H(-150, r * 0.32), h4 = H(96, r * 0.62);
    piece(7, [h1, h2, hc], [h1, hc, h4, h3, H(-160, r * 1.15)], [h1, hc], C.hairL, C.hair);
    arm(J.arms[0], false);
    return pcs;
  }
  // reflect point q across the line a-b scaled by c (c = 1 flat open, -1 folded flat over, 0 edge-on)
  const hingePt = (q, a, b, c) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] * d[0] + d[1] * d[1] || 1, t = ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2, pr = [a[0] + d[0] * t, a[1] + d[1] * t]; return [pr[0] + (q[0] - pr[0]) * c, pr[1] + (q[1] - pr[1]) * c]; };
  function gtPaperDraw(g, pcs, foldT, grid) {
    const ord = [0, 1, 2, 3, 4, 5, 6, 7], dur = 0.42, gap = 0.2;
    // soft cast shadow of the whole sheet stack first (paper lifted off the backdrop)
    g.save(); g.translate(0.7, 1.1); g.fillStyle = "rgba(70,40,20,.16)";
    for (const pc of pcs) for (const pl of pc.planes) { if (pl.flap && foldT < (ord.indexOf(pc.g) * gap + dur)) continue; gtPath(g, pl.p); g.fill(); }
    g.restore();
    for (const pc of pcs) {
      const u = clamp((foldT - ord.indexOf(pc.g) * gap) / dur), c = Math.cos(Math.PI * (1 - inout3(u))), [A, B] = pc.hinge;
      const fl = pc.planes.find((p) => p.flap), fx = pc.planes.find((p) => !p.flap), fp = fl.p.map((q) => hingePt(q, A, B, c));
      const drawPl = (pts, col) => { g.fillStyle = col; gtPath(g, pts); g.fill(); g.strokeStyle = "rgba(255,249,236,.75)"; g.lineWidth = 0.55; g.lineJoin = "round"; g.stroke(); };
      // still closed: the flap lies on top showing the white back of the paper; opening: it swings round the crease
      const back = mix("#fbf3e2", fl.c, 0.08), shade = c < 0 ? mix(back, "#c9b08c", 0.25 * (1 + c)) : mix(fl.c, "#fff6e4", 0.18 * (1 - c));
      if (c >= 0) { drawPl(fp, shade); drawPl(fx.p, fx.c); }
      else { drawPl(fx.p, fx.c); drawPl(fp, shade); }
      // the crease itself: a thin valley line with a light ridge beside it
      g.strokeStyle = "rgba(60,30,20,.28)"; g.lineWidth = 0.45; gtPath(g, [A, B], false); g.stroke();
      if (grid) { g.strokeStyle = "rgba(60,30,20,.6)"; g.setLineDash([1.2, 1.2]); gtPath(g, [A, B], false); g.stroke(); g.setLineDash([]); }
    }
  }

  /* ---- crane (bird) folded from a square: a real flat-fold simulation. Each step cuts every layer on the crease
     line and rotates the flap 180 degrees around that line in 3D (valley towards you, mountain away);
     the folded layers are restacked, so later steps fold the stack. The sheet starts white side up; the coloured (red) side shows wherever a flap turns over. ---- */
  const ORI = (() => {
    const cr = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
    const cut = (P, a, b, sg) => { const out = []; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], fp = cr(a, b, p) * sg, fq = cr(a, b, q) * sg; if (fp >= 0) out.push(p); if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out.length > 2 && Math.abs(area(out)) > 1e-5 ? out : null; };
    const refl = (p, a, b) => hingePt(p, a, b, -1);
    const s2 = Math.SQRT1_2, T = [0, -1], k1 = [-0.3827, 0.9239], k2 = [-0.1951, 0.9808];
    const R = (v) => [-v[0], v[1]], P2 = (a, d, k = 2.4) => [a[0] + d[0] * k, a[1] + d[1] * k];
    // steps: crease line a-b, the point that picks the moving side, valley (v) / mountain (m), optional layer tag filter / new tag
    const STEPS = [
      { n: "kertas persegi", hold: true },
      { n: "lipat diagonal, lalu buka", a: [0, -1.2], b: [0, 1.2], pick: [-0.5, 0], unfold: true },
      { n: "sisi kiri ke garis tengah", a: T, b: P2(T, k1), pick: [-0.9, 0] },
      { n: "sisi kanan ke garis tengah", a: T, b: P2(T, R(k1)), pick: [0.9, 0] },
      { n: "layang-layang dirampingkan", a: T, b: P2(T, k2), pick: [-0.45, 0.3] },
      { n: "sisi kanan dirampingkan", a: T, b: P2(T, R(k2)), pick: [0.45, 0.3] },
      { n: "ujung atas dilipat ke bawah (leher)", a: [-1, 0], b: [1, 0], pick: [0, -0.8], add: "neck" },
      { n: "lipat dua ke belakang", a: [0, -1.5], b: [0, 1.5], pick: [0.3, 0.5], m: true },
      { n: "leher ditarik ke atas", a: [0, 0], b: [-0.843 * 2, 0.537 * 2], pick: [-0.05, 0.9], tag: "neck", keep: true },
      { n: "ujung leher ditekuk (kepala)", a: [-0.679 + 0.383, -0.317 + 0.924], b: [-0.679 - 0.383, -0.317 - 0.924], pick: [-0.86, -0.4], tag: "neck", keep: true },
      { n: "diputar: bangau jadi", turn: 90 },
    ];
    let st = [{ p: [[0, -1], [1, 0], [0, 1], [-1, 0]], inv: false, tags: [] }];
    const states = [st];
    const splitAll = (S, o) => { const fix = [], mov = []; for (const pc of S) { if (o.tag && !pc.tags.includes(o.tag)) { fix.push(pc); continue; } const ms = cr(o.a, o.b, o.pick) > 0 ? 1 : -1; const pm = cut(pc.p, o.a, o.b, ms), pf = cut(pc.p, o.a, o.b, -ms); if (pf) fix.push({ ...pc, p: pf }); if (pm) mov.push({ ...pc, p: pm }); } return { fix, mov }; };
    for (const o of STEPS) {
      if (o.hold || o.turn) { states.push(st); continue; }
      const { fix, mov } = splitAll(st, o);
      if (o.unfold) st = fix.concat(mov);
      else { const mv = mov.map((pc) => ({ p: pc.p.map((q) => refl(q, o.a, o.b)), inv: o.keep ? !pc.inv : pc.inv, tags: o.add ? pc.tags.concat(o.add) : pc.tags })).reverse(); st = o.m ? mv.concat(fix) : fix.concat(mv); }
      states.push(st);
    }
    return { STEPS, states, splitAll, area };
  })();
  // draw the crane at step i (0..) with progress u, display turn angle and fit
  function drawCrane(g, i, u, cx, cy, R, grid) {
    const o = ORI.STEPS[i], S = ORI.states[i], turnA = ORI.STEPS.slice(0, i).reduce((s, x) => s + (x.turn || 0), 0) + (o.turn ? o.turn * inout3(u) : 0);
    const ca = Math.cos(turnA * RAD), sa = Math.sin(turnA * RAD);
    // fit: centre on the paper bounding box (smoothly between the states)
    const bb = (st, a) => { const c = Math.cos(a * RAD), s = Math.sin(a * RAD); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const pc of st) for (const [x, y] of pc.p) { const X = x * c - y * s, Y = x * s + y * c; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); } return [(x0 + x1) / 2, y1, Math.max(x1 - x0, y1 - y0)]; };
    const b0 = bb(S, turnA), b1 = bb(ORI.states[i + 1] || S, turnA), k = inout3(u), mcx = lerp(b0[0], b1[0], k), mcy = lerp(b0[1], b1[1], k), span = lerp(b0[2], b1[2], k), sc = R * 2 / Math.max(1.15, span * 1.08);
    const base = cy + R * 0.98, prj = (x, y, z) => { const X = x * ca - y * sa, Y = x * sa + y * ca, pz = 5 / (5 - z); return [cx + (X - mcx) * sc * pz, base + (Y - mcy) * sc * pz - z * sc * 0.12]; };
    const RED = "#d94a3f", REDL = "#e8675a", CREAM = "#f7eedb", CREAMD = "#e7d9bb";
    const face = (pc, P2, z, lit) => {
      const front = (ORI.area(P2) > 0) !== pc.inv ? 1 : 0; // + area in screen space = coloured side up (display turn keeps the winding)
      let col = front ? (pc.k % 2 ? CREAMD : CREAM) : (pc.k % 2 ? RED : REDL); col = mix(col, "#3a1c16", 0.3 * (1 - lit));
      g.fillStyle = col; gtPath(g, P2); g.fill(); g.lineJoin = "round"; g.lineWidth = 1; g.strokeStyle = front ? "rgba(150,115,70,.55)" : "rgba(120,30,25,.55)"; g.stroke();
      g.strokeStyle = "rgba(255,250,240,.5)"; g.lineWidth = 0.6; g.stroke();
    };
    const flat = (list) => list.forEach((pc, j) => { pc.k = j; face(pc, pc.p.map(([x, y]) => prj(x, y, 0)), 0, 1); });
    // ground shadow under the model
    g.fillStyle = "rgba(80,50,20,.18)"; g.beginPath(); g.ellipse(cx, cy + R * 1.02, R * 0.85, R * 0.07, 0, 0, TAU); g.fill();
    if (o.hold || o.turn || u <= 0) { flat(S); }
    else if (u >= 1) { flat(ORI.states[i + 1]); }
    else {
      const { fix, mov } = ORI.splitAll(S, o), th = Math.PI * (o.unfold ? Math.sin(Math.PI * u) : inout3(u)), sgn = o.m ? -1 : 1;
      const d = [o.b[0] - o.a[0], o.b[1] - o.a[1]], dl = Math.hypot(d[0], d[1]), uu = [d[0] / dl, d[1] / dl];
      const rot = (q) => { const v = [q[0] - o.a[0], q[1] - o.a[1]], al = v[0] * uu[0] + v[1] * uu[1], pp = [v[0] - uu[0] * al, v[1] - uu[1] * al], pm = Math.hypot(pp[0], pp[1]); return [o.a[0] + uu[0] * al + pp[0] * Math.cos(th), o.a[1] + uu[1] * al + pp[1] * Math.cos(th), sgn * pm * Math.sin(th)]; };
      const moving = () => { const ord = th > Math.PI / 2 ? mov.slice().reverse() : mov; ord.forEach((pc, j) => { pc.k = j + 1; face(pc, pc.p.map((q) => { const r3 = rot(q); return prj(r3[0], r3[1], r3[2] * (1 + j * 0.01)); }), 1, 0.72 + 0.28 * Math.abs(Math.cos(th))); }); };
      if (o.m) { moving(); flat(fix); } else { flat(fix); moving(); }
      if (grid) { const A = prj(o.a[0], o.a[1], 0), B = prj(o.b[0], o.b[1], 0); g.strokeStyle = "rgba(60,30,20,.55)"; g.setLineDash([4, 4]); g.lineWidth = 1; gtPath(g, [A, B], false); g.stroke(); g.setLineDash([]); }
    }
  }

  function gayaTokoh(el) {
    const st = { gaya: "vektor", gerak: "walk", grid: false };
    const GAYA = [["vektor", "Vektor"], ["pixel", "Pixel art"], ["origami", "Origami"]];
    const EX = { vektor: "Contoh: dadah", pixel: "Contoh: sprite sheet", origami: "Contoh: bangau dilipat" };
    el.innerHTML = shell("ds-gaya", `<div class="ds-stage ds-gy-stage"><span class="ds-tag" data-gt>Vektor</span></div>`,
      UI.grp("Gaya gambar", UI.chips("gaya", GAYA, st.gaya)) +
      UI.grp("Gerak", `<div class="ds-flexrow" data-gerak>${UI.chips("gerak", [["walk", "Jalan"], ["idle", "Diam"], ["ex", EX.vektor]], st.gerak)}</div>`) +
      `<div class="ds-tgs">${UI.tog("grid", "Tampilkan grid / garis lipat", st.grid)}<button type="button" class="ds-tg" data-a="fold"><i></i>Lipat ulang</button></div>` +
      `<p class="ds-note" data-note></p><div class="ds-stats" data-stats></div>`,
      `<b>Catatan</b> Tokohnya sama, rangka geraknya sama, hanya cara menggambarnya yang berganti. Vektor memakai garis halus, pixel art memakai kotak-kotak kecil dengan warna terbatas, origami memakai bidang kertas terlipat yang terang di satu sisi dan gelap di sisi lain.`);
    const S = cv2d($(".ds-gy-stage", el)), note = $("[data-note]", el), stats = $("[data-stats]", el), gtag = $("[data-gt]", el);
    const NOTE = {
      vektor: "Garis halus dan warna rata per bahan. Kaki memakai mesin langkah yang sama dengan tokoh 3D: telapak menapak rata dan diam di tanah selama fase tumpu, celana berakhir di dalam sepatu. Gerak 24 gambar per detik.",
      pixel: "Sprite dilukis di ukuran aslinya (sekitar 90 piksel tinggi), tiap bahan punya 3 nada terang, dasar, bayangan. Garis tepi selektif: gelap di bawah dan belakang, lebih terang di sisi yang kena cahaya, sudut tangga diberi satu piksel nada tengah. Diperbesar tanpa dihaluskan, jalan 8 gambar per detik.",
      origami: "Setiap bagian tubuh adalah satu lembar kertas yang dilipat sekali di garis lipat lurus: sisi terang dan sisi gelap berbagi garis lipat, tepi kertas tampak putih. Tekan Lipat ulang: setiap sayap kertas berputar pada garis lipatnya seperti engsel, bagian lain tidak bergeser.",
    };
    let t = 0, foldT = 9, crT = 0, pixCache = { k: "" }, lastStats = "", sheet = null;
    const sync = () => {
      gtag.textContent = GAYA.find((x) => x[0] === st.gaya)[1]; note.textContent = NOTE[st.gaya];
      const ex = $(`[data-k="gerak"] [data-v="ex"]`, el); if (ex) ex.textContent = EX[st.gaya];
      $(`[data-a="fold"]`, el).style.display = st.gaya === "origami" ? "" : "none";
    };
    bind(el, st, (k) => { if (k === "gaya") { foldT = st.gaya === "origami" ? 0 : 9; crT = 0; sheet = null; } if (k === "gerak") crT = 0; sync(); });
    el.addEventListener("click", (e) => { if (e.target.closest('[data-a="fold"]')) { foldT = 0; crT = 0; } });
    sync(); foldT = 9;
    const G = gtG(), SPEED = G.v * GT_K; // walking speed in character units per second
    // backgrounds per look
    const bgVector = (g, W, H, gy, scroll) => {
      const sk = g.createLinearGradient(0, 0, 0, gy); sk.addColorStop(0, "#9fd0ea"); sk.addColorStop(1, "#f3e3c4"); g.fillStyle = sk; g.fillRect(0, 0, W, gy);
      g.fillStyle = "#fff6e4"; g.beginPath(); g.arc(W * 0.82, gy * 0.3, Math.min(W, H) * 0.07, 0, TAU); g.fill();
      for (const [k, col, amp, y0] of [[0.2, "#a9c98a", 0.16, 0.78], [0.45, "#7fae6a", 0.1, 0.9]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, gy); for (let x = 0; x <= W; x += 8) g.lineTo(x, gy * y0 - Math.sin((x + scroll * k) * 0.012) * gy * amp * 0.5 - Math.sin((x + scroll * k) * 0.031) * gy * amp * 0.3); g.lineTo(W, gy); g.fill(); }
      g.fillStyle = "#d7b98a"; g.fillRect(0, gy, W, H - gy); g.fillStyle = "#c49f6c"; for (let x = -(((scroll) % 60) + 60) % 60; x < W; x += 60) g.fillRect(x, gy + 10, 30, 4);
    };
    const bgOrigami = (g, W, H, gy, scroll) => {
      g.fillStyle = "#efe3c9"; g.fillRect(0, 0, W, H);
      const R = rng(5); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,110,60,${0.03 + R() * 0.04})`; const x = R() * W, y = R() * gy, s = 20 + R() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.2, y + s); g.fill(); }
      const mt = (x0, w, h, c1, c2) => { const x = ((x0 - scroll * 0.25) % (W + w * 2) + W + w * 2) % (W + w * 2) - w; g.fillStyle = c1; g.beginPath(); g.moveTo(x - w / 2, gy); g.lineTo(x, gy - h); g.lineTo(x, gy); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(x, gy - h); g.lineTo(x + w / 2, gy); g.lineTo(x, gy); g.fill(); g.fillStyle = "#fbf6ea"; g.beginPath(); g.moveTo(x - w * 0.1, gy - h * 0.8); g.lineTo(x, gy - h); g.lineTo(x + w * 0.1, gy - h * 0.8); g.lineTo(x, gy - h * 0.86); g.fill(); };
      mt(W * 0.15, 220, gy * 0.62, "#8fb3a6", "#6d9387"); mt(W * 0.55, 300, gy * 0.8, "#a8c2b4", "#7fa192"); mt(W * 0.9, 200, gy * 0.55, "#8fb3a6", "#6d9387");
      g.fillStyle = "#c9935a"; g.fillRect(0, gy, W, H - gy); g.fillStyle = "#b07c48"; g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.lineTo(W, gy + 6); g.lineTo(0, gy + 14); g.fill();
      g.strokeStyle = "rgba(255,240,215,.35)"; g.lineWidth = 1; for (let x = -(((scroll) % 48) + 48) % 48; x < W; x += 48) { g.beginPath(); g.moveTo(x, gy + 14); g.lineTo(x + 30, H); g.stroke(); }
    };
    // pixel scene in a low-res buffer
    const low = document.createElement("canvas"), lg = low.getContext("2d");
    const PX = { sky: "#8fc3e6", sky2: "#b9dcef", sky3: "#e4eef0", cloud: "#fff7ea", cloudS: "#d9e6ee", hill: "#6fa35a", hillS: "#4e7f45", hillL: "#8cbc6c", gr: "#c59a63", grS: "#9a7448", grL: "#d9b27c", grass: "#79b35c", grassS: "#5a8f47" };
    const bgPixel = (Wl, Hl, gyl, sc) => {
      lg.fillStyle = PX.sky; lg.fillRect(0, 0, Wl, Hl);
      // dithered bands instead of a gradient
      for (let y = Math.floor(gyl * 0.45); y < gyl; y++) for (let x = 0; x < Wl; x++) { const k = (y - gyl * 0.45) / (gyl * 0.55); if ((x + y) % 2 === 0 ? k > 0.25 : k > 0.55) { lg.fillStyle = k > 0.8 ? PX.sky3 : PX.sky2; lg.fillRect(x, y, 1, 1); } }
      const cl = (cx, cy) => { lg.fillStyle = PX.cloudS; lg.fillRect(cx + 1, cy + 3, 22, 2); lg.fillStyle = PX.cloud; lg.fillRect(cx, cy, 24, 4); lg.fillRect(cx + 4, cy - 3, 11, 3); lg.fillRect(cx + 13, cy - 2, 7, 2); };
      const wrap = (x) => ((x % (Wl + 40)) + Wl + 40) % (Wl + 40) - 20;
      cl(wrap(20 - Math.floor(sc * 0.1)), Math.floor(gyl * 0.22)); cl(wrap(Math.floor(Wl * 0.6) - Math.floor(sc * 0.1)), Math.floor(gyl * 0.12));
      for (let x = 0; x < Wl; x++) { const u = x + Math.floor(sc * 0.4), hh = Math.round(gyl * 0.24 + Math.sin(u * 0.05) * 5 + Math.sin(u * 0.13) * 2); lg.fillStyle = PX.hill; lg.fillRect(x, gyl - hh, 1, hh); lg.fillStyle = PX.hillL; lg.fillRect(x, gyl - hh, 1, 1); if (Math.floor(u / 4) % 6 === 0) { lg.fillStyle = PX.hillS; lg.fillRect(x, gyl - hh + 3, 1, hh - 3); } }
      lg.fillStyle = PX.grass; lg.fillRect(0, gyl, Wl, 3); lg.fillStyle = PX.grassS; lg.fillRect(0, gyl + 3, Wl, 1); lg.fillStyle = PX.gr; lg.fillRect(0, gyl + 4, Wl, Hl - gyl - 4);
      const o = Math.floor(sc); for (let x = -(((o % 12) + 12) % 12); x < Wl; x += 12) { lg.fillStyle = PX.grS; lg.fillRect(x, gyl + 7, 4, 1); lg.fillRect(x + 6, gyl + 12, 3, 1); lg.fillStyle = PX.grL; lg.fillRect(x + 2, gyl + 9, 2, 1); lg.fillStyle = PX.grassS; lg.fillRect(x + 3, gyl - 1, 1, 1); lg.fillRect(x + 9, gyl - 1, 1, 1); }
    };
    // crane timeline: each step folds for 0.95 s and holds 0.35 s; the model holds, then unfolds by playing the folds backwards
    const NS = ORI.STEPS.length, FOLD = 0.95, HOLD = 0.35, BACK = 0.32;
    const crane = (tm) => {
      const fwd = NS * (FOLD + HOLD), hold = 2.4, back = (NS - 1) * BACK, tot = fwd + hold + back + 0.6; tm %= tot;
      if (tm < fwd) { const i = Math.floor(tm / (FOLD + HOLD)), r = tm - i * (FOLD + HOLD); return [i, Math.min(1, r / FOLD)]; }
      if (tm < fwd + hold) return [NS - 1, 1];
      if (tm < fwd + hold + back) { const r = tm - fwd - hold, j = Math.floor(r / BACK), i = NS - 1 - j; return [i, 1 - (r - j * BACK) / BACK]; }
      return [0, 0];
    };
    visLoop(el, (dt) => {
      t += dt; foldT += dt; crT += dt;
      const g = S.fit(), W = S.w, H = S.h, gy = H * 0.84, mode = st.gerak === "ex" ? (st.gaya === "vektor" ? "wave" : "ex") : st.gerak;
      let statRows;
      if (st.gaya === "pixel") {
        // one sprite pixel = ps screen pixels; the character is about 90 sprite pixels tall
        const ps = Math.max(2, Math.round(H * 0.66 / 92)), Wl = Math.ceil(W / ps), Hl = Math.ceil(H / ps), gyl = Math.round(gy / ps), s = H * 0.66 / ps / 100;
        if (low.width !== Wl || low.height !== Hl) { low.width = Wl; low.height = Hl; pixCache = { k: "" }; sheet = null; }
        const fps = 8, nF = 8, fi = Math.floor(t * fps), fr = fi % nF, tq = fi / fps;
        const walking = mode === "walk" || mode === "ex", sc = walking ? Math.round(tq * SPEED * s) : 0;
        bgPixel(Wl, Hl, gyl, sc);
        const blink = (tq % 3.2) < 0.13;
        const key = `${mode}|${walking ? fr : fi % 2}|${blink}|${s.toFixed(3)}`;
        if (pixCache.k !== key) pixCache = { k: key, s: gtPixelSprite(gtPose(walking ? "walk" : "idle", walking ? fr / nF : (fi % 2) * 0.25), s, blink) };
        const sp = pixCache.s, cx = mode === "ex" ? Math.round(Wl * 0.22) : Math.round(Wl * 0.45);
        lg.fillStyle = "rgba(60,40,20,.35)"; lg.fillRect(cx - Math.round(14 * s), gyl, Math.round(30 * s), 1); lg.fillRect(cx - Math.round(10 * s), gyl + 1, Math.round(22 * s), 1);
        lg.drawImage(sp.c, cx - sp.ox, gyl - sp.oy);
        if (mode === "ex") {
          // sprite sheet: the 8 walk frames side by side, the playing frame boxed
          const s2 = s * 0.5, fw = Math.ceil(46 * s2), rh = Math.ceil(110 * s2), fx0 = Math.round(Wl * 0.42);
          const cols = Math.max(2, Math.min(8, Math.floor((Wl - fx0 - 3) / fw))), rows = Math.ceil(nF / cols), fy = Math.max(2, Math.round((gyl - rows * rh) / 2));
          lg.fillStyle = "rgba(20,14,40,.6)"; lg.fillRect(fx0 - 2, fy - 2, cols * fw + 3, rows * rh + 3);
          if (!sheet) sheet = Array.from({ length: nF }, (_, i) => gtPixelSprite(gtPose("walk", i / nF), s2, false));
          for (let i = 0; i < nF; i++) { const s3 = sheet[i], x = fx0 + (i % cols) * fw, y = fy + Math.floor(i / cols) * rh; lg.drawImage(s3.c, x + Math.round(fw * 0.42) - s3.ox, y + rh - 2 - s3.oy); if (i === fr) { lg.fillStyle = "#ffd36b"; lg.fillRect(x - 1, y - 1, fw, 1); lg.fillRect(x - 1, y + rh - 1, fw, 1); lg.fillRect(x - 1, y - 1, 1, rh); lg.fillRect(x + fw - 2, y - 1, 1, rh); } }
        }
        g.imageSmoothingEnabled = false; g.drawImage(low, 0, 0, Wl * ps, Hl * ps); g.imageSmoothingEnabled = true;
        if (st.grid) { g.strokeStyle = "rgba(20,14,40,.18)"; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x += ps) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = 0; y <= H; y += ps) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke(); }
        statRows = [["resolusi", `${Wl}×${Hl} px`], ["tinggi tokoh", `${Math.round(100 * s)} px`], ["nada per bahan", "3 + garis tepi"], ["gerak", "8 gambar/detik"], ["piksel", `${ps}×${ps} layar`]];
      } else if (st.gaya === "origami" && mode === "ex") {
        bgOrigami(g, W, H, gy, 0);
        const [i, u] = crane(crT), R = Math.min(W * 0.3, H * 0.36);
        drawCrane(g, i, u, W * 0.5, gy - R * 1.02, R, st.grid);
        tag(g, `${i + 1} · ${ORI.STEPS[i].n}`.toUpperCase(), 14, H - 14, "#5b3a1e", 10);
        statRows = [["langkah", `${i + 1} / ${NS}`], ["lipatan", "sayap berputar pada garis lipat"], ["lapisan", `${ORI.states[Math.min(NS, i + 1)].length} bidang`], ["sisi balik", "kertas krem"]];
      } else {
        const walking = mode === "walk", fps = st.gaya === "origami" ? 12 : 24, tq = Math.floor(t * fps) / fps;
        const k = (H * 0.66) / 100, cx = W * 0.47, scroll = walking ? tq * SPEED * k : 0;
        if (st.gaya === "origami") bgOrigami(g, W, H, gy, scroll); else bgVector(g, W, H, gy, scroll);
        const J = gtPose(mode, walking ? (tq / G.g.T) % 1 : (tq / 3.2) % 1), blink = (tq % 3.4) < 0.11;
        g.fillStyle = st.gaya === "origami" ? "rgba(80,50,20,.25)" : "rgba(60,40,30,.22)"; g.beginPath(); g.ellipse(cx + 2 * k, gy + 1, 17 * k, 2.6 * k, 0, 0, TAU); g.fill();
        g.save(); g.translate(cx, gy); g.scale(k, k);
        if (st.gaya === "vektor") { gtVector(g, J, { blink, lwI: 2.2 }); statRows = [["garis", "halus, tepi tinta"], ["telapak", "rata di tanah saat menumpu"], ["gerak", "24 gambar/detik"], ["sendi", "berputar mulus"]]; }
        else {
          const F = gtPaper(J); gtPaperDraw(g, F, foldT, st.grid);
          if (foldT > 2) {
            const [hx, hy] = J.head; g.fillStyle = GT_COL.ink; g.beginPath(); g.moveTo(hx + 5.5, hy - 1.8); g.lineTo(hx + 8, hy - 0.2); g.lineTo(hx + 5.5, hy + (blink ? -1.2 : 1.6)); g.fill();
            g.fillStyle = rgba(GT_COL.blush, 0.6); g.beginPath(); g.moveTo(hx + 4, hy + 4); g.lineTo(hx + 8, hy + 3.5); g.lineTo(hx + 6, hy + 6); g.fill();
          }
          statRows = [["lembar kertas", `${F.length} lembar`], ["bidang", `${F.length * 2} (terang + gelap)`], ["gerak", "12 gambar/detik"], ["buka lipatan", foldT < 2 ? "berjalan" : "selesai"]];
        }
        g.restore();
      }
      const sh = statRows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join(""); if (sh !== lastStats) { lastStats = sh; stats.innerHTML = sh; }
    });
    // test hook: deterministic frames for the harness
    el._gtTest = { pose: gtPose, set: (o) => { if (o.t !== undefined) t = o.t; if (o.crT !== undefined) crT = o.crT; if (o.foldT !== undefined) foldT = o.foldT; } };
  }

  DM.add("pegas", pegas);
  DM.add("prinsip", prinsip);
  DM.add("gait", gait);
  DM.add("orbit3d", orbit3d);
  DM.add("vkit", vkit);
  DM.add("bayangan", bayangan);
  DM.add("tanker", tanker);
  DM.add("gaya-tokoh", gayaTokoh);
  window.DemosSkills = { Gait, _fig: { FIG, HD, measure: figMeasure, figGait, drawFigure, figStand, figWalk, figPrims, shadowShapes, groundScr, fillScr, camOrbit, camHeight, sunDir } };
})();
