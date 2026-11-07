// mgp audit: one quality report for a project (T9 style) -> review/audit.md + review/audit.json.
//   mgp audit <project-folder|composition.html> [--json] [--platform tiktok|reels|shorts|youtube|feed]
//             [--skip curves,vo,...] [--quiet]
// Criteria (PASS / WARN / ERROR each, then an overall verdict):
//   check      mgp check: script errors, blocks that do not move, text layout
//   curves     mgp curves: linear motion, pops, abrupt starts/stops, squash without constant volume
//   safe       text inside the safe zone of the project aspect ratio + platform (references: brief-concept 2.0, typography 7.2)
//   vo         voice-over score (normalised WER) with CHECK BY EAR spots, when the project has a VO
//   loudness   integrated loudness / true peak of the master against the platform target
//   project    project.json consistency: missing files, duration mismatches, gates not approved
//   assets     provenance and licence fields of every asset
// Sub-steps run the mgp CLI itself (--json), one at a time (light load; the VO score is forced to CPU).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { L } from "./i18n.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MGP = path.join(HERE, "..", "bin", "mgp.mjs");
const say = (o, s) => { if (!o.quiet) process.stderr.write(s + "\n"); };

/* ------------------------------------------------------------------ platform targets */
// Safe zones from references/brief-concept 2.0 (frame decision) and typography 7.2 (fractions of width/height).
// box = [left, top, right, bottom] edges of the area where text and faces belong.
const ZONES = {
  "9:16": { tiktok: { box: [0.06, 168 / 1920, 0.84, 1330 / 1920], note: "words in the 168-1330 px band (of 1920), clear of the right-hand buttons" },
    reels: { box: [0.06, 168 / 1920, 0.84, 1330 / 1920], note: "words in the 168-1330 px band (of 1920), clear of the right-hand buttons" },
    shorts: { box: [0.06, 168 / 1920, 0.84, 1330 / 1920], note: "words in the 168-1330 px band (of 1920), clear of the right-hand buttons" },
    default: { box: [0.06, 0.09, 0.94, 0.80], note: "top 9% empty, bottom 20% free of text" } },
  "16:9": { default: { box: [0.05, 0.05, 0.95, 0.95], note: "text inside the central 90% (title safe)" } },
  "1:1": { default: { box: [0.06, 0.06, 0.94, 0.94], note: "6% margin on every side" } },
  "4:5": { default: { box: [0.06, 0.06 + 0.0625, 0.94, 0.94 - 0.0625], note: "6% margin; the grid preview crops to the central 3:4, keep titles off the top/bottom edge" } },
  "21:9": { default: { box: [0.10, 0.10, 0.90, 0.90], note: "text inside the central 80%" } },
};
// master loudness target (references/audio.md: -14 LUFS, master true peak -1.5 dBTP); the audit allows +-1 LU and a peak up to -1.0 dB (WARN above, ERROR above 0)
const LOUD = { lufs: -14, tol: 1, tp: -1.0 };
const PLATFORMS = ["tiktok", "reels", "shorts", "youtube", "feed"];

function ratioOf(w, h) {
  const r = w / h, list = [["9:16", 9 / 16], ["16:9", 16 / 9], ["1:1", 1], ["4:5", 4 / 5], ["21:9", 21 / 9]];
  let best = list[0]; for (const x of list) if (Math.abs(x[1] - r) < Math.abs(best[1] - r)) best = x;
  return Math.abs(best[1] - r) < 0.03 ? best[0] : null;
}

/* ------------------------------------------------------------------ project.json (old proyek.json keys accepted) */
const pick = (o, ...k) => { for (const x of k) if (o && o[x] != null) return o[x]; return undefined; };
function readProject(dir) {
  for (const n of ["project.json", "proyek.json"]) {
    const f = path.join(dir, n);
    if (fs.existsSync(f)) {
      try { return { file: f, old: n === "proyek.json", data: JSON.parse(fs.readFileSync(f, "utf8")) }; }
      catch (e) { return { file: f, old: n === "proyek.json", error: e.message }; }
    }
  }
  return null;
}
function normProject(p) {
  const meta = pick(p, "meta") || {};
  const voice = pick(p, "voice", "suara") || {};
  return {
    title: pick(meta, "title", "judul"), aspect: pick(meta, "aspect", "rasio"), width: pick(meta, "width", "lebar"),
    height: pick(meta, "height", "tinggi"), fps: pick(meta, "fps"), duration: pick(meta, "duration", "durasi"),
    stage: pick(meta, "stage", "tahap"), gate: pick(meta, "gate", "gerbang"),
    composition: pick(p, "composition", "komposisi"),
    vo: (pick(voice, "vo") || []).map((v) => ({ id: v.id, file: v.file, script: pick(v, "script", "naskah"), words: pick(v, "words", "kata"),
      letters: pick(v, "letters", "huruf"), start: pick(v, "start", "mulai") })),
    voiceSource: pick(voice, "source", "sumber"), voiceProfile: pick(voice, "profile", "profil"),
    scenes: (pick(p, "scenes", "adegan") || []).map((s) => ({ id: s.id, start: pick(s, "start", "mulai"), duration: pick(s, "duration", "durasi"),
      status: s.status, poses: pick(s, "poses", "kunci"), composition: pick(s, "composition", "komposisi") })),
    blocks: (pick(p, "blocks", "blok") || []).map((b) => ({ id: b.id, scene: pick(b, "scene", "adegan"), start: pick(b, "start", "mulai") })),
    assets: (pick(p, "assets", "aset") || []).map((a) => ({ file: a.file, source: pick(a, "source", "sumber"), provider: pick(a, "provider", "penyedia"),
      model: a.model, seed: a.seed, license: pick(a, "license", "lisensi"), notes: pick(a, "notes", "catatan"), raw: pick(a, "raw", "mentah") })),
    output: pick(p, "output", "keluaran"),
  };
}

/* ------------------------------------------------------------------ helpers */
function runMgp(args, o, extraEnv = {}) {
  const r = spawnSync(process.execPath, [MGP, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: { ...process.env, ...extraEnv } });
  let json = null;
  const out = (r.stdout || "").trim();
  if (out) { const i = out.indexOf("{"); if (i >= 0) { try { json = JSON.parse(out.slice(i)); } catch { /* not JSON */ } } }
  return { code: r.status, json, stderr: (r.stderr || "").trim(), stdout: out };
}
const exists = (root, f) => !!f && fs.existsSync(path.resolve(root, f));
const fmt = (x, d = 2) => (x == null || Number.isNaN(+x) ? "?" : (+x).toFixed(d));

/* ------------------------------------------------------------------ criteria */
function critCheck(comp, o) {
  const r = runMgp(["check", comp, "--json", "--quiet"], o);
  const h = r.json;
  if (!h) return { status: "ERROR", summary: L`mgp check did not run: ${(r.stderr || "").split("\n").slice(-1)[0]}`, details: [] };
  const errors = h.errors || h.galat || [], warnings = h.warnings || h.peringatan || [];
  const status = errors.length ? "ERROR" : warnings.length ? "WARN" : "PASS";
  return { status, summary: L`${errors.length} errors, ${warnings.length} warnings`, details: [...errors.map((x) => "ERROR " + x), ...warnings.map((x) => "WARN " + x)], info: h.info };
}

function critCurves(comp, o) {
  const r = runMgp(["curves", comp, "--json", "--quiet", "--max", "8"], o);
  const h = r.json;
  if (!h) return { status: "WARN", summary: L`mgp curves did not run: ${(r.stderr || "").split("\n").slice(-1)[0]}`, details: [] };
  const els = h.elements || h.elemen || [];
  const found = [];
  for (const e of els) for (const f of e.findings || e.temuan || []) found.push({ el: e.label || e.name || "?", kind: f.kind || f.jenis, t0: f.t0, t1: f.t1, note: f.note || f.ket });
  const KIND = { linier: "linear", patah: "pop", mendadak: "abrupt", volume: "volume" };
  const count = {};
  for (const f of found) { const k = KIND[f.kind] || f.kind; count[k] = (count[k] || 0) + 1; }
  const status = found.length ? "WARN" : "PASS";
  const summary = found.length ? L`${els.length} elements; findings: ${Object.entries(count).map(([k, n]) => k + " " + n).join(", ")}` : L`${els.length} elements, no linear motion, pops, abrupt starts/stops or volume errors`;
  return { status, summary, details: found.slice(0, 12).map((f) => `${KIND[f.kind] || f.kind} ${f.el} ${fmt(f.t0)}-${fmt(f.t1)} s: ${f.note || ""}`), counts: count };
}

async function critSafe(comp, o, info, platform) {
  const W = info && info.width, H = info && info.height, D = info && info.duration;
  const ratio = W && H ? ratioOf(W, H) : null;
  if (!ratio || !ZONES[ratio]) return { status: "WARN", summary: L`no safe-zone table for ${W}x${H}`, details: [] };
  const z = ZONES[ratio][platform] || ZONES[ratio].default;
  const { openSession } = await import("./session.mjs");
  const { seekPage } = await import("./browser.mjs");
  const sesi = await openSession(comp, { quiet: true, timeout: o.timeout });
  const hits = [];
  let samples = 0;
  try {
    const s = await sesi.open();
    const n = Math.max(6, Math.min(40, Math.round((D || 6) * 1.5)));
    for (let i = 0; i < n; i++) {
      const t = ((D || 1) * (i + 0.5)) / n;
      await seekPage(s, t); // with the step time limit (--timeout / MGP_TIMEOUT)
      const boxes = await s.page.evaluate(([bx]) => {
        const vw = window.innerWidth, vh = window.innerHeight, out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        // The text itself, not the block box: a 1080 px wide centred title only has glyphs in its middle (P2 iklan-105:
        // "173 px out" for a centred word). Range rects = the line boxes of the glyph runs (after transforms), united
        // per element over all its own text nodes.
        const ink = new Map(), range = document.createRange();
        for (let nd = walker.nextNode(); nd; nd = walker.nextNode()) {
          const tx = nd.nodeValue.replace(/\s+/g, " ").trim();
          const el = nd.parentElement;
          if (!tx || !el || el.closest("script,style,[data-layout-ignore],#mgp-captions,#rekam-teks")) continue;
          let e = ink.get(el);
          if (e === null) continue;
          if (!e) {
            const cs = getComputedStyle(el);
            let op = 1; for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const v = parseFloat(getComputedStyle(p).opacity); if (!isNaN(v)) op *= v; if (op < 0.2) break; }
            if (cs.visibility === "hidden" || cs.display === "none" || op < 0.2) { ink.set(el, null); continue; }
            e = { text: "", l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
            ink.set(el, e);
          }
          if (!e.text) e.text = tx;
          range.selectNodeContents(nd);
          for (const q of range.getClientRects()) {
            if (q.width < 0.5 || q.height < 0.5) continue;
            e.l = Math.min(e.l, q.left); e.t = Math.min(e.t, q.top); e.r = Math.max(e.r, q.right); e.b = Math.max(e.b, q.bottom);
          }
        }
        for (const [el, e] of ink) {
          if (!e || !Number.isFinite(e.l)) continue;
          const txt = e.text;
          const r = { left: e.l, top: e.t, right: e.r, bottom: e.b, width: e.r - e.l, height: e.b - e.t };
          if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) continue;
          const L = bx[0] * vw, T = bx[1] * vh, R = bx[2] * vw, B = bx[3] * vh;
          const outPx = Math.max(L - r.left, T - r.top, r.right - R, r.bottom - B, 0);
          if (outPx > 2) out.push({ text: txt.slice(0, 40), px: Math.round(outPx), sel: el.id ? "#" + el.id : el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/)[0] : el.tagName.toLowerCase() });
        }
        return out;
      }, [z.box]);
      samples++;
      for (const b of boxes) hits.push({ t, ...b });
    }
  } finally { await sesi.close(); }
  const uniq = new Map();
  for (const h of hits) { const k = h.sel + "|" + h.text; if (!uniq.has(k)) uniq.set(k, { ...h, n: 0, t1: h.t }); const u = uniq.get(k); u.n++; u.t1 = h.t; }
  const list = [...uniq.values()].filter((u) => u.n >= 2 || u.px > 40); // one sample at the edge = moving in/out
  const status = list.length ? "WARN" : "PASS";
  const summary = list.length ? L`${list.length} text elements outside the ${ratio} safe zone (${platform || "default"}: ${L([z.note])})` : L`${samples} samples: all text inside the ${ratio} safe zone (${platform || "default"}: ${L([z.note])})`;
  return { status, summary, details: list.slice(0, 12).map((u) => `${u.sel} "${u.text}" ${u.px} px out, ${fmt(u.t)}-${fmt(u.t1)} s`), ratio, zone: z };
}

function critVo(root, P, o) {
  if (!P || !P.vo.length) return { status: "PASS", summary: L`no voice-over in project.json (nothing to score)`, details: [], skipped: true };
  const v = P.vo[0];
  if (!exists(root, v.file)) return { status: "ERROR", summary: L`VO file missing: ${v.file}`, details: [] };
  // an existing score next to the review (newer than the VO) is reused; otherwise mgp voice score runs on the CPU
  const voFile = path.resolve(root, v.file);
  const cands = ["review/vo_score.json", "review/vo-score.json", "review/nilai_vo.json"].map((f) => path.join(root, f)).filter((f) => fs.existsSync(f));
  let r = null, from = null;
  if (o["reuse-score"] !== false) for (const f of cands) if (fs.statSync(f).mtimeMs >= fs.statSync(voFile).mtimeMs) { try { r = JSON.parse(fs.readFileSync(f, "utf8")); from = path.relative(root, f); break; } catch { /* broken */ } }
  if (!r && !o.fast) {
    const args = ["voice", "score", voFile, "--json", "--quiet"];
    if (v.script && exists(root, v.script)) args.push("--script", path.resolve(root, v.script));
    if (v.words && exists(root, v.words)) args.push("--words", path.resolve(root, v.words));
    const x = runMgp(args, o, { MGP_DEVICE: "cpu" });
    r = x.json; from = "mgp voice score";
    if (!r) return { status: "WARN", summary: L`VO score not available (${(x.stderr || "").split("\n").slice(-1)[0] || "voice engine not installed"}); listen through the whole VO`, details: [] };
  }
  if (!r) return { status: "WARN", summary: L`VO not scored (--fast and no saved score); listen through the whole VO`, details: [] };
  const wer = pick(r, "werNormal", "wer_normal", "wer"), ear = r.checkByEar || r.cekTelinga || [];
  const details = ear.map((c) => {
    const t = c.start != null ? `${fmt(c.start)}${c.end != null ? "-" + fmt(c.end) : ""} s` : "?";
    const heard = pick(c, "heard", "dengar"), said = pick(c, "script", "naskah");
    return L`CHECK BY EAR ${t}${c.sentence || c.kalimat ? " " + L`sentence ${c.sentence || c.kalimat}` : ""}: "${said || ""}" heard as "${heard || ""}"`;
  });
  const normal = pick(r, "werNormal", "wer_normal") != null;
  const status = wer == null ? "WARN" : wer > 0.15 ? "ERROR" : ear.length || !normal ? "WARN" : "PASS";
  const sim = pick(r, "similarityRef", "similarity", "miripRef");
  const summary = L`WER ${normal ? L`normalised` : L`raw`} ${wer == null ? "?" : (100 * wer).toFixed(1) + "%"}${sim != null ? L`, speaker similarity ${sim}` : ""}; ${ear.length} CHECK BY EAR spot(s) (source: ${from})`;
  return { status, summary, details };
}

function critLoud(root, P, comp, o) {
  const cand = [P && P.output, "out/" + path.basename(root) + ".mp4", "assets/audio/mix.wav", P && P.vo[0] && P.vo[0].file].filter(Boolean);
  const files = [];
  for (const c of cand) { const f = typeof c === "string" ? c : c.file || c.video; if (f && exists(root, f)) files.push(path.resolve(root, f)); }
  const outs = fs.existsSync(path.join(root, "out")) ? fs.readdirSync(path.join(root, "out")).filter((f) => /\.(mp4|mov|webm|wav)$/i.test(f)) : [];
  for (const f of outs) files.push(path.join(root, "out", f));
  if (!files.length) return { status: "WARN", summary: L`no master to measure (render out/*.mp4 or assets/audio/mix.wav first)`, details: [] };
  // first candidate that has an audio track (a silent render cannot be measured)
  let m = null, file = null;
  for (const f of [...new Set(files)]) {
    const r = runMgp(["audio", "measure", f, "--json", "--quiet"], o);
    if (r.json && r.json.lufs != null) { m = r.json; file = f; break; }
  }
  if (!m) return { status: "WARN", summary: L`no audio track to measure in ${files.map((f) => path.relative(root, f)).join(", ")}`, details: [] };
  const peak = pick(m, "truePeak", "peak", "puncak");
  const off = Math.abs(m.lufs - LOUD.lufs);
  const status = (peak != null && peak > 0) || off > 3 ? "ERROR" : off > LOUD.tol || (peak != null && peak > LOUD.tp) ? "WARN" : "PASS";
  return { status, summary: L`${path.relative(root, file)}: ${fmt(m.lufs, 1)} LUFS (target ${LOUD.lufs} ±${LOUD.tol}), peak ${fmt(peak, 1)} dB (max ${LOUD.tp}), LRA ${fmt(m.lra, 1)} LU`, details: [] };
}

function critProject(root, Praw, P, info) {
  const d = [];
  let worst = "PASS";
  const bump = (s, msg) => { d.push(s + " " + msg); if (s === "ERROR" || (s === "WARN" && worst === "PASS")) worst = s; };
  if (!Praw) return { status: "WARN", summary: L`no project.json (open projects with mgp new)`, details: [] };
  if (Praw.error) return { status: "ERROR", summary: L`project.json is not valid JSON: ${Praw.error}`, details: [] };
  if (Praw.old) bump("WARN", L`old file name proyek.json (still read; mgp writes project.json)`);
  if (P.composition && !exists(root, P.composition)) bump("ERROR", L`composition missing: ${P.composition}`);
  for (const v of P.vo) for (const k of ["file", "script", "words", "letters"]) if (v[k] && !exists(root, v[k])) bump("ERROR", L`VO ${v.id || ""} ${k} missing: ${v[k]}`);
  for (const a of P.assets) if (a.file && !exists(root, a.file)) bump("ERROR", L`asset missing: ${a.file}`);
  for (const s of P.scenes) if (s.composition && !exists(root, s.composition)) bump("ERROR", L`scene ${s.id} composition missing: ${s.composition}`);
  // durations
  const D = info && info.duration;
  if (P.duration != null && D != null && Math.abs(P.duration - D) > 0.05) bump("WARN", L`meta.duration ${fmt(P.duration)} s but the composition is ${fmt(D)} s`);
  if (P.scenes.length && P.duration != null) {
    const end = Math.max(...P.scenes.map((s) => (+s.start || 0) + (+s.duration || 0)));
    if (Math.abs(end - P.duration) > 0.05) bump("WARN", L`scenes end at ${fmt(end)} s, meta.duration is ${fmt(P.duration)} s`);
    for (let i = 1; i < P.scenes.length; i++) {
      const a = P.scenes[i - 1], b = P.scenes[i];
      const gap = (+b.start || 0) - ((+a.start || 0) + (+a.duration || 0));
      if (Math.abs(gap) > 0.05) bump("WARN", L`scene ${b.id} starts ${fmt(gap)} s ${gap > 0 ? L`after` : L`before`} the end of ${a.id}`);
    }
  }
  if (info && P.width && P.height && (P.width !== info.width || P.height !== info.height)) bump("WARN", L`meta size ${P.width}x${P.height} but the composition is ${info.width}x${info.height}`);
  if (info && P.fps && info.fps && +P.fps !== +info.fps) bump("WARN", L`meta.fps ${P.fps} but the composition declares ${info.fps}`);
  // gates (G1 concept ... G5 render); stage "9 Render" needs G5
  const stage = parseInt(String(P.stage || "").match(/\d+/)?.[0] || "0", 10);
  const gate = String(P.gate || "");
  const gn = parseInt(gate.match(/G(\d)/i)?.[1] || "0", 10);
  const gs = gateState(gate);
  const need = stage >= 9 ? 5 : stage >= 8 ? 4 : stage >= 5 ? 3 : stage >= 4 ? 2 : stage >= 3 ? 1 : 0;
  if (!gate) bump("WARN", L`no gate recorded in meta.gate`);
  else if (need && (gn < need || (gn === need && gs === "open"))) bump("WARN", L`stage ${stage} needs gate G${need} approved; meta.gate says "${gate}"`);
  else if (need && gn === need && gs !== "approved") bump("WARN", L`meta.gate "${gate}" has no status word: write e.g. "G${need} approved" or "G${need} disetujui" (approved: ${GATE_OK.join(", ")}; still open: ${GATE_OPEN.join(", ")})`);
  const open = P.scenes.filter((s) => s.status && !/terkunci|locked|done|selesai/i.test(s.status));
  if (stage >= 9 && open.length) bump("WARN", L`stage 9 but scenes not locked: ${open.map((s) => s.id + " (" + s.status + ")").join(", ")}`);
  return { status: worst, summary: d.length ? L`${d.length} finding(s)` : L`files present, durations consistent, gates approved (${gate || "-"})`, details: d };
}

// Gate status words in meta.gate ("G4 approved", "G4 disetujui (peninjau)"), English and Indonesian; documented in
// references/project.md. An open word wins ("G4 not approved", "G4 belum disetujui" = open). A later gate number than
// the stage needs counts as passed for that stage.
export const GATE_OK = ["approved", "passed", "pass", "done", "ok", "okay", "accepted", "signed off", "locked", "complete", "completed",
  "disetujui", "setuju", "lolos", "lulus", "selesai", "beres", "oke", "acc", "diterima", "terkunci", "✓", "✔"];
export const GATE_OPEN = ["pending", "waiting", "open", "todo", "to do", "draft", "rejected", "not approved", "not passed", "revise", "revision",
  "changes requested", "on hold", "menunggu", "belum", "ditolak", "revisi", "tunda", "ditunda", "dalam proses"];
const gateWord = (w) => {
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return /^[\p{L}\p{N}]/u.test(w) ? new RegExp("(?<![\\p{L}\\p{N}])" + esc + "(?![\\p{L}\\p{N}])", "iu") : new RegExp(esc, "u");
};
/** "approved" | "open" | "unknown" for the text of meta.gate. */
export function gateState(gate) {
  const g = String(gate || "");
  if (GATE_OPEN.some((w) => gateWord(w).test(g))) return "open";
  if (GATE_OK.some((w) => gateWord(w).test(g))) return "approved";
  return "unknown";
}

function critAssets(root, P) {
  if (!P) return { status: "WARN", summary: L`no project.json: asset provenance unknown`, details: [] };
  const d = []; let worst = "PASS";
  const bump = (s, msg) => { d.push(s + " " + msg); if (s === "ERROR" || (s === "WARN" && worst === "PASS")) worst = s; };
  const listed = new Set(P.assets.map((a) => path.normalize(a.file || "")));
  for (const a of P.assets) {
    if (!a.source) bump("WARN", L`${a.file}: no source`);
    if (!a.license) bump("WARN", L`${a.file}: no licence`);
    if (/gambar|image|higgsfield|ai|flux|cloud/i.test(String(a.source || "") + String(a.provider || "")) && !a.model && !a.provider) bump("WARN", L`${a.file}: generated asset without model/provider`);
  }
  // media under assets/ that project.json does not list (fonts, js, data and the VO/SFX files of voice/sfx are exempt)
  const voFiles = new Set(P.vo.flatMap((v) => [v.file, v.words, v.letters]).filter(Boolean).map((f) => path.normalize(f)));
  const unlisted = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name), rel = path.normalize(path.relative(root, f));
      if (e.isDirectory()) { if (!/^(fonts|js|data|var)$/i.test(e.name)) walk(f); continue; }
      if (!/\.(png|jpe?g|webp|gif|svg|mp4|webm|mov|mp3|m4a|ogg)$/i.test(e.name)) continue;
      if (/[\\/]raw[\\/]/.test(rel)) continue; // raw = source of a listed piece
      if (!listed.has(rel) && !voFiles.has(rel)) unlisted.push(rel);
    }
  };
  walk(path.join(root, "assets"));
  if (unlisted.length) bump("WARN", L`${unlisted.length} media file(s) in assets/ without a project.json entry (no provenance): ${unlisted.slice(0, 6).join(", ")}${unlisted.length > 6 ? ", ..." : ""}`);
  return { status: worst, summary: L`${P.assets.length} listed assets; ${d.length} finding(s)`, details: d };
}

/* ------------------------------------------------------------------ report */
const NAMES = () => ({
  check: L`Composition check (script errors, frozen blocks, layout)`, curves: L`Motion curves (linear / pops / squash volume)`,
  safe: L`Safe zones for the aspect ratio and platform`, vo: L`VO score (CHECK BY EAR)`, loudness: L`Loudness vs the platform target`,
  project: L`project.json consistency (files, durations, gates)`, assets: L`Asset provenance and licence`,
});
const HOW = { check: "mgp check --json", curves: "mgp curves --json", safe: "text boxes sampled per second", vo: "mgp voice score (CPU)",
  loudness: "mgp audio measure", project: "project.json + composition info", assets: "project.json assets[] + assets/ folder" };

function markdown(rep) {
  const N = NAMES();
  const lines = [`# ${L`Audit`} · ${rep.title || path.basename(rep.root)}`, "",
    `${L`Composition`}: \`${path.relative(rep.root, rep.composition) || rep.composition}\` · ${rep.info ? `${rep.info.width}x${rep.info.height} · ${rep.info.fps || "?"} fps · ${fmt(rep.info.duration)} s` : ""} · ${L`platform`}: ${rep.platform || L`default`} · ${rep.date}`, "",
    `**${L`Verdict`}: ${L([rep.verdict])}**`, "",
    `| No | ${L`Criterion`} | ${L`Result`} | ${L`Details`} | ${L`How`} |`, "|---|---|---|---|---|"];
  rep.criteria.forEach((c, i) => lines.push(`| ${i + 1} | ${N[c.id]} | ${L([c.status])} | ${String(c.summary).replace(/\|/g, "\\|")} | \`${HOW[c.id]}\` |`));
  for (const c of rep.criteria) if (c.details && c.details.length) {
    lines.push("", `## ${N[c.id]}`, "");
    for (const d of c.details) lines.push("- " + String(d).replace(/\n/g, " "));
  }
  lines.push("", L`Generated by mgp audit. PASS = no finding; WARN = review by eye/ear before the gate; ERROR = fix before rendering or delivering.`, "");
  return lines.join("\n");
}

export async function audit(target, o = {}) {
  if (!target) throw new Error(L`usage: mgp audit <project-folder|composition.html> [--json] [--platform tiktok|reels|shorts|youtube|feed]`);
  let t = path.resolve(target), root, comp;
  if (fs.existsSync(t) && fs.statSync(t).isDirectory()) { root = t; }
  else { root = path.dirname(t); comp = t; }
  const Praw = readProject(root);
  const P = Praw && !Praw.error ? normProject(Praw.data) : null;
  if (!comp) comp = path.join(root, (P && P.composition) || "index.html");
  if (!fs.existsSync(comp)) throw new Error(L`composition not found: ${comp}`);
  const platform = o.platform ? String(o.platform).toLowerCase() : null;
  if (platform && !PLATFORMS.includes(platform)) throw new Error(L`unknown --platform "${platform}" (${PLATFORMS.join(", ")})`);
  const skip = new Set(String(o.skip || "").split(",").map((s) => s.trim()).filter(Boolean));
  const crit = [];
  const run = async (id, fn) => {
    if (skip.has(id)) { crit.push({ id, status: "WARN", summary: L`skipped (--skip ${id})`, details: [] }); return null; }
    say(o, L`audit: ${id} ...`);
    try { const r = await fn(); crit.push({ id, ...r }); return r; }
    catch (e) { crit.push({ id, status: "ERROR", summary: String(e && e.message || e).split("\n")[0], details: [] }); return null; }
  };
  const c1 = await run("check", () => critCheck(comp, o));
  const info = c1 && c1.info;
  await run("curves", () => critCurves(comp, o));
  await run("safe", () => critSafe(comp, o, info, platform === "feed" ? null : platform));
  await run("vo", () => critVo(root, P, o));
  await run("loudness", () => critLoud(root, P, comp, o));
  await run("project", () => critProject(root, Praw, P, info));
  await run("assets", () => critAssets(root, P));
  const verdict = crit.some((c) => c.status === "ERROR") ? "ERROR" : crit.some((c) => c.status === "WARN") ? "WARN" : "PASS";
  const rep = { tool: "mgp audit", version: 1, date: new Date().toISOString().slice(0, 10), root, composition: comp, title: P && P.title,
    platform, info: info || null, verdict, criteria: crit.map(({ info: _i, ...c }) => c) };
  const dir = path.join(root, "review");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "audit.json"), JSON.stringify(rep, null, 2));
  fs.writeFileSync(path.join(dir, "audit.md"), markdown(rep));
  rep.files = [path.join(dir, "audit.md"), path.join(dir, "audit.json")];
  return rep;
}

export function printAudit(rep) {
  const N = NAMES();
  const out = [L`mgp audit: ${rep.root}`];
  for (const c of rep.criteria) {
    out.push(`  ${L([c.status]).padEnd(6)} ${N[c.id]}: ${c.summary}`);
    for (const d of (c.details || []).slice(0, 4)) out.push("         - " + d);
    if ((c.details || []).length > 4) out.push("         - " + L`... ${c.details.length - 4} more in review/audit.md`);
  }
  out.push(L`verdict: ${L([rep.verdict])} · written ${rep.files.map((f) => path.relative(rep.root, f)).join(", ")}`);
  return out.join("\n");
}

export async function cli(argv) {
  let a;
  try {
    a = parseArgs({ args: argv, allowPositionals: true, options: {
      json: { type: "boolean" }, platform: { type: "string" }, skip: { type: "string" }, fast: { type: "boolean" },
      quiet: { type: "boolean" }, help: { type: "boolean", short: "h" } } });
  } catch (e) { console.error("mgp audit: " + e.message); process.exitCode = 2; return; }
  const o = a.values;
  if (o.help || !a.positionals[0]) {
    console.log(L`mgp audit <project-folder|composition.html> [--json] [--platform tiktok|reels|shorts|youtube|feed] [--skip curves,vo] [--fast]
  Runs check, curves, safe zones, VO score (CHECK BY EAR), loudness, project.json consistency and asset licences,
  gives PASS / WARN / ERROR per criterion plus a verdict, and writes review/audit.md + review/audit.json.
  --fast   do not run the VO score (reuse a saved score only)`);
    return;
  }
  const rep = await audit(a.positionals[0], o);
  console.log(o.json ? JSON.stringify(rep, null, 2) : printAudit(rep));
  process.exitCode = rep.verdict === "ERROR" ? 1 : 0;
}
