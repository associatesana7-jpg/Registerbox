import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Public consent return page contains no account or document information.
  if (request.method === 'GET') return new Response('Return to RegisterBox and tap Fetch consented documents. Your consent status will be checked securely.', { headers: { 'Content-Type': 'text/plain' } });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in.' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return json({ error: 'Please sign in again.' }, 401);
  try {
    const body = await request.json();
    const { data: business } = await client.from('business_profiles').select('id').eq('id', body.businessId).is('deleted_at', null).maybeSingle();
    if (!business) return json({ error: 'Choose a saved business first.' }, 403);
    const env = Deno.env.toObject();
    const legacy = Object.keys(env).find((key) => /^key_live_[a-z0-9]+$/i.test(key));
    const key = env.SANDBOX_API_KEY ?? legacy;
    const secret = env.SANDBOX_API_SECRET ?? (legacy ? env[legacy] : undefined);
    if (!key || !secret || !key.startsWith('key_live_')) return json({ error: 'Live DigiLocker credentials are not configured.' }, 503);
    const base = 'https://api.sandbox.co.in';
    const authResponse = await fetch(base + '/authenticate', { method: 'POST', headers: { 'x-api-key': key, 'x-api-secret': secret, 'x-api-version': '1.0.0' }, signal: AbortSignal.timeout(10000) });
    const authPayload = await authResponse.json();
    if (!authResponse.ok || !authPayload.data?.access_token) return json({ error: 'Sandbox authentication failed. Check the live credentials and subscription.' }, 503);
    const provider = async (path: string, payload?: unknown) => {
      const response = await fetch(base + path, {
        method: payload ? 'POST' : 'GET',
        headers: { authorization: authPayload.data.access_token, 'x-api-key': key, 'x-api-version': '1.0.0', 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined, signal: AbortSignal.timeout(25000),
      });
      const value = await response.json();
      if (!response.ok || value.code >= 400) throw new Error('Sandbox DigiLocker: ' + (value.message || 'provider request failed (' + response.status + ')'));
      return value.data;
    };
    const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
    if (body.action === 'start') {
      if (body.consent !== true) return json({ error: 'Your consent is required.' }, 400);
      const { count } = await admin.from('document_fetch_sessions').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).gte('created_at', new Date(Date.now() - 60000).toISOString());
      if ((count ?? 0) >= 3) return json({ error: 'Please wait one minute before connecting again.' }, 429);
      const data = await provider('/kyc/digilocker/sessions/init', {
        '@entity': 'in.co.sandbox.kyc.digilocker.session.request', flow: 'signin',
        redirect_url: env.SUPABASE_URL + '/functions/v1/document-locker',
        doc_types: ['pan', 'aadhaar'], consent_expiry: Date.now() + 7200000,
      });
      const url = new URL(data.authorization_url);
      if (url.protocol !== 'https:' || !['digilocker.meripehchaan.gov.in', 'digilocker.gov.in'].includes(url.hostname)) throw new Error('Unexpected DigiLocker authorization address.');
      const { data: session, error } = await admin.from('document_fetch_sessions').insert({ user_id: auth.user.id, business_id: business.id, provider_session_id: data.session_id }).select('id').single();
      if (error) throw new Error('Could not save the DigiLocker connection.');
      return json({ sessionId: session.id, authorizationUrl: url.href });
    }
    const { data: session } = await admin.from('document_fetch_sessions').select('*').eq('id', body.sessionId).eq('user_id', auth.user.id).eq('business_id', business.id).maybeSingle();
    if (!session) return json({ error: 'DigiLocker session not found.' }, 404);
    const prefix = '/kyc/digilocker/sessions/' + encodeURIComponent(session.provider_session_id);
    const status = await provider(prefix + '/status');
    if (status.status !== 'succeeded') return json({ status: status.status, imported: 0 });
    let imported = 0;
    for (const type of (status.documents_consented ?? []).filter((type: string) => ['pan','aadhaar'].includes(type))) {
      const response = await provider(prefix + '/documents/' + type);
      for (const [index, file] of (response.files ?? []).entries()) {
        const url = new URL(file.url);
        if (url.protocol !== 'https:' || !/^in-co-sandbox-kyc-digilocker[^.]*\.s3[.-][a-z0-9.-]+\.amazonaws\.com$/.test(url.hostname)) throw new Error('Unsupported document source.');
        const mime = file.metadata?.ContentType;
        if (!['application/xml','text/xml','application/pdf','image/jpeg','image/png'].includes(mime)) throw new Error('Unsupported document format.');
        const filename = type + '-' + index + (mime.includes('xml') ? '.xml' : mime === 'application/pdf' ? '.pdf' : '.jpg');
        const path = auth.user.id + '/' + business.id + '/digilocker-' + session.id + '-' + filename;
        const { data: existing } = await client.from('documents').select('id').eq('storage_path', path).is('deleted_at', null).maybeSingle();
        if (existing) continue;
        if (file.size > 10485760) throw new Error('Document exceeds 10 MB.');
        const download = await fetch(url.href, { redirect: 'error', signal: AbortSignal.timeout(25000) });
        if (!download.ok) throw new Error('Could not retrieve the consented file.');
        const bytes = await download.arrayBuffer();
        if (!bytes.byteLength || bytes.byteLength > 10485760) throw new Error('Invalid document size.');
        const { error: uploadError } = await client.storage.from('business-documents').upload(path, bytes, { contentType: mime, upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        const { error: insertError } = await client.from('documents').insert({
          business_id: business.id, uploaded_by: auth.user.id, type: type.toUpperCase() + '_CARD',
          storage_path: path, original_filename: filename, mime_type: mime, source: 'DIGILOCKER',
          verified: false, verification_status: 'pending',
          metadata_json: { provider: 'sandbox', issuer: file.metadata?.issuer, consent_session: session.id },
        });
        if (insertError) throw new Error(insertError.message);
        imported++;
      }
    }
    return json({ status: 'succeeded', imported });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Document retrieval failed. Please retry.' }, 502);
  }
});
