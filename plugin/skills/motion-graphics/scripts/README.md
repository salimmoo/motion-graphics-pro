# motion-graphics scripts

Motion engines and render tools for vector animation: walk cycles from gait data, spring secondary motion, a 3D space
for 2D backgrounds with a moving camera, shadows from 3D poses, frame rendering + motion blur, MP4 encoding. Every
script only needs **numpy + Pillow**; when `skia-python` is installed, the `brush` drawing layer uses it automatically
to be faster. `encode` and `hstack` need `ffmpeg` on PATH.

```
pip install -r requirements.txt          # numpy, Pillow
pip install skia-python                  # optional (faster)
```

Run with `python -I` (the scripts find their sibling modules themselves). Units **H** for the world/body; the sample
figure uses the adult canon of **7.5 heads** on a 5.78 H body (one head = 0.771 H): crotch at half the height, knee at
a quarter of the height above the floor, shoulders 2 heads, hips 1.5, elbow at the navel, wrist at the crotch, middle
fingertip at mid thigh, foot 1.1 heads.

Messages and `--help` are English by default and Indonesian with `MGP_LANG=id` (or `LANG`/`LC_ALL` starting with
`id`).

## Choosing the drawing engine

| variable | value | meaning |
|---|---|---|
| `MGP_BRUSH_ENGINE` (old: `KUAS_MESIN`) | `auto` (default) | skia when installed, otherwise the pure numpy engine |
| | `skia` / `pure` (old: `murni`) | force one of them |
| `MGP_BRUSH_SUPERSAMPLE` (old: `KUAS_SS`) | `4` (default) | pure-engine supersampling per axis (4 = 16 samples per pixel) |

## Scripts

| script (old name) | purpose |
|---|---|
| `gait_engine.py` (`mesin_gait.py`) | side-view walk cycle from gait data (heel/toe rocker, Fourier hip, Hermite swing); `BODY` = figure sizes (7.5-head canon), `G` = motion numbers; `canon()` = standing landmarks in heads |
| `spring.py` (`pegas.py`) | periodic secondary motion without loop jumps: `spring`, `spring_to`, `pendulum`, `accel` |
| `space3d.py` (`ruang3d.py`) | pinhole camera + orbit, camera height from the sole position, ground/world polygons clipped at the near plane, parallax mountain rings, organic mountain profiles, distance haze, camera-path keepout |
| `shadow3d.py` (`bayangan3d.py`) | figure shadow from 3D pose primitives (walks along, correct from every angle), contact occlusion, multiply shadow layer, shade on the figure (mask modulation); `PRIM` = 7.5-head canon body sizes |
| `render.py` | frame rendering with sub-frame motion blur, parallel ranges, MP4 encoding, side-by-side clips, contact sheet |
| `cavity.py` (`rongga.py`) | gapcheck: enclosed background cavities and loose pieces in a figure (same as the copy in the vector-character skill) |
| `brush.py` (`kuas.py`) | vector drawing layer (path, paint, gradients, canvas, clip, layers, perspective matrix, text, images, pathfinder, SVG) |
| `image_ops.py` (`atelier_citra.py`) | numpy + Pillow image tools (connected components, resize, contours and more) |

The old file names still work: each one is a small shim that loads the new module, and every old (Indonesian)
function, class, method and keyword name is still accepted.

## Commands and examples

```
python -I gait_engine.py report
python -I gait_engine.py report step=2.0 T=1.1
    check numbers: canon (knee, elbow, wrist, foot in heads), step, hip bob, reach, knee per phase, plantar, swing
    clearance, shoe ground penetration, ankle speed jumps.
    Parameters G (step, T, lift, ...) or BODY (thigh, shin, sole_y, hip_y, ...).

python -I gait_engine.py strip strip.png 8
    skeleton strip of 8 frames of one cycle + shoes + ground line

python -I spring.py demo spring.png
    response plots of hair (spring), bag (pendulum), hem (spring chasing a target) against the default gait

python -I space3d.py demo space.png
    orbit sheet of 4 angles: ground, road, mountain and hill rings, billboard poles, screen light direction

python -I shadow3d.py demo shadow.png
    4 angles x 2 phases: walking capsule figure, pose shadow, contact occlusion, tree shade on the figure

python -I render.py frames module:function frames/ 0 48 --fps 24 --sub 4 --shutter 0.5
python -I render.py parallel module:function frames/ 48 --jobs 2
python -I render.py encode frames/ clip.mp4 --fps 24 --crf 18
python -I render.py hstack compare.mp4 oldA/ "Style A" newB/ "Style B" --w 540 --h 960
python -I render.py sheet frames/ contact.png --cols 5 --step 24 --scale 0.3
    frame function fn(t) -> brush.Surface / brush.Image / RGBA array (H x W x 4, uint8); skia.Surface also works

python -I cavity.py still module:function check --canvas 900 1500 --origin 450 120 --hp 220
python -I cavity.py frames module:function 24
```

Sample project module for `render.py` (run from the module's folder):

```python
import math, brush

def film(t):
    s = brush.Surface(540, 960)
    c = s.canvas
    c.clear(0xF4F0EA)
    c.draw_circle(270 + 150 * math.sin(2 * math.pi * t), 480, 60, brush.Paint(0x55788A))
    return s
```

Then: `python -I path/to/render.py frames my_film:film frames 0 48`.

## Notes

- Pure engine: mean difference against skia is about 1 colour level (0..255) or less on the demo sheets; large
  differences only at anti-aliased edges and text (Pillow). `shadow3d demo` (8 frames 1080 x 1920) takes about
  3.7 s, `space3d demo` about 2 s.
- Perspective matrices (`ground_matrix`, `shade_matrix`) work on both engines; geometry crossing the w = 0 plane is
  clipped, images crossing it are inverse-mapped per pixel.
- The shared modules (`brush.py`, `image_ops.py`, `cavity.py`, the old-name shims `kuas.py`, `atelier_citra.py`,
  `rongga.py`, and `NOTICE`) are copied from `_shared/` in the source package with `python -I _shared/sync.py`; do not
  edit the copies directly. OpenCV (Apache-2.0) and Skia (BSD-3) credits are in `NOTICE`.
