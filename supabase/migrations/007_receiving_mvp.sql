-- AI receiving and paper transaction statement registration MVP.
-- Single-user MVP: RLS is intentionally permissive. Tighten policies before production.

create extension if not exists "pgcrypto";

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  vendor_name text,
  receipt_date date,
  total_supply_amount numeric not null default 0,
  total_vat numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  file_url text,
  memo text,
  needs_review_fields jsonb not null default '{}'::jsonb,
  raw_ai_response jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  item_name text,
  specification text,
  quantity numeric not null default 0,
  unit text,
  unit_price numeric not null default 0,
  supply_amount numeric not null default 0,
  vat numeric not null default 0,
  total_amount numeric not null default 0,
  needs_review_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists receipts_status_created_at_idx
  on public.receipts(status, created_at desc);

create index if not exists receipt_items_receipt_id_idx
  on public.receipt_items(receipt_id);

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

drop policy if exists "single user can read receipts" on public.receipts;
drop policy if exists "single user can write receipts" on public.receipts;
drop policy if exists "single user can read receipt items" on public.receipt_items;
drop policy if exists "single user can write receipt items" on public.receipt_items;

create policy "single user can read receipts"
  on public.receipts for select
  using (true);

create policy "single user can write receipts"
  on public.receipts for all
  using (true)
  with check (true);

create policy "single user can read receipt items"
  on public.receipt_items for select
  using (true);

create policy "single user can write receipt items"
  on public.receipt_items for all
  using (true)
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipt-files',
  'receipt-files',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
