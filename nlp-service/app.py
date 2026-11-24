"""MeowMatch Thai NLP service (PyThaiNLP)

เสริมความแม่นยำให้ช่อง "พิมพ์บอกลูกแมวที่อยากได้" ในหน้าแมวที่ต้องการ:
- Word segmentation : PyThaiNLP newmm + custom dictionary ของโดเมน (ส่งมาจากแอป)
- Sentence segmentation : PyThaiNLP crfcut
- Part-of-speech tagging : PyThaiNLP perceptron (corpus orchid_ud → Universal POS)

เรียกจาก Next.js server เท่านั้น (THAI_NLP_URL) — ถ้า service ไม่ทำงาน แอปจะใช้ตัวตัดคำในตัวแทน
รัน:  .venv/Scripts/python -m uvicorn app:app --port 8001
"""

from __future__ import annotations

from functools import lru_cache

import pythainlp
from fastapi import FastAPI
from pydantic import BaseModel, Field
from pythainlp.corpus import thai_words
from pythainlp.tag import pos_tag
from pythainlp.tokenize import Trie, sent_tokenize, word_tokenize

app = FastAPI(title="MeowMatch Thai NLP", version="1.0.0")
BASE_WORDS = frozenset(thai_words())


@lru_cache(maxsize=16)
def build_dict(custom_words: tuple[str, ...]) -> Trie:
    return Trie(BASE_WORDS | set(custom_words))


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    custom_words: list[str] = Field(default_factory=list, max_length=1000)


class TokenOut(BaseModel):
    text: str
    pos: str


class AnalyzeResponse(BaseModel):
    engine: str = "pythainlp"
    version: str
    tokenizer: str
    pos_corpus: str
    sentences: list[str]
    tokens: list[TokenOut]


def analyze(text: str, custom_words: list[str]) -> AnalyzeResponse:
    words = tuple(sorted({w.strip() for w in custom_words if w.strip() and len(w) <= 40}))
    tokens = word_tokenize(text, engine="newmm", custom_dict=build_dict(words), keep_whitespace=True)
    tags = pos_tag(tokens, engine="perceptron", corpus="orchid_ud")
    sentences = [s.strip() for s in sent_tokenize(text, engine="crfcut") if s.strip()]
    return AnalyzeResponse(
        version=pythainlp.__version__,
        tokenizer="newmm+custom_dict",
        pos_corpus="orchid_ud",
        sentences=sentences,
        tokens=[TokenOut(text=t, pos=p) for t, p in tags],
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "pythainlp": pythainlp.__version__}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_route(req: AnalyzeRequest) -> AnalyzeResponse:
    return analyze(req.text, req.custom_words)
