import React, { useState } from 'react';
import { calculateGstLateFee, GST_LATE_FEE_REVIEWED, type GstLateFeeInput, type GstLateFeeResult } from '../../lib/gst-late-fee-calculator';
import GstLateFeeHistory from './gst-late-fee-history.web';
import GstLateFeeRange from './gst-late-fee-range.web';

const rupees = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
function SingleGstLateFeeCalculator() {
  const [returnType, setReturnType] = useState<GstLateFeeInput['returnType']>('GSTR-3B');
  const [frequency, setFrequency] = useState<GstLateFeeInput['frequency']>('monthly');
  const [period, setPeriod] = useState('');
  const [due, setDue] = useState('');
  const [filed, setFiled] = useState('');
  const [turnover, setTurnover] = useState('');
  const [nil, setNil] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [concession, setConcession] = useState(false);
  const [result, setResult] = useState<GstLateFeeResult | null>(null);
  const [error, setError] = useState('');
  function clear() { setResult(null); setError(''); }
  function calculate() {
    try {
      if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(turnover.trim())) throw new Error('Enter the preceding financial year’s aggregate turnover in rupees, with no more than two decimal places.');
      setResult(calculateGstLateFee({ returnType, frequency, taxPeriod: period, effectiveDueDate: due, filingDate: filed, previousFyTurnover: Number(turnover.replaceAll(',', '')), nilCategory: nil, dueDateConfirmed: confirmed, concessionApplies: concession }));
      setError('');
    } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : 'Check the return and dates.'); }
  }
  return <div className="tax-form" role="form" aria-label="GST return late fee calculator">
    <div className="tax-fields">
      <label className="tax-field">Return<select value={returnType} onChange={(event) => { setReturnType(event.target.value as GstLateFeeInput['returnType']); setNil(false); clear(); }}><option value="GSTR-3B">GSTR-3B</option><option value="GSTR-1">GSTR-1</option></select></label>
      <label className="tax-field">Filing frequency<select value={frequency} onChange={(event) => { setFrequency(event.target.value as GstLateFeeInput['frequency']); clear(); }}><option value="monthly">Monthly</option><option value="quarterly">Quarterly / QRMP</option></select></label>
      <label className="tax-field">{frequency === 'quarterly' ? 'Quarter-ending month' : 'Tax period'}<input type="month" min="2021-06" max={GST_LATE_FEE_REVIEWED.slice(0, 7)} value={period} onChange={(event) => { setPeriod(event.target.value); clear(); }}/><small>{frequency === 'quarterly' ? 'Choose March, June, September or December. Covers the quarter ending June 2021 onward.' : 'Covers June 2021 onward, up to the rules review month.'}</small></label>
      <label className="tax-field">Effective notified due date<input type="date" min="2021-07-01" value={due} onChange={(event) => { setDue(event.target.value); clear(); }}/><small>Check your period, State/UT and taxpayer class. Include an applicable notified extension.</small></label>
      <label className="tax-field">Actual / planned filing date<input type="date" min="2021-06-30" value={filed} onChange={(event) => { setFiled(event.target.value); clear(); }}/><small>For an unfiled return, use the date up to which you want the estimate.</small></label>
      <label className="tax-field">Preceding financial year’s aggregate turnover (₹)<input inputMode="decimal" type="text" value={turnover} onChange={(event) => { setTurnover(event.target.value); clear(); }} placeholder="25,00,000" maxLength={24}/><small>All-India aggregate turnover for the previous financial year, not only this return period.</small></label>
    </div>
    <label className="tax-field"><span><input type="checkbox" checked={nil} onChange={(event) => { setNil(event.target.checked); clear(); }}/>{returnType === 'GSTR-1' ? ' No outward supplies in this period' : ' Total central tax payable in this return is nil'}</span><small>{returnType === 'GSTR-1' ? 'Do not select this if there are exempt, nil-rated or zero-rated outward supplies.' : 'Confirm the notification’s nil-tax-payable category. Zero cash paid after ITC is not enough to decide this.'}</small></label>
    <label className="tax-field"><span><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); clear(); }}/> I have checked the effective due date, including any applicable extension</span></label>
    <label className="tax-field"><span><input type="checkbox" checked={concession} onChange={(event) => { setConcession(event.target.checked); clear(); }}/> A special waiver, amnesty, court order or other concession may apply</span><small>A concession needs its own eligibility check; the tool will not assume a payable amount.</small></label>
    <button type="button" className="tax-button" onClick={calculate}>Calculate GST late fee</button>
    {error && <p className="tax-error" role="alert">{error}</p>}
    {result && <section className="tax-result" aria-live="polite" aria-label="GST late fee result">
      {result.status === 'review' ? <><h2>Check the due date or concession</h2><p>{result.explanation}</p></> : <>
        <div className="tax-summary"><span>Standard combined late fee</span><strong>{rupees(result.combinedLateFee ?? 0)}</strong></div><p>{result.explanation}</p>
        <dl className="tax-fields"><div><dt>Days late</dt><dd>{result.daysLate}</dd></div><div><dt>Daily fee · CGST + State/UT</dt><dd>{rupees(result.dailyCombined)}</dd></div><div><dt>Maximum combined fee</dt><dd>{rupees(result.capCombined)}</dd></div><div><dt>CGST late fee</dt><dd>{rupees(result.cgstLateFee ?? 0)}</dd></div><div><dt>State/UT late fee</dt><dd>{rupees(result.stateUtLateFee ?? 0)}</dd></div><div><dt>Interest and tax</dt><dd>Separate; not included</dd></div></dl>
      </>}
      <details className="tax-note"><summary>Dates, nil category and relief conditions</summary><ul>{result.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>
    </section>}
    <p className="tax-note">This free calculation runs on your device. No GSTIN, login, government API or payment is needed. Standard rules reviewed 28 October 2026; actual portal liability can differ when a special notification applies.</p>
  </div>;
}

export default function GstLateFeeCalculator() {
  const [mode, setMode] = useState<'range' | 'history' | 'single'>('range');
  return <><div className="gst-late-fee-mode" aria-label="Choose a late-fee calculation"><button type="button" aria-pressed={mode === 'range'} onClick={() => setMode('range')}>Calculate my missed months together</button><button type="button" aria-pressed={mode === 'history'} onClick={() => setMode('history')}>GST was cancelled / check filing history</button></div>{mode === 'range' ? <GstLateFeeRange/> : mode === 'history' ? <GstLateFeeHistory/> : <SingleGstLateFeeCalculator/>}<details className="tax-note" style={{marginTop:24}}><summary>Need a precise calculation for just one recent return?</summary><button type="button" className="tax-text-button" onClick={() => setMode('single')}>Open single-return calculator</button></details></>;
}
