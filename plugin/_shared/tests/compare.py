"""compare - pixel difference of two PNGs (RGBA): max, mean, percentiles, fraction of pixels differing > 8 / > 32;
writes a difference image (left A, middle B, right |A - B| x 4). Old name: _bersama/uji/banding.py.

Usage: python -I -X utf8 compare.py a.png b.png [diff.png]
"""
import os
import sys

import numpy as np
from PIL import Image


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


def compare(pa, pb, out=None):
    a = np.asarray(Image.open(pa).convert("RGBA")).astype(np.int16)
    b = np.asarray(Image.open(pb).convert("RGBA")).astype(np.int16)
    if a.shape != b.shape:
        return dict(size=(a.shape, b.shape), same_size=False)
    d = np.abs(a - b).max(axis=2)
    r = dict(same_size=True, size=a.shape[:2], max=int(d.max()), mean=float(np.abs(a - b).mean()),
             p99=float(np.percentile(d, 99)), p999=float(np.percentile(d, 99.9)),
             diff8=float((d > 8).mean() * 100), diff32=float((d > 32).mean() * 100))
    if out:
        k = np.clip(d * 4, 0, 255).astype(np.uint8)
        vis = np.concatenate([a[..., :3].astype(np.uint8), b[..., :3].astype(np.uint8),
                              np.repeat(k[..., None], 3, axis=2)], axis=1)
        Image.fromarray(vis).save(out)
    return r


def text(r):
    if not r.get("same_size"):
        return _T("SIZE DIFFERS %s", "UKURAN BEDA %s") % (r["size"],)
    return _T("max %3d  mean %.3f  p99 %5.1f  p99.9 %5.1f  pixels>8 %.3f %%  >32 %.3f %%",
              "maks %3d  rata %.3f  p99 %5.1f  p99.9 %5.1f  piksel>8 %.3f %%  >32 %.3f %%") % (
        r["max"], r["mean"], r["p99"], r["p999"], r["diff8"], r["diff32"])


# old names (banding.py)
banding = compare
teks = text

if __name__ == "__main__":
    print(text(compare(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)))
