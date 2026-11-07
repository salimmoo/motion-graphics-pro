# References: collage motion, sequence motion, personification

Part of the `motion-graphics-pro` skill. Read when: stages 7-8 (on-twos clock, element entrances, shot grammar, character sequences, model sheet + motion library, objects with faces).

Moved verbatim from SKILL.md v2.3 (chapters 6.1-6.7 Motion); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 6. Motion

6.1 **Clock.** Video at 24 fps; pieces and characters on twos: tq = floor(t x 12) / 12. Boil is seeded from floor(t x 12) and the layer index (deterministic). Text is smooth at 24 fps or follows on twos, as confirmed for the project.

6.2 **Element entrances** (proven formula):

```text
p(t)     = target + off x exp(-(tq - t0) / 0.17 s)
alpha(t) = min(1, (tq - t0) / 0.2 s)
pop      : scale = 1 - 0.08 x exp(-(tq - t0) / 0.17 s)
```

The remaining 3% of the distance is reached at about 0.58 s, so settle = 14-16 frames. Assembly recipe for a 5 s landmark scene:

| Group | Origin, off | t0 (s) |
|---|---|---|
| Clouds; hills, ground | Side 300-380 px; bottom 150-320 px | 0.15-0.45; 0.50-0.88 |
| Buildings, rocks; hero | Bottom 120-220 px; pop | 1.02-1.68; 1.80 |
| Foreground; label | Bottom 260-280 px; left 420 px | 2.15-2.52; 3.00 |

The sun comes down from the top after the sky. Stagger 0.1-0.27 s, from far to near.

6.3 **Shot grammar.** Share of the duration: 0-10% empty plate or transition tail; 8-32% first subject; 22-52% supporting elements in narrative order; 45-70% labels; the rest holds, at least 25% of the shot duration.
- Frame 0 of the video = thumbnail + hook: the hero or one bold line is already showing, never empty.
- The camera moves at the start (push 2-10%, pull about 30% for a reveal) and is still in the second half. Layer zoom zl = z^(0.25 + 0.75 k) around the hero pivot; camera pan = camX x k.
- Something changes every 3-5 s; beats of 2-3 s. Idle motion only for decoration (±5-7 px, period about 5 s). Trees stay still; leaves may move.

6.4 **Character sequence motion** (sequence sheet method; the split-pin rig was rejected):
1. One sheet per action; every body part changes in every frame.
2. Side walk = contact, down, passing, then the same for the other leg (6 frames = 1 cycle = 0.5 s on twos, reads as hurried). A relaxed walk T 1.0-1.1 s (gait of 119 steps/minute) needs 12 frames or each drawing held for 4 frames; ask the user which.
3. Slide speed = 2 x stride length / T (measured from sprite x scale), so the feet do not skate. Sliding a still drawing is not allowed.
4. Wave: frames 1-6 once, then ping-pong 5-4-5-6. A change of action gets 1-2 held drawings. Turning around needs its own 3-4 frame sheet.
5. Running seen from behind: the character rises and gets smaller (evidence 1.83 s: sole y 1345 to 1110, scale 1.28 to 0.98), bob -7 px x scale on drawings 2 and 4.
6. Blank face: a mouth kit of 8 visemes (X, A, E, O, U, MBP, FV, smile) + eyebrows pasted per frame from the head centre and face width per drawing; 3/4 = sticker shifted and squashed, profile = half a sticker, back view without a sticker. The mouth order comes from per-letter timing (6.8), at least 2 frames (1 drawing on twos) per shape.
7. Crowds: two states per person (calm, reaction), switching from the centre outwards at 0.07 s intervals + a jump of 14 px x sin(pi u) over 0.25 s, with a contact shadow, never all at once.

6.5 **AE principles** (`motion-graphics` chapter 2): timing 2-4 frames sharp, 6-8 fast, 12-15 normal, 20-30 heavy; anticipation and arcs; overlap 30-50%; exits 40-50% shorter than entrances; a title that lands is fully still. Advanced principles v2.4 (`motion-graphics/references/advanced-principles.md`): spring presets `bouncy` / `snappy` / `heavy` (ease `"spring.snappy"`), `inertia()` for a damped bounce from the incoming velocity, `delay()` / stagger for follow-through, squash with constant volume (sx·sy = 1, `stretch`), QC curves with `mgp curves`, rigid origami folding (`origamiStyle: "rigid"`, the default), `MGP.field` (cloner + effector + field), FACS expressions (`MGP.face`).

6.6 **Character consistency: model sheet + motion library.**
1. Every main character or object with a face has one model sheet (T4 f): 4 views (front, 3/4, side, back) at one scale, soles on one baseline, + 3 close-ups (head/face, hands, a costume detail or signature prop). A 5-view turnaround is made only when a scene needs a 3/4 back view.
2. The model sheet's job ID is attached as image_references in every job that contains that character, together with an identical character description (4.4 item 2). The character's height in the 720 w world and s_sheet for each action are recorded once and used in every episode.
3. The motion library per character is kept outside the episode folder (e.g. `<series folder>\library\<character>\`): model sheet, sheet per action, cut-out sprites, `anchors.json`, face kit, and `library.json`. Stage 4 reads the library first: actions that already exist are reused at no credit cost; only new actions go on the G3 job list. A new action enters the library after it passes T9a.
4. The reverse direction is made with a horizontal mirror only when the costume and props are symmetrical; its status is written in the library.

```json
{
  "character": "hero", "world_height_720": "<measured>",
  "model_sheet": {"job": "<job id>", "file": "model/hero_model.png"},
  "face_kit": {"job": "<job id>", "dir": "face/"},
  "actions": {
    "side_walk": {"job": "<job id>", "dir": "seq/walk/", "frames": ["wk1", "wk2", "wk3", "wk4", "wk5", "wk6"],
      "s_sheet": 0.842, "cycle_s": 0.5, "stride_px": "<measured>", "facing": "frame right", "mirror": true, "passed_T9a": "<date>"},
    "wave": {"job": "<job id>", "dir": "seq/wave/", "s_sheet": 0.759, "order": "1-6, then 5-4-5-6", "mirror": false}
  }
}
```

6.7 **Object personification** (personification principles from public research, credited in NOTICE, + `motion-graphics` chapter 2; facial expressions can come from FACS AUs in `MGP.face`, `motion-graphics/references/advanced-principles.md` chapter 8).
1. The object is generated plain without a face (kit or T13 motion set); face = sticker from the object's face kit (T4 d, row 3 eyes), pasted per frame from the object's face anchor as in 6.4 item 6. **Free route without a face kit:** the face may be drawn in code on top of the object: eyes = simple shapes (ellipse/blink line) and the mouth from `vo.letters.json` through `MGP.lipsync.visemes` + `at(t)` + `lib.drawMouth` (`references/lipsync.md`), drawn on the canvas at the object's face anchor, in an ink/cream colour that suits the paper. This is a valid replacement for the face kit (tested on a chat bubble with a face in the 30 s ad); still follow item 3 (change mood through a take) and item 5 (eyes lead).
2. Object rig = parameters over time: position, squash, angle, eye state, mouth (6.8). Mood is written as keyed states, e.g. `[[0, "normal"], [2.1, "sad"]]`.
3. A change of mood always goes through one "take": anticipation (squash down 2-4 frames), the new face at the deepest squash, then settle with overshoot (`motion-graphics` chapter 2: amp 15, freq 3, decay 5). The face never switches directly.
4. Squash keeps the area: sx = 1 / sy (constant volume, `MGP.core.stretch`; the old formula sx = 1 + (1 - sy) x 0.5 is only an estimate with an error of ±20%), anchored at the base of the object. Cheap motion without walking: jump (`motion-graphics` 4.1 (`motion-graphics/references/walk.md`): anticipation, push-off, air, landing with damping), lean, spin, wobble.
5. Never all at once: the eyes lead, the body follows 2-5 frames later; the object's two arms/legs and a crowd of objects do not move together (0.07 s interval as in 6.4 item 7). Blink = the eyes squashed into a line.
6. Contact: the object stands with a contact shadow (3.2); when it jumps the shadow gets smaller; an object being held sticks to the hand.
7. One action, one read: the viewer's eye is led to where the action is, the action is fast, the reaction is held; text does not repeat what is already visible.

## 6.9 Blocking stage (G4 pilot, v2.4)

The pilot is reviewed in two steps, like blocking then spline in 2D/3D animation.

1. **Blocking (pose to pose, stepped).** Write motion as key poses: every action ENDS exactly at its
   key time. Key times per scene are written in `project.json` `scenes[].poses` (seconds, relative to the scene start) and in the
   composition (`POSES` in the `index.html` made by `mgp new`). Blocking mode holds the last key pose (no
   interpolation): composition variable `blocking`.
   ```bash
   mgp contact index.html --var blocking=true --times poses -o review/blocking.png   # one cell per key pose
   mgp contact index.html --var blocking=true --times 0,0.75,1.5 -o review/b_s02.png  # given seconds
   mgp render index.html --var blocking=true --size 540x960 --crf 26 --preset veryfast -o review/blocking.mp4
   ```
   What is judged: the silhouette of each pose, staging (one focus), screen direction, rough timing (spacing between keys), and whether
   the story reads without interpolation. The user approves (G4 step a) before spline. Sequence sheet characters:
   key pose = the contact/passing drawing or the extreme drawing of each action.
2. **Spline.** Ease, overlap, follow-through, springs (`spring.bouncy|snappy|heavy`), inertia, and delay are added
   without moving the key poses. QC: `mgp curves index.html -o review/curves.png` (no accidental linear motion,
   pops only at impacts/cuts, constant squash volume), then a contact sheet + a clip with audio. The user approves
   (G4 step b) and block 1 becomes the reference.
3. Block 2 onwards uses the same order, but a REPORT is enough (the blocking sheet + curves go into the T9a report).
4. **Narrated video: key poses from VO timing.** Ads/explainers are driven by `vo.words.json`, so keys are not invented: (a) mark the keywords per sentence (nouns/verbs that must be seen); (b) key pose = the `start` of that word minus the anticipation (the action lands AS the word is heard, 6.2) or the word's `end` for a reaction; (c) one key per 0.8-1.5 s, scenes without keywords use the sentence pauses; (d) write the keys in `project.json` `scenes[].poses` and the composition's `POSES` BEFORE writing the spline. The order stays: blocking from the VO keys → approved → spline (rule 3.10).
5. **Keys on the frame grid.** Every key time is rounded to the 1/fps grid (24 fps: multiples of 0.041667 s; on twos: 1/12 s): `k = Math.round(t * fps) / fps`. A key between two frames makes `mgp contact --times poses` capture the frame before, so the blocking sheet shows the PREVIOUS pose (30 s ad test: empty scenes at 13.08 and 25.29 s). VO word times are also rounded before they become keys.
