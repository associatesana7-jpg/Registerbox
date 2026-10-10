import { record, amount, type Obj } from './gstr3b.ts';
export const HEADS=['igst','cgst','sgst','cess'] as const;
export const CREDIT_FIELDS={i_pdi:'IGST credit → IGST',i_pdc:'IGST credit → CGST',i_pds:'IGST credit → SGST',c_pdi:'CGST credit → IGST',c_pdc:'CGST credit → CGST',s_pdi:'SGST credit → IGST',s_pds:'SGST credit → SGST',cs_pdcs:'Cess credit → Cess'};
export const emptyCredit=()=>Object.fromEntries(Object.keys(CREDIT_FIELDS).map(k=>[k,0]));
export type Head=typeof HEADS[number];
type Charges={tx:number;intr:number;fee:number};
export type Liability={liab_ldg_id:number;trans_typ:number;charges:Record<Head,Charges>};
export type PaymentContext={gstin:string;liabilities:Liability[];cash:Record<Head,Charges>;credit:Record<Head,number>;blockedCredit:Record<Head,number>};
const cents=(n:number)=>Math.round(n*100);
const equal=(a:number,b:number)=>cents(a)===cents(b);
export function paymentContext(snapshot:Obj,ledger:Obj):PaymentContext {
  if(snapshot.gstin!==ledger.gstin)throw Error('Ledger GSTIN does not match this return.');
  const payment=record(snapshot.tx_pmt,'GST payment tables');
  for(const key of ['adjnegliab','pdnls'])if(Array.isArray(payment[key])&&(payment[key] as unknown[]).length)throw Error('Negative-liability adjustments require the GST portal workflow.');
  const source=payment.net_tax_pay;
  if(!Array.isArray(source)||!source.length)throw Error('GST has not provided payable liability. Save/process the return and fetch payment details.');
  const seen=new Set<number>();
  const liabilities=source.map(value=>{
    const r=record(value);if(![30002,30003].includes(Number(r.trans_typ))||seen.has(Number(r.trans_typ))||!Number.isSafeInteger(r.liab_ldg_id)||Number(r.liab_ldg_id)<0)throw Error('Unsupported or duplicate GST liability row.');
    seen.add(Number(r.trans_typ));
    return {liab_ldg_id:Number(r.liab_ldg_id),trans_typ:Number(r.trans_typ),charges:Object.fromEntries(HEADS.map(h=>{const v=record(r[h],h+' liability');return [h,{tx:amount(v.tx,h+' tax'),intr:amount(v.intr,h+' interest'),fee:amount(v.fee,h+' fee')}];})) as Record<Head,Charges>};
  });
  const cb=record(ledger.cash_bal,'cash ledger'),ib=record(ledger.itc_bal,'credit ledger'),blocked=record(ledger.itc_blck_bal,'blocked-credit ledger');
  const cash=Object.fromEntries(HEADS.map(h=>{const v=record(cb[h],h+' cash');return [h,{tx:amount(v.tx,h+' cash tax'),intr:amount(v.intr,h+' cash interest'),fee:amount(v.fee,h+' cash fee')}];})) as Record<Head,Charges>;
  const blockedCredit=Object.fromEntries(HEADS.map(h=>[h,amount(blocked[h+'_blck_bal'],h+' blocked credit')])) as Record<Head,number>;
  const credit=Object.fromEntries(HEADS.map(h=>[h,Math.max(0,amount(ib[h+'_bal'],h+' credit')-blockedCredit[h])])) as Record<Head,number>;
  return {gstin:String(snapshot.gstin),liabilities,cash,credit,blockedCredit};
}
export function preparePayment(context:PaymentContext,choices:Obj,minimumCash:number) {
  amount(minimumCash,'Required minimum regular tax cash');
  if(Object.keys(choices).some(k=>!(k in CREDIT_FIELDS)))throw Error('Unsupported ITC cross-utilisation.');
  const c=Object.fromEntries(Object.keys(CREDIT_FIELDS).map(k=>[k,amount(choices[k],CREDIT_FIELDS[k as keyof typeof CREDIT_FIELDS])])) as Record<keyof typeof CREDIT_FIELDS,number>;
  const used={igst:c.i_pdi+c.i_pdc+c.i_pds,cgst:c.c_pdi+c.c_pdc,sgst:c.s_pdi+c.s_pds,cess:c.cs_pdcs};
  for(const h of HEADS)if(cents(used[h])>cents(context.credit[h]))throw Error(`${h.toUpperCase()} allocation exceeds available unblocked credit.`);
  const regular=context.liabilities.find(r=>r.trans_typ===30002);
  const target={igst:c.i_pdi+c.c_pdi+c.s_pdi,cgst:c.i_pdc+c.c_pdc,sgst:c.i_pds+c.s_pds,cess:c.cs_pdcs};
  if(!regular&&HEADS.some(h=>used[h]>0))throw Error('No regular liability available for ITC. Reverse charge is cash-only.');
  if(regular){
    for(const h of HEADS)if(cents(target[h])>cents(regular.charges[h].tx))throw Error(`${h.toUpperCase()} credit exceeds regular tax payable.`);
    if(c.i_pdc+c.i_pds>0&&!equal(c.i_pdi,Math.min(context.credit.igst,regular.charges.igst.tx)))throw Error('Use IGST credit against IGST liability first.');
    if(used.cgst+used.sgst>0&&!equal(used.igst,context.credit.igst))throw Error('Exhaust available IGST credit before CGST/SGST credit.');
    if(c.c_pdi>0&&cents(c.c_pdc+c.i_pdc)<cents(regular.charges.cgst.tx))throw Error('Settle CGST liability before using CGST credit for IGST.');
    if(c.s_pdi>0&&cents(c.s_pds+c.i_pds)<cents(regular.charges.sgst.tx))throw Error('Settle SGST liability before using SGST credit for IGST.');
  }
  const keys={igst:['ipd','i_intrpd',null],cgst:['cpd','c_intrpd','c_lfeepd'],sgst:['spd','s_intrpd','s_lfeepd'],cess:['cspd','cs_intrpd',null]} as const;
  const cashNeeded=Object.fromEntries(HEADS.map(h=>[h,{tx:0,intr:0,fee:0}])) as Record<Head,Charges>;
  let regularCash=0;
  const pdcash=context.liabilities.map(liability=>{
    const row:Obj={liab_ldg_id:liability.liab_ldg_id,trans_typ:liability.trans_typ};
    for(const h of HEADS){
      const charge=liability.charges[h],tax=(cents(charge.tx)-cents(liability.trans_typ===30002?target[h]:0))/100;
      if(liability.trans_typ===30002)regularCash+=tax;
      if(!keys[h][2]&&charge.fee!==0)throw Error('IGST/cess late fees require the GST portal payment workflow.');
      row[keys[h][0]]=tax;row[keys[h][1]]=charge.intr;if(keys[h][2])row[keys[h][2]!]=charge.fee;
      cashNeeded[h].tx+=tax;cashNeeded[h].intr+=charge.intr;cashNeeded[h].fee+=charge.fee;
    }return row;
  });
  if(cents(regularCash)<cents(minimumCash))throw Error('Allocation does not meet the declared minimum cash-tax requirement. Reduce ITC use.');
  const shortfalls=HEADS.flatMap(h=>(['tx','intr','fee'] as const).map(part=>({head:h,part,required:Math.round(cashNeeded[h][part]*100)/100,available:context.cash[h][part],shortfall:Math.max(0,cents(cashNeeded[h][part])-cents(context.cash[h][part]))/100})));
  const pditc={liab_ldg_id:regular?.liab_ldg_id??context.liabilities[0].liab_ldg_id,trans_typ:30002,...c};
  return {allocation:{pdcash,pditc},used,cashNeeded,shortfalls,totalShortfall:shortfalls.reduce((n,r)=>n+r.shortfall,0),ready:shortfalls.every(r=>r.shortfall===0),minimumCash};
}
