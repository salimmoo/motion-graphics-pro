"""space3d - simple 3D space for 2D backgrounds with a moving/orbiting one-take camera (motion-graphics skill
ch. 5.2). Old name: space3d.py (still works).

World units H (the figure's head height). x = east, y = up, z = north. Ground y = 0. Azimuth from north, clockwise.
- Cam: pinhole camera (yaw from north clockwise, pitch down +), f in pixels, centre (cx, cy), near plane near.
  cam(P) -> camera coordinates (right, up, forward); scr(c) -> screen; project(P) -> (screen, depth);
  light2d(sun) -> light direction on screen for sprites/figures (the lit side moves correctly while orbiting).
- Cam.orbit(target, dist, height, az, pitch): camera at azimuth az from the target, looking at the target.
- cam_height(d, pitch, f, cy, sole_px): camera height so the figure's sole sits at screen y sole_px at horizontal
  distance d:
      h = d (sin t + k cos t) / (cos t - k sin t),  k = (sole_px - cy) / f,  t = pitch
- ground_poly / poly_path: polygon on the ground/in the world, clipped at the near plane (Sutherland-Hodgman), then
  projected.
- ring_path: cylindrical ring (mountains, hills, distant tree lines) of radius R around a centre, height profile per
  azimuth; parallax comes out right automatically. Only runs of visible points (z > margin x R) become one polygon.
- mt_profile: organic mountain ridge (periodic fBm + soft-abs rounded peaks + concave-sloped volcanoes + crater).
  NO straight triangle mountains (review: too geometric).
- haze_t(d): colour mix towards the sky by distance: t = tmax (1 - exp(-(d - d0) / D)).
- keepout(objs, cam_xz, clear): removes objects too close to the camera path AFTER the layout is made (random draws
  stay fixed, the rest of the layout is stable). clearance(objs, cam_xz): minimum distance per object for reports.
- union_all, clip_near, ellipse_xz, mix, c4, paint: helpers (path/paint = brush: skia when present, numpy otherwise).
- HERO: billboard size of the sample figure = canon of 7.5 heads at 5.78 H (shoulder width 2 heads = 1.54 H);
  keys height, shoulder (the old keys tinggi, bahu still work).
Sprites (trees, lamps, bushes) = billboards: base at the world position, scale f/depth, sorted far to near together
with the figure.

Usage: python3 space3d.py demo out.png    -> orbit sheet of 4 angles of a sample scene (ground, road, mountain ring,
                                            billboard poles, screen light direction)
"""
import math
import os
import random
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brush  # noqa: E402


_DOC_ID = """space3d - ruang 3D sederhana untuk latar 2D dengan kamera bergerak/orbit satu take (skill motion-graphics bab 5.2).

Dunia satuan H (tinggi kepala tokoh). x = timur, y = atas, z = utara. Tanah y = 0. Azimut dari utara searah jarum jam.
- Cam: kamera pinhole (yaw dari utara searah jarum jam, pitch turun +), f piksel, pusat (cx, cy), bidang dekat near.
  cam(P) -> koordinat kamera (kanan, atas, maju); scr(c) -> layar; project(P) -> (layar, kedalaman);
  light2d(sun) -> arah cahaya di layar untuk sprite/tokoh (sisi terang berpindah benar saat orbit).
- Cam.orbit(target, dist, height, az, pitch): kamera di azimut az dari target, memandang target.
- cam_height(d, pitch, f, cy, sole_px): tinggi kamera supaya sol tokoh di y layar sole_px pada jarak horizontal d:
      h = d (sin t + k cos t) / (cos t - k sin t),  k = (sole_px - cy) / f,  t = pitch
- ground_poly / poly_path: poligon di tanah/dunia, diklip di bidang dekat (Sutherland-Hodgman) lalu diproyeksikan.
- ring_path: cincin silinder (gunung, bukit, deret pohon jauh) radius R di sekitar pusat, profil tinggi per azimut;
  parallax otomatis benar. Hanya run titik terlihat (z > margin x R) dijadikan satu poligon.
- mt_profile: punggung gunung organik (fBm periodik + puncak membulat soft-abs + gunung api lereng cekung + kawah).
  JANGAN gunung segitiga lurus (Hasil Review: geometris).
- haze_t(d): campuran warna ke langit per jarak: t = tmax (1 - exp(-(d - d0) / D)).
- keepout(objs, cam_xz, clear): hapus objek yang terlalu dekat jalur kamera SETELAH tata letak dibuat (draw acak tetap,
  tata letak lain stabil). clearance(objs, cam_xz): jarak minimum per objek untuk laporan.
- union_all, clip_near, ellipse_xz, mix, c4, paint: alat bantu (path/cat = brush: skia bila ada, numpy bila tidak).
- HERO: ukuran billboard tokoh contoh = kanon 7,5 kepala pada 5.78 H (lebar bahu 2 kepala = 1.54 H).
Sprite (pohon, lampu, semak) = billboard: alas di posisi dunia, skala f/kedalaman, diurutkan jauh ke dekat bersama tokoh.

Pakai: python3 space3d.py demo out.png    -> lembar orbit 4 sudut adegan contoh (tanah, jalan, cincin gunung,
                                            tiang billboard, arah cahaya layar)
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


HD = 5.78 / 7.5                               # satu kepala (H)
class _Keys(dict):
    """dict with English keys that still answers the old Indonesian keys (HERO["tinggi"] == HERO["height"])."""
    OLD = dict(tinggi="height", bahu="shoulder")

    def __missing__(self, k):
        if k in self.OLD:
            return self[self.OLD[k]]
        raise KeyError(k)

    def get(self, k, d=None):
        return dict.get(self, self.OLD.get(k, k), d)

    def __contains__(self, k):
        return dict.__contains__(self, self.OLD.get(k, k))


HERO = _Keys(height=5.78, shoulder=2 * HD)         # tokoh contoh kanon 7,5 kepala


# ---------------- warna ----------------
def c4(c, a=1.0):
    return brush.color(c, a)


def mix(c1, c2, t):
    t = max(0.0, min(1.0, t))
    out = 0
    for sh in (16, 8, 0):
        a, b = (c1 >> sh) & 255, (c2 >> sh) & 255
        out |= int(round(a + (b - a) * t)) << sh
    return out


def paint(c, a=1.0, blend=None):
    """brush.Paint isi (style fill); blend = nama campur brush ("multiply", "clear", ...)."""
    return brush.Paint(c, alpha=a, blend=blend or "normal")


def haze_t(d, d0=15.0, D=400.0, tmax=0.6):
    """Fraksi campuran ke warna langit untuk objek berjarak d (H)."""
    return 0.0 if d <= d0 else tmax * (1 - math.exp(-(d - d0) / D))


# ---------------- kamera ----------------
class Cam:
    def __init__(self, pos, yaw, pitch, f=1500.0, cx=540.0, cy=960.0, near=1.0):
        self.pos = np.array(pos, float)
        self.yaw, self.pitch, self.f, self.cx, self.cy, self.near = yaw, pitch, f, cx, cy, near
        cy_, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
        cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
        self.fwd = np.array([sy * cp, -sp, cy_ * cp])
        self.right = np.array([cy_, 0.0, -sy])
        self.up = np.array([sy * sp, cp, cy_ * sp])

    @staticmethod
    def orbit(target, dist, height, az, pitch, f=1500.0, cx=540.0, cy=960.0, near=1.0):
        """Kamera di azimut az (derajat dari utara searah jarum jam) terhadap target (x, y, z), memandang target."""
        a = math.radians(az)
        pos = (target[0] + dist * math.sin(a), height, target[2] + dist * math.cos(a))
        return Cam(pos, (az + 180.0) % 360.0, pitch, f=f, cx=cx, cy=cy, near=near)

    def cam(self, P):
        d = np.asarray(P, float) - self.pos
        return np.stack([d @ self.right, d @ self.up, d @ self.fwd], axis=-1)

    def scr(self, c):
        c = np.asarray(c, float)
        return np.stack([self.cx + self.f * c[..., 0] / c[..., 2], self.cy - self.f * c[..., 1] / c[..., 2]], axis=-1)

    def project(self, P):
        c = self.cam(P)
        return self.scr(c), c[..., 2]

    def horizon_y(self):
        return self.cy - self.f * math.tan(math.radians(self.pitch))

    def light2d(self, sun):
        """Arah cahaya di layar (x kanan, y atas), satuan."""
        lx, ly = float(sun @ self.right), float(sun @ self.up)
        n = math.hypot(lx, ly) or 1.0
        return lx / n, ly / n

    def sprite(self, x, z, y=0.0):
        """Alas billboard di dunia (x, y, z) -> (layar x, layar y, skala px per H, kedalaman). None bila di belakang."""
        c = self.cam([x, y, z])
        if c[2] < self.near:
            return None
        s = self.scr(c)
        return float(s[0]), float(s[1]), self.f / float(c[2]), float(c[2])


def cam_height(d, pitch, f=1500.0, cy=960.0, sole_px=1536.0):
    t = math.radians(pitch)
    k = (sole_px - cy) / f
    return d * (math.sin(t) + k * math.cos(t)) / (math.cos(t) - k * math.sin(t))


def sun_dir(az, elev):
    """Vektor satuan ke arah matahari. az dari utara searah jarum jam, elev dari horizon."""
    a, e = math.radians(az), math.radians(elev)
    return np.array([math.sin(a) * math.cos(e), math.sin(e), math.cos(a) * math.cos(e)])


# ---------------- poligon ----------------
def clip_near(cs, near):
    out = []
    n = len(cs)
    for i in range(n):
        a, b = cs[i], cs[(i + 1) % n]
        ina, inb = a[2] >= near, b[2] >= near
        if ina:
            out.append(a)
        if ina != inb:
            t = (near - a[2]) / (b[2] - a[2])
            out.append(a + (b - a) * t)
    return out


def poly_path(cam, pts3):
    """Poligon dunia (N x 3) -> brush.Path layar (diklip di bidang dekat)."""
    cs = clip_near(list(cam.cam(np.asarray(pts3, float))), cam.near)
    p = brush.Path()
    if len(cs) < 3:
        return p
    s = np.clip(cam.scr(np.array(cs)), -2.0e5, 2.0e5)
    return p.polygon([tuple(q) for q in s])


def ground_poly(cam, xz):
    xz = np.asarray(xz, float)
    return poly_path(cam, np.stack([xz[:, 0], np.zeros(len(xz)), xz[:, 1]], axis=1))


def ellipse_xz(cx, cz, a, b, ang=0.0, n=48, wobble=0.0, seed=0):
    """Elips di tanah: sumbu a searah sudut ang (radian, dari +x), b tegak lurus; wobble = tepi organik."""
    rng = random.Random(seed)
    ph = [rng.random() * 6.283 for _ in range(3)]
    ca, sa = math.cos(ang), math.sin(ang)
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = 1 + wobble * (0.6 * math.sin(3 * t + ph[0]) + 0.4 * math.sin(5 * t + ph[1]))
        u, v = a * r * math.cos(t), b * r * math.sin(t)
        out.append((cx + u * ca - v * sa, cz + u * sa + v * ca))
    return out


def strip_xz(pts, width):
    """Jalan/pita di tanah dari polyline (x, z) dengan lebar tetap -> poligon (x, z)."""
    pts = np.asarray(pts, float)
    L, R = [], []
    for i in range(len(pts)):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        d = b - a
        n = np.array([-d[1], d[0]]) / (np.hypot(*d) or 1.0)
        L.append(pts[i] + n * width / 2)
        R.append(pts[i] - n * width / 2)
    return L + R[::-1]


def union_all(paths):
    """Gabung banyak path (OpBuilder). Untuk bayangan: JANGAN union ratusan poligon (lambat); gambar opak di satu
    layer lalu komposit sekali (shadow3d.shadow_layer)."""
    return brush.union_all(paths)


# ---------------- cincin panorama ----------------
def ring_path(cam, center, R, prof, base=0.0, margin=0.35):
    """prof: list (az_deg, h) periodik. Kembalikan (brush.Path bagian terlihat, (titik atas, titik bawah, indeks))."""
    az = np.radians(np.array([a for a, _ in prof]))
    hh = np.array([h for _, h in prof])
    top = np.stack([center[0] + R * np.sin(az), hh, center[1] + R * np.cos(az)], axis=1)
    bot = np.stack([center[0] + R * np.sin(az), np.full(len(az), base), center[1] + R * np.cos(az)], axis=1)
    ct, cb = cam.cam(top), cam.cam(bot)
    vis = (ct[:, 2] > margin * R) & (cb[:, 2] > margin * R)
    n = len(az)
    if not vis.any():
        return brush.Path(), []
    if vis.all():
        idx = list(range(n)) + [0]
    else:
        s0 = int(np.where(~vis)[0][0])
        runs, cur = [], []
        for k in range(n):
            i = (s0 + k) % n
            if vis[i]:
                cur.append(i)
            elif cur:
                runs.append(cur)
                cur = []
        if cur:
            runs.append(cur)
        idx = max(runs, key=len)
    if len(idx) < 2:
        return brush.Path(), []
    st, sb = cam.scr(ct[idx]), cam.scr(cb[idx])
    p = brush.Path().polygon([tuple(q) for q in st] + [tuple(q) for q in sb[::-1]])
    return p, (st, sb, idx)


def _pnoise(rng, k):
    vals = [rng.random() for _ in range(k)]

    def f(u):
        x = (u % 1.0) * k
        i = int(x)
        t = x - i
        t2 = (1 - math.cos(math.pi * t)) / 2
        return vals[i % k] * (1 - t2) + vals[(i + 1) % k] * t2
    return f


def _softabs(d, c):
    return math.sqrt(d * d + c * c) - c


def mt_profile(seed, n, base, amp, octs=((5, 1.0), (11, 0.5), (23, 0.26), (47, 0.14), (97, 0.07), (193, 0.035)),
               power=1.3, volcanoes=(), peaks=()):
    """Profil gunung periodik (az 0..360, tinggi H).
    peaks = ((az, tinggi, lebar_derajat, cap), ...): puncak kunci membulat (cap = kebulatan puncak), bahu tidak rata.
    volcanoes = ((az, tinggi, lebar), ...): lereng cekung k^1.75 + kawah dangkal."""
    rng = random.Random(seed)
    fs = [(_pnoise(rng, k), a) for k, a in octs]
    tot = sum(a for _, a in octs)
    rough = [(_pnoise(rng, k), a) for k, a in ((61, 1.0), (131, 0.5), (263, 0.25))]
    out = []
    for i in range(n + 1):
        az = 360.0 * i / n
        u = az / 360.0
        v = sum(f(u) * a for f, a in fs) / tot
        r = sum(f(u) * a for f, a in rough) / 1.75 - 0.5
        h = base + amp * v ** power
        for az0, hp, w, cap in peaks:
            d = _softabs((az - az0 + 540) % 360 - 180, cap * w)
            if d < w:
                k = 1 - d / w
                h = max(h, hp * (0.42 * k + 0.58 * k ** 2.4) * (1 + 0.10 * r * (1 - k)))
        for az0, hv, w in volcanoes:
            dd = (az - az0 + 540) % 360 - 180
            d = _softabs(dd, 0.07 * w)
            if d < w:
                k = 1 - d / w
                vv = hv * k ** 1.75 * (1 + 0.05 * r * (1 - k) * 4)
                vv -= hv * 0.018 * math.exp(-(dd / (0.05 * w)) ** 2)
                h = max(h, vv)
        h += amp * 0.035 * r
        out.append((az, h))
    return out


# ---------------- jalur kamera vs objek ----------------
def clearance(objs, cam_xz):
    """objs: {jenis: [dict(x, z, ...)]}; cam_xz: N x 2 posisi kamera sepanjang take. -> {jenis: [(jarak_min, obj)]}."""
    cp = np.asarray(cam_xz, float)
    return {k: sorted(((float(np.hypot(cp[:, 0] - o["x"], cp[:, 1] - o["z"]).min()), o) for o in v),
                      key=lambda a: a[0]) for k, v in objs.items()}


def keepout(objs, cam_xz, clear, extra=None):
    """Hapus objek yang berjarak < clear[jenis] (+ extra(jenis, obj)) dari jalur kamera. Jalankan SETELAH semua
    draw acak tata letak (draw tetap), supaya objek lain tidak bergeser. Kembalikan jumlah terhapus per jenis."""
    cp = np.asarray(cam_xz, float)
    removed = {}
    for key, r in clear.items():
        keep = []
        for o in objs.get(key, []):
            e = extra(key, o) if extra else 0.0
            if np.hypot(cp[:, 0] - o["x"], cp[:, 1] - o["z"]).min() >= r + e:
                keep.append(o)
        removed[key] = len(objs.get(key, [])) - len(keep)
        objs[key] = keep
    return removed


# ---------------- demo ----------------
def demo(out):
    W, H, f, pitch, dist = 1080, 1920, 1500.0, 4.0, 14.0
    hcam = cam_height(dist, pitch, f, H / 2, 0.8 * H)
    sun = sun_dir(250, 55)
    SKY, MT, HILL, GROUND, PATH, POLE = 0x9FCBD6, 0x93B48A, 0xA7BF77, 0xA6BE68, 0xE9D8B4, 0x6B5A4A
    prof_mt = mt_profile(11, 1440, 150.0, 300.0, power=1.25, peaks=((20.0, 450.0, 13.0, 0.10),),
                         volcanoes=((200.0, 330.0, 22.0),))
    prof_hill = mt_profile(13, 1440, 22.0, 60.0, octs=((7, 1.0), (15, 0.45), (31, 0.2)), power=1.2)
    poles = [dict(x=x, z=z) for x, z in ((-8, 6), (6, 9), (10, -7), (-6, -10), (-3.5, 3.0))]
    path_poly = strip_xz([(-200, 0), (200, 0)], 5.0)
    cam_xz = [(dist * math.sin(math.radians(a)), dist * math.cos(math.radians(a))) for a in range(0, 360, 3)]
    removed = keepout({"poles": poles}, cam_xz, {"poles": 2.0})
    sc, gap = 0.30, 12
    sheet = brush.Surface(int(4 * W * sc + 5 * gap), int(H * sc + 2 * gap + 56))
    sh = sheet.canvas
    sh.clear(0xF4F0EA)
    font = brush.Font("Inter", 17)
    ink = brush.Paint(0x141414)
    for i, az in enumerate((180, 90, 0, 270)):
        cam = Cam.orbit((0.0, 0.0, 0.0), dist, hcam, az, pitch, f=f, cx=W / 2, cy=H / 2)
        s = brush.Surface(W, H)
        c = s.canvas
        c.clear(SKY)
        hy = cam.horizon_y()
        for R, prof, col in ((2600.0, prof_mt, mix(MT, SKY, 0.45)), (800.0, prof_hill, mix(HILL, SKY, 0.15))):
            p, _ = ring_path(cam, (0.0, 0.0), R, prof)
            c.draw_path(p, paint(col))
        c.draw_rect(0, hy, W, H, paint(GROUND))
        c.draw_path(ground_poly(cam, path_poly), paint(PATH))
        lx, ly = cam.light2d(sun)
        items = sorted(poles + [dict(x=0.0, z=0.0, hero=True)], key=lambda o: -cam.cam([o["x"], 0, o["z"]])[2])
        for o in items:
            sp = cam.sprite(o["x"], o["z"])
            if sp is None:
                continue
            x, y, k, d = sp
            hgt, w = (HERO["height"], HERO["shoulder"]) if o.get("hero") else (9.0, 0.35)
            col = 0x55788A if o.get("hero") else POLE
            r = (x - w / 2 * k, y - hgt * k, x + w / 2 * k, y)
            c.draw_round_rect(*r, w / 2 * k, w / 2 * k, paint(mix(col, SKY, haze_t(d))))
            # sisi gelap di sisi jauh dari cahaya layar
            side = (x + (0 if lx < 0 else -w / 2 * k), y - hgt * k, x + (w / 2 * k if lx < 0 else 0), y)
            c.draw_round_rect(*side, w / 4 * k, w / 4 * k, paint(0x000000, 0.18))
        img = s.image()
        ox = gap + i * (W * sc + gap)
        sh.save()
        sh.translate(ox, gap + 52)
        sh.scale(sc, sc)
        sh.draw_image(img, 0, 0)
        sh.restore()
        sh.draw_text("kamera az %d" % az, ox, gap + 16, font, ink)
        sh.draw_text("cahaya layar (%.2f, %.2f)" % (lx, ly), ox, gap + 38, font, ink)
    sheet.save(out)
    print(_T("camera height %.2f H (d %.0f H, pitch %.0f, sole at 80%% of the frame); poles removed by keepout: %s",
             "tinggi kamera %.2f H (d %.0f H, pitch %.0f, sol di 80%% frame); tiang dihapus keepout: %s") % (
        hcam, dist, pitch, removed))


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "demo":
        demo(sys.argv[2])
    else:
        print(_T(__doc__, _DOC_ID))
