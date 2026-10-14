import { supabase } from '@/lib/supabase';
import { PRIVACY_NOTICE_VERSION, privacyConsentDecision, type PrivacyPurpose, type PrivacyRight } from '../../supabase/functions/_shared/privacy-domain';

export type PrivacyPreference={purpose:PrivacyPurpose;allowed:boolean;notice_version:string;changed_at:string;language:'en'|'hi'};
export type PrivacyCase={id:string;kind:PrivacyRight;details:string;status:string;created_at:string;target_at:string;response:string|null};
export type PrivacyState={noticeVersion:string;preferences:PrivacyPreference[];events:{id:string;purpose:PrivacyPurpose;allowed:boolean;notice_version:string;created_at:string}[];requests:PrivacyCase[];processorTasks:{id:string;purpose:string;status:string;target_at:string;response:string|null;retained_until:string|null}[]};
export async function privacyAction<T>(action:string,input:Record<string,unknown>={}):Promise<T>{
  const {data,error}=await supabase.functions.invoke('privacy-center',{body:{...input,action}});
  if(error){let message='Privacy service unavailable. No permission or completion was assumed.';try{const result=await error.context?.clone().json();if(typeof result?.error==='string')message=result.error;}catch{/* Safe fallback. */}throw Error(message);}
  if(!data||data.error)throw Error(data?.error||'No privacy-service response.');
  return data;
}
export const loadPrivacyState=()=>privacyAction<PrivacyState>('state');
export function changePrivacyPurpose(purpose:PrivacyPurpose,allowed:boolean,language:'en'|'hi',isAdult:boolean,expectedChangedAt?:string){
  return privacyAction<{preference:PrivacyPreference}>('preference',{purpose,allowed,language,isAdult,expectedChangedAt,noticeVersion:PRIVACY_NOTICE_VERSION,confirmed:true});
}
export function createPrivacyCase(kind:PrivacyRight,details:string){return privacyAction<{request:PrivacyCase}>('request',{kind,details,confirmed:true});}
export async function requirePrivacyPurpose(purpose:PrivacyPurpose){
  const state=await loadPrivacyState();
  if(!privacyConsentDecision(state.preferences.find(p=>p.purpose===purpose)))throw Error('Open Privacy Centre and give permission for this optional AI purpose first. Manual services remain available.');
}
