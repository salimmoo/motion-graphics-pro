#!/usr/bin/env python3
"""
build.py · builds example.html for every block, catalog.json, and the alias table in _core/block-core.js.

    python blocks/tools/build.py               # every block
    python blocks/tools/build.py transitions   # one category (catalog.json is not written)
    python blocks/tools/build.py text/rising-words
    python blocks/tools/build.py --check       # validate block.json only (old flag: --cek)

Each block = folder blocks/<category>/<name>/ with block.html, block.json, example.html.
example.html is built from block.html + the "example" section of block.json, unless
block.json has "example_manual": true (hand-written example.html).
Old names still read: blok.json/blok.html (files), Indonesian keys in block.json (nama, kategori, ...).
Messages: English by default, Indonesian with MGP_LANG=id (or LANG/LC_ALL starting with "id").
Python standard library only.
"""
import json
import os
import re
import sys
from pathlib import Path

BLOCKS = Path(__file__).resolve().parent.parent
MOTION = "../../../../motion-graphics/lib/motion/motion.js"  # the package animation engine (GSAP-compatible API), runs from file:// offline
ASPECT = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080), "4:5": (1080, 1350)}
REQUIRED = ["id", "name", "category", "description", "props", "duration", "aspect"]
OLD_KEYS = {"nama": "name", "kategori": "category", "deskripsi": "description", "tag": "tags", "durasi": "duration",
            "rasio": "aspect", "dependensi": "dependencies", "nama_lama": "aliases", "contoh": "example",
            "contoh_manual": "example_manual"}
OLD_PROP_KEYS = {"bawaan": "default", "jenis": "type", "pilihan": "options", "ket": "hint"}
OLD_EXAMPLE_KEYS = {"latar": "bg", "mulai": "start", "durasi": "duration", "durasi_blok": "block_duration", "rasio": "aspect"}
OLD_BG = {"gelap": "dark", "kosong": "empty", "foto": "photo", "dua-adegan": "two-scenes", "kertas": "paper",
          "terang": "light", "teks": "text"}


def _lang():
    v = os.environ.get("MGP_LANG") or os.environ.get("LC_ALL") or os.environ.get("LANG") or ""
    return "id" if v.lower().startswith("id") else "en"


def _catalog():
    lang = _lang()
    p = Path(__file__).resolve().parent / "i18n" / (lang + ".json")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


MSG = _catalog()


def t(key, default, **kw):
    s = MSG.get(key, default)
    try:
        return s.format(**kw)
    except Exception:
        return s


CATEGORIES = {
    "transitions": ("Scene changes: slide, whip pan, iris, shutter, glitch, distortion, paper tear, ink, paper fold",
                    "Pergantian adegan: geser, whip pan, iris, rana, glitch, distorsi, kertas robek, tinta, lipat kertas"),
    "text": ("Kinetic typography and text effects: rising words, typewriter, letter scramble, highlighter, variable, particles",
             "Tipografi kinetik dan efek teks: kata naik, mesin ketik, acak huruf, stabilo, variabel, partikel"),
    "titles": ("Title cards and closing calls to action", "Kartu judul dan ajakan penutup"),
    "logos": ("Logo intros and outros, wordmarks, logo walls", "Pembuka dan penutup logo, wordmark, dinding logo"),
    "labels": ("Name and role lower thirds, news ticker, camera HUD", "Lower third nama dan peran, ticker berita, HUD kamera"),
    "subtitles": ("Subtitle styles from timed words: highlight, karaoke, neon, stomp, emoji",
                  "Gaya subtitle dari kata berwaktu: sorot, karaoke, neon, hentak, emoji"),
    "accents": ("Small emphasis: spring pop, checkmark, confetti, light sweep, drawn line, annotation",
                "Penekanan kecil: pop pegas, centang, konfeti, sapuan cahaya, garis tergambar, anotasi"),
    "data": ("Numbers and charts: counter, bars, line, bar race, progress ring",
             "Angka dan grafik: hitung naik, batang, garis, balapan batang, cincin progres"),
    "maps": ("Illustrative maps: region grid, route, flow arcs, bubbles, globe",
             "Peta ilustratif: kisi wilayah, rute, busur alir, gelembung, globe"),
    "camera": ("Camera moves on a scene: push, float, shake, focus, dolly zoom",
               "Gerak kamera pada adegan: dorong, melayang, goyang, fokus, dolly zoom"),
    "textures": ("Look overlays: grain, vignette, CRT, halftone, dither, stop motion, flare",
                 "Overlay tampilan: grain, vignette, CRT, halftone, dither, stop motion, flare"),
    "backgrounds": ("Moving backgrounds: aurora, mesh gradient, plasma, stars, snow, orb",
                    "Latar bergerak: aurora, gradien mesh, plasma, bintang, salju, orb"),
    "ui": ("Product demos and interface mockups: cursor, gestures, notifications, chat, devices",
           "Demo produk dan tiruan antarmuka: kursor, gestur, notifikasi, obrolan, perangkat"),
    "social": ("Generic social media cards: post, follow, comment, testimonial",
               "Kartu media sosial generik: postingan, ikuti, komentar, testimoni"),
    "code": ("Code and terminal: typing, diff, line highlight, morph", "Kode dan terminal: mengetik, diff, sorot baris, morph"),
    "gallery": ("Image carousels and media grids", "Korsel gambar dan kisi media"),
    "hands": ("Handwriting and whiteboard style: written title, arrow, circle, flowchart",
              "Gaya tulisan tangan dan papan tulis: judul tertulis, panah, lingkaran, diagram alur"),
    "3d": ("2.5D/3D objects: product spin, exploded stack, glass", "Objek 2.5D/3D: putar produk, tumpukan meledak, kaca"),
    "paper": ("Paper and origami: freeze-frame dressing, folded crane, Miura-ori, Yoshimura, Kresling",
              "Kertas dan origami: dandan beku-bingkai, bangau lipat, Miura-ori, Yoshimura, Kresling"),
    "characters": ("Characters: walking, objects with faces, lip-sync presenter", "Tokoh: berjalan, benda berwajah, presenter lip-sync"),
    "packs": ("Motion pack scenes straight from an id", "Adegan paket motion langsung dari id"),
}

# --------------------------------------------------------------------------- example backgrounds
BG_CSS = """
.adegan{position:absolute;inset:0;overflow:hidden}
.ad-judul{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font:900 calc(var(--s)*150px)/1 "Inter",system-ui,sans-serif;letter-spacing:-.02em}
.ad-sub{position:absolute;left:0;right:0;top:calc(50% + var(--s)*110px);text-align:center;font:500 calc(var(--s)*40px)/1.2 "Inter",system-ui,sans-serif;opacity:.75;letter-spacing:.2em;text-transform:uppercase}
.ad-a{background:radial-gradient(120% 90% at 30% 20%,#ffb347 0%,#e8553d 45%,#5a1f3a 100%);color:#fff7ea}
.ad-b{background:radial-gradient(120% 90% at 70% 30%,#7ee0d6 0%,#2d6cdf 50%,#10233f 100%);color:#f2fbff}
.ad-gelap{background:radial-gradient(110% 80% at 50% 35%,#2b2f45 0%,#12131c 70%);color:#f5f3ee}
.ad-terang{background:linear-gradient(160deg,#f7f3ea 0%,#e9e2d3 100%);color:#1d1b18}
.ad-kertas{background:#efe6d2;color:#2a2420}
.ad-kertas::after{content:"";position:absolute;inset:0;opacity:.35;background-image:radial-gradient(rgba(90,60,30,.25) 1px,transparent 1.4px);background-size:7px 7px}
.ad-foto{background:linear-gradient(180deg,#8fc3e8 0%,#f6d7b0 58%,#d98c5f 59%,#7a4b3a 100%)}
.ad-foto .mth{position:absolute;width:calc(var(--s)*260px);height:calc(var(--s)*260px);border-radius:50%;left:62%;top:22%;background:radial-gradient(circle,#fff6d8 0%,#ffd27a 60%,rgba(255,210,122,0) 72%)}
.ad-foto .bk1{position:absolute;left:-10%;right:-10%;bottom:28%;height:30%;background:#5f7f6a;border-radius:50% 50% 0 0/100% 100% 0 0}
.ad-foto .bk2{position:absolute;left:30%;right:-30%;bottom:20%;height:34%;background:#3f5f52;border-radius:50% 50% 0 0/100% 100% 0 0}
.ad-foto .tanah{position:absolute;left:0;right:0;bottom:0;height:24%;background:linear-gradient(180deg,#2f463d,#1f2e29)}
.ad-foto .sosok{position:absolute;left:40%;bottom:18%;width:calc(var(--s)*120px);height:calc(var(--s)*330px);background:#18201d;border-radius:calc(var(--s)*60px) calc(var(--s)*60px) calc(var(--s)*14px) calc(var(--s)*14px)}
.ad-foto .sosok::before{content:"";position:absolute;left:18%;top:-26%;width:64%;height:26%;border-radius:50%;background:#18201d}
.ad-ui{background:#eef1f6;color:#1b2333;font-family:"Inter",system-ui,sans-serif}
.ad-ui .bar{position:absolute;left:0;right:0;top:0;height:7%;background:#fff;border-bottom:1px solid #d9dee8}
.ad-ui .side{position:absolute;left:0;top:7%;bottom:0;width:18%;background:#f7f8fb;border-right:1px solid #d9dee8}
.ad-ui .kartu{position:absolute;background:#fff;border-radius:calc(var(--s)*18px);box-shadow:0 calc(var(--s)*6px) calc(var(--s)*24px) rgba(20,30,60,.08)}
.ad-ui .tombol{position:absolute;background:#2d6cdf;color:#fff;border-radius:calc(var(--s)*12px);font:600 calc(var(--s)*30px)/1 "Inter",sans-serif;display:flex;align-items:center;justify-content:center}
"""


def bg_html(kind, P):
    """Example background. The sample scene text stays as it was (Indonesian), so example renders keep their pixels."""
    kind = OLD_BG.get(kind, kind)
    if kind == "empty":
        return ""
    if kind == "two-scenes":
        return ('<div id="adegan-a" class="adegan ad-a"><div class="ad-judul">ADEGAN A</div><div class="ad-sub">sebelum transisi</div></div>\n'
                '<div id="adegan-b" class="adegan ad-b"><div class="ad-judul">ADEGAN B</div><div class="ad-sub">sesudah transisi</div></div>')
    if kind == "photo":
        return ('<div id="adegan" class="adegan ad-foto"><div class="mth"></div><div class="bk1"></div><div class="bk2"></div>'
                '<div class="tanah"></div><div class="sosok"></div></div>')
    if kind == "ui":
        return ('<div id="adegan" class="adegan ad-ui"><div class="bar"></div><div class="side"></div>'
                '<div class="kartu" style="left:22%;top:12%;width:36%;height:38%"></div>'
                '<div class="kartu" style="left:61%;top:12%;width:35%;height:38%"></div>'
                '<div class="kartu" style="left:22%;top:54%;width:74%;height:40%"></div>'
                '<div id="tombol-contoh" class="tombol" style="left:74%;top:40%;width:18%;height:7%">Simpan</div></div>')
    if kind == "text":
        return '<div id="adegan" class="adegan ad-gelap"><div id="judul-contoh" class="ad-judul">Gerak bercerita</div><div class="ad-sub">contoh komposisi</div></div>'
    cls = {"dark": "ad-gelap", "light": "ad-terang", "paper": "ad-kertas"}.get(kind, "ad-gelap")
    return f'<div id="adegan" class="adegan {cls}"></div>'


def normalise(meta):
    """block.json with old Indonesian keys -> current keys (readers accept both; build.py writes nothing back)."""
    m = {OLD_KEYS.get(k, k): v for k, v in meta.items()}
    props = {}
    for k, v in (m.get("props") or {}).items():
        props[k] = {OLD_PROP_KEYS.get(a, a): b for a, b in v.items()} if isinstance(v, dict) else v
    m["props"] = props
    ex = m.get("example") or {}
    m["example"] = {OLD_EXAMPLE_KEYS.get(k, k): v for k, v in ex.items()}
    return m


def mount_props(snippet, new_props, uid, start, duration):
    """Replace __ID__, refill the props JSON, set data-start/duration on the root tag."""
    s = snippet.replace("__ID__", uid)
    m = re.search(r"(<script[^>]*data-blo(?:ck|k)-props[^>]*>)(.*?)(</script>)", s, re.S)
    if m:
        try:
            cur = json.loads(m.group(2))
        except Exception as e:
            raise ValueError(t("props_json", "props JSON in block.html is invalid: {e}", e=e))
        cur.update(new_props or {})
        js = json.dumps(cur, ensure_ascii=False)
        s = s[:m.start(2)] + "\n" + js + "\n" + s[m.end(2):]
    first = re.search(r"<div[^>]*data-composition-id=\"" + re.escape(uid) + r"\"[^>]*>", s)
    if first:
        tag = first.group(0)
        t2 = re.sub(r'data-start="[^"]*"', f'data-start="{start:g}"', tag)
        t2 = re.sub(r'data-duration="[^"]*"', f'data-duration="{duration:g}"', t2)
        s = s.replace(tag, t2, 1)
    return s


def build_example(d, meta, snippet):
    c = meta.get("example", {})
    aspect = c.get("aspect") or (meta["aspect"][0] if meta.get("aspect") else "16:9")
    W, H = ASPECT.get(aspect, (1920, 1080))
    start = float(c.get("start", 0))
    dblock = float(c.get("block_duration", meta["duration"]))
    total = float(c.get("duration", round(start + dblock + 0.5, 2)))
    uid = "blk-" + meta["id"].split("/")[-1]
    snip = mount_props(snippet, c.get("props"), uid, start, dblock)
    deps = ""
    for dep in meta.get("dependencies", []):
        if dep.startswith("lib:"):
            deps += f'<script src="../../../../motion-graphics/lib/dist/{dep[4:]}"></script>\n'
    fonts = c.get("font", ["Inter:wght@400;500;600;700;800;900"])
    fl = "".join(f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={f.replace(" ", "+")}&display=block">\n' for f in fonts)
    s = min(W, H) / 1080
    return f"""<!doctype html>
<html lang="id" data-block-preview>
<head>
<meta charset="utf-8">
<meta name="mgp:size" content="{W}x{H}">
<title>{meta['name']} · block example {meta['id']}</title>
<!-- Built by blocks/tools/build.py from block.html + block.json. Animation: mgp.motion (motion-graphics/lib/motion), GSAP-compatible API. -->
{fl}<script src="{MOTION}"></script>
<script src="../../_core/block-core.js"></script>
{deps}<style>
html,body{{margin:0;background:#000}}
#stage{{position:relative;width:{W}px;height:{H}px;overflow:hidden;--s:{s:g};font-family:"Inter",system-ui,sans-serif}}
{BG_CSS}
</style>
</head>
<body>
<div id="stage" data-composition-id="example" data-width="{W}" data-height="{H}" data-duration="{total:g}">
{bg_html(c.get("bg", "dark"), c)}
{snip.strip()}
</div>
<script>
  window.__duration = {total:g};
  window.__timelines = window.__timelines || {{}};
  window.__timelines["example"] = gsap.timeline({{ paused: true }}).set({{}}, {{}}, {total:g});
</script>
</body>
</html>
"""


def check_meta(d, meta):
    err = [k for k in REQUIRED if k not in meta]
    exp = f"{d.parent.name}/{d.name}"
    if meta.get("id") != exp:
        err.append(t("id_must", "id must be '{exp}'", exp=exp))
    if meta.get("category") != d.parent.name:
        err.append(t("cat_folder", "category != folder name"))
    if not isinstance(meta.get("description"), dict) or not {"id", "en"} <= set(meta.get("description", {})):
        err.append(t("desc", "description must be {{id, en}}"))
    return err


def aliases_table(metas):
    """Compact alias table for block-core.js:
    {ids: {old id: new id}, p: {old prop: new} (shared), v: {old value: new} (shared),
     blocks: {id: {p: {...exceptions}, v: {prop: {...exceptions}}, e: [enum props with old values]}}}"""
    from collections import Counter, defaultdict
    ids, pc, vc = {}, defaultdict(Counter), defaultdict(Counter)
    for m in metas:
        for a in m.get("aliases", []):
            if a != m["id"] and "/" in a:  # old category/name ids only (registry names are for the CLI)
                ids[a] = m["id"]
        for k, spec in m["props"].items():
            if isinstance(spec, dict):
                for a in spec.get("aliases", []):
                    pc[a][k] += 1
                for a, n in (spec.get("option_aliases") or {}).items():
                    vc[a][n] += 1
    P = {a: c.most_common(1)[0][0] for a, c in pc.items()}
    V = {a: c.most_common(1)[0][0] for a, c in vc.items()}
    blocks = {}
    for m in metas:
        p, v, e = {}, {}, []
        for k, spec in m["props"].items():
            if not isinstance(spec, dict):
                continue
            for a in spec.get("aliases", []):
                if P.get(a) != k:
                    p[a] = k
            oa = spec.get("option_aliases") or {}
            if oa:
                e.append(k)
                ex = {a: n for a, n in oa.items() if V.get(a) != n}
                if ex:
                    v[k] = ex
        if p or v or e:
            blocks[m["id"]] = {k: x for k, x in (("p", p), ("v", v), ("e", e)) if x}
    return {"ids": ids, "p": P, "v": V, "blocks": blocks}


def write_aliases(table):
    core = BLOCKS / "_core" / "block-core.js"
    src = core.read_text(encoding="utf-8")
    a = src.index("/* aliases:start")
    a = src.index("*/", a) + 2
    b = src.index("  /* aliases:end */")
    js = "\n  B.aliases = " + json.dumps(table, ensure_ascii=False, separators=(",", ":")) + ";\n"
    new = src[:a] + js + src[b:]
    if new != src:
        core.write_text(new, encoding="utf-8", newline="\n")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check_only = "--check" in sys.argv or "--cek" in sys.argv
    catalog, errors, metas = [], 0, []
    lang = _lang()
    files = sorted(set(BLOCKS.glob("*/*/block.json")) | set(BLOCKS.glob("*/*/blok.json")))
    for bj in files:
        d = bj.parent
        if d.parent.name.startswith(("_", ".")) or d.parent.name == "tools":
            continue
        if bj.name == "blok.json" and (d / "block.json").exists():
            continue
        try:
            meta = normalise(json.loads(bj.read_text(encoding="utf-8")))
        except Exception as e:
            print(f"{t('ERROR', 'ERROR')} {d.relative_to(BLOCKS)}: {bj.name} {e}"); errors += 1; continue
        e = check_meta(d, meta)
        html = d / "block.html" if (d / "block.html").exists() else d / "blok.html"
        if not html.exists():
            e.append(t("no_html", "block.html missing"))
        if e:
            print(f"{t('ERROR', 'ERROR')} {d.relative_to(BLOCKS)}: " + "; ".join(e)); errors += 1; continue
        snippet = html.read_text(encoding="utf-8")
        if "__ID__" not in snippet:
            print(f"{t('ERROR', 'ERROR')} {meta['id']}: " + t("no_id", "block.html has no __ID__")); errors += 1; continue
        metas.append(meta)
        picked = not args or d.parent.name in args or meta["id"] in args
        if picked and not check_only and not meta.get("example_manual"):
            (d / "example.html").write_text(build_example(d, meta, snippet), encoding="utf-8", newline="\n")
        catalog.append({
            "id": meta["id"], "name": meta["name"], "name_id": meta.get("name_id", meta["name"]), "category": meta["category"],
            "description": meta["description"], "tags": meta.get("tags", []),
            "duration": meta["duration"], "aspect": meta["aspect"],
            "props": {k: (v.get("default") if isinstance(v, dict) else v) for k, v in meta["props"].items()},
            "prop_aliases": {a: k for k, v in meta["props"].items() if isinstance(v, dict) for a in v.get("aliases", [])},
            "dependencies": meta.get("dependencies", []), "aliases": meta.get("aliases", []),
            "path": f"{meta['category']}/{d.name}/",
        })
    cats = {}
    for b in catalog:
        cats[b["category"]] = cats.get(b["category"], 0) + 1
    out = {"version": "2.0", "count": len(catalog), "categories": dict(sorted(cats.items())),
           "category_aliases": {"aksen": "accents", "galeri": "gallery", "judul": "titles", "kamera": "camera",
                                "kertas": "paper", "kode": "code", "label": "labels", "latar": "backgrounds",
                                "logo": "logos", "paket": "packs", "peta": "maps", "sosial": "social",
                                "subtitle": "subtitles", "tangan": "hands", "teks": "text", "tekstur": "textures",
                                "tokoh": "characters", "transisi": "transitions"},
           "blocks": catalog}
    if not check_only and not args:
        write_aliases(aliases_table(metas))
        rd = BLOCKS / "README.md"
        if rd.exists():
            txt = rd.read_text(encoding="utf-8")
            a, b = "<!-- categories:start -->", "<!-- categories:end -->"
            if a in txt and b in txt:
                rows = ["| Category | Blocks | Contents |", "|---|---:|---|"]
                rows += [f"| `{k}` | {v} | {CATEGORIES.get(k, ('', ''))[0]} |" for k, v in sorted(cats.items())]
                rows.append(f"| **Total** | **{len(catalog)}** | |")
                txt = txt[:txt.index(a) + len(a)] + "\n" + "\n".join(rows) + "\n" + txt[txt.index(b):]
                rd.write_text(txt, encoding="utf-8", newline="\n")
        (BLOCKS / "catalog.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    print(t("summary", "{n} blocks, {e} errors", n=len(catalog), e=errors) + " · " + ", ".join(f"{k} {v}" for k, v in sorted(cats.items())))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
