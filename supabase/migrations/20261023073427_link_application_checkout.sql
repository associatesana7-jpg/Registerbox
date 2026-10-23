-- Link service receipts to the submitted application without granting clients
-- authority to create receipts or mutate their application/payment association.
alter table public.service_checkout_orders
  add column application_id uuid references public.applications(id),
  add column provider_create_token uuid,
  add constraint service_checkout_orders_application_business_check
    check (application_id is null or business_id is not null);

create index service_checkout_orders_application_id_idx
  on public.service_checkout_orders(application_id);

-- A new browser request ID must never permit a second active payment for the
-- same application. Failed attempts remain in the history for investigation.
create unique index service_checkout_orders_application_active_unique
  on public.service_checkout_orders(application_id)
  where application_id is not null
    and status in ('created', 'pending_payment', 'authorized', 'paid');

comment on column public.service_checkout_orders.application_id is
  'Submitted registration this receipt pays for. The create-order function verifies its business owner and service package.';
comment on column public.service_checkout_orders.provider_create_token is
  'Server-only atomic claim preventing concurrent provider order creation for a linked application. An uncertain provider response keeps the claim for reconciliation.';

-- Existing owner-only SELECT RLS and server-only writes also cover new columns.
revoke insert, update, delete, truncate on public.service_checkout_orders from anon, authenticated;
