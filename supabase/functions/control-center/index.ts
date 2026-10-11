import { createClient } from 'npm:@supabase/supabase-js@2.117.1';

const allowedOrigins = new Set([
  'https://admin.registerbox.in',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]);

function cors(request: Request) {
  const origin = request.headers.get('Origin');
  const allowed = origin && allowedOrigins.has(origin) ? origin : 'https://admin.registerbox.in';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

type StaffAccess = {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: Set<string>;
};

async function authenticate(request: Request, admin: ReturnType<typeof createClient>): Promise<StaffAccess | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const env = Deno.env.toObject();
  const authClient = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth, error: authError } = await authClient.auth.getUser(authorization.slice(7));
  if (authError || !auth.user?.email) return null;

  const { data: staff, error: staffError } = await admin
    .from('staff_profiles')
    .select('user_id,email,display_name,status')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (staffError || !staff || staff.status !== 'active' || staff.email !== auth.user.email.toLowerCase()) return null;

  const { data: assignments, error: assignmentError } = await admin
    .from('staff_roles')
    .select('roles(key,role_permissions(permissions(key)))')
    .eq('staff_user_id', auth.user.id);
  if (assignmentError || !assignments?.length) return null;

  const roles = new Set<string>();
  const permissions = new Set<string>();
  for (const assignment of assignments as unknown as { roles: { key: string; role_permissions: { permissions: { key: string } | null }[] } | null }[]) {
    if (!assignment.roles) continue;
    roles.add(assignment.roles.key);
    for (const link of assignment.roles.role_permissions ?? []) {
      if (link.permissions?.key) permissions.add(link.permissions.key);
    }
  }

  return {
    userId: auth.user.id,
    email: staff.email,
    displayName: staff.display_name || staff.email.split('@')[0],
    roles: [...roles],
    permissions,
  };
}

function requirePermission(request: Request, access: StaffAccess, key: string) {
  if (!access.permissions.has(key)) return json(request, { error: 'You do not have permission to perform this action.' }, 403);
  return null;
}

function compact(value: unknown, fallback = '—', max = 140) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : fallback;
}

function mask(value: unknown, visible = 4) {
  const normalized = compact(value, '');
  if (!normalized) return 'Not provided';
  if (normalized.includes('@')) {
    const [name, domain] = normalized.split('@');
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(3, name.length - 2))}@${domain}`;
  }
  if (normalized.length <= visible) return '*'.repeat(normalized.length);
  return `${'*'.repeat(Math.min(8, normalized.length - visible))}${normalized.slice(-visible)}`;
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

type DirectoryRow = {
  id: string;
  businessId?: string;
  kind: string;
  title: string;
  subtitle: string;
  status: string;
  fields: { label: string; value: string }[];
  canOpenDocument?: boolean;
};

async function directory(request: Request, admin: ReturnType<typeof createClient>, access: StaffAccess, section: string, page = 0) {
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return json(request, { error: 'Invalid page.' }, 400);
  const start = page * 100;
  let permission = 'dashboard.read';
  if (section === 'customers') permission = 'customer.read';
  if (['businesses', 'licenses', 'intents'].includes(section)) permission = 'business.read';
  if (['applications','drafts'].includes(section)) permission = 'application.read';
  if (section === 'documents') permission = 'document.read';
  if (section === 'audit') permission = 'security.audit_read';
  if (['actions', 'queries', 'sla'].includes(section)) permission = 'application.read';
  if (['ai', 'exceptions', 'security', 'integrations'].includes(section)) permission = 'security.audit_read';
  if (section === 'finance') permission = 'payment.read';
  if (section === 'notifications') permission = 'notification.manage';
  const denied = requirePermission(request, access, permission);
  if (denied) return denied;

  let rows: DirectoryRow[] = [];
  if (section === 'customers') {
    const [{ data: profiles, error }, { data: businesses, error: businessError }] = await Promise.all([
      admin.from('profiles').select('id,full_name,email,phone,created_at').eq('role', 'customer').order('created_at', { ascending: false }).range(start, start + 99),
      admin.from('business_profiles').select('id,user_id').is('deleted_at', null),
    ]);
    if (error || businessError) throw error || businessError;
    const businessCounts = new Map<string, number>();
    const firstBusiness = new Map<string, string>();
    for (const business of businesses ?? []) {
      businessCounts.set(business.user_id, (businessCounts.get(business.user_id) ?? 0) + 1);
      if (!firstBusiness.has(business.user_id)) firstBusiness.set(business.user_id, business.id);
    }
    rows = (profiles ?? []).map((profile) => {
      return {
        id: profile.id,
        businessId: firstBusiness.get(profile.id),
        kind: 'Customer',
        title: compact(profile.full_name, 'Customer'),
        subtitle: mask(profile.email),
        status: 'Registered',
        fields: [
          { label: 'Customer ID', value: `CUS-${shortId(profile.id)}` },
          { label: 'Phone', value: mask(profile.phone) },
          { label: 'Businesses', value: String(businessCounts.get(profile.id) ?? 0) },
          { label: 'Joined', value: new Date(profile.created_at).toLocaleDateString('en-IN') },
        ],
      };
    });
  } else if (section === 'businesses') {
    const { data, error } = await admin.from('business_profiles').select('id,user_id,legal_name,trade_name,entity_type,business_category,status,pan,gstin,created_at').is('deleted_at', null).order('updated_at', { ascending: false }).range(start, start + 99);
    if (error) throw error;
    const ids = (data ?? []).map((item) => item.id);
    const [documents, registrations, applications] = await Promise.all([
      ids.length ? admin.from('documents').select('business_id').in('business_id', ids).is('deleted_at', null) : Promise.resolve({ data: [], error: null }),
      ids.length ? admin.from('business_registrations').select('business_id').in('business_id', ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? admin.from('applications').select('business_id').in('business_id', ids).is('deleted_at', null) : Promise.resolve({ data: [], error: null }),
    ]);
    const countByBusiness = (list: { business_id: string }[] | null) => {
      const counts = new Map<string, number>();
      for (const item of list ?? []) counts.set(item.business_id, (counts.get(item.business_id) ?? 0) + 1);
      return counts;
    };
    if (documents.error || registrations.error || applications.error) throw documents.error || registrations.error || applications.error;
    const documentCounts = countByBusiness(documents.data);
    const registrationCounts = countByBusiness(registrations.data);
    const applicationCounts = countByBusiness(applications.data);
    rows = (data ?? []).map((business) => ({
      id: business.id, businessId: business.id,
      kind: 'Business',
      title: compact(business.trade_name || business.legal_name, 'Unnamed business'),
      subtitle: `${compact(business.entity_type, 'Entity pending')} · ${compact(business.business_category, 'Category pending')}`,
      status: compact(business.status, 'draft'),
      fields: [
        { label: 'Business ID', value: `BUS-${shortId(business.id)}` },
        { label: 'PAN', value: mask(business.pan) },
        { label: 'GSTIN', value: mask(business.gstin) },
        { label: 'Documents', value: String(documentCounts.get(business.id) ?? 0) },
        { label: 'Registrations', value: String(registrationCounts.get(business.id) ?? 0) },
        { label: 'Applications', value: String(applicationCounts.get(business.id) ?? 0) },
      ],
    }));
  } else if (section === 'drafts') {
    const { data, error } = await admin.from('business_profiles').select('id,legal_name,trade_name,questionnaire,updated_at').is('deleted_at',null).order('updated_at',{ascending:false}).range(start, start + 99);
    if (error) throw error;
    const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    rows = (data ?? []).flatMap((business) => Object.entries(object(object(business.questionnaire).application_drafts)).map(([category,value]) => {
      const draft = object(value);
      const answers = object(draft.answers);
      return {
        id: `${business.id}:${category}`, businessId: business.id, kind:'Application draft',
        title: `${category.replaceAll('_',' ')} · ${compact(business.trade_name || business.legal_name,'Business')}`,
        subtitle:'Customer-saved draft • not a government submission', status:compact(draft.status,'draft'),
        fields:[{label:'Last saved',value:compact(draft.updated_at,business.updated_at)}, ...Object.entries(answers).filter(([,answer])=>['string','number','boolean'].includes(typeof answer)).slice(0,100).map(([key,answer])=>({
          label:key.replaceAll('_',' '),
          value:/password|secret|token|otp|aadhaar/i.test(key)?'Restricted':/pan|gstin|phone|mobile|email|account_number/i.test(key)?mask(String(answer)):compact(String(answer),'Not answered',500),
        }))],
      };
    }));
  } else if (section === 'applications') {
    const { data, error } = await admin.from('applications').select('id,business_id,application_number,status,priority,progress_percentage,government_reference,submission_mode,sla_due_at,created_at,business_profiles(legal_name,trade_name),services(name,government_authority)').is('deleted_at', null).order('updated_at', { ascending: false }).range(start, start + 99);
    if (error) throw error;
    rows = (data ?? []).map((application) => {
      const business = application.business_profiles as unknown as { legal_name: string | null; trade_name: string | null } | null;
      const service = application.services as unknown as { name: string; government_authority: string | null } | null;
      return {
        id: application.id,
        businessId: application.business_id,
        kind: 'Application',
        title: compact(application.application_number, `APP-${shortId(application.id)}`),
        subtitle: `${compact(business?.trade_name || business?.legal_name, 'Business')} · ${compact(service?.name, 'Service')}`,
        status: compact(application.status),
        fields: [
          { label: 'Priority', value: compact(application.priority) },
          { label: 'Progress', value: `${application.progress_percentage}%` },
          { label: 'Mode', value: compact(application.submission_mode) },
          { label: 'Authority', value: compact(service?.government_authority) },
          { label: 'Government ref', value: compact(application.government_reference, 'Not submitted') },
          { label: 'SLA', value: application.sla_due_at ? new Date(application.sla_due_at).toLocaleString('en-IN') : 'Not set' },
        ],
      };
    });
  } else if (section === 'documents') {
    const { data, error } = await admin.from('documents').select('id,business_id,type,original_filename,mime_type,source,uploaded_at,expiry_date,verification_status,ocr_status,confidence,business_profiles(legal_name,trade_name)').is('deleted_at', null).order('uploaded_at', { ascending: false }).range(start, start + 99);
    if (error) throw error;
    rows = (data ?? []).map((document) => {
      const business = document.business_profiles as unknown as { legal_name: string | null; trade_name: string | null } | null;
      return {
        id: document.id, businessId: document.business_id,
        kind: 'Document',
        title: compact(document.original_filename, compact(document.type, 'Document')),
        subtitle: `${compact(business?.trade_name || business?.legal_name, 'Business')} · ${compact(document.type)}`,
        status: compact(document.verification_status, 'pending'),
        canOpenDocument: access.permissions.has('document.download'),
        fields: [
          { label: 'Uploaded', value: new Date(document.uploaded_at).toLocaleString('en-IN') },
          { label: 'Source', value: compact(document.source) },
          { label: 'OCR', value: compact(document.ocr_status) },
          { label: 'Type', value: compact(document.mime_type) },
          { label: 'Confidence', value: document.confidence == null ? 'Not scored' : `${Math.round(Number(document.confidence) * 100)}%` },
          { label: 'Expiry', value: document.expiry_date ? new Date(`${document.expiry_date}T00:00:00Z`).toLocaleDateString('en-IN') : 'Not provided' },
        ],
      };
    });
  } else if (section === 'licenses') {
    const [licenses, registrations] = await Promise.all([
      admin.from('licenses').select('id,licence_number,issue_date,expiry_date,issuing_authority,status,verification_status,business_profiles(legal_name,trade_name),services(name)').order('updated_at', { ascending: false }).range(start, start + 99),
      admin.from('business_registrations').select('id,registration_number,status,issue_date,expiry_date,source,verification_source,business_profiles(legal_name,trade_name),registration_catalog(name,authority)').order('updated_at', { ascending: false }).range(start, start + 99),
    ]);
    if (licenses.error || registrations.error) throw licenses.error || registrations.error;
    const licenseRows = (licenses.data ?? []).map((license) => {
      const business = license.business_profiles as unknown as { legal_name: string | null; trade_name: string | null } | null;
      const service = license.services as unknown as { name: string } | null;
      return {
        id: license.id, kind: 'Licence', title: compact(service?.name, 'Licence'),
        subtitle: compact(business?.trade_name || business?.legal_name, 'Business'), status: compact(license.status),
        fields: [
          { label: 'Number', value: mask(license.licence_number) },
          { label: 'Authority', value: compact(license.issuing_authority) },
          { label: 'Verification', value: compact(license.verification_status) },
          { label: 'Issued', value: license.issue_date ? new Date(`${license.issue_date}T00:00:00Z`).toLocaleDateString('en-IN') : 'Not provided' },
          { label: 'Expires', value: license.expiry_date ? new Date(`${license.expiry_date}T00:00:00Z`).toLocaleDateString('en-IN') : 'No expiry recorded' },
        ],
      };
    });
    const registrationRows = (registrations.data ?? []).map((registration) => {
      const business = registration.business_profiles as unknown as { legal_name: string | null; trade_name: string | null } | null;
      const catalog = registration.registration_catalog as unknown as { name: string; authority: string } | null;
      return {
        id: registration.id, kind: 'Registration', title: compact(catalog?.name, 'Registration'),
        subtitle: compact(business?.trade_name || business?.legal_name, 'Business'), status: compact(registration.status),
        fields: [
          { label: 'Number', value: mask(registration.registration_number) },
          { label: 'Authority', value: compact(catalog?.authority) },
          { label: 'Source', value: compact(registration.verification_source || registration.source) },
          { label: 'Issued', value: registration.issue_date ? new Date(`${registration.issue_date}T00:00:00Z`).toLocaleDateString('en-IN') : 'Not provided' },
          { label: 'Expires', value: registration.expiry_date ? new Date(`${registration.expiry_date}T00:00:00Z`).toLocaleDateString('en-IN') : 'No expiry recorded' },
        ],
      };
    });
    rows = [...licenseRows, ...registrationRows];
  } else if (section === 'intents') {
    const { data, error } = await admin.from('business_intents').select('id,intent_type,raw_user_input,industry,subindustry,location_state,location_city,status,ai_confidence,classification_source,created_at,business_profiles:existing_business_id(legal_name,trade_name)').order('updated_at', { ascending: false }).range(start, start + 99);
    if (error) throw error;
    rows = (data ?? []).map((intent) => {
      const business = intent.business_profiles as unknown as { legal_name: string | null; trade_name: string | null } | null;
      return {
        id: intent.id, kind: 'Business intent', title: compact(intent.intent_type).replaceAll('_', ' '),
        subtitle: compact(intent.raw_user_input, 'No customer description', 180), status: compact(intent.status),
        fields: [
          { label: 'Business', value: compact(business?.trade_name || business?.legal_name, 'New business') },
          { label: 'Industry', value: compact(intent.industry) },
          { label: 'Location', value: [intent.location_city, intent.location_state].filter(Boolean).join(', ') || 'Not provided' },
          { label: 'Classification', value: compact(intent.classification_source) },
          { label: 'AI confidence', value: intent.ai_confidence == null ? 'Not scored' : `${Math.round(Number(intent.ai_confidence) * 100)}%` },
          { label: 'Created', value: new Date(intent.created_at).toLocaleString('en-IN') },
        ],
      };
    });
  } else if (section === 'audit') {
    const { data, error } = await admin.from('audit_events').select('id,actor_type,action,entity_type,entity_id,source,created_at').order('created_at', { ascending: false }).range(start, start + 99);
    if (error) throw error;
    rows = (data ?? []).map((event) => ({
      id: event.id, kind: 'Audit event', title: compact(event.action).replaceAll('_', ' '),
      subtitle: `${compact(event.actor_type)} · ${compact(event.source, 'unknown source')}`, status: 'Recorded',
      fields: [
        { label: 'Entity', value: compact(event.entity_type) },
        { label: 'Entity ID', value: event.entity_id ? shortId(event.entity_id) : 'Not applicable' },
        { label: 'Occurred', value: new Date(event.created_at).toLocaleString('en-IN') },
      ],
    }));
  } else if (['actions', 'queries', 'sla', 'ai', 'exceptions', 'finance', 'notifications', 'security', 'integrations'].includes(section)) {
    const configs: Record<string, { table: string; columns: string; date: string; title: string; status: string; fields: string[] }> = {
      actions: { table:'customer_actions', columns:'id,title,type,status,priority,expires_at,created_at', date:'created_at', title:'title', status:'status', fields:['type','priority','expires_at','created_at'] },
      queries: { table:'government_queries', columns:'id,application_id,status,classification,received_at,deadline,response_submitted_at', date:'received_at', title:'classification', status:'status', fields:['application_id','deadline','received_at','response_submitted_at'] },
      sla: { table:'applications', columns:'id,application_number,status,priority,sla_due_at,progress_percentage,updated_at', date:'updated_at', title:'application_number', status:'status', fields:['priority','sla_due_at','progress_percentage','updated_at'] },
      ai: { table:'ai_runs', columns:'id,operation,model,status,latency_ms,created_at', date:'created_at', title:'operation', status:'status', fields:['model','latency_ms','created_at'] },
      exceptions: { table:'ai_runs', columns:'id,operation,model,status,latency_ms,created_at', date:'created_at', title:'operation', status:'status', fields:['model','latency_ms','created_at'] },
      finance: { table:'payments', columns:'id,provider,amount,currency,status,paid_at,created_at,refund_status', date:'created_at', title:'provider', status:'status', fields:['amount','currency','paid_at','refund_status'] },
      notifications: { table:'notification_runs', columns:'id,channel,status,created_at', date:'created_at', title:'channel', status:'status', fields:['created_at'] },
      security: { table:'staff_profiles', columns:'user_id,display_name,status,created_at', date:'created_at', title:'display_name', status:'status', fields:['created_at'] },
      integrations: { table:'gst_connections', columns:'id,status,expires_at,updated_at', date:'updated_at', title:'status', status:'status', fields:['expires_at','updated_at'] },
    };
    const config = configs[section];
    let query = admin.from(config.table).select(config.columns).order(config.date, { ascending:false }).range(start, start + 99);
    if (section === 'exceptions') query = query.eq('status','FAILED');
    if (section === 'sla') query = query.is('deleted_at',null).not('sla_due_at','is',null).not('status','in','(APPROVED,REJECTED,CANCELLED)').lte('sla_due_at',new Date(Date.now()+14400000).toISOString());
    const { data, error } = await query;
    if (error) throw error;
    rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
      id: String(row.id ?? row.user_id), kind: section,
      title: compact(row[config.title], `${section.toUpperCase()}-${shortId(String(row.id ?? row.user_id))}`),
      subtitle: `${config.table.replaceAll('_',' ')} · ${shortId(String(row.id ?? row.user_id))}`,
      status: compact(row[config.status]),
      fields: config.fields.map((field) => ({ label:field.replaceAll('_',' '), value: row[field] == null ? 'Not recorded' : String(row[field]).slice(0,180) })),
    }));
  } else {
    return json(request, { error: 'Unsupported Control Center section.' }, 400);
  }

  return json(request, { section, rows, count: rows.length, page, hasMore: rows.length >= 100 || section === 'drafts', generatedAt: new Date().toISOString() });
}

async function filingWorkspace(request: Request, admin: ReturnType<typeof createClient>, access: StaffAccess, businessId: string, reason?: string) {
  for (const permission of ['business.read','application.read','document.read']) {
    const denied = requirePermission(request,access,permission);
    if (denied) return denied;
  }
  if (typeof businessId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(businessId)) return json(request,{error:'Choose a valid business.'},400);
  const reveal = typeof reason === 'string' && reason.trim().length >= 12 && reason.trim().length <= 240;
  if (reason !== undefined && !reveal) return json(request,{error:'Provide a 12–240 character reason for revealing filing details.'},400);
  if (reveal) {
    const denied = requirePermission(request,access,'identity.read_full');
    if (denied) return denied;
  }
  const {data:business,error} = await admin.from('business_profiles').select('id,user_id,legal_name,trade_name,entity_type,constitution,pan,gstin,cin,udyam_number,email,phone,business_category,business_subcategory,annual_turnover,employee_count,business_start_date,questionnaire,updated_at').eq('id',businessId).is('deleted_at',null).maybeSingle();
  if (error) throw error;
  if (!business) return json(request,{error:'Business not found.'},404);
  const results = await Promise.all([
    admin.from('documents').select('id,type,original_filename,verification_status,ocr_status,source,uploaded_at,expiry_date').eq('business_id',businessId).is('deleted_at',null).order('uploaded_at',{ascending:false}).limit(500),
    admin.from('business_addresses').select('id,type,address_line_1,address_line_2,city,district,state,pincode,ownership_type,verified').eq('business_id',businessId).limit(100),
    admin.from('business_people').select('id,type,name,mobile,email,pan,din,designation,ownership_percentage').eq('business_id',businessId).limit(100),
    admin.from('applications').select('id,application_number,status,government_reference,progress_percentage,created_at,services(name)').eq('business_id',businessId).is('deleted_at',null).order('created_at',{ascending:false}).limit(100),
    admin.from('business_registrations').select('id,registration_number,status,expiry_date,registration_catalog(name)').eq('business_id',businessId).limit(100),
    admin.from('licenses').select('id,licence_number,status,expiry_date,services(name)').eq('business_id',businessId).limit(100),
    admin.from('profiles').select('full_name,email,phone').eq('id',business.user_id).maybeSingle(),
  ]);
  const failure=results.find(result=>result.error)?.error;
  if(failure)throw failure;
  // Contact details are needed for case handling; identity identifiers remain masked until revealed.
  const sensitive = /pan|gstin|passport|din$|cin$|udyam|registration_number|licence_number|account_number/i;
  const forbidden = /password|secret|token|otp|aadhaar|aadhar/i;
  function sanitize(value: unknown, key = '', depth = 0): unknown {
    if(forbidden.test(key))return 'Restricted';
    if(depth>8)return 'Further detail requires review';
    if(value===null||value===undefined)return null;
    if(typeof value==='string')return sensitive.test(key)&&!reveal?mask(value):value.slice(0,4000);
    if(typeof value==='number'||typeof value==='boolean')return value;
    if(Array.isArray(value))return value.slice(0,500).map(item=>sanitize(item,key,depth+1));
    return Object.fromEntries(Object.entries(value as Record<string,unknown>).slice(0,300).map(([k,v])=>[k,sanitize(v,k,depth+1)]));
  }
  const {error:auditError}=await admin.from('audit_events').insert({actor_id:access.userId,actor_type:'staff',action:reveal?'FILING_IDENTITY_REVEALED':'FILING_WORKSPACE_VIEWED',entity_type:'business',entity_id:businessId,new_value:{reason:reveal?reason?.trim():undefined},source:'control-center-edge'});
  if(auditError)throw auditError;
  const {data:services,error:servicesError}=await admin.from('services').select('id,name').order('name');
  if(servicesError)throw servicesError;
  return json(request,sanitize({deliveryRequestId:crypto.randomUUID(),business,documents:results[0].data,addresses:results[1].data,people:results[2].data,applications:results[3].data,registrations:results[4].data,licenses:results[5].data,customer:results[6].data,services,revealed:reveal,canComplete:access.permissions.has('application.update')&&access.permissions.has('document.verify'),canReveal:access.permissions.has('identity.read_full'),canDownload:access.permissions.has('document.download'),generatedAt:new Date().toISOString()}));
}

async function deliverCertificate(request: Request, admin: ReturnType<typeof createClient>, access: StaffAccess) {
  for(const permission of ['application.update','document.verify']) {
    const denied=requirePermission(request,access,permission); if(denied)return denied;
  }
  const form=await request.formData();
  const field=(name:string)=>typeof form.get(name)==='string'?String(form.get(name)).trim():'';
  const file=form.get('file');
  const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  const businessId=field('businessId'),requestId=field('requestId');
  if(!(file instanceof File)||file.size===0||file.size>10*1024*1024||!uuid.test(businessId)||!uuid.test(requestId)||field('confirmed')!=='yes')return json(request,{error:'Confirm the recipient and choose a PDF, JPG or PNG certificate under 10 MB.'},400);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const mime=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70?'application/pdf':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':null;
  if(!mime)return json(request,{error:'The file content must be PDF, JPG or PNG.'},400);
  const {data:business,error}=await admin.from('business_profiles').select('id,user_id').eq('id',businessId).is('deleted_at',null).maybeSingle();
  if(error)throw error;
  if(!business)return json(request,{error:'Business not found.'},404);
  const {data:existing,error:lookupError}=await admin.from('certificate_deliveries').select('application_id,document_id,actor_id,business_id').eq('request_id',requestId).maybeSingle();
  if(lookupError)throw lookupError;
  if(existing){
    if(existing.actor_id!==access.userId||existing.business_id!==businessId)return json(request,{error:'Delivery request conflict.'},409);
    return json(request,{applicationId:existing.application_id,documentId:existing.document_id,alreadyCompleted:true});
  }
  const extension=mime==='application/pdf'?'pdf':mime==='image/jpeg'?'jpg':'png';
  const path=`${business.user_id}/${business.id}/issued-${requestId}.${extension}`;
  const {error:uploadError}=await admin.storage.from('business-documents').upload(path,bytes,{contentType:mime,upsert:false});
  // Reuse the same immutable object after an interrupted request; never overwrite it.
  if(uploadError&&String(uploadError.statusCode)!=='409'&&String(uploadError.statusCode)!=='400')throw uploadError;
  if(uploadError){
    const {data:stored,error:storedError}=await admin.storage.from('business-documents').download(path);
    if(storedError||!stored)throw uploadError;
    const previous=new Uint8Array(await stored.arrayBuffer());
    if(previous.length!==bytes.length||previous.some((value,index)=>value!==bytes[index]))return json(request,{error:'This delivery request already has a different file. Choose a new file to start a new request.'},409);
  }
  const {data,error:completionError}=await admin.rpc('complete_certificate_delivery',{
    p_actor:access.userId,p_request:requestId,p_business:businessId,p_application:field('applicationId')||null,
    p_category:field('category')||null,p_service:field('serviceId')||null,p_path:path,p_filename:file.name,p_mime:mime,
    p_number:field('licenceNumber'),p_authority:field('authority'),p_issue:field('issueDate')||null,p_expiry:field('expiryDate')||null,
  });
  if(completionError)return json(request,{error:'The certificate could not be attached. Check the case, service, certificate number and dates; a closed case cannot be completed again.'},409);
  return json(request,data);
}

async function documentLink(request: Request, admin: ReturnType<typeof createClient>, access: StaffAccess, documentId: string, reason: string) {
  const denied = requirePermission(request, access, 'document.download');
  if (denied) return denied;
  if (typeof documentId !== 'string' || typeof reason !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(documentId) || reason.trim().length < 12 || reason.trim().length > 240) {
    return json(request, { error: 'Choose a valid document and provide a 12–240 character access reason.' }, 400);
  }
  const { data: document, error } = await admin.from('documents').select('id,business_id,uploaded_by,source,storage_path,original_filename,mime_type').eq('id', documentId).is('deleted_at', null).maybeSingle();
  if (error) throw error;
  if (!document) return json(request, { error: 'The document was not found.' }, 404);
  // Document metadata is customer writable. Never sign an arbitrary path from it.
  const segments = document.storage_path.split('/');
  if (segments.length !== 3 || (document.source!=='STAFF_ISSUED'&&segments[0] !== document.uploaded_by) || segments[1] !== document.business_id || !segments[2] || segments.some((part: string) => part === '.' || part === '..')) {
    return json(request, { error: 'The document storage reference requires review.' }, 409);
  }
  const { data: business, error: businessError } = await admin.from('business_profiles').select('id,user_id').eq('id', document.business_id).is('deleted_at', null).maybeSingle();
  if (businessError) throw businessError;
  if (!business) return json(request, { error: 'The document is no longer available.' }, 404);
  if(document.source==='STAFF_ISSUED'&&segments[0]!==business.user_id)return json(request,{error:'Invalid certificate reference.'},409);
  const { data: signed, error: signedError } = await admin.storage.from('business-documents').createSignedUrl(document.storage_path, 60);
  if (signedError || !signed?.signedUrl) throw signedError || new Error('Signed URL creation failed.');
  const { error: auditError } = await admin.from('audit_events').insert({
    actor_id: access.userId,
    actor_type: 'staff',
    action: 'DOCUMENT_ACCESSED',
    entity_type: 'document',
    entity_id: document.id,
    new_value: { reason: reason.trim(), mime_type: document.mime_type, expires_in_seconds: 60 },
    source: 'control-center-edge',
  });
  if (auditError) throw auditError;
  return json(request, { url: signed.signedUrl, filename: compact(document.original_filename, 'document'), expiresIn: 60 });
}

async function dashboard(request: Request, admin: ReturnType<typeof createClient>, access: StaffAccess) {
  const denied = requirePermission(request, access, 'dashboard.read');
  if (denied) return denied;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
  const activeStatuses = ['DRAFT','NEEDS_CUSTOMER_INFO','READY_FOR_REVIEW','READY_TO_FILE','WAITING_FOR_OTP','SUBMITTING','SUBMITTED','UNDER_REVIEW','GOVERNMENT_QUERY','RESPONSE_REQUIRED','RESPONSE_SUBMITTED'];

  const [
    customers, businesses, activeApplications, waitingCustomer, needsReview,
    governmentQueries, slaRisk, completedToday, revenueToday, queue,
    expiring30, expired, aiSuccess, aiFailure, gstLinked, queuedNotifications,
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    admin.from('business_profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('applications').select('id', { count: 'exact', head: true }).in('status', activeStatuses).is('deleted_at', null),
    admin.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'NEEDS_CUSTOMER_INFO').is('deleted_at', null),
    admin.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'READY_FOR_REVIEW').is('deleted_at', null),
    admin.from('government_queries').select('id', { count: 'exact', head: true }).in('status', ['open','response_required']),
    admin.from('applications').select('id', { count: 'exact', head: true }).in('status', activeStatuses).lte('sla_due_at', fourHoursFromNow).is('deleted_at', null),
    admin.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').gte('approved_at', startOfDay.toISOString()).is('deleted_at', null),
    admin.from('payments').select('amount').eq('status', 'PAID').gte('paid_at', startOfDay.toISOString()),
    admin.from('applications').select('id,application_number,status,priority,sla_due_at,updated_at,business_profiles(legal_name,trade_name),services(name)').in('status', activeStatuses).is('deleted_at', null).order('sla_due_at', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: true }).limit(12),
    admin.from('licenses').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('expiry_date', now.toISOString().slice(0,10)).lte('expiry_date', new Date(now.getTime() + 30 * 86400000).toISOString().slice(0,10)),
    admin.from('licenses').select('id', { count: 'exact', head: true }).eq('status', 'active').lt('expiry_date', now.toISOString().slice(0,10)),
    admin.from('ai_runs').select('id', { count: 'exact', head: true }).eq('status', 'SUCCEEDED').gte('created_at', new Date(now.getTime() - 86400000).toISOString()),
    admin.from('ai_runs').select('id', { count: 'exact', head: true }).eq('status', 'FAILED').gte('created_at', new Date(now.getTime() - 86400000).toISOString()),
    admin.from('gst_connections').select('id', { count: 'exact', head: true }).eq('status', 'linked'),
    admin.from('notification_runs').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
  ]);

  const responses = [customers,businesses,activeApplications,waitingCustomer,needsReview,governmentQueries,slaRisk,completedToday,revenueToday,queue,expiring30,expired,aiSuccess,aiFailure,gstLinked,queuedNotifications];
  const firstError = responses.find((response) => response.error)?.error;
  if (firstError) throw new Error(`Dashboard query failed: ${firstError.message}`);

  const revenue = (revenueToday.data ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const groqStatus = (aiFailure.count ?? 0) > (aiSuccess.count ?? 0) && (aiFailure.count ?? 0) > 0 ? 'Degraded' : (aiSuccess.count ?? 0) > 0 ? 'Operational' : 'Unknown';

  await admin.from('audit_events').insert({
    actor_id: access.userId,
    actor_type: 'staff',
    action: 'CONTROL_CENTER_DASHBOARD_VIEWED',
    entity_type: 'control_center',
    new_value: { roles: access.roles },
    source: 'control-center-edge',
  });

  return json(request, {
    staff: { email: access.email, displayName: access.displayName, roles: access.roles, permissions: [...access.permissions] },
    metrics: {
      customers: customers.count ?? 0,
      businesses: businesses.count ?? 0,
      activeApplications: activeApplications.count ?? 0,
      waitingCustomer: waitingCustomer.count ?? 0,
      needsReview: needsReview.count ?? 0,
      governmentQueries: governmentQueries.count ?? 0,
      slaRisk: slaRisk.count ?? 0,
      completedToday: completedToday.count ?? 0,
      revenueToday: revenue,
      expiringSoon: expiring30.count ?? 0,
      expired: expired.count ?? 0,
    },
    priorityQueue: (queue.data ?? []).map((row) => {
      const business = row.business_profiles as unknown as { legal_name: string | null; trade_name: string | null } | null;
      const service = row.services as unknown as { name: string } | null;
      return {
        id: row.id,
        reference: row.application_number || `APP-${row.id.slice(0,8).toUpperCase()}`,
        business: business?.trade_name || business?.legal_name || 'Business',
        service: service?.name || 'Service',
        status: row.status,
        priority: row.priority,
        slaDueAt: row.sla_due_at,
        owner: 'Unassigned',
      };
    }),
    health: [
      { name: 'Supabase', status: 'Operational', detail: 'Database and Edge Function queries succeeded.' },
      { name: 'Groq AI', status: groqStatus, detail: `${aiSuccess.count ?? 0} succeeded / ${aiFailure.count ?? 0} failed in 24h.` },
      { name: 'GST Connector', status: (gstLinked.count ?? 0) > 0 ? 'Configured' : 'Unknown', detail: `${gstLinked.count ?? 0} linked session(s); provider uptime is checked per request.` },
      { name: 'FSSAI', status: 'Manual', detail: 'Human-assisted workflow; no production connector health claim.' },
      { name: 'Notifications', status: (queuedNotifications.count ?? 0) > 0 ? 'Attention' : 'Operational', detail: `${queuedNotifications.count ?? 0} external delivery item(s) queued.` },
    ],
    generatedAt: now.toISOString(),
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  try {
    const env = Deno.env.toObject();
    const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const access = await authenticate(request, admin);
    if (!access) return json(request, { error: 'Control Center access is not available for this account.' }, 403);

    if(request.headers.get('content-type')?.includes('multipart/form-data'))return await deliverCertificate(request,admin,access);
    const body = await request.json().catch(() => ({})) as { action?: string; section?: string; page?: number; documentId?: string; businessId?: string; reason?: string };
    if (body.action === 'me') {
      return json(request, { staff: { email: access.email, displayName: access.displayName, roles: access.roles, permissions: [...access.permissions] } });
    }
    if (body.action === 'dashboard') return await dashboard(request, admin, access);
    if (body.action === 'directory') return await directory(request, admin, access, body.section ?? '', body.page ?? 0);
    if (body.action === 'document_link') return await documentLink(request, admin, access, body.documentId ?? '', body.reason ?? '');
    if (body.action === 'filing_workspace') return await filingWorkspace(request, admin, access, body.businessId ?? '', body.reason);
    return json(request, { error: 'Unsupported Control Center action.' }, 400);
  } catch (error) {
    console.error('Control Center request failed', error instanceof Error ? error.message.slice(0,300) : 'Unknown error');
    return json(request, { error: 'The Control Center request could not be completed.' }, 500);
  }
});
