# mgp

mgp (old name: Rekam) turns HTML compositions into video. The page is opened in the Chrome or Edge you already have, time is seeked frame by frame, every frame is captured as PNG, and ffmpeg assembles the frames into MP4, ProRes, WebM or a PNG sequence. Everything runs on your own computer: no account, no cloud, and no internet needed.

mgp is the built-in renderer of the Motion Graphics Pro skill, written for this package. Its format is compatible with HyperFrames-style HTML compositions (`data-*` attributes, `window.__timelines`, `<template>` scenes), so older compositions render without installing anything; neutral and old names are listed under "Compatibility".

## Requirements

- Node.js 22 or newer
- ffmpeg and ffprobe on PATH (or set `MGP_FFMPEG` / `MGP_FFPROBE`)
- Google Chrome, Microsoft Edge or Chromium. mgp finds it by itself:
  - Windows: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, `C:\Program Files\Google\Chrome\Application\chrome.exe`, and Chrome in `%LOCALAPPDATA%`
  - macOS: `/Applications/Google Chrome.app`, `/Applications/Microsoft Edge.app`, Chromium, Brave
  - Linux: `google-chrome`, `chromium`, `chromium-browser`, `microsoft-edge`
  - browsers downloaded by Playwright (`ms-playwright`)
  - any other path through `--browser <path>` or env `MGP_BROWSER`
- Optional, only for `mgp cutout`, `mgp transcribe` and `mgp voice`: Python 3.9+ with `rembg`, `faster-whisper` and/or `chatterbox-tts` (see each section). Every other command needs only Node.js and ffmpeg.

## Install

No `npm install`. mgp uses only built-in Node.js modules: the browser is driven by mgp's own Chrome DevTools Protocol client (`src/cdp.mjs`, no playwright-core), and the commonly used fonts are bundled in `fonts/`. Copy this folder and run it right away:

```bash
cd motion-graphics-pro/render
node bin/mgp.mjs --help
node bin/mgp.mjs check examples/kinetic-9x16.html
```

To use the `mgp` command from any folder, run `npm link` in this folder (it only creates a link, nothing is downloaded), or call it by path: `node <path-to-render>/bin/mgp.mjs check index.html`. The old entry `bin/rekam.mjs` (command `rekam`) still works. No `node_modules/` folder is needed.

How mgp talks to the browser:

- Chrome/Edge is launched headless with a temporary profile and the same switches as earlier mgp renders (pixel-identical output: the frame hashes of the examples match the playwright-core version).
- By default through a pipe (`--remote-debugging-pipe`, fd 3/4; also on Windows). `MGP_CDP=port` uses `--remote-debugging-port=0` + `DevToolsActivePort` + the WebSocket built into Node 22.
- `MGP_NO_SANDBOX=1` adds `--no-sandbox` (automatic when running as root on Linux, e.g. in a container).
- `MGP_ARGS="--flag ..."` adds Chrome switches, e.g. `MGP_ARGS=--proxy-server=http://127.0.0.1:9` to test a render without internet (the local mgp server stays reachable).

Every `MGP_*` variable also reads its old `REKAM_*` name as a fallback (table in `src/names.mjs`).

## Message language

Messages are in English by default. Set `MGP_LANG=id` for Indonesian; this also happens automatically when `LC_ALL`, `LC_MESSAGES` or `LANG` starts with `id`. `MGP_LANG=en` forces English. The Python scripts and Studio follow the same setting. Catalogs: `i18n/<lang>/<module>.json`.

## Usage

```bash
mgp new projects/ad --aspect 9:16 --duration 30 --title "Ad"   # open a standard project (see below)
mgp check index.html                         # check before rendering (also project.json)
mgp preview index.html --open                # local server + scrubber at http://127.0.0.1:4600
mgp frame index.html --t 3.2 -o f.png        # one frame
mgp contact index.html --n 12 -o contact.png # contact sheet of 12 frames
mgp contact index.html --var blocking=true --times poses -o blocking.png   # key poses (blocking stage)
mgp render index.html -o out.mp4             # full render
mgp render index.html --var title="Chapter 4" -o ch04.mp4   # change a composition variable
mgp audit projects/ad                        # one quality report -> review/audit.md

mgp media look clip.mp4 --look warm -o clip_warm.mp4      # look / colour grade
mgp media brighten dark.mp4 -o bright.mp4                # dark or dull footage
mgp media effects photo.jpg --effect duotone -o duo.jpg   # stylise or obscure
mgp audio normalize voice.wav -o voice_-14.wav            # loudness -14 LUFS
mgp cutout person.mp4 -o person.webm                     # remove the background, output with alpha
mgp transcribe voice.wav -o words.json --language id --fix-with script.txt
mgp voice clone recording.wav --name budi                # local voice profile from a ~30 s recording
mgp voice speak script.txt --profile budi -o vo.wav      # VO + vo.words.json + vo.letters.json
mgp voice elevenlabs script.txt --voice <id> -o vo.wav   # ElevenLabs /with-timestamps
```

`mgp --help` lists every command; each has its own `--help`. Old Indonesian names (v2.3 / v2.4-dev) still work: mgp translates the command, subcommand, flag and flag value before parsing and prints one short note on stderr. The old -> new tables are in `src/names.mjs`. The main commands:

| Old name | New name |
| --- | --- |
| `rekam` | `mgp` |
| `baru`, `cek` (`lint`), `cek-mesin` (`machine`), `pratinjau`, `kontak`, `kurva` | `new`, `check`, `doctor`, `preview`, `contact`, `curves` |
| `pasang`, `katalog`, `tambah` | `install`, `catalog`, `add` |
| `media tampilan\|terangkan\|gaya\|banding\|daftar` | `media look\|brighten\|effects\|compare\|list` |
| `audio normal\|ukur` | `audio normalize\|measure` |
| `potong-latar` (`remove-background`), `transkrip`, `selaras` | `cutout`, `transcribe`, `align` |
| `suara periksa\|klon\|ucap\|nilai\|daftar\|hapus` | `voice inspect\|clone\|speak\|score\|list\|remove` |
| `gambar iris\|unduh\|penyedia` | `image slice\|download\|providers` |
| `sfx daftar\|campur\|bukti` | `sfx list\|mix\|proof` |
| `lottie ekspor\|putar\|render\|frame\|cek` | `export --format lottie`, `play`, `render\|frame\|check <anim.json>` |
| `editor`, `snapshot` | `studio`, `frame` |

### `mgp new`: open a project

```bash
mgp new <folder> [--aspect 9:16|16:9|1:1|4:5|21:9|WxH] [--resolution 720|1080|1440|4k] [--fps 24|30|60]
           [--duration 10] [--title "..."] [--font "Poppins,Playfair Display"] [--poses 0,1.5,3] [--lang id|en] [--force] [--json]
```

Writes the standard folders (`assets/{js,fonts,audio,pieces,raw,src,fx}`, `compositions/`, `review/`, `out/`), `brief.md` (template T1), `STATUS.md` (T10 handover), `project.json` (old name: `proyek.json`) and `index.html`. The templates come from `../references/template.md` (English) or `../references/template.id.md` (Indonesian): `--lang id|en` picks the language of `brief.md`, `STATUS.md` and the messages (default: `MGP_LANG`, then `LANG`/`LC_ALL`). Defaults: 9:16, resolution 1080 (short side 1080 px: 1080x1920), 24 fps, 10 s, fonts Poppins + Playfair Display. `index.html` loads `assets/js/motion.js` (mgp.motion), `assets/js/mgp.js` (a copy of `motion-graphics/lib/dist/mgp.js`) and `assets/fonts/fonts.css` (the chosen subset of the bundled fonts) through relative paths: it runs from file:// (small player under the frame, "blocking" box) and through mgp. The composition registers `window.__seek`, `__duration`, `__fps` and `__timelines["main"]`, plus a boolean variable `blocking`: when `true`, time is held at the last key pose (stepped, no interpolation). Key poses live in `POSES` (index.html) and `scenes[].poses` (project.json); by default 4 points spread evenly, rounded to 0.25 s.

Blocks from `mgp add` (sub-compositions with their own timeline in `window.__timelines[id]`) move right away: mgp seeks the sub-composition timeline and the visibility of its host before calling `__seek` (see [Composition contract](#composition-contract)). The template seeks blocks itself only in blocking mode (blocks are held at the key pose too) and in the file:// player. Compositions made before this fix need no change.

Key poses that do not fall on the 1/fps grid (e.g. 13.1 s at 24 fps) are safe: `mgp contact --times poses` takes the **first rendered frame at or after** the key time (frame 315 = 13.125 s), i.e. the first frame where the pose has been reached in the render, and prints the list of shifted keys. A plain list of seconds (`--times 1,2.5`) still goes to the nearest frame. `mgp check` reports off-grid keys as `info`.

### `project.json`

One source of project data: meta, scenes + timing + key poses, VO + `*.words.json` / `*.letters.json`, blocks, captions, SFX, and assets with their provenance. Schema: `../references/project.md`. `mgp check` looks for `project.json` (then the old `proyek.json`) in the composition folder (or one level up) and warns when a referenced file is missing, a block is unknown, an asset has no `source`, fps/size/duration differ from the composition, or the voice source has not been chosen yet. Readers accept the old Indonesian keys; `mgp new` writes the English keys. `mgp contact --times poses` takes the key pose times from there.

### `mgp render`

| Option | Meaning |
| --- | --- |
| `-o out.mp4` | Output. `.mp4` = H.264 yuv420p CRF 18, `.mov` = ProRes 422 HQ, `.webm` = VP9, a folder (`out/`) = PNG sequence |
| `--fps 24\|30\|60` | Render fps. Default: root `data-fps`, `window.__fps`, then 30 |
| `--size 1080x1920` | Output size. A different aspect ratio is letterboxed, not squeezed |
| `--from 2 --to 6.5` | Render a part (seconds) |
| `--scale 2` | Capture with deviceScaleFactor 2 (sharper; can then be scaled down with `--size`) |
| `--workers 4` | Split the frame range over 4 parallel browsers, then join without re-encoding |
| `--audio music.wav@1.5` | Extra track starting at second 1.5 (repeatable) |
| `--no-audio` | No audio (old: `--bisu`) |
| `--captions words.json` | Burn captions from per-word timing (see below; old: `--teks`) |
| `--format prores --transparent` | ProRes 4444 with alpha (the page background must be transparent) |
| `--crf 18 --preset medium` | H.264 quality |
| `--encoder cpu\|auto\|nvenc\|qsv\|amf\|videotoolbox` | MP4 encoder. Default `cpu` (libx264, deterministic). See [Hardware video encoders](#hardware-video-encoders---encoder) |
| `--capture-format jpeg` | JPEG intermediate capture: faster, slightly lossy |
| `--hash` | Print the sha1 of every frame, for determinism tests |
| `--ignore-errors` | Render even when the page has script errors (default: the render fails) |
| `--timeout 120` | Time limit in seconds per page step: ready (default 300 s), one seek or one screenshot (default 120 s); `0` = no limit; env `MGP_TIMEOUT`. Every capture command (`render`, `frame`, `contact`, `check`, `curves`, `audit`) takes it |

**Script errors stop the render.** An uncaught exception on the page, `console.error("[blok] ...")` (a block's mount function threw; `[block] ...` is read too) and `[mgp] failed to load sub-composition` make `mgp render` stop before the first frame, with the error details (exit code 1). Errors that only appear while rendering also give exit code 1 (the file is written, but its frames may be wrong). `--ignore-errors` turns them into warnings. Errors and warnings (failed requests, HTTP 4xx) are always printed with details, also with `--quiet`. `mgp frame` prints script errors but still takes the frame. The `browser:` line names the animation engine the page really uses (`motion 1.0.0` or `gsap 3.x`).

Negative values may be written apart in every command (`--lufs -18 --tp -1.5`), the same as `--lufs=-18`.

**Several mgp commands at once.** Each command starts its own browser process with its own temporary profile (`mgp-profile-*` in the temp folder), its own CDP pipe (no debug port) and its own server port, so `mgp contact`, `mgp frame`, `mgp render --workers 2` and a GPU voice job can run side by side; they only share CPU/GPU time. A page step that does not answer within `--timeout` stops the command with an error that names the step and second (`seek to t=4.2 s did not finish within 120 s ...`), instead of hanging. A renderer crash stops it at once. A WebGL canvas that loses its GPU context (it would come out black) stops the command (`MGP_ALLOW_CONTEXT_LOSS=1` when a composition drops its context on purpose), and `mgp contact` prints a warning for every fully black frame. Ctrl+C / a kill signal closes the browsers and removes their profiles; a browser whose mgp process was killed hard exits on its own when the pipe closes, and profiles left behind are removed after 6 hours.

**Canvas fonts.** `document.fonts.ready` only waits for faces the DOM uses. The runtime records every font a canvas draws with (`fillText`, `strokeText`, `measureText`), loads it with `document.fonts.load` and draws the frame again when a face arrived late, so canvas text never captures the fallback. `mgp check` lists the canvas fonts and warns when a family has no `@font-face` and no system font (it falls back), when no declared face fits the weight/style, or when text drawn once while the page started (not inside a seek) was drawn before its font loaded.

After rendering, check the result:

```bash
ffprobe -v error -count_frames -show_entries stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration -of compact out.mp4
```

### `mgp check`

Checks:

- the duration is readable and sensible
- there is a time driver (`__seek`, `__timeline`, a HyperFrames-format timeline, GSAP global, CSS animation, or an rAF loop)
- every `data-composition-id` composition registers a timeline
- size and aspect ratio (9:16, 16:9, 1:1, 4:5), even dimensions
- images, fonts, audio and other files that failed to load (404), script errors (exceptions, also `[blok] ...` from a block that failed to mount)
- blocks and scenes (sub-composition timelines): seeked to 30/60/90% of their range. When the playhead does not follow local time = ERROR "block ... is not seeked" (the block will not move in the render); when the region is identical at all three points = WARN (covered by another layer, or still)
- identical first, middle and last frames: ERROR when a timeline contains tweens (the driver does not move its timeline), WARN otherwise
- fonts used by text: loaded through `@font-face` (from the local bundle or not), or relying on a system font; fonts requested from Google Fonts but missing from the `fonts/` bundle (WARN when loaded over the internet, ERROR when they fail to load, e.g. offline), also fonts used only on canvas
- canvas fonts (`ctx.font` of every `fillText`/`strokeText`/`measureText` during the check): WARN when the family is not declared and not on the system (the canvas draws with the fallback), when no declared face fits, or when it depends on a system font
- risky patterns: `Date.now()`, `setTimeout`/`setInterval`, `repeat: -1`, `<audio>` without `id`
- determinism: three time points are seeked, then seeked again after jumping elsewhere; the PNG hashes must match
- text layout, swept every 0.25 s (at most 240 points, set with `--samples`):
  - text below the reading floor: smaller than 2.6% of the canvas short side (28 px at 1080) and shown for 0.5 s or longer
  - text leaving the canvas, text overflowing its box, text clipped by its own box, and text clipped by an `overflow: hidden` container
  - findings that appear at a single point only (usually an entrance or exit) are logged as `info`, not warnings; tolerance `--tolerance 2` (px)
  - exceptions follow HyperFrames: `data-layout-allow-overflow`, `data-layout-bleed`, `data-layout-ignore`
- `fitTextFontSize` / `MGP.fitText`: text that does not fit even at `minFontSize`, and measurements taken before the font loaded
- composition variables: the values used, and CLI values of the wrong type, outside `min`/`max`, not an `enum` option, or not declared (`--strict-variables` makes these an ERROR)
- old page hooks and attributes (`__rekam`, `__kurva`, `rekam:size`, `rekam-seek`, ...): still read, reported with their new names

`--json` prints a machine-readable result. Exit code 1 when there is an ERROR. `mgp check anim.json` checks a Lottie file instead (see [Lottie](#lottie)).

### `mgp audit`: one quality report

```bash
mgp audit <project-folder|composition.html> [--json] [--platform tiktok|reels|shorts|youtube|feed] [--skip curves,vo] [--fast] [--quiet]
```

Runs the sub-checks through the mgp CLI itself (`--json`), one at a time (light load; the VO score is forced to the CPU), gives PASS / WARN / ERROR per criterion plus an overall verdict, and writes `review/audit.md` + `review/audit.json` in the project folder. With a folder, the composition is `project.json` `composition` (default `index.html`).

| Criterion | What is checked |
| --- | --- |
| `check` | `mgp check`: script errors, blocks that do not move, text layout |
| `curves` | `mgp curves`: linear motion, pops, abrupt starts/stops, squash without constant volume |
| `safe` | text inside the safe zone for the project aspect ratio and `--platform` |
| `vo` | voice-over score (normalised WER) with CHECK BY EAR spots, when the project has a VO |
| `loudness` | integrated loudness and peak of the master: target -14 LUFS; WARN beyond ±1 LU or peak above -1 dB, ERROR beyond ±3 LU or peak above 0 dB |
| `project` | `project.json` consistency: missing files, duration mismatches, gates not approved (status words in English or Indonesian, see `references/project.md`) |
| `assets` | provenance and licence fields of every asset |

Safe zones are measured on the glyphs (the Range rects of each element's text, after transforms), not the element box: a full-width centred title only counts the width of its words. Safe zones: 9:16 with `tiktok`, `reels` or `shorts`: words in the 168-1330 px band (of 1920), clear of the right-hand buttons; 9:16 otherwise (also `feed`): top 9% empty, bottom 20% free of text; 16:9: the central 90% (title safe); 1:1: a 6% margin; 4:5: a 6% margin, and the grid preview crops to the central 3:4, so keep titles off the top/bottom edge; 21:9: the central 80%. `--skip <ids>` marks criteria as skipped (WARN). `--fast` does not run the VO score (a saved score is reused). Exit code 1 when the verdict is ERROR.

### `mgp doctor`

```bash
mgp doctor          # short
mgp doctor --json   # profile + recommendations for Claude to read
```

Old name: `rekam cek-mesin` (alias `machine`). Profiles the computer and gives advice per pipeline:

- CPU (name, threads), total and free RAM
- every GPU: NVIDIA through `nvidia-smi` (total/free VRAM, driver), other GPUs (Intel/AMD/Apple) through WMI, `system_profiler` or `lspci`. Missing tools are skipped, not errors.
- ffmpeg version and hardware H.264 encoders (`nvenc`, `qsv`, `amf`, `videotoolbox`). Every compiled-in encoder is **test-encoded** on a 15-frame clip, because an encoder can exist in ffmpeg while its device/driver does not (see the NVENC example below).
- the PyTorch and ctranslate2 build in `MGP_PYTHON` / `--python` (cpu, cuda, mps)
- GPU lock status and the voice RTF last measured on this machine (`%LOCALAPPDATA%\rekam\ukur.json`, written automatically by `mgp voice speak`; the folder and file names are kept so old and new versions share them)

Advice:

| Pipeline | Advice |
|---|---|
| Voice (local clone) | GPU/CPU, estimated seconds per 30 s of VO from the measured RTF; on a weak machine (RTF > 8 or free RAM < 5 GB): ElevenLabs or your own recording |
| Local image | fully local (VRAM ≥ 12 GB), local with offload (VRAM ≥ 4 GB + free RAM ≥ 16 GB), or cloud |
| Render | `--workers` (threads/4, limited by free RAM and at most 4; 2 when the computer is used by another session), final vs draft encoder, and whether a draft should use half `--size` |

All thresholds are in one table: `py/hardware-requirements.json` (old name: `kebutuhan.json`; also used by the Python device manager). How to use the result: `../references/hardware.md`.

### `mgp install`: local engines once per computer

```bash
mgp install all --dry-run             # decisions only: OS, GPU, driver, PyTorch build, device, disk
mgp install voice --detach            # install in the background (or: image | cutout | all); --cpu, --openvoice, --folder <dir>
mgp install cutout                    # rembg + U2-Net for mgp cutout (own venv, CPU, ~0.6 GB); a hand-made rembg venv: --adopt
mgp install all --status [--json]     # status of every part: present / missing / downloading x% / installing / broken
mgp install all --adopt               # use an existing manual install (sha256 checked), no new download
mgp install --stop                    # stop the background process (run the command again to continue)
```

Old names: `rekam pasang suara|gambar|semua`, `--kering`, `--latar`, `--cek`, `--adopsi`, `--hentikan`, `--baru`.

Models are not in the ZIP; the recipe is: `py/model-manifest.json` (Hugging Face repo + commit + sha256 + size per file) and the package locks `py/requirements-voice.txt`, `py/requirements-voice-openvoice.txt`, `py/requirements-image.txt`, `py/requirements-cutout.txt` (U2-Net: a GitHub release asset, own `url` + sha256 in the manifest).

The mgp home folder is `~/.mgp` (Windows `%USERPROFILE%\.mgp`; env `MGP_HOME`, old `REKAM_RUMAH`). When `~/.mgp` does not exist but the old `~/.rekam` does, `~/.rekam` is used as it is; old file names (`pasang.json`, `pasang.log`, `venv-suara`, `venv-gambar`) are still found, and installed models are never moved.

| Step | What happens |
|---|---|
| Detect | OS, architecture, GPU (nvidia-smi: VRAM, driver, compute capability; WMI/system_profiler/lspci), RAM, disk, Python 3.10–3.12 (3.12 first; without Python the winget/brew/apt command is printed) |
| PyTorch 2.6.0 | `cu126` driver ≥ 528.33 (Win) / 525.60 (Linux); `cu118` older driver or compute capability < 5.0; `pypi` (MPS) Apple Silicon / Linux ARM; `rocm6.2.4` AMD on Linux (not tested yet); `cpu` otherwise or with `--cpu`. Intel Mac and Windows ARM: not supported |
| Venv | `<home>/venv-voice`, `<home>/venv-image`. Windows without Long Paths: a venv path over 60 characters is refused up front |
| Packages | the torch wheel is downloaded by mgp (resume + sha256 from the PyTorch index; a matching local wheel is reused), then `pip install --no-deps -r py/requirements-*.txt`. The image venv borrows torch from the voice venv through `zz_mgp_torch.pth` (old `zz_rekam_torch.pth`; pip runs while the `.pth` is switched off) |
| Models | `<home>/model/chatterbox` (2.99 GB), `model/openvoice` (0.12 GB, `--openvoice`), `model/hf` (faster-whisper small 0.45 GB; FLUX.2 klein 4B GGUF + Qwen3-4B GGUF + VAE 4.92 GB). HTTP Range, retried when a download breaks off, size + sha256 checked |
| Locations | `<home>/install.json` (old `pasang.json`); `mgp voice`, `mgp transcribe`, `mgp image` and `mgp doctor` read it when the env variables (`MGP_PYTHON`, `MGP_IMAGE_PYTHON`, `MGP_CHATTERBOX_DIR`, `MGP_OPENVOICE_DIR`, `MGP_WHISPER_CACHE`, `MGP_IMAGE_MODEL`) are empty |
| Smoke test | voice: one sentence with the built-in Chatterbox voice; image: one 512 px image. GPU through the shared lock; device and time are printed |
| Background | `--detach`: detached child process, log `<home>/install.log`, status `<home>/install-status.json` (read by `--status`). One install at a time |

`MGP_HOME` moves the home (`install.json`, log, status); `--folder` moves the venvs + models only. More options: `mgp install --help` (`--fresh`, `--components`, `--skip-test`, `--force`, `--verbose`, `--base-python`).

### `mgp preview`

Opens a local server with a scrubber page: slider per frame, play button, step per frame (arrows), per second (Shift + arrows), loop, and sound. Preview uses the same runtime as render, so what you see in the preview is what the render gives.

### `mgp curves`

Motion QC: a value + speed graph per element (`--selector ".a, #b"`, `--max 8`, `-o curves.png`, `--json`); flags linear motion, pops, abrupt starts/stops and squash without constant volume. A canvas composition can expose its channels through `window.__curves = (t) => ({ name: number, ... })` (old name `window.__kurva`).

- Every channel that appears in any sample is analysed (a channel may start later); a frame without that key is a gap.
- Frames where an element is not shown (`display:none`, `visibility:hidden`, an ancestor hidden) are gaps: no speed is measured into or out of them, so an element that appears or disappears is not an "abrupt start" of thousands of px/s.
- Volume: a mirror (`scaleX(-1)`) and a uniform scale are not squash; out-of-plane rotation (`rotateY`, perspective) is measured by its 3D axis lengths, not read as squash; during a uniform scale-in the area may lie between the rest areas before and after.
- Speed: frames are seeked and sampled in batches inside the page (one round trip per 12 frames); only the picked elements' series leave the page.

## Composition contract

mgp injects a small runtime as the first script in `<head>`. The runtime freezes `Date`, `performance.now` and `requestAnimationFrame` to virtual time, fills `Math.random` with a seeded generator, and looks for a time driver in this order:

1. **`window.__seek(t)`**: a function that draws the frame for second `t`. It may return a Promise. Suits canvas, Three.js, hand-written SVG and the `motion-graphics/lib` library. Sub-composition timelines (`window.__timelines[id]` whose `[data-composition-id="id"]` host is not the root, e.g. blocks from `mgp add`) are still seeked by mgp to their local time, together with the visibility of their host, **before** `__seek` is called; `__seek` may override that (e.g. to hold a block at a key pose). The root timeline and timelines without a host are left to `__seek`. The same holds for the `__timeline` and GSAP global drivers. Turn it off with `window.__mgpNoSubSeek = true` (old name `__rekamTanpaSubSeek`).
2. **HyperFrames format** (driver `composition`): root `[data-composition-id]` and `window.__timelines`. Every timeline is seeked to the local time of its composition.
3. **`window.__timeline`**: one GSAP-style timeline (or any object with `totalTime()`, `duration()`, `pause()`).
4. **GSAP global timeline** (driver `gsap-global`): plain tweens without a timeline; `gsap.globalTimeline` is seeked.
5. **CSS animations / Web Animations** (driver `css`): `document.getAnimations()` are paused and `currentTime` is set.
6. **rAF loop** (driver `raf`): `requestAnimationFrame` callbacks run once per frame with `performance.now()` = t. Only correct when the drawing is computed from time, not from a frame count.

Without any of these the driver is `static`. CSS animations, `<video>`, Lottie (`window.__mgpLottie`, old `window.__hfLottie`), anime.js (`window.__mgpAnime`, old `window.__hfAnime`) and `mgp-seek` / `hf-seek` / `rekam-seek` listeners are always seeked, whatever the main driver. The `mgp-seek` event (old name `rekam-seek`, still sent) is dispatched after every timeline and `__seek` are done, so it suits copying the final state of a frame (used by `BLOCK.mirror` in transition blocks).

The runtime is `window.__mgpRuntime` (old name `window.__rekam`, the same object) with `ready()`, `seek(t)`, `blockTimelines()` and `time` (old names `siap`, `timelineBlok`, `waktu`). It also sets `window.__mgpInitFps` to the composition fps, which mgp.motion uses to read start values on the frame grid (see `motion-graphics/lib/motion/README.md`). CLI variable values arrive as `window.__mgpVars` (old `__rekamVars`).

**Scene styles are scoped.** `<style>` inside a `data-composition-src` scene (the `<template>` content) applies only to its host, as in HyperFrames: selector `S` is rewritten to `:where([data-mgp-scope="n"]) :is(S)` (same specificity as the original), `html`/`body`/`:root` become that host, and `@keyframes`/`@font-face` stay global. So `#root { background }` of s01 no longer hits `#root` of s02 or the main root. Opting out: `<style data-global>` in the scene, or the `data-css-global` attribute on the host.

Metadata read:

| Data | Source (first one present) |
| --- | --- |
| Duration | `window.__duration` (number or function), root `data-duration`, `__timeline.duration()`, end of the timelines, end of the CSS animations, `--duration` |
| Size | `window.__size = {width, height}`, `window.__width/__height`, root `data-width/height`, `<meta name="mgp:size" content="1080x1920">` (old `rekam:size`), `--viewport` |
| fps | `--fps`, `window.__fps`, root `data-fps`, 30 |
| Ready | `document.fonts.ready`, every `<img>` decoded, every timeline registered, `window.__mgp.buildReady` / `window.__hf.buildReady`, `window.__ready` (Promise) |

Smallest example:

```html
<!doctype html>
<html><head><meta name="mgp:size" content="1080x1920"></head>
<body style="margin:0">
<canvas id="c" width="1080" height="1920"></canvas>
<script>
  const ctx = document.getElementById("c").getContext("2d");
  window.__duration = 5;
  window.__fps = 30;
  window.__seek = (t) => {
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = "#fc3"; ctx.fillRect(100 + t * 150, 900, 120, 120);
  };
  window.__seek(0);
</script>
</body></html>
```

### Audio

- Every `<audio>` (and `<video data-has-audio="true">`) is mixed into the output: `data-start` (second in the video), `data-media-start` or `data-trim-start` (start point in the file), `data-duration`, `data-trim-end`, `data-volume`, `data-playback-rate`. `data-start` inside a sub-composition is relative to its host.
- `--audio file@offset` adds a track from outside the page.
- With `--from`, the audio shifts along.
- Audio files must be local (under the server root). For a PNG sequence, the audio is written as `audio.wav` in the same folder.

### Burned-in captions

`--captions words.json` (old `--teks`) accepts `[{ "text": "Hello", "start": 0.3, "end": 0.7 }, ...]` (the output of `mgp transcribe`), the output of `npx hyperframes transcribe --json`, or `{ "words": [...] }` / `{ "segments": [{ "words": [...] }] }`. Words are grouped by at most 4 (`--captions-words`), broken at 150 ms pauses or punctuation, and the word being spoken is coloured (`--captions-color`). Other options: `--captions-size 64`, `--captions-font "Poppins"`, `--captions-bottom 22` (percent from the bottom). For more elaborate caption styles, write the captions in the composition yourself.

### Fonts without internet

`fonts/` holds 24 OFL-licensed font families as WOFF2 (latin + latin-ext subsets; Noto Naskh Arabic also arabic), 3.7 MB: Fraunces (variable, opsz axis), Geist, Geist Mono, Cinzel, Inter, Poppins, Space Grotesk, Playfair Display, DM Serif Display, Caveat, Press Start 2P (pixel art), Noto Sans, Noto Naskh Arabic (Arabic text), JetBrains Mono, Montserrat, Lora, Nunito, Bebas Neue, Anton, Oswald, Archivo Black, Patrick Hand, Cormorant Garamond, Source Serif 4. Each family's licence is in `fonts/<name>/OFL.txt`, with a summary in `NOTICE`.

A composition simply loads fonts from Google Fonts as usual:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;800&family=Fraunces:opsz,wght@9..144,300..900&display=swap" rel="stylesheet">
```

The mgp server (render, frame, contact, check, preview, studio) rewrites every `fonts.googleapis.com` / `fonts.gstatic.com` URL in the HTML, CSS and JS it serves to `/__fonts/...`, including `@import` in CSS and URLs assembled by scripts (e.g. `MGP.core.fontsReady`). The query is answered from the bundle with the same rules as Google Fonts: only the requested styles and weights are registered (an italic that was not requested is synthesised by the browser, not loaded later), and families with an opsz axis (Fraunces, Inter, Source Serif 4) use the opsz files only when the query asks for them. Text widths from the bundle match online Google Fonts (tested on 15 families). Families missing from the bundle are still fetched from Google through `@import` (internet needed), and `mgp check` reports them.

Paths any composition can use under the mgp server:

| Path | Content |
|---|---|
| `/__fonts/fonts.css` | every bundled font (every style) |
| `/__fonts/g/css2?family=...` | like `fonts.googleapis.com/css2` (also `/__fonts/g/css?family=A:400,700` for API v1) |
| `/__fonts/<name>/<file>.woff2` | a font file directly, e.g. `/__fonts/inter/...` (list in `fonts/fonts.json`) |
| `.../motion-graphics-pro/render/fonts/...` | mapped to the bundle even outside the server root (used by `lib/fonts.css` of the motion-graphics skill) |

`MGP_FONTS=online` turns the redirect off (fonts come from Google as in a normal browser). To add or update a font: add it to `FONT_LIST` (old name `DAFTAR`) in `src/download-font.mjs` (old name `unduh-font.mjs`), then run `node src/download-font.mjs "Font Name"` (needs internet; the licence is taken from github.com/google/fonts and recorded in `fonts/fonts.json`).

### GSAP without internet: mgp.motion

mgp does not need the `gsap` package. When a composition loads GSAP from jsDelivr, unpkg or cdnjs (or from `/__mgp/gsap/gsap.min.js`; the old prefix `/__rekam/` is still served), mgp serves **mgp.motion** (`src/motion.js`, a copy of `motion-graphics/lib/motion/motion.js`; old name Gerak): the package's own animation engine, with an API compatible with the part of GSAP 3 that compositions use (`gsap.timeline`, `to/from/fromTo/set/call/add`, position parameter, stagger, keyframes, standard eases, CSS/SVG/attr/CSS variables). HyperFrames-format compositions that do not load GSAP themselves get mgp.motion automatically, installed as `window.gsap`. Other GSAP plugins at CDN URLs are answered with an empty script (`registerPlugin` in mgp.motion is a no-op).

Want real GSAP (e.g. for plugins)? Install it yourself (`npm i gsap` in this folder, subject to the GSAP licence), then add `--native-gsap` (old `--gsap-asli`; or env `MGP_NATIVE_GSAP=1`). mgp.motion vs GSAP parity tests: `motion-graphics/lib/motion/test/`.

### Composition variables

Replaceable text, colours and media are written as variables and filled at render time without editing the HTML. The format is the same as HyperFrames.

Declaration: an array of `{id, type, label, default}` in the `data-composition-variables` attribute. Video variables go on the `<html>` of `index.html` (or on the composition root). Variables of a scene or block go on the `<html>` of that file (or the root inside `<template>`) and apply only inside that mount.

| Type | Extra keys | Check |
| --- | --- | --- |
| `string` | `placeholder`, `maxLength` | length does not exceed `maxLength` |
| `number` | `min`, `max`, `step`, `unit` | a number, inside `min`/`max` |
| `color` | | a valid CSS colour |
| `boolean` | | `true/false`, `1/0`, `ya/tidak`, `yes/no` |
| `enum` | `options: [{value, label}]` | one of the `value`s |

Binding, without script:

- `data-var-text="id"` fills the element's text
- `data-var-src="id"` replaces `src` (image, video, audio). Keep the original `src` as a fallback. Other attributes follow the same pattern: `data-var-href`, `data-var-poster`, `data-var-alt`, and so on.
- `var(--id)` in CSS: every variable is also set as a CSS property `--id` (on `<html>` for the root, on the host element for a scene)
- for logic: `window.__mgp.getVariables()` (old `window.__hyperframes.getVariables()`) once at initialisation (inside a scene, it returns the values of that mount)

Value order, from weakest to strongest:

1. `default` in the declaration
2. `--vars values.json` (alias `--variables-file`), then `--variables '<json>'`
3. `--var key=value` (repeatable)
4. for one scene: `data-variable-values='{"key": "value"}'` on its host

CLI values fill root variables only, like the Variables panel and batch render of HyperFrames. To change one block, change `data-variable-values` on its host. Scenes inherit the root values, so `data-var-text="title"` inside a scene is still filled. Variables cannot change the root `data-duration`.

```html
<html data-composition-variables='[{"id":"title","type":"string","default":"Chapter 1"},
                                   {"id":"accent","type":"color","default":"#ffcc33"}]'>
...
<h1 data-var-text="title" style="color: var(--accent)">Chapter 1</h1>
```

```bash
mgp render index.html --var title="Chapter 4: Basics" --var accent=#ff5d73 -o ch04.mp4
mgp render index.html --vars ch05.json --strict-variables -o ch05.mp4
```

In PowerShell, inline JSON loses its quotes. Write the JSON to a file and use `--vars`. Without `--strict-variables` (old `--var-ketat`), values of the wrong type or undeclared values only raise a warning, and undeclared values are still used as text. With `--strict-variables`, the render stops before the first frame.

### Fit text (`fitTextFontSize`)

The runtime provides `window.__mgp.fitTextFontSize(text, options)` (also `window.__hyperframes.fitTextFontSize`) with the same call shape as HyperFrames, so older compositions keep working. The result is `{ fontSize, fits, lines, width, maxWidth, fontLoaded }`.

| Option | Default | Meaning |
| --- | --- | --- |
| `fontFamily`, `fontWeight`, `fontStyle` | `sans-serif`, 400 | the font measured |
| `maxWidth` | 1600 (landscape) / 900 (portrait) | maximum width in px |
| `baseFontSize` (or `maxFontSize`) | 78 | starting (largest) size |
| `minFontSize` | 42 | smallest size |
| `step` | 2 | sizes are tried downwards by `step` from `baseFontSize` |
| `maxLines`, `lineHeight`, `maxHeight` | 1, 1.2, - | text may wrap up to `maxLines` lines |
| `letterSpacing`, `textTransform` | - | `"0.05em"` / `"uppercase"` are taken into account |

The size is binary-searched among the candidates `baseFontSize`, `baseFontSize - step`, and so on down to `minFontSize`. The result is the same as lowering the size one step at a time, but faster. When the text still does not fit at `minFontSize`, the result is `minFontSize` with `fits: false`. Measuring uses canvas `measureText`, so the result is the same on every render in the same browser.

The font must be loaded when measuring. If it is not, the size is computed with the fallback font. Call it inside `document.fonts.ready.then(...)`, or use the async version `window.__mgp.fitTextFontSizeAsync(text, options)`, which loads the font first. `mgp check` warns about measurements taken before the font loaded, and about text that does not fit.

MGP-style alias: `MGP.fitText(elementOrSelector, options)` (also the old `MGP.pasTeks`). Family, weight, letter spacing and `text-transform` are taken from the element's CSS. The default `maxWidth` is the content width of its parent, and `font-size` is set directly:

```js
document.fonts.ready.then(() => {
  MGP.fitText("#title", { baseFontSize: 120, minFontSize: 48, maxLines: 2 });
  window.__timelines["main"] = tl;   // register the timeline after the text is fitted
});
```

`window.__mgp.measureText(text, { fontFamily, fontWeight, fontSize, maxWidth })` measures width and line count without reflow.

## Lottie

```
mgp export composition.html --format lottie -o anim.json|anim.lottie [--fps 30] [--mode auto|canvas|dom] [--interpolation linear|hold] [--precision 2] [--tolerance 0.05] [--from 0] [--to 5]
mgp play anim.json [--open]          preview a Lottie file with the scrubber
mgp render anim.json -o anim.mp4     render Lottie to video (the usual render options apply)
mgp check anim.json                  features and unsupported parts
mgp frame anim.json --t 1.5 -o f.png
```

Old names: `rekam lottie ekspor | putar | render | frame | cek`, `--mode kanvas`, `--interpolasi`, `--presisi`, `--toleransi`. `check`, `render` and `frame` recognise a `.json`/`.lottie` input by itself.

`export` opens the composition like `render`, injects `MGP.lottie`, then records every 2D canvas per frame (`canvas` mode), or converts DOM/SVG elements and their GSAP/mgp.motion tweens into eased keyframes (`dom` mode). Multi-scene, block-based or `__seek`-driven compositions are seeked through the mgp runtime (every timeline + scene visibility; keyframes from samples), so they no longer come out static; when the result still has 0 keyframes although the composition moves, `export` gives a WARN and suggests the other mode. Clip-path, box-shadow and CSS animations in `dom` mode are reported as "unsupported".

Size: `-o anim.lottie` writes dotLottie (deflate zip, lossless, about 10x smaller; `play`, `render`, `frame` and `check` accept `.lottie`). Paths and masks are stored linear per segment (hold only at path open/close boundaries), so still or smoothly moving parts become few keys. `--precision 1` and `--tolerance 0.3` (px) make it smaller again with a slight difference; the automatic tolerance is never below one precision quantum. Example `lib/examples/vector-kit.html`, 8 s: 81.6 MB → 52.0 MB JSON (same quality), 5.3 MB `.lottie`; `--precision 1` 3.8 MB, `--precision 1 --tolerance 0.3` 3.0 MB (PSNR against the original composition drops by about 1 dB). Files above 10 MB get a WARN with an estimate in MB per second. `play` and `render` use the `MGP.lottie` player, so the result is deterministic and needs no internet. Compositions that embed Lottie through `MGP.lottie.create(...)` render with a normal `mgp render`. Details and limits: `motion-graphics/lib/lottie/README.md`.

## Media

The media commands use built-in ffmpeg filters, so no model and no internet. The result is the same on every run (grain uses a fixed seed). Input may be an image (`.jpg`, `.png`, `.webp`) or a video. Video is re-encoded (H.264 CRF 18 for `.mp4`, ProRes for `.mov`, VP9 for `.webm`), and its audio is kept. Without `-o`, the result is written next to the source with the look or effect name as suffix.

Process media before using it in a composition, then reference the result file. Do not imitate a grade with CSS filters.

### `mgp media look`: looks and LUTs

```bash
mgp media list                                        # every look and effect
mgp media look clip.mp4 --look film -o clip_film.mp4
mgp media look photo.jpg --look warm --strength 0.5 -o photo.jpg
mgp media look clip.mp4 --lut grade.cube -o clip_lut.mp4
mgp media look clip.mp4 --look faded --lut grade.cube --strength 0.8 -o out.mp4
mgp media compare photo.jpg -o compare.jpg            # one frame, every look side by side
mgp media lut film -o film.cube                       # export the colour part of a look as .cube
```

| Look | Old name | Content |
| --- | --- | --- |
| `warm` | `hangat` | 5200 K, saturation slightly up |
| `cool` | `dingin` | 8800 K, saturation slightly down |
| `film` | `film` | lifted blacks, teal shadows, warm highlights, fine grain, vignette |
| `faded` | `pudar` | matte: lifted blacks, low contrast and saturation |
| `contrast` | `kontras` | firm contrast, dense colour |
| `night` | `malam` | day-for-night: dark, blue, low saturation |
| `paper` | `kertas` | printed on paper: soft sepia, lifted blacks, print grain |
| `teal-orange` | `sinematik` | teal shadows, orange skin and highlights |
| `golden` | `emas` | golden hour, 4300 K |
| `clean` | `bersih` | light polish for product/UGC |
| `mono` | `hitamputih` | black and white, medium contrast |
| `sepia` | `sepia` | classic sepia |
| `vhs` | `vhs` | shifted red/blue channels, soft, moving noise |

- `--strength 0..1` (old `--kuat`) mixes the result with the source (default 1).
- Looks can be chained: `--look faded,warm`. `--no-texture` drops grain and vignette.
- `--lut file.cube` applies a 3D LUT (tetrahedral interpolation). The LUT can come from Resolve, Premiere, or `mgp media lut`.
- `mgp media lut <look>` exports the colour part of a look to a 64³ `.cube`, ready for other editors. Grain and vignette cannot be stored in a LUT, so they are left out.
- Do not open a `.cube` to choose a look. Look at the results with `mgp media compare`.

### `mgp media brighten`: dark, flat or dull footage

```bash
mgp media brighten dark.mp4 -o bright.mp4 [--target 0.45] [--strength 1]
```

Luma is measured from about 40 sample frames. The black and white points are stretched from the 10/90 percentiles, then gamma is computed so the mean luma comes close to `--target` (default 0.45). After the first render, gamma is corrected once when the result is still off. One correction applies to the whole clip, so the picture does not flicker. This command only brightens; `--force` allows gamma below 1 for footage that is too bright. The numbers before and after are printed, and `--json` writes them in full.

### `mgp media effects`: stylise and obscure

```bash
mgp media effects photo.jpg --effect duotone --color "#14213d,#fca311" -o duo.jpg
mgp media effects clip.mp4 --effect halftone --selector 10 -o dots.mp4
mgp media effects clip.mp4 --effect blur --strength 0.8 -o blurred.mp4
mgp media effects clip.mp4 --effect duotone,grain -o out.mp4
```

| Effect | Options |
| --- | --- |
| `blur` | `--strength 0..1` (sigma 4 to 40) |
| `pixelate` (mosaic) | `--selector <px>` = cell size (old `--sel`; default: short side / 40) |
| `duotone` | `--color "#shadow,#highlight"` |
| `halftone` | 45-degree print dots, `--selector <px>`, `--color "#ink,#paper"` |
| `posterize` | `--level <n>` (default 5) |
| `grain` | `--strength 0..1` |
| `vignette` | `--strength 0..1` |

`blur` and `pixelate` cover the whole picture, as in HyperFrames. To obscure one face or licence plate, cut that area into its own layer first. mgp does not track faces.

### `mgp audio normalize`: loudness

```bash
mgp audio measure voice.wav                         # integrated LUFS, LRA, peak (ebur128)
mgp audio normalize voice.wav -o voice_-14.wav      # -14 LUFS, -1 dBTP (YouTube, Instagram, TikTok)
mgp audio normalize podcast.wav -o out.wav --podcast   # -16 LUFS
mgp audio normalize clip.mp4 -o clip_normal.mp4     # video copied as it is, audio replaced
mgp audio normalize mix.wav -o out.wav --lufs -18 --tp -1.5
```

Normalisation uses two-pass EBU R128 `loudnorm`: the first pass measures, the second applies linearly, so the dynamics do not change. Sometimes the target cannot be reached without exceeding the true-peak limit, for example on TTS voice with high peaks. In that case mgp uses a fixed gain plus a limiter with 4x oversampling, then readjusts until the difference is about 0.3 LU. `--linear` turns this second method off. The source sample rate is kept (`--ar` changes it). The HyperFrames `normalize-audio` default is -16 LUFS; the mgp default is -14 LUFS for social media, with `--podcast` for -16 LUFS. `mgp normalize-audio` is an alias.

### `mgp cutout`: remove the background

```bash
mgp cutout person.png -o cut.png
mgp cutout person.mp4 -o cut.webm                   # VP9 with alpha, ready for <video>
mgp cutout person.mp4 -o cut.mov                    # ProRes 4444 for editors
mgp cutout person.mp4 -o subject.webm --plate-out plate.webm
mgp cutout asset_magenta.png -o asset.png --key magenta   # no model
mgp cutout greenscreen.mp4 -o out.webm --key green
```

Old names: `rekam potong-latar` (also `remove-background`), `--latar-output`, `--kunci magenta|hijau`, `--kualitas cepat|seimbang|terbaik`, `--kemiripan`.

- **Model**: [rembg](https://github.com/danielgatis/rembg) (MIT) with U²-Net. Default `--model u2net` (general objects); `u2net_human_seg` for people (the model HyperFrames uses); `isnet-general-use` and `birefnet-general` are cleaner but slower. The model is downloaded once to `~/.u2net` or `~/.rembg` on first use (about 170 MB). `--matting` smooths hair and edges.
- **Video**: processed per frame, then reassembled with alpha and the source audio. On a CPU, the speed is about 2 frames/s at 640x360. `--quality fast|balanced|best` sets the VP9 CRF (30/18/12). `--from/--to` cut out part of the clip.
- **`--plate-out`**: writes the background layer with inverted alpha. The subject's hole is transparent, not filled in. Put text between the plate and the subject.
- **`--key`**: no model, for assets on a flat colour background. `magenta` uses the logic of `scripts/magenta_key.py` (magenta amount, edge despill) when Python with numpy and Pillow is available, and ffmpeg colour keying when not. `green`, `blue` or `#rrggbb` use ffmpeg `chromakey` + `despill`; `--similarity` sets the threshold.

Install rembg once, preferably in the venv `render/.venv` (used automatically):

```bash
python -m venv .venv
.venv/Scripts/python -m pip install "rembg[cpu]" onnxruntime     # Windows; Linux/macOS: .venv/bin/python
```

Another venv through `--python <path>` or env `MGP_PYTHON`. Without rembg the command stops with install instructions and suggests `--key`. On Windows, numba (a rembg dependency) fails to write its cache on long paths, so mgp points `NUMBA_CACHE_DIR` at a temp folder.

The composition pattern is the same as HyperFrames: a cutout on top of its own source uses `data-start="0"` and `data-media-start="0"` for both. To fade the cutout, wrap it in a `<div>` without timing attributes and animate the wrapper.

### `mgp transcribe`: per-word timing

```bash
mgp transcribe voice.wav -o words.json --language id --model small
mgp transcribe video.mp4 -o words.json --language id --fix-with script.txt
mgp transcribe --reuse words.json --fix-with script.txt -o words_fixed.json   # fix only, no ASR
```

Old names: `rekam transkrip`, `--bahasa`, `--rapikan`, `--dari`, `--mesin`.

The output is a flat array that `--captions` and `MGP.lipsync.visemes()` read directly:

```json
[
  { "id": "w0", "text": "Bismillah,", "start": 0.12, "end": 0.71 },
  { "id": "w1", "text": "kita", "start": 0.80, "end": 1.02 }
]
```

`p` (word probability from the ASR) is written when available. After `--fix-with` there are also `origin` and `asr` (see below).

- **Engine**: [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (MIT) when installed in Python (`pip install faster-whisper`; the venv is found as for `cutout`). If it is missing, mgp looks for [whisper.cpp](https://github.com/ggml-org/whisper.cpp) (`whisper-cli` on PATH or env `MGP_WHISPER_CPP`, model `ggml-<model>.bin` through `--model-file` or `MGP_WHISPER_MODEL`). If neither exists, the command stops with install instructions. `--engine faster-whisper|whisper.cpp` forces one engine.
- **Model and language**: `.en` models (`small.en` and the like) translate other languages into English. For Indonesian use `--model small --language id` (or `medium` for audio with music). Without `--language`, the language is detected automatically. faster-whisper models are downloaded once from Hugging Face; `--model` also accepts the path of a local model folder.
- **`--fix-with script.txt`** (or the text itself): the ASR words are aligned to the script with dynamic programming. The cost is the edit distance between normalised words (lower case, no diacritics or punctuation), with a merge step (two ASR words become one script word, e.g. "hyper frames" → "HyperFrames") and a split step. Spelling and punctuation come from the script, timing from the audio. Script words that were not heard (`origin: "inserted"`) get time from the gap around them in proportion to their letter count. ASR words not in the script (e.g. "uh") are dropped. Every word gets an `origin`: `match`, `respelled` (spelling replaced, with `asr` holding the original word), `merged`, `split` or `inserted`. A summary is printed at the end.
- `--prompt "mgp, HyperFrames"` gives faster-whisper an initial vocabulary. `--from/--to` transcribe a part; the times still follow the original file.

### `mgp align`: per-word timing without Whisper

```bash
mgp align voice.wav --script script.txt -o words.json
mgp align narration.mp3 --script script.txt -o words.json --letters letters.json
mgp align voice.wav --script "Hello, how are you?" --language en -o words.json --json
```

Old names: `rekam selaras`, `--naskah`, `--huruf`, `--bahasa`, `--diam`.

The output is the same as `mgp transcribe` (flat array `{id, text, start, end}`), plus `syllables` with the timing of every syllable. Text and punctuation come from the script.

- **How it works**: pure JavaScript, no Python, model or download. mgp finds speech regions and pauses from the signal energy, detects syllable nuclei (energy peaks in the voiced vowel band), splits the script into syllables, then matches both with dynamic programming. Long pauses are steered to word boundaries with punctuation (`, . ; : ? !`) and may never fall inside a word. Syllable boundaries are placed in the energy valley between two nuclei; word starts and ends snap to the edge of the pause.
- **Language**: `--language id` (default) uses Indonesian syllable rules (ng, ny, sy, kh; diphthongs ai/au/oi/ei at word end; V-CV, VC-CV). `--language en` uses a vowel-cluster heuristic with silent e. Numbers are spelled out ("2024" is read "dua ribu dua puluh empat"), and so are `%` and abbreviations without vowels ("PT").
- **Audio**: WAV PCM (16/24/32-bit, float, mono/stereo, any rate) is read directly. Other formats (mp3, m4a, mp4) are converted through ffmpeg first.
- **`--letters letters.json`** writes per-letter timing `[{start, end, phone}]` for `MGP.lipsync.visemes()`: short consonants, vowels fill the rest.
- **Accuracy**: on 383 words from 8 synthetic Windows voice samples (English, and Indonesian read by an English voice), the mean word-boundary error is 38 ms (median 15 ms); 79% of boundaries are off by at most 50 ms and 91% by at most 100 ms. On the same audio, `mgp transcribe --model small --fix-with` is off by 85 ms on average. A 3-minute narration with mixed speaking rate: 60 to 74 ms on average. All these numbers come from synthetic voices with clean pauses; for human recordings, expect worse results.
- **Limits**: the script must match what is spoken. Without ASR, words the speaker skips or adds are not detected, and the timing around them shifts. Passages spoken much faster or slower than average, weak function words ("di", "the") and music under the voice can shift the timing by one or two syllables. When the result must be exact, use `mgp transcribe --fix-with`, or check the result in `mgp studio`.
- `--param key=value` changes an algorithm parameter (full list in `PARAM`, `src/align.mjs`). `--json` prints a summary; `--quiet` silences the messages.

### `mgp voice`: VO with your own voice or ElevenLabs

```bash
mgp voice template [--language id|en] [--name Budi] [-o reading.txt]   # ~30 s reading text, starts with the consent sentence
mgp voice inspect recording.wav [--language id|en] [--json]            # duration, SNR, clipping, loudness, sample rate, consent
mgp voice clone recording.wav --name budi [--engine chatterbox|openvoice] [--manual-consent] [--force]
mgp voice speak script.txt --profile budi -o vo.wav [--language id|en] [--emotion neutral|warm|energetic|calm]
                 [--speed 1.0] [--seed 1] [--engine ...] [--no-align] [--tries N]
                 [--pronounce "Claude=Klod; brief=brif" | --pronounce pronunciations.txt] [--no-pronounce] [--dry-run] [--lufs -16]
mgp voice speak script.txt -o vo.wav --sentence 3 [--seed N | --tries 5]        # redo one sentence only ("2,5", "2-4")
mgp voice elevenlabs script.txt --voice <voice_id> -o vo.wav [--model eleven_multilingual_v2] [--save-response r.json | --reuse r.json]
mgp voice score vo.wav --profile budi --script script.txt [--compare other.wav] [--words vo.words.json]   # raw + normalised WER, CHECK BY EAR, similarity
mgp voice list [--json] | mgp voice remove budi
```

Old names: `rekam suara periksa|klon|ucap|nilai|daftar|hapus`, `--nama`, `--profil`, `--naskah`, `--kalimat`, `--coba`, `--lafal`, `--tanpa-lafal`, `--kering`, `--emosi netral|hangat|semangat|tenang`; old files `vo.kata.json`, `vo.huruf.json`, `vo.bagian/`, `lafal.txt`.

- **Local clone**: Chatterbox Multilingual (Resemble AI, MIT, code and weights), Indonesian through the Malay code `ms`. The `openvoice` engine adds the OpenVoice V2 tone color converter (MIT) on top of the Chatterbox output. Runs on the CPU (PyTorch CPU); the models are downloaded once, about 3.2 GB.
- **Consent**: `clone` refuses a recording without the sentence *"Saya, [nama], mengizinkan suara saya dikloning untuk proyek ini."* (English template: *"I, [name], consent to my voice being cloned for this project."*). The sentence is checked with faster-whisper; without faster-whisper, `--manual-consent` is needed. A profile (default `~/.mgp/voice-profiles/<name>/`, outside the skill/plugin folder so an update never removes it; an older `../voice/profiles/` that already holds profiles is still used; another folder through `--folder <dir>` or env `MGP_VOICE_PROFILES`) holds a clean reference, the model conditionals, and `profile.json` (consent time, source sha256).
- **Speak**: the script is split into sentences, numbers are spelled out, each sentence is synthesised and joined with natural pauses (comma 0.18 s, sentence 0.38 s, question/exclamation 0.45 s, paragraph 0.8 s), normalised to -16 LUFS, then `mgp align` writes `vo.words.json` (words + syllables) and `vo.letters.json`. Each sentence is also kept in `vo.parts/NN.wav` + `parts.json` (text, spoken spelling, seed, emotion, duration).
- **Redo one sentence**: `--sentence 3 [--seed N | --tries 5]` synthesises only that sentence, reuses the other sentences (same pauses), then rewrites the loudness, `vo.words.json` and `vo.letters.json`. `--tries N` makes N candidates (seeds `s, s+101, ...`) with one model load, scores them with ASR (normalised WER + duration) and uses the best; every candidate is kept in `vo.parts/candidates/`. `--dry-run` only prints the sentence numbers and spoken text (no GPU). Chatterbox "forcing EOS" warnings that come with token repetition (a doubled word or a cut-off last word) are reported per sentence.
- **Pronunciations**: spoken spelling per word/phrase before TTS, following affixes ("brief-nya" is spoken "brif-nya"). Sources in order: `../voice/pronunciations-default.txt`, `pronunciations.txt` in the script folder / its parent / the working folder, then `--pronounce "a=b; c=d"` or `--pronounce file.txt`; `--no-pronounce` turns it off. A `pronunciations.txt` line: `Claude = Klod | klod, clod` (word = spoken spelling | ASR variants that count as right). `vo.words.json` keeps the original script text.
- **Score**: raw and **normalised** WER/CER (numbers, punctuation, joined words, non-standard spelling, pronunciations), a **CHECK BY EAR** list (words that still differ + seconds + sentence number + the suggestion `--sentence ... --tries 4`), and speaker similarity. The default script is taken from `vo.parts/parts.json`. Use the normalised numbers at gate G2; raw numbers can mislead (test F: 39.6% raw for a VO that sounded fine).
- Negative values may be written apart (`--lufs -18`) as well as `--lufs=-18`.
- **ElevenLabs**: `ELEVENLABS_API_KEY` from the environment; the character alignment is turned directly into words, syllables and letters. Without a key, the command prints a guide to the ElevenLabs connector.
- Install, quality numbers, speed and full ethics: `../voice/README.md`. The venv is found as for `cutout` (`render/.venv`, `--python`, `MGP_PYTHON`); local model folders through `MGP_CHATTERBOX_DIR` and `MGP_OPENVOICE_DIR`.

### `mgp image`: free kit sheets and plates

Still images for a **kit** (character pieces assembled into a rig) and **plates** (backgrounds). Motion still comes from code. Per-frame AI sequences still go through Higgsfield (Claude connector); `mgp image` calls no paid API. How to choose a route, licences and quotas: `../references/image.md`.

```bash
mgp image providers                                  # free routes + keys already set + local status
mgp image kit "a ten year old boy, mustard t-shirt, navy shorts, white sneakers" --style paper -o kit/
mgp image kit "<identical description>" --reference model_sheet.png -o kit2/     # consistent with an existing character
mgp image plate "kampung street at morning, light from frame left" --aspect 16:9 -o plate.png
mgp image "a carved wooden gate" --magenta --cutout -o gate.png                # + gate_cutout.png with alpha
mgp image "a red paper coffee cup" --style paper --magenta --cutout --tries 3 -o cup.png   # next seeds until the cutout is clean
mgp image slice sheet_cutout.png -o kit/ --names head,torso,...               # slice any sheet (e.g. from Higgsfield)
mgp image "<prompt>" --source higgsfield                                       # guide + ready-to-paste prompt only
```

Old names: `rekam gambar iris|unduh|penyedia`, `--sumber cloud-gratis|lokal`, `--penyedia`, `--gaya kertas|vektor`, `--potong`, `--coba`, `--rasio`, `--referensi`, `--lebar/--tinggi`, `--nama`, `--cara templat`, `--tanpa-bersih`; old output `<name>_potong.png`.

| Source / provider | Model | Key (env) | Free |
|---|---|---|---|
| `--provider hf` (official BFL Space, ZeroGPU) | FLUX.2 [klein] 4B, FLUX.1 [schnell] | no key; `HF_TOKEN` optional | daily ZeroGPU quota (small when anonymous) |
| `--provider cloudflare` (Workers AI) | flux-2-klein-4b, flux-1-schnell | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | 10,000 neurons/day |
| `--provider pollinations` | flux.2-klein-4b | `POLLINATIONS_KEY` (`sk_...`) | Pollen quest |
| `--source local` | FLUX.2 [klein] 4B GGUF Q4_K_M | - | yes, after a ±5.3 GB download |
| `--source auto` (default) | cloudflare -> hf -> pollinations -> local (local only when the weights are present) | | |

- `--model klein` (default) accepts `--reference` (max 4); `--model schnell` does not.
- Size: `--aspect 21:9|16:9|9:16|1:1` or `--width/--height` (multiples of 16). The klein Space is limited to 1024 per side, Cloudflare to 1920, schnell on Cloudflare stays 1024x1024. The real size is recorded in `<output>.json`.
- `--magenta`: the #FF00FF background recipe (`references/image.md` 17.4). `--cutout`: magenta key to `<name>_cutout.png` (logic of `scripts/magenta_key.py`).
- Free prompt: `--style paper|vector|origami|pixel|"<text>"` adds a `STYLE:` block (without `--style`, the prompt is sent as it is; a prompt that already contains `STYLE:` gets nothing added). `--style paper` is the default only for `kit` and `plate`.
- `--tries N` (needs `--cutout`): tries the next seeds until the cutout is **clean**, stops at the first clean one, or uses the best score. The best is copied to `-o` (+ `_cutout.png` + a `.json` with the scores of every try); the other tries stay as `<name>_s<seed>.png`. Clean = no magenta left, subject not touching the 2 px edge, magenta tint on the subject ≤ 2%, subject area 1-95%. The scorer can also be called directly: `py/image_engine.py score-cutout <original.png> <cutout.png>`. A dark red shadow under an object is not detected yet.
- **kit**: a grey slot sheet on a magenta background (`py/image_engine.py template`) is sent as reference 1, then cutout + slice into `kit/<part>.png` + `kit/kit.json` (name, box, `pivot` = rotation point, `tip` = child joint) + `kit/_preview.png`. Parts: head, torso, upper_arm, lower_arm, hand, thigh, shin, foot (one of each; the back limbs use the same PNG, darkened). `--face` adds eye, mouth_closed, mouth_open. `--method prompt` works without the template.
- Rig example: `examples/kit-rig.html` loads `kit/kit.json` (+ `plate.png` when present) and walks; `mgp contact kit-rig.html --n 8 -o contact.png`. The package ships a small example that runs right away: `examples/kit/` (8 parts, scaled down 40%, ±9 KB; an older kit with Indonesian part names, which kit-rig.html also reads) + `examples/plate.png`.
- `--cutout`, `kit` and `slice` clean magenta leftovers (alpha < 128, pixels with `min(R,B)-G > 40`, loose specks < 2% of the largest component; kit sheets keep their components). Turn it off: `--no-clean`.
- Without a key, the error message explains how to get a free key. Keys are never written to a file.

Local (`py/image_engine.py`, old name `gambar_mesin.py`): install once per computer with `mgp install image` (see `mgp install` above). The image venv is separate because the voice venv pins diffusers 0.29. Manual way (equivalent):

```powershell
py -3.12 -m venv C:\Users\<name>\vgb
C:\Users\<name>\vgb\Scripts\python -m pip install --no-deps -r py\requirements-image.txt
# use the voice venv's CUDA torch without reinstalling (add this AFTER pip, so pip does not touch vsu):
Set-Content C:\Users\<name>\vgb\Lib\site-packages\zz_vsu_torch.pth C:\Users\<name>\vsu\Lib\site-packages
mgp image download            # ±5.3 GB to ~/vgb-model/hf, resumable when it breaks off
```

Without a voice venv: install torch yourself in vgb (`pip install torch --index-url https://download.pytorch.org/whl/cu126`). The venv is looked up in `--python`, env `MGP_IMAGE_PYTHON`, `<home>/install.json` (`mgp install image`), then `~/vgb`. The text encoder runs on the CPU and is then dropped, after which the GGUF transformer goes to the GPU through the shared GPU lock (task `flux2-klein-4b-gguf` in `py/hardware-requirements.json`). Needs free RAM >= 11 GB (text encoder phase); below that the command stops with a message (`MGP_IMAGE_FORCE=1` forces it).

### `mgp sfx`: procedural sound effects

```bash
mgp sfx list                                      # 18 presets and their parameters
mgp sfx whoosh -o whoosh.wav                      # 0.8 seconds, seed 1
mgp sfx whoosh --duration 1.2 --seed 7 --param to=4000 --pan -0.3 -o w.wav
mgp sfx waves --duration 30 --gain -6 -o sea.wav  # ambience
mgp sfx mix cues.json -o sfx.wav                  # lay many SFX on one timeline
mgp render index.html --audio sfx.wav -o out.mp4  # mux into the video
mgp sfx proof -o folder                           # WAV + PNG spectrogram + loudness per preset
```

Old names: `rekam sfx daftar|campur|bukti`, `--durasi`, `--puncak`; the old Indonesian preset and parameter names still work (`ketik` = `type`, `--param ke=...` = `to=...`).

Every sound is synthesised in code (noise, filters, oscillators, reverb), with no recorded samples and no browser. The output is 48 kHz stereo WAV (`--bit 16|24|32`). The sound is fully determined by the preset, the parameters and `--seed`: the same command always gives exactly the same file, and another seed gives a new variation (for example five slightly different `pop`s for five icons).

| Preset (old name) | Sound | Main parameters |
|---|---|---|
| `whoosh` | fast air swish, panning left-right | `from`, `to` (Hz), `peak`, `q`, `spread` |
| `paper-swoosh` (`swoosh-kertas`) | paper flap | `bright`, `grain` |
| `fold` (`lipat`) | paper crinkle while folding, then pressing the crease | `count`, `press` |
| `tear` (`sobek`) | paper being torn | `rough`, `from`, `to` |
| `pop` | pop in | `pitch`, `bend` |
| `click` (`klik`) | button click | `pitch`, `bright` |
| `tap` (`ketuk`, `tick`) | wood knock, clock tick | `pitch`, `dry` |
| `ding` (`chime`) | small bell | `pitch`, `echo` |
| `riser` | tension rising to a peak | `from`, `to`, `hiss` |
| `impact` (`boom`) | heavy hit | `pitch`, `drive`, `echo` |
| `glitch` | digital chops, stutter, bitcrush | `density`, `bit` |
| `type` (`ketik`, `typewriter`) | typewriter keys | `rate`, `bell` |
| `coin` (`koin`) | coin, point scored | `pitch` |
| `camera` (`kamera`, `shutter`) | camera shutter | `gap` |
| `waves` (`ombak`, `sea`) | ambience of waves breaking on a beach | `period`, `foam` |
| `wind` (`angin`) | ambience of blowing wind | `strength`, `whistle` |
| `crowd` (`keramaian`) | murmur of a few people in a room | `voices`, `room` |
| `notification` (`notifikasi`) | soft two-tone notification | `pitch`, `ratio` |

Every preset accepts `--duration`, `--seed`, `--gain` (dB) and `--pan` (-1 left to 1 right). One-shot sounds are normalised to a peak of about -1 dBFS, ambiences (`waves`, `wind`, `crowd`) to an RMS of about -22 dBFS so they sit safely under narration. The loudness of every preset (EBU R128; short sounds get a 0.5 second silent tail so they can be measured) is in the `loudness.json` written by `mgp sfx proof`. The range is -23 LUFS (`waves`) to -10 LUFS (`tear`, `whoosh`), with peaks no higher than -0.5 dBTP.

**Cue list** for `mgp sfx mix`: an array, or an object `{ "duration": 12, "cues": [...] }`:

```json
{ "duration": 10.4, "cues": [
  { "t": 0,    "sfx": "waves", "duration": 10.4, "gain": -10 },
  { "t": 0.5,  "sfx": "whoosh", "duration": 1.0, "gain": -4 },
  { "t": 4.0,  "sfx": "pop", "seed": 2, "param": { "pitch": 520 } },
  { "t": 8.6,  "sfx": "ding", "gain": -4, "pan": 0.4 }
] }
```

`t` is the second in the video. The default seed of each cue is its position (1, 2, 3, ...), so two `pop`s in a row do not sound exactly the same. The mix goes through a soft limiter so its peak does not exceed `--peak` (default -1 dBFS). Mux the result with `mgp render --audio sfx.wav` (or `--audio sfx.wav@2.5` to shift it). The final loudness can be tidied with `mgp audio normalize`.

**In the browser**, the same engine is available as `lib/sfx/sfx.js` (`MGP.sfx`): `MGP.sfx.synth("pop", {seed: 2})`, `MGP.sfx.mix(cues)`, `MGP.sfx.wav(sound)` (Uint8Array WAV), and `MGP.sfx.offline(cues)`, which mixes through `OfflineAudioContext` and returns an `AudioBuffer` (old names `buat`, `campur`). The samples are identical to the Node output (tested in Edge: same sample hash, offline mix vs Node difference below 1e-7). The library path is looked up at `../../motion-graphics/lib/sfx/sfx.js`; another path through env `MGP_SFX_LIB`.

## Compatibility

New compositions use neutral names; old names are still accepted so existing compositions (including those written for HyperFrames) run unchanged. This is the only place where this list is maintained.

| Neutral name (use in new compositions) | Old names still accepted | Note |
| --- | --- | --- |
| attributes `data-composition-id`, `data-composition-src`, `data-start`, `data-duration`, `data-width/height`, `data-fps`, `data-media-start`, `data-volume`, `data-playback-rate`, `data-has-audio`, `.clip`, `<template>` + `#root`, `window.__timelines` | same | core of the contract, the names are already neutral |
| `window.__mgp.fitTextFontSize` / `fitTextFontSizeAsync` / `getVariables` / `measureText` / `buildReady` | `window.__hyperframes.*`, `window.__hf.buildReady` | the same object |
| event `mgp-seek` | `rekam-seek`, `hf-seek` | all three are sent every frame |
| `window.__mgpLottie`, `window.__mgpAnime` | `window.__hfLottie`, `window.__hfAnime` | both are seeked |
| page runtime `window.__mgpRuntime` (`ready`, `seek`, `blockTimelines`, `time`) | `window.__rekam` (`siap`, `seek`, `timelineBlok`, `waktu`) | the same object |
| hooks `window.__curves`, `__mgpVars`, `__mgpNoReset`, `__mgpNoSubSeek`, `__mgpSkip`; attribute `data-mgp-scope`; `<meta name="mgp:size">`; URL prefix `/__mgp/` | `__kurva`, `__rekamVars`, `__rekamTanpaReset`, `__rekamTanpaSubSeek`, `__rekamSkip`; `data-rekam-lingkup`; `rekam:size`; `/__rekam/` | `mgp check` reports the old names it finds |
| global `mgp.motion` (the package's animation engine) | `Gerak`, `gerak`; global `gsap` | mgp.motion is installed as `gsap` when that is not defined yet; `--native-gsap` uses real GSAP you installed yourself |
| driver `composition` (in the `mgp check` report, `--json`) | `hyperframes` (Studio accepts both) | label only |
| block field `aliases` (block.json, catalog.json) | `nama_lama`, `hyperframes` | `mgp add <old name>` maps to the block |
| `blocks/tools/legacy-items.json`, `blocks/tools/legacy-name-map.json`, `examples/compat/` | `hyperframes-item.json`, `peta-hyperframes.json`, `contoh/hyperframes/` (later `contoh/kompat/`) | files/folders renamed |
| `project.json`, `vo.words.json`, `vo.letters.json`, `vo.parts/parts.json`, `pronunciations.txt` | `proyek.json`, `vo.kata.json`, `vo.huruf.json`, `vo.bagian/bagian.json`, `lafal.txt` | old files and keys are still read |

### Moving from HyperFrames

| HyperFrames | mgp |
| --- | --- |
| `npx hyperframes lint` / `check --json` | `mgp check index.html` / `mgp check index.html --json` |
| `npx hyperframes preview` | `mgp preview index.html --open` |
| `npx hyperframes snapshot --at 1.2,2.4` | `mgp frame index.html --t 1.2 -o f.png` |
| `npx hyperframes snapshot --range 0,5.2 --frames 8` | `mgp contact index.html --from 0 --to 5.2 --n 8` |
| `npx hyperframes render -o out.mp4 --quality delivery` | `mgp render index.html -o out.mp4` |
| `--quality draft` | `--size 540x960 --crf 26 --preset veryfast --workers 4` |
| `-c compositions/s03.html` | render a part with `--from/--to` matching the scene's `data-start` |
| `render --variables '{"title":"..."}'` / `--variables-file v.json` | `mgp render index.html --var title=...` / `--vars v.json` (also `--variables`, `--variables-file`) |
| `--strict-variables` | `--strict-variables` |
| `data-composition-variables`, `data-var-text`, `data-var-src`, `var(--id)`, `data-variable-values`, `__hyperframes.getVariables()` | the same, unchanged |
| `window.__hyperframes.fitTextFontSize(text, {...})` | the same, plus `fitTextFontSizeAsync`, `maxLines`, and the alias `MGP.fitText(el, {...})` |
| `check`: `text_below_floor`, text overflow/clipping | `mgp check`: "text below the reading floor", "text leaves the canvas / overflows / is clipped" |
| `media-treatment --grading '{"preset":"warm-daylight"}' --apply` | `mgp media look clip.mp4 --look warm -o clip_warm.mp4` (writes a new file, not an HTML attribute) |
| `media-use resolve --type lut` / `.cube` LUT | `mgp media look in --lut x.cube`, `mgp media lut <look> -o x.cube` |
| `grade-compare --for frame.png` | `mgp media compare frame.png -o compare.jpg` |
| `media-treatment --analyze`, then correct | `mgp media brighten in -o out` |
| Blur, Pixelate, Halftone, Dither/palette treatments | `mgp media effects in --effect blur\|pixelate\|halftone\|posterize\|duotone` |
| `normalize-audio --lufs=-16` | `mgp audio normalize in -o out --podcast` (mgp default -14 LUFS); `mgp audio measure in` |
| `remove-background in.mp4 -o out.webm --background-output plate.webm` | `mgp cutout in.mp4 -o out.webm --plate-out plate.webm` (also `remove-background`, `--background-output`) |
| `transcribe audio.mp3 --model small --language id` | `mgp transcribe audio.mp3 --model small --language id -o words.json` |
| (none) | `mgp transcribe ... --fix-with script.txt`: script spelling, audio timing |
| (none) | `mgp align audio.wav --script script.txt`: per-word timing without Whisper |
| (none) | `mgp sfx <preset>` and `mgp sfx mix cues.json` (local synthesis, no download) |

Supported unchanged: root `data-composition-id` + `data-duration` + `data-fps` + `data-width/height`, `data-composition-src` hosts that load a `<template>` with `#root`, `window.__timelines["id"]`, `.clip` shown during `[start, start + duration)`, `<audio>` with `data-start`/`data-volume`/`data-media-start`, `<video>` seeked per frame, CSS animations with `data-start`, the `hf-seek` event (and `mgp-seek`), `__hfLottie`, `__hfAnime`, `__hf.buildReady` (and the `__mgp*` equivalents), `data-no-timeline`, composition variables, and `fitTextFontSize`.

Notes:

- Inline scripts in sub-compositions are wrapped in their own function, so `const SC` in two scenes does not clash.
- Scene `<style>` is scoped to its host (see Composition contract), as in HyperFrames.
- HyperFrames does not provide a global `gsap`: a composition meant to run in both loads GSAP itself from a CDN (`<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js">`); mgp redirects it to the local mgp.motion. Example: `examples/compat/index.html`.
- `--native-gsap` fails with a clear message when the `gsap` package is not installed, or when the page still uses mgp.motion because it loads `motion.js` (or the old `gerak.js`) itself (it no longer falls back to mgp.motion silently).
- The other direction is not complete: a comparison test (report B) found that blocks with long timelines (`titles/glass-shards`, `ui/vector-editor`; old ids `judul/pecahan-kaca`, `ui/editor-vektor`) play faster in HyperFrames 0.9.16, and `transitions/paper-collage` (old `transisi/kolase-kertas`) + mgp.motion shows the final scene before the transition. The block timeline duration equals the host `data-duration` (checked), and mgp matches GSAP; the cause on the HyperFrames side has not been isolated. Render blocks with mgp.
- There is no `pretext`; `window.__mgp.measureText` covers the same need for width and line count.
- mgp media treatments write a new file through ffmpeg, not a `data-color-grading` attribute rendered by a shader during playback. So treatment values cannot be animated with `--hf-color-grading-*`. For a gradual reveal, cross two clips (original and processed) with opacity on the timeline.
- Compositions that already use `data-color-grading` still render, but without the grade. Process the media with `mgp media look`, then replace `src`.
- Other transcription engines (Parakeet, OpenAI/Groq APIs) and avatars are not in mgp. TTS is available through `mgp voice` (local Chatterbox clone or ElevenLabs).
- The HyperFrames font bundle is not included; mgp has its own bundle (24 OFL families, including Poppins, Inter and Montserrat, see "Fonts without internet") that is used automatically when a composition loads them from Google Fonts. Other fonts: add an `@font-face` pointing to `assets/fonts/`; `mgp check` tells you which fonts rely only on a system font or the internet.
- Pixel output can differ slightly from HyperFrames because the browser and encode settings differ; durations and timing are the same.

## Hardware video encoders (`--encoder`)

`mgp render ... -o out.mp4 --encoder auto|cpu|nvenc|qsv|amf|videotoolbox` (or env `MGP_ENCODER`). MP4 H.264 only; ProRes, WebM and PNG sequences always use the CPU encoder.

- `cpu` (default): libx264 `-crf 18 -preset medium -tune animation`.
- `auto`: reads `ffmpeg -encoders`, then tries `nvenc`, `qsv`, `amf`, `videotoolbox` in order with a 15-frame test encode. The first one that passes is used; when none passes, it falls back to libx264 and prints the reason (`encoder: libx264 (CPU); hardware encoder not usable: ...`).
- Naming an encoder directly (`--encoder qsv`) is tested first too; failure means libx264, not an error.
- NVENC does not take the GPU lock (its encoder chip is separate, ±0.1–0.2 GB VRAM per session) but falls back to the CPU when free VRAM is below ±0.3 GB per 2 workers.

Quality equivalents of libx264 `--crf N` (default N 18):

| Encoder | Arguments |
|---|---|
| nvenc | `h264_nvenc -preset p5 -tune hq -rc vbr -cq N+1 -b:v 0 -spatial-aq 1 -aq-strength 8 -bf 3 -b_ref_mode middle -rc-lookahead 20 -profile:v high` |
| qsv | `h264_qsv -preset slower -global_quality N+1 -look_ahead_depth 20 -profile:v high -pix_fmt nv12` |
| amf | `h264_amf -quality quality -rc cqp -qp_i N -qp_p N+2 -qp_b N+4 -profile:v high` |
| videotoolbox | `h264_videotoolbox -q:v 100-2N -profile:v high` |

Measured on the test laptop (Core Ultra 7 165H, Intel Arc iGPU, RTX 500 Ada 4 GB, ffmpeg 9.0.2, `--workers 2`, 05-11-2026). Encode only = the same PNG sequence encoded with mgp's arguments; quality = SSIM/PSNR (yuv420p) against the source PNGs and against the libx264 result.

| Composition | Encoder | Encode only | Total render | Size | SSIM / PSNR vs PNG | SSIM / PSNR vs libx264 |
|---|---|---|---|---|---|---|
| `figure3d.html` 1280x720, 8 s (240 frames) | libx264 | 2.6 s | 55 s | 2.1 MB | 0.9944 / 48.5 dB | - |
| | qsv | 2.6 s | 57 s | 2.7 MB | 0.9936 / 48.4 dB | 0.9928 / 47.3 dB |
| `scene-tanker.html` `--scale 1.5` = 1920x1080, 49 s (1470 frames) | libx264 | 60.9 s | 259 s | 12.0 MB | 0.9973 / 50.9 dB | - |
| | qsv | 11.7 s | 262 s | 12.8 MB | 0.9963 / 49.9 dB | 0.9966 / 49.4 dB |

Conclusions:

- QSV encodes 1080p ±5x faster than libx264, with visually identical quality (SSIM > 0.996, PSNR ±1 dB lower) and files 5–30% larger.
- **The total render time does not change**: the encoder runs alongside Chrome's frame capture, and capture (±4–6 frames/s with 2 workers) is much slower than libx264 (±24 frames/s at 1080p). A hardware encoder only helps when the CPU is really saturated, or when re-encoding a PNG sequence.
- NVENC could not be measured on this laptop: ffmpeg 9.0.2 needs NVENC API 13.1 (NVIDIA driver ≥ 610), while the installed driver is 595.95 (API 13.0). `auto` detects this through the test encode and uses QSV. Options: update the driver, or point `MGP_FFMPEG` at ffmpeg 7.x/8.0. The NVENC arguments above have not been calibrated with measurements on this machine.

Default decision: **`cpu`**. libx264 gives the same file for the same input on any machine (hardware encoders depend on the driver and GPU generation), its quality per bit is slightly better, and the total render is hardly slower. `auto` is recommended for drafts, very long renders on a busy CPU, or re-encoding PNG sequences. Chrome frame capture always uses software rasterisation (`--disable-gpu-rasterization`) for determinism; `--encoder` does not touch it.

## Devices: GPU, CPU and the GPU queue

Heavy Python jobs (voice clone, faster-whisper in `voice score`, and local `mgp image`) use the shared device manager `py/device.py` (old name `perangkat.py`, kept as a shim); its Node counterpart is `src/device.mjs` (profile, encoders, lock). Every command prints its decision and the reason, e.g.:

```
device [voice speak chatterbox]: GPU (CUDA): free VRAM 3.8 GB of 4.0 GB, needs 3.0 GB
device [voice speak chatterbox]: CPU: PyTorch CPU build (2.6.0+cpu); install a CUDA build to use the GPU
device [voice speak chatterbox]: CPU: GPU still in use by 'image flux' (PID 1234) after waiting 120 s
```

1. **Probe**: free VRAM (`nvidia-smi`, or `torch.cuda.mem_get_info` when torch is already loaded), free RAM, CPU threads, GPU vendor. Missing tools do not cause errors.
2. **Decide** from the task's memory estimate (`py/hardware-requirements.json`) + a 0.5 GB margin: `cuda` when it fits in VRAM, `cuda+offload` when VRAM is short but RAM is enough and the model supports offload (diffusers style), `cpu` otherwise.
3. **GPU lock** `%LOCALAPPDATA%\rekam\gpu.lock` (Linux/macOS `~/.cache/rekam/gpu.lock`; the folder name stays "rekam" so old and new versions share one queue), JSON content `{pid, task, start, host}`. One GPU job at a time, across processes, agents and sessions. Others wait `MGP_GPU_WAIT` seconds (default 120), then run on the CPU. Locks left by dead PIDs are removed automatically.
4. **OOM fallback**: when CUDA runs out of memory (or the cuBLAS/cuDNN DLLs are missing) in the middle of a job, the model is dropped, the GPU released, and the job retried on the CPU. The JSON result contains `device.fallback: "oom"`.

| Env (old name) | Meaning |
|---|---|
| `MGP_DEVICE=auto\|cpu\|cuda\|mps` (`REKAM_DEVICE`) | Force a device (default `auto`) |
| `MGP_GPU_WAIT=<seconds>` (`REKAM_GPU_TUNGGU`) | How long to wait for a busy GPU (default 120) |
| `MGP_GPU_LOCK=<file>` (`REKAM_GPU_KUNCI`) | Another lock file location |
| `MGP_GPU_LIMIT=<GB>` (`REKAM_GPU_BATAS`) | Testing only: limit the process's CUDA memory to trigger the OOM fallback path |
| `MGP_ENCODER=cpu\|auto\|...` (`REKAM_ENCODER`) | Default MP4 encoder of `mgp render` |

From Python (for new scripts):

```python
import device as pk          # render/py/device.py
result, k = pk.run("image flux", lambda k: work(k.torch, offload=k.device == "cuda+offload"),
                   on_fallback=drop_model, task="flux-schnell")
with pk.use_gpu("other task", vram=2.0, ram_gb=4.0) as k: ...   # decide + lock, released on exit
```

Old names: `jalankan` → `run`, `saat_turun` → `on_fallback`, `pakai_gpu` → `use_gpu`, `tugas` → `task`, `k.perangkat` → `k.device`.

CLI: `python py/device.py profile | decide --task chatterbox | lock` (old `profil | putuskan --tugas | kunci`).

## Determinism

The same render twice gives the same frame hashes, also when split over several workers. How:

- a virtual clock (`Date`, `performance.now`, rAF) and a `Math.random` reseeded from `t` every frame
- `gsap.globalTimeline.autoRemoveChildren = false`, `lagSmoothing(0)`, `force3D: false`, `lazy: false`
- `will-change` is switched off, and Chrome's layer state is rebuilt every frame (body hidden for a moment, synchronously, without a paint), because Chrome keeps raster leftovers from earlier frames (`window.__mgpNoReset = true` turns this off)
- wait for fonts, image decoding, video seeks and `waitUntil` promises before capturing
- headless Chrome with software rasterisation, sRGB colour profile, no LCD text and no hinting

When `mgp check` reports "not deterministic", the cause is usually timers (`setTimeout`/`setInterval`), state accumulated across frames (a particle simulation computed from the previous frame), or network fetches.

## Limits

- Speed depends on the CPU: about 10 frames/s for 1080x1920 with one worker, about 20 frames/s with four workers on the test machine. Long renders should use `--workers`.
- WebGL runs on SwiftShader (software): correct, but slow for heavy 3D scenes.
- `setTimeout`/`setInterval` still use real time. Timer-driven animation will not be exact.
- Animation that accumulates state across frames (step-by-step physics) is correct only when rendered in order in one worker, and seeking backwards cannot restore it. Compute from `t`.
- mgp.motion/GSAP timelines that are paused but not registered (`__timeline` / `__timelines`) cannot be found.
- Audio outside the server root (http URLs) is skipped; copy the file into the project.
- Burned-in `--captions` have one simple style only.
- mgp does not upload or render in the cloud. The only downloads are the rembg, whisper or voice engine models when `cutout`, `transcribe` and `voice` are first used. `mgp voice elevenlabs` sends the script to the ElevenLabs API only when the user provides a key.
- `fitTextFontSize` measures with canvas. The result can differ by one or two px from the DOM box when the CSS uses `font-feature-settings`, `font-variation-settings` or a special `text-rendering`.
- `mgp media brighten` works on 8-bit SDR. HDR, HLG or LOG footage must be converted first. Very dark, heavily compressed footage can show banding after brightening.
- Video `cutout` is processed per frame without smoothing between frames, so fine edges (hair) can jitter slightly.
- `--fix-with` alignment relies on spelling similarity. A script that differs a lot from what was said (a paraphrase) gives many `inserted`/dropped words; check the summary.

## Examples

Folder `examples/`:

- `kinetic-9x16.html`: 9:16 kinetic typography (loads GSAP from a CDN; mgp serves mgp.motion), 5 seconds, `window.__timeline`
- `canvas-seek.html`: 16:9 canvas scene, 4 seconds, `window.__seek(t)`
- `kit-rig.html`: a character from `mgp image kit` (kit.json + part PNGs) assembled into a joint rig, walking over a plate
- `compat/index.html` (formerly `hyperframes/`, then `kompat/`): compatibility test of the older composition format (root, two `<template>` scenes, `.clip`, CSS animation, click audio at 1.5 seconds landing exactly on the white flash of frame 36)

```bash
npm run check-examples     # old name: npm run cek-contoh
node bin/mgp.mjs render examples/kinetic-9x16.html -o kinetic.mp4 --workers 4
```

## Licence

See `../../LICENSE.md`. Idea credits and dependencies are in `NOTICE`.
