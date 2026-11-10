// mgp image (old: rekam gambar): free still images for kit sheets and plates (motion still comes from code/rigs).
//   mgp image "<prompt>" -o out.png [--source auto|free-cloud|local|higgsfield] [--provider hf|cloudflare|pollinations]
//                [--model klein|schnell] [--reference a.png ...] [--aspect 21:9] [--width 1536 --height 656] [--seed 7]
//                [--magenta] [--cutout] [--style paper] [--tries 3 (needs --cutout)]
//   mgp image kit "<character description>" -o kit/ [--style paper|vector|origami|"<text>"] [--reference model.png]
//   mgp image plate "<place>" -o plate.png [--aspect 9:16] [--style paper]
//   mgp image slice sheet_cutout.png -o kit/ [--names head,torso,...]     cut a sheet again into parts + kit.json
//   mgp image providers [--json]                                         routes, API keys, local model files
// Cloud through fetch (Node), local through py/image_engine.py (diffusers + GGUF, device manager py/device.py).
// Old names still work: subcommands iris/unduh/penyedia, --sumber cloud-gratis|lokal, --gaya kertas|vektor, kit.json bagian[].
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { FFMPEG } from "./ffmpeg.mjs";
import { findPython, runPy } from "./python.mjs";
import { installedPaths } from "./location.mjs";
import { env as envVar } from "./names.mjs";
import { L } from "./i18n.mjs";

const say = (o, s) => { if (!(o.quiet ?? o.diam)) process.stderr.write(s + "\n"); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ prompt recipes */

// references image guide section 17.4 (proven magenta background) + the no text/logo rule of the STYLE block 4.3
export const MAGENTA_RECIPE = "Isolated on a flat solid pure magenta #FF00FF background, no texture, no gradient, no shadow on the background. " +
  "Every opening, window, arch, lattice gap and the space between limbs shows the same flat magenta #FF00FF. " +
  "The whole subject fully visible with a wide margin on every side, nothing touching or cropped at the edges. " +
  "Do not use magenta, pink or purple anywhere on the subject.";
const NO_TEXT = "No readable text, letters, numbers, symbols, signs, labels, logos or watermarks anywhere.";

export const STYLES = {
  paper: "Every element is a separate piece of real matte cardstock or textured paper with clean scissor-cut edges, subtle paper fibre grain, " +
    "slight card thickness visible on edges, soft shading only inside each piece, photographed straight on. Bright clean daylight, rich natural colours. " +
    "Not cartoon, not anime, not 3D render, not glossy, no sepia wash, no vintage filter.",
  vector: "Clean flat vector illustration, smooth closed shapes, no outlines, one or two flat shade tones per shape, crisp edges, " +
    "limited harmonious palette. Not 3D, not photographic, no gradients mesh, no texture noise.",
  origami: "Folded paper origami look: every shape built from flat triangular and kite facets with a light and a dark side per fold, " +
    "cream paper back visible, crisp creases, no ink outlines. Clean studio light.",
  stitch: "Sulam Kertas (stitched paper) craft look: layered cut-paper relief combined with hand embroidery on warm cream cotton paper; " +
    "sky, water, clouds, foliage and flowers worked in visible thread (satin stitch, french knots, running stitch), buildings and props as " +
    "layered textured paper and felt with subtle 3D depth and soft shadows between layers; characters as felt-and-thread figures with " +
    "stitched seams and embroidered trims. Warm soft daylight, visible thread and paper fibre texture. Not photographic, not 3D render, not glossy, not cartoon outlines.",
  layered: "Lapis Kertas (deep layered paper-cut) look: a 3D papercut shadow-box diorama of many stacked sheets of matte coloured paper cut into " +
    "wavy layers, visible spacing and soft drop shadows between every layer, thin curved cut lines etched inside each layer, clean crisp paper edges, " +
    "suns and ripples as concentric paper rings, limited bold palette. Not flat vector, not photographic, not glossy, no ink outlines.",
  diorama: "Diorama Kertas (3D papercraft miniature) look: buildings, boats, trees and props folded from matte coloured card into real 3D boxes and volumes, " +
    "side faces and roofs visible, scored fold lines, tabs and seams hidden, set on a layered paper ground like a tabletop model photographed with a slight " +
    "three-quarter view and soft studio light, gentle contact shadows. Not flat vector, not photographic city, not glossy plastic, no ink outlines.",
  quilling: "Gulung Kertas (paper quilling) look: shapes built from narrow strips of coloured paper rolled into coils and scrolls or set on edge, " +
    "visible strip edges and spirals, clouds and foliage as tight coils, combined with a few layered paper-cut planes, soft studio light, " +
    "crisp paper edges. Not flat vector, not photographic, not glossy.",
  pixel: "Crisp pixel art sprite style, hard square pixels, limited 16-colour palette, 1-pixel dark outline, no anti-aliasing, no dithering on the background.",
};
const STYLE_OLD = { kertas: "paper", vektor: "vector", sulam: "stitch", "sulam-kertas": "stitch", embroidery: "stitch", lapis: "layered", "lapis-kertas": "layered", papercut: "layered", gulung: "quilling", "gulung-kertas": "quilling", "diorama-kertas": "diorama", papercraft: "diorama" };
const styleText = (g) => { const k = (g || "paper").toLowerCase(); return STYLES[STYLE_OLD[k] || k] || g; };

export const KIT_PARTS = [
  ["head", "head with hair and a short neck stub, no shoulders"],
  ["torso", "torso with clothing from neck to hips, no arms, no legs, shoulders and hips rounded"],
  ["upper_arm", "upper arm from shoulder to elbow with sleeve, hanging straight down, both ends rounded"],
  ["lower_arm", "forearm from elbow to wrist, hanging straight down, both ends rounded"],
  ["hand", "one open relaxed hand with the wrist at the top"],
  ["thigh", "thigh from hip to knee with trousers or skirt, straight vertical, both ends rounded"],
  ["shin", "shin from knee to ankle, straight vertical, both ends rounded"],
  ["foot", "one foot with its shoe in side view, toes pointing frame right, ankle at the top"],
];
const FACE_PARTS = [
  ["eye", "one pair of open eyes as a single piece"],
  ["mouth_closed", "a closed relaxed mouth"],
  ["mouth_open", "a medium open mouth"],
];

/** Edit prompt for the "template" method: reference image 1 = the grey slot sheet (py/image_engine.py template). */
export function kitTemplatePrompt(desc, o = {}) {
  const ref = o.reference && o.reference.length ? " Image 2 shows the character design: copy its exact face, hair, skin tone, colours and costume." : "";
  return `Image 1 is a layout template: grey placeholder shapes on a flat magenta #FF00FF background. ` +
    `Replace every grey shape with the matching separate cut-out body part of the same character, filling the same position and size, ` +
    `one part per shape, nothing else added. Top row from left to right: the head with hair and a short neck stub (side view facing frame right); ` +
    `the torso with its clothing from neck to hips, no arms and no legs; one upper arm wearing the sleeve of the same top in the same colour as the torso; ` +
    `one forearm; one open hand hanging down with the wrist at the top and the fingers pointing down. ` +
    `Bottom row from left to right: one thigh wearing the same trousers, shorts or skirt; one shin; one foot with its shoe in side view, toes pointing frame right. ` +
    `Keep the background flat solid magenta #FF00FF with wide empty magenta gaps between all parts; parts never touch each other. ` +
    `CHARACTER: ${desc}.${ref} STYLE: ${styleText(o.style)} Do not use magenta, pink or purple on the character. ${NO_TEXT}`;
}

export function kitPrompt(desc, o = {}) {
  const parts = o.face ? [...KIT_PARTS, ...FACE_PARTS] : KIT_PARTS;
  const ref = o.reference && o.reference.length ? " Keep the exact same character design, colours and costume as the reference image." : "";
  return `CANVAS: Wide ${o.aspect || "16:9"} character parts sheet for a cut-out puppet rig. ${MAGENTA_RECIPE} ` +
    `${parts.length} separate body parts of one character laid out in two loose rows with wide magenta space between parts ` +
    `(at least one tenth of the sheet width), every part complete, flat-on, not touching any other part, all at one consistent scale.\n` +
    `CHARACTER: ${desc}.${ref}\n` +
    `PIECES (side view, facing frame right): ${parts.map(([, d], i) => `${i + 1}. ${d}`).join("; ")}. ` +
    `Joint ends are rounded so parts overlap cleanly when rotated. Exactly one of each part.\n` +
    `STYLE: ${styleText(o.style)} ${NO_TEXT}\n` +
    `ONLY: Show only these ${parts.length} separate parts on the flat magenta background; no full figure, no assembled body, add nothing else.`;
}

export function platePrompt(place, o = {}) {
  const tall = /9:16|3:4|4:5/.test(o.aspect || "9:16");
  return `CANVAS: ${tall ? "Vertical" : "Wide"} ${o.aspect || "9:16"} scene, eye-level, one-point perspective, vanishing point at the horizontal centre about 45 percent from the top. ` +
    `Empty scene: no people, no animals. Keep the lower third clear and low-detail for pieces added later.\n` +
    `SET: ${place}.\nSTYLE: ${styleText(o.style)} ${NO_TEXT}\nONLY: Show only what this prompt describes; add nothing else.`;
}

/* ------------------------------------------------------------------ size */

const ASPECT = { "21:9": [21, 9], "16:9": [16, 9], "9:16": [9, 16], "1:1": [1, 1], "4:3": [4, 3], "3:4": [3, 4], "4:5": [4, 5], "3:2": [3, 2], "2:3": [2, 3] };
/** Size in multiples of 16 with the long side `long`. */
export function size(o, long = 1024) {
  if (o.width && o.height) return [r16(+o.width), r16(+o.height)];
  const [a, b] = ASPECT[o.aspect || "1:1"] || String(o.aspect).split(":").map(Number);
  if (!a || !b) throw new Error(L`unknown --aspect "${o.aspect}" (e.g. 21:9, 16:9, 9:16, 1:1)`);
  if (o.width) return [r16(+o.width), r16((+o.width * b) / a)];
  if (o.height) return [r16((+o.height * a) / b), r16(+o.height)];
  return a >= b ? [r16(long), r16((long * b) / a)] : [r16((long * a) / b), r16(long)];
}
const r16 = (x) => Math.max(256, Math.round(x / 16) * 16);
const clampSize = ([w, h], max) => { const s = Math.min(1, max / Math.max(w, h)); return [r16(w * s), r16(h * s)]; };

/* ------------------------------------------------------------------ file utils */

function ff(args) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let e = ""; p.stderr.on("data", (d) => (e += d));
    p.on("error", rej); p.on("close", (c) => (c === 0 ? res() : rej(new Error(L`ffmpeg failed: ` + e.trim()))));
  });
}
const isPng = (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
/** Save the bytes of any image (png/jpeg/webp) as PNG at `out`. */
async function savePng(buf, out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (isPng(buf)) { fs.writeFileSync(out, buf); return; }
  const tmp = path.join(os.tmpdir(), `mgp-image-${process.pid}-${Date.now()}.bin`);
  fs.writeFileSync(tmp, buf);
  try { await ff(["-i", tmp, "-frames:v", "1", "-pix_fmt", "rgb24", out]); } finally { fs.rmSync(tmp, { force: true }); }
}
/** Reference scaled down (long side <= max) to a temporary PNG; returns a Buffer. */
async function readReference(f, max) {
  const tmp = path.join(os.tmpdir(), `mgp-ref-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  try {
    await ff(["-i", path.resolve(f), "-vf", `scale='if(gt(iw,ih),min(${max},iw),-2)':'if(gt(iw,ih),-2,min(${max},ih))':flags=lanczos`, "-frames:v", "1", tmp]);
    return fs.readFileSync(tmp);
  } finally { fs.rmSync(tmp, { force: true }); }
}

/* ------------------------------------------------------------------ cloud providers */

/** env by its MGP_* name (old REKAM_* still read); other names (HF_TOKEN, CLOUDFLARE_*) as they are. */
const env = (k) => String((k.startsWith("MGP_") ? envVar(k) : process.env[k]) || "").trim();

export const PROVIDERS = {
  hf: {
    name: L`Hugging Face Space (ZeroGPU), official Black Forest Labs`,
    free: L`daily ZeroGPU quota; works without an account, a free account + HF_TOKEN gives a bigger quota`,
    keys: [], optionalKeys: ["HF_TOKEN"], references: { klein: 4, schnell: 0 }, max: 2048, maxModel: { klein: 1024, schnell: 2048 },
    model: { klein: "black-forest-labs/FLUX.2-klein-4B", schnell: "black-forest-labs/FLUX.1-schnell" },
    license: L`FLUX.2 [klein] 4B and FLUX.1 [schnell]: Apache-2.0 (output may be used commercially)`,
  },
  cloudflare: {
    name: "Cloudflare Workers AI",
    free: L`10,000 neurons/day free (reset 00:00 UTC); klein 1024x1024 about 104 neurons (about 95 images/day; references +5.4 neurons per 512 tile), schnell about 58 neurons (about 170/day)`,
    keys: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"], references: { klein: 4, schnell: 0 }, max: 1920,
    model: { klein: "@cf/black-forest-labs/flux-2-klein-4b", schnell: "@cf/black-forest-labs/flux-1-schnell" },
    license: L`Apache-2.0 models; the service follows the Cloudflare + BFL terms (the output belongs to the user)`,
  },
  pollinations: {
    name: "Pollinations (gen.pollinations.ai)",
    free: L`free Pollen (Quest Pollen) for non-paid models such as flux.2-klein-4b; needs an sk_ key`,
    keys: ["POLLINATIONS_KEY"], references: { klein: 4, schnell: 0 }, max: 2048,
    model: { klein: "black-forest-labs/flux.2-klein-4b", schnell: "black-forest-labs/flux.1-schnell" },
    license: L`licence per model (klein/schnell Apache-2.0); Pollinations terms: 'verify before commercial use'`,
  },
};

export const KEY_HELP = {
  hf: L`The Hugging Face Space works WITHOUT a key (small anonymous ZeroGPU quota). For a bigger quota:
  1. Sign up for free at https://huggingface.co/join (no credit card).
  2. Open https://huggingface.co/settings/tokens -> Create new token -> type "Read".
  3. PowerShell: setx HF_TOKEN "hf_xxx"   (open a new terminal)   |  bash: export HF_TOKEN=hf_xxx`,
  cloudflare: L`Cloudflare Workers AI (10,000 free neurons per day, Free account without a credit card):
  1. Sign up at https://dash.cloudflare.com/sign-up
  2. Account ID: dashboard -> Workers AI (or the account menu) -> copy "Account ID".
  3. Token: https://dash.cloudflare.com/profile/api-tokens -> Create Token -> template "Workers AI" (Workers AI permission: Read + Edit).
  4. PowerShell: setx CLOUDFLARE_ACCOUNT_ID "xxxx"; setx CLOUDFLARE_API_TOKEN "xxxx"   (open a new terminal)`,
  pollinations: L`Pollinations (free Pollen for non-paid models):
  1. Sign in with GitHub at https://enter.pollinations.ai
  2. Make a secret key (prefix sk_) at https://enter.pollinations.ai/keys ; limit the models to flux.2-klein-4b if you like.
  3. PowerShell: setx POLLINATIONS_KEY "sk_xxx"   (open a new terminal)`,
  gemini: L`The Gemini API is not used: per the official pricing page (aistudio.google.com/docs/pricing), every image output model
  (Gemini 2.5 Flash Image, 3.1 Flash Image, 3 Pro Image) says "Not available" on the Free Tier. So there is no free route.`,
};

function hasKeys(p) { return PROVIDERS[p].keys.every((k) => env(k)); }

/** Quota/key error -> {quota: true} so that `auto` moves on to the next provider. */
class ProviderError extends Error { constructor(m, extra = {}) { super(m); Object.assign(this, extra); } }

async function hfSpace(job) {
  const model = job.model;
  const base = env("MGP_HF_SPACE_BASE") || (model === "schnell" ? "https://black-forest-labs-flux-1-schnell.hf.space" : "https://black-forest-labs-flux-2-klein-4b.hf.space");
  const hdr = env("HF_TOKEN") ? { Authorization: "Bearer " + env("HF_TOKEN") } : {};
  const [w, h] = clampSize(job.size, PROVIDERS.hf.maxModel[model]); // Space sliders: klein max 1024, schnell 2048
  let data;
  if (model === "schnell") data = [job.prompt, job.seed, false, w, h, job.steps || 4];
  else {
    const gal = [];
    for (const f of job.reference) {
      const fd = new FormData();
      fd.append("files", new Blob([await readReference(f, 1024)], { type: "image/png" }), path.basename(f, path.extname(f)) + ".png");
      const r = await fetch(base + "/gradio_api/upload", { method: "POST", headers: hdr, body: fd });
      if (!r.ok) throw new ProviderError(L`HF Space: reference upload failed (${r.status}) ${(await r.text()).slice(0, 200)}`);
      const [p] = await r.json();
      gal.push({ image: { path: p, meta: { _type: "gradio.FileData" } }, caption: null });
    }
    data = [job.prompt, gal, "Distilled (4 steps)", job.seed, false, w, h, job.steps || 4, 1.0, false];
  }
  const r = await fetch(base + "/gradio_api/call/infer", { method: "POST", headers: { ...hdr, "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  if (!r.ok) throw new ProviderError(`HF Space: ${r.status} ${(await r.text()).slice(0, 300)}`, { quota: r.status === 429 });
  const { event_id } = await r.json();
  const s = await fetch(`${base}/gradio_api/call/infer/${event_id}`, { headers: hdr, signal: AbortSignal.timeout(+(env("MGP_IMAGE_TIMEOUT") || 600) * 1000) });
  const text = await s.text();
  const blocks = text.split(/\n\n+/).map((b) => ({ ev: (/^event: *(.*)$/m.exec(b) || [])[1], data: (/^data: *(.*)$/m.exec(b) || [])[1] }));
  const done = blocks.find((b) => b.ev === "complete");
  if (!done) {
    const err = blocks.find((b) => b.ev === "error");
    const m = err && err.data && err.data !== "null" ? err.data : L`error event without a message (usually the ZeroGPU quota ran out or the size is above the Space limit)`;
    throw new ProviderError(L`HF Space failed: ` + m + (env("HF_TOKEN") ? "" : "\n  " + L`(without HF_TOKEN the anonymous ZeroGPU quota is small; see: mgp image providers)`), { quota: /quota|GPU|exceeded|limit/i.test(m) });
  }
  const [img, seed] = JSON.parse(done.data);
  const url = img.url || `${base}/gradio_api/file=${img.path}`;
  const g = await fetch(url, { headers: hdr });
  if (!g.ok) throw new ProviderError(L`HF Space: downloading the result failed (${g.status})`);
  return { buf: Buffer.from(await g.arrayBuffer()), seed, size: [w, h], model: PROVIDERS.hf.model[model] };
}

async function cloudflare(job) {
  const acc = env("CLOUDFLARE_ACCOUNT_ID"), tok = env("CLOUDFLARE_API_TOKEN");
  if (!acc || !tok) throw new ProviderError(L`Cloudflare: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not set.` + "\n" + KEY_HELP.cloudflare, { noKey: true });
  const base = env("MGP_CF_BASE") || "https://api.cloudflare.com/client/v4";
  const id = PROVIDERS.cloudflare.model[job.model];
  const url = `${base}/accounts/${acc}/ai/run/${id}`;
  const [w, h] = clampSize(job.size, PROVIDERS.cloudflare.max);
  let r;
  if (job.model === "schnell") {
    // official schema: only prompt + steps (<= 8); the size is fixed at 1024x1024
    r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: job.prompt.slice(0, 2048), steps: Math.min(8, job.steps || 4) }) });
  } else {
    const fd = new FormData();
    fd.append("prompt", job.prompt); fd.append("width", String(w)); fd.append("height", String(h)); fd.append("seed", String(job.seed));
    let i = 0;
    for (const f of job.reference.slice(0, 4)) fd.append(`input_image_${i++}`, new Blob([await readReference(f, 512)], { type: "image/png" }), `ref${i}.png`);
    r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + tok }, body: fd });
  }
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = null; }
  if (!r.ok || !j || j.success === false || !(j.result && j.result.image)) {
    const m = j && j.errors ? j.errors.map((e) => `${e.code}: ${e.message}`).join("; ") : text.slice(0, 300);
    throw new ProviderError(`Cloudflare ${r.status}: ${m}`, { quota: r.status === 429 || /4006|neuron|allocation|quota/i.test(m) });
  }
  return { buf: Buffer.from(j.result.image, "base64"), seed: job.seed, size: job.model === "schnell" ? [1024, 1024] : [w, h], model: id };
}

async function pollinations(job) {
  const key = env("POLLINATIONS_KEY");
  if (!key) throw new ProviderError(L`Pollinations: POLLINATIONS_KEY not set.` + "\n" + KEY_HELP.pollinations, { noKey: true });
  const base = env("MGP_POLLI_BASE") || "https://gen.pollinations.ai";
  const model = PROVIDERS.pollinations.model[job.model];
  const [w, h] = clampSize(job.size, PROVIDERS.pollinations.max);
  let r;
  if (job.reference.length && job.model === "klein") {
    const fd = new FormData();
    fd.append("model", model); fd.append("prompt", job.prompt); fd.append("size", `${w}x${h}`); fd.append("seed", String(job.seed)); fd.append("response_format", "b64_json");
    for (const f of job.reference.slice(0, 4)) fd.append("image", new Blob([await readReference(f, 1024)], { type: "image/png" }), path.basename(f));
    r = await fetch(base + "/v1/images/edits", { method: "POST", headers: { Authorization: "Bearer " + key }, body: fd });
  } else {
    r = await fetch(base + "/v1/images/generations", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: job.prompt, size: `${w}x${h}`, seed: job.seed, n: 1, response_format: "b64_json" }) });
  }
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = null; }
  const d = j && j.data && j.data[0];
  if (!r.ok || !d) throw new ProviderError(`Pollinations ${r.status}: ${text.slice(0, 300)}`, { quota: r.status === 402 || r.status === 429 });
  const buf = d.b64_json ? Buffer.from(d.b64_json, "base64") : Buffer.from(await (await fetch(d.url)).arrayBuffer());
  return { buf, seed: job.seed, size: [w, h], model };
}

const RUN = { hf: hfSpace, cloudflare, pollinations };

/* ------------------------------------------------------------------ local */

const VGB = process.platform === "win32" ? path.join(os.homedir(), "vgb", "Scripts", "python.exe") : path.join(os.homedir(), "vgb", "bin", "python");
// order: --python > MGP_IMAGE_PYTHON > image venv from `mgp install image` (src/location.mjs) > ~/vgb (old manual install)
const imagePythonFound = () => installedPaths().pythonImage || (fs.existsSync(VGB) ? VGB : null);
function localPython(o) {
  const exp = o.python || env("MGP_IMAGE_PYTHON") || imagePythonFound();
  return findPython("diffusers, gguf, torch", exp);
}
const localHelp = () => L`The local route needs Python with torch + diffusers>=0.37 + transformers + gguf + accelerate.
Install once per computer: mgp install image  (venv + models about 4.9 GB; --detach = in the background; see the image reference).
Another venv: --python <path> or env MGP_IMAGE_PYTHON.`;

/** Local weights complete? (auto never starts a big download silently) */
async function localReady(o, model) {
  const py = localPython(o);
  if (!py) return false;
  try { const j = JSON.parse((await runPy(py, "image_engine.py", ["check", "--engine", model === "schnell" ? "schnell" : "klein4b"], { quiet: true })).trim().split("\n").pop()); return j.ready ?? j.siap; }
  catch { return false; }
}

async function local(job, o) {
  const py = localPython(o);
  if (!py) throw new ProviderError(localHelp(), { noKey: true });
  const args = ["make", "--prompt", job.prompt, "-o", job.out, "--width", String(job.size[0]), "--height", String(job.size[1]),
    "--seed", String(job.seed), "--engine", job.model === "schnell" ? "schnell" : "klein4b"];
  if (o.quant) args.push("--quant", o.quant);
  if (job.steps) args.push("--steps", String(job.steps));
  for (const f of job.reference) args.push("--reference", path.resolve(f));
  const outJson = await runPy(py, "image_engine.py", args, o);
  let info = {}; try { info = JSON.parse(outJson.trim().split("\n").pop()); } catch {}
  const d = info.device ?? info.perangkat;
  return { file: job.out, seed: job.seed, size: info.size || info.ukuran || job.size, model: info.model, device: d, seconds: info.seconds ?? info.detik };
}

/* ------------------------------------------------------------------ higgsfield (guide only) */

function higgsfieldGuide(job) {
  return L`Higgsfield is paid: mgp image does NOT call a paid API. Run it through the Higgsfield connector in Claude:
  1. Gate G3 (SKILL.md 4.1): check the balance (tool balance), write the job list + credit estimate, wait for the user's OK.
  2. generate_image: model gpt_image_2_5, quality high, aspect ${job.aspect || L`as needed`} (1K test 1.5 credits; 2K production 2.75 credits).
     Reference = a job ID / Higgsfield media that already exists (local upload is blocked by the proxy; SKILL.md 4.2).
  3. Download the result, then: mgp image slice <result>.png -o <folder> (kit) or mgp cutout <result>.png --key magenta.
  4. Note the job ID, credits, balance in T5.
Prompt ready to paste:
------------------------------------------------------------
${job.prompt}
------------------------------------------------------------`;
}

/* ------------------------------------------------------------------ core */

const AUTO_ORDER = ["cloudflare", "hf", "pollinations", "local"];

export function providersSummary(o = {}) {
  const py = (() => { try { return localPython(o); } catch { return null; } })();
  const r = {};
  for (const [k, p] of Object.entries(PROVIDERS)) r[k] = { name: p.name, free: p.free, ready: hasKeys(k), keys: p.keys, optionalKeys: p.optionalKeys || [], maxReferences: p.references.klein, license: p.license };
  r.local = { name: L`Local: FLUX.2 [klein] 4B GGUF (diffusers) / FLUX.1 [schnell] GGUF`, ready: !!py, python: py && py.exe, maxReferences: 4, license: "Apache-2.0" };
  r.gemini = { name: L`Google Gemini API (images)`, ready: false, rejected: L`no free tier for image output` };
  r.higgsfield = { name: L`Higgsfield (paid, through the Claude connector)`, ready: false, notes: L`guide + prompt only` };
  return r;
}

function order(o) {
  const s = String(o.source || "auto").toLowerCase();
  if (o.provider) {
    const p = o.provider.toLowerCase().replace(/^hugging.*|^hf-space$/, "hf");
    if (p === "gemini") throw new ProviderError(KEY_HELP.gemini);
    if (p === "lokal" || p === "local") return ["local"];
    if (!PROVIDERS[p]) throw new ProviderError(L`unknown --provider "${o.provider}" (hf, cloudflare, pollinations)`);
    return [p];
  }
  if (s === "lokal" || s === "local") return ["local"];
  if (s === "free-cloud" || s === "cloud-gratis" || s === "cloud") return AUTO_ORDER.filter((p) => p !== "local");
  if (s === "auto") return AUTO_ORDER;
  throw new ProviderError(L`unknown --source "${o.source}" (auto, free-cloud, local, higgsfield)`);
}

/** One image. Returns the meta (also written to <out>.json). */
export async function makeImage(prompt, o) {
  if (!prompt) throw new Error(L`Write a prompt: mgp image "<prompt>" -o out.png`);
  const out = path.resolve(o.o || o.out || "image.png");
  if (path.extname(out).toLowerCase() !== ".png") throw new Error(L`the output of mgp image is always .png`);
  const reference = [].concat(o.reference || []).filter(Boolean);
  for (const f of reference) if (!fs.existsSync(f)) throw new Error(L`reference not found: ${f}`);
  const model = /schnell/i.test(o.model || "") ? "schnell" : "klein";
  if (reference.length && model === "schnell") throw new Error(L`FLUX.1 schnell takes no reference images; use --model klein (the default).`);
  const full = o.magenta && !/#FF00FF/i.test(prompt) ? `${prompt.trim().replace(/\.?$/, ".")} ${MAGENTA_RECIPE} ${NO_TEXT}` : prompt;
  const job = { prompt: full, out, reference, model, seed: o.seed != null ? +o.seed : Math.floor(Math.random() * 2 ** 31), size: size(o, +(o.longSide || 1024)), steps: o.steps ? +o.steps : null, aspect: o.aspect };

  if (String(o.source || "").toLowerCase() === "higgsfield") {
    console.log(higgsfieldGuide(job));
    return { source: "higgsfield", prompt: full, guide: true };
  }
  if (o.dryRun) { console.log(JSON.stringify({ ...job, order: order(o) }, null, 2)); return { dryRun: true, ...job }; }

  const tries = order(o);
  const errors = [];
  let res = null, used = null;
  const t0 = Date.now();
  for (const p of tries) {
    if (p === "local" && tries.length > 1 && !(await localReady(o, model))) { errors.push(L`local: weights not downloaded yet (mgp image download) or no local Python`); continue; }
    if (p !== "local" && PROVIDERS[p].keys.length && !hasKeys(p)) { errors.push(L`${p}: key ${PROVIDERS[p].keys.join(" + ")} not set`); if (tries.length === 1) throw new ProviderError(KEY_HELP[p]); continue; }
    try {
      say(o, L`image: ${p === "local" ? L`local` : PROVIDERS[p].name} · ${model} · asks ${job.size.join("x")} · seed ${job.seed}${reference.length ? L` · ${reference.length} references` : ""}`);
      if (p === "local") res = await local(job, o);
      else {
        let r, n = 0;
        for (;;) { // retry once for a passing network error
          try { r = await RUN[p](job, o); break; }
          catch (e) { if (e instanceof ProviderError || ++n > 1) throw e; say(o, "  " + L`${p}: ${e.message}; retrying...`); await sleep(3000); }
        }
        await savePng(r.buf, out);
        res = { file: out, seed: r.seed, size: r.size, model: r.model };
      }
      used = p; break;
    } catch (e) {
      errors.push(`${p}: ${e.message.split("\n")[0]}`);
      say(o, "  " + L`${p} failed: ${e.message.split("\n")[0]}`);
      if (tries.length === 1) throw e;
    }
  }
  if (!res) {
    const help = Object.entries(KEY_HELP).filter(([k]) => k !== "gemini").map(([, v]) => v).join("\n\n");
    throw new Error(L`No provider succeeded:` + "\n  - " + errors.join("\n  - ") + "\n\n" + L`How to enable the free providers:` + "\n" + help);
  }
  const meta = { file: out, source: used === "local" ? "local" : "free-cloud", provider: used, model: res.model, prompt: full, seed: res.seed,
    size: res.size, reference: reference.map((f) => path.resolve(f)), seconds: +((Date.now() - t0) / 1000).toFixed(1), device: res.device,
    license: used === "local" ? "Apache-2.0 (local weights)" : PROVIDERS[used].license, time: new Date().toISOString(), tried: errors };
  fs.writeFileSync(out.replace(/\.png$/i, ".json"), JSON.stringify(meta, null, 2));
  say(o, L`image → ${out}  (${meta.provider}, ${[].concat(meta.size || []).join("x")}, ${meta.seconds} s)`);
  if (o.cutout) meta.cutout = await cutout(out, o);
  return meta;
}

function pyNumpy(o) {
  const py = findPython("numpy, PIL", o.python || env("MGP_IMAGE_PYTHON") || imagePythonFound() || undefined);
  if (!py) throw new Error(L`Needs Python with numpy + Pillow (pip install numpy pillow), or --python <path>.`);
  return py;
}

/** Magenta key -> <name>_cutout.png (logic of scripts/magenta_key.py through py/cutout.py). */
export async function cutout(inp, o, { sheet = false, lembar = false } = {}) {
  const out = inp.replace(/\.png$/i, "_cutout.png");
  // default: magenta leftover cleaner (thin alpha, magenta pixels, loose specks < 2% of the largest component).
  // kit sheet (many small parts): small components are kept. Switch off: --no-clean.
  const clean = o.noClean ? [] : ["--clean", "--components", sheet || lembar ? "0" : String(o.minComponent ?? 0.02)];
  // despill (default on): the magenta tint the background left on the subject is taken out along the alpha edge. Off: --no-despill.
  const ds = o.noDespill ? ["--no-despill"] : [];
  await runPy(pyNumpy(o), "cutout.py", ["magenta", inp, out, ...clean, ...ds], o);
  say(o, L`cutout (magenta key) → ${out}`);
  return out;
}

/** kit.json result of py/image_engine.py slice with the old keys mapped (bagian, nama, peringatan, pratinjau). */
const normSlice = (r) => ({ ...r, parts: (r.parts ?? r.bagian ?? []).map((b) => ({ ...b, name: b.name ?? b.nama })), warning: r.warning ?? r.peringatan ?? [], preview: r.preview ?? r.pratinjau });

/** Slice an alpha sheet into parts + kit.json + preview. */
export async function slice(inp, o) {
  if (!inp || !fs.existsSync(inp)) throw new Error(L`Name a sheet: mgp image slice sheet_cutout.png -o kit/`);
  const dir = path.resolve(o.o || o.out || path.join(path.dirname(inp), path.basename(inp, path.extname(inp)) + "_parts"));
  const args = ["slice", path.resolve(inp), dir];
  const names = o.names || o.name;
  if (names) args.push("--names", names);
  if (o.minArea) args.push("--minarea", String(o.minArea));
  if (o.template) args.push("--template", path.resolve(o.template));
  if (o.rotate) args.push("--rotate", o.rotate);
  if (o.noClean) args.push("--no-clean");
  if (o.noDespill) args.push("--no-despill");
  if (o.magenta) args.push("--key");
  const s = await runPy(pyNumpy(o), "image_engine.py", args, o);
  const r = normSlice(JSON.parse(s.trim().split("\n").pop()));
  say(o, L`slice: ${r.parts.length} parts → ${dir}\\kit.json  (preview ${r.preview})`);
  return r;
}

export async function kit(desc, o) {
  if (!desc) throw new Error(L`Write a character description: mgp image kit "10-year-old boy, yellow t-shirt, blue trousers" -o kit/`);
  const dir = path.resolve(o.o || o.out || "kit");
  if (String(o.source || "") !== "higgsfield" && !o.dryRun) fs.mkdirSync(dir, { recursive: true });
  const sheetFile = path.join(dir, "sheet.png");
  const aspect = o.aspect || "16:9";
  // template method (default, klein model): the grey slot sheet as reference 1 -> controlled part positions, slice names the parts from the slots
  const methodIn = String(o.method || (/schnell/i.test(o.model || "") || String(o.source || "") === "higgsfield" ? "prompt" : "template")).toLowerCase();
  const method = methodIn === "templat" ? "template" : methodIn;
  let prompt, reference = [].concat(o.reference || []), slots = null;
  if (method === "template") {
    const [w, h] = size({ aspect, width: o.width, height: o.height }, 1024);
    const tf = path.join(dir, "template.png");
    await runPy(pyNumpy(o), "image_engine.py", ["template", tf, "--width", String(w), "--height", String(h)], o);
    slots = tf.replace(/\.png$/, ".json");
    reference = [tf, ...reference];
    prompt = kitTemplatePrompt(desc, { style: o.style, reference: o.reference });
  } else prompt = kitPrompt(desc, { style: o.style, face: o.face, reference: o.reference, aspect });
  // --tries N: repeat with the next seed until the slice is clean (8 parts, no warning); the best is kept
  const tries = Math.max(1, +(o.tries || 1));
  const seed0 = o.seed != null ? +o.seed : Math.floor(Math.random() * 2 ** 31);
  const names = o.names || o.name || (o.face ? [...KIT_PARTS, ...FACE_PARTS] : KIT_PARTS).map(([n]) => n).join(",");
  let best = null;
  for (let i = 0; i < tries; i++) {
    const sheetI = tries > 1 ? path.join(dir, `sheet_s${seed0 + i}.png`) : sheetFile;
    const r = await makeImage(prompt, { ...o, seed: seed0 + i, reference, o: sheetI, magenta: false, cutout: false, aspect, longSide: o.longSide || 1024 });
    if (r.guide || r.dryRun) return r; // higgsfield: guide only
    const cut = await cutout(sheetI, o, { sheet: true });
    const dirI = tries > 1 ? path.join(dir, `s${seed0 + i}`) : dir;
    const sr = await slice(cut, { ...o, o: dirI, names, template: slots });
    const score = sr.warning.length + Math.abs(sr.parts.length - names.split(",").length);
    const h = { ...r, method, cutout: cut, kit: path.join(dirI, "kit.json"), parts: sr.parts.map((b) => b.name), warning: sr.warning, preview: sr.preview, score };
    if (!best || score < best.score) best = h;
    if (score === 0) break;
    if (i + 1 < tries) say(o, "  " + L`kit seed ${seed0 + i}: ${sr.warning.length} warnings; trying seed ${seed0 + i + 1}`);
  }
  if (best.score) say(o, "  " + L`the best kit still has warnings; check ${best.preview} (change the seed or correct it with mgp image slice --rotate/--names)`);
  else if (tries > 1) say(o, "  " + L`clean kit: ${best.kit}`);
  return best;
}

/** Free prompt: --style adds a STYLE block; --tries N repeats with the next seed until the magenta cutout is clean
 *  (py/image_engine.py score-cutout: no magenta left, not touching the edge, tint <= 2 %, sensible area). */
export async function freeImage(prompt, o) {
  if (!prompt) throw new Error(L`Write a prompt: mgp image "<prompt>" -o out.png`);
  let p = prompt.trim();
  if (o.style) {
    if (/\bSTYLE:/.test(p)) say(o, L`--style ignored: the prompt already holds a STYLE: block`);
    else p = `${p.replace(/\.?$/, ".")} STYLE: ${styleText(o.style)}`;
  }
  const tries = o.tries != null ? Math.round(+o.tries) : 1;
  if (!(tries >= 1 && tries <= 12)) throw new Error(L`--tries between 1 and 12`);
  if (tries > 1 && !o.cutout) throw new Error(L`--tries on a free prompt picks the result with the cleanest magenta cutout, so it needs --cutout (usually with --magenta). Without a cutout, repeat by hand with another --seed.`);
  if (tries === 1 || String(o.source || "").toLowerCase() === "higgsfield") return makeImage(p, o);
  const out = path.resolve(o.o || o.out || "image.png");
  const seed0 = o.seed != null ? +o.seed : Math.floor(Math.random() * 2 ** 31);
  if (o.dryRun) {
    const r = await makeImage(p, { ...o, seed: seed0 });
    console.log(L`--tries ${tries}: seed ${seed0}..${seed0 + tries - 1}, stops at the first clean cutout; the best is copied to ${out}`);
    return { ...r, tries, seed: [seed0, seed0 + tries - 1] };
  }
  const results = [];
  let best = null;
  for (let i = 0; i < tries; i++) {
    const oi = out.replace(/\.png$/i, `_s${seed0 + i}.png`);
    const r = await makeImage(p, { ...o, seed: seed0 + i, o: oi, cutout: true });
    const j = JSON.parse((await runPy(pyNumpy(o), "image_engine.py", ["score-cutout", oi, r.cutout], { quiet: true })).trim().split("\n").pop());
    const n = { ...j, score: j.score ?? j.skor, clean: j.clean ?? j.bersih, reasons: j.reasons ?? j.alasan ?? [] };
    const h = { ...r, rating: n };
    results.push({ seed: seed0 + i, file: oi, score: n.score, clean: n.clean, reasons: n.reasons });
    say(o, "  " + L`try ${i + 1}/${tries} seed ${seed0 + i}: ${n.clean ? L`CLEAN` : L`not clean yet: ` + n.reasons.join("; ")} (score ${n.score})`);
    if (!best || n.score < best.rating.score) best = h;
    if (n.clean) break;
  }
  // copy the best to the requested name (+ _cutout.png + .json); the other candidates stay as <name>_s<seed>.png
  fs.copyFileSync(best.file, out);
  fs.copyFileSync(best.cutout, out.replace(/\.png$/i, "_cutout.png"));
  const meta = { ...best, file: out, cutout: out.replace(/\.png$/i, "_cutout.png"), tries: results };
  fs.writeFileSync(out.replace(/\.png$/i, ".json"), JSON.stringify(meta, null, 2));
  say(o, best.rating.clean ? L`clean image (seed ${best.seed}) → ${out}` : L`none was clean after ${tries} tries; best seed ${best.seed} (score ${best.rating.score}) → ${out}. Check ${meta.cutout}`);
  return meta;
}

export async function plate(place, o) {
  if (!place) throw new Error(L`Write a place: mgp image plate "traditional market in the morning, light from frame left" -o plate.png`);
  return makeImage(platePrompt(place, { aspect: o.aspect || "9:16", style: o.style }), { ...o, aspect: o.aspect || "9:16", longSide: o.longSide || 1344, magenta: false });
}

/* ------------------------------------------------------------------ CLI */

const help = () => L`mgp image: free still images for kit sheets and plates (motion still comes from the rig in code)

  mgp image "<prompt>" -o out.png [--source auto|free-cloud|local|higgsfield]
               [--provider hf|cloudflare|pollinations|local] [--model klein|schnell]
               [--reference a.png (repeatable, max 4; klein only)] [--aspect 21:9|16:9|9:16|1:1]
               [--width 1536 --height 656 | --long-side 1344] [--seed 7] [--steps 4] [--magenta] [--cutout]
               [--style paper|vector|origami|pixel|stitch|layered|diorama|quilling|"<text>"]   adds a STYLE block (without --style: the prompt as it is)
               [--tries 3]   needs --cutout: next seeds until the cutout is clean (no magenta left, not
                             touching the edge, tint <= 2 %); best -> out.png, the other candidates out_s<seed>.png
  mgp image kit "<character description>" -o kit/ [--style paper|vector|origami|pixel|stitch|layered|diorama|quilling|"<text>"] [--face]
               [--reference model_sheet.png] [--method template|prompt] [--tries 3 (next seeds until the slice is clean)]   parts sheet (head, torso, upper/lower arm,
               hand, thigh, shin, foot) on a magenta background -> cutout -> slice -> kit/kit.json (+ pivots) + preview.
               template method (default with klein): a grey slot sheet is sent as reference 1 so that every part sits apart in its slot
  mgp image plate "<place, light, fixed objects>" -o plate.png [--aspect 9:16] [--style paper]
  mgp image slice sheet_cutout.png -o kit/ [--names head,torso,...] [--template template.json] [--min-area 400] [--magenta]
               [--rotate hand:180]   QC correction: rotate a part before its pivot is computed
  mgp image download [--model klein4b|schnell] [--quant Q4_K_M]    local weights (resumable when it breaks off)
  mgp image providers [--json]                                      free routes, API keys, local status

Sources:
  auto (default) cloudflare (when the key is set) -> hf (official Space, no key) -> pollinations (when the key is set) -> local
  free-cloud     the same without local       local  py/image_engine.py (FLUX.2 klein 4B GGUF, GPU through the shared GPU lock)
  higgsfield     calls no API: prints the Higgsfield connector guide + a prompt ready to paste
Env: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN, HF_TOKEN (optional), POLLINATIONS_KEY, MGP_IMAGE_PYTHON.
--magenta adds the #FF00FF background recipe (image reference section 17.4); --cutout writes an alpha <name>_cutout.png.
--cutout and slice clean magenta leftovers (alpha < 128, magenta pixels, loose specks < 2% of the largest component;
  kit sheets keep their components). Switch off: --no-clean.
--cutout, kit and slice also despill: the magenta tint on the subject is taken out along the alpha edge. Switch off: --no-despill.
--dry-run prints the job (prompt, size, provider order) without calling anything.
Models: FLUX.2 [klein] 4B and FLUX.1 [schnell] (Apache-2.0). Rejected: SDXL-Turbo (non-commercial), FLUX.1 Kontext dev, FLUX.2 klein 9B.
Old names still work: mgp gambar, iris/unduh/penyedia, --sumber cloud-gratis|lokal, --gaya kertas, --potong, --coba, --rasio, ...`;

const SUB = { plate: "plate", kit: "kit", slice: "slice", iris: "slice", download: "download", unduh: "download", providers: "providers", penyedia: "providers" };

export async function cli(argv) {
  let a;
  try {
    a = parseArgs({
      args: argv, allowPositionals: true, options: {
        o: { type: "string", short: "o" }, out: { type: "string" }, source: { type: "string" }, provider: { type: "string" },
        model: { type: "string" }, engine: { type: "string" }, reference: { type: "string", multiple: true }, ref: { type: "string", multiple: true },
        width: { type: "string" }, height: { type: "string" }, aspect: { type: "string" }, ar: { type: "string" },
        seed: { type: "string" }, steps: { type: "string" }, quant: { type: "string" }, style: { type: "string" },
        name: { type: "string" }, names: { type: "string" }, "min-area": { type: "string" }, python: { type: "string" }, method: { type: "string" }, template: { type: "string" },
        rotate: { type: "string" }, tries: { type: "string" }, "long-side": { type: "string" },
        magenta: { type: "boolean" }, cutout: { type: "boolean" }, "no-clean": { type: "boolean" }, "no-despill": { type: "boolean" }, cut: { type: "boolean" }, face: { type: "boolean" }, "dry-run": { type: "boolean" },
        json: { type: "boolean" }, quiet: { type: "boolean" }, help: { type: "boolean", short: "h" },
      },
    });
  } catch (e) { console.error("mgp image: " + e.message + "\n\n" + help()); process.exit(2); }
  const { values: v, positionals: pos } = a;
  if (v.help || !pos.length) { console.log(help()); return; }
  const eng = v.engine || v.model;
  const o = { ...v, o: v.o || v.out, reference: [...(v.reference || []), ...(v.ref || [])], aspect: v.aspect || v.ar, cutout: v.cutout || v.cut,
    model: v.model || (eng && /schnell/i.test(eng) ? "schnell" : undefined), minArea: v["min-area"], longSide: v["long-side"], noClean: v["no-clean"], noDespill: v["no-despill"], dryRun: v["dry-run"] };
  const sub = SUB[pos[0]];
  const print = (r) => { if (v.json) console.log(JSON.stringify(r, null, 2)); };
  try {
    if (sub === "kit") print(await kit(pos.slice(1).join(" "), o));
    else if (sub === "plate") print(await plate(pos.slice(1).join(" "), o));
    else if (sub === "slice") print(await slice(pos[1], o));
    else if (sub === "download") {
      const py = localPython(o);
      if (!py) throw new Error(localHelp());
      const m = eng && /schnell/i.test(eng) ? "schnell" : eng && eng !== "klein" ? eng : "klein4b";
      await runPy(py, "image_engine.py", ["download", "--engine", m, ...(o.quant ? ["--quant", o.quant] : [])], o);
    } else if (sub === "providers") {
      const r = providersSummary(o);
      if (r.local.ready) { r.local.ready = await localReady(o, o.model); if (!r.local.ready) r.local.name += L` (Python present; weights not downloaded yet: mgp image download)`; }
      if (v.json) return console.log(JSON.stringify(r, null, 2));
      for (const [k, p] of Object.entries(r)) console.log(`${p.ready ? L`[ready] ` : "[----]  "}${k.padEnd(13)} ${p.name}${p.free ? "\n               " + L`free: ${p.free}` : ""}${p.rejected ? "\n               " + L`rejected: ${p.rejected}` : ""}${p.keys && p.keys.length ? "\n               env: " + p.keys.join(" + ") : ""}${p.python ? "\n               python: " + p.python : ""}`);
      console.log("\n" + L`hf needs no key, so it can always be tried. How to get a free key:` + "\n\n" + [KEY_HELP.cloudflare, KEY_HELP.hf, KEY_HELP.pollinations].join("\n\n"));
    } else print(await freeImage(pos.join(" "), o));
  } catch (e) { console.error("mgp image: " + e.message); process.exitCode = 1; }
}

// Old names (v2.3 / v2.4-dev).
export const RESEP_MAGENTA = MAGENTA_RECIPE, GAYA = STYLES, BAGIAN_KIT = KIT_PARTS, promptKitTemplat = kitTemplatePrompt, promptKit = kitPrompt;
export const promptPlate = platePrompt, ukuran = size, PENYEDIA = PROVIDERS, CARA_KUNCI = KEY_HELP, ringkasPenyedia = providersSummary;
export const buatGambar = makeImage, potong = cutout, iris = slice, gambarBebas = freeImage;
