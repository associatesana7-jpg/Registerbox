import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/income-tax-calculator.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { calculateIncomeTaxComparison: compare, parseIncomeTaxMoney: parseMoney, roundIncomeTaxToTen: roundTen, TOOL_SOURCES, INCOME_TAX_PERIODS } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

const base = { period: '2026-27', ageGroup: 'under60', residency: 'resident', salary: '0', otherIncome: '0', oldSalaryExemptions: '0', oldDeductions: '0', newDeductions: '0' };
const atIncome = (amount, extra = {}) => compare({ ...base, otherIncome: String(amount), ...extra });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} differs from ${expected}`);

test('₹12.75 lakh salary receives ₹75,000 standard deduction and full new-regime rebate in both supported years', () => {
  for (const period of ['2025-26', '2026-27']) {
    const result = compare({ ...base, period, salary: '12,75,000' });
    assert.equal(result.new.standardDeduction, 75_000);
    assert.equal(result.new.taxableIncome, 1_200_000);
    assert.equal(result.new.slabTax, 60_000);
    assert.equal(result.new.rebate, 60_000);
    assert.equal(result.new.totalTax, 0);
    assert.equal(result.old.standardDeduction, 50_000);
    assert.equal(result.old.totalTax, 187_200);
    assert.equal(result.lowerTaxRegime, 'new');
    assert.equal(result.difference, 187_200);
  }
});

test('₹15 lakh salary example produces independently computed ₹97,500 new / ₹2,57,400 old tax', () => {
  const result = compare({ ...base, salary: '1500000' });
  assert.equal(result.new.taxableIncome, 1_425_000);
  assert.equal(result.new.slabTax, 93_750);
  assert.equal(result.new.rebateMarginalRelief, 0);
  assert.equal(result.new.cess, 3_750);
  assert.equal(result.new.totalTax, 97_500);
  assert.equal(result.old.slabTax, 247_500);
  assert.equal(result.old.totalTax, 257_400);
});

test('salary standard deduction is capped at salary and never applied to other income', () => {
  const lowSalary = compare({ ...base, salary: '40000', otherIncome: '600000' });
  assert.equal(lowSalary.old.standardDeduction, 40_000);
  assert.equal(lowSalary.new.standardDeduction, 40_000);
  assert.equal(lowSalary.old.taxableIncome, 600_000);
  assert.equal(atIncome(600_000).new.standardDeduction, 0);
  const zero = atIncome(0);
  assert.equal(zero.new.totalTax, 0);
  assert.equal(zero.new.effectiveRate, 0);
  assert.equal(zero.lowerTaxRegime, 'equal');
});

test('old and new reductions are kept separate and can change the lower-tax regime', () => {
  const result = compare({ ...base, salary: '1500000', oldSalaryExemptions: '300000', oldDeductions: '400000', newDeductions: '50000' });
  assert.equal(result.old.taxableIncome, 750_000);
  assert.equal(result.old.totalTax, 65_000);
  assert.equal(result.new.taxableIncome, 1_375_000);
  assert.equal(result.new.totalTax, 89_700);
  assert.equal(result.lowerTaxRegime, 'old');
  assert.equal(result.difference, 24_700);
});

test('rebate is resident-only, with no old-regime rebate marginal relief', () => {
  assert.equal(atIncome(1_200_000).new.totalTax, 0);
  assert.equal(atIncome(1_200_000, { residency: 'non-resident' }).new.totalTax, 62_400);
  assert.equal(atIncome(500_000).old.totalTax, 0);
  assert.equal(atIncome(500_000, { residency: 'non-resident' }).old.totalTax, 13_000);
  const justOverOld = atIncome(500_010).old;
  assert.equal(justOverOld.rebate, 0);
  assert.equal(justOverOld.rebateMarginalRelief, 0);
  assert.equal(justOverOld.totalTax, 13_000);
});

test('new-regime rebate marginal relief caps tax before cess at excess over ₹12 lakh', () => {
  const relief = atIncome(1_200_010).new;
  assert.equal(relief.slabTax, 60_001.5);
  assert.equal(relief.rebate, 0);
  assert.equal(relief.rebateMarginalRelief, 59_991.5);
  assert.equal(relief.taxAfterRebate, 10);
  assert.equal(relief.cess, 0.4);
  assert.equal(relief.totalTax, 10);
  const larger = atIncome(1_250_000).new;
  assert.equal(larger.rebateMarginalRelief, 17_500);
  assert.equal(larger.totalTax, 52_000);
  assert.equal(atIncome(1_270_590).new.rebateMarginalRelief, 0);
  assert.equal(atIncome(1_200_010, { residency: 'non-resident' }).new.rebateMarginalRelief, 0);
});

test('resident age thresholds affect old-regime slabs, while non-residents receive no age uplift', () => {
  assert.equal(atIncome(600_000).old.totalTax, 33_800);
  assert.equal(atIncome(600_000, { ageGroup: '60to79' }).old.totalTax, 31_200);
  assert.equal(atIncome(600_000, { ageGroup: '80plus' }).old.totalTax, 20_800);
  assert.equal(atIncome(600_000, { ageGroup: '80plus', residency: 'non-resident' }).old.totalTax, 33_800);
  assert.equal(atIncome(500_000, { ageGroup: '80plus' }).old.slabTax, 0);
  for (const ageGroup of ['under60', '60to79', '80plus']) assert.equal(atIncome(1_500_000, { ageGroup }).new.totalTax, 109_200);
});

test('new-regime surcharge marginal relief works at ₹50 lakh, ₹1 crore and ₹2 crore increases', () => {
  for (const [threshold, priorRate, nextRate] of [[5_000_000, 0, 10], [10_000_000, 10, 15], [20_000_000, 15, 25]]) {
    const at = atIncome(threshold).new;
    const over = atIncome(threshold + 10).new;
    assert.equal(at.surchargeRate, priorRate);
    assert.equal(over.surchargeRate, nextRate);
    assert.ok(over.surchargeMarginalRelief > 0);
    near(over.taxAfterRebate + over.surcharge, at.taxAfterRebate + at.surcharge + 10);
    near(over.cess, (over.taxAfterRebate + over.surcharge) * 0.04);
  }
  assert.equal(atIncome(5_000_000).new.totalTax, 1_123_200);
  assert.equal(atIncome(5_000_010).new.totalTax, 1_123_210);
  assert.equal(atIncome(10_000_000).new.totalTax, 2_951_520);
});

test('old-regime surcharge marginal relief includes the ₹5 crore increase to 37%', () => {
  for (const threshold of [5_000_000, 10_000_000, 20_000_000, 50_000_000]) {
    const at = atIncome(threshold).old;
    const over = atIncome(threshold + 10).old;
    assert.ok(over.surchargeMarginalRelief > 0);
    near(over.taxAfterRebate + over.surcharge, at.taxAfterRebate + at.surcharge + 10);
  }
  assert.equal(atIncome(60_000_000).old.surchargeRate, 37);
  assert.equal(atIncome(60_000_000).old.totalTax, 25_379_250);
  assert.equal(atIncome(60_000_000).new.surchargeRate, 25);
  assert.equal(atIncome(60_000_000).new.totalTax, 22_854_000);
});

test('rounding ignores paise before rounding taxable income and final tax to ₹10', () => {
  assert.equal(roundTen(4.99), 0);
  assert.equal(roundTen(5), 10);
  assert.equal(roundTen(14.99), 10);
  assert.equal(roundTen(15.01), 20);
  assert.equal(atIncome('1200004.99').new.taxableIncome, 1_200_000);
  assert.equal(atIncome('1200004.99').new.totalTax, 0);
  assert.equal(atIncome('1200005.00').new.taxableIncome, 1_200_010);
  assert.equal(atIncome('1200005.00').new.totalTax, 10);
});

test('strict currency input supports sensible grouping and localized numerals without coercing malformed values', () => {
  for (const input of ['1275000.50', '12,75,000.50', '1,275,000.50', '१२,७५,०००.५०', '೧೨,೭೫,೦೦೦.೫೦']) assert.equal(parseMoney(input), 127_500_050);
  for (const bad of ['', ' ', '-1', '+1', 'NaN', 'Infinity', '1e6', '1,,000', '12,34', '1 000', '1.001', '<img src=x onerror=alert(1)>', Number.NaN, Number.POSITIVE_INFINITY, -1, 1_000_000_001]) assert.throws(() => parseMoney(bad), undefined, String(bad));
});

test('unsupported cases and invalid period, profile or excessive deductions never yield a misleading total', () => {
  assert.throws(() => compare({ ...base, hasUnsupportedIncome: true }), /full tax computation/);
  assert.throws(() => compare({ ...base, period: '2024-25' }), /supported tax years/);
  assert.throws(() => compare({ ...base, residency: 'citizen' }), /resident or non-resident/);
  assert.throws(() => compare({ ...base, ageGroup: 'senior' }), /age group/);
  assert.throws(() => compare({ ...base, salary: '100', oldSalaryExemptions: '101' }), /exemptions cannot exceed/);
  assert.throws(() => compare({ ...base, salary: '100000', oldDeductions: '50001' }), /Old-regime deductions exceed/);
  assert.throws(() => compare({ ...base, salary: '100000', newDeductions: '25001' }), /New-regime deductions exceed/);
  assert.throws(() => compare({ ...base, salary: '1000000000', otherIncome: '1' }), /Combined annual income/);
});

test('slab, rebate and surcharge boundaries remain finite, reconcile and round consistently across profiles', () => {
  const boundaries = [0, 250_000, 300_000, 400_000, 500_000, 800_000, 1_000_000, 1_200_000, 1_270_590, 1_600_000, 2_000_000, 2_400_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 1_000_000_000];
  for (const ageGroup of ['under60', '60to79', '80plus']) {
    for (const residency of ['resident', 'non-resident']) {
      for (const boundary of boundaries) {
        for (const delta of [-10, 0, 10]) {
          const amount = boundary + delta;
          if (amount < 0 || amount > 1_000_000_000) continue;
          const result = atIncome(amount, { ageGroup, residency });
          for (const tax of [result.old, result.new]) {
            assert.ok(Number.isFinite(tax.totalTax) && tax.totalTax >= 0);
            assert.equal(tax.totalTax % 10, 0);
            near(tax.slabs.reduce((sum, slab) => sum + slab.tax, 0), tax.slabTax);
            near(tax.slabTax - tax.rebate - tax.rebateMarginalRelief, tax.taxAfterRebate);
            near(tax.surchargeBeforeRelief - tax.surchargeMarginalRelief, tax.surcharge);
            near(tax.taxAfterRebate + tax.surcharge + tax.cess, tax.totalBeforeRounding);
            assert.equal(roundTen(tax.totalBeforeRounding), tax.totalTax);
          }
        }
      }
    }
  }
});

test('supported periods identify the correct Acts and fixed official source links', () => {
  assert.equal(INCOME_TAX_PERIODS.find((period) => period.id === '2025-26').rebateSection, '87A');
  assert.equal(INCOME_TAX_PERIODS.find((period) => period.id === '2026-27').rebateSection, '156');
  for (const source of TOOL_SOURCES) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname.endsWith('.gov.in') || url.hostname === 'sansad.in');
  }
});
