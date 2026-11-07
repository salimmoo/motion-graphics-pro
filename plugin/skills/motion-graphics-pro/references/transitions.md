# References: transitions and set changes

Part of the `motion-graphics-pro` skill. Read when: choosing or building a transition between scenes.

Moved verbatim from SKILL.md v2.3 (chapter 8 Transitions and set changes); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 8. Transitions and set changes

| Intent | Transition | Duration | How |
|---|---|---|---|
| Change of location | Torn-paper wipe | 0.5 s | Seeded torn clip-path + torn strip from the kit |
| Time passes | Page-turn | 0.7 s | Wipe + fold shadow of width sin(pi u) |
| Change of chapter | Shutters | 0.65 s | Slats close, swap at 50%, open |
| Focus | Iris | 0.55 s | circle() from the hero centre, 0 to 72% |
| Continuity | Slide | 0.45 s | Sheet enters with an edge shadow |
| Object moves to a new set | Bridge carry-over | 0.5-0.9 s | Object stays on an overlay, the old set tears/fades behind it |
| Break in meaning | Torn split | 22 frames | Two halves rotate ±10°, shift ±20% of the width |
| Impact | Cut | 0 | On the fastest frame |

1. Progress uses smoothstep. A crossfade of the whole scene is not allowed; a dissolve is only for a change of time in the same set.
2. The tail of the outgoing shot and the pause before the VO comes in are each at least as long as the transition.
3. Every change of location uses a real new set. One film uses 3-5 kinds of motivated transition; at most a third of the joins are cuts.
4. The next scene's host starts earlier by the transition duration, with a higher z-index; the reveal uses clip-path on an inner wrapper. Ready-made transitions: `MGP.causalTransitions` and `MGP.paperFoldTransition` (11.5); ready-made transition blocks are listed with `mgp catalog --category transitions` and inserted with `mgp add <name>` (folder `blocks/`).
5. **Transitions that clone the scene** (`transitions/tear`, `paper-fold`, `shatter`, `beat-freeze`, `morph-swap`, `parallax-zoom`, `before-after`; accents `accents/echo`, `accents/long-arrival`) make a DOM copy of the source scene. That copy: loses every `id` (CSS based on `#id` no longer applies), carries `class="clip"` + `data-start` so the runtime can hide it outside its original range, and has empty canvases (the state at load, not at the time of the transition). So: (a) `from` = an inner non-`.clip` container (e.g. `#s05-content`), not the scene host; (b) styles of the source scene are written with **classes**, not `#id`; (c) canvas content and numbers drawn per frame (e.g. `data/counter`) are not copied, so pick a non-cloning transition (`paper-collage`, `shutter`, clip-path torn wipe) for scenes with a canvas; (d) check the middle frame of the transition with `mgp frame --t <middle> --scale 2` (30 s ad test).
