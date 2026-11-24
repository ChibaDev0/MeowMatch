"""ทดลองเครื่องมือ NLP ภาษาไทยกับข้อมูลกรณีศึกษาของ MeowMatch

ข้อมูล: src/domain/nlp/fixtures/case-study.json (ข้อความที่ผู้ใช้พิมพ์บอกลูกแมวที่อยากได้)
เปรียบเทียบ:
  1) Word segmentation : PyThaiNLP newmm, newmm + custom dict, longest, TLTK
  2) Sentence segmentation : PyThaiNLP crfcut vs whitespace+newline
  3) POS tagging : PyThaiNLP perceptron (orchid / orchid_ud), TLTK pos_tag
ตัวชี้วัด: "domain term recall" = สัดส่วนคำโดเมนที่ควรเป็น 1 คำ (เช่น สก็อตติชโฟลด์, ขนยาว, ตาสีฟ้า)
           แล้วถูกตัดออกมาเป็นคำเดียวจริง

รัน:  .venv/Scripts/python experiment.py   → เขียนผลที่ docs/nlp/experiment-results.md
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import pythainlp
from pythainlp.corpus import thai_words
from pythainlp.tag import pos_tag
from pythainlp.tokenize import Trie, sent_tokenize, word_tokenize
from pythainlp.util import normalize

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
CASES = json.loads((ROOT / "src/domain/nlp/fixtures/case-study.json").read_text(encoding="utf-8"))["cases"]
LEXICON_TS = (ROOT / "src/domain/nlp/lexicon.ts").read_text(encoding="utf-8")
OUT = ROOT / "docs/nlp/experiment-results.md"

# คำโดเมนภาษาไทยจาก lexicon.ts (ชุดเดียวกับที่แอปส่งให้ service)
DOMAIN = sorted({w for w in re.findall(r'"([\u0E00-\u0E7F0-9]+)"', LEXICON_TS)} - {"ไม่เอา"})
GOLD_TERMS = [w for w in DOMAIN if len(w) >= 4]  # คำประสม/ชื่อพันธุ์ที่ควรอยู่เป็นคำเดียว
CUSTOM = Trie(set(thai_words()) | set(DOMAIN))

try:
    import tltk  # type: ignore

    HAS_TLTK = True
except Exception:  # noqa: BLE001
    HAS_TLTK = False


def tltk_words(text: str) -> list[str]:
    # tltk.nlp.word_segment คืน "คำ|คำ|<s/>" — ช่องว่างกลายเป็น <s/>
    raw = tltk.nlp.word_segment(text)
    return [w.replace("<s/>", "") for w in raw.split("|") if w.replace("<s/>", "")]


TOKENIZERS = {
    "newmm (default dict)": lambda t: word_tokenize(t, engine="newmm"),
    "newmm + custom dict": lambda t: word_tokenize(t, engine="newmm", custom_dict=CUSTOM),
    "longest + custom dict": lambda t: word_tokenize(t, engine="longest", custom_dict=CUSTOM),
}
if HAS_TLTK:
    TOKENIZERS["TLTK word_segment"] = tltk_words


def domain_recall(text: str, tokens: list[str]) -> tuple[int, int]:
    present = [g for g in GOLD_TERMS if g in text]
    # นับเฉพาะคำที่ยาวที่สุด (ไม่ให้ "สก็อตติช" ใน "สก็อตติชโฟลด์" นับซ้ำ)
    present = [g for g in present if not any(g != o and g in o and o in text for o in present)]
    hit = sum(1 for g in present if g in tokens)
    return hit, len(present)


def main() -> None:
    # แอปทำ normalize ก่อนตัดคำเสมอ — ใช้ pythainlp.util.normalize ให้เทียบกันได้
    texts = [normalize(c["text"]).lower() for c in CASES]
    lines: list[str] = [
        "# ผลทดลองเครื่องมือ NLP ภาษาไทยกับข้อมูลกรณีศึกษา MeowMatch",
        "",
        f"- PyThaiNLP {pythainlp.__version__}" + (" · TLTK 1.11" if HAS_TLTK else ""),
        f"- ข้อความกรณีศึกษา {len(texts)} ประโยค (`src/domain/nlp/fixtures/case-study.json`)",
        f"- พจนานุกรมโดเมน {len(DOMAIN)} คำ จาก `src/domain/nlp/lexicon.ts`",
        "- ข้อความผ่าน `pythainlp.util.normalize` ก่อนตัดคำ",
        "",
        "## 1. Word segmentation",
        "",
        "| Tokenizer | domain term recall | จำนวนคำเฉลี่ย | เวลา (ms/ประโยค) |",
        "|---|---|---|---|",
    ]
    outputs: dict[str, list[list[str]]] = {}
    for name, fn in TOKENIZERS.items():
        fn(texts[0])  # warm-up โหลดโมเดล/พจนานุกรม
        start = time.perf_counter()
        toks = [fn(t) for t in texts]
        ms = (time.perf_counter() - start) * 1000 / len(texts)
        outputs[name] = toks
        hit = total = 0
        for t, tk in zip(texts, toks):
            h, n = domain_recall(t, tk)
            hit += h
            total += n
        avg = sum(len([w for w in tk if w.strip()]) for tk in toks) / len(toks)
        lines.append(f"| {name} | {hit}/{total} ({hit / total:.0%}) | {avg:.1f} | {ms:.2f} |")

    lines += ["", "### ตัวอย่างผลตัดคำ", ""]
    for t_index in (0, 1, 9):
        lines.append(f"**{CASES[t_index]['text']}**")
        lines.append("")
        for name, toks in outputs.items():
            shown = " | ".join(w for w in toks[t_index] if w.strip())
            lines.append(f"- {name}: `{shown}`")
        lines.append("")

    lines += ["## 2. Sentence segmentation", "", "| ข้อความ | crfcut | whitespace+newline |", "|---|---|---|"]
    for t in texts[:6]:
        crf = " ‖ ".join(s.strip() for s in sent_tokenize(t, engine="crfcut") if s.strip())
        ws = " ‖ ".join(s.strip() for s in sent_tokenize(t, engine="whitespace+newline") if s.strip())
        lines.append(f"| {t} | {crf} | {ws} |")

    lines += ["", "## 3. Part-of-speech tagging", ""]
    sample = texts[0]
    toks = word_tokenize(sample, engine="newmm", custom_dict=CUSTOM)
    toks = [w for w in toks if w.strip()]
    orchid = pos_tag(toks, engine="perceptron", corpus="orchid")
    ud = pos_tag(toks, engine="perceptron", corpus="orchid_ud")
    lines += [f"ประโยค: **{CASES[0]['text']}** (ตัดคำด้วย newmm + custom dict)", "", "| คำ | ORCHID | UD |", "|---|---|---|"]
    for (w, a), (_, b) in zip(orchid, ud):
        lines.append(f"| {w} | {a} | {b} |")
    if HAS_TLTK:
        tl = [f"{w}/{p}" for sent in tltk.nlp.pos_tag(sample) for (w, p) in sent if w != "<s/>"]
        lines += ["", f"TLTK pos_tag: `{' '.join(tl)}`"]

    lines += [
        "",
        "## สรุปที่นำไปใช้ในแอป",
        "",
        "- newmm ตัดคำโดเมนผิด (เช่น `สก็อต|ติ|ชโฟลด์ขน`) เพราะไม่มีคำเหล่านี้ในพจนานุกรม → แอปส่ง custom dict ไปทุกครั้ง",
        "- คำปฏิเสธ `ไม่` ได้แท็ก NEG (ORCHID) / PART (UD) จึงไม่ใส่ `ไม่เอา` ในพจนานุกรม และใช้ `ไม่` กำหนดขอบเขตการปฏิเสธ เช่น `ไม่เอาหูพับ` → หูตั้ง",
        "- คำประสมที่เพิ่มเข้า custom dict (เช่น `ขนยาว`) เป็นคำที่ perceptron ไม่เคยเห็น จึงได้ NOUN/NCMN — แอปใช้ POS เพื่อแสดงผลและใช้พจนานุกรมโดเมนตัดสิน entity",
        "- crfcut มักไม่แบ่งข้อความสั้นที่ไม่มีวรรคตอน แอปจึงใช้ช่องว่าง/คำเชื่อม (แต่ และ หรือ) เป็นขอบเขตวลีเพิ่ม",
        "",
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
