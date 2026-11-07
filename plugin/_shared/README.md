# _shared - modules shared by the skills

Single source for modules used by more than one skill (old folder name: `_bersama`). Skills are installed as separate
folders, so each skill carries its own copy in its `scripts/` folder; the copies are made by `sync.py` and get an
`AUTO-GENERATED COPY` header line. This folder itself does not need to be installed.

| file | old name | copied to |
|---|---|---|
| `brush.py` | `kuas.py` | vector-character, motion-graphics |
| `image_ops.py` | `atelier_citra.py` | vector-character, motion-graphics |
| `cavity.py` | `rongga.py` | vector-character, motion-graphics |
| `kuas.py`, `atelier_citra.py`, `rongga.py` | (old-name shims) | vector-character, motion-graphics |
| `NOTICE` | `NOTICE` | vector-character, motion-graphics |

The old module names keep working: `kuas.py`, `atelier_citra.py` and `rongga.py` are thin shims that hand out the
new module, and every old (Indonesian) function, class, method, attribute and keyword name is an alias inside the new
module. Old environment variables are still read: `KUAS_MESIN` (now `MGP_BRUSH_ENGINE`, value `pure`, old `murni`)
and `KUAS_SS` (now `MGP_BRUSH_SUPERSAMPLE`). Messages are English by default and Indonesian with `MGP_LANG=id`.

## Editing workflow

1. Edit the files in `_shared/` (never the copies).
2. Test: `python -I -X utf8 _shared/tests/test_image_ops.py out/` (compared against OpenCV, skipped when cv2 is
   missing) and `MGP_BRUSH_ENGINE=pure python -I -X utf8 _shared/tests/test_brush.py out/`, then again with
   `MGP_BRUSH_ENGINE=skia`, and compare: `python -I _shared/tests/compare.py out/brush_skia.png out/brush_pure.png
   out/diff.png`.
3. Sync: `python -I _shared/sync.py` (from the package folder). Before a release `python -I _shared/sync.py --check`
   must exit with code 0. The old command `python -I _bersama/sinkron.py [--cek]` still works.

To add a module or a target skill: edit `MAP` in `sync.py`.
