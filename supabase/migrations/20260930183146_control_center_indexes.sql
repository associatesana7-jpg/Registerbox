-- Cover Control Center foreign keys reported by the Supabase performance advisor.
create index notification_preferences_business_id_idx on public.notification_preferences(business_id);
create index notification_runs_user_id_idx on public.notification_runs(user_id);
create index notification_runs_business_id_idx on public.notification_runs(business_id);
create index role_permissions_permission_id_idx on public.role_permissions(permission_id);
create index staff_invites_role_id_idx on public.staff_invites(role_id);
create index staff_invites_invited_by_idx on public.staff_invites(invited_by) where invited_by is not null;
create index staff_invites_accepted_by_idx on public.staff_invites(accepted_by) where accepted_by is not null;
create index staff_roles_assigned_by_idx on public.staff_roles(assigned_by) where assigned_by is not null;
create index user_notifications_business_id_idx on public.user_notifications(business_id) where business_id is not null;
