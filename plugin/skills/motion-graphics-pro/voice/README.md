# Voice: narration in your own voice

This module makes a VO (narration) from a script. There are four routes, and Claude asks which one before the VO is made (gate G2: `SKILL.md` 1.1 item 5 and `references/audio.md` 10.1):

| Choice | Good for | Command |
|---|---|---|
| a. ElevenLabs | The most natural voice; a stock voice, or your own voice clone that already exists in your ElevenLabs account | `mgp voice elevenlabs script.txt --voice <id> -o vo.wav`, or the ElevenLabs connector through Claude |
| b. Local voice clone | Free, runs on your own computer, your voice from a ~30 second recording | `mgp voice clone`, then `mgp voice speak` |
| c. Your own recording | The best quality when you have a microphone and the time | record the full narration, then `mgp align` |
| d. No narration | Text, music or SFX-only videos | - |

Every route ends with the same files: `vo.wav` (-16 LUFS), `vo.words.json` (word and syllable timing) and `vo.letters.json` (letter timing for `MGP.lipsync.visemes()`). Old file names: `vo.kata.json`, `vo.huruf.json`. This timing becomes the clock for kinetic text, actions and the characters' mouths.

Old command names (`mgp suara periksa|klon|ucap|nilai|daftar|hapus`, `--nama`, `--profil`, `--naskah`, `--kalimat`, `--coba`, `--lafal`, ...) still work; see `mgp voice --help`.

## Ethics

- Clone only your own voice, or the voice of someone who gave explicit consent. That consent is recorded: the first sentence of the reading text is *"Saya, [nama], mengizinkan suara saya dikloning untuk proyek ini."* (English template: *"I, [name], consent to my voice being cloned for this project."*). Without this sentence `mgp voice clone` refuses to make a profile.
- Do not imitate public figures, celebrities, religious scholars, officials, or people who have passed away.
- Voice profiles are stored locally (default `~/.mgp/voice-profiles/<name>/`, outside the skill/plugin folder, so an update never removes them; an older `voice/profiles/` inside the skill that already holds profiles is still used; another folder through env `MGP_VOICE_PROFILES` or `--folder`) and are not uploaded anywhere. Delete them any time: `mgp voice remove <name>`.
- Chatterbox embeds an inaudible watermark (Perth, Resemble AI) in every output, so synthetic audio can still be recognised. State that the voice is synthetic when the platform requires it.

## Local clone workflow

```bash
cd motion-graphics-pro/render
node bin/mgp.mjs voice template                      # ~30 s reading text (or --language en)
node bin/mgp.mjs voice inspect recording.m4a         # quality + consent sentence
node bin/mgp.mjs voice clone recording.m4a --name budi  # profile in ~/.mgp/voice-profiles/budi/
node bin/mgp.mjs voice speak script.txt --profile budi -o vo.wav --emotion warm
node bin/mgp.mjs voice score vo.wav --profile budi --script script.txt   # raw + normalised WER, CHECK BY EAR
node bin/mgp.mjs voice speak script.txt -o vo.wav --sentence 3 --tries 4    # redo sentence 3 only
```

Profile folder: default `~/.mgp/voice-profiles/` (mgp home, env `MGP_HOME`; with `CLAUDE_PLUGIN_DATA` set: `$CLAUDE_PLUGIN_DATA/voice-profiles`); move it with env `MGP_VOICE_PROFILES=<folder>` (or `--folder`). Python and the models are read automatically from `~/.mgp/install.json` (old: `~/.rekam/pasang.json`) written by `mgp install voice`; another venv: `MGP_PYTHON`.

### 1. Record the reading text

`mgp voice template` prints the text from `reading-template.md`: the consent sentence, then six sentences that cover every sound of Indonesian (ng, ny, sy, kh, f/v/z, diphthongs ai/au/oi/ei, schwa e and é, trilled r, final k, consonant clusters) with statement, question and exclamation intonation. There is an English version (`--language en`).

How to record: a quiet room, mouth 20-30 cm from the microphone, no music or effects, read naturally as if telling a story. WAV, MP3 or M4A, 24-48 kHz. A phone microphone is enough.

### 2. Inspect

`mgp voice inspect recording.wav` measures:

| Check | ERROR | WARN |
|---|---|---|
| Duration | < 20 s | speech < 15 s |
| Estimated SNR (energy percentile 95 vs 10) | < 15 dB | < 25 dB |
| Clipping (samples above 0.995) | > 0.1% | > 0.01% |
| Loudness | - | < -38 LUFS or > -8 LUFS |
| Sample rate | < 16 kHz | < 24 kHz |
| Consent sentence | not heard | ASR not installed |

The consent sentence is checked with faster-whisper (`small`, language from `--language`). Matching is loose: per word (the name may be anything, 1-4 words) and per letter without spaces, because ASR often joins or splits words ("mengizinkan suara" was read as "mengeizingkenswara" for a synthetic voice with an English accent; the letter score was still 0.84). The words "mengizinkan" and "dikloning" must be present (English: "consent" and "cloned"). Without faster-whisper, mgp can only check that the length of the speech matches the template (through `mgp align`), so `clone` asks for `--manual-consent`: listen to the start of the recording yourself before using it.

A recording without the consent sentence may only be cloned when the voice owner gives consent directly (for example a user cloning their own voice through the conversation): `mgp voice clone recording.wav --name <profile> --manual-consent --statement "<who owns the voice, when and how consent was given>"` (at least 10 characters). The statement is recorded in `profile.json`. The original recording is not copied into the project folder or the package; it is only read from where it is.

### 3. Clone

`mgp voice clone recording.wav --name budi [--engine chatterbox|openvoice]` writes `~/.mgp/voice-profiles/budi/`:

| File | Content |
|---|---|
| `reference.wav` | clean recording: 70 Hz highpass, light denoising (`afftdn`), pauses > 0.5 s shortened, silent edges removed, -20 LUFS, 24 kHz mono |
| `chatterbox_conds.pt` | Chatterbox conditionals: a 10 s prompt (starting after the consent sentence) + a speaker embedding from the whole reference |
| `openvoice_se.pth` | (`openvoice` engine) OpenVoice tone colour embedding |
| `profile.json` | name, consent time, how consent was verified, score, the name heard, sha256 of the source recording and the reference, source quality |

Another engine can be added to the same profile: `--engine openvoice --add-engine`. Older profiles with `referensi.wav` / `profil.json` are still read.

### 4. Speak

`mgp voice speak script.txt --profile budi -o vo.wav [--language id|en] [--emotion neutral|warm|energetic|calm] [--speed 1.0] [--seed 1] [--tries N] [--pronounce ...] [--dry-run]`

1. The script is split: paragraphs (blank line), sentences, then sentences > 220 characters are cut at commas.
2. Pronunciations (helper spellings) are applied, then numbers are spelled out with the `mgp align` rules ("2025" becomes "dua ribu dua puluh lima"). See "Pronunciations" below.
3. Each piece is synthesised, the silence at its edges removed, then joined with pauses: comma 0.18 s, sentence 0.38 s, question/exclamation 0.45 s, paragraph 0.8 s.
4. `--speed` uses `atempo` (pitch unchanged), 0.7-1.3.
5. Loudness -16 LUFS, true peak -1.5 dBTP, 48 kHz.
6. `mgp align` writes `vo.words.json` (words + syllables) and `vo.letters.json` (letters). With pronunciations, timing is computed from the spoken spelling and the word text goes back to the original script ("Claude", not "Klod"); `vo.letters.json` keeps the spoken spelling (for the mouth).
7. One WAV per sentence is kept in `vo.parts/` (+ `parts.json`: text, spoken spelling, seed, emotion, duration, start; old folder `vo.bagian/`). From there one sentence can be redone without remaking the others.
8. `--dry-run` only prints the sentence numbers, text and spoken spelling (no GPU), to choose `--sentence` or check the pronunciations.
9. Log: tqdm bars are switched off; Chatterbox "forcing EOS" warnings that come with token repetition are reported per sentence, because that is where a word can be doubled, mumbled, or the last word cut off.

An emotion tag per sentence may be written in the script: `[energetic] Let's go!` (the old Indonesian tags such as `[semangat]` still work). Tags are removed from the text and the timing.

#### Redo one sentence

```bash
mgp voice speak script.txt -o vo.wav --sentence 3              # previous seed + 1
mgp voice speak script.txt -o vo.wav --sentence 3 --seed 7     # a given seed
mgp voice speak script.txt -o vo.wav --sentence 2,5 --tries 4   # 4 candidates per sentence, chosen by ASR
```

- Needs `vo.parts/` from an earlier full `speak`. Profile, engine, language, emotion, speed and loudness are taken from `parts.json` (their options can override them).
- Only the named sentences are synthesised; the other sentences are reused bit for bit. Then the VO is joined again with the same pauses, and `--speed`, loudness and `vo.words.json`/`vo.letters.json` are written again.
- The text of a redone sentence may be changed in the script (e.g. a helper spelling). The number of sentences must stay the same; if it changes, remake the whole VO.
- `--tries N` (1-12): N candidates with seeds `s, s+101, ...` from one model load. Each candidate is transcribed by faster-whisper (CPU int8, because the VRAM is used by Chatterbox) and scored = normalised WER + 0.5 x duration penalty (deviating > 1.5x from the candidates' median) + 0.15 when there is token repetition. The lowest score is used; every candidate is kept in `vo.parts/candidates/NN-k.wav` and its score in `parts.json`, so other candidates can be listened to and copied by hand to `NN.wav` (then run again with another `--sentence`, or rejoin through `--sentence N --seed <candidate seed>`).
- **The current take competes too** (since 06-11-2026; P_iklan_90 sentence 16 went from WER 11 % to 22 % because only the new candidates were compared): with `--sentence N --tries K` the existing `NN.wav` is scored by the same ASR as one more candidate and is only replaced when a new candidate scores **strictly** better (a tie keeps it). The log prints every score, marks `(current take)`, and ends with `current take kept: score a <= best new b` or `replaced: a -> b`; `parts.json` gets `keptCurrent` and the candidate list includes the current take (`current: true`, file `NN.wav`). `--force` = the old behaviour (best new candidate, current take not compared). The current take is not compared when the sentence text, its spoken spelling or the emotion settings changed (the new take is meant to sound different). With `--tries 1` there is no ASR scoring, so no comparison either.
- Test (a test profile, 4 GB GPU, 06-11-2026): redo 1 sentence 50 s; 4 candidates for 1 sentence 77 s (including model load ±11 s and ASR). The earlier manual way (one `speak` per variant, the model loaded every time): 11 variants ±13 minutes.

#### Pronunciations (helper spellings)

Chatterbox reads Indonesian with the Malay code, so English brand names need to be spelled the way they sound. The script stays written normally; the spoken spelling comes from the pronunciation list (old name: `lafal`):

```text
# pronunciations.txt in the project folder (or the script folder): word = spoken spelling | ASR variants that count as right
Claude = Klod
Motion Graphics = Mosyen Grafiks
brief = brif
```

- Order: `voice/pronunciations-default.txt` (Claude, Higgsfield, ElevenLabs, Motion Graphics, brief; tested on a 30 s ad), then `pronunciations.txt` in the script folder, its parent, or the working folder, then `--pronounce "Claude=Klod; brief=brif"` or `--pronounce file.txt`. The same entry is overridden by a later source; `--no-pronounce` turns everything off.
- Multi-word phrases are allowed; suffixes follow ("brief-nya" is spoken "brif-nya").
- Entries may contain hyphens, apostrophes (straight or curly), dots and any case: `ZIP-nya = zip nya`, `Jum'at = Jumat`, `Dr. = Dokter`. Matching is per whole word and case-insensitive: `ZIP` matches "ZIP", "(ZIP)" and the "ZIP" of "ZIP-nya" (when there is no `ZIP-nya` entry; the longer entry wins), but never "ZIPPED", and `don` does not match "don't". Before 06-11-2026 an entry with a hyphen was silently ignored (P_iklan_90).
- `speak` (also `--dry-run`) prints `WARN: pronunciation "X" (pronunciations.txt) matches no word of the script` for every project/`--pronounce` entry that never matched (the skill default list is not reported). An entry that is fully covered by a longer one (e.g. `ZIP` next to `ZIP-nya` when the script only has "ZIP-nya") is reported too; that is harmless.
- **The Claude case:** the Malay code reads spelling, not English sound, so to sound like "klod" the script uses the pronunciation `Claude = Klod` (the spelling used in the test ad). ASR (faster-whisper) often writes that sound as "clock", "klok" or "cloud", so `score` marks it CHECK BY EAR. Listen: when it sounds like "klod", add the ASR variant that appeared to the project pronunciations (`Claude = Klod | clock, cloud`) so it no longer counts as an error. Do not add variants before listening.
- The part right of `|` is only used by `score` and `--tries`; it does not change the voice.

| Emotion (old name) | exaggeration | cfg_weight | temperature |
|---|---|---|---|
| `neutral` (`netral`) | 0.5 | 0.5 | 0.8 |
| `warm` (`hangat`) | 0.4 | 0.4 | 0.7 |
| `energetic` (`semangat`) | 0.75 | 0.35 | 0.85 |
| `calm` (`tenang`) | 0.3 | 0.5 | 0.6 |

### 5. Score

`mgp voice score vo.wav --profile budi --script script.txt [--compare other_voice.wav] [--words vo.words.json]` transcribes the VO with faster-whisper (per-word timing), then gives:

- **Raw WER/CER**: only lower case and punctuation removed (the old number, for comparison).
- **Normalised WER/CER** (the number for G2): numbers spelled both ways ("260" = "dua ratus enam puluh"), hyphens and joined/split words equated ("laptop mu" = "laptopmu", "brief nya" = "brief-nya"), non-standard spellings (aja/saja, gak/nggak/enggak, ijin/izin, etc.), a sound skeleton ("computermu" = "komputermu", ph/f, v/f, double letters), and pronunciations (spoken spelling + ASR variants count as the script word).
- **CHECK BY EAR**: words that still differ after normalisation, with the second (from `vo.words.json` when it matches the script, otherwise from the ASR) and the sentence number (from `vo.parts/parts.json`). Listen at that second: a real mispronunciation is redone with `--sentence N --tries 4`; a sound that is right but spelled differently by the ASR is recorded as a pronunciation variant.
- Speaker similarity (cosine of Resemblyzer embeddings, Apache-2.0; without Resemblyzer the Chatterbox voice encoder is used) against the profile reference and, when given, the comparison voice.

The default script is taken from `vo.parts/parts.json` when `--script` is not given. These numbers are reported at G2 together with the VO clip.

Test (30 s ad VO, a test profile): A first measurement gave a WER of 39.6% for a VO that sounded fine; measured again with the helper-spelling script: raw 30.2%, normalised 11.3% (6/53 words), and CHECK BY EAR down to 4 spots ("ide" -> "ID", Klod, Higsfild, Elevenlebs) that really need listening. With the original script + the default pronunciations: raw 16.3%, normalised 9.4%.

## ElevenLabs

```powershell
$env:ELEVENLABS_API_KEY = "sk_..."     # in the environment, not in a project file
node bin/mgp.mjs voice elevenlabs script.txt --voice <voice_id> -o vo.wav [--model eleven_multilingual_v2] [--save-response response.json]
```

- Calls `POST /v1/text-to-speech/{voice_id}/with-timestamps` (mp3 44.1 kHz). A long script is split per paragraph up to 2,500 characters, with `previous_text`/`next_text` so the intonation carries over.
- The character alignment is turned into words (+ syllables from the original letters) and letters, shifted in time per piece. Words with digits are spread evenly according to their spoken form.
- `--voice` may be a stock voice or your own voice clone at ElevenLabs.
- `--reuse response.json` converts a saved response without the network.
- Without a key, the command prints a guide: Claude can use the ElevenLabs connector (`creative_list_voices`, `creative_generate_speech`), then the word timing is taken with `mgp align`.

## Install the local engine

Once per computer, one command:

```bash
node motion-graphics-pro/render/bin/mgp.mjs install voice --detach      # in the background; progress: mgp install voice --status
node motion-graphics-pro/render/bin/mgp.mjs install voice --openvoice   # also the openvoice engine (+122 MB)
node motion-graphics-pro/render/bin/mgp.mjs install voice --dry-run     # show the decisions only (OS, GPU, PyTorch build, disk)
```

What `mgp install voice` does:

1. Detects the OS, architecture, GPU + VRAM + driver + compute capability, RAM, free disk, and Python 3.10–3.12 (3.12 first). When Python is missing, the command prints how to install it (winget / brew / apt).
2. Picks PyTorch 2.6.0: `cu126` (NVIDIA driver ≥ 528.33 Windows / ≥ 525.60 Linux), `cu118` (older driver), MPS (Apple Silicon, PyPI wheel), ROCm 6.2.4 (AMD on Linux, not tested yet), or CPU (`--cpu` forces it). Intel Mac and Windows ARM are not supported: use ElevenLabs or your own recording.
3. Creates the venv `%USERPROFILE%\.mgp\venv-voice` (`~/.mgp/venv-voice`). On Windows without Long Paths, a venv path > 60 characters is refused before pip can fail halfway.
4. Downloads the torch wheel itself (resume + sha256 from the PyTorch index), then the locked packages `render/py/requirements-voice.txt` with `--no-deps` (chatterbox-tts pulls in gradio etc., which are not used; `webrtcvad-wheels` replaces webrtcvad, which must be compiled).
5. Downloads the weights locked per commit + sha256 (`render/py/model-manifest.json`) to `~/.mgp/model/`: Chatterbox Multilingual 2.99 GB, faster-whisper small 0.45 GB, OpenVoice V2 0.12 GB (optional). Resemblyzer ships its weights in the pip package. A broken download continues from where it stopped; run the same command again.
6. Writes `~/.mgp/install.json` (old: `~/.rekam/pasang.json`). `mgp voice` and `mgp transcribe` read it automatically (env `MGP_PYTHON`, `MGP_CHATTERBOX_DIR`, `MGP_OPENVOICE_DIR`, `MGP_WHISPER_CACHE` still win when set).
7. Smoke test: one sentence with the **built-in** Chatterbox voice (the model's `conds.pt`, not anyone's profile), GPU through the shared lock. The device and the time are printed.

When `~/.mgp` does not exist but the old `~/.rekam` does, the old folder is used as it is.

Already installed by hand (old venv, your own model folder, or env)? `mgp install voice --status` recognises it, then `mgp install voice --adopt` checks the sha256 and registers it in `install.json` without downloading again. `--fresh` installs fresh in the base folder (old flag `--baru`). `mgp install --stop` stops a background install (old flag `--hentikan`).

### Manual way

The steps below are for when `mgp install` cannot be used (e.g. a machine without internet access to Hugging Face, or when you want to manage the venv yourself). Everything goes into the venv `render/.venv` (used automatically; another venv through `--python` or env `MGP_PYTHON`). The CPU version of PyTorch is enough. With an NVIDIA GPU with VRAM ≥ 4 GB, install CUDA PyTorch (see [NVIDIA GPU](#nvidia-gpu-pytorch-cuda)); the engine then chooses the GPU by itself through the mgp device manager (`render/py/device.py`, old name `perangkat.py`): free VRAM is checked, the GPU is used in turn through the shared lock, and when CUDA runs out of memory the job is retried on the CPU. Every command prints the device and the reason, e.g. `device [voice speak chatterbox]: GPU (CUDA): free VRAM 3.8 GB of 4.0 GB, needs 3.2 GB`. Force it with env `MGP_DEVICE=auto|cpu|cuda|mps`. `mgp doctor` (old `rekam cek-mesin`) advises local clone vs ElevenLabs from the RTF measured on that machine.

```bash
cd motion-graphics-pro/render
python -m venv .venv
# Windows: .venv/Scripts/python ; Linux/macOS: .venv/bin/python
.venv/Scripts/python -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install --no-deps chatterbox-tts==0.1.7
.venv/Scripts/python -m pip install "numpy<2" librosa==0.11.0 s3tokenizer transformers==5.2.0 diffusers==0.29.0 resemble-perth conformer==0.3.2 safetensors==0.5.3 pyloudnorm omegaconf soundfile faster-whisper
# optional: speaker similarity
.venv/Scripts/python -m pip install webrtcvad-wheels && .venv/Scripts/python -m pip install --no-deps resemblyzer
# optional: openvoice engine
.venv/Scripts/python -m pip install --no-deps git+https://github.com/myshell-ai/OpenVoice.git
.venv/Scripts/python -m pip install unidecode eng_to_ipa inflect jieba pypinyin cn2an
```

Install notes:

- `chatterbox-tts` is installed with `--no-deps` because the package pulls in `gradio` (only for the web demo) and Japanese/Chinese text packages that Indonesian does not use.
- Windows without *long paths*: a long venv path makes pip fail to install the PyTorch headers (`[Errno 2] No such file or directory ... predicated_tile_access_iterator_residual_last.h`). Put the venv on a short path (e.g. `C:\Users\<name>\vsu`), then `--python C:\Users\<name>\vsu\Scripts\python.exe`, or enable Long Paths in Windows.
- `resemblyzer` needs `webrtcvad`, which must be compiled on Windows; `webrtcvad-wheels` provides the same module prebuilt.
- The models are downloaded once on first use, to the Hugging Face cache. On a slow connection, download them by hand and point to them: `MGP_CHATTERBOX_DIR=<folder with ve.pt, t3_mtl23ls_v2.safetensors, s3gen.pt, grapheme_mtl_merged_expanded_v1.json, conds.pt, Cangjie5_TC.json>` and `MGP_OPENVOICE_DIR=<folder with converter/config.json, converter/checkpoint.pth>`.

| Engine | Download | Disk | RAM while running | CPU speed (Intel Core Ultra 7 165H, 16 threads) |
|---|---|---|---|---|
| chatterbox | 3.2 GB | 3.2 GB | ~4 GB | RTF 4.5-5.3 (a 30 s VO takes about 2.5-3 minutes), clone ~40 s |
| openvoice | + 131 MB | + 131 MB | + 0.5 GB | RTF ~5.4 (Chatterbox + conversion ~0.6) |
| faster-whisper small | 464 MB | 464 MB | ~1 GB | ~0.3x the audio length |

RTF = compute seconds / audio seconds. RTF 3 means a 60 second narration needs 3 minutes.

### NVIDIA GPU (PyTorch CUDA)

NVIDIA driver ≥ 560 is enough for the `cu126` build (newer drivers also run `cu124`). The torch wheel download is ±2.5 GB; on a slow connection, download it first into a cache folder with `curl -C -` (resumable when it breaks off), compare the sha256 with the PyTorch index, then install offline:

```bash
mkdir -p C:/Users/<name>/vsu-whl/cu126 && cd C:/Users/<name>/vsu-whl/cu126
B=https://download.pytorch.org/whl/cu126
curl -L -C - --retry 10 -o torch-2.6.0+cu126-cp312-cp312-win_amd64.whl      "$B/torch-2.6.0%2Bcu126-cp312-cp312-win_amd64.whl"
curl -L -C - --retry 10 -o torchaudio-2.6.0+cu126-cp312-cp312-win_amd64.whl "$B/torchaudio-2.6.0%2Bcu126-cp312-cp312-win_amd64.whl"
sha256sum *.whl      # compare with #sha256=... at https://download.pytorch.org/whl/cu126/torch/
<python venv> -m pip install --no-deps --no-index --force-reinstall ./torch-2.6.0+cu126-*.whl ./torchaudio-2.6.0+cu126-*.whl
<python venv> -c "import torch; print(torch.__version__, torch.cuda.is_available())"   # 2.6.0+cu126 True
```

`--no-deps` is safe because the torch dependencies (sympy, networkx, jinja2, fsspec, filelock) are already there from the CPU build. Keep the venv on a short path (e.g. `C:\Users\<name>\vsu`) so the Windows long-path limit does not come back. To go back to the CPU, also keep the `torch-2.6.0+cpu` and `torchaudio-2.6.0+cpu` wheels (±210 MB) and install them with the same command, or online: `pip install --force-reinstall --no-deps torch==2.6.0+cpu torchaudio==2.6.0+cpu --index-url https://download.pytorch.org/whl/cpu`.

faster-whisper (ctranslate2) uses the GPU too: mgp borrows the cuBLAS/cuDNN DLLs shipped with the PyTorch CUDA wheel, so the CUDA Toolkit does not need to be installed.

Measured 05-11-2026, laptop Core Ultra 7 165H + RTX 500 Ada Laptop **4 GB**, driver 595.95, 47-word test script, profile uji-zira, Chatterbox fp32:

| Device | Synthesis RTF | Total `speak` time (audio ±30 s) | Peak VRAM (reserved) | WER / CER | Similarity to reference |
|---|---|---|---|---|---|
| CPU (laptop fairly idle) | 5.0–5.2 | 167–219 s | - | 12.8% / 5.0% | 0.924 |
| CPU while the laptop is busy (another session, free RAM ±6 GB) | 18.4 | 683 s | - | - | - |
| GPU CUDA (cu126) | **1.20–1.26** | **75–81 s** | **3.54 GB** | 17.0% / 6.3% | 0.921 |

- GPU is ±4x faster (30 s VO: ±38 s synthesis + ±10 s model load). It fits in 4 GB without fp16/bf16, so the precision stays fp32: no quality risk and no extra code. The WER/CER difference between CPU and GPU comes from a different random sampling order per device (the same seed does not give the same audio on CPU and GPU), not from precision; voice similarity is the same (0.92).
- The estimate in `render/py/hardware-requirements.json` (old name `kebutuhan.json`): Chatterbox `vram_gb` 3.2 + margin 0.5 = needs 3.7 GB free. A free 4 GB card (3.8 GB) passes; when another app is using VRAM, mgp chooses the CPU and writes down the reason.
- The fallback path was tested with `MGP_DEVICE=cuda MGP_GPU_LIMIT=1.5`: OOM happened while loading the model, the GPU was released, the job was retried on the CPU, and the VO was still made (RTF 5.1, JSON `fallback: "oom"`; old key `cadangan`).
- `voice score` (faster-whisper small, float16) on the GPU: 12–20 s per VO including model load.

## Test results

Test 05-11-2026 on Windows 11, Intel Core Ultra 7 165H CPU (no CUDA), PyTorch 2.6.0 CPU. The "user" was simulated with Windows SAPI voices (Zira, female; David, male) reading the Indonesian template, so the reference itself has an English accent: Whisper transcribed the Zira reference with WER 70% / CER 17%. The 47-word test script (two paragraphs, one question, one exclamation, the number "2025") differs from the template. WER and CER from faster-whisper `small --language id` against the script; similarity = cosine of Resemblyzer embeddings (same voice ≈ 0.99, Zira vs David = 0.56).

| Output | WER | CER | Similarity to reference | Similarity to the other voice | RTF |
|---|---|---|---|---|---|
| Chatterbox, Zira clone (default) | 12.8% | 5.0% | **0.92** | 0.53 | 5.0 |
| Chatterbox, David clone | 14.9% | 6.3% | 0.89 | 0.55 | 5.2 |
| Chatterbox, built-in model voice (no clone) | 14.9% | 7.1% | 0.59 | 0.67 | 4.5 |
| Chatterbox, Zira clone, `--emotion energetic --speed 1.1` | 21.3% | 11.3% | 0.93 | 0.55 | 4.7 |
| Chatterbox + OpenVoice, Zira clone | 25.5% | 8.8% | 0.93 | 0.58 | 5.4 |
| Chatterbox, Zira clone, English | 6.4% | 2.8% | 0.95 | 0.57 | 5.3 |
| Voice conversion only: OpenVoice, David → Zira | (same as the source) | 15.3% (source 14.9%) | 0.89 | 0.65 | 0.6 |
| Voice conversion only: Chatterbox VC, David → Zira | | 22.0% | 0.91 | 0.59 | 1.8 |

Conclusions:

- **The clone works**: similarity to the reference rises from 0.59 (built-in voice) to 0.92, and the David clone still sounds like David (0.89), not Zira.
- **Indonesian is clearly intelligible**: through the `ms` code, the VO is much clearer than its own reference (CER 5% vs 17%). The remaining errors are small: "genap" read as "jenat", "karena" as "kerena", "di rak" as "dirak" (ASR spelling). The accent sounds slightly Malay.
- **The energetic emotion** adds expression but also mispronunciations (one phrase was mumbled); use it sparingly and listen to the result.
- **OpenVoice** does not add similarity (0.93 vs 0.92) but lowers clarity, so it is not the default; it remains available as `--engine openvoice`.
- Default engine: **chatterbox**.
- `inspect` refuses recordings without the consent sentence (score 0.35), an 8.5 s recording, 9.7% clipping, and 8 kHz; a noisy recording (SNR 22.6 dB) gets a WARN.
- Word/syllable/letter timing is written for every VO (47 words, 112 syllables). The accuracy of `mgp align` was measured separately (see `render/README.md`); on Chatterbox VO it has not been measured against manual annotation yet.
- Not tested yet: real human voices, phone recordings, and long scripts (> 1 minute). ElevenLabs was only tested with a mock response (`--reuse`), without calling the API.

## Engines evaluated

| Engine | Licence (code / weights) | Indonesian | Status |
|---|---|---|---|
| Chatterbox Multilingual (Resemble AI) | MIT / MIT ([repo](https://github.com/resemble-ai/chatterbox), [model](https://huggingface.co/ResembleAI/chatterbox)) | no `id`; Malay `ms` is used (23 languages: ar da de el en es fi fr he hi it ja ko ms nl no pl pt ru sv sw tr zh) | **default**, tested |
| OpenVoice V2 tone color converter (MyShell) | MIT / MIT ([repo](https://github.com/myshell-ai/OpenVoice), [model](https://huggingface.co/myshell-ai/OpenVoiceV2)) | language-independent (tone colour only) | optional `--engine openvoice`, tested |
| Chatterbox VC (s3gen) | MIT / MIT | language-independent | tested for comparison, not used (worse CER) |
| kNN-VC (bshall) + WavLM-Large | MIT / MIT ([repo](https://github.com/bshall/knn-vc), [WavLM](https://github.com/microsoft/unilm)) | language-independent | licence checked, weights downloaded, **not tested yet**; the paper says it needs several minutes of reference, while this template is ~30 s |
| Piper `id_ID-news_tts-medium` | MIT code (old piper) / GPL-3 (piper1-gpl); the model card says "See URL" for the dataset and points to another corpus | yes | not used: unclear weight licence ([card](https://huggingface.co/rhasspy/piper-voices/tree/main/id/id_ID/news_tts/medium)) |
| XTTS v2, F5-TTS, Fish-Speech, MMS-TTS | CPML / CC-BY-NC / non-commercial / CC-BY-NC | some | excluded: the weights may not be used commercially |

## Limits

- Chatterbox has no Indonesian language code. Indonesian is read with the Malay code (`ms`): the spelling is almost the same, but the accent can sound slightly Malay, and loanwords or abbreviations can be mispronounced. Use pronunciations (`pronunciations.txt`, see Speak) for brands and abbreviations ("SMA = es-em-a"); the script stays written normally.
- A zero-shot clone imitates the tone colour and general style, not a distinctive accent or speaking habit. For a voice that is really close, use your own narration recording (choice c) or an ElevenLabs professional clone from a longer recording.
- The result of each sentence can differ slightly between seeds. For a mispronounced sentence: redo only that sentence with `--sentence N --tries 4` (or another `--seed`), add a pronunciation, or split the sentence.
- Synthesis on a CPU is slow for long scripts; make the VO per block.
- The tests above used Windows SAPI voices as the "user", so similarity and WER numbers for human voices can differ.
