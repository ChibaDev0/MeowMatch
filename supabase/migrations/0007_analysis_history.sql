-- P5-04. Server-computed phenotype snapshots only; DNA consent is NOT inferred from likes.
-- Keep ANALYSIS_HISTORY_ENABLED=false until live DB acceptance in docs/phase-5-history.md.
begin;

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  source_cat_id uuid not null,
  cat_ids uuid[] not null check (cardinality(cat_ids) > 0),
  envelope jsonb,
  created_at timestamptz not null default now(),
  invalidated_at timestamptz,
  unique (owner_id, idempotency_key),
  check ((envelope is null) = (invalidated_at is not null))
);
create index analysis_runs_owner_created on public.analysis_runs(owner_id, created_at desc);
create index analysis_runs_cats on public.analysis_runs using gin(cat_ids);
alter table public.analysis_runs enable row level security;
-- No user-facing table policy: all reads and writes go through the server RPC.
revoke all on public.analysis_runs from public, anon, authenticated;
grant select, insert, update, delete on public.analysis_runs to service_role;

-- Close legacy forged-result insertion; history is stored in analysis_runs from now on.
drop policy if exists breeding_insert_own on public.breeding_analyses;
revoke insert, update on public.breeding_analyses from anon, authenticated;

create function public.analysis_access(p_owner uuid, p_source uuid, p_cats uuid[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.cats where id = p_source and owner_id = p_owner)
    and not exists (
      select 1 from unnest(p_cats) as ids(id)
      where not exists (
        select 1 from public.cats c where c.id = ids.id
        and (c.owner_id = p_owner or (c.is_public and exists (
          select 1 from public.cat_likes l where l.cat_id = c.id and l.user_id = p_owner
        )))
      )
    );
$$;
revoke all on function public.analysis_access(uuid, uuid, uuid[]) from public, anon, authenticated;

-- service_role only: p_owner comes from validated auth.getUser(), never browser input.
-- Advisory lock + unique constraint make lookup/insert atomic per user/key.
create function public.analysis_history(
  p_owner uuid, p_key uuid default null, p_request_hash text default null,
  p_id uuid default null, p_envelope jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.analysis_runs;
  v_source uuid;
  v_cats uuid[];
  v_input jsonb;
begin
  if p_owner is null then raise exception 'access_denied'; end if;
  if p_id is not null then
    select * into r from public.analysis_runs where owner_id = p_owner and id = p_id;
  else
    if p_key is null or p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'invalid_request';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(p_owner::text || ':' || p_key::text, 0));
    select * into r from public.analysis_runs where owner_id = p_owner and idempotency_key = p_key;
    if found and r.request_hash <> p_request_hash then raise exception 'idempotency_conflict'; end if;
  end if;
  if r.id is not null then
    if r.invalidated_at is not null or not public.analysis_access(p_owner, r.source_cat_id, r.cat_ids) then
      raise exception 'access_denied';
    end if;
    return jsonb_build_object('id', r.id, 'envelope', r.envelope, 'created_at', r.created_at);
  end if;
  if p_id is not null or p_envelope is null then return null; end if;

  v_input := p_envelope #> '{snapshot,input}';
  if p_envelope #>> '{snapshot,kind}' = 'pair' then
    v_source := (v_input #>> '{a,catId}')::uuid;
    v_cats := array[v_source, (v_input #>> '{b,catId}')::uuid];
    if v_cats[1] = v_cats[2] then raise exception 'invalid_request'; end if;
    if v_input->'a' ? 'genotype' or v_input->'b' ? 'genotype' then raise exception 'dna_not_supported'; end if;
  elsif p_envelope #>> '{snapshot,kind}' = 'target_search' then
    v_source := (v_input #>> '{source,catId}')::uuid;
    select array_prepend(v_source, coalesce(array_agg((c->>'catId')::uuid), '{}'::uuid[]))
      into v_cats from jsonb_array_elements(v_input->'candidates') c;
    if v_input->'source' ? 'genotype' or exists (
      select 1 from jsonb_array_elements(v_input->'candidates') c where c ? 'genotype'
    ) then raise exception 'dna_not_supported'; end if;
  else raise exception 'invalid_request'; end if;
  if v_source is null or array_position(v_cats, null) is not null then raise exception 'invalid_request'; end if;
  -- Serialize save with hide/delete/unlike. Deterministic row order reduces deadlocks.
  perform id from public.cats where id = any(v_cats) order by id for share;
  perform cat_id from public.cat_likes where user_id = p_owner and cat_id = any(v_cats) order by cat_id for share;
  if not public.analysis_access(p_owner, v_source, v_cats) then raise exception 'access_denied'; end if;
  insert into public.analysis_runs(owner_id, idempotency_key, request_hash, source_cat_id, cat_ids, envelope)
    values (p_owner, p_key, p_request_hash, v_source, v_cats, p_envelope) returning * into r;
  return jsonb_build_object('id', r.id, 'envelope', r.envelope, 'created_at', r.created_at);
end;
$$;
revoke all on function public.analysis_history(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.analysis_history(uuid, uuid, text, uuid, jsonb) to service_role;

-- Retain a tombstone to prevent an old key from resurrecting revoked evidence.
-- Redact the entire payload including result/names; never return a partial stale ranking.
create function public.redact_analysis_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'cat_likes' then
    update public.analysis_runs set envelope = null, invalidated_at = now()
      where owner_id = old.user_id and cat_ids @> array[old.cat_id] and invalidated_at is null;
  elsif tg_op = 'DELETE' then
    update public.analysis_runs set envelope = null, invalidated_at = now()
      where cat_ids @> array[old.id] and invalidated_at is null;
  elsif new.owner_id is distinct from old.owner_id then
    update public.analysis_runs set envelope = null, invalidated_at = now()
      where cat_ids @> array[old.id] and invalidated_at is null;
  elsif old.is_public and not new.is_public then
    update public.analysis_runs set envelope = null, invalidated_at = now()
      where cat_ids @> array[old.id] and owner_id is distinct from new.owner_id and invalidated_at is null;
  end if;
  return old;
end;
$$;
revoke all on function public.redact_analysis_history() from public, anon, authenticated;
create trigger analysis_unlike after delete on public.cat_likes
  for each row execute function public.redact_analysis_history();
create trigger analysis_cat_delete after delete on public.cats
  for each row execute function public.redact_analysis_history();
create trigger analysis_cat_access after update of is_public, owner_id on public.cats
  for each row execute function public.redact_analysis_history();
commit;
