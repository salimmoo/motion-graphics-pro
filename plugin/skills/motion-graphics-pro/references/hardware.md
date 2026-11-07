# Machine: check what the computer can do, then pick a route

Reference for Claude. The goal: do not guess what the user's computer can do. Measure first, then pick the voice, image and render routes from those measurements.

## 1. At the start of a project: run `mgp doctor`

```bash
node motion-graphics-pro/render/bin/mgp.mjs doctor          # short summary (English; MGP_LANG=id for Indonesian)
node motion-graphics-pro/render/bin/mgp.mjs doctor --json   # for Claude to read
```

Run it once at the start of a project (before the brief is finished), and again when the user says they are on a different computer, has just installed a driver/PyTorch CUDA, or their RAM is currently full. The voice venv and the image venv are found automatically (env `MGP_PYTHON` / `MGP_IMAGE_PYTHON`, then `~/.mgp/install.json` from `mgp install`, then the old manual venvs `~/vsu` / `~/vgb`); the `Install` line in the output sums up the install status.

### Start the install in the background right away

When `doctor` shows that a local engine the project will use is not installed yet (`Install  no install.json yet`, a note "mgp install ... --detach") and the user agrees to download several GB:

```bash
node motion-graphics-pro/render/bin/mgp.mjs install all --dry-run   # show first: PyTorch build, device, disk (±9 GB voice, ±5 GB image)
node motion-graphics-pro/render/bin/mgp.mjs install all --detach    # runs in the background; carry on with the brief with the user
node motion-graphics-pro/render/bin/mgp.mjs install all --status      # check progress at any time (downloading x%, installing, done, failed)
```

- Pick the target the project needs: `voice` (local clone), `image` (local FLUX), or `all`. Do not install local image generation when `doctor` advises the cloud (total RAM < 16 GB).
- When `--status` reports "a complete manual/env install was found", do not download again: `mgp install all --adopt` (sha256 is checked, then the smoke test runs).
- An interrupted install (network, laptop switched off): run the same command again; downloads resume where they stopped. `mgp install --stop` stops the background process.
- Done = the smoke test passed (1 sentence with the built-in voice / 1 image of 512 px; device + time are recorded in `--status`). An image test that is PENDING because of too little free RAM is not an install failure.
- Only one install at a time; the smoke test uses the GPU through the shared lock (section 3), so it does not collide with other render/voice jobs.

What is reported: CPU and thread count, total/free RAM, every GPU (total/free VRAM, driver), the ffmpeg hardware video encoders that **actually pass an encode test**, the PyTorch build (cpu/cuda/mps) and ctranslate2, GPU lock status, then advice per pipeline. The thresholds are in one table: `render/py/hardware-requirements.json`.

## 2. Use the results at the decision points

Local engines are installed **once per computer**, not per project: `mgp install voice` (voice clone) and `mgp install image` (local images). The command detects OS/GPU/RAM, picks the PyTorch build (CUDA/MPS/CPU), creates a venv on a short path, downloads version-locked models (sha256, resumable; the download may run in the background), then tests one sentence or one image. Models are not in the pack ZIP. Offer it at the start of a project when `doctor` shows a local engine is not installed yet; never install without the user's permission (a download of several GB).

The image venv is checked separately from the voice venv (the `Image` line in the output), so the local image advice no longer wrongly says "needs PyTorch CUDA" when the image venv is ready.

### Voice (script/VO gate)

Read `recommendation.voice` in the JSON.

| Condition | What Claude offers |
|---|---|
| `weak: false`, GPU device | Local clone as the main, free option. Mention the estimated `secondsPer30sVo`. |
| `weak: false`, CPU device | Local clone still works, but mention the time (e.g. "30 s of VO takes ±2.5 minutes"). For scripts > 1 minute suggest making it per block. |
| `weak: true` (high RTF or too little free RAM) | Prefer ElevenLabs or the user's own voice recording. Local clone only when the user still wants it. |
| note "PyTorch CPU build" while an NVIDIA GPU is present | Tell the user that installing PyTorch CUDA speeds up the clone (see `voice/README.md`). Do not install without permission: the download is ±2.5 GB. |

The RTF number comes from the latest measurement on that machine (`ukur.json`, written automatically on every `mgp voice speak`); when nothing has been measured yet, the table default is used and the JSON says `rtfSource: "estimate"`.

### Local images (`mgp image`, when available)

`recommendation.image.mode`:

- `local`: large GPU (VRAM ≥ 12 GB), local images are reasonable.
- `local-offload`: VRAM ≥ 4 GB and free RAM ≥ 16 GB. Possible but slow; use it for a few images (kit sheets, plates), not dozens.
- `local-mps`: Apple Silicon with plenty of RAM; slow.
- `cloud`: use the free cloud (`mgp image --source free-cloud`, `references/image.md`) or Higgsfield (gate G3). This is the default answer for an ordinary laptop. When the notes say free RAM is too low although total RAM is large, you may suggest closing other apps and checking again.

### Render

- `--workers`: use `recommendation.render.workers` when the computer is used only for this; use `workersShared` (2) when the user is running other sessions/agents. When the user runs other sessions or agents on the same laptop, always use `--workers 2`.
- Encoder: the **final** render uses `--encoder cpu` (libx264, default, deterministic). `--encoder auto` or a hardware encoder that passed the test (`encoder.draft`) is only for drafts/iterations; in ordinary compositions the render time is dominated by Chrome frame capture, so a hardware encoder hardly speeds up the total (see the numbers in `render/README.md`).
- `smallPreview: true`: drafts at half `--size` (e.g. 540x960), the final at full size.

## 3. The GPU is used in turns

Every mgp GPU job (voice clone, faster-whisper in `mgp voice score`, `mgp image`) takes the lock `%LOCALAPPDATA%\rekam\gpu.lock` (Linux/macOS: `~/.cache/rekam/gpu.lock`; the folder keeps the old name so old and new versions share one queue). One GPU job at a time, across processes, agents and sessions. A job that comes later waits `MGP_GPU_WAIT` seconds (default 120), then runs on the CPU and writes that in the log. A lock left by a process that has died is removed automatically.

Rules for Claude:

- Do not run two heavy GPU jobs at the same time from two agents; let the lock handle it, and never delete a `gpu.lock` that belongs to a process that is still alive.
- Every voice command prints a line `device [task]: GPU (CUDA): ...` or `CPU: <reason>`. Report this line to the user when the VO feels slow.
- When the log says "fallback after CUDA out of memory", the result is still valid (redone on the CPU), only slower. Common cause: another app is using VRAM. No need to redo it.
- NVENC/QSV encoders do not take the lock (the encoder chip is separate and uses little VRAM); NVENC falls back to the CPU when VRAM is nearly full.

## 4. Environment variables

| Env | Meaning |
|---|---|
| `MGP_DEVICE=auto\|cpu\|cuda\|mps` | Force the device of the Python models (default `auto`). |
| `MGP_GPU_WAIT=<seconds>` | How long to wait for a busy GPU before falling back to the CPU (default 120). |
| `MGP_GPU_LOCK=<file>` | Another lock file location (rarely needed). |
| `MGP_ENCODER=cpu\|auto\|nvenc\|qsv\|amf\|videotoolbox` | Default MP4 encoder for `mgp render` (default `cpu`). |
| `MGP_PYTHON=<python.exe>` | Python with PyTorch/the voice engine (default: from `install.json`). |
| `MGP_IMAGE_PYTHON=<python.exe>` | Python of the image venv (default: from `install.json`, then `~/vgb`). |
| `MGP_HOME=<folder>` | Home of `mgp install` (default `~/.mgp`; an old `~/.rekam` is still read): `install.json`, background status/log, venvs, models. |
| `MGP_CHATTERBOX_DIR`, `MGP_OPENVOICE_DIR`, `MGP_WHISPER_CACHE`, `MGP_IMAGE_MODEL` | Model folders; filled in automatically from `install.json` when empty. |
| `MGP_GPU_LIMIT=<GB>` | Testing only: limit the CUDA memory of the process to trigger the OOM fallback route. |

## 5. For new Python scripts (e.g. `mgp image`)

Use `render/py/device.py`; do not write your own device logic:

```python
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # the script runs with python -I
import device as pk

def work(k):                        # k.device: "cuda" | "cuda+offload" | "cpu" | "mps"; k.torch for .to()
    pipe = load_pipeline(k.torch)
    if k.device == "cuda+offload":
        pipe.enable_model_cpu_offload()
    return make_image(pipe)

def drop():                         # called before the CPU retry after an OOM
    global PIPE; PIPE = None

result, k = pk.run("image flux", work, on_fallback=drop, task="flux-schnell")
print(k.text())                     # "GPU + RAM offload: free VRAM 3.8 GB < needed 12.0 GB; ..."
```

Add new task rows (VRAM, RAM, offload) to `render/py/hardware-requirements.json` after measuring, not in the code.
