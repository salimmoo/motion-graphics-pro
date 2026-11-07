# References: collage visual system, pixel art, origami

Part of the `motion-graphics-pro` skill. Read when: choosing or keeping a style (stage 2), assembling a scene (stages 7-8), or when the brief asks for pixel art/origami.

Moved verbatim from SKILL.md v2.3 (chapter 3 Collage visual system, 17.3 Pixel art and origami in the production flow); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 3. Collage visual system

3.0 **Atelier Kertas (house style).** The name of this package's default style; a brief that says "house style", "Atelier Kertas", or names no style uses it. It consists of:
- **Material:** every element is a real piece of matte cardstock/paper: clean scissor-cut edges, fine paper fibre, card thickness visible at the edge, shading only inside the piece, shot straight from the front, clean daylight, rich local colours. Not cartoon, anime, 3D render, glossy, sepia, or a vintage filter. The official prompt text = `--style paper` in `mgp image` (`render/src/image.mjs`, `STYLES.paper`) and the Higgsfield STYLE block (`references/image.md` 4.3).
- **Assembly:** a scene is assembled from separate pieces (3.1), at least 3 planes + a character with parallax (3.2); sky, light, masks, text, and maps from code; one cast-shadow direction; contact shadows; multiply grain 0.10; thin cream rim; torn edges only on text frames and transitions.
- **Motion:** pieces and characters on twos with a small boil (6.1); element entrances with a paper pop/settle (6.2); sequence sheet characters or a smooth rig (no visible split-pins); paper transitions (tear, fold, page-turn; chapter 8).
- **Text:** only in code, bundled fonts, paper cards for headlines (chapter 7).
- **Variants:** `--style vector|origami|pixel` (17.3) are other styles, not Atelier Kertas. A series that has already locked its style uses its earlier kit/references as the style anchor, which is stronger than prompt words.

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
