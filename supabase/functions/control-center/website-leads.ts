import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1';

type StaffAccess = {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: Set<string>;
};

type Reply = (body: unknown, status?: number) => Response;
type LeadStatus = 'new' | 'contacted' | 'closed';

const statuses = new Set<LeadStatus>(['new', 'contacted', 'closed']);

function can(access: StaffAccess, permission: string, reply: Reply) {
  return access.permissions.has(permission)
    ? null
    : reply({ error: 'You do not have permission to perform this action.' }, 403);
}

function present(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    serviceKey: row.service_key,
    serviceLabel: row.service_label,
    sourcePath: row.source_path,
    locale: row.locale,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastContactedAt: row.last_contacted_at,
  };
}

export async function websiteLeads(
  admin: SupabaseClient,
  access: StaffAccess,
  body: Record<string, unknown>,
  reply: Reply,
) {
  if (body.action === 'lead_list') {
    const denied = can(access, 'customer.read', reply);
    if (denied) return denied;
    const status = typeof body.status === 'string' ? body.status : 'all';
    if (status !== 'all' && !statuses.has(status as LeadStatus)) return reply({ error: 'Invalid lead status.' }, 400);

    let query = admin.from('website_callback_leads').select('*').order('created_at', { ascending: false }).limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;

    const { error: auditError } = await admin.from('audit_events').insert({
      actor_id: access.userId,
      actor_type: 'staff',
      action: 'WEBSITE_LEADS_VIEWED',
      entity_type: 'website_callback_lead',
      entity_id: null,
      new_value: { count: data?.length ?? 0, status },
      source: 'control-center-edge',
    });
    if (auditError) throw auditError;
    return reply({ leads: (data ?? []).map(present), generatedAt: new Date().toISOString() });
  }

  if (body.action === 'lead_update') {
    const denied = can(access, 'customer.update', reply);
    if (denied) return denied;
    const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : '';
    const status = typeof body.status === 'string' && statuses.has(body.status as LeadStatus) ? body.status as LeadStatus : null;
    if (!id || !status) return reply({ error: 'Invalid lead update.' }, 400);

    const { data: current, error: currentError } = await admin.from('website_callback_leads').select('*').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return reply({ error: 'Lead not found.' }, 404);

    const { data, error } = await admin.from('website_callback_leads').update({
      status,
      last_contacted_at: status === 'contacted' ? new Date().toISOString() : current.last_contacted_at,
      last_actor_id: access.userId,
    }).eq('id', id).eq('status', current.status).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return reply({ error: 'This enquiry changed in another session. Refresh and try again.' }, 409);

    const { error: auditError } = await admin.from('audit_events').insert({
      actor_id: access.userId,
      actor_type: 'staff',
      action: 'WEBSITE_LEAD_STATUS_UPDATED',
      entity_type: 'website_callback_lead',
      entity_id: id,
      old_value: { status: current.status },
      new_value: { status },
      source: 'control-center-edge',
    });
    if (auditError) throw auditError;
    return reply({ lead: present(data) });
  }

  return reply({ error: 'Unknown website lead action.' }, 400);
}
