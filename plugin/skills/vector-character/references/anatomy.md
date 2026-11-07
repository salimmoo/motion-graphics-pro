# References: body parts and shading

Part of the `vector-character` skill. Read when: drawing the head, body, arms, hands, legs, shoes, face, and shading.

Moved verbatim from SKILL.md v2.3 (3. Body parts (general numbers, chin = 1.0 H), 4. Shading); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 3. Body parts (general numbers, chin = 1.0 H)

- Head/face (Neda EWE8HXT0330):
  - Face box in 3 parts (hairline-brows, brows-nose bottom, nose-chin).
  - Inverted egg shape: temples +-0.338, jaw angle +-0.32 at y 0.72, chin +-0.10 at y 1.0.
  - Brows 0.40-0.45 (thick at the root, tapering at the tail), eye line 0.51, eye width 0.15 = distance between the eyes.
  - Nose base 0.69 (width = distance between the eyes), mouth 0.79 (1/3 of the nose-chin distance), mouth corners below the inner iris.
  - Ears from the brows to the nose base.
- Natural, friendly eyes (animation style):
  - Almond open enough (height about 0.06 H); upper lid = a tapering crescent covering the top of the iris; lid crease; thin lower lid.
  - Iris r 0.030 (3 layers: iris, pupil, highlight) + lid shadow.
  - Nose: shadow under the tip, nostril wings, small nostrils, side shadow.
  - Mouth: tapering line + soft corner dips (closed smile), shadow under the lower lip. Thin radial-gradient blush.
- Minimal flat-style face:
  - Small dark oval eyes (rx about 0.035 H, ry 0.05 H) + one highlight dot; brows = short tapering strokes.
  - Nose = a small shadow in dark skin colour. Open smile: D shape, white upper teeth, lighter tongue/lower lip. Soft blush.
  - 3/4 view: far eye narrower; nose goes into the face contour. Side view: mouth a closed line.
- Face profile: forehead, brow ridge, eye socket, nose, lips, chin in one body path; profile eye = a small almond + oval iris.
- Hat/helmet: the occiput (back of the head) goes into the shell, back edge lower than the front; sideburns below the edge; short hair wraps around the ear.
- Neck + shoulders one skin outline (Neda), jaw shadow on the neck.
- "Racket ball" joints (Audrey/Jess): the ends of the parts meeting at a joint are rounded; the lower part tucks under the upper part. No detail in the joint area. For shoulders/armpits see chapter 8.
- Hands (Shape Builder):
  - Palm + 4 tapering finger capsules (relative length middle 1.00, ring 0.94, index 0.92, little 0.75; knuckles form an arc; fingers touching and slightly converging) + thumb with a large thenar root.
  - Hand length 0.64-0.76 H (measure from the reference). Finger separation lines from the tip to the knuckle; the thumb edge only visible where it overlaps the palm.
  - Hanging arm: back of the hand facing slightly forward.
  - Swap set: relaxed, open (waving, mirrored; fingers spread 14-16 degrees, thumb away about 1.9x the spread angle, no finger separation lines), fist (fingers folded, thumb across), on the belt, holding an object.
  - Relaxed hand in side view (flat style): one silhouette of the back of the hand with closed fingers whose tips converge + a tube thumb in front; finger gaps = soft lines.
  - Hand holding an object = ONE hand shape (chapter 18.4): palm behind the object joined to the wrist, one jagged fingertip blob at the front edge of the object with a tone wedge in each notch, thumb one thick lobe. No separate finger capsules.
  - Tapered capsule = union of two circles + an outer tangent quad.
- Shoes:
  - Feet turned slightly outward (front view).
  - Sneaker profile (local coordinates heel -> toe, height scaled by foot length): round heel counter, collar dipping down, tongue, vamp sloping to the toe, round toe box, white cup sole with toe spring, laces = short cross bars, thin stitching.
  - Work shoe/boot: thick sole, domed toe cap, tongue + laces, heel; boot profile about 1.15 H.
  - Trouser hem curves down at the front.
- Leg raised in front view: thigh looks short (foreshortening), shoe facing the camera.
- Body profile: chest about 1.0 H deep, thigh 0.7 H; ear, shoulder, hip, knee, ankle on one vertical line.
- Wavy hair: not a repeating sine offset (reads as stiff curls/a wig). Use CURTAINS (`shapes.curtain2`): two edges with 1-2 large S curves in the same direction on both edges, starting at the jaw, varied strand ends; volume at the jaw/shoulders. Crown shape and hairline from measuring the reference (chapter 18.3). Side view: round cranium and the hair as one mass.
- Fringe (scarf, etc.) = separate strands (background visible in between).
- Ears in 3/4 and side views in front of the hair.
- Clothing:
  - Outer layer over the inner layer (straps/shoulders of the outer garment cover the sleeve root of the inner shirt).
  - A few folds at knees/elbows; cuffs, buckles, zips, buttons, pockets.
  - Objects at the side of the body are only visible from the correct side for the view.
  - Patterns clipped to that garment; inner detail uses thin lines, not outlines.
- Wide-leg trousers: the fabric does not bend sharply at the knee (thigh-calf width blend); front-view leg = a straight line from hip to ankle.
- Female body (Review Results, kit test project: "the female body shape is a bit different and worth varying"): write the body as half-width parameters (shoulders, chest, waist, hips, thighs, knees, ankles, arms, neck) + clothing ease, then offer 2-3 types on a comparison sheet (e.g. slim, hourglass, curvy). Front-view traits: shoulders narrower and more sloped than a man's; the chest-waist-hip curve still reads even in loose clothes (hem band hugs the hips); hips wider than the shoulders except the slim type; upper thighs full on the outside; knees closer together than the hips; elbows at the side of the waist and forearms angled outward (carrying angle) so the waist gap is visible; smaller hands and feet.
- Kit-style clothing detail catalogue (research on 5 character constructor kit sheets, test project research): neck rib 2 parallel lines; short armhole seam running 0.3-0.5 H down from the armpit; cuff/hem rib 1 line; elbow fold 1-2 strokes that appear smoothly with the elbow angle; pocket = an open line; rolled sleeve = a 2-3 line band covering the elbow; rolled trouser cuff = a lighter band. Lines: material colour dL* -5..-8, thickness 0.015-0.025 H, tapered and open ends (not closed). Fabric 1 base tone; shadows only for contact (band under the chin about 0.07 H, inside the collar, inner hair layer, sole).
- Kit-style gesture set = WHOLE ARMS (upper + forearm already bent + hand + object), about 35-40 assets per character: thumbs up, pointing, stop, raised fist, OK, crossed arms, phone, tablet, cup, paper, book, card, bag, laptop with two hands. The top end of the arm is round and goes under the body's shoulder.
- Kit-style face + mouths: 12 visemes (A E I, O, C D N S T X Y Z, R, L, B M P, F V, Ee, Th, Ch J Sh, U, Q W) + a head without a mouth (front and 3/4). Expression through brows (angle, height), lids (^ arc laughing, half closed) and mouth (D with teeth, O, clenched teeth, frown); eyes stay dots. Mouth size 0.15 H closed up to 0.26 H open; upright oval eyes 0.03 x 0.07 H, centre distance 0.27 H; nose = a C-shaped dark skin line about 0.16 H.

## 4. Shading

- Light from the top left. Soft linear gradient per garment (Fd4IOI): light on the light side, dark on the far side (stops 0, 0.42, 1).
- Form shadow = region minus a copy shifted toward the light, blurred, clipped to the region. Thin rim light on the light side.
- Accent-colour rim light (Myth style): a copy of the silhouette in the accent colour BEHIND the silhouette, shifted (+3, -2) px (estimate), so only a thin edge shows.
- Parts of one garment (chest V, shoulder, upper arm, forearm) use gradient bounds and shadows from the UNION of their group, then clipped per part -> no seams.
- Cast shadow = (caster shifted away from the light) intersect receiver, blur, clip. Examples: hat brim onto the forehead, chin onto the neck, collar onto the body, cuff onto the hand, belt onto the trousers, shirt hem onto the trousers, trouser hem onto the shoe, arm onto the body.
- Ground shadow = a radial-gradient oval under the feet, following the foot positions. In a 3D scene with a sun: shadows from the 3D pose (motion-graphics chapter 5.3 (`motion-graphics/references/backgrounds.md`)).
- Grain 3-3.5% (Ben Marriott 3-8%); simple flat style 0.6-1.2%. For video use a fixed grain seed. Texture clipped per shape; dry-brush edges = 1-2 px path point jitter.
- Orbit with a world sun: the character's light direction per angle is computed from the sun (test project decision); screen form_shade uses the projected light vector, not a fixed top left.
  - Offer the user two styles before doing it: (a) kit style, no form shadows, only contact shadows that do not depend on the light direction (under the chin, inside the collar, under the hair, sole); safest for orbits. (b) Isometric-style far-side plane: one dark plane dL* -9..-13 (about 30% of the area), its boundary from the loft normal against the sun, continuous with the angle.
  - Tested method (rig v4 test project): world sun -> body frame (X forward = (sin facing, cos facing), L right = (cos facing, -sin facing)); per angle v: hx = sX sin v - sL cos v (screen-right component), hz = sX cos v + sL sin v (toward the camera), normalised from the horizontal light. Shadow band = region minus a copy shifted k x hx (k the same as the old form_shade, e.g. 0.05-0.075 H). When hz < 0 (sun behind the character): the whole shape is shaded 0.28 x (-hz) except a 0.03 H edge on the light side (rim). This shade is required on ALL parts (skin, hair, shoes, bag), otherwise a light face sits on a dark body. Character sheets without a sun keep the screen top left so they can be regressed against the reference drawing.
