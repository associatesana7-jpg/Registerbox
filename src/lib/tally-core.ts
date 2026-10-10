import { XMLParser, XMLValidator } from 'fast-xml-parser';

export type TallyMode = 'vouchers' | 'ledgers';
export type TallyLine = { ledger: string; amount: number };
export type TallyVoucher = { externalId: string; date: string; voucherType: string; voucherNumber: string; narration: string; lines: TallyLine[] };
export type TallyLedger = { externalId: string; name: string; parent: string };
export type TallyBatch = { mode: TallyMode; vouchers: TallyVoucher[]; ledgers: TallyLedger[] };
export type TallyCompany = { name: string; guid: string };
export type TallyJob = { id: string; company: TallyCompany; state: 'QUEUED' | 'SENT' | 'APPLIED' | 'REJECTED' | 'OUTCOME_UNKNOWN'; total: number; applied: number; message: string; updatedAt: string };
export const voucherTypes = ['Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal', 'Credit Note', 'Debit Note'];
export const voucherTemplate = 'external_id,date,voucher_type,voucher_number,ledger,debit,credit,narration\nexpense-001,2026-10-07,Payment,RB-001,Office Rent,1000.00,0,October rent\nexpense-001,2026-10-07,Payment,RB-001,Cash,0,1000.00,October rent';
export const ledgerTemplate = 'external_id,name,parent\nledger-001,Office Rent,Indirect Expenses';

export function xmlEscape(value: string): string {
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw Error('Unsupported control character.');
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
export function money(value: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) throw Error('Amounts must be positive decimals with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function dateToTally(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Use YYYY-MM-DD dates.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || Number(value.slice(0, 4)) < 1900) throw Error('Invalid voucher date.');
  return value.replace(/-/g, '');
}
// CSV supports quoted cells, commas, escaped quotes and multiline narrations.
function csvRows(input: string): string[][] {
  if (input.length > 1_000_000) throw Error('Choose a CSV under 1 MB.');
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false; let closed = false;
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',' || c === '\n') {
      row.push(cell.trim()); cell = ''; closed = false;
      if (c === '\n') { if (row.some(Boolean)) rows.push(row); row = []; }
    } else if (c === '"' && cell === '' && !closed) quoted = true;
    else { if (closed || c === '"') throw Error('Malformed CSV quoting.'); cell += c; }
  }
  if (quoted) throw Error('Unclosed CSV quotation.');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  if (rows.length > 2001) throw Error('Maximum 2,000 CSV rows per import.');
  return rows;
}
export function parseTallyCsv(input: string, mode: TallyMode): TallyBatch {
  const rows = csvRows(input); const headers = rows.shift() || [];
  const required = mode === 'vouchers' ? ['external_id', 'date', 'voucher_type', 'voucher_number', 'ledger', 'debit', 'credit', 'narration'] : ['external_id', 'name', 'parent'];
  if (headers.length !== required.length || new Set(headers).size !== headers.length || required.some(h => !headers.includes(h))) throw Error(`CSV columns must be: ${required.join(', ')}`);
  if (!rows.length) throw Error('The CSV contains no entries.');
  const grouped = new Map<string, TallyVoucher>(); const ledgers: TallyLedger[] = []; const names = new Set<string>(); const ids = new Set<string>();
  rows.forEach((cells, index) => {
    try {
      if (cells.length !== headers.length) throw Error('Column count does not match the header.');
      const r = Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
      if (!/^[A-Za-z0-9._:-]{1,100}$/.test(r.external_id)) throw Error('external_id must be 1–100 letters, digits, dots, colons, underscores or hyphens.');
      for (const value of cells) { if (value.length > 2000) throw Error('Cell is too long.'); xmlEscape(value); }
      if (mode === 'ledgers') {
        if (!r.name || !r.parent) throw Error('Ledger name and parent group are required.');
        if (names.has(r.name) || ids.has(r.external_id)) throw Error('Duplicate ledger name or external ID.');
        names.add(r.name); ids.add(r.external_id); ledgers.push({ externalId: r.external_id, name: r.name, parent: r.parent }); return;
      }
      dateToTally(r.date);
      if (!voucherTypes.includes(r.voucher_type)) throw Error('Unsupported voucher type.');
      if (!r.ledger || !r.voucher_number) throw Error('Ledger and voucher number are required.');
      const debit = money(r.debit || '0'); const credit = money(r.credit || '0');
      if ((debit === 0) === (credit === 0)) throw Error('Set exactly one non-zero debit or credit on each row.');
      const existing = grouped.get(r.external_id);
      if (existing && (existing.date !== r.date || existing.voucherType !== r.voucher_type || existing.voucherNumber !== r.voucher_number || existing.narration !== r.narration)) throw Error('Rows with one external ID must share voucher details.');
      const voucher = existing || { externalId: r.external_id, date: r.date, voucherType: r.voucher_type, voucherNumber: r.voucher_number, narration: r.narration, lines: [] };
      voucher.lines.push({ ledger: r.ledger, amount: credit - debit }); grouped.set(r.external_id, voucher);
    } catch (e) { throw Error(`Row ${index + 2}: ${e instanceof Error ? e.message : 'Invalid entry.'}`); }
  });
  const vouchers = [...grouped.values()]; const numbers = new Set<string>();
  for (const v of vouchers) {
    if (v.lines.length < 2 || v.lines.reduce((sum, line) => sum + line.amount, 0) !== 0) throw Error(`${v.externalId}: debits and credits must balance.`);
    const key = `${v.date}|${v.voucherType}|${v.voucherNumber}`;
    if (numbers.has(key)) throw Error('Duplicate voucher number, type and date.'); numbers.add(key);
  }
  if (Math.max(vouchers.length, ledgers.length) > 100) throw Error('Maximum 100 objects per import.');
  return { mode, vouchers, ledgers };
}
export function importEnvelope(company: string, report: string, object: string): string {
  return `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>${report}</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>${xmlEscape(company)}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF">${object}</TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}
export function voucherXml(company: string, voucher: TallyVoucher, remoteId: string): string {
  const lines = voucher.lines.map(l => `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${xmlEscape(l.ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>${l.amount < 0 ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE><AMOUNT>${(l.amount / 100).toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`).join('');
  return importEnvelope(company, 'Vouchers', `<VOUCHER REMOTEID="${xmlEscape(remoteId)}" VCHTYPE="${xmlEscape(voucher.voucherType)}" ACTION="Create" OBJVIEW="Accounting Voucher View"><GUID>${xmlEscape(remoteId)}</GUID><DATE>${dateToTally(voucher.date)}</DATE><VOUCHERTYPENAME>${xmlEscape(voucher.voucherType)}</VOUCHERTYPENAME><VOUCHERNUMBER>${xmlEscape(voucher.voucherNumber)}</VOUCHERNUMBER><PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW><ISINVOICE>No</ISINVOICE><NARRATION>${xmlEscape(voucher.narration)}</NARRATION>${lines}</VOUCHER>`);
}
export function ledgerXml(company: string, ledger: TallyLedger): string {
  return importEnvelope(company, 'All Masters', `<LEDGER NAME="${xmlEscape(ledger.name)}" ACTION="Create"><NAME>${xmlEscape(ledger.name)}</NAME><PARENT>${xmlEscape(ledger.parent)}</PARENT></LEDGER>`);
}
export function collectionXml(type: 'Company' | 'Ledger' | 'Group' | 'VoucherType' | 'Voucher', company = '', from = '', to = ''): string {
  if (type !== 'Company' && !company) throw Error('Explicit company is required.');
  const methods = type === 'Voucher' ? ['GUID', 'MasterID', 'Date', 'VoucherTypeName', 'VoucherNumber', 'Narration', 'AllLedgerEntries.*', 'IsCancelled', 'IsOptional'] : ['Name', 'GUID', 'Parent'];
  const period = from ? `<SVFROMDATE TYPE="Date">${dateToTally(from)}</SVFROMDATE><SVTODATE TYPE="Date">${dateToTally(to)}</SVTODATE>` : '';
  return `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>RegisterBoxCollection</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>${company ? `<SVCURRENTCOMPANY>${xmlEscape(company)}</SVCURRENTCOMPANY>` : ''}${period}</STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="RegisterBoxCollection" ISMODIFY="No"><TYPE>${type}</TYPE>${methods.map(m => `<NATIVEMETHOD>${m}</NATIVEMETHOD>`).join('')}</COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>`;
}
export function parseXml(xml: string): Record<string, unknown> {
  if (xml.length > 10_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('Unsupported XML response.');
  // Tally can emit XML 1.0-invalid numeric control entities in names; do not silently normalize them.
  if (XMLValidator.validate(xml) !== true) throw Error('Malformed Tally XML response.');
  return new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true }).parse(xml);
}
export function nodes(value: unknown, tag: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (key.toUpperCase() === tag.toUpperCase()) for (const entry of Array.isArray(child) ? child : [child]) { if (entry && typeof entry === 'object') found.push(entry as Record<string, unknown>); }
    else found.push(...nodes(child, tag));
  }
  return found;
}
export function values(value: unknown, tag: string): string[] {
  const found: string[] = [];
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (key.toUpperCase() === tag.toUpperCase()) for (const item of Array.isArray(child) ? child : [child]) found.push(String(item));
    else found.push(...values(child, tag));
  }
  return found;
}
export function assertExport(xml: string): Record<string, unknown> {
  const parsed = parseXml(xml); const errors = values(parsed, 'LINEERROR');
  if (errors.length || values(parsed, 'STATUS').includes('0')) throw Error(errors.join('; ') || 'Tally rejected the export request.');
  if (!values(parsed, 'COLLECTION').length) throw Error('Tally did not return the requested collection.');
  return parsed;
}
export function importResult(xml: string) {
  const parsed = parseXml(xml);
  const counter = (key: string) => { const v = values(parsed, key)[0]; return v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined; };
  const errors = values(parsed, 'LINEERROR'); const created = counter('CREATED'); const errorCount = counter('ERRORS');
  return { created, errors: errorCount, messages: errors, lastId: values(parsed, 'LASTVCHID')[0] || '', ok: created === 1 && errorCount === 0 && errors.length === 0 && !values(parsed, 'STATUS').includes('0') && ['ALTERED', 'DELETED', 'CANCELLED', 'IGNORED', 'COMBINED'].every(key => (counter(key) ?? 0) === 0) };
}
