#!/usr/bin/env python3
"""
build_plugin.py · builds the Claude plugin "motion-graphics-pro" from the source of truth skill/ (reproducible: sorted
entries, fixed timestamps). This tools/ folder is never packed.

    python -I tools/build_plugin.py                 # stage + plugin ZIP + marketplace repo tree
    python -I tools/build_plugin.py --json

Outputs (paths relative to the project folder, the parent of skill/):
  dist_repo/plugin/                                  staged plugin (the tree the plugin ZIP holds)
  dist_repo/.claude-plugin/marketplace.json          marketplace "salimmoo", plugin source "./plugin"
  <site>/download/motion-graphics-pro-plugin-v<version>.zip   .claude-plugin/plugin.json at the ZIP root
<site> = ../guide (local working copy) or ../docs (repo layout), the first that exists; override with --site.

Plugin layout:
  .claude-plugin/plugin.json
  skills/motion-graphics-pro/  skills/motion-graphics/  skills/vector-character/   (complete, full descriptions)
  _shared/   LICENSE.md   NOTICE.md   CHANGELOG.md   README.md
The skills stay siblings, so mgp finds ../../motion-graphics/lib and _shared/sync.py finds skills/<name>/scripts.
Left out: __pycache__, *.pyc, node_modules, voice profiles, `nul`, stray test PNGs, wheels, tools/, .github/,
_bersama/ (old redirect), archives (.zip .tar .gz .tgz .7z .rar). Asserted: <= 5000 files, <= 200 MB, no top-level
bin/ (claude.ai and Cowork refuse it), no archives inside, every skill's `name` equals its folder.
"""
import argparse
import fnmatch
import json
import os
import re
import shutil
import sys
import zipfile

SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # skill/
PROJECT = os.path.dirname(SKILL_ROOT)
PLUGIN = "motion-graphics-pro"
MARKET = "salimmoo"
SKILLS = ["motion-graphics-pro", "motion-graphics", "vector-character"]
ROOT_FILES = ["LICENSE.md", "NOTICE.md", "CHANGELOG.md"]
MAX_FILES, MAX_MB = 5000, 200
DATE = (2026, 11, 7, 0, 0, 0)
HOMEPAGE = "https://salimmoo.github.io/motion-graphics-pro/"
REPO = "https://github.com/salimmoo/motion-graphics-pro"
DESCRIPTION = ("Motion graphics videos from a plain-language brief to a finished file: concept, script, voice, assets, "
               "motion in code, QC and a local render with mgp. Three skills: motion-graphics-pro, motion-graphics, "
               "vector-character.")

SKIP_DIRS = {"__pycache__", "node_modules", ".git", ".github", "profiles", "profil"}
SKIP_FILES = {"nul", "_test_rw.png", "brush_pure.png", "brush_skia.png", "brush_diff.png", ".DS_Store", "Thumbs.db"}
SKIP_GLOBS = ["*.pyc", "*.pyo", "*.whl"]
ARCHIVE = re.compile(r"\.(zip|tar|gz|tgz|7z|rar|bz2|xz)$", re.I)


def version():
    with open(os.path.join(SKILL_ROOT, "CHANGELOG.md"), encoding="utf-8") as f:
        m = re.search(r"^## v(\d+(?:\.\d+)+)", f.read(), re.M)
    if not m:
        raise SystemExit("version not found in CHANGELOG.md")
    return m.group(1)


def site_dir(arg):
    if arg:
        return os.path.abspath(arg)
    for c in ("guide", "docs"):
        d = os.path.join(PROJECT, c)
        if os.path.isdir(d):
            return d
    raise SystemExit("site folder (guide/ or docs/) not found; use --site")


def walk(base):
    out = []
    for root, dirs, files in os.walk(base):
        rel = os.path.relpath(root, base).replace("\\", "/")
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for f in sorted(files):
            if f in SKIP_FILES or any(fnmatch.fnmatch(f, g) for g in SKIP_GLOBS) or ARCHIVE.search(f):
                continue
            out.append(f if rel == "." else rel + "/" + f)
    return out


def frontmatter_name(skill_md):
    t = open(skill_md, encoding="utf-8").read()
    m = re.match(r"---\s*\n(.*?)\n---", t, re.S)
    assert m, "%s: no YAML frontmatter" % skill_md
    n = re.search(r'^name:\s*"?([^"\n]+)"?\s*$', m.group(1), re.M)
    d = re.search(r'^description:\s*(.+)$', m.group(1), re.M)
    assert n and d, "%s: name/description missing" % skill_md
    return n.group(1).strip()


def readme(ver):
    return f"""# Motion Graphics Pro (Claude plugin) v{ver}

Three Claude skills that take a motion graphics video from a plain-language brief to a finished file:
`motion-graphics-pro` (production flow, mgp renderer, 260 blocks, 104 motion packs), `motion-graphics`
(motion principles + JS motion library) and `vector-character` (vector characters in code).

## Install

- **claude.ai / Cowork**: Customize > Plugins > Upload plugin (this ZIP), or Add marketplace `salimmoo/motion-graphics-pro`.
- **Claude Code**: `/plugin marketplace add salimmoo/motion-graphics-pro`, then `/plugin install motion-graphics-pro@salimmoo`.
- **Manual**: copy `skills/*` to `~/.claude/skills/`.

Skills are invoked as `/motion-graphics-pro:motion-graphics-pro`, `/motion-graphics-pro:motion-graphics` and
`/motion-graphics-pro:vector-character`, or picked automatically from the request.

Rendering needs Node.js 22+, ffmpeg and Chrome/Edge/Chromium on the machine that runs the commands. The optional
local voice and image engines are installed once per computer with `mgp install` (models are not in the plugin).
Voice profiles and engines live in `~/.mgp`, outside the plugin folder, so updates never remove them.

Guide: {HOMEPAGE} · Source: {REPO} · Licence: `LICENSE.md` · Credits: `NOTICE.md` · Changes: `CHANGELOG.md`
"""


def safe_rmtree(d):
    d = os.path.abspath(d)
    assert d.startswith(os.path.join(PROJECT, "dist_repo")), "refusing to clear %s" % d
    if os.path.isdir(d):
        shutil.rmtree(d)


def stage(dest, ver):
    safe_rmtree(dest)
    files = {}  # rel path in plugin -> source path or bytes
    for s in SKILLS:
        src = os.path.join(SKILL_ROOT, s)
        assert frontmatter_name(os.path.join(src, "SKILL.md")) == s, "%s: frontmatter name must equal the folder" % s
        for f in walk(src):
            files["skills/%s/%s" % (s, f)] = os.path.join(src, f)
    for f in walk(os.path.join(SKILL_ROOT, "_shared")):
        files["_shared/" + f] = os.path.join(SKILL_ROOT, "_shared", f)
    for f in ROOT_FILES:
        files[f] = os.path.join(SKILL_ROOT, f)
    files["README.md"] = readme(ver).encode("utf-8")
    manifest = {
        "name": PLUGIN,
        "version": ver,
        "description": DESCRIPTION,
        "author": {"name": "Salim Muhammad", "url": "https://github.com/salimmoo"},
        "homepage": HOMEPAGE,
        "repository": REPO,
        "license": "SEE LICENSE IN LICENSE.md",
        "keywords": ["motion-graphics", "video", "animation", "explainer", "render", "kinetic-typography", "paper-collage"],
    }
    icon = os.path.join(SKILL_ROOT, "tools", "plugin-icon.png")  # 1024 px square PNG (the site's gate padlock)
    if os.path.exists(icon):
        files[".claude-plugin/icon.png"] = icon
        manifest["icon"] = ".claude-plugin/icon.png"
    files[".claude-plugin/plugin.json"] = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    for rel, src in files.items():
        out = os.path.join(dest, *rel.split("/"))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if isinstance(src, bytes):
            with open(out, "wb") as h:
                h.write(src)
        else:
            shutil.copyfile(src, out)
    return sorted(files)


def check(names, size):
    assert len(names) <= MAX_FILES, "%d files > %d" % (len(names), MAX_FILES)
    assert size <= MAX_MB * 1024 * 1024, "%.1f MB > %d MB" % (size / 1048576, MAX_MB)
    assert not any(n.split("/")[0] == "bin" for n in names), "top-level bin/ is refused by claude.ai"
    assert not any(ARCHIVE.search(n) for n in names), "archive inside the plugin"
    assert ".claude-plugin/plugin.json" in names
    for s in SKILLS:
        assert "skills/%s/SKILL.md" % s in names
    assert "skills/motion-graphics/lib/motion/motion.js" in names, "sibling lib missing"
    assert not any(re.search(r"(^|/)(__pycache__|node_modules|nul|\.github|profiles)(/|$)|\.pyc$", n) for n in names)
    top = {n.split("/")[0] for n in names}
    assert top <= {".claude-plugin", "skills", "_shared", "README.md"} | set(ROOT_FILES), "unexpected top level: %s" % top


def write_zip(zpath, base, names):
    os.makedirs(os.path.dirname(zpath), exist_ok=True)
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for n in names:
            zi = zipfile.ZipInfo(n, DATE)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16
            with open(os.path.join(base, *n.split("/")), "rb") as h:
                z.writestr(zi, h.read(), compresslevel=9)
    with zipfile.ZipFile(zpath) as z:
        assert z.testzip() is None
        return z.namelist(), sum(i.file_size for i in z.infolist())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", help="site folder (default ../guide or ../docs)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    ver, site = version(), site_dir(a.site)
    repo = os.path.join(PROJECT, "dist_repo")
    plug = os.path.join(repo, "plugin")
    names = stage(plug, ver)
    size = sum(os.path.getsize(os.path.join(plug, *n.split("/"))) for n in names)
    check(names, size)
    mk = {
        "name": MARKET,
        "owner": {"name": "Salim Muhammad", "url": "https://github.com/salimmoo"},
        "metadata": {"description": "Motion Graphics Pro: Claude skills for motion graphics videos, brief to render."},
        "plugins": [{"name": PLUGIN, "source": "./plugin", "description": DESCRIPTION,
                     "author": {"name": "Salim Muhammad"}, "homepage": HOMEPAGE, "repository": REPO,
                     "category": "creative"}],
    }
    os.makedirs(os.path.join(repo, ".claude-plugin"), exist_ok=True)
    with open(os.path.join(repo, ".claude-plugin", "marketplace.json"), "w", encoding="utf-8", newline="\n") as h:
        h.write(json.dumps(mk, indent=2, ensure_ascii=False) + "\n")
    zpath = os.path.join(site, "download", "%s-plugin-v%s.zip" % (PLUGIN, ver))
    znames, usize = write_zip(zpath, plug, names)
    assert znames == names
    res = {"version": ver, "plugin_dir": plug, "zip": zpath, "files": len(names), "bytes": os.path.getsize(zpath),
           "uncompressed": usize, "marketplace": os.path.join(repo, ".claude-plugin", "marketplace.json")}
    if a.json:
        print(json.dumps(res, indent=2))
    else:
        print("plugin %s v%s: %d files, %.2f MB zip (%.2f MB uncompressed)\n  %s\n  %s\n  %s" % (
            PLUGIN, ver, res["files"], res["bytes"] / 1048576, usize / 1048576, zpath, plug, res["marketplace"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
