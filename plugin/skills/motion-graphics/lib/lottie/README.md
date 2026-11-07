# Lottie in MGP (`lib/lottie/`)

Lottie support of the MGP library, written from scratch:

- **`lottie.js`**: the `MGP.lottie` player. Draws Lottie files (Bodymovin JSON) onto a 2D canvas, deterministically, with per-frame seek.
- **`record.js`** (old name `rekam.js`): the exporter. `MGP.lottie.record` records vector drawing from a `draw(t)` function, `MGP.lottie.recordPage` records every canvas on a page, and `MGP.lottie.fromDOM` turns DOM/SVG elements driven by a GSAP-style timeline into Lottie layers with eased keyframes. Old names `rekam`, `rekamHalaman`, `dariDOM` still work.
- **CLI**: `mgp export <composition.html> --format lottie`, `mgp play`, `mgp render | frame | check <anim.json>` (`motion-graphics-pro/render/src/lottie.mjs`; old `rekam lottie ekspor | putar | render | frame | cek`).

The player code was written from the format description in [lottie-docs](https://lottiefiles.github.io/lottie-docs/) (CC-BY 4.0). No lottie-web code was copied. lottie-web (MIT) is only used for comparison on the test page.

Both files are classic scripts like the other MGP modules. Load them after `core/mgp-core.js` (core is actually optional for the player). This folder is not in `dist/mgp.js` yet, so load its files directly.

## The `MGP.lottie` player

```html
<div id="stage" data-composition-id="main" data-width="640" data-height="360"></div>
<script src="lib/core/mgp-core.js"></script>
<script src="lib/lottie/lottie.js"></script>
<script>
  const anim = MGP.lottie.create("#stage", { url: "anim.json", loop: true, fit: "contain" });
  anim.ready.then(() => MGP.core.expose(anim));   // window.__duration, __seek(t), __ready
</script>
```

| Part | Meaning |
|---|---|
| `create(target, options)` | `target` = canvas, container, selector, or `null` (no canvas of its own, only for `drawTo`) |
| options | `data` (object/JSON text) or `url`, `loop`, `speed`, `fit` (`contain`, `cover`, `fill`, `none`), `width`/`height`, `dpr`, `background`, `assetsPath`, `subframe` (default `true`; `false` = rounded to whole frames), `from`/`to` (frame range) |
| `inst.draw(t)` / `seek(t)` | The frame at second `t` = `ip + t · fr · speed` |
| `inst.drawFrame(n)` | Exactly Lottie frame `n` (accurate per frame number) |
| `inst.drawTo(ctx, t, {x, y, width, height, fit})` | Draws onto another canvas, for example under kinetic text (see `examples/putar.html`) |
| `inst.duration`, `fps`, `ip`, `op`, `frames`, `ready` | `ready` waits for the data, images and fonts |
| `inst.report()` | `{features, unsupported, expressions}` for the file being played |
| `MGP.lottie.analyze(data)` | Analysis without a DOM (used by `mgp check anim.json`) |
| `MGP.lottie.renderFrame(ctx, data, frame, box)` | One frame into an existing context |

Every frame is drawn from scratch with no state between frames, so the seek order does not affect the result. Keyframes are evaluated at composition time, and precomp content uses `(t - st) / sr` or time remap.

### Player feature matrix

| Group | Supported | Notes |
|---|---|---|
| Layers | shape, solid, null, image (embedded base64 or external file), precomp, text | audio, camera, light, adjustment: skipped and reported |
| Shapes | group, rectangle (roundness), ellipse, star, polygon (outer/inner roundness), path | direction `d = 3` is reversed |
| Styles | fill (nonzero/evenodd), stroke (width, cap, join, miter, dash + offset), linear and radial gradient fill/stroke (highlight length/angle), gradient opacity stops | |
| Modifiers | trim paths (simultaneous, individual, offset), repeater (copies, offset, transform, start/end opacity, composite above/below), round corners, merge paths | merge modes other than add are drawn as add; pucker/bloat, twist, offset path, zig-zag are ignored and reported |
| Transform | anchor, position (including separate x/y), scale, rotation, opacity, skew + skew axis, auto-orient, parenting | 3D layers are drawn flat |
| Keyframes | bezier ease per dimension, linear, hold, old keyframes (`s`/`e`), spatial bezier for position (arc-length parameterised) | expressions are not run: the static/keyframe value is used, and their count is reported |
| Time | in/out point, start time, time stretch, time remap | |
| Masks | add, subtract, intersect, inverted, opacity | feather approximated with blur, expansion with a stroke; lighten/darken/difference approximated |
| Track mattes | alpha, alpha inverted, luma, luma inverted; old format (`td`/`tt`) and new (`tp`) | |
| Text | font (family, weight, style from `fStyle`), size, content, stroke (above/below), left/right/centre justification, tracking, line height, caps, text box (word wrap), `chars` glyph shapes | text animators and text on path are ignored and reported; `fPath` fonts (CSS/woff) are loaded |
| Blend modes | 16 canvas modes (multiply ... luminosity, add) | hard mix not supported |
| Effects | not supported | reported per layer |

## Exporter

### `MGP.lottie.record(source, options)`: canvas drawing to Lottie vectors

```js
// source: (ctx, t) => {...}, an MGP module api (use options.modul), or an MGP.<module>.create(...) instance
const inst = MGP.kineticType.create("#text", { beats: [...] });
await inst.ready;
const { data, report, json } = MGP.lottie.record(inst, { fps: 30 });
```

Options: `width`, `height`, `fps` (30), `duration` (s), `from` (0 s), `nama` (name), `presisi` (decimals, 2), `toleransi` (px for dropping keys, 0.05), `interpolasi` (`"linear"` | `"hold"`), `geser` (true), `slot` (`"auto"` | `"urutan"`), `modul` (module options). These option keys keep their Indonesian names in the JavaScript API; the CLI uses `--precision`, `--tolerance` and `--interpolation`. The result has `data`, `report` (the same object as the old key `laporan`) and `json()`.

A recording context stands in for the canvas. Every `fill`, `stroke`, `fillRect`, `fillText` and `drawImage` becomes one record: the path in pixel space (arcs, ellipses, roundRect and quadratic curves converted to cubic bezier), colour, gradient, stroke settings, clip and blend. Records are matched across frames to **slots** (kind + style + order of appearance; when the z order clashes, slots follow the drawing order). Every slot becomes one layer:

- path, colour, opacity, stroke width, gradient stops and clip (as a mask) are keyframed **only when they change**, so identical frames and unchanged paths add nothing;
- **path reuse**: sub-paths whose shape stays the same and that only move become one static shape plus a position track (matched across frames by shape and distance);
- `interpolasi: "linear"` (default): keyframes that can be predicted from their neighbours (tolerance `0.05` px) are dropped, including path keyframes whose point count stays the same. `"hold"` gives one hold keyframe per changed frame: exact but larger;
- the point count of the paths in one track is equalised (padded with zero-length segments) because lottie-web uses the point count of the first keyframe;
- text becomes text layers (family, weight, style, size, colour, alignment, tracking from `letterSpacing`) with a transform decomposed from the matrix;
- images (`drawImage` from an `<img>` or a canvas) become base64 assets.

`report.tidakDidukung` (unsupported; the report's inner keys keep their Indonesian names) lists what could not be translated, with counts: shadows (`shadowBlur`), `ctx.filter`, composite modes outside the blend modes, patterns, `Path2D`, pixel operations, the inner radius of radial gradients, and nested clips (approximated).

### `MGP.lottie.recordPage(options)`: every canvas on the page

Hooks the `CanvasRenderingContext2D` prototype, then seeks the page (`window.__mgpRuntime.seek`, old `window.__rekam.seek`, or `window.__seek`) per frame. Every canvas visible under the root is recorded with its CSS position and scale and the element opacity. This is what `mgp export --format lottie` uses, so multi-canvas examples such as `examples/kinetic-type.html` (9 cells) can be exported without changing their code.

### `MGP.lottie.fromDOM(root, options)`: DOM/SVG + timeline

```js
const { data } = MGP.lottie.fromDOM(document.getElementById("root"), { timeline: window.__timelines.main, fps: 30 });
```

- What becomes a layer: SVG `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path` (every command including the `A` arc), `text`, HTML boxes with a background colour (with border-radius), HTML text leaves, and the root background.
- Every element is sampled per frame: the matrix to the root (SVG through `getScreenCTM`, HTML through the `offsetParent` chain + CSS transform + transform-origin), chained opacity, and fill/stroke/text colours. Anchor = transform-origin (HTML) or the bbox centre (SVG), so the position moves in a straight line even when the element also rotates.
- With a GSAP-style timeline, every tween whose ease can be mapped to a cubic bezier (`none`, `power1-4`, `quad`..`quint`, `sine`, `expo`, `circ`, `back`, `cubic-bezier()`) becomes two keyframes with bezier handles. The handles from the table are refitted to the real `gsap.parseEase` curve, then checked against the samples (tolerance 1.5% of the range). Other segments (elastic, bounce, steps, overlapping tweens, mgp.motion timelines or other timelines that only have `seek`) use sampled linear keyframes, thinned out.

## CLI (`motion-graphics-pro/render`)

```
mgp export composition.html --format lottie -o anim.json|anim.lottie [--fps 30] [--mode auto|canvas|dom] [--interpolation linear|hold] [--precision 2] [--tolerance 0.05] [--from 0] [--to 5]
mgp play anim.json [--port 4600] [--open]        preview with the MGP.lottie player and the mgp scrubber
mgp render anim.json -o anim.mp4 [render options] render a Lottie file to video through the same player
mgp frame anim.json --t 1.5 -o f.png
mgp check anim.json [--json]                     features and unsupported parts
```

Old flags: `--mode kanvas`, `--interpolasi`, `--presisi`, `--toleransi`, `--buka`.

`auto` mode records the canvases when there is canvas drawing, and uses `fromDOM` otherwise. Multi-scene, block-based or `__seek`-driven compositions are seeked through the mgp runtime (every timeline and scene visibility), not just `__timelines.main`, so their export is no longer static; `fromDOM` also places text in centred flex/grid boxes, and reports the clip-path, box-shadow and CSS animations it skipped. `-o anim.lottie` writes dotLottie (deflate zip, lossless, ±10x smaller). Path and mask tracks are stored linear per segment (hold only at path open/close boundaries) and the key-dropping tolerance is never below one `--precision` quantum: vector-kit 8 s goes from 81.6 MB to 52.0 MB JSON with no quality difference (5.3 MB as `.lottie`; `--precision 1 --tolerance 0.3` 3.0 MB). Compositions that embed Lottie through the player (for example `examples/putar.html`) render like any composition: `mgp render lib/lottie/examples/putar.html -o putar.mp4`.

## Examples

- `examples/bintang.json`: a small hand-made animation (a star with a radial gradient and round corners, a dashed ring with trim paths, text, a solid).
- `examples/putar.html`: on the left played directly, on the right drawn with `drawTo` onto the background of a `kineticType` module. One `MGP.core.expose` for both.

## Test results (5 November 2026)

The parity test was run in headless Chrome, 5 frames per file, compared with lottie-web 5.12.2 (canvas renderer; svg renderer for files with text). Pixel differences are computed after compositing onto white, on a 0-255 scale; "bad" = pixels with a channel difference above 32.

- 28 lottie-docs samples (single features): mean difference 0.00 to 0.08. There are three exceptions, and all three come from lottie-web behaviour, not from this player:
  - `stroke.json` (5.3): lottie-web draws a dash of 100 with gap 0 as dots;
  - `text.json` (12.0): lottie-web SVG cannot measure the generic `sans` font, so the letters pile up;
  - `auto_orient` and `repeater`: the maximum difference is only a few edge pixels.
- 6 lottie-web test files: `adrock`, `dalek` 0.05; `ripple` 0.8, `lights` 2.9 and `starfish` 3.3 because of expressions and effects; `banner` 5.4 because of a text animator. All of them are recorded in the report.
- Round trip (export then play, compared with the original frame): kinetic-type 0.71 (lottie-web) / 0.04 (MGP); vector-kit 0.43 / 0.07; DOM+GSAP 0.78 / 0.14; constellation-lines 8.5 / 4.5, because shadows, blur and glow cannot be exported.

The full numbers, PNG comparison sheets, and sample sources/licences are in the skill's test folder (see the build report).

## Limits

- Expressions, effects, 3D cameras, text animators and text on path are not supported (reported, not silently ignored).
- Canvas export records the drawn result, not the animation structure. Many twinkling particles (for example the 1,500 dust motes of constellation-lines) give a large file (about 22 MB for 8 seconds). For Lottie, reduce the particles or use a lower `--fps`.
- Canvas shadows, blur and glow have no Lottie equivalent. Composite modes outside the blend modes are drawn as normal.
