# References: end-to-end character kit (character constructor kit style)

Part of the `vector-character` skill. Read when: making a full character kit (2D rig, expressions, visemes, gestures, turnaround, kit sheet).

Moved verbatim from SKILL.md v2.3 (18. End-to-end character kit (kit test project Review Results, 2026-10-30)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 18. End-to-end character kit (kit test project Review Results, 2026-10-30)
One female character in character constructor kit style from scratch to a full kit sheet. The character spec (palette, body) is in the project; here are the method and the kit style numbers.

### 18.1 The order that was finally accepted
1. Brief (AskUserQuestion): style, persona, set contents, outfit, hair, palette, skin; then the body type from the comparison sheet (chapter 3).
2. Front/side/back piece kit (chapter 5.1) -> proportion mode -> measure the kit (total height, fingertips, hem, side depth) -> pieces at final size.
3. Style layer (18.2), kit-style face, hands (18.4), hair (18.3).
4. Expressions + mouths (18.5), gestures (18.6), 3/4 rig + turnaround (18.7), full kit sheet (18.8).
Every step is sent with a before/after comparison and (for style) a side-by-side comparison with the reference at the same H scale.

### 18.2 Style layer (without changing geometry)
- Wrap `Fig.fill/shade/ink`: small organic edges (long wave 0.003 H, cached per path so the fill, line clip and shadow use the same edge), pressure strokes without centre-line wobble, no grain (review decision), saturation on par with the reference (take the median reference colour per material).
- Proportion mode from the same geometry: base colour -> gray per material, lines and contact turned off.
- Arm contact line over a body of the same colour: the sleeve edge is lined in the material line colour, only inside the body (an arm crossing the body does not disappear).

### 18.3 Hair (the longest problem: "like a hat/wig")
- MEASURE first (`measure_ref.py`). Female kit head numbers (H = hair top to chin): hair top +-0.23 at y 0.08 (round, narrow); hairline peaks at the parting (y about 0.18-0.21) then drops steeply to cover the temples (x +-0.20 -> y 0.31-0.38, x +-0.24 -> y 0.38-0.54); cheek sides +-0.45-0.48; volume at the jaw/shoulders +-0.55-0.66 with a large S curve; ears in front of the hair.
- Proven causes of the "wig": wide flat top, forehead open to the temples (hairline following the top of the face), straight sides without jaw volume, 3/4 without far-side hair, back shaped like a diagonal cloak, small repeating waves.
- What failed (do not repeat): LIGHT strand lines on dark hair (reads as wire); a shine equally large on both sides without a light direction; pulling the hair tight to the head (becomes a helmet); layered strands from narrow capsules (become ropes/dreadlocks); wrong H when measuring (chin detected automatically from the skin width -> all numbers off by 20%; measure H by hand).
- One light direction (top left) for all views: shine = a wide light band across the crown, cut by DARK strand lines (only inside the band); light side wider/lighter; form shadow = mass minus a copy shifted toward the light (screen space). Dark strand lines dL* -7, shine dL* +15 from the base (kit: L* 28 / 21 / 43).
- Curtain (`shapes.curtain2`): dip profile with 2 large S curves starting at the jaw (amplitude 0.05-0.06 H), 3-4 strand ends with different width/drop/flick, separation lines from notches; back view two symmetric curtains overlapping in the middle; 3/4 far-side hair frames the far cheek; side: volume at the nape (not tucked into the nape), then lying on the backpack/back.
- Hair side tucked behind the shoulder: the front part ends in a dip above the shoulder, the join behind the shoulder (drawn before the body) wide and jutting toward the neck so a head tilt does not open a gap.

### 18.4 Hands and grips
- Kit relaxed hand: one pen-silhouette shape (loose C grip, base with 3 stepped finger dips, thumb lobe) of 0.29 x 0.58 H; finger separation = dark skin TONE WEDGES (wide at the notch, thinning toward the root), short curves following the contour. Rejected: 3-segment capsules + nails + knuckles ("AI"), straight slanted lines ("cat scratches"), lines too long, hand too large/narrow.
- Object grip: palm (a capsule from the wrist computed back from the hand frame) behind the object + a jagged fingertip blob at the front edge of the object (a wedge in each notch) + thick thumb lobe; all in a world-UPRIGHT frame at the object centre (the object does not tilt with the arm; for a mirrored frame the rotation sign is flipped). Phone: screen visible as in the kit, palm behind, fingertips on one edge, thumb on the other edge; 3/4 = narrower + thickness side; side = thin edge, slanted. Glass: fingers wrapping in front, thumb on top. Carried book: fingers bent in front of the top edge.

### 18.5 Face, expressions, mouths
- Kit face: upright oval eyes without shine (0.021 x 0.039 H), short thick capsule brows (not tapered lines), nose one C line from the brow root to the nostril wing, full lips + an upper lip line, cheek blush.
- 12 expressions through brows (raised, worried, angry, flat, one-sided), lids (^ arc, closed, half), side glance, mouth. 3/4: far eye x0.76, front-set mouth shortened 0.80 on the 3/4 face centre line.
- 12 visemes + a head without a mouth. Open mouth = dark cavity + teeth + tongue + lower lip ATTACHED (not a floating line); O/U/QW = a whole oval (not a heart shape).

### 18.6 Gestures
- Whole arm = the same rig pieces rotated at the shoulder + elbow, the gesture hand attached through a hook (HAND_HOOK) without changing other pieces; 3/4 and side views use the same hook (shoulder/elbow pose per view; side mirrored -> the angle sign and the upright rotation are flipped).
- Thumbs up: forearm upright, thumb short and thick (a long one reads as an index finger). Thick index finger (not a needle).

### 18.7 3/4 rig and turnaround
- 3D skeleton from the front + side rig joints; body/pelvis = loft (`loft.rings_from`) superellipse m 1.25-1.3; legs/arms = tangent capsules at the projected joints (radius sqrt(w^2 + d^2)/sqrt2); 3/4 shoes are DRAWN (the convex hull of 3D points reads as a box); backpack = a 3D box with dark side panels; front details (collar, straps, pockets) projected onto the volume surface and clipped to the body.
- Turnaround: side, front 3/4, front, back 3/4, back, same landmark lines (top, chin, shoulders, hem, crotch, fingertips, knees, trouser hem, sole).

### 18.8 Full kit sheet
- Components rendered fresh from code (turnaround, piece kit + joint test, 3/4 rig + heads at 4 angles + hands, expressions + visemes + 3/4 expressions + head without a mouth, front + 3/4/side gestures), laid out with a title, character summary, hex palette; the components are also saved separately.

### 18.9 Working with the user at the style stage
- The user's style comments are short and get harsher when repeated ("AI banget" (so AI), "kaku" (stiff), "wig", "aduh.. jari2" (ugh.. the fingers), "LO RISET NDIRI" (do your own research)). Meaning: stop fiddling with numbers, measure the reference, find the cause of the shape, fix it at once in all views, send a comparison. Do not offer options that were already rejected (e.g. a hair colour that is already locked).
- When the user says "stop", stop the experiment, do not put it into the kit, report that the last accepted delivery is unchanged.
