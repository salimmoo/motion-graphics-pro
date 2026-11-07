"""Test: `mgp voice speak --sentence N --tries K` keeps the current take unless a new candidate scores better (P1-3, P_iklan_90).

    python -I motion-graphics-pro/render/test/test_voice_keep.py
No model is loaded: faster-whisper is replaced by a fake that "hears" a fixed transcript per file.
"""
import os
import sys
import tempfile
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "py"))
import voice_engine as ve  # noqa: E402


def tone(path, secs, sr=24000):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"\x00\x01" * int(secs * sr))


def run(heard, current=True):
    """heard: {name: transcript}; candidate files c0, c1 (new) and cur (current take). -> (r, chosen name)."""
    d = tempfile.mkdtemp(prefix="mgp-keep-")
    parts_dir = tempfile.mkdtemp(prefix="mgp-keep-parts-")   # the current take lives in <vo>.parts/, not in the work folder
    files = {}
    for n in heard:
        files[n] = os.path.join(parts_dir if n == "cur" else d, n + ".wav")
        tone(files[n], 1.6)
    b = {"text": "Unduh ZIP-nya sekarang", "spoken": "Unduh zip nya sekarang", "seed": 5}
    if current:
        b["current"] = {"file": files["cur"], "seed": 4, "eos": 0}
    cl = [{"seed": 5 + 101 * j, "duration": 1.6, "file": files[n], "eos": 0} for j, n in enumerate(x for x in heard if x != "cur")]
    cur = ve._current_take(b)
    if cur:
        cl.append(cur)
    r = {"files": [cl[0]["file"]], "eos": [0], "candidates": [{"expected": 1.5, "candidates": cl}]}
    by_file = {files[n]: t for n, t in heard.items()}
    ve._whisper = lambda model="small", gpu=False: object()
    ve._listen = lambda wm, path, lang, words=False: (by_file[path], None)
    r = ve.score_candidates(r, [b], "id", {"pronunciations": [{"word": "ZIP-nya", "spoken": "zip nya"}]})
    c = r["candidates"][0]
    name = [n for n, f in files.items() if f == c["candidates"][c["pick"]]["file"]][0]
    assert os.path.dirname(r["files"][0]) == d, "the picked copy must go to the work folder, never into <vo>.parts/"
    assert os.listdir(parts_dir) == (["cur.wav"] if current else []), os.listdir(parts_dir)
    return r, name


def test_current_kept_when_new_are_worse():
    r, name = run({"c0": "unduh zitnya sekarang", "c1": "undu zipnya sekara", "cur": "unduh zip nya sekarang"})
    c = r["candidates"][0]
    assert name == "cur", name
    assert c["keptCurrent"] is True
    assert c["currentScore"] <= c["bestNewScore"]


def test_replaced_when_new_is_better():
    r, name = run({"c0": "unduh zip nya sekarang", "c1": "undu zitnya", "cur": "undo zitnya sekarang"})
    c = r["candidates"][0]
    assert name == "c0", name
    assert c["keptCurrent"] is False
    assert c["bestNewScore"] < c["currentScore"]


def test_tie_keeps_current():
    r, name = run({"c0": "unduh zip nya sekarang", "cur": "unduh zip nya sekarang"})
    assert name == "cur", name


def test_without_current_old_behaviour():
    r, name = run({"c0": "unduh zitnya", "c1": "unduh zip nya sekarang"}, current=False)
    c = r["candidates"][0]
    assert name == "c1", name
    assert "keptCurrent" not in c


def test_missing_current_file_is_ignored():
    assert ve._current_take({"current": {"file": os.path.join(tempfile.gettempdir(), "does-not-exist-mgp.wav")}}) is None
    assert ve._current_take({}) is None


if __name__ == "__main__":
    n = 0
    for k, f in sorted(globals().items()):
        if k.startswith("test_") and callable(f):
            f()
            n += 1
            print("ok  ", k)
    print(f"{n} tests passed")
