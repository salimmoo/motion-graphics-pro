# Version history of the `vector-character` skill

Moved from the opening of SKILL.md v2.3. Full release summary: `CHANGELOG.md` at the package root.

Version 2.1 (05-11-2026): new chapter 19 with character style variants (vector, pixel art, origami) from one skeleton.

Version 2.2 (05-11-2026): the scripts only need numpy + Pillow. Drawing goes through `brush` (the package's own vector API, then named `kuas`; skia-python is only an optional, faster engine), images through `image_ops` (then `atelier_citra`, an OpenCV replacement); project modules take `brush.Canvas` and `brush.Path`, not `skia.Path` (chapters 6, 17). The proportion grid is aligned with `loft.CANON` (7.5-head canon, chapter 1). The character kit and styles are also available as JS modules in the motion-graphics skill (`lib/vector-kit.js`, `lib/character-styles.js`) for HTML compositions rendered by mgp.

Version 2.4 (05-11-2026): SKILL.md trimmed to a core (rules, work order, method, tools, review, self-check) + `references/` files; `character-styles` origami style default `origamiStyle: "rigid"`, rubberhose, constant stroke and FACS from `motion-graphics/references/advanced-principles.md`.
