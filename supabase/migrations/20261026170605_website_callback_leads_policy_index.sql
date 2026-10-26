-- The service-role-only policy documents the intended backend access boundary
-- for database linting; anon and authenticated retain no table privileges.
create policy website_callback_leads_service_role_all
  on public.website_callback_leads
  for all
  to service_role
  using (true)
  with check (true);

create index website_callback_leads_last_actor_idx
  on public.website_callback_leads(last_actor_id)
  where last_actor_id is not null;
