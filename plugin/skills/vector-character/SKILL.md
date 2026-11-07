---
name: "vector-character"
description: "Draw vector characters in code (Python, brush drawing layer: numpy + Pillow, skia-python optional) for illustration/animation: one silhouette + cut lines or flat vector layered per material, reference tracing, front / 3/4 walking / side walking / back views, multi-angle rig (loft from front + side, wrap-around hairline, hands per angle, world sun), end-to-end character constructor kit (2D piece rig front/side/back/3/4, proportion mode, style layer, expressions + 12 visemes, whole-arm gestures + grips, 5-view turnaround, kit sheet), hair measured from the reference (not a wig), proportions, face, hands, shoes, shading, self-check on the sheet AND in scene frames, pixel art and origami variants of one rig, JS character kit for video. (ID: tokoh vektor, karakter, siluet, garis potong, tampak samping, rig, kit tokoh, ekspresi, gestur, rambut, cek mandiri)"
---

# Vector Character (drawing characters in code)

General rules for any character (people, workers, mascots, illustration characters, animated characters). Distilled from 27 videos (Cosmin Serban, Jess/Envato, Audrey Stemen/School of Motion, Neda Draws, Mark Rise/Gigantic, Fd4IOI-82CQ, Ben Marriott, Puppet Warp Adobe) and the Review Results of several character projects. Features, sizes and colours specific to one character are NOT written in this skill; they are measured from that project's brief/references and recorded in the project files (character spec). To animate the character, continue with the motion-graphics skill.

This file is the core: main rules, work order, method, tools, review and self-check. Details per body part, rig, style, trace, views, multi-angle, scripts and kit live in `references/*.md` and are read when the step comes up (the "References" table at the end); the old chapter numbers (e.g. "chapter 16.1", "chapter 11 item 9") are still used. **Before drawing the first character in a session, read `references/mistakes.md`** (old chapter 0: mistakes that must not be repeated). Version history: `references/history.md`.

## 00. Main rules (Review Results, required)

1. **Redraw, do not nudge points.** If a shape is wrong (especially in a certain pose), redraw that shape for that pose (pose-space) or draw a new one. Nudging numbers over and over is forbidden.
2. **Measure, do not judge at a glance.** Proportions are checked with numbers (arm width perpendicular to its axis at several points, landmark positions, leg reach), not by looking at the full sheet.
3. **One fix must not break another part.** Every delivery must include ONE regression sheet (chapter 11.2) holding every spot ever complained about, compared with the previous sheet.
4. **Hidden parts must exist.** Everything covered (under the hair, under the sleeve, the back under the hair) is drawn, because when the part in front moves, the background shows through.
5. **Do not send what already looks broken in your own zoom.** Fix it first or state honestly that it has not passed.
6. **Per-character spec goes in the project files, not in the skill.** Typical sizes (accessory thickness, sleeve width, hair parting side, hand length) are measured from that character's reference and written as constants in the project code/notes.
7. **Check in the scene, not only on the sheet.** Every shape/rig change is checked in a scene frame at the final camera distance, at the critical angles (0, 90, 180, 270 + the hardest angle), side by side with the accepted version, BEFORE moving to the next fix. Stop long autonomous work and report as soon as one scene frame looks worse than the accepted version. (Review Results, rig v4 test project: a dozen stacked fixes checked only on the angle sheet and zooms; the front/back orbit frames were "wrecked": long thin legs, narrow body.)
8. **Copy the reference = measure the reference.** When the user says "copy the kit"/"not alike yet", do not guess and do not ask "what is missing": measure the reference yourself (colour masks, width per row, hairline per x, the correct H height), overlay its outline on the character at the same H scale (`scripts/measure_ref.py`), then change the shape to those numbers. Always send reference / old version / new version side by side. (Review Results, kit test project: the hair was redrawn 6 times from rough numbers and stayed a "wig"; it was solved after measuring.)
9. **Reply in the user's language.** For Indonesian users, write fully in Bahasa Indonesia, and render user-facing templates (T1 brief, gate messages, reports) in Indonesian using the ID template variants.

## 1. Work order (required)

1. Read the brief + previous notes (HANDOVER, PROGRESS, character spec) word by word. If there is a character reference image: trace (chapter 12). If there is a video reference, look at its key frames (Chrome: seek `video.currentTime`, zoom the player area).
2. Gesture: line of action, pose, weight support. Contrapposto only subtle; for a male worker character use a neutral upright stance (safer for the rig).
3. Human proportion grid ("our proportions", 7.5-head canon; the numbers = `loft.CANON`, the same as `gait_engine.canon()` in the motion-graphics skill): chin 1 H, nipples 2 H, navel 3 H, crotch 3.75 H (1/2 of the height), knee 5.625 H (1/4 of the height from the floor), elbow at navel height (3 H), wrist at crotch height (3.75 H), fingertips 4.7 H (mid-thigh), ankle 7.15 H, sole 7.5 H; shoulder width 2 H outside the deltoids (+-1.0 H from the centre line), hips 1.5 H, waist 1.1 H, neck 0.5 H, foot 1.1 H. Comparison style Audrey/Cosmin: small head, long thin neck, wide square shoulders, long legs.
   - Character without a reference: first write the pose skeleton as measured points in H (hip, knee, ankle, shoulder, elbow, wrist, head). Thigh and shin each about 1.75 H, upper arm about 1.35-1.45 H, forearm about 1.15-1.2 H (CANON from the shoulder top: upper arm 1.5 H, forearm + hand 2.0 H); check the lengths with numbers before drawing.
4. GRAYSCALE SILHOUETTE first (Jess). Three-panel review sheet: (1) gesture + grid + bones, (2) one silhouette path with anchors/handles + cut lines, (3) grayscale per region. Plus a close-up sheet of face + hands. Send to the user BEFORE colour.
   - First ask the user the form of the first delivery: grayscale silhouette or straight to full flat after passing the self-check (the test project chose full flat directly).
5. Cut lines + colour (5-6 colour palette) -> colour sheet (full body + close-up of face/hands).
6. Shadows + little, purposeful detail.
   - Self-check the risky spots (chapter 11) in every delivery.
7. Rig + sweep test of every joint (chapters 5, 8). Shoulder/joint check sheet for all poses.
8. Side / 3/4 view = NEW DRAWING (not a rotation/warp of the front view); if there is a reference, trace (chapter 12). Review the silhouette again. If the reference does not contain that view (side, back): chapter 15.
9. Character kit style (character constructor kit): the order differs from steps 4-8 (the flow proven in the test project): (1) ALL pieces first, following the kit sheet layout (head per angle + expressions, front/side/back/3/4 rig, hand-gesture set, mouth set); (2) set proportions in PROPORTION MODE (same geometry, gray per material, paint layer off) + a proportion check block (temporary assembly of all rigs with the same landmark lines); (3) only then apply the skill style (palette, lines, contact) as the paint layer; (4) only then assemble the turnaround and poses. Detail of stage (1): build a PIECE KIT per view (front, then side and 3/4) from body parameters (chapter 5.1): head, body + neck + collar, pelvis, upper arm, forearm + cuff, hand, thigh, shin + hem, ankle, shoe, back hair. Send an explode sheet (pivot points) + assembly. Turnaround, poses, gestures = ASSEMBLIES of those pieces, not separate drawings. (Review Results, kit test project: a front view drawn as one painting was rejected as a workflow: arms stuck to the body, not riggable.)
10. Motion (motion-graphics skill). For orbit/many angles: offer the method options (new drawing per angle, full 3D rig, hybrid) in a table, then test the concept at 3 new angles before production (chapter 16).

## 2. One silhouette + cut lines method (core)

Cosmin (jlxdo9iUyjA 3:22): "create one big shape and then mask it whatever we need".
- Geometry in H units (head height; skull top y 0, chin y 1, sole about 7.5), x = 0 centre line, y downward. `Space(ox, oy, H)` maps H to pixels, so one drawing can render at any scale.
- Draw ONE closed path for the whole figure (head to sole), clockwise: smooth anchors `s(x, y)` (automatic Catmull-Rom handles) + corner anchors `c(x, y, r)` with live radius. Few anchors (about 110-120 for a front body, 70 for a profile). Flowing curves: shoulder to arm to wrist to hand; thigh to shin to ankle to shoe.
- Hands are built with Shape Builder and then United into the silhouette (still one silhouette; the body path only has a "wrist stub" hidden in the palm).
- Colour parts = pieces of the silhouette: silhouette intersect a knife shape (hair/hat, face, neck, inner shirt, collar, outer garment, belt, trousers, shoes, sole, hands). Knife = a large polygon (BIG = 3-8 H) with one side being the cut line. Because they come from the same shape, edges meet exactly.
- Anti-alias seams are closed with a thin stroke (0.9 px) of the same colour on every region.
- Shadows are also pieces of the silhouette (side away from the light, under the chin, under the cuff, under the trouser hem on the shoe).
- Hidden roots: the forearm comes out from INSIDE a wider cuff; the trouser hem covers the shoe collar with a cast shadow.
- Side view:
  - body = one path (head, face profile, neck, chest, belly, near leg, shoe, calf, buttocks, back, nape);
  - far leg + far arm = a layer behind (about 20% darker), near arm in front, because the limbs swing past the body when walking;
  - the leg profile piece is shared by the near and far leg, so both are identical.
- Side view, arm: the sleeve root = a circle (r about 0.25 H) at the shoulder pivot, staying round at every swing angle. Sleeveless outer garment (vest): armhole = an ellipse the size of the sleeve, filled with the inner shirt; the shoulder strap only covers the shoulder top.

## 6. Code tools

- Python 3.10+ with numpy + Pillow only: `pip install -r scripts/requirements.txt` (Linux workspace: add `--break-system-packages` if needed). Draw through `brush` (chapter 17): skia engine automatically when `skia-python` is installed (`pip install skia-python`, optional, faster), otherwise the pure numpy engine; force it with `MGP_BRUSH_ENGINE=skia` or `MGP_BRUSH_ENGINE=pure`, pure-engine supersampling `MGP_BRUSH_SUPERSAMPLE` (default 4; 6-8 is smoother). Images through `image_ops`; OpenCV is not needed. Fonts: Poppins (titles), Inter (Aptos is not in the workspace); the pure engine renders text with Pillow.
- Windows (Claude Code on Windows): `python -m pip install -r scripts/requirements.txt`; command `python -I`, not `python3`; ffmpeg via `winget install Gyan.FFmpeg`; engine variable in PowerShell: `$env:MGP_BRUSH_ENGINE="pure"`. Per-user fonts (HKCU registry + `AddFontResourceW` + WM_FONTCHANGE broadcast) are only seen by skia after the font cache is refreshed; on the skia engine check with `skia.Typeface(name).getFamilyName()` (silent fallback to Segoe UI). The pure engine (`brush.Font`) looks up the font file by name in the system and per-user font folders, then silently falls back to Arial/Segoe UI; check with a test text sheet.
- Regression "pixel difference 0" only holds on the same engine: Linux vs Windows differ in label text (font rasterisation) and max 2/255 in scenes. Changing engine = make a new reference once, after checking that this is the only difference. Code that picks from tied float values (same width, same angle) can differ between engines: use comparisons with an eps.
- Pathfinder (skia engine): `subtract(a, intersect(b, a))` leaves hair-thin slivers on coinciding edges. Subtract with a shape that juts outward (the original polygon), not with the intersect result.
- Proportion mode without touching the drawing code: wrap `Fig.fill/shade/ink` (base colour -> gray per material via a table, lines and contact shadows skipped), so the proportion sheet and the style sheet always come from the same geometry.
- Contour morph: render the path to a mask (2000 px/H, `Surface.array()`), `image_ops.outer_contours` (equivalent of findContours RETR_EXTERNAL), force clockwise (signed area), start at the top-centre point, resample N points (e.g. 72) by arc length, then lerp between keys. Mirror = reverse the index order (`o[-i]`) then negate x, so it stays clockwise from the same start point.
- Anchors S (smooth) and C (corner + live radius); pathfinder via `brush.union` / `brush.subtract` / `brush.intersect` (`vkit.union` / `diff` / `inter`); mirror for symmetric shapes; tapered capsules; `brush.measure(path)` (contours with `length` and `pos_tan(d)`) to sample an outline; stroke -> path (vector morphological closing): on the skia engine `Paint.getFillPath` through the skia object (`brush.Paint(...).to_skia()`), on the pure engine the thick stroke is drawn to a mask, then `image_ops.outer_contours`.
- Limb tube: Catmull centre line + SEPARATE left and right half-width profiles (calf/biceps fuller on one side), ends rounded or cut.
- Removing outlines without changing the painter code: a canvas proxy that drops strokes in the outline colour.
- Pixels are read with `Surface.array()` (RGBA uint8 on both engines; `vkit.to_array`). Old code that uses skia directly still MUST use `toarray(colorType=skia.kRGBA_8888_ColorType)` (default BGRA -> swapped colours).
- Project modules take a `brush.Canvas` (`cv`) and build shapes with `brush.Path` (via `Fig.pen` / `poly` / `ellipse`), not `skia.Path`. On the skia engine the canvas still forwards the original skia methods (`cv.drawPath`) for old code, but new code uses the brush API so it runs on both engines.
- For video/HTML compositions the character kit and character styles also exist as JS modules in the motion-graphics skill: `lib/vector-kit.js` (`MGP.vectorKit`: views and turnaround, 8 expressions, 12 lip-sync mouths, 8 gestures, proportion mode, flat/cut/gray styles) and `lib/character-styles.js` (`MGP.characterStyles`: vector, pixel art, origami from the same gait engine), rendered with mgp (motion-graphics chapter 13 (`motion-graphics/references/lib.md`)). The chapter 00 rules and chapter 11 checks still apply to the result.
- Render review PNGs; video via ffmpeg H.264 CRF 18 preset veryfast, 24 fps.
- Helper scripts kept per project: review sheets (silhouette, colour, detail), regression sheet, gapcheck (holes + loose pieces), arm width measurement (armw), zoom crop per part.
- General tools (drawing kit, multi-angle loft, gapcheck, zoom sheet, SVG measurement) are in this skill's `scripts/` (chapter 17).
- Measure shapes from a finished drawing: render one path to a mask (200 px/H), take xmin/xmax per row (`extents`) for the loft (chapter 16).
- A Fig with a dummy canvas (8 x 8 surface) is used to get paths from a painter function without drawing into the delivery.

## 7. Review with the user

- Send the grayscale silhouette first + face/hand close-ups, then one large colour pose, only then other poses.
- Before sending, check the WHOLE figure part by part with zoom (render 1.5-6x): head/hat, face, neck, left-right shoulders, armpits, elbows, hands, waist, hips, crotch, knees, shoes. Do not only fix the part that was complained about ("are you even looking at the whole thing?").
- Compare side by side with the style reference at the same scale before sending.
- For a rig: render a sweep video per joint (e.g. arm 0-120-0 degrees) + a strip every 10-20 degrees, not only key poses. For a multi-angle rig: angle sheet (0, 22.5, 45, 67.5, 90, 135 + references 45 and 90 side by side), walk strip per angle, 360-degree turn video while walking.
- Measure before fixing: find the cause with numbers (position, distance, jump per frame), write the cause down, only then change.
- User comments are short; translate them into shapes:
  - "picak" = concave/flat;
  - "banci" = feminine gesture;
  - "asal-asalan" (sloppy) = wrong construction, not lack of detail;
  - "tidak simple" (not simple) = too much detail/texture/lines, unclean contour;
  - "kurusan" / "terlalu kurus" (too thin) = body or limb width smaller than in other views or than the reference (measure first, compare across views);
  - "lengannya turun" / "nggak seimbang" (arms dropped / unbalanced) = arm root below the shoulder line or shoulders too sloped;
  - "meluncur" (sliding) = still drawing shifted, feet not planted (needs a rig at that angle);
  - "bayangannya tidak berubah" (the shadow does not change) = shadow does not follow the pose (needs shadows from the 3D pose).
- If the user asks for autonomous iteration: repeat render -> zoom -> fix until it passes on its own, then send.
- Write the weaknesses that are still visible honestly in every delivery. Ask in chat + interactive options.
- Write progress in PROGRESS.md; handover in HANDOVER.md + code archive.

## 11. Self-check of risky spots (REQUIRED before every delivery)

Review Results: the user does not want to repeat the same fix request. Every render is checked and fixed by yourself first; send only when every item passes, or state honestly which items have not passed.

Flow: render -> numeric check script -> zoom crop 3-6x per part -> fix -> repeat until it passes -> send with the check results table.

| No | Risky spot | How to check | Pass criterion |
|---|---|---|---|
| 1 | Proportions across views | Horizontal guide lines on the sheet: head top, eyes, chin, shoulders, elbows, shirt hem, wrists, knees, sole | Landmarks at the same height in all views (max 0.02 H difference) and the same as the reference |
| 2 | Hand + arm length | Measure fingertips and wrist in H | Fingertips about mid-thigh / per reference; hand 0.64-0.76 H; do not shrink the hand |
| 3 | Arm width vs body | Ratio upper arm width : body width, compared with the reference | Max 10% from the reference; no arm-body gap that makes the arm look small |
| 4 | Fingers | Zoom 6x | 4 fingers + thumb read clearly, relative length 1.00/0.94/0.92/0.75, no merged/cut fingers |
| 5 | Hand direction | Compare left and right hands | Mirror each other; thumb and palm direction per reference/pose |
| 6 | Shoulders + armpits | Zoom + joint sweep (chapters 7, 8) | Shoulders round, not flat/lumpy; armpit without webbing; changes continuously |
| 7 | Head | Zoom the head in each view | Round cranium (not flat in profile); hair covers the skull and wraps around the ear; hat wraps the occiput |
| 8 | Face | Zoom 4x | Eyes on the 0.51 H line and symmetric (front); eye spacing = eye width; mouth centred between the eyes (front); face profile edge without dents other than the designed nose-lips-chin |
| 9 | Garment joins | Silhouette minus the union of all regions | Remaining area 0 (no background showing through); shirt hem overlaps the trousers; shirt and trousers join |
| 10 | Specks + small holes | Count connected components per region and the holes inside | 0 components and 0 holes smaller than the threshold (initial estimate 0.003 H², adjust) except intended details (buttons, etc.) |
| 11 | Wrong-class colour | Look for blobs of another colour inside the hair/shirt mass | 0 blobs (e.g. a light hair strand read as trousers, a floor shadow read as body) |
| 12 | Shoes | Zoom 6x | Clearly visible below the trouser hem; sole, toe, laces/tongue per shoe type; sole without notches |
| 13 | Accessories (scarf, bag, hat) | Measure thickness and position in H vs reference | Max 10% difference; wrap/parting/end direction per reference |
| 14 | Outline (if the style uses outlines) | Zoom 4x on edges | Uniform thickness, not jagged, not broken, not doubled |
| 15 | 3/4 perspective | Compare with the reference | Far side of face/body foreshortened; far eye narrower; body centre line shifted; far leg slightly smaller |
| 16 | Arm width while moving | Width perpendicular to the axis at 5 points, several angles | Upper arm even (max 0.02 H difference), not narrowing toward the armpit |
| 17 | Holes + loose pieces in EVERY animation frame | gapcheck | 0 holes > 6 px (except reference design), 0 loose pieces |
| 18 | Simplicity (flat style) | View at small scale + zoom | No purposeless texture/lines; contour without small waves |
| 19 | Width across views | Measure chest, waist, hip, thigh width in front and 3/4 views | 3/4 not narrower than the front |
| 20 | Shoulders and arm roots (3/4) | Zoom near and far shoulder | Both arms hang from the shoulder top; shoulder curve continues from the panel into the arm |
| 21 | Light direction across views | Compare the shadow side in all views | Shadow always on the side away from the same light (default top left), also on mirrored views; in scenes with a world sun: per the sun at each angle |
| 22 | All-views sheet | Turn-order sheet (front, 3/4, side, back, mirrored side, mirrored 3/4) + landmark lines; measure top and sole of each view with a mask | Top and sole equal (max 0.006 H difference) |
| 23 | Union joins | Look for pixels deviating from the garment colour in the garment area | 0 background lines showing through |
| 24 | Regression of accepted views | Re-render the old sheet and compare pixels (`tools/regresi.py <ref> <new> diff.png`) | Pixel difference 0 on the same engine (reference per engine, chapter 6) |
| 25 | Legitimate cavities | List the remaining cavities with their reasons | Only the gap between the legs, the bag strap triangle, the arm-body gap, the bag-leg gap |
| 26 | Multi-angle rig | Angle sheet + references, 360-degree turn, gapcheck per angle | At the reference angles (0, 90) the silhouette equals the reference drawing; no bald spots, hair covering the face, or features on the unseen side |
| 27 | Kit style 5-view sheet | Side, 3/4, front, back 3/4, back + lines for top, shoulder, crotch, knee, ankle, sole; automatic mask per view | Top/sole/shoulder max 0.035 H difference; 3/4 width including arms may be 5-7% narrower than the front (item 19 is measured without arms) |
| 28 | Rig in the scene (rule 00.7) | Scene frame at the final camera distance, angles 0/90/180/270 + the hardest, side by side with the accepted version, actual size and 2x zoom | No part worse than the accepted version: limb/body proportions equal to the reference drawing at that angle (measure crotch height and body width in H in the frame) |
| 29 | Foot slip in a perspective scene | `tools/selip.py` per beat: screen position difference of the stance foot against the projection of its world point during one stance phase | Max 1 px, AND item 28 passes (a correction that removes slip must not change proportions) |
| 30 | Hair vs style reference | `measure_ref.py`: top width, hairline per x, cheek/jaw width; overlay the reference outline at the same H scale; side-by-side comparison of 4 views | Top, hairline and jaw volume within +-0.03 H of the reference; 3/4 has far-side hair; back symmetric without diagonal edges |
| 31 | Grips | Zoom 3-4x on every hand holding an object | One hand shape (not separate finger capsules), wedges in the finger notches, thick thumb; object upright in the world and facing per the pose |
| 32 | Hand size | Skin mask of the relaxed front-view hand, width x height in H | Equal to the reference (kit: 0.29 x 0.58 H) |

Note: items 1-5, 9-11, 16-17 can be computed automatically (numpy on region masks). The other items must be seen through zoom crops, not from the full sheet.

### 11.2 Regression sheet (rule 00.3)

One PNG holding: full body in several frames of each clip; zoom of every spot ever complained about (e.g. waving hand 4 frames, armpit 2 angles, hair while waving, face front/3/4/side, raised forearm). Compare with the previous delivery sheet; parts that were not changed must be identical.

## References (read when the step comes up)

| File | Read when | Old chapter |
|---|---|---|
| `references/mistakes.md` | Once per session before drawing a character, and before every delivery | 0 |
| `references/anatomy.md` | Drawing the head, body, arms, hands, legs, shoes, face; shading | 3, 4 |
| `references/rig.md` | Preparing a character for animation: LBS, 2D piece kit, corrective joints, environment contact | 5, 5.1, 8, 9 |
| `references/style.md` | The brief asks for another style (simple flat vector) or the same character as vector/pixel art/origami | 10, 10.1, 19 |
| `references/trace.md` | There is a reference (turnaround, character sheet) to follow; rig from traced artwork | 12, 13 |
| `references/flat-vector.md` | Flat vector layered per material (people set), 3/4 walking, side, back views | 14, 15 |
| `references/multi-angle.md` | Character seen from many angles (one-take orbit): loft, hairline, layer order per angle | 16 |
| `references/scripts.md` | Using `scripts/` (vkit, shapes, styles, loft, svgref, measure_ref, zoomsheet, cavity, brush, image_ops) | 17 |
| `references/kit.md` | Full character kit (2D rig, proportion mode, expressions + 12 visemes, gestures, turnaround, kit sheet) | 18 |
| `motion-graphics/references/advanced-principles.md` | Constant stroke when scaled (`strokeFixed`), rubberhose (`limbs: "rubber"`), 2.5D head, FACS, rigid origami style (`origamiStyle: "rigid"`) | v2.4 |

The character kit and styles are also available as JS modules in the motion-graphics skill (`lib/vector-kit.js`, `lib/character-styles.js`) for HTML compositions rendered by mgp (`motion-graphics/references/lib.md`).

Old chapter map: 00, 1, 2, 6, 7, 11, 11.2 = this core · 0 = mistakes · 3-4 = anatomy · 5, 5.1, 8, 9 = rig · 10, 10.1, 19 = style · 12-13 = trace · 14-15 = flat-vector · 16 = multi-angle · 17 = scripts · 18 = kit. Other skills: `motion-graphics` chapter N is mapped in the motion-graphics SKILL.md References section.
