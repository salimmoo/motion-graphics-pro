# Reference: templates T1-T15

Part of the `motion-graphics-pro` skill. Read when: filling in the brief, comparison, concepts, shot list, prompts, job log, scene data, composition skeleton, typography, checklist, handover, keyframes, layer breakdown, motion set, pixel art, origami.

Moved verbatim from SKILL.md v2.3 (chapter 16 Template); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, section References).

**Language.** This file is the canonical English version. For Indonesian users, use the Indonesian variant `template.id.md` (same ids, numbers and order) for everything the user reads: the T1 brief, gate messages, reports and the T10 handover. `mgp new --lang id|en` (default: `MGP_LANG`, then `LANG`) takes T1 and T10 from the matching file. Image prompts (T4, T11-T13) stay in English in both variants, because they go to the image model. When you change a template, change both files.

## 16. Template

### T1 Brief

| Field | Answer |
|---|---|
| Title; goal and main message | <fill in> |
| Platform, aspect, duration | <Reels/TikTok/Shorts>, <9:16/16:9>, <s> (platform limits checked <date>) |
| Audience | <age, viewing context, language> |
| VO; music and SFX | <voice, language>; <music yes/no, SFX style> |
| References | Likes / dislikes: <link + reason> |
| Content rules | <forbidden figures, how to depict them, required sources> |
| Concept; personification | <types liked/avoided>; <used or not, which object> |
| Brand, palette, fonts; assets | <fill in>; <old jobs, logo, files> |
| Deadline; credit budget; output | <date>; Higgsfield/ElevenLabs <credits>; <resolution>, 24 fps (frame choice: chapter 2.0) |

### T2 Style comparison + element confirmation

| Aspect | Recommendation: <style A> | Option B: <style> | Option C: <style> |
|---|---|---|---|
| Palette (hex + share) | <fill in> | <fill in> | <fill in> |
| Material, shapes, typography | <fill in> | <fill in> | <fill in> |
| Motion, transitions | <fill in> | <fill in> | <fill in> |
| Strengths / weaknesses | <fill in> | <fill in> | <fill in> |
| Fits; visual sample | <fill in>; <file> | <fill in>; <file> | <fill in>; <file> |

| Element | Proposal | OK/revise |
|---|---|---|
| Palette; typography | <hex + share>; <font, size, frame> | |
| Drawing style; characters | <kit, edges, shadows>; <proportions, sequence> | |
| Motion; transitions; camera | 24 fps, on twos, entrance 0.17 s; <per intent>; <push/pull, k> | |
| Effects; format; audio | <grain, light>; <aspect ratio, safe zone>; <VO, SFX, loudness> | |

### T2a Concepts (3 per video, side by side)

| Aspect | Recommendation: <concept A> | Option B: <concept> | Option C: <concept> |
|---|---|---|---|
| Type (max 2, chapter 2.2) | <fill in> | <fill in> | <fill in> |
| Meaning-carrying object; personification | <object>; <yes: which object / no> | <fill in> | <fill in> |
| Frame 0 hook | <what shows on frame 0> | <fill in> | <fill in> |
| Flow of 4-6 scenes | 1 <...>; 2 <...>; 3 <...>; 4 <...> | <fill in> | <fill in> |
| Proving motion | <the relationship that changes> | <fill in> | <fill in> |
| Final scene payoff | <the meaning-carrying object returns> | <fill in> | <fill in> |
| Asset branch; motion library | <A/B/C per scene>; <actions reused> | <fill in> | <fill in> |
| Credit estimate | <count from chapter 15> | <fill in> | <fill in> |
| Content-rule risk | <fill in> | <fill in> | <fill in> |
| Strengths / weaknesses | <fill in> | <fill in> | <fill in> |

After the table: the good and bad of each concept in 1-2 sentences, then the G1 question in chat + interactive.

### T3 Shot list / beat sheet

| No | Seconds | Trigger VO word | Set | Branch | POV | Hero | Action | Asset | Entry transition | Text |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.00-2.40 | "<word>" (1.20) | <kit> | A/B/C | Observer | <hero> | <action + seconds> | <job code> | Cut (hook) | <kicker / headline / keyword> |

### T4 Higgsfield prompts

Order of every prompt: CANVAS, content (PIECES/SET/CHARACTER/ROW/PEOPLE), STYLE (block 4.3, which already forbids text/logos), ONLY. White pieces use "flat plain mid-blue background".

```text
(a) KIT 21:9
CANVAS: Wide 21:9 sheet on a flat plain pure white background. <N> separate cut-paper pieces for one location (<location, era>) in <2-3> loose rows, white space of at least one tenth of the sheet width between pieces, each piece complete and not touching another, all at one consistent scale.
PIECES: 1. <piece, size relative to an adult, view, facing frame left/right>. 2. <piece>.
ONLY: Show only the listed pieces on the plain background; add nothing else.

(b) PLATE 9:16
CANVAS: Vertical 9:16 scene, <eye-level/top-down>, one-point perspective, vanishing point at the horizontal centre about <45> percent from the top. Empty scene: no people. Keep <the lower third> clear and low-detail for pieces added later.
SET: <location, time, light from frame left/right, fixed objects and their positions>.
ONLY: Show only what this prompt describes; add nothing else.

(c) SEQUENCE 6 FRAME
CANVAS: Wide 21:9 sheet on a flat plain pure white background. Six full-body frames of the same character in one horizontal row, six equal columns, identical size, feet on one shared baseline, a white gutter of at least a quarter column between figures.
CHARACTER: <identical description: age, body, hair, clothing and colours, shoes, accessories>. Paper collage figure with natural human proportions; each limb is one smooth continuous paper shape. <Smooth blank face.>
FRAMES (side view, facing frame right; every body part changes in every frame): F1 contact, front heel down, rear toe pushing off; F2 down, weight on the front leg, knee bent; F3 passing, rear leg swinging past the standing leg; F4 contact, other leg in front; F5 down; F6 passing. Arms swing opposite to the legs; head and hair follow one beat later.
ONLY: Show only the six figures on the white background; add nothing else.
Wave (front view): F1 arm relaxed; F2 lifting, elbow bent; F3 hand at shoulder, palm out; F4 above head tilted to frame left; F5 upright; F6 tilted to frame right.

(d) FACE KIT
CANVAS: Wide 21:9 sheet on a flat plain pure white background, two rows (three rows for a face-bearing object), one scale for a face <width> wide, generous white space.
ROW 1: eight cut-paper mouths in <lip colour>: closed relaxed; wide open showing upper teeth; medium open, lips stretched; rounded open; small tight rounded; lips pressed together; lower lip under the upper front teeth; closed gentle smile.
ROW 2: six pairs of cut-paper eyebrows in <hair colour>: neutral; raised; frowning; worried; angry; happy.
ROW 3 (face-bearing object only): six pairs of cut-paper eyes: open; closed as a curved line; wide open; half-lidded; looking frame left; looking frame right.
ONLY: Show only the pieces listed in the rows above on the white background; add nothing else.

(e) CROWD TWO-STATE
CANVAS: Wide 21:9 sheet on a flat plain pure white background. <N> people in one row; each person twice side by side, calm on the left and reacting on the right; identical size, feet on one shared baseline, a white gap between people.
PEOPLE: 1. <age, clothing, head covering, colours, facing frame left/right>; calm: <pose>; reacting: <surprised, hands raised, leaning back>. 2. <next person, complete>.
ONLY: Show only these figures on the white background; add nothing else.

(f) MODEL SHEET 21:9
CANVAS: Wide 21:9 sheet on a flat plain pure white background. Left two thirds: the same character in four full-body views in one row (front, three-quarter facing frame right, side facing frame right, back), identical scale, feet on one shared baseline, white gutters between views. Right third: three close-ups at a larger scale: <head and face>, <hands>, <costume detail or signature prop>.
CHARACTER: <identical description, 4.4 item 2>. Face-bearing object: <object>, plain with no face.
ONLY: Show only these views and close-ups on the white background; add nothing else.
```

### T5 Higgsfield job log

| No | Content | Aspect | Resolution | Job ID | Credits |
|---|---|---|---|---|---|
| K1 | Kit <location>, <N> pieces | 21:9 | 2K | <id> | 2.75 |

Batch credits: <X>. Session total: <Y>. Balance before <A>, after <B> (tool `balance`, <date time>). Reference: K1 from <style anchor job>. A 429 response = "failed, no credits used, resent".

### T6 Scene assembly data (JSON)

```json
{
  "id": "s03", "dur": 5.2, "pivot": [360, 760], "pov": "observer",
  "camera": [{"t": 0, "z": 1.0, "x": -14}, {"t": 2.4, "z": 1.05, "x": 14}, {"t": 5.2, "z": 1.05, "x": 14}],
  "meta": {"cloud1": {"w": 412, "h": 150}, "walk1": {"w": 479, "h": 880, "anchor": [246.9, 879]}},
  "layers": [
    {"id": "cloud1", "cx": 250, "bottom": 182, "scale": 0.8, "k": 0.15, "t0": 0.25, "from": "r", "off": 360, "boil": 0.7},
    {"id": "building", "cx": 362, "bottom": 1015, "scale": 0.86, "k": 0.70, "t0": 1.80, "from": "pop", "boil": 0.7},
    {"id": "hero", "k": 0.95, "t0": 0.0, "fade": 0, "scale": 0.842, "boil": 1.0,
     "seq": {"intro": [], "loop": ["walk1", "walk2", "walk3", "walk4", "walk5", "walk6"]},
     "keys": [{"t": 0, "cx": -60, "bottom": 1165}, {"t": 1.83, "cx": 360, "bottom": 1165}]}
  ],
  "texts": [{"t0": 3.0, "t1": 5.0, "words": [{"id": "s03-w0", "t": 3.3, "key": true, "hl": "s03-hl0"}]}],
  "sfx": [{"id": "N03", "t": 0.88}],
  "trIn": {"type": "tear-wipe", "dur": 0.5}, "trOut": {"type": "cut", "dur": 0},
  "sources": []
}
```

Fields: `meta` = w, h (+ anchor) for EVERY sprite used; `cx`, `bottom` = the bottom-centre point in the 720 w world (sequences use `meta.anchor`); `from` = b, t, l, r, pop, or empty; `fade` defaults to 0.2 s; `seq.intro` plays once, then `seq.loop` repeats (12 drawings/s); `words[].t` = transcript timestamp; `sources` = sources for numbers, coordinates and proof texts. Branch B layers already matched to the full frame are written with `"full": true` (drawn at 0,0 at 720 x 1280). A face-bearing object uses `"face": {"anchor": [x, y], "w": <face width>, "mood": [[t, "<state>"]], "vis": "visemes/<block>_<character>.json"}` (6.7, 6.8). The ids and values in this sample (`observer`, `cloud1`, `building`, `hero`, `walk1`-`walk6`, `tear-wipe`) are example project data, not API names.

### T7 mgp composition skeleton (HyperFrames-compatible format; `mgp new` writes a one-scene version)

```html
<!-- index.html: scene hosts + audio only -->
<!doctype html>
<html><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="<total>"
  data-fps="24" data-width="1080" data-height="1920">
  <div id="s01" data-composition-id="s01" data-composition-src="compositions/s01.html"
    data-start="0" data-duration="<d1>" data-track-index="1" data-track-kind="graphics"
    data-width="1080" data-height="1920" style="z-index:1"></div>
  <!-- s02: data-start = <d1 - transition duration>, z-index 2 -->
  <audio id="mix" class="clip" src="assets/audio/mix.wav" data-start="0" data-track-index="9" data-volume="1"></audio>
</div>
<script>window.__timelines["main"] = mgp.motion.timeline({ paused: true });</script>
</body></html>
```

```html
<!-- compositions/s01.html -->
<template>
<style>
  #root{position:absolute;inset:0;overflow:hidden}
  #s01-sky{position:absolute;inset:0;background:linear-gradient(#2C67B0,#78ACDC 33%,#D9E8F2 61%)}
  .s01-pc{position:absolute;left:0;top:0;transform-origin:0 0;opacity:0;filter:drop-shadow(0 6px 10px rgba(45,28,12,.32))}
  #s01-grain{position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:.10}
</style>
<div id="root" data-composition-id="s01" data-width="1080" data-height="1920">
  <div id="s01-sky"></div>
  <div id="s01-world" data-layout-allow-overflow>
    <img id="s01-cloud1" class="s01-pc" src="assets/pieces/k1/cloud1.png">
    <img id="s01-walk1" class="s01-pc" src="assets/seq/walk/walk1.png"><!-- one img per piece/frame; order = layering -->
  </div>
  <img id="s01-grain" src="assets/fx/grain_1080x1920.png" data-layout-ignore>
</div>
<script>
const SC = {/* T6 data */}, S = 1080 / 720, q = t => Math.floor(t * 12) / 12;   // on twos
const ent = (t, t0) => t < t0 ? null : Math.exp(-(t - t0) / 0.17);
const zk = (z, k) => Math.pow(z, 0.25 + 0.75 * k);
const boil = (f, i, n, a) => Math.sin(f * 12.9898 + i * 78.233 + n) * (a || 0);
const cl = u => Math.min(1, Math.max(0, u)), sm = u => (u = cl(u), u * u * (3 - 2 * u));
function key(K, t, e) { let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
  const a = K[i], b = K[i + 1], u = e((t - a.t) / (b.t - a.t)), o = {};
  for (const p in a) if (p !== "t") o[p] = a[p] + (b[p] - a[p]) * u; return o; }
function place(el, L, t, f, i, c, m) {
  const e = ent(t, L.t0);
  if (e === null || (L.t1 != null && t >= L.t1)) return mgp.motion.set(el, { opacity: 0 });
  const o = (L.off || 0) * e, s = L.from === "pop" ? 1 - 0.08 * e : 1;
  const dx = L.from === "l" ? -o : L.from === "r" ? o : 0, dy = L.from === "b" ? o : L.from === "t" ? -o : 0;
  const [px, py] = SC.pivot, z = zk(c.z, L.k), sz = L.scale * s * z, [ax, ay] = m.anchor || [m.w / 2, m.h];
  const X = px + (L.cx + dx + boil(f, i, 1, L.boil) - px) * z + c.x * L.k;
  const Y = py + (L.bottom + dy + boil(f, i, 2, L.boil) - py) * z, fd = L.fade ?? 0.2;
  mgp.motion.set(el, { x: S * (X - ax * sz), y: S * (Y - ay * sz), scale: S * sz, opacity: fd > 0 ? cl((t - L.t0) / fd) : 1 });
}
function draw(tr) {
  const t = q(tr), f = Math.floor(tr * 12), c = key(SC.camera, t, sm);
  SC.layers.forEach((L, i) => {
    if (!L.seq) return place(document.getElementById("s01-" + L.id), L, t, f, i, c, SC.meta[L.id]);
    const k = Math.max(0, Math.floor((t - L.t0) * 12)), A = L.seq.intro, B = L.seq.loop;
    const cur = k < A.length ? A[k] : B[(k - A.length) % B.length];
    const M = Object.assign({}, L, L.keys ? key(L.keys, t, cl) : {});
    [...new Set(A.concat(B))].forEach(n => { const el = document.getElementById("s01-" + n);
      n === cur ? place(el, M, t, f, i, c, SC.meta[n]) : mgp.motion.set(el, { opacity: 0 }); });
  });
}
document.fonts.ready.then(() => {
  const tl = mgp.motion.timeline({ paused: true }), P = { t: 0 };
  tl.to(P, { t: SC.dur, duration: SC.dur, ease: "none", onUpdate: () => draw(P.t) }, 0);
  /* T8 text tweens go here */
  draw(0);
  window.__timelines["s01"] = tl;
});
</script>
</template>
```

After writing: `mgp check index.html` (or `--json`), `mgp frame` in the middle of the scene. Warm light (3.2) = a radial-gradient div above the world; if `drop-shadow` causes trouble, bake the shadow into the PNG.

### T8 Kinetic typography

Markup + CSS go into the T7 scene, JS at the T7 comment (size 1080 w).

```html
<style>
  .s01-card{position:absolute;left:66px;top:180px;padding:30px 39px;background:#FBF6EA;
    box-shadow:-6px 8px 0 #E3B04B,0 9px 18px rgba(43,26,12,.32)}
  .s01-kick{font:600 27px Poppins;letter-spacing:.3em;color:rgba(20,20,20,.75)}
  .s01-head{font:700 75px/1.15 Poppins;color:#141414}
  .s01-w{display:inline-block;opacity:0}
  .s01-kw{position:relative;isolation:isolate;font-family:"Playfair Display";font-style:italic;font-size:1.12em}
  .s01-hl{position:absolute;left:-12px;right:-12px;top:34%;height:58%;z-index:-1;background:#F1C75B;
    transform-origin:0 50%;clip-path:polygon(0 10%,100% 0,98% 100%,1% 90%)}
</style>
<div id="s01-card" class="s01-card"><div class="s01-kick">TIPS HARIAN</div>
  <div class="s01-head"><span id="s01-w0" class="s01-w">Mulai</span>
  <span id="s01-w1" class="s01-w s01-kw"><i id="s01-hl1" class="s01-hl"></i>sekarang</span></div></div>
<!-- sample on-screen text in Indonesian: "TIPS HARIAN" = DAILY TIPS, "Mulai sekarang" = Start now -->
```

```js
const F = 1 / 24, T = SC.texts[0];
tl.fromTo("#s01-card", { x: -630, rotation: -1.2, opacity: 0 },
  { x: 0, rotation: -1.2, opacity: 1, duration: 0.6, ease: "expo.out" }, T.t0);
T.words.forEach(w => {
  tl.fromTo("#" + w.id, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 5 * F, ease: "power2.out" }, w.t - F);
  if (!w.key) return;
  tl.fromTo("#" + w.hl, { scaleX: 0 }, { scaleX: 1, duration: 6 * F, ease: "power2.out" }, w.t + F);
  tl.fromTo("#" + w.id, { scale: 1 }, { scale: 1.055, duration: 3 * F, ease: "sine.out",
    yoyo: true, repeat: 1 }, w.t - 3 * F);                       // pulse peak at w.t
});
tl.to("#s01-card", { opacity: 0, duration: 0.18, ease: "power2.in" }, T.t1 - 0.18);
tl.set("#s01-card", { opacity: 0 }, T.t1);
// underline (instead of a strip): dash path from chapter 9.3, dashoffset 110 to 0 over 12 * F starting at w.t + 4 * F
```

### T9 Review checklist + contact sheet

| No | Check | How |
|---|---|---|
| 1 | Clean pieces: no white fringe, grey boxes, specks or magenta edges | `mgp frame --scale 2`, then crop the edges on a contrasting background |
| 2 | Feet planted, contact shadow, one light direction | Crop the feet in every pose |
| 3 | No AI text; geography and screen directions correct | Crop; location line |
| 4 | Hero around 70%, at least 3 planes, props with context | Hold frame |
| 5 | On twos, stagger, settle 14-16 frames, hold at least 25% | `mgp contact --from <a> --to <b> --n 8` |
| 6 | Words at their VO timestamps, hold 0.5 s + 0.3 s/word, safe zone | A frame per word |
| 7 | Arabic: U+FDF4/U+FDFA render, harakat match the source | Crop |
| 8 | Layer edges hidden; same character size; no foot sliding; mouth/brows on the face | Frames at the camera extremes; 3 consecutive frames |
| 9 | Clean transitions at 25/50/75% (per block) | `mgp frame --t <time>` at three times |
| 10 | Dead air: silence + static > 0.8 s | silencedetect + freezedetect |
| 11 | -14 LUFS, -1.5 dBTP, SFX -5 dB under the VO | loudnorm summary |
| 12 | Neighbouring scenes differ in archetype/colour; data and proof texts sourced | Block contact sheet; `sources` |
| 13 | `mgp check --json` 0 ERROR; duration, fps, resolution correct; placeholders labelled | CLI; ffprobe |
| 14 | Branch B: the still layer composite = the keyframe (side by side) | Comparison sheet |
| 15 | Face-bearing object: mood changes through anticipation, squash, new face, settle; eyes lead, parts not in unison | `mgp contact --from --to` around the mood change, 8 frames |
| 16 | Character matches the model sheet (proportions, colours, costume); same character height across scenes and episodes | Sprite and model sheet side by side at the same scale |
| 17 | Lip-sync: m/b/p closed, vowels match the letters, X in pauses; stickers on the face | A frame at every m/b/p word in the block + clip with sound |
| 18 | Code-drawn style: the STYLE card is followed, the forbidden list is clean | Side by side with the approved style frame |
| 19 | Motion curves: no accidental linear motion; breaks (pops) only at impacts/cuts; squash with constant volume; no abrupt start/stop without a reason | `mgp curves index.html --from <a> --to <b> -o review/curves.png` (benchmarks: `motion-graphics/references/advanced-principles.md` chapter 13 and the benchmark table) |
| 20 | Blocking approved before spline: key poses read, staging and rough timing right | `mgp contact index.html --var blocking=true --times poses -o review/blocking.png` |

```bash
ffmpeg -i review.mp4 -vf "fps=2,scale=360:-1,tile=6x4" -frames:v 1 sheet_s03.jpg
ffmpeg -i review.mp4 -af silencedetect=noise=-35dB:d=0.8 -vf freezedetect=n=0.003:d=0.8 -f null - 2>&1 | grep -E "silence_|freeze_"
ffmpeg -i final.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=summary -f null -
```

Routine: a contact sheet per shot (`mgp contact`, 8 frames) and per block (2 fps), then a full-res crop at the contact points. Pilot: the blocking sheet (`--times poses`) first, then curves (`mgp curves`) after the spline. `mgp audit <folder>` runs check, curves, safe zones, VO, loudness, `project.json` and asset licences in one report (`review/audit.md`, T9-style table).

### T9a QC references per asset type (REPORT conditions)

Checks from other skills are not copied; Claude opens the referenced chapter when that asset type is used. P0 = breaks readability or the contract (chapter 12); REPORT only when every P0 passes.

| Asset type in the scene | Checks run | P0 |
|---|---|---|
| Paper pieces, sets, branch B layers | T9 1-4, 14 | T9 1, 3, 14 |
| Sequence-sheet character | T9 2, 5, 8, 16 + `motion-graphics` chapter 9 items 1 (no foot sliding, 3 consecutive frames), 4 (loop without jumps), 9 (not in unison, last frame not dead) | T9 2, 8, 16; mg 9 items 1, 4 |
| Vector rig character | `vector-character` chapter 11 items 1-32 + `motion-graphics` chapter 9 items 0-16 | vc 11 items 9, 17; mg 9 items 0, 1, 3 |
| Face-bearing object | T9 8, 15, 16, 17 | T9 8, 15 |
| New code-drawn style | T9 18 | T9 18 |
| Maps and routes | Chapter 9 + T9 3, 12 | Sourced coordinates; map aspect ratio not stretched |
| Text, proof texts, Arabic | T9 6, 7, 12 | T9 7; proof texts sourced |
| Audio | T9 10, 11 | T9 11 |
| Blocks, transitions, render | T9 9, 13 | T9 13 |
| Motion after spline (G4 pilot and new blocks) | T9 5, 19, 20 + benchmarks in `motion-graphics/references/advanced-principles.md` | T9 20 (pilot); an unintended curve finding = P1 |

REPORT format:

| Block/shot | Asset type | Checks run | Result (numbers) | P0 | Visible weaknesses |
|---|---|---|---|---|---|
| <b2 s05> | <type> | <check numbers> | <check result numbers> | <pass/fail> | <write honestly> |

### T10 Handover

```markdown
# Handover <project> <episode>
## Status <date time>
Stage: <number + name>. Last gate: G<n> (<waiting/passed date>). Locked blocks: <list>. Running block: <name>.
Environment: <Claude Code / own computer: render works | claude.ai: without Node 22+, Chrome/Chromium or ffmpeg there is no render, so render in Claude Code or on your own computer>.
## Review Results <date time> (PLAN, not done yet)
1. <seconds/shot>: <the user's request, in the user's words when it matters>
## Update <date time> - done
- Files, changes, commands, deliveries: <path, key numbers, render/snapshot, new file (range)>
## Higgsfield assets
T5 table + target files; balance <remaining> (tool balance, <date time>).
## Motion library
New actions: <character, action, job, passed T9a on date>.
## Next steps and open questions
1. <step>; <options + cost, waiting for the user>
## Opening prompt for the next session
"Continue <project> <episode>. Read the motion-graphics-pro skill, then the last section of <handover path> first. Stage: <stage>, block <name>. Task: <task>. Higgsfield only after permission + a balance check; full render only after I write 'render'."
```

### T11 Branch B keyframe (9:16 2K)

```text
CANVAS: Vertical 9:16 handcrafted paper collage diorama, <camera, vanishing point in percent>. Built from clearly separated depth layers with small gaps between groups, so each layer can be cut out later.
LAYER PLAN (frame terms, percent of frame): 1. <sky/roof, y 0-35%>. 2. <end of the alley, x 40-60%, y 30-45%>. 3. <left row, x 0-40%>. 4. <right row, x 60-100%>. 5. <open floor, y 45-100%, centre path empty>. 6. <background people, area, facing direction>. 7. <front-left props>. 8. <front-right props>.
DETAIL: medium detail; small goods grouped in clusters; foreground objects cover at most a third of what is behind them.
STYLE: <STYLE block 4.3>.
ONLY: Show only what this prompt describes; add nothing else.
```

### T12 Layer-separation sheet (21:9 2K, keyframe attached)

```text
Layer-separation sheet. COPY from the attached keyframe, do not redraw. Wide 21:9 sheet, four equal vertical 9:16 panels separated by thin white gutters; inside each panel the background is flat solid magenta #FF00FF with no texture, shadow or outline. Every panel uses exactly the keyframe's framing: same scale, position, pose and facing direction for everything that is kept.
Panel 1 KEEP <layer + area in percent>. ERASE <objects removed>. FILL <back layer: continue only this surface; other layers: no fill>.
Panel 2 KEEP ... ERASE ... FILL ...
Panel 3 KEEP ... ERASE ... FILL ...
Panel 4 KEEP ... ERASE ... FILL ...
Keep the original paper textures, colours and light. No readable text, letters, numbers, symbols, logos or watermarks.
```

### T13 Motion set (21:9 2K)

```text
Stop-motion frame set on a flat plain pure white background: <N> frames of <object/character> in one row, identical size and position in every frame, same baseline, white gutters between frames; only <the moving part> changes: F1 <...>, F2 <...>, F3 <...>. STYLE: <STYLE block 4.3>. ONLY: Show only these frames; add nothing else.
```

### T14 Pixel art (sprites, limited palette) (Version 2.1)

| Field | Rule |
|---|---|
| Native canvas | Draw at a small resolution, e.g. 160 x 90 (16:9) or 90 x 160 (9:16); characters about 32-48 pixels tall. |
| Palette | 8-16 fixed colours, written as a hex list; every pixel uses one of them, no smooth gradients. |
| Lines and shadows | 1-pixel dark outline; shadows one colour step; sky gradients use checkerboard dither. |
| Sprite sheet | One row per action: idle 2-4 drawings, walk 6-8, jump 4-6; same cell size, same foot point. |
| Motion | 8-12 drawings per second (stepped, no interpolation); positions and camera always on whole pixels. |
| Upscale | Whole-number scale (x3, x4, x6) with nearest neighbour; never smoothed or freely rotated. |
| Check | No mixed pixels at edges, no half pixels, no extra palette colours, no foot sliding. |

### T15 Origami (folded paper, fold-unfold) (Version 2.1)

| Field | Rule |
|---|---|
| Shape | Every object and character is built from flat planes (triangles, kites) with clear fold lines. |
| Paper colour | One colour per sheet; a light side and a dark side per fold (10-20% apart); the paper's back side is cream. |
| Fold lines | Thin lines, lighter on mountain folds, darker on valley folds; no thick ink lines. |
| Background | Finely textured kraft paper, mountains and trees of folded paper, soft shadows under the layers. |
| Fold-unfold | Planes turn on their fold line one at a time (0.02-0.05 s apart), 0.4-0.6 s per plane; the back side shows as it turns. |
| Motion example | Crane: square, triangle, bird base, finished crane; hold each step 0.5 s, small wing flaps at the end. |
| Motion | 12 drawings per second so it feels like paper stop motion. |
