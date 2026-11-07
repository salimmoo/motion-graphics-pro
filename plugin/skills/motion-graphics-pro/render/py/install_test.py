"""install_test - smoke test at the end of `mgp install` (mgp, Motion Graphics Pro). Old module name: pasang_uji.py (thin shim kept).

  python install_test.py voice --out voice_test.wav [--sentence "..."] [--lang id]
  python install_test.py module --target voice|image|cutout
  python install_test.py cutout --out cutout_test.png [--model u2net]

voice  : one short sentence with the BUILT-IN Chatterbox voice (conds.pt from the model, nobody's private profile),
         through the device manager (shared GPU lock, CPU fallback on OOM). The model is read from MGP_CHATTERBOX_DIR.
module : quick check of the installed modules + torch version (no heavy imports).
cutout : rembg (U2-Net, onnxruntime CPU) on a generated test picture; the model is read from REMBG_HOME (never downloaded here).
The image test uses `image_engine.py make` directly (512 px).
Result: one JSON line on stdout (the last line); progress messages on stderr.
Old subcommands (suara, modul), flags (--keluar, --kalimat, --bahasa) and targets (suara, gambar) still work.
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_py import T  # noqa: E402

MODULES = {
    "voice": ["torch", "torchaudio", "chatterbox", "faster_whisper", "resemblyzer", "librosa", "soundfile", "webrtcvad"],
    "image": ["torch", "diffusers", "transformers", "gguf", "accelerate", "huggingface_hub", "PIL", "numpy"],
    "cutout": ["rembg", "onnxruntime", "pymatting", "PIL", "numpy"],
}
_TARGETS = {"voice": "voice", "image": "image", "cutout": "cutout", "suara": "voice", "gambar": "image", "potong": "cutout"}
# default smoke-test sentence per language (spoken text, so it follows --lang, not the message language)
SENTENCE = {"id": "Halo, ini uji suara mgp. Pemasangan berhasil.", "en": "Hello, this is the mgp voice test. The install worked."}


def module(target):
    import importlib.metadata as md
    import importlib.util as iu
    target = _TARGETS.get(target, target)
    r = {"python": sys.version.split()[0], "exe": sys.executable, "target": target, "modules": {}}
    for m in MODULES[target]:
        try:
            r["modules"][m] = iu.find_spec(m) is not None
        except Exception:
            r["modules"][m] = False
    try:
        r["torch"] = md.version("torch")
    except Exception:
        r["torch"] = None
    for pkg in ("chatterbox-tts", "diffusers", "transformers", "rembg", "onnxruntime"):
        try:
            r[pkg] = md.version(pkg)
        except Exception:
            pass
    return r


def voice(a):
    import device as pk
    import voice_engine as sm
    t_all = time.time()
    sentence = a.sentence or SENTENCE["en" if a.lang == "en" else "id"]

    def work(k):
        sm._K = k
        m = sm.chatterbox()
        if getattr(m, "conds", None) is None:
            raise SystemExit(T("the model did not load conds.pt (built-in voice); the chatterbox download is incomplete"))
        t0 = time.time()
        import torch
        torch.manual_seed(1)
        lang = "ms" if a.lang in ("id", "ms") else a.lang
        wav = m.generate(sentence, language_id=lang)
        x = wav.squeeze(0).numpy()
        return x, m.sr, time.time() - t0

    def drop():
        sm._cb = None

    (x, sr, secs), k = pk.run("install test voice", work, on_fallback=drop, task="chatterbox")
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    sm.save_audio(a.out, x, sr)
    duration = len(x) / sr
    print(json.dumps({"file": os.path.abspath(a.out), "device": k.dict(), "audioSeconds": round(duration, 2),
                      "synthSeconds": round(secs, 1), "rtf": round(secs / max(duration, 0.01), 2),
                      "seconds": round(time.time() - t_all, 1)}, ensure_ascii=False))


def cutout_test(a):
    """rembg on a generated picture (dark-red disc + small square on a light grey wall): alpha must separate them."""
    import numpy as np
    from PIL import Image, ImageDraw
    import cutout as co
    home = os.environ.get("REMBG_HOME") or os.environ.get("U2NET_HOME")
    mf = os.path.join(home or os.path.expanduser("~/.rembg"), "models", a.model, a.model + ".onnx")
    legacy = os.path.join(home or os.path.expanduser("~/.u2net"), a.model + ".onnx")
    if not (os.path.isfile(mf) or os.path.isfile(legacy)):
        raise SystemExit(T("the {} model is not installed ({}); the test does not download silently: mgp install cutout", a.model, mf))
    t0 = time.time()
    im = Image.new("RGB", (320, 320), (214, 214, 210))
    d = ImageDraw.Draw(im)
    d.ellipse((90, 70, 230, 210), fill=(170, 40, 35))
    d.rectangle((140, 200, 180, 280), fill=(60, 60, 70))
    out = co.cutout(im, a.model)
    al = np.asarray(out)[..., 3]
    inside, corner = float(al[140, 160]), float(al[10:40, 10:40].mean())
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    out.save(a.out)
    ok = inside > 200 and corner < 40
    print(json.dumps({"file": os.path.abspath(a.out), "ok": ok, "alphaInside": round(inside, 1), "alphaCorner": round(corner, 1),
                      "model": a.model, "modelFile": mf if os.path.isfile(mf) else legacy, "seconds": round(time.time() - t0, 1),
                      "device": {"device": "cpu"}}, ensure_ascii=False))
    if not ok:
        raise SystemExit(T("cutout test: the subject was not separated (alpha inside {}, corner {})", round(inside), round(corner)))


# old names (pasang_uji.py), kept as aliases
MODUL = MODULES
modul = module
suara = voice


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=T("mgp install smoke test"))
    sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("voice", aliases=["suara"], help=T("one sentence with the built-in Chatterbox voice"))
    s.add_argument("--out", "--keluar", dest="out", required=True)
    s.add_argument("--sentence", "--kalimat", dest="sentence", help=T("text to speak (default: a short test sentence in --lang)"))
    s.add_argument("--lang", "--bahasa", dest="lang", default="id")
    m = sp.add_parser("module", aliases=["modul"], help=T("installed modules + torch version"))
    m.add_argument("--target", choices=list(_TARGETS), required=True)
    c = sp.add_parser("cutout", help=T("rembg U2-Net on a generated test picture"))
    c.add_argument("--out", required=True)
    c.add_argument("--model", default="u2net")
    a = ap.parse_args()
    if a.cmd in ("module", "modul"):
        print(json.dumps(module(a.target), ensure_ascii=False))
    elif a.cmd == "cutout":
        cutout_test(a)
    else:
        voice(a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
