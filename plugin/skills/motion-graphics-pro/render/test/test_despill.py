"""Test: key-colour despill of cutouts (P2_iklan_105: cup "magenta tint 3.76 %" was only reported, never removed).

    python -I motion-graphics-pro/render/test/test_despill.py [--real <magenta source.png>]
Needs numpy + Pillow (the image venv). --real: also key a real magenta source and compare the tint with/without despill.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(HERE, "..", "py")
sys.path.insert(0, PY)
import cutout as co  # noqa: E402


def subject(tint_rgb, inner_rgb=(150, 150, 150), size=200, tint_px=8, pink_core=False):
    """Opaque square on transparent; an edge band of tint_px tinted with the key colour, interior inner_rgb."""
    a = np.zeros((size, size, 4), np.uint8)
    a[40:160, 40:160, :3] = tint_rgb
    a[40 + tint_px:160 - tint_px, 40 + tint_px:160 - tint_px, :3] = inner_rgb
    if pink_core:
        a[90:110, 90:110, :3] = (230, 120, 220)   # a pink detail deep inside: must survive
    a[40:160, 40:160, 3] = 255
    return Image.fromarray(a, "RGBA")


def test_magenta_edge_removed_interior_kept():
    im = subject((190, 140, 190), pink_core=True)
    out, info = co.despill(im, "magenta", radius=10)
    x = np.asarray(out).astype(int)
    edge = x[45, 100, :3]
    assert min(edge[0], edge[2]) - edge[1] <= 1, edge          # no magenta excess left on the edge
    assert abs(int(edge.mean()) - int(np.mean((190, 140, 190)))) < 25   # brightness roughly kept (no dark rim)
    assert tuple(x[100, 100, :3]) == (230, 120, 220)              # interior colour untouched
    assert tuple(x[80, 80, :3]) == (150, 150, 150)
    assert info["tintBefore"] > info["tintAfter"]


def test_green_and_custom_key():
    out, _ = co.despill(subject((120, 200, 110)), "green", radius=10)
    p = np.asarray(out)[45, 100, :3].astype(int)
    assert p[1] - max(p[0], p[2]) <= 1, p
    out, info = co.despill(subject((100, 190, 200)), "#00e0ff", radius=10)   # cyan screen: G and B dominant
    p = np.asarray(out)[45, 100, :3].astype(int)
    assert min(p[1], p[2]) - p[0] <= 1, p
    assert info["key"] == "#00e0ff"


def test_grey_key_is_no_op_and_transparent_untouched():
    im = subject((190, 140, 190))
    out, info = co.despill(im, "#808080")
    assert np.array_equal(np.asarray(out), np.asarray(im))
    out, _ = co.despill(im, "magenta")
    assert (np.asarray(out)[0:30, 0:30] == 0).all()


def test_bad_key_colour():
    try:
        co.parse_key_color("purple-ish")
    except ValueError:
        return
    raise AssertionError("expected ValueError")


def _magenta_source(size=256):
    """Synthetic magenta-background shot: grey disc with a pinkish rim from the bounced background."""
    yy, xx = np.mgrid[:size, :size]
    d = np.hypot(yy - size / 2, xx - size / 2)
    a = np.zeros((size, size, 3), np.float32)
    a[:] = (255, 0, 255)
    disc = d < size * 0.35
    a[disc] = (160, 160, 160)
    rim = disc & (d > size * 0.35 - 8)
    a[rim] = (200, 140, 200)
    return Image.fromarray(a.astype(np.uint8), "RGB")


def test_cli_default_on_and_no_despill():
    d = tempfile.mkdtemp(prefix="mgp-despill-")
    src = os.path.join(d, "src.png")
    _magenta_source().save(src)
    on, off = os.path.join(d, "on.png"), os.path.join(d, "off.png")
    run = lambda *a: subprocess.run([sys.executable, "-I", os.path.join(PY, "cutout.py"), *a], check=True, capture_output=True, text=True)
    run("magenta", src, on, "--clean")
    run("magenta", src, off, "--clean", "--no-despill")
    t_on, t_off = co.tint_percent(Image.open(on)), co.tint_percent(Image.open(off))
    assert t_off > 2.0 and t_on < t_off / 2, (t_on, t_off)
    # despill mode on an existing cutout = same as default-on
    again = os.path.join(d, "again.png")
    run("despill", off, again, "--key-color", "magenta")
    assert co.tint_percent(Image.open(again)) < t_off / 2


def real(path):
    d = tempfile.mkdtemp(prefix="mgp-despill-real-")
    on, off = os.path.join(d, "on.png"), os.path.join(d, "off.png")
    for o, extra in ((on, []), (off, ["--no-despill"])):
        subprocess.run([sys.executable, "-I", os.path.join(PY, "cutout.py"), "magenta", path, o, "--clean", *extra], check=True, capture_output=True)
    print(f"real {os.path.basename(path)}: tint {co.tint_percent(Image.open(off))}% -> {co.tint_percent(Image.open(on))}%  ({d})")


if __name__ == "__main__":
    n = 0
    for k, f in sorted(globals().items()):
        if k.startswith("test_") and callable(f):
            f()
            n += 1
            print("ok  ", k)
    print(f"{n} tests passed")
    if "--real" in sys.argv:
        for p in sys.argv[sys.argv.index("--real") + 1:]:
            real(p)
