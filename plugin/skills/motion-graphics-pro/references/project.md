# References: `project.json` (one source of project data)

Part of the `motion-graphics-pro` skill (v2.4). Read when: opening a project (`mgp new`), every time a VO, scene,
block, caption, or asset is added, and before writing T10.

`project.json` sits at the root of the project folder, next to `index.html`. It holds the data that used to be spread
over T3, T5, T6, and chat notes. The composition stays the source of truth for the render; `project.json` is a table of
contents that a machine can check. Claude updates it in the same turn as the change to the files.

## Schema (version 1)

```json
{
  "version": 1,
  "meta": { "title": "30 s ad", "aspect": "9:16", "width": 1080, "height": 1920, "fps": 24, "duration": 30,
            "created": "2026-11-05", "skill": "motion-graphics-pro 2.4", "stage": "7 Pilot", "gate": "G4a pending" },
  "composition": "index.html",
  "voice": {
    "source": "local-clone",
    "profile": "narrator",
    "vo": [ { "id": "vo", "file": "assets/audio/vo.wav", "script": "script.txt",
              "words": "assets/audio/vo.words.json", "letters": "assets/audio/vo.letters.json", "start": 0.4 } ]
  },
  "scenes": [
    { "id": "s01", "start": 0, "duration": 5.2, "title": "Hook", "branch": "A",
      "composition": "compositions/s01.html", "poses": [0, 1.0, 2.5, 4.5], "status": "blocking",
      "blocks": ["text/highlighter"] }
  ],
  "blocks": [ { "id": "transitions/tear", "scene": "s02", "start": 4.7 } ],
  "caption": { "file": "assets/audio/vo.words.json", "style": "cream strip 3-5 words" },
  "sfx": "assets/audio/sfx.json",
  "assets": [
    { "file": "assets/pieces/k1/cloud1.png", "source": "higgsfield", "job": "<job id>", "license": "user account" },
    { "file": "assets/kit/character/kit.json", "source": "mgp-image", "provider": "local", "model": "flux2-klein-4b",
      "seed": 7, "license": "Apache-2.0", "meta": "assets/raw/character_sheet.json" }
  ]
}
```

| Key | Contents | Used by |
|---|---|---|
| `meta` | `title`, `aspect`, `width`/`height`, `fps`, `duration`, `created` (date), last `stage` and `gate` | `mgp check` (compared with the composition), T10 |
| `composition` | root file | `mgp check` |
| `voice.source` | `pending` / `elevenlabs` / `local-clone` / `recording` / `none` (decision point G2, `references/audio.md` 10.1) | `mgp check` reminds you while it is still `pending` |
| `voice.vo[]` | VO file, script (`script`), per-word timing (`words`, `*.words.json`) and per-letter timing (`letters`, `*.letters.json`), start second in the video (`start`) | `mgp check`, lip-sync (`references/lipsync.md`), captions |
| `scenes[]` | `id`, `start` + `duration` (seconds), `title`, `branch` A/B/C, `composition` file (for a sub-composition), `poses` (key poses, seconds relative to the scene), `status` (`blocking` / `spline` / `locked`), `blocks` in that scene | `mgp contact --times poses`, `mgp check`, T3 |
| `blocks[]` | inserted blocks (`mgp add`), `scene`, `start` second | `mgp check` (the block must exist in `blocks/`) |
| `caption` | word timing source (`file`) + `style` | typography (`references/typography.md`) |
| `sfx` | cues file for `mgp sfx mix` | audio |
| `assets[]` | every asset from outside the code, with its **provenance**: `source` (`higgsfield` / `mgp-image` / `user` / `code` / `other`), `provider`, `model`, `job`, `seed`, `license`, `meta` (the JSON next to a PNG from `mgp image`), `notes` | `mgp check` (file exists, `source` filled in), T5 log |

`meta.gate` is a short text: the gate id, then a status word, optionally who and when, e.g. `"G4 approved (reviewer) 2026-11-05"`
or `"G4 disetujui (peninjau)"`. `mgp audit` reads the status words in English and Indonesian (case does not matter):
- approved: `approved`, `passed`, `pass`, `done`, `ok`, `okay`, `accepted`, `signed off`, `locked`, `complete`, `completed`,
  `disetujui`, `setuju`, `lolos`, `lulus`, `selesai`, `beres`, `oke`, `acc`, `diterima`, `terkunci`, `✓`;
- still open: `pending`, `waiting`, `open`, `todo`, `draft`, `rejected`, `not approved`, `not passed`, `revise`, `revision`,
  `changes requested`, `on hold`, `menunggu`, `belum`, `ditolak`, `revisi`, `tunda`, `ditunda`, `dalam proses`. An open word wins
  (`"G4 belum disetujui"` is open).

A gate id without a status word (`"G4 (peninjau)"`) gives a WARN that lists these words. A gate number above the one the
stage needs counts as passed for that stage (stage 8 needs G4, stage 9 needs G5).

Rules:
- Every path is relative to the folder of `project.json`. `http(s)` URLs are skipped by the check.
- Extra keys may be written (e.g. `motion_library`, `palette`); the checker ignores unknown keys.
- Old files are still read: `proyek.json` (old file name) and the old Indonesian keys and values (`versi`, `adegan`,
  `kunci`, `klon-lokal`, ...). `mgp new` writes the English keys.
- The user's own voice recording is NOT copied into the project folder. `voice.profile` is only the name of a local profile.
- `mgp check index.html` reads `project.json` in the composition folder (or one level above it) and gives a
  warning (not an error) for: a referenced file that does not exist, an unknown block, an asset without `source`,
  fps/size/duration different from the composition, a scene or key pose outside the duration, voice source not chosen yet.
