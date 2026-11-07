# References: review and QC

Part of the `motion-graphics-pro` skill. Read when: every REPORT delivery, per-block review, and before G4/G5.

Moved verbatim from SKILL.md v2.3 (chapter 12 Review and QC); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 12. Review and QC

1. Every shot is sent as a contact sheet (start, 25/50/75%, end), full-res crops of foot contacts and edges, and a clip with audio; the T9 checklist is run per shot and per block.
2. Review notes: `t=4.2 s | place | problem -> change | what stays`, ranked P0 (breaks reading/the contract), P1 (weakens), P2 (polish). Every P0 is fixed, then only the changed parts are snapshotted again.
3. One fix must not break another part. Frames before and after are compared; if one frame gets worse, work stops and it is reported.
4. Weaknesses that are still visible are written down honestly; placeholders are labelled in the frame.
5. REPORT deliveries use the T9a report format, one report per block.

## 12.1 Pilot and new blocks (v2.4)

1. The first pilot delivery = the blocking sheet (`mgp contact index.html --var blocking=true --times poses`), without ease
   and without secondary detail. Review Results at this stage change poses and timing, not easing (`references/motion.md` 6.9).
2. After spline: `mgp curves` for the changed range. A "linear" finding on motion that should be eased,
   a "pop" outside an impact/cut, or a "volume" finding on a squash = fixed before REPORT. Findings that are intended
   (a ball impact, a cut) are written in the T9a report. Reference numbers: `motion-graphics/references/advanced-principles.md`.
3. The T9a report contains the paths of the blocking sheet, the contact sheet, the curve graph, and the clip with audio.
