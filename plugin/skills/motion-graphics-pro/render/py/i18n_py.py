"""i18n_py - bilingual messages + MGP_* environment lookup for the mgp Python scripts (Motion Graphics Pro).

English by default; Indonesian with MGP_LANG=id, or automatically when LC_ALL / LC_MESSAGES / LANG starts with "id"
(MGP_LANG=en forces English). Same rules as render/src/i18n.mjs.
Catalogs: render/i18n/<lang>/py_<module>.json, flat {"English text with {}": "translation"}; placeholders are {} (in order)
or {0}, {1}, ... (any order).

    from i18n_py import T, env
    log(T("model ready ({} s)", round(dt, 1)))
    folder = env("MGP_CHATTERBOX_DIR")        # MGP_* first, then the old REKAM_* name
"""
import glob
import json
import os
import re

_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "i18n")

# canonical env name -> old name (same pairs as ENV in render/src/names.mjs)
ENV_OLD = {
    "MGP_DEVICE": "REKAM_DEVICE", "MGP_GPU_WAIT": "REKAM_GPU_TUNGGU", "MGP_GPU_LOCK": "REKAM_GPU_KUNCI",
    "MGP_GPU_LIMIT": "REKAM_GPU_BATAS", "MGP_WHISPER_CACHE": "REKAM_WHISPER_CACHE", "MGP_WHISPER_MODEL": "REKAM_WHISPER_MODEL",
    "MGP_CHATTERBOX_DIR": "REKAM_CHATTERBOX_DIR", "MGP_OPENVOICE_DIR": "REKAM_OPENVOICE_DIR",
    "MGP_IMAGE_MODEL": "REKAM_GAMBAR_MODEL", "MGP_IMAGE_TE_DTYPE": "REKAM_GAMBAR_TE_DTYPE",
    "MGP_IMAGE_REF_MAX": "REKAM_GAMBAR_REF_MAKS", "MGP_IMAGE_FORCE": "REKAM_GAMBAR_PAKSA", "MGP_IMAGE_PYTHON": "REKAM_GAMBAR_PYTHON",
    "MGP_IMAGE_TIMEOUT": "REKAM_GAMBAR_BATAS_DETIK", "MGP_PYTHON": "REKAM_PYTHON", "MGP_HOME": "REKAM_RUMAH",
    "MGP_VOICE_PROFILES": "REKAM_SUARA_PROFIL",
}


def env(name, default=None):
    """Environment variable by its canonical MGP_* name, falling back to the old REKAM_* name."""
    v = os.environ.get(name)
    if v not in (None, ""):
        return v
    old = ENV_OLD.get(name)
    w = os.environ.get(old) if old else None
    return w if w not in (None, "") else default


def lang():
    """Active message language: "en" | "id"."""
    m = (os.environ.get("MGP_LANG") or "").lower()
    if m:
        return "id" if m.startswith("id") else "en"
    for k in ("LC_ALL", "LC_MESSAGES", "LANG"):
        v = (os.environ.get(k) or "").lower()
        if v:
            return "id" if v.startswith("id") else "en"
    return "en"


_CAT = None
_CAT_LANG = None


def _catalog():
    global _CAT, _CAT_LANG
    l = lang()
    if _CAT is not None and _CAT_LANG == l:
        return _CAT
    _CAT, _CAT_LANG = {}, l
    for f in sorted(glob.glob(os.path.join(_DIR, l, "py_*.json"))):
        try:
            with open(f, encoding="utf-8") as h:
                _CAT.update(json.load(h))
        except Exception:
            pass  # broken catalog: fall back to English
    return _CAT


def _fill(tpl, vals):
    n = [0]

    def rep(m):
        i = m.group(1)
        if i == "":
            k = n[0]
            n[0] += 1
        else:
            k = int(i)
        return str(vals[k]) if k < len(vals) else m.group(0)
    return re.sub(r"\{(\d*)\}", rep, tpl)


def T(key, *vals):
    """Translate an English message; {} / {0} placeholders are filled with vals."""
    tr = _catalog().get(key)
    return _fill(tr if tr is not None else key, vals)


def rename_kwargs(mapping):
    """Decorator: accept old keyword names, e.g. @rename_kwargs({"bahasa": "lang"})."""
    def deco(f):
        import functools

        @functools.wraps(f)
        def w(*a, **kw):
            for old, new in mapping.items():
                if old in kw:
                    kw.setdefault(new, kw.pop(old))
            return f(*a, **kw)
        return w
    return deco
