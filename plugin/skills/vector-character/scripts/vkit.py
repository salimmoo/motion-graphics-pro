"""vkit - flat vector character drawing kit (brush layer: skia when installed, numpy + Pillow otherwise), for any
figure.

Units H (head height): x = 0 centre line, y = 0 top of the head/hair, chin y = 1, y down.
Fig(cv, ox, oy, hp) maps H to pixels: px = ox + x * hp, py = oy + y * hp. cv = brush.Canvas.

Contents:
- rgb(hex, a)                     : colour 0xRRGGBB -> (r, g, b, a) float (brush.color)
- Fig                             : rotated() (local frame), mirrored() (mirror view), pen() (absolute SVG path
                                    M L C Q Z in H), ellipse(), fill(), shade() (fill clipped to base), ink() (tapered
                                    stroke)
- union / inter / diff / sop      : pathfinder (brush); sop() is safe (skia engine: try/except + Simplify)
- union_all                       : union of many paths at once (brush.union_all)
- spline(pts, closed, corners)    : Catmull-Rom -> cubic path string, zero handles at corner anchors
- form_shade(F, region, ...)      : one-tone shade = region minus a copy shifted towards the light (screen space, so
                                    the mirror view stays correct)
- off, lerp, normal, side_pts     : limb tube helpers (point stations, normals, front width, back width)
- new_surface, save, to_array     : canvas (brush.Surface), save PNG, RGBA uint8 array

Usage: python -I vkit.py demo out.png    -> sample of every tool in one image
"""
import math
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brush  # noqa: E402


_DOC_ID = """vkit - alat gambar karakter flat vector (lapisan brush: skia bila terpasang, numpy + Pillow bila tidak), umum untuk
tokoh apa pun.

Satuan H (tinggi kepala): x = 0 garis tengah, y = 0 puncak kepala/rambut, dagu y = 1, y ke bawah.
Fig(cv, ox, oy, hp) memetakan H ke piksel: px = ox + x * hp, py = oy + y * hp. cv = brush.Canvas.

Isi:
- rgb(hex, a)                     : warna 0xRRGGBB -> (r, g, b, a) float (brush.color)
- Fig                             : rotated() (rangka lokal), mirrored() (tampak cermin), pen() (path SVG absolut
                                    M L C Q Z dalam H), ellipse(), fill(), shade() (isi di-clip ke base), ink() (goresan tirus)
- union / inter / diff / sop      : pathfinder (brush); sop() aman (mesin skia: try/except + Simplify)
- union_all                       : gabung banyak path sekaligus (brush.union_all)
- spline(pts, closed, corners)    : Catmull-Rom -> string path cubic, handle nol di anchor sudut
- form_shade(F, region, ...)      : bayangan satu nada = region minus salinan yang digeser ke arah cahaya (ruang layar,
                                    jadi tampak cermin tetap benar)
- off, lerp, normal, side_pts     : bantu tabung tungkai (stasiun titik, normal, lebar depan, lebar belakang)
- new_surface, save, to_array     : kanvas (brush.Surface), simpan PNG, array RGBA uint8

Pakai: python -I vkit.py demo out.png    -> contoh semua alat dalam satu gambar
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


# ---------------- warna ----------------
def rgb(c, a=1.0):
    return brush.color(c, a)


def mix(c1, c2, t):
    """Campur dua warna hex (t 0..1)."""
    t = max(0.0, min(1.0, t))
    out = 0
    for sh in (16, 8, 0):
        a, b = (c1 >> sh) & 255, (c2 >> sh) & 255
        out |= int(round(a + (b - a) * t)) << sh
    return out


# ---------------- figur ----------------
class Fig:
    def __init__(self, cv, ox, oy, hp):
        self.cv, self.ox, self.oy, self.hp = cv, ox, oy, hp
        self.tf = brush.Matrix()         # transformasi lokal dalam H

    def rotated(self, px, py, deg, dx=0.0, dy=0.0):
        """Rangka lokal: putar deg (searah jarum jam di layar) di (px, py), lalu geser (dx, dy). Satuan H."""
        g = Fig(self.cv, self.ox, self.oy, self.hp)
        g.tf = self.tf @ (brush.Matrix.translate(dx, dy) @ brush.Matrix.rotate(deg, px, py))
        return g

    def mirrored(self, cx=0.0):
        """Cermin kiri-kanan terhadap garis x = cx (H)."""
        g = Fig(self.cv, self.ox, self.oy, self.hp)
        g.tf = self.tf @ brush.Matrix.scale(-1, 1, cx, 0)
        return g

    def to_px(self):
        return (brush.Matrix.translate(self.ox, self.oy) @ brush.Matrix.scale(self.hp, self.hp)) @ self.tf

    def pt(self, x, y):
        return self.to_px().map_point(x, y)

    def pen(self, d):
        """Path SVG absolut (M L C Q Z) dalam H -> brush.Path piksel."""
        p = brush.Path()
        toks = re.findall(r"[MLCQZmlcqz]|-?\d*\.?\d+(?:e-?\d+)?", d)
        i, cmd = 0, None

        def nums(n):
            return [float(t) for t in toks[i:i + n]]
        while i < len(toks):
            t = toks[i]
            if t.isalpha():
                cmd = t.upper()
                i += 1
                if cmd == "Z":
                    p.close()
                continue
            if cmd == "M":
                x, y = nums(2)
                p.move_to(x, y)
                i += 2
                cmd = "L"
            elif cmd == "L":
                x, y = nums(2)
                p.line_to(x, y)
                i += 2
            elif cmd == "Q":
                p.quad_to(*nums(4))
                i += 4
            elif cmd == "C":
                p.cubic_to(*nums(6))
                i += 6
            else:
                raise ValueError(cmd)
        p.transform(self.to_px())
        return p

    def poly(self, pts, closed=True):
        """Poligon titik (H) -> path piksel (tanpa penghalusan)."""
        return brush.Path().polygon([self.pt(x, y) for x, y in pts], closed)

    def ellipse(self, cx, cy, rx, ry):
        k = 0.5523
        d = (f"M {cx - rx} {cy} C {cx - rx} {cy - ry * k} {cx - rx * k} {cy - ry} {cx} {cy - ry} "
             f"C {cx + rx * k} {cy - ry} {cx + rx} {cy - ry * k} {cx + rx} {cy} "
             f"C {cx + rx} {cy + ry * k} {cx + rx * k} {cy + ry} {cx} {cy + ry} "
             f"C {cx - rx * k} {cy + ry} {cx - rx} {cy + ry * k} {cx - rx} {cy} Z")
        return self.pen(d)

    def fill(self, path, color, alpha=1.0):
        self.cv.draw_path(path, brush.Paint(color, alpha=alpha))

    def shade(self, base, shape, color, alpha=1.0):
        """Isi shape yang di-clip ke base (bayangan, band manset, sol)."""
        self.cv.save()
        self.cv.clip_path(base, True)
        self.fill(shape, color, alpha)
        self.cv.restore()

    def ink(self, pts, w, color, alpha=0.65, clip=None, taper=(1.0, 1.0)):
        """Goresan tirus (profil sin^0.6) melalui titik H; w = tebal maksimum (H). Selalu clip ke bahannya."""
        path = stroke_poly([self.pt(x, y) for x, y in pts], w * self.hp, taper)
        if clip is not None:
            self.shade(clip, path, color, alpha)
        else:
            self.fill(path, color, alpha)


# ---------------- pathfinder ----------------
def union(*ps):
    return brush.union(*ps)


def inter(a, b):
    return brush.intersect(a, b)


def diff(a, b):
    return brush.subtract(a, b)


def sop(a, b, op):
    """Pathfinder aman, op = "union" | "intersect" | "subtract" | "exclude" (nama lama gabung/iris/kurang/xor tetap
    diterima). Mesin skia: langsung, lalu Simplify kedua path;
    gagal: union -> a, intersect -> kosong, difference -> a (skia.Op bisa melempar pada path padat/memotong diri, atau
    bolong diam-diam; cek luas bila ragu). Mesin murni: pohon boolean, dievaluasi eksak per sampel saat digambar."""
    return brush.op(a, b, op)


def union_all(paths):
    return brush.union_all(paths)


def area(path, step=1.0):
    """Luas path (px^2) lewat rasterisasi; untuk cek union bolong (luas gabungan < bagian)."""
    x0, y0, x1, y1 = path.bounds()
    w, h = int((x1 - x0) / step) + 4, int((y1 - y0) / step) + 4
    s = brush.Surface(max(w, 1), max(h, 1))
    c = s.canvas
    c.clear(0x000000)
    c.scale(1 / step, 1 / step)
    c.translate(-x0 + 2 * step, -y0 + 2 * step)
    c.draw_path(path, brush.Paint(0xFFFFFF))
    a = s.array()[:, :, 0]
    return float(a.sum()) / 255.0 * step * step


# ---------------- kurva ----------------
def catmull(pts, n=14):
    pts = [np.array([p.x(), p.y()]) if callable(getattr(p, "x", None)) else np.array(p, float) for p in pts]
    if len(pts) < 3:
        a, b = pts
        return [a + (b - a) * t for t in np.linspace(0, 1, n * 2)]
    ext = [2 * pts[0] - pts[1]] + pts + [2 * pts[-1] - pts[-2]]
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for t in np.linspace(0, 1, n, endpoint=(i == len(ext) - 3)):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return out


def stroke_poly(pts, w, taper=(1.0, 1.0)):
    """Poligon goresan tirus (px) sepanjang Catmull-Rom titik pts (px)."""
    c = catmull(pts)
    n = len(c)
    left, right = [], []
    for i, p in enumerate(c):
        a = c[max(i - 1, 0)]
        b = c[min(i + 1, n - 1)]
        d = b - a
        L = math.hypot(*d) or 1.0
        nx, ny = -d[1] / L, d[0] / L
        t = i / (n - 1)
        prof = math.sin(math.pi * t) ** 0.6
        k = taper[0] if t < 0.5 else taper[1]
        if k != 1:
            prof = prof ** k
        hw = 0.5 * w * max(prof, 0.08)
        left.append((p[0] + nx * hw, p[1] + ny * hw))
        right.append((p[0] - nx * hw, p[1] - ny * hw))
    return brush.Path().polygon(left + right[::-1])


def spline(pts, closed=True, corners=()):
    """Catmull-Rom -> string path cubic (H) untuk Fig.pen. corners: indeks anchor sudut (handle nol)."""
    n = len(pts)
    P = [tuple(map(float, p)) for p in pts]

    def g(i):
        return P[i % n] if closed else P[max(0, min(n - 1, i))]
    out = "M %.4f %.4f " % P[0]
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = g(i - 1), g(i), g(i + 1), g(i + 2)
        t1 = (0.0, 0.0) if (i % n) in corners else ((p2[0] - p0[0]) / 6, (p2[1] - p0[1]) / 6)
        t2 = (0.0, 0.0) if ((i + 1) % n) in corners else ((p3[0] - p1[0]) / 6, (p3[1] - p1[1]) / 6)
        out += "C %.4f %.4f %.4f %.4f %.4f %.4f " % (p1[0] + t1[0], p1[1] + t1[1], p2[0] - t2[0], p2[1] - t2[1],
                                                  p2[0], p2[1])
    return out + ("Z" if closed else "")


# ---------------- bayangan + tungkai ----------------
def off(p, dx, dy):
    return p.copy().offset(dx, dy)


def form_shade(F, region, color, alpha, k=0.06, ky=0.025, light=(-1.0, 1.0)):
    """Bayangan satu nada di sisi jauh dari cahaya: region minus salinan yang digeser ke arah cahaya.
    light = arah cahaya di layar (x kanan, y atas); default kiri atas. Geser = (light_x * k, -light_y * ky) H.
    Di adegan dengan matahari dunia, isi light dengan Cam.light2d(sun) per sudut."""
    dx, dy = light[0] * k * F.hp, -light[1] * ky * F.hp
    F.shade(region, diff(region, off(region, dx, dy)), color, alpha)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def normal(a, b):
    """Normal satuan ke arah +x (sisi depan) untuk tulang a -> b yang mengarah ke bawah."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    return (dy / L, -dx / L)


def side_pts(stations):
    """stations: [(titik, normal, lebar_depan, lebar_belakang)] -> (titik tepi depan, titik tepi belakang)."""
    fr = [(p[0] + n[0] * wf, p[1] + n[1] * wf) for p, n, wf, wb in stations]
    bk = [(p[0] - n[0] * wb, p[1] - n[1] * wb) for p, n, wf, wb in stations]
    return fr, bk


def tube_stations(a, b, c, widths, at=(0.0, 0.40, 0.75, 1.0, 0.35, 0.72, 1.0)):
    """Tabung 2 tulang a-b-c (H). widths = 7 pasang (depan, belakang): pangkal, 40% dan 75% tulang atas, sendi,
    35% dan 72% tulang bawah, ujung. Normal di sendi = rata-rata dua tulang. Kembalikan (depan, belakang)."""
    nt, ns = normal(a, b), normal(b, c)
    nk = ((nt[0] + ns[0]) / 2, (nt[1] + ns[1]) / 2)
    st = [(a, nt) + tuple(widths[0]), (lerp(a, b, at[1]), nt) + tuple(widths[1]),
          (lerp(a, b, at[2]), nt) + tuple(widths[2]), (b, nk) + tuple(widths[3]),
          (lerp(b, c, at[4]), ns) + tuple(widths[4]), (lerp(b, c, at[5]), ns) + tuple(widths[5]),
          (c, ns) + tuple(widths[6])]
    return side_pts(st)


def tube_path(F, a, b, c, widths):
    """Path tabung tertutup dari tube_stations (spline halus, ujung membulat)."""
    fr, bk = tube_stations(a, b, c, widths)
    return F.pen(spline(list(fr) + list(reversed(bk))))


def ik2(h, a, l1, l2, knee_fwd=True):
    """IK 2 tulang (layar H). Pilih solusi lutut ke +x bila knee_fwd (tampak samping), selain itu ke -x."""
    dx, dy = a[0] - h[0], a[1] - h[1]
    d = min(math.hypot(dx, dy), l1 + l2 - 1e-6)
    base = math.atan2(dy, dx)
    A = math.acos(max(-1.0, min(1.0, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
    best = None
    for s in (1, -1):
        k = (h[0] + l1 * math.cos(base + s * A), h[1] + l1 * math.sin(base + s * A))
        if best is None or (k[0] > best[0]) == knee_fwd:
            best = k
    return best


# ---------------- kanvas ----------------
def new_surface(w, h, bg):
    s = brush.Surface(w, h)
    s.canvas.clear(bg)
    return s, s.canvas


def save(s, out):
    s.save(out)


def to_array(s):
    return s.array()


# ---------------- demo ----------------
def demo(out):
    """Contoh: kepala + badan (satu siluet, potongan bahan), bayangan bentuk, goresan, tungkai tabung,
    tampak cermin. Bukan tokoh proyek; hanya uji alat."""
    s, cv = new_surface(1200, 900, 0xEFE8DE)
    SK, SK_D, TOP, TOP_D, PANT, PANT_D, HAIR = 0xF2D3C2, 0xC9917C, 0x7FA3B5, 0x55788A, 0x6E6A5E, 0x4C493F, 0x4A3A33

    def figure(F, light=(-1.0, 1.0)):
        widths = [(0.22, 0.22), (0.19, 0.19), (0.16, 0.16), (0.14, 0.14), (0.14, 0.14), (0.12, 0.12), (0.11, 0.11)]
        for sx in (-1, 1):
            leg = tube_path(F, (0.24 * sx, 3.05), (0.26 * sx, 4.40), (0.24 * sx, 5.62), widths)
            F.fill(leg, PANT)
            form_shade(F, leg, PANT_D, 1.0, light=light)
        neck = F.pen(spline([(-0.14, 0.85), (0.14, 0.85), (0.16, 1.35), (-0.16, 1.35)], corners=(2, 3)))
        F.fill(neck, SK)
        F.shade(neck, F.ellipse(0.0, 0.63, 0.40, 0.48), SK_D, 0.8)     # bayangan dagu = wajah digeser turun
        body = F.pen(spline([(0.0, 1.20), (0.55, 1.32), (0.62, 2.0), (0.52, 3.2), (0.0, 3.25), (-0.52, 3.2),
                             (-0.62, 2.0), (-0.55, 1.32)]))
        F.fill(body, TOP)
        form_shade(F, body, TOP_D, 1.0, light=light)
        F.ink([(-0.1, 2.2), (0.0, 2.6), (0.12, 2.95)], 0.02, 0xFFFFFF, 0.5, clip=body)
        face = F.ellipse(0.0, 0.55, 0.40, 0.48)
        F.fill(face, SK)
        form_shade(F, face, SK_D, 0.6, light=light)
        hair = F.pen(spline([(-0.44, 0.55), (-0.40, 0.05), (0.0, -0.06), (0.42, 0.06), (0.46, 0.50), (0.30, 0.25),
                             (-0.10, 0.22)], corners=(4,)))
        F.fill(hair, HAIR)
        F.fill(F.ellipse(-0.15, 0.62, 0.035, 0.05), 0x2B2420)
        F.fill(F.ellipse(0.15, 0.62, 0.035, 0.05), 0x2B2420)
        F.ink([(-0.10, 0.86), (0.0, 0.89), (0.10, 0.86)], 0.025, 0x8C4A3F, 0.9)

    figure(Fig(cv, 350, 120, 120))
    figure(Fig(cv, 850, 120, 120).mirrored(0.0))
    font = brush.Font("Inter", 22)
    ink = brush.Paint(0x141414)
    cv.draw_text("Fig + spline + form_shade + ink + tube_path", 40, 40, font, ink)
    cv.draw_text("mirrored(): bayangan tetap di sisi jauh cahaya kiri atas", 640, 40, font, ink)
    save(s, out)


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "demo":
        demo(sys.argv[2])
    else:
        print(_T(__doc__, _DOC_ID))
