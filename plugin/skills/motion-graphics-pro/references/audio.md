# References: audio, SFX, narration voice source

Part of the `motion-graphics-pro` skill. Read when: at the voice decision point (G2), and when making the VO, SFX, mix and master.

Moved verbatim from SKILL.md v2.3 (chapter 10 Audio); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, section References).

## 10. Audio

| Item | Rule |
|---|---|
| VO | Normalised; per-word transcript = the clock for text and action; 0.8 s pause between blocks |
| SFX | Only on visible actions (paper slide, pop, tear, step); peak 1 frame after the picture; 2-3 alternating takes; 5 dB down while the VO speaks |
| Music | Per project (a narration-only project may have no music); when used, about 0.14 volume under the VO |
| Master | -14 LUFS, true peak -1.5 dBTP; the report says the audio was measured, not listened to |

VO + SFX mix: a copy-ready recipe in 10.4 (ffmpeg `sidechaincompress` for ducking, then `mgp audio normalize`), checked with `mgp audio measure` / ffmpeg `loudnorm` `print_format=summary` (T9). `mgp audio` for normalisation and level reports; `mgp sfx` for procedural sound effects, `mgp sfx mix` for an SFX track from a cue list.

10.1 **Narration voice source (decision point, part of G2).** The voice is the clock of the video: the timing of text, action and mouth is taken from the VO. Before the stage 3 VO is made, Claude asks for the voice source with four options (chat + interactive question), then waits for the answer:

| Option | Contents | Word/syllable/letter timing | Cost |
|---|---|---|---|
| a. ElevenLabs | A stock voice, or the user's own cloned voice in their ElevenLabs account. Through the ElevenLabs connector (Claude picks the voice with `creative_list_voices`) or the API: `mgp voice elevenlabs script.txt --voice <id> -o vo.wav` (env `ELEVENLABS_API_KEY`, endpoint `/with-timestamps`) | from the ElevenLabs character alignment → `vo.words.json` + `vo.letters.json`; connector output: `mgp align` | ElevenLabs credits |
| b. Local voice clone | The user records ~30 s reading `voice/reading-template.md` (`mgp voice template`). Claude inspects it (`mgp voice inspect`), creates a profile (`mgp voice clone recording.wav --name <profile>`), then makes the VO from the script (`mgp voice speak script.txt --profile <profile> -o vo.wav --emotion warm`) | `mgp align` automatically → `vo.words.json` + `vo.letters.json` | free, local; NVIDIA GPU when present (±4x faster), otherwise CPU (`voice/README.md`) |
| c. User recording | The user records the whole narration themselves | `mgp align` or `mgp transcribe --fix-with script.txt` | free |
| d. No narration | Text and music/SFX only | clock = beat sheet T3 | - |

Local clone workflow (option b):
1. `mgp voice template [--language en]` → send the reading text + how to record (quiet room, 20-30 cm, no music, WAV/MP3/M4A 24-48 kHz).
2. `mgp voice inspect recording.wav` → duration ≥ 20 s, SNR, clipping, loudness, sample rate, and the consent sentence. ERROR = ask for a new recording, using the message from that command.
3. `mgp voice clone recording.wav --name <profile>` → `<profile folder>/<profile>/` (clean reference, model conditionals, `profile.json` with the consent time and source hash). The default profile folder is `~/.mgp/voice-profiles/`, outside the skill/plugin folder (an update replaces that folder); an older in-skill `voice/profiles/` that already holds profiles is still used. Move it with env `MGP_VOICE_PROFILES` (or `--folder`).
4. `mgp voice speak script.txt --profile <profile> -o vo.wav [--emotion neutral|warm|energetic|calm] [--speed 1.0]` → VO at -16 LUFS + word, syllable and letter timing + `vo.parts/` (one WAV per sentence). Brands/abbreviations are spelled through pronunciations (10.3), not by changing the script. Check sentence numbers and spoken spellings first, without a GPU: `--dry-run`.
The clone engine is installed once per computer (`mgp install voice`: venv + version-locked models, not in the ZIP; `mgp doctor` gives GPU/CPU advice, `references/hardware.md`). Owner consent given directly outside the recording (a recording without the consent sentence, where the voice owner asks for it themselves): `mgp voice clone recording.wav --name <profile> --manual-consent --statement "<who owns the voice, when, how consent was given>"`; the statement is recorded in `profile.json`. The user's original recording is not copied into the project or pack folder; it is read from where it is.
5. `mgp voice score vo.wav --profile <profile> --script script.txt` → raw and **normalised** WER/CER (the G2 numbers), speaker similarity, and a **CHECK BY EAR** list (words that still differ after normalisation + seconds + sentence number). The G2 report uses the normalised numbers, mentions the raw numbers, and lists the CHECK BY EAR items that have been listened to. A real mispronunciation: redo only that sentence (10.2); a correct sound that the ASR spells differently: add a variant in `pronunciations.txt` (10.3).

10.2 **Redo one sentence.** `mgp voice speak script.txt -o vo.wav --sentence 3 [--seed N | --tries 4]` remakes sentence 3 only (also `2,5` or `2-4`), reuses the other sentences from `vo.parts/`, joins them with the same pauses, then rewrites the loudness, `vo.words.json` and `vo.letters.json`. `--tries N` makes N candidates in one model load and picks the one with the best score (normalised WER from ASR + plausible duration + signs of token repetition); the other candidates are kept in `vo.parts/candidates/` for listening. With `--sentence` the current take is scored as one more candidate and is only replaced when a new one scores strictly better (the scores of the current take and the best new one are printed; `--force` takes the best new one anyway). Afterwards run `mgp voice score` again. Details: `voice/README.md`, section Speak.

10.2a **Cutting one line out of the VO (warning).** Cut on the timeline of the audio you cut, never on a re-timed one. `vo.wav` is already tempo-changed by `--speed` (atempo on the joined parts), and `vo.words.json` holds the times of that final file; `vo.parts/NN.wav` are the sentences *before* the tempo change (natural speed). So: (a) a line out of `vo.wav` = the first word's `start` to the last word's `end` from `vo.words.json` (aligned on the final audio), not `parts.json` `start` + the part duration; (b) a line from `vo.parts/NN.wav` that must play at the VO speed gets its own `atempo` **after** the cut. With ffmpeg, put `-ss/-to` **before** `-i` (input seeking: times on the source) and the `atempo` in `-af`; `-ss/-to` after `-i` together with `-af atempo` measures the cut on the output timeline and takes in audio of the next line (in a real ad: the cup's line 11 carried line 12, "Simulasi tiga dimensi"). Check every cut by ear or with `mgp transcribe` before the lip-sync is built on it. `mgp` itself cuts in that order (the render mixer trims on the source, then re-times).

10.3 **Pronunciations (TTS helper spellings).** The script is written normally ("Claude", "brief-nya", "260"). Spoken spellings live in the project's `pronunciations.txt` (`Claude = Klod`, `Motion Graphics = Mosyen Grafiks`; right of `|` = ASR variants that count as correct), in `--pronounce "a=b; c=d"`, or in `voice/pronunciations-default.txt` (read automatically). Numbers are spelled out automatically. The text in `vo.words.json` stays the original script, so captions never show the helper spellings. The Claude case and how to handle "clock/cloud" from the ASR: `voice/README.md`.

10.4 **VO + SFX mix with ducking (copy-ready recipe).** SFX are ducked automatically while the VO speaks (sidechain), then mastered to -14 LUFS / -1.5 dBTP. Replace `adelay` with the VO start in the video (ms), and `-t` with the video duration:

```bash
mgp sfx mix assets/audio/sfx.json -o assets/audio/sfx.wav          # SFX track from cues
ffmpeg -y -i assets/audio/vo.wav -i assets/audio/sfx.wav -filter_complex \
  "[0:a]adelay=300:all=1,apad,asplit=2[vo][sc];[1:a]volume=-3dB[sfx];\
   [sfx][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=300[sfxd];\
   [vo][sfxd]amix=inputs=2:normalize=0,alimiter=limit=0.84[mix]" \
  -map "[mix]" -t 30 -ar 48000 -ac 2 assets/audio/mix_rough.wav
mgp audio normalize assets/audio/mix_rough.wav -o assets/audio/mix.wav --lufs=-14 --tp=-1.5
mgp audio measure assets/audio/mix.wav                                    # note LUFS, LRA, peak in T9
```

- Tested on the VO + SFX of a 30 s ad: -15.2 LUFS raw → -13.9 LUFS, peak -1.7 dBFS, LRA 2.5 LU. Write negative option values with `=` (`--lufs=-14`).
- `threshold` 0.02-0.05 (smaller ducks sooner), `ratio` 4-8, `release` 250-400 ms so the SFX do not "pump" between words. Target: SFX ±5 dB under the VO while it speaks, full level in the pauses; SFX more than 10 dB under the VO are inaudible (test F: ±-27 LUFS, too quiet).
- Music (when the project uses it) goes in as a third input with the same `sidechaincompress` chain and a starting `volume` of about -18 dB.
- Put `mix.wav` in the composition as a single audio track (the separate VO and SFX are no longer added), then render.

10.5 **Speech rate for script estimates.** Work out the script length from the rate of the voice source in use, then measure again from the first VO:

| Source | Rate | Origin of the number |
|---|---|---|
| First reference VO v1 (old voice source, not the local clone) | 2.06 words/s | SKILL v2.3 |
| Local Chatterbox clone, a test profile, `--speed 1.0` | 1.72 words/s (61 words = 35.4 s) | final test of the 30 s ad, 06-11-2026 |
| The same local clone, `--speed 1.12` | ±1.9 words/s (53 words = 28.2 s) | same |

For a 30 s VO with the local clone: ±50-53 words at `--speed 1.1`, not 60-70 words. Counts are per script token ("260" = 1 word).

**Voice ethics (required).** Only clone the user's own voice, or the voice of someone else who has given explicit, recorded consent (the consent sentence at the start of the recording; without that sentence `mgp voice clone` refuses, unless the voice owner gives consent directly and it is recorded with `--manual-consent --statement`). Never imitate public figures, celebrities, religious scholars, officials, or people who have died, even when asked. Voice profiles are kept locally on the user's computer, are not uploaded, are not sent to other services, and are not included in shared project folders; delete one with `mgp voice remove <profile>` when the user asks. Disclose cloned VO as a synthetic voice when the platform requires it.
