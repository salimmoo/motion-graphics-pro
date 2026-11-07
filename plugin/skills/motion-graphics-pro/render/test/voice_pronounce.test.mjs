// Test: pronunciation entries with hyphens, apostrophes, dots and mixed case (P1-4, P_iklan_90), whole words only,
// and the warning list for entries that match no script word.
//   node --test motion-graphics-pro/render/test/voice_pronounce.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { parsePronunciations, applyPronunciations, unusedPronunciations } from "../src/voice.mjs";

const E = parsePronunciations(`
ZIP-nya = zip nya
ZIP = zip
Jum'at = Jumat
Dr. = Dokter
Pixel art = Piksel art
Claude = Klod | klod
`);
const say = (s) => applyPronunciations(s, E).text;

test("hyphenated entry matches (was silently ignored)", () => {
  assert.equal(say("Lalu unduh ZIP-nya, ya."), "Lalu unduh zip nya, ya.");
  assert.equal(say("zip-NYA"), "zip nya");                       // any case
  assert.equal(say("ZIP‑nya"), "zip nya");                   // non-breaking hyphen
});

test("shorter entry still matches before a hyphen suffix, inside quotes/brackets", () => {
  assert.equal(say("ZIP-file"), "zip-file");
  assert.equal(say("(ZIP)!"), "(zip)!");
  assert.equal(say("\"Claude\","), "\"Klod\",");
});

test("whole words only", () => {
  assert.equal(say("ZIPPED"), "ZIPPED");
  assert.equal(say("Claudette"), "Claudette");
  const e2 = parsePronunciations("don = dhon");
  assert.equal(applyPronunciations("don't", e2).text, "don't");  // no match inside a contraction
  assert.equal(applyPronunciations("don.", e2).text, "dhon.");
});

test("apostrophes (straight or curly) and dots", () => {
  assert.equal(say("Hari Jum'at."), "Hari Jumat.");
  assert.equal(say("Hari Jum’at."), "Hari Jumat.");
  assert.equal(say("Dr. Budi"), "Dokter Budi");
});

test("multi-word entries and word groups for the timing remap", () => {
  const r = applyPronunciations("Pixel art dan ZIP-nya", E);
  assert.equal(r.text, "Piksel art dan zip nya");
  assert.deepEqual(r.groups.map((g) => [g.o0, g.oN, g.sN]), [[0, 2, 2], [2, 1, 1], [3, 1, 2]]);
  assert.ok(r.used.has("zip-nya") && r.used.has("pixel art"));
});

test("inline --pronounce form", () => {
  const e = parsePronunciations("ZIP-nya=zip nya; Jum'at=Jumat", true);
  assert.equal(applyPronunciations("ZIP-nya Jum'at", e).text, "zip nya Jumat");
});

test("unused entries are reported (project file only, not the skill defaults)", () => {
  const pron = { entries: E.map((e) => ({ ...e, source: "naskah/pronunciations.txt" })) };
  const u = unusedPronunciations("Unduh ZIP-nya sekarang, Claude.", pron).map((x) => x.word);
  assert.deepEqual(u.sort(), ["Dr.", "Jum'at", "Pixel art", "ZIP"].sort());
});
