import { useEffect, useRef } from 'react';
import { ApplicationProgress } from './application-form-ui';
import type { ApplicationLayoutProps } from './application-layout';
import './website/application-form.css';

export function ApplicationLayout({ children, title, step, documentStep, reviewStep, hasDocuments, optionalDocuments, saved, footer, onBack }: ApplicationLayoutProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const previous = useRef(`${step}:${saved}`);
  useEffect(() => {
    const current = `${step}:${saved}`;
    if (previous.current === current) return;
    previous.current = current;
    const heading = scroll.current?.querySelector<HTMLElement>('.rb-intake-body [role="heading"]');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    scroll.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [step, saved]);
  return <div className="rb-intake" ref={scroll}>
    <div className="rb-intake-container">
      <header className="rb-intake-heading"><div><span className="rb-intake-eyebrow">YOUR APPLICATION</span><h1>{title}</h1><p>A few details now. Expert support at every step.</p></div><button type="button" onClick={onBack} className="rb-intake-close" aria-label="Go back">← <span>Back</span></button></header>
      {!saved && <ApplicationProgress step={step} documentStep={documentStep} reviewStep={reviewStep} hasDocuments={hasDocuments} optionalDocuments={optionalDocuments}/>}
      <div className="rb-intake-grid"><div className="rb-intake-panel"><div className={`rb-intake-body ${step === documentStep ? 'is-documents' : ''}`}>{children}</div><footer className="rb-intake-footer">{footer}</footer></div>
        <aside className="rb-intake-aside"><span className="rb-intake-aside-icon" aria-hidden="true">✓</span><h2>Let’s get it right.</h2><p>Use the details on your business records. You can review every answer before sending.</p><ol><li><b>Your business details</b><span>Tell us about your business.</span></li><li><b>Review with confidence</b><span>Check your answers and supporting records.</span></li><li><b>Clear next steps</b><span>Submit to RegisterBox, then review the fee and payment.</span></li></ol><div className="rb-intake-aside-note">Your progress is saved when you continue. Government submission follows the team’s review and your authorisation.</div></aside>
      </div>
    </div>
  </div>;
}
