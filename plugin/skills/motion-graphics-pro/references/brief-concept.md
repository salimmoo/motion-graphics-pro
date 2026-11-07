# References: brief, concept, taste, POV, sample briefs

Part of the `motion-graphics-pro` skill. Read when: stages 1-2 (brief T1, 3 concepts T2a, taste T2, POV), and when the user writes a one-sentence brief.

Moved verbatim from SKILL.md v2.3 (chapter 2 Brief, concept, taste, POV, chapter 17 (opening) + 17.1 How to ask Claude); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, section References).

## 2. Brief, concept, taste, POV

2.0 **Frame choice** (decision point SKILL.md 1.1 item 6). When the brief does not name an aspect ratio yet, Claude asks once, with the options below, then waits:

| Option | Size (1080 resolution) | For | Safe zone (text and faces) |
|---|---|---|---|
| 9:16 vertical | 1080 x 1920 | Reels, TikTok, Shorts, Stories | Words in the band 168-1330 px of 1920 (top ±9% and bottom ±20-30% covered by UI); avoid the lower right side (buttons); captions at the bottom of the band |
| 16:9 horizontal | 1920 x 1080 | YouTube, presentations, web, TV | Text inside the central 90% (title safe); captions in the lower third |
| 1:1 square | 1080 x 1080 | IG/FB/LinkedIn feed, feed ads | 6% margin on every side |
| 4:5 portrait | 1080 x 1350 | IG/FB feed (shows largest in the timeline) | 6% margin; the IG grid preview crops to the central 3:4, so keep titles away from the top/bottom edge |
| 21:9 cinematic | 2520 x 1080 | Trailers, banners, openers | Text in the central 80%; the 16:9 version is often cropped from the centre |
| Multi-format | One master + derivatives | Cross-platform campaigns | Design inside the safe zone shared by all aspect ratios from the style frame on; important elements in the centre. Each aspect ratio is still assembled and checked on its own (not just cropped), because the text layout differs |

Ask at the same time:
- **Resolution** (short side): 720 for quick drafts, 1080 default, 1440, or 4K (2160; renders ±4x slower, assets must be sharp enough).
- **fps**: 24 default (cinematic feel and stop-motion on twos), 30 (UI, data, social), or 60 (very fast motion, screens).

The answers go into T1 rows "Platform, aspect ratio, duration" and "output", then `mgp new <folder> --aspect <r> --resolution <p> --fps <n>`. For AI assets the job aspect ratio follows the frame (`mgp image --aspect`). A plate is made slightly wider than the frame when the camera will pan.

2.1 **Brief.** Claude asks for the empty T1 fields (reference = principle), including personification: used or not, and which object. This question is repeated at the start of every episode or episode plan.

2.2 **Concept** (stage 2, before taste). A concept is the device that makes the content visible. Claude sends 3 T2a concepts of at least 2 different types, side by side, with a recommendation + reason, then the pros and cons of each concept.

| Type | How it works | Story example | Explainer example |
|---|---|---|---|
| Object metaphor | An abstract idea is represented by an object | Scales with two pans | Puzzle pieces |
| Personification | An object becomes a character with a face that acts | Letters with faces wave goodbye one by one as they are sorted into mailbags; one letter is left behind alone | A moon with a face follows the car |
| Witness narrator | The story told from an object's point of view | "I am that last letter" | "I am a container, this heavy equipment does not fit" |
| Scale / comparison | Size or time changed so it can be felt | Thousands of letters a day, one left unsent | Earth's age = 24 hours |
| Process / cause and effect | A chain of events | Written, sent, sorted, delivered | Dominoes, machines |
| Journey / route | Map and a moving line (chapter 9) | The letter's route from town to town | LCT route from the jetty to the site |
| Two contrasting worlds | Split screen, before and after | Post office (empty) and village (waiting) | Container ship and LCT |
| Data as objects | Numbers become countable piles | Each letter = one house light switched on | One sack = one million tonnes |

1. One video, one through line; at most 2 types combined.
2. The meaning-carrying object appears at frame 0 (6.3) and returns in the payoff of the final scene.
3. The proving motion changes a relationship (2.5).
4. Personification is for objects only. Figures protected by the content rules are never personified and never become witness narrators. Animation of objects with faces follows 6.7.
5. The credit estimate in T2a is worked out from the branch table in chapter 15 and the motion library (6.6), and written as an estimate.

2.3 **Taste.** Claude recommends 1 style + 2-3 options (T2) with a style frame + clip.

| Style family | Traits | Good for | Risk |
|---|---|---|---|
| Documentary paper collage (default) | Matte paper kit, 7-12 layers, warm light, bright natural colours | History, stories, explainers | Many assets; pieces must be cut clean |
| Vox editorial | Halftone, tears, tape, clippings, strong colour field per beat | Arguments, data, opinion | Easily turns into a moving poster |
| Golden manuscript | Ivory page, 8-point stars, arched windows, gold lines, DM Serif + gold italic | Scriptural evidence, quotes, chapter titles | Static when longer than 6 s |
| Bright paper | Wide chromatic fields, at least 3 hues, warm accent 3-15% | Cheerful education, products | Childish without real paper texture |

Elements are confirmed one by one (T2 list), not guessed; a test clip is made before mass production.

2.4 **POV** is chosen per shot in T3:

| POV | When; rules |
|---|---|
| Observer | Opening a location, general action; eye level, the same horizon at the same location |
| Character / from behind | Following a journey, a faceless character; moving away = rising and getting smaller |
| Top-down | Maps, routes, distances; real map data (chapter 9) |
| Insert / macro | Small objects, hands, scripture cards; background = the same set, blurred |

Directions are written in frame terms ("frame left/right"), not the character's left and right; every location has a "Screen directions" row, and the 180-degree axis is kept.

2.5 One beat holds one idea and one action; a beat with no new graphic need reuses the same set. The main motion proves the claim by changing a relationship (flowing, narrowing, piling up, replacing).

2.6 Layout archetypes: asymmetric stage, diagonal cascade, split contrast, radial cycle, depth corridor, pile of consequences, map route, full-screen data. Adjacent scenes differ in archetype or dominant colour; 4 or more scenes use at least 3 archetypes.

## 17. Version 2.1 additions (05-11-2026)

This section adds four things proven on the guide site and its code demos: sample briefs, the motion pack library, pixel art and origami styles in the production flow, and the magenta-background Higgsfield asset trick. The rules in chapters 0-16 still apply.

17.1 **How to ask Claude (sample briefs).** The user does not need technical terms. The one-sentence pattern:

```text
I want to make a motion graphics [video type] about [topic], [seconds] long, aspect ratio [9:16 or 16:9], in a [style] style. It shows [characters / objects / map / chart], with [narration / music].
```

| Field | Read by Claude in |
|---|---|
| video type | Pack category (17.2) and T1 |
| duration | T1, shot grammar 6.3 |
| aspect ratio | T1, chapter 11 |
| style | Taste 2.3 + T2; pixel art T14, origami T15 |
| characters / objects | vector-character skill; objects with faces 6.7, speech 6.8 |
| kinetic text, transitions, map | Chapters 7, 8, 9 |
| voice | Chapter 10 |
| checked first | Chapter 12 (review before render) |

Real sample briefs:
1. **Ad.** "I want to make a motion graphics ad for a packaged iced milk coffee, 15 seconds, 9:16, in a warm paper collage style. Show a coffee cup with a smiling face, kinetic text for its three strengths, then a logo reveal at the end. Use a friendly female voice-over."
2. **Explainer.** "Make a 60-second 16:9 explainer on how a savings app works, in a flat vector style. A vector character walks while explaining, the transitions between steps have a reason, and a savings chart grows."
3. **Documentary.** "I want a 2-minute video essay about the spice route, in a layered paper archive style, with a real map and a route that grows from Maluku to Venice, a calm male narrator, and a check before render."
4. **Music video.** "Make a 9:16 lyric music video for my song (lyrics attached), origami style, kinetic typography on the beat, a 3D camera turning slowly, no AI assets."
5. **Education.** "Make a 45-second educational video for primary school children about the water cycle, pixel art style. The character is a water drop with a face that can talk, bouncy motion, with a child narrator's voice."

Tips for the user: if unsure about the style, write "help me choose a style"; attach assets when you have them (logo, product photo, lyrics, voice recording); Claude stops at decision points (REQUIRED gates, chapter 1.1) to ask for approval.

Fields that are not mentioned are asked through T1 (2.1); "no AI assets" means everything is drawn in code (the branch without Higgsfield, chapter 15).
