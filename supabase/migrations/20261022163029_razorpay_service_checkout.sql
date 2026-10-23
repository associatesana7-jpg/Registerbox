-- Razorpay payment authority is separate from customer-editable legacy orders.
-- Prices are snapshotted in paise by the create-order Edge Function; customers
-- can read their own receipt, but only the server can create or confirm payment.
create table public.service_checkout_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  business_id uuid references public.business_profiles(id) on delete set null,
  package_id text not null,
  package_title text not null,
  amount integer not null check (amount >= 100),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created'
    check (status in ('created', 'pending_payment', 'authorized', 'paid', 'failed')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  request_id uuid not null,
  trademark_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(trademark_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint service_checkout_orders_user_request_unique unique (user_id, request_id),
  constraint service_checkout_orders_provider_details_check check (
    status not in ('pending_payment', 'authorized', 'paid') or razorpay_order_id is not null
  ),
  constraint service_checkout_orders_payment_details_check check (
    status not in ('authorized', 'paid') or razorpay_payment_id is not null
  ),
  constraint service_checkout_orders_paid_at_check check (
    (status = 'paid' and paid_at is not null) or (status <> 'paid' and paid_at is null)
  )
);

create index service_checkout_orders_user_created_idx
  on public.service_checkout_orders (user_id, created_at desc);
create index service_checkout_orders_business_id_idx
  on public.service_checkout_orders (business_id);

create trigger set_updated_at
  before update on public.service_checkout_orders
  for each row execute function private.set_updated_at();

alter table public.service_checkout_orders enable row level security;

-- Revoke defaults explicitly, including TRUNCATE, which is not protected by RLS.
revoke all on public.service_checkout_orders from public, anon, authenticated, service_role;
grant select on public.service_checkout_orders to authenticated;
grant select, insert, update on public.service_checkout_orders to service_role;

create policy service_checkout_orders_owner_read
  on public.service_checkout_orders for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.service_checkout_orders is
  'Server-managed Razorpay service checkout receipts. Paid status requires a verified signature and captured payment checked by the verification Edge Function.';
comment on column public.service_checkout_orders.amount is
  'Exact checkout total in INR paise, sourced from the server package catalogue.';
comment on column public.service_checkout_orders.request_id is
  'Per-customer idempotency key. Repeated create-order calls reuse the same checkout.';
comment on column public.service_checkout_orders.trademark_json is
  'Applicant-supplied trademark details for this service purchase; never copied into provider notes.';
