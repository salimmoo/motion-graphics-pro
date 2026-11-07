# Reference: bundled scripts (`scripts/`)

Part of the `motion-graphics` skill. Read when: using the gait engine, springs, 3D space, shadows, cavity check or brush in a project.

Moved verbatim from SKILL.md v2.3 (11. Bundled scripts (`scripts/`)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 11. Bundled scripts (`scripts/`)
General tools from the test projects, cleaned up so they do not depend on a particular character. All motion, character and background numbers still come from the brief/project.

How to use them in a new project:
1. Copy this skill's `scripts/` folder into the project folder (for example `tools/mg/`). The copy in the skill is not changed; tool fixes are noted and brought into the skill through a skill update.
2. In the project module: `sys.path.insert(0, "tools/mg")`, then `import brush`, `from gait_engine import Gait`, `import space3d as R`, `import shadow3d as B`. Canvas = `brush.Canvas` (`brush.Surface(w, h).canvas`), shape = `brush.Path`, colour = `brush.color(hex)`.
3. Fill in your own character sizes: `Gait(body=dict(thigh=.., shin=.., sole_y=.., hip_y=.., shoulder=.., upper=.., fore=.., shoe=[..]), step=.., T=..)`, `shadow3d.PRIM`. The defaults in the scripts = the sample character in the 7.5-head canon on 5.78 H (`gait_engine.BODY`, `shadow3d.PRIM`, `space3d.HERO`; check the landmarks with `gait_engine.canon()`), not defaults to reuse.
4. Install once: `pip install -r scripts/requirements.txt` (numpy + Pillow only). `pip install skia-python` is optional, for speed; OpenCV is not needed. `MGP_BRUSH_ENGINE=pure|skia` forces an engine, `MGP_BRUSH_SUPERSAMPLE` sets the pure-engine supersampling (default 4). Run each script's demo once in the working folder to confirm the environment (numpy, Pillow, ffmpeg). Details: `scripts/README.md`.
5. `brush.py`, `image_ops.py`, `cavity.py` and `NOTICE` are copies from one source shared with the vector-character skill; do not edit the copies (sync flow in `scripts/README.md`).

| Script | Contents | Check/demo |
|---|---|---|
| gait_engine.py | Walk cycle engine from gait data (chapter 4.3): `Gait(body, **G)`, `pose(p)`, `arm(p, bag)`, `hip_y(p)`, `foot(p)`, `shoe_map`, `ik`; `BODY` (7.5-head canon), `canon(gt)` (landmarks in heads); `report`; skeleton strip | `python -I gait_engine.py report [param=value]`, `strip out.png 8` |
| spring.py | Periodic secondary motion (chapter 3.1): `spring`, `spring_to`, `pendulum`, `accel`, `Table.at(p)`; pre-roll 5 cycles, keep 1 cycle | `python -I spring.py demo out.png` |
| space3d.py | 3D background space (chapter 5.2): `Cam`, `Cam.orbit`, `cam_height`, `sun_dir`, `light2d`, `sprite`, `ground_poly`, `strip_xz`, `ellipse_xz`, `ring_path`, `mt_profile`, `haze_t`, `keepout`, `clearance`, `HERO` | `python -I space3d.py demo out.png` |
| shadow3d.py | Character shadow from the 3D pose + shade (chapter 5.3): `walk_prims(gt, p, load_arm, extra)`, `ground_matrix`, `draw_shadow`, `draw_contact`, `shadow_layer`, `shade_matrix`, `draw_shaded`, `mask_color`; `PRIM` (7.5-head canon) | `python -I shadow3d.py demo out.png` |
| render.py | `frames` (sub-frame motion blur, shutter 0.5), `parallel` (split ranges, 2 processes), `encode` (H.264 CRF 18 veryfast), `hstack` (labelled comparison), `sheet` (contact sheet); fn(t) returns a `brush.Surface` (or a `brush.Image`, an RGBA array; `skia.Surface` is accepted too) | `python -I render.py frames module:fn dir 0 24` |
| cavity.py | Gapcheck `still` (cavities + loose pieces + 15% silhouette) and `frames` (every animation frame); the same as vector-character (one source) | `python -I cavity.py frames module:fn 24` |
| brush.py | Vector drawing layer: `Surface`, `Canvas`, `Path` (+ `from_svg`), `Paint` (`blend` multiply, modulate, screen, ...), `linear_gradient/radial_gradient`, `Matrix` (perspective), `Font`, `Image`, pathfinder `union/intersect/subtract/exclude`, `measure`, `draw_svg`; skia or numpy engine | used by every script; examples in `scripts/README.md` |
| image_ops.py | numpy + Pillow image tools replacing OpenCV: `read/write`, `cvt_color`, `resize`, `gaussian_blur`, `warp_affine`, `connected_components`, `outer_contours`, `convex_hull`, `line`, `rectangle` | used by `cavity.py` |
| requirements.txt, README.md | Required packages (numpy, Pillow) + optional (skia-python); command list and engine choice | `pip install -r scripts/requirements.txt` |

Regression test against the test character pipeline (2026-10-30):
| Script | Result |
|---|---|
| gait_engine.py | `report` output identical; 240-phase pose (hips, knees, ankles, foot angle, arms) difference 0.0 |
| spring.py | Hair, bag, hem vs the project simulation: max difference 0, 9.7e-17 rad, 0 |
| space3d.py | Projection of 100 points x 5 azimuths, light2d, ring_path, mt_profile, cam_height (6.530327 H): difference 0 |
| shadow3d.py | Body prims over 24 phases (without the project's bag prim) difference 0; ground_matrix and shade_matrix identical |
| cavity.py | `still` and `frames` results identical to the project check (cavities, marker PNG, 15% silhouette) |
