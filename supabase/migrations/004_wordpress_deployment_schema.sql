-- =============================================================
-- Migration: 004_wordpress_deployment_schema
-- Project:   Real Estate AI Builder
-- Purpose:   Multi-client WordPress auto-deployment foundation.
-- =============================================================

create type public.wordpress_deployment_status as enum (
  'draft',
  'queued',
  'provisioning_wordpress',
  'installing_plugin',
  'running_setup',
  'importing_elementor',
  'connecting_domain',
  'completed',
  'failed',
  'canceled'
);

create type public.wordpress_deployment_step_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'skipped'
);

create table public.wordpress_sites (
  id                 uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  user_id             uuid not null references public.users (id) on delete cascade,
  provider            text not null default 'docker',
  site_url            text,
  admin_url           text,
  domain              text,
  wp_install_path     text,
  wp_version          text,
  status              public.wordpress_deployment_status not null default 'draft',
  admin_username      text,
  admin_email         text,
  encrypted_admin_password text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint wordpress_sites_project_unique unique (project_id)
);

create trigger wordpress_sites_set_updated_at
  before update on public.wordpress_sites
  for each row execute function public.set_updated_at();

create index wordpress_sites_user_created_at_idx
  on public.wordpress_sites (user_id, created_at desc);

create index wordpress_sites_status_idx
  on public.wordpress_sites (status);

create table public.wordpress_deployments (
  id                 uuid primary key default gen_random_uuid(),
  site_id             uuid references public.wordpress_sites (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  user_id             uuid not null references public.users (id) on delete cascade,
  status              public.wordpress_deployment_status not null default 'queued',
  requested_domain    text,
  provider            text not null default 'docker',
  started_at          timestamptz,
  completed_at        timestamptz,
  failed_at           timestamptz,
  error_message       text,
  input               jsonb not null default '{}'::jsonb,
  output              jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger wordpress_deployments_set_updated_at
  before update on public.wordpress_deployments
  for each row execute function public.set_updated_at();

create index wordpress_deployments_project_created_at_idx
  on public.wordpress_deployments (project_id, created_at desc);

create index wordpress_deployments_site_created_at_idx
  on public.wordpress_deployments (site_id, created_at desc);

create table public.wordpress_deployment_steps (
  id                 uuid primary key default gen_random_uuid(),
  deployment_id       uuid not null references public.wordpress_deployments (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  step_key            text not null,
  label               text not null,
  status              public.wordpress_deployment_step_status not null default 'pending',
  order_index         integer not null,
  started_at          timestamptz,
  completed_at        timestamptz,
  error_message       text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint wordpress_deployment_steps_unique unique (deployment_id, step_key),
  constraint wordpress_deployment_steps_order_nonnegative check (order_index >= 0)
);

create trigger wordpress_deployment_steps_set_updated_at
  before update on public.wordpress_deployment_steps
  for each row execute function public.set_updated_at();

create index wordpress_deployment_steps_deployment_order_idx
  on public.wordpress_deployment_steps (deployment_id, order_index);

alter table public.wordpress_sites enable row level security;
alter table public.wordpress_deployments enable row level security;
alter table public.wordpress_deployment_steps enable row level security;

create policy "Users can view their own wordpress sites"
  on public.wordpress_sites for select
  using (auth.uid() = user_id);

create policy "Users can create their own wordpress sites"
  on public.wordpress_sites for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects
      where projects.id = wordpress_sites.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update their own wordpress sites"
  on public.wordpress_sites for update
  using (auth.uid() = user_id);

create policy "Users can delete their own wordpress sites"
  on public.wordpress_sites for delete
  using (auth.uid() = user_id);

create policy "Users can view their own wordpress deployments"
  on public.wordpress_deployments for select
  using (auth.uid() = user_id);

create policy "Users can create their own wordpress deployments"
  on public.wordpress_deployments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects
      where projects.id = wordpress_deployments.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update their own wordpress deployments"
  on public.wordpress_deployments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own wordpress deployments"
  on public.wordpress_deployments for delete
  using (auth.uid() = user_id);

create policy "Users can view their own wordpress deployment steps"
  on public.wordpress_deployment_steps for select
  using (
    exists (
      select 1 from public.wordpress_deployments
      where wordpress_deployments.id = wordpress_deployment_steps.deployment_id
      and wordpress_deployments.user_id = auth.uid()
    )
  );

create policy "Users can create their own wordpress deployment steps"
  on public.wordpress_deployment_steps for insert
  with check (
    exists (
      select 1 from public.wordpress_deployments
      where wordpress_deployments.id = wordpress_deployment_steps.deployment_id
      and wordpress_deployments.user_id = auth.uid()
    )
  );

create policy "Users can update their own wordpress deployment steps"
  on public.wordpress_deployment_steps for update
  using (
    exists (
      select 1 from public.wordpress_deployments
      where wordpress_deployments.id = wordpress_deployment_steps.deployment_id
      and wordpress_deployments.user_id = auth.uid()
    )
  );

create policy "Users can delete their own wordpress deployment steps"
  on public.wordpress_deployment_steps for delete
  using (
    exists (
      select 1 from public.wordpress_deployments
      where wordpress_deployments.id = wordpress_deployment_steps.deployment_id
      and wordpress_deployments.user_id = auth.uid()
    )
  );

-- =============================================================
-- Done. Tables created: wordpress_sites, wordpress_deployments,
-- wordpress_deployment_steps.
-- =============================================================
