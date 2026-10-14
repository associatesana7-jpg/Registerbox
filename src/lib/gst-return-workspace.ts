import { filingBlock, type FilingHistory } from '../../supabase/functions/_shared/gst-filing-history.ts';
import type { ReturnDraft } from './gst-returns-api';

export function returnPhase(draft: Pick<ReturnDraft, 'state'>) {
  if (['filed', 'otp_sent'].includes(draft.state)) return 'authorize' as const;
  if (['draft', 'blocked'].includes(draft.state)) return 'prepare' as const;
  return 'compare' as const;
}

export function returnHistoryReason(history: FilingHistory | null, form: string, period: string, action: string) {
  if (!['draft', 'save', 'proceed', 'offset', 'evc', 'file'].includes(action)) return undefined;
  if (!history || history.period !== period) return 'Check GST portal filing status before continuing.';
  const blocked = filingBlock(history, form);
  if (blocked) return blocked.message;
  if (form === 'gstr-3b' && ['evc', 'file'].includes(action)
    && !history.records.some(row => row.form === 'GSTR1' && row.status.trim().toLowerCase() === 'filed')) {
    return 'GST must confirm GSTR-1 filed for this period before authorizing GSTR-3B.';
  }
  return undefined;
}
