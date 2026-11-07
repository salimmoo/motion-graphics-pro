// mgp contact: a contact sheet of n frames in one PNG/JPEG.
import fs from "node:fs";
import path from "node:path";
import { openSession, resolveTiming, fmtT } from "./session.mjs";
import { capture } from "./browser.mjs";
import { L } from "./i18n.mjs";

export async function contact(comp, o) {
  // --times 0,1.2,2.4 (seconds) or --times poses (key poses from project.json): the blocking stage
  let list = null, fromPoses = false;
  if (o.times) {
    if (/^(poses|kunci|proyek|project)$/i.test(o.times)) {
      fromPoses = true;
      const pm = await import("./project.mjs");
      const findProject = pm.findProject || pm.cariProyek, readProject = pm.readProject || pm.bacaProyek;
      const keyPoseTimes = pm.keyPoseTimes || pm.waktuKunci;
      const pj = findProject(comp);
      if (!pj) throw new Error(L`--times poses: project.json not found in the composition folder`);
      list = keyPoseTimes(readProject(pj));
      if (!list.length) throw new Error(L`--times poses: project.json has no scenes[].poses yet`);
    } else list = String(o.times).split(/[,;\s]+/).filter(Boolean).map(Number);
    if (list.some((x) => !Number.isFinite(x))) throw new Error(L`--times: invalid list of seconds: ${o.times}`);
  }
  const n = list ? list.length : Math.max(1, +(o.n || 12));
  const out = path.resolve(o.o || o.out || "contact.png");
  const session = await openSession(comp, o);
  try {
    const s = await session.open();
    const tm = resolveTiming(s.info, o);
    const span = tm.to - tm.from, f = 1 / tm.fps;
    // Key poses: the FIRST render frame at or after the pose time (ceil to the 1/fps grid). A render only
    // takes t = i/fps; a pose off the grid (e.g. 13.1 s at 24 fps) rounded down would capture the frame
    // before the pose is reached (the previous pose). A plain list of seconds still goes to the nearest frame.
    const times = list ? list.map((t) => (fromPoses ? Math.ceil(t * tm.fps - 1e-6) : Math.round(t / f)) * f) : Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? tm.from + span / 2 : tm.from + (i * (span - f)) / (n - 1);
      return Math.round(t / f) * f;
    });
    if (fromPoses && !o.quiet) {
      const moved = list.map((t, i) => [t, times[i]]).filter(([a, b]) => Math.abs(a - b) > 1e-6);
      if (moved.length) process.stderr.write(L`key poses off the 1/${tm.fps} s grid, the next frame is taken: ${moved.map(([a, b]) => `${a} -> ${b.toFixed(3)} s (f${Math.round(b * tm.fps)})`).join(", ")}` + "\n");
    }
    const shots = [];
    for (const t of times) shots.push({ t, src: "data:image/jpeg;base64," + (await capture(s, t, { format: "jpeg", quality: 85 })).toString("base64") });

    const { width: W, height: H } = s.info;
    const cols = +(o.cols || (W < H ? Math.min(n, 6) : Math.min(n, 4)));
    const cellW = +(o.width || (W < H ? 300 : 440)), cellH = Math.round((cellW * H) / W);
    const rows = Math.ceil(n / cols);
    const pad = 14, label = 26, head = 44;
    const pw = cols * cellW + (cols + 1) * pad, ph = head + rows * (cellH + label + pad) + pad;
    const page = await session.browser.newPage({ viewport: { width: pw, height: ph }, deviceScaleFactor: 1 });
    const name = path.basename(session.c.file);
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#16161a;font:13px/1.2 system-ui,Segoe UI,Arial,sans-serif;color:#ddd">
      <div style="height:${head}px;display:flex;align-items:center;padding:0 ${pad}px;gap:14px">
        <b style="font-size:15px;color:#fff">${name}</b><span>${W}x${H} · ${tm.fps} fps · ${fmtT(tm.duration)} · ${n} frame</span></div>
      <div style="display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:${pad}px;padding:0 ${pad}px ${pad}px">
      ${shots.map((x, i) => `<div><img src="${x.src}" style="display:block;width:${cellW}px;height:${cellH}px;background:#000">
        <div style="height:${label}px;display:flex;align-items:center;justify-content:space-between;color:#aaa">
        <span>#${i + 1}</span><span style="font-variant-numeric:tabular-nums">${x.t.toFixed(2)} s · f${Math.round(x.t * tm.fps)}</span></div></div>`).join("")}
      </div></body></html>`, { waitUntil: "load" });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, type: /\.jpe?g$/i.test(out) ? "jpeg" : "png", fullPage: true });
    // fully black frames are reported (P1: sheets came out black without any message): intended (before a scene,
    // after a block ends) or not (a lost GPU canvas, a scene that never shows)
    const black = await page.evaluate(() => [...document.images].map((im) => {
      const c = document.createElement("canvas"); c.width = c.height = 24;
      const g = c.getContext("2d"); g.drawImage(im, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data; let mx = 0;
      for (let k = 0; k < d.length; k += 4) mx = Math.max(mx, d[k], d[k + 1], d[k + 2]);
      return mx < 8;
    })).catch(() => []);
    await page.close();
    const blackList = times.map((t, i) => [i, t]).filter(([i]) => black[i]);
    if (blackList.length) process.stderr.write(L`warning: ${blackList.length} of ${n} frames are fully black: ${blackList.map(([i, t]) => `#${i + 1} (${t.toFixed(2)} s)`).join(", ")}. Intended (before a scene, after a block) or not (a scene that never shows, a lost GPU canvas)? Check with mgp frame --t <s>.` + "\n");
    if (!o.quiet) process.stderr.write(L`contact sheet of ${n} frames → ${out}` + "\n");
    return { out, times, black: blackList.map(([, t]) => t) };
  } finally { await session.close(); }
}

/** Old name (v2.3 / v2.4-dev). */
export { contact as kontak };
