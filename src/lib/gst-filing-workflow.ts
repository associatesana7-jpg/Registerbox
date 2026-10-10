export type PortalFilingState = 'FILED' | 'PROCESSING' | 'REJECTED' | 'NOT_FILED' | 'NO_RECORD' | 'UNKNOWN';

export const GST_FILING_STEPS = [
  { key: 'profile', label: 'GSTIN' },
  { key: 'status', label: 'Status' },
  { key: 'prepare', label: 'Prepare' },
  { key: 'reconcile', label: 'Reconcile' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
  { key: 'authorize', label: 'Authorize' },
  { key: 'acknowledge', label: 'ARN' },
] as const;

export const GST_RETURN_COVERAGE = [
  { form: 'GSTR-1', purpose: 'Outward supplies', availability: 'enabled' },
  { form: 'GSTR-3B', purpose: 'Summary return and tax payment', availability: 'enabled' },
  { form: 'IFF', purpose: 'QRMP invoice furnishing', availability: 'review' },
  { form: 'GSTR-1A', purpose: 'Permitted current-period corrections', availability: 'review' },
  { form: 'CMP-08 / GSTR-4', purpose: 'Composition taxpayers', availability: 'review' },
  { form: 'GSTR-5 / 5A / 6 / 7 / 8', purpose: 'Special taxpayer returns', availability: 'review' },
  { form: 'GSTR-9 / 9C / 10 / 11', purpose: 'Annual, final and UIN workflows', availability: 'review' },
] as const;

export function classifyPortalStatus(status?: string | null): PortalFilingState {
  if (!status) return 'NO_RECORD';
  const normalized = status.trim().toLowerCase();
  if (['filed', 'accepted'].includes(normalized)) return 'FILED';
  if (['submitted', 'processing', 'pending', 'initiated'].includes(normalized)) return 'PROCESSING';
  if (['rejected', 'failed', 'error', 'invalid'].includes(normalized)) return 'REJECTED';
  if (['not filed', 'not_filed'].includes(normalized)) return 'NOT_FILED';
  return 'UNKNOWN';
}

export function portalStateCopy(state: PortalFilingState) {
  switch (state) {
    case 'FILED': return 'Filed on GST. Duplicate filing is blocked.';
    case 'PROCESSING': return 'GST is processing an existing operation. Check its outcome before continuing.';
    case 'REJECTED': return 'GST reports a rejected or failed operation. Review the provider response before correcting it.';
    case 'NOT_FILED': return 'GST reports this return as not filed.';
    case 'NO_RECORD': return 'No filing entry was returned. This does not prove that the return is nil.';
    default: return 'GST returned an unfamiliar status. Filing remains blocked pending review.';
  }
}
