/**
 * Normal slab-rate individual income only. No service calls or taxpayer storage.
 * Rules reviewed against official enacted law / CBDT guidance on 2026-10-28.
 * Tax arithmetic uses units of 1/10,000 rupee so percentage operations stay exact.
 */
export const INCOME_TAX_RULE_VERSION = '2026-10-28.1';
export const INCOME_TAX_REVIEWED_ON = '2026-10-28';
export const MAX_INCOME_RUPEES = 1_000_000_000;

export const TOOL_SOURCES = [
  { title: 'Income-tax Act, 2025, as amended by Finance Act, 2026 — sections 19, 156, 202 and 516', url: 'https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf' },
  { title: 'Finance Act, 2026 — First Schedule, Part I-B; surcharge, marginal relief and cess', url: 'https://www.incometaxindia.gov.in/documents/d/guest/finance-act-2026-pdf-1' },
  { title: 'Income Tax Department — salaried individuals for AY 2026–27', url: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1' },
  { title: 'Ministry of Finance parliamentary answer — new-regime slabs and ₹75,000 salary deduction', url: 'https://sansad.in/getFile/loksabhaquestions/annex/187/AU1546_FJ8593.pdf?source=pqals' },
  { title: 'Income Tax Department — transition to Tax Year 2026–27', url: 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/objective-and-scope-new-act' },
] as const;

export const INCOME_TAX_PERIODS = [
  { id: '2026-27', label: 'Tax Year 2026–27 · 1 Apr 2026–31 Mar 2027', act: 'Income-tax Act, 2025', rebateSection: '156', regimeSection: '202', roundingSection: '516' },
  { id: '2025-26', label: 'FY 2025–26 / AY 2026–27 · 1 Apr 2025–31 Mar 2026', act: 'Income-tax Act, 1961', rebateSection: '87A', regimeSection: '115BAC', roundingSection: '288A / 288B' },
] as const;

export const INCOME_TAX_NOTES = [
  'For both supported years, new-regime normal-income slabs are 0% up to ₹4 lakh, then 5%, 10%, 15%, 20%, 25% across successive ₹4 lakh bands, and 30% above ₹24 lakh.',
  'Resident individuals can receive a new-regime rebate up to ₹60,000 when total taxable income is at most ₹12 lakh. Rebate marginal relief is calculated immediately above ₹12 lakh. Non-residents do not receive this rebate.',
  'The old-regime rebate is up to ₹12,500 for resident individuals with total taxable income at most ₹5 lakh. The old regime has no corresponding rebate marginal relief above ₹5 lakh.',
  'Salary or own employment pension receives a standard deduction capped at the salary amount: ₹75,000 in the new regime and ₹50,000 in the old regime. Family pension is outside this calculator’s scope.',
  'Old-regime basic exemption is ₹2.5 lakh, ₹3 lakh for residents aged 60–79, and ₹5 lakh for residents aged 80 or more. Non-residents have a ₹2.5 lakh basic exemption regardless of age. The new regime has no age-based slab change.',
  'Surcharge begins above ₹50 lakh, with marginal relief at each surcharge increase. The maximum surcharge is 25% in the new regime and 37% in the old regime. Health and Education Cess is 4% after applicable relief.',
  'This is annual income-tax liability before TDS, advance tax, interest, fees and tax credits. Regime switching and deduction eligibility must be checked separately, especially for business or professional income.',
] as const;

export const INCOME_TAX_LIMITATIONS = [
  'Individuals with normal slab-rate income only; this is not a computation for HUFs, firms or companies.',
  'Do not use these totals for capital gains, dividends, crypto, winnings, agricultural rate integration, family pension, losses, AMT or foreign-tax relief.',
  'Salary exemptions allowed in the new regime, and other income that differs between regimes, require a separate computation. Eligible old-regime salary exemptions and other deductions are entered by the user after legal limits.',
  'No PAN, Form 16, bank credentials or income-tax portal access is required. This tool does not verify a tax return or file one.',
] as const;

export type IncomeTaxPeriod = typeof INCOME_TAX_PERIODS[number]['id'];
export type IncomeTaxRegime = 'old' | 'new';
export type IncomeTaxAgeGroup = 'under60' | '60to79' | '80plus';
export type IncomeTaxResidency = 'resident' | 'non-resident';

export interface IncomeTaxInput {
  period: IncomeTaxPeriod;
  ageGroup: IncomeTaxAgeGroup;
  residency: IncomeTaxResidency;
  salary: string | number;
  otherIncome: string | number;
  oldSalaryExemptions: string | number;
  oldDeductions: string | number;
  newDeductions: string | number;
  hasUnsupportedIncome?: boolean;
}

export interface IncomeTaxSlab {
  from: number;
  to: number | null;
  rate: number;
  taxableAmount: number;
  tax: number;
}

export interface IncomeTaxResult {
  regime: IncomeTaxRegime;
  grossSalary: number;
  otherIncome: number;
  salaryExemptions: number;
  standardDeduction: number;
  otherDeductions: number;
  incomeBeforeRounding: number;
  taxableIncome: number;
  slabTax: number;
  rebate: number;
  rebateMarginalRelief: number;
  taxAfterRebate: number;
  surchargeRate: number;
  surchargeBeforeRelief: number;
  surchargeMarginalRelief: number;
  surcharge: number;
  cess: number;
  totalBeforeRounding: number;
  roundingAdjustment: number;
  totalTax: number;
  effectiveRate: number;
  slabs: IncomeTaxSlab[];
}

export interface IncomeTaxComparison {
  period: typeof INCOME_TAX_PERIODS[number];
  ageGroup: IncomeTaxAgeGroup;
  residency: IncomeTaxResidency;
  old: IncomeTaxResult;
  new: IncomeTaxResult;
  lowerTaxRegime: IncomeTaxRegime | 'equal';
  difference: number;
  ruleVersion: string;
}

/** Accept ordinary rupees/paise and correctly grouped commas; return integer paise. */
export function parseIncomeTaxMoney(value: string | number, label = 'Amount'): number {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  const normalized = text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966)).replace(/[೦-೯]/g, (digit) => String(digit.charCodeAt(0) - 0x0ce6));
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${label}: enter a non-negative rupee amount with at most two decimal places. Use 0 if none.`);
  }
  const amount = Number(normalized.replaceAll(',', ''));
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_INCOME_RUPEES) throw new Error(`${label}: enter an amount from ₹0 to ₹100 crore.`);
  return Math.round(amount * 100);
}

/** Statutory rounding first ignores paise, then rounds rupees to nearest ten. */
export function roundIncomeTaxToTen(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_INCOME_RUPEES) throw new Error('Amount is outside the supported rounding range.');
  return Math.floor((Math.floor(amount) + 5) / 10) * 10;
}

const TAX_UNITS = 10_000;
type Band = readonly [number | null, number];
const NEW_BANDS: readonly Band[] = [[400_000, 0], [800_000, 5], [1_200_000, 10], [1_600_000, 15], [2_000_000, 20], [2_400_000, 25], [null, 30]];

function bandsFor(regime: IncomeTaxRegime, age: IncomeTaxAgeGroup, residency: IncomeTaxResidency): readonly Band[] {
  if (regime === 'new') return NEW_BANDS;
  const exemption = residency === 'resident' ? age === '80plus' ? 500_000 : age === '60to79' ? 300_000 : 250_000 : 250_000;
  return exemption === 500_000 ? [[500_000, 0], [1_000_000, 20], [null, 30]] : [[exemption, 0], [500_000, 5], [1_000_000, 20], [null, 30]];
}

function slabDetails(income: number, bands: readonly Band[]): { units: number; slabs: IncomeTaxSlab[] } {
  let from = 0;
  let units = 0;
  const slabs = bands.map(([to, rate]) => {
    const taxableAmount = Math.max(0, Math.min(income, to ?? income) - from);
    const taxUnits = taxableAmount * rate * 100;
    units += taxUnits;
    const slab = { from, to, rate, taxableAmount, tax: taxUnits / TAX_UNITS };
    if (to !== null) from = to;
    return slab;
  });
  return { units, slabs };
}

function surchargeBand(income: number, regime: IncomeTaxRegime): { rate: number; threshold: number; previousRate: number } {
  if (regime === 'old' && income > 50_000_000) return { rate: 37, threshold: 50_000_000, previousRate: 25 };
  if (income > 20_000_000) return { rate: 25, threshold: 20_000_000, previousRate: 15 };
  if (income > 10_000_000) return { rate: 15, threshold: 10_000_000, previousRate: 10 };
  if (income > 5_000_000) return { rate: 10, threshold: 5_000_000, previousRate: 0 };
  return { rate: 0, threshold: 0, previousRate: 0 };
}

function computeRegime(input: IncomeTaxInput, regime: IncomeTaxRegime, amounts: Record<'salary' | 'otherIncome' | 'oldSalaryExemptions' | 'oldDeductions' | 'newDeductions', number>): IncomeTaxResult {
  const salaryExemptionsPaise = regime === 'old' ? amounts.oldSalaryExemptions : 0;
  const salaryAfterExemptions = amounts.salary - salaryExemptionsPaise;
  const standardDeductionPaise = Math.min(salaryAfterExemptions, (regime === 'old' ? 50_000 : 75_000) * 100);
  const otherDeductionsPaise = regime === 'old' ? amounts.oldDeductions : amounts.newDeductions;
  const incomeBeforeDeductions = salaryAfterExemptions - standardDeductionPaise + amounts.otherIncome;
  if (otherDeductionsPaise > incomeBeforeDeductions) throw new Error(`${regime === 'old' ? 'Old' : 'New'}-regime deductions exceed income remaining after salary exemptions and the standard deduction. Enter only the deduction actually eligible against this income.`);
  const incomePaise = incomeBeforeDeductions - otherDeductionsPaise;
  const income = roundIncomeTaxToTen(incomePaise / 100);
  const bands = bandsFor(regime, input.ageGroup, input.residency);
  const { units: slabTax, slabs } = slabDetails(income, bands);
  let rebate = 0;
  let rebateMarginalRelief = 0;
  if (input.residency === 'resident') {
    if (regime === 'old' && income <= 500_000) rebate = Math.min(slabTax, 12_500 * TAX_UNITS);
    if (regime === 'new') {
      if (income <= 1_200_000) rebate = Math.min(slabTax, 60_000 * TAX_UNITS);
      else rebateMarginalRelief = Math.max(0, slabTax - (income - 1_200_000) * TAX_UNITS);
    }
  }
  const taxAfterRebate = slabTax - rebate - rebateMarginalRelief;
  const surchargeBandResult = surchargeBand(income, regime);
  const surchargeBeforeRelief = taxAfterRebate * surchargeBandResult.rate / 100;
  let surchargeMarginalRelief = 0;
  if (surchargeBandResult.rate > 0) {
    const thresholdTax = slabDetails(surchargeBandResult.threshold, bands).units;
    const permittedTaxAndSurcharge = thresholdTax * (100 + surchargeBandResult.previousRate) / 100 + (income - surchargeBandResult.threshold) * TAX_UNITS;
    surchargeMarginalRelief = Math.max(0, taxAfterRebate + surchargeBeforeRelief - permittedTaxAndSurcharge);
  }
  const surcharge = Math.max(0, surchargeBeforeRelief - surchargeMarginalRelief);
  const cess = (taxAfterRebate + surcharge) * 4 / 100;
  const totalUnits = taxAfterRebate + surcharge + cess;
  const totalTax = roundIncomeTaxToTen(totalUnits / TAX_UNITS);
  const enteredIncome = (amounts.salary + amounts.otherIncome) / 100;
  return {
    regime, grossSalary: amounts.salary / 100, otherIncome: amounts.otherIncome / 100,
    salaryExemptions: salaryExemptionsPaise / 100, standardDeduction: standardDeductionPaise / 100,
    otherDeductions: otherDeductionsPaise / 100, incomeBeforeRounding: incomePaise / 100,
    taxableIncome: income, slabTax: slabTax / TAX_UNITS, rebate: rebate / TAX_UNITS,
    rebateMarginalRelief: rebateMarginalRelief / TAX_UNITS, taxAfterRebate: taxAfterRebate / TAX_UNITS,
    surchargeRate: surchargeBandResult.rate, surchargeBeforeRelief: surchargeBeforeRelief / TAX_UNITS,
    surchargeMarginalRelief: surchargeMarginalRelief / TAX_UNITS, surcharge: surcharge / TAX_UNITS,
    cess: cess / TAX_UNITS, totalBeforeRounding: totalUnits / TAX_UNITS,
    roundingAdjustment: totalTax - totalUnits / TAX_UNITS, totalTax,
    effectiveRate: enteredIncome > 0 ? totalTax / enteredIncome * 100 : 0, slabs,
  };
}

export function calculateIncomeTaxComparison(input: IncomeTaxInput): IncomeTaxComparison {
  const period = INCOME_TAX_PERIODS.find((candidate) => candidate.id === input.period);
  if (!period) throw new Error('Choose one of the supported tax years.');
  if (!(['under60', '60to79', '80plus'] as unknown[]).includes(input.ageGroup)) throw new Error('Choose a valid age group.');
  if (!(['resident', 'non-resident'] as unknown[]).includes(input.residency)) throw new Error('Choose resident or non-resident status.');
  if (input.hasUnsupportedIncome) throw new Error('A normal-income total would be misleading for this case. This calculator does not cover capital gains, dividends, crypto, winnings, agricultural rate integration, family pension, losses, AMT or foreign-tax relief. Use a full tax computation for these items.');
  const amounts = {
    salary: parseIncomeTaxMoney(input.salary, 'Salary / own pension'),
    otherIncome: parseIncomeTaxMoney(input.otherIncome, 'Other normal income'),
    oldSalaryExemptions: parseIncomeTaxMoney(input.oldSalaryExemptions, 'Old-regime salary exemptions'),
    oldDeductions: parseIncomeTaxMoney(input.oldDeductions, 'Old-regime deductions'),
    newDeductions: parseIncomeTaxMoney(input.newDeductions, 'New-regime deductions'),
  };
  if (amounts.salary + amounts.otherIncome > MAX_INCOME_RUPEES * 100) throw new Error('Combined annual income must be at most ₹100 crore.');
  if (amounts.oldSalaryExemptions > amounts.salary) throw new Error('Old-regime salary exemptions cannot exceed your salary / own pension amount.');
  const old = computeRegime(input, 'old', amounts);
  const newResult = computeRegime(input, 'new', amounts);
  return {
    period, ageGroup: input.ageGroup, residency: input.residency, old, new: newResult,
    lowerTaxRegime: old.totalTax === newResult.totalTax ? 'equal' : old.totalTax < newResult.totalTax ? 'old' : 'new',
    difference: Math.abs(old.totalTax - newResult.totalTax), ruleVersion: INCOME_TAX_RULE_VERSION,
  };
}
