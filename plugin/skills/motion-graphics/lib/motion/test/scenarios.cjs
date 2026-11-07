// Skenario objek biasa (tanpa DOM) untuk uji banding Gerak vs GSAP. Tiap skenario: G -> hasil JSON.
// Dipakai oleh banding.cjs (butuh gsap terpasang, opsional) dan uji.cjs (nilai harapan tersimpan).
const R = (v) => (typeof v === "number" ? Math.round(v * 1e5) / 1e5 : v);
function seq(G, build, times, sup) {
  const o = { v: 0 }; const tl = G.timeline({ paused: true }); build(tl, o);
  return times.map((t) => { tl.totalTime(t, !!sup); return R(o.v); });
}
module.exports = {
  // ---- repeat / yoyo
  repeatBoundary: (G) => seq(G, (tl, o) => tl.to(o, { v: 1, duration: 1, ease: "none", repeat: 2 }, 0), [0.5, 1, 2, 3, 2.5, 1, 0]),
  yoyo: (G) => seq(G, (tl, o) => tl.to(o, { v: 1, duration: 1, ease: "none", repeat: 2, yoyo: true }, 0), [0.5, 1, 1.25, 2, 3, 2.5, 1, 0]),
  repeatDelay: (G) => seq(G, (tl, o) => tl.to(o, { v: 1, duration: 1, ease: "none", repeat: 1, repeatDelay: 0.5 }, 0), [0.5, 1, 1.25, 1.5, 1.75, 2.5, 0]),
  nested: (G) => seq(G, (tl, o) => { const c = G.timeline(); c.to(o, { v: 10, duration: 1, ease: "none" }); tl.add(c, 1); }, [0.5, 1.5, 3, 1.25, 0]),
  nestedRep: (G) => seq(G, (tl, o) => { const c = G.timeline({ repeat: 1, yoyo: true }); c.to(o, { v: 10, duration: 1, ease: "none" }); tl.add(c, 1); }, [1.5, 2.5, 3.5, 2.25]),
  tlRepeat: (G) => seq(G, (tl, o) => { tl.to(o, { v: 10, duration: 1, ease: "none" }); tl.repeat(2); tl.yoyo(true); }, [0.5, 1.5, 2.5, 3]),
  // ---- set / from / immediateRender
  setAt1: (G) => seq(G, (tl, o) => { tl.set(o, { v: 5 }, 1); tl.to({}, { duration: 1 }, 2); }, [1, 0.5, 1, 3, 0.99]),
  fromAt1: (G) => seq(G, (tl, o) => { tl.from(o, { v: 3, duration: 1 }, 1); }, [0, 0.5, 1.5, 0.5, 0]),
  fromToIrF1: (G) => seq(G, (tl, o) => { tl.fromTo(o, { v: 3 }, { v: 9, duration: 1, immediateRender: false }, 1); }, [0.5, 1.5, 0.5]),
  toThenFrom: (G) => seq(G, (tl, o) => { tl.to(o, { v: 1, duration: 1 }, 0); tl.from(o, { v: 7, duration: 1 }, 2); }, [0.5, 1.5, 2.5, 0.5, 0]),
  constructedFrom: (G) => { const o = { v: 0 }; const tl = G.timeline({ paused: true }); tl.from(o, { v: 3, duration: 1 }, 1); return [o.v]; },
  constructedSet: (G) => { const o = { v: 0 }; const tl = G.timeline({ paused: true }); tl.set(o, { v: 3 }, 0.5); return [o.v, tl.duration()]; },
  overlapSeq: (G) => seq(G, (tl, o) => { tl.to(o, { v: 100, duration: 2, ease: "none" }, 0); tl.to(o, { v: 200, duration: 2, ease: "none" }, 1); }, [0.5, 1, 1.5, 2, 2.5]),
  overlapWarm: (G) => seq(G, (tl, o) => { tl.to(o, { v: 100, duration: 2, ease: "none" }, 0); tl.to(o, { v: 200, duration: 2, ease: "none" }, 1); tl.totalTime(tl.duration(), true); tl.totalTime(0, true); }, [0.5, 1, 1.5, 2, 2.5]),
  rel: (G) => seq(G, (tl, o) => { tl.to(o, { v: "+=10", duration: 1, ease: "none" }, 0); tl.to(o, { v: "-=4", duration: 1, ease: "none" }, 1); }, [0.5, 1.5, 2, 0]),
  stagger: (G) => { const a = [{ v: 0 }, { v: 0 }, { v: 0 }]; const tl = G.timeline({ paused: true }); tl.to(a, { v: 10, duration: 1, ease: "none", stagger: 0.5 }, 0); return [0.5, 1, 1.5, 2].map((t) => (tl.totalTime(t), a.map((o) => R(o.v)).join(","))).concat([tl.duration()]); },
  staggerRepYoyo: (G) => { const a = [{ v: 0 }, { v: 0 }, { v: 0 }]; const tl = G.timeline({ paused: true }); tl.to(a, { v: 10, duration: 1, ease: "none", stagger: 0.5, repeat: 1, yoyo: true }, 0); return [1, 2, 2.5, 3.5].map((t) => (tl.totalTime(t), a.map((o) => R(o.v)).join(","))).concat([tl.duration()]); },
  staggerEach: (G) => { const a = [{ v: 0 }]; const tl = G.timeline({ paused: true }); tl.to(a, { v: 10, duration: 1, ease: "none", stagger: { each: 0.5, repeat: 1, yoyo: true } }, 0); return [tl.duration()]; },
  staggerFn: (G) => { const a = [{ v: 0 }, { v: 0 }, { v: 0 }]; G.to(a, { v: (i) => i * 10, duration: 1, ease: "none", paused: true }).progress(1); return a.map((o) => o.v); },
  steps: (G) => { const o = { v: 0 }; const tw = G.to(o, { v: 10, duration: 1, ease: "steps(4)", paused: true }); return [0.1, 0.24, 0.25, 0.5, 0.99, 1].map((t) => (tw.totalTime(t), o.v)); },
  setTop: (G) => { const o = { v: 0 }; G.set(o, { v: 4 }); return [o.v]; },
  startAt: (G) => { const o = { v: 0 }; const tl = G.timeline({ paused: true }); tl.fromTo(o, { v: 1 }, { v: 2, duration: 1, startAt: { v: 5 } }, 1); return [o.v]; },
  chain: (G) => { const tl = G.timeline({ paused: true }); const o = { v: 0 }; tl.to(o, { v: 1, duration: 1 }, 0).to(o, { v: 2, duration: 1 }); tl.to(o, { v: 3, duration: 1 }, "+=0"); return tl.getChildren().map((c) => c.startTime()); },
  addMisc: (G) => { const tl = G.timeline({ paused: true }); tl.add(() => {}, 2); tl.add("lbl", 3); tl.add([G.to({}, { duration: 1 }), G.to({}, { duration: 2 })], 1); return [tl.duration(), tl.labels, tl.getChildren().map((c) => [c.startTime(), c.duration()])]; },
  seekProg: (G) => { const tl = G.timeline({ paused: true }); const o = { v: 0 }; tl.to(o, { v: 1, duration: 1, ease: "none" }, 0); tl.seek(0.5); const a = [o.v, tl.time(), tl.progress()]; tl.progress(0.25); return a.concat([o.v]); },
  startTimeSet: (G) => { const tl = G.timeline({ paused: true }); const o = { v: 0 }; tl.to(o, { v: 1, duration: 1 }, 0.5); tl.to(o, { v: 2, duration: 1 }, 3); const a = [tl.getChildren().map((c) => c.startTime()), tl.duration()]; tl.getChildren()[1].startTime(2); return a.concat([tl.duration()]); },
  zeroDur: (G) => { const o = { v: 0 }; const tl = G.timeline({ paused: true }); tl.to(o, { v: 1, duration: 0 }, 1); tl.totalTime(1); return [o.v]; },
  positions: (G) => {
    const tp = G.timeline({ paused: true }); const q = {};
    tp.to(q, { duration: 1 }); tp.to(q, { duration: 1 }, "+=0.5"); tp.to(q, { duration: 2 }, "<"); tp.to(q, { duration: 1 }, "<0.2"); tp.to(q, { duration: 1 }, ">"); tp.addLabel("L", 1.3); tp.to(q, { duration: 1 }, "L+=1"); tp.to(q, { duration: 1 }, "L"); tp.to(q, { duration: 1 }, "-=0.3"); tp.to(q, { duration: 1 }, "M"); tp.to(q, { duration: 1 }, "N+=2"); tp.to(q, { duration: 1 }, ">-0.5"); tp.to(q, { duration: 1, delay: 0.5 }, 1); tp.to(q, { duration: 1 }, "<+=1"); tp.to(q, { duration: 1 }, "L-=0.3"); tp.to(q, { duration: 1 }, "<-0.2");
    return [tp.getChildren().map((c) => R(c.startTime())), tp.labels, R(tp.duration())];
  },
  infinite: (G) => { const tr = G.timeline({ paused: true }); tr.to({ v: 0 }, { v: 1, duration: 1, repeat: -1 }); return [tr.duration(), tr.totalDuration()]; },
  defaultsTl: (G) => { const tl = G.timeline({ paused: true, defaults: { duration: 2, ease: "none" } }); const o = { v: 0 }; tl.to(o, { v: 1 }); tl.totalTime(0.5); return [tl.duration(), o.v]; },
  defaultEase: (G) => { const o = { v: 0 }; const t = G.timeline({ paused: true }); t.to(o, { v: 1, duration: 1 }); t.totalTime(0.5); return [o.v]; },
  delayInTl: (G) => { const tl = G.timeline({ paused: true }); tl.to({ v: 0 }, { v: 1, duration: 1, delay: 0.5, repeat: 1, ease: "none" }, 0); return [tl.duration(), tl.getChildren()[0].startTime(), tl.getChildren()[0].delay()]; },
  childTimeScale: (G) => { const p = G.timeline({ paused: true }); const c = G.timeline(); c.to({}, { duration: 1 }); p.add(c, 0); c.timeScale(2); return [p.duration()]; },
  strings: (G) => { const o = { s: "0px 0px", c: "red", n: "5px", m: "a", q: "5" }; G.to(o, { s: "10px 5em", c: "#00ff00", n: "15px", m: "b", q: 10, duration: 1, ease: "none", paused: true }).progress(0.5); return [o.s, o.c, o.n, o.m, o.q]; },
  stringsEnd: (G) => { const o = { c: "rgb(0,0,0)", s: "1px" }; G.to(o, { c: "hsl(120,100%,50%)", s: "2.123456px", duration: 1, ease: "none", paused: true }).progress(1); return [o.c, o.s]; },
  objRound: (G) => { const o = { v: 0, s: "0px" }; G.to(o, { v: 1 / 3, s: "1px", duration: 1, ease: "none", paused: true }).progress(1 / 3); return [o.v, o.s]; },
  kfObj: (G) => { const o = { v: 0 }; const t = G.to(o, { keyframes: { v: [0, 10, 5, 20] }, duration: 3, ease: "none", paused: true }); return [0.25, 0.5, 1, 1.5, 2, 2.5].map((x) => (t.totalTime(x), R(o.v))).concat([t.duration()]); },
  kfObjEase: (G) => { const o = { v: 0 }; const t = G.to(o, { keyframes: { v: [0, 10, 5, 20], easeEach: "none" }, duration: 3, ease: "power2.in", paused: true }); return [0.5, 1, 1.5, 2, 2.5].map((x) => (t.totalTime(x), R(o.v))); },
  kfArr: (G) => { const o = { v: 0 }; const t = G.to(o, { keyframes: [{ v: 10, duration: 1 }, { v: 0, duration: 0.5, ease: "none" }], paused: true }); return [0.25, 0.5, 1, 1.25, 1.5].map((x) => (t.totalTime(x), R(o.v))).concat([t.duration()]); },
  kfArrEase: (G) => { const o = { v: 0 }; const t = G.to(o, { keyframes: [{ v: 10, duration: 1 }, { v: 0, duration: 1 }], ease: "power2.in", paused: true }); return [0.25, 1.5].map((x) => (t.totalTime(x), R(o.v))); },
  callbacks: (G) => {
    const o = { v: 0 }, log = [];
    const tl = G.timeline({ paused: true });
    tl.to(o, { v: 1, duration: 1, onStart: () => log.push("s"), onComplete: () => log.push("c") }, 1); tl.call(() => log.push("k"), null, 2.5); tl.to({}, { duration: 3 }, 0);
    [0.5, 1.5, 2, 3, 2.7, 1.2].forEach((t) => { tl.totalTime(t); log.push("|"); });
    return [log.join("")];
  },
  onUpdateTl: (G) => { let n = 0, last; const tl = G.timeline({ paused: true, onUpdate() { n++; last = this.time(); } }); tl.to({ v: 0 }, { v: 1, duration: 1 }); tl.totalTime(0.5); tl.totalTime(0.5); tl.totalTime(0.7); return [n, last]; },
  arrTarget: (G) => { const a = [0, 0]; G.to(a, { 0: 10, 1: 20, duration: 1, ease: "none", paused: true }).progress(0.5); return a; },
  getterSetter: (G) => { const o = { _g: 0, g(x) { if (arguments.length) this._g = x; return this._g; } }; G.to(o, { g: 10, duration: 1, ease: "none", paused: true }).progress(0.5); return [o._g]; },
};
