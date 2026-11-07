"""sync - copy the shared modules into the scripts/ folder of each skill (one source, many copies).

Skills are installed as separate folders, so each skill carries its own copy. The only source lives in _shared/;
copies get an "AUTO-GENERATED COPY" header line and must not be edited directly.
Old name: _bersama/sinkron.py (still works and runs this file).

Usage (from the package folder, e.g. skill/):
  python -I _shared/sync.py            -> rewrite every copy
  python -I _shared/sync.py --check    -> check only; exit code 1 when a copy differs or is missing (old flag: --cek)
To add a module or a skill: edit MAP below.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# plugin layout (.claude-plugin/ + skills/<name>/): the skill folders sit under skills/
if not os.path.isdir(os.path.join(ROOT, "motion-graphics")) and os.path.isdir(os.path.join(ROOT, "skills", "motion-graphics")):
    ROOT = os.path.join(ROOT, "skills")

TARGETS = ["vector-character/scripts", "motion-graphics/scripts"]
MAP = {
    "brush.py": TARGETS,
    "image_ops.py": TARGETS,
    "cavity.py": TARGETS,
    # old-name shims (kuas -> brush, atelier_citra -> image_ops, rongga -> cavity)
    "kuas.py": TARGETS,
    "atelier_citra.py": TARGETS,
    "rongga.py": TARGETS,
    "NOTICE": TARGETS,
}


def _T(en, id_):
    """English by default; Indonesian with MGP_LANG=id (or LC_ALL / LC_MESSAGES / LANG starting with "id")."""
    for k in ("MGP_LANG", "LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return id_ if v.startswith("id") else en
    return en


def header(name):
    return ("# AUTO-GENERATED COPY of _shared/%s (run _shared/sync.py after editing the source). "
            "Do not edit here.\n" % name)


def copy_text(name):
    src = open(os.path.join(HERE, name), encoding="utf-8").read()
    if name.endswith(".py"):
        return header(name) + src
    return src


def main(check=False):
    diff = 0
    for name, targets in MAP.items():
        text = copy_text(name)
        for t in targets:
            p = os.path.join(ROOT, t, name)
            old = open(p, encoding="utf-8").read() if os.path.exists(p) else None
            if old == text:
                print(_T("same    ", "sama    "), os.path.join(t, name))
                continue
            diff += 1
            if check:
                if old is not None:
                    print(_T("DIFFERS ", "BEDA    "), os.path.join(t, name))
                else:
                    print(_T("MISSING ", "HILANG  "), os.path.join(t, name))
            else:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, "w", encoding="utf-8", newline="\n") as f:
                    f.write(text)
                print(_T("written ", "ditulis "), os.path.join(t, name))
    if check and diff:
        print(_T("%d copies out of sync", "%d salinan tidak sinkron") % diff)
        return 1
    return 0


def cli(argv=None):
    ap = argparse.ArgumentParser(description=_T(__doc__, _DOC_ID), formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", "--cek", action="store_true",
                    help=_T("check only; exit code 1 when a copy differs or is missing",
                            "hanya periksa; kode keluar 1 bila ada salinan yang beda/hilang"))
    a = ap.parse_args(argv)
    return main(a.check)


_DOC_ID = """sync - salin modul bersama ke folder scripts/ tiap skill (satu sumber, banyak salinan).

Skill dipasang sebagai folder terpisah, jadi tiap skill membawa salinannya sendiri. Sumber satu-satunya ada di
_shared/; salinan diberi baris kepala "AUTO-GENERATED COPY" dan tidak boleh diubah langsung.
Nama lama: _bersama/sinkron.py (tetap jalan dan menjalankan berkas ini).

Pakai (dari folder paket, mis. skill/):
  python -I _shared/sync.py            -> tulis ulang semua salinan
  python -I _shared/sync.py --check    -> hanya periksa; kode keluar 1 bila ada salinan yang beda/hilang (flag lama: --cek)
Tambah modul atau skill baru: ubah MAP di bawah.
"""

if __name__ == "__main__":
    sys.exit(cli())
