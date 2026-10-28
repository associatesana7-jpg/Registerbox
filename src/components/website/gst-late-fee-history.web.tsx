import { useRef, useState } from 'react';
import { buildReturnHistory, calculateHistoryFee, emptyHistoryFacts, HISTORY_REVIEWED, type HistoryProfile, type HistoryRow, type HistoryRowFacts, type HistoryResult } from '../../lib/gst-late-fee-history';
import './gst-late-fee-history.css';

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const initial: HistoryProfile = { registered: '', asOf: HISTORY_REVIEWED, cancelled: true, effectiveCancellation: '', cancellationOrder: '', lastGstr1: '', neverGstr1: false, gstr1Frequency: 'unknown', lastGstr3b: '', neverGstr3b: false, qrmpStart: '', frequencyConfirmed: false, finalReturnFiled: false };
type Evaluated = { row: HistoryRow; facts: HistoryRowFacts; result: HistoryResult; error: string };

export default function GstLateFeeHistory() {
  const [profile, setProfile] = useState<HistoryProfile>(initial);
  const [step, setStep] = useState(1);
  const [example, setExample] = useState(false);
  const [facts, setFacts] = useState<Partial<Record<string, HistoryRowFacts>>>({});
  const [history, setHistory] = useState<ReturnType<typeof buildReturnHistory> | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [filter, setFilter] = useState('all');
  const heading = useRef<HTMLHeadingElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const patch = (value: Partial<HistoryProfile>) => { setProfile(p => ({ ...p, ...value })); setHistory(null); setFacts({}); setError(''); };
  const move = (next: number) => { setStep(next); heading.current?.focus(); };
  function loadExample() {
    setProfile({ ...initial, registered: '2017-07-01', lastGstr3b: '2018-10', effectiveCancellation: '2022-10-31', cancellationOrder: '2022-10-31' });
    setExample(true); setFacts({}); setHistory(null); setError(''); move(1);
  }
  function next() {
    try {
      if (step === 1) {
        // Validate dates without requiring a known last-filed period yet.
        buildReturnHistory({ ...profile, neverGstr1: true, neverGstr3b: true });
        move(2);
      } else {
        const nextHistory = buildReturnHistory(profile);
        setHistory(nextHistory); setSelected(nextHistory.rows[0]?.id ?? ''); move(3);
      }
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the dates and filing history.'); }
  }
  function rowFacts(row: HistoryRow): HistoryRowFacts { return { ...emptyHistoryFacts, due: row.suggestedDue, ...facts[row.id] }; }
  const evaluated: Evaluated[] = (history?.rows ?? []).map(row => {
    const f = rowFacts(row);
    try { return { row, facts: f, result: calculateHistoryFee(row, f, profile.asOf, profile.frequencyConfirmed), error: '' }; }
    catch (cause) { return { row, facts: f, result: { days: null, daily: null, cap: null, fee: null, remaining: null, filingRestricted: false, reasons: [] }, error: cause instanceof Error ? cause.message : 'Check this return.' }; }
  });
  const current = evaluated.find(item => item.row.id === selected);
  const counted = evaluated.filter(item => !item.facts.alreadyFiled), calculated = counted.filter(item => item.result.fee !== null);
  const standardTotal = calculated.reduce((sum, item) => sum + (item.result.fee ?? 0), 0);
  const updateFacts = (value: Partial<HistoryRowFacts>) => { if (current) setFacts(state => ({ ...state, [current.row.id]: { ...current.facts, ...value } })); };
  function exportCsv() {
    const header = ['Return', 'Period', 'Frequency', 'Preceding FY', 'Effective due date', 'Due date confirmed', 'Category', 'Turnover band', 'Days late', 'Normal combined fee INR', 'Earlier fee paid INR', 'Indicative balance INR', 'Filing restriction', 'Review'];
    const data = evaluated.map(item => [item.row.form, item.row.label, item.row.frequency, item.row.previousFy, item.facts.due, String(item.facts.dueConfirmed), item.facts.category, item.facts.turnover, item.result.days ?? '', item.result.fee ?? '', item.facts.paid, item.result.remaining ?? '', item.result.filingRestricted ? 'Over 3 years: check filing bar' : 'Not confirmed on portal', item.error || item.result.reasons.join(' ') || 'Normal fee only; check portal, relief, tax and interest']);
    const csv = [header, ...data].map(line => line.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'gst-pending-return-worksheet.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="gst-history">
    <div className="gst-history-intro"><h2>Missed old returns or GST was cancelled?</h2><p>Start with what you know. We’ll list the possible missing returns, then help you check each one. This is for regular taxpayers.</p><button type="button" className="tax-text-button" onClick={loadExample}>Try the October 2018 → cancellation example ↗</button></div>
    {example && <div className="tax-note gst-history-example"><strong>Example loaded.</strong> Last GSTR-3B: October 2018. Registration on 1 July 2017 and both cancellation dates on 31 October 2022 are illustrative assumptions. Replace them with the certificate and order. GSTR-1 and QRMP history are left unconfirmed.</div>}
    <ol className="gst-history-steps" aria-label="Progress">{['Business dates', 'Last filed returns', 'Check the list'].map((label, i) => <li key={label} aria-current={step === i + 1 ? 'step' : undefined}><span>{i + 1}</span>{label}</li>)}</ol>
    <h3 ref={heading} tabIndex={-1} className="gst-history-step-title">{step === 1 ? '1. When was the business registered and cancelled?' : step === 2 ? '2. What was the last return actually filed?' : '3. Review the possible missing returns'}</h3>
    {step === 1 && <>
      <div className="tax-fields"><label className="tax-field">When did GST registration take effect?<input type="date" min="2017-07-01" max={profile.asOf} value={profile.registered} onChange={e => patch({ registered: e.target.value })}/><small>Use the effective registration date on the GST certificate, not when you first started the business.</small></label><label className="tax-field">Calculate up to which date?<input type="date" min={profile.registered || '2017-07-01'} max={HISTORY_REVIEWED} value={profile.asOf} onChange={e => patch({ asOf: e.target.value })}/><small>For unfiled returns, this is the estimate date.</small></label></div>
      <label className="tax-field">Has this GST registration been cancelled?<select value={profile.cancelled ? 'yes' : 'no'} onChange={e => patch({ cancelled: e.target.value === 'yes' })}><option value="yes">Yes — including cancellation by the GST officer</option><option value="no">No — still registered</option></select></label>
      {profile.cancelled && <><div className="tax-fields"><label className="tax-field">Cancelled with effect from which date?<input type="date" min={profile.registered || '2017-07-01'} max={profile.asOf} value={profile.effectiveCancellation} onChange={e => patch({ effectiveCancellation: e.target.value })}/><small>In REG-19, look for “with effect from”. This decides where the return history ends.</small></label><label className="tax-field">What is the date of the cancellation order?<input type="date" min="2017-07-01" max={profile.asOf} value={profile.cancellationOrder} onChange={e => patch({ cancellationOrder: e.target.value })}/><small>The date the officer issued the order. It can differ from “with effect from”.</small></label></div><p className="tax-note">Suo motu cancellation means the department cancelled registration. It does not tell us these two dates or remove earlier obligations. If you do not know the effective date, check the order before continuing.</p></>}
    </>}
    {step === 2 && <>
      <p className="tax-note">Use the <strong>tax period</strong> on the filed return or GST return dashboard. A return submitted in October may relate to September. GSTR-1 and GSTR-3B can have different last-filed periods.</p>
      <label className="tax-field"><span><input type="checkbox" checked={profile.neverGstr3b} onChange={e => patch({ neverGstr3b: e.target.checked })}/> No GSTR-3B has ever been filed</span></label>
      {!profile.neverGstr3b && <label className="tax-field">Last GSTR-3B tax period filed<input type="month" min={profile.registered.slice(0, 7)} max={(profile.cancelled ? profile.effectiveCancellation : profile.asOf).slice(0, 7)} value={profile.lastGstr3b} onChange={e => patch({ lastGstr3b: e.target.value })}/><small>For your example, choose <strong>October 2018</strong>. If a quarterly GSTR-3B was filed after 2021, choose its quarter-ending month.</small></label>}
      <label className="tax-field">From January 2021, how were GSTR-1 and GSTR-3B filed?<select value={!profile.frequencyConfirmed ? 'unknown' : profile.qrmpStart ? 'qrmp' : 'monthly'} onChange={e => patch({ frequencyConfirmed: e.target.value !== 'unknown', qrmpStart: e.target.value === 'qrmp' ? '2021-01' : '' })}><option value="unknown">I’m not sure — prepare a draft monthly list</option><option value="monthly">Both monthly — I checked the GST history</option><option value="qrmp">Both quarterly under QRMP, from a verified quarter</option></select><small>GSTR-3B was monthly before January 2021. From January 2021, this list makes both forms monthly until a verified QRMP start. Earlier quarterly GSTR-1 does not continue automatically.</small></label>
      {profile.qrmpStart && <label className="tax-field">Which quarter did QRMP start?<input type="month" min="2021-01" max={(profile.cancelled ? profile.effectiveCancellation : profile.asOf).slice(0, 7)} value={profile.qrmpStart} onChange={e => patch({ qrmpStart: e.target.value })}/><small>Choose January, April, July or October. Check Services → Returns → Opt-in for Quarterly Return on the GST portal. Multiple switches need a separate period review.</small></label>}
      <fieldset className="gst-history-subform"><legend>GSTR-1 — check separately</legend><label className="tax-field">{profile.registered < '2021-01-01' ? 'Before January 2021, how was GSTR-1 filed?' : 'Do you know the GSTR-1 filing history?'}<select value={profile.gstr1Frequency} onChange={e => patch({ gstr1Frequency: e.target.value as HistoryProfile['gstr1Frequency'] })}><option value="unknown">I don’t know yet — leave GSTR-1 out for now</option>{profile.registered < '2021-01-01' && <option value="quarterly">Every quarter before January 2021</option>}<option value="monthly">{profile.registered < '2021-01-01' ? 'Every month before January 2021' : 'Yes — include GSTR-1 using the frequency above'}</option></select><small>The earlier GSTR-1 choice is separate from QRMP. From January 2021, the frequency selected above applies to both forms.</small></label>{profile.gstr1Frequency !== 'unknown' && <><label className="tax-field"><span><input type="checkbox" checked={profile.neverGstr1} onChange={e => patch({ neverGstr1: e.target.checked })}/> No GSTR-1 has ever been filed</span></label>{!profile.neverGstr1 && <label className="tax-field">Last GSTR-1 period actually filed<input type="month" min={profile.registered.slice(0, 7)} max={(profile.cancelled ? profile.effectiveCancellation : profile.asOf).slice(0, 7)} value={profile.lastGstr1} onChange={e => patch({ lastGstr1: e.target.value })}/><small>For a period filed quarterly, choose March, June, September or December, or the verified final partial period. Monthly filing can end in any month. “October 2018” alone does not identify a GSTR-1 quarter.</small></label>}</>}</fieldset>
      {profile.cancelled && <label className="tax-field"><span><input type="checkbox" checked={profile.finalReturnFiled} onChange={e => patch({ finalReturnFiled: e.target.checked })}/> The final GSTR-10 return has already been filed</span><small>Leave unchecked if it still needs to be checked; the list will include it.</small></label>}
    </>}
    {step === 3 && history && <>
      {history.notes.map(note => <p className="tax-error" key={note}>{note}</p>)}
      <div className="gst-history-metrics"><div><span>Possible returns in this list</span><strong>{counted.length}</strong><small>Verify against the GST portal</small></div><div><span>Returns with enough fee facts</span><strong>{calculated.length} / {counted.length}</strong><small>Unknown facts are not treated as zero</small></div><div><span>Normal fee for checked rows only</span><strong>{calculated.length ? money(standardTotal) : 'Check rows first'}</strong><small>Not the final payable amount</small></div></div>
      <p className="tax-note">For this example, the first possible missing GSTR-3B after October 2018 is November 2018. The count changes if QRMP applied. Open a row and enter the <strong>actual notified due date</strong>; historical extensions and relief mean a usual calendar date is not enough.</p>
      <div className="tax-actions"><label className="tax-field">Show returns<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All returns</option><option value="GSTR-3B">GSTR-3B</option><option value="GSTR-1">GSTR-1</option><option value="GSTR-10">GSTR-10</option></select></label><button type="button" className="tax-button tax-secondary" onClick={exportCsv}>Download review worksheet (CSV)</button></div>
      <div className="tax-table-wrap"><table className="tax-table"><caption>Possible missing returns. Select a row to check its facts.</caption><thead><tr><th>Return / period</th><th>Normal fee</th><th>Review status</th><th>Action</th></tr></thead><tbody>{evaluated.filter(item => filter === 'all' || item.row.form === filter).map(item => <tr key={item.row.id} aria-selected={selected === item.row.id}><td><strong>{item.row.form}</strong><small>{item.row.label} · {item.row.frequency}</small></td><td>{item.result.fee === null ? 'Not calculated' : money(item.result.fee)}</td><td>{item.facts.alreadyFiled ? 'Excluded: already filed' : item.error ? 'Check inputs' : item.result.filingRestricted ? 'Over 3 years — filing restriction review' : item.result.reasons[0] || 'Normal fee calculated; verify portal'}</td><td><button type="button" className="tax-text-button" aria-label={`Check ${item.row.form} ${item.row.label}`} onClick={() => { setSelected(item.row.id); editor.current?.focus(); editor.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }}>Check row ↗</button></td></tr>)}</tbody></table></div>
      {current && <div ref={editor} tabIndex={-1} className="tax-result gst-history-editor"><span className="tax-eyebrow">RETURN DETAILS</span><h3>{current.row.form} · {current.row.label}</h3><label className="tax-field"><span><input type="checkbox" checked={current.facts.alreadyFiled} onChange={e => updateFacts({ alreadyFiled: e.target.checked })}/> This return is already filed — exclude it from the list</span></label>
        {!current.facts.alreadyFiled && <>
          {current.row.review.map(note => <p className="tax-note" key={note}>{note}</p>)}
          {current.row.review.length > 0 && <label className="tax-field"><span><input type="checkbox" checked={current.facts.periodConfirmed} onChange={e => updateFacts({ periodConfirmed: e.target.checked })}/> I checked that this tax period is required and the period dates are correct</span></label>}
          <label className="tax-field">Effective notified due date<input type="date" min={current.row.earliestDue} value={current.facts.due} onChange={e => updateFacts({ due: e.target.value, dueConfirmed: false })}/><small>{current.row.form === 'GSTR-10' ? 'Three calendar months after the later cancellation/order date is suggested. Confirm an applicable extension or relief.' : 'Use the due date legally applicable to this period, state and taxpayer class, including notified extensions.'}</small></label>
          <label className="tax-field"><span><input type="checkbox" checked={current.facts.dueConfirmed} onChange={e => updateFacts({ dueConfirmed: e.target.checked })}/> I checked this due date against the applicable notification</span></label>
          {current.row.form !== 'GSTR-10' && <div className="tax-fields"><label className="tax-field">Which fee category applies?<select value={current.facts.category} onChange={e => updateFacts({ category: e.target.value as HistoryRowFacts['category'] })}><option value="unknown">Not checked yet</option><option value="nil">Applicable nil category — checked</option><option value="other">Other than the nil category</option></select><small>{current.row.form === 'GSTR-1' ? 'Nil means no outward supplies, including exempt or zero-rated supplies.' : 'Nil central-tax-payable category under the notification; zero cash paid after ITC alone is not sufficient.'}</small></label><label className="tax-field">Preceding FY {current.row.previousFy} aggregate turnover<select value={current.facts.turnover} onChange={e => updateFacts({ turnover: e.target.value as HistoryRowFacts['turnover'] })}><option value="unknown">Not checked yet</option><option value="up-to-1.5cr">Up to ₹1.5 crore</option><option value="1.5-to-5cr">Above ₹1.5 crore, up to ₹5 crore</option><option value="above-5cr">Above ₹5 crore</option></select><small>All-India aggregate turnover for the preceding financial year. Relevant for non-nil caps from June 2021.</small></label></div>}
          <label className="tax-field"><span><input type="checkbox" checked={current.facts.relief} onChange={e => updateFacts({ relief: e.target.checked })}/> A waiver, amnesty, court order or other relief may apply</span><small>Old amnesties had filing windows. They cannot automatically be applied to a return filed today.</small></label>
          <label className="tax-field">Late fee already paid for this return (₹)<input inputMode="decimal" value={current.facts.paid} onChange={e => updateFacts({ paid: e.target.value })} maxLength={15}/><small>Use the ledger for this return only. An excess is not an automatic refund.</small></label>
          {current.error && <p className="tax-error" role="alert">{current.error}</p>}
          {current.result.filingRestricted && <p className="tax-error"><strong>Three-year filing restriction needs review.</strong> This date is more than three years after the entered due date. Check current portal restrictions and any lawful exception with the jurisdictional officer or adviser. The normal fee below does not mean the return can be filed.</p>}
          {current.result.reasons.length > 0 ? <ul className="tax-note">{current.result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul> : current.result.fee !== null && <><div className="tax-summary"><span>Indicative normal combined fee</span><strong>{money(current.result.fee)}</strong></div><p className="tax-note">{current.result.days} days × {money(current.result.daily ?? 0)}, capped at {money(current.result.cap ?? 0)}. CGST {money(current.result.fee / 2)} + State/UT {money(current.result.fee / 2)}. After the fee already paid: {money(current.result.remaining ?? 0)}. Verify matching State/UT provisions and actual portal entries.</p></>}
        </>}
      </div>}
      <p className="tax-note">This worksheet assumes one continuous regular-taxpayer registration and at most one switch to QRMP. It does not calculate tax, payment interest, stock/ITC reversal on cancellation, penalties, demands or GSTR-9 fees. Multiple filing-frequency switches, restoration or composition changes need separate review.</p>
    </>}
    {error && <p className="tax-error" role="alert">{error}</p>}
    <div className="tax-actions">{step > 1 && <button type="button" className="tax-button tax-secondary" onClick={() => { setError(''); move(step - 1); }}>← Back</button>}{step < 3 && <button type="button" className="tax-button" onClick={next}>{step === 1 ? 'Next: last filed returns →' : 'Build my return checklist →'}</button>}</div>
  </div>;
}
