---
name: "motion-graphics"
description: "Vector motion graphics in code with After Effects principles, rendered to MP4/HTML: character rigs, gait-data walk cycles, one-take 3D backgrounds and camera orbits, shadows from 3D poses, kinetic typography, transitions, 3D human figure, ship berthing, chibi objects, lip-sync narrator, pixel art and origami motion; advanced principles (springs, inertia, constant-volume squash, rubberhose, 2.5D head, FACS, SLERP, rigid origami, Miura-ori, MoGraph fields, curve QC); JS library (lib/, mgp.motion) for HTML compositions rendered by mgp; Python scripts on numpy + Pillow. (ID: animasi motion graphics, rig karakter, walk cycle, tipografi kinetik, transisi, latar 3D, bayangan, lip-sync, benda chibi, pegas)"
---

# Motion Graphics (After Effects principles in code)

General rules for any character and project. To draw the character, use the vector-character skill first. This skill governs taste and motion. Traits and parameters specific to one character/project go in the project files, not in this skill. Palette, fonts and style always follow the brief/brand of the requested project (ask when there is none), never a fixed palette.

This file is the core: main rules, workflow, the 12 principles, and the quality check. Recipes and detailed numbers are in `references/*.md` and are read when their step comes up (the "References" table at the end); the old chapter numbers (e.g. "chapter 4.3", "chapter 9 item 1") are still used. Version history: `references/history.md`.

## 00. Main rules (Review Results, required)
1. **If it is better redrawn, redraw it.** A pose/shape the rig cannot reach cleanly is redrawn (pose-space or a new drawing), not fixed by moving points.
2. **Check EVERY frame, not the key poses.** gapcheck (holes + loose pieces) on every frame, a sweep per joint, a strip at 1/8 cycle.
3. **A regression sheet with every delivery** (vector-character chapter 11.2): one fix must not silently break another part.
4. **Measure the motion**: joint angle jumps per frame, leg reach (max 99%), foot slide (0.000 H), spring resonance.
5. **Be honest**: the feel of motion (choppy, stiff) shows most in video; write down what cannot be confirmed yet.
6. **Motion numbers from data + character size**: take gait numbers from a source (write the source and page), then convert them with formulas to the character's size. Assumptions are written as assumptions (for example a subject height not given in the source). When the user asks to "start from 0", do not use old project numbers as defaults.
7. **A shifted still drawing = sliding.** At a camera angle that has no rig yet, the character looks like it slides and its shadow is dead (Review Results, test character animatic v1). Label it clearly in the animatic as a placeholder, and always compute the character shadow from the 3D pose (chapter 5.3).
8. **Judge in the scene frame, stop when it gets worse.** Rig/drawing changes are judged in the scene frame (final camera distance, critical angle) side by side with the accepted version, at every step. When working on your own ("fix everything without confirmation"), work item by item and check the scene frame after each item; as soon as one frame looks worse, stop, report, and send a comparison. (Review Results, rig test project v4: fixes piled up, checked only on the angle sheet, the orbit frame was "wrecked".)
9. **Reply in the user's language.** For Indonesian users, write fully in Bahasa Indonesia; when you use the user-facing templates of motion-graphics-pro (T1 brief, gate messages, reports), take the ID variants in `motion-graphics-pro/references/template.id.md`.

## 0. Required workflow (before making anything)
Every learning source in chapter 1 (videos, taste notes) is a REFERENCE, not a style to copy exactly. Take the principles (taste, motion, timing, transitions), then combine them to fit the brief. Do not copy the characters, logos or signature compositions of the reference works.
1. Ask for the brief first (AskUserQuestion + the questions also written in chat): goal/main message, audience, platform and aspect ratio, duration, required brand/palette/fonts, available assets (logo, characters, footage, photos), text/narration/voice over, music/beat, deadline, examples liked and disliked.
2. Recommend 1 style that best fits the brief + the reasons.
3. Give a side-by-side comparison of 2-3 styles in a table. Columns: style, source reference, palette, shape/character, motion and timing, transitions, typography, strengths, weaknesses, best for. Then explain the pros and cons of each option one by one.
4. After the user chooses, confirm the style elements one by one (OK or not): colours (hex), typography, drawing/character style, motion (fps, on twos/fours, easing, intensity), transitions, camera, effects (grain, blur, glow), pacing and duration structure, audio, output format. Do not guess unconfirmed elements.
5. Only then produce in stages: style frame (still) -> strip/animatic -> full render. Send each stage for Review Results.
6. When the user is away (unattended) and the script is complete (style, location, shots, timing written down), the script = the brief. Write down the decisions taken at the start, then work without waiting.
7. A brief answer that can be read two ways (for example "a comparison of all three", "start from 0 without defaults", "further away for every take") is written out with both readings and asked about. Do not guess. When the answer is a visual number (camera distance, character size), send a comparison sheet (for example 8/10/12/14 H with the character height in percent), then ask.
8. "Style comparison" means visual examples (a style frame + a short clip per style), not only a table.
9. One-take camera video:
   - write the beats (character action, camera move);
   - map the existing assets vs those still to make (drawing angles, rig, background);
   - offer technique options (number of drawing angles for the orbit, multi-angle rig method);
   - ask the orbit direction per beat with a table of the angles passed + the number of rigs per option (angles relative to the character: 0 front, 90R right side, 180 back, 90L);
   - agree on multi-session stages: background research, 2-3 style frames, animatic, angle drawings + rig, render. Large productions start in a new session with a handover pack.
10. One-take animatic (Review Results, test project):
   - propose a timing table per beat (time, duration, character action, camera, speed) and get approval first;
   - render at 24 fps without motion blur, labels in the frame: beat, time, camera angle, drawing/rig used, action status (not rigged yet), timeline;
   - send the MP4 + a sheet of 12-15 key times; write down the visible weaknesses (drawings jumping between angles, actions not rigged yet).
11. File delivery: PNGs are sent as renders, MP4s and zips as attachments. When the user asks "where is it?", resend each file as a separate card with the file name in the caption, then repeat the question.

## 2. Motion principles (the 12 principles) with numbers
| Principle | Rule in code |
|---|---|
| Squash & stretch | Scale X x Y roughly constant: x = 100 + (100 - y) x 0.5; blink = eye squashed into a line |
| Anticipation | wind-up 0-10 f, transition 10-12 f, main action 12-30 f, settle 30-40 f |
| Slow in/out | ease in/out at every key pose; steep curve = fast |
| Arc | limb tips move on arcs (FK rotation), not straight lines; a head turn dips slightly in the middle; objects on a jump path rotate along the path (atan2) |
| Follow-through/overlap | children lag 2-5 f or valueAtTime(time - 0.05); hair lags the head; tail segments lag 2-3 f per segment (estimate) |
| Secondary | separate layer, time offset, supports rather than competes |
| Timing | 2-4 f sharp, 6-8 f fast, 12-15 f normal, 20-30 f heavy, 40 f+ dramatic; 24 fps cinematic, 30 fps smooth; a whole action can be 20 f, the biggest move within about 3 f, then ease to the peak |
| Exaggeration | 20-50% above realistic; may break physics |
| Smear | on the fastest frame, the moving tip is stretched along the motion for 1 frame |
| Overshoot | amp 15, freq 3, decay 5: value + amp sin(t freq 2 pi)/exp(t decay) after the last key |
| Bounce | amp 80, freq 3, decay 8 |
| Staging | one focus; blur/dim the secondary; DOF locked on the subject + vignette |
| Appeal | silhouette readable in every pose; the last frame is never fully still (eyes opening slightly, scale growing slightly) |

Advanced principles v2.4 (details, API and QC numbers in `references/advanced-principles.md`; used during spline and QC):

| Principle | Use | API |
|---|---|---|
| Physical springs | Replace overshoot/bounce numbers with named presets: `bouncy` (ζ 0.45, 21% overshoot), `snappy` (ζ 1, no overshoot), `heavy` (ζ 1.5) | ease `"spring.bouncy"`; `mgp.motion.spring(name)`; `MGP.core.springPhys` |
| Inertia | Damped bounce from the arrival speed when an object stops | `mgp.motion.inertia(vars, options)`; `MGP.core.inertia` |
| Chained delay | Follow-through/overlap per index (hair, tails, rows) | `MGP.core.delay` / `delayChain`; stagger |
| Constant-volume squash | sx·sy = 1 (the old chapter 2 formula errs by ±20%) | `MGP.core.stretch`, `stretchDirection`; check with `mgp curves` |
| Constant stroke | Lines do not thicken when the character is scaled | `strokeFixed`; SVG `vector-effect="non-scaling-stroke"` |
| Rubberhose | Bendy arms/legs with a fixed length | `MGP.core.rubber`; `character-styles` `limbs: "rubber"` |
| 2.5D head, FACS | Head turns from 5 poses; expressions from Action Units | `MGP.face` (`poseHead`, `EMOTION`, `auAt`) |
| SLERP | 3D camera/joint rotation without gimbal | `MGP.core.slerp`; `sceneTanker` `cameraInterp: "slerp"` |
| Rigid origami | Rigid hinge folding, Maekawa/Kawasaki validator; default origami character style `origamiStyle: "rigid"` (`"old"` = v2.3) | `origamiFold.validatePattern`, `paperFoldTransition` `rigid: true`, `MGP.foldPattern` (Miura, Yoshimura, Kresling) |
| Fields | Cloner + effector + falloff field (MoGraph) | `MGP.field` |
| Curve QC | Value/speed graphs; flags linear, pop, abrupt, volume | `mgp curves <composition.html>` |

## 9. Quality check (required before delivery)
0. gapcheck EVERY frame (holes + loose pieces) and a regression sheet against the previous delivery. 1. No foot sliding (3 consecutive frames). 2. A strip per 1/8 cycle + a contact sheet of every clip. 3. Measure the numbers: wrist jumps per frame, max leg reach (<= 99%), penetration (0.000 H). 4. Loops without jumps. 5. Readable text: text colour contrasts with the background, holds long enough. 6. Palette, fonts, motion and transitions as confirmed in chapter 0. 7. A sweep per joint without shape jumps (armpit, shoulder, knee). 8. Check the whole figure part by part with zoom, not only the part being fixed. 9. Motion not in unison; the last frame not dead. 10. Write down the weaknesses still visible when delivering. 11. Walk cycle: gait report (chapter 4.3) + walkcheck on every frame + a list of legitimate gaps. 12. Package test: zip, extract to a new folder, re-render, compare pixels with the delivery. 13. 3D scene: camera path clearance (0 tall objects < 1.5 H from the camera), deterministic render (regression reference frames with 0 pixel difference), character shadow follows the pose. 14. Multi-angle rig: gapcheck every frame at every angle + a 360-degree turn video. 15. Rig in the scene: frames at critical angles (0, 90, 180, 270 + the hardest) side by side with the accepted version, proportions measured in H in the frame (rule 00.8). 16. Foot slip in a perspective scene max 1 px per stance phase (`tools/selip.py`), without changing proportions.
17. Motion curves after the spline pass (`mgp curves`): no accidental linear motion, breaks only at impacts/contacts/cuts, squash with constant volume (reference numbers in `references/advanced-principles.md`).

## 13. `lib/` module library and rendering (short)

- `lib/dist/mgp.js` contains every `MGP.*` module (one `<script>`, runs from file://); the timeline uses **mgp.motion** (`lib/motion/motion.js`, the package's own animation engine; main API `mgp.motion.timeline/to/fromTo/set`, `gsap` is only a compatibility alias for old code). Module list, contract and examples: `references/lib.md` and `lib/README.md`.
- New project: `mgp new <folder>` (motion-graphics-pro skill) copies `mgp.js`, `motion.js` and fonts into `assets/`. Without it, copy `lib/dist/mgp.js` into the project folder (mgp only serves files under the composition folder).
- Full-canvas composition: `MGP.core.expose(inst)` sets `__duration`, `__seek(t)`, `__timelines["main"]`, `__ready`; write `window.__fps = 24`. mgp: `mgp check`, `mgp contact --n 12`, `mgp curves`, `mgp render --fps 24 --workers 2` (no `npm install`).
- New module: `MGP.core.defineModule(...)`, then `node lib/build.js` (writes `dist/` + `index.mjs` and tests that every file loads). JS files ASCII only.
- Python rendering (`scripts/render.py`) and mgp can be mixed (`references/render.md`, `references/lib.md`).

## References (read when the step comes up)

| File | Read when | Old chapter |
|---|---|---|
| `references/advanced-principles.md` | Spline, springs, inertia, delay, constant-volume squash, rubberhose, 2.5D face/FACS, SLERP, rigid origami, Miura/Yoshimura/Kresling, fields, QC with `mgp curves` | v2.4 |
| `references/sources.md` | Looking for the origin of a rule or an AE technique | 1 |
| `references/taste.md` | Style stage (chapter 0 items 2-4), palette, composition, typography | 1.1, 1.2 |
| `references/rig.md` | Anchors, parenting, poses, corrective joints, blocking hold keys, hair/cloth springs | 3, 3.1 |
| `references/walk.md` | Walk/run cycles, wave, kick, jump, sit, object animation, gait from data + gait engine | 4, 4.1, 4.2, 4.3 |
| `references/backgrounds.md` | Living backgrounds, detailed backgrounds, one-take 3D orbit space, character shadows from the 3D pose | 5, 5.1, 5.2, 5.3 |
| `references/typography-transitions.md` | Kinetic typography, transitions, camera, orbit with a 2D character, effects, pacing | 6, 7, 7.1, 7.2 |
| `references/render.md` | Python rendering (`brush`, motion blur, parallel, pixel regression) and project support files | 8, 10 |
| `references/scripts.md` | Using `scripts/` (gait_engine, spring, space3d, shadow3d, render, cavity, brush, image_ops) | 11 |
| `references/scene-recipes.md` | 3D human figure, berthing tanker, chibi objects, lip-sync narrator, pixel art and origami motion | 12.1-12.5 |
| `references/lib.md` | `MGP.*` module list, composition contract, rendering with mgp | 13 |

Old chapter map: 00, 0, 2, 9 = this core · 1 = sources · 1.1-1.2 = taste · 3 = rig · 4 = walk · 5 = backgrounds · 6-7.2 = typography-transitions · 8, 10 = render · 11 = scripts · 12 = scene-recipes · 13 = lib (short version in the core). Other skills: `vector-character` chapter N is mapped in the vector-character SKILL.md; `motion-graphics-pro` chapters/T are mapped in the motion-graphics-pro SKILL.md section 7.
