# ผลตรวจรับงานรอบแพ็กเกจ Phase 5

วันที่ 12 ตุลาคม 2026 · Asia/Bangkok · working tree ต่อจาก HEAD `4fb9edaf2d6def13a98102faa7413014d093a073` (ยังไม่ commit)

| การตรวจ | ผลจริง | ขอบเขต |
|---|---|---|
| `npm test -- --reporter=dot` | 18 files / **218 tests ผ่าน** | unit/integration แบบ mock และ React component ใน jsdom; รวม policy, server mapping, history artifact/replay |
| `npm run typecheck` | ผ่าน | TypeScript; production build ตรวจ types อีกครั้งหลังเพิ่ม tests |
| `npx eslint` เฉพาะไฟล์ runtime/UI ที่แก้ | ผ่าน | ไม่มี diagnostics; production build ตรวจ lint อีกครั้ง |
| `npm run build` | ผ่าน, 18 static pages, exit 0 | Next.js production compilation/type/lint ไม่ใช่ browser acceptance |
| `git diff --check` | ผ่าน | มีเพียงคำเตือน LF/CRLF ของ Git ไม่ใช่ whitespace error |
| ตรวจบันทึก/manifest | 19 decision IDs ไม่ซ้ำ + hash ตรงไฟล์ | ดู manifest; hash ผูกกับ raw bytes ของ working tree ไม่ใช่ลายเซ็นผู้เชี่ยวชาญ |

รัน Vitest ครั้งแรกใน sandbox ถูก Windows ปฏิเสธ realpath (`EPERM`) และยังไม่รัน tests จากนั้นรันนอก sandbox ได้ พบ fixture เดิมหนึ่งข้อคาดว่า Fold ฝ่ายเดียวไม่มี welfare warning แก้ expectation ให้ตรงนโยบายและรันชุดเต็มใหม่จนผ่าน ไม่รายงานรอบ EPERM เป็นผลทดสอบผ่าน

## กรณีใหม่ที่พิสูจน์แล้ว

- หูพับฝ่ายซ้าย/ขวา/ทั้งคู่/อีกฝ่ายไม่ทราบ รวม aliases และสลับพ่อแม่: pair ระงับทุก requested trait และ target coat-only ไม่จัดอันดับ
- ข้อความปฏิเสธหรือกำกวมไม่ถูก substring-match เป็นการวินิจฉัย Fold และยังมี health limitation
- แมวตัวเดียวกันและหลายข้อห้ามร่วมกันเก็บเหตุผลครบ
- Unknown-sex source/candidate แยก pending; topK ไม่ตัด pending; counts แยก eligible/evaluated; score ที่สูงไม่เอาชนะ welfare
- กฎจริงยัง unsupported, probability=null; UI แสดงขีดแทนเปอร์เซ็นต์ที่ไม่มี และไม่มีเลขอันดับใน pending
- Server label mapping ส่ง unknown/Fold ถึง engine จริง โดย mock เฉพาะ query layer
- เก็บ source artifact ใหม่ครบไฟล์ runtime; hash ของรุ่นเดิมต่างจากรุ่นใหม่; replay รุ่นเก่าถูกปฏิเสธ

## สิ่งที่ไม่ได้ตรวจในรอบนี้

- ไม่รัน browser E2E หรือ responsive visual acceptance ของหน้า authenticated; component tests ไม่แทนสองรายการนี้
- ไม่รัน live DB, migrations, RLS หรือ DNA-consent race tests ใหม่ ผล DB เดิมอยู่ในเอกสารรอบก่อน
- ไม่เปลี่ยน history feature flag หรือเปิดรับ DNA จริง
- ไม่ตรวจ full-text/assay validation ของ S3 สำเร็จ และไม่มีลายเซ็น domain/privacy reviewer
- ไม่รัน benchmark ซ้ำหลัง engine เปลี่ยนเป็น 0.2.0; ผล benchmark เดิมไม่ใช่หลักฐานเวลาของรุ่นนี้

งาน benchmark/package.json และไฟล์ค้างอื่นมีอยู่ก่อนเริ่มงานรอบนี้ ไม่ใช้สถานะ working tree สะอาดเป็นข้ออ้าง และไม่รวมการรับรองงานเหล่านั้นไว้ในผลตรวจรอบนี้
