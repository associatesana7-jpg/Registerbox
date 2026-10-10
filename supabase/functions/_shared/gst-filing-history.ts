import { decryptToken } from '../gst-workspace/domain.ts';
export type FilingRecord={form:string;period:string;status:string;arn:string|null;filedOn:string|null;valid:string|null};
export type FilingHistory={records:FilingRecord[];checkedAt:string;period:string};
export function normalizeReturnType(value:string){return value.replace(/[-\s]/g,'').toUpperCase();}
export function parseFilingHistory(envelope:unknown,period:string):FilingHistory{
  const e=envelope as {status_cd?:unknown;data?:{EFiledlist?:unknown}};
  if(!e||String(e.status_cd)!=='1'||!e.data||typeof e.data!=='object'||Array.isArray(e.data))throw Error('GST filing history is unavailable. No filing action is allowed until status can be checked.');
  // Sandbox documents a successful empty object as "record not found".
  if(e.data.EFiledlist===undefined&&Object.keys(e.data).length!==0)throw Error('Unrecognized GST filing-history response.');
  const rows=e.data.EFiledlist??[];if(!Array.isArray(rows))throw Error('Invalid GST filing-history list.');
  const records:FilingRecord[]=[];
  for(const row of rows){
    if(!row||typeof row.rtntype!=='string'||typeof row.ret_prd!=='string'||typeof row.status!=='string'||!row.status.trim())throw Error('Incomplete GST filing-history record.');
    if(row.ret_prd!==period)continue;
    records.push({form:normalizeReturnType(row.rtntype),period:row.ret_prd,status:row.status,arn:typeof row.arn==='string'?row.arn:null,filedOn:typeof row.dof==='string'?row.dof:null,valid:typeof row.valid==='string'?row.valid:null});
  }
  return {records,period,checkedAt:new Date().toISOString()};
}
export function filingBlock(history:FilingHistory,form:string){
  const records=history.records.filter(r=>r.form===normalizeReturnType(form));
  if(!records.length)return null;
  const filed=records.find(r=>r.status.toLowerCase()==='filed');
  if(filed)return {record:filed,message:`${filed.form} is already filed on GST for ${history.period}${filed.arn?' (ARN '+filed.arn+')':''}. Duplicate filing is blocked.`};
  const explicitlyNotFiled=records.every(r=>['not filed','not_filed'].includes(r.status.trim().toLowerCase()));
  if(explicitlyNotFiled)return null;
  // Do not guess whether an unfamiliar/submitted/pending status permits another write.
  return {record:records[0],message:`GST reports ${records[0].status} for this return. Review its portal status before starting another filing.`};
}
export async function fetchFilingHistory(env:Record<string,string>,connection:{status:string;token_ciphertext:string|null;expires_at:string|null},owner:string,year:number,month:number):Promise<FilingHistory>{
  if(connection.status!=='linked'||!connection.token_ciphertext||!connection.expires_at||!Number.isFinite(Date.parse(connection.expires_at))||Date.parse(connection.expires_at)<=Date.now())throw Error('Reconnect GST to check portal filing history.');
  const legacy=Object.keys(env).find(name=>/^key_live_[a-z0-9]+$/i.test(name)),key=env.SANDBOX_API_KEY??legacy,secret=env.SANDBOX_API_SECRET??(legacy?env[legacy]:undefined);
  if(!key?.startsWith('key_live_')||!secret)throw Error('Live GST credentials are unavailable.');
  const token=await decryptToken(connection.token_ciphertext,env.GST_TOKEN_ENCRYPTION_KEY||secret,owner);
  const response=await fetch(`https://api.sandbox.co.in/gst/compliance/tax-payer/gstrs/${year}/${String(month).padStart(2,'0')}/track`,{headers:{authorization:token,'x-api-key':key,'x-api-version':'1.0.0','x-source':'primary'},signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||Number(result.code)>=400)throw Error('GST portal filing history is unavailable. Try again before filing.');
  return parseFilingHistory(result.data,String(month).padStart(2,'0')+year);
}
