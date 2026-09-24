import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type IdentifierType = 'PAN' | 'GSTIN';

const patterns: Record<IdentifierType, RegExp> = {
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in before verifying a business.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const token = authorization.slice('Bearer '.length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);

    const body = await request.json().catch(() => ({}));
    const identifierType = String(body.identifierType ?? '').toUpperCase() as IdentifierType;
    const identifier = String(body.identifier ?? '').replace(/\s+/g, '').toUpperCase();
    const consent = body.consent === true;
    if (!(identifierType in patterns)) return json({ error: 'Choose PAN or GSTIN.' }, 400);
    if (!patterns[identifierType].test(identifier)) return json({ error: `Enter a valid ${identifierType}.` }, 400);
    if (!consent) return json({ error: 'Consent is required to verify this identifier.' }, 400);

    const identifierHash = await sha256(identifier);
    const cacheSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cached } = identifierType === 'GSTIN' ? await supabase
      .from('kyc_verifications')
      .select('id, status, normalized_data, verified_at')
      .eq('identifier_type', identifierType)
      .eq('identifier_hash', identifierHash)
      .eq('status', 'verified')
      .gte('created_at', cacheSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() : { data: null };
    if (cached) {
      return json({
        verificationId: cached.id,
        identifierType,
        identifier,
        valid: true,
        provider: 'sandbox',
        verifiedAt: cached.verified_at,
        cached: true,
        ...cached.normalized_data,
      });
    }

    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from('kyc_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authData.user.id)
      .gte('created_at', minuteAgo);
    if ((count ?? 0) >= 5) return json({ error: 'Too many verification attempts. Please wait one minute.' }, 429);

    const env = Deno.env.toObject();
    const fallbackKeyName = Object.keys(env).find((name) => /^key_(live|test)_[a-z0-9]+$/i.test(name));
    const apiKey = env.SANDBOX_API_KEY ?? fallbackKeyName;
    const apiSecret = env.SANDBOX_API_SECRET ?? (fallbackKeyName ? env[fallbackKeyName] : undefined);
    if (!apiKey || !apiSecret) {
      return json({ error: 'Live verification is awaiting the Sandbox API key and secret in Supabase.' }, 503);
    }

    const baseUrl = (env.SANDBOX_BASE_URL ?? (apiKey.startsWith('key_test_') ? 'https://test-api.sandbox.co.in' : 'https://api.sandbox.co.in')).replace(/\/$/, '');
    const suppliedName = cleanString(body.name);
    const dateOfBirth = cleanString(body.dateOfBirth);
    if (identifierType === 'PAN' && (!suppliedName || !dateOfBirth)) {
      return json({ error: 'PAN verification requires the name and DOB/date of incorporation shown on the PAN record.' }, 400);
    }

    let authResponse: Response;
    try {
      authResponse = await fetch(`${baseUrl}/authenticate`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'x-api-key': apiKey, 'x-api-secret': apiSecret, 'x-api-version': '1.0.0' },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.error('Sandbox authentication request failed', error);
      return json({ error: 'Sandbox authentication timed out. Please try again.' }, 504);
    }
    const sandboxAuthData = await authResponse.json().catch(() => ({}));
    const accessToken = cleanString(sandboxAuthData?.data?.access_token);
    if (!authResponse.ok || !accessToken) return json({ error: 'Sandbox authentication failed. Check the API key/secret pair and subscription.' }, 503);

    const endpoint = identifierType === 'PAN' ? `${baseUrl}/kyc/pan/verify` : `${baseUrl}/gst/compliance/public/gstin/search`;
    const providerBody = identifierType === 'PAN'
      ? { '@entity': 'in.co.sandbox.kyc.pan_verification.request', pan: identifier, name_as_per_pan: suppliedName, date_of_birth: dateOfBirth, consent: 'Y', reason: 'Verify business identity for registrations and licence recommendations' }
      : { gstin: identifier };

    let providerResponse: Response;
    try {
      providerResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': accessToken,
          'x-api-key': apiKey,
          'x-api-version': identifierType === 'GSTIN' ? '1.3.0' : '1.0.0',
          'x-accept-cache': 'true',
        },
        body: JSON.stringify(providerBody),
        signal: AbortSignal.timeout(25_000),
      });
    } catch (error) {
      console.error(`Sandbox ${identifierType} request failed`, error);
      return json({ error: `Sandbox ${identifierType} lookup timed out. Please try again.` }, 504);
    }
    const providerData = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      const message = cleanString(providerData?.message) ?? 'The verification provider could not complete this request.';
      return json({ error: message }, providerResponse.status === 401 ? 503 : 422);
    }

    const resultData = providerData?.data?.data ?? providerData?.data ?? {};
    const valid = identifierType === 'PAN'
      ? resultData?.status === 'valid' && resultData?.name_as_per_pan_match === true && resultData?.date_of_birth_match === true
      : providerData?.data?.status_cd === '1' && Boolean(resultData?.gstin);
    const gstAddress = resultData?.pradr?.addr ?? {};
    const fullAddress = [gstAddress?.flno, gstAddress?.bno, gstAddress?.bnm, gstAddress?.st, gstAddress?.loc, gstAddress?.dst, gstAddress?.stcd, gstAddress?.pncd].filter(Boolean).join(', ');
    const normalizedData = identifierType === 'PAN' ? {
      legalName: resultData?.name_as_per_pan_match === true ? suppliedName : null,
      entityType: cleanString(resultData?.category),
      registrationStatus: cleanString(resultData?.remarks) ?? cleanString(resultData?.status),
      nameMatchResult: resultData?.name_as_per_pan_match === true ? 'MATCH' : 'NO_MATCH',
      dateOfBirthMatch: resultData?.date_of_birth_match === true,
      aadhaarSeedingStatus: cleanString(resultData?.aadhaar_seeding_status),
    } : {
      legalName: cleanString(resultData?.lgnm),
      tradeName: cleanString(resultData?.tradeNam),
      entityType: cleanString(resultData?.ctb),
      taxpayerType: cleanString(resultData?.dty),
      registrationStatus: cleanString(resultData?.sts),
      registrationDate: cleanString(resultData?.rgdt),
      address: cleanString(fullAddress),
      city: cleanString(gstAddress?.loc) ?? cleanString(gstAddress?.dst),
      state: cleanString(gstAddress?.stcd),
      pincode: cleanString(gstAddress?.pncd),
      natureOfBusinessActivities: Array.isArray(resultData?.nba) ? resultData.nba : [],
      lastUpdatedAt: cleanString(resultData?.lstupdt),
    };

    const verifiedAt = new Date().toISOString();
    const consentPurpose = 'Verify business identity and determine applicable registrations and licences.';
    const { data: verification, error: insertError } = await supabase.from('kyc_verifications').insert({
      user_id: authData.user.id,
      identifier_type: identifierType,
      identifier_hash: identifierHash,
      identifier_last_four: identifier.slice(-4),
      provider: 'sandbox',
      provider_reference_id: providerData?.transaction_id == null ? null : String(providerData.transaction_id),
      status: valid ? 'verified' : 'invalid',
      normalized_data: normalizedData,
      consent_purpose: consentPurpose,
      verified_at: verifiedAt,
    }).select('id').single();
    if (insertError) throw insertError;

    return json({
      verificationId: verification.id,
      identifierType,
      identifier,
      valid,
      provider: 'sandbox',
      verifiedAt,
      cached: false,
      ...normalizedData,
    });
  } catch (error) {
    console.error('verify-business-identity failed', error);
    const message = error instanceof DOMException && error.name === 'TimeoutError'
      ? 'The verification provider timed out. Please try again.'
      : 'We could not verify this identifier right now.';
    return json({ error: message }, 500);
  }
});
