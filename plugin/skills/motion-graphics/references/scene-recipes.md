# Reference: 3D figure, berthing ship, chibi objects, lip-sync narrator, pixel art and origami

Part of the `motion-graphics` skill. Read when: a scene like one of the v2.1 recipes.

Moved verbatim from SKILL.md v2.3 (12. Additions in Version 2.1 (05-11-2026)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 12. Additions in Version 2.1 (05-11-2026)

The recipes in this chapter come from the code demos of the guide site (2D canvas, the same 3D projection as `space3d.py`). The numbers are accepted starting points; character size, palette and project timing still come from the brief.

### 12.1 3D human figure: proportions and volume
- Classic adult proportions, unit H (chapter 4): **7.5 heads** on a 5.78 H body; one head = 0.771 H (top to chin). Landmarks in heads from the top: chin 1, nipples 2, navel 3, crotch 3.75 (1/2 of the height), knee 5.625 (1/4 of the height above the floor). The check numbers come from `gait_engine.canon()` (`python -I gait_engine.py report` prints height, knee, elbow, wrist and foot in heads); `MGP.figure3d` (chapter 13) uses the same canon.
- Shoulder width 2 heads (1.54 H) outside the deltoids (shoulder joint +-0.6 H from the centre line + sleeve volume); hips 1.5 heads, neck 0.5 heads.
- Hip joint 2.78 H from the top, crotch 3.75 heads = 2.89 H: the legs are about 1/2 of the body height.
- Elbow at navel height (shoulder + upper arm 0.95 H, about 2.85 heads), wrist at crotch height (about 3.75-3.8 heads), fingertips at mid thigh.
- Foot 1.1 heads. Chest, waist and hips have real depth so the side view stays round.
- The walking legs use the gait engine (chapter 4.3) with canon bones (thigh 1.54 H, shin 1.272 H), sample shoe x1.6, step and lift x leg length (about 1.12); angles and timing stay the same.
- Volume: every part = a tube of elliptical rings per section (shoulder, upper arm, elbow, forearm, wrist; thigh, knee, shin, ankle); torso = 10 rings (neck, shoulders, chest, waist, hips) with a back curve.
- Shading on top of 3 base tones, computed from the normal per point against the sun direction (lam):
  - core shadow = a thin dark band right at the terminator (lam < -0.38, alpha 0.32);
  - half-light = a soft light band on the lit side (lam < 0.45, alpha 0.22);
  - highlight = lam > 0.8;
  - rim light = the silhouette edge (fresnel factor > 0.84) on the side facing away from the light;
  - bounce = warm reflected light (#ffb27a mixed at 35%) on the dark side near the silhouette.
- Outline: stroke first, then fill (width 2 x lw, ink alpha 0.62); lw = clamp(0.016 x pixels per H, 0.45, 2.1) so the line thickness follows the camera distance.
- Draw order per frame: far arm, legs (sorted by depth), hips, neck, shirt, head (back hair, ears, head, facial features, front hair + strands), near arm last.
- Facial features are attached to the head surface (they foreshorten) and fade when the head turns away (hidden when facing < 0.04, ramp x5).
- Living idle: breathing 0.006 H with a 4.2 s period, nod 1.2 degrees with a 5.3 s period, head turn +-22 degrees with a 9.5 s period.
- The capsule primitives of the same pose are used for the cast and contact shadows (chapter 5.3), so the shadow always follows the pose.

### 12.2 One-take scene recipe: a tanker berthing at a jetty
One 46 s take without cuts, then a 4 s hold and repeat. The world is in metres: x along the jetty, y up (water = 0), z away from the jetty face (water z > 0, land z < 0). Ship frame: u forwards, v up, w to the ship's right (jetty on the left side).
- **Sizes.** Tanker L 176, B 28, freeboard 7.6, bow 40, stern 14. Tug L 28, B 10.
- **Stages** (u = t / 46):

| u | Stage | Content |
|---|---|---|
| 0-0.36 | Approach | Angled path, 2.6 to 1.3 knots |
| 0.36-0.6 | Slowing and straightening | 1.3 to 0.35 knots |
| 0.6-0.745 | Pushed by tugs | The ship moves sideways to the fender line |
| 0.745-0.77 | Against the fenders | 0 knots at u 0.75 |
| 0.765-0.9 | Mooring lines 1/6 to 6/6 | One line every 0.026 u (about 1.2 s) |
| 0.93-0.99 | Loading arms connected | |
| 0.99-1 | Safely moored | |

- **Path.** Hermite keys [u, x, z, heading]; a stop key (zero tangent) where the ship touches, so it does not overshoot.
  - Ship path: (-370, 128, -9.5 degrees) to (0, 22.5, 0), then sideways to B/2 + 1.7.
  - Tug in the ship frame: escorts at the bow on the sea side, turns in at -55 degrees, pushes perpendicular at -90 degrees (hold 0.61-0.77), backs off, then leaves.
- **Fenders and bollards.** A fender every 22 m, compressed when the hull leans on it (thickness 1.6 to at least 1.05). A bollard every 22 m on the jetty edge.
- **Six mooring lines.** Order: head line, forward breast line, forward spring, aft spring, aft breast line, stern line. Fairleads at u +-80, +-66, +-50 to bollards at x +-121, +-77, +-11.
  - A line is thrown in an arc (peak 7 m), falls slack (sag 3.2 m), then is pulled tight (sag 0.35 m within 0.05 u); its colour gets lighter when tight.
  - The line name labels are shifted up so they do not overlap.
- **Loading arms.** Two arms at x +-4: riser 18.5 m, two 12 m booms with 2-bone IK, from the stowed position to the ship's manifold.
- **Life.**
  - Ship: heave 0.14 m, roll 0.004 rad.
  - Water: bow foam while moving (> 0.12 knots), foam wakes behind the stern and the tug, a foam line at the waterline, a mirror reflection broken into glint lines, wave lines drifting slowly.
- **Camera.** Presets (azimuth, elevation, distance): Air 22 / 17 / 320 m, From the sea 352 / 6 / 250 m, Jetty end 78 / 11 / 300 m, From land 205 / 13 / 240 m. The camera chases its target with ease dt x 3; drag = orbit with elevation limited to 3-55 degrees.
- **Mood.**
  - Day: sun azimuth 205, elevation 38.
  - Dusk: sun azimuth 258, elevation 5; jetty lamps on (screen blend) and spilling onto the water.
- **Draw order.** With the camera on the sea side: land, jetty, arms, lines, ship. On the land side: the order is reversed.
- **On-screen text.** Caption "BERTHING · stage · SPEED x KN" + numbers (stage, speed, distance to the fenders, lines n / 6).

### 12.3 Personified chibi object (example: a coffee cup)
- **Chibi proportions.** A short round body; the face uses the top half of the body. Big eyes: 10 x 13 ellipses on a cup 128 wide, with 2 highlights. Short chubby arms (stroke 14, a short curve from the side of the body). Feet = two flat ellipses. Pink cheeks + blush lines.
- **Moods** (keyed states, motion-graphics-pro skill 6.7; the mood ids stay in Indonesian):

| Mood | Eye scale | Steam | Arm angle | Emote |
|---|---|---|---|---|
| `normal` | 1 | 1 | 18 | - |
| `senang` (happy) | 0.55 (smiling) | 1.25 | 128 (waving) | heart |
| `sedih` (sad) | 0.85 | 0.4 | -12 (limp) | drop + cloud |
| `kaget` (surprised) | 1.2 | 1.7 | 140 | exclamation mark |
| `marah` (angry) | 0.8 | 2.4 | 70 (shaking) | anger mark |

- **Arms per mood** (on twos, angle rounded to 2 degrees): happy waves +-14 degrees, angry shakes fast +-7 degrees, sad hangs, normal sways slightly +-4 degrees.
- **Reacting steam.** The steam sticks to the top of the lid, which squashes along. Speed and thickness = the mood's steam factor, chased smoothly with dt x 3. Angry: reddish steam, fast, thick. Sad: bluish steam, thin, slow, drooping.
- **Mood-change take.** The eyes lead by 2 drawings (0.17 s, up 5 px). Anticipation squash -18% for 0.25 s with the arms folded (-20 degrees). The new face appears at the deepest squash (+ sparks). Settle: overshoot 15% x exp(-5 s), frequency 3.
- **Jump.** Squash 20%, an arc up 78 px with the arms raised 160 degrees, landing damped (exp(-6 s)). The squash keeps the area: sx = 1 + (1 - sy) x 0.5. The shadow shrinks and fades while rising.
- **Blink** 0.17 s at random every 2-5 s; the eye highlight disappears during a blink or when the eyes narrow (< 0.7).
- **Emote** appears after the new face (pop with 35% overshoot), then floats up and down.
- All motion on twos (12 drawings per second). Collage scene: every shape a cutout with a hard offset shadow (3, 4 px).

### 12.4 Narrator face with lip-sync
- **Visemes from per-letter timing** (the same as viseme_id in the motion-graphics-pro skill 6.8):
  - Mapping: a to A; o to O; u, w to U; f, v to FV; i, e, é, y to E; m, b, p to MBP; other letters = E with weight 0.5.
  - Text inside [ ] is not spoken.
  - Gaps < 2 drawings are bridged.
  - Each drawing picks the viseme with the largest time coverage.
  - Every m/b/p is guaranteed at least one closed-mouth drawing.
  - The last drawing = a smile.
- **Mouth.**
  - Open shapes are filled dark (#5b1f22) and clipped: the upper teeth show on A, E, FV; the tongue shows on A, O, E.
  - The lip line is thicker when closed (7 vs 5.5).
  - Openness: A 1, O 0.8, E 0.6, U 0.45, FV 0.3, MBP and X 0.
- **Head.** A nod follows the mouth openness (2.4 x open, chased with dt x 9) + a slow sway. Rotation +-2.2 degrees slowly + +-1.6 degrees while talking, pivoting at the neck. The body follows slightly. All on twos.
- **Brows** rise with open vowels (-2.5 x open) and rise 3 more when the script contains the tag [excited] / [senang] / [semangat] / [happy].
- **Eyes.** Blink 0.15 s every 2.2-5 s (y scale 0.1); slow glances +-1.4.
- **Test.** Letter time 0.07 s, punctuation 0.25 s; a viseme strip per drawing is shown for a check by ear; JSON {t, v} for use in the render.

### 12.5 Motion in pixel art and origami styles
The character, skeleton and walk cycle stay the same; only the drawing method and the clock change (drawing the character: vector-character skill chapter 19 (`vector-character/references/style.md`)). Vector = 24 drawings per second, joints rotate smoothly.

**Pixel art.**
- The scene is drawn into a low-resolution buffer. Screen pixel size ps = max(3, round(screen height x 0.6 / 48)), so the character is about 48 pixels.
- Draw with imageSmoothing off and integer scaling.
- Clock: tq = floor(t x 8) / 8 (8 drawings per second, stepped); walk 6 drawings; idle 2 drawings alternating 2 per second; blink 0.13 s every 3.2 s.
- Sprites are cached per (motion, drawing, blink).
- Parallax in whole pixels: clouds 0.1, hills 0.4, ground 1.0 of the scroll speed.
- Sky = checkerboard dither bands (not a gradient).
- Sample sprite sheet: 6 walk drawings side by side, the drawing currently shown boxed.

**Origami.**
- Clock 12 drawings per second.
- Unfolding: each face rotates about its first edge (hinge), staged from the feet up, a 0.025 s delay per face, 0.45 s per face (inout cubic). When cos < 0, the cream back side shows (#f4ead6).
- Eyes and cheeks appear after the unfold has finished (> 1.2 s).
- Folding crane: 8 triangles change shape from square to triangle to bird base to crane.
  - Hold/change order (s): 0.7, 0.9 + 0.5, 0.9 + 0.5, 0.9 + 2.0, then back 0.9.
  - The interpolation is quantised to 12 steps.
  - Triangles whose winding flips show the back side of the paper.
  - The wings flap +-8% in the last step.
  - Step labels "1 · square paper" to "4 · finished crane".
- Kraft background (#efe3c9) with a faint triangle texture, two-tone paper mountains + snow caps, ground #c9935a with light crease lines; mountain parallax 0.25.
