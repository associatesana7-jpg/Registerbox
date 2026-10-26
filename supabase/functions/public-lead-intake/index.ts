import { createClient } from 'npm:@supabase/supabase-js@2.117.1';

const productionOrigins = new Set(['https://www.registerbox.in', 'https://registerbox.in']);
const services: Record<string, string> = {
  gst_registration: 'GST registration',
  gst_returns: 'GST returns & filing',
  company: 'Private limited company',
  llp: 'LLP registration',
  food: 'FSSAI / food licence',
  udyam: 'Udyam (MSME) registration',
  retail: 'Shop & establishment registration',
  other: 'Other business service',
};

function isAllowedOrigin(origin: string | null) {
  return Boolean(origin && (productionOrigins.has(origin) || /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)));
}

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin! : 'https://www.registerbox.in',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function cleanName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 80);
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (request.method !== 'POST') return json(origin, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(origin)) return json(origin, { error: 'This request origin is not allowed.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 4096) return json(origin, { error: 'Request too large.' }, 413);

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json(origin, { error: 'Enter your callback details again.' }, 400);
    // A hidden field catches basic form bots without confirming that detection.
    if (typeof body.website === 'string' && body.website.trim()) return json(origin, { ok: true });

    const startedAt = typeof body.startedAt === 'number' ? body.startedAt : 0;
    const elapsed = Date.now() - startedAt;
    if (!Number.isFinite(startedAt) || elapsed < 4_000 || elapsed > 3_600_000) {
      return json(origin, { error: 'Please reopen the callback form and try again.' }, 400);
    }

    const fullName = cleanName(body.fullName);
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const serviceKey = typeof body.serviceKey === 'string' ? body.serviceKey : '';
    const sourcePath = typeof body.sourcePath === 'string' && /^\/(?!\/)[^\s\\]{0,239}$/.test(body.sourcePath) ? body.sourcePath : '/';
    const locale = typeof body.locale === 'string' && /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(body.locale) ? body.locale : 'en';

    if (fullName.length < 2 || /https?:\/\/|www\./i.test(fullName)) return json(origin, { error: 'Enter your name.' }, 400);
    if (!/^[6-9][0-9]{9}$/.test(phone)) return json(origin, { error: 'Enter a valid 10-digit Indian mobile number.' }, 400);
    if (!services[serviceKey]) return json(origin, { error: 'Choose the service you need.' }, 400);
    if (body.callbackConsent !== true) return json(origin, { error: 'Please allow RegisterBox to call about this request.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Treat rapid repeat submissions for the same number as one request.
    const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: recent, error: recentError } = await admin
      .from('website_callback_leads')
      .select('id')
      .eq('phone', phone)
      .gte('created_at', cutoff)
      .limit(1)
      .maybeSingle();
    if (recentError) throw recentError;
    if (recent) return json(origin, { ok: true, duplicate: true });

    const { error } = await admin.from('website_callback_leads').insert({
      full_name: fullName,
      phone,
      service_key: serviceKey,
      service_label: services[serviceKey],
      source_path: sourcePath,
      locale,
      consent_version: 'callback-v1-2026-10-26',
    });
    if (error) throw error;
    return json(origin, { ok: true });
  } catch (error) {
    console.error('Public lead intake failed', error instanceof Error ? error.message.slice(0, 240) : 'Unknown error');
    return json(origin, { error: 'We could not save the callback request. Please call or WhatsApp RegisterBox.' }, 500);
  }
});
