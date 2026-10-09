// GSTN/Sandbox GSTR-2B document formats: invoice totals (Oct 2024+) and item totals.
export type Purchase = { supplier: string; number: string; date: string; kind: 'INV'|'C'|'D'; taxable: number; igst: number; cgst: number; sgst: number; cess: number; sourceDocumentId?: string; extractionId?: string; source?: 'MANUAL'|'CSV'|'AI_BILL' };
export type PortalPurchase = Purchase & { section: string; name: string; itcAvailable: string; reverseCharge: boolean; reason: string };
export type MatchRow = { status: 'Matched'|'Amount mismatch'|'Date mismatch'|'Missing in 2B'|'Missing in books'|'Duplicate'|'Review required'; book?: Purchase; portal?: PortalPurchase; differences: string[] };
type Obj = Record<string, unknown>;
export class PurchaseError extends Error {}
const obj = (v: unknown): Obj => v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {};
const fields = ['taxable','igst','cgst','sgst','cess'] as const;
const cents = (v:number) => Math.round(v*100);
export function validDate(value:string) {
  if(!/^\d{2}-\d{2}-\d{4}$/.test(value))return false;
  const [d,m,y]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
export function validateBooks(input:unknown):Purchase[] {
  if(!Array.isArray(input)||input.length>5000)throw new PurchaseError('Use at most 5,000 purchase documents per period.');
  return input.map((value,index)=>{
    const r=obj(value),row=index+1;
    if(typeof r.supplier!=='string'||!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(r.supplier))throw new PurchaseError(`Row ${row}: enter the supplier GSTIN.`);
    if(typeof r.number!=='string'||!r.number.trim()||r.number.length>50||typeof r.date!=='string'||!validDate(r.date)||!['INV','C','D'].includes(String(r.kind)))throw new PurchaseError(`Row ${row}: check document number, date and type.`);
    for(const key of fields)if(typeof r[key]!=='number'||!Number.isFinite(r[key])||Number(r[key])<0||Number(r[key])>1e12||Math.abs(Number(r[key])*100-cents(Number(r[key])))>0.00001)throw new PurchaseError(`Row ${row}: ${key} needs a non-negative amount with at most two decimals.`);
    if(Number(r.igst)>0&&(Number(r.cgst)>0||Number(r.sgst)>0))throw new PurchaseError(`Row ${row}: IGST cannot be combined with CGST/SGST.`);
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(r.sourceDocumentId!==undefined&&(typeof r.sourceDocumentId!=='string'||!uuid.test(r.sourceDocumentId)))throw new PurchaseError(`Row ${row}: invalid source document reference.`);
    if(r.extractionId!==undefined&&(typeof r.extractionId!=='string'||!uuid.test(r.extractionId)))throw new PurchaseError(`Row ${row}: invalid extraction reference.`);
    if(r.source!==undefined&&!['MANUAL','CSV','AI_BILL'].includes(String(r.source)))throw new PurchaseError(`Row ${row}: invalid source.`);
    return {supplier:r.supplier,number:r.number.trim(),date:r.date,kind:r.kind,...Object.fromEntries(fields.map(k=>[k,r[k]])),...(r.sourceDocumentId?{sourceDocumentId:r.sourceDocumentId}:{}),...(r.extractionId?{extractionId:r.extractionId}:{}),...(r.source?{source:r.source}:{})} as Purchase;
  });
}
export function unpack2b(envelope:unknown,gstin:string,period:string) {
  const e=obj(envelope);
  if(!['1','3'].includes(String(e.status_cd)))throw new PurchaseError('GST did not return an available GSTR-2B document.');
  const outer=obj(e.data),data=obj(outer.data||outer);
  if(data.gstin!==gstin||data.rtnprd!==period)throw new PurchaseError('The GSTR-2B GSTIN or period does not match this business.');
  const fc=Number(data.fc??outer.fc??0);
  if(!Number.isInteger(fc)||fc<0||fc>50)throw new PurchaseError('The GSTR-2B file count is invalid or exceeds this download limit.');
  return {data,files:fc};
}
export function normalize2b(documents:Obj[]) {
  const rows:PortalPurchase[]=[],unsupported:string[]=[];
  for(const document of documents){
    const docdata=obj(document.docdata);
    if(!document.docdata)throw new PurchaseError('GSTR-2B invoice data is missing. Download all files before matching.');
    for(const [section,groups] of Object.entries(docdata)){
      if(!Array.isArray(groups))throw new PurchaseError(`Unrecognized GSTR-2B section: ${section}.`);
      if(!['b2b','b2ba','cdnr','cdnra'].includes(section)){if(groups.length)unsupported.push(`${section.toUpperCase()} (${groups.length} groups)`);continue;}
      for(const group of groups){const g=obj(group),docs=g.inv??g.nt;if(!Array.isArray(docs))throw new PurchaseError(`Missing documents in ${section}.`);
        for(const raw of docs){const r=obj(raw),items=Array.isArray(r.items)?r.items.map(obj):[r];
          const amounts=Object.fromEntries([['taxable','txval'],['igst','igst'],['cgst','cgst'],['sgst','sgst'],['cess','cess']].map(([key,source])=>[key,items.reduce((total,item)=>{const v=item[source]??0;if(typeof v!=='number'||!Number.isFinite(v))throw new PurchaseError('GSTR-2B contains an invalid amount.');return total+cents(v);},0)/100]));
          if(!items.some(item=>typeof item.txval==='number'))throw new PurchaseError('GSTR-2B taxable value is missing.');
          const kind=section.startsWith('cdn')?String(r.typ):'INV';
          if(!['INV','C','D'].includes(kind)||!g.ctin||!(r.inum||r.ntnum)||!validDate(String(r.dt)))throw new PurchaseError('GSTR-2B document identifiers are incomplete.');
          rows.push({supplier:String(g.ctin),number:String(r.inum||r.ntnum),date:String(r.dt),kind:kind as Purchase['kind'],...amounts,section,name:String(g.trdnm||''),itcAvailable:String(r.itcavl||'unknown'),reverseCharge:r.rev==='Y',reason:String(r.rsn||'')} as PortalPurchase);
        }
      }
    }
  }
  return {rows,unsupported:[...new Set(unsupported)]};
}
const identity=(r:Purchase)=>`${r.supplier}|${r.kind}|${r.number.trim().toUpperCase()}`;
export function matchPurchases(books:Purchase[],portal:PortalPurchase[],unsupported:string[]=[]) {
  const b=new Map<string,Purchase[]>(),p=new Map<string,PortalPurchase[]>();
  books.forEach(r=>b.set(identity(r),[...(b.get(identity(r))||[]),r]));portal.forEach(r=>p.set(identity(r),[...(p.get(identity(r))||[]),r]));
  const rows:MatchRow[]=[];
  for(const key of new Set([...b.keys(),...p.keys()])){
    const bs=b.get(key)||[],ps=p.get(key)||[];
    if(bs.length>1||ps.length>1){bs.forEach(book=>rows.push({status:'Duplicate',book,differences:['Duplicate document identity; review original/amended records.']}));ps.forEach(portal=>rows.push({status:'Duplicate',portal,differences:['Duplicate document identity; review original/amended records.']}));continue;}
    const book=bs[0],provider=ps[0];
    if(!book||!provider){rows.push({status:book?'Missing in 2B':'Missing in books',book,portal:provider,differences:[]});continue;}
    const differences=fields.filter(k=>cents(book[k])!==cents(provider[k])).map(k=>`${k}: books ${book[k].toFixed(2)} / 2B ${provider[k].toFixed(2)}`);
    if(book.date!==provider.date)differences.push(`Date: books ${book.date} / 2B ${provider.date}`);
    const review=provider.section.endsWith('a')||provider.itcAvailable!=='Y'||provider.reverseCharge;
    if(review)differences.push(provider.reason||'Review amended document, ITC availability or reverse charge treatment.');
    rows.push({book,portal:provider,differences,status:differences.length?fields.some(k=>cents(book[k])!==cents(provider[k]))?'Amount mismatch':book.date!==provider.date?'Date mismatch':'Review required':'Matched'});
  }
  return {rows,unsupported,counts:Object.fromEntries(['Matched','Amount mismatch','Date mismatch','Missing in 2B','Missing in books','Duplicate','Review required'].map(status=>[status,rows.filter(r=>r.status===status).length])),complete:!unsupported.length&&rows.every(r=>r.status==='Matched'),bookCount:books.length,portalCount:portal.length};
}
// RFC-4180 quoting; imports are atomic so a bad row cannot silently disappear.
export function parsePurchaseCsv(text:string):Purchase[] {
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new PurchaseError('CSV has an unclosed quoted field.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  const headers=(rows.shift()||[]).map(v=>v.replace(/^\uFEFF/,'').trim().toLowerCase());
  const required=['supplier','number','date','kind',...fields];
  if(required.some(k=>!headers.includes(k))||new Set(headers).size!==headers.length)throw new PurchaseError('CSV columns: supplier,number,date,kind,taxable,igst,cgst,sgst,cess.');
  return validateBooks(rows.map((values,index)=>{if(values.length!==headers.length)throw new PurchaseError(`CSV row ${index+2}: incorrect number of columns.`);const r=Object.fromEntries(headers.map((h,i)=>[h,values[i].trim()]));for(const key of fields){if(!/^\d+(\.\d{1,2})?$/.test(r[key]))throw new PurchaseError(`CSV row ${index+2}: enter ${key}, including 0 where applicable.`);}return {...r,...Object.fromEntries(fields.map(k=>[k,Number(r[k])])),supplier:r.supplier.toUpperCase(),kind:r.kind.toUpperCase()};}));
}
