# Version history of the `motion-graphics` skill

Moved from the opening of SKILL.md v2.3. Full release summary: `CHANGELOG.md` at the package root.

Version 2.1 (05-11-2026): new chapter 12 with the proportions and volume of the 3D human figure, a one-take scene recipe for a berthing tanker, personified chibi objects, a narrator face with lip-sync, and motion in pixel art and origami styles.

Version 2.2 (05-11-2026): new chapter 13 with the JavaScript motion module library (`lib/`), its composition contract, and how to render it with mgp (the local renderer of the motion-graphics-pro skill, old name: Rekam). The Python scripts need only numpy + Pillow: drawing goes through the `brush` layer (old name `kuas`; skia-python is only an optional faster engine), images through `image_ops` (old name `atelier_citra`; OpenCV is not needed). The sample character in the scripts and `lib/` uses the 7.5-head canon (chapter 12.1).

Version 2.4 (05-11-2026): SKILL.md trimmed to a core + `references/` files; advanced motion principles (`references/advanced-principles.md`: springs bouncy/snappy/heavy, inertia, delay, constant volume, constant stroke, rubberhose, 2.5D head, FACS, SLERP, rigid origami, Miura/Yoshimura/Kresling, fields, `mgp curves`). The main API of the animation engine mgp.motion (old name: Gerak) is written `mgp.motion` (`gsap` is a compatibility alias).
