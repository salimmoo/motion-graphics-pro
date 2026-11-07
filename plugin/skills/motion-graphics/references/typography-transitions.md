# Reference: kinetic typography, transitions, camera, effects, pacing

Part of the `motion-graphics` skill. Read when: moving text, transitions, camera, light effects, and duration structure.

Moved verbatim from SKILL.md v2.3 (6. Kinetic typography, 7. Transitions and camera, 7.1 Effects, 7.2 Pacing); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 6. Kinetic typography
- Per-letter entrance with a mask reveal from the baseline: stagger 0.03 s, duration 0.6 s, ease out back 1.4; opacity done at 45% of the duration.
- Exit faster: 0.3 s ease in cubic, stagger 0.015 s. Supporting sentence per word: stagger 0.05-0.08 s, shift 26 px, ease out expo.
- One word per beat: the new word enters blurred, pops in scale 0.6 > 1.08 > 1.0, then sharpens. A dot bouncing over the words (lyric style). Typewriter with a faint offset copy (shadow).
- Letter swap: letters swing on an arc with 40-60 degrees of rotation (estimate). Parts of a glyph can become objects (a colon becomes two doughnuts falling at different times).
- Logo as a fake text editor: text selected, replaced, typed, a cursor click, then a stroke drawn around it, about 7 s.
- Large mesh-warp title: y += A sin(2 pi x / L) + skew; swap black and white during the warp. Text inside footage, scattering letters.
- Labels: tracking 2 -> 10 px. Accent lines: grow with ease out expo, retract with ease in expo. One big thing moves at a time; text holds fully still for at least 1 s.

## 7. Transitions and camera
- Layered circle wipe: 3 circles offset 0.12-0.16 s, ease in-out cubic; the new scene zooms 1.10 -> 1.0.
- Panel wipe: the second panel follows 0.12 s later; the old scene is pushed 170 px.
- Callout: dot pop (ease out back 2.2) -> trim-path line -> box 0.75 -> 1 overshoot -> text wipe; the target follows the rig position.
- Open with a blurred extreme close-up, then zoom out to reveal the scene (about 1.4 s, ease out). Gradient reveal from black. Tilt down a wall to reveal the subject. Fly into an object until it turns abstract, then pull back.
- Push the camera into a door/hole/keyhole to change scene.
- The scene shrinks into a card, then scrolls away or is set down by a hand; a perspective frame pulled off screen; scenes on the sides of a turning cube; a 3-panel split screen.
- A diagonal wipe with a blurred edge, a paper tear, a hard cut on the beat; a dark foreground passing for 2-4 f (estimate) to hide a cut.
- Endless spiral tunnel: nested polygons at scale k^i (k about 0.8), rotation i x dtheta (10-20 degrees, estimate), zoom k^(-frac(vt)).
- 360-degree orbit: the camera parented to a null that turns once; flat 2D assets always face the camera; motion blur on.
- One-take orbit with a 2D character (Review Results, test project):
  - the background is built as a simple 3D space (chapter 5.2);
  - the take timeline = a separate module with no drawing dependencies (character position, facing, action, walk phase, camera azimuth, distance), shared by the render and the keepout;
  - character drawing angle v = camera azimuth from the character - character facing (0 front, 90 = 90R, 180 back, 270 = 90L);
  - character: a multi-angle rig from one 3D skeleton (vector-character chapter 16 (`vector-character/references/multi-angle.md`)), continuous angles; the old version with 16 still drawings swapped and shifted read as sliding;
  - the character's light direction is recomputed per angle from the world sun (review decision, test project);
  - the camera distance is chosen from a comparison sheet (test project: 14 H for every beat, character 31% of the frame height);
  - drawing swaps (if any remain) are hidden by motion blur or a dip.
- Fitting the multi-angle rig into the one-take animatic (tested in the rig v4 test project, not yet accepted as a result):
  - one function `pose_for(state)` returns the rig joints for the render AND the shadow (3D primitives from the same joints), so the shadow always matches the pose, also during blends;
  - actions not rigged yet use the standing pose (legs almost straight at 99%, feet flat, arms hanging), the camera angle stays continuous, the label "not rigged yet" stays in the frame;
  - action changes (stand -> walk, walk -> stop, turn -> run) are blended over 0.3 s (staged joint lerp), not swapped abruptly;
  - a placeholder run with the walk rig: phase = distance travelled / (2 x step), so the feet stay planted; label "walk rig sped up";
  - character light from the world sun through the body frame (vector-character chapter 4 (`vector-character/references/anatomy.md`)); the character sheet keeps the reference light;
  - orthographic billboards in a perspective scene: measure the foot slip (px) per beat BEFORE the full render. Test character project: side 1 px, front/back orbit 57 px. A perspective correction on the legs only removed the slip but lengthened the legs (rejected); a correction must be consistent for the whole figure (vector-character chapter 16.1 (`vector-character/references/multi-angle.md`)).

## 7.1 Effects
- Edge roughness gets stronger as the character comes closer to the camera.
- Travelling shine: a light mask sliding over a copy of the line. 4-point sparkle pop of about 6-8 f. Thin white elliptical trail lines around a spinning object.
- Neon: a thin stroke + glow, drawn on progressively (trim path); moving neon text = glow + 4-6 fading copies behind the direction of motion.
- Jagged starbursts / torn edges for the collage style; iridescent gradients + grain. DOF blur by depth.
- Light rays (warm style): quads from the sun's screen position (may be outside the frame), alpha gradient 0.16 to 0, screen blend (`brush.Paint(blend="screen", shader=brush.linear_gradient(...))`; JS canvas: `globalCompositeOperation = "screen"`); the sky glow still reaches the frame when the sun is outside it (radius plus the distance outside).

## 7.2 Pacing
- Music loop 13-37 s, a cut every 1-4 s on the beat; narrative scenes 2-6 s.
- 15 s structure: hook 2 s, action 6 s, settle, title hold about 3 s, credits. 34 s brand film: logo 3 s, 8-9 beats of about 3-4 s (estimate).
- Showreel: cuts of 0.5-2 s on the beat, lyric words on the vocals, a logo wall at the end.
- Fast action of 2-3 frames, then a long hold. End card in the middle of a plain background for 2-5 s.
- Sample approved 18 s take (test character): wave 3.4 s, turn 1.0 s, walk followed 2.0 s, walk + 270-degree orbit 6.0 s (45 degrees/s), turn + start running 1.6 s, run + 180-degree orbit 4.0 s.
