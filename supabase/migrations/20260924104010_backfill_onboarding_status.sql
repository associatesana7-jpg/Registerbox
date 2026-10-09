update public.profiles p
set onboarding_status = case
  when exists (select 1 from public.onboarding_sessions s where s.user_id=p.id and s.status='ACTIVE') then 'in_progress'
  when exists (select 1 from public.onboarding_sessions s where s.user_id=p.id and s.status='COMPLETED') then 'completed'
  when exists (select 1 from public.business_profiles b where b.user_id=p.id and b.deleted_at is null) then 'completed'
  else 'not_started'
end;
