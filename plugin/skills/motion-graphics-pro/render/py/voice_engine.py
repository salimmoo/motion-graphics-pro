"""voice_engine - Python part of `mgp voice` (mgp, Motion Graphics Pro). Old module name: suara_mesin.py (thin shim kept).

  python voice_engine.py check
  python voice_engine.py clone --engine chatterbox|openvoice --ref reference.wav --folder <profile>
  python voice_engine.py speak --engine chatterbox|openvoice --folder <profile> --sentences sentences.json --out <dir>
                               [--lang id|en] [--seed 1] [--tries N --normal normal.json]
        sentences.json: [{"text", "spoken", "seed"?, "exaggeration", "cfg", "temperature"}]; seed per piece (default seed + i)
        --tries N: N candidates per piece, scored by ASR (normalised WER, text_score.py) + plausible duration; the best is used
  python voice_engine.py score --audio vo.wav [--ref reference.wav] [--compare other.wav] [--script script.txt] [--lang id]
                               [--normal normal.json] [--words vo.words.json]   raw + normalised WER/CER, CHECK BY EAR
Old subcommands (cek, klon, ucap, nilai) and flags (--mesin, --kalimat, --keluar, --bahasa, --banding, --naskah, --coba, --kata)
still work; old input keys (teks, ucap, lafal) are read too.

Engines:
  chatterbox  Chatterbox Multilingual (Resemble AI, MIT). Indonesian is read with the Malay code "ms".
              Output carries the inaudible Perth watermark (Resemble AI, MIT), built into the model.
  openvoice   sentences from Chatterbox, then the voice colour is replaced with OpenVoice V2 ToneColorConverter (MyShell, MIT).
Every result is one JSON line on stdout (the last line); progress messages go to stderr.
"""
import argparse
import json
import math
import os
import sys
import time

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("TQDM_DISABLE", "1")   # Chatterbox "Sampling" bars flood the log (thousands of lines)
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
import warnings  # noqa: E402
warnings.filterwarnings("ignore", category=FutureWarning)


# shared device manager (py/device.py); scripts run with `python -I`, so the folder is added by hand
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import device as pk  # noqa: E402
import text_score as tn  # noqa: E402
from i18n_py import T, env, rename_kwargs  # noqa: E402

_K = None  # device Decision of the running command (set through pk.run)


def torch_device():
    """PyTorch device for this command: result of the device manager (VRAM, GPU lock, OOM fallback).
    Outside a command (e.g. `check`): GPU (cuda/mps) when present, unless forced with MGP_DEVICE=cpu|cuda|mps."""
    if _K is not None:
        if _K.torch == "cuda" and not _torch_cuda():
            return "cpu"  # e.g. `score`: GPU chosen for faster-whisper, but PyTorch is a CPU build
        return _K.torch
    d = (env("MGP_DEVICE", "") or "").strip().lower()
    if d and d != "auto":
        return "cuda" if d.startswith("cuda") else d
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def _torch_cuda():
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


def log(s):
    sys.stderr.write(s + "\n")
    sys.stderr.flush()


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def prepare_torch():
    import torch
    n = os.cpu_count() or 4
    torch.set_num_threads(max(1, min(n, 16)))
    return torch


# ------------------------------------------------------------------ audio util

def load_audio(path, sr):
    import librosa
    x, _ = librosa.load(path, sr=sr, mono=True)
    return x


def save_audio(path, x, sr):
    import numpy as np
    import soundfile as sf
    sf.write(path, np.clip(x, -1, 1).astype("float32"), sr, subtype="PCM_16")


def energy_db(x, sr, win=0.02):
    import numpy as np
    n = int(sr * win)
    m = len(x) // n
    if m == 0:
        return np.array([-120.0]), n
    f = x[: m * n].reshape(m, n)
    return 10 * np.log10((f ** 2).mean(axis=1) + 1e-12), n


@rename_kwargs({"sisa": "pad", "ambang": "threshold"})
def trim_silence(x, sr, pad=0.04, threshold=-40):
    """Remove silence at the start/end (relative to the energy peak)."""
    import numpy as np
    db, n = energy_db(x, sr)
    if len(db) < 3:
        return x
    limit = max(db.max() + threshold, np.percentile(db, 10) + 6)
    idx = np.where(db > limit)[0]
    if not len(idx):
        return x
    a = max(0, idx[0] * n - int(pad * sr))
    b = min(len(x), (idx[-1] + 1) * n + int(pad * 2 * sr))
    y = x[a:b].copy()
    # 8 ms fade so the joins do not click
    k = min(len(y) // 2, int(0.008 * sr))
    if k > 0:
        y[:k] *= np.linspace(0, 1, k)
        y[-k:] *= np.linspace(1, 0, k)
    return y


@rename_kwargs({"panjang": "length", "lewati": "skip"})
def reference_windows(x, sr, length=10.0, skip=3.0):
    """Reference window for the model prompt: starts at the first pause after `skip` seconds
    (skipping the consent sentence when possible), then `length` seconds long."""
    import numpy as np
    db, n = energy_db(x, sr)
    floor = np.percentile(db, 10)
    quiet = db < floor + 8
    start = 0
    if len(x) / sr > length + skip + 1:
        i0 = int(skip / 0.02)
        for i in range(i0, len(quiet) - 10):
            if quiet[i:i + 10].all():  # pause >= 0.2 s
                start = (i + 5) * n
                break
        if len(x) - start < length * sr:
            start = max(0, len(x) - int(length * sr))
    return x[start:start + int(length * sr)], start / sr


# ------------------------------------------------------------------ input files (old keys accepted)

def _sentences(parts):
    """sentences.json entries with the new keys (old: teks -> text, ucap -> spoken)."""
    out = []
    for b in parts:
        b = dict(b)
        if "spoken" not in b and "ucap" in b:
            b["spoken"] = b["ucap"]
        if "text" not in b and "teks" in b:
            b["text"] = b["teks"]
        out.append(b)
    return out


def _pronunciations(cfg):
    cfg = cfg or {}
    v = cfg.get("pronunciations")
    return cfg.get("lafal") if v is None else v


# ------------------------------------------------------------------ Chatterbox

_cb = None


def chatterbox():
    global _cb, _eos
    if _eos is None:
        _eos = _EosCatcher()         # before the import: chatterbox logger warnings are caught/silenced too
    if _cb is None:
        prepare_torch()
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        t0 = time.time()
        local = env("MGP_CHATTERBOX_DIR")
        if local:
            log("  " + T("loading Chatterbox Multilingual from {}...", local))
            _cb = ChatterboxMultilingualTTS.from_local(local, device=torch_device())
        else:
            log("  " + T("loading Chatterbox Multilingual (the first time downloads ~3.2 GB from Hugging Face)..."))
            _cb = ChatterboxMultilingualTTS.from_pretrained(device=torch_device())
        log("  " + T("model ready ({} s)", f"{time.time() - t0:.1f}"))
    return _cb


def clone_chatterbox(ref, folder):
    import numpy as np
    import torch
    from chatterbox.mtl_tts import Conditionals, S3GEN_SR, S3_SR
    from chatterbox.models.t3.modules.cond_enc import T3Cond
    import librosa
    m = chatterbox()
    x = load_audio(ref, S3GEN_SR)
    win, start = reference_windows(x, S3GEN_SR, 10.0)
    tmp = os.path.join(folder, "_window.wav")
    save_audio(tmp, win, S3GEN_SR)
    m.prepare_conditionals(tmp, exaggeration=0.5)
    os.remove(tmp)
    # speaker embedding from the WHOLE reference (more stable than the 10 s window)
    x16 = librosa.resample(x, orig_sr=S3GEN_SR, target_sr=S3_SR)
    ve = torch.from_numpy(m.ve.embeds_from_wavs([x16], sample_rate=S3_SR)).mean(axis=0, keepdim=True)
    c = m.conds.t3
    m.conds.t3 = T3Cond(speaker_emb=ve, cond_prompt_speech_tokens=c.cond_prompt_speech_tokens, emotion_adv=c.emotion_adv)
    f = os.path.join(folder, "chatterbox_conds.pt")
    m.conds.save(f)
    return {"file": "chatterbox_conds.pt", "windowStart": round(start, 2), "windowSeconds": round(len(win) / S3GEN_SR, 2)}


class _EosCatcher:
    """Catch the Chatterbox "forcing EOS token" warnings. Only those with a repetition count
    (token_repetition / alignment_repetition = mumbling or doubled words); long_tail alone = an ordinary silent tail."""

    def __init__(self):
        import logging
        self.n = 0
        outer = self

        class H(logging.Handler):
            def emit(self, rec):
                try:
                    m = rec.getMessage()
                    if "forcing EOS" in m and ("token_repetition=True" in m or "alignment_repetition=tensor(True)" in m
                                               or "alignment_repetition=True" in m):
                        outer.n += 1
                except Exception:
                    pass
        lg = logging.getLogger("chatterbox")
        lg.addHandler(H(level=logging.WARNING))
        lg.propagate = False                      # raw WARNING lines do not flood the mgp log
        if lg.level == logging.NOTSET or lg.level > logging.WARNING:
            lg.setLevel(logging.WARNING)

    def take(self):
        n, self.n = self.n, 0
        return n

    ambil = take


_eos = None


def _generate(m, b, lang, seed):
    import torch
    torch.manual_seed(seed)
    wav = m.generate(b["spoken"], language_id=lang, exaggeration=b.get("exaggeration", 0.5), cfg_weight=b.get("cfg", 0.5),
                     temperature=b.get("temperature", 0.8))
    x = trim_silence(wav.squeeze(0).numpy(), m.sr)
    return x, len(x) / m.sr


def _current_take(b):
    """sentences.json "current": {"file", "seed", "eos"} = the take already in <vo>.parts/ (mgp voice speak --sentence N --tries K,
    without --force). Returned as an extra candidate marked current=True, or None when there is none / the file is missing."""
    c = b.get("current")
    if not isinstance(c, dict) or not c.get("file") or not os.path.isfile(c["file"]):
        return None
    import soundfile as sf
    info = sf.info(c["file"])
    return {"seed": c.get("seed"), "duration": round(info.frames / float(info.samplerate), 2), "file": c["file"],
            "eos": int(c.get("eos") or 0), "current": True}


def pick_best(cands, dev=None):
    """Index of the best candidate: lowest score; on a tie the current take wins (no needless replacement), then the
    duration closest to the median. A current take is only replaced by a strictly better new candidate."""
    dev = dev or [0.0] * len(cands)
    return min(range(len(cands)), key=lambda j: (cands[j]["score"], 0 if cands[j].get("current") else 1, dev[j]))


@rename_kwargs({"bagian": "parts", "keluar_dir": "out_dir", "bahasa": "lang", "coba": "tries"})
def speak_chatterbox(folder, parts, out_dir, lang, seed, tries=1):
    global _eos
    from chatterbox.mtl_tts import Conditionals
    parts = _sentences(parts)
    m = chatterbox()
    if _eos is None:
        _eos = _EosCatcher()
    m.conds = Conditionals.load(os.path.join(folder, "chatterbox_conds.pt"), map_location="cpu").to(m.device)
    code = "ms" if lang in ("id", "ms") else lang
    files, total_audio, t0 = [], 0.0, time.time()
    retries_total, all_candidates, eos = 0, [], []
    for i, b in enumerate(parts):
        t1 = time.time()
        s0 = int(b.get("seed", seed + i))
        # plausible duration ~0.065 s per letter; output much longer (mumbling/repeating) or much
        # shorter (missing words) is retried with another seed, at most 2 times; the most plausible one is used
        expected = max(0.6, 0.065 * len(b["spoken"]))
        if tries > 1:
            # N candidates with seed s0, s0 + 101, ...; picked afterwards by ASR (score_candidates)
            cl = []
            for c in range(tries):
                sd = s0 + 101 * c
                x, d = _generate(m, b, code, sd)
                f = os.path.join(out_dir, f"s{i:03d}_c{c}.wav")
                save_audio(f, x, m.sr)
                cl.append({"seed": sd, "duration": round(d, 2), "file": f, "eos": _eos.take()})
                total_audio += d
                log(f"  [{i + 1}/{len(parts)}] " + T("candidate {}/{} seed {}: {} s", c + 1, tries, sd, f"{d:.1f}")
                    + (" " + T("(token repetition, EOS forced)") if cl[-1]["eos"] else ""))
            cur = _current_take(b)
            if cur:
                cl.append(cur)   # the existing take competes too: it is only replaced by a better new candidate
            all_candidates.append({"expected": round(expected, 2), "candidates": cl})
            files.append(cl[0]["file"])
            eos.append(cl[0]["eos"])
            continue
        cand = []
        for k in range(3):
            sd = s0 + 1000 * k
            x, d = _generate(m, b, code, sd)
            cand.append((abs(math.log(max(d, 0.05) / expected)), x, d, sd, _eos.take()))
            if 0.45 * expected <= d <= 2.0 * expected + 0.8:
                break
            retries_total += 1
            log(f"  [{i + 1}] " + T("duration {} s is implausible (expected ~{} s), retrying with another seed", f"{d:.1f}", f"{expected:.1f}"))
        _, x, d, sd, ne = min(cand, key=lambda c: c[0])
        f = os.path.join(out_dir, f"s{i:03d}.wav")
        save_audio(f, x, m.sr)
        total_audio += d
        log(f"  [{i + 1}/{len(parts)}] " + T("{} s audio in {} s: {}", f"{d:.1f}", f"{time.time() - t1:.1f}", b["spoken"][:60])
            + (" | " + T("WARN: token repetition, EOS forced (possible mumble/doubled word/cut last word)") if ne else ""))
        files.append(f)
        eos.append(ne)
        all_candidates.append({"seedUsed": sd})
    secs = time.time() - t0
    if total_audio > 0:
        pk.record_measurement(f"voice:chatterbox:{torch_device()}", {"rtf": round(secs / total_audio, 3), "audioSeconds": round(total_audio, 1)})
    return {"files": files, "sr": m.sr, "seconds": round(secs, 2), "audioSeconds": round(total_audio, 2), "retries": retries_total,
            "eos": eos, "candidates": all_candidates}


def _whisper(model="small", gpu=False):
    if gpu:
        pk.prepare_cuda_dll()  # cuBLAS/cuDNN from the PyTorch CUDA wheel (Windows)
    from faster_whisper import WhisperModel
    return WhisperModel(pk.model_whisper(model), device=("cuda" if gpu else "cpu"), compute_type=("float16" if gpu else "int8"))


def _listen(wm, path, lang, words=False):
    x = load_audio(path, 16000)
    segs, _ = wm.transcribe(x, language=lang, beam_size=5, condition_on_previous_text=False, temperature=0.0,
                            word_timestamps=words)
    segs = list(segs)
    text = " ".join(s.text.strip() for s in segs)
    if not words:
        return text, None
    w = [{"text": x.word.strip(), "start": round(float(x.start), 3), "end": round(float(x.end), 3)}
         for s in segs for x in (s.words or []) if x.word.strip()]
    return text, w


@rename_kwargs({"bagian": "parts", "bahasa": "lang"})
def score_candidates(r, parts, lang, normal_cfg, model="small"):
    """Pick the best candidate per piece: score = normalised WER + 0.5 x duration penalty + 0.15 when EOS was forced.
    Duration penalty = max(0, |ln(d / ref)| - ln 1.5); ref = median candidate duration (>= 3 candidates) or 0.065 s/letter."""
    import shutil
    import statistics
    parts = _sentences(parts)
    if not any("expected" in c for c in r["candidates"]):
        return r
    try:
        wm = _whisper(model, gpu=False)  # CPU int8: the VRAM is still held by Chatterbox
    except ImportError:
        log("  " + T("faster-whisper is not installed: candidates picked by duration only"))
        wm = None
    normal = tn.Normal(_pronunciations(normal_cfg), lang=lang)
    t0 = time.time()
    for i, (b, c) in enumerate(zip(parts, r["candidates"])):
        if "candidates" not in c:
            continue
        ds = [k["duration"] for k in c["candidates"]]
        ref_d = statistics.median(ds) if len(ds) >= 3 else c["expected"]
        ref = b.get("text") or b["spoken"]
        for k in c["candidates"]:
            pen = max(0.0, abs(math.log(max(k["duration"], 0.05) / max(ref_d, 0.1))) - math.log(1.5))
            if wm is not None:
                text, _ = _listen(wm, k["file"], lang)
                n = tn.score_text(ref, text, normal)
                s, nk = tn.raw_wer(ref, text)
                k.update({"transcript": text, "werNormal": n["werNormal"], "wer": round(s / max(1, nk), 4),
                          "checkByEar": [(x["script"] or T("(extra)")) + " -> " + (x["heard"] or T("(missing)")) for x in n["checkByEar"]]})
            k["durationPenalty"] = round(pen, 3)
            k["score"] = round(k.get("werNormal", 0.0) + 0.5 * pen + (0.15 if k["eos"] else 0.0), 4)
        dev = [abs(math.log(max(k["duration"], 0.05) / max(ref_d, 0.1))) for k in c["candidates"]]
        best = pick_best(c["candidates"], dev)   # tie: the current take, then closest to the median
        c["pick"] = best
        cur = [j for j, k in enumerate(c["candidates"]) if k.get("current")]
        if cur:
            new = [k["score"] for k in c["candidates"] if not k.get("current")]
            c["keptCurrent"] = bool(c["candidates"][best].get("current"))
            c["currentScore"] = c["candidates"][cur[0]]["score"]
            c["bestNewScore"] = min(new) if new else None
        # the working folder of this run (never the parts folder that holds the current take)
        work = next((os.path.dirname(k["file"]) for k in c["candidates"] if not k.get("current")), os.path.dirname(r["files"][i]))
        f = os.path.join(work, f"s{i:03d}.wav")
        shutil.copyfile(c["candidates"][best]["file"], f)
        r["files"][i] = f
        r["eos"][i] = c["candidates"][best]["eos"]
        for j, k in enumerate(c["candidates"]):
            log(f"  [{i + 1}] " + T("candidate {} seed {}: score {} (normal WER {}%, {} s)", j + 1, k["seed"], f"{k['score']:.3f}",
                                    f"{100 * k.get('werNormal', 0):.0f}", f"{k['duration']:.1f}")
                + (" " + T("(current take)") if k.get("current") else "")
                + ("  <- " + T("picked") if j == best else "") + f"  {k.get('transcript', '')[:70]}")
        if cur:
            bn = "-" if c["bestNewScore"] is None else f"{c['bestNewScore']:.3f}"
            log(f"  [{i + 1}] " + (T("current take kept: score {} <= best new {}", f"{c['currentScore']:.3f}", bn) if c["keptCurrent"]
                                   else T("current take replaced: score {} -> {}", f"{c['currentScore']:.3f}", bn)))
    r["scoreSeconds"] = round(time.time() - t0, 1)
    return r


# ------------------------------------------------------------------ OpenVoice V2 (tone color converter)

_ov = None


def openvoice():
    global _ov
    if _ov is None:
        prepare_torch()
        from huggingface_hub import hf_hub_download
        from openvoice.api import ToneColorConverter
        local = env("MGP_OPENVOICE_DIR")  # folder with converter/config.json + converter/checkpoint.pth
        if local:
            cfg, ck = os.path.join(local, "converter", "config.json"), os.path.join(local, "converter", "checkpoint.pth")
        else:
            cfg = hf_hub_download("myshell-ai/OpenVoiceV2", "converter/config.json")
            ck = hf_hub_download("myshell-ai/OpenVoiceV2", "converter/checkpoint.pth")
        # ToneColorConverter passes enable_watermark to its parent class (TypeError), so the wavmark watermark
        # is switched off with a temporary stand-in module; openvoice output still carries the Perth watermark from Chatterbox
        import types
        orig = sys.modules.get("wavmark")
        sys.modules["wavmark"] = types.SimpleNamespace(load_model=lambda: types.SimpleNamespace(to=lambda d: None))
        try:
            _ov = ToneColorConverter(cfg, device=torch_device())
        finally:
            if orig is None:
                del sys.modules["wavmark"]
            else:
                sys.modules["wavmark"] = orig
        _ov.watermark_model = None
        _ov.load_ckpt(ck)
    return _ov


@rename_kwargs({"simpan_ke": "save_to"})
def se_from(conv, wav_path, save_to=None):
    """Voice colour embedding from a file (cut into ~10 s pieces then averaged, like se_extractor)."""
    import torch
    sr = conv.hps.data.sampling_rate
    x = load_audio(wav_path, sr)
    pieces, n = [], int(10 * sr)
    for a in range(0, max(1, len(x) - int(2 * sr)), n):
        seg = x[a:a + n]
        if len(seg) < 2 * sr:
            continue
        pieces.append(seg)
    import tempfile
    files = []
    d = tempfile.mkdtemp()
    for i, s in enumerate(pieces or [x]):
        f = os.path.join(d, f"p{i}.wav")
        save_audio(f, s, sr)
        files.append(f)
    se = conv.extract_se(files, se_save_path=save_to)
    return se


def clone_openvoice(ref, folder):
    r = clone_chatterbox(ref, folder)
    conv = openvoice()
    se_from(conv, ref, os.path.join(folder, "openvoice_se.pth"))
    r["openvoice"] = "openvoice_se.pth"
    return r


@rename_kwargs({"bagian": "parts", "keluar_dir": "out_dir", "bahasa": "lang", "coba": "tries"})
def speak_openvoice(folder, parts, out_dir, lang, seed, tries=1, normal_cfg=None, tau=0.3):
    import torch
    r = speak_chatterbox(folder, parts, out_dir, lang, seed, tries)
    if tries > 1:
        r = score_candidates(r, parts, lang, normal_cfg or {})
    conv = openvoice()
    t0 = time.time()
    tgt = torch.load(os.path.join(folder, "openvoice_se.pth"), map_location="cpu").to(conv.device)
    # source colour taken from the whole Chatterbox output
    import numpy as np
    sr = conv.hps.data.sampling_rate
    # a kept current take (--sentence --tries) already has the target colour: not converted again, not in the source colour
    kept = [bool(c.get("keptCurrent")) for c in r["candidates"]] + [False] * len(r["files"])
    fresh = [f for j, f in enumerate(r["files"]) if not kept[j]]
    out = []
    if not fresh:
        r["files"] = list(r["files"])
        return r
    joined = np.concatenate([load_audio(f, sr) for f in fresh])
    g = os.path.join(out_dir, "_joined.wav")
    save_audio(g, joined, sr)
    src = se_from(conv, g)
    for j, f in enumerate(r["files"]):
        if kept[j]:
            out.append(f)
            continue
        o = f.replace(".wav", "_ov.wav")
        conv.convert(audio_src_path=f, src_se=src, tgt_se=tgt, output_path=o, tau=tau)
        out.append(o)
    r["files"], r["sr"] = out, sr
    r["seconds"] = round(r["seconds"] + time.time() - t0, 2)
    return r


# ------------------------------------------------------------------ score

def speaker_embed(paths):
    """Speaker similarity: Resemblyzer (Apache-2.0) when present, otherwise the Chatterbox VoiceEncoder."""
    import numpy as np
    try:
        from resemblyzer import VoiceEncoder, preprocess_wav
        enc = VoiceEncoder("cpu", verbose=False)
        return "resemblyzer", [enc.embed_utterance(preprocess_wav(p)) for p in paths]
    except ImportError:
        m = chatterbox()
        e = [m.ve.embeds_from_wavs([load_audio(p, 16000)], sample_rate=16000).mean(axis=0) for p in paths]
        return "chatterbox-ve", [v / (np.linalg.norm(v) + 1e-9) for v in e]


def score(a):
    import numpy as np
    result = {}
    if a.script:
        try:
            gpu = _K is not None and _K.torch == "cuda"
            wm = _whisper(a.model, gpu)
            text, words = _listen(wm, a.audio, a.lang, words=True)
            script = open(a.script, encoding="utf-8").read()
            wrong, n = tn.raw_wer(script, text)
            sh, nh = tn.raw_cer(script, text)
            cfg = json.load(open(a.normal, encoding="utf-8")) if a.normal else {}
            wn = json.load(open(a.words, encoding="utf-8")) if a.words and os.path.exists(a.words) else None
            if wn is not None and len(wn) != len(tn.script_tokens(script)):
                wn = None                        # words.json of another script: use the ASR times
            nn = tn.score_text(script, words, tn.Normal(_pronunciations(cfg), lang=a.lang), wn)
            result.update({"transcript": text, "wer": round(wrong / max(1, n), 4), "errors": wrong, "wordCount": n,
                           "cer": round(sh / max(1, nh), 4), **nn, "timesFrom": "words.json" if wn else "asr"})
        except ImportError:
            result["note"] = T("faster-whisper is not installed; WER skipped")
    paths = [a.audio] + [p for p in (a.ref, a.compare) if p]
    if len(paths) > 1:
        how, e = speaker_embed(paths)
        result["embedder"] = how
        result["similarityRef"] = round(float(np.dot(e[0], e[1])), 4) if a.ref else None
        if a.compare:
            result["similarityCompare"] = round(float(np.dot(e[0], e[-1])), 4)
    return result


# ------------------------------------------------------------------ check

def check():
    import importlib.util as u
    has = lambda m: u.find_spec(m) is not None
    r = {"python": sys.version.split()[0], "torch": has("torch"), "chatterbox": has("chatterbox"), "openvoice": has("openvoice"),
         "faster_whisper": has("faster_whisper"), "resemblyzer": has("resemblyzer")}
    if r["torch"]:
        import torch
        r["torchVersion"] = torch.__version__
        r["cuda"] = torch.cuda.is_available()
        r["device"] = torch_device()
    return r


COMMANDS = {"check": "check", "clone": "clone", "speak": "speak", "score": "score",
            "cek": "check", "klon": "clone", "ucap": "speak", "nilai": "score"}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=T("mgp voice engine (Chatterbox / OpenVoice); one JSON line on stdout"))
    ap.add_argument("command", choices=list(COMMANDS), metavar="{check,clone,speak,score}")
    ap.add_argument("--engine", "--mesin", dest="engine", default="chatterbox", choices=["chatterbox", "openvoice"])
    ap.add_argument("--ref", help=T("reference recording (clone, score)"))
    ap.add_argument("--folder", help=T("voice profile folder"))
    ap.add_argument("--sentences", "--kalimat", dest="sentences", help=T("speak: sentences JSON"))
    ap.add_argument("--out", "--keluar", dest="out", help=T("speak: output folder"))
    ap.add_argument("--lang", "--bahasa", dest="lang", default="id")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--audio", help=T("score: audio to score"))
    ap.add_argument("--compare", "--banding", dest="compare", help=T("score: second recording to compare the speaker with"))
    ap.add_argument("--script", "--naskah", dest="script", help=T("score: script text file (WER/CER)"))
    ap.add_argument("--model", default="small")
    ap.add_argument("--tries", "--coba", dest="tries", type=int, default=1, help=T("speak: candidates per piece (1-12)"))
    ap.add_argument("--normal", help=T("normalisation JSON {pronunciations: [...]}"))
    ap.add_argument("--words", "--kata", dest="words", help=T("score: timed script words (vo.words.json)"))
    a = ap.parse_args()
    cmd = COMMANDS[a.command]
    if cmd == "check":
        return emit(check())
    # memory needs from py/hardware-requirements.json; openvoice = Chatterbox + ToneColorConverter
    cb, ov = pk.hardware_requirements("chatterbox"), pk.hardware_requirements("openvoice")
    if a.engine == "openvoice":
        kw = {"vram": cb.get("vram_gb", 3.0) + ov.get("vram_gb", 0.5), "ram_gb": cb.get("ram_gb", 4.5) + ov.get("ram_gb", 1.0)}
    else:
        kw = {"task": "chatterbox"}
    if cmd == "clone":
        f = clone_openvoice if a.engine == "openvoice" else clone_chatterbox
        return emit(_run(f"voice clone {a.engine}", lambda: f(a.ref, a.folder), **kw))
    if cmd == "speak":
        parts = _sentences(json.load(open(a.sentences, encoding="utf-8")))
        cfg = json.load(open(a.normal, encoding="utf-8")) if a.normal else {}
        tries = max(1, min(12, a.tries))
        if a.engine == "openvoice":
            def f():
                return speak_openvoice(a.folder, parts, a.out, a.lang, a.seed, tries, cfg)
        else:
            def f():
                r = speak_chatterbox(a.folder, parts, a.out, a.lang, a.seed, tries)
                return score_candidates(r, parts, a.lang, cfg) if tries > 1 else r
        return emit(_run(f"voice speak {a.engine}", f, **kw))
    if cmd == "score":
        if a.script:
            kw = {"task": "whisper-" + a.model if pk.hardware_requirements("whisper-" + a.model) else "whisper-small", "backend": "ctranslate2"}
        else:
            kw = {"backend": "cpu"}  # no transcription: small speaker embedder, CPU is enough
        return emit(_run("voice score", lambda: score(a), **kw))


def _drop_models():
    """Called before the CPU retry (OOM fallback): models cached on the GPU are dropped."""
    global _cb, _ov
    _cb = None
    _ov = None


def _run(name, f, **kw):
    """Run a command through the device manager: print device + reason, GPU lock, CPU fallback on OOM."""
    def work(k):
        global _K
        _K = k
        r = f()
        if isinstance(r, dict) and k.torch == "cuda" and _torch_cuda() and __import__("torch").cuda.max_memory_reserved() > 0:
            import torch
            r["vramPeakGb"] = round(torch.cuda.max_memory_reserved() / pk.GB, 2)
            r["vramAllocPeakGb"] = round(torch.cuda.max_memory_allocated() / pk.GB, 2)
        return r
    r, k = pk.run(name, work, on_fallback=_drop_models, fallback_if=pk.cuda_library_error, **kw)
    if isinstance(r, dict):
        r["device"] = k.dict()
    return r


# old names (suara_mesin.py), kept as aliases
perangkat = torch_device
keluar = emit
siapkan_torch = prepare_torch
muat = load_audio
simpan = save_audio
energi_db = energy_db
potong_hening = trim_silence
jendela_rujukan = reference_windows
klon_chatterbox = clone_chatterbox
_PenangkapEOS = _EosCatcher
ucap_chatterbox = speak_chatterbox
_dengar = _listen
nilai_calon = score_candidates
se_dari = se_from
klon_openvoice = clone_openvoice
ucap_openvoice = speak_openvoice
embed_penutur = speaker_embed
nilai = score
cek = check
_buang_model = _drop_models
_jalankan = _run


if __name__ == "__main__":
    sys.exit(main())
