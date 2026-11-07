"""test_brush - brush test scene (fill, stroke caps/joins, gradients, clip, multiply layer, pathfinder, perspective
image, text, SVG). Old name: _bersama/uji/uji_kuas.py. Run with both engines and compare:

  MGP_BRUSH_ENGINE=pure python -I -X utf8 test_brush.py out/        -> out/brush_pure.png
  MGP_BRUSH_ENGINE=skia python -I -X utf8 test_brush.py out/        -> out/brush_skia.png
  python -I -X utf8 compare.py out/brush_skia.png out/brush_pure.png out/brush_diff.png
Without an out folder the PNG goes to a new temp folder (never into the current folder); its path is printed.
"""
import math
import os
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import brush as K  # noqa: E402

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">
<rect x="5" y="5" width="110" height="90" rx="12" fill="#e9d8b4"/>
<path d="M20 80 Q 40 10 60 50 T 100 40" fill="none" stroke="#55788a" stroke-width="6" stroke-linecap="round"/>
<g transform="translate(70 60) rotate(20)"><ellipse cx="0" cy="0" rx="22" ry="12" fill="rgb(77.9%, 64%, 66.2%)"/></g>
<circle cx="30" cy="35" r="10" style="fill:#7fa3b5;stroke:#2b2420;stroke-width:2"/>
<path d="M85 15 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 z M90 15 h10 v6 h-10 z" fill="#c9917c" fill-rule="evenodd"/>
</svg>"""


def scene(out):
    W, H = 900, 700
    s = K.Surface(W, H)
    c = s.canvas
    c.clear(0xF4F0EA)
    # fill + gradients
    c.draw_path(K.Path().oval(30, 30, 230, 150), K.Paint(shader=K.linear_gradient((30, 30), (230, 150),
                                                                                    [0x9FCBD6, 0x55788A])))
    c.draw_path(K.Path().circle(330, 90, 60), K.Paint(shader=K.radial_gradient((310, 70), 70,
                                                                                    [0xFFFFFF, 0xC9917C, 0x4A3A33],
                                                                                    [0, 0.6, 1])))
    star = K.Path()
    for i in range(10):
        r = 70 if i % 2 == 0 else 30
        a = -math.pi / 2 + i * math.pi / 5
        (star.move_to if i == 0 else star.line_to)(520 + r * math.cos(a), 95 + r * math.sin(a))
    star.close()
    c.draw_path(star, K.Paint(0xB0893B))
    # strokes: caps x joins
    y = 210
    for j, uj in enumerate(("butt", "round", "square")):
        for k, sb in enumerate(("miter", "round", "bevel")):
            p = K.Path().move_to(40 + k * 150, y + j * 70).line_to(90 + k * 150, y + 40 + j * 70).line_to(
                140 + k * 150, y + j * 70)
            c.draw_path(p, K.Paint(0x3E5A6A, style="stroke", width=12, cap=uj, join=sb))
    p = K.Path().move_to(500, 220).cubic_to(560, 150, 640, 330, 700, 240).quad_to(760, 200, 840, 260)
    c.draw_path(p, K.Paint(0x8C4A3F, style="stroke", width=5, cap="round", join="round"))
    c.draw_line(500, 300, 860, 330, K.Paint(0x141414))              # hairline
    c.draw_path(K.Path().rect(500, 340, 600, 400), K.Paint(0x2B2420, style="stroke", width=1))
    # clip + pathfinder
    a = K.Path().circle(120, 520, 70)
    b = K.Path().circle(180, 520, 70)
    c.draw_path(K.union(a, b), K.Paint(0x7FA3B5))
    c.draw_path(K.intersect(a, b), K.Paint(0x55788A))
    c.draw_path(K.subtract(K.Path().rect(280, 450, 420, 590), K.Path().circle(350, 520, 45)),
                   K.Paint(0xA6BE68))
    c.save()
    c.clip_path(K.Path().circle(520, 520, 70))
    c.draw_rect(440, 440, 600, 600, K.Paint(0xF2D3C2))
    c.draw_path(K.Path().rect(520, 430, 620, 610), K.Paint(0xC9917C))
    c.restore()
    # multiply layer + modulation
    lp = K.Paint(alpha=0.4, blend="multiply")
    c.save_layer(lp)
    c.draw_path(K.Path().oval(620, 430, 860, 520), K.Paint(0x5E7A86))
    c.draw_path(K.Path().oval(700, 470, 880, 600), K.Paint(0x5E7A86))
    c.restore()
    # matrix: rotate + scale + perspective
    c.save()
    c.translate(760, 140)
    c.rotate(25)
    c.scale(1.4, 0.8)
    c.draw_round_rect(-50, -30, 50, 30, 12, 12, K.Paint(0x6B5A4A))
    c.restore()
    img = K.Surface(64, 64)
    ic = img.canvas
    ic.clear(0xFFFFFF)
    for i in range(8):
        for j in range(8):
            if (i + j) % 2:
                ic.draw_rect(i * 8, j * 8, i * 8 + 8, j * 8 + 8, K.Paint(0x3B4A3A))
    M = K.Matrix.make_all(1.6, 0.4, 640, 0.0, 1.0, 610, 0.0, 0.004, 1.0)
    c.save()
    c.concat(M)
    c.draw_image(img.image(), 0, 0)
    c.draw_path(K.Path().move_to(0, 0).line_to(64, 64), K.Paint(0xFF0000, style="stroke", width=3, cap="round"))
    c.restore()
    # label text kept from the old test (old engine name) so the image stays byte-identical with old baselines
    c.draw_text("kuas %s: teks Inter 20" % K.MESIN, 30, 680, K.Font("Inter", 20), K.Paint(0x141414))
    # SVG
    c.save()
    c.translate(330, 600)
    c.scale(0.8)
    try:
        K.draw_svg(c, SVG, 120, 100)
    except ValueError as e:
        print("svg:", e)
    c.restore()
    s.save(out)
    return s


if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix="mgp-test-brush-")
    os.makedirs(o, exist_ok=True)
    t0 = time.time()
    out = os.path.join(o, "brush_%s.png" % K.ENGINE)
    scene(out)
    print("brush %s (SS %d): %.2f s -> %s" % (K.ENGINE, K.SS, time.time() - t0, out))
