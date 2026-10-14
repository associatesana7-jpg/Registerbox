import { Link, type Href } from 'expo-router';
import { WebBrand } from './brand.web';
import { contact, servicePath } from './content';
import { contentReview, serviceDetails } from './service-details';
import { publicServices } from './service-pages';
import { Seo, siteUrl } from './seo.web';

function DetailList({ items }: { items: string[] }) {
  return <ul className="rb-detail-list">{items.map(item => <li key={item}>{item}</li>)}</ul>;
}

export default function ServicePage({ slug }: { slug: string }) {
  const service = publicServices.find(item => item.slug === slug)!;
  const details = serviceDetails[service.category];
  const path = `/services/${service.slug}`;
  const startHref = { pathname: '/auth', params: { next: servicePath(service.category) } } as const;
  const schemaPrice = ['gst_registration', 'food', 'retail'].includes(service.category) ? details.pricing : undefined;
  const serviceSchema = {
    '@type': 'Service',
    name: service.title,
    description: details.intro,
    url: `${siteUrl}${path}`,
    provider: { '@id': `${siteUrl}/#organization` },
    areaServed: { '@type': 'Country', name: 'India' },
    dateModified: contentReview.isoDate,
    reviewedBy: { '@id': `${siteUrl}/#organization` },
    ...(schemaPrice?.price !== undefined ? { offers: { '@type': 'Offer', name: schemaPrice.label, price: schemaPrice.price, priceCurrency: schemaPrice.currency } } : {}),
  };
  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${siteUrl}/services` },
      { '@type': 'ListItem', position: 3, name: service.title, item: `${siteUrl}${path}` },
    ],
  };
  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: details.question, acceptedAnswer: { '@type': 'Answer', text: details.answer } }],
  };

  return <div className="rb-public-page">
    <Seo
      title={`${service.title} in India: Eligibility, Documents, Fees & Process | RegisterBox`}
      description={`${service.detail} Check eligibility, documents, government fees, realistic timelines, common issues and official sources.`}
      path={path}
      schema={[serviceSchema, breadcrumbSchema, faqSchema]}
    />
    <header className="rb-public-header rb-container"><WebBrand/><Link href="/services">All services →</Link></header>
    <main className="rb-policy rb-service-guide rb-container">
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/services">Services</Link> / {service.title}</nav>
      <div className="rb-eyebrow">{service.group} · INDIA GUIDE</div>
      <h1>{service.title}</h1>
      <p className="rb-service-lede">{details.intro}</p>
      {details.pricing && <aside className="rb-price-card" aria-label="RegisterBox pricing">
        <span>{details.pricing.label}</span><strong>{details.pricing.value}</strong><p>{details.pricing.note}</p>
      </aside>}
      <div className="rb-service-actions rb-service-actions-top">
        <Link className="rb-button" href={startHref}>Prepare with RegisterBox →</Link>
        <Link className="rb-secondary-button" href="/contact">Ask about your case</Link>
      </div>

      <aside className="rb-review-note" aria-label="Content review information">
        <b>Source-reviewed {contentReview.date}</b>
        <span>{contentReview.author} · {contentReview.credentials}</span>
        <p>{contentReview.note}</p>
      </aside>

      <nav className="rb-on-page" aria-label="On this page">
        <b>On this page</b>
        <a href="#eligibility">Eligibility</a><a href="#documents">Documents</a><a href="#fees">Fees</a>
        <a href="#timeline">Timeline</a><a href="#process">Process</a><a href="#issues">Common issues</a>
        <a href="#states">State differences</a><a href="#registerbox-help">How we help</a><a href="#official-sources">Official sources</a>
      </nav>

      <section id="eligibility"><h2>Who is eligible—and what must be checked?</h2><DetailList items={details.eligibility}/></section>
      <section id="documents"><h2>Documents and information to prepare</h2><DetailList items={details.documents}/><p className="rb-inline-help">RegisterBox can turn your facts into a case-specific checklist and keep the working documents together. <Link href={startHref}>Start your workspace</Link>.</p></section>
      <section id="fees"><h2>Government fees versus RegisterBox fees</h2><DetailList items={details.governmentFees}/><p className="rb-inline-help">Want the amounts separated clearly before you proceed? <Link href="/contact">Ask RegisterBox for a written scope and estimate</Link>.</p></section>
      <section id="timeline"><h2>Realistic timeline</h2><DetailList items={details.timeline}/></section>
      <section id="process"><h2>Step-by-step process</h2><ol className="rb-detail-list rb-process-list">{details.process.map(item => <li key={item}>{item}</li>)}</ol></section>
      <section id="issues"><h2>Common delay, resubmission or rejection reasons</h2><DetailList items={details.rejectionReasons}/><p className="rb-inline-help">RegisterBox checks names, addresses, dates and supporting evidence for avoidable inconsistencies before an approved submission. <Link href={startHref}>Prepare your case</Link>.</p></section>
      <section id="states"><h2>State-specific and local differences</h2><DetailList items={details.stateNotes}/></section>

      <section id="registerbox-help" className="rb-help-panel">
        <div className="rb-eyebrow">REGISTERBOX SUPPORT</div>
        <h2>How RegisterBox can help</h2>
        <DetailList items={details.registerBoxHelp}/>
        <div className="rb-service-actions">
          <Link className="rb-button" href={startHref}>Prepare with RegisterBox →</Link>
          <Link className="rb-secondary-button" href="/contact">Discuss scope, fees and next steps</Link>
        </div>
        <small>RegisterBox prepares and coordinates work within the agreed scope. Government approval, filing acceptance and professional certification are never guaranteed.</small>
      </section>

      <section><h2>{details.question}</h2><p>{details.answer}</p></section>
      <section id="official-sources"><h2>Official sources and further reading</h2><ul className="rb-source-list">{details.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} ↗</a><span>{source.note}</span></li>)}</ul><p className="rb-source-note">Rules, fees, forms and portal behaviour can change. Check the linked authority again at the time of filing.</p></section>

      <section><h2>Related RegisterBox services</h2><ul>{publicServices.filter(item => item.category !== service.category && item.group === service.group).map(item => <li key={item.slug}><Link href={`/services/${item.slug}` as Href}>{item.title}</Link></li>)}</ul></section>
      <p>Need help with this service? <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">Chat with RegisterBox on WhatsApp</a>, <Link href="/contact">send an enquiry</Link>, or read our <Link href="/policies">privacy and service information</Link>.</p>
    </main>
  </div>;
}
