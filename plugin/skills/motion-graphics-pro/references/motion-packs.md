# References: library of 104 motion packs

Part of the `motion-graphics-pro` skill. Read when: stage 2 (pack proposal per category), style frame/test clip from a pack id, and inserting blocks per slot.

Moved verbatim from SKILL.md v2.3 (17.2 Motion pack library); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 17.2 Motion pack library (from chapter 17)

17.2 **Motion pack library** (folder `packs/` of this skill). 104 packs in 11 categories: EXP explainer, DOK documentary, NAR animated story, ADS ads, TLK talking head, SHO vertical short, KIN kinetic typography, DAT data/infographic, DEM product demo, EDU education, TRN new trends: pixel and origami (category 11, Version 2.1).

| File | Contents |
|---|---|
| `packs/INDEX.md` | Table of every pack (id, name, category, aspect ratio, duration) + details per pack: use, key motion, palette, fonts, slots, blocks per slot, brief ready to copy |
| `packs/packs.json` | The same data for code to read (categories, packs, research sources) |
| `packs/packs-preview.js` | Preview engine: `PaketPreview.build(host, pack, category)` makes a looping 10 s animation (Web Animations API) with `seek/play/pause` |
| `packs/motion-packs.html` | Offline browser: open it in a browser, filter by category/aspect ratio, search, preview per tile, details in a dialog |
| `motion-graphics` `lib/pack-scenes/` (Version 2.2) | Moving scenes for all 104 packs: `MGP.packs.create(target, id, options)` or `MGP.packs.render(id, ctx, t, { width, height })`, 76 scene types, 8 s loop, the pack's palette/fonts/aspect ratio |

How to use:
1. In the concept/taste stage (2.2-2.3) Claude proposes 1 featured pack of that category + 1-2 alternatives; the `cocok` (fits) / `hindari` (avoid) fields are used to filter.
2. The pack's `brief` field becomes the T1 draft; the slots (style/background, composition, lettering, subtitles, accents, rhythm, transitions, camera, audio, aspect ratio) become the T2/T3 fields.
3. A pack brief turns straight into a moving picture: `MGP.packs.create("#stage", "DOK-03", { lines: [{ j: "Title", c: "Caption" }], ar: "9:16" })`, then `MGP.core.expose(p)` and `mgp render` (11.5); to insert one pack frame into your own canvas: `MGP.packs.render(id, ctx, t, { width, height, ar: "9:16", lines: [...] })` (`render` takes the same `ar`, `lines`, `pal`, `font`, `scene`/`variant` options as `create`; without `ar` a 16:9 pack is fitted small into a 9:16 box; reuse one options object per pack across frames; for many packs at once, e.g. thumbnails, add `fonts: false`; details in `motion-graphics/lib/README.md`, Motion packs). The options `pal`, `font`, `scene`/`variant`, `duration`, `seam` adapt it to a brand. Used for style frames and test clips in 2.3, before any other asset.
4. The `add` field is the block name for that pack: insert it with `mgp add <name>` (own blocks in `blocks/`, 260 blocks; old item names from the HyperFrames format are also accepted and mapped through the `aliases` field); check first with `mgp catalog`.
5. A pack's palette and fonts are only a starting point; the project's brand/brief still wins.

Featured pick per category: EXP-02, DOK-03, NAR-02, ADS-03, TLK-02, SHO-01, KIN-01, DAT-01, DEM-02, EDU-02, TRN-03.

TRN category (Version 2.1):

| Pack | Core | Aspect ratio, duration | Palette, fonts | Key motion |
|---|---|---|---|---|
| TRN-01 8-bit Arcade Pixel Art | Sharp pixel grid, limited palette, choppy motion at 10 fps, score HUD, dialogue box | 16:9, 15-30 seconds | #0B0A1F #FFFFFF #FF3864 #2DE2E6 #F9C80E; Press Start 2P + Pixelify Sans | Character runs and jumps on every beat collecting coins; layered side-scrolling city and hills; score counts up, dialogue is typed |
| TRN-02 16-bit Cozy Pixel Art | Warm pixel room: morning-dusk-night, rain, cat, dithered lamps | 9:16, 20-45 seconds | #2B2140 #FFF4E0 #F4A259 #8CB369 #F7D08A; Pixelify Sans + Inter | Time changes through palette swaps; rain, coffee steam, cat tail in steps; dialogue typed slowly |
| TRN-03 Folding Origami Crane | Paper folded for real step by step into a crane that flaps and then flies | 16:9, 15-60 seconds | #F3EDE2 #2A2622 #D1495B #EDAE49 #00798C; Shippori Mincho + Zen Maru Gothic | Two folds with front and back sides in different colours; the crane bounces, then flaps; flies out, paper planes in the background |
| TRN-04 Fold-Unfold Origami | Accordion paper opens to reveal a message, dog-ears as accents, a paper plane carries the call to action | 16:9, 15-60 seconds | #1F2A44 #FFF8EE #F25F5C #FFE066 #70C1B3; Fraunces + Inter | Accordion opens fold by fold; folded card corner + crease sheen; a paper plane carries the CTA |

TRN audio: chiptune 140-150 BPM + coin/jump SFX (TRN-01); lo-fi 70-85 BPM + rain/typing (TRN-02); piano/koto 70-90 BPM + paper rustle (TRN-03); light acoustic 90-100 BPM + paper folding (TRN-04).
