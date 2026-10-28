/** Browser-only arithmetic. Monetary values are integer paise; rates are basis points. */
export const GST_TOOL_REVIEWED = '2026-10-28';
export const GST_TOOL_SOURCES = [
  { title: 'CBIC: CGST Rule 46 — tax invoice particulars', url: 'https://taxinformation.cbic.gov.in/content-page/explore-rules/1000136/1000001' },
  { title: 'CBIC: registration and GSTIN structure', url: 'https://cbic-gst.gov.in/gst-registration-rules.html' },
  { title: 'GST portal: search taxpayer (live registration status)', url: 'https://services.gst.gov.in/services/searchtp' },
  { title: 'CBIC: CGST Act, section 170 — rounding of tax payable', url: 'https://cbic-gst.gov.in/CGST-bill-e.html' },
];
export const GST_STATES: Record<string, string> = {
  '01':'Jammu and Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','25':'Daman and Diu (legacy code)','26':'Dadra and Nagar Haveli and Daman and Diu','27':'Maharashtra','28':'Andhra Pradesh (legacy code)','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman and Nicobar Islands','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh','97':'Other territory','99':'Centre jurisdiction',
};
export const CURRENT_GST_STATES = Object.entries(GST_STATES).filter(([code]) => !['25','28','99'].includes(code));
export const UTGST_CODES = new Set(['04','26','31','35','38','97']);
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function gstinChecksum(first14: string): string {
  if (!/^[0-9A-Z]{14}$/.test(first14)) throw new Error('A checksum needs exactly 14 uppercase letters or digits.');
  let sum = 0;
  for (let i = 0; i < 14; i++) { const product = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2); sum += Math.floor(product / 36) + product % 36; }
  return CHARS[(36 - sum % 36) % 36];
}
export function validatePublicGstin(raw: string) {
  const value = raw.trim().toUpperCase();
  const errors: string[] = [];
  if (!/^[0-9A-Z]{15}$/.test(value)) errors.push('Enter exactly 15 letters and digits, without spaces or punctuation.');
  const state = GST_STATES[value.slice(0,2)];
  if (!state) errors.push('The first two digits are not a recognised GST state or jurisdiction code.');
  const pan = value.slice(2,12);
  const panFormat = /^[A-Z]{3}[ABCFGHJLPT][A-Z][0-9]{4}[A-Z]$/.test(pan);
  const specialFormat = value.length === 15 && value[13] !== 'Z';
  if (!panFormat && !specialFormat) errors.push('The embedded PAN does not match the standard PAN structure.');
  if (!/^[1-9A-Z]$/.test(value[12] || '') && !specialFormat) errors.push('The registration sequence must be 1–9 or A–Z.');
  const checksum = /^[0-9A-Z]{15}$/.test(value) ? gstinChecksum(value.slice(0,14)) : '';
  if (checksum && checksum !== value[14]) errors.push('The final checksum character does not match the preceding characters. Check the original document.');
  return { value, state: state || '', pan, checksum, errors, valid: errors.length === 0 && !specialFormat, unsupported: errors.length === 0 && specialFormat, legacy: ['25','28'].includes(value.slice(0,2)) };
}
function normalizedDecimal(raw: string) {
  return raw.trim().replace(/[०-९]/g, c => String(c.charCodeAt(0)-0x966)).replace(/[೦-೯]/g, c => String(c.charCodeAt(0)-0xce6));
}
export function decimalUnits(raw: string, places = 2, max = 1_000_000_000_000): bigint {
  const value = normalizedDecimal(raw);
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/.test(value)) throw new Error('Enter a non-negative number with valid comma grouping.');
  const [whole, fraction = ''] = value.replace(/,/g,'').split('.');
  if (fraction.length > places) throw new Error(`Use no more than ${places} decimal places.`);
  const result = BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places,'0') || '0');
  if (result > BigInt(max) * 10n ** BigInt(places)) throw new Error(`Enter a value no higher than ${max.toLocaleString('en-IN')}.`);
  return result;
}
export function roundRatio(numerator: bigint, denominator: bigint) { if (numerator < 0n || denominator <= 0n) throw new Error('Invalid arithmetic input.'); return (numerator * 2n + denominator) / (2n * denominator); }
export function formatPaise(value: bigint) { return `₹${(Number(value) / 100).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}`; }
export function calculatePublicGst(amount: string, rate: string, inclusive: boolean, interstate: boolean) {
  const input = decimalUnits(amount), bps = decimalUnits(rate,2,40);
  const base = inclusive ? roundRatio(input * 10000n, 10000n + bps) : input;
  const gst = inclusive ? input - base : roundRatio(base * bps,10000n);
  const cgst = interstate ? 0n : roundRatio(gst,2n);
  return { input, base, gst, cgst, sgst:interstate ? 0n : gst - cgst, igst:interstate ? gst : 0n, total:base + gst, rate:Number(bps)/100 };
}
export type PublicInvoiceLine = { id: number; description: string; hsn: string; quantity: string; unit: string; price: string; discount: string; rate: string };
export function calculatePublicInvoice(lines: PublicInvoiceLine[], interstate: boolean) {
  if (!lines.length || lines.length > 50) throw new Error('Add between 1 and 50 items.');
  const rows = lines.map((line, i) => {
    if (!line.description.trim()) throw new Error(`Item ${i+1}: enter a description.`);
    if (!/^\d{4}(?:\d{2})?(?:\d{2})?$/.test(line.hsn.trim())) throw new Error(`Item ${i+1}: enter a 4, 6 or 8 digit HSN/SAC code.`);
    if (!line.unit.trim()) throw new Error(`Item ${i+1}: enter a unit (for example NOS or hours).`);
    const quantity = decimalUnits(line.quantity,3,1_000_000), price = decimalUnits(line.price), discount = decimalUnits(line.discount || '0');
    if (!quantity) throw new Error(`Item ${i+1}: quantity must be greater than zero.`);
    const gross = roundRatio(quantity * price,1000n);
    if (discount > gross) throw new Error(`Item ${i+1}: the discount exceeds the item value.`);
    const amounts = calculatePublicGst(((gross-discount)/100n).toString()+'.'+((gross-discount)%100n).toString().padStart(2,'0'),line.rate,false,interstate);
    if (amounts.rate === 0) throw new Error(`Item ${i+1}: use a bill of supply for domestic nil/exempt items. This generator supports positive-rate taxable items only.`);
    return { ...line, ...amounts, gross, discountPaise:discount };
  });
  const totals = rows.reduce((t,r) => ({base:t.base+r.base,gst:t.gst+r.gst,cgst:t.cgst+r.cgst,sgst:t.sgst+r.sgst,igst:t.igst+r.igst,total:t.total+r.total}),{base:0n,gst:0n,cgst:0n,sgst:0n,igst:0n,total:0n});
  if (totals.total > 100_000_000_000_000n) throw new Error('The invoice total exceeds this tool’s supported limit.');
  return {rows, ...totals};
}
