import * as DocumentPicker from 'expo-document-picker';

import type { ComplianceItem } from '@/data/demo';
import { supabase } from '@/lib/supabase';

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}

export async function sendEmailOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  if (!/^\d{6}$/.test(token)) throw new Error('Enter the 6-digit code sent to your email.');
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase.auth.verifyOtp({ email: normalizedEmail, token, type: 'email' });
  if (error) throw error;
  if (!data.user) throw new Error('We could not verify this code. Please request a new one.');
  const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, email: normalizedEmail });
  if (profileError) throw profileError;
  return data;
}

export type BusinessIdentityResult = {
  verificationId: string;
  identifierType: 'PAN' | 'GSTIN';
  identifier: string;
  valid: boolean;
  provider: 'sandbox';
  verifiedAt: string;
  cached: boolean;
  legalName: string | null;
  tradeName?: string | null;
  entityType: string | null;
  taxpayerType?: string | null;
  registrationStatus: string | null;
  registrationDate?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  natureOfBusinessActivities?: string[];
  lastUpdatedAt?: string | null;
};

export async function verifyBusinessIdentity(identifierType: 'PAN' | 'GSTIN', identifier: string, name?: string, dateOfBirth?: string) {
  const { data, error } = await supabase.functions.invoke<BusinessIdentityResult>('verify-business-identity', {
    body: { identifierType, identifier, name, dateOfBirth, consent: true },
  });
  if (error) {
    const context = error.context as Response | undefined;
    if (context) {
      const details = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (details?.error) throw new Error(details.error);
    }
    throw error;
  }
  if (!data) throw new Error('The verification service returned no data.');
  return data;
}

type BusinessInput = {
  legalName: string; ownerName: string; pan: string; gstin: string; city: string; state: string;
  dineIn: boolean; alcohol: boolean; employees: number; turnover: number;
  entityType?: string; tradeName?: string; address?: string; pincode?: string;
  verificationId?: string; verificationType?: 'PAN' | 'GSTIN'; verifiedAt?: string;
};

export async function saveBusiness(input: BusinessInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Please sign in again to save your business.');
  const { data: business, error } = await supabase.from('business_profiles').insert({
    user_id: userData.user.id, created_by: userData.user.id, legal_name: input.legalName,
    trade_name: input.tradeName || input.legalName, entity_type: input.entityType || 'Proprietorship', constitution: input.entityType || 'Proprietorship',
    pan: input.pan || null, gstin: input.gstin || null, business_category: 'Restaurant',
    business_subcategory: 'Food Service', annual_turnover: input.turnover, employee_count: input.employees,
    email: userData.user.email ?? null,
    questionnaire: { dine_in: input.dineIn, alcohol: input.alcohol, online_delivery: true, premises: 'rented' },
    status: 'active',
  }).select('id').single();
  if (error) throw error;
  if (input.city && input.state && /^[1-9]\d{5}$/.test(input.pincode ?? '')) {
    const { error: addressError } = await supabase.from('business_addresses').insert({
      business_id: business.id, type: 'principal', address_line_1: input.address || input.city, city: input.city,
      state: input.state, pincode: input.pincode!, ownership_type: 'rented', verified: input.verificationType === 'GSTIN',
    });
    if (addressError) throw addressError;
  }
  const verifiedField = input.verificationType?.toLowerCase();
  const { error: evidenceError } = await supabase.from('business_field_evidence').insert([
    ...(input.pan ? [{ business_id: business.id, field_name: 'pan', field_value: input.pan, source: verifiedField === 'pan' ? 'GOVERNMENT_API' : 'USER_INPUT', confidence: verifiedField === 'pan' ? 0.99 : 1, verification_status: verifiedField === 'pan' ? 'verified' : 'user_confirmed', last_verified_at: verifiedField === 'pan' ? input.verifiedAt : null }] : []),
    ...(input.gstin ? [{ business_id: business.id, field_name: 'gstin', field_value: input.gstin, source: verifiedField === 'gstin' ? 'GOVERNMENT_API' : 'USER_INPUT', confidence: verifiedField === 'gstin' ? 0.99 : 1, verification_status: verifiedField === 'gstin' ? 'verified' : 'user_confirmed', last_verified_at: verifiedField === 'gstin' ? input.verifiedAt : null }] : []),
  ]);
  if (evidenceError) throw evidenceError;
  if (input.verificationId) {
    const { error: verificationError } = await supabase.from('kyc_verifications').update({ business_id: business.id }).eq('id', input.verificationId);
    if (verificationError) throw verificationError;
  }
  return business.id;
}

export async function runComplianceScan(businessId: string): Promise<ComplianceItem[]> {
  const { data, error } = await supabase.rpc('run_compliance_scan', { target_business_id: businessId });
  if (error) throw error;
  return (data ?? []).map((row, index) => ({
    id: row.result_id, name: row.service_name, slug: row.service_slug,
    status: row.status as ComplianceItem['status'], fee: Number(row.service_fee), reason: row.reason,
    icon: ['🍽️', '▦', '🏬', '🏢', '₹', '◉', '®'][index] ?? '✓',
  }));
}

export async function chooseAndUploadDocument(businessId: string, type: string) {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Please sign in again to upload documents.');
  const bytes = await (await fetch(asset.uri)).arrayBuffer();
  const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${userData.user.id}/${businessId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('business-documents').upload(path, bytes, { contentType: asset.mimeType ?? 'application/octet-stream' });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from('documents').insert({
    business_id: businessId, type, storage_path: path, original_filename: asset.name,
    mime_type: asset.mimeType ?? 'application/octet-stream', uploaded_by: userData.user.id,
  }).select('id, original_filename').single();
  if (error) throw error;
  return data;
}

export type OnboardingQuestion = {
  field_key: string;
  question_text: string;
  help_text: string | null;
  expected_answer_type: 'text' | 'boolean' | 'number' | 'choice' | 'document' | 'registration';
  options_json: string[];
  preferred_source: 'KNOWN' | 'CONNECTOR' | 'DOCUMENT' | 'USER';
  completion_percentage: number;
};

export type IntentResult = {
  intentId: string;
  sessionId: string;
  classification: {
    intentType: string;
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
  workflowPacks: { id: string; code: string; name: string }[];
  businesses: { id: string; legal_name: string | null; trade_name: string | null; entity_type: string | null; pan: string | null; gstin: string | null }[];
  selectedBusinessId: string | null;
  nextQuestion: OnboardingQuestion | null;
  source: 'ai' | 'fallback';
};

async function invokeOrThrow<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    const response = error.context as Response | undefined;
    const detail = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null;
    throw new Error(detail?.error ?? error.message);
  }
  if (!data) throw new Error('The service returned no data.');
  return data;
}

export function classifyBusinessIntent(message: string, existingBusinessId?: string) {
  return invokeOrThrow<IntentResult>('ai-intent-router', { message, existingBusinessId });
}

export function saveOnboardingAnswer(sessionId: string, fieldKey: string, value: unknown, source: 'USER' | 'KNOWN' | 'CONNECTOR' | 'DOCUMENT' = 'USER', sourceReference?: string) {
  return invokeOrThrow<{ complete: boolean; nextQuestion: OnboardingQuestion | null; businessId: string | null }>('onboarding-engine', { action: 'answer', sessionId, fieldKey, value, source, sourceReference });
}

export function getNextOnboardingQuestion(sessionId: string) {
  return invokeOrThrow<{ complete: boolean; nextQuestion: OnboardingQuestion | null; businessId: string | null }>('onboarding-engine', { action: 'next', sessionId });
}

export async function ensureDraftBusiness(intentId: string, suggestedName?: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Please sign in again.');
  const { data: intent, error: intentError } = await supabase.from('business_intents').select('existing_business_id').eq('id', intentId).single();
  if (intentError) throw intentError;
  if (intent?.existing_business_id) return intent.existing_business_id;
  const { data: business, error } = await supabase.from('business_profiles').insert({ user_id: auth.user.id, created_by: auth.user.id, legal_name: suggestedName?.trim() || 'New business', trade_name: suggestedName?.trim() || 'New business', status: 'draft' }).select('id').single();
  if (error) throw error;
  const { error: updateError } = await supabase.from('business_intents').update({ existing_business_id: business.id }).eq('id', intentId);
  if (updateError) throw updateError;
  return business.id;
}

export async function createCheckout(businessId: string, slugs: string[]) {
  const { data: services, error: servicesError } = await supabase.from('services').select('id, slug, service_fee').in('slug', slugs);
  if (servicesError) throw servicesError;
  const subtotal = (services ?? []).reduce((sum, service) => sum + Number(service.service_fee), 0);
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const { data: order, error: orderError } = await supabase.from('orders').insert({ business_id: businessId, status: 'pending_payment', subtotal, tax, total: subtotal + tax }).select('id').single();
  if (orderError) throw orderError;
  const { error: itemsError } = await supabase.from('order_items').insert((services ?? []).map((service) => ({ order_id: order.id, service_id: service.id, service_fee: service.service_fee })));
  if (itemsError) throw itemsError;
  const { error: paymentError } = await supabase.from('payments').insert({ business_id: businessId, order_id: order.id, provider: 'pending_provider_configuration', amount: subtotal + tax, tax, status: 'CREATED' });
  if (paymentError) throw paymentError;
  return { orderId: order.id, amount: subtotal + tax };
}
