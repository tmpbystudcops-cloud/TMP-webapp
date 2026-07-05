-- ============================================================
-- TMP at NU — initial schema
-- Tables: products, orders, settings
-- Plus: top_spender view, updated_at trigger, RLS policies
-- ============================================================

-- ---------- products ----------
create table if not exists public.products (
  id             bigint generated always as identity primary key,
  name           text not null,
  description    text,
  price          numeric(10, 2) not null check (price > 0),
  original_price numeric(10, 2) check (original_price is null or original_price > 0),
  stock          integer not null default 0 check (stock >= 0),
  available      boolean not null default true,
  category       text not null default 'other'
                   check (category in ('drinks', 'chips', 'hot', 'sweets', 'healthy', 'other')),
  image_url      text,
  featured       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ---------- orders ----------
create table if not exists public.orders (
  id              bigint generated always as identity primary key,
  name            text not null,
  whatsapp        text not null,
  items           jsonb not null,
  total           numeric(10, 2) not null check (total > 0),
  transaction_id  text not null,
  status          text not null default 'Pending'
                    check (status in ('Pending', 'Ready', 'Picked Up')),
  unique_order_id text not null unique,
  created_at      timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_unique_order_id_idx on public.orders (unique_order_id);
create index if not exists orders_whatsapp_idx on public.orders (whatsapp);

-- ---------- settings ----------
create table if not exists public.settings (
  id               uuid primary key default gen_random_uuid(),
  shop_name        text not null default 'TMP at NU',
  upi_id           text not null default 'yourupi@bank',
  qr_code_url      text,
  tagline          text not null default 'Get your favorites delivered in minutes.',
  enable_quick_pay boolean not null default true,
  admin_password   text,
  orders_enabled   boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- updated_at trigger for settings ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_settings_updated_at on public.settings;
create trigger update_settings_updated_at
  before update on public.settings
  for each row
  execute function public.set_updated_at();

-- ---------- top_spender view ----------
-- Highest cumulative spend across all orders (single row).
create or replace view public.top_spender
  with (security_invoker = true) as
select
  whatsapp,
  (array_agg(name order by created_at desc))[1] as name,
  sum(total) as total
from public.orders
group by whatsapp
order by sum(total) desc
limit 1;

grant select on public.top_spender to anon, authenticated;

-- ---------- order_stats view (single-row dashboard aggregates, IST-aware) ----------
create or replace view public.order_stats
  with (security_invoker = true) as
select
  count(*) filter (where status = 'Pending') as pending_count,
  coalesce(sum(total) filter (where status = 'Picked Up'), 0) as total_revenue,
  coalesce(
    sum(total) filter (
      where status = 'Picked Up'
        and (created_at at time zone 'Asia/Kolkata')::date
            = (now() at time zone 'Asia/Kolkata')::date
    ),
    0
  ) as today_revenue,
  count(*) as total_orders
from public.orders;

grant select on public.order_stats to anon, authenticated;

-- ============================================================
-- Row Level Security
-- Public may SELECT everything (but not admin_password — a
-- restricted view handles that). All writes go through server
-- routes using the service_role key (which bypasses RLS).
-- ============================================================

alter table public.products enable row level security;
alter table public.orders   enable row level security;
alter table public.settings enable row level security;

-- products: public read
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products for select
  to anon, authenticated
  using (true);

-- orders: public read (order tracking has no auth)
drop policy if exists "Public can read orders" on public.orders;
create policy "Public can read orders"
  on public.orders for select
  to anon, authenticated
  using (true);

-- settings: public read
drop policy if exists "Public can read settings" on public.settings;
create policy "Public can read settings"
  on public.settings for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies are defined for anon/authenticated,
-- so all mutations are denied except via the service_role key.

-- ============================================================
-- Protect the admin password from public reads.
-- The browser reads settings through settings_public (no password);
-- the server reads the base table with the service_role key.
-- ============================================================
revoke select (admin_password) on public.settings from anon, authenticated;

create or replace view public.settings_public
  with (security_invoker = true) as
  select
    id,
    shop_name,
    upi_id,
    qr_code_url,
    tagline,
    enable_quick_pay,
    orders_enabled,
    created_at,
    updated_at
  from public.settings;

grant select on public.settings_public to anon, authenticated;

-- ============================================================
-- Realtime: broadcast INSERT/UPDATE on orders to the admin panel.
-- (RLS still applies to what each client is allowed to receive.)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
exception
  when undefined_object then
    -- publication doesn't exist (non-Supabase Postgres); safe to ignore
    null;
end $$;
