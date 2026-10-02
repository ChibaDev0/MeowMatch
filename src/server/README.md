# server/

ชั้นฝั่งเซิร์ฟเวอร์เท่านั้น (ห้าม import จาก Client Components)

- `services/` — business rules และ orchestration: ตรวจสิทธิ์/consent, สร้าง evidence
  snapshot, เรียก repositories และ `domain/genetics`, บันทึก `analysis_runs`
- `repositories/` — การ query ที่มีขอบเขตสิทธิ์ (ใช้ Supabase client ที่ผูก JWT ผู้ใช้
  เพื่อให้ RLS บังคับใช้); แยก read model ของ listing ออกจากข้อมูลส่วนตัว
- `auth/` — username resolver (ผ่าน `private.username_registry`), การจัดการ session,
  และงานที่ต้องใช้ admin client เฉพาะที่กำหนดชัด (resolve username ก่อน login, ลบบัญชี)

ลำดับการวิเคราะห์ (จาก 01-architecture / 10-algorithm-design):
ตรวจสิทธิ์/consent → evidence snapshot → constraint gates → exact/scenario inference →
target probability → จัดอันดับ+อธิบายผล → บันทึกเวอร์ชันและผล
