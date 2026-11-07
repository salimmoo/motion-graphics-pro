"""gait_engine - side-view walk cycle engine from gait data, for any figure (motion-graphics skill ch. 4.3).
Old name: gait_engine.py (still works).

Rig: facing +x, units H, y down, x = 0 at the hip joint. Figure sizes live in BODY (change per figure, measure them
from that figure's drawing); motion numbers in G (from data, converted to the figure's size). Default BODY = adult
canon of 7.5 heads on a 5.78 H body (one head HD = 5.78 / 7.5 = 0.771 H; same as the site figure): crotch at 1/2 of
the height, knee at 1/4 of the height above the floor, elbow at the navel (shoulder + upper arm 0.95 H), wrist at the
crotch, foot 1.1 heads (sample shoe x 1.6); default G = adult woman, relaxed walk, stride and lift scaled to the leg
length (x 1.12).

Principles:
- The stance foot rolls over the heel (heel rocker), flat, then over the TIP of the sole (toe rocker). Every pivot is
  on the ground, so the foot never slides. Ground speed v = 2 x step / T.
- phi_hs is solved so the ankle is neutral (0 degrees) at heel strike.
- The hip comes from the leading stance leg with a knee-flex target, smoothed with an even-harmonic Fourier series,
  then shifted down so the stance leg reach <= reach_max at every phase. phi_ps is solved so the hip height joins up.
- Pre-swing: Hermite from phi_ps to phi_to; phi_to is solved so plantarflexion = plantar_to at toe-off.
- Swing: C1 Hermite from the toe-off state to heel strike (tangent = stance speed), + lift sin(pi w^skew)^2;
  pulled towards the hip when the reach > reach_max.

Reference data for the default G (adult woman, motion-graphics skill ch. 4.3; sources):
- v 1.31 m/s, step 66 cm (Murray 1970, OUHSC); cadence 119 steps/min, cycle 1.01 s (derived)
- stance 60%, swing 40% (Missouri PM&R Normal Gait pp. 2, 4, 5); knee 5-10 loading, max 65 swing (pp. 14, 18);
  ankle 0 at heel strike, plantarflexion 20-30 at toe-off (pp. 13, 17)
- shoulder range 20-25, elbow 15-30 (Gait & Posture 2019; CiSE 2023)
- Stylised figure steps: scale to crotch height: step = (step/height) / 0.50 x the figure's crotch height.

Usage:
  python3 gait_engine.py report [param=value ...]        -> check numbers (bob, reach, knee, plantar, clearance,
                                                    ground penetration, ankle speed jumps)
  python3 gait_engine.py strip out.png [n] [param=value] -> skeleton strip of n frames (default 8) + shoes + ground line
Params can be G (e.g. step=1.8 T=1.1) or BODY (e.g. thigh=1.5 shin=1.45 sole_y=6.6 hip_y=3.6).
canon() returns English keys (height, knee, elbow, wrist, foot); the old keys (tinggi, lutut, siku, pergelangan,
kaki) still work.
"""
import math
import os
import sys


_DOC_ID = """gait_engine - mesin walk cycle tampak samping dari data gait, untuk tokoh apa pun (skill motion-graphics bab 4.3).

Rangka: wajah ke +x, satuan H, y ke bawah, x = 0 sendi panggul. Ukuran tokoh di BODY (ganti per tokoh, ukur dari
gambar tokoh itu); angka gerak di G (dari data, konversi ke ukuran tokoh). Default BODY = kanon dewasa 7,5 kepala pada
tubuh 5.78 H (satu kepala HD = 5.78 / 7.5 = 0.771 H; sama dengan figur situs): selangkangan 1/2 tinggi, lutut 1/4 tinggi
dari lantai, siku di pusar (bahu + lengan atas 0.95 H), pergelangan di selangkangan, kaki 1.1 kepala (sepatu contoh
x 1.6); default G = data wanita dewasa jalan santai, langkah dan angkat diskalakan ke panjang kaki (x 1.12).

Prinsip:
- Kaki menapak menggelinding di tumit (heel rocker), rata, lalu di UJUNG sol (toe rocker). Semua pivot di tanah,
  jadi kaki tidak meluncur. Kecepatan tanah v = 2 x langkah / T.
- phi_hs dicari supaya pergelangan netral (0 derajat) saat heel strike.
- Panggul dari kaki tumpu depan dengan target tekuk lutut, dihaluskan deret Fourier harmonik genap, lalu digeser turun
  supaya jangkauan kaki tumpu <= reach_max di semua fase. phi_ps dicari supaya tinggi panggul menyambung.
- Pre-swing: Hermite dari phi_ps ke phi_to; phi_to dicari supaya plantarfleksi = plantar_to saat toe-off.
- Swing: Hermite C1 dari keadaan toe-off ke heel strike (tangen = kecepatan stance), + angkat lift sin(pi w^skew)^2;
  ditarik ke panggul bila jangkauan > reach_max.

Data acuan default G (wanita dewasa, skill motion-graphics bab 4.3; sumber):
- v 1.31 m/s, langkah 66 cm (Murray 1970, OUHSC); cadence 119 langkah/menit, siklus 1.01 s (diturunkan)
- stance 60%, swing 40% (Missouri PM&R Normal Gait hlm 2, 4, 5); lutut 5-10 loading, maks 65 swing (hlm 14, 18);
  pergelangan 0 heel strike, plantarfleksi 20-30 toe-off (hlm 13, 17)
- bahu rentang 20-25, siku 15-30 (Gait & Posture 2019; CiSE 2023)
- Langkah tokoh bergaya: skalakan ke tinggi selangkangan: langkah = (langkah/tinggi) / 0.50 x tinggi selangkangan tokoh.

Pakai:
  python3 gait_engine.py report [param=nilai ...]        -> angka cek (bob, jangkauan, lutut, plantar, clearance, tembus,
                                                    loncatan kecepatan pergelangan)
  python3 gait_engine.py strip out.png [n] [param=nilai] -> strip kerangka n frame (default 8) + sepatu + garis tanah
Param bisa G (contoh step=1.8 T=1.1) atau BODY (contoh thigh=1.5 shin=1.45 sole_y=6.6 hip_y=3.6).
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


# ---------------- ukuran tokoh (kanon 7,5 kepala pada 5.78 H) ----------------
HD = 5.78 / 7.5                      # satu kepala (H)
_SHOE_SCALE = 1.6                        # skala sepatu contoh lama -> kaki 1.1 kepala
_SH0 = [(0.02, -0.03), (0.0, -0.09), (0.025, -0.165), (0.10, -0.15), (0.19, -0.185), (0.30, -0.152),
        (0.42, -0.122), (0.515, -0.095), (0.562, -0.05), (0.555, -0.008), (0.52, 0.0), (0.04, 0.0)]
BODY = dict(
    thigh=1.54, shin=1.272,          # panjang paha, betis (H), sama dengan tampak depan dan 3/4
    sole_y=5.78,                     # y garis sol (tinggi tokoh = 7.5 kepala)
    hip_y=2.78,                      # y sendi panggul saat berdiri (acuan dy); selangkangan 3.75 kepala = 2.89 H
    ankle_local=(0.13 * _SHOE_SCALE, -0.135 * _SHOE_SCALE),   # pergelangan di koordinat lokal sepatu (tumit 0, sol y 0)
    heel_local=(0.03 * _SHOE_SCALE, 0.0),                 # titik heel rocker
    toe_local=(0.555 * _SHOE_SCALE, -0.008 * _SHOE_SCALE),    # titik toe rocker (ujung sol)
    shoe=[(x * _SHOE_SCALE, y * _SHOE_SCALE) for x, y in _SH0],
    shoulder=(-0.03, 1.25), upper=0.95, fore=0.75,    # siku 2.2 H = 2.85 kepala (pusar), pergelangan ~3.8 kepala
)
_LEG_SCALE = (1.54 + 1.272) / (1.27 + 1.24)               # skala panjang kaki terhadap data gait tokoh uji lama
_SEPATU, _KAKI = _SHOE_SCALE, _LEG_SCALE                 # old names

# ---------------- angka gerak (data) ----------------
G = dict(
    T=1.0,             # detik per siklus (data 1.01 s, dibulatkan 24 frame)
    stance=0.60,       # fraksi stance
    step=2.0 * _LEG_SCALE,  # langkah H (dikonversi dari data ke ukuran tokoh: 2.0 H pada kaki 2.51 H)
    u_flat=0.15,       # kaki rata (fraksi stance)
    u_heeloff=0.55,    # heel off
    u_mid=0.40,        # pergelangan tepat di bawah panggul
    knee_hs=3.0, knee_load=20.0, knee_mid=5.0,   # lutut kaki tumpu; minimum dibatasi jangkauan
    plantar_to=25.0,   # plantarfleksi saat toe-off
    reach_max=0.99,    # jangkauan maks (100% = lutut terkunci, terbaca patah)
    lift=0.20 * _LEG_SCALE, lift_skew=0.65,
    swing_flat=0.55,   # kaki swing kembali rata di fraksi swing ini
    lean=2.0,          # badan atas condong (derajat)
    sh_amp=11.0, sh_amp_bag=4.0,      # amplitudo bahu (data rentang 20-25); lengan pembawa beban: asumsi
    el_back=12.0, el_front=32.0, el_bag=8.0,   # siku (data rentang 15-30)
    arm_lag=0.03,
    nod_amp=1.5, nod_lag=0.05,
)


def rot(p, deg):
    a = math.radians(deg)
    return (p[0] * math.cos(a) - p[1] * math.sin(a), p[0] * math.sin(a) + p[1] * math.cos(a))


def shoe_map(cfg):
    """Fungsi lokal sepatu -> dunia (H). cfg = dict(piv, at, deg): titik lokal piv diletakkan di at, diputar deg."""
    px, py = cfg["piv"]
    ax, ay = cfg["at"]

    def f(p):
        q = rot((p[0] - px, p[1] - py), cfg["deg"])
        return (q[0] + ax, q[1] + ay)
    return f


def ik(h, a, l1, l2, knee_fwd=True):
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


def ease_inout(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def hermite(p0, p1, m0, m1, t):
    t2, t3 = t * t, t * t * t
    return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1


class Gait:
    def __init__(self, body=None, **kw):
        self.b = b = dict(BODY, **(body or {}))
        self.g = g = dict(G, **kw)
        self.TH, self.SH = b["thigh"], b["shin"]
        self.L_LEG = self.TH + self.SH
        self.SOLE = b["sole_y"]
        self.HEEL, self.TOE, self.ANK = b["heel_local"], b["toe_local"], b["ankle_local"]
        self.S = 2 * g["step"]
        self.v = self.S / g["T"]
        self.u_ps = 0.5 / g["stance"]       # pre-swing mulai saat kaki lain heel strike
        self.H0 = g["stance"] * self.S * g["u_mid"] - (self.ANK[0] - self.HEEL[0])
        self.phi_hs = 14.0
        self.phi_ps = 15.0
        for _ in range(6):
            hy = self._hip_from_lead(0.0)
            self.phi_hs = -self._solve_phi(lambda ph: self.plantar((0, hy), self._ank(0.0, ph), ph), 0.0, -40.0, 0.0)
            self.phi_ps = self._match_phi_ps()
        self._build_hip()

    # ---- geometri kaki ----
    def knee_reach(self, kdeg):
        a = math.radians(180 - kdeg)
        return math.sqrt(self.TH ** 2 + self.SH ** 2 - 2 * self.TH * self.SH * math.cos(a))

    def knee_at_reach(self, r):
        d = r * self.L_LEG
        c = (self.TH ** 2 + self.SH ** 2 - d * d) / (2 * self.TH * self.SH)
        return 180 - math.degrees(math.acos(max(-1, min(1, c))))

    def knee_flex(self, hip, ank):
        d = min(math.dist(hip, ank), self.L_LEG - 1e-9)
        c = (self.TH ** 2 + self.SH ** 2 - d * d) / (2 * self.TH * self.SH)
        return 180 - math.degrees(math.acos(max(-1, min(1, c))))

    def plantar(self, hip, ank, phi):
        """Plantarfleksi (+) / dorsifleksi (-) terhadap tulang kering. Netral = kaki tegak lurus tulang kering."""
        k = ik(hip, ank, self.TH, self.SH)
        s = (ank[0] - k[0], ank[1] - k[1])
        f = (math.cos(math.radians(phi)), math.sin(math.radians(phi)))
        c = (s[0] * f[0] + s[1] * f[1]) / math.hypot(*s)
        return 90 - math.degrees(math.acos(max(-1, min(1, c))))

    def shoe_min_y(self, cfg):
        f = shoe_map(cfg)
        return max(f(q)[1] for q in self.b["shoe"])

    # ---- stance ----
    def heel_x(self, u):
        return self.H0 - self.S * self.g["stance"] * u

    def cfg(self, u, phi):
        xh = self.heel_x(u)
        if u < self.g["u_heeloff"] or phi <= 0:
            return dict(piv=self.HEEL, at=(xh, self.SOLE), deg=phi)
        xt = xh + self.TOE[0] - self.HEEL[0]
        return dict(piv=self.TOE, at=(xt, self.SOLE + self.TOE[1]), deg=phi)

    def _ank(self, u, phi):
        return shoe_map(self.cfg(u, phi))(self.ANK)

    def phi_lead(self, u):
        g = self.g
        if u < g["u_flat"]:
            return -self.phi_hs * math.cos(0.5 * math.pi * u / g["u_flat"])
        if u < g["u_heeloff"]:
            return 0.0
        k = (u - g["u_heeloff"]) / (self.u_ps - g["u_heeloff"])
        return self.phi_ps * k ** 1.6

    def knee_target(self, u):
        return max(self.knee_at_reach(self.g["reach_max"]), self._knee_data(u))

    def _knee_data(self, u):
        g = self.g
        if u < 0.20:
            return g["knee_hs"] + (g["knee_load"] - g["knee_hs"]) * math.sin(0.5 * math.pi * u / 0.20)
        if u < 0.50:
            return g["knee_load"] + (g["knee_mid"] - g["knee_load"]) * ease_inout((u - 0.20) / 0.30)
        return g["knee_mid"]

    def _hip_from_lead(self, u, phi=None):
        phi = self.phi_lead(u) if phi is None else phi
        ax, ay = self._ank(u, phi)
        d = self.knee_reach(self.knee_target(u))
        return ay - math.sqrt(max(d * d - ax * ax, 1e-6))

    @staticmethod
    def _solve_phi(f, target, lo, hi, it=50):
        """Bisection: f(phi) naik monoton; cari phi dengan f = target."""
        flo = f(lo) - target
        for _ in range(it):
            mid = 0.5 * (lo + hi)
            if (f(mid) - target) * flo > 0:
                lo, flo = mid, f(mid) - target
            else:
                hi = mid
        return 0.5 * (lo + hi)

    def _match_phi_ps(self):
        target = self._hip_from_lead(0.0)
        return self._solve_phi(lambda ph: -self._hip_from_lead(self.u_ps, ph), -target, 0.0, 70.0)

    def _build_hip(self, n=240, harm=(2, 4, 6, 8, 10)):
        ys, cr = [], []
        dmax = self.g["reach_max"] * self.L_LEG
        for i in range(n):
            p = i / n
            u = (p if p < 0.5 else p - 0.5) / self.g["stance"]
            ys.append(self._hip_from_lead(u))
            ax, ay = self._ank(u, self.phi_lead(u))
            cr.append(ay - math.sqrt(max(dmax * dmax - ax * ax, 1e-6)))
        a0 = sum(ys) / n
        co = []
        for k in harm:
            ak = 2 / n * sum(y * math.cos(2 * math.pi * k * i / n) for i, y in enumerate(ys))
            bk = 2 / n * sum(y * math.sin(2 * math.pi * k * i / n) for i, y in enumerate(ys))
            co.append((k, ak, bk))
        self._hip = (a0, co)
        shift = max(0.0, max(c - self.hip_y(i / n) for i, c in enumerate(cr)))
        self._hip = (a0 + shift, co)
        self.hip_raw = ys
        self.hip_shift = shift

    def hip_y(self, p):
        a0, co = self._hip
        return a0 + sum(ak * math.cos(2 * math.pi * k * p) + bk * math.sin(2 * math.pi * k * p) for k, ak, bk in co)

    def stance_state(self, u, p_leg):
        if u <= self.u_ps:
            phi = self.phi_lead(u)
        else:
            hip = (0.0, self.hip_y(p_leg))
            k = (u - self.u_ps) / (1 - self.u_ps)
            sl = self.phi_ps * 1.6 / (self.u_ps - self.g["u_heeloff"]) * (1 - self.u_ps)
            phi = hermite(self.phi_ps, self._phi_to(), sl, 0.0, k)
            dmax = self.g["reach_max"] * self.L_LEG
            if math.dist(hip, self._ank(u, phi)) > dmax:
                self.reach_fix = getattr(self, "reach_fix", 0) + 1
                phi = self._solve_phi(lambda ph: -math.dist(hip, self._ank(u, ph)), -dmax, phi, 85.0)
        return phi, self.cfg(u, phi)

    def _phi_to(self):
        if not hasattr(self, "_pto"):
            hip = (0.0, self.hip_y(self.g["stance"]))
            self._pto = self._solve_phi(lambda ph: self.plantar(hip, self._ank(1.0, ph), ph), self.g["plantar_to"],
                                        0.0, 85.0)
        return self._pto

    # ---- kaki per fase ----
    def foot(self, p):
        g = self.g
        p %= 1.0
        if p < g["stance"]:
            u = p / g["stance"]
            phi, c = self.stance_state(u, p)
            return dict(cfg=c, ankle=shoe_map(c)(self.ANK), phi=phi, stance=True, u=u)
        w = (p - g["stance"]) / (1 - g["stance"])
        tsw = (1 - g["stance"]) * g["T"]
        dp = 1e-3
        s0 = [self.foot_stance_pt(g["stance"] - dp * j) for j in (0, 1)]
        s1 = [self.foot_stance_pt(dp * j) for j in (0, 1)]
        a0, f0 = s0[0]
        a1, f1 = s1[0]
        dt = dp * g["T"]
        v0 = ((s0[0][0][0] - s0[1][0][0]) / dt, (s0[0][0][1] - s0[1][0][1]) / dt)
        r0 = (s0[0][1] - s0[1][1]) / dt
        v1 = ((s1[1][0][0] - s1[0][0][0]) / dt, (s1[1][0][1] - s1[0][0][1]) / dt)
        x = hermite(a0[0], a1[0], v0[0] * tsw, v1[0] * tsw, w)
        y = hermite(a0[1], a1[1], v0[1] * tsw, v1[1] * tsw, w)
        y -= g["lift"] * math.sin(math.pi * w ** g["lift_skew"]) ** 2
        wf = g["swing_flat"]
        if w < wf:
            phi = hermite(f0, 0.0, r0 * tsw, 0.0, w / wf)
        else:
            phi = hermite(0.0, f1, 0.0, 0.0, (w - wf) / (1 - wf))
        hip = (0.0, self.hip_y(p))
        d = math.dist(hip, (x, y))
        dmax = g["reach_max"] * self.L_LEG
        if d > dmax:
            x, y = hip[0] + (x - hip[0]) * dmax / d, hip[1] + (y - hip[1]) * dmax / d
        a = (x, y)
        return dict(cfg=dict(piv=self.ANK, at=a, deg=phi), ankle=a, phi=phi, stance=False, u=w)

    def foot_stance_pt(self, p):
        u = min(max(p / self.g["stance"], 0.0), 1.0)
        phi, c = self.stance_state(u, p)
        return shoe_map(c)(self.ANK), phi

    # ---- lengan, kepala ----
    def arm(self, p, bag=False):
        """Lengan sisi dekat berlawanan kaki dekat. Kembalikan ((bahu, siku, pergelangan), sudut bahu, tekuk siku)."""
        g, b = self.g, self.b
        amp = g["sh_amp_bag"] if bag else g["sh_amp"]
        c = -math.cos(2 * math.pi * (p - g["arm_lag"]))
        th = amp * c
        el = g["el_bag"] if bag else g["el_back"] + (g["el_front"] - g["el_back"]) * (c + 1) / 2
        S = b["shoulder"]
        E = (S[0] + b["upper"] * math.sin(math.radians(th)), S[1] + b["upper"] * math.cos(math.radians(th)))
        W = (E[0] + b["fore"] * math.sin(math.radians(th + el)), E[1] + b["fore"] * math.cos(math.radians(th + el)))
        return (S, E, W), th, el

    def nod(self, p):
        return self.g["nod_amp"] * math.cos(4 * math.pi * (p - self.g["nod_lag"]))

    def pose(self, p):
        """Pose lengkap fase p: panggul, kaki dekat (near, fase p) dan jauh (far, fase p + 0.5), dy panggul vs berdiri,
        condong, angguk. Tiap kaki: cfg sepatu, ankle, knee, flex (derajat), reach (fraksi), plantar, stance, u."""
        p %= 1.0
        hy = self.hip_y(p)
        hip = (0.0, hy)
        near, far = self.foot(p), self.foot(p + 0.5)
        for f in (near, far):
            f["knee"] = ik(hip, f["ankle"], self.TH, self.SH)
            f["flex"] = self.knee_flex(hip, f["ankle"])
            f["reach"] = math.dist(hip, f["ankle"]) / self.L_LEG
            f["plantar"] = self.plantar(hip, f["ankle"], f["phi"])
        return dict(p=p, hip=hip, dy=hy - self.b["hip_y"], near=near, far=far, lean=self.g["lean"], nod=self.nod(p))


def canon(gt):
    """Landmark berdiri dalam kepala dari puncak (target kanon 7,5: lutut 5.625, siku 2.85, pergelangan 3.75,
    kaki 1.1, selangkangan 3.75)."""
    b = gt.b
    hip = (0.0, b["hip_y"])
    ank = (0.0, b["sole_y"] + b["ankle_local"][1])
    knee = ik(hip, ank, gt.TH, gt.SH)
    S = b["shoulder"]
    return _Keys(height=b["sole_y"] / HD, knee=knee[1] / HD, elbow=(S[1] + b["upper"]) / HD,
                 wrist=(S[1] + b["upper"] + b["fore"]) / HD,
                 foot=(b["toe_local"][0] - b["heel_local"][0] + 0.03 * _SHOE_SCALE) / HD)


class _Keys(dict):
    """dict with English keys that still answers the old Indonesian keys (k["lutut"] == k["knee"])."""
    OLD = dict(tinggi="height", lutut="knee", siku="elbow", pergelangan="wrist", kaki="foot")

    def __missing__(self, k):
        if k in self.OLD:
            return self[self.OLD[k]]
        raise KeyError(k)

    def get(self, k, d=None):
        return dict.get(self, self.OLD.get(k, k), d)

    def __contains__(self, k):
        return dict.__contains__(self, self.OLD.get(k, k))


def report(gt, n=96):
    k = canon(gt)
    print(_T("canon (heads from the top): height %.2f knee %.2f elbow %.2f wrist %.2f foot %.2f",
             "kanon (kepala dari puncak): tinggi %.2f lutut %.2f siku %.2f pergelangan %.2f kaki %.2f") % (
        k["height"], k["knee"], k["elbow"], k["wrist"], k["foot"]))
    fr = [gt.pose(i / n) for i in range(n)]
    hy = [f["hip"][1] for f in fr]
    print(_T("stride %.2f H, v %.2f H/s, H0 %.3f, phi_hs %.1f, phi_ps %.1f, hip shift %.4f",
             "stride %.2f H, v %.2f H/s, H0 %.3f, phi_hs %.1f, phi_ps %.1f, geser panggul %.4f") % (
        gt.S, gt.v, gt.H0, gt.phi_hs, gt.phi_ps, gt.hip_shift))
    print(_T("hip y min %.3f max %.3f bob p2p %.3f H (raw p2p %.3f)",
             "panggul y min %.3f max %.3f bob p2p %.3f H (mentah p2p %.3f)") % (
        min(hy), max(hy), max(hy) - min(hy), max(gt.hip_raw) - min(gt.hip_raw)))
    print(_T("pre-swing frames corrected for reach: %d", "frame pre-swing yang dikoreksi jangkauan: %d")
          % getattr(gt, "reach_fix", 0))
    print(_T("max reach %.1f%%", "jangkauan maks %.1f%%") % (100 * max(max(f["near"]["reach"], f["far"]["reach"]) for f in fr)))
    sw = [f["near"] for f in fr if not f["near"]["stance"]]
    k = max(sw, key=lambda s: s["flex"])
    print(_T("max swing knee %.1f deg at w %.2f", "lutut swing maks %.1f deg di w %.2f") % (k["flex"], k["u"]))
    st = [f["near"] for f in fr if f["near"]["stance"]]
    for tag, uu in (("heel strike", 0.0), ("loading", 0.2), ("midstance", 0.40), ("heel off", 0.55),
                    ("pre-swing", 0.84), ("toe off", 0.99)):
        f = min(st, key=lambda q: abs(q["u"] - uu))
        print(_T("  %-11s u %.2f knee %5.1f phi %5.1f plantar %5.1f reach %.1f%%",
                 "  %-11s u %.2f lutut %5.1f phi %5.1f plantar %5.1f reach %.1f%%") % (
            tag, f["u"], f["flex"], f["phi"], f["plantar"], 100 * f["reach"]))
    clr = min(gt.SOLE - gt.shoe_min_y(s["cfg"]) for s in sw if 0.15 < s["u"] < 0.85)
    print("clearance swing min (w 0.15-0.85) %.3f H" % clr)
    pen = max(gt.shoe_min_y(f["near"]["cfg"]) - gt.SOLE for f in fr)
    print(_T("max shoe ground penetration %.4f H", "sepatu tembus tanah maks %.4f H") % pen)
    a = [f["near"]["ankle"] for f in fr]
    vel = [(a[(i + 1) % n][0] - a[i][0], a[(i + 1) % n][1] - a[i][1]) for i in range(n)]
    j = max(range(n), key=lambda i: math.dist(vel[i], vel[i - 1]))
    print(_T("max ankle speed jump %.4f H/frame^2 at p %.2f (n=%d)",
             "loncatan kecepatan pergelangan maks %.4f H/frame^2 di p %.2f (n=%d)") % (
        math.dist(vel[j], vel[j - 1]), j / n, n))


def strip(gt, out, n=8, hp=110):
    """Strip kerangka n frame satu siklus: tulang, sendi, sepatu, garis tanah, jejak tumit/ujung yang menapak."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import brush
    cw, top = int(4.2 * hp), 0.4 * hp
    W, H = n * cw, int((gt.SOLE + 1.0) * hp)
    s = brush.Surface(W, H)
    c = s.canvas
    c.clear(0xF6F2EA)
    font = brush.Font("Inter", 18)
    ink = brush.Paint(0x141414)

    def P(col, w=None):
        if w:
            return brush.Paint(col, style="stroke", width=w, cap="round")
        return brush.Paint(col)
    near_c, far_c = 0x3C5A6E, 0x96A5AF
    for i in range(n):
        p = i / n
        pz = gt.pose(p)
        ox = i * cw + cw / 2
        X = lambda q: (ox + q[0] * hp, top + q[1] * hp)
        c.draw_line(i * cw + 8, top + gt.SOLE * hp, (i + 1) * cw - 8, top + gt.SOLE * hp, P(0x786E5F, 2))
        for key, col in (("far", far_c), ("near", near_c)):
            f = pz[key]
            sh = shoe_map(f["cfg"])
            c.draw_path(brush.Path().polygon([X(sh(t)) for t in gt.b["shoe"]]), P(col))
            for a, b in ((pz["hip"], f["knee"]), (f["knee"], f["ankle"])):
                c.draw_line(*X(a), *X(b), P(col, 0.16 * hp))
        for side, col in ((0.5, far_c), (0.0, near_c)):
            (S_, E_, W_), _, _ = gt.arm(p + side)
            dy = pz["dy"]
            for a, b in ((S_, E_), (E_, W_)):
                c.draw_line(*X((a[0], a[1] + dy)), *X((b[0], b[1] + dy)), P(col, 0.10 * hp))
        hip = pz["hip"]
        c.draw_line(*X(hip), *X((0.05, gt.b["shoulder"][1] + pz["dy"])), P(near_c, 0.22 * hp))
        c.draw_circle(*X((0.05, gt.b["shoulder"][1] - 0.84 + pz["dy"])), 0.5 * HD * hp, P(near_c))
        c.draw_text("p %.3f  lutut %.0f/%.0f  jangkau %.0f%%" % (p, pz["near"]["flex"], pz["far"]["flex"],
                                                              100 * max(pz["near"]["reach"], pz["far"]["reach"])),
                     i * cw + 10, H - 12, font, ink)
    s.save(out)


def _kw(args):
    body, g = {}, {}
    for a in args:
        k, v = a.split("=")
        (body if k in BODY else g)[k] = float(v)
    return body, g


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(_T(__doc__, _DOC_ID))
    elif sys.argv[1] == "report":
        b, g = _kw(sys.argv[2:])
        report(Gait(b, **g))
    elif sys.argv[1] == "strip":
        n = int(sys.argv[3]) if len(sys.argv) > 3 and "=" not in sys.argv[3] else 8
        b, g = _kw([a for a in sys.argv[3:] if "=" in a])
        strip(Gait(b, **g), sys.argv[2], n)
