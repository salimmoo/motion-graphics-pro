// dotLottie (.lottie): a zip holding manifest.json + animations/<id>.json, deflate-compressed.
// Lossless and usually 8-15x smaller than raw Lottie JSON (dotLottie players, LottieFiles, ...).
// Written by hand (minimal zip: no zip64, no encryption); only node:zlib.
import zlib from "node:zlib";
import { L } from "./i18n.mjs";

let TABLE = null;
function crc32(buf) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buf) >>> 0;
  if (!TABLE) { TABLE = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TABLE[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** files: [{name, data: Buffer}] (old key `nama` still read) -> zip Buffer (deflate). */
export function zip(files) {
  const local = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name ?? f.nama, "utf8"), body = zlib.deflateRawSync(f.data, { level: 9 }), crc = crc32(f.data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); // time 00:00, date 1980-01-01 (deterministic)
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(f.data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    local.push(h, name, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12); c.writeUInt16LE(0x21, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(f.data.length, 24);
    c.writeUInt16LE(name.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, name);
    off += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...local, cd, e]);
}

/** zip Buffer -> Map(name -> Buffer). Reads the central directory (stored or deflate). */
export function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error(L`not a valid zip/.lottie file`);
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const out = new Map();
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(L`corrupt zip directory`);
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), kl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nl);
    const start = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28);
    const raw = buf.subarray(start, start + csize);
    out.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nl + xl + kl;
  }
  return out;
}

/** Lottie JSON (text) -> .lottie Buffer */
export function toDotLottie(json, id = "anim") {
  const manifest = { version: "1", generator: "mgp (Motion Graphics Pro)", animations: [{ id }] };
  return zip([{ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest)) }, { name: `animations/${id}.json`, data: Buffer.from(json) }]);
}

/** file content (Buffer) -> Lottie JSON text; accepts plain .json or .lottie (first animation in the manifest). */
export function readLottie(buf) {
  if (buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50) {
    const f = unzip(buf);
    let id = null;
    try { id = JSON.parse(f.get("manifest.json").toString("utf8")).animations[0].id; } catch { /* no manifest */ }
    const name = (id && [...f.keys()].find((k) => k === `animations/${id}.json`)) || [...f.keys()].find((k) => /^animations\/.+\.json$/.test(k)) || [...f.keys()].find((k) => k.endsWith(".json") && k !== "manifest.json");
    if (!name) throw new Error(L`.lottie without animations/*.json`);
    return f.get(name).toString("utf8");
  }
  return buf.toString("utf8");
}

/** Old names (v2.3 / v2.4-dev). */
export { toDotLottie as keDotLottie, readLottie as bacaLottie };
