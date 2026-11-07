"""magenta_key - key out a magenta #FF00FF background from Higgsfield assets (motion-graphics-pro skill, section 17.4).
Old name: kunci_magenta.py (thin shim kept).

Use:
  python -I magenta_key.py input.png output.png [--preview preview.jpg]
  python -I magenta_key.py input_folder/ output_folder/          (every PNG/JPG in the folder)

Needs: numpy, Pillow.
Output is RGBA PNG. Preview = the result on dark blue (20, 30, 60), at most 500 px, for QC.
"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageFilter


def _id():
    """Indonesian messages with MGP_LANG=id or LANG/LC_ALL starting with "id" (same rule as mgp)."""
    m = (os.environ.get("MGP_LANG") or "").lower()
    if m:
        return m.startswith("id")
    for k in ("LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return v.startswith("id")
    return False


def key(src, dst, preview=None):
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    m = np.minimum(r, b) - g                                  # magenta amount
    sat = np.maximum(r, b) - np.minimum(r, b)
    a = np.clip(1 - (m - 40) / 70, 0, 1)                      # m >= 110 transparent, m <= 40 opaque
    a = np.where(sat > 90, 1, a)                              # strong red or strong blue (not both): opaque
    a = np.where((g < .3 * np.minimum(r, b)) & (np.minimum(r, b) > 45), 0, a)   # dark magenta (shaded background)
    spill = np.clip(m - 10, 0, None) * ((a < 1) | (m > 25)) * np.where(a < 1, 1, .5)
    r2, b2 = r - spill * .8, b - spill * .8                   # despill the fringe
    al = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7))
    out = Image.fromarray(np.dstack([np.clip(r2, 0, 255), g, np.clip(b2, 0, 255)]).astype(np.uint8)).convert("RGBA")
    out.putalpha(al)
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    out.save(dst)
    if preview:
        pv = Image.new("RGBA", out.size, (20, 30, 60, 255)); pv.alpha_composite(out); pv.thumbnail((500, 500))
        os.makedirs(os.path.dirname(os.path.abspath(preview)), exist_ok=True)
        pv.convert("RGB").save(preview)
    return out.size


kunci = key  # old name (kunci_magenta.kunci)


def main():
    ap = argparse.ArgumentParser(description="Kunci latar magenta #FF00FF menjadi transparan." if _id()
                                 else "Key a magenta #FF00FF background to transparent.")
    ap.add_argument("input"); ap.add_argument("output"); ap.add_argument("--preview")
    a = ap.parse_args()
    if os.path.isdir(a.input):
        files = [f for f in sorted(os.listdir(a.input)) if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
        for f in files:
            name = os.path.splitext(f)[0]
            size = key(os.path.join(a.input, f), os.path.join(a.output, name + ".png"), os.path.join(a.output, "_preview", name + ".jpg"))
            print(f, size)
    else:
        print(a.input, key(a.input, a.output, a.preview))


if __name__ == "__main__":
    sys.exit(main())
