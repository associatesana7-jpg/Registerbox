/** Preparation model only. GST destinations are not provider request payloads.
 * Rules: GSTN tables 14/15 advisory, effective January 2024 onwards.
 * Source: https://tutorial.gst.gov.in/downloads/news/updated_advisory_new_table1415_cr23892_sj_10.01.2024.pdf
 */
export const PLATFORM_RULE_VERSION='gst-eco-2024-01-v2';
export type PlatformRow = {
  source:string; document:string; date:string; supplierGstin:string; recipientGstin:string;
  operatorGstin:string; pos:string; treatment:'section52'|'section9_5';
  kind:'invoice'|'credit_note'|'debit_note'|'amendment'; originalDocument:string; originalPeriod:string;
  taxable:number; igst:number; cgst:number; sgst:number; cess:number;
  rate?:number; supplyType?:'INTER'|'INTRA'; originalDate?:string; invoiceType?:'R'; tcsIgst?:number; tcsCgst?:number; tcsSgst?:number;
};
export type PlatformContext={gstin:string;period:string;role:'seller'|'operator'};
export type ImportIssue={row:number;message:string};
export type MappedRow={row:PlatformRow;gstr1:string;gstr3b:string;taxPaidBy:'seller'|'operator';requiresOrdinarySales:boolean;requiresGstr8Review:boolean};
const gstPattern=/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PLATFORM_COLUMNS=['source','document','date','supplierGstin','recipientGstin','operatorGstin','pos','treatment','kind','originalDocument','originalPeriod','taxable','igst','cgst','sgst','cess'] as const;
export const PLATFORM_OPTIONAL_COLUMNS=['rate','supplyType','originalDate','invoiceType','tcsIgst','tcsCgst','tcsSgst'] as const;
export const PLATFORM_TEMPLATE=PLATFORM_COLUMNS.join(',')+'\n';
function periodIndex(value:string) {
  if(!/^(0[1-9]|1[0-2])20\d{2}$/.test(value))throw Error('Period must use MMYYYY.');
  return Number(value.slice(2))*12+Number(value.slice(0,2));
}
function dateParts(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Date must use YYYY-MM-DD.');
  const [y,m,d]=value.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error('Invalid document date.');
  return {year:y,month:m,period:String(m).padStart(2,'0')+y};
}
function money(value:unknown) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e11||Math.abs(value*100-Math.round(value*100))>0.0001)throw Error('Amounts must be non-negative numbers with at most two decimals. Use credit-note rows for reductions.');
}
export function validatePlatformRow(row:PlatformRow,context:PlatformContext) {
  if(!gstPattern.test(context.gstin)||!['seller','operator'].includes(context.role))throw Error('Select the GST account and seller/operator role.');
  if(periodIndex(context.period)<periodIndex('012024'))throw Error('This mapping supports January 2024 onwards.');
  if(!row.source?.trim()||row.source.length>100||! /^[A-Za-z0-9/-]{1,16}$/.test(row.document))throw Error('Source and a valid document number are required.');
  if(dateParts(row.date).period!==context.period)throw Error('Document date must be in the selected period; review late-reported documents separately.');
  if(!gstPattern.test(row.operatorGstin))throw Error('Enter the platform GSTIN from the source document.');
  if(row.supplierGstin&&!gstPattern.test(row.supplierGstin)||row.recipientGstin&&!gstPattern.test(row.recipientGstin))throw Error('Invalid supplier or recipient GSTIN.');
  if(context.role==='seller'&&row.supplierGstin!==context.gstin)throw Error('Supplier GSTIN does not match this business.');
  if(context.role==='operator'&&row.operatorGstin!==context.gstin)throw Error('Operator GSTIN does not match this business.');
  if(!/^(0[1-9]|[12][0-9]|3[0-8]|97)$/.test(row.pos))throw Error('A valid place-of-supply code is required.');
  if(!['section52','section9_5'].includes(row.treatment))throw Error('Confirm section 52 or section 9(5) treatment; the platform name alone cannot decide it.');
  if(!['invoice','credit_note','debit_note','amendment'].includes(row.kind))throw Error('Unknown document kind.');
  for(const key of ['taxable','igst','cgst','sgst','cess'] as const)money(row[key]);
  if(row.igst&&(row.cgst||row.sgst)||Math.abs(row.cgst-row.sgst)>0.01)throw Error('Check the IGST / CGST / SGST split.');
  if(row.kind!=='invoice'&&!/^[A-Za-z0-9/-]{1,16}$/.test(row.originalDocument))throw Error('Link the original document for a note or amendment.');
  for(const key of ['tcsIgst','tcsCgst','tcsSgst'] as const)if(row[key]!==undefined)money(row[key]);
  if(row.rate!==undefined){money(row.rate);if(row.rate>100)throw Error('Rate must be between 0 and 100.');}
  if(row.supplyType!==undefined&&!['INTER','INTRA'].includes(row.supplyType))throw Error('supplyType must be INTER or INTRA.');
  if(row.invoiceType!==undefined&&row.invoiceType!=='R')throw Error('Only explicitly regular platform invoices are supported.');
  if(row.originalDate!==undefined)dateParts(row.originalDate);
  if(row.kind==='amendment'&&periodIndex(row.originalPeriod)>=periodIndex(context.period))throw Error('An amendment needs an earlier original return period.');
  return row;
}
export function mapPlatformRow(row:PlatformRow,context:PlatformContext):MappedRow {
  validatePlatformRow(row,context);
  const amendment=row.kind==='amendment';
  if(context.role==='seller')return {row,gstr1:`${amendment?'14A':'14'}(${row.treatment==='section52'?'a':'b'})`,gstr3b:row.treatment==='section52'?'Ordinary outward liability; no extra liability from table 14':'3.1.1(ii)',taxPaidBy:row.treatment==='section52'?'seller':'operator',requiresOrdinarySales:row.treatment==='section52',requiresGstr8Review:false};
  if(row.treatment==='section52')return {row,gstr1:'Not operator turnover: review TCS records',gstr3b:'Not operator outward liability',taxPaidBy:'seller',requiresOrdinarySales:false,requiresGstr8Review:true};
  const category=row.supplierGstin?(row.recipientGstin?'B2B':'B2C'):(row.recipientGstin?'URP2B':'URP2C');
  // Registered-recipient credit/debit notes are reported in 9B, not table 15.
  const note=['credit_note','debit_note'].includes(row.kind)&&!!row.recipientGstin;
  return {row,gstr1:note?'9B':`${amendment?'15A':'15'} · ${category}`,gstr3b:'3.1.1(i)',taxPaidBy:'operator',requiresOrdinarySales:false,requiresGstr8Review:false};
}
function identity(row:PlatformRow) {
  const date=dateParts(row.date),fy=date.month>=4?date.year:date.year-1;
  // Source/platform is intentionally excluded: the same invoice in POS and a
  // platform statement must be detected. Unregistered suppliers need review.
  return [row.supplierGstin,fy,row.kind,row.document.toUpperCase()].join('|');
}
function fingerprint(row:PlatformRow) {
  const {source: _source,...document}=row;
  return JSON.stringify(Object.fromEntries(Object.entries(document).sort(([a],[b])=>a.localeCompare(b))));
}
export function reviewPlatformImport(rows:PlatformRow[],existing:PlatformRow[],context:PlatformContext) {
  if(rows.length>5000)throw Error('Import at most 5,000 rows at a time.');
  const accepted:MappedRow[]=[],duplicates:ImportIssue[]=[],issues:ImportIssue[]=[];
  const seen=new Map<string,PlatformRow>();
  existing.forEach(row=>{validatePlatformRow(row,context);seen.set(identity(row),row);});
  rows.forEach((row,index)=>{
    try {
      const mapped=mapPlatformRow(row,context),key=identity(row),previous=seen.get(key);
      if(previous) {
        if(!row.supplierGstin)issues.push({row:index+2,message:'Possible duplicate for unregistered suppliers. Resolve supplier identity before combining.'});
        else if(fingerprint(previous)===fingerprint(row))duplicates.push({row:index+2,message:'Already present in '+previous.source+'. Excluded from this import.'});
        else issues.push({row:index+2,message:'Conflicting versions of this document. Resolve against '+previous.source+'.'});
      } else {seen.set(key,row);accepted.push(mapped);}
    }catch(cause){issues.push({row:index+2,message:cause instanceof Error?cause.message:'Invalid row.'});}
  });
  return {ruleVersion:PLATFORM_RULE_VERSION,accepted,duplicates,issues};
}
/** Strict RFC-style CSV reader: never infer monetary values from payout columns. */
export function parsePlatformCsv(text:string):PlatformRow[] {
  if(text.length>2_000_000)throw Error('Use a CSV smaller than 2 MB.');
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else {quoted=false;closed=true;}}else field+=c;continue;}
    if(c==='"'){if(field||closed)throw Error('Invalid CSV quoting.');quoted=true;continue;}
    if(c===','||c==='\n'||c==='\r') {
      row.push(field);field='';closed=false;
      if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}continue;
    }
    if(closed)throw Error('Unexpected text after a quoted CSV field.');field+=c;
  }
  if(quoted)throw Error('Unclosed CSV quote.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  const headers=rows.shift()?.map(v=>v.trim());
  if(!headers||new Set(headers).size!==headers.length||headers.some(c=>![...PLATFORM_COLUMNS,...PLATFORM_OPTIONAL_COLUMNS].includes(c as typeof PLATFORM_COLUMNS[number]))||PLATFORM_COLUMNS.some(c=>!headers.includes(c)))throw Error('Use the displayed import column names exactly. Settlement payout reports must first be mapped to invoice values.');
  return rows.map((cells,index)=>{
    if(cells.length!==headers.length)throw Error(`Row ${index+2}: wrong number of columns.`);
    const data=Object.fromEntries(headers.map((key,i)=>[key,cells[i].trim()]));
    for(const key of ['taxable','igst','cgst','sgst','cess']) {
      if(!/^\d+(\.\d{1,2})?$/.test(data[key]))throw Error(`Row ${index+2}: ${key} needs an explicit amount; blanks are not zero.`);
    }
    if(data.rate!==undefined&&!/^\d+(\.\d{1,2})?$/.test(data.rate))throw Error(`Row ${index+2}: rate must be explicit when its column is present.`);
    for(const key of ['tcsIgst','tcsCgst','tcsSgst'])if(data[key]!==undefined&&!/^\d+(\.\d{1,2})?$/.test(data[key]))throw Error(`Row ${index+2}: ${key} needs an explicit source amount.`);
    if(data.originalDate==='')delete data.originalDate;
    return {...data,...Object.fromEntries(['rate','tcsIgst','tcsCgst','tcsSgst'].filter(k=>data[k]!==undefined).map(k=>[k,Number(data[k])])),...Object.fromEntries(['taxable','igst','cgst','sgst','cess'].map(k=>[k,Number(data[k])]))} as PlatformRow;
  });
}
