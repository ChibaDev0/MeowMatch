# MeowMatch 🐾

เว็บแอป **ทดลองความน่าจะเป็น** สำหรับการจับคู่ผสมพันธุ์แมว: เก็บข้อมูลแมว ระบุลักษณะลูกที่อยากได้
แล้วให้ระบบ **บอกว่าต้องใช้แมวลักษณะไหนมาผสม** พร้อม **แสดงความเป็นไปได้** ของลักษณะที่ลูกจะได้

> **นี่คือโปรเจกต์ทดลองความน่าจะเป็น ไม่ใช่เครื่องมือ DNA/พันธุกรรมคลินิก**
> ไม่ต้องใช้ยีน/ผล DNA จริงของสัตว์ และไม่ต้องให้ผู้เชี่ยวชาญตรวจรับ — แค่บอกความเป็นไปได้ก็พอ
> ตัวเลขทั้งหมดเป็น "โหมดทดลอง" จากโมเดลการถ่ายทอดแบบง่าย ไม่ใช่ผลจริงสำหรับแมวของคุณ
>
> 📄 ขอบเขตและทิศทางฉบับเต็มอยู่ที่ **[docs/scope.md](docs/scope.md)** (แหล่งอ้างอิงหลัก)

## Tech stack

- **Next.js (App Router) + React + TypeScript** — modular monolith
- **Tailwind CSS v4** — styling + design tokens
- **Supabase** — PostgreSQL + Auth (Google/password) + Storage, บังคับสิทธิ์ด้วย RLS
- **Zod + React Hook Form** — validation ที่ใช้ร่วม client/server (server ตัดสิน)
- **Vitest** (unit/integration) + **Playwright** (E2E)

## เริ่มต้นพัฒนา

```bash
npm install
cp .env.example .env.local   # เติมค่า Supabase ของคุณ
npm run dev                  # http://localhost:3000
```

สคริปต์อื่น: `npm run build` · `npm run lint` · `npm run typecheck` · `npm run test` · `npm run test:e2e`

## โครงสร้าง

```text
src/
  app/                 Next.js routes
    (auth)/            login, register, forgot/reset-password
    auth/callback/     OAuth / email-link callback
    (member)/          my-cats, discover, desired-cats, breeding, profile
    api/v1/            API route handlers
  components/ui/       UI ร่วม
  features/            โค้ดแยกตามโดเมนฟีเจอร์
  server/              services / repositories / auth (ฝั่ง server เท่านั้น)
  lib/
    supabase/          client / server / admin / middleware
    validation/        Zod schemas
  domain/genetics/     engine บริสุทธิ์ (transmission, inference, constraints, ranking, …)
  types/database.ts    generated จาก Supabase schema
supabase/              migrations / seed / tests
tests/e2e/             Playwright
```

รายละเอียดแต่ละชั้นอยู่ในไฟล์ `README.md` ของโฟลเดอร์นั้น ๆ

## กติกาสำคัญ

- UI **ห้ามคำนวณ probability เอง** — เรียกผลจาก `domain/genetics` ผ่านชั้น `server`
- engine เป็นฟังก์ชันบริสุทธิ์ **ห้ามเรียก LLM/DB โดยตรง** (replay/ทดสอบได้)
- `probability` เป็น `null` หรืออยู่ใน `[0,1]` เท่านั้น — ห้ามใช้ `0` แทน "ไม่ทราบ"
- ห้าม commit ค่าลับ — ใช้ `.env.example` เป็นรายชื่อ key
