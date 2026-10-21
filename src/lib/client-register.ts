export const clientServices = ['FSSAI','LABOUR','MSME','IEC','TRADEMARK','ITR','GST','OTHER'] as const;
export type Client = {id:string;business_id:string|null;company_name:string;owner_name:string;phone:string;email:string;notes:string;source:string};
export type ServiceRecord = {id:string;client_id:string;service:string;registration_number:string;period:string;registered_on:string|null;due_on:string|null;date_kind:string;status:string;notes:string;source:string};
export type ClientDocument = {id:string;kind:string;filename:string;source:string;created_at:string};
export type RenewalCase = {id:string;service:string;record_id:string;status:string;notes:string};
export type ClientDetail = {client:Client;services:ServiceRecord[];documents:ClientDocument[];cases:RenewalCase[];canWrite:boolean;canDownload:boolean};
export type ImportRow = {company_name:string;owner_name:string;phone:string;email:string;service:string;registration_number:string;period:string;registered_on:string;due_on:string;date_kind:string};
export const importHeaders = ['company_name','owner_name','phone','email','service','registration_number','period','registered_on','due_on','date_kind'] as const;
export const emptyImportRow = ():ImportRow=>Object.fromEntries(importHeaders.map(key=>[key,key==='date_kind'?'expiry':''])) as ImportRow;
const aliases:Record<string,string>={company:'company_name',companyname:'company_name',businessname:'company_name',owner:'owner_name',ownername:'owner_name',phonenumber:'phone',mobile:'phone',emailid:'email',licence:'service',license:'service',registrationdate:'registered_on',registeredon:'registered_on',expiry:'due_on',expirydate:'due_on',dueon:'due_on',registrationnumber:'registration_number',licencenumber:'registration_number',licensenumber:'registration_number',datekind:'date_kind'};
function normalizeDate(value:unknown){
  if(value instanceof Date)return value.toISOString().slice(0,10);
  const s=String(value??'').trim();if(!s)return '';
  const indian=/^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(s);
  const result=indian?`${indian[3]}-${indian[2]}-${indian[1]}`:s;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(result)||!Number.isFinite(Date.parse(result))||new Date(result).toISOString().slice(0,10)!==result)throw new Error('Dates must be YYYY-MM-DD or DD/MM/YYYY (not Excel serial numbers).');
  return result;
}
export function parseImportRows(cells:unknown[][]):{rows:ImportRow[];errors:string[]}{
  if(cells.length<2)return {rows:[],errors:['The sheet needs a header and at least one client row.']};
  if(cells.length>101)return {rows:[],errors:['Import up to 100 rows per file. Split this sheet into smaller batches.']};
  const headers=cells[0].map(value=>{const raw=String(value??'').trim().toLowerCase();return importHeaders.includes(raw as typeof importHeaders[number])?raw:aliases[raw.replace(/[^a-z]/g,'')]||raw;});
  if(!headers.includes('company_name'))return {rows:[],errors:['Add a company_name (or Company Name) column.']};
  if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)return {rows:[],errors:['The sheet contains duplicate columns.']};
  const rows:ImportRow[]=[],errors:string[]=[];
  cells.slice(1).forEach((cells,index)=>{
    if(cells.every(v=>v===null||v===undefined||v===''))return;
    try{
      const row=emptyImportRow();headers.forEach((key,i)=>{if(importHeaders.includes(key as typeof importHeaders[number]))row[key as keyof ImportRow]=['registered_on','due_on'].includes(key)?normalizeDate(cells[i]):String(cells[i]??'').trim();});
      row.phone=row.phone.replace(/[^0-9]/g,'');row.email=row.email.toLowerCase();row.service=row.service.toUpperCase();
      row.service=({LABOR:'LABOUR',TM:'TRADEMARK',UDYAM:'MSME','IEC CODE':'IEC'} as Record<string,string>)[row.service]||row.service;
      row.date_kind=row.date_kind.toLowerCase()||'expiry';
      if(!row.company_name)throw new Error('Company name is required.');
      if(row.phone&&!/^\d{7,15}$/.test(row.phone))throw new Error('Invalid phone number.');
      if(row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))throw new Error('Invalid email.');
      if(row.service&&!clientServices.includes(row.service as typeof clientServices[number]))throw new Error('Use FSSAI, LABOUR, MSME, IEC, TRADEMARK, ITR, GST or OTHER.');
      if(!['expiry','filing','review','none'].includes(row.date_kind))throw new Error('Date type must be expiry, filing, review or none.');
      if(row.date_kind==='none'&&row.due_on)throw new Error('A no-expiry record cannot have a due date.');
      if(row.registered_on&&row.due_on&&row.due_on<row.registered_on)throw new Error('Due date precedes registration.');
      rows.push(row);
    }catch(e){errors.push(`Row ${index+2}: ${e instanceof Error?e.message:'Invalid row'}`);}
  });return {rows,errors};
}
export function parseCsv(input:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('The CSV contains an unclosed quote.');
  if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export function dueLabel(due:string|null,today:string){
  if(!due)return 'No date set';const days=Math.round((Date.parse(due)-Date.parse(today))/86400000);
  return days<0?`${-days} days overdue`:days===0?'Due today':`Due in ${days} days`;
}
