# NOTICE · Third-party credits

Motion Graphics Pro v2.4. Copyright © 2026 Salim Muhammad.

All code, scripts, documents and assets in this package are original work licensed under [LICENSE.md](LICENSE.md), except as noted below. No third-party source files are copied into the package; runtime dependencies are installed by the user (npm/pip) and remain under their own licences.

Detailed notices per part: `motion-graphics-pro/render/NOTICE` (mgp, including the bundled fonts), `motion-graphics-pro/blocks/NOTICE` (ready-made blocks), `motion-graphics/scripts/NOTICE` and `vector-character/scripts/NOTICE` (Python layer).

## Acknowledgment

Motion Graphics Pro is the original work of Salim Muhammad. This package **is not derived from, owned by, or endorsed by** any of the projects below, and the user does not need to install any of them to use this package. What was taken is only ideas, contract names for compatibility, formulas, or observed behaviour; the code was written independently. In short:

| Project | What was taken | What was NOT taken |
|---|---|---|
| HyperFrames (HeyGen, Apache-2.0) | Attribute and global names of the composition contract (`data-*`, `window.__timelines`, `<template>` + `#root`, `hf-seek`, `__hf*`, `__hyperframes.*`) so old compositions keep working; the idea of a block registry installed as source (`add`/`catalog`); the list of registry item names as a coverage checklist and an old-name map; the principles of the character (personification) document | Code, document text, CLI, cloud render. Neutral names exist for all of them (`render/README.md`, "Compatibility") |
| GSAP (GreenSock/Webflow) | The shape of the public API (function names, vars, position parameter, ease names) imitated by mgp.motion; the global `gsap` as a compatibility alias | GSAP code. Real GSAP is only used when the user installs it themselves (`--native-gsap`) |
| OpenMontage | Production flow principles from public research (v2.0) | Code and text |
| Remotion | Only mentioned as a comparison on the guide site | Anything |
| Lottie / lottie-docs, lottie-web | Description of the JSON format (lottie-docs, CC-BY 4.0); two lottie-web export compatibility behaviours; lottie-web as a test reference | Code and documentation text |
| Skia, skia-python | Compositing, stroke, and matrix behaviour imitated by the pure engine `brush.py`; skia-python as an optional engine when the user installs it | Skia code (not bundled) |
| OpenCV | Algorithm behaviour re-translated in `image_ops.py` (Suzuki-Abe, HSV, INTER_AREA, Keys cubic, LINE_8, and others) | OpenCV code (not needed) |
| Playwright / playwright-core (Microsoft) | Some Chrome launch defaults for identical results; a Chromium downloaded by Playwright is looked for if one happens to be there | Playwright code (the CDP client is written independently) |
| "Motion Format" | Nothing (this name only ever appeared in an old copy of the site) | - |

Details per work are in the tables below. Counts and names of what is bundled: 24 OFL font families, Natural Earth data, 260 blocks, mgp.motion.

## Ideas, contracts, and algorithms followed

| Work | Owner | Licence | What is used in this package |
|---|---|---|---|
| [HyperFrames](https://github.com/heygen-com/hyperframes) | HeyGen, Inc. | Apache License 2.0 | mgp (`motion-graphics-pro/render/`, old name Rekam) follows the HyperFrames composition contract so old compositions keep working: the attributes `data-composition-id`, `data-composition-src`, `data-start`, `data-duration`, `data-width`, `data-height`, `data-fps`, `data-media-start`, `data-volume`, `data-playback-rate`, `data-has-audio`, the `.clip` class, `window.__timelines`, `<template>` scenes with `#root`, the `hf-seek` event, `window.__hfLottie`, `window.__hfAnime`, `window.__hf.buildReady`, and the principle "seek a paused timeline per frame". Names and behaviour were taken from the HyperFrames documentation; the code was written independently. The skill also refers to the principles of HyperFrames documents (for example `character.md`) without copying their text. Since v2.4 every contract name has a neutral equivalent (`window.__mgp`, `mgp-seek`, `__mgpLottie`, `__mgpAnime`, block field `aliases`); the old names are still accepted. |
| [OpenCV](https://opencv.org) | Intel Corporation, Willow Garage, Itseez, OpenCV Foundation, and contributors (2000-2024) | Apache License 2.0 | `image_ops.py` is rewritten with numpy + Pillow, imitating OpenCV behaviour so the results are the same: Suzuki-Abe border following (`icvFetchContour`, RETR_EXTERNAL, CHAIN_APPROX_NONE), the 8-bit HSV table, INTER_AREA weights, Keys cubic coefficients (a = -0.75), automatic Gaussian kernel size and BORDER_REFLECT_101, LINE_8 rasterization (LineIterator, FillConvexPoly, midpoint circle, ThickLine), connectedComponents label order and convexHull. The raster and contour tracing parts are step-by-step translations of those algorithms. |
| [Skia](https://skia.org) | Google Inc. (2011) | BSD 3-Clause | The pure engine `brush.py` imitates Skia behaviour: Porter-Duff compositing and blend modes on premultiplied colour, stroke behaviour (caps, joins, miter limit, hairlines), the 3 x 3 matrix convention, nonzero/evenodd fill rules. |
| [skia-python](https://github.com/kyamagu/skia-python) | Kota Yamaguchi | BSD 3-Clause | Optional engine of `brush.py`: used automatically when the user installs it (`pip install skia-python`). Not bundled. |
| SVG 1.1, appendix F.6 | W3C | W3C Document License | The SVG arc conversion in `brush.py` follows the implementation notes. |
| [Lottie / Bodymovin JSON](https://lottiefiles.github.io/lottie-docs/) (lottie-docs) | LottieFiles and the lottie-docs contributors | CC-BY 4.0 (documentation) | The player and exporter in `motion-graphics/lib/lottie/` are written independently from the format description in lottie-docs: JSON structure, transform order, keyframes and easing, shapes, modifiers, masks, mattes, text. No documentation text is copied. |
| [lottie-web](https://github.com/airbnb/lottie-web) | Airbnb / Bodymovin (Hernan Torrisi) | MIT | Only a reference on the parity test page (loaded from cdnjs, not bundled). There is no lottie-web code in the package. Two lottie-web behaviours are followed for export file compatibility: a fixed number of path points per track and `nm` on dash entries. The lottie-web test samples (MIT) and lottie-docs examples (CC-BY 4.0) are not bundled. |

## Formulas and concepts behind the motion principles (v2.4)

The code below is written independently; only published formulas or concepts are followed. No third-party code is copied.

| Source | What is used |
|---|---|
| K. Shoemake, "Animating Rotation with Quaternion Curves", SIGGRAPH 1985 | The SLERP formula in `MGP.core.slerp` / `slerpDirection` |
| M. Schenk and S. D. Guest, "Geometry of Miura-folded metamaterials", PNAS 2013 | The closed-form Miura-ori cell formula (H, S, L, V) in `lib/fold-pattern.js` |
| Maekawa-Justin and Kawasaki-Justin theorems (flat-folding mathematics) | Local conditions in `MGP.origamiFold.validatePattern` |
| P. Ekman and W. Friesen, Facial Action Coding System (FACS) | Action Unit numbering and meaning in `lib/face.js` (a short version, not the FACS scoring system) |
| The widely shared After Effects "inertial bounce" expression (popularized by Dan Ebberts) | The formula y = value + v * amp * sin(2 pi f dt) / e^(decay dt) in `MGP.core.inertia` and `mgp.motion.inertia` |
| Cinema 4D MoGraph Fields/Effectors system (Maxon) | The concept of cloner + effector + falloff field (T' = T + dT * F) in `lib/field.js`; names and code written independently |

## The mgp.motion animation engine

`motion-graphics/lib/motion/` (and its copy `motion-graphics-pro/render/src/motion.js`) is written from scratch; no GSAP code is copied. mgp.motion imitates the shape of the GSAP 3 public API (function names, vars shape, position parameter, ease names) so old compositions keep working; its behaviour is matched through black-box tests against GSAP output (`lib/motion/test/`). The ease formulas are standard mathematical functions.

## Ready-made blocks

`motion-graphics-pro/blocks/` (260 blocks: transitions, titles, kinetic text, captions, charts, maps, 3D, camera, backgrounds, accents) is written independently. The idea of a block registry installed as editable source, and the `add`/`catalog` commands (in mgp: `mgp add` / `mgp catalog`), follow [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Inc., Apache-2.0). The HyperFrames registry item list is only used as a coverage checklist and an old-name map; code, styles, and props are rewritten. Shaders based on the Shaders library (MIT) are not copied.

## Bundled fonts

`motion-graphics-pro/render/fonts/`: 24 Google Fonts font families (Fraunces, Geist, Inter, Cinzel, Noto Naskh Arabic, Press Start 2P, and others), redistributed unmodified under the **SIL Open Font License 1.1**. The licence text for each font is in `fonts/<name>/OFL.txt`; the copyright of each font is listed in `motion-graphics-pro/render/NOTICE`. The fonts are not sold separately and are not covered by the Motion Graphics Pro Licence.

## Bundled third-party data

| Data | Owner | Licence | What is used in this package |
|---|---|---|---|
| [Natural Earth](https://www.naturalearthdata.com) (1:50m and 1:10m vectors, GeoJSON version from [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector)) | Natural Earth, supported by NACIS | Public domain ([terms of use](https://www.naturalearthdata.com/about/terms-of-use/)) | `motion-graphics/lib/map-data/`: land, minor islands, coastlines, lakes, country borders, country polygons, and populated places (including the Indonesian names `NAME_ID`). The data is simplified, clipped per region, and re-encoded by `build-map.mjs`; its content is still derived from Natural Earth. Credit is not required, but we include it: "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com." |

## Runtime dependencies (not bundled)

| Package | Owner | Licence | Used by |
|---|---|---|---|
| Chrome DevTools Protocol | Google / the Chromium project | BSD 3-Clause (protocol specification) | mgp uses an independently written CDP client (no npm, no Playwright) to drive the Chrome/Edge that is already installed. Some launch defaults follow playwright-core (Apache-2.0, Microsoft) for identical results; none of its code is copied. |
| [GSAP](https://gsap.com) | GreenSock / Webflow | GSAP Standard "No Charge" License, <https://gsap.com/standard-license> | **Optional, not needed.** The package uses mgp.motion (`motion-graphics/lib/motion/`), an independently written animation engine with a GSAP-compatible API; mgp serves mgp.motion for every GSAP request. Real GSAP is only used when the user installs it themselves and runs mgp with `--native-gsap`, or when a composition is opened directly in a browser with a GSAP CDN tag. |
| [numpy](https://numpy.org) | NumPy Developers | BSD 3-Clause | Every Python script |
| [Pillow](https://python-pillow.org) | Jeffrey A. Clark and contributors | MIT-CMU (HPND) | Every Python script (image read/write, pure-engine text) |

## Voice engines (installed separately, not bundled)

`mgp voice` uses models that the user downloads into a separate venv (see `motion-graphics-pro/voice/README.md`):

| Package | Owner | Licence |
|---|---|---|
| [Chatterbox](https://github.com/resemble-ai/chatterbox) (code + weights) | Resemble AI | MIT (every output carries an inaudible Perth watermark, MIT) |
| [OpenVoice V2](https://github.com/myshell-ai/OpenVoice) (optional) | MyShell.ai | MIT |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | SYSTRAN | MIT |
| [Resemblyzer](https://github.com/resemble-ai/Resemblyzer) | Resemble AI | Apache-2.0 |

## Image engines and services (mgp image; not bundled)

`mgp image` calls the services below through their APIs with the user's own key (or without a key for a public Space), or loads weights that the user downloads. Licences and terms were checked on 05-11-2026; details in `motion-graphics-pro/references/image.md`.

| Model / service | Owner | Licence / terms |
|---|---|---|
| [FLUX.2 [klein] 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) (weights, official Space) | Black Forest Labs | Apache-2.0 |
| [FLUX.1 [schnell]](https://huggingface.co/black-forest-labs/FLUX.1-schnell) (weights, official Space; mirror `unsloth/FLUX.1-schnell`) | Black Forest Labs | Apache-2.0 |
| GGUF [unsloth/FLUX.2-klein-4B-GGUF](https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF), [unsloth/Qwen3-4B-GGUF](https://huggingface.co/unsloth/Qwen3-4B-GGUF), [city96/FLUX.1-schnell-gguf](https://huggingface.co/city96/FLUX.1-schnell-gguf), [city96/t5-v1_1-xxl-encoder-gguf](https://huggingface.co/city96/t5-v1_1-xxl-encoder-gguf) | Unsloth AI; city96 (quantization) | Follows the licence of the original model (Apache-2.0; Qwen3 Apache-2.0, T5 Apache-2.0) |
| [diffusers](https://github.com/huggingface/diffusers), [transformers](https://github.com/huggingface/transformers), [accelerate](https://github.com/huggingface/accelerate), [huggingface_hub](https://github.com/huggingface/huggingface_hub) | Hugging Face | Apache-2.0 |
| [gguf](https://github.com/ggml-org/llama.cpp/tree/master/gguf-py) | ggml-org | MIT |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) | Cloudflare | Cloudflare terms + [BFL terms](https://bfl.ai/legal/terms-of-service) for FLUX models (output belongs to the user) |
| [Hugging Face Spaces / ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu) | Hugging Face | Hugging Face terms of service |
| [Pollinations](https://github.com/pollinations/pollinations) | Myceli.AI OÜ | [Pollinations terms](https://github.com/pollinations/pollinations/blob/main/pollinations.ai/public/legal/TERMS_OF_SERVICE.md) |

Deliberately not used: SDXL-Turbo (sai-nc-community licence), FLUX.1 Kontext [dev] and FLUX.2 [klein] 9B (FLUX non-commercial licence), the Gemini API for images (no free tier for image output).

## External tools (installed separately by the user)

- **ffmpeg / ffprobe** (LGPL 2.1+ or GPL 2+, depending on the build): encoding, audio, QC.
- **Google Chrome, Microsoft Edge, or Chromium**: the frame capture browser for mgp.
- **HyperFrames** (Apache-2.0): not needed; mgp reads its composition format, and blocks, Studio, and transcription are already in the package.
- **Google Fonts** (mostly SIL Open Font License 1.1): fonts outside the 24 bundled families can still be loaded by a composition from Google Fonts.

Third-party brands and services mentioned in the documents (HyperFrames, Higgsfield, ElevenLabs, Rhubarb Lip Sync, Natural Earth, and others) remain the property of their respective owners.

## Independent project

Motion Graphics Pro is an independent project by Salim Muhammad. It is not affiliated with, endorsed by or sponsored by Anthropic, PBC, or by any other company or project named in this package. "Claude" is a trademark of Anthropic, PBC; all other names are trademarks of their respective owners and are used only nominatively (to describe compatibility, comparisons and credits).
