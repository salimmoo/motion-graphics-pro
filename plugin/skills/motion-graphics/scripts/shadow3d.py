"""shadow3d - 2D figure shadow from a 3D pose + the figure darkens inside shaded areas (motion-graphics skill ch. 5.3).
Old name: shadow3d.py (still works).

A fixed capsule shadow was REJECTED (review: "the shadow does not change with the motion"). Here the body = 3D
capsules/spheres from the gait engine (or a standing skeleton). Each point P is projected along the sun onto the ground:
    G = P - sun x (P_y / sun_y)        (sun = unit vector towards the sun, sun_y > 0)
A sphere becomes an ellipse with axis r / sin(elevation) along the sun. The shadow walks with the figure and is right
from every angle.

Body coordinates: (forward xs, ys down from the top of the head, lateral l (+ = the figure's right)); sole at
ys = sole. to_world(q, base, face, sole): base = world (x, z) of the figure, face = facing azimuth (from north,
clockwise).

Contents:
- walk_prims(gt, p, P=PRIM, extra=None) : body primitives from a gait pose (gait_engine.Gait), extra(pz, U) -> list of
                                          extra prims (props: bag, umbrella). Prim: ("cap3", a, b, r) or ("sph3", c, r)
- ground_matrix(cam)                    : ground homography (x, z) -> screen (brush.Matrix 3x3). Rows:
                                          (f a0 + cx a2), (cy a2 - f a1), (a2) against (x, z, 1); a = camera axes
- draw_shadow(cv, cam, sun, prims, base, face, color, sole) : draws opaque into the active shadow layer (round-cap
                                          strokes in ground space = correct width)
- draw_contact(...)                     : contact occlusion under the parts touching the ground (< 0.12 H above it)
- shadow_layer(cv, alpha, fn)           : multiply layer + alpha; every shadow is drawn OPAQUE inside it and
                                          composited once -> overlaps do not darken twice
- shade_matrix(cam, sun, xs, ytop, s, base, sole) : figure billboard pixel -> ground point along the sun -> screen
- draw_shaded(cv, draw_fn, mask_img, M) : draws the figure, then multiplies the shade mask (blend modulate) via M^-1
- mask_color(shadow_hex, a)             : per-channel modulation colour = 255 (1 - a) + c a

PRIM = adult canon of 7.5 heads at 5.78 H (same as the site figure; one head = 0.771 H): twin body capsules
(shoulder width 2 heads), head + hair spheres, hand 0.3 H past the wrist along the forearm.
cv = brush.Canvas, color = brush.color(hex) (skia when present, numpy + Pillow otherwise).

Usage: python3 shadow3d.py demo out.png   -> 4 angles x 2 phases: walking capsule figure, pose shadow, AO, shade
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brush  # noqa: E402


_DOC_ID = """shadow3d - bayangan tokoh 2D dari pose 3D + tokoh ikut gelap di area teduh (skill motion-graphics bab 5.3).

Bayangan kapsul tetap DITOLAK (Hasil Review: "bayangannya tidak berubah based on gerak"). Di sini tubuh = kapsul/bola
3D dari mesin gait (atau kerangka berdiri). Tiap titik P diproyeksikan searah matahari ke tanah:
    G = P - sun x (P_y / sun_y)        (sun = vektor satuan ke matahari, sun_y > 0)
Bola menjadi elips dengan sumbu r / sin(elevasi) searah matahari. Bayangan ikut melangkah, benar dari semua sudut.

Koordinat tubuh: (maju xs, ys ke bawah dari puncak kepala, lateral l (+ = kanan tokoh)); sol di ys = sole.
to_world(q, base, face, sole): base = (x, z) dunia titik tokoh, face = azimut arah hadap (dari utara searah jarum jam).

Isi:
- walk_prims(gt, p, P=PRIM, extra=None) : primitif tubuh dari pose gait (gait_engine.Gait), extra(pz, U) -> list prim tambahan
                                          (properti: tas, payung). Prim: ("cap3", a, b, r) atau ("sph3", c, r)
- ground_matrix(cam)                    : homografi tanah (x, z) -> layar (brush.Matrix 3x3). Baris:
                                          (f a0 + cx a2), (cy a2 - f a1), (a2) terhadap (x, z, 1); a = sumbu kamera
- draw_shadow(cv, cam, sun, prims, base, face, color, sole) : gambar opak di layer bayangan aktif (stroke round-cap
                                          di ruang tanah = lebar benar)
- draw_contact(...)                     : oklusi kontak di bawah bagian yang menapak (< 0.12 H dari tanah)
- shadow_layer(cv, alpha, fn)           : lapis multiply + alpha; semua bayangan digambar OPAK di dalamnya lalu
                                          dikomposit sekali -> tumpang tindih tidak menggelap ganda
- shade_matrix(cam, sun, xs, ytop, s, base, sole) : piksel billboard tokoh -> titik tanah searah matahari -> layar
- draw_shaded(cv, draw_fn, mask_img, M) : gambar tokoh lalu kalikan masker teduh (campur modulate) lewat M^-1
- mask_color(shadow_hex, a)             : warna modulasi per kanal = 255 (1 - a) + c a

PRIM = kanon dewasa 7,5 kepala pada 5.78 H (sama dengan figur situs; satu kepala = 0.771 H): kapsul badan kembar
(lebar bahu 2 kepala), kepala + rambut bola, tangan 0.3 H melewati pergelangan searah lengan bawah.
cv = brush.Canvas, warna = brush.color(hex) (skia bila ada, numpy + Pillow bila tidak).

Pakai: python3 shadow3d.py demo out.png   -> 4 sudut x 2 fase: tokoh kapsul berjalan, bayangan pose, AO, teduh
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


# ukuran primitif tubuh (kanon 7,5 kepala pada 5.78 H, sama dengan figur situs; ganti per tokoh)
PRIM = dict(
    torso=((0.0, 1.30), (0.0, 2.70), 0.32), torso_lat=0.24,          # dua kapsul badan di lateral +-0.24
    neck=((0.0, 0.70), (-0.03, 1.10), 0.19),
    head=((0.03, 0.41), 0.36), hair=((0.0, 0.37), 0.38), chin=(0.03, 0.74), lean_piv=(0.0, 2.60),
    thigh_r=0.24, shin_r=0.15, foot_r=0.13, upper_r=0.14, fore_r=0.10, hand_r=0.12, hand_off=0.30,
    lat_hip=0.30, lat_knee=0.20, lat_ankle=0.15, lat_toe=0.19, heel_dy=-0.11, toe_dy=-0.08,
    lat_sh=0.60, lat_el=0.66, lat_wr=0.70,
)


def _rot(p, piv, deg):
    """Rotasi searah jarum jam di layar (y ke bawah), sama dengan brush.Matrix.rotate."""
    a = math.radians(deg)
    x, y = p[0] - piv[0], p[1] - piv[1]
    return (piv[0] + x * math.cos(a) - y * math.sin(a), piv[1] + x * math.sin(a) + y * math.cos(a))


def walk_prims(gt, p, P=PRIM, extra=None, load_arm=None):
    """Primitif tubuh dari pose gait fase p (kaki dekat = kanan tokoh, lateral +).
    load_arm = "right" / "left" / None: lengan yang membawa beban memakai ayunan kecil gait (sh_amp_bag, el_bag)."""
    from gait_engine import shoe_map
    pz = gt.pose(p)
    dy, lean = pz["dy"], pz["lean"]

    def U(q):
        r = _rot(q, P["lean_piv"], lean)
        return (r[0], r[1] + dy)
    hy = pz["hip"][1]
    out = []
    for leg, s in ((pz["near"], 1.0), (pz["far"], -1.0)):
        k, a = leg["knee"], leg["ankle"]
        out.append(("cap", (0.0, hy, P["lat_hip"] * s), (k[0], k[1], P["lat_knee"] * s), P["thigh_r"]))
        out.append(("cap", (k[0], k[1], P["lat_knee"] * s), (a[0], a[1], P["lat_ankle"] * s), P["shin_r"]))
        f = shoe_map(leg["cfg"])
        h, t = f(gt.HEEL), f(gt.TOE)
        out.append(("cap", (h[0], h[1] + P["heel_dy"], P["lat_ankle"] * s), (t[0], t[1] + P["toe_dy"],
                                                                             P["lat_toe"] * s), P["foot_r"]))
    a, b, r = P["torso"]
    tl = P.get("torso_lat", 0.0)
    for l in ((-tl, tl) if tl else (0.0,)):
        out.append(("cap", U(a) + (l,), U(b) + (l,), r))
    a, b, r = P["neck"]
    out.append(("cap", U(a), U(b), r, "neck"))
    for key in ("head", "hair"):
        if key in P:
            c, r = P[key]
            out.append(("sph", U(_rot(c, P["chin"], pz["nod"])), r))
    for side, s, name in ((0.0, 1.0, "right"), (0.5, -1.0, "left")):
        (S_, E_, W_), _, _ = gt.arm(p + side, bag=(load_arm == name))
        S_, E_, W_ = U(S_), U(E_), U(W_)
        out.append(("cap", S_ + (P["lat_sh"] * s,), E_ + (P["lat_el"] * s,), P["upper_r"]))
        out.append(("cap", E_ + (P["lat_el"] * s,), W_ + (P["lat_wr"] * s,), P["fore_r"]))
        dx, dy = W_[0] - E_[0], W_[1] - E_[1]
        dn = math.hypot(dx, dy) or 1.0
        out.append(("sph", (W_[0] + dx / dn * P["hand_off"], W_[1] + dy / dn * P["hand_off"]), P["hand_r"],
                    P["lat_wr"] * s))
    if extra is not None:
        out += extra(pz, U)
    return expand(out)


def expand(prims):
    """('cap', (x,y), (x,y), r, lat) / ('cap', (x,y,l), (x,y,l), r) / ('sph', c, r[, lat]) -> cap3 / sph3."""
    out = []
    for pr in prims:
        if pr[0] in ("cap3", "sph3"):
            out.append(pr)
        elif pr[0] == "cap":
            a, b, r = pr[1], pr[2], pr[3]
            lat = pr[4] if len(pr) > 4 and not isinstance(pr[4], str) else 0.0
            out.append(("cap3", a if len(a) == 3 else (a[0], a[1], lat), b if len(b) == 3 else (b[0], b[1], lat), r))
        else:
            c, r = pr[1], pr[2]
            lat = pr[3] if len(pr) > 3 else 0.0
            out.append(("sph3", c if len(c) == 3 else (c[0], c[1], lat), r))
    return out


def to_world(q, base, face, sole):
    a = math.radians(face)
    f = (math.sin(a), math.cos(a))
    r = (math.cos(a), -math.sin(a))
    xs, ys, l = q
    return np.array([base[0] + xs * f[0] + l * r[0], sole - ys, base[1] + xs * f[1] + l * r[1]])


def ground_of(P, sun):
    k = P[1] / sun[1]
    return (P[0] - sun[0] * k, P[2] - sun[2] * k)


def ground_matrix(cam):
    ax = [cam.right, cam.up, cam.fwd]
    C = cam.pos
    a = [v[0] for v in ax]
    b = [v[2] for v in ax]
    d = [-float(C @ v) for v in ax]
    f, cx, cy = cam.f, cam.cx, cam.cy
    return brush.Matrix.make_all(f * a[0] + cx * a[2], f * b[0] + cx * b[2], f * d[0] + cx * d[2],
                              cy * a[2] - f * a[1], cy * b[2] - f * b[1], cy * d[2] - f * d[1],
                              a[2], b[2], d[2])


def draw_shadow(cv, cam, sun, prims, base, face, color, sole=5.78):
    """color = warna opak (brush.color / hex; alpha diatur shadow_layer)."""
    e = math.asin(max(1e-3, sun[1]))
    sh = np.array([-sun[0], -sun[2]])
    sh /= np.linalg.norm(sh)
    ang = math.degrees(math.atan2(sh[1], sh[0]))
    cv.save()
    cv.concat(ground_matrix(cam))
    fill = brush.Paint(color)
    for pr in prims:
        if pr[0] == "cap3":
            A = ground_of(to_world(pr[1], base, face, sole), sun)
            B = ground_of(to_world(pr[2], base, face, sole), sun)
            stroke = brush.Paint(color, style="stroke", width=2 * pr[3], cap="round", join="round")
            cv.draw_path(brush.Path().move_to(*A).line_to(B[0] + 1e-4, B[1]), stroke)
        else:
            G = ground_of(to_world(pr[1], base, face, sole), sun)
            r = pr[2]
            cv.save()
            cv.translate(*G)
            cv.rotate(ang)
            cv.draw_oval(-r / math.sin(e), -r, r / math.sin(e), r, fill)
            cv.restore()
    cv.restore()


def draw_contact(cv, cam, prims, base, face, color, sole=5.78, h=0.12):
    cv.save()
    cv.concat(ground_matrix(cam))
    pnt = brush.Paint(color)
    for pr in prims:
        if pr[0] != "cap3":
            continue
        a, b = pr[1], pr[2]
        if sole - a[1] < h and sole - b[1] < h:
            A = to_world(a, base, face, sole)
            B = to_world(b, base, face, sole)
            cx, cz = (A[0] + B[0]) / 2, (A[2] + B[2]) / 2
            ln = math.hypot(B[0] - A[0], B[2] - A[2]) / 2 + 0.10
            ang = math.degrees(math.atan2(B[2] - A[2], B[0] - A[0]))
            cv.save()
            cv.translate(cx, cz)
            cv.rotate(ang)
            cv.draw_oval(-ln, -0.13, ln, 0.13, pnt)
            cv.restore()
    cv.restore()


def shadow_layer(cv, alpha, fn):
    """fn() menggambar bayangan opak (lubang cahaya belang: campur "clear"). Komposit sekali: multiply + alpha."""
    cv.save_layer(brush.Paint(alpha=alpha, blend="multiply"))
    fn()
    cv.restore()


def mask_color(shadow, a):
    out = 0
    for sh in (16, 8, 0):
        v = (shadow >> sh) & 255
        out |= int(round(255 * (1 - a) + v * a)) << sh
    return out


def shade_matrix(cam, sun, xs, ytop, s, base, sole=5.78):
    """Layar (piksel billboard tokoh: puncak di (xs, ytop), s px per H) -> layar titik tanah searah matahari."""
    rx, rz = cam.right[0], cam.right[2]
    A1 = brush.Matrix.make_all(1 / s, 0, -xs / s, 0, 1 / s, -ytop / s, 0, 0, 1)
    kx, kz = sun[0] / sun[1], sun[2] / sun[1]
    A2 = brush.Matrix.make_all(rx, kx, base[0] - sole * kx, rz, kz, base[1] - sole * kz, 0, 0, 1)
    return ground_matrix(cam) @ (A2 @ A1)


def draw_shaded(cv, draw_fn, mask_img, M):
    """draw_fn() menggambar tokoh; mask_img = brush.Image layar (putih = terang, teduh = mask_color). Tokoh dikali masker
    yang dibaca di titik tanah searah matahari (pendekatan: titik tubuh sebidang billboard)."""
    Minv = M.invert()
    if Minv is None:
        draw_fn()
        return
    cv.save_layer()
    draw_fn()
    cv.save()
    cv.concat(Minv)
    cv.draw_image(mask_img, 0, 0, brush.Paint(blend="modulate"))
    cv.restore()
    cv.restore()


# ---------------- demo ----------------
def demo(out):
    import space3d as R
    from gait_engine import Gait
    W, H, f, pitch, dist = 1080, 1920, 1500.0, 4.0, 10.0
    hc = R.cam_height(dist, pitch, f, H / 2, 0.8 * H)
    sun = R.sun_dir(250, 55)
    gt = Gait()
    GROUND, SHADOW, AO, BODY, BODY_D = 0xA6BE68, 0x5E7A86, 0x3B4A3A, 0x55788A, 0x3E5A6A
    tree = R.ellipse_xz(2.8, 1.0, 1.6, 1.1, 0.4, wobble=0.08, seed=3)       # bayangan tajuk: tubuh atas tokoh teduh
    sc, gap = 0.25, 10
    phases = (0.0, 0.25)
    sheet = brush.Surface(int(4 * W * sc + 5 * gap), int(len(phases) * (H * sc + 40) + gap))
    shc = sheet.canvas
    shc.clear(0xF4F0EA)
    font = brush.Font("Inter", 17)
    ink = brush.Paint(0x141414)
    for j, p in enumerate(phases):
        prims = walk_prims(gt, p)
        for i, az in enumerate((180, 135, 90, 0)):
            cam = R.Cam.orbit((0.0, 0.0, 0.0), dist, hc, az, pitch, f=f, cx=W / 2, cy=H / 2)
            s = brush.Surface(W, H)
            c = s.canvas
            c.clear(0x9FCBD6)
            c.draw_rect(0, cam.horizon_y(), W, H, R.paint(GROUND))
            tree_path = R.ground_poly(cam, tree)

            def shadows():
                c.draw_path(tree_path, R.paint(SHADOW))
                draw_shadow(c, cam, sun, prims, (0.0, 0.0), 90.0, R.c4(SHADOW))
            shadow_layer(c, 0.34, shadows)
            shadow_layer(c, 0.22, lambda: draw_contact(c, cam, prims, (0.0, 0.0), 90.0, R.c4(AO)))
            # tokoh billboard sederhana (kapsul tubuh terproyeksi ke layar; cukup untuk uji teduh)
            xs, ys, k, d = cam.sprite(0.0, 0.0)
            ytop = ys - 5.78 * k

            def body():
                v = (az - 90.0) % 360.0
                pnt = R.paint(BODY)
                order = sorted(prims, key=lambda q: -(q[1][0] * math.cos(math.radians(v)) +
                                                      q[1][2] * math.sin(math.radians(v))))
                for q in order:
                    u = lambda t: xs + k * (t[0] * math.sin(math.radians(v)) - t[2] * math.cos(math.radians(v)))
                    if q[0] == "cap3":
                        col = BODY if q[1][2] * math.sin(math.radians(v)) >= -0.01 else BODY_D
                        pst = brush.Paint(col, style="stroke", width=2 * q[3] * k, cap="round")
                        c.draw_line(u(q[1]), ytop + q[1][1] * k, u(q[2]) + 1e-3, ytop + q[2][1] * k, pst)
                    else:
                        c.draw_circle(u(q[1]), ytop + q[1][1] * k, q[2] * k, pnt)
            mask = brush.Surface(W, H)
            mc = mask.canvas
            mc.clear(0xFFFFFF)
            mc.draw_path(tree_path, R.paint(mask_color(SHADOW, 0.34)))
            draw_shaded(c, body, mask.image(), shade_matrix(cam, sun, xs, ytop, k, (0.0, 0.0)))
            ox, oy = gap + i * (W * sc + gap), gap + j * (H * sc + 40) + 30
            shc.save()
            shc.translate(ox, oy)
            shc.scale(sc, sc)
            shc.draw_image(s.image(), 0, 0)
            shc.restore()
            shc.draw_text("kamera az %d, fase p %.2f" % (az, p), ox, oy - 10, font, ink)
    sheet.save(out)


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "demo":
        demo(sys.argv[2])
    else:
        print(_T(__doc__, _DOC_ID))
