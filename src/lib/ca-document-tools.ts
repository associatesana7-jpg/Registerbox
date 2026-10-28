import { validatePublicGstin } from './public-gst-tools';

export const CA_DOCUMENT_LIMITS = { bytes: 5_000_000, rows: 10_000, columns: 100, text: 2_000_000, pdfPages: 30 } as const;
export type StringTable = string[][];
export type MoneyResult = { value: bigint | null; error?: string };
export function documentMoney(input: string, allowNegative = false): MoneyResult {
  let raw = input.trim().replace(/^(?:₹|INR\s*|Rs\.?\s*)/i, '').trim();
  let negative = false;
  if (/^\(.*\)$/.test(raw)) { negative = true; raw = raw.slice(1, -1).trim(); }
  if (/^[+-]/.test(raw)) { if (negative) return { value: null, error: 'Use only one sign.' }; negative = raw[0] === '-'; raw = raw.slice(1); }
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(raw)) return { value: null, error: 'Use a complete amount with valid comma grouping and at most two decimals.' };
  if (negative && !allowNegative) return { value: null, error: 'A negative amount needs review; it was not converted to positive.' };
  const [whole, cents = ''] = raw.replace(/,/g, '').split('.');
  const absolute = BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0'));
  if (absolute > 100_000_000_000_000n) return { value: null, error: 'Amount exceeds ₹1 trillion.' };
  return { value: negative ? -absolute : absolute };
}
export function moneyText(value: bigint | null): string { if (value === null) return ''; const sign = value < 0n ? '-' : ''; const absolute = value < 0n ? -value : value; return sign + (absolute / 100n).toString() + '.' + (absolute % 100n).toString().padStart(2, '0'); }
export function parseDocumentDate(raw: string): string | null {
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T00:00:00(?:\.000)?Z)?$/.exec(value);
  const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(value);
  if (!iso && !local) return null;
  const year = Number(iso?.[1] || local?.[3]); const month = Number(iso?.[2] || local?.[2]); const day = Number(iso?.[3] || local?.[1]);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
}

/** RFC4180-style CSV/TSV reading; quoted fields and line breaks are retained. */
export function parseDelimited(text: string): StringTable {
  if (text.length > CA_DOCUMENT_LIMITS.text) throw new Error('The text exceeds 2 million characters. Split the file.');
  const source = text.replace(/^\uFEFF/, '');
  if (source.includes('\u0000')) throw new Error('Use a UTF-8 CSV or TSV file without null characters.');
  const counts = { ',':0, '\t':0, ';':0 }; let inHeaderQuotes = false;
  for(let index=0;index<source.length;index++) {
    const char=source[index];
    if(char==='"'){if(inHeaderQuotes&&source[index+1]==='"')index++;else inHeaderQuotes=!inHeaderQuotes;}
    else if(!inHeaderQuotes&&(char==='\r'||char==='\n'))break;
    else if(!inHeaderQuotes&&char in counts)counts[char as keyof typeof counts]++;
  }
  const delimiter = (Object.keys(counts) as (keyof typeof counts)[]).sort((a,b)=>counts[b]-counts[a])[0];
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false; let closed = false;
  const append = () => { row.push(cell); cell = ''; closed = false; if (row.length > CA_DOCUMENT_LIMITS.columns) throw new Error('Use at most 100 columns.'); };
  const finish = () => { append(); if (row.some(value => value.trim())) rows.push(row); row = []; if (rows.length > CA_DOCUMENT_LIMITS.rows + 1) throw new Error('Use at most 10,000 data rows.'); };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) { if (char === '"') { if (source[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += char; continue; }
    if (char === '"') { if (cell.length || closed) throw new Error('A quote appears inside an unquoted field. Check the CSV export.'); quoted = true; continue; }
    if (char === delimiter) { append(); continue; }
    if (char === '\r' || char === '\n') { if (char === '\r' && source[i + 1] === '\n') i++; finish(); continue; }
    if (closed) { if (/\s/.test(char)) continue; throw new Error('Unexpected characters follow a quoted CSV field.'); }
    cell += char;
  }
  if (quoted) throw new Error('A quoted field is not closed. Check the CSV export.');
  if (cell || row.length || closed) finish();
  return rows;
}

export const PURCHASE_FIELDS = ['gstin','number','date','type','taxable','igst','cgst','sgst','cess'] as const;
export type PurchaseField = typeof PURCHASE_FIELDS[number];
export type PurchaseMapping = Record<PurchaseField, number>;
export const PURCHASE_LABELS: Record<PurchaseField,string> = { gstin: 'Supplier GSTIN', number: 'Invoice / note number', date: 'Document date', type: 'Document type', taxable: 'Taxable value', igst: 'IGST', cgst: 'CGST', sgst: 'SGST / UTGST', cess: 'Cess' };
const headerKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases: Record<PurchaseField,string[]> = {
  gstin: ['suppliergstin','gstinofsupplier','gstin','gstinuinofsupplier'], number: ['invoicenumber','invoiceno','documentnumber','documentno','notenumber'],
  date: ['invoicedate','documentdate','date','notedate'], type: ['documenttype','invoicetype','type','notetype'], taxable: ['taxablevalue','taxableamount','taxable'],
  igst: ['igst','integratedtax','integratedtaxamount'], cgst: ['cgst','centraltax','centraltaxamount'], sgst: ['sgst','utgst','stateuttax','statetax','stateuttaxamount'], cess: ['cess','cessamount'],
};
export function suggestPurchaseMapping(headers: string[]): PurchaseMapping { return Object.fromEntries(PURCHASE_FIELDS.map(field => [field, headers.findIndex(header => aliases[field].includes(headerKey(header)))])) as PurchaseMapping; }
export function normalizeDocumentType(raw: string): 'INV' | 'CN' | 'DN' | 'UNKNOWN' {
  const value = headerKey(raw);
  if (['inv','invoice','taxinvoice','b2b','regular','r'].includes(value)) return 'INV';
  if (['cn','cr','c','credit','creditnote','creditnotes','creditnoteregistered'].includes(value)) return 'CN';
  if (['dn','dr','d','debit','debitnote','debitnotes','debitnoteregistered'].includes(value)) return 'DN';
  return 'UNKNOWN';
}
export type PurchaseRecord = { row: number; gstin: string; number: string; date: string; type: string; taxable: bigint | null; igst: bigint | null; cgst: bigint | null; sgst: bigint | null; cess: bigint | null; issues: string[] };
const amountFields = ['taxable','igst','cgst','sgst','cess'] as const;
export function readPurchaseRecords(table: StringTable, mapping: PurchaseMapping): PurchaseRecord[] {
  if (table.length < 2) throw new Error('Add a header row and at least one document.');
  for (const field of ['gstin','number','date','taxable'] as const) if (mapping[field] < 0) throw new Error(`Choose the ${PURCHASE_LABELS[field]} column.`);
  if (!['igst','cgst','sgst'].some(field => mapping[field as PurchaseField] >= 0)) throw new Error('Map at least one tax column. Unmapped tax heads are treated as zero.');
  const mapped = Object.values(mapping).filter(index => index >= 0);
  if (new Set(mapped).size !== mapped.length) throw new Error('Each source column can be mapped to only one document field.');
  if (table.length - 1 > CA_DOCUMENT_LIMITS.rows) throw new Error('Use no more than 10,000 documents per file.');
  return table.slice(1).map((cells, index) => ({ cells, index })).filter(({cells}) => cells.some(cell => cell.trim())).map(({cells, index}) => {
    const get = (field: PurchaseField) => mapping[field] >= 0 ? String(cells[mapping[field]] || '').trim() : '';
    const issues: string[] = []; const gstin = get('gstin').toUpperCase(); const number = get('number').toUpperCase().replace(/\s+/g, ''); const date = parseDocumentDate(get('date')) || '';
    if (!validatePublicGstin(gstin).valid) issues.push('Invalid or unsupported supplier GSTIN.');
    if (!number || number.length > 100) issues.push('Missing document number or number over 100 characters.');
    if (!date) issues.push('Use a valid document date in YYYY-MM-DD or DD/MM/YYYY.');
    const rawType = get('type'); const type = normalizeDocumentType(rawType);
    if (type === 'UNKNOWN') issues.push(rawType ? `Unknown document type: ${rawType}.` : 'Document type is missing; choose INV, CN or DN.');
    if (type === 'CN' || type === 'DN') issues.push('Credit/debit note: review signs, linked invoice and adjustment treatment.');
    const amounts = Object.fromEntries(amountFields.map(field => {
      if (mapping[field] < 0) return [field, field === 'taxable' ? null : 0n];
      const parsed = documentMoney(get(field), type === 'CN' || type === 'DN');
      if (parsed.error) issues.push(`${PURCHASE_LABELS[field]}: ${parsed.error}`);
      // Compare a note's magnitude only; note treatment always remains REVIEW.
      return [field, parsed.value !== null && parsed.value < 0n ? -parsed.value : parsed.value];
    })) as Pick<PurchaseRecord,typeof amountFields[number]>;
    return { row: index + 2, gstin, number, date, type, ...amounts, issues };
  });
}
export type ReconciliationRow = { status: 'MATCHED' | 'VALUE_MISMATCH' | 'REVIEW' | 'DUPLICATE' | 'BOOK_ONLY' | 'TWO_B_ONLY'; books: PurchaseRecord[]; twoB: PurchaseRecord[]; reasons: string[] };
export function reconcilePurchases(books: PurchaseRecord[], twoB: PurchaseRecord[], toleranceRaw = '1.00'): ReconciliationRow[] {
  const tolerance = documentMoney(toleranceRaw);
  if (tolerance.value === null || tolerance.value > 100_000n) throw new Error('Choose a matching tolerance from ₹0 to ₹1,000.');
  const groups = new Map<string,{books:PurchaseRecord[];twoB:PurchaseRecord[]}>();
  for (const [source, records] of [['books',books],['twoB',twoB]] as const) for (const item of records) {
    const key = [item.gstin,item.number,item.type].join('|'); const group = groups.get(key) || { books: [], twoB: [] }; group[source].push(item); groups.set(key, group);
  }
  return Array.from(groups.values()).map(group => {
    const reasons = [...new Set([...group.books,...group.twoB].flatMap(item => item.issues.map(issue => `${group.books.includes(item) ? 'Books' : '2B'} row ${item.row}: ${issue}`)))];
    if (group.books.length > 1 || group.twoB.length > 1) return { ...group, status: 'DUPLICATE' as const, reasons: ['Duplicate GSTIN + document number + type; no automatic one-to-one match.', ...reasons] };
    if (!group.books.length || !group.twoB.length) return { ...group, status: group.books.length ? 'BOOK_ONLY' as const : 'TWO_B_ONLY' as const, reasons: [group.books.length ? 'No document with the same GSTIN, number and type in the supplied 2B file.' : 'No document with the same GSTIN, number and type in the supplied books file.', ...reasons] };
    const left = group.books[0], right = group.twoB[0];
    if (left.date !== right.date) reasons.push('Document dates do not match.');
    let valueMismatch = false;
    for (const field of amountFields) {
      const a = left[field], b = right[field];
      if (a === null || b === null) continue;
      const delta = a > b ? a - b : b - a;
      if (delta > tolerance.value!) { reasons.push(`${PURCHASE_LABELS[field]} differs by ₹${moneyText(delta)}.`); valueMismatch = true; }
    }
    const invalid = [...left.issues,...right.issues].length > 0 || left.date !== right.date;
    return { ...group, status: invalid ? 'REVIEW' as const : valueMismatch ? 'VALUE_MISMATCH' as const : 'MATCHED' as const, reasons: reasons.length ? reasons : ['Mapped values agree within your tolerance. Check statutory ITC eligibility separately.'] };
  });
}
export function reconciliationTable(rows: ReconciliationRow[]): StringTable {
  return [['Status','Source','Source row','Supplier GSTIN','Document number','Date','Type','Taxable value','IGST','CGST','SGST / UTGST','Cess','Review reasons'], ...rows.flatMap(result => [...result.books.map(item => ({item,source:'Books'})),...result.twoB.map(item => ({item,source:'GSTR-2B'}))].map(({item,source}) => [result.status,source,String(item.row),item.gstin,item.number,item.date,item.type,...amountFields.map(field => moneyText(item[field])),result.reasons.join(' | ')]))];
}

export type BankMapping = { date:number; description:number; debit:number; credit:number; amount:number; direction:number; balance:number };
export function suggestBankMapping(headers: string[]): BankMapping {
  const find = (names:string[]) => headers.findIndex(header => names.includes(headerKey(header)));
  return { date:find(['date','transactiondate','txndate','valuedate']), description:find(['description','narration','particulars','transactiondetails']), debit:find(['debit','withdrawal','withdrawals','debitamount','withdrawalamount']), credit:find(['credit','deposit','deposits','creditamount','depositamount']), amount:find(['amount','transactionamount']), direction:find(['drcr','crdr','direction','type']), balance:find(['balance','closingbalance','runningbalance']) };
}
export type BankRow = { row:number; date:string; description:string; debit:bigint|null; credit:bigint|null; balance:bigint|null; expected:bigint|null; issues:string[] };
function bankMoney(raw:string): MoneyResult {
  const match = /^(.*?)\s*(DR|CR)$/i.exec(raw.trim());
  const parsed = documentMoney(match ? match[1] : raw, true);
  if (!match || parsed.value === null) return parsed;
  // Explicit direction wins only for an unsigned or consistently signed amount.
  const amount = parsed.value; const direction = match[2].toUpperCase();
  if (amount < 0n && direction === 'CR') return { value:null, error:'A negative amount marked CR is contradictory.' };
  if (/^\+/.test(match[1].replace(/^(?:₹|INR\s*|Rs\.?\s*)/i, '').trim()) && direction === 'DR') return { value:null, error:'An explicitly positive amount marked DR is contradictory.' };
  return { value: direction === 'DR' ? -(amount < 0n ? -amount : amount) : amount };
}
export function analyzeBankRows(table:StringTable, mapping:BankMapping, openingRaw:string): {rows:BankRow[];debits:bigint;credits:bigint;opening:bigint|null;closing:bigint|null;issues:string[]} {
  if (mapping.date < 0 || mapping.description < 0 || mapping.balance < 0) throw new Error('Map a date, description and running balance column.');
  const separate = mapping.debit >= 0 && mapping.credit >= 0;
  if (!separate && mapping.amount < 0) throw new Error('Map both debit and credit, or a single signed amount column.');
  const activeFields = separate ? ['date','description','debit','credit','balance'] as const : ['date','description','amount','direction','balance'] as const;
  const mapped = activeFields.map(field=>mapping[field]).filter(index=>index>=0);
  if (new Set(mapped).size !== mapped.length) throw new Error('Map a different source column to each bank field.');
  if (table.length > CA_DOCUMENT_LIMITS.rows + 1) throw new Error('Use at most 10,000 transactions.');
  const openingResult = openingRaw.trim() ? bankMoney(openingRaw) : {value:null};
  if (openingRaw.trim() && openingResult.value === null) throw new Error('Opening balance is invalid. Enter a valid signed amount, optionally ending DR or CR.');
  let previous:bigint|null = openingResult.value; let debits=0n,credits=0n;
  let previousDate = '';
  const rows = table.slice(1).map((cells,index)=>({cells,index})).filter(({cells})=>cells.some(cell=>cell.trim())).map(({cells,index}) => {
    const get=(field:keyof BankMapping)=>mapping[field]>=0 ? String(cells[mapping[field]]||'').trim() : '';
    const issues:string[]=[]; const date=parseDocumentDate(get('date'))||''; if(!date) issues.push('Invalid date.');
    if (date && previousDate && date < previousDate) issues.push('Dates descend; check the statement order before relying on running-balance checks.');
    if (date) previousDate = date;
    let debit:bigint|null,credit:bigint|null;
    if(separate) {
      const d=get('debit'),c=get('credit'); const a=documentMoney(d||'0'),b=documentMoney(c||'0'); debit=a.value;credit=b.value;
      if(a.error) issues.push('Debit: '+a.error); if(b.error)issues.push('Credit: '+b.error);
      if(debit && credit)issues.push('Both debit and credit are populated.');
    } else {
      const raw=get('amount'),direction=get('direction').toUpperCase(); let parsed=bankMoney(raw);
      const signedRaw=raw.replace(/^(?:₹|INR\s*|Rs\.?\s*)/i,'').trim();
      const hasSuffix=/\b(?:DR|CR)$/i.test(raw); const hasSign=/^[+-]|^\(/.test(signedRaw);
      if(direction && !['DR','CR','D','C','DEBIT','CREDIT'].includes(direction)) issues.push('Unknown debit/credit direction.');
      const dr=['DR','D','DEBIT'].includes(direction),cr=['CR','C','CREDIT'].includes(direction);
      if(parsed.value!==null && (dr||cr)) {
        const negative=parsed.value<0n;
        if ((cr && negative) || (dr && parsed.value>0n && (hasSuffix || (hasSign && /^\+/.test(signedRaw))))) { issues.push('Amount sign conflicts with debit/credit direction.');parsed={value:null}; }
        else parsed={value:dr ? -(negative ? -parsed.value : parsed.value) : parsed.value};
      } else if(parsed.value!==null && !hasSign && !hasSuffix && !direction) issues.push('Unsigned amount has no DR/CR direction; confirm this is a credit.');
      if(parsed.error)issues.push(parsed.error);
      debit=parsed.value===null?null:parsed.value<0n?-parsed.value:0n;credit=parsed.value===null?null:parsed.value>0n?parsed.value:0n;
    }
    const parsedBalance=bankMoney(get('balance')); const balance=parsedBalance.value; if(parsedBalance.error)issues.push('Balance: '+parsedBalance.error);
    const expected=previous!==null&&debit!==null&&credit!==null ? previous-debit+credit : null;
    if(expected!==null&&balance!==null&&expected!==balance) issues.push(`Balance mismatch: expected ${moneyText(expected)}, found ${moneyText(balance)}.`);
    if(previous===null) issues.push('Previous balance unavailable; this row’s arithmetic could not be checked.');
    previous=balance; if(debit!==null)debits+=debit;if(credit!==null)credits+=credit;
    return {row:index+2,date,description:get('description'),debit,credit,balance,expected,issues};
  });
  return {rows,debits,credits,opening:openingResult.value,closing:rows.at(-1)?.balance??null,issues:openingResult.value===null?['Opening balance not supplied; first transaction cannot be reconciled.']:[]};
}
export function bankExportTable(result:ReturnType<typeof analyzeBankRows>):StringTable { return [['Source row','Date','Description','Debit','Credit','Balance','Expected balance','Review reasons'],...result.rows.map(row=>[String(row.row),row.date,row.description,moneyText(row.debit),moneyText(row.credit),moneyText(row.balance),moneyText(row.expected),row.issues.join(' | ')])]; }

export type InvoiceExtraction = {number:string;date:string;gstins:string[];taxable:string;igst:string;cgst:string;sgst:string;total:string;issues:string[]};
export function extractInvoiceFields(text:string):InvoiceExtraction {
  if(text.length>CA_DOCUMENT_LIMITS.text)throw new Error('Extracted text is too long.');
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean); const issues=['Extracted fields are suggestions. Check every field against the original invoice before posting.'];
  const gstins=[...new Set((text.match(/\b[0-9]{2}[A-Za-z0-9]{13}\b/g)||[]).map(token=>token.toUpperCase()))];
  const validGstins=gstins.filter(value=>validatePublicGstin(value).valid); if(validGstins.length!==gstins.length)issues.push('One or more detected GSTINs failed validation.');
  const number=lines.map(line=>/^(?:tax\s+)?invoice\s*(?:no\.?|number|#)\s*[:#\-]?\s*(\S.*)$/i.exec(line)?.[1]||'').find(Boolean)||'';
  const rawDate=lines.map(line=>/^(?:invoice\s+)?date\s*[:\-]?\s*(\S.*)$/i.exec(line)?.[1]||'').find(Boolean)||''; const date=parseDocumentDate(rawDate)||'';
  const findAmount=(label:RegExp,name:string)=>{
    const matched=lines.filter(line=>label.test(line)); if(!matched.length){issues.push(`${name} was not found.`);return '';}
    const values=matched.map(line=>line.replace(label,'').replace(/^\s*[:=]\s*/,'').trim());
    const parsed=values.map(value=>documentMoney(value));
    if(parsed.some(result=>result.value===null)){issues.push(`${name} has an ambiguous or invalid amount. Enter it after checking the source.`);return '';}
    if(new Set(parsed.map(result=>result.value!.toString())).size!==1){issues.push(`${name} appears with different amounts; review manually.`);return '';}
    return moneyText(parsed[0].value);
  };
  const taxable=findAmount(/^(?:taxable\s*(?:value|amount)|subtotal|sub\s*total)\b/i,'Taxable value');
  const igst=findAmount(/^igst(?:\s+amount)?\b/i,'IGST'),cgst=findAmount(/^cgst(?:\s+amount)?\b/i,'CGST'),sgst=findAmount(/^(?:sgst|utgst)(?:\s+amount)?\b/i,'SGST / UTGST');
  const total=findAmount(/^(?:grand\s*total|invoice\s*(?:value|total)|total\s*(?:amount|payable))\b/i,'Grand total');
  if(!number)issues.push('Invoice number was not found.');if(!date)issues.push('Invoice date is missing or ambiguous.');if(!validGstins.length)issues.push('No valid standard GSTIN was detected.');
  if(taxable&&total){ const sum=[taxable,igst||'0',cgst||'0',sgst||'0'].reduce((acc,value)=>acc+documentMoney(value).value!,0n);if(sum!==documentMoney(total).value)issues.push('Taxable value plus extracted GST does not equal the grand total. Check discounts, cess, freight and rounding.'); }
  return {number,date,gstins:validGstins,taxable,igst,cgst,sgst,total,issues};
}
