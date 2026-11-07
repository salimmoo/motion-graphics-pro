# mgp.motion

The animation/tween engine of Motion Graphics Pro (old name: Gerak, in `lib/gerak/`). Written from scratch to replace GSAP in this package: the GSAP licence ("Standard No Charge") forbids use in tools that compete with Webflow's visual animation builder, and mgp Studio is such a tool. No GSAP code was copied; only the **API shape** is matched (so older compositions keep working) and the **behaviour** (black-box tested, see `test/`).

| File | Content |
|---|---|
| `motion.js` | Main source, UMD: `<script src>` (global `mgp.motion`), `require()` in Node |
| `motion.mjs` | ES module, generated from `motion.js` by `build.mjs` (do not edit) |
| `build.mjs` | `node lib/motion/build.mjs` (old name `lib/gerak/bangun.mjs`): writes `motion.mjs`, the old-path copies `lib/gerak/gerak.js` + `lib/gerak/gerak.mjs`, and the renderer copy `motion-graphics-pro/render/src/motion.js` |
| `test/` | Unit tests, comparison against GSAP, pixel parity tests |

`lib/gerak/gerak.js` (and `gerak.mjs`) is kept as a byte-identical copy of the engine, so compositions that still load the old path keep working.

## Use

```html
<script src="lib/motion/motion.js"></script>
<script>
  const tl = gsap.timeline({ paused: true });          // window.gsap = mgp.motion (compatibility alias)
  tl.fromTo(".title", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.08 })
    .to(".title", { autoAlpha: 0, duration: 0.4 }, "+=1.5");
  window.__timelines = { main: tl };
</script>
```

- **Globals:** the canonical name is `mgp.motion` (`mgp.motion.timeline(...)`, `mgp.motion.to(...)`). The same object is also `window.Gerak` and `window.gerak` (old names).
- **gsap alias:** when `window.gsap` is not defined yet, `motion.js` sets `window.gsap = mgp.motion` (`mgp.motion.isShim === true`). Old GSAP-style code runs unchanged. When real GSAP is loaded first, mgp.motion does not overwrite it. Set `window.__motionNoShim = true` (old name `__gerakTanpaShim`) before loading to turn the alias off.
- **ES module:** `import motion, { timeline, utils } from "./lib/motion/motion.mjs";` (also exported as `motion`, `gsap` and `Gerak`).
- **Node:** `const motion = require("./lib/motion/motion.js");` (a plain object; no DOM).
- **mgp:** every GSAP `<script>` from jsDelivr/unpkg/cdnjs, and `/__mgp/gsap/gsap.min.js` (old prefix `/__rekam/`), is served with mgp.motion. `--native-gsap` (old `--gsap-asli`) uses `node_modules/gsap` when the user installed it.

## Principles

1. **Time only moves through the ticker or an explicit seek.** There is no hidden clock.
2. **Deterministic seek.** `tl.totalTime(t)` rebuilds the state: it reverts the writes of the previous render, re-applies immediate renders (`from`/`fromTo`/`startAt`), then renders every child that has started, ordered by when they last changed. The result at `t` is always the same, whatever the seek direction and however many times, including tweens that overlap on the same property (in GSAP this case depends on history).
3. **Start values are captured as in sequential playback.** On the first seek (and whenever the structure changes), mgp.motion does a "warm-up": a forward sweep in a shadow frame that does not touch the DOM, so every `to` tween captures its start value at the moment it starts. A tween stacked on another tween reads its start value on its **first rendered frame**, as GSAP does under frame-by-frame playback (see "Start values and the frame grid" below).
4. **Deferred writes.** One seek writes every property once (transforms are composed once per element), then the callbacks run after every final value is in place.
5. **No `Math.random`.** `utils.random`, `"random(a, b)"` and stagger `from: "random"` use a seeded generator (`mgp.motion.utils.seed(n)`).
6. **Exact at frame boundaries.** Child positions are rounded to 1e-8 s, but a child counts as started when the seek time is less than 1e-7 s before its position. So a `set()`/tween placed at k/fps (e.g. `1.5 + 1/24`) applies exactly at frame k, as in GSAP (previously one frame late). Test: the "frame boundary k/fps" section 6 of `test/test.cjs`.

### Start values and the frame grid (v2.4)

- **Elastic eases land exactly on the end value**, also when start + duration carries floating-point noise (e.g. a 0.9 s `elastic.out` placed at 3.15 s ends at exactly 0, with the same values as GSAP).
- **Stacked tweens:** the start value of a tween stacked on another tween (for example a `to` that starts while a yoyo tween on the same property is still running) is read on the first frame it renders, not at its exact start time. The frame grid comes from `window.__mgpInitFps`, which the mgp runtime sets to the composition fps; `mgp.motion.config({ initFps })` overrides it; without either, the live ticker uses 60 and a plain seek uses 0. `initFps: 0` restores the old exact-start behaviour. Under frame playback the result equals GSAP.

## API coverage

**Global:** `timeline`, `to`, `from`, `fromTo`, `set`, `delayedCall`, `killTweensOf`, `getTweensOf`, `isTweening`, `getProperty`, `quickSetter`, `quickTo`, `parseEase`, `registerEase`, `registerPlugin` (no-op), `registerEffect`/`effects`, `utils`, `ticker` (`add`, `remove`, `lagSmoothing`, `fps`, `tick`, `time`, `frame`, `deltaRatio`), `globalTimeline` (`autoRemoveChildren`, `getChildren`, `pause`, `totalTime`), `config` (`force3D`, `initFps`), `defaults` (`duration`, `ease`), `context` (`add`, `revert`, `kill`, `ignore`, selector scope), `matchMedia` (minimal), `exportRoot`, plus `spring` and `inertia` (below).

**Timeline:** `to`, `from`, `fromTo`, `set`, `add` (tween, timeline, function, label, array), `call`, `addLabel`, `removeLabel`, `addPause`, `remove`, `clear`, `kill`, `play`, `pause`, `resume`, `reverse`, `restart`, `seek`, `progress`, `totalProgress`, `time`, `totalTime`, `duration`, `totalDuration`, `timeScale`, `startTime`, `endTime`, `delay`, `repeat`, `repeatDelay`, `yoyo`, `iteration`, `paused`, `reversed`, `isActive`, `getChildren`, `getTweensOf`, `recent`, `shiftChildren`, `currentLabel`/`nextLabel`/`previousLabel`, `tweenTo`, `tweenFromTo`, `invalidate`, `eventCallback`, `then`, `labels`, `vars`, `data`, `parent`. Vars: `paused`, `defaults` (inherited by children), `repeat`, `yoyo`, `repeatDelay`, `delay`, `onStart`, `onUpdate`, `onComplete`, `onReverseComplete` (+ `...Params`, `callbackScope`).

**Position parameter:** absolute numbers, `"<"`, `">"`, `"<0.2"`, `"<-0.2"`, `"<+=1"`, `">-0.5"`, `"+=0.5"`, `"-=0.3"`, `"label"`, `"label+=1"`, `"label-=0.4"`, percent of duration (`"-=25%"`). A label that does not exist yet is created at the end of the timeline. `delay` adds to the position.

**Tween vars:** `duration`, `delay`, `ease`, `stagger` (number, function, or `{each, amount, from: "start"|"center"|"edges"|"end"|"random"|index|[rx, ry], grid: "auto"|[rows, cols], axis, ease, repeat, yoyo}`), `repeat` (-1 = infinite), `yoyo`, `repeatDelay`, `immediateRender`, `overwrite` (`true`), `startAt`, `keyframes` (an array of vars, an object `{prop: [values...], easeEach}`, or percentages `{"50%": {...}}`), `onStart`/`onUpdate`/`onComplete`/`onReverseComplete`, `force3D`, `autoRound`, `data`, `id`. Values may be functions `(i, target, targets)`, relative `"+=10"`/`"-=10"`/`"*=2"`, or `"random(a, b, snap)"`.

**Properties:**

| Kind | Examples |
|---|---|
| HTML transforms | `x`, `y` (px or `%`), `z`, `xPercent`, `yPercent`, `scale`, `scaleX`, `scaleY`, `rotation`/`rotate`/`rotationZ`, `rotationX`, `rotationY`, `skewX`, `skewY` (`deg`, `rad`, `turn`), `transformPerspective`, `transformOrigin` (including z) |
| SVG transforms | the same, written to the `transform="matrix(...)"` attribute; `transformOrigin` relative to the bbox, `svgOrigin` absolute |
| CSS | `opacity`, `autoAlpha`, colours (`color`, `backgroundColor`, `borderColor`, `fill`, `stroke`, ...: hex, rgb(a), hsl(a), names), `filter` (`blur`, `brightness`, `drop-shadow`, ...), `clipPath` (`inset`, `circle`, `ellipse`, `polygon`), `boxShadow`, `textShadow`, gradients, `backgroundPosition`, `strokeDashoffset`, sizes and positions in `px`, `%`, `em`, `rem`, `vw`, `vh`, `pt` (converted automatically), `zIndex`, discrete values (`display`, `visibility`, `clipPath: ""`), `clearProps`, `className` |
| CSS variables | `"--colour": "#f00"`, `"--shift": "20px"` |
| Attributes | `attr: { r: 40, cx: 10, d: "M0 0 L10 10", fill: "#f00", "stroke-width": 3 }` |
| JS objects | numbers, numeric strings (`"10px 5em"`), colours, function-style getters/setters, arrays of numbers |

Complex strings are interpolated by position: the i-th number with the i-th number, the i-th colour with the i-th colour; the output shape follows the end value. A `none`/empty start value counts as zero.

**Eases:** `none`/`linear`, `power0`-`power4` (`.in`, `.out`, `.inOut`; aliases `quad`, `cubic`, `quart`, `quint`, `strong`), `sine`, `expo`, `circ`, `back(overshoot)`, `elastic(amplitude, period)`, `bounce`, `steps(n)`, `"cubic-bezier(x1, y1, x2, y2)"`, and your own eases through `registerEase(name, fn)`. A name without a suffix means `.out` (`"power2"` = `"power2.out"`). An unknown ease uses the default ease (`power1.out`).

**Springs and inertia (mgp.motion's own, v2.4, not in GSAP):**
- Eases `"spring.bouncy"` (zeta 0.45), `"spring.snappy"` (zeta 1), `"spring.heavy"` (zeta 1.5), or `"spring(mass, stiffness, damping)"`. Old names: `"pegas.memantul"`, `"pegas.sigap"`, `"pegas.berat"`, `"pegas(massa, kekakuan, redaman)"`. Closed-form spring step response, so a random seek is always exact. The numbers match `MGP.core.SPRINGS` (old `MGP.core.PEGAS`).
- `mgp.motion.spring(name | {mass, stiffness, damping})` -> `{ease, duration, zeta, frequency}`; `duration` = seconds until settled within ±0.5 %. Use it as the tween duration so the timing follows the physics. Old name: `Gerak.pegas`, options `{massa, kekakuan, redaman}`, result key `frekuensi`.
- `mgp.motion.inertia(vars, {amp, freq, decay, tail})` -> new vars: the same tween plus a damped bounce from the arrival speed, `y = end + v * amp * sin(2 pi freq dt) / e^(decay dt)`. `duration` grows by `tail` (default 1 s) and the end value stays exact. Old name: `Gerak.inersia`, option `ekor`. Example: `tl.to(el, mgp.motion.inertia({ x: 600, duration: 0.5, ease: "power2.in" }, { amp: 0.05, freq: 2.5, decay: 5 }))`.
- Tested in `test/test.cjs` section 6 (20 tests: reference formula, 0/1 ends, equality with MGP.core, seek determinism) and the "v2.4 English names" section (English = old names, the elastic end value, the stacked-tween start value with `initFps` 50 and 0).

**Utils:** `clamp`, `mapRange`, `normalize`, `interpolate` (numbers, colours, strings, arrays, objects), `random` (seeded; `random(min, max, snap)`, `random(array)`), `seed`, `shuffle`, `wrap`, `wrapYoyo`, `snap`, `toArray`, `selector`, `distribute`, `getUnit`, `unitize`, `pipe`, `splitColor`. Functions called without their last argument return a function (`clamp(0, 1)`).

## Deliberate differences from GSAP

- Seeks are always deterministic (see Principle 2). In GSAP, tweens that overlap on the same property, or a zero-duration `set` at position 0, can give different results depending on the seek direction; in mgp.motion they do not.
- `tl.set(x, {...}, 0)` also applies on the first seek to t = 0 (GSAP only applies it after the playhead has moved).
- `force3D` defaults to `false` (2D transforms unless there is a `z`, a 3D rotation, or `force3D: true`): pixels do not depend on GPU layers.
- Randomness uses its own seeded generator; the random sequence is not the same as GSAP's.
- An SVG `transform` that exists before the animation is parsed in its own way; the result can differ from GSAP for elements that already have `transform="..."` and are then scaled.
- Not available: plugins (ScrollTrigger, MotionPath, MorphSVG, Draggable, SplitText, Flip, path-shaped CustomEase), `smoothOrigin`, `overwrite: "auto"`, `yoyoEase`, `modifiers`, `snap` as vars.

## Tests

```bash
node lib/motion/test/test.cjs                          # no dependencies: eases, position, stagger, determinism, scenarios
node lib/motion/test/compare.cjs <gsap/dist/gsap.js>   # optional: direct comparison with real GSAP (--simpan writes test/expected.json)
python lib/motion/test/parity.py --gsap <gsap/dist> --keluar out/   # pixel parity (playwright, pillow, numpy)
```

Old file names: `uji/uji.cjs`, `uji/banding.cjs`, `uji/paritas.py`, `uji/rujukan.json`, `uji/harapan.json`, `uji/skenario.cjs`. `test/reference.json` and `test/expected.json` hold GSAP 3.15.1 output numbers from black-box tests (not code). `parity.py` renders compositions with GSAP and with mgp.motion at several t, then reports the maximum and mean pixel difference. Note: its default file list still points at the old folders (`render/contoh`, `render/studio/contoh`, `blok/**/contoh.html`; now `render/examples`, `render/studio/examples`, `blocks/**/example.html`) and it still loads the engine as `lib/motion/gerak.js`, so it needs updating before use.
