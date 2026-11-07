/* Adaptive quality tier shared by fx.js, cosmos.js, orbit.js and covers.js.
   QUALITY.tier: 2 full · 1 reduced · 0 minimal. Starts from a device guess, then a light frame-time probe
   steps it down (never up) when frames are long for a sustained stretch; the result is remembered per browser.
   QUALITY.dpr(): canvas pixel ratio cap (1.25 desktop, 1 mobile). QUALITY.n(x): scale a particle count. */
window.QUALITY = (() => {
  const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 8;
  let tier = cores <= 2 || mem <= 2 ? 0 : cores <= 4 || mem <= 4 ? 1 : 2;
  if (mobile) tier = Math.min(tier, 1);
  try { const s = localStorage.getItem("mgp-quality"); if (s !== null) tier = Math.min(tier, +s); } catch (e) {}
  const subs = [];
  const Q = {
    get tier() { return tier; },
    mobile,
    dpr: () => Math.min(devicePixelRatio || 1, mobile ? 1 : 1.25),
    n: (x) => Math.max(1, Math.round(x * [.4, .7, 1][tier])),
    on: (fn) => subs.push(fn),
    down() {
      if (tier === 0) return;
      tier--; try { localStorage.setItem("mgp-quality", String(tier)); } catch (e) {}
      document.documentElement.dataset.q = tier; subs.forEach((f) => { try { f(tier); } catch (e) {} });
    },
  };
  document.documentElement.dataset.q = tier;
  // probe: two consecutive 2-second windows with >20% long frames (>34 ms) step the tier down once
  let last = 0, n = 0, slow = 0, t0 = 0, bad = 0;
  const probe = (now) => {
    if (document.hidden) { last = 0; requestAnimationFrame(probe); return; }
    if (last) { const d = now - last; n++; if (d > 34 && d < 1000) slow++; }
    last = now; if (!t0) t0 = now;
    if (now - t0 > 2000) {
      bad = n > 20 && slow / n > .2 ? bad + 1 : 0;
      if (bad >= 2) { Q.down(); bad = 0; }
      n = slow = 0; t0 = now;
    }
    if (tier > 0) requestAnimationFrame(probe);
  };
  addEventListener("load", () => setTimeout(() => requestAnimationFrame(probe), 2500), { once: true });
  return Q;
})();
