"""svgref - render and measure reference drawings (SVG/PNG) so they are measured, not copied.

Rendered through brush.draw_svg: skia.SVGDOM when skia-python is installed, otherwise the numpy SVG interpreter (path,
rect, circle, ellipse, line, polyline, polygon, g, use, transform, fill/stroke/opacity; gradients become flat colour).
SVGDOM pitfalls found so far (fail silently, result None / empty) are handled for both engines:
- CSS classes (<style>.st0{fill:..}</style>) must be inlined into style attributes.
- Percent colours rgb(77.9%, 64.0%, 66.2%) must be converted to hex.

Usage:
  python3 -I svgref.py render in.svg out.png [width_px]
  python3 -I svgref.py palette img.png x0 y0 x1 y1
      -> the 14 most frequent colours in the area (quantised by 6), to pick skin/background colours
  python3 -I svgref.py profile img.png x0 y0 x1 y1 BG SKIN [SKIN2 ...]
      -> per row: silhouette segments and skin segments (px). Divide by H_ref (top of the hair to the chin, px)
         for landmarks in H: shoulders, neck, crotch, thigh width, wrist, sole.
Hex colours without '#'. Colour tolerance 18 per channel (background 10).
"""
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brush  # noqa: E402


_DOC_ID = """svgref - render dan ukur gambar referensi (SVG/PNG) untuk diukur, bukan disalin.

Render lewat brush.draw_svg: skia.SVGDOM bila skia-python terpasang, selain itu penerjemah SVG numpy (path, rect,
circle, ellipse, line, polyline, polygon, g, use, transform, fill/stroke/opacity; gradien jadi warna rata).
Jebakan SVGDOM yang sudah ditemukan (gagal diam-diam, hasil None / kosong) tetap ditangani untuk kedua mesin:
- CSS class (<style>.st0{fill:..}</style>) harus di-inline menjadi atribut style.
- Warna persen rgb(77.9%, 64.0%, 66.2%) harus diubah ke hex.

Pakai:
  python3 -I svgref.py render in.svg out.png [lebar_px]
  python3 -I svgref.py palette img.png x0 y0 x1 y1
      -> 14 warna terbanyak di area (kuantisasi 6), untuk memilih warna kulit/latar
  python3 -I svgref.py profile img.png x0 y0 x1 y1 BG SKIN [SKIN2 ...]
      -> per baris: segmen siluet dan segmen kulit (px). Bagi dengan H_ref (puncak rambut ke dagu, px)
         untuk landmark dalam H: bahu, leher, selangkangan, lebar paha, pergelangan, sol.
Warna hex tanpa '#'. Toleransi warna 18 per kanal (latar 10).
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


TOL = 18


def inline_css(src):
    m = re.search(r"<style[^>]*>(.*?)</style>", src, re.S)
    if not m:
        return src
    rules = dict(re.findall(r"\.([\w-]+)\s*\{([^}]*)\}", m.group(1)))
    src = src[:m.start()] + src[m.end():]

    def rep(mm):
        style = ";".join(rules.get(c, "").strip().rstrip(";") for c in mm.group(1).split())
        return f'style="{style}"'
    return re.sub(r'class="([^"]+)"', rep, src)


def pct_rgb(src):
    def rep(m):
        v = [round(float(x) * 2.55) for x in m.groups()]
        return "#%02x%02x%02x" % tuple(max(0, min(255, c)) for c in v)
    return re.sub(r"rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)", rep, src)


def render(path, out, width=1600):
    src = pct_rgb(inline_css(open(path, encoding="utf-8").read()))
    vb = re.search(r'viewBox="([\d.\s,-]+)"', src)
    if vb:
        w, h = map(float, vb.group(1).replace(",", " ").split()[2:4])
    else:
        w = float(re.search(r'width="([\d.]+)', src).group(1))
        h = float(re.search(r'height="([\d.]+)', src).group(1))
    s = width / w
    surf = brush.Surface(int(width), int(h * s))
    cv = surf.canvas
    cv.clear(0xFFFFFF)
    cv.scale(s, s)
    try:
        brush.draw_svg(cv, src, w, h)
    except (ValueError, SyntaxError) as e:
        raise SystemExit(_T("could not read the SVG (%s; check for unsupported CSS/colours)",
                             "SVG gagal dibaca (%s; cek CSS/warna yang belum didukung)") % e)
    surf.save(out)
    return int(width), int(h * s)


def load(p):
    return brush.Image.open(p).array()[:, :, :3].astype(int)


def hexc(h):
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)])


def near(a, c, tol=TOL):
    return (np.abs(a - c) <= tol).all(axis=2)


def palette(a):
    q = (a // 6) * 6
    cols, cnt = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    for i in np.argsort(-cnt)[:14]:
        print("%02x%02x%02x" % tuple(cols[i]), cnt[i])


def segments(row):
    idx = np.flatnonzero(row)
    if idx.size == 0:
        return []
    cuts = np.flatnonzero(np.diff(idx) > 1)
    return list(zip(np.r_[idx[0], idx[cuts + 1]], np.r_[idx[cuts], idx[-1]]))


def profile(a, bg, skins):
    sil = ~near(a, hexc(bg), 10)
    skin = np.zeros(sil.shape, bool)
    for s in skins:
        skin |= near(a, hexc(s))
    rows = np.flatnonzero(sil.any(axis=1))
    top, bot = rows[0], rows[-1]
    print(_T("silhouette rows", "baris siluet"), top, bot, _T("height", "tinggi"), bot - top, "px")
    step = max(1, (bot - top) // 90)
    for y in range(top, bot + 1, step):
        print(y, _T("silhouette", "siluet"), [(int(s), int(e)) for s, e in segments(sil[y])],
              _T("skin", "kulit"), [(int(s), int(e)) for s, e in segments(skin[y])])


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(_T(__doc__, _DOC_ID))
        sys.exit(0)
    mode = sys.argv[1]
    if mode == "render":
        print(render(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 1600))
    else:
        x0, y0, x1, y1 = map(int, sys.argv[3:7])
        a = load(sys.argv[2])[y0:y1, x0:x1]
        if mode == "palette":
            palette(a)
        else:
            profile(a, sys.argv[7], sys.argv[8:])
