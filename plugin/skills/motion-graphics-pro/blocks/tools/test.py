#!/usr/bin/env python3
"""
test.py · automatic block test: example.html loads without errors, seeks at 3 times,
is deterministic (same time -> same pixels, from any seek direction), then a contact sheet.

    python blocks/tools/test.py --out test_results/                     # every block
    python blocks/tools/test.py transitions text --out test_results/    # some categories
    python blocks/tools/test.py transitions/slide --out test_results/   # one block (old ids work too)

Needs: pip install playwright pillow (no browser download: the installed Chrome/Edge is used).
The mgp runtime (render/src/runtime.js) is injected, as during a render. GSAP from a CDN
is served by mgp.motion (motion-graphics/lib/motion/motion.js), as in mgp; --gsap <dist folder>
(or env MGP_BLOCK_GSAP, old BLOK_GSAP) uses a real GSAP you installed yourself.
"""
import argparse
import hashlib
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

BLOK = Path(__file__).resolve().parent.parent
RENDER = BLOK.parent / "render"
OLD_IDS = {}
for _bj in BLOK.glob("*/*/block.json"):
    _m = json.loads(_bj.read_text(encoding="utf-8"))
    for _a in _m.get("aliases", []):
        OLD_IDS[_a] = _m["id"]
BROWSER = [
    os.environ.get("MGP_BROWSER") or os.environ.get("REKAM_BROWSER", ""),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium",
]
ARGS = ["--allow-file-access-from-files", "--hide-scrollbars", "--force-color-profile=srgb",
        "--font-render-hinting=none", "--disable-lcd-text", "--disable-gpu-rasterization",
        "--disable-accelerated-2d-canvas", "--run-all-compositor-stages-before-draw",
        "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"]


GERAK = BLOK.parent.parent / "motion-graphics/lib/motion/motion.js"


def cari_gsap(arg):
    for p in [arg, os.environ.get("MGP_BLOCK_GSAP") or os.environ.get("BLOK_GSAP")]:
        if p and Path(p, "gsap.min.js").exists():
            return Path(p)
    return None


def uji_satu(job):
    from playwright.sync_api import sync_playwright
    contoh, gsapdir, keluar, browser_path = job
    rel = contoh.parent.relative_to(BLOK).as_posix()
    hasil = {"id": rel, "ok": False, "galat": [], "peringatan": [], "hash": {}}
    runtime = (RENDER / "src/runtime.js").read_text(encoding="utf-8")
    html = contoh.read_text(encoding="utf-8")
    import re
    m = re.search(r'name="(?:mgp|rekam):size" content="(\d+)x(\d+)"', html)
    W, H = (int(m.group(1)), int(m.group(2))) if m else (1920, 1080)
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=browser_path, headless=True, args=ARGS)
        pg = br.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        def konsol(msg):
            if msg.type != "error":
                return
            # kegagalan muat sumber dilaporkan lewat requestfailed (font = peringatan, lainnya = galat)
            if msg.text.startswith("Failed to load resource: net::"):
                hasil["peringatan"].append("console: " + msg.text)
            else:
                hasil["galat"].append("console: " + msg.text)
        pg.on("console", konsol)
        pg.on("pageerror", lambda e: hasil["galat"].append("pageerror: " + str(e)))

        def gagal(req):
            u = req.url
            if "fonts.g" in u:
                hasil["peringatan"].append("font gagal: " + u[:90])
            else:
                hasil["galat"].append("gagal memuat: " + u[:140])
        pg.on("requestfailed", gagal)

        def rute(route):
            u = route.request.url
            if u.startswith("file:") or "fonts.googleapis.com" in u or "fonts.gstatic.com" in u:
                return route.continue_()
            name = u.rsplit("/", 1)[-1]
            if "gsap" in u and gsapdir and (gsapdir / name).exists():
                return route.fulfill(path=str(gsapdir / name), content_type="text/javascript")
            if "gsap" in u and name.endswith(".js"):
                return route.fulfill(path=str(GERAK), content_type="text/javascript")
            hasil["galat"].append("akses jaringan terlarang: " + u[:140])
            return route.abort()
        pg.route("**/*", rute)
        pg.add_init_script(runtime)
        try:
            pg.goto(contoh.as_uri(), wait_until="load", timeout=60000)
            inf = pg.evaluate("(window.__mgpRuntime && window.__mgpRuntime.ready) ? window.__mgpRuntime.ready({wait: 8000}) : window.__rekam.siap({tunggu: 8000})")
            D = inf.get("duration") or 0
            hasil["durasi"] = D
            hasil["driver"] = inf.get("driver")
            if inf.get("missingTimelines"):
                hasil["galat"].append("timeline tidak terdaftar: " + ",".join(inf["missingTimelines"]))
            if not D:
                hasil["galat"].append("durasi tidak terbaca")
                D = 4
            ts = [round(D * f, 3) for f in (0.25, 0.5, 0.85)]
            clip = {"x": 0, "y": 0, "width": W, "height": H}
            shots = {}
            for t in ts:
                pg.evaluate(f"(window.__mgpRuntime || window.__rekam).seek({t})")
                b = pg.screenshot(clip=clip)
                shots[t] = b
                hasil["hash"][str(t)] = hashlib.sha1(b).hexdigest()[:12]
            # seek balik dari arah lain
            for t in reversed(ts):
                pg.evaluate(f"(window.__mgpRuntime || window.__rekam).seek({D * 0.97})")
                pg.evaluate(f"(window.__mgpRuntime || window.__rekam).seek({t})")
                h2 = hashlib.sha1(pg.screenshot(clip=clip)).hexdigest()[:12]
                if h2 != hasil["hash"][str(t)]:
                    hasil["galat"].append(f"tidak deterministik di t={t}")
            from PIL import Image, ImageStat
            import io
            ims = [Image.open(io.BytesIO(shots[t])).convert("RGB") for t in ts]
            if len({hasil["hash"][str(t)] for t in ts}) == 1:
                hasil["peringatan"].append("tiga frame identik (tidak ada gerak?)")
            st = ImageStat.Stat(ims[1].resize((64, 64)))
            if max(st.stddev) < 2:
                hasil["peringatan"].append("frame tengah polos")
            if keluar:
                o = Path(keluar) / "frame"
                o.mkdir(parents=True, exist_ok=True)
                strip = Image.new("RGB", (3 * 400, round(400 * H / W)))
                for i, im in enumerate(ims):
                    strip.paste(im.resize((400, round(400 * H / W))), (i * 400, 0))
                strip.save(o / (rel.replace("/", "__") + ".png"))
        except Exception as e:
            hasil["galat"].append("pengecualian: " + str(e)[:300])
        br.close()
    hasil["ok"] = not hasil["galat"]
    return hasil


def lembar_kontak(keluar, hasil):
    from PIL import Image, ImageDraw, ImageFont
    o = Path(keluar)
    per_kat = {}
    for h in hasil:
        per_kat.setdefault(h["id"].split("/")[0], []).append(h)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
    for kat, items in per_kat.items():
        cols, cw = 3, 1200
        rows = []
        for h in items:
            f = o / "frame" / (h["id"].replace("/", "__") + ".png")
            if not f.exists():
                continue
            im = Image.open(f)
            sc = cw / im.width
            im = im.resize((cw, round(im.height * sc)))
            rows.append((h, im))
        if not rows:
            continue
        tot_h = sum(im.height + 34 for _, im in rows)
        sheet = Image.new("RGB", (cw * 1, tot_h), (24, 24, 28))
        y = 0
        dr = ImageDraw.Draw(sheet)
        for h, im in rows:
            dr.text((8, y + 7), ("OK  " if h["ok"] else "ERROR  ") + h["id"] + "   t = 25% / 50% / 85%", fill=(240, 240, 240) if h["ok"] else (255, 90, 90), font=font)
            sheet.paste(im, (0, y + 34))
            y += im.height + 34
        sheet.save(o / f"contact_{kat}.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pilih", nargs="*")
    ap.add_argument("--out", "--keluar", dest="keluar", default=None)
    ap.add_argument("--gsap", default=None)
    ap.add_argument("--workers", "--proses", dest="proses", type=int, default=2)
    a = ap.parse_args()
    gsapdir = cari_gsap(a.gsap)
    if not gsapdir and not GERAK.exists():
        sys.exit("motion.js not found / tidak ditemukan: " + str(GERAK))
    bp = next((p for p in BROWSER if p and Path(p).exists()), None)
    if not bp:
        sys.exit("Chrome/Edge not found / tidak ditemukan (set MGP_BROWSER)")
    semua = sorted(BLOK.glob("*/*/example.html"))
    a.pilih = [OLD_IDS.get(p, p) for p in a.pilih]
    if a.pilih:
        semua = [c for c in semua if any(c.parent.relative_to(BLOK).as_posix() == p or c.parent.parent.name == p for p in a.pilih)]
    jobs = [(c, gsapdir, a.keluar, bp) for c in semua]
    with ProcessPoolExecutor(max_workers=a.proses) as ex:
        hasil = list(ex.map(uji_satu, jobs))
    # halaman yang gagal dimuat karena jaringan (Google Fonts macet) diulang sekali, lebih pelan
    ulang = [i for i, h in enumerate(hasil) if any("Timeout" in g and "goto" in g for g in h["galat"])]
    if ulang:
        print(f"retrying {len(ulang)} blocks that failed to load (network)...")
        with ProcessPoolExecutor(max_workers=max(1, a.proses // 2)) as ex:
            for i, h in zip(ulang, ex.map(uji_satu, [jobs[i] for i in ulang])):
                hasil[i] = h
    ok = sum(h["ok"] for h in hasil)
    for h in hasil:
        tanda = "OK   " if h["ok"] else "ERROR"
        extra = "; ".join(h["galat"][:3] + h["peringatan"][:2])
        print(f"{tanda} {h['id']:<40} {h.get('durasi', '?')}s {extra}")
    print(f"\n{ok}/{len(hasil)} passed")
    if a.keluar:
        Path(a.keluar).mkdir(parents=True, exist_ok=True)
        Path(a.keluar, "report.json").write_text(json.dumps(hasil, indent=1, ensure_ascii=False), encoding="utf-8")
        lembar_kontak(a.keluar, hasil)
    sys.exit(0 if ok == len(hasil) else 1)


if __name__ == "__main__":
    main()
