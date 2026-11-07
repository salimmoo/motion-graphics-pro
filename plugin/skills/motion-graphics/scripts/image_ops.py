# AUTO-GENERATED COPY of _shared/image_ops.py (run _shared/sync.py after editing the source). Do not edit here.
"""image_ops - small image toolkit (numpy + Pillow) replacing the OpenCV functions used by the skill scripts.

Old name: atelier_citra.py (now a shim; every old Indonesian name still works as an alias, see the end of this file).

Channel order follows OpenCV so it can stand in directly: read() returns BGR uint8, write() takes BGR.
Everything is vectorised numpy; no OpenCV, scipy or other C library is needed.

Contents (OpenCV equivalent in brackets):
- read(path, mode)                             (imread)     mode COLOR (BGR), GRAY, UNCHANGED (BGRA when there is
                                                            alpha); failure -> None
- write(path, img)                             (imwrite)    2D grey, 3 channels BGR, 4 channels BGRA
- cvt_color(img, code)                         (cvtColor)   RGB2BGR, BGR2RGB, BGR2HSV, RGB2HSV, BGR2GRAY, RGB2GRAY, ...
- resize(img, size, fx, fy, interpolation)     (resize)     AREA (area average), CUBIC (Keys a = -0.75), LINEAR,
                                                            NEAREST
- gaussian_blur(img, sigma, ksize)             (GaussianBlur, ksize (0, 0)) REFLECT_101 border; large kernels via FFT
- warp_affine(img, M, size)                    (warpAffine) bilinear, constant 0 border
- connected_components(mask, connectivity)     (connectedComponentsWithStats) -> n, labels, stats (x, y, w, h, area),
                                                            centroids   (alias: components)
- outer_contours(mask)                         (findContours RETR_EXTERNAL, CHAIN_APPROX_NONE) -> list of (N, 1, 2)
                                                            int32 arrays
- draw_contours(img, contours, color, thickness)  (drawContours, index -1)
- convex_hull(points)                          (convexHull) same order and start point as OpenCV
- rectangle(img, p1, p2, color, thickness)     (rectangle)  thickness < 0 = filled
- line(img, p1, p2, color, thickness)          (line, LINE_8) ends outside the canvas are clipped like clipLine

Algorithms ported from OpenCV (Apache-2.0, see NOTICE): Suzuki-Abe border following as in icvFetchContour, the 8-bit
HSV division tables, INTER_AREA weights and cubic coefficients, automatic Gaussian kernel size, midpoint filled
circle, thick lines (ThickLine) and segment clipping (clipLine). Results are tested against OpenCV
(_shared/tests/test_image_ops.py).
"""
import functools
import math
import os

import numpy as np
from PIL import Image

__all__ = ["read", "write", "cvt_color", "resize", "gaussian_blur", "warp_affine", "connected_components",
           "components", "outer_contours", "draw_contours", "convex_hull", "rectangle", "line",
           # old names
           "baca", "tulis", "ubah_warna", "ubah_ukuran", "blur_gauss", "geser_affine", "komponen", "kontur_luar",
           "gambar_kontur", "kulit_cembung", "persegi", "garis"]


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


COLOR, GRAY, UNCHANGED = 1, 0, -1
AREA, CUBIC, LINEAR, NEAREST = "area", "cubic", "linear", "nearest"
_INTERP_OLD = {"kubik": CUBIC, "terdekat": NEAREST}
RGB2BGR, BGR2RGB, BGR2HSV, RGB2HSV, BGR2GRAY, RGB2GRAY, GRAY2BGR, BGRA2BGR, BGR2BGRA, RGBA2BGRA, BGRA2RGBA = (
    "RGB2BGR", "BGR2RGB", "BGR2HSV", "RGB2HSV", "BGR2GRAY", "RGB2GRAY", "GRAY2BGR", "BGRA2BGR", "BGR2BGRA",
    "RGBA2BGRA", "BGRA2RGBA")


# ---------------- baca / tulis ----------------
def read(path, mode=COLOR):
    """Baca gambar. COLOR -> BGR uint8 (alfa dibuang), GRAY -> 2D uint8, UNCHANGED -> apa adanya (BGR/BGRA/abu).
    Gagal (file hilang/rusak) -> None, sama dengan cv2.imread."""
    try:
        im = Image.open(path)
        im.load()
    except Exception:
        return None
    if mode == GRAY:
        return _gray_bgr(np.asarray(im.convert("RGB"))[:, :, ::-1])
    if mode == UNCHANGED:
        if im.mode in ("L", "I;16", "I", "F"):
            return np.asarray(im).copy()
        if "A" in im.getbands() or im.mode == "P" and "transparency" in im.info:
            return np.ascontiguousarray(np.asarray(im.convert("RGBA"))[:, :, [2, 1, 0, 3]])
    return np.ascontiguousarray(np.asarray(im.convert("RGB"))[:, :, ::-1])


def write(path, img):
    """Simpan gambar (format dari ekstensi). img 2D = abu, 3 kanal = BGR, 4 kanal = BGRA. Kembalikan True."""
    a = np.asarray(img)
    if a.dtype != np.uint8:
        a = np.clip(np.rint(a), 0, 255).astype(np.uint8)
    if a.ndim == 3 and a.shape[2] == 1:
        a = a[:, :, 0]
    if a.ndim == 2:
        im = Image.fromarray(a, "L")
    elif a.shape[2] == 3:
        im = Image.fromarray(np.ascontiguousarray(a[:, :, ::-1]), "RGB")
    else:
        im = Image.fromarray(np.ascontiguousarray(a[:, :, [2, 1, 0, 3]]), "RGBA")
    if str(path).lower().endswith((".jpg", ".jpeg")) and im.mode == "RGBA":
        im = im.convert("RGB")
    im.save(path)
    return True


# ---------------- warna ----------------
def _gray_bgr(bgr):
    # cv2: Y = 0.299 R + 0.587 G + 0.114 B, fixed point 14 bit
    b, g, r = (bgr[:, :, i].astype(np.int32) for i in range(3))
    return ((b * 1868 + g * 9617 + r * 4899 + 8192) >> 14).astype(np.uint8)


_HSV_SHIFT = 12
_SDIV = np.array([0] + [int(round((255 << _HSV_SHIFT) / i)) for i in range(1, 256)], np.int64)
_HDIV = np.array([0] + [int(round((180 << _HSV_SHIFT) / (6.0 * i))) for i in range(1, 256)], np.int64)


def _hsv_bgr(bgr):
    """BGR uint8 -> HSV (H 0..179, S, V 0..255), aritmetika tabel sama dengan OpenCV."""
    b, g, r = (bgr[:, :, i].astype(np.int64) for i in range(3))
    v = np.maximum(np.maximum(b, g), r)
    vmin = np.minimum(np.minimum(b, g), r)
    diff = v - vmin
    vr, vg = v == r, v == g
    rnd = 1 << (_HSV_SHIFT - 1)
    s = (diff * _SDIV[v] + rnd) >> _HSV_SHIFT
    h = np.where(vr, g - b, np.where(vg, b - r + 2 * diff, r - g + 4 * diff))
    h = (h * _HDIV[diff] + rnd) >> _HSV_SHIFT
    h = np.where(h < 0, h + 180, h)
    return np.stack([h, s, v], axis=2).astype(np.uint8)


@_old_kw({"kode": "code"})
def cvt_color(img, code):
    a = np.asarray(img)
    if code in (RGB2BGR, BGR2RGB):
        return np.ascontiguousarray(a[:, :, 2::-1] if a.shape[2] == 3 else a[:, :, [2, 1, 0]])
    if code == BGR2HSV:
        return _hsv_bgr(a)
    if code == RGB2HSV:
        return _hsv_bgr(a[:, :, ::-1])
    if code == BGR2GRAY:
        return _gray_bgr(a)
    if code == RGB2GRAY:
        return _gray_bgr(a[:, :, 2::-1])
    if code == GRAY2BGR:
        return np.repeat(a[:, :, None], 3, axis=2)
    if code == BGRA2BGR:
        return np.ascontiguousarray(a[:, :, :3])
    if code == BGR2BGRA:
        return np.dstack([a, np.full(a.shape[:2], 255, a.dtype)])
    if code in (RGBA2BGRA, BGRA2RGBA):
        return np.ascontiguousarray(a[:, :, [2, 1, 0, 3]])
    raise ValueError(_T("unknown colour conversion code: %r", "kode warna tidak dikenal: %r") % (code,))


# ---------------- ubah ukuran ----------------
def _area_weights(n_src, n_dst):
    """Matriks bobot (n_dst x n_src) INTER_AREA (penciutan): luas tumpang tindih sel, seperti computeResizeAreaTab."""
    scale = n_src / n_dst
    Wm = np.zeros((n_dst, n_src))
    for dx in range(n_dst):
        f1 = dx * scale
        f2 = f1 + scale
        cell = min(scale, n_src - f1)
        s1, s2 = int(math.ceil(f1)), int(math.floor(f2))
        s2 = min(s2, n_src - 1)
        s1 = min(s1, s2)
        if s1 - f1 > 1e-3:
            Wm[dx, s1 - 1] = (s1 - f1) / cell
        Wm[dx, s1:s2] = 1.0 / cell
        if f2 - s2 > 1e-3:
            Wm[dx, s2] += min(min(f2 - s2, 1.0), cell) / cell
    return Wm


def _linear_weights(n_src, n_dst, mode_area=False):
    scale = n_src / n_dst
    if mode_area:
        # INTER_AREA saat membesar: s = floor(dx * scale), t = frac((dx + 1) - (s + 1) / scale) bila > 0 (resize.cpp)
        dx = np.arange(n_dst)
        s = np.floor(dx * scale).astype(int)
        t = ((dx + 1) - (s + 1) * (n_dst / n_src)).astype(np.float32).astype(np.float64)
        t = np.where(t <= 0, 0.0, t - np.floor(t))
    else:
        f = (np.arange(n_dst) + 0.5) * scale - 0.5
        s = np.floor(f).astype(int)
        t = f - s
    t[s < 0] = 0
    s = np.clip(s, 0, n_src - 1)
    Wm = np.zeros((n_dst, n_src))
    r = np.arange(n_dst)
    np.add.at(Wm, (r, s), 1 - t)
    np.add.at(Wm, (r, np.minimum(s + 1, n_src - 1)), t)
    return Wm


def _cubic_taps(n_src, n_dst):
    """Indeks 4 tap (replicate) dan koefisien Keys a = -0.75, sama dengan interpolateCubic OpenCV."""
    A = -0.75
    scale = n_src / n_dst
    f = (np.arange(n_dst) + 0.5) * scale - 0.5
    s = np.floor(f).astype(int)
    x = f - s
    w0 = ((A * (x + 1) - 5 * A) * (x + 1) + 8 * A) * (x + 1) - 4 * A
    w1 = ((A + 2) * x - (A + 3)) * x * x + 1
    w2 = ((A + 2) * (1 - x) - (A + 3)) * (1 - x) * (1 - x) + 1
    w3 = 1 - w0 - w1 - w2
    idx = np.clip(s[:, None] + np.arange(-1, 3)[None, :], 0, n_src - 1)
    return idx, np.stack([w0, w1, w2, w3], axis=1)


def _taps(Wm):
    """Matriks bobot padat (n_dst x n_src) -> indeks + bobot tap (n_dst x K), urut indeks naik (urutan jumlah sama)."""
    nz = Wm != 0
    K = max(1, int(nz.sum(axis=1).max()))
    idx = np.zeros((Wm.shape[0], K), np.intp)
    wt = np.zeros((Wm.shape[0], K))
    for d in range(Wm.shape[0]):
        j = np.flatnonzero(nz[d])
        idx[d, :len(j)] = j
        idx[d, len(j):] = j[-1] if len(j) else 0
        wt[d, :len(j)] = Wm[d, j]
    return idx, wt


def _apply_taps(src, idx, wt, axis):
    """Jumlah berbobot sepanjang satu sumbu: sum_k wt[:, k] * src[idx[:, k]] (tervektor, tanpa matriks padat)."""
    sh = [1] * src.ndim
    sh[axis] = -1
    out = None
    for k in range(idx.shape[1]):
        w = wt[:, k]
        if not w.any():
            continue
        term = np.take(src, idx[:, k], axis=axis) * w.reshape(sh)
        out = term if out is None else out + term
    if out is None:
        shape = list(src.shape)
        shape[axis] = idx.shape[0]
        out = np.zeros(shape, src.dtype)
    return out


@_old_kw({"ukuran": "size", "cara": "interpolation"})
def resize(img, size=None, fx=None, fy=None, interpolation=LINEAR):
    """size = (width, height) or None (use fx, fy). interpolation: AREA, CUBIC, LINEAR, NEAREST.

    Dua lintasan terpisah (sumbu y lalu x) dengan bobot tap jarang yang dihitung sekali; tidak ada matriks padat."""
    interpolation = _INTERP_OLD.get(interpolation, interpolation)
    a = np.asarray(img)
    h, w = a.shape[:2]
    if size:
        W2, H2 = int(size[0]), int(size[1])
    else:
        W2, H2 = int(round(w * fx)), int(round(h * fy))
    kind = a.dtype
    if interpolation == NEAREST:
        ys = np.minimum((np.arange(H2) * (h / H2)).astype(int), h - 1)
        xs = np.minimum((np.arange(W2) * (w / W2)).astype(int), w - 1)
        return a[ys][:, xs].copy()
    if interpolation == CUBIC:
        iy, cy = _cubic_taps(h, H2)
        ix, cx = _cubic_taps(w, W2)
        if kind == np.uint8:
            # titik tetap seperti OpenCV: koefisien x 2048, hasil (jumlah + 2^21) >> 22
            cyi = np.rint(cy * 2048).astype(np.int64)
            cxi = np.rint(cx * 2048).astype(np.int64)
            src = a.astype(np.int64)
            t = np.einsum("yxk...,xk->yx...", src[:, ix], cxi)
            o = np.einsum("ykx...,yk->yx...", t[iy], cyi)
            return np.clip((o + (1 << 21)) >> 22, 0, 255).astype(np.uint8)
        src = a.astype(np.float64)
        t = np.einsum("yxk...,xk->yx...", src[:, ix], cx)
        o = np.einsum("ykx...,yk->yx...", t[iy], cy)
        return o.astype(kind)
    if interpolation == AREA and H2 <= h and W2 <= w:
        Wy, Wx = _area_weights(h, H2), _area_weights(w, W2)
    else:
        mode_area = interpolation == AREA                       # AREA yang tidak menciut di dua sumbu: linear "area_mode" OpenCV
        Wy, Wx = _linear_weights(h, H2, mode_area), _linear_weights(w, W2, mode_area)
    (iy, wy), (ix, wx) = _taps(Wy), _taps(Wx)
    src = a.astype(np.float64)
    o = _apply_taps(src, iy, wy, 0)
    o = _apply_taps(o, ix, wx, 1)
    if np.issubdtype(kind, np.integer):
        info = np.iinfo(kind)
        return np.clip(np.rint(o), info.min, info.max).astype(kind)
    return o.astype(kind)


# ---------------- blur Gauss ----------------
def _gauss_kernel(n, sigma):
    if n % 2 == 1 and n <= 7 and sigma <= 0:
        tab = {1: [1.0], 3: [0.25, 0.5, 0.25], 5: [0.0625, 0.25, 0.375, 0.25, 0.0625],
               7: [0.03125, 0.109375, 0.21875, 0.28125, 0.21875, 0.109375, 0.03125]}
        return np.array(tab[n])
    s = sigma if sigma > 0 else ((n - 1) * 0.5 - 1) * 0.3 + 0.8
    x = np.arange(n) - (n - 1) * 0.5
    k = np.exp(-x * x / (2 * s * s))
    return k / k.sum()


def _reflect101(n, pad):
    i = np.arange(-pad, n + pad)
    if n == 1:
        return np.zeros_like(i)
    period = 2 * (n - 1)
    i = np.abs(i) % period
    return np.where(i >= n, period - i, i)


def _convolve_axis(a, k, axis):
    r = len(k) // 2
    n = a.shape[axis]
    idx = _reflect101(n, r)
    p = np.take(a, idx, axis=axis)
    if len(k) > 31:                                    # kernel besar: FFT sepanjang sumbu
        L = p.shape[axis]
        nf = 1 << int(math.ceil(math.log2(L + len(k))))
        F = np.fft.rfft(p.astype(np.float64), nf, axis=axis)
        kk = np.fft.rfft(k[::-1], nf)
        sh = [1] * p.ndim
        sh[axis] = -1
        out = np.fft.irfft(F * kk.reshape(sh), nf, axis=axis)
        sl = [slice(None)] * p.ndim
        sl[axis] = slice(len(k) - 1, len(k) - 1 + n)
        return out[tuple(sl)].astype(a.dtype)
    out = np.zeros(a.shape, np.float64 if a.dtype == np.float64 else np.float32)
    for j, kv in enumerate(k):
        sl = [slice(None)] * p.ndim
        sl[axis] = slice(j, j + n)
        out += kv * p[tuple(sl)]
    return out


def gaussian_blur(img, sigma, ksize=(0, 0), sigma_y=0.0):
    """GaussianBlur. ksize (0, 0) = otomatis seperti OpenCV: round(sigma x (3 untuk uint8, 4 lainnya) x 2 + 1) | 1."""
    a = np.asarray(img)
    sy = sigma_y if sigma_y > 0 else sigma
    m = 3 if a.dtype == np.uint8 else 4
    kx = ksize[0] or (int(round(sigma * m * 2 + 1)) | 1)
    ky = ksize[1] or (int(round(sy * m * 2 + 1)) | 1)
    work = a.astype(np.float64 if a.dtype == np.float64 else np.float32)
    out = _convolve_axis(work, _gauss_kernel(kx, sigma).astype(work.dtype), 1)
    out = _convolve_axis(out, _gauss_kernel(ky, sy).astype(work.dtype), 0)
    if a.dtype == np.uint8:
        return np.clip(np.rint(out), 0, 255).astype(np.uint8)
    return out.astype(a.dtype)


# ---------------- warp affine ----------------
@_old_kw({"ukuran": "size"})
def warp_affine(img, M, size):
    """warpAffine bilinear, tepi konstanta 0. M 2 x 3 (src -> dst), dibalik di sini (seperti OpenCV tanpa
    WARP_INVERSE_MAP). Koordinat sumber float penuh (perilaku OpenCV 4.11+/5)."""
    a = np.asarray(img)
    W2, H2 = int(size[0]), int(size[1])
    M = np.asarray(M, np.float64).reshape(2, 3)
    D = M[:, :2]
    det = np.linalg.det(D)
    Di = np.linalg.inv(D) if det != 0 else np.zeros((2, 2))
    b = -Di @ M[:, 2]
    yy, xx = np.mgrid[0:H2, 0:W2]
    X = Di[0, 0] * xx + Di[0, 1] * yy + b[0]
    Y = Di[1, 0] * xx + Di[1, 1] * yy + b[1]
    ix, iy = np.floor(X).astype(np.int64), np.floor(Y).astype(np.int64)
    fx, fy = X - ix, Y - iy
    h, w = a.shape[:2]
    src = a.astype(np.float64)
    out = 0.0
    for dy, wy in ((0, 1 - fy), (1, fy)):
        for dx, wx in ((0, 1 - fx), (1, fx)):
            jx, jy = ix + dx, iy + dy
            ok = (jx >= 0) & (jx < w) & (jy >= 0) & (jy < h)
            v = src[np.clip(jy, 0, h - 1), np.clip(jx, 0, w - 1)]
            wgt = wx * wy * ok
            out = out + (v * (wgt[..., None] if a.ndim == 3 else wgt))
    if np.issubdtype(a.dtype, np.integer):
        info = np.iinfo(a.dtype)
        return np.clip(np.floor(out + 0.5), info.min, info.max).astype(a.dtype)
    return out.astype(a.dtype)


# ---------------- komponen terhubung ----------------
def _run(mask):
    m = np.asarray(mask) != 0
    H, W = m.shape
    p = np.zeros((H, W + 2), np.int8)
    p[:, 1:-1] = m
    d = np.diff(p, axis=1)
    ys, xs = np.nonzero(d == 1)
    _, xe = np.nonzero(d == -1)
    return ys, xs, xe, H, W


def _union_find(n, a, b):
    """Union-find tervektor: label = indeks run terkecil di komponennya."""
    lab = np.arange(n)
    if len(a) == 0:
        return lab
    while True:
        la, lb = lab[a], lab[b]
        if np.array_equal(la, lb):
            return lab
        m = np.minimum(la, lb)
        np.minimum.at(lab, la, m)
        np.minimum.at(lab, lb, m)
        while True:
            nxt = lab[lab]
            if np.array_equal(nxt, lab):
                break
            lab = nxt


@_old_kw({"konek": "connectivity"})
def connected_components(mask, connectivity=8):
    """connectedComponentsWithStats. Kembalikan (n, label int32 HxW, stat int32 n x 5 (x, y, w, h, luas), pusat n x 2).
    Label 0 = latar (piksel 0); label 1.. berurutan menurut piksel pertama (urutan raster), sama dengan OpenCV."""
    ys, xs, xe, H, W = _run(mask)
    n = len(ys)
    k = 1 if connectivity == 8 else 0
    S = W + 3
    gs, ge = ys * S + xs, ys * S + xe
    q_lo = (ys - 1) * S + xs - k
    q_hi = (ys - 1) * S + xe + k
    lo = np.searchsorted(ge, q_lo, side="right")
    hi = np.searchsorted(gs, q_hi, side="left")
    cnt = np.maximum(hi - lo, 0)
    bi = np.repeat(np.arange(n), cnt)
    off = np.arange(cnt.sum()) - np.repeat(np.cumsum(cnt) - cnt, cnt)
    ai = np.repeat(lo, cnt) + off
    root = _union_find(n, ai, bi)
    uniq, inv = np.unique(root, return_inverse=True)
    nl = len(uniq) + 1
    if connectivity == 8 and n:
        # OpenCV 8-konek memindai blok 2 x 2 (Spaghetti/BBDT): urutan label = blok pertama komponen
        key = np.full(len(uniq), np.iinfo(np.int64).max)
        np.minimum.at(key, inv, (ys // 2).astype(np.int64) * (W + 2) + xs // 2)
        rank = np.empty(len(uniq), np.int64)
        rank[np.argsort(key, kind="stable")] = np.arange(len(uniq))
        inv = rank[inv]
    lr = inv + 1
    ln = xe - xs
    label = np.zeros(H * W, np.int32)
    tot = int(ln.sum())
    if tot:
        st0 = ys * W + xs
        pos = np.repeat(st0 - (np.cumsum(ln) - ln), ln) + np.arange(tot)
        label[pos] = np.repeat(lr, ln)
    label = label.reshape(H, W)
    stat = np.zeros((nl, 5), np.int64)
    cen = np.zeros((nl, 2))
    if n:
        x0 = np.full(nl, W)
        y0 = np.full(nl, H)
        x1 = np.zeros(nl, np.int64)
        y1 = np.zeros(nl, np.int64)
        np.minimum.at(x0, lr, xs)
        np.minimum.at(y0, lr, ys)
        np.maximum.at(x1, lr, xe)
        np.maximum.at(y1, lr, ys + 1)
        area = np.bincount(lr, ln, nl)
        sx = np.bincount(lr, (xs + xe - 1) * ln / 2.0, nl)
        sy = np.bincount(lr, ys * ln * 1.0, nl)
        stat[1:, 0], stat[1:, 1] = x0[1:], y0[1:]
        stat[1:, 2], stat[1:, 3] = x1[1:] - x0[1:], y1[1:] - y0[1:]
        stat[1:, 4] = area[1:]
        cen[1:, 0] = sx[1:] / np.maximum(area[1:], 1)
        cen[1:, 1] = sy[1:] / np.maximum(area[1:], 1)
    bg = label == 0
    nbg = int(bg.sum())
    if nbg:
        r = np.flatnonzero(bg.any(axis=1))
        c = np.flatnonzero(bg.any(axis=0))
        stat[0] = (c[0], r[0], c[-1] - c[0] + 1, r[-1] - r[0] + 1, nbg)
        tx = W * (W - 1) / 2.0 * H - (stat[1:, 4] * cen[1:, 0]).sum()
        ty = H * (H - 1) / 2.0 * W - (stat[1:, 4] * cen[1:, 1]).sum()
        cen[0] = (tx / nbg, ty / nbg)
    return nl, label, stat.astype(np.int32), cen


# ---------------- kontur ----------------
_CHAIN_CODE = ((1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1))


def _trace_outer(buf, Wp, x0, y0):
    """Ikuti batas luar mulai (x0, y0) (piksel kiri = 0) seperti icvFetchContour, CHAIN_APPROX_NONE."""
    dl = [dx + dy * Wp for dx, dy in _CHAIN_CODE] * 2
    i0 = y0 * Wp + x0
    s = s_end = 4
    while True:
        s = (s - 1) & 7
        i1 = i0 + dl[s]
        if buf[i1] or s == s_end:
            break
    if s == s_end:
        return [(x0, y0)]
    pts = []
    x, y = x0, y0
    i3 = i0
    while True:
        while True:
            s += 1
            i4 = i3 + dl[s]
            if buf[i4]:
                break
        s &= 7
        pts.append((x, y))
        x += _CHAIN_CODE[s][0]
        y += _CHAIN_CODE[s][1]
        if i4 == i0 and i3 == i1:
            break
        i3 = i4
        s = (s + 4) & 7
    return pts


def outer_contours(mask):
    """findContours(mask, RETR_EXTERNAL, CHAIN_APPROX_NONE)[0]: batas luar tiap komponen 8-konek yang tidak berada di
    dalam lubang komponen lain. Urutan daftar dan titik sama dengan OpenCV (komponen terakhir dulu)."""
    m = np.asarray(mask) != 0
    H, W = m.shape
    p = np.zeros((H + 2, W + 2), np.uint8)
    p[1:-1, 1:-1] = m
    nf, labf, statf, _ = connected_components(p, 8)
    nb, labb, _, _ = connected_components(p == 0, 4)
    outer = labb[0, 0]
    buf = p.tobytes()
    first = []
    for i in range(1, nf):
        y = int(statf[i, 1])
        x = int(np.flatnonzero(labf[y] == i)[0])
        first.append((y, x))
    out = []
    for y, x in sorted(first):                        # urutan raster piksel pertama (urutan pindai OpenCV)
        if labb[y, x - 1] != outer:
            continue
        pts = _trace_outer(buf, W + 2, x, y)
        out.append(np.array(pts, np.int32).reshape(-1, 1, 2) - 1)
    return out[::-1]


# ---------------- gambar (port raster OpenCV, LINE_8) ----------------
_XY_SHIFT = 16
_XY_ONE = 1 << _XY_SHIFT


def _put_pixels(img, ys, xs, color):
    a = img
    H, W = a.shape[:2]
    ys, xs = np.asarray(ys, np.int64), np.asarray(xs, np.int64)
    ok = (ys >= 0) & (ys < H) & (xs >= 0) & (xs < W)
    ys, xs = ys[ok], xs[ok]
    if a.ndim == 2:
        a[ys, xs] = color if np.isscalar(color) else color[0]
    else:
        c = np.array(color if not np.isscalar(color) else (color,) * a.shape[2], dtype=np.float64)
        a[ys, xs] = c[:a.shape[2]].astype(a.dtype)


def _cv_round(v):
    """cvRound: pembulatan ke genap terdekat."""
    return int(np.rint(v))


def _c_div(a, b):
    """Pembagian bilangan bulat C (pangkas ke nol)."""
    q = abs(a) // abs(b)
    return q if (a >= 0) == (b > 0) else -q


def _filled_circle(r):
    """Offset piksel lingkaran isi radius r (Circle midpoint OpenCV, fill = 1)."""
    pts = set()
    err, dx, dy, plus, minus = 0, r, 0, 1, (r << 1) - 1
    while dx >= dy:
        for yy, x0, x1 in ((dy, -dx, dx), (-dy, -dx, dx), (dx, -dy, dy), (-dx, -dy, dy)):
            for xx in range(x0, x1 + 1):
                pts.add((xx, yy))
        dy += 1
        err += plus
        plus += 2
        mask = 0 if err <= 0 else -1
        err -= minus & mask
        dx += mask
        minus -= mask & 2
    return list(pts)


def _line8(p1, p2):
    """Line LINE_8 (LineIterator kiri-ke-kanan): list (x, y)."""
    (x1, y1), (x2, y2) = p1, p2
    if x2 < x1:
        x1, y1, x2, y2 = x2, y2, x1, y1
    dx, dy = x2 - x1, y2 - y1
    sy = -1 if dy < 0 else 1
    dy = abs(dy)
    xmajor = dx >= dy
    if not xmajor:
        dx, dy = dy, dx
    err, plus, minus = dx - (dy + dy), dx + dx, -(dy + dy)
    x, y, out = x1, y1, []
    for _ in range(dx + 1):
        out.append((x, y))
        m = err < 0
        err += minus + (plus if m else 0)
        if xmajor:
            x += 1
            y += sy if m else 0
        else:
            y += sy
            x += 1 if m else 0
    return out


def _clip_line(W, H, p1, p2):
    """clipLine OpenCV (versi int64): potong ruas ke [0, W-1] x [0, H-1]. Hasil (p1, p2) atau None bila di luar."""
    if W <= 0 or H <= 0:
        return None
    (x1, y1), (x2, y2) = p1, p2
    right, bottom = W - 1, H - 1
    c1 = (x1 < 0) + (x1 > right) * 2 + (y1 < 0) * 4 + (y1 > bottom) * 8
    c2 = (x2 < 0) + (x2 > right) * 2 + (y2 < 0) * 4 + (y2 > bottom) * 8
    if (c1 & c2) == 0 and (c1 | c2) != 0:
        if c1 & 12:
            a = 0 if c1 < 8 else bottom
            x1 += int(float(a - y1) * (x2 - x1) / (y2 - y1))
            y1 = a
            c1 = (x1 < 0) + (x1 > right) * 2
        if c2 & 12:
            a = 0 if c2 < 8 else bottom
            x2 += int(float(a - y2) * (x2 - x1) / (y2 - y1))
            y2 = a
            c2 = (x2 < 0) + (x2 > right) * 2
        if (c1 & c2) == 0 and (c1 | c2) != 0:
            if c1:
                a = 0 if c1 == 1 else right
                y1 += int(float(a - x1) * (y2 - y1) / (x2 - x1))
                x1 = a
                c1 = 0
            if c2:
                a = 0 if c2 == 1 else right
                y2 += int(float(a - x2) * (y2 - y1) / (x2 - x1))
                x2 = a
                c2 = 0
    if c1 | c2:
        return None
    return (x1, y1), (x2, y2)


def _line2(p1, p2, size=None):
    """Line2: garis titik tetap (koordinat x 2^16), dipakai FillConvexPoly untuk tepi. ukuran = (W, H) piksel:
    ruas dipotong dulu seperti OpenCV (clipLine pada ukuran x 2^16)."""
    if size is not None:
        k = _clip_line(size[0] << _XY_SHIFT, size[1] << _XY_SHIFT, p1, p2)
        if k is None:
            return []
        p1, p2 = k
    (x1, y1), (x2, y2) = p1, p2
    dx, dy = x2 - x1, y2 - y1
    ax, ay = abs(dx), abs(dy)
    if ax > ay:
        if dx < 0:
            x1, y1, x2, y2 = x2, y2, x1, y1
            dy = -dy
        xs, ys = _XY_ONE, _c_div(dy << _XY_SHIFT, ax | 1)
        n = (x2 - x1) >> _XY_SHIFT
    else:
        if dy < 0:
            x1, y1, x2, y2 = x2, y2, x1, y1
            dx = -dx
        xs, ys = _c_div(dx << _XY_SHIFT, ay | 1), _XY_ONE
        n = (y2 - y1) >> _XY_SHIFT
    x1 += _XY_ONE >> 1
    y1 += _XY_ONE >> 1
    out = [((x2 + (_XY_ONE >> 1)) >> _XY_SHIFT, (y2 + (_XY_ONE >> 1)) >> _XY_SHIFT)]   # Line2 juga menaruh ujung pt2
    for _ in range(n + 1):
        out.append((x1 >> _XY_SHIFT, y1 >> _XY_SHIFT))
        x1 += xs
        y1 += ys
    return out


def _fill_convex_poly(v, size=None):
    """FillConvexPoly(v, shift = 16) non-AA: tepi Line2 + isi baris. v = list (x, y) titik tetap."""
    n = len(v)
    delta = 1 << (_XY_SHIFT - 1)
    out = []
    p0 = v[-1]
    for p in v:
        out += _line2(p0, p, size)
        p0 = p
    ymin = min(p[1] for p in v)
    imin = [p[1] for p in v].index(ymin)
    ymax = max(p[1] for p in v)
    ymin, ymax = (ymin + delta) >> _XY_SHIFT, (ymax + delta) >> _XY_SHIFT
    edges = n
    E = [dict(idx=imin, ye=ymin, di=1, x=-_XY_ONE, dx=0), dict(idx=imin, ye=ymin, di=n - 1, x=-_XY_ONE, dx=0)]
    y = ymin
    while True:
        for e in E:
            if y >= e["ye"]:
                idx0, di = e["idx"], e["di"]
                idx = idx0 + di
                if idx >= n:
                    idx -= n
                while True:
                    cond = edges > 0
                    edges -= 1
                    if not cond:
                        break
                    ty = (v[idx][1] + delta) >> _XY_SHIFT
                    if ty > y:
                        xs, xe = v[idx0][0], v[idx][0]
                        e["ye"] = ty
                        e["dx"] = _c_div((xe - xs) * 2 + (ty - y), 2 * (ty - y))
                        e["x"] = xs
                        e["idx"] = idx
                        break
                    idx0 = idx
                    idx += di
                    if idx >= n:
                        idx -= n
        if edges < 0:
            break
        l, r = (1, 0) if E[0]["x"] > E[1]["x"] else (0, 1)
        x1 = (E[l]["x"] + (_XY_ONE >> 1)) >> _XY_SHIFT
        x2 = (E[r]["x"] + (_XY_ONE >> 1)) >> _XY_SHIFT
        out += [(x, y) for x in range(x1, x2 + 1)]
        E[0]["x"] += E[0]["dx"]
        E[1]["x"] += E[1]["dx"]
        y += 1
        if y > ymax:
            break
    return out


_CAP = {}


def _stamp(dx, dy, thickness, caps):
    """Piksel ThickLine relatif p0 untuk ruas (0, 0) -> (dx, dy); ujung = bendera lingkaran (1 awal, 2 akhir)."""
    key = (dx, dy, thickness, caps)
    if key in _CAP:
        return _CAP[key]
    pts = []
    if thickness <= 1:
        pts = _line8((0, 0), (dx, dy))
    else:
        p0, p1 = (0, 0), (dx << _XY_SHIFT, dy << _XY_SHIFT)
        fx, fy = -dx * 1.0, dy * 1.0
        r2 = fx * fx + fy * fy
        odd = thickness & 1
        th = thickness << (_XY_SHIFT - 1)
        if r2 > 1e-12:
            r = (th + odd * _XY_ONE * 0.5) / math.sqrt(r2)
            ddx, ddy = _cv_round(fy * r), _cv_round(fx * r)
            pts += _fill_convex_poly([(p0[0] + ddx, p0[1] + ddy), (p0[0] - ddx, p0[1] - ddy),
                                      (p1[0] - ddx, p1[1] - ddy), (p1[0] + ddx, p1[1] + ddy)])
        rad = (th + (_XY_ONE >> 1)) >> _XY_SHIFT
        circ = _filled_circle(rad)
        if caps & 1:
            pts += circ
        if caps & 2:
            pts += [(x + dx, y + dy) for x, y in circ]
    a = np.array(sorted(set(pts)), np.int64).reshape(-1, 2)
    if len(_CAP) < 4096:
        _CAP[key] = a
    return a


def _inside(W, H, *pts):
    return all(0 <= x < W and 0 <= y < H for x, y in pts)


def _thick_line(p0, p1, thickness, caps=3, size=None):
    """Piksel ThickLine absolut. ukuran = (W, H): bila ruas keluar kanvas, kliping ditiru persis seperti OpenCV
    (LineIterator / Line2 memotong ruas dulu, jadi titik Bresenham-nya bergeser); stempel relatif tidak dipakai."""
    if size is not None:
        W, H = size
        if thickness <= 1:
            if not _inside(W, H, p0, p1):
                k = _clip_line(W, H, p0, p1)
                if k is None:
                    return np.zeros(0, np.int64), np.zeros(0, np.int64)
                a = np.array(_line8(*k), np.int64).reshape(-1, 2)
                return a[:, 1], a[:, 0]
        else:
            if not _inside(W, H, p0, p1):
                # OpenCV memotong ruas tebal ke kanvas yang diperlebar setebal garis, baru membuat poligon + tutup
                t = thickness
                k = _clip_line(W + 2 * t, H + 2 * t, (p0[0] + t, p0[1] + t), (p1[0] + t, p1[1] + t))
                if k is None:
                    return np.zeros(0, np.int64), np.zeros(0, np.int64)
                p0, p1 = (k[0][0] - t, k[0][1] - t), (k[1][0] - t, k[1][1] - t)
            dx, dy = p1[0] - p0[0], p1[1] - p0[1]
            fx, fy = -dx * 1.0, dy * 1.0
            r2 = fx * fx + fy * fy
            th = thickness << (_XY_SHIFT - 1)
            if r2 > 1e-12:
                r = (th + (thickness & 1) * _XY_ONE * 0.5) / math.sqrt(r2)
                ddx, ddy = _cv_round(fy * r), _cv_round(fx * r)
                q0 = (p0[0] << _XY_SHIFT, p0[1] << _XY_SHIFT)
                q1 = (p1[0] << _XY_SHIFT, p1[1] << _XY_SHIFT)
                v = [(q0[0] + ddx, q0[1] + ddy), (q0[0] - ddx, q0[1] - ddy),
                     (q1[0] - ddx, q1[1] - ddy), (q1[0] + ddx, q1[1] + ddy)]
                if not _inside(W << _XY_SHIFT, H << _XY_SHIFT, *v):
                    pts = _fill_convex_poly(v, (W, H))
                    rad = (th + (_XY_ONE >> 1)) >> _XY_SHIFT
                    circ = _filled_circle(rad)
                    if caps & 1:
                        pts += [(x + p0[0], y + p0[1]) for x, y in circ]
                    if caps & 2:
                        pts += [(x + p1[0], y + p1[1]) for x, y in circ]
                    a = np.array(sorted(set(pts)), np.int64).reshape(-1, 2)
                    return a[:, 1], a[:, 0]
    s = _stamp(p1[0] - p0[0], p1[1] - p0[1], thickness, caps)
    return s[:, 1] + p0[1], s[:, 0] + p0[0]


@_old_kw({"warna": "color", "tebal": "thickness"})
def line(img, p1, p2, color, thickness=1):
    """line(img, p1, p2, color, thickness), LINE_8."""
    p1, p2 = tuple(map(int, p1)), tuple(map(int, p2))
    ys, xs = _thick_line(p1, p2, thickness, 3, (img.shape[1], img.shape[0]))
    _put_pixels(img, ys, xs, color)
    return img


def _polyline(img, pts, color, thickness, closed=True):
    P = [tuple(map(int, q)) for q in np.asarray(pts).reshape(-1, 2)]
    if not P:
        return
    i = len(P) - 1 if closed else 0
    flags = 2 + (not closed)
    p0 = P[i]
    ys, xs = [], []
    for p in P[(0 if closed else 1):]:
        y, x = _thick_line(p0, p, thickness, flags, (img.shape[1], img.shape[0]))
        ys.append(y)
        xs.append(x)
        p0 = p
        flags = 2
    if ys:
        _put_pixels(img, np.concatenate(ys), np.concatenate(xs), color)


@_old_kw({"kontur": "contours", "warna": "color", "tebal": "thickness"})
def draw_contours(img, contours, color, thickness=1):
    """drawContours(img, contours, -1, color, thickness) for thickness >= 1 (closed PolyLine, LINE_8)."""
    for c in contours:
        _polyline(img, c, color, thickness, True)
    return img


@_old_kw({"warna": "color", "tebal": "thickness"})
def rectangle(img, p1, p2, color, thickness=1):
    """rectangle: thickness >= 1 outline, thickness < 0 filled."""
    (x0, y0), (x1, y1) = tuple(map(int, p1)), tuple(map(int, p2))
    if thickness < 0:
        ya, yb = sorted((y0, y1))
        xa, xb = sorted((x0, x1))
        gy, gx = np.mgrid[ya:yb + 1, xa:xb + 1]
        _put_pixels(img, gy.ravel(), gx.ravel(), color)
        return img
    _polyline(img, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], color, thickness, True)
    return img


# ---------------- kulit cembung ----------------
@_old_kw({"titik": "points"})
def convex_hull(points):
    """convexHull(points) -> array (M, 1, 2) dtype sama. Monotone chain; urutan mengikuti OpenCV (clockwise=False:
    berlawanan jarum jam bila sumbu y ke atas), mulai dari titik x terbesar; bila indeks hasil naik/turun melingkar,
    diputar supaya urut (indeks terkecil/terbesar di depan) seperti OpenCV."""
    a = np.asarray(points)
    P = a.reshape(-1, 2)
    if len(P) < 3:
        return a.reshape(-1, 1, 2).copy()
    order = np.lexsort((P[:, 1], P[:, 0]))
    Q = P[order].astype(np.float64)
    keep = np.ones(len(Q), bool)
    keep[1:] = np.any(Q[1:] != Q[:-1], axis=1)
    Q, idx = Q[keep], order[keep]

    def cross(o, p, q):
        return (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
    lower, upper = [], []
    for i in range(len(Q)):
        while len(lower) >= 2 and cross(Q[lower[-2]], Q[lower[-1]], Q[i]) <= 0:
            lower.pop()
        lower.append(i)
    for i in range(len(Q) - 1, -1, -1):
        while len(upper) >= 2 and cross(Q[upper[-2]], Q[upper[-1]], Q[i]) <= 0:
            upper.pop()
        upper.append(i)
    hull = lower[:-1] + upper[:-1]                     # berlawanan jarum jam (sumbu y ke atas), seperti OpenCV
    ids = [int(idx[h]) for h in hull]
    k = hull.index(len(Q) - 1)                         # mulai dari titik x terbesar (y terbesar bila seri)
    ids = ids[k:] + ids[:k]
    m = len(ids)
    rising = sum(ids[(i + 1) % m] > ids[i] for i in range(m))
    if rising >= m - 1:                                  # indeks naik melingkar: putar, indeks terkecil di depan
        k = ids.index(min(ids))
        ids = ids[k:] + ids[:k]
    elif rising <= 1:                                    # turun melingkar: indeks terbesar di depan
        k = ids.index(max(ids))
        ids = ids[k:] + ids[:k]
    return P[ids].reshape(-1, 1, 2).copy()


# ---------------- old (Indonesian) names: aliases so existing code keeps working ----------------
components = connected_components
WARNA, ABU, UTUH = COLOR, GRAY, UNCHANGED
KUBIK, TERDEKAT = CUBIC, NEAREST
baca = read
tulis = write
ubah_warna = cvt_color
ubah_ukuran = resize
blur_gauss = gaussian_blur
geser_affine = warp_affine
komponen = connected_components
kontur_luar = outer_contours
gambar_kontur = draw_contours
kulit_cembung = convex_hull
persegi = rectangle
garis = line
