# mgp Studio

mgp Studio (old name: Rekam Studio) is a visual editor for compositions rendered by mgp. Studio runs as a local web app: a small server on your own computer, opened in the browser, with no account, no cloud, and it keeps working without internet. Everything you change in Studio is written back to the composition's HTML file, so the mgp render matches what you see in Studio.

```bash
mgp studio index.html --open              # http://127.0.0.1:4700
mgp editor index.html --port 4800         # another name for the same command
mgp studio index.html --out-dir results   # folder for frames, videos and contact sheets
```

Old flags: `--buka` = `--open`, `--keluaran` = `--out-dir`. The default output folder is `studio-output/` next to the composition (an existing old `keluaran-studio/` folder stays in use). Studio needs the same things as mgp: Node.js 22+, Chrome or Edge, and ffmpeg for video renders; no `npm install` is needed in `render/` (see `../README.md`).

The interface is in English by default, or in the language mgp runs in (`MGP_LANG` / `LANG`); the ID/EN button switches it.

## Layout

| Area | Content |
| --- | --- |
| Top | Undo/redo, Save, output fps and resolution, the Check, Render frame, Render video and Contact sheet buttons, the ID/EN language button |
| Left | **Layers** (the composition's DOM tree, including the content of sub-compositions) with show/hide and lock buttons, then the composition **Variables** |
| Centre | Preview canvas with play/pause, frame stepping, edit mode, safe areas, grid, snap and zoom |
| Right | **Properties** of the selected layer, or the composition settings when nothing is selected |
| Bottom | **Timeline**: ruler, markers, beat grid, clips per track, animations per layer, and keyframes |

The preview uses the same runtime as the render: virtual time, per-frame seek and the same load order. Every change is reloaded in the background and swapped in once ready, so the canvas does not flicker.

## Editing on the canvas

- **Select**: click a layer on the canvas or in the Layers panel. Shift-click adds to or removes from the selection. Drag in an empty area (or on a full-frame background) to select with a box.
- **Move**: drag the layer. Guides appear when the layer's edge or centre lines up with the edge/centre of the canvas or another layer, and the position snaps to that line. Hold Alt to turn snapping off, Shift to lock to one axis.
- **Scale**: drag one of the corner handles. The opposite corner stays in place; hold Alt to scale from the centre, Shift for 5% steps.
- **Rotate**: drag the circle above the selection box. Shift snaps to 15° steps.
- **Nudge**: arrow keys 1 px, Shift + arrow 10 px.
- **Delete, duplicate, order**: Del/Backspace or the ✕ button, Ctrl+D, and the ▲/▼ buttons (bring forward/send back) in the Layers or Properties panel.
- **Hide and lock**: the round and square buttons on every Layers row. A locked layer cannot be selected on the canvas.

### Two modes when changing a transform

The **When editing** choice in the canvas bar decides what a change of position, rotation, scale and opacity means on a layer that is animating:

- **Offset whole animation** (default): the layer's base transform changes (`data-x`, `data-y`, `data-rotate`, `data-scale`). The animation keeps its shape and only shifts, rotates or grows along with it.
- **Key at this time**: Studio creates or updates a keyframe at the playhead time. The first keyframe holds its value from the start; later keyframes create motion between them. Keyframes show as diamonds on the timeline, one row per property.

## Timeline

- Click or drag the ruler to scrub. Time is always rounded to a frame.
- **Clips** (`data-start`/`data-duration`) show per track. Drag the clip body to move it, drag it to another track to change `data-track-index`, drag the left/right edge to trim (the left edge of audio/video also shifts `data-media-start`). Audio clips show their waveform.
- **Animations** show as bars under the animated layer. Drag to change the start time, drag an edge to change the duration. Grey bars are read-only.
- **Keyframes**: drag a diamond to move its time; Alt+click, or select it and press Del, to delete it.
- **Markers**: the + Marker button or the M key adds a marker at the playhead. Drag to move, double-click to rename, right-click to delete.
- **Snap** sticks drags to frames, the playhead, markers, beats, and the edges of other clips and animations. Beats are computed from the composition BPM, or from `beats/<audio file>.json` (shape `beatTimes`) when present.
- Ctrl + mouse wheel or the Zoom slider changes the time scale.

## Properties panel

For the selected layer: id, text (elements that contain only text, or the variable value when bound with `data-var-text`), clip timing, transform (base or keyframe, depending on the mode), inline layout (left, top, width, height, z-index), appearance (text colour, background, font, size, weight, letter spacing, radius), `data-var-*` attributes, the list of animations, and keyframes.

Each animation can change its preset, start time (`@`), duration, ease (with a curve preview), stagger, text split per letter or per word, and distance. **Convert to custom** opens the preset's from/to values as editable JSON. **Add** inserts a new preset starting at the playhead.

With nothing selected, the panel shows size, fps, composition duration (editable when it is written as the root `data-duration` or `window.__duration = number`), the time driver, markers, and the **Install Studio format** button.

## Save, undo, backup

- Changes are first kept as a draft on the Studio server; the file on disk only changes on **Save** (Ctrl+S). An "unsaved" badge marks a draft that has not been written yet.
- Every save copies the previous file content to `name.html.bak`.
- When the file was changed by another program since it was opened, Studio asks before overwriting.
- Undo and redo (Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y) cover every action of the session, including drags on the canvas and the timeline.
- Source editing never rewrites the whole HTML. Studio only replaces text ranges it has located: one attribute, one style declaration, the content of one text element, one literal in a script, or the content of the `mgp-timeline` block. Comments, formatting and other scripts stay intact.

## mgp buttons

| Button | Runs |
| --- | --- |
| Check | `mgp check` and shows the result |
| Render frame | `mgp frame --t <playhead>` at the chosen resolution |
| Render video | `mgp render` at the chosen fps and resolution |
| Contact sheet | `mgp contact --n 12`, then shows it |

When there are unsaved changes, Studio saves them first so mgp uses the latest version. Results are stored in the output folder and shown in the results window.

## Fully editable composition format

Ordinary mgp compositions still open. So that every Studio feature can be used and the result stays the same in mgp, Studio uses the following format. A complete example: `examples/studio-demo.html`.

### Clips and tracks

```html
<div id="title" class="clip" data-start="0.3" data-duration="4.4" data-track-index="1">Title</div>
<audio id="music" class="clip" src="assets/music.wav" data-start="0" data-track-index="9" data-volume="0.6"></audio>
```

A clip shows during `[data-start, data-start + data-duration)`. `data-track-index` (or `data-track`) only sets the lane on the timeline; drawing order still follows DOM order and `z-index`.

### Base transform

```html
<div id="card" data-x="40" data-y="-12" data-rotate="8" data-scale="1.1">…</div>
```

`data-x`/`data-y` in pixels, `data-rotate` in degrees, `data-scale` as a factor. The loader merges them with GSAP-style tweens that animate the same property, so the animation shifts, rotates or grows along with it. For elements inside a sub-composition, Studio writes inline CSS `translate`, `rotate` and `scale`.

### The `mgp-timeline` animation block

The block is `<script type="application/json" id="mgp-timeline">` (old id `rekam-timeline`, still read). Its keys (`versi`, `animasi`, `kunci`, `durasi`, ...) and the preset ids are the Studio file format and keep their original names:

```html
<script type="application/json" id="mgp-timeline">
{
  "versi": 1,
  "animasi": [
    {"id":"a1","target":"#title","preset":"naik-bertahap","at":0.3,"durasi":0.7,"ease":"power3.out","stagger":0.08},
    {"id":"a2","target":"#card","from":{"opacity":0,"y":40},"to":{"opacity":1,"y":0},"at":1.8,"durasi":0.6,"ease":"power2.out"}
  ],
  "kunci": [
    {"target":"#card","prop":"x","keys":[{"t":3,"v":0},{"t":3.9,"v":60,"ease":"power2.inOut"}]}
  ]
}
</script>
```

`animasi` (animations) items:

| Key | Meaning |
| --- | --- |
| `id` | Unique id, used by Studio to match the bar on the timeline |
| `target` | CSS selector, usually `#id` |
| `preset` | Preset name (table below). Without a preset, fill in `from` and/or `to` |
| `from`, `to` | Start and end values in GSAP form (`x`, `y`, `scale`, `rotation`, `opacity`, `filter`, colours, and so on) |
| `at` | Start second on the composition timeline |
| `durasi` | Seconds per target (duration) |
| `ease` | GSAP-style ease name |
| `stagger` | Delay between targets (seconds) |
| `pecah` | `"huruf"` (letter) or `"kata"` (word): the text is split into spans first, then the stagger applies per letter/word |
| `jarak` | Slide distance of the preset in pixels (default 120) |
| `repeat`, `yoyo` | Repeat and back-and-forth |
| `nonaktif` | `true` to skip the item without deleting it (disabled) |

A `kunci` (keys) item stores one property of one layer: `prop` is the GSAP property name (`x`, `y`, `rotation`, `scale`, `opacity`, and so on), `keys` is a list of `{t, v, ease}`. The `ease` of a keyframe applies to the motion towards that keyframe. Transform keyframe values are relative to the base transform.

### Presets

The preset ids stay in Indonesian (they are part of the file format); the English label shown in Studio is given in brackets.

| Role | Preset |
| --- | --- |
| Entrance | `pudar` (Fade in), `geser-kiri` (Slide in from left), `geser-kanan` (Slide in from right), `geser-atas` (Slide in from top), `geser-bawah` (Slide in from bottom), `skala` (Scale in), `pop` (Spring pop), `putar` (Spin in), `pantul` (Bounce drop), `ketik` (Typewriter), `naik-bertahap` (Staggered fade up), `tumbuh-garis` (Line grow), `lipat-kertas` (Paper fold), `kabur` (Blur in), `tirai` (Wipe reveal) |
| Exit | `pudar-keluar` (Fade out), `geser-keluar-kiri` (Slide out left), `geser-keluar-kanan` (Slide out right), `geser-keluar-atas` (Slide out up), `geser-keluar-bawah` (Slide out down), `skala-keluar` (Scale out), `kabur-keluar` (Blur out) |
| Emphasis | `denyut` (Pulse), `goyang` (Shake), `kedip` (Blink), `ayun` (Swing), `melayang` (Float) |

Entrance presets hold their start state before they begin (the layer is not visible yet); exit and emphasis presets change nothing before their time.

### Loader

The `mgp-timeline` block is built by the loader, a copy of `studio/loader.js` placed as the last script in `<body>`:

```html
<script id="mgp-loader">/* content of studio/loader.js */</script>
```

The old id `rekam-pemuat` is still read; the loader's global is `window.MgpLoader` (old name `window.RekamPemuat`, the same object). The loader adds the animations to the existing timeline (`window.__timelines[<root id>]` or `window.__timeline`), or creates a new timeline and registers it. So this format can also be added to a composition that already has its own GSAP-style script. Studio adds the block and the loader automatically the first time they are needed (or through the **Install Studio format** button). The composition stays self-contained: mgp, Studio and a plain browser give the same result. Needs GSAP 3 or mgp.motion.

### Other attributes

| Attribute | Where | Meaning |
| --- | --- | --- |
| `data-composition-variables` | `<html>` | Variables `[{id, type, label, default}]`; bound through `data-var-text="id"`, `data-var-<attribute>="id"`, and `var(--id)` in CSS |
| `data-markers` | `<html>` | Markers `[{"t": 1.8, "label": "card"}]` |
| `data-bpm`, `data-beat-offset` | `<html>` | Beat grid for timeline snapping |
| `data-hidden` | layer | Not shown in preview or render (needs the loader) |
| `data-studio-lock` | layer | Studio only: the layer cannot be selected on the canvas |

## Compositions with free-form GSAP scripts

A composition that writes its own timeline (for example `tl.fromTo("#bar", {...}, {...}, 2.0)`) can still be partly edited. Studio reads the inline scripts, finds the `.to`, `.from`, `.fromTo` and `.set` calls, and matches them to the tweens that really run. Only literal values can be edited directly in the source:

- the position (last argument) when it is a number, or added when missing
- `duration`, `ease`, `stagger`, `repeat`, and literal values in the from/to objects
- a new `duration` or `ease` property when it is not there yet

Values that are expressions (`1.5 + 1 / 24`, variables, functions) and tweens that cannot be traced are shown read-only. Text, colours, attributes and styles can still be changed as usual. For presets, keyframes and base transforms, Studio adds the `mgp-timeline` block and the loader at the end of `<body>`; the old script is not touched.

## Limits

- Structured animations, keyframes and data-based base transforms are only for elements in the main file. Elements inside a sub-composition (`data-composition-src`) can be moved, rotated and scaled through inline CSS, and their text, style and timing can be changed.
- The scale handle is uniform (one factor for width and height). Rotation and scale work on one layer at a time; moving and nudging work on many layers.
- The drag preview uses temporary CSS; the final position is recomputed by the loader after release. On a layer whose parent is itself scaled, the drag distance on screen and the distance in the source can differ.
- When a CSS `z-index` is written explicitly, the forward/back buttons (which swap DOM order) do not change the stacking; change `z-index` in the Properties panel.
- Elements created by script at run time (for example the letters of a split) have no counterpart in the source; Studio selects the nearest source element.
- Studio does not download or upload anything. The Geist/Fraunces fonts are used when installed on the computer; otherwise the interface uses system fonts.

## Licence

See `../../../LICENSE.md`. Idea credits are in `../NOTICE`.
