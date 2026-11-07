"""text_score - text normalisation for scoring a VO with ASR (`mgp voice score`, `speak --tries`). Pure Python.
Old module name: teks_nilai.py (thin shim kept).

Raw WER punishes things that do not sound wrong: capitals, punctuation, numbers ("2025" vs "dua ribu dua puluh
lima"), words the ASR joins/splits ("laptop mu" vs "laptopmu"), non-standard spelling ("aja"/"saja", "ijin"/"izin"),
and brand names spelled phonetically for the TTS ("Claude" spoken as "Klod"). This module normalises both sides, then aligns
words with a Levenshtein that also allows free 2-to-1 / 1-to-2 joins when the letters are exactly the same.

Words that still differ after normalisation = CHECK BY EAR: listen at that second.

  normal = Normal(pronunciations=[{"word": "Claude", "spoken": "Klod", "variants": ["clod"]}], lang="id")
  r = score_text(script, asr_words, normal, script_times=None)   # asr_words = [{"text", "start", "end"}]
Old keys of pronunciation entries ({"kata", "ucap", "varian"}) and old keyword names still work.
"""
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_py import rename_kwargs  # noqa: E402

# non-standard spellings / ASR variants counted as the same word (left -> canonical form)
VARIANTS_ID = {
    "aja": "saja", "udah": "sudah", "dah": "sudah", "kalo": "kalau", "gak": "enggak", "nggak": "enggak",
    "ngga": "enggak", "ga": "enggak", "engga": "enggak", "tau": "tahu", "trus": "terus", "emang": "memang",
    "ijin": "izin", "praktek": "praktik", "resiko": "risiko", "jaman": "zaman", "sekedar": "sekadar",
    "silahkan": "silakan", "nasehat": "nasihat", "apotik": "apotek", "merubah": "mengubah", "ok": "oke",
    "okay": "oke", "okey": "oke", "karna": "karena", "krn": "karena", "yg": "yang", "dgn": "dengan",
    "gimana": "bagaimana", "e mail": "email",
}
VARIANTS_EN = {"ok": "okay", "gonna": "going to", "wanna": "want to", "alright": "all right"}

_UNITS_ID = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
_EN1 = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
        "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
_EN10 = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def number_words_id(n):
    """Same as numberWordsId in src/align.mjs (old angkaId)."""
    if n < 12:
        return _UNITS_ID[n]
    if n < 20:
        return _UNITS_ID[n - 10] + " belas"
    if n < 100:
        return _UNITS_ID[n // 10] + " puluh" + (" " + _UNITS_ID[n % 10] if n % 10 else "")
    if n < 200:
        return "seratus" + (" " + number_words_id(n % 100) if n % 100 else "")
    if n < 1000:
        return _UNITS_ID[n // 100] + " ratus" + (" " + number_words_id(n % 100) if n % 100 else "")
    if n < 2000:
        return "seribu" + (" " + number_words_id(n % 1000) if n % 1000 else "")
    for v, w in ((10 ** 12, "triliun"), (10 ** 9, "miliar"), (10 ** 6, "juta"), (1000, "ribu")):
        if n >= v:
            q, r = divmod(n, v)
            return number_words_id(q) + " " + w + (" " + number_words_id(r) if r else "")
    return str(n)


def number_words_en(n):
    if n < 20:
        return _EN1[n]
    if n < 100:
        return _EN10[n // 10] + (" " + _EN1[n % 10] if n % 10 else "")
    if n < 1000:
        return _EN1[n // 100] + " hundred" + (" " + number_words_en(n % 100) if n % 100 else "")
    for v, w in ((10 ** 12, "trillion"), (10 ** 9, "billion"), (10 ** 6, "million"), (1000, "thousand")):
        if n >= v:
            q, r = divmod(n, v)
            return number_words_en(q) + " " + w + (" " + number_words_en(r) if r else "")
    return str(n)


@rename_kwargs({"bahasa": "lang"})
def spell_numbers(tok, lang="id"):
    """"2025," -> " dua ribu dua puluh lima ,"; "3,5" -> "tiga koma lima"; "12%" -> "dua belas persen" (like spellNumbers)."""
    en = lang == "en"
    words = number_words_en if en else number_words_id
    th, dc = ("," , ".") if en else (".", ",")

    def repl(m):
        s, dec = m.group(0), None
        if re.fullmatch(r"\d{1,3}(" + re.escape(th) + r"\d{3})+", s):
            s = s.replace(th, "")
        elif dc in s:
            a, b = s.split(dc, 1)
            s, dec = a.replace(th, ""), b
        else:
            s = re.sub(r"[.,]", "", s)
        w = " ".join(words(int(d)) for d in s) if len(s) > 15 else words(int(s))
        if dec:
            w += (" point " if en else " koma ") + " ".join(words(int(d)) for d in re.sub(r"\D", "", dec))
        return " " + w + " "

    t = re.sub(r"\d[\d.,]*\d|\d", repl, tok)
    return t.replace("%", " percent " if en else " persen ").replace("&", " and " if en else " dan ")


def _plain(s):
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def script_tokens(text):
    """Script tokens like scriptTokens (align.mjs): [..] tags dropped, lone punctuation glued to the previous word."""
    raw = re.sub(r"\[[^\]]*\]", " ", str(text).replace("\r", "")).split()
    out = []
    for t in raw:
        if not re.search(r"[^\W_]", t):
            if out:
                out[-1] += t
        else:
            out.append(t)
    return out


@rename_kwargs({"bahasa": "lang"})
def plain_words(tok, lang="id"):
    """One token -> list of plain words (lower case, no diacritics/punctuation, numbers spelled, hyphens joined)."""
    s = _plain(spell_numbers(tok, lang))
    s = re.sub(r"[-‐‑'’]", "", s)
    return [w for w in re.split(r"[^a-z0-9]+", s) if w]


def _entry(e, new, old):
    v = e.get(new)
    return e.get(old) if v is None else v


class Normal:
    """Two-way normalisation. pronunciations: [{"word", "spoken", "variants": [...]}]: canonical word, TTS spelling,
    ASR variants (old keys "kata", "ucap", "varian" accepted)."""

    @rename_kwargs({"lafal": "pronunciations", "bahasa": "lang", "varian": "variants"})
    def __init__(self, pronunciations=None, lang="id", variants=None):
        self.lang = "en" if lang == "en" else "id"
        tbl = dict(VARIANTS_EN if self.lang == "en" else VARIANTS_ID)
        tbl.update(variants or {})
        self.phrases = []                              # (form tuple, canonical tuple)
        for k, v in tbl.items():
            self.phrases.append((tuple(self._p(k)), tuple(self._p(v))))
        for e in pronunciations or []:
            canon = tuple(self._p(_entry(e, "word", "kata") or ""))
            if not canon:
                continue
            for b in [_entry(e, "spoken", "ucap")] + list(_entry(e, "variants", "varian") or []):
                bb = tuple(self._p(b or ""))
                if bb and bb != canon:
                    self.phrases.append((bb, canon))
        self.phrases.sort(key=lambda f: -len(f[0]))   # longest phrase first
        self._max = max((len(f[0]) for f in self.phrases), default=1)
        self._map = {}
        for b, k in self.phrases:
            self._map.setdefault(b, k)

    def _p(self, s):
        return [w for t in str(s).split() for w in plain_words(t, self.lang)]

    def parse(self, tokens):
        """Original tokens -> [(word, original_token_index)], with variant phrases replaced by the canonical form."""
        seq = [(w, i) for i, t in enumerate(tokens) for w in plain_words(t, self.lang)]
        out, i = [], 0
        while i < len(seq):
            for L in range(min(self._max, len(seq) - i), 0, -1):
                k = self._map.get(tuple(w for w, _ in seq[i:i + L]))
                if k is not None:
                    out += [(w, seq[i + min(j, L - 1)][1]) for j, w in enumerate(k)]
                    i += L
                    break
            else:
                out.append(seq[i])
                i += 1
        return out

    # old names (teks_nilai.Normal)
    urai = parse
    bahasa = property(lambda s: s.lang)
    frasa = property(lambda s: s.phrases)


def _lev(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)]


def sound_skeleton(w):
    """Sound skeleton: spellings that differ but sound the same to an Indonesian ear count as the same
    ("computermu" = "komputermu", "foto" = "photo", "Higgs" = "higs"). Double letters are collapsed."""
    w = re.sub(r"c(?=[oulrkt])", "k", w)            # "computer", "clock"; "cari" vs "kari" stay different
    w = w.replace("ph", "f").replace("q", "k").replace("x", "ks").replace("v", "f").replace("oo", "u").replace("ie", "i")
    return re.sub(r"(.)\1+", r"\1", w)


def align_words(R, H):
    """Word Levenshtein + free 2-1/1-2 joins when the letters are the same. Returns (cost, steps).
    Words count as the same when equal or when their sound skeletons are equal.
    steps: (kind, [i...], [j...]) with kind same | substitute | delete | insert."""
    R = [sound_skeleton(w) for w in R]
    H = [sound_skeleton(w) for w in H]
    n, m = len(R), len(H)
    INF = 10 ** 9
    D = [[INF] * (m + 1) for _ in range(n + 1)]
    B = [[None] * (m + 1) for _ in range(n + 1)]
    D[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            c = D[i][j]
            if c >= INF:
                continue
            if i < n and j < m:
                s = c + (R[i] != H[j])
                if s < D[i + 1][j + 1]:
                    D[i + 1][j + 1], B[i + 1][j + 1] = s, ("same" if R[i] == H[j] else "substitute", 1, 1)
            if i < n and c + 1 < D[i + 1][j]:
                D[i + 1][j], B[i + 1][j] = c + 1, ("delete", 1, 0)
            if j < m and c + 1 < D[i][j + 1]:
                D[i][j + 1], B[i][j + 1] = c + 1, ("insert", 0, 1)
            if i + 1 < n and j < m and R[i] + R[i + 1] == H[j] and c < D[i + 2][j + 1]:
                D[i + 2][j + 1], B[i + 2][j + 1] = c, ("same", 2, 1)
            if i < n and j + 1 < m and R[i] == H[j] + H[j + 1] and c < D[i + 1][j + 2]:
                D[i + 1][j + 2], B[i + 1][j + 2] = c, ("same", 1, 2)
    steps, i, j = [], n, m
    while i > 0 or j > 0:
        kind, di, dj = B[i][j]
        steps.append((kind, list(range(i - di, i)), list(range(j - dj, j))))
        i, j = i - di, j - dj
    steps.reverse()
    return D[n][m], steps


@rename_kwargs({"naskah": "script", "kata_asr": "asr_words", "waktu_naskah": "script_times"})
def score_text(script, asr_words, normal, script_times=None):
    """script (str) vs ASR words ([{"text", "start", "end"}] or str). script_times: words.json (one entry per script
    token) for the CHECK BY EAR times; without it times come from the nearest ASR word."""
    if isinstance(asr_words, str):
        asr_words = [{"text": t} for t in asr_words.split()]
    tok_r = script_tokens(script)
    tok_h = [k["text"] for k in asr_words]
    R, H = normal.parse(tok_r), normal.parse(tok_h)
    cost, steps = align_words([w for w, _ in R], [w for w, _ in H])
    cr = "".join(w for w, _ in R)
    ch = "".join(w for w, _ in H)
    use_st = script_times is not None and len(script_times) == len(tok_r)

    def t_h(js, key):
        v = [asr_words[H[j][1]].get(key) for j in js]
        v = [x for x in v if x is not None]
        return (min(v) if key == "start" else max(v)) if v else None

    # time per step (for delete: edges of the neighbouring ASR words)
    check, end_h = [], None
    for k, (kind, iss, jss) in enumerate(steps):
        if jss:
            end_h = t_h(jss, "end")
        if kind == "same":
            continue
        ir = sorted({R[i][1] for i in iss})
        item = {"kind": kind, "script": " ".join(tok_r[i] for i in ir), "heard": " ".join(tok_h[H[j][1]] for j in jss),
                "token": ir}
        if use_st and ir:
            item["start"], item["end"] = script_times[ir[0]].get("start"), script_times[ir[-1]].get("end")
        elif jss:
            item["start"], item["end"] = t_h(jss, "start"), t_h(jss, "end")
        else:
            nxt = next((t_h(j2, "start") for _, _, j2 in steps[k + 1:] if j2), None)
            item["start"], item["end"] = end_h, nxt
        # merge with the previous item when adjacent (one place to listen to)
        if check and ir and check[-1]["token"] and ir[0] - check[-1]["token"][-1] <= 1 and kind != "insert" and check[-1]["kind"] != "insert":
            p = check[-1]
            new = [i for i in ir if i not in p["token"]]
            p["token"] += new
            p["script"] = " ".join(tok_r[i] for i in p["token"])
            p["heard"] = (p["heard"] + " " + item["heard"]).strip()
            p["end"] = item.get("end") if item.get("end") is not None else p.get("end")
            p["kind"] = "substitute" if "substitute" in (p["kind"], kind) or p["heard"] else kind
            continue
        if check and check[-1]["kind"] == "insert" and check[-1].get("_k") == k - 1 and kind in ("substitute", "delete"):
            # an extra word right before a wrong word: one place ("ElevenLabs" heard as "11 laps")
            p = check.pop()
            item["heard"] = (p["heard"] + " " + item["heard"]).strip()
            item["start"] = p.get("start") if p.get("start") is not None else item.get("start")
            item["kind"] = "substitute"
        if kind == "insert" and not ir:
            # a word that was heard but is not in the script: attach it to the previous script token
            prev = next((R[i2][1] for _, i_, _ in reversed(steps[:k]) for i2 in i_[-1:]), None)
            item["token"] = [prev] if prev is not None else []
            item["script"] = ""
        item["_k"] = k
        check.append(item)
    for c in check:
        c.pop("_k", None)
        for key in ("start", "end"):
            if c.get(key) is not None:
                c[key] = round(float(c[key]), 2)
    return {
        "werNormal": round(cost / max(1, len(R)), 4), "errorsNormal": cost, "wordCountNormal": len(R),
        "cerNormal": round(_lev(cr, ch) / max(1, len(cr)), 4),
        "checkByEar": check,
    }


def raw_wer(ref, hyp):
    """Old WER (only lower case + punctuation removed), to compare with the normalised number."""
    def n(s):
        s = _plain(s)
        s = re.sub(r"\[[^\]]*\]", " ", s)
        s = re.sub(r"[-‐]", "", s)
        return re.sub(r"[^a-z0-9 ]+", " ", s).split()
    r, h = n(ref), n(hyp)
    return _lev(r, h), len(r)


def raw_cer(ref, hyp):
    def n(s):
        s = unicodedata.normalize("NFD", re.sub(r"\[[^\]]*\]", " ", s.lower()))
        return [c for c in s if c.isalnum() and unicodedata.category(c) != "Mn"]
    r, h = n(ref), n(hyp)
    return _lev(r, h), len(r)


# old names (teks_nilai.py), kept as aliases
VARIAN_ID, VARIAN_EN, _SATUAN = VARIANTS_ID, VARIANTS_EN, _UNITS_ID
angka_id = number_words_id
angka_en = number_words_en
eja_angka = spell_numbers
_polos = _plain
token_naskah = script_tokens
kata_polos = plain_words
kerangka = sound_skeleton
selaras_kata = align_words
nilai_teks = score_text
wer_mentah = raw_wer
cer_mentah = raw_cer


if __name__ == "__main__":                                 # quick test: python -I text_score.py
    nm = Normal([{"word": "Claude", "spoken": "Klod", "variants": []}, {"kata": "Motion Graphics", "ucap": "Mosyen Grafiks"}])
    script = "Tulis saja brief-nya, Claude yang membangun. 260 blok di laptopmu, Motion Graphics Pro."
    asr = "tulis aja brief nya klok yang membangun dua ratus enam puluh blok di laptop mu mosyen grafiks pro"
    r = score_text(script, asr, nm)
    s, n = raw_wer(script, asr)
    print("raw WER %.1f%%  normal %.1f%%  normal CER %.1f%%" % (100 * s / n, 100 * r["werNormal"], 100 * r["cerNormal"]))
    for c in r["checkByEar"]:
        print("  CHECK BY EAR", c)
