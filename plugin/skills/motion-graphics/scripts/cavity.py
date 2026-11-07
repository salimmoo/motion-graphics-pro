# AUTO-GENERATED COPY of _shared/cavity.py (run _shared/sync.py after editing the source). Do not edit here.
"""cavity - gapcheck: find enclosed background cavities (holes, joint gaps, loose pieces) in a figure.
Used by the vector-character and motion-graphics skills; one source (_shared/cavity.py), copies made by sync.py.
Old name: cavity.py (still works).

The figure is rendered on pure green (0x00FF00). Background pixel components that do NOT touch the canvas edge =
enclosed cavities. Legitimate cavities (gap between the legs, bag-strap triangle, arm-body gap) are listed and
explained; any other small cavity = defect (background showing through a line, 1-20 px holes). Loose pieces = figure
components separated from the main figure.

The draw function lives in the project module (cv = brush.Canvas; on the skia engine the original skia methods also
work):
  still : fn(cv, ox, oy, hp)                (one pose)
  frame : fn(cv, ox, oy, hp, p)             (animation; p = phase 0..1, or any function that takes p)

Usage (from the project folder; the module is imported from the working folder):
  python -I cavity.py still module:function out_prefix [--canvas W H] [--origin OX OY] [--hp HP] [--min PX]
      -> list of cavities (area px, box in H), out_prefix_holes.png (red boxes), out_prefix_sil15.png (15% silhouette)
  python -I cavity.py frames module:function n [--min PX] [--max PX] [--canvas ...] [--origin ...] [--hp ...]
      -> per frame: cavities with area min..max px (default 7..400), summary of problem frames
Default canvas 1400 x 2300, origin (700, 180), hp 330 (figure about 6 H tall).
"""
import argparse
import importlib
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import image_ops as ac  # noqa: E402
import brush  # noqa: E402


_DOC_ID = """cavity - gapcheck: cari rongga latar terkurung (lubang, celah sambungan, potongan lepas) di figur.
Dipakai skill vector-character dan motion-graphics; satu sumber (_shared/cavity.py), salinan dibuat sync.py.
Nama lama: rongga.py (tetap jalan).

Figur dirender di atas latar hijau murni (0x00FF00). Komponen piksel latar yang TIDAK menyentuh tepi kanvas = rongga
terkurung. Rongga sah (sela kaki, segitiga tali tas, celah lengan-badan) didaftar dan dijelaskan; rongga kecil lain
= cacat (garis latar tembus, lubang 1-20 px). Potongan lepas = komponen figur yang terpisah dari figur utama.

Fungsi gambar ditulis di modul proyek (cv = brush.Canvas; di mesin skia method skia asli juga tersedia):
  still : fn(cv, ox, oy, hp)                (satu pose)
  frame : fn(cv, ox, oy, hp, p)             (animasi; p = fase 0..1, atau fungsi lain yang menerima p)

Pakai (dari folder proyek; modul diimpor dari folder kerja):
  python -I cavity.py still modul:fungsi out_prefix [--canvas W H] [--origin OX OY] [--hp HP] [--min PX]
      -> daftar rongga (luas px, kotak dalam H), out_prefix_holes.png (kotak merah), out_prefix_sil15.png (siluet 15%)
  python -I cavity.py frames modul:fungsi n [--min PX] [--max PX] [--canvas ...] [--origin ...] [--hp ...]
      -> per frame: rongga dengan luas min..max px (default 7..400), ringkasan frame bermasalah
Default kanvas 1400 x 2300, origin (700, 180), hp 330 (tokoh setinggi sekitar 6 H).
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


KEY = np.array([0, 255, 0])


def render(fn, W, H, ox, oy, hp, p=None):
    s = brush.Surface(W, H)
    cv = s.canvas
    cv.clear(0x00FF00)
    if p is None:
        fn(cv, ox, oy, hp)
    else:
        fn(cv, ox, oy, hp, p)
    return s.array()[:, :, :3].astype(int)


def holes(a, ox, oy, hp, tol=6):
    """Rongga terkurung: list (luas px, x0, y0, x1, y1 dalam H), terbesar dulu."""
    H, W = a.shape[:2]
    bg = (np.abs(a - KEY).sum(axis=2) <= tol).astype(np.uint8)
    n, lab, st, _ = ac.connected_components(bg, 4)
    out = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if x == 0 or y == 0 or x + w >= W or y + h >= H:
            continue
        out.append((int(area), float((x - ox) / hp), float((y - oy) / hp), float((x + w - ox) / hp),
                    float((y + h - oy) / hp)))
    return sorted(out, reverse=True), bg


def pieces(bg, min_px=1):
    """Potongan figur lepas: komponen non-latar (8-konek). Kembalikan luas per komponen, terbesar dulu."""
    fg = (bg == 0).astype(np.uint8)
    n, lab, st, _ = ac.connected_components(fg, 8)
    return sorted((int(st[i][4]) for i in range(1, n) if st[i][4] >= min_px), reverse=True)


def load(spec):
    sys.path.insert(0, ".")
    mod, fn = spec.split(":")
    return getattr(importlib.import_module(mod), fn)


def main():
    ap = argparse.ArgumentParser(description=_T(__doc__, _DOC_ID), formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["still", "frames"])
    ap.add_argument("fn")
    ap.add_argument("arg")
    ap.add_argument("--canvas", nargs=2, type=int, default=(1400, 2300))
    ap.add_argument("--origin", nargs=2, type=float, default=(700.0, 180.0))
    ap.add_argument("--hp", type=float, default=330.0)
    ap.add_argument("--min", type=int, default=7)
    ap.add_argument("--max", type=int, default=400)
    a = ap.parse_args()
    fn = load(a.fn)
    W, H = a.canvas
    ox, oy = a.origin
    if a.mode == "still":
        img = render(fn, W, H, ox, oy, a.hp)
        hl, bg = holes(img, ox, oy, a.hp)
        hl = [h for h in hl if h[0] >= a.min]
        print(_T("enclosed cavities >= %d px: %d", "rongga terkurung >= %d px: %d") % (a.min, len(hl)))
        for h in hl:
            print(_T("  area %6d px  box H x %.3f..%.3f  y %.3f..%.3f",
                     "  luas %6d px  kotak H x %.3f..%.3f  y %.3f..%.3f") % (h[0], h[1], h[3], h[2], h[4]))
        pc = pieces(bg, 4)
        print(_T("figure pieces: %d (areas %s)", "potongan figur: %d (luas %s)") % (len(pc), pc[:6]))
        sil = (bg == 0).astype(np.uint8) * 255
        small = ac.resize(255 - sil, (int(W * 0.15), int(H * 0.15)), interpolation=ac.AREA)
        ac.write(a.arg + "_sil15.png", small)
        vis = ac.cvt_color(img.astype(np.uint8), ac.RGB2BGR)
        for h in hl:
            x0, y0 = int(h[1] * a.hp + ox), int(h[2] * a.hp + oy)
            x1, y1 = int(h[3] * a.hp + ox), int(h[4] * a.hp + oy)
            ac.rectangle(vis, (x0 - 6, y0 - 6), (x1 + 6, y1 + 6), (0, 0, 255), 2)
        ac.write(a.arg + "_holes.png", vis)
    else:
        n = int(a.arg)
        bad = 0
        for i in range(n):
            img = render(fn, W, H, ox, oy, a.hp, i / n)
            hl, bg = holes(img, ox, oy, a.hp)
            small = [(h[0], round(h[1], 2), round(h[2], 2)) for h in hl if a.min <= h[0] < a.max]
            npc = len(pieces(bg, 4))
            if small or npc > 1:
                bad += 1
                print(_T("frame %3d p %.3f cavities %d..%d px: %s  pieces: %d",
                         "frame %3d p %.3f rongga %d..%d px: %s  potongan: %d") % (i, i / n, a.min, a.max, small[:6],
                                                                                    npc))
        print(_T("problem frames: %d of %d", "frame bermasalah: %d dari %d") % (bad, n))


if __name__ == "__main__":
    main()
