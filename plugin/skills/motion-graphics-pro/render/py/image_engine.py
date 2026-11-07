"""image_engine - Python part of `mgp image` (mgp, Motion Graphics Pro). Old module name: gambar_mesin.py (thin shim kept).

Modes:
  make  --prompt "<text>" -o out.png [--width 1024 --height 1024] [--seed 7] [--engine klein4b|schnell]
        [--quant Q4_K_M] [--steps 4] [--reference a.png ...]
        Local image with diffusers + GGUF weights. The device is chosen by py/device.py (shared GPU lock,
        offload to RAM, CPU fallback when CUDA runs out of memory). Last stdout line = result JSON.
  download [--engine klein4b|schnell] [--quant Q4_K_M]   download the weights (resumed when interrupted) to MGP_IMAGE_MODEL
  check    [--engine klein4b]                            JSON: model files present or not, size
  template <output.png> [--width 1024 --height 576]      guide sheet of part slots (grey on magenta) + .json
  score-cutout <original.png> <cutout.png>               JSON quality of a magenta cutout (mgp image "<prompt>" --tries N):
        magenta left, subject touching the edge, magenta tint on the subject, subject area -> clean + score
  slice <alpha_sheet.png> <folder> [--names a,b,...] [--template slot.json] [--minarea 400] [--order] [--key]
        Split an alpha kit sheet into one PNG per part + kit.json (name, box, pivot, tip) + preview.
        Needs only numpy + Pillow (scipy optional).
Old subcommands (buat, unduh, cek, templat, nilai-potong, iris) and flags (--lebar, --tinggi, --mesin, --kuant, --langkah,
--referensi, --nama, --urut, --kunci, --tanpa-bersih, --templat, --putar) still work.

Local engines (all Apache-2.0):
  klein4b : FLUX.2 [klein] 4B. Transformer GGUF (unsloth/FLUX.2-klein-4B-GGUF), text encoder Qwen3-4B GGUF
            (unsloth/Qwen3-4B-GGUF), VAE + tokenizer + config from black-forest-labs/FLUX.2-klein-4B (not gated).
            Accepts reference images (multi-reference edit).
  schnell : FLUX.1 [schnell]. Transformer GGUF (city96/FLUX.1-schnell-gguf), T5-XXL GGUF (city96/t5-v1_1-xxl-encoder-gguf),
            CLIP + VAE + config from unsloth/FLUX.1-schnell (Apache-2.0 mirror; the official repo is gated).
Memory saving: the text encoder runs first and is dropped, then the transformer is loaded (RAM peak = the largest, not the sum).

Env: MGP_IMAGE_MODEL (cache folder, default ~/vgb-model/hf), MGP_DEVICE, MGP_GPU_WAIT (see device.py); old REKAM_* names work.
"""
import argparse
import builtins
import gc
import json
import os
import sys
import time

os.environ.setdefault("TQDM_DISABLE", "1")   # "Converting and de-quantizing GGUF" bars flood the log

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402
from i18n_py import T, env  # noqa: E402

GB = 1024 ** 3


def log(s):
    sys.stderr.write(s + "\n")
    sys.stderr.flush()


def cache_dir():
    return env("MGP_IMAGE_MODEL") or os.path.join(os.path.expanduser("~"), "vgb-model", "hf")


# ------------------------------------------------------------------ model catalogue

ENGINES = {
    "klein4b": {
        "task": "flux2-klein-4b-gguf",
        "base": "black-forest-labs/FLUX.2-klein-4B",
        "small_files": ["model_index.json", "scheduler/scheduler_config.json", "text_encoder/config.json", "text_encoder/generation_config.json",
                        "tokenizer/added_tokens.json", "tokenizer/chat_template.jinja", "tokenizer/merges.txt", "tokenizer/special_tokens_map.json",
                        "tokenizer/tokenizer.json", "tokenizer/tokenizer_config.json", "tokenizer/vocab.json", "transformer/config.json",
                        "vae/config.json", "vae/diffusion_pytorch_model.safetensors", "LICENSE.md"],
        "transformer": ("unsloth/FLUX.2-klein-4B-GGUF", "flux-2-klein-4b-{q}.gguf"),
        "text_encoder": ("unsloth/Qwen3-4B-GGUF", "Qwen3-4B-{q}.gguf"),
        "quant": "Q4_K_M",
        "steps": 4,
        "reference": True,
    },
    "schnell": {
        "task": "flux-schnell",
        "base": "unsloth/FLUX.1-schnell",
        "small_files": ["model_index.json", "scheduler/scheduler_config.json", "text_encoder/config.json", "text_encoder/model.safetensors",
                        "text_encoder_2/config.json", "tokenizer/merges.txt", "tokenizer/special_tokens_map.json", "tokenizer/tokenizer_config.json",
                        "tokenizer/vocab.json", "tokenizer_2/special_tokens_map.json", "tokenizer_2/spiece.model", "tokenizer_2/tokenizer.json",
                        "tokenizer_2/tokenizer_config.json", "transformer/config.json", "vae/config.json", "vae/diffusion_pytorch_model.safetensors"],
        "transformer": ("city96/FLUX.1-schnell-gguf", "flux1-schnell-{q}.gguf"),
        "text_encoder": ("city96/t5-v1_1-xxl-encoder-gguf", "t5-v1_1-xxl-encoder-{qt}.gguf"),
        "quant": "Q4_K_S",
        "quant_text": "Q4_K_M",
        "steps": 4,
        "reference": False,
    },
}


def files(engine, quant=None):
    m = ENGINES[engine]
    q = quant or m["quant"]
    qt = m.get("quant_text", q)
    tr = (m["transformer"][0], m["transformer"][1].format(q=q))
    te = (m["text_encoder"][0], m["text_encoder"][1].format(q=q, qt=qt))
    return [(m["base"], f) for f in m["small_files"]] + [te, tr]


def download(engine, quant=None, tries=30):
    # xet downloads stall on slow networks (tested 05-11-2026); plain HTTP resumes .incomplete with Range
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    from huggingface_hub import hf_hub_download
    C = cache_dir()
    os.makedirs(C, exist_ok=True)
    result = {}
    for repo, f in files(engine, quant):
        for i in range(tries):
            try:
                t = time.time()
                p = hf_hub_download(repo, f, cache_dir=C)
                result[f] = p
                log(f"  ok {repo}/{f} ({time.time() - t:.0f} s)")
                break
            except Exception as e:  # network dropped: hf_hub_download resumes the partial download
                log("  " + T("retry {}/{} {}/{}: {}", i + 1, tries, repo, f, str(e)[:160]))
                time.sleep(10)
        else:
            raise RuntimeError(T("could not download {}/{}", repo, f))
    return result


def locations(engine, quant=None):
    """Local path of every file (no download). None when missing."""
    from huggingface_hub import try_to_load_from_cache
    C = cache_dir()
    r = {}
    for repo, f in files(engine, quant):
        p = try_to_load_from_cache(repo, f, cache_dir=C)
        r[(repo, f)] = p if isinstance(p, str) and os.path.exists(p) else None
    return r


def check(engine, quant=None):
    try:
        L = locations(engine, quant)
    except ImportError:
        return {"ready": False, "reason": T("huggingface_hub is not installed")}
    missing = [f"{r}/{f}" for (r, f), p in L.items() if not p]
    size = sum(os.path.getsize(p) for p in L.values() if p) / GB
    return {"engine": engine, "ready": not missing, "missing": missing, "sizeGb": round(size, 2), "cache": cache_dir()}


# ------------------------------------------------------------------ make (local)

def _snap(L, repo):
    """Snapshot folder of the base repo (holds model_index.json)."""
    for (r, f), p in L.items():
        if r == repo and f == "model_index.json":
            return os.path.dirname(p)
    raise RuntimeError(T("model_index.json is missing"))


def _encode_klein(L, m, prompt, dev):
    import torch
    from transformers import AutoTokenizer, Qwen3ForCausalLM
    from diffusers import Flux2KleinPipeline
    base = _snap(L, m["base"])
    te_repo, te_f = None, None
    for (r, f), p in L.items():
        if r == m["text_encoder"][0]:
            te_repo, te_f = os.path.dirname(p), os.path.basename(p)
    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(os.path.join(base, "tokenizer"))
    # measured 05-11-2026 (transformers 5.22, Core Ultra 7): bf16 = RSS peak 11 GB, encode 34 s; fp32 = 18 GB, 9 s.
    # Default bf16 (laptop RAM shared with other sessions); MGP_IMAGE_TE_DTYPE=fp32 when free RAM >= 20 GB.
    te_dt = torch.float32 if env("MGP_IMAGE_TE_DTYPE", "bf16") == "fp32" else torch.bfloat16
    te = Qwen3ForCausalLM.from_pretrained(te_repo, gguf_file=te_f, dtype=te_dt, low_cpu_mem_usage=True)
    te.eval()
    if dev == "cuda":
        # 4B bf16 (8 GB) does not fit small VRAM: push layer by layer through accelerate (offload to RAM)
        from accelerate import cpu_offload
        cpu_offload(te, execution_device=torch.device("cuda"))
    log("  " + T("text encoder Qwen3-4B loaded ({} s)", f"{time.time() - t0:.0f}"))
    t0 = time.time()
    with torch.no_grad():
        emb = Flux2KleinPipeline._get_qwen3_prompt_embeds(te, tok, prompt, dtype=torch.bfloat16, device=torch.device("cpu"), max_sequence_length=512)
    log("  " + T("prompt encoded ({} s)", f"{time.time() - t0:.0f}"))
    del te
    gc.collect()
    return emb


def _encode_schnell(L, m, prompt, dev):
    import torch
    from transformers import CLIPTextModel, CLIPTokenizer, T5EncoderModel, T5TokenizerFast
    from diffusers import FluxPipeline
    base = _snap(L, m["base"])
    te_dir = te_f = None
    for (r, f), p in L.items():
        if r == m["text_encoder"][0]:
            te_dir, te_f = os.path.dirname(p), os.path.basename(p)
    clip = CLIPTextModel.from_pretrained(os.path.join(base, "text_encoder"), torch_dtype=torch.bfloat16)
    t5 = T5EncoderModel.from_pretrained(te_dir, gguf_file=te_f, torch_dtype=torch.bfloat16, low_cpu_mem_usage=True)
    pipe = FluxPipeline.from_pretrained(base, transformer=None, vae=None, text_encoder=clip, text_encoder_2=t5,
                                        tokenizer=CLIPTokenizer.from_pretrained(os.path.join(base, "tokenizer")),
                                        tokenizer_2=T5TokenizerFast.from_pretrained(os.path.join(base, "tokenizer_2")), torch_dtype=torch.bfloat16)
    with torch.no_grad():
        pe, ppe, _ = pipe.encode_prompt(prompt, prompt_2=prompt, device=torch.device("cpu"), max_sequence_length=256)
    del pipe, clip, t5
    gc.collect()
    return pe, ppe


_PIPE = {}


def drop_pipelines():
    _PIPE.clear()
    gc.collect()
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass


def _pipeline(L, engine, k):
    import torch
    from diffusers import GGUFQuantizationConfig
    m = ENGINES[engine]
    base = _snap(L, m["base"])
    gguf = [p for (r, f), p in L.items() if r == m["transformer"][0]][0]
    dt = torch.bfloat16
    q = GGUFQuantizationConfig(compute_dtype=dt)
    t0 = time.time()
    if engine == "klein4b":
        from diffusers import Flux2KleinPipeline, Flux2Transformer2DModel
        tr = Flux2Transformer2DModel.from_single_file(gguf, quantization_config=q, config=base, subfolder="transformer", torch_dtype=dt)
        pipe = Flux2KleinPipeline.from_pretrained(base, transformer=tr, text_encoder=None, tokenizer=None, torch_dtype=dt)
    else:
        from diffusers import FluxPipeline, FluxTransformer2DModel
        tr = FluxTransformer2DModel.from_single_file(gguf, quantization_config=q, config=base, subfolder="transformer", torch_dtype=dt)
        pipe = FluxPipeline.from_pretrained(base, transformer=tr, text_encoder=None, text_encoder_2=None, tokenizer=None, tokenizer_2=None, torch_dtype=dt)
    if k.device == "cuda+offload":
        pipe.enable_model_cpu_offload()
    elif k.device == "cuda":
        pipe.to("cuda")
    pipe.vae.enable_tiling() if hasattr(pipe.vae, "enable_tiling") else None
    log("  " + T("GGUF transformer {} loaded on {} ({} s)", os.path.basename(gguf), k.device, f"{time.time() - t0:.0f}"))
    return pipe


def make(a):
    import device as pk
    import torch
    m = ENGINES[a.engine]
    L = locations(a.engine, a.quant)
    if not all(L.values()):
        log(T("weights incomplete; downloading (resumes when interrupted)..."))
        download(a.engine, a.quant)
        L = locations(a.engine, a.quant)
    # references are shrunk: every reference adds image tokens; on 4 GB VRAM two 1024 px references = 158 s diffusion
    rmax = int(env("MGP_IMAGE_REF_MAX", "640"))
    refs = []
    for f in (a.reference or []):
        im = Image.open(f).convert("RGB")
        im.thumbnail((rmax, rmax), Image.LANCZOS)
        refs.append(im)
    if refs and not m["reference"]:
        raise SystemExit(T("this engine does not accept references"))
    W, H = (max(256, a.width // 16 * 16), max(256, a.height // 16 * 16))
    t_all = time.time()
    _, rk = pk.ram()
    need = pk.hardware_requirements(m["task"]).get("ram_gb", 9.0)
    log(T("local image {} {}x{}, free RAM {} GB (the text encoder needs ~{} GB)", a.engine, W, H, pk.fmt_num(rk), pk.fmt_num(need)))
    if rk < need and env("MGP_IMAGE_FORCE") != "1":
        raise SystemExit(T("free RAM {} GB < the {} GB the text encoder needs; close other apps/sessions or use the free cloud "
                           "(--source free-cloud). Force: MGP_IMAGE_FORCE=1 (may swap, very slow).", pk.fmt_num(rk), pk.fmt_num(need)))
    # 1) text encoder on the CPU (does not hold the GPU, safe while another process uses the GPU)
    if a.engine == "klein4b":
        emb = _encode_klein(L, m, a.prompt, "cpu")
    else:
        emb = _encode_schnell(L, m, a.prompt, "cpu")

    def work(k):
        dev = k.torch
        key = (a.engine, k.device)
        if key not in _PIPE:
            drop_pipelines()
            _PIPE[key] = _pipeline(L, a.engine, k)
        pipe = _PIPE[key]
        g = torch.Generator(device="cpu").manual_seed(a.seed)
        t0 = time.time()
        if dev == "cuda":
            torch.cuda.reset_peak_memory_stats()
        kw = dict(height=H, width=W, num_inference_steps=a.steps or m["steps"], generator=g)
        if a.engine == "klein4b":
            img = pipe(prompt_embeds=emb.to(dev), image=refs or None, guidance_scale=1.0, **kw).images[0]
        else:
            pe, ppe = emb
            img = pipe(prompt_embeds=pe.to(dev), pooled_prompt_embeds=ppe.to(dev), guidance_scale=0.0, **kw).images[0]
        peak = torch.cuda.max_memory_reserved() / GB if dev == "cuda" else None
        return img, time.time() - t0, peak

    (img, secs, peak), k = pk.run(f"image {a.engine}", work, on_fallback=drop_pipelines, task=m["task"])
    os.makedirs(os.path.dirname(os.path.abspath(a.o)), exist_ok=True)
    img.save(a.o)
    info = {"file": os.path.abspath(a.o), "model": f"{m['base']} + {os.path.basename([p for (r, f), p in L.items() if r == m['transformer'][0]][0])}",
            "size": [W, H], "seed": a.seed, "device": k.dict(), "diffusionSeconds": round(secs, 1), "seconds": round(time.time() - t_all, 1),
            "vramPeakGb": None if peak is None else round(peak, 2)}
    pk.record_measurement(f"image_{a.engine}_{k.device}", {"seconds": info["diffusionSeconds"], "size": f"{W}x{H}", "vramPeakGb": info["vramPeakGb"]})
    log("  " + T("diffusion {} s on {}", f"{secs:.0f}", k.device) + (", " + T("VRAM peak {} GB", f"{peak:.2f}") if peak else "")
        + "; " + T("total {} s", info["seconds"]))
    print(json.dumps(info, ensure_ascii=False))


# ------------------------------------------------------------------ kit layout template

# standard kit parts: (English name, old Indonesian name)
PART_NAMES = [("head", "kepala"), ("torso", "badan"), ("upper_arm", "lengan_atas"), ("lower_arm", "lengan_bawah"), ("hand", "tangan"),
              ("thigh", "paha"), ("shin", "betis"), ("foot", "kaki")]
EXTRA_NAMES = [("eye", "mata"), ("mouth_closed", "mulut_tutup"), ("mouth_open", "mulut_buka")]
_EN2ID = dict(PART_NAMES + EXTRA_NAMES)
_ID2EN = {v: k for k, v in _EN2ID.items()}

# (name, width, height, shape) in units u = body length; child/teen proportions, side view
SLOTS = [
    [("head", .80, .86, "ellipse"), ("torso", .58, 1.0, "capsule"), ("upper_arm", .22, .56, "capsule"), ("lower_arm", .19, .52, "capsule"), ("hand", .22, .30, "ellipse")],
    [("thigh", .30, .70, "capsule"), ("shin", .24, .66, "capsule"), ("foot", .50, .22, "capsule")],
]


def _names_are_id(names):
    """True when a --names list uses the old Indonesian part names (then guessed/slot names are Indonesian too)."""
    return any(n in _ID2EN for n in names) and not any(n in _EN2ID for n in names)


def _part_name(en, use_id):
    return _EN2ID.get(en, en) if use_id else _ID2EN.get(en, en)


def template(W, H, out):
    """Guide sheet: plain grey shape per part on magenta, widely spaced. Used as the first reference image
    (FLUX.2 klein multi-reference edit) so the model puts every part in its slot. Writes <out> + <out>.json."""
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img = Image.new("RGB", (W, H), (255, 0, 255))
    d = ImageDraw.Draw(img)
    u = H * 0.44
    slots = []
    y = H * 0.07
    for row in SLOTS:
        height = max(h for _, _, h, _ in row) * u
        total = sum(w for _, w, _, _ in row) * u
        gap = (W - total) / (len(row) + 1)
        x = gap
        for name, w, h, shape in row:
            bw, bh = w * u, h * u
            x0, y0 = x, y + (height - bh) / 2
            box = [x0, y0, x0 + bw, y0 + bh]
            r = min(bw, bh) / 2
            if shape == "ellipse":
                d.ellipse(box, fill=(150, 150, 150))
            else:
                d.rounded_rectangle(box, radius=r * .9, fill=(150, 150, 150))
            slots.append({"name": name, "name_id": _EN2ID[name], "box": [round(v, 1) for v in box]})
            x += bw + gap
        y += height + H * 0.06
    img.save(out)
    with open(os.path.splitext(out)[0] + ".json", "w", encoding="utf-8") as f:
        json.dump({"sheet": [W, H], "slots": slots}, f, indent=1)
    return {"template": os.path.abspath(out), "slots": slots}


# ------------------------------------------------------------------ slice (split a kit sheet)

def _label(mask):
    """Connected components (8-neighbour). scipy when available, otherwise numpy BFS."""
    try:
        from scipy import ndimage
        lab, n = ndimage.label(mask, structure=np.ones((3, 3), int))
        return lab, n
    except ImportError:
        pass
    H, W = mask.shape
    lab = np.zeros((H, W), np.int32)
    n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        lab[y0, x0] = n
        while stack:
            y, x = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
    return lab, n


def _ends(a):
    """Pivot (top end) and bottom end of a part from its alpha: mean x of the top/bottom 6% rows."""
    h, w = a.shape
    rows = np.nonzero(a.max(1) > 0.5)[0]
    y0, y1 = rows[0], rows[-1]
    band = max(2, int((y1 - y0) * 0.06))

    def cx(sl):
        m = a[sl] > 0.5
        xs = np.nonzero(m.any(0))[0]
        return float((xs[0] + xs[-1]) / 2) if len(xs) else w / 2
    top = [cx(builtins.slice(y0, y0 + band)), float(y0 + band * 0.7)]
    bot = [cx(builtins.slice(y1 - band, y1 + 1)), float(y1 - band * 0.7)]
    return top, bot


STANDARD = [en for en, _ in PART_NAMES]


def _classify(parts):
    """Guess the standard kit part names (English) from the shapes. parts: list of dicts (area, w, h). Returns {index: name} or None."""
    if len(parts) < 8:
        return None
    idx = list(range(len(parts)))
    by_area = sorted(idx, key=lambda i: -parts[i]["area"])
    name = {}
    # head: among the 3 largest parts, the most compact (side ratio near 1); torso: the largest of the rest
    cand = by_area[:3]
    head = min(cand, key=lambda i: abs(np.log(parts[i]["h"] / parts[i]["w"])))
    name[head] = "head"
    torso = [i for i in by_area if i != head][0]
    name[torso] = "torso"
    rest = [i for i in idx if i not in (head, torso)]
    long_ = sorted(rest, key=lambda i: -(parts[i]["h"] / parts[i]["w"]))[:4]  # limbs = most vertically elongated
    short = [i for i in rest if i not in long_]
    limbs = sorted(long_, key=lambda i: -parts[i]["h"])
    leg_pair, arm_pair = limbs[:2], limbs[2:]
    thick = lambda i: parts[i]["area"] / parts[i]["h"]
    p_up, p_low = sorted(leg_pair, key=lambda i: -thick(i))
    a_up, a_low = sorted(arm_pair, key=lambda i: -thick(i))
    name.update({p_up: "thigh", p_low: "shin", a_up: "upper_arm", a_low: "lower_arm"})
    short = sorted(short, key=lambda i: -parts[i]["area"])[:2]
    if len(short) == 2:
        foot = max(short, key=lambda i: parts[i]["w"] / parts[i]["h"])  # a foot is wider than tall
        hand = [i for i in short if i != foot][0]
        name.update({foot: "foot", hand: "hand"})
    return name


def _slot_entry(sl):
    """Template slot with the new keys (old: nama, kotak)."""
    return {"name": sl.get("name") or sl.get("nama"), "name_id": sl.get("name_id"), "box": sl.get("box") or sl.get("kotak")}


def slice(a):
    im = Image.open(a.input)
    import cutout as co
    if a.key or im.mode != "RGBA":
        im = co.magenta_key(im)
    if not a.no_clean:
        # semi-transparent magenta leftovers + thin alpha removed; small components are NOT removed (hands/feet = valid small parts)
        im, _info = co.clean(im, components=0)
    if not getattr(a, "no_despill", False):
        im, _sp = co.despill(im, "magenta")   # magenta tint along the part edges (mgp image kit/slice; off: --no-despill)
    rgba = np.asarray(im.convert("RGBA"))
    alpha = rgba[..., 3].astype(np.float32) / 255
    H, W = alpha.shape
    mask = alpha > 0.5
    # close 1-2 px gaps so one part does not break apart at a thin line
    m2 = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))) > 127
    lab, n = _label(m2)
    minarea = a.minarea or max(200, int(H * W * 0.0012))
    parts = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < minarea:
            continue
        parts.append({"id": i, "area": int(len(ys)), "x0": int(xs.min()), "y0": int(ys.min()), "x1": int(xs.max()) + 1, "y1": int(ys.max()) + 1})
    for p in parts:
        p["w"], p["h"] = p["x1"] - p["x0"], p["y1"] - p["y0"]
    warning = []
    # reading order: group rows (part centre y falls in the row's y range), rows top to bottom, then x
    rows = []
    for p in sorted(parts, key=lambda p: (p["y0"] + p["y1"]) / 2):
        cy = (p["y0"] + p["y1"]) / 2
        for r in rows:
            if r["y0"] <= cy <= r["y1"]:
                r["items"].append(p)
                r["y0"], r["y1"] = min(r["y0"], p["y0"]), max(r["y1"], p["y1"])
                break
        else:
            rows.append({"y0": p["y0"], "y1": p["y1"], "items": [p]})
    rows.sort(key=lambda r: sum((q["y0"] + q["y1"]) / 2 for q in r["items"]) / len(r["items"]))
    parts = [q for r in rows for q in sorted(r["items"], key=lambda q: q["x0"])]
    names_in = [s.strip() for s in (a.names or "").split(",") if s.strip()]
    use_id = _names_are_id(names_in)
    other = (lambda j: f"lain_{j + 1:02d}") if use_id else (lambda j: f"other_{j + 1:02d}")
    guess = None
    if a.template:
        # names from the template slots: each slot takes the component that covers most of its box
        with open(a.template, encoding="utf-8") as f:
            Tj = json.load(f)
        sheet = Tj.get("sheet") or Tj.get("lembar")
        sx, sy = W / sheet[0], H / sheet[1]
        guess = {}
        for sl in map(_slot_entry, Tj.get("slots") or Tj.get("slot") or []):
            sname = (sl["name_id"] if use_id and sl["name_id"] else _part_name(sl["name"], use_id))
            x0, y0, x1, y1 = sl["box"]
            x0, x1, y0, y1 = int(x0 * sx), int(x1 * sx), int(y0 * sy), int(y1 * sy)
            sub = lab[max(0, y0):y1, max(0, x0):x1]
            best, bn = None, 0
            for j, p in enumerate(parts):
                if j in guess:
                    continue
                n_ = int((sub == p["id"]).sum())
                if n_ > bn:
                    best, bn = j, n_
            if best is None:
                warning.append(T("slot {} empty (no part in its box)", sname))
            else:
                guess[best] = sname
        for j in range(len(parts)):
            if j not in guess:
                guess[j] = other(j)
                warning.append(T("part {} outside the template slots ({})", j + 1, other(j)))
    known = set(STANDARD) | set(_EN2ID.values()) | {en for en, _ in EXTRA_NAMES}
    if guess is None and not a.order and names_in and set(names_in) <= known:
        guess = _classify(parts)
        if guess:
            guess = {j: _part_name(v, use_id) for j, v in guess.items()}
            std = {_part_name(s, use_id) for s in STANDARD}
            # parts beyond the 8 standard ones (face, rest) are named in reading order
            extra = [x for x in names_in if x not in std]
            for j, p in enumerate(parts):
                if j not in guess:
                    guess[j] = extra.pop(0) if extra else other(j)
            if len(parts) != len(names_in):
                warning.append(T("{} parts != {} names; names guessed from the shapes, check the preview", len(parts), len(names_in)))
        else:
            warning.append(T("only {} parts (>= 8 needed to guess shapes); named in reading order", len(parts)))
    if guess is None and names_in and len(names_in) != len(parts):
        warning.append(T("{} parts != {} names (reading order: rows, then x)", len(parts), len(names_in)))
    os.makedirs(a.output, exist_ok=True)
    rotate = {}
    for kv in (a.rotate or "").split(","):
        if ":" in kv:
            k, v = kv.split(":", 1)
            rotate[k.strip()] = float(v)
    used = set()
    result = []
    pad = 4
    for j, p in enumerate(parts):
        if guess is not None:
            nm = guess[j]
        else:
            nm = names_in[j] if j < len(names_in) else (f"bagian_{j + 1:02d}" if use_id else f"part_{j + 1:02d}")
        base, k = nm, 2
        while nm in used:
            nm = f"{base}_{k}"
            k += 1
        used.add(nm)
        x0, y0, x1, y1 = max(0, p["x0"] - pad), max(0, p["y0"] - pad), min(W, p["x1"] + pad), min(H, p["y1"] + pad)
        sel = (lab[y0:y1, x0:x1] == p["id"])
        selm = np.asarray(Image.fromarray((sel * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
        crop = rgba[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(selm, crop[..., 3], 0)  # drop other parts that fall inside the box
        if rotate.get(nm):  # QC fix: e.g. a hand drawn fingers up -> --rotate hand:180
            crop = np.asarray(Image.fromarray(crop).rotate(rotate[nm], expand=True, resample=Image.BICUBIC))
        Image.fromarray(crop).save(os.path.join(a.output, nm + ".png"))
        if a.template:  # grey template shape the model did not replace (textured grey: low saturation, medium brightness)
            c3 = crop[..., :3].astype(np.int16)
            filled = crop[..., 3] > 128
            grey = ((c3.max(-1) - c3.min(-1)) < 20) & (c3.mean(-1) > 110) & (c3.mean(-1) < 215) & filled
            fr = grey.sum() / max(1, filled.sum())
            if fr > 0.15:  # clean kit measured <= 3%; unreplaced slot 27-99%
                warning.append(T("{}: {}% template grey pixels left (slot shape not fully replaced)", nm, f"{fr * 100:.0f}"))
        top, bot = _ends(crop[..., 3].astype(np.float32) / 255)
        if nm in ("head", "kepala"):  # the head turns at the neck: pivot at the bottom
            top, bot = bot, top
        result.append({"name": nm, "file": nm + ".png", "x": x0, "y": y0, "w": crop.shape[1], "h": crop.shape[0], "area": p["area"], "rotate": rotate.get(nm, 0),
                       "pivot": [round(top[0], 1), round(top[1], 1)], "tip": [round(bot[0], 1), round(bot[1], 1)]})
    kit = {"source": os.path.abspath(a.input), "sheet": [W, H], "unit": T("px in the part PNG; pivot = rotation point, tip = child joint"),
           "parts": result, "warning": warning}
    with open(os.path.join(a.output, "kit.json"), "w", encoding="utf-8") as f:
        json.dump(kit, f, ensure_ascii=False, indent=1)
    pv = _preview(rgba, result, os.path.join(a.output, "_preview.png"))
    for s in warning:
        log("  " + T("warning: {}", s))
    print(json.dumps({"kit": os.path.join(a.output, "kit.json"), "parts": result, "warning": warning, "preview": pv}, ensure_ascii=False))


def _preview(rgba, result, out):
    """QC sheet: the cutout on dark blue, box + name + pivot (red) + tip (green)."""
    H, W = rgba.shape[:2]
    bg = Image.new("RGBA", (W, H), (20, 30, 60, 255))
    bg.alpha_composite(Image.fromarray(rgba))
    d = ImageDraw.Draw(bg)
    for b in result:
        d.rectangle([b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]], outline=(255, 220, 80, 255), width=2)  # rotated part: box = PNG size
        d.text((b["x"] + 4, b["y"] + 3), b["name"], fill=(255, 255, 255, 255))
        for (px, py), c in ((b["pivot"], (255, 60, 60, 255)), (b["tip"], (60, 230, 120, 255))):
            X, Y = b["x"] + px, b["y"] + py
            d.ellipse([X - 5, Y - 5, X + 5, Y + 5], fill=c, outline=(0, 0, 0, 255))
    bg.convert("RGB").save(out)
    return out


# ------------------------------------------------------------------ cutout score (free prompt --tries)

def score_cutout(original, cutout):
    """Quality of one magenta cutout. Clean = no magenta left, subject not cut by the edge, magenta tint on the
    subject <= 2 %, plausible subject area. score: lower is better (0 = clean)."""
    import numpy as np
    from PIL import Image
    src = np.asarray(Image.open(original).convert("RGB")).astype(np.int32)
    cut = np.asarray(Image.open(cutout).convert("RGBA")).astype(np.int32)
    H, W = cut.shape[:2]
    r, g, b, al = cut[..., 0], cut[..., 1], cut[..., 2], cut[..., 3]
    visible = al >= 128
    n = max(1, int(visible.sum()))
    left = int((visible & (np.minimum(r, b) - g > 40) & (r > 120)).sum())
    edge_m = np.zeros((H, W), bool)
    edge_m[:2], edge_m[-2:], edge_m[:, :2], edge_m[:, -2:] = True, True, True, True
    edge = int((visible & edge_m).sum())
    # tint: subject pixels turned purplish by background reflection (laptop "slightly purple" in the 30 s ad test)
    # (magenta hue: R and B both above G and B >= 0.6 R; pure red/orange does not count)
    tint = int((visible & (np.minimum(r, b) - g > 15) & (b >= 0.6 * r) & (r > 70)).sum())
    area = n / float(H * W)
    info = {"visiblePixels": n, "area": round(area, 4), "magentaLeft": left, "edge": edge,
            "tintPercent": round(100.0 * tint / n, 2), "originalSize": list(src.shape[1::-1])}
    score = left / 50.0 + edge / 200.0 + max(0.0, info["tintPercent"] - 2.0) * 0.5 + (5.0 if area < 0.01 or area > 0.95 else 0.0)
    info["score"] = round(score, 3)
    info["clean"] = left == 0 and edge == 0 and info["tintPercent"] <= 2.0 and 0.01 <= area <= 0.95
    reasons = []
    if left:
        reasons.append(T("{} px magenta left", left))
    if edge:
        reasons.append(T("subject touches the edge ({} px)", edge))
    if info["tintPercent"] > 2.0:
        reasons.append(T("magenta tint on the subject {}%", info["tintPercent"]))
    if area < 0.01 or area > 0.95:
        reasons.append(T("subject area {}% (empty, or the background was not keyed)", f"{100 * area:.1f}"))
    info["reasons"] = reasons
    return info


# ------------------------------------------------------------------ old names (gambar_mesin.py), kept as aliases

MESIN = ENGINES
SLOT = SLOTS
STANDAR = [id_ for _, id_ in PART_NAMES]
berkas = files
unduh = download
lokasi = locations
cek = check
buang = drop_pipelines
_pipa = _pipeline
buat = make
templat = template
_ujung = _ends
_klasifikasi = _classify
iris = slice
_pratinjau = _preview
nilai_potong = score_cutout


# ------------------------------------------------------------------ CLI

def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=T("mgp image engine"))
    sp = ap.add_subparsers(dest="cmd", required=True)
    b = sp.add_parser("make", aliases=["buat"], help=T("local image (diffusers + GGUF)"))
    b.add_argument("--prompt", required=True)
    b.add_argument("-o", required=True)
    b.add_argument("--width", "--lebar", dest="width", type=int, default=1024)
    b.add_argument("--height", "--tinggi", dest="height", type=int, default=1024)
    b.add_argument("--seed", type=int, default=0)
    b.add_argument("--engine", "--mesin", dest="engine", default="klein4b", choices=list(ENGINES))
    b.add_argument("--quant", "--kuant", dest="quant")
    b.add_argument("--steps", "--langkah", dest="steps", type=int)
    b.add_argument("--reference", "--referensi", dest="reference", action="append")
    u = sp.add_parser("download", aliases=["unduh"], help=T("download the weights"))
    u.add_argument("--engine", "--mesin", dest="engine", default="klein4b", choices=list(ENGINES))
    u.add_argument("--quant", "--kuant", dest="quant")
    c = sp.add_parser("check", aliases=["cek"], help=T("are the model files present"))
    c.add_argument("--engine", "--mesin", dest="engine", default="klein4b", choices=list(ENGINES))
    c.add_argument("--quant", "--kuant", dest="quant")
    i = sp.add_parser("slice", aliases=["iris"], help=T("split an alpha kit sheet into parts + kit.json"))
    i.add_argument("input")
    i.add_argument("output")
    i.add_argument("--names", "--nama", dest="names")
    i.add_argument("--minarea", type=int)
    i.add_argument("--order", "--urut", dest="order", action="store_true", help=T("name in reading order, no shape guessing"))
    i.add_argument("--key", "--kunci", dest="key", action="store_true", help=T("magenta key first (input has no alpha yet)"))
    i.add_argument("--no-clean", "--tanpa-bersih", dest="no_clean", action="store_true", help=T("do not remove magenta leftovers / thin alpha before slicing"))
    i.add_argument("--no-despill", dest="no_despill", action="store_true", help=T("keep the magenta tint along the part edges (no despill)"))
    i.add_argument("--template", "--templat", dest="template", help=T("slot JSON from the template mode: part names taken from the slots"))
    i.add_argument("--rotate", "--putar", dest="rotate", help=T("rotate parts (degrees, counter-clockwise) before the pivot is computed, e.g. hand:180,foot:-90"))
    nv = sp.add_parser("score-cutout", aliases=["nilai-potong"], help=T("quality of a magenta cutout"))
    nv.add_argument("original")
    nv.add_argument("cutout")
    t = sp.add_parser("template", aliases=["templat"], help=T("guide sheet of part slots"))
    t.add_argument("output")
    t.add_argument("--width", "--lebar", dest="width", type=int, default=1024)
    t.add_argument("--height", "--tinggi", dest="height", type=int, default=576)
    a = ap.parse_args()
    cmd = {"buat": "make", "unduh": "download", "cek": "check", "iris": "slice", "nilai-potong": "score-cutout", "templat": "template"}.get(a.cmd, a.cmd)
    if cmd == "make":
        make(a)
    elif cmd == "download":
        download(a.engine, a.quant)
        print(json.dumps(check(a.engine, a.quant), ensure_ascii=False))
    elif cmd == "check":
        print(json.dumps(check(a.engine, a.quant), ensure_ascii=False))
    elif cmd == "score-cutout":
        print(json.dumps(score_cutout(a.original, a.cutout), ensure_ascii=False))
    elif cmd == "template":
        print(json.dumps(template(a.width, a.height, a.output), ensure_ascii=False))
    else:
        slice(a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
