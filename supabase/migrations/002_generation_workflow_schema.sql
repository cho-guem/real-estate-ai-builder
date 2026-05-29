-- =============================================================
-- Migration: 002_generation_workflow_schema
-- Purpose:   Durable multi-agent website generation foundation.
-- Idempotent: safe to run if tables/enums already exist.
-- =============================================================

do $$
begin
  create type public.generation_run_status as enum (
    'queued',
    'running',
    'waiting_for_user',
    'completed',
    'failed',
    'canceled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.generation_step_status as enum (
    'pending',
    'running',
    'completed',
    'failed',
    'skipped'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.website_artifact_type as enum (
    'benchmark',
    'seo',
    'design',
    'brand',
    'site_structure',
    'landing_page',
    'review'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.website_artifact_status as enum (
    'draft',
    'approved',
    'rejected',
    'superseded'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.generation_runs (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  user_id          uuid not null references public.users (id) on delete cascade,
  status           public.generation_run_status not null default 'queued',
  current_step_key text,
  started_at       timestamptz,
  completed_at     timestamptz,
  failed_at        timestamptz,
  error_message    text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'generation_runs_set_updated_at'
      and tgrelid = 'public.generation_runs'::regclass
  ) then
    create trigger generation_runs_set_updated_at
      before update on public.generation_runs
      for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists generation_runs_project_created_at_idx
  on public.generation_runs (project_id, created_at desc);

create index if not exists generation_runs_user_status_idx
  on public.generation_runs (user_id, status);

create table if not exists public.generation_steps (
  id                  uuid primary key default gen_random_uuid(),
  run_id              uuid not null references public.generation_runs (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  step_key            text not null,
  agent_role          text not null,
  status              public.generation_step_status not null default 'pending',
  order_index         integer not null,
  input               jsonb not null default '{}'::jsonb,
  output              jsonb,
  error_message       text,
  model               text,
  input_tokens        integer,
  output_tokens       integer,
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint generation_steps_run_step_key_unique unique (run_id, step_key),
  constraint generation_steps_order_index_nonnegative check (order_index >= 0)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'generation_steps_run_step_key_unique'
      and conrelid = 'public.generation_steps'::regclass
  ) then
    alter table public.generation_steps
      add constraint generation_steps_run_step_key_unique unique (run_id, step_key);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'generation_steps_order_index_nonnegative'
      and conrelid = 'public.generation_steps'::regclass
  ) then
    alter table public.generation_steps
      add constraint generation_steps_order_index_nonnegative check (order_index >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'generation_steps_set_updated_at'
      and tgrelid = 'public.generation_steps'::regclass
  ) then
    create trigger generation_steps_set_updated_at
      before update on public.generation_steps
      for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists generation_steps_run_order_idx
  on public.generation_steps (run_id, order_index);

create index if not exists generation_steps_project_status_idx
  on public.generation_steps (project_id, status);

create table if not exists public.website_artifacts (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  run_id              uuid not null references public.generation_runs (id) on delete cascade,
  step_id             uuid references public.generation_steps (id) on delete set null,
  artifact_type       public.website_artifact_type not null,
  status              public.website_artifact_status not null default 'draft',
  version             integer not null default 1,
  data                jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint website_artifacts_version_positive check (version > 0)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'website_artifacts_version_positive'
      and conrelid = 'public.website_artifacts'::regclass
  ) then
    alter table public.website_artifacts
      add constraint website_artifacts_version_positive check (version > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'website_artifacts_set_updated_at'
      and tgrelid = 'public.website_artifacts'::regclass
  ) then
    create trigger website_artifacts_set_updated_at
      before update on public.website_artifacts
      for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists website_artifacts_project_type_created_at_idx
  on public.website_artifacts (project_id, artifact_type, created_at desc);

create index if not exists website_artifacts_run_type_version_idx
  on public.website_artifacts (run_id, artifact_type, version desc);

alter table public.generation_runs enable row level security;
alter table public.generation_steps enable row level security;
alter table public.website_artifacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_runs'
      and policyname = 'Users can view their own generation runs'
  ) then
    create policy "Users can view their own generation runs"
      on public.generation_runs for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_runs'
      and policyname = 'Users can create their own generation runs'
  ) then
    create policy "Users can create their own generation runs"
      on public.generation_runs for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.projects
          where projects.id = generation_runs.project_id
          and projects.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_runs'
      and policyname = 'Users can update their own generation runs'
  ) then
    create policy "Users can update their own generation runs"
      on public.generation_runs for update
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_runs'
      and policyname = 'Users can delete their own generation runs'
  ) then
    create policy "Users can delete their own generation runs"
      on public.generation_runs for delete
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_steps'
      and policyname = 'Users can view their own generation steps'
  ) then
    create policy "Users can view their own generation steps"
      on public.generation_steps for select
      using (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = generation_steps.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_steps'
      and policyname = 'Users can create their own generation steps'
  ) then
    create policy "Users can create their own generation steps"
      on public.generation_steps for insert
      with check (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = generation_steps.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_steps'
      and policyname = 'Users can update their own generation steps'
  ) then
    create policy "Users can update their own generation steps"
      on public.generation_steps for update
      using (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = generation_steps.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_steps'
      and policyname = 'Users can delete their own generation steps'
  ) then
    create policy "Users can delete their own generation steps"
      on public.generation_steps for delete
      using (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = generation_steps.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'website_artifacts'
      and policyname = 'Users can view their own website artifacts'
  ) then
    create policy "Users can view their own website artifacts"
      on public.website_artifacts for select
      using (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = website_artifacts.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'website_artifacts'
      and policyname = 'Users can create their own website artifacts'
  ) then
    create policy "Users can create their own website artifacts"
      on public.website_artifacts for insert
      with check (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = website_artifacts.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'website_artifacts'
      and policyname = 'Users can update their own website artifacts'
  ) then
    create policy "Users can update their own website artifacts"
      on public.website_artifacts for update
      using (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = website_artifacts.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'website_artifacts'
      and policyname = 'Users can delete their own website artifacts'
  ) then
    create policy "Users can delete their own website artifacts"
      on public.website_artifacts for delete
      using (
        exists (
          select 1 from public.generation_runs
          where generation_runs.id = website_artifacts.run_id
          and generation_runs.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- =============================================================
-- Done. Workflow tables/enums/policies are created or verified.
-- =============================================================
