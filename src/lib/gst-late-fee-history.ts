/** Pending-return worksheet. It neither verifies portal status nor determines final liability. */
export const HISTORY_REVIEWED = '2026-10-29';
export type HistoryForm = 'GSTR-1' | 'GSTR-3B' | 'GSTR-10';
export type FeeCategory = 'unknown' | 'nil' | 'other';
export type TurnoverBand = 'unknown' | 'up-to-1.5cr' | '1.5-to-5cr' | 'above-5cr';
export type HistoryProfile = {
  registered: string; asOf: string; cancelled: boolean; effectiveCancellation: string; cancellationOrder: string;
  /** GSTR-1 frequency before January 2021; later frequency follows the verified QRMP history. */
  lastGstr1: string; neverGstr1: boolean; gstr1Frequency: 'unknown' | 'monthly' | 'quarterly';
  lastGstr3b: string; neverGstr3b: boolean; qrmpStart: string; frequencyConfirmed: boolean; finalReturnFiled: boolean;
};
export type HistoryRow = { id: string; form: HistoryForm; start: string; end: string; label: string; previousFy: string; frequency: 'monthly' | 'quarterly' | 'final'; earliestDue: string; suggestedDue: string; review: string[] };
export type HistoryRowFacts = { due: string; dueConfirmed: boolean; category: FeeCategory; turnover: TurnoverBand; relief: boolean; paid: string; periodConfirmed: boolean; alreadyFiled: boolean };
export type HistoryResult = { days: number | null; cap: number | null; daily: number | null; fee: number | null; remaining: number | null; filingRestricted: boolean; reasons: string[] };
export const HISTORY_SOURCES = [
  { title: 'GSTN: QRMP began January 2021; monthly and quarterly histories', url: 'https://tutorial.gst.gov.in/downloads/news/faq_on_qrmp_iff.pdf' },
  { title: 'Notification 82/2020: GSTR-1 and GSTR-3B monthly / QRMP rules from January 2021', url: 'https://www.gstcouncil.gov.in/sites/default/files/2024-05/notfctn-82-central-tax-english-2020.pdf' },
  { title: 'GST portal: cancellation during a QRMP quarter', url: 'https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm' },
  { title: 'GST Council: Notification 76/2018, GSTR-3B late fee', url: 'https://www.gstcouncil.gov.in/en/node/4083' },
  { title: 'GST Council: Notification 4/2018, GSTR-1 late fee', url: 'https://gstcouncil.gov.in/node/4006' },
  { title: 'CBIC: Notification 19/2021, GSTR-3B caps from June 2021', url: 'https://cbic-gst.gov.in/pdf/central-tax/notfctn-19-central-tax-english-2021.pdf' },
  { title: 'CBIC: Notification 20/2021, GSTR-1 caps from June 2021', url: 'https://cbic-gst.gov.in/pdf/central-tax/notfctn-20-central-tax-english-2021.pdf' },
  { title: 'GSTN advisory: three-year restriction on pending returns', url: 'https://www.mahagst.gov.in/public/uploads/gstnadvisory/1760530698_359%20Advisory%20to%20file%20pending%20returns%20before%20expiry%20of%20three%20years.pdf' },
  { title: 'Registration handbook: cancellation and GSTR-10', url: 'https://www.tgct.gov.in/tgportal/GST/GstHandbook/Handbook_on_Registration_under_GST_November%283rd%29_2025_Edition.pdf' },
] as const;
export const HISTORY_FACTS = [
  'For an October 2018 last-filed GSTR-3B tax period, the first possible missing monthly GSTR-3B period is November 2018. The last GSTR-1 period must be checked separately.',
  'Quarterly GSTR-1 in 2018 did not make GSTR-3B quarterly. From January 2021, both forms are monthly unless a verified QRMP start makes both quarterly. Earlier quarterly GSTR-1 does not carry forward automatically.',
  'Suo motu cancellation does not erase earlier tax, return or fee obligations. The effective cancellation date controls the period history; the order date is a separate fact.',
  'GSTR-10 is generally due three calendar months after the later of effective cancellation and the cancellation order. This worksheet covers normal regular taxpayers, not composition, ISD, NRTP or TDS/TCS registrations.',
  'Older GSTR-1/GSTR-3B returns can be barred by the three-year filing restriction. A calculated normal fee is not permission to file, a GST demand or a final portal payable amount.',
  'Historical notifications and filing windows can change fees. Due dates, nil category, relief and fees already paid must be checked for each period. Interest, tax and penalties are separate.',
] as const;
export function historyDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a complete calendar date.');
  const [y, m, d] = value.split('-').map(Number), date = new Date(Date.UTC(y, m - 1, d));
  if (y < 2017 || y > 2100 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error('Enter a real date between 2017 and 2100.');
  return date.getTime() / 86400000;
}
const iso = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);
function monthIndex(value: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Choose a month and year.');
  const [y, m] = value.split('-').map(Number);
  if (y < 2017 || y > 2100) throw new Error('Choose a supported year.');
  return y * 12 + m - 1;
}
const monthString = (m: number) => `${Math.floor(m / 12)}-${String(m % 12 + 1).padStart(2, '0')}`;
const nextMonth = (m: number) => `${monthString(m + 1)}-01`;
const quarterEnd = (m: number) => Math.floor(m / 3) * 3 + 2;
export function historyAddMonths(value: string, months: number): string {
  historyDate(value);
  const [y, m, d] = value.split('-').map(Number), end = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, end))).toISOString().slice(0, 10);
}
const labelMonth = (m: number) => new Date(Date.UTC(Math.floor(m / 12), m % 12, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
function financialYear(m: number) { const y = Math.floor(m / 12) - (m % 12 < 3 ? 1 : 0) - 1; return `${y}–${String(y + 1).slice(-2)}`; }

export function buildReturnHistory(profile: HistoryProfile): { rows: HistoryRow[]; notes: string[] } {
  const registered = historyDate(profile.registered), asOf = historyDate(profile.asOf);
  if (registered < historyDate('2017-07-01') || registered > asOf || profile.asOf > HISTORY_REVIEWED) throw new Error('Check the registration and calculation dates. The worksheet covers GST from July 2017 through 29 October 2026.');
  let endDate = profile.asOf;
  if (profile.cancelled) {
    const effective = historyDate(profile.effectiveCancellation), order = historyDate(profile.cancellationOrder);
    if (effective < registered || effective > asOf || order > asOf) throw new Error('The cancellation dates must be within the history being reviewed; effective cancellation cannot precede registration.');
    endDate = profile.effectiveCancellation;
  }
  const begin = monthIndex(profile.registered.slice(0, 7)), end = monthIndex(endDate.slice(0, 7));
  const qrmp = profile.qrmpStart ? monthIndex(profile.qrmpStart) : Infinity;
  if (qrmp !== Infinity && (qrmp < monthIndex('2021-01') || qrmp % 3 !== 0 || qrmp < begin || qrmp > end)) throw new Error('QRMP must start with a verified January, April, July or October quarter from January 2021 onward, within this registration history.');
  const rows: HistoryRow[] = [], notes: string[] = [];
  const january2021 = monthIndex('2021-01');
  if (!profile.frequencyConfirmed) notes.push('Confirm the filing-frequency history. Until then this is a draft list, not a confirmed count of pending returns.');
  if (profile.gstr1Frequency === 'unknown') notes.push('Last filed GSTR-1 and its filing frequency are not known. GSTR-1 has not been added to the count.');
  if (profile.gstr1Frequency === 'quarterly' && end >= january2021) notes.push('The older quarterly GSTR-1 arrangement ends in December 2020. From January 2021 this list uses monthly GSTR-1 and GSTR-3B until the entered QRMP start, then quarterly for both. Confirm the actual GST portal history.');
  function append(form: 'GSTR-1' | 'GSTR-3B', last: string, never: boolean, pre2021Frequency: 'monthly' | 'quarterly') {
    const isQuarterly = (period: number) => period >= qrmp || (form === 'GSTR-1' && period < january2021 && pre2021Frequency === 'quarterly');
    const lastMonth = never ? begin - 1 : monthIndex(last);
    if (!never && (lastMonth < begin || lastMonth > end)) throw new Error(`${form}: the last filed tax period must be within the registration history.`);
    if (!never && isQuarterly(lastMonth) && lastMonth % 3 !== 2 && !(profile.cancelled && lastMonth === end)) throw new Error(`${form}: choose the quarter-ending month (March, June, September or December), or the verified final partial period.`);
    let current = never ? begin : lastMonth + 1;
    while (current <= end) {
      const quarterly = isQuarterly(current);
      const nominalEnd = quarterly ? quarterEnd(current) : current;
      const activeEnd = Math.min(nominalEnd, end);
      // Open periods are not yet pending returns for an active registration.
      if (!profile.cancelled && historyDate(nextMonth(nominalEnd)) > asOf) break;
      const periodEnd = profile.cancelled && activeEnd === end ? endDate : iso(historyDate(nextMonth(activeEnd)) - 1);
      const review: string[] = [];
      if (profile.cancelled && activeEnd === end && endDate.endsWith('-01')) review.push('Cancellation takes effect on the first day: verify whether this final tax period is actually required on the portal/order.');
      if (quarterly && nominalEnd !== activeEnd) review.push('Cancellation cuts this quarter short. Verify the final period and its notified due date; do not automatically use the full-quarter due date.');
      if (current < monthIndex('2017-10')) review.push('July–September 2017 fee waivers need a separate notification review. No fee is computed here.');
      if (quarterly && nominalEnd === monthIndex('2021-06') && activeEnd < nominalEnd) review.push('Partial April/May 2021 period: verify the applicable fee-cap transition separately.');
      const start = monthString(current), finish = monthString(activeEnd);
      rows.push({ id: `${form}-${start}`, form, start, end: finish, label: current === activeEnd ? labelMonth(current) : `${labelMonth(current)} – ${labelMonth(activeEnd)}`, previousFy: financialYear(current), frequency: quarterly ? 'quarterly' : 'monthly', earliestDue: iso(historyDate(periodEnd) + 1), suggestedDue: '', review });
      current = nominalEnd + 1;
    }
  }
  if (profile.gstr1Frequency !== 'unknown') append('GSTR-1', profile.lastGstr1, profile.neverGstr1, profile.gstr1Frequency);
  append('GSTR-3B', profile.lastGstr3b, profile.neverGstr3b, 'monthly');
  if (profile.cancelled && !profile.finalReturnFiled) {
    const later = profile.effectiveCancellation > profile.cancellationOrder ? profile.effectiveCancellation : profile.cancellationOrder;
    rows.push({ id: 'GSTR-10-final', form: 'GSTR-10', start: endDate.slice(0, 7), end: endDate.slice(0, 7), label: 'Final return after cancellation', previousFy: '', frequency: 'final', earliestDue: historyAddMonths(later, 3), suggestedDue: historyAddMonths(later, 3), review: [] });
  }
  return { rows: rows.sort((a, b) => a.start.localeCompare(b.start) || a.form.localeCompare(b.form)), notes };
}
export const emptyHistoryFacts: HistoryRowFacts = { due: '', dueConfirmed: false, category: 'unknown', turnover: 'unknown', relief: false, paid: '0', periodConfirmed: false, alreadyFiled: false };
export function calculateHistoryFee(row: HistoryRow, facts: HistoryRowFacts, asOf: string, frequencyConfirmed: boolean): HistoryResult {
  const filing = historyDate(asOf), reasons: string[] = [];
  const result: HistoryResult = { days: null, cap: null, daily: null, fee: null, remaining: null, filingRestricted: false, reasons };
  if (facts.alreadyFiled) { reasons.push('Excluded: marked already filed. Reconcile any historic fee separately.'); return result; }
  if (!frequencyConfirmed) reasons.push('Confirm the filing-frequency history first.');
  if (row.review.length && !facts.periodConfirmed) reasons.push(...row.review);
  if (row.start < '2017-10' || row.review.some(reason => reason.startsWith('Partial April'))) { reasons.push('This period needs a separate fee-rule review.'); return result; }
  if (!facts.due) { reasons.push('Enter the effective notified due date for this return.'); return result; }
  const due = historyDate(facts.due);
  if (facts.due < row.earliestDue) throw new Error(row.form === 'GSTR-10' ? 'GSTR-10 due date cannot be earlier than three months after the later cancellation/order date.' : 'The due date cannot be before the end of this return period.');
  result.days = Math.max(0, filing - due);
  result.filingRestricted = row.form !== 'GSTR-10' && asOf > historyAddMonths(facts.due, 36);
  if (!facts.dueConfirmed) reasons.push('Confirm the actual notified due date, including extensions.');
  if (facts.relief) reasons.push('A waiver, amnesty or order may apply. Review eligibility before asserting a fee.');
  const early = row.end < '2021-06';
  if (row.form !== 'GSTR-10' && facts.category === 'unknown') reasons.push('Choose the verified nil or other fee category.');
  if (row.form !== 'GSTR-10' && !early && facts.category === 'other' && facts.turnover === 'unknown') reasons.push('Choose the preceding financial year’s turnover category.');
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(facts.paid) || Number(facts.paid) > 1e9) throw new Error('Enter a valid non-negative fee already paid, with at most two decimal places.');
  result.daily = row.form === 'GSTR-10' ? 200 : facts.category === 'nil' ? 20 : facts.category === 'other' ? 50 : null;
  result.cap = row.form === 'GSTR-10' || early ? 10000 : facts.category === 'nil' ? 500 : facts.turnover === 'up-to-1.5cr' ? 2000 : facts.turnover === '1.5-to-5cr' ? 5000 : facts.turnover === 'above-5cr' ? 10000 : null;
  if (!reasons.length && result.daily !== null && result.cap !== null) {
    result.fee = Math.min(result.days * result.daily, result.cap);
    result.remaining = Math.max(0, Math.round((result.fee - Number(facts.paid)) * 100) / 100);
  }
  return result;
}
