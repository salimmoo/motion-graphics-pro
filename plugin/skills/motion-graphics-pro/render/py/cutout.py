"""cutout - Python part of `mgp cutout` and the magenta key of `mgp image` (mgp, Motion Graphics Pro).
Old module name: potong_latar.py (thin shim kept).

Modes:
  image   <input> <output.png> [--model u2net]               remove the background of one image with rembg (old: gambar)
  folder  <input_dir> <output_dir> [--model] [--plate dir]   every PNG in the folder (video frames)
  magenta <input> <output> [--clean [--components 0.02] [--threshold 128]] [--no-despill] [--despill-radius N]
                                                             key a magenta #FF00FF background (numpy + Pillow); --clean = remove magenta leftovers;
                                                             despill (on by default): magenta tint taken out along the alpha edge
  white   <input> <output> [--tolerance 22]                  key a plain white sheet background (kit sheets of paper/felt pieces on white):
                                                             only near-white pixels CONNECTED to the image border become transparent,
                                                             so cream or white areas inside a piece stay opaque (numpy + Pillow)
  despill <input> <output> [--key-color magenta|green|blue|#rrggbb] [--despill-radius N] [--everywhere]
                                                             despill an RGBA cutout (file or folder of PNGs)

rembg (MIT) uses the U2-Net model; the model is downloaded once to ~/.u2net on first use.
Output is always RGBA PNG. --plate writes the background layer (inverted alpha) for text between layers.
"""
import argparse
import os
import sys
import time

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_py import T, rename_kwargs  # noqa: E402


def log(s):
    sys.stderr.write(s + "\n")
    sys.stderr.flush()


# ------------------------------------------------------------------ magenta key
# Same logic as scripts/magenta_key.py (references image guide, section 17.4): magenta amount = min(R,B) - G.
def magenta_key(img):
    im = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    m = np.minimum(r, b) - g
    sat = np.maximum(r, b) - np.minimum(r, b)
    a = np.clip(1 - (m - 40) / 70, 0, 1)
    a = np.where(sat > 90, 1, a)
    a = np.where((g < .3 * np.minimum(r, b)) & (np.minimum(r, b) > 45), 0, a)
    spill = np.clip(m - 10, 0, None) * ((a < 1) | (m > 25)) * np.where(a < 1, 1, .5)
    r2, b2 = r - spill * .8, b - spill * .8
    al = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7))
    out = Image.fromarray(np.dstack([np.clip(r2, 0, 255), g, np.clip(b2, 0, 255)]).astype(np.uint8)).convert("RGBA")
    out.putalpha(al)
    return out


# ------------------------------------------------------------------ white sheet key (Sulam Kertas / paper kit sheets on white)
# A plain colour key also eats cream paper and white thread inside the pieces. Here the background is only the near-white
# region that touches the image border (geodesic flood from the edge), and the holes inside a piece are kept.
def white_key(img, tol=22):
    im = np.asarray(img.convert("RGB")).astype(np.int16)
    near = ((255 - im.min(axis=2)) <= tol) & ((im.max(axis=2) - im.min(axis=2)) <= 18)
    try:
        from scipy import ndimage
        lab, _ = ndimage.label(near)
        edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        bg = np.isin(lab, edge[edge > 0])
    except ImportError:   # fallback: grow the background from the border inside the near-white mask
        bg = np.zeros_like(near); bg[0], bg[-1], bg[:, 0], bg[:, -1] = near[0], near[-1], near[:, 0], near[:, -1]
        while True:
            g = Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
            nb = (np.asarray(g) > 0) & near
            if (nb == bg).all():
                break
            bg = nb
    a = Image.fromarray(((~bg) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7))
    out = img.convert("RGBA"); out.putalpha(a)
    return out


# ------------------------------------------------------------------ magenta leftover cleaner (mgp image --cutout / slice)
# After the magenta key, characters from image models often still carry semi-transparent magenta specks
# (seen in the paper-style anime character test). Cleaner: (1) alpha < threshold -> 0, the rest 255; (2) pixels that are still
# magenta (min(R,B) - G > 40 and R > 120) -> transparent; (3) drop connected components < components x the largest one
# (0 = skip, used for kit sheets with many small parts); (4) light alpha blur so edges are not jagged.

def _runs(mask):
    """Horizontal runs per row: list of (y, x0, x1) with x1 exclusive."""
    out = []
    pad = np.zeros((mask.shape[0], mask.shape[1] + 2), bool)
    pad[:, 1:-1] = mask
    d = np.diff(pad.astype(np.int8), axis=1)
    for y in range(mask.shape[0]):
        st = np.nonzero(d[y] == 1)[0]
        en = np.nonzero(d[y] == -1)[0]
        out.extend((y, int(a), int(b)) for a, b in zip(st, en))
    return out


def filter_components(mask, frac):
    """Keep components (8-neighbour) whose area >= frac x the largest component. scipy when available, otherwise
    union-find over row runs (numpy + Python, fast because there are far fewer runs than pixels)."""
    if frac <= 0 or not mask.any():
        return mask
    try:
        from scipy import ndimage
        lab, n = ndimage.label(mask, structure=np.ones((3, 3), int))
        if n <= 1:
            return mask
        uk = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        keep = [i + 1 for i in range(n) if uk[i] >= frac * uk.max()]
        return np.isin(lab, keep)
    except ImportError:
        pass
    runs = _runs(mask)
    parent = list(range(len(runs)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    per_row = {}
    for i, (y, a, b) in enumerate(runs):
        per_row.setdefault(y, []).append(i)
    for i, (y, a, b) in enumerate(runs):
        for j in per_row.get(y - 1, []):
            _, a2, b2 = runs[j]
            if a2 <= b and b2 >= a:  # 8-neighbour: diagonal contact counts too
                ri, rj = root(i), root(j)
                if ri != rj:
                    parent[ri] = rj
    area = {}
    for i, (y, a, b) in enumerate(runs):
        r = root(i)
        area[r] = area.get(r, 0) + (b - a)
    if len(area) <= 1:
        return mask
    limit = frac * max(area.values())
    out = np.zeros_like(mask)
    for i, (y, a, b) in enumerate(runs):
        if area[root(i)] >= limit:
            out[y, a:b] = True
    return out


def _box(x, r):
    """Sum over a (2r+1)^2 window per pixel (integral image), x float32 HxW."""
    p = np.pad(x, ((r + 1, r), (r + 1, r)), mode="constant").cumsum(0).cumsum(1)
    k = 2 * r + 1
    return p[k:, k:] - p[:-k, k:] - p[k:, :-k] + p[:-k, :-k]


def _fill_color(rgb, keep, r=3):
    """Dropped pixels get the mean colour of the kept neighbours, so the alpha blur at the edge
    does not bring the old magenta back (pink fringe)."""
    k = keep.astype(np.float32)
    n = _box(k, r)
    out = rgb.astype(np.float32).copy()
    fill = (~keep) & (n > 0)
    for c in range(3):
        s = _box(rgb[..., c].astype(np.float32) * k, r)
        out[..., c] = np.where(fill, s / np.maximum(n, 1e-6), out[..., c])
    return np.clip(out, 0, 255).astype(np.int32)


@rename_kwargs({"ambang": "threshold", "komponen": "components", "ambang_magenta": "magenta_threshold"})
def clean(img, threshold=128, components=0.02, blur=0.6, magenta_threshold=40):
    """RGBA cleaned of magenta leftovers. Returns (RGBA Image, info)."""
    a = np.asarray(img.convert("RGBA")).astype(np.int32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mag = (np.minimum(r, b) - g > magenta_threshold) & (r > 120) & (al > 0)
    visible0 = int((al > 0).sum())
    keep = (al >= threshold) & ~mag
    n_mag = int((mag & (al >= threshold)).sum())
    keep2 = filter_components(keep, components)
    info = {"magentaPixels": n_mag, "smallComponentPixels": int((keep & ~keep2).sum()),
            "semiTransparentPixels": int(((al > 0) & (al < threshold) & ~mag).sum()), "visiblePixelsBefore": visible0}
    out = a.copy()
    out[..., :3] = _fill_color(a[..., :3], keep2)
    out[..., 3] = np.where(keep2, 255, 0)
    im = Image.fromarray(out.astype(np.uint8), "RGBA")
    if blur > 0:
        im.putalpha(im.getchannel("A").filter(ImageFilter.GaussianBlur(blur)))
    return im, info


# ------------------------------------------------------------------ colour despill (mgp image --cutout / slice, mgp cutout --key)
# A keyed subject keeps a tint of the key colour where the background bounced or blended into it, mostly near the
# outline (P2_iklan_105: cup "magenta tint 3.76 %"). Despill = take the key-colour excess out of the channels the key
# colour is made of: magenta min(R,B) - G, green G - max(R,B), blue B - max(R,G); any #rrggbb the same way through its
# dominant channels. Only in a band along the alpha edge (interior colours stay), with the lost brightness put back.

KEY_COLORS = {"magenta": (255, 0, 255), "green": (0, 255, 0), "blue": (0, 0, 255), "hijau": (0, 255, 0), "biru": (0, 0, 255)}


def parse_key_color(key):
    """"magenta" | "green" | "blue" | "#rrggbb" | (r, g, b) -> (r, g, b)."""
    if isinstance(key, (tuple, list)):
        return tuple(int(v) for v in key[:3])
    s = str(key or "magenta").strip().lower()
    if s in KEY_COLORS:
        return KEY_COLORS[s]
    s = s.lstrip("#")
    if len(s) == 6 and all(c in "0123456789abcdef" for c in s):
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    raise ValueError(T("despill: key colour must be magenta, green, blue or #rrggbb, not {}", key))


def _spill_channels(key):
    """(dominant channels, other channels) of a key colour; None when it has no clear hue (grey/white/black)."""
    k = parse_key_color(key)
    hi = [c for c in range(3) if k[c] >= 160]
    lo = [c for c in range(3) if k[c] <= 96]
    if not hi or not lo or len(hi) + len(lo) != 3:
        return None
    return hi, lo


def spill_amount(rgb, key="magenta"):
    """Key-colour excess per pixel (float32 HxW, >= 0): min(dominant) - max(other)."""
    ch = _spill_channels(key)
    x = rgb.astype(np.float32)
    if ch is None:
        return np.zeros(x.shape[:2], np.float32)
    hi, lo = ch
    return np.clip(np.min(x[..., hi], axis=-1) - np.max(x[..., lo], axis=-1), 0, None)


def edge_band(alpha, radius):
    """Weight 0..1 per pixel: 1 within `radius` px of a (semi-)transparent pixel, 0.5 up to 2 x radius, 0 inside."""
    see = (alpha < 250).astype(np.float32)
    near = _box(see, radius) > 0
    far = _box(see, 2 * radius) > 0
    return np.where(near, 1.0, np.where(far, 0.5, 0.0)).astype(np.float32)


def tint_percent(rgba, key="magenta", threshold=15):
    """Share (%) of the visible pixels that still lean to the key colour by more than `threshold`."""
    a = np.asarray(rgba)
    vis = a[..., 3] > 127
    n = int(vis.sum())
    if not n:
        return 0.0
    return round(100.0 * int((vis & (spill_amount(a[..., :3], key) > threshold)).sum()) / n, 2)


@rename_kwargs({"kunci": "key", "jari": "radius", "kekuatan": "strength"})
def despill(img, key="magenta", radius=None, strength=1.0, everywhere=False):
    """RGBA with the key-colour spill removed along the alpha edge. radius default: 1.5 % of the short side (>= 3 px; 15 px at 1024).
    everywhere=True: the whole subject (for footage lit by a green screen). Returns (RGBA Image, info)."""
    a = np.asarray(img.convert("RGBA")).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    ch = _spill_channels(key)
    info = {"key": "#%02x%02x%02x" % parse_key_color(key), "radius": 0, "pixels": 0,
            "tintBefore": tint_percent(a.astype(np.uint8), key), "tintAfter": None}
    if ch is None:
        info["tintAfter"] = info["tintBefore"]
        return img.convert("RGBA"), info
    hi, _lo = ch
    r = int(radius) if radius else max(3, int(round(0.015 * min(al.shape))))
    w = np.ones_like(al) if everywhere else edge_band(al, r)
    s = spill_amount(rgb, key) * w * float(strength) * (al > 0)
    out = rgb.copy()
    for c in hi:
        out[..., c] -= s
    # brightness back (Rec.709 luma of what was taken), spread over all three channels: no dark rim
    luma = np.array([0.2126, 0.7152, 0.0722], np.float32)
    out += (s * float(sum(luma[c] for c in hi)))[..., None]
    a[..., :3] = np.clip(out, 0, 255)
    res = Image.fromarray(np.round(a).astype(np.uint8), "RGBA")
    info.update(radius=r, pixels=int((s > 0.5).sum()), tintAfter=tint_percent(np.asarray(res), key))
    return res, info


# ------------------------------------------------------------------ rembg
_session = None


def session(model):
    global _session
    if _session is None:
        from rembg import new_session
        _session = new_session(model)
    return _session


def cutout(img, model, matting=False):
    from rembg import remove
    kw = {}
    if matting:
        kw = dict(alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=10, alpha_matting_erode_size=8)
    return remove(img.convert("RGB"), session=session(model), **kw).convert("RGBA")


def plate_from(rgba, src):
    a = np.asarray(rgba)[..., 3]
    out = src.convert("RGBA")
    out.putalpha(Image.fromarray(255 - a))
    return out


def list_png(d):
    return [f for f in sorted(os.listdir(d)) if f.lower().endswith(".png")]


# old names (potong_latar.py), kept as aliases
kunci_magenta = magenta_key
saring_komponen = filter_components
_kotak = _box
_isi_warna = _fill_color
bersihkan = clean
sesi = session
potong = cutout
plate_dari = plate_from
daftar_png = list_png

MODES = {"image": "image", "folder": "folder", "magenta": "magenta", "white": "white", "putih": "white", "despill": "despill", "gambar": "image"}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=T(__doc__), formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=list(MODES), metavar="{image,folder,magenta,white,despill}")
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--model", default="u2net")
    ap.add_argument("--plate")
    ap.add_argument("--matting", action="store_true")
    ap.add_argument("--clean", "--bersih", dest="clean", action="store_true", help=T("magenta: remove magenta leftovers (mgp image --cutout)"))
    ap.add_argument("--components", "--komponen", dest="components", type=float, default=0.02,
                    help=T("--clean: drop components < frac x the largest (0 = keep all, for kit sheets)"))
    ap.add_argument("--threshold", "--ambang", dest="threshold", type=int, default=128, help=T("--clean: alpha < threshold becomes transparent"))
    ap.add_argument("--no-despill", dest="no_despill", action="store_true", help=T("magenta: keep the key-colour tint along the edge (no despill)"))
    ap.add_argument("--despill-radius", dest="despill_radius", type=int, default=0, help=T("despill band width in px (default 1.5 % of the short side)"))
    ap.add_argument("--key-color", dest="key_color", default="magenta", help=T("despill: key colour magenta | green | blue | #rrggbb"))
    ap.add_argument("--tolerance", type=int, default=22, help=T("white: how far from pure white still counts as background (0-255)"))
    ap.add_argument("--everywhere", action="store_true", help=T("despill: the whole subject, not only the edge band"))
    a = ap.parse_args()
    mode = MODES[a.mode]

    def spill(im):
        im, info = despill(im, a.key_color, radius=a.despill_radius or None, everywhere=a.everywhere)
        log("  " + T("despill {}: {} px along the edge (band {} px), tint {}% -> {}%", info["key"], info["pixels"], info["radius"],
                     info["tintBefore"], info["tintAfter"]))
        return im

    if mode == "despill":
        def one_d(src, dst):
            spill(Image.open(src)).save(dst)
        if os.path.isdir(a.input):
            os.makedirs(a.output, exist_ok=True)
            for f in list_png(a.input):
                one_d(os.path.join(a.input, f), os.path.join(a.output, f))
        else:
            one_d(a.input, a.output)
        print("ok")
        return 0

    if mode == "white":
        def one_w(src, dst):
            white_key(Image.open(src), a.tolerance).save(dst)
        if os.path.isdir(a.input):
            os.makedirs(a.output, exist_ok=True)
            for f in list_png(a.input):
                one_w(os.path.join(a.input, f), os.path.join(a.output, f))
        else:
            one_w(a.input, a.output)
        print("ok")
        return 0

    if mode == "magenta":
        def one(src, dst):
            im = magenta_key(Image.open(src))
            if a.clean:
                im, info = clean(im, threshold=a.threshold, components=a.components)
                log("  " + T("clean: {} magenta px, {} loose speck px, {} semi-transparent px removed",
                             info["magentaPixels"], info["smallComponentPixels"], info["semiTransparentPixels"]))
            if not a.no_despill:
                im = spill(im)
            im.save(dst)
        if os.path.isdir(a.input):
            os.makedirs(a.output, exist_ok=True)
            fs = list_png(a.input)
            for i, f in enumerate(fs):
                one(os.path.join(a.input, f), os.path.join(a.output, f))
                if i % 24 == 0:
                    log(f"  magenta {i + 1}/{len(fs)}")
        else:
            one(a.input, a.output)
        print("ok")
        return 0

    if mode == "image":
        src = Image.open(a.input)
        t0 = time.time()
        out = cutout(src, a.model, a.matting)
        out.save(a.output)
        if a.plate:
            plate_from(out, src).save(a.plate)
        log("  " + T("{}: {}x{} in {} s", a.model, src.size[0], src.size[1], f"{time.time() - t0:.1f}"))
        print("ok")
        return 0

    os.makedirs(a.output, exist_ok=True)
    if a.plate:
        os.makedirs(a.plate, exist_ok=True)
    fs = list_png(a.input)
    t0 = time.time()
    for i, f in enumerate(fs):
        src = Image.open(os.path.join(a.input, f))
        out = cutout(src, a.model, a.matting)
        out.save(os.path.join(a.output, f))
        if a.plate:
            plate_from(out, src).save(os.path.join(a.plate, f))
        if i == 0 or (i + 1) % 12 == 0 or i == len(fs) - 1:
            el = time.time() - t0
            log("  " + T("frame {}/{}  ({} frame/s)", i + 1, len(fs), f"{(i + 1) / max(el, 1e-6):.2f}"))
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
