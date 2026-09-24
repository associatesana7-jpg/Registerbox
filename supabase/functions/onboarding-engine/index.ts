import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/http.ts';

function answerValue(rows: { question_key: string; answer_json: unknown }[], key: string) {
  return rows.find((row) => row.question_key === key)?.answer_json;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in again.' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await supabase.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) return json({ error: 'Missing onboarding session.' }, 400);
  const { data: session } = await supabase.from('onboarding_sessions').select('id,intent_id,status').eq('id', sessionId).maybeSingle();
  if (!session) return json({ error: 'Onboarding session not found.' }, 404);

  if (body.action === 'answer') {
    const fieldKey = typeof body.fieldKey === 'string' ? body.fieldKey.trim() : '';
    if (!fieldKey || body.value === undefined) return json({ error: 'A question and answer are required.' }, 400);
    const source = ['USER','KNOWN','CONNECTOR','DOCUMENT','AI_INFERENCE'].includes(body.source) ? body.source : 'USER';
    const { error: answerError } = await supabase.from('onboarding_answers').upsert({ session_id: sessionId, question_key: fieldKey, answer_json: body.value, source }, { onConflict: 'session_id,question_key' });
    if (answerError) return json({ error: 'We could not save that answer.' }, 500);
    await supabase.from('field_facts').insert({ intent_id: session.intent_id, field_key: fieldKey, value_json: body.value, source_type: source === 'CONNECTOR' ? 'GOVERNMENT_API' : source, source_reference: typeof body.sourceReference === 'string' ? body.sourceReference : null, confidence: source === 'CONNECTOR' ? 0.99 : 1, verification_status: source === 'CONNECTOR' ? 'VERIFIED' : 'CUSTOMER_CONFIRMED', verified_at: source === 'CONNECTOR' ? new Date().toISOString() : null });
  }

  const { data: nextRows, error: nextError } = await supabase.rpc('get_next_onboarding_requirement', { target_session_id: sessionId });
  if (nextError) return json({ error: 'We could not load the next question.' }, 500);
  const nextQuestion = nextRows?.[0] ?? null;
  let businessId: string | null = null;
  if (!nextQuestion) {
    const { data: intent } = await supabase.from('business_intents').select('id,existing_business_id,industry,subindustry,entity_preference').eq('id', session.intent_id).single();
    const { data: answers } = await supabase.from('onboarding_answers').select('question_key,answer_json').eq('session_id', sessionId);
    const answerRows = answers ?? [];
    const legalName = answerValue(answerRows, 'business.legal_name');
    const activity = answerValue(answerRows, 'business.primary_activity');
    const turnover = answerValue(answerRows, 'business.annual_turnover');
    const employees = answerValue(answerRows, 'business.employee_count');
    const panStatus = answerValue(answerRows, 'identity.pan_status') as Record<string, unknown> | undefined;
    const gstStatus = answerValue(answerRows, 'registration.gst_status') as Record<string, unknown> | undefined;
    const gstData = gstStatus?.data as Record<string, unknown> | undefined;
    businessId = intent?.existing_business_id ?? null;
    const { data: existingProfile } = businessId
      ? await supabase.from('business_profiles').select('legal_name,trade_name,entity_type,constitution,pan,gstin,business_category,business_subcategory,description,annual_turnover,employee_count').eq('id', businessId).single()
      : { data: null };
    const businessPatch = {
      legal_name: typeof gstData?.legalName === 'string' ? gstData.legalName : typeof legalName === 'string' ? legalName : existingProfile?.legal_name ?? 'New business',
      trade_name: typeof gstData?.tradeName === 'string' ? gstData.tradeName : typeof legalName === 'string' ? legalName : existingProfile?.trade_name ?? 'New business',
      entity_type: typeof gstData?.entityType === 'string' ? gstData.entityType : intent?.entity_preference ?? existingProfile?.entity_type,
      constitution: typeof gstData?.entityType === 'string' ? gstData.entityType : intent?.entity_preference ?? existingProfile?.constitution,
      pan: panStatus?.status === 'VERIFIED' && typeof panStatus.identifier === 'string' ? panStatus.identifier : existingProfile?.pan,
      gstin: gstStatus?.status === 'VERIFIED' && typeof gstStatus.identifier === 'string' ? gstStatus.identifier : existingProfile?.gstin,
      business_category: intent?.industry ?? existingProfile?.business_category,
      business_subcategory: intent?.subindustry ?? existingProfile?.business_subcategory,
      description: typeof activity === 'string' ? activity : existingProfile?.description,
      annual_turnover: typeof turnover === 'number' ? turnover : existingProfile?.annual_turnover,
      employee_count: typeof employees === 'number' ? employees : existingProfile?.employee_count,
    };
    if (!businessId) {
      const { data: created, error: createError } = await supabase.from('business_profiles').insert({ ...businessPatch, user_id: auth.user.id, created_by: auth.user.id, status: 'draft' }).select('id').single();
      if (createError) return json({ error: 'We could not create your draft business profile.' }, 500);
      businessId = created.id;
      await supabase.from('business_intents').update({ existing_business_id: businessId }).eq('id', session.intent_id);
      await supabase.from('business_members').upsert({ business_id: businessId, user_id: auth.user.id, role: 'OWNER', status: 'active' }, { onConflict: 'business_id,user_id' });
    } else {
      await supabase.from('business_profiles').update(businessPatch).eq('id', businessId);
    }
    const address = typeof gstData?.address === 'string' ? gstData.address : answerValue(answerRows, 'establishment.address');
    const city = typeof gstData?.city === 'string' ? gstData.city : null;
    const state = typeof gstData?.state === 'string' ? gstData.state : intent?.location_state;
    const pincode = typeof gstData?.pincode === 'string' ? gstData.pincode : null;
    if (businessId && typeof address === 'string' && city && state && pincode && /^[1-9]\d{5}$/.test(pincode)) {
      const { data: existingAddress } = await supabase.from('business_addresses').select('id').eq('business_id', businessId).eq('type', 'principal').maybeSingle();
      if (!existingAddress) await supabase.from('business_addresses').insert({ business_id: businessId, type: 'principal', address_line_1: address, city, state, pincode, verified: gstStatus?.status === 'VERIFIED' });
    }
    const fssai = answerValue(answerRows, 'registration.fssai_status') as Record<string, unknown> | undefined;
    if (businessId && fssai) {
      const { data: catalog } = await supabase.from('registration_catalog').select('id').eq('code', 'FSSAI').single();
      if (catalog) await supabase.from('business_registrations').upsert({ business_id: businessId, registration_catalog_id: catalog.id, registration_number: typeof fssai.registrationNumber === 'string' ? fssai.registrationNumber : null, status: fssai.status === 'USER_DECLARED' ? 'USER_DECLARED' : 'NOT_CONNECTED', source: 'USER', certificate_document_id: typeof fssai.documentId === 'string' ? fssai.documentId : null }, { onConflict: 'business_id,establishment_id,registration_catalog_id' });
    }
    await supabase.from('onboarding_sessions').update({ status: 'COMPLETED', current_stage: 'analysis', current_question_key: null, completion_percentage: 100, completed_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }).eq('id', sessionId);
    await supabase.from('business_intents').update({ status: 'READY_FOR_ANALYSIS' }).eq('id', session.intent_id);
  } else {
    await supabase.from('onboarding_sessions').update({ current_stage: 'questions', current_question_key: nextQuestion.field_key, completion_percentage: nextQuestion.completion_percentage, last_activity_at: new Date().toISOString() }).eq('id', sessionId);
  }
  return json({ complete: !nextQuestion, nextQuestion, businessId });
});
