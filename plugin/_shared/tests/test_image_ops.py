"""test_image_ops - compare image_ops with OpenCV (skipped when cv2 is not installed).
Old name: _bersama/uji/uji_atelier_citra.py.

Usage: python -I -X utf8 test_image_ops.py [out_folder]   (default: a new temp folder, never the current folder)
Tolerances: colour/HSV max 1, resize max 2 (mean < 0.05), float blur max 1e-4, warp/contours/components identical,
drawn contours/rectangles differ by <= 0.5 % of the painted pixels.
"""
import os
import sys
import tempfile
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import image_ops as ac  # noqa: E402



def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


try:
    import cv2
except ImportError:
    print(_T("cv2 not installed: comparison tests skipped", "cv2 tidak terpasang: uji pembanding dilewati"))
    sys.exit(0)

rng = np.random.default_rng(3)
RESULTS = []


def report(name, ok, info):
    RESULTS.append((name, ok, info))
    print("%-34s %s  %s" % (name, "OK  " if ok else _T("FAIL ", "GAGAL"), info))


def blob(h, w, n=14, seed=0):
    r = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.zeros((h, w), bool)
    for _ in range(n):
        cy, cx, ry, rx = r.uniform(0, h), r.uniform(0, w), r.uniform(3, h / 5), r.uniform(3, w / 5)
        e = ((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2
        m ^= e < 1 if r.random() < 0.3 else False
        m |= e < 1
        m &= ~(e < 0.15) if r.random() < 0.4 else True
    m |= r.random((h, w)) < 0.002
    return m


def main(out):
    img = (rng.random((233, 311, 3)) * 255).astype(np.uint8)
    img[40:120, 50:200] = (30, 160, 240)
    # colour
    for code, cvk in ((ac.BGR2HSV, cv2.COLOR_BGR2HSV), (ac.RGB2BGR, cv2.COLOR_RGB2BGR), (ac.BGR2GRAY, cv2.COLOR_BGR2GRAY)):
        a, b = ac.cvt_color(img, code).astype(int), cv2.cvtColor(img, cvk).astype(int)
        d = np.abs(a - b)
        if code == ac.BGR2HSV:                          # circular hue (0 == 180)
            d[..., 0] = np.minimum(d[..., 0], 180 - d[..., 0])
        report("cvtColor " + code, d.max() <= 1, "max %d, differs %.4f %%" % (d.max(), 100 * (d > 0).mean()))
    allc = np.stack(np.meshgrid(np.arange(0, 256, 3), np.arange(0, 256, 5), np.arange(0, 256, 7)), -1).reshape(1, -1, 3)
    allc = allc.astype(np.uint8)
    d = np.abs(ac.cvt_color(allc, ac.BGR2HSV).astype(int) - cv2.cvtColor(allc, cv2.COLOR_BGR2HSV).astype(int))
    report("cvtColor BGR2HSV (colour grid)", d.max() == 0, "max %d of %d colours" % (d.max(), allc.shape[1]))
    # resize
    big = (rng.random((2300, 1400)) < 0.5).astype(np.uint8) * 255
    big[:, 600:900] = 0
    for sz, src in (((210, 345), big), ((97, 61), img), ((300, 200), img)):
        t0 = time.time()
        a = ac.resize(src, sz, interpolation=ac.AREA).astype(int)
        t1 = time.time() - t0
        b = cv2.resize(src, sz, interpolation=cv2.INTER_AREA).astype(int)
        d = np.abs(a - b)
        report("resize AREA %s" % (sz,), d.max() <= 2 and d.mean() < 0.05, "max %d mean %.4f (%.3f s)" % (d.max(), d.mean(), t1))
    for sz in ((500, 400), (30, 200)):                 # AREA upscaling (both axes / one axis)
        a = ac.resize(img, sz, interpolation=ac.AREA).astype(int)
        b = cv2.resize(img, sz, interpolation=cv2.INTER_AREA).astype(int)
        d = np.abs(a - b)
        report("resize AREA upscale %s" % (sz,), d.max() <= 1 and d.mean() < 0.1, "max %d mean %.4f" % (d.max(), d.mean()))
    hd = (rng.random((1080, 1920, 3)) * 255).astype(np.uint8)
    for sz, interpolation, cvc in (((960, 540), ac.LINEAR, cv2.INTER_LINEAR), ((640, 360), ac.AREA, cv2.INTER_AREA)):
        t0 = time.time()
        a = ac.resize(hd, sz, interpolation=interpolation).astype(int)
        t1 = time.time() - t0
        d = np.abs(a - cv2.resize(hd, sz, interpolation=cvc).astype(int))
        report("resize 1080p %s %s" % (interpolation, sz), d.max() <= 1 and t1 < 1.0, "max %d (%.3f s)" % (d.max(), t1))
    for k in (4.0, 2.5, 0.7):
        a = ac.resize(img[10:90, 20:120], None, fx=k, fy=k, interpolation=ac.CUBIC).astype(int)
        b = cv2.resize(img[10:90, 20:120], None, fx=k, fy=k, interpolation=cv2.INTER_CUBIC).astype(int)
        d = np.abs(a - b)
        report("resize CUBIC x%.1f" % k, a.shape == b.shape and d.max() <= 2 and d.mean() < 0.05,
              "max %d mean %.4f" % (d.max(), d.mean()))
    # blur
    for sig, shape in ((1.1, (300, 420)), (19.8, (700, 500))):
        f = rng.normal(0, 1, shape).astype(np.float32)
        t0 = time.time()
        a = ac.gaussian_blur(f, sig)
        t1 = time.time() - t0
        b = cv2.GaussianBlur(f, (0, 0), sig)
        d = np.abs(a - b).max()
        report("GaussianBlur sigma %.1f" % sig, d < 1e-4 * max(1, np.abs(b).max()), "max %.2e (%.3f s)" % (d, t1))
    # warpAffine
    m = blob(180, 240).astype(np.uint8)
    for dx, dy in ((3, -5), (7.3, 2.6), (-11.55, 4.49)):
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        a = ac.warp_affine(m, M, (260, 200))
        b = cv2.warpAffine(m, M, (260, 200))
        report("warpAffine shift (%.2f, %.2f)" % (dx, dy), np.array_equal(a, b), "%d pixels differ" % int((a != b).sum()))
    M = cv2.getRotationMatrix2D((120, 90), 17, 1.1)
    gimg = img[:, :, 1].copy()
    a, b = ac.warp_affine(gimg, M, (300, 220)).astype(int), cv2.warpAffine(gimg, M, (300, 220)).astype(int)
    report("warpAffine rotate+scale", np.abs(a - b).max() <= 1, "max %d" % np.abs(a - b).max())
    # components
    for seed in range(4):
        m = blob(400, 500, 30, seed).astype(np.uint8)
        for k in (4, 8):
            t0 = time.time()
            n1, l1, s1, c1 = ac.connected_components(m, k)
            t1 = time.time() - t0
            n2, l2, s2, c2 = cv2.connectedComponentsWithStats(m, connectivity=k)
            ok = n1 == n2 and np.array_equal(l1, l2) and np.array_equal(s1, s2) and np.allclose(c1, c2)
            report("connectedComponents seed %d k %d" % (seed, k), ok, "n %d vs %d (%.3f s)" % (n1, n2, t1))
    # contours
    for seed in range(5):
        m = blob(300, 360, 25, seed + 10).astype(np.uint8)
        a = ac.outer_contours(m)
        b, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        same = len(a) == len(b) and all(np.array_equal(x, y) for x, y in zip(a, b))
        report("findContours seed %d" % seed, same, "%d vs %d contours" % (len(a), len(b)))
        for tb in (1, 2, 3):
            ca = np.zeros((300, 360, 3), np.uint8)
            cb = ca.copy()
            ac.draw_contours(ca, b, (230, 0, 0), tb)
            cv2.drawContours(cb, b, -1, (230, 0, 0), tb)
            dd = (ca != cb).any(axis=2).sum()
            ref = max(1, (cb != 0).any(axis=2).sum())
            report("drawContours thickness %d seed %d" % (tb, seed), dd <= 0.005 * ref, "%d of %d differ" % (dd, ref))
    # rectangle + line
    for tb in (1, 2, 3, -1):
        ca = np.zeros((90, 120, 3), np.uint8)
        cb = ca.copy()
        for (p, q) in (((5, 5), (60, 40)), ((70, 20), (110, 85)), ((30, 50), (31, 51))):
            ac.rectangle(ca, p, q, (0, 0, 255), tb)
            cv2.rectangle(cb, p, q, (0, 0, 255), tb)
        dd = (ca != cb).any(axis=2).sum()
        report("rectangle thickness %d" % tb, dd == 0, "%d differ" % dd)
    # lines with ends outside the canvas (clipped like clipLine)
    for tb in (1, 2, 5):
        r = np.random.default_rng(40 + tb)
        ca = np.zeros((240, 320, 3), np.uint8)
        cb = ca.copy()
        for _ in range(60):
            p, q = tuple(int(v) for v in r.integers(-150, 480, 2)), tuple(int(v) for v in r.integers(-150, 480, 2))
            ac.line(ca, p, q, (255, 200, 0), tb)
            cv2.line(cb, p, q, (255, 200, 0), tb)
        dd = (ca != cb).any(axis=2).sum()
        report("line outside canvas thickness %d" % tb, dd == 0, "%d differ" % dd)
    # convex hull
    okc = 0
    for seed in range(50):
        r = np.random.default_rng(seed)
        P = (r.normal(0, 1, (40, 2)) * 300).astype(np.float32).reshape(-1, 1, 2)
        if seed % 5 == 0:
            P = np.round(P / 50) * 50
        a, b = ac.convex_hull(P), cv2.convexHull(P)
        okc += a.shape == b.shape and np.array_equal(a, b)
    report("convexHull 50 point sets", okc == 50, "%d / 50 identical" % okc)
    # read/write
    p = os.path.join(out, "_test_rw.png")
    ac.write(p, img)
    b = cv2.imread(p)
    a = ac.read(p)
    report("imwrite/imread", np.array_equal(a, img) and np.array_equal(b, img), "PNG round trip")
    failed = [h for h in RESULTS if not h[1]]
    print(_T("\n%d tests, %d failed", "\n%d uji, %d gagal") % (len(RESULTS), len(failed)))
    return RESULTS


if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix="mgp-test-image-ops-")
    os.makedirs(o, exist_ok=True)
    main(o)
