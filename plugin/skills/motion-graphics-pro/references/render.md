# References: rendering with mgp

Part of the `motion-graphics-pro` skill. Read when: writing a composition (contract, collage pattern), installing the requirements, and running mgp commands.

Moved verbatim from SKILL.md v2.3 (chapter 11 Rendering with mgp, old name: Rekam); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 11. Rendering with mgp

11.1 **Contract** (the HTML composition format that mgp reads; compatibility with old compositions is in 11.7): timed elements have `class="clip"`, `data-start`, `data-duration` and show during [start, start + duration); video length = the root's `data-duration`; every composition registers one paused timeline after its tweens (`window.__timelines["<data-composition-id>"] = tl`); no `Date.now()`, unseeded `Math.random()`, fetch, timers, or `repeat: -1`; `display`/`visibility` are not tweened on a `.clip`; elements transformed by mgp.motion have no CSS `transform`; every `<audio>` has an `id`; every font uses an mgp bundled font (`mgp new` copies the chosen ones to `assets/fonts/` + `fonts.css`) or an `@font-face` pointing to `assets/fonts/`; asset paths are `assets/<file>` without a leading `/`; scenes are written in a `<template>` with root `#root`, and host id = scene root id = timeline key; scenes use `fromTo`, not `from`. Collage grain = a seeded PNG, not a footage treatment.

11.2 **Collage pattern** (T7). mgp seeks the timeline per frame, so `mgp preview` = the render result.
- Every piece = an `<img>` with a fixed id (editable in `mgp studio`); the T6 data is written inline by a Python build script.
- One mgp.motion proxy tween runs `draw(t)` through onUpdate; draw(t) computes the pieces from tq and calls `mgp.motion.set` (the old alias `gsap.set` still works). The T8 text tweens go into the same timeline.
- A frame sequence is stacked as separate `<img>` elements and only one has opacity 1; `src` is not swapped while seeking.
- A scene that looks still/empty on an `mgp contact` sheet is moved to a listener on the `mgp-seek` event (the old names `rekam-seek` and `hf-seek` are still dispatched) or to `window.__seek(t)`. The root gets `data-fps="24"`; 16:9 (1920 x 1080) is recomposed, never squeezed.

11.3 **Requirements and installation** (once per computer).

| Needed | For | Notes |
|---|---|---|
| Node.js 22+ | mgp, `lib/build.js` | `node --version` |
| ffmpeg + ffprobe on PATH | Encoding, audio, QC | Or env `MGP_FFMPEG` / `MGP_FFPROBE`; Windows: `winget install Gyan.FFmpeg` |
| Google Chrome, Microsoft Edge, or Chromium | Frame capture browser | Found automatically (including a Chromium downloaded by Playwright if one happens to be there); another path through `--browser <path>` or env `MGP_BROWSER`. mgp does not download a browser |
| Python 3.10+ with numpy + Pillow | Cutout, magenta key, T6 build, other skill scripts | `pip install -r scripts/requirements.txt`; skia-python and OpenCV are not required |
| Local voice/image engines (optional) | Voice clone, free local images | Once per computer: `mgp install voice` / `mgp install image` (venv + models, not in the ZIP); `mgp doctor` suggests the route (`references/hardware.md`) |

```bash
cd <this skill folder>/render
node bin/mgp.mjs --version           # no npm install: the CDP client, 24 fonts and mgp.motion are bundled
```

Below, `<skill>` = this skill's folder, and `mgp` = `node <skill>/render/bin/mgp.mjs` (or run `npm link` once in `render/` so the `mgp` command is available everywhere). Everything runs locally: no account, no cloud. Option details and the contract: `render/README.md`.

A new project is opened with `mgp new <folder> [--aspect 9:16|16:9] [--fps 24] [--duration 30] [--title "..."]`: standard folders, `brief.md` (T1), `STATUS.md` (T10), `project.json` (`references/project.md`), and an `index.html` that already loads `assets/js/motion.js`, `assets/js/mgp.js`, and the bundled fonts through relative paths (works from file:// and through mgp).

11.4 **Commands** (from the project folder; on Windows run them in PowerShell):

```bash
node <skill>/render/bin/mgp.mjs check index.html               # contract, duration, size, 404, fonts, risky patterns, determinism
node <skill>/render/bin/mgp.mjs check index.html --json
node <skill>/render/bin/mgp.mjs contact index.html --from 0 --to 5.2 --n 8 -o review/contact_s03.png
node <skill>/render/bin/mgp.mjs frame index.html --t 2.4 --scale 2 -o review/f_2.4.png    # edge crop from a 2x capture
node <skill>/render/bin/mgp.mjs preview index.html --open      # scrubber at http://127.0.0.1:4600
node <skill>/render/bin/mgp.mjs render index.html --from 12.5 --to 18 --size 540x960 --crf 26 --preset veryfast --workers 4 -o review/s03_v2.mp4
node <skill>/render/bin/mgp.mjs render index.html --workers 4 -o out/<name>_9x16.mp4
```

| HyperFrames command (for those moving over) | mgp |
|---|---|
| `npx hyperframes lint` / `check --json` | `mgp check index.html` / `mgp check index.html --json` |
| `snapshot --composition s03 --range 0,5.2 --frames 8` | `mgp contact index.html --from <data-start s03> --to <+5.2> --n 8` |
| `snapshot --at 1.2,2.4 --zoom '<x,y,w,h>'` | `mgp frame index.html --t 1.2 -o f.png` (once per time; `--scale 2`, then crop) |
| `preview` | `mgp preview index.html --open` |
| `render -c compositions/s03.html --quality draft` | `mgp render index.html --from <start s03> --to <end s03> --size 540x960 --crf 26 --preset veryfast --workers 4` |
| `render --quality delivery` | `mgp render index.html -o out.mp4` (H.264 CRF 18; `.mov` = ProRes 422 HQ, `--format prores --transparent` = 4444 alpha) |
| `transcribe`, `normalize-audio`, `add`, `catalog`, Studio/desktop app | `mgp transcribe` / `mgp align`, `mgp audio normalize` / `measure`, `mgp add` / `mgp catalog`, `mgp studio` |

Already in mgp: text fitting `window.__mgp.fitTextFontSize` / `measureText` (old name `window.__hyperframes.*`), variables `data-var-*` + `--var` / `--vars`, looks/LUTs (`mgp media`), transcription and alignment, blocks (`mgp add`/`catalog`), Studio, and 24 bundled fonts. Not included: `pretext` and cloud render/publish; for those, text size can still be computed by hand (`getBBox` / `measureText` after `document.fonts.ready`).

After a render: the file is not empty, the ffprobe duration = the root's `data-duration` (`ffprobe -v error -count_frames -show_entries stream=nb_read_frames,duration -of compact out.mp4`), the decoded frames are looked at; `mgp render --hash` twice with the same hash = a deterministic render. A full render only after the word "render"; before the delivery render, `mgp preview` is opened for the user, and the user is told that the composition can be edited with `mgp studio`. Python stays for cutouts, anchors, grain PNGs, the HTML build from T6, and the audio mix; visemes from per-letter timing (6.8); Rhubarb Lip Sync 1.14.0 is only a fallback.

11.5 **Motion module library** (skill `motion-graphics`, folder `lib/`; list and contract in `motion-graphics` chapter 13 (`motion-graphics/references/lib.md`) and `lib/README.md`). Before writing canvas motion from scratch, check the modules that already exist: 3D characters + gait, shadows from poses, a one-take 3D park, a docking ship, vector/pixel/origami character styles, a folding crane, a vector character kit, paper-fold and motivated transitions, chibi objects, lip-sync, route maps, kinetic typography, springs, particles, constellations.
1. Copy `lib/dist/mgp.js` (every module; `mgp new` already copies it) or `lib/dist/mgp-packs.js` (packs only) to the project's `assets/js/`: mgp only serves files under the composition folder (`--root` changes that).
2. Full-canvas composition: `MGP.core.expose(inst)` fills `window.__duration`, `__seek(t)`, `__timeline`, `__timelines["main"]`, and `__ready`; mgp uses `__seek` as the first driver. **Driver + blocks pattern:** when the page uses `window.__seek` (or `__timeline`), mgp v2.4 still seeks every sub-composition timeline in `window.__timelines` (blocks from `mgp add`, scenes) first, then calls `__seek(t)`, so `__seek` may override them (e.g. blocking mode). The driver must not seek the block timelines again with another time. Other renderers (HyperFrames, older versions of this renderer) only seek that driver: `mgp add` blocks on a page with `__seek` stay still there. For a composition that must be portable, register the main timeline in `window.__timelines["<root id>"]` without `__seek` and draw the canvas from that timeline's `onUpdate`. `window.__mgpNoSubSeek = true` turns off the sub-composition seek. Several modules: one object `{ duration, ready, seek(t) }` that calls each module's `seek`, then `expose`. Write `window.__fps = 24` (or `data-fps`) so the fps does not fall back to the default 30.
3. In a T7 scene: the module draws into a `<canvas>` inside the scene's `#root` and is called from the scene's `draw(t)` through `MGP.<module>.render(ctx, t, options)` or `inst.seek(t)` with local time, so there is still one timeline per composition.
4. Quick check of a module or pack: `node <skill>/render/bin/mgp.mjs contact <motion-graphics folder>/lib/examples/<module>.html --n 12 -o contact.png`.

11.6 **Canvas composition without a timeline** (test 01-11-2026): a canvas page only needs to fill `window.__duration` and `window.__seek(t)` (smallest example in `render/README.md`), then `mgp render`. JPEG/PNG sequences made by other tools (e.g. `render.py` of the motion-graphics skill) are assembled with ffmpeg:

```bash
ffmpeg -y -framerate 24 -i fr/f%04d.jpg -i mix.wav -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out.mp4
```

On Windows, render commands are run in PowerShell.

11.7 **Compatibility.** Compositions written for the HyperFrames format render without changes; the old names are still accepted next to the neutral names. The full table (`data-*` attributes, `window.__timelines`, `window.__mgp` = `window.__hyperframes`, event `mgp-seek` = `rekam-seek` = `hf-seek`, `__mgpLottie`/`__mgpAnime` = `__hfLottie`/`__hfAnime`, global `mgp.motion` (old name `Gerak`) = alias `gsap`, block field `aliases` = `nama_lama` = `hyperframes`) is in `render/README.md`, section "Compatibility". New compositions use the neutral names.
