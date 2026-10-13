-- MeowMatch — Moderation / report (งาน SAFE-01, Phase 6 "เตรียมเปิดใช้")
-- รายงาน listing ที่ไม่เหมาะสม + ซ่อนตาม role ผู้ดูแล + audit trail + abuse limits
-- สิทธิ์ผู้ดูแล "ตั้งจากฝั่งระบบเท่านั้น" ตาม 00-prd — client ยกระดับ role ตัวเองไม่ได้
-- อ้างอิง: MeowMatch/00-prd (รายงานข้อมูลไม่เหมาะสม), MeowMatch/03-tasks (SAFE-01), MeowMatch/08-api-security

-- ===================== profiles.role (ผู้ดูแล) =====================
-- member = ผู้ใช้ทั่วไป (ค่าเริ่มต้น); admin = ผู้ดูแลที่จัดการรายงาน/ข้อมูลอ้างอิง
alter table public.profiles
  add column if not exists role text not null default 'member'
    check (role in ('member', 'admin'));

comment on column public.profiles.role is
  'member/admin; ตั้ง admin ได้จากฝั่งระบบ (service_role) เท่านั้น — guard ด้วย trigger';

-- กันยกระดับสิทธิ์: policy profiles_update_own ยอมให้ผู้ใช้แก้แถวตัวเอง
-- ถ้าไม่กัน ผู้ใช้อาจตั้ง role='admin' ให้ตัวเองผ่าน update ตรง ๆ
-- trigger นี้เป็น SECURITY INVOKER (ค่าเริ่มต้น) → current_user = request role จริง
-- (authenticated/anon เปลี่ยน role ไม่ได้; มีแต่ service_role ฝั่งระบบที่เปลี่ยนได้)
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user <> 'service_role' then
    new.role := old.role; -- คงค่าเดิมเงียบ ๆ ไม่ให้ client เปลี่ยน
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_role on public.profiles;
create trigger trg_profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ===================== is_admin() =====================
-- ตรวจว่าผู้เรียก (auth.uid()) เป็น admin — ใช้ร่วมใน RLS/RPC
-- SECURITY DEFINER เพื่ออ่าน profiles ข้าม RLS (profiles select = เฉพาะแถวตัวเอง)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ===================== cats.moderation_status =====================
-- active = ปกติ; hidden = ผู้ดูแลซ่อนจากหน้าหาคู่ (ยังไม่ลบ เพื่อคง audit/ให้เจ้าของเห็น)
alter table public.cats
  add column if not exists moderation_status text not null default 'active'
    check (moderation_status in ('active', 'hidden'));

comment on column public.cats.moderation_status is
  'active/hidden; hidden = ผู้ดูแลระงับการแสดงในหน้าหาคู่ (เจ้าของยังเห็นในแมวของฉัน)';

-- index หน้าหาคู่: เฉพาะแมวที่เผยแพร่และไม่ถูกระงับ
drop index if exists public.cats_public_created_idx;
create index if not exists cats_public_active_created_idx
  on public.cats (created_at desc)
  where is_public and moderation_status = 'active';

-- RLS select: ซ่อนแมวที่ถูกระงับจากสมาชิกคนอื่น แต่เจ้าของ + admin ยังเห็น
-- เดิม (0006): using (is_public or auth.uid() = owner_id)
drop policy if exists cats_select_all on public.cats;
drop policy if exists cats_select_visible on public.cats;
create policy cats_select_visible on public.cats
  for select to authenticated
  using (
    (is_public and moderation_status = 'active')
    or auth.uid() = owner_id
    or public.is_admin()
  );

-- ===================== reports (SAFE-01) =====================
-- รายงานแมว/listing ที่ไม่เหมาะสม — เจ้าของรายงานรายงานของตัวเองได้, ผู้ดูแลเห็นทั้งหมด
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  cat_id      uuid not null references public.cats (id) on delete cascade,
  reason      text not null
              check (reason in ('inappropriate', 'spam', 'fake', 'animal_welfare', 'other')),
  detail      text check (detail is null or char_length(detail) <= 1000),
  status      text not null default 'open'
              check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  resolution  text check (resolution is null or char_length(resolution) <= 1000),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.reports is 'รายงาน listing ที่ไม่เหมาะสม (SAFE-01); ผู้ดูแลรีวิวและระงับได้';

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index if not exists reports_cat_idx on public.reports (cat_id);

-- abuse limit: หนึ่งผู้ใช้มีรายงาน "ที่ยังเปิดอยู่" ต่อแมวหนึ่งตัวได้ครั้งเดียว
-- (กดรายงานซ้ำ ๆ แมวตัวเดิมไม่สร้างแถวซ้ำ; รายงานใหม่ได้เมื่อรอบก่อนถูกปิดแล้ว)
create unique index if not exists reports_open_unique
  on public.reports (reporter_id, cat_id)
  where status in ('open', 'reviewing');

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

-- insert: ผู้รายงานต้องเป็นตัวเอง และห้ามรายงานแมวของตัวเอง (seed owner_id NULL รายงานได้)
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.cats c
      where c.id = cat_id and c.owner_id is distinct from auth.uid()
    )
  );

-- select: ผู้รายงานเห็นรายงานของตัวเอง; ผู้ดูแลเห็นทั้งหมด
drop policy if exists reports_select_own_or_admin on public.reports;
create policy reports_select_own_or_admin on public.reports
  for select to authenticated
  using (auth.uid() = reporter_id or public.is_admin());

-- update/delete ตรงจาก client: ไม่เปิด — การเปลี่ยนสถานะทำผ่าน RPC resolve_report เท่านั้น
-- (คง audit; กัน reporter แก้สถานะเอง)

-- ===================== moderation_actions (audit) =====================
-- บันทึกการกระทำของผู้ดูแลทุกครั้ง (ใครทำอะไรกับรายงาน/แมวไหน เมื่อไร)
create table if not exists public.moderation_actions (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid references public.reports (id) on delete set null,
  cat_id     uuid references public.cats (id) on delete set null,
  actor_id   uuid not null references auth.users (id) on delete cascade,
  action     text not null
             check (action in ('hide', 'unhide', 'dismiss', 'reviewing', 'reopen')),
  note       text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

comment on table public.moderation_actions is 'audit การกระทำของผู้ดูแล (SAFE-01)';

create index if not exists moderation_actions_report_idx on public.moderation_actions (report_id, created_at desc);

alter table public.moderation_actions enable row level security;

-- อ่านได้เฉพาะผู้ดูแล; insert ทำผ่าน RPC resolve_report (security definer) เท่านั้น
drop policy if exists moderation_actions_select_admin on public.moderation_actions;
create policy moderation_actions_select_admin on public.moderation_actions
  for select to authenticated using (public.is_admin());

-- ===================== resolve_report RPC =====================
-- ทางเดียวในการเปลี่ยนสถานะรายงาน/ระงับแมว — ตรวจ is_admin() ภายใน (ป้องกันซ้อน RLS)
-- ทำแบบ transaction เดียว: อัปเดต report + (ระงับ/คืน) แมว + บันทึก audit
--   decision: 'hide' | 'unhide' | 'dismiss' | 'reviewing' | 'reopen'
create or replace function public.resolve_report(
  p_report_id uuid,
  p_decision  text,
  p_note      text default null
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
  v_actor  uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'forbidden: ต้องเป็นผู้ดูแลเท่านั้น' using errcode = '42501';
  end if;
  if p_decision not in ('hide', 'unhide', 'dismiss', 'reviewing', 'reopen') then
    raise exception 'invalid decision: %', p_decision using errcode = '22023';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  -- ปรับสถานะรายงานตามคำตัดสิน
  update public.reports
  set status = case p_decision
        when 'hide'      then 'actioned'
        when 'dismiss'   then 'dismissed'
        when 'reviewing' then 'reviewing'
        when 'unhide'    then 'actioned'
        when 'reopen'    then 'open'
      end,
      resolution = coalesce(p_note, resolution),
      resolved_by = case when p_decision in ('reviewing', 'reopen') then null else v_actor end,
      resolved_at = case when p_decision in ('reviewing', 'reopen') then null else now() end
  where id = p_report_id
  returning * into v_report;

  -- ระงับ/คืนการแสดงของแมว (เฉพาะ hide/unhide)
  if p_decision = 'hide' then
    update public.cats set moderation_status = 'hidden' where id = v_report.cat_id;
  elsif p_decision = 'unhide' then
    update public.cats set moderation_status = 'active' where id = v_report.cat_id;
  end if;

  -- audit
  insert into public.moderation_actions (report_id, cat_id, actor_id, action, note)
  values (p_report_id, v_report.cat_id, v_actor, p_decision, p_note);

  return v_report;
end;
$$;

revoke all on function public.resolve_report(uuid, text, text) from public, anon;
grant execute on function public.resolve_report(uuid, text, text) to authenticated;
