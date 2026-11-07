# Reference: walk cycle, other motions, object animation, gait from data

Part of the `motion-graphics` skill. Read when: making a walk, run, wave, jump, sit, kick, or object/shape animation.

Moved verbatim from SKILL.md v2.3 (4. Walk cycle); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 4. Walk cycle
- Cycle T = 1.0-1.1 s. Phase p = (t/T) mod 1, far leg p + 0.5. Poses: contact 0, down 0.08, passing 0.33, up 0.42.
- The foot stays still against the ground while planted: v_ground = 2 x step / T. The footing background must move at exactly v_ground, otherwise the feet slide.
- Foot roll: heel pivot (-14 to -20 to 0 degrees, ease out), flat, ball pivot (0 to 26-32 degrees, ease in). The pivot really sits at the heel/ball (the ankle is computed from the rotation around that point).
- CONTINUITY (the cause of a "choppy" walk): the swing MUST start exactly at the toe-off position and end exactly at the next heel-strike position (the same stance function is used for the swing ends). The toe angle is blended smoothly, without switching modes. Check: the ankle speed change between frames has no spikes.
- Hips: lowest at contact, highest at passing (bob = 0.065 + 0.03 cos(4 pi p) H). The hip-ankle distance is at most 98-99% of the leg length; 100% = the knee locks and then releases (a break).
- The leg is almost STRAIGHT at passing. Hips too low = knees bent throughout the cycle = a crouching walk that reads as "choppy" (Review Results).
- Sample approved relaxed walk parameters: bob = 0.055 + 0.033 cos(4 pi p) H, step 1.10 H, T 1.06 s, heel strike in the first 22% of stance, max reach 99.1%.
- Wide trousers/long skirts: the cloth does not bend sharply at the knee (wide blend); in a side-view walk the silhouette of wide trousers reads as heavy, check it in the video.
- 2-bone IK: alpha = acos((L1^2 + d^2 - L2^2)/(2 L1 d)), knee = H + L1(cos(theta - alpha), sin(theta - alpha)), d max 0.999(L1+L2).
- Arms opposite to the legs: upper = +-22-28 degrees; the elbow bends when the arm is in front; the head lags 0.20 (nod 1-2 degrees). Chest leans 4 degrees.
- The swinging foot moves about 2-3x the body speed (about 0.3 H per frame at 24 fps) -> motion blur is REQUIRED, otherwise it strobes.
- Secondary springs (antennae, hair): u'' = -w^2 u - 2 zeta w u' - a_lateral, w = 2 pi x 2.3 Hz, zeta = 0.14.
- Run cycle (Ben Marriott): on twos, 7 drawings, left leg = right leg offset by 1 frame; reduce the head bounce when it is too much.
- Front-view run (Cloudwalk): cycle about 0.8 s (estimate); the character stays in the middle, the world comes towards the camera (scale = 1/z), hip bob A|sin|. Match cut: hard cut on an identical pose every 0.7-1 s (estimate), only the palette and particles change (seasons).

### 4.1 Other motions (unit H = head height, 24 fps, approved)
- A planted foot is solved with IK EVERY frame (the ankle target stays on the ground), so the foot does not slide while the body moves.
- Walk (side view): cycle 1.10 s, step 1.35 H, stance 50%: heel strike in the first 16%, flat, toe-off in the last 30%; swing: the foot lifts 0.30 H sin(pi u)^1.3, continuous ends (chapter 4); motion blur 4 sub-frames.
- Wave (front view): raise the arm 0.7 s (forearm lags 0.15 s), 4 swings in 1.9 s (forearm +-16 degrees, the hand follows with a phase difference of 0.6 rad), lower 0.8 s; the hand switches to the open set (palm facing forwards) as the arm rises; the shoulder lifts slightly.
- Silat side kick (front view): horse stance 0.8 s (hips down 0.30 H, feet apart +-0.86 H), hold 0.3 s, chamber (knee raised, thigh -78, shin +95 degrees) 0.35 s, kick 0.2 s ease out (thigh -76, shin 0, torso leaning 16 degrees away), hold 0.5 s, chamber, back to the horse stance, stand. The kicking leg leaves the IK only while it is raised. Fists clenched, guard stance (front arm guarding the face, back elbow down).
- Jump (side view): anticipation crouch 0.55 s (hips down 0.95 H, torso leaning, arms back), push-off 0.17 s ease in (arms swing up), rise 0.29 s ease out, fall 0.29 s ease in, landing and damping 0.25 s (knees bend), return 0.75 s. In the air the knees bend following sin(pi u).
- Sit (side view): the crate/chair BEHIND the standing position, its surface slightly below the knee (5.86 H, about 1.7 H above the floor). The feet stay in place; lean + hips back and down 0.6 s, down onto the crate 0.35 s, upright 0.35 s, hold 1.0 s, lean again, then stand 1.1 s. The hip height is COMPUTED from the contact of the buttocks with the surface (an iterative constraint, never penetrating), thighs almost flat, shins upright, hands IK to the knees (smooth blend). The old version was rejected: the buttocks at the crate edge and "inside the bench" because the hip height was guessed.

### 4.2 Object and shape animation
- Start from two extreme poses; anticipation, then the action; stagger with a fixed time offset (domino).
- Assembly: parts start from a random offset (scale 0.6-0.9), stagger 2-4 f, done in about 1.5 s.
- Shapes change in sequence while growing: circle > ring > diamond > hexagon > rectangle; shatter, then re-form. Shape morph: resample both paths to N points, then interpolate.
- One-take morph chain (Myth): 1-2 s per step, locked palette (dune > wave > tentacle > tree > horse > train > wall).
- Fake 3D coin flip: sx = cos theta, a side band d|sin theta| in the rim colour, the back side mirrored when cos < 0.
- Fake extrusion: an offset copy of 8-20 px (estimate), side quads in between, a specular top edge.
- Fake spinning globe: dots move with sin(lon + omega t) and shrink towards the edge.
- Vines: grow with a trim path, leaves pop along the stem. Hanging objects swing, then settle (small amplitude). A striped ball rolling: slide the stripes inside a circle clip.
- Floating objects bob on a slow sine; the floor shadow shrinks as they rise. A radial burst for impacts. Handoff: an object leaves the hand and the camera follows it.

### 4.3 Realistic walk cycle from gait data (Review Results, test project, strip accepted)
Reference data (adult woman):
| Parameter | Value | Source |
|---|---|---|
| Speed, step | 1.31 m/s, 66 cm (stride 132 cm) | Murray 1970 (OUHSC stride analysis) |
| Cadence | 60 x v / step = 119 steps/min; cycle T = 120 / cadence = 1.01 s | Derived |
| Stance / swing / double support | 60% / 40% / 2 x 10% | Missouri PM&R Normal Gait pp. 2, 4, 5 |
| Knee | 5-10 degrees during loading; max 65 degrees in early swing | Missouri pp. 14, 18 |
| Ankle | 0 degrees at heel strike; plantarflexion 20-30 degrees at toe-off | Missouri pp. 13, 17 |
| Centre of mass rise and fall | about 5 cm, 2 oscillations per cycle (male data) | OUHSC kinematics |
| Shoulder / elbow | range 20-25 degrees / 15-30 degrees (29.7 +- 10.2) | Gait & Posture 2019; CiSE 2023 |
| Step / body height | 0.46 | Barreira 2010 |

Conversion to a stylised character (big head, short legs):
- Scale the step to the crotch height, not the body height: step = (step/height) / 0.50 x the character's crotch height.
- Test character example: (0.40-0.46) / 0.50 x 2.36 H = 1.9-2.2 H (0.40 = Murray's 66 cm assuming a height of 1.64 m, because the subject height is not given in the source), while the v3 contact pose was only 0.89 H (43%). The user chose a realistic 2.0 H step, and the contact pose was rebuilt by the gait engine.
- Round the cycle to a whole number of frames (1.01 s becomes 24 f) so the loop fits.

Gait engine (unit H, hips at x 0):
- Planted foot: the heel on the ground moves at -v relative to the hips, x = H0 - stride x stance x u.
  - Heel rocker: heel pivot, angle -phi_hs to 0.
  - Flat.
  - Toe rocker: pivot at the TIP of the sole, not at the ball. A rigid shoe rotated at the ball pushes the toe of the shoe through the ground.
  - Every pivot is on the ground, so the foot does not slide.
- Planted position: H0 is chosen so the ankle sits right under the hips in the middle of the flat phase.
- phi_hs is solved so the ankle is neutral (0 degrees) at heel strike.
- Hips:
  - Computed from the leading stance leg with a target knee bend (loading, then midstance).
  - Then smoothed with a Fourier series of even harmonics only (half-cycle period, because the two legs are symmetric).
  - Then shifted down just enough that the stance leg reach is <= 99% in every phase.
  - The final heel-rise angle in terminal stance (phi_ps) is solved so the hip height joins up when the stance leg changes.
- Pre-swing: foot angle = Hermite from phi_ps (initial slope equal to the previous phase) to phi_to. phi_to is solved so the plantarflexion = 25 degrees at toe-off. When the reach overshoots, the angle is raised.
- Swing:
  - Ankle = Hermite from the toe-off state to heel strike, with tangents = the stance speed at both ends (C1 continuous).
  - Plus a lift L x sin(pi x w^0.65)^2: peak in early swing, zero derivative at the ends.
  - Foot angle = 2-segment Hermite: flat at 55% of the swing, then to -phi_hs.
  - The ankle is pulled towards the hips when the reach > 99% (late swing).
- Required report (`gait.py report`): hip bob, max reach, knee per phase and max swing, toe-off plantarflexion, swing clearance, ground penetration, ankle speed jumps per frame.
- Data vs rule conflict: the reach rule <= 99% makes the stance knee at least about 16 degrees (data: 5 degrees). Tell the user about this conflict. The user chose to keep the 99% rule.
- Test character result: bob 0.147 H, reach 99.0%, swing knee 66 degrees, toe-off plantar 24 degrees, clearance 0.062 H, penetration 0.000 H.

Rig redrawn per frame (not a mesh pull):
- Pose = hips (bob), legs (shoe cfg: pivot, position, angle; ankle; IK knee), arms (shoulder angle + elbow bend), head nod.
- Frames:
  - hips P = bob shift;
  - upper body U = lean + bob;
  - head = U rotated by the nod at the chin.
- The side-view shape functions (leg stations, arm tubes, shoes) are called again from the pose. Layers and colours are the same as the still drawing.
- Arms:
  - opposite to the leg on the same side: -cos(2 pi (p - lag)), lag 0.03;
  - the arm carrying a load gets a smaller swing (an assumption, tell the user);
  - the fist rotates 0.8 x the forearm angle.
- Secondary motion:
  - Hair tips = a vertical spring driven by the head acceleration, plus a constant drag backwards. The shape is warped only below the ears, with weight ((y - y0)/(y1 - y0))^2.
  - Bag = a pendulum at the fist's hanging point: psi'' = -(a_x cos psi + (g - a_y) sin psi)/l - damping. The fist acceleration is computed RELATIVE to the hips. Using a world position that jumps at the cycle boundary causes an impulse every cycle and the bag spins 90 degrees.
  - Hem = a spring driven by the near thigh angle.
  - Spring frequency 1.40-1.60 Hz (gait 1 and 2 Hz), damping 0.30-0.40. Pre-roll 5 cycles, then keep one periodic cycle.
- Gapcheck every frame: small gaps that appear when the bag strap/edge passes the leg edge are legitimate geometry gaps (covered by motion blur). Tell the user, do not hide them.

Running data (early research in the test project, not used by a rig yet; check the primary text before use):
| Parameter | Value | Source |
|---|---|---|
| Toe-off | about 40% of the cycle (walking 60%); double float at the start and end of the swing | Novacheck 1998 (Gait & Posture), via Physiopedia Running Biomechanics |
| Swing | given as 62% (inconsistent with toe-off at 40%; check the original text) | Physiopedia |
| Knee | initial contact about 40, loading 60, before toe-off about 40, max 125 degrees mid swing | Novacheck 1998 via Physiopedia |
| Hips | flexion about 50 at contact, hyperextension 10 after toe-off, flexion 55 at the end of the swing | Novacheck 1998 via Physiopedia |
| Ankle | dorsiflexion 10 at contact, rising to 25; max plantarflexion 25 in early swing | Novacheck 1998 via Physiopedia |
| Cadence | 2.68 m/s 169.2; 2.98 m/s 170.5; 3.16 m/s 172.3; 3.35 m/s 174.3 steps/min; self-selected 3.20 m/s, 168 | IJSPT, effect of running speed on cadence, Table 1 (30 runners, 11 women) |
| Step length | v / (cadence/60): 0.95 m at 2.68 m/s (the source says "stride 0.98 m", actually one step) | Derived |
| Vertical oscillation | 6-9 cm (secondary source, needs a primary source) | RunnersConnect |
