# Ready-made blocks

This folder holds motion blocks ready to paste into an HTML video composition: transitions, kinetic text, title cards, lower thirds, subtitles, accents, data charts, maps, camera moves, textures, moving backgrounds, UI mockups, code, galleries, handwriting styles, 3D objects, and wrappers around the motion modules of the `motion-graphics` skill.

Every block is a plain HTML snippet (markup, `<style>`, `<script>` with a paused `mgp.motion` timeline; GSAP-compatible API). Blocks follow the same composition contract as mgp and HyperFrames (`data-composition-id`, `data-start`, `data-duration`, `window.__timelines`), so `mgp render` renders them with nothing else installed. Every block is deterministic: the frame at a given second is always the same, from any seek direction. No network access except Google Fonts.

Old names (v2.3 / v2.4-dev) keep working: the folder used to be `blok/`, ids were Indonesian (`transisi/robek` is now `transitions/tear`), files were `blok.html` / `blok.json` / `contoh.html`, the markup used `data-blok` / `data-blok-props` and the helper `BLOK.pasang`. `mgp add` accepts old ids, old prop names and old option values; `mgp check` warns when a composition still uses them. Every old id is listed in the block's `aliases`.

## Categories

<!-- categories:start -->
| Category | Blocks | Contents |
|---|---:|---|
| `3d` | 5 | 2.5D/3D objects: product spin, exploded stack, glass |
| `accents` | 22 | Small emphasis: spring pop, checkmark, confetti, light sweep, drawn line, annotation |
| `backgrounds` | 21 | Moving backgrounds: aurora, mesh gradient, plasma, stars, snow, orb |
| `camera` | 10 | Camera moves on a scene: push, float, shake, focus, dolly zoom |
| `characters` | 3 | Characters: walking, objects with faces, lip-sync presenter |
| `code` | 7 | Code and terminal: typing, diff, line highlight, morph |
| `data` | 12 | Numbers and charts: counter, bars, line, bar race, progress ring |
| `gallery` | 9 | Image carousels and media grids |
| `hands` | 12 | Handwriting and whiteboard style: written title, arrow, circle, flowchart |
| `labels` | 6 | Name and role lower thirds, news ticker, camera HUD |
| `logos` | 6 | Logo intros and outros, wordmarks, logo walls |
| `maps` | 6 | Illustrative maps: region grid, route, flow arcs, bubbles, globe |
| `packs` | 1 | Motion pack scenes straight from an id |
| `paper` | 5 | Paper and origami: freeze-frame dressing, folded crane, Miura-ori, Yoshimura, Kresling |
| `social` | 6 | Generic social media cards: post, follow, comment, testimonial |
| `subtitles` | 16 | Subtitle styles from timed words: highlight, karaoke, neon, stomp, emoji |
| `text` | 26 | Kinetic typography and text effects: rising words, typewriter, letter scramble, highlighter, variable, particles |
| `textures` | 9 | Look overlays: grain, vignette, CRT, halftone, dither, stop motion, flare |
| `titles` | 8 | Title cards and closing calls to action |
| `transitions` | 36 | Scene changes: slide, whip pan, iris, shutter, glitch, distortion, paper tear, ink, paper fold |
| `ui` | 34 | Product demos and interface mockups: cursor, gestures, notifications, chat, devices |
| **Total** | **260** | |
<!-- categories:end -->

The full list is in `catalog.json`. The HyperFrames registry item covered by each block is in `INVENTORY.md`.

## Finding a block

```bash
mgp catalog                              # blocks per category
mgp catalog --search glitch              # search id, name, tags and description
mgp catalog --search "lower third"
mgp catalog --category transitions       # every block of one category
mgp catalog --search paper --json        # result for scripts
```

The search runs locally over the id, the names (English and Indonesian), tags, descriptions, old ids and the HyperFrames item names the block covers. So `mgp catalog --search push-in` also finds `camera/push`.

## Adding a block

```bash
mgp add transitions/slide --into index.html --start 3.5 --prop direction=right --prop mode=close
mgp add subtitles/highlight --into index.html --start 0 --duration 12 --prop highlight=#22b8a6
mgp add text/rising-words labels/clean camera/push --into index.html   # several blocks at once
mgp add text/rising-words                                               # without --into: print the snippet only
```

What `mgp add` does:

1. Finds the block by id (`transitions/slide`), by name alone when unique (`slide`), by old id (`transisi/geser`) or by HyperFrames item name (`push-in`).
2. Fills the props: `--prop key=value` is read as JSON when possible (`--prop pause=0.1`, `--prop shadow=false`, `--prop 'words=[...]'`), otherwise as text. Old prop names and old option values are translated (`--prop arah=kanan` becomes `direction=right`). Props that `block.json` does not declare are still written, with a warning.
3. Gives a unique id (`blk-slide`, `blk-slide-2`, ...) so the same block can be added many times. The default random seed stays the one the block had before the rename, so a re-added block looks the same.
4. Sets `data-start` (`--start`), `data-duration` (`--duration`) and `data-track-index` (`--track`).
5. Copies the support files into `<composition folder>/blocks/` (`motion.js` when the composition loads no animation engine yet, `block-core.js`, and `mgp.js` for blocks that wrap a `lib` module), then adds the `<script>` and Google Fonts `<link>` tags it needs to `<head>`. A project made before v2.4 keeps its `blok/` folder: its `blok-inti.js` is updated in place (the new core is backward compatible). The result runs from `file://` without internet (except fonts).
6. Inserts the snippet at the end of the root composition (the first `data-composition-id` element), or into another container with `--container "#scene-3"` / `--container <data-composition-id>`.

`--dry-run` only shows what would happen. `--json` gives machine-readable output. After adding, check with `mgp check index.html` and look at it with `mgp preview index.html`.

Transition blocks move the host scenes through the props `from` and `to` (selectors, default `#adegan-a` and `#adegan-b`, the scene ids of the examples). Camera blocks and some effects use the prop `target` (default `#adegan`). Change the selectors to the scene ids of your composition.

## Looking at the examples

Every block has an `example.html`: a small composition that uses the block over a sample background.

- Open it straight in a browser: the example loops on the wall clock.
- Render it with mgp. The example loads `../../_core/block-core.js` (and the `motion-graphics/lib` modules for wrapper blocks), so give the server root at the folder that holds both `motion-graphics-pro` and `motion-graphics`:

```bash
mgp render blocks/transitions/slide/example.html --root .. -o slide.mp4 --fps 24
mgp contact blocks/backgrounds/aurora/example.html --root .. --n 6 -o aurora.png
```

## Inside one block

```
blocks/<category>/<name>/
  block.html    the snippet that gets pasted (markup + <style> + <script>)
  block.json    block data: id, name (+ name_id), category, description (id/en), tags, props (default, type, options, hint,
                aliases = old prop names, option_aliases = old option values), duration, aspect, dependencies,
                aliases (old id + HyperFrames item names), example settings
  example.html  runnable example composition (built from the two files above)
```

`block.html` always looks like this:

```html
<div data-composition-id="__ID__" data-block="text/rising-words" data-start="0" data-duration="4" data-track-index="10" class="blk blk-text-rising-words">
<script type="application/json" data-block-props>
{"text": "Gerak yang *jelas* membuat pesan mudah diingat", "size": 96}
</script>
<div class="blk-tk"></div>
</div>
<style>
.blk-text-rising-words { position: absolute; inset: 0; pointer-events: none }
</style>
<script>
BLOCK.mount("__ID__", function (k) {
  // k.root, k.P (props), k.tl (paused mgp.motion timeline), k.w, k.h, k.s (scale = min(w,h)/1080), k.dur, k.random (seeded random)
  var el = k.root.querySelector(".blk-tk");
  var words = BLOCK.split(el, k.P.text, "words");
  k.tl.fromTo(words, { opacity: 0, y: 60 * k.s }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }, 0.1);
}, { font: true });
</script>
```

`__ID__` is replaced by a unique id when the block is added. Props come from the `data-block-props` JSON and can be overridden per placement with a `data-variable-values` attribute on the root element. With the new markup (`data-block`), old prop names and old option values in that JSON are translated by the core (table in `block-core.js`, generated by `tools/build.py`).

### The `BLOCK` helper (`_core/block-core.js`; old global `BLOK`, old names in brackets)

| Helper | Use |
|---|---|
| `BLOCK.mount(id, fn, {font})` (`pasang`) | Finds the root, reads the props, creates a paused timeline, registers it in `window.__timelines[id]`. `fn` may return a Promise (e.g. waiting for a module). `font: true` waits for the fonts first |
| `BLOCK.initial(tl, el, vars)` (`awal`) | An initial state that stays right when the timeline is seeked backwards (instead of `tl.set(el, vars, 0)`) |
| `BLOCK.split(el, text, "words"\|"letters"\|"lines")` (`pecah`; old modes `kata`/`huruf`/`baris`) | Splits text into spans; `*word*` becomes a keyword (`.blk-kunci`) |
| `BLOCK.random(seed)` (`acak`), `BLOCK.noise(x, seed)`, `BLOCK.boil(t, seed, fps)` (`goyang`) | Seeded random (`.range`, `.int`, `.pick`, `.sign`), smooth noise, hand-drawn boil per frame |
| `BLOCK.onTime(tl, fn, duration)` (`waktu`) | Calls `fn(t)` whenever the timeline is seeked, for canvas and shaders |
| `BLOCK.canvas(root, w, h)` (`kanvas`), `BLOCK.shader(canvas, glsl, uniforms)` | 2D canvas (`{canvas, ctx, w, h}`) and full-screen WebGL shader (`draw(t)`; `fbm`, `vnoise`, `hsv2rgb` built in) |
| `BLOCK.words(P)` (`kata`), `BLOCK.pages(words, max)` (`halaman`) | Timed words from a transcript (`[{text, start, end}]`) or from text, grouped into subtitle pages |
| `BLOCK.prepareStroke(path)` (`garis`) | Prepares an SVG path for a drawn-on effect (`strokeDashoffset`) |
| `BLOCK.el`, `BLOCK.svg`, `BLOCK.find` (`cari`) | Make HTML/SVG elements, find a host element from a selector |
| `BLOCK.font(spec)`, `BLOCK.family(spec)` (`keluarga`) | Load a Google Font and write `font-family` |
| `BLOCK.mix` (`campur`), `BLOCK.rgba`, `BLOCK.vec3`, `BLOCK.spring` (`pegas`), `BLOCK.remap` (`peta`), `BLOCK.smooth` (`halus`), `BLOCK.progress` (`jendela`), `BLOCK.step` (`langkah`) | Colour, damped spring, maths; extra eases `blockSpring`, `blockSpringSoft`, `blockSpringStrong` (old `pegas`, `pegasLembut`, `pegasKuat`) |
| `BLOCK.clone`, `BLOCK.mirror` (`klon`, `cermin`) | Copies of a scene for transitions, refreshed on every seek (event `mgp-seek`, old `rekam-seek`) |

## Making a new block

1. Make the folder `blocks/<category>/<name>/` (lower case with hyphens).
2. Write `block.html` with the pattern above. Every CSS selector starts with `.blk-<category>-<name>`. Multiply px sizes by `k.s` and use percentages for positions, so the block fits 16:9, 9:16 and 1:1.
3. Write `block.json` (copy a similar block). Each prop `default` must equal the JSON in `block.html`. The `example` section picks a sample background (`bg`): `dark`, `light`, `paper`, `photo`, `ui`, `text`, `two-scenes` (for transitions) or `empty`.
4. Build the example and the catalog, then test:

```bash
python blocks/tools/build.py <category>/<name>        # example.html of one block
python blocks/tools/test.py <category>/<name> --out test_results/
python blocks/tools/build.py                          # every example + catalog.json + alias table in block-core.js
python blocks/tools/inventory.py                      # INVENTORY.md
```

`test.py` opens the example in Chrome/Edge with the mgp runtime, checks script errors and network access, seeks three times, makes sure the result is the same from any seek direction, then makes a contact sheet per category. Needs `pip install playwright pillow`; the examples load the engine directly (`motion-graphics/lib/motion/motion.js`), no `npm i`.

Rules that keep a block safe to render:

- Randomness only through `k.random` or `BLOCK.random(seed)`. No `Math.random`, `Date.now`, `setTimeout`, `setInterval`, `requestAnimationFrame`, CSS animation or `repeat: -1`.
- Canvas and shader drawing is a pure function of time: recompute from `t`, never accumulate from the previous frame.
- Write the initial state of an element with `BLOCK.initial` or `fromTo`, not `tl.set(..., 0)`.
- No images or data from the internet. Photos, icons and avatars are made with CSS, SVG or canvas, or passed in through optional url props.
- Core timeline API only (the GSAP 3 subset mgp.motion supports; no plugins).

## Tools

| File | Use |
|---|---|
| `tools/build.py` | Builds `example.html` and `catalog.json`, validates `block.json`, writes the alias table into `_core/block-core.js` (old name `alat/bangun.py`) |
| `tools/test.py` | Automatic browser test + contact sheets (old `alat/uji.py`) |
| `tools/inventory.py` | Writes `INVENTORY.md` (HyperFrames items -> blocks) (old `alat/inventaris.py`) |
| `tools/update_packs.py` | Replaces the add lines of the motion pack library (`packs/`) with `mgp add <block>` (old `alat/perbarui_paket.py`) |
| `tools/legacy-name-map.json`, `tools/legacy-items.json` | HyperFrames item name -> block id, and the list of old registry items |

The effect ideas in this registry were inspired by the HyperFrames registry (Apache-2.0); all code is rewritten. Details in `NOTICE`.
