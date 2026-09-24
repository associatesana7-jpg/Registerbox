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

type BusinessInput = {
  legalName: string; ownerName: string; pan: string; gstin: string; city: string; state: string;
  dineIn: boolean; alcohol: boolean; employees: number; turnover: number;
};

export async function saveBusiness(input: BusinessInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Please sign in again to save your business.');
  const { data: business, error } = await supabase.from('business_profiles').insert({
    user_id: userData.user.id, created_by: userData.user.id, legal_name: input.legalName,
    trade_name: input.legalName, entity_type: 'Proprietorship', constitution: 'Proprietorship',
    pan: input.pan || null, gstin: input.gstin || null, business_category: 'Restaurant',
    business_subcategory: 'Food Service', annual_turnover: input.turnover, employee_count: input.employees,
    email: userData.user.email ?? null,
    questionnaire: { dine_in: input.dineIn, alcohol: input.alcohol, online_delivery: true, premises: 'rented' },
    status: 'active',
  }).select('id').single();
  if (error) throw error;
  const { error: addressError } = await supabase.from('business_addresses').insert({
    business_id: business.id, type: 'principal', address_line_1: 'Marathahalli', city: input.city,
    state: input.state, pincode: '560037', ownership_type: 'rented',
  });
  if (addressError) throw addressError;
  const { error: evidenceError } = await supabase.from('business_field_evidence').insert([
    { business_id: business.id, field_name: 'pan', field_value: input.pan, source: 'USER_INPUT', confidence: 1, verification_status: 'user_confirmed' },
    { business_id: business.id, field_name: 'gstin', field_value: input.gstin, source: 'USER_INPUT', confidence: 1, verification_status: 'user_confirmed' },
  ]);
  if (evidenceError) throw evidenceError;
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
