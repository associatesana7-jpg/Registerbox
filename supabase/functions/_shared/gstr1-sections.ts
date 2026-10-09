import {validateEcomSections} from './gst-ecom.ts';
import {validateSupplierPlatformSections} from './gst-platform-draft.ts';
// Source: Sandbox GSTR-1 save-v4.1 workbook. This is explicit coverage, not a generic JSON passthrough.
type Obj=Record<string,unknown>;
export const additionalSections=['b2cs','cdnr','exp','nil','doc_issue','supeco','ecom','ecoma'] as const;
const obj=(v:unknown):Obj=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected a section object.');return v as Obj;};
const list=(v:unknown):Obj[]=>{if(!Array.isArray(v)||!v.length||v.length>500)throw Error('A section needs 1–500 entries.');return v.map(obj);};
function keys(r:Obj,allowed:string[]){if(Object.keys(r).some(k=>!allowed.includes(k)))throw Error('Unsupported section field. Nothing was dropped.');}
function amount(v:unknown){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e11||Math.abs(v*100-Math.round(v*100))>0.0001)throw Error('Enter non-negative amounts with at most two decimal places.');return v;}
function date(v:unknown,period:string){if(typeof v!=='string'||!/^\d{2}-\d{2}-\d{4}$/.test(v))throw Error('Date must use DD-MM-YYYY.');const [d,m,y]=v.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCDate()!==d||dt.getUTCMonth()!==m-1||dt.getUTCFullYear()!==y||String(m).padStart(2,'0')+y!==period)throw Error('Use a real date in the selected period. Prior-period documents need a separate reviewed workflow.');}
const number=(v:unknown)=>{if(typeof v!=='string'||!/^[A-Za-z0-9/-]{1,16}$/.test(v))throw Error('Document number must be 1–16 letters, digits, slashes or hyphens.');};
const gst=(v:unknown)=>{if(typeof v!=='string'||!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v))throw Error('Enter a valid customer GSTIN.');};
function taxes(r:Obj,inter:boolean,without=false){
  const value=amount(r.txval),rate=amount(r.rt);if(rate>100)throw Error('Check the GST rate.');
  const [i,c,s,cess]=['iamt','camt','samt','csamt'].map(k=>amount(r[k]??0));
  if(without?(i+c+s+cess!==0):Math.abs(i+c+s-value*rate/100)>1)throw Error('Tax does not match the taxable value and rate.');
  if(inter?(c+s!==0):(i!==0||Math.abs(c-s)>0.01))throw Error('The tax split does not match place of supply.');
  return value+i+c+s+cess;
}
function place(v:unknown){if(typeof v!=='string'||!/^(0[1-9]|[12][0-9]|3[0-8]|97)$/.test(v))throw Error('Enter a valid place of supply.');return v;}
export function validateAdditional(data:Obj,gstin:string,period:string){
  validateSupplierPlatformSections(data);
  validateEcomSections(data,period);
  const seen=new Set<string>();
  if(data.b2cs!==undefined){for(const r of list(data.b2cs)){
    keys(r,['sply_ty','typ','pos','rt','txval','iamt','camt','samt','csamt']);
    const inter=place(r.pos)!==gstin.slice(0,2);
    if(r.typ!=='OE'||r.sply_ty!==(inter?'INTER':'INTRA'))throw Error('Use ordinary consumer sales with the correct supply type. E-commerce needs its dedicated sections.');
    taxes(r,inter);const id=`${r.pos}:${r.rt}`;if(seen.has(id))throw Error('Combine consumer sales for the same place of supply and rate.');seen.add(id);
  }}
  if(data.cdnr!==undefined){for(const g of list(data.cdnr)){
    keys(g,['ctin','nt']);gst(g.ctin);
    for(const n of list(g.nt)){
      keys(n,['ntty','nt_num','nt_dt','pos','rchrg','inv_typ','val','itms']);number(n.nt_num);date(n.nt_dt,period);
      if(!['C','D'].includes(String(n.ntty))||n.rchrg!=='N'||n.inv_typ!=='R')throw Error('Choose credit or debit note for regular non-reverse-charge supplies.');
      const id=`note:${n.nt_num}`;if(seen.has(id))throw Error('Duplicate note number.');seen.add(id);
      const inter=place(n.pos)!==gstin.slice(0,2);let total=0;const nums=new Set();
      for(const line of list(n.itms)){keys(line,['num','itm_det']);if(!Number.isInteger(line.num)||Number(line.num)<1||nums.has(line.num))throw Error('Invalid or duplicate line number.');nums.add(line.num);const r=obj(line.itm_det);keys(r,['rt','txval','iamt','camt','samt','csamt']);total+=taxes(r,inter);}
      if(Math.abs(total-amount(n.val))>1)throw Error('Note value does not match its lines.');
    }
  }}
  if(data.exp!==undefined){for(const g of list(data.exp)){
    keys(g,['exp_typ','inv']);if(!['WPAY','WOPAY'].includes(String(g.exp_typ)))throw Error('Choose export with or without payment of tax.');
    for(const n of list(g.inv)){
      keys(n,['inum','idt','val','itms','sbpcode','sbnum','sbdt']);number(n.inum);date(n.idt,period);
      const id=`export:${n.inum}`;if(seen.has(id))throw Error('Duplicate export invoice.');seen.add(id);
      if([n.sbpcode,n.sbnum,n.sbdt].some(v=>v!==undefined)){
        if(typeof n.sbpcode!=='string'||!/^[A-Za-z0-9]{6}$/.test(n.sbpcode)||typeof n.sbnum!=='string'||!/^\d{3,7}$/.test(n.sbnum))throw Error('Enter all shipping bill details, or leave all three blank for a service export.');date(n.sbdt,period);
      }
      let total=0;for(const r of list(n.itms)){keys(r,['rt','txval','iamt','csamt']);total+=taxes(r,true,g.exp_typ==='WOPAY');}
      if(Math.abs(total-amount(n.val))>1)throw Error('Export invoice value does not match its lines.');
    }
  }}
  if(data.nil!==undefined){const n=obj(data.nil);keys(n,['inv']);for(const r of list(n.inv)){
    keys(r,['sply_ty','nil_amt','expt_amt','ngsup_amt']);if(!['INTRB2B','INTRB2C','INTRAB2B','INTRAB2C'].includes(String(r.sply_ty)))throw Error('Choose the nil/exempt supply category.');
    if(seen.has('nil:'+r.sply_ty))throw Error('Combine entries for the same nil/exempt category.');seen.add('nil:'+r.sply_ty);['nil_amt','expt_amt','ngsup_amt'].forEach(k=>amount(r[k]));
  }}
  if(data.doc_issue!==undefined){const n=obj(data.doc_issue);keys(n,['doc_det']);for(const g of list(n.doc_det)){
    keys(g,['doc_num','docs']);if(!Number.isInteger(g.doc_num)||Number(g.doc_num)<1||Number(g.doc_num)>12)throw Error('Choose a valid document category.');
    for(const r of list(g.docs)){keys(r,['num','from','to','totnum','cancel','net_issue']);number(r.from);number(r.to);for(const k of ['num','totnum','cancel','net_issue'])if(!Number.isInteger(r[k])||Number(r[k])<0)throw Error('Document counts must be whole numbers.');if(Number(r.num)<1||Number(r.totnum)-Number(r.cancel)!==r.net_issue)throw Error('Net issued must equal total minus cancelled.');}
  }}
}
// Compare full section content, ignoring only provider metadata and omitted zero taxes.
// Array order is not meaningful; duplicate entries remain present and cannot disappear.
export function sectionFingerprint(value:unknown):string{
  function clean(v:unknown):unknown{
    if(Array.isArray(v))return v.map(clean).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k,v])=>!['chksum','updby','cfs','cfs3b','irn','irngendate','srctyp'].includes(k)&&!(k==='flag'&&v==='N')&&!(['iamt','camt','samt','csamt'].includes(k)&&v===0)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,clean(v)]));
    return v;
  }
  return JSON.stringify(clean(value));
}
