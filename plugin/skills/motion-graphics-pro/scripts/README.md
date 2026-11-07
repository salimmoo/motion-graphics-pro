# motion-graphics-pro scripts

## magenta_key.py (old name: kunci_magenta.py)

Turns a pure magenta `#FF00FF` background in image assets (for example the output of an image generator asked for a magenta background) into transparency, with edge despill so no purple halo is left.

The old file name `kunci_magenta.py` still works (a thin shim that runs `magenta_key.py`). `mgp cutout --key magenta` and `mgp image --cutout` use the same logic.

Needs **numpy + Pillow** only:

```
pip install -r requirements.txt
```

### Commands

```
python -I magenta_key.py input.png output.png
python -I magenta_key.py input.png output.png --preview preview.jpg
python -I magenta_key.py input_folder/ output_folder/
```

- One file: RGBA PNG output; `--preview` saves a preview on dark blue (20, 30, 60), at most 500 px.
- One folder: every PNG/JPG/WEBP is processed to `output_folder/name.png`, with automatic previews in `output_folder/_preview/name.jpg`.

### How it works

- Magenta amount = `min(R, B) - G`: above 110 fully transparent, below 40 untouched, graded in between.
- Strong red or strong blue alone (R-B difference > 90) stays untouched; dark magenta (a shaded background) is removed as well.
- Semi-transparent edges get their magenta amount reduced (despill), and the alpha is eroded by 1 px, then smoothed.

### Check the result

Open the preview: the object's edge must be clean without a purple line. When the object itself is strongly magenta/purple, that part can turn transparent too, so ask for assets with a background that contrasts with the object's colours.
