// Classify page logs (CDP) into script errors vs warnings; used by render/frame/contact/check.
//   script errors : uncaught exceptions (pageerror), and console.error from blocks/runtime
//                   ("[block] ..." / old "[blok] ..." = a block's mount function threw,
//                    "[mgp] ..." / old "[rekam] ..." = a sub-composition failed to load)
//   warnings      : other console.error, failed network requests, HTTP >= 400
// Script errors make `mgp render` fail (unless --ignore-errors); warnings are only printed.
import { L } from "./i18n.mjs";

const BLOCK_RT = /^\[(block|blok|mgp|rekam)\]/;

/** logs: [{type, text}] from session.logs. Returns { script: [unique texts], other: [unique texts] }. */
export function classifyLogs(logs = []) {
  const script = [], other = [], seen = new Set();
  for (const l of logs) {
    const key = l.type + "|" + l.text;
    if (seen.has(key)) continue;
    seen.add(key);
    if (l.type === "pageerror") script.push(L`script error: ${l.text}`);
    else if (l.type === "error" && BLOCK_RT.test(l.text)) script.push(L`error ${l.text}`);
    else if (l.type === "error" && !/Failed to load resource/.test(l.text)) other.push(L`console: ${l.text}`);
    else if (l.type === "requestfailed" && !/ERR_ABORTED|ERR_CANCELED|ERR_CACHE_MISS/i.test(l.text)) other.push(L`request failed: ${l.text}`);
    else if (l.type.startsWith("http") && l.type !== "http206" && l.type !== "http416") other.push(L`asset ${l.type.slice(4)}: ${l.text}`);
  }
  return { script, other };
}

/** Shorten long error texts (stacks) so the report stays readable. */
export function summarizeErrors(list, max = 8) {
  const out = list.slice(0, max).map((s) => "  - " + (s.length > 400 ? s.slice(0, 397) + "..." : s));
  if (list.length > max) out.push("  - " + L`... and ${list.length - max} more (mgp check <composition> lists them all)`);
  return out.join("\n");
}

/** Old names (v2.3 / v2.4-dev): golongkanLog returned { skrip, lain }. */
export function golongkanLog(logs = []) {
  const r = classifyLogs(logs);
  return { skrip: r.script, lain: r.other, script: r.script, other: r.other };
}
export { summarizeErrors as ringkasGalat };
