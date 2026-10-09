import {reviewPlatformImport,type PlatformContext,type PlatformRow} from './gst-platform-import.ts';
// Sandbox save-v4.1 ECOM/ECOMA worksheets and GSTN January-2024 table 15 advisory.
type Obj=Record<string,unknown>;
const gst=/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
function object(v:unknown):Obj {if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected ecommerce object.');return v as Obj;}
function keys(v:Obj,allowed:string[]){if(Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Unsupported ecommerce field. Nothing was dropped.');}
function list(v:unknown):Obj[]{if(!Array.isArray(v)||!v.length||v.length>500)throw Error('Ecommerce groups need 1–500 entries.');return v.map(object);}
function gstin(v:unknown){if(typeof v!=='string'||!gst.test(v))throw Error('Invalid ecommerce supplier or recipient GSTIN.');}
function number(v:unknown){if(typeof v!=='string'||!/^[A-Za-z0-9/-]{1,16}$/.test(v))throw Error('Invalid ecommerce document number.');}
function amount(v:unknown){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>99999999999.99||Math.abs(v*100-Math.round(v*100))>0.0001)throw Error('Ecommerce amounts must be finite with at most two decimals.');return v;}
function period(v:unknown){if(typeof v!=='string'||!/^(0[1-9]|1[0-2])20\d{2}$/.test(v))throw Error('Original period must use MMYYYY.');return Number(v.slice(2))*12+Number(v.slice(0,2));}
function date(v:unknown){if(typeof v!=='string'||!/^\d{2}-\d{2}-\d{4}$/.test(v))throw Error('Ecommerce dates must use DD-MM-YYYY.');const [d,m,y]=v.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCDate()!==d||dt.getUTCMonth()!==m-1||dt.getUTCFullYear()!==y)throw Error('Invalid ecommerce date.');return {period:y*12+m,time:dt.getTime()};}
function common(r:Obj){if(r.flag!==undefined&&r.flag!=='N')throw Error('This draft supports new ecommerce records only; portal edits/deletes need separate review.');if(!['INTER','INTRA'].includes(String(r.sply_ty))||typeof r.pos!=='string'||!/^(0[1-9]|[12][0-9]|3[0-8]|97)$/.test(r.pos))throw Error('Provide ecommerce supply type and place of supply.');}
function tax(r:Obj,supply:unknown,signed:boolean){
  const rt=amount(r.rt),value=amount(r.txval);if(rt<0||rt>100)throw Error('Invalid ecommerce rate.');
  const [i,c,s,cess]=['iamt','camt','samt','csamt'].map(k=>amount(r[k]??0));
  if(!signed&&[value,i,c,s,cess].some(v=>v<0))throw Error('Invoice amounts cannot be negative.');
  if(supply==='INTER'?(c!==0||s!==0):(i!==0||Math.abs(c-s)>0.01))throw Error('Ecommerce tax split conflicts with supply type.');
  if(Math.abs(i+c+s-value*rt/100)>1)throw Error('Ecommerce tax does not match value and rate.');
  return value+i+c+s+cess;
}
const taxKeys=['rt','txval','iamt','camt','samt','csamt'];
/** Full raw payload validation also covers amendments entered through the JSON editor.
 * Replacement values stay in ECOMA; this function never adds them to current liability.
 */
export function validateEcomSections(payload:Obj,returnPeriod:string){
  const current=period(returnPeriod),seen=new Set<string>();let documents=0;
  const unique=(id:string)=>{if(seen.has(id))throw Error('Duplicate ecommerce document or summary.');seen.add(id);};
  for(const section of ['ecom','ecoma'] as const){
    if(payload[section]===undefined)continue;
    if(current<period('012024'))throw Error('Table 15 supports January 2024 onwards.');
    const amendment=section==='ecoma',root=object(payload[section]);
    const names=amendment?['b2ba','urp2ba','b2ca','urp2ca']:['b2b','urp2b','b2c','urp2c'];keys(root,names);
    if(!Object.keys(root).length)throw Error('Add ecommerce entries.');
    for(const name of names){if(root[name]===undefined)continue;
      const registered=name.startsWith('b2'),invoice=name==='b2b'||name==='urp2b'||name==='b2ba'||name==='urp2ba';
      for(const group of list(root[name])){
        if(invoice){
          keys(group,registered?['rtin','stin','inv']:['rtin','inv']);gstin(group.rtin);if(registered)gstin(group.stin);
          unique(`${section}:${name}:group:${group.stin??''}:${group.rtin}`);
          for(const inv of list(group.inv)){
            if(++documents>500)throw Error('At most 500 ecommerce invoices per draft.');
            keys(inv,['flag','inum','idt','val','pos','inv_typ','itms','sply_ty',...(amendment?['oinum','oidt']:[])]);common(inv);number(inv.inum);
            if(inv.inv_typ!=='R')throw Error('This ecommerce builder supports regular invoices; review SEZ/deemed-export treatment separately.');
            const revised=date(inv.idt);if(amendment?revised.period>current:revised.period!==current)throw Error('Ecommerce invoice date does not fit the return period.');
            unique(`${section}:invoice:${group.stin??''}:${String(inv.inum).toUpperCase()}`);
            if(amendment){number(inv.oinum);const original=date(inv.oidt);if(original.period>=current||original.period<period('012024'))throw Error('Amendment must reference an earlier table 15 period.');unique(`original:${group.stin??''}:${String(inv.oinum).toUpperCase()}:${inv.oidt}`);}
            const nums=new Set<unknown>();let total=0;
            for(const line of list(inv.itms)){keys(line,['num','itm_det']);if(!Number.isInteger(line.num)||Number(line.num)<1||nums.has(line.num))throw Error('Duplicate or invalid ecommerce line number.');nums.add(line.num);const det=object(line.itm_det);keys(det,taxKeys);total+=tax(det,inv.sply_ty,false);}
            if(amount(inv.val)<0||Math.abs(total-Number(inv.val))>1)throw Error('Ecommerce invoice total does not match its lines.');
          }
        }else if(!amendment){
          keys(group,['flag','sply_ty','pos',...taxKeys,...(registered?['stin']:[])]);common(group);if(registered)gstin(group.stin);tax(group,group.sply_ty,true);
          unique(`${section}:${name}:${group.stin??''}:${group.pos}:${group.sply_ty}:${group.rt}`);
        }else{
          const entries=registered?(keys(group,['pos','posItms']),list(group.posItms)):[group];
          for(const entry of entries){
            keys(entry,registered?['flag','sply_ty','stin','ostin','omon','itms']:['flag','sply_ty','pos','omon','itms']);const pos=registered?group.pos:entry.pos;common({...entry,pos});
            if(registered){gstin(entry.stin);gstin(entry.ostin);}
            if(period(entry.omon)>=current||period(entry.omon)<period('012024'))throw Error('Summary amendment needs an earlier table 15 period.');
            unique(`${section}:${name}:${entry.ostin??''}:${pos}:${entry.sply_ty}:${entry.omon}`);
            const rates=new Set<unknown>();for(const line of list(entry.itms)){keys(line,taxKeys);if(rates.has(line.rt))throw Error('Combine amendment amounts for each rate.');rates.add(line.rt);tax(line,entry.sply_ty,true);}
          }
        }
      }
    }
  }
}

/** One explicit rate per imported document. Multi-rate invoices can use the reviewed JSON editor. */
export function addOperatorPlatformGstr1(payload:Obj,rows:PlatformRow[],context:PlatformContext){
  if(context.role!=='operator'||!rows.length||payload.gstin!==context.gstin||payload.fp!==context.period||payload.registerbox_nil)throw Error('Open a regular operator GSTR-1 draft for this account and period.');
  if(payload.ecom!==undefined||payload.ecoma!==undefined)throw Error('This draft already contains operator figures. Review them before replacing anything.');
  const review=reviewPlatformImport(rows,[],context);if(review.issues.length||review.duplicates.length)throw Error('Resolve duplicate or invalid imported documents first.');
  const ecom:Obj={},ecoma:Obj={};const invoices=new Map<string,Obj>(),summaries=new Map<string,Obj>();
  for(const row of rows){
    if(row.treatment!=='section9_5')throw Error('Section 52 collections need the separate TCS workflow.');
    if(row.rate===undefined||!row.supplyType)throw Error('Table 15 needs explicit rate and supplyType columns from the source; these are not inferred from payouts.');
    if(row.kind==='credit_note'||row.kind==='debit_note')throw Error('Notes need a linked-note review: registered-recipient notes belong in table 9B; consumer notes must be netted into their summary.');
    const amendment=row.kind==='amendment';if(amendment&&!row.recipientGstin)throw Error('Consumer amendments replace a whole original summary. Use the separate ECOMA summary editor, not individual replacement invoices.');
    const root=amendment?ecoma:ecom;
    const det={rt:row.rate,txval:row.taxable,iamt:row.igst,camt:row.cgst,samt:row.sgst,csamt:row.cess};
    if(row.recipientGstin){
      if(row.invoiceType!=='R')throw Error('Confirm invoiceType R for regular documents; SEZ/deemed-export documents require separate review.');
      const name=(row.supplierGstin?'b2b':'urp2b')+(amendment?'a':'');const key=`${name}:${row.supplierGstin}:${row.recipientGstin}`;
      let group=invoices.get(key);if(!group){group={rtin:row.recipientGstin,...(row.supplierGstin?{stin:row.supplierGstin}:{}),inv:[]};invoices.set(key,group);(root[name]??=[] as Obj[]);(root[name] as Obj[]).push(group);}
      if(amendment&&(!row.originalDate||row.originalDate.slice(5,7)+row.originalDate.slice(0,4)!==row.originalPeriod))throw Error('Invoice amendment needs its exact originalDate and matching originalPeriod.');
      const iso=(value:string)=>value.split('-').reverse().join('-');
      (group.inv as Obj[]).push({flag:'N',inum:row.document,idt:iso(row.date),val:Math.round((row.taxable+row.igst+row.cgst+row.sgst+row.cess)*100)/100,pos:row.pos,inv_typ:'R',sply_ty:row.supplyType,itms:[{num:1,itm_det:det}],...(amendment?{oinum:row.originalDocument,oidt:iso(row.originalDate!)}:{})});
    }else{
      const name=row.supplierGstin?'b2c':'urp2c',key=`${name}:${row.supplierGstin}:${row.pos}:${row.supplyType}:${row.rate}`;
      let summary=summaries.get(key);if(!summary){summary={flag:'N',sply_ty:row.supplyType,pos:row.pos,rt:row.rate,...(row.supplierGstin?{stin:row.supplierGstin}:{}),txval:0,iamt:0,camt:0,samt:0,csamt:0};summaries.set(key,summary);(root[name]??=[] as Obj[]);(root[name] as Obj[]).push(summary);}
      for(const head of ['txval','iamt','camt','samt','csamt'] as const)summary[head]=(Math.round(Number(summary[head])*100)+Math.round(det[head]*100))/100;
    }
  }
  const result={...payload,...(Object.keys(ecom).length?{ecom}:{}),...(Object.keys(ecoma).length?{ecoma}:{})};validateEcomSections(result,context.period);return result;
}
