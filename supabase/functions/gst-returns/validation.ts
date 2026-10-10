import { isNil, validateNil } from './nil.ts';
import { validate3b } from '../_shared/gstr3b.ts';
import { additionalSections, validateAdditional, sectionFingerprint } from '../_shared/gstr1-sections.ts';
export type JsonObject = Record<string, unknown>;
export const VERSION = 'gst-returns-v1';
export const DECLARATIONS: Record<string,string> = {
  draft: 'Save this reviewed draft privately in RegisterBox. Do not send it to GST.',
  save: 'I reviewed this complete return against my books and approve saving this version to the GST portal. This is not filing.',
  proceed: 'I approve preparing this saved GSTR-1 for filing on the GST portal.',
  poll: 'Check the outcome of my previous GST operation. Do not repeat it.',
  recover_nil: 'Check filing status and resume my declared nil GSTR-1 from the saved GST already-ready response. Do not repeat preparation or file anything.',
  reconcile: 'Fetch this period from GST and compare it with my saved draft. Do not modify or file anything.',
  ledger: 'Fetch my cash, credit and liability balances for this period. Do not use any funds.',
  offset: 'I reviewed this exact cash and ITC allocation and authorize offsetting my GST liability. This uses my ledger balances.',
  preview_offset: 'Prepare a review of this cash and ITC allocation without sending it to GST.',
  evc: 'I reviewed this exact GST snapshot, reconciled it with my books and checked ITC eligibility and prior returns. Send a filing OTP to the authorized signatory.',
  file: 'I am authorized to file this return. I confirm this exact GSTIN, period and return snapshot are complete and correct and authorize filing using this OTP.',
};
export function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object.');
  return value as JsonObject;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,val]) => JSON.stringify(key) + ':' + canonical(val)).join(',') + '}';
  return JSON.stringify(value);
}
export async function hash(value: unknown) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2,'0')).join('');
}
export function num(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e13) throw new Error(label + ' must be a finite numeric amount.');
  return value;
}
export function unwrap(value: unknown) {
  const envelope = object(value);
  if (String(envelope.status_cd) !== '1') throw new Error('GST has not confirmed this request.');
  return object(envelope.data);
}
export function assertIdentity(value: JsonObject, gstin: string, period: string) {
  if (value.gstin !== gstin || (value.ret_period ?? value.fp) !== period) throw new Error('GSTIN or return period does not match the selected account.');
}
const TAX_KEYS = ['iamt','camt','samt','csamt'] as const;
export function validateDraft(payload: unknown, form: string, gstin: string, period: string) {
  const data = object(payload); assertIdentity(data,gstin,period);
  if (isNil(data)) return validateNil(data,form);
  // This release supports ordinary domestic B2B invoices, not every GSTR-1 scenario.
  if (form === 'gstr-1') {
    const allowed = ['gstin','fp','gt','cur_gt','b2b',...additionalSections];
    if (Object.keys(data).some((key) => !allowed.includes(key))) throw new Error('This draft contains sections not yet supported by the reviewed workflow. Nothing was dropped.');
    for (const key of ['gt','cur_gt']) if (data[key] !== undefined) num(data[key],key);
    validateAdditional(data,gstin,period);
    if (data.b2b !== undefined && !Array.isArray(data.b2b)) throw new Error('B2B invoices must be a list.');
    if (!(data.b2b as unknown[]|undefined)?.length && !additionalSections.some(key=>data[key]!==undefined)) throw new Error('Add return entries. An empty file is not a nil-return declaration.');
    const seen = new Set<string>(); let count = 0;
    for (const group of (data.b2b || []) as unknown[]) {
      const item = object(group);
      if (typeof item.ctin !== 'string' || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(item.ctin)) throw new Error('Each customer needs a valid GSTIN.');
      if (!Array.isArray(item.inv) || !item.inv.length) throw new Error('Customer has no invoices.');
      for (const value of item.inv) {
        const invoice = object(value); count++;
        if (typeof invoice.inum !== 'string' || !/^[A-Za-z0-9/-]{1,16}$/.test(invoice.inum)) throw new Error('Invoice number must be 1–16 letters, digits, slash or hyphen.');
        if (seen.has(invoice.inum.toUpperCase())) throw new Error('Duplicate invoice number: ' + invoice.inum);
        seen.add(invoice.inum.toUpperCase());
        if (typeof invoice.idt !== 'string' || !/^\d{2}-\d{2}-\d{4}$/.test(invoice.idt)) throw new Error('Invoice date must use DD-MM-YYYY.');
        const [day,month,year] = invoice.idt.split('-').map(Number);
        const date = new Date(Date.UTC(year,month-1,day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day || String(month).padStart(2,'0') + year !== period) throw new Error('Invoice date must be a real date in the selected period.');
        if (invoice.inv_typ !== 'R' || invoice.rchrg !== 'N' || !/^\d{2}$/.test(String(invoice.pos))) throw new Error('Only regular, non-reverse-charge B2B invoices are supported in this editor.');
        if (num(invoice.val,'Invoice value') <= 0 || !Array.isArray(invoice.itms) || !invoice.itms.length) throw new Error('Invoice must contain a positive value and line items.');
        let total = 0;
        for (const line of invoice.itms) {
          const det = object(object(line).itm_det);
          const taxable = num(det.txval,'Taxable value'); const rate = num(det.rt,'GST rate');
          if (taxable < 0 || rate < 0 || rate > 100) throw new Error('Taxable value or rate is out of range.');
          const taxes = TAX_KEYS.map((key) => det[key] === undefined ? 0 : num(det[key],key));
          if (taxes.some((tax) => tax < 0)) throw new Error('Negative tax is not supported for regular invoices.');
          const [igst,cgst,sgst,cess] = taxes;
          const interstate = gstin.slice(0,2) !== invoice.pos;
          if ((interstate && (cgst !== 0 || sgst !== 0)) || (!interstate && (igst !== 0 || Math.abs(cgst-sgst) > 0.01))) throw new Error('IGST/CGST/SGST does not match the place of supply.');
          if (Math.abs(igst+cgst+sgst - taxable*rate/100) > 1) throw new Error('Line tax does not match taxable value and GST rate.');
          total += taxable+igst+cgst+sgst+cess;
        }
        if (Math.abs(total-Number(invoice.val)) > 1) throw new Error('Invoice value does not match its line values and taxes.');
      }
    }
    if (count > 500) throw new Error('Import at most 500 invoices per draft in this release.');
  } else if (form === 'gstr-3b') {
    validate3b(data);
    for (const key of ['sup_details','itc_elg','inward_sup','inter_sup','intr_ltfee']) object(data[key]);
    const supplies = object(data.sup_details);
    for (const key of ['osup_det','osup_zero','osup_nil_exmp','isup_rev','osup_nongst']) {
      const row = object(supplies[key]); num(row.txval,key + ' taxable value');
      for (const tax of TAX_KEYS) if (row[tax] !== undefined) num(row[tax],tax);
    }
    const net = object(object(data.itc_elg).itc_net);
    TAX_KEYS.forEach((key) => num(net[key],'Net ITC ' + key));
    if (data.tx_pmt !== undefined) throw new Error('Import a preparation payload without tx_pmt. Payment data must be fetched after separately approved offset.');
  } else throw new Error('Unsupported return.');
  return data;
}
export type Difference = { field: string; expected: number | null; actual: number | null };
export function reconcile(payload: JsonObject, snapshot: JsonObject, form: string) {
  const differences: Difference[] = [];
  const compare = (field: string, expected: unknown, actual: unknown) => {
    const e = typeof expected === 'number' ? expected : null, a = typeof actual === 'number' ? actual : null;
    if (e === null || a === null || Math.abs(e-a) > 0.01) differences.push({field,expected:e,actual:a});
  };
  if (form === 'gstr-1') {
    const totals = { ttl_rec: 0, ttl_tax: 0, ttl_igst: 0, ttl_cgst: 0, ttl_sgst: 0, ttl_cess: 0, ttl_val: 0 };
    for (const group of (payload.b2b || []) as JsonObject[]) for (const invoice of group.inv as JsonObject[]) {
      totals.ttl_rec++; totals.ttl_val += Number(invoice.val);
      for (const line of invoice.itms as JsonObject[]) {
        const det = object(line.itm_det); totals.ttl_tax += Number(det.txval);
        for (const [source,target] of [['iamt','ttl_igst'],['camt','ttl_cgst'],['samt','ttl_sgst'],['csamt','ttl_cess']] as const) totals[target] += Number(det[source] ?? 0);
      }
    }
    const sections = Array.isArray(snapshot.sec_sum) ? snapshot.sec_sum.map(object) : [];
    if(!sections.length)differences.push({field:'GST summary unavailable',expected:null,actual:null});
    const b2b = sections.find((section) => section.sec_nm === 'B2B') ?? {};
    if(totals.ttl_rec)Object.entries(totals).forEach(([key,value]) => compare('B2B.'+key,Math.round(value*100)/100,b2b[key]));
    else if(Object.entries(b2b).some(([key,value])=>key.startsWith('ttl_')&&typeof value==='number'&&value!==0))differences.push({field:'B2B contains additional portal data',expected:0,actual:null});
    for(const section of additionalSections){
      if(payload[section]===undefined)continue;
      const fetched=(snapshot.registerbox_sections as JsonObject|undefined)?.[section];
      if(fetched===undefined||sectionFingerprint(payload[section])!==sectionFingerprint(fetched))differences.push({field:section.toUpperCase()+' document content differs or is unavailable',expected:null,actual:null});
    }
    // Never approve undisclosed non-B2B outward sections merely because B2B matches.
    for (const section of sections) {
      const name = String(section.sec_nm);
      const covered=additionalSections.some(key=>payload[key]!==undefined&&name===key.toUpperCase());
      if (name!=='B2B' && !covered && !['HSN','DOC_ISSUE'].includes(name) && Object.entries(section).some(([key,value]) => key.startsWith('ttl_') && typeof value === 'number' && value !== 0)) differences.push({field:name + ' contains additional portal data',expected:0,actual:null});
    }
  } else {
    function walk(a: unknown,b: unknown,path: string) {
      if (typeof a === 'number') { compare(path,a,b); return; }
      if (Array.isArray(a)) { const other = Array.isArray(b) ? b : []; if (a.length !== other.length) differences.push({field:path+'.length',expected:a.length,actual:other.length}); a.forEach((item,index) => walk(item,other[index],path+'['+index+']')); return; }
      if (a && typeof a === 'object') for (const [key,value] of Object.entries(a)) walk(value,b && typeof b === 'object' ? (b as JsonObject)[key] : undefined,path+'.'+key);
      else if (a !== b) differences.push({field:path+' differs',expected:null,actual:null});
    }
    for (const key of ['sup_details','itc_elg','inward_sup','inter_sup','intr_ltfee']) walk(payload[key],snapshot[key],key);
    if(payload.eco_dtls!==undefined)walk(payload.eco_dtls,snapshot.eco_dtls,'eco_dtls');
    else if(snapshot.eco_dtls!==undefined)walk({eco_sup:{txval:0,iamt:0,camt:0,samt:0,csamt:0},eco_reg_sup:{txval:0}},snapshot.eco_dtls,'Unreported ecommerce figures');
  }
  return { matched: differences.length === 0, differences, scope: form === 'gstr-1' ? 'B2B aggregate totals and full content of supported additional sections; not B2B invoice-level or HSN reconciliation.' : 'Prepared GSTR-3B fields against saved portal data; not GSTR-2B matching or ITC eligibility verification.' };
}
