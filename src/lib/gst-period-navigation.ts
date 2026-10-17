import type { FilingHistory } from '../../supabase/functions/_shared/gst-filing-history';

export function gstr1Filed(history:FilingHistory|null){
  return !!history?.records.some(row=>row.form==='GSTR1'&&row.status.trim().toLowerCase()==='filed');
}
/** Default to GSTR-1, then advance on verified filing. Manual viewing of an already-filed GSTR-1 stays possible. */
export function advanceTo3b(history:FilingHistory|null,previous:FilingHistory|null,manualTab:boolean){
  if(!gstr1Filed(history))return false;
  return !manualTab||(previous?.period===history?.period&&!gstr1Filed(previous));
}
