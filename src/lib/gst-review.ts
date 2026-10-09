type RecordValue = Record<string, unknown>;
export type ReviewRow = { label: string; value: number | null; money: boolean; path: string };
export type ReviewSection = { title: string; rows: ReviewRow[] };
export function record(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}
export function amount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return null;
}
const taxes = [['txval','Taxable value'],['iamt','IGST'],['camt','CGST'],['samt','SGST / UTGST'],['csamt','Cess']] as const;
const summary = [['ttl_rec','Records'],['ttl_val','Total value'],['ttl_tax','Taxable value'],['ttl_igst','IGST'],['ttl_cgst','CGST'],['ttl_sgst','SGST / UTGST'],['ttl_cess','Cess']] as const;
const supplies = [['osup_det','Outward taxable supplies'],['osup_zero','Zero-rated outward supplies'],['osup_nil_exmp','Nil-rated / exempt outward supplies'],['isup_rev','Inward supplies · reverse charge'],['osup_nongst','Non-GST outward supplies']] as const;

export function buildGstReview(details: unknown, form: string, expectedGstin: string, period: string) {
  const envelope = record(details);
  const data = Object.hasOwn(envelope,'data') ? record(envelope.data) : envelope;
  const warnings: string[] = [];
  if (data.gstin !== expectedGstin) warnings.push('The returned GSTIN is missing or does not match the linked account. Do not use this response for filing.');
  if (data.ret_period !== period) warnings.push('The returned tax period is missing or does not match your selection. Fetch the correct period before proceeding.');
  const sections: ReviewSection[] = [];
  const rows = (value: RecordValue, fields: readonly (readonly [string,string])[], path: string) => fields.map(([key,label]) => ({ label, value: amount(value[key]), money: key !== 'ttl_rec', path: path + '.' + key }));
  if (form === 'gstr-1' && Array.isArray(data.sec_sum)) {
    for (const [index, value] of data.sec_sum.entries()) {
      const section = record(value);
      sections.push({ title: typeof section.sec_nm === 'string' ? section.sec_nm : 'Unnamed section', rows: rows(section, summary, `sec_sum[${index}]`) });
    }
  } else if (form === 'gstr-3b') {
    const supplied = record(data.sup_details);
    for (const [key,title] of supplies) {
      if (Object.hasOwn(supplied,key)) sections.push({ title, rows: rows(record(supplied[key]), taxes, 'sup_details.' + key) });
    }
    const net = record(data.itc_elg).itc_net;
    if (net) sections.push({ title: 'Net ITC reported in return · eligibility not verified', rows: rows(record(net), taxes.filter(([key]) => key !== 'txval'), 'itc_elg.itc_net') });
    const fees = record(data.intr_ltfee);
    for (const [key,title] of [['intr_details','Interest reported'],['ltfee_details','Late fees reported']]) {
      if (fees[key]) sections.push({ title, rows: rows(record(fees[key]), taxes.filter(([key]) => key !== 'txval'), 'intr_ltfee.' + key) });
    }
  }
  if (!sections.length) warnings.push('No supported summary sections were returned. This does not establish a nil return.');
  if (sections.some((section) => section.rows.some((row) => row.value === null))) warnings.push('Some figures were not supplied or could not be read. Missing values are not treated as zero.');
  return { sections, warnings, identityMatches: data.gstin === expectedGstin && data.ret_period === period };
}
