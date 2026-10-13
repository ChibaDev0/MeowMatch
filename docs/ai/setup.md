# การเชื่อม Gemini Flash สำหรับคำอธิบายแมวคู่

## เปิดใช้งาน

ตั้งค่าใน `.env.local` (อย่า commit ค่าลับ) แล้วเริ่มเซิร์ฟเวอร์ใหม่:

```dotenv
GEMINI_API_KEY="คีย์จาก Google AI Studio"
GEMINI_MODEL="gemini-3.8-flash"
```

เลือกโมเดลตระกูล Flash ที่บัญชีเข้าถึงได้ผ่าน GEMINI_MODEL ได้ ค่าเริ่มต้นคือ gemini-3.8-flash
อ้างอิงโมเดลและ REST API จากเอกสาร Google ที่ตรวจเมื่อ 2026-10-13:
- [Models](https://ai.google.dev/gemini-api/docs/models)
- [GenerateContent / systemInstruction / responseJsonSchema](https://ai.google.dev/api/generate-content)
- [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)

ไปหน้าแมวที่ต้องการ เลือกแมวของฉัน ตั้งเป้าหมาย แล้วกดวิเคราะห์ผลลัพธ์
หากได้รับคำตอบที่ตรวจผ่าน จะแสดง “คำอธิบายเพิ่มเติมโดย Gemini Flash”
หากยังไม่ได้ตั้งค่า คำตอบผิดรูปแบบ API ล้มเหลว หรือหมดเวลา จะเห็น “แสดงคำแนะนำพื้นฐาน”
ไม่ต้องส่งคีย์ลงในแชตหรือกรอกในหน้าเว็บ และห้ามใช้ชื่อตัวแปร NEXT_PUBLIC_ สำหรับคีย์นี้

## เอกสารที่ส่งให้โมเดลอ่านจริง

เซิร์ฟเวอร์อ่านใหม่ก่อนการสร้างคำตอบแต่ละครั้งจากรายการไฟล์ตายตัว:

1. `docs/ai/gemini-flash.md`: role, rules, output และ breed/eye/coat/ear เฉพาะเป้าหมายที่เลือก
2. `docs/scope.md`: “โปรเจกต์นี้คืออะไร” และ “ผลลัพธ์หน้าแมวที่ต้องการ (ปรับ 2026-10-13)”

ส่งเนื้อหาผ่าน systemInstruction ไม่ใช่ส่งชื่อไฟล์แล้วหวังว่าโมเดลจะเปิดอ่านเอง
หากไฟล์หรือหัวข้อหาย ไม่เรียก Gemini และกลับไปใช้คำอธิบายพื้นฐาน
หากเปลี่ยนชื่อหัวข้อ ต้องแก้ allowlist ใน `src/server/analysis/gemini-guidance.ts` ด้วย
Next.js outputFileTracingIncludes รวมเอกสารสองไฟล์นี้สำหรับการแพ็ก deploy
การ deploy ต้องมีไฟล์เหล่านี้ใต้ docs ใน working directory ของแอป

## ข้อมูลและขอบเขตการทำงาน

- ตรวจ ownership ของแมวตั้งต้นก่อนเรียก API
- ส่งเฉพาะพันธุ์ สีตา ขน หู และสเปกที่ระบบแนะนำ ไม่ส่งรหัสแมว ชื่อเจ้าของ อีเมล รูป หรือคีย์ฐานข้อมูล
- AI เขียน description กับ checks เท่านั้น ผลโอกาสและ partner มาจากกติกาเดโมเดิม
- ตรวจ JSON ด้วย Zod: หมวดครบ ไม่ซ้ำ partner ตรงกับระบบ ขนาดข้อความจำกัด
- ปฏิเสธผลที่แทรกเปอร์เซ็นต์ เรื่องยีน/DNA HTML หรือรูปแบบไม่ครบ ใช้คำอธิบายพื้นฐานแทน
- การตรวจโครงสร้างและคำต้องห้ามไม่ใช่การรับรองความถูกต้องของข้อความทุกประโยค
- จำกัดเวลา 30 วินาที, output 4096 tokens, ไม่ retry อัตโนมัติ
- Gemini 3 ใช้ thinkingLevel `low`; Gemini 2.5 Flash/Flash-Lite ใช้ thinkingBudget `0`
  เพื่อลดเวลารอสำหรับงานขยายคำอธิบาย อ้างอิง [เอกสาร Google](https://ai.google.dev/gemini-api/docs/thinking)
- แยก log `provider_timeout` และ `provider_http_<status>` โดยไม่เผยคีย์หรือคำตอบ
- จำกัด 20 คำขอ/นาที และพร้อมกันไม่เกิน 2 คำขอ **ต่อ process** เป็นตัวคุมค่าใช้จ่ายของเดโม
  หาก deploy หลาย instance ต้องเพิ่ม shared rate limiter และตั้ง quota/budget ที่ผู้ให้บริการ
- log เฉพาะรหัสเหตุการณ์ ไม่ log ข้อมูลแมว คีย์ prompt หรือคำตอบเต็ม

## ตรวจสอบ

```text
npx vitest run src/domain/demo src/server/analysis/appearance-action.test.ts src/server/analysis/gemini-guidance.test.ts src/features/goals/appearance-result.test.tsx src/features/goals/desired-planner.test.tsx
npm run typecheck
```

การทดสอบ API แบบจำลองตรวจ prompt/context, schema, fallback, ownership และการแสดงผล
ยังต้องทดสอบ API จริงด้วยคีย์ของ deployment เพื่อยืนยันสิทธิ์โมเดล โควตา ความหน่วง และคุณภาพภาษา

### ทดสอบ API จริง (มีการใช้โควตา)

```text
npm run test:gemini:live
```

ชุดนี้แยกจาก `npm test` โหลดเฉพาะตัวแปร `GEMINI_` จาก environment/ไฟล์ตั้งค่าในเครื่อง
เรียกโค้ดเดียวกับแอปและ Google API จริงด้วยข้อมูลแมวตัวอย่าง ไม่ mock fetch
ถ้าไม่มีคีย์หรือระบบกลับไปใช้คำอธิบายพื้นฐาน จะถือว่าทดสอบไม่ผ่าน ไม่ข้ามการทดสอบ

ผลตรวจ 2026-10-13:
- บัญชีเข้าถึง `gemini-3.8-flash` ได้จาก Models API จริง
- ก่อนแก้ การสร้างคำอธิบายครบ 4 ลักษณะหมดเวลาที่ 12 วินาที
- โมเดลที่เรียกจริงปฏิเสธ thinkingLevel `minimal` จึงใช้ `low` ที่ทดสอบผ่าน
- หลังแก้ API จริงผ่าน 2 กรณี: ครบ 4 ลักษณะ 9.338 วินาที และเฉพาะหู 4.505 วินาที
- ทั้งสองกรณีผ่าน schema ของแอปและได้ guidanceSource `gemini`; คง partner/ระดับโอกาสจากระบบ
- ชุดทดสอบที่เกี่ยวข้องผ่าน 24 ข้อ; TypeScript (`--incremental false`), ESLint เฉพาะไฟล์ที่เปลี่ยน และ production build ผ่าน
- ตัวเลขเวลาเป็นการวัดแต่ละครั้ง ไม่ใช่ SLA; ยังไม่ได้ทดสอบเส้นทางล็อกอินถึงผลลัพธ์ในเบราว์เซอร์
