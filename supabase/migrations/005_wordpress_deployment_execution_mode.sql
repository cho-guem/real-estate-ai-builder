-- =============================================================
-- Migration: 005_wordpress_deployment_execution_mode
-- Project:   Real Estate AI Builder
-- Purpose:   Real deployment stages and retry tracking.
-- =============================================================

alter type public.wordpress_deployment_status add value if not exists 'validating';
alter type public.wordpress_deployment_status add value if not exists 'deploying';
alter type public.wordpress_deployment_status add value if not exists 'importing';
alter type public.wordpress_deployment_status add value if not exists 'configuring';

alter table public.wordpress_deployments
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_retry_at timestamptz;

create index if not exists wordpress_deployments_retry_idx
  on public.wordpress_deployments (status, next_retry_at, retry_count);

-- Existing fine-grained statuses remain valid for backward compatibility.
-- New worker orchestration uses:
-- queued -> validating -> deploying -> importing -> configuring -> completed
