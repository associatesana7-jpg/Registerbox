import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addPaymentOperationNote,
  exportPaymentOperations,
  loadPaymentOperation,
  loadPaymentOperations,
  reconcilePaymentOperation,
  updatePaymentOperationCase,
  type ControlCenterStaff,
} from '@/lib/control-center-api';
import {
  paymentCsv,
  type PaymentFollowUpStatus,
  type PaymentOperationsDetail,
  type PaymentOperationsFilters,
  type PaymentOperationsList,
  type PaymentOperationsRow,
} from '@/lib/payment-operations-types';

import './admin-payments.css';

const statuses = [
  ['all', 'All activity'], ['paid', 'Received'], ['pending', 'Awaiting payment'],
  ['inactive', 'Stopped / inactive'], ['failed', 'Failed'], ['attention', 'Needs attention'], ['refunded', 'Refunded'],
] as const;

function money(paise: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100);
}

function label(value: string | null | undefined) {
  return (value || 'Not recorded').replaceAll('_', ' ').replace(/\b\w/g, part => part.toUpperCase());
}

function date(value: string | null | undefined, short = false) {
  if (!value) return 'Not recorded';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', ...(short ? {} : { year: 'numeric' }), hour: '2-digit', minute: '2-digit' }).format(time);
}

function errorText(cause: unknown) { return cause instanceof Error ? cause.message : 'The request could not be completed. Please retry.'; }

function Badge({ status, children }: { status: string; children?: React.ReactNode }) {
  const tone = ['paid', 'captured', 'processed', 'payment_confirmed'].includes(status) ? 'green' : ['failed', 'error', 'client_reported_failure'].includes(status) ? 'red' : ['authorized', 'attention', 'pending', 'checkout_dismissed'].includes(status) ? 'amber' : 'neutral';
  return <span className={`pay-badge pay-badge-${tone}`}>{children || label(status)}</span>;
}

function RecordLabels({ row }: { row: PaymentOperationsRow }) {
  return <><Badge status={row.status}>{row.status === 'paid' ? 'Payment received' : row.status === 'viewed' ? 'Page viewed · no order' : label(row.status)}</Badge>{row.refundedPaise ? <Badge status="processed">Refunded {money(row.refundedPaise, row.currency)}</Badge> : null}{row.mode !== 'live' && <span className={`pay-mode ${row.mode === 'test' ? 'pay-mode-test' : ''}`}>{row.mode === 'test' ? 'TEST' : 'MODE UNKNOWN'}</span>}</>;
}

function Loading({ text }: { text: string }) { return <div role="status" className="pay-loading"><span className="pay-spinner" />{text}</div>; }

function Info({ title, value }: { title: string; value: React.ReactNode }) { return <div className="pay-info"><dt>{title}</dt><dd>{value || 'Not recorded'}</dd></div>; }

export function AdminPayments({ staff, query, refreshKey, onOpenBusiness }: { staff: ControlCenterStaff; query: string; refreshKey: number; onOpenBusiness: (id: string) => void }) {
  const can = (permission: string) => staff.permissions.includes(permission);
  const canRead = can('payment.read');
  const canManage = can('payment.manage');
  const canReconcile = can('payment.reconcile');
  const canExport = can('payment.export');
  const [filters, setFilters] = useState<PaymentOperationsFilters>({ page: 0, pageSize: 25, query: '', status: 'all', mode: 'all', dateFrom: '', dateTo: '' });
  const [search, setSearch] = useState(query);
  const [data, setData] = useState<PaymentOperationsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<PaymentOperationsDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [reconcileReason, setReconcileReason] = useState('');
  const [exportReason, setExportReason] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [live, setLive] = useState(true);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const lifecycle = useRef({ mounted: true });
  const selectedRef = useRef(selected);
  const detailElement = useRef<HTMLElement>(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { const timer = setTimeout(() => setSearch(query), 0); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    const timer = setTimeout(() => setFilters(previous => previous.query === search.trim() ? previous : { ...previous, query: search.trim(), page: 0 }), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadList = useCallback(async (quiet = false) => {
    if (!canRead) { setLoading(false); return; }
    const request = ++listRequest.current;
    if (!quiet) setLoading(true);
    setError('');
    try { const result = await loadPaymentOperations(filters); if (lifecycle.current.mounted && request === listRequest.current) setData(result); }
    catch (cause) { if (lifecycle.current.mounted && request === listRequest.current) setError(errorText(cause)); }
    finally { if (lifecycle.current.mounted && request === listRequest.current) setLoading(false); }
  }, [canRead, filters]);

  const loadDetail = useCallback(async (id: string, quiet = false) => {
    const request = ++detailRequest.current;
    if (!quiet) { setDetail(null); setDetailLoading(true); }
    setDetailError('');
    try { const result = await loadPaymentOperation(id); if (lifecycle.current.mounted && request === detailRequest.current && selectedRef.current === id) setDetail(result); }
    catch (cause) { if (lifecycle.current.mounted && request === detailRequest.current && selectedRef.current === id) setDetailError(errorText(cause)); }
    finally { if (lifecycle.current.mounted && request === detailRequest.current) setDetailLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { void loadList(); }, 0); return () => clearTimeout(timer); }, [loadList, refreshKey]);
  useEffect(() => {
    if (!live || !canRead) return;
    const timer = setInterval(() => { if (document.hidden) return; void loadList(true); if (selectedRef.current) void loadDetail(selectedRef.current, true); }, 30000);
    return () => clearInterval(timer);
  }, [canRead, live, loadList, loadDetail]);
  useEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    return () => { state.mounted = false; };
  }, []);
  useEffect(() => {
    if (selected) detailElement.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }, [selected]);

  function changeFilter(key: keyof PaymentOperationsFilters, value: string) { setFilters(previous => ({ ...previous, [key]: value, page: 0 })); }
  function openRow(row: PaymentOperationsRow) { selectedRef.current = row.id; setSelected(row.id); setMessage(''); setNote(''); setReconcileReason(''); void loadDetail(row.id); }
  function closeDetail() { detailRequest.current++; selectedRef.current = ''; setSelected(''); setDetail(null); setDetailError(''); setMessage(''); }
  async function perform(task: () => Promise<void>) {
    setBusy(true); setMessage(''); setDetailError('');
    try { await task(); } catch (cause) { setDetailError(errorText(cause)); } finally { setBusy(false); }
  }
  async function refreshSelected() { await Promise.all([loadList(true), selected ? loadDetail(selected, true) : Promise.resolve()]); }
  async function exportCsv() {
    setBusy(true); setError(''); setMessage('');
    try {
      const exported = await exportPaymentOperations(filters, exportReason.trim());
      const blob = new Blob([paymentCsv(exported.rows)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `registerbox-payments-${filters.mode}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
      setMessage(`Exported ${exported.rows.length} records.${exported.hasMore ? ` This export is limited to ${exported.limit || exported.rows.length} records. Narrow the date range to export the remaining results.` : ''}`);
      setExportOpen(false); setExportReason('');
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }

  if (!canRead) return <section className="pay-ops"><div className="pay-empty"><span className="pay-empty-icon">⌾</span><h1>Payment access required</h1><p>Your staff role does not include payment records. Ask an administrator for the appropriate finance permissions.</p></div></section>;
  const summary = data?.summary;
  const order = detail?.order;
  const kpis = [
    { title: 'Received · live', value: summary ? money(summary.receivedPaise) : '—', detail: `${summary?.paidCount ?? '—'} verified records in selection`, status: 'paid', tone: 'green' },
    { title: 'Refunded', value: summary ? money(summary.refundedPaise) : '—', detail: 'Provider-confirmed refunds', status: 'refunded', tone: 'neutral' },
    { title: 'Awaiting payment', value: summary?.pendingCount ?? '—', detail: 'No captured payment yet', status: 'pending', tone: 'blue' },
    { title: 'Stopped / inactive', value: summary?.inactiveCount ?? '—', detail: 'A follow-up opportunity', status: 'inactive', tone: 'amber' },
    { title: 'Failed', value: summary?.failedCount ?? '—', detail: 'Review attempts and reason', status: 'failed', tone: 'red' },
    { title: 'Needs attention', value: summary?.attentionCount ?? '—', detail: 'Exceptions to investigate', status: 'attention', tone: 'amber' },
  ];
  return <main className="pay-ops" aria-label="Payment operations">
    <header className="pay-heading"><div><p className="pay-eyebrow">PAYMENT OPERATIONS</p><h1>Payments & recovery</h1><p>Every customer, application and payment — connected.</p></div><div className="pay-actions"><label className="pay-live"><input type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} /><span className={live ? 'pay-live-dot' : 'pay-paused-dot'} />{live ? 'Refresh every 30s' : 'Auto-refresh paused'}</label><button disabled={loading || busy} onClick={() => { void loadList(); if (selected) void loadDetail(selected, true); }}>↻ Refresh</button>{canExport && <button disabled={busy} onClick={() => setExportOpen(value => !value)}>Export CSV ↓</button>}</div></header>
    <div className="pay-context"><span className="pay-context-icon">✓</span><p><strong>Received means verified.</strong> Browser activity shows where someone stopped. Only server and Razorpay checks confirm money received. Times are in IST.</p></div>
    {error && <div className="pay-alert pay-alert-error" role="alert">{error}<button onClick={() => void loadList()}>Retry</button></div>}
    {message && <div className="pay-alert pay-alert-success" role="status">{message}<button aria-label="Dismiss message" onClick={() => setMessage('')}>×</button></div>}
    {exportOpen && <form className="pay-export" onSubmit={event => { event.preventDefault(); void exportCsv(); }}><div><h2>Export filtered payment records</h2><p>The export includes customer contact details. Access is recorded in the audit log.</p></div><label>Business reason<input autoFocus value={exportReason} onChange={event => setExportReason(event.target.value)} placeholder="e.g. October payment reconciliation" minLength={12} maxLength={240} required /></label><button className="pay-primary" type="submit" disabled={busy || exportReason.trim().length < 12}>Download CSV</button><button type="button" onClick={() => setExportOpen(false)}>Cancel</button></form>}
    <section className="pay-kpis" aria-label="Payment totals for the current filters">{kpis.map(kpi => <button key={kpi.title} onClick={() => changeFilter('status', kpi.status)} className={`pay-kpi pay-kpi-${kpi.tone} ${filters.status === kpi.status ? 'pay-kpi-selected' : ''}`} aria-pressed={filters.status === kpi.status}><span>{kpi.title}</span><strong>{kpi.value}</strong><small>{kpi.detail}</small></button>)}</section>
    <section className="pay-health" aria-label="Payment integration health"><div><span className={`pay-health-dot ${data?.health.webhookConfigured ? '' : 'pay-health-warning'}`} /><strong>{data?.health.webhookConfigured ? 'Signing secret configured' : 'Webhook setup needs attention'}</strong><small>{data?.health.lastWebhookAt ? `Last received ${date(data.health.lastWebhookAt, true)}` : 'No verified webhook received yet'}</small></div><div><strong>{data?.health.reconciliationRequired ?? '—'}</strong><span>to reconcile</span></div><div><strong>{data?.health.unmatchedEvents ?? '—'}</strong><span>unmatched events</span></div><div><strong>{data?.health.webhookFailures ?? '—'}</strong><span>webhook errors</span></div></section>
    <section className="pay-register" aria-label="Payment activity register">
      <div className="pay-filter-top"><label className="pay-search"><span>⌕</span><input aria-label="Search all payment records" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customer, email, business, application or payment ID" /></label><label className="pay-field">Environment<select value={filters.mode} onChange={event => changeFilter('mode', event.target.value)}><option value="live">Live payments</option><option value="test">Test payments</option><option value="all">All environments</option><option value="unknown">Historical · mode unknown</option></select></label><label className="pay-field">From<input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={event => changeFilter('dateFrom', event.target.value)} /></label><label className="pay-field">To<input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={event => changeFilter('dateTo', event.target.value)} /></label></div>
      <div className="pay-tabs" aria-label="Payment status filters">{statuses.map(([value, title]) => <button key={value} className={filters.status === value ? 'pay-tab-active' : ''} aria-pressed={filters.status === value} onClick={() => changeFilter('status', value)}>{title}</button>)}</div>
      <div className="pay-register-heading"><div><h2>{statuses.find(([value]) => value === filters.status)?.[1] || 'Payment activity'} <span>{data?.total ?? '—'}</span></h2><p>Search and filters apply across all saved records.</p></div><small>{data?.generatedAt ? `Updated ${date(data.generatedAt, true)}` : 'Loading protected records'}</small></div>
      {filters.mode === 'test' && <div className="pay-test-banner">Test mode · these payments do not represent real customer funds.</div>}
      {loading ? <Loading text="Loading payment records…" /> : !data?.rows.length ? <div className="pay-empty"><span className="pay-empty-icon">₹</span><h3>{error ? 'Payment records could not be loaded' : 'No matching payment activity'}</h3><p>{error ? 'Retry to load verified records.' : 'Checkout visits, orders and verified payments will appear here. Try changing your search or filters.'}</p>{!error && <button onClick={() => { setSearch(''); setFilters(previous => ({ ...previous, status: 'all', mode: 'all', dateFrom: '', dateTo: '', query: '', page: 0 })); }}>Clear filters</button>}</div> : <div className="pay-table-wrap"><table className="pay-table"><thead><tr><th>Customer / business</th><th>Application / service</th><th>Amount / status</th><th>Last activity</th><th>Follow-up</th><th><span className="pay-sr-only">Open details</span></th></tr></thead><tbody>{data.rows.map(row => <tr key={row.id} className={selected === row.id ? 'pay-row-selected' : ''}><td><strong>{row.customerName || 'Customer'}</strong><span>{row.businessName || 'Business not linked'}</span><small>{row.customerEmail || row.customerPhone || 'No contact recorded'}</small></td><td><strong>{row.applicationReference || (row.applicationId ? `Application ${row.applicationId.slice(0, 8)}` : 'Direct checkout')}</strong><span>{row.packageTitle}</span><small>{row.razorpayOrderId || 'No Razorpay order created'}</small></td><td><strong className="pay-money">{money(row.amountPaise, row.currency)}</strong><div className="pay-badges"><RecordLabels row={row} /></div></td><td><span>{label(row.journeyStatus)}</span><small>{date(row.lastActivityAt || row.createdAt, true)}</small>{row.attentionReasons.length > 0 && <span className="pay-attention">! {row.attentionReasons.length} {row.attentionReasons.length === 1 ? 'item' : 'items'} to review</span>}</td><td><Badge status={row.followUpStatus === 'resolved' ? 'paid' : 'neutral'}>{label(row.followUpStatus)}</Badge></td><td><button className="pay-open" onClick={() => openRow(row)} aria-label={`Open payment details for ${row.customerName || row.packageTitle}`}>View <span aria-hidden="true">↗</span></button></td></tr>)}</tbody></table></div>}
      <footer className="pay-pagination"><span>{data?.total ? `${filters.page * filters.pageSize + 1}–${Math.min((filters.page + 1) * filters.pageSize, data.total)} of ${data.total}` : '0 records'}<small> · {filters.pageSize} per page</small></span><div><button disabled={loading || filters.page === 0} onClick={() => setFilters(previous => ({ ...previous, page: Math.max(0, previous.page - 1) }))}>← Previous</button><span>Page {filters.page + 1}</span><button disabled={loading || !data?.hasMore} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Next →</button></div></footer>
    </section>
    <p className="pay-footnote">Inactivity is a signal for review, not proof of abandonment. A customer may complete payment after closing the browser. Reconcile before following up. Refunded amounts are shown separately from gross receipts; this screen does not report bank settlements.</p>
    {selected && <section ref={detailElement} className="pay-detail" aria-label="Selected payment details"><header className="pay-detail-heading"><div><p className="pay-eyebrow">PAYMENT FILE</p><h2>{order?.customerName || 'Payment details'}</h2><p>{order?.packageTitle || 'Loading the complete customer journey'}</p></div><button className="pay-close" onClick={closeDetail} aria-label="Close payment details">×</button></header>
      {detailError && <div className="pay-alert pay-alert-error" role="alert">{detailError}<button disabled={busy} onClick={() => void loadDetail(selected, true)}>Retry</button></div>}
      {detailLoading ? <Loading text="Loading the payment file…" /> : order && <><div className="pay-detail-summary"><div><span>Total payable</span><strong>{money(order.amountPaise, order.currency)}</strong><div className="pay-badges"><RecordLabels row={order} /></div></div><div><span>Created {date(order.createdAt)}</span><span>{order.paidAt ? `Received ${date(order.paidAt)}` : 'Payment has not been confirmed as received'}</span><span>Last activity {date(order.lastActivityAt)}</span></div></div>
      {order.attentionReasons.length > 0 && <aside className="pay-attention-box"><h3>Needs attention</h3><ul>{order.attentionReasons.map(reason => <li key={reason}>{label(reason)}</li>)}</ul></aside>}
      {detail.historyNotice && <p className="pay-small">{detail.historyNotice}</p>}{!!detail.alerts?.length && <aside className="pay-attention-box"><h3>Payment alerts</h3><ul>{detail.alerts.map(alert => <li key={alert.id}><strong>{alert.title}</strong> · {date(alert.created_at)}</li>)}</ul></aside>}<div className="pay-detail-grid"><div className="pay-detail-main"><section className="pay-detail-card"><div className="pay-section-heading"><h3>Customer & application</h3>{order.businessId && <button onClick={() => onOpenBusiness(order.businessId!)}>Open business file ↗</button>}</div><dl className="pay-info-grid"><Info title="Customer" value={order.customerName} /><Info title="Business" value={order.businessName} /><Info title="Email" value={order.customerEmail} /><Info title="Phone" value={order.customerPhone} /><Info title="Application reference" value={order.applicationReference || order.applicationId || 'Direct checkout · no application linked'} /><Info title="Package" value={order.packageTitle} /><Info title="Razorpay order" value={<code>{order.razorpayOrderId || 'No order created'}</code>} /><Info title="Razorpay payment" value={<code>{order.razorpayPaymentId || 'Not recorded'}</code>} /><Info title="Dispute" value={label(order.disputeStatus || 'none recorded')} /><Info title="Bank settlement" value={label(order.settlementStatus || 'unknown')} /><Info title="Last reconciliation" value={date(order.reconciledAt)} /><Info title="Customer ID" value={<code>{order.userId}</code>} /><Info title="Checkout record" value={<code>{order.id}</code>} /></dl></section>
      <section className="pay-detail-card"><div className="pay-section-heading"><h3>Activity timeline</h3><span className="pay-count">{detail.timeline.length}</span></div><p className="pay-small">Browser events explain the journey; provider and server events establish payment status.</p>{!detail.timeline.length ? <p className="pay-small">No events recorded yet.</p> : <ol className="pay-timeline">{detail.timeline.map(event => <li key={event.id} className={`pay-event-${event.source}`}><div className="pay-event-head"><strong>{event.title || label(event.type)}</strong><time dateTime={event.createdAt}>{date(event.createdAt)}</time></div><div className="pay-event-source"><span>{event.source === 'browser' ? '◌ Browser reported' : event.source === 'provider' ? '✓ Razorpay verified' : event.source === 'staff' ? 'Staff action' : 'Server observed'}</span>{event.actor && <span>· {event.actor}</span>}</div>{event.detail && <p>{event.detail}</p>}</li>)}</ol>}</section>
      <section className="pay-detail-card"><div className="pay-section-heading"><h3>Payment attempts</h3><span className="pay-count">{detail.attempts.length}</span></div>{!detail.attempts.length ? <p className="pay-small">No provider attempts recorded. Opening checkout alone does not create a payment.</p> : <div className="pay-attempts">{detail.attempts.map(attempt => <article key={attempt.id}><div className="pay-section-heading"><strong>{attempt.method ? label(attempt.method) : 'Razorpay attempt'}</strong><Badge status={attempt.status} /></div><code>{attempt.paymentId || attempt.id}</code><p>{attempt.amountPaise != null ? money(attempt.amountPaise, attempt.currency || order.currency) : 'Amount not recorded'} · {date(attempt.createdAt)}</p>{(attempt.errorCode || attempt.errorDescription) && <div className="pay-attempt-error">{attempt.errorDescription || label(attempt.errorCode)}</div>}</article>)}</div>}</section>
      <section className="pay-detail-card"><div className="pay-section-heading"><h3>Refund history</h3><span className="pay-count">{detail.refunds.length}</span></div>{!detail.refunds.length ? <p className="pay-small">No refunds recorded. Refunds are managed in Razorpay and synced here.</p> : detail.refunds.map(refund => <article className="pay-refund" key={refund.id}><div><strong>{money(refund.amountPaise, refund.currency || order.currency)}</strong><code>{refund.id}</code><small>{date(refund.createdAt)}</small></div><Badge status={refund.status} /></article>)}</section></div>
      <aside className="pay-detail-side"><section className="pay-detail-card"><h3>Recovery follow-up</h3><p className="pay-small">Record your team&apos;s progress. This does not send a message or change payment status.</p><label className="pay-field">Follow-up status<select disabled={!canManage || busy} value={order.followUpStatus} onChange={event => { const status = event.target.value as PaymentFollowUpStatus; void perform(async () => { await updatePaymentOperationCase(selected, status); await refreshSelected(); setMessage('Follow-up status updated.'); }); }}><option value="open">Open · needs review</option><option value="contacted">Contacted</option><option value="resolved">Resolved</option></select></label>{!canManage && <p className="pay-small">Your role has read-only access.</p>}</section>
      <section className="pay-detail-card"><h3>Check with Razorpay</h3><p className="pay-small">Fetch the latest order, payment and refund status. This check is audited. It cannot debit, capture or refund funds.</p>{canReconcile && order.orderId ? <form onSubmit={event => { event.preventDefault(); void perform(async () => { const result = await reconcilePaymentOperation(selected, reconcileReason.trim()); setReconcileReason(''); await refreshSelected(); setMessage(result.message || 'Razorpay status checked and the payment file refreshed.'); }); }}><label className="pay-field">Reason for checking<textarea value={reconcileReason} onChange={event => setReconcileReason(event.target.value)} placeholder="e.g. Customer reports a successful UPI payment" minLength={12} maxLength={240} required disabled={busy} /></label><button className="pay-primary" type="submit" disabled={busy || reconcileReason.trim().length < 12}>{busy ? 'Checking…' : 'Reconcile with Razorpay'}</button></form> : <p className="pay-small">{order.orderId ? 'Your role cannot reconcile provider records.' : 'A Razorpay order has not been created for this visit.'}</p>}</section>
      <section className="pay-detail-card"><h3>Internal notes</h3>{canManage && <form onSubmit={event => { event.preventDefault(); void perform(async () => { await addPaymentOperationNote(selected, note.trim()); setNote(''); await refreshSelected(); setMessage('Internal note added to the payment file.'); }); }}><label className="pay-field">Add context for your team<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} required disabled={busy} placeholder="Follow-up outcome, customer query or investigation notes. Do not enter card details, OTPs or passwords." /></label><button type="submit" disabled={busy || note.trim().length < 3}>Save internal note</button></form>}<div className="pay-notes">{!detail.notes.length ? <p className="pay-small">No internal notes yet.</p> : detail.notes.map(item => <article key={item.id}><p>{item.body}</p><small>{item.authorName || 'Staff'} · {date(item.createdAt)}</small></article>)}</div></section></aside></div></>}
    </section>}
  </main>;
}
