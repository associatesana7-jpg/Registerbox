import { Link, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ApplicationPaymentCard } from '@/components/application-payment-card';
import { useBusinessRecords } from '@/hooks/use-business-records';
import { applicationStage } from '@/lib/workspace-journey';
import { contact } from './content';
import './application-progress.css';

type ProgressIconName = 'back' | 'check' | 'document' | 'folder' | 'arrow' | 'help' | 'info' | 'refresh';
const iconPaths: Record<ProgressIconName, ReactNode> = {
  back: <path d="M20 12H4m7-7-7 7 7 7"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  document: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5M9 12h6M9 16h4"/></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm0 4h18"/>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .2c0 1.8-2.5 2.1-2.5 4.3M12 17h.01"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.55-1.6L20 8M4 16l2.35 2.6A7 7 0 0 0 17.9 17"/></>,
};
function ProgressIcon({ name, size = 19 }: { name: ProgressIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{iconPaths[name]}</svg>;
}

const knownStatuses = new Set(['DRAFT', 'READY_FOR_REVIEW', 'NEEDS_CUSTOMER_INFO', 'CLIENT_QUERY', 'QUERY_RAISED', 'DOCUMENTS_REQUIRED', 'PENDING_DOCUMENTS', 'AWAITING_DOCUMENTS', 'GOVERNMENT_QUERY', 'RESPONSE_REQUIRED', 'WAITING_FOR_OTP', 'SUBMITTING', 'READY_TO_FILE', 'SUBMITTED', 'SUBMITTED_TO_GOVERNMENT', 'UNDER_GOVERNMENT_REVIEW', 'UNDER_REVIEW', 'RESPONSE_SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED']);
const governmentReviewStatuses = new Set(['SUBMITTED', 'SUBMITTED_TO_GOVERNMENT', 'UNDER_GOVERNMENT_REVIEW', 'UNDER_REVIEW', 'RESPONSE_SUBMITTED', 'GOVERNMENT_QUERY', 'RESPONSE_REQUIRED']);
const dateLabel = (value?: string | null) => {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ApplicationProgress() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const applicationId = Array.isArray(id) ? id[0] : id;
  const { data, loading, error, refresh } = useBusinessRecords();
  const application = data?.applications.find(row => row.id === applicationId);
  const status = application?.status || '';
  const stage = applicationStage(status);
  const approved = status === 'APPROVED';
  const closed = status === 'REJECTED' || status === 'CANCELLED';
  const unknown = !knownStatuses.has(status);
  const isDraft = status === 'DRAFT';
  const current = unknown || closed ? null : isDraft ? 0 : governmentReviewStatuses.has(status) ? 2 : stage.index;
  const certificateLinked = Boolean(application?.certificate_document_id);
  const journeyComplete = approved && certificateLinked;
  const serviceName = application?.services?.name || 'Registration application';
  const label = unknown ? 'Status unavailable' : approved ? 'Approved' : isDraft ? 'Draft' : stage.label;
  const tone = unknown || isDraft || status === 'CANCELLED' ? 'gray' : stage.tone;
  const createdDate = dateLabel(application?.created_at);
  const submittedDate = dateLabel(application?.submitted_at);
  const documentsHref = { pathname: '/(tabs)/documents' as const, params: { application: application?.id || '' } };
  const nextTitle = approved ? certificateLinked ? 'Your approval is recorded.' : 'Approved. Your document record is next.' : closed ? status === 'CANCELLED' ? 'This application is closed.' : 'Let’s review the outcome together.' : unknown ? 'Confirm your next step with the team.' : isDraft ? 'Your draft is saved.' : status === 'SUBMITTING' ? 'Your submission outcome is being checked.' : status === 'WAITING_FOR_OTP' ? 'Your authorization is needed.' : tone === 'amber' ? 'A little more information is needed.' : status === 'READY_TO_FILE' ? 'Your case is ready for the filing step.' : 'Your application is with the team.';
  const nextDetail = approved ? certificateLinked ? 'A certificate record is linked to this application. Open your documents to review it.' : 'Approval is recorded, but no certificate document is linked to this case yet. Your team can confirm when it is available.' : unknown ? 'The record does not identify a recognised stage yet. Ask your RegisterBox team to confirm its status before taking another filing step.' : isDraft ? 'Your application is saved. Review its supporting documents or ask your team what is needed before filing.' : stage.next;
  const supportAction = closed || unknown || status === 'WAITING_FOR_OTP' || status === 'SUBMITTING' || (approved && !certificateLinked);
  const actionLabel = supportAction ? status === 'SUBMITTING' ? 'Check with the team' : 'Contact your team' : approved ? 'View documents' : 'Review documents';
  const steps = [
    { title: 'Details', description: isDraft ? 'Your saved application details.' : 'Application record saved in your workspace.' },
    { title: 'Team review', description: current === 1 ? nextDetail : approved || (current !== null && current > 1) ? 'The case has moved beyond initial review.' : 'Our team checks the information for your service.' },
    { title: 'Processing', description: approved ? 'Approval is recorded for this application.' : current === 2 ? status === 'SUBMITTING' ? 'Submission outcome is being verified. Avoid a duplicate.' : status === 'WAITING_FOR_OTP' ? 'Waiting for your authorization.' : status === 'READY_TO_FILE' ? 'Prepared for filing; final approval may still be needed.' : 'Your recorded status is in the processing stage.' : 'Filing and processing follow the required review.' },
    { title: 'Certificate', description: approved ? certificateLinked ? 'Certificate record linked to this application.' : 'Approval recorded; certificate document not linked yet.' : 'Any issued certificate will be linked when available.' },
  ];

  return <div className="rb-progress-page">
    <div className="rb-progress-container">
      <Link href="/compliance" className="rb-progress-back"><ProgressIcon name="back" size={17}/><span>Applications</span></Link>
      {loading ? <div className="rb-progress-loading" role="status" aria-busy="true"><span className="rb-progress-skeleton rb-progress-skeleton-title"/><span className="rb-progress-skeleton rb-progress-skeleton-line"/><div className="rb-progress-skeleton-card"/><span className="rb-progress-visually-hidden">Loading application progress…</span></div> : error ? <section className="rb-progress-state"><span className="rb-progress-state-icon"><ProgressIcon name="info" size={25}/></span><h1>We couldn’t load this application.</h1><p role="alert">{error}</p><button type="button" className="rb-progress-button" onClick={() => void refresh()}><ProgressIcon name="refresh" size={17}/>Try again</button></section> : !application ? <section className="rb-progress-state"><span className="rb-progress-state-icon"><ProgressIcon name="document" size={25}/></span><h1>Application not found.</h1><p>This case is not available under the selected business. Switch to the right business or choose an application from your list.</p><Link href="/compliance" className="rb-progress-button">View applications<ProgressIcon name="arrow" size={17}/></Link></section> : <>
        <header className="rb-progress-heading">
          <div><p className="rb-progress-eyebrow">APPLICATION PROGRESS</p><h1>{serviceName}</h1><p className="rb-progress-reference">Reference <span>{application.application_number || 'Not assigned yet'}</span></p></div>
          <span className={`rb-progress-status rb-progress-status--${tone}`}>{approved && <ProgressIcon name="check" size={14}/>}<span>{label}</span></span>
        </header>

        <div className="rb-progress-layout">
          <div className="rb-progress-primary">
            <section className={`rb-progress-next rb-progress-next--${approved ? 'complete' : tone}`} aria-labelledby="application-next-title">
              <div className="rb-progress-next-body"><p className="rb-progress-eyebrow">{approved ? 'YOUR DOCUMENTS' : 'WHAT HAPPENS NEXT'}</p><h2 id="application-next-title">{nextTitle}</h2><p>{nextDetail}</p></div>
              {supportAction ? <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="rb-progress-button">{actionLabel}<ProgressIcon name="arrow" size={16}/></a> : <Link href={documentsHref} className="rb-progress-button">{actionLabel}<ProgressIcon name="arrow" size={16}/></Link>}
              {!approved && !closed && !unknown && <p className="rb-progress-consent-note">Any required OTP, signature, payment or final filing approval stays with you.</p>}
            </section>

            <section className="rb-progress-card" aria-labelledby="application-journey-title">
              <div className="rb-progress-section-heading"><div><h2 id="application-journey-title">Your application journey</h2><p>{approved ? 'Approval recorded in your application.' : 'A clear view of the stage recorded for your case.'}</p></div><span className="rb-progress-step-count">{journeyComplete ? '4 of 4' : approved ? '3 of 4 complete' : current !== null ? `Step ${current + 1} of 4` : '4 stages'}</span></div>
              <ol className="rb-progress-journey">{steps.map((step, index) => {
                const done = journeyComplete || (current !== null && index < current) || (current === null && index === 0 && Boolean(createdDate));
                const active = !journeyComplete && current === index;
                return <li key={step.title} className={`${done ? 'is-complete' : ''} ${active ? 'is-current' : ''}`} aria-current={active ? 'step' : undefined}>
                  <span className="rb-progress-step-marker" aria-hidden="true">{done ? <ProgressIcon name="check" size={16}/> : index + 1}</span>
                  <div><div className="rb-progress-step-heading"><h3>{step.title}</h3>{active && <span className={`rb-progress-step-tag rb-progress-step-tag--${approved ? 'amber' : tone}`}>{approved ? 'Document not linked' : label}</span>}{done && <span className="rb-progress-visually-hidden">Completed</span>}</div><p>{step.description}</p></div>
                </li>;
              })}</ol>
              {(unknown || closed) && <p className="rb-progress-stage-note"><ProgressIcon name="info" size={16}/>{unknown ? 'Further progress is not confirmed by the current status.' : 'This case is closed. The journey above does not imply later stages were completed.'}</p>}
            </section>



            <div className="rb-progress-payment"><ApplicationPaymentCard key={application.id} applicationId={application.id}/></div>
          </div>

          <aside className="rb-progress-rail" aria-label="Application record and help">
            <section className="rb-progress-card rb-progress-record" aria-labelledby="application-record-title"><h2 id="application-record-title">Application record</h2><dl><div><dt>Reference</dt><dd>{application.application_number || 'Not assigned yet'}</dd></div><div><dt>Created</dt><dd>{createdDate ? <time dateTime={application.created_at}>{createdDate}</time> : 'Date not recorded'}</dd></div><div><dt>Government submission</dt><dd>{submittedDate ? <time dateTime={application.submitted_at || undefined}>{submittedDate}</time> : 'No date recorded'}</dd></div><div><dt>Certificate document</dt><dd className={certificateLinked ? 'rb-progress-record-linked' : ''}>{certificateLinked ? <><ProgressIcon name="check" size={14}/>Record linked</> : 'Not linked yet'}</dd></div></dl>{!submittedDate && <p className="rb-progress-record-note">A saved case or status update does not establish a government-submission date.</p>}</section>
            <Link href={documentsHref} className="rb-progress-documents"><span className="rb-progress-documents-icon"><ProgressIcon name="folder" size={21}/></span><span><strong>Application documents</strong><small>{certificateLinked ? 'Review files and the linked certificate' : 'Upload or review supporting files'}</small></span><ProgressIcon name="arrow" size={17}/></Link>
            <section className="rb-progress-help"><ProgressIcon name="help" size={21}/><div><h2>A question about this case?</h2><p>Your RegisterBox team can help with updates or corrections.</p><a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Talk to the team<span aria-hidden="true">↗</span></a></div></section>
          </aside>
        </div>
      </>}
    </div>
  </div>;
}
