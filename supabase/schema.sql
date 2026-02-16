-- OpenDash v1 baseline schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists prompt_harnesses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  system_prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists prompt_harnesses_project_id_idx
  on prompt_harnesses(project_id);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  name text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_project_id_idx on files(project_id);
create index if not exists files_name_idx on files(name);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists agent_activity (
  id bigserial primary key,
  agent_id uuid not null references agents(id) on delete cascade,
  action text not null,
  file_id uuid references files(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_activity_agent_id_idx on agent_activity(agent_id);
create index if not exists agent_activity_created_at_idx on agent_activity(created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists files_set_updated_at on files;
create trigger files_set_updated_at
before update on files
for each row
execute function set_updated_at();

drop trigger if exists prompt_harnesses_set_updated_at on prompt_harnesses;
create trigger prompt_harnesses_set_updated_at
before update on prompt_harnesses
for each row
execute function set_updated_at();
