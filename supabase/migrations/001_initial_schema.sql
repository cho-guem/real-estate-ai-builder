-- =============================================================
-- Migration: 001_initial_schema
-- Project:   Real Estate AI Builder
-- Idempotent: safe to run against databases where some objects
--             were created manually before migration history existed.
-- =============================================================

-- ─────────────────────────────────────────────
-- 0. ENUM TYPES
-- ─────────────────────────────────────────────

do $$
begin
  create type public.project_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────
-- 1. UTILITY: updated_at auto-trigger
-- ─────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 2. USERS TABLE
-- ─────────────────────────────────────────────

create table if not exists public.users (
  id           uuid        primary key references auth.users (id) on delete cascade,
  email        text        not null,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'users_set_updated_at'
      and tgrelid = 'public.users'::regclass
  ) then
    create trigger users_set_updated_at
      before update on public.users
      for each row execute function public.set_updated_at();
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 3. PROJECTS TABLE
-- ─────────────────────────────────────────────

create table if not exists public.projects (
  id          uuid                  primary key default gen_random_uuid(),
  user_id     uuid                  not null references public.users (id) on delete cascade,
  name        text                  not null,
  slug        text                  not null,
  description text,
  status      public.project_status not null default 'draft',
  config      jsonb                 not null default '{}'::jsonb,
  created_at  timestamptz           not null default now(),
  updated_at  timestamptz           not null default now(),
  constraint projects_slug_per_user unique (user_id, slug)
);

alter table public.projects
  add column if not exists description text;

alter table public.projects
  add column if not exists status public.project_status not null default 'draft';

alter table public.projects
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table public.projects
  add column if not exists created_at timestamptz not null default now();

alter table public.projects
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_slug_per_user'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_slug_per_user unique (user_id, slug);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'projects_set_updated_at'
      and tgrelid = 'public.projects'::regclass
  ) then
    create trigger projects_set_updated_at
      before update on public.projects
      for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

create index if not exists projects_slug_idx
  on public.projects (slug);

-- ─────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Users can view their own profile'
  ) then
    create policy "Users can view their own profile"
      on public.users for select
      using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.users for update
      using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can view their own projects'
  ) then
    create policy "Users can view their own projects"
      on public.projects for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can create projects'
  ) then
    create policy "Users can create projects"
      on public.projects for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can update their own projects'
  ) then
    create policy "Users can update their own projects"
      on public.projects for update
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can delete their own projects'
  ) then
    create policy "Users can delete their own projects"
      on public.projects for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- =============================================================
-- Done. Tables created or verified: users, projects
-- =============================================================
