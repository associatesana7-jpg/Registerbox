import { Link, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useApp } from '@/hooks/use-app';
import { WebBrand } from './brand.web';
import { contact, servicePath } from './content';
import { contentReview, serviceDetails } from './service-details';
import { publicServices } from './service-pages';
import { serviceActionLabels, servicePresentation } from './service-presentation';
import { Seo, siteUrl } from './seo.web';
import { BranchDetails, CustomerFeedback } from './local-support.web';

export function ServiceIcon({ name }: { name: 'check' | 'file' | 'arrow' | 'phone' | 'spark' }) {
  const paths = { check: 'm5 12 4 4L19 6', file: 'M14 3H6a1 1 0 0 0-1 1v16h14V8l-5-5Zm0 0v6h5M8 13h8M8 17h5', arrow: 'M5 12h14m-6-6 6 6-6 6', phone: 'M8 3H4v4c0 7.2 5.8 13 13 13h3v-5l-5-1-2 2a12 12 0 0 1-5-5l2-2-2-6Z', spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z' };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

function DetailList({ items }: { items: string[] }) {
  return <ul className="rb-sx-detail-list">{items.map(item => <li key={item}>{item}</li>)}</ul>;
}

function MoreDetail({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <details className="rb-sx-disclosure" id={id}><summary><span>{title}</span><span className="rb-sx-plus" aria-hidden="true">+</span></summary><div className="rb-sx-disclosure-body">{children}</div></details>;
}

const readiness = [
  { label: 'Just starting', description: 'Start with your business activity and location. We’ll help you organise the questions and documents for review.' },
  { label: 'Documents ready', description: 'Tell us what you have. We’ll discuss the checklist, agreed scope and charges before any work begins.' },
  { label: 'Not sure yet', description: 'You don’t need to know every requirement. Tell us your goal and ask the team about your options.' },
];

export default function ServicePage({ slug }: { slug: string }) {
  const { session } = useApp();
  const service = publicServices.find(item => item.slug === slug)!;
  const details = serviceDetails[service.category];
  const ui = servicePresentation[service.category];
  const [stage, setStage] = useState(0);
  const review = service.category === 'trademark' ? { ...contentReview, date: '16 October 2026', isoDate: '2026-10-16' } : contentReview;
  const path = `/services/${service.slug}`;
  const startHref: Href = service.category === 'trademark' ? '/contact' : session ? servicePath(service.category) as Href : { pathname: '/auth', params: { next: servicePath(service.category) } };
  const actionLabel = serviceActionLabels[service.category];
  const quotedService = ['company', 'llp', 'gst_registration', 'food', 'retail', 'trademark'].includes(service.category);
  const price = quotedService ? details.pricing?.value || 'Ask for a quote' : 'Ask for a quote';
  const isQuoted = /quotation|quote/.test(price);
  const whatsapp = `${contact.whatsapp}?text=${encodeURIComponent(`Hi RegisterBox, I need help with ${ui.title} in Bengaluru. ${readiness[stage].label}. My business type and area are: `)}`;
  const serviceSchema = {
    '@type': 'Service', name: service.title, description: details.intro, url: `${siteUrl}${path}`,
    provider: { '@id': `${siteUrl}/#organization` }, areaServed: { '@type': 'City', name: 'Bengaluru' },
    dateModified: review.isoDate,
  };
  const breadcrumbs = { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
    { '@type': 'ListItem', position: 2, name: 'Services', item: `${siteUrl}/services` },
    { '@type': 'ListItem', position: 3, name: service.title, item: `${siteUrl}${path}` },
  ] };
  return <div className={`rb-public-page rb-sx-page rb-sx-${ui.tone}`}>
    <Seo title={`${ui.title} in Bengaluru | RegisterBox`} description={`${ui.title} support in Bengaluru. See what to prepare, how RegisterBox helps and your next step. New Thippasandra and Marathahalli branches.`} path={path} schema={[serviceSchema, breadcrumbs]}/>
    <header className="rb-public-header rb-container"><WebBrand/><Link href="/services">All services <span aria-hidden="true">↗</span></Link></header>
    <main className="rb-container rb-sx-main">
      <nav className="rb-sx-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/services">Services</Link><span>/</span><span>{ui.title}</span></nav>
      <section className="rb-sx-hero" aria-labelledby="service-title">
        <div className="rb-sx-intro">
          <div className="rb-sx-kicker"><span/> BENGALURU · {service.group.toUpperCase()}</div>
          <h1 id="service-title">{ui.title}<span className="rb-sx-title-dot">.</span><span className="rb-sx-sr"> in Bengaluru</span></h1>
          <p className="rb-sx-promise">{ui.promise}</p>
          <p className="rb-sx-audience">{ui.audience}</p>
          <ul className="rb-sx-benefits">{ui.benefits.map(item => <li key={item}><span><ServiceIcon name="check"/></span>{item}</li>)}</ul>
          <a className="rb-sx-doc-link" href="#documents">See what to prepare <span aria-hidden="true">↓</span></a>
        </div>
        <aside className="rb-sx-start-card" aria-label="Your next step">
          <div className="rb-sx-card-visual"><div className="rb-sx-visual-ring"/><img src={`/images/${ui.icon}-v1-136.webp`} width="112" height="112" alt="" fetchPriority="high"/><span className="rb-sx-visual-label"><ServiceIcon name="spark"/> YOUR NEXT CHAPTER</span></div>
          <div className="rb-sx-card-body">
            <div className="rb-sx-price-label">{isQuoted ? 'LET’S UNDERSTAND YOUR REQUIREMENT' : 'REGISTERBOX ASSISTANCE FEE'}</div>
            <div className="rb-sx-price">{isQuoted ? 'A quote for your business.' : price}</div>
            <p>{isQuoted ? 'Start your details online. Scope and fees are confirmed before paid work begins.' : 'Government charges and taxes, where applicable, are separate. Confirm scope before proceeding.'}</p>
            <Link className="rb-button rb-sx-primary" href={startHref}>{actionLabel} <ServiceIcon name="arrow"/></Link>
            <small>{service.category === 'trademark' ? 'Application workflow not yet available online' : 'Secure workspace · Save and continue later'}</small>
            <a className="rb-sx-call" href={whatsapp} target="_blank" rel="noopener noreferrer"><ServiceIcon name="phone"/> Need help first? Chat with us ↗</a>
          </div>
        </aside>
      </section>

      <div className="rb-sx-confidence"><span><ServiceIcon name="check"/> Bengaluru team</span><span><ServiceIcon name="check"/> Clear scope before work</span><span><ServiceIcon name="check"/> No guaranteed approvals</span></div>

      <section className="rb-sx-journey" aria-labelledby="journey-title">
        <div className="rb-sx-section-heading"><div><div className="rb-sx-kicker">THREE SIMPLE STEPS</div><h2 id="journey-title">Your next steps, made simple.</h2></div><p>{service.category === 'trademark' ? 'Share your requirement with our team.' : 'Start in your existing RegisterBox workspace.'}</p></div>
        <ol className="rb-sx-step-grid">{(service.category === 'trademark' ? [
          ['Share your brand', 'Tell us the name or logo and your business activity.'],
          ['Confirm the scope', 'Discuss application support, documents and charges.'],
          ['Prepare & review', 'Check details before any authorised filing.'],
        ] : service.category === 'gst' ? [
          ['Choose your business', 'Sign in and select your business in the GST workspace.'],
          ['Prepare & review', 'Organise records and review the relevant return draft.'],
          ['Track the real status', 'A draft is not filed. Check the actual acknowledgement.'],
        ] : [
          ['Choose your business', 'Sign in, then select or add your business profile.'],
          ['Answer simple questions', 'The existing application gathers your business details.'],
          ['Upload & save your draft', 'Add supporting documents and continue when you’re ready.'],
        ]).map(([title, text], i) => <li key={title}><span className="rb-sx-step-no">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div>{i < 2 && <span className="rb-sx-step-arrow" aria-hidden="true">→</span>}</li>)}</ol>
      </section>

      <section className="rb-sx-documents" id="documents" aria-labelledby="documents-title">
        <div className="rb-sx-section-heading"><div><div className="rb-sx-kicker">A HEAD START, NOT HOMEWORK</div><h2 id="documents-title">Keep these handy.</h2></div><span className="rb-sx-soft-tag">Exact checklist after review</span></div>
        <div className="rb-sx-document-grid">{ui.documents.map((item, i) => <div className="rb-sx-document" key={item}><span className="rb-sx-file-icon"><ServiceIcon name="file"/></span><span><small>0{i + 1}</small><h3>{item}</h3></span></div>)}</div>
        <MoreDetail title="See the full document checklist"><DetailList items={details.documents}/><p>Send private documents only through an agreed secure channel—not a general enquiry.</p></MoreDetail>
      </section>

      <section className="rb-sx-readiness" aria-labelledby="readiness-title">
        <div><div className="rb-sx-kicker">START WHERE YOU ARE</div><h2 id="readiness-title">Where are you right now?</h2><div className="rb-sx-stage-options" role="group" aria-label="Your preparation stage">{readiness.map((item, i) => <button type="button" key={item.label} aria-pressed={stage === i} onClick={() => setStage(i)}>{stage === i && <ServiceIcon name="check"/>}{item.label}</button>)}</div></div>
        <div className="rb-sx-stage-answer" aria-live="polite"><span className="rb-sx-step-no"><ServiceIcon name="spark"/></span><p>{readiness[stage].description}</p><Link href={startHref}>Continue to {service.category === 'trademark' ? 'enquiry' : 'my workspace'} <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className="rb-sx-finer-details" aria-labelledby="details-title">
        <div className="rb-sx-section-heading"><div><div className="rb-sx-kicker">WHEN YOU WANT TO GO DEEPER</div><h2 id="details-title">The details, on your terms.</h2></div><p>Open only what you need.</p></div>
        <MoreDetail title="Is this service right for my business?" id="eligibility"><p>{details.intro}</p><DetailList items={details.eligibility}/></MoreDetail>
        <MoreDetail title="What’s included in RegisterBox support?" id="registerbox-help"><DetailList items={details.registerBoxHelp}/><p>Work is limited to the scope agreed with you. A saved draft is not a filed or approved application.</p></MoreDetail>
        <MoreDetail title="Fees, charges & what’s separate" id="fees">{details.pricing && <p><strong>{details.pricing.label}: {details.pricing.value}.</strong> {details.pricing.note}</p>}<DetailList items={details.governmentFees}/></MoreDetail>
        <MoreDetail title="How long does it take?" id="timeline"><DetailList items={details.timeline}/></MoreDetail>
        <MoreDetail title="Full process & common delays" id="process"><ol className="rb-sx-detail-list">{details.process.map(item => <li key={item}>{item}</li>)}</ol><h3>What can slow things down?</h3><DetailList items={details.rejectionReasons}/></MoreDetail>
        <MoreDetail title="Local requirements & a common question" id="states"><DetailList items={details.stateNotes}/><h3>{details.question}</h3><p>{details.answer}</p></MoreDetail>
        <MoreDetail title="Official sources & content review" id="official-sources"><ul className="rb-source-list">{details.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} ↗</a><span>{source.note}</span></li>)}</ul><p>Source-reviewed {review.date}. {review.author}. {review.note} Requirements can change; check the authority at the time of filing.</p></MoreDetail>
      </section>

      <section className="rb-sx-bottom" aria-labelledby="next-title"><div><div className="rb-sx-kicker">ONE CLEAR NEXT STEP</div><h2 id="next-title">Ready for your next chapter?</h2><p>{service.category === 'trademark' ? 'Send your requirement to our team.' : 'Start online. Save your progress. Pick up where you left off.'}</p></div><div><Link className="rb-button" href={startHref}>{actionLabel} <ServiceIcon name="arrow"/></Link><a href={contact.callback} target="_blank" rel="noopener noreferrer">Need a hand? Request a callback ↗</a></div></section>

      <details className="rb-sx-location-details"><summary>Visit our Bengaluru branches <span aria-hidden="true">+</span></summary><BranchDetails/></details>
      <CustomerFeedback/>
      <section className="rb-sx-related"><h2>Looking for something else?</h2><div>{publicServices.filter(item => item.category !== service.category && item.group === service.group).slice(0, 4).map(item => <Link key={item.slug} href={`/services/${item.slug}` as Href}>{servicePresentation[item.category].title}<ServiceIcon name="arrow"/></Link>)}</div></section>
      <footer className="rb-sx-footer"><WebBrand/><Link href="/policies">Privacy & service information</Link></footer>
    </main>
    <div className="rb-sx-mobile-action"><span><small>{ui.title}</small><b>{isQuoted ? 'Scope & quote first' : price}</b></span><Link className="rb-button" href={startHref}>{actionLabel} ↗</Link></div>
  </div>;
}
