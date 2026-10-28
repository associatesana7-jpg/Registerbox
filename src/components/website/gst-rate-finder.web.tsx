import React, { useMemo, useState } from 'react';
import {
  GST_RATE_COVERAGE,
  GST_RATE_REVIEWED_ON,
  GST_RATE_SOURCES,
  gstRateSplit,
  getGstHeadingLabel,
  searchGstRates,
  type GstRateEntry,
  type GstRateKind,
} from '../../lib/gst-rate-finder';

const QUICK_SEARCHES = ['Rice', '0406', 'Mobile phone', 'Accounting', 'Hotel accommodation', 'Tailoring'];
const RATE_OPTIONS = [0, 0.25, 1.5, 3, 5, 6, 12, 18, 40];

function Entry({ entry }: { entry: GstRateEntry }) {
  const source = GST_RATE_SOURCES[entry.sourceId];
  const split = gstRateSplit(entry.rate);
  const headingLabel = getGstHeadingLabel(entry);
  const description = entry.description.length > 650 ? (
    <details>
      <summary>Read the full description and annexure conditions</summary>
      <p>{entry.description}</p>
    </details>
  ) : <p>{entry.description}</p>;
  const sourceUrl = entry.pdfPage && entry.sourceId === 'goods-taxable-2025' ? `${source.url}#page=${entry.pdfPage}` : source.url;
  return <article className="tax-result">
    <span className="tax-eyebrow">{entry.kind === 'goods' ? 'HSN / goods heading' : 'SAC / service heading'} · {entry.codeText}</span>
    <h3>{entry.rate === 0 ? 'Exempt — only when the entry applies' : `${entry.rate}% total GST — when this entry applies`}</h3>
    {description}
    {/^[Aa]ll goods\b/.test(entry.description) && headingLabel && <p className="tax-note">Tariff heading description (search aid): {headingLabel.toLowerCase()}</p>}
    {entry.description.length > 650 && <p className="tax-note">{entry.description.slice(0, entry.description.indexOf('. Annexure') > 0 ? entry.description.indexOf('. Annexure') : 200)}</p>}
    <dl className="tax-summary">
      <div><dt>Within a State / UT</dt><dd>{split.cgst}% CGST + {split.sgstOrUtgst}% SGST / UTGST</dd></div>
      <div><dt>Inter-State GST rate</dt><dd>{split.igst}% IGST</dd></div>
      <div><dt>{entry.effectiveFrom ? 'Entry effective from' : 'Current snapshot reviewed'}</dt><dd>{new Date(`${entry.effectiveFrom || GST_RATE_REVIEWED_ON}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</dd></div>
      <div><dt>Notification reference</dt><dd>{entry.schedule === 'Service rate' || entry.schedule === 'Exempt service' ? '' : `${entry.schedule === 'Exempt' ? 'Exemption schedule' : `Schedule ${entry.schedule}`} · `}Serial {entry.serial}</dd></div>
    </dl>
    {entry.notes.length > 0 && <ul>{entry.notes.map(note => <li key={note}>{note}</li>)}</ul>}
    <a className="tax-text-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">Read the official source ↗</a>
    <p className="tax-note">{source.title}{entry.pdfPage && entry.sourceId === 'goods-taxable-2025' ? ` · PDF page ${entry.pdfPage}` : ''}. The full description and applicable conditions control the rate.</p>
  </article>;
}

export default function GstRateFinder() {
  const [query, setQuery] = useState('Rice');
  const [kind, setKind] = useState<GstRateKind | 'all'>('all');
  const [rate, setRate] = useState<number | 'all'>('all');
  const [limit, setLimit] = useState(15);
  const result = useMemo(() => searchGstRates({ query, kind, rate, limit }), [query, kind, rate, limit]);
  const changeQuery = (value: string) => { setQuery(value); setLimit(15); };

  return <div>
    <div className="tax-form" role="search" aria-label="Search bundled GST rate schedules">
      <h2>Find the entry. Check its conditions.</h2>
      <label className="tax-field">HSN / SAC code or item / service name
        <input type="search" maxLength={160} value={query} onChange={event => changeQuery(event.target.value)} placeholder="For example: 1006, rice, accounting or tailoring" autoComplete="off" spellCheck={false} aria-describedby="gst-finder-help" />
        <small id="gst-finder-help">Use 2, 4, 6 or 8 digits for goods, or 4 or 6 digits for services. A heading can contain several rates, exemptions and conditions.</small>
      </label>
      <div className="tax-pills" aria-label="Example searches">{QUICK_SEARCHES.map(example => <button type="button" key={example} onClick={() => { changeQuery(example); setKind('all'); setRate('all'); }}>{example}</button>)}</div>
      <div className="tax-fields">
        <label className="tax-field">Look in
          <select value={kind} onChange={event => { setKind(event.target.value as GstRateKind | 'all'); setLimit(15); }}>
            <option value="all">Goods and supported services</option><option value="goods">Goods — HSN</option><option value="services">Supported services — SAC</option>
          </select>
        </label>
        <label className="tax-field">Total GST rate
          <select value={rate} onChange={event => { setRate(event.target.value === 'all' ? 'all' : Number(event.target.value)); setLimit(15); }}>
            <option value="all">All rates, including exemptions</option>{RATE_OPTIONS.map(value => <option key={value} value={value}>{value === 0 ? 'Exempt (conditional)' : `${value}%`}</option>)}
          </select>
        </label>
      </div>
    </div>
    <div className="tax-note">
      <strong>{GST_RATE_COVERAGE.taxableGoods.toLocaleString('en-IN')} taxable goods entries · {GST_RATE_COVERAGE.exemptGoods} goods exemptions · {GST_RATE_COVERAGE.specialGoods} special brick entries · {GST_RATE_COVERAGE.serviceEntries} service entries.</strong>
      <p>Offline schedule snapshot reviewed {GST_RATE_REVIEWED_ON}. Includes the September 2025 schedules, the February 2026 tobacco changes and May 2026 beverage tariff corrections. No search data is sent to a rate API.</p>
    </div>
    {result.error && <p className="tax-error" role="alert">{result.error}</p>}
    <p role="status" aria-live="polite" className="tax-note">{query.trim() && !result.error ? `${result.total} matching ${result.total === 1 ? 'entry' : 'entries'}. ${result.total > result.entries.length ? `Showing ${result.entries.length}.` : ''} Compare every matching description before selecting a rate.` : 'Enter an item or a code to search the bundled schedules.'}</p>
    {!result.error && result.total === 0 && query.trim() && <div className="tax-result">
      <h3>No entry found in this tool’s coverage</h3>
      <p>Try a shorter item name, a broader 4-digit heading, or remove the filters. A missing match does not establish a GST rate, an exemption or an invalid HSN/SAC.</p>
      <a className="tax-text-link" href="https://taxinformation.cbic.gov.in/" target="_blank" rel="noopener noreferrer">Check the full official notifications ↗</a>
    </div>}
    {result.total > 0 && <div className="tax-examples" aria-label="Matching rate entries">{result.entries.map(entry => <Entry key={entry.id} entry={entry} />)}</div>}
    {result.total > result.entries.length && <div className="tax-actions"><button type="button" className="tax-button tax-secondary" onClick={() => setLimit(value => Math.min(200, value + 20))} disabled={limit >= 200}>{limit >= 200 ? 'Narrow the search to see more entries' : 'Show more matching entries'}</button></div>}
    <details className="tax-form">
      <summary>What does this rate finder cover?</summary>
      <p className="tax-note">{GST_RATE_COVERAGE.limitation}</p>
      <p className="tax-note">This snapshot is for the current classification structure from 1 May 2026, reviewed through 28 October 2026. It does not calculate historical supply-date rates. HSN/SAC classification also depends on composition, use, packaging, value, supplier/recipient facts and the tariff interpretation rules. Compensation cess, reverse charge, export/SEZ zero-rating and special valuation are separate checks.</p>
      <p className="tax-note">For the 2025 goods schedules, “pre-packaged and labelled” refers to commodities intended for retail sale in packages of not more than 25 kg or 25 litres that must bear Legal Metrology declarations. Read the exact entry and statutory definition.</p>
      <p className="tax-note">Updates are reviewed and bundled into the website by RegisterBox. The browser does not fetch live tax notifications, so an amendment after the review date requires a data update.</p>
    </details>
  </div>;
}
