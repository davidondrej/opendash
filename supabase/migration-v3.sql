-- OpenDash v3 migration: align agents schema with spec
-- Run this once on existing databases.

begin;

-- Add new columns first
alter table if exists agents add column if not exists key_prefix text;
alter table if exists agents add column if not exists status text;
alter table if exists agents add column if not exists revoked_at timestamptz;
alter table if exists agents add column if not exists last_used_at timestamptz;

-- Migrate boolean is_active -> text status
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agents'
      and column_name = 'is_active'
  ) then
    update agents
    set status = case when is_active then 'active' else 'revoked' end
    where status is null;

    alter table agents drop column is_active;
  end if;
end;
$$;

-- Migrate last_seen_at -> last_used_at
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agents'
      and column_name = 'last_seen_at'
  ) then
    update agents
    set last_used_at = coalesce(last_used_at, last_seen_at)
    where last_seen_at is not null;

    alter table agents drop column last_seen_at;
  end if;
end;
$$;

-- Backfill key_prefix for legacy rows where raw key is unavailable
update agents
set key_prefix = 'legacy_' || substring(md5(id::text) from 1 for 8)
where key_prefix is null or key_prefix = '';

-- Ensure revoked rows have a revoked_at timestamp
update agents
set revoked_at = coalesce(revoked_at, now())
where status = 'revoked';

-- Enforce final constraints
update agents
set status = 'active'
where status is null or status = '';

alter table agents alter column key_prefix set not null;
alter table agents alter column status set not null;
alter table agents alter column status set default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_status_check'
  ) then
    alter table agents
      add constraint agents_status_check
      check (status in ('active', 'revoked'));
  end if;
end;
$$;

create index if not exists agents_key_prefix_idx on agents(key_prefix);
create index if not exists agents_status_idx on agents(status);

commit;
