import { supabase } from '@/lib/supabase';

export const GST_CONSENT_VERSION = 'gst-v1-2026-09-24';
export type GstConnection = {
  id: string; gstin: string | null; username: string | null;
  status: 'disconnected' | 'otp_pending' | 'linked' | 'expired';
  expiresAt: string | null; lastOtpAt: string | null;
};
export type GstReturn = {
  details: Record<string, unknown>; fetchedAt: string; gstin: string;
  form: string; year: number; month: number; filed: false;
};
export async function gstAction<T>(businessId: string, action: string, input: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gst-workspace', {
    body: { ...input, businessId, action, consentVersion: GST_CONSENT_VERSION },
  });
  if (error) {
    const context = error.context;
    let details: { error?: string } | null = null;
    if (context && typeof context.json === 'function') {
      try {
        const response = typeof context.clone === 'function' ? context.clone() : context;
        details = await response.json();
      } catch { /* Network failures may carry an Error instead of a Response. */ }
    }
    throw new Error(details?.error || 'Could not reach the GST service. Check your connection and try again.');
  }
  if (!data || data.error) throw new Error(data?.error || 'GST returned no response.');
  return data as T;
}
