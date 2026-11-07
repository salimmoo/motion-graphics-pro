"""gaya - lapisan gaya "tangan" (skill vector-character bab 18.2; proyek uji kit). Pakai sebagai pengganti pelukis
Fig.fill/shade/ink (geometri tidak berubah). Pelajaran: goyang tepi kecil saja (gelombang panjang 0.003 H), goresan
tanpa goyang garis tengah, grain hanya bila diminta - derau berlebihan terbaca "AI".
Diukur dari kit acuan: tepi bentuk tidak sempurna (lengkung bergoyang halus, tidak simetris), garis detail
bertekanan (pangkal tumpul, ujung tirus, tebal bergoyang), permukaan bergrain + bintik warna halus.
- organic(path): kontur disampel per 1.6 px, digeser sepanjang normal dengan derau 1D berbasis PANJANG BUSUR
  (bukan posisi layar), jadi bentuk potongan tetap sama saat diputar di pivot (aman untuk rig, tidak "mendidih").
- hand_stroke(): goresan bertekanan dengan goyang garis tengah.
- tekstur(): grain halus + bintik warna (mottling) pada piksel figur saja.
Geometri potongan tidak diubah; lapisan ini mengganti pelukis (skill bab 5: gaya = modul cat terpisah).
Butuh: numpy, Pillow (brush + image_ops); skia-python opsional.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import image_ops as ac  # noqa: E402
import brush  # noqa: E402

AMP = 0.0030          # goyang tepi (H): hanya gelombang panjang (tepi kit mulus, tidak gemetar)
MICRO = 0.0           # kekasaran potong tangan (H); 0 = tepi bersih seperti kit


def _noise(d, L, closed, seed, hp):
    lam = (0.42, 0.23)
    amp = (0.70, 0.30)
    off = 0.0
    for k, (lm, a) in enumerate(zip(lam, amp)):
        ph = (seed * 2.399 + k * 1.913) % (2 * math.pi)
        cyc = max(1, round(L / (lm * hp))) if closed else L / (lm * hp)
        off += a * math.sin(2 * math.pi * cyc * d / L + ph)
    return off


def organic(path, hp, seed=0, amp=AMP):
    """Contour bergoyang halus (stabil terhadap rotasi/translasi potongan)."""
    out = brush.Path()
    out.fill_rule = path.fill_rule
    for ci, m in enumerate(brush.measure(path)):
        L = m.length
        if L > 2:
            closed = m.closed
            n = max(16, int(L / 1.6))
            k = min(1.0, max(0.12, L / (1.6 * hp)))          # bentuk kecil (mata, kuku) hampir tidak digoyang
            a = amp * hp * k
            sd = seed + ci * 7 + int(L) % 97
            for i in range(n + (0 if closed else 1)):
                d = L * i / n
                pos, tan = m.pos_tan(min(d, L - 1e-3))
                o = a * _noise(d, L, closed, sd, hp)
                x, y = pos[0] - tan[1] * o, pos[1] + tan[0] * o
                if i == 0:
                    out.move_to(x, y)
                else:
                    out.line_to(x, y)
            if closed:
                out.close()
    return out


def hand_stroke(pts, w, taper=(1.0, 1.0), seed=0):
    """Goresan bertekanan (px): pangkal agak tumpul, ujung tirus, tebal bergoyang +-18%, garis tengah bergoyang."""
    import vkit
    c = vkit.catmull(pts)
    n = len(c)
    if n < 2:
        return brush.Path()
    ph1, ph2 = (seed * 1.7) % 6.28, (seed * 2.9) % 6.28
    left, right = [], []
    for i, p in enumerate(c):
        a = c[max(i - 1, 0)]
        b = c[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        t = i / (n - 1)
        prof = math.sin(math.pi * min(1.0, 0.12 + t * 0.92)) ** 0.55           # tekanan: puncak di 40%
        k = taper[0] if t < 0.4 else taper[1]
        if k != 1:
            prof = prof ** k
        mod = 1 + 0.10 * math.sin(2 * math.pi * 0.9 * t + ph1)
        hw = 0.5 * w * max(prof, 0.06) * mod
        wob = 0.0                                    # garis kit mulus dan yakin (goyang = kesan gemetar/AI)
        cx, cy = p[0] + nx * wob, p[1] + ny * wob
        left.append((cx + nx * hw, cy + ny * hw))
        right.append((cx - nx * hw, cy - ny * hw))
    return brush.Path().polygon(left + right[::-1])


def texture(img, mask, hp, seed=7, grain=0.011, mott=0.012):
    """img RGB uint8, mask bool (piksel figur). Grain halus (sigma 0.6 px) + bintik warna (skala 0.05 H)."""
    rng = np.random.default_rng(seed)
    h, w = mask.shape
    g = ac.gaussian_blur(rng.normal(0, 1, (h, w)).astype(np.float32), 1.1)
    g /= g.std() + 1e-6
    s = max(1.0, 0.06 * hp)
    mm = ac.gaussian_blur(rng.normal(0, 1, (h, w)).astype(np.float32), s)
    mm /= mm.std() + 1e-6
    f = 1.0 + grain * g + mott * mm
    out = img.astype(np.float32)
    out[mask] *= f[mask][:, None]
    return np.clip(out, 0, 255).astype(np.uint8)


# old name (gaya.py)
tekstur = texture
