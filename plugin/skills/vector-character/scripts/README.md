# vector-character scripts

Tools for drawing and checking flat vector characters. Every script only needs **numpy + Pillow**; when `skia-python`
is installed, the `brush` drawing layer uses it automatically to be faster. OpenCV is not needed.

```
pip install -r requirements.txt          # numpy, Pillow
pip install skia-python                  # optional (faster)
```

Run the scripts with `python -I` (isolated mode; the scripts find their sibling modules themselves). Unit **H** = head
height (top of the hair to the chin); `Fig(cv, ox, oy, hp)` maps H to pixels: `px = ox + x * hp`, `py = oy + y * hp`.

Messages and `--help` are English by default and Indonesian with `MGP_LANG=id` (or `LANG`/`LC_ALL` starting with
`id`).

## Choosing the drawing engine

| variable | value | meaning |
|---|---|---|
| `MGP_BRUSH_ENGINE` (old: `KUAS_MESIN`) | `auto` (default) | skia when installed, otherwise the pure numpy engine |
| | `skia` / `pure` (old: `murni`) | force one of them |
| `MGP_BRUSH_SUPERSAMPLE` (old: `KUAS_SS`) | `4` (default) | pure-engine supersampling per axis (4 = 16 samples per pixel; 6 or 8 is smoother and slower) |

Example: `MGP_BRUSH_ENGINE=pure python -I vkit.py demo demo.png` (PowerShell: `$env:MGP_BRUSH_ENGINE="pure"`).

## Scripts

| script (old name) | purpose |
|---|---|
| `vkit.py` | core figure drawing: `Fig` (local frame, mirror, SVG paths in H, ellipse, fill, clipped shade, tapered strokes), pathfinder (`union`, `inter`, `diff`, `union_all`), Catmull-Rom `spline`, `form_shade`, limb tubes, 2-bone IK |
| `shapes.py` (`bentuk.py`) | kit-style shapes: tangent capsules for rig pieces (`cap`, `seg_caps`), hair locks and curtains (`curtain2`) |
| `styles.py` (`gaya.py`) | "hand" style layer: subtly wobbling edges (`organic`), pressure strokes (`hand_stroke`), grain + colour mottling (`texture`, old `tekstur`) |
| `loft.py` | multi-angle rig: volume from front + side views, silhouette at any camera angle; the demo uses the adult 7.5-head canon (`CANON`) |
| `svgref.py` | render a reference SVG to PNG, most frequent colours, silhouette/skin profile per row |
| `measure_ref.py` (`ukurref.py`) | measure a reference head (hair + skin mask), width profile per row, hairline, outline overlay |
| `zoomsheet.py` | labelled zoom sheet of risky spots (self-check, old vs new regression) |
| `cavity.py` (`rongga.py`) | gapcheck: enclosed background cavities and loose pieces in a figure (same as the copy in the motion-graphics skill) |
| `brush.py` (`kuas.py`) | vector drawing layer (path, paint, gradients, canvas, clip, layers, text, images, pathfinder, SVG) with the skia or numpy engine |
| `image_ops.py` (`atelier_citra.py`) | numpy + Pillow image tools: read/write, colour/HSV conversion, resize, Gaussian blur, warp affine, connected components, contours, convex hull, line/rectangle |

The old file names still work: each one is a small shim that loads the new module, and every old (Indonesian)
function, class, method and keyword name is still accepted. `brush.py`, `image_ops.py`, `cavity.py`, the shims
`kuas.py`, `atelier_citra.py`, `rongga.py`, and `NOTICE` are copies of one shared source; edit the source and sync
(see the end).

## Commands and examples

```
python -I vkit.py demo demo.png
    sample of every tool: two figures (normal and mirrored), form shade, strokes, tube limbs

python -I loft.py demo loft.png
    sample volume at 0/22.5/45/67.5/90/135/180 + edge difference check against the references (v 0 and 90)

python -I svgref.py render ref.svg ref.png 1600
python -I svgref.py palette ref.png 100 60 300 300
python -I svgref.py profile ref.png 0 0 400 600 ffffff f0b892
    render SVG (CSS classes inlined, percent colours converted to hex), the 14 most frequent colours in a box,
    silhouette and skin segments per row (divide by H_ref for landmarks in H)

python -I measure_ref.py mask ref.png 40 20 190 230 2 head
python -I measure_ref.py profile head 332
    hair/skin mask from the crop x0 y0 x1 y1 scaled 2x -> head_h.npy, head_s.npy, head_mask.png;
    then hair + face width per y (H) and the hairline for H = 332 px (old subcommands: masker, profil)

python -I zoomsheet.py zoom.png 900 "demo.png|-0.6,-0.1,0.6,1.1|head|2" "demo.png|-0.8,1.1,0.8,3.4|body|1" --origin 350 120 --hp 120
    boxes in H of the source image, laid out left to right, a label under each box

python -I cavity.py still module:function check
python -I cavity.py frames module:function 24 --min 7 --max 400
    from the project folder; draw function fn(cv, ox, oy, hp) or fn(cv, ox, oy, hp, p), cv = brush.Canvas
    -> list of cavities, check_holes.png (red boxes), check_sil15.png (15 % silhouette)
```

Sample project module for `cavity.py`:

```python
import brush, vkit

def still(cv, ox, oy, hp):
    F = vkit.Fig(cv, ox, oy, hp)
    F.fill(F.ellipse(0.0, 0.55, 0.40, 0.48), 0xF2D3C2)
```

## Using brush directly

```python
import brush
s = brush.Surface(800, 600)
c = s.canvas
c.clear(0xF4F0EA)
p = brush.Path().move_to(100, 300).cubic_to(200, 100, 400, 500, 600, 300)
c.draw_path(p, brush.Paint(0x3E5A6A, style="stroke", width=8, cap="round"))
c.draw_path(brush.subtract(brush.Path().circle(400, 300, 80), brush.Path().circle(430, 300, 40)),
            brush.Paint(shader=brush.linear_gradient((320, 220), (480, 380), [0x9FCBD6, 0x55788A])))
c.draw_text("hello", 40, 560, brush.Font("Inter", 24), brush.Paint(0x141414))
s.save("sample.png")
```

On the skia engine the canvas also forwards the original skia methods (`cv.drawPath(...)`), so old project code that
uses skia directly keeps working as long as skia is installed. New code should use the brush API so it runs on both
engines.

## Pure engine notes

- Results are very close to skia: mean difference < 0.6 colour levels (0..255) on the demo sheets; large differences
  only at anti-aliased edges and text. Text is rendered by Pillow (Inter when installed, otherwise a system sans font),
  letter spacing can shift by 1 px.
- Pathfinder results are evaluated at draw time (boolean tree per sample), so unions have no seams. `bounds()` of a
  pathfinder result is an approximate box; `measure()`/`contours()` on a pathfinder result use raster contours
  (precision about 1/16 px).
- `measure(path)` is an iterator: use it in one pass (on the skia engine each contour is only valid until the next
  one is taken).

## One source, many copies

The shared modules live in `_shared/` in the source package. After editing them, run from the package folder:

```
python -I _shared/sync.py            # rewrite the copies in each skill's scripts/
python -I _shared/sync.py --check    # check only (exit code 1 when something is out of sync)
```

The old commands `python -I _bersama/sinkron.py [--cek]` still work. OpenCV (Apache-2.0) and Skia (BSD-3) algorithm
credits are in `NOTICE`.
