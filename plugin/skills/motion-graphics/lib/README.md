# MGP motion library (`lib/`)

A set of ready-to-use motion engines for video compositions: 3D characters that walk, shadows from poses, a one-take 3D park and harbour, characters in vector/pixel/origami style, a folding crane, objects with faces, lip-sync, route maps, transitions, kinetic typography, springs, particles, constellations, and 104 motion pack scenes. Everything is drawn in code on a canvas (or the DOM), with no external assets.

Every module is **deterministic and driven by time**: the frame at second `t` is always the same, however many times and from whichever direction it is seeked. No unseeded `Math.random`, no `requestAnimationFrame`, no buttons or sliders. So the modules can be used in mgp compositions (HTML + mgp.motion timeline; HyperFrames-compatible format), in any frame-by-frame renderer, or on a normal page.

Old Indonesian names (modules, options, values, functions) still work as aliases; this README uses the new English names and gives the old name where it helps.

## Quick start

```html
<div id="stage"></div>
<script src="lib/motion/motion.js"></script>   <!-- mgp.motion: the package's timeline engine, GSAP-compatible API -->
<script src="lib/core/mgp-core.js"></script>
<script src="lib/figure3d.js"></script>
<script>
  const figure = MGP.figure3d.create("#stage", { action: "walk", view: 45 });
  MGP.core.expose(figure);   // window.__duration, __seek(t), __timeline, __timelines.main, __ready
</script>
```

- **One file only:** `lib/dist/mgp.js` contains every module (or `lib/dist/mgp-packs.js` for the motion packs only; old name `dist/mgp-paket.js`). One `<script>` tag is enough, and it runs from `file://`.
- **ES module:** `import MGP, { figure3d, packs } from "./lib/index.mjs";` Browsers block ES modules from `file://`, so use an http server.
- **Timeline: mgp.motion.** `lib/motion/motion.js` is the package's own animation engine (old name Gerak, in `lib/gerak/`; GSAP 3-compatible API, installed as `window.gsap` when real GSAP is not loaded). See `lib/motion/README.md`. Without mgp.motion or GSAP, `timeline()` returns a small stand-in with `duration()`, `seek()` and `progress()`; real GSAP can still be used when you load it yourself.
- **Rebuild the bundles** after editing a source file: `node lib/build.js`. This rewrites `dist/` and `index.mjs`, and tests that every file loads.

## Shared contract

| Part | Meaning |
|---|---|
| `MGP.<module>.create(target, options)` | `target` = a `<canvas>`, a container element (a canvas is added inside it), or a CSS selector |
| `inst.draw(t)` / `inst.seek(t)` | Draws the full frame at second `t` |
| `inst.timeline()` | A paused mgp.motion/GSAP timeline, `inst.duration` long |
| `inst.duration`, `inst.ready` | Duration in seconds; `ready` = a Promise, for example waiting for fonts |
| `MGP.<module>.render(ctx, t, options)` | Draws one frame into an existing canvas, to combine several modules on one canvas |
| `MGP.<module>.lib` | Inner functions that can be reused (poses, meshes, curves, and more) |
| Common options | `width`, `height` (logical size, default 1280x720), `dpr`, `fit` (canvas fills the container), `loop`, `seed` |

`MGP.core.expose(inst)` sets `window.__duration`, `window.__seek(t)`, `window.__timeline`, `window.__timelines["main"]` and `window.__ready`. A frame renderer (mgp, or any renderer that reads the same contract) only has to wait for `__ready`, then call `__seek(t)` per frame.

For several modules in one composition, build your own object and expose it:

```js
const a = MGP.scenePark3d.create("#bg", {}), b = MGP.kineticType.create("#text", { beats: [...] });
MGP.core.expose({ duration: 12, ready: Promise.all([a.ready, b.ready]),
  seek(t) { a.seek(t); b.seek(t); }, timeline() { return MGP.core.timeline(this); } });
```

## `core/mgp-core.js`, shared helpers

| Group | Functions |
|---|---|
| Random and noise | `rng(seed)` (mulberry32), `hash`, `hashStr`, `noise1`, `wob` (hand wobble, boil) |
| Maths | `clamp`, `lerp`, `seg`, `win`, `smooth01`, `stepT` (on twos = 12 fps), `ease.*`, `E(t,a,b,ease)`, `spring`, `springAt` (closed-form spring), `key` (keyframes) |
| Curves | `catmull`, `catmullPts`, `catmullPath` (centripetal Catmull-Rom), `polyLen`, `polyAt` (point + angle at a length fraction) |
| 3D camera | `cam`, `camOrbit`, `camC`, `scr`, `project`, `clipNear`, `polyScr`, `horizonY`, `sunDir`, vectors `dot3`, `cross3`, `norm3`, and so on |
| Colour | `rgb`, `hex`, `mix`, `rgba`, `shade`, `lum` |
| Canvas and modules | `setup` (canvas + DPR), `offscreen`, `fontsReady` (Google Fonts), `defineModule`, `timeline`, `expose` |
| Physical springs (v2.4) | `SPRINGS` (presets `bouncy` ζ 0.45 · `snappy` ζ 1 · `heavy` ζ 1.5, from mass/stiffness/damping), `springInfo`, `springPhys(t, preset, {from, to, v0})`, `springState`, `springDuration`, `springEase`. The numbers match the mgp.motion ease `"spring.<name>"`. Old names: `PEGAS` (`memantul`/`sigap`/`berat`), `pegasInfo`, `pegas(t, preset, {dari, ke, v0})`, `pegasKeadaan`, `pegasDurasi`, `pegasEase` |
| Motion principles (v2.4) | `inertia(keys or function, t, {amp, freq, decay})` (bounce from the arrival speed), `keyValue`, `delay` / `delayChain` (follow-through per index), `stretch` / `stretch3` / `stretchDirection` / `stretchVelocity` / `volumeError` (squash with constant volume). Old names: `inersia`, `nilaiKunci`, `tunda` / `tundaRantai`, `regang` / `regang3` / `regangArah` / `regangKecepatan` / `galatVolume` |
| Lines and limbs (v2.4) | `scaleNow`, `fixedWidth` (constant stroke while scaled), `rubber` (rubberhose: arc of constant length), `trimEnds`, `strokeBottom`. Old names: `skalaKini`, `lebarTetap`, `karet`, `potongUjung`, `bawahGaris` |
| 3D rotation (v2.4) | `quatAxis`, `quatEuler`, `quatMul`, `quatRotate`, `quatNorm`, `slerp`, `slerpDirection` (camera direction along a great circle). Old names: `quatSumbu`, `quatKali`, `quatPutar`, `slerpArah` |

A new module is made with `MGP.core.defineModule(name, { size, duration, defaults, setup(S), render(ctx, t, S) })`; English option names and values can be mapped with `aliases` and `valueAliases`. An example is in `examples/core.html`.

The principles, when to use them, and QC reference numbers for every v2.4 feature are in [`../references/advanced-principles.md`](../references/advanced-principles.md).

## Module list

Chapter references use the chapter numbers of the old SKILL.md files: **MG** = the motion-graphics skill, **MGP** = the motion-graphics-pro skill, **VC** = the vector-character skill. Since v2.4 those chapters live in each skill's `references/*.md`; the chapter-to-file map is in the References section of each SKILL.md.

### Characters and 3D space

**`figure3d.js`: 3D figure (`MGP.figure3d`) + side-view gait engine (`MGP.gait`)**

A 3D human figure with classic 7.5-head proportions, given volume, soft shadows and a thin outline. The figure can walk with steps computed from real human gait data (the feet stay planted on the floor), or stand at ease while breathing and turning its head.

- `figure3d` options:
  - `action` ("walk"/"stand")
  - `view`: camera angle relative to the facing direction; a number, keyframes `[[t, degrees]]`, or a function
  - `spin` (turntable, degrees/second), `dist`, `pitch`, `scale`
  - `pal` (skin, hair, top/shirt, pants/trousers, shoe/shoes, and more)
  - `step`, `cadence`
  - `sunAz`/`sunEl`, `shadow`, `shadowOpacity`, `shadowSoft`
  - `sky`, `ground`, `tiles`, `bg`
- `MGP.gait`: side view. Heel strike, flat foot, heel off, toe off, then the leg swings. The ground slides as fast as the stride. Options: `step`, `cadence`, `speed`, `bones`, `prints`, `timeline`, `pal`.
- `MGP.figure3d.lib` contains `figWalk`, `figStand`, `figMeasure`, `figPrims`, `drawFigure`, `shadowShapes`, `contactShapes`, `drawMesh`, `ik`, `capPts`, and more. Other modules use it.
- Used for: MG chapter 4.3 (walk cycle from gait data), 12.1 (3D figure), one-take animatics.

```js
MGP.core.expose(MGP.figure3d.create("#stage", { action: "walk", view: [[0, 45], [8, 135]], pal: { top: "#2f7d6b" } }));
```

**`shadow3d.js`: shadows from a 3D pose (`MGP.shadow3d`)**

The figure's shadow is computed from the body pose and the sun position. The shadow steps along, lengthens when the sun is low, and turns as the sun moves. All shadows are merged into one layer so they do not stack darker, plus a thin contact shadow under the feet.

- Options: `sunAz`, `sunEl` (number or keyframes), `view`, `mode` ("pose"/"fixed"), `shadowColor`, `shadowOpacity`, `shadowSoft`, `contact`, `planters`, `compass`.
- Used for: MG chapter 5.3 (shadows must come from the 3D pose).

```js
MGP.core.expose(MGP.shadow3d.create("#stage", { sunAz: [[0, 200], [10, 320]], sunEl: 40 }));
```

**`scene-park3d.js`: one-take 3D park (`MGP.scenePark3d`)**

A park in real 3D space: a ring of mountains, hills, rows of trees, grass, a boardwalk, a pond, lamps, shrubs and flowers, under an afternoon sun. The camera circles the figure without cuts. Distant objects are hazy, with depth of field, light rays, vignette and grain.

- Options: `action` ("stand"/"walk"), `az0` + `orbitSpeed` or `orbit` (keyframes/function), `dist`, `breathe`, `sunAz`/`sunEl`, `seed`, `mtSeed`, counts of trees/shrubs/flowers/grass, `colors`, `dof`, `haze`, `rays`, `vignette`, `grain`.
- Used for: MG chapter 5.2 (3D background for a one-take orbit).

```js
MGP.core.expose(MGP.scenePark3d.create("#stage", { action: "walk", orbitSpeed: 15 }));
```

**`scene-tanker.js`: tanker berthing (`MGP.sceneTanker`)**

One complete scene without cuts: the tanker arrives, slows and straightens, tugs push until the ship rests against the fenders, mooring lines are made fast one by one, then the loading arms connect.

- Options:
  - `duration` (46 s) + `hold`
  - `beats {approach, turn, push, moor, arms}`
  - `camera` ("air", "sea", "bow", "land", or `{az, el, d}`; old names "udara", "laut", "ujung", "darat"), `cameraKeys`
  - `sky` ("day"/"dusk"; old "siang"/"senja")
  - colours `palette`, `ship`, `tug`, `jetty`; `sun`, `seed`
  - `labels`, `caption`
- `lib.state(t)` gives the phase, speed (knots), distance to the jetty and line status, for your own data panel.
- v2.4: `cameraInterp: "slerp"` interpolates the camera direction along a great circle (quaternion) instead of separate azimuth/elevation; the default stays `"euler"` (old pixels unchanged). Elevation is limited to 84°.
- Used for: MG chapter 12.2 (berthing scene recipe).

```js
MGP.core.expose(MGP.sceneTanker.create("#stage", { sky: "dusk", cameraKeys: [[0, "sea"], [25, "air"], [42, "bow"]] }));
```

### Character styles and paper

**`character-styles.js`: one character, three styles (`MGP.characterStyles`)**

The same character drawn as ink-lined vector, pixel art (light, base and shadow tones per material; stepped motion), or origami (every body part = one sheet of paper folded once). The walk uses the same gait engine as the 3D figure.

- Options: `style` ("vector"/"pixel"/"origami"), `action` ("walk", "idle", "wave", "sheet", "crane"), `palette`, `pixelRamps`, `scale`, `fps` (default 24/8/12), `grid`, `unfoldAt`, `bg`.
- v2.4, origami style: the new default `origamiStyle: "rigid"` (rigid folding: each part one paper strip with a continuous mountain crease down the middle, knees/elbows sharing mitre edges without gaps, every facet lit from one light direction, a paper backdrop without random flecks). The v2.3 look is still available with `origamiStyle: "old"`. Old option name `origamiGaya` with values `"kaku"`/`"lama"`. Example: `examples/origami-character.html` (`?gaya=lama` for the comparison).
- v2.4, vector style: `limbs: "rubber"` (rubberhose: one arc of constant length from hip to ankle and shoulder to wrist; the leg line never drops below the sole; old `anggota: "karet"`) and `strokeFixed` (px; the ink stays that thick on screen at any scale; old `strokeTetap`).
- Needs `figure3d.js`. The "crane" action uses `origami-fold.js`.
- Used for: MG chapter 12.5, MGP templates T14 (pixel art) and T15 (origami), packs TRN-01 to TRN-05.

```js
MGP.core.expose(MGP.characterStyles.create("#stage", { style: "pixel", action: "walk" }));
```

**`origami-fold.js`: folding crane (`MGP.origamiFold`)**

A paper crane folded from one square sheet with a real flat-fold simulation. Each step cuts through all layers along the crease line, then turns the paper flap 180 degrees. When finished, the crane holds for a moment, then unfolds again.

- Options: colours `front`/`back`, `light`, `ambient`, `size`, `stepFold`, `stepHold`, `endHold`, `duration` (scales all timing), `crease` (crease lines), `unfold`, `bg`.
- Your own model: `steps`/`initial`.
- `lib.foldPolygon(poly, a, b, angle)` folds any shape along a line. `lib.makeModel` builds a step-by-step fold model.
- v2.4: `MGP.origamiFold.validatePattern({titik, lipatan: [[i, j, "M"|"V"|"B"]]})` (old name `validasiPola`; the input keys `titik` = vertices and `lipatan` = creases keep their names) checks a crease pattern (Maekawa |M−V| = 2, Kawasaki 180°, even degree = two-colourable; the paper edge is detected automatically from the convex hull) and gives warnings per vertex; `lib.celahEngsel` measures the hinge gap.
- Used for: MG chapter 12.5, MGP T15, pack TRN-03.

```js
MGP.core.expose(MGP.origamiFold.create("#stage", { front: "#2f6fb0", crease: true }));
```

**`vector-kit.js`: vector character kit (`MGP.vectorKit`)**

A character assembled from capsule pieces that meet cleanly at the joints, re-assembled for every view (front, 3/4, side, back). The kit has eight expressions, twelve lip-sync mouth shapes, eight hand gestures, two proportion modes and three layer styles.

- Options: `view` or `turn` (turnaround), `expr`/`exprCycle`, `lipsync`/`vis`, `gest`, `mode` ("kit"/"real"), `style` ("flat"/"cut"/"gray"), `explode`, `landmarks`, `palette`, `margin`.
- Gesture ids stay in Indonesian: `rileks`, `jempol`, `tunjuk`, `stop`, `kepal`, `dadah` (wave), `cangkir`, `ponsel`.
- v2.4: `expr` may be a spec object or a function `(t) => spec` (e.g. `MGP.face.toVectorKit(AU)`; old `MGP.wajah.keVectorKit`), `vis` may be a mouth spec object, and `strokeFixed` (px; old `strokeTetap`) keeps every line of the kit constant while scaled.
- `lib.drawMouth`, `lib.drawHand`, `lib.drawKit` can be used in other modules.
- Used for: VC (character kit, turnaround), MG chapter 3 (rig and hand/mouth swap sets).

```js
MGP.core.expose(MGP.vectorKit.create("#stage", { view: 45, gest: "dadah", lipsync: true }));
```

**`paper-fold-transition.js`: paper-fold transition and portal (`MGP.paperFoldTransition`)**

One picture changes into another through an origami fold. The old sheet folds twice, lies down and disappears; the new sheet stands up and opens. The back of the paper is fibrous kraft, with a soft shadow under the fold.

- `create(canvas, options)`:
  - `from`/`to`: an image, a canvas, or a function `(ctx, t, w, h)`
  - `mode` ("origami"/"accordion"), `panels`, `axis`, `direction`, `vertical`
  - `start`, `foldDuration`, `hold`
  - `paperBack`, `fibre`, `shadow`, `perspective`
- `createDOM(el, options)`: folds any HTML element with CSS 3D transforms.
- v2.4: `rigid: true` (old `kaku: true`) = sequential rigid folding (the second crease waits until the first is flat); `lib.celahKaku(pose)` measures the hinge gap between panels.
- `portal(ctx, t, options)`: an arched, round, elliptical, square or polygonal hole; the camera passes through into the scene behind it. Options: `shape`, `hole`, `zoom`, `keys`, `flash`, `motes`.
- Used for: theme or chapter change transitions (MG chapter 7, MGP chapter 8).

```js
MGP.core.expose(MGP.paperFoldTransition.create("#stage", { from: cardA, to: cardB, background: "#cfe0ee" }));
```

### Faces and voice

**`chibi-object.js`: objects with faces (`MGP.chibiObject`)**

Brings any object to life with a chibi face: a coffee cup, a cardboard box, a phone, a plant pot, a ball, or your own picture. The mood (normal, happy, sad, surprised, angry) changes at the given seconds. The eyes move first, the body squashes then bounces. There are also blinks, jumps, tiny hands, steam and emotes.

- Options:
  - `body`: "cup", "box", "phone", "pot", "ball", a function, or an object `{draw, face, arms}`
  - `image` + `imageBox`, `face {x, y, scale, tilt}`
  - `moods [[t, name], ...]` (mood names stay in Indonesian: `normal`, `senang` happy, `sedih` sad, `kaget` surprised, `marah` angry, plus any in `faces`), `blend`, `jumps`
  - `fps` (12), `steam`, `emote`, `blink`, `breathe`, `wobble`
  - `scene` ("cafe"/"plain"/"none"), `palette`, `faces` (your own expressions)
- Used for: MG chapter 12.3, MGP chapters 2.1 and 6 (object personification, face kit stickers).

```js
MGP.core.expose(MGP.chibiObject.create("#stage", { body: "cup", moods: [[0, "normal"], [2, "senang"], [4.5, "kaget"]], jumps: [6] }));
```

**`lipsync.js`: lip-sync (`MGP.lipsync`)**

Turns an Indonesian sentence, or the output of a forced aligner (timestamped phonemes or words), into a sequence of mouth shapes at 12 drawings per second.

- **Data:** `MGP.lipsync.visemes(text | [{t0, t1, phone}] | [{start, end, word}])` → track `[[t, viseme, weight], ...]`. `MGP.lipsync.at(track, t)` → mouth parameters (`open`, `wide`, `round`, `teeth`, `tongue`, ...).
- **Face:**
  - `face: "presenter"`: the built-in vector presenter.
  - `face: "image"`: your own face picture. The mouth is drawn at `mouth {x, y, width, angle}` (image pixels), plus a skin-coloured `patch` to cover the original mouth and optional blinking `eyes`.
- **Other options:** `drawMouth` (your own function, or "vectorKit"), `captions` (karaoke subtitles), `lead`, `tail`, `endSmile`, `headMotion`, lip, teeth and tongue colours in `palette`.
- **FACS expressions (v2.4, needs `face.js`):** `expression` (old `ekspresi`: an emotion name, an AU object, `[[t, name|AU], ...]`, or a function) moves the presenter's brows, lids and lip corners; the jaw is shared with the visemes (max). Without this option the drawing is exactly the same as before.
- **Assets:** there is no built-in face from a photo. The example uses a portrait drawn in code.
- **Used for:** MG chapter 12.4 (narrator face), MGP chapter 6.8 (visemes from per-letter timing).

```js
MGP.core.expose(MGP.lipsync.create("#stage", { text: "Halo, apa kabar?", captions: true }));
const track = MGP.lipsync.visemes("Halo semua");
```

**`sfx/sfx.js`: procedural sound effects (`MGP.sfx`)**

Eighteen sound effects synthesised in code, without samples: whoosh, paper swoosh, fold, tear, pop, click, tap, ding, riser, impact, glitch, typewriter, coin, camera shutter, waves, wind, crowd murmur and notification. The sound is determined by the preset, the parameters and the seed, so it is always the same every time it is made.

- `MGP.sfx.synth(name, {duration, seed, gain, pan, ...params})` → `{sr, ch: [L, R]}` (48 kHz). `MGP.sfx.list()` lists the presets and their parameters. Old names: `buat`, `daftar`.
- `MGP.sfx.mix(cues)` (old `campur`) assembles many cues `[{t, sfx, seed, duration, gain, pan, param}]` into one track; `MGP.sfx.wav(sound)` → WAV.
- English preset names (`paper-swoosh`, `fold`, `tear`, `click`, `tap`, `type`, `coin`, `camera`, `waves`, `wind`, `crowd`, `notification`) and parameter names (`pitch`, `from`, `to`, ...) are aliases of the original keys, which also seed the noise, so the sound does not change.
- In the browser: `MGP.sfx.offline(cues)` mixes through `OfflineAudioContext` → `AudioBuffer`. In Node: `require("lib/sfx/sfx.js")`, or directly `mgp sfx` (see the mgp README, `motion-graphics-pro/render/README.md`). The samples are identical in both places.
- This file lives in a subfolder, so it is not in `dist/mgp.js`; load it with its own `<script>` tag.

```js
const cues = [{ t: 0.5, sfx: "whoosh" }, { t: 1.2, sfx: "pop", param: { pitch: 520 } }];
MGP.sfx.offline(cues).then((buf) => { /* AudioBuffer 48 kHz */ });
```

### Maps, transitions, text

**`route-map.js`: route map in three styles (`MGP.routeMap`) + `map.js`: real geography (`MGP.map`, old `peta.js` / `MGP.peta`)**

The route line grows from its tip, pauses briefly at every city, the vehicle faces the route heading, pins light up, paper labels pop in, and the camera follows gently.

- **Style:** "cardboard" (textured paper; old "karton"), "3d" (tilted diorama with thick sides), "native" (clean atlas; old "asli"). All three also work with real geography.
- **Route:** `route` as [longitude, latitude] or pixels (`coords: "map"`), with `stops [{i, name, sub, side}]`. A stop may use a Natural Earth city name: `{ kota: "Venesia" }` fills in the position and the name (the Indonesian name when available; the stop key `kota` keeps its name); without `i`, the nearest route point is used.
- **Real land (default for longitude/latitude routes):** load `map.js` and the data files in `map-data/`, and the coastlines, lakes and country borders come from Natural Earth. Without the data files, the map falls back to random land.
  - `landSource`: "real" (default when the data is loaded) or "procedural" (land from a seed, as before; also used when `landGen` or `tiles` is given). Old option `darat: "nyata"|"acak"`.
  - `projection`: "mercator" (default), "equalEarth" (equal area, good for world maps), "ortho" (globe). `center [lon, lat]` sets the projection centre (default: the middle of the route). `fit: "world"` fits the whole world into `fitBox`, not just the route (default `fit: "route"`). Old names `proyeksi`, `pusat`, `"dunia"`/`"rute"`.
  - `detail`: "auto" (1:10m tiles are used when the map is close enough), "50m", or "10m".
  - `coastline` (true), `lakes` (true), `countryBorders` (country borders; by default only for the "native" style), `graticule` (longitude-latitude lines; "native" always uses it), `countries: ["IDN"]` (highlight countries, needs `world-50m-countries.js`). Old names `garisPantai`, `danau`, `batasNegara`, `negara`.
  - `cities`: `true` (the largest visible cities, not overlapping, at most `maxCities` 10), a number (maximum count), or a list of names `["Ambon", "Kairo"]`. `lang: "id"` uses the Indonesian names from Natural Earth (Venesia, Kairo, Lisboa); "en" uses the original names. `citySize` 12. Old names `kota`, `kotaMaks`, `bahasa`, `kotaSize`.
- **Other land:** `landGen {seed, ...}` (procedural), `land` polygons, or your own `tiles` image. (`land` takes polygons and `borders` polylines; the land mode is `landSource` and the country-border switch is `countryBorders`, so the two never clash.)
- **Other options:** `vehicle` ("boat"/"chevron"/"dot"/"plane"/a function), `legDur`, `stopHold`, `follow`, `zoom`/`zoomKeys`, `tilt`, `spin`, `palette` (new colours: `outside`, `graticule`, `highlight`, `cityDot`, `cityInk`), `fps` (12), `bakeScale` (by default automatic from the zoom).
- **Used for:** MGP chapter 9 (maps and routes), packs DOK-03 and DAT.

```html
<script src="lib/core/mgp-core.js"></script>
<script src="lib/map-data/world-50m.js"></script>          <!-- required for real land -->
<script src="lib/map-data/southeast-asia-10m.js"></script>  <!-- optional: 1:10m detail -->
<script src="lib/map.js"></script>
<script src="lib/route-map.js"></script>
```

```js
MGP.core.expose(MGP.routeMap.create("#stage", { style: "cardboard", cities: true,
  route: [[106.88, -6.10], [108.35, -6.0], [110.78, -6.2], [112.72, -7.1]],
  stops: [{ i: 0, kota: "Jakarta", sub: "Tanjung Priok" }, { i: 3, kota: "Surabaya" }] }));
// random land as in the old version, route in pixels:
MGP.routeMap.create("#stage", { coords: "map", route: [[200, 700], [600, 500], [1400, 300]], stops: [{ i: 0, name: "Gudang" }, { i: 2, name: "Pelabuhan" }] });
```

**Map data (`map-data/`)**

| File (old name) | Content | Size |
|---|---|---|
| `world-50m.js` (`dunia-50m.js`) | land, lakes, country borders at 1:50m for the whole world, 1,130 cities | 263 KB |
| `world-50m-countries.js` (`dunia-50m-negara.js`) | polygons of 236 countries at 1:50m (for `countries`) | 138 KB |
| `southeast-asia-10m.js` (`asia-tenggara-10m.js`) | 1:10m tile, 92-142 E, 13 S-22 N: land, coastline, lakes, borders, about 870 cities | 246 KB |
| `europe-mediterranean-10m.js` (`eropa-mediterania-10m.js`) | 1:10m tile, 12 W-45 E, 28-60 N (Europe, Mediterranean, Black Sea): land, coastline, lakes, borders, 1,187 cities | 304 KB |

A 1:10m tile replaces the 1:50m data inside its box, so the coasts of the Indonesian archipelago or the Adriatic stay detailed when the camera comes close, while intercontinental routes (for example Maluku to Venice) use the world data. The data is simplified with Douglas-Peucker, quantised to a 0.005 degree grid (world) or 0.001 degree (tiles), then encoded as integer differences. Rebuild from Natural Earth GeoJSON: `node lib/map-data/build-map.mjs <geojson-folder>` (old name `bangun-peta.mjs`).

`MGP.map` can also be used on its own on your canvas: `projection(name, {lon0, lat0})`, `prepare({proj, tf, box, pxPerDeg})` (land rings, coastlines, lakes, borders, graticule and cities in pixels), `cities("Ambon")`, `countries("IDN")`, `load()`, `has()`, `sets()`. Old names: `proyeksi`, `siapkan`, `kota`, `negara`, `muat`, `ada`, `set`.

**`causal-transitions.js`: transitions with a cause (`MGP.causalTransitions`)**

Transitions between two scenes, chosen by their reason:

- `wipe`: torn paper, a change of place
- `page`: turning a page, time passing
- `shut`: closing shutters, a change of chapter
- `iris`: focus on one point
- `slide`: sliding, continuity
- `bridge`: an object that bridges two locations
- `split`: a torn split, a broken meaning
- `cut`: a straight cut, an impact
- `fade` is available, but full-screen fades are better avoided

Options: `type`, `from`/`to` (draw function, image, or colour), `at`, `duration`, `focus`, `carry` (bridge object), `bars`, `paper`, `seed`. `frame(ctx, type, u, drawA, drawB)` draws a given progress.

Used for: MG chapter 7, MGP chapter 8 (transitions and set changes).

```js
MGP.core.expose(MGP.causalTransitions.create("#stage", { type: "iris", at: 1, from: (ctx, t, S) => village(ctx, S), to: (ctx, t, S) => house(ctx, S) }));
```

**`kinetic-type.js`: kinetic typography (`MGP.kineticType`)**

Text moves from a list of timed beats `beats: [{t, dur, text, preset}]`. Keywords are marked `*star*`.

- Presets: "card" (paper card, keyword highlighted), "rise", "pop", "slide", "mask", "cascade", "typewriter", "karaoke", "zoom", "wipe".
- Exit: "fade", "up", "none".
- `MGP.kineticType.captions(words)` turns per-word VO timing into on-screen text.
- Options: `font`, `serif`, `size`, `weight`, `color`, `keyColor`, `highlight`, `wps`, `stagger`, `googleFonts`, `fps`.
- Used for: MG chapter 6, MGP chapter 7 and template T8.

```js
MGP.core.expose(MGP.kineticType.create("#stage", { bg: "#1C2B45", color: "#FBF6EA",
  beats: [{ t: 0.3, preset: "rise", text: "Yang *dibagikan* justru tetap ada" }] }));
```

### Motion and effects

**`spring.js`: springs and animation principles (`MGP.spring`)**

Two layers.

- **Pure functions `MGP.spring.fn`:** cubic-bezier easing `bez`, closed-form damped spring `spring(t, {freq, damping})`, bounce expression `bounceExpr`, `keyOvershoot`, follow-through `follower`/`chain`/`lag`, squash and stretch `squash`, and anticipation `anticipate`.
- **v2.4:** `PEGAS`, `preset(name)` → `{freq, damping}` for `spring()` (the name may be `bouncy`, `snappy`, `heavy` or the old `memantul`, `sigap`, `berat`), `pegas`, `pegasEase`, `inersia`, `tunda`, `tundaRantai`, `regang`, `regangArah`, `bounceBallVolume` (a bouncing ball with sx·sy = 1). These are the `MGP.core` functions under their old names; the English names (`SPRINGS`, `springPhys`, `springEase`, `inertia`, `delay`, `delayChain`, `stretch`, `stretchDirection`) are on `MGP.core`. `follower`/`chain` remain fixed-step integration from t0 (deterministic, but a seek to a distant t computes from the start); for follow-through that is a pure function of t use `MGP.core.delay`.
- **Canvas views:**
  - `mode: "spring"` (old `"pegas"`): value graph + overshoot/bounce preview. Options `preset`, `amp`, `freq`, `decay`, `ease`, `key`, `twos`, `onion`.
  - `mode: "principles"` (old `"prinsip"`): without/with panels for a principle. `principle` holds a name or a list (the ids stay as they are): squash, antisipasi (anticipation), slow, arc, overlap, sekunder (secondary), smear, staging.
- **Used for:** MG chapter 2 (12 principles with numbers) and 3.1 (secondary motion), other modules that need overshoot.

```js
const y = MGP.spring.fn.spring(t, { freq: 2.5, damping: 0.3 });   // 0 -> 1 with overshoot
MGP.core.expose(MGP.spring.create("#stage", { mode: "principles", principle: ["squash", "antisipasi", "overlap"], segment: 5 }));
```

**`particles-flight.js`: light particles and flight into a constellation (`MGP.particlesFlight`)**

Soft round particles of light, all scheduled by time:

- bursts that scatter (`bursts [{t, x, y, n}]`)
- streams towards a target point (`streams`)
- a sparkling trail along a path (`trail`)
- depth flights (`flights`): particles shoot past the camera, then a warm light blooms on arrival

Options: `count`, `sparkColors`, `orbColors`, `softness`, `bloom`, `background`.

```js
MGP.core.expose(MGP.particlesFlight.create("#stage", { bursts: [{ t: 0.5, x: 640, y: 360 }], flights: [{ t: 2, x: 900, y: 260 }] }));
```

**`constellation-lines.js`: constellations with fine lines (`MGP.constellationLines`)**

A night sky with twinkling stars, a spiral of golden dust, orbit ellipses drawn slowly, and constellations with glowing curved lines. Sparks travel along the lines, and each constellation can get a label and a caption pill.

- Content: `constellations` (point patterns), or `nodes` + `edges` with `units: "px"`.
- Options: `drawIn`, `sparks`, `sparkSpeed`, `stars`, `dust`, `lineColors`, `glow`, `labels`, `font`, `focus` (highlights one constellation), `background`.

```js
MGP.core.expose(MGP.constellationLines.create("#stage", { units: "px", constellations: [],
  nodes: [{ x: 200, y: 300, label: "A" }, { x: 500, y: 220 }, { x: 800, y: 340, label: "B" }], edges: [[0, 1, 2]] }));
```

### Advanced principles (v2.4)

**`face.js`: FACS-lite expressions + a 2.5D head (`MGP.face`, old `wajah.js` / `MGP.wajah`)**

Expressions from Action Units (AU1, AU2, AU4, AU5, AU6, AU7, AU12, AU15, AU23, AU26, blink). Emotions are mapped in `EMOTION` (old `EMOSI`): `neutral`/`normal`, `smile`, `laugh`, `happy`, `sad`, `surprised`, `angry`, `unsure`, `blink`/`wink`, `afraid`, `disgust`, `energetic`, plus the old Indonesian names (netral, senyum, senang, tawa, sedih, kaget, marah, ragu, kedip, ...). The 2.5D head is built from 5 extreme poses (`center`, `left`, `right`, `top`, `bottom`) blended by a joystick `(jx, jy)`; the parallax shift per feature is derived from depth (the nose furthest forward, ears and hair moving the opposite way).

- Functions: `au`, `mixAU`, `auAt(keys, t)`, `merge(au, lipsyncMouth)` (jaw = max(viseme, AU26)), `poseHead(poses, jx, jy)`, `toVectorKit(au)`, `toChibi(au)`, `drawFace`. Old names: `campurAU`, `auPada`, `gabung`, `poseKepala`, `keVectorKit`, `keChibi`, `gambarWajah`.
- Module: `create(target, {joystick, expression, text|track, lead, pose, panel})` (old option names `ekspresi`, `teks`). With `lipsync.js` loaded, `text` makes the face talk.

```js
MGP.core.expose(MGP.face.create("#stage", { joystick: [[0, [0, 0]], [1, [1, 0]]], expression: [[0, "neutral"], [1.5, "happy"]], text: "Halo!" }));
```

**`fold-pattern.js`: Miura-ori, Yoshimura, Kresling (`MGP.foldPattern`, old `lipat-pola.js` / `MGP.lipatPola`)**

Tessellated fold patterns in 3D. Miura-ori is real rigid folding with one degree of freedom (closed-form formula; edge error ~1e-15). Yoshimura and Kresling are cylinders that compress/twist (not rigid, like real paper). A Miura sheet can carry an image or text (`fill`) that folds along. Every model is validated with `MGP.origamiFold.validatePattern`.

- Options: `pattern` ("miura"/"yoshimura"/"kresling"), `fold` (number/keyframes/function) or `motion` ("open"/"close"/"pingpong") + `start`, `foldDuration`, `ease` (e.g. "spring.snappy"; old "pegas.sigap"), `yaw`, `pitch`, `rotate`, `cols`, `rows`, `gamma`, `N`, `rings`, `levels`, `front`, `back`, `lines`, `fill`, `label`. Old names: `pola`, `lipat`, `gerak` ("buka"/"tutup"/"bolak"), `mulai`, `durasiLipat`, `putar`, `kolom`, `baris`, `cincin`, `tingkat`, `depan`, `belakang`, `garis`, `isi`.
- Functions: `miura`, `yoshimura`, `kresling` → `{titik, datar, panel, lipatan}` (vertices, flat pattern, panels, creases; the keys keep their names), `validate(model)`, `checkIsometry(model, reference)` (old `validasi`, `cekIsometri`).
- Blocks: `paper/miura`, `paper/yoshimura`, `paper/kresling`.

**`field.js`: cloner + effector + falloff field (`MGP.field`, old `medan.js` / `MGP.medan`)**

T' = T + ΔT·F(x, t). Cloners `clone.grid/linier/radial/teks`; fields `field.linier`, `bola`, `noise`, `gelombang`, `indeks`, `gabung`, `balik`, `konstan` (parameters may be functions of time); effectors `effect.polos`, `acak` (seeded), `rumus`, `tunda`, `pegas` (the field passed through the impulse response of a spring, recomputed from t). `apply(clones, effectors, t)`, `draw(g, clones, shape)` (old `klon`, `efek`, `terapkan`, `gambar`; the inner cloner, field and effector functions and their parameters keep their Indonesian names). Module demo: `mode` "grid", "bars" (a swept bar chart), "text" (kinetic typography per glyph), "free" (old "batang", "teks", "bebas"); options `shape` ("box"/"circle"/"bar"/"letter"), `clone`, `effector`, `drawOptions`, `text`, `color`, `color2`, `bg`, `labels`.

```js
const { clone, field, effect } = MGP.field;
const out = MGP.field.apply(clone.grid({ kolom: 16, baris: 9, jarak: [60, 60], pusat: [640, 360] }),
  [effect.pegas(field.bola({ pusat: (t) => [200 + 300 * t, 360], r: 220 }), { skala: 0.8, rot: 90 })], t);
```

### Motion packs

**`pack-scenes/`: 105 motion packs straight from their id (`MGP.packs`, old `MGP.paket`)**

Every pack in the motion pack library (motion-graphics-pro skill, folder `packs/`, chapter 17.2), from EXP-01 to TRN-05, can be drawn directly from its id with its own palette, fonts, aspect ratio and scenes. There are 76 scene types, each an 8 second loop.

- Files: load `core/mgp-core.js`, `pack-scenes/engine.js`, `data.js`, then `scenes-a1.js` to `scenes-t.js`, or just `dist/mgp-packs.js`.
- `MGP.packs.create(target, id, options)` → an instance ready to expose.
- `MGP.packs.render(id, ctx, t, {width, height, ar, lines, ...})` → one frame on your own canvas. It takes the same
  content options as `create` (`ar`, `lines`, `pal`, `font`, `title`, `scene`/`variant`, `loop`, `seam`, `fonts`). The pack
  is laid out at its own aspect ratio (or `ar`) and fitted, centred, into `width` x `height`, so a 16:9 pack in a 9:16
  box is letterboxed small: pass `ar: "9:16"` for a vertical layout. Keep ONE options object per pack and reuse it every
  frame (the layout and font state are cached per options object).
- `MGP.packs.ids()`, `get(id)`, `categories()` (old `kategori()`), `scenes()`, `def(name, fn)` (your own scene).
- Options (`create` and `render`):
  - `lines [{j: "Title", c: "Caption"}]` (brief text, 4 beats; your own content instead of the pack's sample text)
  - `pal`, `font` (`[heading, body]` families), `title`
  - `scene`/`variant` (another style with this pack's palette)
  - `ar`: `"16:9"` (layout 640x360), `"9:16"` (360x640), `"4:5"` (432x540), `"1:1"` (480x480); default the pack's own
  - `create` only: `scale` (default 2, so 16:9 = 1280x720), `width`/`height`, `duration`
  - `loop` (false = clamp at 8 s), `seam` (soft fade at the loop point), `fonts` (false = system fonts; for many packs at once, e.g. thumbnails)

```js
// one 9:16 frame of DOK-03 with your own text in a 1080x1920 canvas (the same options object every frame)
const opt = { width: 1080, height: 1920, ar: "9:16", lines: [{ j: "Kopi Pagi", c: "Seduh pelan" }] };
window.__seek = (t) => { ctx.clearRect(0, 0, 1080, 1920); MGP.packs.render("DOK-03", ctx, t, opt); };
```

```js
const p = MGP.packs.create("#stage", "DOK-03", { lines: [{ j: "Jalur yang terlupakan", c: "Rute ini pernah ramai" }] });
MGP.core.expose(p);
```

`examples/pack-scenes.html?id=KIN-02` renders one pack. `examples/packs-gallery.html` shows all 105 packs on one canvas.

### Lottie (`lottie/`)

`MGP.lottie` plays Lottie files (Bodymovin JSON) on a canvas deterministically: shapes, masks, mattes, precomps, time remap, text and images. `MGP.lottie.record`, `recordPage` and `fromDOM` (old names `rekam`, `rekamHalaman`, `dariDOM`) export a canvas composition, a page, or DOM/SVG + an mgp.motion/GSAP timeline to Lottie. The CLI: `mgp export <composition.html> --format lottie`, `mgp play`, `mgp render|frame|check <anim.json>` (old `rekam lottie ekspor | putar | render | cek`). The feature matrix, API and parity test results against lottie-web are in [`lottie/README.md`](lottie/README.md). This folder is not in `dist/mgp.js` yet, so load `lottie/lottie.js` (and `lottie/record.js`) directly.

## Examples (`examples/`)

There is one example per module: `core`, `figure3d`, `gait`, `shadow3d`, `scene-park3d`, `scene-tanker`, `character-styles`, `origami-fold`, `vector-kit`, `paper-fold-transition`, `chibi-object`, `lipsync`, `route-map`, `route-map-spice` (Maluku to Venice: cardboard, Equal Earth, globe; old `route-map-rempah`), `causal-transitions`, `kinetic-type`, `spring`, `particles-flight`, `constellation-lines`, `pack-scenes`, `packs-gallery` (old `paket-scenes`, `paket-gallery`).

v2.4 examples: `motion-principles` (springs, inertia, delay, squash; also test material for `mgp curves`; old `prinsip-gerak`), `rubberhose` (rubber limbs + fixed stroke), `face` (2.5D head + FACS + lip-sync; old `wajah`), `facs` (one AU set for the vector kit, object with a face, presenter), `slerp-camera` (old `slerp-kamera`), `fold-pattern` (old `lipat-pola`), `field` (old `medan`), `origami-character` (old `origami-tokoh`).

Every example:
- runs directly from `file://`;
- has a fixed-size `#stage` with `data-composition-id="main"`;
- sets `window.__duration`, `window.__seek(t)`, `window.__timeline` and `window.__ready`.

Render to video: open the example, wait for `__ready`, then call `__seek(i / fps)` for every frame and capture `#stage`.

## Notes

- **Fonts:** system fonts by default. Modules that load Google Fonts (packs, kinetic-type, the `googleFonts` option) wait for the fonts in `ready`. When rendered through mgp (motion-graphics-pro skill), those Google Fonts requests are served from mgp's local font bundle (24 OFL families, including Inter, Poppins, Montserrat, Lora, Cinzel, Cormorant Garamond, Fraunces), so no internet is needed; families outside the bundle still need the internet and are reported by `mgp check`. Without internet and without mgp, fonts fall back to system fonts, and frames stay deterministic on the same machine.
- **`lib/fonts.css`** (used by the `kinetic-type`, `pack-scenes` and `packs-gallery` examples): one `@import` of `../../motion-graphics-pro/render/fonts/fonts.css`. The font files are not copied into this skill; the relative path is right because both skills are installed side by side in `~/.claude/skills/`. Under the mgp server that path always resolves (it is mapped to the bundle even outside the server root). Opened as `file://`, Chrome/Edge block fonts from `file://`, so use `mgp preview` or an HTTP server. Without the motion-graphics-pro skill, the `@import` fails silently and the old behaviour returns (Google Fonts). When a family already has a local `@font-face`, `MGP.core.fontsReady` does not call Google and loads all its local faces first, so the canvas never draws with a fallback font.
- **Maps:** coastlines, lakes, country borders and city names come from [Natural Earth](https://www.naturalearthdata.com) (public domain), stored compactly in `map-data/` and loaded through plain `<script>` tags (runs from `file://`). Without those files, the route map uses land from a seed.
- **Faces:** lip-sync ships no face photos. A picture face always comes from the user's own `image` option.
- **Encoding:** every JS file is ASCII only (special characters written as `\uXXXX`), so it is safe to load without a charset declaration.
