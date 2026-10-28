import React, { useState } from 'react';
import { calculateTds, TDS_KINDS, type TdsInput, type TdsKind, type TdsResult, type TdsYear } from '../../lib/tds-calculator';

const rupees = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
function readAmount(text: string, label: string): number {
  const cleaned = text.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(cleaned)) throw new Error(`Enter ${label} in rupees, using digits and no more than two decimal places.`);
  return Number(cleaned.replaceAll(',', ''));
}
type Fields = { year: TdsYear; kind: TdsKind; payer: TdsInput['payer']; recipient: TdsInput['recipient']; amount: string; previous: string; expected: string; priorTds: string; monthly: string; lastMonth: string; stamp: string; pan: boolean; senior: boolean; resident: boolean; special: boolean };
const initial: Fields = { year: '2026-27', kind: 'professional', payer: 'entity', recipient: 'individual-huf', amount: '', previous: '0', expected: '', priorTds: '0', monthly: '', lastMonth: '', stamp: '', pan: true, senior: false, resident: true, special: false };

export default function TdsCalculator() {
  const [fields, setFields] = useState(initial);
  const [result, setResult] = useState<TdsResult | null>(null);
  const [error, setError] = useState('');
  function update<K extends keyof Fields>(key: K, value: Fields[K]) { setFields((current) => ({ ...current, [key]: value })); setResult(null); setError(''); }
  const property = fields.kind === 'property';
  const rent = fields.kind.startsWith('rent-');
  const smallTenant = fields.payer === 'other-individual' && fields.kind === 'rent-building';
  const combinedSmallPayer = fields.payer === 'other-individual' && ['contractor', 'professional', 'commission'].includes(fields.kind);
  const annual = !rent && !property;
  function calculate() {
    try {
      const currentAmount = readAmount(fields.amount, property ? 'the whole property consideration' : smallTenant ? 'total rent for the year' : 'the current amount');
      setResult(calculateTds({ year: fields.year, kind: fields.kind, payer: fields.payer, recipient: fields.recipient, currentAmount, previousAmount: annual ? readAmount(fields.previous, 'previous payments') : 0, expectedAnnualAmount: annual && fields.expected.trim() ? readAmount(fields.expected, 'expected annual payments') : undefined, previousTds: annual ? readAmount(fields.priorTds, 'TDS already deducted') : 0, panProvided: fields.pan, seniorCitizen: fields.senior, resident: fields.resident, specialCase: fields.special, monthlyRent: smallTenant ? readAmount(fields.monthly, 'highest monthly rent') : undefined, lastMonthRent: smallTenant ? readAmount(fields.lastMonth, 'final month rent') : undefined, stampDutyValue: property ? readAmount(fields.stamp, 'the stamp-duty value') : undefined }));
      setError('');
    } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : 'Check the entered amounts.'); }
  }
  return <div className="tax-form" role="form" aria-label="Resident non-salary TDS calculator">
    <div className="tax-fields">
      <label className="tax-field">Financial / tax year<select value={fields.year} onChange={(event) => update('year', event.target.value as TdsYear)}><option value="2026-27">2026–27 · Income-tax Act 2025</option><option value="2025-26">2025–26 · Income-tax Act 1961</option></select><small>Use the year of the earlier credit or payment event.</small></label>
      <label className="tax-field">What is the payment for?<select value={fields.kind} onChange={(event) => update('kind', event.target.value as TdsKind)}>{TDS_KINDS.map((kind) => <option value={kind.value} key={kind.value}>{kind.label}</option>)}</select></label>
      {!property && fields.kind !== 'interest-bank' && <label className="tax-field">Who is paying?<select value={fields.payer} onChange={(event) => update('payer', event.target.value as Fields['payer'])}><option value="entity">Company, LLP, firm, trust or other eligible organisation</option><option value="eligible-individual">Individual/HUF above the preceding-year turnover test</option><option value="other-individual">Other individual/HUF, including a salaried tenant</option></select><small>Individual/HUF turnover test: preceding-year business sales over ₹1 crore OR professional receipts over ₹50 lakh. Contractor payers must also meet the designated-person definition.</small></label>}
      {fields.kind === 'contractor' && <label className="tax-field">Contractor type<select value={fields.recipient} onChange={(event) => update('recipient', event.target.value as Fields['recipient'])}><option value="individual-huf">Individual or HUF</option><option value="other">Company, firm, LLP or other</option></select></label>}
      <label className="tax-field">{property ? 'Whole property consideration (₹)' : smallTenant ? 'Total rent for this tax year / tenancy (₹)' : rent ? 'Rent for this month or part-month (₹)' : 'Current payment / credit (₹)'}<input inputMode="decimal" type="text" value={fields.amount} onChange={(event) => update('amount', event.target.value)} placeholder={property ? '60,00,000' : '1,00,000'} maxLength={24}/><small>{property ? 'Include incidental transfer charges and all buyers’/sellers’ shares. Whole transaction only; no instalment allocation.' : 'Enter the TDS base. For services, exclude GST only where separately stated under the agreement/invoice. Add that GST separately when paying.'}</small></label>
      {annual && <>
        <label className="tax-field">Earlier payments / credits to this payee this year (₹)<input inputMode="decimal" type="text" value={fields.previous} onChange={(event) => update('previous', event.target.value)} maxLength={24}/><small>{combinedSmallPayer ? 'Combine all covered contractor, professional and non-insurance commission/brokerage payments to this same resident; exclude the current amount. The ₹50 lakh test is shared across these categories.' : 'Same payment category only, excluding the current amount.'}</small></label>
        <label className="tax-field">Expected total for this payee this year (₹, optional)<input inputMode="decimal" type="text" value={fields.expected} onChange={(event) => update('expected', event.target.value)} placeholder="Include earlier + current + expected future" maxLength={24}/><small>{combinedSmallPayer ? 'Include all covered contractor, professional and commission/brokerage categories in this same-payee total. ' : ''}Known future payments can trigger an annual threshold earlier. Blank means only the entered amounts are considered.</small></label>
        <label className="tax-field">TDS already deducted on those earlier payments (₹)<input inputMode="decimal" type="text" value={fields.priorTds} onChange={(event) => update('priorTds', event.target.value)} maxLength={24}/><small>{combinedSmallPayer ? 'Include earlier TDS for all those covered categories under this provision. ' : ''}Used to calculate a cumulative catch-up where the annual threshold applies.</small></label>
      </>}
      {smallTenant && <>
        <label className="tax-field">Highest rent for a month / part-month (₹)<input inputMode="decimal" type="text" value={fields.monthly} onChange={(event) => update('monthly', event.target.value)} maxLength={24}/></label>
        <label className="tax-field">Rent for the final month of year / tenancy (₹)<input inputMode="decimal" type="text" value={fields.lastMonth} onChange={(event) => update('lastMonth', event.target.value)} maxLength={24}/><small>Needed for the missing-PAN deduction cap.</small></label>
      </>}
      {property && <label className="tax-field">Whole property stamp-duty value (₹)<input inputMode="decimal" type="text" value={fields.stamp} onChange={(event) => update('stamp', event.target.value)} placeholder="60,00,000" maxLength={24}/></label>}
    </div>
    <label className="tax-field"><span><input type="checkbox" checked={fields.pan} onChange={(event) => update('pan', event.target.checked)}/> The payee has furnished a valid, operative PAN</span><small>Only the status is used. Do not enter a PAN number.</small></label>
    {fields.kind === 'interest-bank' && <label className="tax-field"><span><input type="checkbox" checked={fields.senior} onChange={(event) => update('senior', event.target.checked)}/> Payee is a resident individual aged 60 or more during this year</span></label>}
    <label className="tax-field"><span><input type="checkbox" checked={fields.resident} onChange={(event) => update('resident', event.target.checked)}/> The payee / property seller is resident in India for income-tax purposes</span></label>
    <label className="tax-field"><span><input type="checkbox" checked={fields.special} onChange={(event) => update('special', event.target.checked)}/> A lower/nil certificate, interest declaration, exemption, personal-purpose exclusion, gross-up or special condition may apply</span><small>If selected, the tool explains the review needed instead of asserting a standard TDS amount.</small></label>
    <button className="tax-button" type="button" onClick={calculate}>Calculate TDS</button>
    {error && <p className="tax-error" role="alert">{error}</p>}
    {result && <section className="tax-result" aria-live="polite" aria-label="TDS result">
      {result.status === 'review' ? <><h2>Review the payment conditions</h2><p>{result.explanation}</p></> : <>
        <div className="tax-summary"><span>{property ? 'Total property TDS' : smallTenant ? 'TDS to deduct in the final month' : 'TDS to deduct now'}</span><strong>{rupees(result.tdsNow ?? 0)}</strong></div>
        <p>{result.explanation}</p>
        <dl className="tax-fields"><div><dt>Applicable provision</dt><dd>{result.section}{fields.year === '2026-27' ? ` · legacy ${result.legacySection}` : ''}</dd></div><div><dt>Threshold test</dt><dd>{result.threshold}</dd></div><div><dt>Rate when triggered</dt><dd>{result.appliedRate}%{!fields.pan ? ' · missing/invalid PAN' : ''}</dd></div><div><dt>Base used</dt><dd>{rupees(result.taxableBase)}</dd></div>{result.previousTdsUsed > 0 && <div><dt>Earlier TDS used</dt><dd>{rupees(result.previousTdsUsed)}</dd></div>}{result.netCurrentPayment !== null && result.netCurrentPayment >= 0 && <div><dt>Entered amount after TDS</dt><dd>{rupees(result.netCurrentPayment)} · add separately billed GST, if any</dd></div>}</dl>
      </>}
      <details className="tax-note"><summary>Calculation conditions and exceptions</summary><ul>{result.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>
    </section>}
    <p className="tax-note">Covers selected resident non-salary payments for 2025–26 and 2026–27. Salary, non-resident payments, insurance commission, securities interest, director fees, goods purchases, crypto and special certificates need their own rules. Calculation is local and does not verify PAN, file a statement or pay tax.</p>
  </div>;
}
