do $$
begin
  create type public.deployment_mode as enum ('managed_hosting', 'existing_hosting');
exception
  when duplicate_object then null;
end $$;

alter table public.projects
  add column if not exists deployment_mode public.deployment_mode not null default 'managed_hosting';

create index if not exists idx_projects_deployment_mode
  on public.projects(deployment_mode);
