# References: image assets (free through `mgp image`, Higgsfield, magenta background)

Part A (sections 1-6) = the free route `mgp image` (v2.4, 05-11-2026). Part B (old SKILL.md chapters 4 + 17.4) = paid Higgsfield and the magenta-background trick. Local models are installed once per computer: `mgp install image` (models are not in the ZIP); `mgp doctor` suggests the route (`references/hardware.md`).

Read by Claude when a project needs a **kit sheet** (character/object pieces for a rig) or a **plate** (background) and the user
chooses the free route, or there is no Higgsfield balance. Motion is still made in code (rig, walk cycle, folding, lip-sync).
Per-frame AI sequences (a different pose in every frame) stay on the Higgsfield route, because consistency across frames needs a
large model with strong references; the free route here is only used for one sheet per character/location.

Checked 05-11-2026. Prices, quotas and terms of service can change; check the source links again when in doubt.

## 1. Available routes

| Route (`--provider`) | Model | Model licence / output terms | What is free | Account / key | Reference | Size |
|---|---|---|---|---|---|---|
| `hf`: official BFL Space (ZeroGPU) | FLUX.2 [klein] 4B (default), FLUX.1 [schnell] | Apache-2.0, output may be used commercially | Daily ZeroGPU GPU quota. Without an account ±4-5 images, then it runs out (tested); a free account + `HF_TOKEN` gets a larger quota | Not required; `HF_TOKEN` optional | klein: yes (max 4) | klein max 1024 per side, schnell 2048 |
| `cloudflare`: Workers AI | `@cf/black-forest-labs/flux-2-klein-4b` (default), `flux-1-schnell` | Apache-2.0 + BFL terms: the output belongs to the user, may not be used to train other models, may not be claimed as made by a human | 10,000 neurons/day (reset 00:00 UTC). klein 1024x1024 = 4 tiles x 26.05 = ±104 neurons (±95 images/day; every reference tile +5.37); schnell 4 tiles x 4.8 + 4 steps x 9.6 = ±58 neurons (±170/day) | Free account; `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | klein: yes (`input_image_0..3`, preferably <= 512 px) | klein 256-1920; schnell fixed 1024x1024 |
| `pollinations` | `black-forest-labs/flux.2-klein-4b` | Model licence (Apache-2.0); Pollinations terms: "Model licences vary; verify before commercial use" | Free Pollen quests for non-paid models (amount varies, not promised) | GitHub login; key `sk_...` in `POLLINATIONS_KEY` | klein: yes | max 2048 |
| `local`: `py/image_engine.py` | FLUX.2 [klein] 4B GGUF Q4_K_M + Qwen3-4B GGUF (default); FLUX.1 [schnell] GGUF Q4_K_S + T5-XXL GGUF | Apache-2.0 | Free forever, no internet after the download | None | klein: yes | any (multiples of 16) |
| `higgsfield` (`--source higgsfield`) | GPT Image 2.5 (paid) | Higgsfield terms | Paid | Higgsfield connector in Claude | Yes | 1K/2K |

Rejected (not used at all):

| Candidate | Reason |
|---|---|
| Gemini API (Gemini 2.5 Flash Image, 3.1 Flash Image, 3 Pro Image / "Nano Banana") | Official pricing page: the Free Tier column for every image output model says "Not available". No free route |
| Hugging Face Inference Providers (router, `hf-inference`) | Free account: "Monthly Credits: None", credits must be bought. The ZeroGPU Space (`hf`) is used instead |
| SDXL-Turbo | Licence `sai-nc-community` (non-commercial; commercial use needs a Stability membership) |
| FLUX.1 Kontext [dev], FLUX.2 [klein] 9B | Non-commercial FLUX licence |
| Pollinations without a key (`image.pollinations.ai/prompt/...`) | Still works, but only the Sana 512 px model with a logo watermark that cannot be switched off; quality far below what a kit needs. The new endpoint `gen.pollinations.ai` refuses without a key (401) |

## 2. Choosing a route (rules for Claude)

1. Run `mgp image providers` (which keys are already set) and `mgp doctor` (VRAM, free RAM, torch CUDA).
2. **Character consistency needed** (a second kit for the same character, a face kit, other poses): use the klein model with
   `--reference` (model sheet or the first kit). schnell does not accept references.
3. Order of `--source auto` (default): `cloudflare` when the key is set, then `hf` (no key), then `pollinations` when the
   key is set, then `local` when the weights are already downloaded. A quota failure moves on to the next automatically; `auto` never
   silently triggers a large model download.
4. **Local** is chosen when: there is no internet / the cloud quota has run out / many variations are needed. Requirements: the local engine is installed
   (`mgp install image`, weights ±4.9 GB; section 4), free RAM >= 11 GB (text encoder phase), and preferably an NVIDIA GPU >= 4 GB.
   Without a GPU it runs on the CPU but slowly (see 5).
5. Per-frame AI sequences, 2-state crowds, branch B keyframes, AI video: **stay on Higgsfield** (Part B chapter 4). The free
   route is not used for these. `--source higgsfield` only prints a guide + a ready-to-paste prompt; Claude then
   uses the Higgsfield connector with gate G3 (balance, job list, the user's OK).
6. Every result is checked like a Higgsfield asset (Part B 4.4 item 5, and `references/cutout.md` 5.4): number of parts, nothing touching, same
   costume, flat background, no text/logos. Failure: change `--seed`, do not patch.
7. Credits in T5: write the provider, model, seed, size (in `<output>.json` next to the PNG). Cost 0. Also record it in `project.json` `assets[]` (`source: "mgp-image"`, `provider`, `model`, `seed`, `license`, `meta`).

How to get free keys (also printed by `mgp image providers`):

- **Cloudflare**: sign up at <https://dash.cloudflare.com/sign-up> (Free account; the Workers AI documentation does not mention
  a credit card for the free allocation), copy the Account ID, create a token at <https://dash.cloudflare.com/profile/api-tokens>
  with the "Workers AI" template, then `setx CLOUDFLARE_ACCOUNT_ID ...` and `setx CLOUDFLARE_API_TOKEN ...`.
- **Hugging Face**: <https://huggingface.co/join>, a "Read" token at <https://huggingface.co/settings/tokens>, `setx HF_TOKEN hf_...`.
- **Pollinations**: GitHub login at <https://enter.pollinations.ai>, create an `sk_` key on the keys page, `setx POLLINATIONS_KEY sk_...`.

## 3. Recipes

### 3.1 Character kit for a rig (default: template method)

```bash
mgp image kit "a ten year old Indonesian boy, short black hair, warm brown skin, mustard yellow t-shirt, navy shorts, white sneakers" \
  --style paper --seed 11 -o assets/kit_budi
# consistency with a model sheet that is already approved:
mgp image kit "<identical description>" --reference assets/model_budi.png -o assets/kit_budi2
```

How it works:
1. `image_engine.py template` makes a **slot sheet**: plain grey shapes for 8 parts (head, torso, upper_arm,
   lower_arm, hand / thigh, shin, foot) on a magenta background, widely spaced, one scale.
2. The slot sheet is sent as reference 1 (klein multi-reference edit). The prompt asks for every grey shape to be replaced
   by the matching body part, background kept #FF00FF. Extra references (model sheet) become reference 2.
3. Magenta key (the logic of `scripts/magenta_key.py`), then **slice**: connected components, names from the slots (the component that
   covers most of the slot box), one PNG per part.
4. `kit.json`: `parts[]` with `name`, `file`, box on the sheet (`x, y, w, h`), `pivot` (rotation point, top end of the
   part; head: bottom end/neck) and `tip` (child joint), in pixels of the part PNG. `_preview.png`: boxes +
   names + pivot (red) + tip (green) on a dark blue background for QC.
5. One part per type: left and right limbs use the same PNG; the one at the back is darkened and placed
   behind the torso (classic cut-out trick). Small models follow 8 slots better than 14.

Automatic QC in slice (shown as `warning` in `kit.json` and in the log): empty template slot (part touching or
missing), part count does not match, and leftover template grey > 15% of a part's pixels (the slot shape was not replaced; a character
in grey clothes can trigger a false warning). Test result: of 3 seeds, 1 clean; so use `--tries 3` (consecutive seeds
until the slice is clean, the result of each seed in `s<seed>/`). Small corrections without regenerating:
`mgp image slice sheet_cutout.png --template template.json --rotate hand:180 -o kit/` (e.g. a hand drawn with the fingers pointing up).

Without a template (`--method prompt`, or schnell): a CANVAS/CHARACTER/PIECES/STYLE/ONLY prompt in the T4 style. The 4B model often
makes a **full character turnaround** instead of separate parts (tested); such a result is still useful as a
model sheet for `--reference`, not as a kit.

Slice any sheet again (e.g. a Higgsfield kit): `mgp image slice sheet_cutout.png -o kit/ --names head,torso,...`
(names in reading order: row band, then x; with the 8 standard names, names are guessed from the shape) or `--template template.json`.

### 3.2 Plate

```bash
mgp image plate "a quiet kampung street at morning, warm light from frame left, low fences and potted plants" --aspect 16:9 -o assets/plate.png
```

The prompt follows T4 (b): camera, vanishing point, "Empty scene: no people", lower third empty.

Note on the local route: plates from local FLUX.2 klein (and the free cloud) tend to be **semi-photographic, not collage** (section 5;
30 s ad test: the table plate came out semi-photographic). Such a plate is good enough as a far background with grain and
a little blur; near planes and objects are still made as separate magenta assets (3.3), then assembled. For a full
collage plate: the Higgsfield route (Part B) or split the plate into layers (branch B).

### 3.3 One asset on a magenta background

```bash
mgp image "a carved wooden gate with lattice windows" --magenta --cutout --seed 3 -o assets/gate.png
# -> gate.png (raw) + gate_cutout.png (alpha) + gate.json (meta)
```

`--magenta` adds the 17.4 recipe: flat #FF00FF background without shadows, every opening magenta, the whole object with a wide
margin, no magenta/pink/purple on the object, no text.

```bash
mgp image "a red paper coffee cup" --style paper --magenta --cutout --tries 3 --seed 5 -o assets/cup.png
```

- `--style <name|text>` adds a `STYLE:` block to a free prompt (ignored with a message when the prompt already contains
  `STYLE:`). Without `--style`, a free prompt is sent as it is.
- `--tries N` (needs `--cutout`) tries seeds `s, s+1, ...` until the cutout is **clean**: no magenta left, the subject
  does not touch the image edge, magenta tint on the subject <= 2%, subject area 1-95% (`py/image_engine.py
  score-cutout`). It stops at the first clean one; when there is none, the best-scoring one is used. The best is copied to
  `-o` (+ `_cutout.png` + `.json` with the score of every try); all tries stay as `<name>_s<seed>.png`.
  Without `--cutout`, `--tries` is refused with a message (there is nothing to score).
- Calibration of score-cutout on 6 test ad assets: 5 clean; a laptop "slightly purple from magenta reflection" was flagged
  (tint 5.4%). A dark red drop shadow under the object is not detected; still check the crop (3.6 item 6).

### 3.4 Style

`--style paper` (default for `kit` and `plate`; for free prompts added only when written; the STYLE block 4.3,
flat-background version: shadows only inside the piece = house style Atelier Kertas, `references/style.md` 3.0), `vector`, `origami`,
`pixel`, `stitch` (Sulam Kertas: paper relief + embroidery + felt figures, alias `sulam`; kit, cutting and motion rules in `references/style.md` 17.5), `layered` (Lapis Kertas: deep layered paper-cut diorama) `diorama` (Diorama Kertas: folded-card 3D miniature, `references/style.md` 17.7) and `quilling` (Gulung Kertas: rolled paper strips; layered and quilling in `references/style.md` 17.6), or free text. For a paper style that is already approved, a style reference (an old kit) is stronger than words.

### 3.5 Animation from a kit

`render/examples/kit-rig.html` assembles `kit.json` into a DOM joint rig (hip -> thigh -> shin -> foot; neck ->
head; shoulder -> upper arm -> lower arm -> hand) and runs a walk cycle over a sliding plate background.

```bash
mgp contact kit-rig.html --n 8 -o contact.png
mgp render kit-rig.html -o walk.mp4
```

For production, replace that simple cycle with the motion library `motion-graphics/lib` (gait, springs) or the
`vector-character` rig; the pivots from `kit.json` become `transform-origin` directly.

### 3.6 One pose per image for paper stop-motion (paper-style anime character test, 05-11-2026)

Test material: a paper-style anime character, a 4-pose walk, local FLUX.2 klein 4B with `--reference`.

1. **One pose per image.** One sheet with many poses FAILED: every figure stood upright and the paper texture was lost.
   Ask for one figure, one pose, magenta background (`--magenta --cutout`).
2. **Standing reference + a detailed limb description.** With `--reference` the character stays consistent (face, hair, costume),
   but the model tends to **copy the reference pose**. For other poses, use a STANDING reference of the character and describe the
   limbs one by one, for example "left leg forward, knee slightly bent, heel touching the ground; right leg behind,
   toes pushing off; left arm swinging back, right arm forward; body leaning slightly forward, facing frame right".
3. **Expect ±50% success** for difficult poses (2 of the 4 test poses). Use `--tries N` (together with `--cutout`; 3.3:
   it picks the cleanest cutout, not the correct pose) or other seeds, then pick the pose from a contact sheet; do not
   patch a wrong pose.
4. **2-4 poses are enough for paper stop-motion on fours** (6 images/s: each pose held 4 frames at 24 fps). One
   shared scale and the soles on one baseline (`references/cutout.md` 5.3), not a scale per pose.
5. **Smoother motion = cut a kit, then rig it.** When 2-4 poses feel choppy, make a kit (3.1) of the same character
   and move it with a code rig (3.5, `motion-graphics/lib`), instead of adding AI poses.
6. **Magenta left after `--cutout` is cleaned automatically** (default in `mgp image --cutout`, `kit`, and `slice`;
   switch off with `--no-clean`). What the cleaner does (`render/py/cutout.py`, `clean()`, numpy + Pillow):
   - leftover magenta = `min(R, B) - G > 40` and `R > 120`; those pixels and alpha < 128 become transparent, the rest 255;
   - 8-neighbour connected components (scipy when available, otherwise a per-row union-find; same result): keep components
     >= 2% of the area of the largest component. Kit sheets (`kit`, `slice`) do NOT drop small components, because hands/feet are valid;
   - dropped pixels get the average colour of the kept neighbours, so blur does not bring up a pink fringe;
   - alpha gets a 0.6 px Gaussian blur. Cropping to the alpha > 40 box happens during assembly, not in the cleaner.
   - Test on 3 anime poses: leftover magenta 11,288 / 47 / 18 px became 0; a loose 31 px speck was dropped; <0.6 s per image.
   - Limits: magenta/bright purple clothes or objects are erased too (use `--no-clean`); a dark red drop shadow
     drawn by the model is not treated as magenta and stays.
   - full key with despill for magenta backgrounds: `scripts/magenta_key.py` (17.4, Part B).
   - **Despill (default since 06-11-2026; P2_iklan_105: cup "magenta tint 3.76 %" was only reported).** After the cleaner,
     `--cutout`, `kit`, `slice` and `mgp cutout --key magenta` take the key-colour excess out of the subject along the alpha
     edge (`cutout.py`, `despill()`): magenta `min(R,B) - G` is subtracted from R and B (green: `G - max(R,B)` from G;
     any `#rrggbb` through its dominant channels), full strength within 1.5 % of the short side (15 px at 1024) of a
     transparent pixel and half up to twice that, the lost brightness spread back over R, G, B (no dark rim); interior
     colours stay. Measured: cup 3.76 % -> 0.28 % (now clean, score 0), anime poses 0.6-1.4 % -> <= 0.06 %; skin, yellow
     and navy unchanged. Switch off: `--no-despill`. A cutout made earlier: `python -I render/py/cutout.py despill in.png
     out.png --key-color magenta [--despill-radius 20 | --everywhere]` (`--everywhere` = whole subject, for footage lit
     by a coloured screen). A model cutout (rembg) of a subject shot on green: `mgp cutout in.png --despill green`.
7. Long per-frame AI sequences (a different pose in every frame) stay on the Higgsfield route (section 2 item 5).

## 4. Local: install and memory

Install once per computer (Claude offers it at the start of a project from the `mgp doctor` results; it may run in the background
while the brief is being worked on):

```bash
node motion-graphics-pro/render/bin/mgp.mjs install image --detach     # or: install all (voice + image)
node motion-graphics-pro/render/bin/mgp.mjs install image --status       # progress / status of each part
```

- Venv `~/.mgp/venv-image` (short path) with the locked packages of `render/py/requirements-image.txt` (diffusers 0.42.1,
  transformers 5.22.1, accelerate, gguf, huggingface_hub), installed with `--no-deps`. The voice venv uses diffusers 0.29 +
  transformers 5.2, locked by chatterbox-tts, so the two **cannot share one venv**.
- PyTorch is **not installed twice**: when the voice venv exists (same Python minor version, torch 2.6.0), the image venv gets a
  `zz_mgp_torch.pth` file (an old `zz_rekam_torch.pth` is still used) that points to the voice venv's site-packages; the image venv's own packages still come first. pip
  runs while the `.pth` is switched off, so it never touches the voice venv's packages. Without a voice venv, torch is installed
  on its own (the build is chosen the same way as for voice: cu126/cu118/MPS/ROCm/CPU).
- FLUX.2 [klein] 4B GGUF Q4_K_M + Qwen3-4B GGUF Q4_K_M + VAE/config weights (17 files, 4.92 GB) are locked to a commit +
  sha256 in `render/py/model-manifest.json`, downloaded to `~/.mgp/model/hf` (Hugging Face cache layout) with resume.
- Local images are not advised when total RAM < 16 GB (needs `--force`); without a GPU it is very slow.
- Smoke test: one 512x512 image through the shared GPU lock. When free RAM < 11 GB, the test is marked PENDING (the install is still
  valid); repeat it later: `mgp install image --components smoke-test`.
- An old manual install (e.g. venv `~/vgb` + `~/vgb-model/hf`, or env `MGP_IMAGE_PYTHON` / `MGP_IMAGE_MODEL`)
  is recognised by `--status`; `mgp install image --adopt` registers it after the sha256 matches, without downloading again.

**Manual way** (without `mgp install`): create a venv on a short path, `pip install --no-deps -r render/py/requirements-image.txt`,
borrow torch with a `.pth` file containing the path of the voice venv's site-packages (add it AFTER pip), then
`mgp image download` (plain resumable HTTP; xet is switched off because it stalls on a ±1 MB/s network) and point to it
with `MGP_IMAGE_PYTHON` + `MGP_IMAGE_MODEL`. Full steps: `render/README.md`, section `mgp image`.
- Memory-saving order: the Qwen3-4B text encoder (bf16, measured peak RSS 11 GB, ±100 s) runs on the CPU and is then dropped; only then are the GGUF transformer
  (2.6 GB) + VAE loaded onto the GPU through the shared GPU lock (`py/device.py`, task `flux2-klein-4b-gguf` in
  `hardware-requirements.json`). When VRAM is short: `enable_model_cpu_offload`; when CUDA runs out of memory: retry on the CPU.
- Free RAM < 11 GB: the command stops with a message (it is not forced). `MGP_IMAGE_FORCE=1` forces it.

Measured numbers on an RTX 500 Ada 4 GB laptop: see section 5 below and `render/README.md`, section `mgp image`.

## 5. Test results (05-11-2026, RTX 500 Ada 4 GB, Core Ultra 7 165H)

| Test | Result |
|---|---|
| `hf` Space klein, free prompt 768x512 | 10 s; quality equal to local |
| `hf` Space anonymous quota | used up after ±5 requests (including 2 refused for > 1024 px); `event: error` without a message; not recovered after ±1 hour |
| Local klein 768x512 without reference | diffusion 9 s, peak VRAM 3.47 GB; total 112 s (text encoder 57 s load + 33 s encode) |
| Local plate 1344x752 | diffusion 22 s, VRAM 3.78 GB |
| Local kit 1024x576 + template + 1 character reference (ref 1024 px) | diffusion 158-218 s (VRAM 4.31 GB: spilled into shared memory), 1 of 2 seeds clean |
| Local kit, reference scaled down to 640 px (default) | diffusion 76 s |
| Kit without template (`--method prompt`) | the model makes a 4-view turnaround, not separate parts |
| Location kit of 8 objects (T4 a style) | 6 components: some objects stuck together (hill+house+tree); Higgsfield separated all 8 |

Quality compared with a Higgsfield kit (`guide/assets/img/kit-sheet.jpg`): the paper fibre texture is much thinner (more
like flat cardboard/foam board), colours are more saturated, pieces sometimes stick together; plates tend to be semi-photographic, not collage.
The magenta key is clean (no pink fringe in the preview), but a drop shadow that the model still draws
leaves a thin dark red line on the lower side of the piece; check it on the contact sheet.

## 6. Sources

- FLUX.2 [klein] 4B: <https://huggingface.co/black-forest-labs/FLUX.2-klein-4B> (Apache-2.0, "Open weights available for commercial use")
- FLUX.1 [schnell]: <https://huggingface.co/black-forest-labs/FLUX.1-schnell> (Apache-2.0; gated repo, mirror <https://huggingface.co/unsloth/FLUX.1-schnell>)
- FLUX.2 [klein] 9B (flux-non-commercial-license), FLUX.1 Kontext [dev] (flux-1-dev-non-commercial-license): model cards on Hugging Face
- SDXL-Turbo: <https://huggingface.co/stabilityai/sdxl-turbo> (sai-nc-community)
- Cloudflare pricing: <https://developers.cloudflare.com/workers-ai/platform/pricing/>; klein: <https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/>; schnell: <https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/>
- BFL terms: <https://bfl.ai/legal/terms-of-service>
- HF Inference Providers pricing: <https://huggingface.co/docs/inference-providers/pricing>
- klein Space: <https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B> (API `/gradio_api/info`)
- Gemini pricing: <https://aistudio.google.com/docs/pricing>
- Pollinations API: <https://github.com/pollinations/pollinations/blob/main/APIDOCS.md>; model list `https://gen.pollinations.ai/image/models`; terms: <https://github.com/pollinations/pollinations/blob/main/pollinations.ai/public/legal/TERMS_OF_SERVICE.md>

---

# Part B · Higgsfield assets + magenta-background trick

Part of the `motion-graphics-pro` skill. Read when: stages 4-5 when using Higgsfield (gate G3), writing kit/plate/sequence prompts, or a single asset on a magenta background.

Moved verbatim from SKILL.md v2.3 (chapter 4 Higgsfield assets, 17.4 Magenta-background trick + local key); the old chapter numbers are kept. The free route for kits/plates is in Part A above; for a single magenta-background asset from the free route, use `mgp image "..." --magenta --cutout` (the 17.4 item 1 prompt recipe is applied automatically).

## 4. Higgsfield assets

4.1 **Gate.** Before generating, Claude asks the user to confirm Higgsfield access, checks the balance (tool `balance`), writes the job list + credit estimate, then waits for an OK. Job IDs, credits and balance are recorded in T5. This is the REQUIRED gate G3 (chapter 1.1): the approval covers the written job list and credit limit; failed jobs (4.4 item 5) are redone within that limit and reported; new jobs or credits above the limit need a new approval.

4.2 **Settings.** GPT Image 2.5 (`gpt_image_2_5`), quality high. Tests at 1K (1.5 credits per image); production kits and sequence sheets at 2K (2.75 credits). 21:9: 1K 1344 x 576, 2K 2688 x 1152. 9:16: 1K 752 x 1344, 2K 1520 x 2688. At most 4 parallel jobs. Error 429 = a failed submission with no credits charged; resend only that job. Local uploads are blocked by the proxy; references are taken from existing Higgsfield jobs or media.

| Type | Aspect ratio, res | Contents |
|---|---|---|
| Kit set | 21:9 2K | 6-12 pieces of one location, one scale, spaced apart; plain white background (white pieces: plain mid blue) |
| Sequence sheet | 21:9 2K | 6 frames of one action, same size, soles on one baseline, white gutters |
| Face kit | 21:9 1K-2K | 8 mouths + 6 pairs of eyebrows (+ 6 pairs of eyes for objects with faces) |
| 2-state crowd | 21:9 2K | Every person calm + reacting, side by side |
| Model sheet / plate | 21:9 / 9:16 2K | 4 views + 3 character close-ups (6.6; a 5-view turnaround when needed) / style anchor, interior |
| Keyframe + layer-split sheet | 9:16 2K + 21:9 2K | Branch B (chapter 15) |

4.3 **STYLE block** (proven; pasted identically into every prompt):

```text
Every element is a separate piece of real matte cardstock or textured paper with clean scissor-cut edges, stacked in visible depth layers with soft natural drop shadows between layers, subtle paper fibre grain, slight card thickness visible on edges, photographed straight on. Bright clean daylight, clean whites, rich natural colours. Not cartoon, not anime, not 3D render, not glossy, no sepia wash, no vintage filter. No readable text, letters, numbers, symbols, signs, logos or watermarks anywhere.
```

4.4 **Prompt rules.**
1. Prompts in English: CANVAS, PIECES (or CHARACTER + FRAMES), STYLE, ONLY. Forbidden objects are not named outside STYLE; prompts do not ask for numbers or labels.
2. The character description is identical in every prompt; background characters are written out in full (age, clothes, head covering, facing direction); directions use frame terms. A plate names the camera, vanishing point, "Empty scene: no people", and the empty area.
3. Old job IDs become image_references (style anchor for kits; the character's model sheet for every sequence, crowd and face kit of that character (6.6); the parent kit for derivatives).
4. Objects with writing are described as plain ("plain with simple shapes, no printing"); figures forbidden by the content rules are never requested.
5. Every result is checked (count, nothing touching, same costume, flat background, no text/logos/wrong symbols); failed jobs are redone without asking.

4.5 **AI video.** Image-to-video only for 2-3 hero shots that cannot be achieved with pieces (smoke, water, subtle acting), never for sacred figures. Start frame = the approved still; the prompt follows the skill's video prompt rules (shot type, camera and lens, location, layout map, timed shots, people references, one location per generation).

## 17.4 Asset trick: flat magenta background + local key (from chapter 17)

17.4 **Higgsfield asset trick: flat magenta background + local key** (proven for buildings and ornaments with openings).
1. **Prompt.** A single asset (object, gate, ornament, character) is requested on a flat magenta background: "isolated on a flat solid pure magenta #FF00FF background, no texture, no gradient, no shadow on the background". Every opening is requested in magenta too: "every opening, window, arch and lattice gap shows the same flat magenta #FF00FF". So that nothing is cut off: "the whole object fully visible with a wide margin on every side, nothing touching or cropped at the edges".
2. **Why magenta.** This colour hardly occurs in paper, wood, stone, skin or leaves, so the colour key is clean; lattice gaps and windows become transparent too, without flood fill and without reopening holes (compare 5.2). A white background is still used for kits with many pieces (5.1). Avoid objects with strong magenta/purple colours; if there are any, check that part on the contact sheet.
3. **Local key** (`scripts/magenta_key.py`, logic from the script used in production):
   - m = min(R, B) - G (magenta amount); sat = max(R, B) - min(R, B).
   - alpha = clip(1 - (m - 40) / 70, 0, 1): m >= 110 transparent, m <= 40 opaque.
   - sat > 90 (strong red or strong blue, not both) stays opaque.
   - Dark magenta (background in shadow): G < 0.3 x min(R, B) and min(R, B) > 45 becomes transparent.
   - Despill: spill = max(m - 10, 0) on semi-transparent pixels (half of it on opaque pixels with m > 25); R and B are reduced by 0.8 x spill.
   - Alpha: MinFilter 3 (erode 1 px), then Gaussian 0.7; save an RGBA PNG + a preview on dark blue (20, 30, 60) for QC.

```bash
python -I scripts/magenta_key.py assets/raw/gate.png assets/src/gate.png --preview review/k_gate.jpg
```

4. **QC** (5.4): preview on a dark background; lattice gaps really see-through; no pink fringe; edges not cut off (if cut off, generate again with a wider margin, do not patch). Job IDs, credits and the key result are recorded in T5.
