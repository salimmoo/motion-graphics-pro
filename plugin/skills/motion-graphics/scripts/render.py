"""render - render frames (sub-frame motion blur), run ranges in parallel, encode MP4, contact sheet.

The frame function lives in the project module: fn(t) -> brush.Surface, brush.Image, skia.Surface/skia.Image, or an
RGBA array (H x W x 4, uint8), t in seconds. Images are saved/read with Pillow; skia-python is optional (brush uses it
when present).

Usage:
  python3 render.py frames module:function outdir start end [--fps 24] [--sub 4] [--shutter 0.5]
      -> outdir/f0000.png ... frames [start, end). Motion blur: average of sub-frames inside the shutter (0.5 frame =
         180 degrees). sub: walk/jump 4, martial arts 3, wave 2, idle 1; animatic 1.
  python3 render.py parallel module:function outdir N_FRAMES [--jobs 2] [--fps ..] [--sub ..]
      -> splits the range over several processes (2-core workspace: --jobs 2), one log per process in outdir/log_k.txt
  python3 render.py encode outdir out.mp4 [--fps 24] [--crf 18]
      -> H.264 CRF 18, preset veryfast, yuv420p, +faststart
  python3 render.py hstack out.mp4 dirA "Label A" dirB "Label B" ... [--w 540] [--h 960] [--loop 0]
      -> labelled side-by-side clips (style comparison)
  python3 render.py sheet outdir out.png [--cols 5] [--step 24] [--scale 0.3]
      -> contact sheet of every step-th frame, labelled with frame number and time
Rules: fixed grain seed for video; re-render only the frame ranges that changed; time each stage before optimising
(the Python profiler does not count time inside skia; pure brush engine: MGP_BRUSH_ENGINE=pure,
MGP_BRUSH_SUPERSAMPLE).
"""
import argparse
import importlib
import os
import subprocess
import sys
import time

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brush  # noqa: E402


_DOC_ID = """render - render frame (motion blur sub-frame), jalankan paralel per rentang, encode MP4, lembar kontak.

Fungsi frame ditulis di modul proyek: fn(t) -> brush.Surface, brush.Image, skia.Surface/skia.Image, atau array RGBA
(H x W x 4, uint8), t dalam detik. Gambar disimpan/dibaca dengan Pillow; skia-python opsional (dipakai brush bila ada).

Pakai:
  python3 render.py frames modul:fungsi outdir mulai akhir [--fps 24] [--sub 4] [--shutter 0.5]
      -> outdir/f0000.png ... frame [mulai, akhir). Motion blur: rata-rata sub-frame di dalam shutter (0.5 frame =
         180 derajat). sub: jalan/lompat 4, silat 3, dadah 2, diam 1; animatic 1.
  python3 render.py parallel modul:fungsi outdir N_FRAME [--jobs 2] [--fps ..] [--sub ..]
      -> bagi rentang ke beberapa proses (workspace 2 core: --jobs 2), log per proses di outdir/log_k.txt
  python3 render.py encode outdir out.mp4 [--fps 24] [--crf 18]
      -> H.264 CRF 18, preset veryfast, yuv420p, +faststart
  python3 render.py hstack out.mp4 dirA "Label A" dirB "Label B" ... [--w 540] [--h 960] [--loop 0]
      -> klip berdampingan berlabel (pembanding gaya)
  python3 render.py sheet outdir out.png [--cols 5] [--step 24] [--scale 0.3]
      -> lembar kontak frame tiap step, berlabel nomor frame dan waktu
Aturan: grain seed tetap untuk video; render ulang hanya rentang frame yang berubah; ukur waktu per tahap dulu sebelum
optimasi (profiler Python tidak menghitung waktu di dalam skia; mesin murni brush: MGP_BRUSH_ENGINE=pure, MGP_BRUSH_SUPERSAMPLE).
"""


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


def load(spec):
    sys.path.insert(0, ".")
    mod, fn = spec.split(":")
    return getattr(importlib.import_module(mod), fn)


def _arr(x):
    if isinstance(x, (brush.Surface, brush.Image)):
        return x.array()
    sk = brush.skia
    if sk is not None and isinstance(x, sk.Surface):
        return x.makeImageSnapshot().toarray(colorType=sk.kRGBA_8888_ColorType)
    if sk is not None and isinstance(x, sk.Image):
        return x.toarray(colorType=sk.kRGBA_8888_ColorType)
    return np.asarray(x)


def blur_frame(fn, i, fps=24, sub=4, shutter=0.5):
    """Rata-rata sub sampel waktu t = (i + shutter * j / sub) / fps, j = 0..sub-1. Kembalikan array RGBA uint8."""
    acc = None
    for j in range(sub):
        a = _arr(fn((i + shutter * j / sub) / fps)).astype(np.float32)
        acc = a if acc is None else acc + a
    return (acc / sub + 0.5).astype(np.uint8)


def save_rgba(a, path):
    a = np.ascontiguousarray(a)
    Image.fromarray(a, "RGBA" if a.ndim == 3 and a.shape[2] == 4 else None).save(path)


def frames(spec, outdir, a, b, fps=24, sub=4, shutter=0.5):
    fn = load(spec)
    os.makedirs(outdir, exist_ok=True)
    t0 = time.time()
    for i in range(a, b):
        save_rgba(blur_frame(fn, i, fps, sub, shutter), os.path.join(outdir, "f%04d.png" % i))
    n = max(b - a, 1)
    print(_T("frames %d-%d done, %.2f s/frame", "frame %d-%d selesai, %.2f s/frame") % (a, b - 1, (time.time() - t0) / n))


def parallel(spec, outdir, n, jobs=2, fps=24, sub=4, shutter=0.5):
    os.makedirs(outdir, exist_ok=True)
    cuts = [round(n * k / jobs) for k in range(jobs + 1)]
    procs = []
    for k in range(jobs):
        log = open(os.path.join(outdir, "log_%d.txt" % k), "w")
        cmd = [sys.executable, os.path.abspath(__file__), "frames", spec, outdir, str(cuts[k]), str(cuts[k + 1]),
               "--fps", str(fps), "--sub", str(sub), "--shutter", str(shutter)]
        procs.append(subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT))
    codes = [p.wait() for p in procs]
    print(_T("done, exit codes:", "selesai, kode keluar:"), codes)


def encode(outdir, out, fps=24, crf=18):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(outdir, "f%04d.png"),
                    "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", out], check=True)
    print(out)


def hstack(out, pairs, w=540, h=960, loop=0, fps=24, crf=18):
    """pairs = [(folder, label)]. Label ditulis di atas tiap klip."""
    args, fl = ["ffmpeg", "-y", "-loglevel", "error"], []
    for k, (d, _) in enumerate(pairs):
        args += ["-framerate", str(fps), "-stream_loop", str(loop), "-i", os.path.join(d, "f%04d.png")]
        fl.append("[%d:v]scale=%d:%d[v%d]" % (k, w, h, k))
    n = len(pairs)
    pad_w, top = n * w + (n + 1) * 10, 40
    chain = "".join("[v%d]" % k for k in range(n)) + "hstack=inputs=%d" % n if n > 1 else "[v0]null"
    chain += ",pad=%d:%d:10:%d:color=0xFAFAF8" % (pad_w, h + top + 10, top)
    for k, (_, lab) in enumerate(pairs):
        chain += ",drawtext=text='%s':x=%d:y=10:fontsize=20:fontcolor=0x141414" % (lab.replace("'", ""), 14 + k * (w + 10))
    filt = ";".join(fl) + ";" + chain + "[v]"
    args += ["-filter_complex", filt, "-map", "[v]", "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast",
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    subprocess.run(args, check=True)
    print(out)


def sheet(outdir, out, cols=5, step=24, scale=0.3, fps=24):
    names = sorted(f for f in os.listdir(outdir) if f.startswith("f") and f.endswith(".png"))[::step]
    if not names:
        raise SystemExit(_T("no f*.png frames", "tidak ada frame f*.png"))
    im0 = brush.Image.open(os.path.join(outdir, names[0]))
    w, h = int(im0.width * scale), int(im0.height * scale)
    rows = (len(names) + cols - 1) // cols
    fs = max(10, min(18, w // 7))                     # ukuran label mengikuti lebar sel
    gap, lab = 10, 2 * fs + 10
    s = brush.Surface(cols * (w + gap) + gap, rows * (h + lab + gap) + gap)
    c = s.canvas
    c.clear(0xFAFAF8)
    font = brush.Font("Inter", fs)
    ink = brush.Paint(0x141414)
    for k, nm in enumerate(names):
        x, y = gap + (k % cols) * (w + gap), gap + (k // cols) * (h + lab + gap)
        img = brush.Image.open(os.path.join(outdir, nm))
        c.draw_image_rect(img, (x, y + lab, x + w, y + lab + h))
        i = int(nm[1:5])
        c.draw_text("f%04d" % i, x, y + fs, font, ink)
        c.draw_text("t %.2f s" % (i / fps), x, y + 2 * fs + 4, font, ink)
    s.save(out)
    print(out)


def main():
    ap = argparse.ArgumentParser(description=_T(__doc__, _DOC_ID), formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["frames", "parallel", "encode", "hstack", "sheet"])
    ap.add_argument("args", nargs="+")
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--sub", type=int, default=4)
    ap.add_argument("--shutter", type=float, default=0.5)
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--w", type=int, default=540)
    ap.add_argument("--h", type=int, default=960)
    ap.add_argument("--loop", type=int, default=0)
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--step", type=int, default=24)
    ap.add_argument("--scale", type=float, default=0.3)
    a = ap.parse_args()
    A = a.args
    if a.cmd == "frames":
        frames(A[0], A[1], int(A[2]), int(A[3]), a.fps, a.sub, a.shutter)
    elif a.cmd == "parallel":
        parallel(A[0], A[1], int(A[2]), a.jobs, a.fps, a.sub, a.shutter)
    elif a.cmd == "encode":
        encode(A[0], A[1], a.fps, a.crf)
    elif a.cmd == "hstack":
        hstack(A[0], list(zip(A[1::2], A[2::2])), a.w, a.h, a.loop, a.fps, a.crf)
    else:
        sheet(A[0], A[1], a.cols, a.step, a.scale, a.fps)


if __name__ == "__main__":
    main()
