# MeowMatch Thai NLP service (PyThaiNLP)

บริการเสริมสำหรับช่อง **“พิมพ์บอกลูกแมวที่อยากได้”** ในหน้าแมวที่ต้องการ
แอปทำงานได้โดยไม่ต้องเปิดบริการนี้ (ใช้ตัวตัดคำในแอป) — เมื่อเปิดไว้ แอปจะใช้ PyThaiNLP แทน

| งาน | เครื่องมือ |
|---|---|
| Word segmentation | PyThaiNLP `newmm` + custom dictionary ของโดเมน (แอปส่งคำมาทุกครั้ง) |
| Sentence segmentation | PyThaiNLP `crfcut` |
| POS tagging | PyThaiNLP `perceptron` (corpus `orchid_ud` → Universal POS) |

## ติดตั้งและรัน

```bash
cd nlp-service
uv venv .venv --python 3.12          # หรือ python -m venv .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

แล้วตั้งค่าใน `.env.local` ของแอป และเริ่ม `npm run dev` ใหม่:

```dotenv
THAI_NLP_URL="http://127.0.0.1:8001"
```

API: `GET /health`, `POST /analyze` body `{ "text": "...", "custom_words": ["..."] }`

## การทดลอง (Active learning)

```bash
.venv/Scripts/python experiment.py
```

เปรียบเทียบ newmm / newmm + custom dict / longest / TLTK กับข้อมูลกรณีศึกษา
`src/domain/nlp/fixtures/case-study.json` แล้วเขียนผลที่ `docs/nlp/experiment-results.md`

ทดสอบแอปกับบริการจริง:

```bash
THAI_NLP_URL=http://127.0.0.1:8001 npx vitest run src/server/nlp/pythainlp.live.test.ts
```
