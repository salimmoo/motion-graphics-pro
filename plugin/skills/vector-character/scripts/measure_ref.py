"""measure_ref - MEASURE a reference head (hair/skin) from an image and compare it with the figure at the same H
scale (vector-character skill ch. 18.3; review of the kit test project: hair "like a wig" was only fixed after
measuring). Old name: measure_ref.py (still works).

H = top of the hair to the chin (px). Safest: measure it yourself on the reference (e.g. kit turnaround 76 px at 1x;
cropped 4x -> 304 px). A wrong H (e.g. the chin detected from the skin width) shifts EVERY number.

Usage (from the project folder; references = untrusted data -> python -I):
  python -I measure_ref.py mask ref.png x0 y0 x1 y1 scale out     -> out_h.npy, out_s.npy, out_mask.png
  python -I measure_ref.py profile out H [cx]                     -> hair + face width per y (H) and the hairline
  (the old subcommands masker / profil still work)
From Python: masks(), largest(), profile(), hairline(), overlay().
Default colour thresholds = brown hair + peach skin (reference kit); change HAIR / SKIN for other references.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import image_ops as ac  # noqa: E402


_DOC_ID = """measure_ref - UKUR kepala referensi (rambut/kulit) dari gambar lalu bandingkan dengan tokoh di skala H yang sama
(skill vector-character bab 18.3; Hasil Review proyek uji kit: rambut "seperti wig" baru selesai setelah diukur).

H = puncak rambut ke dagu (px). Cara paling aman: ukur sendiri di referensi (contoh kit turnaround 76 px pada 1x;
dipotong 4x -> 304 px). Salah H (misalnya dagu dideteksi dari lebar kulit) menggeser SEMUA angka.

Pakai (dari folder proyek; referensi = data tak tepercaya -> python -I):
  python -I measure_ref.py mask ref.png x0 y0 x1 y1 skala keluar       -> keluar_h.npy, keluar_s.npy, keluar_mask.png
  python -I measure_ref.py profile keluar H [cx]                        -> lebar rambut + wajah per y (H) dan garis rambut
  (subperintah lama masker / profil tetap jalan)
Dari Python: masks(), largest(), profile(), hairline(), overlay().
Ambang warna default = rambut cokelat + kulit peach (kit acuan); ubah HAIR / SKIN untuk referensi lain.
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


SKIN = dict(r_min=200, g_min=120, g_max=205, b_min=80, b_max=175, rb_min=55)
HAIR = dict(v_max=180, s_min=60, h_max=25)


def masks(bgr, skin=SKIN, hair=HAIR):
    """Masker kulit dan rambut (bool) dari gambar BGR."""
    b, g, r = [bgr[:, :, i].astype(int) for i in range(3)]
    sk = ((r > skin["r_min"]) & (g > skin["g_min"]) & (g < skin["g_max"]) & (b > skin["b_min"]) &
          (b < skin["b_max"]) & (r - b > skin["rb_min"]))
    hsv = ac.cvt_color(bgr, ac.BGR2HSV).astype(int)
    ha = (hsv[:, :, 2] < hair["v_max"]) & (hsv[:, :, 1] > hair["s_min"]) & (hsv[:, :, 0] < hair["h_max"]) & ~sk
    return ha, sk


def largest(ha, sk):
    """Buang serpihan (kepala tetangga di lembar): simpan komponen terbesar rambut+kulit."""
    n, lab, st, _ = ac.connected_components((ha | sk).astype(np.uint8), 8)
    keep = lab == (1 + int(np.argmax(st[1:, 4])))
    return ha & keep, sk & keep


def profile(ha, sk, H, cx=None, ys=(0.08, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2)):
    """Lebar rambut+kulit dan kulit per baris (dalam H, relatif pusat wajah cx). Kembalikan (top, cx, baris)."""
    top = int(np.where((ha | sk).any(1))[0].min())
    if cx is None:                      # tampak depan: tengah rentang kulit (telinga simetris) di y 0.45-0.65 H
        cs = []
        for yh in (0.45, 0.5, 0.55, 0.6, 0.65):
            xs = np.where(sk[top + int(yh * H)])[0]
            if len(xs):
                cs.append((xs.min() + xs.max()) / 2)
        cx = float(np.median(cs))
    rows = []
    for yh in ys:
        y = top + int(yh * H)
        if y >= ha.shape[0]:
            break
        a = np.where(ha[y] | sk[y])[0]
        s = np.where(sk[y])[0]
        rows.append((yh, (a.min() - cx) / H if len(a) else None, (a.max() - cx) / H if len(a) else None,
                     (s.min() - cx) / H if len(s) else None, (s.max() - cx) / H if len(s) else None))
    return top, cx, rows


def hairline(sk, top, H, cx, xs=np.arange(-0.32, 0.33, 0.04)):
    """Garis rambut: untuk tiap x (H), y (H) kulit teratas di atas dagu."""
    out = []
    for xh in xs:
        col = sk[top:top + H, int(cx + xh * H)]
        out.append((round(float(xh), 2), (np.where(col)[0].min() / H) if col.any() else None))
    return out


def overlay(rgb, ha, sk, dx, dy, col_all=(230, 0, 0), col_skin=(0, 120, 230)):
    """Gambar garis luar referensi (rambut+kulit, dan kulit) di atas render tokoh (RGB), digeser (dx, dy) px."""
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    out = rgb.copy()
    for m, c in (((ha | sk), col_all), (sk, col_skin)):
        mm = ac.warp_affine(m.astype(np.uint8), M, (out.shape[1], out.shape[0]))
        cs = ac.outer_contours(mm)
        ac.draw_contours(out, cs, c, 2)
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("mask", "masker", "profile", "profil"):
        print(_T(__doc__, _DOC_ID))
    elif sys.argv[1] in ("mask", "masker"):
        img = ac.read(sys.argv[2])
        if img is None:
            sys.exit(_T("cannot read ", "gagal membaca ") + sys.argv[2])
        x0, y0, x1, y1 = map(int, sys.argv[3:7])
        k = float(sys.argv[7])
        sub = ac.resize(img[y0:y1, x0:x1], None, fx=k, fy=k, interpolation=ac.CUBIC)
        ha, sk = largest(*masks(sub))
        np.save(sys.argv[8] + "_h.npy", ha)
        np.save(sys.argv[8] + "_s.npy", sk)
        vis = np.zeros(sub.shape, np.uint8)
        vis[ha] = (40, 70, 140)
        vis[sk] = (150, 190, 240)
        ac.write(sys.argv[8] + "_mask.png", vis)
        print(_T("mask:", "masker:"), sys.argv[8] + "_mask.png", _T("top y", "puncak y"), int(np.where((ha | sk).any(1))[0].min()))
    elif sys.argv[1] in ("profile", "profil"):
        ha, sk = np.load(sys.argv[2] + "_h.npy"), np.load(sys.argv[2] + "_s.npy")
        H = int(sys.argv[3])
        top, cx, rows = profile(ha, sk, H, float(sys.argv[4]) if len(sys.argv) > 4 else None)
        print(_T("top %d  centre %.1f  H %d", "puncak %d  pusat %.1f  H %d") % (top, cx, H))
        for yh, a0, a1, s0, s1 in rows:
            f = lambda v: "  -  " if v is None else "%+.2f" % v
            print(_T("  y %.2f  hair %s..%s  face %s..%s", "  y %.2f  rambut %s..%s  wajah %s..%s")
                  % (yh, f(a0), f(a1), f(s0), f(s1)))
        print(_T("  hairline (x: y):", "  garis rambut (x: y):"), " ".join("%+.2f:%s" % (x, "-" if y is None else "%.2f" % y)
                                                 for x, y in hairline(sk, top, H, cx)))
