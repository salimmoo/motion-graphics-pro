#!/usr/bin/env python3
"""Uji paritas piksel: render komposisi dengan GSAP asli vs Gerak pada beberapa t, lalu bandingkan.

  python lib/motion/test/parity.py --gsap <folder gsap/dist> --keluar <folder> [--pola blok] [--workers 6] berkas.html ...

Tanpa daftar berkas: semua contoh lib/examples, render/examples, render/studio/examples, blocks/**/example.html.
Runtime Rekam (render/src/runtime.js) disuntikkan seperti saat render. Permintaan apa pun yang
memuat "gsap" di URL-nya dilayani dari GSAP asli atau dari gerak.js. Butuh: playwright, pillow, numpy.
"""
import argparse, io, json, os, sys, pathlib, hashlib
from concurrent.futures import ProcessPoolExecutor, as_completed

HERE = pathlib.Path(__file__).resolve().parent
GERAK = HERE.parent / "motion.js"
V22 = HERE.parents[3]
RUNTIME = V22 / "motion-graphics-pro/render/src/runtime.js"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"


def semua():
    out = sorted((V22 / "motion-graphics/lib/examples").glob("*.html"))
    out += sorted((V22 / "motion-graphics-pro/render/examples").glob("*.html"))
    out += [V22 / "motion-graphics-pro/render/examples/compat/index.html"]
    out += sorted((V22 / "motion-graphics-pro/render/studio/examples").glob("*.html"))
    out += sorted((V22 / "motion-graphics-pro/blocks").glob("**/example.html"))
    return [p for p in out if p.exists()]


def render(job):
    comp, mesin, gsapdir, fr = job
    from playwright.sync_api import sync_playwright
    runtime = RUNTIME.read_text(encoding="utf8")
    res = {"comp": str(comp), "mesin": mesin, "galat": [], "frames": {}}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get("REKAM_BROWSER", EDGE), args=["--disable-gpu", "--font-render-hinting=none", "--disable-lcd-text"])
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.on("pageerror", lambda e: res["galat"].append("pageerror: " + str(e)[:200]))
        pg.on("console", lambda m: res["galat"].append("console: " + m.text[:200]) if m.type == "error" else None)

        def rute(route):
            u = route.request.url
            name = u.split("?")[0].rsplit("/", 1)[-1]
            if "gsap" in u.lower() and name.endswith(".js"):
                if mesin == "gerak":
                    return route.fulfill(path=str(GERAK), content_type="text/javascript")
                f = pathlib.Path(gsapdir) / name
                if not f.exists():
                    f = pathlib.Path(gsapdir) / "gsap.min.js"
                return route.fulfill(path=str(f), content_type="text/javascript")
            if u.startswith("file:"):
                return route.continue_()
            return route.abort()
        pg.route("**/*", rute)
        pg.add_init_script(runtime)
        try:
            pg.goto(comp.as_uri(), wait_until="load", timeout=60000)
            inf = pg.evaluate("window.__rekam.siap({tunggu: 8000})")
            W = int(inf.get("width") or 1920); H = int(inf.get("height") or 1080)
            if (W, H) != (1920, 1080):
                pg.set_viewport_size({"width": W, "height": H})
            D = float(inf.get("duration") or 4)
            res["durasi"] = D; res["driver"] = inf.get("driver"); res["size"] = [W, H]
            ts = [0.0] + [round(D * f, 3) for f in fr] + [round(max(0, D - 0.04), 3)]
            for t in ts:
                pg.evaluate(f"window.__rekam.seek({t})")
                res["frames"][str(t)] = pg.screenshot(clip={"x": 0, "y": 0, "width": W, "height": H})
            # determinisme: seek dari arah lain harus memberi piksel sama
            ulang = {}
            for t in reversed(ts[1:-1]):
                pg.evaluate(f"window.__rekam.seek({D * 0.97})")
                pg.evaluate(f"window.__rekam.seek({t})")
                ulang[str(t)] = hashlib.sha1(pg.screenshot(clip={"x": 0, "y": 0, "width": W, "height": H})).hexdigest()
            res["ulang"] = ulang
        except Exception as e:
            res["galat"].append("gagal: " + str(e)[:300])
        b.close()
    return res


def banding(a, b):
    import numpy as np
    from PIL import Image
    A = np.asarray(Image.open(io.BytesIO(a)).convert("RGB")).astype(np.int16)
    B = np.asarray(Image.open(io.BytesIO(b)).convert("RGB")).astype(np.int16)
    if A.shape != B.shape:
        return {"max": 255, "mean": 255.0, "px": 1.0}, None
    d = np.abs(A - B)
    m = d.max(axis=2)
    return {"max": int(m.max()), "mean": round(float(d.mean()), 4), "px": round(float((m > 24).mean()), 6)}, m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="*")
    ap.add_argument("--gsap", required=True)
    ap.add_argument("--keluar", required=True)
    ap.add_argument("--pola", default=None, help="saring path (substring)")
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()
    out = pathlib.Path(a.keluar); out.mkdir(parents=True, exist_ok=True)
    comps = [pathlib.Path(f).resolve() for f in a.files] if a.files else semua()
    if a.pola:
        comps = [c for c in comps if a.pola in str(c).replace("\\", "/")]
    fr = (0.25, 0.5, 0.75)
    jobs = [(c, m, a.gsap, fr) for c in comps for m in ("gsap", "gerak")]
    hasil = {}
    with ProcessPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(render, j): j for j in jobs}
        for f in as_completed(futs):
            r = f.result()
            hasil.setdefault(r["comp"], {})[r["mesin"]] = r
    from PIL import Image
    import numpy as np
    laporan = []
    for comp in sorted(hasil):
        g, k = hasil[comp].get("gsap"), hasil[comp].get("gerak")
        rel = os.path.relpath(comp, V22).replace("\\", "/")
        row = {"comp": rel, "galat_gsap": g["galat"], "galat_gerak": k["galat"], "durasi": g.get("durasi"), "driver": [g.get("driver"), k.get("driver")], "t": {}}
        worst = {"max": 0, "mean": 0.0, "px": 0.0}
        for t, fa in g["frames"].items():
            fb = k["frames"].get(t)
            if fb is None:
                row["t"][t] = "hilang"; continue
            s, m = banding(fa, fb)
            row["t"][t] = s
            for kk in worst: worst[kk] = max(worst[kk], s[kk])
            if s["px"] > 0.0005 and m is not None:
                tag = rel.replace("/", "_").replace(".html", "") + "_t" + t
                Image.open(io.BytesIO(fa)).save(out / (tag + "_gsap.png"))
                Image.open(io.BytesIO(fb)).save(out / (tag + "_gerak.png"))
                Image.fromarray((np.minimum(m * 4, 255)).astype("uint8")).save(out / (tag + "_beda.png"))
        det = []
        for eng, r in (("gsap", g), ("gerak", k)):
            for t, h in (r.get("ulang") or {}).items():
                if h != hashlib.sha1(r["frames"][t]).hexdigest():
                    det.append(f"{eng}@{t}")
        row["tidak_deterministik"] = det
        row["frame_unik"] = len({hashlib.sha1(x).hexdigest() for x in k["frames"].values()})
        row["terburuk"] = worst
        laporan.append(row)
    json.dump(laporan, open(out / "paritas.json", "w", encoding="utf8"), indent=1)
    n_ok = sum(1 for r in laporan if r["terburuk"]["px"] <= 0.0005)
    maxs = [r["terburuk"]["max"] for r in laporan]; means = [r["terburuk"]["mean"] for r in laporan]
    print(f"{len(laporan)} komposisi; identik secara visual (<=0.05% piksel beda>24): {n_ok}")
    print(f"max diff terburuk: {max(maxs) if maxs else 0}; mean diff rata-rata: {sum(means)/max(1,len(means)):.4f}")
    for r in laporan:
        flag = "" if r["terburuk"]["px"] <= 0.0005 else "  <-- BEDA"
        nd = (" nondet:" + ",".join(r["tidak_deterministik"])) if r["tidak_deterministik"] else ""
        ge = (" galat-gerak:" + str(len(r["galat_gerak"]))) if r["galat_gerak"] != r["galat_gsap"] else ""
        print(f'{r["comp"]:70s} max={r["terburuk"]["max"]:3d} mean={r["terburuk"]["mean"]:.4f} px={r["terburuk"]["px"]:.5f}  unik={r["frame_unik"]}{nd}{ge}{flag}')


if __name__ == "__main__":
    main()
