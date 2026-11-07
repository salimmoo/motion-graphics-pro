# References: alternative styles, simple flat vector, vector/pixel/origami variants

Part of the `vector-character` skill. Read when: the brief asks for another style or the same character in pixel art/origami.

Moved verbatim from SKILL.md v2.3 (10. Alternative styles from taste references (use when the brief asks), 19. Character style variants: vector, pixel art, origami (Version 2.1, 05-11-2026)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 10. Alternative styles from taste references (use when the brief asks)

- Maximalist flat (Glam, Dan Stein): 8-9 colours are fine as long as all are flat with a uniform dark outline of 1.5-2 px at 1080p, strokes not scaled.
- 3-colour sequence (Myth): light background, dark silhouette, warm accent only for the rim + details; background as line art only, character fully coloured.
- Spot illustration: character in front of a pale organic blob.
- Noodle limbs (short, boneless): curved centre line + thick round-cap stroke. 3-shape shading (light, base, dark) for a cartoon style (Ben Marriott).
- Collage style: torn edges, jagged starbursts, a different font per word.

### 10.1 Simple flat vector (Review Results: "simple, elegant, sells")
- No outline. Flat colours + ONE crisp low-contrast shadow on the side away from the light (region minus a copy shifted toward the light, no blur).
- Clean contours: few anchors, long curves; traced contours smoothed strongly (hair more than the body) until there are no small waves.
- Little but purposeful detail:
  - seams/folds = thin LIGHT lines (the line polarity is chosen per project and written in the spec: the character kit and the test project use DARK lines dL* -5..-8, about 7% of the area);
  - cuff/hem rib bands slightly darker;
  - buttons, pockets, shoelaces;
  - hair 1 shine line.
- Drop: knit texture, dense ribs, many hair strands, dense fringe (use fewer, wider strands), heavy grain.
- Limited palette (3-5 colours + 1 accent); main garment colour contrasting with the background (e.g. cool on a warm background).
- Lively pose: 3/4 walking (front heel planted, back heel lifted), upper body leaning 3-4 degrees, arms swinging opposite, one small prop that tells a story.
- Slim cropped trousers + visible socks make a light silhouette; long wide trousers make a heavy silhouette (choose per the character spec).

## 19. Character style variants: vector, pixel art, origami (Version 2.1, 05-11-2026)

One character, one skeleton, three ways of drawing. The skeleton and pose do not change between styles; only the drawing module changes (the same principle as the style layer in chapters 5 and 18.2). The examples below come from the guide site's code demo, side view facing right, units 100 = body height, y downward, feet at y 0. Motion per style: motion-graphics skill chapter 12.5 (`motion-graphics/references/scene-recipes.md`); production rules: motion-graphics-pro skill T14, T15.

### 19.1 Shared skeleton
- Side-view joints:
  - pelvis (y -46 when standing);
  - neck 24 from the pelvis, shoulder 21 from the pelvis;
  - thigh 21, shin 20, foot 10;
  - upper arm 15, forearm 14;
  - head centre 13 above the neck.
- The stance foot is always pinned to the ground after the pose is computed.
- Palette per material, each with a shadow pair: skin, hair (+ light hair), top, trousers, shoes, plus ink, cheeks and mouth.
- Far-side legs and arms use the shadow colour.

### 19.2 Vector (reference)
- Legs and arms = round-cap strokes over an ink stroke that is 2.4 thicker.
- Body = a thick stroke.
- Head a circle r 11.5 + hair cap and fringe from quadratic curves.
- Face: ear, elliptical eyes (blink = height x 0.18), brows, cheeks alpha 0.5, smile.
- Flat colour per material.

### 19.3 Pixel art (derived from the same vector drawing)
1. Draw the vector character small without ink (scale 0.48, about 48 pixels tall). The face is simplified to one eye block (blink = flattened block); cheeks and mouth are not drawn.
2. Alpha threshold: < 120 becomes fully transparent, the rest fully opaque. No semi-transparent pixels.
3. Every pixel is locked to a fixed palette of 12 colours (skin, dark skin, hair, light hair, top, dark top, trousers, dark trousers, shoes, dark shoes, cheeks, mouth). Colour distance weighted by luminance 0.3 / 0.59 / 0.11.
4. A 1-pixel edge line in the ink colour on every empty pixel that neighbours (4 directions) a filled pixel.
5. Enlarge by an integer scale, nearest neighbour; positions on whole pixels.
6. Check: the palette does not grow, no mixed pixels, edge lines closed, feet on the same ground row in every drawing.

### 19.4 Origami (folded paper planes)
1. **A kite per segment.** Every leg and arm segment is made from joint points A and B + side points at 42% of the length (width w).
   - Split along the fold line A-B: a light half (base colour) and a dark half (shadow colour).
   - Far legs/arms mixed 22% toward dark.
   - Widths: thigh 11, shin 9.5, upper arm 8.5, forearm 6.5.
2. **Body and head.**
   - Body = a fan of 6 triangles around the body centre, tones alternating light/base/dark.
   - Head = 6 triangles around the centre (one lightest plane facing the light).
   - Hair = 3 triangles; neck, hands, shoes = one triangle.
3. **Fold lines.** Thin light fold lines (0.5 px, cream alpha 0.38), no thick ink lines.
4. **Face.** Small triangular eyes (blink = flattened triangle) and triangular cheeks; they appear after the planes have finished unfolding.
5. **Back side.** Cream (#f4ead6) with brownish fold lines; visible when a plane flips over.
6. **Check.** Every plane has a light-dark pair, the number of planes stays the same across drawings, the silhouette still reads as the same character as the vector version.

### 19.5 When to choose
- **Vector:** the default, most flexible for subtle acting.
- **Pixel art:** gaming/retro/cozy content, small and cheap assets.
- **Origami:** meaningful messages, event openers, process education, fold transitions.

The style choice is confirmed by the user at the taste stage. The style can change without touching the rig; after changing style, re-render the clips and repeat the self-check (chapter 11).
