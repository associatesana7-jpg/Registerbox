/** Resident, non-salary withholding only. Rules verified against the cited official sources on 2026-10-28. */
export const TDS_RULE_VERSION = '2026-10-28.1';
export const TDS_TOOL_SOURCES = [
  { title: 'Income-tax Act 2025, section 393: resident payment tables, amended for 2026', url: 'https://incometaxindia.gov.in/w/section-393-6' },
  { title: 'Income-tax Act 2025, section 397: PAN and compliance', url: 'https://incometaxindia.gov.in/w/section-397-6' },
  { title: 'Income-tax Act 2025, section 402: specified and designated payers', url: 'https://incometaxindia.gov.in/w/section-402-5' },
  { title: 'Income Tax Department: transition to the 2025 Act', url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tax-payments' },
  { title: 'CBDT Circular 23/2017: separately stated GST on services', url: 'https://incometaxindia.gov.in/communications/circular/circular_23_2017.pdf' },
  { title: 'Income Tax Department: TDS rates and legacy sections', url: 'https://www.incometaxindia.gov.in/w/tds-rates-1' },
  { title: 'Finance Act 2026: rates in force for interest and other withholding', url: 'https://www.incometaxindia.gov.in/documents/d/guest/finance-act-2026-pdf-1' },
] as const;

export type TdsYear = '2025-26' | '2026-27';
export type TdsKind = 'contractor' | 'professional' | 'technical' | 'commission' | 'rent-building' | 'rent-furniture' | 'rent-plant' | 'interest-bank' | 'interest-other' | 'property';
export const TDS_KINDS: { value: TdsKind; label: string }[] = [
  { value: 'contractor', label: 'Contractor / labour payment' },
  { value: 'professional', label: 'Professional fees (CA, lawyer, architect, etc.)' },
  { value: 'technical', label: 'Technical fees (not professional services)' },
  { value: 'commission', label: 'Commission / brokerage (not insurance)' },
  { value: 'rent-building', label: 'Rent: land or building' },
  { value: 'rent-furniture', label: 'Rent: standalone furniture or fittings' },
  { value: 'rent-plant', label: 'Rent: plant, machinery or equipment' },
  { value: 'interest-bank', label: 'Bank / co-operative bank / notified post-office interest' },
  { value: 'interest-other', label: 'Other interest (not securities)' },
  { value: 'property', label: 'Resident property purchase: whole transaction' },
];
export interface TdsInput {
  year: TdsYear;
  kind: TdsKind;
  payer: 'entity' | 'eligible-individual' | 'other-individual';
  recipient: 'individual-huf' | 'other';
  currentAmount: number;
  previousAmount: number;
  expectedAnnualAmount?: number;
  previousTds: number;
  panProvided: boolean;
  seniorCitizen: boolean;
  /** For non-specified individual/HUF tenants: highest monthly rent and final month's rent. */
  monthlyRent?: number;
  lastMonthRent?: number;
  stampDutyValue?: number;
  resident: boolean;
  specialCase: boolean;
}
export interface TdsResult {
  status: 'calculated' | 'review';
  section: string;
  legacySection: string;
  standardRate: number;
  appliedRate: number;
  threshold: string;
  triggered: boolean;
  taxableBase: number;
  cumulativeTds: number | null;
  previousTdsUsed: number;
  tdsNow: number | null;
  netCurrentPayment: number | null;
  explanation: string;
  notes: string[];
}
const inr = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
function validAmount(value: number) { return Number.isFinite(value) && value >= 0 && value <= 1_000_000_000_000 && /^\d+(?:\.\d{1,2})?$/.test(String(value)); }
/** Convert validated decimal amounts without multiplying a binary float by 100. */
function toPaise(value: number): bigint {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
const fromPaise = (value: bigint): number => Number(value) / 100;
/** Integer rates in this tool; exact half-paise amounts round up to one paise. */
function percentagePaise(base: bigint, rate: number): bigint { return (base * BigInt(rate) + 50n) / 100n; }

export function calculateTds(input: TdsInput): TdsResult {
  if (!['2025-26', '2026-27'].includes(input.year) || !TDS_KINDS.some((kind) => kind.value === input.kind)) throw new Error('Choose a supported payment type and year.');
  if (!['entity', 'eligible-individual', 'other-individual'].includes(input.payer) || !['individual-huf', 'other'].includes(input.recipient)) throw new Error('Choose the payer and recipient types.');
  for (const value of [input.currentAmount, input.previousAmount, input.previousTds, input.expectedAnnualAmount ?? 0, input.monthlyRent ?? 0, input.lastMonthRent ?? 0, input.stampDutyValue ?? 0]) if (!validAmount(value)) throw new Error('Enter non-negative rupee amounts with no more than two decimal places (maximum ₹1 lakh crore).');
  if (input.currentAmount <= 0) throw new Error('Enter an amount greater than zero.');
  const currentPaise = toPaise(input.currentAmount);
  const previousPaise = toPaise(input.previousAmount);
  const priorTdsPaise = toPaise(input.previousTds);
  const totalPaise = previousPaise + currentPaise;
  if (priorTdsPaise > previousPaise) throw new Error('Earlier TDS cannot exceed the earlier payments entered for this category.');
  const expectedPaise = input.expectedAnnualAmount === undefined ? totalPaise : toPaise(input.expectedAnnualAmount);
  if (expectedPaise < totalPaise) throw new Error('Expected annual payments cannot be less than previous payments plus the current amount.');
  let legacySection = '';
  let table = '';
  let standardRate = 0;
  let threshold = '';
  let triggered = false;
  let taxableBasePaise = totalPaise;
  let usePriorTds = true;
  let explanation = '';
  const notes: string[] = [];
  const smallPayer = input.payer === 'other-individual';
  const rent = input.kind.startsWith('rent-');
  const smallTenant = smallPayer && input.kind === 'rent-building';
  switch (input.kind) {
    case 'contractor':
      legacySection = smallPayer ? '194M' : '194C'; table = smallPayer ? '6(ii)' : '6(i)';
      standardRate = smallPayer ? 2 : input.recipient === 'individual-huf' ? 1 : 2;
      threshold = smallPayer ? 'Annual aggregate exceeds ₹50,00,000' : 'Single payment exceeds ₹30,000 OR annual aggregate exceeds ₹1,00,000';
      if (smallPayer) triggered = expectedPaise > 500_000_000n;
      else {
        const annualTriggered = expectedPaise > 10_000_000n;
        triggered = annualTriggered || currentPaise > 3_000_000n;
        if (!annualTriggered) { taxableBasePaise = currentPaise; usePriorTds = false; }
      }
      notes.push('Goods-carriage declarations, personal-purpose exclusions, and separately priced customer-supplied material require review.');
      break;
    case 'professional':
    case 'technical':
      legacySection = smallPayer && input.kind === 'professional' ? '194M' : '194J';
      table = smallPayer && input.kind === 'professional' ? '6(ii)' : '6(iii)';
      standardRate = smallPayer && input.kind === 'professional' ? 2 : input.kind === 'technical' ? 2 : 10;
      threshold = smallPayer && input.kind === 'professional' ? 'Annual aggregate exceeds ₹50,00,000' : 'Annual aggregate for this payment category exceeds ₹50,000';
      triggered = smallPayer ? input.kind === 'professional' && expectedPaise > 500_000_000n : expectedPaise > 5_000_000n;
      if (smallPayer && input.kind === 'technical') notes.push('This individual/HUF does not meet the ordinary payer test. A service that is actually professional work may fall under the ₹50 lakh rule; classify it correctly.');
      notes.push('Professional and technical fees have separate category thresholds. Director fees, royalty, non-compete payments and call-centre cases are outside this simplified selection.');
      break;
    case 'commission':
      legacySection = smallPayer ? '194M' : '194H'; table = smallPayer ? '6(ii)' : '1(ii)'; standardRate = 2;
      threshold = smallPayer ? 'Annual aggregate exceeds ₹50,00,000' : 'Annual aggregate exceeds ₹20,000';
      triggered = expectedPaise > (smallPayer ? 500_000_000n : 2_000_000n);
      break;
    case 'rent-building':
    case 'rent-furniture':
    case 'rent-plant':
      legacySection = smallTenant ? '194-IB' : '194-I'; table = smallTenant ? '2(i)' : '2(ii)';
      standardRate = smallTenant || input.kind === 'rent-plant' ? 2 : 10;
      threshold = 'Rent exceeds ₹50,000 for a month or part of a month';
      usePriorTds = false;
      taxableBasePaise = currentPaise;
      if (smallTenant) {
        if (input.monthlyRent === undefined || input.lastMonthRent === undefined) throw new Error('Enter the highest monthly rent and the final month’s rent for this tenancy.');
        const monthlyPaise = toPaise(input.monthlyRent);
        const finalMonthPaise = toPaise(input.lastMonthRent);
        if (monthlyPaise > currentPaise || finalMonthPaise > currentPaise) throw new Error('A month’s rent cannot exceed the total rent for the year.');
        if (finalMonthPaise > monthlyPaise || currentPaise > monthlyPaise * 12n) throw new Error('Check the monthly rents and annual total: the final month cannot exceed the highest month, and a tax year has at most 12 months.');
        triggered = monthlyPaise > 5_000_000n;
        notes.push('For this individual/HUF tenant, enter total rent for the tax year or tenancy. Deduction occurs in the last month of the year or tenancy. The missing-PAN deduction cannot exceed that last month’s rent.');
      } else {
        triggered = !smallPayer && currentPaise > 5_000_000n;
        notes.push('Enter rent for one calendar month or part of a month. This is a monthly threshold, not the old ₹2.4 lakh annual threshold.');
        if (smallPayer) notes.push('The small individual/HUF tenant provision covers land/building, not standalone furniture, fittings or machinery hire. Review any contractor or other applicable provision.');
      }
      break;
    case 'interest-bank':
    case 'interest-other':
      legacySection = '194A'; table = input.kind === 'interest-bank' ? '5(ii)' : '5(iii)'; standardRate = 10;
      threshold = `Annual interest exceeds ${inr(input.kind === 'interest-bank' ? input.seniorCitizen ? 100_000 : 50_000 : 10_000)}`;
      triggered = (input.kind === 'interest-bank' || !smallPayer) && expectedPaise > (input.kind === 'interest-bank' ? input.seniorCitizen ? 10_000_000n : 5_000_000n : 1_000_000n);
      notes.push('Use one payer’s annual interest. Core-banking deposits are aggregated across branches. Savings-account interest and statutory exempt recipients/interest are not covered.');
      break;
    case 'property':
      legacySection = '194-IA'; table = '3(i)'; standardRate = 1;
      threshold = 'Full property consideration OR stamp-duty value is ₹50,00,000 or more';
      if (input.stampDutyValue === undefined) throw new Error('Enter the stamp-duty value of the whole property.');
      taxableBasePaise = currentPaise > toPaise(input.stampDutyValue) ? currentPaise : toPaise(input.stampDutyValue);
      triggered = taxableBasePaise >= 500_000_000n;
      usePriorTds = false;
      notes.push('Whole-transaction liability only: include incidental property charges and aggregate all buyers/sellers. Do not enter a single instalment or a co-owner’s share. Resident seller; agricultural-land exclusions, joint development and compulsory acquisition need separate review.');
      break;
  }
  const section = input.year === '2026-27' ? `393(1), Table ${table}` : legacySection;
  const appliedRate = input.panProvided ? standardRate : Math.max(20, standardRate);
  if (!input.resident || input.specialCase) return { status: 'review', section, legacySection, standardRate, appliedRate, threshold, triggered: false, taxableBase: 0, cumulativeTds: null, previousTdsUsed: 0, tdsNow: null, netCurrentPayment: null, explanation: !input.resident ? 'This calculator supports resident payees only. Non-resident withholding needs the applicable Act, treaty, surcharge/cess and documents; no fixed-rate answer is shown.' : 'A lower/nil deduction certificate, declaration, exemption, gross-up, or special payment condition needs separate review. The standard calculation would be misleading.', notes };
  const uncappedTdsPaise = triggered ? percentagePaise(taxableBasePaise, appliedRate) : 0n;
  let cumulativeTdsPaise = uncappedTdsPaise;
  if (smallTenant && !input.panProvided) {
    const capPaise = toPaise(input.lastMonthRent ?? 0);
    if (cumulativeTdsPaise > capPaise) cumulativeTdsPaise = capPaise;
  }
  const previousTdsUsedPaise = triggered && usePriorTds ? priorTdsPaise : 0n;
  const tdsNowPaise = cumulativeTdsPaise > previousTdsUsedPaise ? cumulativeTdsPaise - previousTdsUsedPaise : 0n;
  const taxableBase = fromPaise(taxableBasePaise);
  const cumulativeTds = fromPaise(cumulativeTdsPaise);
  const previousTdsUsed = fromPaise(previousTdsUsedPaise);
  const tdsNow = fromPaise(tdsNowPaise);
  explanation = triggered ? `${inr(taxableBase)} × ${appliedRate}% = ${inr(fromPaise(uncappedTdsPaise))}${smallTenant && !input.panProvided ? ', subject to the final-month rent cap' : ''}.` : 'The selected payer/payment conditions and amounts do not trigger withholding under the provision modelled here. This does not decide whether the income is taxable.';
  if (previousTdsUsed) explanation += ` Less ${inr(previousTdsUsed)} already deducted gives ${inr(tdsNow)} to deduct now.`;
  if (!input.panProvided && triggered) notes.push(`Missing/invalid/inoperative PAN: the supported payments use the higher 20% rate (${input.year === '2026-27' ? 'section 397(2)' : 'section 206AA'}), subject to the individual-tenant rent cap where applicable. No PAN number is collected or verified.`);
  if (tdsNowPaise > currentPaise && !smallTenant) notes.push('Catch-up exceeds this payment. Resolve the short deduction with the payee; do not treat a negative amount as an automatic recovery instruction.');
  if (previousTdsUsedPaise > cumulativeTdsPaise) notes.push('Prior deduction exceeds calculated cumulative liability. No automatic refund or offset outside this payment category is assumed.');
  if (legacySection === '194M') notes.push('For this individual/HUF payer, aggregate all covered contractor, professional-service and non-insurance commission/brokerage payments to this same resident under this provision. Do not split the ₹50 lakh test into separate service categories.');
  if (input.previousAmount > 0 && usePriorTds) notes.push(`Earlier amounts are assumed to share this ${legacySection === '194M' ? 'covered provision' : 'payment category'}, payee and applicable rate/PAN status. Rate or status changes and earlier exemptions need a separate reconciliation.`);
  if (input.year === '2026-27') notes.push(`Use ${section} for the 2025 Act; ${legacySection} is shown only as a familiar legacy label. Choose the year of the earlier credit/payment event.`);
  if (!rent && input.kind !== 'property' && expectedPaise > totalPaise) notes.push('The annual threshold test includes your expected payments; TDS is computed only on amounts paid/credited so far. Update the expectation when facts change.');
  notes.push('Calculation uses integer paise with exact half-up rounding to the nearest paise. Apply the required challan/statement rounding at filing. No surcharge or health and education cess is added to these supported resident non-salary rates.');
  return { status: 'calculated', section, legacySection, standardRate, appliedRate, threshold, triggered, taxableBase: triggered ? taxableBase : 0, cumulativeTds, previousTdsUsed, tdsNow, netCurrentPayment: smallTenant ? null : fromPaise(currentPaise - tdsNowPaise), explanation, notes };
}

export const TDS_GUIDE_FACTS = [
  'For FY 2025–26 and tax year 2026–27, resident contractor payments normally use 1% for an individual/HUF contractor and 2% for other contractors, subject to payer and payment conditions.',
  'Professional fees normally use 10% and qualifying non-professional technical fees 2%, after the separate ₹50,000 annual-category threshold. Commission/brokerage normally uses 2% after ₹20,000.',
  'Rent for a specified payer has a ₹50,000 monthly threshold: 10% for land/building/furniture/fittings and 2% for plant/machinery/equipment. An eligible small individual/HUF tenant uses a separate 2% rule for land/building rent.',
  'Bank interest normally uses 10% after annual interest exceeds ₹50,000, or ₹1,00,000 for a resident senior citizen. The ordinary other-interest threshold is ₹10,000.',
  'Resident property TDS is 1% of the higher of full consideration and stamp-duty value when either is at least ₹50 lakh. It is not 1% only on the excess over ₹50 lakh.',
  'From 1 April 2026, the relevant non-salary TDS table item is in section 393 of the Income-tax Act 2025. Old section labels remain useful for comparison, but are not the new filing codes.',
] as const;
