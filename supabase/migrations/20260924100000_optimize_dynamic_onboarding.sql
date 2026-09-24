-- Cover foreign keys used by the onboarding engine and consolidate access to
-- business profiles into one SELECT policy.
create index if not exists ai_runs_intent_id_idx on public.ai_runs(intent_id);
create index if not exists ai_runs_user_id_idx on public.ai_runs(user_id);
create index if not exists business_intents_existing_business_id_idx on public.business_intents(existing_business_id);
create index if not exists business_intents_existing_establishment_id_idx on public.business_intents(existing_establishment_id);
create index if not exists business_members_user_id_idx on public.business_members(user_id);
create index if not exists business_registrations_certificate_document_id_idx on public.business_registrations(certificate_document_id);
create index if not exists business_registrations_establishment_id_idx on public.business_registrations(establishment_id);
create index if not exists business_registrations_catalog_id_idx on public.business_registrations(registration_catalog_id);
create index if not exists data_conflicts_business_id_idx on public.data_conflicts(business_id);
create index if not exists data_conflicts_intent_id_idx on public.data_conflicts(intent_id);
create index if not exists data_conflicts_resolved_by_idx on public.data_conflicts(resolved_by);
create index if not exists domain_events_business_id_idx on public.domain_events(business_id);
create index if not exists domain_events_intent_id_idx on public.domain_events(intent_id);
create index if not exists domain_events_user_id_idx on public.domain_events(user_id);
create index if not exists field_facts_business_id_idx on public.field_facts(business_id);
create index if not exists field_facts_establishment_id_idx on public.field_facts(establishment_id);
create index if not exists field_facts_identity_verification_id_idx on public.field_facts(identity_verification_id);
create index if not exists field_facts_intent_id_idx on public.field_facts(intent_id);
create index if not exists intent_workflow_packs_pack_id_idx on public.intent_workflow_packs(pack_id);
create index if not exists onboarding_sessions_user_id_idx on public.onboarding_sessions(user_id);

drop policy if exists business_profiles_member_read on public.business_profiles;
drop policy if exists businesses_owner_all on public.business_profiles;
create policy business_profiles_access_read on public.business_profiles
  for select to authenticated using (private.can_access_business(id));
create policy business_profiles_owner_insert on public.business_profiles
  for insert to authenticated with check (user_id=(select auth.uid()) or private.is_staff());
create policy business_profiles_owner_update on public.business_profiles
  for update to authenticated using (user_id=(select auth.uid()) or private.is_staff())
  with check (user_id=(select auth.uid()) or private.is_staff());
create policy business_profiles_owner_delete on public.business_profiles
  for delete to authenticated using (user_id=(select auth.uid()) or private.is_staff());
