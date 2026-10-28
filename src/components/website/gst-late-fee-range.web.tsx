import { useRef, useState } from 'react';
import { calculateGstLateFeeRange } from '../../lib/gst-late-fee-range';
import { GST_STATES } from '../../lib/ca-gst-tools';
import './gst-late-fee-history.css';

type Input = Parameters<typeof calculateGstLateFeeRange>[0];
type Result = ReturnType<typeof calculateGstLateFeeRange>;
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
function followingMonth(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Choose the tax month and year.');
  const [y, m] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
}

export default function GstLateFeeRange() {
  const [startMode, setStartMode] = useState<'first-missed' | 'last-filed'>('first-missed');
  const [start, setStart] = useState('');
  const [last, setLast] = useState('');
  const [filing, setFiling] = useState(() => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`; });
  const [frequency, setFrequency] = useState<'monthly' | 'qrmp'>('monthly');
  const [qrmp, setQrmp] = useState('2021-01');
  const [earlierGstr1, setEarlierGstr1] = useState<'' | 'monthly' | 'quarterly'>('');
  const [state, setState] = useState('29');
  const [nil, setNil] = useState<'' | 'nil' | 'other'>('');
  const [turnover, setTurnover] = useState<Input['turnover'] | ''>('');
  const [overrides, setOverrides] = useState<NonNullable<Input['overrides']>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [inputUsed, setInputUsed] = useState<Input | null>(null);
  const [error, setError] = useState('');
  const output = useRef<HTMLElement>(null);
  const clear = () => { setResult(null); setOverrides({}); setInputUsed(null); setError(''); };
  function run() {
    try {
      if (!nil) throw new Error('Choose whether these returns qualify for nil late fee or the other category.');
      if (!turnover) throw new Error('Choose the preceding financial year’s turnover band, including for nil returns.');
      const firstPeriod = startMode === 'last-filed' ? followingMonth(start) : start;
      if (firstPeriod && firstPeriod < '2021-01' && !earlierGstr1) throw new Error('Choose whether GSTR-1 was monthly or quarterly before January 2021.');
      const input: Input = { firstPeriod, lastPeriod: last, filingDate: filing, gstr1Frequency: earlierGstr1 || 'monthly', qrmpStart: frequency === 'qrmp' ? qrmp : '', state, nilCategory: nil, turnover, overrides };
      setResult(calculateGstLateFeeRange(input)); setInputUsed(input); setError('');
      setTimeout(() => output.current?.focus(), 0);
    } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : 'Check the periods and filing details.'); }
  }
  function updateRow(id: string, change: NonNullable<Input['overrides']>[string]) {
    if (!inputUsed) return;
    const next = { ...overrides, [id]: { ...overrides[id], ...change } };
    setOverrides(next);
    try { setResult(calculateGstLateFeeRange({ ...inputUsed, overrides: next })); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the return correction.'); }
  }
  function example() {
    clear(); setStartMode('first-missed'); setStart('2026-01'); setLast('2026-10'); setFiling('2026-10-29'); setFrequency('monthly'); setNil('nil'); setTurnover('up-to-1.5cr');
  }
  function download() {
    if (!result || error) return;
    const lines = [['Return','Tax period','Due date','Days late','Daily fee INR','Maximum combined fee INR','Combined normal fee INR','CGST INR','SGST/UTGST INR','Status'], ...result.rows.map(row => [row.form,row.label,row.dueDate,row.daysLate,row.daily,row.cap ?? '',row.fee ?? '',row.cgst ?? '',row.sgst ?? '',row.status]), ['GSTR-1 total','','','','','',result.totals.gstr1],['GSTR-3B total','','','','','',result.totals.gstr3b],['Combined total','','','','','',result.totals.combined,result.totals.cgst,result.totals.sgst]];
    const csv = lines.map(line => line.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF',csv], { type:'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href=url; link.download='gst-late-fee-by-period.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="gst-range tax-form">
    <div className="gst-history-intro"><h2>Calculate all your missed returns together.</h2><p>Choose the tax periods you missed. We’ll work out the ordinary due dates and show GSTR-1, GSTR-3B and their combined late fee.</p><button className="tax-text-button" type="button" onClick={example}>Try January–October 2026, monthly nil returns ↗</button></div>
    <fieldset className="gst-range-section"><legend><span>1</span> Which tax periods did you miss?</legend>
      <div className="tax-pills" aria-label="How to choose the first missing month"><button type="button" aria-pressed={startMode==='first-missed'} onClick={()=>{clear();setStartMode('first-missed');}}>I know the first missed month</button><button type="button" aria-pressed={startMode==='last-filed'} onClick={()=>{clear();setStartMode('last-filed');}}>I know the last month I filed</button></div>
      <div className="tax-fields"><label className="tax-field">{startMode==='first-missed'?'First tax month not filed':'Last tax month already filed'}<input type="month" min="2017-07" value={start} onChange={e=>{clear();setStart(e.target.value);}}/><small>{startMode==='first-missed'?'If January’s return is missing, choose January.':'If the return FOR January is filed, choose January. The calculation starts with February.'}</small></label><label className="tax-field">Last missed tax month to include<input type="month" min={start||'2017-07'} value={last} onChange={e=>{clear();setLast(e.target.value);}}/><small>For a gap through October, choose October. A period that is not yet due has no late fee as of the date below.</small></label></div>
      <p className="tax-note"><strong>Tax month ≠ submission month.</strong> A January return is normally submitted in February. If you clicked “File” in January, check which tax period that return covered.</p>
      <label className="tax-field">When will you file these returns?<input type="date" min="2017-07-01" max="2100-12-31" value={filing} onChange={e=>{clear();setFiling(e.target.value);}}/><small>Use today to estimate the fee now, or a planned date. Future estimates assume the reviewed normal rules continue.</small></label>
    </fieldset>
    <fieldset className="gst-range-section"><legend><span>2</span> How are the returns filed?</legend>
      <label className="tax-field">Filing frequency from January 2021 onward<select value={frequency} onChange={e=>{clear();setFrequency(e.target.value as typeof frequency);}}><option value="monthly">Monthly — GSTR-1 and GSTR-3B</option><option value="qrmp">Quarterly under QRMP</option></select></label>
      {frequency==='qrmp'&&<label className="tax-field">First quarter under QRMP<input type="month" min="2021-01" value={qrmp} onChange={e=>{clear();setQrmp(e.target.value);}}/><small>Choose the verified January, April, July or October start. Before that, GSTR-3B stays monthly. QRMP did not exist before January 2021.</small></label>}
      {start && start < '2021-01' && <label className="tax-field">Before January 2021, how was GSTR-1 filed?<select value={earlierGstr1} onChange={e=>{clear();setEarlierGstr1(e.target.value as typeof earlierGstr1);}}><option value="">Choose the earlier GSTR-1 frequency</option><option value="monthly">Monthly GSTR-1</option><option value="quarterly">Quarterly GSTR-1</option></select><small>GSTR-3B stays monthly before QRMP. From January 2021, GSTR-1 is monthly unless you enter a verified QRMP start. The tool supports one switch into QRMP; use the history worksheet for other changes.</small></label>}
      <label className="tax-field">Business State / Union territory<select value={state} onChange={e=>{clear();setState(e.target.value);}}>{GST_STATES.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select><small>Needed to select the ordinary GSTR-3B due date where the State group matters.</small></label>
    </fieldset>
    <fieldset className="gst-range-section"><legend><span>3</span> Which late-fee category applies?</legend>
      <label className="tax-field">For the returns in this gap<select value={nil} onChange={e=>{clear();setNil(e.target.value as typeof nil);}}><option value="">Choose a category</option><option value="nil">All qualify for the nil late-fee category</option><option value="other">Other than nil / there was business activity</option></select><small>You can correct individual rows after calculating. GSTR-1 nil means no outward supplies, including exempt/zero-rated supplies. For GSTR-3B, check the notification’s nil central-tax-payable condition; zero cash after ITC is not enough.</small></label>
      <label className="tax-field">Preceding financial year’s all-India turnover<select value={turnover} onChange={e=>{clear();setTurnover(e.target.value as Input['turnover']);}}><option value="">Choose a turnover band</option><option value="up-to-1.5cr">Up to ₹1.5 crore</option><option value="1.5-to-5cr">Above ₹1.5 crore, up to ₹5 crore</option><option value="above-5cr">Above ₹5 crore</option></select><small>This starts as the default for all rows. If the turnover band changed between years, correct those rows before using the total. Turnover also affects some 2020 due dates, even for nil returns.</small></label>
    </fieldset>
    <details className="tax-note gst-range-cap-guide"><summary>What is the maximum late fee?</summary><p>Each GSTR-1 and each GSTR-3B has its own cap for each month or quarter. There is no single ₹500 or ₹10,000 cap for the entire missed history. The calculator applies the cap to every return before adding the total.</p><div className="tax-table-wrap"><table className="tax-table"><caption>Normal combined CGST + SGST/UTGST late fee: June 2021 onward / quarter ending June 2021 onward.</caption><thead><tr><th>Return category</th><th>Daily fee</th><th>Maximum per return</th></tr></thead><tbody><tr><td>Applicable nil category</td><td>₹20</td><td>₹500</td></tr><tr><td>Other; preceding FY turnover up to ₹1.5 crore</td><td>₹50</td><td>₹2,000</td></tr><tr><td>Other; turnover above ₹1.5 crore up to ₹5 crore</td><td>₹50</td><td>₹5,000</td></tr><tr><td>Other; turnover above ₹5 crore</td><td>₹50</td><td>₹10,000</td></tr></tbody></table></div><p>Earlier periods use the applicable historical rules, with the normal ₹10,000 combined ceiling where supported. Conditional waivers or amnesty can change the amount. Tax, payment interest and penalties are separate.</p></details>
    <button type="button" className="tax-button" onClick={run}>Calculate GSTR-1 + GSTR-3B total →</button>
    {error&&<p className="tax-error" role="alert">{error}</p>}
    {result&&<section ref={output} tabIndex={-1} className="gst-range-results" aria-label="GST late fee totals">
      <h2>Your missed-return late fee, together.</h2><p className="tax-note">Normal-rule estimate as of {filing}. Due dates are calculated automatically; inspect extensions, waivers and portal restrictions before payment. Tax and interest are separate.</p>
      {!error && <div className="gst-history-metrics"><div><span>GSTR-3B late fee</span><strong>{money(result.totals.gstr3b)}</strong><small>CGST {money(result.totals.gstr3b/2)} + SGST/UTGST {money(result.totals.gstr3b/2)}</small></div><div><span>GSTR-1 late fee</span><strong>{money(result.totals.gstr1)}</strong><small>CGST {money(result.totals.gstr1/2)} + SGST/UTGST {money(result.totals.gstr1/2)}</small></div><div className="gst-range-total"><span>Combined late fee</span><strong>{money(result.totals.combined)}</strong><small>CGST {money(result.totals.cgst)} + SGST/UTGST {money(result.totals.sgst)}</small></div></div>}
      {error && <p className="tax-error">Totals are hidden until the return correction below is valid. CSV download is paused.</p>}
      {result.unpricedCount>0 && <p className="tax-error"><strong>Incomplete estimate:</strong> {result.unpricedCount} return(s) could not be priced and are not included in this sum.</p>}
      {result.reviewCount>0&&<p className="tax-error">{result.reviewCount} return row(s) need review. The table explains which values are estimates or unavailable. Unavailable fees are excluded from the displayed total.</p>}
      <button type="button" className="tax-button tax-secondary" onClick={download} disabled={Boolean(error)}>Download fee breakdown (CSV)</button>
      <div className="tax-table-wrap"><table className="tax-table"><caption>Every selected return, ordinary due date and separate tax-head late fee.</caption><thead><tr><th>Return / tax period</th><th>Due date</th><th>Days late</th><th>Daily fee / cap</th><th>CGST</th><th>SGST/UTGST</th><th>Total fee</th><th>Details / correction</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.id}><td><strong>{row.form}</strong><small>{row.label}</small>{row.excluded?<small>Excluded by you</small>:row.status==='not-due'&&<small>Not due on {filing}</small>}</td><td>{row.dueDate||'Needs review'}</td><td>{error?'—':row.daysLate??'Review'}</td><td>{money(row.daily)} / day<small>Cap {row.cap===null?'Review':money(row.cap)}</small>{!error && row.fee!==null && row.fee>0 && row.fee===row.cap && <small>Maximum reached</small>}</td><td>{error?'—':row.cgst===null?'Review':money(row.cgst)}</td><td>{error?'—':row.sgst===null?'Review':money(row.sgst)}</td><td>{error?'—':row.fee===null?'Review':money(row.fee)}</td><td><details><summary>View / change</summary>{!error && row.daysLate!==null && row.cap!==null && !row.excluded && <p className="tax-note"><strong>Fee formula:</strong> lower of {row.daysLate} days × {money(row.daily)} = {money(row.daysLate*row.daily)}, or the {money(row.cap)} cap. {row.fee===null?"A reliable amount still needs review.":`Applied fee: ${money(row.fee)}.`}</p>}{row.notes.map(note=><p className="tax-note" key={note}>{note}</p>)}<label className="tax-field">Actual extended/notified due date<input type="date" value={overrides[row.id]?.dueDate??row.dueDate} onChange={e=>updateRow(row.id,{dueDate:e.target.value})}/></label><label className="tax-field">Fee category<select value={overrides[row.id]?.nilCategory??nil} onChange={e=>updateRow(row.id,{nilCategory:e.target.value as 'nil'|'other'})}><option value="nil">Nil category</option><option value="other">Other than nil</option></select></label><label className="tax-field">Preceding FY {row.previousFy} turnover band<select value={overrides[row.id]?.turnover??turnover} onChange={e=>updateRow(row.id,{turnover:e.target.value as Input['turnover']})}><option value="up-to-1.5cr">Up to ₹1.5 crore</option><option value="1.5-to-5cr">₹1.5 crore–₹5 crore</option><option value="above-5cr">Above ₹5 crore</option></select></label><label className="tax-field"><span><input type="checkbox" checked={overrides[row.id]?.excluded??false} onChange={e=>updateRow(row.id,{excluded:e.target.checked})}/> Already filed / exclude this return</span></label></details></td></tr>)}</tbody></table></div>
      <details className="tax-note"><summary>Assumptions, period changes and older return restrictions</summary><ul>{result.notes.map(note=><li key={note}>{note}</li>)}</ul></details>
    </section>}
  </div>;
}
