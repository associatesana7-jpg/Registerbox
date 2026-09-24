import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/http.ts';
import { callQwenStructured } from '../_shared/qwen.ts';

const intentTypes = ['START_NEW_BUSINESS','REGISTER_COMPANY','REGISTER_LLP','START_FOOD_BUSINESS','ADD_BUSINESS_ACTIVITY','OPEN_NEW_BRANCH','START_MANUFACTURING','START_ECOMMERCE','START_RETAIL','CHECK_COMPLIANCE','GET_REGISTRATION','OTHER'] as const;
type IntentType = typeof intentTypes[number];

type Classification = {
  intentType: IntentType;
  industry: string | null;
  subindustry: string | null;
  activities: string[];
  locationState: string | null;
  locationCity: string | null;
  entityPreference: string | null;
  existingBusinessLikely: boolean;
  missingCriticalFacts: string[];
  workflowPackCodes: string[];
  summary: string;
  confidence: number;
};

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    intentType: { type: 'string', enum: intentTypes },
    industry: { type: ['string','null'] }, subindustry: { type: ['string','null'] },
    activities: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    locationState: { type: ['string','null'] }, locationCity: { type: ['string','null'] },
    entityPreference: { type: ['string','null'] }, existingBusinessLikely: { type: 'boolean' },
    missingCriticalFacts: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    workflowPackCodes: { type: 'array', items: { type: 'string', enum: ['NEW_PROPRIETORSHIP','PRIVATE_LIMITED_FORMATION','LLP_FORMATION','FOOD_BUSINESS','RESTAURANT','CLOUD_KITCHEN','FOOD_MANUFACTURING','RETAIL_ESTABLISHMENT','ECOMMERCE','PROFESSIONAL_SERVICES','MANUFACTURING','BRANCH_EXPANSION','IMPORT_EXPORT'] }, minItems: 1, maxItems: 6 },
    summary: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['intentType','industry','subindustry','activities','locationState','locationCity','entityPreference','existingBusinessLikely','missingCriticalFacts','workflowPackCodes','summary','confidence'],
} as const;

function fallback(message: string): Classification {
  const text = message.toLowerCase();
  const food = /(food|restaurant|cafe|cloud kitchen|bakery|catering|meal)/.test(text);
  const manufacture = /(manufactur|factory|production)/.test(text);
  const ecommerce = /(e-?commerce|online store|sell online)/.test(text);
  const branch = /(new branch|another branch|second location)/.test(text);
  const llp = /\bllp\b/.test(text);
  const company = /(private limited|pvt\.? ltd|company registration)/.test(text);
  const packs = branch ? ['BRANCH_EXPANSION'] : llp ? ['LLP_FORMATION'] : company ? ['PRIVATE_LIMITED_FORMATION'] : ['NEW_PROPRIETORSHIP'];
  if (food) packs.push('FOOD_BUSINESS');
  if (manufacture) packs.push('MANUFACTURING');
  if (ecommerce) packs.push('ECOMMERCE');
  return {
    intentType: branch ? 'OPEN_NEW_BRANCH' : llp ? 'REGISTER_LLP' : company ? 'REGISTER_COMPANY' : food ? 'START_FOOD_BUSINESS' : manufacture ? 'START_MANUFACTURING' : ecommerce ? 'START_ECOMMERCE' : 'START_NEW_BUSINESS',
    industry: food ? 'Food & Beverage' : manufacture ? 'Manufacturing' : ecommerce ? 'E-commerce' : null,
    subindustry: null, activities: [], locationState: null, locationCity: null,
    entityPreference: llp ? 'LLP' : company ? 'Private Limited Company' : null,
    existingBusinessLikely: branch, missingCriticalFacts: ['business location','expected annual turnover'],
    workflowPackCodes: packs, summary: 'I understood the broad goal. I will confirm only the details needed to build the compliance plan.', confidence: 0.55,
  };
}

function redactForAi(message: string) {
  return message
    .replace(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/gi, '[GSTIN REDACTED]')
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi, '[PAN REDACTED]')
    .replace(/\b[A-Z][0-9]{7}[A-Z]\b/gi, '[CIN/LLPIN REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL REDACTED]')
    .replace(/(?:\+91[-\s]?)?[6-9]\d{9}\b/g, '[PHONE REDACTED]');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in before using RegisterBox AI.' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await supabase.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 3 || message.length > 1500) return json({ error: 'Describe your business goal in 3 to 1,500 characters.' }, 400);

  const { data: businesses, error: businessError } = await supabase.from('business_profiles').select('id,legal_name,trade_name,entity_type,business_category,business_subcategory,pan,gstin,status').is('deleted_at', null).order('updated_at', { ascending: false }).limit(10);
  if (businessError) return json({ error: 'We could not load your business profile.' }, 500);

  const system = 'You classify Indian business onboarding requests for RegisterBox. Never invent legal requirements or claim a registration is required. Select workflow packs that collect facts; a deterministic compliance engine decides applicability. Extract only facts stated by the user. Treat redaction placeholders as unavailable data. When uncertain, use null and include the fact in missingCriticalFacts. Keep summary to two short sentences.';
  let classification: Classification;
  let model = 'deterministic-fallback';
  let latencyMs = 0;
  let runStatus: 'SUCCEEDED' | 'FALLBACK' = 'FALLBACK';
  let aiError: string | null = null;
  try {
    const result = await callQwenStructured<Classification>({ system, user: redactForAi(message), name: 'registerbox_intent', schema });
    classification = result.data;
    model = result.model;
    latencyMs = result.latencyMs;
    runStatus = 'SUCCEEDED';
  } catch (error) {
    aiError = error instanceof Error ? error.message : String(error);
    console.error('Qwen classification fallback', aiError);
    classification = fallback(message);
  }

  const existingBusinessId = typeof body.existingBusinessId === 'string' ? body.existingBusinessId : null;
  const allowedBusiness = existingBusinessId ? businesses?.find((business) => business.id === existingBusinessId) : null;
  if (existingBusinessId && !allowedBusiness) return json({ error: 'That business is not available in your account.' }, 403);

  const { data: intent, error: intentError } = await supabase.from('business_intents').insert({
    user_id: auth.user.id, existing_business_id: allowedBusiness?.id ?? null, intent_type: classification.intentType,
    raw_user_input: message, industry: classification.industry, subindustry: classification.subindustry,
    activities: classification.activities, location_state: classification.locationState, location_city: classification.locationCity,
    entity_preference: classification.entityPreference, missing_critical_facts: classification.missingCriticalFacts,
    status: 'COLLECTING_DATA', ai_confidence: classification.confidence, classification_source: runStatus === 'SUCCEEDED' ? 'AI' : 'RULE',
  }).select('id').single();
  if (intentError) return json({ error: 'We could not start the onboarding flow.' }, 500);

  const { data: packs } = await supabase.from('workflow_packs').select('id,code,name').in('code', classification.workflowPackCodes).eq('active', true);
  if (packs?.length) {
    const { error } = await supabase.from('intent_workflow_packs').insert(packs.map((pack) => ({ intent_id: intent.id, pack_id: pack.id, source: runStatus === 'SUCCEEDED' ? 'AI' : 'RULE' })));
    if (error) console.error('Could not attach all workflow packs', error);
  }
  const { data: session, error: sessionError } = await supabase.from('onboarding_sessions').insert({ user_id: auth.user.id, intent_id: intent.id, current_stage: 'discovery' }).select('id').single();
  if (sessionError) return json({ error: 'We could not create the onboarding session.' }, 500);

  await supabase.from('ai_runs').insert({ user_id: auth.user.id, intent_id: intent.id, operation: 'INTENT_CLASSIFICATION', model, status: runStatus, latency_ms: latencyMs, output_json: classification, error_code: aiError?.slice(0, 120) ?? null });
  await supabase.from('domain_events').insert({ user_id: auth.user.id, intent_id: intent.id, event_type: 'BUSINESS_INTENT_CLASSIFIED', payload: { workflowPackCodes: classification.workflowPackCodes, source: runStatus } });

  const { data: nextRows } = await supabase.rpc('get_next_onboarding_requirement', { target_session_id: session.id });
  return json({ intentId: intent.id, sessionId: session.id, classification, workflowPacks: packs ?? [], businesses: businesses ?? [], selectedBusinessId: allowedBusiness?.id ?? null, nextQuestion: nextRows?.[0] ?? null, source: runStatus === 'SUCCEEDED' ? 'ai' : 'fallback' });
});
