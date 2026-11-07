# Advanced motion principles (v2.4)

This reference summarises the advanced motion principles already built into the `motion-graphics/lib/` library: physical springs, inertia, chained delay, constant-volume squash, constant stroke, rubberhose, the 2.5D head, FACS expressions, SLERP, rigid folding and the origami validator, Miura/Yoshimura/Kresling patterns, MoGraph fields, and curve QC with `mgp curves`.

Each section contains:
- the principle in one or two sentences;
- when to use it in a video;
- the API with a short example;
- QC reference numbers.

Every function is deterministic: the value at second `t` is always the same from any seek direction, so it is safe to render frame by frame.

Full examples are in `lib/examples/`:
- `motion-principles.html`: springs, inertia, delay, squash
- `rubberhose.html`
- `face.html` and `facs.html`
- `slerp-camera.html`
- `fold-pattern.html`
- `field.html`

The ready-made blocks are `blocks/paper/miura`, `yoshimura` and `kresling`.

---

## 1. Physical springs: presets `bouncy`, `snappy`, `heavy`

A spring is defined by mass m, stiffness k and damping c, not by a duration. The damping ratio ζ = c / (2√(mk)) sets its character. ζ < 1 bounces, ζ = 1 arrives fastest without passing the target, and ζ > 1 is slow and heavy. The response is computed in closed form, not by per-frame integration, so a random seek stays exact.

| Preset | m | k | c | ζ | f₀ | Natural duration (±0.5 %) | Overshoot |
|---|---|---|---|---|---|---|---|
| `bouncy` | 1 | 180 | 12 | 0.45 | 2.1 Hz | 0.88 s | 21 % |
| `snappy` | 1 | 180 | 26.8 | 1.00 | 2.1 Hz | 0.56 s | 0 % |
| `heavy` | 4 | 160 | 75.9 | 1.50 | 1.0 Hz | 2.27 s | 0 % |

**When to use**
- `bouncy`: cheerful pop-ins of icons, stickers or cards.
- `snappy`: UI transitions, sliding panels, or typography that must feel tidy.
- `heavy`: large objects, corporate logos, or a camera that lands slowly.

**API**

```js
// mgp.motion (timeline): ease string, the curve shape depends only on zeta
tl.to(".card", { y: 0, duration: mgp.motion.spring("bouncy").duration, ease: "spring.bouncy" });
tl.to(".panel", { x: 400, duration: 0.6, ease: "spring(1, 180, 26.8)" });       // your own m, k, c
// MGP modules / canvas
const y = MGP.core.springPhys(t, "snappy", { from: 0, to: 100, v0: 0 });              // real seconds
const e = MGP.core.springEase("heavy");                                          // ease 0..1
const { freq, damping } = MGP.spring.fn.preset("bouncy");                     // for the old spring()/springState()
MGP.core.springInfo({ mass: 2, stiffness: 300, damping: 20 });                  // -> {zeta, frequency, ...}
```

**QC reference**
- ζ 0.3–0.5 for a friendly bounce, with 2–3 visible oscillations.
- ζ < 0.25 feels like a toy spring. Use it only on purpose.
- ζ 0.9–1.1 for UI.
- ζ 1.3–2 for heavy objects.
- The tween duration should equal `mgp.motion.spring(name).duration`. When it is shorter, the spring feels cut off.

The older presets `blockSpring`, `blockSpringSoft` and `blockSpringStrong` (old names `pegas`, `pegasLembut`, `pegasKuat`) in `block-core.js` remain (frequency 2.2/1.6/3.2 Hz with ζ 0.32/0.55/0.22), so old blocks do not change by a single pixel.

## 2. Inertia (inertial bounce)

After a keyframe, an object does not stop dead. It bounces in the direction of its arrival speed and damps out exponentially:

y = y_k + v·A·sin(2πfΔt) / e^(γΔt)

The arrival speed v is taken from the keyframe itself. An "out" ease that arrives slowly hardly bounces, while an "in" or linear ease bounces strongly.

**When to use**
- Cards or icons that slam into place.
- Text that stops suddenly.
- Indicator needles.
- A camera that stops.

**API**

```js
// mgp.motion: tween + bounce tail (duration grows by `tail`, default 1 s; the end value stays exact)
tl.to(".icon", mgp.motion.inertia({ x: 600, duration: 0.5, ease: "power2.in" }, { amp: 0.05, freq: 2.5, decay: 5 }));
// canvas: keyframes [[t, value, ease]] or a function + o.keys
const x = MGP.core.inertia([[0, 0], [0.5, 600, "in"], [3, 600]], t, { amp: 0.05, freq: 2, decay: 4 });
```

**QC reference**
- `amp` 0.03–0.08, `freq` 1.5–3 Hz, `decay` 3–6. The bounce should settle within 0.4–0.9 s.
- The first deflection is roughly v·amp. For example v = 1200 px/s and amp = 0.05 give ±60 px, so the sensible limit is 5–10 % of the distance travelled.

## 3. Chained delay (follow-through, overlap)

A child repeats the parent's motion with a delay per index: child_i(t) = parent(t − k·Δ·i). This is the same as `valueAtTime(time − delay)` in AE. Because no state is stored, the result is always the same when seeked.

**When to use**
- Hair, tails, scarves, or chains of points.
- Text lines that follow the previous line.
- Groups of icons moving in a wave.

**API**

```js
const chain = MGP.core.delayChain((t) => parentPos(t), 5, { frame: 3, fps: 24 });   // -> (t) => [x0..x4]
const xi = MGP.core.delay(parent, t, i, { delay: 0.1 });
// DOM + mgp.motion: stagger is the same idea
tl.to(".letter", { y: 0, duration: 0.5, ease: "spring.bouncy", stagger: 3 / 24 });
```

**QC reference:** overlap delay 2–4 frames (24 fps) per child; tip follow-through 4–8 frames after the parent stops. More than 6 frames per child feels like a separate motion.

## 4. Constant-volume squash & stretch

When an object squashes or stretches, its area (2D) or volume (3D) stays the same. The rule is sx·sy = 1 in 2D and sx·sy·sz = 1 in 3D. When only scaleY changes, the object seems to inflate and deflate instead of feeling springy.

**When to use**
- A bouncing ball, a jumping object with a face, a landing character.
- A button being pressed.

**API**

```js
const { sx, sy } = MGP.core.stretch(1.3);                // sy 1.3 -> sx 0.77
const m = MGP.core.stretchDirection(1.4, motionAngle);          // stretch along the motion, det = 1
const s = MGP.core.stretchVelocity(speedPx, { k: 0.0008, max: 0.35 });
MGP.core.volumeError(sx, sy);                            // |sx*sy - 1|
MGP.spring.fn.bounceBallVolume(u);                       // constant-volume bouncing ball
```

**QC reference**
- Contact for 1–2 frames with sy around 0.7–0.8.
- Stretch at speed 1.15–1.35.
- Volume error below 5 %. `mgp curves` flags errors above 10 %.

## 5. Constant stroke while scaling

An ink line stays a set number of screen pixels thick while the character or icon is scaled up or down. This is the equivalent of `vector-effect: non-scaling-stroke` in SVG or the expression `value / (scale/100)` in AE.

**When to use**
- Zooming on a line-style character.
- Icons with animated scale.
- A line style that must be uniform across one scene.

**API**

```js
MGP.characterStyles.create("#a", { style: "vector", strokeFixed: 2 });    // 2 px screen ink
MGP.vectorKit.create("#b", { strokeFixed: 1.5 });                         // every kit line (base 0.02 H) -> 1.5 px
g.lineWidth = MGP.core.fixedWidth(g, 2, dpr);                             // on your own canvas
```

For SVG or DOM, use the attribute `vector-effect="non-scaling-stroke"` on the scaled path.

**QC reference:** within one scene, ink thickness between characters must not differ by more than 1 px. The ink of a character close to the camera may be thicker only when that is intended.

## 6. Rubberhose (bendy arms and legs)

A limb is drawn as one arc from its root (shoulder/hip) to its tip (hand/ankle) with a constant arc length. When the distance shrinks, the limb bends into a curve. When the distance reaches full length, the limb is straight and never stretches. On a vector character, the trouser end is cut above the ankle with a *butt* cap, then checked so the line edge never drops below the sole.

**When to use:** 1930s cartoon style, mascots, light explainers, and characters that must feel bendy.

**API**

```js
MGP.characterStyles.create("#a", { style: "vector", action: "walk", limbs: "rubber" });
const r = MGP.core.rubber(shoulder, hand, 28.5, { dir: 1 });     // {pts, tip, straight, th}
MGP.core.strokeBottom(MGP.core.trimEnds(r.pts, 1.3), lineWidth); // lowest y of the line, to check against the sole
```

**QC reference**
- Arc length the same in every frame (difference below 0.5 %).
- Knees bend forwards and elbows backwards.
- The lowest point of the leg is always above the sole. Test result: −0.40 units over 200 walk poses.

## 7. 2.5D head from 5 poses

A flat face seems to turn in three dimensions when each feature moves at a different speed (parallax). The nose, furthest forward, moves most; the eyes and mouth move a medium amount; the ears and back hair move the opposite way. Features on the far side are also compressed.

Five extreme poses (center, left, right, top, bottom) are blended by a joystick (jx, jy):

P = C + max(jx,0)(R−C) + max(−jx,0)(L−C) + max(jy,0)(B−C) + max(−jy,0)(T−C)

**When to use:** a narrator who turns towards a chart, a character glancing aside, or a quick look round, without drawing a separate 3/4 view.

**API**

```js
MGP.face.create("#stage", { joystick: [[0, [0, 0]], [1.2, [1, 0]], [3, [-0.6, 0.3]]], expression: "happy" });
const pose = MGP.face.poseHead(MGP.face.POSE_HEAD, jx, jy);   // or 5 poses of your own (any nested number object)
```

**QC reference**
- A full turn (|jx| = 1) needs only 0.4–0.7 s, with ease in/out or `spring.snappy`.
- Eyes and head move first, then the body follows 2–4 frames later.
- Nose parallax below 35 % of the face width. Beyond that the face looks broken.

## 8. FACS-lite expressions (Action Units)

Expressions are built from separate muscle contractions, no longer from one emotion slider. The available units:

| Unit | Motion |
|---|---|
| AU1 | inner brow raise |
| AU2 | outer brow raise |
| AU4 | brow lower |
| AU5 | upper lid raise |
| AU6 | cheek raise |
| AU7 | lid tighten |
| AU12 | lip corner pull up |
| AU15 | lip corner press down |
| AU23 | lip tighten |
| AU26 | jaw drop |
| blink | lids closed |

Emotions already used in other modules are mapped to AUs in `MGP.face.EMOTION`. Combining with lip-sync does not clash because the jaw is shared: jaw = max(viseme, AU26). Lip corners are still added while talking (smiling while talking), but damped when the viseme is round (O/U).

| Emotion | AU |
|---|---|
| happy / smile | AU6 + AU12 |
| sad | AU1 + AU4 + AU15 |
| surprised | AU1 + AU2 + AU5 + AU26 |
| angry | AU4 + AU5 + AU7 + AU23 |
| unsure | AU2 + light AU4 + AU15 + AU23 |

**When to use:** a narrator who reacts while talking, an object with a face showing mixed emotions (for example "unsure smile" = AU12 0.4 + AU1 0.5), and a vector kit that needs expressions beyond the eight presets.

**API**

```js
MGP.lipsync.create("#a", { text: "...", expression: [[0, "neutral"], [1.5, "happy"], [3, { AU1: 0.6, AU12: 0.3 }]] });
MGP.vectorKit.create("#b", { expr: (t) => MGP.face.toVectorKit(MGP.face.auAt(keys, t)) });
MGP.chibiObject.create("#c", { faces: { focus: MGP.face.toChibi({ AU4: 0.6, AU12: 0.3 }) }, moods: [[0, "focus"]] });
const F = MGP.face.merge(MGP.face.au("happy"), MGP.lipsync.at(track, t));   // combined face parameters
```

**QC reference**
- Transitions between expressions 0.2–0.35 s (option `transition`, default 0.25 s).
- Blink 0.1–0.15 s every 2.5–5 s.
- Eyes and brows change 2–3 frames before the mouth.
- Keep AU26 from emotions below 0.4 while talking, so the visemes stay readable.

## 9. Quaternion SLERP for 3D rotation

A rotation is represented by a unit quaternion and interpolated along the shortest arc at constant angular speed (Shoemake, 1985). Euler interpolation (azimuth and elevation lerped separately) can swing the camera a long way round the object, and near a top view it can hit gimbal lock or jumps.

**When to use:** an orbit camera moving between distant angles, especially past a top view; 3D joints rotating more than 90° on two axes at once.

**API**

```js
MGP.sceneTanker.create("#a", { cameraKeys: [...], cameraInterp: "slerp" });   // default stays "euler" (old pixels unchanged)
const q = MGP.core.slerp(MGP.core.quatEuler(0, 30), MGP.core.quatEuler(170, 60), k);
const direction = MGP.core.slerpDirection(az0, el0, az1, el1, k);                      // camera {az, el} without roll
MGP.core.quatRotate(q, [0, 0, 1]);
```

**QC reference**
- Camera moves of more than 120° should use `slerp`.
- Elevation is limited to 84° in `sceneTanker`, because a straight-down view makes the projection undefined.
- Camera angular speed below 60°/s for calm scenes.

## 10. Rigid folding and the crease pattern validator

In rigid folding, every panel stays flat and only rotates about its hinges. Shared edges between panels must never come apart; panels that come apart look like "broken glass".

A flat-foldable crease pattern must meet local conditions at every interior vertex:
- **Maekawa:** |M − V| = 2.
- **Kawasaki:** the alternating angles sum to 180°.
- **Even degree:** the faces can be coloured with two colours.

Global collisions between layers (NP-hard) are not checked.

**When to use:** before animating your own origami pattern, and to check your own fold transitions.

**API**

```js
const v = MGP.origamiFold.validatePattern({ titik: [[0,0],[1,0],[0,1],[-1,0],[0,-1]], lipatan: [[0,1,"M"],[0,2,"M"],[0,3,"M"],[0,4,"V"]] });
// v.ok, v.peringatan (warnings): ["titik 0 (0, 0): Kawasaki gagal, ..."]
MGP.paperFoldTransition.create("#a", { from, to, rigid: true });              // the second crease waits until the first is flat
MGP.paperFoldTransition.lib.celahKaku(pose);                                 // hinge gap in px
```

The input keys `titik` (vertices) and `lipatan` (creases) and the result key `peringatan` (warnings) keep their names.

**QC reference**
- Hinge gap below 1 px. A z layer offset of 2–6 px to prevent z-fighting is still fine.
- Miura edge error below 1e-12 (rigid folding). The cylinder patterns are not rigid by nature: Yoshimura about 30–45 % and Kresling about 30–85 % at fold 0.3–1.

## 11. Tessellated patterns: Miura-ori, Yoshimura, Kresling

| Pattern | Motion | Property |
|---|---|---|
| Miura-ori | Zigzag parallelograms. One degree of freedom: one fold parameter opens the whole sheet at once and compacts it in two directions. | Rigid, computed in closed form |
| Yoshimura | A diamond cylinder that compresses | Not rigid |
| Kresling | A tower that twists while it sinks | Not rigid; a source of bistability |

**When to use**
- Miura: a title or map reveal "unfolded from the creases".
- Yoshimura: a compression or spring accent.
- Kresling: a mechanical accent, loading, or a twisting transition.

**API**

```js
MGP.foldPattern.create("#a", { pattern: "miura", motion: "open", fill: (g, w, h) => { /* title card */ }, ease: "spring.snappy" });
MGP.foldPattern.create("#b", { pattern: "kresling", N: 6, levels: 3, rotate: -10 });
const m = MGP.foldPattern.miura({ kolom: 12, baris: 6, lipat: 0.5 });   // {titik, datar, panel, lipatan}
MGP.foldPattern.validate(m); MGP.foldPattern.checkIsometry(m, MGP.foldPattern.miura({ lipat: 0 }));
```

The model functions (`miura`, `yoshimura`, `kresling`) keep their Indonesian keys: `kolom` = columns, `baris` = rows, `lipat` = fold; the result `{titik, datar, panel, lipatan}` = vertices, flat pattern, panels, creases.

Add the block with `mgp add paper/miura --into index.html --prop title="Chapter 2"`; the same works for `paper/yoshimura` and `paper/kresling`.

**QC reference**
- Open a Miura sheet in 1.5–2.5 s with `spring.snappy`.
- Crease lines fade out as the sheet goes flat.
- Text on the sheet at least 4 % of the screen height once open.

## 12. Fields (MoGraph: cloner + effector + field)

Many elements are driven by one field, without keyframes per object. Clones are placed by a cloner (grid, linear, radial, text glyphs). An effector adds a change multiplied by the field weight F(x, t) ∈ [0, 1]:

T' = T + ΔT·F(x, t)

Effector types (the ids keep their Indonesian names):
- **`polos` (plain):** T + ΔT·F.
- **`acak` (random):** seeded random per clone.
- **`rumus` (formula):** sin(i/n + t) and the like.
- **`tunda` (delay):** the field is read at t − delay.
- **`pegas` (spring):** the field is passed through the impulse response of a spring. The result is a windowed integral recomputed from t, so it stays deterministic.

**When to use:** bar charts that grow as a sweep passes, per-letter kinetic typography, grid backgrounds that react to a focus point, and logos assembled from hundreds of elements.

**API**

```js
const { clone, field, effect } = MGP.field;
const list = clone.grid({ kolom: 16, baris: 9, jarak: [60, 60], pusat: [640, 360] });   // columns, rows, spacing, centre
const bola = field.bola({ pusat: (t) => [200 + 300 * t, 360], r: 220 });                 // sphere field
const out = MGP.field.apply(list, [effect.pegas(bola, { skala: 0.8, rot: 90 }, { pegas: "bouncy" }), effect.acak(field.noise({}), { y: 6 })], t);
MGP.field.draw(g, out, "kotak", { ukuran: 30 });                                         // box, size
MGP.field.create("#b", { mode: "bars", data: [34, 58, 41, 77] });   // demo: grid | bars | text | free
```

The inner cloner, field and effector functions and their parameters keep their Indonesian names (see `lib/README.md`).

**QC reference**
- A linear field sweep crosses one row in 1.5–2.5 s.
- A field spring uses `bouncy` for cheerful data and `snappy` for serious data.
- Random offset below 15 % of the clone spacing, so the grid stays readable.

## 13. Curve QC: `mgp curves`

mgp seeks the composition frame by frame and records the position, scale, rotation and opacity of every moving element. The result is drawn as a value graph and a speed graph, like the Graph Editor in AE. Findings are marked with coloured bands:

| Finding | Meaning | Threshold |
|---|---|---|
| `linear` | Constant speed with an abrupt start/stop (robotic motion) | Speed variation below 6 % over ≥ 5 frames, with segment ends above 60 % of the peak |
| `pop` | A speed spike not supported by its neighbouring frames | Δspeed per frame above 25 % of the peak and above 2.5× the neighbours |
| `abrupt` | Rest to fast (or the reverse) within 1 frame | Segment end above 60 % of the peak |
| `volume` | Non-uniform scale with sx·sy deviating | More than 10 % |

With `MGP_LANG=id` the labels read `linier`, `patah`, `mendadak`, `volume`.

```bash
mgp curves index.html -o curves.png                 # elements picked automatically (their own transform/opacity changes)
mgp curves index.html --selector "#title, .card" --json
```

A canvas composition can provide `window.__curves = (t) => ({ name: number })`. Those channels are analysed too.

Notes on reading the result:
- An impact (a bouncing ball) is a `pop` in position by nature, so ignore it when it is intended.
- `abrupt` at the start of an "out" ease is the pop-in style. Switch to `spring.snappy` when it feels harsh.

## Reference numbers at a glance

| Item | Number |
|---|---|
| Anticipation | 2–5 frames in the opposite direction before the action; scale 85–95 % before shooting off |
| Overlap per child | 2–4 frames (24 fps) |
| Tip follow-through | 4–8 frames after the parent stops |
| Overshoot | 1–2 frames at the extreme pose; 5–20 % of the distance (`bouncy` 21 %) |
| Spring ζ | 0.3–0.5 cheerful · 0.9–1.1 UI · 1.3–2 heavy |
| Inertia | amp 0.03–0.08 · freq 1.5–3 Hz · decay 3–6 |
| Squash | contact 1–2 frames, sy 0.7–0.8; stretch 1.15–1.35; volume error < 5 % |
| Blink | 0.1–0.15 s every 2.5–5 s |
| Expression transition | 0.2–0.35 s; eyes/brows 2–3 frames before the mouth |
| 2.5D head turn | 0.4–0.7 s |
| Rigid-fold hinge gap | < 1 px |
