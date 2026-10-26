import { normalizeEmail } from '@/lib/registerbox-api';
import { supabase } from '@/lib/supabase';
import { adaptiveAuthRequest, rememberAuthenticatedDevice, type AuthCaptchaVerifier } from '@/lib/auth-gateway';
import type { PaymentOperationsDetail, PaymentOperationsFilters, PaymentOperationsList, PaymentOperationsRow, PaymentFollowUpStatus } from '@/lib/payment-operations-types';

export type ControlCenterStaff = {
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
};

export type ControlCenterDashboard = {
  staff: ControlCenterStaff;
  metrics: {
    customers: number;
    businesses: number;
    activeApplications: number;
    waitingCustomer: number;
    needsReview: number;
    governmentQueries: number;
    slaRisk: number;
    completedToday: number;
    revenueToday: number;
    expiringSoon: number;
    expired: number;
  };
  priorityQueue: {
    id: string;
    reference: string;
    business: string;
    service: string;
    status: string;
    priority: string;
    slaDueAt: string | null;
    owner: string;
  }[];
  health: {
    name: string;
    status: 'Operational' | 'Configured' | 'Degraded' | 'Manual' | 'Attention' | 'Unknown';
    detail: string;
  }[];
  generatedAt: string;
};

export type ControlCenterSection = 'customers' | 'businesses' | 'applications' | 'drafts' | 'documents' | 'licenses' | 'intents' | 'audit' | 'actions' | 'queries' | 'sla' | 'ai' | 'exceptions' | 'finance' | 'notifications' | 'security' | 'integrations';

export type ControlCenterDirectoryRow = {
  id: string;
  businessId?: string;
  kind: string;
  title: string;
  subtitle: string;
  status: string;
  fields: { label: string; value: string }[];
  canOpenDocument?: boolean;
};

export type ControlCenterDirectory = {
  section: ControlCenterSection;
  rows: ControlCenterDirectoryRow[];
  count: number;
  page: number;
  hasMore: boolean;
  generatedAt: string;
};

export type WebsiteLeadStatus = 'new' | 'contacted' | 'closed';

export type WebsiteLead = {
  id: string;
  fullName: string;
  phone: string;
  serviceKey: string;
  serviceLabel: string;
  sourcePath: string;
  locale: string;
  status: WebsiteLeadStatus;
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string | null;
};

export type WebsiteLeadList = { leads: WebsiteLead[]; generatedAt: string };

export async function sendControlCenterOtp(email: string, verifyCaptcha?: AuthCaptchaVerifier) {
  const normalized = normalizeEmail(email);
  if (await adaptiveAuthRequest('admin_email', normalized, verifyCaptcha)) return;
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verifyControlCenterOtp(email: string, token: string) {
  if (!/^\d{6}$/.test(token)) throw new Error('Enter the 6-digit code sent to your email.');
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: 'email',
  });
  if (error) throw error;
  if (!data.session) throw new Error('The code could not be verified. Request a new one.');
  await rememberAuthenticatedDevice(data.session.access_token);
  return data.session;
}

export async function controlCenterRequest<T>(
  action: 'me' | 'dashboard' | 'directory' | 'document_link' | 'filing_workspace' | `crm_${string}` | `payment_${string}` | `lead_${string}`,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('control-center', { body: { action, ...payload } });
  if (error) {
    const response = error.context as Response | undefined;
    const details = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null;
    throw new Error(details?.error || error.message || 'The Control Center request failed.');
  }
  if (!data) throw new Error('The Control Center returned no data.');
  return data;
}

export async function loadControlCenterDirectory(section: ControlCenterSection, page = 0) {
  return controlCenterRequest<ControlCenterDirectory>('directory', { section, page });
}

export async function createControlCenterDocumentLink(documentId: string, reason: string) {
  return controlCenterRequest<{ url: string; filename: string; expiresIn: number }>('document_link', { documentId, reason });
}

export function loadPaymentOperations(filters: PaymentOperationsFilters) {
  return controlCenterRequest<PaymentOperationsList>('payment_list', { ...filters });
}

export function loadPaymentOperation(id: string) {
  return controlCenterRequest<PaymentOperationsDetail>('payment_detail', { id });
}

export function reconcilePaymentOperation(id: string, reason: string) {
  return controlCenterRequest<{ message?: string }>('payment_reconcile', { id, reason });
}

export function addPaymentOperationNote(id: string, body: string) {
  return controlCenterRequest('payment_note', { id, body });
}

export function updatePaymentOperationCase(id: string, status: PaymentFollowUpStatus) {
  return controlCenterRequest('payment_case_update', { id, status });
}

export function exportPaymentOperations(filters: PaymentOperationsFilters, reason: string) {
  return controlCenterRequest<{ rows: PaymentOperationsRow[]; hasMore: boolean; limit?: number; total?: number }>('payment_export', { ...filters, reason });
}

export function loadWebsiteLeads(status: WebsiteLeadStatus | 'all' = 'all') {
  return controlCenterRequest<WebsiteLeadList>('lead_list', { status });
}

export function updateWebsiteLead(id: string, status: WebsiteLeadStatus) {
  return controlCenterRequest<{ lead: WebsiteLead }>('lead_update', { id, status });
}

export async function signOutControlCenter() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
