# References: flat vector layered per material, 3/4, side, back views

Part of the `vector-character` skill. Read when: people set style / layered flat vector and views other than the front.

Moved verbatim from SKILL.md v2.3 (14. Flat vector layered per material + 3/4 walking view (test project Review Results), 15. Side and back views (test project Review Results)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 14. Flat vector layered per material + 3/4 walking view (test project Review Results)

Used when the user chooses a flat SVG style (people set, reading) and "a fully new drawing with the pen tool, the SVG only for measuring". The character spec stays in the project files.

### 14.1 Measure the SVG reference
- Render: `brush.draw_svg` (`scripts/svgref.py`): `skia.SVGDOM` on the skia engine, a numpy SVG interpreter on the pure engine (path, rect, circle, ellipse, line, polyline, polygon, g, use, transform, style, fill/stroke/opacity; gradients become flat colours). Three traps already found (svgref already handles them):
  - CSS classes (`.st0{fill:..}`) must be inlined as style attributes;
  - colours `rgb(77.9%, 64.0%, 66.2%)` must be converted to hex, because without that SVGDOM fails silently (None).
  - (skia engine) `skia.MemoryStream(src.encode())` without a copy can read memory that was already freed, so it fails at random; keep the bytes in a variable and use `skia.MemoryStream(data, True)`.
- Measure with a width profile per row (mask of the background colour and the skin colour), not by guessing. Unit H_ref = hair top to chin.
- People set style numbers (standing adult figure):

| Landmark | H_ref |
|---|---|
| Total height | 5.3-5.8 |
| Shoulder top | 1.25-1.30 |
| Crotch | about 3.38 (58.5% of the height from the top; realistic 50%) |
| Neck | 0.17-0.18 wide |
| Thigh | 0.32-0.36 wide |
| Ankle | 0.12-0.18 wide |
| Fingertips | about 0.624 of the total height from the top |
| Relaxed hand | about 0.5 long |

- Always make a comparison board: reference figure and new figure at the same H scale, with landmark lines.
- Large SVGs (stock illustrations of 3-6 MB) can make `brush.draw_svg` crash or return None (skia engine) or be very slow (pure engine); render them with headless Chrome to look at, parse the XML with Python for numbers (path count, solid vs gradient fill, stroke, opacity).
- Character constructor kit style numbers (5 stock sheets, front view, unit H hair top to chin), as a comparison for an alternative style:

| Landmark | Kit style | test character (people set) |
|---|---|---|
| Total height | 6.1-6.5 (6.8 with heels) | 5.78 |
| Shoulders | 1.26-1.31 | 1.27 |
| Crotch | 3.10-3.45 (51-53%) | 3.42 (59%) |
| Fingertips | 3.5-3.8 | 3.57 |
| Knee (rig pivot) | 4.4-4.7 | - |
| Trouser hem | 5.7-6.15 | 5.64 |
| Across 5 views | top, sole, shoulders max 0.05 H difference | - |

### 14.2 Tools (kit)
- `Fig(cv, ox, oy, hp)` with a local matrix:
  - `rotated(px, py, deg, dx, dy)` for a tilted head, hands and a leaning upper body;
  - `mirrored(cx)` for the view facing the other way.
- `pen("M .. C .. Q .. L .. Z")` makes an absolute SVG path in H. `ellipse()` only for eyes, cheeks, buttons, ground shadows.
- `shade(base, shape)` = fill shape clipped to base (shadows, cuff bands, soles).
- `ink(pts, w, color, alpha, clip)` = tapered Catmull-Rom stroke (profile sin^0.6), always clipped to its material.
- `union` / `diff` via `brush.union` / `brush.subtract` (`vkit.union`, `vkit.diff`). Parts cut by a sleeve: `diff(hand, sleeve)`.

### 14.3 Layer order (back to front)
1. Ground shadow
2. Back hair (base colour, bottom part shaded)
3. Far leg + its shoe (3/4)
4. Inner collar of the outer shirt behind the neck, then the neck (+ shifted face shadow)
5. T-shirt (before the trousers when tucked in)
6. Bag and strap (behind the near leg when the bag is on the far side)
7. Trousers: pelvis + near leg, near shoe
8. Outer shirt: far panel + far arm (union, shared shoulder), then near panel + near arm (union, shared shoulder), cuffs, ink, buttons
9. Hands and fists, cut by their sleeves
10. Face, then front hair, fringe, visible ears

### 14.4 Relaxed standing front view
- Stance foot right under the neck root (check C with a vertical line).
- Hip on the stance side up about 0.06 H; shoulder on that side down about 0.05 H; head tilted about 4 degrees.
- Knee of the relaxed leg slightly inward; do not push the shin too far out, or the trousers read as flares.
- Relaxed arms: elbow slightly bent, forearm pointing to the thigh, hand overlapping in front of the thigh side. This breaks two stiffly parallel arms.
- Arm carrying a bag: almost straight, slightly out from the hip so the bag hangs free. Strap from the fist widening to the top corners of the bag.
- The arm-body gap is a legitimate cavity. It holds background, not T-shirt or trousers. Make the T-shirt and the trouser pelvis narrower than the sides of the outer shirt body.

### 14.5 3/4 walking view
- Draw from its own 3/4 skeleton (not a warp). Thigh and shin length equal to the front view (check the numbers).
- Legs:
  - near leg in front, straight, heel planted, shoe tip slightly raised;
  - back leg bent at the knee, heel lifted, resting on the toes;
  - the two legs cross visually;
  - far leg about 30% darker.
- Arms opposite to the legs. The free arm swings; the arm carrying a bag only swings a little.
- Upper body leans about 2 degrees in the walking direction: frame U rotated around the pelvis, the legs stay in frame F.
- Width: 3/4 chest, waist, hips must not be narrower than the front view.
- Shoulders:
  - far panel and far arm share one shoulder curve (trapezius to deltoid);
  - near shoulder upright and somewhat square;
  - a far arm swinging forward is unioned with the far panel, then given a darker tone on `diff(arm, panel)`.
- 3/4 face (facing right, chin 1.0):
  - far contour with forehead, cheek and chin pointing in the facing direction;
  - near eye rx about 0.028, far eye about 0.022-0.023, distance between eye centres about 0.21;
  - nose = a small hook stroke inside the face, near the far contour, not on its edge;
  - mouth shifted in the facing direction;
  - far cheek blush small and not cut by the hair;
  - near ear behind the jaw.
- 3/4 neck comes out from behind the chin, slightly toward the nape, not right under the chin.
- 3/4 hair:
  - round occiput tapering to the nape;
  - outer hair contour outside the skull, hairline inside the face;
  - long hair on the far side may cover the edge of the far cheek, but must not cover the far eye.
- Motion folds of the outer shirt: 1-2 thin strokes (alpha 0.3-0.35) pulled toward the stepping leg.

### 14.6 View facing the other way (mirror)
- Design in the same frame (face toward +x), then `F.mirrored(0)`.
- Shared: legs, pelvis, body, collar, neck, T-shirt, face.
- Redrawn because the character is not symmetric:
  - hair: parting, fringe direction, long side;
  - both arms and their swing;
  - bag;
  - button placement (stays on the same side of the body);
  - all shadows, so they stay on the side away from the top-left light. Example: the near-leg shadow moves to the back edge. The `shade_front` parameter is used for this.

### 14.7 Hands, fists, shoes (people set style)
- Relaxed hand:
  - one shape widening smoothly from the forearm, convex back of the hand, tapering to a rounded tip;
  - one finger dip stroke;
  - length from the cuff about 0.45-0.5 H_ref.
- Side-view fist:
  - rounded back of the hand;
  - finger side with small 2-step stairs and 2 short strokes;
  - one thumb stroke across the top;
  - rounded bottom without a split;
  - finger side facing the thigh (front) or the walking direction (3/4).
- Shoes:
  - front = a dome with a flat sole + sole band + one toe cap line;
  - side = a local function (heel 0 to toe 0.43, sole y 0) with heel counter, collar dip, toe cap, laces, sole band, then rotated at the heel point (back foot about 33 degrees, front foot about -6 degrees).

### 14.8 Special checks
- Enclosed cavities:
  - render the figure on a pure green background, then `image_ops.connected_components(bg_mask)` (equivalent of connectedComponentsWithStats) on the background pixels; `cavity.py still` already does this;
  - components that do not touch the canvas edge = cavities;
  - legitimate cavities: gap between the legs, arm-body gap, bag strap triangle, space between bag and leg;
  - the rest (1-4 px) = defects and must be fixed.
- Zoom every risky spot: head, near and far shoulder, fist, hand, waist (T-shirt-trousers, buttons), crotch, shoes.
- Three-view sheet with landmark lines (hair top, chin, shoulders, crotch, sole): all landmarks aligned.
- Package test: zip the project, extract to a new folder, render again, compare pixels with the delivery. The workspace does not carry over between sessions, so hand the zip to the user at the end of the session.

## 15. Side and back views (test project Review Results)

### 15.1 When the reference does not contain that view
- Render all references and look for a pure view. If there is none, tell the user with options: continue from the character's own measurements, or the user sends a reference.
- Build from the character's landmarks (top, chin, shoulders, crotch, sole), thigh/shin/arm lengths from the other views, and the widths of the other views.

### 15.2 Side walking view (contact)
- Skeleton:
  - x 0 = hip joint, face toward +x;
  - 2-bone IK, knee forward;
  - near leg in front landing on the heel, far leg behind resting on the toes;
  - sneaker rotated at the heel (front foot) or at the ball point (back foot);
  - bone lengths equal to the front view (check with the `skel` command).
- Measure the stride length (chapter 0).
- People set style profile depth (test character example): chest 0.57 H, cardigan body at the waist 0.54 H, hem 0.68 H. Naturally slimmer than the front-view width.
- Trousers:
  - leg built from bone stations (point, normal, front width, back width): root 0.23/0.24, thigh 0.185/0.19, above knee 0.155/0.16, knee 0.135, calf 0.128/0.148, bottom 0.132/0.142 H;
  - hem sits on the sneaker, back side lower than the front;
  - pelvis = its own piece unioned with the near leg, its bottom edge the buttock curve.
- Open cardigan:
  - front edge falls straight from the chest; the T-shirt only shows as a slice at the chest;
  - back hem widens to cover the buttocks, so the trouser pelvis does not peek out;
  - buttons are only drawn in views where the buttoned panel is on the near side.
- Arms:
  - tube from the shoulder-elbow-wrist bones (width 0.128/0.122/0.118 H) + a round deltoid cap over the shoulder pivot;
  - thin join line on the back side of the arm, over the body;
  - far arm darkened; cuff = a band perpendicular to the forearm.
- Hands:
  - relaxed side = back of the hand, fingers closed and converging, tube thumb in front, one finger gap + one stroke at the thumb root, rotated 0.6 x the forearm angle;
  - fist = the 3/4 fist shape, finger side toward the walking direction.
- Side sneaker (length 0.56 H; 3/4 foreshortened to 0.43 H): heel counter, collar dipping down, tongue, vamp, round toe box, sole band, 2 laces, toe cap edge, heel stitching.
- Profile head (chin 1.0):
  - one contour: forehead, brow, eye socket, small button nose, lips, round chin;
  - small oval eye 0.08 H behind the front edge; short brow; blush; smile-line mouth;
  - ear at the middle of the head depth (x 0), y 0.51-0.77;
  - neck comes out from behind the jaw, its front line sloping from under the chin.
- Hair:
  - one shared outer contour (fringe, top, occiput about -0.50 H);
  - tucked side: hair curves over the ear then tight behind it, nape slightly flicked;
  - long side: covers the ear down to the shoulder, its front edge covers the back of the cheek, ends flicked backward; fringe sweeps toward the long side;
  - a long side on the far side shows as a dark layer behind the nape, with the same silhouette.
- Bag turned 45 degrees: face + gusset, gusset on the side away from the light.
- View facing the other way: skeleton mirrored. What is shared and what is redrawn follows chapter 14.6.

### 15.3 Extra tools
- `spline(pts, corners)`: Catmull-Rom to cubic, with zero handles at corner anchors, for contours from measured points.
- `form_shade(F, region, ...)`: shadow = region minus a copy shifted toward the light in screen space (px). The result stays correct in mirrored views.
- `leg_path` (bone stations) and `sleeve_path` (tube + deltoid): shapes computed from the skeleton, so they are ready to animate right away (motion-graphics chapter 4.3 (`motion-graphics/references/walk.md`)).
- 6-view turn-order sheet + landmark lines; labelled zoom sheet (image, H box, label, scale).

### 15.4 Standing back view
- Back silhouette = geometric mirror of the front silhouette. Copy the front-view path, draw it through `mirrored(0)`; the character's right moves to the viewer's right.
- Content that is redrawn:
  - back hair covers the head; tucked side tight so the ear edge shows; bottom edge smoothed without hooks; shadow only a band at the bottom edge;
  - cardigan back = union of panel + bridge + hem band; thin rib collar;
  - fist on the little-finger side without knuckles; relaxed hand with finger dips on the inner side;
  - shoes: heel counter stitching + tab; trousers: short centre seam under the hem + fold behind the knee;
  - cast shadow of the hair onto the shoulders; nape hollow.
