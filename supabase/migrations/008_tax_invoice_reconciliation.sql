-- Tax invoice reconciliation extension for the receiving MVP.

create table if not exists public.tax_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_name text,
  business_registration_number text,
  invoice_date date,
  total_supply_amount numeric not null default 0,
  total_vat numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'matched', 'mismatch', 'rejected')),
  file_url text,
  memo text,
  needs_review_fields jsonb not null default '{}'::jsonb,
  raw_ai_response jsonb,
  created_at timestamptz not null default now(),
  matched_at timestamptz
);

create table if not exists public.tax_invoice_items (
  id uuid primary key default gen_random_uuid(),
  tax_invoice_id uuid not null references public.tax_invoices(id) on delete cascade,
  item_name text,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  supply_amount numeric not null default 0,
  vat numeric not null default 0,
  total_amount numeric not null default 0,
  needs_review_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.receipt_invoice_matches (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  tax_invoice_id uuid not null references public.tax_invoices(id) on delete cascade,
  match_status text not null default 'confirmed' check (match_status in ('suggested', 'confirmed', 'mismatch')),
  match_score numeric not null default 0,
  difference_amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique(receipt_id, tax_invoice_id)
);

create index if not exists tax_invoices_status_created_at_idx
  on public.tax_invoices(status, created_at desc);

create index if not exists tax_invoice_items_invoice_id_idx
  on public.tax_invoice_items(tax_invoice_id);

create index if not exists receipt_invoice_matches_invoice_id_idx
  on public.receipt_invoice_matches(tax_invoice_id);

create index if not exists receipt_invoice_matches_receipt_id_idx
  on public.receipt_invoice_matches(receipt_id);

alter table public.tax_invoices enable row level security;
alter table public.tax_invoice_items enable row level security;
alter table public.receipt_invoice_matches enable row level security;

drop policy if exists "single user can read tax invoices" on public.tax_invoices;
drop policy if exists "single user can write tax invoices" on public.tax_invoices;
drop policy if exists "single user can read tax invoice items" on public.tax_invoice_items;
drop policy if exists "single user can write tax invoice items" on public.tax_invoice_items;
drop policy if exists "single user can read invoice matches" on public.receipt_invoice_matches;
drop policy if exists "single user can write invoice matches" on public.receipt_invoice_matches;

create policy "single user can read tax invoices"
  on public.tax_invoices for select
  using (true);

create policy "single user can write tax invoices"
  on public.tax_invoices for all
  using (true)
  with check (true);

create policy "single user can read tax invoice items"
  on public.tax_invoice_items for select
  using (true);

create policy "single user can write tax invoice items"
  on public.tax_invoice_items for all
  using (true)
  with check (true);

create policy "single user can read invoice matches"
  on public.receipt_invoice_matches for select
  using (true);

create policy "single user can write invoice matches"
  on public.receipt_invoice_matches for all
  using (true)
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tax-invoice-files',
  'tax-invoice-files',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
