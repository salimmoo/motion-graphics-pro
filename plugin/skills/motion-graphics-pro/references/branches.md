# References: production branches (A kit, B reverse stripe, C AI video)

Part of the `motion-graphics-pro` skill. Read when: stage 4 (block plan, credit count) and when assembling branch B.

Moved verbatim from SKILL.md v2.3 (chapter 15 Production branches); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, section References).

## 15. Production branches

Every scene picks one branch in T3 (Assets column). Spending the fewest credits is the top priority. Higgsfield preflight prices 01-11-2026: GPT Image 2.5 1K 1.5 and 2K 2.75 per image; Kling 3.0 10 per 5 s 9:16; Seedance 2.5 35 per 5 s 9:16.

| Branch | When | Assets | Credits per location |
|---|---|---|---|
| A Kit only (cheapest) | Secondary locations, simple scenes | 1 kit 21:9 + motion set | ±5-8 |
| B Reverse stripe | Main locations that must look rich (market, town) | Keyframe 9:16 2K + 3 layer-split sheets 21:9 2K + motion set | ±11 + motion set |
| C AI video | 2-3 hero shots per episode | Kling 3.0 from an approved still | 10 per 5 s |

Estimate for a 3-minute episode: branches A/B about 150 credits (layers and motion sets are reused); all Kling about 460; all Seedance about 1,360 (regenerations not included). These numbers are estimates from assumed counts of locations and motion sets.

15.1 **Branch B: keyframe -> layer split -> assemble** (proof: `pasar_rakit_1k.mp4`):
1. **Keyframe that is easy to split** (T11): plan 8-12 layers with regions as a percentage of the frame; gaps between groups; medium detail (small objects grouped); a front object covers at most a third of an object behind it; the main character is not included (or stands in an open area that is easy to erase); an empty floor path for the character; background people already face the intended direction.
2. **Layer split** (T12): a 21:9 sheet with four 9:16 panels, keyframe attached. Required: "COPY from the keyframe, do not redraw" (same scale, position, pose, facing); every panel has KEEP + a percentage region and a firm ERASE; FILL only for back layers and only their own surface, people/prop layers "no fill"; one panel must be the SHELL (roof/sky + floor + end of the aisle, empty); plain magenta #FF00FF, white gutters. Order: sheet 1 shell, aisle end, left row, right row; sheet 2 people; sheet 3 front props + empty plate (spare and reference). Per-layer 9:16 edits (one job per layer, keyframe as canvas: "IMAGE EDIT of the attached image, not a new drawing ... KEEP ... ERASE ... flat solid magenta ... FILL ...") only when the user puts accuracy above credits (about 33-36 credits per location).
3. **Cut:** panels are separated at the white columns (channel minimum > 225 over more than 85% of the height); 1K panel = 331 x 576 px, 2K about 660 x 1152 px. Alpha = clip((RGB distance to #FF00FF - 70) / 60, 0, 1), erode 3 x 3, blur 0.8. Despill: within 7 px of the edge, R and B are limited to at most G + 35.
4. **Match to the keyframe (required; the model does not keep scale and position across panels):** frame 720 x 1280 = keyframe 752 x 1344 x 0.952, centre crop. When OpenCV is installed (optional, `pip install opencv-python-headless`): SIFT 4000-5000 points, Lowe ratio 0.75, `estimateAffinePartial2D` RANSAC 4-5 px; accepted when there are at least 10 inliers and the scale is plausible. Without OpenCV, go straight to the plain panel mapping below. Repeating patterns (zinc roofs, floors, rows of stalls) often fail SIFT: use the plain panel mapping (scale 1280/576, centre shift), then check the overlap against the empty plate. A figure whose pose changed: a manual box at the keyframe position. A layer holding two objects far apart (bananas + crate) is split per component first. An oversized layer is replaced by a better-fitting source (the stall row from the far background layer, split left, right, centre). The still composite is compared side by side with the keyframe before animation.
5. **Assemble from empty** (formula 6.2, on twos, layer shadow blur 10 px down 6 px opacity 0.32, grain 0.08, push 5%):

| t0 (s) | Layer | Entrance | k |
|---|---|---|---|
| 0 | Cream paper + light at the aisle end | already there | 0 |
| 0.10 | Floor | rises from below 380 px | 0.30 |
| 0.40 | Aisle end | pops from the vanishing point, scale 0.88 to 1 | 0.25 |
| 0.65 / 0.80 | Left / right row | slides in from its own side 420 px | 0.40 |
| 1.10 | Roof | drops 320 px | 0.35 |
| 1.45 | Background people | fade 0.5 s, then move away (scale down 5%) | 0.45 |
| 1.65 / 1.80 | Left / right seller | rise 90 px from behind the table, small sway | 0.55 |
| 2.05 | Buyer | slides in from the right 260 px | 0.68 |
| 2.35 | Hanging objects | drop 430 px + a 10 degree swing that damps out | 1.05 |
| 2.55 / 2.70 | Crate / basket | rises 420 px / slides in from the right 440 px | 1.1 |
| 3.0 | Character | walk-in sequence from outside the frame | 0.85 |

Assembly rules: back first, front last, the character very last; left row from the left, right row from the right; hanging objects from above; floor objects from below; 0.15-0.3 s between layers; the complete scene is held for at least 25% of the duration.

15.2 **Motion set (stop motion of objects and characters).** Whatever moves by itself is drawn as one set of frames (T13) on a plain background: same size, position and baseline; only the moving part changes ("identical size and position in every frame; only <part> changes"). A motion set is not cut from a detailed keyframe, because a very detailed picture is hard to split. Character slide speed = 2 x step length / cycle period (market proof: relaxed walk 1 s per cycle, scale 0.55, 360 px/s).

15.3 **Lessons from the market test 01-11-2026.**

| Problem | Cause | Rule |
|---|---|---|
| Layer oversized and shifted | The prompt asked for a new panel; the model redrew | "COPY, do not redraw" + required matching |
| Far background holds the whole row | Ambiguous layer boundary | KEEP/ERASE with percentage regions |
| People turned around | People layer was redrawn | "same pose, no fill" |
| Cannot be assembled from empty | No shell | One panel must be the shell |
| Blur | 1K sheet (331 px panel) | 2K keyframe and sheets |
| Magenta edges | Colour spill | Despill 15.1 item 3 |
