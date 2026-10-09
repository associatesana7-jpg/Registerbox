type Draft={state:string;form:string;reconciliation:{matched:boolean}|null;snapshot_at:string|null;reference_id:string|null;last_error?:string|null};
// One next operation, never an automatic write. Each operation keeps its own consent.
export function nilNextStep(draft:Draft|null) {
  if(!draft)return 'eligibility';
  if(draft.state==='filed')return 'complete';
  if(draft.state==='blocked'&&draft.form==='gstr-1'&&draft.last_error?.includes('(RET00003)'))return 'recover';
  // Accepted nil initialization can continue to EVC without a status lookup.
  if(draft.form==='gstr-1'&&draft.state==='proceed_pending'&&draft.reference_id)return 'review';
  if(['proceed_pending','save_pending','offset_pending'].includes(draft.state))return 'poll';
  if(['unknown','blocked'].includes(draft.state))return 'blocked';
  if(draft.form==='gstr-1'&&draft.state==='draft')return 'proceed';
  if(draft.state==='otp_sent')return 'otp';
  if(draft.state==='prepared'||draft.form==='gstr-3b'&&draft.state==='draft')return 'review';
  return 'blocked';
}
