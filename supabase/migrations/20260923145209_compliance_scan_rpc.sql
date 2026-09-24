create or replace function public.run_compliance_scan(target_business_id uuid)
returns table (
  result_id uuid,
  service_id uuid,
  service_name text,
  service_slug text,
  status text,
  reason text,
  confidence numeric,
  source_url text,
  service_fee numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select b.user_id into owner_id
  from public.business_profiles b
  where b.id = target_business_id and b.deleted_at is null;

  if owner_id is null or (owner_id <> (select auth.uid()) and not (select private.is_staff())) then
    raise exception 'Business not found or access denied';
  end if;

  delete from public.compliance_results cr where cr.business_id = target_business_id;

  insert into public.compliance_results
    (business_id, service_id, rule_id, status, reason, confidence, missing_information, source_snapshot)
  select
    b.id,
    r.service_id,
    r.id,
    case
      when r.turnover_min is not null and b.annual_turnover is null then 'CHECK_REQUIRED'
      when r.employee_min is not null and b.employee_count is null then 'CHECK_REQUIRED'
      else r.result_status
    end,
    r.reason_template,
    case when b.annual_turnover is null or b.employee_count is null then 0.72 else 0.94 end,
    jsonb_strip_nulls(jsonb_build_array(
      case when r.turnover_min is not null and b.annual_turnover is null then 'annual_turnover' end,
      case when r.employee_min is not null and b.employee_count is null then 'employee_count' end
    )),
    jsonb_build_object(
      'rule_id', r.id,
      'rule_version', r.version,
      'source_url', r.source_url,
      'last_verified_at', r.last_verified_at
    )
  from public.business_profiles b
  join public.compliance_rules r on r.active
  left join lateral (
    select a.state, a.city
    from public.business_addresses a
    where a.business_id = b.id
    order by case a.type when 'principal' then 0 else 1 end, a.created_at
    limit 1
  ) location on true
  where b.id = target_business_id
    and (r.entity_type is null or lower(r.entity_type) = lower(coalesce(b.entity_type, b.constitution, '')))
    and (r.industry is null or lower(r.industry) = lower(coalesce(b.business_category, '')))
    and (r.subindustry is null or lower(r.subindustry) = lower(coalesce(b.business_subcategory, '')))
    and (r.state is null or lower(r.state) = lower(coalesce(location.state, '')))
    and (r.city is null or lower(r.city) = lower(coalesce(location.city, '')))
    and (r.turnover_min is null or b.annual_turnover is null or b.annual_turnover >= r.turnover_min)
    and (r.turnover_max is null or b.annual_turnover is null or b.annual_turnover <= r.turnover_max)
    and (r.employee_min is null or b.employee_count is null or b.employee_count >= r.employee_min)
    and (r.employee_max is null or b.employee_count is null or b.employee_count <= r.employee_max)
    and r.effective_from <= current_date
    and (r.effective_to is null or r.effective_to >= current_date)
  on conflict (business_id, service_id) do update set
    rule_id = excluded.rule_id,
    status = excluded.status,
    reason = excluded.reason,
    confidence = excluded.confidence,
    missing_information = excluded.missing_information,
    source_snapshot = excluded.source_snapshot,
    scanned_at = now();

  insert into public.audit_events (actor_id, actor_type, action, entity_type, entity_id, new_value, source)
  values ((select auth.uid()), 'customer', 'COMPLIANCE_SCAN_COMPLETED', 'business_profile', target_business_id,
    jsonb_build_object('result_count', (select count(*) from public.compliance_results where business_id = target_business_id)),
    'rules_engine');

  return query
  select cr.id, s.id, s.name, s.slug, cr.status, cr.reason, cr.confidence, r.source_url, s.service_fee
  from public.compliance_results cr
  join public.services s on s.id = cr.service_id
  left join public.compliance_rules r on r.id = cr.rule_id
  where cr.business_id = target_business_id
  order by case cr.status
    when 'REQUIRED' then 1
    when 'LIKELY_REQUIRED' then 2
    when 'CHECK_REQUIRED' then 3
    when 'RECOMMENDED' then 4
    when 'OPTIONAL' then 5
    else 6 end,
    s.name;
end;
$$;

revoke all on function public.run_compliance_scan(uuid) from public, anon;
grant execute on function public.run_compliance_scan(uuid) to authenticated;
