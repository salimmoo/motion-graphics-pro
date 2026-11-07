"""spring - periodic secondary motion (hair, bag, hem, tail, antenna) for motion cycles (motion-graphics skill 3.1,
4.3). Old name: pegas.py (still works).

Everything is simulated with a pre-roll of a few cycles (default 5), then ONE last cycle is stored as a periodic
table -> loops without jumps, frame 0 is already settled.

- spring(drive, f, z, T)      : damped spring x'' = -w^2 x - 2 z w x' + a(p)          (drive = forcing acceleration)
- spring_to(target, f, z, T)  : spring chasing a target x'' = -w^2 (x - s(p)) - 2 z w x'  (drive = target position)
- pendulum(pivot, f, z, L, T) : pendulum on a moving pivot psi'' = -(a_x cos psi + (g - a_y) sin psi) / L - 2 z w psi'
                                effective g = w^2 L (natural frequency f). Angle psi (radians, + = tip towards -x).
- accel(pos, n, T)            : periodic acceleration (finite differences) of a position function pos(p) -> (x, y) or x

Rules (review results):
- Keep the spring frequency AWAY from the motion frequency (walk: swing 1 Hz, bob 2 Hz; resonance = overswing).
  Use about 1.40-1.60 Hz, damping 0.30-0.40.
- Compute the pivot RELATIVE to the hip/body. A world position that jumps at the cycle boundary gives an impulse every
  cycle (the bag spins 90 degrees).

Usage: python3 spring.py demo out.png   -> response plots of three examples against the default gait
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


_DOC_ID = """spring - gerak sekunder periodik (rambut, tas, hem, ekor, antena) untuk siklus gerak (skill motion-graphics 3.1, 4.3).

Semua disimulasikan dengan pre-roll beberapa siklus (default 5), lalu SATU siklus terakhir disimpan sebagai tabel
periodik -> loop tanpa loncatan, frame 0 sudah tenang.

- spring(drive, f, z, T)      : pegas teredam x'' = -w^2 x - 2 z w x' + a(p)          (drive = percepatan pemaksa)
- spring_to(target, f, z, T)  : pegas mengejar target x'' = -w^2 (x - s(p)) - 2 z w x'  (drive = posisi target)
- pendulum(pivot, f, z, L, T) : pendulum di titik gantung bergerak psi'' = -(a_x cos psi + (g - a_y) sin psi) / L - 2 z w psi'
                                g efektif = w^2 L (frekuensi alami f). Sudut psi (radian, + = ujung ke -x).
- accel(pos, n, T)            : percepatan periodik (beda hingga) dari fungsi posisi pos(p) -> (x, y) atau x

Aturan (Hasil Review):
- Frekuensi pegas JANGAN dekat frekuensi gerak (jalan: ayun 1 Hz, bob 2 Hz; resonansi = ayunan berlebihan).
  Pakai sekitar 1.40-1.60 Hz, redaman 0.30-0.40.
- Titik gantung dihitung RELATIF panggul/badan. Posisi dunia yang melompat di batas siklus memberi impuls tiap siklus
  (tas berputar 90 derajat).

Pakai: python3 spring.py demo out.png   -> grafik respon tiga contoh terhadap gait default
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


class Table:
    """Tabel periodik satu siklus, interpolasi linear di fase p (0..1)."""

    def __init__(self, vals):
        self.v = vals
        self.n = len(vals)

    def at(self, p):
        x = (p % 1.0) * self.n
        i = int(x)
        t = x - i
        a, b = self.v[i % self.n], self.v[(i + 1) % self.n]
        if isinstance(a, tuple):
            return tuple(a[k] + (b[k] - a[k]) * t for k in range(len(a)))
        return a + (b - a) * t

    def range(self):
        return min(self.v), max(self.v)


def _cache(fn, n):
    """Fungsi fase p -> list n nilai; list/tuple panjang n dipakai apa adanya."""
    if isinstance(fn, (list, tuple)):
        if len(fn) != n:
            raise ValueError(_T("list length %d, must be n = %d", "panjang list %d, harus n = %d") % (len(fn), n))
        return list(fn)
    return [fn(i / n) for i in range(n)]


def accel(pos, n, T):
    """Percepatan periodik (per s^2) dari pos(p) di n titik; pos boleh skalar atau (x, y)."""
    c = _cache(pos, n)
    dt = T / n
    out = []
    for j in range(n):
        a, b, m = c[(j + 1) % n], c[j], c[(j - 1) % n]
        if isinstance(b, tuple):
            out.append(tuple((a[k] - 2 * b[k] + m[k]) / dt ** 2 for k in range(len(b))))
        else:
            out.append((a - 2 * b + m) / dt ** 2)
    return out


def spring(drive, f, z, T, n=240, cycles=5, gain=1.0):
    """drive(p) atau list n = percepatan pemaksa (H/s^2). Contoh rambut: drive = accel(kepala_y), gain negatif kecil."""
    w = 2 * math.pi * f
    dt = T / n
    d = _cache(drive, n)
    x = vx = 0.0
    out = []
    for i in range(cycles * n):
        a = -w * w * x - 2 * z * w * vx + gain * d[i % n]
        vx += a * dt
        x += vx * dt
        if i >= (cycles - 1) * n:
            out.append(x)
    return Table(out)


def spring_to(target, f, z, T, n=240, cycles=5, gain=1.0):
    """target(p) = posisi yang dikejar (contoh hem: gain x sin(sudut paha))."""
    w = 2 * math.pi * f
    dt = T / n
    s = _cache(target, n)
    x = vx = 0.0
    out = []
    for i in range(cycles * n):
        a = -w * w * (x - gain * s[i % n]) - 2 * z * w * vx
        vx += a * dt
        x += vx * dt
        if i >= (cycles - 1) * n:
            out.append(x)
    return Table(out)


def pendulum(pivot, f, z, L, T, n=240, cycles=5):
    """pivot(p) = (x, y) titik gantung RELATIF badan (H, y ke bawah). Kembalikan Table sudut psi (radian)."""
    w = 2 * math.pi * f
    g_eff = w * w * L
    dt = T / n
    acc = accel(pivot, n, T)
    psi = vpsi = 0.0
    out = []
    for i in range(cycles * n):
        ax, ay = acc[i % n]
        a = -(ax * math.cos(psi) + (g_eff - ay) * math.sin(psi)) / L - 2 * z * w * vpsi
        vpsi += a * dt
        psi += vpsi * dt
        if i >= (cycles - 1) * n:
            out.append(psi)
    return Table(out)


def demo(out):
    """Contoh dengan gait default: rambut (pegas vertikal oleh percepatan kepala), tas (pendulum di kepalan),
    hem (pegas mengejar sudut paha). Grafik satu siklus."""
    import brush
    from gait_engine import Gait
    gt = Gait()
    T = gt.g["T"]
    a_head = accel(gt.hip_y, 240, T)
    hair = spring(a_head, 1.45, 0.33, T, gain=-0.12)

    def fist(p):
        (S, E, W), _, _ = gt.arm(p, bag=True)
        return (W[0], W[1] + 0.36 + gt.hip_y(p) - gt.b["hip_y"])
    bag = pendulum(fist, 1.40, 0.30, 0.90, T)

    def thigh(p):
        pz = gt.pose(p)
        k = pz["near"]["knee"]
        return math.sin(math.atan2(k[0] - pz["hip"][0], k[1] - pz["hip"][1]))
    hem = spring_to(thigh, 1.60, 0.40, T, gain=0.045)
    W_, H_ = 1200, 560
    s = brush.Surface(W_, H_)
    c = s.canvas
    c.clear(0xFAFAF8)
    font = brush.Font("Inter", 20)
    ink = brush.Paint(0x141414)
    rows = (("rambut dy (H)", hair, 1.0, 0x6B4A3A),
            ("tas psi (derajat)", bag, 180 / math.pi, 0x55788A),
            ("hem dx (H)", hem, 1.0, 0xB0893B))
    for r, (name, tab, k, col) in enumerate(rows):
        y0 = 40 + r * 170
        lo, hi = tab.range()
        lo, hi = lo * k, hi * k
        span = max(hi - lo, 1e-9)
        c.draw_text("%s  min %.4f  max %.4f" % (name, lo, hi), 40, y0, font, ink)
        c.draw_line(40, y0 + 130, W_ - 40, y0 + 130, brush.Paint(0xC8C8C4, aa=False))
        p = brush.Path()
        for i in range(241):
            v = tab.at(i / 240) * k
            x, y = 40 + (W_ - 80) * i / 240, y0 + 125 - 100 * (v - lo) / span
            p.move_to(x, y) if i == 0 else p.line_to(x, y)
        c.draw_path(p, brush.Paint(col, style="stroke", width=3))
    c.draw_text("fase p 0 -> 1 (satu siklus, sesudah pre-roll 4 siklus)", 40, H_ - 20, font, ink)
    s.save(out)


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "demo":
        demo(sys.argv[2])
    else:
        print(_T(__doc__, _DOC_ID))
