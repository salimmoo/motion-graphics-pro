#!/usr/bin/env python3
"""
update_packs.py · replaces HyperFrames registry references in the motion pack library
with our own blocks (mgp add <id>).

    python blocks/tools/update_packs.py            # rewrite packs/INDEX.md, packs.json, motion-packs.html
    python blocks/tools/update_packs.py --dry-run  # report only (old flag: --kering)

The item name -> block id map comes from the "aliases" field of every blocks/<category>/<name>/block.json.
Idempotent: items that are already mapped (they carry an "hf" field) are read again from "hf".
Python standard library only.
"""
import json
import re
import sys
from pathlib import Path

BLOCKS = Path(__file__).resolve().parent.parent
PACKS = BLOCKS.parent / "packs"
REGISTRY = "Motion Graphics Pro blocks 2.0"


def block_map():
    amap, names = {}, {}
    for bj in sorted(BLOCKS.glob("*/*/block.json")):
        m = json.loads(bj.read_text(encoding="utf-8"))
        names[m["id"]] = m.get("name_id") or m["name"]
        for h in m.get("aliases", []):
            amap.setdefault(h, m["id"])
    return amap, names


def command(ids):
    return "mgp add " + " ".join(ids) + " --into index.html"


def unique(xs):
    out = []
    for x in xs:
        if x not in out:
            out.append(x)
    return out


# slot keys in packs.json (Indonesian) -> slot tags in the English INDEX.md
SLOT_EN = {"gaya": "style", "tulisan": "lettering", "kartu": "card", "subtitle": "subtitles", "aksen": "accent",
           "transisi": "transition", "kamera": "camera", "logo": "logo", "galeri": "gallery", "produk": "product",
           "data": "data", "demo": "demo"}


def main():
    dry = "--dry-run" in sys.argv or "--kering" in sys.argv
    amap, names = block_map()
    pj = PACKS / "packs.json"
    data = json.loads(pj.read_text(encoding="utf-8"))
    missing, per_pack = set(), {}
    for p in data["paket"]:
        order = []
        for slot, items in p["reg"].items():
            new = []
            for it in items:
                hf = it.get("hf") or it["name"]
                bid = amap.get(hf) or amap.get(it["name"])
                if not bid:
                    missing.add(hf)
                    new.append(it)
                    continue
                new.append({"name": bid, "type": "blok", "title": names[bid], "hf": hf})
                order.append(bid)
            p["reg"][slot] = new
        ids = unique(order)
        per_pack[p["id"]] = (ids, p["reg"])
        p["add"] = command(ids)
    data["registry"] = REGISTRY

    md = (PACKS / "INDEX.md").read_text(encoding="utf-8")
    # INDEX.md is English (labels "Blocks"/"Add", English slot tags); the old Indonesian labels
    # ("Blok"/"Pasang") are still recognised and kept when the file still uses them.
    english = "- **Blocks:**" in md or "- **Add:**" in md
    lab_blocks, lab_add = ("Blocks", "Add") if english else ("Blok", "Pasang")
    out, n_add = [], 0
    for sec in re.split(r"(?m)^(?=### )", md):
        m = re.match(r"### .*?\b([A-Z]{3}-\d{2})\b", sec)
        if m and m.group(1) in per_pack:
            ids, reg = per_pack[m.group(1)]
            tag = (lambda s: SLOT_EN.get(s, s)) if english else (lambda s: s)
            listing = ", ".join(f"`{it['name']}` ({tag(slot)})" for slot, its in reg.items() for it in its)
            sec, _ = re.subn(r"(?m)^- \*\*Registry HyperFrames:\*\*.*$|^- \*\*(?:Blok|Blocks):\*\*.*$",
                             f"- **{lab_blocks}:** " + listing.replace("\\", "\\\\"), sec)
            sec, k = re.subn(r"(?m)^- \*\*(?:Pasang|Add):\*\*.*$", f"- **{lab_add}:** `" + command(ids) + "`", sec)
            n_add += k
        out.append(sec)
    md2 = "".join(out)

    html_p = PACKS / "motion-packs.html"
    html, html_done = None, False
    if html_p.exists():
        html = html_p.read_text(encoding="utf-8")
        i = html.find('{"versi":')
        if i >= 0:
            obj, end = json.JSONDecoder().raw_decode(html, i)
            if isinstance(obj, dict) and "paket" in obj:
                html = html[:i] + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + html[end:]
                html_done = True

    print(f"{len(amap)} names mapped to {len(set(amap.values()))} blocks")
    print(f"packs: {len(data['paket'])}, add lines replaced: {n_add}, motion-packs.html: {'yes' if html_done else 'no'}")
    if missing:
        print("NO BLOCK YET for: " + ", ".join(sorted(missing)))
    if not dry:
        pj.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
        (PACKS / "INDEX.md").write_text(md2, encoding="utf-8", newline="\n")
        if html_done:
            html_p.write_text(html, encoding="utf-8", newline="\n")
        (BLOCKS / "tools" / "legacy-name-map.json").write_text(
            json.dumps({k: v for k, v in sorted(amap.items()) if "/" not in k}, ensure_ascii=False, indent=1) + "\n",
            encoding="utf-8", newline="\n")
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
