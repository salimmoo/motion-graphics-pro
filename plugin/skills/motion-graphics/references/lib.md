# Reference: JS module library (`lib/`)

Part of the `motion-graphics` skill. Read when: using `MGP.*` modules in an HTML composition and rendering with mgp.

Moved verbatim from SKILL.md v2.3 (13. Module library (`lib/`) (Version 2.2, 05-11-2026)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 13. Module library (`lib/`) (Version 2.2, 05-11-2026)

This skill's `lib/` folder holds ready-to-use JavaScript motion engines that apply chapters 2-12 on a canvas (or the DOM). Every module is deterministic and driven by time: the frame at second t is always the same, however many times and from whichever direction it is seeked; no unseeded `Math.random`, no `requestAnimationFrame`, no external assets. The options of each module are in `lib/README.md`; one example per module is in `lib/examples/` (runs directly from `file://`).

13.1 **Module list and when to use each.**

| Module (`MGP.<name>`) | File | Use for | Chapter |
|---|---|---|---|
| `core` | `core/mgp-core.js` | Always loaded first: seeded rng, noise/boil, easing, closed-form springs, keyframes, Catmull-Rom, 3D camera + projection, colour, `setup` / `defineModule` / `timeline` / `expose` | all |
| `figure3d`, `gait` | `figure3d.js` | 3D human character in the 7.5-head canon, walking from gait data or standing alive; `gait` = side-view stride (heel, flat foot, toe, swing) | 4.3, 12.1 |
| `shadow3d` | `shadow3d.js` | Character shadow from the 3D pose and a moving sun, one layer + contact shadow | 5.3 |
| `scenePark3d` | `scene-park3d.js` | 3D park, one-take camera orbit, haze, DOF, light rays, grain | 5.2, 7 |
| `sceneTanker` | `scene-tanker.js` | One-take tanker berthing, camera presets; `lib.state(t)` for a data panel | 12.2 |
| `characterStyles` | `character-styles.js` | One character in vector, pixel art or origami style (needs `figure3d.js`; the "crane" action needs `origami-fold.js`) | 12.5 |
| `origamiFold` | `origami-fold.js` | Folding crane from a flat-fold simulation; `lib.foldPolygon` for your own folds | 12.5 |
| `vectorKit` | `vector-kit.js` | Capsule vector character kit: 4 views and turnaround, 8 expressions, 12 mouths, 8 gestures, proportion modes | 3; vector-character 5.1 (`vector-character/references/rig.md`), 18 |
| `paperFoldTransition` | `paper-fold-transition.js` | Origami/accordion fold transition between pictures, folding DOM elements, portal | 7 |
| `causalTransitions` | `causal-transitions.js` | Transitions by their reason: wipe, page, shut, iris, slide, bridge, split, cut | 7 |
| `chibiObject` | `chibi-object.js` | Objects with faces: keyed moods, mood-change takes, jumps, steam, emotes | 12.3 |
| `lipsync` | `lipsync.js` | Indonesian text, phonemes or timestamped words into visemes at 12 drawings per second; vector presenter or your own face picture; karaoke captions | 12.4 |
| `routeMap` | `route-map.js` | A route growing from its tip, stopping at cities, the vehicle facing the tangent; cardboard, 3d and native styles (real geography through your own `land`/`tiles`) | 7 |
| `kineticType` | `kinetic-type.js` | Text from timed beats (card, rise, pop, slide, mask, cascade, typewriter, karaoke, zoom, wipe); `captions(words)` from per-word VO timing | 6 |
| `spring` | `spring.js` | `fn`: bezier, spring, bounce, follower/chain/lag, squash, anticipate; spring graph view and principle panels | 2, 3.1 |
| `particlesFlight` | `particles-flight.js` | Scheduled light particles: bursts, streams, trails, depth flights | 7.1 |
| `constellationLines` | `constellation-lines.js` | Night sky, constellations with glowing curved lines, travelling sparks, labels | 7.1 |
| `packs` | `pack-scenes/` | 104 motion packs (motion-graphics-pro skill `references/motion-packs.md`, old chapter 17.2) drawn straight from their id | - |

Rules of use: pick a module when its job fits the brief; the rules of chapter 00 still apply (check every frame, measure the motion, regression sheet, judge in the scene frame). Palette, fonts, character size and timing come from the brief through options (`pal`, `palette`, `font`, `colors`, ...), not from the module defaults. The modules do not replace the Python scripts of chapter 11: Python is for measuring, checking and rendering PNGs; `lib/` is for HTML compositions.

13.2 **Composition contract.**
- Load `lib/dist/mgp.js` (every module, one `<script>` tag, runs from `file://`) or `core/mgp-core.js` + module files; `lib/dist/mgp-packs.js` for the packs only. ES module: `import MGP from "./lib/index.mjs"` (needs an http server). The timeline uses mgp.motion (`lib/motion/motion.js`, the package's own engine; main API `mgp.motion`, `gsap` is a compatibility alias; real GSAP is not needed).
- `MGP.<module>.create(target, options)` (target = `<canvas>`, a container, or a selector) returns an instance with `draw(t)` / `seek(t)`, `duration`, `ready` (a Promise, for example waiting for fonts), and `timeline()` (a paused mgp.motion timeline, `duration` long). `MGP.<module>.render(ctx, t, options)` draws one frame into an existing canvas, to combine several modules on one canvas. `MGP.<module>.lib` = reusable inner functions.
- `MGP.core.expose(inst)` sets `window.__duration`, `window.__seek(t)`, `window.__timeline`, `window.__timelines["main"]` and `window.__ready`. The renderer waits for `__ready`, then calls `__seek(t)` per frame.
- Several modules in one composition: `MGP.core.expose({ duration: 12, ready: Promise.all([a.ready, b.ready]), seek(t) { a.seek(t); b.seek(t); }, timeline() { return MGP.core.timeline(this); } })`.
- A fixed-size stage (`#stage` with `data-composition-id="main"`; options `width`/`height`, default 1280 x 720; `dpr`, `fit`, `loop`, `seed`). Write `window.__fps = 24` (or `data-fps`) so the renderer does not use its default of 30.
- New module: `MGP.core.defineModule(name, { size, duration, defaults, setup(S), render(ctx, t, S) })` (example `examples/core.html`), then `node lib/build.js`: it rewrites `dist/` and `index.mjs` and tests that every file loads. JS files are ASCII only (`\uXXXX` for special characters).
- No state may build up between frames: everything is computed from t (particles, springs, camera), so backward seeks and parallel renders stay correct.

13.3 **Rendering with mgp.** mgp (motion-graphics-pro skill, folder `render/`; needs Node.js 22+, ffmpeg, Chrome or Edge) uses `window.__seek(t)` as its first driver, so `lib/` compositions render directly:

```bash
# no npm install: mgp brings its own CDP client, fonts and mgp.motion
node <motion-graphics-pro folder>/render/bin/mgp.mjs check <motion-graphics folder>/lib/examples/figure3d.html
node <motion-graphics-pro folder>/render/bin/mgp.mjs contact scene.html --n 12 -o review/contact.png
node <motion-graphics-pro folder>/render/bin/mgp.mjs render scene.html --fps 24 --workers 4 -o out/scene.mp4
```

- Copy `lib/dist/mgp.js` into the project folder (for example `assets/js/`): mgp only serves files under the composition folder (`--root <folder>` changes that).
- `mgp check` tests determinism (three points seeked, then seeked again from elsewhere; the hashes must match). A failure = a timer, state that builds up between frames, or a fetch.
- Together with mgp composition scenes (motion-graphics-pro T7, `references/template.md`): the module draws into a `<canvas>` inside the scene's `#root` and is called from the scene's `draw(t)` with local time; still one timeline per composition.
- Motion packs from the brief: `MGP.core.expose(MGP.packs.create("#stage", "KIN-02", { lines: [{ j: "Title", c: "Caption" }] }))`, or one frame on your own canvas with `MGP.packs.render(id, ctx, t, { width, height, ar: "9:16", lines: [...] })` (`render` accepts the `create` content options `ar`, `lines`, `pal`, `font`, `scene`/`variant`; reuse one options object across frames; `lib/README.md`, Motion packs). `examples/packs-gallery.html` shows all 104 packs.
- Python renders (`render.py`) and mgp renders can be mixed: a scene from Python as a PNG sequence or video, then loaded in the composition as an `<img>`/`<video>` that mgp seeks per frame.
