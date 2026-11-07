# References: mistakes that must NOT be repeated

Part of the `vector-character` skill. Read when: before drawing a character (required once per session) and before every delivery.

Moved verbatim from SKILL.md v2.3 (0. Mistakes that must NOT be repeated); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 0. Mistakes that must NOT be repeated

| Mistake | Result | Do instead |
|---|---|---|
| Assembling the body from separate parts (head, neck, torso, arms, hands, trousers, shoes) and then joining them | Shoes do not merge with the legs, hands do not merge with the body, it feels like "a vector collage" | ONE whole silhouette first, other parts = cut lines inside it (chapter 2); or, for a flat SVG style, layers per material with exactly the same joining curve (chapter 14) |
| Stuck-on geometric blocks (capsules, circles, rects) for the body | Stiff, like pipes | Pen tool: few anchors, long handles, flowing curves |
| Drawing a new character from "blind" coordinates without a measured skeleton | Stiff, proportions off, rejected again and again | Measured pose skeleton first (chapter 1.3), hard parts designed in local coordinates, zoom check per part |
| Stiff symmetric pose without gesture | Paper doll | Line of action + clear weight support; when walking the upper body leans 3-4 degrees |
| Excessive contrapposto on a man (hip pushed out, hourglass waist, curved legs, tilted head) | Reads feminine, legs "bent all over the place" | Man: upright stance, feet hip-width and straight (knees above the feet), hips almost level, waist = hips (V taper), head upright |
| Square face (live-corner jaw) or too round (jaw 0.62 H wide) | Not natural | Inverted egg: jaw angle width about 0.46 H, narrow chin (chapter 3) |
| Facial features misplaced / squinting eyes | Out of proportion, not friendly | Neda grid + chapter 3 numbers, eyes open enough, thin closed smile |
| 3/4 / side nose stuck on as a shape at the face edge | A pink shape "stuck" outside the cheek | The nose bump goes into the face contour; inside the face only a small shadow |
| Fingers pulled as dents in one path | "Sloppy" | Hand from palm + 4 finger capsules + thumb, United (chapter 3) |
| Waving palm reversed | Back of the hand faces front | Arm raised about 160 degrees without rotating the forearm -> use the MIRRORED open-hand set (palm facing front, thumb toward the head) |
| Hat/helmet: cranium outside the shell, hair not wrapping the ear (profile) | Hat looks stuck on | Occiput inside the shell, back edge lower than the front, short hair wraps around the ear |
| Uniform limb width | Pipes | Anatomical profile (shoulder, biceps, forearm, thigh, knee, calf); calf side fuller than the shin side |
| Hard band/uniform offset shading, or computed per piece | Fake, seams visible | Shadow computed on the union of the garment group, then clipped per piece |
| Rubber-hose curving along the whole limb | Like noodles | Straight bones, only the joints rounded |
| Focusing on anchors, forgetting colour/shape proportions | Unpleasant to look at | Check silhouette + proportions first, detail last |
| Wide neck in the middle of the head | Unnaturally thick neck | Neck about 0.45-0.47 of the head width, coming out from behind the jaw |
| Armpit/shirt stretches when the arm goes up (weights pulled) | Armpit like webbing | Armpit and shoulder redrawn per pose (chapter 8) |
| Concave ("picak") or lumpy shoulder when the arm goes up | Shoulder does not read | Shoulder curve drawn per pose, tangent to the trapezius and the top edge of the arm (chapter 8) |
| Joint shapes switched with a toggle (if/else on the angle) | In animation "first attached, then suddenly snaps off" | All joint shapes change CONTINUOUSLY with the angle (chapter 8) |
| Side view: armhole of the outer garment (vest, etc.) is a large ellipse filled with the inner shirt | A "lump" of another colour appears on the body when the arm swings | Armhole the size of the sleeve, hidden when the arm is still (chapter 2) |
| Only checking key poses / only the part complained about | Other broken parts go unseen | Check the whole figure part by part with zoom + a sweep video of every joint (chapter 7) |
| Nudging numbers over and over for a shape problem | Never finishes ("don't just nudge the points") | Change the METHOD: draw the actual anatomical shape for that pose (chapter 8) |
| A "too long" hand fixed by SHRINKING the hand | Broken fingers, small out-of-proportion hand | Keep the hand at its real size; shorten the ARM, hide the wrist in the cuff |
| Arm-body gap on a hanging arm | Arm looks small/thin | Sleeve overlaps in front of the body edge (no gap), unless the reference shows a gap |
| Arm width not compared with body width | Arm too small | Measure the ratio upper arm width : body width against the reference (chapter 11) |
| Left and right hands swapped / palm reversed | "the view is reversed" | Right hand = mirror of the left hand; thumb direction checked against the reference |
| Arm stretched by pulling the body silhouette | A "wing" under the arm | Arm = a separate sleeve tube (fixed thickness, measured from the reference) + a small armpit fillet |
| Accessories (scarf, bag, hat) thicker/larger than the reference | "too thick" | Measure the accessory thickness in H from the reference before drawing |
| Hair parting/fringe direction guessed | "wrong direction" | Read the parting side from the reference (viewer's left/right), write it as a constant in the character spec |
| 3/4 view from a 2.5D cylinder warp of the front view | Rejected: face/body without perspective | 3/4 view = a new drawing, preferably TRACED from the reference (chapter 12); for orbits with many angles: loft the volume from the accepted front + side views (chapter 16), NOT a warp of one drawing |
| 3/4 / side view redrawn by hand without a reference | "weird", flat head, shirt and trousers do not join | Trace from the reference when there is one (chapter 12) |
| Small specks / small holes left from tracing, dents on the face edge | Dirty, looks amateur | Clean up automatically (chapter 11, chapter 12) |
| Waiting for the user to point out the same mistake again and again | "I don't want to keep asking for the same fixes" | Run the chapter 11 self-check on every render BEFORE sending |
| Raised arm narrowing toward the armpit ("funnel") | Out of proportion | At rest the inner side of the sleeve looks narrower because the body covers it; when raised switch to an even, wide TUBE, rising smoothly with the angle (smoothstep 5-40 degrees). Measure the width perpendicular to the arm axis at 5 points |
| Balloon forearm when the arm is raised | "it should be straight" | Raised arm: forearm edge straight from elbow to cuff; balloon only when the arm hangs |
| Wide elbow bone blend (LBS) | Outline pulled into teeth/slivers at the elbow | Sleeve split at the elbow hinge into 2 rigid pieces + a joint circle (racket-ball) the width of the tube |
| Nothing under the hair/sleeve | Hair "wrecked", background shows through when moving | Continue the sleeve under the hair; body panel down to the body side under the arm; back under the hair (side); nape in hair colour under the collar |
| Dark cover layer follows the chest bone but covers the head | Dark stroke peeks out when the head tilts | The gap cover layer only on the body |
| Winding (made-up) arm-body cut line | Wavy underside of the arm when raised | Straight cut line, descending smoothly to the inner edge of the cuff |
| Armpit patch using a wide-zone vector closing | Loose shirt piece floating between arm and body | Patch = a simple pose-space shape (deltoid + armpit wedge) |
| Traced Catmull-Rom contour from sparse anchors | Thin needles/spikes on the cuff and body | Dense anchors (approxPolyDP eps 0.6 px) + remove spikes (angle < 40 degrees) |
| Traced face used raw | Eyes become blobs (reference about 90 px per H) | Vector face: outline, eyes, brows, nose, lips at positions measured from the reference |
| 3/4 face profile guessed | Hair covers the face, deformed face | Far-side profile edge = leftmost face skin per reference row; hairline = measured fringe curve from the parting to above the ear |
| Pathfinder (PathOps) results trusted blindly | Holes without an error (union area smaller than the parts), or RuntimeError on dense polygons (skia engine) | Check the garment union area (`vkit.area`), retry with simplified/shifted input; on the skia engine wrap `brush.union`/`brush.subtract` in try/except + `brush.simplify`; the pure engine computes booleans exactly per sample (no error), still check the area |
| Waving hand: thumb pointing away from the head, wrist sunk into the cuff | Only the thumb stub is visible | Thumb toward the head, wrist out about 0.12 H from the cuff |
| Flat style given too much detail (ribs, strands, dense fringe, heavy grain, jagged contour) | "not simple", less elegant than the reference | Chapter 10.1: little purposeful detail, smoothed contours |
| 3/4 torso narrower than the front view | "body shape too thin" | 3/4 chest, waist, hip width at least equal to the front view, because a body turned 45 degrees shows part of its width plus part of its depth (chapter 14.5). In the loft: boxy body cross-section (dual exponent m 1.25), not an ellipse |
| 3/4 far arm comes out below the shoulder line of the shirt panel; near shoulder sloped | "the arms dropped", arm root looks like it comes from the side of the chest | Body panel and arm share one shoulder curve (trapezius to deltoid); near shoulder upright and somewhat square (chapter 14.5) |
| Fist with two symmetric bumps underneath + a centre line | Does not read as a hand | Side-view fist: finger side with small steps + 2 short strokes, bottom smoothly rounded (chapter 14.7) |
| 3/4 view facing the other way made by mirroring the finished drawing | Shadow moves to the light side; buttons, hair parting, bag, arms swap sides | Mirror only the leg, body, face skeleton; redraw hair, arms, bag, buttons, shadows (chapter 14.6) |
| T-shirt tucked in but drawn after the trousers | T-shirt covers the buttons and waistband of the trousers | T-shirt drawn before the trousers in all views |
| Relaxed hand placed exactly at the side of the thigh | Hair-thin background line and 1-4 px holes between hand and thigh | Hand overlaps in front of the thigh side; drawn after the shirt body, then cut by the sleeve (`diff(hand, sleeve)`) |
| Hand drawn before the outer shirt | Shirt hem covers the hand root; hand seems to come out from behind the body | A hand in front of the body is drawn after the shirt, cut by its own sleeve |
| Straight bottom edge of the trouser pelvis piece | Far thigh looks cut square | Pelvis bottom edge = crotch curve merging into the root of the far thigh |
| Neck shadow as a horizontal band | Reads as a necklace | Neck shadow = the face shape shifted down about 0.075 H, clipped to the neck |
| 3/4 outer hair contour starts inside the face line | Forehead pierces the head top (skin notch) | Outer hair contour always outside the skull; the hairline sits inside the face |
| Box-shaped / flat-topped shadows | Notches and bands that do not follow the form | Shadow shape follows the material contour; if needed clip to `diff(body, sleeve)` |
| Smooth dome hair; back hair a dark block | "helmet" | Small dip at the parting, more volume on the long side, round occiput tapering to the nape, flicked ends; back hair in base colour + shadow only at the bottom |
| Side/back view freely guessed when the reference lacks that view | Inconsistent with other views | Check all references first; if none, tell the user, then build from the character's own measurements (landmarks, bone lengths, widths of other views) + chapter 15 rules |
| Flat object (tote bag) in side view drawn fully facing without computing | Inconsistent with front/3/4 | Compute from the other views (3/4 width = front width x cos 45); in side view the object is seen edge-on; offer the option of turning it 45 degrees |
| Fringe and profile hair as two separate paths | Hooks/spikes on the forehead, jagged temple hairline | One outer hair contour (fringe, top, occiput) shared by both side directions; the fringe joins the same contour |
| Form shadow on the hair | Hairline reads as a headband | Hair without form shade; just strands + a shadow under the nape (same as front and 3/4) |
| Long-side hair on the far side given its own silhouette | Reads as a ponytail/mullet | Back hair silhouette exactly the same as the view facing the other way; the far side only differs in tone |
| Profile ear the same colour as the cheek with no border | Ear does not read | Back edge of the ear overlaps the hair + inner stroke + thin tragus stroke (alpha 0.3) |
| Chin shadow on the neck from the face contour extended under the hair | Wavy band under the ear | Face skin may extend under the hair, but the neck shadow uses the original face contour |
| 1-20 px cavities under the ear, at the strap-fist join, at the end of the arm-body gap | Background specks | Skin and neck continue under the hair; the strap goes 0.05 H into the fist (fist drawn on top); close the end of the gap with a small ellipse |
| Union of garment panels whose edges almost coincide | Thin background line showing through on the back | Bridge piece goes 0.06 H into the panel; check deviating pixels in the garment area |
| Mirrored view shadow shifted by hand | Wrong shadow side | form_shade in screen space (chapter 15.3): automatically right in the mirrored view |
| Pointed side sneaker toe | Reads as flat shoes | Rounded toe box, same as the 3/4 view |
| Contact pose stride not measured | Stride is only half a realistic stride without noticing | Compute the stride from the skeleton and compare with gait data (motion-graphics chapter 4.3 (`motion-graphics/references/walk.md`)) before locking the pose |
| A still view drawing used for orbit angles and then slid along the path | "It moves like it's sliding" | Multi-angle rig from one 3D skeleton (chapter 16) |
| Loft: the nose follows the face volume | Wide snout at 3/4 angles | Smooth the front depth of the face at the nose rows; nose = a separate 3D feature, merged into the silhouette only in profile (sin v > 0.5) (chapter 16) |
| Loft: hairline closed in the wrong direction | Hair covers the face (left profile) or a bald spot at the top (67.5 degrees) | Hairline table per ring angle, closed at the silhouette edge (chapter 16.5) |
| Bag turned 45 degrees the wrong way | Bag seen edge-on in front 3/4 | Bag yaw chosen so that the bag face faces the camera in the reference 3/4 view; edge-on only in back 3/4 |
| Loft: box face (bag) = the corner pair with the largest screen span | In orthographic projection the front and back faces are ALWAYS equally wide: the choice is decided by float rounding (bag mirrored between Linux and Windows), and the "second side" is always the opposite face, so the hatched face and light gusset (reversed from the reference) at every angle | Pick face/gusset from the normal facing the camera (`facing >= -1e-9`, eps so an exact side-on view stays deterministic) (chapter 16.4) |
| Loft: hairline = front-view points + per-case end-closing rules | Square ends (square sideburns) in front of the ear at 45-90 degrees, fringe flat like a visor | Hairline = a y table per ring angle that wraps around the head, closed at the silhouette edge (chapter 16.5) |
| Loft: skin = face minus hair cover | Hair-thin skin slivers at the face silhouette edge (a "helmet" line at the head top), because the cover edge coincides with the face edge | Skin = face minus the hairline POLYGON (jutting out of the silhouette); the cover is filled with hair colour + the same hair shadow |
| Loft: neck drawn on top of the back hair | Light neck box behind the jaw (nape) | The hair cover also covers the neck root down to the nape (test character example y 0.95) |
| Loft: mouth only from front surface points | Mouth disappears in profile (centre point side-on to the camera) | One stroke whose position shifts smoothly from the front point to the reference profile stroke (smoothstep abs(sin v) 0.80-0.97), not a crossfade of two strokes |
| Front-view sole band = rectangle with a top edge sloping from heel to ball | When the heel lifts (toe-off) the shoe becomes a tall gray block | Sole band = full 3D silhouette minus the silhouette of the part above the midsole; toe cap, laces, heel stitching = curves on the 3D shoe surface (chapter 16.2) |
| One hand shape (side) at every rig angle | Hand in the wrong view at front/back, thumb backward on the left side | Shape keys per angle + contour morph (chapter 16.2) |
| Orthographic billboard in a perspective scene, then only the legs perspective-corrected | Foot slip gone (57 px -> 0.2 px), but legs get long and thin when the camera is in front/behind, body stays orthographic: "wrecked" | Correct the whole figure consistently, or stay orthographic and fix slip with a stance-foot anchor; measure slip (px) AND look at scene frames before use (chapter 16.1) |
| Rig parts never checked in the scene | Pass on the angle sheet, broken in orbit frames | Rule 00.7: scene frames at critical angles side by side with the accepted version at every step |
| Kit style: front view drawn as one finished painting | Arms stuck to the body, not riggable, other views inconsistent ("the workflow is not right") | Piece kit first, views = assemblies (chapter 1 step 9, chapter 5.1) |
| Female body = neutral body with long hair | "the female body shape is a bit different" | Female body parameters + type comparison sheet (chapter 3) |
| Kit proportions set with a screen warp (y x KY, x x KX) on top of the pieces | Joint circles become ellipses, capsule sides are no longer tangent lines: knee/hip joint ends stick out of the trousers ("the leg rig is outside the trousers"); pieces not rigid when rotated | Draw the pieces directly at final size; joints = circles of equal radius at the pivot + outer tangent sides (chapter 5.1); limb bulge zero at the ends |
| Kit side view from the neutral body depth | "thin as paper" (knee 0.48 H, waist 0.71 vs kit 0.74 / 0.95) | Measure the kit side depth per row and use 85-100%: chest 0.87, waist 0.76, hem 0.86, thigh 0.80, knee 0.63, calf 0.64 H; buttocks in the pelvis piece |
| Wavy hair from many narrow strands unioned | Reads as rope/noodles or dreadlocks | Large masses ("curtains") with two wavy edges IN PHASE, 2-4 flicked curl ends, strands follow the wave; crown + curtain unioned into one path; close the nape gap in side/back views |
| Kit hand = one blob (bulb) + strokes, or long straight fingers | "make the fingers more detailed"; straight fingers read as a paddle/claw | Palm + 4 fingers as 3-segment chains + thumb; kit relaxed pose = a loose C-shaped grip (fingers bent at the middle joint, stepped base, thumb in front with a gap + dark contact), length 0.55-0.60 H |
| "Hand-made" style imitated with noise (wobbly edges, shaky lines, grain) and small procedural details (nails, segments, knuckles, parallel hair strands, repeating sine waves) | "stiff", "it all looks so AI" | Design shapes like an illustrator: hand silhouette with a manual pen (C grip, stepped finger dips, 2-3 lines), hair waves from key points that grow downward + varied pointed strand ends + separation lines from notches; smooth pressure lines; saturation on par with the reference; check palette choices (e.g. "sage" must show) |
| Hair redrawn many times from rough coordinates (light lines, layered strands, pulling tighter) | "like a hat or a wig stuck on", "even worse" | MEASURE the reference head first (hair/skin mask, the correct H = hair top to chin): top width, hairline per x, width at cheek and jaw; overlay the reference outline at the same H scale. Wig = wide flat top + forehead open to the temples + straight sides without jaw volume + 3/4 without far-side hair + back shaped like a cloak |
| Hand holding an object from separate finger capsules | "the way it grips, ugh.. the fingers" | One hand shape: palm behind the object joined to the wrist + one jagged fingertip blob at the front edge of the object (tone wedges in the notches) + thick thumb lobe; object upright in the world |
| Rig explode sheet with spacing smaller than the joint overlap | Pieces still touch; does not read as a kit | Explode spacing = 1 joint circle diameter + a 0.05-0.06 H gap |
