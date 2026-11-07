"""bentuk - alat bentuk gaya kit (skill vector-character bab 5.1, 18; dari proyek uji kit):
- cap(F, a, b, ra, rb, bo, bi, at, cut): kapsul SINGGUNG untuk potongan rig 2D: lingkaran di pivot a dan b, sisi =
  garis singgung luar, gembung (bo/bi) nol di kedua ujung -> sambungan sendi tidak menonjol saat diputar;
  cut = potong tegak lurus sumbu (hem, manset).
- seg_caps(F, pts, rads): rantai kapsul (jari, ibu jari).
- curtain2(outer, inner, prof, tips): TIRAI rambut: dua tepi + profil gelombang rancangan (titik kunci, searah di
  kedua tepi) + ujung helai beragam (w, drop, flick) + garis pemisah dari takik + fungsi alur.
- curtain(...) (versi sinus lama), lock/wave_spine/offset_line (helai tunggal; untuk rambut panjang lebih baik tirai).
Satuan H di rangka vkit.Fig (x kanan, y ke bawah).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vkit  # noqa: E402
from vkit import spline  # noqa: E402


def _arc(cx, cy, r, d0, d1, through, n):
    a0, a1, at = (math.atan2(d[1], d[0]) for d in (d0, d1, through))
    tau = 2 * math.pi
    sw = (a1 - a0) % tau
    if (at - a0) % tau > sw:
        sw -= tau
    return [(cx + r * math.cos(a0 + sw * k / n), cy + r * math.sin(a0 + sw * k / n)) for k in range(n + 1)]


def cap_pts(a, b, ra, rb, bo=0.0, bi=0.0, at=0.40, n_arc=18, n_side=12):
    """Titik kontur kapsul singgung: lingkaran (a, ra) dan (b, rb) dihubungkan garis singgung luar.
    bo / bi = gembung sisi kanan / kiri (relatif arah a -> b) dengan puncak di fraksi `at`; profil nol di kedua
    ujung sehingga kontur tetap bersinggungan dengan lingkaran sendi (sambungan rig tanpa benjol)."""
    ax, ay = a
    bx, by = b
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    nx, ny = uy, -ux
    s = (rb - ra) / L
    c = math.sqrt(max(0.0, 1 - s * s))
    dR = (nx * c - ux * s, ny * c - uy * s)
    dL = (-nx * c - ux * s, -ny * c - uy * s)

    def prof(t):
        if t <= 0 or t >= 1:
            return 0.0
        v = t / at if t < at else (1 - t) / (1 - at)
        return math.sin(0.5 * math.pi * v) ** 2

    pts = _arc(ax, ay, ra, dL, dR, (-ux, -uy), n_arc)
    for k in range(1, n_side):
        t = k / n_side
        g = bo * prof(t)
        pts.append((ax + ra * dR[0] + (bx + rb * dR[0] - ax - ra * dR[0]) * t + dR[0] * g,
                    ay + ra * dR[1] + (by + rb * dR[1] - ay - ra * dR[1]) * t + dR[1] * g))
    pts += _arc(bx, by, rb, dR, dL, (ux, uy), n_arc)
    for k in range(1, n_side):
        t = 1 - k / n_side
        g = bi * prof(t)
        pts.append((ax + ra * dL[0] + (bx + rb * dL[0] - ax - ra * dL[0]) * t + dL[0] * g,
                    ay + ra * dL[1] + (by + rb * dL[1] - ay - ra * dL[1]) * t + dL[1] * g))
    return pts


def cap(F, a, b, ra, rb, bo=0.0, bi=0.0, at=0.40, cut=None):
    """Kapsul singgung sebagai path. cut = jarak dari a sepanjang sumbu tempat ujung b dipotong tegak lurus (hem,
    manset)."""
    p = F.pen(spline(cap_pts(a, b, ra, rb, bo, bi, at)))
    if cut is not None:
        ax, ay = a
        L = math.hypot(b[0] - ax, b[1] - ay)
        ux, uy = (b[0] - ax) / L, (b[1] - ay) / L
        nx, ny = uy, -ux
        P = lambda d, e: (ax + ux * d + nx * e, ay + uy * d + ny * e)
        p = vkit.inter(p, F.poly([P(-9, -9), P(cut, -9), P(cut, 9), P(-9, 9)]))
    return p


def seg_caps(F, pts, rads):
    """Rantai kapsul (jari): union kapsul singgung antar titik berurutan; ujung bulat di tiap ruas."""
    out = None
    for i in range(len(pts) - 1):
        q = F.pen(spline(cap_pts(pts[i], pts[i + 1], rads[i], rads[i + 1], n_arc=10, n_side=4)))
        out = q if out is None else vkit.union(out, q)
    return out


# ---------------- helai rambut bergelombang ----------------
def _resample(poly, n):
    d = [0.0]
    for i in range(1, len(poly)):
        d.append(d[-1] + math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]))
    out = []
    for k in range(n):
        s = d[-1] * k / (n - 1)
        j = max(1, min(len(poly) - 1, next((i for i in range(1, len(d)) if d[i] >= s), len(d) - 1)))
        t = (s - d[j - 1]) / ((d[j] - d[j - 1]) or 1)
        out.append((poly[j - 1][0] + (poly[j][0] - poly[j - 1][0]) * t,
                    poly[j - 1][1] + (poly[j][1] - poly[j - 1][1]) * t))
    return out, d[-1]


def wave_spine(spine, amp, waves, phase=0.0, start=0.25, n=48):
    """Garis tengah helai: spline melalui `spine`, digeser sepanjang normal dengan gelombang sinus yang amplitudonya
    naik halus dari 0 (pangkal, sampai fraksi `start`) ke `amp` (ujung). Hasil: titik (x, y) dan normal."""
    base = vkit.catmull(spine, 10)
    base = [(float(p[0]), float(p[1])) for p in base]
    pts, _ = _resample(base, n)
    out, nrm = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = dy / L, -dx / L
        t = i / (n - 1)
        r = 0.0 if t < start else min(1.0, (t - start) / (1 - start))
        r = r * r * (3 - 2 * r)
        o = amp * r * math.sin(2 * math.pi * waves * t + phase)
        out.append((x + nx * o, y + ny * o))
        nrm.append((nx, ny))
    return out, nrm


def lock_pts(spine, w0, w1, amp, waves, phase=0.0, start=0.25, tip=0.6, curl=0.0):
    """Contour helai: lebar w0 (pangkal) -> w1 (sebelum ujung), ujung membulat menyempit (fraksi `tip` dari lebar);
    curl = lentingan ujung ke arah normal (+ = kanan arah helai)."""
    c, nrm = wave_spine(spine, amp, waves, phase, start)
    n = len(c)
    if curl:
        for i in range(int(n * 0.78), n):
            t = (i - n * 0.78) / (n * 0.22)
            g = curl * t * t
            c[i] = (c[i][0] + nrm[i][0] * g, c[i][1] + nrm[i][1] * g)
    L, R = [], []
    for i in range(n):
        t = i / (n - 1)
        w = w0 + (w1 - w0) * t
        if t > 0.86:
            v = (t - 0.86) / 0.14
            w *= 1 - (1 - tip) * v * v
        a = c[max(0, i - 1)]
        b = c[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        Ln = math.hypot(dx, dy) or 1
        nx, ny = dy / Ln, -dx / Ln
        L.append((c[i][0] - nx * w / 2, c[i][1] - ny * w / 2))
        R.append((c[i][0] + nx * w / 2, c[i][1] + ny * w / 2))
    end = c[-1]
    a = c[-2]
    dx, dy = end[0] - a[0], end[1] - a[1]
    Ln = math.hypot(dx, dy) or 1
    tipp = (end[0] + dx / Ln * w1 * tip * 0.45, end[1] + dy / Ln * w1 * tip * 0.45)
    return R + [tipp] + L[::-1], c


def lock(F, spine, w0, w1, amp, waves, phase=0.0, start=0.25, tip=0.6, curl=0.0):
    pts, c = lock_pts(spine, w0, w1, amp, waves, phase, start, tip, curl)
    return F.pen(spline(pts[::2] if len(pts) > 120 else pts)), c


def offset_line(c, frac_w, w0, w1, t0=0.0, t1=1.0):
    """Garis alur di dalam helai: garis tengah helai digeser frac_w x lebar (negatif = kiri)."""
    n = len(c)
    out = []
    for i in range(int(t0 * (n - 1)), int(t1 * (n - 1)) + 1):
        a = c[max(0, i - 1)]
        b = c[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = dy / L, -dx / L
        w = w0 + (w1 - w0) * i / (n - 1)
        out.append((c[i][0] + nx * w * frac_w, c[i][1] + ny * w * frac_w))
    return out[::3] + ([out[-1]] if (len(out) - 1) % 3 else [])


# ---------------- tirai rambut (massa bergelombang gaya kit) ----------------
def _wave_x(poly, amp, waves, phase, start, n):
    """Gelombang tangan: panjang gelombang dan amplitudo bergoyang sepanjang helai (bukan sinus teratur)."""
    pts, _ = _resample([(float(p[0]), float(p[1])) for p in vkit.catmull(poly, 10)], n)
    out = []
    for i, (x, y) in enumerate(pts):
        t = i / (n - 1)
        r = 0.0 if t < start else min(1.0, (t - start) / (1 - start))
        r = (r * r * (3 - 2 * r)) ** 0.8
        th = 2 * math.pi * waves * t + phase + 0.45 * math.sin(2 * math.pi * 0.55 * t + phase * 1.7)
        am = amp * (0.70 + 0.45 * t) * (0.85 + 0.25 * math.sin(2 * math.pi * 0.8 * t + phase * 2.3))
        out.append((x + am * r * math.sin(th), y))
    return out


def curtain(outer, inner, amp=0.035, waves=1.8, phase=0.0, start=0.22, lobes=3, depth=0.055, curl=0.0, n=40,
            flat=False):
    """Tirai rambut: tepi `outer` dan `inner` (polyline atas -> bawah) digeser horizontal dengan gelombang sinus SEFASE
    (amplitudo naik dari pangkal), ujung bawah = `lobes` lengkung membulat (kedalaman `depth`), curl = lentingan
    ujung ke arah luar (+x layar). flat = ujung tumpul lurus (rambut yang masuk ke balik bahu).
    Kembalikan (titik kontur, fungsi alur(f) -> polyline di fraksi f dari inner (0) ke outer (1))."""
    O = _wave_x(outer, amp, waves, phase, start, n)
    I = _wave_x(inner, amp, waves, phase, start, n)
    if curl:
        for E in (O, I):
            for i in range(int(n * 0.8), n):
                t = (i - n * 0.8) / (n * 0.2)
                E[i] = (E[i][0] + curl * t * t, E[i][1])
    bottom = []
    if not flat:
        m = 10 * lobes
        for k in range(1, m):
            u = k / m
            x = O[-1][0] + (I[-1][0] - O[-1][0]) * u
            y = O[-1][1] + (I[-1][1] - O[-1][1]) * u
            j = min(lobes - 1, int(u * lobes))
            v = u * lobes - j                                        # posisi di dalam satu ujung (0..1)
            dj = depth * (0.70 + 0.55 * (math.sin(j * 12.9898 + phase * 7.1) * 0.5 + 0.5))
            y += dj * math.sin(math.pi * v ** 0.7) ** 0.8 - depth * 0.35   # ujung melenting (puncak di depan)
            bottom.append((x, y))
    pts = O + bottom + I[::-1]

    def alur(f, t0=0.08, t1=0.92):
        a, b = int(t0 * (n - 1)), int(t1 * (n - 1))
        return [(I[i][0] + (O[i][0] - I[i][0]) * f, I[i][1] + (O[i][1] - I[i][1]) * f) for i in range(a, b + 1, 3)]
    return pts, alur



# ---------------- tirai v5: profil gelombang dirancang + ujung runcing per helai ----------------
def _prof_fn(prof):
    xs = vkit.catmull([(t, d) for t, d in prof], 16)
    xs = sorted([(float(p[0]), float(p[1])) for p in xs])

    def f(t):
        if t <= xs[0][0]:
            return xs[0][1]
        for (t0, d0), (t1, d1) in zip(xs[:-1], xs[1:]):
            if t0 <= t <= t1:
                return d0 + (d1 - d0) * ((t - t0) / ((t1 - t0) or 1))
        return xs[-1][1]
    return f


def curtain2(outer, inner, prof, tips, n=48, kin=0.85):
    """Tirai rambut rancangan tangan. outer/inner = polyline atas -> bawah; prof = [(t, dx)] titik kunci geser
    horizontal (H) yang dipakai kedua tepi (dalam x kin) -> ukuran gelombang bebas (membesar ke bawah, tidak teratur).
    tips = helai di ujung dari sisi outer ke inner: dict(w = bagian lebar, drop = turun ujung (H), flick = geser
    ujung (H, +x layar)). Kembalikan (titik kontur, indeks sudut, alur(f, t0, t1), garis pemisah dari tiap takik)."""
    P = _prof_fn(prof)

    def edge(poly, k):
        pts, _ = _resample([(float(p[0]), float(p[1])) for p in vkit.catmull(poly, 10)], n)
        return [(x + k * P(i / (n - 1)), y) for i, (x, y) in enumerate(pts)]
    O, I = edge(outer, 1.0), edge(inner, kin)
    (ox, oy), (ix, iy) = O[-1], I[-1]
    tot = sum(t["w"] for t in tips)
    bottom, corners, notches = [], [], []
    u = 0.0
    for j, t in enumerate(tips):
        u0, u1 = u, u + t["w"] / tot
        um = u0 + (u1 - u0) * 0.55
        B = lambda uu, dy=0.0: (ox + (ix - ox) * uu, oy + (iy - oy) * uu + dy)
        a = B(u0 + (u1 - u0) * 0.15, t["drop"] * 0.45)
        tip = B(um, t["drop"])
        tip = (tip[0] + t["flick"], tip[1])
        b = B(u0 + (u1 - u0) * 0.88, t["drop"] * 0.35)
        bottom += [a, (tip[0] - (tip[0] - a[0]) * 0.25, tip[1] - t["drop"] * 0.08), tip, b]
        if j < len(tips) - 1:
            corners.append(len(O) + len(bottom))
            bottom.append(B(u1, -0.075))                  # takik dalam: ujung helai terurai
            notches.append(1.0 - u1)
        u = u1
    pts = O + bottom + I[::-1]

    def alur(f, t0=0.08, t1=0.92):
        a0, b0 = int(t0 * (n - 1)), int(t1 * (n - 1))
        return [(I[i][0] + (O[i][0] - I[i][0]) * f, I[i][1] + (O[i][1] - I[i][1]) * f) for i in range(a0, b0 + 1, 3)]
    seps = [alur(f, 0.60 + 0.08 * (k % 2), 0.995) for k, f in enumerate(notches)]
    return pts, tuple(corners) + (0, len(pts) - 1), alur, seps
