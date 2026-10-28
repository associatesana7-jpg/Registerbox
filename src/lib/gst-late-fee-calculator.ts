/** Standard late-fee calculation, not tax-interest or a waiver eligibility engine. */
export const GST_LATE_FEE_RULE_VERSION = '2026-10-28.1';
export const GST_LATE_FEE_REVIEWED = '2026-10-28';
export const GST_LATE_FEE_TOOL_SOURCES = [
  { title: 'CBIC Notification 19/2021: GSTR-3B late-fee caps', url: 'https://cbic-gst.gov.in/pdf/central-tax/notfctn-19-central-tax-english-2021.pdf' },
  { title: 'CBIC Notification 20/2021: GSTR-1 late-fee caps', url: 'https://cbic-gst.gov.in/pdf/central-tax/notfctn-20-central-tax-english-2021.pdf' },
  { title: 'Government of Telangana GST handbook: interest, late fee and penalties', url: 'https://tgct.gov.in/tgportal/GST/GstHandbook/GST_Late_Fee_and_Penalties_%28Dec%2025%29.pdf' },
  { title: 'GST portal: notices, due dates and return filing', url: 'https://www.gst.gov.in/' },
] as const;
export interface GstLateFeeInput {
  returnType: 'GSTR-1' | 'GSTR-3B';
  frequency: 'monthly' | 'quarterly';
  /** For quarterly returns, use the quarter-ending month. */
  taxPeriod: string;
  effectiveDueDate: string;
  filingDate: string;
  previousFyTurnover: number;
  nilCategory: boolean;
  dueDateConfirmed: boolean;
  concessionApplies: boolean;
}
export interface GstLateFeeResult {
  status: 'calculated' | 'review';
  daysLate: number;
  dailyCombined: number;
  capCombined: number;
  uncappedCombined: number;
  combinedLateFee: number | null;
  cgstLateFee: number | null;
  stateUtLateFee: number | null;
  explanation: string;
  notes: string[];
}
/** Date-only UTC arithmetic avoids local midnight and daylight-saving offsets. */
export function gstDateNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter dates in YYYY-MM-DD format.');
  const [year, month, day] = value.split('-').map(Number);
  if (year < 2021 || year > 2100) throw new Error('Choose a date between 2021 and 2100.');
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('Enter a real calendar date.');
  return date.getTime() / 86_400_000;
}
export function calculateGstLateFee(input: GstLateFeeInput): GstLateFeeResult {
  if (!['GSTR-1', 'GSTR-3B'].includes(input.returnType) || !['monthly', 'quarterly'].includes(input.frequency)) throw new Error('Choose GSTR-1 or GSTR-3B and the return frequency.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.taxPeriod)) throw new Error('Choose the tax period.');
  if (input.taxPeriod < '2021-06') throw new Error('This calculator covers June 2021 onward, including the quarter ending June 2021. Earlier periods require separate waiver and notification review.');
  if (input.taxPeriod > GST_LATE_FEE_REVIEWED.slice(0, 7)) throw new Error('This future tax period is beyond the rules review date. Check updated notifications before calculating.');
  const [year, month] = input.taxPeriod.split('-').map(Number);
  if (input.frequency === 'quarterly' && ![3, 6, 9, 12].includes(month)) throw new Error('For a quarterly return, choose March, June, September or December as the quarter-ending month.');
  const periodEnd = Date.UTC(year, month, 0) / 86_400_000;
  const due = gstDateNumber(input.effectiveDueDate);
  const filing = gstDateNumber(input.filingDate);
  if (due <= periodEnd) throw new Error('The effective due date must be after the tax period ends.');
  if (filing < periodEnd) throw new Error('The filing/calculation date cannot be before the tax period ends.');
  if (!Number.isFinite(input.previousFyTurnover) || input.previousFyTurnover < 0 || input.previousFyTurnover > 1_000_000_000_000 || !/^\d+(?:\.\d{1,2})?$/.test(String(input.previousFyTurnover))) throw new Error('Enter valid preceding-year aggregate turnover in rupees, with up to two decimal places.');
  const daysLate = Math.max(0, filing - due);
  const dailyCombined = input.nilCategory ? 20 : 50;
  const capCombined = input.nilCategory ? 500 : input.previousFyTurnover <= 15_000_000 ? 2_000 : input.previousFyTurnover <= 50_000_000 ? 5_000 : 10_000;
  const uncappedCombined = daysLate * dailyCombined;
  const notes = [
    'Use the applicable notified due date for this exact return, period, taxpayer class and State/UT, including any extension. This tool does not fetch due dates or assume an extension.',
    input.returnType === 'GSTR-1' ? 'The nil category means no outward supplies for the period. Exempt, nil-rated and zero-rated outward supplies are still outward supplies.' : 'The reduced category follows the notification’s nil central-tax-payable condition. Zero cash payment after using ITC alone does not establish this category; confirm the return’s tax-payable classification.',
    'The combined figure assumes the corresponding State/UT late-fee provision mirrors the central amount. Confirm any jurisdiction-specific relief on the GST portal.',
    'Interest, tax due, penalties, previous outstanding late fees and portal adjustments are separate. This calculator does not apply 18% interest to output tax or add it to this fee.',
    'Specific waivers, amnesties, disasters, court orders or taxpayer-specific relief are not automatically applied. Compare the result with the portal and effective notification before payment.',
  ];
  if (!input.dueDateConfirmed || input.concessionApplies) return { status: 'review', daysLate, dailyCombined, capCombined, uncappedCombined, combinedLateFee: null, cgstLateFee: null, stateUtLateFee: null, explanation: !input.dueDateConfirmed ? 'Confirm the effective notified due date before calculating a payable late fee.' : 'A special waiver or concession may change the standard result. Review its exact period, filing window and eligibility; no payable amount is asserted here.', notes };
  const combinedLateFee = Math.min(uncappedCombined, capCombined);
  return { status: 'calculated', daysLate, dailyCombined, capCombined, uncappedCombined, combinedLateFee, cgstLateFee: combinedLateFee / 2, stateUtLateFee: combinedLateFee / 2, explanation: `${daysLate} day${daysLate === 1 ? '' : 's'} × ₹${dailyCombined} per day = ₹${uncappedCombined.toLocaleString('en-IN')}. Apply the combined cap of ₹${capCombined.toLocaleString('en-IN')}: ₹${combinedLateFee.toLocaleString('en-IN')} late fee. The due date itself is not a late day.`, notes };
}
export const GST_LATE_FEE_GUIDE_FACTS = [
  'For GSTR-1 and GSTR-3B from the tax period June 2021, or quarter ending June 2021, standard late fee is ₹20 per day combined in the applicable nil category and ₹50 per day combined otherwise.',
  'The combined cap is ₹500 for the applicable nil category. For other returns it is ₹2,000 when preceding-year aggregate turnover is up to ₹1.5 crore, ₹5,000 above ₹1.5 crore and up to ₹5 crore, and ₹10,000 above ₹5 crore.',
  'Calculate late days from the day after the effective notified due date through the filing date. An extension changes the due date; a waiver can separately change the charge.',
  'GST late fee and GST interest are different charges. Interest depends on the statutory payment and ledger facts, so this calculator does not estimate it from output tax.',
] as const;
