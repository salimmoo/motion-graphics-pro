# References: bundled scripts (`scripts/`)

Part of the `vector-character` skill. Read when: using vkit, shapes, styles, loft, svgref, measure_ref, zoomsheet, cavity, brush, image_ops.

Moved verbatim from SKILL.md v2.3 (17. Bundled scripts (`scripts/`)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 17. Bundled scripts (`scripts/`)
General tools from the test projects, cleaned up so they do not depend on a specific character. Character drawings, sizes, palettes and special rigs stay in the project.

How to use them in a new project:
1. Copy this skill's `scripts/` folder into the project folder (e.g. `tools/vc/`). The copy in the skill is not changed; tool fixes are noted and brought into the skill through a skill update.
2. Install once: `pip install -r tools/vc/requirements.txt` (numpy + Pillow); `skia-python` optional.
3. In the project module: `sys.path.insert(0, "tools/vc")`, then `import brush`, `from vkit import Fig`, `import vkit`, `import loft`.
4. Project drawing functions are written as `draw(cv, ox, oy, hp)` (still) or `draw(cv, ox, oy, hp, p)` (animation) with `cv` = `brush.Canvas` and shapes as `brush.Path`, so they can be checked with `cavity.py` right away.
5. Run each script's demo once in the work folder with `python -I` (isolated mode; the scripts find their sibling modules themselves).
6. `brush.py`, `image_ops.py`, `cavity.py` and `NOTICE` are copies of one shared source with the motion-graphics skill; do not edit the copies (sync flow in `scripts/README.md`).

| Script | Contents | Check/demo |
|---|---|---|
| vkit.py | `Fig` (`rotated`, `mirrored`, `pen`, `poly`, `ellipse`, `fill`, `shade`, `ink`), `union`/`inter`/`diff`/`sop`/`union_all`, `area` (check for holes in unions), `spline` (corner anchors), `form_shade(light=)`, `tube_stations`/`tube_path`, `ik2`, `mix`, `to_array` | `python -I vkit.py demo out.png` |
| loft.py | Hybrid multi-angle rig (chapter 16): `extents`, `rings_from(front, side)`, `flatten_front` (nose), `outline(rings, v, m)`, `outline_path`, `surf_point`, `proj`, `depth`, `facing`, `proj_widths`, `hull`; `CANON` (7.5-head canon) | `python -I loft.py demo out.png` (prints the edge difference v 0 vs front and v 90 vs side) |
| cavity.py | Gapcheck `still` (enclosed cavities + loose pieces + 15% silhouette + marked PNG) and `frames` (all animation frames); one source with motion-graphics | `python -I cavity.py still module:draw out` |
| zoomsheet.py | Labelled zoom sheet of risky spots from one or more images (old vs new regression); boxes in H (`--origin`, `--hp`) | `python -I zoomsheet.py out.png 1600 "img|x0,y0,x1,y1|label|3"` |
| svgref.py | Render a reference SVG (inline CSS, percent colours, copied stream), `palette`, `profile` per row | `python -I svgref.py render in.svg out.png 1600` |
| shapes.py | Kit-style shapes: `cap` (tangent capsule + `cut`), `seg_caps` (finger chains), `curtain2` (hair curtain: designed dip profile + strand ends + separation lines), `curtain`, `lock`/`wave_spine`/`offset_line` | import + example in the docstring |
| styles.py | "Hand" style layer: `organic` (subtly wobbling edges based on arc length, stable when pieces rotate), `hand_stroke` (pressure strokes), `texture` (grain + colour mottling, only when asked) | installed by wrapping `Fig.fill/shade/ink` |
| measure_ref.py | MEASURE references (chapter 18.3): `masks` (hair/skin by colour), `largest`, `profile` (width per row in H), `hairline` (hairline per x), `overlay` (reference outline over the character render) | `python -I measure_ref.py mask ref.png x0 y0 x1 y1 4 out`, then `profile out 304` |
| brush.py | Vector drawing layer: `Surface` (`canvas`, `array()`, `save`), `Canvas`, `Path` (+ `from_svg`), `Paint` (`style`, `cap`, `join`, `blend`), gradients, `Matrix`, `Font`, `Image`, pathfinder `union` / `intersect` / `subtract` / `exclude` / `union_all` / `simplify`, `measure` (PathMeasure), `draw_svg`; skia or pure engine (`MGP_BRUSH_ENGINE`, `MGP_BRUSH_SUPERSAMPLE`) | examples in `scripts/README.md` |
| image_ops.py | numpy + Pillow image tools replacing OpenCV: `read` / `write`, `cvt_color` (HSV), `resize`, `gaussian_blur`, `warp_affine`, `connected_components` (connectedComponentsWithStats), `outer_contours` (outer findContours), `draw_contours`, `convex_hull`, `line`, `rectangle` | used by `cavity.py`, `measure_ref.py` |
| requirements.txt, README.md | Required packages (numpy, Pillow) and optional ones (skia-python); command list, engine choice, pure engine notes | `pip install -r scripts/requirements.txt` |

Regression test against the test character pipeline (2026-10-30):
| Script | Result |
|---|---|
| loft.py | 6 volumes (face, hair, body, T-shirt, neck, pelvis): silhouettes at 8 angles identical to the project rig; one face row (y 0.83) differs by 0.005 H (1 px rasterisation) |
| loft.py demo | Loft silhouette edge difference vs reference drawing: 95th percentile 0.005-0.010 H, max 0.015-0.050 H (4-row subsampling + spline) |
| cavity.py | `still` and `frames` identical to the project check (cavities, marked PNG, 15% silhouette) |
| svgref.py | Renders of 5 reference SVGs identical to the project tool (3 runs) |
| shapes.py, styles.py | Copies of the kit test project tools (kit v3-v15); import + capsule, curtain, organic, hand_stroke examples run with the package vkit (2026-10-30) |
| measure_ref.py | Kit turnaround front head (4x, H 304): top +-0.22, cheeks +-0.47, hairline dropping steeply at the temples, same as the project measurement |
