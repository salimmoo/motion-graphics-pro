# Reference: Python rendering and project support files

Part of the `motion-graphics` skill. Read when: rendering with `render.py`, motion blur, parallel rendering, and setting up the project folder.

Moved verbatim from SKILL.md v2.3 (8. Render, 10. Support files per project); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 8. Render
- Python: frames are drawn with `brush` (the skia engine when skia-python is installed, otherwise numpy + Pillow; choose with `MGP_BRUSH_ENGINE`) -> PNG (`render.py frames`) -> ffmpeg H.264 CRF 18, preset veryfast, yuv420p, +faststart. 1920 x 1080, 24 fps. HTML/canvas compositions (`lib/` modules, chapter 13): mgp seeks `window.__seek(t)` per frame, then encodes with ffmpeg.
- Pixels are read with `Surface.array()` (always RGBA uint8 on both engines). Old code that calls skia directly must still use `toarray(colorType=skia.kRGBA_8888_ColorType)` (the default is BGRA -> swapped colours).
- Grain: a fixed seed for video (random grain per frame makes the file 16x larger and flickers).
- Motion blur: the average of n sub-frames within a 180-degree shutter (0.5 frame): walk/jump 4, martial arts 3, wave 2, still 1. An on-twos option (12 fps posterize) for a hand-made feel.
- Test a still/strip first; run the full render in the background (nohup), split over several parallel processes per frame range (`video - <dir> <start> <stop>`), then `encode`. When only one clip changes, re-render only that clip's frame range. 2-core workspace: 2 processes; a 3D scene about 2.7 s per frame (18 s animatic = about 20 minutes, final with 4 sub-frames about 40 minutes with 2 processes).
- Measure before optimising: timing per stage (sky, panorama, ground, shadows, sprites); on the skia engine the Python profiler does not count time inside skia functions; on the pure engine most time goes to numpy rasterisation (for drafts lower `MGP_BRUSH_SUPERSAMPLE`, for example to 2, then set it back to 4 for the final).
- Pathfinder through `brush.union` / `brush.intersect` / `brush.subtract`, not `skia.Op` directly. On the skia engine Op can raise a RuntimeError on complex paths/large coordinates: wrap it in try/except, try `brush.simplify`, fall back to a clip. The pure engine evaluates booleans per sample while drawing (no errors, no seams); `bounds()` of the result is an approximate box.
- Claude Code on Windows (8 cores) vs Cowork (Linux, 2 cores): parallel render with `python tools/par.py N a b command... {a} {b}` (replaces .sh scripts with /home/claude paths). Measured in the test project: 3D scene animatic 0.75 s per effective frame with 8 processes (Cowork about 2.7 s per frame per process, 2 processes); a multi-angle rig adds about 2-3 s per frame per process. Files go directly into the project folder, no zip between sessions (zip only when continuing in Cowork).
- Zero-pixel regression per machine: text labels and anti-aliasing differ between operating systems (max 2/255 in a scene); make new references per machine (`review/ref_win/`).

## 10. Support files per project
- Reusable general tools are in this skill's `scripts/` (chapter 11). What stays in the project: character sizes, character drawings, background layout, style/palette, take timeline.
- Keep in the project folder (not in the skill): motion clip scripts + reel render (`sheet`, `video - <dir> <start> <stop>`, `encode`), front/side rig, joint sweeps, gapcheck, regression sheet, reference taste notes, and the character spec (sizes, colours, motion parameters specific to that character).
- A style can be swapped without touching the rig (separate paint module, vector-character chapter 5 (`vector-character/references/rig.md`)); re-render the clips after a style change and re-run gapcheck.
- Walk cycle from data: the gait engine separate from the drawing rig (`gait.py report`), the drawing rig redrawn per frame (`walk_rig.py strip|frame`), and `walkcheck` per frame.
- One-take 3D scene (test project example): ruang.py (camera, projection, layout, keepout), gaya.py (palette + sprites + sky/panorama/ground/shadows + `render`), take.py (timeline + camera), bayang.py (3D pose shadows + shade on the character), animatic.py (`frames`, `sheet`, `report`, `clearance`), rig16.py (multi-angle rig), tools/rigcheck.py.
- Check tools that proved useful (test project): `tools/regresi.py` (pixel comparison + difference image), `tools/par.py` (parallel render), `tools/selip.py` (foot slip in the scene), `tools/sudut16.py` and `tools/detail16.py` (16 angles + hand/shoe zoom), `tools/tascek.py` (variant comparison per angle), `tools/stripsheet.py` (stacked strips).
