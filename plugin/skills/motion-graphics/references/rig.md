# Reference: rotation, rig, secondary motion

Part of the `motion-graphics` skill. Read when: building a rig, parenting, poses, joints, hair/cloth springs.

Moved verbatim from SKILL.md v2.3 (3. Rotation and rig); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 3. Rotation and rig
- The rotation anchor sits exactly at the centre of the joint circle; test by rotating before animating; no detail in the joint area. Standing objects: anchor at the base. Rigid objects rotate as a whole, not by moving path points.
- Chained parenting (see chapter 1); from the hips: hair > head > neck > collar > torso > belly > hips > main null; a foot that never lifts goes straight to the null. A null/root moves the whole body; squash on the null.
- Puppet pins/mesh for bending parts (cloth, hands, torso) so they stay one shape. In code: the finished artwork is cut once, sampled into polygons, and LBS-skinned to the bones (see vector-character chapter 5 (`vector-character/references/rig.md`)).
- Joints that "fill in" during motion (shoulder, armpit, elbow, hip, knee) are redrawn per pose and change CONTINUOUSLY with the angle, without if/else switches (vector-character chapter 8 (`vector-character/references/rig.md`)). Before rendering, make a sweep video per joint (for example an arm 0-120-0 degrees).
- Pose = a dict of local bone angles (degrees, + = clockwise on screen) + 'root' (body shift) + '<bone>_off' (pivot shift, for example a raised shoulder). Pose blend = lerp per key; IK targets (ikL/ikR, wN/wF) hold their value instead of lerping to 0.
- Short pieces (about 3 s): shape-path animation from pose to pose without an IK rig is fine. Boneless limbs (noodle): a curved centre line + a thick round-cap stroke.
- Blocking: every key of one pose at the same time with the same easing (hold keys); overlap is added afterwards.
- Alternating motion: key 0, 12 f (opposite angle), 24 f = key 0, then loop.
- Avoid unison: a different duration and phase for each part.
- Head turn: strong ease, dipping slightly in the middle (arc), the hips shift a little too, hair lags, then a hold of about 0.5 s.
- Hands move after the body/camera has started, and pause briefly in the air before the action.
- Characters on twos (12 of 24 fps); decorations on fours. Short stylised pieces can be full 12 fps: pose at floor(t x 12)/12.
- Hair is split per strand with staggered keys; wind sways left and right every 8 or 12 frames. Hair can stretch into a ribbon that becomes the portal to the next scene.
- Lip sync: 12 mouth shapes, hold (no interpolation) per sound, at least 2 frames per shape (time remap).
- Turnaround: fixed drawings per view (front, 3/4, side, back, mirrored side and 3/4, front), an anticipation dip before the turn + a small settle at each drawing change.
- Raised arms (especially loose clothing): a flat tube, elbow = a rigid piece + a joint circle, forearm straight (vector-character chapter 0 (`vector-character/references/mistakes.md`), 8).
- Multi-angle rig for an orbit: one 3D skeleton from the gait engine projected to the camera angle (vector-character chapter 16 (`vector-character/references/multi-angle.md`)). Motion (gait, arms, springs) is computed once in the body frame; the camera angle only changes the projection, so the feet stay planted at every angle.

### 3.1 Secondary motion (springs)
- Hair, scarves, skirts, tails, ropes = a chain of damped springs: theta'' = -w^2 theta - 2 z w theta' + gain (a_x / L) 57.3 - parent angular acceleration + wind (value noise) - drag (while walking).
- The spring frequency must NOT be close to the motion frequency (walk: hip roll 0.9 Hz, bob 1.8 Hz). Resonance at 1.0 Hz makes hair swing too much; use 1.35-1.55 Hz, zeta 0.32-0.35.
- Simulate with a 1.5 s pre-roll so the springs have settled by frame 0.
