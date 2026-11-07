# References: rig, corrective joints, environment contact

Part of the `vector-character` skill. Read when: preparing a character for animation (LBS, 2D kit, joints that fill, contact).

Moved verbatim from SKILL.md v2.3 (5. Rig (so it stays one shape while moving), 8. Corrective joints: areas that are "filled" while moving, 9. Contact with the environment); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 5. Rig (so it stays one shape while moving)

- The FINISHED artwork is cut once in the rest pose (high resolution, 200 px/H), every outline is sampled at 0.008 H into a polygon (puppet mesh, Adobe Puppet Warp M01), points are LBS-skinned to bones: head, neck, chest, pelvis, upper/fore/hand L-R, thigh/shin/foot (+ toe for foot roll) L-R. Rotation anchors at the centre of the joint circles.
- Every layer has a weight `hint`: 'auto' (computed from position), 'torso' (never to the arm), a bone name (rigid), 'arm+-1' (arm chain only).
- Weights must be CONTINUOUS across shared edges (e.g. the body | sleeve edge), otherwise the edge tears. Weight transitions use smoothstep along the bone.
- Body layers (outer garment, collar, belt) are never weighted to the arm. Sleeve = arm chain only, cut diagonally below the shoulder, rotating rigidly; shoulder + armpit from chapter 8.
- Shoulder pivot at the centre of the deltoid circle; shoulder elevation when the arm goes up = a small offset of the upper arm bone (about (0.02, -0.08) H).
- Straight bones, rounded joints. 2-bone IK for the legs (front: knee outward; side: knee forward) and arms (elbow backward). Foot/toe angles are given in world angles, so the stance foot stays flat.
- Hands = a swap set, rigid on the hand bone; layers cached per hand set combination.
- Shadows and cast shadows are RECOMPUTED on the posed shape. Pathfinder via `brush.union`/`brush.subtract`: on the skia engine with try/except + `brush.simplify` (skinning can make self-intersecting polygons); the pure engine computes booleans exactly per sample at draw time, so no fallback.
- The style can change without changing the rig: the paint layer (colour, outline, detail, face) is a separate module that replaces the painter functions; geometry and weights stay.

### 5.1 Kit-style 2D piece rig (character constructor kit research)
- Pivot at the centre of the half circle at the piece end (inset = half the width). Two round ends with equal radius at one pivot -> joint overlap = 1 diameter, outer silhouette whole at every angle.
- Pieces: head; body + collar + neck (skin capsule, round top end rising into the head, head pivot at its centre); pelvis (straight top edge at the belt, bottom edge two curves centred on the hip pivots); thigh capsule; shin (round top, flat bottom = hem + cuff band); ankle/sock its own small capsule; shoe its own piece; upper arm capsule; forearm (round top, bottom = cuff); separate hand with a wrist stub; rolled sleeve band = its own piece covering the elbow.
- Side rig: upper thigh widens backward (buttocks) about 1.27x; each character has 3 rigs (side, 3/4, front) at the same turnaround scale.
- Assembly check: hip pivot = crotch +-0.07 H; the reassembled pieces must cover the turnaround silhouette without gaps.
- Piece shape = TANGENT capsule (`scripts/shapes.py` `cap`): circles of equal radius at the pivot on both meeting pieces, sides = outer tangent lines, thigh/calf/arm bulge zero at the ends; hem/cuff = `cut` perpendicular to the axis + a cuff band (`band`). Pieces drawn directly at final size (a screen warp makes the joint ends stick out of the trousers).
- Explode sheet: spacing between pieces = 1 joint circle diameter + a 0.05-0.06 H gap, white pivot points. Add a joint test block (knee 22-30, hip 14-22, shoulder 24-28, elbow 38-48 degrees) and a proportion check block (assembly of all views + landmark lines).
- Relaxed turnaround pose: shoulders -1.5..+1, elbow 6-7 degrees, head tilted 2 degrees, one leg slightly open; head rotation at the neck pivot. An arm holding an object is drawn last (in front of the other arm and the hair) + a contact line along the sleeve edge over a body of the same colour (`edge_on`).

## 8. Corrective joints: areas that are "filled" while moving

Review Results: the joint areas that fill while moving (shoulder, armpit, elbow, hip, crotch, knee) must have an actual anatomical shape and stay PROPORTIONAL at every angle. Nudging points/pulling the mesh is not enough.

- Shoulder + armpit are REDRAWN every pose from the posed geometry (pose-space corrective), drawn between the sleeve and body layers:
  - Top: trapezius from the neck (about 0.50, 1.25 H; same slope as the silhouette, rising slightly with abduction), then one cubic curve to the top edge of the upper arm, tangent to both (handles 0.42 x distance) -> the deltoid is one round arc. Above horizontal (more than 60 degrees) the shoulder tangent is aimed along the arm.
  - Armpit: the underside of the upper arm is intersected with the chest side line; the corner is filleted. When the arm is down the corner is hidden. A hollow shadow + 2 fabric folds appear smoothly with the angle (starting at 35 degrees).
  - The upper sleeve is cut diagonally below the shoulder and rotates rigidly; its top is replaced by this shoulder curve.
  - Loose clothing: shoulder = cubic from the trapezius to the outer edge of the arm + an armpit wedge from the tube root to the body side, without a line across the armpit.
- MUST be continuous: no if/else that turns shapes on/off. The fillet is always computed; radius (0 -> 0.075 H, smoothstep 5-45 degrees), hollow depth, shadow and folds rise smoothly from 0 with the angle. (The version with an angle toggle was rejected: "the armpit first stays attached, then suddenly snaps off".)
- Proportions kept at every angle: upper arm width fixed (measured from the reference), deltoid mass does not shrink/grow, trapezius length to the shoulder tip fixed. Measure the width perpendicular to the arm axis at 0, 30, 45, 60, 76, 108 degrees.
- Raised arm: upper arm = an even tube; elbow = 2 rigid pieces + a joint circle; straight forearm.
- The same principle for the elbow (round outer side, fold on the inner side), knee, hip/crotch during a kick.

## 9. Contact with the environment

- Every contact (feet on the ground, buttocks on a chair/crate, hand on the knee/an object) is COMPUTED as a constraint, not guessed. Sitting example: trouser points in the buttock/back-of-thigh area are skinned, the root is raised/lowered iteratively (12 times, factor 0.8) until the lowest point sits exactly on the surface; when approaching/standing up it is only pushed out (must not penetrate). Check: maximum penetration 0.000 H in all frames.
- Object size follows the body: chair/crate a little below knee height (surface about 1.7 H from the floor) so the thigh is almost level and the shin upright; the object is placed BEHIND the standing position (the person steps back, then sits), not under the body.
