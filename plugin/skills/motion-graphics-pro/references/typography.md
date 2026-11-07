# References: kinetic typography

Part of the `motion-graphics-pro` skill. Read when: writing text, headlines, subtitles, cards, fonts, or Arabic text.

Moved verbatim from SKILL.md v2.3 (chapter 7 Kinetic typography); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 7. Kinetic typography

7.1 Text is only made in code, never in an AI image.

| Role | Font, size (720 w) | Motion |
|---|---|---|
| Kicker | Poppins SemiBold caps, tracking 0.3 em, 14-18 px | Fade 4 frames |
| Headline | Poppins Bold 46-64 px | Fade-rise per word 4-6 frames, rising 6-8 px, at the VO word timestamp |
| Keyword | Playfair Display Italic / Cormorant Garamond Italic, 1.12 x headline | Highlight strip wipe 6 frames OR draw-on underline 8-16 frames after the word; pulse 5.5% exactly at the word timestamp |
| VO subtitle | Poppins on a cream strip, 3-5 words, 52 px (min 28 px) | Per phrase |

| Frame | Spec |
|---|---|
| Cream card | #FBF6EA, soft shadow (dy 6 px, blur 12 px, 30%), rotation ±1-1.5° |
| Navy card | #1C2B45, torn cream rim #F1E6D0, white text, accent #F3C766 |
| Strip label | Cream + colour ply (#B23A32 or #E3B04B) offset -4 px, +5 px |
| Highlight strip | #F1C75B, torn edge (turbulence + displacement scale 9, or polygon clip-path), from 34% of the word height, height 58% |

Text black #141414, white on dark blocks; the accent only for keywords. Max 2-3 lines, 1-4 words per callout, 3-7 words per kinetic scene.

7.2 **Timing and layout.**
- Words appear at the VO timestamp from a per-word transcript that has been checked against the script; weak spots are marked CHECK BY EAR.
- Reading hold = 0.5 s + 0.3 s per word; the last line of the film at least 2 s; exit 0.13-0.25 s.
- 9:16 safe zone: top 9% empty, bottom at least 20% free of text; for Reels/TikTok every word inside the band 168-1330 px (of 1920), not under the right-hand buttons, subtitles at the bottom of the band.
- Minimum text size 2.6% of the short side (19 px at 720 w; `mgp check` checks it automatically: finding "text below the reading limit"); a 14-18 px kicker is kept with a written reason or raised to 19 px.

7.3 **Fonts.** mgp ships 24 OFL fonts, including Poppins (with italic), Playfair Display, Cormorant Garamond, DM Serif Display, and Noto Naskh Arabic (list in `render/README.md`, "Fonts without internet"). `mgp new --font "Poppins,Playfair Display"` copies the chosen families to `assets/fonts/` + `fonts.css`, so the project runs from file:// and without internet. Fonts outside the bundle (Amiri, Aref Ruqaa, Reem Kufi Ink, Lateef; npm package `@fontsource`) are copied to `assets/fonts/` and loaded with `@font-face`. `mgp check` flags text that relies only on a system font or the internet.

7.4 **Arabic.** Amiri 700. Name calligraphy: ﷴ (U+FDF4) large + ﷺ (U+FDFA) at 0.26 x ﷴ at the top left of the medallion, centred with getBBox after the font is ready. Text and harakat are checked letter by letter against the source in a crop.
