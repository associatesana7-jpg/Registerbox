type Draft = { state: string; form?: string; reference_id?: string | null; last_error?: string | null; reconciliation?:{matched:boolean}|null };
export type GstRecovery = {
  target: 'ims' | 'saved-return' | 'payment' | 'reconnect' | 'otp' | 'reconcile' | 'check' | 'refresh';
  title: string;
  detail: string;
  label: string;
  consent?: string;
};

/** Navigation hints only. The server still verifies history, version and consent. */
export function gstReturnRecovery(draft: Draft | null, failure?: { message?: string; providerCode?: string } | null): GstRecovery | null {
  if (draft?.state === 'filed') return null;
  const message = failure?.message || draft?.last_error || '';
  const code = failure?.providerCode || message.match(/\(([A-Z0-9_-]+)\)/)?.[1] || '';
  if (/reconnect|connect GST|session.*expir|token.*expir|credential rotation|authentication.*expir/i.test(message)) return {
    target:'reconnect',title:'Reconnect GST, then continue',label:'Reconnect GST & continue →',
    detail:'Your saved return and period stay here. Reconnect with the GST login OTP; we will check status without repeating the previous payment or filing request.',
  };
  if (draft && (draft.state === 'unknown' || draft.state.endsWith('_pending'))) return {
    target:'check',title:'Check the previous request',label:'Check GST processing status →',
    detail:'GST has not confirmed the final outcome. Check the existing request first. Do not send another offset or filing request.',
    consent:'Check the previous GST request and its current status without repeating it.',
  };
  if (draft?.form === 'gstr-3b' && (code === 'IMS002_CD' || /GSTR-?2B.*(not available|not generated|comput)|IMS.*comput/i.test(message))) return {
    target:'ims',title:'Resolve invoices & generate GSTR-2B',label:'Resolve in IMS →',
    detail:'Review invoices, save your decisions, then compute GSTR-2B. Once GST confirms it is ready, continue with this same return.',
  };
  if (draft?.form === 'gstr-3b' && code === 'RT-3BAS1079') return {
    target:'saved-return',title:'Continue with the saved GSTR-3B',label:'Review saved return & continue →',
    detail:'GST already has figures for this period. Load them here, review payment / credit posting, then file with OTP. Do not send another nil request.',
    consent:'Load this period’s saved GSTR-3B and payment status. This does not use funds or file the return.',
  };
  if (code === 'RET13506' || /filing (code|otp).*(expired|incorrect)|OTP is either expired or incorrect/i.test(message)) return {
    target:'otp',title:'Use a new filing OTP',label:'Continue to resend OTP →',
    detail:'GST rejected the code, not the return figures. Your saved work stays here. Resend the OTP and authorize filing again.',
  };
  if (draft?.form === 'gstr-3b' && /payment details.*missing|credit posting|complete.*offset|cash.*(shortfall|insufficient|top.up)|insufficient.*cash/i.test(message)) return {
    target:'payment',title:'Complete payment / post credit',label:'Review payment & credit →',
    detail:'Check current payable amounts and ledger balances. Review the allocation before authorizing any offset. Zero cash payable may still require posting credit.',
    consent:'Fetch and compare current payment details. If GST requires importing a saved return, preserve the previous draft for review. Do not use funds or file anything.',
  };
  if (/reconcile|snapshot.*(fresh|changed|expired)|GST data changed|version.*changed|draft.*changed/i.test(message)) return {
    target:'reconcile',title:'Refresh the saved GST figures',label:'Refresh & compare →',
    detail:'GST figures changed or the review expired. Compare the latest saved return and approve the updated version before continuing.',
    consent:'Fetch and compare the current saved return without changing it or using funds.',
  };
  if(draft?.form==='gstr-3b'&&draft.reconciliation?.matched===false&&['saved','prepared'].includes(draft.state)) return {
    target:'saved-return',title:'Review the changed GST figures',label:'Review updated GST return →',
    detail:'The saved GST figures differ from your private draft. Review the differences below. You can load the GST version for review; your previous private figures are retained. Check it against your books before authorizing payment or filing.',
    consent:'Import the latest saved GST figures for review and preserve my previous private draft. Do not save to GST, use funds or file anything.',
  };
  if (message || draft?.state === 'blocked') return {
    target:'refresh',title:'Check status before continuing',label:'Refresh return status →',
    detail:'Your saved work is preserved. Check the latest status; do not repeat a payment or filing request until its outcome is known.',
  };
  return null;
}
