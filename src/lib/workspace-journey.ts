export type WorkspaceDraft={category:string;updatedAt?:string;answers:Record<string,string>};
export const objectRecord=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function applicationStage(status:string){
  if(status==='APPROVED')return {index:3,label:'Completed',tone:'green' as const,next:'Approval recorded. View your documents for the issued certificate.'};
  if(['REJECTED','CANCELLED'].includes(status))return {index:1,label:status==='REJECTED'?'Needs review':'Closed',tone:'red' as const,next:'Contact our team to discuss the next step.'};
  if(['NEEDS_CUSTOMER_INFO','CLIENT_QUERY','QUERY_RAISED','DOCUMENTS_REQUIRED','PENDING_DOCUMENTS','AWAITING_DOCUMENTS','GOVERNMENT_QUERY','RESPONSE_REQUIRED'].includes(status))return {index:1,label:'Action needed',tone:'amber' as const,next:'Review the request and add the requested documents.'};
  if(status==='WAITING_FOR_OTP')return {index:2,label:'Authorization needed',tone:'amber' as const,next:'Your team needs your authorization. Contact them to complete the required OTP or signature.'};
  if(status==='SUBMITTING')return {index:2,label:'Submission in progress',tone:'blue' as const,next:'The submission outcome is being checked. Do not start a duplicate application.'};
  if(status==='READY_TO_FILE')return {index:2,label:'Ready for filing',tone:'blue' as const,next:'The team has prepared your case. They will contact you for any required final approval.'};
  if(['SUBMITTED','SUBMITTED_TO_GOVERNMENT','UNDER_GOVERNMENT_REVIEW','UNDER_REVIEW','RESPONSE_SUBMITTED'].includes(status))return {index:2,label:'In review',tone:'blue' as const,next:'Your application is being processed. We’ll contact you if anything else is needed.'};
  return {index:1,label:'With RegisterBox',tone:'blue' as const,next:'Our team will review your details before government filing.'};
}
export function readWorkspaceDrafts(questionnaire:unknown,allowed:string[],submitted:string[]=[]):WorkspaceDraft[]{
  const entries=objectRecord(objectRecord(questionnaire).application_drafts);
  return Object.entries(entries).filter(([category,value])=>allowed.includes(category)&&!submitted.includes(category)&&!objectRecord(value).application_id&&!['submitted','submitted_to_registerbox'].includes(String(objectRecord(value).status))).map(([category,value])=>{
    const draft=objectRecord(value);return {category,updatedAt:typeof draft.updated_at==='string'?draft.updated_at:undefined,answers:Object.fromEntries(Object.entries(objectRecord(draft.answers)).filter((entry):entry is [string,string]=>typeof entry[1]==='string'))};
  }).sort((a,b)=>(Date.parse(b.updatedAt||'')||0)-(Date.parse(a.updatedAt||'')||0));
}
