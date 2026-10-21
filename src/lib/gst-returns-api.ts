import { supabase } from '@/lib/supabase';
import type { PaymentContext, preparePayment } from '../../supabase/functions/_shared/gst-payment';
import type { FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';

export type ReturnDraft = {
  id: string; gstin: string; form: 'gstr-1'|'gstr-3b'; year: number; month: number;
  revision: number; state: string; payload: Record<string,unknown>; payload_hash: string;
  snapshot: Record<string,unknown> | null; snapshot_hash: string | null; snapshot_at: string | null;
  reconciliation: {matched:boolean; scope:string; differences:{field:string;expected:number|null;actual:number|null}[]} | null;
  source_evidence?: import('../../supabase/functions/_shared/gst-amendment-links').AmendmentEvidence|import('../../supabase/functions/_shared/gst-portal-resume').PortalResumeEvidence|null;
  acknowledgement: string|null; last_error: string|null; reference_id: string|null;
  signatory_pan: string|null;
  otp_sent_at?: string|null;
};
export type SavedSignatory = {id:string;name:string;pan:string};
export type ReturnResponse = {paymentState?:'settled'|'payable'|'unconfirmed';creditPostingRequired?:boolean;signatories?:SavedSignatory[];history?:FilingHistory;paymentContext?:PaymentContext; paymentReview?:ReturnType<typeof preparePayment>; gstin?:string; draft?:ReturnDraft; drafts?:ReturnDraft[]; writesEnabled:boolean; allocation?:Record<string,unknown>; allocationHash?:string; ledger?:unknown; providerStatus?:unknown};
export class GstReturnError extends Error {
  readonly providerCode?:string;
  readonly operationId?:string;
  readonly providerRequestId?:string;
  constructor(message:string,meta:Record<string,unknown>={}) {
    super(message);this.name='GstReturnError';
    for(const key of ['providerCode','operationId','providerRequestId'] as const){const value=meta[key];if(typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(value))this[key]=value;}
  }
}
export async function returnAction(businessId: string, action: string, input: Record<string,unknown> = {}): Promise<ReturnResponse> {
  const {data,error} = await supabase.functions.invoke('gst-returns',{timeout:['list','history','signatories'].includes(action)?30000:90000,body:{...input,businessId,action,consentAction:action,consentVersion:'gst-returns-v1'}});
  if (error) {
    let message = 'Could not reach the return service. Reload and check status before retrying.';
    const context = error.context;
    let metadata:Record<string,unknown>={};
    if (context && typeof context.json === 'function') {
      try { const value = await (typeof context.clone === 'function' ? context.clone() : context).json(); if (typeof value.error === 'string') message=value.error;metadata=value; } catch { /* Preserve safe fallback. */ }
    }
    throw new GstReturnError(message,metadata);
  }
  if (!data || data.error) throw new GstReturnError(data?.error || 'No return-service response.',data||{});
  return data;
}
