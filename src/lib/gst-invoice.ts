export type InvoiceInput = {customer:string;number:string;date:string;pos:string;taxable:string;rate:string;cess:string};
export const emptyInvoice:InvoiceInput = {customer:'',number:'',date:'',pos:'',taxable:'',rate:'',cess:'0'};
export function invoiceAmounts(input:InvoiceInput, gstin:string) {
  const money=(value:string,label:string)=>{
    if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`Enter ${label} as a positive amount with up to two decimal places.`);
    return Number(value);
  };
  const taxable=money(input.taxable,'taxable value'), rate=money(input.rate,'GST rate'), cess=money(input.cess,'cess');
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) throw new Error('Load your linked GSTIN first.');
  if (!/^(0[1-9]|[12][0-9]|3[0-8]|97)$/.test(input.pos)) throw new Error('Enter a valid place-of-supply state code.');
  if (rate>100 || taxable<=0) throw new Error('Check taxable value and GST rate.');
  const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
  const local=gstin.slice(0,2)===input.pos;
  const igst=local?0:round(taxable*rate/100), cgst=local?round(taxable*rate/200):0, sgst=cgst;
  return {taxable,rate,cess,igst,cgst,sgst,total:round(taxable+igst+cgst+sgst+cess)};
}
export function appendInvoice(payload:Record<string,unknown>, input:InvoiceInput, gstin:string, period:string) {
  const amount=invoiceAmounts(input,gstin);
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(input.customer)) throw new Error('Enter the registered customer GSTIN.');
  if (!/^[A-Za-z0-9/-]{1,16}$/.test(input.number)) throw new Error('Invoice number must be 1–16 letters, digits, slash or hyphen.');
  if (!/^\d{2}-\d{2}-\d{4}$/.test(input.date)) throw new Error('Enter invoice date as DD-MM-YYYY.');
  const [day,month,year]=input.date.split('-').map(Number), date=new Date(Date.UTC(year,month-1,day));
  if (date.getUTCDate()!==day || date.getUTCMonth()!==month-1 || date.getUTCFullYear()!==year || String(month).padStart(2,'0')+year!==period) throw new Error('Invoice date must be in the selected return month.');
  type Group={ctin:string;inv:Record<string,unknown>[]};
  const groups=JSON.parse(JSON.stringify(payload.b2b||[])) as Group[];
  if (groups.some(group=>group.inv.some(inv=>String(inv.inum).toUpperCase()===input.number.toUpperCase()))) throw new Error('This invoice number is already in the draft.');
  const invoice={inum:input.number,idt:input.date,pos:input.pos,rchrg:'N',inv_typ:'R',val:amount.total,itms:[{num:1,itm_det:{txval:amount.taxable,rt:amount.rate,iamt:amount.igst,camt:amount.cgst,samt:amount.sgst,csamt:amount.cess}}]};
  const group=groups.find(group=>group.ctin===input.customer);
  if(group)group.inv.push(invoice);else groups.push({ctin:input.customer,inv:[invoice]});
  return {...payload,gstin,fp:period,b2b:groups};
}
