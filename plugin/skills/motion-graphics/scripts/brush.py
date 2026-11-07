# AUTO-GENERATED COPY of _shared/brush.py (run _shared/sync.py after editing the source). Do not edit here.
"""brush - small vector drawing API for skill scripts: paths, paints, canvas, surface, images, text, pathfinder, SVG.

Old name: brush.py (brush.py is now a shim; every old Indonesian name still works as an alias, see the end of this
file).

Two engines, same API:
- skia : fast path when skia-python is installed (pip install skia-python).
- pure : numpy + Pillow only. Scanline rasterisation with binary S x S supersampling per pixel (default S = 4, 16
         samples; MGP_BRUSH_SUPERSAMPLE=6 is smoother and slower). Pathfinder results (union/intersect/subtract) are
         evaluated EXACTLY per sample at draw time (boolean tree), so union seams do not show.
Choose the engine with the environment variable MGP_BRUSH_ENGINE = auto (default: skia when present) | skia | pure
(old names: KUAS_MESIN, value "murni" = pure; KUAS_SS = MGP_BRUSH_SUPERSAMPLE).

Units and conventions match skia: pixels, y down, rotation clockwise on screen (degrees), colours float 0..1 not
premultiplied, the canvas stores premultiplied colour, PNG output is RGBA not premultiplied.

Contents:
- color(hex, a) -> (r, g, b, a) float; color_int(r, g, b[, a]) 0..255 -> float
- Matrix: identity(), make_all(9 numbers, row major), translate(dx, dy), scale(sx, sy, px, py), rotate(deg, px, py);
  m @ n (= skia Concat(m, n)), map_point(x, y), map_array(P), invert(), has_perspective
- Path: move_to/line_to/quad_to/cubic_to/close, oval/rect/round_rect/circle/polygon, transform(M), offset(dx, dy),
  copy(), is_empty(), bounds(), fill_rule ("nonzero" | "evenodd"), from_svg(d) (M L H V C S Q T A Z, absolute +
  relative)
- union(*p) / intersect(a, b) / subtract(a, b) / exclude(a, b) / union_all(list) / simplify(p)  (pathfinder, same
  names as Figma's boolean operations; op(a, b, kind) with kind union | intersect | subtract | exclude)
- measure(path) -> Contour(length, closed, pos_tan(d)) per contour   (PathMeasure)
- Paint(color, alpha, style, width, cap, join, blend, shader, aa, miter_limit): style "fill" | "stroke" |
  "stroke_and_fill"; cap "butt" | "round" | "square"; join "miter" | "round" | "bevel"; blend "normal" | "multiply" |
  "modulate" | "clear" | "screen" | "src" | "dst_in" | "dst_out" | "plus" | "darken" | "lighten" | "src_in" |
  "src_atop" | "dst_over"   (old values isi/garis/isi_garis, datar/bulat/kotak, runcing/bulat/serong still work)
- linear_gradient(p0, p1, colors, positions, tile_mode), radial_gradient(center, r, colors, positions, tile_mode)
  tile_mode "clamp" | "repeat" | "mirror"
- Surface(w, h): .canvas, .image(), .array() (RGBA uint8), .save(png)
- Canvas: clear, save/restore, save_layer(paint), translate/scale/rotate/concat, total_matrix(), clip_path,
  clip_rect, draw_path, draw_rect, draw_round_rect, draw_oval, draw_circle, draw_line, draw_text, draw_image,
  draw_image_rect. On the skia engine the original skia names (drawPath, ...) are forwarded to the skia canvas
  (compatible with older project code).
- Image: Image.open(path), Image.from_array(rgba), .width, .height, .array(), .save(png)
- Font(name, size): Inter when installed, otherwise a system sans font; .measure_text(text)
- draw_svg(canvas, svg_text, w, h, force_pure): render SVG (skia.SVGDOM on the skia engine; pure engine: path, rect,
  circle, ellipse, line, polyline, polygon, g, use, transform, style, fill/stroke/opacity, fill-rule, gradient ->
  flat colour)
- ENGINE: active engine name ("skia" | "pure"); MESIN keeps the old value ("skia" | "murni")

Credit: compositing formulas and paint/stroke behaviour follow Skia (BSD-3, see NOTICE); the code is a rewrite.
"""
import functools
import math
import os
import re
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image as _PILImage, ImageDraw, ImageFont


def _lang_id():
    m = (os.environ.get("MGP_LANG") or "").lower()
    if m:
        return m.startswith("id")
    for k in ("LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return v.startswith("id")
    return False


def _T(en, id_):
    """Message in the active language: English by default, Indonesian with MGP_LANG=id (or LC_ALL/LANG id*)."""
    return id_ if _lang_id() else en


def _old_kw(names):
    """Accept old (Indonesian) keyword names: {old: new}."""
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*a, **k):
            if k:
                for o, n in names.items():
                    if o in k:
                        k[n] = k.pop(o)
            return fn(*a, **k)
        return wrapper
    return deco


def _env(new, old, default):
    v = os.environ.get(new)
    if v is None or v.strip() == "":
        v = os.environ.get(old)
    return default if v is None or v.strip() == "" else v


_choice = _env("MGP_BRUSH_ENGINE", "KUAS_MESIN", "auto").strip().lower()
_choice = {"murni": "pure"}.get(_choice, _choice)
skia = None
if _choice in ("auto", "skia"):
    try:
        import skia  # noqa: F811
    except ImportError:
        if _choice == "skia":
            raise
        skia = None
ENGINE = "skia" if skia is not None else "pure"
MESIN = "skia" if ENGINE == "skia" else "murni"     # old name and old value
SS = max(1, int(_env("MGP_BRUSH_SUPERSAMPLE", "KUAS_SS", "4")))
TOL = 0.12                                   # curve flattening tolerance (device pixels)

# old (Indonesian) option values -> canonical English values
_STYLE = {"isi": "fill", "garis": "stroke", "isi_garis": "stroke_and_fill"}
_CAP = {"datar": "butt", "bulat": "round", "kotak": "square"}
_JOIN = {"runcing": "miter", "bulat": "round", "serong": "bevel"}
_OP_KIND = {"gabung": "union", "iris": "intersect", "kurang": "subtract", "exclude": "xor"}


# ---------------- warna ----------------
def color(c, a=1.0):
    """0xRRGGBB -> (r, g, b, a) float 0..1."""
    return (((c >> 16) & 255) / 255.0, ((c >> 8) & 255) / 255.0, (c & 255) / 255.0, float(a))


def color_int(r, g, b, a=255):
    return (r / 255.0, g / 255.0, b / 255.0, a / 255.0)


def _w4(c, alpha=1.0):
    if c is None:
        return (0.0, 0.0, 0.0, alpha)
    if isinstance(c, (int, np.integer)):
        r = color(int(c))
        return (r[0], r[1], r[2], alpha)
    c = tuple(float(v) for v in c)
    if len(c) == 3:
        c = c + (1.0,)
    return (c[0], c[1], c[2], c[3] * alpha)


def _argb(c):
    r, g, b, a = (int(round(max(0.0, min(1.0, v)) * 255)) for v in c)
    return (a << 24) | (r << 16) | (g << 8) | b


# ---------------- matriks ----------------
class Matrix:
    """Matrix 3 x 3 (baris): [[sx, kx, tx], [ky, sy, ty], [p0, p1, p2]]."""
    __slots__ = ("m",)

    def __init__(self, m=None):
        self.m = np.eye(3) if m is None else np.asarray(m, np.float64).reshape(3, 3).copy()

    @staticmethod
    def identity():
        return Matrix()

    @staticmethod
    def make_all(sx, kx, tx, ky, sy, ty, p0=0.0, p1=0.0, p2=1.0):
        return Matrix([[sx, kx, tx], [ky, sy, ty], [p0, p1, p2]])

    @staticmethod
    def translate(dx, dy):
        return Matrix([[1, 0, dx], [0, 1, dy], [0, 0, 1]])

    @staticmethod
    def scale(sx, sy=None, px=0.0, py=0.0):
        sy = sx if sy is None else sy
        return Matrix([[sx, 0, px - sx * px], [0, sy, py - sy * py], [0, 0, 1]])

    @staticmethod
    def rotate(deg, px=0.0, py=0.0):
        a = math.radians(deg)
        c, s = math.cos(a), math.sin(a)
        if abs(deg % 90) < 1e-12:                      # sudut siku: nilai eksak seperti skia
            c, s = round(c), round(s)
        return Matrix([[c, -s, px - c * px + s * py], [s, c, py - s * px - c * py], [0, 0, 1]])

    def __matmul__(self, o):
        return Matrix(self.m @ o.m)

    def map_point(self, x, y):
        v = self.m @ np.array([x, y, 1.0])
        return (v[0] / v[2], v[1] / v[2]) if self.has_perspective else (v[0], v[1])

    def map_array(self, P):
        P = np.asarray(P, np.float64)
        X = P[..., 0] * self.m[0, 0] + P[..., 1] * self.m[0, 1] + self.m[0, 2]
        Y = P[..., 0] * self.m[1, 0] + P[..., 1] * self.m[1, 1] + self.m[1, 2]
        if self.has_perspective:
            Wh = P[..., 0] * self.m[2, 0] + P[..., 1] * self.m[2, 1] + self.m[2, 2]
            return np.stack([X / Wh, Y / Wh], -1)
        return np.stack([X, Y], -1)

    def invert(self):
        if abs(np.linalg.det(self.m)) < 1e-300:
            return None
        return Matrix(np.linalg.inv(self.m))

    @property
    def has_perspective(self):
        return abs(self.m[2, 0]) > 1e-15 or abs(self.m[2, 1]) > 1e-15 or abs(self.m[2, 2] - 1) > 1e-15

    def to_skia(self):
        return skia.Matrix.MakeAll(*[float(v) for v in self.m.ravel()])

    def __repr__(self):
        return "Matrix(%s)" % np.array2string(self.m, precision=4)


# ---------------- jalur ----------------
class Path:
    """Path. Mesin skia: membungkus skia.Path. Mesin murni: daftar perintah atau pohon boolean."""

    def __init__(self, _source=None):
        if ENGINE == "skia":
            self._sk = skia.Path(_source) if _source is not None else skia.Path()
        else:
            self._c = []            # ("M", x, y) ("L", x, y) ("Q", x1, y1, x, y) ("C", ...) ("Z",)
            self._op = None         # ("union", [anak]) / ("intersect", a, b) / ("subtract", a, b) / ("xor", a, b)
            self._eo = False
            self._cache = None

    # --- bangun ---
    def move_to(self, x, y):
        if ENGINE == "skia":
            self._sk.moveTo(float(x), float(y))
        else:
            self._c.append(("M", float(x), float(y)))
            self._cache = None
        return self

    def line_to(self, x, y):
        if ENGINE == "skia":
            self._sk.lineTo(float(x), float(y))
        else:
            self._c.append(("L", float(x), float(y)))
            self._cache = None
        return self

    def quad_to(self, x1, y1, x, y):
        if ENGINE == "skia":
            self._sk.quadTo(float(x1), float(y1), float(x), float(y))
        else:
            self._c.append(("Q", float(x1), float(y1), float(x), float(y)))
            self._cache = None
        return self

    def cubic_to(self, x1, y1, x2, y2, x, y):
        if ENGINE == "skia":
            self._sk.cubicTo(float(x1), float(y1), float(x2), float(y2), float(x), float(y))
        else:
            self._c.append(("C", float(x1), float(y1), float(x2), float(y2), float(x), float(y)))
            self._cache = None
        return self

    def close(self):
        if ENGINE == "skia":
            self._sk.close()
        else:
            self._c.append(("Z",))
            self._cache = None
        return self

    @_old_kw({"tutup": "close"})
    def polygon(self, pts, close=True):
        pts = list(pts)
        if not pts:
            return self
        self.move_to(*pts[0])
        for q in pts[1:]:
            self.line_to(*q)
        if close:
            self.close()
        return self

    def oval(self, x0, y0, x1, y1):
        """Oval di kotak (searah jarum jam mulai dari kanan, seperti skia addOval)."""
        if ENGINE == "skia":
            self._sk.addOval(skia.Rect(x0, y0, x1, y1))
            return self
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
        k = 0.5522847498
        self.move_to(cx + rx, cy)
        self.cubic_to(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry)
        self.cubic_to(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy)
        self.cubic_to(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry)
        self.cubic_to(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy)
        return self.close()

    def circle(self, cx, cy, r):
        return self.oval(cx - r, cy - r, cx + r, cy + r)

    def rect(self, x0, y0, x1, y1):
        if ENGINE == "skia":
            self._sk.addRect(skia.Rect(x0, y0, x1, y1))
            return self
        return self.polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

    def round_rect(self, x0, y0, x1, y1, rx, ry=None):
        ry = rx if ry is None else ry
        if ENGINE == "skia":
            self._sk.addRRect(skia.RRect.MakeRectXY(skia.Rect(x0, y0, x1, y1), rx, ry))
            return self
        rx = max(0.0, min(rx, (x1 - x0) / 2))
        ry = max(0.0, min(ry, (y1 - y0) / 2))
        if rx <= 0 or ry <= 0:
            return self.rect(x0, y0, x1, y1)
        k = 0.5522847498
        self.move_to(x0 + rx, y0)
        self.line_to(x1 - rx, y0)
        self.cubic_to(x1 - rx + rx * k, y0, x1, y0 + ry - ry * k, x1, y0 + ry)
        self.line_to(x1, y1 - ry)
        self.cubic_to(x1, y1 - ry + ry * k, x1 - rx + rx * k, y1, x1 - rx, y1)
        self.line_to(x0 + rx, y1)
        self.cubic_to(x0 + rx - rx * k, y1, x0, y1 - ry + ry * k, x0, y1 - ry)
        self.line_to(x0, y0 + ry)
        self.cubic_to(x0, y0 + ry - ry * k, x0 + rx - rx * k, y0, x0 + rx, y0)
        return self.close()

    @staticmethod
    def from_svg(d):
        return _svg_path(d)

    # --- ubah ---
    @property
    def fill_rule(self):
        if ENGINE == "skia":
            return "evenodd" if self._sk.getFillType() == skia.PathFillType.kEvenOdd else "nonzero"
        return "evenodd" if self._eo else "nonzero"

    @fill_rule.setter
    def fill_rule(self, v):
        if ENGINE == "skia":
            self._sk.setFillType(skia.PathFillType.kEvenOdd if v == "evenodd" else skia.PathFillType.kWinding)
        else:
            self._eo = v == "evenodd"

    def copy(self):
        if ENGINE == "skia":
            return Path(self._sk)
        q = Path()
        q._c = list(self._c)
        q._eo = self._eo
        q._op = _copy_op(self._op)
        q._cache = self._cache
        return q

    def transform(self, M):
        """Ubah di tempat dengan Matrix M (perspektif: kurva diratakan dulu)."""
        if ENGINE == "skia":
            self._sk.transform(M.to_skia())
            return self
        if self._op is not None:
            self._op = _op_map(self._op, lambda j: j.transform(M))
            return self
        if M.has_perspective:
            cs = _flatten(self._c, M, TOL)
            self._c = []
            for pts, close in cs:
                q = M.map_array(pts)
                self.polygon([tuple(v) for v in q], close)
            return self
        a = M.m
        out = []
        for c in self._c:
            if c[0] == "Z":
                out.append(c)
                continue
            v = list(c[1:])
            for i in range(0, len(v), 2):
                x, y = v[i], v[i + 1]
                v[i], v[i + 1] = a[0, 0] * x + a[0, 1] * y + a[0, 2], a[1, 0] * x + a[1, 1] * y + a[1, 2]
            out.append((c[0],) + tuple(v))
        self._c = out
        self._cache = None
        return self

    def offset(self, dx, dy):
        if ENGINE == "skia":
            self._sk.offset(dx, dy)
            return self
        return self.transform(Matrix.translate(dx, dy))

    def is_empty(self):
        if ENGINE == "skia":
            return self._sk.isEmpty()
        if self._op is not None:
            return all(j.is_empty() for j in _op_leaves(self._op))
        return not any(c[0] != "M" for c in self._c if c[0] != "Z") and not any(c[0] in "LQC" for c in self._c)

    def bounds(self):
        """Kotak ketat (x0, y0, x1, y1); kosong -> (0, 0, 0, 0). Hasil pathfinder murni: kotak perkiraan (lebih besar)."""
        if ENGINE == "skia":
            r = self._sk.computeTightBounds()
            return (r.left(), r.top(), r.right(), r.bottom())
        if self._op is not None:
            return _op_bounds(self._op)
        cs = _flatten(self._c, None, 0.02)
        if not cs:
            return (0.0, 0.0, 0.0, 0.0)
        P = np.concatenate([p for p, _ in cs])
        return (float(P[:, 0].min()), float(P[:, 1].min()), float(P[:, 0].max()), float(P[:, 1].max()))

    def contours(self, tol=0.05):
        """List (titik N x 2, tertutup) hasil perataan (murni: pohon boolean diselesaikan lewat raster)."""
        if ENGINE == "skia":
            return _flatten(_cmds_from_skia(self._sk), None, tol)
        if self._op is not None:
            return _resolve(self)._contours_cache(tol)
        return self._contours_cache(tol)

    def _contours_cache(self, tol):
        key = ("k", tol)
        if self._cache is None or self._cache[0] != key:
            self._cache = (key, _flatten(self._c, None, tol))
        return self._cache[1]

    def to_skia(self):
        return self._sk

    def __repr__(self):
        return "Path(%s, bounds=%s)" % (ENGINE, tuple(round(v, 2) for v in self.bounds()))


def _copy_op(op):
    if op is None:
        return None
    if op[0] == "union":
        return ("union", [j.copy() for j in op[1]])
    return (op[0], op[1].copy(), op[2].copy())


def _op_map(op, f):
    if op[0] == "union":
        return ("union", [f(j.copy()) for j in op[1]])
    return (op[0], f(op[1].copy()), f(op[2].copy()))


def _op_leaves(op):
    kids = op[1] if op[0] == "union" else [op[1], op[2]]
    out = []
    for j in kids:
        out += _op_leaves(j._op) if j._op is not None else [j]
    return out


def _op_bounds(op):
    def bb(j):
        return j.bounds() if not j.is_empty() else None
    if op[0] in ("union", "xor"):
        kids = op[1] if op[0] == "union" else [op[1], op[2]]
        bs = [b for b in (bb(j) for j in kids) if b]
        if not bs:
            return (0.0, 0.0, 0.0, 0.0)
        return (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
    a, b = bb(op[1]), bb(op[2])
    if a is None:
        return (0.0, 0.0, 0.0, 0.0)
    if op[0] == "subtract" or b is None:
        return a
    r = (max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3]))
    return r if r[0] < r[2] and r[1] < r[3] else (0.0, 0.0, 0.0, 0.0)


# ---------------- perataan kurva ----------------
def _n_seg(P, tol):
    """Jumlah ruas untuk kurva dengan titik kontrol P (k x 2, ruang perangkat)."""
    if len(P) == 3:
        d = np.hypot(*(P[0] - 2 * P[1] + P[2]))
        return int(min(256, max(1, math.ceil(math.sqrt(d / (4 * tol))))))
    d = max(np.hypot(*(P[0] - 2 * P[1] + P[2])), np.hypot(*(P[1] - 2 * P[2] + P[3])))
    return int(min(256, max(1, math.ceil(math.sqrt(0.75 * d / tol)))))


def _flatten(cmds, M, tol):
    """Perintah -> list (titik N x 2 ruang lokal, tertutup). Jumlah ruas dari ukuran kurva di ruang perangkat (M)."""
    out = []
    cur = []
    start = last = None
    persp = M is not None and M.has_perspective
    sc = 1.0
    if M is not None and not persp:
        a = M.m
        sc = math.sqrt(max(abs(a[0, 0] * a[1, 1] - a[0, 1] * a[1, 0]), 1e-12))
        sc = max(sc, math.hypot(a[0, 0], a[1, 0]), math.hypot(a[0, 1], a[1, 1]))

    def flush(close):
        if len(cur) >= 1:
            out.append((np.array(cur, np.float64), close))

    for c in cmds:
        k = c[0]
        if k == "M":
            flush(False)
            cur = [(c[1], c[2])]
            start = last = (c[1], c[2])
        elif k == "Z":
            if cur:
                flush(True)
            cur = []
            last = start
        else:
            if not cur:
                cur = [last if last is not None else (0.0, 0.0)]
                start = cur[0]
            if k == "L":
                cur.append((c[1], c[2]))
                last = (c[1], c[2])
            else:
                wk = c[5] if k == "K" else None
                P = np.array([last] + [(c[i], c[i + 1]) for i in range(1, 5 if k == "K" else len(c), 2)],
                             np.float64)
                if persp:
                    Pd = M.map_array(P)
                    if not np.all(np.isfinite(Pd)):
                        Pd = P * 50
                    n = _n_seg(Pd, tol)
                else:
                    n = _n_seg(P * sc, tol)
                t = np.linspace(0, 1, n + 1)[1:, None]
                if wk is not None:
                    den = (1 - t) ** 2 + 2 * wk * (1 - t) * t + t * t
                    q = ((1 - t) ** 2 * P[0] + 2 * wk * (1 - t) * t * P[1] + t * t * P[2]) / den
                elif len(P) == 3:
                    q = (1 - t) ** 2 * P[0] + 2 * (1 - t) * t * P[1] + t * t * P[2]
                else:
                    q = ((1 - t) ** 3 * P[0] + 3 * (1 - t) ** 2 * t * P[1] + 3 * (1 - t) * t * t * P[2]
                         + t ** 3 * P[3])
                cur.extend(map(tuple, q))
                last = (c[3], c[4]) if k == "K" else (c[-2], c[-1])
    flush(False)
    return out


# ---------------- path SVG ----------------
_SVG_TOK = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?")


def _svg_path(d):
    p = Path()
    toks = _SVG_TOK.findall(d)
    i, cmd = 0, None
    x = y = sx = sy = 0.0
    lc = None                        # titik kontrol terakhir (untuk S/T)
    lk = ""

    def num():
        nonlocal i
        v = float(toks[i])
        i += 1
        return v

    def flag():
        nonlocal i
        t = toks[i]
        if len(t) > 1 and t[0] in "01" and not t.startswith(("0.", "1.")):
            toks[i] = t[1:]
            return int(t[0])
        i += 1
        return int(float(t))
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            i += 1
            if cmd in "Zz":
                p.close()
                x, y = sx, sy
                lk = "Z"
            continue
        rel = cmd.islower()
        C = cmd.upper()
        ox, oy = (x, y) if rel else (0.0, 0.0)
        if C == "M":
            x, y = ox + num(), oy + num()
            p.move_to(x, y)
            sx, sy = x, y
            cmd = "l" if rel else "L"
            lk = "M"
        elif C == "L":
            x, y = ox + num(), oy + num()
            p.line_to(x, y)
            lk = "L"
        elif C == "H":
            x = ox + num()
            p.line_to(x, y)
            lk = "L"
        elif C == "V":
            y = (y if rel else 0.0) + num()
            p.line_to(x, y)
            lk = "L"
        elif C == "C":
            x1, y1, x2, y2 = ox + num(), oy + num(), ox + num(), oy + num()
            x, y = ox + num(), oy + num()
            p.cubic_to(x1, y1, x2, y2, x, y)
            lc, lk = (x2, y2), "C"
        elif C == "S":
            x1, y1 = (2 * x - lc[0], 2 * y - lc[1]) if lk == "C" else (x, y)
            x2, y2 = ox + num(), oy + num()
            x, y = ox + num(), oy + num()
            p.cubic_to(x1, y1, x2, y2, x, y)
            lc, lk = (x2, y2), "C"
        elif C == "Q":
            x1, y1 = ox + num(), oy + num()
            x, y = ox + num(), oy + num()
            p.quad_to(x1, y1, x, y)
            lc, lk = (x1, y1), "Q"
        elif C == "T":
            x1, y1 = (2 * x - lc[0], 2 * y - lc[1]) if lk == "Q" else (x, y)
            x, y = ox + num(), oy + num()
            p.quad_to(x1, y1, x, y)
            lc, lk = (x1, y1), "Q"
        elif C == "A":
            rx, ry, rot = num(), num(), num()
            fa, fs = flag(), flag()
            x2, y2 = ox + num(), oy + num()
            for seg in _arc(x, y, rx, ry, rot, fa, fs, x2, y2):
                p.cubic_to(*seg)
            x, y = x2, y2
            lk = "A"
        else:
            raise ValueError(_T("unknown SVG path command: %s", "perintah path SVG tidak dikenal: %s") % cmd)
    return p


def _arc(x1, y1, rx, ry, phi, fa, fs, x2, y2):
    """Busur elips SVG -> list kubik (x1, y1, x2, y2, x, y) (implementasi catatan SVG F.6)."""
    if rx == 0 or ry == 0 or (x1 == x2 and y1 == y2):
        return [(x1, y1, x2, y2, x2, y2)]
    rx, ry = abs(rx), abs(ry)
    ph = math.radians(phi)
    cp, sp = math.cos(ph), math.sin(ph)
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    xp, yp = cp * dx + sp * dy, -sp * dx + cp * dy
    lam = xp * xp / (rx * rx) + yp * yp / (ry * ry)
    if lam > 1:
        rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
    den = rx * rx * yp * yp + ry * ry * xp * xp
    co = math.sqrt(max(0.0, num / den)) * (-1 if fa == fs else 1)
    cxp, cyp = co * rx * yp / ry, -co * ry * xp / rx
    cx, cy = cp * cxp - sp * cyp + (x1 + x2) / 2, sp * cxp + cp * cyp + (y1 + y2) / 2

    def ang(u, v):
        a = math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])
        return a
    t1 = ang((1, 0), ((xp - cxp) / rx, (yp - cyp) / ry))
    dt = ang(((xp - cxp) / rx, (yp - cyp) / ry), ((-xp - cxp) / rx, (-yp - cyp) / ry))
    if not fs and dt > 0:
        dt -= 2 * math.pi
    elif fs and dt < 0:
        dt += 2 * math.pi
    n = max(1, int(math.ceil(abs(dt) / (math.pi / 2) - 1e-9)))
    d = dt / n
    k = 4 / 3 * math.tan(d / 4)
    out = []
    for i in range(n):
        a0, a1 = t1 + i * d, t1 + (i + 1) * d
        e0 = (math.cos(a0), math.sin(a0))
        e1 = (math.cos(a1), math.sin(a1))
        q = [(e0[0] - k * e0[1], e0[1] + k * e0[0]), (e1[0] + k * e1[1], e1[1] - k * e1[0]), e1]
        seg = []
        for u, v in q:
            X, Y = rx * u, ry * v
            seg += [cp * X - sp * Y + cx, sp * X + cp * Y + cy]
        out.append(tuple(seg))
    return out


# ---------------- pathfinder ----------------
def _op_skia(a, b, kind):
    op = {"union": skia.PathOp.kUnion_PathOp, "intersect": skia.PathOp.kIntersect_PathOp,
          "subtract": skia.PathOp.kDifference_PathOp, "xor": skia.PathOp.kXOR_PathOp}[kind]
    for x, y in ((a._sk, b._sk), (skia.Simplify(a._sk) or a._sk, skia.Simplify(b._sk) or b._sk)):
        try:
            r = skia.Op(x, y, op)
            if r is not None:
                return Path(r)
        except RuntimeError:
            pass
    return Path() if kind == "intersect" else a.copy()


@_old_kw({"jenis": "kind"})
def op(a, b, kind):
    """Safe pathfinder. kind: union | intersect | subtract | exclude (old: gabung | iris | kurang | xor).
    On skia failure: union/subtract -> a, intersect -> empty."""
    kind = _OP_KIND.get(kind, kind)
    if ENGINE == "skia":
        return _op_skia(a, b, kind)
    p = Path()
    p._op = ("union", [a.copy(), b.copy()]) if kind == "union" else (kind, a.copy(), b.copy())
    return p


def union(*ps):
    out = ps[0]
    for p in ps[1:]:
        out = op(out, p, "union")
    return out


def intersect(a, b):
    return op(a, b, "intersect")


def subtract(a, b):
    return op(a, b, "subtract")


def exclude(a, b):
    return op(a, b, "xor")


def union_all(paths):
    """Gabung banyak path sekaligus (skia OpBuilder). Kosong -> Path kosong."""
    paths = [p for p in paths if not p.is_empty()]
    if not paths:
        return Path()
    if ENGINE == "skia":
        b = skia.OpBuilder()
        for p in paths:
            b.add(p._sk, skia.PathOp.kUnion_PathOp)
        try:
            r = b.resolve()
        except RuntimeError:
            r = None
        return Path(r) if r is not None else Path()
    p = Path()
    p._op = ("union", [q.copy() for q in paths])
    return p


def simplify(p):
    if ENGINE == "skia":
        r = skia.Simplify(p._sk)
        return Path(r) if r is not None else p.copy()
    return p.copy()


# ---------------- ukur (PathMeasure) ----------------
class Contour:
    """Satu kontur terukur: panjang, tertutup, pos_tan(d) -> ((x, y), (tx, ty)) satuan."""

    @_old_kw({"titik": "points", "tertutup": "closed"})
    def __init__(self, points, closed, _skm=None):
        self.closed = closed
        self._skm = _skm
        if _skm is not None:
            self.length = float(_skm.getLength())
            return
        P = np.asarray(points, np.float64)
        if closed and len(P) > 1 and np.hypot(*(P[0] - P[-1])) > 1e-9:
            P = np.vstack([P, P[:1]])
        self._P = P
        seg = np.hypot(*np.diff(P, axis=0).T) if len(P) > 1 else np.zeros(0)
        self._s = np.concatenate([[0.0], np.cumsum(seg)])
        self.length = float(self._s[-1])

    def pos_tan(self, d):
        if self._skm is not None:
            pos, tan = self._skm.getPosTan(float(d))
            return (pos.x(), pos.y()), (tan.x(), tan.y())
        s = self._s
        d = min(max(d, 0.0), s[-1])
        j = int(np.searchsorted(s, d, side="right")) - 1
        j = min(max(j, 0), len(s) - 2)
        while j < len(s) - 2 and s[j + 1] - s[j] <= 1e-12:
            j += 1
        L = s[j + 1] - s[j]
        t = (d - s[j]) / L if L > 0 else 0.0
        a, b = self._P[j], self._P[j + 1]
        dx, dy = b - a
        n = math.hypot(dx, dy) or 1.0
        return (a[0] + dx * t, a[1] + dy * t), (dx / n, dy / n)


@_old_kw({"jalur": "path"})
def measure(path, tol=0.05):
    """Iterator kontur terukur (PathMeasure). Pakai sekali jalan: di mesin skia tiap Contour hanya sah sampai kontur
    berikutnya diambil (pakai list() hanya di mesin murni)."""
    if ENGINE == "skia":
        m = skia.PathMeasure(path._sk, False)
        while True:
            yield Contour(None, m.isClosed(), _skm=m)
            if not m.nextContour():
                break
        return
    for P, close in path.contours(tol):
        k = Contour(P, close)
        if k.length > 0:
            yield k


def _cmds_from_skia(sp):
    """skia.Path -> daftar perintah (conic jadi "K")."""
    out = []
    it = skia.Path.Iter(sp, False)
    V = skia.Path.Verb
    while True:
        verb, pts = it.next()
        if verb == V.kDone_Verb:
            break
        if verb == V.kMove_Verb:
            out.append(("M", pts[0].x(), pts[0].y()))
        elif verb == V.kLine_Verb:
            out.append(("L", pts[1].x(), pts[1].y()))
        elif verb == V.kQuad_Verb:
            out.append(("Q", pts[1].x(), pts[1].y(), pts[2].x(), pts[2].y()))
        elif verb == V.kConic_Verb:
            out.append(("K", pts[1].x(), pts[1].y(), pts[2].x(), pts[2].y(), it.conicWeight()))
        elif verb == V.kCubic_Verb:
            out.append(("C", pts[1].x(), pts[1].y(), pts[2].x(), pts[2].y(), pts[3].x(), pts[3].y()))
        elif verb == V.kClose_Verb:
            out.append(("Z",))
    return out


# ---------------- cat ----------------
class Gradient:
    @_old_kw({"jenis": "kind", "warna_list": "colors", "posisi": "positions", "ulang": "tile_mode"})
    def __init__(self, kind, geo, colors, positions, tile_mode):
        self.kind, self.geo = kind, geo
        self.colors = [_w4(c) for c in colors]
        n = len(self.colors)
        self.positions = list(positions) if positions is not None else [i / (n - 1) for i in range(n)]
        self.tile_mode = tile_mode

    def to_skia(self):
        cols = [_argb(c) for c in self.colors]
        mode = {"clamp": skia.TileMode.kClamp, "repeat": skia.TileMode.kRepeat,
                "mirror": skia.TileMode.kMirror}[self.tile_mode]
        if self.kind == "linear":
            (x0, y0), (x1, y1) = self.geo
            return skia.GradientShader.MakeLinear([skia.Point(x0, y0), skia.Point(x1, y1)], cols, self.positions, mode)
        (cx, cy), r = self.geo
        return skia.GradientShader.MakeRadial(skia.Point(cx, cy), r, cols, self.positions, mode)

    def sample(self, X, Y):
        """Warna premultiplied (…, 4) di titik lokal X, Y."""
        if self.kind == "linear":
            (x0, y0), (x1, y1) = self.geo
            dx, dy = x1 - x0, y1 - y0
            L2 = dx * dx + dy * dy or 1.0
            t = ((X - x0) * dx + (Y - y0) * dy) / L2
        else:
            (cx, cy), r = self.geo
            t = np.hypot(X - cx, Y - cy) / (r or 1.0)
        if self.tile_mode == "repeat":
            t = t - np.floor(t)
        elif self.tile_mode == "mirror":
            t = 1 - np.abs((t % 2) - 1)
        t = np.clip(t, 0, 1)
        C = np.array(self.colors)
        out = np.stack([np.interp(t, self.positions, C[:, k]) for k in range(4)], -1)
        out[..., :3] *= out[..., 3:4]
        return out.astype(np.float32)


@_old_kw({"warna_list": "colors", "posisi": "positions", "ulang": "tile_mode"})
def linear_gradient(p0, p1, colors, positions=None, tile_mode="clamp"):
    return Gradient("linear", (tuple(p0), tuple(p1)), colors, positions, tile_mode)


@_old_kw({"pusat": "center", "warna_list": "colors", "posisi": "positions", "ulang": "tile_mode"})
def radial_gradient(center, r, colors, positions=None, tile_mode="clamp"):
    return Gradient("radial", (tuple(center), float(r)), colors, positions, tile_mode)


_BLENDS = ("normal", "multiply", "modulate", "clear", "screen", "src", "dst_in", "dst_out", "plus", "darken",
           "lighten", "src_in", "src_atop", "dst_over")


class Paint:
    """Paint. color: hex int or (r, g, b[, a]) float 0..1; alpha multiplies the colour alpha. style/cap/join accept the
    English values and the old ones (isi/garis/isi_garis, datar/bulat/kotak, runcing/bulat/serong)."""

    @_old_kw({"warna": "color", "alfa": "alpha", "gaya": "style", "tebal": "width", "ujung": "cap", "sambung": "join", "campur": "blend", "batas_runcing": "miter_limit"})
    def __init__(self, color=0x000000, alpha=1.0, style="fill", width=0.0, cap="butt", join="miter",
                 blend="normal", shader=None, aa=True, miter_limit=4.0):
        self.color = _w4(color, alpha)
        self.style, self.width = _STYLE.get(style, style), float(width)
        self.cap, self.join = _CAP.get(cap, cap), _JOIN.get(join, join)
        if blend not in _BLENDS:
            raise ValueError(_T("unknown blend mode: %s", "campur tidak dikenal: %s") % blend)
        self.blend, self.shader, self.aa, self.miter_limit = blend, shader, aa, float(miter_limit)

    def copy(self, **kw):
        c = Paint.__new__(Paint)
        c.__dict__.update(self.__dict__)
        for k, v in kw.items():
            k = _PAINT_OLD.get(k, k)
            if k == "color":
                v = _w4(v)
            elif k == "style":
                v = _STYLE.get(v, v)
            elif k == "cap":
                v = _CAP.get(v, v)
            elif k == "join":
                v = _JOIN.get(v, v)
            setattr(c, k, v)
        return c

    def to_skia(self):
        p = skia.Paint(AntiAlias=self.aa)
        p.setColor4f(skia.Color4f(*self.color))
        p.setStyle({"fill": skia.Paint.kFill_Style, "stroke": skia.Paint.kStroke_Style,
                    "stroke_and_fill": skia.Paint.kStrokeAndFill_Style}[self.style])
        p.setStrokeWidth(self.width)
        p.setStrokeCap({"butt": skia.Paint.kButt_Cap, "round": skia.Paint.kRound_Cap,
                        "square": skia.Paint.kSquare_Cap}[self.cap])
        p.setStrokeJoin({"miter": skia.Paint.kMiter_Join, "round": skia.Paint.kRound_Join,
                         "bevel": skia.Paint.kBevel_Join}[self.join])
        p.setStrokeMiter(self.miter_limit)
        if self.blend != "normal":
            p.setBlendMode(_SK_BLENDS()[self.blend])
        if self.shader is not None:
            p.setShader(self.shader.to_skia())
        return p


def _SK_BLENDS():
    B = skia.BlendMode
    return {"normal": B.kSrcOver, "multiply": B.kMultiply, "modulate": B.kModulate, "clear": B.kClear,
            "screen": B.kScreen, "src": B.kSrc, "dst_in": B.kDstIn, "dst_out": B.kDstOut, "plus": B.kPlus,
            "darken": B.kDarken, "lighten": B.kLighten, "src_in": B.kSrcIn, "src_atop": B.kSrcATop,
            "dst_over": B.kDstOver}


# ---------------- huruf ----------------
_FONTS = {}


def _find_font(name):
    dirs = [os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Windows", "Fonts"),
            os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts"),
            os.path.expanduser("~/.fonts"), os.path.expanduser("~/.local/share/fonts"), "/usr/share/fonts",
            "/usr/local/share/fonts", "/Library/Fonts", "/System/Library/Fonts", os.path.expanduser("~/Library/Fonts")]
    files = []
    for d in dirs:
        if os.path.isdir(d):
            for root, _, fs in os.walk(d):
                files += [os.path.join(root, f) for f in fs if f.lower().endswith((".ttf", ".otf", ".ttc"))]
    low = {os.path.basename(f).lower(): f for f in files}
    n = name.lower().replace(" ", "")
    for cand in (n + "-regular.otf", n + "-regular.ttf", n + ".ttf", n + ".otf", n + "variable.ttf",
                 n + "[opsz,wght].ttf", "arial.ttf", "segoeui.ttf", "dejavusans.ttf", "liberationsans-regular.ttf",
                 "helvetica.ttc", "notosans-regular.ttf"):
        if cand in low:
            return low[cand]
    for b, f in low.items():
        if b.startswith(n):
            return f
    return None


class Font:
    @_old_kw({"nama": "name", "ukuran": "size"})
    def __init__(self, name="Inter", size=17.0):
        self.name, self.size = name, float(size)
        self._sk = None

    def to_skia(self):
        if self._sk is None:
            self._sk = skia.Font(skia.Typeface(self.name), self.size)
        return self._sk

    @_old_kw({"ukuran": "size"})
    def pil(self, size=None):
        u = size or self.size
        key = (self.name, round(u * 4) / 4)
        if key not in _FONTS:
            f = _find_font(self.name)
            try:
                _FONTS[key] = ImageFont.truetype(f, key[1]) if f else ImageFont.load_default(key[1])
            except Exception:
                _FONTS[key] = ImageFont.load_default()
        return _FONTS[key]

    @_old_kw({"teks": "text"})
    def measure_text(self, text):
        if ENGINE == "skia":
            return self.to_skia().measureText(text)
        return self.pil().getlength(text)


# ---------------- citra ----------------
class Image:
    """Gambar RGBA. from_array: uint8 H x W x 4 (tanpa premultiply) atau H x W x 3."""

    def __init__(self, _sk=None, _rgba=None):
        self._sk, self._rgba = _sk, _rgba
        self._pm = None

    @staticmethod
    def from_array(a):
        a = np.asarray(a)
        if a.ndim == 3 and a.shape[2] == 3:
            a = np.dstack([a, np.full(a.shape[:2], 255, np.uint8)])
        a = np.ascontiguousarray(a.astype(np.uint8))
        if ENGINE == "skia":
            return Image(_sk=skia.Image.fromarray(a, colorType=skia.kRGBA_8888_ColorType))
        return Image(_rgba=a)

    @staticmethod
    def open(path):
        if ENGINE == "skia":
            im = skia.Image.open(path)
            if im is None:
                raise IOError(_T("cannot open %s", "gagal membuka %s") % path)
            return Image(_sk=im)
        return Image(_rgba=np.asarray(_PILImage.open(path).convert("RGBA")).copy())

    @property
    def width(self):
        return self._sk.width() if self._sk is not None else (self._rgba.shape[1] if self._rgba is not None
                                                               else self._pm.shape[1])

    @property
    def height(self):
        return self._sk.height() if self._sk is not None else (self._rgba.shape[0] if self._rgba is not None
                                                                else self._pm.shape[0])

    def array(self):
        if self._sk is not None:
            return self._sk.toarray(colorType=skia.kRGBA_8888_ColorType)
        if self._rgba is None:
            self._rgba = _unpremul(self._pm)
        return self._rgba.copy()

    def save(self, path):
        if self._sk is not None:
            self._sk.save(path, skia.kPNG)
        else:
            _PILImage.fromarray(self.array(), "RGBA").save(path)
        return path

    def _premul(self):
        if self._pm is None:
            a = self._rgba.astype(np.float32) / 255.0
            a[..., :3] *= a[..., 3:4]
            self._pm = a
        return self._pm

    def to_skia(self):
        return self._sk


def _unpremul(b):
    a = b[..., 3:4]
    out = np.empty(b.shape, np.float32)
    np.divide(b[..., :3], np.maximum(a, np.float32(1e-12)), out=out[..., :3])
    out[..., 3:4] = a
    out *= 255
    out += 0.5
    np.clip(out, 0, 255, out=out)
    return out.astype(np.uint8)


# ---------------- permukaan + kanvas ----------------
class Surface:
    def __init__(self, w, h):
        self.w, self.h = int(w), int(h)
        if ENGINE == "skia":
            self._sk = skia.Surface(self.w, self.h)
            self.canvas = Canvas(self, self._sk.getCanvas())
        else:
            self._buf = np.zeros((self.h, self.w, 4), np.float32)
            self.canvas = Canvas(self, None)

    def image(self):
        if ENGINE == "skia":
            return Image(_sk=self._sk.makeImageSnapshot())
        c = Image(_rgba=None)
        c._pm = np.floor(self._buf * 255 + 0.5) * np.float32(1 / 255.0)     # snapshot 8 bit premultiplied
        c._wh = (self.w, self.h)
        return c

    def array(self):
        """RGBA uint8 tanpa premultiply."""
        if ENGINE == "skia":
            return self._sk.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)
        return _unpremul(self._buf)

    def save(self, path):
        if ENGINE == "skia":
            self._sk.makeImageSnapshot().save(path, skia.kPNG)
        else:
            _PILImage.fromarray(self.array(), "RGBA").save(path)
        return path

    def to_skia(self):
        return self._sk


class _State:
    __slots__ = ("M", "clip", "kb")

    def __init__(self, M, clip, kb):
        self.M, self.clip, self.kb = M, clip, kb


class Canvas:
    def __init__(self, surf, skc):
        self._surf, self._skc = surf, skc
        if skc is None:
            self._st = _State(Matrix(), None, (0, 0, surf.w, surf.h))
            self._stack = []
            self._target = surf._buf
            self._dirty = None

    def _mark(self, r):
        k = self._dirty
        self._dirty = r if k is None else (min(k[0], r[0]), min(k[1], r[1]), max(k[2], r[2]), max(k[3], r[3]))

    def __getattr__(self, name):
        # kompatibilitas: method skia asli (drawPath, clipPath, ...) diteruskan ke kanvas skia
        skc = self.__dict__.get("_skc")
        if skc is not None:
            return getattr(skc, name)
        raise AttributeError(name)

    def to_skia(self):
        return self._skc

    # --- keadaan ---
    def save(self):
        if self._skc is not None:
            self._skc.save()
            return
        self._stack.append(("s", _State(self._st.M, self._st.clip, self._st.kb)))

    @_old_kw({"cat": "paint"})
    def save_layer(self, paint=None):
        """saveLayer: new transparent layer; restore() composites it with the paint alpha + blend."""
        if self._skc is not None:
            self._skc.saveLayer(None, paint.to_skia() if paint is not None else None)
            return
        self._stack.append(("l", _State(self._st.M, self._st.clip, self._st.kb), self._target, paint, self._dirty))
        self._target = np.zeros_like(self._surf._buf)
        self._dirty = None

    def restore(self):
        if self._skc is not None:
            self._skc.restore()
            return
        if not self._stack:
            return
        e = self._stack.pop()
        if e[0] == "s":
            self._st = e[1]
            return
        _, st, target, paint, dirty = e
        layer = self._target
        lk = self._dirty
        self._target = target
        self._dirty = dirty
        self._st = st
        kb = st.kb
        mode = paint.blend if paint is not None else "normal"
        if mode in ("normal", "multiply", "screen", "plus", "darken", "lighten", "dst_over", "src_atop"):
            if lk is None:                     # lapis kosong: komposit tidak mengubah apa pun
                return
            kb = (max(kb[0], lk[0]), max(kb[1], lk[1]), min(kb[2], lk[2]), min(kb[3], lk[3]))
        x0, y0, x1, y1 = kb
        if x1 <= x0 or y1 <= y0:
            return
        src = layer[y0:y1, x0:x1]
        a = paint.color[3] if paint is not None else 1.0
        if a != 1.0:
            src = src * a
        cov = st.clip[y0:y1, x0:x1] if st.clip is not None else None
        _composite(target, (x0, y0, x1, y1), src, cov, mode)
        self._mark((x0, y0, x1, y1))

    def translate(self, dx, dy):
        if self._skc is not None:
            self._skc.translate(dx, dy)
        else:
            self._st.M = self._st.M @ Matrix.translate(dx, dy)

    def scale(self, sx, sy=None):
        sy = sx if sy is None else sy
        if self._skc is not None:
            self._skc.scale(sx, sy)
        else:
            self._st.M = self._st.M @ Matrix.scale(sx, sy)

    def rotate(self, deg, px=None, py=None):
        if self._skc is not None:
            if px is None:
                self._skc.rotate(deg)
            else:
                self._skc.rotate(deg, px, py)
        else:
            self._st.M = self._st.M @ Matrix.rotate(deg, px or 0.0, py or 0.0)

    def concat(self, M):
        if self._skc is not None:
            self._skc.concat(M.to_skia())
        else:
            self._st.M = self._st.M @ M

    def total_matrix(self):
        if self._skc is not None:
            m = self._skc.getTotalMatrix()
            return Matrix([[m.get(i) for i in range(3 * r, 3 * r + 3)] for r in range(3)])
        return Matrix(self._st.M.m)

    def clear(self, w=0xFFFFFF):
        c = _w4(w)
        if self._skc is not None:
            self._skc.clear(skia.Color4f(*c).toColor() if len(c) == 4 else c)
            return
        # skia clear mengabaikan matriks/klip; warna dibulatkan ke 8 bit
        c8 = np.round(np.array(c) * 255) / 255.0
        self._target[...] = np.array([c8[0] * c8[3], c8[1] * c8[3], c8[2] * c8[3], c8[3]], np.float32)
        self._mark((0, 0, self._surf.w, self._surf.h))

    # --- klip ---
    @_old_kw({"jalur": "path"})
    def clip_path(self, path, aa=True):
        if self._skc is not None:
            self._skc.clipPath(path._sk, skia.ClipOp.kIntersect, aa)
            return
        self._clip(_Shape.path(path, self._st.M), aa)

    def clip_rect(self, x0, y0, x1, y1, aa=False):
        if self._skc is not None:
            self._skc.clipRect(skia.Rect(x0, y0, x1, y1), skia.ClipOp.kIntersect, aa)
            return
        self._clip(_Shape.rect(x0, y0, x1, y1, self._st.M), aa)

    def _clip(self, shape, aa):
        H, W = self._surf.h, self._surf.w
        kb = self._st.kb
        r = shape.device_rect(kb)
        new = np.zeros((H, W), np.float32)
        if r is not None:
            x0, y0, x1, y1 = r
            cov = shape.coverage(r, aa)
            if self._st.clip is not None:
                cov = cov * self._st.clip[y0:y1, x0:x1]
            new[y0:y1, x0:x1] = cov
            nz = np.argwhere(new[y0:y1, x0:x1] > 0)
            kb = (x0 + int(nz[:, 1].min()), y0 + int(nz[:, 0].min()), x0 + int(nz[:, 1].max()) + 1,
                  y0 + int(nz[:, 0].max()) + 1) if len(nz) else (0, 0, 0, 0)
        else:
            kb = (0, 0, 0, 0)
        self._st = _State(self._st.M, new, kb)

    # --- gambar ---
    @_old_kw({"jalur": "path", "cat": "paint"})
    def draw_path(self, path, paint):
        if self._skc is not None:
            self._skc.drawPath(path._sk, paint.to_skia())
            return
        self._draw(_Shape.path(path, self._st.M), paint)

    @_old_kw({"cat": "paint"})
    def draw_rect(self, x0, y0, x1, y1, paint):
        if self._skc is not None:
            self._skc.drawRect(skia.Rect(x0, y0, x1, y1), paint.to_skia())
            return
        if paint.style == "fill":
            self._draw(_Shape.rect(x0, y0, x1, y1, self._st.M), paint)
        else:
            self.draw_path(Path().rect(x0, y0, x1, y1), paint)

    @_old_kw({"cat": "paint"})
    def draw_round_rect(self, x0, y0, x1, y1, rx, ry, paint):
        if self._skc is not None:
            self._skc.drawRoundRect(skia.Rect(x0, y0, x1, y1), rx, ry, paint.to_skia())
            return
        self.draw_path(Path().round_rect(x0, y0, x1, y1, rx, ry), paint)

    @_old_kw({"cat": "paint"})
    def draw_oval(self, x0, y0, x1, y1, paint):
        if self._skc is not None:
            self._skc.drawOval(skia.Rect(x0, y0, x1, y1), paint.to_skia())
            return
        self.draw_path(Path().oval(x0, y0, x1, y1), paint)

    @_old_kw({"cat": "paint"})
    def draw_circle(self, cx, cy, r, paint):
        if self._skc is not None:
            self._skc.drawCircle(cx, cy, r, paint.to_skia())
            return
        self.draw_path(Path().circle(cx, cy, r), paint)

    @_old_kw({"cat": "paint"})
    def draw_line(self, x0, y0, x1, y1, paint):
        """A line is always stroked (like skia drawLine); width 0 = 1 px hairline."""
        if self._skc is not None:
            self._skc.drawLine(x0, y0, x1, y1, paint.to_skia())
            return
        c = paint if paint.style == "stroke" else paint.copy(style="stroke")
        self.draw_path(Path().move_to(x0, y0).line_to(x1, y1), c)

    @_old_kw({"teks": "text", "huruf": "font", "cat": "paint"})
    def draw_text(self, text, x, y, font, paint):
        """Teks berawal di (x, y) garis dasar kiri."""
        if self._skc is not None:
            self._skc.drawString(text, x, y, font.to_skia(), paint.to_skia())
            return
        M = self._st.M
        sc = math.sqrt(abs(M.m[0, 0] * M.m[1, 1] - M.m[0, 1] * M.m[1, 0])) if not M.has_perspective else 1.0
        sc = sc or 1.0
        # render 4x lalu diperkecil (kotak 4 x 4): jarak huruf tanpa pembulatan hinting, mirip skia drawString
        Q = 4
        f = font.pil(font.size * sc * Q)
        l, t, r, b = f.getbbox(text, anchor="ls")
        if r <= l or b <= t:
            return
        l, t = (math.floor(l / Q) - 2) * Q, (math.floor(t / Q) - 2) * Q
        w, h = int(math.ceil((r - l) / Q)) + 2, int(math.ceil((b - t) / Q)) + 2
        im = _PILImage.new("L", (w * Q, h * Q), 0)
        ImageDraw.Draw(im).text((-l, -t), text, font=f, fill=255, anchor="ls")
        m = np.asarray(im, np.float32).reshape(h, Q, w, Q).mean(axis=(1, 3)) / 255.0
        l, t, pad = l / Q, t / Q, 0
        c = paint.color
        rgba = np.zeros((h, w, 4), np.float32)
        rgba[..., 3] = m * c[3]
        rgba[..., :3] = np.array(c[:3], np.float32) * rgba[..., 3:4]
        img = Image(_rgba=None)
        img._pm = rgba
        self.save()
        self.translate(x, y)
        self.scale(1 / sc, 1 / sc)
        self.translate(l - pad, t - pad)
        self._image(img, w, h, None, True, paint.blend)
        self.restore()

    @_old_kw({"citra": "image", "cat": "paint", "halus": "antialias"})
    def draw_image(self, image, x=0.0, y=0.0, paint=None, antialias=True):
        if self._skc is not None:
            so = skia.SamplingOptions(skia.FilterMode.kLinear if antialias else skia.FilterMode.kNearest)
            self._skc.drawImage(image._sk, x, y, so, paint.to_skia() if paint is not None else None)
            return
        self.save()
        self.translate(x, y)
        self._image(image, image.width, image.height, paint, antialias)
        self.restore()

    @_old_kw({"citra": "image", "kotak": "rect", "cat": "paint", "halus": "antialias"})
    def draw_image_rect(self, image, rect, paint=None, antialias=True):
        x0, y0, x1, y1 = rect
        if self._skc is not None:
            so = skia.SamplingOptions(skia.FilterMode.kLinear if antialias else skia.FilterMode.kNearest)
            self._skc.drawImageRect(image._sk, skia.Rect(x0, y0, x1, y1), so, paint.to_skia() if paint else None)
            return
        self.save()
        self.translate(x0, y0)
        self.scale((x1 - x0) / image.width, (y1 - y0) / image.height)
        self._image(image, image.width, image.height, paint, antialias)
        self.restore()

    # --- mesin murni ---
    def _draw(self, shape, paint):
        if paint.style in ("stroke", "stroke_and_fill"):
            stroke_shape = shape.stroke(paint)
            if paint.style == "stroke_and_fill":
                b2 = _Shape(("union", [shape.node, stroke_shape.node]), shape.M)
                self._fill(b2, paint)
            else:
                self._fill(stroke_shape, paint)
            return
        self._fill(shape, paint)

    def _fill(self, shape, paint):
        kb = self._blend_bounds(paint.blend)
        if kb is None:
            return
        r = shape.device_rect(kb)
        if r is None:
            return
        cov = shape.coverage(r, paint.aa)
        x0, y0, x1, y1 = r
        if self._st.clip is not None:
            cov = cov * self._st.clip[y0:y1, x0:x1]
        if paint.shader is not None:
            Mi = self._st.M.invert()
            if Mi is None:
                return
            yy, xx = np.mgrid[y0:y1, x0:x1] + 0.5
            P = Mi.map_array(np.stack([xx, yy], -1))
            src = paint.shader.sample(P[..., 0], P[..., 1]) * paint.color[3]
        else:
            c = paint.color
            src = np.array([c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]], np.float32)
        _composite(self._target, r, src, cov, paint.blend)
        self._mark(r)

    def _blend_bounds(self, mode):
        """Kotak boleh-ubah: mode yang hasilnya 0 di atas tujuan transparan cukup dihitung di area kotor lapis."""
        kb = self._st.kb
        if mode in ("modulate", "src_in", "dst_in") and any(e[0] == "l" for e in self._stack):
            k = self._dirty
            if k is None:
                return None
            kb = (max(kb[0], k[0]), max(kb[1], k[1]), min(kb[2], k[2]), min(kb[3], k[3]))
        return kb

    def _image(self, image, w, h, paint, antialias, blend=None):
        M = self._st.M
        mode = blend or (paint.blend if paint is not None else "normal")
        kb = self._blend_bounds(mode)
        if kb is None:
            return
        Mi = M.invert()
        if Mi is None:
            return
        Wc = M.m[2, 0] * np.array([0, w, w, 0]) + M.m[2, 1] * np.array([0, 0, h, h]) + M.m[2, 2]
        if M.has_perspective and not np.all(Wc > 0):
            # sudut citra melintasi garis tak hingga: cakupan dari pemetaan balik per piksel (2 x 2 sampel, w > 0),
            # sama dengan perilaku skia (shader dibaca lewat matriks balik)
            r = kb
            x0, y0, x1, y1 = r
            if x1 <= x0 or y1 <= y0:
                return
            cov = np.zeros((y1 - y0, x1 - x0), np.float32)
            for oy in (0.25, 0.75):
                for ox in (0.25, 0.75):
                    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
                    xx += ox
                    yy += oy
                    m = Mi.m
                    qw = m[2, 0] * xx + m[2, 1] * yy + m[2, 2]
                    qx = (m[0, 0] * xx + m[0, 1] * yy + m[0, 2]) / qw
                    qy = (m[1, 0] * xx + m[1, 1] * yy + m[1, 2]) / qw
                    cov += ((qw > 0) & (qx >= 0) & (qx < w) & (qy >= 0) & (qy < h)) * np.float32(0.25)
        else:
            shape = _Shape.rect(0, 0, w, h, M)
            r = shape.device_rect(kb)
            if r is None:
                return
            x0, y0, x1, y1 = r
            cov = shape.coverage(r, True)
        if self._st.clip is not None:
            cov = cov * self._st.clip[y0:y1, x0:x1]
        yy, xx = np.mgrid[y0:y1, x0:x1] + 0.5
        P = Mi.map_array(np.stack([xx, yy], -1))
        src = _sample_image(image._premul(), P[..., 0], P[..., 1], antialias)
        a = paint.color[3] if paint is not None else 1.0
        if a != 1.0:
            src = src * a
        _composite(self._target, r, src, cov, mode)
        self._mark(r)


def _sample_image(img, X, Y, antialias):
    h, w = img.shape[:2]
    flat = img.reshape(-1, 4)
    if not antialias:
        ix = np.clip(np.floor(X).astype(np.int32), 0, w - 1)
        iy = np.clip(np.floor(Y).astype(np.int32), 0, h - 1)
        return flat[iy * w + ix]
    u = (X - 0.5).astype(np.float32)
    v = (Y - 0.5).astype(np.float32)
    fi, fj = np.floor(u), np.floor(v)
    fu, fv = (u - fi)[..., None], (v - fj)[..., None]
    i0 = fi.astype(np.int32)
    j0 = fj.astype(np.int32)
    i0c, i1c = np.clip(i0, 0, w - 1), np.clip(i0 + 1, 0, w - 1)
    j0c, j1c = np.clip(j0, 0, h - 1) * w, np.clip(j0 + 1, 0, h - 1) * w
    top = flat[j0c + i0c]
    top += (flat[j0c + i1c] - top) * fu
    bot = flat[j1c + i0c]
    bot += (flat[j1c + i1c] - bot) * fu
    top += (bot - top) * fv
    return top


def _composite(target, r, src, cov, mode):
    """Komposit premultiplied: hasil = d + cov x (campur(s, d) - d)."""
    x0, y0, x1, y1 = r
    d = target[y0:y1, x0:x1]
    src = np.asarray(src, np.float32)
    if mode == "normal" and src.ndim == 1:
        # warna rata (kasus tersering): operasi float32 yang sama, tanpa menyiarkan src ke ukuran penuh
        out = d * (np.float32(1) - src[3])
        np.add(src, out, out=out)
    else:
        out = None
    s = np.broadcast_to(src, d.shape)
    sa, da = s[..., 3:4], d[..., 3:4]
    if out is not None:
        pass
    elif mode == "normal":
        out = s + d * (1 - sa)
    elif mode == "multiply":
        out = s * (1 - da) + d * (1 - sa) + s * d
    elif mode == "modulate":
        out = s * d
    elif mode == "clear":
        out = np.zeros_like(d)
    elif mode == "screen":
        out = s + d - s * d
    elif mode == "src":
        out = s.copy()
    elif mode == "dst_in":
        out = d * sa
    elif mode == "dst_out":
        out = d * (1 - sa)
    elif mode == "src_in":
        out = s * da
    elif mode == "src_atop":
        out = s * da + d * (1 - sa)
    elif mode == "dst_over":
        out = d + s * (1 - da)
    elif mode == "plus":
        out = np.minimum(s + d, 1.0)
    elif mode in ("darken", "lighten"):
        f = np.maximum if mode == "darken" else np.minimum
        rgb = s[..., :3] + d[..., :3] - f(s[..., :3] * da, d[..., :3] * sa)
        out = np.concatenate([rgb, sa + da - sa * da], -1)
    else:
        raise ValueError(mode)
    if cov is None:
        target[y0:y1, x0:x1] = out
    else:
        # d + cov x (out - d), di tempat (urutan operasi sama, tanpa larik sementara tambahan)
        np.subtract(out, d, out=out)
        np.multiply(out, cov[..., None], out=out)
        np.add(d, out, out=d)


# ---------------- rasterisasi (mesin murni) ----------------
class _Shape:
    """Geometri siap raster: node = ("leaf", poligon_perangkat, evenodd) | ("rect", x0, y0, x1, y1) |
    ("union", [node]) | ("intersect"|"subtract"|"xor", a, b). M = matriks saat dibuat (untuk goresan)."""

    def __init__(self, node, M, source=None):
        self.node, self.M, self.source = node, M, source

    @staticmethod
    def path(j, M):
        return _Shape(_node_path(j, M), M, j)

    @staticmethod
    def rect(x0, y0, x1, y1, M):
        if not M.has_perspective and abs(M.m[0, 1]) < 1e-12 and abs(M.m[1, 0]) < 1e-12:
            a, b = M.map_point(x0, y0), M.map_point(x1, y1)
            return _Shape(("rect", min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])), M)
        P = np.array([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], float)
        return _Shape(("leaf", _project([P], M), False), M)

    def stroke(self, paint):
        j = self.source if self.source is not None else Path()
        if self.source is None and self.node[0] == "rect":
            pass
        return _Shape(_node_stroke(j, self.M, paint), self.M)

    def device_rect(self, kb):
        b = _node_bounds(self.node)
        if b is None:
            return None
        x0 = max(kb[0], int(math.floor(b[0])))
        y0 = max(kb[1], int(math.floor(b[1])))
        x1 = min(kb[2], int(math.ceil(b[2])) + 1)
        y1 = min(kb[3], int(math.ceil(b[3])) + 1)
        if x1 <= x0 or y1 <= y0:
            return None
        return (x0, y0, x1, y1)

    def coverage(self, r, aa=True):
        x0, y0, x1, y1 = r
        S = SS if aa else 1
        if self.node[0] == "rect":
            _, a, b, c, d = self.node
            if aa:
                cx = np.clip(np.minimum(np.arange(x0, x1) + 1, c) - np.maximum(np.arange(x0, x1), a), 0, 1)
                cy = np.clip(np.minimum(np.arange(y0, y1) + 1, d) - np.maximum(np.arange(y0, y1), b), 0, 1)
                return (cy[:, None] * cx[None, :]).astype(np.float32)
            xs, ys = np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5
            return (((ys >= b) & (ys < d))[:, None] & ((xs >= a) & (xs < c))[None, :]).astype(np.float32)
        h, w = y1 - y0, x1 - x0
        out = np.empty((h, w), np.float32)
        band = int(min(h, max(4, 1500000 // max(1, w * S * S))))
        prep = _prepare(self.node, x0, S)
        for b0 in range(0, h, band):
            b1 = min(h, b0 + band)
            m = _evaluate(prep, x0, y0 + b0, w, b1 - b0, S)
            if S == 1:
                out[b0:b1] = m
            else:
                # jumlah sampel per piksel (uint8, sumbu rapat dulu) lalu / S^2 di float32: sama persis dengan mean()
                n = m.view(np.uint8).reshape((b1 - b0) * S, w, S).sum(-1, dtype=np.uint8)
                n = n.reshape(b1 - b0, S, w).sum(1, dtype=np.uint8)
                np.divide(n, np.float32(S * S), out=out[b0:b1], dtype=np.float32)
        return out


def _project(polys, M):
    """Poligon lokal -> perangkat; perspektif: klip di W > eps (bidang dekat homogen) sebelum dibagi."""
    out = []
    for P in polys:
        if len(P) < 2:
            continue
        if not M.has_perspective:
            out.append(M.map_array(P))
            continue
        m = M.m
        X = P[:, 0] * m[0, 0] + P[:, 1] * m[0, 1] + m[0, 2]
        Y = P[:, 0] * m[1, 0] + P[:, 1] * m[1, 1] + m[1, 2]
        Wh = P[:, 0] * m[2, 0] + P[:, 1] * m[2, 1] + m[2, 2]
        eps = 1e-6
        if np.all(Wh > eps):
            out.append(np.stack([X / Wh, Y / Wh], -1))
            continue
        Q = np.stack([X, Y, Wh], -1)
        res = []
        n = len(Q)
        for i in range(n):
            a, b = Q[i], Q[(i + 1) % n]
            ia, ib = a[2] > eps, b[2] > eps
            if ia:
                res.append(a)
            if ia != ib:
                t = (eps - a[2]) / (b[2] - a[2])
                res.append(a + (b - a) * t)
        if len(res) >= 3:
            R = np.array(res)
            out.append(np.clip(R[:, :2] / R[:, 2:3], -1e6, 1e6))
    return out


def _node_path(j, M):
    if j._op is not None:
        op = j._op
        if op[0] == "union":
            return ("union", [_node_path(k, M) for k in op[1]])
        return (op[0], _node_path(op[1], M), _node_path(op[2], M))
    cs = _flatten(j._c, M, TOL)
    polys = [P for P, _ in cs if len(P) >= 2]
    return ("leaf", _project(polys, M), j._eo)


def _node_bounds(node):
    k = node[0]
    if k == "rect":
        return node[1:5] if node[3] > node[1] and node[4] > node[2] else None
    if k == "leaf":
        if not node[1]:
            return None
        P = np.concatenate(node[1])
        if not len(P):
            return None
        return (P[:, 0].min(), P[:, 1].min(), P[:, 0].max(), P[:, 1].max())
    if k in ("union", "xor"):
        kids = node[1] if k == "union" else [node[1], node[2]]
        bs = [b for b in map(_node_bounds, kids) if b is not None]
        if not bs:
            return None
        return (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
    a, b = _node_bounds(node[1]), _node_bounds(node[2])
    if a is None:
        return None
    if k == "subtract" or b is None:
        return a if k == "subtract" else None
    r = (max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3]))
    return r if r[0] < r[2] and r[1] < r[3] else None


def _prepare(node, x0, S):
    """Ubah daun ke tepi ruang sampel (u = (x - x0) S - 0.5)."""
    k = node[0]
    if k == "rect":
        P = np.array([(node[1], node[2]), (node[3], node[2]), (node[3], node[4]), (node[1], node[4])])
        return _prepare(("leaf", [P], False), x0, S)
    if k == "leaf":
        xa, ya, xb, yb = [], [], [], []
        for P in node[1]:
            Q = np.concatenate([P[1:], P[:1]])
            xa.append(P[:, 0])
            ya.append(P[:, 1])
            xb.append(Q[:, 0])
            yb.append(Q[:, 1])
        if not xa:
            return ("leaf", None, node[2])
        xa, ya, xb, yb = (np.concatenate(v) for v in (xa, ya, xb, yb))
        keep = ya != yb
        xa, ya, xb, yb = xa[keep], ya[keep], xb[keep], yb[keep]
        u0, u1 = (xa - x0) * S - 0.5, (xb - x0) * S - 0.5
        dirn = np.where(yb > ya, 1, -1).astype(np.int32)
        lo, hi = np.minimum(ya, yb), np.maximum(ya, yb)
        return ("leaf", (u0, ya, u1, yb, lo, hi, dirn), node[2])
    if k == "union":
        return ("union", [_prepare(n, x0, S) for n in node[1]])
    return (k, _prepare(node[1], x0, S), _prepare(node[2], x0, S))


def _evaluate(prep, x0, yb0, w, bh, S):
    """Masker sampel bool (bh S, w S) untuk pita baris perangkat [yb0, yb0 + bh)."""
    k = prep[0]
    if k == "leaf":
        return _sample_leaf(prep[1], prep[2], yb0, w, bh, S)
    if k == "union":
        m = None
        for n in prep[1]:
            v = _evaluate(n, x0, yb0, w, bh, S)
            m = v if m is None else (m | v)
        return m if m is not None else np.zeros((bh * S, w * S), bool)
    a = _evaluate(prep[1], x0, yb0, w, bh, S)
    b = _evaluate(prep[2], x0, yb0, w, bh, S)
    if k == "intersect":
        return a & b
    if k == "subtract":
        return a & ~b
    return a ^ b


def _sample_leaf(e, evenodd, yb0, w, bh, S):
    ny, nx = bh * S, w * S
    if e is None:
        return np.zeros((ny, nx), bool)
    u0, ya, u1, yb, lo, hi, dirn = e
    vlo, vhi = (lo - yb0) * S - 0.5, (hi - yb0) * S - 0.5
    sel = (vhi > 0) & (vlo < ny)
    if not sel.any():
        return np.zeros((ny, nx), bool)
    u0, ya, u1, yb, vlo, vhi, dirn = u0[sel], ya[sel], u1[sel], yb[sel], vlo[sel], vhi[sel], dirn[sel]
    j0 = np.maximum(np.ceil(vlo), 0).astype(np.int64)
    j1 = np.minimum(np.ceil(vhi) - 1, ny - 1).astype(np.int64)
    cnt = np.maximum(j1 - j0 + 1, 0)
    tot = int(cnt.sum())
    if tot == 0:
        return np.zeros((ny, nx), bool)
    ei = np.repeat(np.arange(len(cnt)), cnt)
    rows = np.repeat(j0, cnt) + (np.arange(tot) - np.repeat(np.cumsum(cnt) - cnt, cnt))
    va = (ya[ei] - yb0) * S - 0.5
    vb = (yb[ei] - yb0) * S - 0.5
    t = (rows - va) / (vb - va)
    xu = u0[ei] + (u1[ei] - u0[ei]) * t
    kk = np.clip(np.ceil(xu), 0, nx).astype(np.int64)
    acc = np.bincount(rows * (nx + 1) + kk, weights=dirn[ei], minlength=ny * (nx + 1))
    wind = np.cumsum(acc.reshape(ny, nx + 1)[:, :nx], axis=1, dtype=np.int16)
    if evenodd:
        return (wind & 1).astype(bool)
    return wind != 0


# ---------------- goresan (mesin murni) ----------------
def _node_stroke(j, M, paint):
    """Goresan -> node daun (poligon perangkat, nonzero): badan ruas + sambungan + ujung, semua berorientasi sama."""
    if j._op is not None:
        j = _resolve(j)
    hair = paint.width <= 0
    if hair:
        # garis rambut: lebar 1 px di ruang perangkat
        cs = _flatten(j._c, M, TOL)
        polys = _project([P for P, _ in cs], M) if cs else []
        if not paint.aa:                      # garis rambut non-AA skia: piksel (floor x, floor y)
            polys = [P + 0.5 for P in polys]
        close = [t for _, t in cs]
        outs = []
        for P, t in zip(polys, close):
            outs += _stroke_polygon(P, t, 0.5, "butt", "bevel", 4.0, 1.0)
        return ("leaf", outs, False)
    hw = paint.width / 2.0
    cs = _flatten(j._c, M, TOL)
    sc = 1.0
    if not M.has_perspective:
        a = M.m
        sc = max(math.hypot(a[0, 0], a[1, 0]), math.hypot(a[0, 1], a[1, 1]), 1e-9)
    outs = []
    for P, t in cs:
        outs += _stroke_polygon(P, t, hw, paint.cap, paint.join, paint.miter_limit, sc)
    return ("leaf", _project(outs, M), False)


def _orient(P):
    x, y = P[:, 0], P[:, 1]
    a = np.dot(x, np.concatenate([y[1:], y[:1]])) - np.dot(np.concatenate([x[1:], x[:1]]), y)
    return P if a >= 0 else P[::-1]


def _round_poly(c, r, sc, a0=0.0, a1=2 * math.pi):
    n = int(min(96, max(8, math.ceil(math.pi * 2 / math.acos(max(-1, min(1, 1 - TOL / max(r * sc, 1e-6))))))))
    if a1 - a0 < 2 * math.pi - 1e-9:
        m = max(2, int(math.ceil(n * (a1 - a0) / (2 * math.pi))) + 1)
        t = np.linspace(a0, a1, m)
        P = np.stack([c[0] + r * np.cos(t), c[1] + r * np.sin(t)], -1)
        return _orient(np.vstack([[c], P]))
    t = np.linspace(0, 2 * math.pi, n, endpoint=False)
    return _orient(np.stack([c[0] + r * np.cos(t), c[1] + r * np.sin(t)], -1))


def _stroke_polygon(P, close, hw, cap, join, miter, sc):
    P = np.asarray(P, np.float64)
    if len(P) == 0:
        return []
    d = np.diff(P, axis=0)
    keep = np.concatenate([[True], np.hypot(d[:, 0], d[:, 1]) > 1e-9])
    P = P[keep]
    if close and len(P) > 2 and np.hypot(*(P[0] - P[-1])) < 1e-9:
        P = P[:-1]
    out = []
    if len(P) == 1 or (len(P) == 2 and close and np.hypot(*(P[0] - P[1])) < 1e-9):
        if cap == "round":
            out.append(_round_poly(P[0], hw, sc))
        elif cap == "square":
            c = P[0]
            out.append(_orient(np.array([(c[0] - hw, c[1] - hw), (c[0] + hw, c[1] - hw), (c[0] + hw, c[1] + hw),
                                         (c[0] - hw, c[1] + hw)])))
        return out
    Q = np.vstack([P, P[:1]]) if close else P
    A, B = Q[:-1], Q[1:]
    D = B - A
    L = np.hypot(D[:, 0], D[:, 1])
    U = D / L[:, None]
    N = np.stack([-U[:, 1], U[:, 0]], -1) * hw
    quads = np.stack([A + N, B + N, B - N, A - N], 1)
    x, y = quads[..., 0], quads[..., 1]
    area = (x * np.roll(y, -1, 1) - np.roll(x, -1, 1) * y).sum(1)
    quads[area < 0] = quads[area < 0][:, ::-1]
    out += list(quads)
    nseg = len(A)
    joins = range(nseg) if close else range(1, nseg)
    for i in joins:
        u0, u1 = U[i - 1], U[i]
        v = A[i]
        cr = u0[0] * u1[1] - u0[1] * u1[0]
        dt = u0[0] * u1[0] + u0[1] * u1[1]
        ang = math.atan2(cr, dt)
        if abs(ang) * hw * sc < 0.02:
            continue
        s = 1.0 if cr > 0 else -1.0                   # sisi luar: kiri bila belok kanan (y bawah)
        n0 = np.array([-u0[1], u0[0]]) * hw * -s
        n1 = np.array([-u1[1], u1[0]]) * hw * -s
        if join == "round":
            a0 = math.atan2(n0[1], n0[0])
            a1 = math.atan2(n1[1], n1[0])
            da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
            out.append(_round_poly(v, hw, sc, min(a0, a0 + da), max(a0, a0 + da)))
        else:
            tri = [v, v + n0, v + n1]
            if join == "miter":
                half = (math.pi - abs(ang)) / 2
                ml = 1 / max(math.sin(half), 1e-9)
                if ml <= miter:
                    bis = (n0 + n1)
                    bis = bis / (np.hypot(*bis) or 1.0) * hw * ml
                    tri = [v, v + n0, v + bis, v + n1]
            out.append(_orient(np.array(tri)))
    if not close:
        for c, u, sgn in ((P[0], U[0], -1), (P[-1], U[-1], 1)):
            if cap == "round":
                out.append(_round_poly(c, hw, sc))
            elif cap == "square":
                n = np.array([-u[1], u[0]]) * hw
                e = c + u * hw * sgn
                out.append(_orient(np.array([c + n, e + n, e - n, c - n])))
    return [np.asarray(q) for q in out]


# ---------------- selesaikan pohon boolean jadi kontur (mesin murni) ----------------
def _resolve(j, k=4.0):
    """Pohon boolean -> Path poligon (evenodd) lewat raster k x dan marching squares (presisi ~ 1/(k SS) px)."""
    b = j.bounds()
    if b[2] <= b[0] or b[3] <= b[1]:
        return Path()
    M = Matrix.scale(k) @ Matrix.translate(-b[0] + 2 / k, -b[1] + 2 / k)
    shape = _Shape.path(j, M)
    w = int(math.ceil((b[2] - b[0]) * k)) + 5
    h = int(math.ceil((b[3] - b[1]) * k)) + 5
    cov = shape.coverage((0, 0, w, h), True)
    Mi = M.invert()
    out = Path()
    out._eo = True
    for P in _isoline(cov, 0.5):
        out.polygon([tuple(v) for v in Mi.map_array(P + 0.5)], True)
    return out


def _isoline(f, lv):
    """Marching squares tertutup (bantalan 0): list poligon (x, y) dalam koordinat sel."""
    f = np.pad(f.astype(np.float64), 1) - lv
    H, W = f.shape
    a, b, c, d = f[:-1, :-1], f[:-1, 1:], f[1:, 1:], f[1:, :-1]
    code = (a > 0) * 1 + (b > 0) * 2 + (c > 0) * 4 + (d > 0) * 8
    ys, xs = np.nonzero((code > 0) & (code < 15))

    def ip(p, q):
        return p / (p - q) if p != q else 0.5
    seg = {}
    tbl = {1: [(3, 0)], 2: [(0, 1)], 3: [(3, 1)], 4: [(1, 2)], 5: [(3, 0), (1, 2)], 6: [(0, 2)], 7: [(3, 2)],
           8: [(2, 3)], 9: [(2, 0)], 10: [(0, 1), (2, 3)], 11: [(2, 1)], 12: [(1, 3)], 13: [(1, 0)], 14: [(0, 3)]}
    for y, x in zip(ys.tolist(), xs.tolist()):
        cd = int(code[y, x])
        va, vb, vc, vd = f[y, x], f[y, x + 1], f[y + 1, x + 1], f[y + 1, x]
        if cd in (5, 10):
            if (va + vb + vc + vd) / 4 > 0:
                cd2 = {5: [(3, 2), (1, 0)], 10: [(0, 3), (2, 1)]}[cd]
            else:
                cd2 = tbl[cd]
        else:
            cd2 = tbl[cd]
        for e0, e1 in cd2:
            seg[(y, x, e0)] = (y, x, e1)

    def key_edge(y, x, e):
        # sisi bersama dinormalkan: 0 atas, 1 kanan, 2 bawah, 3 kiri
        if e == 0:
            return ("h", y, x)
        if e == 2:
            return ("h", y + 1, x)
        if e == 3:
            return ("v", y, x)
        return ("v", y, x + 1)

    def pt(y, x, e):
        va, vb, vc, vd = f[y, x], f[y, x + 1], f[y + 1, x + 1], f[y + 1, x]
        if e == 0:
            return (x + ip(va, vb), y)
        if e == 1:
            return (x + 1, y + ip(vb, vc))
        if e == 2:
            return (x + ip(vd, vc), y + 1)
        return (x, y + ip(va, vd))
    start = {}
    for (y, x, e0), (y2, x2, e1) in seg.items():
        start[key_edge(y, x, e0)] = (y, x, e0, e1)
    used = set()
    polys = []
    for k0 in list(start.keys()):
        if k0 in used:
            continue
        poly = []
        k = k0
        while k in start and k not in used:
            used.add(k)
            y, x, e0, e1 = start[k]
            poly.append(pt(y, x, e0))
            k = key_edge(y, x, e1)
        if len(poly) >= 3:
            polys.append(np.array(poly) - 1.0)
    return polys


# ---------------- SVG ----------------
_COLOR_NAMES = dict(black=0x000000, white=0xFFFFFF, red=0xFF0000, green=0x008000, blue=0x0000FF, yellow=0xFFFF00,
                   gray=0x808080, grey=0x808080, orange=0xFFA500, purple=0x800080, brown=0xA52A2A, pink=0xFFC0CB,
                   lime=0x00FF00, navy=0x000080, teal=0x008080, silver=0xC0C0C0, maroon=0x800000, olive=0x808000,
                   cyan=0x00FFFF, magenta=0xFF00FF, aqua=0x00FFFF, fuchsia=0xFF00FF)


def _svg_color(v, grad):
    v = (v or "").strip()
    if not v or v == "none" or v == "transparent":
        return None
    m = re.match(r"url\(#([^)]+)\)", v)
    if m:
        return grad.get(m.group(1), 0x000000)
    if v.startswith("#"):
        h = v[1:]
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        return int(h[:6], 16)
    m = re.match(r"rgba?\(([^)]*)\)", v)
    if m:
        parts = [p.strip() for p in m.group(1).split(",")]
        c = [round(float(p[:-1]) * 2.55) if p.endswith("%") else round(float(p)) for p in parts[:3]]
        c = [max(0, min(255, int(x))) for x in c]
        return (c[0] << 16) | (c[1] << 8) | c[2]
    return _COLOR_NAMES.get(v.lower(), 0x000000)


def _svg_tf(s):
    M = Matrix()
    for name, args in re.findall(r"(\w+)\s*\(([^)]*)\)", s or ""):
        a = [float(v) for v in re.split(r"[\s,]+", args.strip()) if v]
        if name == "matrix":
            T = Matrix.make_all(a[0], a[2], a[4], a[1], a[3], a[5])
        elif name == "translate":
            T = Matrix.translate(a[0], a[1] if len(a) > 1 else 0.0)
        elif name == "scale":
            T = Matrix.scale(a[0], a[1] if len(a) > 1 else a[0])
        elif name == "rotate":
            T = Matrix.rotate(a[0], a[1], a[2]) if len(a) == 3 else Matrix.rotate(a[0])
        elif name == "skewX":
            T = Matrix.make_all(1, math.tan(math.radians(a[0])), 0, 0, 1, 0)
        elif name == "skewY":
            T = Matrix.make_all(1, 0, 0, math.tan(math.radians(a[0])), 1, 0)
        else:
            continue
        M = M @ T
    return M


def _svg_number(v, d=0.0):
    if v is None:
        return d
    m = re.match(r"\s*([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)", str(v))
    return float(m.group(1)) if m else d


def _svg_pure(kv, src):
    root = ET.fromstring(src)

    def tag(e):
        return e.tag.split("}")[-1]
    ids = {e.get("id"): e for e in root.iter() if e.get("id")}
    grad = {}
    for e in root.iter():
        if tag(e) in ("linearGradient", "radialGradient"):
            stops = [s for s in e if tag(s) == "stop"]
            ref = e.get("{http://www.w3.org/1999/xlink}href") or e.get("href")
            if not stops and ref and ref[1:] in ids:
                stops = [s for s in ids[ref[1:]] if tag(s) == "stop"]
            if stops:
                cs = []
                for s in stops:
                    st = dict(kv_.split(":", 1) for kv_ in (s.get("style") or "").split(";") if ":" in kv_)
                    c = _svg_color(st.get("stop-color", s.get("stop-color", "#000")).strip(), {})
                    cs.append(c if c is not None else 0)
                acc = [sum((c >> sh) & 255 for c in cs) // len(cs) for sh in (16, 8, 0)]
                grad[e.get("id")] = (acc[0] << 16) | (acc[1] << 8) | acc[2]

    def style(e, inh):
        st = dict(inh)
        for k in ("fill", "stroke", "stroke-width", "opacity", "fill-opacity", "stroke-opacity", "fill-rule",
                  "stroke-linecap", "stroke-linejoin", "display", "visibility", "stroke-miterlimit"):
            if e.get(k) is not None:
                st[k] = e.get(k)
        for part in (e.get("style") or "").split(";"):
            if ":" in part:
                k, v = part.split(":", 1)
                st[k.strip()] = v.strip()
        return st

    def draw(e, M, inh, op_parent):
        t = tag(e)
        if t in ("defs", "title", "desc", "metadata", "style", "linearGradient", "radialGradient", "clipPath",
                 "mask", "symbol", "pattern", "filter", "script"):
            return
        st = style(e, inh)
        if st.get("display") == "none" or st.get("visibility") == "hidden":
            return
        M2 = M @ _svg_tf(e.get("transform"))
        op = op_parent * _svg_number(st.pop("opacity"), 1.0) if "opacity" in st else op_parent
        if t in ("g", "svg", "a", "switch"):
            # opasitas grup didekati dengan mengalikan ke anak (tanpa lapis terpisah)
            for ch in e:
                draw(ch, M2, st, op)
            return
        if t == "use":
            ref = e.get("{http://www.w3.org/1999/xlink}href") or e.get("href")
            if ref and ref[1:] in ids:
                T = Matrix.translate(_svg_number(e.get("x")), _svg_number(e.get("y")))
                draw(ids[ref[1:]], M2 @ T, st, op)
            return
        p = None
        if t == "path":
            p = _svg_path(e.get("d") or "")
        elif t == "rect":
            x, y = _svg_number(e.get("x")), _svg_number(e.get("y"))
            w, h = _svg_number(e.get("width")), _svg_number(e.get("height"))
            rx = _svg_number(e.get("rx"), None) if e.get("rx") else None
            ry = _svg_number(e.get("ry"), None) if e.get("ry") else None
            rx = rx if rx is not None else (ry or 0.0)
            ry = ry if ry is not None else rx
            p = Path().round_rect(x, y, x + w, y + h, rx, ry) if rx > 0 else Path().rect(x, y, x + w, y + h)
        elif t == "circle":
            cx, cy, r = _svg_number(e.get("cx")), _svg_number(e.get("cy")), _svg_number(e.get("r"))
            p = Path().circle(cx, cy, r)
        elif t == "ellipse":
            cx, cy = _svg_number(e.get("cx")), _svg_number(e.get("cy"))
            rx, ry = _svg_number(e.get("rx")), _svg_number(e.get("ry"))
            p = Path().oval(cx - rx, cy - ry, cx + rx, cy + ry)
        elif t == "line":
            p = Path().move_to(_svg_number(e.get("x1")), _svg_number(e.get("y1"))).line_to(
                _svg_number(e.get("x2")), _svg_number(e.get("y2")))
        elif t in ("polyline", "polygon"):
            v = [float(x) for x in re.findall(r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?", e.get("points") or "")]
            p = Path().polygon(list(zip(v[0::2], v[1::2])), t == "polygon")
        if p is None:
            return
        if st.get("fill-rule") == "evenodd":
            p.fill_rule = "evenodd"
        kv.save()
        kv.concat(M2)
        fill = _svg_color(st.get("fill", "#000"), grad)
        if fill is not None and t != "line":
            fo = _svg_number(st.get("fill-opacity", "1"), 1.0) * op
            kv.draw_path(p, Paint(fill, alpha=fo))
        stroke = _svg_color(st.get("stroke", "none"), grad)
        if stroke is not None:
            so = _svg_number(st.get("stroke-opacity", "1"), 1.0) * op
            kv.draw_path(p, Paint(stroke, alpha=so, style="stroke", width=_svg_number(st.get("stroke-width", "1"), 1.0),
                                   cap={"round": "round", "square": "square"}.get(st.get("stroke-linecap"), "butt"),
                                   join={"round": "round", "bevel": "bevel"}.get(st.get("stroke-linejoin"),
                                                                                     "miter"),
                                   miter_limit=_svg_number(st.get("stroke-miterlimit", "4"), 4.0)))
        kv.restore()

    vb = root.get("viewBox")
    M = Matrix()
    if vb:
        x, y, w, h = [float(v) for v in re.split(r"[\s,]+", vb.strip())[:4]]
        M = Matrix.translate(-x, -y)
    draw(root, M, {}, 1.0)


@_old_kw({"kanvas": "canvas", "paksa_murni": "force_pure"})
def draw_svg(canvas, src, w=None, h=None, force_pure=False):
    """Render SVG text onto the canvas (viewBox coordinates). skia engine: skia.SVGDOM; force_pure = own interpreter."""
    if ENGINE == "skia" and not force_pure:
        data = src.encode() if isinstance(src, str) else src
        dom = skia.SVGDOM.MakeFromStream(skia.MemoryStream(data, True))
        if dom is None:
            raise ValueError(_T("SVGDOM could not read the SVG", "SVGDOM gagal membaca SVG"))
        if w is not None:
            dom.setContainerSize(skia.Size(w, h))
        dom.render(canvas._skc)
        return
    if ENGINE == "skia":
        raise ValueError(_T("force_pure only works on the pure engine (MGP_BRUSH_ENGINE=pure)",
                            "force_pure hanya untuk mesin murni (MGP_BRUSH_ENGINE=pure)"))
    _svg_pure(canvas, src if isinstance(src, str) else src.decode("utf-8"))


# ---------------- old (Indonesian) names: aliases so existing code keeps working ----------------
def _alias(cls, names):
    """Old method/property names as class attributes: {old: new}."""
    for o, n in names.items():
        setattr(cls, o, cls.__dict__[n])


def _attr_alias(cls, names):
    """Old instance attribute names as read/write properties: {old: new}."""
    for o, n in names.items():
        setattr(cls, o, property(lambda self, n=n: getattr(self, n), lambda self, v, n=n: setattr(self, n, v)))


_alias(Matrix, {"identitas": "identity", "semua": "make_all", "geser": "translate", "skala": "scale", "putar": "rotate", "peta": "map_point", "peta_larik": "map_array", "balik": "invert", "perspektif": "has_perspective", "ke_skia": "to_skia"})
_alias(Path, {"poligon": "polygon", "lingkaran": "circle", "kotak": "rect", "kotak_bulat": "round_rect", "dari_svg": "from_svg", "aturan": "fill_rule", "salin": "copy", "kosong": "is_empty", "batas": "bounds", "kontur": "contours", "ke_skia": "to_skia"})
_alias(Gradient, {"ke_skia": "to_skia", "nilai": "sample"})
_alias(Paint, {"salin": "copy", "ke_skia": "to_skia"})
_alias(Font, {"ke_skia": "to_skia", "lebar": "measure_text"})
_alias(Image, {"dari_larik": "from_array", "buka": "open", "lebar": "width", "tinggi": "height", "larik": "array", "simpan": "save", "ke_skia": "to_skia"})
_alias(Surface, {"citra": "image", "larik": "array", "simpan": "save", "ke_skia": "to_skia"})
_alias(Canvas, {"ke_skia": "to_skia", "simpan": "save", "simpan_lapis": "save_layer", "pulihkan": "restore", "geser": "translate", "skala": "scale", "putar": "rotate", "gabung_matriks": "concat", "matriks": "total_matrix", "bersihkan": "clear", "klip_jalur": "clip_path", "klip_kotak": "clip_rect", "gambar_jalur": "draw_path", "gambar_kotak": "draw_rect", "gambar_kotak_bulat": "draw_round_rect", "gambar_oval": "draw_oval", "gambar_lingkaran": "draw_circle", "gambar_garis": "draw_line", "gambar_teks": "draw_text", "gambar_citra": "draw_image", "gambar_citra_kotak": "draw_image_rect"})
_attr_alias(Contour, {"tertutup": "closed", "panjang": "length"})
_attr_alias(Gradient, {"warna": "colors", "posisi": "positions", "ulang": "tile_mode", "jenis": "kind"})
_attr_alias(Paint, {"warna": "color", "gaya": "style", "tebal": "width", "ujung": "cap", "sambung": "join", "campur": "blend", "batas_runcing": "miter_limit"})
_attr_alias(Font, {"nama": "name", "ukuran": "size"})
_attr_alias(Surface, {"kanvas": "canvas"})
_PAINT_OLD = {"warna": "color", "gaya": "style", "tebal": "width", "ujung": "cap", "sambung": "join", "campur": "blend", "batas_runcing": "miter_limit"}

warna = color
warna_int = color_int
Matriks = Matrix
Jalur = Path
gabung = union
iris = intersect
kurang = subtract
xor = exclude
gabung_semua = union_all
sederhanakan = simplify
Kontur = Contour
ukur = measure
Gradien = Gradient
gradien_linear = linear_gradient
gradien_radial = radial_gradient
Cat = Paint
Huruf = Font
Citra = Image
Permukaan = Surface
Kanvas = Canvas
gambar_svg = draw_svg
