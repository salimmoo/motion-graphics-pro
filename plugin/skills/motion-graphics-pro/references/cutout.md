# References: cutting and keying

Part of the `motion-graphics-pro` skill. Read when: stage 6 (cutting the kit, sequence anchors, cutout QC).

Moved verbatim from SKILL.md v2.3 (chapter 5 Cutting and keying); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, section References).

## 5. Cutting and keying

5.1 **Kit cutter** (algorithm of `cut_kit_v5.py` from the papercut-mv method; that script is not shipped in this pack). In this
pack the steps are run by `mgp image slice` (alpha sheet → one PNG per part + `kit.json` + preview;
`--magenta` keys the magenta background first, `--min-area`, `--names`) and `mgp cutout --key magenta`
/ `scripts/magenta_key.py` (key + despill). For a sheet on a flat non-magenta background, key it first with
`mgp cutout in.png -o out.png` (rembg), then `mgp image slice out.png -o kit/`. rembg + the U2-Net model are installed once with
`mgp install cutout` (own venv `<home>/venv-cutout`, packages locked in `render/py/requirements-cutout.txt`, model
`u2net` in `render/py/model-manifest.json` with sha256, CPU, ~0.6 GB); a venv with rembg made by hand (e.g. `~/vrb`)
is registered with `mgp install cutout --adopt`. `mgp cutout` then finds it through `install.json` (no `--python`
needed). The magenta key and `slice` despill the key colour along the edge by default (`--no-despill`; `references/image.md` 3.6 item 6).
**White sheets and felt figures** (Sulam Kertas, `references/style.md` 17.5):
- A kit sheet of paper or felt pieces on plain white is keyed with `mgp cutout in.png -o out.png --key white`. Only the near-white region that touches the image border becomes transparent, so cream paper and white thread inside a piece stay opaque. `--tolerance` sets the distance from white (default 22).
- Felt or 3D-looking figures on a soft gradient backdrop are cut with `--model isnet-general-use`. U2-Net leaves pale blank faces semi-transparent and drops figures, which was proven on a felt character sheet (11-2026).
- After either cut, run `mgp image slice`.

Reference algorithm (proven):
1. Background = median of the pixels 3 px in from all four edges; d = RGB distance to the background; d > tol (28) = piece.
2. Open 3 x 3, close 5 x 5, flood fill from the corners; closed holes inside a piece are filled.
3. Components with an area of at least minarea are kept (600 px at 1K, 2400 px at 2K).
4. Soft alpha = clip((d - 0.6 tol) / (0.8 tol), 0, 1) + Gaussian 3 x 3 sigma 0.7.
5. Order by row band (y // 60), then x; names from `--names` (a warning when the count does not match); output PNG + `meta.json` (w, h, sheet, x, y).

```bash
mgp image slice assets/src/k1.png -o assets/pieces/k1 --magenta --min-area 2400 --names <name1>,<name2>   # magenta sheet
mgp image slice assets/src/k1_cutout.png -o assets/pieces/k1 --min-area 2400 --names <name1>,<name2>     # already has alpha
```

5.2 Hole filling closes intentional gaps (gaps in a fence, wheel spokes); those gaps are opened again (recipe from the papercut-mv method 5.1): inside the object mask, look for grey pixels >= 238 with max - min <= 14; flat components >= 40 px (std < 6, mean >= 244) become transparent holes (dilate 3 x 3), and the holes get only a thin paper edge. Figures that touch are separated with a DP seam (`seg2`).

5.3 **Sequence anchors and scale.**
- ay = sole line; ax = centre of the feet for standing, centre of the head for walking/running. Stored in `anchors.json` {frame: [ax, ay]}.
- One shared scale per sheet: s_sheet = target height / median figure height; per-pose scale is not allowed. Across sheets, s_sheet is set so the character has the same height (proof: walk 0.842, wave 0.759). Soles and body centre are locked to the reference pose (proof baseline y 1165).

5.4 **QC.** A numbered contact sheet on a magenta/dark grey background + full-res edge crops: no white fringe, grey boxes, specks, or leftover background between the legs.
