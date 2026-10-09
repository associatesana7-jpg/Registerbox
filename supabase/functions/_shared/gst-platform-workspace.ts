import {parsePlatformCsv,reviewPlatformImport,PLATFORM_RULE_VERSION,type PlatformRow,type PlatformContext} from './gst-platform-import.ts';
export type PlatformBatch={checksum:string;name:string;csv:string;createdAt:string;accepted:number;duplicates:number;issues:{row:number;message:string}[];ruleVersion:string};
export type PlatformWorkspace={revision:number;rows:PlatformRow[];batches:PlatformBatch[]};
export function appendPlatformImport(workspace:PlatformWorkspace,input:{csv:string;name:string;checksum:string},context:PlatformContext) {
  if(input.csv.length>500000)throw Error('Import a CSV smaller than 500 KB.');
  if(!input.name.trim()||input.name.length>200)throw Error('Choose a valid source filename.');
  const prior=workspace.batches.find(batch=>batch.checksum===input.checksum);
  if(prior)return {workspace,duplicateFile:true,review:null};
  if(workspace.batches.length>=50)throw Error('This period has reached 50 source files. Review existing imports before adding more.');
  const review=reviewPlatformImport(parsePlatformCsv(input.csv),workspace.rows,context);
  if(!review.accepted.length&&!review.duplicates.length&&!review.issues.length)throw Error('The CSV contains no documents.');
  const accepted=review.issues.length?[]:review.accepted.map(item=>item.row);
  if(workspace.rows.length+accepted.length>5000)throw Error('At most 5,000 documents are supported per period and role.');
  const batch:PlatformBatch={...input,createdAt:new Date().toISOString(),accepted:accepted.length,duplicates:review.duplicates.length,issues:review.issues,ruleVersion:PLATFORM_RULE_VERSION};
  return {workspace:{revision:workspace.revision+1,rows:[...workspace.rows,...accepted],batches:[...workspace.batches,batch]},review,duplicateFile:false};
}
export function publicPlatformWorkspace(workspace:PlatformWorkspace) {
  return {...workspace,batches:workspace.batches.map(({csv: _csv,...batch})=>batch)};
}
