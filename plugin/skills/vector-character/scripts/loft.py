"""loft - hybrid multi-angle rig: volume from two accepted drawings (front view + side view).

How it works (vector-character skill ch. 16):
- Render the front-view and side-view paths to masks, take xmin/xmax per row y (extents).
- Per row: from the side -> centre Xc and half depth d; from the front -> centre Lc and half width w.
  Convention: front view screen x = -L (the figure's right on the viewer's left), side view screen x = X (face
  towards +x).
- Superellipse cross-section with dual exponent m. Projected edge at camera angle v (0 front, 90 = the figure's right
  side, 180 back, 270 = left side):  u = (Xc sin v - Lc cos v) +- (|d sin v|^m + |w cos v|^m)^(1/m)
  At v 0 and v 90 the result matches the reference drawings exactly. m 2 = ellipse (head, neck), m 1.25-1.3 = boxy
  (torso, hips; so the 3/4 view is not narrower than the front view).
- Surface features (eyes, mouth, ears, buttons) = 3D points on the front surface of the volume, shown when they face
  the camera.

Contents:
- extents(path, ox, oy, hp, y0, y1, step) : {y: (xmin, xmax)} in H
- rings_from(front, side, ...)            : list (y, Xc, d, Lc, w) from two paths (pixels, same Fig)
- flatten_front(rings, y0, y1)            : flatten the front depth over a y range (e.g. the nose = separate feature)
- outline(rings, v, m, step, rot, piv)    : silhouette (u, y) in H at angle v
- surf_point(rings, y, L)                 : (X, nX, nL) front surface point + normal
- proj(X, L, v), facing(nX, nL, v)        : screen projection and facing score (> 0 = visible)
- proj_widths(side_w, front_w, v)         : projected limb station widths
- hull(points3, v)                        : screen convex hull of 3D points (X, y, L) (shoes, box bag)

Demo proportions = adult canon of 7.5 heads (same as the site figure): head 1/7.5 of the height, crotch at 1/2 of the
height (3.75 H from the top), knee at 1/4 of the height above the floor, shoulders 2 heads (outer deltoid), hips 1.5,
waist 1.1, side chest depth 0.75 x chest width, elbow at the navel, wrist at the crotch, middle fingertip at mid
thigh, foot 1.1. Constants in CANON (unit H = head height; English keys, the old Indonesian keys still work).

Usage: python -I loft.py demo out.png   -> sample volume at 0/22.5/45/67.5/90/135/180 + difference check against the
                                           references (v 0, 90)
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import image_ops as ac  # noqa: E402
import brush  # noqa: E402
import vkit  # noqa: E402
from vkit import Fig  # noqa: E402


_DOC_ID = """loft - rig multi-sudut hibrida: volume dari dua gambar yang sudah diterima (tampak depan + tampak samping).

Cara kerja (skill vector-character bab 16):
- Render path tampak depan dan tampak samping ke masker, ambil xmin/xmax per baris y (extents).
- Per baris: dari samping -> pusat Xc dan setengah kedalaman d; dari depan -> pusat Lc dan setengah lebar w.
  Konvensi: tampak depan layar x = -L (kanan tokoh di kiri pemirsa), tampak samping layar x = X (wajah ke +x).
- Penampang superelips dengan eksponen dual m. Tepi proyeksi di sudut kamera v (0 depan, 90 = sisi kanan tokoh,
  180 belakang, 270 = sisi kiri):  u = (Xc sin v - Lc cos v) +- (|d sin v|^m + |w cos v|^m)^(1/m)
  Di v 0 dan v 90 hasilnya sama persis dengan gambar acuan. m 2 = elips (kepala, leher), m 1.25-1.3 = boxy (badan,
  panggul; supaya tampak 3/4 tidak lebih sempit dari tampak depan).
- Fitur permukaan (mata, mulut, telinga, kancing) = titik 3D di permukaan depan volume, tampil bila menghadap kamera.

Isi:
- extents(path, ox, oy, hp, y0, y1, step) : {y: (xmin, xmax)} dalam H
- rings_from(front, side, ...)            : list (y, Xc, d, Lc, w) dari dua path (piksel, Fig sama)
- flatten_front(rings, y0, y1)            : ratakan kedalaman depan di rentang y (contoh hidung = fitur terpisah)
- outline(rings, v, m, step, rot, piv)    : siluet (u, y) H di sudut v
- surf_point(rings, y, L)                 : (X, nX, nL) titik permukaan depan + normal
- proj(X, L, v), facing(nX, nL, v)        : proyeksi layar dan skor hadap (> 0 = terlihat)
- proj_widths(side_w, front_w, v)         : lebar stasiun tungkai terproyeksi
- hull(points3, v)                        : kulit cembung layar dari titik 3D (X, y, L) (sepatu, tas kotak)

Proporsi demo = kanon dewasa 7,5 kepala (sama dengan figur situs): kepala 1/7,5 tinggi, selangkangan 1/2 tinggi
(3,75 H dari puncak), lutut 1/4 tinggi dari lantai, bahu 2 kepala (luar deltoid), pinggul 1,5, pinggang 1,1,
tebal dada samping 0,75 x lebar dada, siku di pusar, pergelangan di selangkangan, ujung jari tengah paha, kaki 1,1.
Konstanta di CANON (satuan H = tinggi kepala).

Pakai: python -I loft.py demo out.png   -> volume contoh di 0/22.5/45/67.5/90/135/180 + cek beda vs acuan (v 0, 90)
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


# kanon 7,5 kepala (satuan H = kepala, y dari puncak kepala): landmark dan lebar
class _Keys(dict):
    """dict with English keys that still answers the old Indonesian keys (CANON["lutut"] == CANON["knee"])."""
    OLD = dict(tinggi="height", dagu="chin", puting="nipple", pusar="navel", selangkang="crotch", lutut="knee",
               sol="sole", bahu="shoulder", pinggul="hip", pinggang="waist", leher="neck", dada_samping="chest_side",
               kaki="foot", siku="elbow", pergelangan="wrist", ujung_jari="fingertip", lengan_atas="upper_arm",
               lengan_bawah_tangan="forearm_hand")

    def __missing__(self, k):
        if k in self.OLD:
            return self[self.OLD[k]]
        raise KeyError(k)

    def get(self, k, d=None):
        return dict.get(self, self.OLD.get(k, k), d)

    def __contains__(self, k):
        return dict.__contains__(self, self.OLD.get(k, k))


CANON = _Keys(height=7.5, chin=1.0, nipple=2.0, navel=3.0, crotch=3.75, knee=5.625, sole=7.5,
              shoulder=2.0, hip=1.5, waist=1.1, neck=0.5, chest_side=0.75 * 1.35, foot=1.1,
              elbow=3.0, wrist=3.75, fingertip=4.7, upper_arm=1.5, forearm_hand=2.0)


# ---------------- ukur ----------------
def extents(path, ox, oy, hp, y0=-0.3, y1=7.0, step=0.005):
    """Per baris y (H): (xmin, xmax) H dari masker path piksel (path dibuat dengan Fig(cv, ox, oy, hp))."""
    r = path.bounds()
    bx, by = math.floor(r[0]) - 2, math.floor(r[1]) - 2
    w, h = int(math.ceil(r[2]) - bx + 3), int(math.ceil(r[3]) - by + 3)
    s = brush.Surface(max(w, 1), max(h, 1))
    c = s.canvas
    c.clear(0x000000)
    c.translate(-bx, -by)
    c.draw_path(path, brush.Paint(0xFFFFFF))
    a = s.array()[:, :, 0] > 127
    out = {}
    for y in np.arange(y0, y1, step):
        row = int(round(oy + y * hp)) - by
        if 0 <= row < h:
            xs = np.where(a[row])[0]
            if len(xs):
                out[round(float(y), 3)] = ((xs[0] + bx - ox) / hp, (xs[-1] + bx - ox) / hp)
    return out


def rings_from(front, side, ox, oy, hp, y0=-0.3, y1=7.0, step=0.005):
    """Cincin volume per baris dari path tampak depan dan tampak samping (piksel, rangka Fig yang sama,
    tanpa miring kepala/condong). Hanya baris yang ada di kedua tampak."""
    ef = extents(front, ox, oy, hp, y0, y1, step)
    es = extents(side, ox, oy, hp, y0, y1, step)
    rr = []
    for y in sorted(set(ef) & set(es)):
        (fx0, fx1), (sx0, sx1) = ef[y], es[y]
        rr.append((y, (sx0 + sx1) / 2, (sx1 - sx0) / 2, -(fx0 + fx1) / 2, (fx1 - fx0) / 2))
    return rr


def flatten_front(rings, y0, y1, inset=0.005):
    """Kedalaman depan diganti garis lurus antara baris y0 dan y1 (punggung tetap). Contoh: hidung tidak ikut volume
    wajah (kalau ikut, tampak 3/4 jadi moncong lebar); hidung digambar sebagai fitur terpisah."""
    ys = [r[0] for r in rings]

    def front_at(y):
        i = min(range(len(ys)), key=lambda j: abs(ys[j] - y))
        return rings[i][1] + rings[i][2]
    a, b = front_at(y0), front_at(y1)
    out = []
    for (y, xc, d, lc, w) in rings:
        if y0 < y < y1:
            back = xc - d
            fx = min(a + (b - a) * (y - y0) / (y1 - y0) - inset, xc + d)
            xc, d = (fx + back) / 2, (fx - back) / 2
        out.append((y, xc, d, lc, w))
    return out


# ---------------- proyeksi ----------------
def outline(rings, v, m=2.0, step=4, rot=0.0, piv=(0.0, 0.0), dx=0.0, dy=0.0):
    """Siluet volume di sudut v (derajat) sebagai list titik (u, y) H, searah jarum jam.
    step = ambil tiap n baris (lalu dihaluskan spline). rot/piv = putar layar (contoh condong x sin v)."""
    sv, cv = math.sin(math.radians(v)), math.cos(math.radians(v))
    rr = rings[::step] + ([rings[-1]] if (len(rings) - 1) % step else [])
    Lp, Rp = [], []
    for (y, xc, d, lc, w) in rr:
        c = xc * sv - lc * cv
        h = (abs(d * sv) ** m + abs(w * cv) ** m) ** (1.0 / m)
        Lp.append((c - h, y))
        Rp.append((c + h, y))
    pts = Rp + Lp[::-1]
    if rot:
        a = math.radians(rot)
        pts = [(piv[0] + (x - piv[0]) * math.cos(a) - (y - piv[1]) * math.sin(a),
                piv[1] + (x - piv[0]) * math.sin(a) + (y - piv[1]) * math.cos(a)) for x, y in pts]
    return [(x + dx, y + dy) for x, y in pts]


def outline_path(F, pts, smooth=True):
    return F.pen(vkit.spline(pts)) if smooth else F.poly(pts)


def surf_point(rings, y, L, front=True):
    """Titik permukaan depan (atau belakang) pada baris y dan lateral L (penampang elips); normal satuan (nX, nL)."""
    i = min(range(len(rings)), key=lambda j: abs(rings[j][0] - y))
    _, xc, d, lc, w = rings[i]
    t = max(-0.999, min(0.999, (L - lc) / w))
    X = xc + (1 if front else -1) * d * math.sqrt(1 - t * t)
    nX, nL = (X - xc) / (d * d), (L - lc) / (w * w)
    n = math.hypot(nX, nL) or 1.0
    return X, nX / n, nL / n


def proj(X, L, v):
    """Koordinat layar lokal u dari titik tubuh (X maju, L lateral + = kanan tokoh) di sudut kamera v."""
    return X * math.sin(math.radians(v)) - L * math.cos(math.radians(v))


def depth(X, L, v):
    """Kedalaman ke arah kamera (+ = lebih dekat kamera); untuk urutan lapis sisi dekat/jauh."""
    return X * math.cos(math.radians(v)) + L * math.sin(math.radians(v))


def facing(nX, nL, v):
    """> 0 bila normal menghadap kamera."""
    return nX * math.cos(math.radians(v)) + nL * math.sin(math.radians(v))


def proj_widths(side_w, front_w, v):
    """Lebar stasiun tungkai terproyeksi: sqrt((w_samping sin v)^2 + (w_depan cos v)^2) per (depan, belakang).
    Di sisi kiri (sin v < 0) depan-belakang tertukar di layar."""
    s, c = abs(math.sin(math.radians(v))), abs(math.cos(math.radians(v)))
    out = [(math.hypot(a * s, fa * c), math.hypot(b * s, fb * c)) for (a, b), (fa, fb) in zip(side_w, front_w)]
    if math.sin(math.radians(v)) < 0:
        out = [(b, a) for a, b in out]
    return out


def hull(points3, v):
    """Kulit cembung layar (u, y) dari titik 3D (X, y, L). Untuk sepatu (profil samping x lebar lateral) dan kotak."""
    a = np.array([(proj(X, L, v), y) for X, y, L in points3], np.float32).reshape(-1, 1, 2) * 1000
    return [tuple(p) for p in ac.convex_hull(a).reshape(-1, 2) / 1000.0]


# ---------------- demo ----------------
def _demo_paths(F):
    """Tokoh contoh sederhana (kepala + badan sampai selangkangan) tampak depan dan samping, rangka sama, kanon 7,5
    kepala: bahu luar 2 H (setengah 1.0), pinggang 1.1, pinggul 1.5 di atas selangkangan 3.75, dada samping ~1.0."""
    head_f = F.pen(vkit.spline([(0.0, 0.0), (0.36, 0.12), (0.42, 0.52), (0.30, 0.88), (0.0, 1.0), (-0.30, 0.88),
                                (-0.42, 0.52), (-0.36, 0.12)]))
    head_s = F.pen(vkit.spline([(0.02, 0.0), (0.36, 0.16), (0.42, 0.55), (0.47, 0.66), (0.40, 0.72), (0.34, 0.95),
                                (0.10, 1.0), (-0.20, 0.82), (-0.42, 0.50), (-0.34, 0.14)]))
    body_f = F.pen(vkit.spline([(0.0, 1.15), (0.55, 1.24), (0.95, 1.42), (1.0, 1.75), (0.74, 2.35), (0.56, 2.8),
                                (0.75, 3.45), (0.62, 3.72), (0.0, 3.78), (-0.62, 3.72), (-0.75, 3.45), (-0.56, 2.8),
                                (-0.74, 2.35), (-1.0, 1.75), (-0.95, 1.42), (-0.55, 1.24)]))
    body_s = F.pen(vkit.spline([(0.0, 1.15), (0.22, 1.30), (0.50, 1.95), (0.42, 2.45), (0.34, 2.85), (0.40, 3.40),
                                (0.30, 3.72), (0.0, 3.78), (-0.36, 3.62), (-0.44, 3.30), (-0.30, 2.75), (-0.34, 2.0),
                                (-0.24, 1.30)]))
    return dict(head=(head_f, head_s, 2.0), body=(body_f, body_s, 1.25))


def demo(out):
    ox, oy, hp = 600.0, 100.0, 200.0
    _s, cv = vkit.new_surface(8, 8, 0xFFFFFF)
    F = Fig(cv, ox, oy, hp)
    parts = _demo_paths(F)
    R = {}
    for k, (fp, sp, m) in parts.items():
        rr = rings_from(fp, sp, ox, oy, hp)
        if k == "head":
            rr = flatten_front(rr, 0.55, 0.75)        # hidung = fitur, bukan volume
        R[k] = (rr, m)
    # cek: siluet loft (setelah subsampel + spline) di v 0 = tampak depan, di v 90 = tampak samping.
    # Beda tepi per baris (H), persentil 95 dan maksimum; baris hidung (diratakan) dikecualikan di v 90.
    for k, (rr, m) in R.items():
        for v, ref, skip in ((0, parts[k][0], None), (90, parts[k][1], (0.55, 0.75) if k == "head" else None)):
            e_ref = extents(ref, ox, oy, hp)
            e_lof = extents(outline_path(F, outline(rr, v, m)), ox, oy, hp)
            y_lo, y_hi = rr[0][0] + 0.01, rr[-1][0] - 0.01          # baris ujung (1-2 px, anti-alias) dikecualikan
            d = [max(abs(e_ref[y][0] - e_lof[y][0]), abs(e_ref[y][1] - e_lof[y][1])) for y in e_ref
                 if y in e_lof and y_lo <= y <= y_hi and not (skip and skip[0] < y < skip[1])]
            d.sort()
            print(_T("%-5s m %.2f v %3d: edge difference p95 %.4f H, max %.4f H (%d rows)",
                     "%-5s m %.2f v %3d: beda tepi p95 %.4f H, maks %.4f H (%d baris)") % (
                k, m, v, d[int(0.95 * (len(d) - 1))], d[-1], len(d)))
    angles = (0, 22.5, 45, 67.5, 90, 135, 180)
    W, Hh, gap = 280, 600, 10
    s, c = vkit.new_surface(gap + len(angles) * (W + gap), Hh, 0xF4F0EA)
    font = brush.Font("Inter", 20)
    ink = brush.Paint(0x141414)
    for i, v in enumerate(angles):
        G = Fig(c, gap + i * (W + gap) + W / 2, 60, 125)
        for k, col, col_d in (("body", 0x7FA3B5, 0x55788A), ("head", 0xF2D3C2, 0xC9917C)):
            rr, m = R[k]
            p = outline_path(G, outline(rr, v, m))
            G.fill(p, col)
            vkit.form_shade(G, p, col_d, 1.0)
        # mata = titik permukaan, tampil bila menghadap kamera
        for L in (-0.15, 0.15):
            X, nX, nL = surf_point(R["head"][0], 0.55, L)
            f = facing(nX, nL, v)
            if f > 0:
                G.fill(G.ellipse(proj(X, L, v), 0.55, 0.035 * (0.55 + 0.45 * f), 0.05), 0x2B2420)
        # hidung = fitur terpisah: tonjolan di permukaan depan (sudah diratakan), menempel ke kontur wajah;
        # tampil sebagai tonjolan bila |sin v| > 0.5 dan menghadap kamera, selain itu goresan kecil
        X, nX, nL = surf_point(R["head"][0], 0.66, 0.0)
        f = facing(nX, nL, v)
        if f > -0.2:
            if abs(math.sin(math.radians(v))) > 0.5:
                G.fill(G.ellipse(proj(X + 0.01, 0.0, v), 0.665, 0.055, 0.05), 0xF2D3C2)
            else:
                G.ink([(proj(X, 0.0, v) - 0.03, 0.70), (proj(X, 0.0, v) + 0.02, 0.71)], 0.02, 0xC9917C, 0.9)
        c.draw_text("v %g" % v, gap + i * (W + gap) + 10, 30, font, ink)
    vkit.save(s, out)


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "demo":
        demo(sys.argv[2])
    else:
        print(_T(__doc__, _DOC_ID))
