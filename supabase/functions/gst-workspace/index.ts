import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import { corsHeaders, json } from '../_shared/http.ts';
import { CONSENT_VERSION, GSTIN_PATTERN, validPeriod, expiryIso, encryptToken, decryptToken } from './domain.ts';
import { PurchaseError, validateBooks, unpack2b, normalize2b, matchPurchases } from '../_shared/gst-purchases.ts';

// Intentionally no save, offset, EVC or filing action until reviewed-return safeguards ship.
const actions = ['status','request_otp','verify_otp','read_return','disconnect','load_books','save_books','read_2b'];
class GstError extends Error {}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in.' }, 401);
  const env = Deno.env.toObject();
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return json({ error: 'Please sign in again.' }, 401);
  const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  let connectionId: string | undefined, lockId: string | undefined, eventId: string | undefined;
  try {
    const raw = await request.text();
    if (raw.length > 1500000) return json({ error: 'Request too large.' }, 413);
    const body = JSON.parse(raw);
    if (!actions.includes(body.action)) return json({ error: 'This GST action is not enabled. No return was submitted.' }, 400);
    const { data: business, error: businessError } = await client.from('business_profiles').select('id,user_id,gstin').eq('id', body.businessId).is('deleted_at', null).maybeSingle();
    if (businessError || !business || business.user_id !== auth.user.id) return json({ error: 'Only the saved business owner can connect GST.' }, 403);
    const { error: createError } = await admin.from('gst_connections').upsert({ user_id: auth.user.id, business_id: business.id }, { onConflict: 'user_id,business_id', ignoreDuplicates: true });
    if (createError) throw new GstError('Could not open the GST workspace.');
    const { data: initial, error: currentError } = await admin.from('gst_connections').select('*').eq('user_id', auth.user.id).eq('business_id', business.id).single();
    if (currentError) throw new GstError('Could not load the GST connection.');
    let current = initial;
    connectionId = current.id;
    const publicConnection = (row: typeof current) => ({ id: row.id, gstin: row.gstin, username: row.username,
      status: row.status === 'linked' && Date.parse(row.expires_at) <= Date.now() ? 'expired' : row.status,
      expiresAt: row.expires_at, lastOtpAt: row.last_otp_at });
    if (body.action === 'status') return json({ connection: publicConnection(current), filingEnabled: false });
    const purchaseAction=['load_books','save_books','read_2b'].includes(body.action);
    if(purchaseAction&&!validPeriod(body.year,body.month))return json({error:'Choose a valid purchase period.'},400);
    const purchaseQuery=()=>admin.from('gst_purchase_reconciliations').select('*').eq('user_id',auth.user.id).eq('business_id',business.id).eq('year',body.year).eq('month',body.month).maybeSingle();
    if(body.action==='load_books'){const {data,error}=await purchaseQuery();if(error)throw new GstError('Could not load purchase books.');return json({purchase:data});}
    if (body.consent !== true || body.consentVersion !== CONSENT_VERSION) return json({ error: 'Please review and approve this action.' }, 400);
    if (body.action === 'request_otp') {
      if (!GSTIN_PATTERN.test(body.gstin ?? '') || typeof body.username !== 'string' || !/^[A-Za-z0-9_.@-]{3,100}$/.test(body.username)) return json({ error: 'Enter a valid GSTIN and GST portal username.' }, 400);
      if (business.gstin && business.gstin !== body.gstin) return json({ error: 'GSTIN must match this saved business. Update the business profile first.' }, 409);
      if (current.last_otp_at && Date.now() - Date.parse(current.last_otp_at) < 60000) return json({ error: 'Wait 60 seconds before requesting another GST OTP.' }, 429);
    }
    if (body.action === 'verify_otp' && (!/^\d{6}$/.test(body.otp ?? '') || current.status !== 'otp_pending' || current.verify_attempts >= 5 || Date.now() - Date.parse(current.last_otp_at) > 600000)) return json({ error: 'Enter the six-digit GST OTP, or request a new code if expired.' }, 400);
    if (body.action === 'read_return' && (!validPeriod(body.year, body.month) || !['gstr-1','gstr-3b'].includes(body.form))) return json({ error: 'Choose a valid return and period.' }, 400);
    lockId = crypto.randomUUID();
    const { data: locked, error: lockError } = await admin.from('gst_connections').update({ lock_id: lockId, locked_until: new Date(Date.now() + 120000).toISOString() }).eq('id', current.id).or('locked_until.is.null,locked_until.lt.' + new Date().toISOString()).select('*').maybeSingle();
    if (lockError || !locked) return json({ error: 'Another GST request is running. Please wait before retrying.' }, 409);
    current = locked;
    // Recheck state under the lock: a concurrent request may have changed it.
    if (body.action === 'request_otp' && current.last_otp_at && Date.now() - Date.parse(current.last_otp_at) < 60000) return json({ error: 'Wait 60 seconds before requesting another GST OTP.' }, 429);
    if (body.action === 'verify_otp' && (current.status !== 'otp_pending' || current.verify_attempts >= 5 || !current.last_otp_at || Date.now() - Date.parse(current.last_otp_at) > 600000)) return json({ error: 'Request a fresh GST OTP.' }, 400);
    const { count, error: countError } = await admin.from('gst_consent_events').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if (countError) throw new GstError('Could not check GST request limits.');
    if ((count ?? 0) >= 60 && body.action !== 'disconnect') return json({ error: 'GST request limit reached. Try again in one hour.' }, 429);
    // Each deliberate action is recorded before contacting GST. Never store an OTP.
    const { data: event, error: eventError } = await admin.from('gst_consent_events').insert({ user_id: auth.user.id, business_id: business.id, action: body.action, consent_version: CONSENT_VERSION,
      scope: { gstin: body.action === 'request_otp' ? body.gstin : current.gstin, username: body.action === 'request_otp' ? body.username : current.username, form: body.form, year: body.year, month: body.month } }).select('id').single();
    if (eventError) throw new GstError('Could not record your consent. No GST action was taken.');
    eventId = event.id;
    const update = async (values: Record<string, unknown>) => {
      const { data, error } = await admin.from('gst_connections').update({ ...values, updated_at: new Date().toISOString() }).eq('id', current.id).eq('lock_id', lockId).select('*').single();
      if (error) throw new GstError('Could not save the GST connection. Check its status before retrying.');
      return data;
    };
    const succeed = async () => {
      const { error } = await admin.from('gst_consent_events').update({ outcome: 'succeeded' }).eq('id', eventId!);
      if (error) throw new GstError('GST completed the request, but its audit record could not be updated. Check status before retrying.');
    };
    if (body.action === 'disconnect') {
      const row = await update({ status: 'disconnected', token_ciphertext: null, expires_at: null, username: null, gstin: null });
      await succeed(); return json({ connection: publicConnection(row) });
    }
    if(body.action==='save_books'){
      const books=validateBooks(body.books),{data:old,error:readError}=await purchaseQuery();
      if(readError)throw new GstError('Could not read the saved books.');
      if((old?.revision??0)!==body.revision)throw new GstError('Purchase books changed on another device. Reload before saving.');
      const values={user_id:auth.user.id,business_id:business.id,gstin:business.gstin||current.gstin,year:body.year,month:body.month,books,revision:(old?.revision??0)+1,report:null,snapshot:null,fetched_at:null,updated_at:new Date().toISOString()};
      if(!values.gstin)throw new GstError('Save a GST business profile first.');
      const result=old?await admin.from('gst_purchase_reconciliations').update(values).eq('id',old.id).eq('revision',old.revision).select('*').single():await admin.from('gst_purchase_reconciliations').insert(values).select('*').single();
      if(result.error)throw new GstError('Purchase books could not be saved. Reload before retrying.');
      await succeed();return json({purchase:result.data});
    }
    const legacy = Object.keys(env).find((name) => /^key_live_[a-z0-9]+$/i.test(name));
    const key = env.SANDBOX_API_KEY ?? legacy;
    const secret = env.SANDBOX_API_SECRET ?? (legacy ? env[legacy] : undefined);
    if (!key?.startsWith('key_live_') || !secret) throw new GstError('Live Sandbox credentials are not configured.');
    // Domain-separated encryption; rotating Sandbox's secret requires reconnecting GST.
    const encryptionSecret = env.GST_TOKEN_ENCRYPTION_KEY || secret;
    const owner = auth.user.id + ':' + business.id;
    const provider = async (path: string, token?: string, payload?: unknown) => {
      let response: Response;
      try { response = await fetch('https://api.sandbox.co.in' + path, { method: payload === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'x-api-version': '1.0.0', 'x-source': 'primary', ...(token ? { authorization: token } : { 'x-api-secret': secret }) }, body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(25000) }); }
      catch { throw new GstError('GST provider timed out or could not be reached. No automatic retry was made.'); }
      const result = await response.json().catch(() => null);
      if (!response.ok || !result || Number(result.code) >= 400 || result.data?.status_cd === '0' || result.data?.error) {
        // Do not echo URLs, provider payloads, tokens, or OTPs into app errors/logs.
        throw new GstError(response.status === 401 || response.status === 403 ? 'GST access was rejected. Check Sandbox GST subscription, portal API access and session validity.' : 'GST rejected this request. Check the username, OTP and portal API access, then retry.');
      }
      if (!result.data) throw new GstError('GST returned no data.');
      return result.data;
    };
    if (body.action === 'request_otp' || body.action === 'verify_otp') {
      // Consume throttle/attempt before the provider call, including failed calls.
      if (body.action === 'request_otp') await update({ last_otp_at: new Date().toISOString(), status: 'disconnected', token_ciphertext: null, expires_at: null, verify_attempts: 0 });
      else await update({ verify_attempts: current.verify_attempts + 1 });
      const sandbox = await provider('/authenticate', undefined, {});
      if (!sandbox.access_token) throw new GstError('Sandbox authentication did not return an access token.');
      if (body.action === 'request_otp') {
        const sent = await provider('/gst/compliance/tax-payer/otp', sandbox.access_token, { gstin: body.gstin, username: body.username });
        if (String(sent.status_cd) !== '1') throw new GstError('GST did not confirm sending an OTP.');
        const row = await update({ status: 'otp_pending', gstin: body.gstin, username: body.username });
        await succeed(); return json({ connection: publicConnection(row) });
      }
      const verified = await provider('/gst/compliance/tax-payer/otp/verify?otp=' + encodeURIComponent(body.otp), sandbox.access_token, { gstin: current.gstin, username: current.username });
      if (String(verified.status_cd) !== '1' || !verified.access_token) throw new GstError('GST did not verify this code. Request a new OTP.');
      const row = await update({ status: 'linked', token_ciphertext: await encryptToken(verified.access_token, encryptionSecret, owner), expires_at: expiryIso(verified.token_expiry) });
      await succeed(); return json({ connection: publicConnection(row) });
    }
    if (current.status !== 'linked' || !current.token_ciphertext || Date.parse(current.expires_at) <= Date.now()) throw new GstError('Your GST session has expired. Reconnect with a fresh OTP.');
    const token = await decryptToken(current.token_ciphertext, encryptionSecret, owner).catch(() => { throw new GstError('GST credentials changed. Please reconnect.'); });
    if(body.action==='read_2b'){
      const {data:saved,error:readError}=await purchaseQuery();
      if(readError||!saved)throw new GstError('Save your purchase books before matching.');
      if(saved.revision!==body.revision||saved.gstin!==current.gstin)throw new GstError('The books or selected GSTIN changed. Reload before matching.');
      const period=String(body.month).padStart(2,'0')+body.year;
      const path='/gst/compliance/tax-payer/gstrs/gstr-2b/'+body.year+'/'+String(body.month).padStart(2,'0');
      const initial=unpack2b(await provider(path,token),current.gstin,period);
      const documents=[];
      // Bound total download duration below the connection lock lease. Never match a partial download.
      if(initial.files>8)throw new GstError('This GSTR-2B has more than eight files. Large-account download support is required; no partial matching was saved.');
      if(initial.files){for(let page=1;page<=initial.files;page+=4){const pages=await Promise.all(Array.from({length:Math.min(4,initial.files-page+1)},async(_,offset)=>unpack2b(await provider(path+'?file_number='+(page+offset),token),current.gstin,period).data));documents.push(...pages);}}
      else documents.push(initial.data);
      const normalized=normalize2b(documents),report=matchPurchases(validateBooks(saved.books),normalized.rows,normalized.unsupported);
      const {data,error}=await admin.from('gst_purchase_reconciliations').update({snapshot:documents,report,fetched_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',saved.id).eq('revision',saved.revision).select('*').single();
      if(error)throw new GstError('The books changed during download. Reload and match again.');
      await succeed();return json({purchase:data});
    }
    const path = '/gst/compliance/tax-payer/gstrs/' + body.form + '/' + body.year + '/' + String(body.month).padStart(2,'0');
    const details = await provider(path + (body.form === 'gstr-1' ? '?summary_type=long' : ''), token);
    await succeed();
    return json({ details, fetchedAt: new Date().toISOString(), gstin: current.gstin, form: body.form, year: body.year, month: body.month, filed: false });
  } catch (cause) {
    if (eventId) await admin.from('gst_consent_events').update({ outcome: 'failed' }).eq('id', eventId);
    return json({ error: cause instanceof GstError || cause instanceof PurchaseError ? cause.message : 'GST request could not be completed. Check portal API access, Sandbox GST entitlement and OTP/session validity. No return has been filed.' }, cause instanceof PurchaseError ? 400 : 502);
  } finally {
    if (connectionId && lockId) await admin.from('gst_connections').update({ lock_id: null, locked_until: null }).eq('id', connectionId).eq('lock_id', lockId);
  }
});
