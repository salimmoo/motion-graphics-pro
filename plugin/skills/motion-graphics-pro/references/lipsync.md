# References: lip-sync from per-letter timing

Part of the `motion-graphics-pro` skill. Read when: making a character's or object's mouth speak from the VO (`vo.letters.json`, ElevenLabs alignment, or `mgp align`).

Moved verbatim from SKILL.md v2.3 (chapter 6.8 Lip-sync); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 6.8 Lip-sync from per-letter timing (from chapter 6)

6.8 **Lip-sync from per-letter timing** (replaces the Rhubarb recognizer, which is English-only).

| Order | Timing source | Contents | Notes |
|---|---|---|---|
| 1 | ElevenLabs `POST /v1/text-to-speech/{voice_id}/with-timestamps` | `alignment.characters`, `character_start_times_seconds`, `character_end_times_seconds` | Support in the project's VO model is checked at G2 |
| 2 | ElevenLabs `POST /v1/forced-alignment` (audio file + script) | `characters[]` and `words[]` with text, start, end | For a final VO that is already done |
| 3 | `mgp transcribe vo.wav --language id` (local), then `mgp align vo.wav --script script.txt` for per-word and per-letter timing; any other transcriber that gives per-word timing also works | Per-word timing; letters are spread evenly inside each word | Coarsest; weak spots are marked CHECK BY EAR |
| 4 | Rhubarb Lip Sync 1.14.0 `-r phonetic` | Visemes A-H, X | Fallback if the user chooses it: A to MBP, B/C/H to E, D to A, E to O, F to U, G to FV, X to X |

API calls use the key in the user's computer environment (PowerShell); it is never written in a project file.

**Timing of one speaker's line (warning).** A character that speaks only one line of the VO takes its letters and words from the aligned timing of the **final** audio (`vo.letters.json` / `vo.words.json` of the `vo.wav` that is mixed in), cut by the first word's `start` and the last word's `end`. Do not cut the audio or the timing by `vo.parts/parts.json` (`start` is only an estimate, and `vo.parts/NN.wav` are before the `--speed` tempo change), and never cut after an `atempo`: with ffmpeg `-ss/-to` go before `-i`, `atempo` after the cut (P3 ad: the cup's line held the next line's audio and the mouth moved on words it did not say). When a line is cut out as its own file, align that file again (`mgp align line.wav --script line.txt`) and build the visemes from that. Details: `references/audio.md` 10.2a.

| Letter (Indonesian) | Kit mouth (T4 d) |
|---|---|
| a | A |
| i, e, é, y | E |
| o | O |
| u, w | U |
| m, b, p | MBP |
| f, v | FV |
| Other consonants (including ng, ny, kh, sy) | E, weight 0.5 |
| Pause of at least 2 drawings (0.17 s), punctuation, emotion tag `[...]` | X |
| End of a happy beat (T3) | Smile |

Each on-twos drawing uses the shape that fills the most of its window (consonants are weighted 0.5, so vowels decide more); m, b, p must show closed for at least 1 drawing; short gaps are closed by the previous shape. The 0.5 weight and the 2-drawing pause are starting values, tuned in the G4 pilot. The output `visemes/<block>_<character>.json` holds [{t, v}] and is pasted with the sticker rule in 6.4 item 6.

```python
# viseme_id.py: per-letter timing to kit mouths per on-twos drawing
# python -I viseme_id.py vo.letters.json <duration_s> visemes/b1_hero.json
import json, sys

VIS = {"a": "A", "o": "O", "u": "U", "w": "U", "f": "FV", "v": "FV",
       **dict.fromkeys("ieéy", "E"), **dict.fromkeys("mbp", "MBP")}

def visemes(chars, starts, ends, dur, draw=12, gap_min=2 / 12, w_kons=0.5):
    seg, tag = [], False
    for c, a, b in zip(chars, starts, ends):
        if c == "[": tag = True
        if tag:                                  # emotion tags ([excited], [sighs]) are not spoken
            tag = c != "]"; continue
        if c.lower().isalpha():
            seg.append([a, b, VIS.get(c.lower(), "e")])   # lowercase "e" = other consonant, shown as E
    for i in range(len(seg) - 1):                # short gaps are closed by the previous letter
        if seg[i + 1][0] - seg[i][1] < gap_min:
            seg[i][1] = seg[i + 1][0]
    n = int(round(dur * draw))
    ov = lambda a, b, k: max(0.0, min(b, (k + 1) / draw) - max(a, k / draw))
    out = []
    for k in range(n):                           # the shape that fills the most of the drawing window
        cov = {}
        for a, b, v in seg:
            V, w = ("E", w_kons) if v == "e" else (v, 1.0)
            if ov(a, b, k) > 0: cov[V] = cov.get(V, 0) + w * ov(a, b, k)
        out.append(max(cov, key=cov.get) if cov else "X")
    for a, b, v in seg:                          # m, b, p closed for at least 1 drawing
        ks = [k for k in range(n) if ov(a, b, k) > 0]
        if v == "MBP" and ks and "MBP" not in [out[k] for k in ks]:
            out[max(ks, key=lambda k: ov(a, b, k))] = "MBP"
    return [{"t": round(k / draw, 4), "v": v} for k, v in enumerate(out)]

def load(p):                                     # with-timestamps, forced-alignment, or words only
    d = json.load(open(p))
    if isinstance(d, dict) and "alignment" in d: d = d["alignment"]
    if isinstance(d, dict) and "character_start_times_seconds" in d:
        return d["characters"], d["character_start_times_seconds"], d["character_end_times_seconds"]
    if isinstance(d, dict) and d.get("characters"):
        C = d["characters"]; return [c["text"] for c in C], [c["start"] for c in C], [c["end"] for c in C]
    if isinstance(d, list) and d and ("phone" in d[0] or "letter" in d[0]):   # mgp voice/align: vo.letters.json
        k = "phone" if "phone" in d[0] else "letter"
        return [x[k] for x in d], [x["start"] for x in d], [x["end"] for x in d]
    ch, st, en = [], [], []
    for w in (d["words"] if isinstance(d, dict) else d):   # letters spread evenly inside the word
        s = w["text"].strip(); n = max(1, len(s))
        for i, c in enumerate(s):
            ch.append(c); st.append(w["start"] + (w["end"] - w["start"]) * i / n)
            en.append(w["start"] + (w["end"] - w["start"]) * (i + 1) / n)
    return ch, st, en

if __name__ == "__main__":
    json.dump(visemes(*load(sys.argv[1]), float(sys.argv[2])), open(sys.argv[3], "w"))
```

Synthetic test 02-11-2026 (each letter 0.07 s): a short two-word Indonesian phrase with a tag and a comma gives X during the tag, MBP on the closed-lip letters (b, m), open mouth shapes (A, U, E) on the vowels and other consonants, and X at the comma pause. A test with a real VO is done in the G4 pilot.
