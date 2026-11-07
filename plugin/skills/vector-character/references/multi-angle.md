# References: hybrid multi-angle rig for orbits

Part of the `vector-character` skill. Read when: the character must be seen from many camera angles (one-take orbit).

Moved verbatim from SKILL.md v2.3 (16. Hybrid multi-angle rig for orbits (test project Review Results, concept test accepted)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 16. Hybrid multi-angle rig for orbits (test project Review Results, concept test accepted)

Used when the camera circles the character (16 angles or continuous). Options offered to the user: A new drawing per angle (slowest), B full 3D rig (risk of geometric shapes), C hybrid (chosen). The rig is used for ALL angles, including angles that have a hand drawing, so the style does not jump; the hand drawings become loft references and comparisons.

### 16.1 Skeleton and projection
- One 3D skeleton in the body frame: X forward (face +X), L lateral (+ = character's right), y downward from the hair top. Leg and arm joints from the side-view gait engine (motion-graphics chapter 4.3 (`motion-graphics/references/walk.md`)) + measured lateral offsets (test character example: pelvis +-0.16, knee x 0.92, ankle x 0.85; shoulders +-0.40, elbow x 1.10, wrist x 1.18-1.30).
- Camera angle relative to the character v (0 front, 90 = 90R, 180 back, 270 = 90L). Local screen: u = X sin v - L cos v. Depth toward the camera = X cos v + L sin v. A normal (nX, nL) faces the camera when nX cos v + nL sin v > 0.
- Projected body lean: screen rotation = lean x sin v.
- Body projection orthographic; in a perspective scene measure foot slip during integration.
  - Test project measurements (camera 14 H, height 6.53 H, f 1500): side view (sideways walking beat) slip 1.15 px; orbit with the camera in front/behind 57 px. The reason: a ground point moving forward/backward by Δd H in depth should shift vertically by about f x h_camera x Δd / distance^2 (about 48 px per H), while the billboard draws everything at pelvis depth.
  - Perspective correction ONLY on the legs (weighted 0 at the pelvis to 1 at the sole) removes slip (0.2 px) but lengthens the legs by 0.3-0.5 H when the camera is in front/behind, because the body stays orthographic and the leg width is not scaled. Rejected ("wrecked"). To test next: correct the whole figure (position AND scale per point from its depth), or stay orthographic with a billboard anchor that follows the stance foot (smooth blend during double support). Always compare scene frames with the accepted version (chapter 11 items 28-29).

### 16.2 Legs, arms, shoes
- Leg = a 2-bone tube from the projected joints, same stations as leg_path. Projected width of each station: sqrt((w_side sin v)^2 + (w_front cos v)^2); front and back swap on the left side.
- Arm = sleeve_path from the projected joints; arm-body join line on the back side of the near arm (alpha follows |sin v|, gone in the front view).
- Hands per angle (tested in the rig v4 test project):
  - shape keys from the reference drawings at v 0 / 90 / 180 / 270; the back and left-side views in the reference drawings are usually mirrors (F.mirrored), so their keys = mirrors of the front/side contour;
  - relaxed hand: front -> side -> mirrored front -> mirrored side; fist: the same fist silhouette in front and side (only the knuckle strokes), mirrored at the back and the left side, with a little-finger-side stroke at the back;
  - between keys: the contour is morphed (resample N points, chapter 6, smoothstep per 90 degrees), strokes are crossfaded (alpha x weight), no toggles;
  - the kit style uses 5 drawings by the facing direction of the HAND (0 thumb side, 45, 90 back of the hand, 135, 180 palm side) + mirrors; with a morph within +-11 degrees around the boundary when there is no in-between drawing.
- Shoe = the side sneaker profile x lateral width per point, rotated by the gait cfg, projected convex hull, then smoothed. The sole underside shows fully when the bottom normal of the shoe faces the camera (heel lifted, camera behind); otherwise the sole band = full silhouette minus the silhouette of the part above the midsole (sole points raised to local y -0.032, a copy shifted 0.04 H up unioned so the top edge leaves no slivers).
  - Details = curves on the 3D shoe surface (px, py profile, s lateral -1..1), shown per segment when facing the camera: U-shaped toe cap edge (top centre px 0.37, sides px 0.50 near the sole), 2 laces across the instep (shown when the instep tilts toward the camera as the heel rises, or in side view), heel counter stitching (back view).
  - Kit style for the front view and toe-off: a two-part shoe, the toe dome stays on the floor (wider than the ankle, height/width about 0.6, angled outward 10-15 degrees) + heel/collar rotating behind it; sole band only under the dome, toe cap shine + 2 lace strokes. From behind: heel counter, shoe tip peeking out to the side. Not yet tested on the test character rig.

### 16.3 Loft volume from two accepted drawings
- For face, hair, outer shirt body, T-shirt, neck, pelvis: render the front-view and side-view paths to a mask (200 px/H), take xmin/xmax per row (step 0.005 H). Reference frame without head tilt/lean.
- Per row: centre and half depth from the side view (Xc, d), centre and half width from the front view (Lc = -(xmin + xmax)/2, w). Superellipse cross-section; projected edge u = (Xc sin v - Lc cos v) +- (|d sin v|^m + |w cos v|^m)^(1/m), m = dual exponent. Test character example: face/hair/neck 2.0, body 1.25 (so 3/4 is not narrower than the front), pelvis 1.3, T-shirt 1.6. At v 0 and 90 the result equals the reference drawing.
- The silhouette is subsampled every 4 rows, then splined. On the skia engine PathOps on dense silhouettes can fail: try/except + `brush.simplify`; the pure engine (exact pathfinder per sample) needs no fallback.
- The nose is not part of the loft (front depth smoothed at the nose rows); nose = a projected profile polygon unioned into the skin only when sin v > 0.5; below that = a small hook stroke.
- Asymmetric hair (long side vs tucked side) comes automatically from the left/right widths of the front view and the side profile (crown + long side).

### 16.4 Surface features
- 3D feature points on the front surface of the volume (X from the superellipse at that row and lateral): eyes (rx = rx_front x (0.55 + 0.45 x facing), hidden when facing <= 0), brows, cheeks, mouth (3 points), ears (profile ear points with L 0.30-0.38; shown when sin v > 0.3; shaded from behind), edges of the outer shirt opening + buttons (shown when facing > 0.15).
- Open shirt opening = a polygon between the two projected panel edges, intersected with the body silhouette; filled with the T-shirt above the waist, trousers below.
- Bag = a 3D box (face x thickness x height), swinging on a spring at the fist. The face and gusset shown = the normals facing the camera (not the screen span, chapter 0). Light face (base colour), hatched gusset (same as the reference drawing); the gusset hatch covers the silhouette bulge on the outer side and widens smoothly as the face turns almost side-on. Strap ends at the face edge, shifting smoothly to the gusset edge when the gusset dominates (smoothstep gusset ratio 0.35-0.65), otherwise both straps merge into one line. Face folds fade as the face narrows. The yaw is picked by the user from a comparison sheet per angle (`tools/tascek.py`): the hand reference drawings cannot all be satisfied by one 3D box (test project: -30 chosen).
- Strokes on the surface (hair strands, fabric folds, rib collar, shoe details) = 3D points (ring angle, y) on the loft volume; only parts facing the camera (facing > 0.12) are drawn, alpha fading `min(1, (mean facing - 0.12) / 0.33)` so they do not pop in/out during the orbit.
- Hair strands: convert the strokes of the reference drawings (front, right side, left side, back) to (hair ring angle, y); drop points below the row where the ring narrows toward the hair ends. The kit style adds a shine band across the crown (dL* +7..+15, depth 0.15-0.5 H, thickness 0.12-0.17 H), also visible from behind, so the back hair does not read as a flat block. Shadow under the hair = silhouette minus its copy shifted 0.05 H up.
- Mouth: see chapter 0 (smooth shift from the front point to the profile stroke). Neck: chin shadow from the face loft shifted 0.075 H, clipped to the neck.

### 16.5 Hairline (front hair covering the face)
- Hairline = a TABLE of y per face ring angle th (0 front, 90 character's right, 180 back, -90 left) wrapping around the head, not a list of front-view points. Surface point: X = xc + d cos th, L = lc + w sin th from the ring row (interpolated between rows), normal (cos th / d, sin th / w).
- Calibrate from each reference drawing: side view X -> th = acos((X - xc)/d) (sign = side), front/back view L -> th = asin((L - lc)/w) (back 180 - asin). When two references conflict (hand drawings are not 3D-consistent), write down the compromise and which angle gives way. Test character example: a step at the fringe end near the parting (th 31-34, forehead open below the parting); tucked side drops behind the ear to the nape (th 135-141); long side covers the back of the cheek (th -64 to -120).
- Cover polygon: points on the arc facing the camera (the longest continuous run containing th = v), in ascending order; both ends (at the silhouette edge) closed horizontally outward, then upward. Points whose y is below the face use the last ring that is still as wide as the head (test character 0.85), because below it the rings narrow toward the chin and the back points get pulled forward (a hair blade under the jaw).
- Cover = polygon intersect (face skin union neck root down to the nape). The skin drawn = face minus the POLYGON (chapter 0). The cover is filled with hair, then given the same hair shadow (bottom shadow, shade against the light), so there is no plain patch over shaded hair. The hair still has no form shade (chapter 0).
- Back view (cos v < -0.17): the scalp is drawn, then the full hair silhouette on top; cheeks/ears sticking out of the hair silhouette stay visible.

### 16.6 Layer order per angle
- Back hair (not the back view) -> far-side legs + arms (darker) -> neck (+ chin shadow) -> bag when on the far side or front 3/4 -> near leg + pelvis -> bag (side view) -> body + hem band + folds + opening -> near arm + join line + hand -> head (hair cover over the face and nape, skin, hair strands, features, ears).

### 16.7 Concept test (required before producing all angles)
- Angle sheet 0, 22.5, 45, 67.5, 90, 135 + reference drawings 45 and 90 side by side.
- Walk strip of 1/8 cycle at 3 new angles.
- 360-degree turn video while walking in place (continuous angle) to find broken angles.
- Gapcheck every frame of each angle (`scripts/cavity.py frames module:draw_angle n`, project example: `tools/rigcheck.py v n threshold`); classify legitimate cavities (bag strap triangle, gap between the legs, bag-leg gap, arm-body gap).
- Write down the weaknesses: hands per angle, hair strands, shirt details, toe-off shoes, light per angle.
- The scene test (chapter 11 item 28) is part of the concept test: a rig that passes the angle sheet has not necessarily passed in orbit frames.

### 16.8 Method status (test project Review Results)
- Concept test v1 accepted; bag v3 accepted (face from normals, yaw -30).
- The full v4 overhaul (hairline table, hair strands, 3D shoes, hands per angle, cardigan details, world light, standing pose + 0.3 s blend between actions, leg perspective correction) was stopped by the user after seeing the orbit frames: "wrecked". Proven cause: perspective correction only on the legs lengthens the legs in the front/back views. Also visible in both versions: the loft body from front/back is narrow and stiff compared with the hand drawings. The angle sheet and zooms looked better, the scene frames did not; that is the reason for rule 00.7.
- Before continuing with this method, measure the loft proportions in scene frames (body width, leg length in H) at 0/180 against the hand drawings; if the difference is large, offer the user option A (new drawing per key angle + morph/swap) or a kit-style 2D piece rig (chapter 5.1) per view.
