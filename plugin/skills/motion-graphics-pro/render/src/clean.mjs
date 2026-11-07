// Fix a transcript to its script: the ASR words are aligned to the script words with dynamic
// programming (Needleman-Wunsch-like), so spelling and punctuation follow the script while the
// timing follows the audio. Script words that cannot be heard get time from the gap around them.

/** Comparison form: lower case, no diacritics, no punctuation. */
export function normWord(s) {
  return String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

function lev(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Similarity 0..1 of two normalized words. */
export function similarity(a, b) {
  if (!a && !b) return 1;
  const m = Math.max(a.length, b.length);
  return m ? 1 - lev(a, b) / m : 0;
}

/** Split a script into tokens: stand-alone punctuation is attached to the previous word. */
export function scriptTokens(text) {
  const raw = String(text).replace(/\r/g, "").split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of raw) {
    if (!normWord(t) && out.length) out[out.length - 1] += t;
    else if (normWord(t)) out.push(t);
  }
  return out;
}

const GAP = 0.7;   // cost of a script word without a match, or of a dropped ASR word
const MULTI = 0.1; // small penalty for merge/split; its dissimilarity is counted twice

/**
 * Align. asr = [{text,start,end}], script = string or token array.
 * Returns { words: [{id,text,start,end,origin,asr?}], stats }.
 *   origin: match | respelled | merged | split | inserted
 *   stats:  { script, asr, match, respelled, inserted, dropped, merged, split }
 */
export function fixToScript(asr, script) {
  const S = Array.isArray(script) ? script : scriptTokens(script);
  const A = asr.filter((w) => normWord(w.text));
  const ns = S.map(normWord), na = A.map((w) => normWord(w.text));
  const n = S.length, m = A.length;
  const INF = 1e18;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
  const B = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
  D[0][0] = 0;
  // steps: 1 = 1:1, 2 = insert script word, 3 = drop ASR word, 4 = 1 script : 2 ASR, 5 = 2 script : 1 ASR
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    const d = D[i][j];
    if (d >= INF) continue;
    const up = (ii, jj, c, k) => { if (d + c < D[ii][jj]) { D[ii][jj] = d + c; B[ii][jj] = k; } };
    if (i < n && j < m) up(i + 1, j + 1, 1 - similarity(ns[i], na[j]), 1);
    if (i < n) up(i + 1, j, GAP, 2);
    if (j < m) up(i, j + 1, GAP, 3);
    if (i < n && j + 1 < m) up(i + 1, j + 2, 2 * (1 - similarity(ns[i], na[j] + na[j + 1])) + MULTI, 4);
    if (i + 1 < n && j < m) up(i + 2, j + 1, 2 * (1 - similarity(ns[i] + ns[i + 1], na[j])) + MULTI, 5);
  }
  // trace back
  const ops = [];
  for (let i = n, j = m; i > 0 || j > 0;) {
    const k = B[i][j];
    if (k === 1) { ops.push({ k, i: i - 1, j: j - 1 }); i--; j--; }
    else if (k === 2) { ops.push({ k, i: i - 1 }); i--; }
    else if (k === 3) { ops.push({ k, j: j - 1 }); j--; }
    else if (k === 4) { ops.push({ k, i: i - 1, j: j - 2 }); i--; j -= 2; }
    else if (k === 5) { ops.push({ k, i: i - 2, j: j - 1 }); i -= 2; j--; }
    else break;
  }
  ops.reverse();

  const out = new Array(n).fill(null);
  const st = { match: 0, respelled: 0, inserted: 0, dropped: 0, merged: 0, split: 0 };
  for (const op of ops) {
    if (op.k === 1) {
      const w = A[op.j], same = ns[op.i] === na[op.j];
      out[op.i] = { text: S[op.i], start: w.start, end: w.end, origin: same ? "match" : "respelled", ...(same && w.text === S[op.i] ? {} : { asr: w.text }) };
      st[same ? "match" : "respelled"]++;
    } else if (op.k === 2) { st.inserted++; }
    else if (op.k === 3) { st.dropped++; }
    else if (op.k === 4) {
      const a = A[op.j], b = A[op.j + 1];
      out[op.i] = { text: S[op.i], start: a.start, end: b.end, origin: "merged", asr: a.text + " " + b.text };
      st.merged++;
    } else if (op.k === 5) {
      const w = A[op.j], l1 = ns[op.i].length || 1, l2 = ns[op.i + 1].length || 1;
      const mid = w.start + ((w.end - w.start) * l1) / (l1 + l2);
      out[op.i] = { text: S[op.i], start: w.start, end: mid, origin: "split", asr: w.text };
      out[op.i + 1] = { text: S[op.i + 1], start: mid, end: w.end, origin: "split", asr: w.text };
      st.split++;
    }
  }
  // script words without audio: share the gap between the neighbours by letter count
  for (let i = 0; i < n;) {
    if (out[i]) { i++; continue; }
    let j = i; while (j < n && !out[j]) j++;
    const prev = i > 0 ? out[i - 1] : null, next = j < n ? out[j] : null;
    let t0 = prev ? prev.end : next ? Math.max(0, next.start - 0.3 * (j - i)) : 0;
    let t1 = next ? next.start : t0 + 0.3 * (j - i);
    const need = 0.06 * (j - i);
    if (t1 - t0 < need) {
      // gap too narrow: share the span of the previous (or next) word
      if (prev) { prev.end = Math.min(prev.end, Math.max(prev.start + (prev.end - prev.start) * 0.5, t1 - need)); t0 = prev.end; }
      else if (next) { next.start = Math.max(next.start, Math.min(next.start + (next.end - next.start) * 0.5, t0 + need)); t1 = next.start; }
    }
    const lens = S.slice(i, j).map((s) => Math.max(1, normWord(s).length));
    const tot = lens.reduce((x, y) => x + y, 0);
    let t = t0;
    for (let k = i; k < j; k++) {
      const d = ((t1 - t0) * lens[k - i]) / tot;
      out[k] = { text: S[k], start: t, end: t + d, origin: "inserted" };
      t += d;
    }
    i = j;
  }
  const words = out.map((w, i) => ({ id: "w" + i, text: w.text, start: +w.start.toFixed(3), end: +Math.max(w.start, w.end).toFixed(3), origin: w.origin, ...(w.asr ? { asr: w.asr } : {}) }));
  return { words, stats: { script: n, asr: m, ...st } };
}

/** Old names (v2.3 / v2.4-dev). */
export { normWord as normKata, similarity as mirip, scriptTokens as tokenNaskah, fixToScript as rapikan };
