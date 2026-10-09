import { supabase } from '@/lib/supabase';
import type { PaymentContext, preparePayment } from '../../supabase/functions/_shared/gst-payment';
import type { FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';

export type ReturnDraft = {
  id: string; gstin: string; form: 'gstr-1'|'gstr-3b'; year: number; month: number;
  revision: number; state: string; payload: Record<string,unknown>; payload_hash: string;
  snapshot: Record<string,unknown> | null; snapshot_hash: string | null; snapshot_at: string | null;
  reconciliation: {matched:boolean; scope:string; differences:{field:string;expected:number|null;actual:number|null}[]} | null;
  source_evidence?: import('../../supabase/functions/_shared/gst-amendment-links').AmendmentEvidence|null;
  acknowledgement: string|null; last_error: string|null; reference_id: string|null;
  signatory_pan: string|null;
};
export type SavedSignatory = {id:string;name:string;pan:string};
export type ReturnResponse = {signatories?:SavedSignatory[];history?:FilingHistory;paymentContext?:PaymentContext; paymentReview?:ReturnType<typeof preparePayment>; gstin?:string; draft?:ReturnDraft; drafts?:ReturnDraft[]; writesEnabled:boolean; allocation?:Record<string,unknown>; allocationHash?:string; ledger?:unknown; providerStatus?:unknown};
export async function returnAction(businessId: string, action: string, input: Record<string,unknown> = {}): Promise<ReturnResponse> {
  const {data,error} = await supabase.functions.invoke('gst-returns',{body:{...input,businessId,action,consentAction:action,consentVersion:'gst-returns-v1'}});
  if (error) {
    let message = 'Could not reach the return service. Reload and check status before retrying.';
    const context = error.context;
    if (context && typeof context.json === 'function') {
      try { const value = await (typeof context.clone === 'function' ? context.clone() : context).json(); if (typeof value.error === 'string') message=value.error; } catch { /* Preserve safe fallback. */ }
    }
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error || 'No return-service response.');
  return data;
}
