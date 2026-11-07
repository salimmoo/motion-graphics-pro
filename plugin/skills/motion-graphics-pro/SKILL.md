---
name: "motion-graphics-pro"
description: "Use to make motion graphics videos, explainers, ads or music videos (9:16, 16:9, 1:1, 4:5, 21:9 or multi-format) in a paper collage style, from brief to render: brief, concept (incl. object personification), taste, assets (Higgsfield or free images via mgp image), kit/reverse stripe/AI video branches, sequence motion, lip-sync, kinetic typography, narration (ElevenLabs, local voice clone, own recording or none), local render with mgp (built-in renderer: mgp new, project.json, key-pose blocking, mgp curves QC), the JS motion library, 260 ready-made blocks, 104 motion packs (incl. pixel art and origami), magenta background trick, REQUIRED/REPORT gates, review, templates and sample briefs. (ID: video motion graphics, explainer, iklan, MV, kolase kertas, tipografi kinetik, narasi, klon suara, render video, template brief)"
---

# Motion Graphics Pro: paper collage + mgp

Built from the author's `papercut-mv` and `motion-graphics` methods, public research (principles only; credits in
the package root `NOTICE.md`) and real production tests. Rendering uses **mgp** (`render/`, old name Rekam), the
package's own local renderer; compositions are compatible with the HyperFrames HTML format, but no third-party skill
or CLI is needed. Version history: `references/history.md`.

Units: pixels on a short side of 720 (9:16 = 720 x 1280); for a short side of 1080 (1080 x 1920, 1920 x 1080,
1080 x 1080, 1080 x 1350, 2520 x 1080) multiply by S = 1.5; 4K (short side 2160) S = 3. Time in seconds (s), 24 fps.
`mgp` = `node "${CLAUDE_SKILL_DIR}/render/bin/mgp.mjs"` (this skill's folder). If `${CLAUDE_SKILL_DIR}` appears
literally (not substituted, e.g. a plain skill install), use the folder this SKILL.md is in. Shell variables do not
carry it, so write the full path into each command.

**Environment.** The package installs as the Claude plugin `motion-graphics-pro` (skills `motion-graphics-pro`,
`motion-graphics`, `vector-character` side by side under `skills/`) or as three plain skill folders; mgp runs in place
in both and finds the sibling `motion-graphics/lib` itself. Treat the skill folder as read-only: projects, renders and
reviews go in the user's working or output folder; voice profiles and installed engines live in the mgp home
(`~/.mgp`), never inside the plugin, which an update replaces. Rendering needs Node 22+, Chrome/Chromium and ffmpeg
(`node --version`, `ffmpeg -version`, `mgp doctor`). When one is missing (common in the claude.ai chat sandbox),
still do the brief, concept, script, assets and composition code (and `mgp new/add/catalog` when Node runs), and
tell the user plainly to render in Claude Code or on their own computer. Do not claim a render ran.

This file is the core: flow, gates, required rules, key checks and the reference map. Details (numbers, recipes,
prompts, templates) live in `references/*.md` and are read when their step comes (table "References" at the end).
Old chapter numbers (e.g. "chapter 6.4", "T9a") are still used in the reference files.

## 0. When to use

For motion graphics, explainers, ads or music videos in 9:16/16:9 whose scenes are assembled from paper pieces,
whose characters are sequence motion or rigs, whose text is kinetic typography in code, and whose render is mgp.
Not for full AI video, footage editing (`video-making`), decks (`slideshow`) or vector characters drawn from scratch
(`vector-character`).

Related skills (in this package): `motion-graphics` (12 principles, timing, gait, advanced principles; its rule 00
and chapter 0 apply), `vector-character` (vector characters, rigs). Optional skills by the author: `papercut-mv`
(older Python-engine MVs; the recipes used here are already copied into the references), `transkripsi-lirik`.
The HyperFrames and media-use skills are not needed; if installed, compositions stay compatible.

Priority: the user's instructions, then project rules (FLOW, handover, content rules), then this skill. Conflicting
old rules (lo-fi anime taste, Python engine, every job at 1K) are asked about and recorded.

**Language.** Reply in the user's language. For Indonesian users, write fully in Bahasa Indonesia, and render
user-facing templates (T1 brief, gate messages, reports) in Indonesian using the ID template variants
(`references/template.id.md`; `mgp new --lang id` writes `brief.md` and `STATUS.md` in Indonesian).

**Content rules per project (required).** Brief T1 holds the "Content rules", and they override every visual choice.
Examples: a religious project may forbid depicting certain figures (show them only as light or calligraphy); real
people may get no photos or AI images; a brand may forbid showing faces; every quoted source is checked before use.

## 1. Staged workflow and gates

| Stage | Work and output | Gate |
|---|---|---|
| 1 Brief | Frame choice (aspect ratio, resolution, fps; 1.1 item 6), then `mgp new <folder>` (standard folders, `brief.md`, `STATUS.md`, `project.json`, `index.html`); `mgp doctor` once at the start; T1, platform duration limits, personification question (2.1) | Answers to the brief form |
| 2 Concept + taste | 3 T2a concepts; style recommendation + 2-3 T2 options, style frame, 3-5 s test clip; element confirmation | **REQUIRED G1**: concept, style, elements |
| 3 Script | Voice source choice (4 options, 1.1 item 5), script, VO, per-word and per-letter timing, T3 beat sheet; VO recorded in `project.json` | **REQUIRED G2**: voice source + script + VO |
| 4 Block plan | Video mental picture, branch per scene, motion library check, image route (Higgsfield or free, from `doctor`), image count, T4 jobs + credits + balance | **REQUIRED G3**: Higgsfield permission + credit limit (free route: asset list only, no credits) |
| 5 Generate | Jobs within the G3 permission or `mgp image`, check results, T5 log + `project.json` `assets[]` | REPORT |
| 6 Cut out | Sprites, meta, anchors, contact sheet | REPORT |
| 7 Assemble block 1 (pilot) | (a) **blocking**: stepped key poses, `mgp contact --var blocking=true --times poses`; (b) **spline**: ease, overlap, springs, then `mgp curves`; T6-T8, audio, preview + block 1 clip, T9a table | **REQUIRED G4**: (a) blocking approved, then (b) the pilot becomes the look reference for the whole video |
| 8 Assemble block 2 on + review | Blocking then spline per block; clip per block + blocking sheet + curves + T9a table, changed ranges only | REPORT |
| 9 Render | Delivery + final QA; T10 (`STATUS.md`) every session | **REQUIRED G5**: the word "render" from the user |

A follow-up episode of a series uses the series style already locked: G1 needs only the concept, personification
and changed elements, no new style frame.

1.1 **Two kinds of gate.**

| | REQUIRED (G1-G5) | REPORT |
|---|---|---|
| Claude | Sends the options or result, then stops until the user answers | Sends the report (contact sheet, T9a table, clip), then continues in the same turn |
| User | Chooses or approves | May stay silent; may write "HOLD" or Review Results at any time |
| Late Review Results | - | Only the parts named are redone; other blocks stay |
| Condition | Creative decisions, money, final output | Every P0 check for that asset type passes (T9a) |

1. "HOLD" (Indonesian users may write "TAHAN") = Claude finishes the running step, starts no new job or render,
   then waits.
2. A REPORT gate becomes a stop when a fix needs credits beyond the G3 permission, changes an approved
   concept/style/script, a P0 check still fails after fixing, or a frame gets worse (chapter 12 item 3).
3. Every Higgsfield generation outside the G3 list (e.g. a style frame in stage 2) needs permission + a balance
   check first (4.1). The free route (`mgp image`) needs no credit permission, but is still reported (provider,
   model, seed, licence).
4. When the user is away, REQUIRED gates still stop; REPORT gates keep running and the report is left in the chat +
   T10.
5. **Voice decision point** (G2, `references/audio.md` 10.1): before any VO is made, Claude asks with four options,
   then waits: (a) ElevenLabs (stock voice or the user's own clone), (b) a local voice clone from a ±30 s recording
   of the reading template (`mgp voice template`), (c) the user's own narration recording, or (d) no narration.
   GPU/CPU advice comes from `mgp doctor`; the clone engine is installed once per computer with `mgp install voice`.
   **Ethics:** a local clone only with the consent sentence in the recording, or with direct consent from the voice
   owner, recorded (`mgp voice clone ... --manual-consent --statement "<who, when, how>"`). Public figures,
   celebrities, religious scholars, officials or deceased people are never imitated. Voice profiles stay local; the
   user's original recording is not copied into the project or package folder.
6. **Frame decision point** (stage 1, before `mgp new`; `references/brief-concept.md` 2.0): if the brief names no
   aspect ratio, Claude asks with options and waits: (a) **9:16** 1080x1920 (Reels, TikTok, Shorts, Stories),
   (b) **16:9** 1920x1080 (YouTube, presentations, web), (c) **1:1** 1080x1080 (IG/FB/LinkedIn feed), (d) **4:5**
   1080x1350 (IG/FB feed, largest in the timeline), (e) **21:9** 2520x1080 (cinematic, trailer, banner), or
   (f) **multi-format** (one master + other versions; the composition is designed with a shared safe zone from the
   start, other versions rendered separately). Also ask resolution (1080 default; 720 for drafts; 4K renders ±4x
   slower) and fps (24 default, 30 or 60). The answer goes into T1 and
   `mgp new --aspect <r> --resolution <p> --fps <n>`.

1.2 **Working rules.**
1. Claude asks before creative decisions or uncertain numbers (chat + interactive question, with options, credit
   cost, free options); that part waits for the answer.
2. Claude never invents data: duration from the audio, size from the file, credits from the tool, coordinates and
   proof texts from the source.
3. Production runs per block. Block 1 is locked at G4; later blocks are locked when reported as passing T9a, unless
   the user writes HOLD or Review Results for that block. The block plan holds the timeline and narration text, SFX,
   the per-second mental picture, asset prompts, code parts and motion over time; a revised VO only needs retiming.
4. One render at a time; review sends only the changed range. One GPU job at a time (shared GPU lock,
   `references/hardware.md`).
5. Documents say "Review Results", never "PM Decision". Keep chat short, in the user's language, polite and warm.
6. Estimates: block duration = word count / speaking rate, measured from the first VO. Benchmarks per source: first
   reference VO v1 2.06 words/s; local clone (test profile) 1.72 words/s, ±1.9 with `--speed 1.12`
   (`references/audio.md` 10.5). Drawings shown per shot = d x 12; unique drawings are fewer because cycles repeat
   and the motion library is reused.
7. Each scene picks one production branch (`references/branches.md`): A direct kit, B reverse stripe, or C AI
   video. The cheapest in credits comes first; kits and plates may come from the free route (`references/image.md`).
8. `project.json` is updated in the same turn as the file change (VO, scenes, key poses, blocks, captions, assets with
   their provenance). `mgp check` validates it (`references/project.md`).

## 2. Start a project (stage 1)

```bash
mgp new <folder> --aspect 9:16 --fps 24 --duration 30 --title "<title>"   # or --aspect 16:9; --lang id|en
mgp doctor                                                                # CPU, RAM, GPU/VRAM, encoder, PyTorch
mgp check <folder>/index.html                                             # contract + project.json
```

- The `index.html` from `mgp new` already loads mgp.motion (`assets/js/motion.js`; API `mgp.motion.*`, `gsap` is
  only an alias), `assets/js/mgp.js` (the `MGP.*` library) and the bundled fonts (`assets/fonts/fonts.css`) by
  relative paths, so it runs from file:// (with a small player) and through mgp. It has a `blocking` variable and a
  pose-to-pose motion example. `brief.md` and `STATUS.md` follow `--lang` (default: `MGP_LANG`, then `LANG`).
- The `doctor` result is used at the decision points (`references/hardware.md`): local voice clone on GPU or CPU,
  local or free-cloud images, render encoder. If the local engines are not installed (`mgp install all --status`),
  offer `mgp install voice` / `mgp install image` (once per computer, `--detach` to download in the background;
  models are not in the package ZIP). Installation runs only after the user agrees (downloads of several GB).

## 3. Required rules (not negotiable)

1. **Collage = assembled from pieces.** The kit is generated, cut out in code, layered, then animated per piece.
   One full AI plate + overlays is not collage (rejected). Paper drawn by code is also rejected (childish).
2. **Text only in code**, never in AI images; every image prompt forbids text/logos/symbols.
3. **Maps are never drawn by AI**: Natural Earth (`MGP.map`) + sourced coordinates, aspect ratio not stretched.
4. **Sequence characters: one shared scale per sheet**, soles locked to the baseline; sliding a still drawing is
   forbidden (foot sliding). Slide speed = 2 x stride length / cycle period.
5. **Split-pin puppet rigs with visible pins are rejected**; a moving character = a sequence sheet or a smooth code rig.
6. **One character, one model sheet + identical description** in every prompt; the motion library is reused across
   episodes.
7. **Determinism**: no `Date.now()`, unseeded `Math.random()`, fetch, timers or `repeat: -1`; one paused timeline
   per composition; `mgp check` must give 0 ERROR and be deterministic.
8. **Placeholders are labelled in the frame** and named in the delivery; visible weaknesses are stated honestly.
9. **One fix must not break another part**: compare frames before/after; if a frame gets worse, stop and report.
10. **The pilot is not splined before blocking is approved** (G4 step a).
11. Full render only after the word "render" (G5); review only the changed range.
12. The full list of rejected approaches and their replacements: `references/mistakes.md` (read before G1 and G4).

## 4. Key quality checks

The full T9 checklist (20 items) and the REPORT conditions per asset type T9a are in `references/template.md`; how to
review is in `references/review-qc.md`. The checks that most often decide pass/fail:

| Check | How |
|---|---|
| Contract, duration, local fonts, text above the reading limit, determinism, `project.json` | `mgp check index.html` (0 ERROR) |
| Clean pieces: no white fringe, grey boxes, specks or magenta edges | `mgp frame --t <t> --scale 2`, then crop the edges on a contrasting background |
| Feet planted, same character size, no foot sliding, mouth/brows on the face | crop the feet; 3 consecutive frames |
| Blocking: key poses read, staging, rough timing | `mgp contact index.html --var blocking=true --times poses` |
| Motion curves: no accidental linear motion; breaks only at impacts/cuts; squash keeps volume | `mgp curves index.html --from <a> --to <b>`; benchmarks in `motion-graphics/references/advanced-principles.md` |
| On twos, stagger, settle 14-16 frames, hold at least 25% of the shot | `mgp contact --from <a> --to <b> --n 8` |
| Words at their VO timestamps; hold 0.5 s + 0.3 s/word; safe zone | a frame per word |
| Lip-sync: m/b/p closed, vowels match the letters, X in pauses | frames at m/b/p words + clip with sound |
| Audio -14 LUFS, -1.5 dBTP, SFX -5 dB under the VO (ducking, `references/audio.md` 10.4); no dead air > 0.8 s | `mgp audio measure`, ffmpeg loudnorm/silencedetect |
| Cloned VO: normalised WER + every CHECK BY EAR listened to | `mgp voice score vo.wav --profile <p>`; mispronounced: `mgp voice speak ... --sentence N --tries 4` |
| Duration, fps, resolution of the render; deterministic render | ffprobe; `mgp render --hash` twice |
| All of the above in one report | `mgp audit <folder> --platform tiktok` (writes `review/audit.md`) |

## 5. Command map (mgp)

| Need | Command |
|---|---|
| Open a project | `mgp new <folder> [--aspect 9:16\|16:9\|1:1\|4:5\|21:9] [--resolution 720\|1080\|4k] [--fps 24] [--duration 30] [--title ".."] [--lang id\|en]` |
| Machine profile, route advice | `mgp doctor [--json]`; install the local engines once per computer: `mgp install voice\|image\|cutout\|all [--detach]` (cutout = rembg for `mgp cutout`), status `mgp install all --status` |
| Check a composition + `project.json` | `mgp check index.html [--json]` · one report: `mgp audit <folder>` |
| Contact sheet / blocking / one frame | `mgp contact index.html --n 8` · `--var blocking=true --times poses` · `mgp frame --t 2.4 --scale 2` |
| Motion curve QC | `mgp curves index.html [--selector "#a"] -o review/curves.png` |
| Preview / visual edit | `mgp preview index.html --open` · `mgp studio index.html --open` |
| Review / delivery render | `mgp render index.html --from a --to b --size 540x960 --crf 26 --preset veryfast --workers 2` · `mgp render index.html -o out/<name>.mp4` |
| Ready-made blocks (260) | `mgp catalog --search <word>` · `mgp add <category/name> --into index.html` |
| Free images (kit, plate, assets) | `mgp image "<prompt>" --magenta --cutout [--style paper] [--tries 3]` · `mgp image kit "<character>" -o kit/ --tries 3` · `mgp image plate "<place>"` · `mgp image slice ... --rotate hand:180` · `mgp image providers` |
| Voice / VO | `mgp voice template\|inspect\|clone\|speak\|score\|elevenlabs\|remove` · redo one sentence `mgp voice speak ... --sentence 3 --tries 4` · spelling aid `pronunciations.txt` |
| Per-word timing | `mgp align vo.wav --script script.txt -o vo.words.json` · `mgp transcribe vo.wav --fix-with script.txt` |
| Audio, SFX, look | `mgp audio normalize\|measure` · `mgp sfx <preset>` · `mgp sfx mix cues.json` · `mgp media look\|brighten\|effects\|lut` |
| Background removal | `mgp cutout in.png -o out.png [--key magenta]` · `python -I scripts/magenta_key.py ...` |
| Lottie | `mgp export --format lottie` · `mgp play` · `mgp render\|frame\|check <anim.json>` |

Old Indonesian command and flag names (`rekam baru --rasio`, `rekam cek`, ...) still work as aliases; write the new
names. On the user's laptop, renders use `--workers 2` unless the user asks otherwise; GPU jobs take turns.

## 6. Handover

- Every session updates T10 (`STATUS.md` from `mgp new`). When the chat context is around 75%, the full plan is
  written to a file before compacting.
- Parallel sessions reread the handover and the artifact database before writing, with pinned versions.
- Locked blocks change only at the user's request.

## 7. References (read when the step comes)

| File | Read when | Contents (old chapter) |
|---|---|---|
| `references/brief-concept.md` | Stages 1-2: T1 form, 3 T2a concepts, T2 taste, POV; the user writes a one-sentence brief | 2 (brief, concept, taste, POV, archetypes), 17.1 (sample briefs) |
| `references/style.md` | Choosing/keeping a style (house style **Atelier Kertas**, 3.0); assembling a scene; the brief asks for pixel art or origami | 3 (collage visual system), 17.3 |
| `references/image.md` | Stages 4-5: free image route (`mgp image`, template kits, `--tries N`, `--rotate`, a pose per image), Higgsfield (G3, settings, STYLE, prompt rules), magenta background | Part A (D, v2.4) + 4, 17.4 |
| `references/hardware.md` | Project start (`mgp doctor`) and every voice/image/encoder choice; GPU queue | v2.4 |
| `references/cutout.md` | Stage 6: kit cutter, gaps, anchors and sequence scale, cutout QC | 5 |
| `references/motion.md` | Stages 7-8: on-twos clock, element entrances, shot grammar, character sequences, model sheet + motion library, personification, **blocking then spline** | 6.1-6.7, 6.9 (new) |
| `motion-graphics/references/advanced-principles.md` | Spline and motion QC: spring presets `bouncy`/`snappy`/`heavy`, inertia, delay, constant volume, curves, rigid origami (`origamiStyle: "rigid"`), fields, FACS, SLERP | v2.4 |
| `references/lipsync.md` | A character/object mouth speaking from per-letter timing (`vo.letters.json`, ElevenLabs alignment, `mgp align`) | 6.8 |
| `references/typography.md` | Text, headlines, subtitles, cards, bundled fonts, Arabic text | 7 |
| `references/transitions.md` | Transitions between scenes | 8 |
| `references/maps.md` | Maps, routes, coordinates | 9 |
| `references/audio.md` | G2 (4 voice options, clone flow, ethics), VO, redo per sentence, pronunciation, SFX, mix + ducking, master, speaking rate | 10 |
| `voice/README.md` | Installing and running the local voice engine, quality, limits | - |
| `references/render.md` | Writing a composition (contract, collage patterns), requirements, commands, the `lib/` library, compatibility | 11 |
| `render/README.md` | Every mgp command option, variables, fonts, encoders, compatibility table | - |
| `references/project.md` | `project.json` schema | v2.4 |
| `references/review-qc.md` | Every REPORT delivery, review per block, before G4/G5 | 12 |
| `references/mistakes.md` | Before G1 and before sending the G4 pilot | 14 |
| `references/branches.md` | Stage 4 (branches A/B/C, prices, credit estimates) and assembling branch B | 15 |
| `references/template.md` · `references/template.id.md` (ID) | Filling T1-T15: brief, comparison, concepts, shot list, prompts, job log, scene data, composition skeleton, typography, T9/T9a checklists, T10 handover, keyframes, layer breakdown, motion set, pixel art, origami | 16 |
| `references/motion-packs.md` | Stage 2 (pack suggestions per category), style frame/test clip from a pack id, blocks per slot | 17.2 |
| `references/history.md` | Finding when a rule came in | old opening |

Old chapter to file: 0, 1, 13 = this core · 2 = brief-concept · 3 = style · 4 = image (Part B) · 5 = cutout ·
6.1-6.7 = motion · 6.8 = lipsync · 7 = typography · 8 = transitions · 9 = maps · 10 = audio · 11 = render · 12 =
review-qc · 14 = mistakes · 15 = branches · 16 (T1-T15) = template · 17.1 = brief-concept · 17.2 = motion-packs ·
17.3 = style · 17.4 = image. References to other skills: `motion-graphics` chapter N and `vector-character`
chapter N are mapped in the References table of each SKILL.md.
