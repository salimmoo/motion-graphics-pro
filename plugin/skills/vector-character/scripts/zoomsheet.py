"""zoomsheet - labelled zoom sheet of risky spots (self-check before sending, regression sheet).

Boxes are given in H units of the source image (x0,y0,x1,y1) with the mapping px = OX + x * HP, py = OY + y * HP.
The default --origin 0 0 --hp 1 means boxes are in pixels.

Usage:
  python3 zoomsheet.py out.png MAX_WIDTH "img.png|x0,y0,x1,y1|label|zoom" ... [--origin OX OY] [--hp HP]
Boxes are laid out left to right and wrap to a new row past MAX_WIDTH. Each item may come from a different image
(e.g. old vs new delivery side by side for regression).
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brush  # noqa: E402


_DOC_ID = """zoomsheet - lembar zoom titik rawan berlabel (cek mandiri sebelum kirim, lembar regresi).

Kotak ditulis dalam satuan H gambar sumber (x0,y0,x1,y1) dengan pemetaan px = OX + x * HP, py = OY + y * HP.
Default --origin 0 0 --hp 1 berarti kotak dalam piksel.

Pakai:
  python3 zoomsheet.py out.png LEBAR_MAKS "img.png|x0,y0,x1,y1|label|zoom" ... [--origin OX OY] [--hp HP]
Kotak disusun kiri ke kanan, pindah baris bila melewati LEBAR_MAKS. Tiap item boleh dari gambar berbeda
(contoh: kiriman lama vs baru berdampingan untuk regresi).
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


PAD, LAB = 28, 46


def main():
    ap = argparse.ArgumentParser(description=_T(__doc__, _DOC_ID), formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("maxw", type=int)
    ap.add_argument("items", nargs="+")
    ap.add_argument("--origin", nargs=2, type=float, default=(0.0, 0.0))
    ap.add_argument("--hp", type=float, default=1.0)
    a = ap.parse_args()
    OX, OY = a.origin
    HP = a.hp
    items = []
    for s in a.items:
        src, box, label, k = s.split("|")
        x0, y0, x1, y1 = map(float, box.split(","))
        items.append((src, (OX + x0 * HP, OY + y0 * HP, OX + x1 * HP, OY + y1 * HP), label, float(k)))
    rows, row, w = [], [], PAD
    for it in items:
        b, k = it[1], it[3]
        iw = (b[2] - b[0]) * k
        if row and w + iw + PAD > a.maxw:
            rows.append(row)
            row, w = [], PAD
        row.append(it)
        w += iw + PAD
    rows.append(row)
    H = PAD + sum(max((it[1][3] - it[1][1]) * it[3] for it in r) + LAB + PAD for r in rows)
    s = brush.Surface(a.maxw, int(H))
    c = s.canvas
    c.clear(0xFAFAF8)
    font = brush.Font("Inter", 24)
    ink = brush.Paint(0x141414)
    frame = brush.Paint(0xC8C8C4, style="stroke", width=1)
    cache = {}
    y = PAD
    for r in rows:
        x = PAD
        rh = max((it[1][3] - it[1][1]) * it[3] for it in r)
        for src, b, label, k in r:
            if src not in cache:
                cache[src] = brush.Image.open(src)
            img = cache[src]
            iw, ih = (b[2] - b[0]) * k, (b[3] - b[1]) * k
            c.save()
            c.translate(x, y)
            c.clip_rect(0, 0, iw, ih)
            c.scale(k, k)
            c.draw_image(img, -b[0], -b[1])
            c.restore()
            c.draw_rect(x, y, x + iw, y + ih, frame)
            c.draw_text(label, x, y + ih + 32, font, ink)
            x += iw + PAD
        y += rh + LAB + PAD
    s.save(a.out)


if __name__ == "__main__":
    main()
