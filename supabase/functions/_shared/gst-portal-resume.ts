type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};
/** GST's tx_py is the current payable table. net_tax_pay and paid allocations
 * can remain nonzero after payment; their mere presence never proves settlement. */
export function portal3bPaymentState(snapshot:Obj):'settled'|'payable'|'unconfirmed' {
  const rows=obj(snapshot.tx_pmt).tx_py;
  if(!Array.isArray(rows)||!rows.length)return 'unconfirmed';
  const seen=new Set<number>();let payable=false;
  for(const value of rows){
    const row=obj(value),type=Number(row.trans_typ);
    if(![30002,30003].includes(type)||seen.has(type))return 'unconfirmed';
    seen.add(type);
    for(const head of ['igst','cgst','sgst','cess']){
      const charge=obj(row[head]);
      for(const key of ['tx','intr','fee']){
        const amount=charge[key];
        if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0)return 'unconfirmed';
        if(amount>0)payable=true;
      }
    }
  }
  return payable?'payable':'settled';
}
export function portal3bPreparation(snapshot:Obj):Obj {
  // Copy actual portal fields, including any late fee or additional disclosure.
  // Only the payment table is separate from the private preparation payload.
  const {tx_pmt:_payment,...payload}=snapshot;
  if(snapshot.registerbox_nil!==undefined)throw Error('GST returned unexpected private declaration fields.');
  for(const key of ['sup_details','itc_elg','intr_ltfee']){
    if(!Object.keys(obj(payload[key])).length)throw Error(`GST did not return complete ${key} details. Refresh again after portal processing completes.`);
  }
  // Sandbox's documented post-offset response can omit inward_sup. Preserve
  // optional sections exactly; absent/empty is not a fabricated zero amount.
  for(const key of ['inward_sup','inter_sup']){
    const value=payload[key];
    if(value!==undefined&&(!value||typeof value!=='object'||Array.isArray(value)))throw Error(`GST returned invalid ${key} details. Refresh the saved return.`);
  }
  return payload;
}
export function portal3bHasZeroEcommerce(snapshot:Obj){
  const details=obj(snapshot.eco_dtls),operator=obj(details.eco_sup),seller=obj(details.eco_reg_sup);
  return Object.keys(details).every(k=>['eco_sup','eco_reg_sup'].includes(k))&&
    ['txval','iamt','camt','samt','csamt'].every(k=>operator[k]===0)&&seller.txval===0&&
    Object.values(operator).every(v=>v===0)&&Object.values(seller).every(v=>v===0);
}
export function portal3bHasPayments(snapshot:Obj){
  const payment=obj(snapshot.tx_pmt),cash=Array.isArray(payment.pdcash)?payment.pdcash:[];
  return [...cash,payment.pditc].some(row=>Object.entries(obj(row)).some(([key,value])=>!['liab_ldg_id','trans_typ'].includes(key)&&typeof value==='number'&&value>0));
}
/** A zero payable table alone does not prove the Make payment / Post credit
 * step happened. An initial zero-tax return can still have ITC to post. */
export function portal3bOffsetComplete(snapshot:Obj,confirmedOffset=false){
  if(portal3bPaymentState(snapshot)!=='settled')return false;
  if(confirmedOffset||portal3bHasPayments(snapshot))return true;
  const rows=obj(snapshot.tx_pmt).tx_py as unknown[];
  // GST's documented post-offset rows carry actual liability-ledger IDs.
  // Zero/absent identifiers are not evidence that a zero-value posting ran.
  return rows.every(value=>Number.isSafeInteger(obj(value).liab_ldg_id)&&Number(obj(value).liab_ldg_id)>0);
}
export type PortalResumeEvidence={version:'gst-portal-resume-v1';scope:'gst_portal';checkedAt:string;paymentState:ReturnType<typeof portal3bPaymentState>;previousDraft:{revision:number;payload:Obj;payloadHash:string;lastError:string|null;sourceEvidence:unknown}};
