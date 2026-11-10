# References: collage visual system, pixel art, origami

Part of the `motion-graphics-pro` skill. Read when: choosing or keeping a style (stage 2), assembling a scene (stages 7-8), or when the brief asks for pixel art/origami.

Moved verbatim from SKILL.md v2.3 (chapter 3 Collage visual system, 17.3 Pixel art and origami in the production flow); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 3. Collage visual system

3.0 **Atelier Kertas (house style).** The name of this package's default style; a brief that says "house style", "Atelier Kertas", or names no style uses it. It consists of:
- **Material:** every element is a real piece of matte cardstock/paper: clean scissor-cut edges, fine paper fibre, card thickness visible at the edge, shading only inside the piece, shot straight from the front, clean daylight, rich local colours. Not cartoon, anime, 3D render, glossy, sepia, or a vintage filter. The official prompt text = `--style paper` in `mgp image` (`render/src/image.mjs`, `STYLES.paper`) and the Higgsfield STYLE block (`references/image.md` 4.3).
- **Assembly:** a scene is assembled from separate pieces (3.1), at least 3 planes + a character with parallax (3.2); sky, light, masks, text, and maps from code; one cast-shadow direction; contact shadows; multiply grain 0.10; thin cream rim; torn edges only on text frames and transitions.
- **Motion:** pieces and characters on twos with a small boil (6.1); element entrances with a paper pop/settle (6.2); sequence sheet characters or a smooth rig (no visible split-pins); paper transitions (tear, fold, page-turn; chapter 8).
- **Text:** only in code, bundled fonts, paper cards for headlines (chapter 7).
- **Variants:** `--style vector|origami|pixel|stitch|layered|diorama|quilling` (17.3, 17.5-17.7) are other styles, not Atelier Kertas. A series that has already locked its style uses its earlier kit/references as the style anchor, which is stronger than prompt words.

3.1 Paper collage is a scene ASSEMBLED from separate paper pieces: the kit is generated (chapter 4), cut out in code (chapter 5), layered, then animated piece by piece (chapter 6). One full AI plate with an overlay is NOT a collage (rejected at review). A 9:16 plate is only for a style anchor or an interior, and is better split into a kit or into layers (chapter 15, branch B).

3.2 Higgsfield paper supplies objects, sets, characters, the sun, light discs, and torn strips. Code supplies only the sky gradient, light, masks, typography, maps, and calligraphy.

| Element | Rules and numbers (720 w) |
|---|---|
| Planes | At least 3 planes + a character (reference reels 7-12 layers). Parallax k: sky/clouds 0.12-0.18; far hills 0.25; near hills 0.40; buildings 0.50-0.62; hero 0.70-0.74; foreground 0.88-0.92; character 0.95-1.0; framing elements 1.1-1.3 |
| Hero | One focus with about 70% of the visual weight; at most 2-3 supporting elements |
| Sky | Code gradient, day #2C67B0, #78ACDC (55%), #D9E8F2 at y 780 |
| Cast shadow | One direction. Clouds dy 4 px, blur 6 px, rgba(25,55,90,.22); objects dy 5-6 px, blur 9-11 px, rgba(45,28,12,.30-.34) |
| Contact shadow | Ellipse 0.36-0.42 x figure width, height 10-14 px, blur 6-8 px, opacity 0.30 |
| Light | Radial rgba(255,240,205,.18) from (120, 80), radius 900 px |
| Grain | Multiply over the whole frame, fixed seed, 0.10-0.16 (default 0.10) |
| Boil | Pieces ±0.7 px per drawing; characters ±1-2 px, ±0.4-0.5° |
| Edges | Clean cut in the scenery; torn only on text frames and transitions; cream rim 0.5-1% of the width |
| Palette | Local colour per object. Dominant field 35-60%, supporting 20-40%, neutral 5-25%, accent 3-15%, brown/grey at most 20%, at least 3 hues |

3.3 Scene logic:
- Props have context (attached, sat on, water in a dam) and a scale that fits the character's body; props with no purpose are removed. A sitting pose has a seat, a lap line, and a contact shadow (recipe from the papercut-mv method 5.2: the lap line is measured per sheet as a fraction of the sprite height from the sole baseline; the seat prop is scaled so its feet are at the soles and its seat line meets the lap line; the character sits slightly deeper, ±2.5% of the sprite height; contact shadows on the seat and under the soles; a full-res crop of every sitting scene is checked).
- The hero stands apart from the background at thumbnail size through hue and lightness.
- Geography, sun direction, and character size stay the same across shots; layers are widened so their edges are never visible.
- Light medallion for holy figures: a layered disc and rays from the kit, a code screen glow (radius about 2.1 R), calligraphy (7.4).

## 17.3 Pixel art and origami (from chapter 17)

17.3 **Pixel art and origami in the production flow.**
1. When the brief asks for this style, T2 uses T14 (pixel art) or T15 (origami) as the rule sheet and a TRN pack as the starting point; its rules are confirmed at G2 like any other style.
2. Pixel art is drawn in code on a small canvas, then enlarged with an integer scale (nearest neighbour); every pixel is locked to a fixed palette; 1-pixel outlines. Motion at 8-12 drawings per second, stepped. Motion and character recipes: the `motion-graphics` skill chapter 12.5 (`motion-graphics/references/scene-recipes.md`) and the `vector-character` skill chapter 19 (`vector-character/references/style.md`).
3. Origami is built from triangle/kite planes with a light and a dark side per fold and a cream back side; motion at 12 drawings per second; transitions = fold/unfold. Recipes: `motion-graphics` 12.5 (`motion-graphics/references/scene-recipes.md`), `vector-character` 19 (`vector-character/references/style.md`).
4. Extra QC: pixel art with no mixed/half pixels, no extra palette colours, the camera on whole pixels; origami without thick ink lines, every plane has a light-dark pair, the back side shows when a plane turns over.

## 17.5 Sulam Kertas (stitched paper)

17.5 **Sulam Kertas** ("stitched paper", `--style stitch`, alias `sulam`) is a tactile craft style: layered cut-paper relief combined with hand embroidery on warm cream cotton paper. It suits storybook scenes, travel and place portraits, folk tales, food and craft brands, and warm educational stories. Use it when the brief asks for embroidery, felt, textile, "kriya", or a cosy handmade look.

1. **Material.**
   - Sky, water, clouds, foliage and flowers are made of visible thread: satin stitch, french knots, running stitch.
   - Buildings and props are layered textured paper or felt, with subtle 3D depth and soft shadows between the layers.
   - Characters are felt-and-thread figures with stitched seams and embroidered trims. Faces can be fully blank ("faceless"): smooth fabric with no eyes, nose, mouth or eyebrows. A stitched beard or hair shape is still allowed.
   - Light is warm, soft daylight, and the thread and paper-fibre texture must stay visible.
   - The official prompt text is `STYLES.stitch` in `render/src/image.mjs`.
2. **Kit sheets** (chapter 4; same pieces-first rule as 3.1). Ask for separate pieces on a plain, flat, pure white background with generous gaps, nothing overlapping and nothing cropped. Plan one sheet each for:
   - the set: lane or ground strip, stall or house front, door leaf, a back row of houses, a sky panel with clouds, foreground plants;
   - the props;
   - each character: full-body poses on one baseline, same scale, one sheet per character.
3. **Prompting characters.**
   - Describe the costume in words and list every pose. Do not pass a finished scene as the image reference. Image models then copy its gradient backdrop and ignore a magenta or white background request; this was proven in a test (11-2026).
   - For consistency between sheets, use the first approved character sheet as the reference only for the same character.
   - Generate final assets at 2K. 1K pieces go soft when they are scaled more than about 2x in a 1080 x 1920 frame.
4. **Cutting** (chapter 5).
   - **Set and prop sheets on white:** run `mgp cutout sheet.png -o sheet_cut.png --key white`. This flood-fills from the border, so cream paper and white thread inside a piece stay. Then run `mgp image slice sheet_cut.png -o kit/ --min-area 1500`.
   - **Character sheets** (felt figures, often on a soft gradient backdrop): run `mgp cutout sheet.png -o sheet_cut.png --model isnet-general-use`. In the test, U2-Net left blank cream faces semi-transparent and dropped whole figures; ISNet kept every figure clean. Then slice with `--min-area 4000`.
   - A sky panel can give stitched clouds as separate pieces: key out its blue, then split the result into components.
5. **Assembly in 9:16.**
   - Build a horizontal world strip (street, stall, house) and move the camera along it with a pan.
   - Apply a global zoom of about 1.3 around the ground line, so the figures fill the frame.
   - Draw the sky as a CSS gradient behind the stitched clouds; do not stretch the sky panel.
   - Embroidered plants (palm fronds, branches, flowers, a pot) frame the bottom corners, with parallax and a slow sway.
   - To open a door, draw a dark interior rectangle over the door of the house piece, then swing the separate door leaf with `scaleX` from its hinge.
6. **Motion.**
   - Characters change by pose swaps from their sheet (a sequence character, 4.4).
   - The walk is a two-drawing cycle on twos (6 steps/s) plus a small vertical bob.
   - Every piece boils slightly: about 0.5 deg of rotation noise at 12 fps.
   - Clouds drift slowly. Time passing is shown with a warm overlay, light rays and lamp smoke drawn in canvas.
   - Transitions use a thin paper flash, a tear or a pan, never a glossy wipe.
7. **Text.** Use fabric labels: a cream tag, a dashed stitch line inset around the edge, ✕ cross-stitches at both ends, and a serif headline with one accent word in red. The label drops in with a light spring.
8. **Extra QC.**
   - Faces stay blank when the brief says faceless.
   - No white halo on piece edges (key tolerance about 22).
   - No piece is shown above about 2x its source size.
   - Thread texture is still visible after the render (CRF 18 or better for the master).
   - Characters have the same scale between sheets (normalise per sheet, because sheets come out at different scales).

## 17.6 Lapis Kertas (deep layered paper-cut) and Gulung Kertas (paper quilling)

17.6 Two more paper styles, next to Atelier Kertas (3.0) and Sulam Kertas (17.5).

1. **Lapis Kertas** (`--style layered`, aliases `lapis`, `papercut`): a 3D papercut shadow-box diorama made of many stacked sheets of matte coloured paper cut into wavy layers. It differs from Atelier Kertas (flat collage pieces with thin shadows) in its DEPTH:
   - 6-12 visible layers with real spacing and soft drop shadows between them;
   - thin curved cut lines etched inside each layer;
   - suns and water ripples as concentric paper rings;
   - a limited, bold palette (orange + teal, red accent on blue).

   It suits landscapes, travel, legends and story openings, mood title cards, and Chinese/Japanese shan shui scenes.
2. **Gulung Kertas** (`--style quilling`, alias `gulung`): shapes built from narrow paper strips rolled into coils and scrolls, or set on edge. Clouds, foliage and flowers become tight coils, combined with a few layered planes. It suits greetings, craft and food brands, and children's content.
3. **Assets.** Both follow the pieces-first rule (3.1): generate the layers as separate pieces, not one finished plate.
   - Lapis Kertas: put each depth band on its own sheet (sky + sun rings, far hills, middle hills/town, foreground) on plain white. Each band is full width with a wavy top edge. Cut it with `mgp cutout --key white`, then run `mgp image slice`.
   - Higgsfield GPT Image 2.6 accepts `background: "transparent"` (with `resolution: "2k"`, `quality: "low"`, about 0.5 credit per sheet): every sheet comes back with real alpha, so you can skip the cutout and go straight to `mgp image slice --min-area 6000`. Proven on 8 kit sheets (11-2026).
   - Gulung Kertas: the coils are fine detail, so generate at 2K and cut with `--model isnet-general-use`.
   - Characters: as in 17.5 item 3, one sheet per character, faces optionally blank. Image models tend to add a profile nose and an eye even when asked for blank faces, so QC every figure.
4. **Motion.**
   - Lapis Kertas lives on parallax: every band has its own speed (0.2 far ... 1.3 foreground) and the camera does a slow dolly-in.
   - Layers can rise or slide in one by one at the start, like a pop-up book.
   - Sun rings turn slightly against each other, and mist or clouds slide between the layers.
   - Gulung Kertas: small rotations on the coils (they "unwind" in), springy pops and a 12 fps boil.
5. **QC.**
   - Every layer casts a shadow on the layer behind it (one light direction).
   - Edges stay crisp after scaling (no piece shown above about 2x its source).
   - A finished AI plate with no separable layers is rejected (3.1).

## 17.7 Diorama Kertas (3D papercraft miniature)

17.7 **Diorama Kertas** (`--style diorama`, aliases `diorama-kertas`, `papercraft`) looks like a tabletop model made of folded card. Buildings, boats, trees and props are real 3D boxes and volumes: their side faces and roofs show, the fold lines are scored, and everything stands on a layered paper ground, photographed from a slight three-quarter view. It differs from Lapis Kertas (17.6):
- Lapis Kertas is FLAT sheets stacked in depth, a puppet-theatre look.
- Diorama Kertas has VOLUME: you see the side of a house.

It suits town, harbour and city portraits, travel and tourism, product worlds, maps, and explainers about a place.

1. **Assets.**
   - One kit sheet per group (buildings, vehicles/boats, trees/props, ground tiles), on plain white or with `background: "transparent"` (17.6 item 3).
   - Ask for every object from the SAME three-quarter angle and light direction. Objects drawn from different angles break the illusion of one model.
   - Characters are small folded-card figures, with faces optionally blank (17.5 item 3).
2. **Assembly.**
   - Place the objects on the ground by depth (y = distance) and scale them down slightly further back.
   - One soft contact shadow per object, on the same side.
   - The sky is a painted or layered paper backdrop.
3. **Motion.**
   - The camera does a short 2.5D move: a slow truck or a slight orbit. Fake the orbit with per-row parallax plus a small horizontal skew of the objects (max about 4 deg). Never a full 3D turn, because the sides would show that the pieces are flat.
   - Objects can "fold open" in: scaleY 0 -> 1 from the base with a spring.
   - Boats bob, and windows and lamps light up.
   - Use a tilt-shift blur at the top and bottom for the miniature feel (optional).
4. **QC.**
   - All objects share one viewing angle and one light direction.
   - Contact shadows sit under every object (nothing floats).
   - No object is turned so far that its flatness shows.
   - Edges stay crisp at about 2x scale or less.
