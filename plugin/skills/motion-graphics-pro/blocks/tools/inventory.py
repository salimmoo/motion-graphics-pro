#!/usr/bin/env python3
"""
inventory.py · writes blocks/INVENTORY.md: every HyperFrames registry item -> our block.

    python blocks/tools/inventory.py

Sources: tools/legacy-items.json (name + kind of the old HyperFrames items), the "aliases" field of every
block.json, and packs/packs.json (items used by the 104 motion packs). Python standard library only.
"""
import json
import re
from collections import Counter
from pathlib import Path

BLOCKS = Path(__file__).resolve().parent.parent
PACKS = BLOCKS.parent / "packs" / "packs.json"


def main():
    hf = json.loads((BLOCKS / "tools" / "legacy-items.json").read_text(encoding="utf-8"))["items"]
    blocks, alias, lib = {}, {}, {}
    for bj in sorted(BLOCKS.glob("*/*/block.json")):
        m = json.loads(bj.read_text(encoding="utf-8"))
        blocks[m["id"]] = m
        for h in m.get("aliases", []):
            if "/" not in h:
                alias.setdefault(h, m["id"])
        if any(d.startswith("lib:") for d in m.get("dependencies", [])):
            src = (bj.parent / "block.html").read_text(encoding="utf-8")
            lib[m["id"]] = sorted(set(re.findall(r"MGP\.([a-zA-Z0-9]+)\.", src)))
    used = Counter()
    if PACKS.exists():
        for p in json.loads(PACKS.read_text(encoding="utf-8"))["paket"]:
            for items in p["reg"].values():
                for it in items:
                    used[it.get("hf") or it["name"]] += 1

    def note(bid):
        return ("wraps lib module " + ", ".join("`MGP." + x + "`" for x in lib[bid])) if lib.get(bid) else ""

    covered = [i for i in hf if i["name"] in alias]
    pack_items = list(used)
    pack_cov = [n for n in pack_items if n in alias]
    per_cat = Counter(m["category"] for m in blocks.values())
    old_hf = lambda m: [a for a in m.get("aliases", []) if "/" not in a]

    L = ["# Inventory: HyperFrames registry -> Motion Graphics Pro blocks\n",
         "Built by `blocks/tools/inventory.py`. Every HyperFrames 0.9.5 registry item (block, component, example) maps to one of our blocks. "
         "The blocks are written from scratch; only the effect idea and the item name come from HyperFrames (see NOTICE). "
         "One block often covers several items through props (`mode`, `style`, `direction`, `shape`, variants).\n",
         "## Summary\n",
         f"- Blocks: **{len(blocks)}** in {len(per_cat)} categories ({', '.join(f'{k} {v}' for k, v in sorted(per_cat.items()))})",
         f"- HyperFrames items covered: **{len(covered)}/{len(hf)}** ({100 * len(covered) / len(hf):.1f}%)"]
    if pack_items:
        L.append(f"- Items used by the 104 motion packs: **{len(pack_cov)}/{len(pack_items)}** covered ({100 * len(pack_cov) / len(pack_items):.1f}%)")
    L.append(f"- Extra blocks without a HyperFrames counterpart: {sum(1 for m in blocks.values() if not old_hf(m))}")
    L.append("\nAdd: `mgp add <block> --into index.html`. HyperFrames item names and old Indonesian ids are accepted too "
             "(`mgp add push-in`, `mgp add transisi/robek`).\n")
    L.append("## Per HyperFrames item\n")
    L.append("| HyperFrames item | Kind | Used by packs | Our block | Notes |")
    L.append("|---|---|---:|---|---|")
    for i in sorted(hf, key=lambda x: x["name"]):
        bid = alias.get(i["name"])
        L.append(f"| `{i['name']}` | {i['kind']} | {used.get(i['name'], '') or ''} | {('`' + bid + '`') if bid else '**missing**'} | {note(bid) if bid else ''} |")
    L.append("\n## Per block\n")
    L.append("| Block | Name | Old id | HyperFrames items covered |")
    L.append("|---|---|---|---|")
    for bid, m in sorted(blocks.items()):
        hs = ", ".join(f"`{h}`" for h in old_hf(m)) or "(extra)"
        olds = ", ".join(f"`{h}`" for h in m.get("aliases", []) if "/" in h)
        extra = (" · " + note(bid)) if note(bid) else ""
        L.append(f"| `{bid}` | {m['name']} | {olds} | {hs}{extra} |")
    missing = [i["name"] for i in hf if i["name"] not in alias]
    if missing:
        L.append("\n## Not covered yet\n")
        L.append(", ".join(f"`{b}`" for b in missing))
    (BLOCKS / "INVENTORY.md").write_text("\n".join(L) + "\n", encoding="utf-8", newline="\n")
    print(f"INVENTORY.md: {len(blocks)} blocks, HF {len(covered)}/{len(hf)}, packs {len(pack_cov)}/{len(pack_items)}")


if __name__ == "__main__":
    main()
