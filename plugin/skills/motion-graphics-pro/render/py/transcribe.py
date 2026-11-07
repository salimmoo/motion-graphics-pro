"""transcribe - Python part of `mgp transcribe` (mgp, Motion Graphics Pro). Old module name: transkrip.py (thin shim kept).

  python transcribe.py <audio16k.wav> --model small [--lang id] [--device cpu] [--compute-type int8]

Uses faster-whisper (MIT) with per-word timing. Prints JSON to stdout:
  {"language": "id", "probability": 0.98, "duration": 12.3, "words": [{"text","start","end","p"}, ...]}
  (the old keys "bahasa", "peluang", "durasi", "kata" are printed too, with the same values)
The model is downloaded once from Hugging Face on first use (or give the path of a local model folder).
Old flags --bahasa, --perangkat, --hitung still work.
"""
import argparse
import json
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_py import T, env  # noqa: E402


def model_whisper(name):
    """Local faster-whisper folder from `mgp install voice` (env MGP_WHISPER_CACHE = Hugging Face cache),
    so nothing is downloaded again. Other names / explicit folders are returned as they are."""
    import glob
    c = env("MGP_WHISPER_CACHE")
    if c and not os.path.isdir(name):
        for d in sorted(glob.glob(os.path.join(c, f"models--Systran--faster-whisper-{name}", "snapshots", "*"))):
            if os.path.exists(os.path.join(d, "model.bin")):
                return d
    return name


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=T("mgp transcription (faster-whisper, word timing); one JSON line on stdout"))
    ap.add_argument("input")
    ap.add_argument("--model", default="small")
    ap.add_argument("--lang", "--bahasa", dest="lang")
    ap.add_argument("--device", "--perangkat", dest="device", default="cpu")
    ap.add_argument("--compute-type", "--hitung", dest="compute_type", default="int8", help=T("CTranslate2 compute type (int8, float16, ...)"))
    ap.add_argument("--prompt")
    ap.add_argument("--beam", type=int, default=5)
    a = ap.parse_args()

    from faster_whisper import WhisperModel

    t0 = time.time()
    model = WhisperModel(model_whisper(a.model), device=a.device, compute_type=a.compute_type)
    sys.stderr.write("  " + T("model {} ready ({} s)", a.model, f"{time.time() - t0:.1f}") + "\n")
    # mgp already converted the input to 16 kHz mono WAV; read it directly with numpy so the
    # faster-whisper PyAV decoder (often a mismatched version) is not used
    audio = a.input
    if a.input.lower().endswith(".wav"):
        import wave
        import numpy as np
        with wave.open(a.input, "rb") as w:
            if w.getsampwidth() == 2 and w.getnchannels() == 1 and w.getframerate() == 16000:
                audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    segs, info = model.transcribe(
        audio, language=a.lang or None, task="transcribe", word_timestamps=True,
        beam_size=a.beam, vad_filter=False, condition_on_previous_text=False,
        initial_prompt=a.prompt or None, temperature=0.0,
    )
    words = []
    for s in segs:
        for w in s.words or []:
            t = w.word.strip()
            if not t:
                continue
            words.append({"text": t, "start": round(float(w.start), 3), "end": round(float(w.end), 3), "p": round(float(w.probability), 3)})
    sys.stderr.write("  " + T("{} words, language {} ({}), {} s", len(words), info.language, f"{info.language_probability:.2f}", f"{time.time() - t0:.1f}") + "\n")
    r = {"language": info.language, "probability": round(info.language_probability, 3), "duration": round(info.duration, 3), "words": words}
    # old keys for older callers (src/transcript.mjs before the rename)
    r.update({"bahasa": r["language"], "peluang": r["probability"], "durasi": r["duration"], "kata": words})
    print(json.dumps(r, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
