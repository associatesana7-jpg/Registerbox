import { useId, useRef, useState } from 'react';

import {
  calculateIncomeTaxComparison,
  INCOME_TAX_PERIODS,
  type IncomeTaxComparison,
  type IncomeTaxInput,
  type IncomeTaxResult,
} from '../../lib/income-tax-calculator';

const INITIAL_INPUT: IncomeTaxInput = {
  period: '2026-27', ageGroup: 'under60', residency: 'resident', salary: '',
  otherIncome: '0', oldSalaryExemptions: '0', oldDeductions: '0', newDeductions: '0', hasUnsupportedIncome: false,
};

const rupees = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
const wholeRupees = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

function Breakdown({ result, rebateSection }: { result: IncomeTaxResult; rebateSection: string }) {
  const heading = `${result.regime === 'old' ? 'Old' : 'New'}-regime calculation`;
  return <section>
    <h3>{heading}</h3>
    <div className="tax-table-wrap">
      <table className="tax-table">
        <caption>Annual taxable income and tax under the {result.regime} regime</caption>
        <tbody>
          <tr><th scope="row">Salary / own employment pension</th><td>{rupees(result.grossSalary)}</td></tr>
          <tr><th scope="row">Other normal income</th><td>{rupees(result.otherIncome)}</td></tr>
          <tr><th scope="row">Salary exemptions entered</th><td>− {rupees(result.salaryExemptions)}</td></tr>
          <tr><th scope="row">Salary standard deduction</th><td>− {rupees(result.standardDeduction)}</td></tr>
          <tr><th scope="row">Other eligible reductions entered</th><td>− {rupees(result.otherDeductions)}</td></tr>
          <tr><th scope="row">Taxable income before rounding</th><td>{rupees(result.incomeBeforeRounding)}</td></tr>
          <tr><th scope="row">Taxable income, rounded to ₹10</th><td>{wholeRupees(result.taxableIncome)}</td></tr>
          <tr><th scope="row">Tax from slabs</th><td>{rupees(result.slabTax)}</td></tr>
          <tr><th scope="row">Rebate · section {rebateSection}</th><td>− {rupees(result.rebate)}</td></tr>
          <tr><th scope="row">Rebate marginal relief</th><td>− {rupees(result.rebateMarginalRelief)}</td></tr>
          <tr><th scope="row">Tax after rebate and rebate relief</th><td>{rupees(result.taxAfterRebate)}</td></tr>
          <tr><th scope="row">Surcharge before relief ({result.surchargeRate}%)</th><td>{rupees(result.surchargeBeforeRelief)}</td></tr>
          <tr><th scope="row">Surcharge marginal relief</th><td>− {rupees(result.surchargeMarginalRelief)}</td></tr>
          <tr><th scope="row">Surcharge after relief</th><td>{rupees(result.surcharge)}</td></tr>
          <tr><th scope="row">Health and Education Cess (4%)</th><td>{rupees(result.cess)}</td></tr>
          <tr><th scope="row">Tax and cess before final rounding</th><td>{rupees(result.totalBeforeRounding)}</td></tr>
          <tr><th scope="row">Final rounding adjustment</th><td>{rupees(result.roundingAdjustment)}</td></tr>
          <tr><th scope="row">Annual income-tax liability</th><td><strong>{wholeRupees(result.totalTax)}</strong></td></tr>
        </tbody>
      </table>
    </div>
    <details>
      <summary>See the {result.regime}-regime slab calculation</summary>
      <div className="tax-table-wrap">
        <table className="tax-table">
          <caption>{result.regime === 'old' ? 'Old' : 'New'}-regime tax before rebate, surcharge and cess</caption>
          <thead><tr><th scope="col">Income band</th><th scope="col">Rate</th><th scope="col">Income in band</th><th scope="col">Tax</th></tr></thead>
          <tbody>{result.slabs.map((slab) => <tr key={`${slab.from}-${slab.rate}`}>
            <th scope="row">{slab.from === 0 ? 'Up to' : `Above ${wholeRupees(slab.from)}${slab.to === null ? '' : ' to'}`} {slab.to === null ? '' : wholeRupees(slab.to)}</th>
            <td>{slab.rate}%</td><td>{rupees(slab.taxableAmount)}</td><td>{rupees(slab.tax)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}

export default function IncomeTaxCalculator() {
  const prefix = useId();
  const [input, setInput] = useState<IncomeTaxInput>(INITIAL_INPUT);
  const [result, setResult] = useState<IncomeTaxComparison | null>(null);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  const update = <Key extends keyof IncomeTaxInput>(key: Key, value: IncomeTaxInput[Key]) => {
    setInput((previous) => ({ ...previous, [key]: value }));
    setResult(null);
    setError('');
  };
  const moneyField = (key: 'salary' | 'otherIncome' | 'oldSalaryExemptions' | 'oldDeductions' | 'newDeductions', label: string, hint: string, placeholder?: string) => <label className="tax-field" htmlFor={`${prefix}-${key}`}>
    <span>{label}</span>
    <input id={`${prefix}-${key}`} type="text" inputMode="decimal" autoComplete="off" maxLength={24} value={input[key]} placeholder={placeholder} aria-describedby={`${prefix}-${key}-hint`} onChange={(event) => update(key, event.target.value)} />
    <small id={`${prefix}-${key}-hint`}>{hint}</small>
  </label>;

  function calculate() {
    try {
      setResult(calculateIncomeTaxComparison(input));
      setError('');
      requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : 'Check the amounts and try again.');
    }
  }

  function loadExample() {
    setInput({ ...INITIAL_INPUT, salary: '12,75,000', oldDeductions: '1,50,000' });
    setError('');
    setResult(null);
  }

  return <div>
    <div className="tax-form" role="form" aria-label="Income tax regime comparison">
      <p className="tax-note">Compare annual tax for an individual with ordinary slab-rate income. Enter income taxable in India, not your CTC. Amounts stay in this browser; the calculator makes no API requests.</p>
      <div className="tax-fields">
        <label className="tax-field" htmlFor={`${prefix}-period`}><span>Income period</span><select id={`${prefix}-period`} value={input.period} onChange={(event) => update('period', event.target.value as IncomeTaxInput['period'])}>{INCOME_TAX_PERIODS.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}</select></label>
        <label className="tax-field" htmlFor={`${prefix}-residency`}><span>Income-tax residential status</span><select id={`${prefix}-residency`} value={input.residency} onChange={(event) => update('residency', event.target.value as IncomeTaxInput['residency'])}><option value="resident">Resident in India</option><option value="non-resident">Non-resident</option></select><small>Use your tax residential status for this year, not citizenship.</small></label>
        <label className="tax-field" htmlFor={`${prefix}-age`}><span>Age reached during the income period</span><select id={`${prefix}-age`} value={input.ageGroup} onChange={(event) => update('ageGroup', event.target.value as IncomeTaxInput['ageGroup'])}><option value="under60">Below 60 years</option><option value="60to79">60 to 79 years</option><option value="80plus">80 years or more</option></select><small>The higher old-regime exemption for senior citizens is for residents only.</small></label>
        {moneyField('salary', 'Annual salary / own employment pension (₹)', 'Before the standard deduction and old-regime salary exemptions below. Include taxable allowances and perquisites; exclude family pension.', 'e.g. 12,75,000')}
        {moneyField('otherIncome', 'Other normal taxable income (₹)', 'For example, taxable bank interest or net business profit. Enter the same eligible amount under both regimes. Use 0 if none.')}
      </div>
      <details>
        <summary>Add eligible exemptions and deductions</summary>
        <p className="tax-note">Enter deductions you are entitled to after their legal limits. These fields do not check deduction eligibility. Do not subtract the standard deduction here; it is calculated automatically. If an item applies in both regimes, include its eligible amount in each relevant field.</p>
        <div className="tax-fields">
          {moneyField('oldSalaryExemptions', 'Old-regime salary exemptions (₹)', 'Eligible HRA / LTA and other salary exemptions allowed only under the old regime. These cannot exceed salary.')}
          {moneyField('oldDeductions', 'Other eligible old-regime reductions (₹)', 'Total legally allowed 80C / 80D / NPS and similar deductions, plus salary professional tax where eligible. Enter the allowable deduction, not the amount invested.')}
          {moneyField('newDeductions', 'Other eligible new-regime deductions (₹)', 'For example, eligible employer NPS contribution after its applicable limit. Personal 80C / 80D deductions are generally unavailable here.')}
        </div>
      </details>
      <label className="tax-note" htmlFor={`${prefix}-unsupported`}><input id={`${prefix}-unsupported`} type="checkbox" checked={Boolean(input.hasUnsupportedIncome)} onChange={(event) => update('hasUnsupportedIncome', event.target.checked)} /> I have capital gains, dividends, crypto, winnings, agricultural income, family pension, losses, AMT, foreign-tax relief or another special tax adjustment.</label>
      {input.hasUnsupportedIncome ? <p className="tax-note">These items need a fuller computation, so this tool will not show an incomplete tax total. Salary exemptions permitted in the new regime, or other income that differs between regimes, also need a separate calculation.</p> : null}
      <div className="tax-actions"><button className="tax-button" type="button" onClick={calculate}>Compare old and new regimes</button><button className="tax-button tax-button-secondary" type="button" onClick={loadExample}>Load salary example</button></div>
      {error ? <p className="tax-error" role="alert">{error}</p> : null}
    </div>
    {result ? <div className="tax-result" ref={resultRef} tabIndex={-1} aria-label="Income-tax comparison result">
      <p className="tax-note">{result.period.label} · {result.residency === 'resident' ? 'Resident individual' : 'Non-resident individual'} · Rules reviewed 28 October 2026.</p>
      <div className="tax-summary">
        <div><span>New-regime annual tax</span><strong>{wholeRupees(result.new.totalTax)}</strong><small>{result.new.effectiveRate.toFixed(2)}% of income entered</small></div>
        <div><span>Old-regime annual tax</span><strong>{wholeRupees(result.old.totalTax)}</strong><small>{result.old.effectiveRate.toFixed(2)}% of income entered</small></div>
        <div><span>{result.lowerTaxRegime === 'equal' ? 'Same calculated tax' : `${result.lowerTaxRegime === 'new' ? 'New' : 'Old'} regime calculates lower`}</span><strong>{wholeRupees(result.difference)}</strong><small>{result.lowerTaxRegime === 'equal' ? 'Difference for your entered amounts' : 'Less annual tax for your entered amounts'}</small></div>
      </div>
      <p className="tax-note">This compares liability before TDS and advance tax. It does not establish whether you may switch regimes or claim a deduction. Business and professional taxpayers have additional regime-election rules. Zero calculated tax does not by itself remove return-filing obligations.</p>
      <div className="tax-fields"><Breakdown result={result.new} rebateSection={result.period.rebateSection} /><Breakdown result={result.old} rebateSection={result.period.rebateSection} /></div>
      <p className="tax-note">Both taxable income and final tax are rounded to the nearest ₹10 after ignoring paise ({result.period.act}, section {result.period.roundingSection}). Intermediate rows are displayed to two decimals; final tax uses unrounded intermediate amounts. Cess is applied after rebate and surcharge relief.</p>
    </div> : null}
  </div>;
}
